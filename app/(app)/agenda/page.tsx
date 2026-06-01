import { createClient } from "@/lib/supabase/server";
import { ViewSwitcher } from "@/components/agenda/view-switcher";
import { AgendaEmptyState } from "@/components/agenda/empty-state";

/**
 * /agenda — visão do calendário do salão.
 *
 * Esta entrega (Phase 2) cobre apenas o SHELL visual:
 *   - Cabeçalho com título e ação primária (placeholder)
 *   - Toggle Dia/Semana/Mês (CSS-only, funcional)
 *   - Empty state quando faltam pré-requisitos (profissionais/serviços)
 *   - Mockup estático de timeline pra dar contexto visual
 *
 * Phase 3+ vai trazer dados reais e CRUDs.
 */
export default async function AgendaPage() {
  const supabase = await createClient();

  // Conta profissionais e serviços ativos para decidir se mostra
  // empty state. (Phase 2: sempre será 0, ainda não há CRUD.)
  const [{ count: profCount }, { count: servCount }] = await Promise.all([
    supabase.from("profissionais").select("id", { count: "exact", head: true }).eq("ativo", true),
    supabase.from("servicos").select("id", { count: "exact", head: true }).eq("ativo", true),
  ]);

  const precisaSetup = (profCount ?? 0) === 0 || (servCount ?? 0) === 0;

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <p
            className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
            style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
          >
            Agenda
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold text-on-surface mb-1"
            style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
          >
            Calendário
          </h1>
          <p className="text-sm text-on-surface-variant">
            Veja e gerencie os agendamentos do seu salão
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ViewSwitcher current="semana" />

          {/* Novo agendamento — desabilitado nesta fase */}
          <button
            type="button"
            disabled
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold opacity-50 cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg,#E8D080,#C89933)",
              color: "#1D1A05",
            }}
            title="Em breve"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              add
            </span>
            Novo agendamento
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {precisaSetup ? (
        <AgendaEmptyState />
      ) : (
        <TimelineMockup />
      )}
    </div>
  );
}

/**
 * Mockup visual da timeline da semana — não tem dados ainda.
 * Renderiza um grid 7 colunas × N slots de hora pra dar a forma
 * do que a Phase 4 vai popular com dados reais.
 */
function TimelineMockup() {
  const dias = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  const horas = Array.from({ length: 12 }, (_, i) => 8 + i); // 8h-19h

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header de dias */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div />
        {dias.map(d => (
          <div
            key={d}
            className="text-center py-3 text-xs font-semibold tracking-wider text-on-surface-variant border-l"
            style={{ borderColor: "rgba(255,255,255,0.04)" }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid de horários */}
      <div className="relative">
        {horas.map(h => (
          <div
            key={h}
            className="grid grid-cols-[60px_repeat(7,1fr)] border-b"
            style={{ borderColor: "rgba(255,255,255,0.04)" }}
          >
            <div className="py-3 px-2 text-right text-xs text-outline">
              {String(h).padStart(2, "0")}h
            </div>
            {dias.map(d => (
              <div
                key={d + h}
                className="h-14 border-l"
                style={{ borderColor: "rgba(255,255,255,0.04)" }}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="text-center py-4 text-xs text-outline border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        Os agendamentos aparecerão aqui na próxima atualização
      </div>
    </div>
  );
}
