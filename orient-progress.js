/* =====================================================================================================================
   ORIENTATION (Recruit & Onboard > Orientation; Samantha 2026-11-01: "it would be nice to have an orientation tab so we
   can see who has been invited and when, at what unit they are in in orientation, alert us if there is any issue with
   someone getting stuck at a certain unit in orientation (that has happened a couple of times) and when they have
   completed it.")
   One list, read from the Training Platform (hub-training-data ?action=orientation_progress, office sign-in only):
     · Needs you: invited and not started, or no new screen in a unit, for ops_settings.orient_stuck_days (default 2);
       finished but never signed off
     · In orientation: the unit they are on, the screen, the units done
     · Invited, not started yet
     · Finished (last 60 days): the day, and whether they signed off
   The red count on the Orientation pill is the Needs you count, checked at sign-in and every 30 minutes. Nobody is
   texted by this page. Unit times come from course_unit_marks (Training orientation-progress.sql), so units finished
   before 2026-11-01 carry the day of their last save only.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  /* the 11 units of Agency Orientation v2 (Training src/data/orientation-v2.json: number, title, screens) */
  const UNITS = [
    [1, 'Welcome to Caring Companions', 13], [2, 'Becoming a Caring Companion', 12], [3, 'Working Every Shift Successfully', 12],
    [4, 'Caring for Clients the Caring Companions Way', 12], [5, 'Professional Conduct', 12], [6, 'Safety First', 13],
    [7, 'Working at Caring Companions', 11], [8, 'Employment Policies', 11], [9, 'Technology & Documentation', 16],
    [10, 'Managing Your Schedule in AxisCare', 9], [11, 'Welcome to the Team', 10]
  ];
  const HOUR = 3600e3, DAY = 24 * HOUR;
  /* its own copy of the Training door (the same as caregivers-engine.js TRAINING_DATA_FN / TRAINING_HUB_ANON): the engine is only
     loaded when a caregiver tab opens, and the pill count is read at sign-in. The public key, not a secret. */
  const FN = 'https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/hub-training-data';
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkcXVqeGl5Y3ljd2hza3l2cndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMTg1NDgsImV4cCI6MjA5ODc5NDU0OH0.SFjAfj--b-tWrk8bMVLeM-tGwD8VBaPsEBtUAp5tPew';
  const ST = { rows:null, err:'', busy:false, at:0 };
  const el = () => document.getElementById('orpMount');
  const ts = iso => { const t = iso ? new Date(iso).getTime() : NaN; return isNaN(t) ? 0 : t; };
  const day = iso => ts(iso) ? new Date(iso).toLocaleDateString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric' }) : '';
  const when = iso => ts(iso) ? new Date(iso).toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : '';
  const ago = t => { const d = Math.floor((Date.now() - t) / DAY); return d <= 0 ? 'today' : d === 1 ? '1 day ago' : d + ' days ago'; };
  function stuckDays(){
    const n = Math.round(Number(((typeof DATA !== 'undefined' && DATA && DATA.ops_settings) || {}).orient_stuck_days));
    return n >= 1 && n <= 30 ? n : 2;
  }

  /* one person, read once: where they are and whether they need us */
  function read(r){
    const units = Array.isArray(r.units) ? r.units : [];
    const byNum = {}; units.forEach(u => { byNum[u.module] = u; });
    const done = UNITS.filter(([n]) => byNum[n] && byNum[n].complete).length;
    const cur = UNITS.find(([n]) => !(byNum[n] && byNum[n].complete)) || null;
    const curU = cur ? (byNum[cur[0]] || null) : null;
    const moved = Math.max(0, ...units.map(u => ts(u.moved_at)));
    const seen = Math.max(ts(r.last_seen), ...units.map(u => ts(u.last_at)));
    const invited = ts(r.welcome_sent_at) || ts(r.assigned_at);
    const limit = stuckDays() * DAY;
    const p = { r, done, cur, curU, moved, seen, invited, state:'', alert:'', soft:false };
    if(r.status === 'complete'){
      p.state = 'done';
      if(!r.attested_at && !r.signoff_note_at){ p.alert = 'Finished, but never signed off (typing their name to confirm they did it themselves). Send the sign-off reminder from the Training Platform.'; p.soft = true; }
    } else if(!units.length){
      p.state = 'notstarted';
      if(invited && Date.now() - invited > limit) p.alert = 'Invited ' + ago(invited) + ' and has not opened orientation yet.';
    } else {
      p.state = 'inprogress';
      const last = moved || seen;
      if(last && Date.now() - last > limit){
        const where = cur ? 'Unit ' + cur[0] + (curU ? ', screen ' + (Number(curU.scene || 0) + 1) + ' of ' + cur[2] : '') : 'the last unit';
        p.alert = 'Stuck on ' + where + ': no new screen since ' + day(new Date(last).toISOString()) + ' (' + ago(last) + ').'
          + (seen && moved && seen - moved > 30 * 60e3 ? ' They came back on ' + when(new Date(seen).toISOString()) + ' but could not get further.' : '');
      }
    }
    return p;
  }
  function people(){ return (ST.rows || []).map(read); }
  function needs(list){ return list.filter(p => p.alert); }

  async function fetchRows(){
    if(typeof trainHubTok !== 'function') return { error:'The Hub sign-in is not loaded on this page.' };
    try{
      const r = await fetch(FN + '?action=orientation_progress', { method:'POST',
        headers:{ 'x-hub-token':await trainHubTok(), 'apikey':ANON, 'Authorization':'Bearer ' + ANON, 'Content-Type':'application/json' }, body:'{}' });
      const data = await r.json().catch(() => null);
      if(!Array.isArray(data)) return { error:(data && data.error) || ('The Training Platform answered ' + r.status + '.') };
      return { rows:data };
    }catch(e){ return { error:'Could not reach the Training Platform.' }; }
  }
  async function load(){
    if(ST.busy) return; ST.busy = true; draw();
    const out = await fetchRows();
    ST.busy = false; ST.at = Date.now();
    if(out.error) ST.err = out.error; else { ST.err = ''; ST.rows = out.rows; }
    badge(); draw();
  }
  function badge(){
    const b = document.getElementById('orpPillBadge'); if(!b) return;
    const n = ST.rows ? needs(people()).filter(p => !p.soft).length : 0;
    if(n > 0){ b.textContent = n; b.style.display = ''; b.title = n + ' new hire' + (n === 1 ? '' : 's') + ' stuck or not started in orientation'; }
    else b.style.display = 'none';
  }

  const css = () => { if(document.getElementById('orpCss')) return; const s = document.createElement('style'); s.id = 'orpCss';
    s.textContent = '.orp-sum{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 14px}'
      + '.orp-sum div{background:#fff;border:1px solid var(--border);border-radius:12px;padding:10px 14px;min-width:130px}'
      + '.orp-sum b{display:block;font-size:22px;color:var(--navy)}.orp-sum span{font-size:12.5px;color:var(--text-muted)}.orp-sum .hot b{color:#B23B2E}'
      + '.orp-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:6px 16px 4px;margin-bottom:14px}'
      + '.orp-card.hot{border-color:#E9B7B0;background:#FFF9F8}'
      + '.orp-card>h3{margin:10px 0 2px;font-size:16px;color:var(--navy)}.orp-card>p{margin:0 0 6px;font-size:13px;color:var(--text-muted)}'
      + '.orp-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:11px 0;border-top:1px solid #EEF1F5}.orp-row .who{flex:1 1 300px;min-width:0}'
      + '.orp-name{font-weight:700;color:var(--navy);font-size:15px}.orp-line{font-size:13px;color:var(--text);margin-top:2px}.orp-meta{font-size:12.5px;color:var(--text-muted);margin-top:2px}'
      + '.orp-why{font-size:13px;color:#B23B2E;margin-top:3px;font-weight:600}.orp-why.soft{color:#8A5A12}'
      + '.orp-chip{font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap;margin-left:6px;vertical-align:2px}'
      + '.orp-c-in{background:#E8F1FA;color:#2F6FB0}.orp-c-wait{background:#F1F5F9;color:#64748B}.orp-c-done{background:#E7F6EC;color:#1F7A4D}.orp-c-bad{background:#FDE8E8;color:#B23B2E}'
      + '.orp-bar{display:flex;gap:3px;margin-top:6px;max-width:330px}.orp-bar i{flex:1 1 0;height:7px;border-radius:3px;background:#E5E9EF}'
      + '.orp-bar i.d{background:#3C9D6A}.orp-bar i.c{background:#2F6FB0}.orp-bar i.s{background:#C2493B}'
      + '.orp-row .acts{display:flex;gap:6px;flex-wrap:wrap}.orp-row .acts a,.orp-row .acts button{padding:6px 12px;font-size:12.5px}'
      + '.orp-empty{padding:12px 0;font-size:13.5px;color:var(--text-muted);border-top:1px solid #EEF1F5}'
      + '.orp-foot{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:12.5px;color:var(--text-muted);margin:4px 0 10px}.orp-foot input{width:4.5rem}'
      + '.orp-err{background:#FDE8E8;color:#8B2A20;border-radius:10px;padding:10px 12px;margin:0 0 12px;font-size:13px}';
    document.head.appendChild(s); };

  function hubName(r){
    const name = String(r.name || '').trim() || 'Name not on file';
    try{
      const c = r.axiscare_id && typeof caregivers !== 'undefined' ? caregivers.find(x => String(x.axiscare_id || '') === String(r.axiscare_id)) : null;
      if(c && typeof personName === 'function') return personName({ caregiver_id:c.id }, name, '', 'checks', 'checks');
    }catch(e){}
    return esc(name);
  }
  function bar(p){
    const byNum = {}; (p.r.units || []).forEach(u => { byNum[u.module] = u; });
    return '<div class="orp-bar" aria-hidden="true">' + UNITS.map(([n]) => {
      const u = byNum[n]; const cls = u && u.complete ? 'd' : (p.cur && p.cur[0] === n && p.state === 'inprogress') ? (p.alert ? 's' : 'c') : '';
      return '<i class="' + cls + '"></i>'; }).join('') + '</div>';
  }
  function row(p){
    const r = p.r;
    const chip = p.state === 'done' ? '<span class="orp-chip orp-c-done">Finished</span>'
      : p.alert ? '<span class="orp-chip orp-c-bad">' + (p.state === 'notstarted' ? 'Not started' : 'Stuck') + '</span>'
      : p.state === 'inprogress' ? '<span class="orp-chip orp-c-in">In orientation</span>' : '<span class="orp-chip orp-c-wait">Invited</span>';
    let line = '';
    if(p.state === 'done') line = 'Finished ' + esc(when(r.completed_at)) + (r.attested_at ? ' · signed off ' + esc(day(r.attested_at)) : r.signoff_note_at ? ' · office note on the sign-off' : '');
    else if(p.state === 'inprogress' && p.cur) line = 'Unit ' + p.cur[0] + ' of ' + UNITS.length + ': ' + esc(p.cur[1]) + (p.curU ? ', screen ' + (Number(p.curU.scene || 0) + 1) + ' of ' + p.cur[2] : '') + ' · ' + p.done + ' unit' + (p.done === 1 ? '' : 's') + ' done';
    else if(p.state === 'inprogress') line = 'All units heard; finishing up';
    else line = 'Has not opened orientation yet';
    const meta = [
      p.invited ? (r.welcome_sent_at ? 'Invited ' : 'Assigned ') + esc(when(new Date(p.invited).toISOString())) : '',
      r.nudged_at ? 'reminder ' + esc(day(r.nudged_at)) : '',
      p.state === 'inprogress' && (p.moved || p.seen) ? 'last new screen ' + esc(when(new Date(p.moved || p.seen).toISOString())) : '',
      r.status_label ? 'AxisCare: ' + esc(r.status_label) : ''
    ].filter(Boolean).join(' · ');
    const call = r.phone && typeof ocAttrs === 'function' ? '<a class="ibtn" ' + ocAttrs(r.phone, { email:r.email }) + '>Call</a>' : '';
    return '<div class="orp-row"><div class="who"><div class="orp-name">' + hubName(r) + chip + '</div>'
      + '<div class="orp-line">' + line + '</div>' + (p.state !== 'notstarted' && p.state !== 'done' ? bar(p) : '')
      + (p.alert ? '<div class="orp-why' + (p.soft ? ' soft' : '') + '">' + esc(p.alert) + '</div>' : '')
      + '<div class="orp-meta">' + meta + '</div></div>'
      + '<div class="acts">' + call + '<a class="ibtn" href="https://training.mo-care.com/#/admin" target="_blank" rel="noopener">Training Platform</a></div></div>';
  }
  function card(title, note, list, hot, empty){
    return '<div class="orp-card' + (hot && list.length ? ' hot' : '') + '"><h3>' + title + (list.length ? ' (' + list.length + ')' : '') + '</h3>'
      + (note ? '<p>' + note + '</p>' : '') + (list.length ? list.map(row).join('') : '<div class="orp-empty">' + empty + '</div>') + '</div>';
  }
  function draw(){
    const m = el(); if(!m) return; css();
    if(!ST.rows && ST.busy){ m.innerHTML = '<div class="field-note">Reading orientation from the Training Platform…</div>'; return; }
    const list = people();
    const sortT = (a, b) => (b.moved || b.seen || b.invited) - (a.moved || a.seen || a.invited);
    const need = needs(list).sort((a, b) => (a.soft - b.soft) || sortT(a, b));
    const inp = list.filter(p => p.state === 'inprogress' && !p.alert).sort(sortT);
    const wait = list.filter(p => p.state === 'notstarted' && !p.alert).sort((a, b) => b.invited - a.invited);
    const done = list.filter(p => p.state === 'done' && !p.alert).sort((a, b) => ts(b.r.completed_at) - ts(a.r.completed_at));
    const nd = stuckDays();
    const canSet = typeof ccCan === 'function' && ccCan('manage_settings');
    m.innerHTML = (ST.err ? '<div class="orp-err">Could not read orientation: ' + esc(ST.err) + (ST.rows ? ' The list below is from ' + esc(when(new Date(ST.at).toISOString())) + '.' : '') + '</div>' : '')
      + '<div class="orp-sum">'
      + '<div class="' + (need.filter(p => !p.soft).length ? 'hot' : '') + '"><b>' + need.length + '</b><span>Need you</span></div>'
      + '<div><b>' + (inp.length + need.filter(p => p.state === 'inprogress').length) + '</b><span>In orientation</span></div>'
      + '<div><b>' + (wait.length + need.filter(p => p.state === 'notstarted').length) + '</b><span>Invited, not started</span></div>'
      + '<div><b>' + list.filter(p => p.state === 'done').length + '</b><span>Finished, last 60 days</span></div></div>'
      + card('Needs you', 'Stuck means no new screen for ' + nd + ' day' + (nd === 1 ? '' : 's') + '. A call usually sorts it out: a screen that will not move on, a sound that will not play, or a lost link.', need, true, 'Nobody is stuck. Everyone in orientation is moving.')
      + card('In orientation', '', inp, false, 'Nobody is part way through right now.')
      + card('Invited, not started yet', '', wait, false, 'Everyone invited has started.')
      + card('Finished in the last 60 days', '', done, false, 'Nobody has finished in the last 60 days.')
      + '<div class="orp-foot"><span>From the Training Platform' + (ST.at ? ', read ' + esc(when(new Date(ST.at).toISOString())) : '') + '.</span>'
      + '<button class="secondary" onclick="OPR.load()"' + (ST.busy ? ' disabled' : '') + '>' + (ST.busy ? 'Reading…' : 'Refresh') + '</button>'
      + (canSet ? '<label for="orpDays">Stuck after</label><input id="orpDays" type="number" min="1" max="30" step="1" value="' + nd + '"><span>days</span><button class="secondary" onclick="OPR.saveDays(this)">Save</button><span id="orpDaysSaved"></span>' : '')
      + '</div>';
  }
  async function saveDays(btn){
    const sv = document.getElementById('orpDaysSaved');
    const n = Math.round(Number((document.getElementById('orpDays') || {}).value));
    if(!(n >= 1 && n <= 30)){ if(sv) sv.textContent = 'A whole number of days, 1 to 30.'; return; }
    if(typeof tkMerge !== 'function'){ if(sv) sv.textContent = 'Could not save on this page.'; return; }
    if(btn) btn.disabled = true;
    const out = await tkMerge(m => { m.orient_stuck_days = n; return ['Orientation stuck after ' + n + ' days']; }, 'Orientation stuck days');
    if(btn) btn.disabled = false;
    if(out.error){ if(sv) sv.textContent = 'Could not save: ' + out.error.message; return; }
    try{ if(DATA && DATA.ops_settings) DATA.ops_settings.orient_stuck_days = n; }catch(e){}
    badge(); draw();
    const s2 = document.getElementById('orpDaysSaved'); if(s2) s2.textContent = 'Saved.';
  }
  function mount(){ draw(); if(!ST.busy && (!ST.rows || Date.now() - ST.at > 60e3)) load(); }
  /* the pill count: once after sign-in, then every 30 minutes while the page is open */
  let timer = null;
  function watch(){ if(timer) return; load(); timer = setInterval(() => { if(document.visibilityState === 'visible') load(); }, 30 * 60e3); }
  window.OPR = { mount, load, saveDays, watch, _read:read, _units:UNITS, _st:ST };
})();
