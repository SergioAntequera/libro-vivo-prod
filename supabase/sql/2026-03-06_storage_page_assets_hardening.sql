-- Libro Vivo - Storage hardening for page assets
-- Execute in Supabase SQL Editor
--
-- Goal:
-- - Keep public read for page photos/thumbs.
-- - Restrict write operations (insert/update/delete) to authenticated app profiles.
-- - Enforce object path belongs to a real page id.
--
-- Path conventions expected by app:
-- - page-photos: pages/<page_id>/<random-file>    (uploadPagePhoto)
-- - page-thumbs: pages/<page_id>.png              (uploadPageThumbnail)

-- Ensure buckets exist and are public-readable by URL helpers.
insert into storage.buckets (id, name, public)
values ('page-photos', 'page-photos', true)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;

insert into storage.buckets (id, name, public)
values ('page-thumbs', 'page-thumbs', true)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;

-- Drop legacy broad policies (idempotent).
drop policy if exists "Auth upload page photos" on storage.objects;
drop policy if exists "Auth upload page thumbs" on storage.objects;
drop policy if exists "Auth update page photos" on storage.objects;
drop policy if exists "Auth update page thumbs" on storage.objects;
drop policy if exists "Public read page photos" on storage.objects;
drop policy if exists "Public read page thumbs" on storage.objects;

-- Drop hardened policies if re-running script.
drop policy if exists page_photos_read_public on storage.objects;
drop policy if exists page_thumbs_read_public on storage.objects;
drop policy if exists page_photos_insert_guarded on storage.objects;
drop policy if exists page_photos_update_guarded on storage.objects;
drop policy if exists page_photos_delete_guarded on storage.objects;
drop policy if exists page_thumbs_insert_guarded on storage.objects;
drop policy if exists page_thumbs_update_guarded on storage.objects;
drop policy if exists page_thumbs_delete_guarded on storage.objects;

-- Public read: kept as before.
create policy page_photos_read_public on storage.objects
for select
to public
using (bucket_id = 'page-photos');

create policy page_thumbs_read_public on storage.objects
for select
to public
using (bucket_id = 'page-thumbs');

-- Guard for app users (Sergio/Carmen/superadmin roles only).
-- Note: this still assumes single-couple scope (no multi-tenant relationship_id yet).

create policy page_photos_insert_guarded on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'page-photos'
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

create policy page_photos_update_guarded on storage.objects
for update
to authenticated
using (
  bucket_id = 'page-photos'
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
  bucket_id = 'page-photos'
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

create policy page_photos_delete_guarded on storage.objects
for delete
to authenticated
using (
  bucket_id = 'page-photos'
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

create policy page_thumbs_insert_guarded on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'page-thumbs'
  and split_part(name, '/', 1) = 'pages'
  and split_part(name, '/', 2) <> ''
  and split_part(name, '/', 3) = ''
  and regexp_replace(split_part(name, '/', 2), '\.[^.]+$', '') <> ''
  and exists (
    select 1
    from public.pages pg
    where pg.id::text = regexp_replace(split_part(name, '/', 2), '\.[^.]+$', '')
  )
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('gardener_a', 'gardener_b', 'superadmin')
  )
);

create policy page_thumbs_update_guarded on storage.objects
for update
to authenticated
using (
  bucket_id = 'page-thumbs'
  and split_part(name, '/', 1) = 'pages'
  and split_part(name, '/', 2) <> ''
  and split_part(name, '/', 3) = ''
  and regexp_replace(split_part(name, '/', 2), '\.[^.]+$', '') <> ''
  and exists (
    select 1
    from public.pages pg
    where pg.id::text = regexp_replace(split_part(name, '/', 2), '\.[^.]+$', '')
  )
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('gardener_a', 'gardener_b', 'superadmin')
  )
)
with check (
  bucket_id = 'page-thumbs'
  and split_part(name, '/', 1) = 'pages'
  and split_part(name, '/', 2) <> ''
  and split_part(name, '/', 3) = ''
  and regexp_replace(split_part(name, '/', 2), '\.[^.]+$', '') <> ''
  and exists (
    select 1
    from public.pages pg
    where pg.id::text = regexp_replace(split_part(name, '/', 2), '\.[^.]+$', '')
  )
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('gardener_a', 'gardener_b', 'superadmin')
  )
);

create policy page_thumbs_delete_guarded on storage.objects
for delete
to authenticated
using (
  bucket_id = 'page-thumbs'
  and split_part(name, '/', 1) = 'pages'
  and split_part(name, '/', 2) <> ''
  and split_part(name, '/', 3) = ''
  and regexp_replace(split_part(name, '/', 2), '\.[^.]+$', '') <> ''
  and exists (
    select 1
    from public.pages pg
    where pg.id::text = regexp_replace(split_part(name, '/', 2), '\.[^.]+$', '')
  )
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('gardener_a', 'gardener_b', 'superadmin')
  )
);

