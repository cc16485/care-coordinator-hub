/* =====================================================================================================================
   INCIDENT REPORTS, STAGE 1 (Samantha 2026-10-27: "build the incident report as planned with your three picks. Start with
   Stage 1 so Ashley's report can go out"). The office starts a report from a red shift-note flag ("Write it up as an
   incident") or from the client's profile (From the shifts > New incident report), checks the words and presses Send. The
   caregiver who was there fills it in and signs on incident.html. The server (incident-report) keeps the report, the PDF
   and the history, and keeps the Incidents owner's card up to date.
     · A person presses Send. Nothing is texted by itself when a flag fires.
     · ONE reminder text after 24 hours if it is still not filled in; then the card turns red ("Call Ashley").
     · Families are never contacted by any of this.
   Stage 2 (2026-10-27, "continue"): the office reviews a signed report (family told, medical care, care plan change, abuse
   or neglect with the state hotline), which closes the card; and a caregiver's reports are listed on their Performance tab.
   Practice until ops_settings.incident_reports_live: it all works end to end, but nothing is texted and no card is made.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
  const first = s => String(s || '').trim().split(/\s+/)[0] || '';
  const toast = m => (typeof ccToast === 'function' ? ccToast(m) : alert(m));
  const when = iso => { try{ return new Date(iso).toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }); }catch(e){ return ''; } };
  const day = ymd => /^\d{4}-\d{2}-\d{2}$/.test(ymd || '') ? new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone:'UTC', weekday:'short', month:'short', day:'numeric' }) : '';
  const today = () => new Date().toLocaleDateString('en-CA', { timeZone:'America/Chicago' });
  const S = { byClient:{}, busy:{} };

  async function api(body){
    const { data, error } = await sb.functions.invoke('incident-report', { body });
    let msg = ''; if(error){ try{ msg = (await error.context.json()).error; }catch(_){ msg = error.message; } }
    if(error || !data || data.error) throw new Error(msg || (data && data.error) || 'The server did not answer.');
    return data;
  }

  /* ── one dialog for everything (start, send, read) ── */
  function sheet(html){
    let o = document.getElementById('incSheet');
    if(!o){ o = document.createElement('div'); o.className = 'overlay'; o.id = 'incSheet';
      o.innerHTML = '<div class="modal" style="max-width:620px"><div id="incBody"></div></div>';
      o.addEventListener('click', e => { if(e.target === o) close(); }); document.body.appendChild(o); }
    document.getElementById('incBody').innerHTML = html + '<div style="display:flex;margin-top:.9rem"><button class="secondary" style="margin-left:auto" onclick="INC.close()">Close</button></div>';
    o.classList.add('open');
  }
  function close(){ const o = document.getElementById('incSheet'); if(o) o.classList.remove('open'); }
  const head = (t, sub) => '<h3 style="color:var(--navy);margin:0 0 .2rem">' + esc(t) + '</h3>' + (sub ? '<div class="field-note" style="margin-bottom:.6rem">' + sub + '</div>' : '');
  const practiceNote = '<div style="background:#FFF7E6;border:1px dashed #F0A63A;border-radius:8px;padding:.45rem .65rem;margin:.2rem 0 .6rem;font-size:13px">Practice: the report works end to end, but nothing is texted and no card is made. Open the link yourself to try it.</div>';

  /* ── starting one ── */
  /* "Mon, Oct 26" on a flag card -> 2026-10-26 (last year's date if that would be in the future) */
  function flagDay(v){
    const m = /([A-Z][a-z]{2})\s+(\d{1,2})/.exec(String(v || '')); if(!m) return '';
    const y = Number(today().slice(0, 4)), mo = 'JanFebMarAprMayJunJulAugSepOctNovDec'.indexOf(m[1]) / 3 + 1; if(mo < 1) return '';
    let ymd = y + '-' + String(mo).padStart(2, '0') + '-' + String(m[2]).padStart(2, '0');
    if(ymd > today()) ymd = (y - 1) + ymd.slice(4);
    return ymd;
  }
  function roster(){ return (((typeof DATA !== 'undefined') && DATA.caregivers) || []).map(g => ((g.first || '') + ' ' + (g.last || '')).trim()).filter(Boolean).sort(); }
  function startForm(o){
    sheet(head('Incident report: ' + (o.client_name || 'client'), 'The caregiver who was there fills it in on their phone and signs it. You check the text before it goes.')
      + '<div class="fg">'
      + '<div class="grp"><label>Caregiver who was there</label><input id="incCg" list="incCgList" value="' + esc(o.caregiver || '') + '" placeholder="First and last name"><datalist id="incCgList">' + roster().map(n => '<option value="' + esc(n) + '">').join('') + '</datalist></div>'
      + '<div class="grp"><label>Day it happened</label><input type="date" id="incDay" value="' + esc(o.happened_on || '') + '" max="' + today() + '"></div>'
      + '</div><div style="margin-top:.7rem"><button class="primary" id="incGo">Make the report link</button></div><div id="incOut"></div>');
    document.getElementById('incGo').onclick = async () => {
      const cg = document.getElementById('incCg').value.trim(), d = document.getElementById('incDay').value;
      if(cg.split(/\s+/).length < 2) return alert('Type the caregiver\'s first and last name.');
      if(!d) return alert('Pick the day it happened.');
      const btn = document.getElementById('incGo'); btn.disabled = true;
      try{ const r = await api(Object.assign({ action:'start', caregiver:cg, happened_on:d }, o.source_item_id ? { source_item_id:o.source_item_id } : {}, { client_ax:o.client_ax || '', client_name:o.client_name || '' }));
        if(o.onStarted) try{ await o.onStarted(r); }catch(e){}
        sendBox(r); }
      catch(e){ btn.disabled = false; alert(e.message + ' Nothing was started.'); }
    };
  }
  function sendBox(r){
    const rep = r.report;
    sheet(head('Text ' + first(rep.caregiver) + ' the report link', esc(rep.client_name) + ' · ' + esc(day(rep.happened_on)))
      + (r.practice ? practiceNote : '')
      + '<div class="field-note">' + (r.phone_last4 ? 'Goes to their phone ending ' + esc(r.phone_last4) + ', from the office line.' : '<b style="color:#b91c1c">No usable phone on their record.</b> Call them and read the questions together, or add their phone on the Caregivers page.')
      + ' Check the words, then Send. Keep the link in it.</div>'
      + '<textarea id="incMsg" rows="5" style="width:100%;font-size:.88rem;margin-top:.35rem">' + esc(r.draft || '') + '</textarea>'
      + '<div style="display:flex;gap:.5rem;align-items:center;margin-top:.45rem;flex-wrap:wrap"><button class="primary" id="incSend">' + (r.practice ? 'Send (practice: nothing is texted)' : '📤 Send the text') + '</button>'
      + (r.practice ? '<a href="' + esc(r.link) + '" target="_blank" rel="noopener" style="font-weight:700">Open the report page yourself</a>' : '') + '</div><div id="incOut" class="field-note" style="margin-top:.4rem"></div>');
    document.getElementById('incSend').onclick = async () => {
      const b = document.getElementById('incSend'); b.disabled = true;
      try{ const d = await api({ action:'send', id:rep.id, message:document.getElementById('incMsg').value });
        document.getElementById('incOut').innerHTML = d.outcome === 'practice' ? 'Practice: nothing was texted.' : '<b style="color:#166534">Sent.</b> The card on My Work shows when ' + esc(first(rep.caregiver)) + ' signs. If it isn\'t filled in after 24 hours, the Hub texts one reminder and the card turns red.';
        refreshAll(rep.client_ax); }
      catch(e){ b.disabled = false; document.getElementById('incOut').innerHTML = '<b style="color:#b91c1c">' + esc(e.message) + '</b>'; }
    };
  }
  /* from a red shift-note flag (shift-flags.js "Write it up as an incident") */
  function fromFlag(it, onStarted){
    startForm({ source_item_id:it.id, client_ax:it.client_ax || '', client_name:it.about || '', caregiver:it.caregiver || '', happened_on:flagDay(it.visit_day) || today(), onStarted });
  }
  /* from the client's profile */
  function fromProfile(){
    const ax = (typeof CP !== 'undefined' && CP.ax) || '', nm = (typeof CP !== 'undefined' && CP.r && CP.r.client_name) || '';
    if(!nm) return alert('Open a client\'s profile first.');
    startForm({ client_ax:ax, client_name:nm, happened_on:today() });
  }

  /* ── reading one ── */
  async function open(id){
    sheet(head('Incident report', 'Loading…'));
    let r;
    try{ const d = await api({ action:'list', ids:[id] }); r = (d.reports || [])[0]; if(!r) throw new Error('That report is not on file.'); S.live = d.live; S.hotline = d.hotline; }
    catch(e){ sheet(head('Incident report', '<span style="color:#b91c1c">' + esc(e.message) + '</span>')); return; }
    const sub = esc(r.client_name) + ' · ' + esc(day(r.happened_on)) + ' · ' + esc(r.caregiver) + (r.practice ? ' · <b style="color:#b45309">practice</b>' : '');
    let h = head('Incident report', sub);
    if(r.status === 'submitted'){
      h += '<div style="background:#ECFDF5;border:1px solid #9BD3B0;border-radius:8px;padding:.45rem .65rem;margin-bottom:.5rem;font-size:13.5px"><b>Signed by ' + esc(r.signed_name) + '</b>, ' + esc(when(r.submitted_at)) + '.'
        + (r.told_late ? ' <b style="color:#b45309">The office was not called or texted when it happened.</b>' : '') + '</div>'
        + (r.questions || []).map(q => { const v = r.answers[q.k]; return '<div style="margin:.35rem 0"><div style="font-size:12.5px;font-weight:700;color:var(--navy)">' + esc(q.label) + '</div><div style="font-size:14px;white-space:pre-wrap">' + esc(Array.isArray(v) ? v.join(', ') : v) + '</div></div>'; }).join('')
        + '<div style="margin-top:.6rem;display:flex;gap:.5rem;align-items:center"><button class="secondary" id="incPdf">📄 Open the signed PDF</button><span id="incPdfOut" class="field-note"></span></div>'
        + reviewHtml(r);
      sheet(h);
      if(!r.reviewed_at) reviewWire(r);
      document.getElementById('incPdf').onclick = async () => {
        try{ const d = await api({ action:'open', id:r.id }); document.getElementById('incPdfOut').innerHTML = '<a href="' + esc(d.url) + '" target="_blank" rel="noopener" style="font-weight:700">Open it now</a> (5 minutes; this open is logged)'; }
        catch(e){ alert(e.message); }
      };
      return;
    }
    if(r.status === 'cancelled'){ sheet(h + '<div class="field-note">The link was cancelled ' + esc(when(r.cancelled_at)) + '.</div>'); return; }
    h += '<div style="font-size:13.5px">' + (r.sent_at ? 'Texted ' + esc(when(r.sent_at)) + (r.reminded_at ? ', reminder ' + esc(when(r.reminded_at)) : '') : 'Not texted yet.')
      + (r.opened_at ? ' They opened it ' + esc(when(r.opened_at)) + '.' : ' Not opened yet.') + '</div>'
      + '<div style="display:flex;gap:.5rem;margin-top:.6rem;flex-wrap:wrap"><button class="primary" id="incRelink">' + (r.sent_at ? 'Text a new link' : 'Text the report link') + '</button><button class="secondary" id="incCancel">Cancel the link</button></div>'
      + '<div class="field-note" style="margin-top:.4rem">A new link replaces the old one. If the text won\'t go, call ' + esc(first(r.caregiver)) + ' and read the questions together.</div>';
    sheet(h);
    document.getElementById('incRelink').onclick = async () => { try{ sendBox(await api({ action:'relink', id:r.id })); }catch(e){ alert(e.message); } };
    document.getElementById('incCancel').onclick = async () => {
      if(!(await (typeof ccConfirm === 'function' ? ccConfirm('Cancel this report link? It stops working. You can start a new report later.') : Promise.resolve(confirm('Cancel this report link?'))))) return;
      try{ await api({ action:'cancel', id:r.id }); close(); toast('Cancelled.'); refreshAll(r.client_ax); }catch(e){ alert(e.message); }
    };
  }

  /* ── Stage 2 (2026-10-27): the office's review of a signed report. Every question answered, saved once. A person calls
     the family; the Hub never does. Suspected abuse or neglect: the state hotline first, then its report number here. ── */
  const MED = [['none','No care needed'],['doctor','Saw or called their doctor'],['urgent','Urgent care or the ER'],['911','911 was called'],['declined','Care was offered and declined']];
  function reviewHtml(r){
    const box = 'border-top:1px solid var(--border);margin-top:.8rem;padding-top:.6rem';
    if(r.reviewed_at){
      const v = r.review || {}, f = v.family || {}, m = v.medical || {}, c = v.careplan || {}, a = v.ane || {};
      const line = (k, t) => '<div style="font-size:13.5px;margin:.15rem 0"><b>' + esc(k) + ':</b> ' + esc(t) + '</div>';
      return '<div style="' + box + '"><div style="font-weight:800;color:var(--navy)">Office review</div><div class="field-note">By ' + esc(r.reviewed_by_name || r.reviewed_by) + ', ' + esc(when(r.reviewed_at)) + '</div>'
        + line('Family', f.told === 'yes' ? 'Told: ' + f.who + ', ' + f.when : 'Not told: ' + (f.why || ''))
        + line('Medical care', (MED.find(x => x[0] === m.what) || ['', m.what])[1] + (m.note ? ' (' + m.note + ')' : ''))
        + line('Care plan', c.change ? 'Needs a change: ' + c.note : 'No change')
        + line('Abuse, neglect or exploitation', a.suspect ? 'Suspected. Hotline called ' + a.hotline_at + ', report ' + a.reference : 'No')
        + (v.note ? line('Note', v.note) : '') + '</div>';
    }
    const rad = (n, v, t, chk) => '<label style="display:flex;gap:6px;align-items:center;font-size:13.5px;margin:.15rem 0"><input type="radio" name="' + n + '" value="' + v + '" style="width:auto;margin:0"' + (chk ? ' checked' : '') + '> ' + esc(t) + '</label>';
    const q = (t) => '<div style="font-size:13px;font-weight:700;color:var(--navy);margin:.6rem 0 .2rem">' + t + '</div>';
    const sub = (id, ph) => '<div id="' + id + '" style="display:none;margin:.2rem 0 0 1.4rem">' + ph + '</div>';
    return '<div style="' + box + '"><div style="font-weight:800;color:var(--navy)">Office review</div><div class="field-note">Answer each one, then save. It closes the card. It can\'t be changed after.</div>'
      + q('1. Was the family told?') + rad('rvFam', 'yes', 'Yes, a person called them') + sub('rvFamYes', '<input id="rvFamWho" placeholder="Who (name, relationship)"> <input id="rvFamWhen" placeholder="When (day, time)" style="margin-top:.25rem">')
        + rad('rvFam', 'not_needed', 'Not needed') + sub('rvFamNo', '<input id="rvFamWhy" placeholder="Why not">')
      + q('2. Did ' + esc(first(r.client_name)) + ' need medical care?') + MED.map(([v, t]) => rad('rvMed', v, t)).join('') + sub('rvMedNote', '<input id="rvMedTxt" placeholder="Who, where, what they said">')
      + q('3. Does the care plan need to change?') + rad('rvCp', 'no', 'No') + rad('rvCp', 'yes', 'Yes (makes a card for Client Care)') + sub('rvCpNote', '<input id="rvCpTxt" placeholder="What needs to change">')
      + q('4. Could this be abuse, neglect or exploitation?') + rad('rvAne', 'no', 'No') + rad('rvAne', 'yes', 'Yes, or I\'m not sure')
        + sub('rvAneYes', '<div style="background:#FDECEC;border-radius:8px;padding:.45rem .6rem;font-size:13px;margin:.2rem 0"><b>Call the Missouri Adult Abuse and Neglect Hotline now: <a href="tel:18003920210">' + esc(S.hotline || '1-800-392-0210') + '</a>.</b> We are mandated reporters. Then write down when you called and the report number.</div><input id="rvAneAt" placeholder="When you called"> <input id="rvAneRef" placeholder="Report number" style="margin-top:.25rem">')
      + q('Anything else (optional)') + '<textarea id="rvNote" rows="2" style="width:100%"></textarea>'
      + '<div style="margin-top:.5rem;display:flex;gap:.5rem;align-items:center"><button class="primary" id="rvSave">Save the review and close the card</button></div><div id="rvOut" class="field-note" style="margin-top:.3rem"></div></div>';
  }
  function reviewWire(r){
    const body = document.getElementById('incBody'); if(!body) return;
    const val = n => (body.querySelector('input[name="' + n + '"]:checked') || {}).value || '';
    const show = (id, on) => { const el = document.getElementById(id); if(el) el.style.display = on ? 'block' : 'none'; };
    const sync = () => { show('rvFamYes', val('rvFam') === 'yes'); show('rvFamNo', val('rvFam') === 'not_needed'); show('rvMedNote', !!val('rvMed') && val('rvMed') !== 'none');
      show('rvCpNote', val('rvCp') === 'yes'); show('rvAneYes', val('rvAne') === 'yes'); };
    body.addEventListener('change', sync); sync();
    document.getElementById('rvSave').onclick = async () => {
      const t = id => ((document.getElementById(id) || {}).value || '').trim();
      const ane = val('rvAne');
      const rv = { family:{ told:val('rvFam'), who:t('rvFamWho'), when:t('rvFamWhen'), why:t('rvFamWhy') }, medical:{ what:val('rvMed'), note:t('rvMedTxt') },
        careplan:{ change:val('rvCp') === 'yes', note:t('rvCpTxt') }, ane:ane === 'yes' ? { suspect:true, hotline_at:t('rvAneAt'), reference:t('rvAneRef') } : ane === 'no' ? { suspect:false } : {}, note:t('rvNote') };
      if(!val('rvCp')){ document.getElementById('rvOut').innerHTML = '<b style="color:#b91c1c">Does the care plan need to change?</b>'; return; }
      const b = document.getElementById('rvSave'); b.disabled = true;
      try{ const d = await api(Object.assign({ action:'review', id:r.id }, rv)); toast('Reviewed: ' + d.summary + (d.careplan_card ? '. A care plan card is on Client Care\'s My Work.' : ''));
        refreshAll(r.client_ax); open(r.id); }
      catch(e){ b.disabled = false; document.getElementById('rvOut').innerHTML = '<b style="color:#b91c1c">' + esc(e.message) + '</b>'; }
    };
  }

  /* ── Stage 2: a caregiver's reports, on their Performance tab ── */
  async function caregiverMount(hostId, name){
    const host = document.getElementById(hostId); if(!host) return;
    const nm = String(name || '').trim(); if(nm.split(/\s+/).length < 2){ host.innerHTML = ''; return; }
    let rows = [], err = '';
    try{ rows = (await api({ action:'list', caregiver:nm })).reports || []; }catch(e){ err = /not found|Failed to send|404/i.test(e.message) ? '' : e.message; }
    if(!document.getElementById(hostId)) return;
    if(!rows.length && !err){ host.innerHTML = ''; return; }
    const word = r => r.status === 'submitted' ? (r.reviewed_at ? 'Signed and reviewed' : 'Signed, waiting for the office review') + (r.told_late ? ' · office not called at the time' : '') : r.status === 'cancelled' ? 'Cancelled' : 'Waiting for them to fill it in';
    host.innerHTML = '<div class="card" style="padding:14px 16px;margin-top:10px"><b style="font-size:15px;color:var(--navy)">Incident reports</b>'
      + (err ? '<div class="field-note">Could not load: ' + esc(err) + '</div>' : rows.map(r => '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;font-size:13.5px;padding:5px 0;border-top:1px solid var(--border)"><span>' + esc(day(r.happened_on)) + ': ' + esc(r.client_name) + '</span><span class="field-note">' + esc(word(r)) + (r.practice ? ' · practice' : '') + '</span>'
          + '<a href="javascript:void(0)" onclick="INC.open(\'' + esc(r.id) + '\')" style="font-weight:700">Open</a></div>').join(''))
      + '</div>';
  }

  /* ── on a card: the incident card itself, and a flag that already has a report ── */
  function cardHtml(it){
    if(!it || !it.incident_id) return '';
    return '<div style="margin-top:6px"><button class="secondary" style="font-size:12.5px;padding:5px 11px" onclick="INC.open(\'' + esc(it.incident_id) + '\')">📋 Open the report</button></div>';
  }

  /* ── the client's profile, under From the shifts ── */
  function profileHtml(ax){
    const k = String(ax || '');
    if(k && !S.byClient[k] && !S.busy[k]) load(k);
    const rows = (S.byClient[k] && S.byClient[k].reports) || [];
    const word = r => r.status === 'submitted' ? 'Signed ' + when(r.submitted_at) + (r.reviewed_at ? ', reviewed' : ', not reviewed yet') : r.status === 'cancelled' ? 'Cancelled' : r.sent_at ? 'Waiting for ' + first(r.caregiver) + ' (texted ' + when(r.sent_at) + ')' : 'Not texted yet';
    return '<div class="cn-prof"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b style="font-size:12.5px;color:var(--navy)">Incident reports</b><span style="flex:1"></span>'
      + '<button class="secondary" style="font-size:12px;padding:4px 10px" onclick="INC.fromProfile()">+ New incident report</button></div>'
      + (S.byClient[k] && S.byClient[k].error ? '<div class="field-note">Could not load the reports: ' + esc(S.byClient[k].error) + '</div>'
        : rows.length ? rows.map(r => '<div class="cn-prow"><span>' + esc(day(r.happened_on)) + ': ' + esc(r.caregiver) + '</span><span class="field-note">' + esc(word(r)) + (r.practice ? ' · practice' : '') + '</span>'
            + '<a href="javascript:void(0)" onclick="INC.open(\'' + esc(r.id) + '\')" style="font-size:12.5px;font-weight:700">Open</a></div>').join('')
        : '<div class="field-note">' + (S.busy[k] ? 'Loading…' : 'None on file.') + '</div>')
      + '</div>';
  }
  async function load(k){
    if(!/^\d+$/.test(k)) return;
    S.busy[k] = true;
    try{ S.byClient[k] = await api({ action:'list', client_ax:k }); }
    catch(e){ S.byClient[k] = { error:/not found|Failed to send|404/i.test(e.message) ? 'not set up yet' : e.message }; }
    S.busy[k] = false;
    try{ if(typeof cnRender === 'function') cnRender(); }catch(e){}
  }
  function refreshAll(ax){
    if(ax){ delete S.byClient[String(ax)]; }
    try{ if(typeof myWorkRefresh === 'function') myWorkRefresh(); }catch(e){} try{ if(typeof opsRenderQueue === 'function') opsRenderQueue(); }catch(e){}
    try{ if(typeof cnRender === 'function') cnRender(); }catch(e){}
  }

  window.INC = { fromFlag, fromProfile, open, close, cardHtml, profileHtml, flagDay, caregiverMount };
  window.incCardHtml = cardHtml;
})();
