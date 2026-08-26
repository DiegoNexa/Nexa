"use client";

import { useActionState, useState } from "react";
import { iniciarAssinatura, type AssinaturaState } from "@/app/(app)/configuracoes/actions";
import {
  PLANOS_LISTA,
  PERIODOS,
  precoPeriodo,
  precoPorMes,
  economia,
  periodoInfo,
  type Plano,
  type PlanoSalao,
  type Periodicidade,
} from "@/lib/planos";

const initialState: AssinaturaState = { ok: false };

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Props = {
  planoAtual: PlanoSalao;
  assinaturaAtiva: boolean;
  podeAssinar: boolean;   // só o dono
};

export function PlanosCards({ planoAtual, assinaturaAtiva, podeAssinar }: Props) {
  // O período é escolhido uma vez e vale para os três cards
  const [periodo, setPeriodo] = useState<Periodicidade>("mensal");

  return (
    <div>
      {/* Seletor de periodicidade */}
      <div className="flex justify-center mb-4">
        <div
          className="inline-flex gap-1 p-1 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {PERIODOS.map((p) => {
            const ativo = p.key === periodo;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriodo(p.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] transition-all-custom"
                style={
                  ativo
                    ? { background: "var(--color-primary)", color: "#1D1A05", fontWeight: 600 }
                    : { color: "var(--color-on-surface-variant)", fontWeight: 500 }
                }
              >
                {p.label}
                {p.selo && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={
                      ativo
                        ? { background: "rgba(29,26,5,0.15)", color: "#1D1A05" }
                        : { background: "rgba(52,211,153,0.15)", color: "#34D399" }
                    }
                  >
                    {p.selo}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PLANOS_LISTA.map((p) => (
          <PlanoCard
            key={p.key}
            plano={p}
            periodo={periodo}
            atual={assinaturaAtiva && planoAtual === p.key}
            podeAssinar={podeAssinar}
          />
        ))}
      </div>
    </div>
  );
}

function PlanoCard({
  plano, periodo, atual, podeAssinar,
}: {
  plano: Plano; periodo: Periodicidade; atual: boolean; podeAssinar: boolean;
}) {
  const action = iniciarAssinatura.bind(null, plano.key);
  const [state, formAction, isPending] = useActionState(action, initialState);

  const info      = periodoInfo(periodo);
  const total     = precoPeriodo(plano, periodo);
  const porMes    = precoPorMes(plano, periodo);
  const poupanca  = economia(plano, periodo);
  const mensal    = periodo === "mensal";

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

      {/* Preço: sempre por mês, para os períodos serem comparáveis */}
      <p className="text-xl font-bold text-on-surface">
        {BRL.format(porMes)}
        <span className="text-xs font-medium text-on-surface-variant">/mês</span>
      </p>

      {mensal ? (
        <p className="text-xs text-on-surface-variant mt-0.5">cobrado mensalmente</p>
      ) : (
        <p className="text-xs text-on-surface-variant mt-0.5">
          {BRL.format(total)} a cada {info.meses} meses
        </p>
      )}

      {poupanca > 0 && (
        <p className="text-[11px] font-semibold mt-1" style={{ color: "#34D399" }}>
          economize {BRL.format(poupanca)}
        </p>
      )}

      <p className="text-xs text-on-surface-variant mt-2">{plano.profissionais}</p>

      {/* Benefícios — vêm de lib/planos.ts (mesma fonte da landing) */}
      <ul className="mt-3 space-y-1.5 flex-1">
        {plano.beneficios.map((b) => (
          <li key={b} className="flex items-start gap-1.5 text-xs text-on-surface-variant">
            <span
              className="material-symbols-outlined flex-shrink-0 text-primary"
              style={{ fontSize: "15px", lineHeight: "16px" }}
            >
              check
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {state.message && (
        <p className="text-xs mt-2" style={{ color: "var(--color-error)" }}>
          {state.message}
        </p>
      )}

      {podeAssinar && (
        <form action={formAction} className="mt-3">
          {/* O período escolhido acompanha o envio */}
          <input type="hidden" name="periodo" value={periodo} />
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
