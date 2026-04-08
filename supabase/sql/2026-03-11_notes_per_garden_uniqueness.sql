-- Libro Vivo - Unicidad de notas por jardin
-- Fecha: 2026-03-11
--
-- Objetivo:
-- - year_notes: 1 fila por (garden_id, year)
-- - season_notes: 1 fila por (garden_id, year, season)
-- - eliminar constraints legacy de unicidad global que no incluyen garden_id

-- 0) Guard rails: no permitir aplicar si hay duplicados por jardin
do $$
declare
  v_dup_year_notes record;
  v_dup_season_notes record;
begin
  if to_regclass('public.year_notes') is not null then
    select garden_id, year, count(*) as n
    into v_dup_year_notes
    from public.year_notes
    where garden_id is not null
    group by garden_id, year
    having count(*) > 1
    limit 1;

    if found then
      raise exception using
        errcode = '23505',
        message = format(
          'Duplicado en year_notes para garden_id=%s year=%s (count=%s).',
          v_dup_year_notes.garden_id,
          v_dup_year_notes.year,
          v_dup_year_notes.n
        ),
        hint = 'Resuelve duplicados antes de aplicar unicidad por jardin.';
    end if;
  end if;

  if to_regclass('public.season_notes') is not null then
    select garden_id, year, season, count(*) as n
    into v_dup_season_notes
    from public.season_notes
    where garden_id is not null
    group by garden_id, year, season
    having count(*) > 1
    limit 1;

    if found then
      raise exception using
        errcode = '23505',
        message = format(
          'Duplicado en season_notes para garden_id=%s year=%s season=%s (count=%s).',
          v_dup_season_notes.garden_id,
          v_dup_season_notes.year,
          v_dup_season_notes.season,
          v_dup_season_notes.n
        ),
        hint = 'Resuelve duplicados antes de aplicar unicidad por jardin.';
    end if;
  end if;
end $$;

-- 1) Eliminar constraints unique legacy (sin garden_id)
do $$
declare r record;
begin
  if to_regclass('public.year_notes') is not null then
    for r in
      select c.conname
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'year_notes'
        and c.contype = 'u'
        and not exists (
          select 1
          from unnest(c.conkey) as key_col(attnum)
          join pg_attribute a
            on a.attrelid = t.oid
           and a.attnum = key_col.attnum
          where a.attname = 'garden_id'
        )
    loop
      execute format('alter table public.year_notes drop constraint if exists %I', r.conname);
    end loop;
  end if;

  if to_regclass('public.season_notes') is not null then
    for r in
      select c.conname
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'season_notes'
        and c.contype = 'u'
        and not exists (
          select 1
          from unnest(c.conkey) as key_col(attnum)
          join pg_attribute a
            on a.attrelid = t.oid
           and a.attnum = key_col.attnum
          where a.attname = 'garden_id'
        )
    loop
      execute format('alter table public.season_notes drop constraint if exists %I', r.conname);
    end loop;
  end if;
end $$;

-- 2) Crear unicidad por jardin (partial, compatible mientras garden_id pueda ser null)
create unique index if not exists uq_year_notes_garden_year
  on public.year_notes (garden_id, year)
  where garden_id is not null;

create unique index if not exists uq_season_notes_garden_year_season
  on public.season_notes (garden_id, year, season)
  where garden_id is not null;

