"use client";

import { useActionState } from "react";
import { HoverButton } from "@/components/ui/hover-button";
import { salvarCargaHoraria, type CargaHorariaState } from "@/app/(app)/profissionais/actions";

const initialState: CargaHorariaState = { ok: false };

const DIAS = [
  { idx: 1, nome: "Segunda"  },
  { idx: 2, nome: "Terça"    },
  { idx: 3, nome: "Quarta"   },
  { idx: 4, nome: "Quinta"   },
  { idx: 5, nome: "Sexta"    },
  { idx: 6, nome: "Sábado"   },
  { idx: 0, nome: "Domingo"  },
];

type CargaItem = {
  dia_semana:  number;
  hora_inicio: string;
  hora_fim:    string;
};

type Props = {
  profissionalId: string;
  initial:        CargaItem[];
};

export function CargaHorariaForm({ profissionalId, initial }: Props) {
  const action = salvarCargaHoraria.bind(null, profissionalId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  // Index pelos dias pra fácil lookup
  const byDay = new Map(initial.map((c) => [c.dia_semana, c]));

  return (
    <form action={formAction} className="space-y-3">
      {DIAS.map((dia) => {
        const config = byDay.get(dia.idx);
        const ativo  = !!config;
        const inicio = config?.hora_inicio?.slice(0, 5) || "09:00";
        const fim    = config?.hora_fim?.slice(0, 5)    || "18:00";

        return (
          <div
            key={dia.idx}
            className="glass-card rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4"
          >
            {/* Toggle "trabalha" */}
            <label className="flex items-center gap-2 cursor-pointer flex-shrink-0 min-w-[110px]">
              <input
                type="checkbox"
                name={`dia_${dia.idx}_ativo`}
                defaultChecked={ativo}
                className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
              />
              <span className="text-sm font-medium text-on-surface">{dia.nome}</span>
            </label>

            {/* Horários */}
            <div className="flex items-center gap-2 flex-1">
              <input
                type="time"
                name={`dia_${dia.idx}_inicio`}
                defaultValue={inicio}
                className="px-3 py-2 rounded-lg text-sm focus:outline-none transition-all-custom text-on-surface"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              />
              <span className="text-on-surface-variant text-sm">até</span>
              <input
                type="time"
                name={`dia_${dia.idx}_fim`}
                defaultValue={fim}
                className="px-3 py-2 rounded-lg text-sm focus:outline-none transition-all-custom text-on-surface"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              />
            </div>
          </div>
        );
      })}

      {state.message && (
        <div
          role="alert"
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: state.ok ? "rgba(200,153,51,0.08)" : "rgba(255, 180, 171, 0.08)",
            border:     state.ok ? "1px solid var(--color-primary)" : "1px solid var(--color-error)",
            color:      state.ok ? "var(--color-primary)" : "var(--color-error)",
          }}
        >
          {state.message}
        </div>
      )}

      <HoverButton type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvando..." : "Salvar carga horária"}
      </HoverButton>
    </form>
  );
}
