-- Read-only snapshot taken before the 2026-07-14 mobile QA schema hardening.
-- Project: wmmaxlykngeszwvvifqj
-- Existing mobile preparation columns checked below: none present.
-- Existing plan-cover storage policies checked below: none present.

CREATE OR REPLACE FUNCTION public.delete_garden_page(p_page_id uuid)
RETURNS TABLE(out_page_id uuid, out_seed_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    raise exception 'La pagina no existe o ya fue borrada.' using errcode = 'P0002';
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
        and gm.member_role in ('owner', 'editor')
    )
  into v_allowed;

  if not coalesce(v_allowed, false) then
    raise exception 'No autorizado para borrar esta pagina.' using errcode = '42501';
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
$function$;
