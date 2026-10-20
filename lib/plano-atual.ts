import { createClient } from "@/lib/supabase/server";
import {
  planoPermiteRota,
  planoNecessarioParaRota,
  limiteProfissionais,
  type Plano,
  type PlanoSalao,
} from "@/lib/planos";

/**
 * Carrega o plano do salão do usuário logado — base do gating.
 *
 * Separado do controle de ACESSO (acessoBloqueado, no layout): aqui a
 * pergunta é "qual plano" e não "pode entrar". O layout já barrou quem
 * não tem assinatura válida, então quando isto roda há sempre um salão.
 *
 * O plano guardado em `saloes.plano` vale também durante o trial: o
 * usuário escolhe no cadastro e testa só o que aquele plano inclui.
 */
export type SalaoPlano = {
  salaoId: string;
  plano:   PlanoSalao;
  role:    string;
};

export async function carregarPlanoSalao(): Promise<SalaoPlano | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: u } = await supabase
    .from("usuarios")
    .select("salao_id, role, saloes(plano)")
    .eq("id", user.id)
    .single<{ salao_id: string; role: string; saloes: { plano: PlanoSalao } | null }>();

  if (!u?.saloes) return null;
  return { salaoId: u.salao_id, plano: u.saloes.plano, role: u.role };
}

export type GuardaRota =
  | { permitido: true;  plano: PlanoSalao; salaoId: string }
  | { permitido: false; plano: PlanoSalao; exige: Plano | null };

/**
 * Guarda de página por plano. Uso no topo da page:
 *
 *   const g = await exigirRota("/estoque");
 *   if (!g.permitido) return <BloqueioUpgrade exige={g.exige} />;
 *
 * Decisão de segurança: se não der para carregar o plano, NEGA — um
 * recurso pago não pode vazar por falha de consulta.
 */
export async function exigirRota(rota: string): Promise<GuardaRota> {
  const s = await carregarPlanoSalao();
  if (!s) {
    return { permitido: false, plano: "trial", exige: planoNecessarioParaRota(rota) };
  }
  if (planoPermiteRota(s.plano, rota)) {
    return { permitido: true, plano: s.plano, salaoId: s.salaoId };
  }
  return { permitido: false, plano: s.plano, exige: planoNecessarioParaRota(rota) };
}

/**
 * Já atingiu o limite de profissionais do plano?
 * Usada na action de criar profissional — o limite de equipe é o
 * único gating que não se resolve escondendo uma tela.
 */
export async function limiteEquipeAtingido(
  salaoId: string,
  plano: PlanoSalao,
): Promise<boolean> {
  const limite = limiteProfissionais(plano);
  if (!Number.isFinite(limite)) return false;   // Premium: ilimitado

  const supabase = await createClient();
  const { count } = await supabase
    .from("profissionais")
    .select("id", { count: "exact", head: true })
    .eq("salao_id", salaoId)
    .eq("ativo", true);

  return (count ?? 0) >= limite;
}
