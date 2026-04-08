-- Annual tree milestone check-ins
-- Canonical persistence for anniversary reminders (1,3,5,7,10 years)

create table if not exists public.annual_tree_check_ins (
  id uuid primary key default gen_random_uuid(),
  ritual_id uuid not null references public.annual_tree_rituals(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  milestone_year integer not null check (milestone_year in (1, 3, 5, 7, 10)),
  observed_at timestamptz not null default now(),
  status text not null default 'growing'
    check (status in ('growing', 'stable', 'delicate', 'lost', 'dead', 'replanted')),
  location_lat double precision,
  location_lng double precision,
  location_label text,
  notes text,
  photo_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_annual_tree_check_ins_unique_milestone
  on public.annual_tree_check_ins (ritual_id, milestone_year);

create index if not exists idx_annual_tree_check_ins_garden_id
  on public.annual_tree_check_ins (garden_id);

alter table public.annual_tree_check_ins enable row level security;

create policy "annual_tree_check_ins_select_garden_member"
  on public.annual_tree_check_ins for select
  using (
    garden_id in (
      select gm.garden_id
      from public.garden_members gm
      where gm.user_id = auth.uid()
    )
  );

create policy "annual_tree_check_ins_insert_garden_member"
  on public.annual_tree_check_ins for insert
  with check (
    garden_id in (
      select gm.garden_id
      from public.garden_members gm
      where gm.user_id = auth.uid()
    )
  );

create policy "annual_tree_check_ins_update_garden_member"
  on public.annual_tree_check_ins for update
  using (
    garden_id in (
      select gm.garden_id
      from public.garden_members gm
      where gm.user_id = auth.uid()
    )
  )
  with check (
    garden_id in (
      select gm.garden_id
      from public.garden_members gm
      where gm.user_id = auth.uid()
    )
  );
