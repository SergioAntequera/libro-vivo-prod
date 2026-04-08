-- Libro Vivo - Canvas Config Foundation (Fase 2)
-- Execute after 2026-03-05_config_foundation.sql

create extension if not exists pgcrypto;

create table if not exists public.sticker_packs (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stickers (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  src text not null,
  category text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sticker_pack_items (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.sticker_packs(id) on delete cascade,
  sticker_id uuid not null references public.stickers(id) on delete cascade,
  sort_order int not null default 100,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pack_id, sticker_id)
);

create index if not exists idx_sticker_pack_items_pack
  on public.sticker_pack_items(pack_id);

create index if not exists idx_sticker_pack_items_enabled
  on public.sticker_pack_items(enabled);

create table if not exists public.sticker_unlock_rules (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.sticker_packs(id) on delete cascade,
  rule_type text not null default 'always'
    check (rule_type in ('always', 'achievement_rule', 'achievement_tier', 'manual')),
  rule_value text null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sticker_unlock_rules_pack
  on public.sticker_unlock_rules(pack_id);

create table if not exists public.canvas_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text null,
  enabled boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.template_objects (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.canvas_templates(id) on delete cascade,
  object_order int not null default 100,
  object_json jsonb not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_template_objects_template
  on public.template_objects(template_id);

create index if not exists idx_template_objects_enabled
  on public.template_objects(enabled);

-- updated_at trigger helper
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sticker_packs_touch on public.sticker_packs;
create trigger trg_sticker_packs_touch
before update on public.sticker_packs
for each row execute function public.touch_updated_at();

drop trigger if exists trg_stickers_touch on public.stickers;
create trigger trg_stickers_touch
before update on public.stickers
for each row execute function public.touch_updated_at();

drop trigger if exists trg_sticker_pack_items_touch on public.sticker_pack_items;
create trigger trg_sticker_pack_items_touch
before update on public.sticker_pack_items
for each row execute function public.touch_updated_at();

drop trigger if exists trg_sticker_unlock_rules_touch on public.sticker_unlock_rules;
create trigger trg_sticker_unlock_rules_touch
before update on public.sticker_unlock_rules
for each row execute function public.touch_updated_at();

drop trigger if exists trg_canvas_templates_touch on public.canvas_templates;
create trigger trg_canvas_templates_touch
before update on public.canvas_templates
for each row execute function public.touch_updated_at();

drop trigger if exists trg_template_objects_touch on public.template_objects;
create trigger trg_template_objects_touch
before update on public.template_objects
for each row execute function public.touch_updated_at();

-- RLS
alter table public.sticker_packs enable row level security;
alter table public.stickers enable row level security;
alter table public.sticker_pack_items enable row level security;
alter table public.sticker_unlock_rules enable row level security;
alter table public.canvas_templates enable row level security;
alter table public.template_objects enable row level security;

drop policy if exists sticker_packs_read on public.sticker_packs;
create policy sticker_packs_read on public.sticker_packs
for select to authenticated
using (true);

drop policy if exists stickers_read on public.stickers;
create policy stickers_read on public.stickers
for select to authenticated
using (true);

drop policy if exists sticker_pack_items_read on public.sticker_pack_items;
create policy sticker_pack_items_read on public.sticker_pack_items
for select to authenticated
using (true);

drop policy if exists sticker_unlock_rules_read on public.sticker_unlock_rules;
create policy sticker_unlock_rules_read on public.sticker_unlock_rules
for select to authenticated
using (true);

drop policy if exists canvas_templates_read on public.canvas_templates;
create policy canvas_templates_read on public.canvas_templates
for select to authenticated
using (true);

drop policy if exists template_objects_read on public.template_objects;
create policy template_objects_read on public.template_objects
for select to authenticated
using (true);

drop policy if exists sticker_packs_write on public.sticker_packs;
create policy sticker_packs_write on public.sticker_packs
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

drop policy if exists stickers_write on public.stickers;
create policy stickers_write on public.stickers
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

drop policy if exists sticker_pack_items_write on public.sticker_pack_items;
create policy sticker_pack_items_write on public.sticker_pack_items
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

drop policy if exists sticker_unlock_rules_write on public.sticker_unlock_rules;
create policy sticker_unlock_rules_write on public.sticker_unlock_rules
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

drop policy if exists canvas_templates_write on public.canvas_templates;
create policy canvas_templates_write on public.canvas_templates
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

drop policy if exists template_objects_write on public.template_objects;
create policy template_objects_write on public.template_objects
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

-- Seed packs
insert into public.sticker_packs (key, label, description, is_active)
values
  ('core', 'Core', 'Pack base de stickers del editor', true)
on conflict (key) do update
set
  label = excluded.label,
  description = excluded.description,
  is_active = excluded.is_active;

-- Seed stickers (base actual del editor)
insert into public.stickers (key, label, src, category, is_active)
values
  ('seed', 'Seed', '/stickers/sticker_seed.svg', 'nature', true),
  ('water', 'Water', '/stickers/sticker_water.svg', 'nature', true),
  ('fire', 'Fire', '/stickers/sticker_fire.svg', 'nature', true),
  ('sun', 'Sun', '/stickers/sticker_sun.svg', 'nature', true),
  ('leaf', 'Leaf', '/stickers/sticker_leaf.svg', 'nature', true),
  ('star', 'Star', '/stickers/sticker_star.svg', 'decor', true),
  ('heart', 'Heart', '/stickers/sticker_heart.svg', 'decor', true),
  ('rainbow', 'Rainbow', '/stickers/sticker_rainbow.svg', 'decor', true),
  ('washi', 'Washi', '/stickers/sticker_washi.svg', 'paper', true),
  ('stamp_done', 'Stamp Done', '/stickers/sticker_stamp_done.svg', 'stamp', true),
  ('stamp_love', 'Stamp Love', '/stickers/sticker_stamp_love.svg', 'stamp', true),
  ('cloud', 'Cloud', '/stickers/sticker_cloud.svg', 'nature', true),
  ('moon', 'Moon', '/stickers/sticker_moon.svg', 'nature', true),
  ('music', 'Music', '/stickers/sticker_music.svg', 'decor', true),
  ('qr', 'QR', '/stickers/sticker_qr.svg', 'utility', true),
  ('map', 'Map', '/stickers/sticker_map.svg', 'utility', true),
  ('calendar', 'Calendar', '/stickers/sticker_calendar.svg', 'utility', true)
on conflict (key) do update
set
  label = excluded.label,
  src = excluded.src,
  category = excluded.category,
  is_active = excluded.is_active;

-- Link core pack with all stickers
insert into public.sticker_pack_items (pack_id, sticker_id, sort_order, enabled)
select
  p.id,
  s.id,
  row_number() over (order by s.key) * 10,
  true
from public.sticker_packs p
join public.stickers s on true
where p.key = 'core'
on conflict (pack_id, sticker_id) do update
set
  sort_order = excluded.sort_order,
  enabled = excluded.enabled;

-- Unlock rules (core always enabled)
insert into public.sticker_unlock_rules (pack_id, rule_type, rule_value, enabled)
select p.id, 'always', null, true
from public.sticker_packs p
where p.key = 'core'
and not exists (
  select 1
  from public.sticker_unlock_rules r
  where r.pack_id = p.id and r.rule_type = 'always'
);

-- Seed templates
insert into public.canvas_templates (key, label, description, enabled, sort_order)
values
  ('moment', 'Momento', 'Foto + texto + QR', true, 10),
  ('date', 'Fecha especial', 'Composicion para fecha importante', true, 20)
on conflict (key) do update
set
  label = excluded.label,
  description = excluded.description,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order;

-- Reset template objects for deterministic seed
delete from public.template_objects
where template_id in (
  select id from public.canvas_templates where key in ('moment', 'date')
);

-- Template: moment
insert into public.template_objects (template_id, object_order, object_json, enabled)
select t.id, x.object_order, x.object_json::jsonb, true
from public.canvas_templates t
cross join (
  values
    (10, '{"type":"photo","x":90,"y":70,"width":340,"height":220,"rotation":0,"src":null,"caption":"Nuestro momento","washi":"top","stamp":"love","locked":false}'),
    (20, '{"type":"text","x":90,"y":310,"width":520,"fontSize":26,"rotation":0,"fill":"#1f2937","text":"Que paso hoy? (3 lineas bonitas)","locked":false}'),
    (30, '{"type":"sticker","src":"/stickers/sticker_qr.svg","x":450,"y":90,"rotation":0,"scale":1,"locked":false}')
) as x(object_order, object_json)
where t.key = 'moment';

-- Template: date
insert into public.template_objects (template_id, object_order, object_json, enabled)
select t.id, x.object_order, x.object_json::jsonb, true
from public.canvas_templates t
cross join (
  values
    (10, '{"type":"photo","x":90,"y":70,"width":340,"height":220,"rotation":0,"src":null,"caption":"Fecha especial","washi":"top","stamp":"love","locked":false}'),
    (20, '{"type":"text","x":90,"y":310,"width":520,"fontSize":26,"rotation":0,"fill":"#1f2937","text":"Titulo + mini historia + promesa para el futuro","locked":false}'),
    (30, '{"type":"sticker","src":"/stickers/sticker_qr.svg","x":450,"y":90,"rotation":0,"scale":1,"locked":false}')
) as x(object_order, object_json)
where t.key = 'date';
