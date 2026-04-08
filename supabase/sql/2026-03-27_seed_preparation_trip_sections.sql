-- Libro Vivo - Seed preparation richer trip sections
-- Fecha: 2026-03-27
--
-- Objetivo:
-- - Expandir el dossier modular para cubrir el caso fuerte de viaje.
-- - Introducir trip brief, etapas y documentos sin duplicar mapa/rutas.

alter table public.seed_preparation_profiles
  add column if not exists destination_label text null,
  add column if not exists destination_kind text null,
  add column if not exists shared_intention text null,
  add column if not exists why_this_trip text null,
  add column if not exists climate_context text null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'seed_preparation_profiles_destination_kind_check'
      and conrelid = 'public.seed_preparation_profiles'::regclass
  ) then
    alter table public.seed_preparation_profiles
      drop constraint seed_preparation_profiles_destination_kind_check;
  end if;

  alter table public.seed_preparation_profiles
    add constraint seed_preparation_profiles_destination_kind_check
    check (
      destination_kind is null
      or destination_kind in ('city','beach','mountain','international','road_trip','other')
    );
end $$;

create table if not exists public.seed_preparation_stops (
  id uuid primary key default gen_random_uuid(),
  seed_id uuid not null references public.seeds(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  order_index integer not null default 0,
  title text not null,
  base_place_id uuid null references public.map_places(id) on delete set null,
  starts_on date null,
  ends_on date null,
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_seed_preparation_stops_garden_seed
  on public.seed_preparation_stops (garden_id, seed_id, order_index);

alter table public.seed_preparation_transport_legs
  add column if not exists origin_stop_id uuid references public.seed_preparation_stops(id) on delete set null,
  add column if not exists destination_stop_id uuid references public.seed_preparation_stops(id) on delete set null;

alter table public.seed_preparation_stays
  add column if not exists stop_id uuid references public.seed_preparation_stops(id) on delete set null;

alter table public.seed_preparation_place_links
  add column if not exists stop_id uuid references public.seed_preparation_stops(id) on delete set null,
  add column if not exists day_date date null;

alter table public.seed_preparation_itinerary_items
  add column if not exists stop_id uuid references public.seed_preparation_stops(id) on delete set null,
  add column if not exists duration_minutes integer null
    check (duration_minutes is null or duration_minutes >= 0);

alter table public.seed_preparation_reservations
  add column if not exists stop_id uuid references public.seed_preparation_stops(id) on delete set null,
  add column if not exists amount numeric(12,2) null,
  add column if not exists currency text null,
  add column if not exists starts_at timestamptz null,
  add column if not exists map_place_id uuid references public.map_places(id) on delete set null;

create table if not exists public.seed_preparation_attachments (
  id uuid primary key default gen_random_uuid(),
  seed_id uuid not null references public.seeds(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  order_index integer not null default 0,
  linked_kind text not null default 'seed'
    check (linked_kind in ('seed','transport_leg','stay','reservation','generic_document')),
  linked_record_id uuid null,
  attachment_kind text not null default 'other'
    check (attachment_kind in ('passport','dni','ticket','reservation','insurance','medical','other')),
  title text not null,
  file_name text null,
  mime_type text null,
  storage_provider text null,
  file_url text not null,
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_seed_preparation_attachments_garden_seed
  on public.seed_preparation_attachments (garden_id, seed_id, order_index);

drop trigger if exists trg_seed_preparation_stops_touch_updated_at on public.seed_preparation_stops;
create trigger trg_seed_preparation_stops_touch_updated_at
before update on public.seed_preparation_stops
for each row execute function public.touch_updated_at();

drop trigger if exists trg_seed_preparation_attachments_touch_updated_at on public.seed_preparation_attachments;
create trigger trg_seed_preparation_attachments_touch_updated_at
before update on public.seed_preparation_attachments
for each row execute function public.touch_updated_at();

alter table public.seed_preparation_stops enable row level security;
alter table public.seed_preparation_attachments enable row level security;

drop policy if exists seed_preparation_stops_read_member on public.seed_preparation_stops;
create policy seed_preparation_stops_read_member on public.seed_preparation_stops
for select to authenticated
using (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_stops.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists seed_preparation_stops_write_member on public.seed_preparation_stops;
create policy seed_preparation_stops_write_member on public.seed_preparation_stops
for all to authenticated
using (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_stops.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
)
with check (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_stops.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists seed_preparation_attachments_read_member on public.seed_preparation_attachments;
create policy seed_preparation_attachments_read_member on public.seed_preparation_attachments
for select to authenticated
using (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_attachments.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists seed_preparation_attachments_write_member on public.seed_preparation_attachments;
create policy seed_preparation_attachments_write_member on public.seed_preparation_attachments
for all to authenticated
using (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_attachments.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
)
with check (
  exists (
    select 1 from public.garden_members gm
    where gm.garden_id = seed_preparation_attachments.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);
