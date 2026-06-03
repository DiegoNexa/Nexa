-- =============================================================
-- 010 — Movimentos de folha (vales, adiantamentos, descontos, bônus)
-- =============================================================
--
-- Tabela paralela aos agendamentos para registrar lançamentos
-- manuais que afetam o líquido a pagar ao profissional no fim
-- do período (mês):
--
--   tipo='vale'           → desconta do líquido (cliente pagou pelo prof)
--   tipo='adiantamento'   → desconta do líquido (salão adiantou comissão)
--   tipo='desconto'       → desconta do líquido (falta, dano, etc)
--   tipo='bonus'          → soma ao líquido (gratificação, comissão extra)
--
-- Cálculo da folha em um período:
--   total_atendimentos (do agendamentos × comissoes)
--   - (vales + adiantamentos + descontos)
--   + bônus
--   = líquido a pagar
-- =============================================================

create table public.movimentos_folha (
  id              uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  tipo            text not null check (tipo in ('vale','adiantamento','desconto','bonus')),
  valor           numeric(10,2) not null check (valor > 0),
  descricao       text,
  data_movimento  date not null default current_date,
  created_by      uuid references public.usuarios(id) on delete set null,
  created_at      timestamptz not null default now()
);

comment on table  public.movimentos_folha is 'Lançamentos manuais que afetam a folha de pagamento do profissional';
comment on column public.movimentos_folha.tipo is 'vale | adiantamento | desconto (subtraem) · bonus (soma)';

create index movimentos_folha_prof_data_idx
  on public.movimentos_folha (profissional_id, data_movimento);

-- =============================================================
-- RLS
-- =============================================================
alter table public.movimentos_folha enable row level security;

create policy "Movimentos folha: gestão pelo próprio salão"
  on public.movimentos_folha
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

grant select, insert, update, delete on public.movimentos_folha to authenticated;
