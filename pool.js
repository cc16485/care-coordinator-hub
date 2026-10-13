/* UP FOR GRABS (2026-10-13, her "Love it! Please start building").
   A place on My Work to put a task for anyone who has time. The culture: when you have down time, you check what you
   can help with. Nobody has to guess who has room.

   How it is kept:
   - An item put up for grabs STAYS THE POSTER'S (owner = poster) until somebody takes it. So it is never "nobody's",
     the Unassigned list and the server's escalation never see it as dropped, and nothing on the server changed.
   - it.pool = { by, by_name, size ('15m' | '1h' | 'half'), offered_at, back_at, taken_by, taken_by_name, taken_at,
     withdrawn_at }.
   - While it is offered (not taken, not withdrawn, before back_at) it is off the poster's own lists and sits on the
     Up for grabs shelf for everyone else, plus an "Offered to the team" lane on the poster's Today.
   - "I'll take it" makes it theirs (opsTakeIt: owner history, op_events), after reading the latest copy first so two
     people don't both take it.
   - If nobody takes it by back_at (before it is due, with time left to do it), it simply counts as the poster's again
     and says so on the card. No write is needed for that, so it cannot fail to come back.
   - The poster sees who took it on their Today for the rest of that day. Nothing here texts or emails anyone. */
(function(){
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s));
  const lc = s => String(s || '').toLowerCase();
  const H = 36e5;
  const SIZES = { '15m': { label: 'About 15 minutes', short: '15 min', lead: 1 * H },
                  '1h':  { label: 'About an hour', short: '~1 hour', lead: 2 * H },
                  'half':{ label: 'Half a day', short: 'half a day', lead: 4 * H } };
  /* the shortest gap between offering and coming back; anything closer is not worth offering */
  const MIN_OFFER = 30 * 60000;

  function me(){ try{ return lc(ccActor().email); }catch(e){ return ''; } }
  function myName(){ try{ return ccActor().name || ''; }catch(e){ return ''; } }
  function nameOf(e){ try{ return (typeof opsOwnerName === 'function' && opsOwnerName(e)) || String(e || '').split('@')[0]; }catch(_){ return String(e || '').split('@')[0]; } }
  function first(s){ return String(s || '').split(' ')[0]; }
  function when(iso){
    const d = new Date(iso); if(isNaN(d)) return '';
    const t = new Date(), tm = new Date(); tm.setDate(t.getDate() + 1);
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if(d.toDateString() === t.toDateString()) return 'today ' + time;
    if(d.toDateString() === tm.toDateString()) return 'tomorrow ' + time;
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' + time;
  }
  function items(){ return (typeof DATA !== 'undefined' && DATA.ops_items) || []; }
  function canSee(i){ try{ return typeof opsCanSee !== 'function' || opsCanSee(i); }catch(e){ return true; } }

  /* when it comes back: before it is due, with time left to do it. "End of the day" means the office closing (5pm), so
     something due at 11:59pm comes back in the afternoon, not after everyone has gone home. */
  const CLOSE_HOUR = 17;
  function backAt(dueISO, size, nowMs){
    let due = Date.parse(dueISO || ''); const s = SIZES[size];
    if(isNaN(due) || !s) return null;
    const dd = new Date(due);
    if(dd.getHours() >= CLOSE_HOUR){ dd.setHours(CLOSE_HOUR, 0, 0, 0); due = dd.getTime(); }
    const b = due - s.lead, now = nowMs == null ? Date.now() : nowMs;
    return b - now >= MIN_OFFER ? new Date(b).toISOString() : null;
  }
  const live = i => !!(i && i.pool && !i.pool.taken_at && !i.pool.withdrawn_at);
  /* on the shelf right now */
  function isOffered(i, nowMs){
    if(!live(i) || i.status !== 'open') return false;
    const b = Date.parse(i.pool.back_at || ''); return !isNaN(b) && (nowMs == null ? Date.now() : nowMs) < b;
  }
  /* nobody took it in time: it is the poster's again, and the card says so */
  function cameBack(i){
    if(!live(i) || i.status !== 'open') return false;
    const b = Date.parse(i.pool.back_at || ''); return !isNaN(b) && Date.now() >= b;
  }
  /* everyone else's offered work I can take */
  function shelf(m){
    m = m == null ? me() : lc(m);
    return items().filter(i => isOffered(i) && lc(i.owner) !== m && canSee(i))
      .sort((a, c) => String(a.due || '9').localeCompare(String(c.due || '9')));
  }
  function mineOffered(m){ m = m == null ? me() : lc(m); return items().filter(i => isOffered(i) && lc(i.owner) === m); }
  /* what I offered that somebody took today (the quiet notice) */
  function takenToday(m){
    m = m == null ? me() : lc(m);
    const t = new Date().toDateString();
    return items().filter(i => i.pool && lc(i.pool.by) === m && i.pool.taken_at && lc(i.pool.taken_by) !== m
      && new Date(i.pool.taken_at).toDateString() === t);
  }

  function sizeChip(i){
    const s = SIZES[i.pool && i.pool.size]; if(!s) return '';
    return '<span class="tag-chip" style="background:#E3F4F3;color:#1F7A8C;font-weight:700;">' + esc(s.short) + '</span>';
  }
  function dueWords(i){ try{ return typeof opsDueText === 'function' ? opsDueText(i) : (i.due ? 'due ' + when(i.due) : ''); }catch(e){ return ''; } }

  function shelfCard(i){
    return '<div class="wkcard tp-card" data-id="' + esc(i.id) + '" style="padding:12px 15px;margin-bottom:8px;">'
      + '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;">'
      + '<b style="font-size:15px;">' + esc(i.about || i.title || '') + '</b>' + sizeChip(i)
      + '<span class="field-note">' + esc(dueWords(i)) + ' · from ' + esc(first(i.pool.by_name || nameOf(i.pool.by))) + '</span>'
      + '<span style="flex:1;"></span>'
      + '<button class="addlead" style="height:32px;padding:0 14px;font-size:13px;" onclick="TP.take(\'' + esc(i.id) + '\')">I\'ll take it</button></div>'
      + (i.about && i.title && i.about !== i.title ? '<div style="font-size:13.5px;margin-top:3px;">' + esc(i.title) + '</div>' : '')
      + (i.detail ? '<div style="font-size:13.5px;color:var(--text-muted);margin-top:3px;">“' + esc(i.detail) + '”</div>' : '')
      + '</div>';
  }
  function offeredCard(i){
    return '<div class="wkcard tp-card" data-id="' + esc(i.id) + '" style="padding:10px 14px;margin-bottom:6px;">'
      + '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;">'
      + '<b style="font-size:14px;">' + esc(i.about || i.title || '') + '</b>' + sizeChip(i)
      + '<span class="field-note">nobody has taken it yet · comes back to you ' + esc(when(i.pool.back_at)) + ' if nobody does</span>'
      + '<span style="flex:1;"></span>'
      + '<button class="ghost" style="padding:5px 12px;font-size:12.5px;" onclick="TP.withdraw(\'' + esc(i.id) + '\')">Take it back</button></div></div>';
  }
  function takenLine(i){
    return '<div class="field-note" style="padding:3px 2px;font-size:13px;">✓ <b>' + esc(first(i.pool.taken_by_name || nameOf(i.pool.taken_by)))
      + '</b> took “' + esc(i.about || i.title || '') + '” at ' + esc(new Date(i.pool.taken_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })) + '</div>';
  }

  /* the Up for grabs tab on My Work */
  function render(wrap){
    const s = shelf(), mo = mineOffered(), tk = takenToday();
    let h = '<div class="field-note" style="margin:4px 0 10px;font-size:13.5px;">Work a teammate put out for anyone with time. Have a few minutes? Take one. It becomes yours.</div>';
    h += s.length ? s.map(shelfCard).join('')
      : '<div class="card" style="padding:22px;text-align:center;">Nothing is up for grabs right now.</div>';
    if(mo.length || tk.length) h += '<div style="margin:18px 0 8px;"><b style="font-size:12.5px;letter-spacing:.06em;color:var(--navy);">YOU OFFERED</b></div>'
      + mo.map(offeredCard).join('') + tk.map(takenLine).join('');
    wrap.innerHTML = h;
  }
  /* on Today: when I'm caught up, the shelf comes to me */
  function caughtUpHtml(){
    const s = shelf(); if(!s.length) return '';
    return '<div class="card" style="padding:14px 16px;margin:10px 0 6px;border:2px solid var(--teal);background:#F2FAF9;">'
      + '<div style="font-size:15px;font-weight:800;color:var(--navy);margin-bottom:2px;">You\'re caught up. Can you help with one of these?</div>'
      + '<div class="field-note" style="margin-bottom:8px;">Up for grabs from the team. Whatever you take becomes yours.</div>'
      + s.slice(0, 3).map(shelfCard).join('')
      + (s.length > 3 ? '<button class="linklike" onclick="myWorkGo(\'pool\')">See all ' + s.length + ' up for grabs</button>' : '')
      + '</div>';
  }
  /* on Today: what I offered (still waiting, and who took what today) */
  function offeredLaneBody(){
    const mo = mineOffered(), tk = takenToday();
    if(!mo.length && !tk.length) return '';
    return mo.map(offeredCard).join('') + tk.map(takenLine).join('');
  }
  function cameBackChip(i){
    return cameBack(i) ? '<span class="tag-chip" style="background:var(--amber-bg);color:var(--amber);">nobody took it from Up for grabs, back with you</span>' : '';
  }

  async function latest(id){
    try{
      if(typeof sb === 'undefined' || !sb) return null;
      const r = await sb.from('app_data').select('data').eq('key', 'ops_items').single();
      if(r.error || !r.data) return null;
      return (Array.isArray(r.data.data) ? r.data.data : []).find(x => x && x.id === id) || null;
    }catch(e){ return null; }
  }
  function adopt(fresh){
    const a = items(), k = a.findIndex(x => x.id === fresh.id);
    if(k >= 0) a[k] = fresh;
  }

  async function take(id){
    const it = items().find(x => x.id === id); if(!it) return;
    const m = me(); if(!m) return;
    /* read the latest first, so two people don't both take it */
    const fresh = await latest(id);
    if(fresh && !isOffered(fresh)){
      adopt(fresh);
      const who = fresh.pool && fresh.pool.taken_by ? first(fresh.pool.taken_by_name || nameOf(fresh.pool.taken_by)) : '';
      ccToast(who ? who + ' just took that one. Thank you anyway!' : 'That one is no longer up for grabs.');
      if(typeof myWorkRefresh === 'function') myWorkRefresh();
      return;
    }
    const at = new Date().toISOString();
    it.pool = Object.assign({}, it.pool, { taken_by: m, taken_by_name: myName() || nameOf(m), taken_at: at });
    it.last_activity_at = at;
    if(typeof opsLog === 'function') opsLog(it, 'Took it from Up for grabs');
    opEvent('item_pool_taken', { item: it, summary: (myName() || m) + ' took ' + (it.about || it.title || 'a task') + ' from Up for grabs (offered by ' + first(it.pool.by_name || nameOf(it.pool.by)) + ')' });
    /* opsTakeIt makes it mine (owner history, op event) and saves */
    await opsTakeIt(id);
  }

  async function withdraw(id){
    const it = items().find(x => x.id === id); if(!it || !it.pool) return;
    const at = new Date().toISOString();
    it.pool = Object.assign({}, it.pool, { withdrawn_at: at });
    it.last_activity_at = at;
    if(typeof opsLog === 'function') opsLog(it, 'Took it back from Up for grabs');
    opEvent('item_pool_withdrawn', { item: it, summary: (myName() || me()) + ' took ' + (it.about || it.title || 'a task') + ' back from Up for grabs' });
    await persist('ops_items', it);
    ccToast('Back on your list');
    if(typeof myWorkRefresh === 'function') myWorkRefresh();
  }

  /* stamp an item as offered; returns false (and says why) when it can't be */
  function stamp(it, size){
    const b = backAt(it.due, size);
    if(!b){ alert('That is due too soon to put up for grabs. It would have to come straight back to you. Give it a later due date, or keep it.'); return false; }
    const at = new Date().toISOString();
    it.pool = { by: lc(it.owner) || me(), by_name: it.owner_name || myName(), size: size, offered_at: at, back_at: b };
    it.last_activity_at = at;
    return true;
  }

  /* offer something already on my list (the ⋯ menu) */
  function offerOpen(id, anchorId){
    const it = items().find(x => x.id === id); if(!it) return;
    if(!it.due){ alert('Give it a due date first, so it knows when to come back to you.'); return; }
    const el = ccPopOpen(document.getElementById(anchorId) || document.body,
      '<div style="font-size:14px;font-weight:800;color:var(--navy);margin-bottom:4px;">Put it up for grabs</div>'
      + '<div class="field-note" style="margin-bottom:8px;">Anyone with time can take it. It stays yours until they do.</div>'
      + '<label class="field-note">About how long will it take?</label>'
      + '<select id="tpSize" style="width:100%;margin:4px 0 8px;">' + Object.keys(SIZES).map(k => '<option value="' + k + '"' + (k === '1h' ? ' selected' : '') + '>' + SIZES[k].label + '</option>').join('') + '</select>'
      + '<div class="field-note" id="tpBack" style="margin-bottom:10px;"></div>'
      + '<div style="display:flex;gap:8px;"><button class="primary" id="tpGo">Put it up for grabs</button><button class="ghost" id="tpNo">Cancel</button></div>',
      { width: 320 });
    const sync = () => { el.querySelector('#tpBack').textContent = backLine(it.due, el.querySelector('#tpSize').value); };
    el.querySelector('#tpSize').onchange = sync; sync();
    el.querySelector('#tpNo').onclick = ccPopClose;
    el.querySelector('#tpGo').onclick = async () => {
      if(!stamp(it, el.querySelector('#tpSize').value)) return;
      ccPopClose();
      if(typeof opsLog === 'function') opsLog(it, 'Put it up for grabs');
      opEvent('item_pool_offered', { item: it, summary: (myName() || me()) + ' put ' + (it.about || it.title || 'a task') + ' up for grabs' });
      await persist('ops_items', it);
      ccToast('Up for grabs. It comes back to you ' + when(it.pool.back_at) + ' if nobody takes it.');
      if(typeof myWorkRefresh === 'function') myWorkRefresh();
    };
  }
  function backLine(dueISO, size){
    const b = backAt(dueISO, size);
    return b ? 'If nobody takes it by ' + when(b) + ', it comes back to you.' : 'That is due too soon to put up for grabs.';
  }

  /* the Add work form: "Up for grabs" in Who owns it shows the size and when it comes back */
  function formSync(){
    const o = document.getElementById('opsNewOwner'), w = document.getElementById('opsNewPoolWrap');
    if(!o || !w) return;
    const on = o.value === '__pool';
    w.style.display = on ? '' : 'none';
    if(!on) return;
    let due = null;
    try{
      due = opsDueFromChoice((document.getElementById('opsNewDue') || {}).value || 'auto', (document.getElementById('opsNewDueDate') || {}).value || '',
        document.getElementById('opsNewKind').value, document.getElementById('opsNewUrgency').value, new Date().toISOString());
    }catch(e){}
    const line = document.getElementById('opsNewPoolBack');
    if(line) line.textContent = due ? backLine(due, document.getElementById('opsNewPoolSize').value) : 'Pick a due date so it knows when to come back to you.';
  }

  /* one line for End my shift */
  function shiftLine(){
    const s = shelf(), mo = mineOffered();
    const bits = [];
    if(mo.length) bits.push(mo.length + ' you put up for grabs ' + (mo.length === 1 ? 'is' : 'are') + ' still waiting; ' + (mo.length === 1 ? 'it comes' : 'they come') + ' back to you if nobody takes ' + (mo.length === 1 ? 'it' : 'them') + '.');
    if(s.length) bits.push(s.length + ' up for grabs from the team, if you have a few minutes before you go.');
    return bits.length ? '<div class="field-note" style="margin:8px 0 2px;color:var(--teal);">' + esc(bits.join(' ')) + '</div>' : '';
  }

  window.TP = { SIZES, backAt, isOffered, cameBack, shelf, mineOffered, takenToday, render, caughtUpHtml, offeredLaneBody,
    cameBackChip, take, withdraw, stamp, offerOpen, formSync, shiftLine };
})();
