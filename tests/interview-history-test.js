// 748 · interview-history.js: every booking, cancel, move and no-show for the PERSON, in words, and the count of changes
// they asked for. node tests/interview-history-test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const res = []; const ck = (n, c, note) => res.push([n, !!c, c ? '' : JSON.stringify(note ?? null).slice(0, 500)]);
const src = fs.readFileSync(path.join(__dirname, '..', 'interview-history.js'), 'utf8');
const els = {}; let UPD = [], SEL = [];
const rowsDb = [];
const q = () => { const f = []; let op = 'select', patch = null, order = null, lim = null;
  const m = (r) => f.every(([k, c, v]) => k === 'eq' ? r[c] === v : k === 'neq' ? r[c] !== v : k === 'is' ? (r[c] ?? null) === v : k === 'in' ? v.includes(r[c]) : true);
  const b = { select() { return b }, eq(c, v) { f.push(['eq', c, v]); return b }, neq(c, v) { f.push(['neq', c, v]); return b }, is(c, v) { f.push(['is', c, v]); return b },
    in(c, v) { f.push(['in', c, v]); SEL.push(v); return b }, order(c, o) { order = [c, o]; return b }, limit(n) { lim = n; return b }, update(p) { op = 'update'; patch = p; return b },
    then(ok, no) { let hit = rowsDb.filter(m); if (order) hit = hit.slice().sort((a, x) => (String(a[order[0]]).localeCompare(String(x[order[0]]))) * (order[1].ascending ? 1 : -1));
      if (lim) hit = hit.slice(0, lim); if (op === 'update') { hit.forEach((r) => Object.assign(r, patch)); UPD.push(patch) }
      return Promise.resolve({ data: hit, error: null }).then(ok, no) } }; return b };
const ctx = { window: {}, console, document: { getElementById: (id) => els[id] || null }, sb: { from: q },
  AP_ROWS: [{ id: 'a1', phone: '(417) 555-0101', email: 'Dana@x.com' }, { id: 'a2', phone: '417.555.0101', email: '' }, { id: 'a3', phone: '', email: 'dana@x.com ' }, { id: 'zz', phone: '4175559999', email: 'o@x.com' }],
  AP_CHURN: { a1: 1, a2: 1, zz: 4 }, AP_PROF: { id: 'a1' }, ME: { name: 'Krystal Smith', email: 'k@mo-care.com' } };
vm.createContext(ctx); vm.runInContext(src, ctx); const IVH = ctx.window.IVH;

ck('the person is every application with the same last 10 digits or email (and nobody else)', JSON.stringify(IVH.personIds(ctx.AP_ROWS[0]).sort()) === JSON.stringify(['a1', 'a2', 'a3']), IVH.personIds(ctx.AP_ROWS[0]));
ck('the list chip counts changes across all their applications', IVH.count(ctx.AP_ROWS[0]) === 2 && IVH.count(ctx.AP_ROWS[3]) === 4);

const B = (o) => Object.assign({ status: 'cancelled', starts_at: '2026-10-10T15:00:00Z', created_at: '2026-10-01T10:00:00Z', cancelled_at: '2026-10-05T10:00:00Z' }, o);
const D = (o) => IVH._describe(B(o));
let d = D({ cancelled_by: 'applicant' });
ck('cancelled online: theirs, counted', /Cancelled it themselves/.test(d.what) && d.kind === 'asked', d);
d = D({ cancelled_by: 'applicant', cancel_kind: 'replied_no', cancel_reason: 'Replied NO to the reminder: cant make it' });
ck('replied NO to the reminder: theirs, counted, says so', /replying NO/.test(d.what) && d.kind === 'asked' && !d.why, d);
d = D({ cancelled_by: 'applicant', office_user: 'Krystal Smith', cancel_reason: 'car trouble' });
ck('rang the office to cancel: theirs, counted, with who took it and why', /at their request \(Krystal Smith in the office\)/.test(d.what) && d.why === 'car trouble' && d.kind === 'asked', d);
d = D({ cancelled_by: 'office', office_user: 'Krystal Smith', cancel_reason: 'coordinator out sick' });
ck('the office cancelled for its own reasons: listed, NOT counted', /Cancelled by the office/.test(d.what) && d.kind === 'office', d);
d = D({ cancelled_by: 'reschedule', cancel_reason: 'moved by the applicant' });
ck('moved online: theirs, counted, a move', /Moved it themselves online/.test(d.what) && d.kind === 'asked' && d.move, d);
d = D({ cancelled_by: 'reschedule', cancel_reason: 'moved by the applicant', office_user: 'Samantha' });
ck('rang the office to move: theirs, counted', /Moved at their request \(Samantha in the office\)/.test(d.what) && d.kind === 'asked', d);
d = D({ cancelled_by: 'reschedule', cancel_reason: 'moved by the office', office_user: 'Samantha' });
ck('the office moved it for its own reasons: not counted', d.kind === 'office', d);
d = D({ cancelled_by: 'reschedule', cancel_reason: 'moved by the office' });
ck('an older office move (who asked not recorded): listed as such, not counted', /before we recorded who asked/.test(d.what) && d.kind === 'unknown', d);
ck('a duplicate application tidied up is not shown at all', D({ cancelled_by: 'reschedule', cancel_reason: 'booked again under another application' }) === null);
d = IVH._describe(B({ status: 'noshow' }));
ck('a no-show is listed and counted as a no-show', d.kind === 'noshow' && /No-show/.test(d.what), d);

const many = [B({ cancelled_by: 'applicant' }), B({ cancelled_by: 'reschedule', cancel_reason: 'moved by the applicant', cancelled_at: '2026-10-06T10:00:00Z' }),
  B({ cancelled_by: 'office', office_user: 'K', cancelled_at: '2026-10-07T10:00:00Z' }), B({ status: 'booked', created_at: '2026-10-08T10:00:00Z' })];
let s = IVH._summary(many);
ck('summary: 2 asked (1 cancel, 1 move), 1 office, newest first', s.n.asked === 2 && s.n.cancels === 1 && s.n.moves === 1 && s.n.office === 1 && /^Booked/.test(s.ev[0].what), s);
let f = IVH._flag(s);
ck('two changes: an amber Overview warning saying how many and where to look, no em dash', /Changed their interview 2 times/.test(f) && /FEF3C7/.test(f) && /Interview history/.test(f) && !/—/.test(f), f);
ck('one change: no warning', IVH._flag(IVH._summary(many.slice(0, 1))) === '');
f = IVH._flag(IVH._summary(many.slice(0, 1).concat([B({ status: 'noshow' })])));
ck('a change and a no-show: a red warning', /FEE2E2/.test(f) && /missed it 1 time/.test(f), f);
f = IVH._flag(IVH._summary([B({ cancelled_by: 'applicant' }), B({ cancelled_by: 'applicant' }), B({ cancelled_by: 'applicant' })]));
ck('three changes: red', /FEE2E2/.test(f) && /3 times/.test(f), f);
const card = IVH._card(s);
ck('the card: the count, every line, and what is and is not counted; no em dash', /changed their interview 2 times \(1 cancelled, 1 moved\)/.test(card) && (card.match(/dashed/g) || []).length === 4 && /not counted/.test(card) && !/—/.test(card + src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), card);

(async () => {
  // mount reads the whole person and paints the card + warning
  rowsDb.push(Object.assign(B({ cancelled_by: 'applicant' }), { id: 1, applicant_id: 'a2' }), Object.assign(B({ cancelled_by: 'reschedule', cancel_reason: 'moved by the applicant' }), { id: 2, applicant_id: 'a1' }),
    Object.assign(B({ cancelled_by: 'applicant' }), { id: 3, applicant_id: 'zz' }));
  els.apIvHist = { innerHTML: '' }; els.apIvFlag = { innerHTML: '' };
  await IVH.mount(ctx.AP_ROWS[0]);
  ck('mount: reads every application of the person, paints the card and the warning (not the stranger\'s row)', /2 times/.test(els.apIvHist.innerHTML) && /Changed their interview 2 times/.test(els.apIvFlag.innerHTML), els);
  // stamp: who in the office moved it, on the newest move without a name
  rowsDb.push(Object.assign(B({ cancelled_by: 'reschedule', cancel_reason: 'moved by the office', cancelled_at: '2026-10-09T10:00:00Z' }), { id: 4, applicant_id: 'a3' }));
  const okm = await IVH.stamp('a1', 'move');
  ck('stamp after a Move: the newest move gets the office user, older ones untouched', okm && rowsDb.find((r) => r.id === 4).office_user === 'Krystal Smith' && !rowsDb.find((r) => r.id === 2).office_user, rowsDb);
  const okc = await IVH.stamp('a1', 'cancel');
  ck('stamp after a Cancel: a cancel row, never a move row', okc && rowsDb.find((r) => r.id === 1).office_user === 'Krystal Smith', rowsDb);
  ck('stamp never touches the stranger', !rowsDb.find((r) => r.id === 3).office_user);
  let pass = 0; for (const [n, ok, note] of res) { console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok ? '' : '  ' + note)); if (ok) pass++; }
  console.log(pass === res.length ? `ALL ${res.length} CHECKS PASS` : `${res.length - pass} OF ${res.length} FAILED`); process.exit(pass === res.length ? 0 : 1);
})();
