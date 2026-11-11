/* 2026-11-11: when the OIG search cannot run, Run OIG offers to record the check by hand (FAKE people only). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ENG = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8');
const i = ENG.indexOf('async function bgrRunOIG('), j = ENG.indexOf('\n}\n', i);
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('PASS ', m); } else { fail++; console.log('FAIL ', m); } };
function run(answer, throwIt){
  const calls = [], asked = [], btn = { disabled:false, textContent:'Run OIG' };
  const x = { HYDRATED:true, candidates:[{ id:7, first:'Pat', last:'Practice' }], bgrStep1Wait:() => false,
    runOIGCheck: async () => { if(throwIt) throw new Error('OIG database download failed (403)'); return { clear:true, matches:[] }; },
    confirm: m => { asked.push(m); return answer; }, alert: m => asked.push('ALERT ' + m),
    bgrRecordCheck: (id, k) => calls.push([id, k]), showOIGResult: () => calls.push(['shown']),
    sb:{ storage:{ from:() => ({ upload: async () => ({}) }) } }, Blob: function(){}, JSON, Date, Promise, String };
  vm.createContext(x); vm.runInContext(ENG.slice(i, j + 2), x);
  return x.bgrRunOIG(7, btn).then(() => ({ calls, asked, btn }));
}
(async () => {
  let r = await run(true, true);
  ok(r.asked.length === 1 && /could not run: OIG database download failed \(403\)/.test(r.asked[0]), 'the reason is shown');
  ok(/exclusions\.oig\.hhs\.gov/.test(r.asked[0]) && /PDF/.test(r.asked[0]), 'says how to do it by hand');
  ok(JSON.stringify(r.calls) === '[[7,"oig"]]', 'OK opens the OIG recorder for that person');
  ok(r.btn.disabled === false && r.btn.textContent === 'Run OIG', 'the button comes back');
  r = await run(false, true);
  ok(r.calls.length === 0, 'Cancel records nothing');
  r = await run(true, false);
  ok(r.asked.length === 0 && JSON.stringify(r.calls) === '[["shown"]]', 'a working search is unchanged');
  ok(!/—/.test(ENG.slice(i, j)), 'no em dashes');
  console.log(`oig-record-by-hand: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
