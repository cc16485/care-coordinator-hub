// node tests/journey-check.mjs
// The Applicant journey must match the real messages (Samantha, 2026-10-04, "yes to all" on
// https://claude.ai/artifact/6FdA6bE9aaobS5E6aY7E42, idea 3). Two checks:
//   1. every sentence of every message on the journey (applicant-journey.js) is in the code that sends it: the Hub
//      (index.html, caregivers-engine.js), the Hub's server (Staffing-Coordinator-Hub supabase/functions + the
//      orientation booking page) and the Training Platform (supabase/functions). {placeholders}, [alternatives], links,
//      the office phone and address, and "(private: ...)" notes are left out of the comparison.
//   2. no em dash in any journey message, nor in any message string the code sends to an applicant, caregiver or
//      family (her rule). Internal text (AI instructions, office alerts and backups) is listed in ALLOW with why.
// Sources: JC_SOURCES (paths, ":"-separated), else the folders next to this one. The Desktop steps run it against
// fresh copies from GitHub. Exits 1 on any problem.
import fs from 'fs'; import path from 'path'
const HERE = path.dirname(new URL(import.meta.url).pathname), HUB = path.join(HERE, '..'), PROJ = path.join(HUB, '..')
const JOURNEY = process.env.JC_JOURNEY || path.join(HUB, 'applicant-journey.js')
const SOURCES = (process.env.JC_SOURCES ? process.env.JC_SOURCES.split(':') : [
  path.join(HUB, 'index.html'), path.join(HUB, 'caregivers-engine.js'),
  path.join(PROJ, 'Staffing-Coordinator-Hub/supabase/functions'), path.join(PROJ, 'Staffing-Coordinator-Hub/orientation-booking.html'),
  path.join(PROJ, 'training-wt/supabase/functions')]).filter(Boolean)
const res = []; const ck = (n, ok, note) => res.push([n, !!ok, ok ? '' : note])
const files = []
const walk = (p) => { if (!fs.existsSync(p)) return false; const st = fs.statSync(p)
  if (st.isDirectory()) { for (const f of fs.readdirSync(p)) if (!/^(node_modules|\.git|\.temp)$/.test(f)) walk(path.join(p, f)) }
  else if (/\.(ts|js|html|mjs)$/.test(p) && !/test|harness|\.bak/.test(path.basename(p))) files.push(p); return true }
const missing = SOURCES.filter((s) => !walk(s))
ck('all the message sources are here', !missing.length, 'missing: ' + missing.join(', '))
const raw = Object.fromEntries(files.map((f) => [f, fs.readFileSync(f, 'utf8')]))
/* the code as one text: string pieces joined across "+", escapes undone, ${...} as a gap */
const corpus = Object.values(raw).join('\n')
  .replace(/[`'"]\s*\+\s*\n?\s*[`'"]/g, '').replace(/\\n/g, ' ').replace(/\\'/g, "'").replace(/\\"/g, '"')
  .replace(/&amp;/g, '&').replace(/&mdash;/g, '\u2014').replace(/&middot;/g, '·').replace(/<\/?[a-zA-Z][^<>]{0,200}>/g, ' ').replace(/\s+/g, ' ')
const norm = (s) => String(s).replace(/<\/?[a-zA-Z][^<>]{0,200}>/g, ' ').replace(/\s+/g, ' ').trim()
const STRIP = /\{[^}]*\}|\[[^\]]*\]|https?:\/\/\S+|\(private:[^)]*\)|\(?417\)?[ .-]?234-8494|1331 N Stewart Ave Ste B, Springfield MO 65802|\.\./g
/* sentences assembled from parts in the code: each part must still be there */
const PARTS = {
  25: [['a reminder that your in-person Caring Companions orientation at our office is tomorrow', ['a reminder that ', 'your in-person Caring Companions orientation at our office', ' is tomorrow, ']]],
  28: [['Sign-off version: Hi', []], ['you still have required training to finish (due by', ['a friendly reminder from Caring Companions: ', 'you still have required training to finish${duePhrase}']]],
}
const w = {}; new Function('window', fs.readFileSync(JOURNEY, 'utf8'))(w)
const drift = []
for (const e of w.AP_JOURNEY || []) {
  if (!e.text) continue
  const sentences = norm(e.text).split(STRIP).flatMap((c) => c.split(/(?<=[.!?])\s+|\s*\|\|\s*|•/))
    .map((c) => c.trim().replace(/^[,.!:;)\s]+|[\s(:,]+$/g, '')).filter((c) => c.length >= 18)
  for (const sn of sentences) {
    if (corpus.includes(sn)) continue
    const known = (PARTS[e.order] || []).find(([s]) => sn.includes(s) || s.includes(sn))
    if (known && known[1].every((p) => corpus.includes(p))) continue
    drift.push(`#${e.order} ${e.name}: "${sn.slice(0, 120)}"`)
  }
}
ck('every journey message matches the code that sends it', !drift.length, drift.join('\n      '))
const dashJ = (w.AP_JOURNEY || []).filter((e) => /—/.test(String(e.text || '') + String(e.subject || '') + String(e.email_summary || ''))).map((e) => '#' + e.order + ' ' + e.name)
ck('no em dash in any message on the journey', !dashJ.length, dashJ.join(', '))
/* message strings to people: a greeting, "you", STOP, a sign-off, an email body or subject */
const OUT = /Hi |<p>|Reply STOP|\{first|\$\{first|\byou\b|\byour\b|Caring Companions|thank you|Questions\?|subject/i
const ALLOW = [
  [/ai-draft-followup|ai-draft-careplan|ai-ltc-policy/, /./, 'instructions to the AI, never sent to anyone'],
  [/automation-watchdog|shared-backup|monthly-backup|sync-axiscare/, /./, 'office-only alert or backup email'],
  [/evidence-write|identity-backfill/, /./, 'internal tools that never send a message'],
  [/hub-access|caregiver-hiring-history|profile-check|issues-run|lead-intake|cc-booking|carematch-watch|timekeeper-watch|lead-nurture/, /^'[^']*'$|^"[^"]*"$|title|summary|routed|error|note:|detail|skipped|do_not_contact|stop_reason/, 'an internal status, card title or note'],
  [/interview-messages|job-offer|caregiver-availability|coverage-run|coverage-reply|ghe-reminders|ht-local/, /error|routed|skipped|note:|title:|summary:|detail:|census|truncated|held|esc\(item/, 'an internal status, error or card'],
]
const dashCode = []
for (const [f, s] of Object.entries(raw)) {
  if (!/functions\//.test(f) && !/(index\.html|caregivers-engine\.js|orientation-booking\.html)$/.test(f)) continue
  s.split('\n').forEach((line, i) => {
    const t = line.trim(); if (/^(\/\/|\/\*|\*)/.test(t) || !/—|&mdash;/.test(line)) return
    for (const m of line.matchAll(/`[^`]*`|'[^']*'|"[^"]*"/g)) {
      const lit = m[0]; if (!/—|&mdash;/.test(lit) || !OUT.test(lit + ' ' + line)) continue
      if (ALLOW.some(([fr, lr]) => fr.test(f) && lr.test(line))) continue
      if (/\.html$|caregivers-engine/.test(f) && !/\bmsg\s*=|message\s*:|sendCandidateSMS\(|'Hi '\s*\+|Hi \$\{/.test(line)) continue   // page wording, not a message
      dashCode.push(`${f.split(/Projects\//).pop()}:${i + 1} ${lit.slice(0, 100)}`); break
    }
  })
}
ck('no em dash in any message the code sends to an applicant, caregiver or family', !dashCode.length, dashCode.join('\n      '))
for (const [n, ok, note] of res) console.log((ok ? 'ok   ' : 'FAIL ') + n + (ok ? '' : '\n      ' + note))
const bad = res.filter((r) => !r[1]).length
console.log(bad ? `${bad} problem(s)` : `${res.length}/${res.length} passed`)
process.exit(bad ? 1 : 0)
