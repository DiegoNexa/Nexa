"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const valorSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(",", ".").trim() : v),
  z.coerce.number().positive("Valor deve ser maior que zero").max(999999.99, "Valor muito alto"),
);

const movimentoSchema = z.object({
  profissional_id: z.string().uuid("Profissional inválido"),
  tipo:            z.enum(["vale", "adiantamento", "desconto", "bonus"]),
  valor:           valorSchema,
  descricao:       z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(100, "Descrição muito longa (máximo 100 caracteres)").optional(),
  ),
  data_movimento:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});

export type MovimentoState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof movimentoSchema>, string>>;
};

export async function criarMovimento(
  _prev: MovimentoState,
  formData: FormData,
): Promise<MovimentoState> {
  const raw = {
    profissional_id: formData.get("profissional_id"),
    tipo:            formData.get("tipo"),
    valor:           formData.get("valor"),
    descricao:       formData.get("descricao"),
    data_movimento:  formData.get("data_movimento"),
  };

  const parsed = movimentoSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: MovimentoState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof z.infer<typeof movimentoSchema>;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Corrija os campos destacados.", fieldErrors };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const { error } = await supabase.from("movimentos_folha").insert({
    profissional_id: parsed.data.profissional_id,
    tipo:            parsed.data.tipo,
    valor:           parsed.data.valor,
    descricao:       parsed.data.descricao ?? null,
    data_movimento:  parsed.data.data_movimento,
    created_by:      user.id,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/folha-pagamento/${parsed.data.profissional_id}`);
  revalidatePath("/folha-pagamento");
  return { ok: true, message: "Movimento adicionado." };
}

export async function excluirMovimento(id: string, profissionalId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("movimentos_folha").delete().eq("id", id);
  revalidatePath(`/folha-pagamento/${profissionalId}`);
  revalidatePath("/folha-pagamento");
}
