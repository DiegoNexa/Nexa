"use client";

import { useState } from "react";
import { CargaHorariaForm } from "@/components/profissionais/carga-horaria-form";
import { DIAS_ORDEM, formatarHoras } from "@/lib/carga-horaria";

// Template compartilhado entre cabeçalho e linhas (mesma ordem de colunas)
export const GRID_COLS = "minmax(120px,1.4fr) repeat(7, minmax(48px,1fr)) minmax(60px,auto) 36px";

export type LinhaProf = {
  id:          string;
  nome:        string;
  cor:         string | null;
  ativo:       boolean;
  horasSemana: number;                              // minutos
  dias:        Record<number, { inicio: string; fim: string }>;
};

/** "09:00" → "9" · "09:30" → "9:30" */
function compact(h: string): string {
  const [hh, mm] = h.split(":");
  return mm === "00" ? String(Number(hh)) : `${Number(hh)}:${mm}`;
}

export function EscalaLinha({ prof }: { prof: LinhaProf }) {
  const [aberto, setAberto] = useState(false);
  const cor = prof.cor ?? "var(--color-primary)";

  const initial = DIAS_ORDEM
    .filter((d) => prof.dias[d])
    .map((d) => ({ dia_semana: d, hora_inicio: prof.dias[d]!.inicio, hora_fim: prof.dias[d]!.fim }));

  return (
    <div className={prof.ativo ? "" : "opacity-50"}>
      <div className="grid items-center gap-1 p-2" style={{ gridTemplateColumns: GRID_COLS }}>
        {/* Profissional */}
        <div className="flex items-center gap-2 min-w-0 pl-1">
          <div
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white"
            style={{ background: cor, border: "2px solid rgba(255,255,255,0.1)" }}
          >
            {prof.nome.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-on-surface truncate">{prof.nome}</span>
        </div>

        {/* Células dos dias */}
        {DIAS_ORDEM.map((d) => {
          const c = prof.dias[d];
          if (c) {
            return (
              <div
                key={d}
                className="h-9 rounded-md flex items-center justify-center text-[11px] font-semibold tabular-nums"
                style={{ background: `${cor}1F`, color: cor }}
                title={`${c.inicio} às ${c.fim}`}
              >
                {compact(c.inicio)}–{compact(c.fim)}
              </div>
            );
          }
          return (
            <div
              key={d}
              className="h-9 rounded-md flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.03)" }}
              title="Folga"
            >
              <span className="material-symbols-outlined text-outline" style={{ fontSize: "15px" }}>bedtime</span>
            </div>
          );
        })}

        {/* Total de horas */}
        <div className="flex items-center justify-end gap-1 pr-1">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "14px" }}>timer</span>
          <span className="text-xs font-semibold text-on-surface tabular-nums">
            {prof.horasSemana > 0 ? formatarHoras(prof.horasSemana) : "—"}
          </span>
        </div>

        {/* Editar */}
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-label={aberto ? "Fechar edição" : "Editar carga horária"}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all-custom"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
            {aberto ? "expand_less" : "edit"}
          </span>
        </button>
      </div>

      {/* Editor inline (reusa o form existente) */}
      {aberto && (
        <div className="px-3 pb-4 pt-1">
          <CargaHorariaForm profissionalId={prof.id} initial={initial} />
        </div>
      )}
    </div>
  );
}
