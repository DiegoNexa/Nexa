"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapResetError } from "@/lib/auth-errors";

const schema = z
  .object({
    senha:    z.string()
      .min(8, "Senha deve ter no mínimo 8 caracteres")
      .max(72, "Senha muito longa")
      .regex(/[A-Za-z]/, "Senha deve conter ao menos uma letra")
      .regex(/[0-9]/, "Senha deve conter ao menos um número"),
    confirma: z.string(),
  })
  .refine((d) => d.senha === d.confirma, {
    message: "As senhas não coincidem",
    path:    ["confirma"],
  });

export type ResetState = {
  ok: boolean;
  message?: string;
  fieldErrors?: { senha?: string; confirma?: string };
};

export async function resetAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const supabase = await createClient();

  // Só roda se houver sessão ativa (chegou aqui via /auth/callback
  // após clicar no link de recuperação).
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      message: "Sessão expirada. Solicite um novo link de recuperação.",
    };
  }

  const parsed = schema.safeParse({
    senha:    formData.get("senha"),
    confirma: formData.get("confirma"),
  });

  if (!parsed.success) {
    const fieldErrors: ResetState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as "senha" | "confirma";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Corrija os campos destacados.", fieldErrors };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.senha });
  if (error) {
    return { ok: false, message: mapResetError(error) };
  }

  redirect("/dashboard");
}
