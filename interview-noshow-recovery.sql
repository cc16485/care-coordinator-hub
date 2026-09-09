-- interview-noshow-recovery.sql  ·  run once in the Supabase SQL editor (shared hub project)
-- -----------------------------------------------------------------------------
-- One column, for the highest-payback message the pipeline was not sending.
--
-- When the office records an interview no-show, interview-messages now sends
-- the applicant one warm "we missed you — pick a new time" with their own
-- booking link, and puts their application back into play so the link works.
-- A no-show is the cheapest hire there is: screened, qualified, interviewed
-- once already. This stamp is what makes the message send exactly once.
-- -----------------------------------------------------------------------------

alter table interview_bookings add column if not exists noshow_notified_at timestamptz;

-- Anything marked a no-show before today is treated as already handled, so
-- switching this on does not text people about interviews from weeks ago.
update interview_bookings
   set noshow_notified_at = now()
 where status = 'noshow' and noshow_notified_at is null
   and starts_at < now() - interval '7 days';
