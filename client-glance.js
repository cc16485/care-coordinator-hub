/* =====================================================================================================================
   THE CLIENT AT A GLANCE (Samantha 2026-10-29: "The overview of our caring companions clients should be simple, clear,
   their name, DOB, address, Care Level, idk things we want to see at a glance"; she approved the one-card mockup and
   reading birth date, address and phone live from AxisCare "when someone opens a client").
   For a client receiving care (or paused, or past), the Overview tab is ONE card:
     · born (and age), address, phone, care level, pays by, Care Coordinator, main contact with Call (the office line),
       when care started (the name, status and AxisCare # are the page title and its chips, so the card does not repeat them)
     · safety notes from the intake, when there are any
     · what needs attention (the same clDue list the Clients board uses), each opening the tab that owns it, and
       "Record a family request"
   On the Overview only, the older blocks step aside (one card, not layers): the facts line and the header line with its
   NEXT bar (#cpFacts, #cpTop: they come back on every other tab), the journey tiles (#cpOverJ), the command area
   (#cpCommand), the old lead card and the family requests card (shown again by "Record a family request" or a request in
   Needs attention). Who they are, the completeness meter and the profile links (#cp_c_summary) move to Activity &
   Documents. Nothing is deleted and no other file is edited: CSS hides, and one container moves.
   Birth date, address and phone come from the client-glance function (Staffing-Coordinator-Hub), for one client, only
   when their profile is open. Nothing is saved; the page keeps the answer in memory for five minutes. A lead's own
   intake answers fill in when AxisCare has none. Leads and clients still getting ready keep their Overview as it was.
   model() is pure; tests/client-glance-test.js runs it.
   ===================================================================================================================== */
(function(root){
  'use strict';

  const SHOW_FOR = ['care', 'past'];
  const ymd = v => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '')); return m ? m[0] : ''; };
  function dateWords(v){
    const d = ymd(v); if(!d) return '';
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  }
  /* "4175550001" -> "(417) 555-0001"; anything else as given */
  const phoneText = v => { const s = String(v || '').trim(), d = s.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : s; };
  function ageOn(dob, today){
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dob || '')), t = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(today || ''));
    if(!m || !t) return null;
    let a = +t[1] - +m[1]; if(+t[2] < +m[2] || (+t[2] === +m[2] && +t[3] < +m[3])) a--;
    return a > 0 && a < 130 ? a : null;
  }

  /* x: { stageK, status, ax, name, glance:{dob,address,phone,start_date,contact}|null, glanceErr, lead, r, census,
          payer, cc, level, care:[{tone,t}], due:[{kind,tone,label,tab}], today } → what the card says */
  function model(x){
    x = x || {};
    const g = x.glance || {}, l = x.lead || null, r = x.r || null, c = x.census || null;
    const show = !!x.ax && SHOW_FOR.indexOf(x.stageK) > -1;
    const leadAddr = l ? [String(l.client_address || '').trim(), String(l.client_city || '').trim()].filter(Boolean).join(', ') : '';
    const dob = ymd(g.dob) || ymd(l && l.client_dob);
    const start = ymd(g.start_date) || ymd(c && c.start_date);
    const caller = l ? ((l.first_name || '') + ' ' + (l.last_name || '')).trim() : '';
    const self = l && /^(self|client)$/i.test(String(l.relationship || ''));
    const contact = g.contact && g.contact.name ? g.contact
      : (l && caller && !self ? { name:caller, relationship:l.relationship || '', phone:phoneText(l.phone), from:'the inquiry' } : null);
    const rank = { bad:1, warn:2, dim:3, ok:4 };
    const due = (x.due || []).filter(d => d && d.label).slice().sort((a, b) => (rank[a.tone] || 9) - (rank[b.tone] || 9));
    const loading = !x.glance && !x.glanceErr;
    const miss = loading ? 'reading AxisCare…' : 'not in AxisCare';
    return {
      show,
      name:x.name || '',
      facts:[
        { k:'Born', v:dob ? dateWords(dob) + (ageOn(dob, x.today) ? ' (age ' + ageOn(dob, x.today) + ')' : '') : '', miss },
        { k:'Address', v:g.address || leadAddr, miss },
        { k:'Phone', v:phoneText(g.phone || (r && r.phone) || (l && l.client_phone)), miss, phone:true },
        { k:'Care level', v:x.level || '', miss:'no level class in AxisCare', html:true },
        { k:'Pays by', v:x.payer || '', miss:'not recorded', tab:'payer' },
        { k:'Care Coordinator', v:x.cc || '', miss:'nobody assigned' },
        { k:'Main contact', v:contact ? contact.name + (contact.relationship ? ' (' + contact.relationship + ')' : '') : '', miss:'none yet', tab:'family', contact },
        { k:'Care started', v:dateWords(start), miss:loading ? 'reading AxisCare…' : 'no start date in AxisCare' }
      ],
      err:x.glanceErr || '',
      care:(x.care || []).slice(0, 8),
      due
    };
  }

  const api = { model, ageOn, dateWords, SHOW_FOR };
  if(typeof module !== 'undefined' && module.exports){ module.exports = api; return; }

  /* ------------------------------------------------------------------ the page ------------------------------------- */
  const $ = id => document.getElementById(id);
  const G = n => { try{ return Function('return typeof ' + n + ' !== "undefined" ? ' + n + ' : undefined')(); }catch(e){ return undefined; } };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const first = v => { const s = String(v || '').trim(); if(!s) return ''; if(/@/.test(s)){ const p = (G('OPS_PEOPLE') || []).find(x => String(x.primary_email || '').toLowerCase() === s.toLowerCase()); return p && p.full_name ? p.full_name.split(' ')[0] : s.split('@')[0].replace(/^./, c => c.toUpperCase()); } return s.split(/\s+/)[0]; };
  const TONE = { ok:['#E7F6EC', '#1F7A4D'], warn:['#FDF3E3', '#A8660E'], bad:['#FDE8E8', '#B23B2E'], dim:['#F1F5F9', '#64748B'], info:['#EEF4FB', '#0F4C81'] };
  const cache = {};   /* ax -> { at, data, err, p }: this page only, five minutes, never saved */
  let queued = false, obs = null, drawing = false;

  async function fetchGlance(ax){
    const hit = cache[ax];
    if(hit && (hit.p || Date.now() - hit.at < 300000)) return;
    const box = cache[ax] = { at:0, data:null, err:'', p:null };
    box.p = (async () => {
      try{
        const sb = G('sb'), CONFIG = G('CONFIG');
        const sess = await sb.auth.getSession(), tok = sess && sess.data && sess.data.session && sess.data.session.access_token;
        if(!tok) throw new Error('Sign in first.');
        const r = await fetch(CONFIG.supabase_url + '/functions/v1/client-glance', { method:'POST',
          headers:{ Authorization:'Bearer ' + tok, apikey:CONFIG.supabase_anon_key, 'Content-Type':'application/json' }, body:JSON.stringify({ axiscare_client_id:ax }) });
        const d = await r.json().catch(() => null);
        if(!r.ok || !d || d.error) throw new Error((d && d.error) || ('AxisCare details answered ' + r.status));
        box.data = d;
      }catch(e){ box.err = String(e && e.message || e); console.warn('client-glance', box.err); }
      box.at = Date.now(); box.p = null; queue();
    })();
  }
  function levelFor(ax){
    const CCLV = G('CCLV'), CP = G('CP') || {}, chip = G('ccLevelChip');
    const lv = CCLV && CCLV.levels && CCLV.levels[ax];
    if(lv && lv.level && chip) return root.ccLevelChip(lv.level);
    if(CP.levelHtml && String(CP.levelHtml.ax) === String(ax) && !/reading|could not/.test(CP.levelHtml.html)) return /no level/.test(CP.levelHtml.html) ? '' : CP.levelHtml.html;
    if(CCLV && !CCLV.levels && !CCLV.loading && G('ccLevelsLoad')) root.ccLevelsLoad().then(queue);
    return '';
  }
  function inputs(){
    const CP = G('CP') || {}, l = CP.lead || null, r = CP.r || null, ax = String(CP.ax || '').trim();
    let stage = null; try{ stage = root.ccClientStage({ lead:l, r, launch:CP.launch || null, ax }); }catch(e){}
    const chip = $('cpChips') && $('cpChips').firstElementChild;
    const CL = G('CL') || {}, cen = ((CL.census && CL.census.clients) || []).find(c => String(c.id) === ax) || null;
    const CC = G('CC_CARE'), CJ = G('CJ_STATE');
    const j = CJ && CJ.data && CJ.data.journey ? CJ.data.journey : null;
    const PAY = (root.LeadRules && root.LeadRules.PAYER_WORDS) || {};
    const payKey = (j && j.payer) || (l && l.funding_source) || (CC && CC.ax && CC.data && CC.data.payer) || '';
    let cc = (j && j.assigned_cc) || (l && l.assigned_coordinator) || '';
    let care = [], due = [];
    try{ const m = root.cpCommandModel(); care = m.care || [];
      if(!cc){ const t = (m.tiles || []).find(x => x.key === 'owner'); if(t && t.v && !/^Nobody/.test(t.v)) cc = t.v; } }catch(e){}
    try{ if(ax && r) due = root.clDue(Object.assign({}, r, { axiscare_client_id:ax }), Array.isArray(CL.issues) ? CL.issues : []); }catch(e){}
    const hit = cache[ax] || null;
    return { stageK:stage && stage.k, status:chip ? chip.textContent.trim() : '', ax, name:($('cpTitle') || {}).textContent || (r && r.client_name) || '',
      glance:hit && hit.data, glanceErr:hit && hit.err, lead:l, r, census:cen,
      payer:payKey ? (PAY[payKey] || String(payKey).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())) : '',
      cc:first(cc), level:ax ? levelFor(ax) : '', care, due, today:new Date().toISOString().slice(0, 10) };
  }
  function goFor(d){
    if(d.kind === 'concern') return "switchTab('mywork')";
    if(d.kind === 'request') return 'cgRequests(false)';
    return "cpShowTab('" + esc(d.tab || 'summary') + "');window.scrollTo(0,0)";
  }
  function html(m){
    const fact = f => {
      let v = f.v ? (f.html ? f.v : esc(f.v)) : '<span class="cg-miss">' + esc(f.miss) + '</span>';
      if(f.phone && f.v) v = '<a href="#" data-oc-phone="' + esc(f.v) + '" title="Call from the office line">' + esc(f.v) + '</a>';
      if(f.contact){ const c = f.contact;
        v = f.v ? esc(f.v) + (c.phone ? ' · <a href="#" data-oc-phone="' + esc(c.phone) + '" title="Call from the office line">' + esc(c.phone) + '</a>' : '')
          : '<a href="javascript:void(0)" class="cg-miss" onclick="cpShowTab(\'family\');window.scrollTo(0,0)">add on Family &amp; Contacts</a>'; }
      return '<div class="cg-f"><div class="cg-k">' + esc(f.k) + '</div><div class="cg-v">' + v + '</div></div>';
    };
    const chip = (tone, t, on) => { const c = TONE[tone] || TONE.dim;
      return (on ? '<a href="javascript:void(0)" onclick="' + on + '"' : '<span') + ' class="cg-chip" style="background:' + c[0] + ';color:' + c[1] + ';">' + esc(t) + (on ? '</a>' : '</span>'); };
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    return '<div class="card cg-card">'
      + '<div class="cg-grid">' + m.facts.map(fact).join('') + '</div>'
      + (m.err ? '<div class="cg-err">Birth date, address and phone could not be read from AxisCare: ' + esc(m.err) + '</div>' : '')
      + (m.care.length ? '<div class="cg-row"><span class="cg-lbl">Safety</span>' + m.care.map(c => chip(c.tone, c.t)).join('') + '</div>' : '')
      + '<div class="cg-row cg-due"><span class="cg-lbl">Needs attention</span>'
      + (m.due.length ? m.due.map(d => chip(d.tone, cap(d.label), goFor(d))).join('') : '<span class="cg-miss">nothing open or due</span>')
      + '<span style="flex:1;"></span><button class="linklike" onclick="cgRequests(true)">Record a family request</button></div>'
      + '</div>';
  }

  function css(){
    if($('cgStyle')) return;
    const s = document.createElement('style'); s.id = 'cgStyle';
    s.textContent = [
      '#leadProfileView.cg-on.cg-ov #cpFacts,#leadProfileView.cg-on.cg-ov #cpTop,#leadProfileView.cg-on #cpOverJ,#leadProfileView.cg-on #cpCommand,',
      '#leadProfileView.cg-on [data-cp-pane="summary"] .cp-lead,#leadProfileView.cg-on:not(.cg-req) #cp_changes{display:none !important;}',
      '.cg-card{padding:18px 22px;margin-bottom:14px;}',
      '.cg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px 22px;}',
      '.cg-v a[data-oc-phone]{white-space:nowrap;}',
      '.cg-k{font-size:12px;color:var(--text-muted);}',
      '.cg-v{font-size:14px;font-weight:600;color:var(--text,#16283a);overflow-wrap:anywhere;}',
      '.cg-miss{font-weight:400;color:var(--text-muted);}',
      '.cg-err{font-size:12.5px;color:var(--red);margin-top:8px;}',
      '.cg-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:14px;}',
      '.cg-due{padding-top:12px;border-top:1px solid var(--border);}',
      '.cg-lbl{font-size:12.5px;color:var(--text-muted);margin-right:4px;}',
      '.cg-chip{display:inline-block;font-size:12.5px;font-weight:700;border-radius:6px;padding:3px 9px;text-decoration:none;}'
    ].join('\n');
    document.head.appendChild(s);
  }
  /* Who they are, the completeness meter and the profile links live on Activity & Documents while the card is on */
  function placeMore(on){
    const more = $('cp_c_summary'), slot = $('cgMoreSlot'), home = $('cp_changes');
    if(!more || !slot || !home) return;
    if(on && more.parentNode !== slot) slot.appendChild(more);
    if(!on && more.parentNode === slot) home.parentNode.insertBefore(more, home.nextSibling);
  }
  function draw(){
    queued = false;
    if(drawing) return; drawing = true;
    if(obs) obs.disconnect();
    try{
      const view = $('leadProfileView'), box = $('cgCard'); if(!view || !box) return;
      const CP = G('CP') || {};
      const x = view.style.display !== 'none' ? inputs() : null;
      const m = x ? model(x) : { show:false };
      view.classList.toggle('cg-on', m.show);
      view.classList.toggle('cg-ov', m.show && (!CP.tab || CP.tab === 'summary'));
      if(!m.show){ view.classList.remove('cg-req'); box.innerHTML = ''; box.dataset.for = ''; placeMore(false); fit(); return; }
      if(box.dataset.for !== x.ax){ view.classList.remove('cg-req'); box.dataset.for = x.ax; }
      placeMore(true);
      fetchGlance(x.ax);
      box.innerHTML = html(m);
      fit();
    }finally{ drawing = false; watch(); }
  }
  /* the profile folds an empty column away (cpFitGrids); hiding or showing blocks by class needs it to look again */
  function fit(){ try{ if(typeof root.cpFitGrids === 'function') root.cpFitGrids(); }catch(e){} }
  function queue(){ if(queued) return; queued = true; Promise.resolve().then(draw); }
  function watch(){
    if(!obs) obs = new MutationObserver(queue);
    ['cpTitle', 'cpChips', 'cp_open_now', 'cpcGrid', 'cpTop'].forEach(id => { const el = $(id); if(el) obs.observe(el, { childList:true, subtree:true, characterData:true }); });
    const v = $('leadProfileView'); if(v) obs.observe(v, { attributes:true, attributeFilter:['style'] });
    const tabs = $('cpTabs'); if(tabs) obs.observe(tabs, { attributes:true, subtree:true, attributeFilter:['class'] });
  }
  /* "Record a family request" (and a request in Needs attention): the requests card shows under the card */
  function requests(open){
    const view = $('leadProfileView'); if(!view) return;
    view.classList.add('cg-req'); fit();
    const box = $('cp_changes'); if(!box) return;
    if(open){ const b = box.querySelector('#cpchOpen'); if(b) b.click(); }
    box.scrollIntoView({ behavior:'smooth', block:'start' });
  }
  function start(){ css(); watch(); draw(); }
  Object.assign(root, { ClientGlance:api, cgDraw:draw, cgRequests:requests });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(typeof globalThis !== 'undefined' ? globalThis : this);
