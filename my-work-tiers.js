/* MY WORK TIERS (Stage 2 of the My Work and Team Work plan, Samantha approved 2026-10-18 with all four recommendations,
   plan EZ3uEb9WyBBuTRUWR91qYS; design from the Care Coordinator client assignment session).
   Today stops being one list sorted by time and becomes your work grouped by what it is, most important kind first:

     Needs you now          anything that can't wait (Act now), above everything
     Relationship builders  the welcome call (journey step fw.family) and the 7-day and 30-day relationship calls
     Your leads             your lead follow-ups (inquiry cards, the journey's lead step)
     Your clients and tasks client next steps, work people gave you, coaching, reviews, approvals, failed sends
     Hub reminders          automated FYI (yellow shift-note flags, care packets, plan rechecks, saved-for-future):
                            compact rows, always last, never in the red number, Got it closes them with your name

   Inside a group: late first, then due today, then coming up. Team Work stays its own tab.
   Switched by ops_settings.my_work_tiers_live (its own switch, decision 3). While off, owners can preview it on Today.
   Nothing here texts, emails or calls anyone; it only lays out My Work. */
(function(root){
  'use strict';
  const lc = s => String(s == null ? '' : s).trim().toLowerCase();

  const TIERS = [
    { k:'rel',   name:'Relationship builders', why:'Your calls with families. This is how they learn they can count on you, and it’s what keeps them with us.' },
    { k:'leads', name:'Your leads',            why:'Families deciding whether to choose us. A quick, kind follow-up is often what makes the difference.' },
    { k:'tasks', name:'Your clients and tasks', why:'Your clients’ next steps and the work people gave you.' },
    { k:'rem',   name:'Hub reminders',         why:'For your information.' } ];
  const LEAD_KINDS = ['new_lead', 'lead', 'new_family_call', 'interest', 'fold_lead'];
  /* Reminders are an allowlist: anything not named here is a task, so nothing that needs doing is ever quieted. */
  const REMINDER_KINDS = ['care_note', 'care_packet_unconfirmed', 'plan_recheck', 'future_check_back', 'availability', 'availability_update',
    'avail_change', 'caregiver_connect', 'profile_check', 'video_optional'];
  const REMINDER_OPENERS = ['care-note-flag', 'care-packet-watch'];
  /* Failed texts and emails are tasks (her rule: no silent failures), never reminders. */
  const NEVER_REMINDER = ['send_problem'];

  function confidential(it){
    const k = lc(it.kind);
    return !!it.sensitive || /coach|discipline|writeup|write_up|termination|investigation|^hr/.test(k)
      || /attendance-threshold|hr-agent/.test(lc(it.opened_by)) || lc(it.domain) === 'caregiver_performance';
  }
  /* quiet (2026-10-29, the quieter call reader): a call follow-up that is not a promise or care at risk is a Hub reminder,
     drawn as one "From calls" line (team-work.js quietCall decides; the Hub passes it in) */
  function tierOf(it, quiet){
    if(!it) return 'tasks';
    const k = lc(it.kind), step = lc(it.step_key);
    if(confidential(it)) return 'tasks';
    if(quiet && quiet(it)) return 'rem';
    if(NEVER_REMINDER.indexOf(k) > -1) return 'tasks';
    if(k === 'relationship_call') return 'rel';
    if(k === 'journey' && step === 'fw.family') return 'rel';
    if(LEAD_KINDS.indexOf(k) > -1) return 'leads';
    if(k === 'journey' && /^soc\.lead/.test(step)) return 'leads';
    /* a red (urgent) shift-note flag is Team Work's; if one is ever someone's own, it is a task, not a reminder */
    if((k === 'care_note' || lc(it.opened_by) === 'care-note-flag') && lc(it.urgency) === 'urgent') return 'tasks';
    if(REMINDER_KINDS.indexOf(k) > -1 || REMINDER_OPENERS.indexOf(lc(it.opened_by)) > -1) return 'rem';
    return 'tasks';
  }
  /* late, then due today, then coming up (soonest first), then no date */
  function sortKey(it, now, endOfDay){
    const d = Date.parse(it.due || ''); if(isNaN(d)) return [3, 0];
    return d < now ? [0, d] : d <= endOfDay ? [1, d] : [2, d];
  }
  function sortTier(list, now, endOfDay){
    return list.slice().sort((a, b) => { const x = sortKey(a, now, endOfDay), y = sortKey(b, now, endOfDay); return (x[0] - y[0]) || (x[1] - y[1]); });
  }
  const CORE = { TIERS, tierOf, confidential, sortTier, sortKey, LEAD_KINDS, REMINDER_KINDS };
  if(typeof module !== 'undefined' && module.exports){ module.exports = CORE; return; }

  /* ═══════════════════════════════════ in the Hub ═══════════════════════════════════════════════════════════════ */
  const W = root;
  const D = () => { try{ return DATA || {}; }catch(e){ return {}; } };
  const esc = s => (typeof W.escapeHtmlComms === 'function' ? W.escapeHtmlComms(s) : String(s == null ? '' : s));
  const isOwner = () => { try{ return !!W.ccIsOwner(); }catch(e){ return false; } };
  const me = () => { try{ return lc(W.opsMeKey ? W.opsMeKey() : W.ccActor().email); }catch(e){ return ''; } };
  const on = () => (D().ops_settings || {}).my_work_tiers_live === true;
  const quiet = it => { try{ return !!(W.TW && typeof W.TW.quietOne === 'function' && W.TW.quietOne(it)); }catch(e){ return false; } };
  const tierOfHub = it => tierOf(it, quiet);
  let PREVIEW = false;
  /* in use: on for everyone, or an owner previewing it while it is off */
  const active = () => on() || (PREVIEW && isOwner());
  const ICON = {
    rel:'<path d="M19.5 12.6 12 20l-7.5-7.4A4.6 4.6 0 0 1 12 6.3a4.6 4.6 0 0 1 7.5 6.3Z"/><path d="M8.5 12.5 11 15l4.5-4.5"/>',
    leads:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M19 8v6M16 11h6"/>',
    tasks:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/>',
    rem:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>' };
  const STYLE = { rel:['#E7F4EC', '#1D6B45'], leads:['#E8EFF9', '#1F4F8A'], tasks:['#EAF4F6', '#155A68'], rem:['#EEEDE8', '#5D6670'] };
  function countWords(k, n){
    if(k === 'rel') return n + ' famil' + (n === 1 ? 'y' : 'ies');
    if(k === 'leads') return n + ' need' + (n === 1 ? 's' : '') + ' you';
    if(k === 'rem') return n + ' for your information';
    return String(n);
  }
  function head(t, n){
    const c = STYLE[t.k];
    return '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">'
      + '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="' + c[1] + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[t.k] + '</svg>'
      + '<b style="font-size:15.5px;color:' + c[1] + ';">' + esc(t.name) + '</b>'
      + '<span style="margin-left:auto;font-weight:800;font-size:12.5px;border-radius:999px;padding:2px 10px;background:#fff;color:' + c[1] + ';">' + esc(countWords(t.k, n)) + '</span></div>'
      + (t.k === 'rem' ? '' : '<div style="font-size:13.5px;color:var(--text);margin:4px 0 8px;">' + esc(t.why) + '</div>');
  }
  function panel(t, inner, n){
    const c = STYLE[t.k];
    return '<div class="mwt-tier" data-tier="' + t.k + '" style="background:' + c[0] + ';border-radius:12px;padding:12px 14px;margin:14px 0;">' + head(t, n) + inner + '</div>';
  }
  /* Got it: a reminder is closed with your name and the time (opsCloseCommit), so nothing disappears silently */
  async function gotIt(id){
    const it = ((D().ops_items) || []).find(x => x.id === id && x.status === 'open'); if(!it) return;
    if(typeof W.opsCloseCommit === 'function') await W.opsCloseCommit(it, 'Got it (Hub reminder)', 'seen');
    try{ W.ccToast('Got it. Closed with your name.'); }catch(e){}
  }
  function remRow(it){
    const d = Date.parse(it.due || ''), late = !isNaN(d) && d < Date.now();
    return '<div class="mwt-rem" data-id="' + esc(it.id) + '" style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;font-size:13.5px;padding:6px 2px;border-top:1px solid rgba(0,0,0,.07);">'
      + '<span style="flex:1 1 260px;min-width:0;">' + esc(it.title || it.about || 'Reminder')
      + (it.about && it.title && it.about !== it.title ? ' <span class="field-note">(' + esc(it.about) + ')</span>' : '')
      + (late ? ' <span class="field-note">was due ' + esc(new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' })) + '</span>' : '') + '</span>'
      + '<button class="ghost" style="padding:3px 10px;font-size:12px;" onclick="MWT.gotIt(\'' + esc(it.id) + '\')">Got it</button></div>';
  }
  /* From calls: the call follow-ups that left Team Work, as ONE line that opens them on the AI call reader (her
     recommendation 1: the work is not lost, and nobody is buried in it). Never in the red number. */
  function fromCallsRow(calls, now){
    if(!calls.length) return '';
    const late = calls.filter(it => { const d = Date.parse(it.due || ''); return !isNaN(d) && d < now; }).length;
    return '<div class="mwt-rem mwt-calls" style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;font-size:13.5px;padding:6px 2px;border-top:1px solid rgba(0,0,0,.07);">'
      + '<span style="flex:1 1 260px;min-width:0;"><b>From calls:</b> ' + calls.length + ' follow-up' + (calls.length === 1 ? '' : 's') + ' the call reader gave you'
      + (late ? ' <span class="field-note">(' + late + ' past ' + (late === 1 ? 'its' : 'their') + ' time)</span>' : '') + '</span>'
      + '<button class="ghost" style="padding:3px 10px;font-size:12px;" onclick="MWT.openCalls()">Open them</button></div>';
  }
  function openCalls(){
    try{ if(W.CPR && typeof W.CPR.showOpen === 'function') W.CPR.showOpen(me()); }catch(e){}
    if(typeof W.switchTab === 'function') W.switchTab('callfollowups');
  }
  /* The rows My Work's Today would show, grouped. o = { now:[], rows:[], card:(it)=>html, approvals:n, unowned:[] } */
  function tiersHtml(o){
    const now = Date.now(), e = new Date(); e.setHours(23, 59, 59, 999); const eod = e.getTime(), week = now + 7 * 864e5;
    const by = { rel:[], leads:[], tasks:[], rem:[] };
    o.rows.forEach(it => by[tierOfHub(it)].push(it));
    (o.unowned || []).forEach(it => by.tasks.push(it));
    let h = '';
    TIERS.forEach(t => {
      const list = sortTier(by[t.k], now, eod);
      if(t.k === 'rem'){
        if(!list.length) return;
        const calls = list.filter(quiet), plain = list.filter(it => !quiet(it));
        const first = plain.slice(0, 5), rest = plain.slice(5);
        h += panel(t, fromCallsRow(calls, now) + first.map(remRow).join('') + (rest.length ? '<details><summary style="cursor:pointer;font-size:12.5px;font-weight:700;color:#5D6670;margin-top:4px;">Show ' + rest.length + ' more</summary>' + rest.map(remRow).join('') + '</details>' : ''), plain.length + (calls.length ? 1 : 0));
        return;
      }
      /* folded under "more, later": only cards dated over a week out; anything with no date (a failed send) always shows */
      const soon = o.all ? list : list.filter(it => { const d = Date.parse(it.due || ''); return isNaN(d) || d <= week; });
      const later = list.filter(it => soon.indexOf(it) === -1);
      let inner = soon.map(it => o.card(it)).join('');
      if(t.k === 'tasks' && o.approvals) inner = '<div class="wkcard" style="padding:10px 13px;margin-bottom:8px;cursor:pointer;" onclick="myWorkGo(\'approvals\')"><b>' + o.approvals + ' approval' + (o.approvals === 1 ? '' : 's') + ' waiting for you</b> <span class="field-note">Open Approvals</span></div>' + inner;
      if(later.length) inner += '<details><summary style="cursor:pointer;font-size:12.5px;font-weight:700;margin-top:4px;">' + later.length + ' more, later</summary>' + later.map(it => o.card(it)).join('') + '</details>';
      if(!list.length && !(t.k === 'tasks' && o.approvals)) inner = '<div class="field-note" style="padding:2px;">' + (t.k === 'rel' ? 'No family calls due. When a first visit happens, the welcome call shows here.' : t.k === 'leads' ? 'No lead follow-ups due.' : 'Nothing else on your list.') + '</div>';
      h += panel(t, inner, soon.length + (t.k === 'tasks' ? (o.approvals || 0) : 0));
    });
    return h;
  }
  /* Failed sends with no owner show in the Springfield lead's tasks (decision 2). Display only: nobody's owner changes. */
  function unownedForMe(){
    const m = me(); if(!m) return [];
    let lead = false;
    try{ lead = (typeof W.ccRolesFor === 'function' && W.ccRolesFor(m).indexOf('springfield_lead') > -1) || (W.TA && W.TA.inCharge && W.TA.inCharge() === m); }catch(e){}
    if(!lead) return [];
    return ((D().ops_items) || []).filter(i => i && i.status === 'open' && !i.owner && NEVER_REMINDER.indexOf(lc(i.kind)) > -1);
  }
  function previewLink(){
    if(on() || !isOwner()) return '';
    return '<div class="field-note" style="margin:0 0 8px;">' + (PREVIEW
      ? '<b>Preview of the new My Work layout.</b> Only owners see this; everyone else’s My Work is unchanged. <a href="#" onclick="MWT.preview(false);return false;">Back to the current layout</a>'
      : '<a href="#" onclick="MWT.preview(true);return false;">Preview the new My Work layout (owners only)</a>') + '</div>';
  }
  function preview(v){ PREVIEW = !!v; if(typeof W.renderMyWork === 'function') W.renderMyWork(); }

  /* ── Settings > My Work tiers (owners) ── */
  const SW_ON = 'Turn on the new My Work layout?\n\nFrom now, everyone’s Today shows their work grouped: Needs you now, Relationship builders, Your leads, Your clients and tasks, and Hub reminders (compact, last, never in the red number). All mine is grouped the same way.\n\nNothing is texted, emailed or called because of this, and Team Work is unchanged.';
  const SW_OFF = 'Turn off the new My Work layout? Today goes back to one list sorted by time. Nothing is lost.';
  function setFill(){
    const box = document.getElementById('mwtSet'); if(!box) return;
    box.innerHTML = '<div class="field-note" style="margin:4px 0 8px;">' + (on() ? '<b style="color:#1E8449;">On.</b> Everyone’s My Work is grouped.' : '<b style="color:#B7791F;">Off.</b> Today is one list as before; owners can preview the new layout on Today.') + '</div>'
      + (isOwner() ? '<button class="secondary" id="mwtToggleBtn" onclick="MWT.toggle(this)">' + (on() ? 'Turn off the new layout' : 'Turn on the new layout') + '</button> <span class="field-note" id="mwtSaved"></span>'
        : '<div class="field-note">Only Samantha or Zachary can turn this on or off.</div>');
  }
  async function toggle(btn){
    if(!isOwner()){ alert('Only Samantha or Zachary can turn this on or off.'); return; }
    const want = !on();
    const ok = typeof W.ccConfirm === 'function' ? await W.ccConfirm(want ? SW_ON : SW_OFF) : confirm(want ? SW_ON : SW_OFF);
    if(!ok) return;
    if(btn) btn.disabled = true;
    const r = typeof W.tkMerge === 'function' ? await W.tkMerge(m => { m.my_work_tiers_live = want; if(want && !m.my_work_tiers_live_since) m.my_work_tiers_live_since = new Date().toISOString(); return ['My Work tiers ' + (want ? 'ON' : 'OFF')]; }, 'My Work tiers') : { error:{ message:'saving is not available here' } };
    if(btn) btn.disabled = false;
    const sv = document.getElementById('mwtSaved'); if(sv) sv.textContent = r && r.error ? 'Could not save: ' + r.error.message : (want ? 'On.' : 'Off.');
    setFill(); if(typeof W.myWorkRefresh === 'function') W.myWorkRefresh();
  }

  W.MWT = Object.assign({}, CORE, { tierOf:tierOfHub, quiet, openCalls, on, active, preview, previewLink, tiersHtml, unownedForMe, gotIt, setFill, toggle, SW_ON, SW_OFF });
})(typeof window !== 'undefined' ? window : globalThis);
