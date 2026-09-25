// ghl-attach-doc — file a pre-hire background-check document onto a GoHighLevel
// contact. Uploads the file into GHL's media library (so the file itself lives
// in GHL) and adds a note to the contact linking it. Gated by the hub read key;
// the GHL token stays server-side. Never sends the contact a message.
//
// Body: { key, first, last, email, phone, contact_id?, label, file_url?, file_name?, probe? }
//   file_url = a fetchable (signed) URL to the document in Supabase Storage.
//   probe    = true → don't need a file; uploads a tiny test blob to measure
//              what the GHL token is actually allowed to do.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

const GHL = 'https://services.leadconnectorhq.com'
const V = '2021-07-28'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const { key, first, last, email, phone, contact_id, label, file_url, file_name, probe } = body as Record<string, string | boolean | undefined>

  if (!key) return json({ error: 'missing key' }, 400)
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'hub_read_key').maybeSingle()
  if (!setting || key !== (setting.value as { key?: string })?.key) return json({ error: 'unauthorized' }, 401)

  const token = Deno.env.get('GHL_TOKEN')
  const loc = Deno.env.get('GHL_LOCATION_ID')
  if (!token || !loc) return json({ error: 'GHL not configured' })
  const H: Record<string, string> = { Authorization: `Bearer ${token}`, Version: V, Accept: 'application/json' }

  const out: Record<string, unknown> = {}

  // 1) resolve the GHL contact (upsert by email/phone unless an id was given)
  let contactId = contact_id as string | undefined
  if (!contactId) {
    try {
      const up = await fetch(`${GHL}/contacts/upsert`, {
        method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: loc, email: email || undefined, phone: phone || undefined, firstName: first || undefined, lastName: last || undefined }),
      })
      const ud = await up.json().catch(() => null)
      out.contactUpsert = { ok: up.ok, status: up.status, detail: up.ok ? undefined : ud }
      contactId = ud?.contact?.id || ud?.id
    } catch (e) { out.contactUpsert = { ok: false, error: String((e as Error).message || e) } }
  }
  if (!contactId) return json({ ok: false, step: 'contact', ...out }, 502)
  out.contactId = contactId

  // 2) upload the file into GHL's media library
  let mediaUrl: string | undefined
  try {
    let blob: Blob, fname: string
    if (probe) { blob = new Blob([`ghl-attach-doc probe ${new Date().toISOString()}`], { type: 'text/plain' }); fname = 'probe.txt' }
    else if (file_url) { const fr = await fetch(String(file_url)); if (!fr.ok) throw new Error('file fetch ' + fr.status); blob = await fr.blob(); fname = String(file_name || 'document.pdf') }
    else throw new Error('no file_url')
    const fd = new FormData()
    fd.append('file', blob, fname)
    fd.append('hosted', 'false')
    const mr = await fetch(`${GHL}/medias/upload-file`, { method: 'POST', headers: { ...H }, body: fd })
    const md = await mr.json().catch(() => null)
    out.mediaUpload = { ok: mr.ok, status: mr.status, detail: md }
    if (mr.ok) mediaUrl = md?.url || md?.fileUrl
  } catch (e) { out.mediaUpload = { ok: false, error: String((e as Error).message || e) } }

  // 3) add a note to the contact referencing the document (GHL media url if we
  //    got one, else the passed-in link)
  const link = mediaUrl || (file_url as string) || ''
  const noteBody = `Pre-hire background check — ${String(label || 'document')} filed ${new Date().toISOString().slice(0, 10)}${link ? ('\n' + link) : ''}`
  try {
    const nr = await fetch(`${GHL}/contacts/${contactId}/notes`, {
      method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: noteBody }),
    })
    const nd = await nr.json().catch(() => null)
    out.note = { ok: nr.ok, status: nr.status, detail: nr.ok ? undefined : nd }
  } catch (e) { out.note = { ok: false, error: String((e as Error).message || e) } }

  const anyOk = !!mediaUrl || (out.note as { ok?: boolean })?.ok
  return json({ ok: anyOk, mediaUrl, ...out })
})
