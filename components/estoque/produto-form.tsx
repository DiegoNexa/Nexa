"use client";

import { useActionState } from "react";
import { HoverButton } from "@/components/ui/hover-button";
import type { ProdutoState } from "@/app/(app)/estoque/actions";

const initialState: ProdutoState = { ok: false };

type ProdutoFormProps = {
  /** Server Action — `(prev, formData) => Promise<ProdutoState>` */
  action: (prev: ProdutoState, formData: FormData) => Promise<ProdutoState>;
  /** Valores iniciais (modo edição) */
  initial?: {
    nome?:              string;
    descricao?:         string | null;
    unidade?:           string;
    quantidade?:        number;
    quantidade_minima?: number;
    preco_custo?:       number | null;
  };
  /** Em edição, o saldo é gerenciado por movimentos — não editável aqui */
  modoEdicao?: boolean;
  submitLabel?: string;
  pendingLabel?: string;
};

export function ProdutoForm({
  action,
  initial,
  modoEdicao = false,
  submitLabel  = "Salvar produto",
  pendingLabel = "Salvando...",
}: ProdutoFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  const v = (key: keyof NonNullable<ProdutoState["values"]>) =>
    state.values?.[key] ?? "";

  const initNome     = v("nome")              || initial?.nome     || "";
  const initDescricao= v("descricao")         || initial?.descricao|| "";
  const initUnidade  = v("unidade")           || initial?.unidade  || "un";
  const initQtd      = v("quantidade")        || initial?.quantidade?.toString().replace(".", ",") || "";
  const initMin      = v("quantidade_minima") || initial?.quantidade_minima?.toString().replace(".", ",") || "";
  const initCusto    = v("preco_custo")       || initial?.preco_custo?.toString().replace(".", ",") || "";

  return (
    <form action={formAction} className="glass-card rounded-2xl p-6 sm:p-8 space-y-4" noValidate>
      <Field
        label="Nome do produto"
        name="nome"
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
          rows={2}
          placeholder="Marca, fornecedor, detalhes"
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
        {/* Quantidade inicial só no cadastro. Em edição, saldo vem de movimentos. */}
        {!modoEdicao && (
          <Field
            label="Quantidade inicial"
            name="quantidade"
            type="text"
            inputMode="decimal"
            defaultValue={initQtd}
            error={state.fieldErrors?.quantidade}
          />
        )}

        <Field
          label="Unidade"
          name="unidade"
          placeholder="un, ml, g, L..."
          defaultValue={initUnidade}
          error={state.fieldErrors?.unidade}
          maxLength={10}
        />

        <Field
          label="Estoque mínimo (alerta)"
          name="quantidade_minima"
          type="text"
          inputMode="decimal"
          defaultValue={initMin}
          error={state.fieldErrors?.quantidade_minima}
        />

        <Field
          label="Custo unitário (R$)"
          name="preco_custo"
          type="text"
          inputMode="decimal"
          placeholder="Opcional"
          defaultValue={initCusto}
          error={state.fieldErrors?.preco_custo}
          required={false}
        />
      </div>

      {modoEdicao && (
        <p className="text-xs text-on-surface-variant">
          O saldo atual é controlado pelas entradas e saídas. Use os botões de movimentação abaixo.
        </p>
      )}

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
  maxLength?:   number;
  required?:    boolean;
};

function Field({ label, name, type = "text", inputMode, placeholder, defaultValue, error, maxLength, required = true }: FieldProps) {
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
        required={required}
        maxLength={maxLength}
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
