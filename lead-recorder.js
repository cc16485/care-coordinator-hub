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
      let q = sb.from('lead_record_seen').select('message_id, mode, msg_at, kind, status, lead_id, candidates, line, ev, note, contact_name, matched_on').eq('mode', mode);
      q = mode === 'live' ? q.in('status', ['several', 'error']) : q.gte('msg_at', String(settings().lead_record_since || new Date(Date.now() - 7 * 864e5).toISOString()));
      const { data, error } = await q.order('msg_at', { ascending:false }).limit(600);
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
    return practiceHtml();
  }

  /* 772 (Samantha 2026-10-15, before switching it on: "Confirm that each interaction is attached to the correct family, that
     duplicate calls or texts aren't created, and that sensitive information isn't exposed to the wrong client record"):
     every practice row checked, the ones worth a look flagged, with why. */
  const words = s => String(s || '').toLowerCase().replace(/[^a-z\s'-]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  function familyWords(l){
    const ppl = (l.call_profile && Array.isArray(l.call_profile.people) ? l.call_profile.people : []).map(p => p && p.name);
    return new Set(words([l.first_name, l.last_name, l.client_first_name, l.client_last_name, l.preferred_name].concat(ppl).join(' ')));
  }
  function checks(rows){
    const out = rows.map(r => ({ r, flags:[] }));
    const byLead = {};
    out.forEach(x => { const id = String(x.r.lead_id || ''); if(id) (byLead[id] = byLead[id] || []).push(x); });
    out.forEach(x => {
      const r = x.r, l = leadById(r.lead_id);
      if(r.status === 'several'){ x.flags.push(['shared', 'The number is on more than one family; nothing is recorded until a person picks']); return; }
      if(r.status === 'error'){ x.flags.push(['error', 'Could not be recorded' + (r.note ? ': ' + r.note : '')]); return; }
      if(!l){ x.flags.push(['missing', 'The family is not in this Hub view']); return; }
      /* the right family? GoHighLevel's name for the contact should share a name with the family */
      if(r.contact_name){ const fw = familyWords(l), cw = words(r.contact_name).filter(w => !/^(mr|mrs|ms|dr)$/.test(w));
        if(cw.length && !cw.some(w => fw.has(w))) x.flags.push(['name', 'GoHighLevel calls this contact "' + r.contact_name + '", a name not on this family']); }
      else x.flags.push(['noname', 'GoHighLevel has no name for this contact; check it is them']);
      if(r.matched_on === 'client_phone') x.flags.push(['client', 'Matched on the client\'s own number (not the person who inquired)']);
      /* doubles: the same kind and direction on the same family within 3 minutes, or a hand-logged call a few hours away */
      const ev = r.ev || {}, t = Date.parse(r.msg_at);
      const twin = (byLead[String(r.lead_id)] || []).some(y => y !== x && y.r.kind === r.kind && (y.r.ev || {}).direction === ev.direction && Math.abs(Date.parse(y.r.msg_at) - t) < 3 * 60e3);
      if(twin) x.flags.push(['double', 'Another ' + (r.kind === 'sms' ? 'text' : 'call') + ' the same way within 3 minutes; check it is not the same one twice']);
      if(r.status === 'would_record' && r.kind === 'call'){
        /* a hand log is usually typed after the call: from 30 minutes before to 4 hours after (the recorder already skips 10 before to 90 after) */
        const hand = (l.contact_events || []).find(e => e && e.channel === 'call' && !String(e.ref || '').startsWith('ghl:') && Date.parse(e.at) - t > -30 * 60e3 && Date.parse(e.at) - t < 4 * 3600e3);
        if(hand) x.flags.push(['hand', 'A call was logged by hand ' + when(hand.at) + '; if it is this call, it would be on the record twice']);
      }
    });
    return out;
  }
  const FLAG_WORD = { name:'Name differs', noname:'No name', client:'Client\'s number', double:'Possible double', hand:'Also logged by hand', shared:'Shared number', error:'Could not record', missing:'Not found' };
  function practiceHtml(){
    const C = checks(S.rows), flagged = C.filter(x => x.flags.length);
    const cnt = k => C.filter(x => x.flags.some(f => f[0] === k)).length;
    const would = S.rows.filter(r => r.status === 'would_record').length, already = S.rows.filter(r => r.status === 'already').length;
    const fams = new Set(S.rows.filter(r => r.lead_id).map(r => String(r.lead_id))).size;
    const named = S.rows.filter(r => r.contact_name).length;
    const tick = (n, good, bad) => '<li class="' + (n ? 'lr-warn' : 'lr-ok') + '">' + (n ? n + ' ' + bad : good) + '</li>';
    const list = (S.onlyFlagged ? flagged : C);
    const by = new Map(); list.forEach(x => { const k = x.r.status === 'several' ? 'several' : String(x.r.lead_id || ''); if(!by.has(k)) by.set(k, []); by.get(k).push(x); });
    return '<details class="card lr-card"' + (S.open ? ' open' : '') + ' ontoggle="LeadRecorder.toggle(this.open)"><summary class="lr-head"><b>Practice: check before switching on</b><span class="field-note">Since ' + esc(String(settings().lead_record_since || '').slice(0, 10)) + ': it would record '
      + would + ' call' + (would === 1 ? '' : 's') + ' and text' + (would === 1 ? '' : 's') + ' on ' + fams + ' famil' + (fams === 1 ? 'y' : 'ies') + (already ? ', ' + already + ' already logged by hand (skipped)' : '') + '. ' + (flagged.length ? flagged.length + ' worth a look.' : 'Nothing flagged.') + ' Nothing is changed yet.</span></summary>'
      + '<ul class="lr-checks">'
      + tick(cnt('name') + cnt('noname'), 'Right family: GoHighLevel\'s name for every contact matches a name on the family (' + named + ' of ' + S.rows.length + ' rows have a name)', 'row(s) where GoHighLevel\'s name for the contact isn\'t on the family, or it has no name: check they are the right family')
      + tick(cnt('double') + cnt('hand'), 'No doubles: no call or text appears twice, and nothing logged by hand would be recorded again', 'possible double(s): check each before switching on')
      + tick(cnt('shared'), 'No shared numbers', 'on a number two families share: never recorded until a person picks')
      + tick(cnt('client'), 'Every match is on the number of the person who inquired', 'matched on the client\'s own number: check the client is who called')
      + tick(cnt('error'), 'No errors', 'could not be recorded')
      + '<li class="lr-info">What goes on a record: one history line per call or text, on the family whose number it is. Texts are quoted on that family\'s record. A number on two families is never guessed.</li>'
      + '<li class="lr-info">Calls from other family members: only the two numbers on the lead (who inquired, and the client) are matched. A sister calling from her own number is not recorded on the family yet; that call still shows in Call follow-ups.</li>'
      + '</ul>'
      + '<div class="lr-bar"><label><input type="checkbox" ' + (S.onlyFlagged ? 'checked ' : '') + 'onchange="LeadRecorder.onlyFlagged(this.checked)"> Only rows worth a look</label></div>'
      + [...by.entries()].slice(0, 60).map(([id, xs]) => { const l = leadById(id);
        return '<div class="lr-fam">' + (id === 'several' ? '<b>Shared numbers</b>' : '<button class="linklike" data-open-lead="' + esc(id) + '" data-open-tab="summary">' + esc(l ? nameOf(l) : 'lead ' + id) + '</button>' + (l ? ' <span class="field-note">' + esc([l.phone, l.client_phone ? 'client ' + l.client_phone : ''].filter(Boolean).join(' · ')) + '</span>' : ''))
          + xs.slice().reverse().map(x => '<div class="lr-row"><span class="lr-when">' + esc(when(x.r.msg_at)) + '</span><span class="lr-line">' + esc(x.r.line || '')
            + '<span class="field-note"> · ' + esc(x.r.contact_name ? 'GoHighLevel: ' + x.r.contact_name : 'no GoHighLevel name') + (x.r.matched_on ? ', on the ' + (x.r.matched_on === 'phone' ? 'inquirer\'s' : 'client\'s') + ' number' : '') + '</span>'
            + x.flags.map(f => '<div class="lr-flag">⚑ ' + esc(f[1]) + '</div>').join('') + '</span>'
            + '<span class="lr-tag lr-' + esc(x.flags.length ? 'flag' : x.r.status) + '">' + esc(x.flags.length ? FLAG_WORD[x.flags[0][0]] : ({ would_record:'would record', already:'already logged', waiting:'waiting for the call reader' }[x.r.status] || x.r.status)) + '</span></div>').join('') + '</div>'; }).join('')
      + (by.size > 60 ? '<div class="field-note" style="padding:6px 0;">and ' + (by.size - 60) + ' more families</div>' : '')
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
    /* 2026-10-28: the automatic what-to-expect text stamps the lead on the server; a page that loaded the lead earlier keeps the stamp */
    if(db.what_to_expect_sent_at && !l.what_to_expect_sent_at){ l.what_to_expect_sent_at = db.what_to_expect_sent_at; l.what_to_expect_sent_by = db.what_to_expect_sent_by; }
    if(db.auto_msgs_stopped_at && !l.auto_msgs_stopped_at){ l.auto_msgs_stopped_at = db.auto_msgs_stopped_at; l.auto_msgs_stop_reason = db.auto_msgs_stop_reason; }
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
  window.LeadRecorder = { html, load, pick, merge, keep, record, isLive, checks, toggle:o => { S.open = !!o; }, onlyFlagged:o => { S.onlyFlagged = !!o; try{ if(typeof renderLeadsStarts === 'function') renderLeadsStarts(); }catch(e){} } };
  try{ mark(); }catch(e){}
})();
