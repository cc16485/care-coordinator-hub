/* =============================================================================
   LIFE STORY (Samantha, 2026-10-24: "I want every caregiver to learn a little about the person they're caring for, not just
   their care needs"; plan https://claude.ai/artifact/5DXNbwo9K4JzfuvuW3J1hc, step 1). Three short, conversational questions,
   asked once and carried forward, so families aren't asked again:
     1. What did they do for work, or what have they enjoyed doing throughout their life?
     2. What do they enjoy talking about or doing?
     3. What are some little things that make their day better?
   The same small card in three places: the intake (under "The person who needs care"), the assessment form, and the
   client's Home & Life tab. Each answer keeps who typed it, when, and where (intake call, assessment, profile).
   Stored on the client's profile (DATA.client_profiles, id cp_ax<AxisCare id>) once they're an AxisCare client, on the
   lead before that. Reading: the profile's answer, else the lead's (carried over). Office-only: caregivers never see this;
   the Caregiver Preview introduction is drafted from it later and approved separately.
   Switch: ops_settings.life_story_live. Off (practice): only owners see the card, marked practice.
   ============================================================================= */
(function () {
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const Q = [
    { k: 'work', q: 'What did they do for work, or what have they enjoyed doing throughout their life?', ph: 'For example: taught third grade for 30 years; loves her rose garden' },
    { k: 'enjoys', q: 'What do they enjoy talking about or doing?', ph: 'For example: her grandkids, old movies, the Cardinals' },
    { k: 'little', q: 'What are some little things that make their day better?', ph: 'For example: coffee and a cookie in the afternoon; the blinds open' },
  ];
  const MAX = 500;
  const VIA = { intake: 'intake call', assessment: 'assessment', home: 'profile' };
  const st = () => (typeof DATA !== 'undefined' && DATA && DATA.ops_settings) || {};
  const live = () => st().life_story_live === true;
  const owner = () => typeof CC_ROLES !== 'undefined' && Array.isArray(CC_ROLES) && CC_ROLES.includes('owner_admin');
  const visible = () => live() || owner();
  const who = () => (typeof ME !== 'undefined' && ME && (ME.name || ME.email)) || '';
  const ctxs = {};
  const profId = (ax) => 'cp_ax' + String(ax);
  const profileOf = (ax) => (ax && (DATA.client_profiles || []).find((p) => p && p.id === profId(ax))) || null;
  const leadOf = (c) => (c.lead && c.lead.id && (DATA.leads || []).find((l) => l && l.id === c.lead.id)) || c.lead || null;
  const day = (iso) => { try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch (e) { return ''; } };

  /* the answers for a client: the profile's, else the lead's (carried over) */
  function get(c) {
    const pl = (profileOf(c.ax) || {}).life || {}, ll = (leadOf(c) || {}).life || {};
    const out = {};
    for (const x of Q) {
      const p = pl[x.k], l = ll[x.k];
      out[x.k] = p && String(p.text || '').trim() ? { ...p, carried: false } : l && String(l.text || '').trim() ? { ...l, carried: !!c.ax } : null;
    }
    return out;
  }
  const filled = (c) => { const g = get(c); return Q.filter((x) => g[x.k]).length; };

  /* the card. where: 'intake' | 'assessment' | 'home<px>' (Home & Life saves with its own Save button) */
  function html(c, where) {
    if (!visible()) return '';
    ctxs[where] = { ax: c.ax ? String(c.ax) : '', lead: c.lead || null, name: c.name || '' };
    const g = get(ctxs[where]), first = String(c.name || '').trim().split(/\s+/)[0] || 'them';
    const home = where.indexOf('home') === 0;
    const id = (k) => 'ls_' + where.replace(/[^\w]/g, '') + '_' + k;
    return '<div class="ls-card" style="margin:10px 0;padding:12px 14px;border:1px solid var(--border);border-radius:12px;background:#FBFDFC;">'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline;"><b style="color:var(--navy);font-size:14.5px;">Getting to know ' + E(first) + '</b>'
      + '<span class="field-note">3 short questions · optional · ask them like a conversation</span></div>'
      + (live() ? '' : '<div class="field-note" style="margin-top:4px;color:#92400E;"><b>Practice.</b> Only owners see this until the Life Story switch is on.</div>')
      + Q.map((x) => {
        const a = g[x.k];
        const src = a ? (a.via === 'profile' ? 'Added on the profile' : 'From the ' + (a.via || 'intake call')) : ''
        const prov = a ? E(src) + (a.by ? ' · ' + E(String(a.by).split(' ')[0]) : '') + (a.at ? ', ' + E(day(a.at)) : '') : '';
        return '<label for="' + id(x.k) + '" style="display:block;margin:10px 0 3px;font-size:13px;font-weight:600;">' + E(x.q) + '</label>'
          + '<textarea id="' + id(x.k) + '" rows="2" maxlength="' + MAX + '" style="width:100%;font-size:13.5px;" placeholder="' + E(x.ph) + '">' + E(a ? a.text : '') + '</textarea>'
          + (prov ? '<div class="field-note" style="font-size:11.5px;">' + prov + '</div>' : '');
      }).join('')
      + (home ? '<div class="field-note" style="margin-top:6px;">Saved with "Save home &amp; life" below. Office only; caregivers see only the approved Caregiver Preview.</div>'
        : '<div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;"><button type="button" class="secondary" style="font-size:12.5px;padding:4px 12px;" onclick="LSTORY.save(\'' + E(where) + '\')">Save these answers</button>'
          + '<span class="field-note" id="' + id('msg') + '">Office only. They carry forward to the assessment and the client profile.</span></div>')
      + '</div>';
  }
  function mount(hostId, c, where) { const h = document.getElementById(hostId); if (h) h.innerHTML = html(c, where); }

  /* read the card's boxes into a life object (only what changed gets a new who/when) */
  function readForm(where, prevLife) {
    const c = ctxs[where]; if (!c) return null;
    const g = get(c), now = new Date().toISOString(), life = { ...(prevLife || {}) };
    const id = (k) => 'ls_' + where.replace(/[^\w]/g, '') + '_' + k;
    let changed = 0;
    for (const x of Q) {
      const el = document.getElementById(id(x.k)); if (!el) continue;
      const v = String(el.value || '').replace(/\s+/g, ' ').trim().slice(0, MAX);
      const was = g[x.k] ? String(g[x.k].text || '') : '';
      if (v === was && !(g[x.k] && g[x.k].carried && v)) continue;   /* unchanged (a carried answer is copied onto the profile) */
      if (v === was && g[x.k] && g[x.k].carried) { life[x.k] = { text: v, by: g[x.k].by || '', at: g[x.k].at || now, via: g[x.k].via || 'intake call' }; continue; }
      if (!v) { delete life[x.k]; changed++; continue; }
      life[x.k] = { text: v, by: who(), at: now, via: VIA[where.indexOf('home') === 0 ? 'home' : where] || 'profile' }; changed++;
    }
    return { life, changed };
  }
  /* Home & Life: cl360SaveProfile calls this to fold the answers into the profile it saves */
  function applyToProfile(item, where) { const r = readForm(where, item.life); if (r) item.life = r.life; return item; }

  /* intake and assessment: their own Save button. With an AxisCare client: the profile; before that: the lead. */
  async function save(where) {
    const c = ctxs[where]; if (!c) return;
    const msg = document.getElementById('ls_' + where.replace(/[^\w]/g, '') + '_msg');
    try {
      if (c.ax) {
        const prev = profileOf(c.ax) || { id: profId(c.ax), axiscare_client_id: c.ax, client_name: c.name || '' };
        const r = readForm(where, prev.life); if (!r) return;
        const item = { ...prev, life: r.life, updated_at: new Date().toISOString(), updated_by: who() };
        DATA.client_profiles = (DATA.client_profiles || []).filter((p) => p.id !== item.id).concat([item]);
        await persist('client_profiles', item);
      } else {
        const l = leadOf(c); if (!l) { if (msg) msg.textContent = 'No client or inquiry to save these to.'; return; }
        const r = readForm(where, l.life); if (!r) return;
        l.life = r.life;
        await persist('leads', l);
      }
      if (typeof opEvent === 'function') opEvent('life_story_saved', { item_id: c.ax ? profId(c.ax) : (c.lead && c.lead.id) || '', area: 'clients', summary: who() + ' saved Life Story answers for ' + (c.name || 'a client') + ' (' + (VIA[where] || where) + ')' });
      if (msg) { msg.textContent = 'Saved.'; setTimeout(() => { if (msg) msg.textContent = 'Office only. They carry forward to the assessment and the client profile.'; }, 2500); }
    } catch (e) { if (msg) msg.textContent = 'Not saved: ' + (e && e.message || e); }
  }

  window.LSTORY = { Q, get, filled, html, mount, save, applyToProfile, visible, live };
})();
