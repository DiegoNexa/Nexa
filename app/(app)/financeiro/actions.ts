"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const CATEGORIAS = ["aluguel", "produtos", "contas", "equipamentos", "marketing", "impostos", "outros"] as const;

const valorSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(",", ".").trim() : v),
  z.coerce.number().gt(0, "Valor deve ser maior que zero").max(9999999.99, "Valor muito alto"),
);

const despesaSchema = z.object({
  descricao:    z.string().trim().min(1, "Informe uma descrição").max(120, "Descrição muito longa"),
  categoria:    z.enum(CATEGORIAS, { message: "Categoria inválida" }),
  valor:        valorSchema,
  data_despesa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});

export type DespesaState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof despesaSchema>, string>>;
};

export async function criarDespesa(
  _prev: DespesaState,
  formData: FormData,
): Promise<DespesaState> {
  const parsed = despesaSchema.safeParse({
    descricao:    formData.get("descricao"),
    categoria:    formData.get("categoria"),
    valor:        formData.get("valor"),
    data_despesa: formData.get("data_despesa"),
  });

  if (!parsed.success) {
    const fieldErrors: DespesaState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof z.infer<typeof despesaSchema>;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Corrija os campos destacados.", fieldErrors };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const { data: u } = await supabase
    .from("usuarios")
    .select("salao_id")
    .eq("id", user.id)
    .maybeSingle<{ salao_id: string }>();

  if (!u) return { ok: false, message: "Sua conta não está vinculada a um salão." };

  const { error } = await supabase.from("despesas").insert({
    salao_id:     u.salao_id,
    descricao:    parsed.data.descricao,
    categoria:    parsed.data.categoria,
    valor:        parsed.data.valor,
    data_despesa: parsed.data.data_despesa,
    created_by:   user.id,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/financeiro");
  return { ok: true, message: "Despesa registrada." };
}

export async function excluirDespesa(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("despesas").delete().eq("id", id);
  revalidatePath("/financeiro");
}
