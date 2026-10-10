// "Where we can staff this week" (Step 4, 2026-10-08): her safeguards, one by one. node tests/staffing-rules-test.js
const S = require('../staffing-rules.js');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 700)]);
const T = '2026-10-12';   // a Monday; the week looked at is Mon Oct 12 to Sun Oct 18
const W = (wins) => ({ mon: wins, tue: wins, wed: wins, thu: wins, fri: wins, sat: [], sun: [] });
const ok = (n, o) => Object.assign({ axiscare_id: n, name: 'CG ' + n, windows: W(['morning']), availability_updated: '2026-09-01', target_hours: 30, visits: [] }, o || {});
const OV = (o) => Object.assign({ accepting_new: { v: 'yes' }, travel_towns: ['Springfield'] }, o || {});
const pool = [
  ok('1'), ok('2'),                                                     // both fine: Springfield mornings Open
  ok('3', { visits: [0, 1, 2, 3, 4].map((i) => ({ day: S.addDays(T, i), start: '08:00', end: '11:00' })) }),   // mornings booked 8-11 every weekday: only 2h free → no usable block
  ok('4', { target_hours: 20, visits: [{ day: T, start: '13:00', end: '17:00' }, { day: S.addDays(T, 1), start: '13:00', end: '17:00' }, { day: S.addDays(T, 2), start: '13:00', end: '17:00' }, { day: S.addDays(T, 3), start: '13:00', end: '17:00' }, { day: S.addDays(T, 4), start: '15:00', end: '17:00' }] }),   // 18h of 20: only 2 open hours
  ok('5'),   // not accepting
  ok('6'),   // never asked
  ok('7'),   // lives in Nixa, no travel towns recorded
  ok('8', { availability_updated: '2026-05-01' }),   // stale
  ok('9', { windows: null }),                          // no form on file
  ok('10'),  // not eligible
  ok('11'),  // do not offer
  ok('12', { windows: W(['evening']) }),               // Nixa evenings only → Limited
  ok('13', { work_locked: true, work_lock_why: 'awaiting Approve to Work (new hire readiness card not complete)' }),   // SLICE 5: a new hire locked until the stamp + read-back
]
const overlay = { 1: OV(), 2: OV(), 3: OV(), 4: OV(), 5: OV({ accepting_new: { v: 'no' } }), 6: OV({ accepting_new: null }), 7: OV({ travel_towns: [] }), 8: OV(), 9: OV(), 10: OV(), 11: OV(), 12: OV({ travel_towns: ['Nixa'] }) , 13: OV() }
const ctx = { today: T, overlay, towns: ['Springfield', 'Nixa', 'Ozark'], eligibility: (ax) => (ax === '10' ? 'not_eligible' : 'eligible'), doNotOffer: new Set(['11']) }
const sh = S.sheet(pool, ctx)
const why = (ax) => (sh.people.find((p) => p.ax === ax) || {}).why || []
ck('SLICE 5: a locked new hire (13) is counted out: "awaiting Approve to Work (new hire)"', !sh.people.find((p) => p.ax === '13').counted && /awaiting Approve to Work \(new hire\)/.test(why('13').join()) && sh.cells['Springfield|morning'].ids.join() === '1,2', why('13'))
ck('Open = 2 or more: Springfield mornings (caregivers 1 and 2)', sh.cells['Springfield|morning'].status === 'open' && sh.cells['Springfield|morning'].ids.join() === '1,2', sh.cells['Springfield|morning'])
ck('Limited = 1: Nixa evenings (caregiver 12)', sh.cells['Nixa|evening'].status === 'limited' && sh.cells['Nixa|evening'].ids.join() === '12')
ck('nothing where nobody can work (Ozark), and not at times nobody is free (Springfield evenings)', sh.cells['Ozark|morning'].status === 'none' && sh.cells['Springfield|evening'].status === 'none')
ck('a usable 4-hour block: mornings booked 8-11 every weekday leave no 4 free hours → not counted', !sh.people.find((p) => p.ax === '3').counted && /no free 4-hour block/.test(why('3').join()), why('3'))
ck('at least 4 open hours in the week (20 wanted, 18 scheduled → 2) → not counted', /fewer than 4 open hours this week \(2\)/.test(why('4').join()), why('4'))
ck('only caregivers accepting new clients: "no" is out, and never-asked is out too ("not asked yet")', /not accepting new clients/.test(why('5').join()) && /not asked yet/.test(why('6').join()))
ck('living in a town never counts by itself: no travel towns recorded = not counted anywhere', /travel towns not recorded/.test(why('7').join()) && !Object.values(sh.cells).some((c) => c.ids.includes('7')))
ck('real availability: older than 90 days, or nothing on file, = not counted', /older than 90 days/.test(why('8').join()) && /no availability on file/.test(why('9').join()))
ck('qualifications: not eligible, or on do-not-offer = not counted', /not eligible to work/.test(why('10').join()) && /do-not-offer/.test(why('11').join()))
ck('a skill filter (Hoyer lift) counts only those who have it', S.sheet(pool, Object.assign({}, ctx, { skills: ['hoyer_lift'], overlay: Object.assign({}, overlay, { 1: OV({ skills: { hoyer_lift: { have: 'yes' } } }) }) })).cells['Springfield|morning'].status === 'limited')
ck('every caregiver not counted has a reason Staffing can read', sh.excluded.every((p) => p.why.length) && sh.counted === 3)
ck('an overnight visit spilling past midnight blocks the next morning too', S.booked([{ day: T, start: '22:00', end: '07:00' }], S.addDays(T, 1)).some(([a, b]) => a === 0 && b === 7))
ck('freeRun: a 6-12 window with a 9-10 visit leaves 3 hours (not 4)', S.freeRun([6, 12], [[9, 10]]) === 3 && S.freeRun([6, 12], []) === 6 && S.freeRun([6, 12], [[11, 13]]) === 5)
/* confirmation, re-review, sharing */
const conf = { week_start: S.weekOf(T).start, by: 'sally@mo-care.com', by_name: 'Sally', at: '2026-10-12T14:05:00Z', cells: S.snapshot(sh, { 'Ozark|morning': { status: 'limited', note: 'new hire starts Tuesday', by: 'sally' } }) }
let sharex = S.shareable(conf, sh, T)
ck('shared: confirmed towns and times only, never a caregiver, a count or a promise', sharex.confirmed && /Springfield \(mornings\)/.test(sharex.text) && /Nixa \(evenings\)/.test(sharex.text) && !/CG |\b2\b caregivers/.test(sharex.text) && /not a promise of a start date or a particular caregiver/.test(sharex.text), sharex.text)
ck('...an override by Staffing (Ozark mornings, with a note) is honored', /Ozark \(mornings\)/.test(sharex.text))
ck('not confirmed this week: nothing to share', !S.shareable(null, sh, T).confirmed && !S.shareable(Object.assign({}, conf, { week_start: '2026-10-05' }), sh, T).text)
const pool2 = pool.map((c) => (c.axiscare_id === '2' ? Object.assign({}, c, { visits: [0, 1, 2, 3, 4].map((i) => ({ day: S.addDays(T, i), start: '07:00', end: '12:00' })) }) : c))
const sh2 = S.sheet(pool2, ctx), rv = S.review(conf, sh2, T)
ck('a meaningful change after confirming (caregiver 2 got booked every morning): Springfield mornings flagged for re-review', rv.flags.some((f) => f.key === 'Springfield|morning' && f.was === 'open' && f.now === 'limited'), rv.flags)
ck('...and a flagged town/time is held back from sharing until it is confirmed again', !/Springfield/.test(S.shareable(conf, sh2, T).text) && S.shareable(conf, sh2, T).rechecking === 1)
ck('...nothing changed: no flags', S.review(conf, sh, T).flags.length === 0)
ck('settings: minimum hours and the Open threshold can be set; nonsense falls back', S.settings({ staffing_sheet_rules: { min_hours: 0 } }).min_hours === 4 && S.settings({ staffing_sheet_rules: { open_min: 3 } }).open_min === 3)
let pass = 0; for (const [n, okk, d] of res) { console.log((okk ? 'PASS  ' : 'FAIL  ') + n + (okk ? '' : '  ' + d)); if (okk) pass++ }
console.log(`\n${pass} passed, ${res.length - pass} failed`); process.exit(pass === res.length ? 0 : 1)
