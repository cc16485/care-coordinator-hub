/* node tests/driver-compliance-hooks-test.js
   Driver Compliance (2026-10-13): the hooks in index.html stay small and in place, driver-compliance.js loads once with
   ?v=1, documents open only through the server, and the caregiver page carries the same public key as step1.html and
   never touches browser storage. */
const fs = require('fs'), path = require('path');
const R = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = R('index.html'), js = R('driver-compliance.js'), page = R('driver.html'), step1 = R('step1.html');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 300))); };
ck('driver-compliance.js is loaded once, with ?v=1, after hire-profile.js', (html.match(/<script src="driver-compliance\.js\?v=1"><\/script>/g) || []).length === 1 && html.indexOf('driver-compliance.js?v=1') > html.indexOf('hire-profile.js?v='));
const open = html.slice(html.indexOf('async function cgdOpenProfile('), html.indexOf('/* ═══ PROFILE BEFORE THE FIRST SHIFT'));
ck('caregiver page: the Overview line slot sits in "Anything in the way of scheduling?"', /card\('Anything in the way of scheduling\?','<div id="cgdProfGate"><\/div><div id="cgdDrvGate"><\/div>/.test(open));
ck('caregiver page: the Driver Compliance card is on the Checks tab (inside cgdSec-compliance)', (() => { const a = open.indexOf("'<div id=\"cgdSec-compliance\""), b = open.indexOf("'<div id=\"cgdSec-skills\""), c = open.indexOf('<div id="cgdDrv"></div>'); return a > 0 && c > a && c < b; })());
ck('caregiver page: one guarded call mounts both', /try\{ if\(window\.DRV\) DRV\.mountCaregiver\(c, g\); \}catch\(_\)\{\}/.test(open));
const ap = html.slice(html.indexOf('function apTab(k){'), html.indexOf('function apToldHtml('));
ck('applicant page: the card is mounted once when the Hiring tab opens, keyed by the application', /if\(k === 'hiring' && window\.DRV\)\{ const el = document\.getElementById\('apDrv'\); if\(el && !el\.dataset\.done\)\{ el\.dataset\.done = '1'; DRV\.mount\(el, \{ applicant_id: r\.id \}\); \} \}/.test(ap));
ck('applicant page: the card sits in the Hiring pane', /pane\('hiring',[\s\S]*?<div id="apDrv"><\/div>[\s\S]*?pane\('checks'/.test(html));
ck('DRV opens documents only through the server: no storage address or bucket read in the file', !/storage\/v1\/object\/(public|sign)\//.test(js) && !/\.storage\.from\(/.test(js) && /action:'open'/.test(js));
ck('the caregiver page carries the same 208-character public key as step1.html', (() => { const k = (s) => (s.match(/const SUPA_ANON = '([^']+)'/) || [])[1]; return k(page) && k(page) === k(step1) && k(page).length === 208; })());
ck('the caregiver page calls functions/v1/driver-compliance with the link (k, e, t)', /functions\/v1\/driver-compliance/.test(page) && /k: q\.get\('k'\)/.test(page) && /\.\.\.LINK/.test(page));
ck('nothing in either new file uses browser storage', !/localStorage|sessionStorage|indexedDB/.test(page + js));
ck('no em dash and no "plain language" in the new files or the new index.html lines', !/—/.test(page + js) && !/plain (language|english)/i.test(page + js) && !html.split('\n').filter((l) => /DRV|cgdDrv|apDrv|driver-compliance/.test(l)).some((l) => /—/.test(l)));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
