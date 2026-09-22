-- Custody copy of the live pg_cron job (repaired by script 215, 2026-09-22).
-- History: an earlier job named 'interview-messages' fired "succeeded" every
-- 15 minutes while the function never ran (stale embedded credential after
-- Sep 11); replaced by this canonical job with the current anon key.
select cron.schedule(
  'interview-messages-15min',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url     := 'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/interview-messages',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZ3NnZWRsc3hpbmJ5Z3dteHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NDIzNDQsImV4cCI6MjA5ODExODM0NH0.L_31_UKdccyRH9n7p1GaBlZTqcJipB008H-GIvxwLxM'
    ),
    body    := '{}'::jsonb
  );
  $job$
);
