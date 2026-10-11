/* node tests/anon-key-test.js
   2026-10-11: step1.html and step2.html carried the Hub's public key cut short (181 of 208 characters) since Slice 2b, so
   Supabase refused every call from them ("Invalid JWT") and the Step 1 link always read "not valid or has run out".
   Every page and script that holds the Hub project's public key must hold the whole of it. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const FULL = (fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8').match(/const SB_KEY {2}= '([^']+)'/) || [])[1];
const RX = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZ3NnZWRsc3hpbmJ5Z3dteHduIiwicm9sZSI6ImFub24i[A-Za-z0-9._-]*/g;
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + x)); };
ck('the engine holds a whole key (three parts, 208 characters)', !!FULL && FULL.split('.').length === 3 && FULL.length === 208, FULL && FULL.length);
const files = fs.readdirSync(ROOT).filter((f) => /\.(html|js)$/.test(f));
const bad = [];
for (const f of files) for (const k of fs.readFileSync(path.join(ROOT, f), 'utf8').match(RX) || []) if (k !== FULL) bad.push(f + ' (' + k.length + ' characters)');
ck('every page and script holds the whole Hub public key (' + files.length + ' files)', bad.length === 0, bad.join(', '));
ck('the Step 1 and Step 2 pages hold it', ['step1.html', 'step2.html'].every((f) => (fs.readFileSync(path.join(ROOT, f), 'utf8').match(RX) || []).every((k) => k === FULL)));
console.log(`anon-key: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
