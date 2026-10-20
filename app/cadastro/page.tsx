"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { HoverButton } from "@/components/ui/hover-button";
import { signupAction, type SignupState } from "./actions";
import { PLANOS_LISTA, isPlanoKey } from "@/lib/planos";

const initialState: SignupState = { ok: false };

const portes = [
  { value: "solo",         label: "Sozinha/o (1 profissional)"     },
  { value: "bairro",       label: "Salão de bairro (2 a 5)"        },
  { value: "consolidado",  label: "Salão consolidado (6 ou mais)"  },
] as const;

function CadastroForm() {
  const [state, formAction, isPending] = useActionState(signupAction, initialState);

  // Plano pré-selecionado pelo link da landing (?plano=...) ou, na
  // volta de um erro, o que o usuário já havia escolhido. Default:
  // o plano em destaque.
  const params    = useSearchParams();
  const planoUrl  = params.get("plano");
  const planoInicial =
    (state.values?.plano && isPlanoKey(state.values.plano) && state.values.plano) ||
    (planoUrl && isPlanoKey(planoUrl) && planoUrl) ||
    PLANOS_LISTA.find(p => p.destaque)?.key ||
    "profissional";

  return (
    <div className="min-h-screen relative">
      {/* Aurora background — mesma da landing */}
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
          href="/login"
          className="text-sm text-on-surface-variant hover:text-on-surface transition-all-custom"
        >
          Já tenho conta
        </a>
      </header>

      {/* Form */}
      <main className="px-4 md:px-8 py-10 md:py-16">
        <div className="max-w-xl mx-auto">
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
              Comece grátis
            </p>
            <h1
              className="text-3xl md:text-4xl font-bold text-on-surface mb-3"
              style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
            >
              Cadastre seu salão
            </h1>
            <p className="text-base text-on-surface-variant">
              30 dias grátis · Sem cartão de crédito · Setup em 2 minutos
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Nome do salão"
                name="nomeSalao"
                placeholder="Nome do salão"
                error={state.fieldErrors?.nomeSalao}
                defaultValue={state.values?.nomeSalao}
              />
              <Field
                label="Seu nome"
                name="nomeUsuario"
                placeholder="Nome completo"
                error={state.fieldErrors?.nomeUsuario}
                defaultValue={state.values?.nomeUsuario}
              />
            </div>

            <Field
              label="E-mail"
              name="email"
              type="email"
              placeholder="seu@email.com.br"
              error={state.fieldErrors?.email}
              defaultValue={state.values?.email}
            />

            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-on-surface mb-1.5">
                WhatsApp do salão
              </label>
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="(**) *****-****"
                required
                maxLength={11}
                defaultValue={state.values?.whatsapp}
                aria-invalid={state.fieldErrors?.whatsapp ? "true" : undefined}
                aria-describedby={state.fieldErrors?.whatsapp ? "whatsapp-error" : undefined}
                onBeforeInput={(e) => {
                  const data = (e as unknown as InputEvent).data;
                  if (data && !/^\d+$/.test(data)) e.preventDefault();
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const text = e.clipboardData.getData("text").replace(/\D/g, "");
                  const target = e.currentTarget;
                  const room = 11 - target.value.length;
                  target.setRangeText(text.slice(0, Math.max(0, room)), target.selectionStart ?? 0, target.selectionEnd ?? 0, "end");
                }}
                onInput={(e) => {
                  // Safety net: caso algo passe (drag-and-drop, autofill, etc.)
                  const target = e.currentTarget;
                  const cleaned = target.value.replace(/\D/g, "").slice(0, 11);
                  if (cleaned !== target.value) target.value = cleaned;
                }}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: state.fieldErrors?.whatsapp
                    ? "1px solid var(--color-error)"
                    : "1px solid rgba(255,255,255,0.1)",
                }}
              />
              {state.fieldErrors?.whatsapp && (
                <p id="whatsapp-error" className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
                  {state.fieldErrors.whatsapp}
                </p>
              )}
            </div>

            <Field
              label="Senha"
              name="senha"
              type="password"
              placeholder="Mínimo 8 caracteres"
              error={state.fieldErrors?.senha}
            />

            <div>
              <label htmlFor="porte" className="block text-sm font-medium text-on-surface mb-1.5">
                Tamanho do salão
              </label>
              <div className="relative">
                <select
                  id="porte"
                  name="porte"
                  required
                  defaultValue={state.values?.porte ?? ""}
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom appearance-none text-on-surface"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: state.fieldErrors?.porte
                      ? "1px solid var(--color-error)"
                      : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <option value="" disabled style={{ color: "#000", background: "#fff" }}>
                    Selecione...
                  </option>
                  {portes.map(p => (
                    <option
                      key={p.value}
                      value={p.value}
                      style={{ color: "#000", background: "#fff" }}
                    >
                      {p.label}
                    </option>
                  ))}
                </select>
                <span
                  className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant"
                  style={{ fontSize: "20px" }}
                >
                  expand_more
                </span>
              </div>
              {state.fieldErrors?.porte && (
                <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
                  {state.fieldErrors.porte}
                </p>
              )}
            </div>

            {/* Plano para testar — libera só os recursos do plano
                escolhido durante os 30 dias grátis. */}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">
                Plano para testar grátis por 30 dias
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PLANOS_LISTA.map(p => (
                  <label
                    key={p.key}
                    className="relative flex flex-col rounded-xl p-3 cursor-pointer transition-all-custom has-[:checked]:border-primary"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <input
                      type="radio"
                      name="plano"
                      value={p.key}
                      defaultChecked={p.key === planoInicial}
                      className="peer sr-only"
                    />
                    <span className="absolute top-2 right-2 opacity-0 peer-checked:opacity-100 text-primary material-symbols-outlined" style={{ fontSize: "16px" }}>
                      check_circle
                    </span>
                    <span className="text-sm font-bold text-on-surface">{p.nome}</span>
                    <span className="text-xs text-on-surface-variant">R$ {p.precoMensal}/mês</span>
                    <span className="text-[11px] text-on-surface-variant mt-1">{p.profissionais}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant mt-1.5">
                Sem cobrança agora. Você só paga se continuar depois do teste.
              </p>
              {state.fieldErrors?.plano && (
                <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
                  {state.fieldErrors.plano}
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

            <HoverButton type="submit" disabled={isPending} className="w-full">
              {isPending ? "Criando sua conta..." : "Criar minha conta grátis"}
            </HoverButton>

            <p className="text-center text-xs text-outline">
              Ao se cadastrar, você concorda com nossos{" "}
              <a href="/termos" className="text-primary hover:underline">Termos de Uso</a> e{" "}
              <a href="/privacidade" className="text-primary hover:underline">Política de Privacidade</a>.
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
  error?: string;
  defaultValue?: string;
};

function Field({ label, name, type = "text", placeholder, error, defaultValue }: FieldProps) {
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
        defaultValue={defaultValue}
        autoComplete={
          type === "email"    ? "email" :
          type === "password" ? "new-password" :
          type === "tel"      ? "tel" :
          "off"
        }
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

export default function CadastroPage() {
  return (
    <Suspense fallback={null}>
      <CadastroForm />
    </Suspense>
  );
}
