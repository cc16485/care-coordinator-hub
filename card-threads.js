/* =====================================================================================================================
   CARD CONVERSATIONS (Samantha 2026-11-08: "can we add comments onto cards in operations board?", "or assign/attention
   and they have to mark that its complete", "having a convo thread would be so nice"; plan
   https://claude.ai/artifact/CzKDf6SUTZSwmqTczn51R2, "Approve all picks"). window.CT.

   A conversation on every Operations Board card, shown under the card when it is opened:
     Send      a message to everyone on the card
     Ask       a question for one person; it waits in their For you until they answer (Yes, No, Call me, Let me look, or typed)
     Assign    a task for one person, with an optional by-when; it waits in their For you until they tap Complete
     Decision  any message or question can be pinned as the card's decision (one per card, anyone may pin: pick 7)
   Rows show 💬 and a count, and a red dot when something on the card waits on you. For you sits on top of the board,
   with "You are waiting on" for what you asked of others. "@Krystal" in a message puts the card in her For you until she
   opens it (pick 3). Closing a card with a question or task still open asks "Close anyway?" (pick 4). Your own message can
   be deleted for 10 minutes (pick 5). A message never changes the waiting time on a row (pick 6).
   Her picks 1 and 2: anyone in the office reads every conversation; alerts live inside the Hub only.
   Switch: ops_settings.card_threads_live (pick 8). Off: owners may "Try card conversations" (only they see it).
   Server: card_messages / card_thread_seen and the card_msg_* doors (Staffing repo, Desktop step 1381). The page reads
   the tables and writes only through the doors, which stamp WHO from the sign-in. Nothing here texts, emails or calls.
   No em dashes in anything a person reads.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const lc = s => String(s == null ? '' : s).trim().toLowerCase();
  const ms = v => { const t = Date.parse(v || ''); return isNaN(t) ? null : t; };
  const live = m => !!m && !m.deleted_at;

  /* ── the rules (pure; tests/card-threads-test.js runs them under node) ── */
  function onFor(settings, isOwner, tried){ return !!(settings && settings.card_threads_live === true) || (!!isOwner && tried === '1'); }
  function stillOpen(m){ return live(m) && ((m.kind === 'ask' && !m.answered_at) || (m.kind === 'assign' && !m.done_at)); }
  function waitsOn(m, me){ return stillOpen(m) && lc(m.to_email) === lc(me); }
  function mentionNew(m, me, seenAt){
    if(!live(m) || lc(m.by_email) === lc(me)) return false;
    if(!(m.mentions || []).some(e => lc(e) === lc(me))) return false;
    const t = ms(m.created_at); return seenAt == null || (t != null && t > seenAt);
  }
  function late(m, now){ const d = ms(m.due_at); return m.kind === 'assign' && !m.done_at && d != null && d < now; }
  /* per card: how many messages, and does something on it wait on me */
  function cardInfo(msgs, cardId, me, seenAt){
    const L = (msgs || []).filter(m => live(m) && m.card_id === cardId);
    return { n:L.length, mine:L.some(m => waitsOn(m, me) || mentionNew(m, me, seenAt)), open:L.filter(stillOpen), pinned:L.find(m => m.pinned_at) || null };
  }
  /* For you: what waits on me (questions, tasks, new mentions), and what I am waiting on from others. Cards that are
     closed drop out: their thread stays with the card, but nobody is chased for it. */
  function forYou(msgs, me, seen, isOpen, now){
    const open = id => !isOpen || isOpen(id), S = seen || {};
    const mine = [], waiting = [], mentionCards = {};
    (msgs || []).forEach(m => {
      if(!live(m) || !open(m.card_id)) return;
      if(waitsOn(m, me)) mine.push({ m, card:m.card_id, type:m.kind, late:late(m, now) });
      else if(lc(m.by_email) === lc(me) && stillOpen(m)) waiting.push({ m, card:m.card_id, late:late(m, now) });
      else if(m.kind === 'msg' && mentionNew(m, me, S[m.card_id]) && !mentionCards[m.card_id]){ mentionCards[m.card_id] = 1; mine.push({ m, card:m.card_id, type:'mention', late:false }); }
    });
    const rank = x => x.late ? 0 : x.type === 'assign' ? 1 : x.type === 'ask' ? 2 : 3;
    mine.sort((a, b) => rank(a) - rank(b) || (ms(a.m.created_at) || 0) - (ms(b.m.created_at) || 0));
    return { mine, waiting };
  }
  /* "@Krystal" or "@Krystal Smith": office people named in a message (first name or full name, any case) */
  function mentions(text, staff){
    const t = ' ' + String(text || '').toLowerCase(), out = [];
    (staff || []).forEach(s => {
      const e = lc(s.email), full = lc(s.name), first = full.split(/\s+/)[0];
      if(!e || !first) return;
      const hit = n => n && new RegExp('[\\s(]@' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-z])').test(t);
      if((hit(full) || hit(first)) && out.indexOf(e) < 0) out.push(e);
    });
    return out;
  }
  /* by-when choices, in the office's own day (the Hub runs in Springfield) */
  const DUE = [['', 'No by-when'], ['noon', 'Today by noon'], ['3pm', 'Today by 3 pm'], ['eod', 'End of today (5 pm)'], ['tmrw', 'Tomorrow by noon']];
  function dueAt(key, now){
    const d = new Date(now);
    if(key === 'noon') d.setHours(12, 0, 0, 0); else if(key === '3pm') d.setHours(15, 0, 0, 0); else if(key === 'eod') d.setHours(17, 0, 0, 0);
    else if(key === 'tmrw'){ d.setDate(d.getDate() + 1); d.setHours(12, 0, 0, 0); } else return null;
    return d;
  }
  function dueWord(m, now){
    const d = ms(m.due_at); if(d == null) return '';
    const day = new Date(d), t = new Date(now), tm = new Date(now); tm.setDate(tm.getDate() + 1);
    const hh = day.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' }).replace(':00', '').replace(' AM', ' am').replace(' PM', ' pm').replace(/^12 pm$/, 'noon');
    const same = (a, b) => a.toDateString() === b.toDateString();
    return 'by ' + (same(day, t) ? 'today ' : same(day, tm) ? 'tomorrow ' : day.toLocaleDateString('en-US', { weekday:'short', month:'numeric', day:'numeric' }) + ' ') + hh;
  }
  /* your own message, within 10 minutes, not yet answered or completed (the server checks the same) */
  function canDelete(m, me, now){ const t = ms(m.created_at); return live(m) && lc(m.by_email) === lc(me) && t != null && now - t < 10 * 60000 && !m.answered_at && !m.done_at; }
  const CORE = { onFor, stillOpen, waitsOn, mentionNew, late, cardInfo, forYou, mentions, DUE, dueAt, dueWord, canDelete };
  if(typeof module !== 'undefined' && module.exports){ module.exports = CORE; return; }

  /* ═══════════════════════════════════ in the Hub ═══════════════════════════════════ */
  const W = root;
  const D = () => { try{ return DATA || {}; }catch(e){ return {}; } };
  const SB = () => { try{ return sb; }catch(e){ return null; } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const owner = () => { try{ return !!W.ccIsOwner(); }catch(e){ return false; } };
  const meEmail = () => { try{ return lc(ME && ME.email); }catch(e){ return ''; } };
  const ls = (k, v) => { try{ if(v === undefined) return localStorage.getItem(k); if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }catch(e){} return null; };
  const settings = () => D().ops_settings || {};
  const on = () => onFor(settings(), owner(), ls('ctTry'));
  const toast = t => { try{ W.ccToast(t); }catch(e){} };
  const S = { msgs:[], seen:{}, loadedAt:0, loading:false, err:'', open:'', drafts:{}, busy:false, shownSeen:{} };
  const staff = () => (D().coordinator_staff || []).filter(s => s && s.email && s.name).map(s => ({ email:lc(s.email), name:String(s.name) }));
  const nameOf = e => { const s = staff().find(x => x.email === lc(e)); return s ? s.name.split(/\s+/)[0] : String(e || '').split('@')[0]; };
  const openCard = id => (D().ops_items || []).some(i => i && i.id === id && i.status === 'open');
  const cardOf = id => (D().ops_items || []).find(i => i && i.id === id);
  const whenWord = v => { const t = ms(v); if(t == null) return ''; try{ return typeof W.callsFmtWhen === 'function' ? W.callsFmtWhen(v) : new Date(t).toLocaleString('en-US', { month:'numeric', day:'numeric', hour:'numeric', minute:'2-digit' }); }catch(e){ return ''; } };
  const onBoard = () => { try{ return typeof MYWORK_TAB !== 'undefined' && MYWORK_TAB === 'board'; }catch(e){ return false; } };
  function redraw(){ try{ bell(); }catch(e){} try{ if(onBoard() && typeof W.renderMyWork === 'function') W.renderMyWork(); }catch(e){} }

  /* ── reading ── */
  async function load(force){
    if(!on() || S.loading || !SB()) return;
    if(!force && S.loadedAt && Date.now() - S.loadedAt < 45000) return;
    S.loading = true;
    try{
      const since = new Date(Date.now() - 120 * 864e5).toISOString();
      const [a, b] = await Promise.all([
        SB().from('card_messages').select('*').gte('created_at', since).order('created_at', { ascending:true }).limit(3000),
        SB().from('card_thread_seen').select('card_id, seen_at').eq('email', meEmail())
      ]);
      if(a.error || b.error) throw new Error((a.error || b.error).message);
      S.msgs = a.data || []; S.seen = {}; (b.data || []).forEach(r => { S.seen[r.card_id] = ms(r.seen_at); }); S.err = '';
    }catch(e){
      S.err = /card_messages|does not exist|relation/i.test(String(e && e.message)) ? 'Card conversations are not set up on the server yet (Desktop step 1381).' : 'Couldn\'t load card conversations. Check your connection; it tries again in a minute.';
    }
    S.loading = false; S.loadedAt = Date.now(); bell(); redraw();
  }
  /* The alert (pick 2, Hub only, never a text): how many questions, tasks and new mentions wait on me, shown as a 💬 count
     on the Today tab from anywhere in the Hub and on the Board tab. Refreshes every minute on the board, every 2 minutes elsewhere. */
  function waiting(){ return on() && meEmail() ? forYou(S.msgs, meEmail(), S.seen, openCard, Date.now()).mine.length : 0; }
  function bellHtml(){ const n = waiting(); return n ? ' <span class="subtab-badge amber ct-bell" title="' + n + ' waiting on you in card conversations">💬 ' + n + '</span>' : ''; }
  function bell(){
    try{
      const el = document.getElementById('ctTodayBadge'); if(!el) return;
      const n = waiting();
      el.textContent = n ? '💬 ' + n : ''; el.style.display = n ? '' : 'none';
      el.title = n ? n + ' waiting on you in card conversations' : '';
      document.querySelectorAll('.ct-bell').forEach(b => { if(n){ b.textContent = '💬 ' + n; b.title = el.title; } else b.remove(); });
    }catch(e){}
  }
  setInterval(() => { try{
    if(!on() || document.visibilityState !== 'visible'){ bell(); return; }
    if(onBoard() || !S.loadedAt || Date.now() - S.loadedAt > 115000) load(true);
  }catch(e){} }, 60000);
  setTimeout(() => { try{ if(on()) load(true); else bell(); }catch(e){} }, 8000);

  /* ── drawing ── */
  const CSS = '<style id="ctCss">'
    + '.ct-bub{display:inline-flex;align-items:center;gap:4px;margin-right:4px;align-self:center;font-size:12.5px;font-weight:700;color:var(--text-muted);white-space:nowrap;}'
    + '.ct-dot{width:9px;height:9px;border-radius:50%;background:var(--red);display:inline-block;}'
    + '.ct-fy{border:1.5px solid var(--amber);background:var(--amber-bg);border-radius:12px;padding:10px 14px;margin:0 0 14px;display:flex;flex-direction:column;gap:8px;}'
    + '.ct-fy h3{margin:0;font-size:16px;color:var(--navy);display:flex;gap:8px;align-items:center;}.ct-n{background:var(--amber);color:#fff;border-radius:999px;font-size:12.5px;padding:1px 9px;}'
    + '.ct-fi{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;background:var(--card,#fff);border:1px solid var(--border);border-radius:9px;padding:8px 12px;}'
    + '.ct-fi .t{flex:1 1 260px;min-width:0;font-size:13.5px;overflow-wrap:anywhere;}.ct-fi small{display:block;color:var(--text-muted);font-size:12px;}.ct-late{color:var(--red);font-weight:700;}'
    + '.ct-wait{font-size:12.5px;color:var(--text-muted);}'
    + '.ct-th{margin:12px 0 0;padding:12px 0 0;border-top:1px dashed var(--border);display:flex;flex-direction:column;gap:9px;}'
    + '.ct-th h4{margin:0;font-size:14px;color:var(--navy);}'
    + '.ct-pin{background:var(--card,#fff);border:1.5px solid var(--teal);border-radius:10px;padding:8px 12px;font-size:13.5px;}.ct-pin b{display:block;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--teal);}'
    + '.ct-m{background:var(--card,#fff);border:1px solid var(--border);border-radius:10px;padding:8px 12px;display:flex;flex-direction:column;gap:4px;max-width:680px;}'
    + '.ct-m.me{align-self:flex-end;background:var(--teal-bg,#EAF4F6);border-color:transparent;}'
    + '.ct-hd{font-size:12px;color:var(--text-muted);}.ct-hd b{color:var(--text,inherit);}.ct-body{font-size:13.5px;white-space:pre-wrap;overflow-wrap:anywhere;}'
    + '.ct-tag{display:inline-block;font-size:11.5px;font-weight:800;border-radius:6px;padding:1px 7px;margin-right:6px;}'
    + '.ct-tag.ask{background:var(--amber-bg);color:var(--amber);}.ct-tag.assign{background:var(--teal-bg,#EAF4F6);color:var(--teal);}.ct-tag.done{background:#E7F6EC;color:#1E6B45;}.ct-tag.dec{background:var(--teal);color:#fff;}'
    + '.ct-rep{font-size:13px;background:#E7F6EC;color:#1E3A2A;border-radius:8px;padding:5px 10px;}'
    + '.ct-q{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}.ct-q input{flex:1 1 160px;min-width:0;font-size:13px;padding:5px 9px;}'
    + '.ct-q button,.ct-c button{padding:4px 11px;font-size:12.5px;}.ct-lk{background:none;border:0;padding:0;color:var(--teal);font-weight:600;font-size:12px;cursor:pointer;}'
    + '.ct-c{display:flex;flex-direction:column;gap:7px;}.ct-c textarea{width:100%;min-height:54px;font:inherit;font-size:13.5px;padding:7px 9px;border:1.5px solid var(--border);border-radius:8px;resize:vertical;box-sizing:border-box;}'
    + '.ct-c .r{display:flex;flex-wrap:wrap;gap:7px;align-items:center;}.ct-c select{font-size:13px;padding:4px 6px;width:auto;}.ct-c .sp{flex:1;}'
    + '.ct-err{color:var(--red);font-size:12.5px;font-weight:600;}'
    + '</style>';
  function css(){ if(!document.getElementById('ctCss')){ const t = document.createElement('div'); t.innerHTML = CSS; document.head.appendChild(t.firstChild); } }

  /* the 💬 on a row */
  function badge(id){
    if(!on()) return '';
    const c = cardInfo(S.msgs, id, meEmail(), S.seen[id]);
    if(!c.n) return '';
    return '<span class="ct-bub" title="' + c.n + ' message' + (c.n === 1 ? '' : 's') + (c.mine ? ', something waits on you' : '') + '">💬 ' + c.n + (c.mine ? ' <span class="ct-dot" aria-label="waits on you"></span>' : '') + '</span>';
  }
  /* For you, on top of the board */
  function strip(){
    if(!on()){
      return owner() ? '<div class="field-note" style="margin:0 0 10px;"><b>New:</b> conversations on cards. Ask someone a question, give them a task to mark Complete, pin the decision. '
        + '<button class="linklike" style="font:inherit;" onclick="CT.tryIt(true)">Try card conversations</button> (only you see it)</div>' : '';
    }
    css(); load(); setTimeout(bell, 0);   /* keep the 💬 alert in step with For you after every change */
    const now = Date.now(), F = forYou(S.msgs, meEmail(), S.seen, openCard, now);
    let h = '';
    if(!(settings().card_threads_live === true)) h += '<div class="card" style="padding:9px 14px;margin:0 0 10px;background:var(--amber-bg);color:var(--amber);font-size:13px;"><b>Card conversations, practice.</b> Only owners who try it see the conversations; '
      + 'anything you write is real and stays on the card. Turn on "Card conversations" on the Owners Hub Admin page for everyone. <button class="linklike" style="font:inherit;" onclick="CT.tryIt(false)">Stop trying it</button></div>';
    if(S.err) h += '<div class="ct-err" style="margin:0 0 10px;">' + esc(S.err) + '</div>';
    h += '<div class="ct-fy" id="ctForYou"><h3>For you <span class="ct-n">' + F.mine.length + '</span></h3>';
    if(!F.mine.length) h += '<div class="ct-wait">Nobody is waiting on you for an answer or a task.</div>';
    F.mine.forEach(x => {
      const it = cardOf(x.card) || {}, m = x.m;
      const label = x.type === 'ask' ? '❓ Question' : x.type === 'assign' ? '☐ Task' : '💬 You were mentioned';
      h += '<div class="ct-fi" data-card="' + esc(x.card) + '"><div class="t"><span class="ct-tag ' + (x.type === 'mention' ? 'dec' : x.type) + '">' + label + '</span><b>' + esc(m.by_name) + '</b> on ' + esc(it.about || it.title || 'a card') + ': ' + esc(String(m.body).slice(0, 180))
        + '<small>' + esc(whenWord(m.created_at)) + (m.due_at ? ' · <span class="' + (x.late ? 'ct-late' : '') + '">' + esc(dueWord(m, now)) + (x.late ? ', late' : '') + '</span>' : '') + '</small></div>'
        + '<button class="primary" style="padding:5px 12px;font-size:12.5px;" onclick="CT.go(\'' + esc(x.card) + '\')">Open</button></div>';
    });
    if(F.waiting.length) h += '<div class="ct-wait">You are waiting on: ' + F.waiting.map(x => '<button class="linklike" style="font:inherit;" onclick="CT.go(\'' + esc(x.card) + '\')">'
      + esc(nameOf(x.m.to_email)) + ' (' + esc((cardOf(x.card) || {}).about || 'a card') + ')</button>' + (x.late ? ' <span class="ct-late">late</span>' : '')).join(', ') + '</div>';
    return h + '</div>';
  }
  function msgHtml(m, me, now){
    const mine = lc(m.by_email) === me;
    let tag = '';
    if(m.kind === 'ask') tag = '<span class="ct-tag ask">❓ Asked ' + esc(nameOf(m.to_email)) + '</span>';
    if(m.kind === 'assign') tag = m.done_at ? '<span class="ct-tag done">☑ Complete</span>' : '<span class="ct-tag assign">☐ Assigned ' + esc(nameOf(m.to_email)) + (m.due_at ? ' · ' + esc(dueWord(m, now)) : '') + '</span>' + (late(m, now) ? '<span class="ct-late">Late</span> ' : '');
    let h = '<div class="ct-m' + (mine ? ' me' : '') + '" data-mid="' + esc(m.id) + '"><div class="ct-hd"><b>' + esc(m.by_name) + '</b> · ' + esc(whenWord(m.created_at)) + (m.pinned_at ? ' · <span class="ct-tag dec">📌 Decision</span>' : '') + '</div>'
      + '<div class="ct-body">' + tag + esc(m.body) + '</div>';
    if(m.kind === 'ask' && m.answered_at) h += '<div class="ct-rep"><b>' + esc(m.answered_by) + ' answered:</b> ' + esc(m.answer) + '</div>';
    if(m.kind === 'assign' && m.done_at) h += '<div class="ct-rep"><b>' + esc(m.done_by) + ' completed it ' + esc(whenWord(m.done_at)) + '</b>' + (m.done_note ? ': ' + esc(m.done_note) : '') + '</div>';
    if(m.kind === 'ask' && !m.answered_at && lc(m.to_email) === me)
      h += '<div class="ct-q">' + ['Yes', 'No', 'Call me', 'Let me look'].map(a => '<button class="ghost" onclick="CT.answer(\'' + esc(m.id) + '\',\'' + a + '\')">' + a + '</button>').join('')
        + '<input id="ctA_' + esc(m.id) + '" placeholder="Or type an answer" aria-label="Type an answer"><button class="primary" onclick="CT.answer(\'' + esc(m.id) + '\')">Answer</button></div>';
    if(m.kind === 'assign' && !m.done_at && lc(m.to_email) === me)
      h += '<div class="ct-q"><input id="ctN_' + esc(m.id) + '" placeholder="A note, if any (left a voicemail...)" aria-label="Note"><button class="primary" onclick="CT.complete(\'' + esc(m.id) + '\')">Complete</button></div>';
    const links = [];
    if(m.kind !== 'assign') links.push(m.pinned_at ? '<button class="ct-lk" onclick="CT.pin(\'' + esc(m.id) + '\',false)">Unpin the decision</button>' : '<button class="ct-lk" onclick="CT.pin(\'' + esc(m.id) + '\',true)">📌 Pin as the decision</button>');
    if(canDelete(m, me, now)) links.push('<button class="ct-lk" style="color:var(--red);" onclick="CT.del(\'' + esc(m.id) + '\')">Delete</button>');
    if(links.length) h += '<div style="display:flex;gap:14px;">' + links.join('') + '</div>';
    return h + '</div>';
  }
  /* the conversation under an opened card */
  function thread(it){
    if(!on() || !it || !it.id) return '';
    css(); load();
    const id = it.id, me = meEmail(), now = Date.now();
    if(!S.shownSeen[id]){ S.shownSeen[id] = 1; markSeen(id); }
    const L = S.msgs.filter(m => live(m) && m.card_id === id), pin = L.find(m => m.pinned_at);
    const people = staff().filter(s => s.email !== me);
    const d = S.drafts[id] || {};
    let h = '<div class="ct-th" id="ctT_' + esc(id) + '"><h4>Conversation</h4>';
    if(pin) h += '<div class="ct-pin"><b>📌 Decision</b>' + (pin.kind === 'ask' && pin.answered_at ? esc(pin.body) + ' <span style="font-weight:700;">' + esc(pin.answer) + '</span> (' + esc(pin.answered_by) + ')' : esc(pin.body) + ' (' + esc(pin.by_name) + ')') + '</div>';
    h += L.length ? L.map(m => msgHtml(m, me, now)).join('') : '<div class="field-note">No messages yet. Ask someone, give them a task, or write a note for the team.</div>';
    h += '<div class="ct-c"><textarea id="ctTx_' + esc(id) + '" placeholder="Write to the team. @Name brings someone in." aria-label="Message" oninput="CT.draft(\'' + esc(id) + '\')">' + esc(d.text || '') + '</textarea>'
      + '<div class="r"><label class="field-note" for="ctTo_' + esc(id) + '">To</label><select id="ctTo_' + esc(id) + '" onchange="CT.draft(\'' + esc(id) + '\')">'
      + people.map(p => '<option value="' + esc(p.email) + '"' + (d.to === p.email ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select>'
      + '<select id="ctDue_' + esc(id) + '" aria-label="By when" onchange="CT.draft(\'' + esc(id) + '\')">' + DUE.map(([k, t]) => '<option value="' + k + '"' + ((d.due || '') === k ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select>'
      + '<span class="sp"></span><button class="ghost" onclick="CT.post(\'' + esc(id) + '\',\'ask\')">❓ Ask</button><button class="ghost" onclick="CT.post(\'' + esc(id) + '\',\'assign\')">☐ Assign</button>'
      + '<button class="primary" onclick="CT.post(\'' + esc(id) + '\',\'msg\')">Send</button></div>'
      + '<div class="field-note">Send goes to everyone on the card. Ask and Assign go to the person in "To"; the by-when is for tasks. Office only: nothing is texted or emailed.</div>'
      + (d.err ? '<div class="ct-err">' + esc(d.err) + '</div>' : '') + '</div>';
    return h + '</div>';
  }

  /* ── writing (through the doors only) ── */
  const why = e => { const t = String(e && (e.message || e) || ''); const m = t.match(/card conversations: (.*)$/); return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1) + '.' : 'That didn\'t save. Check your connection and try again.'; };
  async function rpc(fn, args){ if(!SB()) throw new Error('Not signed in'); const r = await SB().rpc(fn, args); if(r.error) throw r.error; return r.data; }
  function upsert(row){ if(!row || !row.id) return; const i = S.msgs.findIndex(m => m.id === row.id); if(i >= 0) S.msgs[i] = row; else S.msgs.push(row); }
  async function markSeen(id){ S.seen[id] = Date.now(); try{ await rpc('card_thread_seen_mark', { p_card:id }); }catch(e){} }
  function draft(id){
    const g = k => document.getElementById(k + id);
    S.drafts[id] = Object.assign(S.drafts[id] || {}, { text:g('ctTx_') ? g('ctTx_').value : '', to:g('ctTo_') ? g('ctTo_').value : '', due:g('ctDue_') ? g('ctDue_').value : '', err:'' });
  }
  async function post(id, kind){
    if(S.busy) return; draft(id);
    const d = S.drafts[id], text = String(d.text || '').trim();
    if(!text){ d.err = kind === 'msg' ? 'Write a message first.' : kind === 'ask' ? 'Write the question first.' : 'Write what needs doing first.'; redraw(); return; }
    if(kind !== 'msg' && !d.to){ d.err = 'Pick who it is for in "To".'; redraw(); return; }
    if(kind !== 'assign' && d.due){ d.err = 'A by-when is only for a task. Use Assign, or set it back to No by-when.'; redraw(); return; }
    const due = kind === 'assign' ? dueAt(d.due, Date.now()) : null;
    S.busy = true;
    try{
      const row = await rpc('card_msg_post', { p_card:id, p_kind:kind, p_body:text, p_to:kind === 'msg' ? null : d.to, p_due:due ? due.toISOString() : null,
        p_due_label:due ? (DUE.find(x => x[0] === d.due) || [])[1] : null, p_mentions:mentions(text, staff()) });
      upsert(row); S.drafts[id] = { to:d.to };
      toast(kind === 'ask' ? 'Asked ' + nameOf(d.to) + '.' : kind === 'assign' ? 'Assigned to ' + nameOf(d.to) + '.' : 'Sent to the card.');
    }catch(e){ d.err = why(e); }
    S.busy = false; redraw();
  }
  async function act(fn, args, done){
    if(S.busy) return; S.busy = true;
    try{ const row = await rpc(fn, args); if(row && typeof row === 'object') upsert(row); if(done) done(row); }
    catch(e){ toast(why(e)); S.loadedAt = 0; load(true); }
    S.busy = false; redraw();
  }
  const answer = (mid, a) => { const v = a || ((document.getElementById('ctA_' + mid) || {}).value || '').trim(); if(!v){ toast('Type an answer, or tap Yes, No, Call me or Let me look.'); return; } act('card_msg_answer', { p_id:mid, p_answer:v }, () => toast('Answered.')); };
  const complete = mid => act('card_msg_complete', { p_id:mid, p_note:((document.getElementById('ctN_' + mid) || {}).value || '').trim() || null }, () => toast('Marked Complete.'));
  const pin = (mid, yes) => act('card_msg_pin', { p_id:mid, p_on:!!yes }, row => { if(yes && row) S.msgs.forEach(m => { if(m.card_id === row.card_id && m.id !== row.id) m.pinned_at = null; }); toast(yes ? 'Pinned as the decision.' : 'Unpinned.'); });
  const del = async mid => { if(!(await W.ccConfirm('Delete this message? Everyone on the card stops seeing it.'))) return; act('card_msg_delete', { p_id:mid }, () => { const m = S.msgs.find(x => x.id === mid); if(m) m.deleted_at = new Date().toISOString(); toast('Deleted.'); }); };

  /* her pick 4: closing a card with a question or task still open asks first (every Done button, the card's own too) */
  function guardClose(){
    const real = W.opsClose;
    if(typeof real !== 'function' || real.__ct) return;
    const wrapped = async function(id, anchorId){
      if(on()){
        const open = cardInfo(S.msgs, id, meEmail(), null).open;
        if(open.length){
          const what = open.map(m => nameOf(m.to_email) + ' hasn\'t ' + (m.kind === 'ask' ? 'answered' : 'completed') + ' "' + String(m.body).slice(0, 60) + (String(m.body).length > 60 ? '...' : '') + '"').join('; ');
          if(!(await W.ccConfirm(what + '. Close the card anyway?'))) return;
        }
      }
      return real.apply(this, arguments);
    };
    wrapped.__ct = true; W.opsClose = wrapped;
  }
  guardClose(); if(typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', guardClose);

  /* open a card from For you: the board opens it under its row (and the lanes open the batch it sits in) */
  function go(id){
    try{
      if(W.OPB){
        W.OPB.state.open = id;
        if(W.OPB.lanes && typeof W.OPB.laneModel === 'function' && W.OPB.lanesView && W.OPB.lanesView()){
          const M = W.OPB.laneModel(); Object.keys(M.batches).forEach(k => { if(M.batches[k].some(r => r.id === id)) W.OPB.lanes.bopen = k; });
          if(M.old.some(r => r.id === id)) W.OPB.lanes.oldOpen = true;
          if(!M.wait.concat(M.care, M.old).some(r => r.id === id) && !Object.keys(M.batches).some(k => M.batches[k].some(r => r.id === id))) W.OPB.lanes.who = 'all';
        } else if(W.OPB.state.f){ W.OPB.state.tile = ''; W.OPB.state.f = { when:'', who:'', need:'', owner:'' }; }
      }
      redraw();
      setTimeout(() => { const t = document.getElementById('ctT_' + id); if(t) t.scrollIntoView({ behavior:'smooth', block:'center' }); }, 60);
    }catch(e){}
  }

  W.CT = Object.assign({}, CORE, { on, load, badge, strip, waiting, bell, bellHtml, thread, post, answer, complete, pin, del, draft, go, state:S, guardClose,
    tryIt:yes => { ls('ctTry', yes ? '1' : null); S.loadedAt = 0; if(yes) load(true); bell(); redraw(); } });
})(typeof window !== 'undefined' ? window : globalThis);
