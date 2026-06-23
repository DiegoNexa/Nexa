-- =============================================================
-- 016 — Funções SECURITY DEFINER pro cron de lembretes
-- =============================================================
--
-- PROBLEMA RESOLVIDO:
--   Projetos novos do Supabase com sistema "API Keys" novo
--   não dão GRANT automático ao service_role em tabelas
--   públicas. Isso causa "permission denied for table X"
--   mesmo usando service_role.
--
-- SOLUÇÃO:
--   Funções SECURITY DEFINER (igual fizemos pro link público
--   em migration 013). Rodam com privilégios do owner
--   (postgres), independente do role da conexão.
--
--   O cron endpoint chama essas funções via supabase.rpc(),
--   bypass total do problema de GRANT.
--
-- SEGURANÇA:
--   Funções só são executáveis por authenticated e service_role.
--   Anon NÃO tem acesso. Mesmo assim, o cron endpoint exige
--   CRON_SECRET no header antes de chamar — defesa em camadas.
-- =============================================================

-- GRANTs defensivos no service_role pra agendamentos (caso o
-- problema seja só falta de GRANT, sem precisar das funções)
grant select, update on public.agendamentos  to service_role;
grant select          on public.clientes      to service_role;
grant select          on public.servicos      to service_role;
grant select          on public.profissionais to service_role;
grant select          on public.saloes        to service_role;

-- =============================================================
-- 1. Função pra listar lembretes pendentes
-- =============================================================
-- Retorna agendamentos na janela [now+45min, now+75min] que
-- ainda não receberam lembrete e têm e-mail do cliente.
create or replace function public.listar_lembretes_pendentes()
returns table(
  agendamento_id    uuid,
  data_hora_inicio  timestamptz,
  cliente_nome      text,
  cliente_email     text,
  servico_nome      text,
  profissional_nome text,
  salao_nome        text
)
language sql
security definer
set search_path = public
as $$
  select
    a.id,
    a.data_hora_inicio,
    c.nome,
    c.email,
    s.nome,
    p.nome,
    sa.nome
  from agendamentos a
  join clientes      c  on c.id  = a.cliente_id
  join servicos      s  on s.id  = a.servico_id
  join profissionais p  on p.id  = a.profissional_id
  join saloes        sa on sa.id = a.salao_id
  where a.lembrete_enviado = false
    and a.status in ('agendado', 'confirmado')
    and a.data_hora_inicio between now() + interval '45 minutes'
                              and now() + interval '75 minutes'
    and c.email is not null
    and c.email <> '';
$$;

revoke execute on function public.listar_lembretes_pendentes() from public, anon;
grant   execute on function public.listar_lembretes_pendentes() to authenticated, service_role;

-- =============================================================
-- 2. Função pra marcar como enviado
-- =============================================================
create or replace function public.marcar_lembrete_enviado(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.agendamentos set lembrete_enviado = true where id = p_id;
$$;

revoke execute on function public.marcar_lembrete_enviado(uuid) from public, anon;
grant   execute on function public.marcar_lembrete_enviado(uuid) to authenticated, service_role;
