-- =============================================================
-- 018 — Despesas (Pilar 5 — Gestão Financeira)
-- =============================================================
--
-- Registra saídas de dinheiro do salão que NÃO são folha de
-- pagamento (aluguel, compra de produtos, contas, marketing, etc).
--
-- O resultado financeiro do salão em um período é montado no app:
--   Faturamento  = Σ preço dos atendimentos concluídos
--   − Folha       = Σ líquido a pagar aos profissionais (lib folha)
--   − Despesas    = Σ desta tabela
--   = Lucro líquido
--
-- RLS por salao_id (= current_salao_id()), padrão das migrations
-- anteriores.
-- =============================================================

create table public.despesas (
  id           uuid primary key default gen_random_uuid(),
  salao_id     uuid not null references public.saloes(id) on delete cascade,
  descricao    text not null check (char_length(descricao) between 1 and 120),
  categoria    text not null default 'outros'
               check (categoria in ('aluguel','produtos','contas','equipamentos','marketing','impostos','outros')),
  valor        numeric(10,2) not null check (valor > 0),
  data_despesa date not null default current_date,
  created_by   uuid references public.usuarios(id) on delete set null,
  created_at   timestamptz not null default now()
);

comment on table  public.despesas           is 'Despesas do salão (fora da folha de pagamento)';
comment on column public.despesas.categoria is 'aluguel | produtos | contas | equipamentos | marketing | impostos | outros';

create index despesas_salao_data_idx on public.despesas (salao_id, data_despesa);

-- =============================================================
-- RLS
-- =============================================================
alter table public.despesas enable row level security;

create policy "Despesas: gestão pelo próprio salão"
  on public.despesas
  for all
  to authenticated
  using      (salao_id = public.current_salao_id())
  with check (salao_id = public.current_salao_id());

grant select, insert, update, delete on public.despesas to authenticated;
