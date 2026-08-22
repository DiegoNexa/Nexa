import { BRL } from "@/lib/folha-pagamento";
import type { DadosGrafico, PontoDia } from "@/lib/dashboard";

/**
 * Gráfico de faturamento diário do mês (área) + sparkline dos últimos
 * 6 meses. Server component: o SVG é montado a partir dos dados reais,
 * com escala calculada dinamicamente.
 *
 * Geometria (viewBox 1000×268): área de plotagem entre x 56→980 e
 * y 20 (topo) → 230 (linha de base).
 */

const X0 = 56, X1 = 980, Y_TOPO = 20, Y_BASE = 230;

const FONTE_MONO = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace";

/** Arredonda o topo da escala para um número "redondo" acima do máximo */
function tetoEscala(max: number): number {
  if (max <= 0) return 100;
  const mag = Math.pow(10, Math.floor(Math.log10(max)));
  for (const passo of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) {
    if (max <= passo * mag) return passo * mag;
  }
  return 10 * mag;
}

/** 1250 → "1,2k" · 800 → "800" */
function curto(v: number): string {
  if (v >= 1000) {
    const k = v / 1000;
    return `${k.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  }
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function GraficoFaturamento({ dados }: { dados: DadosGrafico }) {
  const { diaria, meses, variacao, melhorDia, mesLabel } = dados;
  const temDados = diaria.some((d) => d.valor > 0);

  return (
    <section className="glass-card rounded-2xl p-5 md:p-6">
      {/* Cabeçalho + legenda */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="text-[15px] font-semibold text-on-surface mb-1">Faturamento diário</h2>
          <p className="text-xs text-outline" style={{ fontFamily: FONTE_MONO }}>
            DIÁRIO · {mesLabel}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--color-primary)" }} />
            Faturamento
          </span>
          <a href="/financeiro" className="text-xs text-primary hover:underline whitespace-nowrap">
            Financeiro →
          </a>
        </div>
      </div>

      {temDados ? (
        <>
          <Area diaria={diaria} melhorDia={melhorDia} />
          {meses.length > 0 && <Sparkline meses={meses} variacao={variacao} />}
        </>
      ) : (
        <Vazio />
      )}
    </section>
  );
}

function Area({ diaria, melhorDia }: { diaria: PontoDia[]; melhorDia: PontoDia | null }) {
  const max = tetoEscala(Math.max(...diaria.map((d) => d.valor)));
  const n   = diaria.length;

  const x = (i: number) => (n <= 1 ? (X0 + X1) / 2 : X0 + ((X1 - X0) * i) / (n - 1));
  const y = (v: number) => Y_BASE - (v / max) * (Y_BASE - Y_TOPO);

  const coords = diaria.map((d, i) => `${x(i).toFixed(1)},${y(d.valor).toFixed(1)}`);
  const pontos = coords.join(" ");
  const area   = `M${coords.join(" L")} L${x(n - 1).toFixed(1)},${Y_BASE} L${x(0).toFixed(1)},${Y_BASE} Z`;

  // Destaque no melhor dia do mês
  const iMelhor = melhorDia ? diaria.findIndex((d) => d.dia === melhorDia.dia) : -1;
  const xM = iMelhor >= 0 ? x(iMelhor) : 0;
  const yM = iMelhor >= 0 ? y(diaria[iMelhor]!.valor) : 0;
  // Mantém o balão dentro da área visível
  const xBalao = Math.min(Math.max(xM - 70, X0), X1 - 140);

  // Rótulos do eixo X: no máximo ~7, sempre incluindo o último dia
  const passo = Math.max(1, Math.ceil(n / 7));
  const marcas = diaria
    .map((d, i) => ({ d, i }))
    .filter(({ i }) => i % passo === 0 || i === n - 1);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox="0 0 1000 268"
        style={{ width: "100%", minWidth: 520, height: 268, display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id="nxArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#C89933" stopOpacity=".45" />
            <stop offset="100%" stopColor="#C89933" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grade + eixo Y */}
        <g stroke="rgba(255,255,255,.06)" strokeWidth="1">
          {[0, 1, 2].map((i) => {
            const yy = Y_TOPO + ((Y_BASE - Y_TOPO) / 3) * i;
            return <line key={i} x1={X0} y1={yy} x2={X1 + 10} y2={yy} />;
          })}
          <line x1={X0} y1={Y_BASE} x2={X1 + 10} y2={Y_BASE} stroke="rgba(255,255,255,.14)" />
        </g>
        <g fill="#6B6840" fontSize="10" fontFamily="JetBrains Mono, monospace" textAnchor="end">
          {[0, 1, 2, 3].map((i) => {
            const valor = max - (max / 3) * i;
            const yy = Y_TOPO + ((Y_BASE - Y_TOPO) / 3) * i;
            return <text key={i} x={44} y={yy + 4}>{curto(valor)}</text>;
          })}
        </g>

        {/* Área + linha */}
        <path d={area} fill="url(#nxArea)" />
        <polyline
          points={pontos}
          fill="none"
          stroke="#E8D080"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Melhor dia do mês */}
        {iMelhor >= 0 && melhorDia && (
          <>
            <line x1={xM} y1={yM} x2={xM} y2={Y_BASE} stroke="#C89933" strokeWidth="1" strokeDasharray="3 3" opacity=".5" />
            <circle cx={xM} cy={yM} r="5" fill="#0E0C02" stroke="#E8D080" strokeWidth="2.5" />
            <g transform={`translate(${xBalao},${Math.max(yM - 40, -6)})`}>
              <rect x="0" y="0" width="140" height="30" rx="8" fill="#1D1A05" stroke="rgba(200,153,51,.35)" />
              <text x="70" y="20" fill="#fff" fontSize="12" fontFamily="Inter, sans-serif" fontWeight="600" textAnchor="middle">
                dia {melhorDia.dia} · {BRL.format(melhorDia.valor)}
              </text>
            </g>
          </>
        )}

        {/* Eixo X */}
        <g fill="#E8E8E8" fontSize="10" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
          {marcas.map(({ d, i }) => (
            <text key={d.dia} x={x(i)} y={252} fill={i === n - 1 ? "#C89933" : undefined}>
              {String(d.dia).padStart(2, "0")}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

/** Rodapé: barras dos últimos 6 meses + variação no período */
function Sparkline({
  meses, variacao,
}: {
  meses: { label: string; valor: number }[];
  variacao: number | null;
}) {
  const max = Math.max(...meses.map((m) => m.valor), 1);

  return (
    <div className="flex items-center gap-4 mt-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <span
        className="text-[11px] uppercase tracking-wider text-outline whitespace-nowrap"
        style={{ fontFamily: FONTE_MONO }}
      >
        6 meses
      </span>
      <div className="flex-1 flex items-end gap-1.5 h-10 min-w-0">
        {meses.map((m, i) => {
          const ultimo = i === meses.length - 1;
          const penultimo = i === meses.length - 2;
          return (
            <div
              key={`${m.label}-${i}`}
              title={`${m.label}: ${BRL.format(m.valor)}`}
              className="flex-1 rounded-sm"
              style={{
                height: `${Math.max(6, (m.valor / max) * 100)}%`,
                background: ultimo ? "#E8D080" : penultimo ? "#C89933" : "#6B4F15",
              }}
            />
          );
        })}
      </div>
      {variacao !== null && (
        <span
          className="text-xs font-semibold whitespace-nowrap"
          style={{ color: variacao >= 0 ? "#34D399" : "#EF4444" }}
        >
          {variacao >= 0 ? "+" : ""}{variacao}% vs {meses[0]!.label}
        </span>
      )}
    </div>
  );
}

function Vazio() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center" style={{ minHeight: 268 }}>
      <span className="material-symbols-outlined" style={{ fontSize: "30px", color: "#6B4F15" }}>
        bar_chart
      </span>
      <p className="text-sm font-semibold text-on-surface">Ainda sem faturamento este mês</p>
      <p className="text-xs text-outline max-w-xs">
        Conclua atendimentos na agenda — o gráfico aparece a partir do primeiro atendimento concluído.
      </p>
      <a
        href="/agenda"
        className="mt-1.5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all-custom"
        style={{
          background: "rgba(200,153,51,0.1)",
          border: "1px solid rgba(200,153,51,0.3)",
          color: "var(--color-primary)",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>add</span>
        Ir para a agenda
      </a>
    </div>
  );
}
