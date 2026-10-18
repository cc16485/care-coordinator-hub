/* node tests/rules-guard-test.mjs
   Rules guard (2026-10-18): a PR that changes a rules file the server runs fails until that exact file is approved.
   Proves the decision (unchanged files skipped, approved passes, unapproved and unreachable fail closed, a removal
   fails), the database question it sends, the GitHub workflow wiring, and today's real case: the Supervisory change
   (41d97ca -> aeef97f) is the file that went live unapproved. No network. */
import fs from 'fs'; import path from 'path'; import cp from 'child_process'
import { check, report, askApproved, sha256, RULES_FILES, SB_URL, SB_ANON } from '../tools/rules-guard.mjs'
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..')
let pass = 0, fail = 0
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))) }
const B = (s) => Buffer.from(s)
const files = (m) => (f) => (f in m ? m[f] : null)

/* 1. the decision */
{ const asked = []
  const r = await check({ readHead: files({ 'eligibility-rules.js': B('same'), 'obligations.js': B('x') }), readBase: files({ 'eligibility-rules.js': B('same'), 'obligations.js': B('x') }),
    ask: async (f, fp) => { asked.push(f); return false } })
  ck('nothing changed: passes and asks nothing', r.ok && r.rows.length === 0 && asked.length === 0, r)
  ck('nothing changed: says so', /No rules file changed/.test(report(r).join('\n'))) }
{ const r = await check({ readHead: files({ 'eligibility-rules.js': B('new') }), readBase: files({ 'eligibility-rules.js': B('old') }), ask: async () => true })
  ck('changed and approved: passes', r.ok && r.rows.length === 1 && r.rows[0].ok && r.rows[0].fp === sha256(B('new')), r) }
{ const seen = []
  const r = await check({ readHead: files({ 'eligibility-rules.js': B('new') }), readBase: files({ 'eligibility-rules.js': B('old') }), ask: async (f, fp) => { seen.push([f, fp]); return false } })
  const txt = report(r).join('\n')
  ck('changed and NOT approved: fails', !r.ok && /NOT approved/.test(txt), txt)
  ck('it asks about the PR\'s file, not main\'s', seen.length === 1 && seen[0][1] === sha256(B('new')), seen)
  ck('the failure prints the full fingerprint the approve step needs', txt.includes(sha256(B('new'))) && /approve the new rules/.test(txt), txt)
  ck('no em dash in what it prints', !/—/.test(txt)) }
{ const r = await check({ readHead: files({ 'match-rules.js': B('n') }), readBase: files({}), ask: async () => false })
  ck('a new rules file counts as changed', !r.ok && r.rows[0].file === 'match-rules.js', r) }
{ const r = await check({ readHead: files({}), readBase: files({ 'ihs-rules.js': B('o') }), ask: async () => true })
  ck('removing a rules file the server loads fails', !r.ok && /removes it/.test(r.rows[0].why), r) }
{ const r = await check({ readHead: files({ 'client-start.js': B('n') }), readBase: files({ 'client-start.js': B('o') }), ask: async () => 'could not reach the database: boom' })
  ck('cannot ask the database: fails closed', !r.ok && /could not reach/.test(r.rows[0].why), r) }
{ const r = await check({ readHead: files({ 'a.js': B('n'), 'obligations.js': B('n') }), readBase: files({ 'a.js': B('o'), 'obligations.js': B('o') }), ask: async () => true })
  ck('only rules files are looked at', r.rows.length === 1 && r.rows[0].file === 'obligations.js', r) }
{ const r = await check({ readHead: files({ 'promise-engine.js': B('n'), 'launch-evidence.js': B('n') }), readBase: files({ 'promise-engine.js': B('o'), 'launch-evidence.js': B('o') }),
    ask: async (f) => f === 'promise-engine.js' })
  ck('one approved and one not: fails, and names only the one', !r.ok && r.rows.filter((x) => !x.ok).map((x) => x.file).join() === 'launch-evidence.js', r) }

/* 2. the question it sends */
{ let call
  const send = async (url, o) => { call = { url, o }; return new Response('true', { status: 200 }) }
  const a = await askApproved('eligibility-rules.js', 'f'.repeat(64), send)
  ck('asks rules_fingerprint_approved with the public key, file and fingerprint', a === true && call.url === SB_URL + '/rest/v1/rpc/rules_fingerprint_approved'
    && call.o.method === 'POST' && call.o.headers.apikey === SB_ANON && JSON.parse(call.o.body).p_file === 'eligibility-rules.js' && JSON.parse(call.o.body).p_sha256 === 'f'.repeat(64), call)
  ck('a false answer is false', (await askApproved('x.js', 'a', async () => new Response('false', { status: 200 }))) === false)
  const e1 = await askApproved('x.js', 'a', async () => new Response('{"message":"function does not exist"}', { status: 404 }))
  ck('an error answer is a reason (fails closed), not a yes', typeof e1 === 'string' && /404/.test(e1), e1)
  const e2 = await askApproved('x.js', 'a', async () => { throw new Error('offline') })
  ck('no network is a reason (fails closed)', typeof e2 === 'string' && /could not reach/.test(e2), e2)
  ck('the key is the anon key (role anon), the same one index.html ships', JSON.parse(Buffer.from(SB_ANON.split('.')[1], 'base64url')).role === 'anon'
    && fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').includes(SB_ANON)) }

/* 3. the list and the workflow */
ck('every listed rules file exists in the Hub', RULES_FILES.every((f) => fs.existsSync(path.join(ROOT, f))), RULES_FILES.filter((f) => !fs.existsSync(path.join(ROOT, f))))
{ const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/rules-approved.yml'), 'utf8')
  ck('the workflow runs on every PR to main (no path filter, so it always reports)', /pull_request:\s*\n\s*branches: \[main\]/.test(wf) && !/paths:/.test(wf))
  ck('the workflow checks the merged result against the PR base', /fetch-depth: 0/.test(wf) && !/ref:/.test(wf) && /base\.sha/.test(wf) && /node tools\/rules-guard\.mjs "\$BASE"/.test(wf))
  ck('the workflow can only read the repo and keeps no credentials', /permissions:\s*\n\s*contents: read/.test(wf) && /persist-credentials: false/.test(wf) && !/secrets\./.test(wf)) }

/* 4. today's real case, from git history: the Supervisory change is exactly the unapproved fingerprint */
{ const show = (c) => { try { return cp.execFileSync('git', ['-C', ROOT, 'show', `${c}:eligibility-rules.js`], { stdio: ['ignore', 'pipe', 'ignore'] }) } catch { return null } }
  const before = show('41d97ca'), after = show('aeef97f')
  if (!before || !after) ck('history for the real case is available (skipped in a shallow copy)', true)
  else {
    const r = await check({ files: ['eligibility-rules.js'], readHead: () => after, readBase: () => before, ask: async (f, fp) => fp.startsWith('3fd49442b506') })
    ck('the Supervisory PR would have been stopped: its fingerprint is aa8932458cba', !r.ok && r.rows[0].fp.startsWith('aa8932458cba'), r)
  } }

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
