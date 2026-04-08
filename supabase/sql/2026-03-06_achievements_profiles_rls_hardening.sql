-- Libro Vivo - RLS hardening for profiles + achievements domain
-- Execute in Supabase SQL Editor
--
-- Target tables:
-- - public.profiles
-- - public.achievement_rules
-- - public.achievements_unlocked
-- - public.rewards
--
-- Model (current single-couple scope):
-- - app users (gardener_a/gardener_b/superadmin) can read domain data
-- - superadmin is required for admin writes (rules/rewards)
-- - achievements_unlocked can be inserted/updated by app users (sync + claim flow)
-- - profile access is self row (id = auth.uid()) for read/update/insert

-- 0) Enable RLS
alter table if exists public.profiles enable row level security;
alter table if exists public.achievement_rules enable row level security;
alter table if exists public.achievements_unlocked enable row level security;
alter table if exists public.rewards enable row level security;

-- 1) Drop all existing policies on target tables to avoid legacy permissive overlap
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'achievement_rules', 'achievements_unlocked', 'rewards')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      r.policyname,
      r.schemaname,
      r.tablename
    );
  end loop;
end $$;

-- 2) profiles policies (self-access)
do $$
begin
  if to_regclass('public.profiles') is null then
    raise notice 'Skipping profiles policies: table does not exist.';
    return;
  end if;

  execute $sql$
    create policy profiles_read_self on public.profiles
    for select
    to authenticated
    using (id = auth.uid())
  $sql$;

  execute $sql$
    create policy profiles_insert_self on public.profiles
    for insert
    to authenticated
    with check (id = auth.uid())
  $sql$;

  execute $sql$
    create policy profiles_update_self on public.profiles
    for update
    to authenticated
    using (id = auth.uid())
    with check (id = auth.uid())
  $sql$;
end $$;

-- 3) achievement_rules policies
do $$
begin
  if to_regclass('public.achievement_rules') is null then
    raise notice 'Skipping achievement_rules policies: table does not exist.';
    return;
  end if;

  execute $sql$
    create policy achievement_rules_read_app on public.achievement_rules
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
    create policy achievement_rules_insert_superadmin on public.achievement_rules
    for insert
    to authenticated
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
    )
  $sql$;

  execute $sql$
    create policy achievement_rules_update_superadmin on public.achievement_rules
    for update
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
    )
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
    )
  $sql$;

  execute $sql$
    create policy achievement_rules_delete_superadmin on public.achievement_rules
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

-- 4) achievements_unlocked policies
do $$
begin
  if to_regclass('public.achievements_unlocked') is null then
    raise notice 'Skipping achievements_unlocked policies: table does not exist.';
    return;
  end if;

  execute $sql$
    create policy achievements_unlocked_read_app on public.achievements_unlocked
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
    create policy achievements_unlocked_insert_app on public.achievements_unlocked
    for insert
    to authenticated
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('gardener_a', 'gardener_b', 'superadmin')
      )
      and (claimed_by is null or claimed_by = auth.uid())
    )
  $sql$;

  execute $sql$
    create policy achievements_unlocked_update_app on public.achievements_unlocked
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
      and (claimed_by is null or claimed_by = auth.uid())
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

-- 5) rewards policies
do $$
begin
  if to_regclass('public.rewards') is null then
    raise notice 'Skipping rewards policies: table does not exist.';
    return;
  end if;

  execute $sql$
    create policy rewards_read_app on public.rewards
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
    create policy rewards_insert_superadmin on public.rewards
    for insert
    to authenticated
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
    )
  $sql$;

  execute $sql$
    create policy rewards_update_superadmin on public.rewards
    for update
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
    )
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'superadmin'
      )
    )
  $sql$;

  execute $sql$
    create policy rewards_delete_superadmin on public.rewards
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

