/* =============================================================================
   careplan-v.js · window.CPV · care plan versions, review and approval (2026-10-29, Care plan Stage 1)
   =============================================================================
   Samantha approved Stage 1 of "From Visit to First Shift" (https://claude.ai/artifact/V4SexZo9o1DTb7Ssr4iyUL) with her
   decisions: care coordinators and owners approve; unresolved high-risk concerns and exceptions need an owner; nobody can
   approve a plan with an unsafe issue; urgent = ASAP lead, hoped-for start within 3 days, or marked urgent; the urgent
   deadline (3 days or before the second shift, whichever is first) covers only the nonessential parts; the stronger model
   drafts; nothing goes to AxisCare as an active plan without approval; a partial push says what worked and what didn't;
   coordinator edits are never overwritten by a later recording; every original assessment and plan is kept.
   Storage: the plan record in app_data care_plans keeps `versions` (the history). Its top-level fields (what the Care tab,
   Care Plan Reviews, the caregiver packet and careplan-tasks read) are written ONLY from an approved version, at the moment
   it is sent to AxisCare. A plan written before approvals shows as version 0, read-only, and is kept as it was.
   ============================================================================= */
(function () {
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = () => (typeof DATA !== 'undefined' && DATA) || {};
  const myEmail = () => String((typeof ME !== 'undefined' && ME && ME.email) || '').toLowerCase();
  const me = () => (typeof ME !== 'undefined' && ME && (ME.name || ME.email)) || '';
  const roles = (e) => (typeof ccRolesFor === 'function' ? ccRolesFor(e == null ? myEmail() : e) : []);
  const isOwner = () => (typeof ccIsOwner === 'function' ? ccIsOwner(myEmail()) : false);
  const canApprove = () => isOwner() || roles().indexOf('care_coordinator') > -1 || roles().indexOf('owner_admin') > -1;
  const toast = (m) => { try { ccToast(m); } catch (e) {} };
  const now = () => new Date().toISOString();
  const nil = (v) => v == null || String(v).trim() === '' || (Array.isArray(v) && !v.length);
  const uidv = () => (typeof uid === 'function' ? uid() : 'id_' + Math.random().toString(36).slice(2, 10));
  const get = (o, path) => path.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);

  /* ---------- the parts of a plan ---------- */
  const PARTS = [['when', 'When'], ['how', 'How to help'], ['equipment', 'Equipment and supplies'], ['preferences', 'Their preferences'], ['safety', 'Safety'], ['report_if', 'Report to the office if']];
  const ESSENTIAL_PARTS = ['when', 'how', 'equipment', 'safety', 'report_if'];   /* preferences can wait for an urgent start */
  const FIELDS = [['narrative', 'About the plan'], ['adl_needs', 'Daily living'], ['iadl_needs', 'Around the home'], ['medical_conditions', 'Health'], ['medications', 'Medicines'],
    ['safety_concerns', 'Safety concerns'], ['client_goals', 'Goals'], ['services_recommended', 'What we will do'], ['recommended_frequency', 'How often'], ['recommended_hours_per_week', 'Hours a week']];
  const ESSENTIAL_FIELDS = ['adl_needs', 'medical_conditions', 'medications', 'safety_concerns'];
  const PLAN_KEYS_ = ['adl_needs', 'iadl_needs', 'medical_conditions', 'medications', 'safety_concerns', 'client_goals', 'services_recommended', 'recommended_frequency', 'recommended_hours_per_week'];
  const AX_DAYS = [['N', 'Sun'], ['M', 'Mon'], ['T', 'Tue'], ['W', 'Wed'], ['R', 'Thu'], ['F', 'Fri'], ['S', 'Sat']];
  const WHEN = ['Any time', 'Morning', 'Afternoon', 'Evening', 'Night'];
  const STATUS_W = { drafting: 'Drafting', draft_failed: 'Draft failed', draft: 'Draft ready', approved: 'Approved', active: 'Active in AxisCare', superseded: 'Replaced', before: 'Before versions' };

  /* ---------- the safety screen everyone answers (her decision 4) ---------- */
  const HAZARDS = [['rugs', 'Loose rugs'], ['clutter', 'Clutter in walkways'], ['stairs', 'Stairs without a rail'], ['lighting', 'Poor lighting'], ['smoke_detector', 'No working smoke detector'],
    ['bathroom', 'Bathroom without grab bars'], ['pets', 'Pets underfoot'], ['none', 'None seen']];
  const SUMMON = [['phone', 'Phone in reach'], ['alert', 'Medical alert worn'], ['both', 'Both'], ['no', 'No way to call']];
  /* what is still unanswered: [label, path] */
  function safetyMissing(v) {
    v = v || {}; const s = v.safety || {}, out = [], need = (ok, label, path) => { if (!ok) out.push([label, path]); };
    const yn = (x) => x === 'yes' || x === 'no';
    need(yn(s.falls), 'Falls in the last 6 months', 'visit.safety.falls');
    if (s.falls === 'yes') need(!nil(s.falls_note), 'What happened in the fall', 'visit.safety.falls_note');
    need(yn(s.lives_alone), 'Lives alone', 'visit.safety.lives_alone');
    need(yn(s.oxygen), 'Oxygen in the home', 'visit.safety.oxygen');
    if (s.oxygen === 'yes') need(!nil(s.oxygen_note), 'Where the oxygen is and how it is used', 'visit.safety.oxygen_note');
    need(yn((v.prefs || {}).smoking), 'Someone smokes in the home', 'visit.prefs.smoking');
    need(!nil(v.allergies), 'Allergies (or "None known")', 'visit.allergies');
    need(s.allergies_ok === 'yes', 'Allergies confirmed with the family', 'visit.safety.allergies_ok');
    const ec = s.ec || {};
    need(!nil(ec.name) && !nil(ec.phone), 'Emergency contact with a phone number', 'visit.safety.ec.name');
    need(s.ec_ok === 'yes', 'Emergency contact confirmed with the family', 'visit.safety.ec_ok');
    const lv = (k) => ((v.acts || {})[k] || {}).level;
    need(!nil(lv('mobility')), 'Walking', 'visit.acts.mobility.level');
    need(!nil(lv('transfers')), 'Getting up and down (transfers)', 'visit.acts.transfers.level');
    if (lv('transfers') === 'full') need(yn(s.two_person), 'Needs more than one person or a lift to transfer?', 'visit.safety.two_person');
    need(yn(v.memory), 'Memory concerns', 'visit.memory');
    need(yn(v.supervision), 'Needs supervision for safety', 'visit.supervision');
    if (v.memory === 'yes' || v.supervision === 'yes') need(!nil(s.cognition_note), 'What happens with memory or judgment, and when', 'visit.safety.cognition_note');
    need(yn(s.decline), 'Recent decline in what they can do', 'visit.safety.decline');
    if (s.decline === 'yes') need(!nil(s.decline_note), 'What changed, and when', 'visit.safety.decline_note');
    need(!nil(s.summon), 'Can call for help in an emergency', 'visit.safety.summon');
    need(Array.isArray(s.hazards) && s.hazards.length, 'Home hazards seen (or none)', 'visit.safety.hazards');
    if ((s.hazards || []).some((h) => h !== 'none')) need(!nil(s.hazards_note), 'About the hazards', 'visit.safety.hazards_note');
    return out;
  }
  /* high-risk concerns (an owner reviews each) and unsafe issues (nobody can approve) */
  function concerns(a, lead, ver) {
    const v = (a && a.visit) || {}, s = v.safety || {}, out = [];
    const lv = (k) => ((v.acts || {})[k] || {}).level;
    const hz = (s.hazards || []).filter((h) => h !== 'none').map((h) => (HAZARDS.find((x) => x[0] === h) || [0, h])[1]);
    if (s.falls === 'yes') out.push({ key: 'falls', kind: 'high', label: 'A fall in the last 6 months' + (s.falls_note ? ': ' + s.falls_note : '') });
    if (s.lives_alone === 'yes' && v.memory === 'yes') out.push({ key: 'alone_memory', kind: 'high', label: 'Lives alone with memory concerns' });
    if (v.supervision === 'yes') out.push({ key: 'supervision', kind: 'high', label: 'Needs supervision for safety' });
    if (s.summon === 'no') out.push({ key: 'summon', kind: 'high', label: "Can't call for help in an emergency" });
    if (s.oxygen === 'yes' && (v.prefs || {}).smoking === 'yes') out.push({ key: 'oxygen_smoking', kind: 'high', label: 'Oxygen in a home where someone smokes' });
    if (s.decline === 'yes') out.push({ key: 'decline', kind: 'high', label: 'Recent decline' + (s.decline_note ? ': ' + s.decline_note : '') });
    if (hz.length) out.push({ key: 'hazards', kind: 'high', label: 'Home hazards: ' + hz.join(', ') });
    if (lv('transfers') === 'full') out.push({ key: 'transfers_full', kind: 'high', label: 'Full help with transfers' });
    /* the rules she already approved, never anything assumed (her rule 7) */
    const tasks = (ver && ver.tasks) || [];
    const lift = (t) => /hoyer|lift/i.test(String(t.name || ''));
    if (s.two_person === 'yes' && !tasks.some(lift) && (v.equipment || []).indexOf('Hoyer lift') < 0)
      out.push({ key: 'two_person', kind: 'block', label: 'Needs more than one person to transfer. Your rule: a lift must be in place first (caregivers never do two-person transfers).' });
    const medicaid = /medicaid/i.test(String((lead && lead.funding_source) || a.payer || ''));
    if (medicaid) tasks.filter((t) => lift(t) || /catheter|ostomy|stoma/i.test(String(t.name || ''))).forEach((t) =>
      out.push({ key: 'medicaid_' + t.adl_id, kind: 'block', label: t.name + ' for a Medicaid client is outside our Medicaid services (a lift, catheter or ostomy).' }));
    return out;
  }

  /* ---------- records ---------- */
  const planFor = (a) => (D().care_plans || []).find((p) => p && p.assessment_id === a.id) || null;
  const leadOf = (a) => (a && a.lead_id ? (D().leads || []).find((l) => l && String(l.id) === String(a.lead_id)) : null) || null;
  const legacy = (p) => !!p && !Array.isArray(p.versions) && (PLAN_KEYS_.some((k) => !nil(p[k])) || !nil(p.narrative) || (p.axiscare_tasks || []).length);
  function v0Of(p) {
    const ln = (t) => ({ text: String(t || ''), src: [], ask: false, edited: true });
    return { n: 0, status: 'before', created_at: p.created_at || '', created_by: p.reviewed_by || '', from: 'before',
      fields: Object.fromEntries(FIELDS.map(([k]) => [k, ln(p[k])])),
      tasks: (p.axiscare_tasks || []).map((t) => ({ id: uidv(), adl_id: t.adl_id, name: t.name, key: t.key || null, days: t.days || [], require: t.require || 1, when: t.when || 0,
        parts: { when: ln(''), how: { steps: t.instructions ? [ln(t.instructions)] : [], ask: false, edited: true }, equipment: ln(''), preferences: ln(''), safety: ln(''), report_if: ln('') } })) };
  }
  function versionsOf(p) { if (!p) return []; if (Array.isArray(p.versions)) return p.versions; return legacy(p) ? [v0Of(p)] : []; }
  const latest = (p) => { const vs = versionsOf(p); return vs[vs.length - 1] || null; };
  const activeOf = (p) => versionsOf(p).filter((v) => v.status === 'active').slice(-1)[0] || null;
  const approvedOf = (p) => versionsOf(p).filter((v) => v.status === 'approved' || v.status === 'active').slice(-1)[0] || null;
  function ensurePlan(a) {
    let p = planFor(a);
    if (!p) { p = { id: uidv(), assessment_id: a.id, client_name: a.client_name || '', created_at: now(), drafted_by: 'visit', versions: [] }; (DATA.care_plans = DATA.care_plans || []).push(p); }
    if (!Array.isArray(p.versions)) p.versions = legacy(p) ? [v0Of(p)] : [];   /* the plan written before approvals is kept as version 0 */
    return p;
  }
  async function save(p, a) { p.status = STATUS_W[(latest(p) || {}).status] || ''; p.updated_at = now(); try { await persist('care_plans', p); } catch (e) {} }
  function newVersion(p, from, base) {
    const n = Math.max(0, ...versionsOf(p).map((v) => v.n || 0)) + 1;
    const v = base ? JSON.parse(JSON.stringify(base)) : { fields: {}, tasks: [], asks: [] };
    Object.assign(v, { n, status: 'draft', created_at: now(), created_by: me(), from, base: base ? base.n : null, history: [{ at: now(), by: me(), what: 'Version ' + n + ' started (' + from + ')' }] });
    ['approved_by', 'approved_email', 'approved_at', 'approved_kind', 'exception_reason', 'push', 'urgent', 'superseded_by', 'error', 'drafting_since', 'owner_reviews', 'scope_ok', 'risks_at_approval', 'urgent_mark'].forEach((k) => delete v[k]);
    p.versions.push(v); return v;
  }

  /* ---------- the draft (her decision 2: as soon as the visit is finished) ---------- */
  function callDraft(a) { const l = leadOf(a), d = l && l.care_plan_draft; return (d && d.fields) || {}; }
  function planText(v) {
    if (!v) return '';
    return FIELDS.filter(([k]) => v.fields && v.fields[k] && v.fields[k].text).map(([k, l]) => l + ': ' + v.fields[k].text).join('\n')
      + (v.tasks || []).map((t) => '\nTask ' + t.name + ': ' + PARTS.map(([k, l]) => { const x = t.parts && t.parts[k]; const tx = k === 'how' ? ((x && x.steps) || []).map((s) => s.text).join(' / ') : x && x.text; return tx ? l + ': ' + tx : ''; }).filter(Boolean).join('; ')).join('');
  }
  async function request(a, base) {
    const facts = window.HV && HV.factsFor ? HV.factsFor(a) : [];
    const sess = await sb.auth.getSession(), tok = sess && sess.data && sess.data.session && sess.data.session.access_token;
    if (!tok) throw new Error('Sign in again, then tap Try again.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/ai-draft-careplan', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'visit', assessment_id: String(a.id), client: String(a.client_name || '').split(/\s+/)[0], facts, call: callDraft(a), earlier: planText(base), week: (a.visit || {}).week || {} }) });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d || d.error) throw new Error((d && d.error) || 'The drafting service answered ' + r.status);
    return d;
  }
  /* a new reading merged into a version: a field or part a person edited is never replaced; new tasks come in marked new */
  function merge(v, d) {
    v.fields = v.fields || {};
    FIELDS.forEach(([k]) => { const cur = v.fields[k], nx = (d.fields || {})[k]; if (!nx) return; if (cur && cur.edited) return; v.fields[k] = Object.assign({}, nx, { edited: false }); });
    v.tasks = v.tasks || [];
    (d.tasks || []).forEach((t) => {
      const cur = v.tasks.find((x) => +x.adl_id === +t.adl_id);
      if (!cur) { v.tasks.push(Object.assign({ id: uidv(), fresh: v.tasks.length > 0 }, t)); return; }
      if (!cur.edited_sched) { cur.days = t.days; cur.require = t.require; cur.when = t.when; }
      PARTS.forEach(([k]) => { const c = cur.parts[k], n = t.parts[k]; if (!n || (c && c.edited)) return; cur.parts[k] = Object.assign({}, n, { edited: false }); });
    });
    v.asks = [...new Set((v.asks || []).concat(d.asks || d.ask || []))];
    v.draft = { at: d.at || now(), model: d.model || '', parts: (d.parts || []).map((x) => x.rec), parts_waiting: d.parts_waiting || 0, dropped: d.dropped || 0 };
  }
  async function draft(a, opts) {
    opts = opts || {};
    const p = ensurePlan(a);
    let v = latest(p);
    const base = approvedOf(p) || (v && v.status === 'before' ? v : null);
    let fresh = false;
    if (!v || ['approved', 'active', 'superseded', 'before'].indexOf(v.status) > -1) { v = newVersion(p, opts.from || 'visit', base && base.status !== 'before' ? base : null); fresh = true; }
    /* a version with nothing drafted yet shows Drafting; a draft someone is already working on stays a draft while it updates */
    const was = fresh || !(v.tasks || []).length ? 'drafting' : v.status; v.status = was === 'draft' ? 'draft' : 'drafting'; v.drafting_since = now(); delete v.error;
    await save(p, a); paint(a);
    try {
      const d = await request(a, base);
      merge(v, d); v.status = 'draft'; delete v.drafting_since;
      (v.history = v.history || []).push({ at: now(), by: me() || 'The Hub', what: opts.from === 'recording' ? 'Updated from the recording (edited lines kept)' : 'Draft written from the visit' });
      await save(p, a);
      await cards(a, p);
      await safetyWatch(a);
    } catch (e) {
      v.status = was === 'draft' ? 'draft' : 'draft_failed'; v.error = String((e && e.message) || e); delete v.drafting_since;
      await save(p, a);
      await card('draft_failed', a, p, { title: 'Care plan draft failed: ' + (a.client_name || 'client'), detail: v.error + ' Open the care plan and tap Try again.', urgency: 'high', due: now() });
    }
    paint(a);
  }
  /* finishing the visit starts the draft by itself; nothing waits on the iPad */
  function autoDraft(a) { if (!a || !a.visit) return; a.visit.finished_by_email = a.visit.finished_by_email || myEmail(); draft(a, { from: 'visit' }); }

  /* ---------- urgent starts (her decision 2 and 3) ---------- */
  const dayMs = 864e5;
  function urgentWhy(a, v) {
    const l = leadOf(a), ds = (l && l.desired_start) || {}, start = (a.visit || {}).start || ds.date || '';
    if (v && v.urgent_mark) return 'Marked urgent by ' + v.urgent_mark.by + ': ' + v.urgent_mark.reason;
    if (ds.kind === 'asap') return 'The lead says as soon as possible';
    if (start && Date.parse(start + 'T12:00:00') - Date.now() <= 3 * dayMs) return 'Hoped-for start ' + start + ', within 3 days';
    return '';
  }
  /* three days, or before the second shift, whichever comes first */
  function finishBy(a, at) {
    const three = new Date(Date.parse(at) + 3 * dayMs);
    const v = a.visit || {}, wk = v.week || {}, keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const start = v.start ? new Date(v.start + 'T00:00:00') : new Date(at);
    const shifts = [];
    for (let i = 0; i < 21 && shifts.length < 2; i++) {
      const d = new Date(start.getTime() + i * dayMs), w = wk[keys[d.getDay()]];
      if (w && w.from && w.to) { const p = w.from.split(':'); d.setHours(+p[0], +p[1] || 0, 0, 0); if (d.getTime() > Date.parse(at)) shifts.push(d); }
    }
    const second = shifts[1];
    return (second && second < three ? second : three).toISOString();
  }

  /* ---------- the checks before approval ---------- */
  function checks(a, v) {
    const lead = leadOf(a), out = [], add = (key, label, ok, essential, kind, go) => out.push({ key, label, ok: !!ok, essential: !!essential, kind: kind || 'check', go: go || '' });
    const miss = safetyMissing((a && a.visit) || {});
    add('safety', miss.length ? 'Safety check: ' + miss.length + ' still to answer (' + miss.slice(0, 3).map((m) => m[0]).join(', ') + (miss.length > 3 ? ', and more' : '') + ')' : 'Safety check answered', !miss.length, true, 'check', 'visit');
    add('tasks', (v.tasks || []).length ? (v.tasks || []).length + ' caregiver task' + ((v.tasks || []).length === 1 ? '' : 's') : 'At least one caregiver task', (v.tasks || []).length, true);
    (v.tasks || []).forEach((t) => {
      const gap = ESSENTIAL_PARTS.filter((k) => partEmpty(t, k)).map((k) => (PARTS.find((x) => x[0] === k) || [0, k])[1].toLowerCase());
      add('task_' + t.id, t.name + (gap.length ? ': ' + gap.join(', ') + ' still to write' : ': all instructions written'), !gap.length, true, 'check', 'task_' + t.id);
      if (partEmpty(t, 'preferences')) add('pref_' + t.id, t.name + ': their preferences still to write', false, false, 'check', 'task_' + t.id);
    });
    FIELDS.forEach(([k, l]) => { const f = (v.fields || {})[k]; if (!f || nil(f.text)) add('field_' + k, l + ' still to write', false, ESSENTIAL_FIELDS.indexOf(k) > -1, 'check', 'fields'); });
    (v.asks || []).forEach((q, i) => add('ask_' + i, 'Question: ' + q, ((v.asks_done || {})[i]), false, 'ask'));
    concerns(a, lead, v).forEach((c) => {
      if (c.kind === 'block') add('block_' + c.key, c.label, false, true, 'block');
      else { const r = (v.owner_reviews || {})[c.key]; add('risk_' + c.key, c.label + (r ? ' · reviewed by ' + r.by + ': ' + r.note : ' · needs an owner\'s review'), !!r, true, 'risk'); }
    });
    add('scope', 'I checked that each task is within our services and the caregiver\'s training', v.scope_ok, true, 'scope');
    return out;
  }
  /* 2026-10-29 (her "Add the Not needed tap for equipment and preferences only"): one tap answers those two for a task they
     don't apply to; safety and report-if must always be written */
  const NA_PARTS = ['equipment', 'preferences'];
  const partEmpty = (t, k) => { const x = t.parts && t.parts[k]; if (x && x.na && NA_PARTS.indexOf(k) > -1) return false; return k === 'how' ? !x || !(x.steps || []).some((s) => !nil(s.text)) : !x || nil(x.text); };
  function gate(a, v) {
    const cs = checks(a, v), urgent = urgentWhy(a, v);
    const essentialOk = cs.filter((c) => c.essential).every((c) => c.ok), allOk = cs.every((c) => c.ok);
    const blocked = cs.some((c) => c.kind === 'block');
    return { cs, urgent, blocked, normal: allOk && !blocked, urgentOk: !!urgent && essentialOk && !blocked, exception: isOwner() && essentialOk && !blocked && !allOk,
      missingNonessential: cs.filter((c) => !c.essential && !c.ok) };
  }

  /* ---------- My Work cards ---------- */
  async function card(kind, a, p, o) {
    if (typeof DATA === 'undefined') return;
    DATA.ops_items = DATA.ops_items || [];
    const id = 'ops_cp_' + kind + '_' + p.id + (o.key ? '_' + o.key : '');
    let it = DATA.ops_items.find((x) => x && x.id === id);
    const lead = leadOf(a), ax = String(a.axiscare_client_id || (lead && lead.axiscare_client_id) || '').trim();
    const owner = o.owner != null ? o.owner : (a.visit && a.visit.finished_by_email) || (typeof opsDomainOwner === 'function' ? opsDomainOwner('client_care') : '') || '';
    if (it && it.status === 'open') { Object.assign(it, { title: o.title, detail: o.detail, last_activity_at: now() }); }
    else if (!it || o.reopen) {
      it = Object.assign(it || {}, { id, kind: 'care_plan_' + kind, about: a.client_name || '', title: o.title, detail: o.detail, domain: 'client_care', status: 'open', urgency: o.urgency || 'normal',
        created_at: now(), last_activity_at: now(), due: o.due || new Date(Date.now() + dayMs).toISOString(), owner, owner_name: owner && typeof opsOwnerName === 'function' ? opsOwnerName(owner) : '',
        opened_by: 'system', client_ax: /^\d+$/.test(ax) ? ax : '', lead_id: lead ? lead.id : '', source: { type: 'care_plan', plan_id: p.id, assessment_id: a.id } });
      if (!DATA.ops_items.includes(it)) DATA.ops_items.push(it);
    } else return;
    try { await persist('ops_items', it); } catch (e) {}
  }
  async function closeCard(kind, p, key, note) {
    const it = (D().ops_items || []).find((x) => x && x.id === 'ops_cp_' + kind + '_' + p.id + (key ? '_' + key : ''));
    if (!it || it.status !== 'open') return;
    it.status = 'done'; it.closed_at = now(); it.closed_by = me() || 'The Hub'; it.close_note = note || 'Done';
    try { if (typeof opsLog === 'function') opsLog(it, it.close_note); await persist('ops_items', it); } catch (e) {}
  }
  async function cards(a, p) {
    const v = latest(p); if (!v) return;
    await closeCard('draft_failed', p, '', 'The draft was written');
    if (v.status === 'draft') {
      const g = gate(a, v), u = g.urgent;
      await card('review', a, p, { title: 'Review and approve the care plan: ' + (a.client_name || ''), detail: 'Version ' + v.n + ' is drafted from the visit. ' + (u ? 'Urgent start: ' + u + '. ' : '') + 'Open the Care tab, check every line, then approve.',
        urgency: u ? 'high' : 'normal', due: new Date(Date.now() + (u ? 2 * 36e5 : dayMs)).toISOString() });
      const risks = g.cs.filter((c) => c.kind === 'risk' && !c.ok);
      if (risks.length) await card('owner_review', a, p, { owner: '', title: 'Owner review: care plan concerns for ' + (a.client_name || ''), detail: risks.map((c) => c.label.replace(/ · needs an owner's review$/, '')).join('; ') + '. An owner reviews each before the plan can be approved.', urgency: u ? 'high' : 'normal' });
      else await closeCard('owner_review', p, '', 'Every concern reviewed');
    }
  }
  /* her rule: preserve the approved version during revisions, but flag at once any new safety concern that may make it unsafe */
  async function safetyWatch(a) {
    const p = planFor(a); if (!p) return;
    const ap = approvedOf(p); if (!ap) return;
    const had = new Set(ap.risks_at_approval || []);
    for (const c of concerns(a, leadOf(a), latest(p))) {
      if (had.has(c.key)) continue;
      await card('safety', a, p, { key: c.key, owner: '', urgency: 'high', due: now(), title: 'New safety concern for ' + (a.client_name || '') + "'s care plan",
        detail: c.label + '. It is new since version ' + ap.n + ' was approved, so the plan caregivers follow may not be safe. Review it now.' });
    }
  }

  /* ---------- actions ---------- */
  function cur() { return S.a && planFor(S.a) && versionsOf(planFor(S.a)).find((v) => v.n === S.n); }
  function log(v, what) { (v.history = v.history || []).push({ at: now(), by: me(), what }); }
  async function approve(kind) {
    const a = S.a, p = planFor(a), v = cur(); if (!v || v.status !== 'draft') return;
    if (!canApprove()) { S.msg = 'Only care coordinators and owners can approve a care plan.'; return render(); }
    const g = gate(a, v);
    if (kind === 'normal' && !g.normal) return render();
    if (kind === 'urgent' && !g.urgentOk) return render();
    if (kind === 'exception') { if (!g.exception) return render(); const r = (document.getElementById('cpvExReason') || {}).value || ''; if (r.trim().length < 5) { S.msg = 'Say why, so the exception is on the record.'; return render(); } v.exception_reason = r.trim(); }
    v.status = 'approved'; v.approved_by = me(); v.approved_email = myEmail(); v.approved_at = now(); v.approved_kind = kind;
    v.risks_at_approval = concerns(a, leadOf(a), v).map((c) => c.key);
    if (kind === 'urgent') {
      v.urgent = { why: g.urgent, finish_by: finishBy(a, v.approved_at), items: g.missingNonessential.map((c) => c.label) };
      await card('finish', a, p, { owner: myEmail(), urgency: 'high', due: v.urgent.finish_by, title: 'Finish ' + (a.client_name || '') + "'s care plan (urgent start)",
        detail: 'Approved for an urgent start. Still to finish: ' + v.urgent.items.join('; ') + '. Due ' + new Date(v.urgent.finish_by).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + '.' });
    } else {
      /* a complete approval finishes an earlier urgent start */
      for (const o of versionsOf(p)) if (o !== v && o.urgent && !o.urgent.done_at) { o.urgent.done_at = now(); o.urgent.done_in = v.n; await closeCard('finish', p, '', 'Finished in version ' + v.n); }
    }
    log(v, 'Approved' + (kind === 'urgent' ? ' for an urgent start' : kind === 'exception' ? ' with an owner exception: ' + v.exception_reason : ''));
    await closeCard('review', p, '', 'Approved');
    await save(p, a); S.msg = 'Approved. Send it to AxisCare when you are ready.'; render();
  }
  async function newFrom(n) {
    const a = S.a, p = ensurePlan(a), base = versionsOf(p).find((v) => v.n === n); if (!base) return;
    const open = latest(p); if (open && open.status === 'draft' && open !== base) { S.n = open.n; S.msg = 'Version ' + open.n + ' is already being edited.'; return render(); }
    const v = newVersion(p, 'edit', base); log(v, 'Copied from version ' + base.n + ' to change it');
    await save(p, a); S.n = v.n; render();
  }
  function setPart(t, k, val) {
    if (k === 'how') { t.parts.how = { steps: String(val).split('\n').map((x) => x.trim()).filter(Boolean).map((x) => ({ text: x, src: [], ask: false })), ask: false, edited: true }; }
    else t.parts[k] = { text: String(val).trim(), src: (t.parts[k] && t.parts[k].text === String(val).trim()) ? t.parts[k].src : [], ask: false, edited: true };
  }
  /* AxisCare: only an approved version; per-task results; ACTIVE only when every plan task reads back */
  function instructions(t) {
    const p = t.parts || {}, line = (k, l) => { const x = p[k]; if (k === 'how') { const st = ((x && x.steps) || []).map((s, i) => (i + 1) + '. ' + s.text); return st.length ? l.toUpperCase() + ':\n' + st.join('\n') : ''; } return x && x.text && !x.na ? l.toUpperCase() + ': ' + x.text : ''; };
    return PARTS.map(([k, l]) => line(k, l)).filter(Boolean).join('\n').slice(0, 2000);
  }
  async function send() {
    const a = S.a, p = planFor(a), v = cur(); if (!v || ['approved', 'active'].indexOf(v.status) < 0) return;
    const lead = leadOf(a), ax = String(a.axiscare_client_id || (lead && lead.axiscare_client_id) || '').trim();
    if (!/^\d+$/.test(ax)) { S.msg = 'This client is not in AxisCare yet. Create them in AxisCare first; the plan stays approved.'; return render(); }
    if (!a.axiscare_client_id) { a.axiscare_client_id = ax; try { await persist('care_assessments', a); } catch (e) {} }
    /* the approved version becomes the plan's current text, which careplan-tasks and the rest of the Hub read */
    FIELDS.forEach(([k]) => { p[k] = ((v.fields || {})[k] || {}).text || ''; });
    p.axiscare_tasks = (v.tasks || []).map((t) => ({ adl_id: +t.adl_id, name: t.name, key: t.key || null, days: t.days || [], require: +t.require === 2 ? 2 : 1, when: +t.require === 2 ? 0 : (+t.when || 0), instructions: instructions(t) }));
    p.reviewed_by = v.approved_by; p.approved_version = v.n; p.client_name = a.client_name || p.client_name;
    await save(p, a);
    /* the emergency steps go first: the care plan note is cut at 6,000 characters on the way to AxisCare, and that part must never be lost */
    const full = 'CARE PLAN v' + v.n + ': ' + (a.client_name || '') + ' (approved by ' + v.approved_by + ' ' + String(v.approved_at).slice(0, 10) + ')\n\n'
      + 'IF SOMETHING GOES WRONG\n\n' + emText(a) + '\n\n'
      + FIELDS.filter(([k]) => p[k]).map(([k, l]) => l.toUpperCase() + ':\n' + p[k]).join('\n\n');
    const note = full.slice(0, 6000), cut = full.length > 6000;
    S.busy = 'Reading what AxisCare already has…'; render();
    let pv; try { pv = await cptCall({ action: 'preview', plan_id: p.id }); } catch (e) { pv = { error: String(e.message || e) }; }
    if (pv.error || pv.outcome === 'no_axiscare_id' || pv.outcome === 'fix_tasks') { S.busy = ''; S.msg = 'Nothing was sent. ' + (pv.error || pv.detail || (pv.task_errors || []).join(' ')); return render(); }
    const upd = (pv.tasks || []).filter((x) => x.state === 'different').map((x) => +x.task.adl_id);
    S.busy = 'Sending to AxisCare…'; render();
    let out; try { out = await cptCall({ action: 'push', plan_id: p.id, note_text: note, update: upd, remove: [] }); } catch (e) { out = { error: String(e.message || e) }; }
    S.busy = '';
    if (!out || !out.record) { v.push = { at: now(), by: me(), error: (out && (out.error || (out.task_errors || []).join(' '))) || 'Nothing was sent.', verified: false }; log(v, 'Send to AxisCare failed: ' + v.push.error); await save(p, a); return render(); }
    const rb = out.record.readback || [];
    const verified = rb.length === (v.tasks || []).length && rb.every((x) => x.in_axiscare && x.as_planned) && !out.record.readback_error;
    v.push = { at: out.record.at, by: me(), steps: out.record.steps || [], readback: rb, readback_error: out.record.readback_error || null, verified, others: (pv.others || []).map((o) => o.name), note_cut: cut ? full.length : 0 };
    p.axiscare_tasks_push = out.record;
    if (verified) {
      versionsOf(p).forEach((o) => { if (o !== v && o.status === 'active') { o.status = 'superseded'; o.superseded_by = v.n; } });
      v.status = 'active'; p.axiscare_synced = true;
      a.status = 'Pushed to AxisCare'; a.pushed_to_axiscare = true; a.pushed_at = now(); try { await persist('care_assessments', a); } catch (e) {}
      log(v, 'Sent to AxisCare and every task read back');
    } else { p.axiscare_synced = false; log(v, 'Sent to AxisCare, not every task confirmed'); }
    await save(p, a); render();
  }

  /* ---------- the review screen ---------- */
  const S = { a: null, n: null, msg: '', busy: '' };
  function css() {
    if (document.getElementById('cpvCss')) return;
    const s = document.createElement('style'); s.id = 'cpvCss';
    s.textContent = '#cpvRoot{position:fixed;inset:0;z-index:4100;background:#F6F8F7;overflow-y:auto;-webkit-overflow-scrolling:touch;color:#1B2A2E;font-size:15px}'
      + '#cpvRoot *{box-sizing:border-box}.cpv-in{max-width:1180px;margin:0 auto;padding:20px max(16px,env(safe-area-inset-left,0px)) 60px}'
      + '.cpv-top{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.cpv-top h1{margin:0;font-size:24px;flex:1;min-width:220px}'
      + '.cpv-b{min-height:44px;padding:0 18px;border-radius:12px;border:none;background:#1F6F78;color:#fff;font:inherit;font-weight:700;cursor:pointer}.cpv-b.cpv-red{background:#A3352A}.cpv-b:disabled,.cpv-b.cpv-red:disabled{background:#AEBBBD;cursor:not-allowed}'
      + '.cpv-b2{min-height:44px;padding:0 14px;border-radius:12px;border:1.5px solid #CFCAC0;background:#fff;color:#1B2A2E;font:inherit;font-weight:600;cursor:pointer}'
      + '.cpv-tag{display:inline-block;font-size:12px;font-weight:700;padding:3px 10px;border-radius:12px;background:#E3F0EF;color:#14565D;margin-right:6px}.cpv-tag.red{background:#FBE7E3;color:#A3352A}.cpv-tag.amb{background:#FFF1C9;color:#7A5200}.cpv-tag.grn{background:#E4F1E5;color:#2E6B3A}'
      + '.cpv-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:16px;align-items:start}@media (max-width:900px){.cpv-grid{grid-template-columns:minmax(0,1fr)}}'
      + '.cpv-card{background:#fff;border:1px solid #DCE3E2;border-radius:14px;padding:16px 18px;margin-bottom:14px;min-width:0}.cpv-card h2{margin:0 0 8px;font-size:18px}'
      + '.cpv-task{border-top:1px solid #E7ECEB;padding:12px 0}.cpv-task:first-of-type{border-top:none}.cpv-tn{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;font-weight:700;font-size:16px}'
      + '.cpv-p{display:grid;grid-template-columns:170px minmax(0,1fr);gap:6px 12px;margin-top:8px}@media (max-width:600px){.cpv-p{grid-template-columns:minmax(0,1fr)}}.cpv-p>b{font-size:13px;color:#14565D;padding-top:8px}'
      + '.cpv-f{width:100%;border:1px solid #CFCAC0;border-radius:10px;padding:8px 10px;font:inherit;font-size:15px;min-height:42px;background:#fff;color:#1B2A2E}textarea.cpv-f{resize:vertical;line-height:1.4}'
      + '.cpv-ask{background:#FFF1C9;border-color:#D9BC3A}.cpv-src{font-size:12px;color:#56656A;margin-top:3px}.cpv-ro{white-space:pre-wrap;padding:6px 0}'
      + '.cpv-ck{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid #E7ECEB;font-size:14px}.cpv-ck:first-child{border-top:none}.cpv-dot{width:22px;height:22px;flex:none;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;margin-top:1px}'
      + '.cpv-dot.ok{background:#E4F1E5;color:#2E6B3A}.cpv-dot.no{background:#FFF1C9;color:#7A5200}.cpv-dot.risk{background:#FBE7E3;color:#A3352A}.cpv-dot.block{background:#A3352A;color:#fff}'
      + '.cpv-msg{background:#E3F0EF;border-radius:10px;padding:10px 12px;margin-bottom:12px}.cpv-bad{background:#FBE7E3;color:#7A2A20;border-radius:10px;padding:10px 12px;margin:8px 0}'
      + '.cpv-days{display:flex;gap:6px;flex-wrap:wrap}.cpv-days button{min-height:36px;padding:0 10px;border-radius:18px;border:1.5px solid #CFCAC0;background:#fff;font:inherit;font-size:13px;cursor:pointer}.cpv-days button.on{background:#1F6F78;border-color:#1F6F78;color:#fff}'
      + '.cpv-vs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}.cpv-vs button{min-height:36px;border-radius:18px;border:1.5px solid #CFCAC0;background:#fff;padding:0 12px;font:inherit;font-size:13px;cursor:pointer}.cpv-vs button.on{border-color:#1F6F78;background:#E3F0EF;font-weight:700}'
      + '.cpv-res{font-size:14px;padding:5px 0;border-top:1px solid #E7ECEB}';
    document.head.appendChild(s);
  }
  const srcText = (src) => (src || []).map((s) => s.path ? 'visit: ' + s.path.replace(/^visit\./, '') : s.call ? 'phone call' : s.earlier ? 'earlier plan' : s.quote ? 'recording ' + hms(s.at) + ': "' + s.quote + '"' : '').filter(Boolean).join(' · ');
  const hms = (s) => { s = Math.max(0, Math.round(+s || 0)); return Math.floor(s / 3600) + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  function lineHtml(path, x, edit, rows) {
    const ask = !x || x.ask || nil(x.text), tx = x ? x.text : '';
    if (!edit) return '<div class="cpv-ro">' + (tx ? E(tx) : '<span class="cpv-tag amb">Not written</span>') + '</div>';
    return '<div><textarea class="cpv-f' + (ask ? ' cpv-ask' : '') + '" rows="' + (rows || 2) + '" data-cpv="' + E(path) + '" placeholder="Ask before approving">' + E(tx) + '</textarea>'
      + (x && (x.src || []).length ? '<div class="cpv-src">From ' + E(srcText(x.src)) + (x.edited ? ' · edited' : '') + '</div>' : x && x.edited ? '<div class="cpv-src">Written by a person</div>' : '') + '</div>';
  }
  function taskHtml(t, i, edit) {
    const p = t.parts || {}, how = p.how || { steps: [] };
    return '<div class="cpv-task" id="cpv_task_' + E(t.id) + '"><div class="cpv-tn"><span>' + E(t.name) + '</span>' + (t.fresh ? '<span class="cpv-tag amb">New from the recording</span>' : '')
      + '<span style="flex:1"></span>' + (edit ? '<button type="button" class="cpv-b2" data-cpva="deltask" data-i="' + i + '">Remove</button>' : '') + '</div>'
      + '<div class="cpv-days" style="margin-top:6px">' + AX_DAYS.map((d) => '<button type="button" ' + (edit ? 'data-cpva="day" data-i="' + i + '" data-v="' + d[0] + '"' : 'disabled') + ' class="' + ((t.days || []).indexOf(d[0]) > -1 ? 'on' : '') + '">' + d[1] + '</button>').join('')
      + (edit ? '<select class="cpv-f" style="width:auto;min-height:36px" data-cpvsel="when" data-i="' + i + '">' + WHEN.map((w, k) => '<option value="' + k + '"' + (+t.when === k ? ' selected' : '') + '>' + w + '</option>').join('') + '</select>'
        + '<select class="cpv-f" style="width:auto;min-height:36px" data-cpvsel="require" data-i="' + i + '"><option value="1"' + (+t.require !== 2 ? ' selected' : '') + '>Always</option><option value="2"' + (+t.require === 2 ? ' selected' : '') + '>As needed</option></select>'
        : '<span class="cpv-src" style="align-self:center">' + (+t.require === 2 ? 'As needed' : WHEN[+t.when || 0]) + '</span>') + '</div>'
      + '<div class="cpv-p">' + PARTS.map(([k, l]) => '<b>' + E(l) + '</b>' + (k === 'how'
        ? (edit ? '<div><textarea class="cpv-f' + (!(how.steps || []).length ? ' cpv-ask' : '') + '" rows="4" data-cpv="task.' + i + '.how" placeholder="Ask before approving. One step per line, in order.">' + E((how.steps || []).map((s) => s.text).join('\n')) + '</textarea>'
            + ((how.steps || []).some((s) => (s.src || []).length) ? '<div class="cpv-src">' + (how.steps || []).map((s, j) => (j + 1) + ': ' + E(srcText(s.src) || 'written by a person')).join('<br>') + '</div>' : '') + '</div>'
          : '<ol style="margin:6px 0 0;padding-left:18px">' + (how.steps || []).map((s) => '<li>' + E(s.text) + '</li>').join('') + '</ol>')
        : NA_PARTS.indexOf(k) > -1 && p[k] && p[k].na ? '<div class="cpv-ro"><span class="cpv-tag">Not needed for this task</span>' + (edit ? ' <button type="button" class="cpv-b2" data-cpva="naundo" data-i="' + i + '" data-k="' + k + '">Write it instead</button>' : '') + '</div>'
        : '<div>' + lineHtml('task.' + i + '.' + k, p[k], edit, 2) + (edit && NA_PARTS.indexOf(k) > -1 && partEmpty(t, k) ? '<button type="button" class="cpv-b2" style="min-height:36px;font-size:13px;margin-top:4px" data-cpva="na" data-i="' + i + '" data-k="' + k + '">Not needed for this task</button>' : '') + '</div>')).join('') + '</div></div>';
  }
  function checksHtml(a, v) {
    const g = gate(a, v), edit = v.status === 'draft';
    const dot = (c) => c.kind === 'block' ? '<span class="cpv-dot block">!</span>' : c.ok ? '<span class="cpv-dot ok">✓</span>' : c.kind === 'risk' ? '<span class="cpv-dot risk">!</span>' : '<span class="cpv-dot no">·</span>';
    let h = '<div class="cpv-card"><h2>Before approval</h2>' + (g.urgent ? '<div><span class="cpv-tag red">Urgent start</span><span class="cpv-src">' + E(g.urgent) + '</span></div>' : '')
      + g.cs.map((c) => '<div class="cpv-ck">' + dot(c) + '<div style="flex:1">' + E(c.label) + (c.essential ? '' : ' <span class="cpv-src">(can follow an urgent start)</span>')
        + (edit && c.kind === 'risk' && !c.ok && isOwner() ? '<div style="display:flex;gap:6px;margin-top:6px"><input class="cpv-f" id="cpvRisk_' + E(c.key) + '" placeholder="How the plan handles it"><button type="button" class="cpv-b2" data-cpva="riskok" data-k="' + E(c.key.replace(/^risk_/, '')) + '">Reviewed</button></div>' : '')
        + (edit && c.kind === 'scope' ? '<div style="margin-top:6px"><button type="button" class="cpv-b2" data-cpva="scope">' + (c.ok ? 'Untick' : 'Tick: I checked') + '</button></div>' : '')
        + (edit && c.kind === 'ask' ? '<div style="margin-top:6px"><button type="button" class="cpv-b2" data-cpva="askdone" data-i="' + E(c.key.replace(/^ask_/, '')) + '">' + (c.ok ? 'Not answered' : 'Answered') + '</button></div>' : '')
        + (c.go === 'visit' && !c.ok ? '<div style="margin-top:6px"><button type="button" class="cpv-b2" data-cpva="visit">Open the visit\'s safety check</button></div>' : '')
        + '</div></div>').join('');
    if (edit) {
      if (g.blocked) h += '<div class="cpv-bad">This plan can\'t be approved while an unsafe issue is open. Change the plan so it\'s safe.</div>';
      h += '<div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">'
        + '<button type="button" class="cpv-b" data-cpva="approve" ' + (g.normal && canApprove() ? '' : 'disabled') + '>Approve version ' + v.n + '</button>'
        + (g.urgent ? '<button type="button" class="cpv-b cpv-red" data-cpva="approveurgent" ' + (g.urgentOk && canApprove() ? '' : 'disabled') + '>Approve for an urgent start</button>'
          + '<div class="cpv-src">Every safety check and every task\'s instructions are still required. Only the parts marked "can follow" may be finished after, within 3 days or before the second shift.</div>' : '')
        + (g.exception ? '<input class="cpv-f" id="cpvExReason" placeholder="Owner exception: why approve with the rest unfinished"><button type="button" class="cpv-b2" data-cpva="approveexception">Approve with an owner exception</button>' : '')
        + (!g.urgent ? '<details><summary class="cpv-src" style="cursor:pointer">Mark this start urgent</summary><input class="cpv-f" id="cpvUrgReason" placeholder="Why it is urgent" style="margin-top:6px"><button type="button" class="cpv-b2" style="margin-top:6px" data-cpva="markurgent">Mark urgent</button></details>' : '')
        + (!canApprove() ? '<div class="cpv-src">Only care coordinators and owners can approve.</div>' : '') + '</div>';
    }
    return h + '</div>';
  }
  /* an approved version keeps what it was approved with; a safety concern that is new since then shows in red at once */
  function approvedHtml(a, v) {
    if (['approved', 'active'].indexOf(v.status) < 0) return '';
    const had = new Set(v.risks_at_approval || []), fresh = concerns(a, leadOf(a), v).filter((c) => !had.has(c.key));
    const rv = v.owner_reviews || {};
    return '<div class="cpv-card"><h2>Approval</h2><div class="cpv-res">Approved by ' + E(v.approved_by) + ' ' + E(String(v.approved_at || '').slice(0, 10)) + (v.approved_kind === 'urgent' ? ' for an urgent start' : v.approved_kind === 'exception' ? ' with an owner exception' : '') + '</div>'
      + Object.keys(rv).map((k) => '<div class="cpv-res">Owner review by ' + E(rv[k].by) + ': ' + E(rv[k].note) + '</div>').join('')
      + (v.scope_ok ? '<div class="cpv-res">' + E(v.scope_ok.by) + ' checked each task is within our services and the caregiver\'s training</div>' : '')
      + (fresh.length ? '<div class="cpv-bad"><b>New safety concern since this was approved:</b> ' + E(fresh.map((c) => c.label).join('; ')) + '. The plan caregivers follow may not be safe. Change this plan to review it.</div>' : '')
      + '</div>';
  }
  function pushHtml(v) {
    if (['approved', 'active'].indexOf(v.status) < 0) return '';
    const x = v.push;
    let h = '<div class="cpv-card"><h2>AxisCare</h2>';
    if (x && x.error) h += '<div class="cpv-bad">Nothing was sent: ' + E(x.error) + '</div>';
    else if (x) {
      const rb = {}; (x.readback || []).forEach((r) => { rb[r.name] = r; });
      h += '<div><span class="cpv-tag ' + (x.verified ? 'grn' : 'amb') + '">' + (x.verified ? 'Every task confirmed in AxisCare' : 'Not every task is confirmed') + '</span></div>'
        + (x.steps || []).map((s) => { const r = s.step === 'task' ? rb[s.name] : null, good = s.ok && (!r || (r.in_axiscare && r.as_planned));
          return '<div class="cpv-res">' + (good ? '✓ ' : '✗ ') + E(s.step === 'note' ? 'Care plan note' : s.name + (s.action ? ', ' + s.action : '')) + (s.detail ? ' <span class="cpv-src">' + E(s.detail) + '</span>' : '') + (r && s.ok && !(r.in_axiscare && r.as_planned) ? ' <span class="cpv-src">sent, but AxisCare does not show it as planned</span>' : '') + '</div>'; }).join('')
        + (x.readback_error ? '<div class="cpv-bad">Could not read AxisCare back: ' + E(x.readback_error) + '</div>' : '')
        + (x.note_cut ? '<div class="cpv-bad" style="background:#FFF1C9;color:#5A4200">The care plan note was ' + x.note_cut + ' characters; AxisCare got the first 6,000 (the emergency steps first). The tasks carry their own instructions in full.</div>' : '')
        + ((x.others || []).length ? '<div class="cpv-src" style="margin-top:6px">Also in AxisCare, not on this plan (left as they are): ' + E(x.others.join(', ')) + '</div>' : '')
        + '<div class="cpv-src">' + E(new Date(x.at).toLocaleString()) + ' by ' + E(x.by) + '</div>';
    }
    if (!x || !x.verified) h += '<button type="button" class="cpv-b" style="margin-top:10px" data-cpva="send" ' + (S.busy ? 'disabled' : '') + '>' + (x ? 'Send again' : 'Send version ' + v.n + ' to AxisCare') + '</button>';
    return h + (S.busy ? '<div class="cpv-src">' + E(S.busy) + '</div>' : '') + '</div>';
  }
  function render() {
    const a = S.a; if (!a) return;
    css();
    let root = document.getElementById('cpvRoot');
    if (!root) { root = document.createElement('div'); root.id = 'cpvRoot'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Care plan'); document.body.appendChild(root); wire(root); }
    const p = planFor(a), vs = versionsOf(p);
    if (S.n == null || !vs.some((v) => v.n === S.n)) S.n = vs.length ? vs[vs.length - 1].n : null;
    const v = vs.find((x) => x.n === S.n), act = activeOf(p), ap = approvedOf(p);
    const recDone = S.recDone || 0, newRec = v && v.status === 'draft' && v.draft && recDone > (v.draft.parts || []).length;
    let h = '<div class="cpv-in"><div class="cpv-top"><h1>Care plan · ' + E(a.client_name || '') + '</h1><button type="button" class="cpv-b2" data-cpva="close">Close</button></div>'
      + (S.msg ? '<div class="cpv-msg">' + E(S.msg) + '</div>' : '')
      + (vs.length ? '<div class="cpv-vs">' + vs.map((x) => '<button type="button" data-cpva="ver" data-n="' + x.n + '" class="' + (x.n === S.n ? 'on' : '') + '">Version ' + x.n + ' · ' + E(STATUS_W[x.status] || x.status) + (x.urgent && !x.urgent.done_at ? ' · urgent' : '') + '</button>').join('') + '</div>' : '');
    if (!v) {
      h += '<div class="cpv-card"><h2>No care plan yet</h2><p>The draft is written as soon as the home visit is finished. You can also start it now from what the visit has.</p><button type="button" class="cpv-b" data-cpva="draftnow">Draft the care plan from the visit</button></div></div>';
      root.innerHTML = h; return;
    }
    const edit = v.status === 'draft';
    const tags = '<div style="margin-bottom:10px"><span class="cpv-tag">' + E(STATUS_W[v.status] || v.status) + '</span>'
      + (v.approved_by ? '<span class="cpv-src">Approved by ' + E(v.approved_by) + ' ' + E(String(v.approved_at || '').slice(0, 10)) + (v.approved_kind === 'urgent' ? ', urgent start' : v.approved_kind === 'exception' ? ', owner exception: ' + E(v.exception_reason) : '') + '</span>' : '')
      + (v.urgent && !v.urgent.done_at ? '<div class="cpv-bad" style="background:#FFF1C9;color:#5A4200">Urgent start: finish by ' + E(new Date(v.urgent.finish_by).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + ': ' + E(v.urgent.items.join('; ')) + '</div>' : '')
      + (act && act !== v && v.status !== 'superseded' ? '<div class="cpv-src">Caregivers still follow version ' + act.n + ' in AxisCare until this one is approved and sent.</div>' : '')
      + '</div>';
    if (v.status === 'drafting') h += tags + '<div class="cpv-card"><h2>Writing the draft…</h2><p>The draft is being written from the visit' + (v.drafting_since ? ', started ' + E(new Date(v.drafting_since).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })) : '') + '. It usually takes a minute or two.</p>'
      + (v.drafting_since && Date.now() - Date.parse(v.drafting_since) > 5 * 6e4 ? '<button type="button" class="cpv-b" data-cpva="draftnow">Try again</button>' : '') + '</div>';
    else if (v.status === 'draft_failed') h += tags + '<div class="cpv-card"><h2>The draft didn\'t work</h2><div class="cpv-bad">' + E(v.error || '') + '</div><button type="button" class="cpv-b" data-cpva="draftnow">Try again</button></div>';
    else {
      h += tags + (newRec ? '<div class="cpv-msg">More of the recording is written out. <button type="button" class="cpv-b2" data-cpva="recupdate">Update the draft</button> <span class="cpv-src">Lines you edited stay exactly as you wrote them.</span></div>' : '')
        + (!edit && v.status !== 'before' && v.status !== 'superseded' ? '<div style="margin-bottom:12px"><button type="button" class="cpv-b2" data-cpva="newver">Change this plan (starts version ' + (Math.max(...vs.map((x) => x.n)) + 1) + ')</button></div>' : '')
        + (v.status === 'before' ? '<div class="cpv-msg">Written before care plans had approvals. Kept exactly as it was. ' + (ap ? '' : '<button type="button" class="cpv-b2" data-cpva="draftnow">Draft version 1 from the visit</button>') + '</div>' : '')
        + '<div class="cpv-grid"><div>'
        + '<div class="cpv-card" id="cpv_fields"><h2>The plan</h2>' + FIELDS.map(([k, l]) => '<div class="cpv-p" style="margin-top:4px"><b>' + E(l) + '</b>' + lineHtml('field.' + k, (v.fields || {})[k], edit, k === 'narrative' ? 4 : 2) + '</div>').join('') + '</div>'
        + '<div class="cpv-card"><h2>Caregiver tasks for AxisCare</h2>' + ((v.tasks || []).map((t, i) => taskHtml(t, i, edit)).join('') || '<div class="cpv-src">No tasks yet.</div>')
        + (edit && S.catalog ? '<select class="cpv-f" style="margin-top:10px" data-cpvsel="addtask"><option value="">+ Add a task from AxisCare\'s list…</option>' + S.catalog.filter((c) => !(v.tasks || []).some((t) => +t.adl_id === +c.id)).map((c) => '<option value="' + c.id + '">' + E(c.name) + '</option>').join('') + '</select>' : '')
        + '</div>'
        + '<details class="cpv-card"><summary style="cursor:pointer;font-weight:700">History</summary>' + (v.history || []).map((x) => '<div class="cpv-res">' + E(String(x.at).slice(0, 16).replace('T', ' ')) + ' · ' + E(x.by) + ' · ' + E(x.what) + '</div>').join('') + '</details>'
        + emHtml(a)
        + '</div><div>' + (edit ? checksHtml(a, v) : approvedHtml(a, v)) + pushHtml(v) + '</div></div>';
    }
    root.innerHTML = h + '</div>';
  }
  function wire(root) {
    root.addEventListener('input', (e) => {
      const k = e.target.getAttribute && e.target.getAttribute('data-cpv'); if (!k) return;
      const v = cur(); if (!v || v.status !== 'draft') return;
      const ps = k.split('.');
      if (ps[0] === 'field') { v.fields[ps[1]] = { text: e.target.value, src: (v.fields[ps[1]] || {}).src || [], ask: false, edited: true }; }
      else if (ps[0] === 'task') setPart(v.tasks[+ps[1]], ps[2], e.target.value);
      e.target.classList.toggle('cpv-ask', !e.target.value.trim());
      clearTimeout(S.t); S.t = setTimeout(async () => { log(v, 'Edited'); await save(planFor(S.a), S.a); }, 1200);
    });
    root.addEventListener('change', async (e) => {
      const k = e.target.getAttribute && e.target.getAttribute('data-cpvsel'); if (!k) return;
      const v = cur(); if (!v || v.status !== 'draft') return;
      if (k === 'addtask') { const c = (S.catalog || []).find((x) => String(x.id) === e.target.value); if (c) { const days = Object.keys(((S.a.visit || {}).week) || {}).filter((d) => ((S.a.visit.week[d]) || {}).from).map((d) => ({ sun: 'N', mon: 'M', tue: 'T', wed: 'W', thu: 'R', fri: 'F', sat: 'S' })[d]);
        const em = () => ({ text: '', src: [], ask: true }); v.tasks.push({ id: uidv(), adl_id: c.id, name: c.name, key: c.adlKey || null, days, require: 1, when: 0, edited_sched: true, parts: { when: em(), how: { steps: [], ask: true }, equipment: em(), preferences: em(), safety: em(), report_if: em() } }); log(v, 'Added ' + c.name); } }
      else { const t = v.tasks[+e.target.getAttribute('data-i')]; t[k] = +e.target.value; if (k === 'require' && +e.target.value === 2) t.when = 0; t.edited_sched = true; }
      await save(planFor(S.a), S.a); render();
    });
    root.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-cpva]'); if (!b) return;
      const act = b.getAttribute('data-cpva'), v = cur(), p = S.a && planFor(S.a);
      S.msg = '';
      if (act === 'close') { close(); return; }
      if (act === 'ver') { S.n = +b.getAttribute('data-n'); return render(); }
      if (act === 'draftnow') { draft(S.a, { from: 'visit' }); return; }
      if (act === 'recupdate') { draft(S.a, { from: 'recording' }); return; }
      if (act === 'visit') { close(); if (window.HV) HV.open({ id: S.a.id, sec: 2 }); return; }
      if (act === 'newver') { await newFrom(v.n); return; }
      if (act === 'send') { await send(); return; }
      if (!v || v.status !== 'draft') return;
      if (act === 'day') { const t = v.tasks[+b.getAttribute('data-i')], d = b.getAttribute('data-v'); t.days = (t.days || []).indexOf(d) > -1 ? t.days.filter((x) => x !== d) : (t.days || []).concat([d]); t.edited_sched = true; }
      else if (act === 'deltask') { const t = v.tasks.splice(+b.getAttribute('data-i'), 1)[0]; log(v, 'Removed ' + (t && t.name)); }
      else if (act === 'scope') { v.scope_ok = v.scope_ok ? null : { by: me(), at: now() }; log(v, v.scope_ok ? 'Checked each task is within our services and the caregiver\'s training' : 'Unticked the services check'); }
      else if (act === 'na' || act === 'naundo') { const t = v.tasks[+b.getAttribute('data-i')], k = b.getAttribute('data-k'); if (!t || NA_PARTS.indexOf(k) < 0) return;
        t.parts[k] = act === 'na' ? { text: '', src: [], ask: false, edited: true, na: true } : { text: '', src: [], ask: true, edited: true };
        log(v, t.name + ': ' + (k === 'equipment' ? 'equipment and supplies' : 'their preferences') + (act === 'na' ? ' marked not needed' : ' to be written')); }
      else if (act === 'askdone') { const i = b.getAttribute('data-i'); v.asks_done = v.asks_done || {}; v.asks_done[i] = !v.asks_done[i]; }
      else if (act === 'riskok') { if (!isOwner()) return; const k = b.getAttribute('data-k'), n = (document.getElementById('cpvRisk_risk_' + k) || {}).value || ''; if (n.trim().length < 3) { S.msg = 'Say how the plan handles it.'; return render(); }
        v.owner_reviews = v.owner_reviews || {}; v.owner_reviews[k] = { by: me(), at: now(), note: n.trim() }; log(v, 'Owner reviewed: ' + k);
        if (concerns(S.a, leadOf(S.a), v).filter((c) => c.kind === 'high').every((c) => v.owner_reviews[c.key])) await closeCard('owner_review', p, '', 'Every concern reviewed'); }
      else if (act === 'markurgent') { const r = (document.getElementById('cpvUrgReason') || {}).value || ''; if (r.trim().length < 3) { S.msg = 'Say why it is urgent.'; return render(); } v.urgent_mark = { by: me(), at: now(), reason: r.trim() }; log(v, 'Marked urgent: ' + r.trim()); }
      else if (act === 'approve') return approve('normal');
      else if (act === 'approveurgent') return approve('urgent');
      else if (act === 'approveexception') return approve('exception');
      await save(p, S.a); render();
    });
  }
  async function loadSide(a) {
    try { if (!S.catalog && typeof cptCall === 'function') { const d = await cptCall({ action: 'catalog' }); if (d && d.catalog) S.catalog = d.catalog; } } catch (e) {}
    try { const r = await sb.from('recordings').select('id, status').eq('kind', 'assessment').eq('subject_id', String(a.id)); S.recDone = ((r && r.data) || []).filter((x) => x.status === 'done').length; } catch (e) {}
    if (S.a === a) render();
  }
  function paint(a) { if (S.a && a && S.a.id === a.id && document.getElementById('cpvRoot')) render(); }
  function open(assessmentId) {
    const a = (D().care_assessments || []).find((x) => x && x.id === assessmentId); if (!a) return;
    S.a = a; S.n = null; S.msg = ''; S.busy = ''; render(); loadSide(a);
  }
  function close() { const r = document.getElementById('cpvRoot'); if (r) r.remove(); S.a = null; try { if (typeof cpRenderCare === 'function') cpRenderCare(); } catch (e) {} }
  /* the older care plan form (the pasted-transcript path) no longer sends anything: what it holds becomes a draft version,
     written by a person, reviewed and approved here like any other */
  async function fromForm(a, form, tasks) {
    const p = ensurePlan(a);
    let v = latest(p);
    if (!v || v.status !== 'draft') v = newVersion(p, 'by hand', approvedOf(p));
    FIELDS.forEach(([k]) => { const t = String(form[k] || '').trim(); const c = (v.fields || {})[k]; if (t && (!c || c.text !== t)) v.fields[k] = { text: t, src: [], ask: false, edited: true }; });
    (tasks || []).filter((t) => t && t.adl_id).forEach((t) => {
      let x = v.tasks.find((y) => +y.adl_id === +t.adl_id);
      const em = () => ({ text: '', src: [], ask: true });
      if (!x) { x = { id: uidv(), adl_id: +t.adl_id, name: t.name, key: t.key || null, parts: { when: em(), how: { steps: [], ask: true }, equipment: em(), preferences: em(), safety: em(), report_if: em() } }; v.tasks.push(x); }
      Object.assign(x, { days: t.days || [], require: +t.require === 2 ? 2 : 1, when: +t.when || 0, edited_sched: true });
      if (t.instructions && !(x.parts.how.steps || []).some((s) => s.text === t.instructions)) x.parts.how = { steps: (x.parts.how.steps || []).concat([{ text: t.instructions, src: [], ask: false }]), ask: false, edited: true };
    });
    log(v, 'Saved from the care plan form'); await save(p, a); await cards(a, p);
    open(a.id);
  }
  /* ---------- what a caregiver does when something goes wrong (Stage 2) ----------
     Samantha approved this wording word for word on 2026-10-29 ("Approved as drafted: never lift ... (417) 234-8494 reaches
     after hours too. Put it in Settings for owners."), from her Care Library fall rule, the Employee Handbook (4S, 4T, 4V, 4W,
     5D, 5E, 5AQ, 5AR) and the agreement's Exhibit D. Owners change it in Settings > Home visit (ops_settings.emergency_wording).
     {name} {they} {them} {is} {asks} {seems} {passes} {contact} {office} are filled in for each client. */
  const EM_DEFAULT = {
    office: '(417) 234-8494',
    blocks: [
      { key: 'life', title: 'If it might be life-threatening', text: 'Chest pain, trouble breathing, signs of a stroke (face drooping, arm weakness, slurred speech), not responding, severe bleeding, a seizure, choking, a serious allergic reaction, or a serious fall:\n1. Call 911 right away and follow what the dispatcher tells you.\n2. Stay with {name} until help arrives, unless you are not safe.\n3. Then call the office.\nWhen in doubt, call 911.' },
      { key: 'fall', title: 'If {name} falls', text: '1. Do not lift {them} or help {them} up, even if {they} {asks}.\n2. Stay with {them}. Check for pain, bleeding or a bump on the head.\n3. Keep {them} comfortable and warm on the floor with a pillow and blanket.\n4. Call 911 if {they} {is} hurt or if you are not sure.\n5. Call the office every time, even if {they} {seems} fine. Every fall gets an incident report.' },
      { key: 'door', title: "If {name} doesn't answer the door", text: '1. Knock and say who you are.\n2. Call {name}.\n3. Check the instructions in AxisCare.\n4. Call the office, and wait for what to do next.' },
      { key: 'unsafe', title: 'If you feel unsafe', text: '1. Leave the area if you need to.\n2. Call 911 if you are in danger.\n3. Then call the office.' },
      { key: 'hospice', title: 'If {name} is on hospice', text: "If {they} {passes} away during your visit, follow the hospice's instructions instead of calling 911, then call the office.", only: 'hospice' },
      { key: 'who', title: 'Who to call', text: "The office first: {office}.\nThe office calls {contact} for you.\nAnything you're unsure about: stop, stay calm, and call the office. You are never expected to handle it alone." },
    ],
  };
  function emWording() { const w = (D().ops_settings || {}).emergency_wording; return w && Array.isArray(w.blocks) && w.blocks.length ? w : EM_DEFAULT; }
  function officePhone() { return emWording().office || EM_DEFAULT.office; }
  /* the wording for one client: their name, pronouns from the lead (they/them when not known), their emergency contact, warning signs */
  function emergency(a) {
    const v = (a && a.visit) || {}, l = leadOf(a), g = String((l && l.client_gender) || '').toLowerCase();
    const called = String(((v.story || {}).called) || '').trim(), first = called || String((a && a.client_name) || '').trim().split(/\s+/)[0] || 'the client';
    const pr = g === 'female' ? { they: 'she', them: 'her', is: 'is', asks: 'asks', seems: 'seems', passes: 'passes' } : g === 'male' ? { they: 'he', them: 'him', is: 'is', asks: 'asks', seems: 'seems', passes: 'passes' }
      : { they: 'they', them: 'them', is: 'are', asks: 'ask', seems: 'seem', passes: 'pass' };
    const ec = (v.safety || {}).ec || {};
    const their = { she: 'her', he: 'his', they: 'their' }[pr.they];
    const contact = ec.name ? ec.name + (ec.rel ? ', ' + their + ' ' + String(ec.rel).toLowerCase() + ',' : '') : 'the family';
    const hospice = /hospice/i.test(JSON.stringify(v.conditions || [])) || ((v.prefs || {}).skills || []).indexOf('hospice_support') > -1 || ((l && l.client_attributes) || {}).hospice === 'yes';
    const fill = (t) => String(t || '').replace(/\{(name|they|them|is|asks|seems|passes|contact|office)\}/g, (m, k) => k === 'name' ? first : k === 'contact' ? contact : k === 'office' ? officePhone() : pr[k]);
    const out = emWording().blocks.filter((b) => !b.only || (b.only === 'hospice' && hospice)).map((b) => ({ key: b.key, title: fill(b.title), text: fill(b.text) }));
    const low = (t) => (/^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);   /* "Dizzy when..." reads "If dizzy when..."; a name or acronym stays */
    const warn = (v.conditions || []).filter((c) => c && c.name && (c.notice || c.todo)).map((c) => 'If ' + low(String(c.notice || ('anything changes with ' + c.name)).trim().replace(/\.$/, '')) + ': ' + low(String(c.todo || 'call the office.').trim()) + (/[.!?]$/.test(String(c.todo || '.').trim()) ? '' : '.'));
    if (warn.length) out.splice(out.length - 1, 0, { key: 'warn', title: 'Warning signs for ' + first, text: warn.join('\n') });
    return out;
  }
  const emText = (a) => emergency(a).map((b) => b.title.toUpperCase() + ':\n' + b.text).join('\n\n');
  function emHtml(a) { return '<div class="cpv-card"><h2>If something goes wrong</h2><div class="cpv-src">The same for every client, set by owners in Settings, with ' + E(String(((a.visit || {}).story || {}).called || a.client_name || '').split(/\s+/)[0]) + '\'s details filled in.</div>'
    + emergency(a).map((b) => '<div class="cpv-res"><b>' + E(b.title) + '</b><div style="white-space:pre-wrap">' + E(b.text) + '</div></div>').join('') + '</div>'; }
  /* Settings > Home visit, owners only */
  function emSettingsHtml() {
    const w = emWording();
    return '<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px"><b>What a caregiver does when something goes wrong</b>'
      + '<div class="field-note">Shown on every care plan and sent to AxisCare with it. {name} becomes the client\'s name, {they} {them} {is} {asks} {seems} {passes} follow the client, {contact} is their emergency contact, {office} is the number below. Approved by Samantha Oct 29, 2026.</div>'
      + '<label class="field-note" style="display:flex;flex-direction:column;gap:4px;margin-top:8px">Office phone, day and night<input id="emSet_office" value="' + E(w.office || EM_DEFAULT.office) + '" style="width:200px"></label>'
      + w.blocks.map((b, i) => '<label class="field-note" style="display:flex;flex-direction:column;gap:4px;margin-top:8px">' + E(b.title) + (b.only ? ' (only for hospice clients)' : '')
        + '<textarea id="emSet_' + i + '" rows="' + Math.min(7, String(b.text).split('\n').length + 1) + '" style="width:100%">' + E(b.text) + '</textarea></label>').join('')
      + '<div style="display:flex;gap:8px;margin-top:8px;align-items:center"><button class="secondary" onclick="CPV.emSave(this)">Save the wording</button><span class="field-note" id="emSetSaved"></span></div></div>';
  }
  async function emSave(btn) {
    if (!isOwner()) { alert('Only owners can change this wording.'); return; }
    const w = emWording(), blocks = w.blocks.map((b, i) => Object.assign({}, b, { text: String((document.getElementById('emSet_' + i) || {}).value || '').trim() }));
    if (blocks.some((b) => !b.text)) { alert('Every part needs its wording.'); return; }
    const office = String((document.getElementById('emSet_office') || {}).value || '').trim();
    if (!/\d{3}.*\d{4}/.test(office)) { alert('Enter the office phone number.'); return; }
    if (btn) btn.disabled = true;
    const out = await tkMerge((st) => { st.emergency_wording = { office, blocks, by: me(), at: now() }; return ['Emergency wording for caregivers changed']; }, 'Emergency wording');
    if (btn) btn.disabled = false;
    const sv = document.getElementById('emSetSaved'); if (sv) sv.textContent = out && out.error ? 'Could not save: ' + out.error.message : 'Saved. Every care plan uses it from now on.';
  }
  /* the one line the Care tab shows */
  function label(a) { const p = planFor(a); if (!p) return 'no care plan yet'; const v = latest(p), act = activeOf(p); if (!v) return 'no care plan yet';
    return 'care plan v' + v.n + ' ' + (STATUS_W[v.status] || v.status).toLowerCase() + (act && act !== v ? ' (v' + act.n + ' active)' : '') + (v.urgent && !v.urgent.done_at ? ', urgent start' : ''); }

  window.CPV = { open, close, autoDraft, draft, label, fromForm, emergency, emText, emSettingsHtml, emSave, officePhone, EM_DEFAULT, safetyMissing, concerns, checks, gate, finishBy, urgentWhy, merge, instructions, safetyWatch, HAZARDS, SUMMON, _s: S, _versions: versionsOf, _plan: planFor };
})();
