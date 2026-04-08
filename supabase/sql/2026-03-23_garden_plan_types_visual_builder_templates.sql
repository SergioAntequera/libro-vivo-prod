-- Libro Vivo - Canonical builder templates for plan flowers and seeds
-- Makes plan-types the visual source of truth for seeds/flowers across product surfaces.

update public.garden_plan_types
set flower_asset_path =
  'builder://plan-flower?category={category}&element={element}&family={flower_family}&rating={rating}'
where flower_asset_path is null
   or trim(flower_asset_path) = ''
   or trim(flower_asset_path) in (
     '/illustrations/flowers/rose.svg',
     '/illustrations/flowers/tulip.svg',
     '/illustrations/flowers/daisy.svg',
     '/illustrations/flowers/sunflower.svg'
   );

update public.garden_plan_types
set seed_asset_path =
  'builder://plan-seed?category={category}&element={element}&family={flower_family}'
where seed_asset_path is null
   or trim(seed_asset_path) = ''
   or trim(seed_asset_path) = '/stickers/sticker_seed.svg';

comment on column public.garden_plan_types.flower_asset_path is
  'Acepta rutas directas, tokens {category}/{element}/{flower_family}/{rating} y builder://plan-flower?...';

comment on column public.garden_plan_types.seed_asset_path is
  'Acepta rutas directas, tokens {category}/{element}/{flower_family} y builder://plan-seed?...';
