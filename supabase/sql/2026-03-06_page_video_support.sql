-- Libro Vivo - Page video support
-- Execute in Supabase SQL Editor
--
-- Adds:
-- - storage bucket page-videos
-- - guarded RLS policies for video objects
--
-- Path convention expected by app:
-- - page-videos: pages/<page_id>/<random-file>

insert into storage.buckets (id, name, public)
values ('page-videos', 'page-videos', true)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = 524288000,
  allowed_mime_types = array[
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/ogg',
    'video/mpeg',
    'video/x-matroska',
    'video/x-msvideo',
    'video/3gpp'
  ];

update storage.buckets
set
  file_size_limit = 524288000,
  allowed_mime_types = array[
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/ogg',
    'video/mpeg',
    'video/x-matroska',
    'video/x-msvideo',
    'video/3gpp'
  ]
where id = 'page-videos';

drop policy if exists page_videos_read_public on storage.objects;
drop policy if exists page_videos_insert_guarded on storage.objects;
drop policy if exists page_videos_update_guarded on storage.objects;
drop policy if exists page_videos_delete_guarded on storage.objects;

create policy page_videos_read_public on storage.objects
for select
to public
using (bucket_id = 'page-videos');

create policy page_videos_insert_guarded on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'page-videos'
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

create policy page_videos_update_guarded on storage.objects
for update
to authenticated
using (
  bucket_id = 'page-videos'
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
  bucket_id = 'page-videos'
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

create policy page_videos_delete_guarded on storage.objects
for delete
to authenticated
using (
  bucket_id = 'page-videos'
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
