-- =============================================================
-- 013 — Link público de agendamento
-- =============================================================
--
-- Permite que o cliente final agende horário sem ter conta no
-- sistema. Acessa /agendar/[slug-do-salao], escolhe profissional,
-- serviço e horário, informa nome+telefone e confirma.
--
-- ESTRATÉGIA DE SEGURANÇA:
--   Em vez de afrouxar RLS pra anon, usamos funções
--   SECURITY DEFINER que validam tudo internamente e expõem
--   apenas o mínimo necessário.
--
-- Funções (read):
--   - get_salao_publico(slug)       → id, nome, slug
--   - get_servicos_publico(slug)    → catálogo ativo
--   - get_profissionais_publico(slug) → equipe ativa
--   - get_bloqueios_publico(slug)   → quais (prof × serv) não atendem
--   - get_carga_horaria_publico(slug) → horários de trabalho
--   - get_agendamentos_publico(slug, de, ate) → ocupação (sem dados pessoais)
--
-- Função (write):
--   - criar_agendamento_publico(...)
--     Valida tudo atomicamente, cria/encontra cliente por telefone,
--     calcula data_hora_fim pela duração do serviço, insere
--     agendamento com origem='link_publico' e status='agendado'.
-- =============================================================

-- ─── Salão (slug → id, nome) ──────────────────────────────────
create or replace function public.get_salao_publico(p_slug text)
returns table(id uuid, nome text, slug text)
language sql
stable
security definer
set search_path = public
as $$
  select id, nome, slug
  from saloes
  where slug = p_slug
  limit 1;
$$;

revoke execute on function public.get_salao_publico(text) from public;
grant   execute on function public.get_salao_publico(text) to anon, authenticated;

-- ─── Serviços ativos ──────────────────────────────────────────
create or replace function public.get_servicos_publico(p_slug text)
returns table(id uuid, nome text, descricao text, duracao_minutos int, preco numeric)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.nome, s.descricao, s.duracao_minutos, s.preco
  from servicos s
  join saloes sa on sa.id = s.salao_id
  where sa.slug = p_slug and s.ativo = true
  order by s.nome;
$$;

revoke execute on function public.get_servicos_publico(text) from public;
grant   execute on function public.get_servicos_publico(text) to anon, authenticated;

-- ─── Profissionais ativos ─────────────────────────────────────
create or replace function public.get_profissionais_publico(p_slug text)
returns table(id uuid, nome text, cor text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.nome, p.cor
  from profissionais p
  join saloes s on s.id = p.salao_id
  where s.slug = p_slug and p.ativo = true
  order by p.nome;
$$;

revoke execute on function public.get_profissionais_publico(text) from public;
grant   execute on function public.get_profissionais_publico(text) to anon, authenticated;

-- ─── Bloqueios: (profissional × serviço) que não atende ───────
create or replace function public.get_bloqueios_publico(p_slug text)
returns table(profissional_id uuid, servico_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select cc.profissional_id, cc.servico_id
  from comissoes_config cc
  join profissionais p on p.id = cc.profissional_id
  join saloes s on s.id = p.salao_id
  where s.slug = p_slug and cc.atende = false;
$$;

revoke execute on function public.get_bloqueios_publico(text) from public;
grant   execute on function public.get_bloqueios_publico(text) to anon, authenticated;

-- ─── Carga horária dos profissionais ──────────────────────────
create or replace function public.get_carga_horaria_publico(p_slug text)
returns table(profissional_id uuid, dia_semana int, hora_inicio time, hora_fim time)
language sql
stable
security definer
set search_path = public
as $$
  select ch.profissional_id, ch.dia_semana, ch.hora_inicio, ch.hora_fim
  from carga_horaria ch
  join profissionais p on p.id = ch.profissional_id
  join saloes s on s.id = p.salao_id
  where s.slug = p_slug;
$$;

revoke execute on function public.get_carga_horaria_publico(text) from public;
grant   execute on function public.get_carga_horaria_publico(text) to anon, authenticated;

-- ─── Agendamentos existentes (pra calcular slots livres) ──────
-- Retorna SOMENTE horários ocupados, sem cliente/observações
create or replace function public.get_agendamentos_publico(
  p_slug      text,
  p_de        timestamptz,
  p_ate       timestamptz
)
returns table(profissional_id uuid, data_hora_inicio timestamptz, data_hora_fim timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select a.profissional_id, a.data_hora_inicio, a.data_hora_fim
  from agendamentos a
  join saloes s on s.id = a.salao_id
  where s.slug = p_slug
    and a.status not in ('cancelado', 'falta')
    and a.data_hora_inicio >= p_de
    and a.data_hora_inicio < p_ate;
$$;

revoke execute on function public.get_agendamentos_publico(text, timestamptz, timestamptz) from public;
grant   execute on function public.get_agendamentos_publico(text, timestamptz, timestamptz) to anon, authenticated;

-- =============================================================
-- Criação do agendamento (write)
-- =============================================================
create or replace function public.criar_agendamento_publico(
  p_slug              text,
  p_servico_id        uuid,
  p_profissional_id   uuid,
  p_cliente_nome      text,
  p_cliente_telefone  text,
  p_data_hora_inicio  timestamptz,
  p_observacoes       text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salao_id        uuid;
  v_duracao         int;
  v_cliente_id      uuid;
  v_data_hora_fim   timestamptz;
  v_agendamento_id  uuid;
begin
  -- Validação básica de inputs
  if p_cliente_nome is null or char_length(trim(p_cliente_nome)) < 2 then
    raise exception 'nome_invalido';
  end if;

  if p_cliente_telefone is null or p_cliente_telefone !~ '^\d{10,11}$' then
    raise exception 'telefone_invalido';
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
  --    (linha em comissoes_config com atende=false bloqueia)
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

  -- 6. Procura cliente existente pelo telefone (mesmo salão)
  --    ou cria um novo. Reuso evita duplicatas.
  select id into v_cliente_id
  from clientes
  where salao_id = v_salao_id
    and telefone = p_cliente_telefone
  limit 1;

  if v_cliente_id is null then
    insert into clientes (salao_id, nome, telefone)
    values (v_salao_id, trim(p_cliente_nome), p_cliente_telefone)
    returning id into v_cliente_id;
  end if;

  -- 7. Insere agendamento. EXCLUDE constraint vai capturar
  --    sobreposições de horário automaticamente.
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

revoke execute on function public.criar_agendamento_publico(text, uuid, uuid, text, text, timestamptz, text) from public;
grant   execute on function public.criar_agendamento_publico(text, uuid, uuid, text, text, timestamptz, text) to anon, authenticated;

-- =============================================================
-- Confirmação pós-agendamento
-- =============================================================
-- Retorna dados completos do agendamento para a página de sucesso.
-- Exige id + slug — anon não consegue enumerar agendamentos de
-- outros clientes mesmo sabendo um id (precisa do slug correto).
create or replace function public.get_confirmacao_publico(
  p_slug            text,
  p_agendamento_id  uuid
)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'salao_nome',         s.nome,
    'cliente_nome',       c.nome,
    'profissional_nome',  p.nome,
    'profissional_cor',   p.cor,
    'servico_nome',       sv.nome,
    'servico_preco',      sv.preco,
    'servico_duracao',    sv.duracao_minutos,
    'data_hora_inicio',   a.data_hora_inicio,
    'data_hora_fim',      a.data_hora_fim,
    'status',             a.status
  )
  from agendamentos a
  join saloes        s  on s.id  = a.salao_id
  join clientes      c  on c.id  = a.cliente_id
  join profissionais p  on p.id  = a.profissional_id
  join servicos      sv on sv.id = a.servico_id
  where a.id   = p_agendamento_id
    and s.slug = p_slug;
$$;

revoke execute on function public.get_confirmacao_publico(text, uuid) from public;
grant   execute on function public.get_confirmacao_publico(text, uuid) to anon, authenticated;
