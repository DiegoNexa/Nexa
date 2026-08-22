import { BRL } from "@/lib/folha-pagamento";
import type { DespesaVencer } from "@/lib/dashboard";

/**
 * Próximas despesas fixas a vencer. A cor da data indica urgência:
 * vermelho até 3 dias, dourado até 7, neutro depois.
 */

const FONTE_MONO = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace";

function corPorUrgencia(dias: number): string {
  if (dias <= 3) return "#EF4444";
  if (dias <= 7) return "var(--color-primary)";
  return "var(--color-outline)";
}

function ddmm(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function DespesasVencer({
  lista, total,
}: {
  lista: DespesaVencer[];
  total: number;
}) {
  return (
    <section className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-on-surface">Despesas fixas a vencer</h2>
        <a href="/financeiro" className="text-xs text-primary hover:underline">Financeiro →</a>
      </div>

      {lista.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-6 text-center">
          Nenhuma despesa fixa cadastrada.
        </p>
      ) : (
        <>
          <div className="flex flex-col">
            {lista.map((d, i) => (
              <div
                key={d.id}
                className="flex items-center gap-3 py-2.5"
                style={
                  i < lista.length - 1
                    ? { borderBottom: "1px solid rgba(255,255,255,0.06)" }
                    : undefined
                }
              >
                <span
                  className="w-11 flex-shrink-0 text-center text-[11px] font-semibold"
                  style={{ color: corPorUrgencia(d.diasAte), fontFamily: FONTE_MONO }}
                >
                  {ddmm(d.data)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-on-surface truncate">{d.descricao}</p>
                  <p className="text-[11px] text-outline">
                    {d.diasAte === 0 ? "vence hoje" : d.diasAte === 1 ? "em 1 dia" : `em ${d.diasAte} dias`}
                  </p>
                </div>
                <span className="text-[13px] font-semibold text-on-surface-variant whitespace-nowrap">
                  {BRL.format(d.valor)}
                </span>
              </div>
            ))}
          </div>

          <div
            className="flex items-center justify-between mt-3 pt-3 border-t"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <span className="text-[11px] uppercase tracking-wider text-outline">Total a vencer</span>
            <span
              className="text-base font-bold text-on-surface"
              style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
            >
              {BRL.format(total)}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
