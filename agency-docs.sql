-- Documents storage for the hub: contracts, agreements, forms, training material.
-- Private bucket. Only signed-in hub users can put anything in or take anything out,
-- and files are only ever handed out through short-lived signed URLs.
--
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

-- 1. The bucket. Private, 25MB ceiling, documents and images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agency-docs',
  'agency-docs',
  false,
  26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/webp'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Policies. Signed in means allowed; anonymous means nothing at all.
--    Dropped first so this file can be run again safely.
drop policy if exists "agency docs readable by signed in staff"   on storage.objects;
drop policy if exists "agency docs writable by signed in staff"   on storage.objects;
drop policy if exists "agency docs updatable by signed in staff"  on storage.objects;
drop policy if exists "agency docs deletable by signed in staff"  on storage.objects;

create policy "agency docs readable by signed in staff"
  on storage.objects for select to authenticated
  using (bucket_id = 'agency-docs');

create policy "agency docs writable by signed in staff"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'agency-docs');

create policy "agency docs updatable by signed in staff"
  on storage.objects for update to authenticated
  using (bucket_id = 'agency-docs');

create policy "agency docs deletable by signed in staff"
  on storage.objects for delete to authenticated
  using (bucket_id = 'agency-docs');

-- 3. The two lists this page keeps: screenings, and the document index.
--    app_data already exists; these just make sure the rows are there
--    so the first save has something to write into.
insert into app_data (key, data) values ('guide_screens', '[]'::jsonb)
  on conflict (key) do nothing;
insert into app_data (key, data) values ('agency_docs', '[]'::jsonb)
  on conflict (key) do nothing;

-- Check it worked:
select id, public, file_size_limit from storage.buckets where id = 'agency-docs';
select key, jsonb_array_length(data) as items from app_data where key in ('guide_screens','agency_docs');
