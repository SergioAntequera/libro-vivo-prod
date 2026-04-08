-- Libro Vivo - Core tables RLS hardening
-- Execute in Supabase SQL Editor
--
-- Scope:
-- - public.pages
-- - public.seeds
-- - public.year_notes
-- - public.season_notes
--
-- Security model (current single-couple scope):
-- - Read/write allowed only for authenticated app profiles:
--   gardener_a, gardener_b, superadmin
-- - Delete restricted to superadmin.
-- - Insert on pages/seeds prevents spoofing created_by.
--
-- NOTE:
-- This is an incremental hardening for current architecture.
-- Future multi-tenant should add relationship_id/user ownership constraints.

-- 0) Enable RLS (idempotent)
alter table if exists public.pages enable row level security;
alter table if exists public.seeds enable row level security;
alter table if exists public.year_notes enable row level security;
alter table if exists public.season_notes enable row level security;

-- 1) Drop ALL existing policies on target tables (to avoid broad legacy policies staying permissive)
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('pages', 'seeds', 'year_notes', 'season_notes')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      r.policyname,
      r.schemaname,
      r.tablename
    );
  end loop;
end $$;

-- 2) Recreate hardened policies

-- pages
do $$
begin
  if to_regclass('public.pages') is null then
    raise notice 'Skipping pages policies: table public.pages does not exist.';
    return;
  end if;

  execute $sql$
    create policy pages_read_app on public.pages
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('gardener_a', 'gardener_b', 'superadmin')
      )
    )
  $sql$;

  execute $sql$
    create policy pages_insert_app on public.pages
    for insert
    to authenticated
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('gardener_a', 'gardener_b', 'superadmin')
      )
      and coalesce(created_by, auth.uid()) = auth.uid()
    )
  $sql$;

  execute $sql$
    create policy pages_update_app on public.pages
    for update
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('gardener_a', 'gardener_b', 'superadmin')
      )
    )
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('gardener_a', 'gardener_b', 'superadmin')
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

-- seeds
do $$
begin
  if to_regclass('public.seeds') is null then
    raise notice 'Skipping seeds policies: table public.seeds does not exist.';
    return;
  end if;

  execute $sql$
    create policy seeds_read_app on public.seeds
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('gardener_a', 'gardener_b', 'superadmin')
      )
    )
  $sql$;

  execute $sql$
    create policy seeds_insert_app on public.seeds
    for insert
    to authenticated
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('gardener_a', 'gardener_b', 'superadmin')
      )
      and coalesce(created_by, auth.uid()) = auth.uid()
    )
  $sql$;

  execute $sql$
    create policy seeds_update_app on public.seeds
    for update
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('gardener_a', 'gardener_b', 'superadmin')
      )
    )
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('gardener_a', 'gardener_b', 'superadmin')
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

-- year_notes
do $$
begin
  if to_regclass('public.year_notes') is null then
    raise notice 'Skipping year_notes policies: table public.year_notes does not exist.';
    return;
  end if;

  execute $sql$
    create policy year_notes_read_app on public.year_notes
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('gardener_a', 'gardener_b', 'superadmin')
      )
    )
  $sql$;

  execute $sql$
    create policy year_notes_insert_app on public.year_notes
    for insert
    to authenticated
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('gardener_a', 'gardener_b', 'superadmin')
      )
    )
  $sql$;

  execute $sql$
    create policy year_notes_update_app on public.year_notes
    for update
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('gardener_a', 'gardener_b', 'superadmin')
      )
    )
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('gardener_a', 'gardener_b', 'superadmin')
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

-- season_notes
do $$
begin
  if to_regclass('public.season_notes') is null then
    raise notice 'Skipping season_notes policies: table public.season_notes does not exist.';
    return;
  end if;

  execute $sql$
    create policy season_notes_read_app on public.season_notes
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('gardener_a', 'gardener_b', 'superadmin')
      )
    )
  $sql$;

  execute $sql$
    create policy season_notes_insert_app on public.season_notes
    for insert
    to authenticated
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('gardener_a', 'gardener_b', 'superadmin')
      )
    )
  $sql$;

  execute $sql$
    create policy season_notes_update_app on public.season_notes
    for update
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('gardener_a', 'gardener_b', 'superadmin')
      )
    )
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('gardener_a', 'gardener_b', 'superadmin')
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

