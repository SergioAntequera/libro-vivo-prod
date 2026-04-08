-- Libro Vivo - Seeds + Calendar Workflow Engine (Fase 4)
-- Execute after 2026-03-05_config_foundation.sql

create extension if not exists pgcrypto;

create table if not exists public.seed_defaults (
  key text primary key,
  default_seed_status text not null default 'seed',
  scheduled_status text not null default 'scheduled',
  bloomed_status text not null default 'bloomed',
  fallback_element text not null default 'earth',
  default_mood_state text not null default 'healthy',
  default_canvas_objects jsonb not null default '[]'::jsonb,
  auto_open_created_page boolean not null default true,
  create_page_on_bloom boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_rules (
  key text primary key,
  allow_past_schedule boolean not null default true,
  max_seeds_per_day int not null default 0
    check (max_seeds_per_day >= 0 and max_seeds_per_day <= 1000),
  bloom_only_scheduled boolean not null default true,
  show_unscheduled_in_calendar boolean not null default false,
  days_ahead_limit int not null default 0
    check (days_ahead_limit >= 0 and days_ahead_limit <= 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seed_status_flow (
  id uuid primary key default gen_random_uuid(),
  from_status text not null,
  to_status text not null,
  action_key text not null default 'manual',
  requires_scheduled_date boolean not null default false,
  clear_scheduled_date boolean not null default false,
  create_page_on_transition boolean not null default false,
  enabled boolean not null default true,
  sort_order int not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (from_status, to_status, action_key)
);

create index if not exists idx_seed_status_flow_enabled_sort
  on public.seed_status_flow(enabled, sort_order);

create index if not exists idx_seed_status_flow_from_to
  on public.seed_status_flow(from_status, to_status);

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

drop trigger if exists trg_seed_defaults_touch on public.seed_defaults;
create trigger trg_seed_defaults_touch
before update on public.seed_defaults
for each row execute function public.touch_updated_at();

drop trigger if exists trg_calendar_rules_touch on public.calendar_rules;
create trigger trg_calendar_rules_touch
before update on public.calendar_rules
for each row execute function public.touch_updated_at();

drop trigger if exists trg_seed_status_flow_touch on public.seed_status_flow;
create trigger trg_seed_status_flow_touch
before update on public.seed_status_flow
for each row execute function public.touch_updated_at();

-- RLS
alter table public.seed_defaults enable row level security;
alter table public.calendar_rules enable row level security;
alter table public.seed_status_flow enable row level security;

drop policy if exists seed_defaults_read on public.seed_defaults;
create policy seed_defaults_read on public.seed_defaults
for select to authenticated
using (true);

drop policy if exists calendar_rules_read on public.calendar_rules;
create policy calendar_rules_read on public.calendar_rules
for select to authenticated
using (true);

drop policy if exists seed_status_flow_read on public.seed_status_flow;
create policy seed_status_flow_read on public.seed_status_flow
for select to authenticated
using (true);

drop policy if exists seed_defaults_write on public.seed_defaults;
create policy seed_defaults_write on public.seed_defaults
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

drop policy if exists calendar_rules_write on public.calendar_rules;
create policy calendar_rules_write on public.calendar_rules
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

drop policy if exists seed_status_flow_write on public.seed_status_flow;
create policy seed_status_flow_write on public.seed_status_flow
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

-- Seed defaults singleton
insert into public.seed_defaults (
  key,
  default_seed_status,
  scheduled_status,
  bloomed_status,
  fallback_element,
  default_mood_state,
  default_canvas_objects,
  auto_open_created_page,
  create_page_on_bloom
)
values (
  'default',
  'seed',
  'scheduled',
  'bloomed',
  'earth',
  'healthy',
  '[]'::jsonb,
  true,
  true
)
on conflict (key) do update
set
  default_seed_status = excluded.default_seed_status,
  scheduled_status = excluded.scheduled_status,
  bloomed_status = excluded.bloomed_status,
  fallback_element = excluded.fallback_element,
  default_mood_state = excluded.default_mood_state,
  default_canvas_objects = excluded.default_canvas_objects,
  auto_open_created_page = excluded.auto_open_created_page,
  create_page_on_bloom = excluded.create_page_on_bloom;

insert into public.calendar_rules (
  key,
  allow_past_schedule,
  max_seeds_per_day,
  bloom_only_scheduled,
  show_unscheduled_in_calendar,
  days_ahead_limit
)
values (
  'default',
  true,
  0,
  true,
  false,
  0
)
on conflict (key) do update
set
  allow_past_schedule = excluded.allow_past_schedule,
  max_seeds_per_day = excluded.max_seeds_per_day,
  bloom_only_scheduled = excluded.bloom_only_scheduled,
  show_unscheduled_in_calendar = excluded.show_unscheduled_in_calendar,
  days_ahead_limit = excluded.days_ahead_limit;

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
    'seed',
    'scheduled',
    'schedule',
    true,
    false,
    false,
    true,
    10,
    '{"label":"Programar semilla"}'::jsonb
  ),
  (
    'scheduled',
    'seed',
    'unschedule',
    false,
    true,
    false,
    true,
    20,
    '{"label":"Quitar fecha"}'::jsonb
  ),
  (
    'scheduled',
    'bloomed',
    'bloom',
    true,
    false,
    true,
    true,
    30,
    '{"label":"Florecer semilla","scheduled_date_must_be_today_or_past":true,"custom_error":"No podeis florecer una semilla futura antes de vivirla."}'::jsonb
  )
on conflict (from_status, to_status, action_key) do update
set
  requires_scheduled_date = excluded.requires_scheduled_date,
  clear_scheduled_date = excluded.clear_scheduled_date,
  create_page_on_transition = excluded.create_page_on_transition,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata;
