import { createClient } from "@/lib/supabase/server";
import { GoldBorderButton } from "@/components/ui/gold-border-button";
import { ClientesLista, type Cliente } from "@/components/clientes/clientes-lista";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nome, telefone, email, ultima_visita, ativo")
    .order("ativo", { ascending: false })
    .order("nome")
    .returns<Cliente[]>();

  const lista = clientes ?? [];

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <p
            className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
            style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
          >
            Base
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold text-on-surface mb-1"
            style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
          >
            Clientes
          </h1>
          <p className="text-sm text-on-surface-variant">
            {lista.length === 0
              ? "Cadastre clientes para começar a marcar agendamentos"
              : `${lista.length} ${lista.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}`}
          </p>
        </div>

        <GoldBorderButton href="/clientes/novo" className="inline-flex">
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
          Novo cliente
        </GoldBorderButton>
      </div>

      {/* Empty state ou lista */}
      {lista.length === 0 ? <ClientesEmpty /> : <ClientesLista clientes={lista} />}
    </div>
  );
}

function ClientesEmpty() {
  return (
    <div className="glass-card rounded-3xl p-8 md:p-16 text-center max-w-2xl mx-auto">
      <span
        className="material-symbols-outlined text-primary block mx-auto mb-6"
        style={{ fontSize: "72px" }}
      >
        groups
      </span>
      <h2
        className="text-2xl md:text-3xl font-bold text-on-surface mb-3"
        style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
      >
        Nenhum cliente ainda
      </h2>
      <p className="text-base text-on-surface-variant max-w-md mx-auto mb-8">
        Cadastre seus clientes para começar a marcar agendamentos e acompanhar o histórico de visitas.
      </p>
      <GoldBorderButton href="/clientes/novo" className="inline-flex">
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
        Cadastrar primeiro cliente
      </GoldBorderButton>
    </div>
  );
}
