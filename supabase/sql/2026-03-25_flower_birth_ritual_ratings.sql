-- Flower birth ritual ratings
-- Each participant can rate the flower independently during the shared birth ritual.

create table if not exists public.flower_birth_ritual_ratings (
  page_id uuid not null references public.pages(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (page_id, user_id)
);

create index if not exists idx_flower_birth_ritual_ratings_garden_page
  on public.flower_birth_ritual_ratings (garden_id, page_id, updated_at desc);

create or replace function public.flower_birth_ritual_ratings_sync_garden_id()
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
      message = 'garden_id de la valoracion no coincide con la pagina.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_flower_birth_ritual_ratings_sync_garden
  on public.flower_birth_ritual_ratings;
create trigger trg_flower_birth_ritual_ratings_sync_garden
before insert or update on public.flower_birth_ritual_ratings
for each row execute function public.flower_birth_ritual_ratings_sync_garden_id();

drop trigger if exists trg_flower_birth_ritual_ratings_touch_updated_at
  on public.flower_birth_ritual_ratings;
create trigger trg_flower_birth_ritual_ratings_touch_updated_at
before update on public.flower_birth_ritual_ratings
for each row execute function public.touch_updated_at();

alter table public.flower_birth_ritual_ratings enable row level security;

drop policy if exists flower_birth_ritual_ratings_read_member on public.flower_birth_ritual_ratings;
create policy flower_birth_ritual_ratings_read_member on public.flower_birth_ritual_ratings
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = flower_birth_ritual_ratings.garden_id
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

drop policy if exists flower_birth_ritual_ratings_insert_self on public.flower_birth_ritual_ratings;
create policy flower_birth_ritual_ratings_insert_self on public.flower_birth_ritual_ratings
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = flower_birth_ritual_ratings.garden_id
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

drop policy if exists flower_birth_ritual_ratings_update_self on public.flower_birth_ritual_ratings;
create policy flower_birth_ritual_ratings_update_self on public.flower_birth_ritual_ratings
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
