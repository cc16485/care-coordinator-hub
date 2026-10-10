/* =====================================================================================================================
   CAREGIVER READINESS (SLICE 3b, Samantha approved Migrations A and B, 2026-10-10): the ONE new-hire readiness view.
   One card per person: every requirement grouped by stage, the next blocking item and who owns it, and whether they are
   Approved to Work. Drawn from the caregiver-journey function (the same tables and rules file as the client journey); the
   page decides nothing. A button shows only when the server says this signed-in person may press it, and the server
   refuses regardless of the page. Fictional offers only until the switch date.
   SLICE 5 (Samantha: "start slice 5", 2026-10-10): the same card is the final approval screen. Ready for Final Approval,
   the Approve to Work button (the Approve to Work list only), the AxisCare read-back ("Approved to Work" shows only after
   AxisCare confirms; else "Approval recorded, AxisCare update failed" with Retry), the cleared text's state, the
   scheduling lock, the Level of Care line. CRX.list feeds the Ready for final approval list on the Orientations tab.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const when = iso => iso ? new Date(iso).toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : '';
  const day = iso => iso ? new Date(iso).toLocaleDateString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', year:'numeric' }) : '';
  const STATUS = { complete:['✓', '#15803D', 'Done'], not_needed:['–', '#8A7F70', 'Not needed'], exception:['!', '#B45309', 'Owner exception'], ready:['○', '#0D365F', 'Ready'], attention:['!', '#B91C1C', 'Needs attention'],
    blocked:['⛔', '#B91C1C', 'Blocked'], waiting:['…', '#B45309', 'Waiting'], later:['·', '#B9AF9E', 'Later'] };
  let CUR = null, LIST = { at:0, rows:null, may:false, loading:null };
  async function call(body){
    const r = await sb.functions.invoke('caregiver-journey', { body });
    if(r.error){ let why=''; try{ if(r.error.context && r.error.context.json) why=(await r.error.context.json()).error||''; }catch(_){} throw new Error(why || r.error.message || 'the readiness server did not answer'); }
    if(!r.data || r.data.error) throw new Error((r.data && r.data.error) || 'the readiness server did not answer');
    return r.data;
  }
  function ensureModal(){
    if(document.getElementById('crModal')) return;
    const w = document.createElement('div'); w.id = 'crModal';
    w.style.cssText = 'display:none;position:fixed;inset:0;z-index:10003;background:rgba(15,54,95,.35);align-items:flex-start;justify-content:center;padding:1rem;overflow:auto';
    w.innerHTML = '<div style="background:#fff;border-radius:12px;max-width:640px;width:100%;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.2);margin:1rem 0"><div id="crBody"></div></div>';
    w.addEventListener('click', e => { if(e.target === w) close(); });
    document.body.appendChild(w);
  }
  function close(){ const m = document.getElementById('crModal'); if(m) m.style.display = 'none'; CUR = null; }
  async function open(offerId, who){
    ensureModal(); const m = document.getElementById('crModal'); m.style.display = 'flex';
    document.getElementById('crBody').innerHTML = '<div style="font-size:.85rem;color:#6E6559">Opening their readiness card…</div>';
    try { CUR = await call({ action:'get', offer_id:String(offerId) }); CUR.who = who || ''; render(); }
    catch(e){ document.getElementById('crBody').innerHTML = '<div style="color:#B91C1C;font-size:.85rem">The card could not open: ' + esc(e.message || e) + '</div><div style="margin-top:.8rem;text-align:right"><button class="ibtn" onclick="CRX.close()">Close</button></div>'; }
  }
  /* the header pill: Approved to Work only after AxisCare reads back Active (her rule 7) */
  function pill(a, approvedRow){
    if(!a) return '';
    const base = 'flex:none;border-radius:999px;padding:.3rem .7rem;font-size:.78rem;font-weight:800;';
    if(a.approved && a.axiscare && a.axiscare.state === 'confirmed') return '<div style="' + base + 'background:#DCFCE7;color:#15803D">Approved to Work ' + esc(day(a.approved_at)) + '</div>';
    if(a.approved && a.axiscare && a.axiscare.state === 'failed') return '<div style="' + base + 'background:#FDECEC;color:#B91C1C">Approval recorded, AxisCare update failed</div>';
    if(a.approved && a.axiscare && a.axiscare.state === 'practice') return '<div style="' + base + 'background:#FFF7ED;color:#B45309">Approval recorded (practice: AxisCare not written)</div>';
    if(a.approved) return '<div style="' + base + 'background:#FFF7ED;color:#B45309">Approval recorded, waiting for AxisCare</div>';
    if(a.ready_for_final) return '<div style="' + base + 'background:#0D365F;color:#fff">Ready for final approval</div>';
    return '<div style="' + base + 'background:#FFF7ED;color:#B45309">Not approved to work</div>';
  }
  const textWords = t => !t ? '' : t.state === 'sent' ? 'cleared text sent ' + when(t.at) : t.state === 'due' ? 'cleared text held until 8am to 6pm Central (the next check sends it)' : t.state === 'practice' ? 'cleared text recorded, not sent (practice: the switch is off)' : t.state === 'failed' ? 'cleared text not sent: ' + (t.why || 'refused') : t.state;
  /* the final approval block: the Level of Care, the lock, AxisCare, the text, the one button */
  function approvalBlock(d){
    const a = d.approve; if(!a) return '';
    let h = '<div style="border:1.5px solid ' + (a.approved && a.axiscare.state === 'confirmed' ? '#86efac' : a.ready_for_final ? '#0D365F' : '#EEE9DF') + ';border-radius:10px;padding:.6rem .8rem;margin:.6rem 0;font-size:.84rem">';
    h += '<div style="font-weight:800;color:#0D365F">Final approval</div>';
    h += '<div style="font-size:.78rem;color:#6E6559;margin:.2rem 0 .4rem">Level of Care: <b>' + esc(a.level_of_care.level) + '</b> (' + esc(a.level_of_care.source) + ') · Scheduling: <b>' + (a.locked ? 'locked' : 'unlocked') + '</b>' + (a.lock_why ? ' · ' + esc(a.lock_why) : '') + '</div>';
    if(a.approved){
      h += '<div>Approved to Work by <b>' + esc(a.approved_by || '') + '</b> · ' + esc(when(a.approved_at)) + '</div>';
      const ax = a.axiscare || {};
      h += '<div style="margin-top:.2rem">AxisCare: ' + (ax.state === 'confirmed' ? '<b style="color:#15803D">read back Active</b> ' + esc(when(ax.at)) : ax.state === 'failed' ? '<b style="color:#B91C1C">' + esc(ax.detail || 'update failed') + '</b>' : ax.state === 'practice' ? '<b style="color:#B45309">practice, nothing written</b> (turn on "Approve to Work updates AxisCare" on the Admin page, then Retry)' : 'waiting') + '</div>';
      if(a.text) h += '<div style="margin-top:.2rem">Text: ' + esc(textWords(a.text)) + '</div>';
      if(a.may_retry) h += '<div style="margin-top:.5rem"><button class="ibtn" onclick="CRX.retry(this)">↻ Retry the AxisCare update</button></div>';
    } else if(a.ready_for_final){
      h += '<div>Every requirement above is complete. ' + (a.may_approve_work ? 'Press Approve to Work to record your name and the exact time, set them Active in AxisCare and read it back, then send the cleared text.' : 'Only a person on the Approve to Work list (Admin page) can press the button.') + '</div>';
      if(!a.switches.axiscare_live) h += '<div style="font-size:.76rem;color:#B45309;margin-top:.2rem">The AxisCare update switch is off: the press records practice and nothing is written to AxisCare.</div>';
      if(a.may_approve_work) h += '<div style="margin-top:.5rem"><button class="ibtn" style="background:#0D365F;color:#fff;font-weight:800" onclick="CRX.approve(this)">✓ Approve to Work</button></div>';
    } else {
      h += '<div style="color:#6E6559">Not ready: ' + (a.blocked && a.blocked.length ? 'blocked on ' + esc(a.blocked.join('; ')) : 'requirements above are still open') + '.</div>';
    }
    return h + '</div>';
  }
  function card(){
    const d = CUR; if(!d) return '';
    if(!d.journey) return '<div style="font-weight:800;color:#0D365F;font-size:1rem">Readiness</div><div style="font-size:.85rem;color:#6E6559;margin-top:.4rem">No readiness card yet: it starts the moment both offer documents are signed.</div><div style="margin-top:.8rem;text-align:right"><button class="ibtn" onclick="CRX.close()">Close</button></div>';
    const v = d.view || {}, rows = v.rows || [];
    const approved = rows.find(r => r.key === 'cg.approve.work');
    let h = '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.6rem"><div><div style="font-weight:800;color:#0D365F;font-size:1rem">Readiness · ' + esc(d.journey.client_name) + '</div>'
      + '<div style="font-size:.76rem;color:#6E6559;margin-top:.1rem">One card: every requirement, what is blocking, who owns the next move. Drawn from the records; nothing here is typed.</div></div>'
      + pill(d.approve, approved) + '</div>';
    if(d.facts && d.facts.dates) h += '<div style="font-size:.76rem;color:#6E6559;margin:.4rem 0">Employment start (orientation completed): <b>' + esc(d.facts.dates.orientation || 'not yet') + '</b> · AxisCare hire date: <b>' + esc(d.facts.dates.axiscare_hire || 'none') + '</b>' + (d.facts.dates.differ ? ' <span style="color:#B45309;font-weight:700">(they differ: reconcile)</span>' : '') + '</div>';
    /* the rail */
    h += '<div style="display:flex;gap:.3rem;flex-wrap:wrap;margin:.6rem 0">' + (v.rail || []).map(s => '<span style="font-size:.7rem;font-weight:700;letter-spacing:.03em;text-transform:uppercase;padding:.2rem .55rem;border-radius:999px;' + (s.state === 'done' ? 'background:#DCFCE7;color:#15803D' : s.state === 'now' ? 'background:#0D365F;color:#fff' : s.state === 'stopped' ? 'background:#FDECEC;color:#B91C1C' : 'background:#EEE9DF;color:#8A7F70') + '">' + esc(s.label) + '</span>').join('') + '</div>';
    /* the next move */
    if(v.next){ const n = v.next; h += '<div style="background:#FFF7ED;border:1px solid #FCD9A8;border-radius:8px;padding:.5rem .7rem;font-size:.84rem"><b>Next:</b> ' + esc(n.def.title) + ' · <b>' + esc(ownerWords(n.owner)) + '</b>' + (n.why ? ' · ' + esc(n.why) : '') + (n.attention ? ' · <span style="color:#B91C1C;font-weight:700">' + esc(n.attention) + '</span>' : '') + '</div>'; }
    else if(v.complete) h += '<div style="background:#DCFCE7;border-radius:8px;padding:.5rem .7rem;font-size:.84rem;color:#15803D;font-weight:700">Every requirement is complete.</div>';
    h += approvalBlock(d);
    /* the rows by stage */
    const stages = (v.rail || []).map(s => s.key);
    stages.forEach(st => {
      const rs = rows.filter(r => r.def.stage === st); if(!rs.length) return;
      h += '<div style="font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.03em;color:#8A7F70;margin:.8rem 0 .25rem">' + esc((v.rail.find(x => x.key === st) || {}).label || st) + '</div>';
      rs.forEach(r => {
        const [sym, col, lab] = STATUS[r.status] || STATUS.later;
        const may = (d.may || {})[r.key];
        const ev = r.st && r.st.evidence ? r.st.evidence : null;
        let line = '<div style="display:flex;gap:.5rem;align-items:flex-start;padding:.3rem 0;border-bottom:1px solid #F1EDE4;font-size:.84rem">'
          + '<span style="flex:0 0 18px;color:' + col + ';font-weight:800;text-align:center">' + sym + '</span>'
          + '<div style="flex:1"><div>' + esc(r.def.title) + (r.def.required === false ? ' <span style="font-size:.7rem;color:#8A7F70">(optional)</span>' : '') + '</div>'
          + '<div style="font-size:.74rem;color:#6E6559">' + esc(lab) + (r.st && r.st.completed_at ? ' · ' + esc(when(r.st.completed_at)) + (r.st.completed_by_name ? ' · ' + esc(r.st.completed_by_name) : r.st.completed_by ? ' · ' + esc(r.st.completed_by) : '') : '')
          + (r.due && !r.st?.completed_at ? ' · due ' + esc(r.due) : '') + (r.attention ? ' · <span style="color:#B91C1C">' + esc(r.attention) + '</span>' : '') + (r.why && r.status === 'later' ? ' · ' + esc(r.why) : '') + (r.st && r.st.blocked_reason ? ' · ' + esc(r.st.blocked_reason) : '')
          + (ev && (ev.document || ev.result || ev.fingerprint) ? ' · evidence: ' + esc([ev.result, ev.document ? 'document on file' : '', ev.fingerprint ? 'signed form ' + String(ev.fingerprint).slice(0, 12) : ''].filter(Boolean).join(', ')) : '')
          + (ev && ev.source ? ' · ' + esc(ev.source) : '')
          + ' · <span title="' + esc(r.def.proof) + '">' + esc(proofWords(r.def.proof)) + '</span></div></div>';
        /* Approve to Work has its own button in the Final approval block (it also updates AxisCare); the generic Confirm never shows for it */
        if(may && r.def.proof === 'confirmed' && r.key !== 'cg.approve.work' && ['ready', 'attention'].indexOf(r.status) > -1) line += '<button class="ibtn" style="font-size:.72rem;flex:none" onclick="CRX.confirm(\'' + esc(r.key) + '\',this)">Confirm</button>';
        if(may && r.def.proof === 'proof' && ['ready', 'attention'].indexOf(r.status) > -1 && /^cg\.credential\./.test(r.key)) line += '<button class="ibtn" style="font-size:.72rem;flex:none" onclick="CRX.record(\'' + esc(r.key) + '\',this)">Record</button>';
        if(d.is_owner && r.key !== 'cg.approve.work' && r.key !== 'cg.axiscare.active' && ['ready', 'attention', 'later', 'blocked'].indexOf(r.status) > -1 && r.def.required !== false) line += '<button class="ibtn" style="font-size:.72rem;flex:none;color:#8A7F70" onclick="CRX.notNeeded(\'' + esc(r.key) + '\',this)" title="Owners only: mark not needed, with the reason">Not needed</button>';
        h += line + '</div>';
      });
    });
    h += '<div style="font-size:.72rem;color:#8A7F70;margin-top:.6rem">Verified rows come from the records on their own (the offer, the Step 1 forms, the Background and References row, the welcome call, the roster, the profile, the Training Platform\'s report). Confirmed rows need the named list on the Admin page. Every change is permanent history.</div>';
    if(d.events && d.events.length) h += '<details style="margin-top:.5rem"><summary style="font-size:.76rem;color:#0D365F;cursor:pointer">History (' + d.events.length + ')</summary>' + d.events.slice(0, 40).map(e => '<div style="font-size:.74rem;padding:.12rem 0">' + esc(when(e.at)) + ' · ' + esc(e.kind) + (e.step_key ? ' · ' + esc(e.step_key) : '') + ' · ' + esc(e.actor_name || e.actor_email) + (e.reason ? ' · "' + esc(e.reason) + '"' : '') + '</div>').join('') + '</details>';
    /* SLICE 6: the read-only personnel-file export (owners and the Audit export list; every export logged) */
    if(d.may_export) h += '<div id="crExport" style="margin-top:.6rem;font-size:.78rem"><button class="ibtn" onclick="CRX.exportFile(this)" title="A read-only PDF of every requirement, who verified, when, evidence and the history, with five-minute links to each proof. Every export is logged.">&#8681; Personnel file (PDF)</button></div>';
    h += '<div style="margin-top:.8rem;text-align:right"><button class="ibtn" onclick="CRX.close()">Close</button></div>';
    return h;
  }
  const ownerWords = o => !o ? 'the Hub' : o.email ? o.email : o.role === 'owner' ? 'an owner' : o.role === 'hub' ? 'the Hub (verified on its own)' : (o.role || '').replace(/_/g, ' ');
  const proofWords = p => ({ verified:'verified by the Hub', proof:'result + document', confirmed:'a named person confirms', answer:'answer' })[p] || p;
  function render(){ document.getElementById('crBody').innerHTML = card(); }
  async function act(body, btn){
    if(btn){ btn.disabled = true; btn.textContent = 'Saving…'; }
    try { CUR = Object.assign(await call(Object.assign({ journey_id: CUR.journey.journey_id }, body)), { who: CUR.who }); LIST.at = 0; render(); }
    catch(e){ alert(e.message || e); if(btn){ btn.disabled = false; btn.textContent = 'Try again'; } }
  }
  async function confirm(key, btn){ if(!window.confirm('Confirm this requirement as complete, in your name and with the time? It is permanent history.')) return; await act({ action:'confirm', step_key:key }, btn); }
  async function record(key, btn){ const result = prompt('Result (for example: verified, current):'); if(!result) return; const document_ = prompt('Where is the document? Paste a link or the file path on the row:'); if(!document_) { alert('A result needs its document.'); return; } const expires = prompt('Expiry date, YYYY-MM-DD (blank if none):') || ''; await act({ action:'record', step_key:key, result, document: document_, expires }, btn); }
  async function notNeeded(key, btn){ const reason = prompt('Why is this not needed for this person? (owners only; permanent)'); if(!reason || reason.trim().length < 5) return; await act({ action:'not_needed', step_key:key, reason }, btn); }
  /* SLICE 5: the owner's press and the Retry */
  async function approve(btn){
    const d = CUR; if(!d || !d.approve) return;
    const done = (d.view.rows || []).filter(r => ['complete', 'not_needed', 'exception'].indexOf(r.status) > -1).length;
    const words = 'Approve ' + d.journey.client_name + ' to work?\n\n' + done + ' requirements complete, Level of Care ' + d.approve.level_of_care.level + '.\nThis records your name and the exact time (permanent), ' + (d.approve.switches.axiscare_live ? 'sets them Active in AxisCare and reads it back' : 'records the AxisCare update as practice (the switch is off)') + ', then ' + (d.approve.switches.text_live ? 'sends the cleared text (8am to 6pm, yes-to-texts, opt-outs).' : 'records the cleared text as practice (the switch is off).');
    if(!window.confirm(words)) return;
    await act({ action:'approve_work' }, btn);
  }
  async function retry(btn){ await act({ action:'retry_axiscare' }, btn); }
  /* SLICE 6: the export. The server builds the PDF, logs the export and hands back five-minute links. */
  async function exportFile(btn, caregiverId){
    const reason = prompt('Reason for this export (it is logged with your name):', 'audit export'); if(reason === null) return;
    if(btn){ btn.disabled = true; btn.textContent = 'Building…'; }
    try {
      const r = await sb.functions.invoke('caregiver-export', { body: Object.assign({ action:'export', reason }, caregiverId ? { caregiver_id:String(caregiverId) } : { journey_id: CUR.journey.journey_id }) });
      let d = r.data; if(r.error){ let why=''; try{ if(r.error.context && r.error.context.json) why=(await r.error.context.json()).error||''; }catch(_){} throw new Error(why || r.error.message); }
      if(!d || d.error) throw new Error((d && d.error) || 'the export server did not answer');
      const box = document.getElementById('crExport');
      const html = '<div style="background:#F6F2E9;border-radius:8px;padding:.5rem .7rem"><b>Personnel file ready</b> (links open for 5 minutes; every open is logged): <a href="' + esc(d.url) + '" target="_blank" rel="noopener">open the PDF</a>'
        + (d.proofs && d.proofs.length ? '<div style="margin-top:.3rem">Proofs: ' + d.proofs.map(p => p.url ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.label) + '</a>' : '<span style="color:#8A7F70">' + esc(p.label) + ' (no link)</span>').join(' · ') + '</div>' : '') + '</div>';
      if(box) box.innerHTML = html; else alert('Personnel file ready: ' + d.url);
      if(!box && d.url) window.open(d.url, '_blank');
    } catch(e){ alert('The export did not run: ' + (e.message || e)); if(btn){ btn.disabled = false; btn.textContent = '⇩ Personnel file (PDF)'; } }
  }
  /* the small line for a row: status in a few words, for the People & Checks row */
  function chip(offerId){ return '<button class="ibtn" style="font-size:.72rem" onclick="CRX.open(\'' + esc(offerId) + '\')" title="The one readiness card: every requirement, what is blocking, who owns the next move">&#9776; Readiness</button>'; }
  /* SLICE 5: every open card, for the Orientations tab's Ready for final approval list (cached a minute; redraws when it lands) */
  function list(onReady){
    if(LIST.rows && Date.now() - LIST.at < 60000) return LIST.rows;
    if(!LIST.loading){ LIST.loading = call({ action:'list' }).then(r => { LIST.rows = r.rows || []; LIST.may = !!r.may_approve_work; LIST.at = Date.now(); LIST.loading = null; if(typeof onReady === 'function') onReady(LIST.rows); }).catch(() => { LIST.loading = null; LIST.at = Date.now(); LIST.rows = LIST.rows || []; }); }
    return LIST.rows || [];
  }
  /* the Ready for final approval block (empty string when nobody is ready or waiting on AxisCare) */
  function finalListHtml(rows){
    const ready = (rows || []).filter(r => r.ready_for_final || (r.approved_to_work && r.axiscare === 'failed'));
    if(!ready.length) return '';
    return '<div style="background:linear-gradient(135deg,#f3f7ff,#eef2ff);border:1.5px solid #0D365F;border-radius:12px;padding:.85rem 1rem;margin-bottom:1rem">'
      + '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.6rem;flex-wrap:wrap"><span style="font-size:.95rem">✓</span><span style="font-size:.88rem;font-weight:700;color:#0D365F">Ready for final approval</span><span style="background:#0D365F;color:#fff;font-size:.68rem;font-weight:700;border-radius:12px;padding:.1rem .5rem">' + ready.length + '</span>'
      + '<span style="font-size:.75rem;color:#6E6559">' + (LIST.may ? 'Open the card and press Approve to Work.' : 'Waiting for a person on the Approve to Work list (Samantha or Zachary).') + '</span></div>'
      + '<div style="display:flex;flex-direction:column;gap:.45rem">' + ready.map(r => '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:.45rem .6rem;background:#fff;border:1.5px solid ' + (r.axiscare === 'failed' ? '#B91C1C' : '#0D365F') + ';border-radius:9px;padding:.45rem .8rem"><span style="font-size:.84rem;font-weight:600;color:#0D365F">' + esc(r.name) + '</span>'
        + (r.axiscare === 'failed' ? '<span style="font-size:.7rem;color:#B91C1C;font-weight:700">Approval recorded, AxisCare update failed: open the card and press Retry</span>' : '<span style="font-size:.7rem;color:#6E6559">every requirement complete · scheduling locked until the press</span>')
        + '<span style="margin-left:auto">' + chip(r.offer_id) + '</span></div>').join('') + '</div></div>';
  }
  window.CRX = { open, close, confirm, record, notNeeded, approve, retry, chip, call, list, finalListHtml, exportFile };
})();
