/* =====================================================================================================================
   THE HIRING STRIP (Recruit & Onboard; Samantha 2026-11-02: "we need to know exactly where every applicant is and what they
   need to do ... we need to be able to click at any time on any name and get to the applicant's profile as well." Part 1 of
   her plan: every name opens the profile, and one strip on every Recruit & Onboard tab).
   One row of stages, the same on every tab: Applied, Interview, Offer, Step 1, Checks and Step 2, Orientation, Finish line.
   Each shows how many people are there and how many need us; a click opens that stage. Nothing is counted twice and
   nothing new is stored: each number is the one its own tab works from.
     · Applied:            Applicants New, Qualified (not booked), Needs a look, Family care to verify. Need us: New, Needs a
                           look, Family care to verify.
     · Interview:          booked, one per person (as on Interviews). Need us: the time has passed, no outcome yet.
     · Offer:              offers sent, not answered. Need us: a week or more with no answer.
     · Step 1:             offers accepted, Step 1 not done. Need us: a week or more, or the Step 1 stuck card is open.
     · Checks and Step 2:  Onboarding, the checks and references and send-orientation stops. Need us: a row with something
                           only the office can do now.
     · Orientation:        invited or part way through (Orientation tab). Need us: stuck or never opened.
     · Finish line:        finished orientation, not ready for shifts yet. Every one needs us.
   A list that has not been read yet is read once in the background (the same read its own tab makes) and shows "…" until
   then. Reads again at most every 5 minutes. Sends nothing.
   ===================================================================================================================== */
(function(){
  'use strict';
  const TABS = ['recruit', 'applicants', 'interviews', 'offers', 'cgbackground', 'orientprog', 'apjourney'];
  const DAY = 864e5, AGAIN = 5 * 60e3;
  const at = {}, busy = {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const has = n => { try{ return typeof window[n] !== 'undefined' || (0, eval)('typeof ' + n) !== 'undefined'; }catch(e){ return false; } };
  const get = n => { try{ return (0, eval)(n); }catch(e){ return undefined; } };

  /* read a list in the background, once, with the tab's own loader */
  function ensure(key, ready, load){
    if(busy[key] || typeof load !== 'function') return;
    if(Date.now() - (at[key] || 0) < AGAIN) return;   /* read lately (by us, or empty): not again yet */
    if(ready()){ at[key] = Date.now(); return; }       /* its own tab already read it; the tab refreshes itself */
    busy[key] = true;
    Promise.resolve().then(load).catch(() => {}).then(() => { busy[key] = false; at[key] = Date.now(); draw(); });
  }

  function applied(){
    const rows = get('AP_ROWS'), book = get('AP_BOOK');
    ensure('ap', () => Array.isArray(rows) && rows.length > 0, () => get('apLoad')());
    if(!Array.isArray(rows) || !rows.length || typeof get('apMatching') !== 'function') return null;
    const m = get('apMatching'), ids = k => new Set(m(k, true).map(r => String(r.id)));
    const booked = r => !!(book && book[r.id] && book[r.id].status === 'booked');
    const need = new Set([...ids('new'), ...ids('review'), ...ids('family')]);
    const all = new Set([...need, ...m('qualified', true).filter(r => !booked(r)).map(r => String(r.id))]);
    return { n:all.size, need:need.size };
  }
  function interviews(){
    const ivq = get('IVQ'), app = get('IVQ_APP') || {};
    ensure('ivq', () => Array.isArray(ivq) && Object.keys(app).length > 0, () => get('ivqLoad')());
    if(!Array.isArray(ivq) || !Object.keys(app).length) return null;
    /* one per person, as the Interviews list does: same last 10 phone digits, else email, else the applicant */
    const key = b => { const a = app[b.applicant_id] || {}; const ph = String(a.phone || '').replace(/\D/g, '').slice(-10);
      return ph.length === 10 ? 'p' + ph : (a.email ? 'e' + String(a.email).trim().toLowerCase() : 'a' + b.applicant_id); };
    const by = new Map();
    ivq.filter(b => b.status === 'booked').forEach(b => { const k = key(b); (by.get(k) || by.set(k, []).get(k)).push(b); });
    const now = Date.now();
    let need = 0;
    by.forEach(list => { if(!list.some(b => new Date(b.starts_at).getTime() >= now)) need++; });
    return { n:by.size, need };
  }
  function offers(stage){
    const E = window.HSTRIP_ENGINE;
    if(!E){ ensure('eng', () => false, loadEngine); return null; }
    const list = E.offers();
    ensure('off', () => Array.isArray(list) && list.length > 0, () => window.SCX && SCX.loadOffers ? SCX.loadOffers() : null);
    if(!Array.isArray(list) || !list.length) return null;
    const mine = list.filter(o => E.offerStage(o) === stage && !E.offerMovedOn(o));
    const late = o => { const a = E.offerAgeDays(o.interview_date); return (a != null && a >= 7) || E.offerIsQuiet(o); };
    /* the Step 1 stuck card the readiness sweep raises (cj_step1stall_<journey>), found through the offer's readiness row */
    const stuck = o => { try{
      const rows = window.CRX && typeof CRX.list === 'function' ? (CRX.list() || []) : [];
      const j = rows.find(r => String(r.offer_id) === String(o.id)); if(!j || !j.journey_id) return false;
      return ((get('DATA') || {}).ops_items || []).some(x => x && x.id === 'cj_step1stall_' + j.journey_id && x.status !== 'done' && x.status !== 'resolved');
    }catch(e){ return false; } };
    return { n:mine.length, need:mine.filter(o => late(o) || (stage === 'accepted' && stuck(o))).length };
  }
  /* Offers and Onboarding live in the caregiver engine, loaded the first time one of its tabs opens; the strip loads it the
     same way (scxEnsure) without opening a tab */
  function loadEngine(){
    if(window.HSTRIP_ENGINE) return;
    const fn = get('scxEnsure'); if(typeof fn !== 'function') return;
    return new Promise(res => { window.addEventListener('scx-ready', () => res(), { once:true }); setTimeout(res, 15000); try{ fn(get('activeTab')); }catch(e){ res(); } });
  }
  function checks(){
    const E = window.HSTRIP_ENGINE;
    if(!E){ ensure('eng', () => false, loadEngine); return null; }
    if(E.hydrated() === false) return null;
    let ppl; try{ ppl = E.people().filter(p => p.stop === 1 || p.stop === 2); }catch(e){ return null; }
    const need = ppl.filter(p => { try{ return E.acts(p).some(a => a.warn || (a.label && !a.wait && !a.done && !a.quiet)); }catch(e){ return false; } }).length;
    return { n:ppl.length, need };
  }
  function orientation(){
    if(!window.OPR || typeof OPR.counts !== 'function') return null;
    const c = OPR.counts();
    if(!c){ ensure('opr', () => false, () => OPR.load()); return null; }
    return c;
  }

  function stages(){
    const o = orientation();
    return [
      { k:'applied', label:'Applied', c:applied(), go:() => go('applicants') },
      { k:'interview', label:'Interview', c:interviews(), go:() => go('interviews') },
      { k:'offer', label:'Offer', c:offers('sent'), go:() => goOffers('sent') },
      { k:'step1', label:'Step 1', c:offers('accepted'), go:() => goOffers('accepted') },
      { k:'checks', label:'Checks and Step 2', c:checks(), go:() => go('cgbackground') },
      { k:'orient', label:'Orientation', c:o ? { n:o.need + o.inp + o.wait, need:o.hard } : null, go:() => goOrient(o && o.hard ? 'need' : 'inp') },
      { k:'finish', label:'Finish line', c:o ? { n:o.fin, need:o.fin } : null, go:() => goOrient('fin') },
    ];
  }
  /* the stage the open tab is showing */
  function here(){
    const t = get('activeTab');
    if(t === 'applicants') return 'applied';
    if(t === 'interviews') return 'interview';
    if(t === 'offers'){ const s = get('OFF_STAGE'); return s === 'accepted' ? 'step1' : s === 'sent' ? 'offer' : ''; }
    if(t === 'cgbackground') return 'checks';
    if(t === 'orientprog'){ const s = window.OPR && OPR._st ? OPR._st.tab : ''; return s === 'fin' ? 'finish' : 'orient'; }
    return '';
  }
  function go(tab){ if(typeof switchTab === 'function') switchTab(tab); }
  function goOffers(stage){
    try{ (0, eval)("OFF_STAGE='" + stage + "'; OFF_STAGE_PICKED=true;"); }catch(e){}
    if(get('activeTab') === 'offers'){ try{ get('offView')(get('offCurrentView')); }catch(e){} draw(); } else go('offers');
  }
  function goOrient(k){
    if(window.OPR && typeof OPR.tab === 'function') OPR.tab(k);
    if(get('activeTab') !== 'orientprog') go('orientprog'); else draw();
  }

  const css = () => { if(document.getElementById('hsCss')) return; const s = document.createElement('style'); s.id = 'hsCss';
    s.textContent = '.hs-strip{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px;align-items:stretch}'
      + '.hs-st{background:#fff;border:1px solid var(--border);border-radius:10px;padding:6px 11px;min-width:96px;text-align:left;cursor:pointer;font:inherit;line-height:1.25;position:relative}'
      + '.hs-st:hover{border-color:var(--navy)}.hs-st.on{border:2px solid var(--navy);background:#F4F7FB;padding:5px 10px}'
      + '.hs-st span{display:block;font-size:12px;color:var(--text-muted)}.hs-st b{font-size:18px;color:var(--navy)}'
      + '.hs-st i{display:block;font-style:normal;font-size:11.5px;font-weight:700;color:#B23B2E}.hs-st i.ok{color:#94A3B8;font-weight:400}'
      + '.hs-st:not(:last-child)::after{content:"\\203A";position:absolute;right:-6px;top:50%;transform:translateY(-50%);color:#B8C2CF;font-size:13px}'
      + '@media (max-width:720px){.hs-st{min-width:0;flex:1 1 30%}.hs-st::after{display:none}}';
    document.head.appendChild(s); };

  function html(){
    const cur = here();
    return '<nav class="hs-strip" aria-label="Where every applicant is">' + stages().map((s, i) => {
      const c = s.c;
      return '<button type="button" class="hs-st' + (s.k === cur ? ' on' : '') + '" onclick="HSTRIP.go(' + i + ')" title="Open ' + esc(s.label) + '">'
        + '<span>' + esc(s.label) + '</span><b>' + (c ? c.n : '…') + '</b>'
        + (c ? (c.need ? '<i>' + c.need + ' need' + (c.need === 1 ? 's' : '') + ' you</i>' : '<i class="ok">nobody waiting on us</i>') : '<i class="ok">reading…</i>')
        + '</button>';
    }).join('') + '</nav>';
  }
  /* draws the strip at the top of the open Recruit & Onboard tab */
  function draw(){
    const t = get('activeTab'); if(TABS.indexOf(t) < 0) return;
    const sec = document.getElementById('tab-' + t); if(!sec) return;
    css();
    let box = sec.querySelector(':scope > .hs-mount');
    if(!box){ box = document.createElement('div'); box.className = 'hs-mount'; sec.insertBefore(box, sec.firstChild); }
    box.innerHTML = html();
  }
  let pend = null;
  function soon(){ clearTimeout(pend); pend = setTimeout(draw, 60); }
  window.HSTRIP = { draw, soon, go:i => { const s = stages()[i]; if(s) s.go(); }, _stages:stages };
})();
