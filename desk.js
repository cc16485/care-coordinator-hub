/* =====================================================================================================================
   MY DESK, STAGE 1 (2026-10-06). Samantha approved the plan (https://claude.ai/artifact/CC6pJvTp9EzwoRBH5qKdt9) and the
   prototype (https://claude.ai/artifact/4oot3DHmQrKqmnNsfJuiYm). "My Work is the company's work. My Desk is my brain on
   paper." Each person's own planner page, notes and sticky notes. NOTHING here texts, emails, routes or escalates, and
   nothing on a desk becomes My Work.

   STAGE 1 HAS: today's page and the pages around it (peeking out, turn them, drop a line on one, hold a line over one to
   turn it), jotting (Enter = a to-do, Shift+Enter = a note), the drawn tick and cross-out, moving lines (drag, the ⋯
   menu or keys: reorder, the next day, any day, the Later folder), the eraser with Undo, "N left on Friday's page",
   carried labels, and sticky notes (peel one off a pad or drag it off, write on it, put it anywhere, recolor, peel it
   off, your own pad labels, drop it on the page to turn it into lines, drop a line on it).
   STAGE 2 ADDS: Month (today's page shrinks into October and the other pages are dealt out from the planner; click one to
   open it), completion stamps, the ribbon, folded corners, a star in the margin and a hand-drawn circle, the tent calendar
   (click a date, or drop a line on it), and Make it yours (desk mat, pen color, handwriting or neat print, your photo).
   STAGE 3 ADDS (owners): desk tabs (My Desk, each person's desk, Everyone), built from who has a desk; looking at
   someone's desk is read-only; owners can leave a signed note (washi tape, Seen / Got it), star a finished line, and the
   person sees "Samantha stopped by your desk today". "Might need a hand?" on lines carried 4+ days, owners only.
   STAGE 4 ADDS: the Stand-Up tray (a card dropped in becomes your item on the shared Stand-Up board; Prepare Stand-Up
   lists tray cards first; afterwards they come back "talked about": All set, or Something to do), the tray's label from the
   Stand-Up schedule in Team Meetings, "Jot on my desk" in ＋ Add, a desk step in End My Shift that moves the ribbon to
   the next page, and the Friday "Your week" card (no totals, never compared).
   LATER STAGES: the desk following you around the Hub (5); kind words (6).

   WHERE IT LIVES: the private tables made by Desktop 463 (desk_lines, desk_stickies, desk_settings, desk_pages). The
   database decides who may read or change what; this file never assumes it may. Each line is saved on its own, with its
   version (rev): a change made on another screen is never overwritten, the desk just shows the newest copy.

   WHO SEES IT: ops_settings.desk_access, set in Settings (My Desk) or on the Owners Hub Admin page:
     { mode:'off' | 'some' | 'everyone', people:[emails] }. 'everyone' = anyone the database gives a desk.
   ===================================================================================================================== */
(function(){
  'use strict';
  const TZ = 'America/Chicago';
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])));
  const $ = (s, r) => (r || document).querySelector(s);
  const lc = s => String(s || '').trim().toLowerCase();
  const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  const reduced = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
  const hash = s => { let h = 7; for(const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

  /* ---------------------------------------------- dates (Central time) ---------------------------------------------- */
  const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const D = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const S = dt => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  const addDays = (s, n) => { const d = D(s); d.setDate(d.getDate() + n); return S(d); };
  const isWk = s => { const w = D(s).getDay(); return w === 0 || w === 6; };
  const nextBiz = s => { let t = addDays(s, 1); while(isWk(t)) t = addDays(t, 1); return t; };
  const prevBiz = s => { let t = addDays(s, -1); while(isWk(t)) t = addDays(t, -1); return t; };
  const bizDiff = (a, b) => { if(!a || a >= b) return 0; let n = 0, t = a; while(t < b && n < 400){ t = addDays(t, 1); if(!isWk(t)) n++; } return n; };
  const DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const fmtLong = s => { const d = D(s); return MON[d.getMonth()] + ' ' + d.getDate(); };
  const fmtShort = s => { const d = D(s); return DOW[d.getDay()].slice(0, 3) + ', ' + MON[d.getMonth()].slice(0, 3) + ' ' + d.getDate(); };
  const fmtTiny = s => { const d = D(s); return DOW[d.getDay()].slice(0, 3) + ' ' + d.getDate(); };
  const dowName = s => DOW[D(s).getDay()];
  const MOTTO = { 1:'A fresh page.', 2:'One line at a time.', 3:'Halfway through the week.', 4:'Nearly there.', 5:'Last page of the week.', 0:'A quiet page.', 6:'A quiet page.' };

  /* ---------------------------------------------- pure rules (tested) ---------------------------------------------- */
  function parseTime(t){
    const m = String(t).match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?(?![\d-])/i) || String(t).match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    if(!m) return null;
    const h = +m[1]; if(h < 1 || h > 12) return null;
    let ap = (m[3] || '').toLowerCase().replace(/\./g, ''); if(!ap) ap = (h >= 7 && h <= 11) ? 'am' : 'pm';
    return h + ':' + (m[2] || '00') + ' ' + ap.toUpperCase();
  }
  function carryInfo(line, day){
    if(!day || !line.origin_day || line.kind !== 'todo') return null;
    const n = bizDiff(line.origin_day, day); if(n <= 0) return null;
    return { n, label: n === 1 ? '↪ from ' + fmtShort(line.origin_day) : '↪ carried ' + n + ' days' };
  }
  /* The lines in one place, in order. */
  const inPlace = (lines, place, day) => lines.filter(l => !l.erased_at && l.place === place && (place !== 'day' || l.day === day)).sort((a, b) => a.pos - b.pos);
  const todos = arr => arr.filter(l => l.kind === 'todo');
  const openOf = arr => todos(arr).filter(l => !l.done_at);
  /* A to-do and the notes written right under it travel together. */
  function blockOf(arr, id){
    const i = arr.findIndex(l => l.id === id); if(i < 0) return [];
    const out = [arr[i]]; if(arr[i].kind === 'todo'){ for(let j = i + 1; j < arr.length && arr[j].kind === 'note'; j++) out.push(arr[j]); }
    return out;
  }
  /* n positions to put a block before arr[index] (arr = the target place, already without the block). */
  function slots(arr, index, n){
    const prev = index > 0 ? arr[index - 1].pos : null, next = index < arr.length ? arr[index].pos : null;
    const lo = prev == null ? (next == null ? 0 : next - n - 1) : prev, hi = next == null ? lo + n + 1 : next;
    return Array.from({ length:n }, (_, k) => lo + (hi - lo) * (k + 1) / (n + 1));
  }
  function access(settings, email, isDesk){
    const a = (settings && settings.desk_access) || null;
    if(!a || a.mode === 'off') return false;
    if(a.mode === 'everyone') return !!isDesk;
    return (a.people || []).map(lc).includes(lc(email));
  }

  /* ---------------------------------------------- storage (Desktop 463 tables) ---------------------------------------------- */
  const LINE_COLS = 'id,person_id,place,day,pos,kind,body,done_at,origin_day,moved_to,ghost_of,star,circle,link,time_text,standup_item_id,talked_at,owner_star_by,erased_at,rev,updated_at';
  const STICK_COLS = 'id,person_id,color,body,side,x,y,rot,z,from_person_id,seen_at,ack_at,erased_at,rev,updated_at';
  const store = {
    async me(){ const { data, error } = await sb.rpc('desk_me'); if(error) throw error; return data || null; },
    async load(me, from){
      const [l, s, st, pg] = await Promise.all([
        sb.from('desk_lines').select(LINE_COLS).eq('person_id', me).is('erased_at', null).or('place.neq.day,day.gte.' + from),
        sb.from('desk_stickies').select(STICK_COLS).eq('person_id', me).is('erased_at', null),
        sb.from('desk_settings').select('person_id,pad_labels,mat,ink,neat,photo').eq('person_id', me).maybeSingle(),
        sb.from('desk_pages').select('day,leftovers_done,stamp,dogear,wrapped_at').eq('person_id', me).gte('day', from)
      ]);
      const e = l.error || s.error || st.error || pg.error; if(e) throw e;
      return { lines: l.data || [], stickies: s.data || [], settings: st.data || null, pages: pg.data || [] };
    },
    /* Older pages, for Month (desks only load the last 75 days up front). */
    async loadDays(me, from, to){
      const [l, pg] = await Promise.all([
        sb.from('desk_lines').select(LINE_COLS).eq('person_id', me).is('erased_at', null).eq('place', 'day').gte('day', from).lte('day', to),
        sb.from('desk_pages').select('day,leftovers_done,stamp,dogear,wrapped_at').eq('person_id', me).gte('day', from).lte('day', to)
      ]);
      const e = l.error || pg.error; if(e) throw e;
      return { lines: l.data || [], pages: pg.data || [] };
    },
    /* Stage 3 (owners). The database lets only owners do these on someone else's desk. */
    async visit(deskPerson, me, day){ const { error } = await sb.from('desk_visits').upsert({ desk_person_id:deskPerson, visitor_person_id:me, day, at:new Date().toISOString() }, { onConflict:'desk_person_id,visitor_person_id,day' }); if(error) throw error; return true; },
    async visits(deskPerson, day){ const { data, error } = await sb.from('desk_visits').select('visitor_person_id,at').eq('desk_person_id', deskPerson).eq('day', day); if(error) throw error; return data || []; },
    async star(lineId, on){ const { error } = await sb.rpc('desk_star_line', { p_line:lineId, p_on:on }); if(error) throw error; return true; },
    async everyone(ids, day){
      const [l, st, sk] = await Promise.all([
        sb.from('desk_lines').select('id,person_id,kind,body,done_at,pos,place,day').in('person_id', ids).is('erased_at', null).eq('place', 'day').eq('day', day),
        sb.from('desk_settings').select('person_id,mat').in('person_id', ids),
        sb.from('desk_stickies').select('person_id,color,from_person_id').in('person_id', ids).is('erased_at', null)
      ]);
      const e = l.error || st.error || sk.error; if(e) throw e;
      return { lines:l.data || [], settings:st.data || [], stickies:sk.data || [] };
    },
    async insert(table, row){ const { data, error } = await sb.from(table).insert(row).select().single(); if(error) throw error; return data; },
    /* Only applies when nobody changed the row since we read it (rev). null = it changed elsewhere. */
    async update(table, id, rev, patch){
      let q = sb.from(table).update(patch).eq('id', id); if(rev != null) q = q.eq('rev', rev);
      const { data, error } = await q.select(); if(error) throw error; return (data && data[0]) || null;
    },
    async remove(table, id){ const { error } = await sb.from(table).delete().eq('id', id); if(error) throw error; return true; },
    async saveSettings(row){ const { error } = await sb.from('desk_settings').upsert(row, { onConflict:'person_id' }); if(error) throw error; return true; },
    async savePage(row){ const { error } = await sb.from('desk_pages').upsert(row, { onConflict:'person_id,day' }); if(error) throw error; return true; }
  };
  window.dkStore = store;   /* the browser tests swap this for a pretend one */
  const ST = () => window.dkStore || store;

  /* ---------------------------------------------- state ---------------------------------------------- */
  const DK = { me:null, loaded:false, err:null, lines:[], stickies:[], settings:null, pages:{}, day:null, laterOpen:false, noteMode:false,
               turn:null, receive:null, born:null, sig:'', editing:false, timer:null, view:'day', month:null, monthData:{}, justStamped:null, who:null, visits:[], ev:null, tray:{}, warm:false };
  window.DK = DK;
  const T = () => todayStr();
  const lineById = id => DK.lines.find(l => l.id === id);
  const stickById = id => DK.stickies.find(s => s.id === id);
  const myName = () => { try{ return ccActor().name || 'you'; }catch(e){ return 'you'; } };
  const myEmail = () => { try{ return lc(ccActor().email); }catch(e){ return ''; } };
  /* Whose desk is open: null = my own. */
  const deskOf = () => DK.who || DK.me;
  const ro = () => !!DK.who && DK.who !== DK.me;
  const iOwn = () => { try{ return typeof ccIsOwner === 'function' && ccIsOwner(myEmail()); }catch(e){ return false; } };
  const people = () => { try{ return (OPS_PEOPLE || []).filter(p => p && p.person_id && p.primary_email); }catch(e){ return []; } };
  const personById = id => people().find(p => p.person_id === id) || null;
  const firstName = id => { const p = personById(id); return p ? String(p.full_name || p.primary_email).split(' ')[0] : 'Someone'; };
  /* Everyone the Hub gives a desk (role or job title), for the owners' tabs. */
  const deskPeople = () => people().filter(p => p.active !== false && hasDesk(p.primary_email)).sort((a, b) => String(a.full_name).localeCompare(String(b.full_name)));

  /* Saves go one at a time per row, and each uses the row's newest version. */
  const queues = {};
  function enqueue(key, job){ const p = (queues[key] || Promise.resolve()).then(job, job); queues[key] = p.catch(() => {}); return p; }
  let reloadSoon = null;
  function saveFailed(e, conflict){
    say(conflict ? 'That changed on another screen. Showing the newest copy.' : "Couldn't save just now, so your desk shows what is saved. Try again in a moment.");
    clearTimeout(reloadSoon); reloadSoon = setTimeout(() => load(true), 250);
  }
  function persistLine(id){
    return enqueue('l' + id, async () => {
      const l = lineById(id); if(!l || !l._dirty) return;
      const patch = Object.assign({}, l._dirty); l._dirty = null;
      try{
        if(l._new){ const row = await ST().insert('desk_lines', Object.assign(pick(l, ['id','person_id','place','day','pos','kind','body','done_at','origin_day','moved_to','ghost_of','link','time_text','standup_item_id','erased_at']))); l._new = false; l.rev = row.rev; return; }
        const row = await ST().update('desk_lines', id, l.rev, patch);
        if(!row) return saveFailed(null, true);
        l.rev = row.rev;
      }catch(e){ saveFailed(e); }
    });
  }
  function persistStick(id){
    return enqueue('s' + id, async () => {
      const s = stickById(id); if(!s || !s._dirty) return;
      const patch = Object.assign({}, s._dirty); s._dirty = null;
      try{
        if(s._new){ const row = await ST().insert('desk_stickies', pick(s, ['id','person_id','from_person_id','color','body','side','x','y','rot','z','erased_at'])); s._new = false; s.rev = row.rev; return; }
        const row = await ST().update('desk_stickies', id, s.rev, patch);
        if(!row) return saveFailed(null, true);
        s.rev = row.rev;
      }catch(e){ saveFailed(e); }
    });
  }
  function pick(o, keys){ const r = {}; keys.forEach(k => { if(o[k] !== undefined) r[k] = o[k]; }); return r; }

  /* One action = several changes, saved row by row, undoable together. */
  function action(msg, fn){
    const inv = [], touched = { l:new Set(), s:new Set() }, days = new Set();
    const ctx = {
      addLine(f){ const l = Object.assign({ id:uid(), person_id:DK.me, kind:'todo', body:'', pos:0, done_at:null, erased_at:null, rev:1 }, f, { _new:true, _dirty:{} });
        DK.lines.push(l); touched.l.add(l.id); inv.push(['lerase', l.id]); return l; },
      setLine(id, p){ const l = lineById(id); if(!l) return; const old = {}; Object.keys(p).forEach(k => { old[k] = l[k] === undefined ? null : l[k]; }); if(l.day) days.add(l.day); if(p.day) days.add(p.day);
        Object.assign(l, p); l._dirty = Object.assign(l._dirty || {}, p); touched.l.add(id); inv.push(['lset', id, old]); },
      addStick(f){ const s = Object.assign({ id:uid(), person_id:deskOf(), from_person_id:ro() ? DK.me : null, color:'yellow', body:'', side:'L', x:20, y:120, rot:0, z:1, erased_at:null, rev:1 }, f, { _new:true, _dirty:{} });
        DK.stickies.push(s); touched.s.add(s.id); inv.push(['serase', s.id]); return s; },
      setStick(id, p){ const s = stickById(id); if(!s) return; const old = {}; Object.keys(p).forEach(k => { old[k] = s[k] === undefined ? null : s[k]; });
        Object.assign(s, p); s._dirty = Object.assign(s._dirty || {}, p); touched.s.add(id); inv.push(['sset', id, old]); }
    };
    const r = fn(ctx);
    touched.l.forEach(persistLine); touched.s.forEach(persistStick);
    days.forEach(stampCheck);
    render();
    if(msg) say(msg, inv.length ? () => undo(inv) : null);
    return r;
  }
  function undo(inv){
    action(null, ctx => {
      inv.slice().reverse().forEach(([op, id, old]) => {
        if(op === 'lerase') ctx.setLine(id, { erased_at:new Date().toISOString() });
        else if(op === 'lset') ctx.setLine(id, old);
        else if(op === 'serase') ctx.setStick(id, { erased_at:new Date().toISOString() });
        else if(op === 'sset') ctx.setStick(id, old);
      });
    });
    say('Undone');
  }

  /* ---------------------------------------------- page facts: stamp, folded corner ---------------------------------------------- */
  function setPage(day, p){
    DK.pages[day] = Object.assign({ day }, DK.pages[day] || {}, p);
    ST().savePage(Object.assign({ person_id:DK.me, day }, p)).catch(e => saveFailed(e));
  }
  const STAMPS = ['house', 'sun', 'cup'];
  /* A page earns its stamp when it has at least 3 to-dos and every one is crossed off; it comes off if one is unchecked. */
  function stampCheck(day){
    if(!day) return false;
    const t = todos(inPlace(DK.lines, 'day', day)), all = t.length >= 3 && t.every(l => l.done_at), pg = DK.pages[day] || {};
    if(all && !pg.stamp){ DK.justStamped = day; setPage(day, { stamp:STAMPS[D(day).getDate() % 3] }); return true; }
    if(!all && pg.stamp){ setPage(day, { stamp:null }); return true; }
    return false;
  }

  /* ---------------------------------------------- loading ---------------------------------------------- */
  const signature = () => JSON.stringify([DK.lines.map(l => [l.id, l.rev, l.erased_at]), DK.stickies.map(s => [s.id, s.rev, s.erased_at])]);
  async function load(force){
    try{
      if(DK.meEmail !== myEmail()){ DK.me = null; DK.who = null; DK.meEmail = myEmail(); }   /* a different person signed in: start over */
      if(!DK.me) DK.me = await ST().me();
      if(!DK.me){ DK.err = 'nolink'; DK.loaded = true; render(); return; }
      if(!force && DK.loaded && (DK.editing || drag)) return;
      const from = addDays(T(), -75), whose = deskOf();
      const r = await ST().load(whose, from);
      if(DK.editing || drag) return;
      const pending = DK.lines.some(l => l._dirty || l._new) || DK.stickies.some(s => s._dirty || s._new);
      if(pending && !force) return;
      const got = new Set(r.lines.map(l => l.id)), older = DK.lines.filter(l => l.place === 'day' && l.day < from && !got.has(l.id) && !l.erased_at);
      DK.lines = r.lines.map(l => Object.assign({}, l, { pos:Number(l.pos) })).concat(older);
      DK.stickies = r.stickies;
      DK.settings = r.settings;
      const oldPages = {}; Object.keys(DK.pages).forEach(k => { if(k < from) oldPages[k] = DK.pages[k]; });
      DK.pages = oldPages; (r.pages || []).forEach(p => { DK.pages[p.day] = p; });
      DK.loaded = true; DK.err = null;
      const sids = DK.lines.filter(l => l.place === 'tray' && l.standup_item_id).map(l => l.standup_item_id);
      if(sids.length && window.suDesk){ try{ DK.tray = await window.suDesk.status(sids); }catch(e){} }
      if(!ro()){
        /* notes an owner left me: seen once my desk is actually on screen (not when it is read in the background) */
        const now = new Date().toISOString(), onScreen = typeof activeTab !== 'undefined' && activeTab === 'mydesk' && !document.hidden;
        if(onScreen) DK.stickies.filter(x => x.from_person_id && x.from_person_id !== DK.me && !x.seen_at).forEach(x => action(null, ctx => ctx.setStick(x.id, { seen_at:now })));
        try{ DK.visits = (await ST().visits(DK.me, T())).filter(v => v.visitor_person_id !== DK.me); }catch(e){ DK.visits = []; }
      }
      const sig = signature(); if(sig !== DK.sig || force){ DK.sig = sig; render(); }
    }catch(e){ DK.err = String((e && e.message) || e); DK.loaded = true; render(); }
  }

  /* ---------------------------------------------- moving lines ---------------------------------------------- */
  const placeName = t => t.place === 'day' ? (t.day === T() ? "today's page" : fmtShort(t.day)) : t.place === 'later' ? 'the Later folder' : t.place === 'tray' ? 'the Stand-Up tray' : '';
  /* Move a line (and the notes under it). Day to a different day leaves a faint "→ Tue" behind, like paper would. */
  function moveLine(id, t, quiet){
    const l = lineById(id); if(!l || l.kind === 'ghost') return;
    const srcArr = inPlace(DK.lines, l.place, l.day), block = blockOf(srcArr, id), fromPlace = l.place, fromSid = l.standup_item_id;
    const sameSpot = l.place === t.place && (t.place !== 'day' || l.day === t.day);
    if(sameSpot && t.index == null) return;
    action(quiet || sameSpot ? null : 'Moved to ' + placeName(t), ctx => {
      const ids = new Set(block.map(b => b.id));
      let target = inPlace(DK.lines, t.place, t.day).filter(x => !ids.has(x.id));
      let index = t.index == null ? target.length : Math.max(0, Math.min(t.index, target.length));
      if(!sameSpot && l.place === 'day' && t.place === 'day' && l.kind === 'todo')
        ctx.addLine({ place:'day', day:l.day, pos:l.pos, kind:'ghost', body:l.body, moved_to:t.day, ghost_of:l.id, origin_day:l.origin_day });
      if(t.place === 'day'){
        const g = target.findIndex(x => x.kind === 'ghost' && x.ghost_of === l.id);
        if(g >= 0 && t.index == null){ ctx.setLine(target[g].id, { erased_at:new Date().toISOString() }); index = g; target = target.filter((_, k) => k !== g); }
      }
      const ps = slots(target, index, block.length);
      block.forEach((b, k) => ctx.setLine(b.id, { place:t.place, day:t.place === 'day' ? t.day : null, pos:ps[k] }));
      if(t.place === 'day' && !sameSpot) DK.receive = t.day;
      if(fromPlace === 'tray' && t.place !== 'tray' && fromSid){ if(!talked({ standup_item_id:fromSid })) trayOut(fromSid); ctx.setLine(l.id, { standup_item_id:null, talked_at:null }); }
    });
    if(t.place === 'tray' && fromPlace !== 'tray'){ DK.landId = l.id; render(); trayIn(l.id, block.map(b => b.body).join(' · ')); }
  }
  /* ---------------------------------------------- the Stand-Up tray ---------------------------------------------- */
  async function trayIn(id, summary){
    try{
      if(!window.suDesk) throw new Error('the Stand-Up board is not on this page');
      const sid = await window.suDesk.create(summary, id);
      action(null, ctx => ctx.setLine(id, { standup_item_id:sid }));
      DK.tray[sid] = { status:'open' };
    }catch(e){ say("Couldn't put that on the Stand-Up board just now, so it went back to your page."); moveLine(id, { place:'day', day:T() }, true); }
  }
  function trayOut(sid){ if(window.suDesk && sid) window.suDesk.takeOut(sid).catch(() => {}); }
  const talked = l => { const st = l.standup_item_id && DK.tray[l.standup_item_id]; return !!(st && (st.talked_at || st.status === 'done')); };
  function nextStandup(){ try{ if(typeof suNextStandup === 'function'){ const n = suNextStandup(); if(n) return n; } }catch(e){} return { label:DOW[D(nextBiz(T())).getDay()].slice(0, 3).toUpperCase() + ' 9:00', words:dowName(nextBiz(T())) + ' at 9:00 AM' }; }
  function trayHtml(){
    const cards = inPlace(DK.lines, 'tray').filter(l => l.kind !== 'note'), show = cards.slice(-4), n = nextStandup();
    return '<button class="dk-tray" data-dk="tray" data-dkdrop="tray" aria-label="Stand-Up tray, ' + cards.length + ' cards" title="The team sees what is in this tray at Stand-Up">'
      + '<div class="dk-tback"></div><div class="dk-tcards">'
      + show.map((l, i) => '<div class="dk-icard' + (talked(l) ? ' dk-talked' : '') + (DK.landId === l.id ? ' dk-land' : '') + '" style="top:' + (i * 20) + 'px;--r:' + (((hash(l.id) % 5) - 2) * .8) + 'deg"><div class="dk-ict">' + esc(l.body) + '</div></div>').join('')
      + '</div>' + (cards.length ? '' : '<div class="dk-tempty">' + (ro() ? 'Nothing in the tray.' : 'Drop things here for Stand-Up') + '</div>')
      + (cards.length > 4 ? '<span class="dk-tmore">+' + (cards.length - 4) + ' more</span>' : '')
      + '<div class="dk-tfront"><span class="dk-dymo">STAND-UP · ' + esc(n.label) + '</span></div></button>';
  }
  function trayOpen(anchor){
    const cards = inPlace(DK.lines, 'tray').filter(l => l.kind !== 'note'), n = nextStandup(), R = ro();
    if(!cards.length){ say(R ? 'Nothing in ' + firstName(DK.who) + "'s tray." : 'Drag a line onto the tray, or press S on a line.'); return; }
    const rows = cards.map(l => '<div class="dk-trow" data-id="' + l.id + '"><span class="dk-trt">' + esc(l.body) + (talked(l) ? ' <b class="dk-tk">TALKED ABOUT</b>' : '') + '</span>'
      + (R ? '' : '<span class="dk-tbtns">' + (talked(l) ? '<button data-t="done">All set</button><button data-t="todo">Something to do: today\'s page</button>'
          : '<button data-t="back">Back to today\'s page</button><button data-t="out">Take it out</button>') + '</span>') + '</div>').join('');
    if(typeof ccPopOpen !== 'function') return;
    const el = ccPopOpen(anchor, '<div class="dk-traybox"><div class="dk-tkick">Stand-Up · ' + esc(n.words) + '</div><b style="font-size:16px;color:#0D365F">' + (R ? esc(firstName(DK.who)) + "'s tray" : 'Your Stand-Up tray') + '</b>'
      + '<p class="field-note" style="margin:4px 0 8px">The team sees the cards in this tray at Stand-Up (on the Stand-Up board and in Prepare Stand-Up). Nothing else on a desk.</p>' + rows + '</div>', { width:520 });
    if(!el || R) return;
    el.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if(!b) return;
      const id = b.closest('[data-id]').dataset.id, l = lineById(id); if(!l) return; const sid = l.standup_item_id;
      try{ ccPopClose(); }catch(x){}
      if(b.dataset.t === 'back' || b.dataset.t === 'out'){
        if(b.dataset.t === 'back') moveLine(id, { place:'day', day:T() });
        else { if(sid) trayOut(sid); action('Taken out of the tray', ctx => ctx.setLine(id, { erased_at:new Date().toISOString(), standup_item_id:null })); }
      } else if(b.dataset.t === 'done'){
        if(sid && window.suDesk) window.suDesk.finish(sid, 'All set after Stand-Up').catch(() => {});
        action('Off the tray. All set.', ctx => ctx.setLine(id, { done_at:new Date().toISOString(), erased_at:new Date().toISOString() }));
      } else if(b.dataset.t === 'todo'){
        if(sid && window.suDesk) window.suDesk.finish(sid, 'Back on ' + String(myName()).split(' ')[0] + "'s desk after Stand-Up").catch(() => {});
        action(null, ctx => ctx.setLine(id, { standup_item_id:null }));
        moveLine(id, { place:'day', day:T() });
      }
    });
  }
  function eraseLine(id){
    const l = lineById(id); if(!l) return;
    const block = l.kind === 'todo' ? blockOf(inPlace(DK.lines, l.place, l.day), id) : [l];
    if(l.place === 'tray' && l.standup_item_id && !talked(l)) trayOut(l.standup_item_id);
    action('Erased. Only you saw that.', ctx => { const now = new Date().toISOString(); block.forEach(b => ctx.setLine(b.id, { erased_at:now })); });
  }
  function toggle(id){
    const l = lineById(id); if(!l || l.kind !== 'todo') return;
    action(null, ctx => ctx.setLine(id, { done_at: l.done_at ? null : new Date().toISOString() }));
  }
  function addLine(text, note, onDay){
    text = String(text || '').trim().slice(0, 1000); if(!text) return;
    const day = onDay || DK.day, arr = inPlace(DK.lines, 'day', day);
    action(null, ctx => ctx.addLine({ place:'day', day, origin_day:day, pos:(arr.length ? arr[arr.length - 1].pos : 0) + 1, kind:note ? 'note' : 'todo', body:text, time_text:note ? null : parseTime(text) }));
  }
  function nudge(id, dir){
    const l = lineById(id); if(!l) return;
    const arr = inPlace(DK.lines, l.place, l.day), i = arr.findIndex(x => x.id === id), j = i + dir;
    if(j < 0 || j >= arr.length) return;
    const a = arr[i].pos, b = arr[j].pos;
    action(null, ctx => { ctx.setLine(arr[i].id, { pos:b }); ctx.setLine(arr[j].id, { pos:a }); });
    const el = $('[data-dkid="' + id + '"]'); if(el) el.focus();
  }

  /* ---------------------------------------------- render ---------------------------------------------- */
  const icon = id => '<svg aria-hidden="true"><use href="#dk-' + id + '"/></svg>';
  const TICKS = ['M6.5 12.5l4 4.6L19.5 3.8', 'M6 13.2l4.4 3.6L18.8 4.6', 'M7 12l3.4 5.2L20 4.4'];
  function rowHtml(l, idx, day){
    if(l.kind === 'ghost') return '<li class="dk-row dk-ghost" data-idx="' + idx + '"><span class="dk-gt">' + esc(l.body) + '<em>→ ' + esc(fmtTiny(l.moved_to || day)) + '</em></span></li>';
    const h = hash(l.id), jit = ' style="--jr:' + (((h % 7) - 3) * .12).toFixed(2) + 'deg;--jx:' + ((h % 5) - 2) + 'px"';
    const nb = day ? nextBiz(day) : T(), R = ro();
    const tools = R ? '' : '<span class="dk-tools">'
      + (l.kind === 'todo' ? (day ? '<button class="dk-tool" data-dk="t-next" title="Move to ' + esc(fmtShort(nb)) + ' (T)">' + icon('next') + DOW[D(nb).getDay()].slice(0, 3) + '</button>'
          : '<button class="dk-tool" data-dk="t-today" title="Back to today\'s page">' + icon('prev') + 'Today</button>')
        + (l.place !== 'later' ? '<button class="dk-tool" data-dk="t-later" title="Into the Later folder (L)">' + icon('later') + '</button>' : '')
        + (l.place !== 'tray' ? '<button class="dk-tool" data-dk="t-tray" title="Into the Stand-Up tray (S)">' + icon('tray') + '</button>' : '') : '')
      + '<button class="dk-tool" data-dk="more" title="More" aria-label="More">' + icon('dots') + '</button></span>';
    const grip = R ? '' : '<span class="dk-grip" aria-hidden="true">' + icon('grip') + '</span>';
    const attrs = ' data-dkid="' + l.id + '" data-idx="' + idx + '" tabindex="0"' + (R ? '' : ' data-dkdrag="line"');
    const ed = R ? '' : ' data-dk="edit"';
    if(l.kind === 'note') return '<li class="dk-row dk-note"' + attrs + '>' + grip + '<span class="dk-tw"' + jit + '><span class="dk-txt"' + ed + '>' + esc(l.body) + '</span></span>' + tools + '</li>';
    const c = carryInfo(l, day), c4 = c && c.n >= 4 && !l.done_at;
    const chips = [];
    if(l.time_text && !l.done_at) chips.push('<span class="dk-chip dk-time">' + icon('clock') + esc(l.time_text) + '</span>');
    if(c) chips.push('<span class="dk-chip dk-carry' + (c4 ? ' dk-carry4' : '') + '">' + esc(c.label) + '</span>');
    if(c4 && R && iOwn()) chips.push('<span class="dk-chip dk-hand">might need a hand?</span>');
    const ost = l.owner_star_by ? '<svg class="dk-ostar"><title>' + esc(firstName(l.owner_star_by)) + ' gave this a star</title><use href="#dk-gstar"/></svg>' : '';
    const star = '<button class="dk-mstar' + (l.star ? ' dk-on' : '') + '" ' + (R ? 'disabled tabindex="-1"' : 'data-dk="mstar"') + ' aria-label="' + (l.star ? 'Remove the star' : 'Star it in the margin') + '" title="' + (l.star ? 'Remove the star' : 'Star it') + '"><svg viewBox="0 0 24 24"><use href="#dk-hstar"/></svg></button>';
    return '<li class="dk-row' + (l.done_at ? ' dk-done' : '') + (c4 ? ' dk-c4' : '') + '"' + attrs + (R && iOwn() && l.done_at ? ' data-dk="ostar" title="' + (l.owner_star_by ? 'Take your star back' : 'Give this a star') + '"' : '') + '>' + star
      + (c4 ? '<svg class="dk-marginclip" aria-hidden="true"><use href="#dk-clip"/></svg>' : '') + grip
      + '<button class="dk-cb" ' + (R ? 'disabled tabindex="-1"' : 'data-dk="toggle"') + ' aria-label="' + (l.done_at ? 'Uncheck' : 'Check off') + '"><svg viewBox="0 0 24 24"><use href="#dk-box"/><path class="dk-tick" d="' + TICKS[h % 3] + '"/></svg></button>'
      + '<span class="dk-tw"' + jit + '><span class="dk-txt"' + ed + '>' + esc(l.body) + '</span>'
      + (l.circle ? '<svg class="dk-circ" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d="M8 6 C30 -1 80 0 95 9 C102 16 90 28 50 28 C14 28 -2 22 3 13 C6 7 16 4 26 3"/></svg>' : '')
      + (chips.length ? '<span class="dk-chips">' + chips.join('') + '</span>' : '') + '</span>' + ost + tools + '</li>';
  }
  function pageHtml(day, cls){
    const d = D(day), arr = inPlace(DK.lines, 'day', day), prev = prevBiz(day), next = nextBiz(day), t = T();
    const pg = DK.pages[t] || {};
    const R = ro(), left = (!R && day === t && !pg.leftovers_done) ? openOf(inPlace(DK.lines, 'day', prevBiz(t))) : [];
    const pf = DK.pages[day] || {}, hd = hash(day);
    return '<article class="dk-page' + (cls || '') + '" data-day="' + day + '">'
      + '<div class="dk-rings">' + '<i></i>'.repeat(14) + '</div>'
      + (day === ribbonDay() ? '<div class="dk-ribbon" title="Your ribbon marks the page you are on"></div>' : '')
      + (hd % 4 === 1 ? '<div class="dk-coffee" style="left:' + (60 + hd % 300) + 'px;bottom:' + (40 + hd % 90) + 'px"></div>' : '')
      + '<button class="dk-dogear' + (pf.dogear ? ' dk-on' : '') + '" ' + (R ? 'disabled tabindex="-1"' : 'data-dk="dogear"') + ' title="' + (pf.dogear ? 'Unfold the corner' : 'Fold the corner to come back to this page') + '" aria-label="Fold the corner"></button>'
      + '<div class="dk-head">' + (d.getMonth() === 9 ? '<svg class="dk-doodle" aria-hidden="true"><use href="#dk-leaf"/></svg>' : '')
      +   '<div><div class="dk-dow">' + dowName(day) + (day === t ? ' · today' : '') + '</div><h2 class="dk-date">' + fmtLong(day) + '</h2><div class="dk-motto">' + (MOTTO[d.getDay()] || '') + '</div></div>'
      +   '<span class="dk-sp"></span><div class="dk-nav">' + (day !== t ? '<button class="dk-back" data-dk="go" data-day="' + t + '">Back to today</button>' : '')
      +     '<button class="dk-round" data-dk="go" data-day="' + prev + '" aria-label="Previous page">' + icon('prev') + '</button>'
      +     '<button class="dk-round" data-dk="go" data-day="' + next + '" aria-label="Next page">' + icon('next') + '</button>'
      +     '<button class="dk-round" data-dk="month" aria-label="Month" title="Month">' + icon('day') + '</button></div></div>'
      + (left.length ? '<div class="dk-left"><span>' + left.length + ' left on ' + dowName(prevBiz(t)) + "'s page</span><span class=\"dk-sp\"></span>"
          + '<button class="dk-lbtn" data-dk="lo-bring">Bring them over</button><button class="dk-lbtn dk-ghosty" data-dk="lo-look">Let me look</button>'
          + '<button class="dk-lbtn dk-x" data-dk="lo-x" aria-label="Leave them there" title="Leave them there">' + icon('x') + '</button></div>' : '')
      + '<ol class="dk-list" data-dkdrop="list" data-day="' + day + '">'
      +   arr.map((l, i) => rowHtml(l, i, day)).join('')
      +   (R ? '' : '<li class="dk-jot' + (DK.noteMode ? ' dk-notemode' : '') + '"><button class="dk-mode" data-dk="jotmode" title="' + (DK.noteMode ? 'Writing a note. Click for a to-do' : 'Writing a to-do. Click to scribble a note instead (or Shift+Enter)') + '" aria-label="Switch between a to-do and a note">'
      +     icon(DK.noteMode ? 'pencil' : 'box') + '</button><input id="dkJot" data-day="' + day + '" maxlength="1000" placeholder="' + (DK.noteMode ? 'scribble a note…' : 'jot something down…') + '" autocomplete="off" aria-label="Jot something down">'
      +     '<span class="dk-tip">Enter for a to-do · Shift+Enter for a note</span></li>')
      + '</ol>' + (R ? '<div class="dk-ronote">' + esc(firstName(DK.who)) + "'s page, in " + esc(firstName(DK.who)) + "'s handwriting. You can leave a note on the desk, or give a finished line a star.</div>" : '<div class="dk-blank" data-dk="focusjot" aria-hidden="true"></div>')
      + (pf.wrapped_at ? '<div class="dk-wrapped">Wrapped up at ' + esc(new Date(pf.wrapped_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', timeZone:TZ })) + '. See you ' + dowName(nextBiz(day)) + '.</div>' : '')
      + (pf.stamp ? '<div class="dk-stamp' + (DK.justStamped === day ? ' dk-thunk' : '') + '"><svg><use href="#dk-st-' + esc(pf.stamp) + '"/></svg><div>' + (day === t ? "Good day's work, " + esc(R ? firstName(DK.who) : String(myName()).split(' ')[0]) + '.' : '') + '</div></div>' : '')
      + '<button class="dk-curl" data-dk="go" data-day="' + next + '" aria-label="Turn the page" title="Turn to ' + fmtShort(next) + '"></button>'
      + '</article>';
  }
  function plannerHtml(day){
    const prev = prevBiz(day), next = nextBiz(day);
    const peek = (cls, d) => '<button class="dk-peek dk-' + cls + (DK.receive === d ? ' dk-receive' : '') + '" data-dk="go" data-day="' + d + '" data-dkdrop="day" data-dayto="' + d + '" aria-label="' + fmtShort(d) + '"><span class="dk-pl">' + fmtTiny(d) + '</span>'
      + (DK.receive === d ? '<span class="dk-plus1">+1</span>' : '') + '</button>';
    return '<div class="dk-planner" id="dkPlanner">' + peek('prev', prev) + peek('next', next)
      + '<div class="dk-ptabs"><button class="dk-ptab" style="--c:#bde2ee" data-dk="go" data-day="' + T() + '">Today</button><button class="dk-ptab" style="--c:#fde68a" data-dk="month">Month</button><button class="dk-ptab" style="--c:#d5b077" data-dk="later" data-dkdrop="later">Later</button></div>'
      + (!ro() && fridayWeek() ? '<button class="dk-tuck dk-weektuck" data-dk="week"><b>Your week</b><span>Have a look ›</span></button>' : '')
      + pageHtml(day, DK.turn ? ' dk-turn-' + DK.turn : '') + '</div>';
  }
  function folderHtml(){
    const arr = inPlace(DK.lines, 'later'), n = todos(arr).length;
    return '<div class="dk-pocket"><button class="dk-folder' + (DK.laterOpen ? ' dk-open' : '') + '" data-dk="later" data-dkdrop="later" aria-label="Later folder, ' + n + ' inside">'
      + '<div class="dk-ftab"></div><div class="dk-fb"></div><div class="dk-papers">' + [0,1,2].slice(0, Math.min(3, n)).map(i => '<i style="top:' + (24 + i * 5) + 'px;transform:rotate(' + (i - 1) + 'deg)"></i>').join('') + '</div>'
      + '<div class="dk-ff"><div class="dk-flabel"><b>LATER</b><span>' + (n ? n + ' tucked away' : 'empty') + '</span></div></div></button>'
      + (DK.laterOpen ? '<ol class="dk-later" data-dkdrop="later">' + (arr.length ? arr.map((l, i) => '<li class="dk-slip' + (l.kind === 'note' ? ' dk-slipnote' : '') + '" data-dkid="' + l.id + '" data-idx="' + i + '"' + (ro() ? '' : ' data-dkdrag="line"') + ' tabindex="0"><span class="dk-st">' + esc(l.body) + '</span>'
          + (ro() ? '' : '<button class="dk-tool" data-dk="more" aria-label="More">' + icon('dots') + '</button>') + '</li>').join('') : '<li class="dk-slip-empty">Nothing tucked away.</li>') + '</ol>' : '') + '</div>';
  }
  function stickyHtml(s){
    const note = !!s.from_person_id, mineNote = note && s.from_person_id === DK.me, toMe = note && !mineNote && !ro();
    const movable = ro() ? mineNote : true, editable = ro() ? mineNote : !note;
    let head = '', foot = '', btns = [];
    if(note){
      head = '<div class="dk-from">' + (mineNote ? 'Your note to ' + esc(firstName(s.person_id)) : esc(firstName(s.from_person_id)) + ' left you a note') + '</div>';
      const t = x => { try{ return new Date(x).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', timeZone:TZ }); }catch(e){ return ''; } };
      const rc = mineNote ? (s.ack_at ? firstName(s.person_id) + ' said got it' : s.seen_at ? 'Seen ' + t(s.seen_at) : 'Not seen yet') : (s.ack_at ? 'You said got it' : '');
      foot = '<div class="dk-sig">' + esc(firstName(s.from_person_id)) + '</div><div class="dk-rcpt">' + esc(rc) + '</div>';
    }
    if(!note && !ro()) btns = ['<button class="dk-sbtn" data-dk="s-color" aria-label="Change color"><span class="dk-dot dk-c-' + nextColor(s.color) + '"></span></button>', '<button class="dk-sbtn" data-dk="s-peel">Peel off</button>'];
    if(toMe) btns = (s.ack_at ? [] : ['<button class="dk-sbtn" data-dk="s-ack">Got it</button>']).concat(['<button class="dk-sbtn" data-dk="s-peel">Peel off</button>']);
    if(mineNote && ro()) btns = ['<button class="dk-sbtn" data-dk="s-back">Take it back</button>'];
    return '<div class="dk-sticky dk-c-' + esc(s.color) + (note ? ' dk-owner' : '') + (DK.born === s.id ? ' dk-born' : '') + '" data-sid="' + s.id + '" data-dkdrop="sticky" style="--r:' + (Number(s.rot) || 0) + 'deg;z-index:' + (s.z || 1) + '"' + (movable ? ' data-dkdrag="sticky"' : '') + '>'
      + head + '<div class="dk-stt"' + (editable ? ' data-dk="s-edit"' : '') + '>' + esc(s.body) + '</div>' + foot
      + (btns.length ? '<div class="dk-sbtns">' + btns.join('') + '</div>' : '') + '</div>';
  }
  const COLORS = ['yellow','pink','blue','green'];
  const nextColor = c => COLORS[(COLORS.indexOf(c) + 1) % COLORS.length] || 'yellow';
  function padsHtml(){
    const labels = (DK.settings && DK.settings.pad_labels) || {};
    const R = ro();
    return '<div class="dk-pads">' + (R ? '<div class="dk-padh">Leave ' + esc(firstName(DK.who)) + ' a note</div>' : '') + [['yellow','-3deg'],['pink','2deg'],['blue','-1deg'],['green','3deg']].map(([c, r]) => '<div class="dk-padc"><button class="dk-pad dk-c-' + c + '" style="--r:' + r + '" data-dk="pad" data-c="' + c + '" aria-label="' + (R ? 'Leave a ' + c + ' note, signed from you' : 'New ' + c + ' sticky note') + '"></button>'
      + (R ? '' : '<span class="dk-plabel" data-dk="plabel" data-c="' + c + '" title="Give this color your own meaning, if you like">' + esc(labels[c] || '') + '</span>') + '</div>').join('') + '</div>';
  }
  /* The ribbon marks today, until End My Shift moves it on to the next page. */
  const ribbonDay = () => ((DK.pages[T()] || {}).wrapped_at ? nextBiz(T()) : T());
  /* "Your week": Friday from noon until Monday morning (decision 8), Central time. Returns that week's Monday, or null. */
  function fridayWeek(now){
    const d = now ? new Date(now) : new Date();
    const day = d.toLocaleDateString('en-CA', { timeZone:TZ }), hr = Number(d.toLocaleTimeString('en-GB', { timeZone:TZ, hour:'2-digit', hour12:false }).slice(0, 2));
    const w = D(day).getDay();
    let fri = null;
    if(w === 5 && hr >= 12) fri = day; else if(w === 6) fri = addDays(day, -1); else if(w === 0) fri = addDays(day, -2); else if(w === 1 && hr < 9) fri = addDays(day, -3);
    if(!fri) return null;
    const mon = addDays(fri, -4);
    try{ if(localStorage.getItem('dk-week-tucked-' + mon) === '1') return null; }catch(e){}
    return mon;
  }
  function weekCard(anchor){
    const mon = fridayWeek(); if(!mon) return;
    const days = [0, 1, 2, 3, 4].map(k => addDays(mon, k));
    const fin = []; days.forEach(dd => todos(inPlace(DK.lines, 'day', dd)).forEach(l => { if(l.done_at && bizDiff(l.origin_day, dd) >= 2) fin.push(l.body); }));
    const st = days.map(dd => '<span>' + ((DK.pages[dd] || {}).stamp ? '<svg><use href="#dk-st-' + esc(DK.pages[dd].stamp) + '"/></svg>' : '<i></i>') + DOW[D(dd).getDay()].slice(0, 3).toUpperCase() + '</span>').join('');
    if(typeof ccPopOpen !== 'function') return;
    const el = ccPopOpen(anchor, '<div class="dk-weekbox"><div class="dk-tkick">' + esc(fmtShort(mon)) + ' to ' + esc(fmtShort(days[4])) + '</div><b style="font-size:18px;color:#0D365F;font-family:Young Serif,Georgia,serif;font-weight:400">Your week</b>'
      + '<div class="dk-wstamps">' + st + '</div>'
      + (fin.length ? '<div style="font-weight:700;margin-top:10px">Finally crossed off</div><div class="dk-wfin">' + fin.map(t => '<div>' + esc(t) + '</div>').join('') + '</div>' : '')
      + '<div class="dk-wbye">Have a good weekend, ' + esc(String(myName()).split(' ')[0]) + '.</div>'
      + '<div style="margin-top:12px"><button class="primary" data-wk="away">Tuck it away</button></div>'
      + '<p class="field-note" style="margin-top:10px">Only you see this. It shows up Friday afternoon and goes away on its own. No totals, and never compared to anyone.</p></div>', { width:440 });
    if(el) el.addEventListener('click', e => { if(!e.target.closest('[data-wk]')) return; try{ localStorage.setItem('dk-week-tucked-' + mon, '1'); }catch(x){} try{ ccPopClose(); }catch(x){} render(); });
  }

  /* ---------------------------------------------- the desk from elsewhere: ＋ Add, End My Shift ---------------------------------------------- */
  /* Read my desk once in the background, so ＋ Add and End My Shift know it without the tab being open. */
  async function dkWarm(){
    if(DK.warm || !dkAllowed()) return; DK.warm = true;
    ensureAssets(); if(!DK.day) DK.day = T();
    try{ await load(true); }catch(e){}
  }
  async function ownDesk(){
    if(DK.meEmail !== myEmail() || !DK.loaded || ro()){ DK.view = 'day'; await openDesk(null); }
  }
  async function dkQuickJot(text, note){
    if(!dkAllowed()) return false;
    await ownDesk(); if(!DK.me) return false;
    addLine(text, note, T()); return true;
  }
  function dkJotOpen(anchor){
    if(typeof ccPopOpen !== 'function') return;
    const el = ccPopOpen(anchor, '<div style="font-size:13px;font-weight:800;color:var(--navy);margin:2px 2px 6px;">Jot on my desk</div>'
      + '<input id="dkQuick" maxlength="1000" placeholder="jot something down…" style="width:100%;font-size:15px;padding:8px 10px;" autocomplete="off">'
      + '<div class="field-note" style="margin-top:6px;">Enter puts it on today\'s page. Shift+Enter makes it a note. Only you see it.</div>', { width:340 });
    const i = el && el.querySelector('#dkQuick'); if(!i) return;
    setTimeout(() => i.focus(), 30);
    i.addEventListener('keydown', async e => { if(e.key !== 'Enter') return; e.preventDefault(); e.stopPropagation(); const v = i.value.trim(); if(!v) return;
      try{ ccPopClose(); }catch(x){} const ok = await dkQuickJot(v, e.shiftKey); say(ok ? "On today's page" : "Couldn't open your desk just now."); });
  }
  /* End My Shift: a short desk step (decided per line, nothing moves unless chosen) and the ribbon moves on. */
  function dkShiftHtml(){
    if(!dkAllowed() || !DK.loaded || ro() || !DK.me) return '';
    const open = openOf(inPlace(DK.lines, 'day', T())), tray = inPlace(DK.lines, 'tray').filter(l => l.kind !== 'note' && !talked(l)), n = nextStandup();
    return '<div class="dk-shift" style="margin-top:12px;"><div style="font-size:12px;font-weight:800;letter-spacing:.05em;color:var(--navy);margin:6px 0;">YOUR DESK' + (open.length ? ' · ' + open.length + ' STILL OPEN ON TODAY\'S PAGE' : '') + '</div>'
      + (open.length ? '<div class="field-note" style="margin-bottom:6px;">Only you see these. Nothing moves unless you choose.</div>'
        + open.map(l => '<div class="dkEsRow" data-id="' + l.id + '" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--border);padding:5px 0;"><span style="flex:1 1 220px;min-width:0;font-size:13.5px;">' + esc(l.body) + '</span>'
          + '<select class="dkEsWhat" style="width:auto;font-size:12.5px;padding:4px 6px;"><option value="keep">Leave it</option><option value="next">' + esc(dowName(nextBiz(T()))) + '</option><option value="later">Later folder</option><option value="tray">Stand-Up tray</option></select></div>').join('')
        : '<div class="field-note">Today\'s page is all crossed off.</div>')
      + (tray.length ? '<div class="field-note" style="margin-top:6px;">In your Stand-Up tray for ' + esc(n.words) + ': ' + tray.map(l => '“' + esc(l.body) + '”').join(', ') + '.</div>' : '')
      + '<div class="field-note" style="margin-top:4px;">Your ribbon moves to ' + esc(dowName(nextBiz(T()))) + '\'s page.</div></div>';
  }
  async function dkShiftApply(el){
    if(!dkAllowed() || !DK.loaded || ro() || !DK.me) return;
    const rows = [...((el && el.querySelectorAll('.dkEsRow')) || [])];
    rows.forEach(r => { const what = r.querySelector('.dkEsWhat').value, id = r.dataset.id;
      if(what === 'next') moveLine(id, { place:'day', day:nextBiz(T()) }, true); else if(what === 'later') moveLine(id, { place:'later' }, true); else if(what === 'tray') moveLine(id, { place:'tray' }, true); });
    setPage(T(), { wrapped_at:new Date().toISOString() }); render();
  }
  function dkRefresh(){ if($('#dkRoot')) render(); }

  function calHtml(){
    const [y, m] = DK.day.slice(0, 7).split('-').map(Number), t = T();
    const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate(), lead = (first.getDay() + 6) % 7;
    let h = '<div class="dk-tent"><div class="dk-face"><div class="dk-coil">' + '<i></i>'.repeat(9) + '</div><div class="dk-band"><span>' + MON[m - 1].toUpperCase() + '</span><button data-dk="month">MONTH</button></div><div class="dk-calg">'
      + ['M','T','W','T','F','S','S'].map(w => '<span class="dk-w">' + w + '</span>').join('') + '<span></span>'.repeat(lead);
    for(let i = 1; i <= days; i++){
      const d = S(new Date(y, m - 1, i)), wk = isWk(d), has = todos(inPlace(DK.lines, 'day', d)).length;
      h += '<button ' + (wk ? 'disabled' : 'data-dk="go" data-day="' + d + '" data-dkdrop="day" data-dayto="' + d + '"') + ' class="' + (has ? 'dk-has ' : '') + (d === DK.day && d !== t ? 'dk-sel' : '') + '" aria-label="' + fmtShort(d) + '">' + i
        + (d === t ? '<svg class="dk-ring" viewBox="0 0 30 24" preserveAspectRatio="none" aria-hidden="true"><path d="M4 9C8 2 25 1 27 9c2 8-10 13-19 11C2 18 1 12 6 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' : '') + '</button>';
    }
    return h + '</div></div><div class="dk-base"></div></div>';
  }
  /* The lines and page facts for any day: the loaded window, or an older month fetched for Month. */
  function dayData(d){
    const md = DK.monthData[d.slice(0, 7)];
    const lines = md && d < addDays(T(), -75) ? md.lines : DK.lines;
    const pages = md && d < addDays(T(), -75) ? md.pages : DK.pages;
    return { arr:inPlace(lines, 'day', d), page:pages[d] || {} };
  }
  function monthHtml(){
    const [y, m] = DK.month.split('-').map(Number), t = T();
    const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate(), lead = (first.getDay() + 6) % 7;
    let h = '<div class="dk-mh2"><button class="dk-round dk-onmat" data-dk="mnav" data-n="-1" aria-label="Previous month">' + icon('prev') + '</button>'
      + '<h2>' + MON[m - 1] + ' ' + y + '</h2><button class="dk-round dk-onmat" data-dk="mnav" data-n="1" aria-label="Next month">' + icon('next') + '</button><span class="dk-sp"></span>'
      + '<button class="dk-backp" data-dk="mday" data-day="' + DK.day + '">Back to the page</button></div>';
    if(DK.monthLoading) return h + '<div class="dk-msg">Opening ' + MON[m - 1] + '…</div>';
    h += '<div class="dk-mgrid">' + ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((w, i) => '<div class="dk-mw' + (i > 4 ? ' dk-wkcol' : '') + '">' + w + '</div>').join('');
    for(let i = 0; i < lead; i++) h += '<div class="dk-mblank' + (i > 4 ? ' dk-wkcol' : '') + '"></div>';
    let stamps = 0;
    for(let i = 1; i <= days; i++){
      const d = S(new Date(y, m - 1, i));
      if(isWk(d)){ h += '<div class="dk-mini dk-wk dk-wkcol"><div class="dk-md">' + DOW[D(d).getDay()].slice(0, 3).toUpperCase() + '<b>' + i + '</b></div></div>'; continue; }
      const { arr, page } = dayData(d), td = todos(arr), done = td.filter(l => l.done_at).length, open = td.length - done, notes = arr.filter(l => l.kind === 'note').length;
      if(page.stamp) stamps++;
      const counts = [open ? open + ' open' : '', done ? done + ' ✓' : '', notes ? notes + ' note' + (notes > 1 ? 's' : '') : ''].filter(Boolean).join(' · ');
      h += '<button class="dk-mini' + (d > t ? ' dk-future' : '') + (d === t ? ' dk-today' : '') + '" data-dk="mday" data-day="' + d + '" data-mday="' + d + '" style="--r:' + (((i * 37) % 7 - 3) * .35) + 'deg">'
        + '<div class="dk-md">' + DOW[D(d).getDay()].slice(0, 3).toUpperCase() + '<b>' + i + '</b></div>'
        + arr.filter(l => l.kind !== 'ghost').slice(0, 5).map(l => '<div class="dk-ml' + (l.done_at ? ' dk-d' : '') + (l.kind === 'note' ? ' dk-n' : '') + '">' + esc(l.body) + '</div>').join('')
        + '<div class="dk-mc">' + (counts || (d > t ? '' : 'blank page')) + '</div>'
        + (page.dogear ? '<span class="dk-de" title="corner folded"></span>' : '')
        + (page.stamp ? '<svg class="dk-ms" aria-label="stamped"><use href="#dk-st-' + esc(page.stamp) + '"/></svg>' : '') + '</button>';
    }
    return h + '</div><div class="dk-mfoot">' + (stamps ? stamps + ' stamped page' + (stamps === 1 ? '' : 's') + ' in ' + MON[m - 1] + '. ' : '') + 'Click any page to open it. Folded corners are pages you marked to come back to.</div>';
  }
  /* Owners: a tab for each desk, built from who has one (Hub role or Team job title), never typed in. */
  function tabsHtml(){
    if(!iOwn() || !DK.me) return '';
    const cur = DK.view === 'everyone' ? 'everyone' : (DK.who || DK.me);
    const others = deskPeople().filter(p => p.person_id !== DK.me);
    const col = ['#bde2ee', '#cde8c2', '#fde68a', '#f8c5d2', '#e3c48d'];
    return '<div class="dk-tabs"><button class="dk-tab" style="--c:#f8c5d2" data-dk="desk" data-who="" aria-current="' + (cur === DK.me) + '">My Desk</button>'
      + others.map((p, i) => '<button class="dk-tab" style="--c:' + col[i % col.length] + '" data-dk="desk" data-who="' + esc(p.person_id) + '" aria-current="' + (cur === p.person_id) + '">' + esc(String(p.full_name || '').split(' ')[0]) + "'s Desk</button>").join('')
      + '<button class="dk-tab" style="--c:#f2eee3" data-dk="everyone" aria-current="' + (cur === 'everyone') + '">Everyone</button></div>';
  }
  async function openDesk(who){
    if(DK.meEmail !== myEmail()){ DK.me = null; DK.meEmail = myEmail(); }
    try{ if(!DK.me) DK.me = await ST().me(); }catch(e){}
    DK.who = who && who !== DK.me ? who : null;
    DK.view = 'day'; DK.day = T(); DK.monthData = {}; DK.lines = []; DK.stickies = []; DK.settings = null; DK.pages = {}; DK.visits = []; DK.loaded = false; DK.sig = ''; DK.laterOpen = false;
    render(); await load(true);
    if(ro()) ST().visit(DK.who, DK.me, T()).catch(() => {});   /* the person sees "Samantha stopped by" */
  }
  async function openEveryone(){
    DK.view = 'everyone'; DK.who = null; DK.ev = null; render();
    const ids = deskPeople().map(p => p.person_id).filter(id => id !== DK.me);
    try{ DK.ev = Object.assign({ ids }, await ST().everyone(ids, T())); }catch(e){ DK.ev = { ids, err:String((e && e.message) || e) }; }
    render();
  }
  function everyoneHtml(){
    const ev = DK.ev;
    let h = '<div class="dk-mat dk-mat-teal" id="dkMat"><h2 class="dk-evh">Everyone\'s desks</h2><p class="dk-evsub">Today\'s page on each desk. Click one to stop by; they will see that you did. A desk appears on its own for anyone set up as an Owner, Care Coordinator or Staffing Coordinator (by Hub role or job title).</p>';
    if(!ev) return h + '<div class="dk-msg">Opening the desks…</div></div>';
    if(ev.err) return h + '<div class="dk-msg">The desks couldn\'t be opened just now.</div></div>';
    h += '<div class="dk-evgrid">' + ev.ids.map(id => {
      const p = personById(id) || {}, mat = ((ev.settings || []).find(x => x.person_id === id) || {}).mat || 'teal';
      const arr = (ev.lines || []).filter(l => l.person_id === id && l.kind !== 'ghost').sort((a, b) => a.pos - b.pos);
      const st = (ev.stickies || []).filter(x => x.person_id === id).slice(0, 4);
      return '<button class="dk-evcard dk-mat-' + esc(mat) + '" data-dk="desk" data-who="' + esc(id) + '"><span class="dk-evn">' + esc(String(p.full_name || '').split(' ')[0]) + "'s Desk</span>"
        + '<div class="dk-evpage"><div class="dk-evd">' + dowName(T()) + ', ' + fmtLong(T()) + '</div>'
        + arr.slice(0, 7).map(l => '<div class="dk-evl' + (l.done_at ? ' dk-d' : '') + (l.kind === 'note' ? ' dk-n' : '') + '">' + esc(l.body) + '</div>').join('')
        + (arr.length > 7 ? '<div class="dk-evm">and ' + (arr.length - 7) + ' more lines</div>' : '') + (arr.length ? '' : '<div class="dk-evm">A fresh page so far.</div>')
        + '<div class="dk-evstk">' + st.map((x, i) => '<i class="dk-c-' + esc(x.color) + '" style="--r:' + (i % 2 ? 4 : -5) + 'deg"></i>').join('') + '</div></div></button>';
    }).join('') + (ev.ids.length ? '' : '<div class="dk-msg">Nobody else has a desk yet.</div>') + '</div></div>';
    return h;
  }
  function matClass(){
    const st = DK.settings || {};
    return ' dk-mat-' + (['teal','navy','sage','cork'].includes(st.mat) ? st.mat : 'teal') + (st.ink === 'teal' || st.ink === 'plum' ? ' dk-ink-' + st.ink : '') + (st.neat ? ' dk-neat' : '');
  }
  async function openMonth(month){
    DK.month = month;
    if(month + '-01' < addDays(T(), -75)){
      if(!DK.monthData[month]){
        DK.monthLoading = true; render();
        try{ const [y, m] = month.split('-').map(Number); const r = await ST().loadDays(DK.me, month + '-01', S(new Date(y, m, 0)));
          const pages = {}; (r.pages || []).forEach(p => { pages[p.day] = p; });
          DK.monthData[month] = { lines:(r.lines || []).map(l => Object.assign({}, l, { pos:Number(l.pos) })), pages };
        }catch(e){ DK.monthLoading = false; say("That month couldn't be opened just now."); render(); return; }
        DK.monthLoading = false;
      }
    }
    render();
  }
  /* Zooming out: today's page shrinks into its spot while the rest of the month's pages are dealt out from the planner. */
  function zoomOut(){
    const page = $('#dkWrap .dk-page:not(.dk-out)');
    if(!page || reduced()){ DK.view = 'month'; openMonth(DK.day.slice(0, 7)); return; }
    const r1 = page.getBoundingClientRect(), clone = page.cloneNode(true);
    clone.classList.add('dk-flipclone'); clone.classList.remove('dk-turn-next', 'dk-turn-prev');
    clone.querySelectorAll('[id],[data-dkdrop],[data-dk]').forEach(e => { e.removeAttribute('id'); e.removeAttribute('data-dkdrop'); e.removeAttribute('data-dk'); });
    Object.assign(clone.style, { left:r1.left + 'px', top:r1.top + 'px', width:r1.width + 'px', height:r1.height + 'px' });
    DK.view = 'month'; DK.month = DK.day.slice(0, 7); render();
    const root = $('#dkRoot'); if(root) root.appendChild(clone);
    const cx = r1.left + r1.width / 2, cy = r1.top + r1.height / 3;
    document.querySelectorAll('#dkWrap .dk-mini:not(.dk-wk)').forEach((m, i) => {
      if(m.dataset.mday === DK.day){ m.style.visibility = 'hidden'; return; }
      const r = m.getBoundingClientRect(), mx = cx - (r.left + r.width / 2), my = cy - (r.top + r.height / 2);
      m.style.transition = 'none'; m.style.transform = 'translate(' + mx + 'px,' + my + 'px) scale(.5) rotate(' + ((i % 5) - 2) * 4 + 'deg)'; m.style.opacity = '0';
      requestAnimationFrame(() => requestAnimationFrame(() => { m.style.transition = 'transform .55s cubic-bezier(.3,.7,.2,1) ' + (i * .012) + 's, opacity .4s ' + (i * .012) + 's'; m.style.transform = ''; m.style.opacity = ''; }));
      setTimeout(() => { m.style.transition = ''; }, 1100);
    });
    const cell = $('#dkWrap [data-mday="' + DK.day + '"]');
    if(!cell){ clone.remove(); return; }
    const r2 = cell.getBoundingClientRect();
    requestAnimationFrame(() => { clone.style.transform = 'translate(' + (r2.left - r1.left) + 'px,' + (r2.top - r1.top) + 'px) scale(' + (r2.width / r1.width) + ',' + (r2.height / r1.height) + ')'; clone.style.opacity = '.5'; });
    setTimeout(() => { clone.remove(); cell.style.visibility = ''; }, 520);
  }
  function zoomIn(day){
    const cell = $('#dkWrap [data-mday="' + day + '"]'), r1 = cell ? cell.getBoundingClientRect() : null;
    DK.view = 'day'; DK.day = day; DK.turn = null;
    if(day < addDays(T(), -75)){ const md = DK.monthData[day.slice(0, 7)];   /* an older page: bring its lines onto the desk so it opens as usual */
      if(md){ const have = new Set(DK.lines.map(l => l.id)); md.lines.forEach(l => { if(!have.has(l.id)) DK.lines.push(l); }); Object.keys(md.pages).forEach(k => { if(!DK.pages[k]) DK.pages[k] = md.pages[k]; }); } }
    render();
    const page = $('#dkWrap .dk-page');
    if(!page || !r1 || reduced()) return;
    const r2 = page.getBoundingClientRect();
    page.style.transformOrigin = '0 0'; page.style.transition = 'none';
    page.style.transform = 'translate(' + (r1.left - r2.left) + 'px,' + (r1.top - r2.top) + 'px) scale(' + (r1.width / r2.width) + ',' + (r1.height / r2.height) + ')'; page.style.opacity = '.5';
    requestAnimationFrame(() => requestAnimationFrame(() => { page.style.transition = 'transform .5s cubic-bezier(.4,.1,.2,1), opacity .5s'; page.style.transform = ''; page.style.opacity = ''; }));
    setTimeout(() => { page.style.transition = ''; page.style.transformOrigin = ''; }, 560);
  }

  /* ---------------------------------------------- Make it yours ---------------------------------------------- */
  function saveMine(p){
    DK.settings = Object.assign({}, DK.settings || {}, p);
    render();
    ST().saveSettings(Object.assign({ person_id:DK.me }, p)).catch(e => saveFailed(e));
  }
  function prefs(){
    const st = DK.settings || {};
    const grp = (k, title, opts) => '<div style="margin-top:14px"><div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#C17A12;margin-bottom:6px">' + title + '</div><div style="display:flex;gap:8px;flex-wrap:wrap">'
      + opts.map(([v, l, sw]) => '<button class="dk-pref' + (String(st[k] == null ? (k === 'mat' ? 'teal' : k === 'ink' ? 'navy' : 'false') : st[k]) === String(v) ? ' dk-on' : '') + '" data-pk="' + k + '" data-pv="' + v + '">' + (sw ? '<span style="width:14px;height:14px;border-radius:50%;display:inline-block;background:' + sw + '"></span>' : '') + l + '</button>').join('') + '</div></div>';
    const html = '<div class="dk-prefbox"><b style="font-size:16px;color:#0D365F">Make it yours</b><p class="field-note" style="margin:4px 0 0">Your desk, your way. Owners who stop by see it the way you set it up.</p>'
      + grp('mat', 'Desk mat', [['teal','Teal felt','#1d6f7d'],['navy','Navy linen','#24405e'],['sage','Sage','#5f8370'],['cork','Cork','#b08452']])
      + grp('ink', 'Pen', [['navy','Navy ink','#0D365F'],['teal','Teal ink','#155A68'],['plum','Plum ink','#5b2a5e']])
      + grp('neat', 'Writing', [['false','Handwriting'],['true','Neat print']])
      + '<p class="field-note" style="margin-top:14px">Also yours: the photo on your desk (click it) and the little labels under your sticky pads.' + (st.photo ? ' <button class="dk-pref" data-pk="photo" data-pv="">Take my photo off</button>' : '') + '</p></div>';
    if(typeof ccPopOpen !== 'function') return;
    const el = ccPopOpen(null, html, { width:460 });
    if(el && innerWidth >= 700){ el.style.left = Math.max(8, (innerWidth - 460) / 2) + 'px'; el.style.top = '80px'; }
    if(el) el.addEventListener('click', e => { const b = e.target.closest('[data-pk]'); if(!b) return;
      const k = b.dataset.pk; let v = b.dataset.pv; if(k === 'neat') v = v === 'true'; if(k === 'photo') v = null;
      saveMine({ [k]:v }); el.querySelectorAll('[data-pk="' + k + '"]').forEach(x => x.classList.toggle('dk-on', x === b)); if(k === 'photo') b.remove(); });
  }
  /* A photo is made small here (240 x 240, a JPEG of at most about 60 KB) before it is saved. */
  function photoPicked(file){
    if(!file || !/^image\//.test(file.type || '')){ say('That isn\'t a picture.'); return; }
    const rd = new FileReader();
    rd.onload = () => { const img = new Image(); img.onload = () => {
        const c = document.createElement('canvas'), sz = 240, sq = Math.min(img.width, img.height); c.width = c.height = sz;
        c.getContext('2d').drawImage(img, (img.width - sq) / 2, (img.height - sq) / 2, sq, sq, 0, 0, sz, sz);
        let q = .85, url = c.toDataURL('image/jpeg', q); while(url.length > 78000 && q > .3){ q -= .1; url = c.toDataURL('image/jpeg', q); }
        if(url.length > 78000){ say('That picture is too detailed to keep on your desk. Try another.'); return; }
        saveMine({ photo:url }); say('Your photo is on your desk');
      }; img.onerror = () => say('That picture couldn\'t be opened.'); img.src = rd.result; };
    rd.readAsDataURL(file);
  }

  function deskHtml(){
    if(!DK.loaded) return '<div class="dk-mat"><div class="dk-msg">Opening your desk…</div></div>';
    if(DK.err === 'nolink') return '<div class="dk-mat"><div class="dk-msg">Your sign-in isn\'t connected to your name in the Hub yet, so there is no desk to open. An owner can fix that under Team on the Admin page.</div></div>';
    if(DK.err) return '<div class="dk-mat"><div class="dk-msg">Your desk couldn\'t be opened just now (' + esc(DK.err).slice(0, 160) + '). <button class="dk-lbtn" data-dk="reload">Try again</button></div></div>';
    const st = DK.settings || {};
    const left = '<div class="dk-rail dk-l">' + padsHtml() + '<div class="dk-zone"></div>' + calHtml()
      + '<div class="dk-bits"><button class="dk-polaroid" ' + (ro() ? 'tabindex="-1"' : 'data-dk="photo" title="Put your own photo here"') + '><div class="dk-img"' + (st.photo ? ' style="background-image:url(\'' + esc(st.photo) + '\')"' : '') + '>' + (st.photo ? '' : '<svg aria-hidden="true"><use href="#dk-heart"/></svg>') + '</div><span class="dk-cap">' + (st.photo || ro() ? '' : 'your photo') + '</span></button>'
      + (ro() ? '' : '<button class="dk-cup" data-dk="prefs" title="Make it yours" aria-label="Make it yours"><svg viewBox="0 0 52 78" aria-hidden="true"><path d="M14 30l6-26" stroke="#F0A63A" stroke-width="5" stroke-linecap="round"/><path d="M26 30V6" stroke="#8FD1C7" stroke-width="5" stroke-linecap="round"/><path d="M36 30l5-22" stroke="#f8c5d2" stroke-width="5" stroke-linecap="round"/><path d="M8 30h36l-3 44H11z" fill="#0D365F"/><path d="M8 30h36" stroke="#E8C988" stroke-width="3"/></svg></button>') + '</div>'
      + '<input type="file" id="dkPhotoIn" accept="image/*" hidden></div>';
    const right = '<div class="dk-rail dk-r"><div class="dk-zone dk-zr"></div>' + trayHtml() + folderHtml()
      + '<div class="dk-bits"><div class="dk-mug" aria-hidden="true"><div class="dk-steam"><i></i><i></i><i></i></div><svg viewBox="0 0 64 78"><path d="M8 22h40v38c0 8-6 13-14 13H22c-8 0-14-5-14-13z" fill="#f2eee3"/><path d="M48 32h5a8 8 0 0 1 0 16h-5" fill="none" stroke="#f2eee3" stroke-width="5"/><ellipse cx="28" cy="22" rx="20" ry="4" fill="#7a4a22"/><path d="M28 54c-4-2.6-5.8-4.6-5.8-6.6 0-1.6 1.2-2.6 2.5-2.6s2.2.7 3.3 2c1-1.3 2-2 3.3-2s2.5 1 2.5 2.6c0 2-1.8 4-5.8 6.6z" fill="#1F7A8C"/></svg></div>'
      + (ro() ? '' : '<button class="dk-eraser" data-dkdrop="erase" data-dk="erase-help" title="Drop a line or a sticky here to erase it">ERASE</button>')
      + '<button class="dk-help" data-dk="help">How to</button></div></div>';
    if(DK.view === 'everyone') return everyoneHtml();
    if(DK.view === 'month') return '<div class="dk-mat' + matClass() + '" id="dkMat">' + monthHtml() + '</div>';
    const strip = ro() ? '<div class="dk-strip">You are at ' + esc(firstName(DK.who)) + "'s desk. " + esc(firstName(DK.who)) + ' will see you stopped by.</div>' : '';
    const vis = !ro() && DK.visits.length ? '<div class="dk-visit">' + icon('steps') + DK.visits.map(v => esc(firstName(v.visitor_person_id)) + ' stopped by your desk today at ' + esc(new Date(v.at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', timeZone:TZ }))).join('. ') + '.</div>' : '';
    return '<div class="dk-mat' + matClass() + '" id="dkMat">' + strip + vis + '<div class="dk-stickies">' + DK.stickies.filter(s => !s.erased_at).map(stickyHtml).join('') + '</div>'
      + '<div class="dk-grid">' + left + plannerHtml(DK.day) + right + '</div></div>';
  }
  function render(){
    const w = $('#dkWrap'); if(!w) return;
    if(!dkAllowed()){ w.innerHTML = '<div class="dk"><div class="dk-mat"><div class="dk-msg">My Desk isn\'t switched on for you yet. An owner turns it on in Settings, under My Desk.</div></div></div>'; return; }
    if(!DK.day) DK.day = T();
    w.innerHTML = '<div class="dk" id="dkRoot">' + tabsHtml() + deskHtml() + '</div>';
    placeStickies();
    const pin = $('#dkPhotoIn'); if(pin) pin.onchange = e => { photoPicked(e.target.files && e.target.files[0]); e.target.value = ''; };
    DK.turn = null; DK.receive = null; DK.born = null; DK.justStamped = null; DK.landId = null;
  }

  /* Stickies remember which side of the page they sit on, so they stay put when the window changes size. */
  function geom(){
    const mat = $('#dkMat'), page = $('#dkWrap .dk-page:not(.dk-out)'); if(!mat || !page) return null;
    const mr = mat.getBoundingClientRect(), pr = page.getBoundingClientRect();
    return { mr, W:mr.width, H:mr.height, pl:pr.left - mr.left, pr:pr.right - mr.left };
  }
  const narrow = () => { const m = $('#dkMat'); return !m || m.getBoundingClientRect().width < 900; };
  function posToPx(s, g){ const left = s.side === 'L' ? s.x : s.side === 'R' ? g.W - s.x - 150 : g.W / 2 + s.x; return { left:Math.max(8, Math.min(g.W - 158, left)), top:Math.max(-20, Math.min(g.H - 140, s.y + 30)) }; }
  function pxToPos(left, top, g){
    const c = left + 75; top = Math.round(top - 30);
    if(c < g.pl) return { side:'L', x:Math.round(left), y:top };
    if(c > g.pr) return { side:'R', x:Math.round(g.W - left - 150), y:top };
    return { side:'C', x:Math.round(left - g.W / 2), y:top };
  }
  function placeStickies(){
    const root = $('#dkRoot'); if(!root) return;
    const nar = narrow(); root.classList.toggle('dk-narrow', nar);
    if(nar) return;
    const g = geom(); if(!g) return;
    DK.stickies.forEach(s => { const el = $('[data-sid="' + s.id + '"]'); if(!el) return; const p = posToPx(s, g); el.style.left = p.left + 'px'; el.style.top = p.top + 'px'; });
  }

  /* The page you click comes forward; the one you were on slides back into the stack. */
  function flipTo(day){
    if(!day || day === DK.day) return;
    const dir = day > DK.day ? 'next' : 'prev', old = $('#dkWrap .dk-page:not(.dk-out)');
    let clone = null;
    if(old && !reduced()){ const h = old.offsetHeight; clone = old.cloneNode(true); clone.classList.remove('dk-turn-next','dk-turn-prev'); clone.classList.add('dk-out', 'dk-out-' + dir);
      clone.querySelectorAll('[id],[data-dkdrop],[data-dk]').forEach(e => { e.removeAttribute('id'); e.removeAttribute('data-dkdrop'); e.removeAttribute('data-dk'); }); clone.style.height = h + 'px'; }
    DK.turn = dir; DK.day = day; render();
    if(clone){ const pl = $('#dkPlanner'), pg = pl && pl.querySelector('.dk-page'); if(pg){ pl.insertBefore(clone, pg); setTimeout(() => clone.remove(), 520); } }
  }

  /* ---------------------------------------------- the ⋯ menu ---------------------------------------------- */
  function menu(anchor, id){
    const l = lineById(id); if(!l) return;
    closeMenu();
    const base = l.place === 'day' ? l.day : T(), days = []; let d = T();
    for(let i = 0; i < 6; i++){ if(!(l.place === 'day' && d === l.day)) days.push(d); d = nextBiz(d); }
    const m = document.createElement('div'); m.className = 'dk-menu'; m.id = 'dkMenu'; m.dataset.id = id;
    const todo = l.kind === 'todo', onDay = l.place === 'day';
    m.innerHTML = (todo && onDay ? '<button data-m="toggle">' + icon('check') + (l.done_at ? 'Uncheck' : 'Check it off') + '<span class="dk-k">Space</span></button>' : '')
      + (!onDay ? '<button data-m="today">' + icon('prev') + "Back on today's page</button>" : (todo ? '<button data-m="next">' + icon('next') + 'Move to ' + fmtShort(nextBiz(base)) + '<span class="dk-k">T</span></button>' : ''))
      + (todo ? '<div class="dk-mh">' + icon('day') + 'Pick a day</div><div class="dk-days">' + days.slice(0, 5).map(s => '<button data-m="day" data-day="' + s + '">' + (s === T() ? 'Today' : fmtTiny(s)) + '</button>').join('') + '</div>' : '')
      + (todo && l.place !== 'later' ? '<button data-m="later">' + icon('later') + 'Into the Later folder<span class="dk-k">L</span></button>' : '')
      + (todo && l.place !== 'tray' ? '<button data-m="tray">' + icon('tray') + 'Into the Stand-Up tray<span class="dk-k">S</span></button>' : '')
      + (onDay && todo ? '<hr><button data-m="star">' + icon('hstar') + (l.star ? 'Remove the star' : 'Star it in the margin') + '<span class="dk-k">*</span></button><button data-m="circle">' + icon('circle') + (l.circle ? 'Remove the circle' : 'Circle it') + '<span class="dk-k">C</span></button>' : '')
      + (onDay ? '<hr>' + (todo ? '<button data-m="noteunder">' + icon('pencil') + 'Scribble a note under it</button>' : '<button data-m="todo">' + icon('box') + 'Make it a to-do</button>')
        + '<button data-m="up">' + icon('up') + 'Up one line<span class="dk-k">Alt ↑</span></button><button data-m="down">' + icon('down') + 'Down one line<span class="dk-k">Alt ↓</span></button>' : '')
      + '<button data-m="edit">' + icon('pencil') + 'Change the words<span class="dk-k">Enter</span></button><hr>'
      + '<button data-m="erase">' + icon('erase') + 'Erase<span class="dk-k">Del</span></button>';
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    if(innerWidth < 600){ m.style.left = '8px'; m.style.right = '8px'; m.style.bottom = '8px'; }
    else { m.style.left = Math.max(8, Math.min(innerWidth - 260, r.left)) + 'px'; const h = m.offsetHeight; m.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px'; }
    const f = m.querySelector('button'); if(f) f.focus();
  }
  const closeMenu = () => { const m = $('#dkMenu'); if(m) m.remove(); };
  function menuAct(a, id, el){
    closeMenu();
    const l = lineById(id); if(!l) return;
    const base = l.place === 'day' ? l.day : T();
    if(a === 'toggle') toggle(id);
    else if(a === 'next') moveLine(id, { place:'day', day:nextBiz(base) });
    else if(a === 'today') moveLine(id, { place:'day', day:T() });
    else if(a === 'day') moveLine(id, { place:'day', day:el.dataset.day });
    else if(a === 'later') moveLine(id, { place:'later' });
    else if(a === 'tray') moveLine(id, { place:'tray' });
    else if(a === 'noteunder') noteUnder(id);
    else if(a === 'star' || a === 'circle') action(null, ctx => ctx.setLine(id, { [a]:!l[a] }));
    else if(a === 'todo') action(null, ctx => ctx.setLine(id, { kind:'todo' }));
    else if(a === 'up' || a === 'down') nudge(id, a === 'up' ? -1 : 1);
    else if(a === 'edit'){ const t = $('[data-dkid="' + id + '"] .dk-txt') || $('[data-dkid="' + id + '"] .dk-st'); if(t) startEdit(t, id); }
    else if(a === 'erase') eraseLine(id);
  }
  function noteUnder(id){
    const l = lineById(id); if(!l || l.place !== 'day') return;
    const arr = inPlace(DK.lines, 'day', l.day), block = blockOf(arr, id), last = block[block.length - 1], i = arr.indexOf(last);
    const p = slots(arr, i + 1, 1)[0];
    const n = action(null, ctx => ctx.addLine({ place:'day', day:l.day, origin_day:l.day, pos:p, kind:'note', body:'' }));
    const t = $('[data-dkid="' + n.id + '"] .dk-txt'); if(t) startEdit(t, n.id, true);
  }

  /* ---------------------------------------------- editing ---------------------------------------------- */
  function caretEnd(el){ try{ const rg = document.createRange(); rg.selectNodeContents(el); rg.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(rg); }catch(e){} }
  function startEdit(el, id, fresh){
    const l = lineById(id); if(!l) return;
    const before = l.body; DK.editing = true;
    el.contentEditable = 'true'; el.focus(); caretEnd(el);
    let done = false;
    const finish = keep => {
      if(done) return; done = true; el.contentEditable = 'false'; DK.editing = false;
      const v = el.textContent.trim().slice(0, 1000);
      if(fresh && (!v || !keep)){ action(null, ctx => ctx.setLine(id, { erased_at:new Date().toISOString() })); return; }
      if(!keep || v === before){ el.textContent = before; return; }
      if(!v){ eraseLine(id); return; }
      action(null, ctx => ctx.setLine(id, l.kind === 'todo' ? { body:v, time_text:parseTime(v) || l.time_text || null } : { body:v }));
    };
    el.onkeydown = e => { e.stopPropagation(); if(e.key === 'Enter'){ e.preventDefault(); finish(true); } if(e.key === 'Escape'){ e.preventDefault(); finish(false); } };
    el.onblur = () => finish(true);
  }
  function editSticky(el, sid){
    const s = stickById(sid); if(!s) return;
    DK.editing = true; el.contentEditable = 'true'; el.focus(); caretEnd(el);
    el.onkeydown = e => { e.stopPropagation(); if(e.key === 'Escape') el.blur(); };
    el.onblur = () => {
      el.contentEditable = 'false'; DK.editing = false;
      const v = el.innerText.replace(/\n{3,}/g, '\n\n').trim().slice(0, 600);
      if(!v){ action(null, ctx => ctx.setStick(sid, { erased_at:new Date().toISOString() })); return; }
      if(v !== s.body) action(null, ctx => ctx.setStick(sid, { body:v }));
    };
  }
  function newSticky(c, padEl, at){
    const g = geom(); let pos = { side:'L', x:20 + Math.round(Math.random() * 30), y:110 + Math.round(Math.random() * 60) };
    if(g && !narrow()){
      if(at) pos = pxToPos(at.left, at.top, g);
      else if(padEl){ const r = padEl.getBoundingClientRect(); pos = pxToPos(r.left - g.mr.left + 4 + Math.random() * 20, r.bottom - g.mr.top + 30, g); }
    }
    const z = 1 + DK.stickies.reduce((m, s) => Math.max(m, s.z || 1), 1);
    const s = action(null, ctx => ctx.addStick(Object.assign({ color:c, body:'', rot:Math.round((Math.random() * 7 - 3.5) * 10) / 10, z }, pos)));
    DK.born = s.id; render();
    return s;
  }
  const editNew = s => { const el = $('[data-sid="' + s.id + '"] .dk-stt'); if(el) editSticky(el, s.id); };

  /* ---------------------------------------------- clicks ---------------------------------------------- */
  let justDragged = false;
  const ACT = {
    reload: () => { DK.err = null; DK.loaded = false; render(); load(true); },
    go: a => { if(DK.view !== 'day'){ DK.view = 'day'; DK.day = a.dataset.day; render(); return; } flipTo(a.dataset.day); },
    later: () => { DK.laterOpen = !DK.laterOpen; render(); },
    toggle: a => toggle(a.closest('[data-dkid]').dataset.dkid),
    edit: a => startEdit(a, a.closest('[data-dkid]').dataset.dkid),
    't-next': a => { const id = a.closest('[data-dkid]').dataset.dkid, l = lineById(id); moveLine(id, { place:'day', day:nextBiz(l.day || T()) }); },
    't-today': a => moveLine(a.closest('[data-dkid]').dataset.dkid, { place:'day', day:T() }),
    't-later': a => moveLine(a.closest('[data-dkid]').dataset.dkid, { place:'later' }),
    't-tray': a => moveLine(a.closest('[data-dkid]').dataset.dkid, { place:'tray' }),
    tray: a => trayOpen(a),
    week: a => weekCard(a),
    more: a => menu(a, a.closest('[data-dkid]').dataset.dkid),
    'lo-bring': () => {
      const from = prevBiz(T()), arr = inPlace(DK.lines, 'day', from), open = openOf(arr);
      action(open.length + ' line' + (open.length === 1 ? '' : 's') + ' brought over from ' + dowName(from), ctx => {
        let target = inPlace(DK.lines, 'day', T());
        open.forEach(l => {
          const block = blockOf(arr, l.id);
          ctx.addLine({ place:'day', day:from, pos:l.pos, kind:'ghost', body:l.body, moved_to:T(), ghost_of:l.id, origin_day:l.origin_day });
          const ps = slots(target, target.length, block.length);
          block.forEach((b, k) => ctx.setLine(b.id, { day:T(), pos:ps[k] }));
          target = inPlace(DK.lines, 'day', T());
        });
      });
    },
    'lo-look': () => { flipTo(prevBiz(T())); say('Use the ' + DOW[D(T()).getDay()].slice(0, 3) + ' button on any line you want to bring over, or drag it onto today peeking out.'); },
    'lo-x': () => { const p = { person_id:DK.me, day:T(), leftovers_done:true }; DK.pages[T()] = Object.assign(DK.pages[T()] || {}, p); render(); ST().savePage(p).catch(e => saveFailed(e)); say('Left them on ' + dowName(prevBiz(T())) + "'s page"); },
    jotmode: () => { DK.noteMode = !DK.noteMode; render(); const j = $('#dkJot'); if(j) j.focus(); },
    focusjot: () => { const j = $('#dkJot'); if(j) j.focus(); },
    pad: a => { const s = newSticky(a.dataset.c, a); editNew(s); if(ro()) say('Write your note. ' + firstName(DK.who) + ' sees it signed from you.'); },
    plabel: a => { a.contentEditable = 'true'; a.focus(); caretEnd(a); DK.editing = true;
      a.onkeydown = e => { e.stopPropagation(); if(e.key === 'Enter' || e.key === 'Escape'){ e.preventDefault(); a.blur(); } };
      a.onblur = () => { a.contentEditable = 'false'; DK.editing = false; const labels = Object.assign({}, (DK.settings && DK.settings.pad_labels) || {}); labels[a.dataset.c] = a.textContent.trim().slice(0, 14);
        DK.settings = Object.assign({}, DK.settings || {}, { pad_labels:labels }); ST().saveSettings({ person_id:DK.me, pad_labels:labels }).catch(e => saveFailed(e)); }; },
    's-edit': a => { if(justDragged) return; editSticky(a, a.closest('[data-sid]').dataset.sid); },
    's-color': a => { const s = stickById(a.closest('[data-sid]').dataset.sid); if(s) action(null, ctx => ctx.setStick(s.id, { color:nextColor(s.color) })); },
    's-peel': a => { const el = a.closest('[data-sid]'), sid = el.dataset.sid; el.classList.add('dk-peel'); setTimeout(() => action('Sticky peeled off', ctx => ctx.setStick(sid, { erased_at:new Date().toISOString() })), 300); },
    'erase-help': () => say('Drop a line or a sticky on the eraser to erase it'),
    desk: a => openDesk(a.dataset.who || null),
    everyone: () => openEveryone(),
    ostar: a => { if(!ro() || !iOwn()) return; const id = a.closest('[data-dkid]').dataset.dkid, l = lineById(id); if(!l || !l.done_at) return;
      const on = !l.owner_star_by; l.owner_star_by = on ? DK.me : null; render();
      ST().star(id, on).then(() => say(on ? 'You gave that a star. ' + firstName(DK.who) + ' will see it.' : 'Star taken back')).catch(e => saveFailed(e)); },
    's-ack': a => { const sid = a.closest('[data-sid]').dataset.sid, x = stickById(sid); if(!x) return; action(firstName(x.from_person_id) + ' will see "Got it"', ctx => ctx.setStick(sid, { ack_at:new Date().toISOString() })); },
    's-back': a => { const sid = a.closest('[data-sid]').dataset.sid; DK.stickies = DK.stickies.filter(x => x.id !== sid); render();
      ST().remove('desk_stickies', sid).then(() => say('Note taken back')).catch(e => saveFailed(e)); },
    mstar: a => { const id = a.closest('[data-dkid]').dataset.dkid, l = lineById(id); if(l) action(null, ctx => ctx.setLine(id, { star:!l.star })); },
    dogear: () => { const pf = DK.pages[DK.day] || {}; setPage(DK.day, { dogear:!pf.dogear }); render(); },
    month: () => zoomOut(),
    mday: a => zoomIn(a.dataset.day),
    mnav: a => { const [y, m] = DK.month.split('-').map(Number); openMonth(S(new Date(y, m - 1 + Number(a.dataset.n), 1)).slice(0, 7)); },
    photo: () => { const i = $('#dkPhotoIn'); if(i) i.click(); },
    prefs: () => prefs(),
    help: () => help()
  };
  function onClick(e){
    const mb = e.target.closest('#dkMenu [data-m]');
    if(mb){ menuAct(mb.dataset.m, $('#dkMenu').dataset.id, mb); return; }
    if($('#dkMenu') && !e.target.closest('#dkMenu')) closeMenu();
    if(!e.target.closest('#dkWrap')) return;
    if(justDragged){ justDragged = false; e.preventDefault(); return; }
    const a = e.target.closest('[data-dk]'); if(!a || a.isContentEditable) return;
    const f = ACT[a.dataset.dk]; if(f){ e.preventDefault(); f(a, e); }
  }
  function help(){
    const html = '<div class="dk-helpbox"><b style="font-size:15px;color:var(--navy,#0D365F)">How to</b><div class="dk-keys">'
      + '<kbd>Jot</kbd><span>Type and press Enter for a to-do. Shift+Enter (or the little pencil) writes a note with no checkbox.</span>'
      + '<kbd>Drag</kbd><span>Grab a line and drop it up or down the page, on the page peeking out behind (hold it there and the page turns), the Later folder, a sticky, or the eraser. Notes under a line travel with it.</span>'
      + '<kbd>Stickies</kbd><span>Click a pad, or drag a new sticky straight off it. Click to write. Drag it anywhere. Drop it on the page to turn its lines into to-dos. Click under a pad to give that color your own meaning.</span>'
      + '<kbd>Margin</kbd><span>Click the margin beside a line for a star. Press C to circle it.</span><kbd>Corner</kbd><span>Fold a page\'s top corner to come back to it. Folded pages show in Month.</span><kbd>Calendar</kbd><span>Click a date to open its page, or drop a line on it.</span>'
      + '<kbd>Space</kbd><span>Check off the selected line</span><kbd>T · L</kbd><span>The next day · the Later folder</span>'
      + '<kbd>Alt ↑ ↓</kbd><span>Move a line up or down</span><kbd>← →</kbd><span>Turn the page (swipe on a phone)</span><kbd>Del</kbd><span>Erase the selected line (Undo is right there)</span><kbd>N</kbd><span>Jump to the jot line</span></div>'
      + '<p class="field-note" style="margin-top:10px;">Only you see your desk. Owners can look at it, and in a later step they will be able to leave you a signed note. Nothing on your desk texts, emails or reminds anyone.</p></div>';
    if(typeof ccPopOpen === 'function'){ const el = ccPopOpen(null, html, { width:520 }); if(el && innerWidth >= 700){ el.style.left = Math.max(8, (innerWidth - 520) / 2) + 'px'; el.style.top = '70px'; } }
  }

  /* ---------------------------------------------- toast with Undo ---------------------------------------------- */
  let toastTimer = null, undoFn = null;
  function say(msg, undoIt){
    let t = $('#dkToast');
    if(!t){ t = document.createElement('div'); t.id = 'dkToast'; t.className = 'dk-toast'; document.body.appendChild(t);
      t.addEventListener('click', e => { if(e.target.closest('button') && undoFn){ const f = undoFn; undoFn = null; t.hidden = true; f(); } }); }
    undoFn = undoIt || null;
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (undoIt ? '<button>Undo</button>' : '');
    t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; undoFn = null; }, 5500);
  }

  /* ---------------------------------------------- keys ---------------------------------------------- */
  function onKey(e){
    if(typeof activeTab === 'undefined' || activeTab !== 'mydesk') return;
    const t = e.target;
    if(t.id === 'dkJot' && e.key === 'Enter'){ e.preventDefault(); const v = t.value; if(!v.trim()) return; addLine(v, DK.noteMode || e.shiftKey); const j = $('#dkJot'); if(j) j.focus(); return; }
    if(e.key === 'Escape' && $('#dkMenu')){ closeMenu(); return; }
    if(t.matches && (t.matches('input, textarea, select') || t.isContentEditable)) return;
    const row = t.closest && t.closest('[data-dkid]');
    if(row && t.closest('#dkWrap') && !ro()){
      const id = row.dataset.dkid, l = lineById(id); if(!l) return;
      const refocus = () => { const r = $('[data-dkid="' + id + '"]'); if(r) r.focus(); };
      if((e.key === ' ' || e.key === 'x') && l.kind === 'todo'){ e.preventDefault(); toggle(id); refocus(); return; }
      if(e.key === 't' && l.kind === 'todo'){ moveLine(id, { place:'day', day:nextBiz(l.day || T()) }); return; }
      if(e.key === 'l' && l.kind === 'todo'){ moveLine(id, { place:'later' }); return; }
      if(e.key === 's' && l.kind === 'todo'){ moveLine(id, { place:'tray' }); return; }
      if((e.key === '*' || e.key === 'c') && l.kind === 'todo' && l.place === 'day'){ const k = e.key === '*' ? 'star' : 'circle'; action(null, ctx => ctx.setLine(id, { [k]:!l[k] })); refocus(); return; }
      if(e.key === 'Delete' || e.key === 'Backspace'){ e.preventDefault(); eraseLine(id); return; }
      if(e.key === 'Enter'){ e.preventDefault(); const tx = row.querySelector('.dk-txt, .dk-st'); if(tx) startEdit(tx, id); return; }
      if(e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')){ e.preventDefault(); nudge(id, e.key === 'ArrowUp' ? -1 : 1); return; }
      if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); const rows = [...document.querySelectorAll('#dkWrap .dk-page:not(.dk-out) [data-dkid]')]; const n = rows[rows.indexOf(row) + (e.key === 'ArrowDown' ? 1 : -1)]; if(n) n.focus(); return; }
    }
    if(e.metaKey || e.ctrlKey || e.altKey) return;
    if(e.key === 'n' || e.key === 'N'){ const j = $('#dkJot'); if(j){ e.preventDefault(); j.focus(); } return; }
    if((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && DK.view === 'day') flipTo(e.key === 'ArrowLeft' ? prevBiz(DK.day) : nextBiz(DK.day));
  }

  /* ---------------------------------------------- drag and drop ---------------------------------------------- */
  let drag = null, swipe = null;
  function clearOver(){ document.querySelectorAll('#dkWrap .dk-over').forEach(x => x.classList.remove('dk-over')); const ph = $('#dkWrap .dk-ph'); if(ph) ph.remove(); const tp = $('.dk-droptip'); if(tp) tp.remove(); }
  function tip(text, x, y){ let t = $('.dk-droptip'); if(!t){ t = document.createElement('div'); t.className = 'dk-droptip'; document.body.appendChild(t); } t.textContent = text; t.style.left = Math.min(innerWidth - 270, x + 16) + 'px'; t.style.top = (y + 18) + 'px'; }
  function onDown(e){
    if(e.button !== 0 || !e.target.closest('#dkWrap')) return;
    if(narrow() && e.pointerType === 'touch' && e.target.closest('.dk-page') && !e.target.closest('.dk-grip, button, input, [contenteditable="true"]')) swipe = { x:e.clientX, y:e.clientY };
    const padEl = e.target.closest('.dk-pad');
    if(padEl && !narrow()){ drag = { kind:'pad', c:padEl.dataset.c, x0:e.clientX, y0:e.clientY, started:false }; return; }
    const el = e.target.closest('[data-dkdrag]'); if(!el) return;
    if(e.target.closest('button, input, .dk-tools') || e.target.isContentEditable) return;
    if(e.pointerType === 'touch' && el.dataset.dkdrag === 'line' && !e.target.closest('.dk-grip, .dk-slip')) return;
    if(el.dataset.dkdrag === 'sticky' && narrow()) return;
    drag = { el, kind:el.dataset.dkdrag, x0:e.clientX, y0:e.clientY, started:false };
    if(drag.kind === 'sticky'){ drag.sid = el.dataset.sid; drag.l0 = parseFloat(el.style.left) || 0; drag.t0 = parseFloat(el.style.top) || 0; }
    else drag.id = el.dataset.dkid;
  }
  function onMove(e){
    if(!drag) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if(!drag.started){
      if(Math.hypot(dx, dy) < 6) return;
      drag.started = true; document.body.classList.add('dk-dragging'); closeMenu();
      if(drag.kind === 'pad'){
        const g = geom(); if(!g){ drag = null; document.body.classList.remove('dk-dragging'); return; }
        const s = newSticky(drag.c, null, { left:e.clientX - g.mr.left - 75, top:e.clientY - g.mr.top - 20 });
        const el = $('[data-sid="' + s.id + '"]'); if(!el){ drag = null; document.body.classList.remove('dk-dragging'); return; }
        Object.assign(drag, { kind:'sticky', el, sid:s.id, l0:parseFloat(el.style.left) || 0, t0:parseFloat(el.style.top) || 0, x0:e.clientX, y0:e.clientY, newSticky:true });
        el.classList.add('dk-dragging'); el.style.pointerEvents = 'none'; return;
      }
      if(drag.kind === 'sticky'){ const z = 1 + DK.stickies.reduce((m, s) => Math.max(m, s.z || 1), 1); drag.z = z; drag.el.style.zIndex = z; drag.el.classList.add('dk-dragging'); drag.el.style.pointerEvents = 'none'; }
      else { const g = document.createElement('div'); g.className = 'dk-ghostdrag'; g.textContent = (drag.el.querySelector('.dk-txt, .dk-st') || drag.el).textContent; document.body.appendChild(g); drag.ghost = g; drag.el.classList.add('dk-lifting'); }
    }
    e.preventDefault();
    if(drag.kind === 'sticky'){ drag.el.style.left = (drag.l0 + dx) + 'px'; drag.el.style.top = (drag.t0 + dy) + 'px'; }
    else { drag.ghost.style.left = (e.clientX - 20) + 'px'; drag.ghost.style.top = (e.clientY - 16) + 'px'; }
    clearOver();
    const under = document.elementFromPoint(e.clientX, e.clientY);
    let tgt = under && under.closest('#dkWrap [data-dkdrop]');
    if(tgt && (tgt === drag.el || tgt.closest('.dk-out'))) tgt = null;
    drag.target = null; drag.targetEl = tgt;
    if(!tgt || !tgt.classList.contains('dk-peek')){ clearTimeout(drag.spring); drag.springDay = null; }
    if(!tgt) return;
    const kind = tgt.dataset.dkdrop;
    if(drag.kind === 'sticky'){
      const sk = stickById(drag.sid) || {};
      if(kind === 'list' && !drag.newSticky && !ro() && !sk.from_person_id){ tgt.classList.add('dk-over'); tip('Let go to write this onto the page', e.clientX, e.clientY); drag.target = { type:'list', day:tgt.dataset.day }; }
      else if(kind === 'erase' && !ro()){ tgt.classList.add('dk-over'); drag.target = { type:'erase' }; tip('Erase', e.clientX, e.clientY); }
      return;
    }
    if(kind === 'list'){
      const rows = [...tgt.querySelectorAll(':scope > .dk-row')];
      let before = null; for(const r of rows){ const rr = r.getBoundingClientRect(); if(e.clientY < rr.top + rr.height / 2){ before = r; break; } }
      const ph = document.createElement('li'); ph.className = 'dk-ph';
      if(before) tgt.insertBefore(ph, before); else { const j = tgt.querySelector('.dk-jot'); if(j) tgt.insertBefore(ph, j); else tgt.appendChild(ph); }
      drag.target = { place:'day', day:tgt.dataset.day, index:before ? Number(before.dataset.idx) : inPlace(DK.lines, 'day', tgt.dataset.day).length };
    } else if(kind === 'day'){
      tgt.classList.add('dk-over'); const d = tgt.dataset.dayto; drag.target = { place:'day', day:d };
      if(!tgt.classList.contains('dk-peek')){ tip('Move to ' + (d === T() ? 'today' : fmtShort(d)), e.clientX, e.clientY); return; }
      tip('Drop it on ' + dowName(d) + ', or hold to open the page', e.clientX, e.clientY);
      if(drag.springDay !== d){ clearTimeout(drag.spring); drag.springDay = d; drag.spring = setTimeout(() => { if(drag && drag.springDay === d){ flipTo(d); drag.springDay = null; drag.target = null; clearOver(); } }, 800); }
    }
    else if(kind === 'tray'){ tgt.classList.add('dk-over'); drag.target = { place:'tray' }; tip('Into the Stand-Up tray', e.clientX, e.clientY); }
    else if(kind === 'later'){ const f = tgt.closest('.dk-pocket'); (f ? f.querySelector('.dk-folder') : tgt).classList.add('dk-over'); drag.target = { place:'later' }; tip('Into the Later folder', e.clientX, e.clientY); }
    else if(kind === 'sticky'){ tgt.classList.add('dk-over'); drag.target = { type:'sticky', sid:tgt.dataset.sid }; tip('Add it to this sticky', e.clientX, e.clientY); }
    else if(kind === 'erase'){ tgt.classList.add('dk-over'); drag.target = { type:'erase' }; tip('Erase', e.clientX, e.clientY); }
  }
  function flyGhost(ghost, el, then){
    if(!ghost || !el || !document.body.contains(el) || reduced()){ if(ghost) ghost.remove(); then(); return; }
    const r = el.getBoundingClientRect();
    ghost.classList.add('dk-fly'); ghost.style.left = (r.left + r.width / 2 - 60) + 'px'; ghost.style.top = (r.top + Math.min(40, r.height / 2)) + 'px';
    ghost.style.transform = 'rotate(6deg) scale(.35)'; ghost.style.opacity = '.2';
    setTimeout(() => { ghost.remove(); then(); }, 240);
  }
  function lineToSticky(id, sid){
    const l = lineById(id), s = stickById(sid); if(!l || !s) return;
    const block = l.place === 'day' || l.place === 'later' ? blockOf(inPlace(DK.lines, l.place, l.day), id) : [l];
    action('Added to the sticky note', ctx => {
      ctx.setStick(sid, { body:((s.body ? s.body + '\n' : '') + block.map(b => b.body).join('\n')).slice(0, 600) });
      const now = new Date().toISOString(); block.forEach(b => ctx.setLine(b.id, { erased_at:now }));
    });
  }
  function onUp(e){
    if(swipe && e){ const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null; if(Math.abs(dx) > 70 && Math.abs(dy) < 50 && !(drag && drag.started)){ drag = null; flipTo(dx < 0 ? nextBiz(DK.day) : prevBiz(DK.day)); return; } }
    if(!drag) return;
    const d = drag; drag = null; clearTimeout(d.spring);
    document.body.classList.remove('dk-dragging');
    if(!d.started) return;
    justDragged = true; setTimeout(() => { justDragged = false; }, 60);
    clearOver();
    if(d.kind === 'sticky'){
      const s = stickById(d.sid); if(!s) return;
      d.el.classList.remove('dk-dragging'); d.el.style.pointerEvents = '';
      const t = d.target;
      if(t && t.type === 'list' && s.body.trim()){
        const lines = s.body.split('\n').map(x => x.trim()).filter(Boolean);
        action(lines.length + ' line' + (lines.length > 1 ? 's' : '') + ' written onto the page', ctx => {
          let arr = inPlace(DK.lines, 'day', t.day);
          lines.forEach(x => { ctx.addLine({ place:'day', day:t.day, origin_day:t.day, pos:(arr.length ? arr[arr.length - 1].pos : 0) + 1, kind:'todo', body:x.slice(0, 1000), time_text:parseTime(x) }); arr = inPlace(DK.lines, 'day', t.day); });
          ctx.setStick(s.id, { erased_at:new Date().toISOString() });
        });
      } else if(t && t.type === 'erase'){
        action('Sticky erased', ctx => ctx.setStick(s.id, { erased_at:new Date().toISOString() }));
      } else {
        const g = geom(); if(g){ const p = pxToPos(parseFloat(d.el.style.left), parseFloat(d.el.style.top), g); action(null, ctx => ctx.setStick(s.id, Object.assign(p, d.z ? { z:d.z } : {}))); }
        if(d.newSticky) editNew(s);
      }
      return;
    }
    if(d.el) d.el.classList.remove('dk-lifting');
    const t = d.target;
    if(!t){ if(d.ghost) d.ghost.remove(); render(); return; }
    const l = lineById(d.id);
    if(t.place === 'day' && l && l.place === 'day' && l.day === t.day && t.index != null){ if(d.ghost) d.ghost.remove(); moveLine(d.id, t, true); return; }
    flyGhost(d.ghost, d.targetEl, () => { if(t.type === 'erase') eraseLine(d.id); else if(t.type === 'sticky') lineToSticky(d.id, t.sid); else moveLine(d.id, t); });
  }
  function onCancel(){ swipe = null; if(drag){ clearTimeout(drag.spring); if(drag.ghost) drag.ghost.remove(); drag = null; document.body.classList.remove('dk-dragging'); clearOver(); render(); } }

  /* ---------------------------------------------- who sees it (ops_settings.desk_access) ---------------------------------------------- */
  /* "Has a desk": a Hub role of Owner/Admin, Care Coordinator or Staffing Coordinator, or a Team job title saying so.
     The database is the real gate (Desktop 463); this only decides whether to show the tab. */
  function hasDesk(email){
    const e = lc(email);
    try{ const roles = (typeof CC_ROLE_BY_EMAIL !== 'undefined' && CC_ROLE_BY_EMAIL[e]) || []; if(roles.some(r => ['owner_admin','care_coordinator','staffing_coordinator'].includes(r))) return true; }catch(x){}
    try{ const prof = (DATA.role_profiles || []).find(p => lc(p.id || p.person || p.email) === e); if(prof && /coordinator|owner/i.test(prof.title || '')) return true; }catch(x){}
    return false;
  }
  function dkAllowed(){ try{ return access(DATA.ops_settings, myEmail(), hasDesk(myEmail())); }catch(e){ return false; } }
  function dkPill(){
    const pill = $('#fsub-today [data-tab="mydesk"]'); if(!pill) return;
    pill.style.display = dkAllowed() ? '' : 'none';
    if(dkAllowed() && !DK.warm) setTimeout(() => dkWarm(), 1500);
  }

  /* ---------------------------------------------- Settings: My Desk ---------------------------------------------- */
  function dkSetFill(){
    const box = $('#dkSet'); if(!box) return;
    const a = (DATA.ops_settings && DATA.ops_settings.desk_access) || { mode:'off', people:[] };
    let ppl = []; try{ ppl = (roleEveryone() || []).map(p => ({ email:lc(p.email), name:p.name || p.email })).filter(p => p.email); }catch(e){}
    const on = new Set((a.people || []).map(lc));
    box.innerHTML = '<div style="display:flex;flex-direction:column;gap:6px;margin:6px 0 10px;">'
      + [['off','Nobody yet'],['some','Only the people ticked below (trying it)'],['everyone','Everyone with a desk (Owners, Care Coordinators, Staffing Coordinators)']]
          .map(([v, t]) => '<label style="display:flex;gap:8px;align-items:center;font-size:13.5px;"><input type="radio" name="dkMode" value="' + v + '"' + (a.mode === v ? ' checked' : '') + '> ' + t + '</label>').join('')
      + '</div><div id="dkPeople" style="display:flex;flex-wrap:wrap;gap:6px 14px;margin:0 0 10px 22px;">'
      + ppl.map(p => '<label style="display:flex;gap:6px;align-items:center;font-size:13px;"><input type="checkbox" value="' + esc(p.email) + '"' + (on.has(p.email) ? ' checked' : '') + '> ' + esc(p.name) + (hasDesk(p.email) ? '' : ' <span class="field-note">(no desk role or title)</span>') + '</label>').join('')
      + '</div><div style="display:flex;gap:8px;align-items:center;"><button class="secondary" onclick="dkSetSave(this)">Save</button><span class="field-note" id="dkSetSaved"></span></div>';
  }
  async function dkSetSave(btn){
    const mode = (document.querySelector('input[name="dkMode"]:checked') || {}).value || 'off';
    const people = [...document.querySelectorAll('#dkPeople input:checked')].map(i => lc(i.value));
    const saved = $('#dkSetSaved'); if(btn) btn.disabled = true;
    const what = mode === 'off' ? 'My Desk off' : mode === 'everyone' ? 'My Desk on for everyone with a desk' : 'My Desk for ' + people.length + ' people';
    const out = typeof tkMerge === 'function' ? await tkMerge(m => { const before = JSON.stringify(m.desk_access || null);
        m.desk_access = { mode, people, set_by:myName(), set_at:new Date().toISOString() };
        return before === JSON.stringify({ mode, people }) ? [] : [what]; }, 'My Desk') : { error:{ message:'the settings save is not on this page' } };
    if(btn) btn.disabled = false;
    if(out.error){ if(saved) saved.textContent = 'Could not save: ' + out.error.message; return; }
    DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { desk_access:{ mode, people } });
    if(saved) saved.textContent = 'Saved · ' + what; dkPill();
  }

  /* ---------------------------------------------- open ---------------------------------------------- */
  function dkOpen(){
    ensureAssets(); if(!DK.day) DK.day = T();
    render();
    if(!dkAllowed()) return;   /* not switched on for this person: read nothing */
    load(true);
    clearInterval(DK.timer);
    DK.timer = setInterval(() => { if(typeof activeTab !== 'undefined' && activeTab === 'mydesk' && !document.hidden) load(false); else clearInterval(DK.timer); }, 60000);
  }
  let wired = false;
  function ensureAssets(){
    if(wired) return; wired = true;
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove, { passive:false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    let rz = null; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if($('#dkRoot')) placeStickies(); }, 120); });
    try{ const f = document.createElement('link'); f.rel = 'stylesheet'; f.href = 'https://fonts.googleapis.com/css2?family=Gochi+Hand&family=Homemade+Apple&family=Patrick+Hand&family=Young+Serif&display=swap'; document.head.appendChild(f);
      if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => placeStickies()); }catch(e){}
    const st = document.createElement('style'); st.id = 'dkStyle'; st.textContent = CSS; document.head.appendChild(st);
    const sp = document.createElement('div'); sp.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'; sp.setAttribute('aria-hidden', 'true'); sp.innerHTML = SPRITE; document.body.appendChild(sp);
  }

  const SPRITE = '<svg xmlns="http://www.w3.org/2000/svg"><defs>'
    + '<symbol id="dk-next" viewBox="0 0 24 24"><path d="M4 12.5c4-.3 9.5-.4 15-.2M14 7l5.2 5.3L14 17.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>'
    + '<symbol id="dk-prev" viewBox="0 0 24 24"><path d="M20 12.5c-4-.3-9.5-.4-15-.2M10 7l-5.2 5.3L10 17.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>'
    + '<symbol id="dk-up" viewBox="0 0 24 24"><path d="M12 20V5M6.8 10L12 4.8 17.2 10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>'
    + '<symbol id="dk-down" viewBox="0 0 24 24"><path d="M12 4v15M6.8 14L12 19.2 17.2 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>'
    + '<symbol id="dk-later" viewBox="0 0 24 24"><path d="M3 7.5h7l2 2h9v10H3z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></symbol>'
    + '<symbol id="dk-dots" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.9" fill="currentColor"/><circle cx="12" cy="12" r="1.9" fill="currentColor"/><circle cx="19" cy="12" r="1.9" fill="currentColor"/></symbol>'
    + '<symbol id="dk-clip" viewBox="0 0 24 24"><path d="M15.5 7.5v8.2a3.5 3.5 0 0 1-7 0V5.8a2.4 2.4 0 0 1 4.8 0v9.4a1.2 1.2 0 0 1-2.4 0V8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>'
    + '<symbol id="dk-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></symbol>'
    + '<symbol id="dk-erase" viewBox="0 0 24 24"><path d="M4 16.5l8.6-9.4 6.3 5.8-6 6.6H8.2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 11.5l6.2 5.7M13 19.5h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>'
    + '<symbol id="dk-pencil" viewBox="0 0 24 24"><path d="M4.5 19.5l1.2-4.6L16 4.6l3.4 3.4L9.1 18.3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 6.6l3.4 3.4" stroke="currentColor" stroke-width="1.8"/></symbol>'
    + '<symbol id="dk-box" viewBox="0 0 24 24"><path d="M4 5.2C8 4.6 15 4.4 20.2 5c.4 4 .3 10-.2 14.6-5 .7-11 .6-15.7.2C3.8 15 3.9 9.5 4 5.2z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></symbol>'
    + '<symbol id="dk-check" viewBox="0 0 24 24"><path d="M5 12.8l4.2 4.4L19.5 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></symbol>'
    + '<symbol id="dk-day" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>'
    + '<symbol id="dk-grip" viewBox="0 0 24 24"><g fill="currentColor"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></g></symbol>'
    + '<symbol id="dk-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></symbol>'
    + '<symbol id="dk-leaf" viewBox="0 0 40 40"><path d="M20 4l3 7 6-3-2 7 7 1-5 5 4 4-7 1 1 7-7-4-3 6-1-7-6 2 2-6-7-2 6-4-3-6 7 1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M20 12v26" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>'
    + '<symbol id="dk-tray" viewBox="0 0 24 24"><path d="M3 12l2.2 7.5h13.6L21 12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M7.5 12V5.5h9V12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M3 12h18" stroke="currentColor" stroke-width="1.9"/></symbol>'
    + '<symbol id="dk-gstar" viewBox="0 0 24 24"><path d="M12 2.8l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.7 6.4 19.8l1.3-6.2L3 9.3l6.3-.7z" fill="#F0A63A" stroke="#9C6410" stroke-width="1.1" stroke-linejoin="round"/></symbol>'
    + '<symbol id="dk-steps" viewBox="0 0 24 24"><path d="M7 17.5c-1.6 0-2.4-1.4-2.2-3.4.3-2.6 1.4-4.6 2.9-4.4 1.4.2 1.7 2.4 1.3 4.6-.3 1.9-.8 3.2-2 3.2zM16.4 12.6c-1.2 0-1.9-1.1-1.7-2.7.2-2 1.1-3.6 2.3-3.4 1.1.2 1.3 1.9 1 3.6-.2 1.5-.6 2.5-1.6 2.5z" fill="currentColor"/></symbol>'
    + '<symbol id="dk-hstar" viewBox="0 0 24 24"><path d="M12.3 3.2c.9 2.2 1.7 4.1 2.6 6 2.2.1 4.4.2 6.4.5-1.7 1.4-3.3 2.8-4.9 4.3.5 2.1 1 4.1 1.4 6.2-1.9-1.2-3.7-2.3-5.6-3.3-1.9 1.1-3.8 2.2-5.6 3.4.5-2.1 1-4.2 1.6-6.3C6.6 12.6 5 11.2 3.3 9.8c2.1-.3 4.2-.4 6.4-.5.8-2.1 1.7-4 2.6-6.1z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></symbol>'
    + '<symbol id="dk-circle" viewBox="0 0 24 24"><path d="M5 9c3-5 14-5 15 1 1 6-9 9-14 6-3-2-2-6 1-8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>'
    + '<symbol id="dk-heart" viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 17.5c-3-1.9-4.3-3.4-4.3-4.8 0-1.2.9-2 1.9-2s1.7.6 2.4 1.4c.7-.8 1.4-1.4 2.4-1.4s1.9.8 1.9 2c0 1.4-1.3 2.9-4.3 4.8z" fill="currentColor"/></symbol>'
    + '<symbol id="dk-st-house" viewBox="0 0 120 120"><circle cx="60" cy="60" r="55" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" stroke-width="2"/><path id="dk-ring1" d="M60 60 m-46 0 a46 46 0 1 1 92 0 a46 46 0 1 1 -92 0" fill="none"/><text font-family="system-ui, sans-serif" font-weight="800" font-size="11" letter-spacing="2.4" fill="currentColor"><textPath href="#dk-ring1" startOffset="2%">GOOD DAY\'S WORK ✦ CARING COMPANIONS ✦</textPath></text><path d="M40 60l20-17 20 17v20H40z" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/><path d="M60 75c-7-4.5-10-8-10-11.3 0-2.8 2.1-4.6 4.5-4.6 2.3 0 4 1.3 5.5 3.3 1.5-2 3.2-3.3 5.5-3.3 2.4 0 4.5 1.8 4.5 4.6 0 3.3-3 6.8-10 11.3z" fill="currentColor"/></symbol>'
    + '<symbol id="dk-st-sun" viewBox="0 0 120 120"><circle cx="60" cy="60" r="55" fill="none" stroke="currentColor" stroke-width="4"/><path id="dk-ring2" d="M60 60 m-46 0 a46 46 0 1 1 92 0 a46 46 0 1 1 -92 0" fill="none"/><text font-family="system-ui, sans-serif" font-weight="800" font-size="11" letter-spacing="2.4" fill="currentColor"><textPath href="#dk-ring2" startOffset="2%">WELL DONE TODAY ✦ CARING COMPANIONS ✦</textPath></text><g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><circle cx="60" cy="60" r="11"/><path d="M60 34v8M60 78v8M34 60h8M78 60h8M42 42l6 6M72 72l6 6M78 42l-6 6M48 72l-6 6"/></g></symbol>'
    + '<symbol id="dk-st-cup" viewBox="0 0 120 120"><circle cx="60" cy="60" r="55" fill="none" stroke="currentColor" stroke-width="4"/><path id="dk-ring3" d="M60 60 m-46 0 a46 46 0 1 1 92 0 a46 46 0 1 1 -92 0" fill="none"/><text font-family="system-ui, sans-serif" font-weight="800" font-size="11" letter-spacing="2.4" fill="currentColor"><textPath href="#dk-ring3" startOffset="2%">PUT THE KETTLE ON ✦ ALL DONE ✦ </textPath></text><g fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M40 56h34v6c0 9-7.6 16-17 16s-17-7-17-16z"/><path d="M74 59h4a5 5 0 0 1 0 10h-6"/><path d="M38 82h38"/><path d="M50 50c-2-3 2-5 0-8M58 50c-2-3 2-5 0-8M66 50c-2-3 2-5 0-8"/></g></symbol>'
    + '</defs></svg>';

  const CSS = `
.dk{ --paper:#fffdf6; --paper-2:#f6f0e1; --paper-edge:#e6dcc4; --rule:#cfe1e8; --margin:#f3b9a4; --ink:#0D365F; --pencil:#6f7681; --faint:#a8acb2;
  --dk-teal:#1F7A8C; --teal-pale:#EAF4F6; --honey:#F0A63A; --honey-deep:#C17A12; --honey-pale:#ffe4ac; --mat:#1d6f7d; --mat-2:#175e6a;
  --s-yellow:#fde68a; --s-pink:#f8c5d2; --s-blue:#bde2ee; --s-green:#cde8c2; --manila:#e3c48d; --manila-2:#d5b077; --shadow:rgba(40,25,10,.30);
  --hand:'Patrick Hand','Comic Sans MS',cursive; --sticky-font:'Gochi Hand','Patrick Hand',cursive; --print:'Young Serif',Georgia,serif; --lh:34px;
  --strike:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='8' viewBox='0 0 100 8' preserveAspectRatio='none'><path d='M0 4.6 C20 3.2 38 4.8 55 3.9 S85 3.1 100 3.6' stroke='%230D365F' stroke-width='1.9' fill='none' stroke-linecap='round'/></svg>");
  font-size:14px; color:#16283a; }
.dk *{ box-sizing:border-box; }
.dk button{ font:inherit; color:inherit; cursor:pointer; }
.dk-mat{ position:relative; border-radius:20px; padding:30px 26px 40px; margin:4px 0 20px;
  background:radial-gradient(circle at 22% 12%, rgba(255,255,255,.07), transparent 42%), repeating-radial-gradient(circle at 30% 40%, rgba(255,255,255,.025) 0 1px, transparent 1px 3px), linear-gradient(160deg, var(--mat), var(--mat-2));
  box-shadow:0 2px 0 rgba(255,255,255,.12) inset, 0 18px 40px -18px var(--shadow); }
.dk-mat::before{ content:""; position:absolute; inset:9px; border:1.5px dashed rgba(255,255,255,.28); border-radius:14px; pointer-events:none; }
.dk-msg{ position:relative; color:#fff; font-size:14.5px; padding:26px 10px; text-align:center; }
.dk-grid{ display:grid; grid-template-columns:minmax(150px,210px) minmax(0,620px) minmax(150px,210px); gap:28px; justify-content:center; align-items:start; }
.dk-rail{ display:flex; flex-direction:column; gap:24px; position:relative; z-index:1; min-width:0; }
.dk-zone{ height:250px; } .dk-zr{ height:120px; }
.dk-planner{ position:relative; z-index:2; min-width:0; }
.dk-page{ position:relative; z-index:1; background:var(--paper); border-radius:5px 5px 12px 12px; padding:22px 24px 30px 70px; min-height:620px;
  box-shadow:0 1px 0 var(--paper-edge), 0 2px 0 var(--paper-2), 0 3px 0 var(--paper-edge), 0 5px 0 var(--paper-2), 0 6px 0 var(--paper-edge), 0 22px 34px -16px var(--shadow); }
.dk-page::before{ content:""; position:absolute; left:54px; top:0; bottom:0; width:2px; background:var(--margin); opacity:.75; }
.dk-turn-next{ animation:dkInN .5s cubic-bezier(.3,.7,.2,1); } .dk-turn-prev{ animation:dkInP .5s cubic-bezier(.3,.7,.2,1); }
@keyframes dkInN{ from{ transform:translateX(17px) rotate(1.3deg) scale(.985); filter:brightness(.96); } }
@keyframes dkInP{ from{ transform:translateX(-17px) rotate(-1.3deg) scale(.985); filter:brightness(.96); } }
.dk-page.dk-out{ position:absolute; left:0; top:0; width:100%; z-index:0; pointer-events:none; }
.dk-out-next{ animation:dkOutN .5s cubic-bezier(.3,.7,.2,1) forwards; } .dk-out-prev{ animation:dkOutP .5s cubic-bezier(.3,.7,.2,1) forwards; }
@keyframes dkOutN{ to{ transform:translateX(-17px) rotate(-1.3deg) scale(.985); opacity:0; } }
@keyframes dkOutP{ to{ transform:translateX(17px) rotate(1.3deg) scale(.985); opacity:0; } }
.dk-rings{ position:absolute; top:-11px; left:30px; right:30px; display:flex; justify-content:space-between; pointer-events:none; z-index:2; }
.dk-rings i{ width:9px; height:22px; border-radius:6px; background:linear-gradient(90deg,#8d96a0,#e6eaee 45%,#8d96a0); box-shadow:0 1px 1px rgba(0,0,0,.3); }
.dk-peek{ position:absolute; top:12px; bottom:-4px; width:100%; background:var(--paper-2); border-radius:5px 5px 12px 12px; z-index:-1; box-shadow:0 14px 26px -16px var(--shadow); border:0; padding:0; transition:transform .22s cubic-bezier(.3,.7,.2,1), background .2s; }
.dk-peek.dk-prev{ left:0; transform:translateX(-18px) rotate(-1.3deg); } .dk-peek.dk-next{ right:0; transform:translateX(18px) rotate(1.3deg); }
.dk-pl{ position:absolute; top:24px; font-size:11px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:var(--pencil); writing-mode:vertical-rl; }
.dk-prev .dk-pl{ left:1px; transform:rotate(180deg); } .dk-next .dk-pl{ right:1px; }
.dk-peek:hover{ background:var(--paper); }
.dk-peek.dk-prev:hover{ transform:translateX(-24px) rotate(-1.8deg); } .dk-peek.dk-next:hover{ transform:translateX(24px) rotate(1.8deg); }
body.dk-dragging .dk-peek.dk-prev{ transform:translateX(-28px) rotate(-2deg); } body.dk-dragging .dk-peek.dk-next{ transform:translateX(28px) rotate(2deg); }
.dk-peek.dk-over{ background:var(--honey-pale); }
.dk-peek.dk-prev.dk-over{ transform:translateX(-36px) rotate(-2.6deg); } .dk-peek.dk-next.dk-over{ transform:translateX(36px) rotate(2.6deg); }
.dk-next.dk-receive{ animation:dkRN .55s ease-out; } .dk-prev.dk-receive{ animation:dkRP .55s ease-out; }
@keyframes dkRN{ 40%{ transform:translateX(30px) rotate(2.4deg); background:var(--honey-pale); } }
@keyframes dkRP{ 40%{ transform:translateX(-30px) rotate(-2.4deg); background:var(--honey-pale); } }
.dk-plus1{ position:absolute; top:60px; font-family:var(--hand); font-size:18px; color:var(--honey-deep); animation:dkPlus 1.2s ease-out forwards; }
.dk-next .dk-plus1{ right:-2px; } .dk-prev .dk-plus1{ left:-2px; }
@keyframes dkPlus{ from{ opacity:0; transform:translateY(8px); } 20%{ opacity:1; } to{ opacity:0; transform:translateY(-16px); } }
.dk-ptabs{ position:absolute; right:-31px; top:150px; display:flex; flex-direction:column; gap:6px; z-index:-1; }
body.dk-dragging .dk-ptabs{ pointer-events:none; }
.dk-ptab{ writing-mode:vertical-rl; border:0; border-radius:0 9px 9px 0; padding:12px 6px 12px 7px; font-weight:700; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#0D365F; background:var(--c); box-shadow:2px 3px 6px -3px var(--shadow); transition:transform .15s; }
.dk-ptab:hover, .dk-ptab.dk-over{ transform:translateX(4px); }
.dk-head{ display:flex; align-items:flex-start; gap:10px; margin-bottom:8px; position:relative; }
.dk-dow{ font-size:11px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; color:var(--honey-deep); }
.dk-date{ font-family:var(--print); font-weight:400; font-size:31px; line-height:1.1; color:#0D365F; margin:2px 0 3px; }
.dk-motto{ font-family:var(--print); font-style:italic; font-size:13.5px; color:var(--pencil); }
.dk-sp{ flex:1; }
.dk-nav{ display:flex; gap:4px; align-items:center; }
.dk-round{ width:32px; height:32px; border-radius:50%; border:1px solid var(--paper-edge); background:var(--paper); color:#0D365F; display:grid; place-items:center; padding:0; }
.dk-round:hover{ background:var(--teal-pale); } .dk-round svg{ width:16px; height:16px; }
.dk-back{ font-size:12px; font-weight:700; border:0; background:var(--honey-pale); color:#5c3d00; border-radius:20px; padding:5px 11px; }
.dk-doodle{ position:absolute; left:-58px; top:6px; width:34px; height:34px; color:var(--honey-deep); opacity:.7; transform:rotate(-14deg); }
.dk-left{ display:flex; flex-wrap:wrap; align-items:center; gap:8px 10px; margin:6px 0 8px; padding:7px 12px; background:var(--honey-pale); border-radius:3px; font-size:13px; font-weight:600; color:#4d3500; transform:rotate(-.4deg); position:relative; }
.dk-lbtn{ border:0; border-radius:16px; padding:3px 11px; font-size:12px; font-weight:700; background:#0D365F; color:#fff !important; }
.dk-lbtn.dk-ghosty{ background:transparent; color:#4d3500 !important; text-decoration:underline; }
.dk-lbtn.dk-x{ background:transparent; color:#4d3500 !important; padding:2px 6px; } .dk-lbtn svg{ width:12px; height:12px; }
.dk-list{ list-style:none; margin:0; padding:0; font-family:var(--hand); font-size:21px; color:var(--ink);
  background:repeating-linear-gradient(to bottom, transparent 0 calc(var(--lh) - 1px), var(--rule) calc(var(--lh) - 1px) var(--lh)); min-height:calc(var(--lh) * 12); }
.dk-row{ position:relative; display:flex; align-items:flex-start; gap:9px; line-height:var(--lh); min-height:var(--lh); padding-right:4px; border-radius:3px; margin:0; }
.dk-row:focus{ outline:none; background:rgba(31,122,140,.07); } .dk-row:focus-visible{ box-shadow:inset 0 0 0 2px var(--honey); }
.dk-row.dk-lifting{ opacity:.25; }
.dk-cb{ flex:none; width:26px; height:var(--lh); border:0; background:transparent; padding:0; display:grid; place-items:center; color:var(--ink); }
.dk-cb svg{ width:22px; height:22px; overflow:visible; }
.dk-tick{ fill:none; stroke:var(--dk-teal); stroke-width:2.8; stroke-linecap:round; stroke-linejoin:round; stroke-dasharray:32; stroke-dashoffset:32; transition:stroke-dashoffset .3s ease-out; }
.dk-done .dk-tick{ stroke-dashoffset:0; } .dk-cb:hover{ color:var(--dk-teal); }
.dk-tw{ position:relative; min-width:0; transform:translateX(var(--jx,0)) rotate(var(--jr,0deg)); transform-origin:left center; }
.dk-txt{ overflow-wrap:anywhere; cursor:text; padding:0 2px; -webkit-box-decoration-break:clone; box-decoration-break:clone; background:var(--strike) no-repeat 0 58% / 0% 7px; transition:background-size .42s ease-out .08s, opacity .3s; }
.dk-done .dk-txt{ background-size:100% 7px; opacity:.55; }
.dk-txt[contenteditable="true"], .dk-st[contenteditable="true"]{ outline:none; background-color:rgba(240,166,58,.16); border-radius:3px; }
.dk-chips{ display:inline-flex; flex-wrap:wrap; gap:6px; align-items:center; margin-left:4px; vertical-align:2px; }
.dk-chip{ display:inline-flex; align-items:center; gap:3px; font-family:system-ui,-apple-system,'Segoe UI',sans-serif; font-size:11.5px; font-weight:600; color:var(--pencil); line-height:1.2; padding:2px 7px; border-radius:10px; background:rgba(13,54,96,.05); white-space:nowrap; }
.dk-chip svg{ width:13px; height:13px; }
.dk-time{ background:rgba(240,166,58,.18); color:#7a4d06; }
.dk-carry{ background:transparent; padding:0 2px; color:var(--faint); } .dk-carry4{ color:var(--honey-deep); }
.dk-c4 .dk-marginclip{ position:absolute; left:-22px; top:-6px; width:16px; height:30px; color:#8d96a0; transform:rotate(-12deg); }
.dk-tools{ position:absolute; right:0; top:0; display:flex; gap:3px; opacity:0; pointer-events:none; transition:opacity .15s; padding:4px 0 4px 12px; background:linear-gradient(90deg, transparent, var(--paper) 12px); }
.dk-row:hover .dk-tools, .dk-row:focus-within .dk-tools, .dk-row:focus .dk-tools{ opacity:1; pointer-events:auto; }
.dk-tool{ height:26px; min-width:26px; padding:0 6px; border-radius:13px; border:1px solid var(--paper-edge); background:var(--paper); color:#0D365F !important; display:inline-flex; align-items:center; gap:3px; font-family:system-ui,-apple-system,'Segoe UI',sans-serif; font-size:11px; font-weight:700; }
.dk-tool svg{ width:14px; height:14px; } .dk-tool:hover{ background:var(--teal-pale); }
.dk-grip{ display:none; flex:none; width:22px; height:var(--lh); color:var(--faint); touch-action:none; align-items:center; justify-content:center; } .dk-grip svg{ width:14px; height:14px; }
.dk-note{ font-size:17.5px; color:var(--pencil); padding-left:35px; }
.dk-ghost{ color:var(--faint); font-size:17px; } .dk-gt{ padding-left:35px; } .dk-gt em{ font-style:normal; margin-left:6px; }
.dk-ph{ height:var(--lh); border-radius:4px; background:rgba(240,166,58,.22); outline:1.5px dashed var(--honey); outline-offset:-3px; list-style:none; }
.dk-jot{ display:flex; align-items:center; gap:9px; height:var(--lh); }
.dk-mode{ width:26px; height:var(--lh); border:0; background:transparent; padding:0; color:var(--faint); display:grid; place-items:center; flex:none; }
.dk-mode svg{ width:18px; height:18px; } .dk-mode:hover{ color:var(--dk-teal); }
.dk-jot input{ flex:1; min-width:0; border:0 !important; background:transparent !important; font-family:var(--hand); font-size:21px; color:var(--ink); padding:0 2px; height:calc(var(--lh) - 2px); box-shadow:none !important; margin:0; }
.dk-notemode input{ font-size:17.5px; color:var(--pencil); }
.dk-jot input::placeholder{ color:var(--faint); } .dk-jot input:focus{ outline:none; } .dk-jot input:focus::placeholder{ color:transparent; }
.dk-tip{ font-family:system-ui,-apple-system,'Segoe UI',sans-serif; font-size:11px; color:var(--faint); white-space:nowrap; opacity:0; transition:opacity .2s; }
.dk-jot input:focus ~ .dk-tip{ opacity:1; }
.dk-blank{ position:absolute; left:70px; right:60px; bottom:30px; height:110px; cursor:text; }
.dk-curl{ position:absolute; right:0; bottom:0; width:44px; height:44px; border:0; padding:0; border-radius:0 0 12px 0; z-index:2; background:linear-gradient(135deg, transparent 49%, var(--paper-edge) 50%, var(--paper-2) 70%); box-shadow:-3px -3px 6px -4px var(--shadow); transition:width .2s, height .2s; }
.dk-curl:hover{ width:62px; height:62px; }
.dk-stickies{ position:absolute; inset:0; pointer-events:none; z-index:5; }
.dk-sticky{ position:absolute; width:150px; min-height:132px; padding:20px 13px 28px; pointer-events:auto; color:#3a3222; font-family:var(--sticky-font); font-size:19px; line-height:1.18;
  background:var(--sc, var(--s-yellow)); transform:rotate(var(--r,0deg)); box-shadow:0 1px 1px rgba(0,0,0,.08), 0 10px 14px -10px var(--shadow);
  background-image:linear-gradient(180deg, rgba(0,0,0,.05) 0 16px, transparent 16px), linear-gradient(135deg, transparent 88%, rgba(0,0,0,.07) 88%); touch-action:none; user-select:none; transition:box-shadow .18s, transform .18s; }
.dk-sticky.dk-dragging{ transform:rotate(calc(var(--r,0deg) + 2.5deg)) scale(1.06) translateY(-4px); box-shadow:0 30px 34px -14px var(--shadow); transition:none; }
.dk-born{ animation:dkBorn .35s ease-out; } @keyframes dkBorn{ from{ transform:rotate(0) scale(.6); opacity:0; } }
.dk-c-yellow{ --sc:var(--s-yellow); } .dk-c-pink{ --sc:var(--s-pink); } .dk-c-blue{ --sc:var(--s-blue); } .dk-c-green{ --sc:var(--s-green); } .dk-c-honey{ --sc:var(--honey-pale); }
.dk-stt{ white-space:pre-wrap; overflow-wrap:anywhere; min-height:60px; cursor:grab; }
.dk-stt:empty::before{ content:'write here…'; color:rgba(58,50,34,.35); }
.dk-stt[contenteditable="true"]{ outline:none; cursor:text; user-select:text; }
.dk-sbtns{ position:absolute; left:8px; right:8px; bottom:5px; display:flex; gap:4px; opacity:0; transition:opacity .15s; }
.dk-sticky:hover .dk-sbtns, .dk-sticky:focus-within .dk-sbtns{ opacity:1; }
.dk-sbtn{ border:0; background:rgba(255,255,255,.55); border-radius:10px; font-family:system-ui,-apple-system,'Segoe UI',sans-serif; font-size:10.5px; font-weight:700; padding:2px 7px; color:#3a3222 !important; }
.dk-dot{ display:inline-block; width:10px; height:10px; border-radius:50%; vertical-align:-1px; background:var(--sc); border:1px solid rgba(0,0,0,.2); }
.dk-sticky.dk-over{ outline:3px dashed var(--honey-deep); outline-offset:3px; }
.dk-peel{ animation:dkPeel .35s ease-in forwards; } @keyframes dkPeel{ to{ transform:rotate(25deg) translate(40px,-30px) scale(.6); opacity:0; } }
.dk-pads{ display:flex; gap:4px; flex-wrap:wrap; }
.dk-padc{ display:flex; flex-direction:column; align-items:center; gap:6px; width:44px; }
.dk-pad{ width:38px; height:38px; border:0; border-radius:2px; background:var(--sc); transform:rotate(var(--r)); touch-action:none;
  box-shadow:1px 1px 0 rgba(0,0,0,.08), 2px 2px 0 var(--sc), 3px 3px 0 rgba(0,0,0,.08), 4px 4px 0 var(--sc), 5px 5px 0 rgba(0,0,0,.1), 6px 9px 10px -4px var(--shadow); transition:transform .15s; }
.dk-pad:hover{ transform:rotate(var(--r)) translateY(-3px); }
.dk-plabel{ font-family:var(--sticky-font); font-size:12.5px; line-height:1.05; color:rgba(255,255,255,.92); min-height:14px; min-width:36px; max-width:46px; overflow-wrap:anywhere; text-align:center; cursor:text; }
.dk-plabel:empty::before{ content:'label'; opacity:.35; } .dk-plabel[contenteditable="true"]{ outline:1px dashed rgba(255,255,255,.6); }
.dk-folder{ position:relative; height:150px; border:0; background:transparent; width:100%; padding:0; display:block; }
.dk-fb{ position:absolute; left:0; right:0; top:18px; bottom:0; background:var(--manila-2); border-radius:3px 8px 6px 6px; box-shadow:0 12px 16px -10px var(--shadow); }
.dk-ftab{ position:absolute; top:2px; left:0; width:46%; height:24px; background:var(--manila-2); border-radius:7px 7px 0 0; }
.dk-papers i{ position:absolute; left:12px; right:16px; height:96px; background:#fffdf6; border-radius:2px; box-shadow:0 -1px 2px rgba(0,0,0,.08); }
.dk-ff{ position:absolute; left:0; right:0; bottom:0; height:96px; background:linear-gradient(180deg, var(--manila), var(--manila-2)); border-radius:3px 3px 6px 6px; transform-origin:50% 100%; transition:transform .25s cubic-bezier(.3,.7,.2,1); display:flex; align-items:flex-start; padding:14px; z-index:2; }
.dk-folder:hover .dk-ff, .dk-folder.dk-over .dk-ff, .dk-folder.dk-open .dk-ff{ transform:perspective(500px) rotateX(-24deg); }
.dk-flabel{ background:#fffdf8; border-radius:2px; padding:5px 10px; box-shadow:0 1px 2px rgba(0,0,0,.15); transform:rotate(-1.5deg); text-align:left; }
.dk-flabel b{ display:block; font-size:10px; font-weight:800; letter-spacing:.16em; color:#5a3d12; } .dk-flabel span{ font-family:var(--hand); font-size:16px; color:var(--ink); }
.dk-later{ list-style:none; background:var(--paper); border-radius:3px; padding:6px 12px 10px; margin:-8px 0 0; box-shadow:0 12px 16px -12px var(--shadow); position:relative; z-index:3; }
.dk-slip{ font-family:var(--hand); font-size:17px; line-height:1.2; color:var(--ink); padding:7px 2px; border-bottom:1px solid var(--rule); display:flex; gap:6px; align-items:flex-start; touch-action:none; cursor:grab; }
.dk-slipnote{ font-size:15px; color:var(--pencil); padding-left:14px; } .dk-st{ flex:1; min-width:0; overflow-wrap:anywhere; }
.dk-slip.dk-lifting{ opacity:.3; } .dk-slip .dk-tool{ height:22px; min-width:22px; padding:0 4px; }
.dk-slip-empty{ font-size:12px; color:var(--pencil); padding:6px 0; }
.dk-bits{ display:flex; align-items:flex-end; gap:16px; flex-wrap:wrap; }
.dk-eraser{ border:0; width:92px; height:36px; border-radius:7px; background:linear-gradient(90deg,#f2b8c6 0 64%, #4f86b8 64% 100%); transform:rotate(-10deg); box-shadow:0 8px 10px -6px var(--shadow); color:#5a2232 !important; font-size:10.5px; font-weight:800; letter-spacing:.1em; padding:0 30px 0 0; transition:transform .15s; }
.dk-eraser.dk-over{ transform:rotate(-4deg) scale(1.12); }
.dk-help{ border:1px solid rgba(255,255,255,.45); background:transparent; color:#fff !important; border-radius:14px; padding:4px 11px; font-size:12px; font-weight:700; }
.dk-mug{ width:60px; height:74px; position:relative; } .dk-mug svg{ width:60px; height:74px; }
.dk-steam{ position:absolute; top:-6px; left:14px; width:30px; height:24px; }
.dk-steam i{ position:absolute; bottom:0; width:3px; height:18px; border-radius:3px; background:rgba(255,255,255,.55); animation:dkSteam 3.2s ease-in-out infinite; }
.dk-steam i:nth-child(2){ left:10px; animation-delay:.9s; } .dk-steam i:nth-child(3){ left:20px; animation-delay:1.7s; }
@keyframes dkSteam{ 0%{ transform:translateY(6px) scaleY(.6); opacity:0; } 40%{ opacity:.8; } 100%{ transform:translateY(-14px) translateX(4px) scaleY(1.1); opacity:0; } }
.dk-menu{ position:fixed; z-index:9990; background:#fffdf8; color:#16283a; border:1px solid #e4e1d8; border-radius:12px; padding:6px; min-width:240px; box-shadow:0 18px 40px -14px rgba(0,0,0,.45); }
.dk-menu button{ display:flex; width:100%; align-items:center; gap:9px; border:0; background:transparent; text-align:left; padding:7px 10px; border-radius:8px; font-size:13.5px; font-weight:600; color:#16283a; cursor:pointer; }
.dk-menu button:hover, .dk-menu button:focus-visible{ background:#EAF4F6; color:#0D365F; outline:none; }
.dk-menu svg{ width:16px; height:16px; flex:none; }
.dk-mh{ display:flex; gap:9px; align-items:center; padding:7px 10px 2px; font-size:13.5px; font-weight:600; color:#16283a; } .dk-mh svg{ width:16px; height:16px; }
.dk-days{ display:flex; flex-wrap:wrap; gap:5px; padding:2px 8px 8px 35px; }
.dk-days button{ width:auto; padding:4px 9px; border:1px solid #e4e1d8; font-size:12px; border-radius:14px; }
.dk-menu hr{ border:0; border-top:1px solid #e4e1d8; margin:4px 6px; }
.dk-k{ margin-left:auto; font-size:11px; color:#55677a; font-weight:700; border:1px solid #e4e1d8; border-radius:4px; padding:0 5px; }
.dk-toast{ position:fixed; left:50%; bottom:22px; transform:translateX(-50%); z-index:9991; background:#0D365F; color:#fff; border-radius:24px; padding:9px 10px 9px 18px; display:flex; gap:12px; align-items:center; font-size:13.5px; box-shadow:0 14px 30px -10px rgba(0,0,0,.5); max-width:calc(100vw - 32px); }
.dk-toast[hidden]{ display:none; }
.dk-toast button{ border:0; background:#E8C988; color:#2b1d00; border-radius:16px; padding:4px 12px; font-weight:800; font-size:12.5px; cursor:pointer; }
.dk-ghostdrag{ position:fixed; z-index:9992; pointer-events:none; background:#fffdf6; color:#0D365F; font-family:'Patrick Hand',cursive; font-size:20px; padding:4px 14px; border-radius:3px; box-shadow:0 18px 26px -10px rgba(0,0,0,.45); transform:rotate(-2.5deg); max-width:340px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; border-bottom:2px solid #cfe1e8; }
.dk-fly{ transition:left .24s ease-in, top .24s ease-in, transform .24s ease-in, opacity .24s ease-in; }
.dk-droptip{ position:fixed; z-index:9993; pointer-events:none; background:#0D365F; color:#fff; font-size:12px; font-weight:700; padding:4px 9px; border-radius:10px; }
body.dk-dragging, body.dk-dragging *{ cursor:grabbing !important; user-select:none; }
.dk-helpbox{ font-size:13.5px; line-height:1.5; }
.dk-keys{ display:grid; grid-template-columns:auto 1fr; gap:7px 14px; margin-top:10px; color:#3c4a58; }
.dk-keys kbd{ font-weight:700; font-size:12px; border:1px solid #e6dcc4; border-bottom-width:2px; border-radius:5px; padding:1px 7px; background:#fff; color:#0D365F; justify-self:start; white-space:nowrap; font-family:inherit; }
.dk-narrow .dk-grid{ grid-template-columns:minmax(0,1fr); gap:22px; }
.dk-narrow .dk-planner{ order:1; } .dk-narrow .dk-l{ order:2; } .dk-narrow .dk-r{ order:3; }
.dk-narrow .dk-rail{ display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:20px; }
.dk-narrow .dk-zone, .dk-narrow .dk-ptabs, .dk-narrow .dk-peek, .dk-narrow .dk-doodle{ display:none; }
.dk-narrow .dk-stickies{ position:static; display:flex; gap:16px; overflow-x:auto; padding:6px 4px 18px; margin:-8px -6px 6px; pointer-events:auto; }
.dk-narrow .dk-sticky{ position:relative; left:auto !important; top:auto !important; flex:none; }
.dk-narrow .dk-sbtns{ opacity:1; }
.dk-narrow .dk-page{ padding:20px 12px 28px 50px; min-height:0; } .dk-narrow .dk-page::before{ left:38px; }
.dk-narrow .dk-mat{ padding:20px 12px 40px; }
/* Stage 2: the planner's lived-in touches */
.dk-mat-navy{ --mat:#24405e; --mat-2:#1d3550; } .dk-mat-sage{ --mat:#5f8370; --mat-2:#527562; } .dk-mat-cork{ --mat:#b08452; --mat-2:#9f7546; }
.dk-ink-teal{ --ink:#155A68; --strike:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='8' viewBox='0 0 100 8' preserveAspectRatio='none'><path d='M0 4.6 C20 3.2 38 4.8 55 3.9 S85 3.1 100 3.6' stroke='%23155A68' stroke-width='1.9' fill='none' stroke-linecap='round'/></svg>"); }
.dk-ink-plum{ --ink:#5b2a5e; --strike:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='8' viewBox='0 0 100 8' preserveAspectRatio='none'><path d='M0 4.6 C20 3.2 38 4.8 55 3.9 S85 3.1 100 3.6' stroke='%235b2a5e' stroke-width='1.9' fill='none' stroke-linecap='round'/></svg>"); }
.dk-neat{ --hand:system-ui,-apple-system,'Segoe UI',sans-serif; } .dk-neat .dk-list{ font-size:17px; } .dk-neat .dk-note{ font-size:15.5px; }
.dk-ribbon{ position:absolute; top:-6px; right:96px; width:16px; height:calc(100% + 46px); pointer-events:none; z-index:3; background:linear-gradient(90deg, #155A68, #1F7A8C 50%, #155A68);
  clip-path:polygon(0 0,100% 0,100% 100%,50% calc(100% - 9px),0 100%); opacity:.9;
  -webkit-mask:linear-gradient(#000 0 30px, transparent 30px calc(100% - 46px), #000 calc(100% - 46px)); mask:linear-gradient(#000 0 30px, transparent 30px calc(100% - 46px), #000 calc(100% - 46px)); }
.dk-coffee{ position:absolute; width:118px; height:118px; border-radius:50%; pointer-events:none; background:radial-gradient(circle, transparent 55%, rgba(120,78,38,.10) 57%, rgba(120,78,38,.05) 61%, transparent 63%); }
.dk-dogear{ position:absolute; top:0; right:0; width:34px; height:34px; border:0; padding:0; z-index:3; background:transparent; border-radius:0 5px 0 0; }
.dk-dogear:hover{ background:linear-gradient(225deg, transparent 0 46%, rgba(0,0,0,.06) 47%, transparent 60%); }
.dk-dogear.dk-on{ width:38px; height:38px; background:linear-gradient(225deg, var(--mat) 0 50%, var(--paper-edge) 50%, var(--paper-2)); box-shadow:-2px 2px 3px -1px var(--shadow); }
.dk-nav{ margin-right:22px; }
.dk-stamp{ position:absolute; right:34px; bottom:50px; width:132px; text-align:center; pointer-events:none; color:var(--dk-teal); transform:rotate(-12deg); }
.dk-stamp svg{ width:112px; height:112px; mix-blend-mode:multiply; opacity:.8; }
.dk-stamp div{ font-family:var(--hand); font-size:17px; color:var(--ink); margin-top:-4px; }
.dk-thunk svg{ animation:dkThunk .5s cubic-bezier(.2,1.6,.4,1); } @keyframes dkThunk{ 0%{ transform:scale(2.2); opacity:0; } 60%{ opacity:1; } 100%{ transform:scale(1); } }
.dk-mstar{ position:absolute; left:-46px; top:5px; width:24px; height:24px; border:0; background:transparent; padding:0; color:var(--ink); opacity:0; transition:opacity .15s; }
.dk-row:hover .dk-mstar{ opacity:.18; } .dk-mstar.dk-on{ opacity:1 !important; } .dk-mstar svg{ width:24px; height:24px; overflow:visible; }
.dk-mstar.dk-on svg{ animation:dkPop .35s ease-out; } @keyframes dkPop{ from{ transform:scale(1.8) rotate(-30deg); opacity:0; } }
.dk-circ{ position:absolute; left:-9px; top:2px; width:calc(100% + 18px); height:calc(var(--lh) - 2px); pointer-events:none; overflow:visible; color:var(--honey-deep); }
.dk-circ path{ fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; vector-effect:non-scaling-stroke; stroke-dasharray:1400; animation:dkDraw .6s ease-out; }
@keyframes dkDraw{ from{ stroke-dashoffset:1400; } }
.dk-tent{ position:relative; padding-top:6px; }
.dk-face{ position:relative; background:var(--paper); border-radius:3px; padding:0 10px 10px; transform:perspective(600px) rotateX(9deg); transform-origin:50% 100%; box-shadow:0 2px 0 var(--paper-edge), 0 10px 14px -10px var(--shadow); }
.dk-coil{ position:absolute; top:-7px; left:14px; right:14px; display:flex; justify-content:space-between; z-index:1; }
.dk-coil i{ width:5px; height:13px; border-radius:4px; background:linear-gradient(90deg,#8d96a0,#e6eaee 45%,#8d96a0); }
.dk-band{ display:flex; justify-content:space-between; align-items:center; margin:0 -10px 7px; padding:9px 10px 6px; background:#0D365F; color:#fff; border-radius:3px 3px 0 0; font-size:11px; font-weight:800; letter-spacing:.16em; }
.dk-band button{ border:0; background:rgba(255,255,255,.16); color:#fff !important; font-size:10px; font-weight:800; letter-spacing:.08em; border-radius:9px; padding:2px 7px; }
.dk-base{ height:9px; margin:0 8px; background:linear-gradient(var(--paper-edge), #b9ab8a); border-radius:0 0 6px 6px; box-shadow:0 8px 10px -6px var(--shadow); }
.dk-calg{ display:grid; grid-template-columns:repeat(7,1fr); gap:1px; text-align:center; font-size:11.5px; font-variant-numeric:tabular-nums; }
.dk-w{ font-size:9.5px; font-weight:800; color:var(--pencil); padding-bottom:2px; }
.dk-calg button{ border:0; background:transparent; padding:3px 0 5px; border-radius:6px; color:#16283a !important; position:relative; font-weight:600; font-size:11.5px; }
.dk-calg button:disabled{ color:var(--faint) !important; cursor:default; font-weight:400; }
.dk-calg .dk-has::after{ content:""; position:absolute; left:50%; bottom:1px; width:4px; height:4px; margin-left:-2px; border-radius:50%; background:var(--dk-teal); }
.dk-calg .dk-sel{ background:var(--teal-pale); } .dk-calg button.dk-over{ background:var(--honey-pale); }
.dk-calg button:not(:disabled):hover{ background:var(--teal-pale); }
.dk-ring{ position:absolute; inset:-3px -2px; width:calc(100% + 4px); height:calc(100% + 6px); pointer-events:none; color:var(--honey-deep); }
.dk-polaroid{ border:0; background:#fffdf8; padding:8px 8px 24px; width:112px; transform:rotate(-4deg); box-shadow:0 12px 16px -10px var(--shadow); position:relative; }
.dk-img{ width:100%; aspect-ratio:1; background:var(--teal-pale) center/cover no-repeat; display:grid; place-items:center; color:#1F7A8C; }
.dk-img svg{ width:44px; height:44px; }
.dk-cap{ position:absolute; left:6px; right:6px; bottom:4px; font-family:var(--sticky-font); font-size:13px; text-align:center; color:#6b6355; }
.dk-polaroid::before{ content:""; position:absolute; top:-8px; left:36%; width:40px; height:15px; background:rgba(240,166,58,.55); transform:rotate(4deg); }
.dk-cup{ border:0; background:transparent; padding:0; width:48px; height:72px; } .dk-cup svg{ width:48px; height:72px; }
.dk-pref{ border:1px solid #e6dcc4; background:#fff; border-radius:16px; padding:5px 12px; font-size:12.5px; font-weight:700; color:#0D365F; display:inline-flex; gap:6px; align-items:center; cursor:pointer; }
.dk-pref.dk-on{ outline:2.5px solid #1F7A8C; }
.dk-mh2{ display:flex; align-items:center; gap:12px; margin-bottom:18px; color:#fff; flex-wrap:wrap; position:relative; }
.dk-mh2 h2{ font-family:var(--print); font-weight:400; font-size:30px; margin:0; color:#fff; }
.dk-onmat{ border-color:rgba(255,255,255,.3) !important; background:rgba(255,255,255,.1) !important; color:#fff !important; }
.dk-backp{ border:0; background:var(--paper); color:#0D365F !important; border-radius:16px; padding:6px 13px; font-weight:700; font-size:12.5px; }
.dk-mgrid{ display:grid; grid-template-columns:repeat(5, minmax(0,1fr)) repeat(2, minmax(0,.42fr)); gap:16px 12px; position:relative; }
.dk-mw{ color:rgba(255,255,255,.75); font-size:10.5px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; }
.dk-mini{ position:relative; display:flex; flex-direction:column; justify-content:flex-start; align-items:stretch; align-self:start; height:auto; border:0; text-align:left; font:inherit; line-height:normal; padding:8px 9px; background:var(--paper); border-radius:3px 3px 7px 7px; min-height:132px; color:var(--ink);
  box-shadow:0 1px 0 var(--paper-edge), 0 3px 0 var(--paper-2), 0 10px 14px -10px var(--shadow); transform:rotate(var(--r,0deg)); min-width:0; overflow:hidden; }
.dk-mini:hover{ transform:rotate(0) translateY(-4px); }
.dk-md{ font-size:10px; font-weight:800; letter-spacing:.12em; color:var(--honey-deep); }
.dk-md b{ font-family:var(--print); font-size:18px; letter-spacing:0; color:#0D365F; font-weight:400; margin-left:3px; }
.dk-ml{ font-family:var(--hand); font-size:12.5px; line-height:15px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; border-bottom:1px solid var(--rule); }
.dk-ml.dk-d{ text-decoration:line-through; opacity:.5; } .dk-ml.dk-n{ color:var(--pencil); padding-left:8px; }
.dk-mc{ font-size:10.5px; font-weight:700; color:var(--pencil); margin-top:5px; font-variant-numeric:tabular-nums; }
.dk-ms{ position:absolute; right:-6px; bottom:-6px; width:56px; height:56px; color:var(--dk-teal); opacity:.75; transform:rotate(-14deg); mix-blend-mode:multiply; }
.dk-de{ position:absolute; top:0; right:0; width:18px; height:18px; background:linear-gradient(225deg, var(--mat) 0 50%, var(--paper-edge) 50%); }
.dk-mini.dk-future{ opacity:.6; } .dk-mini.dk-today{ outline:3px solid var(--honey); outline-offset:2px; }
.dk-mini.dk-wk{ min-height:60px; background:rgba(255,255,255,.12); box-shadow:none; color:rgba(255,255,255,.7); cursor:default; }
.dk-mini.dk-wk .dk-md, .dk-mini.dk-wk .dk-md b{ color:rgba(255,255,255,.7); }
.dk-mblank{ min-height:20px; } .dk-mfoot{ margin-top:20px; color:rgba(255,255,255,.88); font-size:13px; position:relative; }
.dk-flipclone{ position:fixed !important; z-index:50; transform-origin:0 0; pointer-events:none; transition:transform .5s cubic-bezier(.4,.1,.2,1), opacity .5s; margin:0; }
.dk-narrow .dk-mgrid{ grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; } .dk-narrow .dk-wkcol{ display:none; }
.dk-narrow .dk-mini{ min-height:84px; padding:6px; } .dk-narrow .dk-ml{ display:none; } .dk-narrow .dk-ms{ width:36px; height:36px; }
.dk-narrow .dk-mstar{ left:-36px; } .dk-narrow .dk-ribbon{ right:60px; } .dk-narrow .dk-nav{ margin-right:0; }
/* Stage 4: the Stand-Up tray, the Friday card */
.dk-tray{ position:relative; height:186px; border:0; background:transparent; padding:0; width:100%; text-align:left; display:block; font:inherit; }
.dk-tback{ position:absolute; left:6%; right:6%; top:26px; bottom:30px; border-radius:6px 6px 0 0; background:linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,.10)); border:1.5px solid rgba(255,255,255,.4); border-bottom:0; }
.dk-tcards{ position:absolute; left:10%; right:10%; bottom:34px; height:140px; }
.dk-icard{ position:absolute; left:0; right:0; height:74px; background:#fffdf8; border-radius:2px; padding:6px 9px; font-family:var(--hand); font-size:15.5px; line-height:1.15; color:var(--ink);
  background-image:linear-gradient(transparent 17px, rgba(220,90,90,.5) 17px 18px, transparent 18px), repeating-linear-gradient(transparent 0 17px, var(--rule) 17px 18px); box-shadow:0 -1px 3px rgba(0,0,0,.08); transform:rotate(var(--r,0deg)); overflow:hidden; }
.dk-ict{ display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; padding-top:16px; }
.dk-talked::after{ content:"talked about"; position:absolute; right:6px; top:3px; font-family:system-ui,sans-serif; font-size:9px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:#1F7A8C; border:1.5px solid #1F7A8C; border-radius:4px; padding:0 4px; transform:rotate(-6deg); opacity:.85; }
.dk-land{ animation:dkLand .45s cubic-bezier(.3,1.4,.5,1); } @keyframes dkLand{ from{ transform:translateY(-70px) rotate(-8deg); opacity:.3; } }
.dk-tfront{ position:absolute; left:0; right:0; bottom:0; height:46px; border-radius:4px 4px 8px 8px; z-index:2; background:linear-gradient(180deg, rgba(255,255,255,.34), rgba(255,255,255,.18)); border:1.5px solid rgba(255,255,255,.5); backdrop-filter:blur(2px); box-shadow:0 12px 16px -10px var(--shadow); display:flex; align-items:center; justify-content:center; transition:transform .2s; }
.dk-dymo{ background:#14303f; color:#f4f7f9; font-size:10.5px; font-weight:800; letter-spacing:.18em; padding:4px 10px 3px; border-radius:3px; white-space:nowrap; }
.dk-tray.dk-over .dk-tfront{ transform:translateY(-4px); background:rgba(240,166,58,.45); }
.dk-tempty{ position:absolute; left:12%; right:12%; bottom:56px; color:rgba(255,255,255,.82); font-size:12px; line-height:1.35; text-align:center; }
.dk-tmore{ position:absolute; right:12%; top:8px; font-size:11px; font-weight:700; color:rgba(255,255,255,.85); }
.dk-traybox, .dk-weekbox{ font-size:13.5px; }
.dk-tkick{ font-size:10.5px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; color:#C17A12; }
.dk-trow{ display:flex; flex-wrap:wrap; gap:6px 10px; align-items:center; padding:8px 0; border-bottom:1px solid #e4e1d8; }
.dk-trt{ flex:1 1 200px; font-family:'Patrick Hand',cursive; font-size:18px; color:#0D365F; min-width:0; }
.dk-tk{ font-family:system-ui,sans-serif; font-size:10.5px; color:#1F7A8C; font-weight:800; }
.dk-tbtns{ display:flex; gap:4px; flex-wrap:wrap; } .dk-tbtns button{ border:1px solid #e6dcc4; background:#fffdf6; border-radius:14px; padding:3px 9px; font-size:12px; font-weight:700; color:#0D365F; cursor:pointer; }
.dk-tuck{ position:absolute; z-index:0; border:0; padding:0; text-align:left; transition:transform .25s cubic-bezier(.3,.7,.2,1); }
.dk-weektuck{ left:-70px; bottom:90px; width:140px; transform:rotate(-8deg); background:var(--manila); color:#4a3410; padding:14px 40px 14px 14px; box-shadow:0 10px 16px -10px var(--shadow); animation:dkArriveL .8s cubic-bezier(.3,.7,.2,1); }
.dk-weektuck:hover{ transform:translateX(-16px) rotate(-10deg); }
.dk-weektuck b{ display:block; font-size:9.5px; letter-spacing:.14em; text-transform:uppercase; } .dk-weektuck span{ font-family:var(--print); font-size:15px; }
@keyframes dkArriveL{ from{ transform:translateX(-90px) rotate(-18deg); opacity:0; } }
.dk-wstamps{ display:flex; gap:10px; margin:12px 0 6px; flex-wrap:wrap; }
.dk-wstamps span{ display:flex; flex-direction:column; align-items:center; gap:2px; font-size:10.5px; font-weight:800; letter-spacing:.1em; color:#6f7681; }
.dk-wstamps svg{ width:48px; height:48px; color:#1F7A8C; opacity:.8; } .dk-wstamps i{ width:44px; height:48px; border:1.5px dashed #e6dcc4; border-radius:4px; }
.dk-wfin{ font-family:'Patrick Hand',cursive; font-size:18px; color:#0D365F; } .dk-wfin div{ text-decoration:line-through; text-decoration-thickness:1.5px; opacity:.8; }
.dk-wbye{ font-family:'Patrick Hand',cursive; font-size:19px; color:#0D365F; margin-top:10px; }
.dk-wrapped{ font-family:var(--print); font-style:italic; font-size:13px; color:var(--pencil); margin:10px 0 0 35px; }
.dk-narrow .dk-tuck{ display:none; }
/* Stage 3: owners */
.dk-tabs{ display:flex; gap:4px; padding:4px 6px 0; overflow-x:auto; }
.dk-tab{ border:0; border-radius:12px 12px 0 0; padding:8px 15px 9px; font-weight:700; font-size:13px; color:#0D365F !important; background:var(--c); box-shadow:inset 0 -6px 8px -6px rgba(0,0,0,.25); transform:translateY(5px); transition:transform .15s; white-space:nowrap; }
.dk-tab:hover{ transform:translateY(2px); } .dk-tab[aria-current="true"]{ transform:translateY(0); box-shadow:none; }
.dk-strip{ position:absolute; left:50%; top:-1px; transform:translateX(-50%); z-index:6; background:var(--honey-pale); color:#3d2a00; font-size:12.5px; font-weight:600; padding:5px 14px 6px; border-radius:0 0 10px 10px; box-shadow:0 6px 10px -6px var(--shadow); white-space:nowrap; max-width:calc(100% - 40px); overflow:hidden; text-overflow:ellipsis; }
.dk-visit{ position:absolute; left:30px; bottom:12px; font-size:12.5px; font-style:italic; color:rgba(255,255,255,.88); z-index:3; display:flex; gap:6px; align-items:center; }
.dk-visit svg{ width:16px; height:16px; }
.dk-ronote{ font-size:12.5px; color:var(--pencil); padding:8px 0 0 35px; }
.dk-ostar{ width:24px; height:24px; flex:none; margin-top:5px; filter:drop-shadow(0 1px 0 rgba(0,0,0,.2)); animation:dkPop .35s ease-out; }
.dk-row[data-dk="ostar"]{ cursor:pointer; } .dk-row[data-dk="ostar"]:hover{ background:rgba(240,166,58,.10); }
.dk-hand{ background:transparent; color:var(--honey-deep); }
.dk-padh{ width:100%; font-size:12px; font-weight:700; color:rgba(255,255,255,.9); margin-bottom:2px; }
.dk-owner{ padding-top:28px; }
.dk-owner::before{ content:""; position:absolute; top:-9px; left:50%; width:84px; height:20px; transform:translateX(-50%) rotate(-4deg); background:repeating-linear-gradient(45deg, rgba(31,122,140,.55) 0 6px, rgba(31,122,140,.32) 6px 12px); }
.dk-from{ position:absolute; top:12px; left:13px; right:13px; font-family:system-ui,-apple-system,'Segoe UI',sans-serif; font-size:9.5px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:rgba(58,50,34,.6); }
.dk-sig{ font-family:'Homemade Apple','Gochi Hand',cursive; font-size:13px; margin-top:8px; color:#0D365F; }
.dk-rcpt{ font-family:system-ui,-apple-system,'Segoe UI',sans-serif; font-size:10.5px; font-weight:600; color:#5b4a28; margin-top:3px; min-height:12px; }
.dk-evh{ font-family:var(--print); font-weight:400; color:#fff; margin:0 0 4px; font-size:28px; position:relative; }
.dk-evsub{ color:rgba(255,255,255,.82); margin:0 0 20px; font-size:13px; max-width:64ch; line-height:1.5; position:relative; }
.dk-evgrid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(220px,1fr)); gap:24px 20px; position:relative; }
.dk-evcard{ display:block; border:0; padding:12px; border-radius:14px; text-align:left; transition:transform .15s; background:linear-gradient(160deg, var(--mat), var(--mat-2)); box-shadow:0 10px 18px -12px var(--shadow); outline:1.5px solid rgba(255,255,255,.25); font:inherit; }
.dk-evcard:hover{ transform:translateY(-4px); }
.dk-evn{ display:block; font-weight:800; font-size:12.5px; color:#fff; margin-bottom:8px; }
.dk-evpage{ background:var(--paper); padding:10px 12px 12px 28px; border-radius:3px 3px 8px 8px; min-height:210px; position:relative; box-shadow:0 1px 0 var(--paper-edge), 0 3px 0 var(--paper-2); }
.dk-evpage::before{ content:""; position:absolute; left:20px; top:0; bottom:0; width:1.5px; background:var(--margin); opacity:.7; }
.dk-evd{ font-family:var(--print); color:#0D365F; font-size:14px; margin-bottom:4px; }
.dk-evl{ font-family:var(--hand); color:var(--ink); font-size:15px; line-height:22px; border-bottom:1px solid var(--rule); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dk-evl.dk-d{ text-decoration:line-through; opacity:.5; } .dk-evl.dk-n{ color:var(--pencil); padding-left:10px; }
.dk-evm{ font-size:12px; color:var(--pencil); margin-top:6px; }
.dk-evstk{ position:absolute; right:-8px; top:20px; display:flex; flex-direction:column; gap:4px; }
.dk-evstk i{ width:26px; height:24px; background:var(--sc); transform:rotate(var(--r)); box-shadow:0 3px 5px -2px var(--shadow); }
@media (hover:none){ .dk-grip{ display:flex; } .dk-tools{ display:none; } }
@media (prefers-reduced-motion: reduce){ .dk *, .dk *::before, .dk *::after{ animation-duration:.001s !important; transition-duration:.001s !important; } }
`;

  Object.assign(window, { dkOpen, dkPill, dkSetFill, dkSetSave, dkAllowed, dkWarm, dkQuickJot, dkJotOpen, dkShiftHtml, dkShiftApply, dkRefresh });
  window.DKX = { fridayWeek, weekCard, trayOpen, nextStandup, openDesk, openEveryone, stampCheck, openMonth, zoomOut, zoomIn, photoPicked, parseTime, carryInfo, inPlace, blockOf, slots, access, bizDiff, nextBiz, prevBiz, moveLine, eraseLine, toggle, addLine, flipTo, load, render, undoLast:() => { const b = $('#dkToast button'); if(b) b.click(); } };
})();
