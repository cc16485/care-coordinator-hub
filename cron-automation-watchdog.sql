-- cron-automation-watchdog.sql  ·  run once in the Supabase SQL editor (shared hub project)
-- -----------------------------------------------------------------------------
-- The watcher of the watchers gets its schedule.
--
-- Every scheduled automation now leaves a heartbeat (app_data key
-- 'automation_heartbeats' — created automatically on first beat, nothing to
-- set up). automation-watchdog reads them each morning and texts/emails the
-- office (the applicant_alerts list) when any expected job has gone quiet or
-- is erroring. A healthy morning sends nothing.
--
-- Deploy the automation-watchdog edge function BEFORE running this, or the
-- job will call a URL that does not exist yet (harmless, but pointless).
--
-- 12:45 UTC = 6:45am/7:45am Springfield — with the morning coffee,
-- deliberately before the day's outreach window opens.
-- -----------------------------------------------------------------------------

do $$
begin
  perform cron.unschedule('daily-automation-watchdog');
exception when others then null;  -- fine if it never existed
end $$;

select cron.schedule(
  'daily-automation-watchdog',
  '45 12 * * *',
  $job$
  select net.http_post(
    url     := 'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/automation-watchdog',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZ3NnZWRsc3hpbmJ5Z3dteHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NDIzNDQsImV4cCI6MjA5ODExODM0NH0.L_31_UKdccyRH9n7p1GaBlZTqcJipB008H-GIvxwLxM'
    ),
    body    := '{}'::jsonb
  );
  $job$
);

-- Proof it took: one active row.
select jobname, schedule, active from cron.job where jobname = 'daily-automation-watchdog';
