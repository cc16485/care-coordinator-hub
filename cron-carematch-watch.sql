-- cron-carematch-watch.sql  ·  run once in the Supabase SQL editor (shared hub project)
-- -----------------------------------------------------------------------------
-- The Care Match first-shift watch gets its schedule.
--
-- carematch-watch runs every morning and looks at yesterday's (and today's)
-- AxisCare visits for client×caregiver pairs it has never seen before — a
-- first shift together. For each one it texts the caregiver ("how did your
-- first shift with ___ go?") and emails the coordinators/admins that a
-- client check-in call is due. The client is never messaged automatically;
-- their side of the check-in is a human phone call, on purpose.
--
-- The function seeds its own memory on the first run (60 days of pairs,
-- nothing sent) and alerts exactly once per pair forever after, so a retry
-- can never double-text anybody. It stays in DRY RUN until
-- ops_settings.carematch_live is set to true.
--
-- The Authorization header is the project's PUBLIC anon key (the same one on
-- every page of mo-care.com) — it satisfies the platform's JWT check either
-- way the function is deployed; the function itself uses its own service key.
-- -----------------------------------------------------------------------------

-- Idempotent: replace any earlier version of this job.
do $$
begin
  perform cron.unschedule('carematch-watch');
exception when others then null;  -- fine if it never existed
end $$;

-- 15:00 UTC = 10am Springfield in summer, 9am in winter (the 9-10am slot
-- Samantha asked for). Every day, because first shifts happen on weekends
-- too and the text goes to staff about their own work (routine_internal).
select cron.schedule(
  'carematch-watch',
  '0 15 * * *',
  $job$
  select net.http_post(
    url     := 'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/carematch-watch',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZ3NnZWRsc3hpbmJ5Z3dteHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NDIzNDQsImV4cCI6MjA5ODExODM0NH0.L_31_UKdccyRH9n7p1GaBlZTqcJipB008H-GIvxwLxM'
    ),
    body    := '{}'::jsonb
  );
  $job$
);

-- Proof it took: this should return one active row.
select jobname, schedule, active from cron.job where jobname = 'carematch-watch';
