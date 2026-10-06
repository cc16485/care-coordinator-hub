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
      + '<label style="display:flex;gap:5px;align-items:center;font-size:.8rem;margin:0;"><input type="checkbox" id="lcOpen"' + (LC.open ? ' checked' : '') + ' onchange="lcOnlyOpen(this.checked)" style="width:auto;margin:0;"> Only open shifts</label></div>';
  }
  function chip(v){
    const s = state(v);
    return '<div class="lc-visit" data-state="' + s[0] + '" title="' + esc(t12(v.time) + (v.end ? '–' + t12(v.end) : '') + ' · ' + v.client + ' · ' + (v.caregiver || 'NOBODY') + ' · ' + s[3]) + '" onclick="lcOpenDay(\'' + esc(v.date) + '\')" style="cursor:pointer;border-left:3px solid ' + s[1] + ';background:' + s[2] + ';border-radius:6px;padding:3px 6px;margin-bottom:4px;font-size:11.5px;line-height:1.3;">'
      + '<div><b>' + esc(t12(v.time)) + (v.end ? '–' + esc(t12(v.end)) : '') + '</b> ' + esc(short(v.client)) + '</div>'
      + '<div style="color:' + (v.caregiver ? 'var(--text-muted)' : 'var(--red)') + ';font-weight:' + (v.caregiver ? '400' : '800') + ';">' + (v.caregiver ? esc(short(v.caregiver)) : 'NOBODY') + '</div></div>';
  }
  function weekHtml(d){
    const rows = filtered(d.rows), today = new Date().toLocaleString('sv-SE', { timeZone:'America/Chicago' }).slice(0, 10);
    let h = '<div class="lc-week" style="display:grid;grid-template-columns:repeat(7,minmax(118px,1fr));gap:6px;overflow-x:auto;">';
    for(let i = 0; i < 7; i++){
      const day = ymdAdd(d.start, i), vs = rows.filter(v => v.date === day), all = (d.rows || []).filter(v => v.date === day), open = all.filter(v => !v.caregiver).length;
      h += '<div class="lc-day" data-day="' + day + '" style="border:1px solid var(--border);border-radius:9px;padding:6px;background:' + (day === today ? '#F0F7FF' : '#fff') + ';min-height:120px;">'
        + '<div style="display:flex;gap:4px;align-items:baseline;margin-bottom:5px;cursor:pointer;" onclick="lcOpenDay(\'' + day + '\')"><b style="color:var(--navy);font-size:12.5px;">' + DOW[i] + ' ' + Number(day.slice(8)) + '</b>'
        + '<span class="field-note" style="font-size:10.5px;">' + all.length + '</span>' + (open ? '<span style="font-size:10.5px;font-weight:800;color:var(--red);">' + open + ' open</span>' : '') + '</div>'
        + (vs.length ? vs.map(chip).join('') : '<div class="field-note" style="font-size:11px;">' + (all.length ? 'none match' : 'no visits') + '</div>') + '</div>';
    }
    return h + '</div>';
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
      + '<div class="field-note" style="margin-top:.6rem;">Red: nobody or no clock-in · green: being worked · teal: done · gray: upcoming. Click a day or a visit to open that day. Changes happen in AxisCare for now.</div>';
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

  Object.assign(window, { LC, lcRange:range, lcState:state, lcFiltered:filtered, lcPaint:paint, lcReqBody:reqBody, lcView:view, lcStep:step, lcOpenDay:openDay, lcFind:find, lcOnlyOpen:onlyOpen });
})();
