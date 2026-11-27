// RETURNING CAREGIVERS (Samantha 2026-11-27 "Yes, fix it"): the Onboarding row chip when AxisCare would not add the applicant.
//   node tests/rehire-chip-test.js
const fs = require('fs'), path = require('path')
const src = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8')
const i = src.indexOf("if(off && off.axiscare_push_error && !off.axiscare_applicant_id) m.extra.push(")
const line = src.slice(i, src.indexOf(');\n', i) + 2)
const run = (off) => { const m = { extra: [] }; const bgrEsc = (s) => s; new Function('m', 'off', 'bgrEsc', line)(m, off, bgrEsc); return m.extra }
const res = []; const ck = (n, c) => res.push([n, !!c])
let x = run({ id: 'o1', axiscare_push_error: 'AxisCare applicant create failed (422)' })
ck('422: "Worked here before?", not late, never "add by hand"', x.length === 1 && x[0].t === 'Worked here before?' && !x[0].late && !/add by hand/i.test(x[0].t + x[0].tip))
ck('422 tip says do not add or activate by hand, Send orientation sets In Training', /Do not add or activate them in AxisCare by hand/.test(x[0].tip) && /In Training/.test(x[0].tip))
x = run({ id: 'o2', axiscare_push_error: 'AxisCare token has no Applicants write permission yet' })
ck('any other error: the old "AxisCare: add by hand" chip', x.length === 1 && x[0].t === 'AxisCare: add by hand' && x[0].late === true)
x = run({ id: 'o3', axiscare_push_error: 'AxisCare applicant create failed (422)', axiscare_applicant_id: '55' })
ck('added after all: no chip', x.length === 0)
ck('no em dash', !/—/.test(line))
for (const [n, okk] of res) console.log((okk ? '  ✓ ' : '  ✗ ') + n)
const pass = res.filter((r) => r[1]).length
console.log(`\n${pass}/${res.length} passed`); process.exit(pass === res.length ? 0 : 1)
