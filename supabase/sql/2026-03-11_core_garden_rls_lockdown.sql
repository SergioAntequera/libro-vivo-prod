-- Libro Vivo - RLS lockdown por jardin (modo estricto)
-- Fecha: 2026-03-11
--
-- Objetivo:
-- - Cerrar la fase de transicion y exigir aislamiento real por garden_id.
-- - Eliminar fallback legacy basado en filas con garden_id null.
-- - Mantener permiso de superadmin para operaciones de soporte.
--
-- Tablas core cubiertas:
-- - public.pages
-- - public.seeds
-- - public.year_notes
-- - public.season_notes
-- - public.achievements_unlocked

-- 0) Guard-rail: no permitir activar lockdown si quedan filas sin garden_id
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
        'RLS lockdown cancelado: garden_id null detectado (pages=%s, seeds=%s, year_notes=%s, season_notes=%s, achievements_unlocked=%s).',
        v_pages_null,
        v_seeds_null,
        v_year_notes_null,
        v_season_notes_null,
        v_achievements_null
      ),
      hint = 'Completa backfill de garden_id antes de aplicar esta migracion.';
  end if;
end $$;

-- 1) Activar RLS
alter table if exists public.pages enable row level security;
alter table if exists public.seeds enable row level security;
alter table if exists public.year_notes enable row level security;
alter table if exists public.season_notes enable row level security;
alter table if exists public.achievements_unlocked enable row level security;

-- 2) Eliminar politicas previas para evitar overlaps permisivos
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'pages',
        'seeds',
        'year_notes',
        'season_notes',
        'achievements_unlocked'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      r.policyname,
      r.schemaname,
      r.tablename
    );
  end loop;
end $$;

-- 3) pages (estricto: miembro de garden o superadmin)
do $$
begin
  if to_regclass('public.pages') is null then
    raise notice 'Skipping pages policies: table public.pages does not exist.';
    return;
  end if;

  execute $sql$
    create policy pages_read_garden_member_strict on public.pages
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
      or (
        pages.garden_id is not null
        and exists (
          select 1
          from public.garden_members gm
          where gm.garden_id = pages.garden_id
            and gm.user_id = auth.uid()
            and gm.left_at is null
        )
      )
    )
  $sql$;

  execute $sql$
    create policy pages_insert_garden_member_strict on public.pages
    for insert
    to authenticated
    with check (
      coalesce(created_by, auth.uid()) = auth.uid()
      and (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'superadmin'
        )
        or (
          pages.garden_id is not null
          and exists (
            select 1
            from public.garden_members gm
            where gm.garden_id = pages.garden_id
              and gm.user_id = auth.uid()
              and gm.left_at is null
          )
        )
      )
    )
  $sql$;

  execute $sql$
    create policy pages_update_garden_member_strict on public.pages
    for update
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
      or (
        pages.garden_id is not null
        and exists (
          select 1
          from public.garden_members gm
          where gm.garden_id = pages.garden_id
            and gm.user_id = auth.uid()
            and gm.left_at is null
        )
      )
    )
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
      or (
        pages.garden_id is not null
        and exists (
          select 1
          from public.garden_members gm
          where gm.garden_id = pages.garden_id
            and gm.user_id = auth.uid()
            and gm.left_at is null
        )
      )
    )
  $sql$;

  execute $sql$
    create policy pages_delete_superadmin_strict on public.pages
    for delete
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
    )
  $sql$;
end $$;

-- 4) seeds (estricto: miembro de garden o superadmin)
do $$
begin
  if to_regclass('public.seeds') is null then
    raise notice 'Skipping seeds policies: table public.seeds does not exist.';
    return;
  end if;

  execute $sql$
    create policy seeds_read_garden_member_strict on public.seeds
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
      or (
        seeds.garden_id is not null
        and exists (
          select 1
          from public.garden_members gm
          where gm.garden_id = seeds.garden_id
            and gm.user_id = auth.uid()
            and gm.left_at is null
        )
      )
    )
  $sql$;

  execute $sql$
    create policy seeds_insert_garden_member_strict on public.seeds
    for insert
    to authenticated
    with check (
      coalesce(created_by, auth.uid()) = auth.uid()
      and (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'superadmin'
        )
        or (
          seeds.garden_id is not null
          and exists (
            select 1
            from public.garden_members gm
            where gm.garden_id = seeds.garden_id
              and gm.user_id = auth.uid()
              and gm.left_at is null
          )
        )
      )
    )
  $sql$;

  execute $sql$
    create policy seeds_update_garden_member_strict on public.seeds
    for update
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
      or (
        seeds.garden_id is not null
        and exists (
          select 1
          from public.garden_members gm
          where gm.garden_id = seeds.garden_id
            and gm.user_id = auth.uid()
            and gm.left_at is null
        )
      )
    )
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
      or (
        seeds.garden_id is not null
        and exists (
          select 1
          from public.garden_members gm
          where gm.garden_id = seeds.garden_id
            and gm.user_id = auth.uid()
            and gm.left_at is null
        )
      )
    )
  $sql$;

  execute $sql$
    create policy seeds_delete_superadmin_strict on public.seeds
    for delete
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
    )
  $sql$;
end $$;

-- 5) year_notes (estricto: miembro de garden o superadmin)
do $$
begin
  if to_regclass('public.year_notes') is null then
    raise notice 'Skipping year_notes policies: table public.year_notes does not exist.';
    return;
  end if;

  execute $sql$
    create policy year_notes_read_garden_member_strict on public.year_notes
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
      or (
        year_notes.garden_id is not null
        and exists (
          select 1
          from public.garden_members gm
          where gm.garden_id = year_notes.garden_id
            and gm.user_id = auth.uid()
            and gm.left_at is null
        )
      )
    )
  $sql$;

  execute $sql$
    create policy year_notes_insert_garden_member_strict on public.year_notes
    for insert
    to authenticated
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
      or (
        year_notes.garden_id is not null
        and exists (
          select 1
          from public.garden_members gm
          where gm.garden_id = year_notes.garden_id
            and gm.user_id = auth.uid()
            and gm.left_at is null
        )
      )
    )
  $sql$;

  execute $sql$
    create policy year_notes_update_garden_member_strict on public.year_notes
    for update
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
      or (
        year_notes.garden_id is not null
        and exists (
          select 1
          from public.garden_members gm
          where gm.garden_id = year_notes.garden_id
            and gm.user_id = auth.uid()
            and gm.left_at is null
        )
      )
    )
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
      or (
        year_notes.garden_id is not null
        and exists (
          select 1
          from public.garden_members gm
          where gm.garden_id = year_notes.garden_id
            and gm.user_id = auth.uid()
            and gm.left_at is null
        )
      )
    )
  $sql$;

  execute $sql$
    create policy year_notes_delete_superadmin_strict on public.year_notes
    for delete
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
    )
  $sql$;
end $$;

-- 6) season_notes (estricto: miembro de garden o superadmin)
do $$
begin
  if to_regclass('public.season_notes') is null then
    raise notice 'Skipping season_notes policies: table public.season_notes does not exist.';
    return;
  end if;

  execute $sql$
    create policy season_notes_read_garden_member_strict on public.season_notes
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
      or (
        season_notes.garden_id is not null
        and exists (
          select 1
          from public.garden_members gm
          where gm.garden_id = season_notes.garden_id
            and gm.user_id = auth.uid()
            and gm.left_at is null
        )
      )
    )
  $sql$;

  execute $sql$
    create policy season_notes_insert_garden_member_strict on public.season_notes
    for insert
    to authenticated
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
      or (
        season_notes.garden_id is not null
        and exists (
          select 1
          from public.garden_members gm
          where gm.garden_id = season_notes.garden_id
            and gm.user_id = auth.uid()
            and gm.left_at is null
        )
      )
    )
  $sql$;

  execute $sql$
    create policy season_notes_update_garden_member_strict on public.season_notes
    for update
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
      or (
        season_notes.garden_id is not null
        and exists (
          select 1
          from public.garden_members gm
          where gm.garden_id = season_notes.garden_id
            and gm.user_id = auth.uid()
            and gm.left_at is null
        )
      )
    )
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
      or (
        season_notes.garden_id is not null
        and exists (
          select 1
          from public.garden_members gm
          where gm.garden_id = season_notes.garden_id
            and gm.user_id = auth.uid()
            and gm.left_at is null
        )
      )
    )
  $sql$;

  execute $sql$
    create policy season_notes_delete_superadmin_strict on public.season_notes
    for delete
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
    )
  $sql$;
end $$;

-- 7) achievements_unlocked (estricto: miembro de garden o superadmin)
do $$
begin
  if to_regclass('public.achievements_unlocked') is null then
    raise notice 'Skipping achievements_unlocked policies: table public.achievements_unlocked does not exist.';
    return;
  end if;

  execute $sql$
    create policy achievements_unlocked_read_garden_member_strict on public.achievements_unlocked
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
      or (
        achievements_unlocked.garden_id is not null
        and exists (
          select 1
          from public.garden_members gm
          where gm.garden_id = achievements_unlocked.garden_id
            and gm.user_id = auth.uid()
            and gm.left_at is null
        )
      )
    )
  $sql$;

  execute $sql$
    create policy achievements_unlocked_insert_garden_member_strict on public.achievements_unlocked
    for insert
    to authenticated
    with check (
      (claimed_by is null or claimed_by = auth.uid())
      and (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'superadmin'
        )
        or (
          achievements_unlocked.garden_id is not null
          and exists (
            select 1
            from public.garden_members gm
            where gm.garden_id = achievements_unlocked.garden_id
              and gm.user_id = auth.uid()
              and gm.left_at is null
          )
        )
      )
    )
  $sql$;

  execute $sql$
    create policy achievements_unlocked_update_garden_member_strict on public.achievements_unlocked
    for update
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
      or (
        achievements_unlocked.garden_id is not null
        and exists (
          select 1
          from public.garden_members gm
          where gm.garden_id = achievements_unlocked.garden_id
            and gm.user_id = auth.uid()
            and gm.left_at is null
        )
      )
    )
    with check (
      (claimed_by is null or claimed_by = auth.uid())
      and (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'superadmin'
        )
        or (
          achievements_unlocked.garden_id is not null
          and exists (
            select 1
            from public.garden_members gm
            where gm.garden_id = achievements_unlocked.garden_id
              and gm.user_id = auth.uid()
              and gm.left_at is null
          )
        )
      )
    )
  $sql$;

  execute $sql$
    create policy achievements_unlocked_delete_superadmin_strict on public.achievements_unlocked
    for delete
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
    )
  $sql$;
end $$;

