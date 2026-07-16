import { createClient } from "@/lib/supabase/server";
import { GoldBorderButton } from "@/components/ui/gold-border-button";
import { EscalaLinha, GRID_COLS, type LinhaProf } from "@/components/carga-horaria/escala-linha";
import {
  carregarEscala,
  formatarHoras,
  DIAS_ORDEM,
  DIAS_LABEL,
  DIAS_FDS,
} from "@/lib/carga-horaria";

// Cor da cobertura por dia: 0 descoberto, 1 frágil, 2+ ok
function corCobertura(n: number): { cor: string; label: string } {
  if (n === 0) return { cor: "#EF4444", label: "descoberto" };
  if (n === 1) return { cor: "#E8B923", label: "1 pessoa" };
  return { cor: "#34D399", label: `${n} pessoas` };
}

export default async function CargaHorariaPage() {
  const supabase = await createClient();
  const escala = await carregarEscala(supabase);

  // Serializa (Map → Record) pros client components
  const linhas: LinhaProf[] = escala.profissionais.map((p) => ({
    id:          p.id,
    nome:        p.nome,
    cor:         p.cor,
    ativo:       p.ativo,
    horasSemana: p.horasSemana,
    dias:        Object.fromEntries(p.dias),
  }));

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <p
            className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
            style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
          >
            Equipe
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold text-on-surface mb-1"
            style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
          >
            Carga horária
          </h1>
          <p className="text-sm text-on-surface-variant">
            Escala semanal da equipe · {formatarHoras(escala.totalHorasEquipe)} no total
          </p>
        </div>
      </div>

      {linhas.length === 0 ? (
        <EscalaEmpty />
      ) : (
        <>
          {/* Legenda */}
          <div className="flex items-center gap-4 mb-3 text-xs text-on-surface-variant">
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: "15px" }}>schedule</span>
              Trabalha
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-outline" style={{ fontSize: "15px" }}>bedtime</span>
              Folga
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "15px" }}>edit</span>
              Toque pra editar
            </span>
          </div>

          {/* Grade (scroll horizontal no mobile) */}
          <div className="glass-card rounded-2xl overflow-x-auto">
            <div style={{ minWidth: 640 }}>
              {/* Cabeçalho da grade */}
              <div
                className="grid gap-1 px-2 py-3 border-b text-[10px] uppercase tracking-wider"
                style={{ gridTemplateColumns: GRID_COLS, borderColor: "rgba(255,255,255,0.08)" }}
              >
                <div className="text-outline pl-1 self-center">Profissional</div>
                {DIAS_ORDEM.map((d) => (
                  <div
                    key={d}
                    className="text-center font-semibold"
                    style={{ color: DIAS_FDS.has(d) ? "var(--color-primary)" : "var(--color-on-surface-variant)" }}
                  >
                    {DIAS_LABEL[d]}
                  </div>
                ))}
                <div className="text-right text-outline pr-1 self-center">Horas</div>
                <div />
              </div>

              {/* Linhas */}
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                {linhas.map((p) => (
                  <EscalaLinha key={p.id} prof={p} />
                ))}
              </div>

              {/* Rodapé: cobertura por dia */}
              <div
                className="grid gap-1 px-2 py-3 border-t"
                style={{ gridTemplateColumns: GRID_COLS, borderColor: "rgba(255,255,255,0.08)" }}
              >
                <div className="text-[10px] uppercase tracking-wider text-outline pl-1 self-center">Cobertura</div>
                {DIAS_ORDEM.map((d) => {
                  const n = escala.coberturaPorDia[d] ?? 0;
                  const { cor, label } = corCobertura(n);
                  return (
                    <div key={d} className="flex flex-col items-center gap-1" title={label}>
                      <div className="w-full h-1.5 rounded-full" style={{ background: cor, opacity: 0.85 }} />
                      <span className="text-[11px] font-semibold tabular-nums" style={{ color: cor }}>{n}</span>
                    </div>
                  );
                })}
                <div />
                <div />
              </div>
            </div>
          </div>

          <p className="text-xs text-outline text-center mt-3">
            Dias em <span style={{ color: "#EF4444" }}>vermelho</span> não têm ninguém escalado.
            Toque no lápis de cada linha pra ajustar os horários.
          </p>
        </>
      )}
    </div>
  );
}

function EscalaEmpty() {
  return (
    <div className="glass-card rounded-3xl p-8 md:p-16 text-center max-w-2xl mx-auto">
      <span className="material-symbols-outlined text-primary block mx-auto mb-6" style={{ fontSize: "72px" }}>
        schedule
      </span>
      <h2
        className="text-2xl md:text-3xl font-bold text-on-surface mb-3"
        style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
      >
        Nenhum profissional ainda
      </h2>
      <p className="text-base text-on-surface-variant max-w-md mx-auto mb-8">
        Cadastre profissionais para montar a escala semanal da equipe aqui.
      </p>
      <GoldBorderButton href="/profissionais/novo" className="inline-flex">
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
        Cadastrar profissional
      </GoldBorderButton>
    </div>
  );
}
