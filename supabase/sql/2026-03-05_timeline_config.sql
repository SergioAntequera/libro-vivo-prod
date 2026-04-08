-- Libro Vivo - Timeline Config Foundation (Fase 3)
-- Execute after 2026-03-05_config_foundation.sql

create extension if not exists pgcrypto;

create table if not exists public.timeline_view_config (
  key text primary key,
  default_view text not null default 'path'
    check (default_view in ('path', 'album')),
  milestone_mode text not null default 'every'
    check (milestone_mode in ('every', 'rules', 'hybrid')),
  milestone_every int not null default 10
    check (milestone_every > 0 and milestone_every <= 500),
  milestone_choices int[] not null default array[5,10,15],
  milestone_message text not null default 'Habeis llegado a un numero redondo. Este tramo del sendero ya tiene historia propia.',
  season_hemisphere text not null default 'north'
    check (season_hemisphere in ('north', 'south')),
  spring_start_mmdd int not null default 321,
  summer_start_mmdd int not null default 621,
  autumn_start_mmdd int not null default 923,
  winter_start_mmdd int not null default 1221,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.timeline_milestone_rules (
  id uuid primary key default gen_random_uuid(),
  milestone_number int not null
    check (milestone_number > 0 and milestone_number <= 5000),
  title text not null,
  message text not null,
  icon text null,
  accent_color text null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (milestone_number)
);

create index if not exists idx_timeline_milestone_rules_enabled
  on public.timeline_milestone_rules(enabled);

create index if not exists idx_timeline_milestone_rules_number
  on public.timeline_milestone_rules(milestone_number);

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_timeline_view_config_touch on public.timeline_view_config;
create trigger trg_timeline_view_config_touch
before update on public.timeline_view_config
for each row execute function public.touch_updated_at();

drop trigger if exists trg_timeline_milestone_rules_touch on public.timeline_milestone_rules;
create trigger trg_timeline_milestone_rules_touch
before update on public.timeline_milestone_rules
for each row execute function public.touch_updated_at();

-- RLS
alter table public.timeline_view_config enable row level security;
alter table public.timeline_milestone_rules enable row level security;

drop policy if exists timeline_view_config_read on public.timeline_view_config;
create policy timeline_view_config_read on public.timeline_view_config
for select to authenticated
using (true);

drop policy if exists timeline_milestone_rules_read on public.timeline_milestone_rules;
create policy timeline_milestone_rules_read on public.timeline_milestone_rules
for select to authenticated
using (true);

drop policy if exists timeline_view_config_write on public.timeline_view_config;
create policy timeline_view_config_write on public.timeline_view_config
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

drop policy if exists timeline_milestone_rules_write on public.timeline_milestone_rules;
create policy timeline_milestone_rules_write on public.timeline_milestone_rules
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

-- Seed singleton config
insert into public.timeline_view_config (
  key,
  default_view,
  milestone_mode,
  milestone_every,
  milestone_choices,
  milestone_message,
  season_hemisphere,
  spring_start_mmdd,
  summer_start_mmdd,
  autumn_start_mmdd,
  winter_start_mmdd,
  is_active
)
values (
  'default',
  'path',
  'every',
  10,
  array[5,10,15],
  'Habeis llegado a un numero redondo. Este tramo del sendero ya tiene historia propia.',
  'north',
  321,
  621,
  923,
  1221,
  true
)
on conflict (key) do update
set
  default_view = excluded.default_view,
  milestone_mode = excluded.milestone_mode,
  milestone_every = excluded.milestone_every,
  milestone_choices = excluded.milestone_choices,
  milestone_message = excluded.milestone_message,
  season_hemisphere = excluded.season_hemisphere,
  spring_start_mmdd = excluded.spring_start_mmdd,
  summer_start_mmdd = excluded.summer_start_mmdd,
  autumn_start_mmdd = excluded.autumn_start_mmdd,
  winter_start_mmdd = excluded.winter_start_mmdd,
  is_active = excluded.is_active;

-- Seed baseline milestone rules
insert into public.timeline_milestone_rules (
  milestone_number,
  title,
  message,
  icon,
  accent_color,
  enabled
)
values
  (5, 'Milestone #5', 'Primer tramo importante completado.', 'trophy', '#fff7e6', true),
  (10, 'Milestone #10', 'Seguis acumulando recuerdos con fuerza.', 'trophy', '#fff7e6', true),
  (15, 'Milestone #15', 'Un nuevo nivel de historia compartida.', 'trophy', '#fff7e6', true)
on conflict (milestone_number) do update
set
  title = excluded.title,
  message = excluded.message,
  icon = excluded.icon,
  accent_color = excluded.accent_color,
  enabled = excluded.enabled;
