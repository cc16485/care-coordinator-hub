-- Videos storage for the hub (2026-10-30, Samantha: "When we make videos can you save them in the hub").
-- Private bucket. Every signed-in hub user can watch (files are only handed out through short-lived signed URLs);
-- only the owners can put a new video in. Nothing is ever deleted from the page; there is no delete policy.
-- Safe to run again.

-- 1. The bucket. Private, 200MB ceiling, videos only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('agency-videos', 'agency-videos', false, 209715200, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Policies. Signed in staff watch; only the owners add.
drop policy if exists "agency videos readable by signed in staff" on storage.objects;
drop policy if exists "agency videos added by owners"            on storage.objects;

create policy "agency videos readable by signed in staff"
  on storage.objects for select to authenticated
  using (bucket_id = 'agency-videos');

create policy "agency videos added by owners"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'agency-videos'
              and lower(coalesce(auth.jwt() ->> 'email', '')) in ('samantha@mo-care.com', 'zach@mo-care.com'));

-- 3. The list the page keeps.
insert into app_data (key, data) values ('agency_videos', '[]'::jsonb)
  on conflict (key) do nothing;

-- Check it worked:
select id, public, file_size_limit from storage.buckets where id = 'agency-videos';
select key, jsonb_array_length(data) as items from app_data where key = 'agency_videos';
