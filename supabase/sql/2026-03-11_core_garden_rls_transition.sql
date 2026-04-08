-- Libro Vivo - RLS transicion a scope por garden (modo compatible)
-- Fecha: 2026-03-11
--
-- Objetivo:
-- - Mantener app actual funcionando durante migracion.
-- - Aplicar aislamiento por garden_id cuando exista.
-- - Permitir filas legacy (garden_id null) con reglas actuales.
--
-- Tablas cubiertas:
-- - public.pages
-- - public.seeds
-- - public.year_notes
-- - public.season_notes
-- - public.achievements_unlocked

-- 0) Activar RLS en tablas objetivo
alter table if exists public.pages enable row level security;
alter table if exists public.seeds enable row level security;
alter table if exists public.year_notes enable row level security;
alter table if exists public.season_notes enable row level security;
alter table if exists public.achievements_unlocked enable row level security;

-- 1) Eliminar politicas previas para evitar overlap permisivo
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

-- 2) pages
do $$
begin
  if to_regclass('public.pages') is null then
    raise notice 'Skipping pages policies: table public.pages does not exist.';
    return;
  end if;

  execute $sql$
    create policy pages_read_app_or_garden_member on public.pages
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
        pages.garden_id is null
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('gardener_a', 'gardener_b', 'superadmin')
        )
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
    create policy pages_insert_app_or_garden_member on public.pages
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
          pages.garden_id is null
          and exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role in ('gardener_a', 'gardener_b', 'superadmin')
          )
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
    create policy pages_update_app_or_garden_member on public.pages
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
        pages.garden_id is null
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('gardener_a', 'gardener_b', 'superadmin')
        )
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
        pages.garden_id is null
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('gardener_a', 'gardener_b', 'superadmin')
        )
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
    create policy pages_delete_superadmin on public.pages
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

-- 3) seeds
do $$
begin
  if to_regclass('public.seeds') is null then
    raise notice 'Skipping seeds policies: table public.seeds does not exist.';
    return;
  end if;

  execute $sql$
    create policy seeds_read_app_or_garden_member on public.seeds
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
        seeds.garden_id is null
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('gardener_a', 'gardener_b', 'superadmin')
        )
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
    create policy seeds_insert_app_or_garden_member on public.seeds
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
          seeds.garden_id is null
          and exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role in ('gardener_a', 'gardener_b', 'superadmin')
          )
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
    create policy seeds_update_app_or_garden_member on public.seeds
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
        seeds.garden_id is null
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('gardener_a', 'gardener_b', 'superadmin')
        )
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
        seeds.garden_id is null
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('gardener_a', 'gardener_b', 'superadmin')
        )
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
    create policy seeds_delete_superadmin on public.seeds
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

-- 4) year_notes
do $$
begin
  if to_regclass('public.year_notes') is null then
    raise notice 'Skipping year_notes policies: table public.year_notes does not exist.';
    return;
  end if;

  execute $sql$
    create policy year_notes_read_app_or_garden_member on public.year_notes
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
        year_notes.garden_id is null
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('gardener_a', 'gardener_b', 'superadmin')
        )
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
    create policy year_notes_insert_app_or_garden_member on public.year_notes
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
        year_notes.garden_id is null
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('gardener_a', 'gardener_b', 'superadmin')
        )
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
    create policy year_notes_update_app_or_garden_member on public.year_notes
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
        year_notes.garden_id is null
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('gardener_a', 'gardener_b', 'superadmin')
        )
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
        year_notes.garden_id is null
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('gardener_a', 'gardener_b', 'superadmin')
        )
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
    create policy year_notes_delete_superadmin on public.year_notes
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

-- 5) season_notes
do $$
begin
  if to_regclass('public.season_notes') is null then
    raise notice 'Skipping season_notes policies: table public.season_notes does not exist.';
    return;
  end if;

  execute $sql$
    create policy season_notes_read_app_or_garden_member on public.season_notes
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
        season_notes.garden_id is null
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('gardener_a', 'gardener_b', 'superadmin')
        )
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
    create policy season_notes_insert_app_or_garden_member on public.season_notes
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
        season_notes.garden_id is null
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('gardener_a', 'gardener_b', 'superadmin')
        )
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
    create policy season_notes_update_app_or_garden_member on public.season_notes
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
        season_notes.garden_id is null
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('gardener_a', 'gardener_b', 'superadmin')
        )
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
        season_notes.garden_id is null
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('gardener_a', 'gardener_b', 'superadmin')
        )
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
    create policy season_notes_delete_superadmin on public.season_notes
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

-- 6) achievements_unlocked
do $$
begin
  if to_regclass('public.achievements_unlocked') is null then
    raise notice 'Skipping achievements_unlocked policies: table public.achievements_unlocked does not exist.';
    return;
  end if;

  execute $sql$
    create policy achievements_unlocked_read_app_or_garden_member on public.achievements_unlocked
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
        achievements_unlocked.garden_id is null
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('gardener_a', 'gardener_b', 'superadmin')
        )
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
    create policy achievements_unlocked_insert_app_or_garden_member on public.achievements_unlocked
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
          achievements_unlocked.garden_id is null
          and exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role in ('gardener_a', 'gardener_b', 'superadmin')
          )
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
    create policy achievements_unlocked_update_app_or_garden_member on public.achievements_unlocked
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
        achievements_unlocked.garden_id is null
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('gardener_a', 'gardener_b', 'superadmin')
        )
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
          achievements_unlocked.garden_id is null
          and exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role in ('gardener_a', 'gardener_b', 'superadmin')
          )
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
    create policy achievements_unlocked_delete_superadmin on public.achievements_unlocked
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
