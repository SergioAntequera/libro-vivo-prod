-- Libro Vivo - Map domain foundation
-- Fecha: 2026-03-15
--
-- Objetivo:
-- - Crear una base seria para el nuevo sistema de mapa.
-- - Separar recuerdos geolocalizados de entidades curadas del mapa:
--   * lugares guardados
--   * rutas guardadas
--   * zonas simbolicas
-- - Preparar enlaces opcionales a paginas y semillas para integrar despues con planes.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Lugares guardados del jardin
-- ---------------------------------------------------------------------------

create table if not exists public.map_places (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  kind text not null
    check (kind in ('place', 'restaurant', 'cafe', 'viewpoint', 'beach', 'lodging', 'custom')),
  state text not null default 'saved'
    check (state in ('saved', 'visited', 'favorite', 'wishlist', 'archived')),
  title text not null,
  subtitle text null,
  notes text null,
  address_label text null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  rating numeric(3,1) null check (rating between 0 and 5),
  icon_code text null,
  color_token text null,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  source_page_id uuid null references public.pages(id) on delete set null,
  source_seed_id uuid null references public.seeds(id) on delete set null,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  updated_by_user_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz null
);

create index if not exists idx_map_places_garden_kind
  on public.map_places (garden_id, kind, created_at desc);

create index if not exists idx_map_places_garden_state
  on public.map_places (garden_id, state, created_at desc);

create index if not exists idx_map_places_garden_page
  on public.map_places (garden_id, source_page_id);

create index if not exists idx_map_places_garden_seed
  on public.map_places (garden_id, source_seed_id);

-- ---------------------------------------------------------------------------
-- 2) Rutas guardadas del jardin
-- ---------------------------------------------------------------------------

create table if not exists public.map_routes (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  kind text not null
    check (kind in ('walk', 'drive', 'date_route', 'trip', 'ritual', 'custom')),
  status text not null default 'draft'
    check (status in ('draft', 'saved', 'archived')),
  travel_mode text not null default 'walking'
    check (travel_mode in ('walking', 'driving', 'cycling', 'transit', 'mixed')),
  title text not null,
  subtitle text null,
  notes text null,
  origin_label text null,
  origin_lat double precision null check (origin_lat between -90 and 90),
  origin_lng double precision null check (origin_lng between -180 and 180),
  destination_label text null,
  destination_lat double precision null check (destination_lat between -90 and 90),
  destination_lng double precision null check (destination_lng between -180 and 180),
  waypoints jsonb not null default '[]'::jsonb,
  geometry jsonb not null default '{}'::jsonb,
  distance_meters numeric(12,2) null check (distance_meters >= 0),
  duration_seconds integer null check (duration_seconds >= 0),
  icon_code text null,
  color_token text null,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  source_page_id uuid null references public.pages(id) on delete set null,
  source_seed_id uuid null references public.seeds(id) on delete set null,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  updated_by_user_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz null,
  check (jsonb_typeof(waypoints) = 'array'),
  check (jsonb_typeof(geometry) = 'object')
);

create index if not exists idx_map_routes_garden_kind
  on public.map_routes (garden_id, kind, created_at desc);

create index if not exists idx_map_routes_garden_status
  on public.map_routes (garden_id, status, created_at desc);

create index if not exists idx_map_routes_garden_page
  on public.map_routes (garden_id, source_page_id);

create index if not exists idx_map_routes_garden_seed
  on public.map_routes (garden_id, source_seed_id);

-- ---------------------------------------------------------------------------
-- 3) Zonas simbolicas y semanticas del jardin
-- ---------------------------------------------------------------------------

create table if not exists public.map_zones (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  kind text not null
    check (kind in ('symbolic', 'favorite_area', 'memory_area', 'meeting_area', 'avoid_area', 'custom')),
  status text not null default 'active'
    check (status in ('active', 'archived')),
  title text not null,
  subtitle text null,
  description text null,
  geojson jsonb not null default '{}'::jsonb,
  centroid_lat double precision null check (centroid_lat between -90 and 90),
  centroid_lng double precision null check (centroid_lng between -180 and 180),
  icon_code text null,
  color_token text null,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  source_page_id uuid null references public.pages(id) on delete set null,
  source_seed_id uuid null references public.seeds(id) on delete set null,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  updated_by_user_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz null,
  check (jsonb_typeof(geojson) = 'object')
);

create index if not exists idx_map_zones_garden_kind
  on public.map_zones (garden_id, kind, created_at desc);

create index if not exists idx_map_zones_garden_status
  on public.map_zones (garden_id, status, created_at desc);

create index if not exists idx_map_zones_garden_page
  on public.map_zones (garden_id, source_page_id);

create index if not exists idx_map_zones_garden_seed
  on public.map_zones (garden_id, source_seed_id);

-- ---------------------------------------------------------------------------
-- 4) updated_at triggers
-- ---------------------------------------------------------------------------

drop trigger if exists trg_map_places_touch_updated_at on public.map_places;
create trigger trg_map_places_touch_updated_at
before update on public.map_places
for each row execute function public.touch_updated_at();

drop trigger if exists trg_map_routes_touch_updated_at on public.map_routes;
create trigger trg_map_routes_touch_updated_at
before update on public.map_routes
for each row execute function public.touch_updated_at();

drop trigger if exists trg_map_zones_touch_updated_at on public.map_zones;
create trigger trg_map_zones_touch_updated_at
before update on public.map_zones
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5) RLS
-- ---------------------------------------------------------------------------

alter table if exists public.map_places enable row level security;
alter table if exists public.map_routes enable row level security;
alter table if exists public.map_zones enable row level security;

drop policy if exists map_places_read_garden_member on public.map_places;
create policy map_places_read_garden_member on public.map_places
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = map_places.garden_id
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

drop policy if exists map_places_insert_garden_editor on public.map_places;
create policy map_places_insert_garden_editor on public.map_places
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superadmin'
    )
    or exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = map_places.garden_id
        and gm.user_id = auth.uid()
        and gm.left_at is null
        and gm.member_role in ('owner', 'editor')
    )
  )
);

drop policy if exists map_places_update_garden_editor on public.map_places;
create policy map_places_update_garden_editor on public.map_places
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
  or exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = map_places.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
      and gm.member_role in ('owner', 'editor')
  )
)
with check (
  (
    updated_by_user_id is null
    or updated_by_user_id = auth.uid()
  )
  and (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superadmin'
    )
    or exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = map_places.garden_id
        and gm.user_id = auth.uid()
        and gm.left_at is null
        and gm.member_role in ('owner', 'editor')
    )
  )
);

drop policy if exists map_places_delete_garden_editor on public.map_places;
create policy map_places_delete_garden_editor on public.map_places
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
  or exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = map_places.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
      and gm.member_role in ('owner', 'editor')
  )
);

drop policy if exists map_routes_read_garden_member on public.map_routes;
create policy map_routes_read_garden_member on public.map_routes
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = map_routes.garden_id
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

drop policy if exists map_routes_insert_garden_editor on public.map_routes;
create policy map_routes_insert_garden_editor on public.map_routes
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superadmin'
    )
    or exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = map_routes.garden_id
        and gm.user_id = auth.uid()
        and gm.left_at is null
        and gm.member_role in ('owner', 'editor')
    )
  )
);

drop policy if exists map_routes_update_garden_editor on public.map_routes;
create policy map_routes_update_garden_editor on public.map_routes
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
  or exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = map_routes.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
      and gm.member_role in ('owner', 'editor')
  )
)
with check (
  (
    updated_by_user_id is null
    or updated_by_user_id = auth.uid()
  )
  and (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superadmin'
    )
    or exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = map_routes.garden_id
        and gm.user_id = auth.uid()
        and gm.left_at is null
        and gm.member_role in ('owner', 'editor')
    )
  )
);

drop policy if exists map_routes_delete_garden_editor on public.map_routes;
create policy map_routes_delete_garden_editor on public.map_routes
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
  or exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = map_routes.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
      and gm.member_role in ('owner', 'editor')
  )
);

drop policy if exists map_zones_read_garden_member on public.map_zones;
create policy map_zones_read_garden_member on public.map_zones
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = map_zones.garden_id
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

drop policy if exists map_zones_insert_garden_editor on public.map_zones;
create policy map_zones_insert_garden_editor on public.map_zones
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superadmin'
    )
    or exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = map_zones.garden_id
        and gm.user_id = auth.uid()
        and gm.left_at is null
        and gm.member_role in ('owner', 'editor')
    )
  )
);

drop policy if exists map_zones_update_garden_editor on public.map_zones;
create policy map_zones_update_garden_editor on public.map_zones
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
  or exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = map_zones.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
      and gm.member_role in ('owner', 'editor')
  )
)
with check (
  (
    updated_by_user_id is null
    or updated_by_user_id = auth.uid()
  )
  and (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superadmin'
    )
    or exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = map_zones.garden_id
        and gm.user_id = auth.uid()
        and gm.left_at is null
        and gm.member_role in ('owner', 'editor')
    )
  )
);

drop policy if exists map_zones_delete_garden_editor on public.map_zones;
create policy map_zones_delete_garden_editor on public.map_zones
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
  or exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = map_zones.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
      and gm.member_role in ('owner', 'editor')
  )
);
