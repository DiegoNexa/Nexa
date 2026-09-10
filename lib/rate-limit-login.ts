import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Rate limit de tentativas de login (migration 023).
 *
 * Camada própria, somada aos limites embutidos do Supabase Auth.
 * O estado mora no Postgres porque a Vercel é serverless: memória
 * de processo não é compartilhada entre instâncias, então um
 * contador em RAM não limita nada de verdade.
 *
 * FALHA ABERTA de propósito. Se o Supabase estiver fora do ar ou a
 * SUPABASE_SECRET_KEY faltar, o login segue normalmente em vez de
 * travar todo mundo. Um limitador quebrado não pode virar uma
 * negação de serviço contra os próprios clientes — o risco de
 * força bruta é muito menor que o de derrubar o acesso legítimo.
 */

/** Chaves de contagem: IP e e-mail são limitados separadamente */
async function chaves(email: string): Promise<string[]> {
  const h  = await headers();
  // x-forwarded-for pode vir com vários IPs: o primeiro é o cliente
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim();

  const lista = [`email:${email.toLowerCase()}`];
  if (ip) lista.push(`ip:${ip}`);
  return lista;
}

/** true = excedeu o limite e deve ser barrado */
export async function loginBloqueado(email: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("login_bloqueado", {
      p_chaves: await chaves(email),
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

/** Contabiliza uma falha de autenticação */
export async function registrarFalhaLogin(email: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.rpc("registrar_falha_login", { p_chaves: await chaves(email) });
  } catch {
    // silencioso: falhar aqui não pode impedir a resposta ao usuário
  }
}

/** Zera o histórico após um login bem-sucedido */
export async function limparFalhasLogin(email: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.rpc("limpar_falhas_login", { p_chaves: await chaves(email) });
  } catch {
    // idem
  }
}
