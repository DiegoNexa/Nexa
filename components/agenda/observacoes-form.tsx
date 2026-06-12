"use client";

import { useActionState } from "react";
import { atualizarObservacoes, type EditarState } from "@/app/(app)/agenda/actions";

const initialState: EditarState = { ok: false };

type Props = {
  id:          string;
  observacoes: string | null;
};

export function ObservacoesForm({ id, observacoes }: Props) {
  const action = atualizarObservacoes.bind(null, id);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <textarea
        name="observacoes"
        rows={3}
        maxLength={500}
        placeholder="Anotações sobre este agendamento..."
        defaultValue={observacoes ?? ""}
        className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant resize-none"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      />

      {state.message && (
        <div
          role="alert"
          className="rounded-lg px-3 py-2 text-xs"
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
        className="px-3 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all-custom disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Salvar observações"}
      </button>
    </form>
  );
}
