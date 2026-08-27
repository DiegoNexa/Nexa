/**
 * Helpers do link público de agendamento.
 *
 * Toda a comunicação com o banco passa por funções SECURITY DEFINER
 * (migration 013). Validação fica concentrada no SQL.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type SalaoPublico = {
  id:   string;
  nome: string;
  slug: string;
};

export type ServicoPublico = {
  id:               string;
  nome:             string;
  descricao:        string | null;
  duracao_minutos:  number;
  preco:            number;
};

export type ProfissionalPublico = {
  id:   string;
  nome: string;
  cor:  string | null;
};

export type Bloqueio = {
  profissional_id: string;
  servico_id:      string;
};

export async function carregarSalaoPublico(
  supabase: SupabaseClient,
  slug: string,
): Promise<SalaoPublico | null> {
  const { data, error } = await supabase.rpc("get_salao_publico", { p_slug: slug });
  if (error || !data || data.length === 0) return null;
  return data[0] as SalaoPublico;
}

export async function carregarServicosPublico(
  supabase: SupabaseClient,
  slug: string,
): Promise<ServicoPublico[]> {
  const { data } = await supabase.rpc("get_servicos_publico", { p_slug: slug });
  return (data ?? []) as ServicoPublico[];
}

export async function carregarProfissionaisPublico(
  supabase: SupabaseClient,
  slug: string,
): Promise<ProfissionalPublico[]> {
  const { data } = await supabase.rpc("get_profissionais_publico", { p_slug: slug });
  return (data ?? []) as ProfissionalPublico[];
}

export async function carregarBloqueiosPublico(
  supabase: SupabaseClient,
  slug: string,
): Promise<Bloqueio[]> {
  const { data } = await supabase.rpc("get_bloqueios_publico", { p_slug: slug });
  return (data ?? []) as Bloqueio[];
}

/**
 * Mapeia exceptions do criar_agendamento_publico() pra mensagens
 * amigáveis em português.
 */
export function mapErroAgendamentoPublico(message: string): string {
  if (message.includes("nome_invalido"))                  return "Informe um nome válido (mínimo 2 caracteres).";
  if (message.includes("telefone_invalido"))              return "Informe um telefone válido (DDD + número, só dígitos).";
  if (message.includes("email_invalido"))                 return "E-mail inválido.";
  if (message.includes("salao_nao_encontrado"))           return "Salão não encontrado. Confirme o link.";
  if (message.includes("profissional_invalido"))          return "Profissional inválido ou desativado.";
  if (message.includes("servico_invalido"))               return "Serviço inválido ou desativado.";
  if (message.includes("profissional_nao_atende_servico"))return "Este profissional não realiza esse serviço.";
  if (message.includes("data_no_passado"))                return "Escolha um horário no futuro.";
  if (message.includes("limite_agendamentos"))
    return "Você já tem 3 horários marcados neste salão. Cancele um deles ou fale com o salão para marcar mais.";
  // EXCLUDE constraint
  if (message.includes("23P01") || message.includes("conflicting key"))
    return "Esse horário já está ocupado. Escolha outro.";
  return "Não foi possível criar o agendamento. Tente novamente.";
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarBRL(valor: number): string {
  return BRL.format(valor);
}

export function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos}min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}
