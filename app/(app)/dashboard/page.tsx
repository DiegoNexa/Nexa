import { createClient } from "@/lib/supabase/server";
import { GoldBorderButton } from "@/components/ui/gold-border-button";

export default async function DashboardPage() {
  // Auth guard já está no layout (app). Aqui só busca o nome.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome")
    .eq("id", user!.id)
    .single<{ nome: string }>();

  // Primeiro nome do nome completo cadastrado.
  // Fallback vazio (saudação sem nome) — nunca "você".
  const primeiroNome = usuario?.nome?.split(" ")[0] ?? "";

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-5xl mx-auto">
      {/* Cabeçalho da página */}
      <div className="mb-10">
        <p
          className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
          style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
        >
          Dashboard
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold text-on-surface mb-2"
          style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          {primeiroNome ? `Olá, ${primeiroNome}!` : "Olá!"}
        </h1>
        <p className="text-base text-on-surface-variant">
          Veja o resumo do seu salão por aqui.
        </p>
      </div>

      {/* Em breve */}
      <div className="glass-card rounded-3xl p-8 md:p-12 text-center">
        <span
          className="material-symbols-outlined text-primary block mx-auto mb-4"
          style={{ fontSize: "56px" }}
        >
          construction
        </span>
        <h2
          className="text-2xl font-bold text-on-surface mb-2"
          style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          Painel em construção
        </h2>
        <p className="text-base text-on-surface-variant max-w-md mx-auto mb-6">
          Em breve você vai ver aqui os agendamentos do dia, alertas de estoque, faturamento da semana e o que mais importa pro seu salão.
        </p>
        <GoldBorderButton href="/agenda" className="inline-flex">
          Ir para a agenda
        </GoldBorderButton>
      </div>
    </div>
  );
}
