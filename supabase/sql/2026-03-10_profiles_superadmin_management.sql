-- Libro Vivo - profiles admin management for superadmin
-- Execute in Supabase SQL Editor
--
-- Goal:
-- - keep self access for all users
-- - allow superadmin to read/update all profiles (role management UI)
-- - avoid recursive RLS policies on profiles

alter table if exists public.profiles enable row level security;

create or replace function public.is_superadmin_auth()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  );
$$;

revoke all on function public.is_superadmin_auth() from public;
grant execute on function public.is_superadmin_auth() to authenticated;

drop policy if exists profiles_read_self on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_read_all_superadmin on public.profiles;
drop policy if exists profiles_update_superadmin on public.profiles;
drop policy if exists profiles_read_self_or_superadmin on public.profiles;
drop policy if exists profiles_update_self_non_admin on public.profiles;

create policy profiles_read_self_or_superadmin
on public.profiles
for select
to authenticated
using (
  id = auth.uid() or public.is_superadmin_auth()
);

create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and role in ('gardener_a', 'gardener_b')
);

create policy profiles_update_self_non_admin
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  and role in ('gardener_a', 'gardener_b')
)
with check (
  id = auth.uid()
  and role in ('gardener_a', 'gardener_b')
);

create policy profiles_update_superadmin
on public.profiles
for update
to authenticated
using (
  public.is_superadmin_auth()
)
with check (
  role in ('gardener_a', 'gardener_b', 'superadmin')
);
