import Link from "next/link";
import type { Plano } from "@/lib/planos";

/**
 * Tela mostrada quando o salão abre um recurso que o plano dele não
 * inclui. Não é bloqueio de segurança — os dados são do próprio salão;
 * é a fronteira comercial entre os planos. Convida ao upgrade em vez
 * de só negar.
 */
export function BloqueioUpgrade({
  recurso,
  exige,
  podeAssinar,
}: {
  recurso: string;
  exige:   Plano | null;
  podeAssinar: boolean;
}) {
  const nomePlano = exige?.nome ?? "um plano superior";

  return (
    <div className="px-4 md:px-8 py-12 md:py-20 max-w-xl mx-auto">
      <div className="glass-card rounded-3xl p-6 md:p-10 text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(200,153,51,0.12)" }}
        >
          <span className="material-symbols-outlined text-primary" style={{ fontSize: "30px" }}>
            lock
          </span>
        </div>

        <h1
          className="text-2xl md:text-3xl font-bold text-on-surface mb-2"
          style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          {recurso} faz parte do plano {nomePlano}
        </h1>

        <p className="text-sm text-on-surface-variant mb-2">
          Seu plano atual não inclui este recurso. Faça upgrade para o{" "}
          <strong className="text-on-surface">{nomePlano}</strong> e libere o acesso.
        </p>

        {exige && (
          <p className="text-xs text-on-surface-variant mb-7">
            A partir de{" "}
            <strong className="text-primary">R$ {exige.precoMensal}/mês</strong>.
          </p>
        )}

        {podeAssinar ? (
          <Link
            href="/configuracoes"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all-custom"
            style={{ background: "linear-gradient(135deg,#E8D080,#C89933)", color: "#1D1A05" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              arrow_upward
            </span>
            Ver planos e fazer upgrade
          </Link>
        ) : (
          <p className="text-xs text-on-surface-variant">
            Peça ao dono do salão para fazer o upgrade do plano.
          </p>
        )}
      </div>
    </div>
  );
}
