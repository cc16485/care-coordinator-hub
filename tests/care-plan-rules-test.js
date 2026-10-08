// Reading the state's Medicaid care plan (GHE fix slice 1, 2026-10-08). node tests/care-plan-rules-test.js
// The fixture is two real Fusion plans with every name, number, address, phone and date of birth replaced.
const C = require('../care-plan-rules.js');
const FX = require('./fixtures/care-plans.json');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 700)]);
const T = '2026-10-08';

const a = C.parse(FX.agency), sa = C.summary(a, T);
ck('agency plan: name, DCN, plan period and the date generated', a.name === 'PAT SAMPLE' && a.dcn === '12345678' && a.plan_start === '2026-08-10' && a.plan_end === '2027-01-31' && a.generated === '2026-10-08', a)
ck('...three service lines in order: PC - Agency, GHE, PC - CDS', a.services.map(s => s.type).join('|') === 'PC - Agency|GHE|PC - CDS', a.services.map(s => s.type))
const pc = a.services[0], g = a.services[1], cds = a.services[2]
ck('...PC - Agency is ours, agency personal care, dates read across the split "08/10" + "/2026"', pc.ours && pc.kind === 'pc' && pc.program === 'ihs' && pc.start === '2026-08-10' && pc.end === '2027-01-31', pc)
ck('...its monthly units by procedure code (6 months, T1019, 362 / 352)', pc.units.length === 6 && pc.units[0].code === 'T1019' && pc.units[0].units === 362 && pc.units[1].units === 352, pc.units)
ck('...its 13 tasks with minutes a day and days a week (columns found from this table\'s own heading)', pc.tasks.length === 13 && pc.tasks[0].task === 'Dietary' && pc.tasks[0].min_day === 60 && pc.tasks[0].days_week === 7 && pc.tasks.some(t => t.task === 'Bathing' && t.min_day === 45 && t.days_week === 4), pc.tasks.slice(0, 3))
ck('...the GHE is its own line: November 2026, T1001, 1 unit, its own prior authorization', g.kind === 'ghe' && g.ours && g.start === '2026-11-01' && g.end === '2026-11-30' && g.units[0].code === 'T1001' && g.units[0].units === 1 && /^\d{14}$/.test(g.prior_auth) && g.prior_auth !== pc.prior_auth, g)
ck('...the CDS line is another provider\'s, not ours', !cds.ours && cds.program === 'cds' && /EMEREST/.test(cds.provider), cds)
ck('summary: one GHE month (2026-11) with its authorization; programs = IHS; nothing stops the save', sa.ok && sa.programs.join() === 'ihs' && sa.ghes.length === 1 && sa.ghes[0].month === '2026-11' && sa.ghes[0].code === 'T1001' && sa.ghes[0].prior_auth === g.prior_auth, sa)
ck('..."Also served by EMEREST HEALTH CDS OF MISSOU" is noted, not taken', sa.notes.some(n => /Also served by EMEREST HEALTH CDS OF MISSOU: Consumer directed/.test(n)) && sa.ours.length === 2, sa.notes)

const c = C.parse(FX.cds), sc = C.summary(c, T);
ck('CDS plan (one page layout, no "Date Generated"): read, 12 months of units, 9 tasks', c.dcn === '12345678' && c.services.length === 1 && c.services[0].units.length === 12 && c.services[0].tasks.length === 9 && c.generated === '', c)
ck('...a CDS plan of ours is stopped: "belongs on the CDS side"; no GHE expected', !sc.ok && sc.stops.some(s => /CDS plan/.test(s)) && !sc.needsGhe && !sc.ghes.length, sc)
ck('...and an ended plan says so', sc.notes.some(n => /ended 2026-06-30/.test(n)), sc.notes)

/* made-up variants of the real layout */
const clone = x => JSON.parse(JSON.stringify(x))
const noGhe = clone(FX.agency).filter(i => i.page !== 4)
ck('agency personal care with no GHE line: flagged to check Fusion (months 4 and 10)', C.summary(C.parse(noGhe), T).notes.some(n => /no GHE line/.test(n)))
const col = clone(FX.agency); col.filter(i => i.page === 2 && i.str === 'N/A' && i.x > 560 && i.x < 600).forEach(i => { i.str = '02/2027' })
ck('a month printed in the GHE 1 column is read too', C.gheMonths(C.parse(col)).map(x => x.month).join() === '2026-11,2027-02', C.gheMonths(C.parse(col)))
const adw = clone(FX.agency); adw.filter(i => i.page === 2 && i.x < 60 && (i.str === 'PC -' || i.str === 'Agency')).forEach(i => { i.str = i.str === 'PC -' ? 'Basic' : 'Respite' })
const sadw = C.summary(C.parse(adw), T)
ck('an ADW respite line is ours under ADW', C.parse(adw).services[0].kind === 'adw_respite' && sadw.programs.indexOf('adw') > -1, C.parse(adw).services[0])
const notOurs = clone(FX.agency); notOurs.forEach(i => { if (/CARING COMPANIONS/.test(i.str)) i.str = 'OTHER AGENCY LLC, (417)' })
ck('a plan where we are not the provider stops', !C.summary(C.parse(notOurs), T).ok && C.summary(C.parse(notOurs), T).stops.some(s => /not the provider/.test(s)))
const wrap = clone(FX.agency); const d = wrap.find(i => i.str === 'Dietary'); wrap.push({ page: d.page, x: d.x, y: d.y - 10, str: '(extra words)' })
ck('a task name that wraps onto a second line stays one task', C.parse(wrap).services[0].tasks[0].task === 'Dietary (extra words)' && C.parse(wrap).services[0].tasks.length === 13, C.parse(wrap).services[0].tasks.slice(0, 2))
const more = clone(FX.cds); more.filter(i => i.page === 2 && i.y < 150 && i.y > 140).forEach(i => { i.page = 3; i.y = 585 })
ck('rows that carry on onto a new page without a heading stay with the last table', (p => p.services[0].units.length === 12 && p.services[0].units[11].start === '2026-06-01' && p.services[0].tasks.length === 9)(C.parse(more)), C.parse(more).services[0].units.slice(-2))
ck('not a care plan: no DCN, no service lines → problems, nothing to save', (p => p.problems.length === 2 && !C.summary(p, T).ok)(C.parse([{ page: 1, x: 10, y: 400, str: 'Invoice 42' }])))

/* the nurse board and the client list */
ck('board months: the latest two GHE months known, with each one\'s authorization', JSON.stringify(C.boardMonths({ ghe1: '2026-05', ghe2: null }, sa.ghes)) === JSON.stringify({ ghe1: '2026-05', ghe2: '2026-11', ghe_auth: { '2026-11': { prior_auth: g.prior_auth, code: 'T1001' } } }), C.boardMonths({ ghe1: '2026-05' }, sa.ghes))
ck('...an older third month drops off; a repeat upload changes nothing', C.boardMonths({ ghe1: '2025-11', ghe2: '2026-05' }, sa.ghes).ghe1 === '2026-05' && C.boardMonths({ ghe1: '2026-05', ghe2: '2026-11' }, sa.ghes).ghe2 === '2026-11')
const rec = C.record(a, { ax: '901', client_name: 'Pat Sample', received_on: '2026-10-08', by: 'krystal@mo-care.com', at: '2026-10-08T15:00:00Z', file_name: 'x.pdf' })
ck('the saved record: what the plan said and who confirmed it, never the address, phone or date of birth', rec.kind === 'plan' && rec.axiscare_client_id === '901' && rec.received_on === '2026-10-08' && rec.ghe_months.join() === '2026-11' && !/ADDRESS|0000000000|1950|Phone|DOB/.test(JSON.stringify(rec)), rec)
ck('...another provider\'s line keeps only what and when (no units, tasks or authorization)', (s => !s.ours && s.units.length === 0 && s.tasks.length === 0 && s.prior_auth === '' && s.provider === 'EMEREST HEALTH CDS OF MISSOU')(rec.services[2]), rec.services[2])
const plans = [rec, { kind: 'payer_mark', axiscare_client_id: '902', payer: 'private' }, { kind: 'payer_mark', axiscare_client_id: '903', payer: 'medicaid' }]
ck('client status: current plan, not Medicaid, Medicaid with no plan yet, unknown, ended', C.clientStatus('901', plans, plans, T).s === 'current' && C.clientStatus('902', plans, plans, T).s === 'not_medicaid' && C.clientStatus('903', plans, plans, T).s === 'medicaid_no_plan' && C.clientStatus('904', plans, plans, T).s === 'unknown' && C.clientStatus('901', plans, plans, '2027-02-01').s === 'ended')
let pass = 0; for (const [n, okk, dd] of res) { console.log((okk ? 'PASS  ' : 'FAIL  ') + n + (okk ? '' : '  ' + dd)); if (okk) pass++ }
console.log(`\n${pass} passed, ${res.length - pass} failed`); process.exit(pass === res.length ? 0 : 1)
