-- Libro Vivo - Invitaciones privadas por codigo de vinculo (sin red social)
-- Fecha: 2026-03-11
--
-- Objetivo:
-- - Añadir codigo de invitacion privado por perfil.
-- - Exponer funciones SQL seguras para:
--   - buscar perfil por codigo exacto
--   - crear invitacion privada
--   - aceptar invitacion privada
--   - crear jardin personal

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 1) Perfil: invite_code privado
-- ---------------------------------------------------------------------------

alter table if exists public.profiles
  add column if not exists invite_code text;

create or replace function public.generate_profile_invite_code()
returns text
language plpgsql
as $$
declare
  v_candidate text;
begin
  loop
    v_candidate := upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (
      select 1
      from public.profiles p
      where p.invite_code = v_candidate
    );
  end loop;
  return v_candidate;
end;
$$;

do $$
begin
  if to_regclass('public.profiles') is null then
    raise notice 'Skipping profiles invite_code bootstrap: table does not exist.';
    return;
  end if;

  update public.profiles
  set invite_code = upper(regexp_replace(coalesce(invite_code, ''), '[^A-Za-z0-9]', '', 'g'));

  update public.profiles
  set invite_code = public.generate_profile_invite_code()
  where invite_code is null
     or invite_code !~ '^[A-Z0-9]{8}$';
end $$;

create unique index if not exists idx_profiles_invite_code_unique
  on public.profiles (invite_code);

alter table if exists public.profiles
  alter column invite_code set default public.generate_profile_invite_code();

do $$
begin
  if to_regclass('public.profiles') is null then
    return;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_invite_code_format_check'
  ) then
    alter table public.profiles
      add constraint profiles_invite_code_format_check
      check (invite_code ~ '^[A-Z0-9]{8}$');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Invitaciones: permitir target por usuario (sin email obligatorio)
-- ---------------------------------------------------------------------------

alter table if exists public.garden_invitations
  alter column invited_email drop not null;

do $$
begin
  if to_regclass('public.garden_invitations') is null then
    raise notice 'Skipping garden_invitations target constraint: table does not exist.';
    return;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'garden_invitations_target_check'
  ) then
    alter table public.garden_invitations
      add constraint garden_invitations_target_check
      check (
        invited_user_id is not null
        or (invited_email is not null and length(trim(invited_email)) > 0)
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) RPC: buscar perfil por codigo exacto (minimo, privado)
-- ---------------------------------------------------------------------------

create or replace function public.find_profile_by_invite_code(
  p_invite_code text
)
returns table (
  id uuid,
  name text,
  avatar_url text,
  invite_code text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid;
  v_code text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'No autenticado.' using errcode = '28000';
  end if;

  v_code := upper(regexp_replace(coalesce(p_invite_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if char_length(v_code) <> 8 then
    return;
  end if;

  return query
  select
    p.id,
    p.name,
    p.avatar_url,
    p.invite_code
  from public.profiles p
  where p.invite_code = v_code
    and p.id <> v_actor_id
  limit 1;
end;
$$;

revoke all on function public.find_profile_by_invite_code(text) from public;
grant execute on function public.find_profile_by_invite_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) RPC: crear invitacion privada
-- ---------------------------------------------------------------------------

create or replace function public.create_private_garden_invitation(
  p_bond_type text,
  p_target_invite_code text default null,
  p_target_email text default null
)
returns table (
  invitation_id uuid,
  bond_type text,
  status text,
  invited_user_id uuid,
  invited_email text,
  expires_at timestamptz,
  target_name text,
  target_avatar_url text,
  target_invite_code text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid;
  v_bond_type text;
  v_target_code text;
  v_target_user_id uuid;
  v_target_name text;
  v_target_avatar_url text;
  v_target_invite_code text;
  v_target_email text;
  v_invitation_id uuid;
  v_expires_at timestamptz;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'No autenticado.' using errcode = '28000';
  end if;

  v_bond_type := lower(trim(coalesce(p_bond_type, '')));
  if v_bond_type not in ('pareja', 'amistad', 'familia', 'personal') then
    raise exception 'Tipo de vinculo invalido.' using errcode = '22023';
  end if;

  v_target_code := upper(regexp_replace(coalesce(p_target_invite_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if char_length(v_target_code) = 8 then
    select
      p.id,
      p.name,
      p.avatar_url,
      p.invite_code
    into
      v_target_user_id,
      v_target_name,
      v_target_avatar_url,
      v_target_invite_code
    from public.profiles p
    where p.invite_code = v_target_code
    limit 1;
  end if;

  v_target_email := lower(trim(coalesce(p_target_email, '')));
  if v_target_email = '' then
    v_target_email := null;
  end if;

  if v_target_user_id is null and v_target_email is null then
    raise exception 'Debes indicar codigo exacto o email.' using errcode = '22023';
  end if;

  if v_target_user_id = v_actor_id then
    raise exception 'No puedes invitarte a ti mismo.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.garden_invitations gi
    where gi.invited_by_user_id = v_actor_id
      and gi.status = 'pending'
      and gi.bond_type = v_bond_type
      and (
        (v_target_user_id is not null and gi.invited_user_id = v_target_user_id)
        or (
          v_target_user_id is null
          and v_target_email is not null
          and lower(coalesce(gi.invited_email, '')) = v_target_email
        )
      )
  ) then
    raise exception 'Ya existe una invitacion pendiente para ese destino.' using errcode = '23505';
  end if;

  insert into public.garden_invitations as gi (
    bond_type,
    invited_email,
    invited_user_id,
    invited_by_user_id,
    token_hash,
    status,
    expires_at
  )
  values (
    v_bond_type,
    v_target_email,
    v_target_user_id,
    v_actor_id,
    encode(
      digest(
        gen_random_uuid()::text || ':' || coalesce(v_target_email, '') || ':' || clock_timestamp()::text,
        'sha256'
      ),
      'hex'
    ),
    'pending',
    timezone('utc', now()) + interval '14 days'
  )
  returning gi.id, gi.expires_at
  into v_invitation_id, v_expires_at;

  return query
  select
    v_invitation_id,
    v_bond_type,
    'pending'::text,
    v_target_user_id,
    v_target_email,
    v_expires_at,
    v_target_name,
    v_target_avatar_url,
    v_target_invite_code;
end;
$$;

revoke all on function public.create_private_garden_invitation(text, text, text) from public;
grant execute on function public.create_private_garden_invitation(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) RPC: aceptar invitacion privada y crear vinculo + jardin
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 6) RPC: crear jardin personal (sin invitacion)
-- ---------------------------------------------------------------------------

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
