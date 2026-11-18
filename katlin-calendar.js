/* =====================================================================================================================
   KATLIN'S CALENDAR (Samantha 2026-11-18: "Katlin's page, can we revamp and give her a good calendar").
   The first pill on Katlin's page. It shows the SAME tasks as the Tasks pill (ops_settings.katlin_page.tasks), laid out
   on her shift days, so there is one list of work and no second copy:
     · every day tasks land on each shift day (her After Hours duty window, Mon to Fri 5:30 to 7:30 PM Missouri)
     · every week tasks land on the days named at the start of the task ("CDS Friday: ...", "Tuesday, Wednesday,
       Thursday: ...") or on the days an owner picks; otherwise Monday
     · one-time tasks land on their date; without a date they wait in "No day yet"
     · every month tasks land on the day of the month of their date
     · Tuesday's Nextdoor post (nextdoor/posts.json) and a count of the social posts Blotato will publish
   Each task on each day is ticked off on its own and can be moved to another day (button, date picker or drag).
   Saved in ops_settings.katlin_page.occ through the page's own audited save (tkMerge):
     occ['<task id>@<YYYY-MM-DD>'] = { done:{at,by,by_name}, to:'<YYYY-MM-DD>' }   (older than 60 days is pruned)
   Times are Missouri's, with Katlin's own clock (Vietnam) beside them. Nothing here texts, emails or calls anyone.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const W = root, TZ = 'America/Chicago';
  const lc = s => String(s || '').trim().toLowerCase();

  /* ── pure rules (tested in node: tests/katlin-calendar-test.js) ── */
  const DAYN = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const DAY3 = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const addDays = (day, n) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dowOf = day => new Date(day + 'T12:00:00Z').getUTCDay();
  const dayOf = t => new Date(t).toLocaleDateString('en-CA', { timeZone:TZ });
  const mondayOf = day => addDays(day, -((dowOf(day) + 6) % 7));

  /* the words before the first colon, when they are only day names ("CDS Tuesday, Wednesday, Thursday") */
  function headOf(text){
    const m = String(text || '').match(/^([^:]{2,70}):\s*([\s\S]*)$/);
    if(!m) return null;
    const words = lc(m[1]).replace(/[,&]/g, ' ').split(/\s+/).filter(Boolean);
    const days = words.map(w => DAYN.indexOf(w)).filter(i => i >= 0);
    const onlyDays = days.length > 0 && words.every(w => DAYN.indexOf(w) >= 0 || w === 'and' || w === 'cds');
    return { head:m[1].trim(), rest:m[2].trim(), days, onlyDays, cds:words.indexOf('cds') >= 0 };
  }
  /* which days a weekly task falls on (0 Sun .. 6 Sat) */
  function daysOf(t){
    if(Array.isArray(t.days) && t.days.length) return t.days.map(Number);
    const h = headOf(t.text);
    return h && h.days.length ? [...new Set(h.days)] : [1];
  }
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  function shortOf(s, n){
    let x = String(s || '').split(/\.\s|\s\(|\n/)[0].trim().replace(/[.:,;]$/, '');
    if(x.length > n){ x = x.slice(0, n); x = x.slice(0, Math.max(x.lastIndexOf(' '), n - 15)).replace(/[,;:]$/, '') + '…'; }
    return x;
  }
  /* a short name for the calendar; the full words stay under "How to" */
  function titleOf(t){
    if(t.title) return String(t.title);
    const h = headOf(t.text);
    if(h && !h.onlyDays && h.head.length <= 60) return h.head;
    if(h && h.onlyDays) return (h.cds ? 'CDS: ' : '') + cap(shortOf(h.rest, 64));
    return cap(shortOf(t.text, 64));
  }
  /* How to as numbered steps (her ask 2026-11-18: "it needs to have more instructions for her - how to").
     The task's own words, without the short name in front, one sentence per step. */
  function stepsOf(t){
    let x = String(t.text || '').trim();
    const h = headOf(x);
    if(h && !t.title && h.rest) x = h.rest;
    return x.split(/\n+|(?<=[.!?])\s+(?=[A-Z'"(])/).map(s => cap(s.trim())).filter(Boolean);
  }
  /* web addresses in the steps become links (an email address is left alone) */
  function linkify(html){
    return html.replace(/(?<![@\w.\/])((?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:com|org|gov|net)(?:\/[^\s<,)]*)?)/gi, u => {
      const href = /^https?:/i.test(u) ? u : 'https://' + u; return `<a href="${href}" target="_blank" rel="noopener">${u}</a>`; });
  }
  function howHtml(t, escFn){
    const st = stepsOf(t), e = escFn || (s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
    if(st.length < 2) return `<div class="kc-steps">${linkify(e(st[0] || ''))}</div>`;
    return `<ol class="kc-steps">${st.map(s => `<li>${linkify(e(s))}</li>`).join('')}</ol>`;
  }
  /* when in the shift: start, by 7 PM (family calls and texts), during, end */
  const SLOTS = [ ['start', 'Start of shift'], ['by7', 'Before 7 PM Missouri'], ['any', 'During the shift'], ['end', 'End of shift'] ];
  function slotOf(t){
    if(t.slot && SLOTS.some(s => s[0] === t.slot)) return t.slot;
    const x = String(t.text || '');
    if(/start of (the )?shift/i.test(x)) return 'start';
    if(/end of (the )?shift/i.test(x)) return 'end';
    if(/\b7\s*PM\b/i.test(x)) return 'by7';
    return 'any';
  }
  const CATS = { cds:['CDS', '#14606F', '#E3F1F3'], hiring:['Hiring', '#9C6410', '#FBF0DC'], social:['Social', '#2F6B3A', '#E6F2E6'], other:['Samantha', '#5B4B8A', '#EEEAF7'] };
  function catOf(t){
    if(t.cat && CATS[t.cat]) return t.cat;
    const x = String(t.text || '');
    if(/^\s*CDS\b/.test(x) || /\bCDS\b/.test(t.title || '')) return 'cds';
    if(/nextdoor|blotato|social|instagram|facebook post/i.test(x)) return 'social';
    if(/applicant|onboard|recruit|interview|hiring|job post/i.test(x)) return 'hiring';
    return 'other';
  }

  /* her shift: the After Hours duty window for that person (Hub-editable), else Mon to Fri 5:30 to 7:30 PM */
  function shiftOf(windows, email){
    const w = (windows || []).find(x => x && x.active !== false && x.status !== 'ended' && lc(x.person) === lc(email) && x.area === 'after_hours' && x.recur);
    const r = (w && w.recur) || {};
    return { days:Array.isArray(r.days) && r.days.length ? r.days.map(Number) : [1, 2, 3, 4, 5], from:r.from || '17:30', to:r.to || '19:30' };
  }
  const isShiftDay = (shift, day) => shift.days.indexOf(dowOf(day)) >= 0;
  function nextShiftDay(shift, day, after){
    let d = after ? addDays(day, 1) : day;
    for(let i = 0; i < 8; i++){ if(isShiftDay(shift, d)) return d; d = addDays(d, 1); }
    return d;
  }
  /* does the task fall on this day by itself (before any move)? */
  function natural(t, day, shift){
    const every = t.every || '';
    if(every === 'day') return isShiftDay(shift, day);
    if(every === 'week') return daysOf(t).indexOf(dowOf(day)) >= 0;
    if(every === 'month'){
      const base = t.date || (t.at ? dayOf(t.at) : '');
      if(!base || day < base) return false;
      const want = Number(base.slice(8, 10));
      /* the day of the month, or the month's last day when shorter; a weekend falls back to Friday */
      const dim = new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)), 0)).getUTCDate();
      let hit = day.slice(0, 8) + String(Math.min(want, dim)).padStart(2, '0');
      const dw = dowOf(hit); if(dw === 6) hit = addDays(hit, -1); if(dw === 0) hit = addDays(hit, -2);
      return hit === day;
    }
    return !!t.date && t.date === day;
  }
  const keyOf = (id, day) => id + '@' + day;
  /* ticked? A one-time task is done once. The page's older ticks (done[id], before the calendar) still count for that day / week. */
  function occDone(t, from, c){
    const o = ((c || {}).occ || {})[keyOf(t.id, from)];
    if(o && o.done) return o.done;
    const d = ((c || {}).done || {})[t.id];
    if(!d || !d.at) return null;
    if(!t.every) return d;
    if(t.every === 'day') return dayOf(d.at) === from ? d : null;
    if(t.every === 'week') return mondayOf(dayOf(d.at)) === mondayOf(from) && dowOf(from) === daysOf(t)[0] ? d : null;
    return null;
  }
  /* everything on one day: [{ t, key, from, day, moved, done }] in the task list's order */
  function itemsOn(tasks, c, day, shift){
    const occ = (c || {}).occ || {}, out = [];
    (tasks || []).forEach(t => {
      if(!t || !t.id) return;
      if(natural(t, day, shift)){
        const o = occ[keyOf(t.id, day)];
        if(!(o && o.to && o.to !== day)) out.push({ t, key:keyOf(t.id, day), from:day, day, moved:false, done:occDone(t, day, c) });
      }
    });
    Object.keys(occ).forEach(k => {
      const o = occ[k]; if(!o || o.to !== day) return;
      const at = k.lastIndexOf('@'), id = k.slice(0, at), from = k.slice(at + 1);
      if(from === day) return;
      const t = (tasks || []).find(x => x && x.id === id); if(!t) return;
      out.push({ t, key:k, from, day, moved:true, done:occDone(t, from, c) });
    });
    const order = new Map((tasks || []).map((t, i) => [t && t.id, i]));
    return out.sort((a, b) => (order.get(a.t.id) || 0) - (order.get(b.t.id) || 0));
  }
  /* left undone in the last 2 weeks, counted from the day the calendar started (nothing before it was ticked here).
     One-time, monthly and once-a-week tasks carry over, the latest miss only. A missed every-shift task, or one that
     comes back several days a week, just comes back, so it is not carried. */
  const START = '2026-11-18';
  function stillOpen(tasks, c, today, shift){
    const out = [], seen = new Set();
    for(let i = 1; i <= 14; i++){
      const day = addDays(today, -i); if(day < START) break;
      itemsOn(tasks, c, day, shift).forEach(x => {
        const t = x.t, carry = !t.every || t.every === 'month' || (t.every === 'week' && daysOf(t).length === 1);
        if(x.done || !carry || seen.has(t.id) || (t.at && dayOf(t.at) > x.from)) return;
        seen.add(t.id); out.push(x);
      });
    }
    return out;
  }
  const noDay = (tasks, c) => (tasks || []).filter(t => t && !t.every && !t.date && !occDone(t, '', c));
  /* drop saved ticks and moves older than 60 days, so the settings row stays small */
  function prune(occ, today){
    const cut = addDays(today, -60), out = {};
    Object.keys(occ || {}).forEach(k => { const from = k.slice(k.lastIndexOf('@') + 1); const o = occ[k];
      if(from >= cut || (o && o.to && o.to >= cut)) out[k] = o; });
    return out;
  }

  /* Missouri wall clock -> the real moment, and that moment on her clock */
  function tzOff(ts, tz){
    const p = {}; new Intl.DateTimeFormat('en-US', { timeZone:tz, hourCycle:'h23', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' })
      .formatToParts(new Date(ts)).forEach(x => { p[x.type] = x.value; });
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ts;
  }
  function moAt(day, hm){
    const [h, m] = String(hm).split(':').map(Number);
    const guess = Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10), h, m || 0);
    let t = guess - tzOff(guess, TZ); t = guess - tzOff(t, TZ); return t;
  }
  const clock = (ts, tz, wd) => new Date(ts).toLocaleString('en-US', Object.assign({ timeZone:tz, hour:'numeric', minute:'2-digit' }, wd ? { weekday:'short' } : {}));
  const VN = 'Asia/Ho_Chi_Minh';
  const span = ms => { const m = Math.max(0, Math.round(ms / 60000)), h = Math.floor(m / 60); return (h ? h + ' h ' : '') + (m % 60) + ' min'; };
  /* where the shift stands right now */
  function shiftNow(now, shift){
    const today = dayOf(now);
    if(isShiftDay(shift, today)){
      const a = moAt(today, shift.from), b = moAt(today, shift.to), seven = moAt(today, '19:00');
      if(now < a) return { k:'soon', day:today, a, b, say:'Starts in ' + span(a - now) };
      if(now < b) return { k:'on', day:today, a, b, say:'On shift now · ' + span(b - now) + ' left' + (now < seven ? ' · family calls and texts by 7 PM: ' + span(seven - now) : '') };
    }
    const nd = nextShiftDay(shift, today, true), a = moAt(nd, shift.from), b = moAt(nd, shift.to);
    return { k:'next', day:nd, a, b, say:'Next shift in ' + span(a - now) };
  }

  /* ── the page (KP passes its own helpers in: KP._api) ── */
  const S = { view:'week', anchor:'', sel:'', open:{}, edit:'', add:false, moving:'', drag:'' };
  const A = () => W.KP && W.KP._api;
  const esc = s => A().esc(s);
  const enc = s => esc(JSON.stringify(String(s)));

  function css(){
    if(document.getElementById('kpcCss')) return;
    const s = document.createElement('style'); s.id = 'kpcCss';
    s.textContent = `
.kpw .kc-bar{display:flex;gap:14px;align-items:center;flex-wrap:wrap;background:linear-gradient(120deg,#0D365F,#14606F);color:#fff;border-radius:14px;padding:14px 18px;margin-bottom:14px}
.kpw .kc-bar .kc-big{font-size:18px;font-weight:700}
.kpw .kc-bar .kc-sm{font-size:13px;opacity:.88}
.kpw .kc-bar .kc-stat{margin-left:auto;display:flex;gap:10px;align-items:center}
.kpw .kc-ring{--p:0;width:54px;height:54px;border-radius:50%;background:conic-gradient(#F2B84B calc(var(--p)*1%),rgba(255,255,255,.22) 0);display:grid;place-items:center}
.kpw .kc-ring b{width:42px;height:42px;border-radius:50%;background:#123f5f;display:grid;place-items:center;font-size:13px}
.kpw .kc-live{display:inline-block;background:#F2B84B;color:#0D365F;font-weight:700;border-radius:999px;padding:2px 10px;font-size:13px}
.kpw .kc-mini{display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#EAF4F6;border-radius:10px;padding:8px 12px;margin-bottom:12px;font-size:14px;color:#0D365F}
.kpw .kc-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
.kpw .kc-tools .kc-title{font-size:17px;font-weight:700;color:#0D365F;margin-right:auto}
.kpw .kc-seg{display:inline-flex;border:1px solid var(--border,#d8d3c7);border-radius:9px;overflow:hidden}
.kpw .kc-seg button{border:0;background:#fff;padding:6px 12px;cursor:pointer;font:inherit}
.kpw .kc-seg button.on{background:#0D365F;color:#fff}
.kpw .kc-nav{border:1px solid var(--border,#d8d3c7);background:#fff;border-radius:9px;padding:6px 11px;cursor:pointer;font:inherit}
.kpw .kc-week{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-bottom:14px}
.kpw .kc-col{background:#fff;border:1px solid var(--border,#e4e1d8);border-radius:12px;padding:8px;min-height:150px;display:flex;flex-direction:column;gap:5px;cursor:pointer;transition:box-shadow .15s}
.kpw .kc-col:hover{box-shadow:0 2px 10px rgba(13,54,95,.10)}
.kpw .kc-col.sel{border:2px solid #0D365F;padding:7px}
.kpw .kc-col.today .kc-dh b{background:#F2B84B;color:#0D365F;border-radius:999px;padding:0 7px}
.kpw .kc-col.off{background:#faf9f6}
.kpw .kc-col.over{background:#EAF4F6;border-style:dashed}
.kpw .kc-dh{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;color:#55677a}
.kpw .kc-dh b{font-size:15px;color:#0D365F}
.kpw .kc-pb{height:5px;background:#eeece6;border-radius:9px;overflow:hidden;margin:2px 0 3px}
.kpw .kc-pb i{display:block;height:100%;background:#14606F;border-radius:9px}
.kpw .kc-chip{font-size:12.5px;line-height:1.3;border-radius:7px;padding:4px 7px;border-left:4px solid var(--c);background:var(--b);color:#1d2b38;cursor:grab;word-break:break-word}
.kpw .kc-chip.done{opacity:.55;text-decoration:line-through}
.kpw .kc-chip.info{cursor:pointer;border-left-style:dotted}
.kpw .kc-more{font-size:12px;color:#55677a}
.kpw .kc-every{font-size:12.5px;font-weight:600;color:#0D365F;background:#F1F4F7;border-radius:7px;padding:4px 7px}
.kpw .kc-every.all{background:#E3F1F3;color:#14606F}
.kpw .kc-wkend{display:flex;flex-direction:column;gap:8px}
.kpw .kc-wkend .kc-col{min-height:70px}
.kpw .kc-month{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;margin-bottom:14px}
.kpw .kc-mh{font-size:12px;font-weight:700;color:#55677a;text-align:center;padding:2px 0}
.kpw .kc-mc{background:#fff;border:1px solid var(--border,#e4e1d8);border-radius:9px;min-height:78px;padding:5px;cursor:pointer;font-size:12px;display:flex;flex-direction:column;gap:3px}
.kpw .kc-mc.out{opacity:.45}.kpw .kc-mc.off{background:#faf9f6}
.kpw .kc-mc.sel{border:2px solid #0D365F;padding:4px}
.kpw .kc-mc.today .kc-mn{background:#F2B84B;border-radius:999px;padding:0 6px}
.kpw .kc-mn{font-weight:700;color:#0D365F;align-self:flex-start}
.kpw .kc-dots{display:flex;gap:3px;flex-wrap:wrap}
.kpw .kc-dots i{width:8px;height:8px;border-radius:50%;background:var(--c)}
.kpw .kc-dots i.done{opacity:.3}
.kpw .kc-agenda h3{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.kpw .kc-agenda h3 small{font-weight:400;color:#55677a;font-size:13px}
.kpw .kc-it{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid #f0eee8}
.kpw .kc-it:last-child{border-bottom:0}
.kpw .kc-it input[type=checkbox]{width:22px;height:22px;margin-top:0;flex:0 0 auto;cursor:pointer;accent-color:#14606F}
.kpw .kc-it .kc-n{font-weight:600;color:#0D365F}
.kpw .kc-it.done .kc-n{color:#8a978f;text-decoration:line-through}
.kpw .kc-tag{display:inline-block;font-size:11.5px;font-weight:700;border-radius:999px;padding:1px 8px;color:var(--c);background:var(--b);margin-left:6px;vertical-align:1px}
.kpw .kc-acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.kpw .kc-acts button,.kpw .kc-acts input[type=date]{font-size:12.5px;padding:3px 9px;border-radius:7px;border:1px solid var(--border,#d8d3c7);background:#fff;cursor:pointer;width:auto}
.kpw .kc-how{background:#faf9f6;border:1px solid #eee9dd;border-radius:9px;padding:9px 11px;margin-top:6px;line-height:1.45;font-size:14px}
.kpw .kc-steps{margin:0;padding-left:20px;line-height:1.5}
.kpw div.kc-steps{padding-left:0}
.kpw .kc-steps li{margin:3px 0}
.kpw .kc-steps a{color:#14606F;font-weight:600}
.kpw .kc-guide{background:#FFFBF2;border:1px solid #f0d9a8;border-radius:12px;padding:12px 16px;margin-bottom:14px}
.kpw .kc-guide summary{font-weight:700;color:#0D365F;font-size:16px;cursor:pointer}
.kpw .kc-guide ol{margin:10px 0 6px;padding-left:22px;line-height:1.5}
.kpw .kc-guide li{margin:5px 0}
.kpw .kc-form{display:grid;gap:8px;background:#faf9f6;border:1px solid #eee9dd;border-radius:10px;padding:12px;margin-top:10px}
.kpw .kc-form .kc-fr{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.kpw .kc-form input[type=text],.kpw .kc-form textarea{flex:1;min-width:200px;width:auto}
.kpw .kc-form select{width:auto}
.kpw .kc-form label{font-size:13px;display:inline-flex;gap:4px;align-items:center}
.kpw .kc-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:12.5px;color:#55677a;margin:-4px 0 12px}
.kpw .kc-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--c);margin-right:4px;vertical-align:-1px}
@media(max-width:760px){.kpw .kc-week{grid-template-columns:1fr}.kpw .kc-col{min-height:0}.kpw .kc-bar .kc-stat{margin-left:0}.kpw .kc-mc{min-height:52px}}`;
    document.head.appendChild(s);
  }

  /* the page's inputs */
  function ctxNow(){
    const a = A(), c = a.cfg(), email = a.pageEmail(), D = a.data();
    const shift = shiftOf(D.duty_windows, email);
    return { a, c, email, shift, tasks:a.tasks(), today:dayOf(Date.now()), now:Date.now() };
  }
  const cv = cat => `--c:${CATS[cat][1]};--b:${CATS[cat][2]}`;
  /* extra lines that are not tasks: Tuesday's Nextdoor post, and how many social posts go out that day */
  function infoOn(day, x){
    const out = [], posts = x.a.posts();
    (posts || []).filter(p => p.date === day).forEach(p => out.push({ kind:'nd', p, done:!!(x.c.posted || {})[p.week], title:'Nextdoor post: ' + (p.title || 'week ' + p.week) }));
    const soc = x.a.social();
    if(Array.isArray(soc)){ const n = soc.filter(p => p && p.at && dayOf(p.at) === day).length; if(n) out.push({ kind:'soc', n, title:n + ' social post' + (n === 1 ? '' : 's') + ' go out' }); }
    return out;
  }

  function shiftBar(x, compact){
    const st = shiftNow(x.now, x.shift), d = st.day;
    const items = itemsOn(x.tasks, x.c, d, x.shift), done = items.filter(i => i.done).length, pct = items.length ? Math.round(done * 100 / items.length) : 0;
    const label = d === x.today ? 'Tonight' : new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday:'long', timeZone:'UTC' });
    const mo = clock(st.a, TZ) + ' to ' + clock(st.b, TZ) + ' Missouri';
    const vn = clock(st.a, VN, true) + ' to ' + clock(st.b, VN) + ' Vietnam';
    if(compact) return `<div class="kc-mini">🗓️ <b>${esc(label)}</b> · ${esc(mo)} (${esc(vn)}) · ${esc(st.say)} · ${done} of ${items.length} done <a href="#" onclick="switchTab('kpcal');return false;">Open the calendar</a></div>`;
    return `<div class="kc-bar"><div><div class="kc-sm">${esc(label)}'s shift · ${esc(new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month:'short', day:'numeric', timeZone:'UTC' }))}</div>
        <div class="kc-big">${esc(mo)}</div><div class="kc-sm">${esc(vn)} on your clock</div></div>
      <div><span class="kc-live">${esc(st.say)}</span></div>
      <div class="kc-stat"><div class="kc-ring" style="--p:${pct}"><b>${pct}%</b></div><div class="kc-sm">${done} of ${items.length}<br>done ${d === x.today ? 'tonight' : 'that day'}</div></div></div>`;
  }

  function chip(it){
    const cat = catOf(it.t);
    return `<div class="kc-chip${it.done ? ' done' : ''}" style="${cv(cat)}" draggable="true" title="${esc(titleOf(it.t))}"
      ondragstart="KPC.dragStart(event,${enc(it.key)})" onclick="event.stopPropagation();KPC.pick(${enc(it.day)},${enc(it.key)})">${it.moved ? '↪ ' : ''}${esc(titleOf(it.t))}</div>`;
  }
  function infoChip(f, day){
    const style = f.kind === 'nd' ? cv('social') : cv('social');
    return `<div class="kc-chip info${f.done ? ' done' : ''}" style="${style}" onclick="event.stopPropagation();KPC.pick(${enc(day)},'')">${f.kind === 'nd' ? '🏡 ' : '📣 '}${esc(f.title)}</div>`;
  }
  function dayCol(day, x, max){
    const items = itemsOn(x.tasks, x.c, day, x.shift), info = infoOn(day, x), done = items.filter(i => i.done).length;
    const off = !isShiftDay(x.shift, day), d = new Date(day + 'T12:00:00Z');
    const daily = items.filter(i => i.t.every === 'day' && !i.moved), rest = items.filter(i => !(i.t.every === 'day' && !i.moved));
    const dd = daily.filter(i => i.done).length;
    const list = rest.slice(0, max), more = rest.length - list.length;
    return `<div class="kc-col${day === S.sel ? ' sel' : ''}${day === x.today ? ' today' : ''}${off ? ' off' : ''}" onclick="KPC.pick(${enc(day)},'')"
        ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" ondrop="KPC.drop(event,${enc(day)})">
      <div class="kc-dh"><span>${DAY3[d.getUTCDay()]}</span><b>${d.getUTCDate()}</b></div>
      ${items.length ? `<div class="kc-pb" title="${done} of ${items.length} done"><i style="width:${Math.round(done * 100 / items.length)}%"></i></div>` : off ? '<div class="kc-more">Day off</div>' : ''}
      ${daily.length ? `<div class="kc-every${dd === daily.length ? ' all' : ''}">${dd === daily.length ? '✓ ' : ''}Every shift · ${dd}/${daily.length}</div>` : ''}
      ${info.map(f => infoChip(f, day)).join('')}${list.map(chip).join('')}${more > 0 ? `<div class="kc-more">+${more} more</div>` : ''}</div>`;
  }
  function weekView(x){
    const mon = mondayOf(S.anchor), days = [0, 1, 2, 3, 4].map(i => addDays(mon, i));
    return `<div class="kc-week">${days.map(d => dayCol(d, x, 7)).join('')}
      <div class="kc-wkend">${dayCol(addDays(mon, 5), x, 3)}${dayCol(addDays(mon, 6), x, 3)}</div></div>`;
  }
  function monthView(x){
    const first = S.anchor.slice(0, 8) + '01', start = mondayOf(first), mo = first.slice(0, 7);
    let html = '<div class="kc-month">' + ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => `<div class="kc-mh">${d}</div>`).join('');
    for(let i = 0; i < 42; i++){
      const day = addDays(start, i); if(i === 35 && day.slice(0, 7) !== mo) break;
      const items = itemsOn(x.tasks, x.c, day, x.shift), info = infoOn(day, x);
      const once = items.filter(it => it.t.every !== 'day');
      html += `<div class="kc-mc${day.slice(0, 7) !== mo ? ' out' : ''}${day === S.sel ? ' sel' : ''}${day === x.today ? ' today' : ''}${isShiftDay(x.shift, day) ? '' : ' off'}" onclick="KPC.pick(${enc(day)},'')"
          ondragover="event.preventDefault()" ondrop="KPC.drop(event,${enc(day)})">
        <span class="kc-mn">${Number(day.slice(8))}${(() => { const dl = items.filter(it => it.t.every === 'day'); return dl.length && dl.every(it => it.done) ? ' ✓' : ''; })()}</span>
        ${once.length ? `<div class="kc-dots">${once.map(it => `<i class="${it.done ? 'done' : ''}" style="${cv(catOf(it.t))}"></i>`).join('')}</div>` : ''}
        ${info.filter(f => f.kind === 'nd').map(() => '<span>🏡 Nextdoor</span>').join('')}
        ${once.slice(0, 2).map(it => `<span style="color:${CATS[catOf(it.t)][1]};font-weight:600">${esc(shortOf(titleOf(it.t), 22))}</span>`).join('')}</div>`;
    }
    return html + '</div>';
  }

  const EVERY = { day:'every shift', week:'every week', month:'every month' };
  function repeatSay(t){
    if(t.every === 'week') return 'every ' + daysOf(t).map(d => DAY3[d]).join(', ');
    return EVERY[t.every] || 'one time';
  }
  function itemRow(it, x, isOwner){
    const t = it.t, cat = catOf(t), open = !!S.open[it.key], title = titleOf(t);
    const how = String(t.text || '').trim() !== title ? String(t.text || '') : '';
    const who = it.done && it.done.skipped ? ' · skipped' : it.done && it.done.by_name ? ` · done ${esc(clock(it.done.at, TZ))} Missouri by ${esc(String(it.done.by_name).split(' ')[0])}` : '';
    const next = nextShiftDay(x.shift, it.day, true);
    return `<div class="kc-it${it.done ? ' done' : ''}" id="kcIt_${esc(it.key.replace(/[^\w-]/g, '_'))}">
      <input type="checkbox" ${it.done ? 'checked' : ''} aria-label="Done" onchange="KPC.tick(${enc(it.key)},this.checked)">
      <div style="flex:1;min-width:0"><div><span class="kc-n">${esc(title)}</span><span class="kc-tag" style="${cv(cat)}">${CATS[cat][0]}</span></div>
        <div class="kp-when">${esc(repeatSay(t))}${it.moved ? ' · moved from ' + esc(fmtDay(it.from)) : ''}${who}</div>
        ${open && how ? `<div class="kc-how"><b>How to do it</b>${howHtml(t, esc)}</div>` : ''}
        <div class="kc-acts">${how ? `<button onclick="KPC.toggle(${enc(it.key)})">${open ? 'Hide the steps' : '📋 How to do it'}</button>` : ''}
          ${it.done ? '' : `<button onclick="KPC.move(${enc(it.key)},${enc(next)})" title="Move to ${esc(fmtDay(next))}">→ Next shift (${esc(DAY3[dowOf(next)])})</button>
          ${S.moving === it.key ? `<input type="date" value="${esc(it.day)}" onchange="KPC.move(${enc(it.key)},this.value)">` : `<button onclick="KPC.moving(${enc(it.key)})">📅 Another day</button>`}`}
          ${it.moved ? `<button onclick="KPC.move(${enc(it.key)},${enc(it.from)})">Put it back</button>` : ''}
          ${isOwner ? `<button onclick="KPC.editOpen(${enc(t.id)})">Edit</button>` : ''}</div>
        ${S.edit === t.id ? form(t) : ''}</div></div>`;
  }
  function openRow(it, x){
    return `<div class="kc-it"><div style="flex:1"><span class="kc-n">${esc(titleOf(it.t))}</span><span class="kc-tag" style="${cv(catOf(it.t))}">${CATS[catOf(it.t)][0]}</span>
      <div class="kp-when">Was on ${esc(fmtDay(it.day))}</div>
      <div class="kc-acts"><button onclick="KPC.move(${enc(it.key)},${enc(S.sel)})">Do it ${S.sel === x.today ? 'tonight' : 'on ' + esc(fmtDay(S.sel))}</button>
        <button onclick="KPC.skip(${enc(it.key)})">Skip it</button></div></div></div>`;
  }
  const fmtDay = ds => new Date(ds + 'T12:00:00Z').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', timeZone:'UTC' });

  function agenda(x, isOwner){
    const day = S.sel, items = itemsOn(x.tasks, x.c, day, x.shift), info = infoOn(day, x);
    const a = moAt(day, x.shift.from), b = moAt(day, x.shift.to), on = isShiftDay(x.shift, day);
    let html = `<div class="kp-card kc-agenda"><h3>${esc(new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', timeZone:'UTC' }))}
      <small>${on ? esc(clock(a, TZ) + ' to ' + clock(b, TZ) + ' Missouri · ' + clock(a, VN, true) + ' to ' + clock(b, VN) + ' Vietnam') : 'Not a shift day'}</small></h3>`;
    if(day === x.today || (day === nextShiftDay(x.shift, x.today, false))){
      const late = stillOpen(x.tasks, x.c, x.today, x.shift);
      if(late.length) html += `<div class="kp-warn"><b>Still open from before (${late.length})</b>${late.slice(0, 3).map(it => openRow(it, x)).join('')}
        ${late.length > 3 ? `<details><summary>${late.length - 3} more</summary>${late.slice(3).map(it => openRow(it, x)).join('')}</details>` : ''}</div>`;
      const nd = noDay(x.tasks, x.c);
      if(nd.length) html += `<div class="kp-warn" style="background:#EEEAF7;border-color:#d8cff0"><b>No day yet (${nd.length})</b>${nd.map(t => `<div class="kc-it"><div style="flex:1"><span class="kc-n">${esc(titleOf(t))}</span>
          <div class="kc-acts"><button onclick="KPC.setDate(${enc(t.id)},${enc(day)})">Put it on ${esc(fmtDay(day))}</button>${isOwner ? `<button onclick="KPC.editOpen(${enc(t.id)})">Edit</button>` : ''}</div>${S.edit === t.id ? form(t) : ''}</div></div>`).join('')}</div>`;
    }
    info.forEach(f => {
      if(f.kind === 'nd') html += `<div class="kc-it${f.done ? ' done' : ''}"><input type="checkbox" ${f.done ? 'checked' : ''} aria-label="Posted" onchange="KP.posted(${Number(f.p.week)},this.checked)">
        <div style="flex:1"><span class="kc-n">🏡 ${esc(f.title)}</span><span class="kc-tag" style="${cv('social')}">Nextdoor</span>
        <div class="kp-when">The words and the photo are on the Nextdoor pill. Post around 10 to 11 AM Missouri.</div>
        <div class="kc-acts"><button onclick="switchTab('kpnextdoor')">Open the post</button></div></div></div>`;
      else html += `<div class="kc-it"><div style="flex:1"><span class="kc-n">📣 ${esc(f.title)}</span><span class="kc-tag" style="${cv('social')}">Blotato</span>
        <div class="kc-acts"><button onclick="switchTab('kpsocial')">Look them over</button></div></div></div>`;
    });
    if(!items.length && !info.length) html += `<p class="kp-when">${on ? 'Nothing on this day yet.' : 'Nothing planned. Enjoy the day off.'}</p>`;
    SLOTS.forEach(([k, label]) => {
      const list = items.filter(it => slotOf(it.t) === k); if(!list.length) return;
      const dn = list.filter(it => it.done).length;
      html += `<div class="kp-grp">${esc(label)} <span style="color:#8a978f;font-weight:600">${dn}/${list.length}</span></div>` + list.map(it => itemRow(it, x, isOwner)).join('');
    });
    const nm = A().first(x.email);
    html += S.add ? form(null) : `<div class="kp-row"><button class="primary" onclick="KPC.addOpen()">+ ${isOwner && !A().mine() ? 'Add to ' + esc(nm) + '\'s calendar' : 'Add to my calendar'}</button>
      <span class="kp-when">Drag a task to another day to move it.</span></div>`;
    return html + '</div>';
  }

  /* add / edit: one form */
  function form(t){
    const isOwner = A().owner(), e = t || {}, id = t ? t.id : 'new';
    const every = t ? (t.every || '') : '', days = t ? daysOf(t) : [dowOf(S.sel)];
    const canRepeat = isOwner;
    return `<div class="kc-form" onclick="event.stopPropagation()">
      <div class="kc-fr"><input type="text" id="kcT_${id}" placeholder="What to do (short)" value="${esc(t ? titleOf(t) : '')}"></div>
      <div class="kc-fr"><textarea id="kcX_${id}" rows="3" placeholder="How to (optional): links, steps, who to ask">${esc(t ? (t.title ? t.text : t.text) : '')}</textarea></div>
      <div class="kc-fr">${canRepeat ? `<select id="kcE_${id}" onchange="KPC.formEvery('${id}',this.value)">
          <option value=""${every === '' ? ' selected' : ''}>One time</option><option value="day"${every === 'day' ? ' selected' : ''}>Every shift</option>
          <option value="week"${every === 'week' ? ' selected' : ''}>Every week</option><option value="month"${every === 'month' ? ' selected' : ''}>Every month</option></select>` : '<span class="kp-when">One time</span>'}
        <span id="kcDW_${id}" style="display:${every === 'week' ? 'inline-flex' : 'none'};gap:6px">${[1, 2, 3, 4, 5].map(d => `<label><input type="checkbox" class="kcDay_${id}" value="${d}"${days.indexOf(d) >= 0 ? ' checked' : ''}>${DAY3[d]}</label>`).join('')}</span>
        <span id="kcDD_${id}" style="display:${every === 'week' || every === 'day' ? 'none' : 'inline-flex'}"><input type="date" id="kcD_${id}" value="${esc(e.date || (t ? '' : S.sel))}"></span></div>
      <div class="kc-fr"><select id="kcS_${id}">${SLOTS.map(s => `<option value="${s[0]}"${(t ? slotOf(t) : 'any') === s[0] ? ' selected' : ''}>${s[1]}</option>`).join('')}</select>
        <select id="kcC_${id}">${Object.keys(CATS).map(k => `<option value="${k}"${(t ? catOf(t) : 'other') === k ? ' selected' : ''}>${k === 'other' ? 'Other' : CATS[k][0]}</option>`).join('')}</select></div>
      <div class="kc-fr"><button class="primary" onclick="KPC.saveForm('${id}')">${t ? 'Save' : 'Add it'}</button><button class="secondary" onclick="KPC.closeForm()">Cancel</button>
        ${t && isOwner ? `<button class="kp-x" style="margin-left:auto" onclick="KP.removeTask(${enc(t.id)})">Remove this task</button>` : ''}</div></div>`;
  }

  /* "How your calendar works", open until she presses Got it (remembered in this browser only) */
  const GUIDE = [
    'When your shift starts, open this page. The blue bar shows tonight\'s shift in Missouri time and your time, how long is left, and how long until 7 PM Missouri. Calls and texts to families must be done by 7 PM Missouri.',
    'Tonight\'s list is under the week. Work from the top down: <b>Start of shift</b> first, then <b>Before 7 PM</b>, then <b>During the shift</b>, and <b>End of shift</b> last.',
    'Not sure how to do a task? Press <b>📋 How to do it</b> on it. You get the steps and the links to open.',
    'Finished a task? Tick its box. Samantha sees it was done, with the time.',
    'Can\'t get to one tonight? Press <b>→ Next shift</b>, or <b>📅 Another day</b> to pick the day. On the week you can also drag a colored task to another day. Please don\'t just leave it.',
    'Missed one on an earlier day? It waits under <b>Still open from before</b>. Press <b>Do it tonight</b>, or <b>Skip it</b> if it isn\'t needed anymore.',
    'Colors: <b style="color:#14606F">CDS</b>, <b style="color:#9C6410">Hiring</b>, <b style="color:#2F6B3A">Social</b>, <b style="color:#5B4B8A">From Samantha</b>. "Every shift 3/11" on a day means 3 of the 11 every-shift tasks are done. Tuesday has the Nextdoor post: its words and photo are on the <b>Nextdoor</b> pill.',
    'Want a reminder for yourself? Press <b>+ Add to my calendar</b> at the bottom.',
    'Stuck, or have a question? Open the <b>Notes</b> pill and send Samantha a note. It goes straight to her.'
  ];
  const GKEY = 'kpc_guide_closed_v1';
  const guideClosed = () => { try{ return W.localStorage.getItem(GKEY) === '1'; }catch(e){ return false; } };
  function guide(isOwner, mine){
    const open = !guideClosed() && !(isOwner && !mine);
    return `<details class="kc-guide"${open ? ' open' : ''} ontoggle="KPC.guideToggle(this.open)"><summary>📖 ${isOwner && !mine ? 'How the calendar works (what she sees)' : 'How your calendar works'}</summary>
      <ol>${GUIDE.map(g => `<li>${g}</li>`).join('')}</ol>
      ${open ? '<button class="secondary" onclick="KPC.guideToggle(false,true)">Got it, fold this up</button>' : ''}</details>`;
  }
  function view(){
    css();
    const x = ctxNow(), isOwner = A().owner();
    if(!S.sel){ S.sel = isShiftDay(x.shift, x.today) ? x.today : nextShiftDay(x.shift, x.today, true); S.anchor = S.sel; }
    if(!x.a.posts()) x.a.loadPosts();
    x.a.loadSocial(false);
    const title = S.view === 'week'
      ? (() => { const m = mondayOf(S.anchor), f = addDays(m, 6); return fmtDay(m).replace(/^\w+, /, '') + ' to ' + fmtDay(f).replace(/^\w+, /, ''); })()
      : new Date(S.anchor.slice(0, 8) + '15T12:00:00Z').toLocaleDateString('en-US', { month:'long', year:'numeric', timeZone:'UTC' });
    return shiftBar(x, false) + guide(isOwner, A().mine())
      + `<div class="kc-tools"><span class="kc-title">${esc(title)}</span>
        <button class="kc-nav" onclick="KPC.step(-1)" aria-label="Back">‹</button><button class="kc-nav" onclick="KPC.goToday()">Today</button><button class="kc-nav" onclick="KPC.step(1)" aria-label="Forward">›</button>
        <span class="kc-seg"><button class="${S.view === 'week' ? 'on' : ''}" onclick="KPC.setView('week')">Week</button><button class="${S.view === 'month' ? 'on' : ''}" onclick="KPC.setView('month')">Month</button></span></div>
      <div class="kc-legend">${Object.keys(CATS).map(k => `<span><i style="${cv(k)}"></i>${CATS[k][0] === 'Samantha' ? 'From Samantha' : CATS[k][0]}</span>`).join('')}</div>`
      + (S.view === 'week' ? weekView(x) : monthView(x)) + agenda(x, isOwner);
  }
  function bar(){ try{ css(); return shiftBar(ctxNow(), true); }catch(e){ return ''; } }

  /* ── actions ── */
  const rerender = () => { try{ A().render('kpcal'); }catch(e){} };
  function findItem(key){
    const x = ctxNow(), at = key.lastIndexOf('@'), id = key.slice(0, at), from = key.slice(at + 1);
    return { x, id, from, t:x.tasks.find(t => t && t.id === id) };
  }
  async function tick(key, on){
    const { id, from, t } = findItem(key); if(!t) return;
    const a = A(), who = { at:new Date().toISOString(), by:a.me(), by_name:a.meName() };
    await a.save(kp => {
      if(!t.every){ if(on) kp.done[id] = who; else delete kp.done[id]; }
      const o = Object.assign({}, kp.occ[key] || {});
      if(on) o.done = who; else { delete o.done; if(kp.done[id] && t.every) delete kp.done[id]; }
      if(Object.keys(o).length) kp.occ[key] = o; else delete kp.occ[key];
      return [(on ? 'done' : 'not done') + ' (' + from + '): ' + titleOf(t).slice(0, 60)];
    }, 'Katlin\'s page');
    rerender();
  }
  async function move(key, to){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(to || ''))) return;
    const { id, from, t } = findItem(key); if(!t) return;
    S.moving = '';
    if(!t.every && !(((A().cfg().occ) || {})[key])){ return setDate(id, to); }
    await A().save(kp => {
      const o = Object.assign({}, kp.occ[key] || {});
      if(to === from) delete o.to; else o.to = to;
      if(Object.keys(o).length) kp.occ[key] = o; else delete kp.occ[key];
      return ['moved ' + titleOf(t).slice(0, 50) + ' from ' + from + ' to ' + to];
    }, 'Katlin\'s page');
    S.sel = to; S.anchor = to; rerender();
  }
  async function skip(key){
    const { from, t } = findItem(key); if(!t) return;
    if(!confirm('Skip this one? It comes off the list and is not marked done.\n\n' + titleOf(t))) return;
    await A().save(kp => { kp.occ[key] = Object.assign({}, kp.occ[key] || {}, { skipped:true, done:{ at:new Date().toISOString(), by:A().me(), by_name:A().meName(), skipped:true } }); return ['skipped (' + from + '): ' + titleOf(t).slice(0, 60)]; }, 'Katlin\'s page');
    rerender();
  }
  async function setDate(id, day){
    const t = ctxNow().tasks.find(x => x && x.id === id); if(!t) return;
    await A().save(kp => { kp.tasks = kp.tasks.map(x => x.id === id ? Object.assign({}, x, { date:day }) : x); return ['put on ' + day + ': ' + titleOf(t).slice(0, 50)]; }, 'Katlin\'s page');
    S.sel = day; S.anchor = day; rerender();
  }
  async function saveForm(id){
    const a = A(), isOwner = a.owner(), v = k => String((document.getElementById(k + id) || {}).value || '').trim();
    const title = v('kcT_'), text = v('kcX_');
    if(!title){ alert('Write what to do first.'); return; }
    const every = isOwner ? v('kcE_') : '';
    const days = [...document.querySelectorAll('.kcDay_' + id)].filter(b => b.checked).map(b => Number(b.value));
    if(every === 'week' && !days.length){ alert('Pick at least one day of the week.'); return; }
    const date = every === 'day' || every === 'week' ? '' : v('kcD_');
    if(every === 'month' && !date){ alert('Pick the first date it happens.'); return; }
    const fields = { title, text:text || title, every, slot:v('kcS_'), cat:v('kcC_') };
    if(every === 'week') fields.days = days; if(date) fields.date = date;
    if(id === 'new'){
      const t = Object.assign({ id:(typeof W.uid === 'function' ? W.uid() : 'kc_' + Date.now().toString(36)), by:a.me(), at:new Date().toISOString() }, fields);
      const out = await a.save(kp => { kp.tasks.push(t); return ['calendar task added: ' + title.slice(0, 60)]; }, 'Katlin\'s page');
      if(out && out.error) return;
      S.add = false; if(date){ S.sel = date; S.anchor = date; }
    } else {
      const old = ctxNow().tasks.find(x => x && x.id === id); if(!old) return;
      if(!isOwner && old.by !== a.me()) return;
      const out = await a.save(kp => { kp.tasks = kp.tasks.map(x => { if(x.id !== id) return x; const n = Object.assign({}, x, fields); if(every !== 'week') delete n.days; if(!date) delete n.date; return n; }); return ['calendar task changed: ' + title.slice(0, 60)]; }, 'Katlin\'s page');
      if(out && out.error) return;
      S.edit = '';
    }
    rerender();
  }
  const KPC = {
    view, bar, tick, move, skip, setDate, saveForm,
    pick(day, key){ S.sel = day; if(key) S.open[key] = true; S.edit = ''; rerender();
      if(key) setTimeout(() => { const el = document.getElementById('kcIt_' + key.replace(/[^\w-]/g, '_')); if(el) el.scrollIntoView({ block:'center', behavior:'smooth' }); }, 30); },
    toggle(key){ S.open[key] = !S.open[key]; rerender(); },
    moving(key){ S.moving = key; rerender(); },
    step(n){ S.anchor = S.view === 'week' ? addDays(mondayOf(S.anchor), 7 * n) : (() => { const d = new Date(S.anchor.slice(0, 8) + '01T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); })();
      if(S.view === 'week') S.sel = S.anchor; rerender(); },
    goToday(){ S.sel = ''; S.view = S.view; rerender(); },
    setView(v){ S.view = v === 'month' ? 'month' : 'week'; S.anchor = S.sel; rerender(); },
    dragStart(ev, key){ S.drag = key; try{ ev.dataTransfer.setData('text/plain', key); ev.dataTransfer.effectAllowed = 'move'; }catch(e){} },
    drop(ev, day){ ev.preventDefault(); const key = (ev.dataTransfer && ev.dataTransfer.getData('text/plain')) || S.drag; S.drag = ''; if(key) move(key, day); },
    addOpen(){ S.add = true; S.edit = ''; rerender(); setTimeout(() => { const el = document.getElementById('kcT_new'); if(el) el.focus(); }, 30); },
    editOpen(id){ S.edit = S.edit === id ? '' : id; S.add = false; rerender(); },
    closeForm(){ S.add = false; S.edit = ''; rerender(); },
    formEvery(id, v){ const w = document.getElementById('kcDW_' + id), d = document.getElementById('kcDD_' + id);
      if(w) w.style.display = v === 'week' ? 'inline-flex' : 'none'; if(d) d.style.display = v === 'week' || v === 'day' ? 'none' : 'inline-flex'; },
    guideToggle(open, fold){ try{ W.localStorage.setItem(GKEY, open ? '0' : '1'); }catch(e){} if(fold) rerender(); },
    howHtml, _state:S,
    _rules:{ START, headOf, stepsOf, linkify, daysOf, titleOf, slotOf, catOf, shiftOf, isShiftDay, nextShiftDay, natural, occDone, itemsOn, stillOpen, noDay, prune, moAt, shiftNow, mondayOf, addDays, dayOf }
  };
  W.KPC = KPC;
  if(typeof module !== 'undefined' && module.exports) module.exports = KPC;
})(typeof window !== 'undefined' ? window : globalThis);
