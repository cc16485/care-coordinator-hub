/* node tests/team-work-test.js
   Team Work (Stage 1 of the My Work and Team Work plan, Samantha approved 2026-10-18). The pure rules in team-work.js,
   on made-up cards, with Krystal 8 to 2 and Angiel 1 to 5 (Mondays different), time off, and every kind of card she
   named: call-offs, family requests, missed clock-ins, an absent coordinator's work, coaching and HR.
   With SNAPSHOT=<path> it also sorts the read-only 964 snapshot of the real open cards and prints the split. */
const fs = require('fs'), path = require('path');
const TW = require(path.join(__dirname, '..', 'team-work.js'));
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 700))); };

const K = 'krystal@mo-care.com', A = 'angiel@mo-care.com', S = 'samantha@mo-care.com';
/* Chicago is UTC-5 in October (CDT). Tue 2026-10-20 and Mon 2026-10-19. */
const at = (ymd, hm) => Date.parse(ymd + 'T' + hm + ':00-05:00');
/* Krystal: Tue-Fri 8-2, Monday 9-3. Angiel: Mon-Fri 1-5. */
const HOURS = { [K]: { 1:['09:00','15:00'], 2:['08:00','14:00'], 3:['08:00','14:00'], 4:['08:00','14:00'], 5:['08:00','14:00'] },
                [A]: { 1:['13:00','17:00'], 2:['13:00','17:00'], 3:['13:00','17:00'], 4:['13:00','17:00'], 5:['13:00','17:00'] } };
function chicagoParts(t){
  const p = new Intl.DateTimeFormat('en-US', { timeZone:'America/Chicago', weekday:'short', hour:'2-digit', minute:'2-digit', hour12:false, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date(t));
  const g = k => (p.find(x => x.type === k) || {}).value;
  return { dow:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(g('weekday')), mins:(+g('hour') % 24) * 60 + +g('minute'), ymd:g('year') + '-' + g('month') + '-' + g('day') };
}
function shiftEnd(e, t){
  const h = HOURS[e]; if(!h) return null; const c = chicagoParts(t), w = h[c.dow]; if(!w) return null;
  const f = w[0].split(':').map(Number), to = w[1].split(':').map(Number);
  if(c.mins < f[0] * 60 + f[1] || c.mins >= to[0] * 60 + to[1]) return null;
  return at(c.ymd, w[1]);
}
function nextShift(e, t){ for(let m = 0; m <= 8 * 1440; m += 15){ const x = t + m * 60000, end = shiftEnd(e, x); if(end != null) return { start:x, end }; } return null; }
const FAM = { ax_101:K, ax_202:A, lead_9:K };
function ctx(now, staff){ return { now, settings:{}, staff:staff || [], coordinators:[K, A], shiftEnd, nextShift,
  familyCC: it => FAM['ax_' + (it.client_ax || '')] || FAM['lead_' + (it.source_id || '')] || '',
  minsToShift: it => it._mins == null ? null : it._mins }; }
const card = (o) => Object.assign({ id:'c' + Math.random().toString(36).slice(2, 7), status:'open', created_at:new Date(at('2026-10-20', '14:40')).toISOString() }, o);

/* ── Scenario 1: a caregiver calls off for Krystal's client while Angiel is on duty (Tue 2:40 PM) ── */
const now1 = at('2026-10-20', '14:40'), c1 = ctx(now1);
const callOff = card({ kind:'coverage', opened_by:'callout', title:'Call-off: tonight 6 to 9 PM', owner:K, client_ax:'101', _mins:200 });
const p1 = TW.teamCard(callOff, c1);
ck('call-off lands in Team Work even though routing put Krystal on it', p1.tab === 'team', p1);
ck('...with a responsible role before anyone takes it', p1.role === 'Care Coordinator on duty');
ck('...a deadline (30 min after it opened, by rule) ', p1.deadline.at === now1 + 30 * 60000 && p1.deadline.from === 'rule', p1.deadline);
ck('...the time-sensitive escalation path, no texts', p1.track === 'today' && /No texts/.test(p1.escalation.words), p1.escalation);
ck('...and it still says it is Krystal\'s family', p1.family === K);
ck('on duty at 2:40 PM Tuesday: Angiel only', JSON.stringify(TW.onDuty(c1)) === JSON.stringify([A]), TW.onDuty(c1));
const urgent = Object.assign({}, callOff, { _mins:170 });
ck('under 3 hours to the shift it moves to care at risk, with the approved 10/20/35 ladder', TW.track(urgent, c1) === 'care' && /20 min: text to Samantha. 35 min: text to Zach/.test(TW.escalation(urgent, c1).words));
const taken = Object.assign({}, callOff, { owner:A, claimed_by:A });
ck('once Angiel takes it, it is hers (My Work), not Team Work', TW.place(taken, c1).tab === 'mine' && TW.place(taken, c1).person === A);
ck('...and the family coordinator is still Krystal (the card never stores the relationship)', c1.familyCC(taken) === K);

/* ── the day: overlap and first up ── */
ck('Tue 10 AM: Krystal only', JSON.stringify(TW.onDuty(ctx(at('2026-10-20', '10:00')))) === JSON.stringify([K]));
ck('Tue 1:10 PM: both, Krystal first up', JSON.stringify(TW.onDuty(ctx(at('2026-10-20', '13:10')))) === JSON.stringify([K, A]));
ck('Tue 1:40 PM: both, Angiel first up (new work after 1:30 goes to Angiel)', JSON.stringify(TW.onDuty(ctx(at('2026-10-20', '13:40')))) === JSON.stringify([A, K]));
ck('Tue 6 PM: nobody on duty', TW.onDuty(ctx(at('2026-10-20', '18:00'))).length === 0);
ck('Monday is different: Mon 2:30 PM Krystal is still on (9 to 3) with Angiel', TW.onDuty(ctx(at('2026-10-19', '14:30'))).indexOf(K) > -1);
ck('Tue 2:30 PM Krystal is off', TW.onDuty(ctx(at('2026-10-20', '14:30'))).indexOf(K) === -1);
/* time off lives in ONE place: the Team page's Out until (coordinator_staff.out_until) */
const pto = [{ name:'Krystal Land', email:K, out_until:'2026-10-21' }, { name:'Angiel Test', email:A }];
ck('Krystal out until Wed: Tue 10 AM nobody on duty (Angiel starts at 1)', TW.onDuty(ctx(at('2026-10-20', '10:00'), pto)).length === 0);
ck('...and Thursday she is back', TW.onDuty(ctx(at('2026-10-22', '10:00'), pto)).indexOf(K) > -1);

/* ── Family requests, missed clock-ins, red and yellow flags ── */
const fam = card({ kind:'call_followup', opened_by:'call-tasks', title:'Change Thursday visit to 10 AM', owner:K, client_ax:'202', due:new Date(at('2026-10-20', '17:00')).toISOString() });
const pf = TW.teamCard(fam, c1);
ck('family request from a call: Team Work, deadline from the card itself, Angiel\'s family', pf.tab === 'team' && pf.deadline.from === 'card' && pf.family === A, pf);
const mci = card({ kind:'staffing_issue', opened_by:'timekeeper', title:'Missed clock-in 8:00 AM', owner:K, urgency:'urgent' });
const pm = TW.teamCard(mci, c1);
ck('missed clock-in: Team Work, care at risk, deadline now', pm.tab === 'team' && pm.track === 'care' && pm.deadline.at === Date.parse(mci.created_at), pm);
ck('red shift-note flag (urgent): Team Work', TW.place(card({ kind:'care_note', opened_by:'care-note-flag', urgency:'urgent', owner:K }), c1).tab === 'team');
ck('yellow shift-note flag: the owner\'s My Work', TW.place(card({ kind:'care_note', opened_by:'care-note-flag', urgency:'high', owner:K }), c1).tab === 'mine');
ck('unowned call-off: Team Work (never "nobody\'s")', TW.place(card({ kind:'coverage', opened_by:'callout' }), c1).tab === 'team');

/* ── My Work stays My Work ── */
ck('a lead\'s follow-up: owner\'s My Work', TW.place(card({ kind:'new_lead', opened_by:'lead-watch', owner:K }), c1).tab === 'mine');
ck('relationship call: owner\'s My Work', TW.place(card({ kind:'relationship_call', opened_by:'system', owner:A }), c1).tab === 'mine');
ck('a card a person made, even about a call-off: My Work (explicitly assigned)', TW.place(card({ kind:'coverage', opened_by:'person', owner:A }), c1).tab === 'mine');
ck('project: My Work', TW.place(card({ kind:'project', opened_by:'person', owner:K }), c1).tab === 'mine');
ck('Up for grabs: unchanged (grabs)', TW.place(card({ kind:'request', owner:K, pool:{ by:K, size:'1h' } }), c1).tab === 'grabs');

/* ── Confidential never in Team Work (rule 10) ── */
['discipline', 'coaching', 'termination', 'hr_case', 'investigation'].forEach(k =>
  ck('confidential "' + k + '" never in Team Work', TW.place(card({ kind:k, opened_by:'system', owner:K }), c1).tab !== 'team'));
ck('sensitive flag on any kind: never in Team Work', TW.place(card({ kind:'coverage', opened_by:'callout', sensitive:true, owner:S }), c1).tab !== 'team');
ck('caregiver_performance domain: never in Team Work', TW.place(card({ kind:'staffing_issue', opened_by:'timekeeper', domain:'caregiver_performance', owner:S }), c1).tab !== 'team');
const outCoach = card({ kind:'coaching', opened_by:'hr-agent', owner:K, due:new Date(at('2026-10-20', '12:00')).toISOString() });
ck('...even when its coordinator is out (no Covering for coaching)', TW.place(outCoach, ctx(at('2026-10-20', '10:00'), pto)).tab === 'mine');

/* ── An absent coordinator's work (covering) ── */
const cPto = ctx(at('2026-10-20', '13:15'), pto);
const kDue = card({ kind:'relationship_call', opened_by:'system', owner:K, due:new Date(at('2026-10-20', '16:00')).toISOString(), client_ax:'101' });
const kLater = card({ kind:'relationship_call', opened_by:'system', owner:K, due:new Date(at('2026-10-23', '16:00')).toISOString() });
const kProj = card({ kind:'project', opened_by:'person', owner:K, due:new Date(at('2026-10-20', '12:00')).toISOString() });
const pc = TW.teamCard(kDue, cPto);
ck('Krystal out: her card due today shows in Team Work as Covering for Krystal', pc.tab === 'team' && pc.covering && pc.covering.person === K && pc.covering.why === 'out until 2026-10-21', pc);
ck('...it stays Krystal\'s family', pc.family === K);
ck('...her card due Friday stays where it is (no needless handoff)', TW.place(kLater, cPto).tab === 'mine');
ck('...her project waits for her', TW.place(kProj, cPto).tab === 'mine');
const kTaken = Object.assign({}, kDue, { claimed_by:A, covering:{ for:K, by:A } });
const pt = TW.place(kTaken, cPto);
ck('Angiel covers it: in Angiel\'s My Work as help, still Krystal\'s card', pt.tab === 'mine' && pt.person === A && /still/.test(pt.why), pt);
const kCall = card({ kind:'coverage', opened_by:'callout', owner:K, client_ax:'101' });
const pk = TW.place(kCall, cPto);
ck('Krystal out: a call-off routed to her is plain Team Work (Take it makes it the taker\'s), not Covering', pk.tab === 'team' && pk.why === 'operational' && !pk.covering, pk);
const kMade = card({ kind:'request', opened_by:'person', owner:K, due:new Date(at('2026-10-20', '15:00')).toISOString() });
ck('Krystal out: a card a person gave her, due today, is Covering', TW.place(kMade, cPto).why === 'covering');
ck('Krystal not out: same card is her own My Work', TW.place(kDue, ctx(at('2026-10-20', '13:15'))).tab === 'mine');

/* ── Due times follow the owner's hours ── */
const aMorning = card({ kind:'relationship_call', opened_by:'system', owner:A, due:new Date(at('2026-10-20', '10:00')).toISOString() });
ck('Angiel\'s card due 10 AM counts from the end of her 1 to 5 shift', TW.shiftDue(aMorning, c1) === at('2026-10-20', '17:00'), new Date(TW.shiftDue(aMorning, c1)));
const kEvening = card({ kind:'relationship_call', opened_by:'system', owner:K, due:new Date(at('2026-10-20', '16:00')).toISOString() });
ck('Krystal\'s card due 4 PM Tuesday counts to 2 PM Wednesday', TW.shiftDue(kEvening, c1) === at('2026-10-21', '14:00'));
ck('a card due while its owner is working keeps its own time', TW.shiftDue(card({ kind:'relationship_call', opened_by:'system', owner:K, due:new Date(at('2026-10-20', '11:00')).toISOString() }), c1) === null);
ck('Team Work and care at risk keep their own time', TW.shiftDue(Object.assign({}, mci, { due:new Date(at('2026-10-20', '22:00')).toISOString() }), c1) === null);

/* ── found on the real cards 2026-10-18 ── */
ck('a caregiver attendance-threshold card (HR path) never reaches Team Work', TW.place(card({ kind:'staffing_issue', opened_by:'attendance-threshold', owner:K }), c1).tab !== 'team');
ck('a red shift-note flag is time-sensitive, not the text ladder', TW.track(card({ kind:'care_note', opened_by:'care-note-flag', urgency:'urgent' }), c1) === 'today');
ck('an urgent call follow-up is time-sensitive, not the text ladder', TW.track(card({ kind:'call_followup', opened_by:'call-tasks', urgency:'urgent' }), c1) === 'today');
ck('an urgent coverage card is care at risk', TW.track(card({ kind:'coverage', urgency:'urgent' }), c1) === 'care');
ck('an urgent escalation on any card is care at risk', TW.track(card({ kind:'call_followup', escalation:{ level:'urgent' } }), c1) === 'care');

/* ── stale is late, not care at risk (Today's 12-hour rule) ── */
ck('a missed clock-in 36 hours old is late, not care at risk', TW.track(card({ kind:'staffing_issue', opened_by:'timekeeper', created_at:new Date(now1 - 36 * 36e5).toISOString() }), c1) === 'today');
ck('a coverage card for a shift that started 5 hours ago is not care at risk', TW.track(card({ kind:'coverage', _mins:-299 }), c1) === 'today');
ck('a missed clock-in 20 minutes old is care at risk', TW.track(card({ kind:'staffing_issue', opened_by:'timekeeper', created_at:new Date(now1 - 20 * 60000).toISOString() }), c1) === 'care');

/* ── closed, nothing else ── */
ck('a closed card goes nowhere', TW.place(card({ kind:'coverage', opened_by:'callout', status:'done' }), c1).tab === 'closed');

/* ── the real cards (read-only 964 snapshot) ── */
if(process.env.SNAPSHOT){
  const snap = JSON.parse(fs.readFileSync(process.env.SNAPSHOT, 'utf8'));
  const now = Date.parse(snap.at), coords = (snap.coordinators || []).map(x => String(x).toLowerCase());
  const famOf = it => String(it._family || '');
  /* hours from the real duty schedule (recurring windows, Chicago time; one-offs by their start and end) */
  const DW = (snap.duty || []).filter(w => w && w.active !== false && !w.planned && w.status !== 'planned');
  const snapEnd = (e, t) => { const c = chicagoParts(t); let best = null;
    DW.filter(w => String(w.person || '').toLowerCase() === e).forEach(w => {
      if(w.start && w.end){ if(t >= Date.parse(w.start) && t < Date.parse(w.end)) best = Math.max(best || 0, Date.parse(w.end)); return; }
      const r = w.recur || {}; if(r.days && r.days.length && r.days.indexOf(c.dow) === -1) return;
      const f = String(r.from || '00:00').split(':').map(Number), to = String(r.to || '23:59').split(':').map(Number);
      if(c.mins >= f[0] * 60 + f[1] && c.mins < to[0] * 60 + to[1]) best = Math.max(best || 0, at(c.ymd, r.to || '23:59')); });
    return best; };
  const rc = { now, settings:snap.settings || {}, staff:snap.staff || [], coordinators:coords, shiftEnd:snapEnd, nextShift:() => null, familyCC:famOf, minsToShift:it => it._mins == null ? null : it._mins };
  console.log('  on duty at snapshot time: ' + JSON.stringify(TW.onDuty(rc)));
  const tabs = {}, why = {}, team = { care:0, today:0, ordinary:0, fam:0, nofam:0, ruleDeadline:0 }, confInTeam = [];
  (snap.items || []).forEach(it => {
    const p = TW.teamCard(it, rc); tabs[p.tab] = (tabs[p.tab] || 0) + 1; const k = p.tab + ' · ' + (it.kind || '-') + ' · ' + (it.opened_by || '-') + ' · ' + p.why;
    why[k] = (why[k] || 0) + 1;
    if(p.tab === 'team'){ team[p.track]++; p.family ? team.fam++ : team.nofam++; if(p.deadline.from === 'rule') team.ruleDeadline++; if(TW.confidential(it)) confInTeam.push(it.kind); }
  });
  console.log('\nREAL CARDS (964 snapshot ' + snap.at + '): ' + (snap.items || []).length + ' open');
  console.log('  by tab: ' + JSON.stringify(tabs));
  console.log('  Team Work: ' + JSON.stringify(team));
  Object.entries(why).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log('  ' + String(n).padStart(4) + '  ' + k));
  ck('real cards: nothing confidential in Team Work', confInTeam.length === 0, confInTeam);
  ck('real cards: every Team Work card has a deadline and an escalation path', (snap.items || []).filter(i => TW.place(i, rc).tab === 'team').every(i => { const p = TW.teamCard(i, rc); return p.deadline && isFinite(p.deadline.at) && p.escalation && p.escalation.words && p.role; }));
}
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
