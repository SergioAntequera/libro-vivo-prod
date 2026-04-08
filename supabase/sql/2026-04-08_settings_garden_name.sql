-- Libro Vivo - settings.garden_name
-- Fecha: 2026-04-08
--
-- Objetivo:
-- - habilitar el nombre global del jardin dentro de `settings`
-- - permitir que el admin system guarde `{{garden}}` sin romper el update

alter table public.settings
  add column if not exists garden_name text;

comment on column public.settings.garden_name is
  'Nombre global del jardin usado por el shell/home cuando el welcome_text utiliza {{garden}}.';
