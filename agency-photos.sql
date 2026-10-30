-- Photos storage for the hub (2026-10-30, Samantha: "can you also save all of the amazing photos you've created").
-- Shown on the Videos & Photos page (videos.html). Private bucket. Every signed-in hub user can look (files are only handed
-- out through short-lived signed URLs); only the owners can put a new photo in. There is no delete policy.
-- Safe to run again.

-- 1. The bucket. Private, 25MB ceiling, photos only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('agency-photos', 'agency-photos', false, 26214400, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Policies. Signed in staff look; only the owners add.
drop policy if exists "agency photos readable by signed in staff" on storage.objects;
drop policy if exists "agency photos added by owners"            on storage.objects;

create policy "agency photos readable by signed in staff"
  on storage.objects for select to authenticated
  using (bucket_id = 'agency-photos');

create policy "agency photos added by owners"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'agency-photos'
              and lower(coalesce(auth.jwt() ->> 'email', '')) in ('samantha@mo-care.com', 'zach@mo-care.com'));

-- 3. The list the page keeps.
insert into app_data (key, data) values ('agency_photos', '[]'::jsonb)
  on conflict (key) do nothing;

-- Check it worked:
select id, public, file_size_limit from storage.buckets where id = 'agency-photos';
select key, jsonb_array_length(data) as items from app_data where key = 'agency_photos';
