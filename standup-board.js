/* =====================================================================================================================
   STAND-UP AND TEAM MEETINGS, in Today (2026-10-05). Samantha approved the plan
   (https://claude.ai/artifact/2BZP14QkBcLjPy34dXJ9Ab) with the suggested choices and these additions: client and
   category fields, aging, audit history, delete = archive, urgent first, open-item counts on My Team, and the prior
   meeting's open action items carried forward. "Keep Stand-Up as an internal operational handoff board and do not add
   texts/emails": NOTHING here sends a message to anyone.

   The same lists the Team Hub used (app_data standup_notes and team_meetings), so nothing is copied or lost. Older
   items are read as they are (resolved = Done, an assignee typed by name is matched to My Team by name) and only gain
   the new fields when somebody changes them.

   SAFE CHANGES: every change re-reads the list, applies only that one change to the newest copy of that item, and saves
   that one item (upsert_app_data_item through persist). An old open page can never undo somebody else's change. While
   one of these tabs is open the lists refresh every 45 seconds (not while a form is open).

   EVERYTHING TYPED IS SHOWN AS TEXT. The old Team Hub board put some fields into the page unescaped, and its public
   quick-add page let anyone write to it; here every value goes through escapeHtmlComms, and links are only https.
   ===================================================================================================================== */
(function(){
  'use strict';
  const SU_KEY = 'standup_notes', TM_KEY = 'team_meetings';
  const SU_CATS = ['Caregiver / Scheduling', 'Client', 'Lead', 'Incident', 'General', 'Meeting action'];
  const SU_STATUS = { open: 'Open', working: 'Working on it', done: 'Done' };
  const TM_NAMES = ['Weekly Team Meeting', 'Care Coordination Sync', 'Staffing Sync', 'All-Staff Meeting'];
  const AGE_AMBER_DAYS = 2, AGE_RED_DAYS = 5, REFRESH_MS = 45000;
  const SU = { items: null, at: 0, err: null, busy: null, f: { status: 'active', who: 'all', cat: 'all', q: '' } };
  const TM = { items: null, at: 0, err: null, busy: null, q: '', open: {}, showArchived: false, editing: null };
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const iso = () => new Date().toISOString();
  const lc = s => String(s || '').trim().toLowerCase();
  const newId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function me(){ try{ const a = ccActor(); return { email: lc(a.email), name: a.name || a.email || 'Someone' }; }catch(e){ return { email: '', name: 'Someone' }; } }
  function people(){
    try{ return (roleEveryone() || []).map(s => ({ email: lc(s.email), name: s.name || s.email })).filter(p => p.email); }catch(e){ return []; }
  }
  const nameOf = (email, list) => { const p = (list || people()).find(x => x.email === lc(email)); return p ? p.name : (email || ''); };
  const dayStr = d => { const t = new Date(d); return isNaN(t) ? '' : t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
  const whenStr = d => { const t = new Date(d); return isNaN(t) ? '' : t.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); };
  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  /* No alert(), confirm() or prompt(): inside the GoHighLevel frame those read as a fault (see the Popover kit). Forms
     open centred on a computer and as a bottom sheet on a phone (ccPopOpen does the phone part). */
  function pop(html, width, stack){
    const el = ccPopOpen(null, html, { width: width || 420, stack: !!stack });
    if(window.innerWidth >= 700){ const w = Math.min(width || 420, window.innerWidth - 16);
      el.style.width = w + 'px'; el.style.maxHeight = '86vh'; el.style.left = Math.max(8, (window.innerWidth - w) / 2) + 'px';
      el.style.top = Math.max(8, Math.min(70, window.innerHeight - el.offsetHeight - 8)) + 'px'; }
    return el;
  }
  /* the two-column form fields stack on a phone */
  try{ const st = document.createElement('style'); st.textContent = '.su-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}'
    + '.tmA{display:grid;grid-template-columns:2fr 1fr 1fr;gap:6px;margin-top:6px}'
    + '@media(max-width:640px){.su-grid{grid-template-columns:1fr}.tmA{grid-template-columns:1fr 1fr;padding-top:6px;border-top:1px solid var(--border)}.tmA .tmA_t{grid-column:1/-1}}';
    document.head.appendChild(st); }catch(e){}
  const say = msg => { try{ ccToast(msg); }catch(e){} };
  function ask(msg, yes){
    return new Promise(res => {
      const el = pop('<div style="font-size:14px;line-height:1.45;padding:4px 2px 12px;">' + esc(msg) + '</div>'
        + '<div style="display:flex;gap:8px;"><button class="primary" data-a="y">' + esc(yes) + '</button><button class="secondary" data-a="n">Cancel</button></div>', 380, true);
      let done = false; const fin = v => { if(done) return; done = true; ccPopClose(); res(v); };
      el.querySelector('[data-a=y]').onclick = () => fin(true); el.querySelector('[data-a=n]').onclick = () => fin(false);
      /* Escape or a click outside closes it: that counts as Cancel */
      const t = setInterval(() => { if(!document.body.contains(el)){ clearInterval(t); if(!done){ done = true; res(false); } } }, 150);
    });
  }
  function askText(title, hint){
    return new Promise(res => {
      const el = pop('<div style="font-size:14.5px;font-weight:800;color:var(--navy);">' + esc(title) + '</div>'
        + (hint ? '<div class="field-note" style="margin:3px 0 8px;">' + esc(hint) + '</div>' : '')
        + '<textarea data-a="t" rows="4" style="width:100%;"></textarea>'
        + '<div style="display:flex;gap:8px;margin-top:10px;"><button class="primary" data-a="y">Save</button><button class="secondary" data-a="n">Cancel</button></div>', 460, true);
      let done = false; const fin = v => { if(done) return; done = true; ccPopClose(); res(v); };
      el.querySelector('[data-a=y]').onclick = () => { const v = el.querySelector('[data-a=t]').value.trim(); if(v) fin(v); };
      el.querySelector('[data-a=n]').onclick = () => fin(null);
      const t = setInterval(() => { if(!document.body.contains(el)){ clearInterval(t); if(!done){ done = true; res(null); } } }, 150);
    });
  }

  /* ---------------------------------------------- pure rules (tested) ---------------------------------------------- */
  /* An item as the page sees it: the stored fields plus status, the assignee's email, and the history list. */
  function suNorm(raw, list){
    const i = Object.assign({}, raw || {});
    i.status = SU_STATUS[i.status] ? i.status : (i.resolved ? 'done' : 'open');
    if(!i.assigned_to_email && i.assigned_to){
      const n = lc(i.assigned_to), ps = list || [];
      const full = ps.filter(p => lc(p.name) === n), first = ps.filter(p => lc(String(p.name).split(' ')[0]) === n);
      const hit = full.length === 1 ? full[0] : (first.length === 1 ? first[0] : null);
      if(hit) i.assigned_to_email = hit.email;
    }
    i.updates = Array.isArray(i.updates) ? i.updates : [];
    i.history = Array.isArray(i.history) ? i.history : [];
    return i;
  }
  /* How long it has been open (or how long it took). */
  function suAge(i, now){
    const start = Date.parse(i.occurred_at || i.created_at || ''); if(isNaN(start)) return { days: 0, label: '', tone: '' };
    const end = i.status === 'done' ? Date.parse(i.done_at || i.resolved_at || '') : (now || Date.now());
    const ms = Math.max(0, (isNaN(end) ? Date.now() : end) - start), days = ms / 864e5;
    const span = days >= 1 ? Math.floor(days) + ' day' + (Math.floor(days) === 1 ? '' : 's') : Math.max(1, Math.round(ms / 36e5)) + ' hour' + (Math.round(ms / 36e5) === 1 ? '' : 's');
    if(i.status === 'done') return { days, label: 'done in ' + span, tone: '' };
    return { days, label: 'open ' + span, tone: days >= AGE_RED_DAYS ? 'red' : days >= AGE_AMBER_DAYS ? 'amber' : '' };
  }
  const isOverdue = (i, d) => i.status !== 'done' && !!i.due && String(i.due) < (d || today());
  /* Open work: urgent first, then overdue, then by due date, then the oldest first. Done: most recently done first. */
  function suSort(items, d){
    const t = x => Date.parse(x.occurred_at || x.created_at || '') || 0;
    return items.slice().sort((a, b) => {
      if(a.status === 'done' && b.status === 'done') return (Date.parse(b.done_at || b.resolved_at || '') || 0) - (Date.parse(a.done_at || a.resolved_at || '') || 0);
      if(!!b.urgent - !!a.urgent) return !!b.urgent - !!a.urgent;
      if(isOverdue(b, d) - isOverdue(a, d)) return isOverdue(b, d) - isOverdue(a, d);
      if(!!a.due !== !!b.due) return a.due ? -1 : 1;
      if(a.due && b.due && a.due !== b.due) return String(a.due).localeCompare(String(b.due));
      return t(a) - t(b);
    });
  }
  function suFilter(items, f, myEmail){
    const q = lc(f.q);
    return items.filter(i => {
      if(f.status === 'archived'){ if(!i.archived_at) return false; }
      else { if(i.archived_at) return false; if(f.status === 'active' && i.status === 'done') return false; if(f.status === 'done' && i.status !== 'done') return false; }
      if(f.who === 'mine' && lc(i.assigned_to_email) !== lc(myEmail)) return false;
      if(f.who === 'unassigned' && (i.assigned_to_email || i.assigned_to)) return false;
      if(f.who && !['all', 'mine', 'unassigned'].includes(f.who) && lc(i.assigned_to_email) !== lc(f.who)) return false;
      if(f.cat && f.cat !== 'all' && i.category !== f.cat) return false;
      if(q){ const hay = lc([i.summary, i.client, i.related_to, i.assigned_to, i.reported_by, i.category].concat(i.updates.map(u => u.text)).join(' '));
        if(!hay.includes(q)) return false; }
      return true;
    });
  }
  /* Open items for one person (My Team, Today). */
  function suOpenFor(items, email){
    const e = lc(email), mine = (items || []).filter(i => !i.archived_at && i.status !== 'done' && lc(i.assigned_to_email) === e);
    return { open: mine.length, urgent: mine.filter(i => i.urgent).length, overdue: mine.filter(i => isOverdue(i)).length };
  }
  /* What changed between two versions of an item, in words, for its history. */
  function suDiff(a, b, list){
    const out = [], ch = (k, label, f) => { if(String(a[k] || '') !== String(b[k] || '')) out.push(f ? f(a[k], b[k]) : label + ': ' + (b[k] || '(none)')); };
    ch('summary', 'What happened', () => 'What happened was edited');
    ch('category', 'Category'); ch('client', 'Client'); ch('related_to', 'About');
    ch('assigned_to_email', '', (x, y) => y ? 'Assigned to ' + nameOf(y, list) + (x ? ' (was ' + nameOf(x, list) + ')' : '') : 'Unassigned (was ' + nameOf(x, list) + ')');
    ch('due', '', (x, y) => y ? 'Due ' + y : 'Due date removed');
    if(!!a.urgent !== !!b.urgent) out.push(b.urgent ? 'Marked urgent' : 'Urgent removed');
    ch('status', '', (x, y) => 'Status: ' + (SU_STATUS[x] || 'Open') + ' → ' + (SU_STATUS[y] || 'Open'));
    return out;
  }
  /* The prior meeting's open action items for a meeting on `date` called `name`: the newest earlier meeting with that
     name (or any earlier meeting if none has it), its own action items plus anything it carried, still not done. */
  function tmPrior(meetings, date, name, excludeId){
    const prev = (meetings || []).filter(m => m && !m.archived_at && m.id !== excludeId && String(m.meeting_date || '') < String(date || ''))
      .sort((a, b) => String(b.meeting_date).localeCompare(String(a.meeting_date)));
    return prev.find(m => m.meeting_name === name) || prev[0] || null;
  }
  function tmCarry(meetings, items, date, name, excludeId){
    const p = tmPrior(meetings, date, name, excludeId); if(!p) return { prior: null, open: [], legacy: [] };
    const ids = new Set([].concat(p.action_ids || [], p.carried_ids || []));
    const open = (items || []).filter(i => ids.has(i.id) && !i.archived_at && i.status !== 'done');
    const legacy = (p.action_ids && p.action_ids.length) ? [] : String(p.action_items || '').split('\n').map(s => s.trim()).filter(Boolean);
    return { prior: p, open, legacy };
  }
  const safeUrl = u => /^https:\/\/[^\s"'<>]+$/i.test(String(u || '')) ? String(u) : '';

  /* ---------------------------------------------- data ---------------------------------------------- */
  async function readKey(key){
    const { data, error } = await sb.from('app_data').select('data').eq('key', key).maybeSingle();
    if(error) throw error;
    return Array.isArray(data && data.data) ? data.data : [];
  }
  async function suLoad(force){
    if(SU.busy) return SU.busy;
    if(SU.items && !force && Date.now() - SU.at < 20000) return;
    SU.busy = (async () => {
      try{ const list = people(); SU.items = (await readKey(SU_KEY)).map(x => suNorm(x, list)); SU.at = Date.now(); SU.err = null; }
      catch(e){ SU.err = String((e && e.message) || e); if(!SU.items) SU.items = []; }
      finally{ SU.busy = null; }
    })();
    return SU.busy;
  }
  async function tmLoad(force){
    if(TM.busy) return TM.busy;
    if(TM.items && !force && Date.now() - TM.at < 20000) return;
    TM.busy = (async () => {
      try{ TM.items = (await readKey(TM_KEY)).map(m => Object.assign({ history: [] }, m)); TM.at = Date.now(); TM.err = null; }
      catch(e){ TM.err = String((e && e.message) || e); if(!TM.items) TM.items = []; }
      finally{ TM.busy = null; }
    })();
    return TM.busy;
  }
  /* One change to one item, applied to the newest copy (see SAFE CHANGES above). fn(item) changes it and returns the
     history line (or a list of lines); returning nothing means nothing changed. */
  async function suMutate(id, fn){
    let fresh;
    try{ fresh = (await readKey(SU_KEY)).find(x => x && x.id === id); }catch(e){ say('Could not reach the Hub just now, so nothing was changed. Try again in a moment.'); return false; }
    if(!fresh){ say('That item is not on the board any more. Nothing was changed.'); await suLoad(true); suRender(); return false; }
    const list = people(), before = suNorm(fresh, list), item = suNorm(fresh, list);
    const lines = fn(item, before);
    const arr = (Array.isArray(lines) ? lines : [lines]).filter(Boolean);
    if(!arr.length) return false;
    const m = me(), at = iso();
    item.history = item.history.concat(arr.map(w => ({ at, by: m.name, by_email: m.email, what: w })));
    item.resolved = item.status === 'done';
    item.updated_at = at; item.updated_by = m.name; item.rev = (Number(item.rev) || 0) + 1;
    if(item.assigned_to_email) item.assigned_to = nameOf(item.assigned_to_email, list);
    await persist(SU_KEY, item);
    const i = (SU.items || []).findIndex(x => x.id === id); if(i >= 0) SU.items[i] = item; else (SU.items = SU.items || []).push(item);
    return true;
  }
  async function suCreate(fields, extraHistory){
    const m = me(), at = iso(), list = people();
    const item = suNorm(Object.assign({ id: newId('su_'), summary: '', category: 'General', client: '', related_to: '', occurred_at: at,
      reported_by: m.name, reported_by_email: m.email, assigned_to_email: '', assigned_to: '', due: '', urgent: false, status: 'open',
      resolved: false, created_at: at, created_by: m.name, updates: [], rev: 1 }, fields), list);
    if(item.assigned_to_email) item.assigned_to = nameOf(item.assigned_to_email, list);
    item.history = [{ at, by: m.name, by_email: m.email, what: extraHistory || 'Added' }];
    await persist(SU_KEY, item);
    (SU.items = SU.items || []).push(item);
    return item;
  }
  async function tmMutate(id, fn){
    let fresh;
    try{ fresh = (await readKey(TM_KEY)).find(x => x && x.id === id); }catch(e){ say('Could not reach the Hub just now, so nothing was changed. Try again in a moment.'); return null; }
    if(!fresh){ say('That meeting is not there any more. Nothing was changed.'); return null; }
    const m = Object.assign({ history: [] }, fresh), lines = [].concat(fn(m) || []).filter(Boolean);
    if(!lines.length) return null;
    const who = me(), at = iso();
    m.history = (m.history || []).concat(lines.map(w => ({ at, by: who.name, by_email: who.email, what: w })));
    m.updated_at = at; m.updated_by = who.name;
    await persist(TM_KEY, m);
    const i = (TM.items || []).findIndex(x => x.id === id); if(i >= 0) TM.items[i] = m; else (TM.items = TM.items || []).push(m);
    return m;
  }

  /* ---------------------------------------------- Stand-Up tab ---------------------------------------------- */
  const btn = (txt, on, cls, extra) => '<button class="' + (cls || 'secondary') + '" style="padding:4px 10px;font-size:12px;' + (extra || '') + '" onclick="' + on + '">' + txt + '</button>';
  const chip = (txt, bg, fg) => '<span class="tag-chip" style="background:' + bg + ';color:' + fg + ';font-size:11px;">' + esc(txt) + '</span>';
  function suCard(i, list){
    const age = suAge(i), od = isOverdue(i), a = i.archived_at;
    const tone = age.tone === 'red' ? 'var(--red)' : age.tone === 'amber' ? 'var(--amber)' : 'var(--text-muted)';
    const last = i.updates.length ? i.updates[i.updates.length - 1] : null;
    const id = esc(i.id), assignee = i.assigned_to_email ? nameOf(i.assigned_to_email, list) : (i.assigned_to || '');
    const acts = a ? btn('Restore', "suAct('" + id + "','restore')")
      : (i.status === 'open' ? btn('Start', "suAct('" + id + "','working')") + btn('Done ✓', "suAct('" + id + "','done')", 'primary')
        : i.status === 'working' ? btn('Done ✓', "suAct('" + id + "','done')", 'primary') + btn('Back to open', "suAct('" + id + "','open')")
        : btn('Reopen', "suAct('" + id + "','reopen')"))
        + btn('Add update', "suAct('" + id + "','update')") + btn('Edit', "suEdit('" + id + "')") + btn('Archive', "suAct('" + id + "','archive')", 'secondary', 'color:var(--text-muted);');
    const hist = i.history.concat(i.updates.map(u => ({ at: u.at, by: u.by, what: 'Update: ' + u.text }))).sort((x, y) => String(x.at).localeCompare(String(y.at)));
    return '<div class="card" style="padding:12px 14px;margin-bottom:9px;border-left:4px solid ' + (i.urgent ? 'var(--red)' : od ? 'var(--amber)' : 'var(--border)') + ';' + (a ? 'opacity:.7;' : '') + '">'
      + '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;">'
      + (i.urgent ? chip('URGENT', 'var(--red)', '#fff') : '')
      + '<b style="font-size:14.5px;color:var(--navy);flex:1;min-width:200px;">' + esc(i.summary || '(no description)') + '</b>'
      + chip(SU_STATUS[i.status], i.status === 'done' ? '#E3F2E8' : i.status === 'working' ? '#E8F0FB' : 'var(--amber-bg)', i.status === 'done' ? '#2F7D4E' : i.status === 'working' ? '#2F6FB0' : 'var(--amber)')
      + '</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">'
      + (i.category ? chip(i.category, 'var(--border)', 'var(--navy)') : '')
      + (i.client ? chip('Client: ' + i.client, '#EFEAFB', '#6B4FBB') : '')
      + (i.related_to ? chip('About: ' + i.related_to, 'var(--border)', 'var(--text-muted)') : '')
      + (i.due ? chip((od ? 'Overdue since ' : 'Due ') + dayStr(i.due + 'T12:00:00'), od ? 'var(--red)' : 'var(--border)', od ? '#fff' : 'var(--navy)') : '')
      + '</div>'
      + '<div class="field-note" style="margin-top:6px;font-size:12px;">'
      + 'Reported by ' + esc(i.reported_by || 'someone') + ' · ' + esc(whenStr(i.occurred_at || i.created_at))
      + ' · <b style="color:' + tone + ';">' + esc(age.label) + '</b>'
      + ' · ' + (assignee ? 'Assigned to <b>' + esc(assignee) + '</b>' : '<span style="color:var(--amber);">Unassigned</span>')
      + (i.status === 'done' && (i.done_by || i.resolved_by) ? ' · done by ' + esc(i.done_by || i.resolved_by) : '')
      + (a ? ' · archived by ' + esc(i.archived_by || '') + ' ' + esc(dayStr(a)) : '')
      + '</div>'
      + (last ? '<div style="margin-top:6px;font-size:12.5px;background:var(--bg,#F6F9FD);border-radius:8px;padding:6px 9px;"><b>' + esc(last.by) + '</b> · ' + esc(whenStr(last.at)) + ': ' + esc(last.text) + '</div>' : '')
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">' + acts + '</div>'
      + '<details style="margin-top:6px;"><summary class="field-note" style="cursor:pointer;font-size:11.5px;">History (' + hist.length + ')</summary>'
      + hist.map(h => '<div class="field-note" style="font-size:11.5px;margin-top:2px;">' + esc(whenStr(h.at)) + ' · ' + esc(h.by || '') + ': ' + esc(h.what || '') + '</div>').join('')
      + '</details></div>';
  }
  function suRender(){
    const box = document.getElementById('suWrap'); if(!box) return;
    if(!SU.items){ box.innerHTML = '<div class="field-note">Loading the board…</div>'; return; }
    const list = people(), m = me(), f = SU.f;
    const all = SU.items, act = all.filter(i => !i.archived_at && i.status !== 'done');
    const shown = suSort(suFilter(all, f, m.email));
    const opt = (v, t, cur) => '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(t) + '</option>';
    const tab = (v, t) => '<button class="' + (f.status === v ? 'primary' : 'secondary') + '" style="padding:5px 12px;font-size:12.5px;" onclick="suSet(\'status\',\'' + v + '\')">' + t + '</button>';
    box.innerHTML = '<div style="display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;margin-bottom:12px;">'
      + '<div><h2 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.02em;color:var(--navy);">Stand-Up</h2>'
      + '<div class="field-note">What the team needs to know and act on: after-hours calls, call-outs, client and caregiver issues. Internal only; nothing here texts or emails anyone.</div></div>'
      + '<span style="flex:1;"></span><button class="primary" onclick="suEdit()">＋ Add to Stand-Up</button></div>'
      + (SU.err ? '<div class="field-note" style="color:var(--red);margin-bottom:8px;">Couldn\'t refresh the board (' + esc(SU.err) + '). What you see may be out of date.</div>' : '')
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">'
      + tab('active', 'Open (' + act.length + ')') + tab('done', 'Done') + tab('archived', 'Archived')
      + '<select style="width:auto;font-size:12.5px;padding:4px 8px;" onchange="suSet(\'who\',this.value)">'
      + opt('all', 'Everyone', f.who) + opt('mine', 'Mine', f.who) + opt('unassigned', 'Unassigned', f.who) + list.map(p => opt(p.email, p.name, f.who)).join('') + '</select>'
      + '<select style="width:auto;font-size:12.5px;padding:4px 8px;" onchange="suSet(\'cat\',this.value)">' + opt('all', 'All categories', f.cat) + SU_CATS.map(c => opt(c, c, f.cat)).join('') + '</select>'
      + '<input placeholder="Search" value="' + esc(f.q) + '" oninput="suSet(\'q\',this.value,true)" style="width:180px;font-size:12.5px;padding:5px 8px;">'
      + '<span class="field-note" style="font-size:11.5px;">Updated ' + esc(whenStr(SU.at)) + '</span></div>'
      + '<div id="suList">' + suListHtml(shown, list) + '</div>';
  }
  const suListHtml = (shown, list) => shown.length ? shown.map(i => suCard(i, list)).join('') : '<div class="field-note">Nothing here.</div>';
  function suSet(k, v, keepFocus){
    SU.f[k] = v;
    if(keepFocus){ const l = document.getElementById('suList'); if(l) l.innerHTML = suListHtml(suSort(suFilter(SU.items || [], SU.f, me().email)), people()); return; }
    suRender();
  }
  /* the add/edit form */
  function suEdit(id){
    const list = people(), i = id ? (SU.items || []).find(x => x.id === id) : null;
    const v = i || { category: 'General', occurred_at: iso() };
    const loc = d => { const t = new Date(d); if(isNaN(t)) return ''; const z = new Date(t.getTime() - t.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 16); };
    const el = pop(
      '<div style="font-size:15px;font-weight:800;color:var(--navy);">' + (i ? 'Edit stand-up item' : 'Add to Stand-Up') + '</div>'
      + '<div class="field-note" style="margin:3px 0 10px;">Internal only. Nobody is texted or emailed.</div>'
      + '<label class="field-note">What happened *</label><textarea id="suF_summary" rows="3" style="width:100%;">' + esc(v.summary || '') + '</textarea>'
      + '<div class="su-grid" style="margin-top:8px;">'
      + '<div><label class="field-note">Category</label><select id="suF_category" style="width:100%;">' + SU_CATS.map(c => '<option' + (c === v.category ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></div>'
      + '<div><label class="field-note">Client (optional)</label><input id="suF_client" list="suClientList" value="' + esc(v.client ? (typeof ccPickLabelFor === 'function' ? ccPickLabelFor(v.client, v.client_ax) : v.client) : '') + '" style="width:100%;"><datalist id="suClientList"></datalist></div>'
      + '<div><label class="field-note">About (caregiver, family, anything)</label><input id="suF_related" value="' + esc(v.related_to || '') + '" style="width:100%;"></div>'
      + '<div><label class="field-note">When it happened</label><input id="suF_when" type="datetime-local" value="' + esc(loc(v.occurred_at)) + '" style="width:100%;"></div>'
      + '<div><label class="field-note">Assigned to</label><select id="suF_assign" style="width:100%;"><option value="">Unassigned</option>'
      /* an older item whose typed name matched nobody on My Team keeps that name unless someone picks a person */
      + (v.assigned_to && !v.assigned_to_email ? '<option value="__keep" selected>' + esc(v.assigned_to) + ' (typed earlier)</option>' : '')
      + list.map(p => '<option value="' + esc(p.email) + '"' + (p.email === lc(v.assigned_to_email) ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select></div>'
      + '<div><label class="field-note">Due (optional)</label><input id="suF_due" type="date" value="' + esc(v.due || '') + '" style="width:100%;"></div>'
      + '</div>'
      + '<label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13px;"><input type="checkbox" id="suF_urgent" style="width:auto;"' + (v.urgent ? ' checked' : '') + '> Urgent (goes to the top)</label>'
      + '<div style="display:flex;gap:8px;margin-top:12px;"><button class="primary" id="suF_save">Save</button><button class="secondary" id="suF_cancel">Cancel</button></div>',
      520);
    try{ ccPickFill('suClientList'); }catch(e){}
    el.querySelector('#suF_cancel').onclick = () => ccPopClose();
    el.querySelector('#suF_save').onclick = async (ev) => {
      const g = k => el.querySelector('#suF_' + k), summary = g('summary').value.trim();
      if(!summary){ say('Write what happened first.'); g('summary').focus(); return; }
      const when = g('when').value ? new Date(g('when').value).toISOString() : iso();
      const ctext = g('client').value.trim(), cpick = (ctext && typeof ccPickParse === 'function') ? ccPickParse(ctext) : null;
      const fields = { summary, category: g('category').value, client: cpick ? cpick.name : ctext, client_ax: cpick ? String(cpick.ax) : '', related_to: g('related').value.trim(),
        occurred_at: when, assigned_to_email: g('assign').value === '__keep' ? '' : g('assign').value, due: g('due').value, urgent: g('urgent').checked };
      ev.target.disabled = true;
      /* Unassigning clears the name too, or the next load would match the old name back to them. */
      if(!fields.assigned_to_email && g('assign').value !== '__keep') fields.assigned_to = '';
      if(i){ await suMutate(i.id, (it, before) => { Object.assign(it, fields); const d = suDiff(before, it, list);
        if(before.assigned_to && !before.assigned_to_email && !it.assigned_to_email && !it.assigned_to) d.push('Unassigned (was ' + before.assigned_to + ')');
        return d; }); }
      else { await suCreate(fields); }
      ccPopClose(); suRender(); suTodayRender();
    };
  }
  async function suAct(id, what){
    const m = me();
    if(what === 'update'){
      const t = await askText('Add an update', 'What happened, or what was done. Internal only.');
      if(!t) return;
      await suMutate(id, it => { it.updates = it.updates.concat([{ at: iso(), by: m.name, by_email: m.email, text: t.trim().slice(0, 1000) }]); return 'Update added'; });
    } else if(what === 'archive'){
      if(!await ask('Archive this item? It leaves the board but is kept, with its history, under Archived. You can restore it.', 'Archive')) return;
      await suMutate(id, it => { if(it.archived_at) return null; it.archived_at = iso(); it.archived_by = m.name; return 'Archived'; });
    } else if(what === 'restore'){
      await suMutate(id, it => { if(!it.archived_at) return null; it.archived_at = ''; it.archived_by = ''; return 'Restored from the archive'; });
    } else {
      const to = what === 'reopen' ? 'open' : what;
      await suMutate(id, (it, before) => {
        if(it.status === to) return null;
        it.status = to;
        if(to === 'done'){ it.done_at = iso(); it.done_by = m.name; it.resolved_at = it.done_at; it.resolved_by = m.name; }
        else { it.done_at = ''; it.done_by = ''; it.resolved_at = ''; it.resolved_by = ''; }
        return what === 'reopen' ? 'Reopened' : suDiff(before, it);
      });
    }
    suRender(); suTodayRender();
  }

  /* ---------------------------------------------- Today line + My Team counts ---------------------------------------------- */
  function suTodayRender(){
    const box = document.getElementById('suTodayLine'); if(!box) return;
    if(!SU.items){ suLoad().then(suTodayRender); return; }
    const m = suOpenFor(SU.items, me().email), team = SU.items.filter(i => !i.archived_at && i.status !== 'done');
    box.innerHTML = '<div class="card" style="padding:11px 14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;cursor:pointer;" onclick="switchTab(\'standup\')">'
      + '<b style="color:var(--navy);">Stand-Up</b>'
      + '<span>' + m.open + ' open for you' + (m.urgent ? ' · <b style="color:var(--red);">' + m.urgent + ' urgent</b>' : '') + (m.overdue ? ' · <b style="color:var(--amber);">' + m.overdue + ' overdue</b>' : '') + '</span>'
      + '<span class="field-note">' + team.length + ' open for the team · ' + team.filter(i => !i.assigned_to_email && !i.assigned_to).length + ' unassigned</span>'
      + '<span style="flex:1;"></span><span class="field-note">Open the board ›</span></div>';
  }
  /* the line on each My Team card (renderMyTeam calls this) */
  function suTeamCountHtml(email){
    if(!SU.items){ if(!SU._teamAsked){ SU._teamAsked = true; suLoad().then(() => { try{ if(typeof activeTab !== 'undefined' && activeTab === 'myteam') renderMyTeam(); }catch(e){} }); } return ''; }
    const c = suOpenFor(SU.items, email);
    return '<span style="cursor:pointer;" onclick="suSet(\'who\',\'' + esc(lc(email)) + '\');switchTab(\'standup\')">' + c.open + ' open stand-up'
      + (c.urgent ? ' · <b style="color:var(--red);">' + c.urgent + ' urgent</b>' : '') + '</span>';
  }

  /* ---------------------------------------------- Team Meetings ---------------------------------------------- */
  function tmCard(m, items, list){
    const id = esc(m.id), a = m.archived_at, open = !!TM.open[m.id];
    const acts = (m.action_ids || []).map(x => items.find(i => i.id === x)).filter(Boolean);
    const legacy = (m.action_ids && m.action_ids.length) ? [] : String(m.action_items || '').split('\n').map(s => s.trim()).filter(Boolean);
    const carried = (m.carried_ids || []).map(x => items.find(i => i.id === x)).filter(Boolean);
    const att = (m.attendee_emails && m.attendee_emails.length) ? m.attendee_emails.map(e => nameOf(e, list)).concat(m.attendees_other ? [m.attendees_other] : []).join(', ') : (m.attendees || '');
    const itemLine = i => '<div style="font-size:12.5px;padding:3px 0;">' + (i.status === 'done' ? '✅ ' : '☐ ') + esc(i.summary)
      + ' <span class="field-note">· ' + esc(i.assigned_to_email ? nameOf(i.assigned_to_email, list) : (i.assigned_to || 'unassigned'))
      + (i.due ? ' · due ' + esc(dayStr(i.due + 'T12:00:00')) : '') + ' · ' + esc(SU_STATUS[i.status]) + (i.archived_at ? ' · archived' : '') + '</span></div>';
    const link = safeUrl(m.transcript_url);
    return '<div class="card" style="padding:11px 14px;margin-bottom:8px;' + (a ? 'opacity:.7;' : '') + '">'
      + '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;cursor:pointer;" onclick="tmToggle(\'' + id + '\')">'
      + '<b style="color:var(--navy);">' + esc(dayStr((m.meeting_date || '') + 'T12:00:00')) + ' · ' + esc(m.meeting_name || 'Meeting') + '</b>'
      + '<span class="field-note">' + esc(att) + '</span><span style="flex:1;"></span>'
      + '<span class="field-note">' + acts.filter(i => i.status !== 'done').length + ' of ' + acts.length + ' action items open ' + (open ? '▾' : '▸') + '</span></div>'
      + (open ? '<div style="margin-top:8px;">'
        + (m.notes ? '<div style="white-space:pre-wrap;font-size:13px;">' + esc(m.notes) + '</div>' : '')
        + (carried.length ? '<div style="margin-top:8px;"><b style="font-size:12.5px;">Carried from last time</b>' + carried.map(itemLine).join('') + '</div>' : '')
        + ((acts.length || legacy.length) ? '<div style="margin-top:8px;"><b style="font-size:12.5px;">Action items</b>' + acts.map(itemLine).join('')
          + legacy.map(t => '<div style="font-size:12.5px;padding:3px 0;">• ' + esc(t) + ' <span class="field-note">(older note, not on the board)</span></div>').join('') + '</div>' : '')
        + (link ? '<div style="margin-top:6px;"><a href="' + esc(link) + '" target="_blank" rel="noopener">Transcript</a></div>' : '')
        + '<div style="display:flex;gap:6px;margin-top:8px;">' + (a ? btn('Restore', "tmAct('" + id + "','restore')") : btn('Edit', "tmEdit('" + id + "')") + btn('Archive', "tmAct('" + id + "','archive')", 'secondary', 'color:var(--text-muted);')) + '</div>'
        + '<details style="margin-top:6px;"><summary class="field-note" style="cursor:pointer;font-size:11.5px;">History (' + (m.history || []).length + ')</summary>'
        + (m.history || []).map(h => '<div class="field-note" style="font-size:11.5px;">' + esc(whenStr(h.at)) + ' · ' + esc(h.by || '') + ': ' + esc(h.what || '') + '</div>').join('') + '</details>'
        + '</div>' : '')
      + '</div>';
  }
  function tmRender(){
    const box = document.getElementById('tmWrap'); if(!box) return;
    if(!TM.items || !SU.items){ box.innerHTML = '<div class="field-note">Loading meetings…</div>'; return; }
    const list = people(), q = lc(TM.q);
    const shown = TM.items.filter(m => (TM.showArchived ? !!m.archived_at : !m.archived_at)
      && (!q || lc([m.meeting_name, m.notes, m.attendees, m.action_items].join(' ')).includes(q)))
      .sort((a, b) => String(b.meeting_date || '').localeCompare(String(a.meeting_date || '')));
    const months = {}; shown.forEach(m => { const k = String(m.meeting_date || '').slice(0, 7); (months[k] = months[k] || []).push(m); });
    const keys = Object.keys(months).sort().reverse();
    box.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">'
      + '<button class="primary" onclick="tmEdit()">＋ Log a meeting</button>'
      + '<input placeholder="Search notes and action items" value="' + esc(TM.q) + '" oninput="tmSearch(this.value)" style="width:240px;font-size:12.5px;padding:5px 8px;">'
      + '<label class="field-note" style="display:flex;gap:6px;align-items:center;"><input type="checkbox" style="width:auto;"' + (TM.showArchived ? ' checked' : '') + ' onchange="tmShowArchived(this.checked)"> Show archived</label>'
      + (TM.err ? '<span class="field-note" style="color:var(--red);">Couldn\'t refresh (' + esc(TM.err) + ')</span>' : '') + '</div>'
      + '<div id="tmList">' + (keys.length ? keys.map((k, n) => '<div style="font-size:12px;font-weight:800;color:var(--text-muted);margin:12px 0 6px;letter-spacing:.04em;">'
        + esc(new Date(k + '-15T12:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase()) + '</div>'
        + months[k].map(m => tmCard(m, SU.items, list)).join('')).join('') : '<div class="field-note">No meetings yet.</div>') + '</div>';
  }
  function tmToggle(id){ TM.open[id] = !TM.open[id]; tmRender(); }
  function tmSearch(v){ TM.q = v; const l = document.getElementById('tmList'); tmRender(); const i = document.querySelector('#tmWrap input[placeholder^="Search"]'); if(i){ i.focus(); i.setSelectionRange(v.length, v.length); } }
  function tmShowArchived(on){ TM.showArchived = !!on; tmRender(); }
  function tmEdit(id){
    const list = people(), m = id ? (TM.items || []).find(x => x.id === id) : null;
    const v = m || { meeting_date: today(), meeting_name: TM_NAMES[0], attendee_emails: [] };
    const named = TM_NAMES.includes(v.meeting_name);
    const rowHtml = () => '<div class="tmA">'
      + '<input class="tmA_t" placeholder="Action item">'
      + '<select class="tmA_o"><option value="">Owner</option>' + list.map(p => '<option value="' + esc(p.email) + '">' + esc(p.name) + '</option>').join('') + '</select>'
      + '<input class="tmA_d" type="date"></div>';
    const existing = m ? (m.action_ids || []).map(x => (SU.items || []).find(i => i.id === x)).filter(Boolean) : [];
    const el = pop(
      '<div style="font-size:15px;font-weight:800;color:var(--navy);">' + (m ? 'Edit meeting' : 'Log a meeting') + '</div>'
      + '<div class="su-grid" style="margin-top:10px;">'
      + '<div><label class="field-note">Date</label><input id="tmF_date" type="date" value="' + esc(v.meeting_date || today()) + '" style="width:100%;"></div>'
      + '<div><label class="field-note">Meeting</label><select id="tmF_name" style="width:100%;">' + TM_NAMES.map(n => '<option' + (n === v.meeting_name ? ' selected' : '') + '>' + esc(n) + '</option>').join('')
      + '<option value="__other"' + (!named && m ? ' selected' : '') + '>Other</option></select>'
      + '<input id="tmF_other" placeholder="Meeting name" value="' + esc(!named && m ? v.meeting_name : '') + '" style="width:100%;margin-top:4px;' + (!named && m ? '' : 'display:none;') + '"></div></div>'
      + '<label class="field-note" style="display:block;margin-top:8px;">Who was there</label><div style="display:flex;gap:10px;flex-wrap:wrap;">'
      + list.map(p => '<label style="display:flex;gap:5px;align-items:center;font-size:13px;"><input type="checkbox" class="tmF_att" value="' + esc(p.email) + '" style="width:auto;"' + ((v.attendee_emails || []).includes(p.email) ? ' checked' : '') + '>' + esc(p.name) + '</label>').join('') + '</div>'
      + '<input id="tmF_others" placeholder="Anyone else (optional)" value="' + esc(v.attendees_other || '') + '" style="width:100%;margin-top:6px;">'
      + '<div id="tmF_carry" style="margin-top:10px;"></div>'
      + '<label class="field-note" style="display:block;margin-top:8px;">Notes / agenda</label><textarea id="tmF_notes" rows="5" style="width:100%;">' + esc(v.notes || '') + '</textarea>'
      + (existing.length ? '<div style="margin-top:8px;"><b style="font-size:12.5px;">Action items already on the board</b>' + existing.map(i => '<div class="field-note" style="font-size:12px;">' + (i.status === 'done' ? '✅ ' : '☐ ') + esc(i.summary) + ' · ' + esc(nameOf(i.assigned_to_email, list) || 'unassigned') + '</div>').join('') + '<div class="field-note" style="font-size:11.5px;">Change them on the Stand-Up board.</div></div>' : '')
      + '<div style="margin-top:8px;"><b style="font-size:12.5px;">New action items</b> <span class="field-note">(each goes on the Stand-Up board with its owner and due date)</span><div id="tmF_rows">' + rowHtml() + '</div>'
      + '<button class="secondary" id="tmF_more" style="padding:3px 9px;font-size:12px;margin-top:6px;">＋ Another</button></div>'
      + '<div style="display:flex;gap:8px;margin-top:12px;"><button class="primary" id="tmF_save">Save</button><button class="secondary" id="tmF_cancel">Cancel</button></div>',
      620);
    const g = k => el.querySelector('#tmF_' + k);
    const nameNow = () => g('name').value === '__other' ? g('other').value.trim() : g('name').value;
    const showCarry = () => {
      const c = tmCarry(TM.items || [], SU.items || [], g('date').value, nameNow(), m && m.id);
      g('carry').innerHTML = c.prior && (c.open.length || c.legacy.length)
        ? '<div style="background:var(--amber-bg);border-radius:9px;padding:8px 10px;"><b style="font-size:12.5px;">Still open from ' + esc(c.prior.meeting_name || 'the last meeting') + ', ' + esc(dayStr(c.prior.meeting_date + 'T12:00:00')) + '</b>'
          + c.open.map(i => '<div style="font-size:12.5px;">☐ ' + esc(i.summary) + ' <span class="field-note">· ' + esc(nameOf(i.assigned_to_email, list) || 'unassigned') + ' · ' + esc(SU_STATUS[i.status]) + (i.due ? ' · due ' + esc(dayStr(i.due + 'T12:00:00')) : '') + '</span></div>').join('')
          + c.legacy.map(t => '<div style="font-size:12.5px;">• ' + esc(t) + ' <span class="field-note">(older note)</span></div>').join('')
          + '<div class="field-note" style="font-size:11.5px;">These carry into this meeting so they are not lost.</div></div>'
        : '';
    };
    g('name').onchange = () => { g('other').style.display = g('name').value === '__other' ? '' : 'none'; showCarry(); };
    g('date').onchange = showCarry; g('other').oninput = showCarry; showCarry();
    g('more').onclick = () => g('rows').insertAdjacentHTML('beforeend', rowHtml());
    g('cancel').onclick = () => ccPopClose();
    g('save').onclick = async (ev) => {
      const date = g('date').value, name = nameNow();
      if(!date || !name){ say('Pick the date and the meeting name.'); return; }
      const rows = [...el.querySelectorAll('.tmA')].map(r => ({ t: r.querySelector('.tmA_t').value.trim(), o: r.querySelector('.tmA_o').value, d: r.querySelector('.tmA_d').value })).filter(r => r.t);
      ev.target.disabled = true;
      const att = [...el.querySelectorAll('.tmF_att:checked')].map(x => x.value);
      const fields = { meeting_date: date, meeting_name: name, attendee_emails: att, attendees_other: g('others').value.trim(),
        attendees: att.map(e => nameOf(e, list)).concat(g('others').value.trim() ? [g('others').value.trim()] : []).join(', '), notes: g('notes').value };
      const carry = tmCarry(TM.items || [], SU.items || [], date, name, m && m.id);
      const label = name + ', ' + dayStr(date + 'T12:00:00');
      let rec = m;
      if(!m){
        const who = me(), at = iso();
        rec = Object.assign({ id: newId('tm_'), action_ids: [], carried_ids: carry.open.map(i => i.id), source: 'manual', created_at: at, created_by: who.name,
          history: [{ at, by: who.name, by_email: who.email, what: 'Logged' + (carry.open.length ? ' (' + carry.open.length + ' open item' + (carry.open.length === 1 ? '' : 's') + ' carried from last time)' : '') }] }, fields);
      }
      const newIds = [];
      for(const r of rows){ const it = await suCreate({ summary: r.t, category: 'Meeting action', related_to: label, assigned_to_email: r.o, due: r.d, meeting_id: rec.id }, 'Added as an action item from ' + label); newIds.push(it.id); }
      if(!m){ rec.action_ids = newIds; await persist(TM_KEY, rec); (TM.items = TM.items || []).push(rec); }
      else {
        await tmMutate(m.id, x => {
          const lines = [];
          for(const k of ['meeting_date', 'meeting_name', 'notes', 'attendees_other']) if(String(x[k] || '') !== String(fields[k] || '')) lines.push(k === 'notes' ? 'Notes edited' : k === 'meeting_date' ? 'Date: ' + fields[k] : k === 'meeting_name' ? 'Meeting: ' + fields[k] : 'Others there: ' + (fields[k] || '(none)'));
          if(JSON.stringify((x.attendee_emails || []).slice().sort()) !== JSON.stringify(att.slice().sort())) lines.push('Who was there changed');
          Object.assign(x, fields);
          if(newIds.length){ x.action_ids = (x.action_ids || []).concat(newIds); lines.push(newIds.length + ' action item' + (newIds.length === 1 ? '' : 's') + ' added'); }
          return lines;
        });
      }
      ccPopClose(); tmRender(); suTodayRender();
    };
  }
  async function tmAct(id, what){
    if(what === 'archive' && !await ask('Archive this meeting? It is kept, with its history, under "Show archived". Its action items stay on the Stand-Up board.', 'Archive')) return;
    const who = me();
    await tmMutate(id, m => what === 'archive' ? (m.archived_at ? null : (m.archived_at = iso(), m.archived_by = who.name, 'Archived')) : (m.archived_at ? (m.archived_at = '', m.archived_by = '', 'Restored from the archive') : null));
    tmRender();
  }
  /* The same room the Team Hub button used. Its name (one nobody can guess) was copied by Desktop 449 into this Hub's
     own settings (ops_settings.team_video_room), so the Hub never needs the Team Hub's settings list (which also holds
     that hub's links). Nothing is made here: no room on file means it says so. The window opens first so the browser
     allows it. */
  async function tmVideo(){
    const w = window.open('about:blank', '_blank');
    try{
      const { data, error } = await sb.from('app_data').select('data').eq('key', 'ops_settings').maybeSingle();
      if(error) throw error;
      const room = data && data.data && !Array.isArray(data.data) && data.data.team_video_room && data.data.team_video_room.room_name;
      if(!room || !/^[A-Za-z0-9_-]{12,80}$/.test(room)){ if(w) w.close(); say('The team video room is not set up in this Hub yet. Tell Samantha.'); return; }
      const url = 'https://meet.jit.si/' + encodeURIComponent(room);
      if(w) w.location.href = url; else window.open(url, '_blank');
    }catch(e){ if(w) w.close(); say('Could not open the team video room just now. Try again in a moment.'); }
  }

  /* ---------------------------------------------- tab hooks ---------------------------------------------- */
  async function suOpen(){ suRender(); await suLoad(true); suRender(); }
  async function tmOpen(){ tmRender(); await Promise.all([tmLoad(true), suLoad(true)]); tmRender(); }
  setInterval(() => {
    try{
      if(typeof activeTab === 'undefined' || (typeof ccPopIsOpen === 'function' && ccPopIsOpen())) return;
      if(activeTab === 'standup') suLoad(true).then(suRender);
      if(activeTab === 'teammeetings') Promise.all([tmLoad(true), suLoad(true)]).then(tmRender);
    }catch(e){}
  }, REFRESH_MS);

  Object.assign(window, { suOpen, suRender, suSet, suEdit, suAct, suTodayRender, suTeamCountHtml, tmOpen, tmRender, tmToggle, tmSearch, tmShowArchived, tmEdit, tmAct, tmVideo,
    SUB: { suNorm, suAge, suSort, suFilter, suOpenFor, suDiff, tmPrior, tmCarry, safeUrl, isOverdue, SU, TM, SU_CATS } });
})();
