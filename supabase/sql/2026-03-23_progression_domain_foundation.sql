-- Libro Vivo - Canonical progression domain foundation
-- Creates dedicated tables for trees, conditions and rewards used by /admin/progression.

create extension if not exists pgcrypto;

create table if not exists public.progression_tree_nodes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null default '',
  preset_id text null,
  asset_key text null,
  accent_color text null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.progression_conditions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null default '',
  template_id text null,
  narrative_seed text null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.progression_rewards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null
    check (
      kind in (
        'message',
        'gift',
        'sticker_pack',
        'canvas_tool',
        'canvas_template',
        'canvas_effect',
        'page_frame',
        'page_background',
        'year_chapter',
        'pdf_detail'
      )
    ),
  title text not null,
  description text not null default '',
  preset_id text null,
  reference_key text null,
  payload jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_progression_tree_nodes_enabled
  on public.progression_tree_nodes(enabled);

create index if not exists idx_progression_conditions_enabled
  on public.progression_conditions(enabled);

create index if not exists idx_progression_rewards_enabled
  on public.progression_rewards(enabled);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_progression_tree_nodes_touch on public.progression_tree_nodes;
create trigger trg_progression_tree_nodes_touch
before update on public.progression_tree_nodes
for each row execute function public.touch_updated_at();

drop trigger if exists trg_progression_conditions_touch on public.progression_conditions;
create trigger trg_progression_conditions_touch
before update on public.progression_conditions
for each row execute function public.touch_updated_at();

drop trigger if exists trg_progression_rewards_touch on public.progression_rewards;
create trigger trg_progression_rewards_touch
before update on public.progression_rewards
for each row execute function public.touch_updated_at();

alter table public.progression_tree_nodes enable row level security;
alter table public.progression_conditions enable row level security;
alter table public.progression_rewards enable row level security;

drop policy if exists progression_tree_nodes_read on public.progression_tree_nodes;
create policy progression_tree_nodes_read on public.progression_tree_nodes
for select to authenticated
using (true);

drop policy if exists progression_conditions_read on public.progression_conditions;
create policy progression_conditions_read on public.progression_conditions
for select to authenticated
using (true);

drop policy if exists progression_rewards_read on public.progression_rewards;
create policy progression_rewards_read on public.progression_rewards
for select to authenticated
using (true);

drop policy if exists progression_tree_nodes_write on public.progression_tree_nodes;
create policy progression_tree_nodes_write on public.progression_tree_nodes
for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

drop policy if exists progression_conditions_write on public.progression_conditions;
create policy progression_conditions_write on public.progression_conditions
for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

drop policy if exists progression_rewards_write on public.progression_rewards;
create policy progression_rewards_write on public.progression_rewards
for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

-- Backfill trees from legacy timeline milestones when present.
insert into public.progression_tree_nodes (
  id,
  code,
  title,
  description,
  asset_key,
  accent_color,
  enabled,
  created_at,
  updated_at
)
select
  t.id,
  'legacy_tree_' || lpad(t.milestone_number::text, 3, '0'),
  t.title,
  t.message,
  coalesce(t.icon, 'tree'),
  t.accent_color,
  t.enabled,
  coalesce(t.created_at, now()),
  coalesce(t.created_at, now())
from public.timeline_milestone_rules t
where to_regclass('public.timeline_milestone_rules') is not null
on conflict (id) do update
set
  code = excluded.code,
  title = excluded.title,
  description = excluded.description,
  asset_key = excluded.asset_key,
  accent_color = excluded.accent_color,
  enabled = excluded.enabled,
  updated_at = excluded.updated_at;

-- Backfill conditions from legacy achievement rules when present.
insert into public.progression_conditions (
  id,
  code,
  title,
  description,
  template_id,
  narrative_seed,
  enabled,
  created_at,
  updated_at
)
select
  a.id,
  'legacy_condition_' || a.kind || '_' || a.threshold::text,
  a.title,
  coalesce(a.description, ''),
  null,
  'Migrada desde achievement_rules',
  true,
  coalesce(a.created_at, now()),
  coalesce(a.created_at, now())
from public.achievement_rules a
where to_regclass('public.achievement_rules') is not null
on conflict (id) do update
set
  code = excluded.code,
  title = excluded.title,
  description = excluded.description,
  updated_at = excluded.updated_at;

-- Backfill rewards from legacy rewards when present.
insert into public.progression_rewards (
  id,
  code,
  kind,
  title,
  description,
  reference_key,
  payload,
  enabled,
  created_at,
  updated_at
)
select
  r.id,
  'legacy_reward_' || regexp_replace(lower(r.title), '[^a-z0-9]+', '_', 'g'),
  case
    when r.kind in ('message','gift','sticker_pack') then r.kind
    else 'message'
  end,
  r.title,
  case
    when r.kind = 'message' then coalesce(r.payload ->> 'text', r.title)
    when r.kind = 'gift' then coalesce(r.payload ->> 'description', r.title)
    when r.kind = 'sticker_pack' then coalesce(r.payload ->> 'packName', r.title)
    else r.title
  end,
  null,
  coalesce(r.payload, '{}'::jsonb),
  true,
  coalesce(r.created_at, now()),
  coalesce(r.created_at, now())
from public.rewards r
where to_regclass('public.rewards') is not null
on conflict (id) do update
set
  code = excluded.code,
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  payload = excluded.payload,
  updated_at = excluded.updated_at;
