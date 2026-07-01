"use client";

import { excluirDespesa } from "@/app/(app)/financeiro/actions";
import { BRL } from "@/lib/folha-pagamento";
import { CATEGORIA_LABEL, type Despesa } from "@/lib/financeiro";

function fmtData(iso: string): string {
  // iso é YYYY-MM-DD — evita shift de timezone montando como UTC
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", timeZone: "UTC",
  });
}

export function DespesaItem({ despesa }: { despesa: Despesa }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ background: "rgba(239,68,68,0.10)" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#EF4444" }}>
          receipt
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-on-surface truncate">{despesa.descricao}</p>
        <p className="text-xs text-on-surface-variant">
          {CATEGORIA_LABEL[despesa.categoria]} · {fmtData(despesa.data_despesa)}
        </p>
      </div>

      <span className="text-sm font-semibold text-on-surface flex-shrink-0">
        − {BRL.format(despesa.valor)}
      </span>

      <form action={excluirDespesa.bind(null, despesa.id)}>
        <button
          type="submit"
          aria-label="Excluir despesa"
          title="Excluir despesa"
          className="p-2 rounded-lg text-on-surface-variant hover:text-[var(--color-error)] hover:bg-white/5 transition-all-custom"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>delete</span>
        </button>
      </form>
    </div>
  );
}
