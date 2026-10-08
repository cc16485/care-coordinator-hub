/* =============================================================================
   medicaid-plans.js · Medicaid care plans on the Nurse Visits tab (GHE fix, slice 1, Samantha approved 2026-10-08)

   The Medicaid coordinator uploads the care plan PDF downloaded from Fusion. care-plan-rules.js reads it; the
   coordinator sees everything that was read, picks the client, enters the date we received the plan, and confirms.
   Nothing is saved before that. On confirm:
     · the plan is kept under app_data 'medicaid_plans' (what it said and who confirmed it; never the address,
       phone or date of birth; the PDF itself stays in Fusion)
     · each GHE month the plan authorizes goes onto the nurse board for that client (added if they weren't there)
   Nothing is sent to Fusion, AxisCare or anyone. Fusion stays the official record.

   Below the upload, every active client shows where they stand (current plan / plan ended / Medicaid with no plan
   uploaded / not Medicaid / not sorted yet) so no Medicaid client can be missing from the nurse board unseen.
   ============================================================================= */
(function () {
  'use strict';
  const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
  const PDFJS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const PAYERS = { private: 'Private pay', va: 'VA', ltc: 'Long-term care insurance', cds: 'CDS (CDS side)', other: 'Other' };
  const MCP = { pending: [], showAll: false };
  window.MCP_STATE = MCP;
  const h = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s));
  const usd = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || '')); return m ? m[2] + '/' + m[3] + '/' + m[1] : (d || ''); };
  const mon = m => { const x = /^(\d{4})-(\d{2})/.exec(String(m || '')); return x ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+x[2] - 1] + ' ' + x[1] : ''; };
  const plans = () => (typeof DATA !== 'undefined' && DATA.medicaid_plans) || [];
  const me = () => (typeof ME !== 'undefined' && (ME.email || ME.name)) || '';
  const todayIso = () => (typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10));
  const say = m => { if (typeof ccToast === 'function') ccToast(m); };

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
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  /* the client the plan is most likely for: the DCN on a Hub lead first, then the exact name, then last name + first initial */
  function guess(plan, opts) {
    const lead = ((typeof DATA !== 'undefined' && DATA.leads) || []).find(l => plan.dcn && String(l.dcn || '').trim() === plan.dcn && l.axiscare_client_id);
    if (lead) { const o = opts.find(x => x.ax === String(lead.axiscare_client_id)); if (o) return o; }
    const n = norm(plan.name), act = opts.filter(o => !o.past);
    let hit = act.filter(o => norm(o.name) === n); if (hit.length === 1) return hit[0];
    const parts = n.split(' '), last = parts[parts.length - 1], first = parts[0] || '';
    hit = act.filter(o => { const p = norm(o.name).split(' '); return p[p.length - 1] === last && (p[0] || '')[0] === first[0]; });
    return hit.length === 1 ? hit[0] : null;
  }

  window.mcpUpload = async function (input) {
    const files = [...(input.files || [])]; input.value = '';
    if (!files.length) return;
    const opts = typeof ccPickOptions === 'function' ? await ccPickOptions() : [];
    for (const f of files) await addPlan(f.name, () => itemsOf(f), opts);
  };
  /* one file: read it, guess the client, wait for the coordinator (the tests call this with items already read) */
  async function addPlan(fileName, read, opts) {
    const row = { id: 'p' + Math.random().toString(36).slice(2, 9), file_name: fileName, reading: true };
    MCP.pending.push(row); mcpRender();
    try {
      const plan = CarePlanRules.parse(await read());
      const o = guess(plan, opts || (typeof ccPickOptions === 'function' ? await ccPickOptions() : []));
      Object.assign(row, { reading: false, plan, summary: CarePlanRules.summary(plan, todayIso()), pick: o ? ccPickLabel(o) : '', received: '' });
    } catch (e) { Object.assign(row, { reading: false, error: String((e && e.message) || e) }); }
    await mcpRender();
    return row;
  }
  window.mcpAddItems = (fileName, items) => addPlan(fileName, async () => items);
  window.mcpPick = (id, v) => { const r = MCP.pending.find(x => x.id === id); if (r) { r.pick = v; mcpRender(); } };
  window.mcpRecv = (id, v) => { const r = MCP.pending.find(x => x.id === id); if (r) { r.received = v; mcpRender(); } };
  window.mcpDiscard = id => { MCP.pending = MCP.pending.filter(x => x.id !== id); mcpRender(); };
  function blockers(r) {
    const why = [].concat(r.summary ? r.summary.stops : ['The plan could not be read.']);
    const o = typeof ccPickParse === 'function' ? ccPickParse(r.pick) : null;
    if (!o) why.push('Pick the client from the list.');
    if (!r.received) why.push('Enter the date we received this plan.');
    else if (r.received > todayIso()) why.push('The received date can\'t be in the future.');
    return { why, o };
  }
  window.mcpSave = async function (id) {
    const r = MCP.pending.find(x => x.id === id); if (!r || r.saving) return;
    const { why, o } = blockers(r); if (why.length) { mcpRender(); return; }
    r.saving = true; mcpRender();
    try {
      const rec = CarePlanRules.record(r.plan, { ax: o.ax, client_name: o.name, received_on: r.received, by: me(), at: new Date().toISOString(), file_name: r.file_name });
      DATA.medicaid_plans = plans().filter(p => p.id !== rec.id).concat([rec]);
      await persist('medicaid_plans', rec);
      const ghes = r.summary.ghes;
      let boardNote = '';
      if (ghes.length) {
        DATA.nurse_clients = DATA.nurse_clients || [];
        let c = DATA.nurse_clients.find(x => x.active !== false && String(x.axiscare_client_id || '') === o.ax);
        const bm = CarePlanRules.boardMonths(c, ghes);
        if (!c) {
          const idr = (typeof CL360_IDENTITY !== 'undefined' && CL360_IDENTITY || []).find(x => String(x.axiscare_client_id) === o.ax);
          c = { id: uid(), name: o.name, axiscare_client_id: o.ax, phone: (idr && idr.phone) || '', weekly_meds: false, assigned_nurse: '', notes: '',
                active: true, added_at: new Date().toISOString(), added_by: me(), added_from: 'care_plan' };
          DATA.nurse_clients.push(c); boardNote = ' Added to the nurse board.';
        }
        Object.assign(c, bm, { ghe_from_plan: rec.id, ghe_updated_at: new Date().toISOString(), ghe_updated_by: me() });
        await persist('nurse_clients', c);
        boardNote = ' GHE ' + ghes.map(g => mon(g.month)).join(', ') + ' on the nurse board.' + boardNote;
      }
      MCP.pending = MCP.pending.filter(x => x.id !== id);
      say('Care plan saved for ' + o.name + '.' + boardNote);
      if (typeof renderNurseVisits === 'function') renderNurseVisits(); else mcpRender();
    } catch (e) { r.saving = false; r.saveError = 'Not saved: ' + String((e && e.message) || e); mcpRender(); }
  };
  window.mcpMark = async function (ax, payer) {
    if (!payer) return;
    const o = ((typeof CC_PICK_OPTS !== 'undefined' && CC_PICK_OPTS) || []).find(x => x.ax === String(ax));
    const rec = { id: 'mcm_' + ax, kind: 'payer_mark', axiscare_client_id: String(ax), client_name: o ? o.name : '', payer, by: me(), at: new Date().toISOString() };
    DATA.medicaid_plans = plans().filter(p => p.id !== rec.id).concat([rec]);
    await persist('medicaid_plans', rec); mcpRender();
  };
  window.mcpToggleAll = () => { MCP.showAll = !MCP.showAll; mcpRender(); };

  function pendingHtml(r) {
    if (r.reading) return '<div class="mcp-pend"><b>' + h(r.file_name) + '</b> <span class="field-note">reading…</span></div>';
    if (r.error) return '<div class="mcp-pend"><b>' + h(r.file_name) + '</b><div class="mcp-stop">' + h(r.error) + '</div><button class="ghost" onclick="mcpDiscard(\'' + r.id + '\')">Remove</button></div>';
    const p = r.plan, s = r.summary, { why } = blockers(r);
    const svc = s.ours.map(x => '<tr><td>' + h(x.label) + (x.type && x.label !== x.type ? ' <span class="field-note">(' + h(x.type) + ')</span>' : '') + '</td><td>' + usd(x.start) + ' to ' + usd(x.end) + '</td><td>'
      + h(x.units.map(u => u.units).filter(v => v != null).length ? (x.units.length + ' month' + (x.units.length === 1 ? '' : 's') + ', ' + Array.from(new Set(x.units.map(u => u.units))).join(' / ') + ' units ' + (x.units[0].code || '')) : '') + '</td><td>' + h(x.prior_auth) + '</td></tr>').join('');
    const listId = 'mcpList_' + r.id;
    return '<div class="mcp-pend" id="mcpPend_' + r.id + '">'
      + '<div class="mcp-head"><b>' + h(p.name || '(no name read)') + '</b><span class="field-note">DCN ' + h(p.dcn || '?') + ' · plan ' + usd(p.plan_start) + ' to ' + usd(p.plan_end) + (p.generated ? ' · generated ' + usd(p.generated) : '') + ' · ' + h(r.file_name) + '</span></div>'
      + (s.stops.length ? s.stops.map(x => '<div class="mcp-stop">' + h(x) + '</div>').join('') : '')
      + (svc ? '<div class="mcp-tbl"><table><thead><tr><th>Our service</th><th>Dates</th><th>Authorized</th><th>Prior authorization</th></tr></thead><tbody>' + svc + '</tbody></table></div>' : '')
      + (s.ghes.length ? '<div class="mcp-ghe">GHE authorized: <b>' + s.ghes.map(g => mon(g.month) + (g.code ? ' (' + h(g.code) + ')' : '')).join(', ') + '</b>. This goes on the nurse board when you confirm.</div>' : (s.needsGhe ? '' : '<div class="field-note">No GHE on this plan, and none expected for these services.</div>'))
      + s.notes.map(x => '<div class="mcp-note">' + h(x) + '</div>').join('')
      + (s.ok ? '<div class="mcp-form">'
        + '<label>Client <input id="mcpPick_' + r.id + '" list="' + listId + '" value="' + h(r.pick) + '" placeholder="pick the client" onchange="mcpPick(\'' + r.id + '\',this.value)"><datalist id="' + listId + '"></datalist></label>'
        + '<label>Date we received this plan <input type="date" id="mcpRecv_' + r.id + '" value="' + h(r.received) + '" max="' + todayIso() + '" onchange="mcpRecv(\'' + r.id + '\',this.value)"></label>'
        + '</div>' : '')
      + (r.saveError ? '<div class="mcp-stop">' + h(r.saveError) + '</div>' : '')
      + '<div class="mcp-acts">' + (s.ok ? '<button class="addlead" id="mcpSave_' + r.id + '" ' + (why.length || r.saving ? 'disabled' : '') + ' onclick="mcpSave(\'' + r.id + '\')">' + (r.saving ? 'Saving…' : 'Confirm and save') + '</button>' : '')
      + '<button class="ghost" onclick="mcpDiscard(\'' + r.id + '\')">' + (s.ok ? 'Cancel' : 'Remove') + '</button>'
      + (s.ok && why.length ? '<span class="field-note">' + h(why.join(' ')) + '</span>' : '') + '</div>'
      + '</div>';
  }

  async function clientsHtml() {
    const opts = typeof ccPickOptions === 'function' ? (await ccPickOptions()).filter(o => !o.past) : [];
    const t = todayIso(), P = plans();
    const rows = opts.map(o => ({ o, st: CarePlanRules.clientStatus(o.ax, P, P, t) }));
    const ORDER = { unknown: 0, medicaid_no_plan: 1, ended: 2, current: 3, not_medicaid: 4 };
    rows.sort((a, b) => ORDER[a.st.s] - ORDER[b.st.s] || a.o.name.localeCompare(b.o.name));
    const open = rows.filter(r => r.st.s === 'unknown' || r.st.s === 'medicaid_no_plan' || r.st.s === 'ended');
    const show = MCP.showAll ? rows : open;
    const cnt = k => rows.filter(r => r.st.s === k).length;
    const line = r => {
      const st = r.st, ax = h(r.o.ax);
      let chip, act = '';
      if (st.s === 'current') chip = '<span class="mcp-chip ok">Plan to ' + usd(st.plan.plan_end) + (st.plan.ghe_months && st.plan.ghe_months.length ? ' · GHE ' + st.plan.ghe_months.map(mon).join(', ') : '') + '</span>';
      else if (st.s === 'ended') { chip = '<span class="mcp-chip warn">Plan ended ' + usd(st.plan.plan_end) + '</span>'; act = 'Upload the current plan from Fusion'; }
      else if (st.s === 'not_medicaid') chip = '<span class="mcp-chip">' + h(PAYERS[st.mark.payer] || st.mark.payer) + '</span>';
      else if (st.s === 'medicaid_no_plan') { chip = '<span class="mcp-chip warn">Medicaid, no plan uploaded</span>'; act = 'Upload their plan from Fusion'; }
      else { chip = '<span class="mcp-chip bad">Not sorted</span>'; act = 'Upload their plan, or say how they pay'; }
      const sel = (st.s === 'current' || st.s === 'ended') ? '' : '<select aria-label="How ' + h(r.o.name) + ' pays" onchange="mcpMark(\'' + ax + '\',this.value)"><option value="">' + (st.s === 'unknown' ? 'How do they pay?' : 'Change') + '</option><option value="medicaid">Medicaid (plan to upload)</option>'
        + Object.keys(PAYERS).map(k => '<option value="' + k + '">' + h(PAYERS[k]) + '</option>').join('') + '</select>';
      return '<div class="mcp-row"><span class="mcp-name">' + h(r.o.name) + '</span>' + chip + (act ? '<span class="field-note">' + act + '</span>' : '') + '<span class="mcp-sp"></span>' + sel + '</div>';
    };
    return '<div class="mcp-sum"><b>' + rows.length + ' active clients:</b> ' + cnt('current') + ' with a current plan, ' + cnt('ended') + ' with an ended plan, ' + cnt('medicaid_no_plan') + ' Medicaid with no plan uploaded, '
      + cnt('not_medicaid') + ' not Medicaid, <b>' + cnt('unknown') + ' not sorted</b>.</div>'
      + (show.length ? show.map(line).join('') : '<div class="field-note">Every active client is sorted and every Medicaid client has a current plan.</div>')
      + '<button class="ghost mcp-all" onclick="mcpToggleAll()">' + (MCP.showAll ? 'Show only what needs doing' : 'Show all ' + rows.length + ' clients') + '</button>';
  }

  window.mcpRender = async function () {
    const box = document.getElementById('mcpCard'); if (!box) return;
    const pend = MCP.pending.map(pendingHtml).join('');
    box.innerHTML = '<div class="mcp-top"><div><b class="mcp-title">Medicaid care plans</b>'
      + '<div class="field-note">Download the client\'s care plan from Fusion and upload the PDF here. You check what was read and confirm it; then the GHE months go on the nurse board. Fusion stays the official record; the PDF itself is not kept here.</div></div>'
      + '<label class="mcp-up">Upload care plans<input type="file" id="mcpFile" accept="application/pdf,.pdf" multiple onchange="mcpUpload(this)"></label></div>'
      + (pend ? '<div class="mcp-pends">' + pend + '</div>' : '')
      + '<div id="mcpClients" class="mcp-clients"><div class="field-note">Loading clients…</div></div>';
    const opts = typeof ccPickFill === 'function' ? MCP.pending.filter(r => r.summary && r.summary.ok).map(r => ccPickFill('mcpList_' + r.id)) : [];
    await Promise.all(opts);
    const c = document.getElementById('mcpClients'); if (c) c.innerHTML = await clientsHtml();
  };
})();
