// From the GHE visit to Fusion (GHE fix slice 4, 2026-10-08). node tests/ghe-forms-rules-test.js
const R = require('../ghe-forms-rules.js');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 600)]);
const staff = [{ name: 'Rita Reed', cred: 'RN' }, { name: 'Lena Lowe', cred: 'LPN' }];
const T = '2026-11-20', ctx = (o) => Object.assign({ staff, today: T, me: 'krystal@mo-care.com', at: '2026-11-20T15:00:00Z' }, o || {});
ck('upload deadline: 10 working days after the visit, unless the 15th of the next month comes first', R.uploadDue('2026-11-12') === '2026-11-26' && R.uploadDue('2026-10-30') === '2026-11-13' && R.uploadDue('2026-12-28') === '2027-01-11' && R.uploadDue('') === '')
ck('...weekends skipped (Fri Nov 6 + 10 working days = Fri Nov 20)', R.workingDaysAfter('2026-11-06', 10) === '2026-11-20')
const lpnForm = { client: 'Pat Sample', visit_date: '2026-11-12', nurse: 'Lena Lowe', sig_nurse: 'x', status: 'draft' }
ck('nothing moves without the client, the visit date and the nurse\'s signature', !R.transition({ client: '', visit_date: '2026-11-12' }, 'rn_review', ctx()).ok && /nurse has to sign/.test(R.transition(Object.assign({}, lpnForm, { sig_nurse: '' }), 'rn_review', ctx()).why))
ck('an LPN form goes to RN review', R.transition(lpnForm, 'rn_review', ctx()).patch.status === 'rn_review')
ck('...it can\'t be Ready for Fusion without a reviewing RN', /An RN must review this LPN form/.test(R.transition(lpnForm, 'ready', ctx()).why))
ck('...the reviewer must be an RN on the list (not the LPN, not a stranger)', /An RN must review/.test(R.transition(lpnForm, 'ready', ctx({ reviewer: 'Lena Lowe' })).why) && /An RN must review/.test(R.transition(lpnForm, 'ready', ctx({ reviewer: 'Nobody' })).why))
ck('...and the RN signs it (Supervisory Nurse signature) first', /signs the form/.test(R.transition(lpnForm, 'ready', ctx({ reviewer: 'Rita Reed' })).why))
const ok = R.transition(Object.assign({}, lpnForm, { sig_sup: 'y' }), 'ready', ctx({ reviewer: 'Rita Reed' }))
ck('...signed and reviewed: Ready, with the RN named and who marked it', ok.ok && ok.patch.status === 'ready' && ok.patch.rn_reviewer === 'Rita Reed' && ok.patch.rn_reviewed_by === 'krystal@mo-care.com')
const rnForm = { client: 'Al', visit_date: '2026-11-12', nurse: 'Rita Reed', sig_nurse: 'x', status: 'draft' }
ck('an RN\'s own form: straight to Ready (no second RN), and "RN review" says so', R.transition(rnForm, 'ready', ctx()).ok && /does not need a second RN/.test(R.transition(rnForm, 'rn_review', ctx()).why))
const ready = Object.assign({}, rnForm, { status: 'ready' })
ck('uploaded: only from Ready, with the upload date (not future, not before the visit)', /Only a form that is Ready/.test(R.transition(rnForm, 'uploaded', ctx({ uploaded_on: '2026-11-15' })).why) && /Enter the date/.test(R.transition(ready, 'uploaded', ctx()).why) && /future/.test(R.transition(ready, 'uploaded', ctx({ uploaded_on: '2026-12-01' })).why) && /before the visit/.test(R.transition(ready, 'uploaded', ctx({ uploaded_on: '2026-11-01' })).why))
const up = R.transition(ready, 'uploaded', ctx({ uploaded_on: '2026-11-18' })).patch, late = R.transition(Object.assign({}, ready, { visit_date: '2026-11-02' }), 'uploaded', ctx({ uploaded_on: '2026-11-20' })).patch
ck('...on time or late against the earlier deadline, with who recorded it', up.uploaded_on_time === true && up.upload_due === '2026-11-26' && up.uploaded_by === 'krystal@mo-care.com' && late.uploaded_on_time === false && late.upload_due === '2026-11-16')
const forms = [Object.assign({ id: 'a' }, ready, up, { uploaded_on: '2026-11-18' }), { id: 'b', status: 'uploaded', uploaded_on: '2026-10-05' }, { id: 'c', status: 'uploaded', uploaded_on: '2026-10-01', fusion_checked: { seen: true } }, { id: 'd', status: 'ready' }]
ck('the Fusion check lists uploads not yet seen in Fusion, oldest first', R.fusionToCheck(forms).map(f => f.id).join() === 'b,a')
ck('...seen: kept with who and when', (p => p.fusion_checked.seen === true && p.fusion_checked.by === 'krystal@mo-care.com')(R.fusionCheck(forms[1], true, ctx()).patch))
ck('...not there: needs a note, then goes back to Ready to upload again', !R.fusionCheck(forms[1], false, ctx()).ok && (p => p.status === 'ready' && p.fusion_checked.seen === false && p.uploaded_on === '')(R.fusionCheck(forms[1], false, ctx({ note: 'not in Documents' })).patch))
ck('form state in words: "Ready for Fusion · upload by 2026-11-16 (OVERDUE)"', R.formState({ status: 'ready', visit_date: '2026-11-02' }, T).lbl === 'Ready for Fusion · upload by 2026-11-16 (OVERDUE)' && R.formState({ status: 'uploaded', uploaded_on: '2026-11-20', uploaded_on_time: false, upload_due: '2026-11-16' }, T).lbl === 'Uploaded 2026-11-20 (late: due 2026-11-16)')
ck('a visit with no form: due 2 days later, overdue after that', (m => m.due === '2026-11-14' && m.overdue)(R.formMissing('2026-11-12T15:00:00Z', false, T)) && R.formMissing('2026-11-19T15:00:00Z', false, T).overdue === false && R.formMissing('2026-11-12', true, T) === null)
const clients = [{ id: 'c1', name: 'Ann', ghe1: '2026-11', assigned_nurse: 'Lena Lowe' }, { id: 'c2', name: 'Bea', ghe1: '2026-11', assigned_nurse: 'Lena Lowe' }, { id: 'c3', name: 'Cal', ghe1: '2026-11', assigned_nurse: 'Rita Reed' }, { id: 'c4', name: 'Dee', ghe2: '2026-11', assigned_nurse: 'Rita Reed' }, { id: 'c5', name: 'Old', ghe1: '2026-11', active: false }]
const watch = [{ id: 'gw_c1_2026-11', state: 'visited' }, { id: 'gw_c2_2026-11', state: 'none', stage: 'not_booked' }, { id: 'gw_c3_2026-11', state: 'visited' }, { id: 'gw_c4_2026-11', state: 'visited' }]
const sf = [{ client_id: 'c3', client: 'Cal', visit_date: '2026-11-05', status: 'uploaded', uploaded_on_time: true, fusion_checked: { seen: true } }, { client: 'Dee', visit_date: '2026-11-04', status: 'ready' }]
const sc = R.scorecard('2026-11', watch, sf, clients, T), L = sc.rows.find(r => r.nurse === 'Lena Lowe'), RR = sc.rows.find(r => r.nurse === 'Rita Reed')
ck('scorecard by nurse: Lena 2 due, 1 visited (form missing), 1 still open', L.due === 2 && L.visited === 1 && L.forms_missing === 1 && L.open === 1 && L.missed === 0, L)
ck('...Rita 2 due, both visited; 1 uploaded on time and seen in Fusion; 1 ready and overdue to upload', RR.due === 2 && RR.visited === 2 && RR.uploaded === 1 && RR.on_time === 1 && RR.seen === 1 && RR.ready_overdue === 1, RR)
ck('...a past month counts what was not visited as missed; totals add up; inactive clients left out', R.scorecard('2026-11', watch, sf, clients, '2026-12-03').rows.find(r => r.nurse === 'Lena Lowe').missed === 1 && sc.total.due === 4)
let pass = 0; for (const [n, okk, dd] of res) { console.log((okk ? 'PASS  ' : 'FAIL  ') + n + (okk ? '' : '  ' + dd)); if (okk) pass++ }
console.log(`\n${pass} passed, ${res.length - pass} failed`); process.exit(pass === res.length ? 0 : 1)
