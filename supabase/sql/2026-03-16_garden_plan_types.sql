-- Libro Vivo - Garden plan types library

create extension if not exists pgcrypto;

create table if not exists public.garden_plan_types (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  code text not null,
  label text not null,
  category text not null default 'custom',
  description text null,
  suggested_element text not null default 'aether'
    check (suggested_element in ('fire', 'water', 'air', 'earth', 'aether')),
  icon_emoji text null,
  flower_asset_path text null,
  seed_asset_path text null,
  is_custom boolean not null default false,
  sort_order integer not null default 100,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  updated_by_user_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz null,
  unique (garden_id, code)
);

create index if not exists idx_garden_plan_types_garden_sort
  on public.garden_plan_types (garden_id, archived_at, sort_order, created_at desc);

alter table public.seeds
  add column if not exists plan_type_id uuid null references public.garden_plan_types(id) on delete set null;

create index if not exists idx_seeds_plan_type_id
  on public.seeds(plan_type_id);

drop trigger if exists trg_garden_plan_types_touch_updated_at on public.garden_plan_types;
create trigger trg_garden_plan_types_touch_updated_at
before update on public.garden_plan_types
for each row execute function public.touch_updated_at();

alter table if exists public.garden_plan_types enable row level security;

drop policy if exists garden_plan_types_read_member on public.garden_plan_types;
create policy garden_plan_types_read_member on public.garden_plan_types
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = garden_plan_types.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

drop policy if exists garden_plan_types_insert_editor on public.garden_plan_types;
create policy garden_plan_types_insert_editor on public.garden_plan_types
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superadmin'
    )
    or exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = garden_plan_types.garden_id
        and gm.user_id = auth.uid()
        and gm.left_at is null
        and gm.member_role in ('owner', 'editor')
    )
  )
);

drop policy if exists garden_plan_types_update_editor on public.garden_plan_types;
create policy garden_plan_types_update_editor on public.garden_plan_types
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
  or exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = garden_plan_types.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
      and gm.member_role in ('owner', 'editor')
  )
)
with check (
  (updated_by_user_id is null or updated_by_user_id = auth.uid())
  and (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superadmin'
    )
    or exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = garden_plan_types.garden_id
        and gm.user_id = auth.uid()
        and gm.left_at is null
        and gm.member_role in ('owner', 'editor')
    )
  )
);

drop policy if exists garden_plan_types_delete_editor on public.garden_plan_types;
create policy garden_plan_types_delete_editor on public.garden_plan_types
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
  or exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = garden_plan_types.garden_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
      and gm.member_role in ('owner', 'editor')
  )
);

insert into public.garden_plan_types (
  garden_id,
  code,
  label,
  category,
  description,
  suggested_element,
  icon_emoji,
  is_custom,
  sort_order,
  created_by_user_id
)
select
  g.id,
  preset.code,
  preset.label,
  preset.category,
  preset.description,
  preset.suggested_element,
  preset.icon_emoji,
  false,
  preset.sort_order,
  gm.user_id
from public.gardens g
join lateral (
  select gm.user_id
  from public.garden_members gm
  where gm.garden_id = g.id
    and gm.left_at is null
  order by
    case gm.member_role when 'owner' then 0 when 'editor' then 1 else 2 end,
    gm.joined_at asc
  limit 1
) gm on true
cross join (
  values
    ('salida_general','Salida','salida','Quedar, salir y romper rutina.','air',null,10),
    ('paseo','Paseo','salida','Salir a caminar sin mas.','air',null,20),
    ('parque','Parque','salida','Una tarde ligera fuera de casa.','air',null,30),
    ('terraza','Terraza','salida','Plan de charla y algo rico.','air',null,40),
    ('playa','Playa','naturaleza','Mar, arena y tiempo juntos.','water',null,50),
    ('campo','Campo','naturaleza','Salir a verde y respirar.','earth',null,60),
    ('picnic','Picnic','naturaleza','Comida tranquila al aire libre.','earth',null,70),
    ('mirador','Mirador','naturaleza','Un sitio bonito al que volver.','air',null,80),
    ('senderismo','Senderismo','movimiento','Ruta andando por naturaleza.','earth',null,90),
    ('ruta','Ruta','movimiento','Recorrido con origen y destino.','earth',null,100),
    ('bici','Montar en bici','movimiento','Plan sobre ruedas.','air',null,110),
    ('deporte','Deporte juntos','movimiento','Moverse y activarse.','air',null,120),
    ('desayuno','Desayuno','comida','Empezar el dia con algo rico.','fire',null,130),
    ('brunch','Brunch','comida','Plan lento de media manana.','fire',null,140),
    ('cafe','Cafe','comida','Parar, hablar y mirarse.','fire',null,150),
    ('vermut','Vermut','comida','Salir a tomar algo juntos.','fire',null,160),
    ('restaurante','Restaurante','comida','Comida o cena especial.','fire',null,170),
    ('cena','Cena','comida','Plan para comer sin prisa.','fire',null,180),
    ('noche_casa','Plan en casa','casa','Momentos tranquilos y calentitos.','fire',null,190),
    ('cocinar_juntos','Cocinar juntos','casa','Hacer algo rico entre dos.','fire',null,200),
    ('peli','Peli o serie','casa','Tiempo de sofa y manta.','fire',null,210),
    ('juegos','Juegos de mesa','casa','Reirse, picarse y compartir.','fire',null,220),
    ('lectura','Lectura compartida','casa','Un rato suave y lento.','aether',null,230),
    ('cine','Cine','cultura','Salir a ver una historia juntos.','aether',null,240),
    ('concierto','Concierto','cultura','Musica y recuerdo fuerte.','fire',null,250),
    ('museo','Museo','cultura','Plan de descubrir algo nuevo.','aether',null,260),
    ('feria','Feria o evento','cultura','Salir a algo especial.','fire',null,270),
    ('escapada','Escapada','escapada','Salir fuera y romper escenario.','earth',null,280),
    ('viaje','Viaje','escapada','Moverse mas lejos y vivir algo grande.','aether',null,290),
    ('road_trip','Road trip','escapada','Ruta de coche con varias paradas.','air',null,300),
    ('tren','Viaje en tren','escapada','Trayecto bonito para recordar.','air',null,310),
    ('celebracion','Celebracion','celebracion','Un dia que merece marcarse.','fire',null,320),
    ('aniversario','Aniversario','celebracion','Un hito emocional del jardin.','aether',null,330),
    ('sorpresa','Sorpresa','celebracion','Plan pensado para emocionar.','aether',null,340)
) as preset(code, label, category, description, suggested_element, icon_emoji, sort_order)
on conflict (garden_id, code) do nothing;
