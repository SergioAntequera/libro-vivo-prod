-- Libro Vivo - Pages location fields (memories map)
-- Ejecutar para habilitar GPS por recuerdo en public.pages.

alter table public.pages
  add column if not exists location_lat double precision;

alter table public.pages
  add column if not exists location_lng double precision;

alter table public.pages
  add column if not exists location_label text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pages_location_lat_range'
  ) then
    alter table public.pages
      add constraint pages_location_lat_range
      check (location_lat is null or (location_lat >= -90 and location_lat <= 90));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pages_location_lng_range'
  ) then
    alter table public.pages
      add constraint pages_location_lng_range
      check (location_lng is null or (location_lng >= -180 and location_lng <= 180));
  end if;
end;
$$;

create index if not exists idx_pages_location_lat_lng
  on public.pages (location_lat, location_lng)
  where location_lat is not null and location_lng is not null;
