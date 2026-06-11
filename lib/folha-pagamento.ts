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
    salario_fixo:    number;
  };
  periodo: {
    inicio: string;        // ISO date YYYY-MM-DD
    fim:    string;        // ISO date YYYY-MM-DD
    label:  string;        // "Junho 2026"
  };
  atendimentos:      AtendimentoFolha[];
  movimentos:        Movimento[];
  totais: {
    salario_fixo:           number;  // mensalidade fixa do profissional
    comissao_bruta:         number;  // soma de atendimentos
    descontos:              number;  // vales + adiantamentos + descontos
    bonus:                  number;
    movimentos_adicionais:  number;  // comissao - descontos + bonus
    liquido:                number;  // salario + movimentos_adicionais
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
    .select("id, nome, cor, comissao_padrao, salario_fixo")
    .eq("id", profissionalId)
    .single<{
      id:              string;
      nome:            string;
      cor:             string | null;
      comissao_padrao: number;
      salario_fixo:    number;
    }>();

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
  const salario_fixo = Number(prof.salario_fixo);

  const comissao_bruta = atendimentos.reduce((s, a) => s + a.comissao_valor, 0);

  const descontos = movimentos
    .filter((m) => m.tipo === "vale" || m.tipo === "adiantamento" || m.tipo === "desconto")
    .reduce((s, m) => s + Number(m.valor), 0);

  const bonus = movimentos
    .filter((m) => m.tipo === "bonus")
    .reduce((s, m) => s + Number(m.valor), 0);

  // "Movimentos adicionais" agrupa tudo que NÃO é salário fixo —
  // comissão dos atendimentos + bônus - descontos.
  // Líquido final = salário + movimentos adicionais
  const movimentos_adicionais = comissao_bruta - descontos + bonus;
  const liquido = salario_fixo + movimentos_adicionais;

  return {
    profissional: {
      id:              prof.id,
      nome:            prof.nome,
      cor:             prof.cor,
      comissao_padrao: prof.comissao_padrao,
      salario_fixo,
    },
    periodo,
    atendimentos,
    movimentos,
    totais: {
      salario_fixo,
      comissao_bruta,
      descontos,
      bonus,
      movimentos_adicionais,
      liquido,
    },
  };
}

// =============================================================
// Histórico completo de carreira (relatório de demissão)
// =============================================================
//
// Diferente de carregarFolha (1 mês), esta função carrega TUDO
// desde a admissão do profissional. Usada para gerar PDF de
// histórico no salão — útil em casos de demissão ou pra arquivo
// pessoal do profissional.
//
// Diferenças no cálculo:
//   - Salário fixo é acumulado: salario_fixo × meses trabalhados
//   - Comissão e movimentos somam TUDO (sem filtro de período)
//   - Inclui estatísticas de carreira (média mensal, etc)
// =============================================================

export type HistoricoCompleto = {
  profissional: {
    id:              string;
    nome:            string;
    telefone:        string | null;
    cor:             string | null;
    comissao_padrao: number;
    salario_fixo:    number;
    created_at:      string;
  };
  periodo: {
    inicio:           string;
    fim:              string;
    diasNoSalao:      number;
    mesesNoSalao:     number;
    labelDataInicio:  string;
    labelDataFim:     string;
  };
  atendimentos:  AtendimentoFolha[];
  movimentos:    Movimento[];
  totais: {
    salario_fixo_mensal:   number;
    salario_fixo_total:    number;  // mensal × meses
    comissao_bruta_total:  number;
    descontos_total:       number;
    bonus_total:           number;
    total_recebido:        number;  // salario_fixo_total + comissao - desc + bonus
  };
  estatisticas: {
    total_atendimentos:     number;
    media_atendimentos_mes: number;
    ticket_medio:           number;  // valor médio cobrado por atendimento
    comissao_media:         number;  // valor médio de comissão por atendimento
  };
};

export async function carregarHistoricoCompleto(
  supabase: SupabaseClient,
  profissionalId: string,
): Promise<HistoricoCompleto | null> {
  // 1. Profissional (com created_at = data de admissão)
  const { data: prof } = await supabase
    .from("profissionais")
    .select("id, nome, telefone, cor, comissao_padrao, salario_fixo, created_at")
    .eq("id", profissionalId)
    .single<{
      id:              string;
      nome:            string;
      telefone:        string | null;
      cor:             string | null;
      comissao_padrao: number;
      salario_fixo:    number;
      created_at:      string;
    }>();

  if (!prof) return null;

  // 2. Período (admissão → hoje, mais 1 dia para incluir hoje)
  const dataInicio = new Date(prof.created_at);
  const dataFim    = new Date();
  const diasNoSalao  = Math.max(1, Math.floor((dataFim.getTime() - dataInicio.getTime()) / 86400000));
  const mesesNoSalao = Math.max(1, +(diasNoSalao / 30).toFixed(2));

  const periodo = {
    inicio:           dataInicio.toISOString().slice(0, 10),
    fim:              new Date(dataFim.getTime() + 86400000).toISOString().slice(0, 10),
    diasNoSalao,
    mesesNoSalao,
    labelDataInicio:  dataInicio.toLocaleDateString("pt-BR"),
    labelDataFim:     dataFim.toLocaleDateString("pt-BR"),
  };

  // 3. TODOS os agendamentos concluídos (sem filtro de período)
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
    .order("data_hora_inicio", { ascending: false });

  // 4. Overrides de comissão
  const { data: overrides } = await supabase
    .from("comissoes_config")
    .select("servico_id, percentual")
    .eq("profissional_id", profissionalId);

  const overridesMap = new Map<string, number>();
  for (const o of overrides ?? []) {
    overridesMap.set(o.servico_id, o.percentual);
  }

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
    return {
      id:               a.id,
      data_hora_inicio: a.data_hora_inicio,
      cliente_nome:     cliente?.nome ?? "Cliente removido",
      servico_nome:     servico?.nome ?? "Serviço removido",
      servico_preco:    preco,
      percentual,
      comissao_valor:   (preco * percentual) / 100,
    };
  });

  // 5. TODOS os movimentos (sem filtro)
  const { data: movs } = await supabase
    .from("movimentos_folha")
    .select("id, tipo, valor, descricao, data_movimento")
    .eq("profissional_id", profissionalId)
    .order("data_movimento", { ascending: false })
    .returns<Movimento[]>();

  const movimentos = movs ?? [];

  // 6. Totais acumulados
  const salario_fixo_mensal  = Number(prof.salario_fixo);
  const salario_fixo_total   = salario_fixo_mensal * mesesNoSalao;
  const comissao_bruta_total = atendimentos.reduce((s, a) => s + a.comissao_valor, 0);
  const descontos_total      = movimentos
    .filter((m) => m.tipo === "vale" || m.tipo === "adiantamento" || m.tipo === "desconto")
    .reduce((s, m) => s + Number(m.valor), 0);
  const bonus_total          = movimentos
    .filter((m) => m.tipo === "bonus")
    .reduce((s, m) => s + Number(m.valor), 0);
  const total_recebido       = salario_fixo_total + comissao_bruta_total - descontos_total + bonus_total;

  // 7. Estatísticas
  const total_atendimentos     = atendimentos.length;
  const media_atendimentos_mes = +(total_atendimentos / mesesNoSalao).toFixed(1);
  const total_preco            = atendimentos.reduce((s, a) => s + a.servico_preco, 0);
  const ticket_medio           = total_atendimentos > 0 ? total_preco / total_atendimentos : 0;
  const comissao_media         = total_atendimentos > 0 ? comissao_bruta_total / total_atendimentos : 0;

  return {
    profissional: {
      id:              prof.id,
      nome:            prof.nome,
      telefone:        prof.telefone,
      cor:             prof.cor,
      comissao_padrao: prof.comissao_padrao,
      salario_fixo:    salario_fixo_mensal,
      created_at:      prof.created_at,
    },
    periodo,
    atendimentos,
    movimentos,
    totais: {
      salario_fixo_mensal,
      salario_fixo_total,
      comissao_bruta_total,
      descontos_total,
      bonus_total,
      total_recebido,
    },
    estatisticas: {
      total_atendimentos,
      media_atendimentos_mes,
      ticket_medio,
      comissao_media,
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

/**
 * Trunca string com ellipsis se exceder o limite. Útil em PDFs
 * onde react-pdf não respeita CSS word-break — texto sem espaços
 * estoura o layout. Cortar no JS é a forma confiável.
 */
export function truncar(texto: string | null | undefined, maxChars = 60): string {
  if (!texto) return "—";
  if (texto.length <= maxChars) return texto;
  return texto.slice(0, maxChars - 1).trimEnd() + "…";
}

/**
 * Insere zero-width spaces (U+200B) em palavras longas pra
 * dar oportunidades de quebra de linha pro react-pdf.
 *
 * react-pdf quebra texto naturalmente em espaços, mas se a
 * palavra é só "aaaaaaaaaa..." sem espaços, ele estoura o
 * layout. Inserindo ZWSP a cada N chars, o motor de layout
 * passa a poder quebrar nesses pontos — sem afetar visualmente
 * a string (o caractere é invisível).
 */
export function quebrarPalavrasLongas(
  texto: string | null | undefined,
  maxPalavra = 18,
): string {
  if (!texto) return "—";

  const ZWSP = String.fromCharCode(0x200B); // zero-width space — invisível mas dá break opportunity
  return texto
    .split(/(\s+)/) // preserva os espaços no split
    .map((parte) => {
      if (parte.length <= maxPalavra) return parte;
      const chunks: string[] = [];
      for (let i = 0; i < parte.length; i += maxPalavra) {
        chunks.push(parte.slice(i, i + maxPalavra));
      }
      return chunks.join(ZWSP);
    })
    .join("");
}
