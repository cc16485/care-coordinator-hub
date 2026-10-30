/* node tests/client-history-test.js: client-history.js (Hub CRM Build Plan, Step D): the client profile's ONE history
   list. Every source lands in the right chip, newest first; the same thing from two sources shows once; important
   changes are marked; a source that fails leaves the rest showing with a plain line; the page carries the card. */
const path = require('path'), fs = require('fs');
const H = require('../client-history.js');
const LeadRules = require('../lead-rules.js');
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };
const NOW = '2026-10-15T20:00:00Z';
const names = { 'krystal@mo-care.com':'Krystal Smith', 'samantha@mo-care.com':'Samantha Dodson' };

const lead = { id:'L1', created_at:'2026-10-07T17:47:00Z', source:'Website', first_name:'Karen', last_name:'Hale', status:'Won',
  contact_events:[
    { at:'2026-10-07T18:12:00Z', channel:'call', direction:'out', outcome:'connected', by:'krystal@mo-care.com', note:'Booked the home visit for Friday', duration_s:840 },
    { at:'2026-10-12T20:30:00Z', channel:'sms', direction:'out', by:'krystal@mo-care.com', ref:'Tasha will be there Wednesday at 9.' }
  ],
  comm_log:[{ at:'2026-10-15T15:02:00Z', by:'krystal@mo-care.com', kind:'note', body:'Thursday start time change asked for.' }] };
const calls = { people:{ P2:{ rel:'daughter', name:'Karen Hale' } }, placed:{}, rows:[
  { id:11, recorded_at:'2026-10-07T18:13:30Z', kind:'summary', direction:'outbound', caller_phone:'4175550100', person_id:'P2', summary:'Booked the home visit for Friday 1:30. Private pay.', summary_source:'ghl', axiscare:'posted' },
  { id:12, recorded_at:'2026-10-07T18:14:00Z', kind:'outcome', direction:'outbound', caller_phone:'4175550100', person_id:'P2', outcome:'connected' },
  { id:13, recorded_at:'2026-10-15T19:14:00Z', kind:'summary', direction:'inbound', caller_phone:'4175550100', person_id:'P2', summary:'Mom liked Tasha. Asked if Thursdays can start at 9.', summary_source:'ghl' }
]};
const ax = [
  { id:1, at:'2026-10-07T18:20:00Z', via:'call-disposition', outcome:'sent_confirmed', summary:'Call summary posted', by_who:'krystal@mo-care.com' },
  { id:2, at:'2026-10-14T21:40:00Z', via:'careplan-tasks', outcome:'sent_confirmed', summary:'Care plan tasks sent', by_who:'krystal@mo-care.com' },
  { id:3, at:'2026-10-15T14:42:00Z', via:'schedule-push', outcome:'sent_confirmed', summary:'Schedule sent: Mon to Fri 8 to 12', by_who:'samantha@mo-care.com' },
  { id:4, at:'2026-10-13T14:00:00Z', via:'coverage-assign', outcome:'refused', summary:'Assign Ruth to Oct 13', by_who:'samantha@mo-care.com', detail:'shift not found' }
];
const edits = [
  { id:1, field:'days_needed', kind:'changed', old_value:'Mon, Wed', new_value:'Mon, Wed, Thu', changed_at:'2026-10-12T16:05:00Z', changed_by:'krystal@mo-care.com', changed_via:'person' },
  { id:2, field:'number_of_hours', kind:'changed', old_value:'12', new_value:'16', changed_at:'2026-10-12T16:05:00Z', changed_by:'krystal@mo-care.com', changed_via:'person' },
  { id:3, field:'phone', kind:'changed', old_value:'4175550100', new_value:'4175550199', changed_at:'2026-10-10T16:05:00Z', changed_by:'krystal@mo-care.com', changed_via:'person' },
  { id:4, field:'comm_log', kind:'changed', old_value:{ items:0 }, new_value:{ items:1 }, changed_at:'2026-10-15T15:02:00Z', changed_by:'krystal@mo-care.com', changed_via:'person' }
];
const journey = { names, defs:[{ key:'asmt.visit', title:'Assessment at the home' }], events:[
  { id:101, at:'2026-10-09T19:00:00Z', step_key:'asmt.visit', kind:'completed', actor_email:'krystal@mo-care.com', actor_name:'Krystal Smith', detail:{} },
  { id:102, at:'2026-10-11T15:00:00Z', step_key:null, kind:'reassigned_cc', actor_email:'samantha@mo-care.com', actor_name:'Samantha Dodson', detail:{ from:'krystal@mo-care.com', to:'samantha@mo-care.com' } },
  { id:103, at:'2026-10-11T15:00:00Z', step_key:null, kind:'created', actor_email:'hub', actor_name:'The Hub', detail:{}, is_test:true }
]};
const care = { reasons:{ pause:{ hospital:'Hospital stay' }, end:{} }, changes:[
  { change_id:'c1', kind:'pause', reason:'hospital', effective_date:'2026-10-05', followup_date:'2026-10-12', made_by:'samantha@mo-care.com', made_by_name:'Samantha Dodson', made_at:'2026-10-05T15:20:00Z', explanation:'Cox South, chest pain' },
  { change_id:'c2', kind:'resume', effective_date:'2026-10-15', made_by:'samantha@mo-care.com', made_by_name:'Samantha Dodson', made_at:'2026-10-15T14:41:00Z' }
]};
const ops = [
  { id:9, at:'2026-10-12T20:31:00Z', verb:'family_text_sent', summary:'Krystal texted Karen', actor_name:'Krystal Smith' },
  { id:8, at:'2026-10-01T12:00:00Z', verb:'callin_plan_updated', area:'coverage', summary:'Call-in plan updated for Dorothy Hale', actor_name:'Samantha Dodson' }
];
const local = { callouts:[{ id:'cv1', opened_at:'2026-10-05T12:48:00Z', calling_off:'Ruth', shift_date:'2026-10-05', shift_time:'8:00', covered_by:'Tasha' }],
  checkins:[], assessments:[], nurse_visits:[], start:[{ at:'2026-10-14T14:15:00Z', text:'Care began (first clock-in in AxisCare)' }] };

const ctx = { names, now:NOW, LeadRules };
const b = H.build({ lead, calls, ax, edits, journey, care, ops, local }, ctx);
const I = b.items, find = re => I.filter(x => re.test(x.title));

/* order and chips */
ck('newest first', I.every((x, i) => !i || I[i - 1].at >= x.at), I.map(x => x.at));
ck('no problems when every source loaded', b.problems.length === 0, b.problems);
const c = H.counts(I);
ck('chips: all = the sum of the six chips plus record edits', c.all === c.call + c.msg + c.note + c.journey + c.care + c.ax + I.filter(x => x.chip === 'edit').length, c);
ck('the chips are her seven, in her order', H.CHIPS.map(x => x[1]).join('|') === 'All|Calls|Texts & emails|Notes|Journey|Care changes|AxisCare');
ck('filter by a chip returns only that chip', H.filter(I, 'care').every(x => x.chip === 'care') && H.filter(I, 'all').length === I.length);

/* duplicates */
const oct7calls = I.filter(x => x.chip === 'call' && x.at.startsWith('2026-10-07'));
ck('the Oct 7 call is on the inquiry AND in the call record: shows once', oct7calls.length === 1, oct7calls);
ck('that one call keeps the call record summary and says who', /Karen \(daughter\)/.test(oct7calls[0].title) && /Booked the home visit for Friday 1:30/.test(oct7calls[0].detail), oct7calls[0]);
ck('the call summary posted to AxisCare is not a second entry', !I.some(x => x.src === 'ax' && /Call summary/.test(x.title)));
ck('the event record\'s copy of the Oct 12 text is dropped (the text itself shows)', I.filter(x => x.chip === 'msg' && x.at.startsWith('2026-10-12')).length === 1);
ck('an event record line nothing else has stays (call-in plan)', find(/Call-in plan updated/).length === 1 && find(/Call-in plan updated/)[0].chip === 'care');
ck('exact repeats from two sources collapse', H.dedupe([{ id:'a', at:'2026-10-01T10:00:00.000Z', chip:'journey', title:'Care began' }, { id:'b', at:'2026-10-01T10:04:00.000Z', chip:'journey', title:'Care began.' }]).length === 1);
ck('the same words far apart in time stay two entries', H.dedupe([{ id:'a', at:'2026-10-01T10:00:00.000Z', chip:'note', title:'Check-in' }, { id:'b', at:'2026-10-08T10:00:00.000Z', chip:'note', title:'Check-in' }]).length === 2);

/* what, when, who */
const note = find(/Thursday start time/)[0];
ck('a note says who wrote it', note && note.chip === 'note' && /^Krystal: /.test(note.title), note);
const pause = find(/^Care paused/)[0];
ck('care paused: why, dates, who, and it stands out', pause && pause.chip === 'care' && /Hospital stay/.test(pause.title) && /check back Oct 12/.test(pause.sub) && pause.who === 'Samantha' && pause.important === 'Important' && pause.detail === 'Cox South, chest pain', pause);
ck('care resumed is a care change too, without a second label', find(/^Care resumed/).length === 1 && !find(/^Care resumed/)[0].important);
const jdone = find(/Assessment at the home: done/)[0];
ck('a journey step done uses the step title and who', jdone && jdone.chip === 'journey' && jdone.who === 'Krystal', jdone);
const cc = find(/Care Coordinator changed/)[0];
ck('a Care Coordinator change names both people and stands out', cc && /Krystal to Samantha/.test(cc.title) && cc.important === 'Care Coordinator change', cc);
ck('practice (test) journey events are left out', !find(/Journey started/).length);
ck('the start events handed over by the profile are Journey', find(/Care began/).length === 1 && find(/Care began/)[0].chip === 'journey');

/* important changes */
ck('schedule sent to AxisCare: AxisCare chip, Schedule change', (x => x && x.chip === 'ax' && x.important === 'Schedule change' && x.who === 'Samantha')(find(/Schedule sent/)[0]), find(/Schedule sent/));
ck('care plan tasks: Care needs change', find(/Care plan tasks/)[0].important === 'Care needs change');
ck('a refused AxisCare change is red, not marked as done', (x => x.bad && !x.important && /refused/.test(x.sub))(find(/Assign Ruth/)[0]), find(/Assign Ruth/)[0]);
const callout = find(/Ruth called off/)[0];
ck('a callout covered by someone else is a Caregiver change', callout && callout.chip === 'care' && callout.important === 'Caregiver change' && /covered by Tasha/.test(callout.sub) && /called off Oct 5 8:00/.test(callout.title), callout);
const sched = I.find(x => x.src === 'edits' && x.at.startsWith('2026-10-12'));
ck('two record edits in one save are one line, under Care changes, as a Schedule change', sched && sched.chip === 'care' && sched.important === 'Schedule change' && /changed 2 things/.test(sched.title) && sched.detail.split('\n').length === 2 && sched.detail.includes('Mon, Wed → Mon, Wed, Thu') && sched.detail.includes('12 → 16'), sched);
const phone = I.find(x => x.src === 'edits' && x.at.startsWith('2026-10-10'));
ck('an ordinary record edit shows under All only, not a chip of its own', phone && phone.chip === 'edit' && H.filter(I, 'note').indexOf(phone) < 0, phone);
ck('call-log edits are not repeated as record edits', !I.some(x => x.src === 'edits' && x.at.startsWith('2026-10-15T15:02')));

/* a source fails: the rest still shows */
const f = H.build({ lead, calls, ax:null, edits, journey:null, care, ops, local, errors:{ ax:'permission denied', journey:'off' } }, ctx);
ck('a failed source is named in plain words', f.problems.length === 2 && f.problems.some(p => /AxisCare changes \(permission denied\)/.test(p.words)) && f.problems.some(p => /Journey history is switched off/.test(p.words)), f.problems);
ck('everything else still shows', f.items.some(x => x.chip === 'call') && f.items.some(x => x.chip === 'care') && !f.items.some(x => x.src === 'ax'));
const broken = H.build({ calls:{ rows:'not a list' }, care:{ changes:[{ made_at:'2026-10-01T00:00:00Z', kind:'pause' }] } }, ctx);
ck('a source with bad data never breaks the others', broken.items.length === 1 && broken.items[0].chip === 'care', broken);
ck('no lead, no AxisCare: an empty list, no crash', H.build({}, ctx).items.length === 0);

/* paging and words */
const many = H.build({ care:{ changes:Array.from({ length:70 }, (_, i) => ({ change_id:'x' + i, kind:'resume', effective_date:'2026-01-01', made_at:new Date(Date.parse('2026-01-01T12:00:00Z') + i * 864e5).toISOString() })) } }, ctx).items;
ck('the newest 50 come first, then Show older', H.PAGE === 50 && many.length === 70 && many.slice(0, H.PAGE)[0].at > many[69].at);
ck('day words: Today / Yesterday / weekday / another year', H.dayWords('2026-10-15T18:00:00Z', NOW) === 'Today' && H.dayWords('2026-10-14T18:00:00Z', NOW) === 'Yesterday'
  && H.dayWords('2026-10-12T18:00:00Z', NOW) === 'Mon Oct 12' && H.dayWords('2025-03-02T18:00:00Z', NOW) === 'Mar 2, 2025', [H.dayWords('2026-10-12T18:00:00Z', NOW), H.dayWords('2025-03-02T18:00:00Z', NOW)]);
ck('times are Central', H.timeWords('2026-10-15T19:14:00Z') === '2:14 PM');

/* 2026-10-30: the Family Circle's texts and emails, each naming who */
const family = { members:[
  { key:'4175550100', contact_id:'G1', ghl_name:'Karen Hale', people:[{ name:'Karen Hale', relationship:'Daughter' }], messages:[
    { at:'2026-10-12T20:30:20Z', direction:'out', type:'SMS', body:'Tasha will be there Wednesday at 9.' },
    { at:'2026-10-14T13:05:00Z', direction:'in', type:'SMS', body:'Mom is a little tired today, can Tasha help her shower?' },
    { at:'2026-10-14T13:20:00Z', direction:'in', type:'Call', body:'Call (completed)' },
    { at:'2026-10-13T16:00:00Z', direction:'out', type:'Email', body:'Your care schedule for next week.' } ] },
  { key:'4175550111', ghl_name:'Bob Hale', people:[{ name:'Bob Hale', relationship:'son' }, { name:'Linda Hale', relationship:'daughter-in-law' }], messages:[
    { at:'2026-10-11T22:00:00Z', direction:'in', type:'SMS', body:'Thank you all so much.' } ] },
  { key:'4175550122', ghl_name:'Someone Else', people:[{ name:'Mary Fox', relationship:'niece' }], messages:[{ at:'2026-10-11T22:00:00Z', direction:'in', type:'SMS', body:'not hers' }] },
  { key:'mike@x.com', people:[{ name:'Mike Hale', relationship:'grandson' }], error:'GoHighLevel answered 502' } ] };
const fb = H.build({ lead, family }, ctx), FI = fb.items;
const fam = FI.filter(x => x.src === 'family');
ck('a family member\'s text names them and says they texted us', fam.some(x => x.title === 'Karen (daughter) texted us' && /shower/.test(x.detail) && x.chip === 'msg'), fam.map(x => x.title));
ck('our text and email to them name who we sent it to', fam.some(x => x.title === 'We texted Karen (daughter)') && fam.some(x => x.title === 'We emailed Karen (daughter)'));
ck('calls from GoHighLevel are left to the call record', !fam.some(x => /call/i.test(x.title)));
ck('a shared number names both people', fam.some(x => x.title === 'Bob (son) or Linda (daughter-in-law) (shared number) texted us'), fam.map(x => x.title));
ck('a number GoHighLevel has under another name is not shown as theirs, and says so', !fam.some(x => /not hers/.test(x.detail)) && fb.problems.some(p => /Mary \(niece\)'s number under another name/.test(p.words)), fb.problems);
ck('a member whose texts could not load is named, not silent', fb.problems.some(p => /Could not load the texts with Mike \(grandson\) \(GoHighLevel answered 502\)/.test(p.words)), fb.problems);
ck('the inquiry log\'s copy of the same text shows once, as the named one', !FI.some(x => x.src === 'lead' && /texted/.test(x.title) && /Wednesday at 9/.test(x.detail)) && fam.some(x => x.title === 'We texted Karen (daughter)'), FI.filter(x => /Wednesday/.test(x.detail)).map(x => x.title));
ck('family texts sit in Texts & emails', H.counts(FI).msg === fam.length + FI.filter(x => x.src !== 'family' && x.chip === 'msg').length && fam.length === 4);

/* no em dashes anywhere she reads */
const src = fs.readFileSync(path.join(__dirname, '..', 'client-history.js'), 'utf8');
ck('no em dashes in client-history.js', src.indexOf('\u2014') < 0);
ck('no em dashes in any built entry', !JSON.stringify(I).includes('\u2014'));
ck('no em dashes in the family entries', !JSON.stringify(fb).includes('\u2014'));

/* the page carries it */
const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
ck('index.html loads client-history.js', /<script src="client-history\.js\?v=\d+"><\/script>/.test(page));
ck('the tab has the one History card and no stacked boxes', page.includes('<div id="cp_history"></div>') && !page.includes('<div id="cp_calls"></div>') && !page.includes('<div id="cp_ax_log"></div>') && !page.includes('<div id="cp_change_log"></div>') && !page.includes('id="cp_c_history"'));
ck('her words: the tab is Communication & Documents, second after Overview', (t => t[0] === 'summary' && t[1] === 'history')([...page.slice(page.indexOf('<div id="cpTabs"'), page.indexOf('</div>', page.indexOf('<div id="cpTabs"'))).matchAll(/data-cp="(\w+)"/g)].map(m => m[1])) && page.includes(">Communication &amp; Documents</button>") && !page.includes('>Activity &amp; Documents<'));
ck('the card is called Communication', src.includes('>Communication</b>'));
ck('EVV forms keep their own section', page.includes('<div id="cp_evv_forms"></div>'));
ck('the profile mounts it and hands over the start events', page.includes("if(typeof chMount==='function') chMount();") && page.includes("typeof chAddStart==='function') chAddStart(add);"));
ck('the History card reads nothing new: no service_role, no new function name', !/service_role|functions\/v1\/client-history/.test(src));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
