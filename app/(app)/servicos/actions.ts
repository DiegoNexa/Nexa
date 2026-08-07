"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Aceita tanto vírgula quanto ponto como separador decimal.
// preprocess normaliza, depois validamos como number.
const precoSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(",", ".").trim() : v),
  z.coerce.number().min(0, "Preço não pode ser negativo").max(99999.99, "Preço muito alto"),
);

const servicoSchema = z.object({
  nome:            z.string().trim().min(2, "Nome muito curto").max(80, "Nome muito longo"),
  descricao:       z.string().trim().max(500, "Descrição muito longa").optional(),
  duracao_minutos: z.coerce.number().int().min(5, "Mínimo 5 minutos").max(480, "Máximo 8 horas"),
  preco:           precoSchema,
});

export type ServicoState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof servicoSchema>, string>>;
  values?: {
    nome?:            string;
    descricao?:       string;
    duracao_minutos?: string;
    preco?:           string;
  };
};

// Parse helper compartilhado entre create e update
function parseForm(formData: FormData) {
  const raw = {
    nome:            formData.get("nome"),
    descricao:       formData.get("descricao") || undefined,
    duracao_minutos: formData.get("duracao_minutos"),
    preco:           formData.get("preco"),
  };

  const preservedValues: ServicoState["values"] = {
    nome:            typeof raw.nome            === "string" ? raw.nome            : "",
    descricao:       typeof raw.descricao       === "string" ? raw.descricao       : "",
    duracao_minutos: typeof raw.duracao_minutos === "string" ? raw.duracao_minutos : "",
    preco:           typeof raw.preco           === "string" ? raw.preco           : "",
  };

  const parsed = servicoSchema.safeParse(raw);
  return { parsed, preservedValues };
}

function collectFieldErrors(error: z.ZodError): ServicoState["fieldErrors"] {
  const out: ServicoState["fieldErrors"] = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof z.infer<typeof servicoSchema>;
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function criarServico(
  _prev: ServicoState,
  formData: FormData,
): Promise<ServicoState> {
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

  // RLS já garante isolamento. Buscamos salao_id pra preencher o INSERT.
  const { data: u, error: userErr } = await supabase
    .from("usuarios")
    .select("salao_id")
    .eq("id", user.id)
    .maybeSingle<{ salao_id: string }>();

  if (userErr) {
    console.error("[servicos] Erro ao buscar usuário:", userErr);
    return { ok: false, message: `Erro de acesso ao banco: ${userErr.message}`, values: preservedValues };
  }
  if (!u) {
    return {
      ok: false,
      message: "Sua conta não está vinculada a um salão. Faça logout e crie uma nova conta, ou abra um chamado.",
      values: preservedValues,
    };
  }

  const { error } = await supabase.from("servicos").insert({
    salao_id:        u.salao_id,
    nome:            parsed.data.nome,
    descricao:       parsed.data.descricao ?? null,
    duracao_minutos: parsed.data.duracao_minutos,
    preco:           parsed.data.preco,
  });

  if (error) {
    return { ok: false, message: error.message, values: preservedValues };
  }

  revalidatePath("/servicos");
  redirect("/servicos");
}

export async function atualizarServico(
  id: string,
  _prev: ServicoState,
  formData: FormData,
): Promise<ServicoState> {
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
    .from("servicos")
    .update({
      nome:            parsed.data.nome,
      descricao:       parsed.data.descricao ?? null,
      duracao_minutos: parsed.data.duracao_minutos,
      preco:           parsed.data.preco,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: error.message, values: preservedValues };
  }

  revalidatePath("/servicos");
  redirect("/servicos");
}

/**
 * Toggle ativo/inativo. Soft-delete: nunca apagamos serviços
 * porque há FK em agendamentos referenciando.
 */
export async function alternarAtivoServico(id: string, ativoAtual: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("servicos").update({ ativo: !ativoAtual }).eq("id", id);
  revalidatePath("/servicos");
}
