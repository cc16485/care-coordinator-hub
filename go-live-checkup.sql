-- go-live-checkup.sql  ·  run any time in the Supabase SQL editor (shared hub project)
-- -----------------------------------------------------------------------------
-- Asks the database which of this week's hiring-pipeline pieces are installed.
-- Read-only; changes nothing; safe to run as often as you like.
-- Every row should say OK. Any row that says MISSING names the exact file to
-- paste and run (all in the care-coordinator-hub repo).
-- -----------------------------------------------------------------------------

select 'move & cancel functions' as item,
  case when exists (select 1 from pg_proc where proname = 'interview_reschedule')
    then 'OK' else 'MISSING — run interview-cancel-reschedule.sql' end as status
union all
select 'change limits (2 changes, 2-hour cutoff)',
  case when exists (select 1 from pg_proc where proname = 'interview_self_changes')
    then 'OK' else 'MISSING — run interview-limits.sql' end
union all
select 'no-show recovery column',
  case when exists (select 1 from information_schema.columns
      where table_name = 'interview_bookings' and column_name = 'noshow_notified_at')
    then 'OK' else 'MISSING — run interview-noshow-recovery.sql' end
union all
select 'reference-chase schedule',
  coalesce((select 'OK — runs ' || schedule || ' (UTC)' from cron.job
      where jobname = 'daily-reference-chase' and active),
    'MISSING — run cron-reference-chase.sql')
union all
select 'watchdog schedule',
  coalesce((select 'OK — runs ' || schedule || ' (UTC)' from cron.job
      where jobname = 'daily-automation-watchdog' and active),
    'MISSING — run cron-automation-watchdog.sql')
order by item;
