-- Libro Vivo - Forest config foundation (Fase 5 bootstrap)
-- Execute after 2026-03-05_config_foundation.sql

create extension if not exists pgcrypto;

create table if not exists public.forest_theme (
  key text primary key,
  label text not null,
  description text null,
  is_active boolean not null default true,
  priority int not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forest_assets (
  id uuid primary key default gen_random_uuid(),
  theme_key text not null references public.forest_theme(key) on delete cascade,
  asset_key text not null,
  asset_type text not null default 'token'
    check (asset_type in ('token', 'emoji', 'image_url', 'color')),
  value text not null,
  enabled boolean not null default true,
  sort_order int not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (theme_key, asset_key)
);

create table if not exists public.forest_narrative_templates (
  id uuid primary key default gen_random_uuid(),
  theme_key text not null references public.forest_theme(key) on delete cascade,
  template_key text not null,
  body text not null,
  enabled boolean not null default true,
  sort_order int not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (theme_key, template_key)
);

create index if not exists idx_forest_assets_theme on public.forest_assets(theme_key);
create index if not exists idx_forest_assets_enabled on public.forest_assets(enabled);
create index if not exists idx_forest_narrative_theme on public.forest_narrative_templates(theme_key);
create index if not exists idx_forest_narrative_enabled on public.forest_narrative_templates(enabled);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_forest_theme_touch on public.forest_theme;
create trigger trg_forest_theme_touch
before update on public.forest_theme
for each row execute function public.touch_updated_at();

drop trigger if exists trg_forest_assets_touch on public.forest_assets;
create trigger trg_forest_assets_touch
before update on public.forest_assets
for each row execute function public.touch_updated_at();

drop trigger if exists trg_forest_narrative_touch on public.forest_narrative_templates;
create trigger trg_forest_narrative_touch
before update on public.forest_narrative_templates
for each row execute function public.touch_updated_at();

alter table public.forest_theme enable row level security;
alter table public.forest_assets enable row level security;
alter table public.forest_narrative_templates enable row level security;

drop policy if exists forest_theme_read on public.forest_theme;
create policy forest_theme_read on public.forest_theme
for select to authenticated
using (true);

drop policy if exists forest_assets_read on public.forest_assets;
create policy forest_assets_read on public.forest_assets
for select to authenticated
using (true);

drop policy if exists forest_narrative_read on public.forest_narrative_templates;
create policy forest_narrative_read on public.forest_narrative_templates
for select to authenticated
using (true);

drop policy if exists forest_theme_write on public.forest_theme;
create policy forest_theme_write on public.forest_theme
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

drop policy if exists forest_assets_write on public.forest_assets;
create policy forest_assets_write on public.forest_assets
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

drop policy if exists forest_narrative_write on public.forest_narrative_templates;
create policy forest_narrative_write on public.forest_narrative_templates
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

insert into public.forest_theme (key, label, description, is_active, priority, metadata)
values
  (
    'storybook_default',
    'Bosque Clasico',
    'Tema base del bosque',
    true,
    100,
    '{
      "title":"Bosque de Recuerdos",
      "subtitle":"Cada pagina que viveis planta una flor en vuestro cuento.",
      "empty_message":"Tu bosque esta vacio. Planta la primera pagina y aparecera tu primera flor."
    }'::jsonb
  )
on conflict (key) do update
set
  label = excluded.label,
  description = excluded.description,
  is_active = excluded.is_active,
  priority = excluded.priority,
  metadata = excluded.metadata;

insert into public.forest_assets (theme_key, asset_key, asset_type, value, enabled, sort_order, metadata)
values
  ('storybook_default', 'season_label.spring', 'token', 'Primavera', true, 10, '{}'),
  ('storybook_default', 'season_label.summer', 'token', 'Verano', true, 20, '{}'),
  ('storybook_default', 'season_label.autumn', 'token', 'Otono', true, 30, '{}'),
  ('storybook_default', 'season_label.winter', 'token', 'Invierno', true, 40, '{}'),
  ('storybook_default', 'element_label.fire', 'token', 'Fuego', true, 50, '{}'),
  ('storybook_default', 'element_label.water', 'token', 'Agua', true, 60, '{}'),
  ('storybook_default', 'element_label.air', 'token', 'Aire', true, 70, '{}'),
  ('storybook_default', 'element_label.earth', 'token', 'Tierra', true, 80, '{}'),
  ('storybook_default', 'element_label.aether', 'token', 'Eter', true, 90, '{}'),
  ('storybook_default', 'token.element.fire', 'token', 'F', true, 100, '{}'),
  ('storybook_default', 'token.element.water', 'token', 'A', true, 101, '{}'),
  ('storybook_default', 'token.element.air', 'token', 'Ai', true, 102, '{}'),
  ('storybook_default', 'token.element.earth', 'token', 'T', true, 103, '{}'),
  ('storybook_default', 'token.element.aether', 'token', 'E', true, 104, '{}'),
  ('storybook_default', 'icon.tier.bronze', 'emoji', '🥉', true, 105, '{}'),
  ('storybook_default', 'icon.tier.silver', 'emoji', '🥈', true, 106, '{}'),
  ('storybook_default', 'icon.tier.gold', 'emoji', '🥇', true, 107, '{}'),
  ('storybook_default', 'icon.tier.diamond', 'emoji', '💎', true, 108, '{}'),
  ('storybook_default', 'icon.kind.pages_completed', 'emoji', '📖', true, 118, '{}'),
  ('storybook_default', 'icon.kind.seeds_bloomed', 'emoji', '🌱', true, 119, '{}'),
  ('storybook_default', 'label.kind.pages_completed', 'token', 'Paginas completadas', true, 110, '{}'),
  ('storybook_default', 'label.kind.seeds_bloomed', 'token', 'Semillas florecidas', true, 111, '{}'),
  ('storybook_default', 'label.status.unlocked', 'token', 'Desbloqueado', true, 112, '{}'),
  ('storybook_default', 'label.status.ready', 'token', 'Listo para desbloquear', true, 113, '{}'),
  ('storybook_default', 'label.status.locked', 'token', 'En progreso', true, 114, '{}'),
  ('storybook_default', 'label.mood.shiny', 'token', 'Brillante', true, 115, '{}'),
  ('storybook_default', 'label.mood.healthy', 'token', 'Sana', true, 116, '{}'),
  ('storybook_default', 'label.mood.wilted', 'token', 'Mustia', true, 117, '{}'),
  ('storybook_default', 'color.season_card.spring', 'color', '#f4fff6', true, 120, '{}'),
  ('storybook_default', 'color.season_card.summer', 'color', '#fffbe9', true, 121, '{}'),
  ('storybook_default', 'color.season_card.autumn', 'color', '#fff3ea', true, 122, '{}'),
  ('storybook_default', 'color.season_card.winter', 'color', '#eef6ff', true, 123, '{}'),
  ('storybook_default', 'color.element.fire', 'color', '#ffd8d0', true, 124, '{}'),
  ('storybook_default', 'color.element.water', 'color', '#d8ecff', true, 125, '{}'),
  ('storybook_default', 'color.element.air', 'color', '#e7f5ff', true, 126, '{}'),
  ('storybook_default', 'color.element.earth', 'color', '#f6e7d1', true, 127, '{}'),
  ('storybook_default', 'color.element.aether', 'color', '#efe4ff', true, 128, '{}'),
  ('storybook_default', 'color.element.default', 'color', '#efefef', true, 129, '{}'),
  ('storybook_default', 'color.tier_card.locked', 'color', '#f8f8f8', true, 130, '{}'),
  ('storybook_default', 'color.tier_card.bronze', 'color', '#fff4ea', true, 131, '{}'),
  ('storybook_default', 'color.tier_card.silver', 'color', '#f0f7ff', true, 132, '{}'),
  ('storybook_default', 'color.tier_card.gold', 'color', '#fff9df', true, 133, '{}'),
  ('storybook_default', 'color.tier_card.diamond', 'color', '#f4efff', true, 134, '{}'),
  ('storybook_default', 'color.tier_crown.locked', 'color', '#efefef', true, 135, '{}'),
  ('storybook_default', 'color.tier_crown.bronze', 'color', '#f2c9a4', true, 136, '{}'),
  ('storybook_default', 'color.tier_crown.silver', 'color', '#cde1f5', true, 137, '{}'),
  ('storybook_default', 'color.tier_crown.gold', 'color', '#f5e6a8', true, 138, '{}'),
  ('storybook_default', 'color.tier_crown.diamond', 'color', '#dbc9ff', true, 139, '{}'),
  ('storybook_default', 'color.tier_trunk.locked', 'color', '#c7c7c7', true, 140, '{}'),
  ('storybook_default', 'color.tier_trunk.bronze', 'color', '#986647', true, 141, '{}'),
  ('storybook_default', 'color.tier_trunk.silver', 'color', '#74859a', true, 142, '{}'),
  ('storybook_default', 'color.tier_trunk.gold', 'color', '#9f8440', true, 143, '{}'),
  ('storybook_default', 'color.tier_trunk.diamond', 'color', '#736099', true, 144, '{}'),
  ('storybook_default', 'color.milestone.progress.unlocked.bg', 'color', '#e7f8ec', true, 150, '{}'),
  ('storybook_default', 'color.milestone.progress.unlocked.border', 'color', '#b9e7c6', true, 151, '{}'),
  ('storybook_default', 'color.milestone.progress.ready.bg', 'color', '#fff7e7', true, 152, '{}'),
  ('storybook_default', 'color.milestone.progress.ready.border', 'color', '#f0d9a4', true, 153, '{}'),
  ('storybook_default', 'color.milestone.progress.locked.bg', 'color', '#ffffff', true, 154, '{}'),
  ('storybook_default', 'color.milestone.progress.locked.border', 'color', '#e2e2e2', true, 155, '{}'),
  ('storybook_default', 'color.milestone.badge.locked', 'color', '#f0f0f0', true, 156, '{}'),
  ('storybook_default', 'color.milestone.badge.bronze', 'color', '#f8dfcc', true, 157, '{}'),
  ('storybook_default', 'color.milestone.badge.silver', 'color', '#deecfb', true, 158, '{}'),
  ('storybook_default', 'color.milestone.badge.gold', 'color', '#fff1c5', true, 159, '{}'),
  ('storybook_default', 'color.milestone.badge.diamond', 'color', '#eadfff', true, 160, '{}'),
  ('storybook_default', 'color.milestone.dot.locked', 'color', '#cfcfcf', true, 161, '{}'),
  ('storybook_default', 'color.milestone.dot.ready', 'color', '#f0b34a', true, 162, '{}'),
  ('storybook_default', 'color.milestone.dot.bronze', 'color', '#d88e54', true, 163, '{}'),
  ('storybook_default', 'color.milestone.dot.silver', 'color', '#7ba3cc', true, 164, '{}'),
  ('storybook_default', 'color.milestone.dot.gold', 'color', '#d5b43c', true, 165, '{}'),
  ('storybook_default', 'color.milestone.dot.diamond', 'color', '#9a7ad6', true, 166, '{}'),
  ('storybook_default', 'color.milestone.connector.unlocked', 'color', '#8dcf9e', true, 167, '{}'),
  ('storybook_default', 'color.milestone.connector.ready', 'color', '#efc978', true, 168, '{}'),
  ('storybook_default', 'color.milestone.connector.locked', 'color', '#d8d8d8', true, 169, '{}')
on conflict (theme_key, asset_key) do update
set
  asset_type = excluded.asset_type,
  value = excluded.value,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata;

insert into public.forest_narrative_templates (theme_key, template_key, body, enabled, sort_order, metadata)
values
  ('storybook_default', 'season_empty', 'En {season} no hay flores todavia. Es buen momento para plantar una pagina nueva.', true, 10, '{}'),
  ('storybook_default', 'mood_shiny', 'Fue una etapa luminosa, con muchos dias brillantes.', true, 20, '{}'),
  ('storybook_default', 'mood_wilted', 'Fue una etapa sensible, con dias que pidieron mas cuidado.', true, 30, '{}'),
  ('storybook_default', 'mood_balanced', 'Fue una etapa equilibrada, con cuidado constante.', true, 40, '{}'),
  ('storybook_default', 'stars_high', 'La media de estrellas fue muy alta, gran capitulo.', true, 50, '{}'),
  ('storybook_default', 'stars_low', 'La media de estrellas fue baja, pero siguio habiendo avance.', true, 60, '{}'),
  ('storybook_default', 'stars_mid', 'La media de estrellas quedo estable.', true, 70, '{}'),
  ('storybook_default', 'element_line', 'Elemento dominante: {element}.', true, 80, '{}'),
  ('storybook_default', 'element_none', 'Sin elemento dominante claro.', true, 90, '{}')
on conflict (theme_key, template_key) do update
set
  body = excluded.body,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata;
