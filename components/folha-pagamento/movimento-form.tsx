"use client";

import { useActionState } from "react";
import { criarMovimento, type MovimentoState } from "@/app/(app)/folha-pagamento/actions";

const initialState: MovimentoState = { ok: false };

type Props = {
  profissionalId: string;
};

const TIPOS = [
  { value: "vale",          label: "Vale",          icon: "payments",        cor: "var(--color-error)"   },
  { value: "adiantamento",  label: "Adiantamento",  icon: "request_quote",   cor: "var(--color-error)"   },
  { value: "desconto",      label: "Desconto",      icon: "remove_circle",   cor: "var(--color-error)"   },
  { value: "bonus",         label: "Bônus",         icon: "star",            cor: "var(--color-primary)" },
] as const;

export function MovimentoForm({ profissionalId }: Props) {
  const [state, formAction, isPending] = useActionState(criarMovimento, initialState);

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <details className="glass-card rounded-2xl overflow-hidden">
      <summary className="px-5 py-4 cursor-pointer flex items-center gap-3 select-none list-none" style={{ listStyle: "none" }}>
        <span className="material-symbols-outlined text-primary" style={{ fontSize: "22px" }}>add_circle</span>
        <h3 className="font-semibold text-on-surface flex-1">Adicionar movimento</h3>
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "22px" }}>
          keyboard_arrow_down
        </span>
      </summary>

      <form action={formAction} className="px-5 pb-5 pt-1 border-t space-y-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <input type="hidden" name="profissional_id" value={profissionalId} />

        {/* Tipo — radio cards com feedback visual claro
            (border 2px dourada + glow quando checked) */}
        <div>
          <label className="block text-sm font-medium text-on-surface mb-2 mt-3">Tipo</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TIPOS.map((t, idx) => (
              <label
                key={t.value}
                className="cursor-pointer"
                htmlFor={`tipo-${t.value}`}
              >
                <input
                  id={`tipo-${t.value}`}
                  type="radio"
                  name="tipo"
                  value={t.value}
                  defaultChecked={idx === 0}
                  required
                  className="peer sr-only"
                />
                <div
                  className="
                    movimento-tipo-card
                    rounded-xl p-3 text-center
                    transition-all duration-200
                    bg-white/[0.04]
                    border-2 border-white/10
                    hover:border-white/25
                    peer-checked:!border-primary
                    peer-checked:bg-[rgba(200,153,51,0.12)]
                    peer-checked:shadow-[0_0_20px_rgba(200,153,51,0.25)]
                  "
                >
                  <span
                    className="material-symbols-outlined block mb-1"
                    style={{ fontSize: "20px", color: t.cor }}
                  >
                    {t.icon}
                  </span>
                  <span className="text-xs font-medium text-on-surface">{t.label}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Valor + Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="valor" className="block text-sm font-medium text-on-surface mb-1.5">
              Valor (R$)
            </label>
            <input
              id="valor"
              name="valor"
              type="text"
              inputMode="decimal"
              required
              aria-invalid={state.fieldErrors?.valor ? "true" : undefined}
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: state.fieldErrors?.valor
                  ? "1px solid var(--color-error)"
                  : "1px solid rgba(255,255,255,0.1)",
              }}
            />
            {state.fieldErrors?.valor && (
              <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
                {state.fieldErrors.valor}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="data_movimento" className="block text-sm font-medium text-on-surface mb-1.5">
              Data
            </label>
            <input
              id="data_movimento"
              name="data_movimento"
              type="date"
              defaultValue={hoje}
              required
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
          </div>
        </div>

        {/* Descrição opcional */}
        <div>
          <label htmlFor="descricao" className="block text-sm font-medium text-on-surface mb-1.5">
            Descrição <span className="text-outline">(opcional)</span>
          </label>
          <input
            id="descricao"
            name="descricao"
            type="text"
            maxLength={100}
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          />
        </div>

        {state.message && (
          <div
            role="alert"
            className="rounded-xl px-4 py-2 text-sm"
            style={{
              background: state.ok ? "rgba(200,153,51,0.08)" : "rgba(255, 180, 171, 0.08)",
              border:     state.ok ? "1px solid var(--color-primary)" : "1px solid var(--color-error)",
              color:      state.ok ? "var(--color-primary)" : "var(--color-error)",
            }}
          >
            {state.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all-custom disabled:opacity-70"
          style={{
            background: "linear-gradient(135deg,#E8D080,#C89933)",
            color: "#1D1A05",
          }}
        >
          {isPending ? "Adicionando..." : "Adicionar movimento"}
        </button>
      </form>
    </details>
  );
}
