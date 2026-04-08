alter table public.pages
  add column if not exists plan_summary text null;
