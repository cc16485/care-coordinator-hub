/* Reference answers land (2026-10-12): the ONE copy of "an online answer -> the candidate's slot" in eligibility-rules.js
   gives exactly what the Sync button always gave. Compares against the engine's own code before the move (kept in the
   test as text) over every combination of answers. FAKE data only. */
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = global; require(path.join(__dirname, '..', 'eligibility-rules.js'));
const E = global.CCElig;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ', m); } else { fail++; console.log('FAIL ', m); } };

/* the engine's scoring and merge, exactly as they were (2026-10-12, before the move) */
const OLD = `function obRefType(v){ const t=String(v||'').trim().toLowerCase(); return t==='professional'?'professional':t==='personal'?'personal':''; }
function scoreManualRef(recommend,reliability,interpersonal,honesty,concerns,extra){
  if(!recommend) return null;
  if(recommend==='no'||concerns==='serious') return 'Negative';
  const x=extra||{};
  const scores={Excellent:3,Good:2,Fair:1,Poor:0};
  const given=[reliability,interpersonal,honesty].filter(Boolean);
  const denom=obRefType(x.type)==='professional' ? Math.max(1,given.length) : 3;
  const avg=(given.map(r=>scores[r]||0).reduce((a,b)=>a+b,0))/denom;
  if(recommend==='reservations'||concerns==='minor'||avg<1.5) return 'Conditional';
  if(x.rehire==='no') return 'Conditional';
  if(x.trust_family==='no'||x.trust_family==='reservations') return 'Conditional';
  return 'Positive';
}
function oldMerge(c, r){
  const n = r.slot;
  c['r'+n+'n'] = c['r'+n+'n'] || r.ref_name || r.responder_name || '';
  c['r'+n+'_manual'] = { staff: 'answered by the reference', via: 'Online form', date: String(r.responded_at || '').slice(0,10),
    name: r.responder_name || r.ref_name || '', type: obRefType(r.ref_type || c['r'+n+'_type']), relationship: r.ref_relationship || '', how_long: r.how_long || '',
    recommend: r.recommend || '', reliability: r.reliability || '', interpersonal: r.interpersonal || '', honesty: r.honesty || '',
    concerns: r.concerns || '', notes: r.notes || '', rel_answer: r.rel_answer || '', employer_confirmed: r.employer_confirmed || '',
    emp_from: r.emp_from || '', emp_to: r.emp_to || '', job_title: r.job_title || '', hours_type: r.hours_type || '', rehire: r.rehire || '',
    trust_family: r.trust_family || '', responder_title: r.responder_title || '', date_check: '' };
  if (r.ref_type && !c['r'+n+'_type']) c['r'+n+'_type'] = obRefType(r.ref_type);
  if (r.ref_company && !c['r'+n+'_company']) c['r'+n+'_company'] = r.ref_company;
  const m0 = c['r'+n+'_manual'];
  c['r'+n+'s'] = scoreManualRef(r.recommend, r.reliability, r.interpersonal, r.honesty, r.concerns, { type: m0.type, rehire: m0.rehire, trust_family: m0.trust_family }) || 'Pending';
  return c;
}`;
const ctx = { String, Math, Object }; vm.createContext(ctx); vm.runInContext(OLD, ctx);
const MAIN = fs.readFileSync('/tmp/engine-main.js', 'utf8');
ok(MAIN.includes("if(recommend==='reservations'||concerns==='minor'||avg<1.5) return 'Conditional';") && MAIN.includes("c['r'+n+'_manual'] = {"), 'the copy above matches main before the move');

let n = 0, same = 0;
const R = ['', 'yes', 'reservations', 'no'], G = ['', 'Excellent', 'Good', 'Fair', 'Poor'], C = ['', 'none', 'minor', 'serious'], T = ['', 'professional', 'personal'], Y = ['', 'yes', 'no', 'reservations'];
for (const rec of R) for (const a of G) for (const b of G) for (const h of G) for (const co of C) for (const t of T) for (const rh of Y) for (const tf of Y) {
  n++; if (ctx.scoreManualRef(rec, a, b, h, co, { type: t, rehire: rh, trust_family: tf }) === E.refScore(rec, a, b, h, co, { type: t, rehire: rh, trust_family: tf })) same++;
}
ok(n === same, `the score matches for every combination (${same} of ${n})`);

const rows = [
  { slot: 1, responded_at: '2026-10-10T14:00:00Z', ref_name: 'Dana', responder_name: 'Dana F', ref_type: 'Professional', ref_company: 'Mercy', recommend: 'yes', reliability: 'Excellent', interpersonal: 'Good', honesty: 'Excellent', concerns: 'none', rehire: 'yes', job_title: 'Aide' },
  { slot: 2, responded_at: '2026-10-11', ref_name: 'Eli', recommend: 'reservations', reliability: 'Fair', concerns: 'minor', trust_family: 'reservations', notes: 'late' },
  { slot: 3, responded_at: '2026-10-11', responder_name: 'Pat', recommend: 'no', concerns: 'serious' },
  { slot: 4, responded_at: '2026-10-11', ref_name: 'Lee' } ];
const cands = [ {}, { r1n: 'Dana Fields', r1_type: 'personal', r1_company: 'Old Co' }, { r2_type: 'professional' } ];
for (const c0 of cands) for (const r of rows) {
  const a = ctx.oldMerge(JSON.parse(JSON.stringify(c0)), r);
  const p = E.refAnswerPatch(JSON.parse(JSON.stringify(c0)), r);
  const b = Object.assign(JSON.parse(JSON.stringify(c0)), p.set);
  ok(JSON.stringify(a) === JSON.stringify(b) && p.score === a['r' + r.slot + 's'], `same fields as before: slot ${r.slot}, candidate ${JSON.stringify(c0).slice(0, 40)}`);
}
ok(E.refAnswerPatch({}, { slot: 7 }) === null && E.refAnswerPatch(null, { slot: 1 }) === null, 'a bad slot or no candidate gives nothing');
const ENG = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8');
ok(/const p = CCElig\.refAnswerPatch\(c, r\)/.test(ENG) && /return CCElig\.refScore\(/.test(ENG), 'the Sync button and the phone form use the shared copy');
console.log(`ref-answer-patch: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
