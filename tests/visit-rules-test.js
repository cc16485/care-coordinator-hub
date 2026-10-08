// Delivered vs authorized and visits not delivered (Medicaid slice D, 2026-10-08). node tests/visit-rules-test.js
const V = require('../visit-rules.js');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 600)]);
const plan = { services: [{ ours: true, kind: 'pc', units: [{ start: '2026-10-01', end: '2026-10-31', code: 'T1019', units: 120 }, { start: '2026-11-01', end: '2026-11-30', code: 'T1019', units: 110 }] },
  { ours: true, kind: 'ghe', units: [{ start: '2026-11-01', code: 'T1001', units: 1 }] }, { ours: false, kind: 'cds', units: [{ start: '2026-10-01', code: 'T1019', units: 20 }] }] }
// visits at 9am Central (14:00Z), 2 hours; clocked ones clock in/out
const vis = (day, o = {}) => Object.assign({ id: 'v' + day, scheduledStartDate: day + 'T14:00:00Z', scheduledEndDate: day + 'T16:00:00Z', service: { procedureCode: 'T1019' }, caregiver: { firstName: 'Maria', lastName: 'Lopez' } }, o)
const clocked = (day, minutes = 120) => vis(day, { clockIn: { time: day + 'T14:00:00Z' }, clockOut: { time: new Date(Date.parse(day + 'T14:00:00Z') + minutes * 60000).toISOString() } })
const NOW = '2026-10-20T20:00:00Z'
ck('authorized: our care lines for the month by code (not the GHE line, not another provider\'s)', JSON.stringify(V.authorized(plan, '2026-10')) === '{"T1019":120}' && JSON.stringify(V.authorized(plan, '2026-11')) === '{"T1019":110}')
ck('a care visit: T1019 yes; the GHE (T1001) no; a removed visit no', V.isCare(vis('2026-10-05'), ['T1019']) && !V.isCare(vis('2026-10-05', { service: { procedureCode: 'T1001' } }), ['T1019']) && !V.isCare(vis('2026-10-05', { removed: true }), ['T1019']))
ck('classify: delivered (clocked in and out), in progress, not delivered (time passed, no clock-in), upcoming', V.classify(clocked('2026-10-05'), NOW).state === 'delivered' && V.classify(vis('2026-10-20', { scheduledStartDate: '2026-10-20T19:00:00Z', scheduledEndDate: '2026-10-20T21:00:00Z', clockIn: { time: '2026-10-20T19:02:00Z' } }), NOW).state === 'in_progress' && V.classify(vis('2026-10-06'), NOW).state === 'not_delivered' && V.classify(vis('2026-10-25'), NOW).state === 'upcoming')
ck('...a delivered visit under 75% of its scheduled time is short', V.classify(clocked('2026-10-05', 80), NOW).short === true && V.classify(clocked('2026-10-05', 100), NOW).short === false)
const visits = [clocked('2026-10-01'), clocked('2026-10-02'), vis('2026-10-05'), clocked('2026-10-06', 80), vis('2026-10-07'), clocked('2026-10-08'), vis('2026-10-25'), vis('2026-10-10', { service: { procedureCode: 'T1001' } })]
const tk = [{ visit_id: 'v2026-10-05', resolved_at: 'x', resolved_reason: 'calling_off', resolved_by_name: 'Krystal Land' }]
const s = V.monthSummary(visits, plan, '2026-10', NOW, tk)
ck('month: 6 scheduled so far, 4 delivered, 440 clocked minutes = 29 units of 120 authorized', s.visits_scheduled === 6 && s.visits_delivered === 4 && s.delivered_minutes === 440 && s.delivered_units === 29 && s.authorized_units === 120, s)
ck('...2 not delivered (Oct 5 and 7), Oct 5 carrying its reason from the missed clock-in alert', s.missed.map(m => m.day).join() === '2026-10-05,2026-10-07' && s.missed[0].reason.reason === 'calling_off' && s.missed[0].reason.by === 'Krystal Land' && s.missed[1].reason === null && s.missed[0].caregiver === 'Maria Lopez')
ck('...1 short visit (Oct 6, 80 of 120 minutes); the GHE and the upcoming visit are left out', s.short.length === 1 && s.short[0].day === '2026-10-06' && s.short[0].minutes === 80)
const r1 = V.risk([clocked('2026-10-14'), vis('2026-10-16'), vis('2026-10-19')], plan, NOW)
ck('risk: 2 scheduled visits in a row not delivered → at risk (before the 3-visit line)', r1.at_risk && r1.in_a_row === 2 && r1.last_delivered === '2026-10-14' && r1.since_missed.join() === '2026-10-16,2026-10-19', r1)
const r2 = V.risk([clocked('2026-10-12'), vis('2026-10-19')], plan, NOW)
ck('...1 missed but 8 days since the last delivered visit → at risk (before the 1-week line)', r2.at_risk && r2.in_a_row === 1 && r2.days_without === 8, r2)
const r3 = V.risk([clocked('2026-10-17'), vis('2026-10-19')], plan, NOW), r4 = V.risk([vis('2026-10-17'), clocked('2026-10-19')], plan, NOW)
ck('...1 missed, last delivered 3 days ago: not yet; a delivered visit after a miss clears it', !r3.at_risk && r3.in_a_row === 1 && !r4.at_risk && r4.in_a_row === 0, [r3, r4])
ck('review needs: the visit with no reason, and units well under authorized (29 of 120)', (n => n.no_reason.length === 1 && n.under && n.needs_writing)(V.reviewNeeds(s)))
ck('signing: an explanation when something needs writing, then the name', /Explain the 1 visit/.test(V.signReview(s, { signed_name: 'Angiel' }).why) && /Type your name/.test(V.signReview(s, { explanation: 'Oct 7: caregiver sick, client declined a substitute.' }).why) && V.signReview(s, { explanation: 'Oct 7: caregiver sick, client declined a substitute.', signed_name: 'Angiel' }, { me: 'angiel@mo-care.com' }).rec.signed_by === 'angiel@mo-care.com')
ck('...a clean month (all delivered, units close to authorized) signs with the name alone', V.signReview({ missed: [], authorized_units: 40, delivered_units: 38 }, { signed_name: 'Angiel' }).ok)
/* ADW respite */
const rv = (day, h1, h2, o = {}) => Object.assign({ id: 'r' + day + h1, scheduledStartDate: day + 'T' + h1 + ':00:00Z', scheduledEndDate: day + 'T' + h2 + ':00:00Z', service: { procedureCode: 'S5150', description: 'Basic Respite' }, caregiver: { firstName: 'Ana', lastName: 'Ruiz' } }, o)
ck('a respite visit: S5150 or "respite" in the service; advanced = TF or "advanced"', V.isRespite(rv('2026-10-21', '14', '16')) && V.isRespite({ service: { description: 'In-home respite' } }) && !V.isRespite(vis('2026-10-21')) && V.isAdvancedRespite({ service: { procedureCode: 'S5150 TF' } }) && V.isAdvancedRespite({ service: { description: 'Advanced Respite' } }) && !V.isAdvancedRespite(rv('2026-10-21', '14', '16')))
// week of Mon Oct 19: 5 days x 10h scheduled ahead = 50h (over 49); week of Oct 26: 4 x 10h = 40h
const big = ['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'].map(d => rv(d, '12', '22')).concat(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'].map(d => rv(d, '12', '22')))
const rc = V.respiteCheck(big, '2026-10-20T20:00:00Z', '2026-10')
ck('respite: the week of Oct 19 is booked for 50 hours (over 49); the week of Oct 26 for 40 (fine)', rc.over_weeks.length === 1 && rc.over_weeks[0].week === '2026-10-19' && rc.over_weeks[0].hours === 50 && rc.weeks.find(w => w.week === '2026-10-26').hours === 40, rc.weeks)
ck('...the month: 90 hours = 360 units of the 868 limit (counted from the schedule ahead too)', rc.month_units === 360 && !rc.month_over, rc)
const past = V.respiteCheck([rv('2026-10-12', '14', '16', { clockIn: { time: '2026-10-12T14:00:00Z' }, clockOut: { time: '2026-10-12T15:00:00Z' } }), rv('2026-10-13', '14', '16')], '2026-10-20T20:00:00Z', '2026-10')
ck('...what already happened counts as clocked (1 hour), a respite visit not delivered counts nothing', past.weeks[0].hours === 1, past.weeks)
const ov = V.respiteCheck([rv('2026-10-22', '14', '18'), vis('2026-10-22')], '2026-10-20T20:00:00Z', '2026-10')
ck('respite overlapping another visit (personal care 14:00-16:00) is flagged', ov.overlaps.length === 1 && ov.overlaps[0].day === '2026-10-22', ov.overlaps)
const adv = V.respiteCheck([rv('2026-10-23', '14', '16', { service: { procedureCode: 'S5150 TF', description: 'Advanced Respite' } })], '2026-10-20T20:00:00Z', '2026-10')
ck('advanced respite booked (we don\'t provide it yet) is flagged with the day and caregiver', adv.advanced.length === 1 && adv.advanced[0].day === '2026-10-23' && adv.advanced[0].caregiver === 'Ana Ruiz')
ck('no respite at all: nothing to say', !V.respiteCheck([vis('2026-10-22')], '2026-10-20T20:00:00Z', '2026-10').any)
let pass = 0; for (const [n, okk, dd] of res) { console.log((okk ? 'PASS  ' : 'FAIL  ') + n + (okk ? '' : '  ' + dd)); if (okk) pass++ }
console.log(`\n${pass} passed, ${res.length - pass} failed`); process.exit(pass === res.length ? 0 : 1)
