import { createClient } from "@/lib/supabase/server";
import { SalaoForm } from "@/components/configuracoes/salao-form";
import { LinkPublicoCopy } from "@/components/configuracoes/link-publico-copy";
import { PlanosCards } from "@/components/configuracoes/planos-cards";
import { abrirPortalCobranca } from "./actions";
import {
  PLANOS,
  LABEL_STATUS,
  diasRestantes,
  isPlanoKey,
  type AssinaturaStatus,
  type PlanoSalao,
} from "@/lib/planos";

type Salao = {
  id:                string;
  nome:              string;
  slug:              string;
  telefone_whatsapp: string | null;
  documento:         string | null;
  plano:             PlanoSalao;
  assinatura_status: AssinaturaStatus;
  trial_termina_em:  string;
  assinatura_id:     string | null;
};

/** Mensagens de volta do portal de cobrança (via ?portal=) */
const AVISO_PORTAL: Record<string, string> = {
  erro:             "Não foi possível abrir o portal de cobrança. Tente novamente em instantes.",
  "sem-assinatura": "Este salão ainda não tem uma assinatura para gerenciar.",
  "sem-permissao":  "Apenas o dono do salão pode gerenciar a cobrança.",
};

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ portal?: string }>;
}) {
  const { portal } = await searchParams;
  const avisoPortal = portal ? AVISO_PORTAL[portal] : undefined;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("salao_id, email, role")
    .eq("id", user!.id)
    .single<{ salao_id: string; email: string; role: string }>();

  const { data: salao } = await supabase
    .from("saloes")
    .select("id, nome, slug, telefone_whatsapp, documento, plano, assinatura_status, trial_termina_em, assinatura_id")
    .eq("id", usuario?.salao_id ?? "")
    .single<Salao>();

  const podeEditar = usuario?.role === "dono";

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-2xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <p
          className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
          style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
        >
          Configurações
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold text-on-surface mb-1"
          style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          Ajustes do salão
        </h1>
        <p className="text-sm text-on-surface-variant">
          Dados do salão, link público de agendamento e conta
        </p>
      </div>

      <div className="space-y-6">
        {/* Link público */}
        {salao && (
          <section className="glass-card rounded-2xl p-5 md:p-6">
            <h2 className="text-sm font-semibold text-on-surface mb-1">Link público de agendamento</h2>
            <p className="text-xs text-on-surface-variant mb-4">
              Compartilhe com seus clientes para que agendem sozinhos, sem precisar de login.
            </p>
            <LinkPublicoCopy slug={salao.slug} />
          </section>
        )}

        {/* Dados do salão */}
        {salao && (
          <section className="glass-card rounded-2xl p-5 md:p-6">
            <h2 className="text-sm font-semibold text-on-surface mb-4">Dados do salão</h2>
            <SalaoForm
              nome={salao.nome}
              telefoneWhatsapp={salao.telefone_whatsapp}
              documento={salao.documento}
              podeEditar={podeEditar}
            />
          </section>
        )}

        {/* Plano e assinatura */}
        {salao && (
          <section className="glass-card rounded-2xl p-5 md:p-6">
            <h2 className="text-sm font-semibold text-on-surface mb-1">Plano e assinatura</h2>
            <AssinaturaResumo salao={salao} />
            <PlanosCards
              planoAtual={salao.plano}
              assinaturaAtiva={salao.assinatura_status === "ativa"}
              podeAssinar={podeEditar}
            />

            {/* Portal da Stripe: o salão troca cartão, baixa faturas,
                muda de plano e cancela sem depender de nós. */}
            {podeEditar && salao.assinatura_id && (
              <form action={abrirPortalCobranca} className="mt-4">
                <button
                  type="submit"
                  className="w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all-custom flex items-center justify-center gap-2 text-on-surface"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                    credit_card
                  </span>
                  Gerenciar assinatura e pagamento
                </button>
                <p className="text-xs text-on-surface-variant mt-2 text-center">
                  Trocar cartão, ver faturas, mudar de plano ou cancelar.
                </p>
              </form>
            )}

            {avisoPortal && (
              <p
                role="alert"
                className="text-xs mt-3 rounded-xl px-4 py-3"
                style={{
                  background: "rgba(255, 180, 171, 0.08)",
                  border: "1px solid var(--color-error)",
                  color: "var(--color-error)",
                }}
              >
                {avisoPortal}
              </p>
            )}
            {!podeEditar && (
              <p className="text-xs text-on-surface-variant mt-3">
                Apenas o dono do salão pode contratar ou alterar o plano.
              </p>
            )}
          </section>
        )}

        {/* Conta */}
        <section className="glass-card rounded-2xl p-5 md:p-6">
          <h2 className="text-sm font-semibold text-on-surface mb-4">Conta</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-on-surface-variant">E-mail de acesso</span>
              <span className="text-sm text-on-surface font-medium truncate">{usuario?.email ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-on-surface-variant">Perfil</span>
              <span className="text-sm text-on-surface font-medium">
                {usuario?.role === "dono" ? "Dono" : "Colaborador"}
              </span>
            </div>
            <div className="pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <a
                href="/recuperar-senha"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>lock_reset</span>
                Trocar senha
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Faixa de status acima dos cards de plano */
function AssinaturaResumo({ salao }: { salao: Salao }) {
  const status = salao.assinatura_status;
  const dias   = diasRestantes(salao.trial_termina_em);

  // cor + texto de apoio por estado
  const info = (() => {
    if (status === "ativa") {
      const nome = isPlanoKey(salao.plano) ? PLANOS[salao.plano].nome : "—";
      return {
        cor:   "#34D399",
        texto: `Plano ${nome} · renovação automática`,
      };
    }
    if (status === "trial") {
      return {
        cor:   dias > 0 ? "var(--color-primary)" : "#EF4444",
        texto: dias > 0
          ? `Faltam ${dias} ${dias === 1 ? "dia" : "dias"} de teste grátis`
          : "Seu teste grátis terminou — escolha um plano para continuar apoiando o app",
      };
    }
    if (status === "inadimplente") {
      return { cor: "#EF4444", texto: "Não conseguimos processar o último pagamento" };
    }
    return { cor: "#9CA3AF", texto: "Sua assinatura foi cancelada" };
  })();

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <span
        className="text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded"
        style={{ background: `${info.cor}22`, color: info.cor }}
      >
        {LABEL_STATUS[status]}
      </span>
      <span className="text-xs text-on-surface-variant">{info.texto}</span>
    </div>
  );
}
