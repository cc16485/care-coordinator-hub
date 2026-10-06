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
    const sent = !!(plan.axiscare_push && (plan.axiscare_push.created || []).length);
    if(sent) await pjAutoStep(p.id, 'axis', true, 'schedules created in AxisCare from this board');
  }

  /* ── a plan as a project on My Work (2026-10-06, Samantha: "maybe we should just be able to make a team builder a
     project that will show up under my work"). The project and the plan are linked both ways; the project's conversation,
     team and Act Now all apply, and its shift step follows the board. ── */
  function anyProject(plan){
    const all = ((typeof DATA !== 'undefined' && DATA.ops_items) || []).filter(i => i && i.kind === 'project' && (i.id === plan.project_id || i.plan_id === plan.id));
    return all.find(i => i.status === 'open') || all[0] || null;
  }
  function crew(){ const r = (typeof CC_ROLE_BY_EMAIL !== 'undefined' && CC_ROLE_BY_EMAIL) || {}; return Object.keys(r).filter(e => (r[e] || []).length).sort(); }
  function nameOf(e){ try{ return (typeof opsOwnerName === 'function' && opsOwnerName(e)) || String(e).split('@')[0]; }catch(_){ return String(e).split('@')[0]; } }
  function defaultOwner(){
    const r = (typeof CC_ROLE_BY_EMAIL !== 'undefined' && CC_ROLE_BY_EMAIL) || {}, mine = String((ccActor() || {}).email || '').toLowerCase();
    if((r[mine] || []).indexOf('care_coordinator') > -1) return mine;
    return Object.keys(r).filter(e => (r[e] || []).indexOf('care_coordinator') > -1).sort()[0] || mine;
  }
  function shiftWords(plan){
    const dl = (plan.days || []).length === 7 ? '7 days a week' : (plan.days || []).map(d => TB_DAYL[d]).join(', ');
    return (plan.slots || []).map(s => tbT12(s.start) + '–' + tbT12(s.end)).join(' and ') + (dl ? ', ' + dl : '');
  }
  function inDays(n){ const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  async function makeProject(planId, o){
    const plan = (DATA.staffing_plans || []).find(x => x && x.id === planId); if(!plan || typeof pjBuild !== 'function') return null;
    const had = anyProject(plan); if(had && had.status === 'open'){ ccToast('This plan is already a project on My Work.'); return had; }
    o = o || {};
    const kind = o.kind === 'client_start' ? 'client_start' : 'care_team';
    const pj = pjBuild({ template:kind, title:plan.client + (kind === 'client_start' ? ' coming home' : ' care team'), about:plan.client,
      owner:o.owner || defaultOwner(), ready_by:o.ready_by || inDays(7), shifts:shiftWords(plan), plan_id:plan.id });
    (DATA.ops_items = DATA.ops_items || []).push(pj);
    if(typeof opsLog === 'function') opsLog(pj, 'Project made from the Team Builder plan by ' + ((ccActor() || {}).name || ''));
    await persist('ops_items', pj);
    opEvent('item_created', { item:pj, summary:'New project from the Team Builder: ' + pj.title });
    plan.project_id = pj.id; await tbSave(plan);
    ccToast('✓ On My Work as a project');
    await sync(plan);
    return pj;
  }
  function makeOpen(planId, anchor){
    const plan = (DATA.staffing_plans || []).find(x => x && x.id === planId); if(!plan) return;
    const own = defaultOwner();
    const el = ccPopOpen(anchor || document.body,
      '<div style="font-size:14px;font-weight:800;color:var(--navy);">Put ' + esc(plan.client) + '’s plan on My Work</div>'
      + '<div class="field-note" style="margin:3px 0 8px;">It becomes a project: the team sees it on My Work, talks in its conversation, and its shift step follows this board.</div>'
      + '<div class="field-note">Kind</div><select id="tb2K" style="width:100%;padding:6px;font-size:13px;"><option value="care_team">Just this care team (shifts confirmed, then AxisCare)</option><option value="client_start">Client start / coming home (all the steps)</option></select>'
      + '<div style="display:flex;gap:8px;margin-top:8px;"><div style="flex:1;"><div class="field-note">Owner</div><select id="tb2O" style="width:100%;padding:6px;font-size:13px;">' + crew().map(e => '<option value="' + esc(e) + '"' + (e === own ? ' selected' : '') + '>' + esc(nameOf(e)) + '</option>').join('') + '</select></div>'
      + '<div style="flex:1;"><div class="field-note">Ready by</div><input id="tb2R" type="date" value="' + inDays(7) + '" style="width:100%;padding:5px;font-size:13px;"></div></div>'
      + '<div style="display:flex;gap:8px;margin-top:12px;"><button class="primary" id="tb2Go" style="padding:6px 12px;font-size:13px;">Put it on My Work</button><button class="ghost" id="tb2No" style="padding:6px 12px;font-size:13px;">Cancel</button></div>', { width:400 });
    el.querySelector('#tb2No').onclick = ccPopClose;
    el.querySelector('#tb2Go').onclick = async () => {
      const o = { kind:el.querySelector('#tb2K').value, owner:el.querySelector('#tb2O').value, ready_by:el.querySelector('#tb2R').value };
      if(!o.ready_by){ ccToast('Pick a ready-by date'); return; }
      ccPopClose(); await makeProject(planId, o); tbRender();
    };
  }
  function projectBoxHtml(plan){
    const p = anyProject(plan);
    if(p && p.status === 'open') return '<span class="tb2-pjbox" style="font-size:12px;font-weight:700;color:var(--navy);background:#E8F0FB;border-radius:7px;padding:3px 9px;">On My Work: ' + esc(p.title || '') + ' · ' + esc(String(nameOf(p.owner)).split(' ')[0]) + ' owns it</span>'
      + '<button class="cara-btn ghost" style="font-size:11.5px;" onclick="pjOpen(\'' + esc(p.id) + '\')">Open the project</button>';
    return '<button class="cara-btn tb2-make" style="font-size:11.5px;" onclick="tb2MakeOpen(\'' + esc(plan.id) + '\',this)">Make this a project on My Work</button>'
      + (p ? '<span class="field-note" style="font-size:11px;">(its last project is closed)</span>' : '');
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
  function readinessHtml(plan, noButton){
    const r = readiness(plan); if(!r.length) return '';
    return '<div class="tb2-ready" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 8px;">' + r.map(x =>
      '<span style="font-size:12.5px;font-weight:800;border-radius:8px;padding:4px 10px;' + (x.yes === x.total && x.total ? 'background:var(--green-bg);color:var(--green);' : x.yes ? 'background:#FFF4E3;color:#8A4E0C;' : 'background:#FDE8E8;color:var(--red);') + '">'
      + esc(x.slot.label) + ': ' + x.yes + ' of ' + x.total + ' confirmed</span>').join('')
      + '<span class="field-note" style="font-size:11px;">Only a confirmed yes counts.</span>'
      + (!noButton && textable(plan).length ? '<span style="flex:1;"></span><button class="cara-btn tb2-several-btn" style="font-size:12px;" onclick="tb2TextSeveral()">💬 Text several people</button>' : '') + '</div>';
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
          + (p.status !== 'yes' && !p.applicant_id ? '<button class="cara-btn tb2-text" style="font-size:11px;padding:3px 8px;" onclick="' + (p.main ? 'tbAskOpen(\'' + esc(key) + '\')' : 'tb2TextSeveral(\'' + esc(key) + '\')') + '">💬 Text</button>' : '')
          + b(p.pid, 'asked', '📞 Asked', p.status) + b(p.pid, 'yes', '✓ Yes', p.status) + b(p.pid, 'maybe', 'Maybe', p.status) + b(p.pid, 'no', '✗ No', p.status) + b(p.pid, 'no_reply', 'No reply', p.status) + b(p.pid, null, 'Remove', '')
          + (ask ? '<details style="flex-basis:100%;font-size:12px;"><summary style="cursor:pointer;color:var(--teal);font-weight:700;">The text we sent</summary><div style="white-space:pre-wrap;background:#F8FAFC;border:1px solid var(--border);border-radius:8px;padding:6px 9px;margin-top:4px;">' + esc(ask.text) + '</div></details>' : '')
          + '</div>';
      }).join('')
      + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px;">' + (list.filter(p => !p.applicant_id && p.status !== 'yes').length > 1 ? '<button class="cara-btn tb2-textall" style="font-size:11.5px;" onclick="tb2TextSeveral(\'' + esc(key) + '\')">💬 Text everyone on this shift</button>' : '')
      + '<span class="field-note" style="font-size:11px;">Add more people from the list below. A Yes becomes the main person for this shift; only one Yes per shift.</span></div></div>';
  }
  /* ── TEXT SEVERAL AT ONCE (2026-10-06, Samantha: "build texting several people at once"). One window: everyone on the
     board who can be texted (on the roster, not already a Yes), each with the shifts they're listed on. One message;
     "[first name]" and "[their shifts]" are filled in for each person, and each person's own text is shown before
     sending. Send goes one person at a time through team-ask, so every text gets every check (the switch, the roster
     number, opt-outs, Do Not Disturb, a rejected number) and each result is shown. Nothing goes until Send. ── */
  function textable(plan){
    const by = new Map();
    (plan.slots || []).forEach(s => (plan.days || []).forEach(d => {
      const k = tbCellKey(d, s.k);
      people(plan, k).forEach(p => {
        if(p.applicant_id || p.status === 'yes' || !p.name) return;
        const id = p.cg_ax_id ? 'ax:' + p.cg_ax_id : 'n:' + nk(p.name);
        if(!by.has(id)) by.set(id, { name:p.name, ax:String(p.cg_ax_id || ''), cells:[] });
        by.get(id).cells.push({ k, d, s, status:p.status, texted:p.status === 'asked' && p.ask_channel === 'sms' });
      });
    }));
    return [...by.values()];
  }
  const TOK_FIRST = '[first name]', TOK_WHEN = '[their shifts]';
  function whenFor(cells){
    const bySlot = {}; let hrs = 0;
    cells.forEach(c => { (bySlot[c.s.k] = bySlot[c.s.k] || { s:c.s, ds:[] }).ds.push(c.d); hrs += tbSlotHours(c.s); });
    const w = Object.keys(bySlot).map(k => { const g = bySlot[k]; g.ds.sort((a, b) => TB_DAYS.indexOf(a) - TB_DAYS.indexOf(b)); return tbDayList(g.ds) + ' ' + tbTimeLong(g.s.start) + '–' + tbTimeLong(g.s.end); }).join('; ');
    return w ? w + ' (' + (Math.round(hrs * 10) / 10) + ' hrs a week)' : '';
  }
  function baseText(dr){
    const cf = String((dr.client && dr.client.first) || '').trim();
    const start = dr.client && dr.client.start_target ? ', starting around ' + new Date(dr.client.start_target + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) : '';
    let care = String((dr.client && dr.client.care_line) || '').trim(); if(care && !/[.!?]$/.test(care)) care += '.';
    return String(dr.template).replace('{client}, a new client', cf ? '{client}, a new client' : 'a new client')
      .replaceAll('{first_name}', TOK_FIRST).replaceAll('{client}', cf).replaceAll('{where}', dr.client && dr.client.town ? ' in ' + dr.client.town : '')
      .replaceAll('{when}', TOK_WHEN).replaceAll('{start}', start).replaceAll('{care}', care ? care + ' ' : '').replace(/\s{2,}/g, ' ').trim();
  }
  async function textSeveral(onlyKey){
    const plan = tbPlan(); if(!plan) return;
    let list = textable(plan);
    if(!list.length){ ccToast('Nobody on this board can be texted: add caregivers from the roster first (a Yes is never asked again).'); return; }
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(13,54,95,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:30px 16px;overflow:auto;';
    ov.innerHTML = '<div role="dialog" aria-modal="true" class="tb2-several" style="background:#fff;border-radius:14px;max-width:760px;width:100%;padding:20px 22px;box-shadow:0 20px 50px rgba(0,0,0,.25);">'
      + '<div style="font-weight:800;color:var(--navy);font-size:17px;">Text several people about ' + esc(plan.client) + '’s care team</div><div id="tsBody" style="margin-top:10px;"><div class="field-note">Checking each person’s number and texting preferences…</div></div></div>';
    document.body.appendChild(ov);
    const body = ov.querySelector('#tsBody'), close = () => { ov.remove(); tbRender(); };
    const drafts = await Promise.all(list.map(x => taCall({ action:'draft', plan_id:plan.id, caregiver_axiscare_id:x.ax, caregiver_name:x.name }).catch(e => ({ error:String(e.message || e) }))));
    const dr0 = drafts.find(d => d && !d.error);
    if(!dr0){ body.innerHTML = '<div>' + esc((drafts[0] && drafts[0].error) || 'The texting service didn’t answer.') + '</div><div style="margin-top:12px;"><button class="secondary" id="tsX">Close</button></div>'; ov.querySelector('#tsX').onclick = close; return; }
    list = list.map((x, i) => { const d = drafts[i] || {}, why = [];
      if(d.error) why.push(d.error);
      else { if(!d.caregiver.on_roster) why.push('not on the caregiver roster, so there is no number');
        else if(!d.caregiver.phone_last4) why.push('no phone number on the roster');
        if((d.caregiver.opt_out || []).length) why.push('asked not to get texts (' + d.caregiver.opt_out.join('; ') + ')'); }
      return Object.assign(x, { first:(d.caregiver && d.caregiver.first) || String(x.name).split(' ')[0], last4:d.caregiver && d.caregiver.phone_last4, why }); });
    const live = !!dr0.live;
    const hr = +new Date().toLocaleString('en-US', { timeZone:'America/Chicago', hour:'2-digit', hour12:false }), late = hr < 8 || hr >= 20;
    const want = x => !x.why.length && (onlyKey ? x.cells.some(c => c.k === onlyKey) : x.cells.some(c => !c.texted));
    body.innerHTML = '<div class="field-note">Everyone on this board who isn’t a Yes yet. Tick who to text and which of their shifts to ask about.</div>'
      + '<div id="tsPeople" style="margin-top:8px;">' + list.map((x, i) => '<div class="ts-person" data-i="' + i + '" style="border:1px solid var(--border);border-radius:9px;padding:8px 11px;margin-top:6px;' + (x.why.length ? 'background:#FAFAFA;' : '') + '">'
        + '<label style="display:flex;gap:8px;align-items:center;font-weight:700;color:var(--navy);margin:0;cursor:pointer;"><input type="checkbox" class="ts-on"' + (want(x) ? ' checked' : '') + (x.why.length ? ' disabled' : '') + ' style="width:auto;margin:0;"> ' + esc(x.name)
        + '<span class="field-note" style="font-weight:400;">' + (x.last4 ? 'to ···' + esc(x.last4) : '') + '</span></label>'
        + (x.why.length ? '<div class="field-note" style="color:var(--red);margin:3px 0 0 24px;">Can’t text: ' + esc(x.why.join('; ')) + '</div>' : '')
        + '<div style="display:flex;flex-wrap:wrap;gap:4px 12px;margin:4px 0 0 24px;">' + x.cells.map(c => '<label style="display:flex;gap:5px;align-items:center;font-size:12.5px;font-weight:400;margin:0;"><input type="checkbox" class="ts-cell" data-k="' + esc(c.k) + '"' + ((!onlyKey || c.k === onlyKey) && !c.texted && !x.why.length ? ' checked' : '') + (x.why.length ? ' disabled' : '') + ' style="width:auto;margin:0;"> '
          + TB_DAYL[c.d] + ' ' + esc(c.s.label) + (c.texted ? ' <span class="field-note" style="color:#8A4E0C;">texted already</span>' : c.status !== 'penciled' ? ' <span class="field-note">(' + esc((ANSWER[c.status] || ANSWER.penciled)[0]) + ')</span>' : '') + '</label>').join('') + '</div>'
        + '<div class="ts-preview field-note" style="margin:6px 0 0 24px;white-space:pre-wrap;background:#F8FAFC;border-radius:7px;padding:6px 9px;font-size:12.5px;color:var(--text);"></div></div>').join('') + '</div>'
      + '<div style="margin-top:12px;display:flex;align-items:baseline;gap:8px;"><b style="font-size:13px;color:var(--navy);">The text</b><span class="field-note" style="font-size:11.5px;">' + esc(TOK_FIRST) + ' and ' + esc(TOK_WHEN) + ' are filled in for each person. Edit anything else.</span></div>'
      + '<textarea id="tsMsg" rows="5" style="width:100%;box-sizing:border-box;font-family:inherit;font-size:14px;padding:8px 10px;border:1.5px solid var(--border);border-radius:8px;margin-top:4px;"></textarea>'
      + (late ? '<div style="background:#FFF4E3;border:1px solid #F3D19C;border-radius:8px;padding:7px 10px;margin-top:8px;font-size:12.5px;color:#8A4E0C;">It’s ' + esc(new Date().toLocaleTimeString('en-US', { timeZone:'America/Chicago', hour:'numeric', minute:'2-digit' })) + '. These texts reach people late. You can still send them.</div>' : '')
      + (!live ? '<div style="background:#FDE8E8;border:1px solid #F5B5B5;border-radius:8px;padding:7px 10px;margin-top:8px;font-size:12.5px;color:var(--red);">Sending from the Team Builder is switched off right now. Nothing can be sent.</div>' : '')
      + '<div id="tsRes" style="margin-top:8px;"></div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end;align-items:center;margin-top:12px;"><span class="field-note" id="tsCount"></span><button class="secondary" id="tsX">Cancel</button><button class="cara-btn" id="tsSend"' + (live ? '' : ' disabled') + '>Send</button></div>';
    const $ = q => ov.querySelector(q);
    $('#tsMsg').value = baseText(dr0);
    const chosen = () => [...ov.querySelectorAll('.ts-person')].map(el => { const x = list[+el.dataset.i];
      return { x, el, on:el.querySelector('.ts-on').checked, ks:[...el.querySelectorAll('.ts-cell:checked')].map(c => c.dataset.k) }; });
    const textOf = (x, ks) => $('#tsMsg').value.split(TOK_FIRST).join(x.first || 'there').split(TOK_WHEN).join(whenFor(x.cells.filter(c => ks.indexOf(c.k) > -1)) || '(pick a shift)').replace(/\s{2,}/g, ' ').trim();
    const refresh = () => { let n = 0;
      chosen().forEach(c => { const pv = c.el.querySelector('.ts-preview');
        if(c.on && c.ks.length && !c.x.why.length){ n++; pv.style.display = ''; pv.textContent = textOf(c.x, c.ks); } else pv.style.display = 'none'; });
      $('#tsCount').textContent = n ? n + ' text' + (n === 1 ? '' : 's') + ', one per person' : 'Nobody picked';
      return n; };
    ov.querySelectorAll('.ts-on,.ts-cell').forEach(i => i.onchange = refresh); $('#tsMsg').oninput = refresh; $('#tsX').onclick = close;
    refresh();
    let sending = false;
    $('#tsSend').onclick = async function(){
      if(sending) return;
      const go = chosen().filter(c => c.on && c.ks.length && !c.x.why.length);
      if(!go.length){ $('#tsRes').innerHTML = '<div class="field-note" style="color:var(--red);">Tick at least one person and one of their shifts.</div>'; return; }
      const bad = go.find(c => { const t = textOf(c.x, c.ks); return !t || t.length > 640; });
      if(bad){ $('#tsRes').innerHTML = '<div class="field-note" style="color:var(--red);">' + esc(bad.x.name) + '’s text is ' + (textOf(bad.x, bad.ks) ? 'too long (keep it under 640 characters)' : 'empty') + '.</div>'; return; }
      if(typeof cgpgBeforeOffer === 'function' && !(await cgpgBeforeOffer(go.map(c => ({ axiscare_id:c.x.ax, name:c.x.name })), 'send these texts'))){ $('#tsRes').innerHTML = '<div class="field-note" style="color:var(--red);">Not sent.</div>'; return; }
      sending = true; this.disabled = true; this.textContent = 'Sending…';
      const out = [];
      for(const c of go){
        const askId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('ta-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
        let d; try{ d = await taCall({ action:'send', plan_id:plan.id, caregiver_axiscare_id:c.x.ax, caregiver_name:c.x.name, cells:c.ks, message:textOf(c.x, c.ks), ask_id:askId }); }catch(e){ d = { error:String(e.message || e) }; }
        const ok = d && (d.outcome === 'sent' || d.outcome === 'already_sent');
        if(ok && d.plan){ const i = (DATA.staffing_plans || []).findIndex(p => p && p.id === plan.id); if(i >= 0) DATA.staffing_plans[i] = d.plan; }
        out.push({ name:c.x.name, ok, why:ok ? (d.warning || '') : ((d && d.error) || 'Not sent.') });
        $('#tsRes').innerHTML = out.map(r => '<div style="font-size:13px;padding:2px 0;color:' + (r.ok ? 'var(--green)' : 'var(--red)') + ';">' + (r.ok ? '✓ Sent to ' : '✗ ') + esc(r.name) + (r.why ? ': ' + esc(r.why) : '') + '</div>').join('');
      }
      const n = out.filter(r => r.ok).length;
      body.insertAdjacentHTML('beforeend', '<div class="ts-done" style="margin-top:10px;font-weight:700;color:var(--navy);">' + n + ' of ' + out.length + ' sent. Their shifts now show "texted". Replies land in GoHighLevel for now; mark each answer on the board.</div>');
      this.textContent = 'Sent'; $('#tsX').textContent = 'Done';
      if(typeof swRenderBar === 'function') swRenderBar();
    };
  }

  /* the line on a project card: how the linked board stands */
  function projectLine(p){
    const plan = ((typeof DATA !== 'undefined' && DATA.staffing_plans) || []).find(x => x && (x.id === p.plan_id || x.project_id === p.id));
    if(!plan) return '';
    return '<div class="tb2-pjline" style="margin-top:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' + readinessHtml(plan, true).replace('margin:0 0 8px', 'margin:0')
      + '<button class="ghost" style="padding:4px 10px;font-size:12px;" onclick="tb2OpenPlan(\'' + esc(plan.id) + '\')">Open the Team Builder</button></div>';
  }
  function openPlan(id){ try{ switchTab('hourswatch'); }catch(e){} try{ swSubGo('builder'); }catch(e){} tbOpen(id); }

  Object.assign(window, { tb2People:people, tb2Add:add, tb2AddPool:addPool, tb2AddApplicant:addApplicant, tb2Answer:answer,
    tb2Readiness:readiness, tb2ReadinessWords:readinessWords, tb2AllConfirmed:allConfirmed, tb2Sync:sync,
    tb2AppsHtml:appsHtml, tb2SkillRank:skillRank, tb2SkillFlags:skillFlags, tb2Skill:setSkill, tb2Need:toggleNeed, tb2NeedsHtml:needsHtml,
    tb2ReadinessHtml:readinessHtml, tb2RowCount:rowCount, tb2MoreChip:moreChip, tb2PeopleHtml:peopleHtml, tb2ProjectLine:projectLine,
    tb2OpenPlan:openPlan, TB2_APPS:APPS, TB2_ANSWER:ANSWER, tb2MakeProject:makeProject, tb2MakeOpen:makeOpen, tb2ProjectBox:projectBoxHtml, tb2TextSeveral:textSeveral, tb2Textable:textable });
})();
