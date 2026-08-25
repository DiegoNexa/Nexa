"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { criarCheckoutAssinatura } from "@/lib/abacatepay";
import { isPlanoKey } from "@/lib/planos";

const schema = z.object({
  nome:              z.string().trim().min(2, "Nome muito curto").max(80, "Nome muito longo"),
  telefone_whatsapp: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\D/g, "") : v),
    z.string().regex(/^\d{10,11}$/, "Telefone inválido (DDD + número)").or(z.literal("")).optional(),
  ),
  // CPF (11) ou CNPJ (14) — exigido pelo AbacatePay para emitir a cobrança
  documento: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\D/g, "") : v),
    z.string().regex(/^(\d{11}|\d{14})$/, "Informe um CPF (11) ou CNPJ (14 dígitos)").or(z.literal("")).optional(),
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
    documento:         formData.get("documento"),
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
  const doc      = parsed.data.documento;
  const { error } = await supabase
    .from("saloes")
    .update({
      nome:              parsed.data.nome,
      telefone_whatsapp: whatsapp && whatsapp !== "" ? whatsapp : null,
      documento:         doc && doc !== "" ? doc : null,
    })
    .eq("id", u.salao_id);

  if (error) {
    // RLS bloqueia quem não é dono
    return { ok: false, message: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/configuracoes");
  return { ok: true, message: "Dados do salão atualizados." };
}

// ─── Assinatura (AbacatePay) ───────────────────────────────
export type AssinaturaState = { ok: boolean; message?: string };

/**
 * Cria o checkout de assinatura e redireciona para o AbacatePay.
 * Só o dono do salão pode assinar. Em caso de sucesso não retorna —
 * o redirect leva o usuário para fora do app.
 */
export async function iniciarAssinatura(
  plano: string,
  _prev: AssinaturaState,
): Promise<AssinaturaState> {
  if (!isPlanoKey(plano)) {
    return { ok: false, message: "Plano inválido." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const { data: u } = await supabase
    .from("usuarios")
    .select("salao_id, role, nome, email")
    .eq("id", user.id)
    .maybeSingle<{ salao_id: string; role: string; nome: string; email: string }>();

  if (!u) return { ok: false, message: "Sua conta não está vinculada a um salão." };
  if (u.role !== "dono") {
    return { ok: false, message: "Apenas o dono do salão pode contratar um plano." };
  }

  // O AbacatePay exige documento e telefone do pagador para emitir a
  // cobrança. Se faltarem, avisamos onde preencher em vez de deixar a
  // API devolver um erro técnico.
  const { data: salao } = await supabase
    .from("saloes")
    .select("documento, telefone_whatsapp")
    .eq("id", u.salao_id)
    .maybeSingle<{ documento: string | null; telefone_whatsapp: string | null }>();

  const documento = salao?.documento ?? "";
  const telefone  = salao?.telefone_whatsapp ?? "";

  if (!documento || !telefone) {
    const faltando = [!documento && "CPF/CNPJ", !telefone && "WhatsApp"]
      .filter(Boolean)
      .join(" e ");
    return {
      ok: false,
      message: `Preencha ${faltando} em Dados do salão (acima) antes de assinar.`,
    };
  }

  const h    = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  if (!host) return { ok: false, message: "Não foi possível identificar o endereço do app." };
  const baseUrl = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;

  const resultado = await criarCheckoutAssinatura({
    plano,
    salaoId: u.salao_id,
    baseUrl,
    cliente: {
      nome:      u.nome,
      email:     u.email,
      telefone,
      documento,
    },
  });

  if (!resultado.ok) {
    return { ok: false, message: resultado.error };
  }

  // Fora do try/catch: redirect() sinaliza via exceção
  redirect(resultado.url);
}
