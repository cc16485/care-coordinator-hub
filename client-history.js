/* =====================================================================================================================
   CLIENT HISTORY (Hub CRM Build Plan, Step D, decision 9; Samantha approved the design 2026-10-15)
   The client profile's Activity & Documents tab used to stack five boxes (Calls, What changed, AxisCare changes,
   Timeline, EVV forms). Now everything that happened is ONE list, newest first, with chips to narrow it:
   All · Calls · Texts & emails · Notes · Journey · Care changes · AxisCare. EVV forms and documents stay in their own
   section beside it, because they are papers, not events.

   Her rules for this screen (2026-10-15):
     · each entry says what happened, when, and who, when we know it; long ones open in place ("more")
     · important changes stand out: caregiver changes, schedule changes, changes in care needs, care paused or ended
     · the same thing recorded in two places shows once (a call is in the call record AND on the inquiry's log; the
       call summary also lands in AxisCare's change log; the event record copies what a page did)
     · newest 50 first, then "Show older"
     · when one source can't load, the rest still shows, with a plain line saying what is missing
     · nothing new can be read here: every source is the same read the profile already made with the person's own
       sign-in (database rules), or the journey service's existing reads (get, care_state), which check the office role
     · 2026-10-30, her ask: the Family Circle's texts and emails are on it too, each naming who ("Mary (daughter) texted
       us"), read through ghl-thread, the office-only GoHighLevel read the profile's texts box already uses

   build(src, ctx) is pure (no page, no database) so tests/client-history-test.js runs it in node. mount() is the page.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const CHIPS = [['all', 'All'], ['call', 'Calls'], ['msg', 'Texts & emails'], ['note', 'Notes'], ['journey', 'Journey'], ['care', 'Care changes'], ['ax', 'AxisCare']];
  const TAG = { call:'Call', msg:'Text or email', note:'Note', journey:'Journey', care:'Care change', ax:'AxisCare', edit:'Record edit' };
  const PAGE = 50;

  /* the journey service's event kinds, in the same words its own panel uses (client-journey.js is not ours to edit) */
  const JEV = { created:'Journey started', completed:'Step done', confirmed_by_hand:'Confirmed by hand', verified:'Checked by the Hub', waiting:'Waiting', back_from_waiting:'Back from waiting',
    blocked:'Blocked', unblocked:'Unblocked', reopened:'Reopened', not_needed:'Marked not needed', owner_exception:'Owner exception', step_assigned:'Step given to someone',
    reassigned_cc:'Care Coordinator changed', target_start:'Target start changed', became_active:'Became an active client', said_yes:'They said yes', undo_yes:'Yes taken back', expired:'Expired' };
  const CARE = { pause:'Care paused', extend:'Pause made longer', resume:'Care resumed', end:'Care ended', return:'Came back to care' };
  const PAUSE_WORDS = { hospital:'Hospital stay', rehab:'Rehab or skilled nursing stay', family_away:'Family away', other:'Other' };
  const AX_VIA = { 'client-convert':'Convert', 'family-circles':'Family Circle', 'careplan-tasks':'Care plan', 'schedule-push':'Caregiver Matching', 'care-level':'Care level',
    'coverage-assign':'Coverage', 'call-disposition':'Call summary', 'axiscare-note':'Note' };
  const AX_OUT = { sent_confirmed:'Confirmed by AxisCare', sent:'Sent, not read back', refused:'AxisCare refused it', practice:'Practice run, nothing sent' };
  /* which AxisCare changes and record edits are the important kind */
  const AX_IMPORTANT = { 'schedule-push':'Schedule change', 'coverage-assign':'Caregiver change', 'care-level':'Care needs change', 'careplan-tasks':'Care needs change' };
  const SCHEDULE_FIELDS = ['days_needed', 'times_needed', 'number_of_hours', 'schedule'];
  const NEEDS_FIELDS = ['needs', 'safety', 'mobility', 'personal_care', 'medical_conditions', 'dementia_follow_up', 'weight_bearing', 'level_estimate', 'medical_notes', 'ai_care_flags'];

  const s = v => v == null ? '' : String(v);
  const ok = at => !!at && !isNaN(Date.parse(at));
  const iso = at => new Date(at).toISOString();
  const norm = t => s(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  /* 2026-10-12 → Oct 12 (a date only, no time zone shift) */
  const ymdWords = d => /^\d{4}-\d{2}-\d{2}$/.test(s(d).slice(0, 10)) ? new Date(s(d).slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone:'UTC', month:'short', day:'numeric' }) : s(d);
  const firstName = n => s(n).trim().split(/\s+/)[0] || '';

  /* one person's name from an email or a name; names {email:name} */
  function whoOf(v, names){
    if(!v) return ''; const k = s(v).toLowerCase();
    if(names && names[k]) return firstName(names[k]);
    if(/@/.test(k)){ const p = k.split('@')[0].split(/[._]/)[0]; return p ? p.charAt(0).toUpperCase() + p.slice(1) : ''; }
    return firstName(v);
  }

  /* ---------------- each source → items ---------------- */
  function fromLead(lead, ctx, out){
    const LR = ctx.LeadRules; if(!lead || !LR || typeof LR.timeline !== 'function') return;
    LR.timeline(lead, { names:ctx.names, now:ctx.now, referral:ctx.referral }).forEach((t, i) => {
      if(t.kind === 'clock') return;
      const txt = s(t.text);
      let chip;
      if(t.kind === 'family') chip = /^They called/.test(txt) ? 'call' : 'msg';
      else if(t.kind === 'talked' || t.kind === 'try') chip = 'call';
      else if(t.kind === 'sent') chip = / called /.test(txt) ? 'call' : 'msg';
      else if(t.kind === 'note' || t.kind === 'promise') chip = 'note';
      else if(t.kind === 'inquiry' || t.kind === 'stage') chip = 'journey';
      else if(t.kind === 'auto') chip = /^Authorization/.test(txt) ? 'journey' : /^(Texted|Could not text) /.test(txt) ? 'note' : 'msg';
      else chip = 'note';
      const quoted = t.kind === 'family' || t.kind === 'sent';
      /* a text or email with the family (not one to a referrer): the Family Circle's own copy names the person */
      const lead_msg = chip === 'msg' && t.kind === 'family' ? 'in' : chip === 'msg' && t.kind === 'sent' && txt.indexOf(':') < 0 ? 'out' : '';
      out.push({ id:'lead:' + i, src:'lead', at:t.at, chip, title:txt, sub:'', detail:t.sub ? (quoted ? '"' + t.sub + '"' : t.sub) : '', who:'', lead_call:chip === 'call', lead_msg });
    });
  }

  /* one call = the lines for one number within an hour (the profile's own grouping, callsGroup) */
  function groupCalls(rows){
    const calls = [];
    rows.slice().sort((a, b) => s(b.recorded_at).localeCompare(s(a.recorded_at))).forEach(r => {
      if(!ok(r.recorded_at)) return;
      const who = r.caller_phone || r.ghl_contact_id || ('#' + r.id);
      const c = calls.find(x => x.who === who && Math.abs(Date.parse(x.first) - Date.parse(r.recorded_at)) <= 3600000);
      if(c){ c.lines.push(r); if(s(r.recorded_at) < s(c.first)) c.first = r.recorded_at; }
      else calls.push({ who, first:r.recorded_at, lines:[r] });
    });
    return calls;
  }
  function fromCalls(got, ctx, out){
    if(!got || !Array.isArray(got.rows)) return;
    const people = got.people || {}, placed = got.placed || {};
    groupCalls(got.rows).forEach(c => {
      const L = c.lines, dir = (L.find(x => x.direction && x.direction !== 'unknown') || {}).direction;
      const pid = (L.find(x => x.person_id && people[x.person_id]) || {}).person_id, p = pid ? people[pid] : null;
      const who = p ? (p.rel === 'the client' ? (p.name || 'the client') : (p.name ? firstName(p.name) + ' (' + p.rel + ')' : p.rel)) : '';
      const outs = L.filter(x => x.kind === 'outcome' && x.outcome).map(x => s(x.outcome).replace(/_/g, ' '));
      const sums = L.filter(x => x.kind !== 'outcome' && x.summary);
      const ax = L.find(x => x.axiscare === 'posted');
      const pl = L.map(x => placed[x.id]).find(Boolean);
      const title = dir === 'inbound' ? (who || 'Someone') + ' called us' : dir === 'outbound' ? 'We called ' + (who || 'them') : 'A call' + (who ? ' with ' + who : '');
      const sum = sums.map(x => (x.summary_source === 'our_ai' ? 'Our AI\'s reading (not reviewed): ' : '') + s(x.summary)).join('\n\n');
      out.push({ id:'call:' + L.map(x => x.id).join(','), src:'calls', at:c.first, chip:'call', title:title + (outs.length ? ' · ' + outs.join(', ') : ''),
        sub:[ax ? 'In AxisCare\'s call log' : '', pl ? 'placed here by ' + whoOf(pl.placed_by, ctx.names) : ''].filter(Boolean).join(' · '),
        detail:sum, who:'', ghl:(L.find(x => x.ghl_contact_id) || {}).ghl_contact_id || '', record_call:true });
    });
  }
  function fromAx(rows, ctx, out){
    (Array.isArray(rows) ? rows : []).forEach(x => {
      if(!ok(x.at)) return;
      out.push({ id:'ax:' + x.id, src:'ax', at:x.at, chip:'ax', title:s(x.summary) || 'A change in AxisCare', via:x.via,
        sub:[AX_OUT[x.outcome] || x.outcome, AX_VIA[x.via] || x.via].filter(Boolean).join(' · '), detail:s(x.detail),
        who:whoOf(x.by_who, ctx.names), important:x.outcome === 'refused' ? '' : (AX_IMPORTANT[x.via] || ''), bad:x.outcome === 'refused' });
    });
  }
  /* lead_change: one line per save; schedule and care-need edits are Care changes and stand out */
  function fromEdits(rows, ctx, out){
    const label = ctx.fieldLabel || (f => f.replace(/_/g, ' ')), value = ctx.fieldValue || ((f, v) => v == null || v === '' ? 'blank' : Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? '(details)' : s(v));
    const groups = [];
    (Array.isArray(rows) ? rows : []).forEach(r => {
      if(!ok(r.changed_at) || r.kind === 'added') return;
      if(['comm_log', 'contact_events', 'status_history', 'last_contacted_at', 'ai_suggestions', 'ai_needs_summary', 'partner_msgs', 'rungs'].indexOf(r.field) >= 0) return;   /* already on the list in their own words */
      const g = groups[groups.length - 1];
      if(g && g.at === r.changed_at && g.by === r.changed_by && g.via === r.changed_via) g.rows.push(r); else groups.push({ at:r.changed_at, by:r.changed_by, via:r.changed_via, rows:[r] });
    });
    groups.forEach((g, i) => {
      const fields = g.rows.map(r => r.field);
      const sched = fields.some(f => SCHEDULE_FIELDS.indexOf(f) >= 0), needs = fields.some(f => NEEDS_FIELDS.indexOf(f) >= 0);
      const who = g.via === 'person' ? (whoOf(g.by, ctx.names) || 'Someone') : g.via === 'server' ? 'The Hub' : 'The database';
      const n = g.rows.length;
      out.push({ id:'edit:' + i + ':' + g.at, src:'edits', at:g.at, chip:(sched || needs) ? 'care' : 'edit', tag:'edit',
        title:who + ' changed ' + (n === 1 ? label(g.rows[0].field) : n + ' things') + ' on the record',
        sub:n > 1 ? g.rows.map(r => label(r.field)).join(', ') : '',
        detail:g.rows.map(r => label(r.field) + ': ' + value(r.field, r.old_value) + ' → ' + value(r.field, r.new_value)).join('\n'),
        who:'', important:sched ? 'Schedule change' : needs ? 'Care needs change' : '' });
    });
  }
  function fromJourney(d, ctx, out){
    if(!d || !Array.isArray(d.events)) return;
    const titles = {}; (d.defs || []).forEach(x => { if(x && x.key) titles[x.key] = x.title || x.key; });
    const names = Object.assign({}, ctx.names || {}, d.names || {});
    d.events.forEach(e => {
      if(!ok(e.at) || e.is_test) return;
      const dt = e.detail || {}, step = e.step_key ? (titles[e.step_key] || s(e.step_key).replace(/[_.]/g, ' ')) : '';
      let words = JEV[e.kind] || s(e.kind).replace(/_/g, ' ');
      if(e.kind === 'completed' && step) words = step + ': done';
      else if(e.kind === 'waiting') words = (step ? step + ': waiting' : 'Waiting') + (dt.waiting_on ? ' on ' + dt.waiting_on : '');
      else if(e.kind === 'reassigned_cc') words = 'Care Coordinator changed' + (dt.from || dt.to ? ': ' + (whoOf(dt.from, names) || 'nobody') + ' to ' + (whoOf(dt.to, names) || 'nobody') : '');
      else if(e.kind === 'target_start') words = 'Target start changed' + (dt.to ? ' to ' + ymdWords(dt.to) : ': none');
      else if(step) words = step + ': ' + words.charAt(0).toLowerCase() + words.slice(1);
      out.push({ id:'jev:' + e.id, src:'journey', at:e.at, chip:'journey', title:words, sub:'', detail:e.reason ? '"' + e.reason + '"' : (e.kind === 'verified' && dt.detail ? s(dt.detail) : ''),
        who:whoOf(e.actor_email === 'hub' ? '' : (e.actor_name || e.actor_email), names) || (e.actor_name === 'The Hub' ? 'The Hub' : ''),
        important:e.kind === 'reassigned_cc' ? 'Care Coordinator change' : e.kind === 'target_start' ? 'Start date change' : '' });
    });
  }
  function fromCare(d, ctx, out){
    if(!d || !Array.isArray(d.changes)) return;
    const pr = (d.reasons && d.reasons.pause) || PAUSE_WORDS, er = (d.reasons && d.reasons.end) || {};
    d.changes.forEach(c => {
      if(!ok(c.made_at) || c.is_test) return;
      const why = c.reason ? ((c.kind === 'end' ? er[c.reason] : pr[c.reason]) || s(c.reason).replace(/_/g, ' ')) : '';
      out.push({ id:'care:' + c.change_id, src:'care', at:c.made_at, chip:'care', title:(CARE[c.kind] || c.kind) + (why ? ' · ' + why : ''),
        sub:['from ' + ymdWords(c.effective_date), c.followup_date ? 'check back ' + ymdWords(c.followup_date) : '', c.source === 'axiscare_review' ? 'from an AxisCare review' : ''].filter(Boolean).join(' · '),
        detail:s(c.explanation), who:firstName(c.made_by_name) || whoOf(c.made_by, ctx.names), important:['pause', 'extend', 'end'].indexOf(c.kind) >= 0 ? 'Important' : '' });
    });
  }
  /* what the profile already knew without asking anyone: check-ins, callouts, assessments, nurse visits */
  function fromLocal(loc, ctx, out){
    if(!loc) return;
    (loc.assessments || []).forEach((x, i) => { if(ok(x.created_at)) out.push({ id:'asmt:' + (x.id || i), src:'local', at:x.created_at, chip:'journey', title:'Care assessment ' + s(x.status || 'recorded').toLowerCase(), sub:'', detail:'', who:whoOf(x.created_by, ctx.names) }); });
    (loc.checkins || []).forEach((c, i) => { const at = c.created_at || c.checkin_date; if(ok(at)) out.push({ id:'chk:' + (c.id || i), src:'local', at, chip:'note', title:'Check-in' + (c.escalated ? ', escalated' : ''), sub:'', detail:s(c.notes || c.note), who:whoOf(c.by || c.created_by, ctx.names), bad:!!c.escalated }); });
    (loc.callouts || []).forEach((c, i) => {
      if(ok(c.opened_at)) out.push({ id:'cov:' + (c.id || i), src:'local', at:c.opened_at, chip:'care', title:s(c.calling_off || 'A caregiver') + (c.opened_by === 'axiscare-watch' || c.not_a_callin === true ? ' was taken off the shift ' : ' called off ') + [ymdWords(c.shift_date), c.shift_time].filter(Boolean).join(' '),
        sub:c.covered_by ? 'covered by ' + c.covered_by : 'not covered', detail:s(c.reason), who:'', important:'Caregiver change', bad:!c.covered_by });
      if(ok(c.resolved_at)) out.push({ id:'covr:' + (c.id || i), src:'local', at:c.resolved_at, chip:'care', title:'Callout resolved' + (c.resolved_how || c.status ? ' (' + s(c.resolved_how || c.status).replace(/_/g, ' ') + ')' : ''), sub:'', detail:'', who:'' });
    });
    (loc.nurse_visits || []).forEach((v, i) => { const at = v.created_at || v.date; if(ok(at)) out.push({ id:'nv:' + (v.id || i), src:'local', at, chip:'journey', title:'Nurse visit', sub:'', detail:'', who:'' }); });
    (loc.start || []).forEach((e, i) => { if(ok(e.at)) out.push({ id:'start:' + i, src:'start', at:e.at, chip:'journey', title:s(e.text), sub:'', detail:'', who:'' }); });
  }
  /* Family Circle texts and emails (her ask 2026-10-30: "noting who called/texted"). One entry per message GoHighLevel
     has with each member, named: "Mary (daughter) texted us", "We emailed Mary (daughter)". Calls are left out here
     because the call record already names a recognised family member's calls. A number GoHighLevel matched to a contact
     with a different name is not shown as theirs. */
  const FAM_KINDS = { SMS:'texted', Email:'emailed', WhatsApp:'messaged', 'Live chat':'messaged', Facebook:'messaged', Instagram:'messaged' };
  function famLabel(m){ const n = firstName(m.name), r = s(m.relationship).trim().toLowerCase(); return n ? n + (r ? ' (' + r + ')' : '') : (r || 'a family member'); }
  function sameName(a, b){ const x = norm(a).split(' ').filter(w => w.length > 1), y = norm(b).split(' ').filter(w => w.length > 1); return !x.length || !y.length || x.some(w => y.indexOf(w) >= 0); }
  function fromFamily(d, ctx, out){
    if(!d || !Array.isArray(d.members)) return;
    d.members.forEach(m => {
      if(!m) return;
      const label = (m.people || [m]).map(famLabel).join(' or ') + ((m.people || []).length > 1 ? ' (shared number)' : '');
      if(m.error){ if(ctx.problems) ctx.problems.push({ source:'family', words:'Could not load the texts with ' + label + ' (' + s(m.error) + ').' }); return; }
      if(!Array.isArray(m.messages)) return;
      if(m.ghl_name && !(m.people || [m]).some(p => sameName(p.name, m.ghl_name))){
        if(ctx.problems) ctx.problems.push({ source:'family', words:'GoHighLevel has ' + label + '\'s number under another name (' + s(m.ghl_name) + '), so those texts are not shown as theirs.' });
        return;
      }
      m.messages.forEach((x, i) => {
        const verb = FAM_KINDS[x.type]; if(!verb || !ok(x.at)) return;
        const inbound = x.direction === 'in';
        out.push({ id:'fam:' + (m.key || label) + ':' + x.at + ':' + i, src:'family', at:x.at, chip:'msg', fam_dir:inbound ? 'in' : 'out',
          title:inbound ? label.charAt(0).toUpperCase() + label.slice(1) + ' ' + verb + ' us' : 'We ' + verb + ' ' + label,
          sub:'Family Circle', detail:x.body ? '"' + s(x.body) + '"' : '', who:'', ghl:m.contact_id || '' });
      });
    });
  }
  /* the event record: only what nothing else already shows */
  function fromOps(rows, ctx, out){
    (Array.isArray(rows) ? rows : []).forEach(e => {
      if(!ok(e.at) || !e.summary) return;
      const v = s(e.verb);
      const chip = /text|sms|email|message/.test(v) ? 'msg' : /coverage|callin|shift/.test(v) || e.area === 'coverage' ? 'care' : 'note';
      out.push({ id:'op:' + (e.id || e.at + v), src:'ops', at:e.at, chip, title:s(e.summary), sub:'', detail:'', who:firstName(e.actor_name) || whoOf(e.actor_email, ctx.names) });
    });
  }

  /* ---------------- the same thing twice → once ---------------- */
  function dedupe(items){
    const near = (a, b, ms) => Math.abs(Date.parse(a.at) - Date.parse(b.at)) <= ms;
    const keep = items.slice();
    const drop = new Set();
    const recordCalls = keep.filter(x => x.record_call);
    /* 1. a call on the inquiry's log that the call record also has: keep the call record, carry the note across */
    keep.forEach(x => {
      if(!x.lead_call) return;
      const m = recordCalls.find(c => near(c, x, 15 * 60000));
      if(!m) return;
      drop.add(x);
      if(x.detail && norm(m.detail).indexOf(norm(x.detail.replace(/^"|"$/g, ''))) < 0) m.detail = (m.detail ? m.detail + '\n\n' : '') + 'Logged on the inquiry: ' + x.detail;
      if(!m.who && /^\w+ called/.test(x.title) && !/^They /.test(x.title)) m.who = x.title.split(' ')[0];
    });
    /* 2. the call summary we posted to AxisCare is the call itself */
    keep.forEach(x => { if(x.src === 'ax' && x.via === 'call-disposition' && recordCalls.some(c => Date.parse(x.at) >= Date.parse(c.at) - 60000 && near(c, x, 3 * 3600000))) drop.add(x); });
    /* 2b. a text the inquiry's log has that the Family Circle's copy also has: keep the one that names the person */
    const famMsgs = keep.filter(x => x.fam_dir);
    keep.forEach(x => {
      if(!x.lead_msg) return;
      const d = norm(s(x.detail).replace(/^"|"$/g, ''));
      if(famMsgs.some(f => f.fam_dir === x.lead_msg && near(f, x, 10 * 60000) && (!d || norm(f.detail).indexOf(d) >= 0 || d.indexOf(norm(f.detail)) >= 0))) drop.add(x);
    });
    /* 3. the event record copies what a page did: drop it when something else is within 5 minutes in the same chip */
    keep.forEach(x => { if(x.src === 'ops' && keep.some(y => y !== x && y.src !== 'ops' && !drop.has(y) && y.chip === x.chip && near(x, y, 5 * 60000))) drop.add(x); });
    /* 4. exact repeats (same kind of thing, same words, same few minutes) from any two sources */
    const seen = [];
    keep.forEach(x => {
      if(drop.has(x)) return;
      const k = norm(x.title);
      if(seen.some(y => y.chip === x.chip && norm(y.title) === k && near(x, y, 10 * 60000))) drop.add(x); else seen.push(x);
    });
    return keep.filter(x => !drop.has(x));
  }

  /* src: { lead, calls, ax, edits, journey, care, local, ops } (each may be missing); errors: {source:message}
     ctx: { names, now, LeadRules, fieldLabel, fieldValue } → { items newest first, problems [{source, words}] } */
  const SOURCE_WORDS = { calls:'calls', ax:'AxisCare changes', edits:'record edits', journey:'Journey history', care:'care changes (pause, resume, end)', ops:'the activity record', lead:'the inquiry\'s log', family:'texts with the Family Circle' };
  function build(src, ctx){
    src = src || {}; ctx = Object.assign({ names:{}, now:new Date().toISOString() }, ctx || {});
    const out = [];
    const run = (k, fn, v) => { try{ fn(v, ctx, out); }catch(e){ problems.push({ source:k, words:'Could not read ' + (SOURCE_WORDS[k] || k) + ': ' + s(e && e.message || e) }); } };
    const problems = [];
    ctx.problems = problems;
    run('lead', fromLead, src.lead); run('calls', fromCalls, src.calls); run('ax', fromAx, src.ax); run('edits', fromEdits, src.edits);
    run('journey', fromJourney, src.journey); run('care', fromCare, src.care); run('local', fromLocal, src.local); run('ops', fromOps, src.ops); run('family', fromFamily, src.family);
    Object.keys(src.errors || {}).forEach(k => { const m = src.errors[k]; if(m) problems.push({ source:k, words:m === 'off' ? (SOURCE_WORDS[k] || k).replace(/^./, c => c.toUpperCase()) + ' is switched off right now.' : 'Could not load ' + (SOURCE_WORDS[k] || k) + ' (' + m + ').' }); });
    const items = dedupe(out.map(x => Object.assign({}, x, { at:iso(x.at) }))).sort((a, b) => b.at.localeCompare(a.at) || s(a.id).localeCompare(s(b.id)));
    return { items, problems };
  }
  function counts(items){ const c = { all:items.length }; CHIPS.forEach(([k]) => { if(k !== 'all') c[k] = items.filter(x => x.chip === k).length; }); return c; }
  function filter(items, chip){ return chip && chip !== 'all' ? items.filter(x => x.chip === chip) : items; }

  /* Chicago day words: Today, Yesterday, Mon Oct 12, or Oct 12, 2025 for another year */
  function dayWords(at, now){
    const f = d => new Date(d).toLocaleDateString('en-CA', { timeZone:'America/Chicago' });
    const a = f(at), t = f(now), y = f(Date.parse(now) - 864e5);
    if(a === t) return 'Today'; if(a === y) return 'Yesterday';
    const sameYear = a.slice(0, 4) === t.slice(0, 4);
    return new Date(at).toLocaleDateString('en-US', sameYear ? { timeZone:'America/Chicago', weekday:'short', month:'short', day:'numeric' } : { timeZone:'America/Chicago', month:'short', day:'numeric', year:'numeric' }).replace(/,(?= \w{3} )/, '');
  }
  function timeWords(at){ return new Date(at).toLocaleTimeString('en-US', { timeZone:'America/Chicago', hour:'numeric', minute:'2-digit' }); }

  const api = { CHIPS, TAG, PAGE, build, counts, filter, dedupe, groupCalls, dayWords, timeWords, whoOf };
  if(typeof module !== 'undefined' && module.exports){ module.exports = api; return; }

  /* =============================================== the page =============================================== */
  const H = { key:'', src:{}, errors:{}, start:[], chip:'all', shown:PAGE, open:{} };
  /* the Hub page's own globals are top-level const/let, so they are reached by name, never through window */
  const has = n => { try{ return Function('return typeof ' + n + ' !== "undefined"')(); }catch(e){ return false; } };
  const G = n => has(n) ? Function('return ' + n)() : undefined;
  const esc = v => s(v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const keyNow = () => (G('CP') && G('CP').lead && G('CP').lead.id ? 'L:' + CP.lead.id : '') + '|' + (G('CP') && /^\d+$/.test(s(G('CP').ax)) ? 'A:' + CP.ax : '');
  function names(){
    const n = {};
    try{ ([]).forEach(p => { if(p && p.email) n[s(p.email).toLowerCase()] = p.name || p.full_name || ''; }); }catch(e){}
    try{ (G('OPS_PEOPLE') || []).forEach(p => { if(p && p.email && !n[s(p.email).toLowerCase()]) n[s(p.email).toLowerCase()] = p.name || ''; }); }catch(e){}
    return n;
  }
  function css(){
    if(document.getElementById('chStyle')) return;
    const st = document.createElement('style'); st.id = 'chStyle';
    st.textContent = '.ch-chips{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 8px;}'
      + '.ch-chip{font:inherit;font-size:13px;padding:4px 11px;border-radius:99px;border:1px solid var(--border);background:#fff;color:var(--text,#16283a);cursor:pointer;}'
      + '.ch-chip .n{color:var(--text-muted);margin-left:3px;font-variant-numeric:tabular-nums;}'
      + '.ch-chip.on{background:#EAF4F6;border-color:var(--teal);color:var(--teal);font-weight:700;}.ch-chip.on .n{color:var(--teal);}'
      + '.ch-day{font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin:14px 0 2px;}'
      + '.ch-row{display:grid;grid-template-columns:64px 100px minmax(0,1fr);gap:10px;padding:8px 0;border-top:1px solid var(--border);align-items:start;font-size:13.5px;}'
      + '.ch-day+.ch-row{border-top:0;}.ch-t{color:var(--text-muted);font-size:12.5px;font-variant-numeric:tabular-nums;padding-top:1px;}'
      + '.ch-tag{font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;justify-self:start;white-space:nowrap;}'
      + '.ch-k-call{background:#EAF4F6;color:#1F6E7E;}.ch-k-msg{background:#EEF0F2;color:var(--navy);}.ch-k-note{background:#FBF1E1;color:#9C6410;}'
      + '.ch-k-journey{background:#E8F5EC;color:#15803D;}.ch-k-care{background:#EFECF8;color:#5B4B9A;}.ch-k-ax,.ch-k-edit{background:#F2F0E9;color:#5f6b78;}'
      + '.ch-what{min-width:0;}.ch-what b{color:var(--navy);}.ch-sub{display:block;font-size:12.5px;color:var(--text-muted);margin-top:2px;}'
      + '.ch-imp{display:inline-block;font-size:11px;font-weight:800;color:#9C6410;background:#FBF1E1;border-radius:4px;padding:1px 6px;margin-left:6px;vertical-align:1px;}'
      + '.ch-bad{color:var(--red);}'
      + '.ch-detail{white-space:pre-wrap;font-size:13px;margin-top:4px;padding:6px 10px;background:#faf9f6;border-radius:6px;}'
      + '.ch-more{font:inherit;font-size:12.5px;background:none;border:0;padding:0;margin-left:6px;color:var(--teal);cursor:pointer;text-decoration:underline;}'
      + '.ch-prob{font-size:12.5px;color:#92400E;background:#FFF7E6;border:1px solid #F3D9B5;border-radius:8px;padding:6px 10px;margin:6px 0;}'
      + '@media (max-width:560px){.ch-row{grid-template-columns:52px minmax(0,1fr);}.ch-row .ch-tag,.ch-row .ch-what{grid-column:2;}}';
    document.head.appendChild(st);
  }
  function rowHtml(x){
    const open = !!H.open[x.id], long = x.detail && x.detail.length > 140;
    const preview = x.detail && !long ? '<span class="ch-sub" style="color:var(--text,#16283a);white-space:pre-line;">' + esc(x.detail) + '</span>' : '';
    return '<div class="ch-row"><div class="ch-t">' + esc(timeWords(x.at)) + '</div><span class="ch-tag ch-k-' + esc(x.tag || x.chip) + '">' + esc(TAG[x.tag || x.chip] || x.chip) + '</span>'
      + '<div class="ch-what"><b' + (x.bad ? ' class="ch-bad"' : '') + '>' + esc(x.title) + '</b>' + (x.who ? ' <span class="field-note">· ' + esc(x.who) + '</span>' : '')
      + (x.important ? '<span class="ch-imp">' + esc(x.important) + '</span>' : '')
      + (x.sub ? '<span class="ch-sub">' + esc(x.sub) + '</span>' : '') + preview
      + (long ? (open ? '<div class="ch-detail">' + esc(x.detail) + '</div><button class="ch-more" data-ch-open="' + esc(x.id) + '">less</button>'
                     : '<span class="ch-sub" style="color:var(--text,#16283a);">' + esc(x.detail.slice(0, 140)) + '…<button class="ch-more" data-ch-open="' + esc(x.id) + '">more</button></span>') : '')
      + (x.ghl && G('GHL_LOC') ? ' <a class="ch-more" target="_blank" rel="noopener" href="https://app.hirecara.com/v2/location/' + encodeURIComponent(G('GHL_LOC')) + '/contacts/detail/' + encodeURIComponent(x.ghl) + '">GoHighLevel ↗</a>' : '')
      + '</div></div>';
  }
  function render(){
    const box = document.getElementById('cp_history'); if(!box) return;
    css();
    const LR = root.LeadRules;
    const fl = has('CLG_LABEL') ? f => G('CLG_LABEL')[f] || s(f).replace(/_/g, ' ') : null;
    const fv = typeof root.clgValue === 'function' ? (f, v) => root.clgValue(typeof root.clgWords === 'function' ? root.clgWords(f, v) : v) : null;
    const src = Object.assign({}, H.src, { errors:H.errors, local:Object.assign({}, H.src.local || {}, { start:H.start }) });
    const b = build(src, { names:names(), LeadRules:LR, fieldLabel:fl || undefined, fieldValue:fv || undefined });
    const c = counts(b.items), list = filter(b.items, H.chip), page = list.slice(0, H.shown);
    let rows = '', last = '';
    const now = new Date().toISOString();
    page.forEach(x => { const d = dayWords(x.at, now); if(d !== last){ rows += '<div class="ch-day">' + esc(d) + '</div>'; last = d; } rows += rowHtml(x); });
    const loading = H.pending > 0;
    box.innerHTML = '<div class="card" style="padding:16px 18px;margin-bottom:14px;"><div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;"><b style="font-size:16px;color:var(--navy);">History</b>'
      + '<span class="field-note">every call, text, note and change for this client, newest first</span><span style="flex:1;"></span><button class="linklike" onclick="chReload()" title="Load again">↻</button></div>'
      + '<div class="ch-chips">' + CHIPS.map(([k, l]) => '<button type="button" class="ch-chip' + (k === H.chip ? ' on' : '') + '" data-ch-chip="' + k + '">' + esc(l) + '<span class="n">' + c[k] + '</span></button>').join('') + '</div>'
      + b.problems.map(p => '<div class="ch-prob">' + esc(p.words) + ' Everything else is shown.</div>').join('')
      + (G('CP') && G('CP').lead ? '<div style="display:flex;gap:8px;margin:4px 0;"><input id="chNoteIn" style="flex:1;min-width:0;" placeholder="Add a note (a call goes through Log a call, so it counts)" onkeydown="if(event.key===\'Enter\')chNote()"><button class="secondary" onclick="chNote()">Add</button></div>' : '')
      + (rows || '<div class="field-note" style="padding:10px 0;">' + (loading ? 'Loading…' : H.chip === 'all' ? 'Nothing recorded for this client yet.' : 'Nothing of this kind yet.') + '</div>')
      + (loading && rows ? '<div class="field-note" style="margin-top:8px;">Still loading some of it…</div>' : '')
      + (list.length > page.length ? '<div style="text-align:center;margin-top:12px;"><button class="linklike" onclick="chOlder()">Show older (' + (list.length - page.length) + ' more)</button></div>' : '')
      + '</div>';
    box.onclick = e => {
      const ch = e.target.closest('[data-ch-chip]'); if(ch){ H.chip = ch.dataset.chChip; H.shown = PAGE; render(); return; }
      const op = e.target.closest('[data-ch-open]'); if(op){ H.open[op.dataset.chOpen] = !H.open[op.dataset.chOpen]; render(); }
    };
  }
  /* every read here is one the profile already made, under the person's own sign-in */
  async function load(force){
    const key = keyNow(); if(key === '|'){ const box = document.getElementById('cp_history'); if(box) box.innerHTML = ''; return; }
    if(key !== H.key){ Object.assign(H, { key, src:{}, errors:{}, start:H.startFor === key ? H.start : [], chip:'all', shown:PAGE, open:{} }); }
    else if(!force) { render(); return; }
    else { H.src = {}; H.errors = {}; }
    const lead = G('CP') && G('CP').lead, ax = /^\d+$/.test(s(G('CP') && G('CP').ax)) ? s(G('CP').ax) : '';
    H.src.lead = lead || null;
    H.src.local = localFacts(lead, ax);
    const q = async p => { const r = await p; if(r.error) throw r.error; return r.data || []; };
    const why = e => { const m = s(e && e.message || e); return /does not exist|not find|switched off/i.test(m) ? 'off' : m; };
    const jobs = {
      calls: async () => { if(typeof root.callsLoad === 'function'){ await root.callsLoad(!!force); const k = typeof root.callsKey === 'function' ? root.callsKey() : ''; const got = G('CALLS') && G('CALLS').data[k]; if(got && got.error) throw new Error(got.error); return got || null; } return null; },
      ax: async () => { if(!ax) return []; if(typeof root.axLogLoad === 'function'){ await root.axLogLoad(!!force); const got = G('AXL') && G('AXL').rows[ax]; if(got && got.error) throw new Error(got.error); return Array.isArray(got) ? got : []; } return []; },
      edits: async () => lead ? q(G('sb').from('lead_change').select('id,field,kind,old_value,new_value,changed_at,changed_by,changed_via').eq('lead_id', s(lead.id)).order('changed_at', { ascending:false }).limit(300)) : [],
      journey: async () => { if(typeof root.cjCall !== 'function') return null; return root.cjCall(lead ? { action:'get', lead_id:lead.id } : ax ? { action:'get', axiscare_client_id:ax } : null); },
      care: async () => { if(!ax || typeof root.cjCall !== 'function') return null; return root.cjCall({ action:'care_state', axiscare_client_id:ax }); },
      family: async () => ax ? familyTexts(ax) : null,
      ops: async () => { const ids = [lead && s(lead.id), ax].filter(Boolean); return ids.length ? q(G('sb').from('op_events').select('id,at,actor_email,actor_name,verb,summary,area,item_id').in('item_id', ids).order('at', { ascending:false }).limit(200)) : []; }
    };
    H.pending = Object.keys(jobs).length; render();
    await Promise.all(Object.keys(jobs).map(async k => {
      try{ const v = await jobs[k](); if(H.key === key) H.src[k] = v; }
      catch(e){ if(H.key === key) H.errors[k] = why(e); }
      finally{ if(H.key === key){ H.pending--; render(); } }
    }));
  }
  /* the Family Circle's members, and each one's GoHighLevel conversation through ghl-thread: the same office-only read
     the profile's texts box makes. One lookup per phone or email (two members sharing a number are one lookup), two at a
     time so GoHighLevel isn't asked for everything at once. */
  async function familyTexts(ax){
    const sb = G('sb'), cfg = G('CONFIG') || {};
    const c = await sb.from('care_circles').select('id').eq('axiscare_client_id', ax).eq('active', true);
    if(c.error) throw c.error;
    const ids = (c.data || []).map(x => x.id); if(!ids.length) return { members:[] };
    const m = await sb.from('circle_contacts').select('id,name,relationship,phone,email').in('circle_id', ids);
    if(m.error) throw m.error;
    const digits = v => s(v).replace(/\D/g, '').slice(-10), groups = [];
    (m.data || []).forEach(p => {
      const ph = digits(p.phone), em = s(p.email).trim().toLowerCase(); if(ph.length !== 10 && !em) return;
      const g = groups.find(x => (ph.length === 10 && x.phone === ph) || (!x.phone && em && x.email === em));
      if(g) g.people.push(p); else groups.push({ key:ph || em, phone:ph.length === 10 ? ph : '', email:ph.length === 10 ? '' : em, people:[p] });
    });
    if(!groups.length) return { members:[] };
    const got = await sb.auth.getSession(), sess = got && got.data && got.data.session;
    if(!sess || !sess.access_token) throw new Error('please sign in again');
    const one = async g => {
      try{
        const r = await fetch(cfg.supabase_url + '/functions/v1/ghl-thread', { method:'POST', headers:{ 'Authorization':'Bearer ' + sess.access_token, 'Content-Type':'application/json' },
          body:JSON.stringify({ phone:g.phone, email:g.email, limit:25 }) });
        const d = await r.json().catch(() => ({}));
        if(!r.ok || d.error) return Object.assign(g, { error:s(d.error) || 'GoHighLevel answered ' + r.status });
        return Object.assign(g, { contact_id:d.contact_id || '', ghl_name:d.contact_id ? s(d.name) : '', messages:d.messages || [] });
      }catch(e){ return Object.assign(g, { error:s(e && e.message || e) }); }
    };
    const todo = groups.slice(0, 10), done = [];
    while(todo.length) done.push(...await Promise.all(todo.splice(0, 2).map(one)));
    return { members:done };
  }
  function localFacts(lead, ax){
    const D = G('DATA') || {}, r = (G('CL360_CURRENT') && G('CL360_CURRENT').cp_) || null;
    const name = r ? r.client_name : '', same = typeof root.cl360SameClient === 'function' ? root.cl360SameClient : () => false;
    const nurseC = ax ? (D.nurse_clients || []).find(n => s(n.axiscare_client_id) === ax) : null;   /* the profile also matches a unique name; the AxisCare id is enough here */
    return {
      assessments:(D.care_assessments || []).filter(x => (lead && x.lead_id === lead.id) || (r && same(x.client_name, x.axiscare_client_id, name, ax))),
      checkins:r ? (r.checkins || []) : [],
      callouts:r ? (D.coverage_cases || []).filter(c => same(c.client, c.client_axiscare_id, name, ax)) : [],
      nurse_visits:nurseC ? (D.nurse_visits || []).filter(v => v.client_id === nurseC.id) : []
    };
  }
  /* the Journey part of their start (connections, Start Contract, care began), handed over by c360StartLoad */
  function addStart(list){
    const plain = h => { const d = document.createElement('div'); d.innerHTML = s(h); return d.textContent; };   /* c360StartLoad's lines are built (escaped) HTML */
    H.start = (list || []).map(e => ({ at:e.at, text:plain(e.what) })); H.startFor = keyNow(); render();
  }
  async function note(){
    const l = G('CP') && G('CP').lead, inp = document.getElementById('chNoteIn'); if(!l || !inp) return;
    const body = inp.value.trim(); if(!body) return;
    const a = typeof root.ccActor === 'function' ? root.ccActor() : { email:'' };
    l.comm_log = Array.isArray(l.comm_log) ? l.comm_log : []; l.comm_log.push({ body, at:new Date().toISOString(), by:a.email, kind:'note' });
    inp.value = '';
    render();
    if(typeof root.persist === 'function') await root.persist('leads', l);
  }
  Object.assign(root, { ClientHistory:api, chMount:() => load(false), chReload:() => load(true), chOlder:() => { H.shown += PAGE; render(); }, chNote:note, chAddStart:addStart });
})(typeof globalThis !== 'undefined' ? globalThis : this);
