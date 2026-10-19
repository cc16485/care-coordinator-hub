/* Progress you can see (2026-10-18, step 3 of fun across the Hub; her "Love it, build step 3 as shown", mockup
   https://claude.ai/artifact/QUWDkrXxcMGrBNMYFv2sPb). Three places where the Hub already knows how far along someone is:
   · PATHS.stones(items, live): the Start of Care steps as stepping stones to the family's house. The stones ARE the old
     rail buttons (same data-n9a="pick", same role="tab", same click), only drawn differently. The house lights up when
     the journey is active.
   · PATHS.road(now, ended): Applied, Interview, Offered, Working as a road with a little car. Between Offered and Working
     three mileposts name the parts of hiring (references and checks, start paperwork, orientation). They are signposts
     only: the person page does not have that detail at hand, so they never claim done or not done (the Hiring tab does).
   · PATHS.suns(box, journey, facts): the first two weeks, a sun for each day. Read from AxisCare (coverage-shifts
     live_schedule, the 14 days from the first visit, this client's visits only). A full sun = every visit that day has a
     caregiver; a dashed one = a visit still needs someone (its time stays written out); a dot = no visits. If the read
     fails or AxisCare sends only part, the suns are left out and the sentence below them still says it all.
   Same facts, new picture: nothing new is stored or sent. Still for anyone whose computer asks for reduced motion. */
(function(){
  const N = '#0D365F', T = '#0F7A73', H = '#F0A63A', M = '#8FD1C7', P = '#EAF4F6', L = '#CADDD9';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  function css(){
    if(document.getElementById('pathsCss')) return;
    const st = document.createElement('style'); st.id = 'pathsCss';
    st.textContent = '.pth-wrap{overflow-x:auto;}'
      + '.pth-stones{position:relative;min-width:600px;display:grid;grid-template-columns:repeat(9,minmax(0,1fr)) 76px;align-items:start;padding:14px 0 4px;border-radius:12px;background:' + P + ';}'
      + '.pth-stones > svg.pth-bg{position:absolute;inset:0;width:100%;height:100%;}'
      + '.pth-stones button{position:relative;appearance:none;border:0;background:none;padding:0;cursor:pointer;display:grid;gap:5px;justify-items:center;font:inherit;color:#55677a;}'
      + '.pth-stones button:nth-of-type(even){margin-top:14px;}'
      + '.pth-stones button i{display:grid;place-items:center;width:44px;height:26px;border-radius:50%;border:2px solid ' + N + ';background:#fff;font-style:normal;font-size:12px;font-weight:800;color:' + N + ';transition:background .3s;}'
      + '.pth-stones .d i{background:' + T + ';color:#fff;}.pth-stones .n i{background:' + H + ';}'
      + '.pth-stones .x i{background:repeating-linear-gradient(45deg,#fff 0 4px,' + L + ' 4px 8px);color:#8a978f;border-color:#8a978f;}'
      + '.pth-stones .n i{animation:pthBreathe 1.8s ease-in-out infinite;}'
      + '@keyframes pthBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}'
      + '.pth-stones small{font-size:11px;line-height:1.15;text-align:center;max-width:9ch;}.pth-stones .d small{color:' + T + ';font-weight:700;}.pth-stones .n small{color:#16283a;font-weight:800;}'
      + '.pth-stones .s i{outline:2px solid ' + T + ';outline-offset:3px;}'
      + '.pth-stones button:focus-visible i{outline:3px solid ' + H + ';outline-offset:3px;}'
      + '.pth-house{position:relative;justify-self:center;margin-top:-6px;}'
      + '.pth-road{position:relative;min-width:600px;}.pth-road svg{display:block;width:100%;height:auto;}'
      + '.pth-suns{display:grid;grid-template-columns:auto repeat(7,minmax(34px,1fr));gap:4px 6px;align-items:center;max-width:560px;}'
      + '.pth-suns .wk{font-size:11px;font-weight:800;color:#55677a;letter-spacing:.04em;text-transform:uppercase;}'
      + '.pth-suns .dw{font-size:11px;font-weight:700;color:#55677a;text-align:center;}'
      + '.pth-suns .dy{display:grid;justify-items:center;gap:1px;font-size:10.5px;color:#55677a;}.pth-suns .dy svg{width:34px;height:34px;}'
      + '.pth-key{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:#55677a;margin:4px 0 6px;}.pth-key span{display:inline-flex;gap:5px;align-items:center;}'
      + '@media (prefers-reduced-motion:reduce){.pth-stones .n i{animation:none;}.pth-stones button i{transition:none;}}';
    document.head.appendChild(st);
  }

  /* ── 1. stepping stones: items = [{ k, cls, label, title, n }] in order; live = the journey is active ── */
  function stones(items, live){
    css();
    const n = items.length, cols = n + 1;
    /* the trail through each stone's centre: columns are equal except the house's, so x is close enough in % */
    const pts = items.map((_, i) => [((i + .5) / cols) * 100, i % 2 ? 62 : 40]);
    const d = 'M ' + pts.map(p => p[0].toFixed(2) + ' ' + p[1]).join(' L ') + ' L ' + (((n + .5) / cols) * 100).toFixed(2) + ' 40';
    const bg = '<svg class="pth-bg" viewBox="0 0 100 120" preserveAspectRatio="none" aria-hidden="true">'
      + '<path d="M0 120 L0 104 Q 50 92 100 104 L100 120 Z" fill="' + L + '"/>'
      + '<path d="' + d + '" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" opacity=".85"/></svg>';
    const house = '<div class="pth-house" title="' + (live ? 'A current client' : 'Their home, at the end of the path') + '"><svg width="60" height="56" viewBox="0 0 68 72" aria-hidden="true">'
      + '<path d="M0 34 L34 8 L68 34" fill="' + T + '" stroke="' + N + '" stroke-width="2.4" stroke-linejoin="round"/><rect x="8" y="32" width="52" height="38" fill="#fff" stroke="' + N + '" stroke-width="2.4"/>'
      + '<rect x="15" y="40" width="13" height="11" rx="1.5" fill="' + H + '" opacity="' + (live ? 1 : .2) + '"/><rect x="40" y="40" width="13" height="11" rx="1.5" fill="' + H + '" opacity="' + (live ? 1 : .2) + '"/>'
      + '<rect x="27" y="50" width="14" height="20" fill="' + N + '"/></svg></div>';
    return '<div class="pth-wrap"><div class="n9-rail pth-stones" role="tablist" aria-label="Start of Care steps">' + bg
      + items.map(x => '<button type="button" role="tab" class="' + esc(x.cls) + '" data-n9a="pick" data-k="' + esc(x.k) + '" aria-label="Step ' + x.n + ': ' + esc(x.title) + '">'
        + '<i>' + (/\bd\b/.test(x.cls) ? '✓' : x.n) + '</i><small>' + esc(x.label) + '</small></button>').join('')
      + house + '</div></div>';
  }

  /* ── 2. the road: now = 0 Applied, 1 Interview, 2 Offered, 3 Working ── */
  /* posts (optional, while Offered): [references & checks, start paperwork, orientation], each true (done), false (not yet)
     or null (not known). Without them the mileposts stay plain signposts. */
  function road(now, ended, posts){
    css();
    const SIGN = ['Applied', 'Interview', 'Offered', 'Working'], POST = ['References & checks', 'Start paperwork', 'Orientation'];
    const X = [60, 200, 340, 820], PX = [460, 580, 700];
    const known = !ended && now === 2 && Array.isArray(posts);
    let lastDone = -1; if(known) for(let i = 0; i < 3; i++){ if(posts[i] === true) lastDone = i; else break; }
    const nextUp = known ? posts.findIndex(p => p !== true) : -1;
    const fill = ended ? 0 : known && lastDone >= 0 ? PX[lastDone] : X[now];
    let h = '<rect width="900" height="150" rx="12" fill="' + P + '"/>' + (now === 3 && !ended ? '<circle cx="860" cy="30" r="15" fill="' + H + '" opacity=".7"/>' : '')
      + '<path d="M0 150 L0 100 Q 450 82 900 100 L900 150 Z" fill="' + L + '"/>'
      + '<rect x="0" y="104" width="900" height="24" fill="#fff" stroke="' + N + '" stroke-width="1.6"/>'
      + (fill ? '<rect x="0" y="104" width="' + fill + '" height="24" fill="' + M + '" opacity=".45"/>' : '')
      + '<line x1="0" y1="116" x2="900" y2="116" stroke="' + H + '" stroke-width="2.4" stroke-dasharray="12 10"/>';
    SIGN.forEach((s, i) => {
      const done = !ended && i < now, cur = !ended && i === now, x = X[i];
      h += '<line x1="' + x + '" y1="104" x2="' + x + '" y2="56" stroke="' + N + '" stroke-width="3"/>'
        + '<rect x="' + (x - 46) + '" y="32" width="92" height="28" rx="6" fill="' + (done ? T : cur ? H : '#fff') + '" stroke="' + N + '" stroke-width="2"/>'
        + '<text x="' + x + '" y="51" text-anchor="middle" font-size="13" font-weight="800" fill="' + (done ? '#fff' : N) + '">' + s + '</text>';
    });
    POST.forEach((s, i) => {
      const x = PX[i], done = (!ended && now === 3) || (known && posts[i] === true), up = known && i === nextUp;
      h += '<line x1="' + x + '" y1="104" x2="' + x + '" y2="82" stroke="' + N + '" stroke-width="2"/><circle cx="' + x + '" cy="78" r="' + (up ? 8 : 7) + '" fill="' + (done ? T : up ? H : '#fff') + '" stroke="' + N + '" stroke-width="1.8"' + (known ? ' data-post="' + i + '" data-state="' + (posts[i] === true ? 'done' : posts[i] === false ? 'todo' : 'unknown') + '"' : '') + '/>'
        + (done ? '<path d="M' + (x - 3.5) + ' 78 l2.5 2.5 4.5-5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>' : '')
        + '<text x="' + x + '" y="145" text-anchor="middle" font-size="11" font-weight="' + (up ? 800 : 700) + '" fill="' + (done ? T : up ? N : '#55677a') + '">' + esc(s) + '</text>';
    });
    if(!ended){
      const cx = (known && lastDone >= 0 ? PX[lastDone] : X[now]) - 30;
      h += '<g transform="translate(' + cx + ' 92)"><rect x="0" y="6" width="44" height="15" rx="5" fill="' + T + '" stroke="' + N + '" stroke-width="2"/><path d="M8 6 L14 -1 H32 L38 6" fill="#fff" stroke="' + N + '" stroke-width="2"/><circle cx="11" cy="22" r="5" fill="' + N + '"/><circle cx="34" cy="22" r="5" fill="' + N + '"/></g>';
      if(now === 3) h += '<g transform="translate(856 54)"><path d="M0 18 L18 4 L36 18" fill="' + T + '" stroke="' + N + '" stroke-width="2"/><rect x="5" y="17" width="26" height="20" fill="#fff" stroke="' + N + '" stroke-width="2"/><rect x="9" y="21" width="7" height="7" fill="' + H + '"/></g>';
    }
    return '<div class="pth-wrap" style="margin-top:8px;"><div class="pth-road pp-stages" aria-label="Where they are: ' + (ended ? esc(ended) : SIGN[now] + (known && lastDone >= 0 ? ', ' + POST[lastDone] + ' done' : '')) + '">'
      + '<svg viewBox="0 0 900 150" role="img" aria-hidden="true">' + h + '</svg>'
      + (ended ? '<div class="field-note" style="margin-top:4px;"><span class="pp-stg pp-end">' + esc(ended) + '</span></div>' : '') + '</div></div>';
  }

  /* ── 3. the first two weeks, a sun for each day ── */
  const SUNS = {};   /* journey id -> { at, rows } */
  const ymdAdd = (ymd, n) => { const [y, m, d] = String(ymd).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  function sun(v, open){
    if(!v) return '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="3" fill="' + L + '"/></svg>';
    const full = !open; let rays = '';
    if(full) for(let i = 0; i < 8; i++) rays += '<line x1="20" y1="4" x2="20" y2="9" stroke="' + H + '" stroke-width="2.4" stroke-linecap="round" transform="rotate(' + (i * 45) + ' 20 20)"/>';
    return '<svg viewBox="0 0 40 40" aria-hidden="true">' + rays + '<circle cx="20" cy="20" r="9" fill="' + (full ? H : '#fff') + '" stroke="' + (full ? H : '#C17A12') + '" stroke-width="2.4"' + (full ? '' : ' stroke-dasharray="3 3"') + '/></svg>';
  }
  function sunsHtml(from, rows){
    css();
    const by = {}; rows.forEach(v => { const d = String(v.date || '').slice(0, 10); if(!d) return; (by[d] = by[d] || { v:0, open:0 }); by[d].v++; if(!v.caregiver) by[d].open++; });
    const dow = ymd => { const [y, m, d] = ymd.split('-').map(Number); return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; };
    const start = ymdAdd(from, -dow(from));            /* the Monday of the first week */
    const end = ymdAdd(from, 13);
    let h = '<span></span>' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => '<span class="dw">' + d + '</span>').join('');
    for(let w = 0; w < 3; w++){
      const ws = ymdAdd(start, w * 7); if(ws > end) break;
      h += '<span class="wk">Week ' + (w + 1) + '</span>';
      for(let i = 0; i < 7; i++){
        const day = ymdAdd(ws, i), inside = day >= from && day <= end, x = by[day];
        const label = new Date(day + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' });
        h += inside ? '<div class="dy" title="' + esc(label + (x ? ': ' + x.v + ' visit' + (x.v === 1 ? '' : 's') + (x.open ? ', ' + x.open + ' still need' + (x.open === 1 ? 's' : '') + ' a caregiver' : ', all covered') : ': no visits')) + '">' + sun(x && x.v, x && x.open) + '<span>' + esc(label) + '</span></div>' : '<span></span>';
      }
    }
    return '<div class="pth-suns" data-paths="suns">' + h + '</div>'
      + '<div class="pth-key"><span>' + sun(1, 0).replace('<svg ', '<svg width="16" height="16" ') + 'Every visit covered</span><span>' + sun(1, 1).replace('<svg ', '<svg width="16" height="16" ') + 'A visit still needs someone</span><span>' + sun(0).replace('<svg ', '<svg width="16" height="16" ') + 'No visits</span></div>';
  }
  async function suns(box, journey, facts){
    try{
      if(!box || !journey || !facts || !facts.from || !journey.axiscare_client_id) return;
      const holder = box.querySelector('.n9-cov'); if(!holder || box.querySelector('[data-paths="suns"]')) return;
      const id = journey.journey_id || journey.id || journey.axiscare_client_id, from = String(facts.from).slice(0, 10);
      let c = SUNS[id];
      if(!c || Date.now() - c.at > 5 * 60000){
        const { data:{ session } } = await sb.auth.getSession();
        if(!session || !session.access_token) return;
        const r = await fetch(CONFIG.supabase_url + '/functions/v1/coverage-shifts', { method:'POST',
          headers:{ Authorization:'Bearer ' + session.access_token, apikey:CONFIG.supabase_anon_key, 'Content-Type':'application/json' },
          body:JSON.stringify({ live_schedule:true, start:from, end:ymdAdd(from, 13) }) });
        const d = await r.json().catch(() => null);
        if(!r.ok || !d || d.error || d.partial) return;   /* no picture without the whole fortnight */
        c = SUNS[id] = { at:Date.now(), rows:(d.rows || []).filter(v => String(v.client_id) === String(journey.axiscare_client_id)) };
      }
      if(!c.rows.length || !document.body.contains(holder) || box.querySelector('[data-paths="suns"]')) return;
      const el = document.createElement('div'); el.style.margin = '0 0 8px';
      el.innerHTML = sunsHtml(from, c.rows);
      holder.insertAdjacentElement('beforebegin', el);
    }catch(e){ console.warn('paths: suns', e); }
  }

  /* ── the road's mileposts from the hiring records (2026-10-18, her "please do 3") ──
     hire-profile {stages} gives Step 1 (signed of total) and the readiness card's id; caregiver-journey {get} gives the
     readiness rail. References & checks = the rail's screening and approval rows; Start paperwork = Step 1 signed (and
     Step 2, when the rail has it); Orientation = the rail's orientation row. Anything not read stays null (a plain
     signpost), never a guess. Read only. */
  const ROAD = {};   /* applicant id -> { at, posts } */
  async function roadPosts(id){
    const c = ROAD[id]; if(c && Date.now() - c.at < 5 * 60000) return c.posts;
    let st = null, rail = null;
    try{ const r = await sb.functions.invoke('hire-profile', { body:{ action:'stages', applicant_ids:[String(id)] } }); st = r && r.data && r.data.stages && r.data.stages[String(id)]; }catch(e){}
    if(!st || st.error) return null;
    if(st.journey_id){ try{ const r = await sb.functions.invoke('caregiver-journey', { body:{ action:'get', journey_id:st.journey_id } }); rail = r && r.data && r.data.view && r.data.view.rail; }catch(e){} }
    const railDone = keys => { if(!Array.isArray(rail)) return null; const rows = rail.filter(x => keys.includes(x.key)); return rows.length ? rows.every(x => x.state === 'done') : null; };
    /* the server's own stage names, in order (applicant-status.ts STAGES): before the readiness card exists, a stage
       earlier than a milepost means that milepost is not done yet */
    const STG = ['Application', 'Prescreening', 'Interview booking', 'Interview', 'Offer', 'Offer signature', 'Step 1', 'Background & References', 'Step 2 in Viventium', 'Orientation', 'Training', 'Approved to Work'];
    const idx = STG.indexOf(String(st.stage || '')), before = n => idx >= 0 && idx < n ? false : null;
    if(st.approved_at){ ROAD[id] = { at:Date.now(), posts:[true, true, true] }; return ROAD[id].posts; }
    const s1 = st.step1 && st.step1.of ? st.step1.signed >= st.step1.of : (st.journey_id || idx >= 7 ? true : before(7));
    const s2 = railDone(['step2']);
    const refs = railDone(['screening', 'approval']), ori = railDone(['orientation']);
    const posts = [refs !== null ? refs : before(7), s1 === null ? null : (s1 && s2 !== false), ori !== null ? ori : before(9)];
    ROAD[id] = { at:Date.now(), posts };
    return posts;
  }
  async function roadFill(id, host){
    try{
      if(!id || !host) return;
      const posts = await roadPosts(id); if(!posts) return;
      const wrap = host.querySelector('.pth-road'); if(!wrap || !document.body.contains(wrap)) return;
      const box = wrap.closest('.pth-wrap'); if(box) box.outerHTML = road(2, '', posts);
    }catch(e){ console.warn('paths: road', e); }
  }

  window.PATHS = { stones, road, suns, sunsHtml, roadFill, roadPosts, _cache:SUNS, _road:ROAD };
})();
