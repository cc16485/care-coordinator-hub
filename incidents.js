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
   Stage 3 (2026-10-27): the employee work injury report, started from the caregiver's Performance tab, reviewed by HR with
   the workers' comp checklist, never on a client's profile.
   HR (2026-10-27, Samantha: "Zach needs to be involved in incident reports as well... it needs to be investigated further
   which i dont want the care coordinators to have to do"): anyone in the office can hand a report to Zach with "Ask Zach
   to look into it"; Zach writes what he found and what happens next. Zach's HR page has an Incidents page (to look into,
   work injuries with their workers' comp report-by day, every report) and his dashboard shows what is waiting on him.
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
    const inj = o.kind === 'employee_injury';
    sheet(head(inj ? 'Work injury report: ' + (o.caregiver || 'caregiver') : 'Incident report: ' + (o.client_name || 'client'),
        inj ? 'The caregiver who was hurt fills it in on their phone and signs it. It goes to HR, never onto a client\'s profile.' : 'The caregiver who was there fills it in on their phone and signs it. You check the text before it goes.')
      + '<div class="fg">'
      + '<div class="grp"><label>' + (inj ? 'Caregiver who was hurt' : 'Caregiver who was there') + '</label><input id="incCg" list="incCgList" value="' + esc(o.caregiver || '') + '" placeholder="First and last name"' + (inj && o.caregiver ? ' readonly' : '') + '><datalist id="incCgList">' + roster().map(n => '<option value="' + esc(n) + '">').join('') + '</datalist></div>'
      + '<div class="grp"><label>Day it happened</label><input type="date" id="incDay" value="' + esc(o.happened_on || '') + '" max="' + today() + '"></div>'
      + (inj ? '<div class="grp full"><label>Client\'s home it happened at (optional)</label><input id="incWhere" placeholder="Leave blank if it was on the road or at the office"></div>' : '')
      + '</div><div style="margin-top:.7rem"><button class="primary" id="incGo">Make the report link</button></div><div id="incOut"></div>');
    document.getElementById('incGo').onclick = async () => {
      const cg = document.getElementById('incCg').value.trim(), d = document.getElementById('incDay').value;
      if(cg.split(/\s+/).length < 2) return alert('Type the caregiver\'s first and last name.');
      if(!d) return alert('Pick the day it happened.');
      const btn = document.getElementById('incGo'); btn.disabled = true;
      try{ const r = await api(Object.assign({ action:'start', caregiver:cg, happened_on:d }, o.source_item_id ? { source_item_id:o.source_item_id } : {},
          inj ? { kind:'employee_injury', client_name:((document.getElementById('incWhere') || {}).value || '').trim() } : { client_ax:o.client_ax || '', client_name:o.client_name || '' }));
        if(o.onStarted) try{ await o.onStarted(r); }catch(e){}
        sendBox(r); }
      catch(e){ btn.disabled = false; alert(e.message + ' Nothing was started.'); }
    };
  }
  function sendBox(r){
    const rep = r.report;
    sheet(head('Text ' + first(rep.caregiver) + ' the report link', (rep.kind === 'employee_injury' ? 'Work injury' + (rep.client_name ? ' at ' + esc(rep.client_name) : '') : esc(rep.client_name)) + ' · ' + esc(day(rep.happened_on)))
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
    try{ const d = await api({ action:'list', ids:[id] }); r = (d.reports || [])[0]; if(!r) throw new Error('That report is not on file.'); S.live = d.live; S.hotline = d.hotline; S.inv = d.inv; S.hr = d.hr; }
    catch(e){ sheet(head('Incident report', '<span style="color:#b91c1c">' + esc(e.message) + '</span>')); return; }
    const inj = r.kind === 'employee_injury';
    const sub = (inj ? esc(r.caregiver) + (r.client_name ? ' · at ' + esc(r.client_name) : '') : esc(r.client_name) + ' · ' + esc(r.caregiver)) + ' · ' + esc(day(r.happened_on)) + (r.practice ? ' · <b style="color:#b45309">practice</b>' : '');
    let h = head(inj ? 'Work injury report' : 'Incident report', sub);
    if(r.status === 'submitted'){
      h += '<div style="background:#ECFDF5;border:1px solid #9BD3B0;border-radius:8px;padding:.45rem .65rem;margin-bottom:.5rem;font-size:13.5px"><b>Signed by ' + esc(r.signed_name) + '</b>, ' + esc(when(r.submitted_at)) + '.'
        + (r.told_late ? ' <b style="color:#b45309">The office was not called or texted when it happened.</b>' : '') + '</div>'
        + (r.questions || []).map(q => { const v = r.answers[q.k]; return '<div style="margin:.35rem 0"><div style="font-size:12.5px;font-weight:700;color:var(--navy)">' + esc(q.label) + '</div><div style="font-size:14px;white-space:pre-wrap">' + esc(Array.isArray(v) ? v.join(', ') : v) + '</div></div>'; }).join('')
        + '<div style="margin-top:.6rem;display:flex;gap:.5rem;align-items:center"><button class="secondary" id="incPdf">📄 Open the signed PDF</button><span id="incPdfOut" class="field-note"></span></div>'
        + (inj ? injuryReviewHtml(r) : reviewHtml(r)) + invHtml(r);
      sheet(h);
      if(!r.reviewed_at) (inj ? injuryReviewWire : reviewWire)(r);
      invWire(r);
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
      + '<div class="field-note" style="margin-top:.4rem">A new link replaces the old one. If the text won\'t go, call ' + esc(first(r.caregiver)) + ' and read the questions together.</div>'
      + invHtml(r);
    sheet(h); invWire(r);
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

  /* ── Stage 3 (2026-10-27): the workers' comp checklist on a signed work injury report (HR). Missouri expects the
     employer to report a work injury to its workers' comp insurance within 5 days; the Hub shows that day and never files
     anything itself. ── */
  const IMED = [['none','No medical care needed'],['first_aid','First aid only'],['doctor','Doctor or urgent care'],['er','The ER']];
  const IWORK = [['full','Back to full duty'],['light','Light duty for now'],['off','Off work for now']];
  function injuryReviewHtml(r){
    const box = 'border-top:1px solid var(--border);margin-top:.8rem;padding-top:.6rem';
    if(r.reviewed_at){
      const v = r.review || {}, m = v.medical || {}, c = v.comp || {}, w = v.work || {}, f = v.safety || {};
      const line = (k, t) => '<div style="font-size:13.5px;margin:.15rem 0"><b>' + esc(k) + ':</b> ' + esc(t) + '</div>';
      return '<div style="' + box + '"><div style="font-weight:800;color:var(--navy)">Workers\' comp checklist</div><div class="field-note">By ' + esc(r.reviewed_by_name || r.reviewed_by) + ', ' + esc(when(r.reviewed_at)) + '</div>'
        + line('Medical care', (IMED.find(x => x[0] === m.what) || ['', m.what])[1] + (m.note ? ' (' + m.note + ')' : ''))
        + line('Workers\' comp insurance', c.reported === 'yes' ? 'Reported ' + c.when + ', claim ' + c.claim : 'Not reported: ' + (c.why || ''))
        + line('Work', (IWORK.find(x => x[0] === w.status) || ['', w.status])[1] + (w.until ? ' until ' + w.until : ''))
        + line('Safety fix', f.fix ? f.note : 'None needed') + (v.note ? line('Note', v.note) : '') + '</div>';
    }
    const rad = (n, v, t) => '<label style="display:flex;gap:6px;align-items:center;font-size:13.5px;margin:.15rem 0"><input type="radio" name="' + n + '" value="' + v + '" style="width:auto;margin:0"> ' + esc(t) + '</label>';
    const q = (t) => '<div style="font-size:13px;font-weight:700;color:var(--navy);margin:.6rem 0 .2rem">' + t + '</div>';
    const sub = (id, ph) => '<div id="' + id + '" style="display:none;margin:.2rem 0 0 1.4rem">' + ph + '</div>';
    return '<div style="' + box + '"><div style="font-weight:800;color:var(--navy)">Workers\' comp checklist</div>'
      + '<div style="background:#FFF7E6;border:1px solid #F0A63A;border-radius:8px;padding:.4rem .6rem;font-size:13px;margin:.3rem 0">Report it to the workers\' comp insurance by <b>' + esc(r.comp_due || '') + '</b> (5 days from when the office learned of it). The Hub doesn\'t file anything; you do.</div>'
      + q('1. Did they need medical care?') + IMED.map(([v, t]) => rad('irMed', v, t)).join('') + sub('irMedNote', '<input id="irMedTxt" placeholder="Where they were seen and what they were told">')
      + q('2. Reported to the workers\' comp insurance?') + rad('irComp', 'yes', 'Yes') + sub('irCompYes', '<input id="irCompWhen" placeholder="When you reported it"> <input id="irCompClaim" placeholder="Claim number" style="margin-top:.25rem">')
        + rad('irComp', 'not_needed', 'Not needed') + sub('irCompNo', '<input id="irCompWhy" placeholder="Why not (for example: no care needed, first aid only)">')
      + q('3. Can they work?') + IWORK.map(([v, t]) => rad('irWork', v, t)).join('') + sub('irWorkUntil', '<input id="irUntil" placeholder="Until when (or until the doctor says)">')
      + q('4. Does something need fixing so it doesn\'t happen again?') + rad('irSafe', 'no', 'No') + rad('irSafe', 'yes', 'Yes (makes a card)') + sub('irSafeNote', '<input id="irSafeTxt" placeholder="What needs fixing">')
      + q('Anything else (optional)') + '<textarea id="irNote" rows="2" style="width:100%"></textarea>'
      + '<div style="margin-top:.5rem"><button class="primary" id="irSave">Save the checklist and close the card</button></div><div id="irOut" class="field-note" style="margin-top:.3rem"></div></div>';
  }
  function injuryReviewWire(r){
    const body = document.getElementById('incBody'); if(!body) return;
    const val = n => (body.querySelector('input[name="' + n + '"]:checked') || {}).value || '';
    const show = (id, on) => { const el = document.getElementById(id); if(el) el.style.display = on ? 'block' : 'none'; };
    const sync = () => { show('irMedNote', val('irMed') === 'doctor' || val('irMed') === 'er'); show('irCompYes', val('irComp') === 'yes'); show('irCompNo', val('irComp') === 'not_needed');
      show('irWorkUntil', !!val('irWork') && val('irWork') !== 'full'); show('irSafeNote', val('irSafe') === 'yes'); };
    body.addEventListener('change', sync); sync();
    document.getElementById('irSave').onclick = async () => {
      const t = id => ((document.getElementById(id) || {}).value || '').trim();
      if(!val('irSafe')){ document.getElementById('irOut').innerHTML = '<b style="color:#b91c1c">Does something need fixing so it doesn\'t happen again?</b>'; return; }
      const rv = { medical:{ what:val('irMed'), note:t('irMedTxt') }, comp:{ reported:val('irComp'), when:t('irCompWhen'), claim:t('irCompClaim'), why:t('irCompWhy') },
        work:{ status:val('irWork'), until:t('irUntil') }, safety:{ fix:val('irSafe') === 'yes', note:t('irSafeTxt') }, note:t('irNote') };
      const b = document.getElementById('irSave'); b.disabled = true;
      try{ const d = await api(Object.assign({ action:'review', id:r.id }, rv)); toast('Saved: ' + d.summary + (d.safety_card ? '. A card was made for the fix.' : '')); refreshAll(); open(r.id); }
      catch(e){ b.disabled = false; document.getElementById('irOut').innerHTML = '<b style="color:#b91c1c">' + esc(e.message) + '</b>'; }
    };
  }

  /* ── HR (2026-10-27): hand a report to Zach to look into; Zach (or Samantha) writes what he found. Each saved once. ── */
  const INV_WHY = [['notes','The report doesn\'t match the shift notes'],['late','The office wasn\'t told when it happened'],['story','Stories don\'t match (client, family or caregiver)'],['ane','Possible abuse or neglect'],['other','Something else']];
  const INV_OUT = [['explained','Nothing more to do (it was explained)'],['coaching','A coaching conversation'],['formal','A formal case (write-up)'],['ended','Ending their work with us'],['other','Something else']];
  const label = (list, k) => ((S.inv && (list === INV_WHY ? S.inv.why : S.inv.outcome) || {})[k]) || (list.find(x => x[0] === k) || ['', k])[1];
  function invHtml(r){
    const box = 'border-top:1px solid var(--border);margin-top:.8rem;padding-top:.6rem';
    const headH = '<div style="font-weight:800;color:var(--navy)">Zach (HR) looks into it</div>';
    if(r.status === 'cancelled') return '';
    if(!r.inv_asked_at) return '<div style="' + box + '">' + headH
      + '<div class="field-note">For when something doesn\'t add up, like the report not matching the shift notes. Zach looks into it so the care coordinators don\'t have to.</div>'
      + '<div id="invAskBox" style="display:none;margin-top:.4rem"><div style="font-size:13px;font-weight:700;color:var(--navy);margin:.3rem 0 .2rem">Why does it need a closer look?</div>'
      + INV_WHY.map(([v, t]) => '<label style="display:flex;gap:6px;align-items:center;font-size:13.5px;margin:.15rem 0"><input type="checkbox" name="invWhy" value="' + v + '" style="width:auto;margin:0"> ' + esc(label(INV_WHY, v)) + '</label>').join('')
      + '<div id="invAne" style="display:none;background:#FDECEC;border-radius:8px;padding:.45rem .6rem;font-size:13px;margin:.3rem 0"><b>If you suspect abuse or neglect, call the hotline now: <a href="tel:18003920210">' + esc(S.hotline || '1-800-392-0210') + '</a>.</b> Asking Zach doesn\'t replace that call.</div>'
      + '<div style="font-size:13px;font-weight:700;color:var(--navy);margin:.5rem 0 .2rem">What did you notice?</div><textarea id="invNote" rows="3" style="width:100%" placeholder="For example: her report says Carol wasn\'t hurt, but her shift note says Carol hit her hip."></textarea>'
      + '<div style="margin-top:.5rem"><button class="primary" id="invSend">Send it to Zach</button></div></div>'
      + '<div id="invOpenRow" style="margin-top:.4rem"><button class="secondary" id="invOpen">Ask Zach to look into it</button></div><div id="invOut" class="field-note" style="margin-top:.3rem"></div></div>';
    const a = r.inv_ask || {}, f = r.inv_findings;
    let h = '<div style="' + box + '">' + headH + '<div style="font-size:13.5px;margin:.2rem 0"><b>Asked by ' + esc(r.inv_asked_by_name || r.inv_asked_by) + '</b>, ' + esc(when(r.inv_asked_at)) + ': '
      + esc((a.why || []).map(k => label(INV_WHY, k)).join(' · ')) + '</div>' + (a.note ? '<div style="font-size:13.5px;white-space:pre-wrap;margin:.2rem 0">"' + esc(a.note) + '"</div>' : '');
    if(r.inv_at) return h + '<div style="background:#ECFDF5;border:1px solid #9BD3B0;border-radius:8px;padding:.45rem .65rem;margin-top:.4rem;font-size:13.5px"><b>Looked into by ' + esc(r.inv_by_name || r.inv_by) + '</b>, ' + esc(when(r.inv_at)) + '. What happens next: <b>' + esc(label(INV_OUT, f && f.outcome)) + '</b>'
      + (f && f.findings ? '<div style="white-space:pre-wrap;margin-top:.3rem">' + esc(f.findings) + '</div>' : '') + (f && f.spoke_with ? '<div class="field-note" style="margin-top:.2rem">Talked with: ' + esc(f.spoke_with) + '</div>' : '') + '</div></div>';
    if(!S.hr) return h + '<div class="field-note">With Zach to look into. He writes what he found here.</div></div>';
    return h + '<div style="font-size:13px;font-weight:700;color:var(--navy);margin:.6rem 0 .2rem">What did you find?</div><textarea id="invFind" rows="4" style="width:100%" placeholder="What the shift notes, AxisCare and the people you talked with show."></textarea>'
      + '<input id="invWho" placeholder="Who you talked with (optional)" style="margin-top:.3rem">'
      + '<div style="font-size:13px;font-weight:700;color:var(--navy);margin:.6rem 0 .2rem">What happens next?</div>'
      + INV_OUT.map(([v, t]) => '<label style="display:flex;gap:6px;align-items:center;font-size:13.5px;margin:.15rem 0"><input type="radio" name="invOut" value="' + v + '" style="width:auto;margin:0"> ' + esc(label(INV_OUT, v)) + '</label>').join('')
      + '<div class="field-note">Coaching and write-ups are still done on their own HR pages; this records the decision. It can\'t be changed after.</div>'
      + '<div style="margin-top:.5rem"><button class="primary" id="invSave">Save what I found</button></div><div id="invOut2" class="field-note" style="margin-top:.3rem"></div></div>';
  }
  function invWire(r){
    const body = document.getElementById('incBody'); if(!body) return;
    const err = (id, m) => { const el = document.getElementById(id); if(el) el.innerHTML = '<b style="color:#b91c1c">' + esc(m) + '</b>'; };
    const ob = document.getElementById('invOpen');
    if(ob) ob.onclick = () => { document.getElementById('invAskBox').style.display = 'block'; document.getElementById('invOpenRow').style.display = 'none'; };
    const why = () => Array.from(body.querySelectorAll('input[name="invWhy"]:checked')).map(x => x.value);
    body.addEventListener('change', () => { const el = document.getElementById('invAne'); if(el) el.style.display = why().includes('ane') ? 'block' : 'none'; });
    const sb1 = document.getElementById('invSend');
    if(sb1) sb1.onclick = async () => {
      sb1.disabled = true;
      try{ await api({ action:'investigate', id:r.id, why:why(), note:((document.getElementById('invNote') || {}).value || '').trim() }); toast('Sent to Zach. A card is on his My Work.'); refreshAll(r.client_ax); open(r.id); }
      catch(e){ sb1.disabled = false; err('invOut', e.message); }
    };
    const sv = document.getElementById('invSave');
    if(sv) sv.onclick = async () => {
      const out = (body.querySelector('input[name="invOut"]:checked') || {}).value || '';
      sv.disabled = true;
      try{ const d = await api({ action:'findings', id:r.id, findings:((document.getElementById('invFind') || {}).value || '').trim(), spoke_with:((document.getElementById('invWho') || {}).value || '').trim(), outcome:out });
        toast('Saved: ' + d.outcome + '.' + (out === 'formal' ? ' Start the write-up in Formal cases.' : '')); refreshAll(r.client_ax); open(r.id); }
      catch(e){ sv.disabled = false; err('invOut2', e.message); }
    };
  }

  /* ── Zach's HR page: Incidents (to look into, work injuries, every report) and the dashboard lines ── */
  const compBy = r => { const d = new Date(Date.parse(r.started_at) || Date.now()); d.setDate(d.getDate() + 5); return d; };
  const injOpen = r => r.kind === 'employee_injury' && r.status !== 'cancelled' && !r.reviewed_at;
  const invOpen = r => r.inv_asked_at && !r.inv_at;
  const fmt = d => d.toLocaleDateString('en-US', { timeZone:'America/Chicago', weekday:'short', month:'short', day:'numeric' });
  const who = r => r.kind === 'employee_injury' ? '<b>' + esc(r.caregiver) + '</b> · work injury' + (r.client_name ? ' at ' + esc(r.client_name) : '') : '<b>' + esc(r.client_name) + '</b> · ' + esc(r.caregiver);
  const openBtn = r => '<button class="secondary hr-btn" onclick="INC.open(\'' + esc(r.id) + '\')">Open</button>';
  const compLine = r => { const d = compBy(r), late = d.getTime() < Date.now(); return '<span class="' + (late ? 'hr-late' : 'field-note') + '">' + (late ? 'workers\' comp report was due ' : 'report to workers\' comp by ') + esc(fmt(d)) + '</span>'; };
  const statusWord = r => r.status === 'cancelled' ? 'cancelled' : r.status === 'waiting' ? 'waiting for them to fill it in' : r.reviewed_at ? 'signed and reviewed' : 'signed, not reviewed yet';
  async function hrReports(){ const d = await api({ action:'list', hr:true }); S.inv = d.inv; S.hr = d.hr; S.hotline = d.hotline; return d.reports || []; }
  async function hrMount(hostId){
    const host = document.getElementById(hostId); if(!host) return;
    let rows; try{ rows = await hrReports(); }catch(e){ host.innerHTML = '<div class="field-note">The reports could not be read: ' + esc(e.message) + '</div>'; return; }
    if(!document.getElementById(hostId)) return;
    const row = (r, right) => '<div class="hr-row"><span>' + esc(day(r.happened_on)) + ': ' + who(r) + (r.practice ? ' <span class="field-note">(practice)</span>' : '') + '</span><span style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' + right + openBtn(r) + '</span></div>';
    const look = rows.filter(invOpen), inj = rows.filter(r => r.kind === 'employee_injury' && r.status !== 'cancelled'), done = rows.filter(r => r.inv_at);
    const client = rows.filter(r => r.kind !== 'employee_injury');
    host.innerHTML = '<div class="card hr-card"><div class="hr-card-h">To look into</div>'
        + (look.length ? look.map(r => row(r, '<span class="field-note">' + esc((r.inv_ask && r.inv_ask.why || []).map(k => label(INV_WHY, k)).join(' · ')) + ' · asked by ' + esc(r.inv_asked_by_name || '') + ', ' + esc(when(r.inv_asked_at)) + '</span>')).join('')
          : '<div class="field-note">Nothing is waiting. The office sends you a report with "Ask Zach to look into it" on the report.</div>') + '</div>'
      + '<div class="card hr-card"><div class="hr-card-h">Work injuries</div>'
        + (inj.length ? inj.map(r => row(r, injOpen(r) ? '<span class="field-note">' + esc(statusWord(r)) + '</span>' + compLine(r) : '<span class="field-note">checklist done</span>')).join('')
          : '<div class="field-note">None on file. Start one from the caregiver\'s Performance tab (+ New work injury report).</div>')
        + '<div class="field-note hr-foot">Report a work injury to the workers\' comp insurance within 5 days of the office learning of it. The Hub doesn\'t file anything; you do.</div></div>'
      + (done.length ? '<div class="card hr-card"><div class="hr-card-h">Looked into</div>' + done.map(r => row(r, '<span class="field-note">' + esc(label(INV_OUT, r.inv_findings && r.inv_findings.outcome)) + ', ' + esc(when(r.inv_at)) + '</span>')).join('') + '</div>' : '')
      + '<div class="card hr-card"><div class="hr-card-h">Every client incident report</div>'
        + (client.length ? client.map(r => row(r, '<span class="field-note">' + esc(statusWord(r)) + (r.told_late ? ' · office not called at the time' : '') + '</span>')).join('') : '<div class="field-note">None on file.</div>') + '</div>';
  }
  async function hrDash(hostId){
    const el = document.getElementById(hostId); if(!el) return;
    let rows; try{ rows = (await hrReports()).filter(r => !r.practice); }catch(e){ el.textContent = 'The incident reports could not be read. Reload the page to try again.'; return; }
    if(!document.getElementById(hostId)) return;
    const look = rows.filter(invOpen), inj = rows.filter(injOpen).sort((a, b) => compBy(a) - compBy(b));
    const line = (r, right) => '<div class="hr-row"><span>' + who(r) + ' · ' + esc(day(r.happened_on)) + '</span><span style="display:flex;gap:8px;align-items:center">' + right + openBtn(r) + '</span></div>';
    el.innerHTML = (look.length || inj.length
      ? look.map(r => line(r, '<span class="field-note">look into: ' + esc((r.inv_ask && r.inv_ask.why || []).map(k => label(INV_WHY, k)).join(' · ')) + '</span>')).join('') + inj.map(r => line(r, compLine(r))).join('')
      : 'Nothing is waiting on you.') + ' <a href="#" onclick="HR.go(\'incidents\');return false;">Open Incidents</a>';
  }

  /* ── Stage 2: a caregiver's reports, on their Performance tab ── */
  async function caregiverMount(hostId, name){
    const host = document.getElementById(hostId); if(!host) return;
    const nm = String(name || '').trim(); if(nm.split(/\s+/).length < 2){ host.innerHTML = ''; return; }
    let rows = [], err = '';
    try{ rows = (await api({ action:'list', caregiver:nm })).reports || []; }catch(e){ err = /not found|Failed to send|404/i.test(e.message) ? '' : e.message; }
    if(!document.getElementById(hostId)) return;
    const word = r => r.status === 'submitted' ? (r.reviewed_at ? 'Signed and reviewed' : r.kind === 'employee_injury' ? 'Signed, waiting for the workers\' comp checklist' : 'Signed, waiting for the office review') + (r.told_late ? ' · office not called at the time' : '') + (invOpen(r) ? ' · with Zach to look into' : r.inv_at ? ' · looked into by HR' : '') : r.status === 'cancelled' ? 'Cancelled' : 'Waiting for them to fill it in';
    S.cgName = nm;
    host.innerHTML = '<div class="card" style="padding:14px 16px;margin-top:10px"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b style="font-size:15px;color:var(--navy)">Incident reports</b><span style="flex:1"></span>'
      + '<button class="secondary" style="font-size:12px;padding:4px 10px" onclick="INC.tellZach()">Tell Zach</button>'
      + (isOwner() ? '<button class="secondary" style="font-size:12px;padding:4px 10px" onclick="INC.newCoaching()">+ New coaching talk</button>' : '')
      + '<button class="secondary" style="font-size:12px;padding:4px 10px" onclick="INC.injuryFor()">+ New work injury report</button></div>'
      + (err ? '<div class="field-note">Could not load: ' + esc(err) + '</div>' : !rows.length ? '<div class="field-note">None on file.</div>' : rows.map(r => '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;font-size:13.5px;padding:5px 0;border-top:1px solid var(--border)"><span>' + esc(day(r.happened_on)) + ': ' + (r.kind === 'employee_injury' ? '<b>Work injury</b>' + (r.client_name ? ' at ' + esc(r.client_name) : '') : esc(r.client_name)) + '</span><span class="field-note">' + esc(word(r)) + (r.practice ? ' · practice' : '') + '</span>'
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
    const word = r => r.status === 'submitted' ? 'Signed ' + when(r.submitted_at) + (r.reviewed_at ? ', reviewed' : ', not reviewed yet') + (invOpen(r) ? ', with Zach to look into' : r.inv_at ? ', looked into by HR' : '') : r.status === 'cancelled' ? 'Cancelled' : r.sent_at ? 'Waiting for ' + first(r.caregiver) + ' (texted ' + when(r.sent_at) + ')' : 'Not texted yet';
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

  /* ── Tell Zach (2026-10-27, Samantha: "Tell Zach on the caregiver's Performance tab for anyone in the office ...
     Coordinators ask, Zach decides."). Anyone in the office writes what they saw; it goes to Zach (and Samantha) only.
     Zach decides on his Performance page: a coaching talk, a formal case, or nothing more. Owners can also add a coaching
     talk themselves (+ New coaching talk, on Performance > Coaching). ── */
  const isOwner = () => { try{ return typeof ccCan === 'function' && ccCan('approve_discipline'); }catch(e){ return false; } };
  function tellZach(){
    const nm = S.cgName; if(!nm) return alert('Open a caregiver\'s profile first.');
    sheet(head('Tell Zach about ' + nm, 'Only Zach and Samantha see this. Zach decides what happens next; you don\'t need to look into it.')
      + '<div class="fg"><label>What happened?</label><textarea id="tzWhat" rows="4" style="width:100%" placeholder="What you saw or heard, and who told you."></textarea></div>'
      + '<div class="fg"><label>The day it happened</label><input type="date" id="tzDay" value="' + esc(today()) + '"></div>'
      + '<label style="display:flex;gap:6px;align-items:flex-start;font-size:13.5px;margin:.4rem 0"><input type="checkbox" id="tzSerious" style="width:auto;margin:3px 0 0"> It\'s serious: someone could get hurt, it could be abuse or neglect, or Zach should hear today</label>'
      + '<div id="tzAne" style="display:none;background:#FDECEC;border-radius:8px;padding:.45rem .6rem;font-size:13px;margin:.3rem 0">If you suspect abuse or neglect, call the Missouri hotline now: <a href="tel:18003920210"><b>1-800-392-0210</b></a>. Telling Zach doesn\'t replace that call.</div>'
      + '<div class="field-note">If a client was hurt or could have been, start an incident report from the client\'s profile too.</div>'
      + '<div style="margin-top:.6rem"><button class="primary" id="tzGo">Send to Zach</button></div><div id="tzOut" class="field-note" style="margin-top:.3rem"></div>');
    document.getElementById('tzSerious').onchange = e => { document.getElementById('tzAne').style.display = e.target.checked ? 'block' : 'none'; };
    document.getElementById('tzGo').onclick = async e => {
      const g = (((typeof DATA !== 'undefined') && DATA.caregivers) || []).find(x => ((x.first || '') + ' ' + (x.last || '')).trim().toLowerCase() === nm.toLowerCase());
      e.target.disabled = true;
      const { error } = await sb.rpc('hr_case_add', { p:{ type:'concern', caregiver:nm, axiscare_id:g ? String(g.axiscare_id || '') : '', what:document.getElementById('tzWhat').value.trim(),
        happened_on:document.getElementById('tzDay').value, serious:document.getElementById('tzSerious').checked ? 'true' : 'false' } });
      if(error){ e.target.disabled = false; document.getElementById('tzOut').innerHTML = '<b style="color:#b91c1c">' + esc(error.message || 'That did not send.') + '</b>'; return; }
      close(); toast('Sent to Zach. Only Zach and Samantha can see it.');
    };
  }
  function newCoaching(){ window.HR_NEWCOACH = S.cgName || ''; location.hash = 'hr/coaching'; }

  /* Stage 3: a work injury report for the caregiver whose profile is open */
  function injuryFor(){ if(!S.cgName) return alert('Open a caregiver\'s profile first.'); startForm({ kind:'employee_injury', caregiver:S.cgName, happened_on:today() }); }
  window.INC = { fromFlag, fromProfile, open, close, cardHtml, profileHtml, flagDay, caregiverMount, injuryFor, hrMount, hrDash, tellZach, newCoaching };
  window.incCardHtml = cardHtml;
})();
