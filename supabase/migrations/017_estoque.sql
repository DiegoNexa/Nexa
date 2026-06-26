-- =============================================================
-- 017 — Gestão de estoque (Pilar 3)
-- =============================================================
--
-- Tabelas:
--   produtos            → catálogo de insumos/produtos do salão,
--                         com quantidade atual e mínima (alerta).
--   movimentos_estoque  → histórico de entradas/saídas. A quantidade
--                         do produto é sempre derivada por estes
--                         movimentos (contabilidade honesta).
--
-- A alteração de quantidade NÃO é feita por UPDATE direto na coluna
-- pelo app — passa pela função registrar_movimento_estoque(), que
-- aplica o delta de forma atômica e bloqueia estoque negativo.
--
-- RLS: produtos via salao_id (= current_salao_id()); movimentos via
-- produto → salão. Padrão idêntico ao das migrations 009-012.
--
-- Baixa automática ao concluir serviço fica para uma migration
-- futura (vínculo serviço × produto). Aqui só entrada/saída manual.
-- =============================================================

-- -------------------------------------------------------------
-- produtos
-- -------------------------------------------------------------
create table public.produtos (
  id                uuid primary key default gen_random_uuid(),
  salao_id          uuid not null references public.saloes(id) on delete cascade,
  nome              text not null check (char_length(nome) between 2 and 80),
  descricao         text,
  unidade           text not null default 'un' check (char_length(unidade) between 1 and 10),
  quantidade        numeric(10,2) not null default 0 check (quantidade >= 0),
  quantidade_minima numeric(10,2) not null default 0 check (quantidade_minima >= 0),
  preco_custo       numeric(10,2) check (preco_custo is null or preco_custo >= 0),
  ativo             boolean not null default true,
  created_at        timestamptz not null default now()
);

comment on table  public.produtos                   is 'Catálogo de produtos/insumos com controle de estoque';
comment on column public.produtos.unidade           is 'Unidade de medida: un, ml, g, kg, L, etc';
comment on column public.produtos.quantidade        is 'Saldo atual. Alterado só via registrar_movimento_estoque()';
comment on column public.produtos.quantidade_minima is 'Limite para alerta de estoque baixo';

create index produtos_salao_idx on public.produtos (salao_id);

-- -------------------------------------------------------------
-- movimentos_estoque
-- -------------------------------------------------------------
create table public.movimentos_estoque (
  id          uuid primary key default gen_random_uuid(),
  produto_id  uuid not null references public.produtos(id) on delete cascade,
  tipo        text not null check (tipo in ('entrada','saida')),
  quantidade  numeric(10,2) not null check (quantidade > 0),
  motivo      text,
  created_by  uuid references public.usuarios(id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on table  public.movimentos_estoque      is 'Histórico de entradas e saídas de estoque';
comment on column public.movimentos_estoque.tipo is 'entrada (soma) | saida (subtrai)';

create index movimentos_estoque_produto_idx
  on public.movimentos_estoque (produto_id, created_at desc);

-- =============================================================
-- RLS
-- =============================================================
alter table public.produtos           enable row level security;
alter table public.movimentos_estoque enable row level security;

create policy "Produtos: gestão pelo próprio salão"
  on public.produtos
  for all
  to authenticated
  using      (salao_id = public.current_salao_id())
  with check (salao_id = public.current_salao_id());

create policy "Movimentos estoque: gestão pelo próprio salão"
  on public.movimentos_estoque
  for all
  to authenticated
  using (
    produto_id in (
      select id from public.produtos
      where  salao_id = public.current_salao_id()
    )
  )
  with check (
    produto_id in (
      select id from public.produtos
      where  salao_id = public.current_salao_id()
    )
  );

grant select, insert, update, delete on public.produtos           to authenticated;
grant select, insert, update, delete on public.movimentos_estoque to authenticated;

-- =============================================================
-- Função: registra movimento + aplica delta atômico
-- =============================================================
-- Bloqueia estoque negativo e garante que o produto pertence ao
-- salão do usuário logado. SECURITY DEFINER pra escrever nas duas
-- tabelas de forma consistente.
create or replace function public.registrar_movimento_estoque(
  p_produto_id uuid,
  p_tipo       text,
  p_quantidade numeric,
  p_motivo     text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salao uuid;
  v_delta numeric;
begin
  select salao_id into v_salao from produtos where id = p_produto_id;
  if v_salao is null or v_salao <> current_salao_id() then
    raise exception 'produto_invalido';
  end if;

  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'quantidade_invalida';
  end if;

  v_delta := case p_tipo
    when 'entrada' then  p_quantidade
    when 'saida'   then -p_quantidade
    else null
  end;
  if v_delta is null then
    raise exception 'tipo_invalido';
  end if;

  -- Aplica o delta só se não deixar o saldo negativo
  update produtos
    set quantidade = quantidade + v_delta
    where id = p_produto_id
      and quantidade + v_delta >= 0;

  if not found then
    raise exception 'estoque_insuficiente';
  end if;

  insert into movimentos_estoque (produto_id, tipo, quantidade, motivo, created_by)
  values (p_produto_id, p_tipo, p_quantidade, nullif(trim(coalesce(p_motivo,'')), ''), auth.uid());
end;
$$;

revoke execute on function public.registrar_movimento_estoque(uuid, text, numeric, text) from public, anon;
grant   execute on function public.registrar_movimento_estoque(uuid, text, numeric, text) to authenticated;
