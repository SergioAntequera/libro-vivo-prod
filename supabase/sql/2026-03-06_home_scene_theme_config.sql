-- Libro Vivo - Home scene theme config
-- Execute in Supabase SQL Editor after config foundation.

insert into public.catalogs (key, label, description, is_active)
values
  (
    'home_scene_theme',
    'Home - Tema del sendero',
    'Colores y assets decorativos del canvas principal del home',
    true
  )
on conflict (key) do update
set
  label = excluded.label,
  description = excluded.description,
  is_active = excluded.is_active;

insert into public.catalog_items (catalog_key, code, label, sort_order, enabled, color, icon, metadata)
values
  ('home_scene_theme', 'landscape_asset', 'Fondo sendero (asset)', 5, true, null, '/illustrations/packs/sunny-kids/landscape.svg', '{"value":"/illustrations/packs/sunny-kids/landscape.svg"}'::jsonb),
  ('home_scene_theme', 'sky_top', 'Cielo arriba', 10, true, '#d8f2ff', null, '{"value":"#d8f2ff"}'::jsonb),
  ('home_scene_theme', 'sky_mid', 'Cielo medio', 20, true, '#d6f5c7', null, '{"value":"#d6f5c7"}'::jsonb),
  ('home_scene_theme', 'sky_bottom', 'Cielo base', 30, true, '#bfe59a', null, '{"value":"#bfe59a"}'::jsonb),
  ('home_scene_theme', 'hill_left', 'Colina izquierda', 40, true, '#86c95e', null, '{"value":"#86c95e"}'::jsonb),
  ('home_scene_theme', 'hill_right', 'Colina derecha', 50, true, '#70b64f', null, '{"value":"#70b64f"}'::jsonb),
  ('home_scene_theme', 'meadow', 'Pradera principal', 60, true, '#5ca23f', null, '{"value":"#5ca23f"}'::jsonb),
  ('home_scene_theme', 'meadow_shadow', 'Pradera sombra', 70, true, '#6ab04c', null, '{"value":"#6ab04c"}'::jsonb),
  ('home_scene_theme', 'path_outer', 'Camino borde', 80, true, '#e1c28a', null, '{"value":"#e1c28a"}'::jsonb),
  ('home_scene_theme', 'path_inner', 'Camino interior', 90, true, '#f7e6bc', null, '{"value":"#f7e6bc"}'::jsonb),
  ('home_scene_theme', 'cloud_left_asset', 'Nube izquierda', 100, true, null, '/stickers/sticker_cloud.svg', '{"value":"/stickers/sticker_cloud.svg"}'::jsonb),
  ('home_scene_theme', 'cloud_right_asset', 'Nube derecha', 110, true, null, '/stickers/sticker_cloud.svg', '{"value":"/stickers/sticker_cloud.svg"}'::jsonb),
  ('home_scene_theme', 'deco_flower_left_asset', 'Flor decorativa izquierda', 120, true, null, '/illustrations/flowers/daisy.svg', '{"value":"/illustrations/flowers/daisy.svg"}'::jsonb),
  ('home_scene_theme', 'deco_flower_center_asset', 'Flor decorativa centro', 130, true, null, '/illustrations/flowers/rose.svg', '{"value":"/illustrations/flowers/rose.svg"}'::jsonb),
  ('home_scene_theme', 'deco_flower_right_asset', 'Flor decorativa derecha', 140, true, null, '/illustrations/flowers/tulip.svg', '{"value":"/illustrations/flowers/tulip.svg"}'::jsonb),
  ('home_scene_theme', 'seed_asset', 'Semilla sendero', 145, true, null, '/stickers/sticker_seed.svg', '{"value":"/stickers/sticker_seed.svg"}'::jsonb),
  ('home_scene_theme', 'event_seed_bg', 'Fondo chip semilla', 150, true, '#fff6de', null, '{"value":"#fff6de"}'::jsonb),
  ('home_scene_theme', 'event_flower_bg', 'Fondo chip flor', 160, true, '#fff7fb', null, '{"value":"#fff7fb"}'::jsonb),
  ('home_scene_theme', 'event_tree_bg', 'Fondo chip arbol', 170, true, '#f3f9ff', null, '{"value":"#f3f9ff"}'::jsonb)
on conflict (catalog_key, code) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  enabled = excluded.enabled,
  color = excluded.color,
  icon = excluded.icon,
  metadata = excluded.metadata;
