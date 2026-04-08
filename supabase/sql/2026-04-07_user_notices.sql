create table if not exists public.user_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('shared_garden_archived')),
  garden_id uuid null references public.gardens(id) on delete set null,
  title text not null,
  message text not null,
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_user_notices_user_created
  on public.user_notices (user_id, created_at desc);

create index if not exists idx_user_notices_user_unread
  on public.user_notices (user_id, read_at, created_at desc);

alter table if exists public.user_notices enable row level security;

drop policy if exists user_notices_read_self on public.user_notices;
create policy user_notices_read_self on public.user_notices
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists user_notices_update_self on public.user_notices;
create policy user_notices_update_self on public.user_notices
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

