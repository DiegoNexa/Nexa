-- =============================================================
-- 024 — Agendador dos lembretes (pg_cron + pg_net)
-- =============================================================
--
-- PROBLEMA QUE RESOLVE: o endpoint /api/cron/lembretes funciona,
-- mas nada o chamava. O cron saiu do vercel.json (commit 2925389)
-- porque o plano Hobby só permite 1 execução por dia, e a janela
-- do lembrete é de 45 a 75 minutos antes do horário — uma execução
-- diária quase nunca cai dentro dela. Resultado: nenhum lembrete
-- era enviado sozinho.
--
-- Aqui o próprio banco chama o endpoint a cada 15 minutos, de
-- graça e sem depender do plano da Vercel.
--
-- SEGREDO: o CRON_SECRET NÃO entra nesta migration — ela é
-- versionada no git. Ele fica no Vault do Supabase e é lido em
-- tempo de execução. Veja a instrução no fim do arquivo.
-- =============================================================


-- -------------------------------------------------------------
-- 1. Extensões
-- -------------------------------------------------------------
-- pg_cron: agenda tarefas dentro do Postgres
-- pg_net : faz chamadas HTTP a partir do banco
create extension if not exists pg_cron;
create extension if not exists pg_net;


-- -------------------------------------------------------------
-- 2. Função que chama o endpoint
-- -------------------------------------------------------------
-- SECURITY DEFINER porque precisa ler o Vault, que usuário comum
-- não acessa. Não recebe parâmetro e não devolve dado nenhum:
-- não há nada que um chamador possa manipular.
create or replace function public.disparar_lembretes()
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $fn$
declare
  v_segredo text;
begin
  select decrypted_secret
    into v_segredo
    from vault.decrypted_secrets
   where name = 'cron_secret_nexa';

  if v_segredo is null then
    raise exception 'Segredo cron_secret_nexa não encontrado no Vault. Veja o fim da migration 024.';
  end if;

  -- Resposta ignorada de propósito: o endpoint já registra os
  -- envios e marca lembrete_enviado. Se ele falhar, a próxima
  -- execução (15 min depois) tenta de novo, porque o agendamento
  -- continua dentro da janela de 45 a 75 minutos.
  perform net.http_get(
    url     := 'https://nexabase.com.br/api/cron/lembretes',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_segredo)
  );
end;
$fn$;

comment on function public.disparar_lembretes is
  'Chamada pelo pg_cron a cada 15 min: aciona /api/cron/lembretes com o CRON_SECRET guardado no Vault.';

-- Ninguém além do agendador precisa disto
revoke execute on function public.disparar_lembretes() from public, anon, authenticated;


-- -------------------------------------------------------------
-- 3. Agendamento
-- -------------------------------------------------------------
-- Remove antes de criar para a migration poder ser rodada de novo
-- sem duplicar o job.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'nexa-lembretes') then
    perform cron.unschedule('nexa-lembretes');
  end if;
end;
$$;

-- A cada 15 minutos. A janela do lembrete tem 30 minutos de
-- largura (45 a 75 min antes), então duas execuções caem dentro
-- dela — há uma segunda chance se a primeira falhar.
select cron.schedule(
  'nexa-lembretes',
  '*/15 * * * *',
  $cmd$ select public.disparar_lembretes(); $cmd$
);


-- =============================================================
-- PASSO MANUAL — rodar UMA VEZ, e não versionar
-- =============================================================
--
-- Guarde o CRON_SECRET no Vault (o mesmo valor que está no
-- .env.local e nas variáveis da Vercel):
--
--   select vault.create_secret('COLE_AQUI_O_CRON_SECRET', 'cron_secret_nexa');
--
-- Para conferir que funcionou:
--
--   select public.disparar_lembretes();          -- não deve dar erro
--   select * from cron.job where jobname = 'nexa-lembretes';
--   select * from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'nexa-lembretes')
--    order by start_time desc limit 5;
--
-- Para trocar o segredo depois:
--
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'cron_secret_nexa'),
--     'NOVO_VALOR'
--   );
-- =============================================================
