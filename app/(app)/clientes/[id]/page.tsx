import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClienteForm } from "@/components/clientes/cliente-form";
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
  const { data: cliente } = await supabase
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
    }>();

  if (!cliente) notFound();

  const updateAction = atualizarCliente.bind(null, cliente.id);

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-2xl mx-auto">
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

      {/* Histórico resumido */}
      <div className="glass-card rounded-2xl p-4 md:p-5 mb-6 flex items-center gap-4">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(200,153,51,0.12)" }}
        >
          <span className="material-symbols-outlined text-primary" style={{ fontSize: "20px" }}>
            event_repeat
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-outline mb-0.5">Última visita</p>
          <p className="text-sm font-semibold text-on-surface">
            {formatarData(cliente.ultima_visita)}
          </p>
        </div>
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
    </div>
  );
}
