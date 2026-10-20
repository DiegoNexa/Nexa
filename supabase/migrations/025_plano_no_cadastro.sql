-- =============================================================
-- 025 — Plano escolhido no cadastro
-- =============================================================
--
-- O usuário passa a escolher o plano no cadastro e testa, durante os
-- 30 dias grátis, só o que aquele plano inclui. Antes, `saloes.plano`
-- nascia 'trial' e o gating não tinha como saber o que liberar.
--
-- Mudança: o trigger lê `plano` da metadata do signup e grava na
-- coluna. O `assinatura_status` continua 'trial' até o pagamento —
-- são coisas diferentes: `plano` = o que pode usar, `assinatura_status`
-- = se o acesso está em dia.
--
-- Salões antigos (plano 'trial') seguem válidos: o código trata
-- 'trial' como o plano mínimo (Solo), então nada quebra.
-- =============================================================

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
  v_plano       text;
begin
  v_meta := new.raw_user_meta_data;

  if v_meta->>'nome_salao' is null or v_meta->>'slug_salao' is null then
    return new;
  end if;

  v_nome_salao := v_meta->>'nome_salao';
  v_slug       := v_meta->>'slug_salao';
  v_nome_user  := coalesce(v_meta->>'nome', new.email);
  v_telefone   := v_meta->>'telefone';
  v_porte      := v_meta->>'porte';
  v_plano      := v_meta->>'plano';

  -- ===== Defesa em profundidade =====
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

  -- Plano: default 'solo' quando não informado (o mais seguro — nunca
  -- libera recurso pago sem escolha explícita). 'trial' não é aceito
  -- aqui: durante o teste o plano guardado é um dos três pagos.
  if v_plano is null then
    v_plano := 'solo';
  elsif v_plano not in ('solo', 'profissional', 'premium') then
    raise exception 'Plano inválido';
  end if;

  -- ===== Insere =====
  insert into public.saloes (nome, slug, telefone_whatsapp, porte, plano)
  values (v_nome_salao, v_slug, v_telefone, v_porte, v_plano)
  returning id into v_salao_id;

  insert into public.usuarios (id, salao_id, email, nome, role)
  values (new.id, v_salao_id, new.email, v_nome_user, 'dono');

  return new;
end;
$$;
