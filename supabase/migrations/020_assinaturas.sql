-- =============================================================
-- 020 — Assinaturas (cobrança via AbacatePay)
-- =============================================================
--
-- Primeira camada de monetização da Nexa. Guarda o plano e o
-- estado da assinatura de cada salão, mais o histórico de eventos
-- de pagamento recebidos por webhook.
--
-- Nesta fase NINGUÉM é bloqueado por falta de pagamento — o estado
-- é apenas registrado e exibido nas Configurações. Bloqueio e
-- limites por plano ficam para uma migration futura.
--
-- Trial: 30 dias a partir da criação do salão, sem pedir cartão
-- (mantém a promessa "sem cartão de crédito" da landing).
--
-- IMPORTANTE — por que funções SECURITY DEFINER:
--   O webhook roda sem sessão de usuário e precisa escrever no
--   banco. Neste projeto o service_role deu "permission denied"
--   em tabelas públicas (ver migration 016), então o webhook NÃO
--   escreve direto nas tabelas: chama as funções abaixo via RPC.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Estado da assinatura no salão
-- -------------------------------------------------------------
alter table public.saloes
  add column plano text not null default 'trial'
    check (plano in ('trial','solo','profissional','premium')),
  add column assinatura_status text not null default 'trial'
    check (assinatura_status in ('trial','ativa','cancelada','inadimplente')),
  add column trial_termina_em timestamptz not null default now() + interval '30 days',
  add column assinatura_id text,
  add column assinatura_atualizada_em timestamptz;

comment on column public.saloes.plano             is 'trial | solo | profissional | premium';
comment on column public.saloes.assinatura_status is 'trial | ativa | cancelada | inadimplente';
comment on column public.saloes.trial_termina_em  is 'Fim do teste grátis de 30 dias (não bloqueia acesso nesta fase)';
comment on column public.saloes.assinatura_id     is 'ID da assinatura no AbacatePay';

-- Salões que já existiam: trial conta a partir da criação deles,
-- não da data desta migration.
update public.saloes
   set trial_termina_em = created_at + interval '30 days';

-- -------------------------------------------------------------
-- 2. Histórico de eventos de pagamento (auditoria + idempotência)
-- -------------------------------------------------------------
create table public.pagamentos (
  id         uuid primary key default gen_random_uuid(),
  salao_id   uuid not null references public.saloes(id) on delete cascade,
  evento_id  text not null unique,   -- id do webhook (ex: log_abc123) — trava anti-duplicidade
  evento     text not null,          -- subscription.completed | .renewed | .cancelled
  valor      numeric(10,2),
  metodo     text,                   -- PIX | CARD
  payload    jsonb,
  created_at timestamptz not null default now()
);

comment on table  public.pagamentos           is 'Eventos de pagamento recebidos do AbacatePay';
comment on column public.pagamentos.evento_id is 'ID do evento no AbacatePay. UNIQUE garante que um webhook reenviado não seja processado 2x';

create index pagamentos_salao_idx on public.pagamentos (salao_id, created_at desc);

-- =============================================================
-- RLS
-- =============================================================
alter table public.pagamentos enable row level security;

-- Somente leitura pelo próprio salão. A escrita acontece apenas
-- pelas funções SECURITY DEFINER abaixo (chamadas pelo webhook).
create policy "Pagamentos: leitura pelo próprio salão"
  on public.pagamentos
  for select
  to authenticated
  using (salao_id = public.current_salao_id());

grant select on public.pagamentos to authenticated;

-- =============================================================
-- 3. Função: registra evento (idempotente)
-- =============================================================
-- Retorna false quando o evento JÁ foi processado antes — o
-- webhook usa isso para sair sem reprocessar.
create or replace function public.registrar_evento_pagamento(
  p_evento_id text,
  p_evento    text,
  p_salao_id  uuid,
  p_valor     numeric default null,
  p_metodo    text    default null,
  p_payload   jsonb   default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into pagamentos (salao_id, evento_id, evento, valor, metodo, payload)
  values (p_salao_id, p_evento_id, p_evento, p_valor, p_metodo, p_payload)
  on conflict (evento_id) do nothing;

  -- FOUND = false quando o ON CONFLICT ignorou (evento repetido)
  return found;
end;
$$;

revoke execute on function public.registrar_evento_pagamento(text, text, uuid, numeric, text, jsonb) from public, anon, authenticated;
grant   execute on function public.registrar_evento_pagamento(text, text, uuid, numeric, text, jsonb) to service_role;

-- =============================================================
-- 4. Função: atualiza o estado da assinatura do salão
-- =============================================================
create or replace function public.atualizar_assinatura(
  p_salao_id     uuid,
  p_status       text,
  p_plano        text default null,   -- null = mantém o plano atual
  p_assinatura_id text default null   -- null = mantém o id atual
)
returns void
language sql
security definer
set search_path = public
as $$
  update saloes
     set assinatura_status        = p_status,
         plano                    = coalesce(p_plano, plano),
         assinatura_id            = coalesce(p_assinatura_id, assinatura_id),
         assinatura_atualizada_em = now()
   where id = p_salao_id;
$$;

revoke execute on function public.atualizar_assinatura(uuid, text, text, text) from public, anon, authenticated;
grant   execute on function public.atualizar_assinatura(uuid, text, text, text) to service_role;
