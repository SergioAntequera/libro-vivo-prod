-- Garden chat private media storage
-- Canonical bucket for chat attachments and voice notes.
--
-- Path convention expected by app:
-- - garden-chat-media: <garden_id>/<room_id>/<filename-or-subpath>
--
-- Important:
-- - bucket is private
-- - clients should consume files through signed URLs
-- - the first path segment must always be the garden_id

insert into storage.buckets (id, name, public)
values ('garden-chat-media', 'garden-chat-media', false)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;

drop policy if exists garden_chat_media_read_member on storage.objects;
drop policy if exists garden_chat_media_insert_member on storage.objects;
drop policy if exists garden_chat_media_update_member on storage.objects;
drop policy if exists garden_chat_media_delete_member on storage.objects;

create policy garden_chat_media_read_member on storage.objects
for select
to authenticated
using (
  (
    bucket_id = 'garden-chat-media'
    and split_part(name, '/', 1) <> ''
    and split_part(name, '/', 2) <> ''
    and split_part(name, '/', 3) <> ''
    and exists (
      select 1
      from public.garden_members gm
      where gm.garden_id::text = split_part(name, '/', 1)
        and gm.user_id = auth.uid()
        and gm.left_at is null
    )
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

create policy garden_chat_media_insert_member on storage.objects
for insert
to authenticated
with check (
  (
    bucket_id = 'garden-chat-media'
    and split_part(name, '/', 1) <> ''
    and split_part(name, '/', 2) <> ''
    and split_part(name, '/', 3) <> ''
    and exists (
      select 1
      from public.garden_members gm
      where gm.garden_id::text = split_part(name, '/', 1)
        and gm.user_id = auth.uid()
        and gm.left_at is null
    )
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

create policy garden_chat_media_update_member on storage.objects
for update
to authenticated
using (
  (
    bucket_id = 'garden-chat-media'
    and split_part(name, '/', 1) <> ''
    and split_part(name, '/', 2) <> ''
    and split_part(name, '/', 3) <> ''
    and exists (
      select 1
      from public.garden_members gm
      where gm.garden_id::text = split_part(name, '/', 1)
        and gm.user_id = auth.uid()
        and gm.left_at is null
    )
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
)
with check (
  (
    bucket_id = 'garden-chat-media'
    and split_part(name, '/', 1) <> ''
    and split_part(name, '/', 2) <> ''
    and split_part(name, '/', 3) <> ''
    and exists (
      select 1
      from public.garden_members gm
      where gm.garden_id::text = split_part(name, '/', 1)
        and gm.user_id = auth.uid()
        and gm.left_at is null
    )
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);

create policy garden_chat_media_delete_member on storage.objects
for delete
to authenticated
using (
  (
    bucket_id = 'garden-chat-media'
    and split_part(name, '/', 1) <> ''
    and split_part(name, '/', 2) <> ''
    and split_part(name, '/', 3) <> ''
    and exists (
      select 1
      from public.garden_members gm
      where gm.garden_id::text = split_part(name, '/', 1)
        and gm.user_id = auth.uid()
        and gm.left_at is null
    )
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
);
