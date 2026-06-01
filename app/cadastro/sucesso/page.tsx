import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GoldBorderButton } from "@/components/ui/gold-border-button";

export default async function CadastroSucessoPage() {
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
          mark_email_read
        </span>

        <h1
          className="text-3xl font-bold text-on-surface mb-3"
          style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          Quase lá!
        </h1>
        <p className="text-base text-on-surface-variant mb-8 leading-relaxed">
          Enviamos um link de confirmação para seu e-mail. Clique nele para ativar sua conta e acessar o painel.
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
