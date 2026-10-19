/* TEAM WORK (Stage 1 of the My Work and Team Work plan, Samantha approved 2026-10-18, plan VZcAbTf7U5ZT8nQt2aXsLz).
   Three tabs, and the rule under all of them: helping never moves ownership. Every family keeps its one Care
   Coordinator for the relationship; whoever handles one urgent task owns that task only.

     My Work       yours: your leads, your families' relationship work, coaching, projects, anything assigned to you by
                   a person, and anything you took from Team Work.
     Team Work     the on-duty pile: call-offs, same-day scheduling, missed clock-ins, time-sensitive family requests,
                   and the cards of a coordinator who is out today. Each card already has a responsible role, a deadline
                   and an escalation path before anybody takes it.
     Up for grabs  unchanged (pool.js).

   Switched by ops_settings.team_work_live (Settings > Team Work, and the Owners Hub Admin page). While it is off nothing
   moves: My Work is exactly as before, and owners see the Team Work tab as a PREVIEW of the real cards.
   Who is working comes from the duty schedule (each coordinator's own windows, weekday by weekday, one-offs included),
   and who is out from the ONE place time off is kept: the Owners Hub Team page's "Out until" (coordinator_staff.out_until),
   the same date lead turns and the fair counts read. No second list.
   Nothing here texts, emails or calls anyone, and nothing here writes a client journey or a lead.
   The rules (place, track, deadline, escalation, onDuty) are pure functions of a ctx, so tests/team-work-test.js runs
   them under node against made-up cards and against the read-only 964 snapshot of the real ones. */
(function(root){
  'use strict';
  const lc = s => String(s == null ? '' : s).trim().toLowerCase();
  const MIN = 60000, HOUR = 36e5;

  /* ── which cards are which ─────────────────────────────────────────────────────────────────────────────────────── */
  /* Confidential: HR, discipline and coaching never reach Team Work (rule 10). Matching is deliberately wide. */
  const CONFIDENTIAL_KINDS = ['discipline', 'writeup', 'write_up', 'corrective', 'corrective_action', 'termination', 'investigation',
    'coaching', 'coaching_followup', 'hr', 'hr_case', 'accommodation', 'leave', 'injury', 'complaint_staff', 'offboarding'];
  const CONFIDENTIAL_DOMAINS = ['caregiver_performance', 'hr', 'human_resources'];
  /* The on-duty pile: operational work either coordinator can do while on duty (rule 2). */
  const TEAM_KINDS = ['coverage', 'staffing_issue', 'staffing', 'coverage_outcome', 'family_call', 'call_followup', 'confirm_times',
    'evv_fix', 'evv_review', 'late_notice', 'visit_risk', 'callout', 'call_off', 'running_late', 'missed_clockin', 'missed_clockout'];
  const TEAM_OPENERS = /^(timekeeper|late-watch|callout|quiet-callout|confirm_times|axiscare-watch|ongoing-sweep|call-tasks|attendance-watch)/;
  /* A person made it, so a person decided whose it is (rule 1: explicitly assigned). */
  const PERSON_OPENERS = ['person', 'quick-capture', 'phone', 'capture'];
  /* Relationship and personal work: always the owner's, even when the Hub opened it. */
  const MINE_KINDS = ['relationship_call', 'journey', 'project', 'new_lead', 'lead', 'new_family_call', 'review', 'recurring', 'promise',
    'care_plan_note', 'follow_up', 'future_check_back'];
  /* Time-sensitive deadlines when the card has none of its own (minutes after it opened). */
  const DEFAULT_MINUTES = { coverage:30, callout:30, call_off:30, staffing_issue:15, staffing:30, family_call:60, coverage_outcome:120,
    call_followup:240, confirm_times:240, evv_fix:240, evv_review:240, late_notice:15, running_late:15, visit_risk:60, missed_clockin:0, missed_clockout:60 };

  function confidential(it){
    if(!it) return false;
    if(it.sensitive) return true;
    const k = lc(it.kind), d = lc(it.domain);
    return CONFIDENTIAL_KINDS.indexOf(k) > -1 || CONFIDENTIAL_DOMAINS.indexOf(d) > -1 || /^hr[_-]/.test(k) || /coach/.test(k);
  }
  function personMade(it){ return PERSON_OPENERS.indexOf(lc(it.opened_by)) > -1; }
  function offered(it){ const p = it && it.pool; return !!(p && p.by && !p.taken_at && !p.withdrawn_at); }
  function teamKind(it){
    const k = lc(it.kind);
    if(MINE_KINDS.indexOf(k) > -1) return false;
    if(TEAM_KINDS.indexOf(k) > -1) return true;
    if(TEAM_OPENERS.test(lc(it.opened_by))) return true;
    /* a red shift-note flag (urgent) is a now problem; a yellow one is the family's coordinator's follow-up */
    if(k === 'care_note' || lc(it.opened_by) === 'care-note-flag') return lc(it.urgency) === 'urgent';
    return false;
  }

  /* ── time ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
  function ymdChicago(t){
    const x = new Date(t); if(isNaN(x)) return '';
    const p = new Intl.DateTimeFormat('en-CA', { timeZone:'America/Chicago', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(x);
    const g = k => (p.find(y => y.type === k) || {}).value || '';
    return g('year') + '-' + g('month') + '-' + g('day');
  }
  function endOfDayMs(ctx){ const e = new Date(ctx.now); e.setHours(23, 59, 59, 999); return e.getTime(); }
  function ms(v){ const t = Date.parse(v || ''); return isNaN(t) ? null : t; }

  /* ── who is out, who is working ───────────────────────────────────────────────────────────────────────────────── */
  /* Out = the Team page's "Out until" date: out from now through that day (it has no start date). */
  function outOn(staff, email, ymd){
    const e = lc(email), s = (Array.isArray(staff) ? staff : []).find(x => x && lc(x.email || x.primary_email) === e);
    const until = s ? String(s.out_until || '').slice(0, 10) : '';
    return until && ymd <= until ? { until, why:'out until ' + until } : null;
  }
  /* The coordinators working at a moment, first-up first. First up: the earliest shift end that is more than 30 minutes
     away (so after 1:30 Angiel is first while Krystal finishes); when everyone ends within 30 minutes, the latest end. */
  function onDuty(ctx, at){
    const t = at == null ? ctx.now : at, ymd = ymdChicago(t);
    const on = (ctx.coordinators || []).map(lc).filter(e => !outOn(ctx.staff, e, ymd)).map(e => ({ email:e, end:ctx.shiftEnd(e, t) }))
      .filter(x => x.end != null);
    const far = on.filter(x => x.end - t > 30 * MIN).sort((a, b) => a.end - b.end);
    const near = on.filter(x => x.end - t <= 30 * MIN).sort((a, b) => b.end - a.end);
    return far.concat(near).map(x => x.email);
  }

  /* ── the three tracks (rule 7) ────────────────────────────────────────────────────────────────────────────────── */
  function track(it, ctx){
    const e = it.escalation;
    if(lc(it.urgency) === 'urgent' || /timekeeper/.test(lc(it.opened_by)) || (e && !e.cleared_at && e.level === 'urgent')) return 'care';
    const m = ctx.minsToShift ? ctx.minsToShift(it) : null;
    if(m != null && m <= 180) return 'care';
    return teamKind(it) ? 'today' : 'ordinary';
  }
  function deadline(it, ctx){
    const d = ms(it.due);
    if(d != null) return { at:d, from:'card' };
    const c = ms(it.created_at) || ctx.now, k = lc(it.kind);
    const t = track(it, ctx);
    const mins = t === 'care' ? 0 : (DEFAULT_MINUTES[k] != null ? DEFAULT_MINUTES[k] : (t === 'today' ? 240 : 24 * 60));
    return { at:c + mins * MIN, from:'rule' };
  }
  /* The path, in the approved words. Only the care-at-risk track ever texts anyone. */
  function escalation(it, ctx){
    const t = track(it, ctx);
    if(t === 'care') return { track:t, steps:[
      { at:0, who:'everyone on duty', how:'on screen' },
      { at:10, who:'the person in charge', how:'on screen' },
      { at:20, who:'Samantha', how:'text' },
      { at:35, who:'Zach', how:'text' } ],
      words:'Care at risk: everyone on duty now. 10 min: the person in charge. 20 min: text to Samantha. 35 min: text to Zach.' };
    if(t === 'today') return { track:t, steps:[
      { at:15, who:'everyone on duty', how:'on screen', from:'open' },
      { at:0, who:'the person in charge', how:'on screen', from:'deadline' },
      { at:60, who:'Owner Overview', how:'on screen', from:'deadline' } ],
      words:'Not taken in 15 min: alert to everyone on duty. Deadline missed: the person in charge. An hour after: Owner Overview. No texts.' };
    return { track:t, steps:[
      { days:1, who:'the person in charge', how:'on screen' }, { days:3, who:'Owner Overview', how:'on screen' } ],
      words:'Late: the owner’s Late lane. 1 business day late: the person in charge. 3 business days: Owner Overview. No texts.' };
  }

  /* ── where a card goes (rules 1 to 4, 10) ─────────────────────────────────────────────────────────────────────── */
  /* Returns { tab, why, ... }. tab: 'team' | 'mine' (owner = .person) | 'grabs' | 'unassigned' | 'closed'. */
  function place(it, ctx){
    if(!it || it.status !== 'open') return { tab:'closed', why:'not open' };
    const owner = lc(it.owner), claimed = lc(it.claimed_by);
    if(confidential(it)) return { tab:owner ? 'mine' : 'unassigned', person:owner, why:'confidential', confidential:true };
    if(offered(it)) return { tab:'grabs', person:owner, why:'offered' };
    /* The on-duty pile: operational work the Hub opened, until somebody takes it. Whoever it was routed to, it is the
       on-duty coordinator's to pick up, so an absent coordinator's call-off is simply Team Work, not "covering". */
    const operational = !personMade(it) && teamKind(it);
    if(operational && !claimed) return { tab:'team', why:'operational' };
    /* Covering (the day plan): a coordinator out today; their own work that is late or due today is done by whoever is
       on duty, and stays theirs. Projects and journeys wait for them. */
    const ymd = ymdChicago(ctx.now), out = owner ? outOn(ctx.staff, owner, ymd) : null;
    if(out && !operational && (!claimed || claimed === owner) && ['project', 'journey'].indexOf(lc(it.kind)) === -1){
      const d = ms(it.due);
      if(d != null && d <= endOfDayMs(ctx)) return { tab:'team', why:'covering', covering:{ person:owner, why:out.why || 'out today' } };
    }
    if(claimed) return { tab:'mine', person:claimed, why:claimed === owner ? 'taken' : 'helping, still ' + owner + '\u2019s' };
    if(personMade(it)) return { tab:owner ? 'mine' : 'unassigned', person:owner, why:'made by a person' };
    return { tab:owner ? 'mine' : 'unassigned', person:owner, why:MINE_KINDS.indexOf(lc(it.kind)) > -1 ? 'relationship' : 'owner' };
  }
  /* Everything a Team Work card shows before anybody takes it (rule 5). */
  function teamCard(it, ctx){
    const p = place(it, ctx), dl = deadline(it, ctx), es = escalation(it, ctx);
    return Object.assign({}, p, { role:'Care Coordinator on duty', deadline:dl, escalation:es, track:es.track,
      late:dl.at < ctx.now, family:ctx.familyCC ? lc(ctx.familyCC(it)) : '' });
  }

  /* Due times follow the owner's hours (approved): an ordinary card due while its owner isn't working counts from the
     end of their next working stretch. Care-at-risk and Team Work cards keep their own time. */
  function shiftDue(it, ctx){
    const d = ms(it.due); if(d == null || !it.owner || !ctx.shiftEnd || !ctx.nextShift) return null;
    if(track(it, ctx) !== 'ordinary' || teamKind(it)) return null;
    const o = lc(it.owner);
    if(ctx.shiftEnd(o, d) != null) return null;           /* working then: the card's own time stands */
    const n = ctx.nextShift(o, d); if(!n) return null;    /* no hours on file: the card's own time stands */
    return n.end;
  }

  const CORE = { confidential, personMade, offered, teamKind, track, deadline, escalation, place, teamCard, onDuty, outOn, shiftDue,
    ymdChicago, TEAM_KINDS, MINE_KINDS, CONFIDENTIAL_KINDS };
  if(typeof module !== 'undefined' && module.exports){ module.exports = CORE; return; }

  /* ═══════════════════════════════════ in the Hub ═══════════════════════════════════════════════════════════════ */
  const W = root;
  /* DATA is a top-level let in index.html, so it is not on window: read it by name */
  const D = () => { try{ return DATA || {}; }catch(e){ return {}; } };
  const esc = s => (typeof W.escapeHtmlComms === 'function' ? W.escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
  const settings = () => (D().ops_settings) || {};
  const me = () => { try{ return lc(W.ccActor().email); }catch(e){ return ''; } };
  const isOwner = () => { try{ return !!W.ccIsOwner(); }catch(e){ return false; } };
  const nameOf = e => { try{ return (typeof W.opsOwnerName === 'function' && W.opsOwnerName(e)) || String(e || '').split('@')[0]; }catch(_){ return String(e || '').split('@')[0]; } };
  const first = e => String(nameOf(e) || '').split(' ')[0];
  const on = () => settings().team_work_live === true;
  /* The tab: everyone once it is on; while it is off, owners see it as a preview. */
  const visible = () => on() || isOwner();

  /* A coordinator's own duty windows that cover a moment (any area), through the duty choke point so planned and
     inactive rows never count. Returns that stretch's end (ms) or null when they aren't working. */
  function shiftEnd(email, t){
    const e = lc(email), when = new Date(t);
    const ws = ((D().duty_windows) || []).filter(w => lc(w.person) === e && (typeof W.dutyCoversAt === 'function' ? W.dutyCoversAt(w, when) : false));
    if(!ws.length) return null;
    let best = null;
    ws.forEach(w => {
      let end = null;
      if(w.start && w.end) end = Date.parse(w.end);
      else if(w.recur){ const [h, m] = String(w.recur.to || '23:59').split(':').map(Number); const x = new Date(when); x.setHours(h, m || 0, 0, 0);
        if(x.getTime() <= when.getTime()) x.setDate(x.getDate() + 1); end = x.getTime(); }
      if(end != null && (best == null || end > best)) best = end;
    });
    return best;
  }
  /* The next working stretch at or after t (looks 8 days ahead in 15-minute steps, cheap and recurrence-proof). */
  function nextShift(email, t){
    for(let m = 0; m <= 8 * 24 * 60; m += 15){
      const at = t + m * MIN, end = shiftEnd(email, at);
      if(end != null && !outOn(D().coordinator_staff, email, ymdChicago(at))) return { start:at, end };
    }
    return null;
  }
  function coordinators(){ try{ return (W.TA && W.TA.coordinators()) || []; }catch(e){ return []; } }
  function leadFor(it){
    const L = (D().leads) || [], ids = [it.lead_id, it.source_id].filter(Boolean).map(String);
    return L.find(l => l && ids.indexOf(String(l.id)) > -1) || null;
  }
  function axFor(it){
    let ax = String(it.client_ax || it.client_axiscare_id || '').trim();
    if(!ax && it.coverage_case_id){ const c = ((D().coverage_cases) || []).find(x => x && x.id === it.coverage_case_id); if(c) ax = String(c.client_axiscare_id || '').trim(); }
    return ax;
  }
  /* The family's Care Coordinator: the journey's, else the lead's. Read only; nothing here ever changes it. */
  function familyCC(it){
    try{
      const l = leadFor(it), ax = axFor(it) || (l && String(l.axiscare_client_id || '')) || '';
      let j = null; try{ j = typeof W.cjJourneyFor === 'function' ? W.cjJourneyFor(l ? { lead:l } : { ax }) : null; }catch(e){}
      if(!j && ax && typeof W.cjJourneyFor === 'function') j = W.cjJourneyFor({ ax });
      if(j && j.assigned_cc) return lc(j.assigned_cc);
      let lead = l;
      if(!lead && ax) lead = ((D().leads) || []).find(x => x && String(x.axiscare_client_id || x.client_axiscare_id || '') === ax) || null;
      return lead && typeof W.opsCanonicalPerson === 'function' ? lc(W.opsCanonicalPerson(lead.assigned_coordinator)) : '';
    }catch(e){ return ''; }
  }
  function ctx(){
    return { now:Date.now(), settings:settings(), staff:D().coordinator_staff || [], coordinators:coordinators(), shiftEnd, nextShift, familyCC,
      minsToShift: it => { try{ return typeof W.opsMinsToShift === 'function' ? W.opsMinsToShift(it) : null; }catch(e){ return null; } } };
  }
  function openItems(){ return ((D().ops_items) || []).filter(i => i && i.status === 'open' && (typeof W.opsCanSee !== 'function' || W.opsCanSee(i))); }
  /* The Team Work list, soonest deadline first, care at risk on top. */
  function list(){
    const c = ctx();
    return openItems().map(i => ({ it:i, tc:teamCard(i, c) })).filter(x => x.tc.tab === 'team')
      .sort((a, b) => ((a.tc.track === 'care' ? 0 : 1) - (b.tc.track === 'care' ? 0 : 1)) || (a.tc.deadline.at - b.tc.deadline.at));
  }
  /* For myWorkBuckets: the ids that sit in Team Work, and the covering cards someone has taken. Empty while it is off. */
  function teamIds(){ return on() ? new Set(list().map(x => x.it.id)) : new Set(); }

  /* ── Take it ── a Team Work card becomes the taker's task. The family's coordinator is never touched (rule 2/4): only
     this card's owner changes, and only from "the on-duty pile". A covering card is taken as help: it stays the absent
     coordinator's, the taker is recorded as handling it (the Hub's existing "I've got it"). */
  async function take(id){
    const it = openItems().find(x => x.id === id); if(!it) return;
    const a = (() => { try{ return W.ccActor(); }catch(e){ return {}; } })(), who = lc(a.email); if(!who) return;
    const p = place(it, ctx());
    if(p.tab !== 'team'){ try{ W.ccToast('Someone already has this one.'); }catch(e){} if(typeof W.myWorkRefresh === 'function') W.myWorkRefresh(); return; }
    const at = new Date().toISOString();
    if(p.why === 'covering'){
      it.claimed_by = who; it.claimed_by_name = a.name || who; it.claimed_at = at;
      it.covering = { for:p.covering.person, by:who, at };
      if(typeof W.opsLog === 'function') W.opsLog(it, 'Covering for ' + first(p.covering.person) + ' (out today). Still ' + first(p.covering.person) + '’s.');
    } else {
      const before = lc(it.owner);
      it.owner_history = (Array.isArray(it.owner_history) ? it.owner_history : []).concat([{ from:before || null, to:who, at, by:who, why:'took it from Team Work' }]);
      it.owner = who; it.owner_name = a.name || nameOf(who);
      it.claimed_by = who; it.claimed_by_name = a.name || who; it.claimed_at = at;
      it.team_taken = { by:who, at, from:before || null };
      if(it.escalation && !it.escalation.cleared_at){ it.escalation.cleared_at = at; it.escalation.cleared_why = 'taken'; }
      if(it.sub_state !== 'waiting'){ it.sub_state = 'working'; if(!it.started_at) it.started_at = at; }
      if(typeof W.opsLog === 'function') W.opsLog(it, 'Took it from Team Work');
    }
    try{ W.opEvent('item_team_taken', { item:it, summary:(a.name || who) + (p.why === 'covering' ? ' is covering: ' : ' took it from Team Work: ') + (it.about || it.title || '') }); }catch(e){}
    if(typeof W.persist === 'function') await W.persist('ops_items', it);
    try{ W.ccToast(p.why === 'covering' ? 'You’re covering it. It stays ' + first(p.covering.person) + '’s.' : 'Yours now. It’s in your My Work.'); }catch(e){}
    if(typeof W.myWorkRefresh === 'function') W.myWorkRefresh();
  }

  /* ── the tab ── */
  function fmtTime(t){ const d = new Date(t), now = new Date(); const same = d.toDateString() === now.toDateString();
    return (same ? '' : d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) + ' ') + d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' }); }
  function cardHtml(x){
    const it = x.it, tc = x.tc;
    const fam = tc.family ? first(tc.family) + '’s family' : '';
    const chip = (t, bg, fg) => '<span style="border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:700;background:' + bg + ';color:' + fg + ';white-space:nowrap;">' + esc(t) + '</span>';
    const routed = lc(it.owner) && !tc.covering ? ' (routed to ' + first(it.owner) + ')' : '';
    let act = '';
    try{ if(typeof W.obligationOpenAction === 'function') act = W.obligationOpenAction(it) || ''; }catch(e){}
    return '<div class="card tw-card" data-id="' + esc(it.id) + '" style="padding:12px 14px;margin:0 0 8px;border-left:4px solid ' + (tc.track === 'care' ? 'var(--red)' : tc.late ? 'var(--amber,#B7791F)' : 'var(--teal,#1F7A8C)') + ';">'
      + '<div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;">'
      + '<div style="flex:1 1 300px;min-width:0;"><b>' + esc(it.title || it.about || 'Untitled') + '</b>'
      + (it.detail ? '<div class="field-note" style="margin-top:2px;">' + esc(String(it.detail).slice(0, 300)) + '</div>' : '') + '</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;"><button class="primary" style="padding:6px 13px;font-size:13px;" onclick="TW.take(\'' + esc(it.id) + '\')"'
      + (on() ? '' : ' disabled title="Preview: Team Work is switched off"') + '>' + (tc.covering ? 'I’ll cover it' : 'Take it') + '</button></div></div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">'
      + chip('Responsible: ' + tc.role + routed, 'var(--bg)', 'var(--navy)')
      + chip((tc.late ? 'Late since ' : 'Deadline ') + fmtTime(tc.deadline.at) + (tc.deadline.from === 'rule' ? ' (set by rule)' : ''), tc.late ? '#FBECEA' : 'var(--bg)', tc.late ? '#9B2C22' : 'var(--navy)')
      + (fam ? chip(fam, '#E8F4EC', '#1E6B45') : chip('No family coordinator on file', 'var(--bg)', 'var(--text-muted)'))
      + (tc.covering ? chip('Covering for ' + first(tc.covering.person) + ', ' + tc.covering.why, '#FDF3E2', '#8A5A00') : '')
      + '</div>'
      + '<div class="field-note" style="margin-top:6px;">' + esc(tc.escalation.words) + '</div>'
      + (act ? '<div>' + act + '</div>' : '')
      + '</div>';
  }
  function render(wrap){
    if(!wrap) return;
    const c = ctx(), rows = list(), duty = onDuty(c), ymd = ymdChicago(c.now);
    const outToday = (c.coordinators || []).filter(e => outOn(c.staff, e, ymd));
    const lane = (label, note, color, xs) => xs.length ? '<div style="margin:16px 0 8px;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;"><b style="font-size:12.5px;letter-spacing:.06em;color:' + color + ';">' + label + ' · ' + xs.length + '</b><span class="field-note">' + note + '</span></div>' + xs.map(cardHtml).join('') : '';
    let h = on() ? '' : '<div class="card" style="padding:10px 14px;margin-bottom:10px;background:#FDF3E2;color:#8A5A00;"><b>Preview, switched off.</b> Only owners see this tab. Nothing has moved: everyone’s My Work is exactly as before until Team Work is turned on in Settings.</div>';
    h += '<div class="card" style="padding:12px 16px;margin-bottom:10px;background:#EAF4F6;"><b style="color:var(--navy);">The team’s pile.</b> The Hub made these and nobody has taken them yet. Whoever is on duty works from the top. Take it and it moves to your My Work with your name on it. The family keeps its own Care Coordinator either way.'
      + '<div class="field-note" style="margin-top:6px;">On duty now: ' + (duty.length ? duty.map((e, i) => esc(first(e)) + (i === 0 && duty.length > 1 ? ' (first up)' : '')).join(', ') : '<b>nobody on the schedule</b> (care at risk follows the ladder)')
      + (outToday.length ? ' · Out today: ' + outToday.map(e => esc(first(e))).join(', ') : '') + '</div></div>';
    const care = rows.filter(x => x.tc.track === 'care'), cover = rows.filter(x => x.tc.track !== 'care' && x.tc.covering),
      rest = rows.filter(x => x.tc.track !== 'care' && !x.tc.covering);
    h += lane('CARE AT RISK', 'someone may be without care; anyone can act first', 'var(--red)', care)
      + lane('TIME-SENSITIVE', 'soonest deadline first', 'var(--navy)', rest)
      + lane('COVERING', 'a coordinator is out today; it stays theirs, you do the task', '#8A5A00', cover);
    if(!rows.length) h += '<div class="card" style="padding:22px;text-align:center;">Nothing waiting for the team right now.</div>';
    wrap.innerHTML = h;
  }

  /* ── Settings > Team Work (owners) ── */
  function setFill(){
    const box = document.getElementById('twSet'); if(!box) return;
    const owner = isOwner(), cc = coordinators(), staff = D().coordinator_staff || [];
    const today = ymdChicago(Date.now());
    const hours = cc.map(e => {
      const ws = ((D().duty_windows) || []).filter(w => lc(w.person) === e && w.active !== false && w.recur && !(typeof W.rowPlanned === 'function' && W.rowPlanned(w)));
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const txt = ws.length ? ws.map(w => (w.recur.days || []).map(d => days[d]).join(', ') + ' ' + (typeof W.dutyClockRange === 'function' ? W.dutyClockRange(w.recur.from, w.recur.to) : w.recur.from + '-' + w.recur.to)).join('; ') : '<b style="color:var(--red);">no hours on the duty schedule</b>';
      return '<li>' + esc(nameOf(e)) + ': ' + txt + '</li>';
    }).join('');
    box.innerHTML = '<div class="field-note" style="margin:4px 0 8px;">' + (on() ? '<b style="color:#1E8449;">On.</b> Team Work is in everyone’s My Work.' : '<b style="color:#B7791F;">Off.</b> Owners see Team Work as a preview; nobody’s My Work has changed.') + '</div>'
      + '<div><b style="font-size:13px;">Who is working</b> <span class="field-note">(from the duty schedule; change hours in Responsible now › Manage)</span><ul style="margin:4px 0 10px;">' + (hours || '<li>No Care Coordinators found.</li>') + '</ul></div>'
      + '<div><b style="font-size:13px;">Who is out</b> <span class="field-note">(the Owners Hub Team page\u2019s \u201cOut until\u201d, the same date lead turns use; their cards due that day show in Team Work as Covering)</span><ul style="margin:4px 0 10px;">'
      + (cc.map(e => { const o = outOn(staff, e, today); return o ? '<li>' + esc(nameOf(e)) + ': out until ' + esc(o.until) + '</li>' : ''; }).join('') || '<li class="field-note">Nobody is marked out.</li>') + '</ul></div>'
      + (owner ? '<button class="secondary" id="twToggleBtn" onclick="TW.toggle(this)">' + (on() ? 'Turn off Team Work' : 'Turn on Team Work') + '</button> <span class="field-note" id="twSaved"></span>'
        : '<div class="field-note">Only Samantha or Zachary can turn Team Work on or off.</div>');
  }
  async function merge(fn, what){ if(typeof W.tkMerge !== 'function') return { error:{ message:'saving is not available here' } }; return W.tkMerge(fn, what); }
  const SW_ON = 'Turn on Team Work?\n\nFrom now:\n· call-offs, missed clock-ins, same-day scheduling and time-sensitive family requests the Hub opened move from My Work to a Team Work tab, until someone takes them\n· each one shows the responsible role, its deadline and its escalation path\n· the cards of a coordinator marked out today show there as Covering\n· Take it makes that one task yours; the family keeps its Care Coordinator\n\nNothing is texted, emailed or called because of this, and escalation rules are unchanged.';
  const SW_OFF = 'Turn off Team Work? Everyone’s My Work goes back to how it was; owners keep the preview. Cards already taken stay with whoever took them.';
  async function toggle(btn){
    if(!isOwner()){ alert('Only Samantha or Zachary can turn Team Work on or off.'); return; }
    const want = !on();
    const ok = typeof W.ccConfirm === 'function' ? await W.ccConfirm(want ? SW_ON : SW_OFF) : confirm(want ? SW_ON : SW_OFF);
    if(!ok) return;
    if(btn) btn.disabled = true;
    const r = await merge(m => { m.team_work_live = want; if(want && !m.team_work_live_since) m.team_work_live_since = new Date().toISOString(); return ['Team Work ' + (want ? 'ON' : 'OFF')]; }, 'Team Work');
    if(btn) btn.disabled = false;
    const sv = document.getElementById('twSaved'); if(sv) sv.textContent = r && r.error ? 'Could not save: ' + r.error.message : (want ? 'On.' : 'Off.');
    setFill(); if(typeof W.myWorkRefresh === 'function') W.myWorkRefresh();
  }

  /* Care at risk never goes quiet: while Team Work is on, its care-at-risk cards also sit at the top of Today (and in the
     "need you now" number) for everyone on duty; when nobody is on the schedule, for everyone. */
  function careForMe(){
    if(!on()) return [];
    const c = ctx(), duty = onDuty(c), m = me();
    if(duty.length && duty.indexOf(m) === -1) return [];
    return list().filter(x => x.tc.track === 'care');
  }
  function careHtml(){ return careForMe().map(cardHtml).join(''); }
  W.TW = Object.assign({}, CORE, { on, visible, ctx, list, teamIds, take, render, careForMe, careHtml, cardHtml, setFill, toggle, familyCC, shiftEnd, nextShift,
    count: () => list().length, SW_ON, SW_OFF });
})(typeof window !== 'undefined' ? window : globalThis);
