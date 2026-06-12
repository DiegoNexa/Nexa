import { createClient } from "@/lib/supabase/server";
import { AgendamentoForm } from "@/components/agenda/agendamento-form";

type Props = {
  searchParams: Promise<{ profissional?: string; data?: string }>;
};

/**
 * Calcula próximo slot disponível arredondado para o próximo 30min.
 * Se já passou de :30, vai pra próxima hora cheia.
 */
function proximoSlot(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  if (d.getMinutes() < 30) {
    d.setMinutes(30);
  } else {
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
  }
  // Formato datetime-local: YYYY-MM-DDTHH:mm (sem timezone)
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  const hh   = String(d.getHours()).padStart(2, "0");
  const min  = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export default async function NovoAgendamentoPage({ searchParams }: Props) {
  const sp = await searchParams;

  const supabase = await createClient();

  // Carrega tudo em paralelo
  const [
    { data: profissionais },
    { data: servicos },
    { data: clientes },
    { data: bloqueios },
  ] = await Promise.all([
    supabase
      .from("profissionais")
      .select("id, nome, cor")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("servicos")
      .select("id, nome, duracao_minutos, preco")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("clientes")
      .select("id, nome, telefone")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("comissoes_config")
      .select("profissional_id, servico_id")
      .eq("atende", false),
  ]);

  const profissionaisAtivos = profissionais ?? [];
  const servicosAtivos      = servicos ?? [];
  const clientesAtivos      = clientes ?? [];
  const naoAtende           = bloqueios ?? [];

  const faltaSetup =
    profissionaisAtivos.length === 0 ||
    servicosAtivos.length === 0 ||
    clientesAtivos.length === 0;

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-2xl mx-auto">
      <div className="mb-6">
        <a
          href="/agenda"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-all-custom mb-4"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_back</span>
          Voltar
        </a>
        <p
          className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
          style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
        >
          Novo agendamento
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold text-on-surface mb-1"
          style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          Marcar horário
        </h1>
        <p className="text-sm text-on-surface-variant">
          Selecione profissional, serviço, cliente e horário.
        </p>
      </div>

      {faltaSetup ? (
        <FaltaSetup
          faltaProfissional={profissionaisAtivos.length === 0}
          faltaServico={servicosAtivos.length === 0}
          faltaCliente={clientesAtivos.length === 0}
        />
      ) : (
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          <AgendamentoForm
            profissionais={profissionaisAtivos}
            servicos={servicosAtivos}
            clientes={clientesAtivos}
            naoAtende={naoAtende}
            preProfissionalId={sp.profissional}
            preDataHora={sp.data ?? proximoSlot()}
          />
        </div>
      )}
    </div>
  );
}

function FaltaSetup({
  faltaProfissional,
  faltaServico,
  faltaCliente,
}: {
  faltaProfissional: boolean;
  faltaServico:      boolean;
  faltaCliente:      boolean;
}) {
  return (
    <div className="glass-card rounded-2xl p-6 md:p-8 text-center">
      <span
        className="material-symbols-outlined text-primary block mx-auto mb-4"
        style={{ fontSize: "56px" }}
      >
        priority_high
      </span>
      <h2
        className="text-xl font-bold text-on-surface mb-2"
        style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
      >
        Pré-requisitos faltando
      </h2>
      <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
        Para marcar um agendamento, você precisa ter cadastrados:
      </p>

      <div className="space-y-2 max-w-sm mx-auto mb-6">
        <ItemFalta
          ok={!faltaProfissional}
          label="Pelo menos 1 profissional ativo"
          href="/profissionais/novo"
        />
        <ItemFalta
          ok={!faltaServico}
          label="Pelo menos 1 serviço ativo"
          href="/servicos/novo"
        />
        <ItemFalta
          ok={!faltaCliente}
          label="Pelo menos 1 cliente cadastrado"
          href="/clientes/novo"
        />
      </div>
    </div>
  );
}

function ItemFalta({ ok, label, href }: { ok: boolean; label: string; href: string }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: ok ? "rgba(200,153,51,0.08)" : "rgba(255,255,255,0.04)",
        border: ok ? "1px solid rgba(200,153,51,0.3)" : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span
        className="material-symbols-outlined flex-shrink-0"
        style={{
          fontSize: "20px",
          color: ok ? "var(--color-primary)" : "var(--color-outline)",
        }}
      >
        {ok ? "check_circle" : "radio_button_unchecked"}
      </span>
      <span className="flex-1 text-sm text-on-surface text-left">{label}</span>
      {!ok && (
        <a
          href={href}
          className="text-xs text-primary hover:underline whitespace-nowrap"
        >
          Cadastrar →
        </a>
      )}
    </div>
  );
}
