/* =============================================================================
   ihs-rules.js · starting care for an IHS / ADW client (Medicaid intake slice A, Samantha 2026-10-08: "start")
   Pure functions: the client profile's State care plan box and the tests run this one file.

   THE RULES (her approved compliance matrix, 2026-10-08):
   · "The provider shall deliver the in-home service within ten (10) calendar days of receipt of the service
     authorization from the division or on the beginning date specified by the authorization, whichever is later."
     The date of receipt is recorded on the authorization (19 CSR 15-7.021(18)(J); 13 CSR 70-91.010(1)(B)1; ADW Provider
     Manual 2.3). The Hub's date of receipt is the date the coordinator entered when uploading the care plan.
   · Late: "detailed written justification must be sent to the division with a copy maintained in the participant's
     file". The Hub drafts it for a person to edit and send; it never sends anything.
   · Started = the first clock-in in AxisCare (first_shift_at), the one meaning of "started" everywhere in the Hub.
   · At the start: a copy of the PCCP to the participant (MAN 4.20); the written rights statement, including our grievance
     procedure, reviewed (19 CSR 15-7.021(18)(O)); the code of ethics reviewed ((18)(I)); EVV explained
     (13 CSR 70-3.320(2)(A)); the caregiver has the care plan before delivering service ((22)(C)).
   · CDS has no start deadline (PCQ-CDS #2): CDS plans never get this clock (they are stopped at upload anyway).
   ============================================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IhsRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const ymd = d => String(d || '').slice(0, 10);
  const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(ymd(d));
  const addDays = (d, n) => { const x = new Date(ymd(d) + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const days = (a, b) => Math.round((Date.parse(ymd(b) + 'T12:00:00Z') - Date.parse(ymd(a) + 'T12:00:00Z')) / 864e5);
  const START_DAYS = 10;
  const CARE_KINDS = ['pc', 'apc', 'adw_respite', 'adw_homemaker', 'adw_chore'];

  /** the authorized start: the earliest start of our personal care / APC / ADW lines (not the GHE or nurse visit lines) */
  function authorizedStart(plan) {
    const s = ((plan && plan.services) || []).filter(x => x.ours && CARE_KINDS.indexOf(x.kind) > -1 && isDate(x.start)).map(x => x.start).sort();
    return s[0] || '';
  }

  /**
   * the 10-day clock. plan: the saved care plan record (received_on, services). firstShift: the first clock-in
   * (an ISO date or time), or a start date a person entered. today: YYYY-MM-DD.
   */
  function startClock(plan, firstShift, today) {
    const received = ymd(plan && plan.received_on), auth = authorizedStart(plan);
    if (!isDate(received) || !auth) return { applies: false, why: !auth ? 'no personal care, APC or ADW service of ours on this plan' : 'no date of receipt' };
    const due = [addDays(received, START_DAYS), auth].sort()[1];
    const fs = ymd(firstShift);
    if (isDate(fs) && fs < received) return { applies: false, continuing: true, why: 'care began before this plan arrived (a renewal or change, not a new start)', received, auth, started: fs };
    const base = { applies: true, received, auth, due, rule: 'within 10 calendar days of receiving the authorization (' + received + '), or the start date it gives (' + auth + '), whichever is later' };
    if (isDate(fs)) return Object.assign(base, { state: fs <= due ? 'started_on_time' : 'started_late', started: fs, late_days: Math.max(0, days(due, fs)) });
    const left = days(ymd(today), due);
    return Object.assign(base, { state: left < 0 ? 'overdue' : left === 0 ? 'due_today' : left <= 3 ? 'soon' : 'waiting', left });
  }
  const needsJustification = c => !!(c && c.applies && (c.state === 'overdue' || c.state === 'started_late'));

  /** the written justification: what must be on it before it counts as sent */
  function justification(form, ctx) {
    ctx = ctx || {}; const f = form || {};
    const reason = String(f.reason || '').trim(), text = String(f.text || '').trim();
    if (reason.length < 10) return { ok: false, why: 'Say why care did not start in time (a sentence or two).' };
    if (!isDate(f.sent_on)) return { ok: false, why: 'Enter the date it was sent to DSDS.' };
    if (ymd(f.sent_on) > ymd(ctx.today)) return { ok: false, why: 'The sent date can\'t be in the future.' };
    if (!String(f.how || '').trim()) return { ok: false, why: 'Say how it was sent (for example through Fusion or by email).' };
    if (!f.copy_in_file) return { ok: false, why: 'Keep a copy in the client\'s file, then tick that it is there.' };
    return { ok: true, rec: { reason, text, sent_on: ymd(f.sent_on), how: String(f.how).trim(), planned_start: isDate(f.planned_start) ? ymd(f.planned_start) : '', copy_in_file: true, by: ctx.me || '', at: ctx.at || '' } };
  }
  /** a draft for the coordinator to edit: facts only, nothing promised */
  function draftJustification(p) {
    p = p || {};
    return 'Re: ' + (p.name || '[participant]') + (p.dcn ? ', DCN ' + p.dcn : '') + '\n\n'
      + 'Caring Companions In Home Senior Care received the service authorization on ' + (p.received || '[date]') + '. Services were to begin by ' + (p.due || '[date]') + '.\n'
      + 'Services ' + (p.started ? 'began on ' + p.started : 'have not yet begun') + ' because: ' + (p.reason || '[reason]') + '\n'
      + (p.started ? '' : 'We expect to begin services on ' + (p.planned_start || '[date]') + '.\n')
      + '\nCaring Companions In Home Senior Care, (417) 234-8494';
  }

  /** the start-of-care checks the state requires (each recorded with the date it was done and who recorded it) */
  const START_CHECKS = [
    ['pccp_copy', 'A copy of the care plan (PCCP) given to the participant', 'MAN 4.20'],
    ['rights', 'Written rights statement reviewed and signed, including our grievance procedure', '19 CSR 15-7.021(18)(O)'],
    ['ethics', 'Code of ethics reviewed with the participant', '19 CSR 15-7.021(18)(I)'],
    ['evv', 'Told the participant EVV is required', '13 CSR 70-3.320(2)(A)'],
    ['care_plan', 'The caregiver has the care plan before the first visit (in AxisCare)', '19 CSR 15-7.021(22)(C)'],
  ];
  function checksLeft(start) { const c = (start && start.checks) || {}; return START_CHECKS.filter(([k]) => !(c[k] && isDate(c[k].on))).map(([k, l]) => ({ k, l })); }

  /* ── the plan's end and the reassessment (MAN 4.15 rev. Apr 2026: within 365 days of the last level-of-care decision,
     due in the month the plan expires; DSDS reassesses, we are not a provider reassessor). The Hub watches the end date. ── */
  const WATCH_DAYS = 60;
  function planWatch(plan, today) {
    const end = ymd(plan && plan.plan_end); if (!isDate(end)) return { state: 'unknown' };
    const left = days(ymd(today), end);
    if (left < 0) return { state: 'ended', end, left };
    if (left <= WATCH_DAYS) return { state: 'soon', end, left };
    return { state: 'ok', end, left };
  }

  /* ── recommending a care plan change (19 CSR 15-7.021(15)(B),(18)(K),(21)(C); 13 CSR 70-91.010(3)(H)4; MAN 4.30, 4.20):
     only DSDS changes the units; we recommend, the supervisor approves, the coordinator submits the online PCCP Request
     Form. A decrease takes effect the 1st of the next month. The Hub never changes an authorization. ── */
  const CHANGE_KINDS = [['more', 'Needs more help than authorized'], ['less', 'Needs less help than authorized'], ['tasks', 'Different tasks than authorized'], ['schedule', 'The schedule keeps differing from the plan'], ['other', 'Other']];
  function changeStep(c, step, form, ctx) {
    ctx = ctx || {}; const f = form || {}, today = ymd(ctx.today);
    if (step === 'recommend') {
      if (!CHANGE_KINDS.some(k => k[0] === f.kind)) return { ok: false, why: 'Pick what changed.' };
      if (String(f.why || '').trim().length < 10) return { ok: false, why: 'Say what you are seeing (a sentence or two).' };
      return { ok: true, rec: { id: ctx.id || '', kind: f.kind, why: String(f.why).trim(), seen_by: ctx.me || '', seen_at: ctx.at || '', status: 'recommended' } };
    }
    if (step === 'approve') {
      if (!c || c.status !== 'recommended') return { ok: false, why: 'Only a recommendation waiting for approval can be approved.' };
      if (!String(f.approved_by || '').trim()) return { ok: false, why: 'Name the supervisor who approved it.' };
      if (!isDate(f.approved_on) || ymd(f.approved_on) > today) return { ok: false, why: 'Enter the date it was approved (not in the future).' };
      return { ok: true, patch: { status: 'approved', approved_by: String(f.approved_by).trim(), approved_on: ymd(f.approved_on), approved_rec_by: ctx.me || '' } };
    }
    if (step === 'submit') {
      if (!c || c.status !== 'approved') return { ok: false, why: 'The supervisor approves it before it is submitted.' };
      if (!isDate(f.submitted_on) || ymd(f.submitted_on) > today || ymd(f.submitted_on) < ymd(c.approved_on)) return { ok: false, why: 'Enter the date the PCCP Request Form was submitted (not before the approval, not in the future).' };
      return { ok: true, patch: { status: 'submitted', submitted_on: ymd(f.submitted_on), submitted_by: ctx.me || '' } };
    }
    if (step === 'close') {
      if (!c || c.status !== 'submitted') return { ok: false, why: 'Only a submitted request can be closed.' };
      const out = String(f.outcome || '');
      if (['approved_new_plan', 'denied', 'withdrawn'].indexOf(out) < 0) return { ok: false, why: 'Say what DSDS decided.' };
      return { ok: true, patch: { status: 'closed', outcome: out, closed_on: today, closed_by: ctx.me || '', note: String(f.note || '').trim() } };
    }
    return { ok: false, why: 'Unknown step.' };
  }

  return { START_DAYS, START_CHECKS, authorizedStart, startClock, needsJustification, justification, draftJustification, checksLeft, addDays, WATCH_DAYS, planWatch, CHANGE_KINDS, changeStep };
});
