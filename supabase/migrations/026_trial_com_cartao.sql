-- =============================================================
-- 026 — Cartão antes do teste grátis (trial no Stripe)
-- =============================================================
--
-- A partir daqui o cadastro captura o cartão logo de início e a
-- assinatura é criada no Stripe JÁ com 30 dias de trial (R$ 0 hoje,
-- cobrança automática ao fim do teste). O webhook, ao receber o
-- checkout.session.completed de uma sessão com trial, grava o salão
-- como 'trial' e precisa fixar o fim do teste alinhado ao Stripe.
--
-- Para isso, `atualizar_assinatura` ganha um parâmetro opcional
-- p_trial_termina_em. Como o número de argumentos muda, não dá pra
-- usar CREATE OR REPLACE (criaria uma sobrecarga ambígua): derrubamos
-- a versão de 4 argumentos e recriamos com 5.
--
-- ORDEM DE APLICAÇÃO: aplicar esta migration ANTES de publicar o
-- código novo do webhook, para a função de 5 args já existir quando o
-- webhook chamar passando a data do trial.
-- =============================================================

drop function if exists public.atualizar_assinatura(uuid, text, text, text);

create or replace function public.atualizar_assinatura(
  p_salao_id         uuid,
  p_status           text,
  p_plano            text        default null,   -- null = mantém o plano atual
  p_assinatura_id    text        default null,   -- null = mantém o id atual
  p_trial_termina_em timestamptz default null    -- null = mantém o fim do trial atual
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
         trial_termina_em         = coalesce(p_trial_termina_em, trial_termina_em),
         assinatura_atualizada_em = now()
   where id = p_salao_id;
$$;

revoke execute on function public.atualizar_assinatura(uuid, text, text, text, timestamptz) from public, anon, authenticated;
grant   execute on function public.atualizar_assinatura(uuid, text, text, text, timestamptz) to service_role;

comment on column public.saloes.assinatura_id is 'ID da assinatura no Stripe (sub_...). Vazio = ainda sem cartão / teste não iniciado.';
comment on column public.saloes.trial_termina_em is 'Fim do teste grátis. Com cartão antes do teste, bloqueia o acesso quando vence sem pagamento.';
