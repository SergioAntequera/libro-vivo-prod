-- Libro Vivo - Config Foundation (Fase 0 + Fase 1 base)
-- Execute in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.catalogs (
  key text primary key,
  label text not null,
  description text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  catalog_key text not null references public.catalogs(key) on delete cascade,
  code text not null,
  label text not null,
  sort_order int not null default 100,
  enabled boolean not null default true,
  color text null,
  icon text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalog_key, code)
);

create index if not exists idx_catalog_items_catalog_key
  on public.catalog_items(catalog_key);

create index if not exists idx_catalog_items_enabled
  on public.catalog_items(enabled);

create table if not exists public.ui_strings (
  id uuid primary key default gen_random_uuid(),
  namespace text not null,
  key text not null,
  locale text not null default 'es',
  value text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (namespace, key, locale)
);

create table if not exists public.ui_modules (
  key text primary key,
  label text not null,
  description text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ui_module_items (
  id uuid primary key default gen_random_uuid(),
  module_key text not null references public.ui_modules(key) on delete cascade,
  item_key text not null,
  label text not null,
  route text null,
  icon text null,
  sort_order int not null default 100,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_key, item_key)
);

create index if not exists idx_ui_module_items_module_key
  on public.ui_module_items(module_key);

-- updated_at helper
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_catalogs_touch on public.catalogs;
create trigger trg_catalogs_touch
before update on public.catalogs
for each row execute function public.touch_updated_at();

drop trigger if exists trg_catalog_items_touch on public.catalog_items;
create trigger trg_catalog_items_touch
before update on public.catalog_items
for each row execute function public.touch_updated_at();

drop trigger if exists trg_ui_strings_touch on public.ui_strings;
create trigger trg_ui_strings_touch
before update on public.ui_strings
for each row execute function public.touch_updated_at();

drop trigger if exists trg_ui_modules_touch on public.ui_modules;
create trigger trg_ui_modules_touch
before update on public.ui_modules
for each row execute function public.touch_updated_at();

drop trigger if exists trg_ui_module_items_touch on public.ui_module_items;
create trigger trg_ui_module_items_touch
before update on public.ui_module_items
for each row execute function public.touch_updated_at();

-- RLS
alter table public.catalogs enable row level security;
alter table public.catalog_items enable row level security;
alter table public.ui_strings enable row level security;
alter table public.ui_modules enable row level security;
alter table public.ui_module_items enable row level security;

drop policy if exists catalogs_read on public.catalogs;
create policy catalogs_read on public.catalogs
for select to authenticated
using (true);

drop policy if exists catalog_items_read on public.catalog_items;
create policy catalog_items_read on public.catalog_items
for select to authenticated
using (true);

drop policy if exists ui_strings_read on public.ui_strings;
create policy ui_strings_read on public.ui_strings
for select to authenticated
using (true);

drop policy if exists ui_modules_read on public.ui_modules;
create policy ui_modules_read on public.ui_modules
for select to authenticated
using (true);

drop policy if exists ui_module_items_read on public.ui_module_items;
create policy ui_module_items_read on public.ui_module_items
for select to authenticated
using (true);

-- superadmin write policy (depends on profiles.role)
drop policy if exists catalogs_write on public.catalogs;
create policy catalogs_write on public.catalogs
for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'superadmin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'superadmin'
  )
);

drop policy if exists catalog_items_write on public.catalog_items;
create policy catalog_items_write on public.catalog_items
for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'superadmin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'superadmin'
  )
);

drop policy if exists ui_strings_write on public.ui_strings;
create policy ui_strings_write on public.ui_strings
for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'superadmin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'superadmin'
  )
);

drop policy if exists ui_modules_write on public.ui_modules;
create policy ui_modules_write on public.ui_modules
for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'superadmin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'superadmin'
  )
);

drop policy if exists ui_module_items_write on public.ui_module_items;
create policy ui_module_items_write on public.ui_module_items
for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'superadmin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'superadmin'
  )
);

-- Seed catalogs
insert into public.catalogs (key, label, description, is_active)
values
  ('elements', 'Elementos', 'Clasificacion elemental de paginas y semillas', true),
  ('moods', 'Estados de Flor', 'Estado emocional/cuidado de la pagina', true),
  ('care_actions', 'Acciones de Cuidado', 'Acciones disponibles en ritual de cuidado', true),
  ('seed_statuses', 'Estados de Semilla', 'Flujo de semillas en planificacion/calendario', true),
  ('seasons', 'Estaciones', 'Etiquetas visuales y colores de temporada', true),
  ('tiers', 'Tiers', 'Niveles de logros/recompensas', true),
  ('achievement_kinds', 'Tipos de Hito', 'Tipos de reglas de logro', true),
  ('reward_kinds', 'Tipos de Recompensa', 'Clases de recompensa asignables', true)
on conflict (key) do update
set
  label = excluded.label,
  description = excluded.description,
  is_active = excluded.is_active;

-- Seed catalog items
insert into public.catalog_items (catalog_key, code, label, sort_order, enabled, color, icon, metadata)
values
  ('elements', 'fire', 'Fuego', 10, true, '#ffd8d0', 'fire', '{"emoji":"🔥"}'),
  ('elements', 'water', 'Agua', 20, true, '#d8ecff', 'water', '{"emoji":"💧"}'),
  ('elements', 'air', 'Aire', 30, true, '#e7f5ff', 'air', '{"emoji":"🌬"}'),
  ('elements', 'earth', 'Tierra', 40, true, '#f6e7d1', 'earth', '{"emoji":"🌱"}'),
  ('elements', 'aether', 'Eter', 50, true, '#efe4ff', 'aether', '{"emoji":"🌌"}'),

  ('moods', 'wilted', 'Mustia', 10, true, '#ffe8e8', 'wilted', '{"emoji":"🥀"}'),
  ('moods', 'healthy', 'Sana', 20, true, '#f0fff4', 'healthy', '{"emoji":"🌷"}'),
  ('moods', 'shiny', 'Brillante', 30, true, '#fff7e6', 'shiny', '{"emoji":"✨"}'),

  ('care_actions', 'water', 'Regar', 10, true, '#eaf7ff', 'water', '{"emoji":"💧"}'),
  ('care_actions', 'fertilize', 'Abonar', 20, true, '#f0fff4', 'fertilize', '{"emoji":"🌿"}'),
  ('care_actions', 'light', 'Dar luz', 30, true, '#fff7e6', 'light', '{"emoji":"☀️"}'),

  ('seed_statuses', 'seed', 'Sin programar', 10, true, null, 'seed', '{}'),
  ('seed_statuses', 'scheduled', 'Programada', 20, true, null, 'scheduled', '{}'),
  ('seed_statuses', 'bloomed', 'Florecida', 30, true, null, 'bloomed', '{}'),

  ('seasons', 'spring', 'Primavera', 10, true, '#f6fff7', 'spring', '{"emoji":"🌸"}'),
  ('seasons', 'summer', 'Verano', 20, true, '#fffbe8', 'summer', '{"emoji":"☀️"}'),
  ('seasons', 'autumn', 'Otono', 30, true, '#fff3ea', 'autumn', '{"emoji":"🍂"}'),
  ('seasons', 'winter', 'Invierno', 40, true, '#eef7ff', 'winter', '{"emoji":"❄️"}'),

  ('tiers', 'bronze', 'Bronce', 10, true, '#f8dfcc', 'bronze', '{}'),
  ('tiers', 'silver', 'Plata', 20, true, '#deecfb', 'silver', '{}'),
  ('tiers', 'gold', 'Oro', 30, true, '#fff1c5', 'gold', '{}'),
  ('tiers', 'diamond', 'Diamante', 40, true, '#eadfff', 'diamond', '{}'),

  ('achievement_kinds', 'pages_completed', 'Paginas completadas', 10, true, null, 'pages_completed', '{}'),
  ('achievement_kinds', 'seeds_bloomed', 'Semillas florecidas', 20, true, null, 'seeds_bloomed', '{}'),

  ('reward_kinds', 'gift', 'Regalo', 10, true, null, 'gift', '{}'),
  ('reward_kinds', 'message', 'Mensaje', 20, true, null, 'message', '{}'),
  ('reward_kinds', 'sticker_pack', 'Pack de stickers', 30, true, null, 'sticker_pack', '{}')
on conflict (catalog_key, code) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  enabled = excluded.enabled,
  color = excluded.color,
  icon = excluded.icon,
  metadata = excluded.metadata;
