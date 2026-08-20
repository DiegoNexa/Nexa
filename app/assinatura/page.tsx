import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { PlanosCards } from "@/components/configuracoes/planos-cards";
import { logoutAction } from "@/app/(app)/dashboard/actions";
import {
  acessoBloqueado,
  motivoBloqueio,
  type AssinaturaStatus,
  type PlanoSalao,
} from "@/lib/planos";

export const metadata: Metadata = {
  title: "Assinatura · Nexa",
};

type Salao = {
  nome:                     string;
  plano:                    PlanoSalao;
  assinatura_status:        AssinaturaStatus;
  trial_termina_em:         string;
  assinatura_atualizada_em: string | null;
};

/**
 * Tela de bloqueio por assinatura.
 *
 * Fica FORA do grupo (app) de propósito: o layout autenticado
 * redireciona para cá quando o acesso está bloqueado, e se esta
 * página estivesse lá dentro o redirect entraria em loop.
 */
export default async function AssinaturaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("role, saloes(nome, plano, assinatura_status, trial_termina_em, assinatura_atualizada_em)")
    .eq("id", user.id)
    .single<{ role: string; saloes: Salao | null }>();

  const salao = usuario?.saloes;
  if (!salao) redirect("/dashboard");

  // Assinatura em dia: não é uma tela de bloqueio, então manda para
  // onde o plano é gerenciado normalmente.
  if (!acessoBloqueado(salao)) redirect("/configuracoes");

  const ehDono = usuario?.role === "dono";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Aurora de fundo — mesmo tratamento da área autenticada */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-20"
          style={{ background: "var(--color-primary-container)", top: "-200px", left: "-200px" }}
        />
      </div>

      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Image src="/logo.png" alt="Nexa" width={480} height={519} className="h-9 w-auto" priority />
          <span
            className="text-xl font-bold text-on-surface"
            style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
          >
            Nexa
          </span>
        </div>

        <div className="glass-card rounded-3xl p-6 md:p-10">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
            style={{ background: "rgba(200,153,51,0.12)" }}
          >
            <span className="material-symbols-outlined text-primary" style={{ fontSize: "26px" }}>
              lock
            </span>
          </div>

          <h1
            className="text-2xl md:text-3xl font-bold text-on-surface mb-2"
            style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
          >
            Escolha um plano para continuar
          </h1>
          <p className="text-sm text-on-surface-variant mb-1">
            {motivoBloqueio(salao)}
          </p>
          <p className="text-sm text-on-surface-variant mb-8">
            Seus dados estão salvos e voltam assim que a assinatura for ativada.{" "}
            <strong className="text-on-surface">
              Seu link público de agendamento continua funcionando normalmente.
            </strong>
          </p>

          {ehDono ? (
            <PlanosCards
              planoAtual={salao.plano}
              assinaturaAtiva={false}
              podeAssinar
            />
          ) : (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--color-on-surface-variant)",
              }}
            >
              Peça ao dono do salão <strong className="text-on-surface">{salao.nome}</strong>{" "}
              para reativar a assinatura. Só ele pode contratar um plano.
            </div>
          )}

          <div
            className="flex flex-wrap items-center justify-between gap-3 mt-8 pt-5 border-t"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <p className="text-xs text-outline">
              Já pagou e ainda aparece esta tela? Atualize a página em alguns instantes.
            </p>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:text-on-surface transition-all-custom"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>logout</span>
                Sair
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
