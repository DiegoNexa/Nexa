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
        <p className="text-sm font-medium text-on-surface truncate flex items-center gap-1">
          {despesa.recorrente_id && (
            <span
              className="material-symbols-outlined text-primary flex-shrink-0"
              title="Despesa fixa (recorrente)"
              style={{ fontSize: "14px" }}
            >
              repeat
            </span>
          )}
          <span className="truncate">{despesa.descricao}</span>
        </p>
        <p className="text-xs text-on-surface-variant">
          {CATEGORIA_LABEL[despesa.categoria]} · {fmtData(despesa.data_despesa)}
        </p>
      </div>

      <span className="text-sm font-semibold text-on-surface flex-shrink-0">
        − {BRL.format(despesa.valor)}
      </span>

      {despesa.virtual ? (
        // Ocorrência de despesa fixa — não se exclui individualmente;
        // gerencia-se no painel "Despesas fixas".
        <span
          className="text-[10px] uppercase tracking-wider text-outline px-2 flex-shrink-0"
          title="Despesa fixa — gerencie em Despesas fixas"
        >
          fixa
        </span>
      ) : (
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
      )}
    </div>
  );
}
