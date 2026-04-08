-- Libro Vivo - Permitir planning_draft en seeds.status
-- Fecha: 2026-03-27
--
-- Problema real detectado:
-- - La fase `planning_draft` ya existe en catalogos, flujo y UI.
-- - La tabla `public.seeds` seguia manteniendo el check:
--   status in ('seed', 'scheduled', 'bloomed')
-- - Eso hacia que el insert del borrador fallase con "new row violates ...".

do $$
declare
  current_definition text;
begin
  select pg_get_constraintdef(con.oid)
  into current_definition
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'seeds'
    and con.conname = 'seeds_status_check';

  if current_definition is not null and current_definition not ilike '%planning_draft%' then
    alter table public.seeds drop constraint seeds_status_check;
    alter table public.seeds
      add constraint seeds_status_check
      check (status = any (array['planning_draft'::text, 'seed'::text, 'scheduled'::text, 'bloomed'::text]));
  end if;
end $$;
