"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  nome:              z.string().trim().min(2, "Nome muito curto").max(80, "Nome muito longo"),
  telefone_whatsapp: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\D/g, "") : v),
    z.string().regex(/^\d{10,11}$/, "Telefone inválido (DDD + número)").or(z.literal("")).optional(),
  ),
});

export type ConfigState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof schema>, string>>;
};

/**
 * Atualiza dados básicos do salão. O slug NÃO é editável por aqui —
 * mudá-lo quebraria links públicos já divulgados. RLS garante que
 * só o dono do salão atualiza.
 */
export async function atualizarSalao(
  _prev: ConfigState,
  formData: FormData,
): Promise<ConfigState> {
  const parsed = schema.safeParse({
    nome:              formData.get("nome"),
    telefone_whatsapp: formData.get("telefone_whatsapp"),
  });

  if (!parsed.success) {
    const fieldErrors: ConfigState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof z.infer<typeof schema>;
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

  const whatsapp = parsed.data.telefone_whatsapp;
  const { error } = await supabase
    .from("saloes")
    .update({
      nome:              parsed.data.nome,
      telefone_whatsapp: whatsapp && whatsapp !== "" ? whatsapp : null,
    })
    .eq("id", u.salao_id);

  if (error) {
    // RLS bloqueia quem não é dono
    return { ok: false, message: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/configuracoes");
  return { ok: true, message: "Dados do salão atualizados." };
}
