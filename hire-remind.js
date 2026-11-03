/* =====================================================================================================================
   SEND REMINDER, ON EVERY ROW (Recruit & Onboard; Samantha 2026-11-02: "how to easily send them a reminder ... one Send
   reminder button on every row, with the reminder history line". Part 2 of her applicant plan.)
   Each stage keeps its own reminder (the words she already approved); this file only draws one button and one line:
     · Applied, no interview:   the Text window on "Finish the application" (did not finish) or "Pick an interview time"
                                (finished, not booked; Staffing applicant-text). History: the automatic nudges stamped on
                                the application, then every text the office sent (applicant_texts).
     · Interview booked:        the Text window on "About their interview". History: the confirmation and the 2-day, day-
                                before and hour-before reminders stamped on the booking, then the office's texts.
     · Offer sent:              Resend the offer (Training job-offer resend_offer). History: every send, reminder and resend
                                (offer_events, through hub-training-data offer_reminders).
     · Step 1:                  Resend Step 1 (resend_step1). History: the same, for Step 1.
     · Checks and Step 2:       once Step 2 is out and not done, Resend the Step 2 message (step2-handoff). History: sent,
                                resent, the automatic reminders.
     · Orientation:             the Training Platform's orientation reminder (send-reminder, with your own Hub sign-in).
                                History: the Sent line the Orientation tab already shows.
   The Finish line has no reminder: those steps are the office's. Texts still go only 8am to 6pm (held for the morning);
   every send is recorded where it was before, so the line shows it the next time the list draws.
   ===================================================================================================================== */
(function(){
  'use strict';
  const TRAIN = 'https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const ts = iso => { const t = iso ? Date.parse(iso) : NaN; return isNaN(t) ? 0 : t; };
  const day = iso => ts(iso) ? new Date(ts(iso)).toLocaleDateString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric' }) : '';
  const get = n => { try{ return (0, eval)(n); }catch(e){ return undefined; } };
  const toast = m => { try{ (typeof ccToast === 'function' ? ccToast : alert)(m); }catch(e){} };
  const ST = { texts:null, textsAt:0, offerEv:null, offerAt:0, busy:{} };
  const AGAIN = 2 * 60e3;

  /* who sent it: an office email becomes a first name */
  function who(by){
    const b = String(by || '');
    if(!b || b === 'scheduled run' || b === 'system') return 'automatic';
    try{ const s = ((get('DATA') || {}).coordinator_staff || []).find(x => String(x.email || '').toLowerCase() === b.toLowerCase());
      if(s && s.name) return 'by ' + String(s.name).split(' ')[0]; }catch(e){}
    return 'by ' + (/@/.test(b) ? b.split('@')[0] : b.split(' ')[0]);
  }
  /* one line: "Reminders: Oct 30 automatic · Nov 1 by Krystal" (the last five; the count when there are more) */
  function line(items, none){
    const list = items.filter(x => x && ts(x.at)).sort((a, b) => ts(a.at) - ts(b.at));
    if(!list.length) return none ? '<div class="hrm-line hrm-none">' + esc(none) + '</div>' : '';
    const shown = list.slice(-5);
    return '<div class="hrm-line"><b>Reminders:</b> ' + (list.length > shown.length ? (list.length - shown.length) + ' earlier · ' : '')
      + shown.map(x => esc(day(x.at)) + ' ' + esc(x.who) + (x.what ? ', ' + esc(x.what) : '')).join(' · ') + '</div>';
  }

  /* ── reads (once, then every 2 minutes at most) ── */
  async function loadTexts(){
    if(ST.busy.t || (ST.texts && Date.now() - ST.textsAt < AGAIN) || typeof sb === 'undefined') return;
    ST.busy.t = true;
    try{
      const since = new Date(Date.now() - 120 * 864e5).toISOString();
      const { data, error } = await sb.from('applicant_texts').select('applicant_id,kind,status,created_at,created_by,sent_at,send_after').gte('created_at', since).order('created_at').limit(5000);
      if(!error){ const by = {}; (data || []).forEach(r => { (by[r.applicant_id] = by[r.applicant_id] || []).push(r); }); ST.texts = by; ST.textsAt = Date.now(); redraw(); }
    }catch(e){}
    ST.busy.t = false;
  }
  async function loadOfferEv(){
    if(ST.busy.o || (ST.offerEv && Date.now() - ST.offerAt < AGAIN) || typeof trainHubTok !== 'function') return;
    ST.busy.o = true;
    try{
      const anon = get('TRAINING_HUB_ANON') || (window.HSTRIP_ENGINE && HSTRIP_ENGINE.anon && HSTRIP_ENGINE.anon()) || (window.OPR && OPR._anon);
      const r = await fetch(TRAIN + 'hub-training-data?action=offer_reminders', { method:'POST',
        headers:{ 'x-hub-token':await trainHubTok(), 'apikey':anon, 'Authorization':'Bearer ' + anon, 'Content-Type':'application/json' }, body:'{}' });
      const j = await r.json().catch(() => null);
      if(Array.isArray(j)){ const by = {}; j.forEach(e => { (by[e.offer_id] = by[e.offer_id] || []).push(e); }); ST.offerEv = by; ST.offerAt = Date.now(); redraw(); }
      else ST.offerAt = Date.now();   /* not installed yet: no history line, try again later */
    }catch(e){ ST.offerAt = Date.now(); }
    ST.busy.o = false;
  }
  let pend = null;
  function redraw(){
    clearTimeout(pend);
    pend = setTimeout(() => {
      const t = get('activeTab');
      try{
        if(t === 'applicants' && typeof get('apRender') === 'function') get('apRender')();
        else if(t === 'interviews' && typeof get('ivqRender') === 'function') get('ivqRender')();
        else if(t === 'offers' && window.HSTRIP_ENGINE && HSTRIP_ENGINE.renderOffers) HSTRIP_ENGINE.renderOffers();
      }catch(e){}
    }, 80);
  }
  /* the office's texts to this applicant (sent, or held for the morning), after a moment */
  function texts(id, after){
    loadTexts();
    return ((ST.texts || {})[id] || []).filter(r => r.kind !== 'reply' && (r.status === 'sent' || r.status === 'held') && ts(r.created_at) >= (after || 0))
      .map(r => ({ at:r.sent_at || r.created_at, who:who(r.created_by), what:r.kind === 'cancel' ? 'cancel notice' : r.status === 'held' ? 'text waiting for 8am' : 'text' }));
  }
  const btnHtml = (on, title) => '<button type="button" class="hrm-btn" title="' + esc(title) + '" onclick="event.preventDefault();event.stopPropagation();' + on + '">Send reminder</button>';

  /* ── Applied ── */
  function apOpen(r){ return !!r && ['new', 'reviewing', 'partial', 'pool'].includes(String(r.status || 'new')) && !r.decline_reason; }
  function apBtn(r, booked){
    if(!apOpen(r) || booked || !r.phone || !window.ApText) return '';
    if(window.OKO && OKO.isHeld && OKO.isHeld(r)) return '';
    const pick = r.status === 'partial' ? 'finish' : 'book';
    return btnHtml("ApText.open('" + esc(r.id) + "',{pick:'" + pick + "'})", r.status === 'partial' ? 'A text asking them to finish the application (you see it before it goes)' : 'A text with their own link to pick an interview time (you see it before it goes)');
  }
  function apLine(r, booked){
    if(!apOpen(r) || booked) return '';
    const auto = [['finish_nudge_1_at', 'finish the form'], ['finish_nudge_2_at', 'finish the form'], ['nudge_1_at', 'pick a time'], ['nudge_2_at', 'pick a time'], ['nudge_3_at', 'pick a time'], ['nudge_4_at', 'pick a time']]
      .filter(([k]) => r[k]).map(([k, w]) => ({ at:r[k], who:'automatic', what:w }));
    const out = line(auto.concat(texts(r.id)), 'Reminders: none yet');
    return out + (r.gave_up_at ? '<div class="hrm-line hrm-none">The automatic reminders stopped ' + esc(day(r.gave_up_at)) + '.</div>' : '');
  }

  /* ── Interview booked ── */
  function ivBtn(b){ return b && b.status === 'booked' && ts(b.starts_at) > Date.now() && window.ApText ? btnHtml("ApText.open('" + esc(b.applicant_id) + "',{pick:'interview'})", 'A text reminding them of their interview time (you see it before it goes)') : ''; }
  function ivLine(b){
    if(!b || b.status !== 'booked' || ts(b.starts_at) < Date.now()) return '';
    const auto = [['confirmed_at', 'booked note'], ['reminded_2day_at', '2 days before'], ['reminded_day_at', 'day before'], ['reminded_hour_at', 'hour before']]
      .filter(([k]) => b[k]).map(([k, w]) => ({ at:b[k], who:'automatic', what:w }));
    return line(auto.concat(texts(b.applicant_id, ts(b.created_at))), 'Reminders: none yet');
  }

  /* ── Offer sent and Step 1 ── */
  const OFFER_KINDS = { sent:{ sent:'offer sent', resent:'offer resent', reminder:'reminder' }, accepted:{ step1_sent:'Step 1 sent', step1_resent:'Step 1 resent', step1_reminder:'reminder' } };
  function offBtn(o, stage){
    if(!o || !o.id || o.onboarding_path !== 'new' || !OFFER_KINDS[stage]) return '';
    return btnHtml("HREM.offerSend('" + esc(o.id) + "','" + stage + "',this)", stage === 'sent' ? 'Sends their offer link again by text and email' : 'Sends their Step 1 link again by text and email');
  }
  function offLine(o, stage){
    if(!o || !o.id || !OFFER_KINDS[stage]) return '';
    loadOfferEv();
    if(!ST.offerEv) return '';
    const k = OFFER_KINDS[stage];
    const items = (ST.offerEv[o.id] || []).filter(e => k[e.kind]).map(e => ({ at:e.at, who:who(e.by), what:k[e.kind] + (e.practice ? ' (recorded only, the switch is off)' : '') }));
    return line(items, 'Reminders: none yet');
  }
  async function offerSend(id, stage, btn){
    const E = window.HSTRIP_ENGINE; if(!E || !E.offerAction){ alert('Offers are still loading. Try again in a moment.'); return; }
    const o = (E.offers() || []).find(x => String(x.id) === String(id)) || {}, name = (o.name || [o.first_name, o.last_name].filter(Boolean).join(' ') || 'them').trim();
    const what = stage === 'sent' ? 'their offer link' : 'their Step 1 link';
    if(!(typeof ccConfirm === 'function' ? await ccConfirm('Send ' + what + ' to ' + name + ' again, by text and email? A text after 6pm waits for 8am.') : confirm('Send ' + what + ' to ' + name + ' again?'))) return;
    const t = btn ? btn.textContent : '';
    try{
      const j = await E.offerAction(id, { action:stage === 'sent' ? 'resend_offer' : 'resend_step1' }, btn, null);
      const d = (stage === 'sent' ? j.offer_sent : j.step1) || {}, went = [d.sms ? 'text' : null, d.email ? 'email' : null].filter(Boolean);
      toast(d.practice ? 'Recorded in practice (nothing sent; the Admin switch is off).' : went.length ? 'Sent to ' + name + ' by ' + went.join(' and ') + (d.held ? ' (the text waits for 8am)' : '') + '.'
        : d.held ? 'The text waits for 8am; the email did not go.' : 'Not delivered: ' + (j.not_sent || []).join('; '));
    }catch(e){ alert('Not sent: ' + (e.message || e)); }
    if(btn) btn.textContent = t || 'Send reminder';
    ST.offerAt = 0; loadOfferEv();
    if(E.loadOffers) E.loadOffers();
  }

  /* ── Checks and Step 2 ── */
  function s2Btn(c){ return c && c.step2_sent_at && !c.step2_done_at && !c.step2_verified_at && typeof window.step2Sent === 'function' ? btnHtml('step2Sent(' + JSON.stringify(c.id).replace(/"/g, '&quot;') + ',true)', 'Sends the Viventium Step 2 message again (you confirm first)') : ''; }
  function s2Line(c){
    if(!c || !c.step2_sent_at || c.step2_done_at || c.step2_verified_at) return '';
    const items = [{ at:c.step2_sent_at, who:who(c.step2_sent_by), what:'Step 2 sent' }];
    if(c.step2_resent_at) items.push({ at:c.step2_resent_at, who:who(c.step2_resent_by), what:'Step 2 resent' });
    Object.keys(c.step2_reminders || {}).forEach(k => { const r = c.step2_reminders[k] || {}; if(r.at) items.push({ at:r.at, who:'automatic', what:'reminder' }); });
    return line(items);
  }

  /* ── Orientation (the Training Platform's own reminder, with your Hub sign-in) ── */
  function orientBtn(r){ return r && r.training_id && r.status !== 'complete' ? btnHtml("HREM.orientSend('" + esc(r.training_id) + "',this)", 'Texts and emails their orientation link and what is left (after 6pm, email only)') : ''; }
  async function orientSend(id, btn){
    const r = window.OPR && OPR._st && (OPR._st.rows || []).find(x => String(x.training_id) === String(id)), name = (r && r.name) || 'them';
    if(!(typeof ccConfirm === 'function' ? await ccConfirm('Send ' + name + ' an orientation reminder now? It texts and emails their link. After 6pm only the email goes.') : confirm('Send ' + name + ' an orientation reminder?'))) return;
    if(btn){ btn.disabled = true; btn.textContent = 'Sending…'; }
    try{
      const anon = get('TRAINING_HUB_ANON') || (window.HSTRIP_ENGINE && HSTRIP_ENGINE.anon && HSTRIP_ENGINE.anon()) || (window.OPR && OPR._anon);
      const res = await fetch(TRAIN + 'send-reminder', { method:'POST', headers:{ 'x-hub-token':await trainHubTok(), 'apikey':anon, 'Authorization':'Bearer ' + anon, 'Content-Type':'application/json' }, body:JSON.stringify({ caregiver_id:id }) });
      const j = await res.json().catch(() => ({}));
      if(!res.ok || j.error) throw new Error(j.error || ('the server answered ' + res.status));
      toast(j.status === 'sent' ? 'Reminder sent to ' + name + ' by ' + (j.channels || []).join(' and ') + (j.not_sent && j.not_sent.length ? ' (' + j.not_sent.join('; ') + ')' : '') + '.' : 'Nothing to remind them about: ' + (j.status || 'done'));
    }catch(e){ alert('Not sent: ' + (e.message || e)); }
    if(btn){ btn.disabled = false; btn.textContent = 'Send reminder'; }
    if(window.OPR) OPR.load();
  }

  const css = () => { if(document.getElementById('hrmCss')) return; const s = document.createElement('style'); s.id = 'hrmCss';
    s.textContent = '.hrm-btn{font:inherit;font-size:12px;font-weight:700;color:#fff;background:#2F6FB0;border:0;border-radius:999px;padding:4px 12px;cursor:pointer;white-space:nowrap}.hrm-btn:hover{background:#245A92}.hrm-btn:disabled{opacity:.6}'
      + '.hrm-line{font-size:12.5px;color:#3A342C;line-height:1.5;flex-basis:100%;margin-top:2px}.hrm-line b{color:#0D365F;font-weight:700}.hrm-none{color:#8A8070}';
    document.head.appendChild(s); };
  css();
  window.HREM = { apBtn, apLine, ivBtn, ivLine, offBtn, offLine, offerSend, s2Btn, s2Line, orientBtn, orientSend, _st:ST, _line:line };
})();
