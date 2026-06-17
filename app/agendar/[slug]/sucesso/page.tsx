import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatarBRL, formatarDuracao } from "@/lib/agendar-publico";

type Props = {
  params:       Promise<{ slug: string }>;
  searchParams: Promise<{ id?: string }>;
};

type Confirmacao = {
  salao_nome:         string;
  cliente_nome:       string;
  profissional_nome:  string;
  profissional_cor:   string | null;
  servico_nome:       string;
  servico_preco:      number;
  servico_duracao:    number;
  data_hora_inicio:   string;
  data_hora_fim:      string;
  status:             string;
};

function formatarDataHoraLonga(iso: string): string {
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

export default async function SucessoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { id }   = await searchParams;

  if (!id) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_confirmacao_publico", {
    p_slug:           slug,
    p_agendamento_id: id,
  });

  if (error || !data) notFound();
  const c = data as Confirmacao;

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-8 md:py-16">
      {/* Aurora */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-25 animate-aurora"
          style={{ background: "var(--color-primary-container)", top: "-200px", left: "-200px" }}
        />
      </div>

      <div className="w-full max-w-lg">
        <div className="glass-card rounded-3xl p-8 md:p-10 text-center hero-enter">
          {/* Check em destaque */}
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ background: "rgba(200,153,51,0.12)" }}
          >
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontSize: "48px" }}
            >
              check_circle
            </span>
          </div>

          <p
            className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
            style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
          >
            Agendamento confirmado
          </p>
          <h1
            className="text-2xl md:text-3xl font-bold text-on-surface mb-2"
            style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
          >
            Tudo certo, {c.cliente_nome.split(" ")[0]}!
          </h1>
          <p className="text-sm text-on-surface-variant mb-8">
            Seu horário no <strong className="text-on-surface">{c.salao_nome}</strong> está marcado.
          </p>

          {/* Detalhes em cards */}
          <div className="space-y-3 text-left mb-8">
            <Detalhe
              icon="event"
              label="Data e hora"
              value={formatarDataHoraLonga(c.data_hora_inicio)}
              extra={`Até ${formatarHora(c.data_hora_fim)}`}
            />
            <Detalhe
              icon="design_services"
              label="Serviço"
              value={c.servico_nome}
              extra={`${formatarBRL(c.servico_preco)} · ${formatarDuracao(c.servico_duracao)}`}
            />
            <Detalhe
              icon="content_cut"
              label="Profissional"
              value={c.profissional_nome}
              cor={c.profissional_cor ?? undefined}
            />
          </div>

          {/* Aviso */}
          <div
            className="rounded-xl px-4 py-3 text-xs text-left mb-6"
            style={{
              background: "rgba(200,153,51,0.06)",
              border: "1px solid rgba(200,153,51,0.2)",
            }}
          >
            <p className="text-on-surface-variant">
              <strong className="text-on-surface">Salve este horário no celular.</strong> Se precisar
              cancelar ou alterar, entre em contato direto com o salão.
            </p>
          </div>

          <a
            href={`/agendar/${slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-all-custom"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
            Marcar outro horário
          </a>
        </div>

        <p className="text-xs text-outline text-center mt-6">
          Agendamento direto pelo sistema da{" "}
          <span className="text-primary font-semibold">Nexa</span>.
        </p>
      </div>
    </div>
  );
}

function Detalhe({
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
        <p className="text-sm font-semibold text-on-surface">{value}</p>
        {extra && <p className="text-xs text-on-surface-variant mt-0.5">{extra}</p>}
      </div>
    </div>
  );
}
