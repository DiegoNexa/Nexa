/**
 * Escala semanal centralizada de todos os profissionais.
 *
 * Reusa a tabela carga_horaria (1 linha por dia trabalhado, com
 * hora_inicio/hora_fim). Monta, por profissional, um mapa
 * dia_semana → {inicio, fim} e o total de horas planejadas por semana.
 * Também um resumo de cobertura por dia (quantos trabalham em cada dia).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type DiaCarga = { inicio: string; fim: string };  // "HH:MM"

export type EscalaProfissional = {
  id:         string;
  nome:       string;
  cor:        string | null;
  ativo:      boolean;
  dias:       Map<number, DiaCarga>;   // dia_semana (0=dom..6=sáb) → horário
  horasSemana: number;                 // total planejado
};

export type Escala = {
  profissionais: EscalaProfissional[];
  coberturaPorDia: Record<number, number>;  // dia_semana → nº de profissionais
  totalHorasEquipe: number;
};

// Ordem de exibição: começa na segunda, fim de semana no fim
export const DIAS_ORDEM = [1, 2, 3, 4, 5, 6, 0];
export const DIAS_LABEL: Record<number, string> = {
  1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb", 0: "Dom",
};
export const DIAS_FDS = new Set([0, 6]);

/** minutos entre "HH:MM" e "HH:MM" (assume fim > inicio, validado no banco) */
function minutosEntre(inicio: string, fim: string): number {
  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fim.split(":").map(Number);
  return (hf * 60 + mf) - (hi * 60 + mi);
}

/** "44h" ou "38h30" */
export function formatarHoras(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

export async function carregarEscala(supabase: SupabaseClient): Promise<Escala> {
  const [{ data: profs }, { data: cargas }] = await Promise.all([
    supabase
      .from("profissionais")
      .select("id, nome, cor, ativo")
      .order("ativo", { ascending: false })
      .order("nome")
      .returns<{ id: string; nome: string; cor: string | null; ativo: boolean }[]>(),
    supabase
      .from("carga_horaria")
      .select("profissional_id, dia_semana, hora_inicio, hora_fim")
      .returns<{ profissional_id: string; dia_semana: number; hora_inicio: string; hora_fim: string }[]>(),
  ]);

  const porProf = new Map<string, Map<number, DiaCarga>>();
  for (const c of cargas ?? []) {
    if (!porProf.has(c.profissional_id)) porProf.set(c.profissional_id, new Map());
    porProf.get(c.profissional_id)!.set(c.dia_semana, {
      inicio: c.hora_inicio.slice(0, 5),
      fim:    c.hora_fim.slice(0, 5),
    });
  }

  const coberturaPorDia: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let totalHorasEquipe = 0;

  const profissionais: EscalaProfissional[] = (profs ?? []).map((p) => {
    const dias = porProf.get(p.id) ?? new Map<number, DiaCarga>();
    let minutos = 0;
    for (const [dia, h] of dias) {
      minutos += minutosEntre(h.inicio, h.fim);
      if (p.ativo) coberturaPorDia[dia] += 1;
    }
    if (p.ativo) totalHorasEquipe += minutos;
    return { id: p.id, nome: p.nome, cor: p.cor, ativo: p.ativo, dias, horasSemana: minutos };
  });

  return { profissionais, coberturaPorDia, totalHorasEquipe };
}
