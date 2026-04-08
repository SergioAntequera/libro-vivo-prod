-- Libro Vivo - Home visual species config
-- Execute in Supabase SQL Editor after config foundation.

insert into public.catalogs (key, label, description, is_active)
values
  (
    'home_flower_species',
    'Home - Flores por elemento',
    'Define la especie/icono de flor usada en el sendero cuando una semilla florece',
    true
  ),
  (
    'home_tree_species',
    'Home - Arboles por tier',
    'Define la especie/icono de arbol usada en el sendero para hitos',
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
    'home_flower_species',
    'fire',
    'Flor de fuego',
    10,
    true,
    '#ffd8d0',
    '/illustrations/flowers/rose.svg',
    '{"element":"fire","asset_path":"/illustrations/flowers/rose.svg"}'::jsonb
  ),
  (
    'home_flower_species',
    'water',
    'Flor de agua',
    20,
    true,
    '#d8ecff',
    '/illustrations/flowers/tulip.svg',
    '{"element":"water","asset_path":"/illustrations/flowers/tulip.svg"}'::jsonb
  ),
  (
    'home_flower_species',
    'air',
    'Flor de aire',
    30,
    true,
    '#e7f5ff',
    '/illustrations/flowers/daisy.svg',
    '{"element":"air","asset_path":"/illustrations/flowers/daisy.svg"}'::jsonb
  ),
  (
    'home_flower_species',
    'earth',
    'Flor de tierra',
    40,
    true,
    '#f6e7d1',
    '/illustrations/flowers/sunflower.svg',
    '{"element":"earth","asset_path":"/illustrations/flowers/sunflower.svg"}'::jsonb
  ),
  (
    'home_flower_species',
    'aether',
    'Flor de eter',
    50,
    true,
    '#efe4ff',
    '/illustrations/flowers/rose.svg',
    '{"element":"aether","asset_path":"/illustrations/flowers/rose.svg"}'::jsonb
  ),
  (
    'home_flower_species',
    'default',
    'Flor por defecto',
    90,
    true,
    '#f4f4f4',
    '/illustrations/flowers/daisy.svg',
    '{"element":"default","asset_path":"/illustrations/flowers/daisy.svg"}'::jsonb
  ),
  (
    'home_tree_species',
    'bronze',
    'Arbol bronze',
    10,
    true,
    '#f8dfcc',
    '/stickers/sticker_tree_bronze.svg',
    '{"tier":"bronze","asset_path":"/stickers/sticker_tree_bronze.svg"}'::jsonb
  ),
  (
    'home_tree_species',
    'silver',
    'Arbol silver',
    20,
    true,
    '#deecfb',
    '/stickers/sticker_tree_silver.svg',
    '{"tier":"silver","asset_path":"/stickers/sticker_tree_silver.svg"}'::jsonb
  ),
  (
    'home_tree_species',
    'gold',
    'Arbol gold',
    30,
    true,
    '#fff1c5',
    '/stickers/sticker_tree_gold.svg',
    '{"tier":"gold","asset_path":"/stickers/sticker_tree_gold.svg"}'::jsonb
  ),
  (
    'home_tree_species',
    'diamond',
    'Arbol diamond',
    40,
    true,
    '#eadfff',
    '/stickers/sticker_tree_diamond.svg',
    '{"tier":"diamond","asset_path":"/stickers/sticker_tree_diamond.svg"}'::jsonb
  ),
  (
    'home_tree_species',
    'default',
    'Arbol por defecto',
    90,
    true,
    '#f4f4f4',
    '/stickers/sticker_tree_bronze.svg',
    '{"tier":"default","asset_path":"/stickers/sticker_tree_bronze.svg"}'::jsonb
  )
on conflict (catalog_key, code) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  enabled = excluded.enabled,
  color = excluded.color,
  icon = excluded.icon,
  metadata = excluded.metadata;
