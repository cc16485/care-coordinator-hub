/* Live Schedule as a calendar (2026-10-06, Samantha: "on live schedule can it be in a daily/weekly/month calendar - even
   better if we can actually click and change shifts there, but that may be too much").
   Day is the list it always was. Week is seven columns, Monday to Sunday. Month is the calendar grid: how many visits each
   day and how many have nobody, and a click on a day opens that day. A search box narrows every view to a client or a
   caregiver, and "Only open shifts" shows just the unassigned ones. Week and month come from AxisCare in one read
   (coverage-shifts, at most 42 days). Read only: changing a visit happens in AxisCare (click-to-change comes next). */
(function(){
  const esc = s => escapeHtmlComms(s);
  const LC = { view:(function(){ try{ return localStorage.getItem('cch_lsview') || 'day'; }catch(e){ return 'day'; } })(), q:'', open:false };
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  function ymdAdd(ymd, n){ const [y, m, d] = String(ymd).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); }
  function dow(ymd){ const [y, m, d] = String(ymd).split('-').map(Number); return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; }   // Mon = 0
  function range(view, ymd){
    if(view === 'week'){ const s = ymdAdd(ymd, -dow(ymd)); return { start:s, end:ymdAdd(s, 6) }; }
    if(view === 'month'){ const first = ymd.slice(0, 8) + '01', s = ymdAdd(first, -dow(first));
      const [y, m] = ymd.split('-').map(Number), last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
      return { start:s, end:ymdAdd(last, 6 - dow(last)) }; }
    return { start:ymd, end:ymd };
  }
  function t12(s){ const m = String(s || '').match(/^(\d\d):(\d\d)$/); if(!m) return s || ''; const h = Number(m[1]) % 12 || 12; return h + (m[2] === '00' ? '' : ':' + m[2]) + (Number(m[1]) >= 12 ? 'p' : 'a'); }
  function short(n){ const p = String(n || '').trim().split(/\s+/); return p[0] + (p[1] ? ' ' + p[1][0] + '.' : ''); }
  /* the same colour story as the day list: red = nobody or no clock-in, green = being worked, teal = done, gray = upcoming */
  function state(v){
    const now = new Date().toLocaleString('sv-SE', { timeZone:'America/Chicago' }), today = now.slice(0, 10), hm = now.slice(11, 16);
    if(!v.caregiver) return ['open', 'var(--red)', '#FFF1F0', 'nobody yet'];
    if(v.clock_out) return ['done', 'var(--teal)', '#F0F7F6', 'completed'];
    if(v.clock_in) return ['live', 'var(--green)', 'var(--green-bg)', 'being worked'];
    if(v.date === today && v.time && v.time < hm && (!v.end || v.end > hm)) return ['late', 'var(--red)', '#FFF6F5', 'no clock-in yet'];
    if(v.date < today || (v.date === today && v.end && v.end <= hm)) return ['past', '#94A3B8', '#F8FAFC', 'ended'];
    return ['up', '#64748B', '#F8FAFC', 'upcoming'];
  }
  function filtered(rows){
    const q = String(LC.q || '').trim().toLowerCase();
    return (rows || []).filter(v => (!LC.open || !v.caregiver) && (!q || (String(v.client || '') + ' ' + String(v.caregiver || '')).toLowerCase().indexOf(q) > -1));
  }
  function bar(d){
    const b = (v, l) => '<button class="fb' + (LC.view === v ? ' active' : '') + '" data-lcv="' + v + '" onclick="lcView(\'' + v + '\')">' + l + '</button>';
    const lbl = LC.view === 'week' ? 'Week of ' + new Date(d.start + 'T12:00:00').toLocaleDateString('en-US', { month:'long', day:'numeric' })
      : LC.view === 'month' ? new Date((LS_STATE.date || d.start) + 'T12:00:00').toLocaleDateString('en-US', { month:'long', year:'numeric' }) : '';
    return '<div class="lc-bar" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">'
      + b('day', 'Day') + b('week', 'Week') + b('month', 'Month')
      + '<span style="width:8px;"></span><button class="fb" onclick="lcStep(-1)" title="Back">‹</button><button class="fb" onclick="lcStep(0)">Today</button><button class="fb" onclick="lcStep(1)" title="Forward">›</button>'
      + (lbl ? '<b style="color:var(--navy);margin-left:6px;">' + esc(lbl) + '</b>' : '')
      + '<span style="flex:1;"></span>'
      + '<input id="lcQ" value="' + esc(LC.q) + '" oninput="lcFind(this.value)" placeholder="Find a client or caregiver" style="width:220px;font-size:.8rem;">'
      + '<label style="display:flex;gap:5px;align-items:center;font-size:.8rem;margin:0;"><input type="checkbox" id="lcOpen"' + (LC.open ? ' checked' : '') + ' onchange="lcOnlyOpen(this.checked)" style="width:auto;margin:0;"> Only open shifts</label></div>'
      + (typeof lcSwitchHtml === 'function' ? lcSwitchHtml() : '');
  }
  function chip(v, inRow){
    const s = state(v);
    return '<div class="lc-visit" data-state="' + s[0] + '" title="' + esc(t12(v.time) + (v.end ? '–' + t12(v.end) : '') + ' · ' + v.client + ' · ' + (v.caregiver || 'NOBODY') + ' · ' + s[3]) + '" onclick="lcVisitOpen(\'' + esc(v.visit_id) + '\')" style="cursor:pointer;border-left:3px solid ' + s[1] + ';background:' + s[2] + ';border-radius:6px;padding:3px 6px;margin-bottom:4px;font-size:11.5px;line-height:1.3;">'
      + '<div><b>' + esc(t12(v.time)) + (v.end ? '–' + esc(t12(v.end)) : '') + '</b>' + (inRow ? '' : ' ' + esc(short(v.client))) + '</div>'
      + '<div style="color:' + (v.caregiver ? 'var(--text-muted)' : 'var(--red)') + ';font-weight:' + (v.caregiver ? '400' : '800') + ';">' + (v.caregiver ? esc(short(v.caregiver)) : 'NOBODY') + '</div></div>';
  }
  /* Week (2026-10-06, Samantha: "it should show more like the client on the left side and each row is a clients weekly
     schedule"): one row per client, Monday to Sunday across, each visit with its time and caregiver (NOBODY in red). */
  function hrs(v){ const a = String(v.time || ''), b = String(v.end || ''); if(!/^\d\d:\d\d$/.test(a) || !/^\d\d:\d\d$/.test(b)) return 0;
    let m = (+b.slice(0, 2) * 60 + +b.slice(3)) - (+a.slice(0, 2) * 60 + +a.slice(3)); if(m <= 0) m += 1440; return m / 60; }
  function weekHtml(d){
    const rows = filtered(d.rows), today = new Date().toLocaleString('sv-SE', { timeZone:'America/Chicago' }).slice(0, 10);
    const days = [0, 1, 2, 3, 4, 5, 6].map(i => ymdAdd(d.start, i));
    const byClient = new Map();
    rows.forEach(v => { const k = String(v.client_id || v.client); if(!byClient.has(k)) byClient.set(k, { name:v.client, vs:[] }); byClient.get(k).vs.push(v); });
    const clients = [...byClient.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const cell = 'border-top:1px solid var(--border);border-left:1px solid var(--border);padding:4px;vertical-align:top;';
    let h = '<div style="overflow-x:auto;"><table class="lc-week" style="width:100%;border-collapse:separate;border-spacing:0;font-size:12px;background:#fff;border:1px solid var(--border);border-radius:9px;">'
      + '<thead><tr><th style="position:sticky;left:0;background:#fff;z-index:1;text-align:left;padding:6px 8px;min-width:150px;color:var(--text-muted);font-size:11px;">Client</th>'
      + days.map((day, i) => { const all = (d.rows || []).filter(v => v.date === day), open = all.filter(v => !v.caregiver).length;
          return '<th class="lc-dayhead" data-day="' + day + '" onclick="lcOpenDay(\'' + day + '\')" style="cursor:pointer;padding:6px 4px;min-width:104px;text-align:left;border-left:1px solid var(--border);background:' + (day === today ? '#F0F7FF' : '#fff') + ';">'
            + '<b style="color:var(--navy);font-size:12.5px;">' + DOW[i] + ' ' + Number(day.slice(8)) + '</b>'
            + (open ? ' <span style="font-size:10.5px;font-weight:800;color:var(--red);">' + open + ' open</span>' : '') + '</th>'; }).join('') + '</tr></thead><tbody>';
    if(!clients.length) h += '<tr><td colspan="8" style="padding:12px;" class="field-note">' + ((d.rows || []).length ? 'No visits match.' : 'No visits this week.') + '</td></tr>';
    clients.forEach(c => {
      const open = c.vs.filter(v => !v.caregiver).length, total = Math.round(c.vs.reduce((t, v) => t + hrs(v), 0) * 10) / 10;
      h += '<tr class="lc-client" data-client="' + esc(c.name) + '"><td style="position:sticky;left:0;background:' + (open ? '#FFF6F5' : '#fff') + ';z-index:1;border-top:1px solid var(--border);padding:6px 8px;vertical-align:top;">'
        + '<b style="color:var(--navy);font-size:13px;">' + esc(c.name) + '</b><div class="field-note" style="font-size:10.5px;">' + c.vs.length + ' visit' + (c.vs.length === 1 ? '' : 's') + ' · ' + total + 'h'
        + (open ? ' · <b style="color:var(--red);">' + open + ' open</b>' : '') + '</div></td>'
        + days.map(day => '<td style="' + cell + (day === today ? 'background:#F7FAFF;' : '') + '">' + c.vs.filter(v => v.date === day).map(v => chip(v, true)).join('') + '</td>').join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
  }
  function monthHtml(d){
    const rows = filtered(d.rows), month = String(LS_STATE.date || d.start).slice(0, 7), today = new Date().toLocaleString('sv-SE', { timeZone:'America/Chicago' }).slice(0, 10);
    let h = '<div class="lc-month" style="display:grid;grid-template-columns:repeat(7,minmax(80px,1fr));gap:5px;">' + DOW.map(x => '<div class="field-note" style="font-weight:800;text-align:center;">' + x + '</div>').join('');
    for(let day = d.start; day <= d.end; day = ymdAdd(day, 1)){
      const vs = rows.filter(v => v.date === day), open = vs.filter(v => !v.caregiver).length, inMonth = day.slice(0, 7) === month;
      h += '<div class="lc-mday" data-day="' + day + '" onclick="lcOpenDay(\'' + day + '\')" style="cursor:pointer;border:1px solid ' + (day === today ? 'var(--teal)' : 'var(--border)') + ';border-radius:8px;padding:5px 7px;min-height:64px;background:' + (open ? '#FFF6F5' : inMonth ? '#fff' : '#F8FAFC') + ';' + (inMonth ? '' : 'opacity:.55;') + '">'
        + '<div style="font-weight:800;color:var(--navy);font-size:12.5px;">' + Number(day.slice(8)) + '</div>'
        + (vs.length ? '<div style="font-size:11.5px;">' + vs.length + ' visit' + (vs.length === 1 ? '' : 's') + '</div>' : '<div class="field-note" style="font-size:11px;">—</div>')
        + (open ? '<div style="font-size:11.5px;font-weight:800;color:var(--red);">' + open + ' open</div>' : '') + '</div>';
    }
    return h + '</div>';
  }
  /* the board: Day draws the list (lsPaint's own), Week and Month draw here */
  function paint(){
    const box = document.getElementById('ls-board'); if(!box) return false;
    const d = LS_STATE.data; if(!d) return false;
    const top = bar(d.start ? d : Object.assign({ start:LS_STATE.date }, d));
    if(LC.view === 'day' || d.error) return { top };
    if(!d.start){ box.innerHTML = top + '<div class="field-note" style="padding:8px 0;">Week and month views turn on once Desktop step 478 has run. Day works now.</div>'; return true; }
    const lbl = document.getElementById('ls-date-label'); if(lbl) lbl.textContent = '';
    const rows = filtered(d.rows), open = rows.filter(v => !v.caregiver).length;
    box.innerHTML = top
      + '<div class="field-note" style="margin-bottom:.5rem;">' + rows.length + ' visit' + (rows.length === 1 ? '' : 's') + (open ? ' · <b style="color:var(--red);">' + open + ' with nobody</b>' : ' · all assigned') + (LC.q || LC.open ? ' (filtered)' : '') + '</div>'
      + (d.partial ? '<div class="field-note" style="color:#8A4E0C;margin-bottom:6px;">' + esc(d.partial) + '</div>' : '')
      + (LC.view === 'week' ? weekHtml(d) : monthHtml(d))
      + '<div class="field-note" style="margin-top:.6rem;">Red: nobody or no clock-in · green: being worked · teal: done · gray: upcoming. Click a visit to change it, or a day to open it.</div>';
    return true;
  }
  function reqBody(){ const r = range(LC.view, LS_STATE.date || lsChiDay(0)); return LC.view === 'day' ? { live_schedule:true, date:r.start } : { live_schedule:true, start:r.start, end:r.end }; }
  function view(v){ LC.view = v; try{ localStorage.setItem('cch_lsview', v); }catch(e){} lsLoad(true); }
  function step(n){
    const base = LS_STATE.date || lsChiDay(0);
    if(n === 0) LS_STATE.date = lsChiDay(0);
    else if(LC.view === 'week') LS_STATE.date = ymdAdd(base, 7 * n);
    else if(LC.view === 'month'){ const [y, m] = base.split('-').map(Number); LS_STATE.date = new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10); }
    else LS_STATE.date = ymdAdd(base, n);
    const de = document.getElementById('ls-date'); if(de) de.value = LS_STATE.date;
    lsLoad(true);
  }
  function openDay(day){ LS_STATE.date = day; const de = document.getElementById('ls-date'); if(de) de.value = day; view('day'); }
  function find(q){ LC.q = q; lsPaint(); const el = document.getElementById('lcQ'); if(el){ el.focus(); el.setSelectionRange(q.length, q.length); } }
  function onlyOpen(on){ LC.open = !!on; lsPaint(); }

  /* ── CLICK A VISIT AND CHANGE IT (2026-10-06, her "yes build it" after the 479 look): change the caregiver, take the
     caregiver off, or change the time or day. One visit only (never the repeating schedule). The server (visit-change)
     re-reads the visit, refuses one that has started or is verified or that someone changed meanwhile, sends the change
     with one of AxisCare's own reasons, reads it back and records it; Undo works the same day. Nobody is texted. ── */
  const VCQ = 'Turn on changing visits from the Live Schedule?\n\nOffice staff can click a visit on the Live Schedule and change its caregiver, take the caregiver off, or change its time or day. Each change shows exactly what will change in AxisCare first, needs one of AxisCare\'s change reasons, touches only that one visit, is read back from AxisCare, and can be undone the same day. Visits that have started or are verified are never changed. Nobody is texted.';
  const VCQ_OFF = 'Turn off changing visits from the Live Schedule? The calendar still shows everything; changes are made in AxisCare.';
  const VC = { reasons:null, live:null };
  async function vcCall(body){
    const { data:{ session } } = await sb.auth.getSession(); if(!session) throw new Error('Sign in first.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/visit-change', { method:'POST', headers:{ Authorization:'Bearer ' + session.access_token, apikey:CONFIG.supabase_anon_key, 'Content-Type':'application/json' }, body:JSON.stringify(body) });
    const d = await r.json().catch(() => null); if(!d) throw new Error('The visit service answered ' + r.status); return d;
  }
  const uuid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('vc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  function hm12(s){ const m = String(s || '').match(/^(\d\d):(\d\d)$/); if(!m) return s || ''; const h = Number(m[1]) % 12 || 12; return h + ':' + m[2] + (Number(m[1]) >= 12 ? 'pm' : 'am'); }
  function dayWords(ymd){ return new Date(ymd + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' }); }
  const KIND = { cg:{ label:'Change the caregiver', want:/staffing change/i, def:/caregiver change/i },
                 off:{ label:'Take the caregiver off', want:/staffing change/i, def:/call off/i },
                 time:{ label:'Change the time or day', want:/schedule change|administrative/i, def:/client schedule change/i } };
  /* how a caregiver fits this visit: other visits that overlap it, and their stated hours (the Team Builder's own reading) */
  function fit(cg, v){
    const flags = [], wd = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date(v.date + 'T12:00:00').getDay()];
    const clash = (cg.visits || []).filter(x => x.day === v.date && x.start && x.end && x.start < v.end && x.end > v.start && x.client !== v.client);
    if(clash.length) flags.push('<b style="color:var(--red);">already with ' + esc(clash[0].client) + ' ' + esc(t12(clash[0].start)) + '–' + esc(t12(clash[0].end)) + '</b>');
    if(typeof tbCellFit === 'function'){ const f = tbCellFit(cg, wd, { start:v.start, end:v.end });
      if(f.stated === true) flags.push('<span style="color:var(--green);font-weight:700;">says these hours work</span>'); else if(f.stated === false) flags.push('<span style="color:var(--red);font-weight:700;">their form says these hours don’t work</span>'); }
    return { flags, rank:(clash.length ? 2 : 0) };
  }
  async function visitOpen(id){
    const row = ((LS_STATE.data && LS_STATE.data.rows) || []).find(r => r.visit_id === id); if(!row) return;
    const ov = document.createElement('div'); ov.className = 'vc-ov';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(13,54,95,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:30px 16px;overflow:auto;';
    ov.innerHTML = '<div role="dialog" aria-modal="true" class="vc-panel" style="background:#fff;border-radius:14px;max-width:640px;width:100%;padding:20px 22px;box-shadow:0 20px 50px rgba(0,0,0,.25);">'
      + '<div style="display:flex;gap:8px;align-items:baseline;"><div style="font-weight:800;color:var(--navy);font-size:17px;flex:1;">' + esc(row.client) + ' · ' + esc(dayWords(row.date)) + '</div><button class="secondary vc-x" style="padding:4px 10px;">Close</button></div>'
      + '<div class="vc-body" style="margin-top:8px;"><div class="field-note">Reading this visit from AxisCare…</div></div></div>';
    document.body.appendChild(ov);
    const close = (reload) => { ov.remove(); if(reload) lsLoad(true); };
    ov.querySelector('.vc-x').onclick = () => close(false);
    const body = ov.querySelector('.vc-body');
    let g, rs;
    try{ [g, rs] = await Promise.all([vcCall({ action:'get', visit_id:id }), VC.reasons ? Promise.resolve({ reasons:VC.reasons, live:VC.live }) : vcCall({ action:'reasons' })]); }
    catch(e){ body.innerHTML = '<div style="color:var(--red);">' + esc(e.message || e) + '</div>'; return; }
    if(g.error || !g.visit){ body.innerHTML = '<div style="color:var(--red);">' + esc(g.error || 'Couldn’t read the visit.') + '</div>'; return; }
    VC.reasons = rs.reasons || []; VC.live = g.live === true;
    const v = g.visit;
    const head = '<div style="font-size:14px;"><b>' + esc(hm12(v.start)) + '–' + esc(hm12(v.end)) + '</b> · ' + (v.caregiver ? esc(v.caregiver) : '<b style="color:var(--red);">nobody</b>') + '</div>'
      + (g.undo || []).map(u => '<div class="vc-undo-row" style="margin-top:8px;background:#F0F7FF;border-radius:8px;padding:7px 10px;font-size:13px;">Changed today by ' + esc(String(u.by || '').split(' ')[0]) + ': ' + esc(u.words) + ' <button class="secondary vc-undo" data-c="' + esc(u.change_id) + '" style="padding:3px 9px;font-size:12px;margin-left:6px;">Undo</button></div>').join('');
    if(v.started || v.verified){ body.innerHTML = head + '<div style="margin-top:10px;background:#FFF4E3;border-radius:8px;padding:8px 10px;font-size:13px;">This visit has ' + (v.verified ? 'been verified' : 'started') + ', so it isn’t changed here. Make an EVV correction in AxisCare.</div>'; wireUndo(); return; }
    if(!VC.live){ body.innerHTML = head + '<div style="margin-top:10px;background:#F8FAFC;border-radius:8px;padding:8px 10px;font-size:13px;">Changing visits from the Hub is switched off. An owner can turn it on (Owners Hub Admin page, or above the calendar). Change it in AxisCare for now.</div>'; wireUndo(); return; }
    let kind = 'cg', pick = null, q = '';
    const reasonsFor = k => VC.reasons.filter(r => KIND[k].want.test(r.name));
    const draw = () => {
      const tabs = Object.keys(KIND).filter(k => k !== 'off' || v.caregiver).map(k => '<button class="fb' + (kind === k ? ' active' : '') + ' vc-tab" data-k="' + k + '">' + KIND[k].label + '</button>').join('');
      let mid = '';
      if(kind === 'cg'){
        if(!Array.isArray(TB.pool)){ if(typeof tbLoadPool === 'function' && !TB.loading) tbLoadPool().then(draw); mid = '<div class="field-note">' + (TB.pool && TB.pool.error ? 'Couldn’t load the roster: ' + esc(TB.pool.error) : 'Loading the roster…') + '</div>'; }
        else {
          const nq = String(q).toLowerCase();
          const list = TB.pool.filter(cg => String(cg.axiscare_id || '') && String(cg.axiscare_id) !== String(v.caregiver_id || '') && (!nq || String(cg.name).toLowerCase().indexOf(nq) > -1))
            .map(cg => Object.assign({ cg }, fit(cg, v))).sort((a, b) => a.rank - b.rank || String(a.cg.name).localeCompare(String(b.cg.name)));
          mid = '<input class="vc-q" placeholder="Find a caregiver" value="' + esc(q) + '" style="width:100%;font-size:13px;margin-bottom:6px;">'
            + '<div class="vc-list" style="max-height:220px;overflow:auto;border:1px solid var(--border);border-radius:8px;padding:2px 8px;">' + (list.slice(0, 60).map(x => '<div class="vc-cg" data-ax="' + esc(x.cg.axiscare_id) + '" style="display:flex;gap:8px;align-items:baseline;padding:5px 0;border-top:1px solid var(--border);cursor:pointer;' + (pick && pick.ax === String(x.cg.axiscare_id) ? 'background:#E8F0FB;' : '') + '">'
              + '<b style="min-width:130px;">' + esc(x.cg.name) + '</b><span class="field-note" style="flex:1;">' + (x.flags.join(' · ') || 'no other visit then') + '</span></div>').join('') || '<div class="field-note">Nobody matches.</div>') + '</div>';
        }
      }
      if(kind === 'time') mid = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;"><label style="font-size:12.5px;margin:0;">Day<input type="date" class="vc-d" value="' + esc(v.date) + '" style="display:block;"></label>'
        + '<label style="font-size:12.5px;margin:0;">Start<input type="time" class="vc-s" value="' + esc(v.start) + '" style="display:block;"></label><label style="font-size:12.5px;margin:0;">End<input type="time" class="vc-e" value="' + esc(v.end) + '" style="display:block;"></label></div>'
        + '<div class="field-note" style="margin-top:4px;">Overnight visits are changed in AxisCare.</div>';
      if(kind === 'off') mid = '<div style="font-size:13.5px;">' + esc(v.caregiver) + ' comes off this visit, and it shows as open (nobody).</div>';
      const rl = reasonsFor(kind), def = (rl.find(r => KIND[kind].def.test(r.name)) || rl[0] || {}).id;
      body.innerHTML = head + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 8px;">' + tabs + '</div>' + mid
        + '<div style="margin-top:10px;font-size:12.5px;font-weight:700;color:var(--navy);">Why (AxisCare keeps this with the change)</div>'
        + '<select class="vc-r" style="width:100%;font-size:13px;">' + VC.reasons.map(r => '<option value="' + r.id + '"' + (r.id === def ? ' selected' : '') + '>' + esc(r.name) + '</option>').join('') + '</select>'
        + '<div class="vc-preview" style="margin-top:10px;"></div><div class="vc-res" style="margin-top:8px;"></div>'
        + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;"><button class="cara-btn vc-go">Review the change</button></div>';
      body.querySelectorAll('.vc-tab').forEach(b => b.onclick = () => { kind = b.dataset.k; pick = null; draw(); });
      const qi = body.querySelector('.vc-q'); if(qi){ qi.oninput = () => { q = qi.value; draw(); const n = body.querySelector('.vc-q'); n.focus(); n.setSelectionRange(q.length, q.length); }; }
      body.querySelectorAll('.vc-cg').forEach(el => el.onclick = () => { const cg = TB.pool.find(x => String(x.axiscare_id) === el.dataset.ax); pick = { ax:el.dataset.ax, name:cg ? cg.name : '#' + el.dataset.ax }; draw(); });
      body.querySelector('.vc-go').onclick = review;
      wireUndo();
    };
    function setNow(){
      if(kind === 'cg') return pick ? { set:{ caregiver_id:pick.ax }, words:'Caregiver: ' + (v.caregiver || 'nobody') + ' → ' + pick.name } : null;
      if(kind === 'off') return { set:{ caregiver_id:null }, words:'Caregiver: ' + v.caregiver + ' → nobody (the visit shows as open)' };
      const d = body.querySelector('.vc-d').value, s = body.querySelector('.vc-s').value, e = body.querySelector('.vc-e').value, set = {}, w = [];
      if(d && d !== v.date){ set.date = d; w.push('Day: ' + dayWords(v.date) + ' → ' + dayWords(d)); }
      if(s && s !== v.start){ set.start = s; } if(e && e !== v.end){ set.end = e; }
      if(set.start || set.end) w.push('Time: ' + hm12(v.start) + '–' + hm12(v.end) + ' → ' + hm12(s) + '–' + hm12(e));
      return Object.keys(set).length ? { set, words:w.join('<br>') } : null;
    }
    function review(){
      const x = setNow(), res = body.querySelector('.vc-res');
      if(!x){ res.innerHTML = '<div class="field-note" style="color:var(--red);">' + (kind === 'cg' ? 'Pick a caregiver.' : 'Nothing would change.') + '</div>'; return; }
      if(kind === 'time'){ const s = x.set.start || v.start, e = x.set.end || v.end; if(!(s < e)){ res.innerHTML = '<div class="field-note" style="color:var(--red);">The end must be after the start on the same day.</div>'; return; } }
      const sel = body.querySelector('.vc-r'), rn = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : '';
      body.querySelector('.vc-preview').innerHTML = '<div class="vc-review" style="background:#F8FAFC;border:1.5px solid var(--navy);border-radius:9px;padding:10px 12px;font-size:13.5px;">'
        + '<div style="font-weight:800;color:var(--navy);margin-bottom:4px;">In AxisCare, this one visit will change:</div>' + x.words
        + '<div style="margin-top:4px;">Reason: ' + esc(rn) + '</div><div class="field-note" style="margin-top:4px;">' + esc(v.client) + ' · ' + esc(dayWords(v.date)) + ' only. The repeating schedule is not changed. Nobody is texted.</div>'
        + '<div style="display:flex;gap:8px;margin-top:9px;"><button class="primary vc-confirm">Confirm the change</button><button class="secondary vc-back">Not yet</button></div></div>';
      body.querySelector('.vc-back').onclick = () => { body.querySelector('.vc-preview').innerHTML = ''; };
      body.querySelector('.vc-confirm').onclick = async function(){
        this.disabled = true; this.textContent = 'Changing it in AxisCare…';
        let d; try{ d = await vcCall({ action:'change', visit_id:v.visit_id, expect:{ caregiver_id:v.caregiver_id, date:v.date, start:v.start, end:v.end }, set:x.set, reason_id:Number(sel.value), change_id:uuid() }); }catch(e){ d = { error:String(e.message || e) }; }
        if(d && d.outcome === 'changed'){
          body.innerHTML = '<div class="vc-done" style="font-size:14px;color:var(--green);font-weight:800;">✓ Changed in AxisCare' + (d.confirmed ? ' and read back' : '') + '</div><div style="margin-top:4px;font-size:13.5px;">' + esc(d.words) + ' · ' + esc(d.reason) + '</div>'
            + (d.warning ? '<div style="color:#8A4E0C;font-size:12.5px;margin-top:6px;">' + esc(d.warning) + '</div>' : '')
            + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;"><button class="secondary vc-undo" data-c="' + esc(d.change_id) + '">Undo</button>'
            + (kind === 'off' ? '<button class="cara-btn vc-cov">Open a coverage case for it</button>' : '') + '<span style="flex:1;"></span><button class="primary vc-done-btn">Done</button></div>';
          body.querySelector('.vc-done-btn').onclick = () => close(true);
          const cv = body.querySelector('.vc-cov'); if(cv) cv.onclick = () => { close(true); try{ switchTab('coverage'); covOpenAdd('calloff'); }catch(e){} };
          wireUndo(); return;
        }
        this.disabled = false; this.textContent = 'Confirm the change';
        res.innerHTML = '<div style="background:#FDE8E8;border:1px solid #F5B5B5;border-radius:8px;padding:7px 10px;font-size:12.5px;color:var(--red);">' + esc((d && d.error) || 'Not changed.') + '</div>';
      };
    }
    function wireUndo(){
      body.querySelectorAll('.vc-undo').forEach(b => b.onclick = async () => {
        b.disabled = true; b.textContent = 'Undoing…';
        let d; try{ d = await vcCall({ action:'undo', change_id:b.dataset.c }); }catch(e){ d = { error:String(e.message || e) }; }
        if(d && (d.outcome === 'changed' || d.outcome === 'already_undone')){ body.innerHTML = '<div class="vc-undone" style="font-size:14px;color:var(--green);font-weight:800;">✓ Put back as it was</div><div style="margin-top:4px;font-size:13px;">' + esc(d.words || '') + '</div><div style="text-align:right;margin-top:10px;"><button class="primary vc-done-btn">Done</button></div>'; body.querySelector('.vc-done-btn').onclick = () => close(true); return; }
        b.disabled = false; b.textContent = 'Undo';
        b.insertAdjacentHTML('afterend', '<div class="field-note" style="color:var(--red);margin-top:4px;">' + esc((d && d.error) || 'Not undone.') + '</div>');
      });
    }
    draw();
  }
  /* the switch, for owners, above the calendar (also on the Owners Hub Admin page) */
  function switchHtml(){
    let own = false; try{ own = ccIsOwner(); }catch(e){}
    if(!own) return '';
    const on = ((typeof DATA !== 'undefined' && DATA.ops_settings) || {}).visit_change_live === true;
    return '<div class="vc-switch field-note" style="margin:-4px 0 8px;">Changing visits from the Hub: <b>' + (on ? 'On' : 'Off') + '</b> <button class="linklike" style="font-size:12px;" onclick="lcVcToggle(this)">' + (on ? 'Turn off' : 'Turn on') + '</button></div>';
  }
  async function vcToggle(btn){
    const on = !(((DATA.ops_settings || {}).visit_change_live) === true);
    if(!confirm(on ? VCQ : VCQ_OFF)) return;
    if(btn) btn.disabled = true;
    const out = await tkMerge(m => { m.visit_change_live = on; return ['changing visits from the Live Schedule ' + (on ? 'ON' : 'OFF')]; }, 'Live Schedule');
    if(!out.error){ DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { visit_change_live:on }); VC.live = null; VC.reasons = null; }
    else alert('Not changed: ' + out.error.message);
    lsPaint();
  }

  Object.assign(window, { lcVisitOpen:visitOpen, lcVcToggle:vcToggle, lcSwitchHtml:switchHtml, LC_VCQ:VCQ, LC_VCQ_OFF:VCQ_OFF });
  Object.assign(window, { LC, lcRange:range, lcState:state, lcFiltered:filtered, lcPaint:paint, lcReqBody:reqBody, lcView:view, lcStep:step, lcOpenDay:openDay, lcFind:find, lcOnlyOpen:onlyOpen });
})();
