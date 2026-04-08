-- Time capsule drafts
-- Canonical persistent draft state for the annual shared capsule ritual

create table if not exists public.time_capsule_drafts (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  capsule_year integer not null check (capsule_year >= 2000),
  title text not null default '',
  window_code text not null default '1y'
    check (window_code in ('1y', '3y', '5y', '10y', 'custom')),
  content_blocks jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (garden_id, capsule_year)
);

create index if not exists idx_time_capsule_drafts_garden_id
  on public.time_capsule_drafts (garden_id);

create index if not exists idx_time_capsule_drafts_capsule_year
  on public.time_capsule_drafts (capsule_year);

alter table public.time_capsule_drafts enable row level security;

create policy "time_capsule_drafts_select_garden_member"
  on public.time_capsule_drafts for select
  using (
    garden_id in (
      select gm.garden_id
      from public.garden_members gm
      where gm.user_id = auth.uid()
    )
  );

create policy "time_capsule_drafts_insert_garden_member"
  on public.time_capsule_drafts for insert
  with check (
    garden_id in (
      select gm.garden_id
      from public.garden_members gm
      where gm.user_id = auth.uid()
    )
  );

create policy "time_capsule_drafts_update_garden_member"
  on public.time_capsule_drafts for update
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

create policy "time_capsule_drafts_delete_garden_member"
  on public.time_capsule_drafts for delete
  using (
    garden_id in (
      select gm.garden_id
      from public.garden_members gm
      where gm.user_id = auth.uid()
    )
  );
