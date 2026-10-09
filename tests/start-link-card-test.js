/* node tests/start-link-card-test.js
   535 (Samantha approved 2026-10-08): the Starting soon card's start-link line. Stamped: sent. Unstamped and offered
   before Oct 9: "not recorded" (the stamp did not exist). Unstamped and offered from Oct 9: "not sent yet". */
const fs = require('fs'), path = require('path');
const eng = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8');
const a = eng.indexOf("'<b style=\"color:#0D365F\">Start link:</b>'"), b = eng.indexOf("offerStartLink(", a);
const expr = eng.slice(a, b).split('\n').slice(1).join('\n').replace(/\+\s*$/, '').replace(/^\s*\(/, '(').replace(/\)\+\s*'<button[\s\S]*$/, ')');
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 160))); };
const line = (o) => new Function('o', 'return ' + expr.trim().replace(/\+$/, ''))(o);
ck('a stamped offer says sent', /sent when you saved the offer/.test(line({ start_link_sent_at: '2026-10-09T15:00:00Z', created_at: '2026-10-09T14:59:00Z' })));
ck('an unstamped offer from before Oct 9 says not recorded, in grey', /not recorded \(offers before Oct 9\)/.test(line({ created_at: '2026-10-03T15:00:00Z' })) && /var\(--gray\)/.test(line({ created_at: '2026-10-03T15:00:00Z' })));
ck('an unstamped offer from Oct 9 on says not sent yet, in amber', /not sent yet/.test(line({ created_at: '2026-10-09T15:00:00Z' })) && /#B45309/.test(line({ created_at: '2026-10-09T15:00:00Z' })));
ck('an offer with no date is treated as old (never shown as a missing send)', /not recorded/.test(line({})));
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
