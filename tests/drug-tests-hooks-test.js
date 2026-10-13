/* node tests/drug-tests-hooks-test.js
   Drug tests (Samantha's ruling 2026-10-13): the hooks in index.html stay small and in place (the caregiver page's Checks
   tab and the applicant page's Training & checks tab), drug-tests.js loads once, documents open only through the server,
   nothing on any Hub page starts, schedules or reminds about a drug test, and no list of grounds exists. */
const fs = require('fs'), path = require('path');
const R = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = R('index.html'), js = R('drug-tests.js');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 300))); };
ck('drug-tests.js is loaded once, with ?v=1, after driver-compliance.js', (html.match(/<script src="drug-tests\.js\?v=1"><\/script>/g) || []).length === 1 && html.indexOf('drug-tests.js?v=1') > html.indexOf('driver-compliance.js?v=1'));
const open = html.slice(html.indexOf('async function cgdOpenProfile('), html.indexOf('/* ═══ PROFILE BEFORE THE FIRST SHIFT'));
ck('caregiver page: the Drug tests card is on the Checks tab (inside cgdSec-compliance)', (() => { const a = open.indexOf("'<div id=\"cgdSec-compliance\""), b = open.indexOf("'<div id=\"cgdSec-skills\""), c = open.indexOf('<div id="cgdDt"></div>'); return a > 0 && c > a && c < b; })());
ck('caregiver page: one guarded mount with the roster record\'s ids', /try\{ if\(window\.DT\) DT\.mount\(document\.getElementById\('cgdDt'\), g \? \{ caregiver_id:g\.id, offer_id:g\.offer_id, candidate_id:g\.candidate_id,/.test(open));
const ap = html.slice(html.indexOf('function apTab(k){'), html.indexOf('function apToldHtml('));
ck('applicant page: mounted once when the Training & checks tab opens, keyed by the application', /if\(k === 'checks' && window\.DT\)\{ const el = document\.getElementById\('apDt'\); if\(el && !el\.dataset\.done\)\{ el\.dataset\.done = '1'; DT\.mount\(el, \{ applicant_id: r\.id/.test(ap));
ck('applicant page: the card sits in the checks pane, never in Hiring or the Overview', /pane\('checks',[\s\S]*?<div id="apDt"><\/div>[\s\S]*?pane\('performance'/.test(html) && (html.match(/id="apDt"/g) || []).length === 1);
ck('DT opens documents only through the server: no storage address or bucket read in the file', !/storage\/v1\/object\/(public|sign)\//.test(js) && !/\.storage\.from\(/.test(js) && /action:'open'/.test(js));
ck('the reason is free text: no select of grounds, no preset reasons', !/reasonable suspicion|post-accident|random (test|selection)|pre-employment|return to duty/i.test(js) && /id="dtReason/.test(js) && (js.match(/<select/g) || []).length === 1 && /id="dtResult/.test(js));
const others = ['index.html', 'caregivers-engine.js', 'caregiver-readiness.js', 'hire-profile.js', 'step1.html', 'step2.html', 'welcome.html', 'new-hires.js', 'journey-rules.js', 'obligations.js']
  .filter((f) => fs.existsSync(path.join(__dirname, '..', f))).filter((f) => { const t = R(f); return f === 'index.html' ? /functions\.invoke\('drug-test'/.test(t) : /drug.?test/i.test(t); });
ck('no other Hub file calls, starts or reminds about drug tests (only the card does)', !others.length, others);
ck('nothing in the card uses browser storage or timers', !/localStorage|sessionStorage|indexedDB|setInterval|setTimeout/.test(js));
ck('no em dash and no "plain language" in the new file or the new index.html lines', !/—/.test(js) && !/plain (language|english)/i.test(js) && !html.split('\n').filter((l) => /DT\.|cgdDt|apDt|drug-tests/.test(l)).some((l) => /—/.test(l)));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
