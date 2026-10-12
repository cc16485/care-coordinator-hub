/* =====================================================================================================================
   CALL FOLLOW-UPS, PRACTICE (650, Samantha approved 2026-10-12, decisions 1-4). A tab on My Work, offered while the
   practice switch (ops_settings.call_tasks_practice) is on. For each answered call of the last 7 days it shows what the
   AI employee read in the call and the follow-up cards it WOULD have made, beside the cards people actually made for the
   same person within a day of the call, so the office can judge it before any card goes live.
     · These cards are in nobody's work. Nothing here creates, changes or sends anything.
     · The readings come from call_task_reading (office roles only). The comparison uses the cards already loaded
       (DATA.ops_items): a card made by a person, about the same person, within 24 hours after the call.
     · No transcript is shown or kept; the card's reason is what the AI wrote, with phone numbers and emails removed.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const lc = s => String(s || '').trim().toLowerCase();
  const AREA = { scheduling: 'Scheduling', client_care: 'Client care', recruiting: 'Recruiting', caregiver_support: 'Caregiver support', admin: 'Office', leads: 'Leads' };
  const TYPE = { client_or_family: 'client or family', caregiver: 'caregiver', applicant: 'applicant', referral_partner: 'referral partner', new_client_inquiry: 'new client inquiry',
    vendor: 'vendor', wrong_number_or_spam: 'wrong number or spam', internal: 'internal', other: 'other' };
  const ROLE = { client: 'client', caregiver: 'caregiver', lead: 'lead', applicant: 'applicant', contact: 'client contact' };
  const CPR = { rows: null, at: 0, busy: null, err: '' };

  const when = iso => { try{ return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }catch(e){ return ''; } };
  const day = ymd => { try{ return new Date(ymd + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }catch(e){ return ymd; } };
  const mins = s => { const n = Math.round(Number(s || 0)); return n < 60 ? n + ' s' : Math.floor(n / 60) + ' min' + (n % 60 ? ' ' + (n % 60) + ' s' : ''); };

  /** Offered only while practice is on (the Owners Hub switch). */
  function offered(){ try{ return !!(DATA && DATA.ops_settings && DATA.ops_settings.call_tasks_practice === true); }catch(e){ return false; } }

  async function load(force){
    if(CPR.busy) return CPR.busy;
    if(!force && CPR.rows && Date.now() - CPR.at < 120000) return CPR.rows;
    CPR.busy = (async () => {
      try{
        const since = new Date(Date.now() - 7 * 864e5).toISOString();
        const { data, error } = await sb.from('call_task_reading')
          .select('message_id, call_at, direction, seconds, caller, match, who_name, who_roles, call_type, tasks, resolves, no_task_reason, error, read_at')
          .gte('call_at', since).order('call_at', { ascending: false }).limit(300);
        if(error){ CPR.err = /does not exist|schema cache/i.test(error.message) ? 'not_installed' : error.message; CPR.rows = []; }
        else {
          /* a call read again by a newer reader shows once: its newest reading (2026-10-12, the v2 call-off rule) */
          const newest = {};
          for(const r of (data || [])) if(!newest[r.message_id] || String(r.read_at) > String(newest[r.message_id].read_at)) newest[r.message_id] = r;
          CPR.err = ''; CPR.rows = (data || []).filter(r => newest[r.message_id] === r);
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

  function card(t, resolvedBy){
    return '<div style="border:1.5px dashed var(--border);border-radius:10px;padding:10px 12px;margin:6px 0;background:#fff;">'
      + '<div style="font-weight:800;color:var(--navy);font-size:14px;">' + esc(t.title) + '</div>'
      + (t.why ? '<div style="font-size:13px;margin-top:3px;">' + esc(t.why) + '</div>' : '')
      + '<div class="field-note" style="margin-top:4px;">' + [AREA[t.area] || 'Office', t.due ? 'due ' + esc(day(t.due)) : 'no date said', t.voicemail ? 'from a voicemail' : '']
        .filter(Boolean).join(' · ')
      + (t.add_to_card_id ? ' · <b>would add to an open card</b> instead of a new one' : '') + '</div>'
      + (resolvedBy ? '<div class="field-note" style="color:var(--teal);margin-top:3px;"><b>Answered by the later call at ' + esc(when(resolvedBy)) + ':</b> it would not stay open</div>' : '')
      + '</div>';
  }

  function render(wrap){
    if(!wrap) return;
    const intro = '<div class="card" style="padding:14px 16px;margin-bottom:12px;background:#FFF8EC;border:1px solid #F0D9A8;">'
      + '<b style="color:#8A5A00;">Practice.</b> These cards are not in anyone\'s work. They show what the AI employee would have made from each call, '
      + 'beside the cards people made for the same person, so you can judge it before it goes live. Nothing here creates, changes or sends anything.</div>';
    if(!CPR.rows){ wrap.innerHTML = intro + '<div class="card" style="padding:18px;">Loading the calls…</div>'; load().then(() => { if(typeof MYWORK_TAB !== 'undefined' && MYWORK_TAB === 'callpractice') render(wrap); }); return; }
    if(CPR.err === 'not_installed'){ wrap.innerHTML = intro + '<div class="card" style="padding:18px;">This appears once Desktop step 650 has run.</div>'; return; }
    if(CPR.err){ wrap.innerHTML = intro + '<div class="card" style="padding:18px;">Could not read the calls: ' + esc(CPR.err) + '</div>'; return; }
    const rows = CPR.rows;
    const resolvedBy = {};   // "message_id:index" -> the later call's time
    rows.forEach(r => (r.resolves || []).forEach(x => { resolvedBy[x.message_id + ':' + x.task_index] = r.call_at; }));
    const nCards = rows.reduce((a, r) => a + (r.tasks || []).length, 0);
    const nPeople = new Set([].concat(...rows.map(r => peopleCards(r).map(i => i.id)))).size;   // one card counts once, however many calls it follows
    const head = '<div class="field-note" style="margin:0 0 10px;">Last 7 days: <b>' + rows.length + '</b> calls read, <b>' + nCards + '</b> card' + (nCards === 1 ? '' : 's')
      + ' it would have made, <b>' + nPeople + '</b> made by people for the same people within a day. '
      + '<a href="#" onclick="CPR.refresh();return false;">Refresh</a></div>';
    if(!rows.length){ wrap.innerHTML = intro + head + '<div class="card" style="padding:18px;text-align:center;">No calls read yet. The reader looks every 10 minutes.</div>'; return; }
    wrap.innerHTML = intro + head + rows.map(r => {
      const who = r.match === 'one' ? esc(r.who_name || r.caller || 'Someone') + ((r.who_roles || []).length ? ' (' + (r.who_roles || []).map(x => esc(ROLE[x] || x)).join(', ') + ')' : '')
        : r.match === 'several' ? esc(r.caller || 'Unknown') + ' <span class="field-note">(shared number)</span>' : esc(r.caller || 'Unknown number') + ' <span class="field-note">(not in our records)</span>';
      const tasks = r.tasks || [];
      const mine = r.error ? '<div class="field-note" style="color:var(--red);">Could not read this call: ' + esc(r.error) + '</div>'
        : tasks.length ? tasks.map((t, i) => card(t, resolvedBy[r.message_id + ':' + i])).join('')
        : '<div class="field-note">No card: ' + esc(r.no_task_reason || 'nothing to follow up') + '.</div>';
      const answers = (r.resolves || []).length ? '<div class="field-note" style="color:var(--teal);">This call answered ' + r.resolves.length + ' earlier card' + (r.resolves.length === 1 ? '' : 's') + '.</div>' : '';
      const ppl = peopleCards(r);
      const theirs = ppl.length ? ppl.map(i => '<div style="font-size:13px;margin:3px 0;">• ' + esc(i.title) + ' <span class="field-note">(' + esc(String(i.created_by || '').split(' ')[0] || 'someone') + ', ' + esc(when(i.created_at)) + ')</span></div>').join('')
        : '<div class="field-note">None.</div>';
      return '<div class="card" style="padding:12px 14px;margin-bottom:10px;">'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:baseline;"><b style="color:var(--navy);">' + who + '</b>'
        + '<span class="field-note">' + esc(when(r.call_at)) + ' · ' + (r.direction === 'in' ? 'they called' : 'we called') + ' · ' + esc(mins(r.seconds)) + ' · ' + esc(TYPE[r.call_type] || r.call_type || '') + '</span></div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:8px;">'
        + '<div><div style="font-size:11.5px;font-weight:800;letter-spacing:.06em;color:#8A5A00;">THE AI WOULD HAVE MADE</div>' + mine + answers + '</div>'
        + '<div><div style="font-size:11.5px;font-weight:800;letter-spacing:.06em;color:var(--navy);">PEOPLE MADE (WITHIN A DAY)</div>' + theirs + '</div>'
        + '</div></div>';
    }).join('');
  }

  window.CPR = { offered, load, render, peopleCards,
    refresh(){ CPR.rows = null; const w = document.getElementById('myWorkWrap'); if(w) render(w); } };
})();
