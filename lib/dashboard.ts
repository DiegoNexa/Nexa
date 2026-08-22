/**
 * Dados do dashboard: KPIs por período, série de faturamento diário
 * e despesas fixas a vencer.
 *
 * A série do gráfico é sempre o MÊS CORRENTE (faturamento diário),
 * como no design — o seletor de período afeta só os KPIs financeiros.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { carregarRecorrentes, type DespesaRecorrente } from "./financeiro";

export type PeriodoDash = "hoje" | "semana" | "mes";

export const PERIODOS: { key: PeriodoDash; label: string }[] = [
  { key: "hoje",   label: "Hoje"   },
  { key: "semana", label: "Semana" },
  { key: "mes",    label: "Mês"    },
];

export function parsePeriodo(v?: string): PeriodoDash {
  return v === "hoje" || v === "semana" ? v : "mes";
}

/** Janela [inicio, fim) do período, em horário local */
export function intervaloPeriodo(p: PeriodoDash): { inicio: Date; fim: Date; label: string } {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);

  if (p === "hoje") {
    fim.setDate(fim.getDate() + 1);
    return { inicio, fim, label: "hoje" };
  }
  if (p === "semana") {
    inicio.setDate(inicio.getDate() - 6);   // hoje + 6 dias anteriores
    fim.setDate(fim.getDate() + 1);
    return { inicio, fim, label: "últimos 7 dias" };
  }
  inicio.setDate(1);                        // primeiro dia do mês
  fim.setMonth(fim.getMonth() + 1, 1);
  const nome = inicio.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return { inicio, fim, label: nome.charAt(0).toUpperCase() + nome.slice(1) };
}

export type PontoDia  = { dia: number; valor: number };
export type PontoMes  = { label: string; valor: number };

export type DadosGrafico = {
  diaria:      PontoDia[];    // faturamento por dia do mês corrente
  meses:       PontoMes[];    // últimos 6 meses (sparkline do rodapé)
  variacao:    number | null; // % do mês atual vs o primeiro da série
  melhorDia:   PontoDia | null;
  mesLabel:    string;
};

type RawAg = {
  data_hora_inicio: string;
  servicos: { preco: number } | { preco: number }[] | null;
};

const pickOne = <T,>(v: T | T[] | null): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : v;

/**
 * Uma query só para tudo: busca os atendimentos concluídos dos últimos
 * 6 meses e deriva em JS a série diária (mês corrente) e a mensal.
 */
export async function carregarGrafico(supabase: SupabaseClient): Promise<DadosGrafico> {
  const hoje = new Date();
  const inicioSerie = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
  const fimSerie    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);

  const { data } = await supabase
    .from("agendamentos")
    .select("data_hora_inicio, servicos ( preco )")
    .eq("status", "concluido")
    .gte("data_hora_inicio", inicioSerie.toISOString())
    .lt("data_hora_inicio", fimSerie.toISOString());

  // Acumuladores
  const porMes = new Map<string, number>();   // "YYYY-M" → total
  const porDia = new Map<number, number>();   // dia do mês corrente → total

  for (const a of (data ?? []) as RawAg[]) {
    const preco = Number(pickOne(a.servicos)?.preco ?? 0);
    const d = new Date(a.data_hora_inicio);
    const chaveMes = `${d.getFullYear()}-${d.getMonth()}`;
    porMes.set(chaveMes, (porMes.get(chaveMes) ?? 0) + preco);

    if (d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth()) {
      porDia.set(d.getDate(), (porDia.get(d.getDate()) ?? 0) + preco);
    }
  }

  // Série diária: do dia 1 até hoje (dias sem atendimento entram como 0
  // para o gráfico não "pular" datas)
  const diaria: PontoDia[] = [];
  for (let dia = 1; dia <= hoje.getDate(); dia++) {
    diaria.push({ dia, valor: porDia.get(dia) ?? 0 });
  }

  // Série mensal: 6 meses, sempre preenchidos
  const meses: PontoMes[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push({
      label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase(),
      valor: porMes.get(`${d.getFullYear()}-${d.getMonth()}`) ?? 0,
    });
  }

  const primeiro = meses[0]?.valor ?? 0;
  const atual    = meses[meses.length - 1]?.valor ?? 0;
  const variacao = primeiro > 0 ? Math.round(((atual - primeiro) / primeiro) * 100) : null;

  const comValor  = diaria.filter((d) => d.valor > 0);
  const melhorDia = comValor.length
    ? comValor.reduce((a, b) => (b.valor > a.valor ? b : a))
    : null;

  const nomeMes = hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return { diaria, meses, variacao, melhorDia, mesLabel: nomeMes.toUpperCase() };
}

// ─── Despesas fixas a vencer ───────────────────────────────

export type DespesaVencer = {
  id:        string;
  descricao: string;
  valor:     number;
  data:      Date;
  diasAte:   number;
};

/**
 * Próximas ocorrências das despesas fixas, a partir de hoje.
 * Mensal: o dia configurado (deste mês ou do próximo, se já passou).
 * Semanal: o próximo dia da semana correspondente.
 */
export async function carregarDespesasAVencer(
  supabase: SupabaseClient,
  limite = 4,
): Promise<{ lista: DespesaVencer[]; total: number }> {
  const recorrentes = await carregarRecorrentes(supabase);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const lista: DespesaVencer[] = [];

  for (const r of recorrentes) {
    const data = proximaOcorrencia(r, hoje);
    if (!data) continue;
    lista.push({
      id:        r.id,
      descricao: r.descricao,
      valor:     Number(r.valor),
      data,
      diasAte:   Math.round((data.getTime() - hoje.getTime()) / 86_400_000),
    });
  }

  lista.sort((a, b) => a.data.getTime() - b.data.getTime());
  const recortada = lista.slice(0, limite);

  return {
    lista: recortada,
    total: recortada.reduce((s, d) => s + d.valor, 0),
  };
}

function proximaOcorrencia(r: DespesaRecorrente, hoje: Date): Date | null {
  if (r.frequencia === "mensal" && r.dia_mes != null) {
    const dia = Math.min(r.dia_mes, 28);
    const esteMes = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
    return esteMes >= hoje
      ? esteMes
      : new Date(hoje.getFullYear(), hoje.getMonth() + 1, dia);
  }

  if (r.frequencia === "semanal" && r.dia_semana != null) {
    const delta = (r.dia_semana - hoje.getDay() + 7) % 7;
    const d = new Date(hoje);
    d.setDate(d.getDate() + delta);
    return d;
  }

  return null;
}
