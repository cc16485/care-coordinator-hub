/* =====================================================================================================================
   CALL COACHING (Samantha 2026-10-18). "what is the best way to teach new care coordinators how to handle new client
   calls, i dont want complicated forms, i want the conversation to flow, but for me since ive done it for so long i dont
   need step by step and prompts". Mockup approved as shown (https://claude.ai/artifact/G2zL8caJQHcKTskPMKkA1k), and her
   two calls: the five beats REPLACE the Guided Call screen, and for her and Krystal + Add Lead opens just a notes box.
     · + Add Lead opens "Taking a call": the caller's number and name if you have them, one notes box, Save. Nothing else
       to type: the recording fills the rest of the lead afterwards (Make this a lead / Add from this call, call-lead.js).
     · The five beats (their story, day to day at home, what help looks like, how it gets paid, next step) sit beside the
       notes box ONLY for people an owner switched call help on for. Off for everyone else, Samantha and Krystal included.
     · Calls tab, "Call coaching": the best calls an owner picked (play, listened ticks), each new coordinator's own new-
       family calls with how many of the five beats the lead shows, first-call reviews (2 a week for the first 2 weeks),
       and good calls toward 20. At 20 good calls the coordinator may switch the beats off themselves.
     · A "good call" = all five beats on the lead: why they called, something about home, days or hours, the payer, and a
       home visit booked. Read from the lead itself, so it counts once the recording has filled it in.
   Saved in app_data call_coaching: person:<email> (call help on/off, reviewer, listened), best:<call id>, review:<lead id>.
   Nothing here sends anything to anyone.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const KEY = 'call_coaching', GOOD = 20, REVIEW_DAYS = 14, REVIEWS_A_WEEK = 2;
  const say = m => { if(typeof ccToast === 'function') ccToast(m); else alert(m); };
  const lc = s => String(s || '').trim().toLowerCase();
  const myEmail = () => lc(typeof ME !== 'undefined' && ME && ME.email);
  const now = () => new Date().toISOString();
  const items = () => (typeof DATA !== 'undefined' && Array.isArray(DATA[KEY])) ? DATA[KEY] : [];
  const get = id => items().find(x => x && x.id === id) || null;
  const owner = () => { try{ return typeof ccIsOwner === 'function' && ccIsOwner(); }catch(e){ return false; } };
  const nameOf = e => { try{ return (typeof opsOwnerName === 'function' && opsOwnerName(e)) || e; }catch(x){ return e; } };
  const first = e => String(nameOf(e) || '').split(/[\s@]/)[0] || e;

  async function put(item){
    if(typeof DATA !== 'undefined' && !Array.isArray(DATA[KEY])) DATA[KEY] = [];
    const i = DATA[KEY].findIndex(x => x && x.id === item.id); if(i >= 0) DATA[KEY][i] = item; else DATA[KEY].push(item);
    await persist(KEY, item);
  }
  const person = e => get('person:' + lc(e));
  /** call help (the five beats) is on for this person: an owner switched it on and it has not been switched off */
  const helpOn = e => { const p = person(e || myEmail()); return !!(p && p.coaching); };
  const isReviewer = e => owner() || !!((person(e || myEmail()) || {}).reviewer);
  const coached = () => items().filter(x => x && x.kind === 'person' && x.started_at);

  /* ---------- the five beats, read from a lead ---------- */
  const arr = v => Array.isArray(v) ? v : [];
  const BEATS = [
    { key: 'story', name: 'Their story', line: '"Tell me what\'s going on with your mom."', hint: 'Then mostly listen.',
      has: l => !!String(l.why_called || '').trim() || String(l.interest_notes || '').trim().length >= 20 },
    { key: 'home', name: 'Day to day at home', line: '"Walk me through a normal day for her."', hint: 'Who\'s there, what\'s getting hard, falls, memory.',
      has: l => !!(arr(l.needs).length || arr(l.safety).length || l.mobility || arr(l.personal_care).length || arr(l.medical_conditions).length || String(l.medical_notes || '').trim()) },
    { key: 'help', name: 'What help looks like', line: '"What days and times would help most?"', hint: 'Days, times, about how many hours.',
      has: l => !!(arr(l.schedule_days).length || arr(l.schedule && l.schedule.days).length || String(l.times_needed || '').trim() || String(l.days_needed || '').trim() || String(l.number_of_hours || '').trim() || (l.schedule && l.schedule.hours_per_week)) },
    { key: 'paid', name: 'How it gets paid', line: '"How were you planning to pay for care?"', hint: 'Private pay, long-term care insurance, VA, GUIDE.',
      has: l => !!String(l.funding_source || '').trim() },
    { key: 'next', name: 'Next step', line: '"Let\'s set a time for me to come meet her."', hint: 'Book the home visit before you hang up.',
      has: l => !!(l.assessment_at || ((typeof DATA !== 'undefined' && DATA.care_assessments) || []).some(a => a && a.lead_id === l.id) || ['Assessment Scheduled', 'Converted'].indexOf(l.status) >= 0) }
  ];
  function beats(l){ const got = BEATS.filter(b => b.has(l || {})); return { n: got.length, missing: BEATS.filter(b => !b.has(l || {})).map(b => b.name), good: got.length === BEATS.length }; }

  /** the new-family calls this person took: leads they saved from + Add Lead, or filled from a call they took */
  const sameMe = (by, e) => { const b = lc(by); if(!b) return false; return b === lc(e) || b === lc(nameOf(e)); };
  function callsOf(e){
    const L = (typeof DATA !== 'undefined' && Array.isArray(DATA.leads)) ? DATA.leads : [];
    return L.filter(l => l && !l.archived && (sameMe(l.call_taken_by, e)
      || (arr(l.from_calls)[0] && sameMe(l.from_calls[0].by, e))
      || (arr(l.contact_events).find(x => x && x.outcome === 'connected' && x.actor === 'human') || {}).by && sameMe(arr(l.contact_events).find(x => x && x.outcome === 'connected' && x.actor === 'human').by, e)))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }
  const leadWho = l => [l.first_name, l.last_name].filter(x => x && !/^\(phone lead\)$/i.test(x)).join(' ') || [l.client_first_name, l.client_last_name].filter(Boolean).join(' ') || 'A family';
  const dayWords = iso => { const d = iso ? new Date(iso) : null; return d && !isNaN(d) ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago' }) : ''; };

  /* ---------- + Add Lead: Taking a call ---------- */
  function beatsHtml(){
    return '<aside class="cc-beats" aria-label="The five beats">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;"><b style="font-size:16px;color:var(--navy);">The five beats</b>'
      + '<button type="button" class="linklike" onclick="CallCoach.hideBeats()">Hide</button></div>'
      + '<div class="field-note" style="margin:0 0 10px;">Any order. Just get to all five.</div>'
      + BEATS.map((b, i) => '<div class="cc-beat"><span class="cc-num">' + (i + 1) + '</span><div><b>' + esc(b.name) + '</b><div>' + esc(b.line) + '</div><div class="field-note">' + esc(b.hint) + '</div></div></div>').join('')
      + '</aside>';
  }
  function ensurePanel(){
    if(document.getElementById('ccCallBackdrop')) return;
    const css = document.createElement('style');
    css.textContent = '#ccCallBackdrop .modal{max-width:520px;}#ccCallBackdrop.cc-with-beats .modal{max-width:900px;}'
      + '.cc-call-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;}#ccCallBackdrop.cc-with-beats .cc-call-grid{grid-template-columns:minmax(0,1fr) 330px;}'
      + '@media (max-width:760px){#ccCallBackdrop.cc-with-beats .cc-call-grid{grid-template-columns:minmax(0,1fr);}}'
      + '.cc-beats{background:#FAF9F6;border:1px solid var(--border);border-radius:12px;padding:14px 16px;}'
      + '.cc-beat{display:flex;gap:10px;margin:10px 0;font-size:13.5px;line-height:1.4;}.cc-beat b{color:var(--navy);}'
      + '.cc-num{flex:0 0 26px;height:26px;border-radius:50%;background:#1F7A8C;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:13px;}'
      + '.cc-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 0;border-top:1px solid var(--border);}'
      + '.cc-pill{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700;background:#EAF4F6;color:#103D47;}'
      + '.cc-bar{height:8px;border-radius:999px;background:#f2f0e9;overflow:hidden;}.cc-bar>i{display:block;height:100%;background:#1F7A8C;border-radius:999px;}'
      + '#leadModalBackdrop.cc-quiet{visibility:hidden;}';
    document.head.appendChild(css);
    const d = document.createElement('div');
    d.className = 'modal-backdrop'; d.id = 'ccCallBackdrop';
    d.innerHTML = '<div class="modal"><h2 style="margin:0 0 2px;">Taking a call</h2>'
      + '<div class="modal-sub">Just talk. The call is recorded and the lead fills itself in from it afterwards.</div>'
      + '<div class="cc-call-grid"><div>'
      + '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0;">'
      + '<label class="field-note">Their number<input id="cc_phone" type="tel" autocomplete="off" style="width:100%;"></label>'
      + '<label class="field-note">Their name<input id="cc_name" type="text" autocomplete="off" style="width:100%;"></label></div>'
      + '<label class="field-note" for="cc_notes">Notes</label><textarea id="cc_notes" rows="9" style="width:100%;" placeholder="Anything you want to remember. Optional."></textarea>'
      + '<div class="field-note" id="cc_say" style="margin-top:6px;">Add their number so the recording lands on this lead.</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;align-items:center;">'
      + '<button class="primary" id="cc_save" onclick="CallCoach.save()">Save lead</button>'
      + '<button class="secondary" onclick="CallCoach.close()">Not a new family, close</button>'
      + '<span style="flex:1;"></span><button class="linklike" onclick="CallCoach.fullForm()">Open the full lead form</button></div>'
      + '</div><div id="cc_beats_slot"></div></div></div>';
    document.body.appendChild(d);
  }
  function open(){
    ensurePanel();
    const d = document.getElementById('ccCallBackdrop'), on = helpOn();
    ['cc_phone', 'cc_name', 'cc_notes'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('cc_say').textContent = 'Add their number so the recording lands on this lead.';
    document.getElementById('cc_beats_slot').innerHTML = on ? beatsHtml() : '';
    d.classList.toggle('cc-with-beats', on);
    d.classList.add('open');
    setTimeout(() => { const f = document.getElementById('cc_phone'); if(f) f.focus(); }, 60);
  }
  function close(){ const d = document.getElementById('ccCallBackdrop'); if(d) d.classList.remove('open'); }
  function hideBeats(){ document.getElementById('cc_beats_slot').innerHTML = ''; document.getElementById('ccCallBackdrop').classList.remove('cc-with-beats'); }
  /** what was typed goes into the REGULAR lead form (one save path: same-family check, journey, first-call clock) */
  function toForm(){
    const v = id => document.getElementById(id).value.trim();
    const phone = v('cc_phone'), name = v('cc_name'), notes = v('cc_notes');
    openLeadModal();
    const parts = name.split(/\s+/).filter(Boolean);
    document.getElementById('lead_first_name').value = parts[0] || '';
    document.getElementById('lead_last_name').value = parts.slice(1).join(' ');
    document.getElementById('lead_phone').value = phone;
    document.getElementById('lead_interest_notes').value = notes;
    const src = document.getElementById('lead_source'); if(src){ src.value = 'Phone'; src.dispatchEvent(new Event('change')); }
    const tb = document.getElementById('lead_talked_now'); if(tb) tb.checked = true;   /* this call is the first real conversation */
    return { phone, name, notes };
  }
  async function save(){
    const t = { phone: document.getElementById('cc_phone').value.trim(), name: document.getElementById('cc_name').value.trim() };
    if(!t.phone && !t.name){ document.getElementById('cc_say').innerHTML = '<b style="color:#A83A2F;">Add their number or name first.</b> The number is best: the recording finds the lead by it.'; return; }
    const btn = document.getElementById('cc_save'); btn.disabled = true; btn.textContent = 'Saving…';
    const before = new Set(((typeof DATA !== 'undefined' && DATA.leads) || []).map(l => l && l.id));
    const m = document.getElementById('leadModalBackdrop');
    try{
      toForm(); close();
      m.classList.add('cc-quiet');
      CC.taking = myEmail();
      await saveLead();
    }catch(e){ say('Could not save the lead: ' + (e && e.message || e)); }
    finally{
      CC.taking = '';
      m.classList.remove('cc-quiet');   /* a check that needs a person (same family, a question) is left showing */
      btn.disabled = false; btn.textContent = 'Save lead';
    }
    const made = ((typeof DATA !== 'undefined' && DATA.leads) || []).find(l => l && !before.has(l.id));
    if(made) say('Lead saved. The call fills in the rest once it is recorded.');
  }
  function fullForm(){ toForm(); close(); }
  /** saveLead, for a lead saved from Taking a call: who took it (for their coaching list) */
  function stamp(lead){ if(CC.taking && !lead.call_taken_by){ lead.call_taken_by = CC.taking; lead.call_taken_at = now(); } }

  /* ---------- Calls tab: Call coaching ---------- */
  async function play(id, btn){
    const holder = document.getElementById('ccrec-' + id); if(!holder) return;
    if(holder.dataset.loaded){ holder.style.display = holder.style.display === 'none' ? 'block' : 'none'; return; }
    const label = btn.textContent; btn.disabled = true; btn.textContent = 'Loading…';
    try{
      const { data: { session } } = await sb.auth.getSession();
      const r = await fetch(CONFIG.supabase_url + '/functions/v1/calls-feed', { method: 'POST',
        headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json', apikey: CONFIG.supabase_anon_key }, body: JSON.stringify({ recording: id }) });
      if(!r.ok) throw new Error('no recording');
      holder.innerHTML = '<audio controls autoplay style="width:100%;margin-top:6px;" src="' + URL.createObjectURL(await r.blob()) + '"></audio>';
      holder.dataset.loaded = '1'; holder.style.display = 'block'; btn.textContent = label;
      markListened(id);
    }catch(e){ btn.textContent = 'No recording'; say('That recording could not be loaded.'); }
    finally{ btn.disabled = false; }
  }
  async function markListened(id){
    const e = myEmail(), p = person(e); if(!p || !p.coaching) return;
    if(arr(p.listened).indexOf(id) >= 0) return;
    await put(Object.assign({}, p, { listened: arr(p.listened).concat([id]) }));
    render();
  }
  const bests = () => items().filter(x => x && x.kind === 'best' && !x.removed).sort((a, b) => String(a.added_at || '').localeCompare(String(b.added_at || '')));
  function bestHtml(p){
    const B = bests();
    if(!B.length) return '<div class="field-note">No best calls picked yet.' + (owner() ? ' Use "Add to best calls" on a call below.' : ' Samantha picks these.') + '</div>';
    return B.map((b, i) => {
      const heard = p && arr(p.listened).indexOf(b.message_id) >= 0;
      return '<div class="cc-row" data-best="' + esc(b.message_id) + '"><span class="cc-num" style="' + (heard ? '' : 'background:#fff;border:2px solid #c9c5b9;color:#55677a;') + '" aria-label="' + (heard ? 'Listened' : 'Not listened yet') + '">' + (heard ? '✓' : i + 1) + '</span>'
        + '<div style="flex:1 1 200px;min-width:0;"><b style="color:var(--navy);">' + esc(b.title || 'A good call') + '</b><div class="field-note">' + esc(b.listen_for ? 'Listen for: ' + b.listen_for : '') + '</div></div>'
        + '<button class="ghost" style="font-size:12px;padding:6px 12px;min-height:36px;" onclick="CallCoach.play(\'' + esc(b.message_id) + '\',this)">Play</button>'
        + (owner() ? '<button class="linklike" style="font-size:12px;" onclick="CallCoach.removeBest(\'' + esc(b.message_id) + '\')">Remove</button>' : '')
        + '<div id="ccrec-' + esc(b.message_id) + '" style="display:none;flex-basis:100%;"></div></div>';
    }).join('');
  }
  function callsHtml(e, withReview){
    const p = person(e), L = callsOf(e).filter(l => !p || !p.started_at || String(l.created_at || '') >= String(p.started_at).slice(0, 10));
    if(!L.length) return '<div class="field-note">No new-family calls yet.</div>';
    return L.slice(0, 8).map(l => {
      const b = beats(l), rv = get('review:' + l.id);
      return '<div class="cc-row"><div style="flex:1 1 220px;min-width:0;"><b>' + esc(dayWords(l.created_at)) + ' · ' + esc(leadWho(l)) + '</b>'
        + '<div class="field-note">' + b.n + ' of 5 beats' + (b.missing.length ? ' · not on the lead yet: ' + esc(b.missing.join(', ').toLowerCase()) : ' · a good call') + '</div>'
        + (rv ? '<div class="field-note" style="color:#1F5F3A;">Reviewed by ' + esc(first(rv.reviewed_by)) + (rv.note ? ': ' + esc(rv.note) : '') + '</div>' : '') + '</div>'
        + '<button class="linklike" style="font-size:12px;" onclick="CallCoach.openLead(\'' + esc(l.id) + '\')">Open lead</button>'
        + (withReview && !rv ? '<button class="ghost" style="font-size:12px;padding:6px 12px;min-height:36px;" onclick="CallCoach.review(\'' + esc(l.id) + '\',\'' + esc(e) + '\')">Mark reviewed</button>' : '')
        + '</div>';
    }).join('');
  }
  function progress(e){
    const p = person(e), good = callsOf(e).filter(l => (!p || !p.started_at || String(l.created_at || '') >= String(p.started_at).slice(0, 10)) && beats(l).good).length;
    return { good, of: GOOD, pct: Math.min(100, Math.round(good / GOOD * 100)) };
  }
  function reviewsDue(e){
    const p = person(e); if(!p || !p.coaching || !p.started_at) return null;
    const start = new Date(p.started_at), end = new Date(start.getTime() + REVIEW_DAYS * 864e5);
    if(Date.now() > end.getTime()) return null;
    const weekStart = new Date(start.getTime() + Math.floor((Date.now() - start.getTime()) / (7 * 864e5)) * 7 * 864e5);
    const done = items().filter(x => x && x.kind === 'review' && lc(x.coordinator) === lc(e) && new Date(x.reviewed_at) >= weekStart).length;
    return { done, want: REVIEWS_A_WEEK, until: end.toISOString() };
  }
  function mineHtml(){
    const e = myEmail(), p = person(e); if(!p || !p.coaching) return '';
    const B = bests(), heard = B.filter(b => arr(p.listened).indexOf(b.message_id) >= 0).length, pr = progress(e), rd = reviewsDue(e);
    return '<div class="card" id="ccMine" style="padding:16px 18px;margin-bottom:16px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;"><h3 style="margin:0;color:var(--navy);">Listen to how Samantha does it</h3>'
      + (B.length ? '<span class="cc-pill">' + heard + ' of ' + B.length + ' listened</span>' : '') + '</div>'
      + '<div class="field-note" style="margin:2px 0 6px;">Real calls Samantha picked. Listen to all of them before taking new-family calls alone.</div>'
      + bestHtml(p)
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;margin-top:16px;">'
      + '<div><b style="color:var(--navy);">Your new-family calls</b>' + (rd ? '<div class="field-note">First 2 weeks: ' + rd.done + ' of ' + rd.want + ' reviewed with you this week.</div>' : '') + callsHtml(e, false) + '</div>'
      + '<div><b style="color:var(--navy);">Ready to go without the beats</b><div class="field-note">A good call = all five beats on the lead, home visit booked.</div>'
      + '<div style="display:flex;justify-content:space-between;margin:8px 0 4px;"><span>Good calls</span><b>' + pr.good + ' of ' + pr.of + '</b></div><div class="cc-bar"><i style="width:' + pr.pct + '%;"></i></div>'
      + (pr.good >= GOOD ? '<button class="secondary" style="margin-top:10px;" onclick="CallCoach.switchOffMine()">Switch the five beats off</button>' : '<div class="field-note" style="margin-top:8px;">At ' + GOOD + ', you can switch the five beats off.</div>')
      + '</div></div></div>';
  }
  function staffEmails(){
    const m = (typeof CC_ROLE_BY_EMAIL !== 'undefined' && CC_ROLE_BY_EMAIL) || {};
    return Object.keys(m).map(lc).filter(Boolean).sort((a, b) => String(nameOf(a)).localeCompare(String(nameOf(b))));
  }
  function teamHtml(){
    if(!isReviewer()) return '';
    const isO = owner(), list = isO ? staffEmails() : coached().filter(p => p.coaching).map(p => p.email);
    const rows = list.map(e => {
      const p = person(e) || {}, on = !!p.coaching, rd = reviewsDue(e), pr = progress(e), B = bests();
      return '<div style="padding:10px 0;border-top:1px solid var(--border);" data-coach="' + esc(e) + '">'
        + '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;"><b style="color:var(--navy);min-width:150px;">' + esc(nameOf(e)) + '</b>'
        + (on ? '<span class="cc-pill">Call help on · ' + pr.good + ' of ' + GOOD + ' good calls · ' + B.filter(b => arr(p.listened).indexOf(b.message_id) >= 0).length + ' of ' + B.length + ' listened</span>' : '<span class="field-note">Call help off</span>')
        + (rd ? '<span class="field-note">' + rd.done + ' of ' + rd.want + ' reviews this week</span>' : '')
        + '<span style="flex:1;"></span>'
        + (isO ? '<button class="ghost" style="font-size:12px;padding:6px 12px;min-height:36px;" onclick="CallCoach.setHelp(\'' + esc(e) + '\',' + (on ? 'false' : 'true') + ')">' + (on ? 'Switch call help off' : 'Switch call help on') + '</button>'
          + '<label class="field-note" style="display:flex;gap:4px;align-items:center;"><input type="checkbox" ' + (p.reviewer ? 'checked ' : '') + 'onchange="CallCoach.setReviewer(\'' + esc(e) + '\',this.checked)"> Reviews calls</label>' : '')
        + '</div>' + (on ? '<div style="margin-left:4px;">' + callsHtml(e, true) + '</div>' : '') + '</div>';
    }).join('');
    return '<div class="card" id="ccTeam" style="padding:16px 18px;margin-bottom:16px;">'
      + '<details' + (coached().some(p => p.coaching) ? ' open' : '') + '><summary style="cursor:pointer;"><b style="color:var(--navy);font-size:15px;">Call coaching</b> <span class="field-note">new coordinators: the five beats, best calls, first-call reviews</span></summary>'
      + (isO ? '<div style="margin:10px 0 4px;"><b style="color:var(--navy);">Best calls</b> <span class="field-note">(new coordinators listen to these; 5 is plenty)</span>' + bestHtml(null) + '</div>' : '')
      + (rows || '<div class="field-note" style="margin-top:8px;">Nobody has call help on.</div>') + '</details></div>';
  }
  function render(){
    const box = document.getElementById('ccCoachBox'); if(!box) return;
    box.innerHTML = mineHtml() + teamHtml();
  }
  /** owner: "Add to best calls" on an answered call with a recording (Calls tab) */
  function callTools(c){
    if(!owner() || !c || !c.duration || !c.has_recording) return '';
    const b = get('best:' + c.id);
    return (b && !b.removed) ? '<span class="cc-pill">In best calls</span>' : '<button class="linklike" style="font-size:12px;" onclick="CallCoach.addBest(\'' + esc(c.id) + '\',this)">Add to best calls</button>';
  }
  function addBest(id, btn){
    const host = btn && btn.parentElement; if(!host || host.querySelector('.cc-addform')) return;
    const f = document.createElement('div'); f.className = 'cc-addform';
    f.style.cssText = 'flex-basis:100%;display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:6px;';
    f.innerHTML = '<input type="text" class="cc-title" placeholder="What kind of call (e.g. The worried daughter)" style="flex:1 1 220px;" aria-label="What kind of call">'
      + '<input type="text" class="cc-listen" placeholder="Listen for (e.g. how long you let her talk)" style="flex:2 1 260px;" aria-label="Listen for">'
      + '<button class="primary" style="font-size:12px;padding:6px 12px;">Add</button><button class="linklike" style="font-size:12px;">Cancel</button>';
    host.appendChild(f);
    const [add, cancel] = f.querySelectorAll('button');
    cancel.onclick = () => f.remove();
    add.onclick = async () => {
      const title = f.querySelector('.cc-title').value.trim(), listen = f.querySelector('.cc-listen').value.trim();
      if(!title){ f.querySelector('.cc-title').focus(); return; }
      add.disabled = true;
      await put({ id: 'best:' + id, kind: 'best', message_id: id, title, listen_for: listen, added_by: myEmail(), added_at: now(), removed: false });
      say('Added to best calls.'); f.remove(); repaint();
    };
    f.querySelector('.cc-title').focus();
  }
  async function removeBest(id){
    const b = get('best:' + id); if(!b) return;
    await put(Object.assign({}, b, { removed: true, removed_by: myEmail(), removed_at: now() }));
    repaint();
  }
  async function setHelp(e, on){
    if(!owner()) return;
    const p = person(e) || { id: 'person:' + lc(e), kind: 'person', email: lc(e), listened: [] };
    const next = Object.assign({}, p, { coaching: !!on, set_by: myEmail(), set_at: now() });
    if(on && !p.coaching) next.started_at = p.started_at || now();
    if(!on){ next.switched_off_at = now(); next.switched_off_by = myEmail(); }
    await put(next); render();
  }
  async function setReviewer(e, on){
    if(!owner()) return;
    const p = person(e) || { id: 'person:' + lc(e), kind: 'person', email: lc(e), listened: [] };
    await put(Object.assign({}, p, { reviewer: !!on, set_by: myEmail(), set_at: now() })); render();
  }
  async function switchOffMine(){
    const e = myEmail(), p = person(e); if(!p || progress(e).good < GOOD) return;
    await put(Object.assign({}, p, { coaching: false, switched_off_at: now(), switched_off_by: e, switched_off_why: GOOD + ' good calls' }));
    say('The five beats are off. Nice work.'); render();
  }
  async function review(leadId, e){
    if(!isReviewer()) return;
    const note = (window.prompt('A short note for ' + first(e) + ' (optional):', '') || '').trim();
    await put({ id: 'review:' + leadId, kind: 'review', lead_id: leadId, coordinator: lc(e), reviewed_by: myEmail(), reviewed_at: now(), note: note.slice(0, 300) });
    render();
  }
  function openLead(id){ if(typeof openLeadProfile === 'function') openLeadProfile(id); else openLeadModal(id); }
  function repaint(){ render(); try{ if(typeof callsPaint === 'function' && document.getElementById('callsList')) callsPaint(); }catch(e){} }

  const CC = { taking: '' };
  window.CallCoach = { open, close, hideBeats, save, fullForm, stamp, render, callTools, addBest, removeBest, setHelp, setReviewer, switchOffMine, review, play, openLead,
    helpOn, beats, callsOf, progress, reviewsDue, BEATS, _state: CC };
})();
