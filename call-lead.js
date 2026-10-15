/* =====================================================================================================================
   MAKE THIS A LEAD (Samantha 2026-10-14). "our number and phone transcripts need to be used to fill lead and have us
   easily mark call as a lead and based on the transcript fill the lead info". Her decision on the mockup: the AI only
   TAGS likely new families; a person decides.
     · Every answered call on the Calls tab and on Call Follow Ups gets "Make this a lead" (or "Open lead" once it is one).
     · The call reader's "new client inquiry" shows as "Sounds like a new family", with "Not a lead" beside it.
     · Make this a lead asks call-to-lead to read the call, then opens the REGULAR lead form already filled in. Every box
       filled from the call is yellow until someone touches it. Saving is the usual save (same-family check included);
       the call is kept on the lead (from_calls) and the GoHighLevel contact is tagged "lead". A failed tag says so.
     · If the same-family check finds their open lead, the call is added to that lead instead.
   Nothing here sends anything to anyone. "Not a lead" is kept in app_data call_lead_marks (who, when; Undo).
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const DAYS = 14;
  const CL = { readings: {}, at: 0, busy: null, pending: null, working: {} };
  const me = () => (typeof ME !== 'undefined' && ME && (ME.name || ME.email)) || '';
  const say = m => { if(typeof ccToast === 'function') ccToast(m); else alert(m); };
  const okId = id => /^[A-Za-z0-9_-]{6,64}$/.test(String(id || ''));
  const CLOSED = /^(converted|lost|closed|not a fit|spam)/i;

  /** The call reader's newest reading per call (only what the buttons need). Best effort: no reading, no tag. */
  async function load(force){
    if(CL.busy) return CL.busy;
    if(!force && CL.at && Date.now() - CL.at < 120000) return CL.readings;
    CL.busy = (async () => {
      try{
        const since = new Date(Date.now() - DAYS * 864e5).toISOString();
        const { data, error } = await sb.from('call_task_reading').select('message_id, call_type, lead_id, read_at, detail').eq('channel', 'call').gte('call_at', since).order('read_at', { ascending: false }).limit(800);
        if(!error){ const m = {}; for(const r of data || []) if(!m[r.message_id]) m[r.message_id] = { type: r.call_type, lead_id: r.lead_id, summary: (r.detail && r.detail.summary) || '' }; CL.readings = m; }
      }catch(e){ /* no tags; the buttons still work */ }
      CL.at = Date.now(); CL.busy = null; return CL.readings;
    })();
    return CL.busy;
  }

  const leads = () => (typeof DATA !== 'undefined' && Array.isArray(DATA.leads)) ? DATA.leads : [];
  const marks = () => (typeof DATA !== 'undefined' && Array.isArray(DATA.call_lead_marks)) ? DATA.call_lead_marks : [];
  /** The lead this call was saved on, else the caller's own open lead (from the call reader's match). */
  function leadFor(id){
    const saved = leads().find(l => l && !l.archived && Array.isArray(l.from_calls) && l.from_calls.some(x => x && x.message_id === id));
    if(saved) return saved;
    const r = CL.readings[id];
    if(r && r.lead_id){ const l = leads().find(x => x && String(x.id) === String(r.lead_id)); if(l && !l.archived && !CLOSED.test(String(l.status || ''))) return l; }
    return null;
  }
  const notLead = id => marks().find(m => m && m.id === id && m.verdict === 'not') || null;
  const likely = id => (CL.readings[id] || {}).type === 'new_client_inquiry';
  const leadName = l => [l.first_name, l.last_name].filter(Boolean).join(' ') || [l.client_first_name, l.client_last_name].filter(Boolean).join(' ') || 'their lead';

  /** The buttons for one call. compact = the Calls tab row. */
  function bar(id, opts){
    opts = opts || {};
    if(!okId(id)) return '';
    const l = leadFor(id), nl = notLead(id), busy = CL.working[id];
    const btn = (label, js, primary) => '<button class="' + (primary ? 'primary' : 'ghost') + '" style="font-size:12px;padding:4px 10px;" onclick="' + js + '">' + esc(label) + '</button>';
    if(l) return '<span class="field-note">Lead: <b>' + esc(leadName(l)) + '</b></span> ' + btn('Open lead', 'CallLead.openLead(\'' + esc(l.id) + '\')', false);
    if(busy) return '<span class="field-note">Reading the call…</span>';
    if(nl) return '<span class="field-note">Not a lead (' + esc(String(nl.by || '').split(' ')[0] || 'someone') + ') · <a href="#" onclick="CallLead.undoNot(\'' + esc(id) + '\');return false;">Undo</a></span>';
    const tag = likely(id) ? '<span class="tag-chip" style="background:#E6EEF7;color:#0D365F;font-weight:700;">Sounds like a new family</span> ' : '';
    return tag + btn('Make this a lead', 'CallLead.make(\'' + esc(id) + '\',this)', likely(id))
      + (likely(id) ? ' ' + btn('Not a lead', 'CallLead.markNot(\'' + esc(id) + '\')', false) : '');
  }
  /** Calls tab: a second line under an answered call (summary from the call reader + the buttons). */
  function callRow(c){
    if(!c || !c.duration || !okId(c.id)) return '';
    const s = (CL.readings[c.id] || {}).summary;
    return '<div class="cl-row" data-call="' + esc(c.id) + '" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0 0 22px;">'
      + (s ? '<span style="font-size:12.5px;flex:1 1 260px;min-width:0;">' + esc(s.length > 220 ? s.slice(0, 217) + '…' : s) + '</span>' : '<span style="flex:1;"></span>')
      + bar(c.id, { compact: true }) + '</div>';
  }
  /** A Call Follow Ups row is itself a reading: it tags the call without another read. */
  function seed(r){ if(r && okId(r.message_id) && !CL.readings[r.message_id]) CL.readings[r.message_id] = { type: r.call_type, lead_id: r.lead_id, summary: (r.detail && r.detail.summary) || '' }; }
  /** Call Follow Ups: the bar on one call card. */
  function cardBar(r){
    if(!r || (r.channel || 'call') !== 'call' || !okId(r.message_id)) return '';
    seed(r);
    return '<div class="cl-row" data-call="' + esc(r.message_id) + '" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;">' + bar(r.message_id) + '</div>';
  }
  /** Call Follow Ups, top: likely new families nobody has decided on yet (never lost quietly). */
  function waitingHtml(rows){
    (rows || []).forEach(seed);
    const w = (rows || []).filter(r => (r.channel || 'call') === 'call' && r.call_type === 'new_client_inquiry' && okId(r.message_id) && !leadFor(r.message_id) && !notLead(r.message_id));
    if(!w.length) return '';
    return '<div class="card" style="padding:12px 14px;margin-bottom:10px;border:1.5px solid #B9CDE4;background:#F4F8FC;">'
      + '<div style="font-size:11.5px;font-weight:800;letter-spacing:.06em;color:var(--navy);">SOUNDS LIKE A NEW FAMILY, NOT A LEAD YET (' + w.length + ')</div>'
      + '<div class="field-note" style="margin:2px 0 6px;">The AI only tags these. Make each one a lead, or mark it not a lead.</div>'
      + w.map(r => '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:6px 0;border-top:1px solid var(--border);">'
        + '<b style="color:var(--navy);min-width:130px;">' + esc(r.who_name || r.caller || 'Unknown caller') + '</b>'
        + '<span style="font-size:12.5px;flex:1 1 240px;min-width:0;">' + esc(((r.detail || {}).summary || '').slice(0, 200)) + '</span>'
        + '<span class="cl-row" data-call="' + esc(r.message_id) + '">' + bar(r.message_id) + '</span></div>').join('') + '</div>';
  }

  function repaint(){
    try{ if(typeof callsPaint === 'function' && document.getElementById('callsList')) callsPaint(); }catch(e){}
    try{ if(window.CPR && typeof activeTab !== 'undefined' && activeTab === 'callfollowups'){ const w = document.getElementById('cfuWrap'); if(w) CPR.render(w); } }catch(e){}
  }

  async function staffCall(body){
    const sess = await sb.auth.getSession(), tok = sess && sess.data && sess.data.session && sess.data.session.access_token;
    if(!tok) throw new Error('Sign in first.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/call-to-lead', { method: 'POST',
      headers: { Authorization: 'Bearer ' + tok, apikey: CONFIG.supabase_anon_key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => null);
    if(!r.ok || !d) throw new Error((d && d.error) || ('The call-to-lead service answered ' + r.status));
    return d;
  }

  /* ---------- the form ---------- */
  const fieldOf = k => (typeof LEAD_FIELDS !== 'undefined' ? LEAD_FIELDS : []).find(f => f[0] === k);
  function clearForm(){
    document.querySelectorAll('#leadModalBackdrop .cl-heard').forEach(el => el.classList.remove('cl-heard'));
    const b = document.getElementById('clBanner'); if(b) b.remove();
    CL.pending = null;
  }
  /** Yellow on what was heard: a typed box itself, or the ticked choices of a grid / radio group. */
  function markHeard(k){
    const f = fieldOf(k); if(!f) return;
    const box = f[1];
    if(f[2] === 'checks'){ document.querySelectorAll('#' + box + ' input:checked').forEach(i => (i.closest('label') || i).classList.add('cl-heard')); return; }
    if(f[2] === 'radio'){ document.querySelectorAll('input[name="' + box + '"]:checked').forEach(i => (i.closest('label') || i).classList.add('cl-heard')); return; }
    const el = document.getElementById(box); if(el) el.classList.add('cl-heard');
  }
  function openDetailsFor(k){
    const f = fieldOf(k); if(!f) return;
    const el = document.getElementById(f[1]) || document.querySelector('input[name="' + f[1] + '"]');
    let d = el && el.closest('details'); while(d){ d.open = true; d = d.parentElement && d.parentElement.closest('details'); }
  }
  function fillForm(d){
    openLeadModal();   /* the regular blank form (clears any earlier marks first) */
    const p = d.prefill || {};
    Object.keys(p).forEach(k => { const f = fieldOf(k); if(f) leadFieldFill(f, p); });
    try{ leadStartUI(); toggleClientNameFields(false); toggleDementiaFollowUp(); leadPayorUI(); }catch(e){}
    (d.heard || []).forEach(k => { markHeard(k); openDetailsFor(k); });
    const at = d.call && d.call.at ? new Date(d.call.at) : null, tz = { timeZone: 'America/Chicago' };
    const sameDay = at && at.toLocaleDateString('en-US', tz) === new Date().toLocaleDateString('en-US', tz);
    const when = at && !isNaN(at) ? (sameDay ? '' : at.toLocaleDateString('en-US', Object.assign({ weekday: 'short', month: 'short', day: 'numeric' }, tz)) + ' ')
      + at.toLocaleTimeString('en-US', Object.assign({ hour: 'numeric', minute: '2-digit' }, tz)).replace(/\s?([AP])M$/, (m, x) => ' ' + x.toLowerCase() + 'm') : '';
    document.getElementById('leadModalTitle').textContent = when ? 'New lead from the ' + when + ' call' : 'New lead from a call';
    const sub = document.querySelector('#leadModalBackdrop .modal-sub');
    const banner = '<div id="clBanner" style="margin:8px 0 12px;padding:9px 12px;border-radius:10px;background:#FFF8EC;border:1px solid #F0D9A8;font-size:13px;">'
      + '<span class="cl-heard" style="padding:1px 6px;border-radius:4px;">Yellow</span> = heard on the call. Check it before saving; the yellow goes when you change a box.'
      + (d.note ? '<div style="margin-top:4px;color:#8A5A00;"><b>' + esc(d.note) + '</b></div>' : '')
      + (d.is_new_family === false ? '<div style="margin-top:4px;color:#A83A2F;"><b>The AI thinks this may not be a new family' + (d.not_new_family_reason ? ' (' + esc(d.not_new_family_reason) + ')' : '') + '.</b> Save only if it is.</div>' : '')
      + '</div>';
    if(sub) sub.insertAdjacentHTML('afterend', banner);
    CL.pending = { message_id: d.call.message_id, at: d.call.at || '', contact_id: (d.contact && d.contact.id) || '' };
  }
  /* touching a yellow box means a person checked it */
  document.addEventListener('input', e => {
    const t = e.target; if(!t || !t.closest || !t.closest('#leadModalBackdrop')) return;
    if(t.type === 'radio' && t.name) document.querySelectorAll('input[name="' + t.name + '"]').forEach(i => { const l = i.closest('label'); if(l) l.classList.remove('cl-heard'); });
    const y = t.closest('label.cl-heard') || (t.classList.contains('cl-heard') ? t : null); if(y) y.classList.remove('cl-heard');
  }, true);

  async function make(id, btn){
    if(!okId(id) || CL.working[id]) return;
    CL.working[id] = true; repaint();
    try{ const d = await staffCall({ action: 'read', message_id: id }); fillForm(d); }
    catch(e){ say('Could not read the call: ' + (e && e.message || e)); }
    finally{ delete CL.working[id]; repaint(); }
  }

  /** saveLead, just before it saves a NEW lead from the form: the call goes onto the lead. */
  function stamp(lead){
    const p = CL.pending, modal = document.getElementById('leadModalBackdrop');
    if(!p || !modal || !modal.classList.contains('open')) return null;
    const list = Array.isArray(lead.from_calls) ? lead.from_calls.slice() : [];
    if(!list.some(x => x && x.message_id === p.message_id)) list.push({ message_id: p.message_id, at: p.at, by: me(), linked_at: new Date().toISOString() });
    lead.from_calls = list;
    if(!lead.ghl_contact_id && p.contact_id) lead.ghl_contact_id = p.contact_id;
    if(p.at && (!lead.last_call_at || String(p.at) > String(lead.last_call_at))) lead.last_call_at = p.at;
    CL.pending = null;
    return p;
  }
  /** after the save: tag the GoHighLevel contact "lead"; a failure is shown, never quiet. */
  async function afterSave(lead, p){
    if(!p) return;
    try{ if(typeof opEvent === 'function') opEvent('lead_from_call', { item_id: String(lead.id), area: 'leads', summary: 'Made a lead from a call: ' + leadName(lead), data: { message_id: p.message_id } }); }catch(e){}
    try{ const r = await staffCall({ action: 'made', message_id: p.message_id, lead_id: lead.id }); if(r && r.note) say(r.note); }
    catch(e){ say('Lead saved, but GoHighLevel was not tagged "lead": ' + (e && e.message || e)); }
    repaint();
  }
  /** the same-family check found their open lead: the call goes onto THAT lead instead of a new one. */
  async function attachTo(leadId){
    const l = leads().find(x => x && String(x.id) === String(leadId)); if(!l) return;
    const p = stamp(l); if(!p) return;
    await persist('leads', l);
    say('Added this call to ' + leadName(l) + '\'s lead.');
    afterSave(l, p);
  }

  async function markNot(id){
    if(!okId(id)) return;
    if(typeof DATA !== 'undefined' && !Array.isArray(DATA.call_lead_marks)) DATA.call_lead_marks = [];
    const m = { id, verdict: 'not', by: me(), at: new Date().toISOString() };
    const i = DATA.call_lead_marks.findIndex(x => x && x.id === id); if(i >= 0) DATA.call_lead_marks[i] = m; else DATA.call_lead_marks.push(m);
    await persist('call_lead_marks', m); repaint();
  }
  async function undoNot(id){
    const m = marks().find(x => x && x.id === id); if(!m) return;
    Object.assign(m, { verdict: '', undone_by: me(), undone_at: new Date().toISOString() });
    await persist('call_lead_marks', m); repaint();
  }
  function openLead(id){ if(typeof openLeadProfile === 'function') openLeadProfile(id); else openLeadModal(id); }

  window.CallLead = { load, bar, callRow, cardBar, waitingHtml, make, stamp, afterSave, attachTo, clearForm, markNot, undoNot, openLead, leadFor, _state: CL };
})();
