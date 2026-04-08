-- Libro Vivo - Storage policies for plan type flower assets

insert into storage.buckets (id, name, public)
values ('plan-type-assets', 'plan-type-assets', true)
on conflict (id) do update
set
  public = excluded.public,
  name = excluded.name;

drop policy if exists plan_type_assets_read on storage.objects;
create policy plan_type_assets_read on storage.objects
for select
to authenticated
using (bucket_id = 'plan-type-assets');

drop policy if exists plan_type_assets_insert_superadmin on storage.objects;
create policy plan_type_assets_insert_superadmin on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'plan-type-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

drop policy if exists plan_type_assets_update_superadmin on storage.objects;
create policy plan_type_assets_update_superadmin on storage.objects
for update
to authenticated
using (
  bucket_id = 'plan-type-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
)
with check (
  bucket_id = 'plan-type-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

drop policy if exists plan_type_assets_delete_superadmin on storage.objects;
create policy plan_type_assets_delete_superadmin on storage.objects
for delete
to authenticated
using (
  bucket_id = 'plan-type-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);
