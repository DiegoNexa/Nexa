import { createClient } from "@/lib/supabase/server";
import { MesSelector } from "@/components/folha-pagamento/mes-selector";
import { MetricaToggle } from "@/components/ranking/metrica-toggle";
import { BRL, parseMesParam } from "@/lib/folha-pagamento";
import {
  carregarRanking,
  ordenarPor,
  parseMetrica,
  METRICAS,
  type Metrica,
  type RankingItem,
  type Totais,
} from "@/lib/ranking";

type Props = { searchParams: Promise<{ mes?: string; metrica?: string }> };

// Cores das medalhas (1º/2º/3º) + neutro
const MEDALHAS = ["#C89933", "#C0C0C0", "#CD7F32"];

function fmtMetrica(t: Totais, m: Metrica): string {
  if (m === "atendimentos") return `${t.atendimentos}`;
  return BRL.format(t[m]);
}

export default async function RankingPage({ searchParams }: Props) {
  const { mes, metrica: metricaRaw } = await searchParams;
  const periodo = parseMesParam(mes);
  const metrica = parseMetrica(metricaRaw);

  const supabase = await createClient();
  const itens = await carregarRanking(supabase, periodo);

  const doMes  = ordenarPor(itens, "mes", metrica);
  const geral  = ordenarPor(itens, "geral", metrica);

  const metricaLabel = METRICAS.find((x) => x.key === metrica)!.label.toLowerCase();
  const semDados = geral.length === 0;

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
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
            Ranking
          </h1>
          <p className="text-sm text-on-surface-variant">
            Profissionais destaque por {metricaLabel}
          </p>
        </div>
        <MesSelector />
      </div>

      {/* Toggle de métrica */}
      <div className="mb-6">
        <MetricaToggle atual={metrica} />
      </div>

      {semDados ? (
        <RankingEmpty />
      ) : (
        <div className="space-y-8">
          {/* Ranking do mês */}
          <section>
            <h2 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: "20px" }}>calendar_month</span>
              Ranking de {periodo.label}
            </h2>
            {doMes.length === 0 ? (
              <p className="glass-card rounded-2xl p-6 text-sm text-on-surface-variant text-center">
                Nenhum atendimento concluído neste mês.
              </p>
            ) : (
              <RankingLista itens={doMes} escopo="mes" metrica={metrica} />
            )}
          </section>

          {/* Acumulado */}
          <section>
            <h2 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: "20px" }}>military_tech</span>
              Acumulado (desde sempre)
            </h2>
            <RankingLista itens={geral} escopo="geral" metrica={metrica} compacto />
          </section>
        </div>
      )}
    </div>
  );
}

function RankingLista({
  itens, escopo, metrica, compacto = false,
}: {
  itens: RankingItem[]; escopo: "mes" | "geral"; metrica: Metrica; compacto?: boolean;
}) {
  const maior = itens[0]?.[escopo][metrica] ?? 1;

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {itens.map((item, i) => {
          const pos      = i + 1;
          const t        = item[escopo];
          const cor      = item.profissional.cor ?? "var(--color-primary)";
          const medalha  = MEDALHAS[i];
          const pct      = maior > 0 ? Math.max(4, (t[metrica] / maior) * 100) : 0;

          return (
            <div key={item.profissional.id} className="relative">
              {/* Barra relativa de fundo */}
              <div
                className="absolute inset-y-0 left-0 pointer-events-none"
                style={{ width: `${pct}%`, background: cor, opacity: 0.08 }}
              />

              <div className={`relative flex items-center gap-3 ${compacto ? "p-3" : "p-4"}`}>
                {/* Medalha / posição */}
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded-full font-bold"
                  style={{
                    width: compacto ? 28 : 34,
                    height: compacto ? 28 : 34,
                    fontSize: compacto ? 12 : 14,
                    background: medalha ? medalha : "rgba(255,255,255,0.06)",
                    color: medalha ? "#1D1A05" : "var(--color-on-surface-variant)",
                    border: medalha ? "none" : "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {pos}
                </div>

                {/* Avatar */}
                <div
                  className="flex-shrink-0 rounded-full flex items-center justify-center font-bold text-white"
                  style={{
                    width: compacto ? 32 : 40,
                    height: compacto ? 32 : 40,
                    fontSize: compacto ? 13 : 15,
                    background: cor,
                    border: "2px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {item.profissional.nome.charAt(0).toUpperCase()}
                </div>

                {/* Nome + métricas secundárias */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">{item.profissional.nome}</p>
                  {!compacto && (
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-on-surface-variant">
                      <span className="inline-flex items-center gap-0.5">
                        <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>event_available</span>
                        {t.atendimentos}
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>payments</span>
                        {BRL.format(t.faturamento)}
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>savings</span>
                        {BRL.format(t.comissao)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Valor da métrica ativa */}
                <div className="flex-shrink-0 text-right">
                  <p className={`font-bold text-on-surface ${compacto ? "text-sm" : "text-base"}`}>
                    {fmtMetrica(t, metrica)}
                  </p>
                  {metrica === "atendimentos" && (
                    <p className="text-[10px] text-outline">atendimentos</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RankingEmpty() {
  return (
    <div className="glass-card rounded-3xl p-8 md:p-16 text-center max-w-2xl mx-auto">
      <span className="material-symbols-outlined text-primary block mx-auto mb-6" style={{ fontSize: "72px" }}>
        leaderboard
      </span>
      <h2
        className="text-2xl md:text-3xl font-bold text-on-surface mb-3"
        style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
      >
        Ranking ainda vazio
      </h2>
      <p className="text-base text-on-surface-variant max-w-md mx-auto">
        Assim que você concluir atendimentos na agenda, os profissionais destaque aparecem aqui.
      </p>
    </div>
  );
}
