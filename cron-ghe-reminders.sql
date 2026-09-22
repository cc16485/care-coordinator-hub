-- Custody copy of the live pg_cron job (created by script 215, 2026-09-22).
-- ghe-reminders had NO schedule at all before this (the watchdog's "never
-- reported a run"). The function gates its own send days (Mondays, the 1st
-- and the 20th) and its own weekday 8am-6pm window; the cron just knocks daily.
select cron.schedule(
  'daily-ghe-reminders',
  '0 15 * * *',
  $job$
  select net.http_post(
    url     := 'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/ghe-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZ3NnZWRsc3hpbmJ5Z3dteHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NDIzNDQsImV4cCI6MjA5ODExODM0NH0.L_31_UKdccyRH9n7p1GaBlZTqcJipB008H-GIvxwLxM'
    ),
    body    := '{}'::jsonb
  );
  $job$
);
