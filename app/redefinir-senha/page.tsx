"use client";

import { useActionState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { HoverButton } from "@/components/ui/hover-button";
import { resetAction, type ResetState } from "./actions";

const initialState: ResetState = { ok: false };

export default function RedefinirSenhaPage() {
  const [state, formAction, isPending] = useActionState(resetAction, initialState);

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
              Nova senha
            </p>
            <h1
              className="text-3xl md:text-4xl font-bold text-on-surface mb-3"
              style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
            >
              Crie uma nova senha
            </h1>
            <p className="text-base text-on-surface-variant">
              Mínimo 8 caracteres, com letras e números.
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
              label="Nova senha"
              name="senha"
              type="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              error={state.fieldErrors?.senha}
            />

            <Field
              label="Confirme a nova senha"
              name="confirma"
              type="password"
              placeholder="Digite novamente"
              autoComplete="new-password"
              error={state.fieldErrors?.confirma}
            />

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

            <HoverButton type="submit" disabled={isPending} className="w-full">
              {isPending ? "Salvando..." : "Salvar nova senha"}
            </HoverButton>
          </motion.form>
        </div>
      </main>
    </div>
  );
}

/* ── Field ──────────────────────────────────────────────── */
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
