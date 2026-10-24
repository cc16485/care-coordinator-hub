/* =============================================================================
   visit-reasons.js · WHAT EACH AXISCARE REASON MEANS (Samantha, 2026-10-24: "Build Cara reading the reasons by AxisCare id
   (the 6-reason plan), switch off, so we can rename and turn off reasons safely afterward.")
   Settings → Callout texts: AxisCare's reasons by id, what Cara does with each, and (owners) a way to change one. Changes
   are saved in ops_settings.visit_reason_meanings through tkMerge (recorded, who and when). The server (Staffing
   _shared/visit-reasons.ts) reads the same table; a renamed reason keeps its id, so its meaning follows it.
   Also the quiet "Cancelled today" line on Cara's Today (no card, nothing to close), once the switch is on.
   Switch: ops_settings.visit_reasons_live. Off: Settings shows what reading by id WOULD change (the watcher's last run).
   ============================================================================= */
(function () {
  'use strict';
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = () => (typeof DATA !== 'undefined' && DATA.ops_settings) || {};
  const live = () => st().visit_reasons_live === true;
  const owner = () => typeof CC_ROLES !== 'undefined' && Array.isArray(CC_ROLES) && CC_ROLES.includes('owner_admin');
  const WORDS = {
    call_off: 'Call-off case (finds coverage), on the caregiver\'s attendance', no_show: 'Call-off case, and a card to confirm the no-show',
    swap: 'Our change: never a call-off; an open-shift card if nobody is on it', couldnt_staff: 'Cancelled by us: no open shift, "call the family" card',
    client_cancelled: 'Cancelled by the client: no open shift, no texts', moved: 'A new day or time: an open-shift card if nobody is on it',
    office_fix: 'Fixing a mistake: an open-shift card if nobody is on it', records: 'Timekeeping or records only', family_app: 'Set by the Booking App',
    unknown: 'Not set yet: treated like "no reason" (visible, never a call-off)' };
  const CHOICES = ['call_off', 'no_show', 'swap', 'couldnt_staff', 'client_cancelled', 'moved', 'office_fix', 'records', 'family_app'];
  const S = { reasons: null, report: null, err: '', loading: false, open: false, msg: '' };
  async function load(force) {
    if (S.loading || (S.reasons && !force)) return; S.loading = true
    try {
      const { data: { session } } = await sb.auth.getSession()
      if (session && session.access_token) {
        const r = await fetch(CONFIG.supabase_url + '/functions/v1/visit-change', { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token, apikey: CONFIG.supabase_anon_key, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reasons' }) })
        const j = await r.json().catch(() => null)
        if (j && Array.isArray(j.reasons)) S.reasons = j.reasons; else S.err = (j && j.error) || ('The visit service answered ' + r.status)
      }
      const { data } = await sb.from('app_data').select('data').eq('key', 'visit_reason_practice').maybeSingle()
      S.report = (data && data.data) || null
    } catch (e) { S.err = String(e.message || e) }
    S.loading = false; render(); try { if (typeof renderCoverage === 'function' && live()) renderCoverage() } catch (e) {}
  }
  const meaningOf = (r) => { const o = (st().visit_reason_meanings || {})[String(r.id)]; return CHOICES.includes(o) ? o : (r.meaning || 'unknown') }
  function html() {
    if (!S.reasons && !S.err) { setTimeout(() => load(), 0); return '<div class="field-note">Reading AxisCare\'s reasons…</div>' }
    const rep = S.report, head = '<div style="margin:6px 0 14px;padding:12px 14px;border:1px solid var(--border);border-radius:10px;background:#F7F8FB;">'
      + '<b style="color:var(--navy);">What AxisCare reasons mean</b>'
      + '<div class="field-note" style="margin-top:3px;">' + (live()
        ? 'Cara reads every visit\'s reason by its AxisCare id, together with who is on the visit. Renaming a reason in AxisCare keeps its meaning.'
        : '<b>Practice.</b> The switch "Reasons by AxisCare id" is off, so Cara still matches words in the reason. This shows what reading by id would do.') + '</div>'
    if (S.err && !S.reasons) return head + '<div style="color:var(--red);font-size:13px;margin-top:6px;">' + E(S.err) + '</div></div>'
    const rows = (S.reasons || []).map((r) => { const m = meaningOf(r), changed = (st().visit_reason_meanings || {})[String(r.id)]
      return '<tr><td style="padding:4px 8px;color:var(--text-muted);">' + E(r.id) + '</td><td style="padding:4px 8px;font-weight:600;">' + E(r.name) + '</td><td style="padding:4px 8px;">'
        + (S.open && owner() ? '<select data-vr="' + E(r.id) + '" onchange="VR.set(this)" style="font-size:12.5px;max-width:300px;">' + CHOICES.map((c) => '<option value="' + c + '"' + (c === m ? ' selected' : '') + '>' + E(WORDS[c]) + '</option>').join('') + '</select>'
          : E(WORDS[m] || m) + (changed ? ' <span class="field-note">(changed)</span>' : '')) + '</td></tr>' }).join('')
    const table = '<div style="overflow-x:auto;margin-top:8px;"><table style="border-collapse:collapse;font-size:13px;min-width:520px;"><tr><th style="text-align:left;padding:4px 8px;">Id</th><th style="text-align:left;padding:4px 8px;">AxisCare reason</th><th style="text-align:left;padding:4px 8px;">What Cara does</th></tr>' + rows
      + '<tr><td></td><td style="padding:4px 8px;font-weight:600;">No reason</td><td style="padding:4px 8px;">An open-shift card if nobody is on it; never a call-off</td></tr></table></div>'
      + '<div class="field-note" style="margin-top:4px;">Whatever the reason says: a visit on "Canceled Shift" or deleted in AxisCare is cancelled (never a caregiver, a cover or a missed clock-in), and a visit with a real caregiver is happening.</div>'
    let rp = ''
    if (rep) {
      const list = (live() ? rep.acted : rep.would) || []
      rp = '<div style="margin-top:8px;font-size:13px;"><b>' + (live() ? 'What Cara did by id (last run):' : 'What reading by id would change (last run):') + '</b> '
        + (list.length ? '' : 'nothing different.') + '</div>'
        + (list.length ? '<ul style="margin:4px 0 0;padding-left:20px;font-size:12.5px;">' + list.slice(0, 12).map((w) => '<li>' + E(w.client || w.case || w.card || '') + (w.when ? ' ' + E(String(w.when).slice(5, 16).replace('T', ' ')) : '') + (w.reason ? ' · "' + E(w.reason) + '"' : '')
          + (w.before ? ': now ' + E(w.before) + ', by id ' : ': ') + E(w.by_id || w.attendance || '') + '</li>').join('') + '</ul>' : '')
        + (rep.error ? '<div class="field-note" style="color:var(--red);">' + E(rep.error) + '</div>' : '')
    }
    const btn = owner() ? '<button type="button" class="ghost" style="margin-top:8px;font-size:12.5px;padding:3px 10px;" onclick="VR.toggle()">' + (S.open ? 'Done' : 'Change a meaning') + '</button>' : ''
    return head + table + rp + btn + (S.msg ? '<div style="margin-top:4px;font-size:13px;font-weight:600;color:var(--navy);">' + E(S.msg) + '</div>' : '') + '</div>'
  }
  function render() { const h = document.getElementById('vrHost'); if (h) h.innerHTML = html() }
  async function set(sel) {
    const id = sel.getAttribute('data-vr'), m = sel.value, r = (S.reasons || []).find((x) => String(x.id) === String(id))
    if (!r || !CHOICES.includes(m) || typeof tkMerge !== 'function') return
    const res = await tkMerge((o) => { o.visit_reason_meanings = Object.assign({}, o.visit_reason_meanings || {}, { [String(id)]: m }); return ['set "' + r.name + '" (AxisCare ' + id + ') to: ' + WORDS[m]] }, 'what AxisCare reasons mean')
    S.msg = res && res.error ? 'Not saved: ' + (res.error.message || res.error) : 'Saved.'; render()
  }
  function toggle() { S.open = !S.open; S.msg = ''; render() }
  /* Cara's Today: one quiet line, only once the switch is on */
  function todayLine() {
    const rep = S.report; if (!live()) return ''
    if (!rep) { setTimeout(() => load(), 0); return '' }
    const today = new Date().toLocaleString('sv-SE', { timeZone: 'America/Chicago' }).slice(0, 10)
    const list = rep.cancelled_day === today ? (rep.cancelled_today || []) : []
    if (!list.length) return ''
    const t12 = (hm) => { const m = /^(\d\d):(\d\d)/.exec(String(hm || '')); if (!m) return hm || ''; const h = +m[1]; return (h % 12 || 12) + (m[2] === '00' ? '' : ':' + m[2]) + (h >= 12 ? 'pm' : 'am') }
    return '<div class="field-note" style="margin-top:10px;font-size:12.5px;">Cancelled today: ' + list.map((x) => E(x.client) + ' ' + E(t12(x.start)) + (x.by === 'us' ? ' (we couldn\'t staff)' : '')).join(', ') + '. No action needed unless one of these still needs care.</div>'
  }
  window.VR = { render, load, set, toggle, todayLine, live }
})();
