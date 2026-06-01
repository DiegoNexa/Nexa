-- =============================================================
-- 008 — Adiciona campo `ativo` em clientes
-- =============================================================
-- Mantém o mesmo padrão de soft-delete que usamos em servicos.
-- Hard delete falha quando há agendamentos vinculados (FK
-- RESTRICT). Soft delete via toggle é mais ergonômico.
-- =============================================================

alter table public.clientes
  add column ativo boolean not null default true;

comment on column public.clientes.ativo is
  'Soft-delete flag. Clientes inativos somem da lista padrão mas mantêm histórico.';
