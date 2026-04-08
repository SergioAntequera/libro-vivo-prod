-- Libro Vivo - Storage policies for stickers assets
-- Solves: "new row violates row-level security policy" when uploading stickers
-- Execute in Supabase SQL Editor

insert into storage.buckets (id, name, public)
values ('stickers-assets', 'stickers-assets', true)
on conflict (id) do update
set
  public = excluded.public,
  name = excluded.name;

-- Read access for authenticated users (editor needs to render stickers)
drop policy if exists stickers_assets_read on storage.objects;
create policy stickers_assets_read on storage.objects
for select
to authenticated
using (bucket_id = 'stickers-assets');

-- Upload/update/delete restricted to superadmin profile
drop policy if exists stickers_assets_insert_superadmin on storage.objects;
create policy stickers_assets_insert_superadmin on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'stickers-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

drop policy if exists stickers_assets_update_superadmin on storage.objects;
create policy stickers_assets_update_superadmin on storage.objects
for update
to authenticated
using (
  bucket_id = 'stickers-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
)
with check (
  bucket_id = 'stickers-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

drop policy if exists stickers_assets_delete_superadmin on storage.objects;
create policy stickers_assets_delete_superadmin on storage.objects
for delete
to authenticated
using (
  bucket_id = 'stickers-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);
