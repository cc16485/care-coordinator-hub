// Who may do a GHE (GHE fix slice 2, 2026-10-08). node tests/nurse-rules-test.js
const N = require('../nurse-rules.js');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 600)]);
const T = '2026-10-08';
const rn = { id: 'r', name: 'Rita Reed', cred: 'RN', license: 'RN123', expires: '2027-06-30', email: 'rita@mo-care.com', employee: true, supervising_rn: true };
const lpn = { id: 'l', name: 'Lena Lowe', cred: 'LPN', license: 'PN9', expires: '2027-01-31', email: 'lena@mo-care.com', employee: true };
const staff = [rn, lpn];
ck('an RN, our employee, current license, supervising: ready', N.readiness(rn, staff, T).ready && N.supervisor(staff, T).name === 'Rita Reed')
ck('an LPN with a supervising RN on the team: ready', N.readiness(lpn, staff, T).ready && N.readiness(lpn, staff, T).supervisor === 'Rita Reed')
ck('an LPN with no supervising RN: not ready ("an LPN works under RN oversight")', !N.readiness(lpn, [lpn, Object.assign({}, rn, { supervising_rn: false })], T).ready && /supervising RN/.test(N.readiness(lpn, [lpn], T).missing.join()))
ck('...nor when the supervising RN\'s own license has expired', !N.readiness(lpn, [lpn, Object.assign({}, rn, { expires: '2026-09-01' })], T).ready)
ck('today\'s nurse as entered (name only): not ready, and says exactly what is missing', (r => !r.ready && r.missing.join('|') === 'RN or LPN|confirmed as our employee (not a contractor)|license number|license expiry date' && !r.portal)(N.readiness({ name: 'Natasha Early' }, [{ name: 'Natasha Early' }], T)), N.readiness({ name: 'Natasha Early' }, [], T))
ck('a contractor is not ready (the state requires an employee)', !N.readiness(Object.assign({}, rn, { employee: false }), staff, T).ready)
ck('an expired license: not ready; expiring within 60 days: ready with a warning', !N.readiness(Object.assign({}, rn, { expires: '2026-10-07' }), staff, T).ready && (r => r.ready && /expires 2026-11-30/.test(r.warn.join()))(N.readiness(Object.assign({}, rn, { expires: '2026-11-30' }), staff, T)))
ck('no email: still ready for GHEs, warned there is no Nurse Portal', (r => r.ready && !r.portal && /no Nurse Portal/.test(r.warn.join()))(N.readiness(Object.assign({}, rn, { email: '' }), staff, T)))
ck('team: no supervising RN named → a note; two marked → a note', /No supervising RN/.test(N.team([lpn], T).notes.join()) && /More than one/.test(N.team([rn, Object.assign({}, rn, { id: 'r2', name: 'Rob' })], T).notes.join()))
ck('canTake: refuses a nurse who is not ready, with the reason', (r => !r.ok && /Natasha Early isn't ready for GHEs yet: needs RN or LPN/.test(r.why))(N.canTake({ name: 'Natasha Early' }, [], T)) && N.canTake(rn, staff, T).ok)
ck('clean: email lower-cased, supervising only for an RN, employee only when ticked', (c => c.email === 'x@y.com' && c.supervising_rn === false && c.employee === false && c.cred === 'LPN')(N.clean({ name: ' X ', cred: 'lpn', email: ' X@Y.com ', supervising_rn: true, employee: 'yes' })))
const mv = (d) => ({ client_id: 'c', type: 'meds', status: 'completed', completed_on: d })
ck('med setups: a client set up before keeps weekly; a chosen frequency wins; none = no setups', N.medFreq({ weekly_meds: true }) === 'weekly' && N.medFreq({ weekly_meds: true, med_freq: 'monthly' }) === 'monthly' && N.medFreq({}) === '')
ck('...never done: due now', N.medDue({ id: 'c', med_freq: 'biweekly' }, [], '2026-10-20').state === 'never')
ck('...weekly: done this week (Mon Oct 19), due the next week, overdue after 9 days', N.medDue({ id: 'c', med_freq: 'weekly' }, [mv('2026-10-19')], '2026-10-22').state === 'done' && N.medDue({ id: 'c', med_freq: 'weekly' }, [mv('2026-10-19')], '2026-10-26').state === 'due' && N.medDue({ id: 'c', med_freq: 'weekly' }, [mv('2026-10-19')], '2026-10-29').state === 'overdue')
ck('...every 2 weeks from Oct 6: done until Oct 17, due Oct 18 to 22, overdue from Oct 23', ['2026-10-17', '2026-10-18', '2026-10-22', '2026-10-23'].map(t => N.medDue({ id: 'c', med_freq: 'biweekly' }, [mv('2026-10-06')], t).state).join() === 'done,due,due,overdue' && N.medDue({ id: 'c', med_freq: 'biweekly' }, [mv('2026-10-06')], '2026-10-10').next_due === '2026-10-20')
const M = (d, t) => N.medDue({ id: 'c', med_freq: 'monthly' }, [mv(d)], t)
ck('...monthly = once each CALENDAR month: done Oct 1 → done all of October, next aimed for about Nov 1', M('2026-10-01', '2026-10-31').state === 'done' && M('2026-10-01', '2026-10-31').next_due === '2026-11-01')
ck('...end of the month: done Oct 30 → November is due from Nov 1 (aim about Nov 30), not overdue in November', M('2026-10-30', '2026-11-01').state === 'due' && M('2026-10-30', '2026-11-01').next_due === '2026-11-30' && M('2026-10-30', '2026-11-30').state === 'due')
ck('...the last 3 days of the month are flagged ("ending soon"); a whole month with none is overdue (Oct 30, nothing in November, Dec 1)', M('2026-10-30', '2026-11-28').ending_soon === true && M('2026-10-30', '2026-11-20').ending_soon === false && M('2026-10-30', '2026-12-01').state === 'overdue' && M('2026-10-30', '2026-12-01').missed_month === '2026-11')
ck('...short months: done Jan 31 → aim for Feb 28', M('2027-01-31', '2027-01-31').next_due === '2027-02-28')
ck('scheduled: a dated booking wins; else the standing visit day (Tuesdays → the next Tuesday)', N.medScheduled({ id: 'c', visit_day: 'Tuesday' }, [{ client_id: 'c', type: 'meds', status: 'scheduled', scheduled_for: '2026-10-23' }], '2026-10-20').on === '2026-10-23' && (s => s.kind === 'standing' && s.on === '2026-10-20')(N.medScheduled({ id: 'c', visit_day: 'Tuesday', visit_time: '10:00' }, [], '2026-10-20')) && N.medScheduled({ id: 'c', visit_day: 'Thursday' }, [], '2026-10-20').on === '2026-10-22' && N.medScheduled({ id: 'c' }, [], '2026-10-20') === null)
const ch1 = N.freqChange({ weekly_meds: true }, 'biweekly', { by: 'Krystal', at: 't1' }), ch2 = N.freqChange(Object.assign({ weekly_meds: true }, ch1), 'monthly', { by: 'Rita', at: 't2' })
ck('every frequency change keeps a history line (from, to, who, when); no change = nothing written', ch1.med_freq_log.length === 1 && ch1.med_freq_log[0].from === 'weekly' && ch1.med_freq_log[0].to === 'biweekly' && ch2.med_freq_log.length === 2 && ch2.med_freq_log[1].by === 'Rita' && N.freqChange({ med_freq: 'monthly' }, 'monthly', {}) === null)
let pass = 0; for (const [n, okk, dd] of res) { console.log((okk ? 'PASS  ' : 'FAIL  ') + n + (okk ? '' : '  ' + dd)); if (okk) pass++ }
console.log(`\n${pass} passed, ${res.length - pass} failed`); process.exit(pass === res.length ? 0 : 1)
