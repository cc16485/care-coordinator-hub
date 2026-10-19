/* ASK FOR HELP, TRACKED (Stage 2 of the My Work and Team Work plan, Samantha approved 2026-10-18 rule 5; built on her
   "ask for help" 2026-10-19). Asking for help never moves ownership or closes the card. What is recorded, on the card:

     it.help_asks = [{ id, to, to_name, by, by_name, what, need_by, asked_at, expires_at, urgent,
                       state:'asked'|'accepted'|'declined'|'withdrawn'|'done',
                       will_do, will_by, declined_why, answered_at, done_at, done_note, volunteered }]

     Asked       who asked, who, what exactly, by when. The card stays the owner's and open.
     Accepted    the helper says in their words what they'll do and by when. The owner is told.
     Declined    a short reason. The owner is told right away.
     No answer   nothing by expires_at (15 minutes for urgent work, else the end of the helper's shift). Worked out when
                 it is read, never written by a page load: the owner sees "Help not answered" and it never counts as help.
     Done        My part is done / This is finished (team-actions.js) record what the helper did.

   help_from (the existing "who is helping" field) is set while an ask is open or accepted, so Helping, Help with this
   and My part is done keep working; a decline or a withdraw clears it. A pending ask shows on the helper's Today as
   ASKED TO HELP, not in Helping, until they answer.
   Switched by ops_settings.ask_help_live. Off: Ask for help works exactly as before (team-actions.js askSupport).
   Nothing here texts, emails or calls; the owner and helper are told on the card and in For you to know. */
(function(root){
  'use strict';
  const lc = s => String(s == null ? '' : s).trim().toLowerCase();
  const MIN = 60000;

  /* the state of the latest ask, with no answer worked out from the clock */
  function current(it){ const a = Array.isArray(it && it.help_asks) ? it.help_asks : []; return a.length ? a[a.length - 1] : null; }
  function stateOf(ask, now){
    if(!ask) return '';
    if(ask.state === 'asked' && ask.expires_at && Date.parse(ask.expires_at) <= (now == null ? Date.now() : now)) return 'no_answer';
    return ask.state;
  }
  /* urgent: care at risk, urgent, or needed within 2 hours */
  function isUrgent(it, needBy, now){
    if(!it) return false;
    if(lc(it.urgency) === 'urgent' || /timekeeper/.test(lc(it.opened_by)) || (it.escalation && !it.escalation.cleared_at && it.escalation.level === 'urgent')) return true;
    const d = typeof needBy === 'number' ? needBy : Date.parse(needBy || it.due || '');
    return !isNaN(d) && d - now <= 2 * 36e5;
  }
  /* when an unanswered ask runs out: 15 minutes for urgent work, else the end of the helper's shift (their next one if
     they aren't working now), else 5 PM today (or tomorrow when it's already past 5) */
  function expiresAt(it, helper, needBy, now, shiftEnd, nextShift){
    if(isUrgent(it, needBy, now)) return now + 15 * MIN;
    let end = shiftEnd ? shiftEnd(helper, now) : null;
    if(end == null && nextShift){ const n = nextShift(helper, now); if(n) end = n.end; }
    if(end != null) return end;
    const five = new Date(now); five.setHours(17, 0, 0, 0); if(five.getTime() <= now) five.setDate(five.getDate() + 1);
    return five.getTime();
  }
  const CORE = { current, stateOf, isUrgent, expiresAt };
  if(typeof module !== 'undefined' && module.exports){ module.exports = CORE; return; }

  /* ═══════════════════════════════════ in the Hub ═══════════════════════════════════════════════════════════════ */
  const W = root;
  const D = () => { try{ return DATA || {}; }catch(e){ return {}; } };
  const esc = s => (typeof W.escapeHtmlComms === 'function' ? W.escapeHtmlComms(s) : String(s == null ? '' : s));
  const me = () => { try{ return lc(W.ccActor().email); }catch(e){ return ''; } };
  const myName = () => { try{ return W.ccActor().name || ''; }catch(e){ return ''; } };
  const nameOf = e => { try{ return (typeof W.opsOwnerName === 'function' && W.opsOwnerName(e)) || String(e || '').split('@')[0]; }catch(_){ return String(e || '').split('@')[0]; } };
  const first = e => String(nameOf(e) || '').split(' ')[0];
  const on = () => (D().ops_settings || {}).ask_help_live === true;
  const item = id => (D().ops_items || []).find(x => x.id === id);
  const nowIso = () => new Date().toISOString();
  const say = m => { try{ W.ccToast(m); }catch(e){} };
  const warn = m => { try{ alert(m); }catch(e){} };
  const refresh = () => { try{ W.myWorkRefresh(); }catch(e){} };
  const hm = t => new Date(t).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
  const when = t => { const d = new Date(t), n = new Date(); return (d.toDateString() === n.toDateString() ? '' : d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) + ' ') + hm(t); };
  function notify(it, who, kind, text, next){
    who = lc(who); if(!who || who === me()) return;
    it.notices = (Array.isArray(it.notices) ? it.notices : []).concat([{ id:'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      for:who, kind, by:me(), by_name:myName(), at:nowIso(), text:text || '', next:next || '' }]).slice(-12);
  }
  function log(it, t){ try{ W.opsLog(it, t); }catch(e){} }
  function ev(verb, it, summary){ try{ W.opEvent(verb, { item:it, summary }); }catch(e){} }
  function shiftFns(){ return W.TW ? { se:W.TW.shiftEnd, ns:W.TW.nextShift } : { se:null, ns:null }; }
  function pop(anchorId, html){ return W.ccPopOpen(document.getElementById(anchorId) || document.body, html, { width:360 }); }
  const area = (id, ph, rows) => '<textarea id="' + id + '" rows="' + (rows || 2) + '" placeholder="' + esc(ph) + '" style="width:100%;font-size:13px;padding:8px;border-radius:8px;margin-top:4px;"></textarea>';
  const btns = (go, label) => '<div style="display:flex;gap:8px;margin-top:10px;"><button class="primary" id="' + go + '" style="padding:7px 14px;font-size:13px;">' + label + '</button>'
    + '<button class="ghost" id="ahCancel" style="padding:7px 14px;font-size:13px;">Cancel</button></div>';
  function localInput(t){ const d = new Date(t); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }

  /* ── Ask (the owner, or anyone working the card) ── */
  function ask(id, anchorId){
    const it = item(id); if(!it) return;
    const cur = current(it), st = stateOf(cur);
    if(cur && (st === 'asked' || st === 'accepted')) return warn(first(cur.to) + (st === 'asked' ? ' hasn’t answered yet. Withdraw that ask first.' : ' is already helping.'));
    const sug = W.TA && W.TA.teammate ? W.TA.teammate(it) : null;
    W.ccPickPerson(document.getElementById(anchorId) || document.body, { current:'', suggested:sug, onPick:(e) => {
      e = lc(e); if(!e) return;
      if(e === lc(it.owner)) return warn('Pick someone other than the owner.');
      if(e === me()) return warn('Pick someone other than you.');
      const due = Date.parse(it.due || ''), def = !isNaN(due) && due > Date.now() ? due : Date.now() + 2 * 36e5;
      const el = pop(anchorId, '<div style="font-size:13.5px;font-weight:700;">Ask ' + esc(first(e)) + ' for help</div>'
        + '<div class="field-note">It stays ' + esc(first(it.owner) || 'yours') + '’s and stays open. ' + esc(first(e)) + ' accepts or declines; no answer counts as no help.</div>'
        + '<div style="font-size:12.5px;margin-top:8px;font-weight:600;">What do you need?</div>' + area('ahWhat', 'Call the PRN team for tonight’s 6 to 9 shift')
        + '<div style="font-size:12.5px;margin-top:8px;font-weight:600;">By when?</div><input type="datetime-local" id="ahBy" value="' + localInput(def) + '" style="width:100%;font-size:13px;padding:6px;border-radius:8px;">'
        + btns('ahGo', 'Ask ' + esc(first(e))));
      el.querySelector('#ahCancel').onclick = W.ccPopClose;
      el.querySelector('#ahGo').onclick = async () => {
        const what = el.querySelector('#ahWhat').value.trim(), byv = el.querySelector('#ahBy').value;
        if(!what) return warn('Say what you need, so ' + first(e) + ' can say yes or no.');
        const needBy = byv ? new Date(byv).getTime() : def, now = Date.now(), f = shiftFns();
        const exp = expiresAt(it, e, needBy, now, f.se, f.ns);
        W.ccPopClose();
        const a = { id:'ha' + now.toString(36), to:e, to_name:nameOf(e), by:me(), by_name:myName(), what, need_by:new Date(needBy).toISOString(),
          asked_at:new Date(now).toISOString(), expires_at:new Date(exp).toISOString(), urgent:isUrgent(it, needBy, now), state:'asked' };
        it.help_asks = (Array.isArray(it.help_asks) ? it.help_asks : []).concat([a]).slice(-10);
        it.help_from = e; it.help_asked_at = a.asked_at;
        log(it, 'Asked ' + nameOf(e) + ' for help: ' + what + ' (by ' + when(needBy) + '). Still ' + (first(it.owner) || 'theirs') + '’s.');
        notify(it, e, 'help_ask', what + ' (accept or decline by ' + when(exp) + ')');
        ev('help_asked', it, (it.about || it.title || '') + ': ' + myName() + ' asked ' + nameOf(e) + ' for help: ' + what);
        await W.persist('ops_items', it);
        say('Asked ' + first(e) + '. It stays ' + (lc(it.owner) === me() ? 'yours' : first(it.owner) + '’s') + '. No answer by ' + hm(exp) + ' counts as no help.'); refresh();
      };
    } });
  }
  /* ── Accept / Decline (the person asked) ── */
  function accept(id, anchorId){
    const it = item(id), a = current(it); if(!it || !a || lc(a.to) !== me()) return;
    if(stateOf(a) !== 'asked') return warn(stateOf(a) === 'no_answer' ? 'This ask ran out. ' + first(a.by) + ' has been told it wasn’t answered.' : 'This was already answered.');
    const el = pop(anchorId, '<div style="font-size:13.5px;font-weight:700;">Accept: help ' + esc(first(it.owner) || first(a.by)) + '</div>'
      + '<div class="field-note">' + esc(first(a.by)) + ' asked: ' + esc(a.what) + '</div>'
      + '<div style="font-size:12.5px;margin-top:8px;font-weight:600;">What will you do, in your words?</div>' + area('ahDo', 'I’ll call 3 PRN caregivers by 3:30')
      + '<div style="font-size:12.5px;margin-top:8px;font-weight:600;">By when?</div><input type="datetime-local" id="ahWill" value="' + localInput(Date.parse(a.need_by) || Date.now() + 36e5) + '" style="width:100%;font-size:13px;padding:6px;border-radius:8px;">'
      + btns('ahGo', 'Accept'));
    el.querySelector('#ahCancel').onclick = W.ccPopClose;
    el.querySelector('#ahGo').onclick = async () => {
      const will = el.querySelector('#ahDo').value.trim(), wb = el.querySelector('#ahWill').value;
      if(!will) return warn('Say what you’ll do, so ' + first(a.by) + ' knows what’s covered.');
      W.ccPopClose();
      a.state = 'accepted'; a.will_do = will; a.will_by = wb ? new Date(wb).toISOString() : a.need_by; a.answered_at = nowIso();
      it.help_from = me(); it.helping_since = a.answered_at;
      log(it, myName() + ' accepted: ' + will + ' (by ' + when(a.will_by) + '). Still ' + (first(it.owner) || 'theirs') + '’s.');
      notify(it, a.by, 'help_accepted', will, 'by ' + when(a.will_by));
      if(lc(it.owner) && lc(it.owner) !== lc(a.by)) notify(it, it.owner, 'help_accepted', will, 'by ' + when(a.will_by));
      ev('help_accepted', it, myName() + ' accepted helping with ' + (it.about || it.title || 'this') + ': ' + will);
      await W.persist('ops_items', it);
      say('Accepted. It stays ' + first(it.owner) + '’s; it’s in your Helping.'); refresh();
    };
  }
  function decline(id, anchorId){
    const it = item(id), a = current(it); if(!it || !a || lc(a.to) !== me()) return;
    if(stateOf(a) !== 'asked') return warn('This was already answered or ran out.');
    const el = pop(anchorId, '<div style="font-size:13.5px;font-weight:700;">Decline</div>'
      + '<div class="field-note">' + esc(first(a.by)) + ' is told right away, so they can ask someone else.</div>'
      + '<div style="font-size:12.5px;margin-top:8px;font-weight:600;">Why? (short)</div>' + area('ahWhy', 'On a home visit until 4')
      + btns('ahGo', 'Decline'));
    el.querySelector('#ahCancel').onclick = W.ccPopClose;
    el.querySelector('#ahGo').onclick = async () => {
      const why = el.querySelector('#ahWhy').value.trim();
      if(!why) return warn('A short reason helps ' + first(a.by) + ' decide who to ask next.');
      W.ccPopClose();
      a.state = 'declined'; a.declined_why = why; a.answered_at = nowIso();
      if(lc(it.help_from) === me()){ it.help_from = null; it.help_asked_at = null; }
      log(it, myName() + ' declined: ' + why);
      notify(it, a.by, 'help_declined', why);
      if(lc(it.owner) && lc(it.owner) !== lc(a.by)) notify(it, it.owner, 'help_declined', why);
      ev('help_declined', it, myName() + ' declined helping with ' + (it.about || it.title || 'this') + ': ' + why);
      await W.persist('ops_items', it);
      say('Declined. ' + first(a.by) + ' is told.'); refresh();
    };
  }
  async function withdraw(id){
    const it = item(id), a = current(it); if(!it || !a) return;
    const st = stateOf(a); if(st !== 'asked' && st !== 'no_answer') return;
    a.state = st === 'no_answer' ? 'no_answer' : 'withdrawn'; a.closed_at = nowIso();
    if(lc(it.help_from) === lc(a.to)){ it.help_from = null; it.help_asked_at = null; }
    log(it, st === 'no_answer' ? 'No answer from ' + nameOf(a.to) + '; ask closed' : 'Withdrew the ask to ' + nameOf(a.to));
    if(st === 'asked') notify(it, a.to, 'help_withdrawn', 'No longer needed');
    await W.persist('ops_items', it); refresh();
  }
  /* "Help with this" from someone not asked: a volunteer, accepted by definition (team-actions.js helpWith) */
  function volunteered(it, what){
    if(!on() || !it) return;
    const a = current(it); if(a && (stateOf(a) === 'asked' || stateOf(a) === 'accepted') && lc(a.to) === me()) return;
    it.help_asks = (Array.isArray(it.help_asks) ? it.help_asks : []).concat([{ id:'ha' + Date.now().toString(36), to:me(), to_name:myName(), by:me(), by_name:myName(),
      what:what || 'Offered to help', asked_at:nowIso(), state:'accepted', will_do:what || 'Helping', answered_at:nowIso(), volunteered:true }]).slice(-10);
  }
  /* My part is done / This is finished (team-actions.js) close the helper's ask with what they did */
  function done(it, note){
    if(!it) return;
    const a = current(it); if(!a || lc(a.to) !== me()) return;
    if(stateOf(a) === 'asked' || a.state === 'accepted'){ a.state = 'done'; a.done_at = nowIso(); a.done_note = note || ''; if(!a.answered_at) a.answered_at = a.done_at; }
  }

  /* ── lists ── */
  function pendingFor(it, who){ const a = current(it); return !!(a && lc(a.to) === lc(who || me()) && stateOf(a) === 'asked' && it.status === 'open'); }
  function asksForMe(){ const m = me(); return (D().ops_items || []).filter(it => it && it.status === 'open' && pendingFor(it, m)); }
  /* Helping (myWorkBuckets): while on, only help I accepted or volunteered; a pending ask is in ASKED TO HELP */
  function helpingOk(it){ if(!on()) return true; const a = current(it); if(!a || lc(a.to) !== me()) return true; return stateOf(a) === 'accepted'; }
  /* Asks of mine that didn't land: declined or no answer, still open (Today; later the Owner Overview) */
  function unanswered(it){ const a = current(it); const s = stateOf(a); return !!(a && it.status === 'open' && (s === 'declined' || s === 'no_answer')); }

  /* ── what a card shows ── */
  function statusHtml(it){
    if(!on()) return '';
    const a = current(it); if(!a) return '';
    const s = stateOf(a), who = first(a.to), box = (bg, fg, html) => '<div class="ah-status" style="margin-top:8px;padding:8px 10px;border-radius:8px;background:' + bg + ';color:' + fg + ';font-size:13px;">' + html + '</div>';
    const id = esc(it.id), anchor = 'act_' + id;
    if(s === 'asked' && lc(a.to) === me()) return '';   /* the person asked sees their Accept / Decline box instead */
    if(s === 'asked') return box('var(--bg)', 'var(--navy)', '<b>Asked ' + esc(who) + ' for help</b> at ' + esc(hm(a.asked_at)) + ': ' + esc(a.what)
      + '<div class="field-note">Waiting for ' + esc(who) + ' to accept or decline. No answer by ' + esc(when(a.expires_at)) + ' counts as no help.</div>'
      + (lc(a.by) === me() || lc(it.owner) === me() ? '<button class="ghost" style="padding:3px 10px;font-size:12px;margin-top:4px;" onclick="AH.withdraw(\'' + id + '\')">Withdraw</button>' : ''));
    if(s === 'accepted') return box('#E8F4EC', '#1E6B45', '<b>' + esc(who) + (a.volunteered ? ' is helping' : ' accepted') + ':</b> ' + esc(a.will_do || a.what)
      + (a.will_by ? ' <span class="field-note">by ' + esc(when(a.will_by)) + '</span>' : '') + '<div class="field-note">It stays ' + esc(first(it.owner)) + '’s.</div>');
    if(s === 'declined') return box('#FDF3E2', '#8A5A00', '<b>' + esc(who) + ' declined:</b> ' + esc(a.declined_why || '')
      + ((lc(it.owner) === me() || lc(a.by) === me()) ? ' <button class="primary" style="padding:3px 10px;font-size:12px;" id="' + anchor + '_ah" onclick="AH.ask(\'' + id + '\',\'' + anchor + '_ah\')">Ask someone else</button>' : ''));
    if(s === 'no_answer') return box('#FBECEA', '#9B2C22', '<b>Help not answered.</b> ' + esc(who) + ' didn’t accept or decline by ' + esc(when(a.expires_at)) + '. It is still ' + esc(first(it.owner)) + '’s to do.'
      + ((lc(it.owner) === me() || lc(a.by) === me()) ? ' <button class="primary" style="padding:3px 10px;font-size:12px;" id="' + anchor + '_ah" onclick="AH.withdraw(\'' + id + '\').then(()=>AH.ask(\'' + id + '\',\'' + anchor + '_ah\'))">Ask someone else</button>' : ''));
    if(s === 'done') return box('#E8F4EC', '#1E6B45', '<b>' + esc(who) + ' did their part:</b> ' + esc(a.done_note || a.will_do || ''));
    return '';
  }
  /* the helper's buttons on a card they were asked about */
  function askButtons(it){
    const id = esc(it.id), anchor = 'act_' + id, a = current(it);
    return '<div class="ah-ask" style="margin-top:6px;padding:8px 10px;border-radius:8px;background:#E8EFF9;font-size:13px;"><b>' + esc(first(a.by)) + ' asked you for help:</b> ' + esc(a.what)
      + ' <span class="field-note">needed by ' + esc(when(a.need_by)) + '; answer by ' + esc(when(a.expires_at)) + '</span>'
      + '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;"><button class="primary" id="' + anchor + '" style="padding:6px 13px;font-size:12.5px;" onclick="AH.accept(\'' + id + '\',\'' + anchor + '\')">Accept…</button>'
      + '<button class="ghost" style="padding:6px 13px;font-size:12.5px;" onclick="AH.decline(\'' + id + '\',\'' + anchor + '\')">Decline…</button>'
      + '<span class="field-note">Accepting keeps it ' + esc(first(it.owner)) + '’s.</span></div></div>';
  }
  /* ASKED TO HELP, on the helper's Today */
  function laneHtml(card){
    const list = asksForMe(); if(!list.length) return '';
    return '<div style="margin:16px 0 8px;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;"><b style="font-size:12.5px;letter-spacing:.06em;color:#1F4F8A;">ASKED TO HELP · ' + list.length
      + '</b><span class="field-note">accept or decline; it stays theirs either way</span></div>' + list.map(it => card(it)).join('');
  }

  /* ── Settings > Ask for help (owners) ── */
  const SW_ON = 'Turn on tracked Ask for help?\n\nFrom now:\n· Ask for help asks what you need and by when\n· the person asked accepts (saying what they’ll do) or declines (saying why)\n· no answer in 15 minutes for urgent work, or by the end of their shift, shows as "Help not answered"\n· the card stays the owner’s and open the whole time\n\nNothing is texted, emailed or called because of this.';
  const SW_OFF = 'Turn off tracked Ask for help? Ask for help goes back to picking a person, with no accept or decline. Asks already on cards stay in their history.';
  function setFill(){
    const box = document.getElementById('ahSet'); if(!box) return;
    let owner = false; try{ owner = !!W.ccIsOwner(); }catch(e){}
    box.innerHTML = '<div class="field-note" style="margin:4px 0 8px;">' + (on() ? '<b style="color:#1E8449;">On.</b> Asks are accepted, declined or run out.' : '<b style="color:#B7791F;">Off.</b> Ask for help picks a person, as before.') + '</div>'
      + (owner ? '<button class="secondary" id="ahToggleBtn" onclick="AH.toggle(this)">' + (on() ? 'Turn off tracked Ask for help' : 'Turn on tracked Ask for help') + '</button> <span class="field-note" id="ahSaved"></span>'
        : '<div class="field-note">Only Samantha or Zachary can turn this on or off.</div>');
  }
  async function toggle(btn){
    let owner = false; try{ owner = !!W.ccIsOwner(); }catch(e){}
    if(!owner){ alert('Only Samantha or Zachary can turn this on or off.'); return; }
    const want = !on();
    const ok = typeof W.ccConfirm === 'function' ? await W.ccConfirm(want ? SW_ON : SW_OFF) : confirm(want ? SW_ON : SW_OFF);
    if(!ok) return;
    if(btn) btn.disabled = true;
    const r = typeof W.tkMerge === 'function' ? await W.tkMerge(m => { m.ask_help_live = want; if(want && !m.ask_help_live_since) m.ask_help_live_since = nowIso(); return ['Ask for help tracking ' + (want ? 'ON' : 'OFF')]; }, 'Ask for help') : { error:{ message:'saving is not available here' } };
    if(btn) btn.disabled = false;
    const sv = document.getElementById('ahSaved'); if(sv) sv.textContent = r && r.error ? 'Could not save: ' + r.error.message : (want ? 'On.' : 'Off.');
    setFill(); refresh();
  }

  W.AH = Object.assign({}, CORE, { on, ask, accept, decline, withdraw, volunteered, done, pendingFor, asksForMe, helpingOk, unanswered,
    statusHtml, askButtons, laneHtml, setFill, toggle, SW_ON, SW_OFF });
})(typeof window !== 'undefined' ? window : globalThis);
