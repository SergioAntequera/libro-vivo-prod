-- Libro Vivo - page plan type canonical sync
-- Fecha: 2026-04-08
--
-- Objetivo:
-- - fijar `pages.plan_type_id` como verdad canonica de cualquier flor/pagina
-- - rellenar historicos nacidos desde seed que se hubieran quedado sin plan_type
-- - impedir que futuros enlaces seed->page vuelvan a dejar la pagina sin clasificacion
--
-- Nota:
-- - `seeds.plan_type_id` sigue siendo la verdad de planificacion antes de florecer
-- - al florecer, la pagina debe nacer ya con su propio `plan_type_id`
-- - los surfaces de lectura de pagina deben depender de `pages`/`page_visual_states`, no de la seed

update public.pages p
set plan_type_id = s.plan_type_id
from public.seeds s
where p.planned_from_seed_id = s.id
  and p.plan_type_id is null
  and s.plan_type_id is not null;

create or replace function public.pages_fill_plan_type_from_linked_seed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.plan_type_id is not null or new.planned_from_seed_id is null then
    return new;
  end if;

  select s.plan_type_id
  into new.plan_type_id
  from public.seeds s
  where s.id = new.planned_from_seed_id;

  return new;
end;
$$;

drop trigger if exists trg_pages_fill_plan_type_from_linked_seed on public.pages;
create trigger trg_pages_fill_plan_type_from_linked_seed
before insert or update of planned_from_seed_id
on public.pages
for each row
execute function public.pages_fill_plan_type_from_linked_seed();

create or replace function public.sync_bloomed_page_plan_type_from_seed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.bloomed_page_id is null then
    return null;
  end if;

  update public.pages p
  set plan_type_id = new.plan_type_id
  where p.id = new.bloomed_page_id
    and p.planned_from_seed_id = new.id
    and p.garden_id = new.garden_id
    and p.plan_type_id is distinct from new.plan_type_id;

  return null;
end;
$$;

drop trigger if exists trg_seeds_sync_bloomed_page_plan_type on public.seeds;
create trigger trg_seeds_sync_bloomed_page_plan_type
after insert or update of plan_type_id, bloomed_page_id
on public.seeds
for each row
execute function public.sync_bloomed_page_plan_type_from_seed();
