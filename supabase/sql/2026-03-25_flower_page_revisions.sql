-- Flower page revisions
-- Canonical revision log for flowers, both during birth ritual and later async edits.

create table if not exists public.flower_page_revisions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  snapshot jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_flower_page_revisions_page_id
  on public.flower_page_revisions (page_id, created_at desc);

create index if not exists idx_flower_page_revisions_garden_id
  on public.flower_page_revisions (garden_id, created_at desc);

create or replace function public.flower_page_revisions_sync_garden_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page_garden_id uuid;
begin
  select p.garden_id
  into v_page_garden_id
  from public.pages p
  where p.id = new.page_id;

  if v_page_garden_id is null then
    raise exception using
      errcode = '23514',
      message = 'La pagina indicada no existe o no tiene garden_id.';
  end if;

  if new.garden_id is null then
    new.garden_id = v_page_garden_id;
  elsif new.garden_id <> v_page_garden_id then
    raise exception using
      errcode = '23514',
      message = 'garden_id de la revision no coincide con la pagina.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_flower_page_revisions_sync_garden on public.flower_page_revisions;
create trigger trg_flower_page_revisions_sync_garden
before insert or update on public.flower_page_revisions
for each row execute function public.flower_page_revisions_sync_garden_id();

alter table public.flower_page_revisions enable row level security;

drop policy if exists flower_page_revisions_read_member on public.flower_page_revisions;
create policy flower_page_revisions_read_member on public.flower_page_revisions
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = flower_page_revisions.garden_id
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

drop policy if exists flower_page_revisions_insert_member on public.flower_page_revisions;
create policy flower_page_revisions_insert_member on public.flower_page_revisions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = flower_page_revisions.garden_id
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
