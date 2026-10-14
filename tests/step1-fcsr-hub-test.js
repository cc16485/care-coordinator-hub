/* Step 1 screen 5b FCSR facts + the FCSR registration text (approved 2026-10-14), the Hub side: links on Step 1 screens,
   the sheet filled from the new answers, the send button, the composer passing its pick. FAKE data only. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ENG = read('caregivers-engine.js'), S1 = read('step1.html'), AT = read('applicant-text.js'), IDX = read('index.html');
const cut = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error('cannot find ' + a); return src.slice(i, j); };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ', m); } else { fail++; console.log('FAIL ', m); } };

const c = {}; vm.createContext(c); vm.runInContext(S1.match(/function linkify\(h\)\{[^\n]+\}/)[0], c);
ok(c.linkify("here: https://health.mo.gov/providers/family-care-safety-registry/forms. If you") === 'here: <a href="https://health.mo.gov/providers/family-care-safety-registry/forms" target="_blank" rel="noopener">https://health.mo.gov/providers/family-care-safety-registry/forms</a>. If you', 'Step 1: the state form link opens, the full stop stays text');
ok(c.linkify('no address here') === 'no address here' && !/<a /.test(c.linkify('http://plain.example.com')), 'only https addresses become links');
ok((S1.match(/map\(\(p\) => '<p>' \+ linkify\(esc\(p\)\) \+ '<\/p>'\)/g) || []).length === 3, 'every screen paragraph (and the cheer box, and the reader) links its addresses, after escaping');

const desk = cut(ENG, 'function sdRender(){', 'async function sdReveal(');
for (const k of ['middle_name', 'suffix', 'birth_name', 'gender', 'county']) ok(desk.includes("has('" + k + "')"), 'the sheet reads ' + k + ' from Step 1');
ok(/line\('Middle initial', mi \? sdEsc\(mi\) \+ cp\(mi\)/.test(desk), 'middle initial from the middle name, with Copy');
ok(/F\.suffix !== 'None'/.test(desk), 'a suffix of None is not typed into the state site');
ok(/not collected in Step 1 yet/.test(desk), 'older Step 1s still say not collected');

const row = cut(ENG, "if(k === 'fcsr'){", '    }\n');
ok(/obFcsrTextOpen\(' \+ id \+ '\)', 'Send registration steps'/.test(row), 'FCSR row: Send registration steps, while it is pending');
const op = cut(ENG, 'async function obFcsrTextOpen(candId){', 'window.obFcsrTextOpen');
ok(/ApText\.open\(appId, \{ pick: 'fcsr' \}\)/.test(op) && !/ilike|phone|email/.test(op), 'opens the Text composer on the FCSR pick for their application, found by id');
ok(!/send|invoke\(/.test(op), 'it only opens the composer; a person taps Send');

ok(/let picked = start \? start\.key : null;/.test(AT) && /picked = p\.key;/.test(AT) && /pick: picked \|\| undefined/.test(AT), 'the composer tells the server which quick pick it is (so the FCSR email goes with it)');
ok(/applicant-text\.js\?v=2/.test(IDX), 'browsers fetch the new composer');
ok(![desk.slice(desk.indexOf('Step 1 screen 5b asks')), op, S1.match(/function linkify[^\n]+/)[0]].some(t => /—/.test(t)), 'no em dashes');
console.log(`step1-fcsr-hub: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
