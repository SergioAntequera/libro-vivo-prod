-- Libro Vivo - Presencia persistente para colaboracion en vivo
-- Fecha: 2026-04-11
--
-- Objetivo:
-- - No depender solo de presence efimera del websocket para saber quien sigue dentro.
-- - Tener una verdad compartida y resistente para chat, nacimiento, capsula y dossier.
-- - Usar realtime como acelerador, pero no como unica fuente de verdad.

create table if not exists public.shared_live_sessions (
  scope_kind text not null
    check (scope_kind in ('garden_chat', 'flower_birth', 'time_capsule', 'seed_preparation')),
  scope_key text not null
    check (char_length(trim(scope_key)) > 0),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null default 'Sin nombre',
  ready boolean not null default false,
  holding boolean not null default false,
  activity_label text null,
  activity_progress integer null
    check (activity_progress is null or (activity_progress >= 0 and activity_progress <= 100)),
  focus_key text null,
  focus_label text null,
  cursor_offset integer null,
  pointer_x double precision null,
  pointer_y double precision null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (scope_kind, scope_key, user_id)
);

create index if not exists idx_shared_live_sessions_scope
  on public.shared_live_sessions (garden_id, scope_kind, scope_key, updated_at desc);

create index if not exists idx_shared_live_sessions_user
  on public.shared_live_sessions (user_id, updated_at desc);

drop trigger if exists trg_shared_live_sessions_touch_updated_at on public.shared_live_sessions;
create trigger trg_shared_live_sessions_touch_updated_at
before update on public.shared_live_sessions
for each row execute function public.touch_updated_at();

alter table public.shared_live_sessions enable row level security;

drop policy if exists shared_live_sessions_read_member on public.shared_live_sessions;
create policy shared_live_sessions_read_member on public.shared_live_sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = shared_live_sessions.garden_id
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

drop policy if exists shared_live_sessions_insert_self on public.shared_live_sessions;
create policy shared_live_sessions_insert_self on public.shared_live_sessions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = shared_live_sessions.garden_id
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
);

drop policy if exists shared_live_sessions_update_self on public.shared_live_sessions;
create policy shared_live_sessions_update_self on public.shared_live_sessions
for update
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

drop policy if exists shared_live_sessions_delete_self on public.shared_live_sessions;
create policy shared_live_sessions_delete_self on public.shared_live_sessions
for delete
to authenticated
using (
  user_id = auth.uid()
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
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    raise notice 'Skipping realtime publication: supabase_realtime does not exist.';
    return;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shared_live_sessions'
  ) then
    execute 'alter publication supabase_realtime add table public.shared_live_sessions';
  end if;
end $$;
