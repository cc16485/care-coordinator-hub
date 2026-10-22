/* node tests/reached-by-test.js — reached-by.js (How did they reach us?, 2026-10-22): reading it off a lead, Called us or
   Walked in as the first conversation (once, never over a real one, never twice), the card tag, and the switch. */
global.LeadRules = require('../lead-rules.js');
const RB = require('../reached-by.js');
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };
const push = (l, ev) => { l.contact_events = (l.contact_events || []).concat([ev]); if(ev.actor === 'human' && ev.outcome === 'connected' && !l.first_human_contact_at) l.first_human_contact_at = ev.at; return l; };

/* ── reading it ── */
ck('a saved answer wins', RB.of({ reached_by:'walk_in', source:'Website' }) === 'walk_in');
ck('a website inquiry reads as Website form', RB.of({ contact_events:[{ channel:'web', outcome:'inquiry', direction:'in' }] }) === 'web');
ck('a website inquiry that says Facebook reads as Facebook form', RB.of({ source:'Referral', referral_source_name:'Facebook', contact_events:[{ channel:'web', outcome:'inquiry' }] }) === 'facebook');
ck('a lead made from a call reads as Called us', RB.of({ source:'Referral', from_calls:[{ message_id:'m1' }] }) === 'call');
ck('the old Source box: Phone = Called us, Website = Website form', RB.of({ source:'Phone' }) === 'call' && RB.of({ source:'Website' }) === 'web');
ck('Greg (Referral, referred by Online, nothing else) says nothing until someone answers', RB.of({ source:'Referral', referral_source_name:'Online' }) === '');
ck('a made-up value is ignored', RB.of({ reached_by:'pigeon', source:'Phone' }) === 'call');

/* ── Called us / Walked in = the first conversation ── */
let l = { id:'a', status:'New' };
ck('new lead, Called us: the first conversation, Contacted, nothing else', RB.applyOnSave(l, 'call', { isNew:true, by:'kry@x', push, at:'2026-10-22T15:00:00Z' }) === true
  && l.reached_by === 'call' && l.first_human_contact_at === '2026-10-22T15:00:00Z' && l.status === 'Contacted' && l.contact_events.length === 1 && l.contact_events[0].direction === 'in' && l.contact_events[0].actor === 'human', l);
ck('saved again with the same answer: nothing more is written', RB.applyOnSave(l, 'call', { isNew:false, by:'kry@x', push }) === false && l.contact_events.length === 1);
l = { id:'b', status:'New', contact_events:[{ channel:'web', outcome:'inquiry', direction:'in', at:'2026-10-22T07:54:00Z' }] };
ck('new lead, Website form: no conversation, the clock runs', RB.applyOnSave(l, 'web', { isNew:true, push }) === false && !l.first_human_contact_at && l.reached_by === 'web' && l.status === 'New');
ck('Greg: changed to Called us later: now counts as talked to', RB.applyOnSave(l, 'call', { isNew:false, by:'kry@x', push }) === true && !!l.first_human_contact_at && /Set on the lead: they called us/.test(l.contact_events.at(-1).note), l.contact_events);
l = { id:'c', status:'Contacted', first_human_contact_at:'2026-10-20T15:00:00Z', contact_events:[{ at:'2026-10-20T15:00:00Z', actor:'human', outcome:'connected', direction:'out' }] };
ck('already talked to: the answer is kept, no extra conversation', RB.applyOnSave(l, 'call', { isNew:false, push }) === false && l.reached_by === 'call' && l.contact_events.length === 1);
l = { id:'d', status:'New' };
ck('made from a call (Make this a lead): the call itself is the record, so nothing extra', RB.applyOnSave(l, 'call', { isNew:true, fromCall:true, push }) === false && l.reached_by === 'call' && !l.contact_events);
l = { id:'e', status:'New' };
ck('Walked in: in person, the first conversation', RB.applyOnSave(l, 'walk_in', { isNew:true, push }) === true && l.contact_events[0].channel === 'in_person' && !!l.first_human_contact_at);
ck('no answer picked: nothing changes', RB.applyOnSave(l = { id:'f' }, '', { isNew:true, push }) === false && !('reached_by' in l));

/* ── words, tag, switch ── */
ck('the note under the buttons', /No first-call alerts/.test(RB.noteFor('call')) && /5-minute first-call clock starts/.test(RB.noteFor('web')) && RB.noteFor('') === '');
ck('tag: Called us (filled) and who referred them', /rb-talk">Called us/.test(RB.tagHtml({ reached_by:'call', referral_source_name:'Mercy discharge planner' })) && /Referred by Mercy discharge planner/.test(RB.tagHtml({ reached_by:'call', referral_source_name:'Mercy discharge planner' })));
ck('tag: a form (outlined); "Online" is not shown as a referrer', /rb-form">Website form/.test(RB.tagHtml({ reached_by:'web', referral_source_name:'Online' })) && !/Referred by/.test(RB.tagHtml({ reached_by:'web', referral_source_name:'Online' })));
ck('tag: nothing known, no tag; names are escaped', RB.tagHtml({}) === '' && !/<b>/.test(RB.tagHtml({ reached_by:'call', referral_source_name:'<b>x</b>' })));
ck('off unless the switch is exactly on', !RB.liveOn({}) && !RB.liveOn({ lead_reached_by_live:'yes' }) && RB.liveOn({ lead_reached_by_live:true }));
ck('no em dash in what people read', !/[—―]/.test(require('fs').readFileSync(require('path').join(__dirname, '..', 'reached-by.js'), 'utf8').split('\n').filter(x => !/^\s*(\/\*|\*|\/\/)/.test(x)).join('\n')));
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
