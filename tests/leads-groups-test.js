/* The simpler Leads list (leads-groups.js, 2026-11-23): which group each family lands in and what the row says.
   Families are shaped like the real ones on the board that day. Run: node tests/leads-groups-test.js */
const R = require('../lead-rules.js');
global.LeadRules = R;
const G = require('../leads-groups.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if(c){ pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')');

const now = '2026-11-23T21:00:00.000Z';
const ev = (at, channel, direction, actor, outcome, dur) => ({ at, channel, direction, actor, outcome, duration_s:dur || 0 });
const row = (l, r) => ({ l, r:Object.assign({ group:'now', reason:'no_next_step', sort:now, next:{ text:'Set the next step' }, primary:{ kind:'followup', label:'Set follow-up' }, name:((l.first_name || '') + ' ' + (l.last_name || '')).trim() }, r || {}) });

const nora = { id:'L1', first_name:'Nora', last_name:'P', phone:'4175555752', email:'nora@gmail.com', source:'Website', created_at:'2026-11-01T10:22:46Z', why_called:'Needs help with errands',
  contact_events:[ev('2026-11-01T10:22:46Z', 'web', 'in', 'family', 'inquiry'), ev('2026-11-01T10:22:50Z', 'sms', 'out', 'automation', 'sent')], family_last_reply_at:'2026-11-01T10:22:46Z' };
const hank = { id:'L2', first_name:'Hank', phone:'4175556255', email:'hank@yahoo.com', created_at:'2026-10-22T07:54:59Z', contact_attempts:1,
  contact_events:[ev('2026-10-22T07:54:59Z', 'web', 'in', 'family', 'inquiry'), ev('2026-10-22T14:10:32Z', 'call', 'out', 'human', 'voicemail'), ev('2026-10-22T16:30:12Z', 'call', 'in', 'family', 'missed')] };
const dot = { id:'L3', first_name:'Dot', phone:'4175551330', created_at:'2026-09-24T17:08:49Z', contact_attempts:1, contact_events:[ev('2026-10-07T16:32:56Z', 'call', 'out', 'human', 'voicemail')] };
const walt = { id:'L4', first_name:'Walt', phone:'4175551176', created_at:'2026-11-21T00:46:04Z', contact_attempts:2,
  contact_events:[ev('2026-11-21T00:46:04Z', 'web', 'in', 'family', 'inquiry'), ev('2026-11-23T20:05:00Z', 'call', 'out', 'human', 'voicemail', 40), ev('2026-11-23T20:27:00Z', 'call', 'out', 'human', 'no_answer')] };
const bea = { id:'L5', first_name:'Bea', phone:'4175555819', created_at:'2026-11-23T17:39:05Z', first_human_contact_at:'2026-11-23T15:44:46Z',
  contact_events:[ev('2026-11-23T15:36:21Z', 'call', 'in', 'family', 'missed'), ev('2026-11-23T15:44:46Z', 'call', 'out', 'human', 'connected', 397)] };
const faye = { id:'L6', first_name:'Faye', phone:'4175552658', email:'faye@gmail.com', created_at:'2026-11-18T18:12:20Z', first_human_contact_at:'2026-11-18T19:27:19Z',
  contact_events:[ev('2026-11-18T19:27:19Z', 'call', 'out', 'human', 'connected')] };
const otis = { id:'L7', first_name:'Otis', phone:'4175554015', created_at:'2026-10-26T14:29:00Z', first_human_contact_at:'2026-10-26T15:00:00Z' };
const sales1 = { id:'S1', first_name:'Vic', phone:'4175552720', email:'vic@datalabs-example.com', created_at:'2026-11-15T15:03:00Z', contact_events:[ev('2026-11-15T15:03:00Z', 'web', 'in', 'family', 'inquiry')] };
const sales2 = { id:'S2', first_name:'Lou', phone:'4175552720', email:'lou@gmail.com', created_at:'2026-11-18T23:36:00Z' };
const partner = { id:'S3', first_name:'Mae', phone:'4175556833', email:'mae@respite-example.org', created_at:'2026-11-10T18:20:00Z' };

const work = [
  row(nora, { reason:'replied' }),
  row(hank, { reason:'replied' }),
  row(dot, { reason:'second_try_late' }),
  row(walt, { reason:'followup_late' }),
  row(bea, { reason:'no_next_step' }),
  row(faye, { group:'waiting', reason:'waiting', sort:'2026-12-01', next:{ text:'Next check Monday Dec 1' } }),
  row(otis, { reason:'asmt_plan', sort:'2026-10-30' }),
  row(sales1, { reason:'replied' }), row(sales2, { reason:'replied' }), row(partner, { reason:'replied' }),
];
const by = G.groups(work, now);
const ids = k => by[k].map(x => x.l.id);

console.log('Groups');
eq(ids('call'), ['L3', 'L2', 'L1', 'L4', 'L5'], 'Call today: longest wait first (Dot 7 weeks, Hank called back 4 weeks, Nora 3 weeks, Walt, Bea)');
eq(ids('wait'), ['L6'], 'Faye waits with her date');
eq(ids('plan'), ['L7'], 'Otis is ready for the care plan');
eq(ids('odd'), ['S1', 'S2', 'S3'], 'the same phone twice and a business email wait in Not families?');

console.log('Words');
const p = id => work.concat([]).map(x => G.place(x, now, work.map(w => w.l))).find((q, i) => work[i].l.id === id);
eq(p('L1').happened, 'Never called.', 'Nora: never called (the website form is not a reply)');
eq(p('L1').next, 'Call Nora', 'Nora: Call Nora');
ok(p('L1').why === 'Needs help with errands', 'Nora: what she asked for rides along');
ok(/^They called .*we missed it\.$/.test(p('L2').happened), 'Hank: they called back and we missed it (' + p('L2').happened + ')');
eq(p('L2').next, 'Call Hank back', 'Hank: call back');
ok(/^Voicemail /.test(p('L3').happened), 'Dot: voicemail (' + p('L3').happened + ')');
eq(p('L3').next, 'Try Dot again (2nd try)', 'Dot: 2nd try');
eq(p('L4').next, 'Try Walt again (3rd try)', 'Walt: 3rd try');
ok(/\(2 tries\)/.test(p('L4').happened), 'Walt: 2 tries shown (' + p('L4').happened + ')');
eq(p('L5').next, 'Call Bea to book the home visit', 'Bea: talked, book the home visit');
eq(p('L5').button.kind, 'schedule', 'Bea: the button books the visit');
ok(/^Talked .*\(7 min\)\.$/.test(p('L5').happened), 'Bea: talked 7 min (' + p('L5').happened + ')');
eq(p('L6').date, '2026-12-01', 'Faye: her date');
eq(p('L6').button.kind, 'waiting', 'Faye: Change date opens Waiting on');
eq(p('L7').next, 'Write the care plan', 'Otis: write the care plan');
eq(p('L7').waited, 24, 'Otis: 24 days since the visit');
const five = G.place(row(Object.assign({}, dot, { contact_attempts:3 })), now, []);
ok(/^Last try/.test(five.next), 'three tries with no answer: last try, then close it');

console.log('Not families');
eq(G.notFamily(sales1, [sales1, sales2]), 'same phone as 1 other lead', 'same phone');
ok(/business email \(respite-example\.org\)/.test(G.notFamily(partner, [partner])), 'business email');
eq(G.notFamily(Object.assign({}, partner, { family_confirmed_at:now }), [partner]), '', 'It\'s a family keeps it on the list');
eq(G.notFamily(Object.assign({}, partner, { first_human_contact_at:now }), [partner]), '', 'once we talked with them it is a family');
eq(G.notFamily(nora, [nora]), '', 'a gmail family is a family');

console.log('Trusted next steps and first calls');
eq(G.place(row(nora, { reason:'promise_late', next:{ text:'Call Nora back: we said Tue 2 pm' }, primary:{ kind:'call', label:'Call' } }), now, []).next, 'Call Nora back: we said Tue 2 pm', 'a promise keeps the board\'s words');
eq(G.place(row(nora, { reason:'new_running' }), now, []).next, 'First call to Nora', 'a brand new family');
eq(G.place(row(nora, { group:'later', reason:'new_before_open' }), now, []).group, 'call', 'a night inquiry is Call today, not waiting');
eq(G.place(row(faye, { group:'later', reason:'asmt_booked', sort:'2026-11-25T15:00:00Z', next:{ text:'Do the assessment' } }), now, []).button.kind, 'open_asmt', 'a booked home visit opens the visit');

console.log('Page');
const h = G.html(work, now, { btn:(l, a, prim) => '<b data-btn="' + a.kind + '">' + a.label + '</b>', today:'2026-11-23' });
ok(/<b>\d+<\/b> Hot/.test(h) && /<b>\d+<\/b> Warm/.test(h) && /<b>\d+<\/b> Cold/.test(h), 'the three counts');
ok(/Not families\? 3 to sort/.test(h), 'the Not families box');
ok(/Dec 1: Next check/.test(h), 'Faye shows her day');
ok(h.indexOf('data-lg-col="hot"') < h.indexOf('data-lg-col="warm"') && h.indexOf('data-lg-col="warm"') < h.indexOf('data-lg-col="cold"'), 'order: Hot, Warm, Cold');
ok(!/<script/i.test(h), 'no scripts in the list');
const xss = G.html([row(Object.assign({}, nora, { first_name:'<img src=x onerror=alert(1)>' }))], now, { btn:() => '', today:'2026-11-23' });
ok(!/<img src=x/.test(xss), 'names are escaped');

console.log('Hot, Warm, Cold');
const T = (l, r) => G.temp(row(l, r), now);
eq(T(otis, { reason:'asmt_plan', sort:'2026-10-30' }).v, 'hot', 'home visit done is Hot');
eq(T(faye, { group:'later', reason:'asmt_booked', sort:'2026-11-25' }).v, 'hot', 'home visit booked is Hot');
eq(T(Object.assign({}, dot, { contact_attempts:3 })).v, 'cold', '3 tries, never reached is Cold');
eq(T(Object.assign({}, walt, { desired_start:{ kind:'asap' } })).v, 'hot', '"right away" is Hot');
eq(T(Object.assign({}, faye, { desired_start:{ kind:'planning' } })).v, 'cold', 'planning ahead is Cold');
eq(T(bea).v, 'warm', 'talked, nothing urgent yet is Warm');
eq(T(dot).why, 'quiet 6 weeks', 'quiet 30+ days is Cold, and says so');
eq(T(dot).v, 'cold', 'quiet 30+ days is Cold');
const moved = Object.assign({}, bea, { lead_temp:{ v:'cold', by:'krystal@mo-care.com', by_name:'Krystal Land', at:now } });
eq(T(moved).v, 'cold', 'a person\'s move wins');
eq(T(moved).why, 'moved by Krystal', 'and says who moved it');
eq(T(moved, { reason:'asmt_booked', group:'later' }).v, 'hot', 'a booked home visit still makes it Hot');
const movedEarly = Object.assign({}, dot, { contact_attempts:0, lead_temp:{ v:'hot', by:'s@x', at:'2026-11-01T00:00:00Z' },
  contact_events:[ev('2026-11-02T15:00:00Z', 'call', 'out', 'human', 'voicemail'), ev('2026-11-05T15:00:00Z', 'call', 'out', 'human', 'no_answer'), ev('2026-11-09T15:00:00Z', 'call', 'out', 'human', 'voicemail')] });
eq(T(movedEarly).v, 'cold', '3 unanswered tries after a move to Hot make it Cold again');
const m = G.model(work, now);
eq(m.odd.map(x => x.l.id), ['S1', 'S2', 'S3'], 'not-families stay out of the three columns');
ok(m.hot.length + m.warm.length + m.cold.length === 7, 'every family is in one column');

console.log('Steps');
const st = x => G.steps(row(x.l || x, x.r), now).map(s => s.state[0]).join('');
eq(st(nora), 'ntttt', 'Nora: First call is due');
eq(st(faye), 'ddntt', 'Faye: called, talked, home visit due');
eq(st({ l:otis, r:{ reason:'asmt_plan', sort:'2026-10-30' } }), 'dddnt', 'Otis: care plan & agreement due');
eq(G.steps(row(bea), now)[1].words, 'Today', 'Bea: talked today');

console.log('Every call and text');
const tj = G.touches(faye.contact_events ? Object.assign({}, faye, { contact_events:[ev('2026-11-18T18:12:20Z', 'web', 'in', 'family', 'inquiry'), ev('2026-11-18T18:12:25Z', 'sms', 'out', 'automation', 'sent'), ev('2026-11-18T18:26:27Z', 'call', 'out', 'human', 'no_answer'), ev('2026-11-18T18:53:21Z', 'call', 'in', 'family', 'missed'), ev('2026-11-18T19:27:19Z', 'call', 'out', 'human', 'connected', 380)] }) : faye);
eq(tj.map(t => t.word), ['auto text', 'no answer', 'they called, missed', 'talked 6 min'], 'every reach-out in order, the website form left out');
eq(tj.map(t => t.tone), ['auto', 'out', 'in', 'ok'], 'theirs, ours and talked look different');
const ch = G.html(work, now, { btn:(l, a) => '<b>' + a.label + '</b>', today:'2026-11-23', view:'chart' });
ok(/Every call &amp; text/.test(ch) && /talked 7 min/.test(ch), 'the chart shows every call and text');
ok((ch.match(/onclick="lgTemp\(/g) || []).length === 14, 'the chart\'s Hot / Warm / Cold can be clicked (2 per family)');
const bd = G.html(work, now, { btn:(l, a) => '<b>' + a.label + '</b>', today:'2026-11-23', view:'board' });
ok((bd.match(/data-lg-col=/g) || []).length === 3 && (bd.match(/draggable="true"/g) || []).length === 7, 'the board: 3 columns, 7 cards to drag');
ok(/Move: /.test(bd), 'each card has Move: words for a phone');

console.log((fail ? '✗ ' : '✓ ') + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
