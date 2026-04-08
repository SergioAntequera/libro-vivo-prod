-- Libro Vivo - Seed preparation planner foundation
-- Fecha: 2026-03-26
--
-- Objetivo:
-- - Introducir una fase previa `planning_draft` dentro del dominio de `seeds`.
-- - Crear la base relacional del dossier de preparacion sin romper el flujo rapido actual.
-- - Mantener `map_places` y `map_routes` como verdad del mapa.

create extension if not exists pgcrypto;

insert into public.catalog_items (
  catalog_key,
  code,
  label,
  sort_order,
  enabled,
  color,
  icon,
  metadata
)
values (
  'seed_statuses',
  'planning_draft',
  'Preparando',
  5,
  true,
  null,
  'planning_draft',
  '{}'::jsonb
)
on conflict (catalog_key, code) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  enabled = excluded.enabled,
  color = excluded.color,
  icon = excluded.icon,
  metadata = excluded.metadata;

insert into public.seed_status_flow (
  from_status,
  to_status,
  action_key,
  requires_scheduled_date,
  clear_scheduled_date,
  create_page_on_transition,
  enabled,
  sort_order,
  metadata
)
values
  (
    'planning_draft',
    'seed',
    'plant',
    false,
    true,
    false,
    true,
    5,
    '{"label":"Plantar semilla preparada"}'::jsonb
  ),
  (
    'planning_draft',
    'scheduled',
    'plant_schedule',
    true,
    false,
    false,
    true,
    6,
    '{"label":"Plantar semilla preparada con fecha"}'::jsonb
  )
on conflict (from_status, to_status, action_key) do update
set
  requires_scheduled_date = excluded.requires_scheduled_date,
  clear_scheduled_date = excluded.clear_scheduled_date,
  create_page_on_transition = excluded.create_page_on_transition,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata;

create table if not exists public.seed_preparation_profiles (
  id uuid primary key default gen_random_uuid(),
  seed_id uuid not null unique references public.seeds(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  planner_mode text not null default 'general',
  collaboration_mode text not null default 'solo_for_now'
    check (collaboration_mode in ('solo_for_now', 'shared')),
  preparation_progress integer not null default 0
    check (preparation_progress >= 0 and preparation_progress <= 100),
  enabled_blocks text[] not null default '{}'::text[],
  summary text null,
  date_mode text not null default 'single_day'
    check (date_mode in ('single_day', 'date_range', 'flexible')),
  starts_on date null,
  ends_on date null,
  budget_amount numeric(12,2) null,
  budget_currency text null,
  budget_notes text null,
  goal_tags text[] not null default '{}'::text[],
  primary_map_place_id uuid null references public.map_places(id) on delete set null,
  primary_map_route_id uuid null references public.map_routes(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_seed_preparation_profiles_garden_seed
  on public.seed_preparation_profiles (garden_id, seed_id);

create table if not exists public.seed_preparation_transport_legs (
  id uuid primary key default gen_random_uuid(),
  seed_id uuid not null references public.seeds(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  order_index integer not null default 0,
  title text null,
  from_label text null,
  to_label text null,
  starts_at timestamptz null,
  ends_at timestamptz null,
  transport_kind text not null default 'other'
    check (transport_kind in ('walking','car','train','plane','bus','boat','metro','mixed','other')),
  provider_name text null,
  booking_url text null,
  reference_code text null,
  map_route_id uuid null references public.map_routes(id) on delete set null,
  origin_place_id uuid null references public.map_places(id) on delete set null,
  destination_place_id uuid null references public.map_places(id) on delete set null,
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_seed_preparation_transport_garden_seed
  on public.seed_preparation_transport_legs (garden_id, seed_id, order_index);

create table if not exists public.seed_preparation_stays (
  id uuid primary key default gen_random_uuid(),
  seed_id uuid not null references public.seeds(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  order_index integer not null default 0,
  stay_kind text not null default 'other'
    check (stay_kind in ('hotel','hostel','apartment','house','camping','other')),
  name text not null,
  provider_name text null,
  booking_url text null,
  check_in_date date null,
  check_out_date date null,
  address_label text null,
  map_place_id uuid null references public.map_places(id) on delete set null,
  confirmation_code text null,
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_seed_preparation_stays_garden_seed
  on public.seed_preparation_stays (garden_id, seed_id, order_index);

create table if not exists public.seed_preparation_place_links (
  id uuid primary key default gen_random_uuid(),
  seed_id uuid not null references public.seeds(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  order_index integer not null default 0,
  map_place_id uuid null references public.map_places(id) on delete set null,
  manual_title text null,
  priority text not null default 'would_like'
    check (priority in ('must','would_like','if_time')),
  planning_state text not null default 'idea'
    check (planning_state in ('idea','booked','visited','skipped')),
  linked_transport_leg_id uuid null references public.seed_preparation_transport_legs(id) on delete set null,
  linked_route_id uuid null references public.map_routes(id) on delete set null,
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_seed_preparation_places_garden_seed
  on public.seed_preparation_place_links (garden_id, seed_id, order_index);

create table if not exists public.seed_preparation_itinerary_items (
  id uuid primary key default gen_random_uuid(),
  seed_id uuid not null references public.seeds(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  order_index integer not null default 0,
  day_date date null,
  time_label text null,
  title text not null,
  description text null,
  map_place_id uuid null references public.map_places(id) on delete set null,
  map_route_id uuid null references public.map_routes(id) on delete set null,
  transport_leg_id uuid null references public.seed_preparation_transport_legs(id) on delete set null,
  status text not null default 'planned'
    check (status in ('planned','confirmed','flexible','done','dropped')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_seed_preparation_itinerary_garden_seed
  on public.seed_preparation_itinerary_items (garden_id, seed_id, order_index);

create table if not exists public.seed_preparation_checklist_items (
  id uuid primary key default gen_random_uuid(),
  seed_id uuid not null references public.seeds(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  order_index integer not null default 0,
  category text not null default 'misc'
    check (category in ('documents','health','clothes','tech','money','insurance','misc')),
  label text not null,
  owner text not null default 'shared'
    check (owner in ('me','partner','shared')),
  is_required boolean not null default false,
  completed_at timestamptz null,
  completed_by_user_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_seed_preparation_checklist_garden_seed
  on public.seed_preparation_checklist_items (garden_id, seed_id, order_index);

create table if not exists public.seed_preparation_reservations (
  id uuid primary key default gen_random_uuid(),
  seed_id uuid not null references public.seeds(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  order_index integer not null default 0,
  reservation_kind text not null default 'other'
    check (reservation_kind in ('ticket','booking','insurance','restaurant','activity','other')),
  title text not null,
  provider_name text null,
  reservation_url text null,
  reference_code text null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','cancelled')),
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_seed_preparation_reservations_garden_seed
  on public.seed_preparation_reservations (garden_id, seed_id, order_index);

drop trigger if exists trg_seed_preparation_profiles_touch_updated_at on public.seed_preparation_profiles;
create trigger trg_seed_preparation_profiles_touch_updated_at
before update on public.seed_preparation_profiles
for each row execute function public.touch_updated_at();

drop trigger if exists trg_seed_preparation_transport_touch_updated_at on public.seed_preparation_transport_legs;
create trigger trg_seed_preparation_transport_touch_updated_at
before update on public.seed_preparation_transport_legs
for each row execute function public.touch_updated_at();

drop trigger if exists trg_seed_preparation_stays_touch_updated_at on public.seed_preparation_stays;
create trigger trg_seed_preparation_stays_touch_updated_at
before update on public.seed_preparation_stays
for each row execute function public.touch_updated_at();

drop trigger if exists trg_seed_preparation_places_touch_updated_at on public.seed_preparation_place_links;
create trigger trg_seed_preparation_places_touch_updated_at
before update on public.seed_preparation_place_links
for each row execute function public.touch_updated_at();

drop trigger if exists trg_seed_preparation_itinerary_touch_updated_at on public.seed_preparation_itinerary_items;
create trigger trg_seed_preparation_itinerary_touch_updated_at
before update on public.seed_preparation_itinerary_items
for each row execute function public.touch_updated_at();

drop trigger if exists trg_seed_preparation_checklist_touch_updated_at on public.seed_preparation_checklist_items;
create trigger trg_seed_preparation_checklist_touch_updated_at
before update on public.seed_preparation_checklist_items
for each row execute function public.touch_updated_at();

drop trigger if exists trg_seed_preparation_reservations_touch_updated_at on public.seed_preparation_reservations;
create trigger trg_seed_preparation_reservations_touch_updated_at
before update on public.seed_preparation_reservations
for each row execute function public.touch_updated_at();

alter table public.seed_preparation_profiles enable row level security;
alter table public.seed_preparation_transport_legs enable row level security;
alter table public.seed_preparation_stays enable row level security;
alter table public.seed_preparation_place_links enable row level security;
alter table public.seed_preparation_itinerary_items enable row level security;
alter table public.seed_preparation_checklist_items enable row level security;
alter table public.seed_preparation_reservations enable row level security;

drop policy if exists seed_preparation_profiles_read_member on public.seed_preparation_profiles;
create policy seed_preparation_profiles_read_member on public.seed_preparation_profiles
for select to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = seed_preparation_profiles.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists seed_preparation_profiles_write_member on public.seed_preparation_profiles;
create policy seed_preparation_profiles_write_member on public.seed_preparation_profiles
for all to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = seed_preparation_profiles.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
)
with check (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = seed_preparation_profiles.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists seed_preparation_transport_read_member on public.seed_preparation_transport_legs;
create policy seed_preparation_transport_read_member on public.seed_preparation_transport_legs
for select to authenticated
using (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_transport_legs.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists seed_preparation_transport_write_member on public.seed_preparation_transport_legs;
create policy seed_preparation_transport_write_member on public.seed_preparation_transport_legs
for all to authenticated
using (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_transport_legs.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
)
with check (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_transport_legs.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists seed_preparation_stays_read_member on public.seed_preparation_stays;
create policy seed_preparation_stays_read_member on public.seed_preparation_stays
for select to authenticated
using (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_stays.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists seed_preparation_stays_write_member on public.seed_preparation_stays;
create policy seed_preparation_stays_write_member on public.seed_preparation_stays
for all to authenticated
using (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_stays.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
)
with check (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_stays.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists seed_preparation_places_read_member on public.seed_preparation_place_links;
create policy seed_preparation_places_read_member on public.seed_preparation_place_links
for select to authenticated
using (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_place_links.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists seed_preparation_places_write_member on public.seed_preparation_place_links;
create policy seed_preparation_places_write_member on public.seed_preparation_place_links
for all to authenticated
using (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_place_links.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
)
with check (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_place_links.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists seed_preparation_itinerary_read_member on public.seed_preparation_itinerary_items;
create policy seed_preparation_itinerary_read_member on public.seed_preparation_itinerary_items
for select to authenticated
using (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_itinerary_items.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists seed_preparation_itinerary_write_member on public.seed_preparation_itinerary_items;
create policy seed_preparation_itinerary_write_member on public.seed_preparation_itinerary_items
for all to authenticated
using (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_itinerary_items.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
)
with check (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_itinerary_items.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists seed_preparation_checklist_read_member on public.seed_preparation_checklist_items;
create policy seed_preparation_checklist_read_member on public.seed_preparation_checklist_items
for select to authenticated
using (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_checklist_items.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists seed_preparation_checklist_write_member on public.seed_preparation_checklist_items;
create policy seed_preparation_checklist_write_member on public.seed_preparation_checklist_items
for all to authenticated
using (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_checklist_items.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
)
with check (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_checklist_items.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists seed_preparation_reservations_read_member on public.seed_preparation_reservations;
create policy seed_preparation_reservations_read_member on public.seed_preparation_reservations
for select to authenticated
using (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_reservations.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists seed_preparation_reservations_write_member on public.seed_preparation_reservations;
create policy seed_preparation_reservations_write_member on public.seed_preparation_reservations
for all to authenticated
using (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_reservations.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
)
with check (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_reservations.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);
