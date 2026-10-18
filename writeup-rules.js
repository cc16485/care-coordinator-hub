/* =============================================================================
   writeup-rules.js · who approves a write-up (SOP ruling 2, Samantha 2026-10-17)
   Pure functions: the CC Hub (Write-Ups, My Work approvals), the Owners Hub Discipline Center and the tests run this file.

   THE RULE (decision rights approved 2026-10-17; SOP 23 "Coaching and corrective action"):
   · Coaching, a verbal warning and a FIRST written warning are the team's decision. Any Care Coordinator or owner
     may approve one.
   · A final written warning, a suspension, a termination review, and a second written warning (one already issued
     in the last 12 months) are leadership's: Samantha or Zach.
   · Zach may decide an urgent case but never a firing, so only Samantha approves a termination review.
   · Nobody approves a case they started (Corrective Action SOP, 2026-07-16). The one exception: a termination review
     Samantha started herself, because she is the only person who can approve one.
   · A level this file does not know is treated as leadership's, never the team's.
   ============================================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WriteupRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TEAM_LEVELS = ['Coaching', 'Verbal Warning', 'Written Warning'];
  const LEADERSHIP_LEVELS = ['Final Written Warning', 'Suspension', 'Termination Review'];
  const FIRING_LEVELS = ['Termination Review'];
  const FIRING_APPROVERS = ['samantha@mo-care.com'];
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

  /* 'team' or 'leadership' */
  function tier(a, all, now) {
    const level = String((a && a.level) || '');
    if (TEAM_LEVELS.indexOf(level) < 0) return 'leadership';
    if (level === 'Written Warning' && priorWritten(a, all, now)) return 'leadership';
    return 'team';
  }
  const isFiring = a => FIRING_LEVELS.indexOf(String((a && a.level) || '')) > -1;

  /* Did this person start it? created_by_email when the draft has it; older drafts only kept the part before the @. */
  function startedBy(a, email) {
    const e = low(email); if (!e || !a) return false;
    const local = e.split('@')[0];
    const byEmail = low(a.created_by_email), by = low(a.created_by);
    return byEmail === e || by === e || (!!local && by === local);
  }

  /* who: { email, owner (holds approve_discipline), team (holds approve_team_discipline) }
     Returns { ok, why }. why is said to the person when ok is false. */
  function canApprove(a, who, all, now) {
    who = who || {};
    const email = low(who.email);
    if (!a || !email) return { ok: false, why: 'Sign in again to approve this.' };
    const firing = isFiring(a);
    const samanthaOwnFiring = firing && FIRING_APPROVERS.indexOf(email) > -1;
    if (startedBy(a, email) && !samanthaOwnFiring) return { ok: false, why: 'You started this one, so someone else approves it.' };
    if (tier(a, all, now) === 'leadership') {
      if (!who.owner) return { ok: false, why: 'Leadership (Samantha or Zach) approves a ' + levelWords(a, all, now) + '.' };
      if (firing && FIRING_APPROVERS.indexOf(email) < 0) return { ok: false, why: 'Only Samantha approves a termination review.' };
      return { ok: true, why: '' };
    }
    if (who.owner || who.team) return { ok: true, why: '' };
    return { ok: false, why: 'A Care Coordinator or an owner approves this.' };
  }

  function levelWords(a, all, now) {
    const level = String((a && a.level) || 'write-up');
    if (level === 'Written Warning' && priorWritten(a, all, now)) return 'second written warning';
    return level.toLowerCase();
  }

  /* Who can approve it, said the way a person would say it. */
  function whoApproves(a, all, now) {
    if (tier(a, all, now) === 'team') return 'a Care Coordinator or an owner (not the person who started it)';
    if (isFiring(a)) return 'Samantha';
    return 'Samantha or Zach';
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

  return { TEAM_LEVELS, LEADERSHIP_LEVELS, FIRING_LEVELS, FIRING_APPROVERS,
    tier, isFiring, priorWritten, startedBy, canApprove, whoApproves, levelWords, approverFor, samePerson };
});
