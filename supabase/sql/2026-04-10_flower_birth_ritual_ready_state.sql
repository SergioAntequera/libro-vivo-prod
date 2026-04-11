-- Libro Vivo - Estado persistido de listo en nacimiento compartido
-- Fecha: 2026-04-10
--
-- Objetivo:
-- - No depender solo de presencia realtime para saber si ambas personas dejaron su si.
-- - Mantener el cierre compartido protegido aunque un movil pierda/reconecte el canal.

alter table public.flower_birth_ritual_ratings
  add column if not exists ready_at timestamptz;

create index if not exists idx_flower_birth_ritual_ratings_ready
  on public.flower_birth_ritual_ratings (garden_id, page_id, ready_at desc)
  where ready_at is not null;
