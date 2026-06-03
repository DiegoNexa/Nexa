-- =============================================================
-- 011 — Profissional pode "não atender" um serviço
-- =============================================================
--
-- Adiciona a coluna `atende` em comissoes_config pra registrar
-- explicitamente que um profissional NÃO oferece um serviço
-- (ex: o barbeiro não faz manicure).
--
-- Estados possíveis de uma linha (profissional × serviço):
--
--   (sem linha)             → atende com a comissao_padrao do profissional
--   atende=true,  perc=NULL  → atende com a comissao_padrao
--   atende=true,  perc=N     → atende com override de N%
--   atende=false, perc=NULL  → NÃO atende esse serviço
--
-- Para a Phase 4 (criar agendamento manual), serviços com atende=false
-- não aparecem como opção pro profissional selecionado. A folha de
-- pagamento continua somando agendamentos históricos normalmente
-- (eventos passados não são apagados, só não há mais novos).
-- =============================================================

-- 1. Nova coluna `atende` (default true — comportamento atual preservado)
alter table public.comissoes_config
  add column atende boolean not null default true;

comment on column public.comissoes_config.atende is
  'Se false, o profissional não oferece este serviço (não aparece nas opções de novo agendamento)';

-- 2. percentual passa a ser nullable (já que pode existir linha só pra marcar atende=false)
alter table public.comissoes_config
  alter column percentual drop not null;

-- 3. Constraint de consistência:
--    se atende=false, percentual obrigatoriamente null (não faz sentido ter %)
alter table public.comissoes_config
  add constraint comissoes_config_atende_check
  check (atende = true or percentual is null);
