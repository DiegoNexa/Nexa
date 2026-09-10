"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapLoginError } from "@/lib/auth-errors";
import {
  loginBloqueado,
  registrarFalhaLogin,
  limparFalhasLogin,
} from "@/lib/rate-limit-login";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  senha: z.string().min(1, "Informe sua senha"),
});

export type LoginState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof loginSchema>, string>>;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const raw = {
    email: formData.get("email"),
    senha: formData.get("senha"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: LoginState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof z.infer<typeof loginSchema>;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Corrija os campos destacados.", fieldErrors };
  }

  const email = parsed.data.email;

  // Força bruta: barra antes de gastar uma chamada no Supabase Auth.
  // A mensagem não revela se a conta existe, então não reabre a
  // enumeração que mapLoginError fecha.
  if (await loginBloqueado(email)) {
    return {
      ok: false,
      message: "Muitas tentativas de login. Aguarde 15 minutos e tente novamente.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.senha,
  });

  if (error) {
    await registrarFalhaLogin(email);
    return { ok: false, message: mapLoginError(error) };
  }

  // Quem acertou a senha não carrega histórico de falhas
  await limparFalhasLogin(email);

  redirect("/dashboard");
}
