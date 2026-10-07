/* =====================================================================================================================
   PAUSE CARE and END CARE on the client's profile (Samantha approved 2026-10-07). Care Coordinators and owners.
   · the client's care, at a glance: Active / Starting care / Paused (with the follow-up date) / Past / Deceased
   · Pause care: why (hospital, rehab or skilled nursing, family away, other), from when, the follow-up date, who told us.
     Shift alerts, check-in work and routine outreach stop; one "Is care restarting?" card goes to their Care Coordinator.
   · Resume care · Pause longer · End care: why (her nine reasons; Other needs an explanation), the effective date (the
     last day of service), who told us. The journey and open work close; nothing is deleted; a death adds one sympathy task.
   · Start a new episode (owners, past clients only): a new journey on the same person; the old history stays.
   · The Medicaid checklist on a pause or end: the regulation's steps for a PERSON to do (never automatic), each with how it
     was done, the date and proof, or "not needed" and why. Anything DSDS hasn't answered says so.
   · Imported history: what AxisCare doesn't have reads "not recorded in AxisCare", never a guess.
   Everything goes through the client-journey service (care_* actions). Nothing here texts or emails anyone.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s));
  const CC = { ax:null, data:null, busy:false };
  const day = d => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '';
  const todayYmd = () => new Intl.DateTimeFormat('en-CA', { timeZone:'America/Chicago' }).format(new Date());
  const plus = n => new Intl.DateTimeFormat('en-CA', { timeZone:'America/Chicago' }).format(new Date(Date.now() + n * 864e5));
  const call = b => (typeof cjCall === 'function' ? cjCall(b) : Promise.reject(new Error('The journey service is not loaded.')));
  const STATE = { active:['Active', 'cc-st-active'], starting:['Starting care', 'cc-st-start'], paused:['Paused', 'cc-st-paused'], past:['Past client', 'cc-st-past'], deceased:['Deceased', 'cc-st-dec'] };

  async function mount(p){
    const box = document.getElementById('ccCare'); if(!box) return;
    const ax = p && p.ax ? String(p.ax).trim() : (p && p.lead && p.lead.axiscare_client_id ? String(p.lead.axiscare_client_id).trim() : '');
    CC.ax = ax; CC.data = null; box.innerHTML = '';
    if(!/^\d+$/.test(ax)) return;
    let d; try{ d = await call({ action:'care_state', axiscare_client_id:ax }); }catch(e){ box.innerHTML = '<div class="field-note">Couldn\'t read this client\'s care: ' + esc(e.message) + '</div>'; return; }
    if(CC.ax !== ax) return;
    CC.data = d; render();
  }
  function lastEnd(d){ return (d.changes || []).filter(c => c.kind === 'end').slice(-1)[0] || null; }
  function render(){
    const box = document.getElementById('ccCare'), d = CC.data; if(!box || !d) return;
    const st = STATE[d.state] || null; if(!st) { box.innerHTML = ''; return; }
    let h = '<div class="cc-care ' + st[1] + '"><div class="cc-row"><span class="cc-chip ' + st[1] + '">' + st[0] + '</span>';
    if(d.state === 'paused' && d.pause) h += '<span class="cc-what">Since ' + esc(day(d.pause.paused_from)) + ' · ' + esc((d.reasons.pause || {})[d.pause.reason] || d.pause.reason) + (d.pause.explanation ? ': ' + esc(d.pause.explanation) : '') + ' · <b>follow up ' + esc(day(d.pause.followup_date)) + '</b></span>';
    if(d.state === 'past' || d.state === 'deceased'){
      const role = (d.roles || []).filter(r => r.status !== 'active').slice(-1)[0] || {};
      h += '<span class="cc-what">' + (role.ended_at ? 'Care ended ' + esc(day(role.ended_at)) : 'End date not recorded in AxisCare') + (role.end_reason && !/^deceased$/i.test(role.end_reason) ? ' · ' + esc(role.end_reason) : (role.end_reason ? '' : ' · reason not recorded in AxisCare')) + '</span>';
    }
    h += '<span style="flex:1"></span>';
    if(d.can.resume) h += '<button class="primary" onclick="ccCareForm(\'resume\')">Resume care</button><button class="secondary" onclick="ccCareForm(\'extend\')">Pause longer</button>';
    if(d.can.pause) h += '<button class="secondary" onclick="ccCareForm(\'pause\')">Pause care</button>';
    if(d.can.end) h += '<button class="secondary cc-end-btn" onclick="ccCareForm(\'end\')">End care</button>';
    if(d.can.return) h += '<button class="secondary" onclick="ccCareForm(\'return\')">Start a new episode</button>';
    h += '</div>';
    if(d.state === 'deceased') h += '<div class="field-note cc-quiet">Kept for the record only. No outreach of any kind: no campaigns, review requests, reactivation prompts or follow-up.</div>';
    if(d.state === 'past') h += '<div class="field-note cc-quiet">No journey, reminders, campaigns or review requests. A return starts a new episode, only when a person confirms it.</div>';
    /* the Medicaid checklist on the latest pause or end that has one */
    const ch = (d.changes || []).filter(c => (c.kind === 'pause' || c.kind === 'end') && (c.checklist || []).length).slice(-1)[0];
    if(ch && (ch.kind === 'end' || d.state === 'paused')) h += checklistHtml(ch);
    h += historyHtml(d) + '</div>';
    box.innerHTML = h;
  }
  function checklistHtml(ch){
    const open = (ch.checklist || []).filter(x => x.state === 'open').length;
    return '<details class="cc-check"' + (open ? ' open' : '') + '><summary><b>Medicaid steps for this ' + (ch.kind === 'end' ? 'end of care' : 'pause') + '</b> <span class="field-note">' + (open ? open + ' still to do' : 'all recorded') + ' · a person does each one; the Hub never sends a notice</span></summary>'
      + (ch.checklist || []).map(x => '<div class="cc-ci cc-ci-' + esc(x.state) + '"><div><b>' + esc(x.label) + '</b> <span class="cc-src">Regulation · ' + esc(x.rule) + '</span></div>'
        + '<div class="field-note">' + esc(x.when) + (x.note_needed ? ' ' + esc(x.note_needed) : '') + '</div>'
        + (x.state === 'open' ? '<div class="cc-ci-do"><input placeholder="How it was done (e.g. the form or email used)" data-how="' + esc(x.key) + '"><input type="date" data-on="' + esc(x.key) + '" max="' + todayYmd() + '"><input type="file" data-file="' + esc(x.key) + '">'
            + '<button class="secondary" onclick="ccCareTick(\'' + esc(ch.change_id) + '\',\'' + esc(x.key) + '\',\'done\')">Done</button><button class="linklike" onclick="ccCareTick(\'' + esc(ch.change_id) + '\',\'' + esc(x.key) + '\',\'not_needed\')">Not needed…</button></div>'
          : '<div class="field-note">' + (x.state === 'done' ? '✓ Done' : 'Not needed') + ' by ' + esc(x.by_name || x.by || '') + (x.on ? ', ' + esc(day(x.on)) : '') + (x.how ? ' · ' + esc(x.how) : '') + (x.note ? ' · ' + esc(x.note) : '')
            + (x.files || []).map(p => ' · <button class="linklike" onclick="ccCareFile(\'' + esc(ch.change_id) + '\',\'' + esc(p) + '\')">' + esc(p.split('/').pop().replace(/^\d+-/, '')) + '</button>').join('') + '</div>')
        + '</div>').join('') + '</details>';
  }
  const KIND = { pause:'Paused', extend:'Pause made longer', resume:'Care resumed', end:'Care ended', return:'New episode started' };
  function historyHtml(d){
    const eps = d.episodes || [], ch = d.changes || [];
    if(eps.length < 2 && !ch.length) return '';
    return '<details class="cc-hist"><summary>Care history</summary>'
      + eps.map(e => '<div class="cc-ev"><b>Episode ' + (e.episode_n || 1) + '</b> · started ' + esc(day(e.created_at)) + ' · ' + (e.status === 'closed' ? esc(e.closed_reason || 'closed') : e.status === 'active' ? 'start of care complete' : 'under way') + '</div>').join('')
      + ch.map(c => '<div class="cc-ev">' + esc(day(c.effective_date)) + ' · <b>' + esc(KIND[c.kind] || c.kind) + '</b>' + (c.reason ? ' · ' + esc(((d.reasons[c.kind === 'end' ? 'end' : 'pause'] || {})[c.reason]) || c.reason) : '') + (c.explanation ? ': ' + esc(c.explanation) : '')
        + (c.notified_by ? ' · told by ' + esc(c.notified_by) : '') + ' <span class="field-note">recorded by ' + esc(c.made_by_name || c.made_by) + ', ' + esc(new Date(c.made_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })) + (c.source === 'axiscare_review' ? ', from an AxisCare status change' : '') + '</span></div>').join('')
      + '</details>';
  }

  /* ── the forms ── */
  function form(kind, opts){
    opts = opts || {};
    const d = CC.data || {}, R = d.reasons || {};
    const ov = document.createElement('div'); ov.className = 'cc-ov';
    const T = { pause:'Pause care', extend:'Pause longer', resume:'Resume care', end:'End care', return:'Start a new episode' }[kind];
    const name = d.client_name || 'this client';
    const sel = (id, list) => '<select id="' + id + '"><option value="">Choose…</option>' + Object.keys(list).map(k => '<option value="' + k + '">' + esc(list[k]) + '</option>').join('') + '</select>';
    let f = '';
    if(kind === 'pause') f = '<label>Why <span class="cc-req">required</span></label>' + sel('ccR', R.pause || {})
      + '<label>Explanation <span class="cc-req" id="ccWhyReq" hidden>required for Other</span></label><input id="ccX" placeholder="e.g. Mercy, pneumonia">'
      + '<label>Paused from <span class="cc-req">required</span></label><input type="date" id="ccD" value="' + todayYmd() + '">'
      + '<label>Follow up on <span class="cc-req">required</span></label><input type="date" id="ccF" value="' + plus(7) + '"><div class="field-note">That day, ' + esc(name) + '\'s Care Coordinator gets "Is care restarting?"</div>'
      + '<label>Who told us</label><input id="ccN" placeholder="e.g. their daughter, the hospital, DSDS">';
    if(kind === 'extend') f = '<label>New follow-up date <span class="cc-req">required</span></label><input type="date" id="ccF" value="' + plus(7) + '" min="' + todayYmd() + '"><label>Why</label><input id="ccX"><label>Who told us</label><input id="ccN">';
    if(kind === 'resume') f = '<label>Care resumed on</label><input type="date" id="ccD" value="' + todayYmd() + '" max="' + todayYmd() + '"><label>Note</label><input id="ccX"><label>Who told us</label><input id="ccN">'
      + '<div class="field-note">Their journey, shift alerts and check-in work come back as they were.</div>';
    if(kind === 'end') f = '<label>Why care ended <span class="cc-req">required</span></label>' + sel('ccR', R.end || {})
      + '<label>Explanation <span class="cc-req" id="ccWhyReq" hidden>required for Other</span></label><input id="ccX">'
      + '<label>Effective date: the last day of service <span class="cc-req">required</span></label><input type="date" id="ccD" value="' + esc(opts.date || todayYmd()) + '" max="' + todayYmd() + '">'
      + '<label>Who told us</label><input id="ccN" placeholder="e.g. the family, the facility, DSDS, AxisCare">'
      + '<div class="field-note">Their journey and open work close with this reason; nothing is deleted. If they are on Medicaid, the steps the regulation requires appear as a checklist for a person to do.</div>';
    if(kind === 'return') f = '<div class="field-note" style="margin-bottom:6px;">' + esc(name) + ' was served before. A new episode and journey start on the same person; their earlier history stays as it is.</div>'
      + '<label>Care resumes on</label><input type="date" id="ccD" value="' + todayYmd() + '" max="' + todayYmd() + '"><label>Note</label><input id="ccX" placeholder="e.g. family called, back from rehab"><label>Who told us</label><input id="ccN">';
    ov.innerHTML = '<div class="cc-dlg" role="dialog" aria-modal="true"><div class="cc-dlg-t">' + esc(T) + ' · ' + esc(name) + '</div>' + (opts.review_id ? '<div class="field-note">Answers the AxisCare status change.</div>' : '')
      + '<div class="cc-form">' + f + '</div><div class="cc-err" id="ccErr"></div><div class="cc-act"><button class="primary" id="ccGo">' + esc(T) + '</button><button class="secondary" id="ccNo">Cancel</button></div></div>';
    document.body.appendChild(ov);
    const v = id => { const el = ov.querySelector('#' + id); return el ? el.value.trim() : ''; }, close = () => ov.remove();
    const r = ov.querySelector('#ccR'); if(r) r.onchange = () => { const q = ov.querySelector('#ccWhyReq'); if(q) q.hidden = r.value !== 'other'; };
    ov.querySelector('#ccNo').onclick = close;
    ov.querySelector('#ccGo').onclick = async () => {
      const err = ov.querySelector('#ccErr'), say = t => { err.textContent = t; };
      if((kind === 'pause' || kind === 'end') && !v('ccR')) return say('Pick the reason.');
      if(v('ccR') === 'other' && !v('ccX')) return say('Explain, for Other.');
      if((kind === 'pause' || kind === 'end') && !v('ccD')) return say('The date is required.');
      if((kind === 'pause' || kind === 'extend') && !v('ccF')) return say('A follow-up date is required.');
      const b = { action:'care_' + kind, axiscare_client_id:CC.ax, reason:v('ccR') || undefined, explanation:v('ccX') || undefined, effective_date:v('ccD') || undefined,
        followup_date:v('ccF') || undefined, notified_by:v('ccN') || undefined, review_id:opts.review_id || undefined };
      const go = ov.querySelector('#ccGo'); go.disabled = true; go.textContent = 'Saving…';
      let out; try{ out = await call(b); }catch(e){ out = { error:e.message }; }
      if(!out || out.error){ go.disabled = false; go.textContent = T; return say((out && out.error) || 'Not saved.'); }
      close();
      if(typeof ccToast === 'function') ccToast({ pause:'Care paused. The restart follow-up is on their Care Coordinator\'s My Work.', extend:'Follow-up moved.', resume:'Care resumed.', end:'Care ended.' + (out.sympathy ? ' A sympathy-card task is on My Work.' : ''), return:'New episode started.' }[kind]);
      try{ if(typeof cjListRefresh === 'function') cjListRefresh(); }catch(e){}
      try{ if(typeof opsLoad === 'function') opsLoad(); }catch(e){}
      await mount({ ax:CC.ax });
      try{ if(typeof CP !== 'undefined' && typeof cjMountProfile === 'function') cjMountProfile({ lead:CP.lead, ax:CP.ax }); }catch(e){}
      if(opts.after) try{ opts.after(out); }catch(e){}
    };
  }
  async function tick(changeId, key, state){
    const row = document.querySelector('.cc-check [data-how="' + key + '"]'), how = row ? row.value.trim() : '';
    const onEl = document.querySelector('.cc-check [data-on="' + key + '"]'), fileEl = document.querySelector('.cc-check [data-file="' + key + '"]');
    let note = '';
    if(state === 'not_needed'){ note = (window.prompt && window.prompt('Why isn\'t this step needed?')) || ''; if(!note.trim()) return; }
    const files = [];
    if(fileEl && fileEl.files && fileEl.files[0]){
      try{ const u = await call({ action:'care_upload_url', change_id:changeId, item:key, name:fileEl.files[0].name });
        const { error } = await sb.storage.from('client-journey-files').uploadToSignedUrl(u.path, u.token, fileEl.files[0]); if(error) throw error; files.push(u.path); }
      catch(e){ if(typeof ccToast === 'function') ccToast('The proof didn\'t upload: ' + (e.message || e)); return; }
    }
    let out; try{ out = await call({ action:'care_checklist', change_id:changeId, item:key, state, how, note, on:(onEl && onEl.value) || undefined, files }); }catch(e){ out = { error:e.message }; }
    if(out && out.error){ if(typeof ccToast === 'function') ccToast(out.error); return; }
    await mount({ ax:CC.ax });
  }
  async function openFile(changeId, path){ try{ const d = await call({ action:'care_file_url', change_id:changeId, path }); window.open(d.url, '_blank', 'noopener'); }catch(e){ if(typeof ccToast === 'function') ccToast('Couldn\'t open it: ' + e.message); } }
  /* from an AxisCare status review: the same forms, answering the review */
  async function fromReview(kind, ax, reviewId, date){ CC.ax = String(ax); try{ CC.data = await call({ action:'care_state', axiscare_client_id:CC.ax }); }catch(e){ CC.data = null; }
    if(!CC.data){ if(typeof ccToast === 'function') ccToast('Couldn\'t read this client\'s care.'); return; }
    form(kind, { review_id:reviewId, date }); }

  try{ const st = document.createElement('style'); st.textContent = [
    '.cc-care{background:#fff;border:1px solid var(--border);border-radius:12px;padding:10px 14px;margin:0 0 12px}.cc-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '.cc-chip{font:800 12px/1 inherit;padding:6px 9px;border-radius:6px;white-space:nowrap}.cc-what{font-size:13.5px;color:var(--text)}',
    '.cc-st-active .cc-chip,.cc-chip.cc-st-active{background:#E6F4EC;color:#1E7B45}.cc-chip.cc-st-start{background:#E7EEFC;color:#1E4FB8}.cc-chip.cc-st-paused{background:#FFF4E1;color:#9A6412}.cc-chip.cc-st-past{background:#EEF2F6;color:#3E4C5E}.cc-chip.cc-st-dec{background:#ECEAE6;color:#4A4740}',
    '.cc-care.cc-st-paused{border-color:#E9C98B;background:#FFFBF2}.cc-care.cc-st-dec{background:#F7F6F3}.cc-quiet{margin-top:6px}.cc-end-btn{color:#9A2B20}',
    '.cc-check{margin-top:10px;border-top:1px solid var(--border);padding-top:8px}.cc-check summary{cursor:pointer;font-size:14px}.cc-ci{border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-top:8px}.cc-ci-done,.cc-ci-not_needed{background:#F6F9FD}',
    '.cc-src{font-size:11.5px;font-weight:700;color:#6B4FBB;background:#F1EBFB;border-radius:4px;padding:2px 6px;margin-left:4px}.cc-ci-do{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;align-items:center}.cc-ci-do input{width:auto;min-width:0;flex:1 1 180px}',
    '.cc-hist{margin-top:8px;font-size:13.5px}.cc-hist summary{cursor:pointer;font-weight:700;color:var(--navy)}.cc-ev{padding:4px 0;border-top:1px dashed var(--border)}',
    '.cc-ov{position:fixed;inset:0;background:rgba(13,54,95,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto}',
    '.cc-dlg{background:#fff;border-radius:14px;max-width:520px;width:100%;padding:18px 20px;box-shadow:0 20px 50px rgba(0,0,0,.25)}.cc-dlg-t{font-weight:800;color:var(--navy);font-size:17px;margin-bottom:6px}',
    '.cc-form label{display:block;font-size:13px;font-weight:700;color:var(--navy);margin:10px 0 3px}.cc-form input,.cc-form select{width:100%;box-sizing:border-box}.cc-req{color:#B42318;font-weight:600;font-size:11.5px}',
    '.cc-err{color:#B42318;font-weight:600;font-size:13px;margin-top:8px}.cc-err:empty{display:none}.cc-act{display:flex;gap:8px;margin-top:14px}'
  ].join(''); document.head.appendChild(st); }catch(e){}
  Object.assign(window, { ccCareMount:mount, ccCareForm:form, ccCareTick:tick, ccCareFile:openFile, ccCareFromReview:fromReview, CC_CARE:CC });
})();
