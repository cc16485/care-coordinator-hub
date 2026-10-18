/* Celebrations where work finishes (2026-10-18, step 2 of fun across the Hub; her "Love it, build step 2 as shown", mockup
   https://claude.ai/artifact/Pd5QzdaMt8Y2Aw8sDjXHYU). Four moments that are already good news:
   · First visit: the client's journey shows an actual first visit (the first clock-in AxisCare reported). The client's Care
     Coordinator sees a key turn in the door the first time they open the profile after; a "Care began" stamp stays.
   · Oriented: the caregiver finished the online orientation (orient_date). The first time each person opens that profile
     within two weeks of it, the cap stamp pops in; the stamp stays.
   · Full house: every visit tomorrow has a caregiver (AxisCare, coverage-shifts live_schedule for tomorrow). The Dashboard's
     Today in AxisCare card gets the stamp; it plays once a day per person and goes away if a visit opens again.
   · End my shift: after the handoff posts, a sunset with what the person got done today, in words, only for them.
   Rules (hers): plays once, then only the stamp; nothing is sent; nothing counted, ranked or compared; still for anyone
   whose computer asks for reduced motion. "Seen" is remembered in this browser only (a convenience, never a record). */
(function(){
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const reduce = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
  const myEmail = () => { try{ return String((ME && ME.email) || '').toLowerCase(); }catch(e){ return ''; } };
  const myFirst = () => { try{ return String((ME && (ME.name || ME.email)) || '').split(/[\s@]/)[0]; }catch(e){ return ''; } };
  const chiDay = (off) => new Date(Date.now() + (off || 0) * 864e5).toLocaleString('sv-SE', { timeZone:'America/Chicago' }).slice(0, 10);
  const short = ymd => { try{ return new Date(String(ymd).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' }); }catch(e){ return ''; } };
  /* first time for this person on this browser; marks it seen at once so a redraw never plays it twice */
  function firstTime(key){
    const k = 'cch_cel_' + myEmail() + '_' + key;
    try{ if(localStorage.getItem(k)) return false; localStorage.setItem(k, String(Date.now())); return true; }catch(e){ return false; }
  }
  function css(){
    if(document.getElementById('celCss')) return;
    const st = document.createElement('style'); st.id = 'celCss';
    st.textContent = '.cel-stamp{display:inline-block;vertical-align:middle;line-height:0;}'
      + '.cel-stamp.pop{animation:celIn .55s cubic-bezier(.2,1.4,.4,1) both;}'
      + '@keyframes celIn{0%{opacity:0;transform:scale(2.2) rotate(-14deg)}70%{opacity:1}100%{opacity:1;transform:scale(1) rotate(-8deg)}}'
      + '.cel-rest{transform:rotate(-8deg);}'
      + '.cel-key{display:grid;justify-items:center;gap:6px;background:#fff;border:1px solid var(--border);border-radius:14px;padding:12px;margin:10px 0;position:relative;}'
      + '.cel-key svg{width:min(100%,300px);height:auto;}'
      + '.cel-key .cel-door{transform-origin:0 0;transform-box:fill-box;transition:transform .9s ease .6s;}'
      + '.cel-key.go .cel-door{transform:scaleX(.25);}'
      + '.cel-key .cel-k{transform-origin:center;transform-box:fill-box;opacity:0;}'
      + '.cel-key.go .cel-k{animation:celTurn 1s ease forwards;}'
      + '@keyframes celTurn{0%{opacity:0;transform:translateX(-30px)}35%{opacity:1;transform:translateX(0)}70%{transform:rotate(0)}100%{opacity:1;transform:rotate(90deg)}}'
      + '.cel-key .cel-glow{opacity:.15;transition:opacity .8s ease 1.2s;}.cel-key.go .cel-glow{opacity:1;}'
      + '.cel-key .cel-say{font-weight:800;color:var(--navy);font-size:15.5px;opacity:0;transition:opacity .5s ease 1.6s;text-align:center;}.cel-key.go .cel-say{opacity:1;}'
      + '.cel-key .cel-x{position:absolute;right:10px;top:8px;}'
      + '.cel-bit{position:fixed;width:7px;height:11px;border-radius:2px;z-index:99999;pointer-events:none;animation:celFly 1.3s cubic-bezier(.15,.7,.35,1) forwards;}'
      + '@keyframes celFly{0%{transform:translate(0,0) rotate(0);opacity:1}100%{transform:translate(var(--dx),calc(var(--dy) + 200px)) rotate(var(--rot));opacity:0}}'
      + '.cel-shade{position:fixed;inset:0;background:rgba(13,54,95,.28);z-index:9998;display:grid;place-items:center;padding:16px;}'
      + '.cel-dusk{background:#fff;border-radius:18px;max-width:440px;width:100%;overflow:hidden;box-shadow:0 18px 50px rgba(13,54,95,.25);}'
      + '.cel-dusk svg{display:block;width:100%;height:auto;}'
      + '.cel-dusk .cel-sun{transition:transform 1.6s ease;}.cel-dusk.go .cel-sun{transform:translateY(34px);}'
      + '.cel-dusk .cel-in{padding:14px 18px 16px;display:grid;gap:8px;}'
      + '.cel-dusk h3{margin:0;font-size:17px;font-weight:800;color:var(--navy);}'
      + '.cel-dusk ul{margin:0;padding-left:18px;display:grid;gap:3px;font-size:13.5px;}'
      + '.cel-dusk li{opacity:0;transform:translateY(6px);transition:all .4s;}.cel-dusk.go li{opacity:1;transform:none;}'
      + '.cel-full{display:flex;gap:10px;align-items:center;margin-top:8px;}'
      + '@media (prefers-reduced-motion:reduce){.cel-stamp.pop,.cel-key.go .cel-k,.cel-bit{animation:none!important;}.cel-key .cel-door,.cel-key .cel-glow,.cel-key .cel-say,.cel-dusk .cel-sun,.cel-dusk li{transition:none!important;}.cel-key .cel-k{opacity:1;}}';
    document.head.appendChild(st);
  }
  function confetti(el, n){
    if(!el || reduce()) return;
    const r = el.getBoundingClientRect(), cols = ['#0D365F', '#0F7A73', '#F0A63A', '#8FD1C7', '#C17A12'];
    for(let i = 0; i < (n || 22); i++){
      const b = document.createElement('i'); b.className = 'cel-bit';
      b.style.left = (r.left + r.width / 2) + 'px'; b.style.top = (r.top + r.height / 2) + 'px'; b.style.background = cols[i % 5];
      b.style.setProperty('--dx', (Math.random() * 240 - 120) + 'px'); b.style.setProperty('--dy', (-50 - Math.random() * 150) + 'px'); b.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      document.body.appendChild(b); setTimeout(() => b.remove(), 1400);
    }
  }
  /* ── the stamps ── */
  const STAMP = {
    began: d => '<svg width="88" height="88" viewBox="0 0 104 104" role="img" aria-label="Care began ' + esc(d) + '"><circle cx="52" cy="52" r="46" fill="#fff" stroke="#0F7A73" stroke-width="3"/><circle cx="52" cy="52" r="39" fill="none" stroke="#0F7A73" stroke-width="1.5" stroke-dasharray="3 3"/><text x="52" y="47" text-anchor="middle" font-family="inherit" font-weight="800" font-size="12" fill="#0F7A73">CARE BEGAN</text><text x="52" y="64" text-anchor="middle" font-family="inherit" font-weight="700" font-size="11" fill="#0F7A73">' + esc(String(d).toUpperCase()) + '</text></svg>',
    oriented: d => '<svg width="58" height="58" viewBox="0 0 110 110" role="img" aria-label="Oriented ' + esc(d) + '"><circle cx="55" cy="55" r="48" fill="#fff" stroke="#0D365F" stroke-width="3"/><path d="M27 46 L55 34 L83 46 L55 58 Z" fill="#0D365F"/><path d="M38 51 v12 q17 9 34 0 v-12" fill="#0F7A73" stroke="#0D365F" stroke-width="2"/><line x1="83" y1="46" x2="83" y2="62" stroke="#F0A63A" stroke-width="3"/><circle cx="83" cy="64" r="3.5" fill="#F0A63A"/><text x="55" y="86" text-anchor="middle" font-family="inherit" font-weight="800" font-size="11" fill="#0D365F">ORIENTED</text></svg>',
    full: () => '<svg width="120" height="70" viewBox="0 0 120 70" role="img" aria-label="Full house tomorrow"><rect x="3" y="3" width="114" height="64" rx="10" fill="#fff" stroke="#0F7A73" stroke-width="3"/><rect x="9" y="9" width="102" height="52" rx="6" fill="none" stroke="#0F7A73" stroke-width="1.4" stroke-dasharray="3 3"/><text x="60" y="33" text-anchor="middle" font-family="inherit" font-weight="800" font-size="14" fill="#0F7A73">FULL HOUSE</text><text x="60" y="50" text-anchor="middle" font-family="inherit" font-weight="700" font-size="10" fill="#0F7A73">TOMORROW</text></svg>'
  };
  function stampHtml(kind, d, play, title){ css(); return '<span class="cel-stamp ' + (play && !reduce() ? 'pop' : 'cel-rest') + '" data-cel="' + kind + '" title="' + esc(title || '') + '">' + STAMP[kind](d) + '</span>'; }

  /* ── 1. first visit, on the client's Start of Care card ── */
  function keyScene(say){
    return '<svg viewBox="0 0 300 150" aria-hidden="true"><rect width="300" height="150" rx="12" fill="#EAF4F6"/><path d="M0 150 L0 118 Q 150 96 300 118 L300 150 Z" fill="#CADDD9"/>'
      + '<path d="M88 64 L150 26 L212 64 Z" fill="#0F7A73" stroke="#0D365F" stroke-width="2.4" stroke-linejoin="round"/><rect x="96" y="62" width="108" height="66" fill="#fff" stroke="#0D365F" stroke-width="2.4"/>'
      + '<rect class="cel-glow" x="108" y="76" width="22" height="18" rx="2" fill="#F0A63A"/><rect class="cel-glow" x="170" y="76" width="22" height="18" rx="2" fill="#F0A63A"/>'
      + '<rect class="cel-glow" x="138" y="90" width="26" height="38" fill="#F0A63A"/><rect class="cel-door" x="138" y="90" width="26" height="38" fill="#0D365F"/>'
      + '<g transform="translate(176 112)"><g class="cel-k"><circle r="6" fill="none" stroke="#C17A12" stroke-width="3"/><line x1="6" y1="0" x2="20" y2="0" stroke="#C17A12" stroke-width="3"/><line x1="16" y1="0" x2="16" y2="5" stroke="#C17A12" stroke-width="3"/></g></g></svg>'
      + '<div class="cel-say">' + esc(say) + '</div>';
  }
  function firstVisit(box, journey, actual, name){
    try{
      if(!box || !journey || !actual) return;
      const top = box.querySelector('.n9-top'); if(!top || top.querySelector('[data-cel="began"]')) return;
      const mine = String(journey.assigned_cc || '').toLowerCase() === myEmail();
      const play = mine && firstTime('first_' + (journey.id || name));
      top.style.position = 'relative';
      const holder = document.createElement('div');
      holder.style.cssText = 'position:absolute;right:6px;top:4px;';
      holder.innerHTML = stampHtml('began', short(actual), play, 'First visit ' + short(actual));
      top.appendChild(holder);
      if(!play) return;
      const first = String(name || '').trim().split(/\s+/)[0] || 'them';
      const k = document.createElement('div'); k.className = 'cel-key';
      k.innerHTML = '<button class="linklike cel-x" type="button">Close</button>' + keyScene(first + '’s care has started. Welcome, ' + first + '.');
      top.insertAdjacentElement('afterend', k);
      k.querySelector('.cel-x').onclick = () => k.remove();
      requestAnimationFrame(() => requestAnimationFrame(() => k.classList.add('go')));
      setTimeout(() => confetti(holder, 22), reduce() ? 0 : 1900);
    }catch(e){ console.warn('celebrate: first visit', e); }
  }

  /* ── 2. orientation done, on the caregiver profile header ── */
  function orientedChip(rec){
    const d = rec && rec.orient_date; if(!d) return '';
    const fresh = (Date.now() - new Date(String(d).slice(0, 10) + 'T12:00:00').getTime()) < 14 * 864e5;
    const play = fresh && firstTime('oriented_' + (rec.axiscare_id || rec.id || rec.name || '') + '_' + d);
    if(play) setTimeout(() => confetti(document.querySelector('#cgdFull [data-cel="oriented"]'), 20), 80);
    return stampHtml('oriented', short(d), play, 'Orientation done ' + short(d));
  }

  /* ── 3. tomorrow fully covered, on the Dashboard's Today in AxisCare card ── */
  let FH = { day:'', at:0, d:null, busy:false };
  async function fullHouse(){
    const card = document.getElementById('tbShiftCard'); if(!card) return;
    const day = chiDay(1);
    if(!(FH.day === day && FH.d && Date.now() - FH.at < 5 * 60000)){
      if(FH.busy) return; FH.busy = true;
      try{
        const { data:{ session } } = await sb.auth.getSession();
        if(!session || !session.access_token){ FH.busy = false; return; }
        const r = await fetch(CONFIG.supabase_url + '/functions/v1/coverage-shifts', { method:'POST',
          headers:{ Authorization:'Bearer ' + session.access_token, apikey:CONFIG.supabase_anon_key, 'Content-Type':'application/json' },
          body:JSON.stringify({ live_schedule:true, date:day }) });
        const d = await r.json().catch(() => null);
        FH = { day, at:Date.now(), d:(r.ok && d && !d.error) ? d : null, busy:false };
      }catch(e){ FH.busy = false; return; }
    }
    paintFull(card);
  }
  function paintFull(card){
    const old = card.querySelector('.cel-full'); if(old) old.remove();
    const d = FH.d; if(!d || d.partial) return;            /* no stamp without the whole day in hand */
    const rows = d.rows || [];
    if(!rows.length || rows.some(v => !v.caregiver)) return;
    const play = firstTime('full_' + FH.day);
    const el = document.createElement('div'); el.className = 'cel-full';
    el.innerHTML = stampHtml('full', '', play, 'Every visit tomorrow has a caregiver') + '<div class="field-note" style="font-size:13px;">Every visit tomorrow has a caregiver.</div>';
    card.appendChild(el);
    if(play) setTimeout(() => confetti(el.querySelector('.cel-stamp'), 18), 300);
  }

  /* ── 4. End my shift: the sunset, in words ── */
  const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const words = n => n < WORD.length ? WORD[n] : 'a lot of';
  function doneToday(){
    const me = myEmail(), day = chiDay(0);
    let items = []; try{ items = (DATA.ops_items || []); }catch(e){}
    return items.filter(i => i && i.status === 'done' && String(i.closed_by || '').toLowerCase() === me && i.closed_at
      && new Date(i.closed_at).toLocaleString('sv-SE', { timeZone:'America/Chicago' }).slice(0, 10) === day)
      .sort((a, b) => String(b.closed_at).localeCompare(String(a.closed_at)))
      .map(i => String(i.about || i.title || '').trim()).filter(Boolean);
  }
  function shiftEnd(out){
    try{
      css();
      const done = doneToday(), lines = [...new Set(done)].slice(0, 4);
      if(done.length > 4) lines.push('and ' + (done.length - 4 > 10 ? 'many' : words(done.length - 4)) + ' more');
      const handed = out && out.handed, to = (out && out.names) || [];
      if(handed && to.length) lines.push('Handed ' + words(handed) + ' thing' + (handed === 1 ? '' : 's') + ' to ' + to.join(' and ') + ', with notes');
      const sh = document.createElement('div'); sh.className = 'cel-shade'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', 'Your shift is wrapped up');
      sh.innerHTML = '<div class="cel-dusk"><svg viewBox="0 0 400 120" aria-hidden="true"><defs><linearGradient id="celDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7D9A6"/><stop offset="1" stop-color="#EAF4F6"/></linearGradient></defs>'
        + '<rect width="400" height="120" fill="url(#celDusk)"/><circle class="cel-sun" cx="300" cy="66" r="24" fill="#F0A63A"/><path d="M0 120 L0 88 Q 100 70 200 90 T 400 80 L400 120 Z" fill="#CADDD9"/>'
        + '<g transform="translate(70 66)"><path d="M0 18 L18 4 L36 18" fill="#0F7A73" stroke="#0D365F" stroke-width="2"/><rect x="5" y="17" width="26" height="20" fill="#fff" stroke="#0D365F" stroke-width="2"/><rect x="9" y="21" width="7" height="7" fill="#F0A63A"/></g></svg>'
        + '<div class="cel-in"><h3>Thank you, ' + esc(myFirst() || 'friend') + '. ' + (lines.length ? 'Here’s what you got done today.' : 'Rest well.') + '</h3>'
        + (lines.length ? '<ul>' + lines.map((l, i) => '<li style="transition-delay:' + (i * .25) + 's">' + esc(l) + '</li>').join('') + '</ul>' : '')
        + '<div style="display:flex;justify-content:flex-end;margin-top:4px;"><button class="primary" type="button" data-cel-close>Good night</button></div></div></div>';
      document.body.appendChild(sh);
      const close = () => sh.remove();
      sh.querySelector('[data-cel-close]').onclick = close;
      sh.addEventListener('click', e => { if(e.target === sh) close(); });
      sh.querySelector('[data-cel-close]').focus();
      requestAnimationFrame(() => requestAnimationFrame(() => sh.querySelector('.cel-dusk').classList.add('go')));
    }catch(e){ console.warn('celebrate: end of shift', e); }
  }

  /* for the look test: paint the Full house card from a given AxisCare answer */
  function paintFor(d){ FH = { day:chiDay(1), at:Date.now(), d, busy:false }; const card = document.getElementById('tbShiftCard'); if(card) paintFull(card); }
  window.CEL = { firstVisit, orientedChip, fullHouse, shiftEnd, doneToday, stampHtml, _firstTime:firstTime, _paintFor:paintFor };
})();
