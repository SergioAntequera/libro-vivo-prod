-- Garden chat foundation
-- Canonical persistent domain for garden chat, unread state and live audio session summaries.

create table if not exists public.garden_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  slug text not null check (char_length(trim(slug)) > 0),
  title text not null default 'Chat',
  room_kind text not null default 'main'
    check (room_kind in ('main', 'topic', 'system')),
  sort_order integer not null default 0,
  archived_at timestamptz null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (garden_id, slug)
);

create unique index if not exists idx_garden_chat_rooms_one_main_per_garden
  on public.garden_chat_rooms (garden_id)
  where room_kind = 'main' and archived_at is null;

create index if not exists idx_garden_chat_rooms_garden_id
  on public.garden_chat_rooms (garden_id, sort_order, created_at desc);

drop trigger if exists trg_garden_chat_rooms_touch_updated_at on public.garden_chat_rooms;
create trigger trg_garden_chat_rooms_touch_updated_at
before update on public.garden_chat_rooms
for each row execute function public.touch_updated_at();

create table if not exists public.garden_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.garden_chat_rooms(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete restrict,
  client_message_id text not null default gen_random_uuid()::text,
  kind text not null
    check (kind in ('text', 'voice_note', 'attachment', 'reference', 'system', 'audio_session_event')),
  body_text text null,
  reply_to_message_id uuid null references public.garden_chat_messages(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  edited_at timestamptz null,
  deleted_at timestamptz null,
  deleted_by_user_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (room_id, author_user_id, client_message_id)
);

create index if not exists idx_garden_chat_messages_room_id
  on public.garden_chat_messages (room_id, created_at desc);

create index if not exists idx_garden_chat_messages_garden_id
  on public.garden_chat_messages (garden_id, created_at desc);

create index if not exists idx_garden_chat_messages_reply_to
  on public.garden_chat_messages (reply_to_message_id);

drop trigger if exists trg_garden_chat_messages_touch_updated_at on public.garden_chat_messages;
create trigger trg_garden_chat_messages_touch_updated_at
before update on public.garden_chat_messages
for each row execute function public.touch_updated_at();

create table if not exists public.garden_chat_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.garden_chat_messages(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  uploaded_by_user_id uuid null references public.profiles(id) on delete set null,
  storage_bucket text not null,
  storage_path text not null,
  attachment_kind text not null
    check (attachment_kind in ('image', 'audio', 'video', 'file')),
  mime_type text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  duration_ms integer null check (duration_ms is null or duration_ms >= 0),
  waveform_json jsonb null,
  preview_text text null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_garden_chat_message_attachments_message_id
  on public.garden_chat_message_attachments (message_id, created_at asc);

create index if not exists idx_garden_chat_message_attachments_garden_id
  on public.garden_chat_message_attachments (garden_id, created_at desc);

create table if not exists public.garden_chat_read_states (
  room_id uuid not null references public.garden_chat_rooms(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_message_id uuid null references public.garden_chat_messages(id) on delete set null,
  last_read_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (room_id, user_id)
);

create index if not exists idx_garden_chat_read_states_garden_user
  on public.garden_chat_read_states (garden_id, user_id, updated_at desc);

drop trigger if exists trg_garden_chat_read_states_touch_updated_at on public.garden_chat_read_states;
create trigger trg_garden_chat_read_states_touch_updated_at
before update on public.garden_chat_read_states
for each row execute function public.touch_updated_at();

create table if not exists public.garden_audio_sessions (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  room_id uuid null references public.garden_chat_rooms(id) on delete set null,
  started_by_user_id uuid not null references public.profiles(id) on delete restrict,
  provider text not null default 'livekit',
  provider_room_name text not null,
  status text not null
    check (status in ('invited', 'active', 'ended', 'missed', 'cancelled', 'failed')),
  started_at timestamptz not null default timezone('utc', now()),
  joined_at timestamptz null,
  ended_at timestamptz null,
  ended_reason text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_garden_audio_sessions_garden_status
  on public.garden_audio_sessions (garden_id, status, started_at desc);

create index if not exists idx_garden_audio_sessions_room_id
  on public.garden_audio_sessions (room_id, started_at desc);

drop trigger if exists trg_garden_audio_sessions_touch_updated_at on public.garden_audio_sessions;
create trigger trg_garden_audio_sessions_touch_updated_at
before update on public.garden_audio_sessions
for each row execute function public.touch_updated_at();

create table if not exists public.garden_audio_session_participants (
  session_id uuid not null references public.garden_audio_sessions(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'guest' check (role in ('host', 'guest')),
  invited_at timestamptz null,
  joined_at timestamptz null,
  left_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (session_id, user_id)
);

create index if not exists idx_garden_audio_session_participants_garden_user
  on public.garden_audio_session_participants (garden_id, user_id, updated_at desc);

drop trigger if exists trg_garden_audio_session_participants_touch_updated_at on public.garden_audio_session_participants;
create trigger trg_garden_audio_session_participants_touch_updated_at
before update on public.garden_audio_session_participants
for each row execute function public.touch_updated_at();

create or replace function public.garden_chat_messages_sync_garden_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_garden_id uuid;
  v_reply_room_id uuid;
begin
  select r.garden_id
  into v_room_garden_id
  from public.garden_chat_rooms r
  where r.id = new.room_id;

  if v_room_garden_id is null then
    raise exception using
      errcode = '23514',
      message = 'La sala indicada no existe o no tiene garden_id.';
  end if;

  if new.garden_id is null then
    new.garden_id = v_room_garden_id;
  elsif new.garden_id <> v_room_garden_id then
    raise exception using
      errcode = '23514',
      message = 'garden_id del mensaje no coincide con la sala.';
  end if;

  if new.reply_to_message_id is not null then
    select m.room_id
    into v_reply_room_id
    from public.garden_chat_messages m
    where m.id = new.reply_to_message_id;

    if v_reply_room_id is null or v_reply_room_id <> new.room_id then
      raise exception using
        errcode = '23514',
        message = 'El mensaje respondido debe pertenecer a la misma sala.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_garden_chat_messages_sync_garden on public.garden_chat_messages;
create trigger trg_garden_chat_messages_sync_garden
before insert or update on public.garden_chat_messages
for each row execute function public.garden_chat_messages_sync_garden_id();

create or replace function public.garden_chat_attachments_sync_garden_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_garden_id uuid;
begin
  select m.garden_id
  into v_message_garden_id
  from public.garden_chat_messages m
  where m.id = new.message_id;

  if v_message_garden_id is null then
    raise exception using
      errcode = '23514',
      message = 'El mensaje indicado no existe o no tiene garden_id.';
  end if;

  if new.garden_id is null then
    new.garden_id = v_message_garden_id;
  elsif new.garden_id <> v_message_garden_id then
    raise exception using
      errcode = '23514',
      message = 'garden_id del adjunto no coincide con el mensaje.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_garden_chat_attachments_sync_garden on public.garden_chat_message_attachments;
create trigger trg_garden_chat_attachments_sync_garden
before insert or update on public.garden_chat_message_attachments
for each row execute function public.garden_chat_attachments_sync_garden_id();

create or replace function public.garden_chat_read_states_sync_garden_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_garden_id uuid;
  v_message_room_id uuid;
begin
  select r.garden_id
  into v_room_garden_id
  from public.garden_chat_rooms r
  where r.id = new.room_id;

  if v_room_garden_id is null then
    raise exception using
      errcode = '23514',
      message = 'La sala de lectura no existe o no tiene garden_id.';
  end if;

  if new.garden_id is null then
    new.garden_id = v_room_garden_id;
  elsif new.garden_id <> v_room_garden_id then
    raise exception using
      errcode = '23514',
      message = 'garden_id del cursor de lectura no coincide con la sala.';
  end if;

  if new.last_read_message_id is not null then
    select m.room_id
    into v_message_room_id
    from public.garden_chat_messages m
    where m.id = new.last_read_message_id;

    if v_message_room_id is null or v_message_room_id <> new.room_id then
      raise exception using
        errcode = '23514',
        message = 'El ultimo mensaje leido debe pertenecer a la misma sala.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_garden_chat_read_states_sync_garden on public.garden_chat_read_states;
create trigger trg_garden_chat_read_states_sync_garden
before insert or update on public.garden_chat_read_states
for each row execute function public.garden_chat_read_states_sync_garden_id();

create or replace function public.garden_audio_sessions_sync_garden_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_garden_id uuid;
begin
  if new.room_id is null then
    return new;
  end if;

  select r.garden_id
  into v_room_garden_id
  from public.garden_chat_rooms r
  where r.id = new.room_id;

  if v_room_garden_id is null then
    raise exception using
      errcode = '23514',
      message = 'La sala de audio no existe o no tiene garden_id.';
  end if;

  if new.garden_id is null then
    new.garden_id = v_room_garden_id;
  elsif new.garden_id <> v_room_garden_id then
    raise exception using
      errcode = '23514',
      message = 'garden_id de la sesion de audio no coincide con la sala.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_garden_audio_sessions_sync_garden on public.garden_audio_sessions;
create trigger trg_garden_audio_sessions_sync_garden
before insert or update on public.garden_audio_sessions
for each row execute function public.garden_audio_sessions_sync_garden_id();

create or replace function public.garden_audio_session_participants_sync_garden_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_garden_id uuid;
begin
  select s.garden_id
  into v_session_garden_id
  from public.garden_audio_sessions s
  where s.id = new.session_id;

  if v_session_garden_id is null then
    raise exception using
      errcode = '23514',
      message = 'La sesion de audio indicada no existe o no tiene garden_id.';
  end if;

  if new.garden_id is null then
    new.garden_id = v_session_garden_id;
  elsif new.garden_id <> v_session_garden_id then
    raise exception using
      errcode = '23514',
      message = 'garden_id del participante no coincide con la sesion de audio.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_garden_audio_session_participants_sync_garden on public.garden_audio_session_participants;
create trigger trg_garden_audio_session_participants_sync_garden
before insert or update on public.garden_audio_session_participants
for each row execute function public.garden_audio_session_participants_sync_garden_id();

create or replace function public.seed_main_chat_room_for_garden()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.garden_chat_rooms (
    garden_id,
    slug,
    title,
    room_kind,
    sort_order,
    created_by
  )
  values (
    new.id,
    'main',
    'Chat',
    'main',
    0,
    null
  )
  on conflict (garden_id, slug) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_gardens_seed_main_chat_room on public.gardens;
create trigger trg_gardens_seed_main_chat_room
after insert on public.gardens
for each row execute function public.seed_main_chat_room_for_garden();

insert into public.garden_chat_rooms (
  garden_id,
  slug,
  title,
  room_kind,
  sort_order,
  created_by
)
select
  g.id,
  'main',
  'Chat',
  'main',
  0,
  null
from public.gardens g
where not exists (
  select 1
  from public.garden_chat_rooms r
  where r.garden_id = g.id
    and r.slug = 'main'
);

alter table public.garden_chat_rooms enable row level security;
alter table public.garden_chat_messages enable row level security;
alter table public.garden_chat_message_attachments enable row level security;
alter table public.garden_chat_read_states enable row level security;
alter table public.garden_audio_sessions enable row level security;
alter table public.garden_audio_session_participants enable row level security;

drop policy if exists garden_chat_rooms_read_member on public.garden_chat_rooms;
create policy garden_chat_rooms_read_member on public.garden_chat_rooms
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = garden_chat_rooms.garden_id
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

drop policy if exists garden_chat_rooms_insert_member on public.garden_chat_rooms;
create policy garden_chat_rooms_insert_member on public.garden_chat_rooms
for insert
to authenticated
with check (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = garden_chat_rooms.garden_id
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

drop policy if exists garden_chat_rooms_update_member on public.garden_chat_rooms;
create policy garden_chat_rooms_update_member on public.garden_chat_rooms
for update
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = garden_chat_rooms.garden_id
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
    where gm.garden_id = garden_chat_rooms.garden_id
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

drop policy if exists garden_chat_messages_read_member on public.garden_chat_messages;
create policy garden_chat_messages_read_member on public.garden_chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = garden_chat_messages.garden_id
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

drop policy if exists garden_chat_messages_insert_member on public.garden_chat_messages;
create policy garden_chat_messages_insert_member on public.garden_chat_messages
for insert
to authenticated
with check (
  (
    exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = garden_chat_messages.garden_id
        and gm.user_id = auth.uid()
        and gm.left_at is null
    )
    and author_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

drop policy if exists garden_chat_messages_update_member on public.garden_chat_messages;
create policy garden_chat_messages_update_member on public.garden_chat_messages
for update
to authenticated
using (
  (
    exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = garden_chat_messages.garden_id
        and gm.user_id = auth.uid()
        and gm.left_at is null
    )
    and author_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
)
with check (
  (
    exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = garden_chat_messages.garden_id
        and gm.user_id = auth.uid()
        and gm.left_at is null
    )
    and author_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

drop policy if exists garden_chat_attachments_read_member on public.garden_chat_message_attachments;
create policy garden_chat_attachments_read_member on public.garden_chat_message_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = garden_chat_message_attachments.garden_id
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

drop policy if exists garden_chat_attachments_insert_member on public.garden_chat_message_attachments;
create policy garden_chat_attachments_insert_member on public.garden_chat_message_attachments
for insert
to authenticated
with check (
  (
    exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = garden_chat_message_attachments.garden_id
        and gm.user_id = auth.uid()
        and gm.left_at is null
    )
    and coalesce(uploaded_by_user_id, auth.uid()) = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

drop policy if exists garden_chat_reads_read_member on public.garden_chat_read_states;
create policy garden_chat_reads_read_member on public.garden_chat_read_states
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = garden_chat_read_states.garden_id
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

drop policy if exists garden_chat_reads_insert_self on public.garden_chat_read_states;
create policy garden_chat_reads_insert_self on public.garden_chat_read_states
for insert
to authenticated
with check (
  (
    exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = garden_chat_read_states.garden_id
        and gm.user_id = auth.uid()
        and gm.left_at is null
    )
    and user_id = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

drop policy if exists garden_chat_reads_update_self on public.garden_chat_read_states;
create policy garden_chat_reads_update_self on public.garden_chat_read_states
for update
to authenticated
using (
  (
    exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = garden_chat_read_states.garden_id
        and gm.user_id = auth.uid()
        and gm.left_at is null
    )
    and user_id = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
)
with check (
  (
    exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = garden_chat_read_states.garden_id
        and gm.user_id = auth.uid()
        and gm.left_at is null
    )
    and user_id = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

drop policy if exists garden_audio_sessions_read_member on public.garden_audio_sessions;
create policy garden_audio_sessions_read_member on public.garden_audio_sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = garden_audio_sessions.garden_id
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

drop policy if exists garden_audio_sessions_insert_member on public.garden_audio_sessions;
create policy garden_audio_sessions_insert_member on public.garden_audio_sessions
for insert
to authenticated
with check (
  (
    exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = garden_audio_sessions.garden_id
        and gm.user_id = auth.uid()
        and gm.left_at is null
    )
    and started_by_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

drop policy if exists garden_audio_sessions_update_member on public.garden_audio_sessions;
create policy garden_audio_sessions_update_member on public.garden_audio_sessions
for update
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = garden_audio_sessions.garden_id
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
    where gm.garden_id = garden_audio_sessions.garden_id
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

drop policy if exists garden_audio_session_participants_read_member on public.garden_audio_session_participants;
create policy garden_audio_session_participants_read_member on public.garden_audio_session_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = garden_audio_session_participants.garden_id
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

drop policy if exists garden_audio_session_participants_insert_member on public.garden_audio_session_participants;
create policy garden_audio_session_participants_insert_member on public.garden_audio_session_participants
for insert
to authenticated
with check (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = garden_audio_session_participants.garden_id
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

drop policy if exists garden_audio_session_participants_update_member on public.garden_audio_session_participants;
create policy garden_audio_session_participants_update_member on public.garden_audio_session_participants
for update
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = garden_audio_session_participants.garden_id
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
    where gm.garden_id = garden_audio_session_participants.garden_id
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

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'garden_chat_rooms'
  ) then
    execute 'alter publication supabase_realtime add table public.garden_chat_rooms';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'garden_chat_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.garden_chat_messages';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'garden_chat_message_attachments'
  ) then
    execute 'alter publication supabase_realtime add table public.garden_chat_message_attachments';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'garden_chat_read_states'
  ) then
    execute 'alter publication supabase_realtime add table public.garden_chat_read_states';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'garden_audio_sessions'
  ) then
    execute 'alter publication supabase_realtime add table public.garden_audio_sessions';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'garden_audio_session_participants'
  ) then
    execute 'alter publication supabase_realtime add table public.garden_audio_session_participants';
  end if;
end
$$;
