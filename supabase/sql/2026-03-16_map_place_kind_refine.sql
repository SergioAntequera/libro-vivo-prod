-- Libro Vivo - Refinamiento de tipos de lugar del mapa
-- Fecha: 2026-03-16
--
-- Objetivo:
-- - Alinear el dominio de lugares con el modelo de producto:
--   estado -> saved | favorite | visited | wishlist | archived
--   tipo   -> restaurant | cafe | spot | viewpoint | trip_place | custom
-- - Migrar aliases antiguos sin romper datos existentes.

update public.map_places
set kind = 'spot'
where kind = 'place';

update public.map_places
set kind = 'trip_place'
where kind in ('beach', 'lodging');

alter table public.map_places
  drop constraint if exists map_places_kind_check;

alter table public.map_places
  add constraint map_places_kind_check
  check (kind in ('spot', 'restaurant', 'cafe', 'viewpoint', 'trip_place', 'custom'));
