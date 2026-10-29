"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarCheckoutAssinatura } from "@/lib/stripe";
import { TRIAL_DIAS } from "@/lib/planos";
import { mapSignupError } from "@/lib/auth-errors";

// Apenas dígitos. 10 = fixo (DDD + 8), 11 = celular (DDD + 9)
const PHONE_REGEX = /^\d{10,11}$/;

const signupSchema = z.object({
  nomeSalao:    z.string().trim().min(2, "Nome do salão muito curto").max(80),
  nomeUsuario:  z.string().trim().min(2, "Seu nome muito curto").max(100),
  email:        z.string().trim().toLowerCase().email("E-mail inválido"),
  whatsapp:     z.string().trim().regex(PHONE_REGEX, "WhatsApp inválido (informe DDD + número, somente dígitos)"),
  senha:        z.string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(72, "Senha muito longa")
    .regex(/[A-Za-z]/, "Senha deve conter ao menos uma letra")
    .regex(/[0-9]/, "Senha deve conter ao menos um número"),
  porte:        z.enum(["solo", "bairro", "consolidado"]),
  plano:        z.enum(["solo", "profissional", "premium"]),
});

export type SignupState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof signupSchema>, string>>;
  // Valores preservados para preencher de volta o form em caso de erro.
  // Senha é intencionalmente omitida — usuário sempre redigita.
  values?: {
    nomeSalao?:   string;
    nomeUsuario?: string;
    email?:       string;
    whatsapp?:    string;
    porte?:       string;
    plano?:       string;
  };
};

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function signupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const supabase = await createClient();

  // P0.b — Bloqueia signup quando já existe sessão autenticada.
  // Evita queimar tentativa no Auth do Supabase e protege contra
  // tomada de conta lateral (alguém logado tentando criar outra).
  const { data: { user: existingUser } } = await supabase.auth.getUser();
  if (existingUser) {
    return {
      ok: false,
      message: "Você já está autenticada. Saia da conta atual antes de criar outra.",
    };
  }

  const raw = {
    nomeSalao:   formData.get("nomeSalao"),
    nomeUsuario: formData.get("nomeUsuario"),
    email:       formData.get("email"),
    whatsapp:    formData.get("whatsapp"),
    senha:       formData.get("senha"),
    porte:       formData.get("porte"),
    plano:       formData.get("plano"),
  };

  // Valores que voltam pro form se algo der errado (sem a senha)
  const preservedValues: SignupState["values"] = {
    nomeSalao:   typeof raw.nomeSalao   === "string" ? raw.nomeSalao   : "",
    nomeUsuario: typeof raw.nomeUsuario === "string" ? raw.nomeUsuario : "",
    email:       typeof raw.email       === "string" ? raw.email       : "",
    whatsapp:    typeof raw.whatsapp    === "string" ? raw.whatsapp    : "",
    porte:       typeof raw.porte       === "string" ? raw.porte       : "",
    plano:       typeof raw.plano       === "string" ? raw.plano       : "",
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: SignupState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof z.infer<typeof signupSchema>;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      message: "Corrija os campos destacados.",
      fieldErrors,
      values: preservedValues,
    };
  }

  const data = parsed.data;

  // Slug gerado server-side com CSPRNG (crypto.randomUUID).
  // É passado via user_metadata e consumido pelo trigger SQL
  // handle_new_user (migration 003).
  const slugBase = slugify(data.nomeSalao);
  const suffix   = randomUUID().slice(0, 8);
  const slug     = slugBase ? `${slugBase}-${suffix}` : suffix;

  // Único call: o signUp dispara o trigger em auth.users que
  // cria o salão e o vínculo dentro da mesma transação.
  // Atômico: se o trigger falha, o signUp também faz rollback.
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email:    data.email,
    password: data.senha,
    options: {
      data: {
        nome:       data.nomeUsuario,
        nome_salao: data.nomeSalao,
        slug_salao: slug,
        telefone:   data.whatsapp,
        porte:      data.porte,
        plano:      data.plano,
      },
    },
  });

  if (signUpError) {
    return {
      ok: false,
      message: mapSignupError(signUpError),
      values: preservedValues,
    };
  }

  // Marca que o cadastro acabou de acontecer, para a página de
  // sucesso conseguir validar o acesso. Cookie HttpOnly, expira
  // em 1h (suficiente pra ler a mensagem e checar o e-mail).
  const cookieStore = await cookies();
  cookieStore.set("nexa_signup_pending", "1", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/cadastro/sucesso",
    maxAge:   60 * 60,
  });

  // Cartão antes do teste: manda direto para o checkout do Stripe já
  // com 30 dias de trial (R$ 0 hoje; cobra sozinho no fim). O trigger
  // criou o salão na mesma transação do signUp, então o salao_id já
  // existe — buscamos via admin (sem sessão ainda; e-mail por confirmar).
  //
  // Se qualquer passo falhar (Stripe fora do ar, etc.), cai no fallback
  // /cadastro/sucesso: a conta existe e o cartão é cobrado no 1º login,
  // quando o guarda de acesso leva o dono para /assinatura.
  let destino = "/cadastro/sucesso";

  const h    = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const baseUrl = host ? `${host.startsWith("localhost") ? "http" : "https"}://${host}` : "";
  const novoUserId = signUpData.user?.id;

  if (novoUserId && baseUrl) {
    try {
      const admin = createAdminClient();
      const { data: urow } = await admin
        .from("usuarios")
        .select("salao_id")
        .eq("id", novoUserId)
        .maybeSingle<{ salao_id: string }>();

      if (urow?.salao_id) {
        const checkout = await criarCheckoutAssinatura({
          plano:      data.plano,
          periodo:    "mensal",
          salaoId:    urow.salao_id,
          baseUrl,
          email:      data.email,
          trialDias:  TRIAL_DIAS,
          successUrl: `${baseUrl}/cadastro/sucesso?pago=1`,
          cancelUrl:  `${baseUrl}/cadastro/sucesso?cartao=pendente`,
        });
        if (checkout.ok) destino = checkout.url;
      }
    } catch {
      // mantém o fallback /cadastro/sucesso
    }
  }

  redirect(destino);
}
