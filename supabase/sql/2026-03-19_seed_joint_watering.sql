create extension if not exists pgcrypto;

create table if not exists public.seed_watering_confirmations (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  seed_id uuid not null references public.seeds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  watered_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (seed_id, user_id)
);

create index if not exists idx_seed_watering_confirmations_garden_seed
  on public.seed_watering_confirmations (garden_id, seed_id, watered_at desc);

create or replace function public.seed_watering_confirmations_sync_garden_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  seed_garden_id uuid;
begin
  select s.garden_id
  into seed_garden_id
  from public.seeds s
  where s.id = new.seed_id;

  if seed_garden_id is null then
    raise exception using
      errcode = '23514',
      message = 'La semilla indicada no existe o no tiene garden_id.';
  end if;

  if new.garden_id is null then
    new.garden_id = seed_garden_id;
  elsif new.garden_id <> seed_garden_id then
    raise exception using
      errcode = '23514',
      message = 'garden_id de la confirmacion no coincide con la semilla.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_seed_watering_confirmations_sync_garden
  on public.seed_watering_confirmations;
create trigger trg_seed_watering_confirmations_sync_garden
before insert or update on public.seed_watering_confirmations
for each row execute function public.seed_watering_confirmations_sync_garden_id();

drop trigger if exists trg_seed_watering_confirmations_touch_updated_at
  on public.seed_watering_confirmations;
create trigger trg_seed_watering_confirmations_touch_updated_at
before update on public.seed_watering_confirmations
for each row execute function public.touch_updated_at();

alter table if exists public.seed_watering_confirmations enable row level security;

drop policy if exists seed_watering_confirmations_read_member on public.seed_watering_confirmations;
create policy seed_watering_confirmations_read_member on public.seed_watering_confirmations
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = seed_watering_confirmations.garden_id
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

drop policy if exists seed_watering_confirmations_insert_self on public.seed_watering_confirmations;
create policy seed_watering_confirmations_insert_self on public.seed_watering_confirmations
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = seed_watering_confirmations.garden_id
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

drop policy if exists seed_watering_confirmations_update_member on public.seed_watering_confirmations;
create policy seed_watering_confirmations_update_member on public.seed_watering_confirmations
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

drop policy if exists seed_watering_confirmations_delete_member on public.seed_watering_confirmations;
create policy seed_watering_confirmations_delete_member on public.seed_watering_confirmations
for delete
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = seed_watering_confirmations.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
      and gm.member_role in ('owner', 'editor')
  )
  or user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

create or replace function public.get_active_garden_member_count(target_garden_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  is_allowed boolean := false;
  member_count integer := 0;
begin
  if target_garden_id is null then
    return 0;
  end if;

  select
    exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = target_garden_id
        and gm.user_id = auth.uid()
        and gm.left_at is null
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superadmin'
    )
  into is_allowed;

  if not coalesce(is_allowed, false) then
    return 0;
  end if;

  select greatest(count(*), 1)::int
  into member_count
  from public.garden_members gm
  where gm.garden_id = target_garden_id
    and gm.left_at is null;

  return coalesce(member_count, 1);
end;
$$;

grant execute on function public.get_active_garden_member_count(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1
    from (
      select p.planned_from_seed_id
      from public.pages p
      where p.planned_from_seed_id is not null
      group by p.planned_from_seed_id
      having count(*) > 1
    ) duplicates
  ) then
    create unique index if not exists idx_pages_unique_planned_from_seed
      on public.pages (planned_from_seed_id)
      where planned_from_seed_id is not null;
  else
    raise notice 'Saltando indice unico idx_pages_unique_planned_from_seed: hay paginas duplicadas por planned_from_seed_id.';
  end if;
end $$;
