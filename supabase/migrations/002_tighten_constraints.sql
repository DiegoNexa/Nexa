-- =============================================================
-- 002 — Aperta constraints de slug
-- =============================================================
-- Aumenta o mínimo de caracteres do slug de 2 para 4. Slugs muito
-- curtos podem colidir com rotas do app (ex: /api, /no) ou ficar
-- impossíveis de adivinhar mas também muito feios. 4 chars é o
-- mínimo razoável.
-- =============================================================

alter table public.saloes
  drop constraint if exists saloes_slug_check;

alter table public.saloes
  add constraint saloes_slug_check
  check (slug ~ '^[a-z0-9-]{4,60}$');
