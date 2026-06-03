"use client";

import { excluirMovimento } from "@/app/(app)/folha-pagamento/actions";
import { BRL, TIPO_LABEL, formatarDataBR, type Movimento } from "@/lib/folha-pagamento";

type Props = {
  movimento:      Movimento;
  profissionalId: string;
};

const TIPO_ICON: Record<Movimento["tipo"], string> = {
  vale:          "payments",
  adiantamento:  "request_quote",
  desconto:      "remove_circle",
  bonus:         "star",
};

const TIPO_COR: Record<Movimento["tipo"], string> = {
  vale:          "var(--color-error)",
  adiantamento:  "var(--color-error)",
  desconto:      "var(--color-error)",
  bonus:         "var(--color-primary)",
};

export function MovimentoItem({ movimento: m, profissionalId }: Props) {
  const sinal = m.tipo === "bonus" ? "+" : "−";
  const cor   = TIPO_COR[m.tipo];

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <div
        className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "20px", color: cor }}>
          {TIPO_ICON[m.tipo]}
        </span>
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-on-surface">{TIPO_LABEL[m.tipo]}</span>
          <span className="text-xs text-outline">·</span>
          <span className="text-xs text-on-surface-variant">{formatarDataBR(m.data_movimento)}</span>
        </div>
        {m.descricao && (
          <p
            className="text-xs text-on-surface-variant mt-0.5 line-clamp-2"
            style={{
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
            title={m.descricao}
          >
            {m.descricao}
          </p>
        )}
      </div>
      <p
        className="text-sm font-semibold whitespace-nowrap flex-shrink-0 mt-0.5"
        style={{ color: cor }}
      >
        {sinal} {BRL.format(Number(m.valor))}
      </p>
      <form
        action={excluirMovimento.bind(null, m.id, profissionalId)}
        className="flex-shrink-0"
      >
        <button
          type="submit"
          aria-label="Excluir"
          onClick={(e) => {
            if (!confirm("Excluir este movimento?")) e.preventDefault();
          }}
          className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all-custom"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
        </button>
      </form>
    </div>
  );
}
