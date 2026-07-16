"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { METRICAS, type Metrica } from "@/lib/ranking";

/**
 * Segmented control que troca a métrica de ordenação via ?metrica=.
 * A métrica ativa fica destacada em dourado com ícone auto-explicativo.
 */
export function MetricaToggle({ atual }: { atual: Metrica }) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  function selecionar(m: Metrica) {
    const params = new URLSearchParams(searchParams);
    params.set("metrica", m);
    router.push(`?${params.toString()}`);
  }

  return (
    <div
      className="inline-flex rounded-xl p-1 gap-1"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {METRICAS.map((m) => {
        const ativo = m.key === atual;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => selecionar(m.key)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all-custom"
            style={{
              background: ativo ? "rgba(200,153,51,0.14)" : "transparent",
              color:      ativo ? "var(--color-primary)" : "var(--color-on-surface-variant)",
              border:     ativo ? "1px solid rgba(200,153,51,0.35)" : "1px solid transparent",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>{m.icon}</span>
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
