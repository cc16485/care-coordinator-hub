/* The REAL driver-compliance edge function (Staffing repo, supabase/functions/driver-compliance) run in node against a fake
   database, a fake private bucket and a fake GoHighLevel, served on a local port so a Playwright test can send the Hub
   pages' requests to it (request body -> the real handler -> its response). The fakes are adapted from the server repo's
   own driver_compliance_test.mjs. Nothing real is touched.
     node tests/driver_e2e_server.mjs <Staffing supabase/functions dir>
   Prints one JSON line when ready: { port, key, link } (key = the practice caregiver's record, link = their driver link).
   POST /fn   (Authorization: Bearer <sam|kry|nobody>, or none for the caregiver link) -> the handler's status and JSON
   POST /put?p=<bucket/path>  -> the file lands in the fake bucket (what a signed upload would do)
   GET  /db   -> the fake tables, to check what the function wrote */
import fs from 'fs'; import path from 'path'; import os from 'os'; import http from 'http'
const FN = path.resolve(process.argv[2] || '/Users/samantha/Claude/Projects/Staffing-Coordinator-Hub/launch/driver-staff/supabase/functions')
const SECRET = 'j'.repeat(48)
const env = { SUPABASE_URL: 'http://x', SUPABASE_SERVICE_ROLE_KEY: 's'.repeat(40), HUB_JOB_SECRET: SECRET, GHL_TOKEN: 'g', GHL_LOCATION_ID: 'L' }
let handler = null; globalThis.Deno = { env: { get: (k) => env[k] }, serve: (h) => { handler = h } }
const realFetch = globalThis.fetch
globalThis.fetch = async (url) => { throw new Error('unexpected outside call ' + url) }   /* the function may not reach anything in this test */
let DB = { driver_compliance: [], driver_compliance_event: [], driver_document: [], app_data: [], auth_identities: [], persons: [], entity_memberships: [], staff_roles: [], document_access_log: [],
  client_journey: [], client_journey_step: [], client_journey_event: [], domains: [], job_applicants: [], contact_optout_current: [], circle_contacts: [], identity_door_audit: [] }
let seq = 0
const uuid = () => `aaaaaaaa-bbbb-4ccc-8ddd-${(++seq).toString(16).padStart(12, '0')}`
const clone = (x) => JSON.parse(JSON.stringify(x))
function table(name) {
  DB[name] ||= []
  const rows = () => DB[name]
  const q = (mode, payload, filters = [], opts = {}) => {
    const match = (r) => filters.every((f) => f(r))
    const run = () => {
      if (mode === 'select') { let out = rows().filter(match); if (opts.order) out = [...out].sort((a, b) => String(a[opts.order]).localeCompare(String(b[opts.order])) * (opts.asc === false ? -1 : 1)); if (opts.limit) out = out.slice(0, opts.limit); return clone(out) }
      if (mode === 'insert') {
        const r = { ...payload }
        if (name === 'driver_compliance') { if (r.caregiver_id && rows().some((x) => x.caregiver_id === r.caregiver_id)) throw new Error('duplicate caregiver_id'); Object.assign(r, { id: r.id || uuid(), reminders: r.reminders || {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }) }
        if (name === 'driver_document') { r.id = r.id || uuid(); r.uploaded_at = r.uploaded_at || new Date().toISOString() }
        if (name === 'driver_compliance_event') { r.id = ++seq; r.at = new Date(Date.now() + seq).toISOString() }
        if (name === 'client_journey_event') { r.id = ++seq; r.at = new Date().toISOString() }
        rows().push(r); return [clone(r)] }
      if (mode === 'upsert') { rows().push({ ...payload }); return [clone(payload)] }
      if (mode === 'update') { const out = []; for (const r of rows()) if (match(r)) { if (name === 'driver_compliance_event') throw new Error('append-only'); Object.assign(r, payload); out.push(clone(r)) } return out }
    }
    const api = {
      eq: (k, v) => q(mode, payload, [...filters, (r) => String(r[k]) === String(v)], opts), neq: (k, v) => q(mode, payload, [...filters, (r) => String(r[k]) !== String(v)], opts),
      in: (k, vs) => q(mode, payload, [...filters, (r) => vs.map(String).includes(String(r[k]))], opts),
      is: (k, v) => q(mode, payload, [...filters, (r) => (v === null ? r[k] == null : r[k] === v)], opts),
      not: (k, op, v) => q(mode, payload, [...filters, (r) => op === 'is' ? (r[k] ?? null) !== v : true], opts),
      ilike: (k, v) => q(mode, payload, [...filters, (r) => String(r[k] ?? '').toLowerCase().includes(String(v).replace(/%/g, '').toLowerCase())], opts),
      order: (k, o2) => q(mode, payload, filters, { ...opts, order: k, asc: o2?.ascending }), limit: (n) => q(mode, payload, filters, { ...opts, limit: n }),
      select: () => q(mode, payload, filters, opts),
      maybeSingle: async () => { try { return { data: run()[0] ?? null, error: null } } catch (e) { return { data: null, error: { message: e.message } } } },
      then: (ok) => { try { return Promise.resolve(ok({ data: run(), error: null })) } catch (e) { return Promise.resolve(ok({ data: null, error: { message: e.message } })) } },
    }
    return api
  }
  return { select: () => q('select', null), insert: (p) => q('insert', p), upsert: (p) => q('upsert', p), update: (p) => q('update', p), delete: () => { throw new Error('never deleted') } }
}
const ad = (k) => DB.app_data.find((x) => x.key === k)?.data
const setAd = (k, v) => { const r = DB.app_data.find((x) => x.key === k); if (r) r.data = v; else DB.app_data.push({ key: k, data: v }) }
async function rpc(name, a) {
  if (name === 'upsert_app_data_item') { let row = DB.app_data.find((x) => x.key === a.target_key); if (!row) { row = { key: a.target_key, data: [] }; DB.app_data.push(row) } const i = row.data.findIndex((x) => x.id === a.item.id); if (i >= 0) row.data[i] = a.item; else row.data.push(a.item); return { data: null, error: null } }
  if (name === 'contact_send_refusal_log') return { data: null, error: null }
  if (name === 'driver_roster_patch') { const r = (ad('caregivers') || []).find((x) => String(x.id) === String(a.p_id)); if (!r) return { data: { ok: false, reason: 'gone' }, error: null }
    const rev = Number(r._rev || 0); if (rev !== a.p_base_rev) return { data: { ok: false, reason: 'changed', current_record: clone(r) }, error: null }
    Object.assign(r, a.p_patch); r._rev = rev + 1; return { data: { ok: true, rev: r._rev }, error: null } }
  return { data: null, error: { message: 'unknown rpc ' + name } }
}
const STORE = {}
const storage = { from: (bucket) => ({
  createSignedUploadUrl: async (p) => ({ data: { token: 'tok', signedUrl: 'https://up.test/' + bucket + '/' + p + '?token=tok', path: p }, error: null }),
  list: async (dir, o) => ({ data: Object.keys(STORE).filter((k) => k.startsWith(bucket + '/' + dir + '/') && k.slice((bucket + '/' + dir + '/').length) === o.search).map((k) => ({ name: k.split('/').pop() })), error: null }),
  upload: async (p, bytes) => { STORE[bucket + '/' + p] = bytes; return { data: { path: p }, error: null } },
  createSignedUrl: async (p) => STORE[bucket + '/' + p] ? { data: { signedUrl: 'https://signed.test/' + bucket + '/' + p + '?token=five-minutes' }, error: null } : { data: null, error: { message: 'not found' } } }) }
const USERS = { sam: ['u-sam', 'sam@mo-care.com'], kry: ['u-kry', 'krystal@mo-care.com'], nobody: ['u-no', 'no@mo-care.com'] }
globalThis.__fakeCreateClient = () => ({ from: table, rpc, storage, auth: { getUser: async (jwt) => USERS[jwt] ? { data: { user: { id: USERS[jwt][0], email: USERS[jwt][1], app_metadata: {} } }, error: null } : { data: null, error: { message: 'bad' } } } })
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'drv-e2e-')); fs.cpSync(FN, TMP, { recursive: true })
for (const p of fs.readdirSync(TMP, { recursive: true })) { const f = path.join(TMP, String(p)); if (!f.endsWith('.ts')) continue; fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/^import \{ createClient \} from .*$/m, 'const createClient = globalThis.__fakeCreateClient').replace(/^import .* from 'https:[^']*'$/mg, '')) }
let LINKS
try { await import(path.join(TMP, 'driver-compliance', 'index.ts')); LINKS = await import(path.join(TMP, '_shared', 'applicant-links.ts')) } finally { fs.rmSync(TMP, { recursive: true, force: true }) }
/* people: Samantha (owner) and Krystal (staffing coordinator, not on the Approve drivers list); one practice caregiver */
DB.auth_identities = [['u-sam', 'p-sam'], ['u-kry', 'p-kry'], ['u-no', 'p-no']].map(([a, p]) => ({ auth_user_id: a, person_id: p, project_ref: 'zngsgedlsxinbygwmxwn' }))
DB.persons = [['p-sam', 'Samantha Troutman', 'sam@mo-care.com'], ['p-kry', 'Krystal', 'krystal@mo-care.com'], ['p-no', 'Nora', 'no@mo-care.com']].map(([p, n, e]) => ({ person_id: p, full_name: n, primary_email: e, active: true }))
DB.entity_memberships = ['p-sam', 'p-kry', 'p-no'].map((p) => ({ person_id: p, entity: 'cc_ihs', active: true, ended_at: null }))
DB.staff_roles = [{ person_id: 'p-sam', entity: 'cc_ihs', role: 'owner_admin' }, { person_id: 'p-kry', entity: 'cc_ihs', role: 'staffing_coordinator' }]
DB.domains = [{ entity: 'cc_ihs', code: 'caregivers', owner_person: 'p-kry' }]
setAd('ops_settings', {}); setAd('onboarding_permissions', { version: 1, advance: [], work: [{ person_id: 'p-sam' }], screening: [], driver: [], history: [] })
setAd('caregivers', [{ id: 204, first: 'Pat', last: 'Practice', phone: '(417) 555-0181', email: 'pat@practice.invalid', axiscare_id: '9204', _rev: 1, dl_expires: '2027-02-01', auto_ins_expires: '2026-12-01' }])
const H = handler
async function call(body, tok) {
  const r = await H(new Request('http://x/driver-compliance', { method: 'POST', headers: { 'Content-Type': 'application/json', 'user-agent': 'E2E', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify(body) }))
  return { status: r.status, text: await r.text() }
}
const srv = http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c); const raw = Buffer.concat(chunks)
  const u = new URL(req.url, 'http://x')
  try {
    if (u.pathname === '/fn') { const tok = String(req.headers.authorization || '').replace(/^Bearer\s+/, ''); const r = await call(JSON.parse(raw.toString() || '{}'), ['sam', 'kry', 'nobody'].includes(tok) ? tok : null); res.writeHead(r.status, { 'Content-Type': 'application/json' }); return res.end(r.text) }
    if (u.pathname === '/put') { STORE[u.searchParams.get('p')] = raw.length ? raw : Buffer.from('x'); res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"Key":"ok"}') }
    if (u.pathname === '/db') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ...DB, store: Object.keys(STORE) })) }
    res.writeHead(404); res.end()
  } catch (e) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: 'harness: ' + e.message })) }
})
srv.listen(0, '127.0.0.1', async () => {
  const s = await call({ action: 'setup', caregiver_id: '204' }, 'sam'); const j = JSON.parse(s.text)
  if (!j.ok) { console.log(JSON.stringify({ error: 'setup failed: ' + s.text })); process.exit(1) }
  const link = await LINKS.makeDriverLink(SECRET, j.row.id)
  console.log(JSON.stringify({ port: srv.address().port, key: j.row.id, link }))
})
void realFetch
