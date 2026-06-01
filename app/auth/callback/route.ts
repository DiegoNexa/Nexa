import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handler genérico para callbacks do Supabase Auth.
 *
 * Recebe o `code` de fluxos como:
 *  - confirmação de e-mail (signup)
 *  - link mágico (magic link)
 *  - recuperação de senha
 *
 * Troca o code por uma sessão e redireciona para `next` (ou /dashboard).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Normaliza `next` — só permite paths relativos para evitar
  // open redirect (atacante manda link com next=https://evil.com).
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?erro=callback`);
}
