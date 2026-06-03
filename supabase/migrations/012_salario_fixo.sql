-- =============================================================
-- 012 — Salário fixo mensal por profissional
-- =============================================================
--
-- Para salões que pagam salário fixo + comissão (CLT, autônomo
-- mensalista, etc), adiciona uma coluna `salario_fixo` em
-- profissionais.
--
-- O cálculo da folha passa a ser:
--   bruta = atendimentos × percentual
--   movimentos_adicionais = bruta - vales - adiantamentos - descontos + bonus
--   líquido = salario_fixo + movimentos_adicionais
--
-- Profissionais somente comissionados: salario_fixo = 0 (default).
-- =============================================================

alter table public.profissionais
  add column salario_fixo numeric(10,2) not null default 0
  check (salario_fixo >= 0 and salario_fixo <= 999999.99);

comment on column public.profissionais.salario_fixo is
  'Valor fixo pago mensalmente, somado às comissões dos atendimentos na folha';
