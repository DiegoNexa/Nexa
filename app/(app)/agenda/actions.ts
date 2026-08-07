"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ─── Schema de criação ─────────────────────────────────────
// Selects vazios/desabilitados chegam como null no FormData. O preprocess
// converte null -> "" pra cair na mensagem amigável do uuid em vez do
// erro técnico do Zod ("expected string, received null").
const selectObrigatorio = (msg: string) =>
  z.preprocess((v) => (typeof v === "string" ? v : ""), z.string().uuid(msg));

const criarSchema = z.object({
  cliente_id:        selectObrigatorio("Selecione um cliente"),
  profissional_id:   selectObrigatorio("Selecione um profissional"),
  servico_id:        selectObrigatorio("Selecione um serviço"),
  data_hora_inicio:  z.string().regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    "Data/hora inválida",
  ),
  observacoes:       z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(500, "Observações muito longas").optional(),
  ),
});

export type CriarAgendamentoState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof criarSchema>, string>>;
  values?: {
    cliente_id?:       string;
    profissional_id?:  string;
    servico_id?:       string;
    data_hora_inicio?: string;
    observacoes?:      string;
  };
};

function collectFieldErrors(error: z.ZodError): CriarAgendamentoState["fieldErrors"] {
  const out: CriarAgendamentoState["fieldErrors"] = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof z.infer<typeof criarSchema>;
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function criarAgendamento(
  _prev: CriarAgendamentoState,
  formData: FormData,
): Promise<CriarAgendamentoState> {
  const raw = {
    cliente_id:       formData.get("cliente_id"),
    profissional_id:  formData.get("profissional_id"),
    servico_id:       formData.get("servico_id"),
    data_hora_inicio: formData.get("data_hora_inicio"),
    observacoes:      formData.get("observacoes"),
  };

  const preservedValues: CriarAgendamentoState["values"] = {
    cliente_id:       typeof raw.cliente_id       === "string" ? raw.cliente_id       : "",
    profissional_id:  typeof raw.profissional_id  === "string" ? raw.profissional_id  : "",
    servico_id:       typeof raw.servico_id       === "string" ? raw.servico_id       : "",
    data_hora_inicio: typeof raw.data_hora_inicio === "string" ? raw.data_hora_inicio : "",
    observacoes:      typeof raw.observacoes      === "string" ? raw.observacoes      : "",
  };

  const parsed = criarSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Corrija os campos destacados.",
      fieldErrors: collectFieldErrors(parsed.error),
      values: preservedValues,
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  // Busca salao_id do usuário
  const { data: u, error: userErr } = await supabase
    .from("usuarios")
    .select("salao_id")
    .eq("id", user.id)
    .maybeSingle<{ salao_id: string }>();

  if (userErr || !u) {
    return { ok: false, message: "Sua conta não está vinculada a um salão.", values: preservedValues };
  }

  // Busca duração do serviço para calcular data_hora_fim
  const { data: servico, error: servErr } = await supabase
    .from("servicos")
    .select("duracao_minutos")
    .eq("id", parsed.data.servico_id)
    .single<{ duracao_minutos: number }>();

  if (servErr || !servico) {
    return { ok: false, message: "Serviço não encontrado.", values: preservedValues };
  }

  // Converte data_hora_inicio (local string) para Date e calcula fim
  // datetime-local vem sem timezone — JS interpreta como horário local
  const inicio = new Date(parsed.data.data_hora_inicio);
  if (isNaN(inicio.getTime())) {
    return { ok: false, message: "Data inválida.", values: preservedValues };
  }
  const fim = new Date(inicio.getTime() + servico.duracao_minutos * 60000);

  const { error: insErr } = await supabase.from("agendamentos").insert({
    salao_id:         u.salao_id,
    cliente_id:       parsed.data.cliente_id,
    profissional_id:  parsed.data.profissional_id,
    servico_id:       parsed.data.servico_id,
    data_hora_inicio: inicio.toISOString(),
    data_hora_fim:    fim.toISOString(),
    status:           "agendado",
    origem:           "manual",
    observacoes:      parsed.data.observacoes ?? null,
    created_by:       user.id,
  });

  if (insErr) {
    // EXCLUDE constraint do banco previne sobreposição
    if (insErr.code === "23P01") {
      return {
        ok: false,
        message: "Este profissional já tem outro agendamento que conflita com esse horário.",
        values: preservedValues,
      };
    }
    return { ok: false, message: insErr.message, values: preservedValues };
  }

  revalidatePath("/agenda");
  redirect("/agenda");
}

// ─── Mudança de status ─────────────────────────────────────
const STATUS_VALIDOS = ["agendado", "confirmado", "concluido", "cancelado", "falta"] as const;
type Status = typeof STATUS_VALIDOS[number];

export async function mudarStatusAgendamento(id: string, novoStatus: Status): Promise<void> {
  if (!STATUS_VALIDOS.includes(novoStatus)) return;

  const supabase = await createClient();
  await supabase
    .from("agendamentos")
    .update({ status: novoStatus })
    .eq("id", id);

  revalidatePath("/agenda");
  revalidatePath(`/agenda/${id}`);
}

// ─── Atualização de observações ────────────────────────────
const editarSchema = z.object({
  observacoes: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(500).nullable(),
  ),
});

export type EditarState = {
  ok:       boolean;
  message?: string;
};

export async function atualizarObservacoes(
  id: string,
  _prev: EditarState,
  formData: FormData,
): Promise<EditarState> {
  const parsed = editarSchema.safeParse({
    observacoes: formData.get("observacoes"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Observações inválidas." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("agendamentos")
    .update({ observacoes: parsed.data.observacoes })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/agenda/${id}`);
  revalidatePath("/agenda");
  return { ok: true, message: "Observações atualizadas." };
}

// ─── Exclusão (apenas se cancelado ou agendado) ────────────
export async function excluirAgendamento(id: string): Promise<void> {
  const supabase = await createClient();

  // Confirma que não está concluido (pra não distorcer folha)
  const { data: ag } = await supabase
    .from("agendamentos")
    .select("status")
    .eq("id", id)
    .single<{ status: string }>();

  if (!ag) return;
  if (ag.status === "concluido") {
    // Não permite — esse já está na folha
    return;
  }

  await supabase.from("agendamentos").delete().eq("id", id);
  revalidatePath("/agenda");
  redirect("/agenda");
}
