import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MesSelector } from "@/components/folha-pagamento/mes-selector";
import { MovimentoForm } from "@/components/folha-pagamento/movimento-form";
import { MovimentoItem } from "@/components/folha-pagamento/movimento-item";
import {
  BRL,
  carregarFolha,
  formatarDataHoraBR,
  parseMesParam,
} from "@/lib/folha-pagamento";

type Props = {
  params:       Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string }>;
};

export default async function FolhaProfissionalPage({ params, searchParams }: Props) {
  const { id }  = await params;
  const { mes } = await searchParams;
  const periodo = parseMesParam(mes);
  const mesParam = periodo.inicio.slice(0, 7);

  const supabase = await createClient();
  const folha    = await carregarFolha(supabase, id, periodo);

  if (!folha) notFound();

  const { profissional, atendimentos, movimentos, totais } = folha;

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <a
          href="/folha-pagamento"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-all-custom mb-4"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_back</span>
          Voltar pra folha
        </a>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg text-white"
              style={{
                background: profissional.cor ?? "var(--color-primary-container)",
                border: "2px solid rgba(255,255,255,0.1)",
              }}
            >
              {profissional.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <p
                className="text-xs font-medium tracking-widest text-primary uppercase mb-1"
                style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
              >
                Folha de pagamento
              </p>
              <h1
                className="text-2xl md:text-3xl font-bold text-on-surface"
                style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
              >
                {profissional.nome}
              </h1>
              <p className="text-sm text-on-surface-variant">{periodo.label}</p>
            </div>
          </div>

          <MesSelector />
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <ResumoCard
          icon="payments"
          label="Comissão bruta"
          value={BRL.format(totais.comissao_bruta)}
        />
        <ResumoCard
          icon="remove_circle"
          label="Descontos"
          value={BRL.format(totais.descontos)}
          color={totais.descontos > 0 ? "var(--color-error)" : undefined}
        />
        <ResumoCard
          icon="star"
          label="Bônus"
          value={BRL.format(totais.bonus)}
          color={totais.bonus > 0 ? "var(--color-primary)" : undefined}
        />
        <ResumoCard
          icon="account_balance_wallet"
          label="Líquido"
          value={BRL.format(totais.liquido)}
          highlight
        />
      </div>

      {/* Atendimentos */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-lg font-bold text-on-surface"
            style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
          >
            Atendimentos do período
          </h2>
          <span className="text-xs text-outline">
            {atendimentos.length} {atendimentos.length === 1 ? "atendimento" : "atendimentos"}
          </span>
        </div>

        {atendimentos.length === 0 ? (
          <div className="glass-card rounded-xl p-6 text-center text-sm text-on-surface-variant">
            Nenhum atendimento concluído no período.
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            {atendimentos.map((a) => (
              <div
                key={a.id}
                className="grid grid-cols-[1fr_auto] md:grid-cols-[1.5fr_2fr_1fr_1fr] gap-3 px-4 py-3 border-b items-center"
                style={{ borderColor: "rgba(255,255,255,0.04)" }}
              >
                <div className="min-w-0">
                  <p className="text-xs text-on-surface-variant">{formatarDataHoraBR(a.data_hora_inicio)}</p>
                  <p className="text-sm font-medium text-on-surface truncate">{a.cliente_nome}</p>
                </div>
                <p className="hidden md:block text-sm text-on-surface-variant truncate">{a.servico_nome}</p>
                <p className="hidden md:block text-right text-sm text-on-surface-variant">
                  {BRL.format(a.servico_preco)} · {a.percentual}%
                </p>
                <p className="text-right text-sm font-bold text-primary whitespace-nowrap">
                  {BRL.format(a.comissao_valor)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Movimentos */}
      <section className="mb-8">
        <h2
          className="text-lg font-bold text-on-surface mb-3"
          style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          Movimentos da folha
        </h2>

        {/* Form (collapsible) */}
        <div className="mb-3">
          <MovimentoForm profissionalId={profissional.id} />
        </div>

        {movimentos.length === 0 ? (
          <div className="glass-card rounded-xl p-6 text-center text-sm text-on-surface-variant">
            Nenhum movimento neste período.
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-3 space-y-2">
            {movimentos.map((m) => (
              <MovimentoItem key={m.id} movimento={m} profissionalId={profissional.id} />
            ))}
          </div>
        )}
      </section>

      {/* Botões de PDF */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href={`/api/folha-pagamento/${profissional.id}/pdf/funcionario?mes=${mesParam}`}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all-custom hover:bg-white/5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--color-on-surface)",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>person</span>
          Baixar PDF — Funcionário
        </a>
        <a
          href={`/api/folha-pagamento/${profissional.id}/pdf/empregador?mes=${mesParam}`}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all-custom"
          style={{
            background: "linear-gradient(135deg,#E8D080,#C89933)",
            color: "#1D1A05",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>storefront</span>
          Baixar PDF — Empregador
        </a>
      </section>
    </div>
  );
}

function ResumoCard({
  icon,
  label,
  value,
  color,
  highlight,
}: {
  icon:       string;
  label:      string;
  value:      string;
  color?:     string;
  highlight?: boolean;
}) {
  return (
    <div
      className="glass-card rounded-2xl p-3 md:p-4 text-center"
      style={highlight ? { borderColor: "rgba(200,153,51,0.3)" } : undefined}
    >
      <span
        className="material-symbols-outlined block mx-auto mb-1"
        style={{ fontSize: "22px", color: color ?? "var(--color-primary)" }}
      >
        {icon}
      </span>
      <p className="text-[10px] uppercase tracking-wider text-outline mb-0.5">{label}</p>
      <p
        className="text-sm md:text-base font-bold leading-tight break-words"
        style={{ color: highlight ? "var(--color-primary)" : (color ?? "var(--color-on-surface)") }}
      >
        {value}
      </p>
    </div>
  );
}
