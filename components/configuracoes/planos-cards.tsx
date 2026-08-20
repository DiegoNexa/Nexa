"use client";

import { useActionState } from "react";
import { iniciarAssinatura, type AssinaturaState } from "@/app/(app)/configuracoes/actions";
import { PLANOS_LISTA, type Plano, type PlanoSalao } from "@/lib/planos";

const initialState: AssinaturaState = { ok: false };

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Props = {
  planoAtual: PlanoSalao;
  assinaturaAtiva: boolean;
  podeAssinar: boolean;   // só o dono
};

export function PlanosCards({ planoAtual, assinaturaAtiva, podeAssinar }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {PLANOS_LISTA.map((p) => (
        <PlanoCard
          key={p.key}
          plano={p}
          atual={assinaturaAtiva && planoAtual === p.key}
          podeAssinar={podeAssinar}
        />
      ))}
    </div>
  );
}

function PlanoCard({
  plano, atual, podeAssinar,
}: {
  plano: Plano; atual: boolean; podeAssinar: boolean;
}) {
  const action = iniciarAssinatura.bind(null, plano.key);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <div
      className="rounded-2xl p-4 flex flex-col"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: atual
          ? "1px solid var(--color-primary)"
          : plano.destaque
            ? "1px solid rgba(200,153,51,0.3)"
            : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-on-surface">{plano.nome}</h3>
        {atual ? (
          <span
            className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
            style={{ background: "rgba(200,153,51,0.15)", color: "var(--color-primary)" }}
          >
            atual
          </span>
        ) : plano.destaque ? (
          <span className="text-[10px] uppercase tracking-wider text-outline">popular</span>
        ) : null}
      </div>

      <p className="text-xl font-bold text-on-surface">
        {BRL.format(plano.precoMensal)}
        <span className="text-xs font-medium text-on-surface-variant">/mês</span>
      </p>
      <p className="text-xs text-on-surface-variant mt-0.5">{plano.profissionais}</p>
      <p className="text-xs text-on-surface-variant mt-2 flex-1">{plano.descricao}</p>

      {state.message && (
        <p className="text-xs mt-2" style={{ color: "var(--color-error)" }}>
          {state.message}
        </p>
      )}

      {podeAssinar && (
        <form action={formAction} className="mt-3">
          <button
            type="submit"
            disabled={isPending || atual}
            className="w-full px-3 py-2.5 rounded-xl text-sm font-bold transition-all-custom disabled:opacity-50 disabled:cursor-not-allowed"
            style={
              atual
                ? { background: "rgba(255,255,255,0.06)", color: "var(--color-on-surface-variant)" }
                : { background: "linear-gradient(135deg,#E8D080,#C89933)", color: "#1D1A05" }
            }
          >
            {atual ? "Plano atual" : isPending ? "Abrindo..." : "Assinar"}
          </button>
        </form>
      )}
    </div>
  );
}
