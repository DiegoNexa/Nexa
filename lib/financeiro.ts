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
  id:            string;
  descricao:     string;
  categoria:     CategoriaDespesa;
  valor:         number;
  data_despesa:  string;   // YYYY-MM-DD
  recorrente_id: string | null;   // preenchido se veio de uma despesa fixa
  virtual?:      boolean;         // true = projetada de uma recorrente (não é linha no banco)
};

export type Frequencia = "mensal" | "semanal";

export type DespesaRecorrente = {
  id:         string;
  descricao:  string;
  categoria:  CategoriaDespesa;
  valor:      number;
  frequencia: Frequencia;
  dia_mes:    number | null;
  dia_semana: number | null;
};

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Descreve a recorrência em texto: "todo mês (dia 5)" / "toda semana (segunda)" */
export function descreverRecorrencia(r: DespesaRecorrente): string {
  if (r.frequencia === "mensal") return `todo mês · dia ${r.dia_mes}`;
  return `toda semana · ${DIAS_SEMANA[r.dia_semana ?? 0]}`;
}

/**
 * Datas (YYYY-MM-DD) em que uma despesa recorrente ocorre dentro do
 * mês do período, respeitando a data de início do molde.
 * - mensal: 1 ocorrência no dia informado (até dia 28)
 * - semanal: todas as datas do mês no dia da semana informado
 */
function ocorrenciasNoMes(
  r: { frequencia: Frequencia; dia_mes: number | null; dia_semana: number | null; data_inicio: string },
  periodo: { inicio: string; fim: string },
): string[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  const [ano, mes] = periodo.inicio.split("-").map(Number);   // mes 1-12
  const limite = periodo.inicio > r.data_inicio ? periodo.inicio : r.data_inicio; // max(inicioMês, dataInício)
  const out: string[] = [];

  if (r.frequencia === "mensal" && r.dia_mes != null) {
    const data = `${ano}-${pad(mes)}-${pad(Math.min(r.dia_mes, 28))}`;
    if (data >= limite && data < periodo.fim) out.push(data);
  } else if (r.frequencia === "semanal" && r.dia_semana != null) {
    const fim = new Date(Date.UTC(ano, mes, 1));
    for (let d = new Date(Date.UTC(ano, mes - 1, 1)); d < fim; d = new Date(d.getTime() + 86400000)) {
      if (d.getUTCDay() === r.dia_semana) {
        const data = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
        if (data >= limite && data < periodo.fim) out.push(data);
      }
    }
  }
  return out;
}

/** Carrega os moldes de despesa recorrente ativos do salão */
export async function carregarRecorrentes(
  supabase: SupabaseClient,
): Promise<DespesaRecorrente[]> {
  const { data } = await supabase
    .from("despesas_recorrentes")
    .select("id, descricao, categoria, valor, frequencia, dia_mes, dia_semana")
    .eq("ativo", true)
    .order("descricao")
    .returns<DespesaRecorrente[]>();
  return data ?? [];
}

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

  // 3. Despesas do período = avulsas (reais) + recorrentes projetadas
  //    As recorrentes NÃO são materializadas no banco: projetamos as
  //    ocorrências do mês na hora, garantindo que sempre entrem no
  //    total (e no lucro), independente de geração/estorno.
  const { data: desp } = await supabase
    .from("despesas")
    .select("id, descricao, categoria, valor, data_despesa, recorrente_id")
    .is("recorrente_id", null)   // só avulsas; recorrentes vêm dos moldes
    .gte("data_despesa", periodo.inicio)
    .lt("data_despesa", periodo.fim)
    .order("data_despesa", { ascending: false })
    .returns<Despesa[]>();

  const { data: recs } = await supabase
    .from("despesas_recorrentes")
    .select("id, descricao, categoria, valor, frequencia, dia_mes, dia_semana, data_inicio")
    .eq("ativo", true)
    .returns<{
      id: string; descricao: string; categoria: CategoriaDespesa; valor: number;
      frequencia: Frequencia; dia_mes: number | null; dia_semana: number | null; data_inicio: string;
    }[]>();

  const virtuais: Despesa[] = [];
  for (const r of recs ?? []) {
    for (const data of ocorrenciasNoMes(r, periodo)) {
      virtuais.push({
        id:            `rec-${r.id}-${data}`,
        descricao:     r.descricao,
        categoria:     r.categoria,
        valor:         Number(r.valor),
        data_despesa:  data,
        recorrente_id: r.id,
        virtual:       true,
      });
    }
  }

  const lista = [...(desp ?? []), ...virtuais]
    .sort((a, b) => b.data_despesa.localeCompare(a.data_despesa));
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
