/* =============================================================================
   writeup-rules.js · who approves a write-up (HR decisions, Samantha 2026-10-18; replaces SOP ruling 2 of 10-17)
   Pure functions: the CC Hub (Write-Ups, My Work approvals), the Owners Hub Discipline Center and the tests run this file.

   THE RULE (HR Agent build plan, decisions 1 to 3, 2026-10-18):
   · Every write-up is formal, from a verbal warning up, and only an owner approves one. Zach is the HR lead; Samantha
     can approve too. Care Coordinators coach, and coaching is not a write-up (its own record, build step 5).
   · Zach approves routine terminations on his own.
   · A case marked as involving protected leave, an accommodation, an injury or workers' comp, a discrimination or
     harassment complaint, a retaliation concern, or another serious legal risk needs Samantha consulted first. Zach
     can't approve it until she marks the consult on it. Samantha herself can approve it.
   · An owner may approve a case they started: only owners approve now, and Zach decides on his own (decision 1).
   · A level this file does not know is still an owner's, never anyone else's.
   ============================================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WriteupRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  /* No level is the team's any more (decision 3). Kept as a list so older callers keep working. */
  const TEAM_LEVELS = [];
  const LEADERSHIP_LEVELS = ['Coaching', 'Verbal Warning', 'Written Warning', 'Final Written Warning', 'Suspension', 'Termination Review'];
  const FIRING_LEVELS = ['Termination Review'];
  const FIRING_APPROVERS = ['zach@mo-care.com', 'samantha@mo-care.com'];
  const HR_LEAD = 'zach@mo-care.com';
  const CONSULT_WITH = 'samantha@mo-care.com';
  /* The situations that need Samantha consulted before a final decision (decision 1). */
  const PROTECTED = [
    { key: 'leave', words: 'protected leave' },
    { key: 'accommodation', words: 'an accommodation request' },
    { key: 'injury', words: "an injury or workers' comp" },
    { key: 'discrimination', words: 'a discrimination or harassment complaint' },
    { key: 'retaliation', words: 'a retaliation concern' },
    { key: 'legal', words: 'another serious legal risk' }
  ];
  const AT_OR_ABOVE_WRITTEN = ['Written Warning', 'Final Written Warning', 'Suspension', 'Termination Review'];
  const YEAR_MS = 365 * 86400000;
  const low = s => String(s == null ? '' : s).trim().toLowerCase();
  const recId = r => String((r && (r.axiscare_caregiver_id || r.ax_caregiver_id)) || '').trim();
  const nameKey = n => low(n).replace(/\s+/g, ' ');

  /* Same person: by AxisCare number when both have one, otherwise by name. */
  function samePerson(a, b) {
    const ia = recId(a), ib = recId(b);
    if (ia && ib) return ia === ib;
    return !!nameKey(a && a.caregiver) && nameKey(a.caregiver) === nameKey(b && b.caregiver);
  }

  /* A written warning (or higher) already issued to this person in the last 12 months, other than this one. */
  function priorWritten(a, all, now) {
    const t = now == null ? Date.now() : (typeof now === 'number' ? now : Date.parse(now));
    return (all || []).some(x => x && x !== a && x.id !== a.id && x.status === 'issued'
      && AT_OR_ABOVE_WRITTEN.indexOf(x.level) > -1 && samePerson(a, x)
      && (!x.issued_at || t - Date.parse(x.issued_at) <= YEAR_MS));
  }

  /* 'team' or 'leadership'. Always 'leadership' now; kept for the callers that still ask. */
  function tier(a) {
    return TEAM_LEVELS.indexOf(String((a && a.level) || '')) > -1 ? 'team' : 'leadership';
  }
  const isFiring = a => FIRING_LEVELS.indexOf(String((a && a.level) || '')) > -1;

  /* Did this person start it? created_by_email when the draft has it; older drafts only kept the part before the @. */
  function startedBy(a, email) {
    const e = low(email); if (!e || !a) return false;
    const local = e.split('@')[0];
    const byEmail = low(a.created_by_email), by = low(a.created_by);
    return byEmail === e || by === e || (!!local && by === local);
  }

  /* The protected situations marked on a case, said in words. Unknown keys still count (fail closed). */
  function protectedWords(a) {
    const keys = Array.isArray(a && a.protected) ? a.protected.filter(Boolean) : [];
    return keys.map(k => { const p = PROTECTED.find(x => x.key === k); return p ? p.words : String(k); });
  }
  const needsConsult = a => protectedWords(a).length > 0;
  const consultDone = a => !!(a && a.samantha_consulted_at);

  /* who: { email, owner (holds approve_discipline) }. Returns { ok, why, consult }. why is said to the person when
     ok is false; consult is true when the only thing missing is Samantha's consult. */
  function canApprove(a, who) {
    who = who || {};
    const email = low(who.email);
    if (!a || !email) return { ok: false, why: 'Sign in again to approve this.' };
    if (!who.owner) return { ok: false, why: 'Zach (or Samantha) approves a ' + levelWords(a) + '.' };
    if (needsConsult(a) && !consultDone(a) && email !== CONSULT_WITH)
      return { ok: false, consult: true, why: 'Talk to Samantha first: this case involves ' + protectedWords(a).join(', ')
        + '. She marks the consult on it, then you can approve.' };
    return { ok: true, why: '' };
  }

  function levelWords(a, all, now) {
    const level = String((a && a.level) || 'write-up');
    if (level === 'Written Warning' && priorWritten(a, all, now)) return 'second written warning';
    return level.toLowerCase();
  }

  /* Who can approve it, said the way a person would say it. */
  function whoApproves(a) {
    if (needsConsult(a) && !consultDone(a)) return 'Zach, after talking with Samantha';
    return 'Zach (or Samantha)';
  }

  /* The first person in `people` (emails, in the order to try) who may approve it.
     whoFor(email) returns { email, owner, team } for that person. Empty when nobody listed can. */
  function approverFor(a, people, whoFor, all, now) {
    const seen = {};
    for (const p of people || []) {
      const e = low(p); if (!e || seen[e]) continue; seen[e] = 1;
      if (canApprove(a, whoFor(e), all, now).ok) return e;
    }
    return '';
  }

  /* SHORT NOTICE (SOP ruling 5, Samantha 2026-10-18; Employee Handbook 2025-2027, 2A and 2U):
     "Whenever possible, notify the office at least four (4) hours before the beginning of your shift. For shifts
     beginning between 7:00 AM and 9:00 AM, notify the office no later than 5:00 PM the previous day."
     ev: an attendance event (type 'callin') with shift_date, shift_time ('HH:MM'), reported_at (a typed local time
     'YYYY-MM-DDTHH:MM', or a full timestamp, read in Central time) and notice_hours.
     Returns { short, kind: 'hours' | 'early' | '', why }. Short notice starts a review; a write-up only if there was
     no good reason (the handbook says "whenever possible"). */
  function centralLocal(ts) {
    const t = String(ts || '').trim(); if (!t) return '';
    if (!/(Z|[+-]\d\d:?\d\d)$/.test(t)) return t.replace(' ', 'T').slice(0, 16);
    const d = new Date(t); if (isNaN(d)) return '';
    const p = {}; new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).forEach(x => { p[x.type] = x.value; });
    return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute;
  }
  function dayBefore(ymd) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || '')); if (!m) return '';
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] - 1)).toISOString().slice(0, 10);
  }
  function shortNotice(ev, noticeHours) {
    const need = noticeHours == null ? 4 : +noticeHours;
    if (!ev || ev.type !== 'callin') return { short: false, kind: '', why: '' };
    if (ev.notice_hours != null && ev.notice_hours !== '' && +ev.notice_hours < need)
      return { short: true, kind: 'hours', why: 'Call-in with only ' + ev.notice_hours + 'h notice (handbook: ' + need + 'h)' };
    const st = String(ev.shift_time || '').slice(0, 5);
    if (/^\d\d:\d\d$/.test(st) && st >= '07:00' && st <= '09:00') {
      const said = centralLocal(ev.reported_at), prev = dayBefore(ev.shift_date);
      if (said && prev && said > prev + 'T17:00')
        return { short: true, kind: 'early', why: 'Call-in after 5 PM the day before a ' + st + ' shift (handbook: by 5 PM the day before a 7 to 9 AM shift)' };
    }
    return { short: false, kind: '', why: '' };
  }

  return { shortNotice, centralLocal, TEAM_LEVELS, LEADERSHIP_LEVELS, FIRING_LEVELS, FIRING_APPROVERS, HR_LEAD, CONSULT_WITH,
    PROTECTED, protectedWords, needsConsult, consultDone,
    tier, isFiring, priorWritten, startedBy, canApprove, whoApproves, levelWords, approverFor, samePerson };
});
