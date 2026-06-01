"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Aceita string vazia como null para campos opcionais
const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().optional(),
);

// Telefone: opcional. Se vier, precisa ser 10 ou 11 dígitos.
const optionalTelefone = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().regex(/^\d{10,11}$/, "Telefone inválido (somente dígitos, DDD + número)").optional(),
);

// Email opcional, validado se presente
const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().toLowerCase().email("E-mail inválido").optional(),
);

// Data nascimento opcional (formato YYYY-MM-DD do input type=date)
const optionalDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida").optional(),
);

const clienteSchema = z.object({
  nome:            z.string().trim().min(2, "Nome muito curto").max(100, "Nome muito longo"),
  telefone:        optionalTelefone,
  email:           optionalEmail,
  data_nascimento: optionalDate,
  observacoes:     optionalText,
});

export type ClienteState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof clienteSchema>, string>>;
  values?: {
    nome?:            string;
    telefone?:        string;
    email?:           string;
    data_nascimento?: string;
    observacoes?:     string;
  };
};

function parseForm(formData: FormData) {
  const raw = {
    nome:            formData.get("nome"),
    telefone:        formData.get("telefone"),
    email:           formData.get("email"),
    data_nascimento: formData.get("data_nascimento"),
    observacoes:     formData.get("observacoes"),
  };

  const preservedValues: ClienteState["values"] = {
    nome:            typeof raw.nome            === "string" ? raw.nome            : "",
    telefone:        typeof raw.telefone        === "string" ? raw.telefone        : "",
    email:           typeof raw.email           === "string" ? raw.email           : "",
    data_nascimento: typeof raw.data_nascimento === "string" ? raw.data_nascimento : "",
    observacoes:     typeof raw.observacoes     === "string" ? raw.observacoes     : "",
  };

  const parsed = clienteSchema.safeParse(raw);
  return { parsed, preservedValues };
}

function collectFieldErrors(error: z.ZodError): ClienteState["fieldErrors"] {
  const out: ClienteState["fieldErrors"] = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof z.infer<typeof clienteSchema>;
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function criarCliente(
  _prev: ClienteState,
  formData: FormData,
): Promise<ClienteState> {
  const { parsed, preservedValues } = parseForm(formData);

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

  const { data: u, error: userErr } = await supabase
    .from("usuarios")
    .select("salao_id")
    .eq("id", user.id)
    .maybeSingle<{ salao_id: string }>();

  if (userErr) {
    console.error("[clientes] Erro ao buscar usuário:", userErr);
    return { ok: false, message: `Erro de acesso ao banco: ${userErr.message}`, values: preservedValues };
  }
  if (!u) {
    return {
      ok: false,
      message: "Sua conta não está vinculada a um salão.",
      values: preservedValues,
    };
  }

  const { error } = await supabase.from("clientes").insert({
    salao_id:        u.salao_id,
    nome:            parsed.data.nome,
    telefone:        parsed.data.telefone ?? null,
    email:           parsed.data.email ?? null,
    data_nascimento: parsed.data.data_nascimento ?? null,
    observacoes:     parsed.data.observacoes ?? null,
  });

  if (error) {
    return { ok: false, message: error.message, values: preservedValues };
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function atualizarCliente(
  id: string,
  _prev: ClienteState,
  formData: FormData,
): Promise<ClienteState> {
  const { parsed, preservedValues } = parseForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Corrija os campos destacados.",
      fieldErrors: collectFieldErrors(parsed.error),
      values: preservedValues,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clientes")
    .update({
      nome:            parsed.data.nome,
      telefone:        parsed.data.telefone ?? null,
      email:           parsed.data.email ?? null,
      data_nascimento: parsed.data.data_nascimento ?? null,
      observacoes:     parsed.data.observacoes ?? null,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: error.message, values: preservedValues };
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function alternarAtivoCliente(id: string, ativoAtual: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("clientes").update({ ativo: !ativoAtual }).eq("id", id);
  revalidatePath("/clientes");
}

export type DeleteState = {
  ok:       boolean;
  message?: string;
};

/**
 * Exclusão definitiva (hard delete).
 *
 * Primeiro checa se há agendamentos vinculados — se sim, retorna
 * mensagem amigável sugerindo desativar em vez. A FK em
 * `agendamentos.cliente_id` é ON DELETE RESTRICT, então o DELETE
 * falharia silenciosamente sem essa checagem antecipada.
 */
export async function excluirCliente(
  id: string,
  _prev: DeleteState,
): Promise<DeleteState> {
  const supabase = await createClient();

  const { count, error: countErr } = await supabase
    .from("agendamentos")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", id);

  if (countErr) {
    return { ok: false, message: `Erro ao verificar agendamentos: ${countErr.message}` };
  }

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message:
        `Este cliente tem ${count} agendamento(s) vinculado(s) ao histórico. ` +
        "Use 'desativar' em vez de 'excluir' para manter o registro.",
    };
  }

  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) {
    return { ok: false, message: `Falha ao excluir: ${error.message}` };
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}
