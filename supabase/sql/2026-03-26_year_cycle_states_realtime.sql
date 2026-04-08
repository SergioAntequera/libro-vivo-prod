-- Year cycle states realtime publication
-- Ensures year close/open notifications can propagate through Supabase Realtime.

do $$
begin
  if not exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    raise notice 'Skipping realtime publication: supabase_realtime does not exist.';
    return;
  end if;

  begin
    execute 'alter publication supabase_realtime add table public.year_cycle_states';
  exception
    when duplicate_object then
      null;
  end;
end;
$$;
