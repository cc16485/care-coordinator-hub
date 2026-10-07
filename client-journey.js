/* =====================================================================================================================
   CLIENT JOURNEY on the profile (Stages 1–3, Samantha approved 2026-10-06). Reads and changes the ONE journey through
   the client-journey function; decides nothing on its own beyond what journey-rules.js (the same file the server runs)
   says. What she asked for on screen:
     · the top of every profile: stage, payer, target start, who owns it, the progress rail
     · NEXT REQUIRED STEP: what, owner, status, how to do it, how we'll know, who did it and when. Then "Coming next".
     · "Great. Here's the next thing." after each step
     · the whole journey (Start of Care tab) only when someone wants it: grouped by stage, each step with its evidence and
       history, so the journey is the audit trail
     · Waiting always needs a check-back date; Blocked says why and who unblocks it; only an owner can allow an exception
   Links: #p/<ref>/<tab>/<step>, where ref is A<AxisCare number>, L<inquiry number> or J<journey id>. Ids only, never names.
   ===================================================================================================================== */
(function(){
  'use strict';
  const R = window.JourneyRules;
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s));
  const CJ = { key:null, data:null, view:null, sel:null, mode:null, files:{}, form:{}, flash:'', busy:false, focus:null, err:'' };
  const lc = s => String(s || '').trim().toLowerCase();
  const live = () => !!(typeof DATA !== 'undefined' && DATA.ops_settings && DATA.ops_settings.client_journey_live === true);
  const owner = () => { try{ return ccIsOwner(); }catch(e){ return false; } };
  const me = () => { try{ return lc(ccActor().email); }catch(e){ return ''; } };
  const nameOf = e => { const n = CJ.data && CJ.data.names && CJ.data.names[lc(e)]; return n || (e ? String(e).split('@')[0] : ''); };
  const first = e => String(nameOf(e)).split(' ')[0];
  const day = d => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) : '';
  const when = t => t ? new Date(t).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : '';
  const todayYmd = () => R.ymd(Date.now());

  async function call(body){
    const { data:{ session } } = await sb.auth.getSession(); if(!session) throw new Error('Sign in first.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/client-journey', { method:'POST', headers:{ Authorization:'Bearer ' + session.access_token, apikey:CONFIG.supabase_anon_key, 'Content-Type':'application/json' }, body:JSON.stringify(body) });
    const d = await r.json().catch(() => null); if(!d) throw new Error('The journey service answered ' + r.status);
    if(d.error && !d.outcome) throw new Error(d.error);
    return d;
  }
  function compute(){
    const d = CJ.data; if(!d || !d.journey){ CJ.view = null; return; }
    CJ.view = R.compute(d.defs, d.journey, d.steps, Object.assign({}, d.ctx || {}, { today:todayYmd() }));
  }
  const rowOf = k => CJ.view && CJ.view.rows.find(r => r.key === k);
  const evOf = k => ((CJ.data && CJ.data.events) || []).filter(e => e.step_key === k);
  const STATUS = { ready:['Ready', 'cj-s-ready'], waiting:['Waiting', 'cj-s-wait'], blocked:['Blocked', 'cj-s-block'], attention:['Needs attention', 'cj-s-attn'],
    complete:['Complete', 'cj-s-done'], exception:['Owner exception', 'cj-s-exc'], not_needed:['Not needed', 'cj-s-na'], later:['Later', 'cj-s-na'] };
  const chip = st => '<span class="cj-chip ' + (STATUS[st] || STATUS.later)[1] + '">' + (STATUS[st] || STATUS.later)[0] + '</span>';
  const ownerWords = r => r.owner.how === 'owners' ? 'An owner (Samantha or Zachary)' : r.owner.email ? nameOf(r.owner.email) + ' (' + R.ROLE_LABEL[r.def.owner_role] + ')' : (r.def.owner_role === 'hub' ? 'The Hub' : 'Nobody yet (' + R.ROLE_LABEL[r.def.owner_role] + ')');

  /* ── mounting on the profile ── */
  async function mountProfile(p){
    const head = document.getElementById('cjHead'), start = document.getElementById('cjStart');
    if(!head || !start) return;
    const lead = p && p.lead, ax = p && p.ax ? String(p.ax) : '';
    const key = lead ? 'L' + lead.id : ax ? 'A' + ax : null;
    CJ.key = key; CJ.data = null; CJ.view = null; CJ.sel = null; CJ.mode = null; CJ.flash = ''; CJ.err = '';
    head.innerHTML = ''; start.innerHTML = ''; showOld(true);
    if(!key) return;
    const testLead = !!(lead && lead.is_test);
    if(!live() && !(owner() && testLead)) return;   /* switched off: only an owner, only on a TEST client */
    head.innerHTML = '<div class="cj-loading field-note">Reading this person\'s journey…</div>';
    let d; try{ d = await call(lead ? { action:'get', lead_id:lead.id } : { action:'get', axiscare_client_id:ax }); }catch(e){ head.innerHTML = '<div class="cj-err">Couldn\'t read the journey: ' + esc(e.message) + '</div>'; return; }
    if(CJ.key !== key) return;
    CJ.data = d; compute();
    if(!d.journey){ head.innerHTML = startHtml(lead, ax, testLead); wireStart(lead, ax, testLead);
      /* live: the journey is the only way to start; the older checklist shows only for someone who already has one */
      if(live() && !(lead && lead.soc)){ const el = document.getElementById('lp_soc_body'); if(el) el.style.display = 'none'; }
      return; }
    if(CJ.focus){ const f = CJ.focus; CJ.focus = null; if(rowOf(f)) CJ.sel = f; }
    render();
  }
  /* while a journey speaks for this person, the older checklists, the older stage path and the older stage chip step
     aside, so two progress systems never show at once */
  function showOld(on){
    ['lp_soc_body', 'cp_launch', 'cpcPath'].forEach(id => { const el = document.getElementById(id); if(el) el.style.display = on ? '' : 'none'; });
    const chips = document.getElementById('cpChips'), st = chips && chips.querySelector('.tag-chip[title]');
    if(st) st.style.display = on ? '' : 'none';
  }
  function startHtml(lead, ax, testLead){
    const pay = lead ? String(lead.funding_source || '') : '';
    if(/cds/i.test(pay)) return '<div class="cj-card"><b>CDS</b> is its own program, so it doesn\'t use the client journey.</div>';
    return '<div class="cj-card cj-start"><div><b>No journey yet.</b> Start one and the Hub walks you through every step from here to an active client.' + (testLead ? ' <span class="cj-chip cj-s-exc">TEST client</span>' : '') + '</div>'
      + '<button class="primary" id="cjStartBtn">Start ' + (testLead ? 'a TEST journey' : 'the journey') + '</button></div>';
  }
  function wireStart(lead, ax, testLead){
    const b = document.getElementById('cjStartBtn'); if(!b) return;
    b.onclick = async () => { b.disabled = true; b.textContent = 'Starting…';
      try{ const d = await call(Object.assign({ action:'open', is_test:testLead }, lead ? { lead_id:lead.id } : { axiscare_client_id:ax }));
        if(d.error){ throw new Error(d.error); } CJ.flash = 'Journey started.'; listRefresh(); await reload(); }
      catch(e){ b.disabled = false; b.textContent = 'Start the journey'; ccToast('Couldn\'t start it: ' + e.message); } };
  }
  async function reload(){
    const j = CJ.data && CJ.data.journey;
    const d = await call(j ? { action:'get', journey_id:j.journey_id } : (CP.lead ? { action:'get', lead_id:CP.lead.id } : { action:'get', axiscare_client_id:CP.ax }));
    CJ.data = d; compute(); render();
  }

  /* ── the top of the profile ── */
  function render(){
    const head = document.getElementById('cjHead'), start = document.getElementById('cjStart');
    if(!head || !CJ.view) return;
    showOld(false);
    const d = CJ.data, j = d.journey, v = CJ.view;
    const payer = j.payer ? R.PAYERS[j.payer] + (j.payer === 'other' && j.payer_other ? ': ' + j.payer_other : '') : 'Payer not set';
    const status = j.status === 'active' ? 'Active client' : v.stop ? 'Stopped' : v.stageLabel;
    let h = '<div class="cj-head">'
      + '<div class="cj-meta">' + (j.is_test ? '<span class="cj-chip cj-s-exc">TEST</span> ' : '') + '<b>' + esc(payer) + '</b> · <b>' + esc(status) + '</b>'
      + ' · Target start <button class="linklike cj-start-date" onclick="cjEditStart(this)">' + (j.target_start ? esc(day(j.target_start)) : 'not set') + '</button>'
      + ' · Care Coordinator: <button class="linklike" onclick="cjAssignCc(this)">' + esc(j.assigned_cc ? nameOf(j.assigned_cc) : 'nobody') + '</button>'
      + ' · Staffing: ' + esc(nameOf((d.ctx || {}).staffing_email) || 'nobody yet') + '</div>'
      + '<div class="cj-rail" role="list">' + v.rail.map(s => '<button type="button" role="listitem" class="cj-st cj-st-' + s.state + '" onclick="cjShowStage(\'' + s.key + '\')">' + esc(s.label) + '</button>').join('') + '</div>';
    if(v.stop && !CJ.sel) h += '<div class="cj-flash cj-flash-stop">Stopped at "' + esc(v.stop.def.title) + '": ' + esc(v.stop.why) + '</div>';
    else if(CJ.flash) h += '<div class="cj-flash">' + esc(CJ.flash) + '</div>';
    const sel = CJ.sel && rowOf(CJ.sel), r = sel || v.next;
    if(j.status === 'active') h += '<div class="cj-next cj-done-all"><div class="cj-k">Start of care complete</div><div class="cj-t">' + esc(cpName()) + ' is an active client.</div><div class="field-note">The whole journey stays on the Start of Care tab as the record of how they started.</div></div>';
    else if(r) h += stepCard(r, !sel || sel === v.next);
    else h += '<div class="cj-next"><div class="cj-t">Nothing is up right now.</div></div>';
    if(j.status !== 'active'){
      if(v.alsoReady.length) h += '<div class="cj-also"><span class="cj-k">Also ready now</span> ' + v.alsoReady.filter(x => x !== r).map(x => '<button class="linklike" onclick="cjPick(\'' + x.key + '\')">' + esc(x.def.title) + '</button>').join(' · ') + '</div>';
      if(v.comingNext.length) h += '<div class="cj-coming"><span class="cj-k">Coming next</span> ' + v.comingNext.map(x => esc(x.def.title)).join(' · ') + ' <button class="linklike" onclick="cpShowTab(\'start\')">See the whole journey</button></div>';
    }
    h += '</div>';
    head.innerHTML = h;
    wireForm(head);
    if(start) start.innerHTML = fullHtml();
    if(start) wireForm(start);
  }
  function cpName(){ return (CJ.data && CJ.data.journey && CJ.data.journey.client_name) || 'This client'; }

  /* ── one step: what, owner, status, how, how we'll know, who/when ── */
  function stepCard(r, isNext){
    const def = r.def, st = r.st, done = R.DONE.indexOf(r.status) > -1;
    let h = '<div class="cj-next' + (r.status === 'blocked' || r.status === 'attention' ? ' cj-next-red' : '') + '" data-step="' + esc(r.key) + '">'
      + '<div class="cj-k">' + (isNext ? 'Next required step' : 'Step') + (isNext ? '' : ' <button class="linklike" onclick="cjPick(null)">back to the next step</button>') + '</div>'
      + '<div class="cj-t">' + esc(def.title) + '</div>'
      + chip(r.status) + (r.due && !done ? ' <span class="cj-chip cj-s-na">Due ' + esc(day(r.due)) + '</span>' : '')
      + '<dl class="cj-kv"><dt>Owner</dt><dd>' + esc(ownerWords(r)) + '</dd>'
      + '<dt>How we\'ll know</dt><dd>' + esc(R.PROOF_LABEL[def.proof] || '') + '</dd>'
      + (r.why || r.attention ? '<dt>' + (r.status === 'blocked' ? 'Why' : 'Note') + '</dt><dd class="' + (r.status === 'blocked' || r.status === 'attention' ? 'cj-red' : '') + '">' + esc(r.attention || r.why) + (r.unblock ? '<br>Unblocks when: ' + esc(r.unblock) : '') + '</dd>' : '')
      + (done ? evidenceHtml(r) : '')
      + '</dl>';
    if(!done && r.status !== 'later') h += formHtml(r);
    else if(done) h += '<div class="cj-actions">' + (owner() || r.st.state !== 'exception' ? '<button class="ghost" data-act="reopen-open">Reopen…</button>' : '') + '</div>' + modeHtml(r);
    if(def.howto && def.howto.length) h += '<details class="cj-howto"' + (CJ.mode === 'howto' ? ' open' : '') + '><summary>Show me how</summary><ol>' + def.howto.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol></details>';
    return h + '</div>';
  }
  function evidenceHtml(r){
    const st = r.st, ev = st.evidence || {}, a = st.answer || {}, out = [];
    const fields = (r.def.answer && r.def.answer.fields) || [];
    fields.forEach(f => { if(a[f.key] === undefined || a[f.key] === '' || a[f.key] === null) return;
      const v = f.type === 'select' ? ((f.options || []).find(o => o.v === a[f.key]) || {}).l || a[f.key] : f.type === 'check' ? (a[f.key] ? '✓' : '✗') : f.type === 'date' ? day(a[f.key]) : a[f.key];
      out.push('<dt>' + esc(f.label) + '</dt><dd>' + esc(v) + '</dd>'); });
    if(ev.verified) out.push('<dt>Verified</dt><dd>' + esc(ev.verified.detail) + ' · ' + esc(when(ev.verified.at)) + '</dd>');
    if(ev.manual) out.push('<dt>Confirmed by hand</dt><dd>' + esc(ev.manual.reason) + '</dd>');
    (ev.files || []).forEach(p => out.push('<dt>Proof</dt><dd><button class="linklike" data-file="' + esc(p) + '">' + esc(p.split('/').pop().replace(/^\d+-/, '')) + '</button></dd>'));
    if(ev.note) out.push('<dt>Note</dt><dd>' + esc(ev.note) + '</dd>');
    if(st.exception) out.push('<dt>Owner exception</dt><dd class="cj-violet">' + esc(R.EXCEPTION_KINDS[st.exception.kind] || 'Exception') + ' by ' + esc(st.exception.by_name || st.exception.by) + ', ' + esc(when(st.exception.at)) + ': "' + esc(st.exception.reason) + '"</dd>');
    if(st.completed_at && !st.exception) out.push('<dt>Done by</dt><dd>' + esc(st.completed_by_name || nameOf(st.completed_by)) + ', ' + esc(when(st.completed_at)) + '</dd>');
    if(r.status === 'not_needed') out.push('<dt>Not needed</dt><dd>' + esc(((evOf(r.key).find(e => e.kind === 'not_needed') || {}).reason) || '') + '</dd>');
    return out.join('');
  }
  /* the answers, the proof, and the buttons; the server checks everything again */
  function formHtml(r){
    const def = r.def, F = CJ.form[r.key] || (CJ.form[r.key] = Object.assign({}, r.st.answer || {})), files = CJ.files[r.key] || [];
    let h = '<div class="cj-form">';
    const fields = (def.answer && def.answer.fields) || [];
    fields.forEach(f => { if(!R.shown(f, F)) return; const id = 'cjf_' + r.key.replace(/\W/g, '_') + '_' + f.key, v = F[f.key];
      if(f.type === 'check') h += '<label class="cj-check"><input type="checkbox" id="' + id + '" data-f="' + esc(f.key) + '"' + (v === true ? ' checked' : '') + '> ' + esc(f.label) + '</label>';
      else { h += '<label class="cj-field" for="' + id + '">' + esc(f.label) + (f.required === false ? ' <span class="field-note">(optional)</span>' : '') + '</label>';
        if(f.type === 'select') h += '<select id="' + id + '" data-f="' + esc(f.key) + '"><option value="">Choose…</option>' + (f.options || []).map(o => '<option value="' + esc(o.v) + '"' + (v === o.v ? ' selected' : '') + '>' + esc(o.l) + '</option>').join('') + '</select>';
        else h += '<input id="' + id + '" data-f="' + esc(f.key) + '" type="' + (f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text') + '" value="' + esc(v == null ? '' : v) + '">'; } });
    if(def.proof === 'proof'){
      h += '<div class="cj-files"><label class="cj-field">Proof</label>' + files.map((p, i) => '<span class="cj-file">' + esc(p.name) + (p.path ? ' ✓' : ' (uploading…)') + ' <button class="linklike" data-unfile="' + i + '">remove</button></span>').join('')
        + '<input type="file" id="cjfile_' + r.key.replace(/\W/g, '_') + '" data-upload="1" accept="image/*,application/pdf" multiple></div>';
    }
    h += '<div class="cj-err" data-err></div><div class="cj-actions">';
    if(def.proof === 'verified'){
      h += '<button class="primary" data-act="check">Check now</button><button class="ghost" data-act="manual-open">Confirm by hand…</button>';
    } else h += '<button class="primary" data-act="complete">' + (fields.length ? 'Save and finish this step' : 'Done') + '</button>';
    if(r.status !== 'waiting') h += '<button class="ghost" data-act="wait-open">Waiting on someone…</button>';
    if(r.status !== 'blocked') h += '<button class="ghost" data-act="block-open">Blocked…</button>';
    if(r.st.state === 'blocked' || r.st.state === 'waiting') h += '<button class="ghost" data-act="unblock">' + (r.st.state === 'waiting' ? 'It\'s back now' : 'Unblock') + '</button>';
    if(def.required === false || owner()) h += '<button class="ghost" data-act="na-open">Not needed…</button>';
    if(owner() && (r.stop || r.status === 'blocked')) h += '<button class="cj-violet-btn" data-act="exc-open">Owner exception…</button>';
    h += '<button class="ghost" data-act="assign-open">Give this step to…</button>';
    h += '</div>' + modeHtml(r) + '</div>';
    return h;
  }
  function modeHtml(r){
    const m = CJ.mode; if(!m || m === 'howto') return '';
    const people = ((CJ.data && CJ.data.office) || []).map(p => '<option value="' + esc(p.email) + '">' + esc(p.name) + '</option>').join('');
    if(m === 'wait') return '<div class="cj-mode"><label class="cj-field">Waiting on whom or what?</label><input data-m="waiting_on" placeholder="the case manager, the family, the state…">'
      + '<label class="cj-field">Check back on (required)</label><input type="date" data-m="check_back" min="' + todayYmd() + '"><div class="field-note">On that day it comes back to the owner\'s My Work by itself.</div>'
      + '<div class="cj-actions"><button class="primary" data-act="wait">Park it until then</button><button class="ghost" data-act="cancel">Cancel</button></div></div>';
    if(m === 'block') return '<div class="cj-mode"><label class="cj-field">Why is it blocked?</label><input data-m="reason" placeholder="Medicaid care plan missing">'
      + '<label class="cj-field">What unblocks it?</label><input data-m="unblock" placeholder="The care plan is uploaded">'
      + '<label class="cj-field">Who can unblock it?</label><select data-m="unblock_role"><option value="care_coordinator">The Care Coordinator</option><option value="owner">An owner decides</option><option value="staffing_coordinator">The Staffing Coordinator</option></select>'
      + '<div class="cj-actions"><button class="primary" data-act="block">Mark blocked</button><button class="ghost" data-act="cancel">Cancel</button></div></div>';
    if(m === 'manual') return '<div class="cj-mode"><label class="cj-field">Why confirm it by hand? (the Hub couldn\'t see it)</label><input data-m="manual_reason"><div class="cj-actions"><button class="primary" data-act="manual">Confirm by hand</button><button class="ghost" data-act="cancel">Cancel</button></div></div>';
    if(m === 'na') return '<div class="cj-mode"><label class="cj-field">Why isn\'t this step needed?</label><input data-m="reason"><div class="cj-actions"><button class="primary" data-act="na">Mark not needed</button><button class="ghost" data-act="cancel">Cancel</button></div></div>';
    if(m === 'reopen') return '<div class="cj-mode"><label class="cj-field">Why reopen it? (what it was stays in the history)</label><input data-m="reason"><div class="cj-actions"><button class="primary" data-act="reopen">Reopen</button><button class="ghost" data-act="cancel">Cancel</button></div></div>';
    if(m === 'assign') return '<div class="cj-mode"><label class="cj-field">Who should do this step?</label><select data-m="email"><option value="">The role holder (default)</option>' + people + '</select><div class="cj-actions"><button class="primary" data-act="assign">Give it to them</button><button class="ghost" data-act="cancel">Cancel</button></div></div>';
    if(m === 'exc') return '<div class="cj-mode cj-mode-exc"><b class="cj-violet">Owner exception (Samantha or Zachary only)</b>'
      + '<label class="cj-field">Kind</label><select data-m="kind">' + Object.keys(R.EXCEPTION_KINDS).map(k => '<option value="' + k + '"' + (k === (r.def.exception_kind || 'hard_stop') ? ' selected' : '') + '>' + esc(R.EXCEPTION_KINDS[k]) + '</option>').join('') + '</select>'
      + '<label class="cj-field">Why is it OK to continue? (required, kept permanently)</label><textarea data-m="reason" rows="3"></textarea>'
      + '<div class="field-note">Saved with your name and the time. It can\'t be edited or removed.</div>'
      + '<div class="cj-actions"><button class="cj-violet-btn" data-act="exc">Allow with exception</button><button class="ghost" data-act="cancel">Keep it stopped</button></div></div>';
    return '';
  }

  /* ── the whole journey (Start of Care tab) ── */
  function fullHtml(){
    const v = CJ.view; if(!v) return '';
    const filt = CJ.filter || 'all', mine = me();
    let h = '<div class="cj-full"><div class="cj-full-top"><b>The whole journey</b><span class="field-note"> ' + v.rows.filter(r => R.DONE.indexOf(r.status) > -1).length + ' of ' + v.rows.length + ' steps done</span>'
      + '<span style="flex:1"></span>' + ['all', 'open', 'mine'].map(f => '<button class="fb' + (filt === f ? ' active' : '') + '" onclick="cjFilter(\'' + f + '\')">' + { all:'Everything', open:'Open', mine:'Mine' }[f] + '</button>').join('') + '</div>';
    R.STAGES.forEach(s => {
      const rows = v.rows.filter(r => r.def.stage === s).filter(r => filt === 'all' || (filt === 'open' && R.DONE.indexOf(r.status) < 0) || (filt === 'mine' && r.owner.email === mine && R.DONE.indexOf(r.status) < 0));
      if(!rows.length) return;
      const railS = v.rail.find(x => x.key === s) || {};
      h += '<div class="cj-stage" id="cjstage_' + s + '"><div class="cj-stage-h">' + esc(R.STAGE_LABEL[s]) + ' <span class="field-note">· ' + ({ done:'complete', now:'now', stopped:'stopped', todo:'' }[railS.state] || '') + '</span></div>';
      rows.forEach(r => {
        const open = CJ.sel === r.key, done = R.DONE.indexOf(r.status) > -1;
        const sub = done ? (r.st.exception ? 'Owner exception · ' + (r.st.exception.by_name || '') : (r.st.completed_by_name || nameOf(r.st.completed_by) || '') + (r.st.completed_at ? ', ' + when(r.st.completed_at) : ''))
          : r.status === 'later' ? (r.why || '') : ownerWords(r) + (r.due ? ' · due ' + day(r.due) : '') + (r.why ? ' · ' + r.why : '');
        h += '<div class="cj-row cj-row-' + r.status + (open ? ' cj-row-open' : '') + '" id="cjrow_' + r.key.replace(/\W/g, '_') + '"><button class="cj-row-h" onclick="cjPick(\'' + r.key + '\', true)">'
          + '<span class="cj-ic cj-ic-' + r.status + '">' + ({ complete:'✓', exception:'E', not_needed:'–', blocked:'!', attention:'!', waiting:'…', ready:'→', later:'·' }[r.status] || '·') + '</span>'
          + '<span class="cj-row-t">' + esc(r.def.title) + ' ' + (r.status !== 'later' ? chip(r.status) : '') + '<span class="cj-row-s">' + esc(sub) + '</span></span></button>';
        if(open) h += '<div class="cj-row-body">' + stepCard(r, false) + historyHtml(r) + '</div>';
        h += '</div>';
      });
      h += '</div>';
    });
    const jev = ((CJ.data && CJ.data.events) || []).filter(e => !e.step_key);
    if(jev.length) h += '<details class="cj-hist"><summary>Journey history (' + jev.length + ')</summary>' + jev.map(evLine).join('') + '</details>';
    return h + '</div>';
  }
  const EV_WORDS = { created:'Journey started', completed:'Completed', confirmed_by_hand:'Confirmed by hand', verified:'Verified by the Hub', waiting:'Waiting', back_from_waiting:'Back from waiting', blocked:'Blocked', unblocked:'Unblocked',
    reopened:'Reopened', not_needed:'Marked not needed', owner_exception:'Owner exception', step_assigned:'Step given to', reassigned_cc:'Care Coordinator changed', target_start:'Target start changed', became_active:'Became an active client' };
  function evLine(e){
    const d = e.detail || {}, extra = e.kind === 'waiting' ? ' on ' + (d.waiting_on || '') + ', back ' + day(d.check_back) : e.kind === 'reassigned_cc' ? ': ' + nameOf(d.from) + ' → ' + nameOf(d.to)
      : e.kind === 'step_assigned' ? ' ' + (d.to === 'the role holder' ? d.to : nameOf(d.to)) : e.kind === 'verified' ? ': ' + (d.detail || '') : e.kind === 'owner_exception' ? ' (' + (d.label || '') + ')' : e.kind === 'target_start' ? ': ' + (d.to ? day(d.to) : 'none') : '';
    return '<div class="cj-ev"><span class="field-note">' + esc(when(e.at)) + '</span> · <b>' + esc(e.actor_name || e.actor_email) + '</b> · ' + esc((EV_WORDS[e.kind] || e.kind) + extra) + (e.reason ? ' · "' + esc(e.reason) + '"' : '') + '</div>';
  }
  function historyHtml(r){ const ev = evOf(r.key); return ev.length ? '<div class="cj-hist"><div class="cj-k">History</div>' + ev.map(evLine).join('') + '</div>' : ''; }

  /* ── the form's wiring (one handler for the header and the full list) ── */
  function wireForm(box){
    box.querySelectorAll('.cj-next[data-step]').forEach(card => {
      const key = card.dataset.step, r = rowOf(key); if(!r) return;
      card.querySelectorAll('[data-f]').forEach(el => el.onchange = el.oninput = () => {
        const F = CJ.form[key] || (CJ.form[key] = {}); F[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
        if(el.tagName === 'SELECT'){ render(); } });
      card.querySelectorAll('[data-upload]').forEach(inp => inp.onchange = () => upload(key, [...inp.files]));
      card.querySelectorAll('[data-unfile]').forEach(b => b.onclick = () => { (CJ.files[key] || []).splice(+b.dataset.unfile, 1); render(); });
      card.querySelectorAll('[data-file]').forEach(b => b.onclick = () => openFile(b.dataset.file));
      card.querySelectorAll('[data-act]').forEach(b => b.onclick = () => act(key, b.dataset.act, card, b));
    });
  }
  async function upload(key, list){
    const j = CJ.data.journey; CJ.files[key] = CJ.files[key] || [];
    for(const f of list){
      if(f.size > 15 * 1024 * 1024){ ccToast(f.name + ' is over 15 MB.'); continue; }
      const it = { name:f.name, path:null }; CJ.files[key].push(it); render();
      try{ const u = await call({ action:'upload_url', journey_id:j.journey_id, step_key:key, name:f.name });
        const { error } = await sb.storage.from('client-journey-files').uploadToSignedUrl(u.path, u.token, f); if(error) throw error; it.path = u.path; }
      catch(e){ CJ.files[key].splice(CJ.files[key].indexOf(it), 1); ccToast('Couldn\'t attach ' + f.name + ': ' + (e.message || e)); }
      render();
    }
  }
  async function openFile(path){
    try{ const d = await call({ action:'file_url', journey_id:CJ.data.journey.journey_id, path }); window.open(d.url, '_blank', 'noopener'); }catch(e){ ccToast('Couldn\'t open the file: ' + e.message); }
  }
  async function act(key, a, card, btn){
    const errBox = card.querySelector('[data-err]'), say = t => { if(errBox) errBox.textContent = t; else ccToast(t); };
    const m = k => { const el = card.querySelector('[data-m="' + k + '"]'); return el ? el.value.trim() : ''; };
    if(/-open$/.test(a)){ CJ.mode = a.replace('-open', ''); render(); setTimeout(() => { const el = document.querySelector('.cj-next[data-step="' + key + '"] .cj-mode input, .cj-next[data-step="' + key + '"] .cj-mode textarea, .cj-next[data-step="' + key + '"] .cj-mode select'); if(el) el.focus(); }, 30); return; }
    if(a === 'cancel'){ CJ.mode = null; render(); return; }
    const r = rowOf(key), j = CJ.data.journey, base = { action:'apply', journey_id:j.journey_id, step_key:key, expected_version:r.st.version != null ? r.st.version : undefined };
    let body = null;
    if(a === 'check'){ body = { action:'refresh', journey_id:j.journey_id }; }
    else if(a === 'complete' || a === 'manual'){
      const files = (CJ.files[key] || []).filter(f => f.path).map(f => f.path);
      if((CJ.files[key] || []).some(f => !f.path)){ say('Wait for the proof to finish uploading.'); return; }
      const input = { answer:CJ.form[key] || {}, files, manual_reason:a === 'manual' ? m('manual_reason') : '' };
      const can = R.canComplete(r, input); if(!can.ok){ say(can.why); return; }
      body = Object.assign(base, { op:'complete', answer:input.answer, files, manual_reason:input.manual_reason || undefined });
    }
    else if(a === 'wait'){ if(!m('waiting_on')){ say('Say who or what we\'re waiting on.'); return; } if(!m('check_back')){ say('Pick a check-back date. Waiting always needs one.'); return; }
      body = Object.assign(base, { op:'wait', waiting_on:m('waiting_on'), check_back:m('check_back') }); }
    else if(a === 'block'){ if(!m('reason')){ say('Say why it\'s blocked.'); return; } body = Object.assign(base, { op:'block', reason:m('reason'), unblock:m('unblock'), unblock_role:m('unblock_role') }); }
    else if(a === 'unblock') body = Object.assign(base, { op:'unblock' });
    else if(a === 'na'){ if(!m('reason')){ say('Say why.'); return; } body = Object.assign(base, { op:'not_needed', reason:m('reason') }); }
    else if(a === 'reopen'){ if(!m('reason')){ say('Say why.'); return; } body = Object.assign(base, { op:'reopen', reason:m('reason') }); }
    else if(a === 'assign') body = Object.assign(base, { op:'assign', email:m('email') });
    else if(a === 'exc'){ if(!m('reason')){ say('An owner exception needs a written reason.'); return; } body = Object.assign(base, { op:'exception', kind:m('kind'), reason:m('reason') }); }
    if(!body) return;
    const before = CJ.view.next ? CJ.view.next.key : null, title = r.def.title;
    if(btn){ btn.disabled = true; btn.textContent = 'Saving…'; }
    let d; try{ d = await call(body); }catch(e){ d = { error:e.message }; }
    if(d.error && d.outcome !== 'saved' && d.outcome !== 'ok'){ if(btn){ btn.disabled = false; } say(d.error); render(); return; }
    delete CJ.form[key]; delete CJ.files[key]; CJ.mode = null; CJ.sel = null; CJL.at = 0;
    await reload();
    const nx = CJ.view && CJ.view.next;
    const after = rowOf(key);
    CJ.flash = after && after.stop ? '' : a === 'complete' || a === 'manual' || (a === 'check' && after && R.DONE.indexOf(after.status) > -1)
      ? '✓ Done: ' + title + '.' + (nx ? ' Next: ' + nx.def.title + '.' : CJ.data.journey.status === 'active' ? ' Start of care is complete.' : '')
      : a === 'check' ? 'The Hub checked: not seen yet. It checks again every few minutes.'
      : a === 'wait' ? 'Parked until ' + day(body.check_back) + '. It comes back to My Work that day.'
      : a === 'exc' ? 'Owner exception saved. The journey continues.' : a === 'block' ? 'Marked blocked.' : 'Saved.';
    render();
    if(typeof myWorkRefresh === 'function'){ try{ if(typeof ccOpsRefresh === 'function') await ccOpsRefresh(); myWorkRefresh(); }catch(e){} }
    void before;
  }

  /* ── header actions ── */
  function pick(key, inList){ CJ.sel = key; CJ.mode = null; render(); if(inList){ const el = document.getElementById('cjrow_' + String(key).replace(/\W/g, '_')); if(el) el.scrollIntoView({ block:'nearest' }); } }
  function showStage(s){ cpShowTab('start'); const el = document.getElementById('cjstage_' + s); if(el) el.scrollIntoView({ behavior:'smooth', block:'start' }); }
  function filter(f){ CJ.filter = f; render(); }
  function editStart(btn){
    const j = CJ.data.journey, el = ccPopOpen(btn, '<div style="font-weight:700;margin-bottom:6px;">Target start</div><input type="date" id="cjSd" value="' + esc(j.target_start || '') + '"><div style="display:flex;gap:8px;margin-top:10px;"><button class="primary" id="cjSdGo">Save</button><button class="ghost" id="cjSdNo">Cancel</button></div>', { width:260 });
    el.querySelector('#cjSdNo').onclick = ccPopClose;
    el.querySelector('#cjSdGo').onclick = async () => { const v = el.querySelector('#cjSd').value; ccPopClose(); try{ await call({ action:'set_start', journey_id:j.journey_id, date:v }); CJ.flash = 'Target start saved.'; await reload(); }catch(e){ ccToast(e.message); } };
  }
  function assignCc(btn){
    const j = CJ.data.journey, people = (CJ.data.office || []);
    const el = ccPopOpen(btn, '<div style="font-weight:700;margin-bottom:6px;">Assigned Care Coordinator</div><div class="field-note" style="margin-bottom:6px;">Every Care Coordinator step follows them, and their My Work changes with it.</div><select id="cjCc">' + people.map(p => '<option value="' + esc(p.email) + '"' + (p.email === lc(j.assigned_cc) ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select><div style="display:flex;gap:8px;margin-top:10px;"><button class="primary" id="cjCcGo">Assign</button><button class="ghost" id="cjCcNo">Cancel</button></div>', { width:300 });
    el.querySelector('#cjCcNo').onclick = ccPopClose;
    el.querySelector('#cjCcGo').onclick = async () => { const v = el.querySelector('#cjCc').value; ccPopClose(); try{ await call({ action:'assign_cc', journey_id:j.journey_id, email:v }); CJ.flash = 'The journey is ' + first(v) + '\'s now.'; await reload(); }catch(e){ ccToast(e.message); } };
  }

  /* ── links: #p/<ref>/<tab>/<step> ── */
  const TAB = { start:'start', soc:'start', 'start-of-care':'start', assessment:'start', summary:'summary', overview:'summary', intake:'intake', family:'family', care:'care', team:'team', schedule:'team',
    checkins:'checkins', payer:'payer', home:'home', history:'history', activity:'history', documents:'history' };
  async function route(seg){
    const ref = decodeURIComponent(seg[0] || ''), tab = TAB[String(seg[1] || 'start').toLowerCase()] || 'summary', item = seg[2] ? decodeURIComponent(seg[2]) : null;
    /* wait for the data: a link opened before sign-in finishes loading still lands */
    for(let i = 0; i < 300 && !(typeof DATA !== 'undefined' && Array.isArray(DATA.leads) && DATA.leads.length); i++) await new Promise(r => setTimeout(r, 200));
    let seed = null;
    if(/^A\d+$/.test(ref)) seed = { ax:ref.slice(1) };
    else if(/^L.+/.test(ref)) seed = { lead_id:ref.slice(1) };
    else if(/^J[0-9a-f-]{36}$/i.test(ref)){ try{ const d = await call({ action:'get', journey_id:ref.slice(1) }); const j = d.journey; if(j) seed = j.lead_id && (DATA.leads || []).some(l => String(l.id) === String(j.lead_id)) ? { lead_id:j.lead_id } : j.axiscare_client_id ? { ax:j.axiscare_client_id } : null; }catch(e){} }
    if(!seed || (seed.lead_id && !(DATA.leads || []).some(l => String(l.id) === String(seed.lead_id)))){ ccToast('That link\'s person couldn\'t be found. It may have been archived, or you may not have access.'); return false; }
    CJ.focus = item && tab === 'start' ? item : null;
    await openClient(seed, tab);
    return true;
  }

  /* ── THE MOVE-OVER (483, 2026-10-06): the Getting ready lists and the stage chips read the journeys ──
     One list of every open (and recently active) journey, read once and kept for five minutes. Before staffing shows the
     journeys before the Team stage; First shift shows Team, Ready and First week, and a launch a journey already speaks for
     is not shown twice. The older checklists still show for anyone who has one (nobody new gets one once it's live). */
  const CJL = { at:0, rows:null, loading:false };
  const PRE_TEAM = ['intake', 'prechecks', 'assessment', 'signed', 'axiscare', 'billing', 'schedule'];
  const visible = j => !j.is_test || owner();
  function listRows(){
    if(!live() && !owner()) return [];
    if(!CJL.loading && Date.now() - CJL.at > 5 * 60e3){
      CJL.loading = true;
      call({ action:'list', include_active:true }).then(d => { CJL.rows = (d && d.journeys) || []; CJL.at = Date.now(); CJL.loading = false;
        try{ if(typeof activeTab !== 'undefined'){ if(activeTab === 'soc' && typeof renderSocTab === 'function') renderSocTab(); if(activeTab === 'clientqueue' && typeof cqRedraw === 'function') cqRedraw(); if(activeTab === 'leads' && typeof renderLeads === 'function') renderLeads(); } }catch(e){} })
        .catch(() => { CJL.loading = false; CJL.at = Date.now() - 4 * 60e3; });
    }
    return (CJL.rows || []).filter(visible);
  }
  function journeyFor(o){
    const rows = listRows(); if(!rows.length) return null;
    const lid = o && o.lead ? String(o.lead.id) : '', ax = String((o && (o.ax || (o.lead && o.lead.axiscare_client_id) || (o.r && o.r.axiscare_client_id))) || '').trim();
    return rows.find(j => lid && String(j.lead_id || '') === lid) || rows.find(j => ax && String(j.axiscare_client_id || '') === ax) || null;
  }
  /* the stage chip words for a journey (the six stage words the Hub already uses) */
  function stageFor(o){
    if(!live()) return null;
    const j = journeyFor(o); if(!j || j.is_test) return null;
    if(j.status === 'active') return { k:'care', d:'' };
    if(j.status === 'closed') return { k:'past', d:'did not start' };
    if(j.stage === 'intake' || j.stage === 'prechecks') return { k:'talking', d:j.stage === 'intake' ? 'intake' : 'pre-checks' };
    if(j.stage === 'assessment') return { k:'assessment', d:'' };
    return { k:'ready', d:PRE_TEAM.indexOf(j.stage) > -1 ? 'before staffing' : 'first shift' };
  }
  function ownsLaunch(c){
    if(!c) return false;
    const ax = String(c.axiscare_client_id || '').trim();
    return listRows().some(j => (j.launch_id && String(j.launch_id) === String(c.id)) || (ax && String(j.axiscare_client_id || '') === ax && j.status !== 'closed'));
  }
  function listBlock(which){
    if(!live() && !owner()) return '';
    const rows = listRows().filter(j => j.status === 'open' && (which === 'before' ? PRE_TEAM.indexOf(j.stage) > -1 : PRE_TEAM.indexOf(j.stage) < 0));
    if(CJL.rows === null) return '<div class="field-note" style="margin:0 0 10px;">Reading the client journeys…</div>';
    const word = which === 'before' ? 'before staffing' : 'at Team, Ready or First week';
    if(!rows.length) return '<div class="cj-list-empty field-note">No client journeys ' + word + ' right now.</div>';
    const st = j => j.stopped ? 'blocked' : (j.next && j.next.status) || 'ready';
    rows.sort((a, b) => ({ attention:0, blocked:1, ready:2, waiting:3 }[st(a)] ?? 4) - ({ attention:0, blocked:1, ready:2, waiting:3 }[st(b)] ?? 4) || String(a.target_start || '9').localeCompare(String(b.target_start || '9')));
    return '<div class="cj-list"><div class="cj-k" style="margin:0 0 6px;">Client journeys ' + word + ' (' + rows.length + ')</div>' + rows.map(j => {
      const n = j.next, s = st(j);
      return '<a class="cj-li cj-li-' + s + '" href="#p/' + esc(j.ref) + '/start' + (n ? '/' + esc(n.key) : '') + '">'
        + '<span class="cj-li-name">' + esc(j.client_name) + (j.is_test ? ' <span class="cj-chip cj-s-exc">TEST</span>' : '') + '</span>'
        + '<span class="cj-chip cj-s-na">' + esc(j.stage_label || j.stage) + '</span>' + chip(j.stopped ? 'blocked' : s)
        + '<span class="cj-li-next">' + (j.stopped ? 'Stopped at: ' : 'Next: ') + esc(n ? n.title : 'nothing open') + (n && n.why ? ' · ' + esc(String(n.why).replace(/\d{4}-\d{2}-\d{2}/g, d => day(d))) : '') + '</span>'
        + '<span class="cj-li-who">' + esc(personName((n && n.owner) || j.assigned_cc)) + (j.target_start ? ' · start ' + esc(day(j.target_start)) : '') + '</span></a>';
    }).join('') + '</div>';
  }
  function listRefresh(){ CJL.at = 0; listRows(); }
  /* a first name for an email, from the Hub's people list (never the email itself) */
  function personName(e){
    const x = lc(e); if(!x) return 'Nobody yet';
    const p = (typeof OPS_PEOPLE !== 'undefined' && OPS_PEOPLE || []).find(q => lc(q.primary_email) === x);
    const n = p ? String(p.full_name || '').split(' ')[0] : x.split('@')[0];
    return n.charAt(0).toUpperCase() + n.slice(1);
  }

  /* ── Settings: the switch, and the routing RULE (which Care Coordinator gets a new client nobody has picked, by payer) ── */
  const CJ_ON = 'Turn on client journeys?\n\nEvery new client\'s start of care runs as one journey on their profile: the next required step, who owns it, and proof on each step. Care Coordinators see their next steps on My Work under Clients in motion. A lead starts its journey once someone has talked to them, and goes to the Care Coordinator for its payer (set in Hub settings, Client journeys). The older Start of Care checklist is no longer offered to anyone new; clients who already have one keep it.\n\nNobody is texted or emailed.';
  const CJ_OFF = 'Turn off client journeys? Journeys stop showing to Care Coordinators and nothing new starts by itself. Every step and its history is kept, and comes back when it is turned on again.';
  const ROUTE_ROWS = [['medicaid', 'Medicaid IHS / HCBS'], ['va', 'VA Community Care'], ['private', 'Private Pay'], ['ltc', 'Long-Term Care Insurance'], ['other', 'Other'], ['unknown', 'Payer not known yet']];
  function setFill(){
    const box = document.getElementById('cjSet'); if(!box) return;
    const st = (typeof DATA !== 'undefined' && DATA.ops_settings) || {}, on = st.client_journey_live === true, routes = st.client_journey_routing || {};
    const people = (typeof OPS_PEOPLE !== 'undefined' && OPS_PEOPLE || []).filter(p => p.primary_email).sort((a, b) => String(a.full_name).localeCompare(String(b.full_name)));
    const can = owner();
    box.innerHTML = '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">' + (can ? '<button class="' + (on ? 'secondary' : 'primary') + '" onclick="cjSetToggle(this)">' + (on ? 'Turn off' : 'Turn on') + '</button>' : '')
      + '<span class="field-note" id="cjSetMsg">' + (on ? 'On.' : 'Off: only an owner sees journeys, and only on TEST clients.') + '</span></div>'
      + '<div class="cj-k" style="margin:4px 0 6px;">Who gets a new client nobody has picked</div>'
      + '<div class="cj-kv" style="align-items:center;">' + ROUTE_ROWS.map(([k, label]) => '<dt>' + esc(label) + '</dt><dd><select data-route="' + k + '"' + (can ? '' : ' disabled') + '><option value="">(nobody: the default, then whoever starts it)</option>'
        + people.map(p => '<option value="' + esc(lc(p.primary_email)) + '"' + (lc(routes[k]) === lc(p.primary_email) ? ' selected' : '') + '>' + esc(p.full_name) + '</option>').join('') + '</select></dd>').join('') + '</div>'
      + '<div class="field-note">A lead\'s own coordinator always comes first. A client routed while the payer wasn\'t known moves to that payer\'s person once the payer is answered. Anyone can hand a journey to someone else from its profile.</div>'
      + (can ? '<div style="margin-top:8px;"><button class="secondary" onclick="cjSetRoutes(this)">Save who gets which payer</button> <span class="field-note" id="cjRouteMsg"></span></div>' : '');
  }
  async function setToggle(b){
    const on = !(((typeof DATA !== 'undefined' && DATA.ops_settings) || {}).client_journey_live === true);
    if(!confirm(on ? CJ_ON : CJ_OFF)) return;
    if(b) b.disabled = true;
    const out = await tkMerge(m => { m.client_journey_live = on; return ['client journeys ' + (on ? 'ON' : 'OFF')]; }, 'Client journeys');
    if(b) b.disabled = false;
    if(!out.error){ DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { client_journey_live:on }); listRefresh(); }
    setFill(); const msg = document.getElementById('cjSetMsg'); if(msg && out.error) msg.textContent = 'Could not save: ' + out.error.message;
  }
  async function setRoutes(b){
    const pick = {}; document.querySelectorAll('#cjSet select[data-route]').forEach(el => { if(el.value) pick[el.dataset.route] = el.value; });
    if(b) b.disabled = true;
    const out = await tkMerge(m => { const was = JSON.stringify(m.client_journey_routing || {}); m.client_journey_routing = pick; return was === JSON.stringify(pick) ? [] : ['who gets which payer: ' + ROUTE_ROWS.filter(([k]) => pick[k]).map(([k, l]) => l + ' to ' + String(pick[k]).split('@')[0]).join(', ')]; }, 'Client journeys');
    if(b) b.disabled = false;
    const msg = document.getElementById('cjRouteMsg');
    if(out.error){ if(msg) msg.textContent = 'Could not save: ' + out.error.message; return; }
    DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { client_journey_routing:pick }); if(msg) msg.textContent = '✓ Saved.';
  }


  /* styles (kept with the module) */
  try{ const st = document.createElement('style'); st.textContent = [
    '.cj-head{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin:0 0 12px}',
    '.cj-meta{font-size:13.5px;color:var(--text-muted);line-height:1.6}.cj-meta b{color:var(--navy)}',
    '.cj-rail{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0 2px}.cj-st{font:600 12px/1 inherit;padding:7px 9px;border-radius:16px;border:1.5px solid var(--border);background:#fff;color:var(--text-muted);cursor:pointer}',
    '.cj-st-done{background:#E3F4F3;border-color:#2E8F8A;color:#1F6F6B}.cj-st-now{background:var(--navy);border-color:var(--navy);color:#fff}.cj-st-stopped{background:#FDECEA;border-color:#B42318;color:#B42318}',
    '.cj-next{border:2px solid var(--navy);border-radius:10px;padding:12px 14px;margin-top:10px;background:#fff}.cj-next-red{border-color:#B42318}',
    '.cj-k{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted)}.cj-t{font-size:18px;font-weight:800;color:var(--navy);margin:4px 0 6px;line-height:1.25}',
    '.cj-chip{display:inline-block;font-size:11.5px;font-weight:800;padding:4px 8px;border-radius:5px;vertical-align:1px;white-space:nowrap}',
    '.cj-s-ready{background:#E7EEFC;color:#1E4FB8}.cj-s-wait{background:#FFF4E1;color:#9A6412}.cj-s-block{background:#FDECEA;color:#B42318}.cj-s-attn{background:#B42318;color:#fff}.cj-s-done{background:#E6F4EC;color:#1E7B45}.cj-s-exc{background:#F1EBFB;color:#6B3FB0}.cj-s-na{background:#EEF2F6;color:#5B6B80}',
    '.cj-kv{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:3px 12px;font-size:13.5px;margin:8px 0}.cj-kv dt{color:var(--text-muted)}.cj-kv dd{margin:0}.cj-red{color:#B42318;font-weight:600}.cj-violet{color:#6B3FB0}',
    '.cj-form{margin-top:6px}.cj-field{display:block;font-size:12.5px;font-weight:700;color:var(--navy);margin:8px 0 3px}.cj-form input:not([type=checkbox]),.cj-form select,.cj-form textarea{width:100%;max-width:420px;box-sizing:border-box}',
    '.cj-check{display:flex;gap:8px;align-items:flex-start;font-size:14px;margin:6px 0;cursor:pointer}.cj-check input{width:auto;margin-top:3px}',
    '.cj-files{margin-top:4px}.cj-file{display:inline-block;background:#EEF3F9;border-radius:6px;padding:3px 8px;margin:0 6px 6px 0;font-size:13px}',
    '.cj-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.cj-violet-btn{background:#6B3FB0;color:#fff;border:none;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer}',
    '.cj-mode{background:#F6F9FD;border:1px solid var(--border);border-radius:8px;padding:8px 12px;margin-top:10px}.cj-mode-exc{border-color:#6B3FB0}',
    '.cj-err{color:#B42318;font-size:13px;margin-top:6px;font-weight:600}.cj-err:empty{display:none}',
    '.cj-howto{margin-top:10px;font-size:14px}.cj-howto summary{cursor:pointer;font-weight:700;color:var(--teal,#2E8F8A)}.cj-howto ol{margin:6px 0 0;padding-left:20px}',
    '.cj-flash{margin-top:10px;background:#E6F4EC;color:#1E7B45;border-radius:8px;padding:8px 12px;font-weight:700;font-size:14px}.cj-flash-stop{background:#FDECEA;color:#B42318}',
    '.cj-also,.cj-coming{margin-top:8px;font-size:13.5px}.cj-coming{color:var(--text-muted)}',
    '.cj-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin:0 0 12px}.cj-start{display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:space-between}',
    '.cj-full{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin:0 0 12px}.cj-full-top{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px}',
    '.cj-stage{margin-top:10px}.cj-stage-h{font-size:12px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--navy);margin-bottom:4px}',
    '.cj-row{border-top:1px solid var(--border)}.cj-row-h{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;background:none;border:none;padding:8px 2px;cursor:pointer;font:inherit;color:inherit}',
    '.cj-row-later .cj-row-h{opacity:.55}.cj-row-t{flex:1;min-width:0;font-weight:700;font-size:14px}.cj-row-s{display:block;font-weight:400;font-size:12.5px;color:var(--text-muted)}',
    '.cj-ic{flex:0 0 22px;height:22px;border-radius:50%;font-size:12px;font-weight:800;line-height:22px;text-align:center;background:#EEF2F6;color:#5B6B80}',
    '.cj-ic-complete{background:#E6F4EC;color:#1E7B45}.cj-ic-ready{background:#E7EEFC;color:#1E4FB8}.cj-ic-blocked,.cj-ic-attention{background:#FDECEA;color:#B42318}.cj-ic-waiting{background:#FFF4E1;color:#9A6412}.cj-ic-exception{background:#F1EBFB;color:#6B3FB0}',
    '.cj-row-body{padding:0 0 10px 32px}.cj-hist{margin-top:8px;font-size:13px}.cj-ev{padding:3px 0;border-top:1px dashed var(--border)}',
    '.cj-done-all{border-color:#2E8F8A}',
    '.cj-list{margin:0 0 14px}.cj-list-empty{margin:0 0 12px}.cj-li{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;background:#fff;border:1px solid var(--border);border-left:5px solid #1E4FB8;border-radius:10px;padding:10px 12px;margin-bottom:8px;color:inherit;text-decoration:none}',
    '.cj-li-blocked,.cj-li-attention{border-left-color:#B42318}.cj-li-waiting{border-left-color:#9A6412}.cj-li-name{font-weight:800;color:var(--navy)}.cj-li-next{flex:1 1 240px;min-width:0;font-size:13.5px}.cj-li-who{font-size:12.5px;color:var(--text-muted)}',
    '.wk-jr{border-left:5px solid #1E4FB8}.wk-jr-blocked{border-left-color:#B42318}.wk-jr-attention{border-left-color:#B42318;background:#FFF6F5}.wk-jr-waiting{border-left-color:#9A6412}',
    '@media (max-width:720px){.cj-head,.cj-full{border-radius:0;margin-left:-4px;margin-right:-4px}.cj-t{font-size:20px}.cj-actions button{min-height:44px;flex:1 1 auto}.cj-form input:not([type=checkbox]),.cj-form select{font-size:16px;min-height:44px;max-width:none}.cj-row-body{padding-left:0}}'
  ].join(''); document.head.appendChild(st); }catch(e){}
  Object.assign(window, { cjSetFill:setFill, cjSetToggle:setToggle, cjSetRoutes:setRoutes, cjListBlock:listBlock, cjStageFor:stageFor, cjOwnsLaunch:ownsLaunch, cjListRefresh:listRefresh, cjJourneyFor:journeyFor, cjMountProfile:mountProfile, cjPick:pick, cjShowStage:showStage, cjFilter:filter, cjEditStart:editStart, cjAssignCc:assignCc, cjRoute:route, cjCall:call, CJ_STATE:CJ });
})();
