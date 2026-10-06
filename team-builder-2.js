/* Team Builder, Stage 2 (2026-10-06, her "start stage 2"; the Ed Anderson plan showed why: nobody could see who had been
   asked, what they said, or how many of the 14 shifts were actually confirmed).
   - SEVERAL PEOPLE PER SHIFT. The cell keeps its one main person (plan.cells[key], what the AxisCare preview and Send
     Text Asking read). Everyone else asked about that shift sits in plan.options[key], each with an answer: penciled,
     asked, maybe, yes, no, no reply, plus who recorded it and when. A Yes becomes the main person; whoever was main
     before stays on the list. Only one Yes per shift.
   - READINESS: each shift row says "N of 7 confirmed", and only a confirmed Yes counts. When every shift is confirmed,
     the linked project's "Every shift confirmed" step ticks itself (and reopens if a Yes is taken back).
   - OFFERED APPLICANTS: people who accepted an offer and haven't started are listed under the roster as "starts after
     onboarding". They can be added to a shift and called; they can't be texted from here or sent to AxisCare until
     they're on the AxisCare roster.
   - SKILL FIT: the plan says what the client needs (Hoyer lift, bedbound care, transfers). Each caregiver shows yes / no
     / not on file for each, from their skills record, and a missing answer can be recorded right there.
   Nothing here texts or emails anyone. */
(function(){
  const esc = s => escapeHtmlComms(s);
  const nk = s => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
  const NEEDS = [['hoyer_lift', 'Hoyer lift'], ['bedbound_care', 'Bedbound care'], ['transfers_gait_belt', 'Transfers / gait belt']];
  const ANSWER = { penciled:['penciled', '#475569', '#F1F5F9'], asked:['asked', 'var(--honey-ink)', '#FFF4E3'], maybe:['maybe', '#7C3AED', '#F3EEFF'],
    yes:['yes ✓', 'var(--green)', 'var(--green-bg)'], no:['no', 'var(--red)', '#FDE8E8'], no_reply:['no reply', '#8A4E0C', '#FFF4E3'] };
  const me = () => (typeof ME !== 'undefined' && (ME.name || ME.email)) || '';
  const now = () => new Date().toISOString();

  /* everyone on one shift: the main person first, then the others */
  function people(plan, key){
    const out = [], c = (plan.cells || {})[key];
    if(c) out.push(Object.assign({ main:true, pid:'main' }, c));
    ((plan.options || {})[key] || []).forEach(o => out.push(Object.assign({ main:false, pid:o.id }, o)));
    return out;
  }
  function same(a, b){ return (a.cg_ax_id && b.cg_ax_id) ? String(a.cg_ax_id) === String(b.cg_ax_id)
    : (a.applicant_id && b.applicant_id) ? String(a.applicant_id) === String(b.applicant_id) : nk(a.name) === nk(b.name); }

  /* add someone to a shift: the first person is the main one, everyone after joins the list */
  async function add(key, person){
    const plan = tbPlan(); if(!plan) return;
    plan.cells = plan.cells || {}; plan.options = plan.options || {};
    const rec = Object.assign({ status:'penciled', at:now(), by:me() }, person);
    if(people(plan, key).some(p => same(p, rec))){ ccToast(rec.name + ' is already on this shift.'); return; }
    if(!plan.cells[key]){ delete rec.id; plan.cells[key] = rec; }
    else { rec.id = 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); (plan.options[key] = plan.options[key] || []).push(rec); }
    await tbSave(plan); tbRender(); sync(plan);
  }
  function addPool(key, i){ const cg = Array.isArray(TB.pool) ? TB.pool[i] : null; if(cg) add(key, { name:String(cg.name), cg_ax_id:String(cg.axiscare_id || '') || undefined }); }
  function addApplicant(key, id){
    const a = (APPS.rows || []).find(x => String(x.id) === String(id)); if(!a) return;
    add(key, { name:[a.first_name, a.last_name].filter(Boolean).join(' '), applicant_id:String(a.id), starts:a.start_date || null });
  }

  /* an answer for one person on one shift */
  async function answer(key, pid, status){
    const plan = tbPlan(); if(!plan) return;
    plan.options = plan.options || {};
    const list = plan.options[key] = plan.options[key] || [];
    const main = (plan.cells || {})[key];
    if(pid === 'main'){
      if(!main) return;
      if(status === null){                                     // remove the main person: the next one up takes the spot
        const next = list.shift();
        if(next){ delete next.id; plan.cells[key] = next; } else delete plan.cells[key];
      } else { main.status = status; main.at = now(); main.by = me(); }
    } else {
      const k = list.findIndex(o => o.id === pid); if(k < 0) return;
      if(status === null) list.splice(k, 1);
      else if(status === 'yes'){
        const o = list[k];
        if(main && main.status === 'yes' && !confirm(main.name + ' is already confirmed for this shift. Make ' + o.name + ' the confirmed one instead? ' + main.name + ' stays on the list as a maybe.')) return;
        list.splice(k, 1);
        if(main) list.unshift(Object.assign({}, main, { id:'o' + Date.now().toString(36), status:main.status === 'yes' ? 'maybe' : main.status }));
        delete o.id; o.status = 'yes'; o.at = now(); o.by = me(); plan.cells[key] = o;
      } else { list[k].status = status; list[k].at = now(); list[k].by = me(); }
    }
    if(!list.length) delete plan.options[key];
    await tbSave(plan); tbRender(); if(typeof swRenderBar === 'function') swRenderBar(); sync(plan);
  }

  /* ── readiness ── */
  function readiness(plan){
    const days = plan.days || [];
    return (plan.slots || []).map(s => ({ slot:s, total:days.length,
      yes:days.filter(d => { const c = (plan.cells || {})[tbCellKey(d, s.k)]; return c && c.status === 'yes'; }).length }));
  }
  function readinessWords(plan){ return readiness(plan).map(r => r.slot.label + ' ' + r.yes + ' of ' + r.total).join(' · ') + ' confirmed'; }
  function allConfirmed(plan){ const r = readiness(plan); return r.length > 0 && r.every(x => x.total > 0 && x.yes === x.total); }
  function projectFor(plan){
    return ((typeof DATA !== 'undefined' && DATA.ops_items) || []).find(i => i && i.kind === 'project' && i.status === 'open' && (i.id === plan.project_id || i.plan_id === plan.id)) || null;
  }
  /* the project's "Every shift confirmed" step follows the board */
  async function sync(plan){
    const p = projectFor(plan); if(!p || typeof pjAutoStep !== 'function') return;
    await pjAutoStep(p.id, 'shifts', allConfirmed(plan), readinessWords(plan));
  }

  /* ── offered applicants (accepted an offer, not on the AxisCare roster yet) ── */
  const APPS = { rows:null, loading:false, err:'' };
  async function loadApps(){
    if(APPS.loading || APPS.rows) return; APPS.loading = true;
    try{
      const { data, error } = await sb.from('job_applicants').select('*').in('status', ['offer', 'hired']).is('left_at', null).limit(300);
      if(error) throw error;
      const onRoster = new Set((Array.isArray(TB.pool) ? TB.pool : []).map(g => nk(g.name)));
      APPS.rows = (data || []).filter(a => !onRoster.has(nk((a.first_name || '') + (a.last_name || ''))))
        .filter(a => a.status === 'offer' || !a.start_date || (Date.now() - Date.parse(a.start_date + 'T12:00:00')) < 28 * 864e5);
    }catch(e){ APPS.rows = []; APPS.err = String(e.message || e); }
    APPS.loading = false;
    try{ const el = document.getElementById('tbPoolList'), p = tbPlan(); if(el && p && TB.cellOpen) el.innerHTML = tbPoolListHtml(p, TB.cellOpen); }catch(e){}
  }
  function appsHtml(plan, key){
    if(!APPS.rows){ loadApps(); return '<div class="field-note" style="padding:6px 0;">Loading people with an offer…</div>'; }
    const q = nk(TB.poolQ || ''), list = APPS.rows.filter(a => !q || nk((a.first_name || '') + (a.last_name || '')).indexOf(q) > -1);
    const head = '<div style="font-size:11.5px;font-weight:800;letter-spacing:.05em;color:var(--navy);margin:10px 0 2px;">OFFERED, STARTS AFTER ONBOARDING · ' + list.length + '</div>';
    if(APPS.err) return head + '<div class="field-note">Couldn’t load them (' + esc(APPS.err) + ').</div>';
    if(!list.length) return head + '<div class="field-note">Nobody with an accepted offer is waiting to start.</div>';
    return head + list.map(a => '<div class="tb2-app" style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;padding:5px 0;border-top:1px solid var(--border);font-size:12.5px;">'
      + '<b style="min-width:130px;">' + esc([a.first_name, a.last_name].filter(Boolean).join(' ')) + '</b>'
      + '<span class="field-note" style="flex:1;"><b style="color:#7C3AED;">starts after onboarding</b>' + (a.start_date ? ' · start date ' + esc(new Date(a.start_date + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' })) : ' · no start date yet')
      + (a.offer_position ? ' · ' + esc(a.offer_position) : '') + ' · call them; texting from here waits until they’re on the roster</span>'
      + '<button class="cara-btn ghost" style="font-size:11.5px;" onclick="tb2AddApplicant(\'' + esc(key) + '\',\'' + esc(a.id) + '\')">Add to this shift</button></div>').join('');
  }

  /* ── skill fit ── */
  function skillsOf(axId){
    if(!axId) return {};
    const ov = (DATA.caregiver_overlay || []).find(o => String(o.axiscare_id || '') === String(axId));
    const lg = (DATA.caregivers || []).find(x => String(x.axiscare_id || '') === String(axId));
    return Object.assign({}, (lg && lg.skills) || {}, (ov && ov.skills) || {});
  }
  function haveOf(sk, k){ const v = sk[k]; const h = v && typeof v === 'object' ? v.have : v; return h === 'yes' || h === true ? 'yes' : h === 'no' || h === false ? 'no' : ''; }
  /* 0 = has every need, 1 = something not on file, 2 = a need they don't have */
  function skillRank(plan, cg){
    const needs = plan.needs || []; if(!needs.length) return 0;
    const sk = skillsOf(cg.axiscare_id), h = needs.map(n => haveOf(sk, n));
    return h.indexOf('no') > -1 ? 2 : h.indexOf('') > -1 ? 1 : 0;
  }
  function skillFlags(plan, cg){
    const needs = plan.needs || []; if(!needs.length) return '';
    const sk = skillsOf(cg.axiscare_id);
    return needs.map(n => {
      const label = (NEEDS.find(x => x[0] === n) || [n, n])[1], h = haveOf(sk, n);
      if(h === 'yes') return '<b style="color:var(--green);">✓ ' + esc(label) + '</b>';
      if(h === 'no') return '<b style="color:var(--red);">✗ no ' + esc(label) + '</b>';
      return '<span style="color:#8A4E0C;font-weight:700;">' + esc(label) + '?</span>'
        + (cg.axiscare_id ? ' <button class="linklike tb2-sk" style="font-size:11px;" onclick="tb2Skill(\'' + esc(cg.axiscare_id) + '\',\'' + n + '\',\'yes\')">yes</button>/<button class="linklike" style="font-size:11px;" onclick="tb2Skill(\'' + esc(cg.axiscare_id) + '\',\'' + n + '\',\'no\')">no</button>' : '');
    }).join(' · ');
  }
  async function setSkill(axId, k, val){
    await cgdOverlaySave(axId, ov => { ov.skills = ov.skills || {};
      ov.skills[k] = { have:val, evidence:'attested', by:me(), at:now(), note:'recorded from the Team Builder' }; });
    ccToast('✓ Saved on their caregiver profile');
    const el = document.getElementById('tbPoolList'), p = tbPlan(); if(el && p && TB.cellOpen) el.innerHTML = tbPoolListHtml(p, TB.cellOpen);
  }
  async function toggleNeed(n){
    const plan = tbPlan(); if(!plan) return;
    const s = new Set(plan.needs || []); s.has(n) ? s.delete(n) : s.add(n); plan.needs = NEEDS.map(x => x[0]).filter(k => s.has(k));
    await tbSave(plan); tbRender();
  }
  function needsHtml(plan){
    const on = new Set(plan.needs || []);
    return '<div class="tb2-needs" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:0 0 8px;"><span class="field-note" style="font-weight:700;">This client needs:</span>'
      + NEEDS.map(([k, l]) => '<button class="fb' + (on.has(k) ? ' active' : '') + '" data-need="' + k + '" style="font-size:11.5px;padding:3px 9px;" onclick="tb2Need(\'' + k + '\')">' + (on.has(k) ? '✓ ' : '') + esc(l) + '</button>').join('')
      + '<span class="field-note" style="font-size:11px;">Caregivers are matched against these: yes, no, or not on file.</span></div>';
  }

  /* ── what the board draws ── */
  function readinessHtml(plan){
    const r = readiness(plan); if(!r.length) return '';
    return '<div class="tb2-ready" style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 8px;">' + r.map(x =>
      '<span style="font-size:12.5px;font-weight:800;border-radius:8px;padding:4px 10px;' + (x.yes === x.total && x.total ? 'background:var(--green-bg);color:var(--green);' : x.yes ? 'background:#FFF4E3;color:#8A4E0C;' : 'background:#FDE8E8;color:var(--red);') + '">'
      + esc(x.slot.label) + ': ' + x.yes + ' of ' + x.total + ' confirmed</span>').join('')
      + '<span class="field-note" style="font-size:11px;">Only a confirmed yes counts.</span></div>';
  }
  function rowCount(plan, s){ const x = readiness(plan).find(y => y.slot.k === s.k); return x ? '<div class="tb2-rowcount" style="font-size:10.5px;font-weight:800;color:' + (x.yes === x.total ? 'var(--green)' : 'var(--red)') + ';">' + x.yes + ' of ' + x.total + ' confirmed</div>' : ''; }
  function moreChip(plan, key){
    const o = (plan.options || {})[key] || []; if(!o.length) return '';
    const yes = o.filter(x => x.status === 'maybe').length;
    return '<div class="tb2-more" style="font-size:9.5px;font-weight:700;color:var(--navy);">+' + o.length + ' more' + (yes ? ' (' + yes + ' maybe)' : '') + '</div>';
  }
  function peopleHtml(plan, key){
    const list = people(plan, key); if(!list.length) return '';
    const b = (pid, st, label, cur) => '<button class="cara-btn' + (cur === st ? '' : ' ghost') + '" style="font-size:11px;padding:3px 8px;" onclick="tb2Answer(\'' + esc(key) + '\',\'' + esc(pid) + '\',' + (st === null ? 'null' : '\'' + st + '\'') + ')">' + label + '</button>';
    return '<div class="card tb2-people" style="padding:8px 12px;margin-bottom:8px;"><div style="font-weight:700;font-size:12.5px;color:var(--navy);margin-bottom:4px;">Asked about this shift (' + list.length + ')</div>'
      + list.map(p => {
        const a = ANSWER[p.status] || ANSWER.penciled;
        const ask = p.main && p.ask_id ? (plan.asks || []).find(x => x && x.id === p.ask_id) : null;
        return '<div class="tb2-person" data-pid="' + esc(p.pid) + '" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:6px 0;border-top:1px solid var(--border);">'
          + '<b style="min-width:120px;">' + esc(p.name) + '</b>'
          + (p.main ? '<span class="tag-chip" style="background:var(--navy);color:#fff;font-weight:700;">main</span>' : '')
          + (p.applicant_id ? '<span class="tag-chip" style="background:#F3EEFF;color:#7C3AED;font-weight:700;">starts after onboarding</span>' : '')
          + '<span class="tag-chip" style="background:' + a[2] + ';color:' + a[1] + ';font-weight:700;">' + a[0] + '</span>'
          + '<span class="field-note" style="font-size:11px;">' + esc((p.status === 'asked' && p.ask_channel === 'sms' ? 'texted ' : '') + (p.at ? tbAgo(p.at) : '') + (p.by ? ' by ' + String(p.by).split(' ')[0] : '')) + '</span>'
          + '<span style="flex:1;"></span>'
          + (p.main && p.status !== 'yes' && !p.applicant_id ? '<button class="cara-btn" style="font-size:11px;padding:3px 8px;" onclick="tbAskOpen(\'' + esc(key) + '\')">💬 Text</button>' : '')
          + b(p.pid, 'asked', '📞 Asked', p.status) + b(p.pid, 'yes', '✓ Yes', p.status) + b(p.pid, 'maybe', 'Maybe', p.status) + b(p.pid, 'no', '✗ No', p.status) + b(p.pid, 'no_reply', 'No reply', p.status) + b(p.pid, null, 'Remove', '')
          + (ask ? '<details style="flex-basis:100%;font-size:12px;"><summary style="cursor:pointer;color:var(--teal);font-weight:700;">The text we sent</summary><div style="white-space:pre-wrap;background:#F8FAFC;border:1px solid var(--border);border-radius:8px;padding:6px 9px;margin-top:4px;">' + esc(ask.text) + '</div></details>' : '')
          + '</div>';
      }).join('')
      + '<div class="field-note" style="font-size:11px;margin-top:4px;">Add more people from the list below. A Yes becomes the main person for this shift; only one Yes per shift.' + (list.length > 1 ? ' Texting from here goes to the main person; text the others from GoHighLevel for now.' : '') + '</div></div>';
  }
  /* the line on a project card: how the linked board stands */
  function projectLine(p){
    const plan = ((typeof DATA !== 'undefined' && DATA.staffing_plans) || []).find(x => x && (x.id === p.plan_id || x.project_id === p.id));
    if(!plan) return '';
    return '<div class="tb2-pjline" style="margin-top:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' + readinessHtml(plan).replace('margin:0 0 8px', 'margin:0')
      + '<button class="ghost" style="padding:4px 10px;font-size:12px;" onclick="tb2OpenPlan(\'' + esc(plan.id) + '\')">Open the Team Builder</button></div>';
  }
  function openPlan(id){ try{ switchTab('hourswatch'); }catch(e){} try{ swSubGo('builder'); }catch(e){} tbOpen(id); }

  Object.assign(window, { tb2People:people, tb2Add:add, tb2AddPool:addPool, tb2AddApplicant:addApplicant, tb2Answer:answer,
    tb2Readiness:readiness, tb2ReadinessWords:readinessWords, tb2AllConfirmed:allConfirmed, tb2Sync:sync,
    tb2AppsHtml:appsHtml, tb2SkillRank:skillRank, tb2SkillFlags:skillFlags, tb2Skill:setSkill, tb2Need:toggleNeed, tb2NeedsHtml:needsHtml,
    tb2ReadinessHtml:readinessHtml, tb2RowCount:rowCount, tb2MoreChip:moreChip, tb2PeopleHtml:peopleHtml, tb2ProjectLine:projectLine,
    tb2OpenPlan:openPlan, TB2_APPS:APPS, TB2_ANSWER:ANSWER });
})();
