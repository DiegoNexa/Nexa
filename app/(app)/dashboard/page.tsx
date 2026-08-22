import { createClient } from "@/lib/supabase/server";
import { BRL } from "@/lib/folha-pagamento";
import { carregarFinanceiro } from "@/lib/financeiro";
import {
  carregarGrafico,
  carregarDespesasAVencer,
  intervaloPeriodo,
  parsePeriodo,
} from "@/lib/dashboard";
import { AvisoAssinatura } from "@/components/app/aviso-assinatura";
import { GraficoFaturamento } from "@/components/dashboard/grafico-faturamento";
import { DespesasVencer } from "@/components/dashboard/despesas-vencer";
import { PeriodoToggle } from "@/components/dashboard/periodo-toggle";
import type { EstadoAssinatura } from "@/lib/planos";

type Props = { searchParams: Promise<{ periodo?: string }> };

type Agendamento = {
  id:               string;
  data_hora_inicio: string;
  status:           string;
  cliente:          { nome: string } | { nome: string }[] | null;
  profissional:     { nome: string; cor: string | null } | { nome: string; cor: string | null }[] | null;
  servico:          { nome: string } | { nome: string }[] | null;
};

type ProdutoBaixo = {
  id:                string;
  nome:              string;
  quantidade:        number;
  quantidade_minima: number;
  unidade:           string;
};

type ClienteAniv = { id: string; nome: string; data_nascimento: string };

const STATUS_INFO: Record<string, { label: string; cor: string; bg: string }> = {
  agendado:   { label: "Agendado",   cor: "#60A5FA", bg: "rgba(96,165,250,0.15)"  },
  confirmado: { label: "Confirmado", cor: "#34D399", bg: "rgba(52,211,153,0.15)"  },
  concluido:  { label: "Concluído",  cor: "#C89933", bg: "rgba(200,153,51,0.15)"  },
  cancelado:  { label: "Cancelado",  cor: "#9CA3AF", bg: "rgba(156,163,175,0.15)" },
  falta:      { label: "Falta",      cor: "#EF4444", bg: "rgba(239,68,68,0.15)"   },
};

const FONTE_MONO   = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace";
const FONTE_JAKARTA = "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif";

function pickOne<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
function fmtHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function fmtQtd(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export default async function DashboardPage({ searchParams }: Props) {
  const { periodo: periodoRaw } = await searchParams;
  const periodo  = parsePeriodo(periodoRaw);
  const intervalo = intervaloPeriodo(periodo);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Janela "hoje" para a agenda do dia
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const fimHoje = new Date(inicioHoje);
  fimHoje.setDate(fimHoje.getDate() + 1);

  const mesNumero = new Date().getMonth() + 1;   // 1-12, para aniversários

  const [
    { data: usuario },
    { data: agsHoje },
    { data: produtos },
    { data: clientes },
    financeiro,
    grafico,
    despesas,
  ] = await Promise.all([
    supabase
      .from("usuarios")
      .select("nome, saloes(assinatura_status, trial_termina_em, assinatura_atualizada_em)")
      .eq("id", user!.id)
      .single<{ nome: string; saloes: EstadoAssinatura | null }>(),
    supabase
      .from("agendamentos")
      .select(`
        id, data_hora_inicio, status,
        cliente:clientes ( nome ),
        profissional:profissionais ( nome, cor ),
        servico:servicos ( nome )
      `)
      .gte("data_hora_inicio", inicioHoje.toISOString())
      .lt("data_hora_inicio", fimHoje.toISOString())
      .order("data_hora_inicio")
      .returns<Agendamento[]>(),
    supabase
      .from("produtos")
      .select("id, nome, quantidade, quantidade_minima, unidade")
      .eq("ativo", true)
      .returns<ProdutoBaixo[]>(),
    supabase
      .from("clientes")
      .select("id, nome, data_nascimento")
      .not("data_nascimento", "is", null)
      .returns<ClienteAniv[]>(),
    carregarFinanceiro(supabase, {
      inicio: intervalo.inicio.toISOString(),
      fim:    intervalo.fim.toISOString(),
      label:  intervalo.label,
    }),
    carregarGrafico(supabase),
    carregarDespesasAVencer(supabase),
  ]);

  const primeiroNome     = usuario?.nome?.split(" ")[0] ?? "";
  const agendamentosHoje = agsHoje ?? [];
  const ativosHoje       = agendamentosHoje.filter((a) => a.status !== "cancelado" && a.status !== "falta");
  const produtosBaixos   = (produtos ?? []).filter((p) => p.quantidade <= p.quantidade_minima);

  const aniversariantes = (clientes ?? [])
    .filter((c) => Number(c.data_nascimento.slice(5, 7)) === mesNumero)
    .sort((a, b) => Number(a.data_nascimento.slice(8, 10)) - Number(b.data_nascimento.slice(8, 10)));

  const lucroPositivo = financeiro.lucro >= 0;
  const margem = financeiro.receita.total > 0
    ? Math.round((financeiro.lucro / financeiro.receita.total) * 100)
    : null;

  return (
    <div className="px-4 md:px-8 py-8 md:py-10 max-w-[1400px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-end justify-between gap-6 flex-wrap mb-6">
        <div>
          <p
            className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
            style={{ fontFamily: FONTE_MONO }}
          >
            Dashboard
          </p>
          <h1
            className="text-3xl md:text-4xl font-extrabold text-on-surface mb-1"
            style={{ fontFamily: FONTE_JAKARTA }}
          >
            {primeiroNome ? `Olá, ${primeiroNome}!` : "Olá!"}
          </h1>
          <p className="text-base text-on-surface-variant">
            Resumo do salão · {intervalo.label}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <PeriodoToggle atual={periodo} />
          <a
            href="/agenda/novo"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all-custom"
            style={{ background: "var(--color-primary)", color: "#1D1A05" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
            Novo agendamento
          </a>
        </div>
      </div>

      {/* Aviso de assinatura — só aparece quando há algo a dizer */}
      {usuario?.saloes && <AvisoAssinatura salao={usuario.saloes} />}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard
          icon="today" cor="#60A5FA" label="Agendamentos hoje"
          valor={String(ativosHoje.length)}
          extra={`${agendamentosHoje.length} no total`}
          href="/agenda"
        />
        <KpiCard
          icon="trending_up" cor="#34D399" label={`Faturamento · ${intervalo.label}`}
          valor={BRL.format(financeiro.receita.total)}
          extra={`${financeiro.receita.atendimentos} atendimento(s)`}
          href="/financeiro"
        />
        <KpiCard
          icon={lucroPositivo ? "savings" : "warning"}
          cor={lucroPositivo ? "#34D399" : "#EF4444"}
          label="Lucro do período"
          valor={BRL.format(financeiro.lucro)}
          extra={margem !== null ? `margem de ${margem}%` : "despesas fixas correndo"}
          href="/financeiro"
          destaque
        />
        <KpiCard
          icon="inventory_2"
          cor={produtosBaixos.length > 0 ? "#EF4444" : "#C89933"}
          label="Estoque em alerta"
          valor={String(produtosBaixos.length)}
          extra={produtosBaixos.length > 0 ? "reposição necessária" : "tudo ok"}
          href="/estoque"
        />
      </div>

      {/* Grade principal — gráfico (2 col) + despesas a vencer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <GraficoFaturamento dados={grafico} />
        </div>

        <DespesasVencer lista={despesas.lista} total={despesas.total} />

        {/* Agenda de hoje (2 col) */}
        <section className="glass-card rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-on-surface">Agenda de hoje</h2>
            <a href="/agenda" className="text-xs text-primary hover:underline">Ver agenda →</a>
          </div>
          {agendamentosHoje.length === 0 ? (
            <p className="text-sm text-on-surface-variant py-14 text-center">
              Nenhum agendamento para hoje.
            </p>
          ) : (
            <div className="flex flex-col">
              {agendamentosHoje.map((a, i) => {
                const cliente = pickOne(a.cliente);
                const prof    = pickOne(a.profissional);
                const serv    = pickOne(a.servico);
                const st      = STATUS_INFO[a.status] ?? STATUS_INFO.agendado;
                const dim     = a.status === "cancelado" || a.status === "falta" ? "opacity-50" : "";
                return (
                  <a
                    key={a.id}
                    href={`/agenda/${a.id}`}
                    className={`flex items-center gap-3 py-2.5 hover:bg-white/5 -mx-2 px-2 rounded-lg transition-all-custom ${dim}`}
                    style={
                      i < agendamentosHoje.length - 1
                        ? { borderBottom: "1px solid rgba(255,255,255,0.06)" }
                        : undefined
                    }
                  >
                    <p className="w-11 flex-shrink-0 text-center text-[13px] font-bold text-on-surface tabular-nums">
                      {fmtHora(a.data_hora_inicio)}
                    </p>
                    <div
                      className="w-1 h-9 rounded-full flex-shrink-0"
                      style={{ background: prof?.cor ?? "var(--color-primary-container)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-on-surface truncate">
                        {cliente?.nome ?? "Cliente"}
                      </p>
                      <p className="text-[11px] text-on-surface-variant truncate">
                        {serv?.nome ?? "Serviço"} · {prof?.nome ?? "Profissional"}
                      </p>
                    </div>
                    <span
                      className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: st.bg, color: st.cor }}
                    >
                      {st.label}
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </section>

        {/* Estoque baixo + Aniversariantes */}
        <section className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-on-surface">Estoque baixo</h2>
            <a href="/estoque" className="text-xs text-primary hover:underline">Estoque →</a>
          </div>
          {produtosBaixos.length === 0 ? (
            <p className="text-sm text-on-surface-variant py-1">Nenhum produto em alerta.</p>
          ) : (
            <div className="space-y-2.5">
              {produtosBaixos.slice(0, 4).map((p) => (
                <a key={p.id} href={`/estoque/${p.id}`} className="flex items-center justify-between gap-2 group">
                  <span className="text-[13px] text-on-surface truncate group-hover:text-primary transition-all-custom">
                    {p.nome}
                  </span>
                  <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#EF4444" }}>
                    {fmtQtd(p.quantidade)} {p.unidade}
                  </span>
                </a>
              ))}
              {produtosBaixos.length > 4 && (
                <p className="text-xs text-outline pt-0.5">+ {produtosBaixos.length - 4} outro(s)</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 mb-3">
            <h2 className="text-sm font-semibold text-on-surface">Aniversariantes do mês</h2>
            <a href="/clientes" className="text-xs text-primary hover:underline">Clientes →</a>
          </div>
          {aniversariantes.length === 0 ? (
            <p className="text-sm text-on-surface-variant py-1">Ninguém faz aniversário este mês.</p>
          ) : (
            <div className="space-y-2.5">
              {aniversariantes.slice(0, 4).map((c) => (
                <a key={c.id} href={`/clientes/${c.id}`} className="flex items-center gap-2 group">
                  <span className="material-symbols-outlined text-primary flex-shrink-0" style={{ fontSize: "18px" }}>
                    cake
                  </span>
                  <span className="text-[13px] text-on-surface truncate flex-1 group-hover:text-primary transition-all-custom">
                    {c.nome}
                  </span>
                  <span className="text-xs text-on-surface-variant flex-shrink-0">
                    dia {c.data_nascimento.slice(8, 10)}
                  </span>
                </a>
              ))}
              {aniversariantes.length > 4 && (
                <p className="text-xs text-outline pt-0.5">+ {aniversariantes.length - 4} outro(s)</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  icon, cor, label, valor, extra, href, destaque = false,
}: {
  icon: string; cor: string; label: string; valor: string;
  extra?: string; href: string; destaque?: boolean;
}) {
  return (
    <a
      href={href}
      className="glass-card rounded-2xl p-4 md:p-5 hover:bg-white/5 transition-all-custom block"
      style={destaque ? { border: `1px solid ${cor}55` } : undefined}
    >
      <div
        className="flex items-center justify-center rounded-xl mb-3"
        style={{ width: 40, height: 40, background: `${cor}1F` }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "20px", color: cor }}>{icon}</span>
      </div>
      <p className="text-[11px] uppercase tracking-wider text-outline mb-1 truncate">{label}</p>
      <p
        className="text-xl md:text-2xl font-bold"
        style={{ color: destaque ? cor : "var(--color-on-surface)", fontFamily: FONTE_JAKARTA }}
      >
        {valor}
      </p>
      {extra && <p className="text-[11px] text-on-surface-variant mt-1">{extra}</p>}
    </a>
  );
}
