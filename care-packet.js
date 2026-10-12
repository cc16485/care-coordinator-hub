/* =====================================================================================================================
   CAREGIVER PACKET (Step 1, Samantha "yes start step 1", 2026-10-12). A card on the client profile's Care tab: short
   notes about the client plus how-to topics from the library (each with the videos she approved). When it is ready, the
   office makes each caregiver's OWN link and texts it themselves (Step 2 sends from here); the card shows who has
   tapped "I watched it and understand" for the current version. An edited packet is a new version and asks everyone
   again. Nothing here texts anyone. Health details live only behind the link, never in a text.
   CPK.mount(boxId). Needs: callAction (the Hub's door to a function), CP (the open client profile), DATA.caregivers.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = t => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(t) : String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  const S = { box: null, packet: null, topics: [], recipients: [], draft: null, msg: '', err: '', busy: false, link: null, loadErr: '' };
  const who = () => ({ ax: (window.CP && CP.ax) || '', lead_id: (window.CP && CP.lead && CP.lead.id) || '' });
  const firstName = () => {
    const l = window.CP && CP.lead;
    if (l && l.client_first_name && !l.client_name_not_provided) return String(l.client_first_name).trim();
    const r = window.CP && CP.r; return r && r.client_name ? String(r.client_name).trim().split(/\s+/)[0] : '';
  };
  const day = iso => { try { return new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' }); } catch (e) { return ''; } };
  async function call(body){
    const { status, data } = await callAction('care-packet', body);
    if (!data) throw new Error('The packet service answered ' + status);
    if (status >= 400) { const e = new Error(data.error || ('The packet service answered ' + status)); e.outcome = data.outcome; throw e; }
    return data;
  }
  function fresh(){
    const p = S.packet;
    S.draft = p ? { client_first: p.client_first, about: p.about, items: (p.items || []).map(x => ({ topic: x.topic, notes: x.notes })), ready: !!p.ready }
                : { client_first: firstName(), about: '', items: [], ready: false };
  }
  async function load(){
    S.loadErr = ''; S.link = null;
    try { const d = await call(Object.assign({ action: 'get' }, who())); S.packet = d.packet; S.topics = d.topics || []; S.recipients = d.recipients || []; fresh(); }
    catch (e) { S.loadErr = e.message; }
  }
  const dirty = () => { const p = S.packet; if (!p) return !!(S.draft.about || S.draft.items.length);
    return JSON.stringify([S.draft.client_first, S.draft.about, S.draft.items, S.draft.ready]) !== JSON.stringify([p.client_first, p.about, (p.items || []).map(x => ({ topic: x.topic, notes: x.notes })), !!p.ready]); };

  function render(){
    const box = S.box; if (!box) return;
    if (!who().ax && !who().lead_id) { box.innerHTML = ''; return; }
    let h = '<div class="card" style="padding:14px 18px;margin-bottom:12px;">'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><b style="font-size:15px;color:var(--navy);">🎬 Caregiver packet</b><span style="flex:1;"></span>'
      + (S.packet ? '<span class="field-note">' + (S.packet.ready ? 'Ready' : 'Draft') + ' · version ' + esc(S.packet.version) + '</span>' : '') + '</div>';
    if (S.loadErr) { box.innerHTML = h + '<div class="field-note" style="color:#B91C1C;">Could not load the packet: ' + esc(S.loadErr) + '</div></div>'; return; }
    const d = S.draft;
    h += '<div class="field-note" style="margin-bottom:8px;">Videos and short notes for the caregivers who work with this client. Each caregiver gets their own link and taps "I watched it and understand". Health details stay behind the link, never in a text.</div>'
      + '<label style="font-size:12.5px;font-weight:700;">Client\'s first name (as caregivers will see it)</label><input id="cpk_first" maxlength="40" value="' + esc(d.client_first) + '" style="max-width:240px;">'
      + '<label style="font-size:12.5px;font-weight:700;display:block;margin-top:8px;">About this client</label>'
      + '<textarea id="cpk_about" rows="4" maxlength="2000" placeholder="What a caregiver should know walking in: who to call, what matters most to them, safety notes.">' + esc(d.about) + '</textarea>'
      + '<div style="font-size:12.5px;font-weight:700;margin-top:10px;">How-to topics</div>';
    if (!S.topics.length) h += '<div class="field-note">The how-to library is empty. Samantha adds the approved topics and videos.</div>';
    S.topics.forEach(t => {
      const it = d.items.find(x => x.topic === t.key), n = (t.videos || []).length;
      h += '<div style="border-top:1px solid var(--border);padding:7px 0;">'
        + '<label style="display:flex;gap:8px;align-items:center;font-size:13.5px;cursor:pointer;"><input type="checkbox" data-cpk-topic="' + esc(t.key) + '"' + (it ? ' checked' : '') + '> <b>' + esc(t.title) + '</b>'
        + '<span class="field-note">' + n + ' video' + (n === 1 ? '' : 's') + '</span></label>'
        + (it ? '<textarea data-cpk-notes="' + esc(t.key) + '" rows="4" maxlength="2000" style="margin-top:6px;">' + esc(it.notes) + '</textarea>'
              + '<div class="field-note">Starts with the library\'s notes. Change them for this client.</div>' : '')
        + '</div>';
    });
    h += '<label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13.5px;cursor:pointer;"><input type="checkbox" id="cpk_ready"' + (d.ready ? ' checked' : '') + '> Ready for caregivers</label>'
      + (S.packet && S.packet.ready && S.recipients.length ? '<div class="field-note">Changing the words or topics makes a new version, and everyone confirms again.</div>' : '')
      + '<div style="display:flex;gap:8px;align-items:center;margin-top:8px;"><button id="cpk_save"' + (S.busy ? ' disabled' : '') + '>Save packet</button>'
      + (dirty() ? '<span class="field-note" style="color:#92400E;">changed, not saved</span>' : '')
      + (S.msg ? '<span class="field-note" style="color:#166534;">' + esc(S.msg) + '</span>' : '') + '</div>'
      + (S.err ? '<div class="field-note" style="color:#B91C1C;margin-top:6px;">' + esc(S.err) + '</div>' : '');
    if (S.packet && S.packet.ready) {
      const cgs = (window.DATA && DATA.caregivers || []).filter(c => c && c.axiscare_id && !c.inactive)
        .sort((a, b) => (String(a.first || '') + ' ' + (a.last || '')).localeCompare(String(b.first || '') + ' ' + (b.last || '')));
      h += '<div style="border-top:1px solid var(--border);margin-top:12px;padding-top:10px;"><b style="font-size:13.5px;color:var(--navy);">Caregivers</b>'
        + '<div style="display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap;"><select id="cpk_cg" style="max-width:280px;"><option value="">Pick a caregiver…</option>'
        + cgs.map(c => '<option value="' + esc(c.axiscare_id) + '">' + esc(((c.first || '') + ' ' + (c.last || '')).trim()) + '</option>').join('') + '</select>'
        + '<button class="secondary" id="cpk_link"' + (S.busy || dirty() ? ' disabled' : '') + '>Get their link</button></div>'
        + (dirty() ? '<div class="field-note">Save the packet first.</div>' : '')
        + (S.link ? '<div style="margin-top:8px;padding:9px 11px;border:1px solid var(--border);border-radius:10px;background:var(--bg);">'
            + '<div style="font-size:13px;"><b>' + esc(S.link.caregiver_first) + '\'s link</b> (just for them, works 90 days)</div>'
            + '<input id="cpk_linkbox" readonly value="' + esc(S.link.link) + '" style="margin-top:4px;font-size:12px;">'
            + '<button class="secondary" id="cpk_copy" style="margin-top:6px;">Copy text with link</button>'
            + '<div class="field-note">Copies: "Hi ' + esc(S.link.caregiver_first) + ', it\'s Caring Companions. Before you work with ' + esc(S.link.client_first) + ', please watch this short care packet and tap I understand: (link)". Text it from the office line.</div></div>' : '')
        + (S.recipients.length ? S.recipients.map(r => {
            const now = r.ack_version === S.packet.version;
            return '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;padding:6px 0;border-top:1px solid var(--border);font-size:13px;"><b>' + esc(r.caregiver_name) + '</b>'
              + (now ? '<span style="color:#166534;font-weight:700;">✓ understood ' + esc(day(r.ack_at)) + '</span>'
                 : r.ack_version ? '<span style="color:#92400E;font-weight:700;">confirmed an older version, not this one</span>'
                 : '<span style="color:#92400E;font-weight:700;">not confirmed yet</span>')
              + '<span class="field-note">link made ' + esc(day(r.link_made_at)) + '</span></div>'; }).join('')
          : '<div class="field-note" style="margin-top:6px;">No caregiver links yet.</div>')
        + '</div>';
    }
    box.innerHTML = h + '</div>';
    wire();
  }
  function wire(){
    const $ = id => document.getElementById(id);
    const keep = () => { const d = S.draft; d.client_first = ($('cpk_first') || {}).value || ''; d.about = ($('cpk_about') || {}).value || '';
      document.querySelectorAll('[data-cpk-notes]').forEach(el => { const it = d.items.find(x => x.topic === el.getAttribute('data-cpk-notes')); if (it) it.notes = el.value; });
      d.ready = !!($('cpk_ready') || {}).checked; };
    ['cpk_first', 'cpk_about'].forEach(id => { const el = $(id); if (el) el.oninput = () => { keep(); S.msg = ''; markDirty(); }; });
    document.querySelectorAll('[data-cpk-notes]').forEach(el => { el.oninput = () => { keep(); S.msg = ''; markDirty(); }; });
    const rd = $('cpk_ready'); if (rd) rd.onchange = () => { keep(); S.msg = ''; render(); };
    document.querySelectorAll('[data-cpk-topic]').forEach(el => { el.onchange = () => { keep(); const k = el.getAttribute('data-cpk-topic'), t = S.topics.find(x => x.key === k);
      if (el.checked) { if (!S.draft.items.find(x => x.topic === k)) S.draft.items.push({ topic: k, notes: (t && t.notes) || '' }); }
      else S.draft.items = S.draft.items.filter(x => x.topic !== k);
      S.msg = ''; render(); }; });
    const sv = $('cpk_save'); if (sv) sv.onclick = () => { keep(); save(); };
    const lk = $('cpk_link'); if (lk) lk.onclick = () => makeLink(($('cpk_cg') || {}).value || '');
    const cp = $('cpk_copy'); if (cp) cp.onclick = async () => {
      const t = 'Hi ' + S.link.caregiver_first + ', it\'s Caring Companions. Before you work with ' + S.link.client_first + ', please watch this short care packet and tap I understand: ' + S.link.link;
      try { await navigator.clipboard.writeText(t); cp.textContent = 'Copied ✓'; } catch (e) { const b = $('cpk_linkbox'); if (b) { b.value = t; b.select(); } cp.textContent = 'Press Cmd+C to copy'; } };
  }
  function markDirty(){ /* only the hint and the link button change while typing; the boxes keep focus */
    const sv = document.getElementById('cpk_save'); if (!sv) return;
    const hint = sv.parentNode.querySelector('.field-note[style*="92400E"]');
    if (dirty() && !hint) sv.insertAdjacentHTML('afterend', '<span class="field-note" style="color:#92400E;">changed, not saved</span>');
    const lk = document.getElementById('cpk_link'); if (lk) lk.disabled = S.busy || dirty();
  }
  async function save(){
    if (S.busy) return; S.busy = true; S.err = ''; S.msg = ''; render();
    try {
      const d = await call(Object.assign({ action: 'save', client_first: S.draft.client_first, about: S.draft.about, items: S.draft.items, ready: S.draft.ready, base_version: S.packet ? S.packet.version : null }, who()));
      S.packet = d.packet; S.recipients = d.recipients || []; fresh();
      S.msg = d.changed && S.recipients.length ? 'Saved as version ' + d.packet.version + '. Caregivers will be asked to confirm again.' : 'Saved.';
    } catch (e) { S.err = e.message; }
    S.busy = false; render();
  }
  async function makeLink(axId){
    if (!axId) { S.err = 'Pick a caregiver first.'; render(); return; }
    if (S.busy) return; S.busy = true; S.err = ''; S.link = null; render();
    try { const d = await call({ action: 'link', packet_id: S.packet.id, caregiver_axiscare_id: axId }); S.link = d; S.recipients = d.recipients || S.recipients; }
    catch (e) { S.err = e.message; }
    S.busy = false; render();
  }
  window.CPK = { mount: async function(id){ S.box = document.getElementById(id); if (!S.box) return; S.packet = null; S.msg = ''; S.err = ''; S.box.innerHTML = '<div class="field-note">Loading the caregiver packet…</div>'; await load(); render(); } };
})();
