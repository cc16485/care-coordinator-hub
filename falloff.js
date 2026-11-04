/* =====================================================================================================================
   falloff.js · WHEN AN ONBOARDING HIRE FALLS OFF (Samantha 2026-11-04, her four answers: Eligible For Rehire in AxisCare;
   the check-in AND the office's Take off; a late YES is a card with one-click Put back; Training access closes on its
   nightly sync). window.FALLOFF.
   The server (Hub server caregiver-journey, _shared/onboarding-falloff.ts, table onboarding_falloff) does the AxisCare
   change and reads it back; this file only shows it and asks:
     · chip(c)          the AxisCare line on a Taken off row (Onboarding, More, Taken off the list)
     · actions(it)      the buttons on the "replied YES after being taken off" card: Put back, Leave them off
     · putBack(id)      Put back = the same come_back (CRX.call) the Reactivate button uses (owners and the Approve to Work list);
                        the server sets them In Training in AxisCare again and closes the card
     · leftNote(r)      what the office is told after Take off
   While the switch (ops_settings.falloff_axiscare_live) is off the chip says the change is by hand, like before.
   ===================================================================================================================== */
(function(){
  'use strict';
  const ST = { rows: null, at: 0, busy: false };
  const AGAIN = 60000;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  const day = iso => { try{ return new Date(iso).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }); }catch(e){ return ''; } };
  const chip = (cls, text, title) => '<span class="badge ' + cls + '" style="display:inline-block;margin-top:4px;font-size:.62rem;white-space:normal"' + (title ? ' title="' + esc(title) + '"' : '') + '>' + esc(text) + '</span>';

  async function load(force){
    if(ST.busy || typeof sb === 'undefined' || (!force && ST.rows && Date.now() - ST.at < AGAIN)) return;
    ST.busy = true;
    try{
      const since = new Date(Date.now() - 90 * 864e5).toISOString();
      const { data, error } = await sb.from('onboarding_falloff').select('*').gte('at', since).order('at', { ascending:false }).limit(500);
      ST.rows = !error && Array.isArray(data) ? data : (ST.rows || []); ST.at = Date.now();
      if(!error && window.SCX && typeof SCX.renderOB === 'function') try{ SCX.renderOB(); }catch(e){}
    }catch(e){ ST.at = Date.now(); }
    ST.busy = false;
  }

  /* the newest row for this candidate */
  function rowFor(c){
    if(!c) return null;
    load();
    return (ST.rows || []).find(r => String(r.candidate_id || '') === String(c.id)) || null;
  }

  /* the AxisCare line on a Taken off row */
  function line(r){
    if(!r) return '';
    if(r.back_state === 'put_back') return chip('b-green', 'AxisCare: back to In Training ' + day(r.back_at), r.back_detail);
    if(r.back_state === 'failed' || r.back_state === 'not_changed') return chip('b-red', 'AxisCare: not set back to In Training (card open)', r.back_detail);
    if(r.state === 'set') return chip('b-green', 'AxisCare: ' + (r.label_after || 'Eligible For Rehire') + ' (checked)', r.detail) + chip('b-gray', 'Training link closes on the nightly sync');
    if(r.state === 'already') return chip('b-gray', 'AxisCare: already ' + (r.label_before || 'inactive'), r.detail);
    if(r.state === 'has_visits') return chip('b-red', 'AxisCare not changed: has a shift (card open)', r.detail);
    if(r.state === 'not_training') return chip('b-red', 'AxisCare not changed: not In Training (card open)', r.detail);
    if(r.state === 'failed') return chip('b-red', 'AxisCare not changed: see the card', r.detail);
    if(r.state === 'practice') return chip('b-gray', 'AxisCare: set by hand (card)', 'The switch is off, so the Hub does not change AxisCare. ' + (r.detail || ''));
    return '';
  }
  function chipFor(c){ try{ return line(rowFor(c)); }catch(e){ return ''; } }

  /* what the office is told after Take off (the server's answer) */
  function leftNote(server){
    const a = server && server.axiscare;
    if(!a) return server && server.axiscare_card ? 'Done. They are already in AxisCare, so set them inactive there. You have a card for it.' : '';
    ST.at = 0;
    if(a.state === 'set') return 'Done. AxisCare now has them as ' + (a.label || 'Eligible For Rehire') + ' (checked). Their Training link closes tonight.';
    if(a.state === 'already') return 'Done. AxisCare already had them as ' + (a.label || 'inactive') + ', so nothing changed there.';
    if(a.state === 'practice') return 'Done. They are already in AxisCare, so set them inactive there. You have a card for it.';
    return 'Taken off the list. AxisCare was NOT changed: ' + (a.detail || 'see the card') + ' You have a card for it.';
  }

  /* the card's buttons */
  function actions(it){
    if(!it || it.status !== 'open' || it.kind !== 'falloff_said_yes') return '';
    const id = esc(String(it.id));
    return '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">'
      + '<button class="primary" style="padding:5px 11px;font-size:12px;" onclick="FALLOFF.putBack(\'' + id + '\', this)">Put back</button>'
      + '<button class="ghost" style="padding:5px 11px;font-size:12px;" onclick="FALLOFF.leaveOff(\'' + id + '\')">Leave them off</button>'
      + '<span class="field-note">Put back: back on Onboarding and In Training in AxisCare. Nothing is texted.</span></div>';
  }
  async function putBack(id, btn){
    const it = ((typeof DATA !== 'undefined' && DATA.ops_items) || []).find(x => x.id === id); if(!it) return;
    const name = String(it.title || '').replace(/ (replied YES|texted) after being taken off$/, '') || 'them';
    if(!(await ccConfirm('Put ' + name + ' back on Onboarding?\n\nThe Hub sets them In Training in AxisCare again, and the Training Platform sends their orientation link again tonight. Nothing is texted from here.'))) return;
    if(btn){ btn.disabled = true; btn.textContent = 'Putting back...'; }
    let r = null, err = '';
    try{
      if(!window.CRX || typeof CRX.call !== 'function') throw new Error('the readiness card did not load');
      r = await CRX.call({ action:'come_back', candidate_id:String(it.candidate_id || ''), offer_id:it.offer_id ? String(it.offer_id) : undefined, note:'Put back from the card: ' + (it.title || '') });
      if(r && r.error) throw new Error(r.error);
    }catch(e){ err = (e && e.message) || String(e); }
    if(err && !/did not leave onboarding/i.test(err)){ if(btn){ btn.disabled = false; btn.textContent = 'Put back'; } alert('Not put back: ' + err); return; }
    try{ if(typeof opsCloseCommit === 'function') await opsCloseCommit(it, err ? 'They were already back on Onboarding' : 'Put back on Onboarding'); }catch(e){}
    try{ if(typeof loadAllData === 'function') await loadAllData(); }catch(e){}
    ST.at = 0; load(true);
    alert(err ? name + ' was already back on Onboarding.' : name + ' is back on Onboarding.' + (r && r.note ? '\n\n' + r.note : ''));
  }
  async function leaveOff(id){
    const it = ((typeof DATA !== 'undefined' && DATA.ops_items) || []).find(x => x.id === id); if(!it) return;
    if(!(await ccConfirm('Leave them off Onboarding? This closes the card. Nothing is texted.'))) return;
    if(typeof opsCloseCommit === 'function') await opsCloseCommit(it, 'Left them off Onboarding');
  }

  window.FALLOFF = { chip: chipFor, line, actions, putBack, leaveOff, leftNote, _load: load, _st: ST };
})();
