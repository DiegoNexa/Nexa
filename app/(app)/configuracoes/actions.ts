"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { criarCheckoutAssinatura, criarPortalCliente } from "@/lib/stripe";
import { isPlanoKey, isPeriodicidade, TRIAL_DIAS } from "@/lib/planos";

const schema = z.object({
  nome:              z.string().trim().min(2, "Nome muito curto").max(80, "Nome muito longo"),
  telefone_whatsapp: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\D/g, "") : v),
    z.string().regex(/^\d{10,11}$/, "Telefone inválido (DDD + número)").or(z.literal("")).optional(),
  ),
  // CPF (11) ou CNPJ (14). Não é exigido pela cobrança (a Stripe
  // coleta no checkout) — fica guardado para nota fiscal.
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

// ─── Assinatura (Stripe) ───────────────────────────────────
export type AssinaturaState = { ok: boolean; message?: string };

/**
 * Cria o checkout de assinatura e redireciona para a Stripe.
 * Só o dono do salão pode assinar. Em caso de sucesso não retorna —
 * o redirect leva o usuário para fora do app.
 */
export async function iniciarAssinatura(
  plano: string,
  _prev: AssinaturaState,
  formData: FormData,
): Promise<AssinaturaState> {
  if (!isPlanoKey(plano)) {
    return { ok: false, message: "Plano inválido." };
  }

  // Periodicidade vem de um input oculto — o seletor fica nos cards
  const periodoBruto = formData.get("periodo");
  const periodo =
    typeof periodoBruto === "string" && isPeriodicidade(periodoBruto)
      ? periodoBruto
      : "mensal";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const { data: u } = await supabase
    .from("usuarios")
    .select("salao_id, role, nome, email, saloes(assinatura_status, assinatura_id)")
    .eq("id", user.id)
    .maybeSingle<{
      salao_id: string; role: string; nome: string; email: string;
      saloes: { assinatura_status: string; assinatura_id: string | null } | null;
    }>();

  if (!u) return { ok: false, message: "Sua conta não está vinculada a um salão." };
  if (u.role !== "dono") {
    return { ok: false, message: "Apenas o dono do salão pode contratar um plano." };
  }

  const h    = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  if (!host) return { ok: false, message: "Não foi possível identificar o endereço do app." };
  const baseUrl = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;

  // Trial só na PRIMEIRA assinatura: salão ainda em trial e sem cartão
  // no Stripe. Quem reassina (trial vencido, cancelado, inadimplente)
  // ou já teve assinatura entra sem novo teste — evita trial repetido.
  const primeiraVez = u.saloes?.assinatura_status === "trial" && !u.saloes?.assinatura_id;

  const resultado = await criarCheckoutAssinatura({
    plano,
    periodo,
    salaoId:   u.salao_id,
    baseUrl,
    email:     u.email,   // pré-preenche o checkout da Stripe
    trialDias: primeiraVez ? TRIAL_DIAS : undefined,
  });

  if (!resultado.ok) {
    return { ok: false, message: resultado.error };
  }

  // Fora do try/catch: redirect() sinaliza via exceção
  redirect(resultado.url);
}

/**
 * Abre o portal de cobrança da Stripe, onde o próprio salão troca o
 * cartão, baixa faturas, muda de plano e cancela.
 *
 * Usada direto no `action` de um <form>, sem estado: em caso de erro
 * volta para a tela com `?portal=erro`, porque um redirect é a única
 * saída possível de uma action sem retorno.
 */
export async function abrirPortalCobranca(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: u } = await supabase
    .from("usuarios")
    .select("salao_id, role")
    .eq("id", user.id)
    .maybeSingle<{ salao_id: string; role: string }>();

  if (!u || u.role !== "dono") redirect("/configuracoes?portal=sem-permissao");

  const { data: salao } = await supabase
    .from("saloes")
    .select("assinatura_id")
    .eq("id", u.salao_id)
    .maybeSingle<{ assinatura_id: string | null }>();

  // Salão que nunca assinou não tem o que gerenciar
  if (!salao?.assinatura_id) redirect("/configuracoes?portal=sem-assinatura");

  const h    = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const baseUrl = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;

  const resultado = await criarPortalCliente({
    assinaturaId: salao.assinatura_id,
    baseUrl,
  });

  redirect(resultado.ok ? resultado.url : "/configuracoes?portal=erro");
}
