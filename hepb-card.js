/* =====================================================================================================================
   HEPATITIS B, the office half (OSHA 29 CFR 1910.1030; the owner's ruling 2026-10-13).
   One card on a person's page: the caregiver page's Checks tab and the applicant page's Hiring tab.
   Everything comes from the server function hepb (staff sign-in). The server decides who sees what: everyone in the office sees
   only the status words (Not offered yet, Offered, Accepted, Declined, Complete), the training date, initial assignment and the
   deadline; ONLY an owner sees the answer, the doses, the documents and the history (confidential medical records,
   1910.1030(h)(1)(iii)). Documents open only through the server's logged open. No storage address is ever drawn on the page.
     HEPB.mount(el, key)        key = { caregiver_id, axiscare_id } | { offer_id } | { applicant_id } (resolved to its offer)
     HEPB.mountCaregiver(c, g)  the caregiver page hook
   One card, never stacked layers (her rule).
   ===================================================================================================================== */
(function(){
  'use strict';
  const FN = 'hepb';
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const PILL = { 'Complete':['#15803D','#DCFCE7'], 'Declined':['#3A342C','#F4F2ED'], 'Accepted':['#1D4ED8','#DBEAFE'], 'Offered':['#92400E','#FEF3C7'], 'Not offered yet':['#92400E','#FEF3C7'],
    'Answered, the office is checking':['#92400E','#FEF3C7'], 'Not required for this position':['#6E6559','#F4F2ED'], 'Not set up yet':['#6E6559','#F4F2ED'] };
  const pill = w => { const c = PILL[w] || ['#6E6559','#F4F2ED']; return '<span style="display:inline-block;padding:.12rem .5rem;border-radius:999px;font-size:.75rem;font-weight:700;color:' + c[0] + ';background:' + c[1] + '">' + esc(w) + '</span>'; };
  const EVENT_WORD = { created:'Set up', training_confirmed:'Training confirmed', assignment_set:'Initial assignment set', offered:'Offered', offer_held:'Offer held', offer_refused:'Offer not sent',
    chose:'Answered', declined:'Declination signed', doc_uploaded:'Document added', dose_recorded:'Dose recorded', series_complete:'Series complete', verified:'Checked', card:'Card', note:'Note' };
  const CHOICE_WORD = { vaccine:'The vaccine', prior_series:'Already completed the series', immune:'Immune by antibody test', contraindicated:'Medically contraindicated' };
  const day = d => { if(!d) return ''; try{ return new Date(String(d).slice(0,10) + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); }catch(_){ return String(d); } };
  const central = iso => { try{ return new Date(iso).toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' }); }catch(_){ return String(iso || ''); } };
  const todayCentral = () => { try{ return new Date().toLocaleDateString('en-CA', { timeZone:'America/Chicago' }); }catch(_){ return new Date().toISOString().slice(0,10); } };
  const idOf = k => { const o = {}; ['caregiver_id','axiscare_id','offer_id'].forEach(x => { if(k && k[x] != null && k[x] !== '') o[x] = String(k[x]); }); return o; };

  async function call(body){
    try{
      const r = await sb.functions.invoke(FN, { body });
      if(r.error){
        let j = null; try{ if(r.error.context && typeof r.error.context.json === 'function') j = await r.error.context.json(); }catch(_){}
        return { ok:false, status:(r.error.context && r.error.context.status) || 0, data:j || {}, error:(j && j.error) || r.error.message || 'The hepatitis B server did not answer.' };
      }
      if(!r.data || r.data.error) return { ok:false, status:200, data:r.data || {}, error:(r.data && r.data.error) || 'The hepatitis B server did not answer.' };
      return { ok:true, status:200, data:r.data, error:'' };
    }catch(e){ return { ok:false, status:0, data:{}, error:'Could not reach the hepatitis B server: ' + ((e && e.message) || 'no answer') }; }
  }
  async function resolve(k){
    if(!k || !k.applicant_id) return idOf(k);
    try{
      const r = await sb.functions.invoke('hire-profile', { body:{ action:'get', applicant_id:k.applicant_id } });
      const ids = (r && r.data && r.data.ids) || {}, o = {};
      if(ids.offer_id) o.offer_id = String(ids.offer_id); if(ids.caregiver_id != null) o.caregiver_id = String(ids.caregiver_id);
      return o;
    }catch(_){ return {}; }
  }

  const CARDS = [];
  async function mount(el, k){
    if(!el) return;
    for(let j = CARDS.length - 1; j >= 0; j--) if(CARDS[j].el === el || !CARDS[j].el.isConnected) CARDS.splice(j, 1);
    el.innerHTML = '<div class="field-note">Checking…</div>';
    const ids = await resolve(k);
    if(!Object.keys(ids).length){ el.innerHTML = '<div class="field-note">No offer or roster record yet: hepatitis B is set up at Approve to Work.</div>'; return; }
    const c = { el, ids, i:CARDS.length, msg:'', msgOk:true, exposure:null };
    CARDS.push(c); await load(c);
  }
  async function load(c){
    const r = await call(Object.assign({ action:'get' }, c.ids));
    c.r = r; draw(c);
  }
  function btn(label, fn, extra){ return '<button class="btn btn-sm' + (extra ? ' ' + extra : '') + '" style="margin:.15rem .3rem .15rem 0" onclick="' + fn + '">' + esc(label) + '</button>'; }
  function draw(c){
    if(!c.el.isConnected) return;
    const r = c.r, i = c.i;
    if(!r.ok){ c.el.innerHTML = '<div class="field-note">Hepatitis B could not be read: ' + esc(r.error) + '</div>'; return; }
    const d = r.data, row = d.row;
    let h = '';
    if(c.msg) h += '<div style="background:' + (c.msgOk ? '#F0F7F4' : '#FDECEC') + ';color:' + (c.msgOk ? '#15803D' : '#B00020') + ';border-radius:8px;padding:.45rem .65rem;font-size:.8rem;margin-bottom:.5rem">' + esc(c.msg) + '</div>';
    if(!row){
      h += '<div style="margin-bottom:.4rem">' + pill('Not set up yet') + '</div>';
      if(c.ids.caregiver_id) h += '<div class="field-note" style="margin-bottom:.35rem">New hires are set up automatically at Approve to Work. For a current caregiver, set it up here; their position decides whether the vaccine is offered.</div>'
        + '<label class="field-note" for="hbPos' + i + '">Position (blank: from their offer or roster, else Caregiver)</label> <input id="hbPos' + i + '" list="hbPosList" style="max-width:14rem" placeholder="Caregiver"><datalist id="hbPosList">' + ((c.exposure || []).map(x => '<option value="' + esc(x.position) + '">')).join('') + '</datalist> '
        + btn('Set up', 'HEPB.act(' + i + ',\'setup\')');
      c.el.innerHTML = h; if(!c.exposure) loadExposure(c); return;
    }
    const late = row.late, today = todayCentral();
    h += '<div style="display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin-bottom:.35rem">' + pill(row.status_label) + '<span class="field-note">' + esc(row.position || '') + (row.exposed ? ' · exposure reasonably anticipated' : ' · no reasonably anticipated exposure') + '</span></div>';
    if(row.exposed){
      h += '<div style="font-size:.82rem;line-height:1.6">'
        + '<div><b>Bloodborne pathogens training:</b> ' + (row.training_date ? day(row.training_date) + (row.training_confirmed_by ? ' <span class="field-note">confirmed by ' + esc(row.training_confirmed_by) + '</span>' : '') : '<span style="color:#B45309;font-weight:700">not confirmed yet</span>') + '</div>'
        + '<div><b>Initial assignment:</b> ' + (row.assignment_date ? day(row.assignment_date) + ' <span class="field-note">' + esc({ first_contact:'first client visit', approved_to_work:'Approve to Work', office:'set by the office' }[row.assignment_source] || '') + '</span>' : '<span class="field-note">not known yet</span>') + '</div>'
        + '<div><b>Offer due by:</b> ' + (row.due_date ? (late ? '<b style="color:#B91C1C">' + day(row.due_date) + ' (passed)</b>' : day(row.due_date)) : '<span class="field-note">10 working days after initial assignment</span>') + '</div>'
        + '<div><b>Offered:</b> ' + (row.offered_at ? central(row.offered_at) + ' <span class="field-note">' + esc(row.offered_via || '') + '</span>' : '<span class="field-note">not yet</span>') + '</div></div>';
      h += '<div style="margin-top:.4rem">';
      if(!row.training_date) h += '<input type="date" id="hbTr' + i + '" max="' + today + '" style="max-width:10rem"> ' + btn('Confirm training date', 'HEPB.act(' + i + ',\'confirm_training\')');
      if(!row.assignment_date) h += ' <input type="date" id="hbAs' + i + '" max="' + today + '" style="max-width:10rem"> ' + btn('Set initial assignment', 'HEPB.act(' + i + ',\'set_assignment\')');
      if(row.may_send) h += btn('Send link', 'HEPB.act(' + i + ',\'send_link\')');
      if(!row.offered_at && row.status_label === 'Not offered yet') h += btn('Record offer made in person', 'HEPB.act(' + i + ',\'record_offer\')');
      h += '</div>';
    }
    if(d.owner && d.detail) h += ownerHtml(c, d);
    else if(row.exposed) h += '<div class="field-note" style="margin-top:.45rem">The answer, doses and documents are confidential medical records: only an owner sees them.</div>';
    c.el.innerHTML = h;
  }
  function ownerHtml(c, d){
    const i = c.i, x = d.detail, today = todayCentral();
    let h = '<div style="margin-top:.6rem;padding:.55rem .7rem;border:1px solid #ECD9AE;background:#FFFBF2;border-radius:9px;font-size:.82rem"><div class="field-note" style="font-weight:700;margin-bottom:.25rem">Owners only · confidential medical record · your view is logged</div>'
      + '<div><b>' + esc(x.status_label) + '</b>' + (x.choice_at ? ' <span class="field-note">' + esc(central(x.choice_at)) + (x.choice_by ? ', ' + esc(x.choice_by) : '') + '</span>' : '') + '</div>';
    if(x.declined_at) h += '<div>Declination signed ' + esc(central(x.declined_at)) + ' by typed name ' + esc(x.declination_typed_name || '') + (x.declination_pdf ? ' ' + btn('Open signed declination', 'HEPB.open(' + i + ',\'declination\')') : ' <span style="color:#B91C1C">(PDF missing: a card is open)</span>') + '</div>';
    if((x.doses || []).length) h += '<div>Doses: ' + x.doses.map(z => 'dose ' + esc(z.n) + ' ' + day(z.date)).join(', ') + '</div>';
    if(x.verified_at) h += '<div>Checked ' + esc(central(x.verified_at)) + ' by ' + esc(x.verified_by || '') + '</div>';
    h += '<div style="margin-top:.35rem">';
    if(x.status === 'vaccine') h += '<input type="date" id="hbDose' + i + '" max="' + today + '" style="max-width:10rem"> ' + btn('Record a dose', 'HEPB.act(' + i + ',\'record_dose\')') + ((x.doses || []).length ? btn('Series complete', 'HEPB.act(' + i + ',\'series_complete\')') : '');
    if(['prior_series','immune','contraindicated'].includes(x.status) && !x.verified_at) h += btn('Checked', 'HEPB.act(' + i + ',\'verify\')');
    if(!['complete'].includes(x.status) && x.status !== 'not_required') h += ' <select id="hbCh' + i + '" style="max-width:15rem"><option value="">Record an answer given on paper…</option>' + Object.keys(CHOICE_WORD).map(k => '<option value="' + k + '">' + esc(CHOICE_WORD[k]) + '</option>').join('') + '</select> ' + btn('Record', 'HEPB.act(' + i + ',\'record_choice\')');
    h += '</div>';
    if((d.docs || []).length) h += '<div style="margin-top:.35rem"><b>Documents</b>' + d.docs.map(z => '<div>' + esc(z.label) + ' <span class="field-note">' + esc(central(z.uploaded_at)) + ', ' + esc(z.uploaded_by) + '</span> ' + btn('Open', 'HEPB.open(' + i + ',\'' + esc(z.id) + '\')') + '</div>').join('') + '</div>';
    if((d.events || []).length) h += '<details style="margin-top:.35rem"><summary class="field-note">History (' + d.events.length + ')</summary>' + d.events.map(e => '<div class="field-note">' + esc(central(e.at)) + ' · ' + esc(EVENT_WORD[e.kind] || e.kind) + (e.by_name ? ' · ' + esc(e.by_name) : '') + '</div>').join('') + '</details>';
    return h + '</div>';
  }
  async function loadExposure(c){ const r = await call({ action:'exposure' }); if(r.ok){ c.exposure = r.data.table || []; draw(c); } }
  const cardAt = i => CARDS.find(c => c.i === i);
  const val = id => { const e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; };
  async function act(i, a){
    const c = cardAt(i); if(!c) return;
    const row = c.r && c.r.data && c.r.data.row;
    let body = { action:a, key:row && row.id };
    if(a === 'setup') body = { action:'setup', caregiver_id:c.ids.caregiver_id, position:val('hbPos' + i) || undefined };
    if(a === 'confirm_training'){ body.date = val('hbTr' + i); if(!body.date){ c.msg = 'Enter the training date first.'; c.msgOk = false; return draw(c); } }
    if(a === 'set_assignment'){ body.date = val('hbAs' + i); if(!body.date){ c.msg = 'Enter the date of their first client visit first.'; c.msgOk = false; return draw(c); } }
    if(a === 'record_dose'){ body.date = val('hbDose' + i); if(!body.date){ c.msg = 'Enter the date the dose was given.'; c.msgOk = false; return draw(c); } }
    if(a === 'record_choice'){ body.choice = val('hbCh' + i); if(!body.choice){ c.msg = 'Choose the answer first.'; c.msgOk = false; return draw(c); } }
    if(a === 'record_offer'){ const how = window.prompt('How was the vaccine offered? (for example: in person at the office, by phone)'); if(!how) return; body.how = how; }
    const r = await call(body);
    if(!r.ok){ c.msg = r.error; c.msgOk = false; return draw(c); }
    c.msg = a === 'send_link' ? (r.data.state === 'sent' ? 'Sent.' : r.data.state === 'practice' ? 'Practice: nothing was sent. ' + (r.data.why || '') : 'Not sent: ' + (r.data.not_sent || []).join('; ')) : 'Saved.';
    c.msgOk = a !== 'send_link' || r.data.state === 'sent';
    await load(c);
  }
  async function open(i, what){
    const c = cardAt(i); if(!c) return;
    const row = c.r && c.r.data && c.r.data.row, w = window.open('', '_blank');
    const r = await call(what === 'declination' ? { action:'open', key:row && row.id, what:'declination' } : { action:'open', doc_id:what });
    const url = r.ok && r.data && r.data.url;
    if(url){ if(w) w.location = url; else window.open(url, '_blank'); return; }
    if(w) try{ w.close(); }catch(_){}
    c.msg = 'Not opened: ' + (r.error || 'the server gave no link.'); c.msgOk = false; draw(c);
  }
  function mountCaregiver(c, g){
    const k = {}; if(g && g.id != null) k.caregiver_id = String(g.id); if(c && c.id != null) k.axiscare_id = String(c.id);
    mount(document.getElementById('cgdHepb'), k);
  }
  window.HEPB = { mount, mountCaregiver, act, open, _call:call };
})();
