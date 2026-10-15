/* lead-recorder.js · calls and texts with a lead record themselves (769, Samantha 2026-10-15: "we shouldnt have to
   manually log a call or text follow up since the ai should monitor and record all of our calls and texts to leads";
   approved mockup Part 2, https://claude.ai/artifact/MhFEgbLXTzmPCbegzHVv49).

   The server job lead-record writes each GoHighLevel call and text with a lead onto the lead. This file is the Hub's half:
   - on the Leads board, while the recorder is in PRACTICE: what it would have recorded, by family, so Samantha can check
     a few against what really happened before turning it on (Admin page: lead_record_live);
   - once it is LIVE: "Couldn't tell whose" (a number two leads share; a person picks, the Hub records it the way Log a
     call does) and "Couldn't record" (never silent);
   - merge(): before the Hub saves a lead, anything the recorder added since this page loaded is kept (persist calls it);
   - body[data-lead-record="live"] swaps "Log a call" for "Log a call from another phone" and drops it from board rows.
   Reads lead_record_seen (office staff only). Sends nothing to anyone. */
(function(){
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const S = { rows:null, mode:'', at:0, busy:false, open:false };
  const settings = () => (typeof DATA !== 'undefined' && DATA.ops_settings && typeof DATA.ops_settings === 'object' && !Array.isArray(DATA.ops_settings)) ? DATA.ops_settings : {};
  const isLive = () => settings().lead_record_live === true;
  const isOn = () => !!settings().lead_record_since;
  const leadById = id => ((typeof DATA !== 'undefined' && DATA.leads) || []).find(l => l && String(l.id) === String(id));
  const nameOf = l => (typeof cpLeadClientName === 'function' && cpLeadClientName(l)) || [l && l.first_name, l && l.last_name].filter(Boolean).join(' ') || 'a family';
  const when = iso => { try{ return new Date(iso).toLocaleString('en-US', { timeZone:'America/Chicago', weekday:'short', hour:'numeric', minute:'2-digit' }); }catch(e){ return String(iso || '').slice(0, 16); } };
  function mark(){ try{ document.body.dataset.leadRecord = isLive() ? 'live' : (isOn() ? 'practice' : 'off'); }catch(e){} }

  async function load(force){
    mark();
    if(!isOn() || S.busy || typeof sb === 'undefined' || !sb) return;
    const mode = isLive() ? 'live' : 'practice';
    if(!force && S.rows && S.mode === mode && Date.now() - S.at < 60e3) return;
    S.busy = true;
    try{
      let q = sb.from('lead_record_seen').select('message_id, mode, msg_at, kind, status, lead_id, candidates, line, ev, note').eq('mode', mode);
      q = mode === 'live' ? q.in('status', ['several', 'error']) : q.gte('msg_at', new Date(Date.now() - 2 * 864e5).toISOString());
      const { data, error } = await q.order('msg_at', { ascending:false }).limit(300);
      S.rows = error ? [] : (data || []); S.mode = mode; S.at = Date.now(); S.err = error ? (error.message || 'could not read') : '';
    }catch(e){ S.rows = []; S.err = 'could not read'; }
    S.busy = false;
    try{ if(typeof renderLeadsStarts === 'function') renderLeadsStarts(); }catch(e){}
  }

  function html(){
    mark();
    if(!isOn()) return '';
    if(!S.rows){ load(); return ''; }
    if(Date.now() - S.at > 60e3) load();
    if(S.err) return '<div class="card lr-card"><b>Calls and texts</b> <span class="field-note">The list of what the recorder did could not be read just now (' + esc(S.err) + '). It tries again in a minute.</span></div>';
    if(S.mode === 'live'){
      const sev = S.rows.filter(r => r.status === 'several'), err = S.rows.filter(r => r.status === 'error');
      if(!sev.length && !err.length) return '';
      return '<div class="card lr-card">'
        + (sev.length ? '<div class="lr-head"><b>Couldn\'t tell whose</b><span class="field-note">' + sev.length + ' · the same number is on more than one family. Pick whose it was and it goes on their record.</span></div>'
          + sev.map(r => '<div class="lr-row"><span class="lr-when">' + esc(when(r.msg_at)) + '</span><span class="lr-line">' + esc(r.line || '') + '</span><span class="lr-acts">'
            + (r.candidates || []).map(id => { const l = leadById(id); return '<button class="lb-btn" onclick="LeadRecorder.pick(\'' + esc(r.message_id) + '\', \'' + esc(id) + '\', this)">It was ' + esc(l ? nameOf(l) : 'lead ' + id) + '</button>'; }).join('')
            + '<button class="lb-btn" onclick="LeadRecorder.pick(\'' + esc(r.message_id) + '\', \'\', this)">Neither</button></span></div>').join('') : '')
        + (err.length ? '<div class="lr-head" style="margin-top:' + (sev.length ? '10px' : '0') + ';"><b style="color:var(--red);">Couldn\'t record</b><span class="field-note">' + err.length + ' · these did not go on the family\'s record. Use Log a call from another phone, or tell Claude.</span></div>'
          + err.map(r => { const l = leadById(r.lead_id); return '<div class="lr-row"><span class="lr-when">' + esc(when(r.msg_at)) + '</span><span class="lr-line">' + esc((l ? nameOf(l) + ': ' : '') + (r.line || r.kind)) + (r.note ? ' <span class="field-note">(' + esc(r.note) + ')</span>' : '') + '</span>'
            + (l ? '<span class="lr-acts"><button class="lb-btn" data-open-lead="' + esc(l.id) + '" data-open-tab="summary">Open</button></span>' : '') + '</div>'; }).join('') : '')
        + '</div>';
    }
    /* practice: what it would have recorded, newest family first */
    const by = new Map();
    for(const r of S.rows){ const k = r.status === 'several' ? 'several' : String(r.lead_id || ''); if(!by.has(k)) by.set(k, []); by.get(k).push(r); }
    const would = S.rows.filter(r => r.status === 'would_record').length, already = S.rows.filter(r => r.status === 'already').length;
    const fams = [...by.entries()].filter(([k]) => k !== 'several');
    return '<details class="card lr-card"' + (S.open ? ' open' : '') + ' ontoggle="LeadRecorder.toggle(this.open)"><summary class="lr-head"><b>Practice: calls and texts recording themselves</b><span class="field-note">Last 2 days: it would have recorded '
      + would + ' on ' + fams.length + ' famil' + (fams.length === 1 ? 'y' : 'ies') + (already ? ', ' + already + ' already logged by hand' : '') + (by.has('several') ? ', ' + by.get('several').length + ' on a shared number' : '')
      + '. Nothing is changed yet. Check a few, then turn it on from the Admin page.</span></summary>'
      + fams.slice(0, 25).map(([id, rs]) => { const l = leadById(id); return '<div class="lr-fam"><button class="linklike" data-open-lead="' + esc(id) + '" data-open-tab="summary">' + esc(l ? nameOf(l) : 'lead ' + id) + '</button>'
        + rs.slice().reverse().map(r => '<div class="lr-row"><span class="lr-when">' + esc(when(r.msg_at)) + '</span><span class="lr-line">' + esc(r.line || '') + '</span><span class="lr-tag lr-' + esc(r.status) + '">' + esc({ would_record:'would record', already:'already logged', waiting:'waiting for the call reader', error:'could not record' }[r.status] || r.status) + '</span></div>').join('') + '</div>'; }).join('')
      + (fams.length > 25 ? '<div class="field-note" style="padding:6px 0;">and ' + (fams.length - 25) + ' more</div>' : '')
      + '</details>';
  }

  /* the Hub's half of the server's apply(): the same fields Log a call writes */
  function record(l, ev, line){
    const firstTime = !l.first_human_contact_at && ev.actor === 'human' && ev.outcome === 'connected';
    ldPush(l, Object.assign({}, ev));
    l.comm_log = l.comm_log || [];
    l.comm_log.push({ body:line, at:ev.at, by:ev.by || 'GoHighLevel', src:'auto', ref:ev.ref });
    if(ev.actor === 'human'){ const d = (LeadRules.chicago(ev.at) || {}).ymd || String(ev.at).slice(0, 10); if(!l.last_contacted_at || String(l.last_contacted_at).slice(0, 10) < d) l.last_contacted_at = d; }
    if(ev.actor === 'human' && ev.direction === 'out' && (ev.outcome === 'no_answer' || ev.outcome === 'voicemail')){ l.contact_attempts = (Number(l.contact_attempts) || 0) + 1; l.last_attempt_kind = ev.outcome === 'voicemail' ? 'voicemail' : 'no answer'; }
    if(ev.actor === 'human' && ev.outcome === 'connected' && String(l.status || 'New') === 'New') LeadRules.setStatus(l, 'Contacted', { by:(ccActor() || {}).email, why:'first real conversation (picked from a shared number)' });
    return firstTime;
  }
  async function pick(messageId, leadId, btn){
    const r = (S.rows || []).find(x => x.message_id === messageId); if(!r) return;
    if(btn) btn.disabled = true;
    const { data, error } = await sb.rpc('lead_record_pick', { p_message_id:messageId, p_lead_id:leadId || '' });
    if(error || data !== true){ if(btn) btn.disabled = false; ccToast('⚠ Not saved: someone may have picked it already. The list will refresh.'); return load(true); }
    const l = leadId ? leadById(leadId) : null;
    if(l && r.ev && !(l.contact_events || []).some(e => e && e.ref === r.ev.ref)){
      const first = record(l, r.ev, r.line || '☎ Call');
      await persist('leads', l);
      if(first && typeof opEvent === 'function') opEvent('lead_connected', { item_id:String(l.id), area:'growth_leads', summary:'First real conversation with ' + nameOf(l) + ' (picked from a shared number)' });
    }
    ccToast(l ? '✓ On ' + nameOf(l) + '\'s record' : '✓ Set aside');
    load(true);
  }

  /* persist('leads') calls this first: events the recorder wrote since this page loaded the lead are kept */
  function merge(l, db){
    if(!l || !db || typeof db !== 'object') return l;
    const mine = new Set((l.contact_events || []).map(e => e && e.ref).filter(Boolean));
    const add = (db.contact_events || []).filter(e => e && String(e.ref || '').indexOf('ghl:') === 0 && !mine.has(e.ref));
    if(!add.length) return l;
    l.contact_events = (l.contact_events || []).concat(add).sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
    if(l.contact_events.length > 200) l.contact_events = l.contact_events.slice(-200);
    const logRefs = new Set((l.comm_log || []).map(c => c && c.ref).filter(Boolean));
    const lines = (db.comm_log || []).filter(c => c && c.src === 'auto' && c.ref && !logRefs.has(c.ref));
    if(lines.length) l.comm_log = (l.comm_log || []).concat(lines).sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
    const min = (a, b) => !a ? b : !b ? a : (a < b ? a : b), max = (a, b) => !a ? b : !b ? a : (a > b ? a : b);
    l.first_human_attempt_at = min(l.first_human_attempt_at, db.first_human_attempt_at) || l.first_human_attempt_at;
    l.first_human_contact_at = min(l.first_human_contact_at, db.first_human_contact_at) || l.first_human_contact_at;
    l.family_last_reply_at = max(l.family_last_reply_at, db.family_last_reply_at) || l.family_last_reply_at;
    l.last_contacted_at = max(l.last_contacted_at, db.last_contacted_at) || l.last_contacted_at;
    const tries = add.filter(e => e.actor === 'human' && e.direction === 'out' && (e.outcome === 'no_answer' || e.outcome === 'voicemail'));
    if(tries.length){ l.contact_attempts = (Number(l.contact_attempts) || 0) + tries.length; l.last_attempt_kind = tries[tries.length - 1].outcome === 'voicemail' ? 'voicemail' : 'no answer'; }
    if(String(l.status || 'New') === 'New' && db.status && db.status !== 'New'){ l.status = db.status; if(db.status_history) l.status_history = db.status_history; }
    ['first_human_attempt_at', 'first_human_contact_at', 'family_last_reply_at', 'last_contacted_at'].forEach(k => { if(l[k] === undefined) delete l[k]; });
    return l;
  }
  async function keep(item){
    if(typeof sb === 'undefined' || !sb || !item || !item.id || !isOn()) return item;
    try{ const { data, error } = await sb.rpc('app_data_item_get', { p_key:'leads', p_id:String(item.id) }); if(!error && data) merge(item, data); }catch(e){}
    return item;
  }
  window.LeadRecorder = { html, load, pick, merge, keep, record, isLive, toggle:o => { S.open = !!o; } };
  try{ mark(); }catch(e){}
})();
