// Cara's ready steps (Samantha 2026-11-18, "Yes, build it"): the rules in cara-steps.js, made-up people only.
// node tests/cara-steps-test.js
const CS = require('../cara-steps.js');
const R = []; const ok = (n, c, d) => R.push([c ? 'PASS' : 'FAIL', n, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 500)]);

ok('off for coordinators until the switch; owners always see it as practice', !CS.onFor({}, false) && CS.onFor({}, true) && CS.onFor({ cara_steps_live: true }, false));
ok('sending only when the switch is on (an owner looking does not turn it on)', !CS.liveOn({}) && !CS.liveOn({ cara_steps_live: 'true' }) && CS.liveOn({ cara_steps_live: true }));
ok('only call follow-up cards that came from a reading', CS.wants({ kind: 'call_followup', source: { message_id: 'm1' } }) && !CS.wants({ kind: 'call_followup', source: {} }) && !CS.wants({ kind: 'coverage', source: { message_id: 'm1' } }) && !CS.wants(null));

const steps = [
  { kind: 'ask_client_family_permission', draft: 'Hi Ann, may we move Thursday to Friday 9 to 1?' },
  { kind: 'axiscare_visit_change', waits_for_yes: true },
  { kind: 'text_caregiver', waits_for_yes: true, draft: 'All set for Friday.' },
  { kind: 'call_back' } ];
ok('the AxisCare change and the confirmation wait for the family', /Waits for the family/.test(CS.blockedBy(steps, 1)) && /Waits/.test(CS.blockedBy(steps, 2)));
ok('...the permission ask itself and a step that does not wait are never blocked', CS.blockedBy(steps, 0) === null && CS.blockedBy(steps, 3) === null);
const yes = steps.map((s, i) => i === 0 ? Object.assign({}, s, { done: { how: 'yes' } }) : s);
ok('...once the family said yes, they unlock', CS.blockedBy(yes, 1) === null && CS.blockedBy(yes, 2) === null);
const no = steps.map((s, i) => i === 0 ? Object.assign({}, s, { done: { how: 'no' } }) : s);
ok('...a no keeps them waiting and says why', /said no/.test(CS.blockedBy(no, 1)));
const sentOnly = steps.map((s, i) => i === 0 ? Object.assign({}, s, { done: { how: 'sent' } }) : s);
ok('...sending the ask is not a yes', /Waits/.test(CS.blockedBy(sentOnly, 1)));

const v = { visit_id: 9401, caregiver_id: 501, client: 'Ruth A', date: '2026-11-19', start: '10:00', end: '14:00', proposed: { date: '2026-11-20', start: '09:00', end: '13:00' } };
ok('the visit in words: Thu 10am to 2pm becomes Fri 9am to 1pm', CS.visitWords(v) === 'Thu, Nov 19 10am to 2pm becomes Fri, Nov 20 9am to 1pm', CS.visitWords(v));
const b = CS.changeBody(v, 'cs-abc12345');
ok('visit-change gets exactly what it wants: what we saw (expect), only what changes (set), no reason for a move, our change id',
  b.action === 'change' && b.visit_id === '9401' && b.expect.caregiver_id === '501' && b.expect.date === '2026-11-19' && b.expect.start === '10:00' && b.expect.end === '14:00'
  && JSON.stringify(b.set) === JSON.stringify({ date: '2026-11-20', start: '09:00', end: '13:00' }) && b.reason_id === 0 && b.change_id === 'cs-abc12345', b);
ok('...an end time only change sends only the end', JSON.stringify(CS.changeBody(Object.assign({}, v, { proposed: { end: '15:00' } }), 'cs-x1234567').set) === '{"end":"15:00"}');
ok('...the caregiver is never changed this way', !('caregiver_id' in CS.changeBody(v, 'cs-abc12345').set));
const good = CS.checkWords(Object.assign({}, v, { checks: { overlap: false, week_hours_after: 32, over_40: false } }));
ok('checks: no overlap and the week\'s hours, nothing flagged', good.length === 2 && good.every(x => !x.bad) && /32/.test(good[1].t));
const badck = CS.checkWords(Object.assign({}, v, { checks: { overlap: true, overlap_with: 'Dan 9am', week_hours_after: 43, over_40: true } }));
ok('...an overlap and going past 40 hours are flagged (the Apply button stays off)', badck.length === 2 && badck.every(x => x.bad) && /Dan 9am/.test(badck[0].t) && /past 40/.test(badck[1].t));
ok('texts are capped at 640 like the other office senders', CS.MAX === 640);
ok('no em dashes in the file', !require('fs').readFileSync(require('path').join(__dirname, '..', 'cara-steps.js'), 'utf8').includes('—'));

for (const [s, n, d] of R) console.log(s + ' · ' + n + (d ? '  ' + d : ''));
console.log(R.filter(r => r[0] === 'PASS').length + '/' + R.length);
process.exit(R.every(r => r[0] === 'PASS') ? 0 : 1);
