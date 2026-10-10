/* =====================================================================================================================
   CAREGIVER READINESS (SLICE 3b, Samantha approved Migrations A and B, 2026-10-10): the ONE new-hire readiness view.
   One card per person: every requirement grouped by stage, the next blocking item and who owns it, and whether they are
   Approved to Work. Drawn from the caregiver-journey function (the same tables and rules file as the client journey); the
   page decides nothing. A button shows only when the server says this signed-in person may press it, and the server
   refuses regardless of the page. Fictional offers only until the switch date.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const when = iso => iso ? new Date(iso).toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : '';
  const day = iso => iso ? new Date(iso).toLocaleDateString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', year:'numeric' }) : '';
  const STATUS = { complete:['✓', '#15803D', 'Done'], not_needed:['–', '#8A7F70', 'Not needed'], exception:['!', '#B45309', 'Owner exception'], ready:['○', '#0D365F', 'Ready'], attention:['!', '#B91C1C', 'Needs attention'],
    blocked:['⛔', '#B91C1C', 'Blocked'], waiting:['…', '#B45309', 'Waiting'], later:['·', '#B9AF9E', 'Later'] };
  let CUR = null;
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
  function card(){
    const d = CUR; if(!d) return '';
    if(!d.journey) return '<div style="font-weight:800;color:#0D365F;font-size:1rem">Readiness</div><div style="font-size:.85rem;color:#6E6559;margin-top:.4rem">No readiness card yet: it starts the moment both offer documents are signed.</div><div style="margin-top:.8rem;text-align:right"><button class="ibtn" onclick="CRX.close()">Close</button></div>';
    const v = d.view || {}, rows = v.rows || [];
    const approved = rows.find(r => r.key === 'cg.approve.work');
    const ok = approved && approved.status === 'complete';
    let h = '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.6rem"><div><div style="font-weight:800;color:#0D365F;font-size:1rem">Readiness · ' + esc(d.journey.client_name) + '</div>'
      + '<div style="font-size:.76rem;color:#6E6559;margin-top:.1rem">One card: every requirement, what is blocking, who owns the next move. Drawn from the records; nothing here is typed.</div></div>'
      + '<div style="flex:none;border-radius:999px;padding:.3rem .7rem;font-size:.78rem;font-weight:800;' + (ok ? 'background:#DCFCE7;color:#15803D' : 'background:#FFF7ED;color:#B45309') + '">' + (ok ? 'Approved to Work ' + esc(day(approved.st && approved.st.completed_at)) : 'Not approved to work') + '</div></div>';
    if(d.facts && d.facts.dates) h += '<div style="font-size:.76rem;color:#6E6559;margin:.4rem 0">Employment start (orientation completed): <b>' + esc(d.facts.dates.orientation || 'not yet') + '</b> · AxisCare hire date: <b>' + esc(d.facts.dates.axiscare_hire || 'none') + '</b>' + (d.facts.dates.differ ? ' <span style="color:#B45309;font-weight:700">(they differ: reconcile)</span>' : '') + '</div>';
    /* the rail */
    h += '<div style="display:flex;gap:.3rem;flex-wrap:wrap;margin:.6rem 0">' + (v.rail || []).map(s => '<span style="font-size:.7rem;font-weight:700;letter-spacing:.03em;text-transform:uppercase;padding:.2rem .55rem;border-radius:999px;' + (s.state === 'done' ? 'background:#DCFCE7;color:#15803D' : s.state === 'now' ? 'background:#0D365F;color:#fff' : s.state === 'stopped' ? 'background:#FDECEC;color:#B91C1C' : 'background:#EEE9DF;color:#8A7F70') + '">' + esc(s.label) + '</span>').join('') + '</div>';
    /* the next move */
    if(v.next){ const n = v.next; h += '<div style="background:#FFF7ED;border:1px solid #FCD9A8;border-radius:8px;padding:.5rem .7rem;font-size:.84rem"><b>Next:</b> ' + esc(n.def.title) + ' · <b>' + esc(ownerWords(n.owner)) + '</b>' + (n.why ? ' · ' + esc(n.why) : '') + (n.attention ? ' · <span style="color:#B91C1C;font-weight:700">' + esc(n.attention) + '</span>' : '') + '</div>'; }
    else if(v.complete) h += '<div style="background:#DCFCE7;border-radius:8px;padding:.5rem .7rem;font-size:.84rem;color:#15803D;font-weight:700">Every requirement is complete.</div>';
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
          + ' · <span title="' + esc(r.def.proof) + '">' + esc(proofWords(r.def.proof)) + '</span></div></div>';
        if(may && r.def.proof === 'confirmed' && ['ready', 'attention'].indexOf(r.status) > -1) line += '<button class="ibtn" style="font-size:.72rem;flex:none" onclick="CRX.confirm(\'' + esc(r.key) + '\',this)">Confirm</button>';
        if(may && r.def.proof === 'proof' && ['ready', 'attention'].indexOf(r.status) > -1 && /^cg\.credential\./.test(r.key)) line += '<button class="ibtn" style="font-size:.72rem;flex:none" onclick="CRX.record(\'' + esc(r.key) + '\',this)">Record</button>';
        if(d.is_owner && ['ready', 'attention', 'later', 'blocked'].indexOf(r.status) > -1 && r.def.required !== false) line += '<button class="ibtn" style="font-size:.72rem;flex:none;color:#8A7F70" onclick="CRX.notNeeded(\'' + esc(r.key) + '\',this)" title="Owners only: mark not needed, with the reason">Not needed</button>';
        h += line + '</div>';
      });
    });
    h += '<div style="font-size:.72rem;color:#8A7F70;margin-top:.6rem">Verified rows come from the records on their own (the offer, the Step 1 forms, the Background and References row, the welcome call, the roster, the profile). Confirmed rows need the named list on the Admin page. Every change is permanent history.</div>';
    if(d.events && d.events.length) h += '<details style="margin-top:.5rem"><summary style="font-size:.76rem;color:#0D365F;cursor:pointer">History (' + d.events.length + ')</summary>' + d.events.slice(0, 40).map(e => '<div style="font-size:.74rem;padding:.12rem 0">' + esc(when(e.at)) + ' · ' + esc(e.kind) + (e.step_key ? ' · ' + esc(e.step_key) : '') + ' · ' + esc(e.actor_name || e.actor_email) + (e.reason ? ' · "' + esc(e.reason) + '"' : '') + '</div>').join('') + '</details>';
    h += '<div style="margin-top:.8rem;text-align:right"><button class="ibtn" onclick="CRX.close()">Close</button></div>';
    return h;
  }
  const ownerWords = o => !o ? 'the Hub' : o.email ? o.email : o.role === 'owner' ? 'an owner' : o.role === 'hub' ? 'the Hub (verified on its own)' : (o.role || '').replace(/_/g, ' ');
  const proofWords = p => ({ verified:'verified by the Hub', proof:'result + document', confirmed:'a named person confirms', answer:'answer' })[p] || p;
  function render(){ document.getElementById('crBody').innerHTML = card(); }
  async function act(body, btn){
    if(btn){ btn.disabled = true; btn.textContent = 'Saving…'; }
    try { CUR = Object.assign(await call(Object.assign({ journey_id: CUR.journey.journey_id }, body)), { who: CUR.who }); render(); }
    catch(e){ alert(e.message || e); if(btn){ btn.disabled = false; btn.textContent = 'Try again'; } }
  }
  async function confirm(key, btn){ if(!window.confirm('Confirm this requirement as complete, in your name and with the time? It is permanent history.')) return; await act({ action:'confirm', step_key:key }, btn); }
  async function record(key, btn){ const result = prompt('Result (for example: verified, current):'); if(!result) return; const document_ = prompt('Where is the document? Paste a link or the file path on the row:'); if(!document_) { alert('A result needs its document.'); return; } const expires = prompt('Expiry date, YYYY-MM-DD (blank if none):') || ''; await act({ action:'record', step_key:key, result, document: document_, expires }, btn); }
  async function notNeeded(key, btn){ const reason = prompt('Why is this not needed for this person? (owners only; permanent)'); if(!reason || reason.trim().length < 5) return; await act({ action:'not_needed', step_key:key, reason }, btn); }
  /* the small line for a row: status in a few words, for the People & Checks row */
  function chip(offerId){ return '<button class="ibtn" style="font-size:.72rem" onclick="CRX.open(\'' + esc(offerId) + '\')" title="The one readiness card: every requirement, what is blocking, who owns the next move">&#9776; Readiness</button>'; }
  window.CRX = { open, close, confirm, record, notNeeded, chip, call };
})();
