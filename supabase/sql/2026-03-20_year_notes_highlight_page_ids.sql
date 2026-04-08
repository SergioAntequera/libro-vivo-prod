alter table if exists public.year_notes
  add column if not exists highlight_page_ids jsonb not null default '[]'::jsonb;

update public.year_notes
set highlight_page_ids = '[]'::jsonb
where highlight_page_ids is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'year_notes_highlight_page_ids_is_array'
  ) then
    alter table public.year_notes
      add constraint year_notes_highlight_page_ids_is_array
      check (jsonb_typeof(highlight_page_ids) = 'array');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'year_notes_highlight_page_ids_limit'
  ) then
    alter table public.year_notes
      add constraint year_notes_highlight_page_ids_limit
      check (jsonb_array_length(highlight_page_ids) <= 3);
  end if;
end
$$;
