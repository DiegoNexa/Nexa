import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GoldBorderButton } from "@/components/ui/gold-border-button";
import { TRIAL_DIAS } from "@/lib/planos";

type Props = { searchParams: Promise<{ pago?: string; cartao?: string }> };

export default async function CadastroSucessoPage({ searchParams }: Props) {
  // Só permite acesso se o cookie `nexa_signup_pending` estiver
  // presente — seta no signupAction logo antes do redirect.
  // Quem chega aqui sem ter cadastrado vai pra /cadastro.
  //
  // Não tentamos deletar o cookie aqui porque Server Components
  // no Next 16 não podem modificar cookies (só Server Actions e
  // Route Handlers podem). O cookie expira sozinho em 1h, o que
  // é suficiente — o usuário pode dar refresh e ver a mensagem
  // de novo, mas depois disso volta a redirecionar.
  const cookieStore = await cookies();
  const pending = cookieStore.get("nexa_signup_pending");

  if (!pending) {
    redirect("/cadastro");
  }

  const { pago, cartao } = await searchParams;

  // Três estados de retorno:
  //   pago=1            → voltou do Stripe com o cartão cadastrado
  //   cartao=pendente   → saiu do checkout antes de cadastrar o cartão
  //   (nenhum)          → checkout não chegou a abrir (fallback)
  const cartaoOk       = pago === "1";
  const cartaoPendente = cartao === "pendente";

  const icone = cartaoPendente ? "warning" : cartaoOk ? "check_circle" : "mark_email_read";
  const titulo = cartaoPendente
    ? "Falta cadastrar o cartão"
    : cartaoOk
      ? "Cartão cadastrado!"
      : "Quase lá!";
  const texto = cartaoPendente
    ? `Você saiu antes de finalizar. Confirme seu e-mail, faça login e cadastre o cartão para começar seu teste grátis de ${TRIAL_DIAS} dias — nada é cobrado até lá.`
    : cartaoOk
      ? `Seu teste grátis de ${TRIAL_DIAS} dias começou. Confirme seu e-mail para acessar o painel. Nada é cobrado agora — só depois do teste, e você cancela quando quiser.`
      : "Enviamos um link de confirmação para seu e-mail. Clique nele para ativar sua conta e acessar o painel.";

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4">
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-30 animate-aurora"
          style={{ background: "var(--color-primary-container)", top: "-200px", left: "-200px" }}
        />
      </div>

      <div className="glass-card rounded-3xl p-8 md:p-12 max-w-md w-full text-center hero-enter">
        <span
          className="material-symbols-outlined text-primary block mx-auto mb-6"
          style={{ fontSize: "72px" }}
        >
          {icone}
        </span>

        <h1
          className="text-3xl font-bold text-on-surface mb-3"
          style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          {titulo}
        </h1>
        <p className="text-base text-on-surface-variant mb-8 leading-relaxed">
          {texto}
        </p>

        <GoldBorderButton href="/login" className="w-full">
          Ir para o login
        </GoldBorderButton>

        <p className="text-xs text-outline mt-6">
          Não recebeu? Confira a caixa de spam ou{" "}
          <a href="/cadastro" className="text-primary hover:underline">tente novamente</a>.
        </p>
      </div>
    </div>
  );
}
