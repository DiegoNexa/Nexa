"use client";

import { excluirRecorrente } from "@/app/(app)/financeiro/actions";
import { BRL } from "@/lib/folha-pagamento";
import { descreverRecorrencia, type DespesaRecorrente } from "@/lib/financeiro";

export function RecorrenteItem({ recorrente }: { recorrente: DespesaRecorrente }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: "rgba(200,153,51,0.12)" }}
      >
        <span className="material-symbols-outlined text-primary" style={{ fontSize: "17px" }}>
          repeat
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-on-surface truncate">{recorrente.descricao}</p>
        <p className="text-xs text-on-surface-variant">{descreverRecorrencia(recorrente)}</p>
      </div>

      <span className="text-sm font-semibold text-on-surface flex-shrink-0">
        {BRL.format(recorrente.valor)}
      </span>

      <form action={excluirRecorrente.bind(null, recorrente.id)}>
        <button
          type="submit"
          aria-label="Parar recorrência"
          title="Parar de repetir (mantém o histórico)"
          className="p-2 rounded-lg text-on-surface-variant hover:text-[var(--color-error)] hover:bg-white/5 transition-all-custom"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>cancel</span>
        </button>
      </form>
    </div>
  );
}
