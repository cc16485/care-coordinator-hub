/* =====================================================================================================================
   THE MAIN PROFILE OF A HIRE (Samantha 2026-10-11): "make sure every send, receive, completed time stamp is recorded in
   their main profile and make it easy for us to access the applicant's main profile from anywhere, and the PDF of all
   signed documents should be saved in the main profile... we need to be able to look at the profile and see it all".
   One panel, opened from anywhere (👤 Profile on the offer cards, Background & References, the caregiver roster, the
   readiness card, the Orientation Video Calls, the applicant page). The server (hire-profile) reads every permanent record for that
   one person; nothing is copied or typed here. Every document opens by a five-minute link and every open is logged.
     HP.open({ offer_id | candidate_id | caregiver_id | applicant_id })   HP.chip(key)   HP.fillOfferProgress()
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  async function call(body){
    const r = await sb.functions.invoke('hire-profile', { body });
    if(r.error){ let why = ''; try{ if(r.error.context && r.error.context.json) why = (await r.error.context.json()).error || ''; }catch(_){} throw new Error(why || r.error.message || 'the profile server did not answer'); }
    if(!r.data || r.data.error) throw new Error((r.data && r.data.error) || 'the profile server did not answer');
    return r.data;
  }
  const central = iso => { try{ return new Date(iso).toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' }); }catch(_){ return String(iso || ''); } };
  const TYPES = { sent:['Sent','#0D365F','#E8EEF5'], received:['Received','#15803D','#DCFCE7'], done:['Done','#3A342C','#F4F2ED'], refused:['Not sent','#B91C1C','#FEE2E2'],
                  opened:['Opened','#6E6559','#F4F2ED'], changed:['Changed','#92400E','#FEF3C7'], card:['Card','#B45309','#FFF7ED'] };
  let CUR = null, KEY = null, FILTER = 'all';
  function keyAttr(k){ return esc(JSON.stringify(k)); }
  function chip(k, label){ return '<button class="ibtn" style="font-size:.72rem" title="Their page, on the Hiring tab: every send, receipt and signed document" onclick="HP.open(' + keyAttr(k) + ')">' + esc(label || 'Profile') + '</button>'; }
  function panel(){
    let w = document.getElementById('hpPanel'); if(w) return w;
    w = document.createElement('div'); w.id = 'hpPanel';
    w.style.cssText = 'position:fixed;inset:0;z-index:10010;background:rgba(15,54,95,.35);display:none;align-items:flex-start;justify-content:center;padding:1rem;overflow:auto';
    w.innerHTML = '<div id="hpBody" style="background:#fff;border-radius:12px;max-width:980px;width:100%;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.2);margin:1rem 0"></div>';
    w.addEventListener('click', e => { if(e.target === w) close(); });
    document.body.appendChild(w); return w;
  }
  function close(){ const w = document.getElementById('hpPanel'); if(w) w.style.display = 'none'; }
  /* One profile, step 2 piece 3 (2026-10-12): Profile opens the person's own page on its Hiring tab. This panel is only
     for someone with no page of their own (no application and no Hub record), and for anything that asks for it. */
  async function open(k){
    k = k || {};
    try{
      if(k.applicant_id && typeof btOpenApplicant === 'function'){ btOpenApplicant(String(k.applicant_id), 'hiring'); return; }
      if((k.candidate_id != null || k.caregiver_id != null) && typeof openPerson === 'function'){ openPerson(k, 'hiring', 'hiring'); return; }
      if(k.offer_id){
        const p = await call(Object.assign({ action:'get' }, k)), ids = p.ids || {};
        if(ids.applicant_id && typeof btOpenApplicant === 'function'){ btOpenApplicant(String(ids.applicant_id), 'hiring'); return; }
        if((ids.caregiver_id != null || ids.candidate_id != null) && typeof openPerson === 'function'){
          openPerson(ids.caregiver_id != null ? { caregiver_id: ids.caregiver_id } : { candidate_id: ids.candidate_id }, 'hiring', 'hiring'); return; }
        KEY = k; FILTER = 'all'; CUR = p; panel().style.display = 'flex'; render(); return;
      }
    }catch(e){}
    return panelOpen(k);
  }
  async function panelOpen(k){
    KEY = k; FILTER = 'all';
    const w = panel(), b = document.getElementById('hpBody'); w.style.display = 'flex';
    b.innerHTML = '<div class="field-note">Gathering everything on file…</div>';
    try{ CUR = await call(Object.assign({ action:'get' }, k)); render(); }
    catch(e){ b.innerHTML = '<div style="color:#B91C1C">Could not open the profile: ' + esc(e.message) + '</div><div style="text-align:right;margin-top:.8rem"><button class="ibtn" onclick="HP.close()">Close</button></div>'; }
  }
  /* One profile, step 2 (2026-10-12): the same pieces drawn inside the person's own page, on its tabs.
     HP.mount(el, key, ['status','skills','docs','timeline']) */
  const MOUNTS = []; let PENDING = null;
  async function mount(el, k, parts){
    if(!el) return;
    for(let i = MOUNTS.length - 1; i >= 0; i--) if(MOUNTS[i].el === el || !MOUNTS[i].el.isConnected) MOUNTS.splice(i, 1);
    const ks = JSON.stringify(k);
    MOUNTS.push({ el, ks, parts: parts || ['status','skills','docs','timeline'] });
    if(CUR && JSON.stringify(KEY) === ks){ render(); return; }
    el.innerHTML = '<div class="field-note">Gathering everything on file…</div>';
    try{
      if(!PENDING || PENDING.ks !== ks) PENDING = { ks, p: call(Object.assign({ action:'get' }, k)) };
      const got = await PENDING.p;
      if(JSON.stringify(KEY) !== ks){ KEY = k; FILTER = 'all'; CUR = got; }
      render();
    }catch(e){ if(PENDING && PENDING.ks === ks) PENDING = null; el.innerHTML = '<div class="field-note" style="color:#B91C1C">Could not read their records: ' + esc(e.message) + '</div>'; }
  }
  function partsHtml(p, parts){
    let h = '';
    for(const part of parts){
      if(part === 'status') h += statusCard(p);
      else if(part === 'skills') h += skillsCard(p.experience);
      else if(part === 'docs') h += docsHtml(p);
      else if(part === 'timeline') h += timelineHtml(p);
      else if(part === 'journey') h += journeyCard(p);
    }
    return h;
  }
  /* 2026-10-21 (Samantha: "where can krystal find the uncovered info"): the signed PDF never prints the SSN or date of birth, so
     the background-details card gets a Reveal button that opens their Step 1 office view at the Reveal box (reason, five
     minutes, logged by the server). */
  function revealBtn(p, d){
    const oid = (p.ids || {}).offer_id;
    if(!oid || !/Details for the Background Check/i.test(d.label || '')) return '';
    return '<a class="ibtn" style="text-decoration:none;white-space:nowrap" href="step1.html?review=' + esc(oid) + '#reveal" target="_blank" rel="noopener" title="Opens their Step 1 at the Reveal box: type why, then the number shows for five minutes. Every reveal is logged.">&#128274; Reveal SSN / DOB</a>';
  }
  function docsHtml(p){
    const docs = p.documents || [];
    return '<div style="margin-top:.8rem"><b style="color:#0D365F">Signed documents and proofs</b> <span class="field-note">(' + docs.length + ') · each opens by a five-minute link; every open is logged with your name</span>'
      + (docs.length ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:.35rem;margin-top:.4rem">' + docs.map((d, i) =>
          '<div style="border:1px solid #E8E2D8;border-radius:8px;padding:.4rem .55rem;display:flex;gap:.5rem;align-items:center"><span style="flex:1;font-size:.82rem"><b>' + esc(d.label) + '</b>'
          + (d.at ? '<br><span class="field-note">' + esc(central(d.at)) + '</span>' : '') + '</span>' + revealBtn(p, d) + '<button class="ibtn" onclick="HP.doc(' + i + ',this)">Open</button></div>').join('') + '</div>'
        : '<div class="field-note" style="margin-top:.3rem">Nothing signed yet.</div>') + '</div>';
  }
  function timelineHtml(p){
    const tl = (p.timeline || []).filter(x => FILTER === 'all' || x.type === FILTER);
    const counts = {}; (p.timeline || []).forEach(x => { counts[x.type] = (counts[x.type] || 0) + 1; });
    return '<div style="margin-top:1rem"><b style="color:#0D365F">Everything that happened, oldest first</b> <span class="field-note">every send, receipt and completion, with who and when (Central time)</span>'
      + '<div style="display:flex;gap:.3rem;flex-wrap:wrap;margin:.4rem 0">' + [['all','All',(p.timeline || []).length]].concat(Object.keys(TYPES).filter(k => counts[k]).map(k => [k, TYPES[k][0], counts[k]])).map(([k, l, n]) =>
          '<button class="ibtn" style="font-size:.72rem;' + (FILTER === k ? 'background:#0D365F;color:#fff;border-color:#0D365F' : '') + '" onclick="HP.filter(\'' + k + '\')">' + esc(l) + ' (' + n + ')</button>').join('') + '</div>'
      + (tl.length ? '<table style="width:100%;border-collapse:collapse;font-size:.8rem"><tbody>' + tl.map(x => { const T = TYPES[x.type] || TYPES.done;
          return '<tr style="border-bottom:1px solid #F4F2ED"><td style="padding:.3rem .4rem;white-space:nowrap;color:#6E6559;vertical-align:top">' + esc(central(x.at)) + '</td>'
            + '<td style="padding:.3rem .4rem;vertical-align:top"><span style="font-size:.7rem;font-weight:700;color:' + T[1] + ';background:' + T[2] + ';border-radius:6px;padding:.05rem .4rem;white-space:nowrap">' + T[0] + '</span></td>'
            + '<td style="padding:.3rem .4rem;vertical-align:top">' + esc(x.what) + '</td><td style="padding:.3rem .4rem;color:#6E6559;vertical-align:top;white-space:nowrap">' + esc(x.by || '') + '</td></tr>'; }).join('') + '</tbody></table>'
        : '<div class="field-note">Nothing here yet.</div>') + '</div>';
  }
  function render(){
    const p = CUR; if(!p) return;
    for(let i = MOUNTS.length - 1; i >= 0; i--){ const m = MOUNTS[i]; if(!m.el.isConnected){ MOUNTS.splice(i, 1); continue; } if(m.ks === JSON.stringify(KEY)) m.el.innerHTML = partsHtml(p, m.parts); }   /* never draw one person's records into another person's page */
    const w = document.getElementById('hpPanel'), b = document.getElementById('hpBody'); if(!w || !b || w.style.display === 'none') return;
    const ids = p.ids || {};
    const phone = p.phone ? (typeof ocAttrs === 'function' ? '<a' + ocAttrs(p.phone) + ' style="color:var(--teal);text-decoration:none">&#128222; ' + esc(p.phone) + '</a>' : '&#128222; ' + esc(p.phone)) : '';
    let h = '<div style="display:flex;gap:.6rem;align-items:flex-start;flex-wrap:wrap;border-bottom:2px solid #E8E2D8;padding-bottom:.7rem">'
      + '<div style="flex:1;min-width:240px"><div style="font-size:1.25rem;font-weight:800;color:#0D365F">&#128100; ' + esc(p.name) + '</div>'
      + '<div style="font-size:.82rem;color:#6E6559;margin-top:.2rem;display:flex;gap:.7rem;flex-wrap:wrap">' + phone + (p.email ? '<span>&#9993;&#65039; ' + esc(p.email) + '</span>' : '')
      + (p.position ? '<span>' + esc(p.position) + '</span>' : '') + (p.path ? '<span>' + (p.path === 'new' ? 'New onboarding path' : 'Old onboarding path') + '</span>' : '') + '</div>'
      + '<div style="margin-top:.45rem"><b style="font-size:.86rem;color:#0D365F">Where they are:</b> <span style="font-size:.86rem">' + esc(p.where) + '</span></div></div>'
      + '<div style="display:flex;gap:.35rem;flex-wrap:wrap">'
      + (ids.offer_id && p.path === 'new' && window.CRX ? '<button class="ibtn" onclick="HP.close();CRX.open(\'' + esc(ids.offer_id) + '\')">&#9776; Readiness card</button>' : '')
      + (ids.applicant_id && typeof apOpenProfile === 'function' ? '<button class="ibtn" onclick="HP.close();HP.openApplication(\'' + esc(ids.applicant_id) + '\')">Their application</button>' : '')
      + '<button class="ibtn" onclick="HP.close()">Close</button></div></div>';
    h += partsHtml(p, ['status','skills','docs','timeline']);
    b.innerHTML = h;
  }
  /* WHERE THEY ARE (Samantha 2026-10-11: "which steps have been completed, which step the applicant is currently on, what
     information they've submitted, which forms are signed or still outstanding, any missing information or required
     follow-up, what happens next and who is responsible"). One card. From Background & References on, the readiness card
     answers (the same call as its button), so the two never disagree. Signed documents are read-only. */
  const RAIL_TO_STAGE = { screening: 7, approval: 7, step2: 8, orientation: 9, training: 10, ready: 11, active: 11 };
  const ownerWords = o => !o ? 'the Hub' : typeof o === 'string' ? o : o.name ? o.name : o.email ? o.email : o.role === 'owner' ? 'an owner' : o.role === 'hub' ? 'the Hub (by itself)' : String(o.role || '').replace(/_/g, ' ');
  let RD = null;
  async function loadReadiness(jid){
    if(!jid || typeof sb === 'undefined') return;
    try{ const r = await sb.functions.invoke('caregiver-journey', { body: { action:'get', journey_id: jid } }); RD = (r.data && r.data.view) ? r.data : null; }catch(_){ RD = null; }
    if(RD && CUR && CUR.ids && CUR.ids.journey_id === jid) render();
  }
  function mergedStatus(st){
    if(!st || !st.readiness || !RD) return st;
    const v = RD.view, out = JSON.parse(JSON.stringify(st));
    const byStage = {}; (v.rail || []).forEach(r => { const i = RAIL_TO_STAGE[r.key]; if(i == null) return; (byStage[i] = byStage[i] || []).push(r.state); });
    Object.entries(byStage).forEach(([i, sts]) => { out.stages[i].state = sts.every(x => x === 'done') ? 'done' : 'todo'; out.stages[i].note = ''; });
    if(v.complete) out.stages[11].state = 'done';
    out.stages.forEach(x => { if(x.state === 'current') x.state = 'todo'; });
    const cur = out.stages.findIndex(x => x.state === 'todo'); if(cur >= 0){ out.stages[cur].state = 'current'; out.current = out.stages[cur].label; } else out.current = 'Approved to Work';
    out.next = v.next ? { title: v.next.def.title, owner: ownerWords(v.next.owner), why: v.next.why || '' } : v.complete ? { title: 'Every requirement is complete', owner: 'nobody' } : out.next;
    (v.rows || []).filter(r => r.status === 'blocked' || r.status === 'attention').forEach(r => out.missing.push(r.def.title + (r.why ? ': ' + r.why : '')));
    return out;
  }
  function statusCard(p){
    let st = p.status; if(!st) return '';
    if(st.readiness && st.journey_id && (!RD || !RD.journey || RD.journey.journey_id !== st.journey_id)) { RD = null; loadReadiness(st.journey_id); }
    st = mergedStatus(st);
    const pill = (x, i) => { const c = x.state === 'done' ? ['#15803D','#DCFCE7','✓ '] : x.state === 'current' ? ['#fff','#0D365F',''] : x.state === 'na' ? ['#8A7F70','#F4F2ED',''] : ['#8A7F70','#FAF9F6',''];
      return '<span title="' + esc(x.note || '') + '" style="font-size:.7rem;font-weight:700;padding:.18rem .5rem;border-radius:999px;color:' + c[0] + ';background:' + c[1] + ';border:1px solid ' + (x.state === 'current' ? '#0D365F' : '#E8E2D8') + (x.state === 'na' ? ';text-decoration:line-through' : '') + '">' + c[2] + (i + 1) + '. ' + esc(x.label) + '</span>'; };
    let h = '<div style="margin-top:.8rem;border:1.5px solid #CFE0F1;border-radius:10px;padding:.65rem .8rem;background:#F7FAFD">'
      + '<b style="color:#0D365F">Their journey</b> <span class="field-note">from application to Approved to Work · read from the records, nothing typed</span>'
      + '<div style="display:flex;gap:.25rem;flex-wrap:wrap;margin:.5rem 0">' + st.stages.map(pill).join('') + '</div>'
      + '<div style="font-size:.86rem"><b>Now:</b> ' + esc(st.ended || st.current) + (st.stages.find(x => x.state === 'current' && x.note) ? ' <span class="field-note">(' + esc(st.stages.find(x => x.state === 'current').note) + ')</span>' : '') + '</div>';
    if(st.next && !st.next.from_readiness) h += '<div style="font-size:.86rem;margin-top:.2rem;background:#FFF7ED;border:1px solid #FCD9A8;border-radius:8px;padding:.4rem .6rem"><b>Next:</b> ' + esc(st.next.title) + ' · <b>' + esc(st.next.owner) + '</b>' + (st.next.why ? ' · ' + esc(st.next.why) : '') + '</div>';
    else if(st.next) h += '<div class="field-note" style="margin-top:.2rem">Reading the readiness card for the next step…</div>';
    if(st.missing && st.missing.length) h += '<div style="font-size:.82rem;margin-top:.45rem"><b>Missing or follow-up</b><ul style="margin:.2rem 0 0;padding-left:1.1rem">' + st.missing.map(m => '<li>' + esc(m) + '</li>').join('') + '</ul></div>';
    /* 2026-10-13 (her ruling, 19 CSR 15-7.021(24)(B)5): Client Rights signed in Step 1, explained at the Orientation Video Call */
    const rr = RD && RD.journey && RD.journey.journey_id === st.journey_id ? (RD.view.rows || []).find(r => r.key === 'cg.step2.participant_rights') : null;
    if(rr && window.CRX && CRX.rightsWords){ const w = CRX.rightsWords(RD.facts && RD.facts.rights, rr.st && rr.st.evidence);
      h += '<div class="hp-rights" style="font-size:.82rem;margin-top:.45rem"><b>Client Rights, Code of Ethics and HIPAA</b> <span class="field-note">signed in Step 1, explained at the Orientation Video Call, before the first shift</span><div style="color:' + (w.state === 'complete' ? '#15803D' : '#B45309') + '">' + (w.state === 'complete' ? '✓ ' : '○ ') + esc(w.text) + '</div></div>'; }
    const oid = (p.ids || {}).offer_id;
    if(st.step1) h += '<div style="font-size:.82rem;margin-top:.45rem"><b>Step 1 forms</b> <span class="field-note">signed forms are read-only and never change; open them under Signed documents below</span>'
      + (oid ? ' <button class="ibtn" style="font-size:.74rem" onclick="HP.step1(\'' + esc(oid) + '\',this)">&#128065; See their Step 1 screens</button>' : '')
      + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:.2rem .8rem;margin-top:.2rem">' + st.step1.forms.map(f => { const S1 = { signed:['Signed','#15803D','#DCFCE7'], in_progress:['In Progress','#92400E','#FEF3C7'], not_started:['Not Started','#6E6559','#F4F2ED'], needs_attention:['Needs Attention','#B91C1C','#FEE2E2'] }[f.state || (f.signed_at ? 'signed' : 'not_started')] || ['', '#6E6559', '#F4F2ED'];
          /* 2026-10-13 (Samantha): each form's own status, and an office person can open a signed form at once, before Step 1 is finished */
          return '<div><span style="font-size:.68rem;font-weight:700;color:' + S1[1] + ';background:' + S1[2] + ';border-radius:6px;padding:.05rem .4rem">' + S1[0] + '</span> ' + esc(f.title)
            + (f.signed_at ? ' <span class="field-note">' + esc(central(f.signed_at)) + '</span>' : '') + (f.why ? ' <span class="field-note" style="color:#B91C1C">' + esc(f.why) + '</span>' : '')
            + (oid && (f.signed_at || f.state === 'in_progress') ? ' <a class="field-note" href="step1.html?review=' + esc(oid) + '" target="_blank" rel="noopener">open</a>' : '') + '</div>'; }).join('') + '</div></div>'
      + (oid ? '<div class="hp-s1" data-offer="' + esc(oid) + '" style="display:none;margin-top:.5rem"></div>' : '');
    const sub = st.submitted || {};
    h += '<div class="field-note" style="margin-top:.45rem">What they gave us: ' + [sub.application_at ? 'application ' + central(sub.application_at) + (sub.screen_grade ? ' (screening ' + esc(sub.screen_grade) + ')' : '') : 'no application on file', sub.interview_answers ? 'interview answers' : '', sub.step1_answers ? 'Step 1 answers' : '', sub.references_listed ? sub.references_listed + ' reference' + (sub.references_listed === 1 ? '' : 's') : ''].filter(Boolean).join(' · ')
      + '. To correct contact details, checks or references, use Background &amp; References (editable); signed documents are never edited.</div>';
    return h + '</div>';
  }
  /* 2026-10-13 (Samantha: "show every Step 1 screen ... along with the applicant's answers ... see the complete journey
     without jumping between systems"): the real Step 1 page in its read-only office view, inside the profile. */
  function step1(offerId, btn){
    const sel = '.hp-s1[data-offer="' + offerId + '"]'; let up = btn; while(up && !(up.querySelector && up.querySelector(sel))) up = up.parentElement;
    const box = up ? up.querySelector(sel) : document.querySelector(sel);
    if(!box) return;
    if(box.style.display !== 'none'){ box.style.display = 'none'; box.innerHTML = ''; if(btn) btn.innerHTML = '&#128065; See their Step 1 screens'; return; }
    box.style.display = 'block'; if(btn) btn.textContent = 'Hide their Step 1 screens';
    box.innerHTML = '<div class="field-note" style="margin-bottom:.3rem">The screens they saw, with their own answers. Read only; every look is logged with your name. <a href="step1.html?review=' + esc(offerId) + '" target="_blank" rel="noopener">Open in its own tab</a></div>'
      + '<iframe src="step1.html?review=' + esc(offerId) + '" title="Their Step 1, office view" style="width:100%;max-width:520px;height:760px;border:1px solid #E8E2D8;border-radius:10px;background:#FAF9F6"></iframe>';
  }
  /* 2026-10-13: the whole journey on one card, step by step, from the permanent records (the same timeline, grouped):
     application and prescreen, interview, offer, Step 1, checks and references, Step 2 in Viventium, the Orientation Video
     Call, training, Approved to Work. Nothing typed here. */
  const JSTEPS = [
    ['Application and prescreen', /^Applied|^Application:/],
    ['Interview', /interview/i],
    ['Offer', /^Offer|^They opened the offer|^They declined|Position description/],
    ['Step 1', /Step 1/],
    ['Background checks and references', /Background & References|OIG|EDL|FCSR|Case\.net|Fingerprint|^Reference|Evidence:/],
    ['Step 2 in Viventium', /Step 2/],
    ['Orientation Video Call', /Orientation Video Call/],
    ['Training', /Orientation completed|Dementia course|On-the-job|Annual training|training/i],
    ['Approved to Work', /Approved to Work|AxisCare|Hire date|First client visit/],
  ];
  function journeyCard(p){
    const tl = p.timeline || []; const groups = JSTEPS.map(([t]) => ({ t, rows: [] }));
    tl.forEach(x => { const i = JSTEPS.findIndex(([, re]) => re.test(x.what)); if(i >= 0) groups[i].rows.push(x); });
    const ids = p.ids || {};
    let h = '<div style="margin-top:.8rem;border:1px solid #E8E2D8;border-radius:10px;padding:.6rem .75rem"><b style="color:#0D365F">The whole journey, step by step</b> <span class="field-note">every send, answer and completion from the records, newest last; the full list is on History</span>'
      + (ids.offer_id && p.path === 'new' && window.CRX ? ' <button class="ibtn" style="font-size:.74rem" onclick="CRX.open(\'' + esc(ids.offer_id) + '\')">&#9776; Readiness card: every requirement, who owns it, Approve to Work</button>' : '');
    h += groups.map(g => '<div style="margin-top:.5rem"><div style="font-size:.8rem;font-weight:800;color:' + (g.rows.length ? '#0D365F' : '#8A7F70') + '">' + esc(g.t) + (g.rows.length ? '' : ' <span class="field-note">nothing yet</span>') + '</div>'
      + g.rows.slice(-6).map(x => { const T = TYPES[x.type] || TYPES.done; return '<div style="font-size:.78rem;margin:.1rem 0 0 .6rem"><span style="color:#6E6559">' + esc(central(x.at)) + '</span> <span style="font-size:.66rem;font-weight:700;color:' + T[1] + ';background:' + T[2] + ';border-radius:6px;padding:0 .35rem">' + T[0] + '</span> ' + esc(x.what) + (x.by ? ' <span class="field-note">' + esc(x.by) + '</span>' : '') + '</div>'; }).join('')
      + (g.rows.length > 6 ? '<div class="field-note" style="margin-left:.6rem">and ' + (g.rows.length - 6) + ' earlier on History</div>' : '') + '</div>').join('');
    return h + '</div>';
  }
  /* 2026-10-11 (Samantha: "Everything collected here must feed into the caregiver's matching profile ... I don't want these
     answers stored in a document that our Care Coordinators have to search for later"): one card, task by task, from their
     Step 1 jobs and family care and their references' answers. Their own word stays self-reported until someone confirms it. */
  const STAND = { confirmed:['Confirmed','#15803D','#DCFCE7'], supported:['Believed, not seen','#92400E','#FEF3C7'], questioned:['A reference did not see it','#B91C1C','#FEE2E2'], self_reported:['Self-reported','#3A342C','#F4F2ED'] };
  function skillsCard(x){
    if(!x || (!(x.skills || []).length && !(x.restrictions || []).length && !(x.strengths || []).length)) return '';
    const c = x.counts || {}, sk = x.skills || [];
    let h = '<div style="margin-top:.8rem;border:1px solid #E8E2D8;border-radius:10px;padding:.6rem .75rem">'
      + '<b style="color:#0D365F">Skills and experience</b> ' + (x.practice ? '<span style="font-size:.7rem;font-weight:700;color:#B45309;background:#FFF7ED;border-radius:6px;padding:.05rem .4rem">PRACTICE</span> ' : '')
      + '<span class="field-note">' + sk.length + ' task' + (sk.length === 1 ? '' : 's') + (sk.length ? ': ' + [c.confirmed ? c.confirmed + ' confirmed' : '', c.supported ? c.supported + ' believed' : '', c.self_reported ? c.self_reported + ' self-reported' : '', c.questioned ? c.questioned + ' to talk through' : ''].filter(Boolean).join(' · ') : '') + '</span>';
    if(sk.length) h += '<table style="width:100%;border-collapse:collapse;font-size:.8rem;margin-top:.4rem"><tbody>' + sk.map(l => { const S = STAND[l.standing] || STAND.self_reported;
        return '<tr style="border-bottom:1px solid #F4F2ED"><td style="padding:.3rem .4rem;vertical-align:top;font-weight:600">' + esc(l.label) + (l.lifts && l.lifts.length ? '<br><span class="field-note">' + esc(l.lifts.join(', ')) + '</span>' : '') + '</td>'
          + '<td style="padding:.3rem .4rem;vertical-align:top;color:#3A342C">' + l.places.map(esc).join('<br>') + (l.confirmations || []).map(k => '<br><span class="field-note">' + esc(k.by) + ': ' + esc(k.said) + '</span>').join('') + '</td>'
          + '<td style="padding:.3rem .4rem;vertical-align:top;white-space:nowrap"><span style="font-size:.7rem;font-weight:700;color:' + S[1] + ';background:' + S[2] + ';border-radius:6px;padding:.05rem .4rem">' + S[0] + '</span>'
          + (l.refresher ? '<br><span style="font-size:.7rem;font-weight:700;color:#B45309">Wants a refresher first</span>' : '') + '</td></tr>'; }).join('') + '</tbody></table>';
    const line = (t, arr) => (arr || []).length ? '<div style="font-size:.8rem;margin-top:.45rem"><b>' + t + '</b><br>' + arr.map(esc).join('<br>') + '</div>' : '';
    h += line('Restrictions', x.restrictions) + line('Strengths', x.strengths);
    const refs = (x.references || []).filter(r => r.tasks || r.comfortable);
    if(refs.length) h += line('From their references (general feedback, not a skill sign-off)', refs.map(r => r.name + (r.comfortable ? ': comfortable with similar care for someone they care about: ' + r.comfortable : '') + (r.comfortable_why ? ' ("' + r.comfortable_why + '")' : '')));
    if((x.backups || []).length) h += line('Backup references', x.backups.map(r => r.type + ': ' + r.name + ' (' + r.relationship + ')' + (r.phone ? ' ' + r.phone : '') + (r.email ? ' ' + r.email : '') + (r.may_contact === 'no' ? ', do not contact' : '')));
    return h + '<div class="field-note" style="margin-top:.4rem">' + esc(x.note || '') + ' A reference who does not answer never means they lack the skill.</div></div>';
  }
  async function doc(i, btn){
    const d = CUR && (CUR.documents || [])[i]; if(!d) return;
    if(btn){ btn.disabled = true; btn.textContent = 'Opening…'; }
    try{ const r = await call(Object.assign({ action:'doc', ref:d.ref }, KEY)); window.open(r.url, '_blank', 'noopener'); }
    catch(e){ alert('Could not open it: ' + e.message); }
    finally{ if(btn){ btn.disabled = false; btn.textContent = 'Open'; } }
  }
  function openApplication(id){
    if(typeof apOpenProfile !== 'function') return;
    if(typeof AP_ROWS !== 'undefined' && AP_ROWS.some(x => String(x.id) === String(id))) return apOpenProfile(id);
    if(typeof switchTab === 'function') try{ switchTab('applicants'); }catch(_){}
    if(typeof apLoad === 'function') Promise.resolve(apLoad()).then(() => apOpenProfile(id)).catch(() => {});
  }
  /* the offer cards: how far their Step 1 is, filled in after the cards draw (one call for every card on screen) */
  let filling = false;
  async function fillOfferProgress(){
    if(filling || typeof sb === 'undefined') return;
    const spans = [...document.querySelectorAll('.hp1[data-offer]:not([data-filled])')]; if(!spans.length) return;
    filling = true;
    try{
      const ids = [...new Set(spans.map(s => s.dataset.offer))];
      const r = await call({ action:'step1_progress', offer_ids: ids });
      spans.forEach(s => { const p = (r.progress || {})[s.dataset.offer]; s.dataset.filled = '1'; if(!p){ s.textContent = ''; return; }
        s.textContent = p.completed_at ? 'Complete ' + central(p.completed_at) + '.'
          : (p.sent_at ? 'Sent ' + central(p.sent_at) + (p.practice ? ' (practice: recorded, not sent)' : '') + '. ' : 'Not sent yet. ')
            + (p.started_at ? 'Opened ' + central(p.started_at) + '; ' + p.signed + ' of ' + p.forms + ' forms signed.' : 'Not opened yet.'); });
    }catch(e){ spans.forEach(s => { s.dataset.filled = '1'; s.textContent = '(how far they are could not be read: ' + e.message + ')'; }); }
    finally{ filling = false; }
  }
  function watch(){ const box = document.getElementById('offersList'); if(!box || box.dataset.hpWatch) return; box.dataset.hpWatch = '1'; new MutationObserver(() => fillOfferProgress()).observe(box, { childList:true, subtree:true }); fillOfferProgress(); }
  document.addEventListener('DOMContentLoaded', watch); setInterval(watch, 3000);
  window.HP = { open, panel: panelOpen, close, chip, doc, mount, step1, filter: k => { FILTER = k; render(); }, openApplication, fillOfferProgress };
})();
