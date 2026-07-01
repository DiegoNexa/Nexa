/**
 * Agregação financeira do salão em um período (mês).
 *
 * Resultado (DRE simplificado):
 *   Faturamento  = Σ preço dos atendimentos concluídos no período
 *   − Folha       = Σ líquido a pagar aos profissionais (reusa lib folha)
 *   − Despesas    = Σ despesas da tabela `despesas` no período
 *   = Lucro líquido
 *
 * A folha reutiliza carregarFolha() pra que o custo de pessoal seja
 * exatamente o mesmo número mostrado no módulo Folha de Pagamento.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { carregarFolha } from "./folha-pagamento";

export type CategoriaDespesa =
  | "aluguel" | "produtos" | "contas" | "equipamentos" | "marketing" | "impostos" | "outros";

export type Despesa = {
  id:           string;
  descricao:    string;
  categoria:    CategoriaDespesa;
  valor:        number;
  data_despesa: string;   // YYYY-MM-DD
};

export type FinanceiroResumo = {
  periodo: { inicio: string; fim: string; label: string };
  receita: {
    total:        number;
    atendimentos: number;
  };
  folha: {
    total: number;   // líquido a pagar (comissões + salários − descontos + bônus)
  };
  despesas: {
    total:       number;
    lista:       Despesa[];
    porCategoria: { categoria: CategoriaDespesa; total: number }[];
  };
  lucro: number;     // receita − folha − despesas
};

export const CATEGORIA_LABEL: Record<CategoriaDespesa, string> = {
  aluguel:      "Aluguel",
  produtos:     "Produtos",
  contas:       "Contas (água, luz, internet)",
  equipamentos: "Equipamentos",
  marketing:    "Marketing",
  impostos:     "Impostos",
  outros:       "Outros",
};

export async function carregarFinanceiro(
  supabase: SupabaseClient,
  periodo: { inicio: string; fim: string; label: string },
): Promise<FinanceiroResumo> {
  // 1. Receita — atendimentos concluídos no período (× preço do serviço)
  const { data: ags } = await supabase
    .from("agendamentos")
    .select("id, servicos ( preco )")
    .eq("status", "concluido")
    .gte("data_hora_inicio", periodo.inicio)
    .lt("data_hora_inicio", periodo.fim);

  type RawAg = { id: string; servicos: { preco: number } | { preco: number }[] | null };
  const pickOne = <T>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  const listaAgs = (ags ?? []) as RawAg[];
  const receitaTotal = listaAgs.reduce((s, a) => {
    const servico = pickOne(a.servicos);
    return s + Number(servico?.preco ?? 0);
  }, 0);

  // 2. Folha — custo de pessoal de TODOS os profissionais (ativos ou não,
  //    pois inativos podem ter atendimentos concluídos no período)
  const { data: profs } = await supabase
    .from("profissionais")
    .select("id")
    .returns<{ id: string }[]>();

  const folhas = await Promise.all(
    (profs ?? []).map((p) => carregarFolha(supabase, p.id, periodo)),
  );
  const folhaTotal = folhas.reduce((s, f) => s + (f?.totais.liquido ?? 0), 0);

  // 3. Despesas do período
  const { data: desp } = await supabase
    .from("despesas")
    .select("id, descricao, categoria, valor, data_despesa")
    .gte("data_despesa", periodo.inicio)
    .lt("data_despesa", periodo.fim)
    .order("data_despesa", { ascending: false })
    .returns<Despesa[]>();

  const lista = desp ?? [];
  const despesasTotal = lista.reduce((s, d) => s + Number(d.valor), 0);

  // Agrupa por categoria (só as que têm valor), ordenado desc
  const mapaCat = new Map<CategoriaDespesa, number>();
  for (const d of lista) {
    mapaCat.set(d.categoria, (mapaCat.get(d.categoria) ?? 0) + Number(d.valor));
  }
  const porCategoria = Array.from(mapaCat.entries())
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);

  return {
    periodo,
    receita:  { total: receitaTotal, atendimentos: listaAgs.length },
    folha:    { total: folhaTotal },
    despesas: { total: despesasTotal, lista, porCategoria },
    lucro:    receitaTotal - folhaTotal - despesasTotal,
  };
}
