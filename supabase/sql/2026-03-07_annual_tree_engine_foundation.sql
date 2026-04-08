-- Libro Vivo - Annual Tree Engine foundation
-- Mini-proyecto para convertir el arbol anual en pilar del bosque historico.
-- Incluye:
-- - perfiles configurables de crecimiento (targets + weights + visual)
-- - snapshots anuales para cache/auditoria
-- - vista de metricas por ano

create table if not exists public.annual_tree_growth_profiles (
  key text primary key,
  label text not null,
  is_active boolean not null default true,
  targets jsonb not null default '{}'::jsonb,
  weights jsonb not null default '{}'::jsonb,
  visual jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.annual_tree_snapshots (
  year int primary key,
  profile_key text not null references public.annual_tree_growth_profiles(key),
  stage int not null check (stage >= 0 and stage <= 100),
  growth_score numeric(6,3) not null default 0,
  phase text not null default 'seed',
  metrics jsonb not null default '{}'::jsonb,
  frame jsonb not null default '{}'::jsonb,
  source_hash text null,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_annual_tree_snapshots_profile
  on public.annual_tree_snapshots(profile_key);

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'touch_updated_at'
      and pronamespace = 'public'::regnamespace
  ) then
    execute 'drop trigger if exists trg_annual_tree_growth_profiles_touch on public.annual_tree_growth_profiles';
    execute 'create trigger trg_annual_tree_growth_profiles_touch before update on public.annual_tree_growth_profiles for each row execute function public.touch_updated_at()';
    execute 'drop trigger if exists trg_annual_tree_snapshots_touch on public.annual_tree_snapshots';
    execute 'create trigger trg_annual_tree_snapshots_touch before update on public.annual_tree_snapshots for each row execute function public.touch_updated_at()';
  end if;
end $$;

insert into public.annual_tree_growth_profiles (
  key,
  label,
  is_active,
  targets,
  weights,
  visual
)
values (
  'default',
  'Default annual growth',
  true,
  '{
    "totalEvents": 72,
    "activeDays": 120,
    "bloomedEvents": 36,
    "shinyEvents": 24,
    "favoriteEvents": 14,
    "avgRating": 4.5,
    "milestonesUnlocked": 8
  }'::jsonb,
  '{
    "totalEvents": 0.28,
    "activeDays": 0.20,
    "bloomedEvents": 0.16,
    "shinyEvents": 0.12,
    "favoriteEvents": 0.08,
    "avgRating": 0.10,
    "milestonesUnlocked": 0.06
  }'::jsonb,
  '{
    "stageCount": 101,
    "frameSeed": "year_based",
    "notes": "Each stage (0..100) yields a deterministic frame."
  }'::jsonb
)
on conflict (key) do update
set
  label = excluded.label,
  is_active = excluded.is_active,
  targets = excluded.targets,
  weights = excluded.weights,
  visual = excluded.visual;

create or replace view public.annual_tree_year_metrics as
select
  extract(year from p.date)::int as year,
  count(*)::int as total_events,
  count(distinct p.date)::int as active_days,
  count(*) filter (where p.planned_from_seed_id is not null)::int as bloomed_events,
  count(*) filter (where p.mood_state = 'shiny')::int as shiny_events,
  count(*) filter (where coalesce(p.is_favorite, false))::int as favorite_events,
  coalesce(avg(p.rating), 0)::numeric(6,3) as avg_rating
from public.pages p
where p.date is not null
group by extract(year from p.date)::int;

alter table public.annual_tree_growth_profiles enable row level security;
alter table public.annual_tree_snapshots enable row level security;

drop policy if exists annual_tree_profiles_read_app on public.annual_tree_growth_profiles;
create policy annual_tree_profiles_read_app
  on public.annual_tree_growth_profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('gardener_a', 'gardener_b', 'superadmin')
    )
  );

drop policy if exists annual_tree_profiles_write_superadmin on public.annual_tree_growth_profiles;
create policy annual_tree_profiles_write_superadmin
  on public.annual_tree_growth_profiles
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superadmin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superadmin'
    )
  );

drop policy if exists annual_tree_snapshots_read_app on public.annual_tree_snapshots;
create policy annual_tree_snapshots_read_app
  on public.annual_tree_snapshots
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('gardener_a', 'gardener_b', 'superadmin')
    )
  );

drop policy if exists annual_tree_snapshots_write_superadmin on public.annual_tree_snapshots;
create policy annual_tree_snapshots_write_superadmin
  on public.annual_tree_snapshots
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superadmin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superadmin'
    )
  );

