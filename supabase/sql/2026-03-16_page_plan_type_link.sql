alter table public.pages
  add column if not exists plan_type_id uuid references public.garden_plan_types(id) on delete set null;

create index if not exists pages_plan_type_id_idx on public.pages(plan_type_id);
