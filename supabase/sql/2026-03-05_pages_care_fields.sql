-- Libro Vivo - Pages care fields (Fase 4 bootstrap)
-- Execute after base schema migration that creates public.pages.

alter table public.pages
  add column if not exists care_score int;

alter table public.pages
  add column if not exists care_needs jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pages_care_score_range'
  ) then
    alter table public.pages
      add constraint pages_care_score_range
      check (care_score is null or (care_score >= 0 and care_score <= 100));
  end if;
end;
$$;

alter table public.pages
  alter column care_score set default 55;

alter table public.pages
  alter column care_needs set default
    jsonb_build_object(
      'water', 55,
      'light', 55,
      'soil', 55,
      'air', 55
    );

-- Backfill from old mood model.
update public.pages
set care_score = case mood_state
  when 'wilted' then 20
  when 'shiny' then 85
  else 55
end
where care_score is null;

update public.pages
set care_needs = jsonb_build_object(
  'water', 55,
  'light', 55,
  'soil', 55,
  'air', 55
)
where care_needs is null
   or jsonb_typeof(care_needs) <> 'object';
