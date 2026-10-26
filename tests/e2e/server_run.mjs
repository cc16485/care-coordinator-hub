// End-to-end helper (Community Ambassadors, 2026-10-26): runs the REAL lead-intake from a Staffing-Coordinator-Hub checkout
// against a fake database and fake GoHighLevel. node server_run.mjs <staffing_dir> <in.json> → prints {status, answers, app_data, sent}
// in.json: { app_data: {key: [...]}, posts: [body, ...] }
import fs from 'fs'; import path from 'path'
const [, , DIR, IN] = process.argv
const input = JSON.parse(fs.readFileSync(IN, 'utf8'))
const clone = (x) => JSON.parse(JSON.stringify(x))
const T = { app_data: Object.entries(input.app_data || {}).map(([key, data]) => ({ key, data: clone(data) })),
  staff_roles: [{ person_id: 'p-sam', entity: 'cc_ihs', role: 'owner_admin' }], persons: [{ person_id: 'p-sam', primary_email: 'samantha@mo-care.com', active: true }], applicant_alerts: [] }
for (const k of ['leads', 'referral_orgs', 'ops_items']) if (!T.app_data.find((r) => r.key === k)) T.app_data.push({ key: k, data: [] })
T.app_data.push({ key: 'ops_settings', data: { inquiry_ack_live: false } })
const SENT = []
function q(t) {
  const st = { f: [], op: 'select', row: null, single: false }
  const run = () => { const rows = (T[t] || []).filter((r) => st.f.every(([k, v]) => String(r[k]) === String(v)))
    if (st.op !== 'select') return { data: st.single ? st.row : [st.row], error: null }
    return { data: st.single ? (rows[0] ? clone(rows[0]) : null) : clone(rows), error: null } }
  const b = new Proxy({}, { get: (_, k) => {
    if (k === 'then') return (ok, ko) => Promise.resolve(run()).then(ok, ko)
    if (k === 'eq') return (a, v) => { st.f.push([a, v]); return b }
    if (k === 'insert' || k === 'upsert' || k === 'update') return (r) => { st.op = k; st.row = r; return b }
    if (k === 'single' || k === 'maybeSingle') return () => { st.single = true; return Promise.resolve(run()) }
    return () => b } })
  return b
}
globalThis.__db = { from: q, rpc: async (fn, a) => { if (fn === 'upsert_app_data_item') { const row = T.app_data.find((r) => r.key === a.target_key) || (T.app_data.push({ key: a.target_key, data: [] }), T.app_data.at(-1)); const i = row.data.findIndex((x) => x.id === a.item.id); if (i >= 0) row.data[i] = clone(a.item); else row.data.push(clone(a.item)) } return { data: null, error: null } } }
globalThis.fetch = async (url, o = {}) => { url = String(url); const body = o.body ? JSON.parse(o.body) : {}
  if (/axiscare\.com\/api\/clients/.test(url)) return new Response(JSON.stringify({ results: { clients: [], nextPage: null } }), { status: 200 })
  if (/conversations\/messages/.test(url)) { SENT.push(body); return new Response(JSON.stringify({ messageId: 'm1' }), { status: 200 }) }
  if (/\/contacts\/[^/?]+$/.test(url) && (!o.method || o.method === 'GET')) return new Response(JSON.stringify({ contact: { id: 'c', dnd: false } }), { status: 200 })
  return new Response(JSON.stringify({ contacts: [{ id: 'c-' + (body.email || body.phone || 'x'), dnd: false }], contact: { id: 'c-x' } }), { status: 200 }) }
const ENV = { SUPABASE_URL: 'http://x', SUPABASE_SERVICE_ROLE_KEY: 'k', LEAD_INTAKE_TOKEN: 'tok', GHL_TOKEN: 'g', GHL_LOCATION_ID: 'loc', AXISCARE_TOKEN: 'ax', AXISCARE_SITE: '16485' }
let handler; globalThis.Deno = { env: { get: (k) => ENV[k] }, serve: (h) => { handler = h } }
const F = path.join(DIR, 'supabase/functions'), tmp = fs.mkdtempSync(path.join(DIR, '_e2e_'))
try {
  const src = fs.readFileSync(path.join(F, 'lead-intake/index.ts'), 'utf8').replace(/^import \{ createClient \} from .*$/m, 'const createClient = () => globalThis.__db')
    .replace(/from '\.\.\/_shared\/([\w-]+)\.ts'/g, (_, m) => "from '" + path.join(F, '_shared', m + '.ts') + "'")
  fs.writeFileSync(path.join(tmp, 'li.ts'), src); await import(path.join(tmp, 'li.ts'))
  const answers = []
  for (const body of input.posts || []) { const r = await handler(new Request('http://x/lead-intake?token=tok', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })); answers.push({ s: r.status, j: await r.json() }) }
  console.log(JSON.stringify({ answers, app_data: Object.fromEntries(T.app_data.map((r) => [r.key, r.data])), sent: SENT.map((m) => ({ subject: m.subject, to: m.contactId })) }))
} finally { fs.rmSync(tmp, { recursive: true, force: true }) }
