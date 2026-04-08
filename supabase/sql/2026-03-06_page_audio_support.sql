-- Libro Vivo - Page audio support
-- Execute in Supabase SQL Editor
--
-- Adds:
-- - columns in public.pages for audio metadata
-- - storage bucket page-audio
-- - guarded RLS policies for audio objects
--
-- Path convention expected by app:
-- - page-audio: pages/<page_id>/<random-file>

alter table if exists public.pages
  add column if not exists audio_url text,
  add column if not exists audio_label text;

insert into storage.buckets (id, name, public)
values ('page-audio', 'page-audio', true)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;

drop policy if exists page_audio_read_public on storage.objects;
drop policy if exists page_audio_insert_guarded on storage.objects;
drop policy if exists page_audio_update_guarded on storage.objects;
drop policy if exists page_audio_delete_guarded on storage.objects;

create policy page_audio_read_public on storage.objects
for select
to public
using (bucket_id = 'page-audio');

create policy page_audio_insert_guarded on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'page-audio'
  and split_part(name, '/', 1) = 'pages'
  and split_part(name, '/', 2) <> ''
  and split_part(name, '/', 3) <> ''
  and exists (
    select 1
    from public.pages pg
    where pg.id::text = split_part(name, '/', 2)
  )
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('gardener_a', 'gardener_b', 'superadmin')
  )
);

create policy page_audio_update_guarded on storage.objects
for update
to authenticated
using (
  bucket_id = 'page-audio'
  and split_part(name, '/', 1) = 'pages'
  and split_part(name, '/', 2) <> ''
  and split_part(name, '/', 3) <> ''
  and exists (
    select 1
    from public.pages pg
    where pg.id::text = split_part(name, '/', 2)
  )
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('gardener_a', 'gardener_b', 'superadmin')
  )
)
with check (
  bucket_id = 'page-audio'
  and split_part(name, '/', 1) = 'pages'
  and split_part(name, '/', 2) <> ''
  and split_part(name, '/', 3) <> ''
  and exists (
    select 1
    from public.pages pg
    where pg.id::text = split_part(name, '/', 2)
  )
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('gardener_a', 'gardener_b', 'superadmin')
  )
);

create policy page_audio_delete_guarded on storage.objects
for delete
to authenticated
using (
  bucket_id = 'page-audio'
  and split_part(name, '/', 1) = 'pages'
  and split_part(name, '/', 2) <> ''
  and split_part(name, '/', 3) <> ''
  and exists (
    select 1
    from public.pages pg
    where pg.id::text = split_part(name, '/', 2)
  )
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('gardener_a', 'gardener_b', 'superadmin')
  )
);
