/* =============================================================================
   nurse-rules.js · who may do a GHE (GHE fix, slice 2: nurse setup, Samantha approved 2026-10-08)
   Pure functions: the Nurse Visits tab, the Nurse Portal and the tests run this one file.

   THE RULES (her approval page, 2026-10-08):
   · a GHE is done by an RN, or an LPN with RN oversight (INFO 05-26-02, May 11 2026; INFO 08-26-01; MAN 3.15 rev. Jul 2026)
   · the nurse is EMPLOYED by Caring Companions, not a contractor ("employed by the provider agency")
   · the nurse is not the client's immediate family (MAN 3.15): the nurse confirms it for each client they claim
   · a current Missouri license (number and expiry on file, not expired)
   Our practice: one RN is named the supervising RN; an LPN is not ready until there is one. An email on file is what
   lets the nurse see the Nurse Portal (they also need a Hub sign-in).
   A nurse who is not ready can't be assigned or claim a client. Clients already with them stay, flagged for the office.
   ============================================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NurseRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const ymd = d => String(d || '').slice(0, 10);
  const addDays = (d, n) => { const x = new Date(ymd(d) + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const cred = n => { const c = String((n && n.cred) || '').trim().toUpperCase(); return c === 'RN' || c === 'LPN' ? c : ''; };
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /** the supervising RN: the one marked supervising who is an RN, licensed and an employee (else null) */
  function supervisor(staff, today) {
    return (staff || []).find(n => n && n.supervising_rn && cred(n) === 'RN' && n.employee === true && n.license && n.expires && ymd(n.expires) >= ymd(today)) || null;
  }

  /** one nurse: ready to take GHEs, and what is missing or coming up */
  function readiness(n, staff, today) {
    today = ymd(today); const missing = [], warn = [];
    if (!n || !String(n.name || '').trim()) missing.push('a name');
    const c = cred(n);
    if (!c) missing.push('RN or LPN');
    if (!n || n.employee !== true) missing.push('confirmed as our employee (not a contractor)');
    if (!n || !String(n.license || '').trim()) missing.push('license number');
    if (!n || !n.expires) missing.push('license expiry date');
    else if (ymd(n.expires) < today) missing.push('a current license (expired ' + ymd(n.expires) + ')');
    else if (ymd(n.expires) <= addDays(today, 60)) warn.push('license expires ' + ymd(n.expires));
    const sup = supervisor(staff, today);
    if (c === 'LPN' && !sup) missing.push('a supervising RN on the team (an LPN works under RN oversight)');
    const portal = !!(n && EMAIL.test(String(n.email || '').trim()));
    if (!portal) warn.push('no email, so no Nurse Portal');
    return { ready: !missing.length, missing, warn, portal, cred: c, supervisor: sup ? sup.name : '' };
  }

  /** the team: who is ready, and whether there is a supervising RN */
  function team(staff, today) {
    const rows = (staff || []).map(n => Object.assign({ n }, readiness(n, staff, today)));
    const sup = supervisor(staff, today);
    const notes = [];
    if (!sup) notes.push((staff || []).some(n => n.supervising_rn) ? 'The nurse marked supervising RN is not ready (an RN, our employee, with a current license).' : 'No supervising RN is named. Mark one RN as the supervising RN.');
    if ((staff || []).filter(n => n.supervising_rn).length > 1) notes.push('More than one nurse is marked supervising RN. Keep one.');
    return { rows, ready: rows.filter(r => r.ready).map(r => r.n.name), supervisor: sup ? sup.name : '', notes };
  }

  /** may this nurse take this client? (assignment by the office, or a claim from the portal) */
  function canTake(n, staff, today) {
    const r = readiness(n, staff, today);
    return r.ready ? { ok: true } : { ok: false, why: n && n.name ? n.name + ' isn\'t ready for GHEs yet: needs ' + r.missing.join(', ') + '.' : 'Pick a nurse from the list.' };
  }

  /** a nurse record from the form: trimmed, the email lower-cased, supervising only for an RN */
  function clean(form, prev) {
    const c = cred(form);
    return Object.assign({}, prev || {}, {
      name: String(form.name || '').trim(), cred: c || String(form.cred || '').trim(), license: String(form.license || '').trim(),
      expires: ymd(form.expires), email: String(form.email || '').trim().toLowerCase(), ghl_user_id: String(form.ghl_user_id || '').trim(),
      employee: form.employee === true, supervising_rn: c === 'RN' && form.supervising_rn === true });
  }

  /* ── medication setups (Samantha 2026-10-08: "private pay med setup frequency"): weekly, every 2 weeks or monthly per client,
     picked by the nurse; every 2 weeks for a new client; clients set up before this keep weekly. Our practice, not a state rule. ── */
  const MED_FREQ = { weekly: { label: 'weekly', days: 7, early: 0, late: 2 }, biweekly: { label: 'every 2 weeks', days: 14, early: 2, late: 2 }, monthly: { label: 'monthly', days: 30, early: 4, late: 3 } };
  const medFreq = c => (c && MED_FREQ[c.med_freq]) ? c.med_freq : (c && c.weekly_meds ? 'weekly' : '');
  const dayDiff = (a, b) => Math.round((Date.parse(ymd(b) + 'T12:00:00Z') - Date.parse(ymd(a) + 'T12:00:00Z')) / 864e5);
  const mondayOf = d => { const x = new Date(ymd(d) + 'T12:00:00Z'), w = (x.getUTCDay() + 6) % 7; x.setUTCDate(x.getUTCDate() - w); return x.toISOString().slice(0, 10); };
  /** where a client's medication setups stand: done for now, due, overdue, or never done */
  function medDue(c, visits, today) {
    const f = medFreq(c); if (!f) return null;
    const F = MED_FREQ[f], t = ymd(today);
    const done = (visits || []).filter(v => v && v.client_id === c.id && v.type === 'meds' && v.status === 'completed' && v.completed_on).map(v => ymd(v.completed_on)).sort();
    const last = done[done.length - 1] || '';
    if (!last) return { freq: f, label: F.label, last: '', next_due: t, state: 'never', days_since: null };
    const since = dayDiff(last, t), next = addDays(last, F.days);
    if (f === 'weekly') { const thisWeek = done.some(d => mondayOf(d) === mondayOf(t)); return { freq: f, label: F.label, last, next_due: thisWeek ? addDays(mondayOf(t), 7) : t, state: thisWeek ? 'done' : (since > 7 + F.late ? 'overdue' : 'due'), days_since: since }; }
    const state = t < addDays(next, -F.early) ? 'done' : t <= addDays(next, F.late) ? 'due' : 'overdue';
    return { freq: f, label: F.label, last, next_due: next, state, days_since: since };
  }

  return { readiness, team, supervisor, canTake, clean, MED_FREQ, medFreq, medDue };
});
