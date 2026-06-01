-- =============================================================
-- 006 — Schema da Agenda (Pilar 1 do PRD)
-- =============================================================
-- Cria as tabelas que sustentam o fluxo de agendamento:
--   profissionais  → equipe do salão (pode ou não ter login)
--   servicos       → catálogo (corte, escova, manicure, etc.)
--   carga_horaria  → disponibilidade semanal por profissional
--   clientes       → base de clientes do salão
--   agendamentos   → núcleo: cliente × profissional × serviço × tempo
--
-- Segurança:
--   - RLS ativo em todas (isolamento por salão via salao_id)
--   - GRANTS explícitos pra authenticated (auto-expose está OFF)
--   - EXCLUDE constraint impede dois agendamentos sobrepostos
--     no mesmo profissional (defesa no nível do banco)
-- =============================================================

-- Necessário pro EXCLUDE constraint com FK (=) + range (&&)
create extension if not exists btree_gist;

-- -------------------------------------------------------------
-- profissionais
-- -------------------------------------------------------------
create table public.profissionais (
  id          uuid primary key default gen_random_uuid(),
  salao_id    uuid not null references public.saloes(id) on delete cascade,
  usuario_id  uuid references public.usuarios(id) on delete set null,
  nome        text not null check (char_length(nome) between 2 and 100),
  telefone    text check (telefone is null or telefone ~ '^\d{10,11}$'),
  cor         text check (cor is null or cor ~ '^#[0-9A-Fa-f]{6}$'),
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table  public.profissionais     is 'Equipe do salão. Pode ou não ter conta de login (usuario_id nullable)';
comment on column public.profissionais.cor is 'Cor hex (#RRGGBB) pra distinguir o profissional no calendário';

create index profissionais_salao_idx on public.profissionais (salao_id);

-- -------------------------------------------------------------
-- servicos
-- -------------------------------------------------------------
create table public.servicos (
  id              uuid primary key default gen_random_uuid(),
  salao_id        uuid not null references public.saloes(id) on delete cascade,
  nome            text not null check (char_length(nome) between 2 and 80),
  descricao       text,
  duracao_minutos int not null check (duracao_minutos > 0 and duracao_minutos <= 480),
  preco           numeric(10,2) not null check (preco >= 0),
  ativo           boolean not null default true,
  created_at      timestamptz not null default now()
);

comment on table public.servicos is 'Catálogo de serviços oferecidos pelo salão';

create index servicos_salao_idx on public.servicos (salao_id);

-- -------------------------------------------------------------
-- carga_horaria
-- -------------------------------------------------------------
create table public.carga_horaria (
  id              uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  dia_semana      int  not null check (dia_semana between 0 and 6),
  hora_inicio     time not null,
  hora_fim        time not null check (hora_fim > hora_inicio),
  unique (profissional_id, dia_semana)
);

comment on table  public.carga_horaria             is 'Disponibilidade semanal por profissional. 1 linha por dia da semana';
comment on column public.carga_horaria.dia_semana  is '0=domingo, 1=segunda, ..., 6=sábado';

-- -------------------------------------------------------------
-- clientes
-- -------------------------------------------------------------
create table public.clientes (
  id              uuid primary key default gen_random_uuid(),
  salao_id        uuid not null references public.saloes(id) on delete cascade,
  nome            text not null check (char_length(nome) between 2 and 100),
  telefone        text check (telefone is null or telefone ~ '^\d{10,11}$'),
  email           text,
  data_nascimento date,
  observacoes     text,
  ultima_visita   timestamptz,
  created_at      timestamptz not null default now()
);

comment on column public.clientes.ultima_visita is 'Atualizado por trigger quando agendamento muda para status concluido';

create index clientes_salao_idx       on public.clientes (salao_id);
create index clientes_telefone_idx    on public.clientes (telefone) where telefone is not null;

-- -------------------------------------------------------------
-- agendamentos
-- -------------------------------------------------------------
create table public.agendamentos (
  id                uuid primary key default gen_random_uuid(),
  salao_id          uuid not null references public.saloes(id) on delete cascade,
  cliente_id        uuid not null references public.clientes(id) on delete restrict,
  profissional_id   uuid not null references public.profissionais(id) on delete restrict,
  servico_id        uuid not null references public.servicos(id) on delete restrict,
  data_hora_inicio  timestamptz not null,
  data_hora_fim     timestamptz not null check (data_hora_fim > data_hora_inicio),
  status            text not null default 'agendado'
                    check (status in ('agendado','confirmado','concluido','cancelado','falta')),
  origem            text not null default 'manual'
                    check (origem in ('manual','whatsapp','link_publico')),
  observacoes       text,
  created_by        uuid references public.usuarios(id) on delete set null,
  created_at        timestamptz not null default now()
);

-- Impede dois agendamentos sobrepostos pro mesmo profissional.
-- Status cancelado/falta libera o slot (clientes podem reagendar
-- na mesma janela).
alter table public.agendamentos
  add constraint agendamentos_no_overlap
  exclude using gist (
    profissional_id with =,
    tstzrange(data_hora_inicio, data_hora_fim) with &&
  ) where (status not in ('cancelado', 'falta'));

comment on table public.agendamentos is 'Núcleo da agenda. EXCLUDE constraint impede sobreposição no mesmo profissional';

create index agendamentos_salao_data_idx       on public.agendamentos (salao_id, data_hora_inicio);
create index agendamentos_cliente_idx          on public.agendamentos (cliente_id);
create index agendamentos_profissional_idx     on public.agendamentos (profissional_id, data_hora_inicio);

-- =============================================================
-- Row Level Security
-- =============================================================

alter table public.profissionais  enable row level security;
alter table public.servicos       enable row level security;
alter table public.carga_horaria  enable row level security;
alter table public.clientes       enable row level security;
alter table public.agendamentos   enable row level security;

-- ─── profissionais ────────────────────────────────────────────
create policy "Profissionais: gestão pelo próprio salão"
  on public.profissionais
  for all
  to authenticated
  using      (salao_id = (select salao_id from public.usuarios where id = auth.uid()))
  with check (salao_id = (select salao_id from public.usuarios where id = auth.uid()));

-- ─── servicos ─────────────────────────────────────────────────
create policy "Serviços: gestão pelo próprio salão"
  on public.servicos
  for all
  to authenticated
  using      (salao_id = (select salao_id from public.usuarios where id = auth.uid()))
  with check (salao_id = (select salao_id from public.usuarios where id = auth.uid()));

-- ─── carga_horaria ────────────────────────────────────────────
-- carga_horaria não tem salao_id direto — gateway via profissionais
create policy "Carga horária: gestão pelo próprio salão"
  on public.carga_horaria
  for all
  to authenticated
  using (
    profissional_id in (
      select id from public.profissionais
      where salao_id = (select salao_id from public.usuarios where id = auth.uid())
    )
  )
  with check (
    profissional_id in (
      select id from public.profissionais
      where salao_id = (select salao_id from public.usuarios where id = auth.uid())
    )
  );

-- ─── clientes ─────────────────────────────────────────────────
create policy "Clientes: gestão pelo próprio salão"
  on public.clientes
  for all
  to authenticated
  using      (salao_id = (select salao_id from public.usuarios where id = auth.uid()))
  with check (salao_id = (select salao_id from public.usuarios where id = auth.uid()));

-- ─── agendamentos ─────────────────────────────────────────────
create policy "Agendamentos: gestão pelo próprio salão"
  on public.agendamentos
  for all
  to authenticated
  using      (salao_id = (select salao_id from public.usuarios where id = auth.uid()))
  with check (salao_id = (select salao_id from public.usuarios where id = auth.uid()));

-- =============================================================
-- Grants (Data API)
-- =============================================================
grant select, insert, update, delete on public.profissionais  to authenticated;
grant select, insert, update, delete on public.servicos       to authenticated;
grant select, insert, update, delete on public.carga_horaria  to authenticated;
grant select, insert, update, delete on public.clientes       to authenticated;
grant select, insert, update, delete on public.agendamentos   to authenticated;

-- =============================================================
-- Trigger: atualiza clientes.ultima_visita quando agendamento
-- muda para status 'concluido'
-- =============================================================
create or replace function public.atualizar_ultima_visita()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'concluido' and (old.status is distinct from 'concluido') then
    update public.clientes
       set ultima_visita = new.data_hora_inicio
     where id = new.cliente_id
       and (ultima_visita is null or ultima_visita < new.data_hora_inicio);
  end if;
  return new;
end;
$$;

revoke execute on function public.atualizar_ultima_visita() from public;
revoke execute on function public.atualizar_ultima_visita() from anon;
revoke execute on function public.atualizar_ultima_visita() from authenticated;

create trigger agendamentos_atualiza_ultima_visita
  after insert or update of status on public.agendamentos
  for each row
  execute function public.atualizar_ultima_visita();

-- =============================================================
-- Trigger: valida integridade referencial cross-salão
-- =============================================================
-- Impede um cliente do salão A ser agendado com um profissional
-- do salão B (mesmo bug que RLS já bloqueia, mas defesa em
-- profundidade contra calls via service_role ou bugs no app).
create or replace function public.validar_agendamento_mesmo_salao()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_cliente_salao        uuid;
  v_profissional_salao   uuid;
  v_servico_salao        uuid;
begin
  select salao_id into v_cliente_salao      from public.clientes      where id = new.cliente_id;
  select salao_id into v_profissional_salao from public.profissionais where id = new.profissional_id;
  select salao_id into v_servico_salao      from public.servicos      where id = new.servico_id;

  if v_cliente_salao      is distinct from new.salao_id
  or v_profissional_salao is distinct from new.salao_id
  or v_servico_salao      is distinct from new.salao_id then
    raise exception 'Cliente, profissional e serviço devem pertencer ao mesmo salão do agendamento';
  end if;

  return new;
end;
$$;

revoke execute on function public.validar_agendamento_mesmo_salao() from public;
revoke execute on function public.validar_agendamento_mesmo_salao() from anon;
revoke execute on function public.validar_agendamento_mesmo_salao() from authenticated;

create trigger agendamentos_valida_mesmo_salao
  before insert or update of cliente_id, profissional_id, servico_id, salao_id
  on public.agendamentos
  for each row
  execute function public.validar_agendamento_mesmo_salao();
