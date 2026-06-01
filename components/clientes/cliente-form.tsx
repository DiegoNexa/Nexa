"use client";

import { useActionState } from "react";
import { HoverButton } from "@/components/ui/hover-button";
import type { ClienteState } from "@/app/(app)/clientes/actions";

const initialState: ClienteState = { ok: false };

type ClienteFormProps = {
  action: (prev: ClienteState, formData: FormData) => Promise<ClienteState>;
  initial?: {
    nome?:            string;
    telefone?:        string | null;
    email?:           string | null;
    data_nascimento?: string | null;
    observacoes?:     string | null;
  };
  submitLabel?:  string;
  pendingLabel?: string;
};

export function ClienteForm({
  action,
  initial,
  submitLabel  = "Salvar cliente",
  pendingLabel = "Salvando...",
}: ClienteFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  const v = (k: keyof NonNullable<ClienteState["values"]>) => state.values?.[k] ?? "";

  const initNome      = v("nome")            || initial?.nome            || "";
  const initTelefone  = v("telefone")        || initial?.telefone        || "";
  const initEmail     = v("email")           || initial?.email           || "";
  const initNascto    = v("data_nascimento") || initial?.data_nascimento || "";
  const initObs       = v("observacoes")     || initial?.observacoes     || "";

  return (
    <form action={formAction} className="glass-card rounded-2xl p-6 sm:p-8 space-y-4" noValidate>
      <Field
        label="Nome completo"
        name="nome"
        placeholder="Ex: Maria Silva"
        defaultValue={initNome}
        error={state.fieldErrors?.nome}
        required
      />

      {/* WhatsApp — só dígitos, mesma lógica do cadastro */}
      <div>
        <label htmlFor="telefone" className="block text-sm font-medium text-on-surface mb-1.5">
          WhatsApp <span className="text-outline">(opcional)</span>
        </label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="(**) *****-****"
          defaultValue={initTelefone}
          maxLength={11}
          aria-invalid={state.fieldErrors?.telefone ? "true" : undefined}
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
            const t = e.currentTarget;
            const cleaned = t.value.replace(/\D/g, "").slice(0, 11);
            if (cleaned !== t.value) t.value = cleaned;
          }}
          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: state.fieldErrors?.telefone
              ? "1px solid var(--color-error)"
              : "1px solid rgba(255,255,255,0.1)",
          }}
        />
        {state.fieldErrors?.telefone && (
          <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
            {state.fieldErrors.telefone}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="E-mail"
          name="email"
          type="email"
          placeholder="cliente@email.com"
          defaultValue={initEmail}
          error={state.fieldErrors?.email}
          optional
        />

        <Field
          label="Nascimento"
          name="data_nascimento"
          type="date"
          defaultValue={initNascto}
          error={state.fieldErrors?.data_nascimento}
          optional
        />
      </div>

      {/* Observações — textarea */}
      <div>
        <label htmlFor="observacoes" className="block text-sm font-medium text-on-surface mb-1.5">
          Observações <span className="text-outline">(opcional)</span>
        </label>
        <textarea
          id="observacoes"
          name="observacoes"
          rows={3}
          placeholder="Preferências, alergias, anotações..."
          defaultValue={initObs}
          maxLength={500}
          aria-invalid={state.fieldErrors?.observacoes ? "true" : undefined}
          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant resize-none"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: state.fieldErrors?.observacoes
              ? "1px solid var(--color-error)"
              : "1px solid rgba(255,255,255,0.1)",
          }}
        />
        {state.fieldErrors?.observacoes && (
          <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
            {state.fieldErrors.observacoes}
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
        {isPending ? pendingLabel : submitLabel}
      </HoverButton>
    </form>
  );
}

/* ── Field ──────────────────────────────────────────────── */
type FieldProps = {
  label:        string;
  name:         string;
  type?:        string;
  placeholder?: string;
  defaultValue?: string;
  error?:       string;
  required?:    boolean;
  optional?:    boolean;
};

function Field({ label, name, type = "text", placeholder, defaultValue, error, required, optional }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-on-surface mb-1.5">
        {label}{optional && <span className="text-outline"> (opcional)</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={error ? "true" : undefined}
        className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: error
            ? "1px solid var(--color-error)"
            : "1px solid rgba(255,255,255,0.1)",
        }}
      />
      {error && (
        <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
