-- =============================================================
-- 020 — Baixa automática de estoque por atendimento (Pilar 3 · fase 2)
-- =============================================================
--
-- Liga serviços a produtos consumidos (quanto de cada produto um
-- serviço gasta). Quando um agendamento é marcado como 'concluido',
-- o estoque desses produtos é debitado automaticamente. Se o
-- agendamento sair de 'concluido' (cancelado/falta/reaberto), a
-- baixa é estornada.
--
-- Peças:
--   servico_produtos           → receita de consumo (servico × produto × qtd)
--   agendamentos.estoque_baixado → flag idempotência (baixa 1x por vez)
--   movimentos_estoque.agendamento_id → liga o movimento automático
--   sincronizar_estoque_agendamento() → reconcilia baixa/estorno
--
-- Chamada pelo app logo após mudar o status do agendamento.
-- =============================================================

-- 1. Receita de consumo por serviço
create table public.servico_produtos (
  id          uuid primary key default gen_random_uuid(),
  servico_id  uuid not null references public.servicos(id) on delete cascade,
  produto_id  uuid not null references public.produtos(id) on delete cascade,
  quantidade  numeric(10,2) not null check (quantidade > 0),
  unique (servico_id, produto_id)
);

comment on table public.servico_produtos is 'Quanto de cada produto um serviço consome (baixa automática)';

create index servico_produtos_servico_idx on public.servico_produtos (servico_id);

-- 2. Flag de idempotência no agendamento
alter table public.agendamentos
  add column estoque_baixado boolean not null default false;

comment on column public.agendamentos.estoque_baixado is 'true quando a baixa automática de estoque já foi aplicada';

-- 3. Liga movimento automático ao agendamento (pra permitir estorno)
alter table public.movimentos_estoque
  add column agendamento_id uuid references public.agendamentos(id) on delete set null;

create index movimentos_estoque_agendamento_idx
  on public.movimentos_estoque (agendamento_id) where agendamento_id is not null;

-- =============================================================
-- RLS de servico_produtos (via servico → salão)
-- =============================================================
alter table public.servico_produtos enable row level security;

create policy "Servico produtos: gestão pelo próprio salão"
  on public.servico_produtos
  for all
  to authenticated
  using (
    servico_id in (
      select id from public.servicos where salao_id = public.current_salao_id()
    )
  )
  with check (
    servico_id in (
      select id from public.servicos where salao_id = public.current_salao_id()
    )
  );

grant select, insert, update, delete on public.servico_produtos to authenticated;

-- =============================================================
-- Função: reconcilia estoque conforme o status do agendamento
-- =============================================================
-- Idempotente via agendamentos.estoque_baixado:
--   status='concluido' e não baixado  → debita (clamp em 0) e marca
--   status<>'concluido' e baixado      → estorna (restaura + apaga
--                                         os movimentos automáticos)
create or replace function public.sincronizar_estoque_agendamento(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salao   uuid;
  v_status  text;
  v_baixado boolean;
  v_servico uuid;
  r         record;
  v_dec     numeric;
begin
  select salao_id, status, estoque_baixado, servico_id
    into v_salao, v_status, v_baixado, v_servico
    from agendamentos where id = p_id;

  if v_salao is null or v_salao <> current_salao_id() then
    return;
  end if;

  -- Concluído e ainda não debitou → dar baixa
  if v_status = 'concluido' and not v_baixado then
    for r in
      select produto_id, quantidade from servico_produtos where servico_id = v_servico
    loop
      -- consome no máximo o que existe (produtos.quantidade >= 0)
      select least(r.quantidade, p.quantidade) into v_dec
        from produtos p where p.id = r.produto_id;

      if v_dec is not null and v_dec > 0 then
        update produtos set quantidade = quantidade - v_dec where id = r.produto_id;
        insert into movimentos_estoque (produto_id, tipo, quantidade, motivo, agendamento_id, created_by)
          values (r.produto_id, 'saida', v_dec, 'Baixa automática por atendimento', p_id, auth.uid());
      end if;
    end loop;
    update agendamentos set estoque_baixado = true where id = p_id;

  -- Saiu de concluído e tinha debitado → estornar
  elsif v_status <> 'concluido' and v_baixado then
    for r in
      select produto_id, quantidade from movimentos_estoque
      where agendamento_id = p_id and tipo = 'saida'
    loop
      update produtos set quantidade = quantidade + r.quantidade where id = r.produto_id;
    end loop;
    -- remove os movimentos automáticos (evita acúmulo entre ciclos)
    delete from movimentos_estoque where agendamento_id = p_id;
    update agendamentos set estoque_baixado = false where id = p_id;
  end if;
end;
$$;

revoke execute on function public.sincronizar_estoque_agendamento(uuid) from public, anon;
grant   execute on function public.sincronizar_estoque_agendamento(uuid) to authenticated;
