import { createClient } from "@/lib/supabase/server";
import { BRL, mesAtual } from "@/lib/folha-pagamento";
import { carregarFinanceiro } from "@/lib/financeiro";

type Agendamento = {
  id:               string;
  data_hora_inicio: string;
  data_hora_fim:    string;
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

type ClienteAniv = {
  id:              string;
  nome:            string;
  data_nascimento: string;
};

const STATUS_INFO: Record<string, { label: string; cor: string; bg: string }> = {
  agendado:   { label: "Agendado",   cor: "#60A5FA", bg: "rgba(96,165,250,0.15)"  },
  confirmado: { label: "Confirmado", cor: "#34D399", bg: "rgba(52,211,153,0.15)"  },
  concluido:  { label: "Concluído",  cor: "#C89933", bg: "rgba(200,153,51,0.15)"  },
  cancelado:  { label: "Cancelado",  cor: "#9CA3AF", bg: "rgba(156,163,175,0.15)" },
  falta:      { label: "Falta",      cor: "#EF4444", bg: "rgba(239,68,68,0.15)"   },
};

function pickOne<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
function fmtHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function fmtQtd(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Janela "hoje" (00:00 → 24:00)
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const fimHoje = new Date(inicioHoje);
  fimHoje.setDate(fimHoje.getDate() + 1);

  const periodoMes = mesAtual();
  const mesNumero  = new Date().getMonth() + 1;  // 1-12 para aniversários

  const [
    { data: usuario },
    { data: agsHoje },
    { data: produtos },
    { data: clientes },
    financeiro,
  ] = await Promise.all([
    supabase.from("usuarios").select("nome").eq("id", user!.id).single<{ nome: string }>(),
    supabase
      .from("agendamentos")
      .select(`
        id, data_hora_inicio, data_hora_fim, status,
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
    carregarFinanceiro(supabase, periodoMes),
  ]);

  const primeiroNome = usuario?.nome?.split(" ")[0] ?? "";
  const agendamentosHoje = agsHoje ?? [];
  const ativosHoje = agendamentosHoje.filter((a) => a.status !== "cancelado" && a.status !== "falta");

  const produtosBaixos = (produtos ?? []).filter((p) => p.quantidade <= p.quantidade_minima);

  // Aniversariantes do mês corrente, ordenados por dia
  const aniversariantes = (clientes ?? [])
    .filter((c) => Number(c.data_nascimento.slice(5, 7)) === mesNumero)
    .sort((a, b) => Number(a.data_nascimento.slice(8, 10)) - Number(b.data_nascimento.slice(8, 10)));

  const lucroPositivo = financeiro.lucro >= 0;

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <p
          className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
          style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
        >
          Dashboard
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold text-on-surface mb-1"
          style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          {primeiroNome ? `Olá, ${primeiroNome}!` : "Olá!"}
        </h1>
        <p className="text-base text-on-surface-variant">
          Resumo do salão · {periodoMes.label}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icon="today"        cor="#60A5FA" label="Agendamentos hoje" valor={String(ativosHoje.length)} extra={`${agendamentosHoje.length} no total`} href="/agenda" />
        <KpiCard icon="trending_up"  cor="#34D399" label="Faturamento do mês" valor={BRL.format(financeiro.receita.total)} extra={`${financeiro.receita.atendimentos} atendimento(s)`} href="/financeiro" />
        <KpiCard icon={lucroPositivo ? "savings" : "warning"} cor={lucroPositivo ? "#34D399" : "#EF4444"} label="Lucro do mês" valor={BRL.format(financeiro.lucro)} destaque href="/financeiro" />
        <KpiCard icon="inventory_2"  cor={produtosBaixos.length > 0 ? "#EF4444" : "#C89933"} label="Estoque em alerta" valor={String(produtosBaixos.length)} extra={produtosBaixos.length > 0 ? "reposição necessária" : "tudo ok"} href="/estoque" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* Agenda de hoje */}
        <section className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-on-surface">Agenda de hoje</h2>
            <a href="/agenda" className="text-xs text-primary hover:underline">Ver agenda →</a>
          </div>
          {agendamentosHoje.length === 0 ? (
            <p className="text-sm text-on-surface-variant py-6 text-center">
              Nenhum agendamento para hoje.
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {agendamentosHoje.map((a) => {
                const cliente = pickOne(a.cliente);
                const prof    = pickOne(a.profissional);
                const serv    = pickOne(a.servico);
                const st      = STATUS_INFO[a.status] ?? STATUS_INFO.agendado;
                const dim     = a.status === "cancelado" || a.status === "falta" ? "opacity-50" : "";
                return (
                  <a
                    key={a.id}
                    href={`/agenda/${a.id}`}
                    className={`flex items-center gap-3 py-3 hover:bg-white/5 -mx-2 px-2 rounded-lg transition-all-custom ${dim}`}
                  >
                    <div className="flex-shrink-0 w-12 text-center">
                      <p className="text-sm font-bold text-on-surface tabular-nums">{fmtHora(a.data_hora_inicio)}</p>
                    </div>
                    <div
                      className="flex-shrink-0 w-1 h-9 rounded-full"
                      style={{ background: prof?.cor ?? "var(--color-primary-container)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{cliente?.nome ?? "Cliente"}</p>
                      <p className="text-xs text-on-surface-variant truncate">
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

        {/* Coluna lateral: alertas + aniversários */}
        <div className="space-y-6">
          {/* Estoque baixo */}
          <section className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-on-surface">Estoque baixo</h2>
              <a href="/estoque" className="text-xs text-primary hover:underline">Estoque →</a>
            </div>
            {produtosBaixos.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-2">Nenhum produto em alerta.</p>
            ) : (
              <div className="space-y-2">
                {produtosBaixos.slice(0, 6).map((p) => (
                  <a key={p.id} href={`/estoque/${p.id}`} className="flex items-center justify-between gap-2 group">
                    <span className="text-sm text-on-surface truncate group-hover:text-primary transition-all-custom">{p.nome}</span>
                    <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#EF4444" }}>
                      {fmtQtd(p.quantidade)} {p.unidade}
                    </span>
                  </a>
                ))}
                {produtosBaixos.length > 6 && (
                  <p className="text-xs text-outline pt-1">+ {produtosBaixos.length - 6} outro(s)</p>
                )}
              </div>
            )}
          </section>

          {/* Aniversariantes do mês */}
          <section className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-on-surface">Aniversariantes do mês</h2>
              <a href="/clientes" className="text-xs text-primary hover:underline">Clientes →</a>
            </div>
            {aniversariantes.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-2">Ninguém faz aniversário este mês.</p>
            ) : (
              <div className="space-y-2">
                {aniversariantes.slice(0, 6).map((c) => (
                  <a key={c.id} href={`/clientes/${c.id}`} className="flex items-center gap-2 group">
                    <span className="material-symbols-outlined text-primary flex-shrink-0" style={{ fontSize: "18px" }}>cake</span>
                    <span className="text-sm text-on-surface truncate flex-1 group-hover:text-primary transition-all-custom">{c.nome}</span>
                    <span className="text-xs text-on-surface-variant flex-shrink-0">dia {c.data_nascimento.slice(8, 10)}</span>
                  </a>
                ))}
                {aniversariantes.length > 6 && (
                  <p className="text-xs text-outline pt-1">+ {aniversariantes.length - 6} outro(s)</p>
                )}
              </div>
            )}
          </section>
        </div>
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
      {/* Caixa de ícone colorida (estilo stat card) */}
      <div
        className="flex items-center justify-center rounded-xl mb-3"
        style={{ width: 40, height: 40, background: `${cor}1F` }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "20px", color: cor }}>{icon}</span>
      </div>
      <p className="text-[11px] uppercase tracking-wider text-outline mb-1">{label}</p>
      <p className="text-xl md:text-2xl font-bold" style={{ color: destaque ? cor : "var(--color-on-surface)" }}>
        {valor}
      </p>
      {extra && <p className="text-[11px] text-on-surface-variant mt-1">{extra}</p>}
    </a>
  );
}
