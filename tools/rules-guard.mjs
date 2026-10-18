// Rules guard (2026-10-18). The server jobs run these files from cc.mo-care.com only when the file's exact SHA-256
// fingerprint is approved (G2, public.rules_approved). Twice a PR changed one and merged before Samantha ran its
// "approve the new rules" Desktop step (EDL quarterly 10-14, Supervisory #495 10-18), and caregiver connect and the
// other jobs stopped until she did. This check runs on every pull request: for each rules file the PR changes, it asks
// the database "is this exact file approved?" and fails until it is. Run the approve step, then re-run the check.
//   node tools/rules-guard.mjs <base commit>      (in a checkout of the PR)
// The list must hold every file the server loads through approvedRules (the Staffing-Coordinator-Hub test
// rules_guard_list_test.mjs reads the functions and fails when a new one is missing here).
import fs from 'fs'; import path from 'path'; import crypto from 'crypto'; import cp from 'child_process'

export const RULES_FILES = [
  'caregiver-connect-rules.js', 'client-start.js', 'eligibility-rules.js', 'ihs-rules.js', 'intake-import-rules.js',
  'launch-evidence.js', 'match-rules.js', 'obligations.js', 'promise-engine.js',
]
export const SB_URL = 'https://zngsgedlsxinbygwmxwn.supabase.co'
// The Hub's public (anon) key, the same one index.html ships; it can only ask the yes/no question.
export const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZ3NnZWRsc3hpbmJ5Z3dteHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NDIzNDQsImV4cCI6MjA5ODExODM0NH0.L_31_UKdccyRH9n7p1GaBlZTqcJipB008H-GIvxwLxM'

export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')

/** Ask the database. true / false, or a string saying why it could not be asked (the check then fails: fail closed). */
export async function askApproved(file, fp, send = fetch) {
  try {
    const r = await send(`${SB_URL}/rest/v1/rpc/rules_fingerprint_approved`, { method: 'POST',
      headers: { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_file: file, p_sha256: fp }) })
    const t = await r.text()
    if (!r.ok) return `the database answered ${r.status}: ${t.slice(0, 160)}`
    if (t.trim() === 'true') return true
    if (t.trim() === 'false') return false
    return 'unexpected answer: ' + t.slice(0, 80)
  } catch (e) { return 'could not reach the database: ' + String(e).slice(0, 120) }
}

/** The pure part. readHead/readBase return a Buffer, or null when the file is not there. */
export async function check({ files = RULES_FILES, readHead, readBase, ask }) {
  const rows = []
  for (const f of files) {
    const head = readHead(f), base = readBase(f)
    if (head === null && base === null) continue
    if (head !== null && base !== null && Buffer.compare(head, base) === 0) continue
    if (head === null) { rows.push({ file: f, ok: false, why: 'this PR removes it, but server jobs still load it. Change the jobs first.' }); continue }
    const fp = sha256(head), a = await ask(f, fp)
    if (a === true) rows.push({ file: f, fp, ok: true, why: 'approved' })
    else if (a === false) rows.push({ file: f, fp, ok: false, why: 'NOT approved yet' })
    else rows.push({ file: f, fp, ok: false, why: a })
  }
  return { ok: rows.every((r) => r.ok), rows }
}

export function report(res) {
  const out = []
  if (!res.rows.length) { out.push('No rules file changed in this PR. Nothing to approve.'); return out }
  for (const r of res.rows) out.push(`${r.ok ? 'OK  ' : 'STOP'} ${r.file}${r.fp ? ' fingerprint ' + r.fp : ''}: ${r.why}`)
  if (!res.ok) {
    out.push('')
    out.push('Do not merge yet. The server jobs refuse a rules file until its fingerprint is approved, and they would stop')
    out.push('the moment this PR goes live. Ship a Desktop "approve the new rules" step with the full fingerprint above,')
    out.push('have Samantha run it, then re-run this check. It turns green on its own once the database says yes.')
  }
  return out
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)
if (isMain) {
  const base = process.argv[2]
  if (!base || !/^[0-9a-f]{7,40}$/.test(base)) { console.error('usage: node tools/rules-guard.mjs <base commit sha>'); process.exit(2) }
  const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..')
  const readHead = (f) => { try { return fs.readFileSync(path.join(ROOT, f)) } catch { return null } }
  const readBase = (f) => { try { return cp.execFileSync('git', ['-C', ROOT, 'show', `${base}:${f}`], { maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] }) } catch { return null } }
  const res = await check({ readHead, readBase, ask: (f, fp) => askApproved(f, fp) })
  const lines = report(res)
  console.log(lines.join('\n'))
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### Rules files\n\n```\n' + lines.join('\n') + '\n```\n')
  process.exit(res.ok ? 0 : 1)
}
