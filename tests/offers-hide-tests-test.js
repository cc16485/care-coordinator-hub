/* node tests/offers-hide-tests-test.js
   Test offers stay out of the Offers counts (Samantha, 2026-11-01: "i dont want it to count in our numbers that this many
   people are rejecting our offers"). A test offer is one made "by Slice ... test / rehearsal / practice run". */
const fs = require('fs'), path = require('path');
const eng = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 400))); };
const src = eng.match(/function offerIsTest\(o\)\{[^\n]*\}/);
ck('offerIsTest is defined', !!src);
const offerIsTest = src ? new Function(src[0] + '; return offerIsTest;')() : () => false;
['Slice 1g rehearsal', 'Slice 1b test', 'Slice 10 practice run', 'slice 3 TEST'].forEach(b =>
  ck('"' + b + '" is a test offer', offerIsTest({ offered_by: b })));
['Krystal Land', 'Samantha Troutman', 'Tess Tester', '', null].forEach(b =>
  ck('"' + b + '" is a real offer', !offerIsTest({ offered_by: b })));
ck('the loaded list drops test offers, so every stage count and card leaves them out', /OFFERS=data\.filter\(o=>!offerIsTest\(o\)\);/.test(eng));
ck('the older offers list leaves them out too', /data=data\.filter\(o=>!offerIsTest\(o\)\)/.test(html));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
