/* =============================================================================
   medicaid-plans.js · the state's Medicaid care plan, in the client's profile (GHE fix, slice 1, Samantha 2026-10-08)

   Her rule: the care plan is uploaded in the intake, in the client's profile (Payer tab), not in a separate place.
   The Medicaid coordinator uploads the PDF downloaded from Fusion. care-plan-rules.js reads it; the coordinator sees
   everything that was read, enters the date we received the plan, and confirms. Nothing is saved before that.
   A plan for someone else is caught: a DCN that isn't this client's stops it; a different name must be confirmed.
   On confirm:
     · the plan is kept under app_data 'medicaid_plans' (what it said and who confirmed it; never the address,
       phone or date of birth; the PDF itself stays in Fusion); an empty DCN on the inquiry is filled from it
     · each GHE month the plan authorizes goes onto the nurse board for that client (added if they weren't there)
   Nothing is sent to Fusion, AxisCare or anyone, and "where the state is" is left for the person to set.

   Nurse Scheduling shows every active client's standing (current plan / plan ended / Medicaid with no plan / not
   Medicaid / not sorted); each name opens their profile on the Payer tab to upload.
   ============================================================================= */
(function () {
  'use strict';
  const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
  const PDFJS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const PAYERS = { private: 'Private pay', va: 'VA', ltc: 'Long-term care insurance', cds: 'CDS (CDS side)', other: 'Other' };
  const MCP = { pending: null, showAll: false };
  window.MCP_STATE = MCP;
  const h = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s));
  const usd = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || '')); return m ? m[2] + '/' + m[3] + '/' + m[1] : (d || ''); };
  const mon = m => { const x = /^(\d{4})-(\d{2})/.exec(String(m || '')); return x ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+x[2] - 1] + ' ' + x[1] : ''; };
  const plans = () => (typeof DATA !== 'undefined' && DATA.medicaid_plans) || [];
  const me = () => (typeof ME !== 'undefined' && (ME.email || ME.name)) || '';
  const todayIso = () => (typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10));
  const say = m => { if (typeof ccToast === 'function') ccToast(m); };
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  const lastName = s => { const p = norm(s).split(' '); return p[p.length - 1] || ''; };

  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = PDFJS_URL;
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; res(); };
      s.onerror = () => rej(new Error('The PDF reader could not load. Check the internet connection and try again.'));
      document.head.appendChild(s);
    });
  }
  async function itemsOf(file) {
    await loadPdfJs();
    const doc = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise, out = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const tc = await (await doc.getPage(p)).getTextContent();
      tc.items.forEach(i => out.push({ page: p, x: i.transform[4], y: i.transform[5], str: i.str }));
    }
    return out;
  }

  /* the client whose profile is open */
  function target() {
    if (typeof CP === 'undefined' || !CP) return null;
    const lead = CP.lead || null, ax = String(CP.ax || (lead && lead.axiscare_client_id) || '');
    const name = (CP.r && CP.r.client_name) || (lead && typeof cpLeadClientName === 'function' ? cpLeadClientName(lead) : '') || '';
    return (lead || ax) ? { lead, lead_id: lead ? String(lead.id) : '', ax, name, dcn: String((lead && lead.dcn) || '').trim() } : null;
  }
  const mine = t => plans().filter(p => p.kind === 'plan' && ((t.lead_id && String(p.lead_id || '') === t.lead_id) || (t.ax && String(p.axiscare_client_id || '') === t.ax)))
    .sort((a, b) => String(b.plan_end).localeCompare(String(a.plan_end)) || String(b.generated).localeCompare(String(a.generated)));

  /* read one file (the tests call mcpAddItems with items already read) */
  async function addPlan(fileName, read) {
    const t = target(); if (!t) return null;
    const row = { id: 'p' + Math.random().toString(36).slice(2, 9), file_name: fileName, reading: true, t };
    MCP.pending = row; refresh();
    try {
      const plan = CarePlanRules.parse(await read());
      Object.assign(row, { reading: false, plan, summary: CarePlanRules.summary(plan, todayIso()), received: '', nameOk: false });
    } catch (e) { Object.assign(row, { reading: false, error: String((e && e.message) || e) }); }
    await refresh();
    return row;
  }
  window.mcpUpload = async function (input) {
    const f = (input.files || [])[0]; input.value = '';
    if (f) await addPlan(f.name, () => itemsOf(f));
  };
  window.mcpAddItems = (fileName, items) => addPlan(fileName, async () => items);
  window.mcpRecv = v => { if (MCP.pending) { MCP.pending.received = v; refresh(); } };
  window.mcpNameOk = v => { if (MCP.pending) { MCP.pending.nameOk = !!v; refresh(); } };
  window.mcpDiscard = () => { MCP.pending = null; refresh(); };

  /* is this the right person's plan, and is everything entered */
  function checks(r) {
    const stop = [].concat(r.summary ? r.summary.stops : ['The plan could not be read.']), need = [];
    const p = r.plan || {}, t = r.t;
    if (t.dcn && p.dcn && t.dcn !== p.dcn) stop.push('This plan is for DCN ' + p.dcn + ', but this client\'s DCN is ' + t.dcn + '. Check you have the right PDF.');
    const nameDiff = !!(p.name && t.name && lastName(p.name) !== lastName(t.name));
    if (nameDiff && !r.nameOk) need.push('Confirm this is ' + t.name + '\'s plan.');
    if (!r.received) need.push('Enter the date we received this plan.');
    else if (r.received > todayIso()) need.push('The received date can\'t be in the future.');
    return { stop, need, nameDiff };
  }

  window.mcpSave = async function () {
    const r = MCP.pending; if (!r || r.saving) return;
    const c = checks(r); if (c.stop.length || c.need.length) { refresh(); return; }
    r.saving = true; refresh();
    try {
      const t = r.t;
      const rec = CarePlanRules.record(r.plan, { ax: t.ax, client_name: t.name, received_on: r.received, by: me(), at: new Date().toISOString(), file_name: r.file_name });
      rec.lead_id = t.lead_id;
      if (!t.ax) rec.id = 'mcp_L' + t.lead_id + '_' + String(r.plan.plan_start || '') + '_' + String(r.plan.generated || '');
      if (c.nameDiff) rec.name_confirmed = { plan_name: r.plan.name, by: me() };
      DATA.medicaid_plans = plans().filter(p => p.id !== rec.id).concat([rec]);
      await persist('medicaid_plans', rec);
      if (t.lead && !t.dcn && r.plan.dcn) { t.lead.dcn = r.plan.dcn; await persist('leads', t.lead); }
      const ghes = r.summary.ghes; let boardNote = '';
      if (ghes.length) {
        DATA.nurse_clients = DATA.nurse_clients || [];
        let nc = DATA.nurse_clients.find(x => x.active !== false && ((t.ax && String(x.axiscare_client_id || '') === t.ax) || (t.lead_id && String(x.lead_id || '') === t.lead_id)));
        const bm = CarePlanRules.boardMonths(nc, ghes);
        if (!nc) {
          const idr = (typeof CL360_IDENTITY !== 'undefined' && CL360_IDENTITY || []).find(x => t.ax && String(x.axiscare_client_id) === t.ax);
          nc = { id: uid(), name: t.name, axiscare_client_id: t.ax || '', lead_id: t.lead_id || '', phone: (idr && idr.phone) || (t.lead && (t.lead.client_phone || t.lead.phone)) || '',
                 weekly_meds: false, assigned_nurse: '', notes: '', active: true, added_at: new Date().toISOString(), added_by: me(), added_from: 'care_plan' };
          DATA.nurse_clients.push(nc); boardNote = ' Added to the nurse board.';
        }
        Object.assign(nc, bm, { ghe_from_plan: rec.id, ghe_updated_at: new Date().toISOString(), ghe_updated_by: me() });
        await persist('nurse_clients', nc);
        boardNote = ' GHE ' + ghes.map(g => mon(g.month)).join(', ') + ' on the nurse board.' + boardNote;
      }
      MCP.pending = null;
      say('Care plan saved for ' + t.name + '.' + boardNote);
      if (typeof cpRenderPayer === 'function') cpRenderPayer(); else refresh();
    } catch (e) { r.saving = false; r.saveError = 'Not saved: ' + String((e && e.message) || e); refresh(); }
  };

  function pendingHtml(r) {
    if (r.reading) return '<div class="mcp-pend"><b>' + h(r.file_name) + '</b> <span class="field-note">reading…</span></div>';
    if (r.error) return '<div class="mcp-pend"><b>' + h(r.file_name) + '</b><div class="mcp-stop">' + h(r.error) + '</div><button class="ghost" onclick="mcpDiscard()">Remove</button></div>';
    const p = r.plan, s = r.summary, c = checks(r), ok = !c.stop.length;
    const svc = s.ours.map(x => '<tr><td>' + h(x.label) + (x.type && x.label !== x.type ? ' <span class="field-note">(' + h(x.type) + ')</span>' : '') + '</td><td>' + usd(x.start) + ' to ' + usd(x.end) + '</td><td>'
      + h(x.units.length ? (x.units.length + ' month' + (x.units.length === 1 ? '' : 's') + ', ' + (u => u.join(' / ') + (u.length === 1 && u[0] === 1 ? ' unit ' : ' units '))(Array.from(new Set(x.units.map(u => u.units)))) + (x.units[0].code || '')) : '') + '</td><td>' + h(x.prior_auth) + '</td></tr>').join('');
    return '<div class="mcp-pend" id="mcpPend">'
      + '<div class="mcp-head"><b>' + h(p.name || '(no name read)') + '</b><span class="field-note">DCN ' + h(p.dcn || '?') + ' · plan ' + usd(p.plan_start) + ' to ' + usd(p.plan_end) + (p.generated ? ' · generated ' + usd(p.generated) : '') + ' · ' + h(r.file_name) + '</span></div>'
      + c.stop.map(x => '<div class="mcp-stop">' + h(x) + '</div>').join('')
      + (svc ? '<div class="mcp-tbl"><table><thead><tr><th>Our service</th><th>Dates</th><th>Authorized</th><th>Prior authorization</th></tr></thead><tbody>' + svc + '</tbody></table></div>' : '')
      + (s.ghes.length ? '<div class="mcp-ghe">GHE authorized: <b>' + s.ghes.map(g => mon(g.month) + (g.code ? ' (' + h(g.code) + ')' : '')).join(', ') + '</b>. This goes on the nurse board when you confirm.</div>' : (s.needsGhe ? '' : '<div class="field-note">No GHE on this plan, and none expected for these services.</div>'))
      + s.notes.map(x => '<div class="mcp-note">' + h(x) + '</div>').join('')
      + (ok ? '<div class="mcp-form">'
        + (c.nameDiff ? '<label class="mcp-chk"><input type="checkbox" id="mcpNameOk"' + (r.nameOk ? ' checked' : '') + ' onchange="mcpNameOk(this.checked)"> The plan says ' + h(p.name) + '. Yes, this is ' + h(r.t.name) + '\'s plan.</label>' : '')
        + '<label>Date we received this plan <input type="date" id="mcpRecv" value="' + h(r.received) + '" max="' + todayIso() + '" onchange="mcpRecv(this.value)"></label>'
        + '</div>' : '')
      + (r.saveError ? '<div class="mcp-stop">' + h(r.saveError) + '</div>' : '')
      + '<div class="mcp-acts">' + (ok ? '<button class="primary" id="mcpSave" ' + (c.need.length || r.saving ? 'disabled' : '') + ' onclick="mcpSave()">' + (r.saving ? 'Saving…' : 'Confirm and save') + '</button>' : '')
      + '<button class="ghost" onclick="mcpDiscard()">' + (ok ? 'Cancel' : 'Remove') + '</button>'
      + (ok && c.need.length ? '<span class="field-note">' + h(c.need.join(' ')) + '</span>' : '') + '</div>'
      + '</div>';
  }

  /* the Payer tab of the client's profile */
  window.mcpProfileRender = function () {
    const box = document.getElementById('cpPlanBox'); if (!box) return;
    const t = target();
    if (!t) { box.innerHTML = ''; return; }
    if (MCP.pending && (MCP.pending.t.lead_id !== t.lead_id || MCP.pending.t.ax !== t.ax)) MCP.pending = null;
    const list = mine(t), cur = list[0], tdy = todayIso();
    const lead = t.lead, st = lead && lead.state_status;
    box.innerHTML = '<div class="mcp-top"><div><b class="mcp-title">State care plan</b>'
      + '<div class="field-note">For a Medicaid client: download their care plan from Fusion and upload the PDF here. You check what was read and confirm it; the GHE months go on the nurse board. Fusion stays the official record; the PDF itself is not kept here.</div></div>'
      + '<label class="mcp-up">' + (cur ? 'Upload a newer plan' : 'Upload the care plan') + '<input type="file" id="mcpFile" accept="application/pdf,.pdf" onchange="mcpUpload(this)"></label></div>'
      + (MCP.pending ? '<div class="mcp-pends">' + pendingHtml(MCP.pending) + '</div>' : '')
      + (cur ? '<div class="mcp-cur"><span class="mcp-chip ' + (cur.plan_end >= tdy ? 'ok' : 'warn') + '">' + (cur.plan_end >= tdy ? 'Current plan' : 'Plan ended') + '</span> '
        + usd(cur.plan_start) + ' to ' + usd(cur.plan_end) + (cur.ghe_months && cur.ghe_months.length ? ' · GHE ' + cur.ghe_months.map(mon).join(', ') : '')
        + '<div class="field-note">Received ' + usd(cur.received_on) + ', confirmed by ' + h(cur.confirmed_by) + (cur.generated ? ' · Fusion generated ' + usd(cur.generated) : '') + '</div>'
        + (cur.services || []).filter(x => x.ours).map(x => '<div class="field-note">' + h(x.label) + ': ' + usd(x.start) + ' to ' + usd(x.end) + (x.prior_auth ? ' · PA ' + h(x.prior_auth) : '') + '</div>').join('')
        + (lead && cur.plan_end >= tdy && st !== 'authorized' ? '<div class="mcp-note">Where the state is still says "' + h(st || 'not set') + '". If this plan is the authorization, set it to Authorized above and Save.</div>' : '')
        + (list.length > 1 ? '<div class="field-note">' + (list.length - 1) + ' earlier plan' + (list.length === 2 ? '' : 's') + ' on file.</div>' : '')
        + '</div>' + startHtml(cur, lead) + watchHtml(cur) + changesHtml(cur) : (MCP.pending ? '' : '<div class="field-note mcp-none">No care plan uploaded yet.</div>'));
  };

  /* ── Starting care (Medicaid intake slice A, 2026-10-08): the 10-day clock, the late justification, the start checks ── */
  const firstShiftOf = (cur, lead) => (lead && lead.first_shift_at) || (cur.start && cur.start.started_on_manual) || '';
  function startHtml(cur, lead) {
    if (typeof IhsRules === 'undefined' || !cur) return '';
    const c = IhsRules.startClock(cur, firstShiftOf(cur, lead), todayIso());
    if (!c.applies) return c.continuing ? '<div class="mcp-start"><b>Starting care</b><div class="field-note">Care began ' + usd(c.started) + ', before this plan arrived, so this is a renewal or change: no new 10-day start clock.</div></div>' : '';
    const st = cur.start || {}, chk = st.checks || {}, late = st.late || null;
    const tone = { waiting: 'ok', soon: 'warn', due_today: 'warn', overdue: 'bad', started_on_time: 'ok', started_late: 'warn' }[c.state];
    const words = c.state === 'started_on_time' ? 'Started ' + usd(c.started) + ' (first clock-in), on time'
      : c.state === 'started_late' ? 'Started ' + usd(c.started) + ', ' + c.late_days + ' day' + (c.late_days === 1 ? '' : 's') + ' after the ' + usd(c.due) + ' deadline'
      : c.state === 'overdue' ? 'Not started: the deadline was ' + usd(c.due) + ' (' + (-c.left) + ' day' + (c.left === -1 ? '' : 's') + ' ago)'
      : c.state === 'due_today' ? 'Start care today: the deadline is today (' + usd(c.due) + ')'
      : 'Start care by ' + usd(c.due) + ' (' + c.left + ' day' + (c.left === 1 ? '' : 's') + ' left)';
    let h = '<div class="mcp-start"><b>Starting care</b> <span class="mcp-chip ' + tone + '">' + h_(words) + '</span>'
      + '<div class="field-note">The state rule: care starts ' + h_(c.rule) + ' (19 CSR 15-7.021(18)(J)). Started means the first clock-in in AxisCare.</div>';
    if (!(lead && lead.first_shift_at)) h += '<div class="mcp-form"><label>First visit, from AxisCare (if the Hub hasn\'t seen it) <input type="date" id="mcpSManual" value="' + h_(st.started_on_manual || '') + '" max="' + todayIso() + '" onchange="mcpStartManual(this.value)"></label></div>';
    if (IhsRules.needsJustification(c)) {
      if (late) h += '<div class="mcp-note"><b>Written justification sent to DSDS</b> ' + usd(late.sent_on) + ' (' + h_(late.how) + '), copy in the file. Recorded by ' + h_(late.by) + '. <span class="field-note">' + h_(late.reason) + '</span></div>';
      else {
        const dr = (MCP.draft && MCP.draft.id === cur.id) ? MCP.draft : (MCP.draft = { id: cur.id, reason: '', planned_start: '', sent_on: '', how: '', copy_in_file: false, text: '' });
        const draft = dr.text || IhsRules.draftJustification({ name: cur.client_name, dcn: cur.dcn, received: c.received, due: c.due, started: c.started || '', reason: dr.reason, planned_start: dr.planned_start });
        h += '<div class="mcp-late"><b style="color:var(--red)">Written justification owed to DSDS</b>'
          + '<div class="field-note">Late starts need a detailed written justification sent to DSDS, with a copy in the client\'s file. The Hub drafts it; you edit it and send it yourself.</div>'
          + '<div class="mcp-form">'
          + '<label class="mcp-wide">Why care did not start in time <textarea id="mcpSReason" rows="2" onchange="mcpLateField(\'reason\',this.value)">' + h_(dr.reason) + '</textarea></label>'
          + (c.started ? '' : '<label>Expected start <input type="date" id="mcpSPlanned" value="' + h_(dr.planned_start) + '" onchange="mcpLateField(\'planned_start\',this.value)"></label>')
          + '<label class="mcp-wide">The letter (edit it, then copy it into Fusion or an email) <textarea id="mcpSText" rows="7" onchange="mcpLateField(\'text\',this.value)">' + h_(draft) + '</textarea></label>'
          + '<label>Sent to DSDS on <input type="date" id="mcpSSent" value="' + h_(dr.sent_on) + '" max="' + todayIso() + '" onchange="mcpLateField(\'sent_on\',this.value)"></label>'
          + '<label>How <select id="mcpSHow" onchange="mcpLateField(\'how\',this.value)"><option value="">Pick one</option>' + ['Fusion', 'Email', 'Fax', 'Mail', 'Other'].map(x => '<option' + (dr.how === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label>'
          + '<label class="mcp-chk"><input type="checkbox" id="mcpSCopy"' + (dr.copy_in_file ? ' checked' : '') + ' onchange="mcpLateField(\'copy_in_file\',this.checked)"> A copy is in the client\'s file</label>'
          + '</div><div class="mcp-acts"><button class="ghost" onclick="mcpCopyDraft()">Copy the letter</button><button class="primary" onclick="mcpLateSave()">Record it as sent</button><span class="field-note" id="mcpSMsg"></span></div></div>';
      }
    }
    h += '<div class="mcp-checks"><b style="font-size:13px">At the start (state rules)</b>' + IhsRules.START_CHECKS.map(([k, l, src]) => {
      const done = chk[k] && chk[k].on;
      return '<div class="mcp-crow"><span>' + (done ? '<span class="mcp-chip ok">' + usd(chk[k].on) + '</span> ' : '') + h_(l) + ' <span class="field-note">' + h_(src) + '</span></span>'
        + (done ? '<span class="field-note">by ' + h_(chk[k].by) + '</span>' : '<span><input type="date" id="mcpSC_' + k + '" max="' + todayIso() + '" value="' + todayIso() + '"> <button class="ghost" onclick="mcpStartCheck(\'' + k + '\')">Done</button></span>') + '</div>';
    }).join('') + '</div></div>';
    return h;
  }
  const h_ = s => h(s);
  /* ── slice C: the plan's end (the reassessment) and recommending a change ── */
  function watchHtml(cur) {
    if (typeof IhsRules === 'undefined' || !cur) return '';
    const w = IhsRules.planWatch(cur, todayIso());
    if (w.state === 'soon') return '<div class="mcp-start"><b>The plan ends ' + usd(w.end) + '</b> <span class="mcp-chip warn">' + w.left + ' day' + (w.left === 1 ? '' : 's') + ' left</span><div class="field-note">DSDS reassesses before then (within 365 days of the last level-of-care decision, MAN 4.15). Watch My Agency\'s Participants in Fusion for the new plan, and upload it here when it comes.</div></div>';
    if (w.state === 'ended') return '<div class="mcp-start"><b>The plan ended ' + usd(w.end) + '</b> <span class="mcp-chip bad">no newer plan uploaded</span><div class="field-note">Check Fusion for the new plan and upload it here, or record what happened if care has ended.</div></div>';
    return '';
  }
  function changesHtml(cur) {
    if (typeof IhsRules === 'undefined' || !cur) return '';
    const list = (cur.changes || []), open = list.filter(c => c.status !== 'closed'), done = list.filter(c => c.status === 'closed');
    const K = Object.fromEntries(IhsRules.CHANGE_KINDS), OUT = { approved_new_plan: 'DSDS approved: new plan', denied: 'DSDS said no', withdrawn: 'Withdrawn' };
    const row = c => {
      const id = h_(c.id);
      let step = '';
      if (c.status === 'recommended') step = '<div class="mcp-form"><label>Approved by (supervisor) <input id="mcpCA_' + id + '" placeholder="name"></label><label>On <input type="date" id="mcpCD_' + id + '" max="' + todayIso() + '" value="' + todayIso() + '"></label><button class="ghost" onclick="mcpChange(\'' + id + '\',\'approve\')">Approved</button></div>';
      if (c.status === 'approved') step = '<div class="mcp-note">Submit the online PCCP Request Form to DSDS, then record the date.</div><div class="mcp-form"><label>Submitted on <input type="date" id="mcpCS_' + id + '" max="' + todayIso() + '" value="' + todayIso() + '"></label><button class="ghost" onclick="mcpChange(\'' + id + '\',\'submit\')">Submitted</button></div>';
      if (c.status === 'submitted') step = '<div class="mcp-form"><label>What DSDS decided <select id="mcpCO_' + id + '"><option value="">Pick one</option>' + Object.keys(OUT).map(k => '<option value="' + k + '">' + OUT[k] + '</option>').join('') + '</select></label><input id="mcpCN_' + id + '" placeholder="Note (optional)"><button class="ghost" onclick="mcpChange(\'' + id + '\',\'close\')">Record it</button></div>'
        + '<div class="field-note">If DSDS changes the plan, upload the new plan above. A decrease takes effect the 1st of the next month (MAN 4.20).</div>';
      const where = c.status === 'recommended' ? 'waiting for the supervisor' : c.status === 'approved' ? 'approved by ' + h_(c.approved_by) + ' ' + usd(c.approved_on) + ': submit the PCCP Request Form' : c.status === 'submitted' ? 'submitted ' + usd(c.submitted_on) + ': waiting on DSDS' : (OUT[c.outcome] || c.outcome) + ' (' + usd(c.closed_on) + ')';
      return '<div class="mcp-crow" style="display:grid;gap:4px"><span><b>' + h_(K[c.kind] || c.kind) + '</b> · ' + where + '</span><span class="field-note">' + h_(c.why) + ' · seen by ' + h_(c.seen_by) + '</span>' + step + '<span class="field-note" id="mcpCMsg_' + id + '"></span></div>';
    };
    return '<div class="mcp-start"><b>Care plan changes</b><div class="field-note">Only DSDS changes the units. When the help they need differs from the plan, recommend a change: the supervisor approves it, then the coordinator submits the online PCCP Request Form (19 CSR 15-7.021(18)(K), (21)(C); MAN 4.30). The Hub never changes an authorization.</div>'
      + open.map(row).join('')
      + (MCP.chgOpen ? '<div class="mcp-form"><label>What changed <select id="mcpCK"><option value="">Pick one</option>' + IhsRules.CHANGE_KINDS.map(k => '<option value="' + k[0] + '">' + h_(k[1]) + '</option>').join('') + '</select></label>'
        + '<label class="mcp-wide">What you are seeing <textarea id="mcpCW" rows="2"></textarea></label></div><div class="mcp-acts"><button class="primary" onclick="mcpChangeNew()">Save the recommendation</button><button class="ghost" onclick="mcpChangeForm(false)">Cancel</button><span class="field-note" id="mcpCMsg"></span></div>'
        : '<div class="mcp-acts"><button class="ghost" onclick="mcpChangeForm(true)">Recommend a change</button></div>')
      + (done.length ? '<details><summary class="field-note">' + done.length + ' earlier change request' + (done.length === 1 ? '' : 's') + '</summary>' + done.map(row).join('') + '</details>' : '')
      + '</div>';
  }
  window.mcpChangeForm = v => { MCP.chgOpen = !!v; mcpProfileRender(); };
  window.mcpChangeNew = async function () {
    const p = curPlan(); if (!p) return;
    const r = IhsRules.changeStep(null, 'recommend', { kind: (document.getElementById('mcpCK') || {}).value, why: (document.getElementById('mcpCW') || {}).value }, { me: me(), at: new Date().toISOString(), id: 'chg_' + Math.random().toString(36).slice(2, 9), today: todayIso() });
    const m = document.getElementById('mcpCMsg'); if (!r.ok) { if (m) { m.textContent = r.why; m.style.color = 'var(--red)'; } return; }
    p.changes = (p.changes || []).concat([r.rec]); MCP.chgOpen = false; await savePlan(p);
  };
  window.mcpChange = async function (id, step) {
    const p = curPlan(); if (!p) return; const c = (p.changes || []).find(x => x.id === id); if (!c) return;
    const v = x => (document.getElementById(x + '_' + id) || {}).value || '';
    const form = step === 'approve' ? { approved_by: v('mcpCA'), approved_on: v('mcpCD') } : step === 'submit' ? { submitted_on: v('mcpCS') } : { outcome: v('mcpCO'), note: v('mcpCN') };
    const r = IhsRules.changeStep(c, step, form, { me: me(), today: todayIso() });
    const m = document.getElementById('mcpCMsg_' + id); if (!r.ok) { if (m) { m.textContent = r.why; m.style.color = 'var(--red)'; } return; }
    Object.assign(c, r.patch); await savePlan(p);
  };
  const curPlan = () => { const t = target(); return t ? mine(t)[0] : null; };
  async function savePlan(p) { DATA.medicaid_plans = plans().map(x => x.id === p.id ? p : x); await persist('medicaid_plans', p); mcpProfileRender(); }
  window.mcpStartCheck = async function (k) {
    const p = curPlan(); if (!p) return; const on = (document.getElementById('mcpSC_' + k) || {}).value || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(on) || on > todayIso()) return;
    p.start = Object.assign({}, p.start || {}); p.start.checks = Object.assign({}, p.start.checks || {}, { [k]: { on, by: me(), at: new Date().toISOString() } });
    await savePlan(p);
  };
  window.mcpStartManual = async function (v) {
    const p = curPlan(); if (!p) return; if (v && v > todayIso()) return;
    p.start = Object.assign({}, p.start || {}, { started_on_manual: v || '', started_manual_by: me() }); await savePlan(p);
  };
  window.mcpLateField = (k, v) => { if (MCP.draft) { MCP.draft[k] = v; if (k === 'reason' || k === 'planned_start') MCP.draft.text = ''; mcpProfileRender(); } };
  window.mcpCopyDraft = function () { const t = document.getElementById('mcpSText'); if (!t) return; try { navigator.clipboard.writeText(t.value); } catch (e) { t.select(); } const m = document.getElementById('mcpSMsg'); if (m) m.textContent = 'Copied.'; };
  window.mcpLateSave = async function () {
    const p = curPlan(); if (!p || !MCP.draft) return;
    const t = document.getElementById('mcpSText'); if (t) MCP.draft.text = t.value;
    const r = IhsRules.justification(MCP.draft, { today: todayIso(), me: me(), at: new Date().toISOString() });
    const m = document.getElementById('mcpSMsg'); if (!r.ok) { if (m) { m.textContent = r.why; m.style.color = 'var(--red)'; } return; }
    p.start = Object.assign({}, p.start || {}, { late: r.rec }); MCP.draft = null; await savePlan(p);
  };
  async function refresh() { mcpProfileRender(); await mcpRender(); }

  window.mcpMark = async function (ax, payer) {
    if (!payer) return;
    const o = ((typeof CC_PICK_OPTS !== 'undefined' && CC_PICK_OPTS) || []).find(x => x.ax === String(ax));
    const rec = { id: 'mcm_' + ax, kind: 'payer_mark', axiscare_client_id: String(ax), client_name: o ? o.name : '', payer, by: me(), at: new Date().toISOString() };
    DATA.medicaid_plans = plans().filter(p => p.id !== rec.id).concat([rec]);
    await persist('medicaid_plans', rec); mcpRender();
  };
  window.mcpToggleAll = () => { MCP.showAll = !MCP.showAll; mcpRender(); };

  /* Nurse Scheduling: every active client's standing */
  async function clientsHtml() {
    const opts = typeof ccPickOptions === 'function' ? (await ccPickOptions()).filter(o => !o.past) : [];
    const t = todayIso(), P = plans();
    const rows = opts.map(o => ({ o, st: CarePlanRules.clientStatus(o.ax, P, P, t) }));
    const ORDER = { unknown: 0, medicaid_no_plan: 1, ended: 2, current: 3, not_medicaid: 4 };
    rows.sort((a, b) => ORDER[a.st.s] - ORDER[b.st.s] || a.o.name.localeCompare(b.o.name));
    const soon = r => r.st.s === 'current' && typeof IhsRules !== 'undefined' && IhsRules.planWatch(r.st.plan, t).state === 'soon';
    const open = rows.filter(r => r.st.s === 'unknown' || r.st.s === 'medicaid_no_plan' || r.st.s === 'ended' || soon(r));
    const show = MCP.showAll ? rows : open;
    const cnt = k => rows.filter(r => r.st.s === k).length;
    const link = o => (typeof cpOpenLink === 'function' ? cpOpenLink({ client_name: o.name, axiscare_client_id: o.ax }, 'payer') : h(o.name));
    const line = r => {
      const st = r.st, ax = h(r.o.ax);
      let chip, act = '';
      if (st.s === 'current') { const w = typeof IhsRules !== 'undefined' ? IhsRules.planWatch(st.plan, t) : { state: 'ok' };
        chip = '<span class="mcp-chip ' + (w.state === 'soon' ? 'warn' : 'ok') + '">Plan to ' + usd(st.plan.plan_end) + (w.state === 'soon' ? ' (' + w.left + ' days left)' : '') + (st.plan.ghe_months && st.plan.ghe_months.length ? ' · GHE ' + st.plan.ghe_months.map(mon).join(', ') : '') + '</span>';
        if (w.state === 'soon') act = 'DSDS reassesses before then: watch Fusion for the new plan'; }
      else if (st.s === 'ended') { chip = '<span class="mcp-chip warn">Plan ended ' + usd(st.plan.plan_end) + '</span>'; act = 'Open their profile and upload the current plan'; }
      else if (st.s === 'not_medicaid') chip = '<span class="mcp-chip">' + h(PAYERS[st.mark.payer] || st.mark.payer) + '</span>';
      else if (st.s === 'medicaid_no_plan') { chip = '<span class="mcp-chip warn">Medicaid, no plan uploaded</span>'; act = 'Open their profile and upload their plan'; }
      else { chip = '<span class="mcp-chip bad">Not sorted</span>'; act = 'Open their profile to upload their plan, or say how they pay'; }
      const sel = (st.s === 'current' || st.s === 'ended') ? '' : '<select aria-label="How ' + h(r.o.name) + ' pays" onchange="mcpMark(\'' + ax + '\',this.value)"><option value="">' + (st.s === 'unknown' ? 'How do they pay?' : 'Change') + '</option><option value="medicaid">Medicaid (plan to upload)</option>'
        + Object.keys(PAYERS).map(k => '<option value="' + k + '">' + h(PAYERS[k]) + '</option>').join('') + '</select>';
      return '<div class="mcp-row"><span class="mcp-name">' + link(r.o) + '</span>' + chip + (act ? '<span class="field-note">' + act + '</span>' : '') + '<span class="mcp-sp"></span>' + sel + '</div>';
    };
    return '<div class="mcp-sum"><b>' + rows.length + ' active clients:</b> ' + cnt('current') + ' with a current plan, ' + cnt('ended') + ' with an ended plan, ' + cnt('medicaid_no_plan') + ' Medicaid with no plan uploaded, '
      + cnt('not_medicaid') + ' not Medicaid, <b>' + cnt('unknown') + ' not sorted</b>.</div>'
      + (show.length ? show.map(line).join('') : '<div class="field-note">Every active client is sorted and every Medicaid client has a current plan.</div>')
      + '<button class="ghost mcp-all" onclick="mcpToggleAll()">' + (MCP.showAll ? 'Show only what needs doing' : 'Show all ' + rows.length + ' clients') + '</button>';
  }
  window.mcpRender = async function () {
    const box = document.getElementById('mcpCard'); if (!box) return;
    box.innerHTML = '<b class="mcp-title">Medicaid care plans</b>'
      + '<div class="field-note">Care plans are uploaded in each client\'s profile, on the Payer tab. Click a name to open it. This list shows who still needs one.</div>'
      + '<div id="mcpClients" class="mcp-clients"><div class="field-note">Loading clients…</div></div>';
    const c = document.getElementById('mcpClients'); if (c) c.innerHTML = await clientsHtml();
  };
})();
