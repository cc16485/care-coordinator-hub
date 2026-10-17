/* THE TEAM ACTIONS (Springfield structure, Samantha approved 2026-10-17, plan VWRK2aGB1WkRaxV2Xn9MJ9).
   Helping, asking the team, asking leadership for a decision and moving responsibility are four different acts, and
   only the last one changes who is accountable.

     Help with this           you do a step or all of it. The owner stays the owner.            it.help_from = you
     Needs team support       the owner asks a teammate first, never leadership by default.      it.help_from = teammate
     Escalate for decision    one question to leadership (Samantha, or Zach as backup). The      it.decision
                              owner keeps the item and carries out the answer.
     Take it (transfer)       only with a confirm and a reason; the old owner is told.           owner_history + notice

   And the two ways a helper finishes (2026-10-17 refinement 4):
     My part is done          the owner sees what was done and what is left; it rises on their Today.
     This is finished         the helper closes it; the owner is told who closed it and why, and can reopen it for a day.

   Telling someone is a NOTICE on the item: it.notices = [{ id, for, kind, by, by_name, at, text, next, seen_at }].
   Notices show on My Work under FOR YOU TO KNOW until the person taps Got it. Nothing here texts or emails anyone.

   Also here: who the In charge seat is, the lighter-loaded Care Coordinator (refinement 1), and the emergency line on
   critical cards (refinement 3: anyone acts first, the ladder only decides who else is told). */
(function(){
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s));
  const lc = s => String(s || '').trim().toLowerCase();
  const DAY = 864e5;
  const me = () => { try{ return lc(ccActor().email); }catch(e){ return ''; } };
  const myName = () => { try{ return ccActor().name || ''; }catch(e){ return ''; } };
  const nameOf = e => { try{ return (typeof opsOwnerName === 'function' && opsOwnerName(e)) || String(e || '').split('@')[0]; }catch(_){ return String(e || '').split('@')[0]; } };
  const first = s => String(s || '').split(' ')[0];
  const firstOf = e => first(nameOf(e));
  const item = id => (DATA.ops_items || []).find(x => x.id === id);
  const nowIso = () => new Date().toISOString();
  const refresh = () => { try{ myWorkRefresh(); }catch(e){} };
  const settings = () => DATA.ops_settings || {};

  /* ── seats ── */
  function seat(area){ try{ return (typeof routeSeatNow === 'function' && routeSeatNow(area)) || { person:'' }; }catch(e){ return { person:'' }; } }
  function inCharge(){ return lc(seat('in_charge').person); }
  function leadership(){ return lc(seat('owner_escalation').person); }
  function backup(){ return lc(settings().leadership_backup); }
  /* Who can answer a leadership decision: Samantha (the Leadership seat) and, when set, Zach as backup. */
  function deciders(){
    const out = []; const l = leadership(), b = backup();
    if(l) out.push({ email:l, label:'Leadership' });
    if(b && b !== l) out.push({ email:b, label:'Leadership backup' });
    return out;
  }

  /* ── Care Coordinators and their load (refinement 1) ── */
  function rolesOf(e){ try{ return (typeof ccRolesFor === 'function' && ccRolesFor(e)) || []; }catch(_){ return []; } }
  function roster(){ try{ return (typeof roleStaff === 'function' ? roleStaff() : (DATA.coordinator_staff || [])).map(s => lc(s.email)).filter(Boolean); }catch(_){ return []; } }
  function coordinators(){ return roster().filter(e => rolesOf(e).indexOf('care_coordinator') > -1); }
  function load(e){
    const now = Date.now();
    const mine = (DATA.ops_items || []).filter(i => i.status === 'open' && lc(i.owner) === e);
    const late = mine.filter(i => i.due && Date.parse(i.due) < now).length;
    return { open: mine.length, late, score: mine.length + 2 * late };
  }
  /* Payroll day: ops_settings.payroll_days (0 = Sunday) and payroll_person. On those days the payroll person is not the
     default inbox for new Care Coordination work, while another coordinator is working. */
  function payrollToday(e){
    const st = settings(), d = Array.isArray(st.payroll_days) ? st.payroll_days.map(Number) : [];
    return !!e && lc(st.payroll_person) === e && d.indexOf(new Date().getDay()) > -1;
  }
  /* The Care Coordinator who should get new Care Coordination work: with two or more, the one carrying less (open, and
     late counted double), skipping the payroll person on payroll day. One coordinator: null (nothing changes). */
  function lighterCoordinator(){
    let cc = coordinators();
    if(cc.length < 2) return null;
    const notPayroll = cc.filter(e => !payrollToday(e));
    if(notPayroll.length) cc = notPayroll;
    const ranked = cc.map(e => Object.assign({ email:e }, load(e))).sort((a, b) => a.score - b.score || a.late - b.late);
    const pick = ranked[0];
    const payer = coordinators().find(payrollToday);
    const why = payer && payer !== pick.email ? firstOf(payer) + ' is on payroll today'
      : 'carrying the least right now (' + pick.open + ' open, ' + pick.late + ' late)';
    return { email:pick.email, reason:'Care Coordinator ' + why };
  }
  /* A teammate to ask for support: the other Care Coordinator for a coordinator's work; whoever is In charge for
     anyone else. Never leadership by default. */
  function teammate(it){
    const o = lc(it && it.owner), m = me();
    if(rolesOf(o).indexOf('care_coordinator') > -1){
      const other = coordinators().filter(e => e !== o && e !== m).sort((a, b) => load(a).score - load(b).score)[0];
      if(other) return { email:other, reason:'The other Care Coordinator' };
    }
    const ic = inCharge();
    if(ic && ic !== o && ic !== m) return { email:ic, reason:'In charge now' };
    return null;
  }

  /* ── critical: anyone acts first ── */
  function critical(it){
    if(!it || it.status !== 'open') return false;
    const e = it.escalation;
    if(e && !e.cleared_at && e.level === 'urgent') return true;
    const staffing = it.domain === 'scheduling_coverage' || /^(coverage|staffing_issue|staffing)$/.test(String(it.kind || ''));
    return staffing && (it.urgency === 'urgent' || /timekeeper/.test(String(it.opened_by || '')));
  }

  /* ── notices ── */
  function notify(it, who, kind, text, next){
    who = lc(who); if(!who || who === me()) return;
    it.notices = (Array.isArray(it.notices) ? it.notices : []).concat([{ id:'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      for:who, kind, by:me(), by_name:myName(), at:nowIso(), text:text || '', next:next || '' }]).slice(-12);
  }
  function unseen(it, who){ who = lc(who || me()); return (Array.isArray(it && it.notices) ? it.notices : []).filter(n => lc(n.for) === who && !n.seen_at); }
  /* Everything waiting for me to know: open or closed, the last 2 days. */
  function myNotices(){
    const m = me(), cut = Date.now() - 2 * DAY, out = [];
    (DATA.ops_items || []).forEach(it => unseen(it, m).forEach(n => { if(Date.parse(n.at) >= cut) out.push({ it, n }); }));
    return out.sort((a, b) => String(b.n.at).localeCompare(String(a.n.at)));
  }
  /* My own open work with something new on it (a helper's part done, a decision answered) belongs on Today. */
  function needsMeNow(it){ return it.status === 'open' && lc(it.owner) === me() && unseen(it).some(n => n.kind === 'part_done' || n.kind === 'decision'); }

  /* ── popups ── */
  function pop(anchorId, html, width){ return ccPopOpen(document.getElementById(anchorId) || document.body, html, { width:width || 340 }); }
  const btns = (go, label) => '<div style="display:flex;gap:8px;margin-top:10px;"><button class="primary" id="' + go + '" style="padding:7px 14px;font-size:13px;">' + label + '</button>'
    + '<button class="ghost" id="taCancel" style="padding:7px 14px;font-size:13px;">Cancel</button></div>';
  const area = (id, ph, rows) => '<textarea id="' + id + '" rows="' + (rows || 3) + '" placeholder="' + esc(ph) + '" style="width:100%;font-size:13px;padding:8px;border-radius:8px;margin-top:4px;"></textarea>';
  const say = m => { try{ ccToast(m); }catch(e){} };
  const warn = m => { try{ alert(m); }catch(e){} };

  /* ── Help with this ── */
  async function helpWith(id){
    const it = item(id); if(!it) return;
    const m = me(); if(!m) return;
    if(lc(it.owner) === m) return say('This is already yours.');
    it.help_from = m; it.help_asked_at = it.help_asked_at || nowIso(); it.helping_since = nowIso();
    opsLog(it, myName() + ' is helping. Still ' + firstOf(it.owner) + '’s.');
    notify(it, it.owner, 'helping', myName() + ' is helping with this.');
    try{ opEvent('help_joined', { item:it, summary:myName() + ' is helping with ' + (it.about || it.title || 'this') + ' (still ' + firstOf(it.owner) + '’s)' }); }catch(e){}
    await persist('ops_items', it);
    say('You’re helping. It stays ' + firstOf(it.owner) + '’s.'); refresh();
  }

  /* ── My part is done ── */
  function partDone(id, anchorId){
    const it = item(id); if(!it) return;
    const o = firstOf(it.owner);
    const el = pop(anchorId, '<div style="font-size:13.5px;font-weight:700;">My part is done</div>'
      + '<div class="field-note">' + esc(o) + ' stays responsible and sees this at the top of their list.</div>'
      + '<div style="font-size:12.5px;margin-top:8px;font-weight:600;">What did you do?</div>' + area('taDid', 'Called the daughter, she is fine with Thursday', 2)
      + '<div style="font-size:12.5px;margin-top:8px;font-weight:600;">What’s left for ' + esc(o) + '?</div>' + area('taNext', 'Confirm the new time in AxisCare', 2)
      + btns('taGo', 'Send to ' + esc(o)));
    el.querySelector('#taCancel').onclick = ccPopClose;
    el.querySelector('#taGo').onclick = async () => {
      const did = el.querySelector('#taDid').value.trim(), next = el.querySelector('#taNext').value.trim();
      if(!did) return warn('Say what you did, so ' + o + ' doesn’t have to ask.');
      ccPopClose();
      if(lc(it.help_from) === me()){ it.help_from = null; it.help_asked_at = null; }
      opsLog(it, myName() + ' did their part: ' + did + (next ? '. Left for ' + o + ': ' + next : ''));
      notify(it, it.owner, 'part_done', did, next);
      try{ opEvent('help_part_done', { item:it, summary:myName() + ' did their part on ' + (it.about || it.title || 'this') + ': ' + did }); }catch(e){}
      await persist('ops_items', it);
      say('Sent to ' + o + '.'); refresh();
    };
  }

  /* ── This is finished (the helper closes it; the owner can reopen it for a day) ── */
  function finish(id, anchorId){
    const it = item(id); if(!it) return;
    const o = firstOf(it.owner);
    const el = pop(anchorId, '<div style="font-size:13.5px;font-weight:700;">This is finished</div>'
      + '<div class="field-note">Closes it. ' + esc(o) + ' is told you closed it and why, and can reopen it until this time tomorrow.</div>'
      + '<div style="font-size:12.5px;margin-top:8px;font-weight:600;">What finished it?</div>' + area('taWhy', 'Maria covered the shift and clocked in at 9:02')
      + btns('taGo', 'Close it'));
    el.querySelector('#taCancel').onclick = ccPopClose;
    el.querySelector('#taGo').onclick = async () => {
      const why = el.querySelector('#taWhy').value.trim();
      if(!why) return warn('Say what finished it, so ' + o + ' knows it’s really done.');
      ccPopClose();
      const at = nowIso();
      it.status = 'done'; it.closed_at = at; it.closed_by = me(); it.close_note = why; it.resolution_code = 'finished_by_helper';
      it.finished_for = { owner:lc(it.owner), by:me(), by_name:myName(), at, note:why, reopen_until:new Date(Date.now() + DAY).toISOString() };
      if(lc(it.help_from) === me()){ it.help_from = null; it.help_asked_at = null; }
      opsLog(it, 'Finished by ' + myName() + ': ' + why);
      notify(it, it.owner, 'finished', why);
      try{ opEvent('item_resolved', { item:it, summary:(it.about || it.title || 'this') + ' finished by ' + myName() + ' for ' + o + ': ' + why }); }catch(e){}
      await persist('ops_items', it);
      say('Closed. ' + o + ' is told.'); refresh();
    };
  }
  function canReopen(it){ return !!(it && it.status === 'done' && it.finished_for && Date.parse(it.finished_for.reopen_until) > Date.now()); }
  async function reopen(id){
    const it = item(id); if(!canReopen(it)) return warn('This can only be reopened for a day after it was closed.');
    const by = it.finished_for.by;
    it.status = 'open'; it.closed_at = null; it.closed_by = null; it.close_note = null; it.resolution_code = null; it.finished_for.reopened_at = nowIso();
    opsLog(it, myName() + ' reopened it (it wasn’t finished)');
    notify(it, by, 'reopened', myName() + ' reopened it: it wasn’t finished.');
    seenAll(it, 'finished');
    try{ opEvent('item_reopened', { item:it, summary:myName() + ' reopened ' + (it.about || it.title || 'this') }); }catch(e){}
    await persist('ops_items', it);
    say('Reopened. It’s yours again.'); refresh();
  }

  /* ── Needs team support (was "Ask for help"; never leadership by default) ── */
  function askSupport(id, anchorId){
    const it = item(id); if(!it) return;
    const sug = teammate(it);
    ccPickPerson(document.getElementById(anchorId) || document.body, {
      current:it.help_from, suggested:sug,
      onPick:async (e) => {
        e = lc(e); if(!e) return;
        if(e === lc(it.owner)) return warn('Pick someone other than the owner.');
        it.help_from = e; it.help_asked_at = nowIso();
        opsLog(it, 'Asked ' + nameOf(e) + ' for team support. Still owned by ' + (nameOf(it.owner) || 'nobody'));
        notify(it, e, 'support', myName() + ' asked you for help. It stays ' + firstOf(it.owner) + '’s.');
        try{ opEvent('help_asked', { item:it, summary:(it.about || it.title || '') + ': ' + myName() + ' asked ' + nameOf(e) + ' for team support (still theirs)' }); }catch(err){}
        await persist('ops_items', it);
        say('Asked ' + firstOf(e) + '. It stays yours.'); refresh();
      }
    });
  }

  /* ── Escalate for decision (was "Hand it over, needs Samantha") ── */
  function escalateDecision(id, anchorId){
    const it = item(id); if(!it) return;
    const ds = deciders();
    if(!ds.length) return warn('Nobody holds Leadership right now. Set it under Settings, On-duty seats.');
    const el = pop(anchorId, '<div style="font-size:13.5px;font-weight:700;">Escalate for decision</div>'
      + '<div class="field-note">It stays yours. Leadership answers the question, then you carry it out.</div>'
      + '<div style="font-size:12.5px;margin-top:8px;font-weight:600;">What needs deciding?</div>' + area('taQ', 'Can we allow 3-hour visits for this family? Our minimum is 4.')
      + '<div style="font-size:12.5px;margin-top:8px;font-weight:600;">What do you recommend?</div>' + area('taRec', 'Optional', 2)
      + '<div style="font-size:12.5px;margin-top:8px;font-weight:600;">Ask</div>'
      + '<select id="taTo" style="width:100%;font-size:13px;padding:6px;border-radius:8px;">'
      + ds.map(d => '<option value="' + esc(d.email) + '">' + esc(nameOf(d.email)) + ' (' + esc(d.label) + ')</option>').join('') + '</select>'
      + '<div class="field-note" style="margin-top:6px;">Zach answers only when Samantha can’t be reached and it can’t wait, and never on firing or changing policy or pay.</div>'
      + btns('taGo', 'Ask'), 360);
    el.querySelector('#taCancel').onclick = ccPopClose;
    el.querySelector('#taGo').onclick = async () => {
      const q = el.querySelector('#taQ').value.trim(), rec = el.querySelector('#taRec').value.trim(), to = lc(el.querySelector('#taTo').value);
      if(!q) return warn('Write the question, so it can be answered without a call.');
      ccPopClose();
      it.decision = { to, to_name:nameOf(to), question:q, recommend:rec, asked_by:me(), asked_by_name:myName(), asked_at:nowIso() };
      it.sub_state = 'waiting'; it.waiting_on = 'a decision from ' + firstOf(to);
      if(!it.check_back){ const t = new Date(Date.now() + DAY); it.check_back = t.toISOString().slice(0, 10); }
      opsLog(it, 'Asked ' + nameOf(to) + ' to decide: ' + q + (rec ? ' (recommends: ' + rec + ')' : '') + '. Still ' + firstOf(it.owner) + '’s.');
      notify(it, to, 'decide', q, rec);
      try{ opEvent('item_escalated', { item:it, summary:(it.about || it.title || '') + ': decision asked of ' + nameOf(to) + ' (owner keeps it)' }); }catch(e){}
      await persist('ops_items', it);
      say('Asked ' + firstOf(to) + '. It stays yours.'); refresh();
    };
  }
  function decisionFor(it, who){ const d = it && it.decision; return !!(d && !d.answered_at && it.status === 'open' && lc(d.to) === lc(who || me())); }
  function answer(id, anchorId){
    const it = item(id); if(!it || !it.decision) return;
    const d = it.decision, o = firstOf(it.owner);
    const el = pop(anchorId, '<div style="font-size:13.5px;font-weight:700;">Your decision</div>'
      + '<div style="font-size:13px;margin-top:6px;">' + esc(d.question) + '</div>'
      + (d.recommend ? '<div class="field-note" style="margin-top:4px;">' + esc(first(d.asked_by_name)) + ' recommends: ' + esc(d.recommend) + '</div>' : '')
      + area('taA', 'Yes, once, for this family. Note it on the agreement.')
      + btns('taGo', 'Send to ' + esc(o)), 360);
    el.querySelector('#taCancel').onclick = ccPopClose;
    el.querySelector('#taGo').onclick = async () => {
      const a = el.querySelector('#taA').value.trim();
      if(!a) return warn('Write the answer.');
      ccPopClose();
      d.answer = a; d.answered_at = nowIso(); d.answered_by = me(); d.answered_by_name = myName();
      if(it.sub_state === 'waiting' && /^a decision from /.test(String(it.waiting_on || ''))){ it.sub_state = null; it.waiting_on = null; it.check_back = null; }
      opsLog(it, myName() + ' decided: ' + a);
      notify(it, it.owner, 'decision', a);
      seenAll(it, 'decide');
      try{ opEvent('decision_answered', { item:it, summary:myName() + ' decided on ' + (it.about || it.title || 'this') + ': ' + a }); }catch(e){}
      await persist('ops_items', it);
      say('Sent to ' + o + '.'); refresh();
    };
  }

  /* ── Take it (transfer responsibility): confirm and a reason, and the old owner is told ── */
  const REASONS = ['They’re out today', 'They asked me to take it', 'It’s in my area', 'They have too much right now', 'Other'];
  function transfer(id, anchorId){
    const it = item(id); if(!it) return;
    const was = lc(it.owner);
    if(!was || was === me()) return opsTakeIt(id);
    const o = firstOf(was);
    const el = pop(anchorId, '<div style="font-size:13.5px;font-weight:700;">Take responsibility from ' + esc(o) + '?</div>'
      + '<div class="field-note">It becomes yours to finish. To help without taking it over, use Help with this instead.</div>'
      + '<div style="font-size:12.5px;margin-top:8px;font-weight:600;">Why?</div>'
      + '<select id="taWhy" style="width:100%;font-size:13px;padding:6px;border-radius:8px;"><option value="">Choose a reason</option>'
      + REASONS.map(r => '<option>' + esc(r) + '</option>').join('') + '</select>'
      + area('taNote', 'Anything ' + o + ' should know (optional)', 2)
      + btns('taGo', 'Take it'), 340);
    el.querySelector('#taCancel').onclick = ccPopClose;
    el.querySelector('#taGo').onclick = async () => {
      const why = el.querySelector('#taWhy').value, note = el.querySelector('#taNote').value.trim();
      if(!why) return warn('Pick a reason, so ' + o + ' knows why it moved.');
      ccPopClose();
      const reason = why === 'Other' ? (note || 'other') : why + (note ? ': ' + note : '');
      await opsTakeIt(id);
      const x = item(id); if(!x) return;
      const h = Array.isArray(x.owner_history) ? x.owner_history[x.owner_history.length - 1] : null;
      if(h && lc(h.to) === me()) h.note = reason;
      if(lc(x.help_from) === me()){ x.help_from = null; x.help_asked_at = null; }
      opsLog(x, 'Reason: ' + reason);
      notify(x, was, 'transferred', myName() + ' took responsibility for this: ' + reason);
      await persist('ops_items', x); refresh();
    };
  }

  /* ── seen ── */
  function seenAll(it, kind){ const m = me(); (it.notices || []).forEach(n => { if(lc(n.for) === m && !n.seen_at && (!kind || n.kind === kind)) n.seen_at = nowIso(); }); }
  async function gotIt(id, nid){
    const it = item(id); if(!it) return;
    const n = (it.notices || []).find(x => x.id === nid); if(!n) return;
    n.seen_at = nowIso();
    await persist('ops_items', it); refresh();
  }

  /* ── what a card shows ── */
  const WORD = { helping:'is helping', part_done:'did their part', finished:'finished it', support:'asked you for team support',
                 decide:'asks you to decide', decision:'decided', transferred:'took responsibility', reopened:'reopened it' };
  function cardTop(it){
    let h = '';
    if(critical(it)) h += '<div class="ta-911" style="margin-top:8px;padding:8px 10px;border-radius:8px;background:#FBECEA;color:#9B2C22;font-size:13px;font-weight:700;">'
      + 'If someone is in danger, call 911 now. Anyone on the team can act on this; you don’t need to wait for the owner.</div>';
    const d = it.decision;
    if(d && !d.answered_at) h += '<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:var(--bg);font-size:13px;">'
      + '<b>Waiting on a decision from ' + esc(firstOf(d.to)) + ':</b> ' + esc(d.question)
      + (d.recommend ? '<div class="field-note">' + esc(first(d.asked_by_name)) + ' recommends: ' + esc(d.recommend) + '</div>' : '') + '</div>';
    if(d && d.answered_at && lc(it.owner) === me() && unseen(it).some(n => n.kind === 'decision'))
      h += '<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:#E8F4EC;font-size:13px;"><b>' + esc(first(d.answered_by_name)) + ' decided:</b> ' + esc(d.answer) + '</div>';
    unseen(it).filter(n => n.kind === 'part_done').forEach(n => {
      h += '<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:#FDF3E2;font-size:13px;"><b>' + esc(first(n.by_name)) + ' did their part:</b> ' + esc(n.text)
        + (n.next ? '<br><b>Your turn:</b> ' + esc(n.next) : '') + '</div>';
    });
    if(it.help_from && lc(it.help_from) !== me() && lc(it.owner) === me())
      h += '<div class="field-note" style="margin-top:6px;">' + esc(firstOf(it.help_from)) + ' is helping. It stays yours.</div>';
    return h;
  }
  /* Buttons on a card that isn't mine. Help first; taking it over is the quieter, deliberate choice. */
  function othersButtons(it){
    const id = esc(it.id), anchor = 'act_' + id, o = firstOf(it.owner);
    let h = '';
    if(decisionFor(it)) h += '<button class="primary" style="padding:6px 13px;font-size:12.5px;" onclick="TA.answer(\'' + id + '\',\'' + anchor + '\')">Answer</button>';
    if(lc(it.help_from) === me()){
      h += '<button class="' + (h ? 'ghost' : 'primary') + '" style="padding:6px 13px;font-size:12.5px;" onclick="TA.partDone(\'' + id + '\',\'' + anchor + '\')">My part is done…</button>'
        + '<button class="ghost" style="padding:6px 13px;font-size:12.5px;" onclick="TA.finish(\'' + id + '\',\'' + anchor + '\')">This is finished…</button>';
    } else {
      h += '<button class="' + (h ? 'ghost' : 'primary') + '" style="padding:6px 13px;font-size:12.5px;" onclick="TA.helpWith(\'' + id + '\')">Help with this</button>';
    }
    h += '<button class="ghost" style="padding:6px 13px;font-size:12.5px;" onclick="TA.transfer(\'' + id + '\',\'' + anchor + '\')">Take it…</button>'
      + '<span class="field-note">Helping keeps it ' + esc(o) + '’s. Take it only to make it yours.</span>';
    return h;
  }
  /* FOR YOU TO KNOW, on My Work. */
  function stripHtml(){
    const list = myNotices(); if(!list.length) return '';
    return '<div class="card" id="taNotices" style="padding:12px 16px;margin-bottom:12px;">'
      + '<div style="font-size:12px;font-weight:800;letter-spacing:.05em;color:var(--navy);margin-bottom:6px;">FOR YOU TO KNOW</div>'
      + list.slice(0, 8).map(({ it, n }) => '<div style="display:flex;gap:10px;align-items:baseline;padding:6px 0;border-top:1px solid var(--border);font-size:13px;flex-wrap:wrap;">'
        + '<span style="flex:1;min-width:220px;"><b>' + esc(first(n.by_name)) + '</b> ' + esc(WORD[n.kind] || n.kind) + ': ' + esc(it.about || it.title || '')
        + (n.text && n.kind !== 'helping' ? '<span class="field-note"> · ' + esc(n.text) + '</span>' : '') + (n.next ? '<span class="field-note"> · your turn: ' + esc(n.next) + '</span>' : '') + '</span>'
        + (n.kind === 'finished' && canReopen(it) ? '<button class="ghost" style="padding:4px 10px;font-size:12px;" onclick="TA.reopen(\'' + esc(it.id) + '\')">Reopen</button>' : '')
        + '<button class="ghost" style="padding:4px 10px;font-size:12px;" onclick="TA.gotIt(\'' + esc(it.id) + '\',\'' + esc(n.id) + '\')">Got it</button></div>').join('')
      + (list.length > 8 ? '<div class="field-note">' + (list.length - 8) + ' more</div>' : '') + '</div>';
  }
  /* Why is this card in front of me, for the new reasons. '' = not one of these. */
  function why(it){
    const m = me(), o = firstOf(it.owner);
    if(decisionFor(it)) return first(it.decision.asked_by_name) + ' asks you to decide. It stays ' + o + '’s.';
    const e = it.escalation;
    if(e && !e.cleared_at && (lc(e.to) === m || (Array.isArray(e.also_to) && e.also_to.map(lc).indexOf(m) > -1))){
      const seatWord = { in_charge:'you’re In charge', owner_escalation:'Leadership', leadership_backup:'Leadership backup' }[e.seat] || 'Leadership';
      return 'Escalated to you (' + seatWord + '): ' + String(e.why || '') + '.' + (it.owner ? ' It stays ' + o + '’s unless you take it.' : '');
    }
    return '';
  }
  /* Escalated to me: the current stage, anyone told at an earlier stage, or a decision I owe. */
  function escalatedToMe(i, who){
    who = lc(who); if(!i || i.status !== 'open' || !who) return false;
    if(decisionFor(i, who)) return true;
    const e = i.escalation; if(!e || e.cleared_at || i.claimed_by || lc(i.owner) === who) return false;
    return lc(e.to) === who || (Array.isArray(e.also_to) && e.also_to.map(lc).indexOf(who) > -1);
  }

  window.TA = { inCharge, leadership, backup, deciders, coordinators, load, lighterCoordinator, teammate, critical, payrollToday,
    helpWith, partDone, finish, reopen, canReopen, askSupport, escalateDecision, answer, decisionFor, transfer, gotIt,
    cardTop, othersButtons, stripHtml, why, escalatedToMe, needsMeNow, myNotices, unseen, REASONS };
})();
