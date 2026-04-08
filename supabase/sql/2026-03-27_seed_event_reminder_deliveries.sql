create table if not exists public.seed_event_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  seed_id uuid not null references public.seeds(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  reminder_kind text not null default 'seed_event_email',
  delivery_window_key text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'skipped', 'failed')),
  provider_message_id text null,
  recipient_emails text[] not null default '{}'::text[],
  seed_snapshot_hash text null,
  calendar_uid text null,
  error_message text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_seed_event_reminder_deliveries_seed_window
  on public.seed_event_reminder_deliveries (seed_id, delivery_window_key);

create index if not exists idx_seed_event_reminder_deliveries_garden_scheduled
  on public.seed_event_reminder_deliveries (garden_id, scheduled_for desc);

drop trigger if exists trg_seed_event_reminder_deliveries_touch_updated_at on public.seed_event_reminder_deliveries;
create trigger trg_seed_event_reminder_deliveries_touch_updated_at
before update on public.seed_event_reminder_deliveries
for each row execute function public.touch_updated_at();

alter table public.seed_event_reminder_deliveries enable row level security;

drop policy if exists seed_event_reminder_deliveries_read_member on public.seed_event_reminder_deliveries;
create policy seed_event_reminder_deliveries_read_member
on public.seed_event_reminder_deliveries
for select
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = seed_event_reminder_deliveries.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists seed_event_reminder_deliveries_write_member on public.seed_event_reminder_deliveries;
create policy seed_event_reminder_deliveries_write_member
on public.seed_event_reminder_deliveries
for all
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = seed_event_reminder_deliveries.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
)
with check (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = seed_event_reminder_deliveries.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);
