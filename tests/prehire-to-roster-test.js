/* node tests/prehire-to-roster-test.js
   Pre-hire check results reach the caregiver record (Samantha 2026-11-01, "fix the four urgent Hub problems", #3).
   The database now fills a caregiver's Pending EDL / FCSR / OIG from a CLEAR GoHighLevel result (Staffing repo
   prehire_checks_fill.sql). Those results have their document but no date, so the Active Compliance table shows the
   result with "Date not on file" instead of Pending, and never invents a next-due date. Real code cut out of
   caregivers-engine.js, fake people only. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const eng = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const elig = fs.readFileSync(path.join(__dirname, '..', 'eligibility-rules.js'), 'utf8');
const cut = (src, from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return src.slice(a, b); };
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 200))); };

const ctx = { console, Date,
  badge: (s) => '[' + s + ']', proofLink: (p) => p ? '{doc}' : '', fmtD: (d) => d };
vm.createContext(ctx);
vm.runInContext('var globalThis=this;' , ctx); vm.runInContext(elig, ctx); ctx.chkStatus = ctx.CCElig.chkStatus;
vm.runInContext(cut(eng, 'function compCell(lastStr,info,overrideStatus,proof){', '\n    const fpBadge'), ctx);
const cell = (date, st, proof, days) => ctx.compCell(date, ctx.chkStatus(date, days || 90, 14), st, proof);
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

const ghl = cell('', 'Clear', 'bgcheck/ghl/candidate-16/edl.pdf');
ck('a Clear result with its document and no date shows Clear, "Date not on file", and the document', ghl.includes('[Clear]') && ghl.includes('Date not on file') && ghl.includes('{doc}') && !ghl.includes('[Pending]'), ghl);
ck('...no next-due date is invented', !/Next:/.test(ghl), ghl);
const oig = cell('', 'CLEAR', 'bgcheck/ghl/candidate-16/oig.pdf', 30);
ck('OIG CLEAR with its document and no date: the same', oig.includes('[CLEAR]') && oig.includes('Date not on file'), oig);
ck('Pending with no date is still Pending', cell('', 'Pending', '').includes('[Pending]'));
ck('Clear with no date and NO document is still Pending (a result is never shown without its evidence)', cell('', 'Clear', '').includes('[Pending]'));
ck('a blank result with no date is still Pending', cell('', '', '').includes('[Pending]'));
const dated = cell(daysAgo(10), 'Clear', 'bgcheck/18/edl.pdf');
ck('with a date, the date decides as before (Current, next due shown)', dated.includes('[Current]') && /Next:/.test(dated) && !dated.includes('Date not on file'), dated);
ck('with an old date, Overdue as before', cell(daysAgo(200), 'Clear', 'x').includes('[Overdue]'));
ck('Issues Found with no date still shows Issues Found', cell('', 'Issues Found', 'x').includes('[Issues Found]'));
ck('the Hub page notes where the fill lives (the database, one rule) and that the page only reads', /prehire_checks_fill\.sql[\s\S]{0,200}This\s+page still only reads/.test(html));
ck('the page itself never writes a GoHighLevel result into a check', !/phd[A-Za-z]*\([^)]*\)[^;\n]{0,80}(_status|\.edl|\.fcsr|\.oig)\s*=/.test(html + eng));
ck('no em dashes in the new words', !/—/.test(cut(eng, 'function compCell(lastStr,info,overrideStatus,proof){', '\n    const fpBadge')));

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
