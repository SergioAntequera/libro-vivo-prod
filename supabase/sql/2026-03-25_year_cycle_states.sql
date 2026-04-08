-- Year cycle states
-- Canonical synchronized close/open state for annual chapters.

create table if not exists public.year_cycle_states (
  garden_id uuid not null references public.gardens(id) on delete cascade,
  year integer not null check (year >= 2000),
  closed_at timestamptz,
  closed_by_user_id uuid references public.profiles(id) on delete set null,
  acknowledged_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (garden_id, year)
);

create index if not exists idx_year_cycle_states_garden_year
  on public.year_cycle_states (garden_id, year desc);

drop trigger if exists trg_year_cycle_states_touch_updated_at on public.year_cycle_states;
create trigger trg_year_cycle_states_touch_updated_at
before update on public.year_cycle_states
for each row execute function public.touch_updated_at();

alter table public.year_cycle_states enable row level security;

drop policy if exists year_cycle_states_read_member on public.year_cycle_states;
create policy year_cycle_states_read_member on public.year_cycle_states
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = year_cycle_states.garden_id
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

drop policy if exists year_cycle_states_insert_member on public.year_cycle_states;
create policy year_cycle_states_insert_member on public.year_cycle_states
for insert
to authenticated
with check (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = year_cycle_states.garden_id
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

drop policy if exists year_cycle_states_update_member on public.year_cycle_states;
create policy year_cycle_states_update_member on public.year_cycle_states
for update
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = year_cycle_states.garden_id
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
    where gm.garden_id = year_cycle_states.garden_id
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
