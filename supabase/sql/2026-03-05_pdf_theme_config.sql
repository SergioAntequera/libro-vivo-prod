-- Libro Vivo - PDF theme engine foundation (Fase 6 bootstrap)
-- Execute after 2026-03-05_config_foundation.sql

create extension if not exists pgcrypto;

create table if not exists public.pdf_themes (
  key text primary key,
  label text not null,
  description text null,
  is_active boolean not null default true,
  priority int not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pdf_theme_assets (
  id uuid primary key default gen_random_uuid(),
  theme_key text not null references public.pdf_themes(key) on delete cascade,
  asset_key text not null,
  asset_type text not null default 'token'
    check (asset_type in ('token', 'color', 'image_url', 'font', 'numeric')),
  value text not null,
  enabled boolean not null default true,
  sort_order int not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (theme_key, asset_key)
);

create table if not exists public.pdf_text_templates (
  id uuid primary key default gen_random_uuid(),
  theme_key text not null references public.pdf_themes(key) on delete cascade,
  template_key text not null,
  body text not null,
  enabled boolean not null default true,
  sort_order int not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (theme_key, template_key)
);

create table if not exists public.pdf_layout_presets (
  id uuid primary key default gen_random_uuid(),
  theme_key text not null references public.pdf_themes(key) on delete cascade,
  preset_key text not null,
  enabled boolean not null default true,
  sort_order int not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (theme_key, preset_key)
);

create index if not exists idx_pdf_theme_assets_theme on public.pdf_theme_assets(theme_key);
create index if not exists idx_pdf_text_templates_theme on public.pdf_text_templates(theme_key);
create index if not exists idx_pdf_layout_presets_theme on public.pdf_layout_presets(theme_key);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pdf_themes_touch on public.pdf_themes;
create trigger trg_pdf_themes_touch
before update on public.pdf_themes
for each row execute function public.touch_updated_at();

drop trigger if exists trg_pdf_theme_assets_touch on public.pdf_theme_assets;
create trigger trg_pdf_theme_assets_touch
before update on public.pdf_theme_assets
for each row execute function public.touch_updated_at();

drop trigger if exists trg_pdf_text_templates_touch on public.pdf_text_templates;
create trigger trg_pdf_text_templates_touch
before update on public.pdf_text_templates
for each row execute function public.touch_updated_at();

drop trigger if exists trg_pdf_layout_presets_touch on public.pdf_layout_presets;
create trigger trg_pdf_layout_presets_touch
before update on public.pdf_layout_presets
for each row execute function public.touch_updated_at();

alter table public.pdf_themes enable row level security;
alter table public.pdf_theme_assets enable row level security;
alter table public.pdf_text_templates enable row level security;
alter table public.pdf_layout_presets enable row level security;

drop policy if exists pdf_themes_read on public.pdf_themes;
create policy pdf_themes_read on public.pdf_themes
for select to authenticated
using (true);

drop policy if exists pdf_theme_assets_read on public.pdf_theme_assets;
create policy pdf_theme_assets_read on public.pdf_theme_assets
for select to authenticated
using (true);

drop policy if exists pdf_text_templates_read on public.pdf_text_templates;
create policy pdf_text_templates_read on public.pdf_text_templates
for select to authenticated
using (true);

drop policy if exists pdf_layout_presets_read on public.pdf_layout_presets;
create policy pdf_layout_presets_read on public.pdf_layout_presets
for select to authenticated
using (true);

drop policy if exists pdf_themes_write on public.pdf_themes;
create policy pdf_themes_write on public.pdf_themes
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

drop policy if exists pdf_theme_assets_write on public.pdf_theme_assets;
create policy pdf_theme_assets_write on public.pdf_theme_assets
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

drop policy if exists pdf_text_templates_write on public.pdf_text_templates;
create policy pdf_text_templates_write on public.pdf_text_templates
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

drop policy if exists pdf_layout_presets_write on public.pdf_layout_presets;
create policy pdf_layout_presets_write on public.pdf_layout_presets
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

insert into public.pdf_themes (key, label, description, is_active, priority, metadata)
values
  (
    'storybook_default',
    'Libro Clasico',
    'Tema base para export anual PDF',
    true,
    100,
    '{"font_regular":"public/fonts/Lato-Regular.ttf","font_bold":"public/fonts/Lato-Bold.ttf"}'::jsonb
  )
on conflict (key) do update
set
  label = excluded.label,
  description = excluded.description,
  is_active = excluded.is_active,
  priority = excluded.priority,
  metadata = excluded.metadata;

insert into public.pdf_theme_assets (theme_key, asset_key, asset_type, value, enabled, sort_order, metadata)
values
  ('storybook_default', 'season_label.spring', 'token', 'Primavera', true, 10, '{}'),
  ('storybook_default', 'season_label.summer', 'token', 'Verano', true, 20, '{}'),
  ('storybook_default', 'season_label.autumn', 'token', 'Otono', true, 30, '{}'),
  ('storybook_default', 'season_label.winter', 'token', 'Invierno', true, 40, '{}'),
  ('storybook_default', 'palette.spring.bg', 'color', '#f2fff5', true, 50, '{}'),
  ('storybook_default', 'palette.spring.accent', 'color', '#338c52', true, 51, '{}'),
  ('storybook_default', 'palette.spring.soft', 'color', '#e0f8e6', true, 52, '{}'),
  ('storybook_default', 'palette.summer.bg', 'color', '#fffbe6', true, 53, '{}'),
  ('storybook_default', 'palette.summer.accent', 'color', '#b6821f', true, 54, '{}'),
  ('storybook_default', 'palette.summer.soft', 'color', '#f9efbf', true, 55, '{}'),
  ('storybook_default', 'palette.autumn.bg', 'color', '#fff2e8', true, 56, '{}'),
  ('storybook_default', 'palette.autumn.accent', 'color', '#9e5726', true, 57, '{}'),
  ('storybook_default', 'palette.autumn.soft', 'color', '#f8ddcc', true, 58, '{}'),
  ('storybook_default', 'palette.winter.bg', 'color', '#edf5ff', true, 59, '{}'),
  ('storybook_default', 'palette.winter.accent', 'color', '#3f6396', true, 60, '{}'),
  ('storybook_default', 'palette.winter.soft', 'color', '#dae8fb', true, 61, '{}'),
  ('storybook_default', 'ornament.frame.color', 'color', '#e6effc', true, 70, '{}'),
  ('storybook_default', 'ornament.annual.flower_primary.petal', 'color', '#ffdea3', true, 71, '{}'),
  ('storybook_default', 'ornament.annual.flower_primary.center', 'color', '#f9b244', true, 72, '{}'),
  ('storybook_default', 'ornament.annual.flower_secondary.petal', 'color', '#d4eaff', true, 73, '{}'),
  ('storybook_default', 'ornament.annual.flower_secondary.center', 'color', '#72aedf', true, 74, '{}'),
  ('storybook_default', 'ornament.annual.sprout.leaf', 'color', '#abdfb8', true, 75, '{}'),
  ('storybook_default', 'ornament.annual.sprout.stem', 'color', '#4f9562', true, 76, '{}'),
  ('storybook_default', 'ornament.annual.spark', 'color', '#a8bbdb', true, 77, '{}'),
  ('storybook_default', 'ornament.season.spring.primary', 'color', '#dcf4d9', true, 80, '{}'),
  ('storybook_default', 'ornament.season.spring.secondary', 'color', '#efe0ff', true, 81, '{}'),
  ('storybook_default', 'ornament.season.spring.spark', 'color', '#9b87cf', true, 82, '{}'),
  ('storybook_default', 'ornament.season.spring.leaf', 'color', '#dcf4d9', true, 83, '{}'),
  ('storybook_default', 'ornament.season.spring.stem', 'color', '#4d945f', true, 84, '{}'),
  ('storybook_default', 'ornament.season.summer.primary', 'color', '#ffe8b8', true, 90, '{}'),
  ('storybook_default', 'ornament.season.summer.secondary', 'color', '#dba940', true, 91, '{}'),
  ('storybook_default', 'ornament.season.summer.spark', 'color', '#dba940', true, 92, '{}'),
  ('storybook_default', 'ornament.season.summer.leaf', 'color', '#ffe8b8', true, 93, '{}'),
  ('storybook_default', 'ornament.season.summer.stem', 'color', '#b97f2a', true, 94, '{}'),
  ('storybook_default', 'ornament.season.autumn.primary', 'color', '#ffd7b3', true, 100, '{}'),
  ('storybook_default', 'ornament.season.autumn.secondary', 'color', '#cf7e48', true, 101, '{}'),
  ('storybook_default', 'ornament.season.autumn.spark', 'color', '#b8673b', true, 102, '{}'),
  ('storybook_default', 'ornament.season.autumn.leaf', 'color', '#e9c28f', true, 103, '{}'),
  ('storybook_default', 'ornament.season.autumn.stem', 'color', '#915332', true, 104, '{}'),
  ('storybook_default', 'ornament.season.winter.primary', 'color', '#dcecff', true, 110, '{}'),
  ('storybook_default', 'ornament.season.winter.secondary', 'color', '#7ca7df', true, 111, '{}'),
  ('storybook_default', 'ornament.season.winter.spark', 'color', '#6d98d8', true, 112, '{}'),
  ('storybook_default', 'ornament.season.winter.leaf', 'color', '#dcecff', true, 113, '{}'),
  ('storybook_default', 'ornament.season.winter.stem', 'color', '#4e6ca0', true, 114, '{}'),
  ('storybook_default', 'ornament.season.winter.line', 'color', '#7ea3d8', true, 115, '{}')
on conflict (theme_key, asset_key) do update
set
  asset_type = excluded.asset_type,
  value = excluded.value,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata;

insert into public.pdf_text_templates (theme_key, template_key, body, enabled, sort_order, metadata)
values
  ('storybook_default', 'annual_title', 'Portada anual', true, 10, '{}'),
  ('storybook_default', 'cover_main_title', 'Libro Vivo - {year}', true, 15, '{}'),
  ('storybook_default', 'season_chapter_title', 'Capitulo de {season}', true, 20, '{}'),
  ('storybook_default', 'notes_title', 'Notas', true, 30, '{}'),
  ('storybook_default', 'empty_note', '- Sin notas en esta pagina', true, 40, '{}'),
  ('storybook_default', 'page_notes_header', '{title} - Notas ({index})', true, 45, '{}'),
  ('storybook_default', 'notes_continuation_title', 'Notas (continuacion {index})', true, 50, '{}'),
  ('storybook_default', 'footer_brand', 'Libro Vivo {year}', true, 60, '{}'),
  ('storybook_default', 'footer_page_counter', '{page}/{total}', true, 61, '{}'),
  ('storybook_default', 'qr_year_label', 'Abrir ano', true, 62, '{}'),
  ('storybook_default', 'qr_page_label', 'Abrir pagina', true, 63, '{}'),
  ('storybook_default', 'stats_total_pages', 'Paginas', true, 70, '{}'),
  ('storybook_default', 'stats_shiny', 'Brillantes', true, 71, '{}'),
  ('storybook_default', 'stats_healthy', 'Sanas', true, 72, '{}'),
  ('storybook_default', 'stats_avg_stars', 'Media estrellas', true, 73, '{}'),
  ('storybook_default', 'chapter_stats_pages', 'Paginas: {count}', true, 80, '{}'),
  ('storybook_default', 'chapter_stats_shiny', 'Brillantes: {count}', true, 81, '{}'),
  ('storybook_default', 'chapter_stats_avg_stars', 'Media estrellas: {value}', true, 82, '{}'),
  ('storybook_default', 'season_card_pages', 'Paginas {count}', true, 90, '{}'),
  ('storybook_default', 'season_card_shiny', 'Brillantes {count}', true, 91, '{}'),
  ('storybook_default', 'annual_cover_missing', 'Sin portada anual', true, 92, '{}'),
  ('storybook_default', 'year_phrase_title', 'Frase del ano', true, 93, '{}'),
  ('storybook_default', 'year_phrase_empty', 'Ano sin frase guardada.', true, 94, '{}'),
  ('storybook_default', 'season_chapter_note_fallback', 'Capitulo {season} con {count} paginas.', true, 95, '{}'),
  ('storybook_default', 'season_note_title', 'Nota de temporada', true, 96, '{}'),
  ('storybook_default', 'top_moments_title', 'Top momentos', true, 97, '{}'),
  ('storybook_default', 'top_moments_empty', 'Sin paginas destacadas', true, 98, '{}'),
  ('storybook_default', 'chapter_start_label', 'Inicio del capitulo', true, 99, '{}'),
  ('storybook_default', 'page_cover_missing', 'Sin portada para esta pagina', true, 100, '{}')
on conflict (theme_key, template_key) do update
set
  body = excluded.body,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata;

insert into public.pdf_layout_presets (theme_key, preset_key, enabled, sort_order, metadata)
values
  (
    'storybook_default',
    'chapter_page',
    true,
    10,
    '{"header_height":138,"continuation_header_height":132}'::jsonb
  )
on conflict (theme_key, preset_key) do update
set
  enabled = excluded.enabled,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata;
