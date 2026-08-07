"use client";

import { useActionState, useEffect, useRef } from "react";
import { criarDespesa, type DespesaState } from "@/app/(app)/financeiro/actions";
import { CATEGORIA_LABEL, type CategoriaDespesa } from "@/lib/financeiro";

const initialState: DespesaState = { ok: false };

const CATEGORIAS = Object.keys(CATEGORIA_LABEL) as CategoriaDespesa[];

/** Data de hoje em YYYY-MM-DD (horário local) */
function hojeISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function DespesaForm() {
  const [state, formAction, isPending] = useActionState(criarDespesa, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Limpa o form após sucesso
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3" noValidate>
      <div>
        <input
          name="descricao"
          type="text"
          required
          maxLength={120}
          placeholder="Descrição"
          aria-invalid={state.fieldErrors?.descricao ? "true" : undefined}
          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: state.fieldErrors?.descricao ? "1px solid var(--color-error)" : "1px solid rgba(255,255,255,0.1)",
          }}
        />
        {state.fieldErrors?.descricao && (
          <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>{state.fieldErrors.descricao}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Categoria */}
        <div className="relative">
          <select
            name="categoria"
            defaultValue="outros"
            className="w-full appearance-none px-4 py-3 pr-10 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c} style={{ color: "#000", background: "#fff" }}>
                {CATEGORIA_LABEL[c]}
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

        {/* Valor */}
        <div>
          <input
            name="valor"
            type="text"
            inputMode="decimal"
            required
            placeholder="Valor (R$)"
            aria-invalid={state.fieldErrors?.valor ? "true" : undefined}
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: state.fieldErrors?.valor ? "1px solid var(--color-error)" : "1px solid rgba(255,255,255,0.1)",
            }}
          />
        </div>

        {/* Data */}
        <div>
          <input
            name="data_despesa"
            type="date"
            required
            defaultValue={hojeISO()}
            aria-invalid={state.fieldErrors?.data_despesa ? "true" : undefined}
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: state.fieldErrors?.data_despesa ? "1px solid var(--color-error)" : "1px solid rgba(255,255,255,0.1)",
            }}
          />
        </div>
      </div>

      {/* Repetição */}
      <div className="relative">
        <select
          name="repeticao"
          defaultValue="nao"
          className="w-full appearance-none px-4 py-3 pr-10 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <option value="nao"     style={{ color: "#000", background: "#fff" }}>Não repete (única)</option>
          <option value="mensal"  style={{ color: "#000", background: "#fff" }}>Repete todo mês (fixa)</option>
          <option value="semanal" style={{ color: "#000", background: "#fff" }}>Repete toda semana (fixa)</option>
        </select>
        <span
          className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant"
          style={{ fontSize: "20px" }}
        >
          repeat
        </span>
      </div>
      <p className="text-[11px] text-on-surface-variant -mt-1">
        Fixas (aluguel, contas) usam o dia/dia-da-semana da data acima e aparecem automaticamente todo período.
      </p>

      {(state.fieldErrors?.valor || state.fieldErrors?.data_despesa) && (
        <p className="text-xs" style={{ color: "var(--color-error)" }}>
          {state.fieldErrors?.valor ?? state.fieldErrors?.data_despesa}
        </p>
      )}

      {state.message && (
        <div
          role="alert"
          className="rounded-xl px-4 py-2.5 text-sm"
          style={{
            background: state.ok ? "rgba(52,211,153,0.10)" : "rgba(255,180,171,0.08)",
            border:     state.ok ? "1px solid #34D399" : "1px solid var(--color-error)",
            color:      state.ok ? "#34D399" : "var(--color-error)",
          }}
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all-custom disabled:opacity-50"
        style={{ background: "linear-gradient(135deg,#E8D080,#C89933)", color: "#1D1A05" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
        {isPending ? "Registrando..." : "Registrar despesa"}
      </button>
    </form>
  );
}
