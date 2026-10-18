/* =============================================================================
   OPEN HOURS on the Team Builder board (2026-10-12, her ask + "yes to all")
   "we just need a way to send message to all caregivers about a set of recurring shifts ... and then have the ai help
   put the answers into three boxes: yellow is questions, red is no, green is yes but also organize which days".

   One card on the plan's board:
     before it goes out: the text (editable), how many get it and who doesn't (and why), the 9am to 6pm rule, Send.
     after: green (yes, with their days), yellow (questions: answered by a person from the office line), red (no),
            and who hasn't answered. A green name also shows on each square they said yes to; a click pencils them in.
   The ask itself is ONE coverage case per plan (cwh_<planId>), written by coverage-run and coverage-reply. Nothing
   here assigns anyone: penciling in is the board's own step, and AxisCare only changes at "Plan complete".
   ============================================================================= */
(function () {
  const OH = { pv: {}, busy: {}, msg: {}, err: {}, draft: {} };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const caseId = (plan) => 'cwh_' + String(plan.id).replace(/[^A-Za-z0-9_-]/g, '_');
  /* the plan's ask: cwh_<plan>, or an older Cara new-client check turned into this plan (step 3, linked by plan_id) */
  const caseOf = (plan) => { const L = DATA.coverage_cases || [];
    return L.find((c) => c && c.open_hours === true && c.plan_id === plan.id && c.status === 'open') || L.find((c) => c && c.id === caseId(plan)) || null; };
  const DAYL = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
  const GHL = (id) => 'https://app.hirecara.com/v2/location/Recp0AhyMh8lrtKJ9kaj/contacts/detail/' + encodeURIComponent(id);

  async function call(body) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session || !session.access_token) throw new Error('Sign in to the Hub first.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/coverage-run', { method: 'POST',
      headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const out = await r.json().catch(() => null);
    if (!out) throw new Error('Cara answered ' + r.status);
    return out;
  }
  async function reload() {
    try { const r = await sb.from('app_data').select('data').eq('key', 'coverage_cases').maybeSingle();
      if (r && r.data && Array.isArray(r.data.data)) DATA.coverage_cases = r.data.data; } catch (_) { /* the board shows what it has */ }
  }
  const redraw = () => { if (typeof tbRender === 'function') tbRender(); };

  /* "Mon morning, Wed all day" from the squares, in the plan's own shift names */
  function daysText(plan, cells, any) {
    if (any) return 'any of it';
    const slots = plan.slots || [], byDay = {};
    (cells || []).forEach((k) => { const [d, s] = String(k).split('|'); (byDay[d] = byDay[d] || []).push(s); });
    return (plan.days || []).filter((d) => byDay[d]).map((d) => {
      const got = byDay[d], all = slots.length > 1 && slots.every((s) => got.includes(s.k));
      return DAYL[d] + ' ' + (all ? 'all day' : got.map((k) => { const s = slots.find((x) => x.k === k); return s ? (s.label || (tbT12(s.start) + '-' + tbT12(s.end))) : k; }).join(' + '));
    }).join(', ') || 'days not said';
  }

  async function open(planId) {
    OH.busy[planId] = 'Reading who would get it…'; OH.err[planId] = ''; redraw();
    try { const out = await call({ action: 'open_hours', plan_id: planId });
      if (out.error) throw new Error(out.error);
      OH.pv[planId] = out; if (OH.draft[planId] == null) OH.draft[planId] = out.text;
    } catch (e) { OH.err[planId] = String(e.message || e); }
    OH.busy[planId] = ''; redraw();
  }
  async function send(planId) {
    const box = document.getElementById('ohText'); if (box) OH.draft[planId] = box.value;
    const pv = OH.pv[planId]; if (!pv) return;
    if (!(await ccConfirm('Text ' + pv.will_get + ' caregiver' + (pv.will_get === 1 ? '' : 's') + ' about these hours now?'))) return;
    OH.err[planId] = ''; let total = 0, failed = [], left = 1, rounds = 0;
    try {
      while (left > 0 && rounds < 20) {
        rounds++; OH.busy[planId] = 'Texting… ' + total + ' sent so far'; redraw();
        const out = await call({ action: 'open_hours', plan_id: planId, mode: 'send', message: OH.draft[planId] });
        if (out.error) throw new Error(out.error);
        total += (out.sent || []).length; failed = failed.concat(out.failed || []); left = out.remaining || 0;
        if (!(out.sent || []).length) break;
      }
      OH.msg[planId] = '✓ Texted ' + total + ' caregiver' + (total === 1 ? '' : 's') + '.' + (failed.length ? ' Not sent: ' + failed.join('; ') + '.' : '');
    } catch (e) { OH.err[planId] = String(e.message || e) + (total ? ' (' + total + ' were texted before this)' : ''); }
    OH.busy[planId] = ''; OH.pv[planId] = null; await reload(); redraw();
  }
  /* A person re-sorts an answer (the AI can be wrong, and a question gets answered): green = yes to all of it unless
     the AI already found days; red = no. Saved with who did it. */
  async function sort(planId, askId, state) {
    const plan = (typeof tbPlans === 'function' ? tbPlans() : []).find((p) => p.id === planId); if (!plan) return;
    const c = caseOf(plan); if (!c) return; const a = (c.asked || []).find((x) => x.id === askId); if (!a) return;
    a.state = state; a.sorted_by = (typeof ME !== 'undefined' && (ME.name || ME.email)) || 'the office'; a.sorted_at = new Date().toISOString();
    if (state === 'yes' && !(a.yes_cells || []).length) { a.any_time = true; a.yes_cells = []; }
    if (state === 'no') { a.yes_cells = []; a.any_time = false; }
    await persist('coverage_cases', c); redraw();
  }
  async function pencil(planId, key, askId) {
    const plan = (typeof tbPlans === 'function' ? tbPlans() : []).find((p) => p.id === planId); if (!plan) return;
    const c = caseOf(plan); const a = c && (c.asked || []).find((x) => x.id === askId); if (!a) return;
    if (plan.cells && plan.cells[key] && plan.cells[key].name && !(await ccConfirm(plan.cells[key].name + ' is already on this square. Put ' + a.name + ' there instead?'))) return;
    tbAssign(key, a.name, a.axiscare_id || null);
  }
  const yesOn = (plan, a, key) => a.state === 'yes' && (a.any_time || (a.yes_cells || []).includes(key));

  /* the green names on one square */
  function cellHtml(plan, key) {
    const c = caseOf(plan); if (!c) return '';
    const ys = (c.asked || []).filter((a) => yesOn(plan, a, key)); if (!ys.length) return '';
    const cur = (plan.cells || {})[key];
    return '<div style="margin-top:3px;display:flex;flex-wrap:wrap;gap:2px;justify-content:center;" onclick="event.stopPropagation()">'
      + ys.slice(0, 4).map((a) => (cur && cur.name === a.name) ? ''
        : '<button title="Said yes. Click to pencil them in here." onclick="OH.pencil(\'' + esc(plan.id) + '\',\'' + esc(key) + '\',\'' + esc(a.id) + '\')" style="border:1px solid var(--green);background:var(--green-bg);color:var(--green);border-radius:999px;font-size:10px;font-weight:700;padding:0 6px;cursor:pointer;">'
          + esc(String(a.name).split(' ')[0]) + '</button>').join('')
      + (ys.length > 4 ? '<span style="font-size:10px;color:var(--green);font-weight:700;">+' + (ys.length - 4) + '</span>' : '') + '</div>';
  }

  function boxHtml(plan) {
    const id = plan.id, c = caseOf(plan), pv = OH.pv[id];
    const head = '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;"><b style="font-size:15px;color:var(--navy);">📣 Ask the whole team about these hours</b>'
      + '<span class="field-note" style="font-size:12px;">One text to every caregiver. Their answers sort themselves into green, yellow and red.</span></div>';
    const note = (OH.busy[id] ? '<div class="field-note" style="margin-top:6px;">' + esc(OH.busy[id]) + '</div>' : '')
      + (OH.err[id] ? '<div style="margin-top:6px;background:#FDE8E8;border-radius:8px;padding:7px 10px;font-size:12.5px;color:var(--red);">' + esc(OH.err[id]) + '</div>' : '')
      + (OH.msg[id] ? '<div style="margin-top:6px;font-size:12.5px;color:var(--green);font-weight:700;">' + esc(OH.msg[id]) + '</div>' : '');
    let body = '';
    if (pv) {
      const why = Object.entries(pv.not_sent_why || {}).map(([w, n]) => n + ' ' + w).join(' · ');
      body = '<div style="margin-top:10px;"><div style="font-size:12.5px;font-weight:700;color:var(--navy);">The text ({first_name} becomes each person\'s first name)</div>'
        + '<textarea id="ohText" rows="4" style="width:100%;font-size:13px;margin-top:4px;" oninput="OH.draft[\'' + esc(id) + '\']=this.value">' + esc(OH.draft[id] || pv.text) + '</textarea>'
        + '<div style="font-size:13px;margin-top:6px;">Goes to <b>' + pv.will_get + '</b> caregiver' + (pv.will_get === 1 ? '' : 's')
        + (pv.already_asked ? ' (' + pv.already_asked + ' already asked)' : '') + '. People already working some of these hours get it too; the board shows them.</div>'
        + (pv.not_sent ? '<div class="field-note" style="font-size:12px;margin-top:2px;">Not sent to ' + pv.not_sent + ': ' + esc(why) + '.</div>' : '')
        + '<div class="field-note" style="font-size:12px;margin-top:2px;">Texts go 9am to 6pm, 20 at a time. The town is named; never the address, a client\'s name or pay.</div>'
        + '<div style="display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap;">'
        + (pv.live ? (pv.window_ok ? '<button class="primary" onclick="OH.send(\'' + esc(id) + '\')">📣 Text ' + pv.will_get + ' caregiver' + (pv.will_get === 1 ? '' : 's') + '</button>'
            : '<span style="font-size:12.5px;color:#8A4E0C;font-weight:700;">It\'s outside 9am to 6pm. Come back in the morning to send.</span>')
          : '<span style="font-size:12.5px;color:#8A4E0C;font-weight:700;">Texting the whole team is switched off (Owners Hub Admin page, "Open hours: text the whole team").</span>')
        + '<button class="secondary" onclick="OH.pv[\'' + esc(id) + '\']=null;tbRender()">Not now</button></div></div>';
    } else if (!c) {
      body = '<div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;"><button class="cara-btn" onclick="OH.open(\'' + esc(id) + '\')">See the text and who gets it</button>'
        + '<span class="field-note" style="font-size:12px;">Nothing is sent until you press Text on the next step.</span></div>';
    }
    if (c) {
      const A = c.asked || [], G = A.filter((a) => a.state === 'yes'), Y = A.filter((a) => a.state === 'inquiry'), R = A.filter((a) => a.state === 'no'), W = A.filter((a) => a.state === 'waiting');
      const who = (a) => '<b>' + esc(a.name) + '</b>';
      const said = (a) => a.reply ? '<div class="field-note" style="font-size:11.5px;">"' + esc(String(a.reply).slice(0, 160)) + '"' + (a.read_by && a.read_by !== 'ai' ? ' · read by ' + esc(a.read_by) : '') + (a.sorted_by ? ' · sorted by ' + esc(a.sorted_by) : '') + '</div>' : '';
      const btn = (a, st, label) => '<button class="fb" style="font-size:11px;padding:1px 8px;" onclick="OH.sort(\'' + esc(id) + '\',\'' + esc(a.id) + '\',\'' + st + '\')">' + label + '</button>';
      const box = (bg, edge, title, list, row) => '<div style="flex:1 1 230px;background:' + bg + ';border:1px solid ' + edge + ';border-radius:10px;padding:8px 10px;">'
        + '<div style="font-weight:800;font-size:13px;color:var(--navy);margin-bottom:4px;">' + title + ' (' + list.length + ')</div>'
        + (list.length ? list.map(row).join('') : '<div class="field-note" style="font-size:12px;">None yet.</div>') + '</div>';
      body += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">'
        + box('#EFF8F1', '#B7E1C3', '🟢 Yes', G, (a) => '<div style="padding:3px 0;border-top:1px solid #D6EEDD;font-size:12.5px;">' + who(a) + ': ' + esc(daysText(plan, a.yes_cells, a.any_time)) + said(a)
          + '<div style="display:flex;gap:4px;margin-top:2px;">' + btn(a, 'no', 'Move to No') + '</div></div>')
        + box('#FFF8E6', '#F2D58A', '🟡 Questions', Y, (a) => '<div style="padding:3px 0;border-top:1px solid #F5E6BC;font-size:12.5px;">' + who(a)
          + ((a.yes_cells || []).length ? ': ' + esc(daysText(plan, a.yes_cells, false)) : '') + said(a)
          + '<div style="display:flex;gap:4px;margin-top:2px;flex-wrap:wrap;">' + (a.ghl_contact_id ? '<a href="' + GHL(a.ghl_contact_id) + '" target="_blank" rel="noopener" style="font-size:11.5px;">Text back from the office line ↗</a>' : '')
          + btn(a, 'yes', 'Answered: Yes') + btn(a, 'no', 'Answered: No') + '</div></div>')
        + box('#FDF0F0', '#F2B8B8', '🔴 No', R, (a) => '<div style="padding:2px 0;font-size:12.5px;">' + who(a) + said(a) + '</div>')
        + '</div>'
        + '<div class="field-note" style="font-size:12px;margin-top:6px;">⏳ Not answered yet: ' + W.length + (W.length ? ' (' + esc(W.slice(0, 8).map((a) => String(a.name).split(' ')[0]).join(', ')) + (W.length > 8 ? '…' : '') + ')' : '')
        + ' · texted by ' + esc(c.opened_by || 'the office') + '. Green names also show on each square they said yes to: click one to pencil them in.</div>'
        + (!pv ? '<div style="margin-top:6px;"><button class="cara-btn ghost" style="font-size:12px;" onclick="OH.open(\'' + esc(id) + '\')">Anyone left to text?</button></div>' : '');
    }
    return '<div class="card" style="padding:12px 14px;margin:0 0 10px;border-left:4px solid var(--teal);">' + head + body + note + '</div>';
  }

  /* ── Older new-client checks from Cara (scheduling review step 3, 2026-10-12) ──────────────────────────────────
     Cara's "New clients" tab is gone. A check still open shows here, at the top of Team Builder, until someone turns
     it into a plan (its answers come along and land in the green, yellow and red boxes) or closes it. */
  const DAYK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], DAYW = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
  const earlier = () => (DATA.coverage_cases || []).filter((c) => c && String(c.kind) === 'interest' && c.status === 'open' && !(c.open_hours === true && c.plan_id));
  const hm = (t) => /^\d\d:\d\d$/.test(String(t || ''));
  function hoursOf(c) {
    const ds = DAYK.filter((d) => (c.interest_days || []).map((x) => String(x).toLowerCase().slice(0, 3)).includes(d)).map((d) => DAYL[d]).join(' ');
    const t = hm(c.interest_start) && hm(c.interest_end) ? tbT12(c.interest_start) + '-' + tbT12(c.interest_end) : String(c.shift_time || '');
    return [ds, t].filter(Boolean).join(' ') || 'hours not written down';
  }
  function earlierHtml() {
    const L = earlier(); if (!L.length) return '';
    return '<div class="card" style="padding:12px 14px;margin:0 0 12px;border-left:4px solid var(--honey);">'
      + '<b style="color:var(--navy);font-size:14px;">Earlier new-client asks from Cara (' + L.length + ')</b>'
      + '<div class="field-note" style="font-size:12px;margin:2px 0 6px;">Cara\'s New clients tab moved here. Turn one into a plan to see its answers in green, yellow and red on the board, or close it.</div>'
      + L.map((c) => { const A = c.asked || [], n = (st) => A.filter((a) => a.state === st).length;
        const ys = A.filter((a) => a.state === 'yes').map((a) => String(a.name).split(' ')[0]);
        return '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;padding:6px 0;border-top:1px solid var(--border);font-size:13px;">'
          + '<b>' + esc(c.client || 'New client') + '</b><span class="field-note">' + esc([c.client_city, hoursOf(c)].filter(Boolean).join(' · ')) + '</span>'
          + '<span>🟢 ' + n('yes') + (ys.length ? ' (' + esc(ys.slice(0, 6).join(', ')) + ')' : '') + ' · 🟡 ' + n('inquiry') + ' · 🔴 ' + n('no') + ' · ⏳ ' + n('waiting') + '</span>'
          + '<span style="flex:1;"></span><button class="cara-btn" style="font-size:12px;" onclick="OH.convert(\'' + esc(c.id) + '\')">Make it a Caregiver Matching plan</button>'
          + '<button class="cara-btn ghost" style="font-size:12px;" onclick="OH.closeOld(\'' + esc(c.id) + '\')">Close it</button></div>'; }).join('')
      + '</div>';
  }
  async function convert(cid) {
    const c = (DATA.coverage_cases || []).find((x) => x && x.id === cid); if (!c) return;
    let days = DAYK.filter((d) => (c.interest_days || []).map((x) => String(x).toLowerCase().slice(0, 3)).includes(d));
    if (!days.length) days = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const slot = hm(c.interest_start) && hm(c.interest_end) && c.interest_end > c.interest_start
      ? { k: 's1', label: tbT12(c.interest_start) + '–' + tbT12(c.interest_end), start: c.interest_start, end: c.interest_end }
      : { k: 's1', label: 'Shift 1', start: '09:00', end: '17:00' };
    const me = (typeof ME !== 'undefined' && (ME.name || ME.email)) || '';
    const plan = { id: 'tb' + Date.now(), client: c.client || 'New client', city: c.client_city || null, zip: c.client_zip || null, open_hours: true,
      days, slots: [slot], cells: {}, status: 'building', created_at: new Date().toISOString(), by: me, from_case: c.id };
    DATA.staffing_plans = DATA.staffing_plans || []; DATA.staffing_plans.push(plan);
    await persist('staffing_plans', plan);
    c.plan_id = plan.id; c.open_hours = true; c.slots = [slot];
    c.offered = days.map((d) => ({ key: d + '|s1', words: DAYW[d] + ' ' + tbT12(slot.start) + ' to ' + tbT12(slot.end) }));
    (c.asked || []).forEach((a) => { if (a.state === 'yes' && !(a.yes_cells || []).length) a.any_time = true; });   // a yes then was a yes to the whole schedule
    c.converted_by = me; c.converted_at = new Date().toISOString();
    await persist('coverage_cases', c);
    TB.planId = plan.id; TB.cellOpen = null; redraw();
  }
  async function closeOld(cid) {
    const c = (DATA.coverage_cases || []).find((x) => x && x.id === cid); if (!c) return;
    if (!(await ccConfirm('Close the new-client ask for ' + (c.client || 'this client') + '? Its answers stay in Cara\'s History. Nobody is texted.'))) return;
    c.status = 'closed'; c.resolved_at = new Date().toISOString(); c.resolved_how = 'closed';
    c.resolved_by = (typeof ME !== 'undefined' && (ME.name || ME.email)) || ''; c.resolved_note = 'closed from Caregiver Matching (New clients moved there)';
    await persist('coverage_cases', c); redraw();
  }

  window.OH = Object.assign(OH, { open, send, sort, pencil, boxHtml, cellHtml, daysText, caseOf, earlierHtml, convert, closeOld });
})();
