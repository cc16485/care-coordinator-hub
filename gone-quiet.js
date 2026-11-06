/* =====================================================================================================================
   GONE QUIET (Caregivers > Directory; Samantha 2026-11-04: "a good way to offboard employees for inactivity, not picking up
   shifts - send them a text and email - then see if they reach out and say they want to still be active otherwise they
   will be terminated"). Her decisions the same day: 30 days with no visit (PRN team 60), the office presses Send, 7 days to
   answer, YES needs a shift within 14 days, NO or no answer goes to her for sign-off. She approved the words and this list.
   The server (Hub server gone-quiet, table gone_quiet) builds the list every Monday and reads the replies; this file only
   draws it, in three parts:
     · Ready to ask: tick and Send (the check-in text and email), or Not this one with a note (off the list 30 days, or for good for office staff).
     · Waiting on an answer: asked (comes to Samantha on the reply-by day), an unclear reply (Mark as YES / Send to
       Samantha), or YES (needs a shift by a date; Find them a shift opens Cara).
     · Waiting on Samantha: NO, STOP or no answer. Owners see Approve (the goodbye goes) and Keep them; the Termination
       checklist is on the Owners Hub.
   While the switch (ops_settings.gone_quiet_live) is off the list shows, and Send answers that nothing went.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const get = n => { try{ return (0, eval)(n); }catch(e){ return undefined; } };
  const toast = m => { try{ (typeof ccToast === 'function' ? ccToast : alert)(m); }catch(e){} };
  const day = ymd => { const t = Date.parse(String(ymd || '').slice(0, 10) + 'T12:00:00Z'); return isNaN(t) ? '' : new Date(t).toLocaleDateString('en-US', { timeZone:'UTC', month:'short', day:'numeric' }); };
  const ST = { rows:null, live:false, built:null, at:0, busy:false, err:'', ticked:{}, el:null };
  const owner = () => { const r = get('CC_ROLES'); return Array.isArray(r) && r.includes('owner_admin'); };

  async function call(body){
    const { data, error } = await sb.functions.invoke('gone-quiet', { body });
    if(error || (data && data.error)){ let m = (data && data.error) || (error && error.message) || 'no answer'; try{ const j = await error.context.json(); if(j && j.error) m = j.error; }catch(e){} throw new Error(m); }
    return data || {};
  }
  async function load(force){
    if(ST.busy || (!force && ST.rows && Date.now() - ST.at < 60e3)) return;
    ST.busy = true; ST.err = '';
    try{ const j = await call({ action:'list' }); ST.rows = j.rows || []; ST.live = !!j.live; ST.built = j.built || null; ST.at = Date.now();
      ST.rows.filter(r => r.state === 'ready' && ST.ticked[r.id] === undefined).forEach(r => { ST.ticked[r.id] = true; }); }
    catch(e){ ST.err = e.message || String(e); }
    ST.busy = false; draw();
  }
  /** the pill's count: everyone ready to ask */
  function count(){ return (ST.rows || []).filter(r => r.state === 'ready').length; }

  const name = r => '<a href="javascript:void 0" onclick="GQ.profile(\'' + esc(r.axiscare_id) + '\')">' + esc(r.name || 'Caregiver') + '</a>'
    + (r.team === 'prn' ? ' <span class="gq-prn">PRN</span>' : '');
  const lastLine = r => r.last_visit ? 'Last visit ' + esc(day(r.last_visit)) + '<div class="field-note">' + esc(r.days_quiet) + ' days ago</div>' : 'No visit in the last 4 months';
  const how = r => /@/.test(r.email || '') && String(r.phone || '').replace(/\D/g, '').length >= 10 ? 'Text and email' : /@/.test(r.email || '') ? 'Email only (no phone)' : String(r.phone || '').replace(/\D/g, '').length >= 10 ? 'Text only (no email)' : 'No phone or email in AxisCare';
  const who = by => String(by || '').split(/[ @]/)[0];

  function draw(){
    const el = ST.el; if(!el || !document.body.contains(el)) return;
    const pill = document.getElementById('gqCount'); if(pill) pill.textContent = ST.rows ? ' · ' + count() : '';
    if(ST.err && !ST.rows){ el.innerHTML = '<div class="card" style="padding:16px;">The Gone quiet list could not be read: ' + esc(ST.err) + ' <button class="secondary" onclick="GQ.reload()">Try again</button></div>'; return; }
    if(!ST.rows){ el.innerHTML = '<div class="card" style="padding:16px;" class="field-note">Loading the Gone quiet list…</div>'; return; }
    const R = ST.rows, today = new Date().toLocaleString('sv-SE', { timeZone:'America/Chicago' }).slice(0, 10);
    const ready = R.filter(r => r.state === 'ready'), wait = R.filter(r => ['asked', 'card', 'yes'].includes(r.state)), her = R.filter(r => r.state === 'to_owner');
    const recent = R.filter(r => ['ended', 'kept', 'back_to_work', 'no_shift_after_yes', 'skipped'].includes(r.state)).slice(0, 15);
    const n = ready.filter(r => ST.ticked[r.id]).length;
    let h = '<div class="field-note" style="margin:-2px 0 12px;">Active in AxisCare, no visit worked in 30 days (PRN team: 60 days). The list refreshes every Monday morning'
      + (ST.built ? ' (last built ' + esc(new Date(ST.built).toLocaleDateString('en-US', { month:'short', day:'numeric' })) + ')' : '') + '. <a href="javascript:void 0" onclick="GQ.refresh(this)">Refresh now</a></div>';
    if(!ST.live) h += '<div class="gq-off">The check-in switch is off (Admin page, "Gone quiet check-in"). The list is real; Send sends nothing until Samantha turns it on.</div>';
    /* ready */
    h += '<div class="card gq-card"><div class="gq-h"><b>Ready to ask · ' + ready.length + '</b><span style="flex:1"></span>'
      + (ready.length ? '<button class="primary" onclick="GQ.send(this)"' + (n ? '' : ' disabled') + '>Send check-in to ' + n + ' ticked</button>' : '') + '</div>'
      + (ready.length ? ready.map(r => '<div class="gq-row gq-4"><input type="checkbox"' + (ST.ticked[r.id] ? ' checked' : '') + ' onchange="GQ.tick(\'' + esc(r.id) + '\',this.checked)" aria-label="Ask ' + esc(r.name) + '">'
          + '<div>' + name(r) + '<div class="field-note">' + (r.team === 'prn' ? 'PRN team' : 'Caregiver') + '</div></div><div>' + lastLine(r) + '</div>'
          + '<div class="field-note">' + esc(how(r)) + '<br><a href="javascript:void 0" onclick="GQ.skip(\'' + esc(r.id) + '\')">Not this one</a></div></div>').join('')
        + '<div class="field-note" style="margin-top:8px;">Untick anyone on approved leave or with a reason. "Not this one" takes them off the list for 30 days, with your note, or for good (office staff).</div>'
        : '<div class="field-note">Nobody has gone quiet this week.</div>') + '</div>';
    /* waiting on an answer */
    h += '<div class="card gq-card"><div class="gq-h"><b>Waiting on an answer · ' + wait.length + '</b></div>'
      + (wait.length ? wait.map(r => {
          let mid, act = '';
          if(r.state === 'asked'){ mid = 'No answer yet<div class="field-note">Goes to Samantha ' + esc(day(addDay(r.answer_by, 1))) + ' if they don\'t answer</div>';
            act = '<button class="secondary" onclick="GQ.yes(\'' + esc(r.id) + '\')">Mark as YES</button>'; }
          else if(r.state === 'card'){ mid = '<span style="color:#8A4E0C;">Answered, not YES or NO:</span> "' + esc(String(r.answer_text || '').slice(0, 120)) + '"<div class="field-note">Call them, then choose</div>';
            act = '<button class="secondary" onclick="GQ.yes(\'' + esc(r.id) + '\')">Mark as YES</button> <button class="secondary" onclick="GQ.toOwner(\'' + esc(r.id) + '\')">Send to Samantha</button>'; }
          else { const late = r.shift_by && r.shift_by < today; mid = '<span style="color:var(--teal-dark,#1E7F7A);">Said YES ' + esc(day(r.answered_at)) + '</span><div class="field-note">Needs a shift by ' + esc(day(r.shift_by)) + (late ? ' (past)' : '') + '</div>';
            act = '<button class="secondary" onclick="GQ.findShift()">Find them a shift</button>'; }
          return '<div class="gq-row gq-3"><div>' + name(r) + '<div class="field-note">Asked ' + esc(day(r.asked_at)) + (r.asked_by ? ' by ' + esc(who(r.asked_by)) : '') + (r.texted === false && r.emailed ? ', email only' : r.emailed === false && r.texted ? ', text only' : '') + '</div></div><div>' + mid + '</div><div>' + act + '</div></div>';
        }).join('') : '<div class="field-note">Nobody is waiting on an answer.</div>') + '</div>';
    /* waiting on Samantha */
    h += '<div class="card gq-card"><div class="gq-h"><b>Waiting on Samantha · ' + her.length + '</b></div>'
      + (her.length ? her.map(r => '<div class="gq-row gq-3"><div>' + name(r) + '<div class="field-note">' + esc(String(r.to_owner_why || '').slice(0, 140)) + '</div></div>'
          + '<div>On the Termination list<div class="field-note">Reason: No shifts, no reply</div></div><div>'
          + (owner() ? '<button class="primary" onclick="GQ.approve(\'' + esc(r.id) + '\',this)">Approve' + (r.answer === 'stop' ? '' : ', send goodbye') + '</button> <button class="secondary" onclick="GQ.keep(\'' + esc(r.id) + '\')">Keep them</button>'
            : '<span class="field-note">Samantha decides</span>') + '</div></div>').join('')
        + '<div class="field-note" style="margin-top:8px;">' + (owner() ? 'Approve sends the goodbye text (never after a STOP). Then finish the checklist on the Owners Hub, including marking them Inactive in AxisCare: <a href="https://hub.mo-care.com/owners.html" target="_blank" rel="noopener">open Offboarding</a>.' : 'Only Samantha sees the sign-off buttons.') + '</div>'
        : '<div class="field-note">Nobody is waiting on a decision.</div>') + '</div>';
    if(recent.length) h += '<details class="card gq-card"><summary style="cursor:pointer;"><b>Recently closed</b> <span class="field-note">(' + recent.length + ')</span></summary>'
      + recent.map(r => '<div class="gq-row gq-2"><div>' + name(r) + '</div><div class="field-note">' + esc(r.state === 'skipped' && r.skip_until === '9999-12-31' ? 'Never on this list' : CLOSED[r.state] || r.state) + (r.skip_note ? ': ' + esc(r.skip_note) : r.keep_note ? ': ' + esc(r.keep_note) : '') + (r.decided_by ? ' (' + esc(who(r.decided_by)) + ')' : r.skip_by ? ' (' + esc(who(r.skip_by)) + ')' : '') + '</div></div>').join('') + '</details>';
    el.innerHTML = h;
  }
  const CLOSED = { ended:'Ended, approved', kept:'Kept by Samantha', back_to_work:'Back at work', no_shift_after_yes:'Said YES, no shift in 14 days (back on the list Monday)', skipped:'Not this one' };
  const addDay = (ymd, n) => { const t = Date.parse(String(ymd || '').slice(0, 10) + 'T12:00:00Z'); return isNaN(t) ? '' : new Date(t + n * 864e5).toISOString().slice(0, 10); };

  async function act(body, okMsg){
    try{ const j = await call(body); if(okMsg) toast(typeof okMsg === 'function' ? okMsg(j) : okMsg); return j; }
    catch(e){ alert('Not saved: ' + (e.message || e)); return null; }
    finally{ load(true); }
  }
  const ask = async (q) => typeof ccConfirm === 'function' ? ccConfirm(q) : confirm(q);

  window.GQ = {
    render(el){ ST.el = el; draw(); load(false); },
    reload(){ load(true); },
    count,
    tick(id, on){ ST.ticked[id] = !!on; draw(); },
    profile(ax){ try{ cgdOpenProfile(ax); }catch(e){} },
    findShift(){ try{ schedGo('coverage'); }catch(e){ try{ switchTab('coverage'); }catch(_){} } },
    async refresh(a){ if(a) a.textContent = 'Reading AxisCare…'; await act({ action:'refresh' }, j => 'This week\'s list: ' + (j.listed ?? 0) + ' to ask.'); },
    async send(btn){
      const ids = (ST.rows || []).filter(r => r.state === 'ready' && ST.ticked[r.id]).map(r => r.id); if(!ids.length) return;
      if(!(await ask('Send the "still wanting to work with us?" text and email to ' + ids.length + ' caregiver' + (ids.length === 1 ? '' : 's') + '? They have 7 days to answer.'))) return;
      if(btn){ btn.disabled = true; btn.textContent = 'Sending…'; }
      await act({ action:'send', ids }, j => (j.off && j.off.length) ? 'The switch is off: nothing was sent.' : 'Sent: ' + (j.texted || []).length + ' text' + ((j.texted || []).length === 1 ? '' : 's') + ', ' + (j.emailed || []).length + ' email' + ((j.emailed || []).length === 1 ? '' : 's')
        + ((j.not_sent || []).length ? '. Not sent (no textable phone or email, or they opted out): ' + j.not_sent.join(', ') : '') + '.');
    },
    async skip(id){
      const note = prompt('Why not this one? (on leave, a reason). They come off the list for 30 days.', ''); if(note === null) return;
      if(!note.trim()){ alert('Add a short note so the next person knows why.'); return; }
      /* Samantha 2026-11-04: office staff set up as caregivers in AxisCare never belong on this list */
      const forever = await ask('Leave them off this list for good? Choose this for office staff or anyone who should never get this text. Otherwise they are off for 30 days.');
      await act({ action:'skip', id, note, forever }, forever ? 'Off the list for good.' : 'Off the list for 30 days.');
    },
    async yes(id){ const note = prompt('How did they say yes? (a call, an email reply)', ''); if(note === null) return; await act({ action:'mark_yes', id, note }, 'Marked YES. They need a shift within 14 days.'); },
    async toOwner(id){ const note = prompt('What did they say? (goes on the Termination item for Samantha)', ''); if(note === null) return; await act({ action:'to_owner', id, note }, 'Sent to Samantha.'); },
    async approve(id, btn){
      const r = (ST.rows || []).find(x => x.id === id); if(!r) return;
      if(!(await ask('Approve ending ' + r.name + '\'s employment?' + (r.answer === 'stop' ? ' They replied STOP, so no goodbye text goes.' : ' The goodbye text goes now.')))) return;
      if(btn){ btn.disabled = true; btn.textContent = 'Saving…'; }
      await act({ action:'approve', id }, j => j.goodbye_sent ? 'Approved. The goodbye went. Finish the checklist on the Owners Hub.' : 'Approved. No goodbye went (' + (j.why_not || 'not sent') + '). Finish the checklist on the Owners Hub.');
    },
    async keep(id){ const note = prompt('Keep them on the team. A short note why:', ''); if(note === null) return; await act({ action:'keep', id, note }, 'Kept. The Termination item is closed.'); },
    _st: ST, _draw: draw,
  };
  const css = document.createElement('style');
  css.textContent = '.gq-card{padding:12px 16px;margin-bottom:12px;}.gq-h{display:flex;align-items:center;gap:8px;margin-bottom:6px;}'
    + '.gq-row{display:grid;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--border);font-size:14px;}'
    + '.gq-4{grid-template-columns:24px minmax(0,1fr) 150px 170px;}.gq-3{grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) auto;}.gq-2{grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);}'
    + '.gq-prn{font-size:11px;background:#EEEDFE;color:#3C3489;padding:1px 6px;border-radius:4px;font-weight:600;}'
    + '.gq-off{background:#FFF7E6;border:1px solid #F5D69A;color:#7A4B00;border-radius:8px;padding:8px 12px;margin:0 0 12px;font-size:13px;}'
    + '@media (max-width:640px){.gq-4,.gq-3,.gq-2{grid-template-columns:1fr;}}';
  document.head.appendChild(css);
})();
