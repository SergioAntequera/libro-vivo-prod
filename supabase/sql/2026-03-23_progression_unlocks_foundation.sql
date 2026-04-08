-- Libro Vivo - Canonical progression unlocks foundation
-- Runtime tables for unlocked progression trees and rewards.

create extension if not exists pgcrypto;

create table if not exists public.progression_condition_unlocks (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  condition_id uuid not null references public.progression_conditions(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (garden_id, condition_id)
);

create table if not exists public.progression_tree_unlocks (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  tree_id uuid not null references public.progression_tree_nodes(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  claimed_at timestamptz null,
  claimed_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (garden_id, tree_id)
);

create table if not exists public.progression_reward_unlocks (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  reward_id uuid not null references public.progression_rewards(id) on delete cascade,
  source_tree_id uuid null references public.progression_tree_nodes(id) on delete set null,
  unlocked_at timestamptz not null default now(),
  claimed_at timestamptz null,
  claimed_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (garden_id, reward_id)
);

create index if not exists idx_progression_tree_unlocks_garden_unlocked_at
  on public.progression_tree_unlocks(garden_id, unlocked_at desc);

create index if not exists idx_progression_condition_unlocks_garden_unlocked_at
  on public.progression_condition_unlocks(garden_id, unlocked_at desc);

create index if not exists idx_progression_condition_unlocks_condition
  on public.progression_condition_unlocks(condition_id);

create index if not exists idx_progression_tree_unlocks_tree
  on public.progression_tree_unlocks(tree_id);

create index if not exists idx_progression_reward_unlocks_garden_unlocked_at
  on public.progression_reward_unlocks(garden_id, unlocked_at desc);

create index if not exists idx_progression_reward_unlocks_reward
  on public.progression_reward_unlocks(reward_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_progression_condition_unlocks_touch on public.progression_condition_unlocks;
create trigger trg_progression_condition_unlocks_touch
before update on public.progression_condition_unlocks
for each row execute function public.touch_updated_at();

drop trigger if exists trg_progression_tree_unlocks_touch on public.progression_tree_unlocks;
create trigger trg_progression_tree_unlocks_touch
before update on public.progression_tree_unlocks
for each row execute function public.touch_updated_at();

drop trigger if exists trg_progression_reward_unlocks_touch on public.progression_reward_unlocks;
create trigger trg_progression_reward_unlocks_touch
before update on public.progression_reward_unlocks
for each row execute function public.touch_updated_at();

alter table public.progression_tree_unlocks enable row level security;
alter table public.progression_reward_unlocks enable row level security;
alter table public.progression_condition_unlocks enable row level security;

drop policy if exists progression_condition_unlocks_read on public.progression_condition_unlocks;
create policy progression_condition_unlocks_read on public.progression_condition_unlocks
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = progression_condition_unlocks.garden_id
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

drop policy if exists progression_condition_unlocks_write on public.progression_condition_unlocks;
create policy progression_condition_unlocks_write on public.progression_condition_unlocks
for all
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = progression_condition_unlocks.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
)
with check (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = progression_condition_unlocks.garden_id
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

drop policy if exists progression_tree_unlocks_read on public.progression_tree_unlocks;
create policy progression_tree_unlocks_read on public.progression_tree_unlocks
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = progression_tree_unlocks.garden_id
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

drop policy if exists progression_tree_unlocks_write on public.progression_tree_unlocks;
create policy progression_tree_unlocks_write on public.progression_tree_unlocks
for all
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = progression_tree_unlocks.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
)
with check (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = progression_tree_unlocks.garden_id
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

drop policy if exists progression_reward_unlocks_read on public.progression_reward_unlocks;
create policy progression_reward_unlocks_read on public.progression_reward_unlocks
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = progression_reward_unlocks.garden_id
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

drop policy if exists progression_reward_unlocks_write on public.progression_reward_unlocks;
create policy progression_reward_unlocks_write on public.progression_reward_unlocks
for all
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = progression_reward_unlocks.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
)
with check (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = progression_reward_unlocks.garden_id
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
