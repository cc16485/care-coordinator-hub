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
/* TO TALK ABOUT (2026-10-06, Samantha: "maybe we just have my work and my desk - then we can have a little indication to
   speak about this", "we have very informal meetings, basically i just get to the office between 9am-11am and stop and
   chat", "yes go ahead, talk about"). There is no Stand-Up meeting and no board to add to any more. Anything on My Work or
   a line on My Desk can carry a "Talk about" flag; the flag is an item on this same shared list (source 'work' with
   ops_id, or 'desk' with desk_line_id), so nothing new is stored anywhere. The Stand-Up tab is now the To talk about list:
   everyone's flags grouped by person, then what the Hub would mention on its own. "Talked" clears the flag; the thing itself
   stays where it was. Older board items show there too until someone answers them, so nothing is lost. */
(function(){
  'use strict';
  const SU_KEY = 'standup_notes', TM_KEY = 'team_meetings';
  const SU_CATS = ['Caregiver / Scheduling', 'Client', 'Lead', 'Incident', 'General', 'Meeting action'];
  const SU_STATUS = { open: 'Open', working: 'Working on it', done: 'Done' };
  const TM_NAMES = ['Weekly Team Meeting', 'Care Coordination Sync', 'Staffing Sync', 'All-Staff Meeting', 'Daily Stand-Up'];
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
    const hrs = Math.max(1, Math.round(ms / 36e5)), span = days >= 1 ? Math.floor(days) + ' day' + (Math.floor(days) === 1 ? '' : 's') : hrs + ' hour' + (hrs === 1 ? '' : 's');
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
  /* To talk about: everyone's flags, grouped by person (yours first), then what the Hub would mention on its own. */
  const whoOf = (i, list) => i.assigned_to_email ? nameOf(i.assigned_to_email, list) : (i.assigned_to || i.reported_by || 'Someone');
  const fromOf = i => i.source === 'desk' ? 'From their desk' : i.source === 'work' ? 'From My Work' : 'From the old Stand-Up board';
  const mineTo = (i, m) => lc(i.assigned_to_email) === m.email || lc(i.reported_by_email) === m.email;
  function talkRow(i, list, m){
    const id = esc(i.id), age = suAge(i), old = i.source !== 'desk' && i.source !== 'work';
    const acts = btn('Talked ✓', "suAct('" + id + "','talked')", 'primary')
      + (i.source === 'work' && i.ops_id ? btn('Open in My Work', "suOpenWork('" + esc(i.ops_id) + "')") : '')
      + (old ? btn('Still needs doing: put it on My Work', "suAct('" + id + "','towork')") : '')
      + (mineTo(i, m) ? btn('Take the flag off', "suAct('" + id + "','unflag')", 'secondary', 'color:var(--text-muted);') : '');
    return '<div class="card su-talk" data-id="' + id + '" style="padding:10px 13px;margin-bottom:7px;border-left:4px solid ' + (i.urgent ? 'var(--red)' : 'var(--teal)') + ';">'
      + '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;">' + (i.urgent ? chip('URGENT', 'var(--red)', '#fff') : '')
      + '<b style="flex:1;min-width:200px;color:var(--navy);font-size:14.5px;">' + esc(i.summary || '(no description)') + '</b></div>'
      + '<div class="field-note" style="margin-top:3px;font-size:12px;">' + esc(fromOf(i)) + (i.client ? ' · ' + esc(i.client) : '') + (age.label ? ' · flagged ' + esc(age.label.replace(/^open /, '')) + ' ago' : '') + '</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px;">' + acts + '</div></div>';
  }
  function suRender(){
    const box = document.getElementById('suWrap'); if(!box) return;
    if(!SU.items){ box.innerHTML = '<div class="field-note">Loading…</div>'; return; }
    const list = people(), m = me();
    const open = suSort(SU.items.filter(i => !i.archived_at && i.status !== 'done'));
    const groups = new Map();
    open.forEach(i => { const name = whoOf(i, list), k = lc(i.assigned_to_email) || 'name:' + lc(name);
      if(!groups.has(k)) groups.set(k, { name, email:lc(i.assigned_to_email), items:[] }); groups.get(k).items.push(i); });
    const gs = [...groups.values()].sort((a, b) => ((b.email === m.email) - (a.email === m.email)) || a.name.localeCompare(b.name));
    const flaggedOps = new Set(open.filter(i => i.source === 'work' && i.ops_id).map(i => String(i.ops_id)));
    let hub = []; try{ hub = prepList().filter(r => r.kind !== 'su' && !(r.kind === 'ops' && flaggedOps.has(String(r.id)))); }catch(e){}   /* already flagged: shown once, above */
    const W8 = worthRows(hub);
    const week = Date.now() - 7 * 864e5;
    const recent = SU.items.filter(i => i.status === 'done' && !i.archived_at && (Date.parse(i.talked_at || i.done_at || '') || 0) > week)
      .sort((a, b) => String(b.talked_at || b.done_at || '').localeCompare(String(a.talked_at || a.done_at || '')));
    let lastSec = '';
    box.innerHTML = '<div style="display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;margin-bottom:12px;">'
      + '<div><h2 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.02em;color:var(--navy);">To talk about</h2>'
      + '<div class="field-note">What people flagged to bring up the next time you\'re together, from My Work or a line on My Desk. Tap Talked once you\'ve covered it; it stays where it was. Nothing here texts or emails anyone.</div></div>'
      + '<span style="flex:1;"></span><button class="primary" onclick="suTalkNew(this)">＋ Something to talk about</button></div>'
      + (SU.err ? '<div class="field-note" style="color:var(--red);margin-bottom:8px;">Couldn\'t refresh (' + esc(SU.err) + '). What you see may be out of date.</div>' : '')
      + (gs.length ? gs.map(g => '<div class="su-tgroup" style="margin-bottom:14px;"><div style="font-size:15px;font-weight:800;color:var(--navy);margin:6px 0 6px;">'
          + esc(g.email === m.email ? 'You' : g.name) + ' <span class="field-note" style="font-weight:600;">(' + g.items.length + ')</span></div>'
          + g.items.map(i => talkRow(i, list, m)).join('') + '</div>').join('')
        : '<div class="card" style="padding:14px 16px;margin-bottom:12px;"><div class="field-note">Nothing flagged. On a My Work card tap <b>Talk about</b>, or on your desk press <b>S</b> on a line.</div></div>')
      + (W8.rows.length || W8.older ? '<div style="margin-top:18px;"><div style="font-size:15px;font-weight:800;color:var(--navy);">Worth mentioning</div>'
          + '<div class="field-note" style="margin-bottom:6px;">The Hub found these on its own this week: urgent work, coverage for today and tomorrow, client and staffing issues, promises due. Click one to read it.</div>'
          + W8.rows.map(r => { const head = r.sec !== lastSec ? '<div style="font-size:11.5px;font-weight:800;letter-spacing:.06em;color:var(--text-muted);margin:10px 0 4px;">' + esc(r.sec.toUpperCase()) + '</div>' : ''; lastSec = r.sec;
              return head + worthHtml(r); }).join('')
          + (W8.older ? '<div class="field-note" style="margin-top:8px;">' + W8.older + ' older item' + (W8.older === 1 ? '' : 's') + ' (more than a week late) ' + (W8.older === 1 ? 'isn\'t' : 'aren\'t') + ' shown here. They\'re in <a href="#ops" onclick="switchTab(\'ops\');return false;">Needs Attention</a>.</div>' : '')
          + '</div>' : '')
      + (recent.length ? '<details style="margin-top:16px;"><summary class="field-note" style="cursor:pointer;">Talked about this week (' + recent.length + ')</summary>'
          + recent.map(i => '<div class="field-note" style="font-size:12.5px;margin-top:4px;">' + esc(whenStr(i.talked_at || i.done_at)) + ' · ' + esc(whoOf(i, list)) + ': ' + esc(i.summary || '') + '</div>').join('') + '</details>' : '');
  }
  /* Worth mentioning: what each thing IS (its kind and title), who has it and how late; click to read it. The same
     thing twice shows once ("× 3"). More than a week late = not news any more; counted, and left to Needs Attention. */
  const WEEK = 7 * 864e5;
  function worthRows(hub){
    const ops = (typeof DATA !== 'undefined' && DATA.ops_items) || [], byId = new Map(ops.map(i => [String(i.id), i]));
    const out = [], seen = new Map(); let older = 0;
    hub.forEach(r => {
      const it = r.kind === 'ops' ? byId.get(String(r.id)) : null;
      const due = it && Date.parse(it.due || '');
      if(it && due && Date.now() - due > WEEK){ older++; return; }
      const kindL = it ? (typeof opsKindLabel === 'function' ? opsKindLabel(it) : it.kind) : (r.kind === 'case' ? 'Open shift' : '');
      const what = it ? String(it.title || it.about || '') : String(r.title || '');
      const key = r.sec + '|' + kindL + '|' + what + '|' + (it ? it.about || '' : '');
      if(seen.has(key)){ seen.get(key).n++; return; }
      const row = { sec:r.sec, id:String(r.id), kind:r.kind, it, kindL, what, n:1,
        about:it && it.about && !what.toLowerCase().includes(String(it.about).toLowerCase()) ? it.about : '',
        who:it ? (it.owner ? (it.owner_name || it.owner).split(' ')[0] : 'Nobody has it yet') : '',
        when:it ? (due ? (due < Date.now() ? 'was due ' + whenStr(it.due) : 'due ' + whenStr(it.due)) : 'no time set') : (r.sub || '') };
      seen.set(key, row); out.push(row);
    });
    return { rows:out, older };
  }
  function worthHtml(r){
    const it = r.it, detail = it && it.detail ? String(it.detail).slice(0, 900) + (String(it.detail).length > 900 ? '…' : '') : '';
    return '<details class="su-hubrow" style="border:1px solid var(--border);border-radius:8px;padding:7px 10px;margin-bottom:5px;background:#fff;">'
      + '<summary style="cursor:pointer;list-style:none;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;">'
      + (r.kindL ? chip(r.kindL, '#F3EDE3', 'var(--navy)') : '')
      + '<b style="color:var(--navy);flex:1 1 260px;min-width:0;">' + esc(r.what || '(no title)') + (r.n > 1 ? ' <span class="field-note">× ' + r.n + '</span>' : '') + '</b>'
      + '<span class="field-note">' + esc([r.about, r.who, r.when].filter(Boolean).join(' · ')) + '</span></summary>'
      + (detail ? '<div class="field-note" style="margin-top:6px;white-space:pre-wrap;font-size:12.5px;">' + esc(detail) + '</div>' : (it ? '' : '<div class="field-note" style="margin-top:6px;">' + esc(r.when) + '</div>'))
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px;">'
      + (it ? btn('Talk about it', "suWorthFlag('" + esc(r.id) + "')", 'primary') + btn('Open in Needs Attention', "switchTab('ops')") : btn('Open the shift', "switchTab('coverage')"))
      + '</div></details>';
  }
  async function suWorthFlag(opsId){
    const it = ((typeof DATA !== 'undefined' && DATA.ops_items) || []).find(x => String(x.id) === String(opsId)); if(!it) return;
    try{ await suTalk.flagWork(it); say('Flagged to talk about'); }catch(e){ say("Couldn't flag that just now."); }
    suRender(); suTodayRender();
  }
  function suOpenWork(opsId){
    switchTab('mywork');
    setTimeout(() => { const c = document.querySelector('.wkcard[data-id="' + (window.CSS && CSS.escape ? CSS.escape(opsId) : opsId) + '"]');
      if(c){ c.scrollIntoView({ block:'center', behavior:'smooth' }); c.classList.add('dk-flash'); setTimeout(() => c.classList.remove('dk-flash'), 1600); } else say('That one is not on your My Work list (it may be someone else\'s or already done).'); }, 350);
  }
  /* "＋ Something to talk about": a line on your desk with the flag on (or, without a desk, a My Work reminder). */
  function suTalkNew(anchor){
    if(typeof dkAllowed === 'function' && dkAllowed() && typeof dkJotOpen === 'function') dkJotOpen(anchor, { talk:true });
    else if(typeof ccCaptureOpen === 'function') ccCaptureOpen({ talk:true });
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
    if(what === 'talked'){
      await suMutate(id, it => { if(it.status === 'done') return null; it.status = 'done'; it.talked_at = iso(); it.done_at = it.talked_at; it.done_by = m.name;
        it.resolved_at = it.done_at; it.resolved_by = m.name; return 'Talked about'; });
      say('Talked about. The flag is off.');
    } else if(what === 'unflag'){
      await suMutate(id, it => { if(it.archived_at) return null; it.archived_at = iso(); it.archived_by = m.name; return 'Flag taken off'; });
    } else if(what === 'towork'){
      const it = (SU.items || []).find(x => x.id === id); if(!it || typeof ccCaptureOpen !== 'function') return;
      ccCaptureOpen({ text:it.summary || '', about:it.client || it.related_to || '', after: async () => { await suMutate(id, x => { if(x.status === 'done') return null; x.status = 'done';
        x.talked_at = iso(); x.done_at = x.talked_at; x.done_by = m.name; x.resolved_at = x.done_at; x.resolved_by = m.name; return 'Put on My Work'; }); suRender(); suTodayRender(); } });
      return;
    } else if(what === 'update'){
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
  /* TOP OF THE DASHBOARD (2026-10-05, her call: "i want to make sure stand up board isnt a seperate thing that is not
     used"). The open board items, urgent first, up to five, with whose and how old, and the button to add one. */
  function suTodayRender(){
    const box = document.getElementById('suTodayLine'); if(!box) return;
    if(!SU.items){ suLoad().then(suTodayRender); return; }
    const list = people(), m = me();
    const open = suSort(SU.items.filter(i => !i.archived_at && i.status !== 'done'));
    const mine = open.filter(i => lc(i.assigned_to_email) === m.email).length;
    const row = i => '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;padding:7px 0;border-top:1px solid var(--border);cursor:pointer;" onclick="switchTab(\'standup\')">'
      + (i.urgent ? chip('URGENT', 'var(--red)', '#fff') : '')
      + '<b style="flex:1 1 220px;min-width:0;color:var(--navy);">' + esc(i.summary || '(no description)') + '</b>'
      + '<span class="field-note">' + esc(String(whoOf(i, list)).split(' ')[0]) + '</span></div>';
    box.innerHTML = '<div class="card" style="padding:13px 16px;">'
      + '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:4px;">'
      + '<b style="font-size:16px;color:var(--navy);">To talk about</b>'
      + '<span class="field-note">' + open.length + ' flagged' + (mine ? ' · ' + mine + ' yours' : '') + '</span>'
      + '<span style="flex:1;"></span>'
      + '<button class="secondary" style="padding:6px 12px;font-size:12.5px;" onclick="switchTab(\'standup\')">Open the list</button></div>'
      + (open.length ? open.slice(0, 5).map(row).join('') + (open.length > 5 ? '<div class="field-note" style="padding-top:6px;">plus ' + (open.length - 5) + ' more</div>' : '')
        : '<div class="field-note" style="padding:6px 0 2px;">Nothing flagged. Tap Talk about on anything in My Work or on your desk to bring it up next time you\'re together.</div>')
      + '</div>';
  }
  /* the line on each My Team card (renderMyTeam calls this) */
  function suTeamCountHtml(email){
    if(!SU.items){ if(!SU._teamAsked){ SU._teamAsked = true; suLoad().then(() => { try{ if(typeof activeTab !== 'undefined' && activeTab === 'myteam') renderMyTeam(); }catch(e){} }); } return ''; }
    const c = suOpenFor(SU.items, email);
    return '<span style="cursor:pointer;" onclick="suSet(\'who\',\'' + esc(lc(email)) + '\');switchTab(\'standup\')">' + c.open + ' to talk about'
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
      + '<span class="field-note">' + (acts.length ? acts.filter(i => i.status !== 'done').length + ' of ' + acts.length + ' action items open'
          : (legacy.length ? 'notes only (older action items)' : 'notes only')) + ' ' + (open ? '▾' : '▸') + '</span></div>'
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
      + '<button class="primary" onclick="tmPrepare()">Prepare a meeting</button>'
      + '<button class="secondary" onclick="tmEdit()">＋ Log a meeting</button>'
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


  /* ---------------------------------------------- Prepare Stand-Up (Phase 4) ----------------------------------------------
     Her words (2026-10-05): "The Hub should automatically assemble unresolved/high-risk items, coverage concerns, client
     issues, staffing issues, promises due, and yesterday's carryovers. The team can then review that short list together
     and make decisions." One list, each item once, in that order. For each: who has it, and room to decide (owner, by
     when, a note). Log this stand-up writes the decisions onto the items themselves (with the history saying "Stand-up")
     and keeps the meeting under Team Meetings as "Daily Stand-Up". Nothing is texted or emailed. */
  function prepList(){
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    const tom = new Date(Date.now() + 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    const eod = (() => { const e = new Date(); e.setHours(23, 59, 59, 999); return e.getTime(); })();
    const ops = ((typeof DATA !== 'undefined' && DATA.ops_items) || []).filter(i => i && i.status === 'open');
    const seen = new Set(), out = [];
    const ownerTag = i => (typeof opsOwnerTag === 'function' ? opsOwnerTag(i) : (i.owner_name || i.owner || 'Unassigned'));
    const add = (sec, kind, id, title, sub) => { const k = kind + ':' + id; if(seen.has(k)) return; seen.add(k); out.push({ sec, kind, id: String(id), title, sub }); };
    const tier0 = i => typeof opsPriorityKey === 'function' && opsPriorityKey(i)[0] === 0;
    /* what people flagged to talk about comes first */
    suSort((SU.items || []).filter(i => !i.archived_at && i.status !== 'done' && (i.source === 'desk' || i.source === 'work'))).forEach(i => add('Flagged to talk about', 'su', i.id,
      i.summary || '', (i.assigned_to_email ? nameOf(i.assigned_to_email) : (i.reported_by || 'Someone')) + (i.source === 'desk' ? "'s desk" : ', My Work')));
    ops.filter(i => i.urgency === 'urgent' || (i.escalation && !i.escalation.cleared_at && i.escalation.level === 'urgent') || tier0(i))
      .forEach(i => add('Urgent and high-risk, not resolved', 'ops', i.id, i.about || i.title || '', ownerTag(i)));
    ((typeof DATA !== 'undefined' && DATA.coverage_cases) || []).filter(c => c && c.status === 'open' && String(c.kind) !== 'interest' && [today, tom].includes(String(c.shift_date)))
      .sort((a, b) => String(a.shift_date + a.shift_time).localeCompare(String(b.shift_date + b.shift_time)))
      .forEach(c => add('Coverage today and tomorrow', 'case', c.id, (c.client || 'Client') + ' · ' + (String(c.shift_date) === today ? 'today' : 'tomorrow') + ' '
        + String(c.shift_time || '').split('-').map(x => { const m = /^(\d{1,2}):(\d{2})$/.exec(x.trim()); if(!m) return x; let h = +m[1]; const ap = h < 12 ? 'am' : 'pm'; h = h % 12 || 12; return h + (m[2] === '00' ? '' : ':' + m[2]) + ap; }).join('-'),
        (c.calling_off ? c.calling_off + ' called off · ' : '') + ((c.asked || []).length ? (c.asked || []).length + ' asked' : 'nobody asked yet')));
    ops.filter(i => i.kind === 'client_issue').forEach(i => add('Client issues', 'ops', i.id, i.about || i.title || '', ownerTag(i)));
    ops.filter(i => ['staffing_issue', 'evv_fix', 'coverage_outcome', 'family_call', 'coverage'].includes(i.kind)).forEach(i => add('Staffing issues', 'ops', i.id, i.about || i.title || '', ownerTag(i)));
    ops.filter(i => ['promise_update', 'promise_lapsed'].includes(i.kind) && Date.parse(i.due || '') <= eod).forEach(i => add('Promises due', 'ops', i.id, i.about || i.title || '', ownerTag(i)));
    suSort((SU.items || []).filter(i => !i.archived_at && i.status !== 'done')).forEach(i => add('From the old Stand-Up board', 'su', i.id,
      (i.urgent ? 'URGENT · ' : '') + (i.summary || ''), (i.assigned_to_email ? nameOf(i.assigned_to_email) : (i.assigned_to || 'Unassigned')) + ' · ' + suAge(i).label));
    const c = tmCarry(TM.items || [], SU.items || [], today, 'Daily Stand-Up');
    (c.open || []).forEach(i => add('Carried over: the Stand-Up board', 'su', i.id, i.summary || '', 'from ' + (c.prior ? c.prior.meeting_name : 'the last meeting')));
    return out;
  }
  async function tmPrepare(){
    await Promise.all([suLoad(true), tmLoad(true)]);
    const list = people(), rows = prepList(), today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    let lastSec = '';
    const opt = list.map(p => '<option value="' + esc(p.email) + '">' + esc(p.name) + '</option>').join('');
    const body = rows.map((r, n) => { const head = r.sec !== lastSec ? '<div style="font-size:11.5px;font-weight:800;letter-spacing:.06em;color:var(--text-muted);margin:12px 0 4px;">' + esc(r.sec.toUpperCase()) + '</div>' : ''; lastSec = r.sec;
      return head + '<div class="prepRow" data-n="' + n + '" style="border:1px solid var(--border);border-radius:8px;padding:7px 9px;margin-bottom:5px;">'
        + '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;"><label style="display:flex;gap:6px;align-items:baseline;flex:1 1 260px;min-width:0;"><input type="checkbox" class="prepDone" style="width:auto;margin:0;"><b style="color:var(--navy);">' + esc(r.title) + '</b></label>'
        + '<span class="field-note">' + esc(r.sub || '') + '</span></div>'
        + '<div class="su-grid" style="grid-template-columns:1fr 1fr 2fr;margin-top:5px;">'
        + '<select class="prepOwner" style="font-size:12.5px;"><option value="">Owner: keep</option>' + opt + '</select>'
        + '<input class="prepDue" type="date" title="By when" style="font-size:12.5px;">'
        + '<input class="prepNote" placeholder="Decision or next step" style="font-size:12.5px;"></div></div>'; }).join('');
    const el = pop('<div style="font-size:16px;font-weight:800;color:var(--navy);">Prepare a meeting · ' + esc(dayStr(today + 'T12:00:00')) + '</div>'
      + '<div class="field-note" style="margin:3px 0 8px;">The Hub assembled this. Go down it together: tick what you discussed, and set an owner, a by-when or a decision where you made one. Logging writes each decision onto its item. Nothing is texted or emailed.</div>'
      + (rows.length ? body : '<div class="field-note" style="padding:10px 0;">Nothing urgent, no open coverage for today or tomorrow, no client or staffing issues, no promises due, and the board is clear.</div>')
      + '<div style="margin-top:10px;"><b style="font-size:12.5px;">Who was there</b><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px;">'
      + list.map(p => '<label style="display:flex;gap:5px;align-items:center;font-size:13px;"><input type="checkbox" class="prepAtt" value="' + esc(p.email) + '" style="width:auto;margin:0;">' + esc(p.name) + '</label>').join('') + '</div></div>'
      + '<div style="display:flex;gap:8px;margin-top:12px;"><button class="primary" id="prepLog">Log this stand-up</button><button class="secondary" id="prepCancel">Close without logging</button></div>',
      780);
    el.querySelector('#prepCancel').onclick = () => ccPopClose();
    el.querySelector('#prepLog').onclick = async (ev) => {
      ev.target.disabled = true;
      const lines = [], who = me(), reviewed = [];
      for(const node of el.querySelectorAll('.prepRow')){
        const r = rows[Number(node.dataset.n)];
        const owner = node.querySelector('.prepOwner').value, due = node.querySelector('.prepDue').value, note = node.querySelector('.prepNote').value.trim().slice(0, 500);
        const done = node.querySelector('.prepDone').checked;
        if(!(owner || due || note || done)) continue;
        reviewed.push(r.kind + ':' + r.id);
        const what = [owner ? 'owner ' + nameOf(owner, list) : '', due ? 'by ' + dayStr(due + 'T12:00:00') : '', note].filter(Boolean).join(', ');
        lines.push('• ' + r.title + (what ? ': ' + what : ': discussed'));
        try{
          if(r.kind === 'ops'){
            const it = (DATA.ops_items || []).find(x => String(x.id) === r.id); if(!it) continue;
            if(owner && owner !== String(it.owner || '').toLowerCase() && typeof opsSetOwner === 'function') await opsSetOwner(it.id, owner, nameOf(owner, list), 'Stand-up' + (note ? ': ' + note : ''));
            const it2 = (DATA.ops_items || []).find(x => String(x.id) === r.id) || it;
            let touched = false;
            if(due){ it2.due = new Date(due + 'T17:00:00').toISOString(); touched = true; }
            if(note && !owner){ if(typeof opsLog === 'function') opsLog(it2, 'Stand-up: ' + note); touched = true; }
            if(touched) await persist('ops_items', it2);
          } else if(r.kind === 'su'){
            await suMutate(r.id, (it, before) => { if(owner) it.assigned_to_email = owner; if(due) it.due = due;
              if((it.source === 'desk' || it.source === 'work') && !it.talked_at) it.talked_at = iso();   /* the card goes back to their desk stamped "talked about" */
              if(note) it.updates = it.updates.concat([{ at: iso(), by: who.name, by_email: who.email, text: 'Stand-up: ' + note }]);
              const d = suDiff(before, it, list); return d.length || note ? (d.length ? d : ['Discussed at stand-up']) : 'Discussed at stand-up'; });
          } else if(r.kind === 'case'){
            const fresh = (await readKey('coverage_cases')).find(x => String(x.id) === r.id);
            if(fresh){ if(owner) fresh.owner = owner; if(note) fresh.note = [String(fresh.note || '').trim(), 'Stand-up (' + who.name + '): ' + note].filter(Boolean).join('\n');
              if(owner || note) await persist('coverage_cases', fresh); }
          }
        }catch(e){ lines.push('  (could not save that decision: ' + String(e && e.message || e).slice(0, 80) + ')'); }
      }
      const att = [...el.querySelectorAll('.prepAtt:checked')].map(x => x.value);
      const rec = { id: newId('tm_'), meeting_name: 'Daily Stand-Up', meeting_date: today, attendee_emails: att, attendees_other: '',
        attendees: att.map(e => nameOf(e, list)).join(', '), notes: lines.length ? 'Decisions:\n' + lines.join('\n') : 'Reviewed the list; no changes.',
        action_ids: [], carried_ids: rows.filter(r => r.kind === 'su').map(r => r.id), reviewed, items_on_list: rows.length,
        source: 'prepare', created_at: iso(), created_by: who.name, history: [{ at: iso(), by: who.name, by_email: who.email, what: 'Logged from Prepare Stand-Up (' + rows.length + ' items, ' + reviewed.length + ' discussed)' }] };
      await persist(TM_KEY, rec); (TM.items = TM.items || []).push(rec);
      ccPopClose(); say('✓ Stand-up logged: ' + reviewed.length + ' discussed'); tmRender(); suRender(); suTodayRender();
    };
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

  /* ---------------------------------------------- the Stand-Up schedule (My Desk Stage 4, 2026-10-06) ----------------------------------------------
     Samantha: "Stand-Up is every weekday at 9:00 AM Central. Please have My Desk read that from the Team Meetings schedule rather
     than hard-coding it." It lives in ops_settings.standup_schedule { days:[1-7, Monday = 1], time:'HH:MM' } and is changed here,
     in Team Meetings. Until somebody saves one, her answer is what is used. */
  const SCHED_DEFAULT = { days:[1, 2, 3, 4, 5], time:'09:00' };
  const DNAME = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  function suSchedule(){
    const s = (typeof DATA !== 'undefined' && DATA.ops_settings && DATA.ops_settings.standup_schedule) || null;
    const days = s && Array.isArray(s.days) ? s.days.map(Number).filter(d => d >= 1 && d <= 7) : [];
    const time = s && /^\d{2}:\d{2}$/.test(String(s.time || '')) ? s.time : '';
    return days.length && time ? { days:[...new Set(days)].sort(), time, saved:true } : Object.assign({ saved:false }, SCHED_DEFAULT);
  }
  const hm12 = t => { const [h, m] = t.split(':').map(Number); return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h < 12 ? 'AM' : 'PM'); };
  function suSchedWords(){
    const s = suSchedule(), d = s.days.join();
    const days = d === '1,2,3,4,5' ? 'every weekday' : d === '1,2,3,4,5,6,7' ? 'every day' : s.days.map(x => DNAME[x]).join(', ');
    return days + ' at ' + hm12(s.time) + ' Central';
  }
  /* The next Stand-Up from now (Central time): { day:'YYYY-MM-DD', time:'HH:MM', label:'TUE 9:00', words:'Tuesday at 9:00 AM' }. */
  function suNextStandup(now){
    const s = suSchedule(), base = now ? new Date(now) : new Date();
    const nowHm = base.toLocaleTimeString('en-GB', { timeZone:'America/Chicago', hour:'2-digit', minute:'2-digit' });
    const today = base.toLocaleDateString('en-CA', { timeZone:'America/Chicago' });
    for(let k = 0; k < 15; k++){
      const [y, m, dd] = today.split('-').map(Number), d = new Date(y, m - 1, dd + k), dow = ((d.getDay() + 6) % 7) + 1;
      if(!s.days.includes(dow) || (k === 0 && nowHm >= s.time)) continue;
      const day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      return { day, time:s.time, label:DNAME[dow].toUpperCase() + ' ' + hm12(s.time).replace(/ (AM|PM)$/, ''), words:(k === 0 ? 'today' : d.toLocaleDateString('en-US', { weekday:'long' })) + ' at ' + hm12(s.time) };
    }
    return null;
  }
  function suSchedEdit(anchor){
    const s = suSchedule();
    const el = ccPopOpen(anchor, '<div style="font-size:14.5px;font-weight:800;color:var(--navy);">When is Stand-Up?</div>'
      + '<div class="field-note" style="margin:3px 0 10px;">Everyone\'s My Desk tray reads this, so changing it here changes it everywhere.</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">' + [1, 2, 3, 4, 5, 6, 7].map(d => '<label style="display:flex;gap:4px;align-items:center;font-size:13px;"><input type="checkbox" class="suSD" value="' + d + '" style="width:auto;margin:0;"' + (s.days.includes(d) ? ' checked' : '') + '> ' + DNAME[d] + '</label>').join('') + '</div>'
      + '<label class="field-note">Time (Central)</label> <input type="time" id="suST" value="' + s.time + '" style="width:auto;">'
      + '<div style="display:flex;gap:8px;margin-top:12px;align-items:center;"><button class="primary" id="suSSave">Save</button><button class="secondary" id="suSNo">Cancel</button><span class="field-note" id="suSMsg"></span></div>', { width:360 });
    el.querySelector('#suSNo').onclick = () => ccPopClose();
    el.querySelector('#suSSave').onclick = async ev => {
      const days = [...el.querySelectorAll('.suSD:checked')].map(x => Number(x.value)), time = el.querySelector('#suST').value;
      const msg = el.querySelector('#suSMsg');
      if(!days.length || !/^\d{2}:\d{2}$/.test(time)){ msg.textContent = 'Pick at least one day and a time.'; return; }
      ev.target.disabled = true;
      const who = me();
      const out = typeof tkMerge === 'function' ? await tkMerge(m => { m.standup_schedule = { days, time, set_by:who.name, set_at:iso() }; return ['Stand-Up schedule']; }, 'the Stand-Up schedule') : { error:{ message:'the settings save is not on this page' } };
      ev.target.disabled = false;
      if(out.error){ msg.textContent = 'Could not save: ' + out.error.message; return; }
      DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { standup_schedule:{ days, time } });
      ccPopClose(); say('Stand-Up: ' + suSchedWords()); tmRender(); if(typeof dkRefresh === 'function') dkRefresh();
    };
  }
  /* My Desk's Stand-Up tray: a card dropped in the tray is that person's item on this board (source 'desk'). Taking it back
     out before Stand-Up archives it; after Stand-Up the person decides "All set" (done) or "Something to do" (done, back on
     their desk). Nothing here texts or emails anyone. */
  const suDesk = {
    async create(summary, lineId){
      const m = me();
      const it = await suCreate({ summary:String(summary || '').slice(0, 500), category:'General', assigned_to_email:m.email, source:'desk', desk_line_id:lineId },
        'Flagged to talk about from ' + String(m.name).split(' ')[0] + "'s desk");
      return it.id;
    },
    async status(ids){
      const all = await readKey(SU_KEY), out = {};
      (ids || []).forEach(id => { const i = all.find(x => x && x.id === id); out[id] = i ? { talked_at:i.talked_at || null, status:SU_STATUS[i.status] ? i.status : (i.resolved ? 'done' : 'open'), archived_at:i.archived_at || null } : null; });
      return out;
    },
    takeOut: id => suMutate(id, it => { if(it.archived_at) return null; it.archived_at = iso(); return 'Flag taken off'; }),
    finish: (id, what) => suMutate(id, it => { if(it.status === 'done') return null; it.status = 'done'; it.done_at = iso(); it.done_by = me().name; it.resolved_at = it.done_at; it.resolved_by = me().name; return what || 'All set after Stand-Up'; })
  };

  /* the flag on a My Work card (an ops item): one open flag per item, on the list under whoever owns it */
  const suTalk = {
    forWork: opsId => (SU.items || []).find(i => i.source === 'work' && i.ops_id === opsId && !i.archived_at && i.status !== 'done') || null,
    async flagWork(it){
      await suLoad(true);
      const had = suTalk.forWork(it.id); if(had) return had.id;
      const m = me(), owner = lc(it.owner) || m.email;
      const made = await suCreate({ summary:String(it.title || it.about || 'My Work item').slice(0, 500), related_to:String(it.about || '').slice(0, 200), category:'General',
        assigned_to_email:owner, source:'work', ops_id:it.id }, 'Flagged to talk about by ' + String(m.name).split(' ')[0] + ' (from My Work)');
      return made.id;
    },
    unflagWork: async opsId => { await suLoad(true); const f = suTalk.forWork(opsId); if(f) await suMutate(f.id, x => { if(x.archived_at) return null; x.archived_at = iso(); x.archived_by = me().name; return 'Flag taken off'; }); return true; },
    load: f => suLoad(f), ready: () => !!SU.items
  };
  Object.assign(window, { suSchedule, suSchedWords, suNextStandup, suSchedEdit, suDesk, suTalk, suOpenWork, suTalkNew, suWorthFlag });
  Object.assign(window, { suOpen, suRender, suSet, suEdit, suAct, suTodayRender, suTeamCountHtml, tmOpen, tmRender, tmToggle, tmSearch, tmShowArchived, tmEdit, tmAct, tmVideo, tmPrepare, prepList,
    SUB: { suNorm, suAge, suSort, suFilter, suOpenFor, suDiff, tmPrior, tmCarry, safeUrl, isOverdue, SU, TM, SU_CATS } });
})();
