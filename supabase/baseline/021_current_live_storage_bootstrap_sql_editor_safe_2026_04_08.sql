-- Libro Vivo - bootstrap vivo de storage para SQL Editor
-- Fuente: proyecto Supabase actual en funcionamiento
-- Generado automaticamente el 2026-04-08
-- Uso: ejecutar este archivo en el SQL Editor de Supabase.
-- Nota: evita ALTER TABLE / DROP POLICY porque esos pasos disparan
--       errores de ownership sobre storage.objects en proyectos gestionados.

-- Libro Vivo - bootstrap vivo de storage
-- Fuente: proyecto Supabase actual en funcionamiento
-- Generado automaticamente el 2026-04-08

-- Buckets
-- -------
insert into "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
select "id", "name", "public", "file_size_limit", "allowed_mime_types"
from json_populate_recordset(null::"storage"."buckets", $storage_buckets$[{"id":"garden-chat-media","name":"garden-chat-media","public":false,"file_size_limit":null,"allowed_mime_types":null},{"id":"page-audio","name":"page-audio","public":true,"file_size_limit":null,"allowed_mime_types":null},{"id":"page-photos","name":"page-photos","public":true,"file_size_limit":null,"allowed_mime_types":null},{"id":"page-thumbs","name":"page-thumbs","public":true,"file_size_limit":null,"allowed_mime_types":null},{"id":"page-videos","name":"page-videos","public":true,"file_size_limit":"524288000","allowed_mime_types":["video/mp4","video/quicktime","video/webm","video/ogg","video/mpeg","video/x-matroska","video/x-msvideo","video/3gpp"]},{"id":"photos","name":"photos","public":false,"file_size_limit":null,"allowed_mime_types":null},{"id":"plan-type-assets","name":"plan-type-assets","public":true,"file_size_limit":null,"allowed_mime_types":null},{"id":"stickers-assets","name":"stickers-assets","public":true,"file_size_limit":null,"allowed_mime_types":null}]$storage_buckets$::json)
on conflict (id) do update set name = excluded.name, public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Storage object policies (SQL Editor safe / idempotente)
-- ------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'garden_chat_media_delete_member'
  ) then
    execute $policy$
create policy "garden_chat_media_delete_member" on "storage"."objects" as PERMISSIVE for delete using ((((bucket_id = 'garden-chat-media'::text) AND (split_part(name, '/'::text, 1) <> ''::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) <> ''::text) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE (((gm.garden_id)::text = split_part(objects.name, '/'::text, 1)) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'garden_chat_media_insert_member'
  ) then
    execute $policy$
create policy "garden_chat_media_insert_member" on "storage"."objects" as PERMISSIVE for insert with check ((((bucket_id = 'garden-chat-media'::text) AND (split_part(name, '/'::text, 1) <> ''::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) <> ''::text) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE (((gm.garden_id)::text = split_part(objects.name, '/'::text, 1)) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'garden_chat_media_read_member'
  ) then
    execute $policy$
create policy "garden_chat_media_read_member" on "storage"."objects" as PERMISSIVE for select using ((((bucket_id = 'garden-chat-media'::text) AND (split_part(name, '/'::text, 1) <> ''::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) <> ''::text) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE (((gm.garden_id)::text = split_part(objects.name, '/'::text, 1)) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'garden_chat_media_update_member'
  ) then
    execute $policy$
create policy "garden_chat_media_update_member" on "storage"."objects" as PERMISSIVE for update using ((((bucket_id = 'garden-chat-media'::text) AND (split_part(name, '/'::text, 1) <> ''::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) <> ''::text) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE (((gm.garden_id)::text = split_part(objects.name, '/'::text, 1)) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))))) with check ((((bucket_id = 'garden-chat-media'::text) AND (split_part(name, '/'::text, 1) <> ''::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) <> ''::text) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE (((gm.garden_id)::text = split_part(objects.name, '/'::text, 1)) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'page_audio_delete_guarded'
  ) then
    execute $policy$
create policy "page_audio_delete_guarded" on "storage"."objects" as PERMISSIVE for delete using (((bucket_id = 'page-audio'::text) AND (split_part(name, '/'::text, 1) = 'pages'::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) <> ''::text) AND (EXISTS ( SELECT 1
   FROM pages pg
  WHERE ((pg.id)::text = split_part(objects.name, '/'::text, 2)))) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text])))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'page_audio_insert_guarded'
  ) then
    execute $policy$
create policy "page_audio_insert_guarded" on "storage"."objects" as PERMISSIVE for insert with check (((bucket_id = 'page-audio'::text) AND (split_part(name, '/'::text, 1) = 'pages'::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) <> ''::text) AND (EXISTS ( SELECT 1
   FROM pages pg
  WHERE ((pg.id)::text = split_part(objects.name, '/'::text, 2)))) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text])))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'page_audio_read_public'
  ) then
    execute $policy$
create policy "page_audio_read_public" on "storage"."objects" as PERMISSIVE for select using ((bucket_id = 'page-audio'::text));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'page_audio_update_guarded'
  ) then
    execute $policy$
create policy "page_audio_update_guarded" on "storage"."objects" as PERMISSIVE for update using (((bucket_id = 'page-audio'::text) AND (split_part(name, '/'::text, 1) = 'pages'::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) <> ''::text) AND (EXISTS ( SELECT 1
   FROM pages pg
  WHERE ((pg.id)::text = split_part(objects.name, '/'::text, 2)))) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text]))))))) with check (((bucket_id = 'page-audio'::text) AND (split_part(name, '/'::text, 1) = 'pages'::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) <> ''::text) AND (EXISTS ( SELECT 1
   FROM pages pg
  WHERE ((pg.id)::text = split_part(objects.name, '/'::text, 2)))) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text])))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'page_photos_delete_guarded'
  ) then
    execute $policy$
create policy "page_photos_delete_guarded" on "storage"."objects" as PERMISSIVE for delete using (((bucket_id = 'page-photos'::text) AND (split_part(name, '/'::text, 1) = 'pages'::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) <> ''::text) AND (EXISTS ( SELECT 1
   FROM pages pg
  WHERE ((pg.id)::text = split_part(objects.name, '/'::text, 2)))) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text])))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'page_photos_insert_guarded'
  ) then
    execute $policy$
create policy "page_photos_insert_guarded" on "storage"."objects" as PERMISSIVE for insert with check (((bucket_id = 'page-photos'::text) AND (split_part(name, '/'::text, 1) = 'pages'::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) <> ''::text) AND (EXISTS ( SELECT 1
   FROM pages pg
  WHERE ((pg.id)::text = split_part(objects.name, '/'::text, 2)))) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text])))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'page_photos_read_public'
  ) then
    execute $policy$
create policy "page_photos_read_public" on "storage"."objects" as PERMISSIVE for select using ((bucket_id = 'page-photos'::text));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'page_photos_update_guarded'
  ) then
    execute $policy$
create policy "page_photos_update_guarded" on "storage"."objects" as PERMISSIVE for update using (((bucket_id = 'page-photos'::text) AND (split_part(name, '/'::text, 1) = 'pages'::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) <> ''::text) AND (EXISTS ( SELECT 1
   FROM pages pg
  WHERE ((pg.id)::text = split_part(objects.name, '/'::text, 2)))) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text]))))))) with check (((bucket_id = 'page-photos'::text) AND (split_part(name, '/'::text, 1) = 'pages'::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) <> ''::text) AND (EXISTS ( SELECT 1
   FROM pages pg
  WHERE ((pg.id)::text = split_part(objects.name, '/'::text, 2)))) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text])))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'page_thumbs_delete_guarded'
  ) then
    execute $policy$
create policy "page_thumbs_delete_guarded" on "storage"."objects" as PERMISSIVE for delete using (((bucket_id = 'page-thumbs'::text) AND (split_part(name, '/'::text, 1) = 'pages'::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) = ''::text) AND (regexp_replace(split_part(name, '/'::text, 2), '\.[^.]+$'::text, ''::text) <> ''::text) AND (EXISTS ( SELECT 1
   FROM pages pg
  WHERE ((pg.id)::text = regexp_replace(split_part(objects.name, '/'::text, 2), '\.[^.]+$'::text, ''::text)))) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text])))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'page_thumbs_insert_guarded'
  ) then
    execute $policy$
create policy "page_thumbs_insert_guarded" on "storage"."objects" as PERMISSIVE for insert with check (((bucket_id = 'page-thumbs'::text) AND (split_part(name, '/'::text, 1) = 'pages'::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) = ''::text) AND (regexp_replace(split_part(name, '/'::text, 2), '\.[^.]+$'::text, ''::text) <> ''::text) AND (EXISTS ( SELECT 1
   FROM pages pg
  WHERE ((pg.id)::text = regexp_replace(split_part(objects.name, '/'::text, 2), '\.[^.]+$'::text, ''::text)))) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text])))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'page_thumbs_read_public'
  ) then
    execute $policy$
create policy "page_thumbs_read_public" on "storage"."objects" as PERMISSIVE for select using ((bucket_id = 'page-thumbs'::text));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'page_thumbs_update_guarded'
  ) then
    execute $policy$
create policy "page_thumbs_update_guarded" on "storage"."objects" as PERMISSIVE for update using (((bucket_id = 'page-thumbs'::text) AND (split_part(name, '/'::text, 1) = 'pages'::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) = ''::text) AND (regexp_replace(split_part(name, '/'::text, 2), '\.[^.]+$'::text, ''::text) <> ''::text) AND (EXISTS ( SELECT 1
   FROM pages pg
  WHERE ((pg.id)::text = regexp_replace(split_part(objects.name, '/'::text, 2), '\.[^.]+$'::text, ''::text)))) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text]))))))) with check (((bucket_id = 'page-thumbs'::text) AND (split_part(name, '/'::text, 1) = 'pages'::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) = ''::text) AND (regexp_replace(split_part(name, '/'::text, 2), '\.[^.]+$'::text, ''::text) <> ''::text) AND (EXISTS ( SELECT 1
   FROM pages pg
  WHERE ((pg.id)::text = regexp_replace(split_part(objects.name, '/'::text, 2), '\.[^.]+$'::text, ''::text)))) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text])))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'page_videos_delete_guarded'
  ) then
    execute $policy$
create policy "page_videos_delete_guarded" on "storage"."objects" as PERMISSIVE for delete using (((bucket_id = 'page-videos'::text) AND (split_part(name, '/'::text, 1) = 'pages'::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) <> ''::text) AND (EXISTS ( SELECT 1
   FROM pages pg
  WHERE ((pg.id)::text = split_part(objects.name, '/'::text, 2)))) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text])))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'page_videos_insert_guarded'
  ) then
    execute $policy$
create policy "page_videos_insert_guarded" on "storage"."objects" as PERMISSIVE for insert with check (((bucket_id = 'page-videos'::text) AND (split_part(name, '/'::text, 1) = 'pages'::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) <> ''::text) AND (EXISTS ( SELECT 1
   FROM pages pg
  WHERE ((pg.id)::text = split_part(objects.name, '/'::text, 2)))) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text])))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'page_videos_read_public'
  ) then
    execute $policy$
create policy "page_videos_read_public" on "storage"."objects" as PERMISSIVE for select using ((bucket_id = 'page-videos'::text));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'page_videos_update_guarded'
  ) then
    execute $policy$
create policy "page_videos_update_guarded" on "storage"."objects" as PERMISSIVE for update using (((bucket_id = 'page-videos'::text) AND (split_part(name, '/'::text, 1) = 'pages'::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) <> ''::text) AND (EXISTS ( SELECT 1
   FROM pages pg
  WHERE ((pg.id)::text = split_part(objects.name, '/'::text, 2)))) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text]))))))) with check (((bucket_id = 'page-videos'::text) AND (split_part(name, '/'::text, 1) = 'pages'::text) AND (split_part(name, '/'::text, 2) <> ''::text) AND (split_part(name, '/'::text, 3) <> ''::text) AND (EXISTS ( SELECT 1
   FROM pages pg
  WHERE ((pg.id)::text = split_part(objects.name, '/'::text, 2)))) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text])))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'plan_type_assets_delete_superadmin'
  ) then
    execute $policy$
create policy "plan_type_assets_delete_superadmin" on "storage"."objects" as PERMISSIVE for delete using (((bucket_id = 'plan-type-assets'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'plan_type_assets_insert_superadmin'
  ) then
    execute $policy$
create policy "plan_type_assets_insert_superadmin" on "storage"."objects" as PERMISSIVE for insert with check (((bucket_id = 'plan-type-assets'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'plan_type_assets_read'
  ) then
    execute $policy$
create policy "plan_type_assets_read" on "storage"."objects" as PERMISSIVE for select using ((bucket_id = 'plan-type-assets'::text));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'plan_type_assets_update_superadmin'
  ) then
    execute $policy$
create policy "plan_type_assets_update_superadmin" on "storage"."objects" as PERMISSIVE for update using (((bucket_id = 'plan-type-assets'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))))) with check (((bucket_id = 'plan-type-assets'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'stickers_assets_delete_superadmin'
  ) then
    execute $policy$
create policy "stickers_assets_delete_superadmin" on "storage"."objects" as PERMISSIVE for delete using (((bucket_id = 'stickers-assets'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'stickers_assets_insert_superadmin'
  ) then
    execute $policy$
create policy "stickers_assets_insert_superadmin" on "storage"."objects" as PERMISSIVE for insert with check (((bucket_id = 'stickers-assets'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'stickers_assets_read'
  ) then
    execute $policy$
create policy "stickers_assets_read" on "storage"."objects" as PERMISSIVE for select using ((bucket_id = 'stickers-assets'::text));
$policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'stickers_assets_update_superadmin'
  ) then
    execute $policy$
create policy "stickers_assets_update_superadmin" on "storage"."objects" as PERMISSIVE for update using (((bucket_id = 'stickers-assets'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))))) with check (((bucket_id = 'stickers-assets'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
$policy$;
  end if;
end $$;
