"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  /** Quantidade de meses anteriores que aparecem no select (default 12) */
  ultimosMeses?: number;
};

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março",   "Abril",
  "Maio",    "Junho",     "Julho",   "Agosto",
  "Setembro","Outubro",   "Novembro","Dezembro",
];

export function MesSelector({ ultimosMeses = 12 }: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const atualParam   = searchParams.get("mes");

  const hoje = new Date();
  const opcoes: { value: string; label: string }[] = [];

  for (let i = 0; i < ultimosMeses; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${MESES_PT[d.getMonth()]} ${d.getFullYear()}`;
    opcoes.push({ value, label });
  }

  const valorAtual = atualParam ?? opcoes[0]!.value;

  return (
    <div className="relative">
      <select
        value={valorAtual}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams);
          params.set("mes", e.target.value);
          router.push(`?${params.toString()}`);
        }}
        className="appearance-none pl-4 pr-10 py-2 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface cursor-pointer"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {opcoes.map((o) => (
          <option key={o.value} value={o.value} style={{ color: "#000", background: "#fff" }}>
            {o.label}
          </option>
        ))}
      </select>
      <span
        className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant"
        style={{ fontSize: "20px" }}
      >
        expand_more
      </span>
    </div>
  );
}
