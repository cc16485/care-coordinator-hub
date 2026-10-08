/* node tests/onboarding-path-chip-test.js
   Slice 0 (Samantha approved 2026-10-08): the Old path / New path chip. The chip only shows what the offer carries; the
   checks row copies it from the offer; the Hub never decides a path. Real code cut out of caregivers-engine.js, fake
   people only. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const eng = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const cut = (src, from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return src.slice(a, b); };
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 160))); };
const ctx = { console }; vm.createContext(ctx); vm.runInContext(cut(eng, 'function pathChip(p){', 'let OFFERS=[];'), ctx);
ck('new shows New path in green', /New path/.test(ctx.pathChip('new')) && /#15803D/.test(ctx.pathChip('new')));
ck('old shows Old path in grey', /Old path/.test(ctx.pathChip('old')) && /#4B5563/.test(ctx.pathChip('old')));
ck('anything else (missing, junk) is shown as the current process, never as new', /Old path/.test(ctx.pathChip(undefined)) && /Old path/.test(ctx.pathChip('NEW')) && /Old path/.test(ctx.pathChip({})));
const o2c = cut(eng, 'async function offerToCandidate(', 'async function offerIntoChecks(');
ck('a new checks row copies the path from the offer, new only when the offer says new', /onboarding_path: o\.onboarding_path === 'new' \? 'new' : 'old'/.test(o2c));
ck('a row linked to its offer later takes the path too, without overwriting one it has', /if \(!dupe\.onboarding_path && o\.onboarding_path\) dupe\.onboarding_path = o\.onboarding_path/.test(o2c));
ck('nothing in the engine decides or changes a path (no switch-date logic, no writes of new)', !/onboarding_switch_date/.test(eng) && !/onboarding_path\s*=\s*'new'/.test(eng));
ck('the Starting soon card, the applicant board and the checks row show the chip', /'<span>'\+pathChip\(o\.onboarding_path\)/.test(eng) && /pips\.push\(pathChip\(r\.offer\.onboarding_path\)\)/.test(eng) && /\$\{c\.onboarding_path\?' '\+pathChip\(c\.onboarding_path\):''\}/.test(eng));
ck('the Send Offer result names the path the server chose and never computes one', /res\.onboarding_path==='new'/.test(html) && !/onboarding_path\s*=\s*['"](old|new)['"]/.test(html));
ck('the applicant page interview card shows the chip when the record carries a path', /o\.onboarding_path\?' '\+\(typeof pathChip==='function'\?pathChip\(o\.onboarding_path\)/.test(html));
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
