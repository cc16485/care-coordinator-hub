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
   Each person also shows (2026-11-01, her second ask: "every reminder with its date (log the Send reminder button too), and an
   after-finishing line per person"): the due date (7 days after the invite, Training orientation-messages.sql), every invite and
   reminder the Training Platform sent with who sent it, and after finishing: the certificate email, Active in AxisCare, Approve
   to Work, the finished-orientation text and the check-in call (new-path cards from caregiver-journey ?orientation_after; the
   older way from the Training record).
   Linked with Onboarding (2026-11-02, her ask: "link the two tabs: show where they are in orientation on the Onboarding rows, add
   the badge to the Orientation tab, and add a link between them"): Onboarding keeps every to-do (badge Mailed, check-in call,
   approval); this page only shows them. A Training person is matched to the Hub by AxisCare number, else by a name only one
   person has (rowFor). OPR.brief draws the Onboarding row's orientation line, OPR.show jumps here, OPR.toOnboarding jumps back.
   Sub-tabs, one search, the certificate (2026-11-02, her ask: "subtabs for the finished because that could be hundreds! Also
   the PDF orientation certificate there and make it searchable, think like a care coordinator and staffing coordinator moving
   applicants through as fast as possible"): the five counts are the tabs (Needs you, Finish line, In orientation, Invited, not
   started, Finished); the page opens on the first one with work in it. One search box looks through every tab (name, phone,
   email, AxisCare number). Finished is everyone who ever finished (hub-training-data ?action=orientation_finished), one line
   each, 25 at a time, with a time filter and "Only with a problem"; a name opens its full history. The PDF button opens the
   certificate the Training Platform saved (?action=certificate_link, a 10-minute private link). The Finish line lists what
   Approve to Work still needs as short items and how long they have waited since finishing. A current caregiver redoing
   orientation is tagged Already working, so new hires come first.
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
  const ST = { rows:null, err:'', busy:false, at:0, after:null, afterErr:'', focus:'', meta:{},
    tab:'', q:'', fin:null, finErr:'', win:'90', prob:false, show:25, open:{} };
  const PAGE = 25;
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
      const a = afterFor(r);
      if(a && a.text && a.text.state === 'failed'){ p.alert = 'The "you finished your orientation" text did not go: ' + (a.text.why || 'no reason given') + '. Call them, or text them from the office line.'; p.soft = true; }
      else if(a && a.active && a.active.state === 'failed'){ p.alert = 'Not switched to Active in AxisCare: ' + (a.active.why || 'AxisCare refused it') + '. Set it in AxisCare by hand.'; p.soft = true; }
      else if(!r.attested_at && !r.signoff_note_at){ p.alert = 'Finished, but never signed off (typing their name to confirm they did it themselves). Send the sign-off reminder from the Training Platform.'; p.soft = true; }
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
  function afterFor(r){ const ax = String(r.axiscare_id || '').replace(/\D/g, ''); return ax && ST.after ? (ST.after[ax] || null) : null; }
  function people(){ return (ST.rows || []).map(read); }

  /* ── the same person in both tabs: the AxisCare number first, else a name only one person has ── */
  const digits = v => String(v == null ? '' : v).replace(/\D/g, '');
  const nkey = v => String(v || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  function matchIn(list, ax, name, axOf, nameOf){
    const a = digits(ax);
    if(a){ const hit = list.find(x => digits(axOf(x)) === a); if(hit) return hit; }
    const k = nkey(name); if(!k) return null;
    const same = list.filter(x => nkey(nameOf(x)) === k);
    return same.length === 1 ? same[0] : null;
  }
  function rowFor(ax, name){ return matchIn(ST.rows || [], ax, name, r => r.axiscare_id, r => r.name); }
  /* the Hub caregiver list (caregivers-engine.js shares it as ckdRoster once a caregiver tab has loaded it) */
  function roster(){
    try{ const g = typeof ckdRoster === 'function' ? ckdRoster() : typeof caregivers !== 'undefined' ? caregivers : null; return Array.isArray(g) ? g : null; }catch(e){ return null; }
  }
  /* the Hub caregiver list record (where the badge is kept) */
  function rosterFor(r){
    try{ return roster() ? matchIn(roster(), r.axiscare_id, r.name, g => g.axiscare_id, g => ((g.first || '') + ' ' + (g.last || ''))) : null; }catch(e){ return null; }
  }
  /* the Onboarding list person for a Training row (Onboarding's own list, once that part of the Hub is loaded) */
  function onboardingFor(r){
    try{
      if(!ST.onb) ST.onb = typeof ckdOrientWho === 'function' ? ckdOrientWho() : [];
      return matchIn(ST.onb, r.axiscare_id, r.name, x => x.ax, x => x.name);
    }catch(e){ return null; }
  }
  function needs(list){ return list.filter(p => p.alert); }

  /* the Onboarding row's orientation line: { text, bad, id } or null (not matched, or not read yet: the first ask reads, then
     Onboarding draws again) */
  function brief(ax, name){
    if(!ST.rows){ if(!ST.busy && !ST.at) load(); return null; }
    const r = rowFor(ax, name); if(!r) return null;
    const p = read(r), id = String(r.training_id || '');
    if(p.state === 'done') return { text:'Finished orientation ' + day(r.completed_at), bad:false, id };
    if(p.state === 'notstarted') return { text:p.alert ? 'Has not opened orientation (invited ' + ago(p.invited) + ')' : 'Orientation not opened yet', bad:!!p.alert, id };
    if(p.alert && !p.soft) return { text:'Stuck in orientation on Unit ' + (p.cur ? p.cur[0] : UNITS.length) + ' of ' + UNITS.length, bad:true, id };
    return { text:p.cur ? 'Orientation: Unit ' + p.cur[0] + ' of ' + UNITS.length : 'Orientation: finishing up', bad:false, id };
  }
  function show(id){ ST.focus = String(id || ''); if(folded() && typeof window.obtOpenQueue === 'function'){ if(ST.focus) ST.open[ST.focus] = true; window.obtOpenQueue('orient'); return; } if(typeof switchTab === 'function') switchTab('orientprog'); }
  function toOnboarding(name){ window.CKD_FIND = String(name || ''); if(folded() && typeof window.obtOpenQueue === 'function'){ window.obtOpenQueue('all'); return; } if(typeof switchTab === 'function') switchTab('cgbackground'); }
  function badgeBit(r){
    const g = rosterFor(r); if(!g) return '';
    if(g.badge_mailed_at) return 'Badge mailed ' + esc(day(g.badge_mailed_at));
    if(g.badge_not_needed) return 'No badge needed';
    return onboardingFor(r) ? '<span class="orp-wait">Badge not mailed yet</span>' : '';
  }

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
  /* everyone who ever finished orientation, one light row each (the Finished tab); read when the tab is opened, not for the pill */
  async function fetchFin(){
    if(typeof trainHubTok !== 'function') return { error:'The Hub sign-in is not loaded on this page.' };
    try{
      const r = await fetch(FN + '?action=orientation_finished', { method:'POST',
        headers:{ 'x-hub-token':await trainHubTok(), 'apikey':ANON, 'Authorization':'Bearer ' + ANON, 'Content-Type':'application/json' }, body:'{}' });
      const data = await r.json().catch(() => null);
      if(!Array.isArray(data)) return { error:(data && data.error) || ('The Training Platform answered ' + r.status + '.') };
      return { rows:data.map(x => Object.assign({}, x, { status:'complete', units:[] })) };
    }catch(e){ return { error:'Could not reach the Training Platform.' }; }
  }
  /* the Hub's readiness cards (new onboarding path): Active, Approve to Work, the finished text, the check-in call */
  async function fetchAfter(){
    try{
      if(typeof sb === 'undefined' || !sb || !sb.functions) return { error:'The Hub sign-in is not loaded on this page.' };
      const { data, error } = await sb.functions.invoke('caregiver-journey', { body:{ action:'orientation_after' } });
      if(error || !data || !data.ok){ let m = (data && data.error) || (error && error.message) || 'no answer'; try{ const j = await error.context.json(); if(j && j.error) m = j.error; }catch(e){} return { error:m }; }
      const by = {}; (data.rows || []).forEach(x => { if(x.axiscare_id && !by[x.axiscare_id]) by[x.axiscare_id] = x; });
      return { by, meta:{ may:!!data.may_approve_work, ticks:data.ticks || null, switches:data.switches || {} } };
    }catch(e){ return { error:'Could not reach the Hub server.' }; }
  }
  async function load(withFin){
    if(ST.busy) return; ST.busy = true; draw();
    withFin = withFin || ST.fin !== null;
    const [out, aft, fo] = await Promise.all([fetchRows(), fetchAfter(), withFin ? fetchFin() : null]);
    ST.busy = false; ST.at = Date.now();
    if(fo){ if(fo.error) ST.finErr = fo.error; else { ST.finErr = ''; ST.fin = fo.rows; } }
    if(aft.error){ ST.afterErr = aft.error; ST.after = null; ST.meta = {}; } else { ST.afterErr = ''; ST.after = aft.by; ST.meta = aft.meta || {}; }
    if(out.error) ST.err = out.error; else { ST.err = ''; ST.rows = out.rows; }
    badge(); draw();
    try{ if(typeof activeTab !== 'undefined' && activeTab === 'cgbackground' && typeof renderCkd === 'function') renderCkd(); }catch(e){}
  }
  function badge(){
    const n = ST.rows ? needs(people()).filter(p => !p.soft).length : 0, f = folded();
    const set = (b, on) => { if(!b) return; if(on && n > 0){ b.textContent = n; b.style.display = ''; b.title = n + ' new hire' + (n === 1 ? '' : 's') + ' stuck or not started in orientation'; } else b.style.display = 'none'; };
    set(document.getElementById('orpPillBadge'), !f);
    set(document.getElementById('orpOnbBadge'), f);
    const pill = document.querySelector('.fpill[data-tab="orientprog"]'); if(pill) pill.style.display = f ? 'none' : '';
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
      + '.orp-err{background:#FDE8E8;color:#8B2A20;border-radius:10px;padding:10px 12px;margin:0 0 12px;font-size:13px}'
      + '.orp-msgs,.orp-after{font-size:12.5px;color:var(--text);margin-top:4px;line-height:1.55}.orp-msgs b,.orp-after b{color:var(--navy);font-weight:700}'
      + '.orp-row.orp-focus{background:#FFF8E6;box-shadow:0 0 0 2px #F0A63A;border-radius:10px;padding-left:10px;padding-right:10px}'
      + '.orp-fin .who{flex:1 1 100%}.orp-steps{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}'
      + '.orp-step{flex:1 1 230px;display:flex;gap:10px;border:1px solid var(--border);border-radius:10px;padding:10px 12px;background:#FAFBFC}.orp-step.now{border-color:var(--navy);background:#fff}.orp-step.done{border-color:#B7E1C6;background:#F3FBF6}'
      + '.orp-num{flex:0 0 26px;height:26px;border-radius:50%;color:#fff;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center}.orp-sb{flex:1;min-width:0}.orp-st{font-weight:700;color:var(--navy);font-size:14px}'
      + '.orp-tick{display:flex!important;flex-direction:row;gap:6px;align-items:center;font-size:13px;font-weight:400;padding:3px 0;margin:0;cursor:pointer;flex-wrap:wrap;color:var(--text)}.orp-tick label{display:inline-flex!important;gap:4px;align-items:center;margin:0;font-weight:400}.orp-tick input{width:auto!important;height:auto;margin:0!important;flex:0 0 auto;display:inline-block}.orp-go{background:#1F7A4D;color:#fff;border:0;border-radius:8px;font-weight:800;padding:8px 14px;margin-top:6px;cursor:pointer}.orp-go:disabled{opacity:.6}'
      + '.orp-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.orp-tab{background:#fff;border:1px solid var(--border);border-radius:12px;padding:8px 14px;min-width:120px;text-align:left;cursor:pointer;font:inherit}'
      + '.orp-tab b{display:block;font-size:20px;color:var(--navy)}.orp-tab span{font-size:12.5px;color:var(--text-muted)}.orp-tab.hot b{color:#B23B2E}.orp-tab.on{border:2px solid var(--navy);background:#F4F7FB;padding:7px 13px}'
      + '.orp-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 12px}.orp-tools input[type=search]{flex:1 1 280px;min-width:0;margin:0}.orp-tools select{width:auto;margin:0}.orp-tools label{display:inline-flex;gap:6px;align-items:center;font-size:13px;margin:0;font-weight:400}.orp-tools label input{width:auto;margin:0}'
      + '.orp-frow{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,.7fr) minmax(0,1.6fr) auto;gap:12px;align-items:center;padding:9px 0;border-top:1px solid #EEF1F5;font-size:13px}'
      + '.orp-frow.hd{font-size:12px;color:var(--text-muted);font-weight:700;padding:4px 0}.orp-frow .acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.orp-frow .acts a,.orp-frow .acts button{padding:5px 10px;font-size:12.5px}'
      + '.orp-nm{font-weight:700;color:var(--navy);font-size:14px}.orp-hist{background:none;border:0;padding:0 0 0 8px;font:inherit;font-size:12px;color:#2F6FB0;cursor:pointer}.orp-hist:hover{text-decoration:underline}'
      + '.orp-more{padding:4px 0 10px 0;border-top:0}.orp-detail{grid-column:1/-1;background:#FAFBFC;border-radius:10px;padding:8px 12px}'
      + '.orp-miss{display:flex;gap:5px;flex-wrap:wrap;margin:5px 0 2px}.orp-miss span{font-size:12px;background:#FDE8E8;color:#8B2A20;border-radius:8px;padding:2px 8px}'
      + '.orp-where{font-size:11px;font-weight:700;color:#64748B;background:#F1F5F9;border-radius:8px;padding:2px 7px;margin-left:6px;vertical-align:2px}'
      + '@media (max-width:720px){.orp-frow{grid-template-columns:minmax(0,1fr) auto}.orp-frow.hd{display:none}.orp-frow>.fd,.orp-frow>.fa{grid-column:1/-1}}'
      + '.orp-otw{background:#fff;border:1px solid var(--border);border-radius:12px;overflow-x:auto}.orp-ot{border-collapse:collapse;width:100%;font-size:12.5px}'
      + '.orp-ot th,.orp-ot td{padding:7px 8px;border-bottom:1px solid #EEF1F5;text-align:left;vertical-align:middle;white-space:nowrap}.orp-ot th{background:#f6f5f0;font-size:11.5px;color:#55677a;font-weight:700}'
      + '.orp-ot .orp-wrapc{white-space:normal;min-width:180px}.orp-og td{background:#f6f5f0;font-weight:800;font-size:12px;color:var(--navy)}.orp-og.hot td{color:#B23B2E}'
      + '.orp-ox td{background:#FAFBFC;white-space:normal}.orp-ox .orp-row{border-top:0}.orp-oa{display:flex;gap:6px}.orp-oa a,.orp-oa button{padding:4px 10px;font-size:12px}'
      + '.orp-ub{display:inline-block;width:56px;height:6px;border-radius:3px;background:#E5E9EF;margin-right:6px;vertical-align:middle;overflow:hidden}.orp-ub i{display:block;height:100%;background:#3C9D6A}'
      + '@media (max-width:760px){.orp-ot thead{display:none}.orp-ot tr{display:block;border-bottom:1px solid #EEF1F5;padding:6px 4px}.orp-ot td{display:inline-block;border:0;padding:2px 6px;white-space:normal}.orp-ot .orp-on{display:block}.orp-oa{display:flex}}'
      + '.orp-late{color:#B23B2E;font-weight:700}.orp-ok{color:#1F7A4D}.orp-wait{color:#8A5A12}.orp-no{color:#B23B2E}';
    document.head.appendChild(s); };

  /* the name opens their profile (2026-11-02, her ask: "click at any time on any name and get to the applicant's profile"):
     the caregiver list first, then their Onboarding row, then their offer (one offer with that name only) */
  function hubName(r){
    const name = String(r.name || '').trim() || 'Name not on file';
    try{
      const c = r.axiscare_id && roster() ? roster().find(x => String(x.axiscare_id || '') === String(r.axiscare_id)) : null;
      if(c && typeof personName === 'function') return personName({ caregiver_id:c.id }, esc(name), '', 'checks', 'checks');
      const o = onboardingFor(r), offs = window.SCX && typeof SCX.getOffers === 'function' && Array.isArray(SCX.getOffers()) ? SCX.getOffers() : [];
      const key = o && o.key ? o.key : (() => { const f = matchIn(offs, r.axiscare_id, r.name, x => x.axiscare_id, x => x.name); return f && f.id ? { offer_id:String(f.id) } : null; })();
      if(key && window.HP) return '<span class="name-cell" role="link" tabindex="0" style="cursor:pointer;color:var(--navy)" title="Open their profile" onclick="HP.open(' + esc(JSON.stringify(key)) + ')" onkeydown="if(event.key===\'Enter\')this.click()">' + esc(name) + ' <span style="font-size:.65rem;color:var(--teal)">↗</span></span>';
    }catch(e){}
    return '<span title="Not found in the Hub (no caregiver, Onboarding row or offer with this name)">' + esc(name) + '</span>';
  }
  function bar(p){
    const byNum = {}; (p.r.units || []).forEach(u => { byNum[u.module] = u; });
    return '<div class="orp-bar" aria-hidden="true">' + UNITS.map(([n]) => {
      const u = byNum[n]; const cls = u && u.complete ? 'd' : (p.cur && p.cur[0] === n && p.state === 'inprogress') ? (p.alert ? 's' : 'c') : '';
      return '<i class="' + cls + '"></i>'; }).join('') + '</div>';
  }
  /* who sent it: an office email becomes the person's name */
  function sender(by){
    if(!by) return '';
    if(!/@/.test(by)) return by;
    try{ const s = ((typeof DATA !== 'undefined' && DATA && DATA.coordinator_staff) || []).find(x => String(x.email || '').toLowerCase() === String(by).toLowerCase());
      if(s && s.name) return String(s.name).split(' ')[0]; }catch(e){}
    return String(by).split('@')[0];
  }
  const ch = list => !list ? '' : list.length === 2 ? 'text and email' : list.join(' and ');
  /* every invite and reminder, oldest first: "Oct 30 automatic, text and email · Nov 2 by Krystal, text" */
  function msgsLine(r){
    const ms = (r.messages || []).filter(m => m.kind !== 'certificate');
    if(!ms.length) return r.nudged_at ? '<div class="orp-msgs"><b>Reminders:</b> ' + esc(day(r.nudged_at)) + ' automatic</div>' : '';
    const word = { invite:'Invite', reminder:'Reminder', signoff_reminder:'Sign-off reminder' };
    return '<div class="orp-msgs"><b>Sent:</b> ' + ms.map(m => {
      const who = m.how === 'automatic' ? 'automatic' : m.by ? 'by ' + sender(m.by) : 'by the office';
      const how = ch(m.channels);
      const miss = (m.not_sent || []).length ? ' <span class="orp-wait">(' + esc(m.not_sent.join('; ')) + ')</span>' : '';
      return esc(word[m.kind] || m.kind) + ' ' + esc(day(m.at)) + ', ' + esc(who) + (how ? ', ' + esc(how) : '') + miss;
    }).join(' · ') + '</div>';
  }
  /* after finishing: certificate email, Active in AxisCare, Approve to Work, the finished text, the check-in call */
  function afterLine(p){
    const r = p.r, a = afterFor(r), out = [];
    const cert = (r.messages || []).filter(m => m.kind === 'certificate').pop();
    if(cert) out.push((cert.channels || []).length ? '<span class="orp-ok">Certificate emailed ' + esc(day(cert.at)) + '</span>' : '<span class="orp-no">Certificate not emailed (' + esc((cert.not_sent || []).join('; ') || 'no reason given') + ')</span>');
    else if(r.certificate_at) out.push('<span class="orp-ok">Certificate saved ' + esc(day(r.certificate_at)) + '</span>');
    if(a && a.active && a.active.state === 'confirmed') out.push('<span class="orp-ok">Active in AxisCare ' + esc(day(a.active.at)) + '</span>');
    else if(a && a.active && a.active.state === 'failed') out.push('<span class="orp-no">Not Active in AxisCare (it refused)</span>');
    else if(r.axiscare_active_at) out.push('<span class="orp-ok">Active in AxisCare ' + esc(day(r.axiscare_active_at)) + '</span>');
    else if(r.status_label === 'Active') out.push('<span class="orp-ok">Active in AxisCare</span>');
    else out.push('<span class="orp-wait">Not Active in AxisCare yet</span>');
    if(a){
      out.push(a.approved ? '<span class="orp-ok">Approved to Work ' + esc(day(a.approved.at)) + '</span>' : '<span class="orp-wait">Approve to Work not done yet</span>');
      const t = a.text;
      if(t && t.state === 'sent') out.push('<span class="orp-ok">"You finished your orientation" text sent ' + esc(day(t.at)) + '</span>');
      else if(t && t.state === 'due') out.push('<span class="orp-wait">"You finished your orientation" text waiting for texting hours (8am to 6pm)</span>');
      else if(t && t.state === 'practice') out.push('<span class="orp-wait">"You finished your orientation" text recorded only (its switch was off)</span>');
      else if(t && t.state === 'failed') out.push('<span class="orp-no">"You finished your orientation" text not sent</span>');
      else out.push('<span class="orp-wait">"You finished your orientation" text goes at Approve to Work</span>');
      const c = a.checkin;
      if(c && c.done) out.push('<span class="orp-ok">Check-in call done ' + esc(day(c.at)) + '</span>');
      else if(c) out.push('<span class="orp-wait">Check-in call waiting' + (c.opened_at ? ' since ' + esc(day(c.opened_at)) : '') + '</span>');
    } else if(ST.afterErr) out.push('<span class="orp-no">Readiness card not read (see the note at the top)</span>');
    else if(r.cleared_notified_at) out.push('<span class="orp-ok">"Cleared to work" text sent ' + esc(day(r.cleared_notified_at)) + '</span>');
    /* no readiness card (the older way): nothing to do, so nothing is said (Samantha 2026-11-02: it was on every finished row) */
    return '<div class="orp-after"><b>After finishing:</b> ' + out.join(' · ') + '</div>';
  }

  /* ── THE FINISH LINE (Samantha 2026-11-02: "Approve to Work button, then the check-in call with a profile tick, then Ready for
     shifts"). Everyone who finished orientation and has a readiness card, until all three are done: (1) Approve to Work, the
     green button for the Approve to Work list (it sets them Active in AxisCare, reads it back and sends the app guide text);
     (2) the check-in call from the Staffing Coordinator, its four ticks and the test clock-in right here; (3) Ready for shifts,
     green once shift texts are no longer held. The buttons use the same server steps as the readiness card, which refuses
     anything the person may not do. The older way (no readiness card) stays in the Finished list. ── */
  function finishState(a){
    const sw = ST.meta.switches || {};
    const approved = !!a.approved, active = !!(a.active && a.active.state === 'confirmed'), c = a.checkin;
    const callDone = !!(c && c.done) || (approved && active && !c && sw.checkin_live === false);
    return { approved, active, callDone, ready: approved && active && callDone };
  }
  function inFinish(p){
    if(p.state !== 'done') return false;
    const a = afterFor(p.r); if(!a || !a.journey_id) return false;
    if(a.card === 'closed' && !a.approved) return false;   /* taken off onboarding */
    return !finishState(a).ready;
  }
  const TICKS = { on_file:'Everything on file and complete', questions:'Questions about orientation and the job answered', app:'AxisCare app downloaded and they can sign in', profile:'Profile complete' };
  function step(n, title, state, body){
    const col = state === 'done' ? '#1F7A4D' : state === 'now' ? 'var(--navy)' : '#94A3B8';
    return '<div class="orp-step ' + state + '"><div class="orp-num" style="background:' + col + '">' + (state === 'done' ? '✓' : n) + '</div>'
      + '<div class="orp-sb"><div class="orp-st">' + title + '</div>' + body + '</div></div>';
  }
  function finishRow(p){
    const r = p.r, a = afterFor(r), f = finishState(a), sw = ST.meta.switches || {}, jid = esc(a.journey_id), oid = esc(a.offer_id || '');
    /* 1. Approve to Work */
    let s1;
    if(f.approved){
      s1 = '<div class="orp-meta">Approved ' + esc(when(a.approved.at)) + (a.approved.by ? ' by ' + esc(a.approved.by) : '') + '</div>';
      if(a.active && a.active.state === 'failed') s1 += '<div class="orp-why">AxisCare refused Active: ' + esc(a.active.why || 'no reason given') + '</div><button class="ibtn" onclick="OPR.retry(\'' + jid + '\',this)">Retry AxisCare</button>';
      else if(!f.active) s1 += '<div class="orp-meta orp-wait">Waiting for AxisCare to read back Active</div>';
    } else if(a.ready && a.ready.ready_for_final){
      s1 = ST.meta.may
        ? '<div class="orp-meta">Every requirement is complete. This records your name and the time, sets them Active in AxisCare, reads it back, then texts them the AxisCare app guide.</div><button class="orp-go" onclick="OPR.approve(\'' + oid + '\',this)">✓ Approve to Work</button>'
        : '<div class="orp-meta">Every requirement is complete. Waiting for a person on the Approve to Work list.</div>';
    } else {
      const miss = (a.ready && a.ready.missing) || [];
      s1 = miss.length ? '<div class="orp-meta">Not ready yet. Still needs (' + miss.length + '):</div><div class="orp-miss">' + miss.map(x => '<span>' + esc(short(x)) + '</span>').join('') + '</div>'
        : '<div class="orp-meta">Not ready yet' + (a.ready && a.ready.error ? ' (the card could not be checked: ' + esc(a.ready.error) + ')' : '') + '.</div>';
    }
    s1 += oid && window.CRX ? ' <button class="ibtn" onclick="CRX.open(\'' + oid + '\')">Readiness card</button>' : '';
    /* 2. the check-in call */
    let s2; const c = a.checkin;
    if(!f.approved) s2 = '<div class="orp-meta">After Approve to Work. Call them to answer questions, make sure the AxisCare app is downloaded and they can sign in, and that their profile is complete.</div>';
    else if(c && c.done) s2 = '<div class="orp-meta">Done ' + esc(when(c.at)) + '</div>';
    else if(!c) s2 = '<div class="orp-meta">' + (sw.checkin_live === false ? 'The "Check-in call after orientation" switch is off, so no call is held for them. Shift texts are not waiting on it.' : 'Opens once AxisCare reads back Active.') + '</div>';
    else {
      const names = ST.meta.ticks || TICKS, tk = c.ticks || {};
      s2 = '<div class="orp-meta">Answer their questions, make sure the AxisCare app is downloaded and they can sign in, and that their profile is complete.' + (c.tries ? ' Tried ' + c.tries + ' time' + (c.tries === 1 ? '' : 's') + ' with no answer.' : '') + '</div>'
        + Object.keys(names).map(k => '<label class="orp-tick"><input type="checkbox" ' + (tk[k] ? 'checked ' : '') + 'onchange="OPR.tick(\'' + jid + '\',\'' + esc(k) + '\',this)"> ' + esc(names[k]) + '</label>').join('')
        + '<div class="orp-tick">Test clock-in on "Practice": <label><input type="radio" name="orpTc' + jid + '" ' + (c.test_clock === 'done' ? 'checked ' : '') + 'onchange="OPR.clock(\'' + jid + '\',\'done\',this)"> done</label> <label><input type="radio" name="orpTc' + jid + '" ' + (c.test_clock === 'declined' ? 'checked ' : '') + 'onchange="OPR.clock(\'' + jid + '\',\'declined\',this)"> no thanks</label></div>'
        + '<div class="acts" style="margin-top:6px">' + (r.phone && typeof ocAttrs === 'function' ? '<a class="ibtn" ' + ocAttrs(r.phone, { email:r.email }) + '>Call</a>' : '')
        + '<button class="orp-go" onclick="OPR.callDone(\'' + jid + '\',this)">✓ Call done</button><button class="ibtn" onclick="OPR.noAnswer(\'' + jid + '\',this)">No answer</button></div>';
    }
    /* 3. Ready for shifts */
    const s3 = '<div class="orp-meta">' + (f.ready ? 'Shift texts can go to them.' : 'Shift texts wait until the steps above are done.') + '</div>';
    const wait = Math.floor((Date.now() - ts(r.completed_at)) / DAY), fid = String(r.training_id || '');
    return '<div class="orp-row orp-fin' + (fid && fid === ST.focus ? ' orp-focus' : '') + '"' + (fid ? ' id="orp-p-' + esc(fid) + '"' : '') + '><div class="who"><div class="orp-name">' + hubName(r) + '<span class="orp-chip orp-c-in">Finish line</span></div>'
      + '<div class="orp-line">Finished orientation ' + esc(when(r.completed_at)) + (wait >= 1 ? ' · <span class="' + (wait > stuckDays() ? 'orp-late' : '') + '">waiting ' + wait + ' day' + (wait === 1 ? '' : 's') + '</span>' : '') + '</div>'
      + '<div class="acts" style="margin-top:6px">' + certBtn(r) + toOnbBtn(r) + '</div>'
      + (p.alert ? '<div class="orp-why soft">' + esc(p.alert) + '</div>' : '')
      + '<div class="orp-steps">' + step(1, 'Approve to Work', f.approved ? 'done' : 'now', s1)
      + step(2, 'Check-in call', f.callDone ? 'done' : f.approved ? 'now' : 'later', s2)
      + step(3, 'Ready for shifts', f.ready ? 'done' : 'later', s3) + '</div></div></div>';
  }
  /* the buttons: the same caregiver-journey steps as the readiness card; a refusal is shown, never hidden */
  async function cj(body, btn, label){
    if(btn){ btn.disabled = true; if(label) btn.textContent = 'Saving…'; }
    try{ await window.CRX.call(body); }
    catch(e){ alert('Not saved: ' + (e.message || e)); if(btn){ btn.disabled = false; if(label) btn.textContent = label; } return false; }
    await load(); return true;
  }
  async function approve(offerId, btn){
    if(!window.CRX || !CRX.approveOffer){ alert('The readiness card is not loaded on this page. Refresh the Hub and try again.'); return; }
    if(await CRX.approveOffer(offerId, btn)) await load();
  }
  const retry = (jid, btn) => cj({ action:'retry_axiscare', journey_id:jid }, btn, 'Retry AxisCare');
  async function tick(jid, k, box){ box.disabled = true; if(!(await cj({ action:'checkin', journey_id:jid, ticks:{ [k]: !!box.checked } }))){ box.checked = !box.checked; box.disabled = false; } }
  const clock = (jid, v, box) => cj({ action:'checkin', journey_id:jid, test_clock:v }, box);
  const callDone = (jid, btn) => cj({ action:'checkin', journey_id:jid, finish:true }, btn, '✓ Call done');
  async function noAnswer(jid, btn){
    const note = typeof ccPrompt === 'function' ? await ccPrompt('No answer. A note (optional, for example "left a voicemail"):', '') : '';
    if(note === null) return;
    await cj({ action:'checkin', journey_id:jid, no_answer:true, note:note || '' }, btn, 'No answer');
  }
  function dueBit(r){
    if(!r.due_date || r.status === 'complete') return '';
    const late = String(r.due_date) < new Date().toLocaleDateString('en-CA', { timeZone:'America/Chicago' });
    const d = new Date(String(r.due_date) + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone:'UTC', month:'short', day:'numeric' });
    return late ? '<span class="orp-late">past due ' + esc(d) + '</span>' : 'due ' + esc(d);
  }
  function row(p){
    const r = p.r;
    const chip = p.state === 'done' ? '<span class="orp-chip orp-c-done">Finished</span>'
      : p.alert ? '<span class="orp-chip orp-c-bad">' + (p.state === 'notstarted' ? 'Not started' : 'Stuck') + '</span>'
      : p.state === 'inprogress' ? '<span class="orp-chip orp-c-in">In orientation</span>' : '<span class="orp-chip orp-c-wait">Invited</span>';
    const working = working_(p) ? '<span class="orp-chip orp-c-wait" title="Already Active in AxisCare: a current caregiver redoing orientation, not a new hire">Already working</span>' : '';
    let line = '';
    if(p.state === 'done') line = 'Finished ' + esc(when(r.completed_at)) + (r.attested_at ? ' · signed off ' + esc(day(r.attested_at)) : r.signoff_note_at ? ' · office note on the sign-off' : '');
    else if(p.state === 'inprogress' && p.cur) line = 'Unit ' + p.cur[0] + ' of ' + UNITS.length + ': ' + esc(p.cur[1]) + (p.curU ? ', screen ' + (Number(p.curU.scene || 0) + 1) + ' of ' + p.cur[2] : '') + ' · ' + p.done + ' unit' + (p.done === 1 ? '' : 's') + ' done';
    else if(p.state === 'inprogress') line = 'All units heard; finishing up';
    else line = 'Has not opened orientation yet';
    const meta = [
      p.invited ? (r.welcome_sent_at ? 'Invited ' : 'Assigned ') + esc(when(new Date(p.invited).toISOString())) : '',
      dueBit(r),
      p.state === 'inprogress' && (p.moved || p.seen) ? 'last new screen ' + esc(when(new Date(p.moved || p.seen).toISOString())) : '',
      r.status_label ? 'AxisCare: ' + esc(r.status_label) : '',
      badgeBit(r)
    ].filter(Boolean).join(' · ');
    const call = r.phone && typeof ocAttrs === 'function' ? '<a class="ibtn" ' + ocAttrs(r.phone, { email:r.email }) + '>Call</a>' : '';
    const fid = String(r.training_id || '');
    return '<div class="orp-row' + (fid && fid === ST.focus ? ' orp-focus' : '') + '"' + (fid ? ' id="orp-p-' + esc(fid) + '"' : '') + '><div class="who"><div class="orp-name">' + hubName(r) + chip + working + '</div>'
      + '<div class="orp-line">' + line + '</div>' + (p.state !== 'notstarted' && p.state !== 'done' ? bar(p) : '')
      + (p.alert ? '<div class="orp-why' + (p.soft ? ' soft' : '') + '">' + esc(p.alert) + '</div>' : '')
      + '<div class="orp-meta">' + meta + '</div>' + msgsLine(r) + (p.state !== 'done' && window.HREM ? HREM.lcLine({ training_id:r.training_id }, ['orientation']) : '') + (p.state === 'done' ? afterLine(p) : '') + '</div>'
      + '<div class="acts">' + (p.state !== 'done' && window.HREM ? HREM.orientBtn(r) : '') + (p.state !== 'done' && window.HSHIFT ? HSHIFT.btn({ name:r.name, phone:r.phone }, 'orientation') : '') + call + (p.state === 'done' ? certBtn(r) : '') + toOnbBtn(r) + TP_LINK + '</div></div>';
  }
  const TP_LINK = '<a class="ibtn" href="https://training.mo-care.com/#/admin" target="_blank" rel="noopener">Training Platform</a>';
  /* a current caregiver (Active in AxisCare) redoing orientation, not someone waiting to start */
  const working_ = p => p.state !== 'done' && String(p.r.status_label || '') === 'Active';
  /* "Viventium Step 2: I-9 Section 1 completed by the employee" -> "Viventium Step 2: I-9 Section 1"; readiness wording kept, only trimmed */
  const short = x => String(x || '').replace(/\s*\(.*?\)\s*$/, '').replace(/ completed by the employee$/i, '').replace(/^References cleared: .*/i, 'References cleared');
  function toOnbBtn(r){
    const onb = onboardingFor(r);
    return onb ? '<button type="button" class="ibtn" onclick="OPR.toOnboarding(this.dataset.n)" data-n="' + esc(onb.name) + '" title="Their to-dos (badge, check-in call, approval) are on Onboarding">Onboarding</button>' : '';
  }
  /* the certificate PDF (saved by the Training Platform when they finished, or when the office emailed it) */
  function finFor(r){ const id = String(r.training_id || ''); return id && ST.fin ? (ST.fin.find(x => String(x.training_id) === id) || null) : null; }
  function certBtn(r){
    const f = finFor(r) || r;
    if(f.has_pdf === true) return '<button type="button" class="ibtn" onclick="OPR.cert(\'' + esc(r.training_id) + '\',this)" title="Open the orientation certificate PDF">PDF</button>';
    if(f.has_pdf === false) return '<span class="orp-meta" title="Finished before certificates were saved, or the save did not go. Make one from the Training Platform." style="align-self:center">No PDF saved</span>';
    return '';
  }
  async function cert(id, btn){
    const w = window.open('', '_blank');   /* opened on the click, so the browser does not block it */
    if(btn) btn.disabled = true;
    let out = null;
    try{
      const r = await fetch(FN + '?action=certificate_link', { method:'POST',
        headers:{ 'x-hub-token':await trainHubTok(), 'apikey':ANON, 'Authorization':'Bearer ' + ANON, 'Content-Type':'application/json' }, body:JSON.stringify({ training_id:id }) });
      out = await r.json().catch(() => null);
    }catch(e){ out = { error:'Could not reach the Training Platform.' }; }
    if(btn) btn.disabled = false;
    if(out && out.url){ if(w) w.location = out.url; else window.location.assign(out.url); return; }
    if(w) w.close();
    alert('Could not open the certificate: ' + ((out && out.error) || 'no answer') );
  }
  /* one line per finished person; the name opens the full history */
  function finRow(p){
    const r = p.r, id = String(r.training_id || ''), open = !!ST.open[id] || (id && id === ST.focus), a = afterFor(r);
    const sign = r.attested_at ? 'Signed off ' + esc(day(r.attested_at)) : r.signoff_note_at ? 'Office note on the sign-off' : '<span class="orp-wait">Not signed off</span>';
    let st;
    if(p.alert) st = '<span class="orp-' + (p.soft ? 'wait' : 'no') + '">' + esc(p.alert) + '</span>';
    else if(a && a.checkin && !a.checkin.done && a.approved) st = '<span class="orp-wait">Check-in call waiting</span>';
    else if(a && a.approved) st = '<span class="orp-ok">Approved to Work ' + esc(day(a.approved.at)) + '</span>';
    else if((a && a.active && a.active.state === 'confirmed') || r.axiscare_active_at || r.status_label === 'Active') st = '<span class="orp-ok">Active in AxisCare</span>';
    else if(r.active === false) st = '<span class="orp-meta">No longer on the Training Platform</span>';
    else st = '<span class="orp-wait">Not Active in AxisCare yet' + (r.status_label ? ' (' + esc(r.status_label) + ')' : '') + '</span>';
    const call = r.phone && typeof ocAttrs === 'function' ? '<a class="ibtn" ' + ocAttrs(r.phone, { email:r.email }) + '>Call</a>' : '';
    return '<div class="orp-frow' + (id && id === ST.focus ? ' orp-focus' : '') + '"' + (id ? ' id="orp-p-' + esc(id) + '"' : '') + '>'
      + '<div><span class="orp-nm">' + hubName(r) + '</span><button type="button" class="orp-hist" onclick="OPR.toggle(\'' + esc(id) + '\')" aria-expanded="' + open + '">' + (open ? 'Hide history' : 'History') + '</button><div class="orp-meta">' + sign + '</div></div>'
      + '<div class="fd">' + esc(day(r.completed_at)) + '</div><div class="fa">' + st + '</div>'
      + '<div class="acts">' + certBtn(r) + call + '</div>'
      + (open ? '<div class="orp-detail"><div class="orp-meta">' + [ (p.invited ? (r.welcome_sent_at ? 'Invited ' : 'Assigned ') + esc(when(new Date(p.invited).toISOString())) : ''), 'Finished ' + esc(when(r.completed_at)), r.status_label ? 'AxisCare: ' + esc(r.status_label) : '', badgeBit(r) ].filter(Boolean).join(' · ') + '</div>'
        + msgsLine(r) + afterLine(p) + '<div class="acts" style="display:flex;gap:6px;margin-top:6px">' + toOnbBtn(r) + TP_LINK + '</div></div>' : '')
      + '</div>';
  }
  function card(title, note, body, hot){
    return '<div class="orp-card' + (hot ? ' hot' : '') + '">' + (title ? '<h3>' + title + '</h3>' : '') + (note ? '<p' + (title ? '' : ' style="margin-top:10px"') + '>' + note + '</p>' : '') + body + '</div>';
  }
  const empty = t => '<div class="orp-empty">' + t + '</div>';
  /* the five lists. Finished is the full history once it is read, else the last 60 days from the working read. */
  function lists(){
    const list = people();
    const sortT = (a, b) => (b.moved || b.seen || b.invited) - (a.moved || a.seen || a.invited);
    const fin = list.filter(inFinish).sort((a, b) => ts(a.r.completed_at) - ts(b.r.completed_at));
    const need = needs(list).filter(p => !inFinish(p)).sort((a, b) => (a.soft - b.soft) || (working_(a) - working_(b)) || sortT(a, b));
    const inp = list.filter(p => p.state === 'inprogress' && !p.alert).sort(sortT);
    const wait = list.filter(p => p.state === 'notstarted' && !p.alert).sort((a, b) => b.invited - a.invited);
    const key = r => String(r.training_id || digits(r.axiscare_id) || nkey(r.name));
    const finIds = {}; fin.forEach(p => { finIds[key(p.r)] = 1; });
    const done = (ST.fin ? ST.fin.map(read) : list.filter(p => p.state === 'done'))
      .filter(p => !finIds[key(p.r)]).sort((a, b) => ts(b.r.completed_at) - ts(a.r.completed_at));
    return { need, fin, inp, wait, done };
  }
  const TABS = [['need', 'Needs you'], ['fin', 'Finish line'], ['inp', 'In orientation'], ['wait', 'Invited, not started'], ['done', 'Finished']];
  const digitsQ = q => q.replace(/\D/g, '');
  function hit(p, q){
    const r = p.r, d = digitsQ(q);
    if(String(r.name || '').toLowerCase().includes(q) || String(r.email || '').toLowerCase().includes(q)) return true;
    return d.length >= 3 && (digits(r.phone).includes(d) || digits(r.axiscare_id) === d);
  }
  function inWindow(p){
    if(ST.win === 'all') return true;
    const t = ts(p.r.completed_at);
    if(ST.win === 'year') return new Date(t).getFullYear() === new Date().getFullYear();
    return Date.now() - t <= Number(ST.win) * DAY;
  }
  function finTable(list){
    if(!list.length) return '';
    const shown = list.slice(0, ST.show);
    return '<div class="orp-frow hd"><div>Name</div><div>Finished</div><div>After finishing</div><div></div></div>' + shown.map(finRow).join('')
      + (list.length > shown.length ? '<div class="orp-foot" style="margin-top:8px">Showing ' + shown.length + ' of ' + list.length + '. <button class="secondary" onclick="OPR.more()">Show ' + Math.min(PAGE, list.length - shown.length) + ' more</button></div>' : '');
  }
  function draw(){ badge(); drawTab(); if(hostOn()) hostDraw(); }   /* badge: the tab hides and the count moves as soon as the switch is read */
  function drawTab(){
    const m = el(); if(!m) return; css();
    if(!ST.rows && ST.busy){ m.innerHTML = '<div class="field-note">Reading orientation from the Training Platform…</div>'; return; }
    ST.onb = null;
    const L = lists(), nd = stuckDays();
    /* someone opened from Onboarding: their tab */
    if(ST.focus){ const k = TABS.map(t => t[0]).find(k => L[k].some(p => String(p.r.training_id) === ST.focus)); if(k){ ST.tab = k; if(k === 'done') ST.win = 'all'; } }
    /* the first tab with work in it, until someone picks one */
    const tab = ST.tab || (L.need.length ? 'need' : L.fin.length ? 'fin' : L.inp.length ? 'inp' : L.wait.length ? 'wait' : 'done');
    const q = ST.q.trim().toLowerCase();
    const count = { need:L.need.length, fin:L.fin.length, inp:L.inp.length, wait:L.wait.length, done:L.done.length };
    const hard = L.need.some(p => !p.soft);
    const canSet = typeof ccCan === 'function' && ccCan('manage_settings');
    const focused = document.activeElement && document.activeElement.id === 'orpQ', caret = focused ? document.activeElement.selectionStart : 0;
    let body = '';
    if(q){
      const parts = TABS.map(([k, label]) => {
        const got = L[k].filter(p => hit(p, q)); if(!got.length) return '';
        return card(label + ' (' + got.length + ')', '', k === 'fin' ? got.map(finishRow).join('') : k === 'done' ? finTable(got) : got.map(row).join(''), k === 'need' && got.some(p => !p.soft));
      }).join('');
      body = parts || card('', '', empty('Nobody matches "' + esc(ST.q.trim()) + '"' + (ST.fin ? '.' : '. Finished people older than 60 days are still loading.')));
    } else if(tab === 'need'){
      body = card('', 'Stuck means no new screen for ' + nd + ' day' + (nd === 1 ? '' : 's') + '. A call usually sorts it out: a screen that will not move on, a sound that will not play, or a lost link. New hires come before people already working.',
        L.need.length ? L.need.map(row).join('') : empty('Nobody is stuck. Everyone in orientation is moving.'), hard);
    } else if(tab === 'fin'){
      body = card('', 'Finished orientation. Three steps before shifts: Approve to Work, the check-in call, then ready for shifts. Longest waiting first.',
        L.fin.length ? L.fin.map(finishRow).join('') : empty('Nobody is waiting at the finish line.'));
    } else if(tab === 'inp'){
      body = card('', '', L.inp.length ? L.inp.map(row).join('') : empty('Nobody is part way through right now.'));
    } else if(tab === 'wait'){
      body = card('', '', L.wait.length ? L.wait.map(row).join('') : empty('Everyone invited has started.'));
    } else {
      const list = L.done.filter(inWindow).filter(p => !ST.prob || p.alert);
      body = card('', ST.fin ? '' : (ST.finErr ? '<span class="orp-no">Could not read everyone who finished (' + esc(ST.finErr) + '). Showing the last 60 days.</span>' : 'Reading everyone who finished…'),
        list.length ? finTable(list) : empty(ST.prob ? 'Nobody in this time has a problem after finishing.' : 'Nobody finished in this time.'));
    }
    m.innerHTML = (ST.err ? '<div class="orp-err">Could not read orientation: ' + esc(ST.err) + (ST.rows ? ' The list below is from ' + esc(when(new Date(ST.at).toISOString())) + '.' : '') + '</div>' : '')
      + (ST.afterErr && ST.rows ? '<div class="orp-err">Could not read the readiness cards (' + esc(ST.afterErr) + '), so the after-finishing lines below show only what the Training Platform knows.</div>' : '')
      + '<div class="orp-tabs" role="tablist">' + TABS.map(([k, label]) => '<button type="button" role="tab" aria-selected="' + (!q && k === tab) + '" class="orp-tab' + (!q && k === tab ? ' on' : '') + (k === 'need' && hard ? ' hot' : '') + '" onclick="OPR.tab(\'' + k + '\')"><b>' + count[k] + '</b><span>' + label + '</span></button>').join('') + '</div>'
      + '<div class="orp-tools"><input id="orpQ" type="search" placeholder="Search everyone: name, phone, email, AxisCare number" value="' + esc(ST.q) + '" oninput="OPR.find(this.value)" aria-label="Search orientation">'
      + (!q && tab === 'done' ? '<select id="orpWin" onchange="OPR.win(this.value)" aria-label="Finished when">' + [['30', 'Last 30 days'], ['90', 'Last 90 days'], ['year', 'This year'], ['all', 'Everyone']].map(([v, t]) => '<option value="' + v + '"' + (ST.win === v ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>'
        + '<label><input type="checkbox" id="orpProb" onchange="OPR.prob(this.checked)"' + (ST.prob ? ' checked' : '') + '> Only with a problem</label>' : '')
      + '</div>' + body
      + '<div class="orp-foot"><span>From the Training Platform' + (ST.at ? ', read ' + esc(when(new Date(ST.at).toISOString())) : '') + '.</span>'
      + '<button class="secondary" onclick="OPR.load()"' + (ST.busy ? ' disabled' : '') + '>' + (ST.busy ? 'Reading…' : 'Refresh') + '</button>'
      + (canSet ? '<label for="orpDays">Stuck after</label><input id="orpDays" type="number" min="1" max="30" step="1" value="' + nd + '"><span>days</span><button class="secondary" onclick="OPR.saveDays(this)">Save</button><span id="orpDaysSaved"></span>' : '')
      + '</div>';
    if(focused){ const i = document.getElementById('orpQ'); if(i){ i.focus(); try{ i.setSelectionRange(caret, caret); }catch(e){} } }
    if(window.HSTRIP) HSTRIP.soon();
    if(ST.focus && ST.rows){
      const f = document.getElementById('orp-p-' + ST.focus);
      if(f){ ST.open[ST.focus] = true; ST.focus = ''; if(f.scrollIntoView) f.scrollIntoView({ block:'center' }); }
      else if(!(tab === 'done' && !ST.fin)) ST.focus = '';
    }
  }

  /* ── ORIENTATION INSIDE ONBOARDING (Samantha 2026-11-03: "Go with your picks on all four and build it, with the switch off",
     https://claude.ai/artifact/HUbmzQ7Gq3vmcE9dqN2mK2). With ops_settings.orientation_in_onboarding_live (and the Onboarding
     table on), the Orientation tab is hidden and its view is drawn inside Onboarding when the Orientation work queue is picked:
     a row per person in the same four lists (Needs you, Finish line, In orientation, Invited, not started), each opening to
     exactly what this tab shows today (row / finishRow, the same buttons and ticks), then Finished history (finTable) and the
     stuck-days setting. Same rules, same reads, same server steps; nothing new is sent or saved. ── */
  function folded(){ const o = (typeof DATA !== 'undefined' && DATA && DATA.ops_settings) || {}; return o.orientation_in_onboarding_live === true && o.onboarding_table_live === true; }
  const hostOn = () => !!(ST.host && document.body.contains(ST.host));
  function inOnboarding(host, q){
    ST.host = host; ST.hostQ = String(q || ''); css();
    if(!ST.busy && (!ST.rows || Date.now() - ST.at > 60e3 || (ST.histOpen && ST.fin === null))) load(!!ST.histOpen); else hostDraw();
  }
  function hostHist(on){ ST.histOpen = !!on; ST.show = PAGE; if(on && ST.fin === null && !ST.busy) load(true); else draw(); }
  function hostStatus(p, fin){
    if(fin){ const a = afterFor(p.r), f = a ? finishState(a) : {};
      return f.approved ? '<span class="orp-ok">Approved</span>' : a && a.ready && a.ready.ready_for_final ? '<span class="orp-ok">Ready to approve</span>' : '<span class="orp-wait">Finished</span>'; }
    if(p.state === 'done') return '<span class="orp-ok">Finished</span>';
    if(p.alert) return '<span class="' + (p.soft ? 'orp-wait' : 'orp-late') + '">' + (p.state === 'notstarted' ? 'Not opened' : p.soft ? 'Sign-off' : 'Stuck') + '</span>';
    return p.state === 'inprogress' ? '<span class="orp-ok">Moving</span>' : '<span class="orp-wait">Invited</span>';
  }
  function hostLast(p, fin){
    const r = p.r;
    if(fin){ const wait = Math.floor((Date.now() - ts(r.completed_at)) / DAY); return 'Finished ' + esc(day(r.completed_at)) + (wait >= 1 ? ', <span class="' + (wait > stuckDays() ? 'orp-late' : '') + '">waiting ' + wait + ' day' + (wait === 1 ? '' : 's') + '</span>' : ''); }
    if(p.state === 'done') return 'Finished ' + esc(day(r.completed_at));
    if(p.alert && !p.soft) return '<span class="orp-late">' + esc(p.alert) + '</span>';
    if(p.state === 'inprogress' && p.cur) return 'Unit ' + p.cur[0] + ', ' + esc(ago(p.moved || p.seen));
    return p.state === 'notstarted' ? '<span class="orp-meta">Not opened yet</span>' : 'Finishing up';
  }
  function hostSent(r){
    const ms = (r.messages || []).filter(m => m.kind !== 'certificate'), word = { invite:'Invite', reminder:'Reminder', signoff_reminder:'Sign-off reminder' };
    if(!ms.length) return r.nudged_at ? 'Reminder ' + esc(day(r.nudged_at)) : '<span class="orp-meta">·</span>';
    const last = ms[ms.length - 1];
    return esc(word[last.kind] || last.kind) + ' ' + esc(day(last.at)) + (ms.length > 1 ? ' <span class="orp-meta">(' + ms.length + ' sent)</span>' : '');
  }
  function hostNext(p){
    const a = afterFor(p.r), f = finishState(a), id = String(p.r.training_id || '');
    const label = !f.approved ? (a.ready && a.ready.ready_for_final ? (ST.meta.may ? 'Approve to Work' : 'Waiting on approval') : 'Still needs ' + (((a.ready && a.ready.missing) || []).length || '') + '')
      : f.active ? 'Check-in call' : 'AxisCare';
    return '<button type="button" class="ibtn" onclick="OPR.toggle(\'' + esc(id) + '\')">' + esc(label.trim()) + '</button>';
  }
  function hostRow(p, fin){
    const r = p.r, id = String(r.training_id || ''), open = !!ST.open[id], foc = id && id === ST.focus;
    const units = p.state === 'done' ? UNITS.length : p.done;
    const working = working_(p) ? '<span class="orp-chip orp-c-wait" title="Already Active in AxisCare: a current caregiver redoing orientation, not a new hire">Already working</span>' : '';
    const call = r.phone && typeof ocAttrs === 'function' ? '<a class="ibtn" ' + ocAttrs(r.phone, { email:r.email }) + '>Call</a>' : '';
    const acts = fin ? hostNext(p) : (p.state !== 'done' && window.HREM ? HREM.orientBtn(r) : '') + call;
    return '<tr class="orp-or' + (foc ? ' orp-focus' : '') + '"' + (id ? ' id="orp-p-' + esc(id) + '"' : '') + '>'
      + '<td class="orp-on"><span class="orp-nm">' + hubName(r) + '</span>' + working + '<button type="button" class="orp-hist" onclick="OPR.toggle(\'' + esc(id) + '\')" aria-expanded="' + open + '">' + (open ? 'Hide' : 'More') + '</button></td>'
      + '<td>' + hostStatus(p, fin) + '</td>'
      + '<td><span class="orp-ub"><i style="width:' + Math.round(units / UNITS.length * 100) + '%"></i></span>' + units + '/' + UNITS.length + '</td>'
      + '<td class="orp-wrapc">' + hostLast(p, fin) + '</td>'
      + '<td>' + (p.invited ? esc(day(new Date(p.invited).toISOString())) : '<span class="orp-meta">·</span>') + (dueBit(r) ? ' · ' + dueBit(r) : '') + '</td>'
      + '<td>' + hostSent(r) + '</td>'
      + '<td><div class="orp-oa">' + acts + '</div></td></tr>'
      + (open ? '<tr class="orp-ox"><td colspan="7">' + (fin ? finishRow(p) : row(p)) + '</td></tr>' : '');
  }
  function hostDraw(){
    const m = ST.host; if(!m) return; css();
    if(!ST.rows){ m.innerHTML = ST.err ? '<div class="orp-err">Could not read orientation: ' + esc(ST.err) + '</div>' : '<div class="field-note">Reading orientation from the Training Platform…</div>'; return; }
    ST.onb = null;
    const L = lists(), nd = stuckDays(), q = ST.hostQ.trim().toLowerCase(), f = list => q ? list.filter(p => hit(p, q)) : list;
    const G = [['need', 'Needs you: stuck, not opened, or not signed off', false], ['fin', 'Finish line: finished, before shifts', true], ['inp', 'In orientation', false], ['wait', 'Invited, not started', false]];
    const body = G.map(([k, t, fin]) => { const xs = f(L[k]); return xs.length ? '<tr class="orp-og' + (k === 'need' && xs.some(p => !p.soft) ? ' hot' : '') + '"><td colspan="7">' + t + ' (' + xs.length + ')</td></tr>' + xs.map(p => hostRow(p, fin)).join('') : ''; }).join('');
    const done = f(L.done).filter(inWindow).filter(p => !ST.prob || p.alert);
    const canSet = typeof ccCan === 'function' && ccCan('manage_settings');
    const hist = ST.histOpen || !!q;
    m.innerHTML = (ST.err ? '<div class="orp-err">Could not read orientation: ' + esc(ST.err) + ' The list below is from ' + esc(when(new Date(ST.at).toISOString())) + '.</div>' : '')
      + (ST.afterErr ? '<div class="orp-err">Could not read the readiness cards (' + esc(ST.afterErr) + '), so the after-finishing lines show only what the Training Platform knows.</div>' : '')
      + '<div class="orp-otw"><table class="orp-ot"><thead><tr><th>Name</th><th>Status</th><th>Units</th><th>Last activity</th><th>Invited, due</th><th>Sent</th><th></th></tr></thead><tbody>'
      + (body || '<tr><td colspan="7" class="orp-empty">' + (q ? 'Nobody in orientation matches that search.' : 'Nobody is in orientation right now.') + '</td></tr>') + '</tbody></table></div>'
      + '<div class="orp-card" style="margin-top:12px"><h3>Finished history' + (ST.fin ? ' (' + L.done.length + ')' : '') + '</h3>'
      + (hist ? '<div class="orp-tools" style="margin-top:6px"><select id="orpWin" onchange="OPR.win(this.value)" aria-label="Finished when">' + [['30', 'Last 30 days'], ['90', 'Last 90 days'], ['year', 'This year'], ['all', 'Everyone']].map(([v, t]) => '<option value="' + v + '"' + (ST.win === v ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>'
          + '<label><input type="checkbox" id="orpProb" onchange="OPR.prob(this.checked)"' + (ST.prob ? ' checked' : '') + '> Only with a problem</label><button class="secondary" onclick="OPR.hist(false)">Hide</button></div>'
          + (ST.fin === null && !ST.finErr ? '<p>Reading everyone who finished…</p>' : ST.finErr ? '<p class="orp-no">Could not read everyone who finished (' + esc(ST.finErr) + '). Showing the last 60 days.</p>' : '')
          + (done.length ? finTable(done) : empty(ST.prob ? 'Nobody in this time has a problem after finishing.' : 'Nobody finished in this time.'))
        : '<p>Everyone who ever finished, with the certificate PDF and their full history. <button class="secondary" onclick="OPR.hist(true)">Show finished history</button></p>')
      + '</div>'
      + '<div class="orp-foot"><span>From the Training Platform' + (ST.at ? ', read ' + esc(when(new Date(ST.at).toISOString())) : '') + '.</span>'
      + '<button class="secondary" onclick="OPR.load()"' + (ST.busy ? ' disabled' : '') + '>' + (ST.busy ? 'Reading…' : 'Refresh') + '</button>'
      + (canSet ? '<label for="orpDays">Stuck after</label><input id="orpDays" type="number" min="1" max="30" step="1" value="' + nd + '"><span>days</span><button class="secondary" onclick="OPR.saveDays(this)">Save</button><span id="orpDaysSaved"></span>' : '<span>Stuck after ' + nd + ' day' + (nd === 1 ? '' : 's') + ' with no new screen.</span>')
      + '</div>';
    if(ST.focus){ const f2 = document.getElementById('orp-p-' + ST.focus); if(f2){ ST.focus = ''; if(f2.scrollIntoView) f2.scrollIntoView({ block:'center' }); } }
  }
  /* the Orientation queue's count on Onboarding: everyone in the four lists */
  function queueCount(){ if(!ST.rows) return null; const L = lists(); return L.need.length + L.fin.length + L.inp.length + L.wait.length; }
  /* the hiring strip's numbers (hire-strip.js): null until the list is read */
  function counts(){
    if(!ST.rows) return null;
    const L = lists();
    return { need:L.need.length, hard:L.need.filter(p => !p.soft).length, fin:L.fin.length, inp:L.inp.length, wait:L.wait.length };
  }
  function setTab(k){ ST.tab = k; ST.q = ''; ST.show = PAGE; draw(); }
  let qt = null;
  function find(v){ ST.q = String(v || ''); ST.show = PAGE; clearTimeout(qt); qt = setTimeout(draw, 120); }
  function setWin(v){ ST.win = v; ST.show = PAGE; draw(); }
  function setProb(v){ ST.prob = !!v; ST.show = PAGE; draw(); }
  function more(){ ST.show += PAGE; draw(); }
  function toggle(id){ ST.open[id] = !ST.open[id]; draw(); }
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
  function mount(){ draw(); if(!ST.busy && (!ST.rows || ST.fin === null || Date.now() - ST.at > 60e3)) load(true); }
  /* the pill count: once after sign-in, then every 30 minutes while the page is open */
  let timer = null;
  function watch(){ if(timer) return; load(); timer = setInterval(() => { if(document.visibilityState === 'visible') load(); }, 30 * 60e3); }
  /* 2026-11-03 (the Onboarding table's Finish column and "nearly ready"): a person's readiness for Approve to Work as the
     Finish line already reads it, or null when not matched or not read yet. Read only. */
  function finishOf(ax, name){
    const r = rowFor(ax, name), a = r ? afterFor(r) : null; if(!a) return null;
    return { approved:!!a.approved, ready:!!(a.ready && a.ready.ready_for_final), missing:((a.ready && a.ready.missing) || []).map(short), checkin:a.checkin || null, active:a.active || null };
  }
  window.OPR = { inOnboarding, folded, queueCount, hist:hostHist, mount, load:() => load(), counts, _redraw:() => draw(), finishOf, _anon:ANON, saveDays, tab:setTab, find, win:setWin, prob:setProb, more, toggle, cert, watch, brief, show, toOnboarding, approve, retry, tick, clock, callDone, noAnswer, _read:read, _units:UNITS, _st:ST, _rowFor:rowFor, _inFinish:inFinish, _finishRow:finishRow };
})();
