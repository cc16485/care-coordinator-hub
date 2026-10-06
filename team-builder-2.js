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
    tb2OpenPlan:openPlan, TB2_APPS:APPS, TB2_ANSWER:ANSWER, tb2MakeProject:makeProject, tb2MakeOpen:makeOpen, tb2ProjectBox:projectBoxHtml });
})();
