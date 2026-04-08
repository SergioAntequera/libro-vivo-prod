-- Libro Vivo - Care configurable catalogs/copy (Fase 4 extension)
-- Execute after 2026-03-05_config_foundation.sql

insert into public.catalogs (key, label, description, is_active)
values
  ('care_needs', 'Necesidades de Cuidado', 'Dimensiones de salud de la relacion usadas por el motor de cuidado', true),
  ('care_texts', 'Textos de Cuidado', 'Copys y plantillas del modulo de cuidado', true)
on conflict (key) do update
set
  label = excluded.label,
  description = excluded.description,
  is_active = excluded.is_active;

-- Ensure care action metadata contains model config (effects/target/score).
insert into public.catalog_items (catalog_key, code, label, sort_order, enabled, color, icon, metadata)
values
  ('care_actions', 'water', 'Regar', 10, true, '#eaf7ff', 'water', '{"emoji":"💧","target_need":"water","effects":{"water":24,"air":4},"decay_all":3,"score_bonus":6}'),
  ('care_actions', 'fertilize', 'Abonar', 20, true, '#f0fff4', 'fertilize', '{"emoji":"🌿","target_need":"soil","effects":{"soil":24,"water":4},"decay_all":3,"score_bonus":6}'),
  ('care_actions', 'light', 'Dar luz', 30, true, '#fff7e6', 'light', '{"emoji":"☀️","target_need":"light","effects":{"light":22,"air":6},"decay_all":3,"score_bonus":6}')
on conflict (catalog_key, code) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  enabled = excluded.enabled,
  color = excluded.color,
  icon = excluded.icon,
  metadata = excluded.metadata;

-- Needs catalog: label + hint used by "Pulso de hoy".
insert into public.catalog_items (catalog_key, code, label, sort_order, enabled, color, icon, metadata)
values
  ('care_needs', 'water', 'Agua', 10, true, '#eaf7ff', 'water', '{"emoji":"💧","hint":"Falta cercania y presencia."}'),
  ('care_needs', 'light', 'Luz', 20, true, '#fff7e6', 'light', '{"emoji":"☀️","hint":"Falta claridad y momentos bonitos."}'),
  ('care_needs', 'soil', 'Tierra', 30, true, '#f0fff4', 'soil', '{"emoji":"🌿","hint":"Falta base: rutina y acuerdos pequenos."}'),
  ('care_needs', 'air', 'Aire', 40, true, '#eef7ff', 'air', '{"emoji":"🌬️","hint":"Falta espacio para respirar y escucharse."}')
on conflict (catalog_key, code) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  enabled = excluded.enabled,
  color = excluded.color,
  icon = excluded.icon,
  metadata = excluded.metadata;

-- Copy/text templates for care UI.
insert into public.catalog_items (catalog_key, code, label, sort_order, enabled, color, icon, metadata)
values
  ('care_texts', 'title', 'Cuidar la flor', 10, true, null, null, '{}'),
  ('care_texts', 'subtitle', 'Rituales pequenos que suben la salud de la relacion.', 20, true, null, null, '{}'),
  ('care_texts', 'pulse_title', 'Pulso de hoy', 30, true, null, null, '{}'),
  ('care_texts', 'weakest_need_template', 'Lo mas flojo ahora es {needLabel} ({needValue}%). {needHint}', 40, true, null, null, '{}'),
  ('care_texts', 'streak_template', 'Racha actual: {days} {dayWord}', 50, true, null, null, '{}'),
  ('care_texts', 'day_word_singular', 'dia', 55, true, null, null, '{}'),
  ('care_texts', 'day_word_plural', 'dias', 56, true, null, null, '{}'),
  ('care_texts', 'suggestion_prefix', 'Sugerencia:', 60, true, null, null, '{}'),
  ('care_texts', 'history_title', 'Historial de cuidado', 70, true, null, null, '{}'),
  ('care_texts', 'history_empty', 'Aun no hay rituales aqui. Cuando uno cuide, quedara registrado.', 80, true, null, null, '{}'),
  ('care_texts', 'care_bar_title', 'Barra de cuidado', 90, true, null, null, '{}'),
  ('care_texts', 'avg_needs_template', 'Media necesidades: {avg}%', 100, true, null, null, '{}'),
  ('care_texts', 'note_placeholder', 'Nota (opcional): que hiciste y como te sentiste...', 110, true, null, null, '{}')
on conflict (catalog_key, code) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  enabled = excluded.enabled,
  color = excluded.color,
  icon = excluded.icon,
  metadata = excluded.metadata;
