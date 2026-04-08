-- Libro Vivo - Link seeds to saved places and routes

alter table public.seeds
  add column if not exists map_place_id uuid null references public.map_places(id) on delete set null,
  add column if not exists map_route_id uuid null references public.map_routes(id) on delete set null;

create index if not exists idx_seeds_map_place_id
  on public.seeds(map_place_id);

create index if not exists idx_seeds_map_route_id
  on public.seeds(map_route_id);
