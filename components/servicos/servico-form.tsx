"use client";

import { useActionState } from "react";
import { HoverButton } from "@/components/ui/hover-button";
import type { ServicoState } from "@/app/(app)/servicos/actions";

const initialState: ServicoState = { ok: false };

type ServicoFormProps = {
  /** Server Action — `(prev, formData) => Promise<ServicoState>` */
  action: (prev: ServicoState, formData: FormData) => Promise<ServicoState>;
  /** Valores iniciais (modo edição) */
  initial?: {
    nome?:            string;
    descricao?:       string | null;
    duracao_minutos?: number;
    preco?:           number;
  };
  /** Texto do botão de submit */
  submitLabel?: string;
  /** Texto durante o submit */
  pendingLabel?: string;
};

export function ServicoForm({
  action,
  initial,
  submitLabel  = "Salvar serviço",
  pendingLabel = "Salvando...",
}: ServicoFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  // Prioridade pros valores: preservados do erro > iniciais (edição) > vazio
  const v = (key: keyof NonNullable<ServicoState["values"]>) =>
    state.values?.[key] ?? "";

  const initNome      = v("nome")            || initial?.nome            || "";
  const initDescricao = v("descricao")       || initial?.descricao       || "";
  const initDuracao   = v("duracao_minutos") || initial?.duracao_minutos?.toString() || "";
  const initPreco     = v("preco")           || initial?.preco?.toString().replace(".", ",") || "";

  return (
    <form action={formAction} className="glass-card rounded-2xl p-6 sm:p-8 space-y-4" noValidate>
      <Field
        label="Nome do serviço"
        name="nome"
        placeholder="Ex: Corte feminino"
        defaultValue={initNome}
        error={state.fieldErrors?.nome}
      />

      <div>
        <label htmlFor="descricao" className="block text-sm font-medium text-on-surface mb-1.5">
          Descrição <span className="text-outline">(opcional)</span>
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          placeholder="Detalhes do serviço"
          defaultValue={initDescricao}
          maxLength={500}
          aria-invalid={state.fieldErrors?.descricao ? "true" : undefined}
          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant resize-none"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: state.fieldErrors?.descricao
              ? "1px solid var(--color-error)"
              : "1px solid rgba(255,255,255,0.1)",
          }}
        />
        {state.fieldErrors?.descricao && (
          <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
            {state.fieldErrors.descricao}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Duração (minutos)"
          name="duracao_minutos"
          type="number"
          inputMode="numeric"
          placeholder="60"
          defaultValue={initDuracao}
          error={state.fieldErrors?.duracao_minutos}
          min={5}
          max={480}
          step={5}
        />

        <Field
          label="Preço (R$)"
          name="preco"
          type="text"
          inputMode="decimal"
          placeholder="50,00"
          defaultValue={initPreco}
          error={state.fieldErrors?.preco}
        />
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
  inputMode?:   "text" | "numeric" | "decimal" | "email" | "tel";
  placeholder?: string;
  defaultValue?: string;
  error?:       string;
  min?:         number;
  max?:         number;
  step?:        number;
};

function Field({ label, name, type = "text", inputMode, placeholder, defaultValue, error, min, max, step }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-on-surface mb-1.5">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required
        min={min}
        max={max}
        step={step}
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
