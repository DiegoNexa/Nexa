"use client";

import { useActionState, useState } from "react";
import { registrarMovimento, type MovimentoState } from "@/app/(app)/estoque/actions";

const initialState: MovimentoState = { ok: false };

export function MovimentoForm({ produtoId, unidade }: { produtoId: string; unidade: string }) {
  const action = registrarMovimento.bind(null, produtoId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");

  return (
    <form action={formAction} className="space-y-3" noValidate>
      {/* Toggle entrada/saída */}
      <input type="hidden" name="tipo" value={tipo} />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTipo("entrada")}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all-custom border"
          style={{
            background: tipo === "entrada" ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.04)",
            color:      tipo === "entrada" ? "#34D399" : "var(--color-on-surface-variant)",
            borderColor: tipo === "entrada" ? "#34D399" : "rgba(255,255,255,0.08)",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
          Entrada
        </button>
        <button
          type="button"
          onClick={() => setTipo("saida")}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all-custom border"
          style={{
            background: tipo === "saida" ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.04)",
            color:      tipo === "saida" ? "#EF4444" : "var(--color-on-surface-variant)",
            borderColor: tipo === "saida" ? "#EF4444" : "rgba(255,255,255,0.08)",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>remove</span>
          Saída
        </button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            name="quantidade"
            type="text"
            inputMode="decimal"
            required
            placeholder="Quantidade"
            className="w-full px-4 py-3 pr-12 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant pointer-events-none">
            {unidade}
          </span>
        </div>
      </div>

      <input
        name="motivo"
        type="text"
        maxLength={200}
        placeholder="Motivo (opcional)"
        className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
      />

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
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
          {tipo === "entrada" ? "input" : "output"}
        </span>
        {isPending ? "Registrando..." : "Registrar movimento"}
      </button>
    </form>
  );
}
