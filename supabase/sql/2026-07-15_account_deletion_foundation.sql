-- Libro Vivo - Account deletion foundation
-- Apply and validate in staging before enabling the API in any environment.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists deletion_requested_at timestamptz null,
  add column if not exists deleted_at timestamptz null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_account_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_account_status_check
      check (account_status in ('active', 'deletion_pending', 'deleted'));
  end if;
end $$;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'cancelled', 'processing', 'completed', 'failed')),
  acknowledgement_version text not null,
  requested_at timestamptz not null default timezone('utc', now()),
  scheduled_for timestamptz not null,
  cancelled_at timestamptz null,
  processing_started_at timestamptz null,
  completed_at timestamptz null,
  failed_at timestamptz null,
  failure_code text null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  storage_manifest jsonb not null default '[]'::jsonb,
  storage_cleaned_at timestamptz null,
  purged_garden_ids uuid[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_account_deletion_requests_due
  on public.account_deletion_requests (scheduled_for, status)
  where status in ('pending', 'failed');

alter table public.account_deletion_requests enable row level security;

drop policy if exists account_deletion_requests_read_self on public.account_deletion_requests;
create policy account_deletion_requests_read_self
  on public.account_deletion_requests
  for select
  to authenticated
  using (user_id = auth.uid());

revoke all on public.account_deletion_requests from public, anon, authenticated;
grant select on public.account_deletion_requests to authenticated;

create or replace function public.is_account_access_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    else coalesce(
      (
        select p.account_status in ('active', 'deletion_pending')
        from public.profiles p
        where p.id = auth.uid()
      ),
      true
    )
  end
$$;

revoke all on function public.is_account_access_active() from public;
grant execute on function public.is_account_access_active() to authenticated;

-- A restrictive gate closes direct PostgREST access for a deleted account even
-- while an old access token is still inside its short JWT expiry window.
do $$
declare
  target record;
begin
  for target in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity
  loop
    execute format(
      'drop policy if exists account_status_gate on %I.%I',
      target.schema_name,
      target.table_name
    );
    execute format(
      'create policy account_status_gate on %I.%I as restrictive for all to authenticated using (public.is_account_access_active()) with check (public.is_account_access_active())',
      target.schema_name,
      target.table_name
    );
  end loop;
end $$;

create or replace function public.request_account_deletion(
  p_user_id uuid,
  p_acknowledgement_version text,
  p_grace_days integer default 7
)
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_profile public.profiles%rowtype;
  result public.account_deletion_requests%rowtype;
  grace_days integer := greatest(1, least(coalesce(p_grace_days, 7), 30));
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;

  select * into target_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  if target_profile.role = 'superadmin' then
    raise exception 'superadmin account deletion is blocked' using errcode = '42501';
  end if;
  if target_profile.account_status = 'deleted' then
    raise exception 'account already deleted' using errcode = '22023';
  end if;

  insert into public.account_deletion_requests (
    user_id,
    status,
    acknowledgement_version,
    requested_at,
    scheduled_for,
    cancelled_at,
    processing_started_at,
    completed_at,
    failed_at,
    failure_code,
    attempt_count,
    storage_manifest,
    storage_cleaned_at,
    purged_garden_ids,
    updated_at
  ) values (
    p_user_id,
    'pending',
    p_acknowledgement_version,
    timezone('utc', now()),
    timezone('utc', now()) + make_interval(days => grace_days),
    null,
    null,
    null,
    null,
    null,
    0,
    '[]'::jsonb,
    null,
    '{}',
    timezone('utc', now())
  )
  on conflict (user_id) do update set
    status = case
      when account_deletion_requests.status = 'pending'
        then account_deletion_requests.status
      else 'pending'
    end,
    acknowledgement_version = excluded.acknowledgement_version,
    requested_at = case
      when account_deletion_requests.status = 'pending'
        then account_deletion_requests.requested_at
      else excluded.requested_at
    end,
    scheduled_for = case
      when account_deletion_requests.status = 'pending'
        then account_deletion_requests.scheduled_for
      else excluded.scheduled_for
    end,
    cancelled_at = null,
    processing_started_at = null,
    completed_at = null,
    failed_at = null,
    failure_code = null,
    attempt_count = case
      when account_deletion_requests.status = 'pending'
        then account_deletion_requests.attempt_count
      else 0
    end,
    storage_manifest = case
      when account_deletion_requests.status = 'pending'
        then account_deletion_requests.storage_manifest
      else '[]'::jsonb
    end,
    storage_cleaned_at = null,
    purged_garden_ids = '{}',
    updated_at = timezone('utc', now())
  returning * into result;

  update public.profiles
  set account_status = 'deletion_pending',
      deletion_requested_at = result.requested_at,
      deleted_at = null
  where id = p_user_id;

  return result;
end;
$$;

create or replace function public.cancel_account_deletion(p_user_id uuid)
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.account_deletion_requests%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;

  update public.account_deletion_requests
  set status = 'cancelled',
      cancelled_at = timezone('utc', now()),
      failure_code = null,
      updated_at = timezone('utc', now())
  where user_id = p_user_id
    and status = 'pending'
  returning * into result;

  if not found then
    raise exception 'pending deletion request not found' using errcode = 'P0002';
  end if;

  update public.profiles
  set account_status = 'active',
      deletion_requested_at = null
  where id = p_user_id
    and account_status = 'deletion_pending';

  return result;
end;
$$;

create or replace function public.claim_due_account_deletions(p_limit integer default 20)
returns setof public.account_deletion_requests
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;

  return query
  with due as (
    select request.id
    from public.account_deletion_requests request
    where request.scheduled_for <= timezone('utc', now())
      and request.attempt_count < 10
      and (
        request.status in ('pending', 'failed')
        or (
          request.status = 'processing'
          and request.processing_started_at < timezone('utc', now()) - interval '15 minutes'
        )
      )
    order by request.scheduled_for asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 20), 50))
  )
  update public.account_deletion_requests request
  set status = 'processing',
      processing_started_at = timezone('utc', now()),
      failed_at = null,
      failure_code = null,
      attempt_count = request.attempt_count + 1,
      updated_at = timezone('utc', now())
  from due
  where request.id = due.id
  returning request.*;
end;
$$;

create or replace function public.prepare_account_deletion(
  p_request_id uuid,
  p_user_id uuid,
  p_user_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_request public.account_deletion_requests%rowtype;
  target_profile public.profiles%rowtype;
  solo_garden_ids uuid[] := '{}';
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;

  select * into target_request
  from public.account_deletion_requests
  where id = p_request_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'deletion request not found' using errcode = 'P0002';
  end if;
  if target_request.status <> 'processing' then
    raise exception 'deletion request is not processable' using errcode = '22023';
  end if;
  if target_request.scheduled_for > timezone('utc', now()) then
    raise exception 'deletion request is not due' using errcode = '22023';
  end if;

  select * into target_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found or target_profile.role = 'superadmin' then
    raise exception 'profile cannot be deleted' using errcode = '42501';
  end if;

  -- A previous attempt may have committed the relational anonymization and
  -- then failed in Storage or Auth. Preserve its exact storage manifest and
  -- only reopen processing so the external worker can continue idempotently.
  if target_profile.account_status = 'deleted' then
    update public.account_deletion_requests
    set status = 'processing',
        failed_at = null,
        failure_code = null,
        updated_at = timezone('utc', now())
    where id = p_request_id;

    return jsonb_build_object(
      'requestId', p_request_id,
      'userId', p_user_id,
      'purgedGardenIds', to_jsonb(target_request.purged_garden_ids),
      'resumed', true
    );
  end if;

  update public.account_deletion_requests
  set status = 'processing',
      failed_at = null,
      failure_code = null,
      updated_at = timezone('utc', now())
  where id = p_request_id;

  select coalesce(array_agg(gm.garden_id), '{}') into solo_garden_ids
  from public.garden_members gm
  where gm.user_id = p_user_id
    and gm.left_at is null
    and not exists (
      select 1
      from public.garden_members other_member
      where other_member.garden_id = gm.garden_id
        and other_member.user_id <> p_user_id
        and other_member.left_at is null
    );

  update public.account_deletion_requests
  set purged_garden_ids = solo_garden_ids,
      updated_at = timezone('utc', now())
  where id = p_request_id;

  -- Persist exact Storage object paths before relational cascades remove the
  -- page and seed rows needed to identify private-garden media. The worker can
  -- retry object deletion safely without ever scanning a shared garden.
  update public.account_deletion_requests
  set storage_manifest = coalesce(
        (
          select jsonb_agg(
            jsonb_build_object('bucket', candidate.bucket_id, 'path', candidate.name)
            order by candidate.bucket_id, candidate.name
          )
          from (
            select distinct object.bucket_id, object.name
            from storage.objects object
            where (
              object.bucket_id = 'page-photos'
              and object.name like ('profiles/' || p_user_id::text || '/%')
            )
            or exists (
              select 1
              from unnest(solo_garden_ids) solo_garden_id
              where (
                object.bucket_id = 'garden-chat-media'
                and object.name like (solo_garden_id::text || '/%')
              ) or (
                object.bucket_id in ('page-photos', 'page-audio', 'page-videos')
                and object.name like ('capsules/' || solo_garden_id::text || '/%')
              )
            )
            or exists (
              select 1
              from public.pages private_page
              where private_page.garden_id = any(solo_garden_ids)
                and (
                  (
                    object.bucket_id in ('page-photos', 'page-audio', 'page-videos')
                    and object.name like ('pages/' || private_page.id::text || '/%')
                  ) or (
                    object.bucket_id = 'page-thumbs'
                    and object.name = ('pages/' || private_page.id::text || '.png')
                  )
                )
            )
            or exists (
              select 1
              from public.seeds private_seed
              where private_seed.garden_id = any(solo_garden_ids)
                and object.bucket_id in ('page-photos', 'page-audio', 'page-videos')
                and object.name like ('pages/' || private_seed.id::text || '/preparation/%')
            )
          ) candidate
        ),
        '[]'::jsonb
      ),
      storage_cleaned_at = null,
      updated_at = timezone('utc', now())
  where id = p_request_id;

  delete from public.garden_invitations
  where invited_user_id = p_user_id
     or (
       p_user_email is not null
       and lower(invited_email) = lower(trim(p_user_email))
     );

  update public.garden_invitations
  set status = 'revoked'
  where invited_by_user_id = p_user_id
    and status = 'pending';

  delete from public.garden_chat_message_reactions where user_id = p_user_id;
  delete from public.garden_chat_read_states where user_id = p_user_id;
  delete from public.garden_audio_session_participants where user_id = p_user_id;
  delete from public.flower_birth_ritual_ratings where user_id = p_user_id;
  delete from public.seed_watering_confirmations where user_id = p_user_id;
  delete from public.memory_reflections where user_id = p_user_id;
  delete from public.user_notices where user_id = p_user_id;
  delete from public.shared_live_sessions where user_id = p_user_id;

  update public.achievements_unlocked set claimed_by = null where claimed_by = p_user_id;
  update public.progression_tree_unlocks set claimed_by = null where claimed_by = p_user_id;
  update public.progression_reward_unlocks set claimed_by = null where claimed_by = p_user_id;
  update public.year_cycle_states
  set acknowledged_user_ids = array_remove(acknowledged_user_ids, p_user_id),
      closed_by_user_id = case when closed_by_user_id = p_user_id then null else closed_by_user_id end
  where p_user_id = any(acknowledged_user_ids) or closed_by_user_id = p_user_id;

  update public.map_places set updated_by_user_id = null where updated_by_user_id = p_user_id;
  update public.map_routes set updated_by_user_id = null where updated_by_user_id = p_user_id;
  update public.map_zones set updated_by_user_id = null where updated_by_user_id = p_user_id;
  update public.garden_plan_types set updated_by_user_id = null where updated_by_user_id = p_user_id;
  update public.flower_birth_rituals set completed_by_user_id = null where completed_by_user_id = p_user_id;
  update public.seed_preparation_checklist_items set completed_by_user_id = null where completed_by_user_id = p_user_id;
  update public.garden_chat_messages set deleted_by_user_id = null where deleted_by_user_id = p_user_id;
  update public.garden_chat_message_attachments set uploaded_by_user_id = null where uploaded_by_user_id = p_user_id;
  update public.garden_chat_rooms set created_by = null where created_by = p_user_id;
  update public.flower_page_revisions
  set actor_user_id = null,
      actor_name = 'Cuenta eliminada'
  where actor_user_id = p_user_id;

  update public.annual_tree_rituals set planted_by = null where planted_by = p_user_id;
  update public.annual_tree_check_ins set created_by = null where created_by = p_user_id;
  update public.time_capsule_drafts
  set created_by = case when created_by = p_user_id then null else created_by end,
      updated_by = case when updated_by = p_user_id then null else updated_by end
  where created_by = p_user_id or updated_by = p_user_id;
  update public.time_capsule_draft_revisions
  set actor_user_id = null,
      actor_name = 'Cuenta eliminada'
  where actor_user_id = p_user_id;

  if p_user_email is not null then
    update public.seed_event_reminder_deliveries delivery
    set recipient_emails = array(
      select recipient
      from unnest(delivery.recipient_emails) recipient
      where lower(recipient) <> lower(trim(p_user_email))
    )
    where exists (
      select 1
      from unnest(delivery.recipient_emails) recipient
      where lower(recipient) = lower(trim(p_user_email))
    );
  end if;

  delete from public.gardens where id = any(solo_garden_ids);
  delete from public.garden_members where user_id = p_user_id;
  delete from public.bond_members where user_id = p_user_id;
  delete from public.bonds bond
  where not exists (select 1 from public.bond_members member where member.bond_id = bond.id)
    and not exists (select 1 from public.gardens garden where garden.bond_id = bond.id);

  update public.profiles
  set name = 'Cuenta eliminada',
      last_name = null,
      pronoun = null,
      avatar_url = null,
      active_garden_id = null,
      invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
      account_status = 'deleted',
      deleted_at = timezone('utc', now())
  where id = p_user_id;

  return jsonb_build_object(
    'requestId', p_request_id,
    'userId', p_user_id,
    'purgedGardenIds', to_jsonb(solo_garden_ids)
  );
end;
$$;

revoke all on function public.request_account_deletion(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.cancel_account_deletion(uuid) from public, anon, authenticated;
revoke all on function public.claim_due_account_deletions(integer) from public, anon, authenticated;
revoke all on function public.prepare_account_deletion(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.request_account_deletion(uuid, text, integer) to service_role;
grant execute on function public.cancel_account_deletion(uuid) to service_role;
grant execute on function public.claim_due_account_deletions(integer) to service_role;
grant execute on function public.prepare_account_deletion(uuid, uuid, text) to service_role;
