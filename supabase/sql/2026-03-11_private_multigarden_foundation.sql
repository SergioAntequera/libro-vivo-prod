-- Libro Vivo - Multiusuario privado por vinculos/jardines (fase fundacional)
-- Fecha: 2026-03-11
--
-- Objetivo:
-- - Preparar base multi-tenant por garden sin romper alcance actual.
-- - Mantener privacidad cerrada (sin feed/muro/perfiles publicos).
--
-- Incluye:
-- 1) tablas base: bonds, bond_members, gardens, garden_members, garden_invitations
-- 2) tabla para perspectiva compartida: memory_reflections
-- 3) columnas garden_id en tablas de contenido core (nullable por compatibilidad)
-- 4) bootstrap legacy: crea vinculo/jardin compartido y backfill de garden_id
-- 5) RLS minima para nuevas tablas (lectura por membresia; escritura admin/superadmin)
--
-- Nota:
-- - Esta migracion NO migra todavia toda la app a filtros por garden_id.
-- - Es preparatoria para fases siguientes.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Tablas base de vinculos y jardines
-- ---------------------------------------------------------------------------

create table if not exists public.bonds (
  id uuid primary key default gen_random_uuid(),
  type text not null
    check (type in ('pareja', 'amistad', 'familia', 'personal')),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'rejected', 'archived')),
  title text null,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  system_key text unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_bonds_status_created_at
  on public.bonds (status, created_at desc);

create table if not exists public.bond_members (
  id uuid primary key default gen_random_uuid(),
  bond_id uuid not null references public.bonds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'member'
    check (member_role in ('owner', 'member')),
  joined_at timestamptz not null default timezone('utc', now()),
  left_at timestamptz null,
  unique (bond_id, user_id)
);

create index if not exists idx_bond_members_user_active
  on public.bond_members (user_id, joined_at desc)
  where left_at is null;

create table if not exists public.gardens (
  id uuid primary key default gen_random_uuid(),
  bond_id uuid not null references public.bonds(id) on delete cascade,
  title text not null,
  theme text null,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  is_private boolean not null default true,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  system_key text unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_gardens_bond_status
  on public.gardens (bond_id, status);

create table if not exists public.garden_members (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'editor'
    check (member_role in ('owner', 'editor', 'viewer')),
  joined_at timestamptz not null default timezone('utc', now()),
  left_at timestamptz null,
  unique (garden_id, user_id)
);

create index if not exists idx_garden_members_user_active
  on public.garden_members (user_id, joined_at desc)
  where left_at is null;

create table if not exists public.garden_invitations (
  id uuid primary key default gen_random_uuid(),
  bond_type text not null
    check (bond_type in ('pareja', 'amistad', 'familia', 'personal')),
  invited_email text not null,
  invited_user_id uuid null references public.profiles(id) on delete set null,
  invited_by_user_id uuid not null references public.profiles(id) on delete restrict,
  token_hash text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'expired', 'revoked')),
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz null
);

create index if not exists idx_garden_invitations_invited_email_status
  on public.garden_invitations (lower(invited_email), status);

-- ---------------------------------------------------------------------------
-- 2) Tabla de reflexiones por usuario en la misma pagina compartida
-- ---------------------------------------------------------------------------

create table if not exists public.memory_reflections (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  page_id uuid not null references public.pages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  favorite_part text null,
  remembered_moment text null,
  what_i_felt text null,
  what_it_meant_to_me text null,
  what_i_discovered_about_you text null,
  small_promise text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (page_id, user_id)
);

create index if not exists idx_memory_reflections_garden_page
  on public.memory_reflections (garden_id, page_id);

-- ---------------------------------------------------------------------------
-- 3) Columnas garden_id en contenido core (compatibilidad: nullable por ahora)
-- ---------------------------------------------------------------------------

alter table if exists public.profiles
  add column if not exists active_garden_id uuid;

alter table if exists public.pages
  add column if not exists garden_id uuid;

alter table if exists public.seeds
  add column if not exists garden_id uuid;

alter table if exists public.year_notes
  add column if not exists garden_id uuid;

alter table if exists public.season_notes
  add column if not exists garden_id uuid;

alter table if exists public.achievements_unlocked
  add column if not exists garden_id uuid;

create index if not exists idx_pages_garden_date
  on public.pages (garden_id, date desc);

create index if not exists idx_seeds_garden_status_date
  on public.seeds (garden_id, status, scheduled_date);

create index if not exists idx_year_notes_garden_year
  on public.year_notes (garden_id, year);

create index if not exists idx_season_notes_garden_year
  on public.season_notes (garden_id, year);

create index if not exists idx_achievements_unlocked_garden_rule
  on public.achievements_unlocked (garden_id, rule_id);

do $$
begin
  if to_regclass('public.profiles') is not null
     and to_regclass('public.gardens') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'profiles_active_garden_id_fkey'
     ) then
    alter table public.profiles
      add constraint profiles_active_garden_id_fkey
      foreign key (active_garden_id)
      references public.gardens(id)
      on delete set null;
  end if;

  if to_regclass('public.pages') is not null
     and to_regclass('public.gardens') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'pages_garden_id_fkey'
     ) then
    alter table public.pages
      add constraint pages_garden_id_fkey
      foreign key (garden_id)
      references public.gardens(id)
      on delete set null;
  end if;

  if to_regclass('public.seeds') is not null
     and to_regclass('public.gardens') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'seeds_garden_id_fkey'
     ) then
    alter table public.seeds
      add constraint seeds_garden_id_fkey
      foreign key (garden_id)
      references public.gardens(id)
      on delete set null;
  end if;

  if to_regclass('public.year_notes') is not null
     and to_regclass('public.gardens') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'year_notes_garden_id_fkey'
     ) then
    alter table public.year_notes
      add constraint year_notes_garden_id_fkey
      foreign key (garden_id)
      references public.gardens(id)
      on delete set null;
  end if;

  if to_regclass('public.season_notes') is not null
     and to_regclass('public.gardens') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'season_notes_garden_id_fkey'
     ) then
    alter table public.season_notes
      add constraint season_notes_garden_id_fkey
      foreign key (garden_id)
      references public.gardens(id)
      on delete set null;
  end if;

  if to_regclass('public.achievements_unlocked') is not null
     and to_regclass('public.gardens') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'achievements_unlocked_garden_id_fkey'
     ) then
    alter table public.achievements_unlocked
      add constraint achievements_unlocked_garden_id_fkey
      foreign key (garden_id)
      references public.gardens(id)
      on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Bootstrap legacy (jardin compartido unico) + backfill garden_id
-- ---------------------------------------------------------------------------

do $$
declare
  legacy_owner_id uuid;
  legacy_bond_id uuid;
  legacy_garden_id uuid;
begin
  if to_regclass('public.profiles') is null then
    raise notice 'Skipping bootstrap: public.profiles does not exist.';
    return;
  end if;

  select p.id
  into legacy_owner_id
  from public.profiles p
  order by p.id
  limit 1;

  if legacy_owner_id is null then
    raise notice 'Skipping bootstrap: no profiles found.';
    return;
  end if;

  select b.id
  into legacy_bond_id
  from public.bonds b
  where b.system_key = 'legacy_shared_bond'
  limit 1;

  if legacy_bond_id is null then
    insert into public.bonds (
      type,
      status,
      title,
      created_by_user_id,
      system_key
    )
    values (
      'pareja',
      'active',
      'Jardin legado',
      legacy_owner_id,
      'legacy_shared_bond'
    )
    returning id into legacy_bond_id;
  end if;

  select g.id
  into legacy_garden_id
  from public.gardens g
  where g.system_key = 'legacy_shared_garden'
  limit 1;

  if legacy_garden_id is null then
    insert into public.gardens (
      bond_id,
      title,
      theme,
      status,
      is_private,
      created_by_user_id,
      system_key
    )
    values (
      legacy_bond_id,
      'Jardin compartido legado',
      'storybook_default',
      'active',
      true,
      legacy_owner_id,
      'legacy_shared_garden'
    )
    returning id into legacy_garden_id;
  end if;

  insert into public.bond_members (bond_id, user_id, member_role)
  select
    legacy_bond_id,
    p.id,
    case when p.id = legacy_owner_id then 'owner' else 'member' end
  from public.profiles p
  on conflict (bond_id, user_id) do nothing;

  insert into public.garden_members (garden_id, user_id, member_role)
  select
    legacy_garden_id,
    p.id,
    case when p.id = legacy_owner_id then 'owner' else 'editor' end
  from public.profiles p
  on conflict (garden_id, user_id) do nothing;

  update public.profiles
  set active_garden_id = coalesce(active_garden_id, legacy_garden_id);

  if to_regclass('public.pages') is not null then
    update public.pages
    set garden_id = legacy_garden_id
    where garden_id is null;
  end if;

  if to_regclass('public.seeds') is not null then
    update public.seeds
    set garden_id = legacy_garden_id
    where garden_id is null;
  end if;

  if to_regclass('public.year_notes') is not null then
    update public.year_notes
    set garden_id = legacy_garden_id
    where garden_id is null;
  end if;

  if to_regclass('public.season_notes') is not null then
    update public.season_notes
    set garden_id = legacy_garden_id
    where garden_id is null;
  end if;

  if to_regclass('public.achievements_unlocked') is not null then
    update public.achievements_unlocked
    set garden_id = legacy_garden_id
    where garden_id is null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5) RLS minima para nuevas tablas
-- ---------------------------------------------------------------------------

alter table if exists public.bonds enable row level security;
alter table if exists public.bond_members enable row level security;
alter table if exists public.gardens enable row level security;
alter table if exists public.garden_members enable row level security;
alter table if exists public.garden_invitations enable row level security;
alter table if exists public.memory_reflections enable row level security;

drop policy if exists bonds_read_member on public.bonds;
drop policy if exists bonds_write_superadmin on public.bonds;
create policy bonds_read_member on public.bonds
for select
to authenticated
using (
  exists (
    select 1
    from public.bond_members bm
    where bm.bond_id = bonds.id
      and bm.user_id = auth.uid()
      and bm.left_at is null
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);
create policy bonds_write_superadmin on public.bonds
for all
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
);

drop policy if exists bond_members_read_self_or_superadmin on public.bond_members;
drop policy if exists bond_members_write_superadmin on public.bond_members;
create policy bond_members_read_self_or_superadmin on public.bond_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);
create policy bond_members_write_superadmin on public.bond_members
for all
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
);

drop policy if exists gardens_read_member on public.gardens;
drop policy if exists gardens_write_superadmin on public.gardens;
create policy gardens_read_member on public.gardens
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = gardens.id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);
create policy gardens_write_superadmin on public.gardens
for all
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
);

drop policy if exists garden_members_read_self_or_superadmin on public.garden_members;
drop policy if exists garden_members_write_superadmin on public.garden_members;
create policy garden_members_read_self_or_superadmin on public.garden_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);
create policy garden_members_write_superadmin on public.garden_members
for all
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
);

drop policy if exists garden_invitations_read_self_or_superadmin on public.garden_invitations;
drop policy if exists garden_invitations_write_superadmin on public.garden_invitations;
create policy garden_invitations_read_self_or_superadmin on public.garden_invitations
for select
to authenticated
using (
  invited_by_user_id = auth.uid()
  or invited_user_id = auth.uid()
  or lower(invited_email) = lower(coalesce(auth.jwt()->>'email', ''))
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);
create policy garden_invitations_write_superadmin on public.garden_invitations
for all
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
);

drop policy if exists memory_reflections_read_member on public.memory_reflections;
drop policy if exists memory_reflections_write_member on public.memory_reflections;
create policy memory_reflections_read_member on public.memory_reflections
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = memory_reflections.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);
create policy memory_reflections_write_member on public.memory_reflections
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = memory_reflections.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists memory_reflections_update_member on public.memory_reflections;
create policy memory_reflections_update_member on public.memory_reflections
for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = memory_reflections.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = memory_reflections.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists memory_reflections_delete_member on public.memory_reflections;
create policy memory_reflections_delete_member on public.memory_reflections
for delete
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

