/* =====================================================================================================================
   A CALMER PROFILE TOP (Samantha 2026-10-15, approved mockup https://claude.ai/artifact/G4wNStB1MyTM52eChTjNxq:
   "I don't want all that stuff at top of client/lead profile"). Above the tabs: who this is, one line about them, and
   the ONE next step. Everything else moves to the tab it belongs to; nothing is deleted.

     · the stage bar and the four tracks (client-journey.js #cpPath)  → the Start of Care tab
     · Active + Pause care / End care (client-care.js #ccCare)         → the More menu while care is simply active;
                                                                          a pause, an ending or a checklist still shows
     · the Google review box (review-ask.js #ccReview)                 → the Overview tab, only when there is an ask to
                                                                          make or follow up; "Ask for a Google review" → More
     · the tiles, the yes line and its hand-off (inside #cjHead)       → the Overview tab
     · See every step, Client audit (PDF) and the other links          → the More menu

   AND (her approval, same day): a client AxisCare shows as active (receiving care or paused) gets no intake path. When
   their journey still sits at intake or the assessment, the top shows no intake step and the Start of Care tab says why.

   The blocks are drawn by their own files (two of them are being changed by other work right now), so this file never
   edits them: it moves each block after it draws, and does the same again whenever one redraws. plan() is pure and
   tests/profile-top-test.js runs it in node.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const INTAKE = ['intake', 'prechecks', 'assessment'];
  const IN_CARE = ['active', 'paused'];

  /* s: { care:{ state, can:{pause,end,resume,return,end_date}, checklist }, review:{ open, followup, can_suggest },
          journey:{ status, stage } } → what the top shows and what the More menu offers */
  function plan(s){
    s = s || {};
    const care = s.care || null, rv = s.review || null, j = s.journey || null;
    const out = { hideCare:false, menu:[], showReview:false, intakeHidden:false };
    /* care: plain "Active" with its two buttons goes to the menu; anything with news in it stays where people see it */
    if(care && care.state){
      const quiet = care.state === 'active' && !care.checklist;
      out.hideCare = quiet;
      if(quiet){
        if(care.can && care.can.pause) out.menu.push({ key:'pause', label:'Pause care', call:['ccCareForm', 'pause'] });
        if(care.can && care.can.end) out.menu.push({ key:'end', label:'End care', call:['ccCareForm', 'end'] });
      }
    }
    /* the review box earns a place only when there is something to do in it */
    if(rv){
      out.showReview = !!(rv.open || rv.followup);
      if(!out.showReview && rv.can_suggest) out.menu.push({ key:'review', label:'Ask for a Google review', call:['rvSuggest'] });
    }
    /* an active AxisCare client is never walked through intake */
    if(care && IN_CARE.indexOf(care.state) > -1 && j && j.status !== 'active' && j.status !== 'closed' && INTAKE.indexOf(j.stage) > -1) out.intakeHidden = true;
    return out;
  }
  const NOTE = 'AxisCare shows this client as receiving care, so the intake steps are not shown. Their earlier steps are still under See every step.';
  const api = { plan, INTAKE, NOTE };
  if(typeof module !== 'undefined' && module.exports){ module.exports = api; return; }

  /* =============================================== the page =============================================== */
  const $ = id => document.getElementById(id);
  const G = n => { try{ return Function('return typeof ' + n + ' !== "undefined" ? ' + n + ' : undefined')(); }catch(e){ return undefined; } };
  let obs = null, queued = false, open = false;

  function state(){
    /* each file clears its own data when a profile opens (mount), so what it holds is this profile's */
    const CC = root.CC_CARE, RV = root.RV_STATE, CJ = root.CJ_STATE;
    const cd = CC && CC.ax && CC.data ? CC.data : null;
    const rd = RV && RV.ax && RV.data ? RV.data : null;
    const jd = CJ && CJ.data && CJ.data.journey && CJ.view ? { status:CJ.data.journey.status, stage:CJ.view.stage || CJ.data.journey.stage } : null;
    const chk = cd ? (cd.changes || []).filter(c => (c.kind === 'pause' || c.kind === 'end') && (c.checklist || []).length).slice(-1)[0] : null;
    return {
      care:cd ? { state:cd.state, can:cd.can || {}, checklist:!!(chk && (chk.kind === 'end' || cd.state === 'paused')) } : null,
      review:rd ? { open:!!rd.open, followup:!!rd.followup, can_suggest:!!rd.can_suggest } : null,
      journey:jd
    };
  }

  /* the journey card's extras leave it once per draw; a marker says this draw is done */
  function arrangeHead(p){
    const head = $('cjHead'), slot = $('cpOverJ'), links = $('cpTopLinks');
    if(!head || !slot || !links) return;
    const card = head.querySelector('.cj-head');
    if(!card){ slot.innerHTML = ''; links.innerHTML = ''; return; }
    if(!card.querySelector('[data-pt]')){
      slot.innerHTML = ''; links.innerHTML = '';
      const next = card.querySelector('.cj-next');
      let after = false;
      [...card.children].forEach(el => {
        if(el === next){ after = true; return; }
        if(!after) return;
        if(el.classList.contains('cj-every')){ [...el.querySelectorAll('button,a')].forEach(b => {
          b.classList.add('pt-item');
          if(b.classList.contains('cj-quiet')) b.textContent = /Hide/.test(b.textContent) ? 'Hide the older lead card' : 'Show the older lead card';   /* "More…" inside More said nothing */
          links.appendChild(b); }); el.remove(); return; }
        slot.appendChild(el);
      });
      const mark = document.createElement('i'); mark.hidden = true; mark.setAttribute('data-pt', ''); card.appendChild(mark);
    }
    /* an active client still sitting at intake: no intake step up here */
    card.querySelectorAll('.cj-next,.cj-flash,.cj-prog').forEach(el => { el.style.display = p.intakeHidden ? 'none' : ''; });
    /* the lead workspace speaks for a lead on the Overview; the moved pieces step aside with the card (lead-workspace.js tab()) */
    const lw = $('lwHost'), CP = G('CP') || {};
    slot.style.display = lw && lw.style.display !== 'none' && (!CP.tab || CP.tab === 'summary') ? 'none' : '';
  }
  function arrange(){
    queued = false;
    if(obs) obs.disconnect();
    try{
      const p = plan(state());
      const care = $('ccCare'); if(care) care.style.display = p.hideCare ? 'none' : '';
      const rv = $('ccReview'); if(rv) rv.style.display = p.showReview ? '' : 'none';
      arrangeHead(p);
      const path = $('cpPath'); if(path) path.style.display = p.intakeHidden ? 'none' : '';   /* its stage words would say intake too */
      const note = $('cpStartNote'); if(note) note.innerHTML = p.intakeHidden ? '<div class="card" style="padding:10px 14px;margin-bottom:12px;font-size:13.5px;background:#FFFBF4;border-color:#F3D9B5;">' + NOTE + '</div>' : '';
      drawMenu(p);
    }finally{ watch(); }
  }
  function drawMenu(p){
    const host = $('cpTopMore'); if(!host) return;
    const links = $('cpTopLinks'), n = p.menu.length + (links ? links.children.length : 0);
    host.style.display = n ? '' : 'none';
    const list = $('cpTopMenu'); if(!list) return;
    list.querySelectorAll('[data-pt-own]').forEach(b => b.remove());
    p.menu.forEach(m => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'linklike pt-item'; b.setAttribute('data-pt-own', ''); b.textContent = m.label;
      b.onclick = () => { menu(false); const f = root[m.call[0]]; if(typeof f === 'function') f.apply(null, m.call.slice(1)); };
      list.insertBefore(b, links);
    });
  }
  function menu(on){
    open = on === undefined ? !open : !!on;
    const list = $('cpTopMenu'), btn = $('cpTopMoreBtn'); if(!list || !btn) return;
    list.hidden = !open; btn.setAttribute('aria-expanded', String(open));
  }
  function queue(){ if(queued) return; queued = true; Promise.resolve().then(arrange); }
  function watch(){
    if(!obs) obs = new MutationObserver(queue);
    ['cjHead', 'ccCare', 'ccReview', 'cpPath'].forEach(id => { const el = $(id); if(el) obs.observe(el, { childList:true, subtree:true }); });
    const lw = $('lwHost'); if(lw) obs.observe(lw, { attributes:true, attributeFilter:['style'] });
    const tabs = $('cpTabs'); if(tabs) obs.observe(tabs, { attributes:true, subtree:true, attributeFilter:['class'] });
  }
  function start(){
    const btn = $('cpTopMoreBtn');
    if(btn) btn.onclick = e => { e.stopPropagation(); menu(); };
    document.addEventListener('click', e => { if(open && !e.target.closest('#cpTopMore')) menu(false); else if(open && e.target.closest('#cpTopMenu .pt-item')) menu(false); });
    document.addEventListener('keydown', e => { if(open && e.key === 'Escape') menu(false); });
    watch(); arrange();
  }
  Object.assign(root, { ProfileTop:api, ptArrange:arrange, ptMenu:menu });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(typeof globalThis !== 'undefined' ? globalThis : this);
