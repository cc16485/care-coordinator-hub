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
   - DRIVING (Driver Compliance, 2026-10-13): when the plan says the client needs transportation, only an Approved Driver
     with a current license and insurance is available for it (CCMatch.transportEligible, the one shared rule; never the
     self-reported skill). Everyone else stays on the list, marked "Not available" with the reason, and can't be added.
     Only while the Admin switch driver_schedule_gate_live is on; off, the check shows as "Driver check (not enforced
     yet)" and anyone can be penciled in.
   - RANKED CHOICES (2026-10-13, her "1st, 2nd, 3rd ... choice" + "yes to a and b"): everyone on a shift is in order;
     the 1st choice is the main person (plan.cells[key]), the rest are plan.options[key] in order. ↑ / ↓ reorder; a Yes
     is always 1st (only one Yes per shift). When the 1st choice says No, the next choice who hasn't said No moves up to
     1st (decision A); nobody is texted by that, a person presses Text. The square shows "2nd <name> +N".
   - STILL ONBOARDING (same day): people with an offer who aren't on the AxisCare roster yet, and new hires awaiting
     Approve to Work, are marked "still onboarding" with where they are. They can be ranked, penciled and confirmed
     (decision B); texting them from here and putting their shift into AxisCare wait until they're approved and on the
     roster (schedule-push holds them, with the reason in the preview).
   Nothing here texts or emails anyone. */
(function(){
  const esc = s => escapeHtmlComms(s);
  const nk = s => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
  const NEEDS = [['hoyer_lift', 'Hoyer lift'], ['bedbound_care', 'Bedbound care'], ['transfers_gait_belt', 'Transfers / gait belt'], ['transportation', 'Transportation']];
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

  const ORD = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th')
  /* where someone still onboarding is (her B): an offer not on the roster yet, or a new hire awaiting Approve to Work */
  function onboardingNote(p){
    if(!p) return '';
    if(p.applicant_id){ const st = stageOf(p); if(st) return 'still onboarding · ' + st.label;
      const a = (APPS.rows || []).find(x => String(x.id) === String(p.applicant_id));
      return 'still onboarding · ' + (a && a.status === 'offer' ? 'offer sent' : 'getting ready to start'); }
    const g = p.cg_ax_id && Array.isArray(TB.pool) ? TB.pool.find(x => String(x.axiscare_id) === String(p.cg_ax_id)) : null;
    return g && g.work_locked ? 'still onboarding · waiting on Approve to Work' : '';
  }
  /* ── ONBOARDING FOR THIS CLIENT (Samantha 2026-10-14: Team Builder "for planning": show people who are onboarding and what
     stage they are in, "then we could put our goal for when to have them onboarded by so they can work with that client").
     Her choices: the goal is the client's start date (the Start Contract's target date, through the plan's Journey link),
     changeable on the plan (plan.onboard_goal); 3 days or less to the goal and not Approved to Work = red here, and the
     server's onboarding goal check opens a Needs Attention card for the onboarding owner. Read only; nothing is texted.
     Stage: their readiness card's stage when they have one (caregiver-journey list, by offer), otherwise the stage their
     profile page shows (hire-profile stages). ── */
  const ONB = { stages:{}, journeys:null, goals:{}, asked:{}, at:0 };
  const fmtDay = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
  const chiToday = () => new Date().toLocaleString('sv-SE', { timeZone:'America/Chicago' }).slice(0, 10);
  const daysTo = d => Math.round((Date.parse(d + 'T12:00:00Z') - Date.parse(chiToday() + 'T12:00:00Z')) / 864e5);
  function rosterOf(axId){ return ((typeof DATA !== 'undefined' && DATA.caregivers) || []).find(g => String(g.axiscare_id || '') === String(axId)) || null; }
  function lockedAx(axId){ const g = axId && Array.isArray(TB.pool) ? TB.pool.find(x => String(x.axiscare_id) === String(axId)) : null; return !!(g && g.work_locked); }
  /* everyone on the plan still onboarding: an applicant not on the roster yet, or a caregiver awaiting Approve to Work */
  function onbPeople(plan){
    const seen = {}, out = [];
    Object.keys(plan.cells || {}).concat(Object.keys(plan.options || {})).forEach(key => people(plan, key).forEach(p => {
      if(p.status === 'no' || !(p.applicant_id || (p.cg_ax_id && lockedAx(p.cg_ax_id)))) return;
      const k = p.applicant_id ? 'a' + p.applicant_id : 'c' + p.cg_ax_id; if(seen[k]) return; seen[k] = 1; out.push(p); }));
    return out;
  }
  async function loadOnb(plan){
    if(!plan || ONB.asked[plan.id] && Date.now() - ONB.asked[plan.id] < 5 * 60e3) return;
    ONB.asked[plan.id] = Date.now();
    const jobs = [];
    if(!ONB.journeys || Date.now() - ONB.at > 5 * 60e3) jobs.push(sb.functions.invoke('caregiver-journey', { body:{ action:'list' } }).then(r => {
      const m = {}; ((r.data && r.data.rows) || []).forEach(j => { if(j.offer_id) m[j.offer_id] = j; }); ONB.journeys = m; ONB.at = Date.now(); }).catch(() => { ONB.journeys = ONB.journeys || {}; }));
    jobs.push(loadStages(onbPeople(plan)));
    if(!plan.onboard_goal && !ONB.goals[plan.id]) jobs.push((async () => {
      try{ const l = await sb.from('team_build_link_current').select('episode_id').eq('plan_id', plan.id).maybeSingle();
        const ep = l && l.data && l.data.episode_id; if(!ep){ ONB.goals[plan.id] = { date:'', from:'' }; return; }
        const c = await sb.from('start_contract_current').select('target_date').eq('episode_id', ep).maybeSingle();
        const d = String((c && c.data && c.data.target_date) || '').slice(0, 10);
        ONB.goals[plan.id] = { date:/^\d{4}-\d\d-\d\d$/.test(d) ? d : '', from:"the client's start date" };
      }catch(e){ ONB.goals[plan.id] = { date:'', from:'' }; } })());
    await Promise.all(jobs);
    try{ if(typeof tbPlan === 'function' && tbPlan() && tbPlan().id === plan.id && typeof tbRender === 'function') tbRender(); }catch(e){}
  }
  /* 2026-10-14: the four Team Builder labels come from hire-profile stages (tb), for applicants and locked new hires */
  let STG_BUSY = false;
  async function loadStages(extra){
    const ids = (extra || []).map(p => p.applicant_id).concat((APPS.rows || []).map(a => a.id)).filter(id => id && !ONB.stages[id]).map(String);
    const axs = (extra || []).map(p => p.cg_ax_id).concat((Array.isArray(TB.pool) ? TB.pool : []).filter(g => g.work_locked).map(g => g.axiscare_id))
      .filter(a => a && !ONB.stages['ax:' + String(a).replace(/\D/g, '')]).map(a => String(a).replace(/\D/g, ''));
    if(!ids.length && !axs.length) return;
    if(STG_BUSY) return; STG_BUSY = true;
    try{ const r = await sb.functions.invoke('hire-profile', { body:{ action:'stages', applicant_ids:[...new Set(ids)].slice(0, 60), caregiver_axids:[...new Set(axs)].slice(0, 40) } });
      Object.assign(ONB.stages, (r.data && r.data.stages) || {});
      /* anyone the read could not answer is marked, so the list never waits forever */
      ids.forEach(id => { if(!ONB.stages[id]) ONB.stages[id] = { error:'could not be read' }; });
    }catch(e){ ids.forEach(id => { if(!ONB.stages[id]) ONB.stages[id] = { error:'could not be read' }; }); }
    STG_BUSY = false;
  }
  const tbOf = p => { const s = p.applicant_id ? ONB.stages[p.applicant_id] : p.cg_ax_id ? ONB.stages['ax:' + String(p.cg_ax_id).replace(/\D/g, '')] : null; return s && s.tb ? s.tb : null; };
  function goalOf(plan){
    if(/^\d{4}-\d\d-\d\d$/.test(String(plan.onboard_goal || ''))) return { date:plan.onboard_goal, from:'set on this plan' + (plan.onboard_goal_by ? ' by ' + String(plan.onboard_goal_by).split(' ')[0] : '') };
    return ONB.goals[plan.id] || null;
  }
  /* where someone is: the readiness card's stage when they have one, else their profile's stage */
  function stageOf(p){
    let offer = null, s = null;
    if(p.applicant_id){ s = ONB.stages[p.applicant_id] || null; offer = s && s.offer_id; }
    else if(p.cg_ax_id){ const g = rosterOf(p.cg_ax_id); offer = g && g.offer_id; }
    const j = offer && ONB.journeys ? ONB.journeys[offer] : null, tb = tbOf(p);
    if(tb) return { label:tb.label, key:tb.key, next:j ? j.next && j.next.title : (s && s.next && s.next.title), approved:tb.key === 'approved' || !!(j && j.approved_to_work), blocked:j ? (j.blocked || []).length : 0 };
    if(j) return { label:j.stage || 'onboarding', next:j.next && j.next.title, approved:!!j.approved_to_work, blocked:(j.blocked || []).length };
    if(s && !s.error) return { label:(s.ended || s.stage || 'onboarding') + (s.stage === 'Step 1' && s.step1 ? ' (' + s.step1.signed + ' of ' + s.step1.of + ' forms signed)' : ''), next:s.next && s.next.title, approved:!!s.approved_at };
    return null;
  }
  function onboardHtml(plan){
    if(!plan || plan.open_hours) return '';
    const list = onbPeople(plan); loadOnb(plan);
    const g = goalOf(plan), left = g && g.date ? daysTo(g.date) : null;
    const goalLine = g && g.date
      ? 'Goal: onboarded by <b>' + esc(fmtDay(g.date)) + '</b> <span class="field-note">(' + esc(g.from) + ')</span> · ' + (left < 0 ? '<b style="color:var(--red);">' + (-left) + ' day' + (left === -1 ? '' : 's') + ' past</b>' : left === 0 ? '<b style="color:var(--red);">today</b>' : left + ' day' + (left === 1 ? '' : 's') + ' left')
      : (g ? '<span class="field-note">No onboarding goal yet: this client has no start date on their Start Contract.</span>' : '<span class="field-note">Reading the client’s start date…</span>');
    const rows = list.map(p => {
      const st = stageOf(p), late = left != null && left <= 3 && !(st && st.approved);
      return '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;padding:4px 0;border-top:1px solid var(--border);font-size:12.5px;' + (late ? 'color:var(--red);' : '') + '">'
        + '<b style="min-width:130px;">' + esc(p.name || '') + '</b>'
        + '<span style="flex:1;">' + (st ? '<b style="color:' + (late || st.key === 'step1_not_done' ? 'var(--red)' : '#7C3AED') + ';">' + esc(st.label) + '</b>' + (st.key === 'step1_not_done' ? ' <span class="field-note">(kept on the plan; new people need Step 1 done first)</span>' : '') + (st.next ? ' · next: ' + esc(st.next) : '') + (st.blocked ? ' · <b>' + st.blocked + ' blocked</b>' : '') : '<span class="field-note">reading their stage…</span>')
        + (late ? ' · <b>behind the goal</b>' : '') + '</span></div>';
    }).join('');
    return '<div class="card tb2-onb-box" style="padding:9px 13px;margin:0 0 8px;border-left:4px solid ' + (list.some(p => { const st = stageOf(p); return left != null && left <= 3 && !(st && st.approved); }) ? 'var(--red)' : '#7C3AED') + ';">'
      + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;"><b style="color:var(--navy);">Onboarding for this client (' + list.length + ')</b><span>' + goalLine + '</span><span style="flex:1;"></span>'
      + '<button class="cara-btn ghost" style="font-size:11.5px;" onclick="tb2GoalEdit(\'' + esc(plan.id) + '\',this)">' + (plan.onboard_goal ? 'Change the goal' : 'Set a different goal') + '</button></div>'
      + (list.length ? rows : '<div class="field-note" style="font-size:12px;">Nobody on this plan is still onboarding.</div>')
      + '<div class="field-note" style="font-size:11px;margin-top:4px;">Red = 3 days or less to the goal and not Approved to Work yet; the onboarding owner also gets a Needs Attention card. Nothing is texted.</div></div>';
  }
  function goalEdit(planId, btn){
    const plan = tbPlan(); if(!plan || plan.id !== planId) return;
    const box = btn.parentNode; if(box.querySelector('.tb2-goal-in')) return;
    box.insertAdjacentHTML('beforeend', '<span class="tb2-goal-in" style="display:inline-flex;gap:6px;align-items:center;"><input type="date" value="' + esc(plan.onboard_goal || ((goalOf(plan) || {}).date) || '') + '" style="width:auto;font-size:12.5px;padding:3px 6px;">'
      + '<button class="cara-btn" style="font-size:11.5px;">Save</button>' + (plan.onboard_goal ? '<button class="cara-btn ghost" style="font-size:11.5px;">Use the client’s start date</button>' : '') + '</span>');
    const w = box.querySelector('.tb2-goal-in'), inp = w.querySelector('input'), bs = w.querySelectorAll('button');
    bs[0].onclick = async () => { const v = inp.value; if(!/^\d{4}-\d\d-\d\d$/.test(v)){ ccToast('Pick a date.'); return; } plan.onboard_goal = v; plan.onboard_goal_by = me(); plan.onboard_goal_at = now(); await tbSave(plan); tbRender(); };
    if(bs[1]) bs[1].onclick = async () => { delete plan.onboard_goal; delete plan.onboard_goal_by; delete plan.onboard_goal_at; delete ONB.goals[plan.id]; delete ONB.asked[plan.id]; await tbSave(plan); tbRender(); };
  }

  /* write an ordered list back: the 1st is the main person, the rest are the options in order */
  function writeOrder(plan, key, list){
    plan.cells = plan.cells || {}; plan.options = plan.options || {};
    const L = list.map(p => { const r = Object.assign({}, p); delete r.main; delete r.pid; return r; });
    if(!L.length){ delete plan.cells[key]; delete plan.options[key]; return; }
    const first = L.shift(); delete first.id; plan.cells[key] = first;
    L.forEach(r => { if(!r.id) r.id = 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); });
    if(L.length) plan.options[key] = L; else delete plan.options[key];
  }
  /* ↑ / ↓ : a Yes is always 1st */
  async function move(key, pid, dir){
    const plan = tbPlan(); if(!plan) return;
    const list = people(plan, key), i = list.findIndex(p => p.pid === pid), j = i + dir;
    if(i < 0 || j < 0 || j >= list.length) return;
    if(list[0].status === 'yes' && (i === 0 || j === 0)){ ccToast(list[0].name + ' said yes, so they stay 1st. Take the yes back first to change the order.'); return; }
    const t = list[i]; list[i] = list[j]; list[j] = t;
    writeOrder(plan, key, list);
    await tbSave(plan); tbRender(); sync(plan);
  }

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
  function addPool(key, i){ const cg = Array.isArray(TB.pool) ? TB.pool[i] : null; if(!cg) return;
    const no = driveBlock(tbPlan(), cg); if(no){ ccToast(cg.name + ' is not available for this plan. ' + no + '.'); return; }
    add(key, { name:String(cg.name), cg_ax_id:String(cg.axiscare_id || '') || undefined }); }
  function addApplicant(key, id){
    const a = (APPS.rows || []).find(x => String(x.id) === String(id)); if(!a) return;
    const t = (ONB.stages[a.id] || {}).tb;
    if(!t || t.key === 'step1_not_done'){ ccToast('Only people who have finished Step 1 can be added to a plan.'); return; }
    if(driveBlock(tbPlan(), {})){ ccToast('This client needs transportation, and someone who has not started has no driver approval on the roster yet, so they are not available for this plan.'); return; }
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
      } else if(status === 'no' && list.some(o => o.status !== 'no')){
        /* decision A (2026-10-13): the next choice who hasn't said No moves up to 1st; the No goes to the end. Nobody is texted. */
        main.status = 'no'; main.at = now(); main.by = me();
        const all = people(plan, key), k = all.findIndex((x, n) => n > 0 && x.status !== 'no');
        const reordered = [all[k]].concat(all.filter((x, n) => n !== k && n !== 0), [all[0]]);
        writeOrder(plan, key, reordered);
        await tbSave(plan); tbRender(); if(typeof swRenderBar === 'function') swRenderBar(); sync(plan);
        ccToast(main.name + ' said no; ' + reordered[0].name + ' is now the 1st choice. Text them when you are ready.');
        return;
      } else { main.status = status; main.at = now(); main.by = me(); }
    } else {
      const k = list.findIndex(o => o.id === pid); if(k < 0) return;
      if(status === null) list.splice(k, 1);
      else if(status === 'yes'){
        const o = list[k];
        if(main && main.status === 'yes' && !(await ccConfirm(main.name + ' is already confirmed for this shift. Make ' + o.name + ' the confirmed one instead? ' + main.name + ' stays on the list as a maybe.'))) return;
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
      /* Start of Care stage C (2026-10-17, her rule): a yes that needs a recheck isn't coverage (caregiver-matching.js) */
      yes:days.filter(d => { const k = tbCellKey(d, s.k), c = (plan.cells || {})[k]; return typeof cmCovered === 'function' ? cmCovered(plan, k, c) : !!(c && c.status === 'yes'); }).length }));
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
    if(typeof opsLog === 'function') opsLog(pj, 'Project made from the Caregiver Matching plan by ' + ((ccActor() || {}).name || ''));
    await persist('ops_items', pj);
    opEvent('item_created', { item:pj, summary:'New project from Caregiver Matching: ' + pj.title });
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
      + '<div class="field-note">A care team project: shifts confirmed, then AxisCare.</div>'   /* 2026-10-18 (Samantha): no Client start / coming home projects */
      + '<div style="display:flex;gap:8px;margin-top:8px;"><div style="flex:1;"><div class="field-note">Owner</div><select id="tb2O" style="width:100%;padding:6px;font-size:13px;">' + crew().map(e => '<option value="' + esc(e) + '"' + (e === own ? ' selected' : '') + '>' + esc(nameOf(e)) + '</option>').join('') + '</select></div>'
      + '<div style="flex:1;"><div class="field-note">Ready by</div><input id="tb2R" type="date" value="' + inDays(7) + '" style="width:100%;padding:5px;font-size:13px;"></div></div>'
      + '<div style="display:flex;gap:8px;margin-top:12px;"><button class="primary" id="tb2Go" style="padding:6px 12px;font-size:13px;">Put it on My Work</button><button class="ghost" id="tb2No" style="padding:6px 12px;font-size:13px;">Cancel</button></div>', { width:400 });
    el.querySelector('#tb2No').onclick = ccPopClose;
    el.querySelector('#tb2Go').onclick = async () => {
      const o = { kind:'care_team', owner:el.querySelector('#tb2O').value, ready_by:el.querySelector('#tb2R').value };
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
    /* 2026-10-14 (Samantha): only people who have finished Step 1 are offered here, each with where they are */
    const waiting = APPS.rows.filter(a => !ONB.stages[a.id]);
    if(waiting.length){ loadStages([]).then(() => { try{ const el = document.getElementById('tbPoolList'), p = tbPlan(); if(el && p && TB.cellOpen) el.innerHTML = tbPoolListHtml(p, TB.cellOpen); }catch(e){} }); }
    const done = a => { const t = (ONB.stages[a.id] || {}).tb; return t && t.key !== 'step1_not_done' && t.key !== 'approved'; };
    const q = nk(TB.poolQ || ''), list = APPS.rows.filter(done).filter(a => !q || nk((a.first_name || '') + (a.last_name || '')).indexOf(q) > -1);
    const notYet = APPS.rows.filter(a => { const t = (ONB.stages[a.id] || {}).tb; return t && t.key === 'step1_not_done'; }).length;
    const head = '<div style="font-size:11.5px;font-weight:800;letter-spacing:.05em;color:var(--navy);margin:10px 0 2px;">STILL ONBOARDING, STEP 1 DONE · ' + list.length + '</div>';
    if(APPS.err) return head + '<div class="field-note">Couldn’t load them (' + esc(APPS.err) + ').</div>';
    if(waiting.length && !list.length) return head + '<div class="field-note">Checking who has finished Step 1…</div>';
    if(!list.length) return head + '<div class="field-note">Nobody still onboarding has finished Step 1 yet' + (notYet ? ' (' + notYet + ' with an offer haven’t finished it)' : '') + '.</div>';
    return head + list.map(a => '<div class="tb2-app" style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;padding:5px 0;border-top:1px solid var(--border);font-size:12.5px;">'
      + '<b style="min-width:130px;">' + esc([a.first_name, a.last_name].filter(Boolean).join(' ')) + '</b>'
      + '<span class="field-note" style="flex:1;"><b style="color:#7C3AED;">still onboarding · ' + esc((stageOf({ applicant_id:a.id }) || {}).label || 'Step 1 done') + '</b>' + (a.start_date ? ' · start date ' + esc(new Date(a.start_date + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' })) : '')
      + (a.offer_position ? ' · ' + esc(a.offer_position) : '') + ' · you can rank them and mark a Yes; call them, texting from here waits until they’re on the roster</span>'
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
  /* driving: the pool row's Driver Compliance fields (coverage-shifts team_pool), else the roster's (the mirror writes both) */
  function driveOf(cg){
    const M = window.CCMatch; if(!M || !M.transportEligible) return { ok:false, why:'the driver rule could not be loaded' };
    const lg = cg && cg.dl_status == null && cg.axiscare_id ? (DATA.caregivers || []).find(x => String(x.axiscare_id || '') === String(cg.axiscare_id)) : null;
    return M.transportEligible(lg || cg, new Intl.DateTimeFormat('en-CA', { timeZone:'America/Chicago' }).format(new Date()));
  }
  /* the Admin switch "Only Approved Drivers get shifts that need transportation" (ops_settings.driver_schedule_gate_live,
     off by default). Off: the driver check is only shown ("not enforced yet") and anyone can be penciled in. */
  function driveLive(){ const M = window.CCMatch; return !!(M && M.driveGateOn && M.driveGateOn((typeof DATA !== 'undefined' && DATA.ops_settings) || {})); }
  /* why this person is not available for this plan (it needs driving, they are not cleared, and the switch is on), or null */
  function driveBlock(plan, cg){
    if(!plan || (plan.needs || []).indexOf('transportation') < 0 || !driveLive()) return null;
    const t = driveOf(cg); return t.ok ? null : 'This client needs transportation: ' + t.why;
  }
  /* 0 = has every need, 1 = something not on file, 2 = a need they don't have */
  function skillRank(plan, cg){
    const needs = plan.needs || []; if(!needs.length) return 0;
    const sk = skillsOf(cg.axiscare_id), h = needs.map(n => n === 'transportation' ? (driveOf(cg).ok ? 'yes' : driveLive() ? 'no' : '') : haveOf(sk, n));
    return h.indexOf('no') > -1 ? 2 : h.indexOf('') > -1 ? 1 : 0;
  }
  function skillFlags(plan, cg){
    const needs = plan.needs || []; if(!needs.length) return '';
    const sk = skillsOf(cg.axiscare_id);
    return needs.map(n => {
      const label = (NEEDS.find(x => x[0] === n) || [n, n])[1];
      if(n === 'transportation'){ const t = driveOf(cg);
        return t.ok ? '<b style="color:var(--green);">✓ Approved Driver</b>'
          : driveLive() ? '<b style="color:var(--red);">⛔ Not available: needs transportation; ' + esc(t.why) + '</b>'
          : '<span style="color:#8A4E0C;font-weight:700;">Driver check (not enforced yet): ' + esc(t.why) + '</span>'; }
      const h = haveOf(sk, n);
      if(h === 'yes') return '<b style="color:var(--green);">✓ ' + esc(label) + '</b>';
      if(h === 'no') return '<b style="color:var(--red);">✗ no ' + esc(label) + '</b>';
      return '<span style="color:#8A4E0C;font-weight:700;">' + esc(label) + '?</span>'
        + (cg.axiscare_id ? ' <button class="linklike tb2-sk" style="font-size:11px;" onclick="tb2Skill(\'' + esc(cg.axiscare_id) + '\',\'' + n + '\',\'yes\')">yes</button>/<button class="linklike" style="font-size:11px;" onclick="tb2Skill(\'' + esc(cg.axiscare_id) + '\',\'' + n + '\',\'no\')">no</button>' : '');
    }).join(' · ');
  }
  async function setSkill(axId, k, val){
    await cgdOverlaySave(axId, ov => { ov.skills = ov.skills || {};
      ov.skills[k] = { have:val, evidence:'attested', by:me(), at:now(), note:'recorded from Caregiver Matching' }; });
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
    const o = ((plan.options || {})[key] || []).filter(x => x.status !== 'no'), m = (plan.cells || {})[key];
    const ob = m ? onboardingNote(m) : '';
    const wait = ob ? '<div class="tb2-onb" style="font-size:9.5px;font-weight:700;color:#7C3AED;">' + (m.status === 'yes' ? 'waiting on onboarding' : 'still onboarding') + '</div>' : '';
    if(!o.length) return wait;
    return wait + '<div class="tb2-more" style="font-size:9.5px;font-weight:700;color:var(--navy);">2nd ' + esc(String(o[0].name || '').split(' ')[0]) + (o.length > 1 ? ' +' + (o.length - 1) : '') + '</div>';
  }
  function peopleHtml(plan, key){
    const list = people(plan, key); if(!list.length) return '';
    const b = (pid, st, label, cur) => '<button class="cara-btn' + (cur === st ? '' : ' ghost') + '" style="font-size:11px;padding:3px 8px;" onclick="tb2Answer(\'' + esc(key) + '\',\'' + esc(pid) + '\',' + (st === null ? 'null' : '\'' + st + '\'') + ')">' + label + '</button>';
    return '<div class="card tb2-people" style="padding:8px 12px;margin-bottom:8px;"><div style="font-weight:700;font-size:12.5px;color:var(--navy);margin-bottom:4px;">Choices for this shift (' + list.length + ')</div>'
      + list.map(p => {
        const a = ANSWER[p.status] || ANSWER.penciled;
        const ask = p.main && p.ask_id ? (plan.asks || []).find(x => x && x.id === p.ask_id) : null;
        const ob = onboardingNote(p), i = list.indexOf(p);
        const mv = (d, l) => '<button class="cara-btn ghost tb2-mv" title="' + (d < 0 ? 'Move up' : 'Move down') + '" style="font-size:11px;padding:1px 6px;" onclick="tb2Move(\'' + esc(key) + '\',\'' + esc(p.pid) + '\',' + d + ')">' + l + '</button>';
        return '<div class="tb2-person" data-pid="' + esc(p.pid) + '" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:6px 0;border-top:1px solid var(--border);">'
          + '<span class="tb2-rank" style="min-width:34px;font-weight:800;color:' + (i === 0 ? 'var(--navy)' : 'var(--text-muted)') + ';">' + ORD(i + 1) + '</span>'
          + '<span style="display:inline-flex;gap:3px;min-width:58px;">' + (i > 0 ? mv(-1, '↑') : '') + (i < list.length - 1 ? mv(1, '↓') : '') + '</span>'
          + '<b style="min-width:120px;">' + esc(p.name) + '</b>'
          + (ob ? '<span class="tag-chip" style="background:#F3EEFF;color:#7C3AED;font-weight:700;">' + esc(ob) + '</span>' : '')
          + '<span class="tag-chip" style="background:' + a[2] + ';color:' + a[1] + ';font-weight:700;">' + a[0] + '</span>'
          + '<span class="field-note" style="font-size:11px;">' + esc((p.status === 'asked' && p.ask_channel === 'sms' ? 'texted ' : '') + (p.at ? tbAgo(p.at) : '') + (p.by ? ' by ' + String(p.by).split(' ')[0] : '')) + '</span>'
          + '<span style="flex:1;"></span>'
          + (p.status !== 'yes' && !ob ? '<button class="cara-btn tb2-text" style="font-size:11px;padding:3px 8px;" onclick="' + (p.main ? 'tbAskOpen(\'' + esc(key) + '\')' : 'tb2TextSeveral(\'' + esc(key) + '\')') + '">💬 Text</button>' : '')
          + b(p.pid, 'asked', '📞 Asked', p.status) + b(p.pid, 'yes', '✓ Yes', p.status) + b(p.pid, 'maybe', 'Maybe', p.status) + b(p.pid, 'no', '✗ No', p.status) + b(p.pid, 'no_reply', 'No reply', p.status) + b(p.pid, null, 'Remove', '')
          + (ask ? '<details style="flex-basis:100%;font-size:12px;"><summary style="cursor:pointer;color:var(--teal);font-weight:700;">The text we sent</summary><div style="white-space:pre-wrap;background:#F8FAFC;border:1px solid var(--border);border-radius:8px;padding:6px 9px;margin-top:4px;">' + esc(ask.text) + '</div></details>' : '')
          + '</div>';
      }).join('')
      + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px;">' + (list.filter(p => !onboardingNote(p) && p.status !== 'yes').length > 1 ? '<button class="cara-btn tb2-textall" style="font-size:11.5px;" onclick="tb2TextSeveral(\'' + esc(key) + '\')">💬 Text everyone on this shift</button>' : '')
      + '<span class="field-note" style="font-size:11px;">Add more people from the list below. The 1st choice is who you ask first; use ↑ ↓ to change the order. If the 1st choice says No, the next choice moves up. A Yes is always 1st; only one Yes per shift. Someone still onboarding can be ranked and marked Yes; the shift goes into AxisCare once they’re approved.</span></div></div>';
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
        if(onboardingNote(p) || p.status === 'yes' || !p.name) return;
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
        if((d.caregiver.opt_out || []).length) why.push('asked not to get texts (' + d.caregiver.opt_out.join('; ') + ')');
        if(d.blocked) why.push(String(d.blocked)); }   /* the server's checks (incl. driving, 2026-10-13), shown before anyone sends */
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
      + (!live ? '<div style="background:#FDE8E8;border:1px solid #F5B5B5;border-radius:8px;padding:7px 10px;margin-top:8px;font-size:12.5px;color:var(--red);">Sending from Caregiver Matching is switched off right now. Nothing can be sent.</div>' : '')
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
      + '<button class="ghost" style="padding:4px 10px;font-size:12px;" onclick="tb2OpenPlan(\'' + esc(plan.id) + '\')">Open Caregiver Matching</button></div>';
  }
  function openPlan(id){ try{ switchTab('teambuilder'); }catch(e){} tbOpen(id); }

  Object.assign(window, { tb2OnboardHtml:onboardHtml, tb2GoalEdit:goalEdit, tb2StageOf:stageOf, TB2_ONB:ONB, tb2LoadStages:loadStages, tb2People:people, tb2Add:add, tb2AddPool:addPool, tb2AddApplicant:addApplicant, tb2Answer:answer, tb2Move:move, tb2Onboarding:onboardingNote, tb2WriteOrder:writeOrder,
    tb2Readiness:readiness, tb2ReadinessWords:readinessWords, tb2AllConfirmed:allConfirmed, tb2Sync:sync,
    tb2AppsHtml:appsHtml, tb2SkillRank:skillRank, tb2SkillFlags:skillFlags, tb2DriveOf:driveOf, tb2DriveBlock:driveBlock, tb2DriveLive:driveLive, tb2Skill:setSkill, tb2Need:toggleNeed, tb2NeedsHtml:needsHtml,
    tb2ReadinessHtml:readinessHtml, tb2RowCount:rowCount, tb2MoreChip:moreChip, tb2PeopleHtml:peopleHtml, tb2ProjectLine:projectLine,
    tb2OpenPlan:openPlan, TB2_APPS:APPS, TB2_ANSWER:ANSWER, tb2MakeProject:makeProject, tb2MakeOpen:makeOpen, tb2ProjectBox:projectBoxHtml, tb2TextSeveral:textSeveral, tb2Textable:textable });
})();
