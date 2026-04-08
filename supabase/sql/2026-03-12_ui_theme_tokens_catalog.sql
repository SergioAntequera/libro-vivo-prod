-- Catalogo de tokens globales de UI (base UX comun)
-- Permite ajustar variables CSS lv-* desde /admin/catalogs sin tocar codigo.

insert into public.catalogs (key, label, description, is_active)
values (
  'ui_theme_tokens',
  'UI Theme Tokens',
  'Tokens globales de estilo para la capa UX comun (lv-*).',
  true
)
on conflict (key) do update
set
  label = excluded.label,
  description = excluded.description,
  is_active = true;

insert into public.catalog_items (
  catalog_key,
  code,
  label,
  sort_order,
  enabled,
  color,
  icon,
  metadata
)
values
  ('ui_theme_tokens', 'lv_bg', 'Fondo base', 10, true, '#f7f9f4', null, '{"value":"#f7f9f4"}'::jsonb),
  ('ui_theme_tokens', 'lv_surface', 'Superficie', 20, true, '#ffffff', null, '{"value":"#ffffff"}'::jsonb),
  ('ui_theme_tokens', 'lv_border', 'Borde suave', 30, true, '#cfd9cb', null, '{"value":"#cfd9cb"}'::jsonb),
  ('ui_theme_tokens', 'lv_text', 'Texto principal', 40, true, '#1b2518', null, '{"value":"#1b2518"}'::jsonb),
  ('ui_theme_tokens', 'lv_text_muted', 'Texto secundario', 50, true, '#5c685a', null, '{"value":"#5c685a"}'::jsonb),
  ('ui_theme_tokens', 'lv_primary', 'Primario', 60, true, '#2f5f44', null, '{"value":"#2f5f44"}'::jsonb),
  ('ui_theme_tokens', 'lv_primary_strong', 'Primario fuerte', 70, true, '#214530', null, '{"value":"#214530"}'::jsonb),
  ('ui_theme_tokens', 'lv_focus', 'Color focus', 80, true, '#4f76cf', null, '{"value":"#4f76cf"}'::jsonb),
  ('ui_theme_tokens', 'lv_info', 'Info', 90, true, '#1f4e84', null, '{"value":"#1f4e84"}'::jsonb),
  ('ui_theme_tokens', 'lv_success', 'Exito', 100, true, '#1f6b36', null, '{"value":"#1f6b36"}'::jsonb),
  ('ui_theme_tokens', 'lv_warning', 'Aviso', 110, true, '#8f6b1f', null, '{"value":"#8f6b1f"}'::jsonb),
  ('ui_theme_tokens', 'lv_danger', 'Error', 120, true, '#b33d3d', null, '{"value":"#b33d3d"}'::jsonb)
on conflict (catalog_key, code) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  enabled = true,
  color = excluded.color,
  metadata = excluded.metadata;
