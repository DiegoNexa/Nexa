"use client";

import { useActionState } from "react";
import { excluirProfissional, type DeleteProfissionalState } from "@/app/(app)/profissionais/actions";

const initialState: DeleteProfissionalState = { ok: false };

type Props = {
  id:   string;
  nome: string;
};

export function DeleteProfissionalButton({ id, nome }: Props) {
  const action = excluirProfissional.bind(null, id);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <div
      className="glass-card rounded-2xl p-5 md:p-6 mt-6 border-2"
      style={{ borderColor: "rgba(255, 180, 171, 0.2)" }}
    >
      <div className="flex items-start gap-3 mb-4">
        <span
          className="material-symbols-outlined flex-shrink-0"
          style={{ color: "var(--color-error)", fontSize: "24px" }}
        >
          warning
        </span>
        <div>
          <h3 className="font-bold text-on-surface mb-1">Zona de risco</h3>
          <p className="text-sm text-on-surface-variant">
            A exclusão é definitiva e não pode ser desfeita. Se o profissional tem histórico de agendamentos, prefira <strong className="text-on-surface">desativar</strong> (botão de olho na lista) para manter o registro.
          </p>
        </div>
      </div>

      {state.message && (
        <div
          role="alert"
          className="rounded-xl px-4 py-3 text-sm mb-3"
          style={{
            background: "rgba(255, 180, 171, 0.08)",
            border: "1px solid var(--color-error)",
            color: "var(--color-error)",
          }}
        >
          {state.message}
        </div>
      )}

      <form action={formAction}>
        <button
          type="submit"
          disabled={isPending}
          onClick={(e) => {
            if (!confirm(`Excluir ${nome} definitivamente? Esta ação não pode ser desfeita.`)) {
              e.preventDefault();
            }
          }}
          className="w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all-custom disabled:opacity-70 disabled:cursor-not-allowed"
          style={{
            background: "rgba(255, 180, 171, 0.08)",
            border: "1px solid var(--color-error)",
            color: "var(--color-error)",
          }}
        >
          {isPending ? "Excluindo..." : "Excluir profissional definitivamente"}
        </button>
      </form>
    </div>
  );
}
