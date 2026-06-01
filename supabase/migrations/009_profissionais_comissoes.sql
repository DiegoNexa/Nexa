-- =============================================================
-- 009 — Comissões: padrão por profissional + overrides por serviço
-- =============================================================
--
-- Cada profissional tem uma `comissao_padrao` (% aplicada a todos
-- os serviços por padrão). Em casos onde algum serviço deve ter
-- comissão diferente, registramos um override na tabela
-- `comissoes_config (profissional × serviço × %)`.
--
-- Cálculo no momento de gerar folha:
--   coalesce(
--     (select percentual from comissoes_config
--      where profissional_id = X and servico_id = Y),
--     (select comissao_padrao from profissionais where id = X)
--   )
-- =============================================================

-- 1. Coluna comissao_padrao em profissionais (default 50%)
alter table public.profissionais
  add column comissao_padrao numeric(5,2) not null default 50.00
  check (comissao_padrao >= 0 and comissao_padrao <= 100);

comment on column public.profissionais.comissao_padrao is
  'Percentual de comissão padrão (0-100). Aplicado a serviços sem override em comissoes_config.';

-- 2. Tabela de overrides por (profissional, serviço)
create table public.comissoes_config (
  id              uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  servico_id      uuid not null references public.servicos(id)      on delete cascade,
  percentual      numeric(5,2) not null check (percentual >= 0 and percentual <= 100),
  unique (profissional_id, servico_id)
);

comment on table public.comissoes_config is
  'Overrides de comissão por (profissional × serviço). Se ausente, usa profissionais.comissao_padrao.';

create index comissoes_config_prof_idx on public.comissoes_config (profissional_id);

-- 3. RLS — gestão pelo próprio salão (via current_salao_id helper)
alter table public.comissoes_config enable row level security;

create policy "Comissões config: gestão pelo próprio salão"
  on public.comissoes_config
  for all
  to authenticated
  using (
    profissional_id in (
      select id from public.profissionais
      where  salao_id = public.current_salao_id()
    )
  )
  with check (
    profissional_id in (
      select id from public.profissionais
      where  salao_id = public.current_salao_id()
    )
  );

grant select, insert, update, delete on public.comissoes_config to authenticated;
