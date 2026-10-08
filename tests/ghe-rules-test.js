// Is the GHE booked and done in AxisCare? (GHE fix slice 3, 2026-10-08). node tests/ghe-rules-test.js
const G = require('../ghe-rules.js');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 600)]);
const v = (day, o = {}) => Object.assign({ id: 'v' + day, scheduledStartDate: day + 'T15:00:00Z', service: { code: 'GHE', procedureCode: 'T1001', description: 'General Health Evaluation' }, caregiver: { firstName: 'Natasha', lastName: 'Early' } }, o);
const clocked = { clockIn: { time: 'x' }, clockOut: { time: 'y' } };
ck('a T1001 visit is a GHE (by procedure code, code or description); personal care (T1019) is not; a removed visit is not',
  G.isGhe(v('2026-11-10')) && G.isGhe({ service: { code: 'T1001' } }) && G.isGhe({ service: { description: 'RN visit T1001' } }) && !G.isGhe({ service: { procedureCode: 'T1019' } }) && !G.isGhe(v('2026-11-10', { removed: true })))
ck('visited: clocked in and out in the month, with the nurse\'s name', (s => s.state === 'visited' && s.visit.nurse === 'Natasha Early')(G.monthState([v('2026-11-10', clocked)], '2026-11', '2026-11-20T00:00:00Z')))
ck('booked: a T1001 visit later in the month', G.monthState([v('2026-11-25')], '2026-11', '2026-11-20T00:00:00Z').state === 'booked')
ck('not visited: the booking passed with no clock-in', G.monthState([v('2026-11-12')], '2026-11', '2026-11-20T00:00:00Z').state === 'not_visited')
ck('none: only visits in another month or another service', G.monthState([v('2026-12-02'), v('2026-11-05', { service: { procedureCode: 'T1019' } })], '2026-11', '2026-11-20T00:00:00Z').state === 'none')
const cl = [{ id: 'a', name: 'A', axiscare_client_id: '1', ghe1: '2026-10', ghe2: '2027-04' }, { id: 'b', name: 'B', ghe1: '2026-11', ghe_makeup: '2026-12' }, { id: 'c', name: 'C', ghe1: '2026-11', active: false }, { id: 'd', name: 'D', ghe1: '2027-02' }]
ck('windows: last, this and next month only; a make-up month counts; inactive clients left out', G.windows(cl, '2026-11-15').map(w => w.client_id + w.month).join() === 'a2026-10,b2026-11,b2026-12', G.windows(cl, '2026-11-15'))
const W = { month: '2026-11' }, S = st => ({ state: st })
ck('before the 10th, not booked: nothing yet', G.stage(W, S('none'), '2026-11-09').actions.length === 0)
ck('the 10th, not booked: warn; the 20th: warn and a card; the last week (24th of 30): Samantha too', G.stage(W, S('none'), '2026-11-10').actions.join() === 'warn_unbooked' && G.stage(W, S('none'), '2026-11-20').actions.join() === 'warn_unbooked,unbooked_card' && G.stage(W, S('none'), '2026-11-24').actions.join() === 'warn_unbooked,unbooked_card,owner_alert')
ck('booked: no warnings at any point in the month', G.stage(W, S('booked'), '2026-11-28').actions.length === 0 && G.stage(W, S('booked'), '2026-11-28').stage === 'booked')
ck('a booking that passed without a clock-in is treated as not booked (warned)', G.stage(W, S('not_visited'), '2026-11-21').actions.indexOf('unbooked_card') > -1 && G.stage(W, S('not_visited'), '2026-11-21').stage === 'not_visited')
ck('visited, or a GHE form in the month: done', G.stage(W, S('visited'), '2026-11-25').stage === 'done' && G.stage(W, S('none'), '2026-11-25', true).stage === 'done')
ck('the month over with no visit: missed (a card); with a visit: done', G.stage(W, S('not_visited'), '2026-12-01').actions.join() === 'missed_card' && G.stage(W, S('visited'), '2026-12-01').stage === 'done')
ck('next month: upcoming, or booked ahead', G.stage({ month: '2026-12' }, S('none'), '2026-11-20').stage === 'upcoming' && G.stage({ month: '2026-12' }, S('booked'), '2026-11-20').stage === 'booked_ahead')
ck('missed resolution: what happened is required; outside our control and refused need the date; make-up needs the month', !G.missedResolution({}).ok && /date the PCCP/.test(G.missedResolution({ reason: 'outside_control' }).why) && /reported to DSDS/.test(G.missedResolution({ reason: 'refused' }).why) && /month it will be done/.test(G.missedResolution({ reason: 'make_up' }).why) && G.missedResolution({ reason: 'make_up', make_up_month: '2026-12' }).ok && G.missedResolution({ reason: 'refused', contacted_on: '2026-12-01' }).ok)
ck('month helpers: Dec + 1 = Jan next year; November has 30 days', G.addMonths('2026-12', 1) === '2027-01' && G.addMonths('2027-01', -1) === '2026-12' && G.lastDay('2026-11') === 30 && G.monthRange('2027-02').to === '2027-02-28')
let pass = 0; for (const [n, okk, dd] of res) { console.log((okk ? 'PASS  ' : 'FAIL  ') + n + (okk ? '' : '  ' + dd)); if (okk) pass++ }
console.log(`\n${pass} passed, ${res.length - pass} failed`); process.exit(pass === res.length ? 0 : 1)
