-- =============================================================
-- 023 — Rate limit de tentativas de login
-- =============================================================
--
-- Antes desta migration não havia NENHUM limite próprio de
-- tentativas: a proteção contra força bruta dependia inteiramente
-- dos defaults do GoTrue (Supabase Auth). Isto é defesa em
-- profundidade — as duas camadas somam.
--
-- Decisões de projeto:
--
--   * Chave dupla (IP e e-mail). Só por e-mail, um atacante com
--     botnet troca de IP à vontade. Só por IP, ele varre e-mails
--     de um IP só. Bloqueia quando QUALQUER uma estourar.
--
--   * Chaves são md5, nunca o valor cru. A tabela não guarda
--     e-mail nem IP legível — é dado pessoal (LGPD) e aqui só
--     precisamos comparar igualdade, não ler de volta.
--
--   * Só falhas entram. Login bem-sucedido limpa a chave do
--     e-mail, então quem acerta a senha nunca acumula bloqueio.
--
--   * Sem policy de RLS: a tabela é acessada apenas por estas
--     funções SECURITY DEFINER, concedidas só a `service_role`.
--     O `anon` não recebe nada — senão o próprio endpoint de
--     rate limit viraria vetor de flood.
-- =============================================================


-- -------------------------------------------------------------
-- Tabela
-- -------------------------------------------------------------
create table if not exists public.tentativas_login (
  id        bigserial   primary key,
  chave     text        not null,
  criado_em timestamptz not null default now()
);

comment on table public.tentativas_login is
  'Falhas de login recentes, por chave md5 (ip:… ou email:…). Alimenta o rate limit; linhas expiram na janela.';

-- Índice que serve as três funções: filtram por chave + janela
create index if not exists tentativas_login_chave_idx
  on public.tentativas_login (chave, criado_em desc);

alter table public.tentativas_login enable row level security;
-- Nenhuma policy, de propósito: acesso só via as funções abaixo.


-- -------------------------------------------------------------
-- Parâmetros
-- -------------------------------------------------------------
-- 10 falhas em 15 minutos. Folgado para um salão com vários
-- funcionários no mesmo IP, apertado para força bruta.
-- A janela deslizante se cura sozinha: nada fica bloqueado
-- permanentemente, o que evita lockout definitivo de conta.


-- -------------------------------------------------------------
-- Registra uma falha
-- -------------------------------------------------------------
create or replace function public.registrar_falha_login(p_chaves text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tentativas_login (chave)
  select md5(c) from unnest(p_chaves) as t(c);

  -- Faxina oportunista: evita cron só para isso. Roda barato
  -- porque o índice cobre criado_em.
  delete from public.tentativas_login
  where criado_em < now() - interval '15 minutes';
end;
$$;


-- -------------------------------------------------------------
-- Pergunta se está bloqueado
-- -------------------------------------------------------------
create or replace function public.login_bloqueado(p_chaves text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tentativas_login
    where chave = any (select md5(c) from unnest(p_chaves) as t(c))
      and criado_em > now() - interval '15 minutes'
    group by chave
    having count(*) >= 10
  );
$$;


-- -------------------------------------------------------------
-- Limpa após sucesso
-- -------------------------------------------------------------
create or replace function public.limpar_falhas_login(p_chaves text[])
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.tentativas_login
  where chave = any (select md5(c) from unnest(p_chaves) as t(c));
$$;


-- -------------------------------------------------------------
-- Permissões
-- -------------------------------------------------------------
-- Apenas o servidor (service_role). O login é Server Action, então
-- roda no servidor e usa o admin client — o navegador nunca chama
-- estas funções.
revoke execute on function public.registrar_falha_login(text[]) from public, anon, authenticated;
revoke execute on function public.login_bloqueado(text[])       from public, anon, authenticated;
revoke execute on function public.limpar_falhas_login(text[])   from public, anon, authenticated;

grant execute on function public.registrar_falha_login(text[]) to service_role;
grant execute on function public.login_bloqueado(text[])       to service_role;
grant execute on function public.limpar_falhas_login(text[])   to service_role;
