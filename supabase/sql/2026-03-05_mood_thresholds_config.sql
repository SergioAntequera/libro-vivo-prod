-- Libro Vivo - Mood thresholds configurable (Fase 4 extension)
-- Execute after 2026-03-05_config_foundation.sql

insert into public.catalogs (key, label, description, is_active)
values
  (
    'mood_thresholds',
    'Umbrales de Mood',
    'Rangos de score para mapear estado de la flor (wilted/healthy/shiny)',
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
    'mood_thresholds',
    'wilted',
    'Mustia',
    10,
    true,
    '#ffe8e8',
    'wilted',
    '{"min_score":0,"max_score":34,"anchor_score":20}'
  ),
  (
    'mood_thresholds',
    'healthy',
    'Sana',
    20,
    true,
    '#f0fff4',
    'healthy',
    '{"min_score":35,"max_score":74,"anchor_score":55}'
  ),
  (
    'mood_thresholds',
    'shiny',
    'Brillante',
    30,
    true,
    '#fff7e6',
    'shiny',
    '{"min_score":75,"max_score":100,"anchor_score":85}'
  )
on conflict (catalog_key, code) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  enabled = excluded.enabled,
  color = excluded.color,
  icon = excluded.icon,
  metadata = excluded.metadata;
