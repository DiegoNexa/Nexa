import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AgendarForm } from "@/components/agendar-publico/agendar-form";
import {
  carregarBloqueiosPublico,
  carregarProfissionaisPublico,
  carregarSalaoPublico,
  carregarServicosPublico,
} from "@/lib/agendar-publico";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function AgendarPublicoPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();
  const salao = await carregarSalaoPublico(supabase, slug);

  if (!salao) notFound();

  const [servicos, profissionais, bloqueios] = await Promise.all([
    carregarServicosPublico(supabase, slug),
    carregarProfissionaisPublico(supabase, slug),
    carregarBloqueiosPublico(supabase, slug),
  ]);

  const podeAgendar = servicos.length > 0 && profissionais.length > 0;

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-8 md:py-16">
      {/* Aurora background sutil */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-25 animate-aurora"
          style={{ background: "var(--color-primary-container)", top: "-200px", left: "-200px" }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-15 animate-aurora"
          style={{
            background: "var(--color-secondary-container)",
            bottom: "-200px",
            right: "-200px",
            animationDelay: "-7.5s",
          }}
        />
      </div>

      <div className="w-full max-w-lg">
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <p
            className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
            style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
          >
            Marcar horário
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold text-on-surface mb-2"
            style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
          >
            {salao.nome}
          </h1>
          <p className="text-sm text-on-surface-variant">
            Escolha o serviço, profissional e horário disponíveis.
          </p>
        </div>

        {/* Form ou empty state */}
        {!podeAgendar ? (
          <NaoDisponivel salaoNome={salao.nome} />
        ) : (
          <div className="glass-card rounded-2xl p-6 sm:p-8">
            <AgendarForm
              slug={slug}
              servicos={servicos}
              profissionais={profissionais}
              bloqueios={bloqueios}
            />
          </div>
        )}

        <p className="text-xs text-outline text-center mt-6">
          Agendamento direto pelo sistema da{" "}
          <span className="text-primary font-semibold">Nexa</span>.
        </p>
      </div>
    </div>
  );
}

function NaoDisponivel({ salaoNome }: { salaoNome: string }) {
  return (
    <div className="glass-card rounded-2xl p-8 text-center">
      <span
        className="material-symbols-outlined text-primary block mx-auto mb-4"
        style={{ fontSize: "56px" }}
      >
        info
      </span>
      <h2
        className="text-xl font-bold text-on-surface mb-2"
        style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
      >
        Agendamento online indisponível
      </h2>
      <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
        {salaoNome} ainda não disponibilizou serviços ou profissionais para agendamento online.
        Entre em contato diretamente para marcar.
      </p>
    </div>
  );
}
