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
    const onLead = l && Array.isArray(l.from_calls) && l.from_calls.some(x => x && x.message_id === id);
    if(l && busy) return '<span class="field-note">Reading the call…</span>';
    if(l) return '<span class="field-note">Lead: <b>' + esc(leadName(l)) + '</b></span> ' + btn('Open lead', 'CallLead.openLead(\'' + esc(l.id) + '\')', false)
      + (onLead ? '' : ' <button class="ghost" style="font-size:12px;padding:4px 10px;" data-lead="' + esc(l.id) + '" onclick="CallLead.make(\'' + esc(id) + '\',this)">Add from this call</button>');
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
  const callWhen = iso => {
    const at = iso ? new Date(iso) : null, tz = { timeZone: 'America/Chicago' };
    if(!at || isNaN(at)) return '';
    const sameDay = at.toLocaleDateString('en-US', tz) === new Date().toLocaleDateString('en-US', tz);
    return (sameDay ? '' : at.toLocaleDateString('en-US', Object.assign({ weekday: 'short', month: 'short', day: 'numeric' }, tz)) + ' ')
      + at.toLocaleTimeString('en-US', Object.assign({ hour: 'numeric', minute: '2-digit' }, tz)).replace(/\s?([AP])M$/, (m, x) => ' ' + x.toLowerCase() + 'm');
  };
  /** What a box holds now, read the same way the save reads it. */
  const boxNow = f => { try{ return leadFieldRead(f); }catch(e){ return ''; } };
  const blank = v => v === '' || v == null || v === false || (Array.isArray(v) && !v.length);
  /** v2 "fill everything": a NEW lead gets every box the call gave; an EXISTING lead (Add from this call) gets the boxes
   *  still empty, the new ticks added to its grids, the call's notes added below its own, and any box where the call
   *  said something different is listed for a person to decide (never overwritten). */
  function fillForm(d, leadId){
    openLeadModal(leadId || undefined);   /* the regular form (clears any earlier marks first) */
    const p = d.prefill || {}, heard = new Set(d.heard || []), differs = [];
    Object.keys(p).forEach(k => {
      const f = fieldOf(k); if(!f) return;
      if(!leadId){ leadFieldFill(f, p); return; }
      if(!heard.has(k)) return;                                 /* GoHighLevel's own name/phone never touch an existing lead */
      const now = boxNow(f), v = p[k];
      if(k === 'interest_notes'){ const el = document.getElementById(f[1]); el.value = [String(now || '').trim(), 'From the ' + (callWhen(d.call && d.call.at) || '') + ' call: ' + v].filter(Boolean).join('\n\n'); return; }
      if(f[2] === 'checks'){ const add = (v || []).filter(x => (now || []).indexOf(x) < 0); if(!add.length){ heard.delete(k); return; } leadFieldFill(f, { [k]: (now || []).concat(add) }); return; }
      if(blank(now)){ leadFieldFill(f, p); return; }
      heard.delete(k);
      if(String(now).trim().toLowerCase() !== String(v).trim().toLowerCase() && f[2] !== 'check') differs.push([k, now, v]);
    });
    try{ leadStartUI(); if(!leadId) toggleClientNameFields(false); toggleDementiaFollowUp(); togglePriceQuotedAmount(document.getElementById('lead_price_quoted').checked); leadPayorUI(); }catch(e){}
    /* yellow: for a grid on an existing lead, only the ticks the call added */
    heard.forEach(k => {
      const f = fieldOf(k);
      if(leadId && f && f[2] === 'checks'){ const was = (DATA.leads.find(x => x.id === leadId) || {})[k] || []; (p[k] || []).filter(x => was.indexOf(x) < 0).forEach(x => { const i = document.querySelector('#' + f[1] + ' input[value="' + x + '"]'); if(i) (i.closest('label') || i).classList.add('cl-heard'); }); }
      else markHeard(k);
      openDetailsFor(k);
    });
    const when = callWhen(d.call && d.call.at);
    document.getElementById('leadModalTitle').textContent = leadId ? 'Add what the ' + (when || '') + ' call said' : when ? 'New lead from the ' + when + ' call' : 'New lead from a call';
    const LBL = { client_city: 'Town', client_address: 'Address', client_dob: 'Birth date', relationship: 'Relationship', funding_source: 'Payer', mobility: 'Mobility', times_needed: 'Times',
      number_of_hours: 'Hours a week', desired_start_kind: 'Start', client_last_name: 'Last name', client_first_name: 'First name', physician_name: 'Doctor', preferred_hospital: 'Hospital', why_called: 'Why they called' };
    const cp = d.care_plan || {}, nTasks = (cp.axiscare_tasks || []).length, nPlan = Object.keys(cp.fields || {}).length + (cp.narrative ? 1 : 0);
    const sub = document.querySelector('#leadModalBackdrop .modal-sub');
    const banner = '<div id="clBanner" style="margin:8px 0 12px;padding:9px 12px;border-radius:10px;background:#FFF8EC;border:1px solid #F0D9A8;font-size:13px;">'
      + '<span class="cl-heard" style="padding:1px 6px;border-radius:4px;">Yellow</span> = heard on the call. Check it before saving; the yellow goes when you change a box.'
      + (leadId ? '<div style="margin-top:4px;">Only empty boxes were filled; what the call said is added below the notes.</div>' : '')
      + (differs.length ? '<div style="margin-top:4px;color:#8A5A00;"><b>The call said something different here (not changed):</b> ' + differs.map(x => esc(LBL[x[0]] || x[0]) + ': form has "' + esc(Array.isArray(x[1]) ? x[1].join(', ') : x[1]) + '", the call said "' + esc(Array.isArray(x[2]) ? x[2].join(', ') : x[2]) + '"').join(' · ') + '</div>' : '')
      + (d.medicaid_mentioned ? '<div style="margin-top:4px;color:#A83A2F;"><b>They mentioned Medicaid.</b> We no longer accept it; CDS may fit (417) 218-2888, or private pay.</div>' : '')
      + (nPlan || nTasks ? '<div style="margin-top:4px;color:#1F5F3A;"><b>Care plan draft started from this call:</b> ' + [nPlan ? nPlan + ' part' + (nPlan === 1 ? '' : 's') + (cp.narrative ? ' incl. the narrative' : '') : '', nTasks ? nTasks + ' AxisCare care task' + (nTasks === 1 ? '' : 's') : ''].filter(Boolean).join(', ') + '. It saves with the lead and opens in the care plan at the home visit.</div>' : '')
      + (d.tasks_note ? '<div style="margin-top:4px;color:#8A5A00;">' + esc(d.tasks_note) + '</div>' : '')
      + (d.note ? '<div style="margin-top:4px;color:#8A5A00;"><b>' + esc(d.note) + '</b></div>' : '')
      + (!leadId && d.is_new_family === false ? '<div style="margin-top:4px;color:#A83A2F;"><b>The AI thinks this may not be a new family' + (d.not_new_family_reason ? ' (' + esc(d.not_new_family_reason) + ')' : '') + '.</b> Save only if it is.</div>' : '')
      + '</div>';
    if(sub) sub.insertAdjacentHTML('afterend', banner);
    CL.pending = { message_id: d.call.message_id, at: d.call.at || '', contact_id: (d.contact && d.contact.id) || '', care_plan: (nPlan || nTasks) ? cp : null, lead_id: leadId || '' };
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
    try{ const d = await staffCall({ action: 'read', message_id: id }); fillForm(d, (btn && btn.dataset && btn.dataset.lead) || ''); }
    catch(e){ say('Could not read the call: ' + (e && e.message || e)); }
    finally{ delete CL.working[id]; repaint(); }
  }

  /** The care plan draft from the calls (reported by the family): a later call fills what is still empty, adds what is
   *  new below what is there, and adds care tasks not yet on it. Never removes anything. */
  function mergeDraft(old, cp, p){
    const d = Object.assign({ reported: true, fields: {}, narrative: '', axiscare_tasks: [], from_calls: [] }, old || {});
    d.fields = Object.assign({}, d.fields);
    Object.keys(cp.fields || {}).forEach(k => { const a = String(d.fields[k] || '').trim(), b = String(cp.fields[k] || '').trim(); if(!b) return;
      d.fields[k] = !a ? b : (k === 'recommended_hours_per_week' || a.toLowerCase().indexOf(b.toLowerCase()) > -1) ? a : a + '\n' + b; });
    const n = String(cp.narrative || '').trim(); if(n && String(d.narrative || '').indexOf(n) < 0) d.narrative = [String(d.narrative || '').trim(), n].filter(Boolean).join('\n\n');
    const have = new Set((d.axiscare_tasks || []).map(t => t && t.adl_id));
    d.axiscare_tasks = (d.axiscare_tasks || []).concat((cp.axiscare_tasks || []).filter(t => t && !have.has(t.adl_id)));
    if(d.from_calls.indexOf(p.message_id) < 0) d.from_calls = d.from_calls.concat([p.message_id]);
    d.updated_at = new Date().toISOString(); d.updated_by = me();
    return d;
  }
  /** saveLead, just before it saves a lead from the form opened by a call: the call (and its care plan draft) goes onto the lead. */
  function stamp(lead){
    const p = CL.pending, modal = document.getElementById('leadModalBackdrop');
    if(!p || !modal || !modal.classList.contains('open')) return null;
    if(p.lead_id && String(lead.id) !== String(p.lead_id)) return null;
    if(p.care_plan) lead.care_plan_draft = mergeDraft(lead.care_plan_draft, p.care_plan, p);
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

  window.CallLead = { mergeDraft, load, bar, callRow, cardBar, waitingHtml, make, stamp, afterSave, attachTo, clearForm, markNot, undoNot, openLead, leadFor, _state: CL };
})();
