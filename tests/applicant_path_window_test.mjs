// APPLICANT UNTIL CLEARED (2026-11-18): the Send orientation window's words when the Admin switch is on. Cuts the two
// functions out of caregivers-engine.js and runs them with a stand-in escaper. node tests/applicant_path_window_test.mjs
import fs from 'fs'; import path from 'path'
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..')
const ENG = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8')
const cut = (a, b) => { const i = ENG.indexOf(a), j = ENG.indexOf(b, i + 1); return ENG.slice(i, j) }
const code = 'const wcEsc = (t) => String(t ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;");\n' + cut('function axSetupHtml(', '/* 2026-11-11 (Samantha: "take all info') + cut('function axApplicantHtml(', '/* 2026-11-11 (Samantha: "take all info') + '\nreturn { axSetupHtml, axApplicantHtml }'
globalThis.window = {}
const F = new Function(code)()
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : String(d).slice(0, 600)])
const ap = F.axSetupHtml({ first: 'Ava', applicant_path: true }, '', null, '')
ck('switch on · says press Send and do NOT add them to AxisCare as a caregiver yet; no In Training instruction', /Press <b>Send orientation information<\/b>/.test(ap) && /Do not add them to AxisCare as a caregiver yet/.test(ap) && !/status <b>In Training/.test(ap), ap)
ck('switch on · no AxisCare copy lines (no name/phone/birth date to type)', !/Birth date|Copy<\/button>/.test(ap), ap)
const old = F.axSetupHtml({ first: 'Ava', address: { zip: '65721' } }, '', null, '')
ck('switch off · exactly the old words (In Training)', /status <b>In Training<\/b>/.test(old) && /Fill AxisCare from Step 1/.test(old), old)
ck('words · no em dash, never "plain language"', !/—/.test(ap) && !/plain (language|english)/i.test(ap))
const eng = ENG.slice(ENG.indexOf('async function axSetupOpen'), ENG.indexOf('async function step2Sent'))
ck('the window hides Fill and Check, and does not reveal the birth date, on the applicant path', /if\(d\.applicant_path\)\{ w\.querySelector\('#axFill'\)\.style\.display = 'none'; w\.querySelector\('#axCheck'\)\.style\.display = 'none'; \}/.test(eng) && /d\.has_dob && d\.offer_id && !d\.applicant_path/.test(eng))
let pass = 0; for (const [n, ok, d] of res) { console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : '\n     ' + d)); if (ok) pass++ }
console.log(`\n${pass}/${res.length} passed`); process.exit(pass === res.length ? 0 : 1)
