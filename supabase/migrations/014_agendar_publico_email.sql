-- =============================================================
-- 014 — Email opcional no link público de agendamento
-- =============================================================
--
-- Adiciona parâmetro p_cliente_email à função criar_agendamento_publico.
--
-- Comportamento:
--   - Se o cliente é NOVO: salva o email no cadastro
--   - Se o cliente JÁ EXISTE (encontrado pelo telefone):
--       * Atualiza apenas se o cliente ainda não tinha email
--       * Não sobrescreve email existente (cliente pode ter atualizado
--         manualmente o email no dashboard do salão)
--
-- Usado depois pra disparar lembretes por email do agendamento
-- (infra de envio com Resend ainda a configurar).
--
-- O campo clientes.email já existe no schema (migration 006).
-- =============================================================

-- Drop da versão anterior (signature mudou)
drop function if exists public.criar_agendamento_publico(
  text, uuid, uuid, text, text, timestamptz, text
);

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

  -- 1. Resolve salão pelo slug
  select id into v_salao_id from saloes where slug = p_slug;
  if v_salao_id is null then
    raise exception 'salao_nao_encontrado';
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
