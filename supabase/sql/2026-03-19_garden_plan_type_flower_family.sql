alter table public.garden_plan_types
  add column if not exists flower_family text;

update public.garden_plan_types
set flower_family = case
  when code in ('playa') then 'agua'
  when code in ('desayuno', 'brunch', 'cafe', 'vermut', 'restaurante', 'cena', 'concierto') then 'fuego'
  when code in ('campo', 'picnic', 'senderismo', 'ruta', 'cocinar_juntos') then 'tierra'
  when code in ('salida_general', 'paseo', 'parque', 'terraza', 'mirador', 'bici', 'deporte', 'escapada', 'viaje', 'road_trip', 'tren') then 'aire'
  when code in ('feria', 'celebracion', 'aniversario') then 'luz'
  when code in ('noche_casa', 'peli', 'juegos', 'lectura', 'cine') then 'luna'
  when code in ('museo', 'sorpresa') then 'estrella'
  when suggested_element = 'water' then 'agua'
  when suggested_element = 'fire' then 'fuego'
  when suggested_element = 'earth' then 'tierra'
  when suggested_element = 'air' then 'aire'
  else 'estrella'
end
where flower_family is null
  or trim(flower_family) = '';

alter table public.garden_plan_types
  alter column flower_family set default 'estrella';

alter table public.garden_plan_types
  drop constraint if exists garden_plan_types_flower_family_check;

alter table public.garden_plan_types
  add constraint garden_plan_types_flower_family_check
  check (flower_family in ('agua', 'fuego', 'tierra', 'aire', 'luz', 'luna', 'estrella'));

alter table public.garden_plan_types
  alter column flower_family set not null;

comment on column public.garden_plan_types.flower_family is
  'Familia botanica canonica del tipo de plan. Manda la semantica visual compartida del producto.';
