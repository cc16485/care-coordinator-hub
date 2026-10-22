/* node tests/lead-cards-test.js — lead-cards.js (Leads as cards, 2026-10-22): which step a family lands in, the two dates
   on every card (lead came in, last contact), the switch and the owner's preview, and that the board's rows draw. */
global.LeadRules = require('../lead-rules.js');
const C = require('../lead-cards.js');
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };
const NOW = '2026-10-22T19:30:00Z';   /* Thu Oct 22, 2:30 pm Central */
const step = (reason, l, ctx) => C.step({ reason }, l || {}, ctx || {});

/* ── the steps ── */
ck('new, replied, promised call, follow-ups, no next step → To call', ['new_overdue', 'new_running', 'replied', 'promise_late', 'promise_future', 'followup_late', 'followup_future', 'second_try', 'no_next_step', 'new_before_open', 'medicaid_closed'].every(r => step(r) === 'call'));
ck('a visit to book, booked, overdue, or a plan to write → Home visit', ['asmt_booked', 'asmt_plan', 'urgent_start', 'asmt_overdue'].every(r => step(r) === 'visit'));
ck('waiting on the family, the VA, an insurer, the state → Deciding', ['family_decision', 'va', 'ltc', 'state', 'not_ready'].every(w => step('waiting', { waiting:{ reason:w, since:'2026-10-10', check_back:'2026-10-30' } }) === 'decide'));
ck('a check-back that is due stays in Deciding', step('check_back_due', { waiting:{ reason:'family_decision', since:'2026-10-10', check_back:'2026-10-22' } }) === 'decide');
ck('a family we cannot reach is still To call', step('waiting', { waiting:{ reason:'unable_to_reach', since:'2026-10-10', check_back:'2026-10-30' } }) === 'call' && step('check_back_due', { waiting:{ reason:'unable_to_reach', since:'2026-10-10', check_back:'2026-10-22' } }) === 'call');
ck('deciding too long, authorized, the state rules → Deciding', ['decision_stale', 'authorized', 'dsds_21', 'medicaid_45', 'waiting_state_nodate'].every(r => step(r) === 'decide'));
ck('a reply from a family whose plan is written → Deciding (where they are, not what is urgent)', step('replied', {}, { assessments:[{ status:'Plan Drafted', visit_date:'2026-10-16' }] }) === 'decide');
ck('a reply from a family whose visit is booked → Home visit', step('replied', {}, { assessments:[{ status:'Scheduled', visit_date:'2026-10-24' }] }) === 'visit');
ck('a reply with the plan still to write → Home visit', step('replied', {}, { assessments:[{ status:'Completed — Awaiting Plan', visit_date:'2026-10-20' }] }) === 'visit');
ck('status Assessment Scheduled with no visit record → Home visit', step('followup_future', { status:'Assessment Scheduled' }) === 'visit');

/* ── the dates ── */
ck('came in today → "Today, 2:12 pm"', C.cameIn({ created_at:'2026-10-22T19:12:00Z' }, NOW) === 'Today, 2:12 pm', C.cameIn({ created_at:'2026-10-22T19:12:00Z' }, NOW));
ck('came in yesterday → "Yesterday, …"', /^Yesterday, /.test(C.cameIn({ created_at:'2026-10-21T15:00:00Z' }, NOW)));
ck('came in Tuesday → "Tue, Oct 20" (no time)', C.cameIn({ created_at:'2026-10-20T15:00:00Z' }, NOW) === 'Tue, Oct 20', C.cameIn({ created_at:'2026-10-20T15:00:00Z' }, NOW));
ck('the inquiry event wins over the record date', C.cameIn({ created_at:'2026-10-21T15:00:00Z', contact_events:[{ at:'2026-10-15T15:00:00Z', channel:'web', outcome:'inquiry', direction:'in' }] }, NOW) === 'Thu, Oct 15');
ck('no date at all → empty (the card says Not known)', C.cameIn({}, NOW) === '');
const ev = (at, o) => Object.assign({ at, channel:'call', direction:'out', actor:'human', outcome:'connected' }, o || {});
ck('last contact: a call that reached them → "Call with Paul, yesterday, 11:15 am"', C.lastContact({ first_name:'Paul', contact_events:[ev('2026-10-21T16:15:00Z')] }, NOW).text === 'Call with Paul, yesterday, 11:15 am', C.lastContact({ first_name:'Paul', contact_events:[ev('2026-10-21T16:15:00Z')] }, NOW).text);
ck('last contact: a voicemail Tuesday', C.lastContact({ contact_events:[ev('2026-10-20T21:30:00Z', { outcome:'voicemail' })] }, NOW).text === 'Voicemail, Tue, 4:30 pm', C.lastContact({ contact_events:[ev('2026-10-20T21:30:00Z', { outcome:'voicemail' })] }, NOW).text);
ck('last contact: the family texted today', C.lastContact({ first_name:'Amy', contact_events:[ev('2026-10-20T15:00:00Z'), ev('2026-10-22T19:05:00Z', { channel:'sms', direction:'in', actor:'family', outcome:'replied' })] }, NOW).text === 'Amy texted, today, 2:05 pm');
ck('last contact: the newest wins, whatever the order', C.lastContact({ contact_events:[ev('2026-10-21T16:00:00Z', { channel:'sms', outcome:'sent' }), ev('2026-10-14T16:00:00Z')] }, NOW).text === 'We texted, yesterday, 11 am', C.lastContact({ contact_events:[ev('2026-10-21T16:00:00Z', { channel:'sms', outcome:'sent' }), ev('2026-10-14T16:00:00Z')] }, NOW).text);
ck('last contact: an older call shows the date', C.lastContact({ first_name:'Jen', contact_events:[ev('2026-10-10T16:00:00Z')] }, NOW).text === 'Call with Jen, Sat, Oct 10');
ck('last contact: the inquiry and machine messages do not count', C.lastContact({ first_human_attempt_at:null, contact_events:[{ at:'2026-10-22T19:00:00Z', channel:'web', direction:'in', outcome:'inquiry' }, { at:'2026-10-22T19:01:00Z', channel:'sms', direction:'out', actor:'system', outcome:'sent' }] }, NOW).text === 'None yet');
ck('last contact: tried but never reached and nothing logged → Not reached yet', C.lastContact({ first_human_attempt_at:'2026-10-22T19:00:00Z' }, NOW).text === 'Not reached yet');
ck('last contact: a home visit after the last call', C.lastContact({ contact_events:[ev('2026-10-14T16:00:00Z')] }, NOW, { assessments:[{ status:'Completed — Awaiting Plan', visit_date:'2026-10-20' }] }).text === 'Home visit, Tue, Oct 20');
ck('last contact: a visit only booked is not contact', C.lastContact({ first_name:'Dan', contact_events:[ev('2026-10-21T15:05:00Z')] }, NOW, { assessments:[{ status:'Scheduled', visit_date:'2026-10-24' }] }).text === 'Call with Dan, yesterday, 10:05 am');

/* ── home visit, not assessment, on the cards ── */
ck('card words: assessment → home visit', C.hv('Schedule assessment') === 'Book home visit' && C.hv('Open assessment') === 'Open home visit' && C.hv('assessment at the home') === 'home visit'
  && C.hv('Assessment done Oct 20') === 'Home visit done Oct 20' && C.hv('Do the assessment, then the outcome') === 'Do the home visit, then the outcome' && C.hv('assessment not booked yet') === 'home visit not booked yet', [C.hv('Open assessment'), C.hv('Do the assessment, then the outcome')]);

/* ── the switch and the preview ── */
const store = {}; global.localStorage = { getItem:k => (k in store ? store[k] : null), setItem:(k, v) => { store[k] = String(v); }, removeItem:k => { delete store[k]; } };
ck('off by default: nobody sees the cards', !C.showing({}, true) && !C.showing({}, false) && !C.liveOn({ leads_cards_live:'yes' }));
C.setPreview(true);
ck('an owner\'s preview shows the cards to that owner only', C.showing({}, true) && !C.showing({}, false));
C.setPreview(false);
ck('the switch on: everyone sees the cards', C.showing({ leads_cards_live:true }, false) && C.showing({ leads_cards_live:true }, true));

/* ── drawing: real board rows, red first inside a step ── */
const R = LeadRules, hours = R.responseHours({});
const mkRow = (l, ctx) => { const cx = Object.assign({ now:NOW, today:'2026-10-22', hours, stage:'connected', no_medicaid:true, no_drafts:true, quiet_nudges:true }, ctx || {}); return { r:R.boardRow(l, cx), l, ctx:cx, v:{} }; };
const work = [
  mkRow({ id:'a', first_name:'Sue', client_first_name:'Jim', client_last_name:'Porter', funding_source:'private', created_at:'2026-10-09T15:00:00Z', first_human_contact_at:'2026-10-09T16:00:00Z', follow_up_due:'2026-10-25' }),
  mkRow({ id:'b', first_name:'Mark', client_first_name:'Helen', client_last_name:'Brooks', funding_source:'private', created_at:'2026-10-22T19:00:00Z', status:'New', contact_events:[{ at:'2026-10-22T19:00:00Z', channel:'web', outcome:'inquiry', direction:'in' }] }, { stage:'new' }),
  mkRow({ id:'c', first_name:'June', client_first_name:'Walter', client_last_name:'Price', funding_source:'va', created_at:'2026-10-14T15:00:00Z', first_human_contact_at:'2026-10-14T16:00:00Z' }, { assessments:[{ status:'Scheduled', visit_date:'2026-10-23' }] })
];
const h = { btn:(l, a) => '<button class="lb-btn">' + a.label + '</button>', yesReady:() => true, fromWeb:l => l.id === 'b' };
C.state.step = 'call';
const out = C.html(work, NOW, h);
ck('the steps carry their counts', /<span class="lc-step-n">2<\/span><span class="lc-step-l">To call/.test(out) && /<span class="lc-step-n">1<\/span><span class="lc-step-l">Home visit/.test(out) && /<span class="lc-step-n">0<\/span><span class="lc-step-l">Deciding/.test(out), out.slice(0, 900));
ck('the brand-new family is first and red, the follow-up after it', out.indexOf('Helen Brooks') > -1 && out.indexOf('Helen Brooks') < out.indexOf('Jim Porter') && /lcd lcd-red/.test(out));
ck('every card shows both dates', (out.match(/Lead came in/g) || []).length === 2 && (out.match(/Last contact/g) || []).length === 2);
ck('From website shows on the website lead', /From website/.test(out));
ck('They said yes only in Deciding', !/They said yes/.test(out));
C.state.step = 'visit';
const out2 = C.html(work, NOW, h);
ck('Home visit holds the booked visit', /Walter Price/.test(out2) && !/Helen Brooks/.test(out2));
ck('names are escaped', !/<script>/.test(C.html([mkRow({ id:'x', first_name:'<script>', client_first_name:'<script>' })], NOW, h)));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
