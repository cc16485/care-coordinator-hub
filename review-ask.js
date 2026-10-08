/* =============================================================================
   review-ask.js · Google review asks on a client's profile (Samantha 2026-10-07/08)
   "I do want review opportunities built into the journey, but not as a generic automatic blast. The Care Coordinator
   should see a suggested review task/card." The server (review-moments) notices her five happy moments and puts ONE card
   on the Care Coordinator's My Work; the card opens this box. Here a person:
     · reads the moment (the kind words, the 5 stars, the "they love them"), copies and edits the message (with the
       verified Google review link) and sends it themselves from LeadConnector, calls, or asks in person
     · records it in one tap: Asked (how, whom) or Not now (why)
     · a week later: Left a review / Said they would / Didn't
     · can also choose to ask, any time, for a current client (never starting, paused, past or deceased)
   The Hub never sends the ask.
   ============================================================================= */
(function () {
  'use strict';
  const RV = { ax: null, data: null };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const day = d => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '';
  const HOW = { text:'text', call:'call', in_person:'in person', email:'email' }, OUT = { left:'Left a review', said_would:'Said they would', didnt:'Didn\'t leave one' };
  const MOMENT = { kind_words:'Kind words', care_match:'Care Match call', checkin:'Check-in', solved:'After we solved a problem', long_term:'Long-time client', manual:'Chosen by the team' };
  async function call(body){
    const { data:{ session } } = await sb.auth.getSession(); if(!session) throw new Error('Sign in first.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/review-moments', { method:'POST', headers:{ Authorization:'Bearer ' + session.access_token, apikey:CONFIG.supabase_anon_key, 'Content-Type':'application/json' }, body:JSON.stringify(body) });
    const d = await r.json().catch(() => null); if(!d) throw new Error('The review service answered ' + r.status);
    if(d.error && !d.outcome) throw new Error(d.error);
    return d;
  }
  function moment(a){
    const said = a.quote ? ': "' + esc(a.quote) + '"' : '';
    return '<b>' + esc(MOMENT[a.moment] || a.moment) + '</b> · ' + esc(day(a.moment_on || a.created_at)) + (a.who ? ' · ' + esc(a.who) : '') + said
      + (a.about ? ' <span class="field-note">(about ' + esc(a.about) + ')</span>' : '') + (a.after_problem ? '<div class="field-note">This came after we sorted out: ' + esc(a.after_problem) + '</div>' : '')
      + (a.note ? '<div class="field-note">' + esc(a.note) + '</div>' : '');
  }
  async function mount(o){
    const box = document.getElementById('ccReview'); if(!box) return;
    const ax = o && o.ax ? String(o.ax).trim() : (o && o.lead && o.lead.axiscare_client_id ? String(o.lead.axiscare_client_id).trim() : '');
    RV.ax = /^\d+$/.test(ax) ? ax : null; RV.data = null; box.innerHTML = '';
    if(!RV.ax) return;
    let d; try{ d = await call({ action:'review_state', axiscare_client_id:RV.ax }); }catch(e){ box.innerHTML = ''; return; }
    if(RV.ax !== ax) return;   /* another profile opened meanwhile */
    RV.data = d;
    draw();
  }
  function draw(){
    const box = document.getElementById('ccReview'), d = RV.data; if(!box || !d) return;
    if(!d.current && !(d.history || []).length){ box.innerHTML = ''; return; }
    let h = '<div class="rv-box"><div class="rv-h">Google review</div>';
    if(d.open){
      h += '<div class="rv-m">' + moment(d.open) + '</div>'
        + '<label class="rv-l">The message (edit it, copy it, send it from LeadConnector or your phone; the Hub sends nothing)</label>'
        + '<textarea id="rvMsg" rows="4">' + esc(d.message || '') + '</textarea>'
        + '<div class="rv-act"><button class="secondary" onclick="rvCopy()">Copy message</button></div>'
        + '<div class="rv-rec"><span>Then record it:</span> <select id="rvHow"><option value="">How did you ask?</option><option value="text">Text</option><option value="call">Call</option><option value="in_person">In person</option><option value="email">Email</option></select>'
        + ' <input id="rvWho" placeholder="Who you asked" value="' + esc(d.open.who || '') + '"> <button class="primary" onclick="rvAsked()">I asked</button> <button class="linklike" onclick="rvNotNow()">Not now…</button></div>'
        + '<div class="cc-err" id="rvErr"></div>';
    } else if(d.followup){
      const a = d.followup;
      h += '<div class="rv-m">Asked ' + esc(day(a.asked_at)) + ' by ' + esc(a.asked_by_name || a.asked_by) + ' (' + esc(HOW[a.asked_how] || a.asked_how) + (a.asked_who ? ', ' + esc(a.asked_who) : '') + '). Did they leave a review?</div>'
        + '<div class="rv-act"><button class="primary" onclick="rvOutcome(\'left\')">Left a review</button><button class="secondary" onclick="rvOutcome(\'said_would\')">Said they would</button><button class="secondary" onclick="rvOutcome(\'didnt\')">Didn\'t</button></div><div class="cc-err" id="rvErr"></div>';
    } else if(d.can_suggest){
      h += '<div class="rv-m field-note">No review ask right now. ' + (d.live ? 'The Hub suggests one when a family is clearly happy.' : '') + ' <a href="javascript:void(0)" onclick="rvSuggest()">Ask for a Google review…</a></div>';
    } else if(d.why_not && d.current){
      h += '<div class="rv-m field-note">' + esc(d.why_not) + '</div>';
    }
    const past = (d.history || []).filter(a => a.status !== 'suggested');
    if(past.length) h += '<details class="rv-hist"><summary>Asks so far (' + past.length + ')</summary>' + past.map(a => '<div class="cc-ev">' + esc(day(a.asked_at || a.updated_at || a.created_at)) + ' · '
      + (a.status === 'asked' ? 'Asked by ' + esc(a.asked_by_name || a.asked_by) + ' (' + esc(HOW[a.asked_how] || a.asked_how) + ')' + (a.outcome ? ' · <b>' + esc(OUT[a.outcome]) + '</b>' : ' · waiting to hear') : 'Not now' + (a.note ? ': ' + esc(a.note) : ''))
      + ' <span class="field-note">' + esc(MOMENT[a.moment] || a.moment) + '</span></div>').join('') + '</details>';
    box.innerHTML = h + '</div>';
  }
  const err = t => { const e = document.getElementById('rvErr'); if(e) e.textContent = t; };
  async function after(msg){ if(typeof ccToast === 'function') ccToast(msg); try{ if(typeof opsLoad === 'function') opsLoad(); }catch(e){} await mount({ ax:RV.ax }); }
  async function copy(){
    const t = (document.getElementById('rvMsg') || {}).value || '';
    try{ await navigator.clipboard.writeText(t); if(typeof ccToast === 'function') ccToast('Copied. Send it from LeadConnector or your phone, then tap I asked.'); }catch(e){ err('Could not copy; select the text and copy it.'); }
  }
  async function asked(){
    const how = (document.getElementById('rvHow') || {}).value, who = ((document.getElementById('rvWho') || {}).value || '').trim();
    if(!how) return err('How did you ask?');
    try{ const o = await call({ action:'review_asked', ask_id:RV.data.open.ask_id, how, who }); if(o.error) return err(o.error); }catch(e){ return err(e.message); }
    after('Recorded. In a week you\'ll get one card to note whether they left a review.');
  }
  async function notNow(){
    const why = (window.prompt && window.prompt('Not now. Why? (kept with the record)')) || '';
    if(why === null) return;
    try{ const o = await call({ action:'review_not_now', ask_id:RV.data.open.ask_id, note:why }); if(o.error) return err(o.error); }catch(e){ return err(e.message); }
    after('Noted. No review suggestion for them for 30 days.');
  }
  async function outcome(v){
    try{ const o = await call({ action:'review_outcome', ask_id:RV.data.followup.ask_id, outcome:v }); if(o.error) return err(o.error); }catch(e){ return err(e.message); }
    after(v === 'left' ? 'Wonderful. Recorded.' : 'Recorded.');
  }
  async function suggest(){
    const who = (window.prompt && window.prompt('Who would you ask? (e.g. their daughter Rosa)')) || '';
    const note = (window.prompt && window.prompt('What makes now a good time? (optional)')) || '';
    let o; try{ o = await call({ action:'review_suggest', axiscare_client_id:RV.ax, who, note }); }catch(e){ o = { error:e.message }; }
    if(o.error){ if(typeof ccToast === 'function') ccToast(o.error); return; }
    await mount({ ax:RV.ax });
  }
  if(!document.getElementById('rvCss')){ const s = document.createElement('style'); s.id = 'rvCss';
    s.textContent = '.rv-box{border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin:8px 0;background:var(--card,#fff)}.rv-h{font-weight:800;color:var(--navy);margin-bottom:4px}'
      + '.rv-m{font-size:13.5px;margin:4px 0}.rv-l{display:block;font-size:12px;color:var(--text-muted);margin-top:8px}#rvMsg{width:100%;box-sizing:border-box;font:inherit;font-size:13.5px;margin-top:4px}'
      + '.rv-act{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0}.rv-rec{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:13px;margin-top:6px}.rv-rec input{max-width:200px;width:auto}.rv-rec select{width:auto;max-width:200px;display:inline-block}.rv-hist summary{cursor:pointer;font-size:12.5px;color:var(--text-muted)}';
    document.head.appendChild(s); }
  /* ── Settings: the switch (same words as the Owners Hub Admin page) and the review link (config, not code) ── */
  const RV_ON = 'Turn on Google review suggestions?\n\nOnce a day, the Hub looks for a happy moment from the last two weeks: kind words a person confirmed, a Care Match call where the family loves their caregiver, a 4 or 5 star check-in, kind words after we solved a problem, or a long-time client whose check-ins stay high. Only for current clients with us two weeks or more, with no open concern, not asked in 90 days. The client\'s Care Coordinator gets ONE card, with the message and your Google review link ready to copy. They send it themselves (or call, or ask in person) and record it; a week later one card asks whether a review was left.\n\nThe Hub never sends a review request itself.';
  const RV_OFF = 'Turn off Google review suggestions? No new cards are made. Anything already suggested or asked stays on the profile, and anyone can still choose to ask from a client\'s profile.';
  const DEFAULT_URL = 'https://search.google.com/local/writereview?placeid=ChIJaUETSOx7z4cRdYKcTMoZ6Go';
  const isOwner = () => { try{ return ccIsOwner(); }catch(e){ return false; } };
  function setFill(){
    const box = document.getElementById('rvSet'); if(!box) return;
    const st = (typeof DATA !== 'undefined' && DATA.ops_settings) || {}, on = st.review_asks_live === true, can = isOwner(), url = st.google_review_url || DEFAULT_URL;
    box.innerHTML = '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">' + (can ? '<button class="' + (on ? 'secondary' : 'primary') + '" onclick="rvSetToggle(this)">' + (on ? 'Turn off' : 'Turn on') + '</button>' : '')
      + '<span class="field-note" id="rvSetMsg">' + (on ? 'On: the Hub suggests asks to Care Coordinators.' : 'Off: no suggestions. Anyone can still choose to ask from a client\'s profile.') + '</span></div>'
      + '<label class="field-note" style="display:block;">Your Google review link (verified signed in 2026-10-08)</label>'
      + '<input id="rvUrl" style="width:100%;max-width:640px" value="' + esc(url) + '"' + (can ? '' : ' disabled') + '>'
      + (can ? ' <button class="secondary" onclick="rvSetUrl(this)">Save link</button> <span class="field-note" id="rvUrlMsg"></span>' : '');
  }
  async function setToggle(b){
    const on = !(((typeof DATA !== 'undefined' && DATA.ops_settings) || {}).review_asks_live === true);
    if(!confirm(on ? RV_ON : RV_OFF)) return;
    if(b) b.disabled = true;
    const out = await tkMerge(m => { m.review_asks_live = on; return ['Google review suggestions ' + (on ? 'ON' : 'OFF')]; }, 'Google reviews');
    if(b) b.disabled = false;
    if(!out.error) DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { review_asks_live:on });
    setFill(); const msg = document.getElementById('rvSetMsg'); if(msg && out.error) msg.textContent = 'Could not save: ' + out.error.message;
  }
  async function setUrl(b){
    const v = ((document.getElementById('rvUrl') || {}).value || '').trim(), msg = document.getElementById('rvUrlMsg');
    if(!/^https:\/\/(search\.google\.com|g\.page|maps\.app\.goo\.gl)\//.test(v)){ if(msg) msg.textContent = 'That doesn\'t look like a Google review link.'; return; }
    if(!confirm('Use this as your Google review link in every review message?\n\n' + v + '\n\nOpen it once while signed in to Google first, to be sure it shows the review box for Caring Companions.')) return;
    if(b) b.disabled = true;
    const out = await tkMerge(m => { const was = m.google_review_url || DEFAULT_URL; m.google_review_url = v; return was === v ? [] : ['Google review link changed']; }, 'Google reviews');
    if(b) b.disabled = false;
    if(out.error){ if(msg) msg.textContent = 'Could not save: ' + out.error.message; return; }
    DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { google_review_url:v }); if(msg) msg.textContent = 'Saved.';
  }
  let countsAt = 0, counts = null;
  async function rvCounts(){ if(counts && Date.now() - countsAt < 300000) return counts; try{ counts = await call({ action:'review_counts' }); countsAt = Date.now(); }catch(e){ counts = null; } return counts && !counts.error ? counts : null; }
  Object.assign(window, { rvSetFill:setFill, rvSetToggle:setToggle, rvSetUrl:setUrl, rvCounts, rvMount:mount, rvCopy:copy, rvAsked:asked, rvNotNow:notNow, rvOutcome:outcome, rvSuggest:suggest, RV_STATE:RV });
})();
