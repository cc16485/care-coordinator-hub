/* =====================================================================================================================
   KATLIN'S PAGE (Samantha 2026-11-10: "I want it to be just for Katlin, because she's my sister I can give her
   various tasks" ... "her own page that can be attached on the side menu", not mixed in with everyone's screens.)
   One page in the Today menu, seen only by the person it belongs to and the owners. Whose page it is lives in
   ops_settings.katlin_page.email (picked by an owner on the page itself), so no name or email is in this code.
   What it holds:
     1. Tasks from Samantha: once / every day / every week. Owners add and remove them; she ticks them off.
     2. This week's Nextdoor post (nextdoor/posts.json + photos): Copy text, save photo, "I posted it".
     3. Coming up: the next Nextdoor posts, to work ahead.
     4. Send Samantha a note: the Hub's existing "message to the Owners" (staffing_tasks, direction to_owners),
        which becomes a card in the owners' My Work.
   Saved in ops_settings.katlin_page through tkMerge, so who changed what and when is kept (op_events).
   Nothing here texts, emails or calls anyone.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const W = root, TZ = 'America/Chicago';
  const lc = s => String(s || '').trim().toLowerCase();
  const D = () => { try{ return DATA || {}; }catch(e){ return {}; } };
  const esc = s => (typeof W.escapeHtmlComms === 'function' ? W.escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
  const me = () => { try{ return lc(W.ccActor().email); }catch(e){ return ''; } };
  const meName = () => { try{ return W.ccActor().name || me(); }catch(e){ return me(); } };
  const owner = () => { try{ return !!W.ccIsOwner(); }catch(e){ return false; } };
  const nameOf = e => { try{ return (typeof W.opsOwnerName === 'function' && W.opsOwnerName(e)) || String(e || '').split('@')[0]; }catch(_){ return String(e || '').split('@')[0]; } };
  const first = e => String(nameOf(e) || '').split(' ')[0];

  /* ── pure rules (tested in node) ── */
  /* "2026-11-10" in Missouri */
  function dayOf(t){ return new Date(t).toLocaleDateString('en-CA', { timeZone:TZ }); }
  /* Monday of that Missouri day's week, as "YYYY-MM-DD" */
  function weekOf(day){
    const d = new Date(day + 'T12:00:00Z'); const dow = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dow); return d.toISOString().slice(0, 10);
  }
  /* Is a task done for today? once: ticked ever · daily: ticked today · weekly: ticked this week (Mon to Sun) */
  function isDone(task, done, today){
    const d = (done || {})[task.id]; if(!d || !d.at) return false;
    if(task.every === 'day') return dayOf(d.at) === today;
    if(task.every === 'week') return weekOf(dayOf(d.at)) === weekOf(today);
    return true;
  }
  /* This week's post: the latest one dated today or earlier; before the first one, the first one. */
  function currentPost(posts, today){
    const list = (posts || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    if(!list.length) return null;
    let cur = null; list.forEach(p => { if(p.date <= today) cur = p; });
    return cur || list[0];
  }
  function upcoming(posts, cur, n){
    const list = (posts || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    return list.filter(p => !cur || p.date > cur.date).slice(0, n);
  }
  /* Earlier posts that were never marked posted (the last 4 weeks only, so an old miss doesn't nag forever) */
  function missed(posts, cur, posted, today){
    if(!cur) return [];
    const back = dayOf(new Date(today + 'T12:00:00Z').getTime() - 28 * 864e5);
    return (posts || []).filter(p => p.date < cur.date && p.date >= back && !(posted || {})[p.week]);
  }
  const STARTER = [
    { id:'kp_nd_search', every:'day', text:'Search Nextdoor for neighbors asking for care (home care, caregiver, elderly parent, dementia). Send Samantha any you find.' },
    { id:'kp_nd_comments', every:'day', text:'Answer every comment on our Nextdoor posts.' },
    { id:'kp_nd_recs', every:'week', text:'Friday: thank anyone new who recommended us on Nextdoor, and send Samantha the week\'s count.' }
  ];

  /* ── settings ── */
  function cfg(){ return (D().ops_settings || {}).katlin_page || {}; }
  const pageEmail = () => lc(cfg().email);
  function allowed(){ const e = pageEmail(); return owner() || (!!e && me() === e); }
  function tasks(){ const c = cfg(); return Array.isArray(c.tasks) ? c.tasks : STARTER; }
  async function save(apply, what){
    if(typeof W.tkMerge !== 'function') return { error:{ message:'the Hub is still loading' } };
    const out = await W.tkMerge(m => {
      const kp = m.katlin_page = Object.assign({}, m.katlin_page || {});
      if(!Array.isArray(kp.tasks)) kp.tasks = STARTER.map(t => Object.assign({}, t));
      kp.done = Object.assign({}, kp.done || {}); kp.posted = Object.assign({}, kp.posted || {});
      return apply(kp) || [];
    }, what);
    if(out && out.error){ alert('That did not save: ' + (out.error.message || out.error) + '. Please try again.'); }
    return out || {};
  }

  /* ── posts ── */
  const PX = { list:null, busy:false, err:'' };
  async function loadPosts(){
    if(PX.list || PX.busy) return; PX.busy = true;
    try{ const r = await fetch('nextdoor/posts.json?v=1', { cache:'no-store' }); const j = await r.json(); PX.list = j.posts || []; PX.err = ''; }
    catch(e){ PX.err = 'The Nextdoor posts did not load. Refresh the page to try again.'; }
    PX.busy = false; render();
  }

  /* ── menu pill ── */
  function pillSync(){
    const p = document.querySelector('.fpill[data-tab="katlinpage"]'); if(!p) return;
    const ok = allowed() && (!!pageEmail() || owner());
    p.style.display = ok ? '' : 'none';
    const lab = p.querySelector('.kpLab');
    const text = (pageEmail() && me() === pageEmail()) ? 'My page' : (pageEmail() ? first(pageEmail()) + '\'s page' : 'Katlin\'s page');
    if(lab) lab.textContent = text;
    /* the header title follows the pill (CC_SECTION_TITLES is a top-level const in index.html, read by name) */
    try{ CC_SECTION_TITLES.katlinpage = text; if(activeTab === 'katlinpage' && typeof ccSetSectionTitle === 'function') ccSetSectionTitle('katlinpage'); }catch(e){}
  }

  /* ── css, once ── */
  function css(){
    if(document.getElementById('kpCss')) return;
    const s = document.createElement('style'); s.id = 'kpCss';
    s.textContent = `
#kpWrap{max-width:860px}
#kpWrap .kp-h{font-size:22px;font-weight:700;color:var(--navy,#0D365F);margin:4px 0 2px}
#kpWrap .kp-sub{color:var(--text-muted,#55677a);margin-bottom:16px}
#kpWrap .kp-card{background:#fff;border:1px solid var(--border,#e4e1d8);border-radius:12px;padding:16px 18px;margin-bottom:16px}
#kpWrap .kp-card h3{margin:0 0 10px;font-size:17px;color:var(--navy,#0D365F)}
#kpWrap .kp-grp{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#C17A12;margin:12px 0 4px}
#kpWrap .kp-task{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid #f0eee8}
#kpWrap .kp-task:last-child{border-bottom:0}
#kpWrap .kp-task input{width:20px;height:20px;margin-top:1px;flex:0 0 auto;cursor:pointer}
#kpWrap .kp-task.done .kp-t{color:#8a978f;text-decoration:line-through}
#kpWrap .kp-t{flex:1;line-height:1.4}
#kpWrap .kp-when{font-size:12px;color:#8a978f}
#kpWrap span.kp-when{white-space:nowrap}
#kpWrap .kp-row span.kp-when{white-space:normal}
#kpWrap .kp-x{border:0;background:none;color:#8a978f;cursor:pointer;font-size:16px;padding:0 4px}
#kpWrap .kp-add{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
#kpWrap .kp-add input{flex:1;min-width:220px;width:auto}
#kpWrap .kp-add select,#kpWrap .kp-row select{width:auto;flex:0 0 auto}
#kpWrap .kp-post{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:16px}
@media(max-width:700px){#kpWrap .kp-post{grid-template-columns:1fr}}
#kpWrap .kp-text{white-space:pre-wrap;background:#faf9f6;border:1px solid #eee9dd;border-radius:10px;padding:12px;line-height:1.45;font-size:14px}
#kpWrap .kp-photo img{width:100%;border-radius:10px;display:block}
#kpWrap .kp-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center}
#kpWrap .kp-ok{color:#14606F;font-weight:600}
#kpWrap .kp-warn{background:#fff7e8;border:1px solid #f0d9a8;border-radius:10px;padding:8px 12px;margin-bottom:10px;font-size:14px}
#kpWrap details{border-top:1px solid #f0eee8;padding:8px 0}
#kpWrap summary{cursor:pointer;font-weight:600}
#kpWrap textarea{width:100%;min-height:80px;box-sizing:border-box}
#kpWrap .kp-row select{width:auto}`;
    document.head.appendChild(s);
  }

  /* ── render ── */
  const fmtDay = ds => new Date(ds + 'T12:00:00Z').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', timeZone:'UTC' });
  const fmtAt = t => { try{ return new Date(t).toLocaleString('en-US', { timeZone:TZ, month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) + ' Missouri'; }catch(e){ return ''; } };
  const EVERY = { day:'every day', week:'every week' };

  function taskRow(t, done, today, isOwner){
    const d = isDone(t, done, today), who = (done[t.id] || {});
    return `<div class="kp-task${d ? ' done' : ''}"><input type="checkbox" ${d ? 'checked' : ''} onchange="KP.tick('${esc(t.id)}',this.checked)" aria-label="Done">
      <div class="kp-t">${esc(t.text)}${d && who.by_name ? `<div class="kp-when">Done ${esc(fmtAt(who.at))} by ${esc(String(who.by_name).split(' ')[0])}</div>` : ''}</div>
      ${t.every ? `<span class="kp-when">${EVERY[t.every] || ''}</span>` : ''}
      ${isOwner ? `<button class="kp-x" title="Remove this task" onclick="KP.removeTask('${esc(t.id)}')">✕</button>` : ''}</div>`;
  }

  function postBlock(p, posted, big){
    const mark = posted[p.week];
    return `<div class="kp-post"><div>
        ${big ? `<div class="kp-grp" style="margin-top:0">Week ${p.week} · ${esc(fmtDay(p.date))}</div>` : ''}
        <div class="kp-text" id="kpText${p.week}">${esc(p.text)}</div>
        <div class="kp-row"><button class="primary" onclick="KP.copy(${p.week})">Copy the text</button>
          <a class="secondary" style="text-decoration:none;display:inline-block;padding:7px 12px;border-radius:8px;border:1px solid var(--border,#d8d3c7);color:inherit" href="nextdoor/${esc(p.photo)}" download="nextdoor-week-${p.week}.jpg">Save the photo</a>
          ${mark ? `<span class="kp-ok">✓ Posted ${esc(fmtAt(mark.at))}</span> <button class="kp-x" title="Not posted after all" onclick="KP.posted(${p.week},false)">undo</button>`
                 : `<button class="secondary" onclick="KP.posted(${p.week},true)">I posted it</button>`}
          <span class="kp-when" id="kpCopied${p.week}"></span></div>
      </div><div class="kp-photo"><img src="nextdoor/${esc(p.photo)}" alt="Photo for this post" loading="lazy"></div></div>`;
  }

  function render(){
    const host = document.getElementById('kpWrap'); if(!host) return;
    css(); pillSync();
    if(!allowed()){ host.innerHTML = '<div class="kp-card">This page is private.</div>'; return; }
    const isOwner = owner(), email = pageEmail();
    if(!email){
      if(!isOwner){ host.innerHTML = '<div class="kp-card">This page is private.</div>'; return; }
      const staff = (D().coordinator_staff || []).filter(s => s && s.email && s.active !== false).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      host.innerHTML = `<div class="kp-h">Katlin's page</div><div class="kp-sub">Her own page: tasks you give her, this week's Nextdoor post and a note box to you.</div>
        <div class="kp-card"><h3>Whose page is this?</h3><p>Pick her from the team list. Only she and the owners will see this page.</p>
        <div class="kp-row"><select id="kpWho"><option value="">Choose a person</option>${staff.map(s => `<option value="${esc(lc(s.email))}">${esc(s.name || s.email)}</option>`).join('')}</select>
        <button class="primary" onclick="KP.setWho()">Save</button></div></div>`;
      return;
    }
    const c = cfg(), done = c.done || {}, posted = c.posted || {}, today = dayOf(Date.now()), all = tasks();
    const nm = first(email), mine = me() === email;
    const grp = (label, list) => list.length ? `<div class="kp-grp">${label}</div>` + list.map(t => taskRow(t, done, today, isOwner)).join('') : '';
    const once = all.filter(t => !t.every), daily = all.filter(t => t.every === 'day'), weekly = all.filter(t => t.every === 'week');
    const openOnce = once.filter(t => !isDone(t, done, today));
    const doneOnce = once.filter(t => isDone(t, done, today) && (Date.now() - new Date(done[t.id].at).getTime()) < 7 * 864e5);
    let html = `<div class="kp-h">${mine ? 'My page' : esc(nm) + '\'s page'}</div>
      <div class="kp-sub">${mine ? 'Your tasks from Samantha, this week\'s Nextdoor post and a quick way to reach her.' : 'What ' + esc(nm) + ' sees. Add a task below and it shows up on her page.'}</div>`;

    html += `<div class="kp-card"><h3>${mine ? 'Your tasks' : esc(nm) + '\'s tasks'}</h3>
      ${grp('To do', openOnce)}${grp('Every day', daily)}${grp('Every week', weekly)}${grp('Done this week', doneOnce)}
      ${!all.length ? '<p class="kp-when">No tasks yet.</p>' : ''}
      ${isOwner ? `<div class="kp-add"><input id="kpNew" placeholder="Give ${esc(nm)} a task" onkeydown="if(event.key==='Enter')KP.addTask()">
        <select id="kpEvery"><option value="">Once</option><option value="day">Every day</option><option value="week">Every week</option></select>
        <button class="primary" onclick="KP.addTask()">Add task</button></div>` : ''}</div>`;

    html += `<div class="kp-card"><h3>This week on Nextdoor</h3>`;
    if(PX.err) html += `<p>${esc(PX.err)}</p>`;
    else if(!PX.list){ html += '<p class="kp-when">Loading the posts…</p>'; loadPosts(); }
    else{
      const cur = currentPost(PX.list, today), miss = missed(PX.list, cur, posted, today);
      if(miss.length) html += `<div class="kp-warn">Not marked posted yet: ${miss.map(p => 'week ' + p.week + ' (' + esc(fmtDay(p.date)) + ')').join(', ')}. You'll find ${miss.length > 1 ? 'them' : 'it'} under Earlier posts.</div>`;
      html += cur ? `<p class="kp-when" style="margin-top:0">Post it on the Caring Companions business page (not a personal profile), around 10 to 11am Missouri time on ${esc(fmtDay(cur.date))}.</p>` + postBlock(cur, posted, true) : '<p>No posts loaded.</p>';
      const next = upcoming(PX.list, cur, 4);
      if(next.length) html += `<div class="kp-grp" style="margin-top:18px">Coming up</div>` + next.map(p => `<details><summary>Week ${p.week} · ${esc(fmtDay(p.date))} · ${esc(p.title)}</summary>${postBlock(p, posted, false)}</details>`).join('');
      const earlier = (PX.list || []).filter(p => cur && p.date < cur.date).slice(-4).reverse();
      if(earlier.length) html += `<div class="kp-grp" style="margin-top:18px">Earlier posts</div>` + earlier.map(p => `<details><summary>Week ${p.week} · ${esc(fmtDay(p.date))} · ${esc(p.title)}${posted[p.week] ? ' ✓' : ''}</summary>${postBlock(p, posted, false)}</details>`).join('');
    }
    html += `</div>`;

    if(mine || !isOwner){
      html += `<div class="kp-card"><h3>Send Samantha a note</h3>
        <p class="kp-when" style="margin-top:0">A neighbor asking for care, a question, or anything she should know. It goes to the owners' My Work.</p>
        <textarea id="kpNote" placeholder="Write your note"></textarea>
        <div class="kp-row"><select id="kpNoteWhen"><option>Today</option><option selected>This week</option><option>When you can</option></select>
        <button class="primary" onclick="KP.sendNote()">Send to Samantha</button><span class="kp-when" id="kpNoteSaid"></span></div></div>`;
    }
    if(isOwner) html += `<p class="kp-when">Only ${esc(nm)} and the owners can see this page. <a href="#" onclick="KP.changeWho();return false;">Change whose page this is</a></p>`;
    host.innerHTML = html;
  }

  /* ── actions ── */
  async function setWho(){
    const v = lc((document.getElementById('kpWho') || {}).value);
    if(!v){ alert('Choose a person first.'); return; }
    await save(kp => { kp.email = v; return ['page belongs to ' + nameOf(v)]; }, 'Katlin\'s page');
    pillSync(); render();
  }
  async function changeWho(){
    if(!owner()) return;
    if(!confirm('Pick a different person for this page? Her tasks and checkmarks stay.')) return;
    await save(kp => { delete kp.email; return ['page owner cleared']; }, 'Katlin\'s page');
    pillSync(); render();
  }
  async function addTask(){
    if(!owner()) return;
    const inp = document.getElementById('kpNew'), text = String((inp || {}).value || '').trim();
    const every = String((document.getElementById('kpEvery') || {}).value || '');
    if(!text){ alert('Write the task first.'); return; }
    const t = { id:(typeof W.uid === 'function' ? W.uid() : 'kp_' + Date.now().toString(36)), text, every:every || '', by:me(), at:new Date().toISOString() };
    const out = await save(kp => { kp.tasks.push(t); return ['task added: ' + text.slice(0, 60)]; }, 'Katlin\'s page');
    if(!out.error && inp) inp.value = '';
    render();
  }
  async function removeTask(id){
    if(!owner()) return;
    const t = tasks().find(x => x.id === id); if(!t) return;
    if(!confirm('Remove this task?\n\n' + t.text)) return;
    await save(kp => { kp.tasks = kp.tasks.filter(x => x.id !== id); delete kp.done[id]; return ['task removed: ' + t.text.slice(0, 60)]; }, 'Katlin\'s page');
    render();
  }
  async function tick(id, on){
    const t = tasks().find(x => x.id === id); if(!t) return;
    await save(kp => {
      if(on){ kp.done[id] = { at:new Date().toISOString(), by:me(), by_name:meName() }; return ['done: ' + t.text.slice(0, 60)]; }
      delete kp.done[id]; return ['not done: ' + t.text.slice(0, 60)];
    }, 'Katlin\'s page');
    render();
  }
  async function posted(week, on){
    await save(kp => {
      if(on){ kp.posted[week] = { at:new Date().toISOString(), by:me(), by_name:meName() }; return ['Nextdoor week ' + week + ' posted']; }
      delete kp.posted[week]; return ['Nextdoor week ' + week + ' not posted'];
    }, 'Katlin\'s page');
    render();
  }
  async function copy(week){
    const p = (PX.list || []).find(x => x.week === week); if(!p) return;
    const said = document.getElementById('kpCopied' + week);
    try{ await navigator.clipboard.writeText(p.text); if(said) said.textContent = 'Copied. Paste it into Nextdoor.'; }
    catch(e){
      const el = document.getElementById('kpText' + week);
      if(el){ const r = document.createRange(); r.selectNodeContents(el); const s = W.getSelection(); s.removeAllRanges(); s.addRange(r); }
      if(said) said.textContent = 'Selected. Press Cmd+C (or Ctrl+C) to copy.';
    }
  }
  async function sendNote(){
    const box = document.getElementById('kpNote'), message = String((box || {}).value || '').trim();
    if(!message){ alert('Write the note first.'); return; }
    const urgency = String((document.getElementById('kpNoteWhen') || {}).value || 'This week');
    const t = { id:(typeof W.uid === 'function' ? W.uid() : 'kpn_' + Date.now().toString(36)), direction:'to_owners', kind:'update', urgency,
      about:'', caregiver:'', lead_id:null, message, created_at:new Date().toISOString(), from_name:meName(), from_email:me(),
      status:'open', done_at:null, done_by:null, reply:'' };
    try{
      const d = D(); d.staffing_tasks = d.staffing_tasks || []; d.staffing_tasks.push(t);
      await W.persist('staffing_tasks', t);
      if(box) box.value = '';
      const s = document.getElementById('kpNoteSaid'); if(s) s.textContent = 'Sent. Samantha will see it in My Work.';
    }catch(e){ alert('Your note did not send. Please try again.'); }
  }

  const KP = { allowed, pillSync, render, setWho, changeWho, addTask, removeTask, tick, posted, copy, sendNote,
    _rules:{ dayOf, weekOf, isDone, currentPost, upcoming, missed, STARTER } };
  W.KP = KP;
  if(typeof module !== 'undefined' && module.exports) module.exports = KP;
})(typeof window !== 'undefined' ? window : globalThis);
