-- =============================================================
-- 004 — Revoga EXECUTE de handle_new_user
-- =============================================================
--
-- handle_new_user é uma função de TRIGGER (disparada quando
-- auth.users recebe um INSERT). Triggers rodam independente da
-- permissão EXECUTE — esta permissão só controla chamadas diretas.
--
-- Por default, Postgres concede EXECUTE para PUBLIC em toda função
-- nova. Como a função está em `public`, o Supabase expõe ela em
-- /rest/v1/rpc/handle_new_user, deixando atacantes tentarem chamar.
--
-- Revogando, o trigger continua funcionando normalmente, mas a
-- função some da API REST do Supabase.
-- =============================================================

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
