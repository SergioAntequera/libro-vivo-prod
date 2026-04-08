create table if not exists public.garden_chat_message_reactions (
  message_id uuid not null references public.garden_chat_messages(id) on delete cascade,
  room_id uuid not null references public.garden_chat_rooms(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(trim(emoji)) between 1 and 24),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (message_id, user_id, emoji)
);

create index if not exists idx_garden_chat_message_reactions_room_id
  on public.garden_chat_message_reactions (room_id, created_at asc);

create index if not exists idx_garden_chat_message_reactions_garden_id
  on public.garden_chat_message_reactions (garden_id, created_at desc);

create or replace function public.garden_chat_reactions_sync_room_garden()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_garden_id uuid;
begin
  select m.room_id, m.garden_id
  into v_room_id, v_garden_id
  from public.garden_chat_messages m
  where m.id = new.message_id;

  if v_room_id is null or v_garden_id is null then
    raise exception using
      errcode = '23514',
      message = 'La reaccion apunta a un mensaje de chat invalido.';
  end if;

  if new.room_id is null then
    new.room_id = v_room_id;
  elsif new.room_id <> v_room_id then
    raise exception using
      errcode = '23514',
      message = 'room_id de la reaccion no coincide con el mensaje.';
  end if;

  if new.garden_id is null then
    new.garden_id = v_garden_id;
  elsif new.garden_id <> v_garden_id then
    raise exception using
      errcode = '23514',
      message = 'garden_id de la reaccion no coincide con el mensaje.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_garden_chat_reactions_sync_room_garden on public.garden_chat_message_reactions;
create trigger trg_garden_chat_reactions_sync_room_garden
before insert or update on public.garden_chat_message_reactions
for each row execute function public.garden_chat_reactions_sync_room_garden();

alter table public.garden_chat_message_reactions enable row level security;

drop policy if exists garden_chat_reactions_read_member on public.garden_chat_message_reactions;
create policy garden_chat_reactions_read_member on public.garden_chat_message_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = garden_chat_message_reactions.garden_id
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

drop policy if exists garden_chat_reactions_insert_self on public.garden_chat_message_reactions;
create policy garden_chat_reactions_insert_self on public.garden_chat_message_reactions
for insert
to authenticated
with check (
  (
    exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = garden_chat_message_reactions.garden_id
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

drop policy if exists garden_chat_reactions_delete_self on public.garden_chat_message_reactions;
create policy garden_chat_reactions_delete_self on public.garden_chat_message_reactions
for delete
to authenticated
using (
  (
    exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = garden_chat_message_reactions.garden_id
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

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'garden_chat_message_reactions'
  ) then
    execute 'alter publication supabase_realtime add table public.garden_chat_message_reactions';
  end if;
end
$$;
