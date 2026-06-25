"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapErroAgendamentoPublico } from "@/lib/agendar-publico";

// Selects vazios/desabilitados chegam como null no FormData. O preprocess
// converte null -> "" pra cair na mensagem amigável do uuid em vez do
// erro técnico do Zod ("expected string, received null").
const selectObrigatorio = (msg: string) =>
  z.preprocess((v) => (typeof v === "string" ? v : ""), z.string().uuid(msg));

const schema = z.object({
  servico_id:        selectObrigatorio("Selecione um serviço"),
  profissional_id:   selectObrigatorio("Selecione um profissional"),
  cliente_nome:      z.string().trim().min(2, "Nome muito curto").max(100),
  cliente_telefone:  z.string().regex(/^\d{10,11}$/, "Telefone inválido (DDD + número)"),
  cliente_email:     z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().toLowerCase().email("E-mail inválido").optional(),
  ),
  data_hora_inicio:  z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Data/hora inválida"),
  observacoes:       z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(500).optional(),
  ),
});

export type AgendarPublicoState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof schema>, string>>;
  values?: {
    servico_id?:       string;
    profissional_id?:  string;
    cliente_nome?:     string;
    cliente_telefone?: string;
    cliente_email?:    string;
    data_hora_inicio?: string;
    observacoes?:      string;
  };
};

export async function criarAgendamentoPublico(
  slug: string,
  _prev: AgendarPublicoState,
  formData: FormData,
): Promise<AgendarPublicoState> {
  const raw = {
    servico_id:        formData.get("servico_id"),
    profissional_id:   formData.get("profissional_id"),
    cliente_nome:      formData.get("cliente_nome"),
    cliente_telefone:  formData.get("cliente_telefone"),
    cliente_email:     formData.get("cliente_email"),
    data_hora_inicio:  formData.get("data_hora_inicio"),
    observacoes:       formData.get("observacoes"),
  };

  const preservedValues: AgendarPublicoState["values"] = {
    servico_id:        typeof raw.servico_id        === "string" ? raw.servico_id        : "",
    profissional_id:   typeof raw.profissional_id   === "string" ? raw.profissional_id   : "",
    cliente_nome:      typeof raw.cliente_nome      === "string" ? raw.cliente_nome      : "",
    cliente_telefone:  typeof raw.cliente_telefone  === "string" ? raw.cliente_telefone  : "",
    cliente_email:     typeof raw.cliente_email     === "string" ? raw.cliente_email     : "",
    data_hora_inicio:  typeof raw.data_hora_inicio  === "string" ? raw.data_hora_inicio  : "",
    observacoes:       typeof raw.observacoes       === "string" ? raw.observacoes       : "",
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: AgendarPublicoState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof z.infer<typeof schema>;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      message: "Corrija os campos destacados.",
      fieldErrors,
      values: preservedValues,
    };
  }

  // Validação de futuro — não permite marcar no passado
  const dataInicio = new Date(parsed.data.data_hora_inicio);
  if (isNaN(dataInicio.getTime())) {
    return { ok: false, message: "Data/hora inválida.", values: preservedValues };
  }
  if (dataInicio.getTime() <= Date.now()) {
    return {
      ok: false,
      message: "Escolha um horário no futuro.",
      fieldErrors: { data_hora_inicio: "Não é possível marcar um horário no passado" },
      values: preservedValues,
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("criar_agendamento_publico", {
    p_slug:             slug,
    p_servico_id:       parsed.data.servico_id,
    p_profissional_id:  parsed.data.profissional_id,
    p_cliente_nome:     parsed.data.cliente_nome,
    p_cliente_telefone: parsed.data.cliente_telefone,
    p_cliente_email:    parsed.data.cliente_email ?? null,
    p_data_hora_inicio: dataInicio.toISOString(),
    p_observacoes:      parsed.data.observacoes ?? null,
  });

  if (error) {
    return {
      ok: false,
      message: mapErroAgendamentoPublico(error.message),
      values: preservedValues,
    };
  }

  // Sucesso — redireciona pra confirmação com ID do agendamento
  const agendamentoId = (data as { agendamento_id?: string } | null)?.agendamento_id;
  if (!agendamentoId) {
    return { ok: false, message: "Resposta inesperada do servidor.", values: preservedValues };
  }

  redirect(`/agendar/${slug}/sucesso?id=${agendamentoId}`);
}
