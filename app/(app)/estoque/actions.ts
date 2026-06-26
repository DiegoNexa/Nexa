"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Aceita vírgula ou ponto como separador decimal.
const numeroSchema = (label: string, max = 999999.99) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.replace(",", ".").trim() : v),
    z.coerce.number().min(0, `${label} não pode ser negativo`).max(max, `${label} muito alto`),
  );

// preço de custo é opcional — string vazia vira undefined
const precoCustoSchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.replace(",", ".").trim() : v),
  z.coerce.number().min(0, "Custo não pode ser negativo").max(999999.99, "Custo muito alto").optional(),
);

const produtoSchema = z.object({
  nome:              z.string().trim().min(2, "Nome muito curto").max(80, "Nome muito longo"),
  descricao:         z.string().trim().max(500, "Descrição muito longa").optional(),
  unidade:           z.string().trim().min(1, "Informe a unidade").max(10, "Unidade muito longa"),
  quantidade:        numeroSchema("Quantidade", 9999999.99),
  quantidade_minima: numeroSchema("Quantidade mínima", 9999999.99),
  preco_custo:       precoCustoSchema,
});

export type ProdutoState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof produtoSchema>, string>>;
  values?: {
    nome?:              string;
    descricao?:         string;
    unidade?:           string;
    quantidade?:        string;
    quantidade_minima?: string;
    preco_custo?:       string;
  };
};

function parseForm(formData: FormData) {
  const raw = {
    nome:              formData.get("nome"),
    descricao:         formData.get("descricao") || undefined,
    unidade:           formData.get("unidade"),
    quantidade:        formData.get("quantidade"),
    quantidade_minima: formData.get("quantidade_minima"),
    preco_custo:       formData.get("preco_custo"),
  };

  const preservedValues: ProdutoState["values"] = {
    nome:              typeof raw.nome              === "string" ? raw.nome              : "",
    descricao:         typeof raw.descricao         === "string" ? raw.descricao         : "",
    unidade:           typeof raw.unidade           === "string" ? raw.unidade           : "",
    quantidade:        typeof raw.quantidade        === "string" ? raw.quantidade        : "",
    quantidade_minima: typeof raw.quantidade_minima === "string" ? raw.quantidade_minima : "",
    preco_custo:       typeof raw.preco_custo       === "string" ? raw.preco_custo       : "",
  };

  const parsed = produtoSchema.safeParse(raw);
  return { parsed, preservedValues };
}

function collectFieldErrors(error: z.ZodError): ProdutoState["fieldErrors"] {
  const out: ProdutoState["fieldErrors"] = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof z.infer<typeof produtoSchema>;
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function criarProduto(
  _prev: ProdutoState,
  formData: FormData,
): Promise<ProdutoState> {
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
    return { ok: false, message: `Erro de acesso ao banco: ${userErr.message}`, values: preservedValues };
  }
  if (!u) {
    return { ok: false, message: "Sua conta não está vinculada a um salão.", values: preservedValues };
  }

  const { error } = await supabase.from("produtos").insert({
    salao_id:          u.salao_id,
    nome:              parsed.data.nome,
    descricao:         parsed.data.descricao ?? null,
    unidade:           parsed.data.unidade,
    quantidade:        parsed.data.quantidade,
    quantidade_minima: parsed.data.quantidade_minima,
    preco_custo:       parsed.data.preco_custo ?? null,
  });

  if (error) {
    return { ok: false, message: error.message, values: preservedValues };
  }

  revalidatePath("/estoque");
  redirect("/estoque");
}

export async function atualizarProduto(
  id: string,
  _prev: ProdutoState,
  formData: FormData,
): Promise<ProdutoState> {
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
  // Nota: quantidade NÃO é atualizada aqui — saldo só muda via movimentos.
  const { error } = await supabase
    .from("produtos")
    .update({
      nome:              parsed.data.nome,
      descricao:         parsed.data.descricao ?? null,
      unidade:           parsed.data.unidade,
      quantidade_minima: parsed.data.quantidade_minima,
      preco_custo:       parsed.data.preco_custo ?? null,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: error.message, values: preservedValues };
  }

  revalidatePath("/estoque");
  revalidatePath(`/estoque/${id}`);
  redirect("/estoque");
}

/**
 * Soft-delete: alterna ativo/inativo. Não apagamos produtos
 * porque há movimentos de estoque referenciando o histórico.
 */
export async function alternarAtivoProduto(id: string, ativoAtual: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("produtos").update({ ativo: !ativoAtual }).eq("id", id);
  revalidatePath("/estoque");
}

// ─── Movimentação de estoque (entrada/saída) ───────────────
const movimentoSchema = z.object({
  tipo:       z.enum(["entrada", "saida"], { message: "Tipo inválido" }),
  quantidade: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(",", ".").trim() : v),
    z.coerce.number().gt(0, "Quantidade deve ser maior que zero").max(9999999.99, "Quantidade muito alta"),
  ),
  motivo:     z.string().trim().max(200, "Motivo muito longo").optional(),
});

export type MovimentoState = { ok: boolean; message?: string };

const MENSAGENS_ERRO: Record<string, string> = {
  produto_invalido:      "Produto não encontrado.",
  quantidade_invalida:   "Quantidade inválida.",
  tipo_invalido:         "Tipo de movimento inválido.",
  estoque_insuficiente:  "Estoque insuficiente para essa saída.",
};

export async function registrarMovimento(
  produtoId: string,
  _prev: MovimentoState,
  formData: FormData,
): Promise<MovimentoState> {
  const parsed = movimentoSchema.safeParse({
    tipo:       formData.get("tipo"),
    quantidade: formData.get("quantidade"),
    motivo:     formData.get("motivo") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_movimento_estoque", {
    p_produto_id: produtoId,
    p_tipo:       parsed.data.tipo,
    p_quantidade: parsed.data.quantidade,
    p_motivo:     parsed.data.motivo ?? null,
  });

  if (error) {
    const chave = error.message.match(/[a-z_]+/)?.[0] ?? "";
    return { ok: false, message: MENSAGENS_ERRO[chave] ?? error.message };
  }

  revalidatePath("/estoque");
  revalidatePath(`/estoque/${produtoId}`);
  return { ok: true, message: parsed.data.tipo === "entrada" ? "Entrada registrada." : "Saída registrada." };
}
