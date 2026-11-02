/* node tests/demo-applicants-test.js
   Demo and test applicants stay out of every list and count (Samantha, 2026-11-01: "hides the demo and test applicants
   from the lists and counts"). The rows stay in the database untouched. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const pm = fs.readFileSync(path.join(__dirname, '..', 'phone-mode.js'), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 400))); };
const src = html.match(/function apIsDemo\(a\)\{[\s\S]*?\n\}/);
ck('apIsDemo is defined', !!src);
const apIsDemo = src ? new Function(src[0] + '; return apIsDemo;')() : () => false;
[{ first_name: 'Casey', last_name: 'Lund', source: 'example' }, { first_name: 'Test', last_name: 'Companion OK (TEST)', source: 'website' },
 { first_name: 'ZZTest', last_name: 'DoNotHire' }, { first_name: 'Example', last_name: 'Example', source: 'website' }]
  .forEach(a => ck(a.first_name + ' ' + a.last_name + ' is hidden', apIsDemo(a)));
[{ first_name: 'Katelynn', last_name: 'Corder', source: 'website' }, { first_name: 'Tess', last_name: 'Tester', source: 'indeed' },
 { first_name: 'Example', last_name: 'Smith' }, { first_name: 'Testa', last_name: 'Jones' }, null]
  .forEach(a => ck((a ? a.first_name + ' ' + a.last_name : 'nothing') + ' is a real applicant', !apIsDemo(a)));
ck('the Applicants tab leaves them out', /AP_ROWS = \(a\.data \|\| \[\]\)\.filter\(r=>!apIsDemo\(r\)\);/.test(html));
ck('the recruiting numbers leave them out', /RN_AP = \(a\.data \|\| \[\]\)\.filter\(r=>!apIsDemo\(r\)\);/.test(html));
ck('the PRN Teams counts read source and leave them out', /decline_reason,source'\)\.in\('position', keys\)\)\.data\|\|\[\]\)\.filter\(r=>!apIsDemo\(r\)\)/.test(html));
ck('phone mode reads source and leaves them out', /office,source'\)[\s\S]{0,200}window\.apIsDemo\(r\)/.test(pm));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
