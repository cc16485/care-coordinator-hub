-- interview-cancel-reschedule.sql  ·  run in the Supabase SQL editor (shared hub project)
-- -----------------------------------------------------------------------------
-- Cancelling and moving interviews, for both sides of the desk.
--
-- Until now a booking could only be made. The confirmation email said "call us
-- and we will move it", and when somebody did call there was nothing for the
-- office to press: the old time stayed on the calendar, the reminders kept
-- firing, and the slot stayed blocked for everyone else.
--
-- This adds three functions on top of interview_book:
--
--   interview_mine(p_applicant)                what is booked for this person
--   interview_cancel(p_applicant, reason, by)  cancel it, free the slot
--   interview_reschedule(p_applicant, starts)  move it, in one transaction
--
-- They follow interview_book's trust model: the applicant's own id is the
-- bearer token (it arrives by the ?book= link in their messages), so the
-- functions are SECURITY DEFINER and callable as anon. They return nothing
-- personal — times and statuses only, never names or contact details.
--
-- p_applicant is uuid, like ids everywhere else in this schema. If
-- interview_book was created with a different applicant type, mirror it here.
--
-- A reschedule cancels the old row and books the new time inside one
-- transaction, so if the new time was just taken the old booking survives
-- untouched. The fresh booking starts with confirmed_at NULL, which is what
-- makes interview-messages send a new confirmation with the new time and
-- re-arm both reminders — no messaging change needed for the happy path.
-- -----------------------------------------------------------------------------

-- ---- columns the story needs ------------------------------------------------
alter table interview_bookings add column if not exists cancelled_at       timestamptz;
alter table interview_bookings add column if not exists cancelled_by       text;         -- 'applicant' | 'office' | 'reschedule'
alter table interview_bookings add column if not exists cancel_reason      text;
alter table interview_bookings add column if not exists rescheduled_from   timestamptz;  -- the time this booking replaced
alter table interview_bookings add column if not exists cancel_notified_at timestamptz;  -- interview-messages stamps this

-- ---- let status say 'cancelled' ----------------------------------------------
-- The check constraint (if there is one) predates cancelling. Rebuild it with
-- the full set rather than guessing its name.
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class t on t.oid = con.conrelid
    where t.relname = 'interview_bookings'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table interview_bookings drop constraint %I', c.conname);
  end loop;
  execute $sql$alter table interview_bookings
    add constraint interview_bookings_status_check
    check (status in ('booked','attended','noshow','cancelled'))$sql$;
end $$;

-- ---- what is booked for this person -----------------------------------------
-- The apply page calls this when somebody follows their ?book= link, so it can
-- greet them with the time they already have instead of a list of new ones.
create or replace function interview_mine(p_applicant uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select json_build_object('starts_at', b.starts_at, 'status', b.status)
     from interview_bookings b
     where b.applicant_id = p_applicant and b.status = 'booked'
     order by b.starts_at
     limit 1),
    'null'::json);
$$;

-- ---- cancel ------------------------------------------------------------------
-- Returns the time that was cancelled, or null if there was nothing booked.
-- The slot frees itself: everything that offers times only counts rows whose
-- status is 'booked'. interview-messages tells the applicant it is cancelled
-- and, when they cancelled it themselves, pokes the office too.
create or replace function interview_cancel(
  p_applicant uuid,
  p_reason    text default null,
  p_by        text default 'applicant'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old timestamptz;
begin
  if p_by not in ('applicant','office','reschedule') then
    raise exception 'p_by must be applicant, office or reschedule';
  end if;

  update interview_bookings
     set status        = 'cancelled',
         cancelled_at  = now(),
         cancelled_by  = p_by,
         cancel_reason = nullif(trim(coalesce(p_reason,'')), '')
   where applicant_id = p_applicant and status = 'booked'
   returning starts_at into v_old;

  if v_old is null then
    return json_build_object('cancelled', false);
  end if;
  return json_build_object('cancelled', true, 'was', v_old);
end $$;

-- ---- move --------------------------------------------------------------------
-- Cancel-and-book as one transaction: if interview_book refuses the new time
-- (just taken, or in the past), the whole thing rolls back and the old booking
-- still stands. The old row is marked cancelled_by 'reschedule' so the
-- messaging never sends a "your interview is cancelled" for a move — the new
-- booking's own confirmation says everything that needs saying.
create or replace function interview_reschedule(
  p_applicant uuid,
  p_starts    timestamptz,
  p_by        text default 'applicant'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old timestamptz;
begin
  select starts_at into v_old
    from interview_bookings
   where applicant_id = p_applicant and status = 'booked'
   order by starts_at limit 1;

  update interview_bookings
     set status        = 'cancelled',
         cancelled_at  = now(),
         cancelled_by  = 'reschedule',
         cancel_reason = case when p_by = 'office' then 'moved by the office'
                              else 'moved by the applicant' end,
         cancel_notified_at = now()   -- a move is never announced as a cancellation
   where applicant_id = p_applicant and status = 'booked';

  perform interview_book(p_applicant, p_starts);

  -- interview_book may insert a fresh row or revive an old one; either way the
  -- new booking must confirm and remind from scratch, with the move on record.
  update interview_bookings
     set rescheduled_from = v_old,
         confirmed_at     = null,
         reminded_day_at  = null,
         reminded_hour_at = null
   where applicant_id = p_applicant and status = 'booked';

  return json_build_object('booked', p_starts, 'was', v_old);
end $$;

-- Same callers as interview_book: the public apply page (anon) and the hub.
grant execute on function interview_mine(uuid)                         to anon, authenticated;
grant execute on function interview_cancel(uuid, text, text)           to anon, authenticated;
grant execute on function interview_reschedule(uuid, timestamptz, text) to anon, authenticated;
