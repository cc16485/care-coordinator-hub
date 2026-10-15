/* =====================================================================================================================
   A CALMER PROFILE TOP (Samantha 2026-10-15, approved mockup https://claude.ai/artifact/G4wNStB1MyTM52eChTjNxq:
   "I don't want all that stuff at top of client/lead profile"; refined the same day). Above the tabs, for clients and
   leads alike:
     · ONE header line: status, payer, Care Coordinator (only office roles get the change button), the start date while
       they are starting, and the main family contact with Call (the office line) and, for a lead, Text
     · ONE next action, or nothing when nothing needs doing. Safety first, then an uncovered shift, then anything late or
       time-sensitive, then the routine next step (pickNext)
   Everything else moves to the tab it belongs to; nothing is deleted:
     · the stage bar and the four tracks (client-journey.js #cpPath)  → the Start of Care tab
     · Active + Pause care / End care (client-care.js #ccCare)         → More while care is simply active; a pause, an
                                                                          ending or an open checklist still shows
     · the Google review box (review-ask.js #ccReview)                 → the Overview, only when there is an ask to make or
                                                                          follow up; "Ask for a Google review" → More
     · the journey card (#cjHead): its tiles and yes line              → the Overview; its links → More; its contact,
                                                                          payer and step → the header line and the one card
   Whether a client is receiving care is the server's call, not this file's: since Staffing #454 (Desktop 766) the journey
   sweep moves a client AxisCare shows as active WITH a recent shift out of intake, so a brand-new client marked active
   before their first visit keeps their intake steps, and a restart gets its own journey.
   The blocks are drawn by their own files, so this file never edits them: it moves each block after it draws, and does
   the same again whenever one redraws. plan(), pickNext() and statusWords() are pure; tests/profile-top-test.js runs them.
   ===================================================================================================================== */
(function(root){
  'use strict';

  /* s: { care:{ state, can, checklist }, review:{ open, followup, can_suggest } } → what moves and what More offers */
  function plan(s){
    s = s || {};
    const care = s.care || null, rv = s.review || null;
    const out = { hideCare:false, menu:[], showReview:false };
    /* care: plain "Active" or "Starting care" with its buttons goes to the menu (the header line says the status); anything
       with news in it (a pause, an ending, an open checklist) stays where people see it */
    if(care && care.state){
      const quiet = (care.state === 'active' || care.state === 'starting') && !care.checklist;
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
    return out;
  }

  /* THE ONE NEXT ACTION (her order, 2026-10-15: "urgent safety issues, uncovered shifts, and time-sensitive operational
     needs over routine follow-ups"). x: { due:[clDue items {kind,tone,label,tab}], lead:LeadRules.oneNext result,
     journey:{ key, title, why, status } } → { tier, kicker, text, sub, go:{ tab | step | lead }, more } or null */
  const SAFETY = ['ckconcern', 'concern'];
  function pickNext(x){
    x = x || {};
    const due = (x.due || []).filter(d => d && d.label && d.tone !== 'dim' && d.tone !== 'ok');
    const cap = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
    const c = [];
    due.forEach(d => {
      const tier = SAFETY.indexOf(d.kind) > -1 && d.tone === 'bad' ? 1 : d.kind === 'calloff' && d.tone === 'bad' ? 2 : d.tone === 'bad' ? 3 : 4;
      c.push({ tier, order:2, kind:d.kind, kicker:tier === 1 ? 'Safety' : tier === 2 ? 'Uncovered shift' : tier === 3 ? 'Late' : 'Next', text:cap(d.label), sub:d.sub || '', go:{ tab:d.tab || 'summary' } });
    });
    const l = x.lead && x.lead.text ? x.lead : null;
    if(l){
      const urgent = !!(l.due && (l.source === 'family' || l.late));
      c.push({ tier:urgent ? 3 : 4, order:0, kicker:l.late ? cap(l.late) : urgent ? 'Due now' : 'Next', text:l.text, sub:/^[\d\s().+-]{7,}$/.test(String(l.sub || '')) ? '' : (l.sub || ''),   /* the board's sub line can be a bare phone number; Call is on the header line */ go:l.source === 'journey' && x.journey && x.journey.key ? { step:x.journey.key } : { lead:true } });
    }
    const j = x.journey && x.journey.title ? x.journey : null;
    if(j && !(l && l.source === 'journey')){
      const late = j.status === 'attention' || j.status === 'blocked';
      c.push({ tier:late ? 3 : 4, order:1, kicker:j.status === 'blocked' ? 'Blocked' : late ? 'Needs attention' : 'Next', text:j.title, sub:j.why || '', go:{ step:j.key } });
    }
    if(!c.length) return null;
    c.sort((a, b) => a.tier - b.tier || a.order - b.order);
    return Object.assign({}, c[0], { more:c.length - 1 });
  }

  /* the status word beside the name: AxisCare's care state wins once they are a client */
  const STAGE_WORDS = { new:'New lead', talking:'Talking', assessment:'Assessment', ready:'Getting ready', care:'Receiving care', past:'Past' };
  const CARE_WORDS = { active:'Receiving care', starting:'Starting care', paused:'Paused', past:'Past client', deceased:'Deceased' };
  function statusWords(stageK, careState, detail){
    if(careState && CARE_WORDS[careState] && careState !== 'starting') return CARE_WORDS[careState];
    const w = STAGE_WORDS[stageK] || (careState ? CARE_WORDS[careState] : '') || '';
    return w && detail && stageK !== 'care' && stageK !== 'past' ? w + ' · ' + detail : w;
  }
  /* only an owner or a Care Coordinator may hand a client to another Care Coordinator (the server checks again) */
  const canChangeCc = roles => (roles || []).some(r => r === 'owner_admin' || r === 'care_coordinator');

  const api = { plan, pickNext, statusWords, canChangeCc, SAFETY };
  if(typeof module !== 'undefined' && module.exports){ module.exports = api; return; }

  /* =============================================== the page =============================================== */
  const $ = id => document.getElementById(id);
  const G = n => { try{ return Function('return typeof ' + n + ' !== "undefined" ? ' + n + ' : undefined')(); }catch(e){ return undefined; } };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const first = v => { const s = String(v || '').trim(); if(!s) return ''; if(/@/.test(s)){ const p = (G('OPS_PEOPLE') || []).find(x => String(x.primary_email || '').toLowerCase() === s.toLowerCase()); return p && p.full_name ? p.full_name.split(' ')[0] : s.split('@')[0].replace(/^./, c => c.toUpperCase()); } return s.split(/\s+/)[0]; };
  let obs = null, queued = false, open = false, nextGo = null;
  const CHIP_STATE = { paused:['Paused', '#FDF3E3', '#A8660E'], past:['Past client', '#F1F5F9', '#475569'], deceased:['Deceased', '#F1F5F9', '#475569'] };

  /* each file clears its own data when a profile opens (mount), so what it holds is this profile's */
  function state(){
    const CC = root.CC_CARE, RV = root.RV_STATE, CJ = root.CJ_STATE;
    const cd = CC && CC.ax && CC.data ? CC.data : null;
    const rd = RV && RV.ax && RV.data ? RV.data : null;
    const chk = cd ? (cd.changes || []).filter(c => (c.kind === 'pause' || c.kind === 'end') && (c.checklist || []).length).slice(-1)[0] : null;
    return {
      care:cd ? { state:cd.state, can:cd.can || {}, checklist:!!(chk && (chk.kind === 'end' || cd.state === 'paused')), payer:cd.payer || '' } : null,
      review:rd ? { open:!!rd.open, followup:!!rd.followup, can_suggest:!!rd.can_suggest } : null,
      cj:CJ && CJ.data && CJ.data.journey && CJ.view ? CJ : null
    };
  }

  /* the journey card's extras leave it once per draw (a marker says this draw is done); the card itself is hidden: the
     header line and the one next action say what it said */
  function arrangeHead(){
    const head = $('cjHead'), slot = $('cpOverJ'), links = $('cpTopLinks');
    if(!head || !slot || !links) return;
    const card = head.querySelector('.cj-head');
    if(!card){ slot.innerHTML = ''; links.innerHTML = ''; return; }
    if(!card.querySelector('[data-pt]')){
      slot.innerHTML = ''; links.innerHTML = '';
      [...card.children].forEach(el => {
        if(el.classList.contains('cj-every')){ [...el.querySelectorAll('button,a')].forEach(b => {
            b.classList.add('pt-item');
            if(b.classList.contains('cj-quiet')) b.textContent = /Hide/.test(b.textContent) ? 'Hide the older lead card' : 'Show the older lead card';   /* "More…" inside More said nothing */
            links.appendChild(b); }); el.remove(); return; }
        if(el.id === 'cjFacts' || el.classList.contains('cj-yes-line') || (el.previousElementSibling && el.previousElementSibling.classList.contains('cj-yes-line'))) slot.appendChild(el);
      });
      const mark = document.createElement('i'); mark.hidden = true; mark.setAttribute('data-pt', ''); card.appendChild(mark);
    }
    /* the lead workspace speaks for a lead on the Overview; the moved pieces step aside with it (lead-workspace.js tab()) */
    const lw = $('lwHost'), CP = G('CP') || {};
    slot.style.display = lw && lw.style.display !== 'none' && (!CP.tab || CP.tab === 'summary') ? 'none' : '';
  }

  function model(st){
    const CP = G('CP') || {}, l = CP.lead || null, r = CP.r || null, ax = String(CP.ax || '').trim();
    let stage = null; try{ stage = G('ccClientStage') ? root.ccClientStage({ lead:l, r, launch:CP.launch || null, ax }) : null; }catch(e){}
    const j = st.cj ? st.cj.data.journey : null, v = st.cj ? st.cj.view : null;
    /* payer: the journey's, else the inquiry's, else what AxisCare's care record says */
    const PAY = (root.LeadRules && LeadRules.PAYER_WORDS) || {};
    const payKey = (j && j.payer) || (l && l.funding_source) || (st.care && st.care.payer) || '';
    const payer = payKey ? (PAY[payKey] || String(payKey).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())) : '';
    /* Care Coordinator: the journey's, else the inquiry's owner, else whoever the Overview names (their last check-in) */
    let ccEmail = (j && j.assigned_cc) || (l && l.assigned_coordinator) || '';
    if(!ccEmail){ try{ const t = (root.cpCommandModel().tiles || []).find(x => x.key === 'owner'); if(t && t.v && !/^Nobody/.test(t.v)) ccEmail = t.v; }catch(e){} }
    /* the main contact: the person who called us, else the client's own number */
    const caller = l ? ((l.first_name || '') + ' ' + (l.last_name || '')).trim() : '';
    const contact = l && (caller || l.phone) ? { name:caller, rel:l.relationship || '', phone:l.phone || '', email:l.email || '', text:!!(l.phone && typeof root.lwText === 'function') }
      : r && r.phone ? { name:'', rel:'the client', phone:r.phone, email:'', text:false } : null;
    /* the one next action */
    let due = [], one = null;
    try{ if(ax && r && G('clDue')) due = root.clDue(Object.assign({}, r, { axiscare_client_id:ax }), (G('CL') && Array.isArray(G('CL').issues)) ? G('CL').issues : []); }catch(e){}
    /* an open call-off says which shift: who called off, which day and time, the soonest first */
    const cov = ax ? ((G('DATA') || {}).coverage_cases || []).filter(c => c && String(c.client_axiscare_id || '') === ax && c.status === 'open').sort((a, b) => String(a.shift_date || '').localeCompare(String(b.shift_date || ''))) : [];
    if(cov.length) due.forEach(d => { if(d.kind === 'calloff' && d.tone === 'bad') d.sub = cov.slice(0, 2).map(c => (c.calling_off || 'A caregiver') + ' called off ' + (c.shift_date ? new Date(c.shift_date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) : '') + (c.shift_time ? ', ' + String(c.shift_time).replace('-', ' to ') : '')).join(' · ') + (cov.length > 2 ? ' · and ' + (cov.length - 2) + ' more' : ''); });
    const pre = stage && ['new', 'talking', 'assessment', 'ready'].indexOf(stage.k) > -1;
    try{ if(pre && G('cpOneNext')) one = root.cpOneNext(l, null, ax); }catch(e){}
    const jn = v && v.next && j && j.status === 'open' ? { key:v.next.key, title:v.next.def && v.next.def.title, why:v.next.attention || v.next.why || '', status:v.next.status } : null;
    const lost = l && (l.status === 'Lost' || l.archived);
    const next = lost || (stage && stage.k === 'past') ? null : pickNext({ due, lead:one, journey:jn });
    return { stage, status:statusWords(stage && stage.k, st.care && st.care.state, stage && stage.d), payer, ccEmail, contact, next, journey:j,
      start:j && j.status === 'open' ? j.target_start || '' : '' };
  }
  function headHtml(m){
    const bits = [];   /* the status is the chip beside the name (#cpChips); it is not said twice */
    bits.push(m.payer ? esc(m.payer) : '<span class="pt-miss">payer not known yet</span>');
    const ccName = m.ccEmail ? first(m.ccEmail) : '';
    const mayChange = m.journey && canChangeCc(G('CC_ROLES'));
    bits.push((mayChange ? '<button class="linklike pt-cc" onclick="cjAssignCc(this)" title="Give this client to another Care Coordinator">' + esc(ccName || 'Nobody') + '</button>' : '<b>' + esc(ccName || 'Nobody') + '</b>')
      + (ccName ? ' is the Care Coordinator' : ' is the Care Coordinator yet'));
    if(m.journey && m.journey.status === 'open') bits.push('Start <button class="linklike" onclick="cjEditStart(this)" title="Kept on the Start Contract">' + (m.start ? esc(new Date(m.start + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' })) : 'not set') + '</button>');
    const c = m.contact;
    const who = c ? '<span class="pt-contact">' + (c.name ? '<b>' + esc(c.name) + '</b>' + (c.rel ? ' (' + esc(c.rel) + ')' : '') : esc(c.rel))
      + (c.phone ? ' <a href="#" class="pt-act" data-oc-phone="' + esc(c.phone) + '"' + (c.email ? ' data-oc-email="' + esc(c.email) + '"' : '') + ' title="Call from the office line">Call</a>' : '')
      + (c.text ? ' <button class="linklike pt-act" onclick="lwText(this)">Text</button>' : '') + '</span>'
      : '<a href="javascript:void(0)" class="pt-miss" onclick="cpShowTab(\'family\')">contacts on Family &amp; Contacts</a>';
    return '<div class="pt-line">' + bits.map(b => '<span class="pt-bit">' + b + '</span>').join('<span class="pt-dot">·</span>') + '</div><div class="pt-line">' + who + '</div>';
  }
  function nextHtml(n){
    if(!n) return '';
    const tone = n.tier === 1 || n.tier === 2 ? 'pt-red' : n.tier === 3 ? 'pt-amber' : '';
    const label = n.go.step ? 'Open the step' : n.go.lead ? 'Do it' : 'Open';
    return '<div class="pt-next ' + tone + '"><div class="pt-next-w"><div class="pt-k">' + esc(n.kicker) + '</div><div class="pt-t">' + esc(n.text) + '</div>'
      + (n.sub ? '<div class="pt-s">' + esc(n.sub) + '</div>' : '') + '</div>'
      + '<button class="primary pt-go" onclick="ptGo()">' + label + '</button>'
      + (n.more ? '<button class="linklike pt-more-n" onclick="cpShowTab(\'summary\');window.scrollTo(0,0)">' + n.more + ' more open</button>' : '') + '</div>';
  }
  function go(){
    const g = nextGo; if(!g) return;
    if(g.step && typeof root.cjPathOpen === 'function'){ root.cjPathOpen(g.step); return; }
    if(g.lead){ if(typeof root.cpShowTab === 'function') root.cpShowTab('summary'); const c = document.querySelector('#lwHost .lw-next'); if(c) c.scrollIntoView({ behavior:'smooth', block:'start' }); else window.scrollTo(0, 0); return; }
    if(g.tab && typeof root.cpShowTab === 'function'){ root.cpShowTab(g.tab); window.scrollTo(0, 0); }
  }

  function arrange(){
    queued = false;
    if(obs) obs.disconnect();
    try{
      const view = $('leadProfileView'); if(view) view.classList.add('pt-on');
      const st = state(), p = plan(st);
      const care = $('ccCare'); if(care) care.style.display = p.hideCare ? 'none' : '';
      const chip = $('cpChips') && $('cpChips').firstElementChild, cs = st.care && st.care.state;
      if(chip && CHIP_STATE[cs] && /Receiving care|Getting ready/.test(chip.textContent)){ chip.textContent = CHIP_STATE[cs][0]; chip.style.background = CHIP_STATE[cs][1]; chip.style.color = CHIP_STATE[cs][2]; }
      const rv = $('ccReview'); if(rv) rv.style.display = p.showReview ? '' : 'none';
      arrangeHead();
      const top = $('cpTop'), CP = G('CP') || {};
      if(top){
        if(!CP.lead && !CP.r && !CP.ax){ top.innerHTML = ''; nextGo = null; }
        else { const m = model(st); nextGo = m.next ? m.next.go : null; top.innerHTML = headHtml(m) + nextHtml(m.next); }
      }
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
    ['cjHead', 'ccCare', 'ccReview', 'cpPath', 'cpTitle', 'cpFacts', 'cpChips'].forEach(id => { const el = $(id); if(el) obs.observe(el, { childList:true, subtree:true }); });
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
  Object.assign(root, { ProfileTop:api, ptArrange:arrange, ptMenu:menu, ptGo:go });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(typeof globalThis !== 'undefined' ? globalThis : this);
