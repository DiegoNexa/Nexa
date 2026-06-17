-- =============================================================
-- 015 — Flag de lembrete enviado
-- =============================================================
--
-- Marca quando o lembrete de e-mail já foi disparado, evitando
-- envios duplicados quando o cron roda múltiplas vezes dentro
-- da janela de envio (45–75min antes do agendamento).
--
-- Disparado por: /api/cron/lembretes
-- Gatilho: ~1h antes do agendamento
-- =============================================================

alter table public.agendamentos
  add column lembrete_enviado boolean not null default false;

comment on column public.agendamentos.lembrete_enviado is
  'Setado true após o cron disparar o e-mail de lembrete com sucesso.';

-- Índice parcial para o cron achar rapidamente os candidatos
-- (poucos registros: só os pendentes em status válido)
create index agendamentos_lembrete_pendente_idx
  on public.agendamentos (data_hora_inicio)
  where lembrete_enviado = false
    and status in ('agendado', 'confirmado');
