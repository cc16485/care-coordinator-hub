/* =====================================================================================================================
   CALL FOLLOW-UPS, PRACTICE (650; v7 2026-10-12, Samantha's eight points). A tab on My Work, offered while the practice
   switch (ops_settings.call_tasks_practice) is on. For each answered call of the last 7 days it shows what the AI employee
   read: the call summary, what it understood, the promises it heard (we agreed / caller will / considering / awaiting
   confirmation), EVERY responsibility the call created (praise goes to Kind Words, never a card: her decision 2026-10-12) with its decision, owner, urgency, due date and the reason a card
   was or was not needed. Beside it: what the team did within a day, including work done without a card.
     · These cards are in nobody's work. Nothing here creates, changes or sends anything.
     · Readings: call_task_reading (office roles only), the newest reading of each call. What the team did: cards people
       made about the same person (DATA.ops_items), the Hub's record of people's actions that name them (op_events), call
       outcomes tapped after the call (call_record). Changes made directly in AxisCare do not reach the Hub yet.
     · No transcript is shown or kept; phone numbers and emails are removed from what the AI wrote.
   v13 (2026-10-12, "make sure nothing ever falls through the cracks"): NOTHING READ QUIETLY MISSING: every call or text the
   reader could not read is shown (trying again, or given up after 3 tries, or no transcript from GoHighLevel), and the
   reader's last run is shown so a stopped reader is seen. PROMISES: every promise the office made, or a confirmation it is
   waiting on, with its due day, owner, and whether later calls, texts and cards show it kept (call_promise_watch). In
   practice "would remind" is only shown; nobody is reminded.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const lc = s => String(s || '').trim().toLowerCase();
  const AREA = { scheduling: 'Scheduling', evv_timekeeping: 'EVV and timekeeping', payroll: 'Payroll', client_care: 'Client care', caregiver_performance: 'Caregiver performance',
    safety_incident: 'Safety or incident', family_enquiries: 'Family enquiries', referral_partner: 'Referral partner', payer_programs: 'Payer programs', recruiting: 'Recruiting',
    field_quality: 'Field quality', training_compliance: 'Training', office_admin: 'Office', caregiver_support: 'Caregiver support', admin: 'Office', leads: 'Leads' };
  const ROLE = { client: 'client', family: 'family', caregiver: 'caregiver', applicant: 'applicant', referral_partner: 'referral partner', new_client_inquiry: 'new client inquiry',
    vendor: 'vendor', wrong_number_or_spam: 'wrong number or spam', internal: 'internal', other: 'other', client_or_family: 'client or family' };
  const WHO = { client: 'client', caregiver: 'caregiver', lead: 'lead', applicant: 'applicant', contact: 'client contact' };
  const DEC = { new_card: ['New card', '#0D365F', '#E6EEF7'], add_to_existing_card: ['Add to an open card', '#1F7A8C', '#E3F2F4'], already_in_workflow: ['Already in a workflow', '#2f7d4f', '#E4F1E8'], kind_words: ['Kind Words (suggested)', '#8A5A00', '#FFF3DC'],
    done_on_call: ['Done on the call', '#2f7d4f', '#E4F1E8'], caller_owns: ['The caller\'s to do', '#55677a', '#EEF1F4'], not_needed: ['Not needed', '#55677a', '#EEF1F4'] };
  const URG = { now: ['Now', '#A83A2F', '#F7E6E3'], today: ['Today', '#B4650C', '#FBEFDC'], this_week: ['This week', '#55677a', '#EEF1F4'], routine: ['Routine', '#8a978f', '#F2F4F3'] };
  const PROM = { we_agreed: 'We agreed', caller_will: 'Caller will', caller_considering: 'Caller is considering', awaiting_confirmation: 'Awaiting confirmation' };
  const CPR = { rows: null, events: [], outcomes: [], promises: [], beat: null, at: 0, busy: null, err: '', filter: 'all', q: '', day: '', channel: 'all', msg: '' };
  const MAX_TRIES = 3;
  const PSTAT = { would_remind: ['Would remind', '#A83A2F', '#F7E6E3'], waiting: ['Waiting', '#55677a', '#EEF1F4'], kept: ['Kept', '#2f7d4f', '#E4F1E8'], kept_late: ['Kept late', '#B4650C', '#FBEFDC'], dropped: ['Dropped', '#8a978f', '#F2F4F3'] };
  const DAYS = 14;
  const chiYmd = ms => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  const ACT = { ask_client_family_permission: 'Ask permission', axiscare_visit_change: 'Change in AxisCare', text_caregiver: 'Text the caregiver', text_client_caregivers: 'Text the client\'s caregivers', text_family_update: 'Update the family', call_back: 'Call back', open_calloff_case: 'Open a call-off case' };

  const when = iso => { try{ return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }catch(e){ return ''; } };
  const day = ymd => { try{ return new Date(ymd + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }catch(e){ return ymd; } };
  const mins = s => { const n = Math.round(Number(s || 0)); return n < 60 ? n + ' s' : Math.floor(n / 60) + ' min' + (n % 60 ? ' ' + (n % 60) + ' s' : ''); };
  const chip = (txt, fg, bg) => '<span style="display:inline-block;border-radius:999px;padding:1px 8px;font-size:11.5px;font-weight:700;color:' + fg + ';background:' + bg + ';white-space:nowrap;">' + esc(txt) + '</span>';

  /** Offered only while practice is on (the Owners Hub switch). */
  function offered(){ try{ return !!(DATA && DATA.ops_settings && DATA.ops_settings.call_tasks_practice === true); }catch(e){ return false; } }

  async function load(force){
    if(CPR.busy) return CPR.busy;
    if(!force && CPR.rows && Date.now() - CPR.at < 120000) return CPR.rows;
    CPR.busy = (async () => {
      try{
        const since = new Date(Date.now() - DAYS * 864e5).toISOString();
        const { data, error } = await sb.from('call_task_reading')
          .select('message_id, version, channel, call_at, direction, seconds, caller, match, person_id, lead_id, who_name, who_roles, call_type, tasks, resolves, no_task_reason, error, read_at, detail, attempt')
          .gte('call_at', since).order('call_at', { ascending: false }).limit(800);
        if(error){ CPR.err = /does not exist|schema cache/i.test(error.message) ? 'not_installed' : error.message; CPR.rows = []; }
        else {
          /* a call read again by a newer reader shows once: its newest reading */
          const newest = {};
          for(const r of (data || [])) if(!newest[r.message_id] || String(r.read_at) > String(newest[r.message_id].read_at)) newest[r.message_id] = r;
          CPR.err = ''; CPR.rows = (data || []).filter(r => newest[r.message_id] === r);
          /* what the team did: people's actions in the Hub, and call outcomes tapped (both read only; best effort) */
          try{ const ev = await sb.from('op_events').select('at, actor_name, actor_kind, verb, summary, item_id').eq('actor_kind', 'person').gte('at', since).order('at', { ascending: true }).limit(3000); CPR.events = ev.data || []; }catch(e){ CPR.events = []; }
          /* v13: the promises being watched, and the reader's last run (both best effort; before v13 they are simply empty) */
          try{ const pw = await sb.from('call_promise_watch').select('message_id, idx, channel, call_at, who_name, caller, what, kind, area, owner, due, status, why, evidence, checked_at').gte('call_at', since).order('due', { ascending: true }).limit(500); CPR.promises = pw.error ? [] : (pw.data || []); }catch(e){ CPR.promises = []; }
          try{ const hb = await sb.from('app_data').select('data').eq('key', 'automation_heartbeats').maybeSingle(); CPR.beat = ((hb.data && Array.isArray(hb.data.data)) ? hb.data.data : []).find(b => b && b.automation === 'call-tasks') || null; }catch(e){ CPR.beat = null; }
          try{ const oc = await sb.from('call_record').select('recorded_at, kind, outcome, person_id, lead_id').eq('kind', 'outcome').gte('recorded_at', since).limit(2000); CPR.outcomes = oc.data || []; }catch(e){ CPR.outcomes = []; }
        }
        CPR.at = Date.now();
      }catch(e){ CPR.err = String(e && e.message || e); CPR.rows = []; }
      finally{ CPR.busy = null; }
      return CPR.rows;
    })();
    return CPR.busy;
  }

  /** Cards a PERSON made about the same person within 24 hours after the call. */
  function peopleCards(r){
    const name = lc(r.who_name); if(!name) return [];
    const t0 = Date.parse(r.call_at), t1 = t0 + 24 * 3600e3;
    const items = (typeof DATA !== 'undefined' && Array.isArray(DATA.ops_items)) ? DATA.ops_items : [];
    return items.filter(i => i && lc(i.about) === name && i.opened_by === 'person' && !String(i.created_by || '').includes('@')
      && Date.parse(i.created_at) >= t0 && Date.parse(i.created_at) <= t1);
  }
  /** Work the team did within a day without a new card: people's Hub actions that name the person, and call outcomes tapped. */
  function teamActions(r){
    const name = lc(r.who_name), t0 = Date.parse(r.call_at), t1 = t0 + 24 * 3600e3, out = [];
    if(name) for(const e of CPR.events || []){
      const at = Date.parse(e.at); if(!(at >= t0 && at <= t1)) continue;
      if(lc(e.summary).includes(name)) out.push({ at: e.at, line: (e.actor_name || 'Someone') + ': ' + String(e.summary || e.verb || '').slice(0, 160) });
    }
    for(const o of CPR.outcomes || []){
      const at = Date.parse(o.recorded_at); if(!(at >= t0 - 3600e3 && at <= t1)) continue;
      if((r.person_id && o.person_id === r.person_id) || (r.lead_id && o.lead_id === r.lead_id)) out.push({ at: o.recorded_at, line: 'Call outcome tapped: ' + String(o.outcome || '') });
    }
    return out.slice(0, 8);
  }

  function itemRow(it, resolvedBy){
    const d = DEC[it.decision] || DEC.not_needed, u = URG[it.urgency] || URG.routine, card = it.decision === 'new_card' || it.decision === 'add_to_existing_card';
    return '<div style="border:1.5px ' + (card ? 'dashed var(--border)' : 'solid #EEF1F4') + ';border-radius:10px;padding:9px 11px;margin:6px 0;background:#fff;">'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">' + chip(d[0], d[1], d[2]) + (card ? chip(u[0], u[1], u[2]) : '')
      + '<span style="font-size:11.5px;color:var(--muted);">' + esc(AREA[it.area] || 'Office') + '</span></div>'
      + '<div style="font-weight:' + (card ? 800 : 600) + ';color:var(--navy);font-size:13.5px;margin-top:4px;">' + esc(card ? (it.title || it.responsibility) : it.responsibility) + '</div>'
      + (card && it.why ? '<div style="font-size:12.5px;margin-top:2px;">' + esc(it.why) + '</div>' : '')
      + (card ? '<div class="field-note" style="margin-top:3px;"><b>Owner:</b> ' + esc((it.owner && it.owner.name) || 'nobody found') + (it.owner && it.owner.via ? ' <span style="color:var(--muted);">(' + esc(it.owner.via) + ')</span>' : '')
        + ' · <b>Due:</b> ' + (it.due ? esc(day(it.due)) : 'no date said') + '</div>' : '')
      + (it.decision === 'already_in_workflow' && it.workflow ? '<div class="field-note" style="margin-top:3px;"><b>Where:</b> ' + esc(it.workflow) + '</div>' : '')
      + (it.decision === 'kind_words' && it.quote ? '<div style="font-size:12.5px;margin-top:3px;font-style:italic;">“' + esc(it.quote) + '”</div><div class="field-note" style="margin-top:2px;">Goes to the Kind Words jar as a suggestion for an owner or coordinator to approve. Never a card.</div>' : '')
      + actionsHtml(card ? it.actions : [])
      + '<div class="field-note" style="margin-top:3px;"><b>Why:</b> ' + esc(it.reason || '') + '</div>'
      + (resolvedBy ? '<div class="field-note" style="color:var(--teal);margin-top:3px;"><b>Answered by the later call at ' + esc(when(resolvedBy)) + '</b></div>' : '')
      + '</div>';
  }
  /* the prepared steps (v10): what a person would check and press, in order; in practice only shown */
  function actionsHtml(acts){
    if(!acts || !acts.length) return '';
    return '<div style="margin-top:6px;border-left:3px solid #F0D9A8;padding-left:8px;"><div style="font-size:11px;font-weight:800;letter-spacing:.06em;color:#8A5A00;">PREPARED, A PERSON PRESSES EACH STEP</div>'
      + acts.map(a => {
        const r = a.resolved || {}, v = r.visit, after = r.after;
        return '<div style="font-size:12.5px;margin:4px 0;"><b>' + esc(String(a.step || '')) + '. ' + esc(ACT[a.kind] || a.kind) + '</b>' + (a.to ? ' <span class="field-note">to ' + esc(a.to) + '</span>' : '')
          + (a.waits_for_yes ? ' ' + chip('Waits for their yes', '#B4650C', '#FBEFDC') : '')
          + (v ? '<div class="field-note">' + esc(v.client) + (v.caregiver ? ' with ' + esc(v.caregiver) : '') + ', ' + esc(day(v.date)) + ': ' + esc(v.start) + '–' + esc(v.end) + ' → <b>' + esc(after && after.start || '') + '–' + esc(after && after.end || '') + '</b> (from AxisCare)</div>'
             : a.kind === 'axiscare_visit_change' && (a.date || a.start) ? '<div class="field-note">' + esc(a.client_name || 'the visit') + (a.date ? ', ' + esc(day(a.date)) : '') + (a.start ? ' → ' + esc(a.start) + '–' + esc(a.end) : '') + '</div>' : '')
          + (Array.isArray(r.caregivers) ? '<div class="field-note">Goes to: ' + (r.caregivers.length ? r.caregivers.map(esc).join(', ') : 'nobody on the schedule') + ' (from AxisCare)</div>' : '')
          + (r.note ? '<div class="field-note" style="color:var(--red);">' + esc(r.note) + '</div>' : '')
          + (a.draft ? '<div style="font-style:italic;margin-top:2px;">“' + esc(a.draft) + '”</div>' : '')
          + '</div>';
      }).join('') + '</div>';
  }
  /* an older reading (before v7) has cards only */
  function oldCard(t, resolvedBy){
    return itemRow({ decision: 'new_card', title: t.title, why: t.why, area: t.area, urgency: t.urgency || 'routine', due: t.due, owner: t.owner, reason: 'Read by an earlier version of the reader.' }, resolvedBy);
  }

  /** Why a call or text was not read, in the office's words, and whether the reader is still trying. */
  function unreadLine(r){
    const n = Number(r.attempt) || 1, last = /no transcript/i.test(r.error || '') || n >= MAX_TRIES;
    return '<div style="border:1.5px solid #F0C9C2;background:#FDF3F1;border-radius:10px;padding:9px 11px;margin:6px 0;">'
      + chip(last ? 'Not read' : 'Trying again', '#A83A2F', '#F7E6E3') + ' <span style="font-size:12.5px;">' + esc(r.error || 'Could not read it') + '</span>'
      + '<div class="field-note" style="margin-top:3px;">' + (last ? 'The reader has stopped trying (' + (/no transcript/i.test(r.error || '') ? 'GoHighLevel has no transcript' : n + ' tries') + '). Listen to it in GoHighLevel so nothing it asked for is missed.'
        : 'Try ' + n + ' of ' + MAX_TRIES + '. It tries again about 30 minutes after the last try.') + '</div></div>';
  }
  const unreadFinal = r => r.error && (/no transcript/i.test(r.error) || (Number(r.attempt) || 1) >= MAX_TRIES);
  /** The reader's last run: a stopped or failing reader is seen here, and the hourly watchdog tells the office. */
  function beatLine(){
    const b = CPR.beat; if(!b) return '';
    const age = (Date.now() - Date.parse(b.at)) / 60000, bad = b.ok === false || age > 30;
    return '<span style="' + (bad ? 'color:var(--red);font-weight:700;' : '') + '">Reader last ran ' + (age < 1 ? 'just now' : age < 90 ? Math.round(age) + ' min ago' : Math.round(age / 60) + ' h ago') + (b.ok === false ? ', with a problem' : '') + '</span> · ';
  }
  function promiseRow(w, withCall){
    const st = PSTAT[w.status] || PSTAT.waiting, late = w.status === 'would_remind';
    return '<div style="border:1.5px solid ' + (late ? '#F0C9C2' : '#EEF1F4') + ';border-radius:10px;padding:9px 11px;margin:6px 0;background:#fff;">'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">' + chip(st[0], st[1], st[2]) + chip(PROM[w.kind] || w.kind, '#0D365F', '#E6EEF7') + '<span style="font-size:11.5px;color:var(--muted);">' + esc(AREA[w.area] || 'Office') + '</span></div>'
      + '<div style="font-weight:700;color:var(--navy);font-size:13.5px;margin-top:4px;">' + esc(w.what) + '</div>'
      + '<div class="field-note" style="margin-top:3px;"><b>With:</b> ' + esc(w.who_name || w.caller || 'Unknown') + ' · <b>Owner:</b> ' + esc((w.owner && w.owner.name) || 'nobody found') + ' · <b>Due:</b> ' + esc(day(w.due)) + '</div>'
      + (w.why ? '<div class="field-note" style="margin-top:3px;"><b>What it saw:</b> ' + esc(w.why) + '</div>' : '')
      + ((w.evidence || []).length ? '<ul style="margin:3px 0 0;padding-left:18px;font-size:12px;">' + w.evidence.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul>' : '')
      + (late ? '<div class="field-note" style="margin-top:3px;color:#A83A2F;">Live, ' + esc((w.owner && w.owner.name || 'the owner').split(' ')[0]) + ' would get a reminder the next morning. In practice nobody is reminded.</div>' : '')
      + (withCall ? '<div class="field-note" style="margin-top:3px;"><a href="#" onclick="CPR.openCall(\'' + esc(w.message_id) + '\');return false;">See the ' + (w.channel === 'text' ? 'texts' : 'call') + '</a> (' + esc(when(w.call_at)) + ')</div>' : '')
      + '</div>';
  }
  function promisesView(){
    const ps = (CPR.promises || []).filter(w => w.status !== 'dropped' && (!CPR.day || String(w.due) === CPR.day) && (!lc(CPR.q) || lc(CPR.q).split(/\s+/).every(x => lc([w.what, w.who_name, w.caller, w.why, (w.owner || {}).name].join(' ')).includes(x))));
    if(!(CPR.promises || []).length) return '<div class="card" style="padding:18px;text-align:center;">No promises watched yet. They appear once Desktop step 650 v13 has run and the reader has read a call or text with a promise in it.</div>';
    const grp = (title, list, note) => list.length ? '<div class="card" style="padding:12px 14px;margin-bottom:10px;"><div style="font-size:11.5px;font-weight:800;letter-spacing:.06em;color:var(--navy);">' + esc(title) + ' (' + list.length + ')</div>'
      + (note ? '<div class="field-note" style="margin:2px 0 4px;">' + esc(note) + '</div>' : '') + list.map(w => promiseRow(w, true)).join('') + '</div>' : '';
    const late = ps.filter(w => w.status === 'would_remind'), open = ps.filter(w => w.status === 'waiting'), kept = ps.filter(w => w.status === 'kept' || w.status === 'kept_late').reverse();
    return (grp('PAST DUE, NO SIGN IT WAS KEPT', late, 'Due by 6 pm on the day; nothing since shows it was done.') + grp('STILL OWED', open, 'Not due yet, or due today.') + grp('KEPT', kept, 'A later call, text or card showed it was done.'))
      || '<div class="card" style="padding:18px;text-align:center;">No promises in this view.</div>';
  }

  function render(wrap){
    if(!wrap) return;
    const intro = '<div class="card" style="padding:14px 16px;margin-bottom:12px;background:#FFF8EC;border:1px solid #F0D9A8;">'
      + '<b style="color:#8A5A00;">Practice.</b> These cards are not in anyone\'s work. For each call they show what the AI employee understood, every job it found and why it would or would not make a card, '
      + 'beside what the team actually did. Nothing here creates, changes or sends anything.</div>';
    if(!CPR.rows){ wrap.innerHTML = intro + '<div class="card" style="padding:18px;">Loading the calls…</div>'; load().then(() => { if(typeof MYWORK_TAB !== 'undefined' && MYWORK_TAB === 'callpractice') render(wrap); }); return; }
    if(CPR.err === 'not_installed'){ wrap.innerHTML = intro + '<div class="card" style="padding:18px;">This appears once Desktop step 650 has run.</div>'; return; }
    if(CPR.err){ wrap.innerHTML = intro + '<div class="card" style="padding:18px;">Could not read the calls: ' + esc(CPR.err) + '</div>'; return; }
    const all = CPR.rows;
    const resolvedBy = {};
    all.forEach(r => (r.resolves || []).forEach(x => { resolvedBy[x.message_id + ':' + x.task_index] = r.call_at; }));
    const urgent = r => (r.tasks || []).some(t => t.urgency === 'now' || t.urgency === 'today');
    const words = r => [r.who_name, r.caller, (r.detail || {}).summary, (r.detail || {}).about].concat((r.detail || {}).understood || [], ((r.detail || {}).items || []).map(i => [i.title, i.responsibility, i.why, i.workflow, i.quote].join(' ')), (r.tasks || []).map(x => x.title)).join(' ').toLowerCase();
    const q = lc(CPR.q);
    const rows = all.filter(r => (CPR.msg ? r.message_id === CPR.msg : (CPR.filter === 'all' || (CPR.filter === 'cards' && (r.tasks || []).length) || (CPR.filter === 'none' && !(r.tasks || []).length && !r.error) || (CPR.filter === 'urgent' && urgent(r)) || (CPR.filter === 'unread' && r.error)))
      && (CPR.msg || !CPR.day || chiYmd(Date.parse(r.call_at)) === CPR.day)
      && (CPR.msg || CPR.channel === 'all' || (r.channel || 'call') === CPR.channel)
      && (CPR.msg || !q || q.split(/\s+/).every(w => words(r).includes(w))));
    const notRead = all.filter(unreadFinal), retrying = all.filter(r => r.error && !unreadFinal(r));
    const pw = CPR.promises || [], pLate = pw.filter(w => w.status === 'would_remind').length, pOpen = pw.filter(w => w.status === 'waiting').length, pKept = pw.filter(w => w.status === 'kept' || w.status === 'kept_late').length;
    const nCards = all.reduce((a, r) => a + (r.tasks || []).length, 0);
    const nWork = all.reduce((a, r) => a + ((r.detail && r.detail.items) || []).filter(i => i.decision === 'already_in_workflow' || i.decision === 'done_on_call').length, 0);
    const nPeople = new Set([].concat(...all.map(r => peopleCards(r).map(i => i.id)))).size;
    const c = (k, label) => '<a href="#" onclick="CPR.setChannel(\'' + k + '\');return false;" style="margin-right:10px;' + (CPR.channel === k ? 'font-weight:800;color:var(--navy);' : '') + '">' + label + '</a>';
    const f = (k, label) => '<a href="#" onclick="CPR.setFilter(\'' + k + '\');return false;" style="margin-right:10px;' + (CPR.filter === k ? 'font-weight:800;color:var(--navy);' : '') + '">' + label + '</a>';
    const alarm = notRead.length || retrying.length ? '<div class="card" style="padding:10px 14px;margin-bottom:10px;background:#FDF3F1;border:1px solid #F0C9C2;font-size:13px;">'
      + '<b style="color:#A83A2F;">' + (notRead.length ? notRead.length + ' call' + (notRead.length === 1 ? '' : 's') + ' or text' + (notRead.length === 1 ? '' : 's') + ' could not be read.' : '') + '</b>'
      + (retrying.length ? ' ' + retrying.length + ' being tried again.' : '') + ' Nothing is lost quietly: <a href="#" onclick="CPR.setFilter(\'unread\');return false;">see them</a>' + (notRead.length ? ' and listen to them in GoHighLevel.' : '.') + '</div>' : '';
    let head = alarm + '<div class="field-note" style="margin:0 0 6px;">' + beatLine() + 'Last ' + DAYS + ' days: <b>' + all.length + '</b> calls and texts read · <b>' + nCards + '</b> card' + (nCards === 1 ? '' : 's') + ' it would have made · <b>' + nWork
      + '</b> jobs it found already handled (in a workflow or on the call) · <b>' + nPeople + '</b> cards people made for the same people within a day · '
      + '<a href="#" onclick="CPR.refresh();return false;">Refresh</a></div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 6px;">'
      + '<input id="cprQ" type="search" placeholder="Search a name or anything said" value="' + esc(CPR.q) + '" oninput="CPR.setQuery(this.value)" style="flex:1 1 220px;width:auto;min-width:0;font-size:13px;padding:6px 10px;border:1.5px solid var(--border);border-radius:8px;margin:0;">'
      + '<select id="cprDay" onchange="CPR.setDay(this.value)" style="flex:0 0 auto;width:auto;font-size:13px;padding:6px 8px;border:1.5px solid var(--border);border-radius:8px;margin:0;">'
      + '<option value="">All ' + DAYS + ' days</option>' + Array.from({ length: DAYS }, (_, i) => { const ymd = chiYmd(Date.now() - i * 864e5); return '<option value="' + ymd + '"' + (CPR.day === ymd ? ' selected' : '') + '>' + (i === 0 ? 'Today' : i === 1 ? 'Yesterday' : esc(day(ymd))) + '</option>'; }).join('') + '</select></div>'
      + '<div class="field-note" style="margin:0 0 10px;">Show: ' + f('all', 'All') + f('cards', 'With cards') + f('urgent', 'Urgent') + f('none', 'No card') + f('unread', 'Couldn\'t read' + (notRead.length + retrying.length ? ' (' + (notRead.length + retrying.length) + ')' : ''))
      + f('promises', 'Promises' + (pLate ? ' (' + pLate + ' past due)' : pOpen ? ' (' + pOpen + ' owed)' : ''))
      + ' <span style="margin:0 6px;color:var(--border);">|</span> ' + c('all', 'Calls and texts') + c('call', 'Calls') + c('text', 'Texts') + '</div>';
    if(CPR.msg) head += '<div class="field-note" style="margin:-4px 0 10px;">Showing one ' + (rows[0] && rows[0].channel === 'text' ? 'text conversation' : 'call') + '. <a href="#" onclick="CPR.openCall(\'\');return false;">Back to all</a></div>';
    if(CPR.filter === 'promises' && !CPR.msg){ wrap.innerHTML = intro + head + '<div class="field-note" style="margin:0 0 10px;">' + pLate + ' past due with no sign it was kept · ' + pOpen + ' still owed · ' + pKept + ' kept. Use the day box for promises due that day.</div>' + promisesView(); return; }
    if(!rows.length){ wrap.innerHTML = intro + head + '<div class="card" style="padding:18px;text-align:center;">' + (all.length ? 'No calls or texts in this view.' : 'No calls read yet. The reader looks every 10 minutes.') + '</div>'; return; }
    wrap.innerHTML = intro + head + rows.map(r => {
      const d = r.detail || {};
      const who = r.match === 'one' ? esc(r.who_name || r.caller || 'Someone') + ((r.who_roles || []).length ? ' (' + (r.who_roles || []).map(x => esc(WHO[x] || x)).join(', ') + ')' : '')
        : r.match === 'several' ? esc(r.caller || 'Unknown') + ' <span class="field-note">(shared number)</span>' : esc(r.caller || 'Unknown number') + ' <span class="field-note">(not in our records)</span>';
      const items = (d.items || []);
      const mine = r.error ? unreadLine(r)
        : items.length ? items.map(it => { const ci = (r.tasks || []).findIndex(t => t.title === it.title && it.decision === 'new_card'); return itemRow(it, ci > -1 ? resolvedBy[r.message_id + ':' + ci] : ''); }).join('')
        : (r.tasks || []).length ? r.tasks.map((t, i) => oldCard(t, resolvedBy[r.message_id + ':' + i])).join('')
        : '<div class="field-note">No card: ' + esc(r.no_task_reason || 'nothing to follow up') + '.</div>';
      const understood = (d.understood || []).length ? '<ul style="margin:4px 0 0;padding-left:18px;font-size:12.5px;">' + d.understood.map(u => '<li>' + esc(u) + '</li>').join('') + '</ul>' : '';
      const watch = (CPR.promises || []).filter(w => w.message_id === r.message_id);
      const promises = (d.commitments || []).length ? '<div style="margin-top:6px;display:flex;flex-direction:column;gap:3px;">' + d.commitments.map((c, i) => { const w = watch.find(x => x.idx === i && x.status !== 'dropped'), st = w && (PSTAT[w.status] || PSTAT.waiting);
        return '<div style="font-size:12.5px;">' + chip(PROM[c.kind] || c.kind, '#0D365F', '#E6EEF7') + ' ' + esc(c.what) + (c.when ? ' <span class="field-note">(' + esc(c.when) + ')</span>' : '')
          + (w ? ' ' + chip(st[0] + ' · due ' + day(w.due), st[1], st[2]) + (w.why ? ' <span class="field-note">' + esc(w.why) + '</span>' : '') : '') + '</div>'; }).join('') + '</div>' : '';
      const ppl = peopleCards(r), acts = teamActions(r);
      const theirs = (ppl.length ? ppl.map(i => '<div style="font-size:12.5px;margin:3px 0;">• <b>Card:</b> ' + esc(i.title) + ' <span class="field-note">(' + esc(String(i.created_by || '').split(' ')[0] || 'someone') + ', ' + esc(when(i.created_at)) + ')</span></div>').join('') : '')
        + (acts.length ? acts.map(a => '<div style="font-size:12.5px;margin:3px 0;">• ' + esc(a.line) + ' <span class="field-note">(' + esc(when(a.at)) + ')</span></div>').join('') : '')
        || '<div class="field-note">Nothing the Hub can see. (Changes made directly in AxisCare do not show here yet.)</div>';
      return '<div class="card" style="padding:12px 14px;margin-bottom:10px;">'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:baseline;"><b style="color:var(--navy);">' + who + '</b>'
        + '<span class="field-note">' + esc(when(r.call_at)) + ' · ' + (r.channel === 'text' ? 'texts' : (r.direction === 'in' ? 'they called' : 'we called') + ' · ' + esc(mins(r.seconds))) + ' · ' + esc(ROLE[r.call_type] || r.call_type || '') + '</span></div>'
        + (d.summary ? '<div style="font-size:13px;margin-top:6px;"><b>The call:</b> ' + esc(d.summary) + '</div>' : '')
        + (understood || promises ? '<div style="margin-top:6px;"><div style="font-size:11.5px;font-weight:800;letter-spacing:.06em;color:var(--muted);">WHAT IT UNDERSTOOD</div>' + understood + promises + '</div>' : '')
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-top:10px;">'
        + '<div><div style="font-size:11.5px;font-weight:800;letter-spacing:.06em;color:#8A5A00;">WHAT THE AI WOULD DO</div>' + mine + '</div>'
        + '<div><div style="font-size:11.5px;font-weight:800;letter-spacing:.06em;color:var(--navy);">WHAT THE TEAM DID (WITHIN A DAY)</div>' + theirs + '</div>'
        + '</div></div>';
    }).join('');
  }

  let qTimer = null;
  function redraw(keepFocus){
    const w = document.getElementById('myWorkWrap'); if(!w) return;
    const el = keepFocus ? document.getElementById('cprQ') : null, pos = el ? el.selectionStart : null;
    render(w);
    if(keepFocus){ const n = document.getElementById('cprQ'); if(n){ n.focus(); try{ n.setSelectionRange(pos, pos); }catch(e){} } }
  }
  window.CPR = { offered, load, render, peopleCards, teamActions,
    setQuery(v){ CPR.q = String(v || ''); clearTimeout(qTimer); qTimer = setTimeout(() => redraw(true), 200); },
    setDay(v){ CPR.day = String(v || ''); redraw(false); },
    setChannel(k){ CPR.channel = k; redraw(false); },
    setFilter(k){ CPR.filter = k; CPR.msg = ''; const w = document.getElementById('myWorkWrap'); if(w) render(w); },
    openCall(id){ CPR.msg = String(id || ''); if(!id && CPR.filter !== 'promises') CPR.filter = 'all'; redraw(false); const w = document.getElementById('myWorkWrap'); if(w && w.scrollIntoView) w.scrollIntoView({ block: 'start' }); },
    refresh(){ CPR.rows = null; const w = document.getElementById('myWorkWrap'); if(w) render(w); } };
})();
