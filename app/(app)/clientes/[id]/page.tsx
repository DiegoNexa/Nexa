import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { DeleteClienteButton } from "@/components/clientes/delete-cliente-button";
import { atualizarCliente } from "../actions";

type Props = {
  params: Promise<{ id: string }>;
};

function formatarData(iso: string | null): string {
  if (!iso) return "Nunca atendida";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day:   "2-digit",
    month: "long",
    year:  "numeric",
  });
}

export default async function EditarClientePage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  // Busca cliente + estatísticas em paralelo
  const [{ data: cliente }, { count: totalAtendimentos }, { count: agendamentosFuturos }] =
    await Promise.all([
      supabase
        .from("clientes")
        .select("id, nome, telefone, email, data_nascimento, observacoes, ultima_visita, created_at")
        .eq("id", id)
        .single<{
          id:              string;
          nome:            string;
          telefone:        string | null;
          email:           string | null;
          data_nascimento: string | null;
          observacoes:     string | null;
          ultima_visita:   string | null;
          created_at:      string;
        }>(),
      supabase
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .eq("cliente_id", id)
        .eq("status", "concluido"),
      supabase
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .eq("cliente_id", id)
        .in("status", ["agendado", "confirmado"])
        .gte("data_hora_inicio", new Date().toISOString()),
    ]);

  if (!cliente) notFound();

  const updateAction = atualizarCliente.bind(null, cliente.id);

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-2xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <a
          href="/clientes"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-all-custom mb-4"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_back</span>
          Voltar
        </a>
        <p
          className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
          style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
        >
          Editar
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold text-on-surface mb-1"
          style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          {cliente.nome}
        </h1>
        <p className="text-sm text-on-surface-variant">
          Cadastrado em {formatarData(cliente.created_at)}
        </p>
      </div>

      {/* Estatísticas: 3 cards lado a lado */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          icon="event_repeat"
          label="Última visita"
          value={formatarData(cliente.ultima_visita)}
        />
        <StatCard
          icon="check_circle"
          label="Atendimentos"
          value={(totalAtendimentos ?? 0).toString()}
        />
        <StatCard
          icon="upcoming"
          label="Agendados"
          value={(agendamentosFuturos ?? 0).toString()}
        />
      </div>

      <ClienteForm
        action={updateAction}
        initial={{
          nome:            cliente.nome,
          telefone:        cliente.telefone,
          email:           cliente.email,
          data_nascimento: cliente.data_nascimento,
          observacoes:     cliente.observacoes,
        }}
        submitLabel="Salvar alterações"
        pendingLabel="Salvando..."
      />

      {/* Zona de risco — exclusão definitiva */}
      <DeleteClienteButton id={cliente.id} nome={cliente.nome} />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="glass-card rounded-2xl p-3 md:p-4 text-center">
      <span
        className="material-symbols-outlined text-primary block mx-auto mb-1"
        style={{ fontSize: "22px" }}
      >
        {icon}
      </span>
      <p className="text-[10px] uppercase tracking-wider text-outline mb-0.5">{label}</p>
      <p className="text-xs md:text-sm font-semibold text-on-surface leading-tight break-words">
        {value}
      </p>
    </div>
  );
}
