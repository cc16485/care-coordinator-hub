/* =====================================================================================================================
   CLIENTS AT A GLANCE (Clients tab; Samantha 2026-11-05: "ideas on how to make this better like the charts we have
   made", then the approved plan with her nine refinements). The list said the same two things on every row; this look
   tells a coordinator something about each client:
     · five tiles: active clients (AxisCare's count, by level), hours of care next 7 days (scheduled, with a caregiver,
       open), open visits, call-offs in the last 30 days split by how they ended, and Needs you (tappable lists)
     · one line for check-ins and plan reviews ("no record yet" is never called overdue) with a Review list
     · labeled columns: care level, next 7 days (scheduled, covered, open, %), main caregiver this week, call-offs, open or due
     · a Coverage chart button: the week by Morning, Afternoon, Evening, Overnight; an open square lists its visits and
       goes straight to Coverage (the visit's call-off case, or a new case form filled in, which a person still saves)
     · Check with AxisCare: clients the Hub and AxisCare disagree about. Nothing changes anyone's status by itself.
   Hours: one read of AxisCare's visits (coverage-shifts live_schedule, the read the Hub already has) for a "care week" of
   seven care days, each 6 am to 6 am, so an overnight visit belongs to the night it starts. Every visit is clipped to
   that week and split at the block edges in whole minutes, so the tiles, the chart and the rows add up to the same total.
   Behind ops_settings.clients_glance_live (owners switch it on the Admin page or in Settings), or an owner's preview.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const get = n => { try{ return (0, eval)(n); }catch(e){ return undefined; } };
  const KEY = 'clGlance';
  const ST = { rows:null, start:'', loading:false, err:'', partial:'', at:0, filter:'', panel:'', cell:null };

  function live(settings){ return !!(settings && settings.clients_glance_live === true); }
  function preview(){ try{ return root.localStorage.getItem(KEY) === '1'; }catch(e){ return false; } }
  function setPreview(on){ try{ if(on) root.localStorage.setItem(KEY, '1'); else root.localStorage.removeItem(KEY); }catch(e){} }
  const isOwner = () => { try{ return typeof ccIsOwner === 'function' && !!ccIsOwner(); }catch(e){ return false; } };
  const settings = () => { const d = get('DATA'); return (d && d.ops_settings) || {}; };
  function showing(){ return live(settings()) || (isOwner() && preview()); }
  const redraw = () => { try{ if(typeof renderClientsBoard === 'function') renderClientsBoard(); }catch(e){} };

  /* ── dates and the care week ─────────────────────────────────────────────────────────────────────────────── */
  const addDays = (ymd, n) => { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dayDiff = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
  const todayChi = () => { try{ return typeof covChicagoToday === 'function' ? covChicagoToday() : new Date().toLocaleString('sv-SE', { timeZone:'America/Chicago' }).slice(0, 10); }catch(e){ return new Date().toISOString().slice(0, 10); } };
  const hm = t => { const m = /^(\d{1,2}):(\d{2})/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  const BANDS = [['Morning', '6 am to noon', 360, 720], ['Afternoon', 'noon to 5 pm', 720, 1020], ['Evening', '5 to 10 pm', 1020, 1320], ['Overnight', '10 pm to 6 am', 1320, 1800]];
  const WEEK_FROM = 360, WEEK_TO = 7 * 1440 + 360;   /* minutes from the first day's midnight: day 1 6 am to day 8 6 am */

  /* one visit as minutes from the first day's midnight. AxisCare gives a start date and time and an end TIME: an end at or
     before the start ends the next day (start == end is a 24-hour visit, as the client card reads it) */
  function span(v, start){
    const s = hm(v.time), e = hm(v.end), k = dayDiff(start, String(v.date || '').slice(0, 10));
    if(s == null || e == null || !Number.isFinite(k)) return null;
    const a = k * 1440 + s;
    return [a, a + (e > s ? e - s : e - s + 1440)];
  }
  /* the pieces of one visit inside the care week, one per block: [{ day 0-6, band 0-3, min }] */
  function pieces(v, start){
    const sp = span(v, start); if(!sp) return null;
    const a = Math.max(sp[0], WEEK_FROM), b = Math.min(sp[1], WEEK_TO), out = [];
    for(let d = 0; d < 7 && a < b; d++) BANDS.forEach((bd, i) => {
      const lo = Math.max(a, d * 1440 + bd[2]), hi = Math.min(b, d * 1440 + bd[3]);
      if(hi > lo) out.push({ day:d, band:i, min:hi - lo });
    });
    return out;
  }

  /* everything the tiles, chart and rows need, in whole minutes */
  function summarize(rows, start){
    const cl = {}, cells = BANDS.map(() => Array.from({ length:7 }, () => ({ min:0, open:0, items:[] })));
    const tot = { min:0, open:0, visits:0, openVisits:0, noEnd:0 };
    (rows || []).forEach(v => {
      const ps = pieces(v, start);
      if(!ps){ tot.noEnd++; return; }
      if(!ps.length) return;
      const min = ps.reduce((n, p) => n + p.min, 0), open = !v.caregiver;
      const id = String(v.client_id || ''), c = cl[id] || (cl[id] = { id, name:v.client, min:0, open:0, cg:{}, openVisits:[] });
      c.min += min; tot.min += min; tot.visits++;
      if(open){ c.open += min; tot.open += min; tot.openVisits++; c.openVisits.push(v); }
      else { const k = v.caregiver_id || v.caregiver; c.cg[k] = c.cg[k] || { name:v.caregiver, min:0 }; c.cg[k].min += min; }
      ps.forEach(p => { const x = cells[p.band][p.day]; x.min += p.min; if(open) x.open += p.min; x.items.push({ v, min:p.min, of:min, open }); });
    });
    return { cl, cells, tot };
  }
  /* the three totals must agree; a mismatch is shown on the page, never hidden */
  function reconcile(S){
    let rows = 0, rowsOpen = 0, chart = 0, chartOpen = 0;
    Object.values(S.cl).forEach(c => { rows += c.min; rowsOpen += c.open; });
    S.cells.forEach(r => r.forEach(x => { chart += x.min; chartOpen += x.open; }));
    return { ok: rows === S.tot.min && chart === S.tot.min && rowsOpen === S.tot.open && chartOpen === S.tot.open, tiles:S.tot.min, rows, chart, open:S.tot.open, rowsOpen, chartOpen };
  }

  const hrs = min => { const h = Math.round(min / 6) / 10; return (Math.round(h) === h ? String(h) : h.toFixed(1)) + ' h'; };
  const pct = (part, whole) => { if(!whole) return null; const p = Math.round(part / whole * 100); return part < whole && p === 100 ? 99 : p; };
  const t12 = t => { const m = hm(t); if(m == null) return '?'; const h = Math.floor(m / 60), mm = m % 60; return ((h % 12) || 12) + (mm ? ':' + String(mm).padStart(2, '0') : '') + (h < 12 ? ' am' : ' pm'); };
  const dayName = ymd => new Date(ymd + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
  const ago = iso => { const t = Date.parse(iso); if(!Number.isFinite(t)) return 'unknown'; const h = (Date.now() - t) / 36e5;
    return h < 1 ? 'under an hour' : h < 48 ? Math.round(h) + ' hours' : Math.round(h / 24) + ' days'; };

  /* ── the schedule read ────────────────────────────────────────────────────────────────────────────────────── */
  async function loadSched(force){
    if(ST.loading || (ST.rows && !force && Date.now() - ST.at < 10 * 6e4)) return;
    ST.loading = true; ST.err = ''; ST.partial = '';
    const start = todayChi();
    try{
      const { data:{ session } } = await sb.auth.getSession();
      if(!session) throw new Error('sign in again');
      const r = await fetch(CONFIG.supabase_url + '/functions/v1/coverage-shifts', { method:'POST',
        headers:{ 'Authorization':'Bearer ' + session.access_token, 'Content-Type':'application/json' },
        body:JSON.stringify({ live_schedule:true, start, end:addDays(start, 7) }) });
      const out = await r.json().catch(() => ({}));
      if(out.error || !Array.isArray(out.rows)) throw new Error(out.error || ('schedule ' + r.status));
      ST.rows = out.rows; ST.start = start; ST.at = Date.now(); ST.partial = out.partial || '';
    }catch(e){ ST.err = e.message || String(e); }
    ST.loading = false; redraw();
  }

  /* ── call-offs, last 30 days, by how they ended ───────────────────────────────────────────────────────── */
  const CO_KIND = { covered:['Covered', 'c-ok'], missed:['Missed care', 'c-bad'], open:['Still open', 'c-bad'], unknown:['No outcome yet', 'c-warn'], cancelled:['Client cancelled', 'c-dim'], notneeded:['Not needed', 'c-dim'] };
  function calloffKind(c){
    if(!c || c.kind === 'interest' || c.status === 'dismissed' || c.status === 'merged' || c.not_a_callin === true) return null;
    const how = String(c.resolved_how || '');
    if(how === 'covered' || how === 'covered_other_way') return 'covered';
    if(how === 'uncovered' || how === 'couldnt_staff') return 'missed';
    if(how === 'client_cancelled') return 'cancelled';
    if(how === 'not_needed') return 'notneeded';
    if(c.status === 'open' || c.status === 'flagged') return 'open';
    return 'unknown';
  }
  function calloffs(){
    const since = new Date(Date.now() - 30 * 864e5).toISOString(), by = {}, tot = { n:0, covered:0, missed:0, open:0, unknown:0, cancelled:0, notneeded:0 };
    ((get('DATA') || {}).coverage_cases || []).forEach(c => {
      const k = calloffKind(c); if(!k || String(c.opened_at || '') < since) return;
      const ax = String(c.client_axiscare_id || ''); const b = by[ax] || (by[ax] = { n:0, covered:0, missed:0, open:0, unknown:0, cancelled:0, notneeded:0 });
      b[k]++; b.n++; tot[k]++; tot.n++;
    });
    return { by, tot };
  }
  const calloffChips = b => !b || !b.n ? '<span class="field-note">none</span>'
    : ['missed', 'open', 'unknown', 'covered', 'cancelled', 'notneeded'].filter(k => b[k]).map(k => '<span class="clg-chip ' + CO_KIND[k][1] + '">' + b[k] + ' ' + CO_KIND[k][0].toLowerCase() + '</span>').join('');

  /* ── who is where: AxisCare decides "active"; the Hub and AxisCare disagreeing goes to a list ──────────── */
  const axActive = x => !!(x.ax && x.ax.active && !x.axOnly);
  function mismatch(x){
    if(x.unconnected || x.axOnly) return null;
    if(!x.past && !x.paused && !(x.ax && x.ax.active)) return x.ax ? 'In care in the Hub · ' + ((x.ax.status_label) || 'not active') + ' in AxisCare' : 'In care in the Hub · not found in AxisCare';
    if(x.past && x.ax && x.ax.active) return 'Care ended in the Hub · still active in AxisCare';
    return null;
  }

  /* ── Needs you: the outstanding items, who has them, how long they've waited ───────────────────────────── */
  function needs(all){
    const D = get('DATA') || {}, CLs = get('CL') || {}, byPid = {}, byAx = {}, out = [];
    all.forEach(x => { if(x.r && x.r.person_id) byPid[x.r.person_id] = x; if(x.r && x.r.axiscare_client_id) byAx[String(x.r.axiscare_client_id)] = x; });
    const keep = x => x && !x.past;
    (Array.isArray(CLs.issues) ? CLs.issues : []).forEach(i => {
      const x = byPid[i.client_person_id] || byAx[String(i.axiscare_client_id || '')]; if(!keep(x)) return;
      out.push({ x, what:'Concern: ' + (i.summary || 'no summary'), who:i.owner || 'Nobody yet', also:i.waiting_on ? 'waiting on ' + i.waiting_on : '', since:i.reported_at, tab:'summary', tone:i.urgency === 'urgent' || i.urgency === 'high' ? 'c-bad' : 'c-warn' });
    });
    (D.staffing_tasks || []).forEach(t => {
      const x = byAx[String(t && t.axiscare_client_id || '')]; if(!t || t.status === 'done' || !keep(x)) return;
      out.push({ x, what:'Family request: ' + String(t.message || t.about || '').slice(0, 90), who:'Staffing', also:t.from_name ? 'asked by ' + t.from_name : '', since:t.created_at, tab:'summary', tone:'c-warn' });
    });
    all.forEach(x => { if(!keep(x)) return; (x.due || []).filter(i => i.kind === 'ckconcern').forEach(i =>
      out.push({ x, what:i.label.replace(/^check-in escalated/, 'Check-in escalated'), who:x.coord || 'Nobody yet', also:'', since:i.due, tab:'checkins', tone:i.tone === 'bad' ? 'c-bad' : 'c-warn' })); });
    return out.sort((a, b) => String(a.since || '9').localeCompare(String(b.since || '9')));
  }

  /* ── check-ins and plan reviews: no record, overdue, due this week ─────────────────────────────────────── */
  function records(rows){
    const n = { ci:{ none:0, over:0, soon:0, ok:0 }, rv:{ none:0, over:0, soon:0, ok:0 }, list:[] };
    rows.forEach(x => {
      const ci = (x.due || []).find(i => i.kind === 'checkin'), rv = (x.due || []).filter(i => i.kind === 'review');
      const c = !ci ? 'ok' : ci.none ? 'none' : ci.tone === 'bad' ? 'over' : 'soon';
      const r = rv.some(i => i.none) ? 'none' : rv.some(i => i.tone === 'bad') ? 'over' : rv.length ? 'soon' : 'ok';
      n.ci[c]++; n.rv[r]++; n.list.push({ x, ci, rv, c, r });
    });
    return n;
  }
  const recWord = (s, items) => s === 'ok' ? '<span class="field-note">up to date</span>'
    : s === 'none' ? '<span class="clg-chip c-dim">no record yet</span>'
    : (Array.isArray(items) ? items : [items]).filter(Boolean).filter(i => !i.none).map(i => '<span class="clg-chip ' + (i.tone === 'bad' ? 'c-bad' : 'c-warn') + '">' + esc(i.label) + '</span>').join('');

  /* ── styles ───────────────────────────────────────────────────────────────────────────────────────────── */
  function style(){
    if(document.getElementById('clgStyle')) return;
    const st = document.createElement('style'); st.id = 'clgStyle';
    st.textContent = '.clg-tiles{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:0 0 10px}'
      + '.clg-tile{background:#fff;border:1px solid var(--border);border-radius:12px;padding:11px 13px;text-align:left;font:inherit;color:inherit;min-width:0}'
      + 'button.clg-tile{cursor:pointer}button.clg-tile:hover{border-color:var(--navy)}button.clg-tile.on{border-color:var(--navy);box-shadow:inset 0 0 0 1px var(--navy)}'
      + '.clg-lab{font-size:12.5px;color:var(--text-muted)}.clg-big{font-size:25px;font-weight:800;color:var(--navy);line-height:1.2;margin-top:2px}.clg-big.bad{color:#B23B2E}'
      + '.clg-sub{font-size:12px;color:var(--text-muted);margin-top:3px}'
      + '.clg-meter{height:6px;border-radius:3px;background:#EEF0F3;margin-top:6px;overflow:hidden;display:flex}.clg-meter>span{display:block;height:6px;background:#1F7A8C}.clg-meter>u{display:block;height:6px;background:#C0392B}'
      + '.clg-note{background:#FBFAF7;border:1px solid var(--border);border-radius:10px;padding:8px 12px;font-size:13px;margin:0 0 10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}'
      + '.clg-chip{display:inline-block;font-size:12px;font-weight:700;border-radius:6px;padding:2px 8px;margin:2px 4px 2px 0;white-space:nowrap}'
      + '.c-ok{background:#E7F6EC;color:#1F7A4D}.c-warn{background:#FDF3E3;color:#A8660E}.c-bad{background:#FDE8E8;color:#B23B2E}.c-dim{background:#F1F5F9;color:#64748B}'
      + '.clg-panel{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin:0 0 12px}'
      + '.clg-panel h4{margin:0 0 6px;font-size:15px;color:var(--navy)}'
      + '.clg-tbl{width:100%;border-collapse:collapse;font-size:13px;min-width:760px}.clg-tbl th{padding:8px 10px;font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;text-align:left;background:var(--bg)}'
      + '.clg-tbl td{padding:8px 10px;border-top:1px solid var(--border);vertical-align:top}.clg-tbl td.wk{min-width:190px}'
      + '.clg-bar{display:inline-flex;width:70px;height:7px;border-radius:4px;background:#EEF0F3;vertical-align:middle;margin-right:7px;overflow:hidden}.clg-bar>span{height:7px;background:#1F7A8C}.clg-bar>u{height:7px;background:#C0392B}'
      + '.clg-open{color:#B23B2E;font-weight:700}'
      + '.clg-grid{display:grid;grid-template-columns:104px repeat(7,minmax(64px,1fr));gap:4px;min-width:640px}'
      + '.clg-gh{font-size:12px;font-weight:700;color:var(--text-muted);text-align:center;padding:2px 0}.clg-gl{font-size:12.5px;font-weight:700;align-self:center}.clg-gl small{display:block;font-weight:400;color:var(--text-muted);font-size:11px}'
      + '.clg-gc{border:0;border-radius:7px;min-height:46px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--navy)}'
      + '.clg-gc.l0{background:#F3F1EC;color:var(--text-muted);cursor:default}.clg-gc.l1{background:#D6E9EC}.clg-gc.l2{background:#A9D0D7}.clg-gc.l3{background:#6FAFBB;color:#fff}.clg-gc.l4{background:#2F8798;color:#fff}'
      + '.clg-gc.sel{outline:2px solid var(--navy);outline-offset:1px}.clg-gc .op{font-size:10.5px;background:#C0392B;color:#fff;border-radius:99px;padding:0 6px;margin-top:2px}'
      + '.clg-key{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--text-muted);margin-top:8px}.clg-key i{display:inline-block;width:14px;height:10px;border-radius:3px;vertical-align:-1px;margin-right:4px}'
      + '.clg-pv{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:#EEF4FB;border:1px solid #C9DAF0;border-radius:10px;padding:8px 12px;margin:0 0 10px;font-size:13px}'
      + '.clg-upkeep{margin-top:12px;display:grid;gap:4px}'
      + '@media (max-width:860px){.clg-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.clg-tiles>:last-child{grid-column:1/-1}}';
    document.head.appendChild(st);
  }

  /* ── the whole Clients board in this look ─────────────────────────────────────────────────────────────── */
  function render(all, ctx){
    style();
    const CLs = get('CL'), box = ctx.box, gl = document.getElementById('clGlance'), fl = document.getElementById('clFilters');
    if(!ST.rows && !ST.loading && !ST.err) loadSched();
    const S = ST.rows ? summarize(ST.rows, ST.start) : null, R = S ? reconcile(S) : null, CO = calloffs();
    const act = all.filter(axActive), mm = all.filter(mismatch), paused = all.filter(x => !x.past && x.paused), past = all.filter(x => x.past);
    const careRows = act.filter(x => !x.past && !x.paused && !x.unconnected), rec = records(careRows), nd = needs(all);
    const cOf = x => S && S.cl[String(x.r.axiscare_client_id)] || null;

    /* tiles */
    const lv = { 1:0, 2:0, 3:0, none:0 };
    act.forEach(x => { const l = typeof cgdLevelOf === 'function' ? cgdLevelOf(x.ax.classes) : null; if(l) lv[l]++; else lv.none++; });
    const wait = ST.err ? '<span style="color:var(--red);">couldn\'t load: ' + esc(ST.err) + '</span> <a href="javascript:void(0)" onclick="CLG.reload()">try again</a>' : 'loading…';
    const tile = (lab, big, sub, extra) => '<div class="clg-tile"><div class="clg-lab">' + lab + '</div><div class="clg-big">' + big + '</div>' + (extra || '') + '<div class="clg-sub">' + sub + '</div></div>';
    const btn = (f, lab, big, sub, cls) => '<button class="clg-tile' + (ST.filter === f || ST.panel === f ? ' on' : '') + '" onclick="CLG.pick(\'' + f + '\')"><div class="clg-lab">' + lab + '</div><div class="clg-big' + (cls ? ' ' + cls : '') + '">' + big + '</div><div class="clg-sub">' + sub + '</div></button>';
    const cov = S ? pct(S.tot.min - S.tot.open, S.tot.min) : null;
    const openCl = S ? Object.values(S.cl).filter(c => c.open).length : 0;
    const coSub = CO.tot.n ? [CO.tot.covered + ' covered', CO.tot.missed + ' missed care', CO.tot.unknown ? CO.tot.unknown + ' no outcome yet' : '', CO.tot.open ? CO.tot.open + ' still open' : ''].filter(Boolean).join(' · ') : 'none';
    const pv = !live(settings()) && isOwner()
      ? '<div class="clg-pv"><b>Preview of the new Clients look.</b> Only you see it, in this browser. Everyone else still has the current list.<span style="flex:1;"></span><button class="secondary" style="font-size:12px;padding:3px 10px;" onclick="CLG.preview(false)">Back to the current list</button></div>' : '';
    const tiles = '<div class="clg-tiles">'
      + tile('Active clients', String(ctx.nAct), 'in AxisCare · L1 ' + lv[1] + ' · L2 ' + lv[2] + ' · L3 ' + lv[3] + (lv.none ? ' · no level ' + lv.none : ''))
      + tile('Hours of care, next 7 days', S ? hrs(S.tot.min) : '…', S ? (cov == null ? 'nothing scheduled' : hrs(S.tot.min - S.tot.open) + ' with a caregiver · ' + hrs(S.tot.open) + ' open · ' + cov + '%') : wait,
          S && S.tot.min ? '<div class="clg-meter"><span style="width:' + ((S.tot.min - S.tot.open) / S.tot.min * 100) + '%"></span><u style="width:' + (S.tot.open / S.tot.min * 100) + '%"></u></div>' : '')
      + btn('open', 'Open visits, next 7 days', S ? String(S.tot.openVisits) : '…', S ? (S.tot.openVisits ? hrs(S.tot.open) + ' · ' + openCl + ' client' + (openCl === 1 ? '' : 's') + ' · tap to see' : 'every visit has a caregiver') : wait, S && S.tot.openVisits ? 'bad' : '')
      + btn('calloff', 'Call-offs, last 30 days', String(CO.tot.n), coSub + (CO.tot.n ? ' · tap to see' : ''), CO.tot.missed ? 'bad' : '')
      + btn('needs', 'Needs you', String(nd.length), nd.length ? 'concerns, family requests, escalated check-ins · tap to see' : 'nothing waiting')
      + '</div>';
    const recLine = '<div class="clg-note"><b>Check-ins and plan reviews</b>'
      + '<span>Check-ins: ' + (rec.ci.none ? rec.ci.none + ' no record yet' : 'all recorded') + ' · ' + rec.ci.over + ' overdue · ' + rec.ci.soon + ' due this week</span>'
      + '<span>Plan reviews: ' + (rec.rv.none ? rec.rv.none + ' no record yet' : 'all recorded') + ' · ' + rec.rv.over + ' overdue · ' + rec.rv.soon + ' due this week</span>'
      + '<a href="javascript:void(0)" onclick="CLG.panelGo(\'records\')">' + (ST.panel === 'records' ? 'Hide the list' : 'Review the list') + '</a></div>';
    const recon = R && !R.ok ? '<div class="clg-note" style="border-color:#E8B4B4;color:#B23B2E;"><b>The hours don\'t add up.</b> Tiles ' + hrs(R.tiles) + ', chart ' + hrs(R.chart) + ', rows ' + hrs(R.rows) + '. Tell Samantha; nothing is wrong in AxisCare.</div>' : '';
    const warn = (ST.partial ? '<div class="clg-note" style="color:#A8660E;">AxisCare had more visits than one read holds, so the hours may be short. ' + esc(ST.partial) + '</div>' : '')
      + (S && S.tot.noEnd ? '<div class="clg-note" style="color:#A8660E;">' + S.tot.noEnd + ' visit' + (S.tot.noEnd === 1 ? ' has' : 's have') + ' no start or end time in AxisCare and ' + (S.tot.noEnd === 1 ? 'is' : 'are') + ' not counted.</div>' : '');
    if(gl) gl.innerHTML = pv + tiles + recLine + recon + warn;

    /* the view buttons: Starting care, Active, Paused, Past, Check with AxisCare, and the Coverage chart */
    const VIEWS = [...(ctx.startN != null ? [['Starting care', ctx.startN]] : []), ['Active', act.length], ['Paused', paused.length], ['Past', past.length], ...(mm.length ? [['Check with AxisCare', mm.length]] : [])];
    if(!CLs.picked && !VIEWS.some(v => v[0] === CLs.filter)) CLs.filter = ctx.startN > 0 ? 'Starting care' : 'Active';
    if(!VIEWS.some(v => v[0] === CLs.filter)) CLs.filter = 'Active';
    if(fl) fl.innerHTML = VIEWS.map(v => '<button class="filter-pill' + (v[0] === 'Starting care' || v[0] === 'Active' ? ' cl-main' : '') + (v[0] === CLs.filter ? ' active' : '') + '" onclick="CL.filter=\'' + v[0] + '\';CL.picked=true;CLG.clearPick();renderClientsBoard()">' + v[0] + ' <span style="opacity:.65;">' + v[1] + '</span></button>').join('')
      + '<button class="filter-pill' + (ST.panel === 'coverage' ? ' active' : '') + '" style="margin-left:14px;" onclick="CLG.panelGo(\'coverage\')">' + (ST.panel === 'coverage' ? 'Hide the coverage chart' : 'Coverage chart') + '</button>'
      + (famOn() ? '<button class="filter-pill' + (ST.filter === 'famtext' ? ' active' : '') + '" onclick="CLG.pick(\'famtext\')">Family can\'t get texts' + (ST.fam ? ' <span style="opacity:.65;">' + act.filter(x => !x.past && !x.paused && !ST.fam.textable.has(String(x.r.axiscare_client_id))).length + '</span>' : '') + '</button>' : '');
    if(ST.filter === 'famtext' && !famOn()) ST.filter = '';

    if(CLs.filter === 'Starting care' && !ST.filter){ box.innerHTML = panels(S, nd, rec, mm) + (typeof cjStartingHtml === 'function' ? cjStartingHtml() : ''); return; }

    /* which rows */
    const q = typeof clNorm === 'function' ? clNorm(CLs.q) : '';
    let rows, sortBy;
    if(q) rows = all.filter(x => clNorm(x.r.client_name).includes(q) || clNorm(x.ax && ((x.ax.first || '') + (x.ax.last || '') + (x.ax.goes_by || ''))).includes(q) || String(x.r.axiscare_client_id) === CLs.q.trim().replace(/^#/, ''));
    else if(ST.filter === 'open') rows = act.filter(x => (cOf(x) || {}).open);
    else if(ST.filter === 'calloff') rows = all.filter(x => !x.past && (CO.by[String(x.r.axiscare_client_id)] || {}).n);
    else if(ST.filter === 'famtext') rows = ST.fam ? act.filter(x => !x.past && !x.paused && !ST.fam.textable.has(String(x.r.axiscare_client_id))) : [];
    else rows = all.filter({ Active:axActive, Paused:x => !x.past && !!x.paused, Past:x => x.past, 'Check with AxisCare':x => !!mismatch(x) }[CLs.filter] || axActive);
    const coOf = x => CO.by[String(x.r.axiscare_client_id)] || { n:0, missed:0 };
    if(ST.filter === 'calloff') sortBy = (a, b) => (coOf(b).missed - coOf(a).missed) || (coOf(b).n - coOf(a).n);
    else sortBy = (a, b) => (a.past - b.past) || (((cOf(b) || {}).open || 0) - ((cOf(a) || {}).open || 0)) || (b.bad - a.bad);
    rows.sort((a, b) => sortBy(a, b) || String(a.r.client_name).localeCompare(String(b.r.client_name)));

    /* the rows outside the shown list still count in the tiles: say so, so the hours always reconcile */
    let other = '';
    if(S && !q && !ST.filter && CLs.filter === 'Active'){
      const shown = {}; act.forEach(x => { shown[String(x.r.axiscare_client_id)] = 1; });
      const out = Object.values(S.cl).filter(c => !shown[c.id]);
      if(out.length) other = '<div class="field-note" style="margin:6px 0 0;">Also in the hours above: ' + out.map(c => esc(c.name || 'AxisCare client #' + c.id) + ' ' + hrs(c.min) + (c.open ? ' (' + hrs(c.open) + ' open)' : '')).join(' · ') + '. Not on the Active list.</div>';
    }
 const head = !q && !ST.filter && CLs.filter === 'Check with AxisCare' ? '<div class="clg-note"><b>The Hub and AxisCare disagree about these clients.</b><span>Nothing changes by itself. Open the profile to end or pause care if AxisCare is right, or fix AxisCare if the Hub is right.</span></div>'
      : ST.filter === 'famtext' ? '<div class="clg-note"><b>Nobody in these families can get a text if a caregiver is running late.</b><span>'
        + (ST.famErr ? 'Couldn\'t read the Family Circles: ' + esc(ST.famErr) + '.' : !ST.fam ? 'Loading the Family Circles…'
          : 'On your next call, ask: "Is it OK if we text you if a caregiver is running late?" If they say yes, check Texts OK for them on the client\'s Family Circle. ' + rows.map(x => esc(x.r.client_name || ('#' + x.r.axiscare_client_id)) + ' (' + esc(famWhy(x).toLowerCase()) + ')').join(' · '))
        + '</span><a href="javascript:void(0)" onclick="CLG.clearPick();renderClientsBoard()">Show everyone again</a></div>'
      : ST.filter ? '<div class="clg-note"><b>' + (ST.filter === 'open' ? 'Clients with open visits, next 7 days' : 'Clients with call-offs, last 30 days, missed care first') + '</b><a href="javascript:void(0)" onclick="CLG.clearPick();renderClientsBoard()">Show everyone again</a></div>' : '';
    box.innerHTML = panels(S, nd, rec, mm) + head + (rows.length ? table(rows, S, CO) : '<div class="card" style="padding:16px 18px;color:var(--text-muted);">' + (q ? 'No client by that name in the Hub or AxisCare.' : 'Nobody here right now.') + '</div>') + other;
  }

  /* the open panel (one at a time): Needs you, check-in and plan review records, Check with AxisCare, the coverage chart */
  function panels(S, nd, rec, mm){
    const p = ST.panel;
    const close = '<a href="javascript:void(0)" style="float:right;font-size:13px;" onclick="CLG.panelGo(\'\')">Close</a>';
    const open = (x, tab, label) => '<a href="javascript:void(0)" data-open-client="' + esc(x.r.axiscare_client_id || x.r.client_name || '') + '" data-open-tab="' + esc(tab) + '" style="font-weight:700;color:var(--navy);">' + esc(label || x.r.client_name) + '</a>';
    if(p === 'needs') return '<div class="clg-panel">' + close + '<h4>Needs you</h4>'
      + (nd.length ? '<div style="overflow-x:auto;"><table class="clg-tbl"><thead><tr><th>Client</th><th>What</th><th>Who has it</th><th>Waiting</th></tr></thead><tbody>'
        + nd.map(i => '<tr><td>' + open(i.x, i.tab) + '</td><td><span class="clg-chip ' + i.tone + '">' + esc(i.what) + '</span></td><td>' + esc(i.who) + (i.also ? '<div class="field-note">' + esc(i.also) + '</div>' : '') + '</td><td>' + esc(ago(i.since)) + '</td></tr>').join('')
        + '</tbody></table></div>' : '<div class="field-note">Nothing is waiting: no open concerns, family requests or escalated check-ins.</div>') + '</div>';
    if(p === 'records') return '<div class="clg-panel">' + close + '<h4>Check-ins and plan reviews</h4>'
      + '<div class="field-note" style="margin-bottom:6px;">"No record yet" means nothing has been saved in the Hub for that client. It is not the same as overdue, which means a recorded due date has passed.</div>'
      + '<div style="overflow-x:auto;"><table class="clg-tbl"><thead><tr><th>Client</th><th>Check-in</th><th>Plan review</th></tr></thead><tbody>'
      + rec.list.sort((a, b) => String(a.x.r.client_name).localeCompare(String(b.x.r.client_name))).map(e => '<tr><td>' + open(e.x, 'checkins') + '</td><td>' + recWord(e.c, e.ci) + '</td><td>' + recWord(e.r, e.rv) + '</td></tr>').join('')
      + '</tbody></table></div></div>';
    if(p === 'coverage') return chart(S);
    return '';
  }

  /* the labeled list */
  function table(rows, S, CO){
    const lvl = x => { const l = x.ax && typeof cgdLevelOf === 'function' ? cgdLevelOf(x.ax.classes) : null; return l ? 'Level ' + l : '<span class="field-note">no level in AxisCare</span>'; };
    const axLink = ax => '<a href="https://16485.axiscare.com/?clients-profile.php&id=' + esc(ax) + '" target="_blank" rel="noopener">open in AxisCare ↗</a>';
    const body = rows.map(x => {
      const ax = String(x.r.axiscare_client_id), c = S ? S.cl[ax] : null, why = mismatch(x);
      const stage = x.unconnected ? '<span class="tag-chip" style="background:#FDF3E3;color:#A8660E;font-weight:800;">Not connected yet</span>'
        : typeof ccStageChip === 'function' ? ccStageChip(x.past ? { k:'past', d:x.axOnly ? 'in AxisCare only' : /deceas/i.test(String(x.r.end_reason || '')) ? 'deceased' : 'ended care' } : { k:'care', d:'' }) : '';
      const name = x.axOnly ? '<b style="color:var(--navy);">' + esc(x.r.client_name) + '</b>'
        : '<a href="javascript:void(0)" ' + (x.unconnected ? 'onclick="clOpenUnconnected(\'' + esc(ax) + '\')"' : 'data-open-client="' + esc(ax) + '"') + ' style="font-weight:700;color:var(--navy);">' + esc(x.r.client_name) + '</a>';
      const pausedChip = x.paused ? ' <span class="tag-chip" style="background:#FFF4E1;color:#9A6412;font-weight:800;">Paused · follow up ' + esc(new Date(x.paused.followup_date + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' })) + '</span>' : '';
      let week;
      if(x.past || x.axOnly) week = '<span class="field-note">not in care</span>';
      else if(!S) week = '<span class="field-note">' + (ST.err ? 'couldn\'t load' : '…') + '</span>';
      else if(!c || !c.min) week = '<span class="field-note">nothing scheduled</span>';
      else { const cv = c.min - c.open;
        week = '<span class="clg-bar"><span style="width:' + (cv / c.min * 100) + '%"></span><u style="width:' + (c.open / c.min * 100) + '%"></u></span><b style="white-space:nowrap;">' + hrs(c.min) + ' scheduled</b>'
          + '<div class="field-note" style="font-size:12px;white-space:nowrap;">' + hrs(cv) + ' covered · ' + (c.open ? '<span class="clg-open">' + hrs(c.open) + ' open</span>' : '0 h open') + ' · ' + pct(cv, c.min) + '%</div>'; }
      let main = '<span class="field-note">—</span>';
      if(c && c.min){ const cgs = Object.values(c.cg).sort((a, b) => b.min - a.min);
        main = cgs.length ? esc(cgs[0].name || '?') + ' <span class="field-note">' + hrs(cgs[0].min) + '</span>' + (cgs.length > 1 ? '<div class="field-note" style="font-size:12px;">and ' + (cgs.length - 1) + ' other' + (cgs.length > 2 ? 's' : '') + '</div>' : '') : '<span class="clg-open">no one yet</span>'; }
      const due = x.unconnected ? '<span style="font-size:12.5px;color:#A8660E;">In AxisCare, not in the Hub yet · connects on the next sync</span> · ' + axLink(ax)
        : x.axOnly ? '<span class="field-note">' + esc((x.ax && x.ax.status_label) || 'Not active') + ' in AxisCare · not kept in the Hub</span> · ' + axLink(ax)
        : (why ? '<span class="clg-chip c-warn">' + esc(why) + '</span>' : '') + ((x.due || []).filter(i => !i.none && i.kind !== 'calloff').map(i => typeof clChip === 'function' ? clChip(x.r, i) : esc(i.label)).join('') || (why ? '' : '<span class="field-note">nothing open</span>'));
      return '<tr' + (x.bad ? ' style="background:#FFFAF9;"' : '') + '><td>' + name + '<div style="margin-top:3px;">' + stage + pausedChip + '</div></td><td style="white-space:nowrap;">' + lvl(x) + '</td><td class="wk">' + week + '</td><td>' + main + '</td><td>' + (x.axOnly ? '' : calloffChips(CO.by[ax])) + '</td><td>' + due + '</td></tr>';
    }).join('');
    return '<div class="card" style="padding:0;overflow-x:auto;"><table class="clg-tbl"><thead><tr><th>Client</th><th>Care level</th><th>Next 7 days</th><th>Main caregiver this week</th><th>Call-offs, 30 days</th><th>Open or due</th></tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  /* the week by block; a square lists its visits, and an open visit goes straight to Coverage */
  function chart(S){
    const close = '<a href="javascript:void(0)" style="float:right;font-size:13px;" onclick="CLG.panelGo(\'\')">Close</a>';
    if(!S) return '<div class="clg-panel">' + close + '<h4>Care this week</h4><div class="field-note">' + (ST.err ? 'Couldn\'t load the schedule from AxisCare: ' + esc(ST.err) + ' <a href="javascript:void(0)" onclick="CLG.reload()">try again</a>' : 'Loading the schedule from AxisCare…') + '</div></div>';
    const days = Array.from({ length:7 }, (_, d) => addDays(ST.start, d));
    const max = Math.max(1, ...S.cells.flat().map(x => x.min));
    let g = '<div></div>' + days.map(d => '<div class="clg-gh">' + esc(dayName(d).replace(/,.*/, '')) + '<div style="font-weight:400;">' + esc(dayName(d).replace(/^\w+,\s*/, '')) + '</div></div>').join('');
    BANDS.forEach((b, bi) => {
      g += '<div class="clg-gl">' + b[0] + '<small>' + b[1] + '</small></div>';
      days.forEach((d, di) => { const x = S.cells[bi][di], l = !x.min ? 0 : Math.min(4, 1 + Math.floor(x.min / max * 3.999));
        const sel = ST.cell && ST.cell[0] === bi && ST.cell[1] === di;
        g += '<button class="clg-gc l' + l + (sel ? ' sel' : '') + '"' + (x.min ? ' onclick="CLG.cellGo(' + bi + ',' + di + ')"' : ' disabled') + ' title="' + esc(b[0] + ', ' + dayName(d)) + '">' + (x.min ? hrs(x.min) : '·') + (x.open ? '<span class="op">' + hrs(x.open) + ' open</span>' : '') + '</button>'; });
    });
    let drawer = '<div class="field-note" style="margin-top:8px;">Tap a square to see whose care falls in it. Red means hours with no caregiver yet.</div>';
    if(ST.cell){ const [bi, di] = ST.cell, x = S.cells[bi][di];
      const its = x.items.slice().sort((a, b) => (b.open - a.open) || String(a.v.time).localeCompare(String(b.v.time)));
      drawer = '<div style="margin-top:10px;"><b>' + BANDS[bi][0] + ', ' + esc(dayName(days[di])) + ':</b> ' + hrs(x.min) + ' of care' + (x.open ? ', <span class="clg-open">' + hrs(x.open) + ' open</span>' : ', every visit has a caregiver') + '</div>'
        + '<div style="overflow-x:auto;"><table class="clg-tbl" style="min-width:620px;"><thead><tr><th>Client</th><th>Visit</th><th>Caregiver</th><th>In this block</th><th></th></tr></thead><tbody>'
        + its.map(it => { const v = it.v;
          return '<tr><td>' + esc(v.client) + '</td><td>' + esc(dayName(v.date).replace(/,.*/, '') + ' ' + t12(v.time) + ' to ' + t12(v.end)) + '</td><td>' + (it.open ? '<span class="clg-open">Open</span>' : esc(v.caregiver)) + '</td>'
            + '<td>' + hrs(it.min) + (it.min !== it.of ? ' <span class="field-note">of ' + hrs(it.of) + '</span>' : '') + '</td>'
            + '<td>' + (it.open ? '<button class="secondary" style="font-size:12px;padding:3px 10px;" onclick="CLG.toCoverage(\'' + esc(v.visit_id) + '\')">' + (caseFor(v.visit_id) ? 'Go to its coverage case' : 'Start a coverage case') + '</button>' : '') + '</td></tr>'; }).join('')
        + '</tbody></table></div>'; }
    return '<div class="clg-panel">' + close + '<h4>Care this week, by time of day</h4>'
      + '<div class="field-note" style="margin-bottom:8px;">' + esc(dayName(days[0])) + ', 6 am, to ' + esc(dayName(addDays(ST.start, 7))) + ', 6 am. Each care day runs 6 am to 6 am, so an overnight visit sits on the night it starts. A visit that crosses blocks is split at the block edges, never counted twice.</div>'
      + '<div style="overflow-x:auto;"><div class="clg-grid">' + g + '</div></div>'
      + '<div class="clg-key"><span><i style="background:#F3F1EC"></i>none</span><span><i style="background:#D6E9EC"></i>a little</span><span><i style="background:#2F8798"></i>a lot</span><span><i style="background:#C0392B"></i>open hours, no caregiver yet</span></div>'
      + drawer + '</div>';
  }
  function caseFor(visitId){
    if(!visitId) return null;
    return ((get('DATA') || {}).coverage_cases || []).find(c => c && String(c.axiscare_visit_id || '') === String(visitId) && c.status !== 'dismissed' && c.status !== 'merged') || null;
  }
  /* an open visit: its call-off case if there is one, otherwise the Open a coverage case form, filled in. Nothing is saved
     here; a person reads it and presses Open case. */
  function toCoverage(visitId){
    const v = (ST.rows || []).find(r => String(r.visit_id) === String(visitId)); if(!v) return;
    const c = caseFor(visitId);
    try{ schedGo('coverage'); }catch(e){ try{ switchTab('coverage'); }catch(e2){} }
    if(c){ try{ caraShowCase(c.id); }catch(e){} return; }
    try{ covOpenAdd('calloff'); }catch(e){ return; }
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
    set('covClient', v.client || ''); set('covDate', v.date || ''); set('covTime', t12(v.time) + ' to ' + t12(v.end));
    set('covNote', 'Open in AxisCare with no caregiver (visit ' + (v.visit_id || '?') + '). Started from Clients, coverage chart.');
  }

  /* the AxisCare upkeep lines (sync, reviews asked, left out of lists) go under the list in this look */
  function placeUpkeep(on){
    const tab = document.getElementById('tab-clientsboard'), board = document.getElementById('clBoard');
    const a = document.getElementById('clSyncLine'), b = document.getElementById('clNotClient'), f = document.getElementById('clFilters');
    if(!tab || !board || !a || !b || !f) return;
    let box = document.getElementById('clgUpkeep');
    if(on){
      if(!box){ box = document.createElement('div'); box.id = 'clgUpkeep'; box.className = 'clg-upkeep'; tab.appendChild(box); }
      if(a.parentNode !== box){ box.appendChild(a); box.appendChild(b); }
      if(typeof ccIsOwner === 'function' && ccIsOwner() && typeof rvCounts === 'function' && !box.querySelector('.rv-count'))
        rvCounts().then(c => { if(!c || box.querySelector('.rv-count')) return;
          box.insertAdjacentHTML('beforeend', '<span class="field-note rv-count">Google reviews, last 90 days: ' + c.asked + ' asked · ' + c.left + ' left' + (c.said_would ? ' · ' + c.said_would + ' said they would' : '') + (c.live ? '' : ' · suggestions off') + '</span>'); }).catch(() => {});
    } else if(box && a.parentNode === box){ tab.insertBefore(a, document.getElementById('clGlance') || f); tab.appendChild(b); box.remove(); }
  }

  /* 2026-11-05 running late, telling the family (her decision 7): "Family can't get texts" lists the active clients whose
     Family Circle has nobody who said Texts OK for running-late texts (or no circle at all), so a coordinator can ask on
     their next call. Nothing is sent from here. Shown with ops_settings.late_family_step_live, or the owner's preview of it. */
  const famOn = () => settings().late_family_step_live === true || (typeof root.lnFamPreview === 'function' && !!root.lnFamPreview());
  async function loadFam(){
    if(ST.famLoading) return; ST.famLoading = true; ST.famErr = '';
    try{
      const sbc = get('sb');
      const [c, m] = await Promise.all([sbc.from('care_circles').select('id,axiscare_client_id').eq('active', true), sbc.from('circle_contacts').select('circle_id,phone,sms_consent,wants_late,stopped_at,axiscare_removed_at')]);
      if(c.error || m.error) throw (c.error || m.error);
      const byCircle = {}; (c.data || []).forEach(k => { if(k.axiscare_client_id != null) byCircle[k.id] = String(k.axiscare_client_id); });
      const linked = new Set(Object.values(byCircle)), textable = new Set();
      (m.data || []).forEach(x => { const ax = byCircle[x.circle_id];
        if(ax && x.sms_consent === true && x.wants_late !== false && !x.stopped_at && !x.axiscare_removed_at && String(x.phone || '').replace(/\D/g, '').length >= 10) textable.add(ax); });
      ST.fam = { linked, textable };
    }catch(e){ ST.famErr = (e && e.message) || 'could not read the Family Circles'; }
    ST.famLoading = false; redraw();
  }
  const famWhy = x => { const ax = String(x.r.axiscare_client_id); return !ST.fam ? '' : !ST.fam.linked.has(ax) ? 'No Family Circle linked' : 'Nobody said Texts OK'; };

  function pick(f){
    if(f === 'famtext' && !ST.fam) loadFam();
    if(f === 'needs'){ ST.panel = ST.panel === 'needs' ? '' : 'needs'; ST.filter = ''; }
    else { ST.filter = ST.filter === f ? '' : f; if(ST.panel === 'needs') ST.panel = ''; }
    redraw();
  }
  function panelGo(p){ ST.panel = ST.panel === p ? '' : p; if(p !== 'coverage') ST.cell = null; if(p === 'coverage' && !ST.rows) loadSched(); redraw(); }
  function cellGo(bi, di){ ST.cell = ST.cell && ST.cell[0] === bi && ST.cell[1] === di ? null : [bi, di]; redraw(); }
  function clearPick(){ ST.filter = ''; }
  function reload(){ ST.err = ''; loadSched(true); }
  function setPreviewAndDraw(on){ setPreview(!!on); redraw(); }

  /* Settings (data-set clients-glance): the switch, owners only */
  function settingsFill(){
    const now = document.getElementById('clgSetNow'), b = document.getElementById('clgToggleBtn'), pv = document.getElementById('clgPreviewBtn'); if(!now) return;
    const on = live(settings()), owner = isOwner();
    now.innerHTML = (on ? '<b style="color:#1E8449;">On.</b> Everyone sees the new Clients look.'
      : '<b style="color:#B7791F;">Off.</b> Everyone sees the current Clients list' + (preview() ? ' except you (preview, this browser).' : '.')) + (owner ? '' : ' Only Samantha or Zachary can change this.');
    if(b){ b.textContent = on ? 'Turn off the new Clients look' : 'Turn on the new Clients look for everyone'; b.style.display = owner ? '' : 'none'; }
    if(pv){ pv.textContent = preview() ? 'Stop my preview' : 'Preview it (only me)'; pv.style.display = owner && !on ? '' : 'none'; }
  }
  async function toggle(btn){
    if(!isOwner()){ alert('Only Samantha or Zachary can change the Clients look.'); return; }
    const on = !live(settings());
    const ok = await ccConfirm(on ? 'Turn on the new Clients look for everyone?\n\nTiles on top (hours of care, open visits, call-offs, Needs you), one line for check-ins and plan reviews, labeled columns, the coverage chart and the Check with AxisCare list. Only the look changes. Nothing is sent and nobody\'s status changes.'
      : 'Turn off the new Clients look? Everyone goes back to the current list.');
    if(!ok) return;
    if(btn) btn.disabled = true;
    const out = await tkMerge(m => { m.clients_glance_live = on; if(on && !m.clients_glance_live_since) m.clients_glance_live_since = new Date().toISOString(); return ['Clients at a glance ' + (on ? 'ON' : 'OFF')]; }, 'Clients at a glance');
    if(btn) btn.disabled = false;
    const sv = document.getElementById('clgSaved'); if(sv) sv.textContent = out.error ? ('Could not save: ' + out.error.message) : (on ? 'On.' : 'Off.');
    settingsFill(); redraw();
  }
  function previewLink(){
    return !live(settings()) && isOwner() && !preview()
      ? ' · <a href="javascript:void(0)" onclick="CLG.preview(true)">Preview the new Clients look (only you)</a>' : '';
  }

  root.CLG = { live, showing, preview:setPreviewAndDraw, previewOn:preview, loadSched, reload, render, placeUpkeep, pick, panelGo, cellGo, clearPick,
    toCoverage, settingsFill, toggle, previewLink,
    /* for the tests */ _:{ ST, span, pieces, summarize, reconcile, calloffKind, mismatch, hrs, addDays, BANDS } };
})(typeof window !== 'undefined' ? window : globalThis);
