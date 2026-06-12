import { createClient } from "@/lib/supabase/server";
import { AgendaEmptyState } from "@/components/agenda/empty-state";

type Agendamento = {
  id:               string;
  data_hora_inicio: string;
  data_hora_fim:    string;
  status:           string;
  observacoes:      string | null;
  cliente:          { nome: string } | { nome: string }[] | null;
  profissional:     { nome: string; cor: string | null } | { nome: string; cor: string | null }[] | null;
  servico:          { nome: string; preco: number } | { nome: string; preco: number }[] | null;
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

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

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatarData(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);

  if (d.toDateString() === hoje.toDateString()) return "Hoje";
  if (d.toDateString() === amanha.toDateString()) return "Amanhã";

  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day:     "2-digit",
    month:   "long",
  });
}

function dataChave(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AgendaPage() {
  const supabase = await createClient();

  // Hoje 00:00 (local) → próximos 30 dias
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + 30);

  const [
    { count: profCount },
    { count: servCount },
    { data: agendamentos },
  ] = await Promise.all([
    supabase.from("profissionais").select("id", { count: "exact", head: true }).eq("ativo", true),
    supabase.from("servicos").select("id", { count: "exact", head: true }).eq("ativo", true),
    supabase
      .from("agendamentos")
      .select(`
        id,
        data_hora_inicio,
        data_hora_fim,
        status,
        observacoes,
        cliente:clientes ( nome ),
        profissional:profissionais ( nome, cor ),
        servico:servicos ( nome, preco )
      `)
      .gte("data_hora_inicio", hoje.toISOString())
      .lt("data_hora_inicio", limite.toISOString())
      .order("data_hora_inicio")
      .returns<Agendamento[]>(),
  ]);

  const precisaSetup = (profCount ?? 0) === 0 || (servCount ?? 0) === 0;
  const lista        = agendamentos ?? [];

  // Agrupa por data (chave YYYY-MM-DD)
  const grupos = new Map<string, Agendamento[]>();
  for (const a of lista) {
    const chave = dataChave(a.data_hora_inicio);
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(a);
  }

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-5xl mx-auto">
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
            Próximos agendamentos
          </h1>
          <p className="text-sm text-on-surface-variant">
            {lista.length === 0
              ? "Nenhum agendamento marcado nos próximos 30 dias"
              : `${lista.length} ${lista.length === 1 ? "agendamento" : "agendamentos"} próximos`}
          </p>
        </div>

        {!precisaSetup && (
          <a
            href="/agenda/novo"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all-custom"
            style={{
              background: "linear-gradient(135deg,#E8D080,#C89933)",
              color: "#1D1A05",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>add</span>
            Novo agendamento
          </a>
        )}
      </div>

      {precisaSetup ? (
        <AgendaEmptyState />
      ) : lista.length === 0 ? (
        <ListaVazia />
      ) : (
        <ListaPorDia grupos={grupos} />
      )}
    </div>
  );
}

function ListaVazia() {
  return (
    <div className="glass-card rounded-3xl p-8 md:p-16 text-center max-w-2xl mx-auto">
      <span
        className="material-symbols-outlined text-primary block mx-auto mb-6"
        style={{ fontSize: "72px" }}
      >
        event_available
      </span>
      <h2
        className="text-2xl md:text-3xl font-bold text-on-surface mb-3"
        style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
      >
        Sua agenda está vazia
      </h2>
      <p className="text-base text-on-surface-variant max-w-md mx-auto mb-8">
        Marque o primeiro horário para começar.
      </p>
      <a
        href="/agenda/novo"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
        style={{
          background: "linear-gradient(135deg,#E8D080,#C89933)",
          color: "#1D1A05",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>add</span>
        Criar primeiro agendamento
      </a>
    </div>
  );
}

function ListaPorDia({ grupos }: { grupos: Map<string, Agendamento[]> }) {
  const chaves = Array.from(grupos.keys());

  return (
    <div className="space-y-6">
      {chaves.map((chave) => {
        const itens = grupos.get(chave)!;
        const primeiroISO = itens[0]!.data_hora_inicio;

        return (
          <div key={chave}>
            <h3
              className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-3 sticky top-0 py-2"
              style={{
                fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                background: "rgba(14,12,2,0.6)",
                backdropFilter: "blur(8px)",
              }}
            >
              {formatarData(primeiroISO)}
            </h3>
            <div className="glass-card rounded-2xl overflow-hidden">
              {itens.map((a) => (
                <AgendamentoLinha key={a.id} agendamento={a} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgendamentoLinha({ agendamento: a }: { agendamento: Agendamento }) {
  const cliente      = pickOne(a.cliente);
  const profissional = pickOne(a.profissional);
  const servico      = pickOne(a.servico);
  const statusInfo   = STATUS_INFO[a.status] ?? STATUS_INFO.agendado;

  const opacity = a.status === "cancelado" || a.status === "falta" ? "opacity-50" : "";

  return (
    <a
      href={`/agenda/${a.id}`}
      className={`flex items-center gap-3 md:gap-4 p-4 md:p-5 border-b hover:bg-white/5 transition-all-custom ${opacity}`}
      style={{ borderColor: "rgba(255,255,255,0.04)" }}
    >
      {/* Hora */}
      <div className="flex-shrink-0 w-14 text-center">
        <p className="text-lg font-bold text-on-surface tabular-nums">
          {formatarHora(a.data_hora_inicio)}
        </p>
        <p className="text-[10px] text-outline tabular-nums">
          até {formatarHora(a.data_hora_fim)}
        </p>
      </div>

      {/* Cor do profissional */}
      <div
        className="flex-shrink-0 w-1 h-12 rounded-full"
        style={{ background: profissional?.cor ?? "var(--color-primary-container)" }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface truncate">
          {cliente?.nome ?? "Cliente"}
        </p>
        <p className="text-xs text-on-surface-variant truncate">
          {servico?.nome ?? "Serviço"} · {profissional?.nome ?? "Profissional"}
        </p>
        {servico && (
          <p className="text-[10px] text-outline">{BRL.format(servico.preco)}</p>
        )}
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
          style={{
            background: statusInfo.bg,
            color: statusInfo.cor,
          }}
        >
          {statusInfo.label}
        </span>
      </div>
    </a>
  );
}
