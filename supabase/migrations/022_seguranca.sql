-- =============================================================
-- 022 — Correções de segurança (auditoria)
-- =============================================================
--
-- 🔴 CRÍTICO: aplicar assim que possível. Enquanto esta migration
-- não rodar, os itens 1 e 2 abaixo continuam vazando dados entre
-- salões em produção.
-- =============================================================


-- -------------------------------------------------------------
-- 1 e 2. Funções do cron não podem ser executadas por usuários
-- -------------------------------------------------------------
-- As duas funções da migration 016 foram concedidas a
-- `authenticated` além de `service_role` — provavelmente enquanto
-- depurávamos o "permission denied". Só o cron precisa delas, e a
-- concessão indevida abre dois buracos:
--
--   listar_lembretes_pendentes()
--     É SECURITY DEFINER (ignora RLS) e NÃO filtra por salão — foi
--     escrita para o cron varrer a base inteira. Com acesso de
--     `authenticated`, qualquer cliente logado da Nexa consegue ler
--     nome, e-mail e horário dos clientes de TODOS os salões.
--     Vazamento de base entre concorrentes e violação de LGPD.
--
--   marcar_lembrete_enviado(uuid)
--     Aceita qualquer agendamento_id, sem checar dono. Um usuário
--     pode silenciar os lembretes de outro salão.
--
-- Correção: revogar de `authenticated`. O cron usa `service_role`,
-- então nada muda para ele.
--
-- Não adicionamos filtro por current_salao_id() dentro das funções
-- de propósito: elas PRECISAM varrer todos os salões (o cron não
-- está logado como ninguém). A fronteira certa é a permissão.

revoke execute on function public.listar_lembretes_pendentes()      from authenticated;
revoke execute on function public.marcar_lembrete_enviado(uuid)     from authenticated;


-- -------------------------------------------------------------
-- 3 e 4. Agendamento público: validar no banco, não só no app
-- -------------------------------------------------------------
-- A regra "horário no futuro" existia apenas em
-- app/agendar/[slug]/actions.ts. Como esta função é concedida a
-- `anon` e a chave publishable está no bundle do navegador, dá para
-- chamar a RPC direto pelo PostgREST e pular a validação — criando
-- agendamentos no passado, que corrompem folha e relatórios.
--
-- Regra geral: quando o banco é exposto, a camada de aplicação não
-- é fronteira de segurança. Validação que importa mora aqui.
--
-- Aproveitamos para fechar o abuso: sem limite, quem tem o slug
-- pode encher a agenda de horários falsos. A constraint EXCLUDE
-- impede sobreposição no mesmo profissional, mas não impede ocupar
-- vários horários distintos.
--
-- Corpo idêntico ao da migration 014, com dois blocos novos
-- marcados como "022".

create or replace function public.criar_agendamento_publico(
  p_slug              text,
  p_servico_id        uuid,
  p_profissional_id   uuid,
  p_cliente_nome      text,
  p_cliente_telefone  text,
  p_data_hora_inicio  timestamptz,
  p_observacoes       text,
  p_cliente_email     text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salao_id          uuid;
  v_duracao           int;
  v_cliente_id        uuid;
  v_data_hora_fim     timestamptz;
  v_agendamento_id    uuid;
  v_email_existente   text;
  v_email_limpo       text;
  v_futuros           int;
  -- Máximo de horários futuros que um mesmo telefone pode ter no
  -- salão. Cliente honesto raramente passa disso; um script, sim.
  c_limite_futuros    constant int := 3;
begin
  -- normaliza email (trim + lower) e ignora se vazio
  v_email_limpo := nullif(lower(trim(coalesce(p_cliente_email, ''))), '');

  -- Validações básicas
  if p_cliente_nome is null or char_length(trim(p_cliente_nome)) < 2 then
    raise exception 'nome_invalido';
  end if;

  if p_cliente_telefone is null or p_cliente_telefone !~ '^\d{10,11}$' then
    raise exception 'telefone_invalido';
  end if;

  -- email opcional, mas se vier precisa ter formato válido
  if v_email_limpo is not null
     and v_email_limpo !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
  then
    raise exception 'email_invalido';
  end if;

  -- [022] Data no futuro — antes só o app checava, e anon pode
  -- chamar esta função direto, pulando o app.
  if p_data_hora_inicio is null or p_data_hora_inicio <= now() then
    raise exception 'data_no_passado';
  end if;

  -- 1. Resolve salão pelo slug
  select id into v_salao_id from saloes where slug = p_slug;
  if v_salao_id is null then
    raise exception 'salao_nao_encontrado';
  end if;

  -- [022] Anti-abuso: limite de horários futuros por telefone neste
  -- salão. Fica depois de resolver o salão para poder contar por ele.
  select count(*) into v_futuros
  from agendamentos a
  join clientes c on c.id = a.cliente_id
  where a.salao_id = v_salao_id
    and c.telefone = p_cliente_telefone
    and a.status in ('agendado', 'confirmado')
    and a.data_hora_inicio > now();

  if v_futuros >= c_limite_futuros then
    raise exception 'limite_agendamentos';
  end if;

  -- 2. Valida profissional ativo do salão
  if not exists (
    select 1 from profissionais
    where id = p_profissional_id
      and salao_id = v_salao_id
      and ativo = true
  ) then
    raise exception 'profissional_invalido';
  end if;

  -- 3. Valida serviço ativo do salão + obtém duração
  select duracao_minutos into v_duracao
  from servicos
  where id = p_servico_id
    and salao_id = v_salao_id
    and ativo = true;

  if v_duracao is null then
    raise exception 'servico_invalido';
  end if;

  -- 4. Verifica se profissional atende esse serviço
  if exists (
    select 1 from comissoes_config
    where profissional_id = p_profissional_id
      and servico_id      = p_servico_id
      and atende          = false
  ) then
    raise exception 'profissional_nao_atende_servico';
  end if;

  -- 5. Calcula data_hora_fim
  v_data_hora_fim := p_data_hora_inicio + make_interval(mins => v_duracao);

  -- 6. Cliente: procura por telefone, cria se novo,
  --    completa email se ainda não tinha
  select id, email into v_cliente_id, v_email_existente
  from clientes
  where salao_id = v_salao_id
    and telefone = p_cliente_telefone
  limit 1;

  if v_cliente_id is null then
    -- Cliente novo — salva tudo
    insert into clientes (salao_id, nome, telefone, email)
    values (v_salao_id, trim(p_cliente_nome), p_cliente_telefone, v_email_limpo)
    returning id into v_cliente_id;
  else
    -- Cliente existente — só completa email se cliente ainda não tinha
    -- (não sobrescreve — salão pode ter atualizado manualmente)
    if v_email_limpo is not null
       and (v_email_existente is null or trim(v_email_existente) = '')
    then
      update clientes set email = v_email_limpo where id = v_cliente_id;
    end if;
  end if;

  -- 7. Insere agendamento (EXCLUDE constraint captura sobreposição)
  insert into agendamentos (
    salao_id,
    cliente_id,
    profissional_id,
    servico_id,
    data_hora_inicio,
    data_hora_fim,
    status,
    origem,
    observacoes
  ) values (
    v_salao_id,
    v_cliente_id,
    p_profissional_id,
    p_servico_id,
    p_data_hora_inicio,
    v_data_hora_fim,
    'agendado',
    'link_publico',
    nullif(trim(coalesce(p_observacoes, '')), '')
  )
  returning id into v_agendamento_id;

  return json_build_object(
    'agendamento_id',   v_agendamento_id,
    'cliente_id',       v_cliente_id,
    'data_hora_inicio', p_data_hora_inicio,
    'data_hora_fim',    v_data_hora_fim
  );
end;
$$;

revoke execute on function public.criar_agendamento_publico(
  text, uuid, uuid, text, text, timestamptz, text, text
) from public;

grant execute on function public.criar_agendamento_publico(
  text, uuid, uuid, text, text, timestamptz, text, text
) to anon, authenticated;
