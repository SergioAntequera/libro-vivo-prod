-- Libro Vivo - Catalogos editables para la semantica del mapa
-- Fecha: 2026-03-20
--
-- Objetivo:
-- - Convertir tipos, estados y lentes del mapa en catalogos editables.
-- - Dejar de bloquear `map_places.kind` y `map_places.state` con listas fijas en SQL.
-- - Sembrar los items iniciales sin pisar personalizaciones ya hechas.

insert into public.catalogs (key, label, description, is_active)
values
  (
    'map_place_kinds',
    'Tipos de lugar',
    'Semantica editable de pins y clases de lugar del mapa.',
    true
  ),
  (
    'map_place_states',
    'Estados del lugar',
    'Semantica editable de estados visibles del mapa.',
    true
  ),
  (
    'map_lenses',
    'Lentes del mapa',
    'Semantica editable de las vistas principales y secundarias del mapa.',
    true
  )
on conflict (key) do update
set
  label = excluded.label,
  description = excluded.description,
  is_active = excluded.is_active;

insert into public.catalog_items (catalog_key, code, label, sort_order, enabled, color, icon, metadata)
values
  (
    'map_place_kinds',
    'spot',
    'Sitio',
    10,
    true,
    '#1f2937',
    '📍',
    jsonb_build_object(
      'description', 'Lugar general guardado dentro del mapa compartido.',
      'glyph', '📍'
    )
  ),
  (
    'map_place_kinds',
    'restaurant',
    'Restaurante',
    20,
    true,
    '#2563eb',
    '🍽',
    jsonb_build_object(
      'description', 'Comida, cena o restaurante para repetir.',
      'glyph', '🍽'
    )
  ),
  (
    'map_place_kinds',
    'cafe',
    'Cafe',
    30,
    true,
    '#7c3f00',
    '☕',
    jsonb_build_object(
      'description', 'Cafe, brunch o parada ligera.',
      'glyph', '☕'
    )
  ),
  (
    'map_place_kinds',
    'viewpoint',
    'Mirador',
    40,
    true,
    '#0f766e',
    '🗻',
    jsonb_build_object(
      'description', 'Vistas, paseos altos o lugares contemplativos.',
      'glyph', '🗻'
    )
  ),
  (
    'map_place_kinds',
    'trip_place',
    'Escapada',
    50,
    true,
    '#7c3aed',
    '🧳',
    jsonb_build_object(
      'description', 'Lugar de viaje, hotel o punto importante de escapada.',
      'glyph', '🧳'
    )
  ),
  (
    'map_place_kinds',
    'custom',
    'Especial',
    60,
    true,
    '#475569',
    '✦',
    jsonb_build_object(
      'description', 'Tipo especial o simbolico del mapa.',
      'glyph', '✦'
    )
  ),
  (
    'map_place_states',
    'saved',
    'Guardado',
    10,
    true,
    '#64748b',
    '📌',
    jsonb_build_object(
      'description', 'Lugar guardado sin prioridad especial.'
    )
  ),
  (
    'map_place_states',
    'favorite',
    'Favorito',
    20,
    true,
    '#c27a00',
    '♥',
    jsonb_build_object(
      'description', 'Lugar importante para repetir o cuidar.'
    )
  ),
  (
    'map_place_states',
    'wishlist',
    'Por visitar',
    30,
    true,
    '#2563eb',
    '◷',
    jsonb_build_object(
      'description', 'Lugar pendiente dentro del jardin compartido.'
    )
  ),
  (
    'map_place_states',
    'visited',
    'Visitado',
    40,
    true,
    '#0f766e',
    '✓',
    jsonb_build_object(
      'description', 'Lugar ya vivido y confirmado.'
    )
  ),
  (
    'map_place_states',
    'archived',
    'Archivado',
    50,
    true,
    '#94a3b8',
    '○',
    jsonb_build_object(
      'description', 'Lugar oculto o retirado de la lectura principal.'
    )
  ),
  (
    'map_lenses',
    'explore',
    'Mapa',
    10,
    true,
    '#d9efe3',
    '🧭',
    jsonb_build_object(
      'description', 'Busca una direccion, revisa lugares guardados o entra en rutas.',
      'group', 'primary'
    )
  ),
  (
    'map_lenses',
    'saved',
    'Guardados',
    20,
    true,
    '#eef6ea',
    '📌',
    jsonb_build_object(
      'description', 'Lugares que quereis repetir, cuidar o tener siempre a mano.',
      'group', 'primary'
    )
  ),
  (
    'map_lenses',
    'routes',
    'Rutas',
    30,
    true,
    '#eef6ea',
    '🥾',
    jsonb_build_object(
      'description', 'Paseos y recorridos que forman parte de vuestra historia compartida.',
      'group', 'primary'
    )
  ),
  (
    'map_lenses',
    'favorites',
    'Favoritos',
    40,
    true,
    '#fff4dc',
    '💛',
    jsonb_build_object(
      'description', 'Guardados que quereis cuidar como sitios especialmente vuestros.',
      'group', 'secondary'
    )
  ),
  (
    'map_lenses',
    'restaurants',
    'Restaurantes',
    50,
    true,
    '#eef6ff',
    '🍽',
    jsonb_build_object(
      'description', 'Guardados de comida, cafe y cenas que merece la pena repetir.',
      'group', 'secondary'
    )
  ),
  (
    'map_lenses',
    'lived',
    'Lugares vividos',
    60,
    true,
    '#eef6ea',
    '🌼',
    jsonb_build_object(
      'description', 'Lugares ya vividos dentro de vuestra historia compartida.',
      'group', 'secondary'
    )
  ),
  (
    'map_lenses',
    'symbolic',
    'Zonas simbolicas',
    70,
    true,
    '#f4efff',
    '✨',
    jsonb_build_object(
      'description', 'Sitios y zonas con una carga emocional o simbolica clara.',
      'group', 'secondary'
    )
  )
on conflict (catalog_key, code) do nothing;

alter table public.map_places
  drop constraint if exists map_places_kind_check;

alter table public.map_places
  drop constraint if exists map_places_state_check;

alter table public.map_places
  add constraint map_places_kind_check
  check (nullif(btrim(kind), '') is not null);

alter table public.map_places
  add constraint map_places_state_check
  check (nullif(btrim(state), '') is not null);
