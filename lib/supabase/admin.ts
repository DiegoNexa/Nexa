import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service_role — bypassa RLS.
 *
 * Uso EXCLUSIVO em rotas server-side controladas (cron jobs,
 * webhooks de terceiros, scripts admin). NUNCA exponha no client.
 *
 * Não usa cookies/sessão — todas as queries rodam como admin.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      "Variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY são obrigatórias.",
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  });
}
