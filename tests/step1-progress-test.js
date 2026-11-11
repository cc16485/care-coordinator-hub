/* Step 1 box on the Onboarding table (Samantha 2026-11-11: no check "until step one is completely done", show "1/15 ... like
   the orientation"; the background forms first so the checks start "immediately").  node tests/step1-progress-test.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('PASS ', m); } else { fail++; console.log('FAIL ', m); } };
const ctx = { window:{}, console, obtCell:(s, t, o) => Object.assign({ s, t:t || '' }, o || {}), renderCkd:() => {} };
vm.createContext(ctx); vm.runInContext(read('step1-progress.js'), ctx);
const S = ctx.window.S1P, OID = '11111111-2222-4333-8444-555555555555', p = { c:{ offer_id:OID } };
S._st.rows = { [OID]:{ offer_id:OID, signed:3, total:12, done:false, bg:true, company_left:0 } };
let c = S.cell(p, { s:'ok', t:'', tip:'Step 1 done' });
ok(c.s === 'wait' && c.t === '3/12' && c.who === 'applicant' && /3 of 12 forms signed/.test(c.tip) && /background check forms are signed/.test(c.tip), 'signing: 3/12, waiting on the applicant, never a check');
S._st.rows[OID] = { offer_id:OID, signed:12, total:12, done:true, bg:true, company_left:1 };
c = S.cell(p, { s:'ok', t:'' });
ok(c.s === 'todo' && c.who === 'office' && c.b.label === 'Countersign' && /step1\.html\?review=/.test(c.b.on) && /Employment Agreement/.test(c.tip), 'every form signed, company signature owed: Countersign for the office, not a check');
S._st.rows[OID] = { offer_id:OID, signed:12, total:12, done:true, bg:true, company_left:0 };
c = S.cell(p, { s:'wait', t:'Waiting' });
ok(c.s === 'ok', 'completely done: the check');
ok(S.cell({ c:{ offer_id:'other' } }, { s:'ok', t:'' }).s === 'ok', 'no Hub Step 1 on file (an older hire): the box is left as it was');
S._st.rows[OID] = { offer_id:OID, signed:4, total:12, done:false, bg:true, company_left:0 };
c = S.cell(p, { s:'wait', t:'Stuck 3d', late:true, tip:'Stuck on references.' });
ok(c.t === 'Stuck 3d' && /4\/12 forms signed/.test(c.tip), 'a stuck row keeps Stuck, the count goes in its tip');
const ENG = read('caregivers-engine.js'), S1 = read('step1.html');
ok(/function ckdChecksWaiting\(c\)\{ return ckdStep1Waiting\(c\) && !ckdBgSigned\(c\); \}/.test(ENG) && /wait1 = ckdChecksWaiting\(c\)/.test(ENG), 'the checks open once the background forms are signed (step1_landed.bg)');
ok(/References wait for the rest of their Step 1\./.test(ENG) && /!ckdChecksClear\(c\) \|\| ckdStep1Waiting\(c\) \? 1/.test(ENG), 'references still wait for all of Step 1, and clear checks never move them on before Step 1 is done');
ok(/S1P\.cell\(p, cells\.step1\)/.test(ENG) && /S1P\.load\(L\.all\)/.test(ENG) && /step1-progress\.js\?v=1/.test(read('index.html')), 'the table uses it and the page loads it');
ok(/go\(nextScreen\(\)\);/.test(S1) && /resumeAt\(V\.current_screen\)/.test(S1) && !/go\('2'\)/.test(S1), 'Step 1 starts at the first form in the server order and resumes at the first unsigned one');
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
