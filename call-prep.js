/* =====================================================================================================================
   call-prep.js · New family cards, practice replay (step 1, 2026-11-19)
   Samantha, after doing one new family call by hand (lead, assessment time, prep email, CDS lead): "These are all the
   things I wish an ai agent could do without me asking". She approved the one-card mockup and "Yes, build step 1": the
   server (call-prep) prepares the whole card for each new family call of the last 30 days; this page shows owners what it
   prepared next to what the office really did, so she can judge it before anything is built on top. "I also want a
   summary of the call": it leads each card.
   PRACTICE: owners only (the database refuses everyone else). Nothing here makes a lead, books a visit, makes a CDS lead
   or sends anything. The only thing an owner can save is a mark on a card: right, close or wrong (call_prep_mark).
   Lives in Call Follow Ups as the view "New family cards" (call-practice.js draws the link and hands over).
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const lc = s => String(s == null ? '' : s).toLowerCase();
  const digits = s => String(s == null ? '' : s).replace(/\D/g, '').slice(-10);
  const when = iso => { try{ return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }catch(e){ return ''; } };
  const mins = s => { const n = Math.round(Number(s || 0)); return n < 60 ? n + ' s' : Math.floor(n / 60) + ' min'; };
  const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayWords = d => { const x = new Date(d + 'T12:00:00Z'); return isNaN(x.getTime()) ? '' : WD[x.getUTCDay()] + ' ' + (x.getUTCMonth() + 1) + '-' + x.getUTCDate(); };
  const timeWords = t => { const m = /^(\d{2}):(\d{2})$/.exec(String(t || '')); if(!m) return ''; const h = Number(m[1]); return (h % 12 || 12) + (m[2] === '00' ? '' : ':' + m[2]) + ' ' + (h < 12 ? 'AM' : 'PM'); };
  const isOwner = () => { try{ return typeof ccIsOwner === 'function' && !!ccIsOwner(); }catch(e){ return false; } };
  const leads = () => { try{ return (DATA && DATA.leads) || []; }catch(e){ return []; } };
  const marks = () => { try{ return (DATA && DATA.call_lead_marks) || []; }catch(e){ return []; } };
  const nameOf = e => { try{ return (typeof opsOwnerName === 'function' && opsOwnerName(e)) || String(e || '').split('@')[0]; }catch(_){ return String(e || '').split('@')[0]; } };
  const P = { rows: null, at: 0, busy: null, error: '', show: 'read', saving: {} };

  /** Owners only, and only once the server piece is in (the table answers). */
  function offered(){ return isOwner(); }
  async function load(force){
    if(P.busy) return P.busy;
    if(!force && P.rows && Date.now() - P.at < 120000) return P.rows;
    P.busy = (async () => {
      try{
        const r = await sb.from('call_prep').select('message_id, msg_at, contact_id, direction, seconds, staff, status, tries, reading, note, read_at, verdict, verdict_by, verdict_at, verdict_note').order('msg_at', { ascending: false }).limit(300);
        if(r.error){ P.error = /does not exist|schema cache|404/i.test(String(r.error.message)) ? 'not installed' : String(r.error.message || 'could not load').slice(0, 160); P.rows = []; }
        else { P.error = ''; P.rows = r.data || []; }
      }catch(e){ P.error = 'could not load'; P.rows = []; }
      P.at = Date.now(); P.busy = null; return P.rows;
    })();
    return P.busy;
  }

  /** What the office really did with this call, from the Hub's own records (read only). */
  function officeDid(row){
    const id = row.message_id, rd = row.reading || {}, ph = digits(rd.who && rd.who.phone);
    const byCall = leads().find(l => l && Array.isArray(l.from_calls) && l.from_calls.some(x => x && x.message_id === id));
    const callAt = Date.parse(row.msg_at) || 0;
    const byPhone = !byCall && ph ? leads().filter(l => l && (digits(l.phone) === ph || digits(l.client_phone) === ph))
      .sort((a, b) => Math.abs((Date.parse(a.created_at || '') || 0) - callAt) - Math.abs((Date.parse(b.created_at || '') || 0) - callAt))[0] : null;
    const lead = byCall || byPhone || null;
    const not = marks().find(m => m && m.id === id && (m.verdict === 'not' || m.verdict === 'cds')) || null;
    const out = [];
    if(lead){
      const nm = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'a lead';
      const before = !byCall && (Date.parse(lead.created_at || '') || 0) < callAt - 3600e3;
      out.push({ ok: true, text: (byCall ? 'Lead made from this call: ' : before ? 'Already a lead before this call (same phone): ' : 'A lead with the same phone: ') + nm + (lead.status ? ' (' + lead.status + ')' : ''), lead_id: lead.id });
      if(lead.assessment_booking_id || /assessment scheduled/i.test(String(lead.status || '')) || lead.assessment_date) out.push({ ok: true, text: 'An assessment is on that lead' + (lead.assessment_date ? ': ' + String(lead.assessment_date).slice(0, 10) : '') });
      else out.push({ ok: false, text: 'No assessment on that lead' });
      if(lead.sent_to_cds && lead.sent_to_cds.at) out.push({ ok: true, text: 'Sent to Caring CDS' });
    } else out.push({ ok: false, text: 'No lead was made from this call' });
    if(not) out.push({ ok: true, text: not.verdict === 'cds' ? 'The office sent this call to Caring CDS' : 'The office marked it Not a lead' + (not.reason ? ' (' + not.reason + ')' : '') });
    return { lead, lines: out };
  }

  const tick = ok => '<span style="display:inline-block;width:16px;font-weight:800;color:' + (ok ? '#1E7B4A' : '#8A5A00') + ';">' + (ok ? '✓' : '·') + '</span>';
  const head = t => '<div style="font-size:11.5px;font-weight:800;letter-spacing:.06em;color:var(--navy);margin-bottom:3px;">' + t + '</div>';
  const line = (label, text) => text ? '<div style="font-size:13px;margin:3px 0;"><b>' + label + ':</b> ' + esc(text) + '</div>' : '';

  function card(row){
    const rd = row.reading || {}, p = rd.prep || {}, who = rd.who || {}, lf = (rd.lead && rd.lead.prefill) || {}, did = officeDid(row);
    const a = p.assessment, cds = p.cds, cb = rd.lead && rd.lead.call_back;
    const people = (p.people || []).map(x => '<div style="font-size:13px;margin:4px 0;"><b>' + esc(x.name) + '</b>' + (x.relationship ? ' <span class="field-note">(' + esc(lc(x.relationship)) + ')</span>' : '')
      + (x.about ? '<br>' + esc(x.about) : '') + (x.needs ? '<br><span class="field-note">Help needed: ' + esc(x.needs) + '</span>' : '') + '</div>').join('');
    const prepared = line('Lead', [who.name, who.relationship ? '(' + lc(who.relationship) + ')' : '', who.phone].filter(Boolean).join(' ') + ((p.people || []).length ? ', for ' + p.people.map(x => x.name).join(' and ') : ''))
      + (a ? line('Assessment to hold', dayWords(a.day) + ' at ' + timeWords(a.time) + ([a.address, a.city, a.zip].filter(Boolean).length ? ', ' + [a.address, a.city, a.zip].filter(Boolean).join(', ') : '') + (a.who_goes ? '. The call said ' + a.who_goes + ' would come' : ''))
        + (a.address_unsure ? '<div class="field-note" style="margin:0 0 3px;color:#8A5A00;">Check: ' + esc(a.address_unsure) + '</div>' : '') : '<div class="field-note" style="margin:3px 0;">No assessment time was set on the call.</div>')
      + (cds ? line('CDS lead to make', (cds.person || 'the person needing care') + (cds.medicaid ? '. Medicaid, as said: ' + cds.medicaid : '') + (cds.attendant ? '. Possible attendant: ' + cds.attendant : '') + (cds.note ? '. ' + cds.note : '')) : '')
      + (cb && cb.day ? line('Call back for My Week', dayWords(cb.day) + (cb.why ? ', ' + cb.why : '')) : '')
      + ((p.promises || []).length ? '<div style="font-size:13px;margin:3px 0;"><b>What we said we would do:</b><ul style="margin:2px 0 0;padding-left:18px;">' + p.promises.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '')
      + line('What they want', p.wants) + line('Pay', p.pay);
    const office = did.lines.map(l => '<div style="font-size:13px;margin:3px 0;">' + tick(l.ok) + esc(l.text) + (l.lead_id ? ' <a href="#" class="field-note" onclick="CallPrep.openLead(\'' + esc(l.lead_id) + '\');return false;">Open</a>' : '') + '</div>').join('');
    const boxes = Object.keys(lf).filter(k => (rd.lead.heard || []).includes(k) && k !== 'interest_notes').map(k => '<div style="font-size:12.5px;"><span class="field-note">' + esc(k.replace(/_/g, ' ')) + ':</span> ' + esc(Array.isArray(lf[k]) ? lf[k].join(', ') : lf[k] === true ? 'yes' : lf[k]) + '</div>').join('');
    const v = row.verdict, vb = (k, label) => '<button class="' + (v === k ? '' : 'ghost') + '" style="padding:3px 12px;font-size:12px;" ' + (P.saving[row.message_id] ? 'disabled ' : '') + 'onclick="CallPrep.mark(\'' + esc(row.message_id) + '\',\'' + k + '\')">' + label + '</button>';
    return '<div class="card cp-card" data-id="' + esc(row.message_id) + '" style="padding:12px 14px;margin-bottom:10px;">'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:baseline;"><b style="color:var(--navy);">' + esc(who.name || 'Unknown caller') + '</b>'
      + '<span class="field-note">' + esc(when(row.msg_at)) + ' · ' + (row.direction === 'outbound' ? 'we called' : 'they called') + ' · ' + esc(mins(row.seconds)) + (row.staff ? ' · ' + esc(String(nameOf(row.staff)).split(' ')[0]) + ' took it' : '') + '</span>'
      + '<a href="#" class="field-note" onclick="CallPrep.openCall(\'' + esc(row.message_id) + '\');return false;">The call</a></div>'
      + (p.summary ? '<div style="font-size:13px;margin-top:6px;"><b>Summary of the call:</b> ' + esc(p.summary) + '</div>' : '')
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:10px;">'
      + '<div>' + head('WHAT THE CARD WOULD HAVE READY') + prepared + '</div>'
      + '<div>' + head('WHAT THE OFFICE DID') + office + '</div></div>'
      + (people ? '<details style="margin-top:8px;"><summary style="cursor:pointer;font-size:12.5px;font-weight:700;color:var(--navy);">Who needs care (' + p.people.length + ')</summary>' + people + '</details>' : '')
      + (rd.email && rd.email.body ? '<details style="margin-top:6px;"><summary style="cursor:pointer;font-size:12.5px;font-weight:700;color:var(--navy);">Prep email draft for whoever goes (not sent)</summary>'
        + '<div style="font-size:12.5px;margin:6px 0 2px;"><b>Subject:</b> ' + esc(rd.email.subject) + '</div><pre style="white-space:pre-wrap;font:inherit;font-size:12.5px;margin:0;padding:8px 10px;background:#F6F9FD;border:1px solid var(--border);border-radius:8px;">' + esc(rd.email.body) + '</pre></details>' : '')
      + (boxes ? '<details style="margin-top:6px;"><summary style="cursor:pointer;font-size:12.5px;font-weight:700;color:var(--navy);">Lead form boxes it would fill</summary><div style="margin-top:4px;">' + boxes + '</div></details>' : '')
      + ((p.visit_questions || []).length ? '<details style="margin-top:6px;"><summary style="cursor:pointer;font-size:12.5px;font-weight:700;color:var(--navy);">Good things to settle at the visit</summary><ol style="margin:4px 0 0;padding-left:20px;font-size:12.5px;">' + p.visit_questions.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol></details>' : '')
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px;padding-top:8px;border-top:1px solid var(--border);"><span class="field-note">How did it do?</span>' + vb('right', 'Right') + vb('close', 'Close') + vb('wrong', 'Wrong')
      + (v ? '<span class="field-note">Marked ' + esc(v) + (row.verdict_note ? ': ' + esc(row.verdict_note) : '') + '</span>' : '') + '</div></div>';
  }
  const WHY = { waiting: 'Waiting for the transcript', no_transcript: 'No transcript', skipped: 'Skipped', error: 'Could not prepare' };
  function otherRow(r){
    return '<div style="font-size:13px;padding:6px 0;border-top:1px solid var(--border);"><b>' + esc(WHY[r.status] || r.status) + '</b> <span class="field-note">' + esc(when(r.msg_at)) + (r.seconds ? ' · ' + esc(mins(r.seconds)) : '') + '</span>'
      + (r.note ? '<br><span class="field-note">' + esc(r.note) + '</span>' : '') + ' <a href="#" class="field-note" onclick="CallPrep.openCall(\'' + esc(r.message_id) + '\');return false;">The call</a></div>';
  }
  function count(){ return (P.rows || []).filter(r => r.status === 'read').length; }
  /** The whole view (call-practice.js puts it in the tab). Loads on first show, then redraws through `redraw`. */
  function view(redraw){
    if(!offered()) return '';
    if(P.rows === null){ load().then(() => { try{ redraw && redraw(); }catch(e){} }); return '<div class="card" style="padding:18px;text-align:center;">Loading the prepared cards…</div>'; }
    const banner = '<div class="card" style="padding:10px 14px;margin-bottom:10px;background:#FDF3E2;color:#8A5A00;font-size:13px;"><b>Practice. Only owners see this.</b> For each new family call of the last 30 days, this is the card the Hub would have had ready, next to what the office really did. Nothing here made a lead, booked a visit, or sent anything. Mark each one so we know how good it is.</div>';
    if(P.error === 'not installed') return banner + '<div class="card" style="padding:18px;text-align:center;">The server piece is not in yet. It arrives with Desktop step 1565.</div>';
    if(P.error) return banner + '<div class="card" style="padding:18px;text-align:center;color:#A83A2F;">The prepared cards could not be loaded: ' + esc(P.error) + '. <a href="#" onclick="CallPrep.refresh();return false;">Try again</a></div>';
    const read = P.rows.filter(r => r.status === 'read'), other = P.rows.filter(r => r.status !== 'read');
    const m = k => read.filter(r => r.verdict === k).length, made = read.filter(r => officeDid(r).lead).length, asm = read.filter(r => r.reading && r.reading.prep && r.reading.prep.assessment).length, cds = read.filter(r => r.reading && r.reading.prep && r.reading.prep.cds).length;
    const tally = '<div class="field-note" style="margin:0 0 10px;"><b>' + read.length + '</b> card' + (read.length === 1 ? '' : 's') + ' prepared · the office has a lead for <b>' + made + '</b> of them · <b>' + asm + '</b> had an assessment time set on the call · <b>' + cds + '</b> asked about CDS'
      + ' · marked: ' + m('right') + ' right, ' + m('close') + ' close, ' + m('wrong') + ' wrong · <a href="#" onclick="CallPrep.refresh();return false;">Refresh</a></div>';
    if(!P.rows.length) return banner + '<div class="card" style="padding:18px;text-align:center;">No cards yet. The reader prepares two calls every 5 minutes, oldest first.</div>';
    return banner + tally + read.map(card).join('')
      + (other.length ? '<details class="card" style="padding:12px 14px;margin-bottom:10px;"><summary style="cursor:pointer;font-size:11.5px;font-weight:800;letter-spacing:.06em;color:var(--muted);">CALLS WITH NO CARD (' + other.length + ')</summary>' + other.map(otherRow).join('') + '</details>' : '');
  }
  async function mark(id, verdict){
    const row = (P.rows || []).find(r => r.message_id === id); if(!row || P.saving[id]) return;
    let note = null;
    if(verdict !== 'right'){ note = window.prompt(verdict === 'wrong' ? 'What did it get wrong?' : 'What was off?', row.verdict_note || ''); if(note === null) return; }
    P.saving[id] = true; if(CallPrep.redraw) CallPrep.redraw();
    let ok = false, why = '';
    try{ const r = await sb.rpc('call_prep_mark', { p_message_id: id, p_verdict: verdict, p_note: note }); ok = !r.error && r.data === true; why = r.error ? String(r.error.message || '') : ''; }catch(e){ why = String((e && e.message) || e); }
    delete P.saving[id];
    if(ok){ row.verdict = verdict; row.verdict_note = (note || '').trim() || null; try{ ccToast('Marked ' + verdict + '.'); }catch(e){} }
    else { try{ alert('That mark was not saved' + (why ? ': ' + why.slice(0, 140) : '') + '. Nothing changed.'); }catch(e){} }
    if(CallPrep.redraw) CallPrep.redraw();
  }
  window.CallPrep = { offered, load, view, count, mark, officeDid, redraw: null,
    refresh(){ P.rows = null; if(CallPrep.redraw) CallPrep.redraw(); },
    openCall(id){ try{ if(window.CPR && CPR.openCall){ CPR.filter = 'all'; CPR.openCall(id); } }catch(e){} },
    openLead(id){ try{ if(typeof openLeadProfile === 'function') openLeadProfile(id); else if(typeof openLeadModal === 'function') openLeadModal(id); }catch(e){} },
    _state: P };
})();
