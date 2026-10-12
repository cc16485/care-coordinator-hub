// node tests/applicant-words-sync-test.mjs
// applicant-words.js (the Applicant journey's email previews) must be the server's applicant-words.ts, exactly.
// Source: STAFFING, else ../Staffing-Coordinator-Hub. Skips (exit 0) when the server folder is not here.
import fs from 'fs'; import path from 'path'; import { build } from '../tools/build-applicant-words.mjs'
const HUB = path.join(path.dirname(new URL(import.meta.url).pathname), '..')
const staffing = process.env.STAFFING || path.join(HUB, '..', 'Staffing-Coordinator-Hub')
if (!fs.existsSync(path.join(staffing, 'supabase/functions/_shared/applicant-words.ts'))) { console.log('skip: no Staffing-Coordinator-Hub here'); process.exit(0) }
const same = build(staffing) === fs.readFileSync(path.join(HUB, 'applicant-words.js'), 'utf8')
const w = {}; new Function('window', fs.readFileSync(path.join(HUB, 'applicant-words.js'), 'utf8'))(w)
const c = { first: 'Jordan', link: 'https://x', krystalNamed: false, mins: 20, phone: '(417) 234-8494', place: 'P', note: 'N', mapUrl: 'https://m' }
const ok = [['the Hub copy matches the server wording', same],
  ['it loads in a page and makes every email', ['finish', 'confirm', 'twoDays', 'dayBefore', 'hour', 'cancelled', 'goodbye'].every((k) => /<div/.test((w.AP_WORDS.emails[k](c, 'our team', 'Tuesday, October 13', '10:00 AM') || {}).html || ''))
    && [1, 2, 3, 4].every((n) => /<div/.test(w.AP_WORDS.emails.invite(c, n).html))]]
for (const [n, p] of ok) console.log((p ? 'ok   ' : 'FAIL ') + n + (p ? '' : '  (run: node tools/build-applicant-words.mjs <Staffing folder>)'))
process.exit(ok.every((x) => x[1]) ? 0 : 1)
