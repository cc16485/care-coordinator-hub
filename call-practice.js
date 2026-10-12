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
  const CPR = { rows: null, events: [], outcomes: [], at: 0, busy: null, err: '', filter: 'all' };

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
        const since = new Date(Date.now() - 7 * 864e5).toISOString();
        const { data, error } = await sb.from('call_task_reading')
          .select('message_id, version, call_at, direction, seconds, caller, match, person_id, lead_id, who_name, who_roles, call_type, tasks, resolves, no_task_reason, error, read_at, detail')
          .gte('call_at', since).order('call_at', { ascending: false }).limit(400);
        if(error){ CPR.err = /does not exist|schema cache/i.test(error.message) ? 'not_installed' : error.message; CPR.rows = []; }
        else {
          /* a call read again by a newer reader shows once: its newest reading */
          const newest = {};
          for(const r of (data || [])) if(!newest[r.message_id] || String(r.read_at) > String(newest[r.message_id].read_at)) newest[r.message_id] = r;
          CPR.err = ''; CPR.rows = (data || []).filter(r => newest[r.message_id] === r);
          /* what the team did: people's actions in the Hub, and call outcomes tapped (both read only; best effort) */
          try{ const ev = await sb.from('op_events').select('at, actor_name, actor_kind, verb, summary, item_id').eq('actor_kind', 'person').gte('at', since).order('at', { ascending: true }).limit(3000); CPR.events = ev.data || []; }catch(e){ CPR.events = []; }
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
      + '<div class="field-note" style="margin-top:3px;"><b>Why:</b> ' + esc(it.reason || '') + '</div>'
      + (resolvedBy ? '<div class="field-note" style="color:var(--teal);margin-top:3px;"><b>Answered by the later call at ' + esc(when(resolvedBy)) + '</b></div>' : '')
      + '</div>';
  }
  /* an older reading (before v7) has cards only */
  function oldCard(t, resolvedBy){
    return itemRow({ decision: 'new_card', title: t.title, why: t.why, area: t.area, urgency: t.urgency || 'routine', due: t.due, owner: t.owner, reason: 'Read by an earlier version of the reader.' }, resolvedBy);
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
    const rows = all.filter(r => CPR.filter === 'all' || (CPR.filter === 'cards' && (r.tasks || []).length) || (CPR.filter === 'none' && !(r.tasks || []).length && !r.error) || (CPR.filter === 'urgent' && urgent(r)));
    const nCards = all.reduce((a, r) => a + (r.tasks || []).length, 0);
    const nWork = all.reduce((a, r) => a + ((r.detail && r.detail.items) || []).filter(i => i.decision === 'already_in_workflow' || i.decision === 'done_on_call').length, 0);
    const nPeople = new Set([].concat(...all.map(r => peopleCards(r).map(i => i.id)))).size;
    const f = (k, label) => '<a href="#" onclick="CPR.setFilter(\'' + k + '\');return false;" style="margin-right:10px;' + (CPR.filter === k ? 'font-weight:800;color:var(--navy);' : '') + '">' + label + '</a>';
    const head = '<div class="field-note" style="margin:0 0 6px;">Last 7 days: <b>' + all.length + '</b> calls read · <b>' + nCards + '</b> card' + (nCards === 1 ? '' : 's') + ' it would have made · <b>' + nWork
      + '</b> jobs it found already handled (in a workflow or on the call) · <b>' + nPeople + '</b> cards people made for the same people within a day · '
      + '<a href="#" onclick="CPR.refresh();return false;">Refresh</a></div>'
      + '<div class="field-note" style="margin:0 0 10px;">Show: ' + f('all', 'All calls') + f('cards', 'With cards') + f('urgent', 'Urgent') + f('none', 'No card') + '</div>';
    if(!rows.length){ wrap.innerHTML = intro + head + '<div class="card" style="padding:18px;text-align:center;">' + (all.length ? 'No calls in this view.' : 'No calls read yet. The reader looks every 10 minutes.') + '</div>'; return; }
    wrap.innerHTML = intro + head + rows.map(r => {
      const d = r.detail || {};
      const who = r.match === 'one' ? esc(r.who_name || r.caller || 'Someone') + ((r.who_roles || []).length ? ' (' + (r.who_roles || []).map(x => esc(WHO[x] || x)).join(', ') + ')' : '')
        : r.match === 'several' ? esc(r.caller || 'Unknown') + ' <span class="field-note">(shared number)</span>' : esc(r.caller || 'Unknown number') + ' <span class="field-note">(not in our records)</span>';
      const items = (d.items || []);
      const mine = r.error ? '<div class="field-note" style="color:var(--red);">Could not read this call: ' + esc(r.error) + '</div>'
        : items.length ? items.map(it => { const ci = (r.tasks || []).findIndex(t => t.title === it.title && it.decision === 'new_card'); return itemRow(it, ci > -1 ? resolvedBy[r.message_id + ':' + ci] : ''); }).join('')
        : (r.tasks || []).length ? r.tasks.map((t, i) => oldCard(t, resolvedBy[r.message_id + ':' + i])).join('')
        : '<div class="field-note">No card: ' + esc(r.no_task_reason || 'nothing to follow up') + '.</div>';
      const understood = (d.understood || []).length ? '<ul style="margin:4px 0 0;padding-left:18px;font-size:12.5px;">' + d.understood.map(u => '<li>' + esc(u) + '</li>').join('') + '</ul>' : '';
      const promises = (d.commitments || []).length ? '<div style="margin-top:6px;display:flex;flex-direction:column;gap:3px;">' + d.commitments.map(c => '<div style="font-size:12.5px;">' + chip(PROM[c.kind] || c.kind, '#0D365F', '#E6EEF7') + ' ' + esc(c.what) + (c.when ? ' <span class="field-note">(' + esc(c.when) + ')</span>' : '') + '</div>').join('') + '</div>' : '';
      const ppl = peopleCards(r), acts = teamActions(r);
      const theirs = (ppl.length ? ppl.map(i => '<div style="font-size:12.5px;margin:3px 0;">• <b>Card:</b> ' + esc(i.title) + ' <span class="field-note">(' + esc(String(i.created_by || '').split(' ')[0] || 'someone') + ', ' + esc(when(i.created_at)) + ')</span></div>').join('') : '')
        + (acts.length ? acts.map(a => '<div style="font-size:12.5px;margin:3px 0;">• ' + esc(a.line) + ' <span class="field-note">(' + esc(when(a.at)) + ')</span></div>').join('') : '')
        || '<div class="field-note">Nothing the Hub can see. (Changes made directly in AxisCare do not show here yet.)</div>';
      return '<div class="card" style="padding:12px 14px;margin-bottom:10px;">'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:baseline;"><b style="color:var(--navy);">' + who + '</b>'
        + '<span class="field-note">' + esc(when(r.call_at)) + ' · ' + (r.direction === 'in' ? 'they called' : 'we called') + ' · ' + esc(mins(r.seconds)) + ' · ' + esc(ROLE[r.call_type] || r.call_type || '') + '</span></div>'
        + (d.summary ? '<div style="font-size:13px;margin-top:6px;"><b>The call:</b> ' + esc(d.summary) + '</div>' : '')
        + (understood || promises ? '<div style="margin-top:6px;"><div style="font-size:11.5px;font-weight:800;letter-spacing:.06em;color:var(--muted);">WHAT IT UNDERSTOOD</div>' + understood + promises + '</div>' : '')
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-top:10px;">'
        + '<div><div style="font-size:11.5px;font-weight:800;letter-spacing:.06em;color:#8A5A00;">WHAT THE AI WOULD DO</div>' + mine + '</div>'
        + '<div><div style="font-size:11.5px;font-weight:800;letter-spacing:.06em;color:var(--navy);">WHAT THE TEAM DID (WITHIN A DAY)</div>' + theirs + '</div>'
        + '</div></div>';
    }).join('');
  }

  window.CPR = { offered, load, render, peopleCards, teamActions,
    setFilter(k){ CPR.filter = k; const w = document.getElementById('myWorkWrap'); if(w) render(w); },
    refresh(){ CPR.rows = null; const w = document.getElementById('myWorkWrap'); if(w) render(w); } };
})();
