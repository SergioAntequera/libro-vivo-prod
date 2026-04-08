-- Libro Vivo - Home art packs
-- Execute in Supabase SQL Editor after config foundation.

insert into public.catalogs (key, label, description, is_active)
values
  (
    'home_art_packs',
    'Home - Packs infantiles',
    'Presets de arte para aplicar escena, flores y arboles del sendero',
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
    'home_art_packs',
    'sunny_kids',
    'Sunny Kids',
    10,
    true,
    '#d8f2ff',
    '/illustrations/packs/sunny-kids/preview.svg',
    '{
      "description": "Pack infantil clasico con tonos pradera y flores suaves.",
      "preview_asset": "/illustrations/packs/sunny-kids/preview.svg",
      "scene": {
        "landscape_asset": "/illustrations/packs/sunny-kids/landscape.svg",
        "sky_top": "#d8f2ff",
        "sky_mid": "#d6f5c7",
        "sky_bottom": "#bfe59a",
        "hill_left": "#86c95e",
        "hill_right": "#70b64f",
        "meadow": "#5ca23f",
        "meadow_shadow": "#6ab04c",
        "path_outer": "#e1c28a",
        "path_inner": "#f7e6bc",
        "cloud_left_asset": "/illustrations/packs/sunny-kids/cloud.svg",
        "cloud_right_asset": "/illustrations/packs/sunny-kids/cloud.svg",
        "deco_flower_left_asset": "/illustrations/packs/sunny-kids/flower_daisy.svg",
        "deco_flower_center_asset": "/illustrations/packs/sunny-kids/flower_rose.svg",
        "deco_flower_right_asset": "/illustrations/packs/sunny-kids/flower_tulip.svg",
        "event_seed_bg": "#fff6de",
        "event_flower_bg": "#fff7fb",
        "event_tree_bg": "#f3f9ff",
        "seed_asset": "/illustrations/packs/sunny-kids/seed.svg"
      },
      "flowers": {
        "fire": "/illustrations/packs/sunny-kids/flower_rose.svg",
        "water": "/illustrations/packs/sunny-kids/flower_tulip.svg",
        "air": "/illustrations/packs/sunny-kids/flower_daisy.svg",
        "earth": "/illustrations/packs/sunny-kids/flower_sunflower.svg",
        "aether": "/illustrations/packs/sunny-kids/flower_rose.svg",
        "default": "/illustrations/packs/sunny-kids/flower_daisy.svg"
      },
      "trees": {
        "bronze": "/illustrations/packs/sunny-kids/tree_bronze.svg",
        "silver": "/illustrations/packs/sunny-kids/tree_silver.svg",
        "gold": "/illustrations/packs/sunny-kids/tree_gold.svg",
        "diamond": "/illustrations/packs/sunny-kids/tree_diamond.svg",
        "default": "/illustrations/packs/sunny-kids/tree_bronze.svg"
      }
    }'::jsonb
  ),
  (
    'home_art_packs',
    'candy_garden',
    'Candy Garden',
    20,
    true,
    '#ffe7fb',
    '/illustrations/packs/candy-garden/preview.svg',
    '{
      "description": "Pack pastel con tonos dulces y acentos rosados.",
      "preview_asset": "/illustrations/packs/candy-garden/preview.svg",
      "scene": {
        "landscape_asset": "/illustrations/packs/candy-garden/landscape.svg",
        "sky_top": "#ffe7fb",
        "sky_mid": "#e5f3ff",
        "sky_bottom": "#c9f5d5",
        "hill_left": "#9bd889",
        "hill_right": "#86ca79",
        "meadow": "#63ad4e",
        "meadow_shadow": "#76bb62",
        "path_outer": "#dcb486",
        "path_inner": "#f3dfc2",
        "cloud_left_asset": "/illustrations/packs/candy-garden/cloud.svg",
        "cloud_right_asset": "/illustrations/packs/candy-garden/cloud.svg",
        "deco_flower_left_asset": "/illustrations/packs/candy-garden/flower_daisy.svg",
        "deco_flower_center_asset": "/illustrations/packs/candy-garden/flower_rose.svg",
        "deco_flower_right_asset": "/illustrations/packs/candy-garden/flower_tulip.svg",
        "event_seed_bg": "#fff1dc",
        "event_flower_bg": "#fff0fa",
        "event_tree_bg": "#eef6ff",
        "seed_asset": "/illustrations/packs/candy-garden/seed.svg"
      },
      "flowers": {
        "fire": "/illustrations/packs/candy-garden/flower_rose.svg",
        "water": "/illustrations/packs/candy-garden/flower_tulip.svg",
        "air": "/illustrations/packs/candy-garden/flower_daisy.svg",
        "earth": "/illustrations/packs/candy-garden/flower_sunflower.svg",
        "aether": "/illustrations/packs/candy-garden/flower_tulip.svg",
        "default": "/illustrations/packs/candy-garden/flower_daisy.svg"
      },
      "trees": {
        "bronze": "/illustrations/packs/candy-garden/tree_bronze.svg",
        "silver": "/illustrations/packs/candy-garden/tree_silver.svg",
        "gold": "/illustrations/packs/candy-garden/tree_gold.svg",
        "diamond": "/illustrations/packs/candy-garden/tree_diamond.svg",
        "default": "/illustrations/packs/candy-garden/tree_bronze.svg"
      }
    }'::jsonb
  )
on conflict (catalog_key, code) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  enabled = excluded.enabled,
  color = excluded.color,
  icon = excluded.icon,
  metadata = excluded.metadata;
