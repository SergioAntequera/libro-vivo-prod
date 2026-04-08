-- Libro Vivo - Catalog for plan type flower slot assets

insert into public.catalogs (key, label, description, is_active)
values (
  'plan_type_flower_assets',
  'Assets florales de plan types',
  'Biblioteca persistida de assets para slots del compositor floral de plan-types.',
  true
)
on conflict (key) do update
set
  label = excluded.label,
  description = excluded.description,
  is_active = excluded.is_active;
