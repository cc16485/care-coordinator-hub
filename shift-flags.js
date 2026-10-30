/* =====================================================================================================================
   SHIFT-NOTE FLAGS: RED OR YELLOW, WHY, AND WHAT HAPPENS NEXT (2026-10-06).
   Samantha: "Can the shift notes be more clear on why they are listed on the hub, is it a yellow or red flag, medium or
   high issue in the notes? Also a better flow on what to do with the notes notification". She loved the mockup and said
   yes to every recommendation: red = act today (to Client Care, also on the Incidents owner's My Work), yellow = look
   within 24 hours (Client Care), 3 yellows in 14 days = one red (pattern), and closing asks what was done.

   The care-notes job (Desktop 470) writes level, flag_kind, why, trigger (the caregiver's own words that caused it),
   flags_14d, pattern_count, caregiver_phone and also_for on each card. This file draws that card the same way on My Work
   and on Needs Attention, gives it its next steps, and lists a client's recent flags (with what was done) on their
   profile under From the shifts. Older cards with no level keep looking as they did.

   CALMER FLAGS (2026-10-30, plan VGeWn63w7ue8WE7GS4ogJ6, her approval with all three recommendations; switch
   ops_settings.calm_flags_live). care-notes puts a new note about the same client and topic onto the open card (it.notes,
   newest first); this file lists them. "Normal for <client>" (the Client Care owner or an owner; her decision 2) records
   what is usual for that client in client_flag_normals, closes the card, and the reader is told from then on. Marks show
   on the client's profile with who set them, Remove, and no expiry (decision 3). Never for a fall or injury, signs of
   neglect or abuse, or medication. A card the cleanup closed as quiet for a week can be reopened from the profile.

   NOTHING HERE CONTACTS ANYONE BY ITSELF. Call the caregiver opens the office line for a person to call (office-call.js);
   Tell the family opens the existing draft a person sends (N3). The other steps make Hub work or record what was done.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
  const LV = { red:{ label:'Red flag · act today', cls:'cn-red' }, yellow:{ label:'Yellow flag · look within 24 hours', cls:'cn-yellow' }, unread:{ label:'Please read · the AI couldn\'t', cls:'cn-unread' } };
  const ACT = { called:'Called the caregiver', family:'Told the family', nurse:'Asked for a nurse or supervisor visit', incident:'Wrote it up as an incident', watch:'Watching it', ok:'Not a concern', normal:'Marked as usual for this client' };
  /* calmer flags */
  const ALWAYS_OWN = ['a fall or injury', 'signs of neglect or abuse', 'medication'];
  const calmOn = () => { try{ return !!(DATA.ops_settings && DATA.ops_settings.calm_flags_live === true); }catch(e){ return false; } };
  const markable = it => !!(it && it.flag_kind && ALWAYS_OWN.indexOf(it.flag_kind) === -1 && it.client_ax && it.level !== 'unread');
  function canMark(){
    try{ if(typeof ccIsOwner === 'function' && ccIsOwner()) return true; }catch(e){}
    const m = me().email, cc = String(domainOwner('client_care') || '').toLowerCase();
    return !!(m && cc && m === cc);
  }
  const normals = () => ((typeof DATA !== 'undefined' && DATA.client_flag_normals) || []);
  const marksFor = ax => normals().filter(n => n && !n.removed_at && String(n.client_ax || '') === String(ax || '') && ax && ALWAYS_OWN.indexOf(n.kind) === -1);
  const isFlag = it => !!(it && it.kind === 'care_note' && LV[it.level]);
  const item = id => ((typeof DATA !== 'undefined' && DATA.ops_items) || []).find(x => x && x.id === id);
  const me = () => { try{ const a = ccActor(); return { email:String(a.email || '').toLowerCase(), name:a.name || a.email || 'Someone' }; }catch(e){ return { email:'', name:'Someone' }; } };
  const first = s => String(s || '').trim().split(/\s+/)[0] || '';
  const when = iso => { try{ return new Date(iso).toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }); }catch(e){ return ''; } };

  /* the caregiver's own words, with the part that caused the flag highlighted */
  function words(it){
    const m = /"([\s\S]*?)"(?:\n|$)/.exec(String(it.detail || ''));
    const note = m ? m[1] : '';
    if(!note) return '';
    const t = String(it.trigger || '').trim(), i = t ? note.toLowerCase().indexOf(t.toLowerCase()) : -1;
    const body = i >= 0 ? esc(note.slice(0, i)) + '<mark class="cn-hl">' + esc(note.slice(i, i + t.length)) + '</mark>' + esc(note.slice(i + t.length)) : esc(note);
    const tasks = String(it.detail || '').split('\n').filter(l => /: not done|: "/.test(l) && !/^"/.test(l));
    return '<div class="cn-words">“' + body + '”</div>' + (tasks.length ? '<div class="field-note cn-tasks">' + tasks.map(esc).join(' · ') + '</div>' : '');
  }
  /* one note on a combined card, with the words that caused it highlighted */
  function noteHtml(n){
    const w = String(n.words || ''), t = String(n.trigger || '').trim(), i = t ? w.toLowerCase().indexOf(t.toLowerCase()) : -1;
    const body = i >= 0 ? esc(w.slice(0, i)) + '<mark class="cn-hl">' + esc(w.slice(i, i + t.length)) + '</mark>' + esc(w.slice(i + t.length)) : esc(w);
    return '<div class="cn-note"><div class="field-note">' + esc([n.day, n.caregiver].filter(Boolean).join(' · ')) + '</div><div class="cn-words">“' + body + '”</div></div>';
  }
  function notesHtml(it){
    const ns = Array.isArray(it.notes) ? it.notes : [];
    if(ns.length < 2) return words(it);
    const firstFew = ns.slice(0, 3), rest = ns.slice(3);
    return '<div class="field-note cn-count" style="font-weight:700;">' + ns.length + ' notes on this card, newest first</div>' + firstFew.map(noteHtml).join('')
      + (rest.length ? '<details><summary class="field-note" style="cursor:pointer;">' + rest.length + ' older note' + (rest.length === 1 ? '' : 's') + '</summary>' + rest.map(noteHtml).join('') + '</details>' : '');
  }
  function block(it){
    const lv = LV[it.level], acts = Array.isArray(it.cn_actions) ? it.cn_actions : [];
    return '<div class="cn-flag ' + lv.cls + '">'
      + '<div class="cn-top"><span class="cn-chip">' + esc(lv.label) + '</span><span class="field-note">'
        + esc([it.flag_kind, it.about, it.visit_day, it.caregiver].filter(Boolean).join(' · ')) + '</span></div>'
      + '<div class="cn-why">Why it\'s here: ' + esc(it.why || it.flag_kind || 'a person should read this note') + '</div>'
      + (it.usual_note ? '<div class="field-note cn-usual">Marked as usual for ' + esc(first(it.about)) + ': ' + esc(it.usual_note) + '. This note looks worse or different.</div>' : '')
      + notesHtml(it)
      + (it.flags_14d > 1 && !(Array.isArray(it.notes) && it.notes.length > 1) ? '<div class="field-note cn-count">' + ordinal(it.flags_14d) + ' flag for ' + esc(first(it.about)) + ' in 14 days' + (it.pattern_count ? ' (a pattern, so it\'s red)' : '') + '</div>' : '')
      + (acts.length ? '<div class="field-note cn-done">Done so far: ' + acts.map(a => esc(ACT[a.what] || a.what) + ' (' + esc(first(a.by)) + ', ' + esc(when(a.at)) + ')').join(' · ') + '</div>' : '')
      + '</div>';
  }
  const ordinal = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
  function actions(it){
    if(it.status !== 'open') return '';
    const id = esc(it.id), b = (what, label, icon, extra) => '<button class="secondary cn-btn" onclick="cnStep(\'' + id + '\',\'' + what + '\',this)"' + (extra || '') + '>' + label + '</button>';
    const call = it.caregiver_phone && typeof ocAttrs === 'function'
      ? '<a class="secondary cn-btn cn-call"' + ocAttrs(it.caregiver_phone) + ' onclick="cnDid(\'' + id + '\',\'called\')">Call ' + esc(first(it.caregiver) || 'the caregiver') + '</a>'
      : b('nocall', 'Call the caregiver');
    return '<div class="cn-next"><div class="field-note">What happens next (pick one or more)</div><div class="cn-btns">'
      + call
      + (it.client_ax && typeof n3Open === 'function' ? b('family', 'Tell the family') : '')
      + (it.level === 'red' ? b('incident', 'Write it up as an incident') : '')
      + b('watch', 'Watch it (3 days)')
      + b('ok', 'Not a concern, close')
      + (calmOn() && markable(it) && canMark() ? '<button class="secondary cn-btn" onclick="cnNormalOpen(\'' + id + '\')">Normal for ' + esc(first(it.about)) + '</button>' : '')
      + '</div><div class="cn-normal" id="cnNorm_' + id + '"></div></div>';
  }
  async function save(it, what, logText){
    const m = me(), at = new Date().toISOString();
    it.cn_actions = (Array.isArray(it.cn_actions) ? it.cn_actions : []).concat([{ what, at, by:m.name, by_email:m.email }]);
    if(typeof opsLog === 'function') opsLog(it, logText || ACT[what] || what);
    it.last_activity_at = at;
    await persist('ops_items', it);
  }
  function refresh(){ try{ if(typeof myWorkRefresh === 'function') myWorkRefresh(); }catch(e){} try{ if(typeof opsRenderQueue === 'function') opsRenderQueue(); }catch(e){} }
  /* a recorded step (the office line opens by itself through office-call.js) */
  async function cnDid(id, what){ const it = item(id); if(!it) return; await save(it, what); refresh(); }
  /* a new Hub card for someone, linked back to this flag */
  async function newWork(it, f){
    const a = me(), now = new Date().toISOString();
    const w = Object.assign({ id:'ops_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), status:'open', urgency:it.level === 'red' ? 'today' : 'normal',
      created_at:now, due:new Date(Date.now() + (it.level === 'red' ? 4 : 24) * 3600e3).toISOString(), source:'shift_flag', source_id:it.id, about:it.about || '',
      client_ax:it.client_ax || '', created_by:a.name, created_by_email:a.email, opened_by:'person' }, f);
    DATA.ops_items = DATA.ops_items || []; DATA.ops_items.push(w);
    try{ opEvent('captured', { item:w, summary:a.name + ' made: ' + w.title }); }catch(e){}
    await persist('ops_items', w);
    return w;
  }
  function domainOwner(code){
    try{ const d = (OPS_DOMAINS || []).find(x => x.code === code); return d && d.owner_person ? opsEmailForPerson(d.owner_person) : ''; }catch(e){ return ''; }
  }
  async function cnStep(id, what, btn){
    const it = item(id); if(!it) return;
    const who = first(it.about) || 'the client';
    if(what === 'nocall'){ (typeof ccToast === 'function' ? ccToast : alert)('No phone number on file for ' + (it.caregiver || 'this caregiver') + '. Add it on their Caregivers profile.'); return; }
    if(what === 'family'){ n3Open(id); await save(it, 'family', 'Opened Tell the family'); refresh(); return; }
    if(btn) btn.disabled = true;
    try{
      if(what === 'incident' && window.INC){
        /* 2026-10-27 incident report (Stage 1): the caregiver fills in and signs a real report; the server makes the
           Incidents owner's card. The flag records the step once the report is started. */
        if(btn) btn.disabled = false;
        window.INC.fromFlag(it, async () => { await save(it, 'incident', 'Started an incident report for ' + (it.caregiver || 'the caregiver')); refresh(); });
        return;
      } else if(what === 'incident'){
        const owner = domainOwner('incidents') || String(it.owner || me().email).toLowerCase();
        const w = await newWork(it, { kind:'client_issue', domain:'incidents', title:'Incident: ' + (it.about || who) + ', ' + (it.flag_kind || 'shift note') + (it.visit_day ? ' (' + it.visit_day + ')' : ''),
          detail:String(it.detail || '').slice(0, 1500), owner, owner_name:(typeof opsOwnerName === 'function' && opsOwnerName(owner)) || '' });
        await save(it, 'incident', 'Wrote it up as an incident (new card for ' + (w.owner_name || owner) + ')');
        ccToast('Written up as an incident on ' + (first(w.owner_name) || 'the Incidents owner') + '\'s My Work.');
      } else if(what === 'watch'){
        const d = new Date(); d.setDate(d.getDate() + 3);
        it.sub_state = 'waiting'; it.waiting_on = 'the next shift notes for ' + who; it.check_back = d.toLocaleDateString('en-CA', { timeZone:'America/Chicago' });
        await save(it, 'watch', 'Watching it, back ' + it.check_back);
        ccToast('Watching it. It comes back on ' + d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) + '.');
      } else if(what === 'ok'){
        const at = new Date().toISOString(), m = me();
        it.status = 'done'; it.closed_at = at; it.closed_by = m.email; it.outcome = ['ok']; it.close_note = 'Not a concern';
        if(!it.claimed_by){ it.claimed_by = m.email; it.claimed_by_name = m.name; it.claimed_at = at; }
        try{ opEvent('item_resolved', { item:it, summary:(it.about || it.title || '') + ': not a concern' }); }catch(e){}
        await save(it, 'ok', 'Closed: not a concern');
        ccToast('Closed as not a concern.');
      }
    }catch(e){ ccToast('Couldn\'t save that just now. Try again in a moment.'); }
    if(btn) btn.disabled = false;
    refresh();
  }
  /* "Normal for Patsy": one line about what is usual, saved for the client, and this card closes */
  function cnNormalOpen(id){
    const it = item(id), box = document.getElementById('cnNorm_' + id); if(!it || !box) return;
    const who = first(it.about) || 'this client';
    box.innerHTML = '<div style="margin-top:8px;padding:10px;border-radius:8px;background:var(--bg,#F6F9FD);">'
      + '<label for="cnNormTxt_' + esc(id) + '" style="font-size:13px;font-weight:700;">What is usual for ' + esc(who) + ' about ' + esc(it.flag_kind) + '?</label>'
      + '<input id="cnNormTxt_' + esc(id) + '" type="text" maxlength="200" placeholder="For example: ' + esc(who) + ' has dementia; morning confusion is her usual" style="margin:6px 0;">'
      + '<div class="field-note">From now on, notes about ' + esc(it.flag_kind) + ' for ' + esc(who) + ' make no card unless they say it is worse or different. It shows on ' + esc(who) + '\'s profile, and anyone can remove it.</div>'
      + '<div class="cn-btns"><button class="primary cn-btn" onclick="cnNormalSave(\'' + esc(id) + '\',this)">Save and close this card</button><button class="ghost cn-btn" onclick="document.getElementById(\'cnNorm_' + esc(id) + '\').innerHTML=\'\'">Cancel</button></div></div>';
    const inp = document.getElementById('cnNormTxt_' + id); if(inp) inp.focus();
  }
  async function cnNormalSave(id, btn){
    const it = item(id); if(!it || !markable(it) || !canMark()) return;
    const inp = document.getElementById('cnNormTxt_' + id), note = String(inp && inp.value || '').trim();
    if(!note){ if(inp) inp.focus(); ccToast('Write one line about what is usual first.'); return; }
    if(btn) btn.disabled = true;
    const m = me(), at = new Date().toISOString(), who = first(it.about) || 'the client';
    const rec = { id:'nf_' + String(it.client_ax).replace(/[^A-Za-z0-9]/g, '') + '_' + String(it.flag_kind).replace(/[^a-z]+/gi, '_').toLowerCase() + '_' + Date.now().toString(36),
      client_ax:String(it.client_ax), client_name:it.about || '', kind:it.flag_kind, note, by:m.name, by_email:m.email, at, from_card:it.id };
    try{
      DATA.client_flag_normals = normals().concat([rec]);
      await persist('client_flag_normals', rec);
      it.status = 'done'; it.closed_at = at; it.closed_by = m.email; it.outcome = ['normal']; it.close_note = 'Marked as usual for ' + who + ' by ' + first(m.name) + ': ' + note;
      if(!it.claimed_by){ it.claimed_by = m.email; it.claimed_by_name = m.name; it.claimed_at = at; }
      try{ opEvent('item_resolved', { item:it, summary:(it.about || '') + ': ' + it.flag_kind + ' marked as usual' }); }catch(e){}
      await save(it, 'normal', it.close_note);
      ccToast('Saved. Notes about ' + it.flag_kind + ' for ' + who + ' make no card unless something changes.');
    }catch(e){ ccToast('Couldn\'t save that just now. Try again in a moment.'); if(btn) btn.disabled = false; return; }
    refresh();
  }
  async function cnNormalRemove(nid){
    const n = normals().find(x => x && x.id === nid); if(!n || n.removed_at) return;
    const m = me(); n.removed_at = new Date().toISOString(); n.removed_by = m.name; n.removed_by_email = m.email;
    try{ await persist('client_flag_normals', n); ccToast('Removed. Notes about ' + n.kind + ' flag again.'); }catch(e){ ccToast('Couldn\'t save that just now.'); }
    try{ if(typeof cnRender === 'function') cnRender(); }catch(e){}
  }
  /* a flag the cleanup closed as quiet for a week comes back open */
  async function cnReopen(id){
    const it = item(id); if(!it || it.status !== 'done' || it.resolution_code !== 'quiet_week') return;
    const m = me(), at = new Date().toISOString();
    it.status = 'open'; it.last_activity_at = at;
    ['closed_at', 'closed_by', 'resolution_code', 'close_note'].forEach(k => { delete it[k]; });
    if(typeof opsLog === 'function') opsLog(it, 'Reopened by ' + m.name + ': it still needs a look');
    try{ opEvent('item_reopened', { item:it, summary:(it.about || '') + ': flag reopened' }); }catch(e){}
    await persist('ops_items', it);
    ccToast('Reopened. It\'s back on My Work.');
    refresh(); try{ if(typeof cnRender === 'function') cnRender(); }catch(e){}
  }
  /* the client's profile: what is marked as usual for them */
  function profileNormals(ax){
    const ms = marksFor(ax); if(!ms.length) return '';
    const can = canMark();
    return '<div class="cn-prof"><div style="font-size:12.5px;font-weight:800;color:var(--navy);margin:4px 0;">Usual for this client <span class="field-note" style="font-weight:400;">(shift notes about these make no card unless something is worse or different)</span></div>'
      + ms.map(n => '<div class="cn-prow"><span class="cn-chip">' + esc(n.kind) + '</span><span>' + esc(n.note) + '</span><span class="field-note">' + esc(first(n.by)) + ', ' + esc(when(n.at)) + '</span>'
        + (can ? '<button class="ghost cn-btn" onclick="cnNormalRemove(\'' + esc(n.id) + '\')">Remove</button>' : '') + '</div>').join('') + '</div>';
  }
  /* Done on a flag asks what was done (ticked for whatever was already recorded), so the record says more than "done" */
  function closeExtra(it){
    if(!isFlag(it)) return '';
    const did = new Set((it.cn_actions || []).map(a => a.what));
    return '<div class="cn-close"><div style="font-size:12.5px;font-weight:700;margin:2px 0 4px;">What was done?</div>'
      /* 2026-10-18 (Samantha): the Nurse or supervisor visit button is gone; an older flag that used it still shows it */
      + ['called', 'family'].concat(did.has('nurse') ? ['nurse'] : [], ['incident', 'watch', 'ok']).map(k => '<label class="cn-out"><input type="checkbox" value="' + k + '"' + (did.has(k) ? ' checked' : '') + ' style="width:auto;margin:0;"> ' + esc(ACT[k]) + '</label>').join('')
      + '</div>';
  }
  function closeRead(el){ return [...el.querySelectorAll('.cn-out input:checked')].map(x => x.value); }
  /* the client's profile, under From the shifts: their flags in the last 30 days and what was done */
  function profileFlags(ax){
    return profileNormals(ax) + profileFlagList(ax);
  }
  function profileFlagList(ax){
    const since = Date.now() - 30 * 864e5;
    const list = ((typeof DATA !== 'undefined' && DATA.ops_items) || []).filter(i => i && i.kind === 'care_note' && String(i.client_ax || '') === String(ax || '') && ax && (Date.parse(i.created_at || '') || 0) >= since)
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    if(!list.length) return '';
    return '<div class="cn-prof"><div style="font-size:12.5px;font-weight:800;color:var(--navy);margin:4px 0;">Flags in the last 30 days</div>'
      + list.map(i => { const lv = LV[i.level], out = (i.outcome || (i.cn_actions || []).map(a => a.what));
          return '<div class="cn-prow">' + (lv ? '<span class="cn-chip ' + lv.cls + '">' + esc(i.level === 'red' ? 'Red' : i.level === 'yellow' ? 'Yellow' : 'Read') + '</span>' : '<span class="cn-chip">Flag</span>')
            + '<span>' + esc(i.visit_day || when(i.created_at)) + ': ' + esc(i.why || i.title || '') + '</span>'
            + '<span class="field-note">' + (i.status === 'open' ? 'open' + (out.length ? ', ' : '') : '') + esc(i.resolution_code === 'quiet_week' ? 'quiet for a week' : i.resolution_code === 'combined' ? 'combined into another card' : ([...new Set(out)].map(k => ACT[k] || k).join(', ') || (i.status === 'open' ? '' : 'closed'))) + '</span>'
            + (i.status === 'done' && i.resolution_code === 'quiet_week' ? '<button class="ghost cn-btn" onclick="cnReopen(\'' + esc(i.id) + '\')">Reopen</button>' : '') + '</div>'; }).join('')
      + '</div>';
  }
  const css = '.cn-flag{margin-top:6px;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:#fff}'
    + '.cn-red{border-left:4px solid #C0392B}.cn-yellow{border-left:4px solid #D4A017}.cn-unread{border-left:4px solid #8A94A6}'
    + '.cn-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.cn-chip{font-size:12px;font-weight:700;padding:3px 10px;border-radius:8px;background:#EEF1F5;color:#3C4A58}'
    + '.cn-red .cn-chip,.cn-chip.cn-red{background:#FCEBEB;color:#A32D2D}.cn-yellow .cn-chip,.cn-chip.cn-yellow{background:#FAEEDA;color:#854F0B}'
    + '.cn-why{font-size:15px;font-weight:700;color:var(--navy);margin:8px 0 3px}.cn-words{font-size:14px;color:#4a5563;font-family:Georgia,serif;line-height:1.5}'
    + '.cn-hl{padding:0 3px;border-radius:3px}.cn-red .cn-hl{background:#FCEBEB;color:#A32D2D}.cn-yellow .cn-hl{background:#FAEEDA;color:#854F0B}.cn-unread .cn-hl{background:#EEF1F5}'
    + '.cn-count,.cn-done,.cn-tasks{margin-top:4px}.cn-next{margin-top:8px;padding-top:8px;border-top:1px solid var(--border)}.cn-btns{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px}'
    + '.cn-btn{padding:5px 11px;font-size:12.5px;text-decoration:none;display:inline-flex;align-items:center}.cn-call{border:1px solid var(--border-dark,#C9D3DE);border-radius:8px;background:#fff;color:var(--navy,#0E3860);font-weight:600}.cn-call:hover{background:var(--bg,#F6F9FD)}.cn-close{margin:8px 0 2px}.cn-out{display:flex;gap:7px;align-items:center;font-size:13px;margin:3px 0;cursor:pointer}'
    + '.cn-note{margin-top:6px}.cn-usual{margin:4px 0;padding:4px 8px;border-radius:6px;background:#EEF1F5}'
    + '.cn-prof{margin:2px 0 10px;padding:8px 10px;border-radius:8px;background:var(--bg,#F6F9FD)}.cn-prow{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;font-size:13px;padding:3px 0}';
  try{ const st = document.createElement('style'); st.id = 'cnFlagCss'; st.textContent = css; document.head.appendChild(st); }catch(e){}
  /* Settings > Shift-note flags: the two switches (the same ones, with the same questions, as the Owners Hub Admin page) */
  const SW = {
    care_notes_levels_live:{ name:'Red and yellow flags', on:'Turn on red and yellow shift-note flags?\n\nFrom the next shift-note run (every two hours), each flagged note is a red flag (act today, due in 4 hours) or a yellow flag (look within 24 hours), with one sentence of why and the caregiver\'s own words highlighted. A normal day makes no card. Red flags also show on the Incidents owner\'s My Work, and 3 yellow flags for one client in 14 days become one red flag.\n\nNothing is sent to a family or caregiver by itself.',
      off:'Turn off red and yellow flags? Shift notes go back to the older flags ("Possible concern..."). Cards already made keep their color. Red flag texts turn off too.' },
    care_notes_red_text_live:{ name:'Red flag texts', needs:'care_notes_levels_live', needsWhy:'red and yellow flags are off',
      on:'Turn on red flag texts?\n\nEach red flag sends one short text to whoever owns Client Care, between 8am and 9pm only (never at night). The card is on their My Work either way.',
      off:'Turn off red flag texts? Red flags still go on My Work; nobody is texted.' } };
  function cnSetFill(){
    const box = document.getElementById('cnSet'); if(!box) return;
    const st = (typeof DATA !== 'undefined' && DATA.ops_settings) || {};
    box.innerHTML = Object.keys(SW).map(k => { const sw = SW[k], on = st[k] === true, blocked = !on && sw.needs && st[sw.needs] !== true;
      return '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:6px 0;"><b style="font-size:13.5px;min-width:150px;">' + esc(sw.name) + '</b>'
        + '<button class="' + (on ? 'secondary' : 'primary') + '" onclick="cnSetToggle(\'' + k + '\',this)"' + (blocked ? ' disabled title="Can\'t turn on yet: ' + esc(sw.needsWhy) + '."' : '') + '>' + (on ? 'Turn off' : 'Turn on') + '</button>'
        + '<span class="field-note">' + (on ? 'On.' : blocked ? 'Off. Can\'t turn on yet: ' + esc(sw.needsWhy) + '.' : 'Off.') + '</span></div>'; }).join('')
      + '<div class="field-note" id="cnSetMsg"></div>';
  }
  async function cnSetToggle(k, btn){
    const sw = SW[k]; if(!sw) return;
    const st = (typeof DATA !== 'undefined' && DATA.ops_settings) || {}, on = st[k] !== true;
    if(on && sw.needs && st[sw.needs] !== true){ alert('Can\'t turn this on yet: ' + sw.needsWhy + '.'); return; }
    if(!(await ccConfirm(on ? sw.on : sw.off))) return;
    if(btn) btn.disabled = true;
    let refused = false;
    const out = typeof tkMerge === 'function' ? await tkMerge(m => { if(on && sw.needs && m[sw.needs] !== true){ refused = true; return []; }
        m[k] = on; if(!on && k === 'care_notes_levels_live') m.care_notes_red_text_live = false; return [sw.name + (on ? ' ON' : ' OFF')]; }, 'shift-note flags')
      : { error:{ message:'the settings save is not on this page' } };
    if(btn) btn.disabled = false;
    if(!out.error && !refused){ DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { [k]:on }); if(!on && k === 'care_notes_levels_live') DATA.ops_settings.care_notes_red_text_live = false; }
    cnSetFill();
    const msg = document.getElementById('cnSetMsg'); if(msg) msg.textContent = out.error ? 'Could not save: ' + out.error.message : refused ? 'Not changed: ' + sw.needsWhy + '.' : '';
  }
  Object.assign(window, { cnSetFill, cnSetToggle });
  Object.assign(window, { cnNormalOpen, cnNormalSave, cnNormalRemove, cnReopen });
  Object.assign(window, { cnIsFlag:isFlag, cnBlock:block, cnActions:actions, cnStep, cnDid, cnCloseExtra:closeExtra, cnCloseRead:closeRead, cnProfileFlags:profileFlags });
})();
