/* Five more good-news moments (2026-10-18, her "Love it, build all five as shown, with names in Friday wins", mockup
   https://claude.ai/artifact/HzkHtzhtDJAmfzJfXTcEUh). Same rules as the rest: good news only, nobody ranked or compared,
   nothing sent to anyone, still for reduced motion.
   1. FUN.dashMini: Client Goals small on the Dashboard (this week's hours with a caregiver against the next goal, and
      the CDS count). Only when a goal is set.
   2. FUN.sunshine: on Today in AxisCare, a sun for each day this week (full = every visit had a caregiver) and the best
      run of fully covered days in the last four weeks. A plain streak was not used on purpose: on 2026-10-18 only 4 of
      29 days were fully covered, so a streak would sit at 0. Days with no visits never break a run.
   3. FUN.fridayWins: Friday noon (Chicago) to Sunday, the team's week in words, with names: new families whose AxisCare
      start date is this week, caregivers whose orientation finished, fully covered days, kind words, the week's hours.
      A line with nothing behind it is left out.
   4. FUN.garden: on the Applicants page, the last 30 days of applicants as a garden (seeds Applied, sprouts Interview,
      buds Offered, blooms Working), counted with the page's own stage rule. A bed opens the matching list.
   5. FUN.clientAnniv: behind ops_settings.client_anniversaries_live, active clients reaching a whole year with us this
      week, from the AxisCare start date the client list carries (client-census-report start_date; Desktop step). */
(function(){
  const N = '#0D365F', T = '#0F7A73', H = '#F0A63A', M = '#8FD1C7', P = '#EAF4F6', L = '#CADDD9';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const chiNow = () => new Date().toLocaleString('sv-SE', { timeZone:'America/Chicago' });
  const chiDay = () => chiNow().slice(0, 10);
  const ymdAdd = (ymd, n) => { const [y, m, d] = String(ymd).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  const dow = ymd => { const [y, m, d] = String(ymd).split('-').map(Number); return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; };   // Mon = 0
  const monday = ymd => ymdAdd(ymd, -dow(ymd));
  const DAYN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const words = n => n < WORD.length ? WORD[n] : String(n);
  const Words = n => { const w = words(n); return w.charAt(0).toUpperCase() + w.slice(1); };
  const joinAnd = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const fmtH = n => (Math.round(n * 10) / 10).toLocaleString('en-US');
  const settings = () => { try{ return (DATA && DATA.ops_settings) || {}; }catch(e){ return {}; } };
  function css(){
    if(document.getElementById('funCss')) return;
    const st = document.createElement('style'); st.id = 'funCss';
    st.textContent = '.fun-mini{display:grid;grid-template-columns:120px 1fr;gap:14px;align-items:center;padding:12px 16px;margin-bottom:14px;cursor:pointer;}'
      + '.fun-mini svg{width:120px;height:auto;border-radius:10px;}.fun-mini .big{font-size:26px;font-weight:800;color:var(--navy);line-height:1;letter-spacing:-.02em;}'
      + '.fun-mini .of{font-size:13px;color:var(--text-muted);font-weight:700;}.fun-track{height:8px;background:#EEF2F5;border-radius:99px;overflow:hidden;margin-top:6px;}.fun-track i{display:block;height:100%;background:' + T + ';border-radius:99px;}'
      + '.fun-suns{display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end;margin-top:8px;}.fun-sd{display:grid;justify-items:center;font-size:10.5px;color:var(--text-muted);gap:1px;}.fun-sd svg{width:30px;height:30px;}'
      + '.fun-wins{background:linear-gradient(135deg,#FFF4E3,#EAF4F6);border-radius:14px;padding:14px 16px;display:grid;grid-template-columns:72px 1fr;gap:14px;align-items:center;margin-bottom:14px;border:1px solid var(--border);}'
      + '.fun-wins b.h{font-size:16px;font-weight:800;color:var(--navy);}.fun-wins ul{margin:6px 0 0;padding-left:18px;display:grid;gap:3px;font-size:13.5px;}'
      + '.fun-garden{margin:0 0 12px;}.fun-garden svg{width:100%;height:auto;display:block;border-radius:12px;}.fun-bed{cursor:pointer;}.fun-bed:hover text{fill:' + N + ';}'
      + '.fun-card{padding:0;margin-bottom:14px;overflow:hidden;}.fun-card-h{padding:12px 16px;border-bottom:1px solid var(--border);font-weight:800;color:var(--navy);}'
      + '.fun-row{display:flex;gap:12px;align-items:center;padding:9px 16px;border-bottom:1px solid var(--border);font-size:13.5px;}.fun-row:last-child{border-bottom:0;}'
      + '.fun-av{width:32px;height:32px;border-radius:50%;background:' + P + ';color:var(--navy);display:grid;place-items:center;font-weight:800;font-size:12.5px;flex:0 0 32px;}'
      + '@media (max-width:560px){.fun-mini{grid-template-columns:1fr;}.fun-wins{grid-template-columns:1fr;}}';
    document.head.appendChild(st);
  }
  /* a spot on the Dashboard just above "Grow the agency" (the goals row), made once */
  function dashSlot(id){
    const goals = document.getElementById('goalsRow'); if(!goals) return null;
    let el = document.getElementById(id); if(el) return el;
    const anchor = goals.previousElementSibling && goals.previousElementSibling.classList.contains('mission-label') ? goals.previousElementSibling : goals;
    el = document.createElement('div'); el.id = id; anchor.insertAdjacentElement('beforebegin', el); return el;
  }

  /* ── 1. Client Goals on the Dashboard ── */
  async function dashMini(){
    if(!window.CGO || !CGO.plan) return;
    const hrsRow = CGO.row('client_hours'), cdsRow = CGO.row('cds_consumers');
    const hasH = CGO.stepsOf(hrsRow).length, hasC = CGO.stepsOf(cdsRow).length;
    if(!hasH && !hasC){ const el = document.getElementById('funMini'); if(el) el.remove(); return; }
    const w = hasH ? await CGO.thisWeek() : null;
    const el = dashSlot('funMini'); if(!el) return; css();
    const P = CGO.plan('client_hours', hrsRow), C = CGO.plan('cds_consumers', cdsRow || {});
    const pc = w && P.goal ? Math.min(100, w.hours / P.goal * 100) : 0;
    const cdsLine = hasC ? 'CDS: ' + (Number(cdsRow.count) || 0) + ' of ' + C.goal + ' consumers' : '';
    el.className = 'card fun-mini'; el.setAttribute('role', 'link'); el.setAttribute('tabindex', '0'); el.title = 'Open Client Goals';
    el.onclick = () => switchTab('clientgoals'); el.onkeydown = e => { if(e.key === 'Enter') switchTab('clientgoals'); };
    const t = Math.max(.04, pc / 100), px = 8 + 110 * t, py = 72 - 54 * t;
    el.innerHTML = '<svg viewBox="0 0 130 80" aria-hidden="true"><rect width="130" height="80" rx="10" fill="' + P_bg() + '"/><path d="M0 80 L0 60 Q 40 46 70 54 T 130 22 L130 80 Z" fill="' + L + '"/>'
      + '<path d="M8 72 C 30 72 40 56 62 54 S 100 40 118 18" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>'
      + '<path d="M8 72 C 30 72 40 56 62 54 S 100 40 118 18" fill="none" stroke="' + T + '" stroke-width="5" stroke-linecap="round" pathLength="100" stroke-dasharray="' + pc + ' 100"/>'
      + '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="6" fill="#fff" stroke="' + N + '" stroke-width="2"/><path d="M118 18 v-12 l10 3 -10 3" fill="' + (pc >= 100 ? H : T) + '" stroke="' + N + '" stroke-width="1.2"/></svg>'
      + '<div>' + (hasH ? (w ? '<div class="big">' + fmtH(w.hours) + ' <span class="of">of ' + fmtH(P.goal) + ' hours with a caregiver this week</span></div><div class="fun-track"><i style="width:' + pc.toFixed(1) + '%"></i></div>'
          : '<div class="of">This week’s hours could not be read from AxisCare just now.</div>') : '')
      + '<div class="field-note" style="margin-top:6px;">' + esc(cdsLine) + (cdsLine ? ' · ' : '') + '<b style="color:var(--teal);">Open Client Goals</b></div></div>';
  }
  const P_bg = () => P;

  /* ── 2. sunshine this week, and the best run ── */
  function sunSvg(full, none){
    if(none) return '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="3" fill="' + L + '"/></svg>';
    let r = ''; if(full) for(let i = 0; i < 8; i++) r += '<line x1="20" y1="4" x2="20" y2="9" stroke="' + H + '" stroke-width="2.4" stroke-linecap="round" transform="rotate(' + (i * 45) + ' 20 20)"/>';
    return '<svg viewBox="0 0 40 40" aria-hidden="true">' + r + '<circle cx="20" cy="20" r="9" fill="' + (full ? H : '#fff') + '" stroke="' + (full ? H : '#C17A12') + '" stroke-width="2.4"' + (full ? '' : ' stroke-dasharray="3 3"') + '/></svg>';
  }
  let RUN = { at:0, d:null };
  /* the longest run of fully covered days; a day with no visits neither counts nor breaks it */
  function bestRun(days){
    let best = { n:0, from:null, to:null }, cur = { n:0, from:null };
    Object.keys(days).sort().forEach(d => {
      const x = days[d]; if(!x.n) return;
      if(!x.open){ if(!cur.n) cur.from = d; cur.n++; if(cur.n > best.n) best = { n:cur.n, from:cur.from, to:d }; }
      else cur = { n:0, from:null };
    });
    return best;
  }
  async function runLoad(){
    if(RUN.d && Date.now() - RUN.at < 30 * 60000) return RUN.d;
    try{
      const { data:{ session } } = await sb.auth.getSession(); if(!session || !session.access_token) return null;
      const end = ymdAdd(chiDay(), -1), start = ymdAdd(end, -27);
      const r = await fetch(CONFIG.supabase_url + '/functions/v1/coverage-shifts', { method:'POST',
        headers:{ Authorization:'Bearer ' + session.access_token, apikey:CONFIG.supabase_anon_key, 'Content-Type':'application/json' },
        body:JSON.stringify({ live_schedule:true, start, end }) });
      const d = await r.json().catch(() => null);
      if(!r.ok || !d || d.error || d.partial) return null;
      const days = {}; (d.rows || []).forEach(v => { const k = String(v.date || '').slice(0, 10); if(!k) return; const x = days[k] = days[k] || { n:0, open:0 }; x.n++; if(!v.caregiver) x.open++; });
      RUN = { at:Date.now(), d:bestRun(days) }; return RUN.d;
    }catch(e){ return null; }
  }
  const short = ymd => new Date(ymd + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' });
  async function sunshine(){
    const card = document.getElementById('tbShiftCard'); if(!card || !window.CGO) return;
    const w = await CGO.thisWeek(); if(!w || w.partial || !w.days) return;
    css();
    const mon = monday(chiDay());
    let h = '<div style="font-size:12.5px;font-weight:800;color:var(--navy);margin-top:10px;">Days this week with every visit covered</div><div class="fun-suns">';
    for(let i = 0; i < 7; i++){
      const d = ymdAdd(mon, i), x = w.days[d] || { n:0, open:0 };
      h += '<div class="fun-sd" title="' + esc(DAYN[i] + (x.n ? ': ' + (x.open ? x.open + ' of ' + x.n + ' visits with nobody' : 'all ' + x.n + ' visits covered') : ': no visits')) + '">' + sunSvg(x.n && !x.open, !x.n) + '<span>' + DAYN[i].slice(0, 3) + '</span></div>';
    }
    h += '</div>';
    const run = await runLoad();
    if(run && run.n) h += '<div class="field-note" style="margin-top:4px;">Best run in the last four weeks: ' + words(run.n) + ' day' + (run.n === 1 ? '' : 's') + (run.n > 1 ? ' (' + esc(short(run.from)) + ' to ' + esc(short(run.to)) + ')' : ' (' + esc(short(run.from)) + ')') + '.</div>';
    let el = card.querySelector('.fun-sunshine'); if(!el){ el = document.createElement('div'); el.className = 'fun-sunshine'; card.appendChild(el); }
    el.innerHTML = h;
  }

  /* ── 3. Friday wins ── */
  function winsWindow(){ const n = chiNow(), d = n.slice(0, 10), i = dow(d), hm = n.slice(11, 16); return i === 5 || i === 6 || (i === 4 && hm >= '12:00'); }
  let CEN = { at:0, d:null };
  async function census(){
    if(CEN.d && Date.now() - CEN.at < 10 * 60000) return CEN.d;
    try{ const j = typeof clCensusLoad === 'function' ? await clCensusLoad() : null; CEN = { at:Date.now(), d:j }; return j; }catch(e){ return null; }
  }
  const nameOf = c => (String(c.first || '') + ' ' + String(c.last || '')).trim() || String(c.name || '').trim();
  async function winsLines(){
    const today = chiDay(), mon = monday(today), lines = [];
    const inWeek = d => { const x = String(d || '').slice(0, 10); return x >= mon && x <= today; };
    const cen = await census();
    const fams = ((cen && cen.clients) || []).filter(c => c.active !== false && inWeek(c.start_date)).map(nameOf).filter(Boolean);
    if(fams.length) lines.push(Words(fams.length) + ' new famil' + (fams.length === 1 ? 'y' : 'ies') + ' started care: ' + joinAnd(fams.slice(0, 4)) + (fams.length > 4 ? ' and more' : ''));
    let cgs = []; try{ cgs = (DATA.caregivers || []).filter(c => inWeek(c.orient_date)).map(nameOf).filter(Boolean); }catch(e){}
    if(cgs.length === 1) lines.push(cgs[0] + ' finished orientation and is ready for a first client');
    else if(cgs.length) lines.push(joinAnd(cgs.slice(0, 4)) + (cgs.length > 4 ? ' and more' : '') + ' finished orientation');
    const w = window.CGO ? await CGO.thisWeek() : null;
    if(w && !w.partial && w.days){
      const full = []; for(let i = 0; i < 7; i++){ const d = ymdAdd(mon, i); if(d > today) break; const x = w.days[d]; if(x && x.n && !x.open) full.push(DAYN[i]); }
      if(full.length) lines.push('Every visit on ' + joinAnd(full) + ' had a caregiver');
    }
    try{
      const k = await sb.from('kind_words').select('id', { count:'exact', head:true }).eq('status', 'kind').gte('created_at', mon + 'T05:00:00Z');
      if(!k.error && k.count) lines.push(Words(k.count) + ' kind word' + (k.count === 1 ? '' : 's') + ' came in');
    }catch(e){}
    if(w && w.hours) lines.push(fmtH(w.hours) + ' hours of care with a caregiver');
    return lines;
  }
  async function fridayWins(force){
    const show = force || winsWindow();
    let el = document.getElementById('funWins');
    if(!show){ if(el) el.remove(); return; }
    const lines = await winsLines();
    if(!lines.length){ if(el) el.remove(); return; }
    el = dashSlot('funWins'); if(!el) return; css();
    el.className = 'fun-wins';
    el.innerHTML = '<svg viewBox="0 0 84 84" width="72" height="72" aria-hidden="true"><circle cx="42" cy="42" r="38" fill="#fff" stroke="' + N + '" stroke-width="2.4"/><path d="M42 14 l6.6 13.4 14.8 2.2 -10.7 10.4 2.5 14.7 -13.2 -6.9 -13.2 6.9 2.5 -14.7 -10.7 -10.4 14.8 -2.2 Z" fill="' + H + '" stroke="' + N + '" stroke-width="1.8"/><text x="42" y="72" text-anchor="middle" font-family="inherit" font-weight="800" font-size="10" fill="' + N + '">THIS WEEK</text></svg>'
      + '<div><b class="h">This week at Caring Companions</b><ul>' + lines.map(l => '<li>' + esc(l) + '</li>').join('') + '</ul></div>';
  }

  /* ── 4. hiring as a garden ── */
  function garden(){
    const list = document.getElementById('apList'); if(!list || typeof AP_ROWS === 'undefined' || typeof apStageNow !== 'function') return;
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const n = [0, 0, 0, 0];
    (AP_ROWS || []).forEach(r => {
      if(!r || String(r.created_at || '') < since) return;
      if(['declined', 'pool', 'left'].includes(r.status)) return;
      const s = apStageNow(r, (typeof AP_BOOK !== 'undefined' && AP_BOOK[r.id]) || null); if(s >= 0 && s <= 3) n[s]++;
    });
    css();
    let el = document.getElementById('funGarden');
    if(!el){ el = document.createElement('div'); el.id = 'funGarden'; el.className = 'fun-garden'; list.insertAdjacentElement('beforebegin', el); }
    const X = [70, 210, 350, 490], bedW = 120;
    const plant = (i, k) => {   /* up to 5 plants per bed; more is shown as the number */
      const x = X[i] - 40 + k * 20, top = [0, 22, 38, 52][i];
      if(i === 0) return '<ellipse cx="' + x + '" cy="' + (121 + (k % 2) * 3) + '" rx="5" ry="3.5" fill="#7A4A1F"/>';
      let g = '<line x1="' + x + '" y1="122" x2="' + x + '" y2="' + (122 - top - (k % 2) * 4) + '" stroke="' + T + '" stroke-width="3"/>';
      const y = 122 - top - (k % 2) * 4;
      if(i === 1) g += '<path d="M' + x + ' ' + (y + 6) + ' q ' + (k % 2 ? 12 : -12) + ' -2 ' + (k % 2 ? 14 : -14) + ' -12 q ' + (k % 2 ? -11 : 11) + ' 1 ' + (k % 2 ? -14 : 14) + ' 12 Z" fill="' + M + '" stroke="' + N + '" stroke-width="1.3"/>';
      if(i === 2) g += '<ellipse cx="' + x + '" cy="' + (y - 4) + '" rx="5" ry="7" fill="#F6C7D4" stroke="' + N + '" stroke-width="1.4"/>';
      if(i === 3) g += '<circle cx="' + x + '" cy="' + (y - 4) + '" r="9" fill="' + H + '" stroke="' + N + '" stroke-width="1.4"/><circle cx="' + x + '" cy="' + (y - 4) + '" r="3" fill="' + N + '"/>';
      return g;
    };
    const LBL = ['Applied', 'Interview', 'Offered', 'Working'], GO = ['new', 'booked', 'starting', null];
    let h = '<svg viewBox="0 0 560 170" role="img" aria-label="Applicants in the last 30 days: ' + LBL.map((l, i) => l + ' ' + n[i]).join(', ') + '"><rect width="560" height="170" rx="12" fill="' + P + '"/><circle cx="530" cy="30" r="14" fill="' + H + '" opacity=".7"/>'
      + '<rect x="0" y="122" width="560" height="48" fill="' + L + '"/><path d="M0 122 Q 280 114 560 122" fill="none" stroke="' + N + '" stroke-width="2"/>';
    for(let i = 0; i < 4; i++){
      const shown = Math.min(5, n[i]);
      h += '<g class="fun-bed"' + (GO[i] ? ' onclick="apSetFilter(\'' + GO[i] + '\')"' : '') + '><title>' + esc(LBL[i] + ': ' + n[i] + (GO[i] ? '. Click to see them.' : '')) + '</title><rect x="' + (X[i] - bedW / 2) + '" y="20" width="' + bedW + '" height="150" fill="transparent"/>';
      for(let k = 0; k < shown; k++) h += plant(i, k);
      if(!n[i]) h += '<text x="' + X[i] + '" y="112" text-anchor="middle" font-size="11" fill="#8a978f">empty</text>';
      h += '<text x="' + X[i] + '" y="152" text-anchor="middle" font-size="12.5" font-weight="700" fill="#55677a">' + LBL[i] + ' · ' + n[i] + '</text></g>';
    }
    el.innerHTML = h + '</svg><div class="field-note" style="margin-top:4px;">The last 30 days. Seeds have applied, sprouts have an interview, buds have an offer, blooms are working. Click a bed to see those people.</div>';
  }

  /* ── 5. client anniversaries ── */
  async function clientAnniv(){
    let el = document.getElementById('funClientAnniv');
    if(settings().client_anniversaries_live !== true || !window.SEA || !SEA.annivIn){ if(el) el.remove(); return; }
    const cen = await census();
    const today = chiDay(), mon = monday(today), sun = ymdAdd(mon, 6);
    const rows = ((cen && cen.clients) || []).filter(c => c.active !== false && c.start_date).map(c => {
      const a = SEA.annivIn(c.start_date, mon, sun); return a ? { id:c.id, name:nameOf(c), day:a.day, years:a.years, start:String(c.start_date).slice(0, 10) } : null;
    }).filter(Boolean).sort((a, b) => a.day.localeCompare(b.day) || a.name.localeCompare(b.name));
    if(!rows.length){ if(el) el.remove(); return; }
    el = dashSlot('funClientAnniv'); if(!el) return; css();
    el.className = 'card fun-card';
    el.innerHTML = '<div class="fun-card-h">Client anniversaries this week</div>' + rows.map(r => '<div class="fun-row"><div class="fun-av">' + esc(r.name.split(/\s+/).map(p => p[0] || '').join('').slice(0, 2).toUpperCase()) + '</div>'
      + '<div style="flex:1;min-width:0;"><b style="color:var(--navy);">' + esc(r.name) + '</b> · ' + r.years + ' year' + (r.years === 1 ? '' : 's') + ' with Caring Companions'
      + '<div class="field-note">' + esc(new Date(r.day + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long' })) + ' · started ' + esc(new Date(r.start + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })) + '</div></div></div>').join('')
      + '<div class="field-note" style="padding:8px 16px 12px;">A nice reason for a card or a call. Nothing goes to the family on its own.</div>';
  }

  function onDashboard(){ [dashMini, sunshine, fridayWins, clientAnniv].forEach(f => { try{ Promise.resolve(f()).catch(e => console.warn('fun', e)); }catch(e){ console.warn('fun', e); } }); }
  window.FUN = { onDashboard, dashMini, sunshine, fridayWins, winsLines, winsWindow, garden, clientAnniv, bestRun,
    _reset(){ CEN = { at:0, d:null }; RUN = { at:0, d:null }; } };
})();
