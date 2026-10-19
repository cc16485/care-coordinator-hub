/* Seasons and moments (2026-10-18, step 4 of fun across the Hub; her "Love it, build step 4 as shown", mockup
   https://claude.ai/artifact/QF6YYtziTPuoJMDGphCYBN). Two owner switches on the Owners Hub Admin page, both off to start:
   · ops_settings.seasons_live: the season by the Chicago calendar (autumn Sep-Nov, winter Dec-Feb, spring Mar-May, summer
     Jun-Aug). Leaves, snow, blossoms or summer sparkle drift across the top bar for one minute, the first time the Hub
     opens that day in this browser, then stop; and a small scene sits by the Dashboard greeting. The Dashboard's own
     words never change.
   · ops_settings.anniversaries_live: work anniversaries from the hire date in AxisCare (the caregiver census). An
     "Anniversaries this week" card on the Dashboard (Monday to Sunday), and a banner on the caregiver's page that week.
     Office staff are not in that census, so they are not listed (there is no hire date for them in the Hub).
   Nothing is sent to anyone. Only the Dashboard and a person's own page change. Still for reduced motion. */
(function(){
  const N = '#0D365F', T = '#0F7A73', H = '#F0A63A', M = '#8FD1C7';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const reduce = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
  const chiDay = () => new Date().toLocaleString('sv-SE', { timeZone:'America/Chicago' }).slice(0, 10);
  const settings = () => { try{ return (DATA && DATA.ops_settings) || {}; }catch(e){ return {}; } };
  const seasonsOn = () => settings().seasons_live === true;
  const annivOn = () => settings().anniversaries_live === true;
  function seasonOf(ymd){
    const m = Number(String(ymd || chiDay()).slice(5, 7));
    return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
  }
  const SEASON = {
    autumn:{ name:'Autumn', fx:'leaf', cols:['#F0A63A', '#C17A12', '#D9622B', '#8FD1C7'],
      svg:'<rect width="120" height="80" rx="10" fill="#FFF4E3"/><path d="M0 80 L0 58 Q 60 46 120 58 L120 80 Z" fill="#E7C27F"/><rect x="54" y="30" width="8" height="34" fill="#7A4A1F"/><circle cx="58" cy="26" r="20" fill="#D9622B"/><circle cx="44" cy="34" r="12" fill="#F0A63A"/><circle cx="72" cy="34" r="12" fill="#C17A12"/>' },
    winter:{ name:'Winter', fx:'flake', cols:['#ffffff'],
      svg:'<rect width="120" height="80" rx="10" fill="#EAF4F6"/><path d="M0 80 L0 60 Q 60 50 120 60 L120 80 Z" fill="#fff"/><path d="M26 66 L40 38 L54 66 Z" fill="' + T + '"/><path d="M66 66 L82 30 L98 66 Z" fill="' + T + '"/><path d="M76 44 L82 30 L88 44 Z" fill="#fff"/><g transform="translate(46 44)"><path d="M0 14 L12 4 L24 14" fill="' + N + '"/><rect x="3" y="13" width="18" height="12" fill="#fff" stroke="' + N + '" stroke-width="1.6"/><rect x="6" y="16" width="5" height="5" fill="' + H + '"/></g>' },
    spring:{ name:'Spring', fx:'petal', cols:['#F6C7D4', '#ffffff', '#F0A63A'],
      svg:'<rect width="120" height="80" rx="10" fill="#EAF4F6"/><path d="M0 80 L0 58 Q 60 48 120 58 L120 80 Z" fill="' + M + '"/>' + [24, 48, 72, 96].map((x, i) => '<line x1="' + x + '" y1="60" x2="' + x + '" y2="' + (40 - i * 2) + '" stroke="' + T + '" stroke-width="2.4"/><circle cx="' + x + '" cy="' + (38 - i * 2) + '" r="6" fill="' + ['#F6C7D4', H, '#F6C7D4', '#fff'][i] + '" stroke="' + N + '" stroke-width="1.4"/>').join('') },
    summer:{ name:'Summer', fx:'spark', cols:['#F7D9A6'],
      svg:'<rect width="120" height="80" rx="10" fill="#FFF4E3"/><circle cx="88" cy="26" r="14" fill="' + H + '"/><path d="M0 80 L0 56 Q 60 44 120 56 L120 80 Z" fill="' + M + '"/><path d="M0 80 L0 66 Q 60 58 120 66 L120 80 Z" fill="' + T + '" opacity=".5"/><g transform="translate(20 40)"><path d="M0 14 L12 4 L24 14" fill="' + T + '" stroke="' + N + '" stroke-width="1.4"/><rect x="3" y="13" width="18" height="12" fill="#fff" stroke="' + N + '" stroke-width="1.6"/><rect x="6" y="16" width="5" height="5" fill="' + H + '"/></g>' }
  };
  function css(){
    if(document.getElementById('seaCss')) return;
    const st = document.createElement('style'); st.id = 'seaCss';
    st.textContent = '.sea-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0;transition:opacity 1.2s;}'
      + 'header.topbar{position:relative;}header.topbar > *:not(.sea-fx){position:relative;z-index:1;}'
      + '.sea-fx i{position:absolute;top:-20px;display:block;animation:seaFall linear infinite;}'
      + '.sea-fx .leaf{width:12px;height:12px;border-radius:0 70% 0 70%;}.sea-fx .flake{width:6px;height:6px;border-radius:50%;opacity:.85;}'
      + '.sea-fx .petal{width:9px;height:7px;border-radius:60% 40% 60% 40%;}.sea-fx .spark{width:4px;height:4px;border-radius:50%;animation:seaTw ease-in-out infinite alternate;}'
      + '@keyframes seaFall{0%{transform:translate(0,0) rotate(0)}100%{transform:translate(var(--sway),90px) rotate(260deg)}}@keyframes seaTw{from{opacity:.2}to{opacity:1}}'
      + '.sea-scene{display:inline-flex;gap:8px;align-items:center;margin-left:14px;vertical-align:middle;}.sea-scene svg{width:72px;height:48px;border-radius:8px;}'
      + '.sea-card{padding:0;margin-bottom:16px;overflow:hidden;}.sea-card-h{display:flex;gap:10px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);}'
      + '.sea-card-h b{font-size:15px;font-weight:800;color:var(--navy);}'
      + '.sea-row{display:flex;gap:12px;align-items:center;padding:9px 16px;border-bottom:1px solid var(--border);font-size:13.5px;}.sea-row:last-child{border-bottom:0;}'
      + '.sea-av{width:32px;height:32px;border-radius:50%;background:#EAF4F6;color:var(--navy);display:grid;place-items:center;font-weight:800;font-size:12.5px;flex:0 0 32px;}'
      + '.sea-ban{margin:10px 0;border-radius:14px;background:linear-gradient(120deg,#FFF4E3,#EAF4F6);padding:12px 16px;display:grid;grid-template-columns:62px 1fr;gap:14px;align-items:center;}'
      + '.sea-ban b{font-size:15.5px;color:var(--navy);}'
      + '@media (prefers-reduced-motion:reduce){.sea-fx i{animation:none!important;top:auto!important;}}';
    document.head.appendChild(st);
  }

  /* ── seasons: the top bar's minute of weather, once a day per browser ── */
  let fxTimer = null;
  function topbar(force){
    const bar = document.querySelector('header.topbar'); if(!bar) return;
    const old = bar.querySelector('.sea-fx');
    if(!seasonsOn()){ if(old) old.remove(); return; }
    if(old) return;
    const key = 'cch_sea_' + chiDay();
    if(!force){ try{ if(localStorage.getItem(key)) return; localStorage.setItem(key, '1'); }catch(e){ return; } }
    css();
    const S = SEASON[seasonOf()], fx = document.createElement('div'); fx.className = 'sea-fx'; fx.setAttribute('aria-hidden', 'true');
    let h = '';
    for(let i = 0; i < 18; i++){
      const left = (i * 37 + 11) % 100, dur = 4 + (i % 5), delay = -(i % 6), sway = ((i % 7) * 9 - 27) + 'px', col = S.cols[i % S.cols.length];
      h += S.fx === 'spark'
        ? '<i class="spark" style="left:' + left + '%;top:' + (10 + (i * 23) % 70) + '%;background:' + col + ';animation-duration:' + (1.2 + (i % 3) * .7) + 's;animation-delay:' + delay + 's"></i>'
        : '<i class="' + S.fx + '" style="left:' + left + '%;background:' + col + ';animation-duration:' + dur + 's;animation-delay:' + delay + 's;--sway:' + sway + '"></i>';
    }
    fx.innerHTML = h; bar.prepend(fx);
    clearTimeout(fxTimer);
    fxTimer = setTimeout(() => { fx.style.opacity = '0'; setTimeout(() => fx.remove(), 1300); }, reduce() ? 0 : 60000);
  }
  /* the small scene by the Dashboard greeting */
  function greeting(){
    const h = document.getElementById('todayHeading'); if(!h) return;
    const old = document.getElementById('seaScene');
    if(!seasonsOn()){ if(old) old.remove(); return; }
    css();
    const S = SEASON[seasonOf()];
    const html = '<svg viewBox="0 0 120 80" role="img" aria-label="' + S.name + '">' + S.svg + '</svg>';
    if(old){ old.innerHTML = html; return; }
    const sp = document.createElement('span'); sp.id = 'seaScene'; sp.className = 'sea-scene'; sp.title = S.name; sp.innerHTML = html;
    h.appendChild(sp);
  }

  /* ── work anniversaries ── */
  const ymdAdd = (ymd, n) => { const [y, m, d] = String(ymd).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  function weekOf(ymd){ const [y, m, d] = String(ymd).split('-').map(Number); const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; const s = ymdAdd(ymd, -dow); return { start:s, end:ymdAdd(s, 6) }; }
  /* the anniversary of a hire date that falls inside start..end (a Feb 29 hire counts on Feb 28 in other years) */
  function annivIn(hire, start, end){
    const h = String(hire || '').slice(0, 10); if(!/^\d{4}-\d\d-\d\d$/.test(h)) return null;
    for(const y of [Number(start.slice(0, 4)), Number(end.slice(0, 4))]){
      let md = h.slice(5); if(md === '02-29' && !(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0))) md = '02-28';
      const day = y + '-' + md, years = y - Number(h.slice(0, 4));
      if(years >= 1 && day >= start && day <= end) return { day, years };
    }
    return null;
  }
  function list(caregivers, today){
    const w = weekOf(today || chiDay());
    return (caregivers || []).filter(c => c && c.active !== false && c.hire_date).map(c => {
      const a = annivIn(c.hire_date, w.start, w.end); return a ? { id:c.id, name:((c.first || '') + ' ' + (c.last || '')).trim(), day:a.day, years:a.years, hire:String(c.hire_date).slice(0, 10) } : null;
    }).filter(Boolean).sort((a, b) => a.day.localeCompare(b.day) || a.name.localeCompare(b.name));
  }
  const dayWords = ymd => new Date(ymd + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' });
  const yearsWords = n => n + ' year' + (n === 1 ? '' : 's');
  function badge(n){
    return '<svg viewBox="0 0 70 70" width="56" height="56" aria-hidden="true"><circle cx="35" cy="35" r="31" fill="#fff" stroke="' + N + '" stroke-width="2.4"/>'
      + '<path d="M35 10 l4.4 9 9.8 1.4 -7.1 6.9 1.7 9.8 -8.8 -4.6 -8.8 4.6 1.7 -9.8 -7.1 -6.9 9.8 -1.4 Z" fill="' + H + '" stroke="' + N + '" stroke-width="1.6"/>'
      + '<text x="35" y="54" text-anchor="middle" font-family="inherit" font-weight="800" font-size="10" fill="' + N + '">' + n + (n === 1 ? ' YEAR' : ' YEARS') + '</text></svg>';
  }
  async function dashboardCard(){
    const host = document.getElementById('goalsRow'); if(!host) return;
    let el = document.getElementById('seaAnniv');
    if(!annivOn()){ if(el) el.remove(); return; }
    let census = null;
    try{ census = typeof cgdCensus === 'function' ? await cgdCensus() : null; }catch(e){ census = null; }
    const rows = list(census && census.caregivers);
    el = document.getElementById('seaAnniv');
    if(!rows.length){ if(el) el.remove(); return; }
    css();
    if(!el){ el = document.createElement('div'); el.id = 'seaAnniv'; el.className = 'card sea-card'; host.insertAdjacentElement('beforebegin', el); }
    el.innerHTML = '<div class="sea-card-h"><svg width="24" height="24" viewBox="0 0 40 40" aria-hidden="true"><rect x="6" y="16" width="28" height="18" rx="3" fill="' + H + '" stroke="' + N + '" stroke-width="2"/><path d="M6 22 h28" stroke="' + N + '" stroke-width="2"/><path d="M20 16 v18" stroke="' + T + '" stroke-width="3"/><path d="M20 16 c-6 -8 -12 -2 -6 0 M20 16 c6 -8 12 -2 6 0" fill="none" stroke="' + T + '" stroke-width="2.4"/></svg><b>Anniversaries this week</b></div>'
      + rows.map(r => '<div class="sea-row"><div class="sea-av">' + esc(r.name.split(/\s+/).map(p => p[0] || '').join('').slice(0, 2).toUpperCase()) + '</div>'
        + '<div style="flex:1;min-width:0;"><b style="color:var(--navy);">' + esc(r.name) + '</b> · ' + yearsWords(r.years) + ' with us<div class="field-note">' + esc(dayWords(r.day)) + ' · caregiver</div></div>'
        + '<button class="linklike" onclick="switchTab(\'cgdir\');setTimeout(function(){cgdOpenProfile(\'' + esc(String(r.id)) + '\')},60)">Open their page</button></div>').join('');
  }
  /* the banner on the caregiver's page, the week of their anniversary */
  function profileBanner(c){
    if(!annivOn() || !c || !c.hire_date) return '';
    const w = weekOf(chiDay()), a = annivIn(c.hire_date, w.start, w.end); if(!a) return '';
    css();
    const when = a.day === chiDay() ? 'today' : 'this ' + new Date(a.day + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long' });
    return '<div class="sea-ban" data-sea="anniv">' + badge(a.years) + '<div><b>' + yearsWords(a.years) + ' with Caring Companions ' + esc(when) + '</b>'
      + '<div class="field-note">Hired ' + esc(new Date(String(c.hire_date).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })) + '. Shows on this page all week. Nothing is sent to them.</div></div></div>';
  }
  function onDashboard(){ try{ topbar(); greeting(); dashboardCard(); }catch(e){ console.warn('seasons', e); } }

  window.SEA = { seasonOf, topbar, greeting, dashboardCard, profileBanner, onDashboard, list, annivIn };
})();
