-- =============================================================
-- 007 — Conserta recursão infinita nas policies de RLS
-- =============================================================
--
-- PROBLEMA:
--   A policy "Usuários: SELECT do mesmo salão" da migration 001
--   usa subquery em public.usuarios:
--
--     using (salao_id = (select salao_id from usuarios where id = auth.uid()))
--
--   Como a policy está NA tabela usuarios, a subquery dispara a
--   própria policy → recursão infinita → Postgres aborta.
--
--   MESMO problema afeta TODAS as policies da migration 006
--   (profissionais, servicos, clientes, carga_horaria, agendamentos)
--   porque elas fazem subquery em usuarios pra pegar o salao_id.
--
-- SOLUÇÃO:
--   SECURITY DEFINER function que bypassa RLS pra fazer o lookup
--   uma vez, sem recursão. Função é restrita a authenticated e só
--   retorna o salao_id do PRÓPRIO usuário (via auth.uid()), então
--   não vaza dados.
--
-- IMPACTO:
--   Aplicar essa migration desbloqueia signup/cadastro de qualquer
--   recurso (serviços, clientes, etc) e corrige o dashboard que
--   estava mostrando "Salão" genérico em vez do nome real.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Função helper SECURITY DEFINER — retorna salao_id do user
-- -------------------------------------------------------------
create or replace function public.current_salao_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select salao_id from public.usuarios where id = auth.uid();
$$;

comment on function public.current_salao_id() is
  'Retorna o salao_id do usuário autenticado. SECURITY DEFINER pra bypassar RLS e evitar recursão nas policies.';

-- Revoke padrão + grant explícito
revoke execute on function public.current_salao_id() from public, anon;
grant   execute on function public.current_salao_id() to authenticated;

-- =============================================================
-- 2. Reescreve policies de saloes (usavam subquery)
-- =============================================================
drop policy if exists "Salões: SELECT do próprio salão"  on public.saloes;
drop policy if exists "Salões: UPDATE apenas pelo dono"  on public.saloes;

create policy "Salões: SELECT do próprio salão"
  on public.saloes for select to authenticated
  using (id = public.current_salao_id());

create policy "Salões: UPDATE apenas pelo dono"
  on public.saloes for update to authenticated
  using (
    id = public.current_salao_id()
    and exists (select 1 from public.usuarios where id = auth.uid() and role = 'dono')
  )
  with check (id = public.current_salao_id());

-- =============================================================
-- 3. Reescreve policies de usuarios — divide pra evitar recursão
-- =============================================================
-- Policy A: usuário vê o próprio registro (sem subquery, sem recursão)
-- Policy B: usuário vê outros do mesmo salão (via função, sem recursão)
drop policy if exists "Usuários: SELECT do mesmo salão"     on public.usuarios;
drop policy if exists "Usuários: UPDATE do próprio registro" on public.usuarios;

create policy "Usuários: SELECT próprio registro"
  on public.usuarios for select to authenticated
  using (id = auth.uid());

create policy "Usuários: SELECT mesmo salão"
  on public.usuarios for select to authenticated
  using (salao_id = public.current_salao_id());

create policy "Usuários: UPDATE do próprio registro"
  on public.usuarios for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- =============================================================
-- 4. Reescreve policies da migration 006
-- =============================================================
drop policy if exists "Profissionais: gestão pelo próprio salão" on public.profissionais;
create policy "Profissionais: gestão pelo próprio salão"
  on public.profissionais for all to authenticated
  using      (salao_id = public.current_salao_id())
  with check (salao_id = public.current_salao_id());

drop policy if exists "Serviços: gestão pelo próprio salão" on public.servicos;
create policy "Serviços: gestão pelo próprio salão"
  on public.servicos for all to authenticated
  using      (salao_id = public.current_salao_id())
  with check (salao_id = public.current_salao_id());

drop policy if exists "Carga horária: gestão pelo próprio salão" on public.carga_horaria;
create policy "Carga horária: gestão pelo próprio salão"
  on public.carga_horaria for all to authenticated
  using (
    profissional_id in (
      select id from public.profissionais
      where  salao_id = public.current_salao_id()
    )
  )
  with check (
    profissional_id in (
      select id from public.profissionais
      where  salao_id = public.current_salao_id()
    )
  );

drop policy if exists "Clientes: gestão pelo próprio salão" on public.clientes;
create policy "Clientes: gestão pelo próprio salão"
  on public.clientes for all to authenticated
  using      (salao_id = public.current_salao_id())
  with check (salao_id = public.current_salao_id());

drop policy if exists "Agendamentos: gestão pelo próprio salão" on public.agendamentos;
create policy "Agendamentos: gestão pelo próprio salão"
  on public.agendamentos for all to authenticated
  using      (salao_id = public.current_salao_id())
  with check (salao_id = public.current_salao_id());
