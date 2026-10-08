/* =============================================================================
   ghe-forms-rules.js · from the GHE visit to Fusion (GHE fix, slice 4, Samantha approved 2026-10-08)
   Pure functions: the Hub's GHE forms and Nurse Scheduling, the Owners Hub scorecard and the tests run this one file.

   THE RULES (her approval page and slice plan, 2026-10-08):
   · the signed GHE form reaches the Hub within 2 days of the visit (our practice)
   · an LPN's form is reviewed by an RN before it is ready for Fusion; the RN signs it (Supervisory Nurse signature) and is
     named (INFO 05-26-02: "an LPN ... with the RN providing oversight of the LPN"). An RN's own form needs no second RN.
   · uploaded to Fusion by the EARLIER of 10 working days after the visit (MAN 8.00 App. 4) or the 15th of the next month
     (HCBS 08-26-01 / INFO 08-26-01); the two published dates differ, so the Hub uses the earlier one until DSDS answers
   · the person who uploads records the date; once a month the Medicaid coordinator confirms each upload is really in
     Fusion; Samantha sees a monthly scorecard by nurse
   The Hub never uploads anything; Fusion stays the official record.
   ============================================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GheFormRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const ymd = d => String(d || '').slice(0, 10);
  const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(ymd(d));
  const addDays = (d, n) => { const x = new Date(ymd(d) + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const STATUS = { draft: 'Draft', rn_review: 'Awaiting RN review', ready: 'Ready for Fusion', uploaded: 'Uploaded to Fusion' };
  const FORM_DAYS = 2;

  function workingDaysAfter(d, n) { let x = ymd(d); while (n > 0) { x = addDays(x, 1); const w = new Date(x + 'T12:00:00Z').getUTCDay(); if (w !== 0 && w !== 6) n--; } return x; }
  /** the upload deadline: the earlier of 10 working days after the visit or the 15th of the next month */
  function uploadDue(visit) {
    if (!isDate(visit)) return '';
    const a = workingDaysAfter(visit, 10);
    let y = +visit.slice(0, 4), m = +visit.slice(5, 7) + 1; if (m > 12) { m = 1; y++; }
    const b = y + '-' + String(m).padStart(2, '0') + '-15';
    return a < b ? a : b;
  }
  const credOf = (name, staff) => { const n = (staff || []).find(s => norm(s.name) === norm(name)); return n ? String(n.cred || '').toUpperCase() : ''; };

  /** may this form move to `to`, and what gets recorded. ctx: { staff, me (email), meName, today, uploaded_on, reviewer } */
  function transition(f, to, ctx) {
    ctx = ctx || {}; const today = ymd(ctx.today), staff = ctx.staff || [], from = (f && f.status) || 'draft';
    const no = why => ({ ok: false, why });
    if (!STATUS[to]) return no('Unknown status.');
    if (to === from) return { ok: true, patch: {} };
    if (!f || !String(f.client || '').trim() || !isDate(f.visit_date)) return no('The form needs the client and the visit date first.');
    if (to === 'draft') return { ok: true, patch: { status: 'draft' } };
    if (!f.sig_nurse) return no('The nurse has to sign the form first.');
    const cred = credOf(f.nurse, staff);
    if (to === 'rn_review') return cred === 'RN' ? no('This form is by an RN, so it does not need a second RN: mark it Ready for Fusion.') : { ok: true, patch: { status: 'rn_review' } };
    if (to === 'ready') {
      if (cred === 'RN') return { ok: true, patch: { status: 'ready', ready_at: ctx.at || '', ready_by: ctx.me || '' } };
      /* an LPN (or a nurse the list doesn't know): an RN on the nurse list reviews it and signs */
      const rv = (staff || []).find(s => norm(s.name) === norm(ctx.reviewer || f.rn_reviewer) && String(s.cred || '').toUpperCase() === 'RN');
      if (!rv) return no('An RN must review this ' + (cred || 'nurse') + ' form: pick the reviewing RN.');
      if (norm(rv.name) === norm(f.nurse)) return no('The reviewing RN must be someone other than the nurse who wrote it.');
      if (!f.sig_sup) return no('The reviewing RN signs the form (Supervisory Nurse signature) first.');
      return { ok: true, patch: { status: 'ready', rn_reviewer: rv.name, rn_reviewed_at: ctx.at || '', rn_reviewed_by: ctx.me || '', ready_at: ctx.at || '', ready_by: ctx.me || '' } };
    }
    if (to === 'uploaded') {
      if (from !== 'ready') return no('Only a form that is Ready for Fusion can be marked uploaded.');
      const on = ymd(ctx.uploaded_on);
      if (!isDate(on)) return no('Enter the date it was uploaded to Fusion.');
      if (on > today) return no('The upload date can\'t be in the future.');
      if (on < ymd(f.visit_date)) return no('The upload date can\'t be before the visit.');
      const due = uploadDue(f.visit_date);
      return { ok: true, patch: { status: 'uploaded', uploaded_on: on, uploaded_by: ctx.me || '', upload_due: due, uploaded_on_time: on <= due, fusion_checked: null } };
    }
    return no('Not allowed.');
  }

  /** the Fusion check: uploads not yet confirmed as really in Fusion (oldest first) */
  function fusionToCheck(forms) {
    return (forms || []).filter(f => f && f.status === 'uploaded' && !(f.fusion_checked && f.fusion_checked.seen)).sort((a, b) => ymd(a.uploaded_on).localeCompare(ymd(b.uploaded_on)));
  }
  function fusionCheck(f, seen, ctx) {
    ctx = ctx || {};
    if (!f || f.status !== 'uploaded') return { ok: false, why: 'Only an uploaded form can be checked.' };
    if (seen) return { ok: true, patch: { fusion_checked: { seen: true, by: ctx.me || '', at: ctx.at || '' } } };
    const note = String(ctx.note || '').trim();
    if (!note) return { ok: false, why: 'Say what was wrong (for example: not in the Documents tab).' };
    return { ok: true, patch: { status: 'ready', fusion_checked: { seen: false, by: ctx.me || '', at: ctx.at || '', note }, uploaded_on: '', uploaded_on_time: null } };
  }

  /** where a form stands today, in words, with how urgent it is */
  function formState(f, today) {
    const st = (f && f.status) || 'draft', due = uploadDue(f && f.visit_date), t = ymd(today);
    if (st === 'uploaded') return { s: 'uploaded', lbl: 'Uploaded ' + ymd(f.uploaded_on) + (f.uploaded_on_time === false ? ' (late: due ' + (f.upload_due || due) + ')' : '') + (f.fusion_checked && f.fusion_checked.seen ? ' · seen in Fusion' : ''), late: f.uploaded_on_time === false };
    const over = due && t > due;
    const what = st === 'draft' ? 'Draft' : st === 'rn_review' ? 'Awaiting RN review' : 'Ready for Fusion';
    return { s: st, lbl: what + (due ? ' · upload by ' + due + (over ? ' (OVERDUE)' : '') : ''), late: over, due };
  }

  /** a visited GHE with no form: the form is due 2 days after the visit */
  function formMissing(visitAt, hasForm, today) {
    if (hasForm || !visitAt) return null;
    const due = addDays(ymd(visitAt), FORM_DAYS);
    return { due, overdue: ymd(today) > due };
  }

  /**
   * the monthly scorecard, by nurse, for the GHE windows of one month.
   * watch: app_data ghe_watch; forms: ghe_forms; clients: nurse_clients.
   */
  function scorecard(month, watch, forms, clients, today) {
    const rows = {}, row = n => (rows[n] = rows[n] || { nurse: n, due: 0, visited: 0, missed: 0, open: 0, forms_missing: 0, rn_review: 0, ready_overdue: 0, uploaded: 0, on_time: 0, seen: 0 });
    const formOf = c => (forms || []).find(f => (f.client_id ? f.client_id === c.id : norm(f.client) === norm(c.name)) && String(f.visit_date || '').slice(0, 7) === month);
    for (const c of clients || []) {
      if (!c || c.active === false) continue;
      for (const w of ['ghe1', 'ghe2', 'ghe_makeup']) {
        if (String(c[w] || '').slice(0, 7) !== month) continue;
        const r = row(c.assigned_nurse || '(no nurse)'), gw = (watch || []).find(x => x.id === 'gw_' + c.id + '_' + month) || {}, f = formOf(c);
        r.due++;
        const visited = gw.state === 'visited' || !!f;
        if (visited) r.visited++; else if (gw.stage === 'missed' || month < String(today).slice(0, 7)) r.missed++; else r.open++;
        if (gw.state === 'visited' && !f) r.forms_missing++;
        if (f) {
          if (f.status === 'rn_review') r.rn_review++;
          if (f.status === 'ready' && formState(f, today).late) r.ready_overdue++;
          if (f.status === 'uploaded') { r.uploaded++; if (f.uploaded_on_time) r.on_time++; if (f.fusion_checked && f.fusion_checked.seen) r.seen++; }
        }
      }
    }
    const list = Object.values(rows).sort((a, b) => a.nurse.localeCompare(b.nurse));
    const total = list.reduce((t, r) => { for (const k of Object.keys(r)) if (k !== 'nurse') t[k] = (t[k] || 0) + r[k]; return t; }, { nurse: 'All nurses' });
    return { month, rows: list, total };
  }

  return { STATUS, FORM_DAYS, uploadDue, workingDaysAfter, transition, fusionToCheck, fusionCheck, formState, formMissing, scorecard };
});
