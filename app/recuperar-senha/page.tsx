"use client";

import { useActionState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { HoverButton } from "@/components/ui/hover-button";
import { recoverAction, type RecoverState } from "./actions";

const initialState: RecoverState = { ok: false };

export default function RecuperarSenhaPage() {
  const [state, formAction, isPending] = useActionState(recoverAction, initialState);

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-30 animate-aurora"
          style={{ background: "var(--color-primary-container)", top: "-200px", left: "-200px" }}
        />
      </div>

      <header className="w-full px-4 md:px-8 lg:px-16 py-5 flex items-center justify-between">
        <a href="/" className="flex items-center" aria-label="Voltar para a home">
          <Image src="/logo.png" alt="Nexa" width={480} height={519} className="h-9 w-auto block" priority />
        </a>
        <a
          href="/login"
          className="text-sm text-on-surface-variant hover:text-on-surface transition-all-custom"
        >
          Voltar ao login
        </a>
      </header>

      <main className="px-4 md:px-8 py-10 md:py-20 flex items-center justify-center">
        <div className="max-w-md w-full">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 110, damping: 20 }}
            className="text-center mb-8"
          >
            <p
              className="text-xs font-medium tracking-widest text-primary uppercase mb-3"
              style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
            >
              Recuperação
            </p>
            <h1
              className="text-3xl md:text-4xl font-bold text-on-surface mb-3"
              style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
            >
              Esqueceu a senha?
            </h1>
            <p className="text-base text-on-surface-variant">
              Informe seu e-mail e enviaremos um link para criar uma nova senha.
            </p>
          </motion.div>

          {state.ok ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 110, damping: 20 }}
              className="glass-card rounded-2xl p-6 sm:p-8 text-center"
            >
              <span
                className="material-symbols-outlined text-primary block mx-auto mb-4"
                style={{ fontSize: "56px" }}
              >
                mark_email_read
              </span>
              <p className="text-on-surface mb-6">{state.message}</p>
              <a href="/login" className="text-primary hover:underline text-sm font-medium">
                Voltar ao login
              </a>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 110, damping: 20, delay: 0.1 }}
              action={formAction}
              className="glass-card rounded-2xl p-6 sm:p-8 space-y-4"
              noValidate
            >
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-on-surface mb-1.5">
                  E-mail da conta
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com.br"
                  required
                  autoComplete="email"
                  aria-invalid={state.fieldError ? "true" : undefined}
                  aria-describedby={state.fieldError ? "email-error" : undefined}
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: state.fieldError
                      ? "1px solid var(--color-error)"
                      : "1px solid rgba(255,255,255,0.1)",
                  }}
                />
                {state.fieldError && (
                  <p id="email-error" className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
                    {state.fieldError}
                  </p>
                )}
              </div>

              <HoverButton type="submit" disabled={isPending} className="w-full">
                {isPending ? "Enviando..." : "Enviar link de recuperação"}
              </HoverButton>

              <p className="text-center text-sm text-on-surface-variant">
                Lembrou a senha?{" "}
                <a href="/login" className="text-primary hover:underline font-medium">
                  Entrar
                </a>
              </p>
            </motion.form>
          )}
        </div>
      </main>
    </div>
  );
}
