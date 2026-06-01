-- =============================================================
-- Nexa — Schema inicial
-- =============================================================
-- Cria as tabelas mínimas para o fluxo de cadastro:
--   saloes      → unidade tenant (multi-tenant via salao_id)
--   usuarios    → vínculo entre auth.users e o salão
--
-- Estratégia de segurança:
--   - RLS ativo em ambas tabelas
--   - Cada usuário só enxerga o próprio salão e os usuários
--     do mesmo salão
--   - Cadastro inicial é feito via função SECURITY DEFINER
--     que cria atomicamente o salão e o vínculo de usuário
-- =============================================================

-- -------------------------------------------------------------
-- Tabela: saloes
-- -------------------------------------------------------------
create table public.saloes (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null check (char_length(nome) between 2 and 80),
  slug                text not null unique check (slug ~ '^[a-z0-9-]{4,60}$'),
  telefone_whatsapp   text,
  porte               text check (porte in ('solo', 'bairro', 'consolidado')),
  created_at          timestamptz not null default now()
);

comment on table  public.saloes is 'Salões cadastrados — unidade tenant do sistema';
comment on column public.saloes.slug is 'Identificador da URL pública: nexa.com.br/agendar/[slug]';
comment on column public.saloes.porte is 'Faixa de profissionais informada no cadastro';

-- -------------------------------------------------------------
-- Tabela: usuarios
-- -------------------------------------------------------------
create table public.usuarios (
  id          uuid primary key references auth.users(id) on delete cascade,
  salao_id    uuid not null references public.saloes(id) on delete cascade,
  email       text not null,
  nome        text not null check (char_length(nome) between 2 and 100),
  role        text not null check (role in ('dono', 'profissional')) default 'dono',
  created_at  timestamptz not null default now()
);

comment on table  public.usuarios is 'Usuários do sistema vinculados a um salão';
comment on column public.usuarios.role is 'dono = acesso total | profissional = acesso restrito à própria agenda';

create index usuarios_salao_id_idx on public.usuarios (salao_id);

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.saloes   enable row level security;
alter table public.usuarios enable row level security;

-- saloes: usuário só vê o salão ao qual pertence
create policy "Salões: SELECT do próprio salão"
  on public.saloes
  for select
  to authenticated
  using (
    id = (select salao_id from public.usuarios where id = auth.uid())
  );

create policy "Salões: UPDATE apenas pelo dono"
  on public.saloes
  for update
  to authenticated
  using (
    id = (select salao_id from public.usuarios where id = auth.uid() and role = 'dono')
  )
  with check (
    id = (select salao_id from public.usuarios where id = auth.uid() and role = 'dono')
  );

-- usuarios: SELECT do próprio salão (para listagem de equipe)
create policy "Usuários: SELECT do mesmo salão"
  on public.usuarios
  for select
  to authenticated
  using (
    salao_id = (select salao_id from public.usuarios where id = auth.uid())
  );

create policy "Usuários: UPDATE do próprio registro"
  on public.usuarios
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- =============================================================
-- Grants (Data API)
-- =============================================================
-- "Automatically expose new tables" foi desabilitado na criação
-- do projeto — então precisamos liberar explicitamente.
-- A leitura/escrita continua sendo gateada pelas policies de RLS.
grant usage on schema public to authenticated;
grant select, update on public.saloes   to authenticated;
grant select, update on public.usuarios to authenticated;

-- =============================================================
-- Função de signup atômica
-- =============================================================
-- Cria o salão e o vínculo do usuário em uma única transação.
-- Roda como SECURITY DEFINER para poder inserir antes do usuário
-- ter qualquer registro em public.usuarios (que é o gateway do
-- RLS). Validação acontece no servidor (Zod) antes da chamada.
create or replace function public.handle_signup(
  p_user_id       uuid,
  p_email         text,
  p_nome_usuario  text,
  p_nome_salao    text,
  p_slug_salao    text,
  p_telefone      text,
  p_porte         text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salao_id uuid;
begin
  -- O caller precisa ser o próprio usuário recém-criado
  if p_user_id <> auth.uid() then
    raise exception 'p_user_id deve ser o usuário autenticado';
  end if;

  -- Cria o salão
  insert into public.saloes (nome, slug, telefone_whatsapp, porte)
  values (p_nome_salao, p_slug_salao, p_telefone, p_porte)
  returning id into v_salao_id;

  -- Vincula o usuário ao salão como dono
  insert into public.usuarios (id, salao_id, email, nome, role)
  values (p_user_id, v_salao_id, p_email, p_nome_usuario, 'dono');

  return v_salao_id;
end;
$$;

revoke all on function public.handle_signup(uuid, text, text, text, text, text, text) from public;
grant execute on function public.handle_signup(uuid, text, text, text, text, text, text) to authenticated;
