"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
});

export type RecoverState = {
  ok: boolean;
  message?: string;
  fieldError?: string;
};

// Allowlist explícita de hosts para onde podemos enviar links de
// recuperação. Defesa contra Host header injection: se um proxy
// mal configurado deixar x-forwarded-host ser controlado pelo
// atacante, o link de reset não pode ir parar num domínio
// arbitrário.
const ALLOWED_HOSTS = new Set([
  "localhost:3000",
  "nexa-project2026.vercel.app",   // produção atual
  "nexa.com.br",                   // domínio próprio (quando existir)
  "www.nexa.com.br",
]);
// Precisa apontar para um host que realmente responde: com um domínio
// ainda não registrado como fallback, todo link de recuperação vindo de
// um host desconhecido levaria a lugar nenhum.
const FALLBACK_HOST = "nexa-project2026.vercel.app";

export async function recoverAction(
  _prev: RecoverState,
  formData: FormData,
): Promise<RecoverState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      ok: false,
      fieldError: parsed.error.issues[0]?.message ?? "E-mail inválido",
    };
  }

  const supabase = await createClient();

  // Verifica o host contra allowlist. Se não bate, usa o domínio
  // de produção como fallback seguro.
  const h = await headers();
  const requested = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const host  = ALLOWED_HOSTS.has(requested) ? requested : FALLBACK_HOST;
  const proto = host.startsWith("localhost") ? "http" : "https";
  const redirectTo = `${proto}://${host}/auth/callback?next=/redefinir-senha`;

  // Não revelamos se o e-mail existe — sempre mostramos a mesma
  // resposta. Mitiga enumeração de contas.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });

  return {
    ok: true,
    message: "Se o e-mail existir em nossa base, enviamos um link de recuperação. Verifique sua caixa de entrada.",
  };
}
