-- Alinea los FK de contenido core con el modelo actual:
-- garden_id ya es NOT NULL en estas tablas, asi que borrar un jardin
-- no puede intentar dejar garden_id a null.

alter table if exists public.pages
  drop constraint if exists pages_garden_id_fkey;

alter table if exists public.pages
  add constraint pages_garden_id_fkey
  foreign key (garden_id)
  references public.gardens(id)
  on delete cascade;

alter table if exists public.seeds
  drop constraint if exists seeds_garden_id_fkey;

alter table if exists public.seeds
  add constraint seeds_garden_id_fkey
  foreign key (garden_id)
  references public.gardens(id)
  on delete cascade;

alter table if exists public.year_notes
  drop constraint if exists year_notes_garden_id_fkey;

alter table if exists public.year_notes
  add constraint year_notes_garden_id_fkey
  foreign key (garden_id)
  references public.gardens(id)
  on delete cascade;

alter table if exists public.season_notes
  drop constraint if exists season_notes_garden_id_fkey;

alter table if exists public.season_notes
  add constraint season_notes_garden_id_fkey
  foreign key (garden_id)
  references public.gardens(id)
  on delete cascade;

alter table if exists public.achievements_unlocked
  drop constraint if exists achievements_unlocked_garden_id_fkey;

alter table if exists public.achievements_unlocked
  add constraint achievements_unlocked_garden_id_fkey
  foreign key (garden_id)
  references public.gardens(id)
  on delete cascade;
