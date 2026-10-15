/* node tests/one-next-test.js
   CRM plan step A (Samantha 2026-10-15, "yes to all 10"): ONE next step everywhere. LeadRules.oneNext decides, in order:
   a promise to the family that is due, then (before the yes) reaching and deciding, then the journey's next step.
   The board's update-owed row and the Referred to Caring CDS reason ride along. */
const R = require('../lead-rules.js');
let pass = 0, fail = 0;
const ck = (name, ok, extra) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (ok || extra === undefined ? '' : '  ' + JSON.stringify(extra))); };
const now = '2026-10-15T16:00:00.000Z', today = '2026-10-15';   /* Thursday 11 am in Springfield */
const base = { id:'L1', first_name:'Mary', last_name:'Smith', client_first_name:'Ann', client_last_name:'Smith', status:'Contacted', phone:'4175550100',
  first_human_contact_at:'2026-10-14T15:00:00.000Z', created_at:'2026-10-14T14:00:00.000Z', contact_events:[{ actor:'human', direction:'out', at:'2026-10-14T15:00:00.000Z', outcome:'connected' }] };
const L = o => Object.assign({}, base, o || {});
const J = { title:'Book the assessment', why:'', status:'ready' };

let o = R.oneNext(L({ promised_callback_at:'2026-10-15T14:00:00.000Z' }), { now, today, journey_next:J });
ck('a promised call that is late comes first, even with a journey step waiting', o.source === 'family' && o.reason === 'promise_late' && /Call Mary back/.test(o.text) && o.due, o);

o = R.oneNext(L(), { now, today, journey_next:J, contract:{ next_update_owed_on:'2026-10-15' } });
ck('the update we owe on the Start Contract, due today, comes first', o.source === 'family' && o.reason === 'update_owed' && o.text === 'Give Mary their update', o);

o = R.oneNext(L(), { now, today, journey_next:J, contract:{ next_update_owed_on:'2026-10-20' } });
ck('an update owed next week does not jump ahead', o.reason !== 'update_owed', o);

o = R.oneNext(L(), { now, today, journey_next:J });
ck('nothing due with the family, before the yes: the journey step', o.source === 'journey' && o.text === 'Book the assessment', o);

o = R.oneNext(L(), { now, today });
ck('no journey step either: the board asks for a next step', o.source === 'lead' && o.reason === 'no_next_step', o);

const yes = { said_yes_at:'2026-10-14T18:00:00.000Z', status:'Converted' };
o = R.oneNext(L(yes), { now, today, journey_next:{ title:'Enter the client in AxisCare', why:'', status:'ready' } });
ck('after the yes: the journey step', o.source === 'journey' && o.text === 'Enter the client in AxisCare', o);

o = R.oneNext(L(Object.assign({ promised_callback_at:'2026-10-15T13:00:00.000Z' }, yes)), { now, today, journey_next:J });
ck('after the yes, a late promised call still comes first', o.source === 'family' && /^Call back: we said/.test(o.text), o);

o = R.oneNext(L(yes), { now, today, journey_next:J, contract:{ next_update_owed_on:'2026-10-13' } });
ck('after the yes, a late family update comes first', o.source === 'family' && o.reason === 'update_owed' && /owed/.test(o.text), o);

o = R.oneNext(L({ family_last_reply_at:'2026-10-15T15:30:00.000Z' }), { now, today, journey_next:J });
ck('a family reply waiting for us comes first', o.source === 'family' && o.reason === 'replied', o);

o = R.oneNext(null, { now, today, journey_next:J });
ck('an AxisCare client with no inquiry: the journey step', o.source === 'journey' && o.text === 'Book the assessment', o);

/* the board row for the update owed */
const br = R.boardRow(L(), { now, today, stage:'connected', contract:{ next_update_owed_on:'2026-10-13' } });
ck('the Leads board shows the late update in Need you now, 2 days late', br.group === 'now' && br.reason === 'update_owed' && br.when.big === 'Update 2 days late' && br.when.tone === 'red', br.when);

/* stageWord matches the page's leadStage words */
ck('stageWord: Converted is won', R.stageWord(L({ status:'Converted' }), today) === 'won');
ck('stageWord: talked to, nothing ahead, is connected', R.stageWord(L(), today) === 'connected');
ck('stageWord: talked to with a follow-up next week is deciding', R.stageWord(L({ follow_up_due:'2026-10-20' }), today) === 'deciding');
ck('stageWord: never talked to but called is reaching out', R.stageWord({ status:'New', contact_events:[{ actor:'human', direction:'out', at:now }] }, today) === 'reaching_out');
ck('stageWord: nothing yet is new', R.stageWord({ status:'New' }, today) === 'new');

/* Referred to Caring CDS */
const rec = R.lostRecord(L(), 'referred_cds', '');
ck('Referred to Caring CDS is a reason with a key', rec && rec.lost_reason_key === 'referred_cds' && rec.lost_reason === 'Referred to Caring CDS', rec);
ck('no em dash in what staff read', ![o, br].some(x => /—/.test(JSON.stringify(x))) && !/—/.test(R.LOST_LABEL.referred_cds));
console.log(`one-next: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
