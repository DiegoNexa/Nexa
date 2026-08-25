-- =============================================================
-- 021 — Documento (CPF/CNPJ) do salão
-- =============================================================
--
-- POR QUE: a API do AbacatePay exige um bloco `customer` completo
-- para criar cobrança — name, email, cellphone e taxId. O taxId
-- (CPF/CNPJ) não era coletado em lugar nenhum da Nexa.
--
-- Sem este campo, /v1/billing/create responde 422 e o salão nunca
-- consegue assinar.
--
-- Guardamos só dígitos (11 = CPF, 14 = CNPJ). A validação de
-- dígitos verificadores fica com o AbacatePay.
-- =============================================================

alter table public.saloes
  add column documento text
  check (documento is null or documento ~ '^\d{11}$' or documento ~ '^\d{14}$');

comment on column public.saloes.documento is
  'CPF (11 dígitos) ou CNPJ (14) do responsável — exigido pelo AbacatePay na cobrança';
