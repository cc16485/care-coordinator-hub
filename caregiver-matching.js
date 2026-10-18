/* =====================================================================================================================
   CAREGIVER MATCHING (Start of Care stage C, Samantha approved 2026-10-17; her names: Team Builder is now Caregiver
   Matching, in Scheduling after Live Schedule, and the profile button says Find Caregivers). Built on the Team Builder
   board, which stays the one place a staffing plan is edited. What this file adds:
     · FIND CAREGIVERS on a lead's or client's Team & Schedule tab: starts their plan from what the lead already says
       (name, town, days, times, level), keyed to the lead, the AxisCare client and the journey, and linked to the
       lead's journey where it can be, so it follows them into AxisCare. No more "Link to a Journey" by hand.
     · SHORTLIST (up to 5) and the FAMILY'S PREFERENCE (a caregiver, or open to anyone). A preference is never a promise.
     · CONFLICTS ACROSS EVERY PLAN, as weekly patterns: being penciled in on two plans at the same time is a warning;
       a second yes at an overlapping time, or a yes over a real AxisCare visit, is refused (her rule: "Allow tentative
       plans to overlap with warnings. Block conflicting accepted commitments").
     · HER RECHECK RULE: a yes keeps its date and what the shift looked like (yes_snap). It needs a recheck when the shift
       changed or 14 days passed before care starts (JourneyRules.yesRecheck, the same rule the server runs). "Still a
       yes" restarts the clock and keeps the history; "No longer available" records the no. Never texted.
     · Missing availability reads as unknown (her correction 2026-10-17), never as available.
   The yes-blocking and recheck parts are behind the Admin switch "Caregiver Matching checks" (cm_checks_live). Nothing
   here texts or emails anyone, and nothing here touches AxisCare.
   ===================================================================================================================== */
(function(){
  'use strict';
  const R = window.JourneyRules;
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s));
  const me = () => (typeof ME !== 'undefined' && (ME.name || ME.email)) || '';
  const nowIso = () => new Date().toISOString();
  const today = () => R.ymd(Date.now());
  const checksOn = () => !!(typeof DATA !== 'undefined' && DATA.ops_settings && DATA.ops_settings.cm_checks_live === true);
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const DL = { mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat', sun:'Sun' };
  const SHORT_MAX = 5;
  const nk = s => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
  const samePerson = (a, b) => (a && b) && ((a.cg_ax_id && b.cg_ax_id) ? String(a.cg_ax_id) === String(b.cg_ax_id) : nk(a.name) === nk(b.name));

  /* ── which plan is this person's ── */
  function planFor(p){
    const ps = (typeof tbPlans === 'function' ? tbPlans() : []).filter(x => x && x.status !== 'archived');
    return ps.find(x => (p.journey_id && String(x.journey_id || '') === String(p.journey_id))
      || (p.lead && String(x.lead_id || '') === String(p.lead.id)) || (p.ax && String(x.axiscare_client_id || '') === String(p.ax))) || null;
  }
  /* the lead's days ("Mon, Wed" / ["Monday"]) and times ("8am-12pm", "8:00 to 12:00") as plan days and one shift */
  function daysFrom(v){
    const list = (Array.isArray(v) ? v : String(v || '').split(/[,/ ]+/)).map(x => String(x).toLowerCase().slice(0, 3)).filter(x => DAYS.indexOf(x) > -1);
    return list.length ? DAYS.filter(d => list.indexOf(d) > -1) : ['mon', 'tue', 'wed', 'thu', 'fri'];
  }
  function hhmm(h, m, ap){ h = Number(h); m = Number(m || 0); if(ap){ ap = ap.toLowerCase(); if(ap[0] === 'p' && h < 12) h += 12; if(ap[0] === 'a' && h === 12) h = 0; } return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }
  function slotFrom(t){
    const m = String(t || '').match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?\s*(?:-|–|to|until)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?/i);
    if(!m) return { k:'s1', label:'Shift 1', start:'08:00', end:'12:00' };
    const ap2 = m[6] || '', ap1 = m[3] || (ap2 && Number(m[1]) <= Number(m[4]) ? ap2 : '');
    const start = hhmm(m[1], m[2], ap1), end = hhmm(m[4], m[5], ap2);
    return { k:'s1', label:'Shift 1', start, end };
  }
  async function episodeOfLead(leadId){
    try{ const r = await sb.from('episode_source').select('episode_id').eq('system', 'lead').eq('role', 'origin').eq('source_ref', String(leadId)).limit(1);
      return (r && r.data && r.data[0] && r.data[0].episode_id) || null; }catch(e){ return null; }
  }
  /* FIND CAREGIVERS: start (or open) this person's plan */
  async function findCaregivers(btn){
    const l = (typeof CP !== 'undefined' && CP.lead) || null, ax = (typeof CP !== 'undefined' && CP.ax) ? String(CP.ax) : '';
    const cj = window.CJ_STATE && CJ_STATE.data && CJ_STATE.data.journey;
    const had = planFor({ lead:l, ax, journey_id:cj && cj.journey_id });
    if(had){ if(typeof cpRenderTeam === 'function') cpRenderTeam(); return; }
    if(btn){ btn.disabled = true; btn.textContent = 'Starting…'; }
    const name = l ? ((typeof cpLeadClientName === 'function' && cpLeadClientName(l)) || [l.client_first_name, l.client_last_name].filter(Boolean).join(' ') || [l.first_name, l.last_name].filter(Boolean).join(' '))
      : String((CP.r && (CP.r.client_name || CP.r.display_name)) || (cj && cj.client_name) || 'Client');
    const p = { id:'tb' + Date.now(), client:name || 'Client', city:(l && (l.client_city || '')) || null, zip:(l && (l.client_zip || '')) || null,
      level:(l && l.level_estimate) ? String(l.level_estimate) : null, days:daysFrom(l && (l.schedule_days || l.days_needed)), slots:[slotFrom(l && l.times_needed)], cells:{},
      status:'building', created_at:nowIso(), by:me(), lead_id:l ? String(l.id) : null, axiscare_client_id:ax || (l && /^\d+$/.test(String(l.axiscare_client_id || '').trim()) ? String(l.axiscare_client_id).trim() : null),
      journey_id:(cj && cj.journey_id) || null, made_from:'find_caregivers', shortlist:[] };
    DATA.staffing_plans = DATA.staffing_plans || []; DATA.staffing_plans.push(p);
    await persist('staffing_plans', p);
    /* linked to the lead's journey, so the plan follows them into AxisCare (the old "Link to a Journey", done for you) */
    if(l){ const ep = await episodeOfLead(l.id); if(ep && typeof tbLinkPlan === 'function'){ try{ await tbLinkPlan(p.id, ep); }catch(e){} } }
    if(typeof ccToast === 'function') ccToast('Started ' + p.client + '\'s Caregiver Matching plan from what the lead says. Check the days and times.');
    if(typeof cpRenderTeam === 'function') cpRenderTeam();
  }

  /* ── conflicts, as weekly patterns ── */
  const mins = t => { const m = String(t || '').match(/^(\d\d):(\d\d)/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  function overlaps(a, b){
    const s1 = mins(a.start), e1 = mins(a.end), s2 = mins(b.start), e2 = mins(b.end); if([s1, e1, s2, e2].some(x => x == null)) return false;
    const r = (s, e) => e > s ? [[s, e]] : [[s, 1440], [0, e]];
    return r(s1, e1).some(([x1, y1]) => r(s2, e2).some(([x2, y2]) => x1 < y2 && x2 < y1));
  }
  function slotOf(plan, sk){ return (plan.slots || []).find(s => s.k === sk) || null; }
  function peopleOn(plan, key){ return typeof tb2People === 'function' ? tb2People(plan, key) : (plan.cells && plan.cells[key] ? [Object.assign({ main:true, pid:'main' }, plan.cells[key])] : []); }
  /** every other open plan where this person sits on the same weekday at an overlapping time */
  function otherPlans(person, day, slot, exceptPlanId){
    const out = [];
    (typeof tbPlans === 'function' ? tbPlans() : []).forEach(p => {
      if(!p || p.id === exceptPlanId || p.status === 'done' || p.status === 'archived' || (p.days || []).indexOf(day) < 0) return;
      (p.slots || []).forEach(s => { if(!overlaps(slot, s)) return;
        peopleOn(p, day + '|' + s.k).forEach(x => { if(x.status !== 'no' && samePerson(x, person)) out.push({ plan:p, slot:s, status:x.status, recheck:x.status === 'yes' && R.yesRecheck(p, day + '|' + s.k, x.main ? null : x, today()).need }); }); });
    });
    return out;
  }
  const word = st => st === 'yes' ? 'said yes' : st === 'asked' ? 'asked' : st === 'maybe' ? 'maybe' : 'penciled';
  const otherWords = c => 'also ' + word(c.status) + ' for ' + (c.plan.client || 'another client') + ', ' + (typeof tbT12 === 'function' ? tbT12(c.slot.start) + '–' + tbT12(c.slot.end) : c.slot.start + '–' + c.slot.end);
  /** a yes that would put someone in two places at once: the reason, or '' */
  function yesBlock(plan, key, person){
    const [d, sk] = key.split('|'), slot = slotOf(plan, sk); if(!slot || !person) return '';
    const hard = otherPlans(person, d, slot, plan.id).filter(c => c.status === 'yes');
    if(hard.length) return person.name + ' already said yes to ' + (hard[0].plan.client || 'another client') + ' on ' + DL[d] + ' at an overlapping time. Free that shift first.';
    const cg = person.cg_ax_id && Array.isArray(TB.pool) ? TB.pool.find(x => String(x.axiscare_id) === String(person.cg_ax_id)) : null;
    if(cg && typeof CM_ORIG_FIT === 'function'){ const f = CM_ORIG_FIT(cg, d, slot); if(f.conflicts && f.conflicts.length) return person.name + ' works ' + f.conflicts[0] + ' in AxisCare at that time. A yes here would put them in two places.'; }
    return '';
  }

  /* ── the recheck rule on the board ── */
  function rechecksOf(plan){
    return Object.keys(plan.cells || {}).map(k => ({ key:k, cell:plan.cells[k], rc:R.yesRecheck(plan, k, plan.cells[k], today()) })).filter(x => x.rc.need);
  }
  async function stillYes(key){
    const plan = tbPlan(); if(!plan || !plan.cells || !plan.cells[key]) return;
    const c = plan.cells[key];
    c.yes_history = (c.yes_history || []).concat([{ at:c.yes_at || c.at, by:c.by || '', snap:c.yes_snap || null }]);
    c.yes_at = nowIso(); c.yes_snap = R.yesSnap(plan, key); c.by = me(); c.at = c.yes_at;
    await tbSave(plan); tbRender();
    if(typeof ccToast === 'function') ccToast('Still a yes: ' + c.name + '. The earlier yes stays in the history.');
  }
  async function noLonger(key){ if(typeof tb2Answer === 'function') return CM_ORIG_ANSWER(key, 'main', 'no'); }

  /** does this shift count as covered? A yes, unless (checks on) it needs a recheck */
  function covered(plan, key, cell){ const c = cell || ((plan && plan.cells) || {})[key]; if(!c || c.status !== 'yes') return false; return !checksOn() || !R.yesRecheck(plan, key, c, today()).need; }
  /* ── the panel at the top of the board: shortlist, the family's preference, rechecks, conflicts ── */
  function topHtml(plan){
    const sl = plan.shortlist || [], pref = plan.family_pref || null;
    const prefWords = !pref ? 'Not asked yet' : pref.kind === 'any' ? 'Open to anyone' : 'Prefers ' + pref.name;
    let h = '<div class="card cm-top" style="padding:10px 14px;margin:0 0 10px;display:grid;gap:8px;">'
      + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;"><b style="font-size:13px;color:var(--navy);">Shortlist (' + sl.length + ' of ' + SHORT_MAX + ')</b>'
      + (sl.length ? sl.map((x, i) => '<span class="tag-chip" style="background:#EAF4F6;color:#155A68;font-weight:700;">' + esc(x.name) + ' <button class="linklike" title="Take off the shortlist" style="margin-left:4px;" onclick="cmShortRemove(' + i + ')">✕</button></span>').join('')
        : '<span class="field-note" style="font-size:12px;">Add up to five possible matches with ☆ in the list below. A shortlist is never an assignment.</span>')
      + '</div>'
      + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12.5px;"><b style="color:var(--navy);">The family\'s preference:</b>'
      + '<select onchange="cmPref(this.value)" style="font-size:12.5px;"><option value="">' + esc(pref ? prefWords : 'Not asked yet') + '</option><option value="any">Open to anyone</option>'
      + sl.map((x, i) => '<option value="s' + i + '">Prefers ' + esc(x.name) + '</option>').join('') + (pref ? '<option value="clear">Clear it</option>' : '') + '</select>'
      + (pref ? '<span class="field-note" style="font-size:11.5px;">' + esc((pref.by || '') + (pref.at ? ', ' + String(pref.at).slice(0, 10) : '')) + '. A preference, not a promise.</span>' : '') + '</div>';
    if(checksOn()){
      const rc = rechecksOf(plan);
      if(rc.length) h += '<div style="border:1px solid #F5D9A8;background:#FFF8EC;border-radius:8px;padding:8px 10px;display:grid;gap:6px;"><b style="font-size:12.5px;color:#9A6412;">Recheck needed (' + rc.length + '): these yes answers don\'t count as covered until someone checks</b>'
        + rc.map(x => { const [d, sk] = x.key.split('|'), s = slotOf(plan, sk) || {};
          return '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12.5px;"><b>' + esc(x.cell.name) + '</b><span>' + esc(DL[d] + ' ' + (s.label || '')) + '</span><span class="field-note" style="font-size:11.5px;">said yes ' + esc(x.rc.since || '') + ' · ' + esc(x.rc.why) + '</span><span style="flex:1;"></span>'
            + '<button class="cara-btn" style="font-size:11.5px;" onclick="cmStillYes(\'' + esc(x.key) + '\')">Still a yes</button><button class="cara-btn ghost" style="font-size:11.5px;" onclick="cmNoLonger(\'' + esc(x.key) + '\')">No longer available</button></div>'; }).join('')
        + '<span class="field-note" style="font-size:11px;">Ask them however is easiest; nothing is texted for you.</span></div>';
    }
    const clash = [];
    Object.keys(plan.cells || {}).forEach(k => { const [d, sk] = k.split('|'), s = slotOf(plan, sk); if(!s) return;
      peopleOn(plan, k).forEach(x => { if(x.status === 'no') return; otherPlans(x, d, s, plan.id).forEach(c => clash.push(x.name + ' (' + DL[d] + '): ' + otherWords(c))); }); });
    if(clash.length) h += '<div style="font-size:12px;color:#9A6412;"><b>Planned in two places:</b> ' + esc(clash.slice(0, 4).join(' · ')) + (clash.length > 4 ? ' · and ' + (clash.length - 4) + ' more' : '') + '</div>';
    return h + '</div>';
  }
  async function shortAdd(i){
    const plan = tbPlan(), cg = Array.isArray(TB.pool) ? TB.pool[i] : null; if(!plan || !cg) return;
    plan.shortlist = plan.shortlist || [];
    if(plan.shortlist.some(x => samePerson(x, { name:cg.name, cg_ax_id:String(cg.axiscare_id || '') }))){ ccToast(cg.name + ' is already on the shortlist.'); return; }
    if(plan.shortlist.length >= SHORT_MAX){ ccToast('The shortlist holds five. Take someone off first.'); return; }
    plan.shortlist.push({ name:String(cg.name), cg_ax_id:String(cg.axiscare_id || '') || undefined, added_at:nowIso(), by:me() });
    await tbSave(plan); tbRender();
  }
  async function shortRemove(i){ const plan = tbPlan(); if(!plan || !plan.shortlist) return; const x = plan.shortlist.splice(i, 1)[0];
    if(plan.family_pref && x && plan.family_pref.kind === 'caregiver' && samePerson(plan.family_pref, x)) delete plan.family_pref;
    await tbSave(plan); tbRender(); }
  async function setPref(v){
    const plan = tbPlan(); if(!plan || !v) return;
    if(v === 'clear') delete plan.family_pref;
    else if(v === 'any') plan.family_pref = { kind:'any', at:nowIso(), by:me() };
    else { const x = (plan.shortlist || [])[Number(v.slice(1))]; if(!x) return; plan.family_pref = { kind:'caregiver', name:x.name, cg_ax_id:x.cg_ax_id, at:nowIso(), by:me() }; }
    await tbSave(plan); tbRender();
  }

  /* ── wrapping the board's own functions (they stay the one place plans are edited) ── */
  function install(){
    if(window.__cmInstalled || typeof tbBoardHtml !== 'function' || typeof tbCellFit !== 'function') return;
    window.__cmInstalled = true;
    const origBoard = window.tbBoardHtml;
    window.tbBoardHtml = function(plan){ return topHtml(plan) + origBoard(plan); };
    window.CM_ORIG_FIT = window.tbCellFit;
    /* the pencil list's fit adds other plans' shifts as conflicts (a warning while it is a pencil) */
    window.tbCellFit = function(cg, d, slot){
      const f = CM_ORIG_FIT(cg, d, slot), plan = typeof tbPlan === 'function' ? tbPlan() : null;
      const others = otherPlans({ name:cg.name, cg_ax_id:String(cg.axiscare_id || '') }, d, slot, plan && plan.id);
      return Object.assign({}, f, { conflicts:(f.conflicts || []).concat(others.map(otherWords)) });
    };
    /* ☆ shortlist on every row of the pencil list */
    const origPool = window.tbPoolListHtml;
    window.tbPoolListHtml = function(plan, key){
      return String(origPool(plan, key)).replace(/<button class="cara-btn" style="font-size:11.5px;" onclick="(?:tb2AddPool|tbAssignPool)\('[^']*',(\d+)\)">/g,
        (m, i) => '<button class="cara-btn ghost" title="Add to the shortlist" style="font-size:11.5px;" onclick="cmShortAdd(' + i + ')">☆</button>' + m);
    };
    /* a yes: what the shift looked like (for the recheck rule), and refused when it puts someone in two places */
    const guardYes = async (plan, key, person) => {
      if(!person) return true;
      if(checksOn()){ const why = yesBlock(plan, key, person); if(why){ if(typeof ccToast === 'function') ccToast(why); return false; } }
      person.yes_at = nowIso(); person.yes_snap = R.yesSnap(plan, key); return true;
    };
    if(typeof tb2Answer === 'function'){
      window.CM_ORIG_ANSWER = window.tb2Answer;
      window.tb2Answer = async function(key, pid, status){
        if(status === 'yes'){ const plan = tbPlan(); if(plan){
          const rec = pid === 'main' ? (plan.cells || {})[key] : ((plan.options || {})[key] || []).find(o => o.id === pid);
          if(!(await guardYes(plan, key, rec))) return; } }
        return CM_ORIG_ANSWER(key, pid, status);
      };
    }
    if(typeof tbSet === 'function'){
      const origSet = window.tbSet;
      window.tbSet = async function(key, status){
        if(status === 'yes'){ const plan = tbPlan(); if(plan && !(await guardYes(plan, key, (plan.cells || {})[key]))) return; }
        return origSet(key, status);
      };
    }
    /* the people panel: a yes that needs a recheck says so on its row */
    if(typeof tb2PeopleHtml === 'function'){
      const origPeople = window.tb2PeopleHtml;
      window.tb2PeopleHtml = function(plan, key){
        const h = origPeople(plan, key); if(!checksOn()) return h;
        const rc = R.yesRecheck(plan, key, null, today());
        return rc.need ? '<div style="border:1px solid #F5D9A8;background:#FFF8EC;border-radius:8px;padding:6px 10px;margin-bottom:6px;font-size:12.5px;"><b style="color:#9A6412;">Recheck needed:</b> ' + esc(rc.why) + '. Their yes stays, but it doesn\'t count as covered until someone checks. <button class="cara-btn" style="font-size:11px;" onclick="cmStillYes(\'' + esc(key) + '\')">Still a yes</button> <button class="cara-btn ghost" style="font-size:11px;" onclick="cmNoLonger(\'' + esc(key) + '\')">No longer available</button></div>' + h : h;
      };
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
  setTimeout(install, 0);

  Object.assign(window, { cmCovered:covered, cmFindCaregivers:findCaregivers, cmPlanFor:planFor, cmShortAdd:shortAdd, cmShortRemove:shortRemove, cmPref:setPref,
    cmStillYes:stillYes, cmNoLonger:noLonger, cmOtherPlans:otherPlans, cmYesBlock:yesBlock, cmOverlaps:overlaps, cmSlotFrom:slotFrom, cmDaysFrom:daysFrom, cmInstall:install });
})();
