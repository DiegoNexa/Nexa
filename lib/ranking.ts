/**
 * Ranking de profissionais por desempenho dos atendimentos concluídos.
 *
 * Usa a MESMA regra de comissão da Folha (override em comissoes_config
 * senão comissao_padrao) pra que os números batam com o módulo Folha.
 *
 * Faz só 3 queries no total (independe do nº de profissionais):
 * profissionais, comissoes_config e agendamentos concluídos. A
 * agregação por período (mês) e acumulado (geral) é feita em JS.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type Metrica = "faturamento" | "atendimentos" | "comissao";

export const METRICAS: { key: Metrica; label: string; icon: string }[] = [
  { key: "faturamento",  label: "Faturamento",  icon: "payments" },
  { key: "atendimentos", label: "Atendimentos", icon: "event_available" },
  { key: "comissao",     label: "Comissão",     icon: "savings" },
];

export function parseMetrica(v?: string): Metrica {
  return v === "atendimentos" || v === "comissao" ? v : "faturamento";
}

export type Totais = {
  atendimentos: number;
  faturamento:  number;
  comissao:     number;
};

export type RankingItem = {
  profissional: { id: string; nome: string; cor: string | null };
  mes:   Totais;
  geral: Totais;
};

const zero = (): Totais => ({ atendimentos: 0, faturamento: 0, comissao: 0 });

export async function carregarRanking(
  supabase: SupabaseClient,
  periodo: { inicio: string; fim: string; label: string },
): Promise<RankingItem[]> {
  const [{ data: profs }, { data: overrides }, { data: ags }] = await Promise.all([
    supabase
      .from("profissionais")
      .select("id, nome, cor, comissao_padrao")
      .returns<{ id: string; nome: string; cor: string | null; comissao_padrao: number }[]>(),
    supabase
      .from("comissoes_config")
      .select("profissional_id, servico_id, percentual")
      .returns<{ profissional_id: string; servico_id: string; percentual: number }[]>(),
    supabase
      .from("agendamentos")
      .select("profissional_id, servico_id, data_hora_inicio, servicos ( preco )")
      .eq("status", "concluido"),
  ]);

  const listaProfs = profs ?? [];
  const padrao = new Map(listaProfs.map((p) => [p.id, Number(p.comissao_padrao)]));
  const overrideMap = new Map<string, number>();
  for (const o of overrides ?? []) {
    overrideMap.set(`${o.profissional_id}:${o.servico_id}`, Number(o.percentual));
  }

  // Acumuladores por profissional
  const mes   = new Map<string, Totais>();
  const geral = new Map<string, Totais>();
  for (const p of listaProfs) {
    mes.set(p.id, zero());
    geral.set(p.id, zero());
  }

  type RawAg = {
    profissional_id: string;
    servico_id:      string;
    data_hora_inicio: string;
    servicos: { preco: number } | { preco: number }[] | null;
  };
  const pickOne = <T>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  for (const a of (ags ?? []) as RawAg[]) {
    const g = geral.get(a.profissional_id);
    if (!g) continue; // agendamento de profissional removido — ignora
    const preco = Number(pickOne(a.servicos)?.preco ?? 0);
    const pct   = overrideMap.get(`${a.profissional_id}:${a.servico_id}`)
                  ?? padrao.get(a.profissional_id) ?? 0;
    const comissao = (preco * pct) / 100;

    g.atendimentos += 1;
    g.faturamento  += preco;
    g.comissao     += comissao;

    const noMes = a.data_hora_inicio >= periodo.inicio && a.data_hora_inicio < periodo.fim;
    if (noMes) {
      const m = mes.get(a.profissional_id)!;
      m.atendimentos += 1;
      m.faturamento  += preco;
      m.comissao     += comissao;
    }
  }

  return listaProfs.map((p) => ({
    profissional: { id: p.id, nome: p.nome, cor: p.cor },
    mes:   mes.get(p.id)!,
    geral: geral.get(p.id)!,
  }));
}

/** Ordena por uma métrica (desc) e filtra quem tem valor > 0 nessa métrica */
export function ordenarPor(itens: RankingItem[], escopo: "mes" | "geral", metrica: Metrica): RankingItem[] {
  return itens
    .filter((i) => i[escopo][metrica] > 0)
    .sort((a, b) => b[escopo][metrica] - a[escopo][metrica]);
}
