"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PERIODOS, type PeriodoDash } from "@/lib/dashboard";

/**
 * Alterna o período dos KPIs financeiros via ?periodo=.
 * Mesmo padrão do MesSelector/MetricaToggle.
 *
 * O gráfico NÃO depende disto — ele é sempre o faturamento diário do
 * mês corrente, como no design.
 */
export function PeriodoToggle({ atual }: { atual: PeriodoDash }) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  function selecionar(p: PeriodoDash) {
    const params = new URLSearchParams(searchParams);
    params.set("periodo", p);
    router.push(`?${params.toString()}`);
  }

  return (
    <div
      className="flex gap-0.5 p-1 rounded-xl"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {PERIODOS.map((p) => {
        const ativo = p.key === atual;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => selecionar(p.key)}
            className="px-4 py-1.5 rounded-lg text-[13px] transition-all-custom"
            style={
              ativo
                ? { background: "var(--color-primary)", color: "#1D1A05", fontWeight: 600 }
                : { color: "var(--color-on-surface-variant)", fontWeight: 500 }
            }
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
