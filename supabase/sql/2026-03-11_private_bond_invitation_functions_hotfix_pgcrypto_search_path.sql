-- Libro Vivo - Hotfix pgcrypto search_path en invitaciones privadas
-- Fecha: 2026-03-11
--
-- Problema:
-- - Error en runtime: function digest(text, unknown) does not exist
-- Causa:
-- - La RPC create_private_garden_invitation usa SECURITY DEFINER con
--   search_path = public, y en Supabase pgcrypto suele estar en schema `extensions`.
--
-- Solucion:
-- - Reemplazar la RPC con search_path = public, extensions.

create extension if not exists pgcrypto with schema extensions;

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
