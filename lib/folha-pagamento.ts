/**
 * Cálculo da folha de pagamento de um profissional em um período.
 *
 * Lógica central:
 *   - Atendimentos: somar agendamentos concluídos × % de comissão
 *     (override em comissoes_config OU comissao_padrao do profissional)
 *   - Subtrair: vales + adiantamentos + descontos
 *   - Somar: bônus
 *   = Líquido a pagar
 *
 * Esta lib é reutilizada pela página (server component) e pelos
 * dois templates de PDF, garantindo que o cálculo seja consistente.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type AtendimentoFolha = {
  id:                string;
  data_hora_inicio:  string;
  cliente_nome:      string;
  servico_nome:      string;
  servico_preco:     number;
  percentual:        number;   // % aplicado
  comissao_valor:    number;   // preco × % / 100
};

export type Movimento = {
  id:             string;
  tipo:           "vale" | "adiantamento" | "desconto" | "bonus";
  valor:          number;
  descricao:      string | null;
  data_movimento: string;
};

export type FolhaResumo = {
  profissional: {
    id:              string;
    nome:            string;
    cor:             string | null;
    comissao_padrao: number;
  };
  periodo: {
    inicio: string;        // ISO date YYYY-MM-DD
    fim:    string;        // ISO date YYYY-MM-DD
    label:  string;        // "Junho 2026"
  };
  atendimentos:      AtendimentoFolha[];
  movimentos:        Movimento[];
  totais: {
    comissao_bruta:  number;  // soma de atendimentos
    descontos:       number;  // vales + adiantamentos + descontos
    bonus:           number;
    liquido:         number;  // bruta - descontos + bonus
  };
};

/** Calcula o intervalo do mês (ISO) e label PT-BR */
export function mesIntervalo(ano: number, mes: number /* 0-11 */) {
  const inicio = new Date(Date.UTC(ano, mes, 1));
  const fim    = new Date(Date.UTC(ano, mes + 1, 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const labelMes = inicio.toLocaleString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return {
    inicio: fmt(inicio),
    fim:    fmt(fim),
    label:  labelMes.charAt(0).toUpperCase() + labelMes.slice(1),
  };
}

/** Mês atual no formato esperado */
export function mesAtual() {
  const hoje = new Date();
  return mesIntervalo(hoje.getFullYear(), hoje.getMonth());
}

/** Parse de string "YYYY-MM" para mesIntervalo */
export function parseMesParam(param?: string) {
  if (!param || !/^\d{4}-\d{2}$/.test(param)) return mesAtual();
  const [ano, mes] = param.split("-").map(Number);
  if (mes < 1 || mes > 12) return mesAtual();
  return mesIntervalo(ano, mes - 1);
}

/**
 * Carrega e calcula a folha de um profissional em um período.
 * Retorna null se o profissional não existir / RLS bloquear.
 */
export async function carregarFolha(
  supabase: SupabaseClient,
  profissionalId: string,
  periodo: { inicio: string; fim: string; label: string },
): Promise<FolhaResumo | null> {
  // 1. Profissional
  const { data: prof } = await supabase
    .from("profissionais")
    .select("id, nome, cor, comissao_padrao")
    .eq("id", profissionalId)
    .single<{ id: string; nome: string; cor: string | null; comissao_padrao: number }>();

  if (!prof) return null;

  // 2. Agendamentos concluídos no período
  const { data: agendamentos } = await supabase
    .from("agendamentos")
    .select(`
      id,
      data_hora_inicio,
      servico_id,
      clientes ( nome ),
      servicos ( nome, preco )
    `)
    .eq("profissional_id", profissionalId)
    .eq("status", "concluido")
    .gte("data_hora_inicio", periodo.inicio)
    .lt("data_hora_inicio", periodo.fim)
    .order("data_hora_inicio");

  // 3. Overrides de comissão deste profissional
  const { data: overrides } = await supabase
    .from("comissoes_config")
    .select("servico_id, percentual")
    .eq("profissional_id", profissionalId);

  const overridesMap = new Map<string, number>();
  for (const o of overrides ?? []) {
    overridesMap.set(o.servico_id, o.percentual);
  }

  // 4. Compõe lista de atendimentos com cálculo
  type RawAgendamento = {
    id:               string;
    data_hora_inicio: string;
    servico_id:       string;
    clientes:         { nome: string } | { nome: string }[] | null;
    servicos:         { nome: string; preco: number } | { nome: string; preco: number }[] | null;
  };

  const pickOne = <T>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  const atendimentos: AtendimentoFolha[] = (agendamentos ?? []).map((a: RawAgendamento) => {
    const cliente = pickOne(a.clientes);
    const servico = pickOne(a.servicos);
    const preco = Number(servico?.preco ?? 0);
    const percentual = overridesMap.get(a.servico_id) ?? prof.comissao_padrao;
    const comissao_valor = (preco * percentual) / 100;

    return {
      id:               a.id,
      data_hora_inicio: a.data_hora_inicio,
      cliente_nome:     cliente?.nome ?? "Cliente removido",
      servico_nome:     servico?.nome ?? "Serviço removido",
      servico_preco:    preco,
      percentual,
      comissao_valor,
    };
  });

  // 5. Movimentos no período
  const { data: movs } = await supabase
    .from("movimentos_folha")
    .select("id, tipo, valor, descricao, data_movimento")
    .eq("profissional_id", profissionalId)
    .gte("data_movimento", periodo.inicio)
    .lt("data_movimento", periodo.fim)
    .order("data_movimento")
    .returns<Movimento[]>();

  const movimentos = movs ?? [];

  // 6. Totais
  const comissao_bruta = atendimentos.reduce((s, a) => s + a.comissao_valor, 0);

  const descontos = movimentos
    .filter((m) => m.tipo === "vale" || m.tipo === "adiantamento" || m.tipo === "desconto")
    .reduce((s, m) => s + Number(m.valor), 0);

  const bonus = movimentos
    .filter((m) => m.tipo === "bonus")
    .reduce((s, m) => s + Number(m.valor), 0);

  const liquido = comissao_bruta - descontos + bonus;

  return {
    profissional: {
      id:              prof.id,
      nome:            prof.nome,
      cor:             prof.cor,
      comissao_padrao: prof.comissao_padrao,
    },
    periodo,
    atendimentos,
    movimentos,
    totais: {
      comissao_bruta,
      descontos,
      bonus,
      liquido,
    },
  };
}

/** Format helpers */
export const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarDataBR(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatarDataHoraBR(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day:    "2-digit",
    month:  "2-digit",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

export const TIPO_LABEL: Record<Movimento["tipo"], string> = {
  vale:          "Vale",
  adiantamento:  "Adiantamento",
  desconto:      "Desconto",
  bonus:         "Bônus",
};
