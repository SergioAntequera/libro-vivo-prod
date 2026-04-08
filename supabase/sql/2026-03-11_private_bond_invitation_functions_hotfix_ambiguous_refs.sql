-- Libro Vivo - Hotfix RPC private bonds/gardens
-- Fecha: 2026-03-11
--
-- Fix:
-- - Evita ambiguedad de identificadores en funciones RETURNS TABLE
--   cuando los nombres de salida coinciden con columnas de ON CONFLICT.
-- - Sintoma observado: column reference "bond_id" is ambiguous.
-- - Nota: si ya existe una version previa de estas RPC con otro RETURNS TABLE,
--   Postgres no permite CREATE OR REPLACE cambiando el tipo de retorno.
--   Por eso primero hacemos DROP FUNCTION IF EXISTS y luego recreamos.

drop function if exists public.accept_private_garden_invitation(uuid, text, text);

create or replace function public.accept_private_garden_invitation(
  p_invitation_id uuid,
  p_garden_title text default null,
  p_garden_theme text default null
)
returns table (
  out_invitation_id uuid,
  out_bond_id uuid,
  out_garden_id uuid,
  out_bond_type text,
  out_garden_title text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_actor_email text;
  v_invitation public.garden_invitations%rowtype;
  v_bond_id uuid;
  v_garden_id uuid;
  v_garden_title text;
  v_garden_theme text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'No autenticado.' using errcode = '28000';
  end if;

  v_actor_email := lower(trim(coalesce(auth.jwt()->>'email', '')));
  v_garden_theme := nullif(trim(coalesce(p_garden_theme, '')), '');

  select *
  into v_invitation
  from public.garden_invitations gi
  where gi.id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitacion no encontrada.' using errcode = '22023';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'La invitacion ya no esta pendiente.' using errcode = '22023';
  end if;

  if v_invitation.expires_at < timezone('utc', now()) then
    update public.garden_invitations
    set status = 'expired'
    where id = v_invitation.id;
    raise exception 'La invitacion ha expirado.' using errcode = '22023';
  end if;

  if v_invitation.invited_user_id is not null then
    if v_invitation.invited_user_id <> v_actor_id then
      raise exception 'No autorizado para aceptar esta invitacion.' using errcode = '42501';
    end if;
  else
    if v_actor_email = '' then
      raise exception 'No se pudo validar tu email de sesion.' using errcode = '42501';
    end if;
    if lower(coalesce(v_invitation.invited_email, '')) <> v_actor_email then
      raise exception 'No autorizado para aceptar esta invitacion.' using errcode = '42501';
    end if;
  end if;

  if exists (
    select 1
    from public.bonds b
    join public.bond_members bm_owner
      on bm_owner.bond_id = b.id
     and bm_owner.user_id = v_invitation.invited_by_user_id
     and bm_owner.left_at is null
    join public.bond_members bm_actor
      on bm_actor.bond_id = b.id
     and bm_actor.user_id = v_actor_id
     and bm_actor.left_at is null
    where b.status = 'active'
      and b.type = v_invitation.bond_type
  ) then
    raise exception 'Ya existe un vinculo activo para ese tipo.' using errcode = '23505';
  end if;

  insert into public.bonds (
    type,
    status,
    title,
    created_by_user_id
  )
  values (
    v_invitation.bond_type,
    'active',
    null,
    v_invitation.invited_by_user_id
  )
  returning id into v_bond_id;

  insert into public.bond_members (bond_id, user_id, member_role)
  values
    (v_bond_id, v_invitation.invited_by_user_id, 'owner'),
    (v_bond_id, v_actor_id, 'member')
  on conflict do nothing;

  v_garden_title := nullif(trim(coalesce(p_garden_title, '')), '');
  if v_garden_title is null then
    v_garden_title := case v_invitation.bond_type
      when 'pareja' then 'Jardin de pareja'
      when 'amistad' then 'Jardin de amistad'
      when 'familia' then 'Jardin de familia'
      else 'Jardin compartido'
    end;
  end if;

  insert into public.gardens (
    bond_id,
    title,
    theme,
    status,
    is_private,
    created_by_user_id
  )
  values (
    v_bond_id,
    v_garden_title,
    v_garden_theme,
    'active',
    true,
    v_invitation.invited_by_user_id
  )
  returning id into v_garden_id;

  insert into public.garden_members (garden_id, user_id, member_role)
  values
    (v_garden_id, v_invitation.invited_by_user_id, 'owner'),
    (v_garden_id, v_actor_id, 'editor')
  on conflict do nothing;

  update public.garden_invitations
  set
    status = 'accepted',
    accepted_at = timezone('utc', now()),
    invited_user_id = coalesce(v_invitation.invited_user_id, v_actor_id)
  where id = v_invitation.id;

  update public.profiles
  set active_garden_id = coalesce(active_garden_id, v_garden_id)
  where id in (v_invitation.invited_by_user_id, v_actor_id);

  return query
  select
    v_invitation.id,
    v_bond_id,
    v_garden_id,
    v_invitation.bond_type,
    v_garden_title;
end;
$$;

revoke all on function public.accept_private_garden_invitation(uuid, text, text) from public;
grant execute on function public.accept_private_garden_invitation(uuid, text, text) to authenticated;

drop function if exists public.create_private_personal_garden(text, text);

create or replace function public.create_private_personal_garden(
  p_garden_title text default null,
  p_garden_theme text default null
)
returns table (
  out_bond_id uuid,
  out_garden_id uuid,
  out_garden_title text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_bond_id uuid;
  v_garden_id uuid;
  v_garden_title text;
  v_garden_theme text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'No autenticado.' using errcode = '28000';
  end if;

  v_garden_title := nullif(trim(coalesce(p_garden_title, '')), '');
  if v_garden_title is null then
    v_garden_title := 'Jardin personal';
  end if;
  v_garden_theme := nullif(trim(coalesce(p_garden_theme, '')), '');

  insert into public.bonds (
    type,
    status,
    title,
    created_by_user_id
  )
  values (
    'personal',
    'active',
    v_garden_title,
    v_actor_id
  )
  returning id into v_bond_id;

  insert into public.bond_members (bond_id, user_id, member_role)
  values (v_bond_id, v_actor_id, 'owner')
  on conflict do nothing;

  insert into public.gardens (
    bond_id,
    title,
    theme,
    status,
    is_private,
    created_by_user_id
  )
  values (
    v_bond_id,
    v_garden_title,
    v_garden_theme,
    'active',
    true,
    v_actor_id
  )
  returning id into v_garden_id;

  insert into public.garden_members (garden_id, user_id, member_role)
  values (v_garden_id, v_actor_id, 'owner')
  on conflict do nothing;

  update public.profiles
  set active_garden_id = coalesce(active_garden_id, v_garden_id)
  where id = v_actor_id;

  return query
  select
    v_bond_id,
    v_garden_id,
    v_garden_title;
end;
$$;

revoke all on function public.create_private_personal_garden(text, text) from public;
grant execute on function public.create_private_personal_garden(text, text) to authenticated;
