import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusActions, ExcluirAgendamentoButton } from "@/components/agenda/status-actions";
import { ObservacoesForm } from "@/components/agenda/observacoes-form";

type Props = {
  params: Promise<{ id: string }>;
};

type Agendamento = {
  id:               string;
  data_hora_inicio: string;
  data_hora_fim:    string;
  status:           string;
  origem:           string;
  observacoes:      string | null;
  created_at:       string;
  cliente:          { id: string; nome: string; telefone: string | null } | { id: string; nome: string; telefone: string | null }[] | null;
  profissional:     { id: string; nome: string; cor: string | null } | { id: string; nome: string; cor: string | null }[] | null;
  servico:          { id: string; nome: string; duracao_minutos: number; preco: number } | { id: string; nome: string; duracao_minutos: number; preco: number }[] | null;
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_INFO: Record<string, { label: string; cor: string; bg: string }> = {
  agendado:   { label: "Agendado",   cor: "#60A5FA", bg: "rgba(96,165,250,0.15)"  },
  confirmado: { label: "Confirmado", cor: "#34D399", bg: "rgba(52,211,153,0.15)"  },
  concluido:  { label: "Concluído",  cor: "#C89933", bg: "rgba(200,153,51,0.15)"  },
  cancelado:  { label: "Cancelado",  cor: "#9CA3AF", bg: "rgba(156,163,175,0.15)" },
  falta:      { label: "Falta",      cor: "#EF4444", bg: "rgba(239,68,68,0.15)"   },
};

const ORIGEM_LABEL: Record<string, string> = {
  manual:       "Cadastrado manualmente",
  whatsapp:     "WhatsApp",
  link_publico: "Link público",
};

function pickOne<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    weekday: "long",
    day:     "2-digit",
    month:   "long",
    year:    "numeric",
    hour:    "2-digit",
    minute:  "2-digit",
  });
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatarTelefone(t: string | null): string {
  if (!t) return "—";
  if (t.length === 11) return `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}`;
  if (t.length === 10) return `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}`;
  return t;
}

export default async function AgendamentoDetalhePage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: agendamento } = await supabase
    .from("agendamentos")
    .select(`
      id,
      data_hora_inicio,
      data_hora_fim,
      status,
      origem,
      observacoes,
      created_at,
      cliente:clientes ( id, nome, telefone ),
      profissional:profissionais ( id, nome, cor ),
      servico:servicos ( id, nome, duracao_minutos, preco )
    `)
    .eq("id", id)
    .single<Agendamento>();

  if (!agendamento) notFound();

  const cliente      = pickOne(agendamento.cliente);
  const profissional = pickOne(agendamento.profissional);
  const servico      = pickOne(agendamento.servico);
  const statusInfo   = STATUS_INFO[agendamento.status] ?? STATUS_INFO.agendado;

  // Concluído não pode mais cancelar (já entrou na folha)
  const podeCancelar = agendamento.status !== "concluido";

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-2xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <a
          href="/agenda"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-all-custom mb-4"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_back</span>
          Voltar para agenda
        </a>

        <p
          className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
          style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
        >
          Agendamento
        </p>
        <h1
          className="text-2xl md:text-3xl font-bold text-on-surface mb-2"
          style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          {cliente?.nome ?? "Cliente removido"}
        </h1>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: statusInfo.bg, color: statusInfo.cor }}
          >
            {statusInfo.label}
          </span>
          <span className="text-xs text-outline">·</span>
          <span className="text-xs text-on-surface-variant">
            {ORIGEM_LABEL[agendamento.origem] ?? agendamento.origem}
          </span>
        </div>
      </div>

      {/* Cards de informação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <InfoCard
          icon="event"
          label="Data e hora"
          value={formatarDataHora(agendamento.data_hora_inicio)}
          extra={`até ${formatarHora(agendamento.data_hora_fim)}`}
        />
        <InfoCard
          icon="design_services"
          label="Serviço"
          value={servico?.nome ?? "—"}
          extra={servico ? `${BRL.format(servico.preco)} · ${servico.duracao_minutos}min` : ""}
        />
        <InfoCard
          icon="content_cut"
          label="Profissional"
          value={profissional?.nome ?? "—"}
          cor={profissional?.cor ?? undefined}
        />
        <InfoCard
          icon="phone"
          label="Telefone do cliente"
          value={formatarTelefone(cliente?.telefone ?? null)}
        />
      </div>

      {/* Observações */}
      <div className="glass-card rounded-2xl p-4 md:p-5 mb-6">
        <p className="text-xs uppercase tracking-wider text-outline mb-2">Observações</p>
        <ObservacoesForm id={agendamento.id} observacoes={agendamento.observacoes} />
      </div>

      {/* Status actions */}
      <div className="glass-card rounded-2xl p-4 md:p-5 mb-6">
        <StatusActions
          id={agendamento.id}
          statusAtual={agendamento.status}
          podeCancelar={podeCancelar}
        />
      </div>

      {/* Exclusão (só se não concluído) */}
      <ExcluirAgendamentoButton id={agendamento.id} status={agendamento.status} />
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  extra,
  cor,
}: {
  icon:   string;
  label:  string;
  value:  string;
  extra?: string;
  cor?:   string;
}) {
  return (
    <div className="glass-card rounded-2xl p-4 flex gap-3 items-start">
      <div
        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ background: cor ? `${cor}30` : "rgba(200,153,51,0.12)" }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: "20px", color: cor ?? "var(--color-primary)" }}
        >
          {icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-outline mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-on-surface truncate">{value}</p>
        {extra && <p className="text-xs text-on-surface-variant mt-0.5">{extra}</p>}
      </div>
    </div>
  );
}
