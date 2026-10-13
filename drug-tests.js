/* =====================================================================================================================
   DRUG TESTS, the office card (Samantha's ruling, 2026-10-13): "Caring Companions does NOT routinely drug test every
   applicant after an offer. We conduct drug testing only under certain circumstances, based on company policy and
   applicable law. ... Allow authorized management to initiate and document testing when required by our policy. Do not
   invent testing circumstances or grounds that we have not approved."
   One card on a person's page (the caregiver page's Checks tab, the applicant page's Training & checks tab). It is not an
   onboarding step; nothing here happens on its own and nothing reminds anyone. Everything comes from the server function
   drug-test: owners record (the reason in their own words, no list of grounds); results are seen only by owners and the
   person who requested; anyone else sees only that a record exists. Every line is permanent: a correction is a new line.
   Proofs open only through the server's logged open (a five-minute link); no storage address is drawn on the page.
     DT.mount(el, key)      key = { applicant_id } (resolved to the offer and Hub record) | { caregiver_id, offer_id, candidate_id }
   ===================================================================================================================== */
(function(){
  'use strict';
  const FN = 'drug-test';
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const RESULT = { pending:['Pending','#92400E','#FEF3C7'], negative:['Negative','#15803D','#DCFCE7'], positive:['Positive','#B91C1C','#FEE2E2'], refused:['Refused','#B91C1C','#FEE2E2'], cancelled:['Cancelled','#3A342C','#F4F2ED'] };
  const KIND = { request:'Requested', result:'Result recorded', correction:'Correction' };
  const day = d => { if(!d) return ''; try{ return new Date(String(d).slice(0,10) + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); }catch(_){ return String(d); } };
  const central = iso => { try{ return new Date(iso).toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' }); }catch(_){ return String(iso || ''); } };
  const todayCentral = () => { try{ return new Date().toLocaleDateString('en-CA', { timeZone:'America/Chicago' }); }catch(_){ return new Date().toISOString().slice(0,10); } };
  const MIME = { 'image/jpeg':1, 'image/png':1, 'image/heic':1, 'image/webp':1, 'application/pdf':1 };
  const ctOf = f => { const t = String(f.type || '').toLowerCase(); if(MIME[t]) return t; const n = String(f.name || '').toLowerCase(); return /\.pdf$/.test(n) ? 'application/pdf' : /\.png$/.test(n) ? 'image/png' : /\.heic$/.test(n) ? 'image/heic' : /\.webp$/.test(n) ? 'image/webp' : 'image/jpeg'; };

  /* the server, through the Hub's own sign-in: { ok, data, error }, never throws; the server's own words are shown */
  async function call(body){
    try{
      const r = await sb.functions.invoke(FN, { body });
      if(r.error){ let j = null; try{ if(r.error.context && typeof r.error.context.json === 'function') j = await r.error.context.json(); }catch(_){}
        return { ok:false, data:j || {}, error:(j && j.error) || r.error.message || 'The drug test server did not answer.' }; }
      if(!r.data || r.data.error || r.data.ok === false) return { ok:false, data:r.data || {}, error:(r.data && r.data.error) || 'The drug test server did not answer.' };
      return { ok:true, data:r.data, error:'' };
    }catch(e){ return { ok:false, data:{}, error:'Could not reach the drug test server: ' + ((e && e.message) || 'no answer') }; }
  }
  /* an applicant's page knows the application: the main profile's own read names the offer and the Hub record */
  async function resolve(k){
    const o = {}; ['offer_id','caregiver_id','candidate_id','applicant_id'].forEach(x => { if(k && k[x] != null && k[x] !== '') o[x] = String(k[x]); });
    if(k && k.applicant_id){
      try{ const r = await sb.functions.invoke('hire-profile', { body:{ action:'get', applicant_id:k.applicant_id } }); const ids = (r && r.data && r.data.ids) || {};
        if(ids.offer_id) o.offer_id = String(ids.offer_id); if(ids.caregiver_id != null) o.caregiver_id = String(ids.caregiver_id); if(ids.candidate_id != null) o.candidate_id = String(ids.candidate_id); }catch(_){}
    }
    return o;
  }

  const CARDS = {}; let N = 0;
  const cardAt = i => CARDS[i] || null;
  async function mount(el, k){
    if(!el) return;
    el.innerHTML = '<div class="field-note">Reading the drug test record…</div>';
    const ids = await resolve(k);
    let c = Object.values(CARDS).find(x => x.el === el);
    if(!c){ c = { el, n:++N }; CARDS[c.n] = c; }
    Object.assign(c, { ids, form:null, msg:'', msgOk:false, name:(k && k.name) || '' });
    if(!Object.keys(ids).length){ el.innerHTML = '<div class="field-note">No offer or Hub record is connected to this person yet.</div>'; return; }
    await load(c);
  }
  async function load(c){ c.data = await call(Object.assign({ action:'get' }, c.ids)); if(c.el.isConnected) draw(c); }
  const pill = r => { const s = RESULT[r] || RESULT.pending; return '<span class="tag-chip" style="background:' + s[2] + ';color:' + s[1] + ';font-weight:800">' + esc(s[0]) + '</span>'; };
  const kv = (k, v) => '<div style="display:flex;gap:8px;font-size:13.5px;padding:3px 0;border-bottom:1px dashed #EEE9DF"><span class="field-note" style="min-width:150px;flex:none">' + k + '</span><span style="min-width:0;flex:1;white-space:pre-wrap">' + v + '</span></div>';
  function testHtml(c, t, may){
    const i = c.n;
    if(t.restricted) return '<div class="dt-test" style="border:1px solid #E8E2D8;border-radius:9px;padding:8px 10px;margin:6px 0;font-size:13.5px">A drug test record exists. <span class="field-note">Only an owner or the person who requested it can see it.</span></div>';
    let h = '<div class="dt-test" data-test="' + esc(t.id) + '" style="border:1px solid #E8E2D8;border-radius:9px;padding:8px 10px;margin:6px 0">'
      + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:4px">' + pill(t.result) + '<b style="font-size:13.5px;color:var(--navy)">Requested ' + esc(day(t.date_requested)) + '</b><span class="field-note">by ' + esc((t.requested_by && (t.requested_by.name || t.requested_by.email)) || '') + '</span>' + (t.corrected ? '<span class="field-note">(corrected; see the history)</span>' : '') + '</div>'
      + kv('Reason', esc(t.reason)) + kv('Test type', t.test_type ? esc(t.test_type) : '<span class="field-note">not recorded</span>')
      + kv('Result', esc((RESULT[t.result] || RESULT.pending)[0]) + (t.result_date ? ' <span class="field-note">' + esc(day(t.result_date)) + '</span>' : ''))
      + kv('Proof', t.has_proof ? '<button type="button" class="ibtn" onclick="DT.open(' + i + ',\'' + esc(t.proof_entry_id) + '\',this)">Open the document</button> <span class="field-note">a five-minute link; every open is logged with your name</span>' : '<span class="field-note">none on file</span>')
      + (t.notes ? kv('Notes', esc(t.notes)) : '') + (t.result_notes ? kv('Result notes', esc(t.result_notes)) : '');
    if(may) h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">'
      + '<button type="button" class="ibtn" onclick="DT.form(' + i + ',\'result\',\'' + esc(t.id) + '\')">Record a result</button>'
      + '<button type="button" class="ibtn" onclick="DT.form(' + i + ',\'correct\',\'' + esc(t.id) + '\')">Correct the request</button>'
      + (t.result_entry_id ? '<button type="button" class="ibtn" onclick="DT.form(' + i + ',\'correct\',\'' + esc(t.result_entry_id) + '\')">Correct the result</button>' : '') + '</div>';
    if(c.form && c.form.test === t.id) h += formHtml(c, t);
    h += '<details style="margin-top:6px"><summary class="field-note" style="cursor:pointer">History (' + (t.history || []).length + ' lines, never changed)</summary>'
      + (t.history || []).map(x => '<div style="font-size:12.5px;padding:3px 0;border-bottom:1px solid #F4F2ED">' + esc(central(x.at)) + ' · <b>' + esc(KIND[x.kind] || x.kind) + '</b> · ' + esc(x.entered_by || '')
        + (x.kind === 'correction' ? ' · why: ' + esc(x.correction_reason) : '')
        + (x.date_requested ? ' · requested ' + esc(day(x.date_requested)) : '') + (x.reason ? ' · reason: ' + esc(x.reason) : '') + (x.test_type ? ' · ' + esc(x.test_type) : '')
        + (x.result ? ' · ' + esc((RESULT[x.result] || [x.result])[0]) + (x.result_date ? ' ' + esc(day(x.result_date)) : '') : '') + (x.has_proof ? ' · document' : '') + (x.notes ? ' · notes: ' + esc(x.notes) : '') + '</div>').join('') + '</details>';
    return h + '</div>';
  }
  const field = (label, html) => '<label style="display:block;font-size:13px;margin:6px 0"><span style="display:block;font-weight:700;color:var(--navy);margin-bottom:2px">' + label + '</span>' + html + '</label>';
  const inp = 'style="width:100%;box-sizing:border-box;font:inherit;font-size:13.5px;padding:6px 8px;border:1px solid var(--border);border-radius:7px"';
  function resultFields(i, cur){
    cur = cur || {};
    return field('Result, as recorded by management', '<select id="dtResult' + i + '" ' + inp + '>' + Object.keys(RESULT).map(k => '<option value="' + k + '"' + ((cur.result || 'pending') === k ? ' selected' : '') + '>' + RESULT[k][0] + '</option>').join('') + '</select>')
      + field('Result date', '<input type="date" id="dtResultDate' + i + '" max="' + todayCentral() + '" value="' + esc(cur.result_date || '') + '" ' + inp + '>')
      + field('Proof document (photo or PDF, optional)' + (cur.has_proof ? ' <span class="field-note" style="font-weight:400">a document is on file; choose a file only to replace it</span>' : ''), '<input type="file" id="dtFile' + i + '" accept="image/jpeg,image/png,image/heic,image/webp,application/pdf">')
      + field('Notes', '<textarea id="dtNotes' + i + '" ' + inp + ' rows="2">' + esc(cur.notes || '') + '</textarea>');
  }
  function requestFields(i, cur){
    cur = cur || {};
    return field('Date requested', '<input type="date" id="dtDate' + i + '" max="' + todayCentral() + '" value="' + esc(cur.date_requested || todayCentral()) + '" ' + inp + '>')
      + field('Reason, in your own words (required)', '<textarea id="dtReason' + i + '" ' + inp + ' rows="3" placeholder="Why our policy calls for this test">' + esc(cur.reason || '') + '</textarea>')
      + field('Test type', '<input type="text" id="dtType' + i + '" maxlength="200" value="' + esc(cur.test_type || '') + '" ' + inp + '>')
      + field('Notes', '<textarea id="dtNotes' + i + '" ' + inp + ' rows="2">' + esc(cur.notes || '') + '</textarea>');
  }
  function formHtml(c, t){
    const i = c.n, f = c.form;
    let h = '<div class="dt-form" style="background:#F7FAFD;border:1px solid #CFE0F1;border-radius:9px;padding:8px 10px;margin-top:8px">';
    if(f.kind === 'request') h += '<b style="color:var(--navy)">Start a drug test record</b><div class="field-note">Only when our drug testing policy calls for it. Your name and the time are recorded from your sign-in.</div>' + requestFields(i);
    else if(f.kind === 'result') h += '<b style="color:var(--navy)">Record a result</b>' + resultFields(i, { result:'pending' });
    else {
      const isReq = f.entry === t.id;
      h += '<b style="color:var(--navy)">Correct the ' + (isReq ? 'request' : 'result') + '</b><div class="field-note">A correction is a new line in the history; the earlier line is kept exactly as it was.</div>'
        + (isReq ? requestFields(i, t) : resultFields(i, { result:t.result, result_date:t.result_date, notes:t.result_notes, has_proof:t.has_proof }))
        + field('What is being corrected and why (required)', '<textarea id="dtWhy' + i + '" ' + inp + ' rows="2"></textarea>');
    }
    return h + '<div style="display:flex;gap:6px;margin-top:6px"><button type="button" class="ibtn" style="background:var(--navy);color:#fff;border-color:var(--navy)" onclick="DT.save(' + i + ',this)">Save</button><button type="button" class="ibtn" onclick="DT.form(' + i + ',null)">Cancel</button></div></div>';
  }
  function draw(c){
    const el = c.el, r = c.data || {}, i = c.n;
    if(!r.ok){ el.innerHTML = '<div style="color:#B91C1C;font-size:13.5px">Could not read the drug test record: ' + esc(r.error) + '</div><button type="button" class="ibtn" style="margin-top:6px" onclick="DT.reload(' + i + ')">Try again</button>'; return; }
    const d = r.data || {}, tests = d.tests || [], may = !!d.may_record;
    let h = '<div class="field-note" style="margin-bottom:6px">Only when our drug testing policy calls for it. This is not an onboarding step: nothing here happens on its own and nothing reminds anyone. Owners record; a test\'s details and result are seen only by owners and the person who requested it.</div>';
    if(c.msg) h += '<div class="dt-msg" style="font-size:13px;margin:4px 0;color:' + (c.msgOk ? '#15803D' : '#B91C1C') + '">' + esc(c.msg) + '</div>';
    h += tests.length ? tests.slice().reverse().map(t => testHtml(c, t, may)).join('') : '<div class="field-note">No drug test on record.</div>';
    if(may){
      if(c.form && c.form.kind === 'request') h += formHtml(c, {});
      else h += '<button type="button" class="ibtn" style="margin-top:6px" onclick="DT.form(' + i + ',\'request\')">Start a drug test record</button>';
    }
    el.innerHTML = h;
  }
  function setForm(i, kind, id){
    const c = cardAt(i); if(!c) return;
    c.msg = '';
    if(!kind) c.form = null;
    else if(kind === 'request') c.form = { kind };
    else { const tests = (c.data && c.data.data && c.data.data.tests) || [];
      const t = tests.find(x => x.id === id || x.result_entry_id === id); if(!t) return;
      c.form = { kind, test:t.id, entry:id }; }
    draw(c);
  }
  const val = (id) => { const e = document.getElementById(id); return e ? e.value : undefined; };
  const busy = (b, on) => { if(b){ b.disabled = on; b.textContent = on ? 'Saving…' : 'Save'; } };
  async function upload(testId, file){
    if(file.size > 15 * 1024 * 1024) return { ok:false, error:'That file is over 15 MB. Please choose a smaller one.' };
    const ct = ctOf(file), u = await call({ action:'upload_url', test_id:testId, content_type:ct });
    if(!u.ok) return u;
    try{ const put = await fetch(u.data.url, { method:'PUT', headers:{ 'Content-Type':ct, 'x-upsert':'false' }, body:file });
      if(!put.ok) return { ok:false, error:'The upload did not finish (' + put.status + '). Please try again.' }; }
    catch(e){ return { ok:false, error:'The upload did not finish. Check the connection and try again.' }; }
    return { ok:true, path:u.data.path, ct };
  }
  /* a refusal while a form is open: the words go above the form and what was typed stays */
  function flash(c){
    const f = c.el.querySelector('.dt-form'); if(!f){ draw(c); return; }
    let m = f.querySelector('.dt-msg'); if(!m){ m = document.createElement('div'); m.className = 'dt-msg'; m.style.cssText = 'font-size:13px;margin:4px 0;color:#B91C1C'; f.insertBefore(m, f.firstChild); }
    m.textContent = c.msg;
  }
  async function save(i, btn){
    const c = cardAt(i); if(!c || !c.form) return;
    const f = c.form;
    let body;
    if(f.kind === 'request') body = Object.assign({ action:'request', name:c.name || undefined, date_requested:val('dtDate' + i), reason:val('dtReason' + i), test_type:val('dtType' + i), notes:val('dtNotes' + i) }, c.ids);
    else {
      const isReq = f.kind === 'correct' && f.entry === f.test;
      body = f.kind === 'result' ? { action:'result', test_id:f.test } : { action:'correct', entry_id:f.entry, correction_reason:val('dtWhy' + i) };
      if(isReq) Object.assign(body, { date_requested:val('dtDate' + i), reason:val('dtReason' + i), test_type:val('dtType' + i), notes:val('dtNotes' + i) });
      else Object.assign(body, { result:val('dtResult' + i), result_date:val('dtResultDate' + i) || '', notes:val('dtNotes' + i) });
      if(!isReq){
        const fe = document.getElementById('dtFile' + i), file = fe && fe.files && fe.files[0];
        if(file){ busy(btn, true); const up = await upload(f.test, file); if(!up.ok){ busy(btn, false); c.msg = up.error + ' Nothing was saved.'; c.msgOk = false; flash(c); return; } body.proof_path = up.path; body.proof_content_type = up.ct; }
      }
    }
    busy(btn, true);
    const r = await call(body);
    busy(btn, false);
    if(!r.ok){ c.msg = r.error; c.msgOk = false; flash(c); return; }
    c.form = null; c.msg = f.kind === 'request' ? 'Recorded, with your name and the time.' : f.kind === 'result' ? 'Result recorded, with your name and the time.' : 'Correction recorded as a new line; the earlier line is kept.'; c.msgOk = true;
    await load(c);
  }
  async function open(i, entryId, btn){
    const c = cardAt(i); if(!c) return;
    const w = window.open('', '_blank'); if(w) try{ w.document.write('<p style="font-family:sans-serif">Opening the document…</p>'); }catch(_){}
    if(btn) btn.disabled = true;
    const r = await call({ action:'open', entry_id:entryId });
    if(btn) btn.disabled = false;
    const url = r.ok && r.data && r.data.url;
    if(url){ if(w) w.location = url; else window.open(url, '_blank'); return; }
    if(w) try{ w.close(); }catch(_){}
    c.msg = r.error || 'Could not open the document.'; c.msgOk = false; draw(c);
  }
  window.DT = { mount, form:setForm, save, open, reload:(i) => { const c = cardAt(i); if(c) load(c); }, _call:call };
})();
