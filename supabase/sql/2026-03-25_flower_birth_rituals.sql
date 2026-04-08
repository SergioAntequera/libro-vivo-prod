-- Flower birth rituals
-- Canonical truth for the shared first-creation moment of a flower/page.

create table if not exists public.flower_birth_rituals (
  page_id uuid primary key references public.pages(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  seed_id uuid references public.seeds(id) on delete set null,
  activated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  completed_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_flower_birth_rituals_garden_id
  on public.flower_birth_rituals (garden_id, activated_at desc);

create index if not exists idx_flower_birth_rituals_seed_id
  on public.flower_birth_rituals (seed_id);

create or replace function public.flower_birth_rituals_sync_garden_id()
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
      message = 'garden_id del ritual no coincide con la pagina.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_flower_birth_rituals_sync_garden on public.flower_birth_rituals;
create trigger trg_flower_birth_rituals_sync_garden
before insert or update on public.flower_birth_rituals
for each row execute function public.flower_birth_rituals_sync_garden_id();

drop trigger if exists trg_flower_birth_rituals_touch_updated_at on public.flower_birth_rituals;
create trigger trg_flower_birth_rituals_touch_updated_at
before update on public.flower_birth_rituals
for each row execute function public.touch_updated_at();

alter table public.flower_birth_rituals enable row level security;

drop policy if exists flower_birth_rituals_read_member on public.flower_birth_rituals;
create policy flower_birth_rituals_read_member on public.flower_birth_rituals
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = flower_birth_rituals.garden_id
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

drop policy if exists flower_birth_rituals_insert_member on public.flower_birth_rituals;
create policy flower_birth_rituals_insert_member on public.flower_birth_rituals
for insert
to authenticated
with check (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = flower_birth_rituals.garden_id
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

drop policy if exists flower_birth_rituals_update_member on public.flower_birth_rituals;
create policy flower_birth_rituals_update_member on public.flower_birth_rituals
for update
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = flower_birth_rituals.garden_id
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
    where gm.garden_id = flower_birth_rituals.garden_id
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
