-- Libro Vivo - Enforce garden_id NOT NULL (fase final)
-- Fecha: 2026-03-11
--
-- Objetivo:
-- - Cerrar la fase de compatibilidad y exigir garden_id obligatorio en contenido core.
-- - Debe ejecutarse despues de:
--   1) backfill completo,
--   2) auditoria sin nulls,
--   3) lockdown RLS estricto.

do $$
declare
  v_pages_null bigint := 0;
  v_seeds_null bigint := 0;
  v_year_notes_null bigint := 0;
  v_season_notes_null bigint := 0;
  v_achievements_null bigint := 0;
begin
  if to_regclass('public.pages') is not null then
    select count(*) into v_pages_null from public.pages where garden_id is null;
  end if;

  if to_regclass('public.seeds') is not null then
    select count(*) into v_seeds_null from public.seeds where garden_id is null;
  end if;

  if to_regclass('public.year_notes') is not null then
    select count(*) into v_year_notes_null from public.year_notes where garden_id is null;
  end if;

  if to_regclass('public.season_notes') is not null then
    select count(*) into v_season_notes_null from public.season_notes where garden_id is null;
  end if;

  if to_regclass('public.achievements_unlocked') is not null then
    select count(*) into v_achievements_null
    from public.achievements_unlocked
    where garden_id is null;
  end if;

  if v_pages_null > 0
    or v_seeds_null > 0
    or v_year_notes_null > 0
    or v_season_notes_null > 0
    or v_achievements_null > 0 then
    raise exception using
      errcode = '23514',
      message = format(
        'No se puede aplicar NOT NULL en garden_id: hay filas null (pages=%s, seeds=%s, year_notes=%s, season_notes=%s, achievements_unlocked=%s).',
        v_pages_null,
        v_seeds_null,
        v_year_notes_null,
        v_season_notes_null,
        v_achievements_null
      ),
      hint = 'Ejecuta backfill/auditoria y reintenta.';
  end if;
end $$;

alter table if exists public.pages
  alter column garden_id set not null;

alter table if exists public.seeds
  alter column garden_id set not null;

alter table if exists public.year_notes
  alter column garden_id set not null;

alter table if exists public.season_notes
  alter column garden_id set not null;

alter table if exists public.achievements_unlocked
  alter column garden_id set not null;

