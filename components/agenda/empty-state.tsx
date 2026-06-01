import { GoldBorderButton } from "@/components/ui/gold-border-button";

/**
 * Mostrado quando o salão ainda não tem profissional/serviço
 * cadastrado — sem isso, a agenda não tem o que renderizar.
 */
export function AgendaEmptyState() {
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
        Sua agenda está pronta
      </h2>
      <p className="text-base text-on-surface-variant max-w-md mx-auto mb-8 leading-relaxed">
        Pra começar a marcar horários, primeiro cadastre seus profissionais e os serviços que você oferece.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <GoldBorderButton href="/profissionais" className="opacity-60 cursor-not-allowed pointer-events-none">
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>content_cut</span>
          Cadastrar profissionais
        </GoldBorderButton>
        <GoldBorderButton href="/servicos" className="opacity-60 cursor-not-allowed pointer-events-none">
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>design_services</span>
          Cadastrar serviços
        </GoldBorderButton>
      </div>

      <p className="text-xs text-outline mt-6">
        Cadastros estarão disponíveis na próxima atualização
      </p>
    </div>
  );
}
