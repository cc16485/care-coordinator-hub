-- cron-reference-chase.sql  ·  run once in the Supabase SQL editor (shared hub project)
-- -----------------------------------------------------------------------------
-- The reference chase finally gets its schedule.
--
-- reference-chase owns the whole ladder: the FIRST ask to every reference,
-- the day-2 reminder, the day-5 handoff to the applicant, and the day-9
-- office escalation. Its header has said "runs daily by pg_cron" since the
-- day it was written — but the cron was never created, so the ladder only
-- moved when a brand-new candidate happened to arrive and the hub poked it.
-- A reference could sit at "sending shortly" forever.
--
-- One run every weekday morning fixes all of it: the function is idempotent
-- (it only touches rows that have not had that rung yet), gates itself to
-- weekday working hours, and reports what it did. The hub still pokes it the
-- moment new references are added, so first asks usually go out immediately;
-- this run is the backstop that makes the 2/5/9-day promises true.
--
-- The Authorization header is the project's PUBLIC anon key (the same one on
-- every page of mo-care.com) — it satisfies the platform's JWT check either
-- way the function is deployed; the function itself uses its own service key.
-- -----------------------------------------------------------------------------

-- Idempotent: replace any earlier version of this job.
do $$
begin
  perform cron.unschedule('daily-reference-chase');
exception when others then null;  -- fine if it never existed
end $$;

-- 15:30 UTC = 9:30am Springfield in summer, 10:30am in winter — comfortably
-- inside the function's own weekday 8am-6pm window all year.
select cron.schedule(
  'daily-reference-chase',
  '30 15 * * 1-5',
  $job$
  select net.http_post(
    url     := 'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/reference-chase',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZ3NnZWRsc3hpbmJ5Z3dteHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NDIzNDQsImV4cCI6MjA5ODExODM0NH0.L_31_UKdccyRH9n7p1GaBlZTqcJipB008H-GIvxwLxM'
    ),
    body    := '{}'::jsonb
  );
  $job$
);

-- Proof it took: this should return one active row.
select jobname, schedule, active from cron.job where jobname = 'daily-reference-chase';
