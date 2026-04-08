-- Libro Vivo - garden_year_tree_states
-- Fecha: 2026-04-08
--
-- Objetivo:
-- - crear una unica proyeccion anual canónica del arbol por `garden_id + year`
-- - recalcularla automaticamente cuando cambian `pages` o `progression_tree_unlocks`
-- - permitir que home, year, forest y PDF lean exactamente el mismo stage/fase
--
-- Nota:
-- - la verdad editorial sigue estando en `pages` y `progression_tree_unlocks`
-- - esta tabla es el read model oficial del arbol anual
-- - la semantica actual considera que toda pagina real del ano cuenta como flor vivida

create table if not exists public.garden_year_tree_states (
  garden_id uuid not null references public.gardens(id) on delete cascade,
  year integer not null check (year >= 1900 and year <= 2200),
  total_events integer not null default 0 check (total_events >= 0),
  active_days integer not null default 0 check (active_days >= 0),
  bloomed_events integer not null default 0 check (bloomed_events >= 0),
  shiny_events integer not null default 0 check (shiny_events >= 0),
  favorite_events integer not null default 0 check (favorite_events >= 0),
  avg_rating numeric(6,3) not null default 0,
  milestones_unlocked integer not null default 0 check (milestones_unlocked >= 0),
  growth_score numeric(8,3) not null default 0,
  stage integer not null default 0 check (stage >= 0 and stage <= 100),
  phase text not null default 'seed'
    check (phase in ('seed', 'germination', 'sprout', 'sapling', 'young', 'mature', 'blooming', 'legacy')),
  generated_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (garden_id, year)
);

create index if not exists idx_garden_year_tree_states_garden_year
  on public.garden_year_tree_states (garden_id, year desc);

drop trigger if exists trg_garden_year_tree_states_touch_updated_at on public.garden_year_tree_states;
create trigger trg_garden_year_tree_states_touch_updated_at
before update on public.garden_year_tree_states
for each row execute function public.touch_updated_at();

create or replace function public.annual_tree_phase_from_stage(stage_value integer)
returns text
language plpgsql
immutable
as $$
declare
  safe_stage integer := greatest(0, least(100, coalesce(stage_value, 0)));
begin
  if safe_stage <= 0 then return 'seed'; end if;
  if safe_stage <= 8 then return 'germination'; end if;
  if safe_stage <= 22 then return 'sprout'; end if;
  if safe_stage <= 38 then return 'sapling'; end if;
  if safe_stage <= 56 then return 'young'; end if;
  if safe_stage <= 74 then return 'mature'; end if;
  if safe_stage <= 90 then return 'blooming'; end if;
  return 'legacy';
end;
$$;

create or replace function public.recompute_garden_year_tree_state(
  target_garden_id uuid,
  target_year integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  year_start date;
  year_end date;
  year_start_ts timestamptz;
  year_end_ts timestamptz;
  v_total_events integer := 0;
  v_active_days integer := 0;
  v_bloomed_events integer := 0;
  v_shiny_events integer := 0;
  v_favorite_events integer := 0;
  v_avg_rating numeric(6,3) := 0;
  v_milestones_unlocked integer := 0;
  v_growth_score numeric(8,3) := 0;
  v_stage integer := 0;
  v_phase text := 'seed';
begin
  if target_garden_id is null or target_year is null or target_year < 1900 or target_year > 2200 then
    return;
  end if;

  year_start := make_date(target_year, 1, 1);
  year_end := make_date(target_year + 1, 1, 1);
  year_start_ts := make_timestamptz(target_year, 1, 1, 0, 0, 0, 'UTC');
  year_end_ts := make_timestamptz(target_year + 1, 1, 1, 0, 0, 0, 'UTC');

  select
    count(*)::integer as total_events,
    count(distinct p.date)::integer as active_days,
    count(*)::integer as bloomed_events,
    count(*) filter (where p.mood_state = 'shiny')::integer as shiny_events,
    count(*) filter (where coalesce(p.is_favorite, false))::integer as favorite_events,
    coalesce(avg(p.rating), 0)::numeric(6,3) as avg_rating
  into
    v_total_events,
    v_active_days,
    v_bloomed_events,
    v_shiny_events,
    v_favorite_events,
    v_avg_rating
  from public.pages p
  where p.garden_id = target_garden_id
    and p.date is not null
    and p.date >= year_start
    and p.date < year_end;

  select
    count(*)::integer
  into v_milestones_unlocked
  from public.progression_tree_unlocks u
  where u.garden_id = target_garden_id
    and u.claimed_at is not null
    and u.claimed_at >= year_start_ts
    and u.claimed_at < year_end_ts;

  if coalesce(v_total_events, 0) = 0 and coalesce(v_milestones_unlocked, 0) = 0 then
    delete from public.garden_year_tree_states
    where garden_id = target_garden_id
      and year = target_year;
    return;
  end if;

  v_growth_score :=
      least(coalesce(v_total_events, 0)::numeric / 72.0, 1) * 28
    + least(coalesce(v_active_days, 0)::numeric / 120.0, 1) * 20
    + least(coalesce(v_bloomed_events, 0)::numeric / 36.0, 1) * 16
    + least(coalesce(v_shiny_events, 0)::numeric / 24.0, 1) * 12
    + least(coalesce(v_favorite_events, 0)::numeric / 14.0, 1) * 8
    + least(coalesce(v_avg_rating, 0)::numeric / 4.5, 1) * 10
    + least(coalesce(v_milestones_unlocked, 0)::numeric / 8.0, 1) * 6;

  v_stage := greatest(0, least(100, round(v_growth_score)::integer));
  v_phase := public.annual_tree_phase_from_stage(v_stage);

  insert into public.garden_year_tree_states (
    garden_id,
    year,
    total_events,
    active_days,
    bloomed_events,
    shiny_events,
    favorite_events,
    avg_rating,
    milestones_unlocked,
    growth_score,
    stage,
    phase,
    generated_at
  )
  values (
    target_garden_id,
    target_year,
    coalesce(v_total_events, 0),
    coalesce(v_active_days, 0),
    coalesce(v_bloomed_events, 0),
    coalesce(v_shiny_events, 0),
    coalesce(v_favorite_events, 0),
    coalesce(v_avg_rating, 0),
    coalesce(v_milestones_unlocked, 0),
    coalesce(v_growth_score, 0),
    v_stage,
    v_phase,
    timezone('utc', now())
  )
  on conflict (garden_id, year) do update
  set
    total_events = excluded.total_events,
    active_days = excluded.active_days,
    bloomed_events = excluded.bloomed_events,
    shiny_events = excluded.shiny_events,
    favorite_events = excluded.favorite_events,
    avg_rating = excluded.avg_rating,
    milestones_unlocked = excluded.milestones_unlocked,
    growth_score = excluded.growth_score,
    stage = excluded.stage,
    phase = excluded.phase,
    generated_at = excluded.generated_at,
    updated_at = timezone('utc', now());
end;
$$;

create or replace function public.rebuild_all_garden_year_tree_states()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target record;
begin
  delete from public.garden_year_tree_states;

  for target in (
    select distinct
      p.garden_id,
      extract(year from p.date)::integer as year
    from public.pages p
    where p.garden_id is not null
      and p.date is not null

    union

    select distinct
      u.garden_id,
      extract(year from timezone('utc', u.claimed_at))::integer as year
    from public.progression_tree_unlocks u
    where u.garden_id is not null
      and u.claimed_at is not null
  )
  loop
    perform public.recompute_garden_year_tree_state(target.garden_id, target.year);
  end loop;
end;
$$;

create or replace function public.tg_recompute_garden_year_tree_state_from_pages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_year integer := case when tg_op in ('UPDATE', 'DELETE') and old.date is not null then extract(year from old.date)::integer else null end;
  new_year integer := case when tg_op in ('INSERT', 'UPDATE') and new.date is not null then extract(year from new.date)::integer else null end;
begin
  if tg_op in ('UPDATE', 'DELETE') and old.garden_id is not null and old_year is not null then
    perform public.recompute_garden_year_tree_state(old.garden_id, old_year);
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.garden_id is not null and new_year is not null then
    if tg_op <> 'UPDATE'
       or old.garden_id is distinct from new.garden_id
       or old_year is distinct from new_year then
      perform public.recompute_garden_year_tree_state(new.garden_id, new_year);
    elsif tg_op = 'UPDATE' then
      perform public.recompute_garden_year_tree_state(new.garden_id, new_year);
    end if;
  end if;

  return null;
end;
$$;

create or replace function public.tg_recompute_garden_year_tree_state_from_unlocks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_year integer := case when tg_op in ('UPDATE', 'DELETE') and old.claimed_at is not null then extract(year from timezone('utc', old.claimed_at))::integer else null end;
  new_year integer := case when tg_op in ('INSERT', 'UPDATE') and new.claimed_at is not null then extract(year from timezone('utc', new.claimed_at))::integer else null end;
begin
  if tg_op in ('UPDATE', 'DELETE') and old.garden_id is not null and old_year is not null then
    perform public.recompute_garden_year_tree_state(old.garden_id, old_year);
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.garden_id is not null and new_year is not null then
    if tg_op <> 'UPDATE'
       or old.garden_id is distinct from new.garden_id
       or old_year is distinct from new_year then
      perform public.recompute_garden_year_tree_state(new.garden_id, new_year);
    elsif tg_op = 'UPDATE' then
      perform public.recompute_garden_year_tree_state(new.garden_id, new_year);
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_pages_recompute_garden_year_tree_state_write on public.pages;
create trigger trg_pages_recompute_garden_year_tree_state_write
after insert or update of garden_id, date, rating, mood_state, is_favorite
on public.pages
for each row
execute function public.tg_recompute_garden_year_tree_state_from_pages();

drop trigger if exists trg_pages_recompute_garden_year_tree_state_delete on public.pages;
create trigger trg_pages_recompute_garden_year_tree_state_delete
after delete on public.pages
for each row
execute function public.tg_recompute_garden_year_tree_state_from_pages();

drop trigger if exists trg_progression_tree_unlocks_recompute_garden_year_tree_state_write on public.progression_tree_unlocks;
create trigger trg_progression_tree_unlocks_recompute_garden_year_tree_state_write
after insert or update of garden_id, claimed_at
on public.progression_tree_unlocks
for each row
execute function public.tg_recompute_garden_year_tree_state_from_unlocks();

drop trigger if exists trg_progression_tree_unlocks_recompute_garden_year_tree_state_delete on public.progression_tree_unlocks;
create trigger trg_progression_tree_unlocks_recompute_garden_year_tree_state_delete
after delete on public.progression_tree_unlocks
for each row
execute function public.tg_recompute_garden_year_tree_state_from_unlocks();

alter table public.garden_year_tree_states enable row level security;

drop policy if exists garden_year_tree_states_read_member on public.garden_year_tree_states;
create policy garden_year_tree_states_read_member on public.garden_year_tree_states
for select
to authenticated
using (
  exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = garden_year_tree_states.garden_id
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

drop policy if exists garden_year_tree_states_write_superadmin on public.garden_year_tree_states;
create policy garden_year_tree_states_write_superadmin on public.garden_year_tree_states
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

select public.rebuild_all_garden_year_tree_states();
