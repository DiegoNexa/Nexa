-- =============================================================
-- 005 — Endurecimento pré-lançamento
-- =============================================================
--
-- 1. (A5) Bloqueia auto-promoção: usuário não pode alterar o
--    próprio `role` nem o próprio `salao_id`.
--    Hoje só existe role='dono', mas quando o módulo de gestão
--    de funcionários existir, essa policy frouxa permitiria que
--    um `profissional` se promovesse a `dono` com 1 UPDATE.
--
-- 2. (A4) Defesa em profundidade no trigger handle_new_user.
--    O Server Action (Zod) já valida tudo, MAS se alguém chamar
--    auth.signUp() diretamente via REST com metadados maliciosos,
--    o trigger insere sem validar. As CHECK constraints da tabela
--    pegam a maioria, mas faltam:
--    - tamanho do nome do usuário
--    - formato do telefone
--    Adicionamos checagens explícitas no trigger.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Trigger BEFORE UPDATE em usuarios — bloqueia auto-promoção
-- -------------------------------------------------------------
create or replace function public.usuarios_prevent_self_promotion()
returns trigger
language plpgsql
as $$
begin
  -- Quando o próprio usuário edita seu registro, ele NÃO pode
  -- mexer em role nem salao_id. Outros usuários (dono editando
  -- a equipe, no futuro) passam livre.
  if auth.uid() = old.id then
    if new.role <> old.role then
      raise exception 'Não é permitido alterar o próprio papel.';
    end if;
    if new.salao_id <> old.salao_id then
      raise exception 'Não é permitido alterar o próprio salão.';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.usuarios_prevent_self_promotion() is
  'Trigger BEFORE UPDATE: bloqueia o usuário de alterar o próprio role ou salao_id (auto-promoção)';

revoke execute on function public.usuarios_prevent_self_promotion() from public;
revoke execute on function public.usuarios_prevent_self_promotion() from anon;
revoke execute on function public.usuarios_prevent_self_promotion() from authenticated;

drop trigger if exists usuarios_prevent_self_promotion_trigger on public.usuarios;
create trigger usuarios_prevent_self_promotion_trigger
  before update on public.usuarios
  for each row
  execute function public.usuarios_prevent_self_promotion();

-- -------------------------------------------------------------
-- 2. Revalidação dos metadados no trigger de signup
-- -------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salao_id    uuid;
  v_meta        jsonb;
  v_nome_salao  text;
  v_slug        text;
  v_nome_user   text;
  v_telefone    text;
  v_porte       text;
begin
  v_meta := new.raw_user_meta_data;

  -- Sem metadados de signup (ex: usuário criado manualmente pelo
  -- dashboard): apenas deixa passar. O usuário ficará sem salão
  -- vinculado e não conseguirá usar o sistema até ser associado.
  if v_meta->>'nome_salao' is null or v_meta->>'slug_salao' is null then
    return new;
  end if;

  v_nome_salao := v_meta->>'nome_salao';
  v_slug       := v_meta->>'slug_salao';
  v_nome_user  := coalesce(v_meta->>'nome', new.email);
  v_telefone   := v_meta->>'telefone';
  v_porte      := v_meta->>'porte';

  -- ===== Defesa em profundidade =====
  -- Server Action (Zod) já valida. Trigger revalida caso o signUp
  -- venha diretamente via API REST com metadados não-sanitizados.

  if char_length(v_nome_salao) < 2 or char_length(v_nome_salao) > 80 then
    raise exception 'Nome do salão fora do tamanho permitido (2-80 chars)';
  end if;

  if v_slug !~ '^[a-z0-9-]{4,60}$' then
    raise exception 'Slug do salão em formato inválido';
  end if;

  if char_length(v_nome_user) < 2 or char_length(v_nome_user) > 100 then
    raise exception 'Nome do usuário fora do tamanho permitido (2-100 chars)';
  end if;

  if v_telefone is not null and v_telefone !~ '^\d{10,11}$' then
    raise exception 'Telefone em formato inválido (somente dígitos, 10-11)';
  end if;

  if v_porte is not null and v_porte not in ('solo', 'bairro', 'consolidado') then
    raise exception 'Porte inválido';
  end if;

  -- ===== Insere =====
  insert into public.saloes (nome, slug, telefone_whatsapp, porte)
  values (v_nome_salao, v_slug, v_telefone, v_porte)
  returning id into v_salao_id;

  insert into public.usuarios (id, salao_id, email, nome, role)
  values (new.id, v_salao_id, new.email, v_nome_user, 'dono');

  return new;
end;
$$;

-- Mantém o lockdown de execute (já feito na 003/004, mas garante
-- após o create or replace)
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
