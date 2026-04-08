-- Libro Vivo - Plan types flower composer
-- Stores canonical flower composition by element and rating.

alter table public.garden_plan_types
  add column if not exists flower_builder_config jsonb not null default '{}'::jsonb;

update public.garden_plan_types
set flower_builder_config = '{}'::jsonb
where flower_builder_config is null;
