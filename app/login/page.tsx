"use client";

import { useActionState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { GoldBorderButton } from "@/components/ui/gold-border-button";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { ok: false };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <div className="min-h-screen relative">
      {/* Aurora background */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-30 animate-aurora"
          style={{ background: "var(--color-primary-container)", top: "-200px", left: "-200px" }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 animate-aurora"
          style={{ background: "var(--color-secondary-container)", bottom: "-200px", right: "-200px", animationDelay: "-7.5s" }}
        />
      </div>

      {/* Header */}
      <header className="w-full px-4 md:px-8 lg:px-16 py-5 flex items-center justify-between">
        <a href="/" className="flex items-center" aria-label="Voltar para a home">
          <Image src="/logo.png" alt="Nexa" width={480} height={519} className="h-9 w-auto block" priority />
        </a>
        <a
          href="/cadastro"
          className="text-sm text-on-surface-variant hover:text-on-surface transition-all-custom"
        >
          Criar conta
        </a>
      </header>

      {/* Form */}
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
              Bem-vindo de volta
            </p>
            <h1
              className="text-3xl md:text-4xl font-bold text-on-surface mb-3"
              style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
            >
              Entrar na Nexa
            </h1>
            <p className="text-base text-on-surface-variant">
              Acesse o painel do seu salão
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 110, damping: 20, delay: 0.1 }}
            action={formAction}
            className="glass-card rounded-2xl p-6 sm:p-8 space-y-4"
            noValidate
          >
            <Field
              label="E-mail"
              name="email"
              type="email"
              placeholder="seu@email.com.br"
              autoComplete="email"
              error={state.fieldErrors?.email}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="senha" className="block text-sm font-medium text-on-surface">
                  Senha
                </label>
                <a href="/recuperar-senha" className="text-xs text-primary hover:underline">
                  Esqueci a senha
                </a>
              </div>
              <input
                id="senha"
                name="senha"
                type="password"
                placeholder="Sua senha"
                required
                autoComplete="current-password"
                aria-invalid={state.fieldErrors?.senha ? "true" : undefined}
                aria-describedby={state.fieldErrors?.senha ? "senha-error" : undefined}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: state.fieldErrors?.senha
                    ? "1px solid var(--color-error)"
                    : "1px solid rgba(255,255,255,0.1)",
                }}
              />
              {state.fieldErrors?.senha && (
                <p id="senha-error" className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
                  {state.fieldErrors.senha}
                </p>
              )}
            </div>

            {state.message && !state.fieldErrors && (
              <div
                role="alert"
                className="rounded-xl px-4 py-3 text-sm"
                style={{
                  background: "rgba(255, 180, 171, 0.08)",
                  border: "1px solid var(--color-error)",
                  color: "var(--color-error)",
                }}
              >
                {state.message}
              </div>
            )}

            <GoldBorderButton type="submit" className="w-full py-4 text-base font-bold">
              {isPending ? "Entrando..." : "Entrar"}
            </GoldBorderButton>

            <p className="text-center text-sm text-on-surface-variant">
              Ainda não tem conta?{" "}
              <a href="/cadastro" className="text-primary hover:underline font-medium">
                Cadastre-se grátis
              </a>
            </p>
          </motion.form>
        </div>
      </main>
    </div>
  );
}

/* ── Field component ─────────────────────────────────────── */
type FieldProps = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
};

function Field({ label, name, type = "text", placeholder, autoComplete, error }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-on-surface mb-1.5">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required
        autoComplete={autoComplete}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: error
            ? "1px solid var(--color-error)"
            : "1px solid rgba(255,255,255,0.1)",
        }}
      />
      {error && (
        <p id={`${name}-error`} className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
