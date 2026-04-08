-- Time capsule draft revisions
-- Canonical revision log for the annual shared capsule draft

create table if not exists public.time_capsule_draft_revisions (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.time_capsule_drafts(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  capsule_year integer not null check (capsule_year >= 2000),
  snapshot jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id),
  actor_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_time_capsule_draft_revisions_draft_id
  on public.time_capsule_draft_revisions (draft_id, created_at desc);

create index if not exists idx_time_capsule_draft_revisions_garden_id
  on public.time_capsule_draft_revisions (garden_id, created_at desc);

create index if not exists idx_time_capsule_draft_revisions_capsule_year
  on public.time_capsule_draft_revisions (capsule_year, created_at desc);

alter table public.time_capsule_draft_revisions enable row level security;

create policy "time_capsule_draft_revisions_select_garden_member"
  on public.time_capsule_draft_revisions for select
  using (
    garden_id in (
      select gm.garden_id
      from public.garden_members gm
      where gm.user_id = auth.uid()
    )
  );

create policy "time_capsule_draft_revisions_insert_garden_member"
  on public.time_capsule_draft_revisions for insert
  with check (
    garden_id in (
      select gm.garden_id
      from public.garden_members gm
      where gm.user_id = auth.uid()
    )
  );
