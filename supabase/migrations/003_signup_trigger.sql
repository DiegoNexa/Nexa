-- =============================================================
-- 003 — Refactor de signup: RPC → Trigger em auth.users
-- =============================================================
--
-- PROBLEMAS RESOLVIDOS:
--
-- 1. Linter "Signed-In Users Can Execute SECURITY DEFINER":
--    handle_signup era grantada para `authenticated`, expondo
--    uma função privilegiada. Sumiu — agora a criação do salão
--    acontece via trigger interno em auth.users, que só pode ser
--    disparado pelo GoTrue (não chamável por usuário).
--
-- 2. Bug de "Confirm email = ON" em produção:
--    O RPC exigia auth.uid() (usuário autenticado imediatamente).
--    Com confirmação de e-mail ligada, o signUp NÃO cria sessão
--    até o usuário clicar no link → RPC falhava. O trigger roda
--    independente de sessão, então funciona em ambos os modos.
--
-- 3. Atomicidade:
--    Se a criação do salão falha, o INSERT em auth.users também
--    faz rollback (mesma transação). Não fica usuário órfão.
--
-- 4. Linter "Public Can Execute SECURITY DEFINER" em rls_auto_enable:
--    Função interna do Supabase. Revogamos execute dos roles
--    públicos — só o event trigger interno precisa rodar.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Trigger function: cria salão + vínculo ao criar auth user
-- -------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salao_id uuid;
  v_meta     jsonb;
begin
  v_meta := new.raw_user_meta_data;

  -- Se faltam metadados (ex: usuário criado manualmente pelo
  -- dashboard do Supabase), apenas deixa passar — não temos
  -- contexto pra criar o salão automaticamente.
  if v_meta->>'nome_salao' is null or v_meta->>'slug_salao' is null then
    return new;
  end if;

  -- Cria salão
  insert into public.saloes (nome, slug, telefone_whatsapp, porte)
  values (
    v_meta->>'nome_salao',
    v_meta->>'slug_salao',
    v_meta->>'telefone',
    v_meta->>'porte'
  )
  returning id into v_salao_id;

  -- Vincula usuário ao salão como dono
  insert into public.usuarios (id, salao_id, email, nome, role)
  values (
    new.id,
    v_salao_id,
    new.email,
    coalesce(v_meta->>'nome', new.email),
    'dono'
  );

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Trigger AFTER INSERT em auth.users que cria salão + vínculo a partir do user_metadata enviado no signUp';

-- Revoga EXECUTE público — função só é chamada via trigger,
-- nunca diretamente via API REST.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- -------------------------------------------------------------
-- 2. Cria o trigger em auth.users
-- -------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- -------------------------------------------------------------
-- 3. Remove a função RPC antiga (não é mais chamada pelo código)
-- -------------------------------------------------------------
drop function if exists public.handle_signup(uuid, text, text, text, text, text, text);

-- -------------------------------------------------------------
-- 4. Endurece rls_auto_enable (função interna do Supabase)
--    Só o event trigger do próprio Supabase precisa executar.
-- -------------------------------------------------------------
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;
