-- Libro Vivo - Progression graph canvas persistence
-- Dedicated table for the progression admin graph.

create table if not exists public.progression_graph_state (
  key text primary key default 'default',
  positions jsonb not null default '{}'::jsonb,
  links jsonb not null default '[]'::jsonb,
  relation_modes jsonb not null default '{}'::jsonb,
  tree_settings jsonb not null default '{}'::jsonb,
  condition_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_progression_graph_state_updated_at
  on public.progression_graph_state(updated_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_progression_graph_state_touch on public.progression_graph_state;
create trigger trg_progression_graph_state_touch
before update on public.progression_graph_state
for each row execute function public.touch_updated_at();

alter table public.progression_graph_state enable row level security;

drop policy if exists progression_graph_state_read_app on public.progression_graph_state;
create policy progression_graph_state_read_app on public.progression_graph_state
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

drop policy if exists progression_graph_state_insert_superadmin on public.progression_graph_state;
create policy progression_graph_state_insert_superadmin on public.progression_graph_state
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

drop policy if exists progression_graph_state_update_superadmin on public.progression_graph_state;
create policy progression_graph_state_update_superadmin on public.progression_graph_state
for update
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

drop policy if exists progression_graph_state_delete_superadmin on public.progression_graph_state;
create policy progression_graph_state_delete_superadmin on public.progression_graph_state
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

insert into public.progression_graph_state (key)
values ('default')
on conflict (key) do nothing;

with legacy_graph as (
  select ci.metadata
  from public.catalog_items ci
  where ci.catalog_key = 'progression_graph_state'
    and ci.code = 'default'
  limit 1
)
update public.progression_graph_state p
set
  positions = coalesce(legacy_graph.metadata -> 'positions', '{}'::jsonb),
  links = coalesce(legacy_graph.metadata -> 'links', '[]'::jsonb),
  relation_modes = coalesce(legacy_graph.metadata -> 'relationModes', '{}'::jsonb),
  tree_settings = coalesce(legacy_graph.metadata -> 'treeSettings', '{}'::jsonb),
  condition_settings = coalesce(legacy_graph.metadata -> 'conditionSettings', '{}'::jsonb)
from legacy_graph
where p.key = 'default'
  and p.positions = '{}'::jsonb
  and p.links = '[]'::jsonb
  and p.relation_modes = '{}'::jsonb
  and p.tree_settings = '{}'::jsonb
  and p.condition_settings = '{}'::jsonb;
