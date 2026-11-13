/* =====================================================================================================================
   KATLIN'S PAGE (Samantha 2026-11-10: "I want it to be just for Katlin, because she's my sister I can give her
   various tasks" ... "her own page that can be attached on the side menu", not mixed in with everyone's screens.)
   One page in the Today menu, seen only by the person it belongs to and the owners. Whose page it is lives in
   ops_settings.katlin_page.email (picked by an owner on the page itself), so no name or email is in this code.
   What it holds:
     1. Tasks from Samantha: once / every day / every week. Owners add and remove them; she ticks them off.
     2. This week's Nextdoor post (nextdoor/posts.json + photos): Copy text, save photo, "I posted it".
     3. Coming up: the next Nextdoor posts, to work ahead.
     3b. Coming up on social (2026-11-10, her "Yes, build it"): the posts Blotato has scheduled for the next week, read
        through the Training server's blotato-coming-up (her Blotato key stays on the server). Read only: nothing here
        can change, post or delete a post. "Tell Samantha" on a post sends a note the same way as 4.
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

  /* ── automatic hiring needs (her ask 2026-11-10): open shifts from AxisCare, summed up WITHOUT client names ──
     The open-shifts lookup returns client names, and Katlin works from outside the US, so it is only ever called from
     an OWNER's browser. That browser keeps town, day, time and count, and saves that summary to
     ops_settings.katlin_page.auto_needs. Katlin's browser never asks AxisCare and never receives a name. */
  const WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  function townOf(client, roster){
    const n = lc(client); if(!n) return '';
    const hit = (roster || []).find(c => lc(c.name) === n)
      || (roster || []).find(c => { const a = lc(c.name).split(/\s+/), b = n.split(/\s+/); return a.length > 1 && b.length > 1 && a[0] === b[0] && a[a.length - 1] === b[b.length - 1]; });
    return hit && hit.town ? String(hit.town).trim().replace(/\b\w/g, x => x.toUpperCase()) : '';
  }
  /* open: [{date, start, end, client}], roster: [{name, town}] -> [{town, days:['Sat','Sun'], time, count, first}] (no names) */
  function autoNeeds(open, roster){
    const g = new Map();
    (open || []).forEach(v => {
      if(!v || !v.date) return;
      const town = townOf(v.client, roster) || '';
      const time = v.start && v.end ? v.start + ' to ' + v.end : (v.start || 'time not set');
      const k = lc(town) + '|' + time;
      const d = WD[new Date(v.date + 'T12:00:00Z').getUTCDay()];
      const r = g.get(k) || { town, time, days:[], count:0, first:v.date };
      if(r.days.indexOf(d) < 0) r.days.push(d);
      r.count++; if(v.date < r.first) r.first = v.date;
      g.set(k, r);
    });
    return [...g.values()].map(r => Object.assign(r, { days:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].filter(d => r.days.indexOf(d) >= 0) }))
      .sort((a, b) => b.count - a.count || a.first.localeCompare(b.first));
  }
  const AUTO = { busy:false, tried:0 };
  async function refreshAuto(force){
    if(!owner() || AUTO.busy) return;
    const cur = (cfg().auto_needs || {});
    if(!force && cur.at && Date.now() - new Date(cur.at).getTime() < 6 * 3600e3) return;
    if(!force && Date.now() - AUTO.tried < 10 * 60000) return;
    AUTO.busy = true; AUTO.tried = Date.now();
    let out;
    try{
      const anon = (() => { try{ return COMMS_ANON; }catch(e){ return ''; } })();
      const tok = typeof W.trainHubTok === 'function' ? await W.trainHubTok() : '';
      const r = await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/axiscare-open-shifts', { method:'POST',
        headers:{ 'x-hub-token':tok, 'apikey':anon, 'Authorization':'Bearer ' + anon, 'Content-Type':'application/json' }, body:JSON.stringify({ days:14 }) });
      const d = await r.json();
      if(!d || d.error) throw new Error('AxisCare did not answer');
      const roster = typeof W.matchClients === 'function' ? W.matchClients() : [];
      out = { at:new Date().toISOString(), list:autoNeeds(d.open || [], roster), unread_days:Array.isArray(d.incomplete_dates) ? d.incomplete_dates.length : 0 };
    }catch(e){ out = null; }
    AUTO.busy = false;
    if(!out){ if(force) alert('Could not read open shifts from AxisCare just now. Try again in a few minutes.'); return; }
    await save(kp => { kp.auto_needs = out; return ['open shifts summary refreshed (' + out.list.length + ' groups, no names)']; }, 'Katlin\'s page');
    try{ if(isKp(activeTab)) render(activeTab); }catch(e){}
  }

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

  /* ── menu: one parent pill (data-parent="katlingrp") with four pills under it ── */
  const VIEWS = [ { t:'kptasks', l:'Tasks' }, { t:'kpfollow', l:'Follow-ups' }, { t:'kpnextdoor', l:'Nextdoor' }, { t:'kpsocial', l:'Coming up' }, { t:'kpnotes', l:'Notes' }, { t:'kprecruit', l:'Recruiting' } ];
  const isKp = tab => VIEWS.some(v => v.t === tab) || tab === 'katlinpage';
  function pageLabel(){ return (pageEmail() && me() === pageEmail()) ? 'My page' : (pageEmail() ? first(pageEmail()) + '\'s page' : 'Katlin\'s page'); }
  function pillSync(){
    const p = document.querySelector('.fpill[data-parent="katlingrp"]'); if(!p) return;
    p.style.display = (allowed() && (!!pageEmail() || owner())) ? '' : 'none';
    const text = pageLabel(), lab = p.querySelector('.kpLab'); if(lab) lab.textContent = text;
    if(owner() && pageEmail()) refreshAuto(false);
    /* the Operations Board row's shortcut appears once whose page it is has loaded */
    try{ const bar = document.getElementById('fsub2'), want = !!navPill();
      if(bar && CC_PARENT_OF[activeTab] === 'myworkgrp' && want !== !!bar.querySelector('[data-kpnav]') && typeof ccRenderSub2 === 'function') ccRenderSub2(activeTab); }catch(e){}
    /* the header title follows (CC_SECTION_TITLES is a top-level const in index.html, read by name) */
    try{ VIEWS.forEach(v => { CC_SECTION_TITLES[v.t] = text + ' · ' + v.l; });
      if(isKp(activeTab) && typeof ccSetSectionTitle === 'function') ccSetSectionTitle(activeTab); }catch(e){}
  }

  /* The shortcut in the Operations Board row (her ask 2026-11-10): opens her page where she last was in it. */
  function navPill(){
    if(!allowed() || !pageEmail()) return '';
    return '<div class="fpill2" data-kpnav="1" onclick="ccParentClick(\'katlingrp\')"><svg class="navi" aria-hidden="true"><use href="icons.svg#i-star"/></svg> ' + esc(pageLabel()) + '</div>';
  }

  /* ── css, once ── */
  function css(){
    if(document.getElementById('kpCss')) return;
    const s = document.createElement('style'); s.id = 'kpCss';
    s.textContent = `
.kpw{max-width:860px}
.kpw .kp-h{font-size:22px;font-weight:700;color:var(--navy,#0D365F);margin:4px 0 2px}
.kpw .kp-sub{color:var(--text-muted,#55677a);margin-bottom:16px}
.kpw .kp-card{background:#fff;border:1px solid var(--border,#e4e1d8);border-radius:12px;padding:16px 18px;margin-bottom:16px}
.kpw .kp-card h3{margin:0 0 10px;font-size:17px;color:var(--navy,#0D365F)}
.kpw .kp-grp{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#C17A12;margin:12px 0 4px}
.kpw .kp-task{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid #f0eee8}
.kpw .kp-task:last-child{border-bottom:0}
.kpw .kp-task input[type=checkbox]{width:20px;height:20px;margin-top:1px;flex:0 0 auto;cursor:pointer}
.kpw .kp-task.done .kp-t{color:#8a978f;text-decoration:line-through}
.kpw .kp-t{flex:1;line-height:1.4;min-width:0}
.kpw .kp-when{font-size:12px;color:#8a978f}
.kpw span.kp-when{white-space:nowrap}
.kpw .kp-row span.kp-when{white-space:normal}
.kpw .kp-x{border:0;background:none;color:#8a978f;cursor:pointer;font-size:16px;padding:0 4px}
.kpw .kp-add{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.kpw .kp-add input{flex:1;min-width:200px;width:auto}
.kpw .kp-add select,.kpw .kp-row select{width:auto;flex:0 0 auto}
.kpw .kp-post{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:16px}
@media(max-width:700px){.kpw .kp-post{grid-template-columns:1fr}}
.kpw .kp-text{white-space:pre-wrap;background:#faf9f6;border:1px solid #eee9dd;border-radius:10px;padding:12px;line-height:1.45;font-size:14px}
.kpw .kp-photo img{width:100%;border-radius:10px;display:block}
.kpw .kp-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center}
.kpw .kp-ok{color:#14606F;font-weight:600}
.kpw .kp-due{color:#9C6410;font-weight:700}
.kpw .kp-warn{background:#fff7e8;border:1px solid #f0d9a8;border-radius:10px;padding:8px 12px;margin-bottom:10px;font-size:14px}
.kpw .kp-reply{background:#EAF4F6;border-radius:10px;padding:8px 12px;margin-top:6px;font-size:14px}
.kpw details{border-top:1px solid #f0eee8;padding:8px 0}
.kpw summary{cursor:pointer;font-weight:600}
.kpw textarea{width:100%;min-height:80px;box-sizing:border-box}
.kpw .kp-links{white-space:pre-wrap;line-height:1.5}
.kpw .kp-fu-n{display:inline-block;min-width:22px;text-align:center;font-size:13px;background:#0D365F;color:#fff;border-radius:999px;padding:1px 8px;margin-left:4px;vertical-align:2px}
.kpw .kp-fu-name{font-weight:700;color:var(--navy,#0D365F)}
.kpw .kp-fu-chip:empty{display:none}.kpw .kp-fu-chip{margin-top:3px}
.kpw .kp-fu-b{margin-top:6px}
.kpw .kp-sp{padding:12px 0;border-bottom:1px solid #f0eee8}
.kpw .kp-sp:last-child{border-bottom:0}
.kpw .kp-sp-top{display:flex;gap:8px;flex-wrap:wrap;align-items:baseline;margin-bottom:6px}
.kpw .kp-sp-time{font-weight:700;color:var(--navy,#0D365F)}
.kpw .kp-chip{display:inline-block;font-size:12px;border-radius:999px;padding:1px 9px;background:#EAF4F6;color:#14606F;font-weight:600}
.kpw .kp-sp .kp-text{max-height:220px;overflow:auto}
.kpw .kp-media{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.kpw .kp-media img,.kpw .kp-media video{width:150px;height:150px;object-fit:cover;border-radius:8px;background:#f2f0ea;display:block}
@media(max-width:700px){.kpw .kp-media img,.kpw .kp-media video{width:calc(50% - 4px);height:auto;aspect-ratio:1}}`;
    document.head.appendChild(s);
  }

  /* ── shared bits ── */
  const fmtDay = ds => new Date(ds + 'T12:00:00Z').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', timeZone:'UTC' });
  const fmtAt = t => { try{ return new Date(t).toLocaleString('en-US', { timeZone:TZ, month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) + ' Missouri'; }catch(e){ return ''; } };
  const EVERY = { day:'every day', week:'every week', month:'every month' };
  const newId = p => (typeof W.uid === 'function' ? W.uid() : p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));

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
        ${big ? `<div class="kp-grp" style="margin-top:0">${esc(p.label || 'Week ' + p.week)} · ${esc(fmtDay(p.date))}</div>` : ''}
        <div class="kp-text" id="kpText${p.week}">${esc(p.text)}</div>
        <div class="kp-row"><button class="primary" onclick="KP.copy(${p.week})">Copy the text</button>
          <a class="secondary" style="text-decoration:none;display:inline-block;padding:7px 12px;border-radius:8px;border:1px solid var(--border,#d8d3c7);color:inherit" href="nextdoor/${esc(p.photo)}" download="nextdoor-week-${p.week}.jpg">Save the photo</a>
          ${mark ? `<span class="kp-ok">✓ Posted ${esc(fmtAt(mark.at))}</span> <button class="kp-x" title="Not posted after all" onclick="KP.posted(${p.week},false)">undo</button>`
                 : `<button class="secondary" onclick="KP.posted(${p.week},true)">I posted it</button>`}
          <span class="kp-when" id="kpCopied${p.week}"></span></div>
      </div><div class="kp-photo"><img src="nextdoor/${esc(p.photo)}" alt="Photo for this post"${big ? '' : ' loading="lazy"'}></div></div>`;
  }

  /* ── the four views ── */
  function viewTasks(ctx){
    const { c, today, isOwner, nm, mine } = ctx, done = c.done || {}, all = tasks();
    const grp = (label, list) => list.length ? `<div class="kp-grp">${label}</div>` + list.map(t => taskRow(t, done, today, isOwner)).join('') : '';
    const once = all.filter(t => !t.every), daily = all.filter(t => t.every === 'day'), weekly = all.filter(t => t.every === 'week');
    const openOnce = once.filter(t => !isDone(t, done, today));
    const doneOnce = once.filter(t => isDone(t, done, today) && (Date.now() - new Date(done[t.id].at).getTime()) < 7 * 864e5);
    return `<div class="kp-card"><h3>${mine ? 'Your tasks' : esc(nm) + '\'s tasks'}</h3>
      ${grp('To do', openOnce)}${grp('Every day', daily)}${grp('Every week', weekly)}${grp('Done this week', doneOnce)}
      ${!all.length ? '<p class="kp-when">No tasks yet.</p>' : ''}
      ${isOwner ? `<div class="kp-add"><input id="kpNew" placeholder="Give ${esc(nm)} a task" onkeydown="if(event.key==='Enter')KP.addTask()">
        <select id="kpEvery"><option value="">Once</option><option value="day">Every day</option><option value="week">Every week</option></select>
        <button class="primary" onclick="KP.addTask()">Add task</button></div>` : ''}</div>`;
  }
  function viewNextdoor(ctx){
    const { c, today } = ctx, posted = c.posted || {};
    let html = `<div class="kp-card"><h3>This week on Nextdoor</h3>`;
    if(PX.err) html += `<p>${esc(PX.err)}</p>`;
    else if(!PX.list){ html += '<p class="kp-when">Loading the posts…</p>'; loadPosts(); }
    else{
      const cur = currentPost(PX.list, today), miss = missed(PX.list, cur, posted, today);
      if(miss.length) html += `<div class="kp-warn">Not marked posted yet: ${miss.map(p => (p.label ? esc(p.label) : 'week ' + p.week) + ' (' + esc(fmtDay(p.date)) + ')').join(', ')}. You'll find ${miss.length > 1 ? 'them' : 'it'} under Earlier posts.</div>`;
      html += cur ? `<p class="kp-when" style="margin-top:0">Post it on the Caring Companions business page (not a personal profile), around 10 to 11am Missouri time on ${esc(fmtDay(cur.date))}.</p>` + postBlock(cur, posted, true) : '<p>No posts loaded.</p>';
      const next = upcoming(PX.list, cur, 4);
      if(next.length) html += `<div class="kp-grp" style="margin-top:18px">Coming up</div>` + next.map(p => `<details><summary>${esc(p.label || 'Week ' + p.week)} · ${esc(fmtDay(p.date))} · ${esc(p.title)}</summary>${postBlock(p, posted, false)}</details>`).join('');
      const earlier = (PX.list || []).filter(p => cur && p.date < cur.date).slice(-4).reverse();
      if(earlier.length) html += `<div class="kp-grp" style="margin-top:18px">Earlier posts</div>` + earlier.map(p => `<details><summary>${esc(p.label || 'Week ' + p.week)} · ${esc(fmtDay(p.date))} · ${esc(p.title)}${posted[p.week] ? ' ✓' : ''}</summary>${postBlock(p, posted, false)}</details>`).join('');
    }
    return html + `</div>`;
  }
  function notesOf(email){
    return (D().staffing_tasks || []).filter(t => t && t.direction === 'to_owners' && lc(t.from_email) === email)
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }
  function viewNotes(ctx){
    const { email, isOwner, nm, mine } = ctx, list = notesOf(email);
    let html = '';
    if(mine || !isOwner){
      html += `<div class="kp-card"><h3>Send Samantha a note</h3>
        <p class="kp-when" style="margin-top:0">A neighbor asking for care, a question, or anything she should know. It goes to the owners' My Work.</p>
        <textarea id="kpNote" placeholder="Write your note"></textarea>
        <div class="kp-row"><select id="kpNoteWhen"><option>Today</option><option selected>This week</option><option>When you can</option></select>
        <button class="primary" onclick="KP.sendNote()">Send to Samantha</button><span class="kp-when" id="kpNoteSaid"></span></div></div>`;
    }
    html += `<div class="kp-card"><h3>${mine ? 'Your notes' : 'Notes from ' + esc(nm)}</h3>`;
    if(!list.length) html += `<p class="kp-when">No notes yet.</p>`;
    html += list.slice(0, 40).map(t => {
      const open = t.status === 'open';
      return `<div class="kp-task"><div class="kp-t"><div>${esc(t.message)}</div>
        <div class="kp-when">${esc(fmtAt(t.created_at))} · ${esc(t.urgency || '')} · ${open ? '<span class="kp-due">waiting</span>' : 'done' + (t.done_by ? ' by ' + esc(String(t.done_by).split(' ')[0]) : '')}</div>
        ${t.reply ? `<div class="kp-reply"><b>${esc(String(t.reply_by_name || 'Samantha').split(' ')[0])}:</b> ${esc(t.reply)}</div>` : ''}
        ${isOwner && open ? `<div class="kp-add"><input id="kpRe_${esc(t.id)}" placeholder="Reply to ${esc(nm)} (optional)"><button class="primary" onclick="KP.reply('${esc(t.id)}')">Reply and mark done</button></div>` : ''}
      </div></div>`;
    }).join('');
    return html + `</div>`;
  }
  /* Recruiting: places to post (owners add, with how often) and her posting log. */
  const PLACE_STARTER = [
    { id:'kp_pl_fb', name:'Springfield-area Facebook community and job groups', biz:'All three', every:'week', note:'' },
    { id:'kp_pl_cna', name:'CNA school job boards and instructors', biz:'All three', every:'month', note:'' }
  ];
  const LINKS_STARTER = 'Caring Companions In-Home Senior Care: mo-care.com/careers (caregivers 21 or older)\nCaring Companions CDS: findcdscaregivers.com\nShow-Me Neighbors: showmeneighbors.com (Become a Neighbor)';
  function places(){ const c = cfg(); return Array.isArray(c.places) ? c.places : PLACE_STARTER; }
  /* One posting log for the whole Hub: app_data recruit_posts (the After-Hours card's log, after-hours.js).
     Items: { id, at, by, business:'cc'|'cds'|'smn', where:'cna_school'|'facebook_group'|'other', place, link, replies, place_id? } */
  const BIZ = [['cc', 'Caring Companions'], ['cds', 'CDS'], ['smn', 'Show-Me Neighbors']];
  const bizName = k => (BIZ.find(b => b[0] === k) || [k, k])[1];
  const PBIZ = { 'Caring Companions':'cc', 'CDS':'cds', 'Show-Me Neighbors':'smn' };
  const whereOf = name => /facebook/i.test(name) ? 'facebook_group' : /cna|school|college|program/i.test(name) ? 'cna_school' : 'other';
  const rposts = () => (D().recruit_posts || []).filter(p => p && !p.removed_at);
  function lastPost(log, pl){
    const k = lc(pl.name).replace(/\s+/g, ' ');
    return (log || []).filter(x => x.place_id === pl.id || lc(x.place).replace(/\s+/g, ' ') === k).sort((a, b) => String(b.at).localeCompare(String(a.at)))[0] || null;
  }
  /* due: never posted, or older than its repeat (week 7 days, month 30 days); a one-time place is due until posted once */
  function placeDue(pl, last, now){
    if(!last) return true;
    const age = (now - new Date(last.at).getTime()) / 864e5;
    return pl.every === 'week' ? age >= 7 : pl.every === 'month' ? age >= 30 : false;
  }
  function viewRecruit(ctx){
    const { c, isOwner, nm, mine } = ctx, log = rposts(), now = Date.now();
    const links = typeof c.recruit_links === 'string' ? c.recruit_links : LINKS_STARTER;
    const needs = Array.isArray(c.hiring_needs) ? c.hiring_needs : [];
    const an = c.auto_needs || null;
    let html = `<div class="kp-card"><h3>Open shifts to hire for</h3>
      <p class="kp-when" style="margin-top:0">From AxisCare: visits in the next 2 weeks with no caregiver, by town, day and time. ${an && an.at ? 'Updated ' + esc(fmtAt(an.at)) + '.' : 'Not read yet.'}</p>
      ${an && an.list && an.list.length ? an.list.map(n => `<div class="kp-task"><div class="kp-t"><div><b>${esc(n.town || 'Town not on file (ask Samantha)')}</b> · ${esc(n.days.join(', '))}</div>
          <div>${esc(n.time)} <span class="kp-when">· ${n.count} open shift${n.count === 1 ? '' : 's'}</span></div></div></div>`).join('')
        : (an && an.at ? '<p>No open shifts right now.</p>' : '')}
      ${an && an.unread_days ? `<p class="kp-when">${an.unread_days} day${an.unread_days === 1 ? '' : 's'} could not be fully read from AxisCare, so there may be more.</p>` : ''}
      ${isOwner ? `<div class="kp-row"><button class="secondary" onclick="KP.refreshAuto(true)">Refresh now</button><span class="kp-when">Refreshes by itself when an owner has the Hub open (at most every 6 hours). Only towns, days and times are saved, never client names.</span></div>` : ''}</div>`;
    html += `<div class="kp-card"><h3>Also hiring for</h3>
      ${needs.length ? needs.map(n => `<div class="kp-task"><div class="kp-t"><div><b>${esc(n.position)}</b> <span class="kp-when">· ${esc(n.biz || '')}</span></div>
          <div>${esc(n.area || '')}${n.hours ? ' · ' + esc(n.hours) : ''}</div>${n.note ? `<div class="kp-when">${esc(n.note)}</div>` : ''}
          <div class="kp-when">Added ${esc(fmtAt(n.at))}</div></div>
        ${isOwner ? `<button class="kp-x" title="Filled, remove it" onclick="KP.removeNeed('${esc(n.id)}')">✕</button>` : ''}</div>`).join('')
        : `<p class="kp-when">${isOwner ? 'Nothing listed yet. Add what you need below and ' + esc(nm) + ' builds her posts from it.' : 'Nothing listed right now. Samantha adds positions here.'}</p>`}
      ${isOwner ? `<div class="kp-grp" style="margin-top:14px">Add a hiring need</div>
        <div class="kp-add"><select id="kpNdBiz"><option>Caring Companions</option><option>CDS</option><option>Show-Me Neighbors</option></select>
          <input id="kpNdPos" placeholder="Position (e.g. caregiver, PRN CNA)"></div>
        <div class="kp-add"><input id="kpNdArea" placeholder="Area or towns (e.g. Nixa, Ozark)"><input id="kpNdHours" placeholder="Days and hours (e.g. weekends 8am to 2pm)"></div>
        <div class="kp-add"><input id="kpNdNote" placeholder="Anything else for the post (optional)"><button class="primary" onclick="KP.addNeed()">Add</button></div>` : ''}</div>`;
    html += `<div class="kp-card"><h3>Where to send people</h3>
      <div class="kp-text kp-links">${esc(links)}</div>
      ${isOwner ? `<details><summary>Change this</summary><textarea id="kpLinks">${esc(links)}</textarea><div class="kp-row"><button class="primary" onclick="KP.saveLinks()">Save</button></div></details>` : ''}</div>`;
    const pls = places();
    html += `<div class="kp-card"><h3>Places to post</h3>`;
    if(!pls.length) html += `<p class="kp-when">No places yet.</p>`;
    html += pls.map(pl => {
      const last = lastPost(log, pl), due = placeDue(pl, last, now), one = PBIZ[pl.biz] || '';
      return `<div class="kp-task"><div class="kp-t"><div><b>${esc(pl.name)}</b> <span class="kp-when">· ${esc(pl.biz || '')}${pl.every ? ' · ' + EVERY[pl.every] : ' · once'}</span></div>
          ${pl.note ? `<div class="kp-when">${esc(pl.note)}</div>` : ''}
          <div class="kp-when">${last ? 'Last posted ' + esc(fmtAt(last.at)) + ' by ' + esc(first(last.by)) : 'Not posted yet'}${due ? ' · <span class="kp-due">due</span>' : ''}</div>
          <div class="kp-add" style="margin-top:6px"><select id="kpBz_${esc(pl.id)}">${one ? '' : '<option value="">For which business?</option>'}${BIZ.map(b => `<option value="${b[0]}"${b[0] === one ? ' selected' : ''}>${esc(b[1])}</option>`).join('')}</select>
            <input id="kpLk_${esc(pl.id)}" placeholder="Link to the post (optional)"><button class="secondary" onclick="KP.logPost('${esc(pl.id)}')">I posted here</button></div></div>
        ${isOwner ? `<button class="kp-x" title="Remove this place" onclick="KP.removePlace('${esc(pl.id)}')">✕</button>` : ''}</div>`;
    }).join('');
    if(isOwner) html += `<div class="kp-grp" style="margin-top:16px">Add a place</div>
      <div class="kp-add"><input id="kpPlName" placeholder="Where (e.g. a Facebook group or school)">
        <select id="kpPlBiz"><option>All three</option><option>Caring Companions</option><option>CDS</option><option>Show-Me Neighbors</option></select>
        <select id="kpPlEvery"><option value="week">Every week</option><option value="month">Every month</option><option value="">Once</option></select></div>
      <div class="kp-add"><input id="kpPlNote" placeholder="Note for ${esc(nm)} (optional): link, who to ask, what to post"><button class="primary" onclick="KP.addPlace()">Add place</button></div>`;
    html += `</div>`;
    const recent = log.slice().sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 20);
    html += `<div class="kp-card"><h3>Posting log</h3><p class="kp-when" style="margin-top:0">The same log as the After-Hours card. Applicant counts are added there.</p>${recent.length ? recent.map(x => `<div class="kp-task"><div class="kp-t">${esc(bizName(x.business))} · ${esc(x.place || 'A place')}${x.link ? ` · <a href="${esc(/^https?:\/\//.test(x.link) ? x.link : 'https://' + x.link)}" target="_blank" rel="noopener">see the post</a>` : ''}
        <div class="kp-when">${esc(fmtAt(x.at))} by ${esc(first(x.by))}${x.replies ? ' · ' + x.replies + ' applicant' + (x.replies === 1 ? '' : 's') : ''}</div></div></div>`).join('')
      : `<p class="kp-when">${mine ? 'Nothing logged yet. Click "I posted here" after each post.' : 'Nothing logged yet.'}</p>`}</div>`;
    return html;
  }

  /* ── FOLLOW-UPS (Samantha 2026-11-09: "I want Katlin to give more personalized followups to those applicants who have
     not completed their form, have not booked interview, or have fallen off at any stage"). ONE list of everyone who is
     waiting on their OWN next step, longest first, with the Hub's own Text (ApText) and Call (office line) buttons.
     Nothing new decides a stage. Each comes from the screen that already shows it:
       · Applicants (AP_ROWS / AP_BOOK, read by apLoad): the same rules as apMatching's working lists. status 'partial'
         = "Did not finish the form"; otherwise qualified, not booked = "No interview booked". 60 days and older is
         the Inactive list, so it is left out.
       · Offers and Onboarding: the Onboarding table's own row (obtModel) for each person ckdPeople lists. The first cell
         that is "waiting on the applicant" is where they stopped (offer, Step 1 with the stuck card ckdStep1Stuck,
         references, Step 2, orientation, welcome video call).
     Left out: no-shows (and anyone with an earlier no-show), declined, not qualified, the candidate pool, Needs a look and
     family care to verify (the office decides first), anyone booked or interviewed, hired or approved, taken off the
     list, a check that needs Samantha or Zachary, and people whose only open step is a background check (Krystal has
     those: counted at the bottom, not listed). Reads only. Sends nothing: Katlin presses Text or Call herself. */
  const FU_SAY = { form:'Started the application, didn\'t finish', book:'Hasn\'t booked an interview', offer:'Offer sent, not signed yet',
    step1:'Offer accepted, Step 1 not done', refs:'References not in', step2:'Viventium Step 2 not finished', orient:'Orientation not finished',
    video:'Hasn\'t booked the welcome video call' };
  const last10 = s => String(s || '').replace(/\D/g, '').slice(-10);
  const daysSince = (iso, now) => { const t = Date.parse(iso || ''); return Number.isFinite(t) ? Math.max(0, Math.floor((now - t) / 864e5)) : null; };
  /* applicants: rows = AP_ROWS, book = AP_BOOK (any booking: booked, attended or no-show), h = the Hub's own tests */
  function fuApplicants(rows, book, now, h){
    return (rows || []).filter(r => r && r.status !== 'noshow' && !(h.decided || []).includes(r.status) && !r.decline_reason
        && !['duplicate', 'declined', 'review'].includes(r.screen_grade) && r.one_year !== 'family'
        && h.qualified(r) && !h.offered(r) && !(book || {})[r.id] && !r.post_interview && !h.noshowElsewhere(r))
      .map(r => ({ k:r.status === 'partial' ? 'form' : 'book', days:daysSince(r.created_at, now), r }))
      .filter(x => x.days === null || x.days <= 60);
  }
  /* an Onboarding row (obtModel's cells) -> where they stopped, or why they are not listed */
  function fuStage(m){
    const c = (m && m.cells) || {}, wait = k => c[k] && c[k].s === 'wait' && c[k].who === 'applicant';
    if(Object.keys(c).some(k => c[k] && c[k].s === 'rev')) return { skip:'review' };
    if(wait('offer')) return { k:'offer', days:c.offer.days, late:!!c.offer.late };
    if(wait('step1')) return { k:'step1', late:!!c.step1.late };
    if(c.refs && (c.refs.s === 'todo' || c.refs.s === 'wait')) return { k:'refs', days:c.refs.days, late:!!c.refs.late };
    if(wait('step2')) return { k:'step2', days:c.step2.days, late:!!c.step2.late };
    if(wait('orient')) return { k:'orient', late:!!c.orient.late };
    const mk = c.finish && Array.isArray(c.finish.marks) ? c.finish.marks.find(x => x.s === 'wait' && (x.k === 'O' || (x.k === 'V' && /^Invited/.test(x.tip || '')))) : null;
    if(mk) return { k:mk.k === 'O' ? 'orient' : 'video' };
    if(['oig', 'edl', 'fcsr', 'casenet'].some(k => c[k] && (c[k].s === 'todo' || c[k].s === 'wait'))) return { skip:'checks' };
    return { skip:'office' };
  }
  /* longest first; unknown days last */
  const fuSort = list => list.slice().sort((a, b) => (b.days == null ? -1 : b.days) - (a.days == null ? -1 : a.days) || String(a.name).localeCompare(String(b.name)));

  /* the live read: the lists their own tabs read, read once in the background if this page is the first to need them */
  const FU = { ap:0, eng:false, off:0, opr:0, txt:0 };
  const G = n => { try{ return (0, eval)(n); }catch(e){ return undefined; } };
  const again = () => { try{ if(activeTab === 'kpfollow') render('kpfollow'); }catch(e){} };
  function fuEnsure(){
    const now = Date.now(), rows = G('AP_ROWS'), E = W.HSTRIP_ENGINE;
    if((!Array.isArray(rows) || !rows.length) && typeof G('apLoad') === 'function' && now - FU.ap > 5 * 60e3){
      FU.ap = now; Promise.resolve().then(() => G('apLoad')()).catch(() => {}).then(again);
    }
    if(!E && !FU.eng && typeof G('scxEnsure') === 'function'){
      FU.eng = true; W.addEventListener('scx-ready', again); W.addEventListener('scx-hydrated', again);
      try{ G('scxEnsure')('cgbackground'); }catch(e){}
    }
    if(E && !(E.offers() || []).length && now - FU.off > 5 * 60e3 && W.SCX && typeof SCX.loadOffers === 'function'){
      FU.off = now; Promise.resolve().then(() => SCX.loadOffers()).catch(() => {}).then(again);
    }
    if(W.OPR && typeof OPR.counts === 'function' && !OPR.counts() && now - FU.opr > 5 * 60e3){
      FU.opr = now; Promise.resolve().then(() => OPR.load()).catch(() => {}).then(again);
    }
    if(W.ApText && now - FU.txt > 5 * 60e3){ FU.txt = now; Promise.resolve().then(() => ApText.load()).catch(() => {}); }
  }
  function fuGather(){
    fuEnsure();
    const now = Date.now(), out = [], rows = G('AP_ROWS'), E = W.HSTRIP_ENGINE;
    const apReady = Array.isArray(rows) && rows.length > 0, AP = apReady ? rows : [];
    const apFor = (ph, em) => { const p = last10(ph), e = lc(em); return AP.find(r => (p.length === 10 && last10(r.phone) === p) || (e && lc(r.email) === e)) || null; };
    const posOf = r => { try{ return (typeof G('apPosLabel') === 'function' && G('apPosLabel')(r.position)) || r.posting_title || 'Caregiver'; }catch(e){ return 'Caregiver'; } };
    const okTag = r => (W.OKO && typeof OKO.isOk === 'function' && OKO.isOk(r)) ? ' · Oklahoma' : '';
    let krystal = 0, engReady = false;
    const seen = new Set();
    if(E){
      let ppl = [];
      try{ ppl = E.hydrated() === false ? [] : (E.people() || []); engReady = E.hydrated() !== false; }catch(e){ ppl = []; }
      const offers = (() => { try{ return E.offers() || []; }catch(e){ return []; } })();
      const offerOf = id => id ? offers.find(o => String(o.id) === String(id)) || null : null;
      const people = ppl.filter(p => p && p.stop !== 4);
      /* with Offers inside Onboarding switched off, the open offers are not rows there: the same two stages the hiring strip counts */
      const have = new Set(ppl.map(p => String((p.o && p.o.id) || (p.c && p.c.offer_id) || (p.j && p.j.offer_id) || '')).filter(Boolean));
      if(!ppl.some(p => p.o)) offers.forEach(o => { try{
        if(!o || have.has(String(o.id)) || E.offerMovedOn(o)) return;
        const st = E.offerStage(o);
        if(st === 'sent' && !E.offerIsQuiet(o)) people.push({ stop:0, o, name:((o.first_name || '') + ' ' + (o.last_name || '')).trim(), _k:'offer', _d:daysSince(o.offer_sent_at || o.created_at, now) });
        else if(st === 'accepted') people.push({ stop:0, o, name:((o.first_name || '') + ' ' + (o.last_name || '')).trim(), _k:'step1', _d:daysSince(o.offer_signed_at || o.offer_sent_at || o.created_at, now) });
      }catch(e){} });
      people.forEach(p => {
        let st, m = null;
        if(p._k) st = { k:p._k, days:p._d };
        else { try{ m = E.model(p); }catch(e){ return; } st = fuStage(m); }
        if(st.skip){ if(st.skip === 'checks') krystal++; return; }
        const o = p.o || offerOf((p.c && p.c.offer_id) || (p.j && p.j.offer_id));
        const phone = (p.c && p.c.phone) || (o && o.phone) || '', email = (p.c && p.c.email) || (o && o.email) || '';
        const stuck = st.k === 'step1' && p.j && typeof E.step1Stuck === 'function' ? E.step1Stuck(p.j) : null;
        const days = stuck && stuck.days != null ? stuck.days : st.days != null ? st.days : (m && m.days != null ? m.days : null);
        if(days !== null && days < 1) return;   /* today: give them the day */
        const ap = apFor(phone, email);
        if(phone) seen.add(last10(phone)); if(email) seen.add(lc(email));
        const on = stuck && stuck.card && stuck.card.stuck_on ? ' (stopped on ' + stuck.card.stuck_on + ')' : '';
        out.push({ name:p.name || 'Name not recorded', pos:(o && o.position) || (p.c && p.c.position) || 'Caregiver', say:FU_SAY[st.k] + on, k:st.k, days,
          late:!!(st.late || stuck), phone, email, apId:ap ? String(ap.id) : '',
          open:p.c ? { candidate_id:p.c.id } : o ? { offer_id:String(o.id) } : null });
      });
    }
    if(apReady){
      const h = { decided:G('AP_DECIDED') || ['offer','hired','pool','left','declined'], qualified:G('apQualified') || (() => true),
        offered:G('apIsOffered') || (() => false), noshowElsewhere:G('apNoshowElsewhere') || (() => false) };
      /* one row per person (2026-11-09, live check: 5 people were listed twice because they applied twice). Same phone or
         email = same person. A half-done form is left out when that person has any other application that went further,
         and of their open rows the furthest along ("hasn't booked") is the one kept. */
      const keysOf = r => [last10(r.phone).length === 10 ? 'p' + last10(r.phone) : '', r.email ? 'e' + lc(r.email) : ''].filter(Boolean);
      const further = new Set();
      AP.forEach(r => { if(r && r.status !== 'partial') keysOf(r).forEach(k => further.add(k)); });
      const picked = new Map();
      fuApplicants(AP, G('AP_BOOK') || {}, now, h).forEach(x => {
        const ks = keysOf(x.r);
        if(x.k === 'form' && ks.some(k => further.has(k))) return;
        const k = ks[0] || 'id' + x.r.id, prev = picked.get(k) || ks.map(kk => picked.get(kk)).find(Boolean);
        if(prev && (prev.k === 'book' || x.k !== 'book')) return;
        if(prev) picked.forEach((v, kk) => { if(v === prev) picked.delete(kk); });
        ks.concat(k).forEach(kk => picked.set(kk, x));
      });
      [...new Set(picked.values())].forEach(x => {
        const r = x.r;
        if((last10(r.phone).length === 10 && seen.has(last10(r.phone))) || (r.email && seen.has(lc(r.email)))) return;   /* already listed from Onboarding */
        if(x.days !== null && x.days < 1) return;
        out.push({ name:((r.first_name || '') + ' ' + (r.last_name || '')).trim() || 'Name not recorded', pos:posOf(r) + okTag(r), say:FU_SAY[x.k], k:x.k,
          days:x.days, late:false, phone:r.phone || '', email:r.email || '', apId:String(r.id), open:{ applicant_id:String(r.id) } });
      });
    }
    return { list:fuSort(out), krystal, reading:!apReady || !engReady };
  }
  function viewFollow(ctx){
    const { mine, nm } = ctx, g = fuGather(), n = g.list.length;
    const openOn = x => x.open ? ' onclick="KP.openPerson(' + esc(JSON.stringify(x.open)) + ');return false;"' : '';
    const row = x => `<div class="kp-task kp-fu"><div class="kp-t">
        <div><a href="#" class="kp-fu-name"${openOn(x)}>${esc(x.name)}</a> <span class="kp-when">· ${esc(x.pos)}</span></div>
        <div>${esc(x.say)}${x.days != null ? ` <span class="${x.late || x.days >= 7 ? 'kp-due' : 'kp-when'}">· ${x.days} day${x.days === 1 ? '' : 's'}</span>` : ''}</div>
        ${x.apId && W.ApText ? `<div class="kp-fu-chip">${ApText.slot(x.apId)}</div>` : ''}
        <div class="kp-row kp-fu-b">${x.apId && W.ApText ? ApText.btn(x.apId) : ''}${x.phone && typeof W.ocAttrs === 'function' ? `<a class="fb" style="text-decoration:none"${W.ocAttrs(x.phone, { email:x.email })}>📞 Call</a>` : ''}
          ${!x.phone && !x.apId ? '<span class="kp-when">No phone number on file</span>' : ''}</div></div></div>`;
    return `<div class="kp-card"><h3>Applicants to follow up with <span class="kp-fu-n">${n}</span></h3>
      <p class="kp-when" style="margin-top:0">Everyone waiting on their own next step, longest first. A personal text or call often gets them going again. Nothing is sent until you press Send.</p>
      ${g.reading ? '<p class="kp-when">Still reading the applicant lists…</p>' : ''}
      ${n ? g.list.map(row).join('') : (g.reading ? '' : '<p>Nobody is stuck right now.</p>')}
      <p class="kp-when" style="margin-top:12px">${g.krystal ? g.krystal + ' more ' + (g.krystal === 1 ? 'is' : 'are') + ' waiting on background checks: Krystal has ' + (g.krystal === 1 ? 'that one' : 'those') + '. ' : ''}No-shows, hires and anyone taken off the list are left out.${mine ? '' : ' This is the list ' + esc(nm) + ' sees.'}</p></div>`;
  }
  function openPerson(k){ try{ if(W.HP && typeof HP.open === 'function') HP.open(k); }catch(e){} }

  /* ── COMING UP ON SOCIAL (Samantha 2026-11-10: "can Blotato's calendar be embedded into Katlin's hub page so she can
     easily review the posts" ... "Yes, build it"). Blotato's own calendar needs Samantha's sign-in, so the Training
     server (blotato-coming-up) reads the schedule with the key it keeps and hands back when / which page / words /
     media. Read only. The reviewer's tool is "Tell Samantha", a note to the owners like the Notes pill. ── */
  const SOC = { list:null, at:0, busy:false, err:'', days:7, page:'', open:{} };
  const SOC_URL = 'https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/blotato-coming-up';
  async function loadSocial(force){
    if(SOC.busy) return;
    if(!force && SOC.list && Date.now() - SOC.at < 10 * 60e3) return;
    SOC.busy = true; SOC.err = '';
    try{
      const anon = (() => { try{ return COMMS_ANON; }catch(e){ return ''; } })();
      const tok = typeof W.trainHubTok === 'function' ? await W.trainHubTok() : '';
      const r = await fetch(SOC_URL, { method:'POST', headers:{ 'x-hub-token':tok, 'apikey':anon, 'Authorization':'Bearer ' + anon, 'Content-Type':'application/json' },
        body:JSON.stringify({ days:SOC.days }) });
      const d = await r.json().catch(() => ({}));
      if(!r.ok || !d || !d.ok) throw new Error((d && d.error) || 'no answer');
      SOC.list = Array.isArray(d.posts) ? d.posts : []; SOC.at = Date.now();
    }catch(e){ SOC.err = 'The scheduled posts did not load' + (e && e.message && e.message !== 'no answer' ? ' (' + e.message + ')' : '') + '. Try Refresh in a few minutes.'; }
    SOC.busy = false;
    try{ if(activeTab === 'kpsocial') render('kpsocial'); }catch(e){}
  }
  /* posts -> [{ day:'2026-11-10', posts:[...] }] by Missouri day, earliest first; page '' = every page */
  function socialDays(posts, page){
    const g = new Map();
    (posts || []).filter(p => p && p.at && (!page || p.page === page)).slice().sort((a, b) => String(a.at).localeCompare(String(b.at)))
      .forEach(p => { const k = dayOf(p.at); if(!g.has(k)) g.set(k, []); g.get(k).push(p); });
    return [...g.entries()].map(([day, posts]) => ({ day, posts }));
  }
  const isVideo = u => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(String(u || ''));
  const fmtTime = t => { try{ return new Date(t).toLocaleTimeString('en-US', { timeZone:TZ, hour:'numeric', minute:'2-digit' }); }catch(e){ return ''; } };
  function socialPost(p){
    const sid = esc(p.id), open = SOC.open[p.id];
    const media = (p.media || []).slice(0, 6).map(u => isVideo(u)
      ? `<video src="${esc(u)}" controls preload="metadata" playsinline></video>`
      : `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Photo for this post" loading="lazy"></a>`).join('');
    const more = (p.media || []).length > 6 ? `<span class="kp-when">+${p.media.length - 6} more</span>` : '';
    return `<div class="kp-sp"><div class="kp-sp-top"><span class="kp-sp-time">${esc(fmtTime(p.at))}</span>
        <span class="kp-chip">${esc(p.platform_name || p.platform || 'Social')}</span><span>${esc(p.page)}</span></div>
      ${p.title ? `<div style="font-weight:600;margin-bottom:4px">${esc(p.title)}</div>` : ''}
      ${p.text ? `<div class="kp-text">${esc(p.text)}</div>` : '<div class="kp-when">No words with this post.</div>'}
      ${media || more ? `<div class="kp-media">${media}${more}</div>` : ''}
      <div class="kp-row">${open ? `<input id="kpSp_${sid}" placeholder="What looks wrong?" style="flex:1;min-width:200px" onkeydown="if(event.key==='Enter')KP.flagPost('${sid}')">
          <button class="primary" onclick="KP.flagPost('${sid}')">Send to Samantha</button><button class="kp-x" onclick="KP.flagOpen('${sid}',false)">cancel</button>`
        : `<button class="secondary" onclick="KP.flagOpen('${sid}',true)">Something's wrong? Tell Samantha</button>`}
        <span class="kp-when" id="kpSpSaid_${sid}"></span></div></div>`;
  }
  function viewSocial(ctx){
    if(!SOC.list && !SOC.err) loadSocial(false);
    else if(SOC.list && Date.now() - SOC.at > 10 * 60e3) loadSocial(false);
    const pages = [...new Set((SOC.list || []).map(p => p.page))].sort();
    if(SOC.page && pages.indexOf(SOC.page) < 0) SOC.page = '';
    const days = socialDays(SOC.list, SOC.page), n = days.reduce((a, d) => a + d.posts.length, 0);
    let html = `<div class="kp-card"><h3>Coming up on our pages <span class="kp-fu-n">${n}</span></h3>
      <p class="kp-when" style="margin-top:0">Straight from Blotato, Missouri time.${SOC.at ? ' Read at ' + esc(fmtTime(SOC.at)) + '.' : ''} Nothing here can change or delete a post: if one needs a fix, tell Samantha.</p>
      <div class="kp-row" style="margin-top:0"><select onchange="KP.socialPick(this.value)"><option value="">Every page</option>${pages.map(p => `<option value="${esc(p)}"${p === SOC.page ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select>
        <select onchange="KP.socialDaysPick(this.value)"><option value="7"${SOC.days === 7 ? ' selected' : ''}>Next 7 days</option><option value="14"${SOC.days === 14 ? ' selected' : ''}>Next 14 days</option></select>
        <button class="secondary" onclick="KP.socialRefresh()">${SOC.busy ? 'Reading…' : 'Refresh'}</button></div>`;
    if(SOC.err) html += `<div class="kp-warn" style="margin-top:10px">${esc(SOC.err)}</div>`;
    if(!SOC.list){ html += SOC.err ? '' : '<p class="kp-when">Reading the schedule from Blotato…</p>'; return html + '</div>'; }
    if(!n) html += '<p>Nothing scheduled in this window.</p>';
    html += days.map(d => `<div class="kp-grp" style="margin-top:16px">${esc(fmtDay(d.day))} · ${d.posts.length} post${d.posts.length === 1 ? '' : 's'}</div>` + d.posts.map(socialPost).join('')).join('');
    return html + '</div>';
  }
  function socialPick(v){ SOC.page = String(v || ''); render('kpsocial'); }
  function socialDaysPick(v){ SOC.days = Number(v) === 14 ? 14 : 7; SOC.list = null; loadSocial(true); render('kpsocial'); }
  function socialRefresh(){ loadSocial(true); render('kpsocial'); }
  function flagOpen(id, on){ SOC.open[id] = !!on; render('kpsocial'); if(on){ const el = document.getElementById('kpSp_' + id); if(el) el.focus(); } }
  async function flagPost(id){
    const p = (SOC.list || []).find(x => String(x.id) === String(id)); if(!p) return;
    const what = String((document.getElementById('kpSp_' + id) || {}).value || '').trim();
    if(!what){ alert('Write what looks wrong first.'); return; }
    const msg = 'About the ' + (p.platform_name || 'social') + ' post on ' + p.page + ', ' + fmtAt(p.at) + ' (Blotato schedule ' + p.id + '): ' + what
      + (p.text ? '\n\nIt starts: "' + String(p.text).slice(0, 120) + (p.text.length > 120 ? '…' : '') + '"' : '');
    const soon = Date.parse(p.at) - Date.now() < 24 * 3600e3;
    try{ await noteToOwners(msg, soon ? 'Today' : 'This week'); }catch(e){ alert('Your note did not send. Please try again.'); return; }
    SOC.open[id] = false; render('kpsocial');
    const s = document.getElementById('kpSpSaid_' + id); if(s) s.textContent = 'Sent. Samantha will see it in My Work.';
  }

  /* ── render the view for the active pill ── */
  const HOST = { kptasks:'kpWrapTasks', kpfollow:'kpWrapFollow', kpnextdoor:'kpWrapNextdoor', kpsocial:'kpWrapSocial', kpnotes:'kpWrapNotes', kprecruit:'kpWrapRecruit' };
  function render(view){
    let v = view; try{ if(!v) v = isKp(activeTab) ? activeTab : 'kptasks'; }catch(e){ v = v || 'kptasks'; }
    if(v === 'katlinpage') v = 'kptasks';
    const host = document.getElementById(HOST[v]); if(!host) return;
    host.classList.add('kpw'); css(); pillSync();
    if(!allowed()){ host.innerHTML = '<div class="kp-card">This page is private.</div>'; return; }
    const isOwner = owner(), email = pageEmail();
    if(!email){
      if(!isOwner){ host.innerHTML = '<div class="kp-card">This page is private.</div>'; return; }
      const staff = (D().coordinator_staff || []).filter(s => s && s.email && s.active !== false).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      host.innerHTML = `<div class="kp-h">Katlin's page</div><div class="kp-sub">Her own page: tasks you give her, the Nextdoor posts, notes to you and recruiting posts.</div>
        <div class="kp-card"><h3>Whose page is this?</h3><p>Pick her from the team list. Only she and the owners will see this page.</p>
        <div class="kp-row"><select id="kpWho"><option value="">Choose a person</option>${staff.map(s => `<option value="${esc(lc(s.email))}">${esc(s.name || s.email)}</option>`).join('')}</select>
        <button class="primary" onclick="KP.setWho()">Save</button></div></div>`;
      return;
    }
    const ctx = { c:cfg(), today:dayOf(Date.now()), isOwner, email, nm:first(email), mine:me() === email };
    const SUB = { kptasks:ctx.mine ? 'Your tasks from Samantha. Tick each one when it is done.' : 'What ' + esc(ctx.nm) + ' sees. Add a task and it shows up on her page.',
      kpfollow:ctx.mine ? 'Applicants who stopped partway. Reach out to each one personally.' : 'The applicants ' + esc(ctx.nm) + ' follows up with: everyone who stopped partway, longest first.',
      kpnextdoor:'One post every Tuesday on the Caring Companions Nextdoor page.',
      kpsocial:ctx.mine ? 'Every post scheduled on our pages for the next week. Look each one over and tell Samantha if something is wrong.' : 'What ' + esc(ctx.nm) + ' reviews: every post scheduled in Blotato for the next week, read only.',
      kpnotes:ctx.mine ? 'Notes to Samantha, and her replies.' : 'Notes ' + esc(ctx.nm) + ' sent you. Reply here and it closes the card in your My Work.',
      kprecruit:'Job posts for Caring Companions, CDS and Show-Me Neighbors: where to post, how often, and a log of each post.' };
    let html = `<div class="kp-h">${esc(pageLabel())}</div><div class="kp-sub">${SUB[v]}</div>`;
    html += v === 'kptasks' ? viewTasks(ctx) : v === 'kpfollow' ? viewFollow(ctx) : v === 'kpnextdoor' ? viewNextdoor(ctx) : v === 'kpsocial' ? viewSocial(ctx) : v === 'kpnotes' ? viewNotes(ctx) : viewRecruit(ctx);
    if(isOwner) html += `<p class="kp-when">Only ${esc(ctx.nm)} and the owners can see this page. <a href="#" onclick="KP.changeWho();return false;">Change whose page this is</a></p>`;
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
  async function noteToOwners(message, urgency){
    const t = { id:(typeof W.uid === 'function' ? W.uid() : 'kpn_' + Date.now().toString(36)), direction:'to_owners', kind:'update', urgency,
      about:'', caregiver:'', lead_id:null, message, created_at:new Date().toISOString(), from_name:meName(), from_email:me(),
      status:'open', done_at:null, done_by:null, reply:'' };
    const d = D(); d.staffing_tasks = d.staffing_tasks || []; d.staffing_tasks.push(t);
    await W.persist('staffing_tasks', t);
  }
  async function sendNote(){
    const box = document.getElementById('kpNote'), message = String((box || {}).value || '').trim();
    if(!message){ alert('Write the note first.'); return; }
    const urgency = String((document.getElementById('kpNoteWhen') || {}).value || 'This week');
    try{
      await noteToOwners(message, urgency);
      if(box) box.value = '';
      render(); const s = document.getElementById('kpNoteSaid'); if(s) s.textContent = 'Sent. Samantha will see it in My Work.';
    }catch(e){ alert('Your note did not send. Please try again.'); }
  }

  async function reply(id){
    if(!owner()) return;
    const t = (D().staffing_tasks || []).find(x => x.id === id); if(!t) return;
    const text = String((document.getElementById('kpRe_' + id) || {}).value || '').trim();
    t.reply = text; t.reply_at = new Date().toISOString(); t.reply_by_name = meName();
    t.status = 'done'; t.done_at = t.reply_at; t.done_by = meName();   /* same as coordMsgDone; the owners' card closes itself */
    try{ await W.persist('staffing_tasks', t); }catch(e){ alert('That did not save. Please try again.'); }
    render();
  }
  async function logPost(placeId){
    const pl = places().find(x => x.id === placeId); if(!pl) return;
    const link = String((document.getElementById('kpLk_' + placeId) || {}).value || '').trim();
    const business = String((document.getElementById('kpBz_' + placeId) || {}).value || '');
    if(!business){ alert('Pick which business the post was for.'); return; }
    const rep = (W.AFH && typeof W.AFH.repeatOf === 'function') ? W.AFH.repeatOf(rposts(), business, pl.name, Date.now()) : null;
    if(rep && !confirm('Already posted for ' + bizName(business) + ' there on ' + fmtAt(rep.at) + '.\n\nGroups often remove people who post the same thing again within 14 days. Log it anyway?')) return;
    const item = { id:'rp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), at:new Date().toISOString(), by:me(), business, where:whereOf(pl.name), place:pl.name, link, replies:0, place_id:pl.id };
    const DD = D(); DD.recruit_posts = (DD.recruit_posts || []).concat([item]);
    try{ await W.persist('recruit_posts', item); }catch(e){ alert('That did not save. Please try again.'); return; }
    render();
  }
  async function addPlace(){
    if(!owner()) return;
    const v = id => String((document.getElementById(id) || {}).value || '').trim();
    const name = v('kpPlName'); if(!name){ alert('Write where to post first.'); return; }
    const pl = { id:newId('kpp_'), name, biz:v('kpPlBiz'), every:v('kpPlEvery'), note:v('kpPlNote'), by:me(), at:new Date().toISOString() };
    await save(kp => { if(!Array.isArray(kp.places)) kp.places = PLACE_STARTER.map(x => Object.assign({}, x)); kp.places.push(pl); return ['recruiting place added: ' + name.slice(0, 50)]; }, 'Katlin\'s page');
    render();
  }
  async function removePlace(id){
    if(!owner()) return;
    const pl = places().find(x => x.id === id); if(!pl || !confirm('Remove this place?\n\n' + pl.name)) return;
    await save(kp => { if(!Array.isArray(kp.places)) kp.places = PLACE_STARTER.map(x => Object.assign({}, x)); kp.places = kp.places.filter(x => x.id !== id); return ['recruiting place removed: ' + pl.name.slice(0, 50)]; }, 'Katlin\'s page');
    render();
  }
  async function saveLinks(){
    if(!owner()) return;
    const text = String((document.getElementById('kpLinks') || {}).value || '').trim();
    await save(kp => { kp.recruit_links = text; return ['where to send people changed']; }, 'Katlin\'s page');
    render();
  }
  async function addNeed(){
    if(!owner()) return;
    const v = id => String((document.getElementById(id) || {}).value || '').trim();
    const position = v('kpNdPos'); if(!position){ alert('Write the position first.'); return; }
    const n = { id:newId('kpn_'), biz:v('kpNdBiz'), position, area:v('kpNdArea'), hours:v('kpNdHours'), note:v('kpNdNote'), by:me(), at:new Date().toISOString() };
    await save(kp => { kp.hiring_needs = (Array.isArray(kp.hiring_needs) ? kp.hiring_needs : []).concat([n]); return ['hiring need added: ' + position.slice(0, 50)]; }, 'Katlin\'s page');
    render();
  }
  async function removeNeed(id){
    if(!owner()) return;
    const n = (cfg().hiring_needs || []).find(x => x.id === id); if(!n || !confirm('Remove this hiring need?\n\n' + n.position)) return;
    await save(kp => { kp.hiring_needs = (kp.hiring_needs || []).filter(x => x.id !== id); return ['hiring need removed: ' + n.position.slice(0, 50)]; }, 'Katlin\'s page');
    render();
  }

  const KP = { allowed, isKp, pillSync, navPill, render, setWho, changeWho, addTask, removeTask, tick, posted, copy, sendNote, reply, logPost, addPlace, removePlace, saveLinks, addNeed, removeNeed, refreshAuto, openPerson, socialPick, socialDaysPick, socialRefresh, flagOpen, flagPost,
    _rules:{ dayOf, weekOf, isDone, currentPost, upcoming, missed, STARTER, placeDue, autoNeeds, townOf, fuApplicants, fuStage, fuSort, FU_SAY, socialDays, isVideo } };
  W.KP = KP;
  if(typeof module !== 'undefined' && module.exports) module.exports = KP;
})(typeof window !== 'undefined' ? window : globalThis);
