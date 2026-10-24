/* =============================================================================
   SHIFT PAGE LINK PILOT (Samantha, 2026-10-24: "test the complete experience with a few selected caregivers, including a
   PRN caregiver, before links go out to everyone"). Settings → Callout texts: owners pick up to 6 caregivers. Their shift
   texts carry their own shift page link, and their link opens, while the "Shift page link in texts" switch
   (ops_settings.shift_link_texts_live) and the shift page switch stay OFF for everyone else. Saved in
   ops_settings.shift_link_pilot as [{ axiscare_id, name }] through tkMerge (recorded, who and when). The server reads the
   same list (Staffing _shared/shift-link-texts.ts, shift-offer).
   ============================================================================= */
(function () {
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MAX = 6;
  const st = () => (typeof DATA !== 'undefined' && DATA.ops_settings) || {};
  const owner = () => typeof CC_ROLES !== 'undefined' && Array.isArray(CC_ROLES) && CC_ROLES.includes('owner_admin');
  const pilot = () => (Array.isArray(st().shift_link_pilot) ? st().shift_link_pilot : []).filter((p) => p && p.axiscare_id);
  const live = () => st().shift_link_texts_live === true;
  let open = false, msg = '';
  const nameOf = (g) => [g.first, g.last].filter(Boolean).join(' ').trim() || g.name || '';
  const roster = () => ((typeof DATA !== 'undefined' && DATA.caregivers) || []).filter((g) => g && g.axiscare_id && g.active !== false && nameOf(g)).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));

  function html() {
    const p = pilot();
    const head = '<div style="margin:6px 0 14px;padding:12px 14px;border:1px solid var(--border);border-radius:10px;background:#F7FBFB;">'
      + '<b style="color:var(--navy);">Shift page link: pilot caregivers</b>'
      + '<div class="field-note" style="margin-top:3px;">' + (live()
        ? 'The "Shift page link in texts" switch is on: every caregiver\'s shift text has their own link. This list no longer matters.'
        : 'The link is off for everyone. These caregivers (up to ' + MAX + ') get their own shift page link in shift texts, and it opens for them, so you can try the whole thing before turning it on. Everyone else gets today\'s texts.') + '</div>'
      + '<div style="margin-top:6px;font-size:13.5px;">' + (p.length ? p.map((x) => '<span style="display:inline-flex;gap:6px;align-items:center;margin:2px 8px 2px 0;padding:2px 10px;border-radius:999px;background:#E3F3F1;">' + E(x.name || x.axiscare_id)
        + (open && owner() ? ' <a href="javascript:void(0)" onclick="SLP.remove(\'' + E(x.axiscare_id) + '\')" title="Take them off the pilot" style="color:var(--red);text-decoration:none;">✕</a>' : '') + '</span>').join('') : '<span class="field-note">Nobody yet.</span>') + '</div>';
    if (!owner()) return head + '<div class="field-note" style="margin-top:6px;">Owners choose the pilot caregivers.</div></div>';
    if (!open) return head + '<button type="button" class="ghost" style="margin-top:6px;font-size:12.5px;padding:3px 10px;" onclick="SLP.toggle()">Choose pilot caregivers</button></div>';
    const have = new Set(p.map((x) => String(x.axiscare_id)));
    const opts = roster().filter((g) => !have.has(String(g.axiscare_id))).map((g) => '<option value="' + E(g.axiscare_id) + '">' + E(nameOf(g)) + '</option>').join('');
    return head + '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">'
      + '<select id="slpPick" style="max-width:260px;"' + (p.length >= MAX ? ' disabled' : '') + '><option value="">Add a caregiver…</option>' + opts + '</select>'
      + '<button type="button" class="ghost" style="font-size:12.5px;padding:3px 10px;" onclick="SLP.add()"' + (p.length >= MAX ? ' disabled' : '') + '>Add</button>'
      + '<button type="button" class="ghost" style="font-size:12.5px;padding:3px 10px;" onclick="SLP.toggle()">Done</button></div>'
      + '<div class="field-note" style="margin-top:4px;">Include at least one PRN Team member. Nothing is texted from here; they get the link the next time they are asked about a shift.</div>'
      + (msg ? '<div style="margin-top:4px;font-size:13px;font-weight:600;color:var(--navy);">' + E(msg) + '</div>' : '') + '</div>';
  }
  function render() { const h = document.getElementById('slpHost'); if (h) h.innerHTML = html(); }
  async function save(list, what) {
    if (typeof tkMerge !== 'function') { msg = 'Saving is not available here.'; return render(); }
    const r = await tkMerge((m) => { m.shift_link_pilot = list; return [what]; }, 'shift page link pilot');
    msg = r && r.error ? 'Not saved: ' + (r.error.message || r.error) : 'Saved.';
    render();
  }
  function add() {
    const sel = document.getElementById('slpPick'); const id = sel && sel.value; if (!id) return;
    const g = roster().find((x) => String(x.axiscare_id) === String(id)); if (!g) return;
    const list = pilot().concat([{ axiscare_id: String(g.axiscare_id), name: nameOf(g) }]).slice(0, MAX);
    return save(list, 'added ' + nameOf(g) + ' to the shift page link pilot');
  }
  function remove(id) {
    const x = pilot().find((p) => String(p.axiscare_id) === String(id));
    return save(pilot().filter((p) => String(p.axiscare_id) !== String(id)), 'took ' + ((x && x.name) || id) + ' off the shift page link pilot');
  }
  function toggle() { open = !open; msg = ''; render(); }
  /* For other screens: does this caregiver get a link in their text now? */
  const linkFor = (axId) => live() || pilot().some((p) => String(p.axiscare_id) === String(axId));
  window.SLP = { render, add, remove, toggle, linkFor, pilot, live };
})();
