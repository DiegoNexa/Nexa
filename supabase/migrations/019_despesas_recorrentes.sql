-- =============================================================
-- 019 — Despesas recorrentes (Pilar 5)
-- =============================================================
--
-- Permite cadastrar despesas fixas que se repetem todo mês
-- (ex: aluguel) ou toda semana (ex: material de limpeza).
--
-- Modelo:
--   despesas_recorrentes      → o "molde" (valor, frequência, dia)
--   despesas_recorrentes_log  → registro de quais competências já
--                               foram geradas (idempotência)
--   despesas.recorrente_id    → liga a ocorrência gerada ao molde
--
-- A materialização é feita pela função gerar_despesas_recorrentes(),
-- chamada quando a página financeira carrega um mês. O log garante:
--   1. Não duplicar (gerar 2x a mesma competência)
--   2. Se o usuário APAGAR uma ocorrência, ela NÃO reaparece
--      (o log já marca a competência como gerada)
--
-- Apagar o molde (despesas_recorrentes) mantém as ocorrências já
-- lançadas no histórico (recorrente_id vira null) e só para as
-- futuras.
-- =============================================================

create table public.despesas_recorrentes (
  id           uuid primary key default gen_random_uuid(),
  salao_id     uuid not null references public.saloes(id) on delete cascade,
  descricao    text not null check (char_length(descricao) between 1 and 120),
  categoria    text not null default 'outros'
               check (categoria in ('aluguel','produtos','contas','equipamentos','marketing','impostos','outros')),
  valor        numeric(10,2) not null check (valor > 0),
  frequencia   text not null check (frequencia in ('mensal','semanal')),
  dia_mes      int check (dia_mes between 1 and 28),      -- usado em 'mensal'
  dia_semana   int check (dia_semana between 0 and 6),    -- usado em 'semanal' (0=dom)
  data_inicio  date not null default current_date,        -- não gera antes disso
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  -- garante coerência entre frequência e o dia informado
  check (
    (frequencia = 'mensal'  and dia_mes    is not null and dia_semana is null) or
    (frequencia = 'semanal' and dia_semana is not null and dia_mes    is null)
  )
);

comment on table public.despesas_recorrentes is 'Moldes de despesas fixas (mensais/semanais) materializadas em despesas';

create index despesas_recorrentes_salao_idx on public.despesas_recorrentes (salao_id) where ativo;

-- Liga a ocorrência gerada ao molde. on delete set null: apagar o
-- molde não apaga o histórico já lançado.
alter table public.despesas
  add column recorrente_id uuid references public.despesas_recorrentes(id) on delete set null;

-- Log de competências já geradas (idempotência + anti-reaparecimento)
create table public.despesas_recorrentes_log (
  recorrente_id uuid not null references public.despesas_recorrentes(id) on delete cascade,
  competencia   text not null,   -- 'YYYY-MM' (mensal) ou 'IYYY-Www' (semanal)
  gerado_em     timestamptz not null default now(),
  primary key (recorrente_id, competencia)
);

-- =============================================================
-- RLS
-- =============================================================
alter table public.despesas_recorrentes     enable row level security;
alter table public.despesas_recorrentes_log enable row level security;

create policy "Despesas recorrentes: gestão pelo próprio salão"
  on public.despesas_recorrentes
  for all
  to authenticated
  using      (salao_id = public.current_salao_id())
  with check (salao_id = public.current_salao_id());

create policy "Log recorrentes: leitura pelo próprio salão"
  on public.despesas_recorrentes_log
  for select
  to authenticated
  using (
    recorrente_id in (
      select id from public.despesas_recorrentes
      where salao_id = public.current_salao_id()
    )
  );

grant select, insert, update, delete on public.despesas_recorrentes     to authenticated;
grant select                         on public.despesas_recorrentes_log to authenticated;

-- =============================================================
-- Função: materializa as ocorrências de um período [p_inicio, p_fim)
-- =============================================================
-- Idempotente via despesas_recorrentes_log. SECURITY DEFINER pra
-- escrever no log e em despesas de forma consistente.
create or replace function public.gerar_despesas_recorrentes(p_inicio date, p_fim date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salao   uuid := current_salao_id();
  r         record;
  occ       date;
  comp      text;
  offset_d  int;
  inserido  int;
begin
  if v_salao is null then return; end if;

  for r in
    select * from despesas_recorrentes
    where salao_id = v_salao and ativo = true
  loop
    if r.frequencia = 'mensal' then
      for occ in
        select (m + (r.dia_mes - 1))::date
        from generate_series(date_trunc('month', p_inicio)::timestamp,
                             (p_fim - 1)::timestamp,
                             interval '1 month') m
      loop
        if occ >= greatest(p_inicio, r.data_inicio) and occ < p_fim then
          comp := to_char(occ, 'YYYY-MM');
          insert into despesas_recorrentes_log (recorrente_id, competencia)
            values (r.id, comp) on conflict do nothing;
          get diagnostics inserido = row_count;
          if inserido = 1 then
            insert into despesas (salao_id, descricao, categoria, valor, data_despesa, recorrente_id)
              values (v_salao, r.descricao, r.categoria, r.valor, occ, r.id);
          end if;
        end if;
      end loop;

    elsif r.frequencia = 'semanal' then
      offset_d := case r.dia_semana when 0 then 6 else r.dia_semana - 1 end; -- semana começa na segunda
      for occ in
        select (w + offset_d)::date
        from generate_series(date_trunc('week', p_inicio)::timestamp,
                             (p_fim - 1)::timestamp,
                             interval '1 week') w
      loop
        if occ >= greatest(p_inicio, r.data_inicio) and occ < p_fim then
          comp := to_char(occ, 'IYYY-"W"IW');
          insert into despesas_recorrentes_log (recorrente_id, competencia)
            values (r.id, comp) on conflict do nothing;
          get diagnostics inserido = row_count;
          if inserido = 1 then
            insert into despesas (salao_id, descricao, categoria, valor, data_despesa, recorrente_id)
              values (v_salao, r.descricao, r.categoria, r.valor, occ, r.id);
          end if;
        end if;
      end loop;
    end if;
  end loop;
end;
$$;

revoke execute on function public.gerar_despesas_recorrentes(date, date) from public, anon;
grant   execute on function public.gerar_despesas_recorrentes(date, date) to authenticated;
