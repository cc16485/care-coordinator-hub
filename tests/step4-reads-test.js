/* Step 4 part 1 (2026-10-14): attendance, write-ups, supervisory visits and orientation bookings are matched to a person by
   number first; a typed name only for records with no number, and only when one person has that name. FAKE people. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ENG = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8'), IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cut = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error('cannot find ' + a); return src.slice(i, j); };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ', m); } else { fail++; console.log('FAIL ', m); } };
const day = d => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);

/* attendance + write-ups */
const ctx = { String, Date, Math, Map, Set, Number, ATT_EVENTS: [], DISC_ACTIONS: [], attCfg: () => ({ callin_window: 90, callin_count: 3, tardy_window: 90, tardy_count: 3, notice_hours: 4, lookback_months: 12 }) };
vm.createContext(ctx);
vm.runInContext(cut(ENG, 'function attIdOf(r){', '\n/* ── WRITE-UP TEMPLATES'), ctx);
ctx.ATT_EVENTS.push(
  { id: 1, caregiver: 'Ann Lee', axiscare_caregiver_id: '5001', type: 'callin', shift_date: day(5) },
  { id: 2, caregiver: 'ann  lee', type: 'callin', shift_date: day(10) },                                   // name only: joins 5001 (only Ann Lee with a number)
  { id: 3, caregiver: 'Ann Lee', axiscare_caregiver_id: '5002', type: 'tardy', shift_date: day(3) },      // a second Ann Lee, with her own number
  { id: 4, caregiver: 'Bo Ray', type: 'tardy', shift_date: day(2) });
let G = ctx.attGroups();
ok(G.keyOf(ctx.ATT_EVENTS[0]) === 'ax:5001' && G.keyOf(ctx.ATT_EVENTS[2]) === 'ax:5002', 'a record with a number is that person, even when two people share the name');
ok(G.keyOf(ctx.ATT_EVENTS[1]) === 'nm:ann lee', 'a name-only record does NOT join anyone when two people with numbers share that name');
ctx.ATT_EVENTS.splice(2, 1); G = ctx.attGroups();
ok(G.keyOf(ctx.ATT_EVENTS[1]) === 'ax:5001', 'a name-only record joins the one person with a number who has that name (so nothing splits during the backfill)');
ok(G.keyOf(ctx.ATT_EVENTS[2]) === 'nm:bo ray', 'no number anywhere: the name, as before');
ok(JSON.stringify(ctx.attCaregivers()) === '["ax:5001","nm:bo ray"]' && ctx.attGroupName('ax:5001') === 'Ann Lee', 'one card per person, shown by name');
ok(ctx.attStatus('ax:5001').evs.length === 2 && ctx.attStatus('Bo Ray').evs.length === 1, 'their events are counted together; a plain name still works');
ctx.DISC_ACTIONS.push({ id: 'w1', caregiver: 'Ann Lee', ax_caregiver_id: '5001', status: 'issued', issued_at: new Date().toISOString() }, { id: 'w2', caregiver: 'Ann Lee', axiscare_caregiver_id: '9999', status: 'issued', issued_at: new Date().toISOString() });
G = ctx.attGroups();
ok(ctx.attStatus('ax:5001').issued.length === 1, 'a write-up counts on the ladder only for its own number (either field name); another number with the same name does not');
const dw = cut(ENG, 'async function draftWriteup(cg, triggerIdx){', 'function openWriteup(');
ok(/axiscare_caregiver_id:axid/.test(dw) && /caregiver:attGroupName\(cg\)/.test(dw), 'a write-up drafted from attendance carries the number and the name');
ok(/a\.axiscare_caregiver_id \|\| a\.ax_caregiver_id/.test(ENG), 'the AxisCare note uses either field name');

/* the caregiver page and the applicant page */
const perf = cut(IDX, 'function cgdPerformanceHtml(c,nm){', 'const inD=');
ok(/const isMine=x=>\{ const i=recId\(x\); return i \? i===String\(c\.id\)/.test(perf) && /filter\(isMine\)/.test(perf), 'caregiver page: their number, or a name only on records with no number');
const ap = cut(IDX, 'function apPerfHtml(r){', 'const events');
ok(/recId\(x\) \? \(!!axid && recId\(x\) === axid\)/.test(ap) && /AP_CG_CACHE\[r\.id\]/.test(ap), 'applicant page: a numbered record only when it is the number found for them by id');

/* supervisory visit date onto the roster */
const sv = cut(IDX, "const vid = String(record.axiscare_caregiver_id||'').trim();", 'if(cg){');
const pick = (record, list) => { const c = { record, data: { data: list }, String }; vm.createContext(c); vm.runInContext('var r=(function(){' + sv + 'return cg;})()', c); return c.r; };
const roster = [{ id: 1, first: 'Ann', last: 'Lee', axiscare_id: '5001' }, { id: 2, first: 'Ann', last: 'Lee', axiscare_id: '5002' }, { id: 3, first: 'Bo', last: 'Ray', axiscare_id: '6001' }];
ok(pick({ axiscare_caregiver_id: '5002', caregiver_name: 'Ann Lee' }, roster).id === 2, 'supervisory: the visit\'s number decides, not the first Ann Lee');
ok(pick({ caregiver_name: 'Ann Lee' }, roster) === null, 'supervisory: two people with the name and no number: nobody (it says so)');
ok(pick({ caregiver_name: 'bo ray' }, roster).id === 3, 'supervisory: a name only one person has still works');
ok(/could not be matched to exactly one caregiver/.test(IDX), 'an unmatched visit says so, never silently');

/* orientation bookings */
const bc = { String, candidates: [{ id: 11, first: 'Maria', last: 'D' }, { id: '12', first: 'Lee', last: 'Z' }, { id: 13, first: 'Lee', last: 'Z' }, { id: 14, first: 'Jo', last: 'Q' }] };
vm.createContext(bc); vm.runInContext(cut(ENG, 'function bookingCandIdx(b){', 'function officeOrientBookingFor('), bc);
ok(bc.bookingCandIdx({ first: 'Lee', last: 'Z', candidate_id: 13 }) === 2 && bc.bookingCandIdx({ first: 'x', last: 'y', candidate_id: '11' }) === 0, 'a booking with a record number: that record (number or text)');
ok(bc.bookingCandIdx({ first: 'Maria', last: 'D', candidate_id: 99 }) === -1, 'a record number that is gone: nobody, never the name');
ok(bc.bookingCandIdx({ first: 'Lee', last: 'Z' }) === -1 && bc.bookingCandIdx({ first: 'jo', last: 'q' }) === 3, 'no number: a name only when one person has it');
ok((ENG.match(/bookingCandIdx\(b\)/g) || []).length >= 3 && !/c\.id===b\.candidate_id/.test(ENG), 'Promote, attendance and cancel all use it; the old number-vs-text compare is gone');
ok(/const byName = !\(b\.candidate_id != null/.test(ENG), 'the orientation banner: a numbered booking is never someone else\'s by name');
ok(!/—/.test(cut(ENG, 'function attIdOf(r){', 'function attStatus(cg){') + cut(ENG, 'function bookingCandIdx(b){', 'function officeOrientBookingFor(')), 'no em dashes');
console.log(`step4-reads: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
