import { createClient } from "@/lib/supabase/server";
import { MesSelector } from "@/components/folha-pagamento/mes-selector";
import { DespesaForm } from "@/components/financeiro/despesa-form";
import { DespesaItem } from "@/components/financeiro/despesa-item";
import { RecorrenteItem } from "@/components/financeiro/recorrente-item";
import { BRL, parseMesParam } from "@/lib/folha-pagamento";
import { carregarFinanceiro, carregarRecorrentes, CATEGORIA_LABEL } from "@/lib/financeiro";

type Props = { searchParams: Promise<{ mes?: string }> };

export default async function FinanceiroPage({ searchParams }: Props) {
  const { mes } = await searchParams;
  const periodo = parseMesParam(mes);

  const supabase = await createClient();

  // Materializa as despesas recorrentes do mês visualizado (idempotente).
  // O log em despesas_recorrentes_log evita duplicar ou "ressuscitar"
  // uma ocorrência que o usuário tenha apagado.
  await supabase.rpc("gerar_despesas_recorrentes", {
    p_inicio: periodo.inicio,
    p_fim:    periodo.fim,
  });

  const [fin, recorrentes] = await Promise.all([
    carregarFinanceiro(supabase, periodo),
    carregarRecorrentes(supabase),
  ]);

  const lucroPositivo = fin.lucro >= 0;
  const mesParam = periodo.inicio.slice(0, 7);

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <p
            className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
            style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
          >
            Financeiro
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold text-on-surface mb-1"
            style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
          >
            Resultado do mês
          </h1>
          <p className="text-sm text-on-surface-variant">{periodo.label}</p>
        </div>

        <MesSelector />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard
          icon="trending_up"
          label="Faturamento"
          valor={fin.receita.total}
          cor="#34D399"
          extra={`${fin.receita.atendimentos} atendimento(s)`}
        />
        <KpiCard
          icon="groups"
          label="Folha"
          valor={fin.folha.total}
          cor="#C89933"
          prefixo="−"
          extra="comissões + salários"
        />
        <KpiCard
          icon="receipt_long"
          label="Despesas"
          valor={fin.despesas.total}
          cor="#EF4444"
          prefixo="−"
          extra={`${fin.despesas.lista.length} lançamento(s)`}
        />
        <KpiCard
          icon={lucroPositivo ? "savings" : "warning"}
          label="Lucro líquido"
          valor={fin.lucro}
          cor={lucroPositivo ? "#34D399" : "#EF4444"}
          destaque
        />
      </div>

      {/* Fórmula explicativa */}
      <div
        className="rounded-2xl px-4 py-3 mb-8 text-xs text-on-surface-variant flex flex-wrap items-center gap-x-2 gap-y-1"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span className="font-semibold text-on-surface">{BRL.format(fin.receita.total)}</span> faturamento
        <span className="text-outline">−</span>
        <span className="font-semibold text-on-surface">{BRL.format(fin.folha.total)}</span> folha
        <span className="text-outline">−</span>
        <span className="font-semibold text-on-surface">{BRL.format(fin.despesas.total)}</span> despesas
        <span className="text-outline">=</span>
        <span className="font-bold" style={{ color: lucroPositivo ? "#34D399" : "#EF4444" }}>
          {BRL.format(fin.lucro)}
        </span> lucro
        <a
          href={`/folha-pagamento?mes=${mesParam}`}
          className="ml-auto text-primary hover:underline whitespace-nowrap"
        >
          Ver folha detalhada →
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
        {/* Registrar despesa */}
        <section className="glass-card rounded-2xl p-5 h-fit">
          <h2 className="text-sm font-semibold text-on-surface mb-3">Registrar despesa</h2>
          <DespesaForm />

          {recorrentes.length > 0 && (
            <div className="mt-5 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-xs uppercase tracking-wider text-outline mb-1">Despesas fixas</p>
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {recorrentes.map((r) => (
                  <RecorrenteItem key={r.id} recorrente={r} />
                ))}
              </div>
            </div>
          )}

          {fin.despesas.porCategoria.length > 0 && (
            <div className="mt-5 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-xs uppercase tracking-wider text-outline mb-2">Por categoria</p>
              <div className="space-y-1.5">
                {fin.despesas.porCategoria.map((c) => (
                  <div key={c.categoria} className="flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">{CATEGORIA_LABEL[c.categoria]}</span>
                    <span className="text-on-surface font-medium">{BRL.format(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Lista de despesas */}
        <section className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-on-surface">Despesas de {periodo.label}</h2>
            {fin.despesas.total > 0 && (
              <span className="text-sm font-bold text-on-surface">{BRL.format(fin.despesas.total)}</span>
            )}
          </div>
          {fin.despesas.lista.length === 0 ? (
            <p className="text-sm text-on-surface-variant py-6 text-center">
              Nenhuma despesa registrada neste mês.
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {fin.despesas.lista.map((d) => (
                <DespesaItem key={d.id} despesa={d} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  icon, label, valor, cor, extra, prefixo = "", destaque = false,
}: {
  icon: string; label: string; valor: number; cor: string;
  extra?: string; prefixo?: string; destaque?: boolean;
}) {
  return (
    <div
      className="glass-card rounded-2xl p-4"
      style={destaque ? { border: `1px solid ${cor}55` } : undefined}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined" style={{ fontSize: "18px", color: cor }}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-outline">{label}</span>
      </div>
      <p className="text-lg md:text-xl font-bold" style={{ color: destaque ? cor : "var(--color-on-surface)" }}>
        {prefixo}{BRL.format(valor)}
      </p>
      {extra && <p className="text-[11px] text-on-surface-variant mt-0.5">{extra}</p>}
    </div>
  );
}
