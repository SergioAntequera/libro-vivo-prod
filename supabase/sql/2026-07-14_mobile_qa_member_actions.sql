-- Mobile QA hardening: member-owned deletes and plan cover uploads.

alter table public.seed_preparation_profiles
  add column if not exists participant_member_ids uuid[] not null default '{}'::uuid[],
  add column if not exists external_guest_names text[] not null default '{}'::text[],
  add column if not exists preparation_state text not null default 'creado';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'seed_preparation_profiles_preparation_state_check'
  ) then
    alter table public.seed_preparation_profiles
      add constraint seed_preparation_profiles_preparation_state_check
      check (preparation_state in ('creado', 'preparando', 'listo'));
  end if;
end
$$;

create or replace function public.delete_garden_page(
  p_page_id uuid
)
returns table (
  out_page_id uuid,
  out_seed_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_page public.pages%rowtype;
  v_allowed boolean := false;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'No autenticado.' using errcode = '28000';
  end if;

  select *
  into v_page
  from public.pages p
  where p.id = p_page_id
  for update;

  if not found then
    raise exception 'El recuerdo no existe o ya fue borrado.' using errcode = 'P0002';
  end if;

  select
    exists (
      select 1
      from public.profiles profile_row
      where profile_row.id = v_actor_id
        and profile_row.role = 'superadmin'
    )
    or exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = v_page.garden_id
        and gm.user_id = v_actor_id
        and gm.left_at is null
        and (
          v_page.created_by = v_actor_id
          or gm.member_role in ('owner', 'editor')
        )
    )
  into v_allowed;

  if not coalesce(v_allowed, false) then
    raise exception 'No autorizado para borrar este recuerdo.' using errcode = '42501';
  end if;

  if v_page.planned_from_seed_id is not null then
    update public.seeds
    set bloomed_page_id = null
    where id = v_page.planned_from_seed_id
      and bloomed_page_id = v_page.id;
  end if;

  delete from public.pages
  where id = v_page.id;

  return query
  select v_page.id, v_page.planned_from_seed_id;
end;
$$;

revoke all on function public.delete_garden_page(uuid) from public;
grant execute on function public.delete_garden_page(uuid) to authenticated;

drop function if exists public.delete_garden_seed(uuid);

create function public.delete_garden_seed(
  p_seed_id uuid
)
returns table (
  out_seed_id uuid,
  out_page_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_seed public.seeds%rowtype;
  v_allowed boolean := false;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'No autenticado.' using errcode = '28000';
  end if;

  select *
  into v_seed
  from public.seeds s
  where s.id = p_seed_id
  for update;

  if not found then
    raise exception 'El plan no existe o ya fue borrado.' using errcode = 'P0002';
  end if;

  select
    exists (
      select 1
      from public.profiles profile_row
      where profile_row.id = v_actor_id
        and profile_row.role = 'superadmin'
    )
    or exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = v_seed.garden_id
        and gm.user_id = v_actor_id
        and gm.left_at is null
        and (
          v_seed.created_by = v_actor_id
          or gm.member_role in ('owner', 'editor')
        )
    )
  into v_allowed;

  if not coalesce(v_allowed, false) then
    raise exception 'No autorizado para borrar este plan.' using errcode = '42501';
  end if;

  update public.pages
  set planned_from_seed_id = null
  where planned_from_seed_id = v_seed.id;

  delete from public.seeds
  where id = v_seed.id;

  return query
  select v_seed.id, v_seed.bloomed_page_id;
end;
$$;

revoke all on function public.delete_garden_seed(uuid) from public;
grant execute on function public.delete_garden_seed(uuid) to authenticated;

drop policy if exists page_photos_plan_covers_insert_member on storage.objects;
create policy page_photos_plan_covers_insert_member
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'page-photos'
  and split_part(name, '/', 1) = 'plans'
  and split_part(name, '/', 2) = 'covers'
  and exists (
    select 1
    from public.seeds s
    join public.garden_members gm
      on gm.garden_id = s.garden_id
    where s.id::text = split_part(name, '/', 3)
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);

drop policy if exists page_photos_plan_covers_delete_member on storage.objects;
create policy page_photos_plan_covers_delete_member
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'page-photos'
  and split_part(name, '/', 1) = 'plans'
  and split_part(name, '/', 2) = 'covers'
  and exists (
    select 1
    from public.seeds s
    join public.garden_members gm
      on gm.garden_id = s.garden_id
    where s.id::text = split_part(name, '/', 3)
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
);
