/* node tests/nurse-billing-hooks-test.js
   Nurse visits ready to bill (LPN nurse visit plan step 8, Samantha approved 2026-10-14; Desktop 707): index.html gets ONE
   script tag and ONE guarded mount on Nurse Scheduling; the card only reads from the server (it never writes app_data,
   AxisCare or anything else), and its words carry no em dash and never "skin assessment". */
const fs = require('fs'), path = require('path');
const R = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = R('index.html'), js = R('nurse-billing.js');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 300))); };
ck('nurse-billing.js is loaded once, after ghe-forms-rules.js', (html.match(/<script src="nurse-billing\.js\?v=1"><\/script>/g) || []).length === 1 && html.indexOf('nurse-billing.js?v=1') > html.indexOf('ghe-forms-rules.js?v=2'));
const rnv = html.slice(html.indexOf('function renderNurseVisits(){'), html.indexOf('function renderNurseVisits(){') + 600);
ck('one guarded mount, inside renderNurseVisits (Nurse Scheduling)', (html.match(/NurseBilling\.mount\(/g) || []).length === 1 && /try\{ if\(window\.NurseBilling\) NurseBilling\.mount\('tab-nursevisits'\); \}catch\(e\)\{/.test(rnv));
ck('the card only asks the server (report, run): no app_data write, no AxisCare, no storage', /action:'report'/.test(js) && /action:'run'/.test(js) && !/upsert_app_data_item|app_data_save|\.from\(['"]app_data|axiscare\.com|\.storage\./.test(js));
ck('no em dash, never "skin assessment", never "plain language" in the new file or the new index.html lines', !/—/.test(js) && !/skin assessment|plain (language|english)/i.test(js) && !html.split('\n').filter((l) => /NurseBilling|nurse-billing/.test(l)).some((l) => /—/.test(l)));
ck('nothing in the card uses browser storage', !/localStorage|sessionStorage|indexedDB/.test(js));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
