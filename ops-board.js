/* =====================================================================================================================
   OPERATIONS BOARD (Samantha 2026-11-05, looking at My Work > Follow-ups: "Should we make all of my work on this here - take
   away all subtabs ... everything goes on one Operations Board instead of my work?"; plan
   https://claude.ai/artifact/NM8TB2ntx3CcwLV4XpWMQR; "Approved with your six recommendations. Build it switched off, in
   practice mode."). window.OPB.

   One table for all of My Work, in the Follow-ups look: tiles (Care or safety, Yours, Today, Later this week, Nobody's
   yet), one row of menus (When, Who, Need, Owner), then Who | What came in | Need | Owner | When | Waiting | Do it |
   Move it | Done. Every open card the person can see is a row; the tabs become tiles and menus. Do it opens the card
   itself under the row, with the card's own buttons, so every kind of work keeps working exactly as it does today.
   Her six picks:
     1 the side menu says Operations Board instead of My Work (only while it is on)
     2 it opens on your own rows plus care or safety rows nobody has taken; Owner: Everyone shows the whole office
     3 write-up approvals are rows, only for the approve list; Review opens the same approvals card
     4 Board cleanup (owners): one-time clear of rows more than 7 days past their day, never care or safety, never a
       promise made on a call, with the reason "Board cleanup" kept on every card and a one-day Undo (mywork-tidy.js)
     5 rows nobody owns sit under Nobody's yet with Take it
     6 Follow-ups rows join the board as cards once Follow-ups is on (cc-followups.js; that switch is hers)
   Switch: ops_settings.ops_board_live (Owners Hub Admin page). Off = practice: owners see a first tab "Operations Board
   (practice)" and every other tab works as before; nobody else sees anything new. On = everyone opens on the board, the
   other tabs are hidden behind "Older views" for 7 days after it was turned on, and the menu says Operations Board.
   The Team Work rules, Ask for help, End my shift and the care-at-risk ladder are untouched: this only draws the cards.
   Nothing here texts, emails or calls anyone. No em dashes in anything a person reads.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const DAY = 864e5, HOUR = 36e5;
  const lc = s => String(s == null ? '' : s).trim().toLowerCase();
  const ms = v => { const t = Date.parse(v || ''); return isNaN(t) ? null : t; };

  /* ── the rules (pure; tests/ops-board-test.js runs them under node) ── */
  function liveOn(settings){ return !!(settings && settings.ops_board_live === true); }
  /* Older views stay one week after it was turned on (no stamp: they stay) */
  function olderViews(settings, now){ const s = ms(settings && settings.ops_board_live_since); return s == null || now - s < 7 * DAY; }
  /* Care or safety: urgent, an incident, escalated, or the Team Work care-at-risk track (passed in as careTrack) */
  function care(it, careTrack){
    const e = it && it.escalation;
    return lc(it.urgency) === 'urgent' || lc(it.domain) === 'incidents' || lc(it.sub_state) === 'escalated'
      || !!(e && !e.cleared_at && e.level === 'urgent') || !!careTrack;
  }
  /* Care or safety RIGHT NOW (the red tile and the Need column): the same 12-hour rule as Today's Act now and Team Work.
     A red card from three weeks ago is late work, not something happening now (her screenshot 2026-11-05: 49 "care or
     safety" rows, most of them weeks old). The Board cleanup still never clears a card that was ever care or safety. */
  function careNow(it, careTrack, now, past){
    if(careTrack) return true;
    if(!care(it) || past) return false;
    const d = ms(it.due) != null ? ms(it.due) : ms(it.created_at);
    return d == null || now - d <= 12 * HOUR;
  }
  /* A promise made on a call, or a call nobody could read: never cleared by the cleanup */
  function promise(it){ const id = String(it && it.id || ''); return id.indexOf('cfp_') === 0 || id.indexOf('cfu_') === 0; }
  function whoOf(it){
    const k = lc(it.kind), d = lc(it.domain);
    if(it.applicant_id || d === 'recruiting_orientation' || /^(step1|step2|interview|offer|orientation|hepb|prn_link|last_chance|gone_quiet|axiscare_hire|invite_followup)/.test(k)) return 'applicant';
    if(k === 'new_lead' || k === 'new_family_call' || /^ops_lead_/.test(String(it.id || '')) || (it.lead_id && !it.client_ax)) return 'lead';
    if(it.client_ax || it.client_person_id || /^(client_care|family_enquiries|client_onboarding)$/.test(d) || /^(journey|family_|profile_intro|care_packet|plan_recheck|confirm_times|relationship)/.test(k)) return 'family';
    if(it.caregiver_ax || it.caregiver || /^(caregivers|caregiver_performance|scheduling_coverage|money)$/.test(d) || /^(coverage|staffing|missed_note|late_notice|caregiver)/.test(k)) return 'caregiver';
    return 'office';
  }
  function needOf(it, careTrack, now, past){
    const k = lc(it.kind), d = lc(it.domain);
    if(now == null ? care(it, careTrack) : careNow(it, careTrack, now, past)) return 'care';
    if(k === 'care_note') return 'note';
    if(k === 'review') return 'review';
    if(k === 'call_followup' || k === 'reply_needed' || k === 'missed_call' || /_reply$/.test(k)) return 'call';
    if(d === 'scheduling_coverage' || /^(coverage|staffing|confirm_times|late_notice|open_shift)/.test(k)) return 'schedule';
    if(d === 'recruiting_orientation' || d === 'training_compliance' || /^(step1|step2|interview|offer|orientation|hepb|prn_link|invite_followup|axiscare_hire|last_chance|gone_quiet)/.test(k)) return 'hiring';
    if(d === 'client_onboarding' || /^(family_welcome|journey|profile_intro|new_family_call|care_packet|new_lead)/.test(k)) return 'start';
    return 'other';
  }
  const NEED = { care:'Care or safety', note:'Shift-note flag', call:'Call or text back', schedule:'Scheduling', hiring:'Hiring', start:'Family start', approval:'Approval', review:'Review', other:'Other' };
  const WHO = { family:'Family or client', caregiver:'Caregiver', applicant:'Applicant', lead:'Lead', office:'Office' };
  /* when: 'late' | 'today' | 'later' (parked with a wake-up still ahead, or due after today) */
  function whenOf(it, now, parked){
    if(parked) return 'later';
    const d = ms(it.due); if(d == null) return 'today';
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    if(d > end.getTime()) return 'later';
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return d < start.getTime() ? 'late' : 'today';
  }
  /* What the Do it button says (it always opens the card itself, where the real buttons are) */
  function doWord(it){
    const k = lc(it.kind);
    if(k === 'care_note') return 'Read the note';
    if(k === 'coverage' || k === 'open_shift') return 'Find cover';
    if(k === 'coverage_outcome') return 'Was it covered?';
    if(k === 'confirm_times') return 'Confirm times';
    if(k === 'call_followup') return 'See the call';
    if(k === 'reply_needed' || k === 'missed_call' || k === 'new_family_call' || k === 'family_call') return 'Call back';
    if(k === 'step1_countersign') return 'Countersign';
    if(k === 'review') return 'Review';
    if(k === 'send_problem') return 'Fix the send';
    if(k === 'journey') return 'Next step';
    if(!it.owner) return 'Take a look';
    return 'Open';
  }
  /* Rows more than 7 days past their day that the cleanup may clear (her pick 4) */
  function cleanable(it, now, careTrack){
    if(!it || it.status !== 'open' || care(it, careTrack) || promise(it)) return false;
    if(/^(journey|project)$/.test(lc(it.kind))) return false;
    const d = ms(it.due) != null ? ms(it.due) : ms(it.created_at);
    return d != null && now - d > 7 * DAY;
  }
  /* Her pick 2: the board opens on my rows plus care or safety nobody has taken */
  function startView(row, me){ return row.mine || (!row.owner && row.need === 'care'); }

  /* ── THE NEW LAYOUT (Samantha 2026-11-07: "I can't help but feel like we still haven't found the right Operations Board
     items, layout"; plan https://claude.ai/artifact/Ep6gjjMwVNnNLMFbGMZDsg; "Approve all picks"). Three lanes instead of one
     table: Waiting on us (people who called, texted or were promised a call back), Care today, Batches (same-kind work as
     one row with a count). An "Open shifts, next 7 days" card sits on top. "Was it covered?" questions are not shown. Cards
     more than 7 days old fold under "Older than a week", never care, never a promise. Owners see one line per teammate.
     Switch: ops_settings.ops_board_lanes_live (off). While off, owners can try it from "Try the new layout". ── */
  function lanesOn(settings){ return !!(settings && settings.ops_board_lanes_live === true); }
  const WAIT_KINDS = /^(reply_needed|missed_call|new_family_call|family_call)$/;
  const CARE_KINDS = /^(care_note|health_news|missed_note|profile_intro|open_shift|late_notice)$/;
  const HIRING = /^(step1|step2|interview|offer|orientation|hepb|prn_link|invite_followup|axiscare_hire|last_chance|gone_quiet)/;
  /* a call card that is a promise to get back to a person ("Text Cheryl the address", "...; update Joyce", Call back) */
  function waitPromise(it){
    if(!it || lc(it.kind) !== 'call_followup') return false;
    if(promise(it)) return true;
    return /(^|;\s*)(call|text|email|reply|resend|tell|let|update)\b/i.test(String(it.title || '')) || /^(call back|text the|email the)/i.test(String(it.next_action || ''));
  }
  /* which lane: 'hide' | 'wait' | 'care' | 'old' | 'batch' (row carries need and past from rows()) */
  function laneOf(it, row, now){
    const k = lc(it.kind);
    if(k === 'coverage_outcome') return 'hide';           /* her pick 4: stop asking "Was it covered?" */
    if(WAIT_KINDS.test(k) || waitPromise(it)) return 'wait';
    if(row && row.need === 'care') return 'care';
    const d = ms(it.due) != null ? ms(it.due) : ms(it.created_at), made = ms(it.created_at);
    if(CARE_KINDS.test(k) && !(row && row.past) && (made == null || now - made <= 36 * HOUR)) return 'care';
    if(!promise(it) && !care(it) && d != null && now - d > 7 * DAY) return 'old';
    return 'batch';
  }
  function batchOf(it, row){
    const k = lc(it.kind);
    if(row && row.kind === 'approval') return 'approval';
    if(k === 'family_welcome') return 'welcome';
    if(k === 'send_problem') return 'send';
    if(HIRING.test(k) || lc(it.domain) === 'recruiting_orientation') return 'hiring';
    if(k === 'call_followup') return 'calls';
    if(k === 'care_note') return 'notes';
    const n = row && row.need;
    return n === 'schedule' ? 'schedule' : n === 'start' ? 'start' : n === 'review' ? 'review' : 'other';
  }
  const BATCH = { approval:['Write-ups to approve', 'You approve them before they go out'], welcome:['Family welcomes to send', 'From the Family & Contacts tab'],
    send:['Texts or emails that didn\'t go out', 'Fix the number or email, then send again'], hiring:['Hiring steps waiting on the office', 'Step 1, Step 2, Hep B, orientation and more'],
    calls:['Office to-dos from calls', 'Things said on a call that need doing in AxisCare or the Hub'], notes:['Shift notes to read', 'Flags from caregivers\' notes'],
    schedule:['Scheduling', 'Times to confirm, coverage cases'], start:['Family start', 'New families getting started'], review:['Reviews', 'Waiting for a look'], other:['Other office work', 'Everything else'] };
  const BATCH_ORDER = ['approval', 'welcome', 'send', 'calls', 'hiring', 'schedule', 'start', 'notes', 'review', 'other'];
  /* one person shows once in Waiting: the same contact or phone number */
  function personKey(it){
    if(it.contact_id) return 'c:' + it.contact_id;
    const p = String(it.phone || it.phone10 || '').replace(/\D/g, '').slice(-10);
    return p.length === 10 ? 'p:' + p : '';
  }
  /* Open shifts, next N days: AxisCare's unassigned visits ({client,date,start,end,start24}) by day, from today */
  function weekOf(open, now, days){
    const out = [], pad = n => String(n).padStart(2, '0');
    for(let i = 0; i < days; i++){
      const d = new Date(now); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + i);
      const key = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      const shifts = (open || []).filter(s => s && s.date === key).map(s => {
        const t = Date.parse(s.date + 'T' + (s.start24 || '23:59'));
        return { client:s.client || 'A client', start:s.start || '', end:s.end || '', at:t, soon:!isNaN(t) && t - now <= 48 * HOUR };
      }).sort((a, b) => (a.at || 0) - (b.at || 0));
      out.push({ key, day:d.toLocaleDateString('en-US', { weekday:'short' }), num:d.getDate(), shifts });
    }
    return out;
  }
  /* The week card's body (pure, 2026-11-07): a day AxisCare did not answer in full (incomplete_dates from
     axiscare-open-shifts) is never shown as "All covered"; it says it could not be read. */
  function weekCard(open, gaps, now, asked){
    const e = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    const days = weekOf(open, now, 7), all = days.reduce((a, d) => a.concat(d.shifts), []), soon = all.filter(s => s.soon).length;
    const ask = asked || (() => false), nAsked = all.filter(ask).length;
    const g = Array.isArray(gaps) ? gaps : [], gap = k => g.indexOf(k) >= 0, nGap = days.filter(d => gap(d.key)).length;
    return '<div class="opl-week" id="oplWeek"><div class="opl-hd"><h3>Open shifts, next 7 days</h3><small>From AxisCare: visits with no caregiver. Fill them in AxisCare or open a coverage case.</small></div>'
      + '<div class="opl-days">' + days.map(d => '<div class="opl-day"><b>' + e(d.day + ' ' + d.num) + '</b>'
        + d.shifts.map(s => '<span class="opl-sh' + (s.soon ? ' soon' : '') + '">' + e((s.start || '') + ' ' + s.client) + (ask(s) ? '<small>team being asked</small>' : '') + '</span>').join('')
        + (gap(d.key) ? '<span class="opl-gap" style="color:var(--amber,#B45309);font-weight:700;">Couldn\'t read all of this day from AxisCare. Check AxisCare.</span>'
          : (d.shifts.length ? '' : '<span class="opl-ok">All covered</span>')) + '</div>').join('') + '</div>'
      + '<div class="opl-wf">' + (all.length ? '<b>' + all.length + '</b> open this week' + (soon ? ' · <b style="color:var(--red);">' + soon + ' within 48 hours</b>' : '') + (nAsked ? ' · ' + nAsked + ' already have the team being asked' : '')
        : (nGap ? 'No open shifts found on the days AxisCare answered.' : 'Every visit in the next 7 days has a caregiver.'))
        + (nGap ? ' · <b style="color:var(--amber,#B45309);">' + nGap + ' day' + (nGap === 1 ? '' : 's') + ' could not be fully read, so ' + (nGap === 1 ? 'it' : 'they') + ' may be missing open shifts</b>' : '') + ' · <button class="linklike" style="font:inherit;" onclick="switchTab(\'coverage\')">Open the coverage page</button></div></div>';
  }
  const CORE = { liveOn, olderViews, care, careNow, promise, whoOf, needOf, whenOf, doWord, cleanable, startView, NEED, WHO,
    lanesOn, waitPromise, laneOf, batchOf, personKey, weekOf, weekCard, BATCH, BATCH_ORDER };
  if(typeof module !== 'undefined' && module.exports){ module.exports = CORE; return; }

  /* ═══════════════════════════════════ in the Hub ═══════════════════════════════════ */
  const W = root;
  const D = () => { try{ return DATA || {}; }catch(e){ return {}; } };
  const esc = s => (typeof W.escapeHtmlComms === 'function' ? W.escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
  const settings = () => D().ops_settings || {};
  const on = () => liveOn(settings());
  const owner = () => { try{ return !!W.ccIsOwner(); }catch(e){ return false; } };
  const visible = () => on() || owner();
  const me = () => { try{ return lc(W.opsMeKey()); }catch(e){ return ''; } };
  /* a name, never an email address (with no staff list loaded, opsOwnerName hands the email back) */
  const name = e => { let n = ''; try{ n = (typeof W.opsOwnerName === 'function' && W.opsOwnerName(e)) || ''; }catch(_){}
    if(!n || n.indexOf('@') > 0){ const p = String(n || e).split('@')[0]; n = p.charAt(0).toUpperCase() + p.slice(1); } return n; };
  const ls = (k, v) => { try{ if(v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }catch(e){} return null; };

  const S = { tile:'', open:'', clean:false, appr:false, started:false, older:false, f:{ when:'', who:'', need:'', owner:'start' } };
  try{ const s = JSON.parse(ls('opbF') || 'null'); if(s && typeof s === 'object') S.f = Object.assign(S.f, s); }catch(e){}
  const save = () => ls('opbF', JSON.stringify(S.f));

  function careTrackOf(it, c){ try{ return !!(W.TW && c && W.TW.track(it, c) === 'care'); }catch(e){ return false; } }
  function rows(){
    const now = Date.now(), m = me(), c = (W.TW && W.TW.ctx) ? W.TW.ctx() : null;
    const team = (W.TW && W.TW.on()) ? W.TW.teamIds() : new Set();
    const open = (D().ops_items || []).filter(i => i && i.status === 'open' && (typeof W.opsCanSee !== 'function' || W.opsCanSee(i)));
    const out = open.map(it => {
      const ct = careTrackOf(it, c), parked = typeof W.opsParked === 'function' && W.opsParked(it), past = typeof W.opsPastDay === 'function' && W.opsPastDay(it);
      const mine = !!m && (lc(it.owner) === m || (Array.isArray(it.also_for) && it.also_for.some(x => lc(x) === m)) || lc(it.claimed_by) === m);
      return { it, id:it.id, kind:'card', owner:lc(it.owner), mine, team:team.has(it.id), need:needOf(it, ct, now, past), who:whoOf(it), when:whenOf(it, now, parked),
        since:ms(it.created_at), past, clean:cleanable(it, now, ct) };
    });
    /* her pick 3: write-ups waiting on an approver are rows, only for the approve list */
    try{ if(typeof W.discMayApproveAny === 'function' && W.discMayApproveAny()) W.discForMe().forEach(a => out.push({ it:a, id:'appr_' + a.id, kind:'approval',
      owner:m, mine:true, team:false, need:'approval', who:'caregiver', when:'today', since:ms(a.created_at || a.submitted_at), past:false, clean:false })); }catch(e){}
    const R = { care:0, approval:1 }, W2 = { late:0, today:1, later:2 };
    return out.sort((a, b) => ((R[a.need] != null ? R[a.need] : 2) - (R[b.need] != null ? R[b.need] : 2)) || (W2[a.when] - W2[b.when]) || ((a.since || 0) - (b.since || 0)));
  }
  function pass(r, skip){
    const f = S.f, t = S.tile;
    if(t === 'care' && r.need !== 'care') return false;
    if(t === 'mine' && !r.mine) return false;
    if(t === 'today' && r.when === 'later') return false;
    if(t === 'later' && r.when !== 'later') return false;
    if(t === 'nobody' && r.owner) return false;
    if(skip !== 'when' && f.when && r.when !== f.when) return false;
    if(skip !== 'who' && f.who && r.who !== f.who) return false;
    if(skip !== 'need' && f.need && r.need !== f.need) return false;
    if(skip !== 'owner'){
      if(f.owner === 'start' && !t && !startView(r, me())) return false;
      if(f.owner === 'mine' && !r.mine) return false;
      if(f.owner === 'nobody' && r.owner) return false;
      if(f.owner === 'team' && !r.team) return false;
      if(f.owner && f.owner.indexOf('@') > 0 && r.owner !== f.owner) return false;
    }
    return true;
  }
  function count(){ if(!visible()) return 0; return rows().filter(r => r.need === 'care' && (!r.owner || r.mine)).length; }

  /* ── drawing ── */
  const CSS = '<style id="opbCss">'
    + '.opb-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0 0 12px;}'
    + '.opb-tile{all:unset;box-sizing:border-box;cursor:pointer;background:var(--card,#fff);border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:2px;}'
    + '.opb-tile:focus-visible{outline:2px solid var(--teal);outline-offset:2px;}.opb-tile.on{border-color:var(--teal);box-shadow:inset 0 0 0 1px var(--teal);}'
    + '.opb-tile b{font-size:26px;line-height:1;font-variant-numeric:tabular-nums;color:var(--navy);}.opb-tile.red b{color:var(--red);}.opb-tile.gold b{color:var(--amber);}.opb-tile.teal b{color:var(--teal);}'
    + '.opb-tile span{font-weight:700;font-size:14px;}.opb-tile small{color:var(--text-muted);font-size:12px;}'
    + '.opb-menus{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px;}.opb-menus label{display:flex;align-items:center;gap:6px;border:1px solid var(--border);border-radius:999px;padding:3px 6px 3px 12px;font-size:13px;color:var(--text-muted);}'
    + '.opb-menus select{border:0;background:transparent;font-weight:600;font-size:13px;width:auto;padding:2px;}'
    + '.opb-wrap{overflow-x:auto;}.opb{width:100%;border-collapse:collapse;font-size:13.5px;min-width:980px;}'
    + '.opb th{text-align:left;font-size:12px;color:var(--text-muted);padding:8px;border-bottom:1px solid var(--border);}'
    + '.opb td{padding:9px 8px;border-bottom:1px solid var(--border);vertical-align:top;}'
    + '.opb tr.opb-red>td:first-child{box-shadow:inset 4px 0 0 var(--red);}.opb tr.opb-gold>td:first-child{box-shadow:inset 4px 0 0 var(--amber);}'
    + '.opb-name{font-weight:700;color:var(--navy);}.opb-sub{color:var(--text-muted);font-size:12px;}'
    + '.opb-need{display:inline-block;border-radius:6px;padding:1px 8px;font-weight:600;font-size:12px;background:var(--bg);}.opb-need.care{background:var(--red-bg);color:var(--red);}'
    + '.opb-when{display:inline-block;border-radius:6px;padding:1px 8px;font-weight:700;font-size:12px;background:var(--amber-bg);color:var(--amber);}.opb-when.late{background:var(--red-bg);color:var(--red);}.opb-when.later{background:var(--bg);color:var(--navy);}'
    + '.opb button{padding:5px 11px;font-size:12.5px;margin:0 4px 4px 0;white-space:nowrap;}'
    + '.opb-card td{background:var(--bg);padding:10px 12px;}'
    + '</style>';
  function waited(t, now){
    if(!t) return '';
    const m = Math.max(0, Math.round((now - t) / 60000));
    if(m < 60) return m + ' m'; if(m < 24 * 60) return Math.floor(m / 60) + ' h ' + (m % 60) + ' m';
    return Math.floor(m / 1440) + ' d';
  }
  function tiles(all){
    const T = [
      { k:'care', n:all.filter(r => r.need === 'care').length, t:'Care or safety', h:'Anyone\'s, right now', c:'red' },
      { k:'mine', n:all.filter(r => r.mine).length, t:'Yours', h:'Everything you own', c:'teal' },
      { k:'today', n:all.filter(r => r.when !== 'later' && (r.mine || !r.owner)).length, t:'Today', h:'Due or late, yours and nobody\'s', c:'gold' },
      { k:'later', n:all.filter(r => r.when === 'later' && r.mine).length, t:'Later this week', h:'Waiting, with a day to come back', c:'' },
      { k:'nobody', n:all.filter(r => !r.owner).length, t:'Nobody\'s yet', h:'Take it from here', c:'' }
    ];
    return '<div class="opb-tiles">' + T.map(x => '<button class="opb-tile ' + x.c + (S.tile === x.k ? ' on' : '') + '" aria-pressed="' + (S.tile === x.k) + '" onclick="OPB.tile(\'' + x.k + '\')">'
      + '<b>' + x.n + '</b><span>' + esc(x.t) + '</span><small>' + esc(x.h) + '</small></button>').join('') + '</div>';
  }
  function menus(all){
    const sel = (id, label, key, opts) => '<label for="' + id + '">' + label + ' <select id="' + id + '" onchange="OPB.set(\'' + key + '\',this.value)">'
      + opts.map(([v, t]) => '<option value="' + esc(v) + '"' + (S.f[key] === v ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select></label>';
    const people = [...new Set(all.map(r => r.owner).filter(Boolean))].sort((a, b) => name(a).localeCompare(name(b)));
    return '<div class="opb-menus">'
      + sel('opbWhen', 'When', 'when', [['', 'All'], ['late', 'Late'], ['today', 'Today'], ['later', 'Later this week']])
      + sel('opbWho', 'Who', 'who', [['', 'All']].concat(Object.keys(WHO).map(k => [k, WHO[k]])))
      + sel('opbNeed', 'Need', 'need', [['', 'All']].concat(Object.keys(NEED).map(k => [k, NEED[k]])))
      + sel('opbOwner', 'Owner', 'owner', [['start', 'Mine + care nobody has'], ['mine', 'Me'], ['', 'Everyone'], ['nobody', 'Nobody yet']]
          .concat(W.TW && W.TW.on() ? [['team', 'On duty pile (Team Work)']] : []).concat(people.map(p => [p, name(p)])))
      + '</div>';
  }
  function rowHtml(r, now){
    const it = r.it, id = esc(r.id);
    if(r.kind === 'approval'){
      return '<tr class="opb-gold" data-id="' + id + '"><td><div class="opb-name">' + esc(it.caregiver || 'Write-up') + '</div><div class="opb-sub">Caregiver</div></td>'
        + '<td>' + esc((it.level ? it.level + ': ' : '') + (it.reason || '')) + '</td><td><span class="opb-need">Approval</span></td>'
        + '<td>You approve it</td><td><span class="opb-when">Today</span></td><td>' + esc(waited(r.since, now)) + '</td>'
        + '<td><button class="primary" onclick="OPB.approvals()">Review</button></td><td></td><td></td></tr>';
    }
    /* "(phone lead)" is the old placeholder for no name (2026-10-15), not a name */
    const title = (/^\s*\(phone lead\)\s*$/i.test(String(it.about || '')) ? 'Name not on file' : (it.about || it.title || '')), what = (it.about && it.title && it.about !== it.title) ? it.title : (it.detail || '');
    const kindWord = typeof W.opsKindLabel === 'function' ? W.opsKindLabel(it) : it.kind;
    const ownerCell = r.owner ? esc(it.owner_name || name(r.owner)) + (r.team ? '<div class="opb-sub">On duty pile</div>' : '')
      : '<button class="primary" onclick="opsTakeIt(\'' + id + '\')">Take it</button>';
    const whenCell = '<span class="opb-when ' + r.when + '">' + (r.when === 'late' ? 'Late' : r.when === 'later' ? 'Back ' + esc(String(it.check_back || it.due || '').slice(5, 10).replace('-', '/')) : 'Today') + '</span>'
      + (r.past ? '<div class="opb-sub">Its day has passed</div>' : '');
    const openNow = S.open === r.id;
    const closes = !/^(journey|project)$/.test(lc(it.kind));
    let h = '<tr class="' + (r.need === 'care' ? 'opb-red' : r.when !== 'later' ? 'opb-gold' : '') + '" data-id="' + id + '">'
      + '<td><div class="opb-name">' + esc(title) + '</div><div class="opb-sub">' + esc(WHO[r.who]) + ' · ' + esc(kindWord) + '</div></td>'
      + '<td>' + esc(String(what).slice(0, 220)) + (it.detail && what !== it.detail ? '<div class="opb-sub">“' + esc(String(it.detail).slice(0, 160)) + '”</div>' : '') + '</td>'
      + '<td><span class="opb-need' + (r.need === 'care' ? ' care' : '') + '">' + esc(NEED[r.need]) + '</span></td>'
      + '<td>' + ownerCell + '</td><td>' + whenCell + '</td><td style="font-variant-numeric:tabular-nums;">' + esc(waited(r.since, now)) + '</td>'
      + '<td><button class="' + (openNow ? 'ghost' : 'primary') + '" aria-expanded="' + openNow + '" onclick="OPB.toggle(\'' + id + '\')">' + (openNow ? 'Close' : esc(doWord(it))) + '</button></td>'
      + '<td id="opbmv_' + id + '"><button class="ghost" onclick="opsWaitOpen(\'' + id + '\',\'opbmv_' + id + '\')">Later this week</button></td>'
      + '<td id="opbdn_' + id + '">' + (closes ? '<button class="ghost" onclick="opsClose(\'' + id + '\',\'opbdn_' + id + '\')">Done</button>' : '') + '</td></tr>';
    if(openNow && typeof W.myWorkCard === 'function') h += '<tr class="opb-card"><td colspan="9">' + W.myWorkCard(it, -1) + '</td></tr>';
    return h;
  }
  function cleanHtml(all){
    if(!owner()) return '';
    const L = all.filter(r => r.clean), last = W.MWTidy && W.MWTidy.state && W.MWTidy.state.last;
    let h = '';
    if(last && last.why === 'Board cleanup' && last.ids && last.ids.length)
      h += '<div class="card" style="padding:9px 14px;margin:0 0 10px;background:#E7F6EC;color:#1E6B45;font-size:13px;">Board cleanup cleared ' + last.ids.length + ' card' + (last.ids.length === 1 ? '' : 's')
        + '. <button class="linklike" style="font:inherit;" onclick="OPB.undo()">Undo</button> (for one day)</div>';
    if(!L.length) return h;
    if(!S.clean) return h + '<div class="field-note" style="margin:0 0 10px;">Owners: ' + L.length + ' open card' + (L.length === 1 ? ' is' : 's are')
      + ' more than 7 days past its day. <button class="linklike" style="font:inherit;" onclick="OPB.cleanOpen()">Board cleanup</button></div>';
    const by = {}; L.forEach(r => { const k = r.owner || 'nobody'; by[k] = (by[k] || 0) + 1; });
    return h + '<div class="card" style="padding:14px 16px;margin:0 0 12px;border:2px solid var(--navy);"><b style="color:var(--navy);">Board cleanup: clear ' + L.length + ' old card' + (L.length === 1 ? '' : 's') + '?</b>'
      + '<div class="field-note" style="margin:6px 0;">Every open card more than 7 days past its day. Never care or safety, never a promise made on a call, never a client\'s journey step. '
      + Object.keys(by).sort((a, b) => by[b] - by[a]).map(k => esc(k === 'nobody' ? 'Nobody' : name(k)) + ' ' + by[k]).join(' · ') + '</div>'
      + '<div class="field-note" style="margin:0 0 8px;">Each card closes with the reason "Board cleanup", your name and the time. Nothing is deleted and nothing is sent. Undo reopens them for one day.</div>'
      + '<button class="primary" style="padding:7px 16px;" onclick="OPB.cleanGo(this)">Clear them</button> <button class="ghost" style="padding:7px 14px;" onclick="OPB.cleanClose()">Cancel</button></div>';
  }
  function olderHtml(){
    if(!on() || !olderViews(settings(), Date.now())) return '';
    const was = S.older; S.older = true;   /* the full list of tabs, not just the board */
    let T = [];
    try{ T = typeof W.myWorkTabs === 'function' ? W.myWorkTabs(typeof W.myWorkBuckets === 'function' ? W.myWorkBuckets() : null).filter(([k]) => k !== 'board') : []; }catch(e){}
    S.older = was;
    return '<div class="field-note" style="margin-top:14px;text-align:center;">Older views, for one week: '
      + T.map(([k, l]) => '<button class="linklike" style="font:inherit;" onclick="OPB.older(\'' + k + '\')">' + esc(l) + '</button>').join(' · ') + '</div>';
  }
  /* ═══ the new layout ═══ */
  /* on: everyone gets it, though an owner can still pick the table; off: only an owner who chose to try it */
  const lanesView = () => { const pref = ls('opbLanes'); if(owner() && pref === '0') return false; return lanesOn(settings()) || (owner() && pref === '1'); };
  const L = { who:'mine', bopen:'', oldOpen:false, week:undefined, weekAt:0, weekErr:'' };
  const LCSS = '<style id="opbLaneCss">'
    + '.opl-week{background:var(--card,#fff);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin:0 0 14px;}'
    + '.opl-week h3,.opl-lane h3{margin:0;font-size:16px;color:var(--navy);}.opl-hd{display:flex;justify-content:space-between;align-items:baseline;gap:6px 12px;flex-wrap:wrap;margin:0 0 10px;}'
    + '.opl-hd small{color:var(--text-muted);font-size:12.5px;}'
    + '.opl-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;}'
    + '.opl-day{background:var(--bg);border-radius:8px;padding:8px 6px;display:flex;flex-direction:column;gap:5px;min-height:78px;min-width:0;}'
    + '.opl-day b{font-size:13px;color:var(--navy);}.opl-sh{font-size:12.5px;font-weight:700;background:var(--amber-bg);color:var(--amber);border-radius:5px;padding:3px 6px;overflow-wrap:anywhere;}'
    + '.opl-sh.soon{background:var(--red-bg);color:var(--red);}.opl-sh small{display:block;font-weight:600;opacity:.85;}.opl-ok{font-size:12px;color:var(--green,#1E6B45);}'
    + '.opl-wf{font-size:13px;color:var(--text-muted);margin-top:8px;}'
    + '.opl-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 14px;}'
    + '.opl-tile{all:unset;box-sizing:border-box;cursor:pointer;background:var(--card,#fff);border:1px solid var(--border);border-radius:12px;padding:10px 14px;display:flex;flex-direction:column;gap:2px;}'
    + '.opl-tile:focus-visible{outline:2px solid var(--teal);outline-offset:2px;}.opl-tile b{font-size:26px;line-height:1;font-variant-numeric:tabular-nums;}'
    + '.opl-tile.w b{color:var(--teal);}.opl-tile.c b{color:var(--red);}.opl-tile.b b{color:var(--amber);}.opl-tile span{font-weight:700;font-size:14px;}.opl-tile small{color:var(--text-muted);font-size:12px;}'
    + '.opl-lane{background:var(--card,#fff);border:1px solid var(--border);border-radius:12px;margin:0 0 14px;overflow:hidden;}'
    + '.opl-lane .opl-hd{padding:10px 14px;margin:0;border-bottom:1px solid var(--border);}'
    + '.opl-lane.w{box-shadow:inset 4px 0 0 var(--teal);}.opl-lane.c{box-shadow:inset 4px 0 0 var(--red);}.opl-lane.b{box-shadow:inset 4px 0 0 var(--amber);}'
    + '.opl-row{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,2fr) auto auto;gap:8px 14px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border);}'
    + '.opl-row:last-child{border-bottom:0;}.opl-who b{display:block;color:var(--navy);}.opl-sub{color:var(--text-muted);font-size:12.5px;}'
    + '.opl-what{font-size:13.5px;}.opl-t{font-size:12.5px;font-variant-numeric:tabular-nums;color:var(--text-muted);white-space:nowrap;}.opl-t.long{color:var(--red);font-weight:700;}'
    + '.opl-btns{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;}.opl-btns button,.opl-brow button{padding:5px 12px;font-size:12.5px;white-space:nowrap;}'
    + '.opl-card{padding:10px 14px;background:var(--bg);border-bottom:1px solid var(--border);}'
    + '.opl-brow{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border);}'
    + '.opl-brow .n{font-size:20px;font-weight:700;color:var(--amber);min-width:2.2ch;text-align:right;font-variant-numeric:tabular-nums;}'
    + '.opl-in{background:var(--bg);border-bottom:1px solid var(--border);}.opl-in .opl-row{background:transparent;}'
    + '.opl-none{padding:14px;color:var(--text-muted);font-size:13.5px;}.opl-foot{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;color:var(--text-muted);margin:4px 0 0;}'
    + '@media (max-width:700px){.opl-days{grid-template-columns:1fr;}.opl-day{min-height:0;flex-direction:row;flex-wrap:wrap;align-items:center;}.opl-day b{min-width:4.5em;}'
    + '.opl-tiles{grid-template-columns:1fr;}.opl-row{grid-template-columns:minmax(0,1fr) auto;}.opl-row .opl-what,.opl-row .opl-btns{grid-column:1/-1;}.opl-row .opl-btns{justify-content:flex-start;}}'
    + '</style>';
  /* Open shifts: the same AxisCare lookup the manager strip uses (2 weeks there, 7 days here), once per 15 minutes */
  async function loadWeek(){
    if(L.week === null) return;
    if(L.week !== undefined && Date.now() - L.weekAt < 15 * 60000) return;
    L.week = null;
    try{
      const anon = (typeof COMMS_ANON !== 'undefined') ? COMMS_ANON : '';
      const r = await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/axiscare-open-shifts', { method:'POST',
        headers:{ 'x-hub-token':await W.trainHubTok(), 'apikey':anon, 'Authorization':'Bearer ' + anon, 'Content-Type':'application/json' }, body:JSON.stringify({ days:7 }) });
      const d = await r.json();
      if(d && d.error){ L.week = []; L.weekErr = String(d.error).indexOf('403') >= 0 ? 'AxisCare said no (403): the API token needs Visits read.' : 'Couldn\'t load open shifts from AxisCare.'; }
      else { L.week = (d && d.open) || []; L.weekErr = ''; L.weekGap = (d && Array.isArray(d.incomplete_dates)) ? d.incomplete_dates : []; }   /* 2026-11-07: days AxisCare did not answer in full */
    }catch(e){ L.week = []; L.weekErr = 'Couldn\'t reach the open-shifts lookup. Check your connection.'; }
    L.weekAt = Date.now();
    if(MYWORK_ON_BOARD()) redraw();
  }
  const MYWORK_ON_BOARD = () => { try{ return typeof MYWORK_TAB !== 'undefined' && MYWORK_TAB === 'board'; }catch(e){ return false; } };
  function weekHtml(now){
    if(L.week === undefined || L.week === null) return '<div class="opl-week"><div class="opl-hd"><h3>Open shifts, next 7 days</h3><small>Checking AxisCare…</small></div></div>';
    if(L.weekErr) return '<div class="opl-week"><div class="opl-hd"><h3>Open shifts, next 7 days</h3></div><div class="opl-wf">' + esc(L.weekErr) + '</div></div>';
    const asked = s => (D().ops_items || []).some(i => i && i.status === 'open' && lc(i.kind) === 'coverage' && i.about && lc(i.about) === lc(s.client));
    return weekCard(L.week, L.weekGap, now, asked);
  }
  function laneRow(r, now){
    const it = r.it, id = esc(r.id), openNow = S.open === r.id;
    if(r.kind === 'approval') return '<div class="opl-row" data-id="' + id + '"><div class="opl-who"><b>' + esc(it.caregiver || 'Write-up') + '</b><span class="opl-sub">Caregiver</span></div>'
      + '<div class="opl-what">' + esc((it.level ? it.level + ': ' : '') + (it.reason || '')) + '</div><div class="opl-t">' + esc(waited(r.since, now)) + '</div>'
      + '<div class="opl-btns"><button class="primary" onclick="OPB.approvals()">Review</button></div></div>';
    const who = /^\s*\(phone lead\)\s*$/i.test(String(it.about || '')) ? 'Name not on file' : (it.about || it.title || '');
    const fu = lc(it.kind) === 'reply_needed';
    const what = fu ? String(it.detail || it.title || '').replace(it.about ? new RegExp('^' + String(it.about).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':\\s*') : /^$/, '') :(it.about && it.title && it.about !== it.title) ? it.title : (it.detail || '');
    const sub = [fu ? 'Called or texted' : WHO[r.who], r.owner && !r.mine ? (it.owner_name || name(r.owner)) : (!r.owner ? 'Nobody yet' : '')].filter(Boolean).join(' · ');
    const long = r.since && now - r.since > 12 * HOUR;
    let h = '<div class="opl-row" data-id="' + id + '"><div class="opl-who"><b>' + esc(who) + '</b><span class="opl-sub">' + esc(sub) + (r.dupe ? ' · also on a call card' : '') + '</span></div>'
      + '<div class="opl-what">' + esc(String(what).slice(0, 200)) + (it.next_action && !fu ? '<div class="opl-sub">' + esc(String(it.next_action).slice(0, 140)) + '</div>' : '') + '</div>'
      + '<div class="opl-t' + (long ? ' long' : '') + '">' + esc(waited(r.since, now)) + '</div>'
      + '<div class="opl-btns">' + (!r.owner ? '<button class="ghost" onclick="opsTakeIt(\'' + id + '\')">Take it</button>' : '')
      + '<button class="' + (openNow ? 'ghost' : 'primary') + '" aria-expanded="' + openNow + '" onclick="OPB.toggle(\'' + id + '\')">' + (openNow ? 'Close' : esc(doWord(it))) + '</button>'
      + (!/^(journey|project)$/.test(lc(it.kind)) ? '<span id="opldn_' + id + '"><button class="ghost" onclick="opsClose(\'' + id + '\',\'opldn_' + id + '\')">Done</button></span>' : '') + '</div></div>';
    if(openNow && typeof W.myWorkCard === 'function') h += '<div class="opl-card">' + W.myWorkCard(it, -1) + '</div>';
    return h;
  }
  /* the pieces of the new layout, from the same rows the table uses (pure enough to test in the page) */
  function laneModel(){
    const now = Date.now(), all = rows(), m = me();
    const scope = r => L.who === 'all' || r.mine || !r.owner;
    const lanes = { wait:[], care:[], batch:[], old:[], hide:[] };
    all.forEach(r => { r.lane = r.kind === 'approval' ? 'batch' : laneOf(r.it, r, now); lanes[r.lane].push(r); });
    /* one person once in Waiting: a Follow-ups row wins over a call card for the same contact */
    const seen = {};
    lanes.wait.sort((a, b) => (lc(a.it.kind) === 'reply_needed' ? 0 : 1) - (lc(b.it.kind) === 'reply_needed' ? 0 : 1));
    lanes.wait = lanes.wait.filter(r => { const k = personKey(r.it); if(!k) return true; if(seen[k]){ seen[k].dupe = true; lanes.batch.push(Object.assign(r, { lane:'batch' })); return false; } seen[k] = r; return true; });
    const byWait = (a, b) => (a.since || 0) - (b.since || 0);
    const team = {};
    if(owner()) lanes.wait.forEach(r => { if(r.owner && !r.mine){ const t = team[r.owner] || (team[r.owner] = { n:0, oldest:null }); t.n++; if(r.since && (t.oldest == null || r.since < t.oldest)) t.oldest = r.since; } });
    const batches = {};
    lanes.batch.filter(scope).forEach(r => { const k = batchOf(r.it, r); (batches[k] = batches[k] || []).push(r); });
    return { now, me:m, wait:lanes.wait.filter(scope).sort(byWait), care:lanes.care.filter(scope).sort(byWait), batches, old:lanes.old.filter(scope).sort(byWait), hidden:lanes.hide.length, team };
  }
  function renderLanes(wrap){
    if(!document.getElementById('opbCss')){ const t = document.createElement('div'); t.innerHTML = CSS; document.head.appendChild(t.firstChild); }
    if(!document.getElementById('opbLaneCss')){ const t = document.createElement('div'); t.innerHTML = LCSS; document.head.appendChild(t.firstChild); }
    loadWeek();
    const M = laneModel(), now = M.now, bk = BATCH_ORDER.filter(k => M.batches[k] && M.batches[k].length), bn = bk.reduce((a, k) => a + M.batches[k].length, 0);
    let h = '';
    if(!lanesOn(settings())) h += '<div class="card" style="padding:10px 14px;margin:0 0 12px;background:var(--amber-bg);color:var(--amber);font-size:13.5px;"><b>New layout, practice.</b> Only you see it; everyone else sees the table. '
      + 'When it looks right, turn on "Operations Board: new layout" on the Owners Hub Admin page. <button class="linklike" style="font:inherit;" onclick="OPB.lanesTry(false)">Back to the table</button></div>';
    h += weekHtml(now);
    const oldestW = M.wait.length ? waited(M.wait[0].since, now) : '';
    h += '<div class="opl-tiles">'
      + '<button class="opl-tile w" onclick="OPB.jump(\'oplWait\')"><b>' + M.wait.length + '</b><span>Waiting on us</span><small>' + (oldestW ? 'oldest ' + esc(oldestW) : 'Nobody waiting') + '</small></button>'
      + '<button class="opl-tile c" onclick="OPB.jump(\'oplCare\')"><b>' + M.care.length + '</b><span>Care today</span><small>' + (M.care.length ? 'Care or safety, today' : 'Nothing right now') + '</small></button>'
      + '<button class="opl-tile b" onclick="OPB.jump(\'oplBatch\')"><b>' + bk.length + '</b><span>Batches</span><small>' + bn + ' item' + (bn === 1 ? '' : 's') + ' in all</small></button></div>';
    if(owner()) h += '<div class="field-note" style="margin:-6px 0 12px;">Showing ' + (L.who === 'all' ? 'everyone\'s work' : 'yours and nobody\'s') + ' · <button class="linklike" style="font:inherit;" onclick="OPB.lanesWho(\'' + (L.who === 'all' ? 'mine' : 'all') + '\')">' + (L.who === 'all' ? 'Show only mine and nobody\'s' : 'Show everyone') + '</button></div>';
    const lane = (key, cls, title, small, list) => '<div class="opl-lane ' + cls + '" id="' + key + '"><div class="opl-hd"><h3>' + esc(title) + '</h3><small>' + esc(small) + '</small></div>'
      + (list.length ? list.map(r => laneRow(r, now)).join('') : '<div class="opl-none">' + (key === 'oplWait' ? 'Nobody is waiting on a call or text back.' : 'Nothing here right now.') + '</div>') + '</div>';
    h += lane('oplWait', 'w', 'Waiting on us', 'Called, texted or promised a call back. Longest wait first. Follow-ups rows close themselves when the office line calls or texts back.', M.wait);
    h += lane('oplCare', 'c', 'Care today', 'Shift-note flags, health news, a call before a first visit, an open shift soon', M.care);
    h += '<div class="opl-lane b" id="oplBatch"><div class="opl-hd"><h3>Batches</h3><small>Same kind of work, done in one sitting</small></div>'
      + (bk.length ? bk.map(k => { const list = M.batches[k], open = L.bopen === k;
        const names = list.slice(0, 3).map(r => r.kind === 'approval' ? (r.it.caregiver || 'Write-up') : (r.it.about || r.it.title || '')).filter(Boolean).join(', ');
        return '<div class="opl-brow" data-batch="' + k + '"><div class="n">' + list.length + '</div><div><b>' + esc(BATCH[k][0]) + '</b><div class="opl-sub">' + esc(names ? names + (list.length > 3 ? ' and ' + (list.length - 3) + ' more' : '') : BATCH[k][1]) + '</div></div>'
          + '<button class="' + (open ? 'ghost' : 'primary') + '" aria-expanded="' + open + '" onclick="OPB.batch(\'' + k + '\')">' + (open ? 'Close' : 'Open') + '</button></div>'
          + (open ? '<div class="opl-in">' + list.map(r => laneRow(r, now)).join('') + '</div>' : ''); }).join('') : '<div class="opl-none">Nothing to batch right now.</div>') + '</div>';
    const foot = [];
    if(M.old.length) foot.push('<button class="linklike" style="font:inherit;" aria-expanded="' + L.oldOpen + '" onclick="OPB.oldToggle()">' + (L.oldOpen ? 'Hide' : 'Show') + ' ' + M.old.length + ' older than a week</button>');
    const T = Object.keys(M.team).sort((a, b) => M.team[b].n - M.team[a].n);
    if(T.length) foot.push('Team: ' + T.map(e => esc(name(e)) + ' ' + M.team[e].n + ' waiting' + (M.team[e].oldest ? ', oldest ' + esc(waited(M.team[e].oldest, now)) : '')).join(' · '));
    if(M.hidden) foot.push(M.hidden + ' "Was it covered?" question' + (M.hidden === 1 ? ' is' : 's are') + ' no longer shown here');
    if(owner()) foot.push('<button class="linklike" style="font:inherit;" onclick="OPB.lanesTry(false)">See the table</button>');
    if(foot.length) h += '<div class="opl-foot">' + foot.join('<span aria-hidden="true">·</span>') + '</div>';
    if(L.oldOpen && M.old.length) h += '<div class="opl-lane" id="oplOld" style="margin-top:10px;"><div class="opl-hd"><h3>Older than a week</h3><small>Not care or safety, not a promise. Close what is done.</small></div>' + M.old.map(r => laneRow(r, now)).join('') + '</div>';
    if(window.CFU && !(settings().cc_followups_live === true)) h += '<div class="field-note" style="margin:10px 0 0;">Calls and texts from Follow-ups join Waiting on us once Follow-ups is turned on.</div>';
    wrap.innerHTML = h + olderHtml();
  }

  function render(wrap){
    if(!wrap) return;
    if(lanesView()) return renderLanes(wrap);
    const now = Date.now(), all = rows(), shown = all.filter(r => pass(r));
    if(S.open && !all.some(r => r.id === S.open)) S.open = '';
    /* the style goes in <head> once; inside the board it was wiped by the next redraw (2026-11-05, her screenshot) */
    if(!document.getElementById('opbCss')){ const t = document.createElement('div'); t.innerHTML = CSS; document.head.appendChild(t.firstChild); }
    let h = '';
    if(!on()) h += '<div class="card" style="padding:10px 14px;margin:0 0 12px;background:var(--amber-bg);color:var(--amber);font-size:13.5px;"><b>Practice, switched off.</b> Only owners see this tab. Every other tab works as before. '
      + 'When the rows look right, turn on Operations Board on the Owners Hub Admin page.</div>';
    if(owner()) h += '<div class="field-note" style="margin:0 0 10px;"><b>New:</b> people waiting on us first, care today, routine work in batches, and open shifts for the week. '
      + '<button class="linklike" style="font:inherit;" onclick="OPB.lanesTry(true)">Try the new layout</button> (only you see it)</div>';
    h += tiles(all) + menus(all) + cleanHtml(all);
    if(window.CFU && !(settings().cc_followups_live === true)) h += '<div class="field-note" style="margin:0 0 8px;">Calls and texts from Follow-ups join this board as rows once Follow-ups is turned on.</div>';
    h += '<div class="field-note" style="margin:0 0 6px;">' + shown.length + ' of ' + all.length + ' open'
      + (S.tile || S.f.when || S.f.who || S.f.need || S.f.owner !== 'start' ? ' · <button class="linklike" style="font:inherit;" onclick="OPB.reset()">Back to mine + care nobody has</button>' : '') + '</div>';
    h += '<div class="opb-wrap"><table class="opb"><thead><tr><th>Who</th><th>What came in</th><th>Need</th><th>Owner</th><th>When</th><th>Waiting</th><th>Do it</th><th>Move it</th><th>Done</th></tr></thead><tbody>'
      + (shown.length ? shown.map(r => rowHtml(r, now)).join('') : '<tr><td colspan="9" style="text-align:center;padding:22px;color:var(--text-muted);">Nothing here. Good.</td></tr>')
      + '</tbody></table></div>'
      + '<div class="field-note" style="margin-top:8px;"><b style="color:var(--red);">Red edge</b> care or safety · <b style="color:var(--amber);">Gold edge</b> today · Do it opens the card right here with all its buttons</div>'
      + olderHtml();
    wrap.innerHTML = h;
  }
  /* her ask 2026-11-05 "remove the busy stuff from the top": on the board, the strips above it hide (the tiles say the same);
     the morning note box shows from 5 pm Chicago time, and the tab row hides when the board is the only tab */
  const CALM = '<style id="opbCalm">#tab-mywork.opb-calm #todayStrip,#tab-mywork.opb-calm #dkDashLine,#tab-mywork.opb-calm #staffingView,'
    + '#tab-mywork.opb-calm.opb-day #ohPin details,#tab-mywork.opb-calm.opb-one #myWorkTabs{display:none!important}</style>';
  function calm(onBoard){
    const sec = document.getElementById('tab-mywork'); if(!sec) return;
    if(!document.getElementById('opbCalm')){ const t = document.createElement('div'); t.innerHTML = CALM; document.head.appendChild(t.firstChild); }
    const b = !!onBoard && visible();
    let hr = 12; try{ hr = Number(new Intl.DateTimeFormat('en-US', { timeZone:'America/Chicago', hour:'numeric', hourCycle:'h23' }).format(new Date())); }catch(e){}
    sec.classList.toggle('opb-calm', b);
    sec.classList.toggle('opb-day', b && hr >= 5 && hr < 17);
    sec.classList.toggle('opb-one', b && on() && !S.older);
  }
  function redraw(){ try{ if(typeof W.renderMyWork === 'function') W.renderMyWork(); }catch(e){} }

  /* ── hooks for index.html ── */
  /* the tab: first for owners in practice; with it on, the only tab unless someone opened an older view */
  function tabs(TABS){
    if(!visible()) return TABS;
    const t = ['board', on() ? 'Operations Board' : 'Operations Board (practice)'];
    if(on() && !S.older) return [t];
    return [t].concat(TABS);
  }
  /* with it on, open on the board once per page load */
  function start(){ if(on() && !S.started){ S.started = true; return 'board'; } return null; }
  /* her pick 1: the menu says Operations Board while it is on */
  function nameSync(){
    const label = on() ? 'Operations Board' : 'My Work';
    try{ /* CC_SUBTABS is a page-level const, not on window */ if(typeof CC_SUBTABS !== 'undefined' && CC_SUBTABS.myworkgrp && CC_SUBTABS.myworkgrp[0]) CC_SUBTABS.myworkgrp[0].l = label; }catch(e){}
    try{ const p = document.querySelector('.fpill[data-parent="myworkgrp"]'); if(p) [...p.childNodes].forEach(n => { if(n.nodeType === 3 && /\S/.test(n.nodeValue)) n.nodeValue = ' ' + label; }); }catch(e){}
    try{ const h = document.querySelector('#tab-mywork h2'); if(h) h.textContent = label; }catch(e){}
  }

  W.OPB = Object.assign({}, CORE, { on, visible, rows, count, render, tabs, start, nameSync, calm, state:S,
    tile:k => { S.tile = S.tile === k ? '' : k; redraw(); },
    set:(k, v) => { S.f[k] = v; save(); redraw(); },
    reset:() => { S.tile = ''; S.f = { when:'', who:'', need:'', owner:'start' }; save(); redraw(); },
    toggle:id => { S.open = S.open === id ? '' : id; redraw(); },
    approvals:() => { S.appr = true; const a = document.getElementById('myWorkApprovals'); if(a) a.style.display = ''; try{ W.renderApprovalsCc(); }catch(e){}
      const d = document.getElementById('approvalsDetails'); if(d) d.open = true; if(a) a.scrollIntoView({ behavior:'smooth', block:'start' }); },
    older:k => { S.older = true; try{ W.myWorkGo(k); }catch(e){} },
    cleanOpen:() => { S.clean = true; redraw(); }, cleanClose:() => { S.clean = false; redraw(); },
    cleanGo:async btn => {
      if(!owner() || !W.MWTidy){ alert('Only Samantha or Zachary can run the Board cleanup.'); return; }
      if(btn) btn.disabled = true;
      const ids = rows().filter(r => r.clean).map(r => r.id);
      const n = await W.MWTidy.clear(ids, 'Board cleanup');
      S.clean = false; try{ W.ccToast('Board cleanup cleared ' + n + ' card' + (n === 1 ? '' : 's') + '.'); }catch(e){}
      redraw();
    },
    undo:async () => { if(W.MWTidy) await W.MWTidy.undo(); redraw(); },
    /* the new layout */
    lanesView, laneModel, lanes:L,
    lanesTry:yes => { ls('opbLanes', yes ? '1' : '0'); S.open = ''; redraw(); },
    lanesWho:w => { L.who = w === 'all' ? 'all' : 'mine'; redraw(); },
    batch:k => { L.bopen = L.bopen === k ? '' : k; S.open = ''; redraw(); },
    oldToggle:() => { L.oldOpen = !L.oldOpen; redraw(); },
    jump:id => { const e = document.getElementById(id); if(e) e.scrollIntoView({ behavior:'smooth', block:'start' }); } });
})(typeof window !== 'undefined' ? window : globalThis);
