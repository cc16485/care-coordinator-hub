/* Client Goals (2026-10-18, Samantha: "make a really fun and interactive client goals for Caring Companions and make it a tab
   on My Work. I want owners to be able to make a goal for number of weekly hours and number of CDS consumers").
   Two goals, one card each:
   · Weekly care hours: the hours of visits WITH a caregiver on the AxisCare calendar this week (Monday to Sunday, Chicago), read through
     coverage-shifts {live_schedule, start, end}, the same read the Live Schedule week view uses. Drawn as a trail up a hill
     with a flag at the goal, plus the last six weeks as bars.
   · CDS consumers: CDS lives in its own hub and database, which the CC Hub cannot read, so the count is kept here by the
     owners (+1 when someone starts, -1 when someone leaves). Drawn as a street of houses, one per consumer in the goal.
   Saved in app_data cc_goals (already a registered key), rows 'client_hours' and 'cds_consumers', next to the Dashboard's
   'main' row. Only Samantha or Zachary (owner_admin) can set a goal or change the count; everyone else sees it.
   Nothing here texts, emails or routes anything. */
(function(){
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const CG = { weeks:{}, loading:false, err:'', at:0, edit:null, draft:null, partial:'' };
  const WEEKS_BACK = 5;

  /* ── dates (Chicago calendar days, whatever the computer's clock says) ── */
  function chiToday(){ return new Date().toLocaleString('sv-SE', { timeZone:'America/Chicago' }).slice(0, 10); }
  function ymdAdd(ymd, n){ const [y, m, d] = String(ymd).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); }
  function weekStart(ymd){ const [y, m, d] = String(ymd).split('-').map(Number); const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; return ymdAdd(ymd, -dow); }
  function short(ymd){ return new Date(ymd + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' }); }
  function longDay(ymd){ return new Date(ymd + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }); }

  /* ── hours from the visit rows ── */
  function visitHours(v){
    const a = /^(\d\d):(\d\d)$/.exec(String(v && v.time || '')), z = /^(\d\d):(\d\d)$/.exec(String(v && v.end || ''));
    if(!a || !z) return 0;
    let mins = (Number(z[1]) * 60 + Number(z[2])) - (Number(a[1]) * 60 + Number(a[2]));
    if(mins <= 0) mins += 24 * 60;            // an overnight visit ends the next morning
    return mins / 60;
  }
  /* 2026-10-18 (first look at real numbers): hours counts only visits WITH a caregiver. A visit nobody was ever put on
     is not care given, so it no longer counts toward the goal; it shows on its own line ("booked with nobody yet"). */
  function summarize(rows){
    const s = { hours:0, booked:0, worked:0, open:0, visits:0, clients:0, days:{} };
    const clients = new Set();
    (rows || []).forEach(v => {
      const h = visitHours(v); if(!h) return;
      /* each day's visits and how many had nobody (the Dashboard's sunshine reads this) */
      const dy = String(v.date || '').slice(0, 10); if(dy){ const x = s.days[dy] = s.days[dy] || { n:0, open:0 }; x.n++; if(!v.caregiver) x.open++; }
      s.booked += h;
      if(!v.caregiver){ s.open += h; return; }
      s.visits++; s.hours += h;
      if(v.clock_out) s.worked += h;
      clients.add(v.client_id || v.client || '?');
    });
    s.clients = clients.size;
    ['hours', 'booked', 'worked', 'open'].forEach(k => { s[k] = Math.round(s[k] * 10) / 10; });
    return s;
  }

  /* ── the saved goals ── */
  /* DATA is the Hub's own top-level `let`, not a window property, so it is reached by name */
  function hubData(){ try{ return typeof DATA === 'object' && DATA ? DATA : null; }catch(e){ return null; } }
  function row(id){ const D = hubData(); return (D && D.cc_goals || []).find(x => x && x.id === id) || null; }
  function amOwner(){ try{ return typeof ccIsOwner === 'function' && ccIsOwner(); }catch(e){ return false; } }
  function myName(){ try{ return (ME && (ME.name || ME.email)) || 'Someone'; }catch(e){ return 'Someone'; } }
  function myEmail(){ try{ return (ME && ME.email) || ''; }catch(e){ return ''; } }
  function first(n){ return String(n || '').trim().split(/\s+/)[0] || 'Someone'; }
  async function save(item){
    if(!hubData()){ cgSay('Not saved: the Hub has not finished loading. Try again in a moment.'); return false; }
    DATA.cc_goals = (DATA.cc_goals || []).filter(x => x && x.id !== item.id).concat([item]);
    try{ await persist('cc_goals', item); }
    catch(e){ cgSay('Not saved: ' + (e && e.message || e)); return false; }
    return true;
  }
  function audit(summary){ try{ if(typeof opEvent === 'function') opEvent('setting_changed', { item_id:'cc_goals', area:'goals', summary }); }catch(e){} }
  function cgSay(m){ try{ if(typeof ccToast === 'function') ccToast(m); else alert(m); }catch(e){} }

  /* ── reading the weeks from AxisCare ── */
  async function readWeek(start){
    const { data:{ session } } = await sb.auth.getSession();
    if(!session || !session.access_token) throw new Error('sign in to the Hub again');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/coverage-shifts', { method:'POST',
      headers:{ Authorization:'Bearer ' + session.access_token, apikey:CONFIG.supabase_anon_key, 'Content-Type':'application/json' },
      body:JSON.stringify({ live_schedule:true, start, end:ymdAdd(start, 6) }) });
    const d = await r.json().catch(() => null);
    if(!r.ok || !d || d.error) throw new Error((d && d.error) || ('AxisCare answered ' + r.status));
    return Object.assign(summarize(d.rows), { start, partial:d.partial || '' });
  }
  function cacheGet(start){ try{ const x = JSON.parse(localStorage.getItem('cch_cgo2_wk_' + start) || 'null'); return x && Date.now() - x.at < 12 * 3600000 ? x.s : null; }catch(e){ return null; } }
  function cachePut(start, s){ try{ localStorage.setItem('cch_cgo2_wk_' + start, JSON.stringify({ at:Date.now(), s })); }catch(e){} }
  async function load(force){
    if(CG.loading) return;
    if(!force && CG.at && Date.now() - CG.at < 5 * 60000){ paint(); return; }
    CG.loading = true; CG.err = ''; paint();
    const now = weekStart(chiToday());
    try{ CG.weeks[now] = await readWeek(now); CG.at = Date.now(); }
    catch(e){ CG.err = String(e && e.message || e); }
    CG.loading = false; paint();
    /* the earlier weeks, one at a time so AxisCare is never asked for six weeks at once */
    for(let i = 1; i <= WEEKS_BACK; i++){
      const s = ymdAdd(now, -7 * i);
      if(!force && CG.weeks[s]) continue;
      const c = cacheGet(s);
      if(c && !force){ CG.weeks[s] = c; continue; }
      try{ CG.weeks[s] = await readWeek(s); cachePut(s, CG.weeks[s]); }
      catch(e){ CG.weeks[s] = { start:s, error:String(e && e.message || e) }; }
      paintBars();
    }
    paintBars();
  }

  /* ── words ── */
  function hoursCheer(p){
    if(p >= 100) return 'Summit! This week reached the goal.';
    if(p >= 75) return 'Almost at the top. A couple more families gets us there.';
    if(p >= 50) return 'Past halfway. The flag is in sight.';
    if(p >= 25) return 'Base camp reached. Keep climbing.';
    return 'Every climb starts at the bottom of the hill.';
  }
  function cdsCheer(p){
    if(p >= 100) return 'Every house on the street has its lights on.';
    if(p >= 75) return 'The street is filling up. Just a few dark windows left.';
    if(p >= 50) return 'Half the street is lit.';
    if(p >= 25) return 'The neighborhood is growing.';
    return 'Every new consumer turns on another light.';
  }
  const fmtH = n => (Math.round(n * 10) / 10).toLocaleString('en-US');
  function weeksLeft(by){ if(!by) return null; const d = Math.ceil((new Date(by + 'T12:00:00') - new Date(chiToday() + 'T12:00:00')) / (7 * 864e5)); return d; }
  function monthsLeft(by){ if(!by) return null; const ms = new Date(by + 'T12:00:00') - new Date(chiToday() + 'T12:00:00'); return ms / (30.4 * 864e5); }

  /* ── the hill trail ── */
  const TRAIL = 'M 24 196 C 90 196 104 150 160 146 S 236 168 268 120 S 330 70 372 74 S 430 40 452 34';
  function trailSvg(p){
    const pc = Math.max(0, Math.min(100, p));
    const ms = [25, 50, 75].map(m => '<g class="cgo-ms' + (pc >= m ? ' on' : '') + '" data-at="' + m + '"><line x1="0" y1="0" x2="0" y2="-20" stroke="#0D365F" stroke-width="1.6"/>'
      + '<path d="M0 -20 L13 -16 L0 -12 Z" fill="' + (pc >= m ? '#F0A63A' : '#fff') + '" stroke="#0D365F" stroke-width="1.2"/></g>').join('');
    return '<svg class="cgo-trail" viewBox="0 0 480 220" role="img" aria-label="Trail to the goal, ' + Math.round(pc) + ' percent of the way">'
      + '<defs><linearGradient id="cgoSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF4F6"/><stop offset="1" stop-color="#faf9f6"/></linearGradient></defs>'
      + '<rect x="0" y="0" width="480" height="220" rx="14" fill="url(#cgoSky)"/>'
      + '<circle cx="404" cy="44" r="18" fill="#F0A63A" opacity="' + (pc >= 100 ? 1 : .45) + '"/>'
      + '<path d="M0 220 L0 160 Q 90 120 170 150 T 330 110 Q 400 60 480 20 L480 220 Z" fill="#CADDD9"/>'
      + '<path d="M0 220 L0 196 Q 120 176 220 200 T 480 170 L480 220 Z" fill="#8FD1C7" opacity=".55"/>'
      + '<path d="' + TRAIL + '" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/>'
      + '<path d="' + TRAIL + '" fill="none" stroke="#0D365F" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round" opacity=".45"/>'
      + '<path class="cgo-done" d="' + TRAIL + '" pathLength="100" fill="none" stroke="#0F7A73" stroke-width="7" stroke-linecap="round" stroke-dasharray="0 100" data-pc="' + pc + '"/>'
      + ms
      + '<g class="cgo-summit" transform="translate(452 34)"><line x1="0" y1="0" x2="0" y2="-28" stroke="#0D365F" stroke-width="2"/>'
      + '<path d="M0 -28 L22 -22 L0 -15 Z" fill="' + (pc >= 100 ? '#F0A63A' : '#0F7A73') + '" stroke="#0D365F" stroke-width="1.4"/></g>'
      + '<g class="cgo-walker"><circle r="11" fill="#fff" stroke="#0D365F" stroke-width="2"/>'
      + '<path d="M0 5 C -7 0 -7 -6 -3.4 -6 C -1.4 -6 0 -4.4 0 -3.2 C 0 -4.4 1.4 -6 3.4 -6 C 7 -6 7 0 0 5 Z" fill="#F0A63A" stroke="#0D365F" stroke-width="1"/></g>'
      + '</svg>';
  }
  /* put the walker and the milestone flags on the trail, then let the teal line grow to them */
  function placeTrail(box){
    const svg = box && box.querySelector('.cgo-trail'); if(!svg) return;
    const done = svg.querySelector('.cgo-done'), pc = Number(done.getAttribute('data-pc')) || 0;
    const ref = svg.querySelector('path[d="' + TRAIL + '"]');
    let L = 0; try{ L = ref.getTotalLength(); }catch(e){}
    const at = f => { try{ return ref.getPointAtLength(L * f); }catch(e){ return { x:24, y:196 }; } };
    svg.querySelectorAll('.cgo-ms').forEach(g => { const p = at(Number(g.getAttribute('data-at')) / 100); g.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ')'); });
    const walker = svg.querySelector('.cgo-walker');
    const still = reduceMotion();
    const go = f => { const p = at(f); walker.setAttribute('transform', 'translate(' + p.x + ' ' + (p.y - 12) + ')'); done.setAttribute('stroke-dasharray', (f * 100) + ' 100'); };
    if(still || !pc){ go(pc / 100); return; }
    go(0);
    const t0 = performance.now(), dur = 1100;
    const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); go(e * pc / 100); if(k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function reduceMotion(){ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }

  /* ── stepping-stone goals (2026-10-18, her "can i set a second goal with a second due date", then "please do 2") ──
     A card holds up to six goals, each a number and an optional date, saved as row.steps. The card climbs toward the NEXT
     one; a goal already reached gets a stamp with when; a goal whose date passed without reaching it says so quietly.
     row.goal / row.by keep the next goal too, so anything reading the old fields still sees the one that matters. */
  const MAX_STEPS = 6;
  function stepsOf(g){
    const raw = g && Array.isArray(g.steps) && g.steps.length ? g.steps : (g && Number(g.goal) ? [{ goal:Number(g.goal), by:g.by || null }] : []);
    return raw.map(x => ({ goal:Math.round(Number(x.goal)) || 0, by:x.by || null })).filter(x => x.goal > 0)
      .sort((a, b) => String(a.by || '9999-99-99').localeCompare(String(b.by || '9999-99-99')) || a.goal - b.goal);
  }
  /* hours: a goal counts as reached in the best week we have (this week or the five before); the CDS count reaches it now */
  function bestWeek(){ return Object.values(CG.weeks).filter(w => w && !w.error).reduce((b, w) => !b || w.hours > b.hours ? w : b, null); }
  function plan(kind, g){
    const steps = stepsOf(g), today = chiToday();
    const best = kind === 'client_hours' ? bestWeek() : null;
    const val = kind === 'client_hours' ? (best ? best.hours : 0) : (Number(g && g.count) || 0);
    const list = steps.map(s => {
      const reached = val >= s.goal;
      const when = reached ? (kind === 'client_hours' ? 'the week of ' + short(Object.values(CG.weeks).filter(w => w && !w.error && w.hours >= s.goal).sort((a, b) => a.start.localeCompare(b.start))[0].start) : '') : '';
      return Object.assign({}, s, { reached, when, missed:!reached && s.by && s.by < today });
    });
    const next = list.find(s => !s.reached && !s.missed) || list.find(s => !s.reached) || list[list.length - 1] || null;
    return { list, next, goal:next ? next.goal : 0, by:next ? next.by : null };
  }
  function stepsHtml(kind, P, now){
    if(P.list.length < 2 && !(P.list[0] && (P.list[0].missed))) return '';
    const unit = kind === 'client_hours' ? ' hours' : '';
    return '<div class="cgo-steps">' + P.list.map(s => {
      const n = (kind === 'client_hours' ? fmtH(s.goal) : s.goal) + unit, by = s.by ? ' by ' + short(s.by) : '';
      if(s === P.next && !s.reached) return '<span class="cgo-step next"><b>Next:</b> ' + esc(n + by) + '</span>';
      if(s.reached) return '<span class="cgo-step done">' + stampSvg() + esc(n) + ' reached' + (s.when ? ' ' + esc(s.when) : '') + '</span>';
      if(s.missed) return '<span class="cgo-step missed">' + esc(short(s.by)) + ' goal: ' + esc((kind === 'client_hours' ? fmtH(now) : now) + ' of ' + n) + '</span>';
      return '<span class="cgo-step later">Then ' + esc(n + by) + '</span>';
    }).join('') + '</div>';
  }
  function stampSvg(){ return '<svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="#fff" stroke="#0F7A73" stroke-width="2"/><path d="M6 10.5 l2.6 2.6 5.4-5.6" fill="none" stroke="#0F7A73" stroke-width="2.2" stroke-linecap="round"/></svg>'; }

  /* ── the last six weeks ── */
  function barsSvg(goal, others){
    const now = weekStart(chiToday());
    const list = []; for(let i = WEEKS_BACK; i >= 0; i--) list.push(ymdAdd(now, -7 * i));
    const vals = list.map(s => CG.weeks[s]);
    const top = Math.max(goal || 0, ...(others || []), ...vals.map(w => w && w.hours || 0), 1) * 1.12;
    const W = 480, H = 150, base = 120, bw = 52, gap = (W - 40 - bw * list.length) / (list.length - 1);
    const y = v => base - (v / top) * (base - 14);
    let h = '<svg class="cgo-bars" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Hours with a caregiver, the last six weeks">'
      + '<defs><pattern id="cgoStripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#0F7A73"/><rect width="3" height="8" fill="#13968D"/></pattern></defs>';
    (others || []).filter(o => o !== goal).forEach(o => { const oy = y(o); h += '<line x1="12" x2="' + (W - 12) + '" y1="' + oy + '" y2="' + oy + '" stroke="#C17A12" stroke-width="1" stroke-dasharray="2 5" opacity=".55"/>'
      + '<text x="12" y="' + (oy - 4) + '" font-size="10" fill="#C17A12" opacity=".8">' + fmtH(o) + '</text>'; });
    list.forEach((s, i) => {
      const w = vals[i], x = 20 + i * (bw + gap), cur = i === list.length - 1;
      const hit = w && !w.error && goal && w.hours >= goal;
      if(!w){ h += '<rect x="' + x + '" y="' + (base - 18) + '" width="' + bw + '" height="18" rx="6" fill="#EEF2F5" class="cgo-wait"/>'; }
      else if(w.error){ h += '<text x="' + (x + bw / 2) + '" y="' + (base - 6) + '" text-anchor="middle" font-size="11" fill="#B23B3B">not read</text>'; }
      else {
        const yy = y(w.hours);
        h += '<rect x="' + x + '" y="' + yy + '" width="' + bw + '" height="' + Math.max(2, base - yy) + '" rx="7" fill="' + (cur ? 'url(#cgoStripe)' : hit ? '#0F7A73' : '#9FC4C9') + '"><title>' + esc('Week of ' + short(s) + ': ' + fmtH(w.hours) + ' hours with a caregiver, ' + fmtH(w.worked) + ' worked' + (w.open ? ', ' + fmtH(w.open) + ' booked with nobody' : '')) + '</title></rect>'
          + '<text x="' + (x + bw / 2) + '" y="' + (yy - 6) + '" text-anchor="middle" font-size="12" font-weight="800" fill="#0D365F">' + Math.round(w.hours) + '</text>';
        if(hit) h += starAt(x + bw / 2, yy - 26);
      }
      h += '<text x="' + (x + bw / 2) + '" y="' + (base + 16) + '" text-anchor="middle" font-size="11" fill="#55677a"' + (cur ? ' font-weight="800"' : '') + '>' + (cur ? 'This week' : esc(short(s))) + '</text>';
    });
    if(goal){ const gy = y(goal); h += '<line x1="12" x2="' + (W - 12) + '" y1="' + gy + '" y2="' + gy + '" stroke="#C17A12" stroke-width="2" stroke-dasharray="6 5"/>'
      + '<text x="' + (W - 12) + '" y="' + (gy - 5) + '" text-anchor="end" font-size="11" font-weight="800" fill="#C17A12">Goal ' + fmtH(goal) + '</text>'; }
    return h + '</svg>';
  }
  function starAt(cx, cy){
    const pts = []; for(let i = 0; i < 10; i++){ const r = i % 2 ? 4 : 9, a = -Math.PI / 2 + i * Math.PI / 5; pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1)); }
    return '<polygon points="' + pts.join(' ') + '" fill="#F0A63A" stroke="#0D365F" stroke-width="1.1"/>';
  }
  function streak(goal){
    if(!goal) return 0;
    const now = weekStart(chiToday()); let n = 0;
    for(let i = 1; i <= WEEKS_BACK; i++){ const w = CG.weeks[ymdAdd(now, -7 * i)]; if(w && !w.error && w.hours >= goal) n++; else break; }
    return n;
  }
  function paintBars(){
    const box = document.getElementById('cgoBars'); if(!box) return;
    const P = plan('client_hours', row('client_hours')), goal = P.goal;
    /* an older week just showed a goal was already reached, so the next goal changed: redraw the whole card once */
    if(CG.shownGoal != null && goal !== CG.shownGoal){ CG.shownGoal = goal; paint(); return; }
    box.innerHTML = barsSvg(goal, P.list.map(s => s.goal));
    const st = document.getElementById('cgoStreak'); if(!st) return;
    const n = streak(goal), past = Object.values(CG.weeks).filter(w => w && !w.error && w.start !== weekStart(chiToday()));
    const best = past.reduce((b, w) => !b || w.hours > b.hours ? w : b, null);
    st.innerHTML = (n ? '<span class="cgo-chip hot">' + n + ' week' + (n === 1 ? '' : 's') + ' in a row at the goal</span>' : '')
      + (best ? '<span class="cgo-chip">Best recent week: ' + fmtH(best.hours) + ' hrs (' + esc(short(best.start)) + ')</span>' : '');
    const sb = document.getElementById('cgoStepsH'); if(sb){ const w = CG.weeks[weekStart(chiToday())]; sb.innerHTML = stepsHtml('client_hours', P, w ? w.hours : 0); }
  }

  /* ── the street of houses: houses to the next goal, the later goals' houses fainter down the block ── */
  function house(lit, extra, later){
    return '<svg class="cgo-house' + (lit ? ' lit' : '') + (extra ? ' extra' : '') + (later ? ' later' : '') + '" viewBox="0 0 40 40" aria-hidden="true">'
      + '<path d="M5 19 L20 6 L35 19" fill="' + (lit ? '#0F7A73' : 'none') + '" stroke="#0D365F" stroke-width="2" stroke-linejoin="round"' + (lit ? '' : ' stroke-dasharray="3 3"') + '/>'
      + '<rect x="9" y="18" width="22" height="17" rx="1.5" fill="' + (lit ? '#fff' : 'none') + '" stroke="#0D365F" stroke-width="2"' + (lit ? '' : ' stroke-dasharray="3 3"') + '/>'
      + (lit ? '<rect x="12.5" y="21.5" width="6" height="6" rx="1" fill="#F0A63A"/><rect x="22" y="25" width="5.5" height="10" rx="1" fill="#0D365F"/>' : '')
      + (extra ? '<circle cx="33" cy="8" r="5" fill="#F0A63A" stroke="#0D365F" stroke-width="1.2"/>' : '')
      + '</svg>';
  }
  function streetHtml(count, goal, maxGoal){
    const top = Math.max(goal, maxGoal || 0), show = Math.max(top, count), cap = 60;
    let h = '';
    for(let i = 0; i < Math.min(show, cap); i++) h += house(i < count, i >= top && top > 0, i >= goal && i < top && i >= count);
    if(show > cap) h += '<span class="cgo-more">+' + (show - cap) + '</span>';
    return h || '<div class="field-note">No houses yet. Set a goal to draw the street.</div>';
  }

  /* ── confetti, for a goal reached or a new consumer ── */
  function burst(el, n){
    if(!el || reduceMotion()) return;
    const r = el.getBoundingClientRect(), cols = ['#0D365F', '#0F7A73', '#F0A63A', '#8FD1C7', '#C17A12'];
    for(let i = 0; i < (n || 26); i++){
      const s = document.createElement('i'); s.className = 'cgo-bit';
      s.style.left = (r.left + r.width / 2) + 'px'; s.style.top = (r.top + r.height / 2) + 'px';
      s.style.background = cols[i % cols.length];
      s.style.setProperty('--dx', (Math.random() * 260 - 130) + 'px'); s.style.setProperty('--dy', (-60 - Math.random() * 170) + 'px');
      s.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      document.body.appendChild(s); setTimeout(() => s.remove(), 1400);
    }
  }

  /* ── cards ── */
  function setBy(g){ return g && g.set_by_name ? 'Set by ' + esc(first(g.set_by_name)) + (g.set_at ? ' on ' + esc(short(String(g.set_at).slice(0, 10))) : '') : ''; }
  /* the editor works on a draft (CG.draft) so a row being typed survives the week loading underneath it */
  function editorHtml(kind){
    const hrs = kind === 'client_hours', max = hrs ? 2000 : 200, d = CG.draft || [];
    return '<div class="cgo-edit" id="cgoEdit_' + kind + '">'
      + '<div class="cgo-edit-h">' + (hrs ? 'Weekly care hours goals' : 'CDS consumers goals') + '</div>'
      + '<div class="field-note" style="margin:-4px 0 8px;">One goal, or a few with their own dates. The card climbs toward the next one.</div>'
      + d.map((x, i) => '<div class="cgo-edit-step">'
        + '<div class="cgo-edit-row"><input type="range" id="cgoRange_' + kind + '_' + i + '" aria-label="Goal ' + (i + 1) + '" min="' + (hrs ? 10 : 1) + '" max="' + max + '" step="' + (hrs ? 10 : 1) + '" value="' + esc(x.goal) + '" oninput="cgoDraft(\'' + kind + '\',' + i + ',\'goal\',this.value)">'
        + '<input type="number" id="cgoNum_' + kind + '_' + i + '" aria-label="Goal ' + (i + 1) + '" min="1" max="' + (max * 5) + '" value="' + esc(x.goal) + '" oninput="cgoDraft(\'' + kind + '\',' + i + ',\'goal\',this.value)"><span class="field-note">' + (hrs ? 'hours a week' : 'consumers') + '</span></div>'
        + '<label class="cgo-edit-by">by <input type="date" id="cgoBy_' + kind + '_' + i + '" value="' + esc(x.by || '') + '" oninput="cgoDraft(\'' + kind + '\',' + i + ',\'by\',this.value)"> <span class="field-note">(optional)</span>'
        + (d.length > 1 ? '<button class="linklike" type="button" onclick="cgoDraftRemove(\'' + kind + '\',' + i + ')">Remove</button>' : '') + '</label></div>').join('')
      + (d.length < MAX_STEPS ? '<button class="linklike" type="button" onclick="cgoDraftAdd(\'' + kind + '\')">+ Add another goal</button>' : '')
      + '<div class="cgo-edit-btns"><button class="primary" onclick="cgoSaveGoal(\'' + kind + '\')">Save ' + (d.length > 1 ? 'goals' : 'goal') + '</button><button class="ghost" onclick="cgoEditGoal(null)">Cancel</button></div></div>';
  }
  function hoursCard(){
    const g = row('client_hours'), w = CG.weeks[weekStart(chiToday())];
    const P = plan('client_hours', g), goal = P.goal;
    CG.shownGoal = goal;
    const own = amOwner(), ws = weekStart(chiToday());
    let h = '<div class="cgo-card" id="cgoHours"><div class="cgo-head"><svg class="cgo-ic" aria-hidden="true"><use href="icons.svg#i-clock"/></svg>'
      + '<div><div class="cgo-title">Weekly care hours</div><div class="field-note">Visits with a caregiver on the AxisCare calendar, ' + esc(longDay(ws)) + ' to ' + esc(longDay(ymdAdd(ws, 6))) + '</div></div>'
      + '<span style="flex:1"></span>' + (own ? '<button class="ghost cgo-set" onclick="cgoEditGoal(\'client_hours\')">' + (goal ? 'Change goals' : 'Set a goal') + '</button>' : '') + '</div>';
    if(CG.edit === 'client_hours' && own) h += editorHtml('client_hours');
    if(CG.err && !w) return h + '<div class="cgo-err">Could not read this week from AxisCare: ' + esc(CG.err) + ' <button class="linklike" onclick="cgoLoad(true)">Try again</button></div></div>';
    if(!w) return h + '<div class="cgo-loading"><span class="cgo-dot"></span>Reading this week from AxisCare…</div></div>';
    const pc = goal ? w.hours / goal * 100 : 0;
    h += '<div class="cgo-big"><span class="cgo-num" data-to="' + w.hours + '">' + fmtH(w.hours) + '</span><span class="cgo-of">' + (goal ? ' of ' + fmtH(goal) + ' hours' : ' hours with a caregiver') + '</span>'
      + (goal ? '<span class="cgo-pct' + (pc >= 100 ? ' won' : '') + '">' + Math.round(pc) + '%</span>' : '') + '</div>';
    if(goal){
      h += '<div class="cgo-cheer">' + esc(hoursCheer(pc)) + '</div>' + trailSvg(pc);
      h += '<div class="cgo-ms-row">' + [[25, 'Base camp'], [50, 'Halfway'], [75, 'Almost there'], [100, 'Summit']].map(m => '<span class="cgo-chip' + (pc >= m[0] ? ' on' : '') + '">' + m[1] + '</span>').join('') + '</div>';
      const left = Math.max(0, goal - w.hours), avg = w.clients ? w.hours / w.clients : 0;
      if(left > 0) h += '<div class="cgo-togo"><b>' + fmtH(left) + ' hours to go.</b> '
        + (avg ? 'That is about <b>' + Math.max(1, Math.ceil(left / avg)) + ' more client' + (Math.ceil(left / avg) === 1 ? '' : 's') + '</b> at this week\'s average of ' + fmtH(avg) + ' hours each.' : '') + '</div>';
      else h += '<div class="cgo-togo won"><b>Goal reached!</b> ' + fmtH(w.hours - goal) + ' hours past the flag this week.</div>';
      const wl = weeksLeft(P.by);
      if(P.by) h += '<div class="field-note">' + (wl > 0 ? 'Aim: every week at ' + fmtH(goal) + ' by ' + esc(short(P.by)) + ' (' + wl + ' week' + (wl === 1 ? '' : 's') + ' from now).' : 'The goal date (' + esc(short(P.by)) + ') has arrived.') + '</div>';
      h += '<div id="cgoStepsH">' + stepsHtml('client_hours', P, w.hours) + '</div>';
    } else {
      h += '<div class="cgo-empty">' + (own ? 'No weekly hours goal yet. Set one and this card turns into a trail to the top.' : 'No weekly hours goal yet. Samantha or Zachary sets it.') + '</div>';
    }
    h += '<div class="cgo-facts"><span><b>' + fmtH(w.worked) + '</b> worked so far</span><span><b>' + w.clients + '</b> client' + (w.clients === 1 ? '' : 's') + '</span><span><b>' + w.visits + '</b> visits</span>'
      + (w.open ? '<span class="warn"><b>' + fmtH(w.open) + '</b> more hours booked with nobody yet (not counted)</span>' : '<span><b>Every</b> visit has a caregiver</span>') + '</div>';
    if(w.partial) h += '<div class="cgo-err">AxisCare sent only part of this week, so the real number is higher than this.</div>';
    h += '<div class="cgo-sub">The last six weeks</div><div id="cgoBars"></div><div class="cgo-streak" id="cgoStreak"></div>';
    h += '<div class="cgo-foot">' + setBy(g) + '<span style="flex:1"></span><button class="linklike" onclick="cgoLoad(true)">Refresh from AxisCare</button></div>';
    return h + '</div>';
  }
  function cdsCard(){
    const g = row('cds_consumers') || {}, count = Number(g.count) || 0, own = amOwner();
    const P = plan('cds_consumers', g), goal = P.goal, maxGoal = Math.max(0, ...P.list.map(s => s.goal));
    const pc = goal ? count / goal * 100 : 0;
    let h = '<div class="cgo-card" id="cgoCds"><div class="cgo-head"><svg class="cgo-ic" aria-hidden="true"><use href="icons.svg#i-home"/></svg>'
      + '<div><div class="cgo-title">CDS consumers</div><div class="field-note">Active consumers with Caring Companions CDS</div></div>'
      + '<span style="flex:1"></span>' + (own ? '<button class="ghost cgo-set" onclick="cgoEditGoal(\'cds_consumers\')">' + (goal ? 'Change goals' : 'Set a goal') + '</button>' : '') + '</div>';
    if(CG.edit === 'cds_consumers' && own) h += editorHtml('cds_consumers');
    h += '<div class="cgo-big"><span class="cgo-num">' + count + '</span><span class="cgo-of">' + (goal ? ' of ' + goal + ' consumers' : ' consumers') + '</span>'
      + (goal ? '<span class="cgo-pct' + (pc >= 100 ? ' won' : '') + '">' + Math.round(pc) + '%</span>' : '') + '</div>';
    if(goal) h += '<div class="cgo-cheer">' + esc(cdsCheer(pc)) + '</div>';
    if(goal || count || own) h += '<div class="cgo-street" id="cgoStreet">' + streetHtml(count, goal, maxGoal) + '</div>';
    if(goal){
      const left = Math.max(0, goal - count), ml = monthsLeft(P.by);
      h += left ? '<div class="cgo-togo"><b>' + left + ' more to go.</b>' + (P.by && ml > 0 ? ' By ' + esc(short(P.by)) + ', that is about <b>' + (Math.ceil(left / Math.max(ml, 1) * 10) / 10) + ' a month</b>.' : '') + '</div>'
        : '<div class="cgo-togo won"><b>Goal reached!</b>' + (count > goal ? ' ' + (count - goal) + ' past the goal.' : '') + '</div>';
      h += stepsHtml('cds_consumers', P, count);
    } else if(!own) h += '<div class="cgo-empty">No CDS goal yet. Samantha or Zachary sets it.</div>';
    if(own) h += '<div class="cgo-count"><button class="primary cgo-plus" onclick="cgoBump(1, this)">+1 New consumer</button><button class="ghost" onclick="cgoBump(-1, this)"' + (count ? '' : ' disabled') + '>-1 Left the program</button>'
      + '<button class="linklike" onclick="cgoSetCount()">Set the exact number</button></div>';
    const log = (g.log || []).slice(-4).reverse();
    if(log.length) h += '<div class="cgo-log">' + log.map(x => '<div>' + esc(first(x.by_name)) + ' ' + (x.set != null ? 'set the count to ' + x.count : x.delta > 0 ? 'added a new consumer' : 'marked one as left') + ' <span class="field-note">' + esc(short(String(x.at).slice(0, 10))) + ' · now ' + x.count + '</span></div>').join('') + '</div>';
    h += '<div class="cgo-foot">' + setBy(g) + '<span style="flex:1"></span><span class="field-note">The CDS Hub keeps the roster. ' + (own ? 'Update this count when someone starts or leaves.' : 'Samantha or Zachary keeps this count current.') + '</span></div>';
    return h + '</div>';
  }
  function paint(){
    const wrap = document.getElementById('cgoWrap'); if(!wrap) return;
    styles();
    /* a goal half typed in stays typed when the week finishes loading underneath it: the editor draws from CG.draft,
       which every keystroke updates, so only the focus needs putting back */
    const focus = document.activeElement && document.activeElement.id;
    wrap.innerHTML = '<div class="cgo-top"><div><h2 class="cgo-h">Client Goals</h2><div class="field-note">Where Caring Companions is headed, one week and one family at a time.</div></div></div>'
      + '<div class="cgo-grid">' + hoursCard() + cdsCard() + '</div>';
    if(focus && /^cgo(Num|Range|By)_/.test(focus)){ const f = document.getElementById(focus); if(f) f.focus(); }
    placeTrail(document.getElementById('cgoHours'));
    paintBars();
  }
  function styles(){
    if(document.getElementById('cgoCss')) return;
    const st = document.createElement('style'); st.id = 'cgoCss';
    st.textContent = `
#cgoWrap{max-width:1180px;}
.cgo-top{display:flex;align-items:flex-end;gap:12px;margin:2px 0 14px;}
.cgo-h{margin:0;font-size:24px;font-weight:800;letter-spacing:-.02em;color:var(--navy);}
.cgo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:16px;align-items:start;}
.cgo-card{background:#fff;border:1px solid var(--border);border-radius:16px;padding:18px 20px;box-shadow:0 1px 0 rgba(13,54,95,.04);}
.cgo-head{display:flex;gap:12px;align-items:center;margin-bottom:10px;}
.cgo-ic{width:34px;height:34px;flex:0 0 auto;}
.cgo-title{font-size:16.5px;font-weight:800;color:var(--navy);}
.cgo-set{font-size:12.5px;padding:6px 12px;}
.cgo-big{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin:4px 0 2px;}
.cgo-num{font-size:44px;font-weight:800;color:var(--navy);letter-spacing:-.03em;line-height:1;}
.cgo-of{font-size:15px;font-weight:700;color:#55677a;}
.cgo-pct{margin-left:auto;background:#EAF4F6;color:#14606F;font-weight:800;border-radius:999px;padding:4px 12px;font-size:14px;}
.cgo-pct.won{background:var(--gold);color:#3D2600;animation:cgoPulse 1.6s ease-in-out 2;}
.cgo-cheer{font-size:13.5px;font-weight:700;color:var(--gold-text);margin:2px 0 8px;}
.cgo-trail{width:100%;height:auto;display:block;border-radius:14px;}
.cgo-ms-row,.cgo-streak{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 6px;}
.cgo-chip{font-size:12px;font-weight:700;border-radius:999px;padding:4px 10px;background:#F3F1EB;color:#8a978f;border:1px solid transparent;}
.cgo-chip.on{background:#EAF4F6;color:#14606F;border-color:#CADDD9;}
.cgo-chip.hot{background:#FFF4E3;color:#8A4E0C;border-color:#F3D7A8;}
.cgo-togo{font-size:14px;color:var(--text);background:#faf9f6;border-radius:10px;padding:9px 12px;margin:8px 0;}
.cgo-togo.won{background:#FFF4E3;color:#5C3A06;}
.cgo-facts{display:flex;gap:6px 16px;flex-wrap:wrap;font-size:13px;color:#55677a;margin:10px 0 4px;}
.cgo-facts b{color:var(--navy);}
.cgo-facts .warn b,.cgo-facts .warn{color:#B23B3B;}
.cgo-sub{font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#55677a;margin:14px 0 4px;}
.cgo-bars{width:100%;height:auto;display:block;}
.cgo-wait{animation:cgoFade 1.2s ease-in-out infinite alternate;}
.cgo-foot{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:12px;color:#8a978f;border-top:1px solid var(--border);margin-top:12px;padding-top:10px;}
.cgo-empty{font-size:13.5px;color:#55677a;background:#faf9f6;border:1px dashed var(--border);border-radius:10px;padding:12px;margin:8px 0;}
.cgo-err{font-size:13px;color:#B23B3B;background:#FDECEC;border-radius:10px;padding:9px 12px;margin:8px 0;}
.cgo-loading{display:flex;gap:10px;align-items:center;font-size:13.5px;color:#55677a;padding:22px 4px;}
.cgo-dot{width:12px;height:12px;border-radius:50%;background:var(--teal);animation:cgoPulse 1s ease-in-out infinite;}
.cgo-street{display:flex;flex-wrap:wrap;gap:8px 4px;padding:12px;background:#EAF4F6;border-radius:14px;margin:6px 0 8px;min-height:60px;align-items:flex-end;}
.cgo-house{width:38px;height:38px;opacity:.55;transition:transform .25s;border-bottom:4px solid #CADDD9;padding-bottom:1px;}
.cgo-house.lit{opacity:1;}
.cgo-house.lit:hover{transform:translateY(-3px);}
.cgo-house.pop{animation:cgoPop .7s cubic-bezier(.2,1.6,.4,1);}
.cgo-more{font-weight:800;color:var(--navy);align-self:center;padding:0 6px;}
.cgo-count{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0;}
.cgo-count .primary,.cgo-count .ghost{font-size:14px;padding:9px 16px;}
.cgo-log{font-size:12.5px;color:var(--text);margin-top:6px;display:grid;gap:3px;}
.cgo-steps{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 4px;}
.cgo-step{display:inline-flex;gap:5px;align-items:center;font-size:12.5px;font-weight:700;border-radius:999px;padding:4px 10px;background:#F3F1EB;color:#55677a;}
.cgo-step.next{background:#FFF4E3;color:#5C3A06;border:1px solid #F3D7A8;}
.cgo-step.done{background:#EAF4F6;color:#14606F;}
.cgo-step.missed{background:#F3F1EB;color:#8a978f;font-weight:600;}
.cgo-step.later{background:#fff;border:1px dashed var(--border);}
.cgo-house.later{opacity:.28;}
.cgo-edit-step{border-bottom:1px dashed #CADDD9;padding:6px 0 2px;margin-bottom:6px;}
.cgo-edit{background:#EAF4F6;border:1px solid #CADDD9;border-radius:12px;padding:12px 14px;margin:6px 0 12px;}
.cgo-edit-h{font-weight:800;color:var(--navy);margin-bottom:8px;}
.cgo-edit-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.cgo-edit-row input[type=range]{flex:1;min-width:160px;accent-color:#0F7A73;}
.cgo-edit-row input[type=number]{width:100px;font-size:16px;font-weight:800;}
.cgo-edit-by{display:flex;gap:8px;align-items:center;font-size:13px;margin:10px 0;flex-wrap:wrap;}
.cgo-edit-by input{width:auto;}
.cgo-edit-btns{display:flex;gap:8px;}
.cgo-bit{position:fixed;width:8px;height:12px;border-radius:2px;z-index:9999;pointer-events:none;animation:cgoFly 1.3s cubic-bezier(.15,.7,.35,1) forwards;}
@keyframes cgoFly{0%{transform:translate(0,0) rotate(0);opacity:1}70%{opacity:1}100%{transform:translate(var(--dx),calc(var(--dy) + 220px)) rotate(var(--rot));opacity:0}}
@keyframes cgoPop{0%{transform:scale(.4)}100%{transform:scale(1)}}
@keyframes cgoPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@keyframes cgoFade{from{opacity:.4}to{opacity:1}}
@media (max-width:600px){.cgo-card{padding:14px;}.cgo-num{font-size:36px;}.cgo-house{width:32px;height:32px;}}
@media (prefers-reduced-motion:reduce){.cgo-pct.won,.cgo-dot,.cgo-wait,.cgo-house.pop{animation:none;}}
`;
    document.head.appendChild(st);
  }

  /* ── owner actions ── */
  function cgoEditGoal(kind){
    if(kind && !amOwner()){ cgSay('Only Samantha or Zachary can set a goal.'); return; }
    CG.edit = kind;
    if(kind){ const s = stepsOf(row(kind)); CG.draft = s.length ? s.map(x => ({ goal:String(x.goal), by:x.by || '' })) : [{ goal:kind === 'client_hours' ? '400' : '25', by:'' }]; }
    else CG.draft = null;
    paint();
    const n = kind && document.getElementById('cgoNum_' + kind + '_0'); if(n){ n.focus(); n.select(); }
  }
  /* typing in one box keeps its twin (slider or number) in step, without redrawing the card */
  function cgoDraft(kind, i, field, v){
    if(!CG.draft || !CG.draft[i]) return;
    CG.draft[i][field] = String(v);
    if(field === 'goal'){ const a = document.getElementById('cgoNum_' + kind + '_' + i), b = document.getElementById('cgoRange_' + kind + '_' + i); if(a && a.value !== String(v)) a.value = v; if(b && b.value !== String(v)) b.value = v; }
  }
  function cgoDraftAdd(kind){
    if(!CG.draft || CG.draft.length >= MAX_STEPS) return;
    const last = CG.draft[CG.draft.length - 1] || { goal:'0' }, bump = kind === 'client_hours' ? 100 : 5;
    CG.draft.push({ goal:String((Math.round(Number(last.goal)) || 0) + bump), by:'' }); paint();
    const n = document.getElementById('cgoNum_' + kind + '_' + (CG.draft.length - 1)); if(n){ n.focus(); n.select(); }
  }
  function cgoDraftRemove(kind, i){ if(!CG.draft || CG.draft.length < 2) return; CG.draft.splice(i, 1); paint(); }
  async function cgoSaveGoal(kind){
    if(!amOwner()){ cgSay('Only Samantha or Zachary can set a goal.'); return; }
    const d = CG.draft || [];
    const steps = [];
    for(const x of d){
      const v = Math.round(Number(String(x.goal).trim()));
      if(!String(x.goal).trim() || !Number.isFinite(v) || v < 1){ cgSay('Each goal needs to be a whole number above zero.'); return; }
      if(x.by && !/^\d{4}-\d\d-\d\d$/.test(x.by)){ cgSay('Pick each date from the calendar.'); return; }
      steps.push({ goal:v, by:x.by || null });
    }
    if(!steps.length){ cgSay('Add a goal first.'); return; }
    const old = row(kind) || { id:kind };
    const at = new Date().toISOString();
    const sorted = stepsOf({ steps });
    const draftItem = Object.assign({}, old, { steps:sorted });
    const P = plan(kind, draftItem);
    const words = sorted.map(s => (kind === 'client_hours' ? fmtH(s.goal) : s.goal) + (s.by ? ' by ' + s.by : '')).join(', then ');
    const item = Object.assign({}, old, { id:kind, steps:sorted, goal:P.goal, by:P.by || null, set_by:myEmail(), set_by_name:myName(), set_at:at,
      history:(old.history || []).concat([{ steps:sorted, goal:P.goal, by:P.by || null, at, by_email:myEmail() }]).slice(-20) });
    if(!(await save(item))) return;
    audit(myName() + ' set the ' + (kind === 'client_hours' ? 'weekly care hours' : 'CDS consumers') + ' goal' + (sorted.length > 1 ? 's' : '') + ' to ' + words + (old.goal ? ' (next was ' + old.goal + ')' : ''));
    CG.edit = null; CG.draft = null; paint();
    const now = kind === 'client_hours' ? ((CG.weeks[weekStart(chiToday())] || {}).hours || 0) : (Number(item.count) || 0);
    const reached = now >= P.goal;
    cgSay((sorted.length > 1 ? 'Goals saved.' : 'Goal saved.') + (reached ? ' And the next one is already reached!' : ''));
    if(reached) burst(document.querySelector('#' + (kind === 'client_hours' ? 'cgoHours' : 'cgoCds') + ' .cgo-pct'));
  }
  async function changeCount(next, delta, setExact, btn){
    if(!amOwner()){ cgSay('Only Samantha or Zachary can change the count.'); return; }
    const old = row('cds_consumers') || { id:'cds_consumers' };
    const before = Number(old.count) || 0, n = Math.max(0, next);
    if(n === before && !setExact) return;
    const at = new Date().toISOString();
    const entry = { at, by:myEmail(), by_name:myName(), count:n, delta:n - before }; if(setExact) entry.set = true;
    const goalBefore = plan('cds_consumers', old).goal;
    const item = Object.assign({}, old, { id:'cds_consumers', count:n, count_at:at, count_by:myEmail(), log:(old.log || []).concat([entry]).slice(-40) });
    const P = plan('cds_consumers', item);
    item.goal = P.goal || item.goal; item.by = P.goal ? P.by : item.by;
    if(!(await save(item))) return;
    audit(myName() + ' changed the CDS consumer count from ' + before + ' to ' + n);
    paint();
    if(n > before){
      const lit = document.querySelectorAll('#cgoStreet .cgo-house.lit'); const last = lit[n - 1];
      const hit = goalBefore && n >= goalBefore && before < goalBefore;
      if(last){ last.classList.add('pop'); burst(last, hit ? 60 : 22); }
      if(hit) cgSay('The CDS goal of ' + goalBefore + ' is reached!' + (P.goal > goalBefore ? ' Next: ' + P.goal + (P.by ? ' by ' + short(P.by) : '') + '.' : ' Every house on the street is lit.'));
    }
  }
  function cgoBump(d, btn){ const g = row('cds_consumers') || {}; return changeCount((Number(g.count) || 0) + d, d, false, btn); }
  async function cgoSetCount(){
    if(!amOwner()){ cgSay('Only Samantha or Zachary can change the count.'); return; }
    const g = row('cds_consumers') || {};
    const a = typeof ccPrompt === 'function' ? await ccPrompt('How many active CDS consumers are there right now?', String(Number(g.count) || 0)) : prompt('How many active CDS consumers are there right now?', String(Number(g.count) || 0));
    if(a === null || a === undefined) return;
    const n = Math.round(Number(String(a).trim()));
    if(!Number.isFinite(n) || n < 0){ cgSay('That needs to be a whole number, 0 or more.'); return; }
    return changeCount(n, 0, true);
  }
  function cgoOpen(){ paint(); load(false); }
  /* this week's numbers for other screens (the Dashboard's mini hill, sunshine and Friday wins), sharing the 5-minute read */
  let twBusy = null;
  async function thisWeek(){
    const now = weekStart(chiToday());
    if(CG.weeks[now] && !CG.weeks[now].error && CG.at && Date.now() - CG.at < 5 * 60000) return CG.weeks[now];
    if(twBusy) return twBusy;
    twBusy = (async () => { try{ CG.weeks[now] = await readWeek(now); CG.at = Date.now(); return CG.weeks[now]; }catch(e){ return null; } finally{ twBusy = null; } })();
    return twBusy;
  }

  Object.assign(window, { cgoOpen, cgoLoad:load, cgoEditGoal, cgoSaveGoal, cgoBump, cgoSetCount, cgoDraft, cgoDraftAdd, cgoDraftRemove,
    CGO:{ state:CG, visitHours, summarize, weekStart, hoursCheer, cdsCheer, streak, paint, stepsOf, plan, thisWeek, row } });
})();
