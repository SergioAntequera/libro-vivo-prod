-- Libro Vivo - page_visual_states
-- Fecha: 2026-04-08
--
-- Objetivo:
-- - crear una proyeccion canonica del visual principal de cada pagina
-- - recalcularla automaticamente cuando cambian `pages` o `garden_plan_types`
-- - permitir que home, page, year, forest y PDF lean la misma identidad floral
--
-- Nota:
-- - la verdad editorial sigue estando en `pages` y `garden_plan_types`
-- - esta tabla es el read model oficial del visual de pagina
-- - la flor sigue siendo la identidad principal; la foto queda como secundaria

create table if not exists public.page_visual_states (
  page_id uuid primary key references public.pages(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  plan_type_id uuid null,
  plan_type_code text null,
  plan_type_label text null,
  plan_category text null,
  flower_family text null,
  flower_asset_path text null,
  flower_builder_config jsonb not null default '{}'::jsonb,
  suggested_element text null,
  page_element text not null default 'aether',
  rating numeric(6,3) not null default 0,
  cover_photo_url text null,
  thumbnail_url text null,
  secondary_photo_url text null,
  has_secondary_photo boolean not null default false,
  generated_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_page_visual_states_garden_id
  on public.page_visual_states (garden_id, page_id);

drop trigger if exists trg_page_visual_states_touch_updated_at on public.page_visual_states;
create trigger trg_page_visual_states_touch_updated_at
before update on public.page_visual_states
for each row execute function public.touch_updated_at();

create or replace function public.recompute_page_visual_state(
  target_page_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page record;
  v_cover_photo_url text;
  v_thumbnail_url text;
  v_secondary_photo_url text;
begin
  if target_page_id is null then
    return;
  end if;

  select
    p.id as page_id,
    p.garden_id,
    p.plan_type_id,
    p.element as page_element,
    p.rating,
    p.cover_photo_url,
    p.thumbnail_url,
    pt.code as plan_type_code,
    pt.label as plan_type_label,
    pt.category as plan_category,
    pt.flower_family,
    pt.flower_asset_path,
    pt.flower_builder_config,
    pt.suggested_element
  into v_page
  from public.pages p
  left join public.garden_plan_types pt
    on pt.id = p.plan_type_id
  where p.id = target_page_id;

  if not found or v_page.garden_id is null then
    delete from public.page_visual_states
    where page_id = target_page_id;
    return;
  end if;

  v_cover_photo_url := nullif(btrim(coalesce(v_page.cover_photo_url, '')), '');
  v_thumbnail_url := nullif(btrim(coalesce(v_page.thumbnail_url, '')), '');
  v_secondary_photo_url := coalesce(v_cover_photo_url, v_thumbnail_url);

  insert into public.page_visual_states (
    page_id,
    garden_id,
    plan_type_id,
    plan_type_code,
    plan_type_label,
    plan_category,
    flower_family,
    flower_asset_path,
    flower_builder_config,
    suggested_element,
    page_element,
    rating,
    cover_photo_url,
    thumbnail_url,
    secondary_photo_url,
    has_secondary_photo,
    generated_at
  )
  values (
    v_page.page_id,
    v_page.garden_id,
    v_page.plan_type_id,
    nullif(btrim(coalesce(v_page.plan_type_code, '')), ''),
    nullif(btrim(coalesce(v_page.plan_type_label, '')), ''),
    nullif(btrim(coalesce(v_page.plan_category, '')), ''),
    nullif(btrim(coalesce(v_page.flower_family, '')), ''),
    nullif(btrim(coalesce(v_page.flower_asset_path, '')), ''),
    coalesce(v_page.flower_builder_config, '{}'::jsonb),
    nullif(btrim(coalesce(v_page.suggested_element, '')), ''),
    coalesce(nullif(btrim(coalesce(v_page.page_element, '')), ''), 'aether'),
    coalesce(v_page.rating, 0),
    v_cover_photo_url,
    v_thumbnail_url,
    v_secondary_photo_url,
    v_secondary_photo_url is not null,
    timezone('utc', now())
  )
  on conflict (page_id) do update
  set
    garden_id = excluded.garden_id,
    plan_type_id = excluded.plan_type_id,
    plan_type_code = excluded.plan_type_code,
    plan_type_label = excluded.plan_type_label,
    plan_category = excluded.plan_category,
    flower_family = excluded.flower_family,
    flower_asset_path = excluded.flower_asset_path,
    flower_builder_config = excluded.flower_builder_config,
    suggested_element = excluded.suggested_element,
    page_element = excluded.page_element,
    rating = excluded.rating,
    cover_photo_url = excluded.cover_photo_url,
    thumbnail_url = excluded.thumbnail_url,
    secondary_photo_url = excluded.secondary_photo_url,
    has_secondary_photo = excluded.has_secondary_photo,
    generated_at = excluded.generated_at,
    updated_at = timezone('utc', now());
end;
$$;

create or replace function public.recompute_page_visual_states_for_plan_type(
  target_plan_type_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target record;
begin
  if target_plan_type_id is null then
    return;
  end if;

  for target in (
    select p.id
    from public.pages p
    where p.plan_type_id = target_plan_type_id
  )
  loop
    perform public.recompute_page_visual_state(target.id);
  end loop;
end;
$$;

create or replace function public.rebuild_all_page_visual_states()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target record;
begin
  for target in (
    select p.id
    from public.pages p
    where p.garden_id is not null
  )
  loop
    perform public.recompute_page_visual_state(target.id);
  end loop;

  delete from public.page_visual_states pvs
  where not exists (
    select 1
    from public.pages p
    where p.id = pvs.page_id
      and p.garden_id is not null
  );
end;
$$;

create or replace function public.tg_recompute_page_visual_state_from_pages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.page_visual_states
    where page_id = old.id;
    return null;
  end if;

  perform public.recompute_page_visual_state(new.id);
  return null;
end;
$$;

create or replace function public.tg_recompute_page_visual_state_from_plan_types()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_page_visual_states_for_plan_type(old.id);
    return null;
  end if;

  perform public.recompute_page_visual_states_for_plan_type(new.id);
  return null;
end;
$$;

-- Importante:
-- - el backfill inicial debe ejecutarse sin los triggers de origen activos
-- - asi evitamos recalculos concurrentes sobre `pages`/`garden_plan_types`
--   mientras recorremos todo el historico
drop trigger if exists trg_pages_recompute_page_visual_state_write on public.pages;
drop trigger if exists trg_pages_recompute_page_visual_state_delete on public.pages;
drop trigger if exists trg_garden_plan_types_recompute_page_visual_state_write on public.garden_plan_types;
drop trigger if exists trg_garden_plan_types_recompute_page_visual_state_delete on public.garden_plan_types;
select public.rebuild_all_page_visual_states();

create trigger trg_pages_recompute_page_visual_state_write
after insert or update of garden_id, plan_type_id, element, rating, cover_photo_url, thumbnail_url
on public.pages
for each row
execute function public.tg_recompute_page_visual_state_from_pages();

create trigger trg_pages_recompute_page_visual_state_delete
after delete on public.pages
for each row
execute function public.tg_recompute_page_visual_state_from_pages();

create trigger trg_garden_plan_types_recompute_page_visual_state_write
after insert or update of code, label, category, flower_family, flower_asset_path, flower_builder_config, suggested_element, archived_at
on public.garden_plan_types
for each row
execute function public.tg_recompute_page_visual_state_from_plan_types();

create trigger trg_garden_plan_types_recompute_page_visual_state_delete
after delete on public.garden_plan_types
for each row
execute function public.tg_recompute_page_visual_state_from_plan_types();

alter table public.page_visual_states enable row level security;

drop policy if exists page_visual_states_read_member on public.page_visual_states;
create policy page_visual_states_read_member on public.page_visual_states
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = page_visual_states.garden_id
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

drop policy if exists page_visual_states_write_superadmin on public.page_visual_states;
create policy page_visual_states_write_superadmin on public.page_visual_states
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);
