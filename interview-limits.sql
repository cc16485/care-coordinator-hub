-- interview-limits.sql  ·  run in the Supabase SQL editor AFTER interview-cancel-reschedule.sql
-- -----------------------------------------------------------------------------
-- Guardrails on self-serve cancelling and moving.
--
-- Somebody who moves their interview three times is telling you how they will
-- treat shifts, and every move costs a held slot, a fresh confirmation and two
-- reminders. So the applicant's own buttons get two limits; the office gets
-- none, because a phone call is exactly the right amount of friction for a
-- serial rescheduler:
--
--   the cap      an applicant can change (move or cancel) a booking twice on
--                their own; the third change is a phone call
--   the cutoff   nothing self-serve within 2 hours of the start, and never
--                after it has started — that close, it is a call, and a
--                no-show cannot quietly rewrite itself as a cancellation
--
-- Who is asking is decided by the database, not the caller: hub staff are
-- signed in (authenticated), the apply page is anon. An anon caller claiming
-- p_by='office' is treated as the applicant they are.
--
-- Replaces interview_mine / interview_cancel / interview_reschedule in place.
-- -----------------------------------------------------------------------------

-- How many times this applicant has changed a booking themselves: their own
-- cancellations, plus old rows their own moves left behind. Office changes are
-- not held against them.
create or replace function interview_self_changes(p_applicant uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int from interview_bookings
   where applicant_id = p_applicant
     and status = 'cancelled'
     and (cancelled_by = 'applicant'
          or (cancelled_by = 'reschedule' and cancel_reason = 'moved by the applicant'));
$$;

-- What the apply page needs in one call: the booking, and whether the person
-- holding the link may still change it themselves (and if not, why not).
create or replace function interview_mine(p_applicant uuid)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_row     interview_bookings%rowtype;
  v_changes integer;
  v_blocked text;
begin
  select * into v_row from interview_bookings
   where applicant_id = p_applicant and status = 'booked'
   order by starts_at limit 1;
  if v_row.id is null then return 'null'::json; end if;

  v_changes := interview_self_changes(p_applicant);
  v_blocked := case
    when v_changes >= 2 then 'limit'
    when v_row.starts_at < now() + interval '2 hours' then 'too_close'
    else null end;

  return json_build_object(
    'starts_at', v_row.starts_at,
    'status', v_row.status,
    'self_changes', v_changes,
    'can_change', v_blocked is null,
    'blocked', v_blocked);
end $$;

-- The buttons above are the polite version of these checks; the functions are
-- the real ones, because a URL can be replayed with the buttons long gone.
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
  if coalesce(auth.role(),'anon') <> 'authenticated' then p_by := 'applicant'; end if;

  if p_by = 'applicant' then
    if interview_self_changes(p_applicant) >= 2 then
      return json_build_object('cancelled', false, 'reason', 'limit');
    end if;
    if exists (select 1 from interview_bookings
                where applicant_id = p_applicant and status = 'booked'
                  and starts_at < now() + interval '2 hours') then
      return json_build_object('cancelled', false, 'reason', 'too_close');
    end if;
  end if;

  update interview_bookings
     set status        = 'cancelled',
         cancelled_at  = now(),
         cancelled_by  = p_by,
         cancel_reason = nullif(trim(coalesce(p_reason,'')), '')
   where applicant_id = p_applicant and status = 'booked'
   returning starts_at into v_old;

  if v_old is null then
    return json_build_object('cancelled', false, 'reason', 'none');
  end if;
  return json_build_object('cancelled', true, 'was', v_old);
end $$;

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
  if coalesce(auth.role(),'anon') <> 'authenticated' then p_by := 'applicant'; end if;

  select starts_at into v_old
    from interview_bookings
   where applicant_id = p_applicant and status = 'booked'
   order by starts_at limit 1;

  if p_by = 'applicant' and v_old is not null then
    if interview_self_changes(p_applicant) >= 2 then
      raise exception 'CHANGE_LIMIT: this booking can only be changed by the office now';
    end if;
    if v_old < now() + interval '2 hours' then
      raise exception 'TOO_CLOSE: within two hours of the interview, changes are phone-only';
    end if;
  end if;

  update interview_bookings
     set status        = 'cancelled',
         cancelled_at  = now(),
         cancelled_by  = 'reschedule',
         cancel_reason = case when p_by = 'office' then 'moved by the office'
                              else 'moved by the applicant' end,
         cancel_notified_at = now()   -- a move is never announced as a cancellation
   where applicant_id = p_applicant and status = 'booked';

  perform interview_book(p_applicant, p_starts);

  update interview_bookings
     set rescheduled_from = v_old,
         confirmed_at     = null,
         reminded_day_at  = null,
         reminded_hour_at = null
   where applicant_id = p_applicant and status = 'booked';

  return json_build_object('booked', p_starts, 'was', v_old);
end $$;

grant execute on function interview_self_changes(uuid)                  to anon, authenticated;
grant execute on function interview_mine(uuid)                          to anon, authenticated;
grant execute on function interview_cancel(uuid, text, text)            to anon, authenticated;
grant execute on function interview_reschedule(uuid, timestamptz, text) to anon, authenticated;
