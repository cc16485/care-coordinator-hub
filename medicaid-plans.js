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
        + '</div>' : (MCP.pending ? '' : '<div class="field-note mcp-none">No care plan uploaded yet.</div>'));
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
    const open = rows.filter(r => r.st.s === 'unknown' || r.st.s === 'medicaid_no_plan' || r.st.s === 'ended');
    const show = MCP.showAll ? rows : open;
    const cnt = k => rows.filter(r => r.st.s === k).length;
    const link = o => (typeof cpOpenLink === 'function' ? cpOpenLink({ client_name: o.name, axiscare_client_id: o.ax }, 'payer') : h(o.name));
    const line = r => {
      const st = r.st, ax = h(r.o.ax);
      let chip, act = '';
      if (st.s === 'current') chip = '<span class="mcp-chip ok">Plan to ' + usd(st.plan.plan_end) + (st.plan.ghe_months && st.plan.ghe_months.length ? ' · GHE ' + st.plan.ghe_months.map(mon).join(', ') : '') + '</span>';
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
