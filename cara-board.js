/* =============================================================================
   cara-board.js · CARA'S RESPONSE BOARD (Samantha, 2026-10-24: "Let's build this first. I want the green, red, and yellow
   visual experience similar to CareQB, but with separate full-shift and partial/different-hours responses. Clicking a
   caregiver should show their exact response, the time, eligibility, and why Cara recommends or does not recommend them.
   Keep Needs Verification separate and prevent unverified caregivers from being offered or confirmed.")
   Five boxes on every open shift that has asks: Yes, full shift · Part or different hours · Question · No · Needs
   Verification, plus who hasn't answered. Built only from replies Cara already collects (the server's read-only `board`
   action in coverage-run, which scores every person with the same rules as Cara recommends).
   Confirm appears only for an eligible full-shift yes and goes through covResolve, the one existing confirm path; the
   server refuses anyone who Needs Verification as well. The shift's time rules (Exact time / Flexible start, and Hand-off
   allowed, two separate settings) are set here and change nothing in AxisCare.
   Switch: ops_settings.cara_board_live. Off, the case shows today's confirm block; an owner previewing Cara's new Today
   (CP1 preview) sees the board too, only in that browser.
   ============================================================================= */
(function () {
  'use strict';
  const E = (s) => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s));
  const settings = () => (typeof DATA !== 'undefined' && DATA.ops_settings) || {};
  const previewing = () => { try { return localStorage.getItem('cara_p1_preview') === '1'; } catch (e) { return false; } };
  const on = () => settings().cara_board_live === true || previewing();
  const first = (n) => String(n || '').trim().split(/\s+/)[0] || '';
  const t12 = (hm) => { const m = /^(\d\d):(\d\d)/.exec(String(hm || '')); if (!m) return String(hm || ''); const h = +m[1]; return (h % 12 || 12) + (m[2] === '00' ? '' : ':' + m[2]) + (h >= 12 ? 'pm' : 'am'); };
  const when = (iso) => { if (!iso) return ''; try { return new Date(iso).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };
  const COLS = [
    ['full', 'Yes, full shift', '✓', 'var(--green)', 'var(--green-bg)', '#bfe2cd'],
    ['partial', 'Part or different hours', '◐', '#14606F', '#e3f0f2', '#b9dbe0'],
    ['question', 'Question', '?', '#8a5a00', '#fdf3dc', '#f0d9a6'],
    ['no', 'No', '✕', 'var(--red)', '#f8e7e3', '#ecc3ba'],
    ['nv', 'Needs Verification', '⚠', '#5a4a8a', '#eeebf7', '#d3cbee'],
  ];
  const ST = {};      // per case: { key, loading, data, err, open }
  const keyOf = (c) => (c.asked || []).map((a) => [a.id, a.state, a.replied_at, a.condition, a.answer_kind, a.wants_regular ? 'r' : ''].join('|')).join(',') + '|' + (c.shift_date || '') + (c.shift_time || '') + '|' + (c.time_flex || '') + (c.handoff_ok ? 'h' : '') + (c.flex_minutes || '');
  async function callFn(fn, body) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session || !session.access_token) throw new Error('Sign in to the hub first.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/' + fn, { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const out = await r.json().catch(() => null);
    if (!r.ok || !out || out.error) throw new Error((out && out.error) || ('The server answered ' + r.status));
    return out;
  }
  /* TAKE BACK A SHIFT PAGE LINK (2026-10-24): that person's link stops opening at once; their answers stay */
  async function linkBack(caseId, askId, on) {
    const c = (DATA.coverage_cases || []).find((x) => x && x.id === caseId), a = c && (c.asked || []).find((x) => String(x.id) === String(askId));
    if (on && !(await ccConfirm('Take back ' + ((a && a.name) || 'their') + '\'s shift page link? It stops opening right away. Their answers stay on the case.'))) return;
    try { await callFn('shift-offer', { action: on ? 'revoke' : 'restore', case_id: caseId, ask_id: askId });
      if (a) { a.link_revoked = on; a.link_revoked_by = on ? ((typeof ME !== 'undefined' && ME.name) || '') : null; a.link_revoked_at = on ? new Date().toISOString() : null; }
      if (typeof ccToast === 'function') ccToast(on ? 'Link taken back' : 'Link given back'); rerender();
    } catch (e) { alert('Not saved: ' + (e.message || e)); }
  }
  async function call(body) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session || !session.access_token) throw new Error('Sign in to the hub first.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/coverage-run', { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const out = await r.json().catch(() => null);
    if (!r.ok || !out || out.error) throw new Error((out && out.error) || ('The engine answered ' + r.status));
    return out;
  }
  function rerender() { try { if (typeof renderCoverage === 'function') renderCoverage(); } catch (e) {} }
  async function load(id) {
    const c = (DATA.coverage_cases || []).find((x) => x && x.id === id); if (!c) return;
    const open = ST[id] && ST[id].open;
    ST[id] = { key: keyOf(c), loading: true, open };
    try { ST[id] = { key: keyOf(c), data: await call({ action: 'board', case_id: id }), open }; }
    catch (e) { ST[id] = { key: keyOf(c), err: String(e.message || e), open }; }
    rerender();
  }
  function pick(id, askId) { if (ST[id]) ST[id].open = ST[id].open === askId ? null : askId; rerender(); }
  const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;') + "'";

  /* the answer, in words: their exact message, or what they chose on the shift page */
  function saidHtml(p) {
    const kind = p.answer_kind === 'part' ? 'Can work part of it' : p.answer_kind === 'diff' ? 'Can work different hours that day' : null;
    const hrs = p.offer_from && p.offer_to ? t12(p.offer_from) + ' to ' + t12(p.offer_to) : '';
    let h = '';
    if (kind) h += '<div style="font-weight:700;">' + E(kind) + (hrs ? ': ' + E(hrs) : '') + '</div>';
    if (p.reply) h += '<div style="border-left:3px solid var(--teal);background:#fff;padding:5px 10px;margin:5px 0;border-radius:0 8px 8px 0;font-size:13.5px;">“' + E(p.reply) + '”</div>';
    if (p.note) h += '<div class="field-note">Their note: “' + E(p.note) + '”</div>';
    if (p.condition) h += '<div class="field-note">Read as: yes, with a condition: ' + E(p.condition) + '</div>';
    if (!h) h = '<div class="field-note">' + (p.column === 'waiting' ? 'No answer yet.' : 'No words recorded (marked by the office).') + '</div>';
    return h;
  }
  /* every answer they've given, newest first, with how and when (2026-10-24: "keeping the complete response history") */
  /* CAREGIVER PREVIEW (2026-10-24): when the client's shift page will show only the shift, or the care summary is held back */
  function profileNote(d) {
    const pr = d && d.profile; if (!pr) return '';
    const link = (typeof cpOpenLink === 'function') ? cpOpenLink({ axiscare_client_id: pr.axiscare_client_id }, 'cgprev', 'Open the Caregiver Preview') : '';
    const t = pr.care_review ? 'The care plan changed since the Caregiver Preview was approved, so the shift page shows no care details until it is reviewed.'
      : !pr.has_intro ? 'No approved Caregiver Preview: the shift page shows just the shift.'
      : pr.tone === 'draft' ? 'Caregiver Preview changes are waiting for approval (the shift page shows the approved version).' : '';
    return t ? '<div class="field-note" style="margin-top:6px;">' + E(t) + (link ? ' ' + link : '') + '</div>' : '';
  }
  function historyHtml(p) {
    const h = (p.history || []).slice().reverse();
    if (!h.length) return '';
    const w = (x) => x.kind === 'part' && x.from ? 'Part of it: ' + t12(x.from) + ' to ' + t12(x.to) : x.kind === 'diff' && x.from ? 'Different hours: ' + t12(x.from) + ' to ' + t12(x.to)
      : x.state === 'yes' ? 'Yes' : x.state === 'no' ? 'No' : x.state === 'inquiry' ? 'A question' : String(x.state || '');
    return '<details style="margin-top:6px;"><summary class="field-note" style="cursor:pointer;">Earlier answers (' + h.length + ')</summary>'
      + h.map((x) => '<div style="font-size:12.5px;padding:3px 0;border-top:1px dashed var(--border);"><b>' + E(w(x)) + '</b> <span class="field-note">' + E(x.channel === 'page' ? 'shift page' : 'text') + (x.at ? ' · ' + E(when(x.at)) : '') + (x.for ? ' · for ' + E(String(x.for).replace('|', ' ')) : '') + '</span>'
        + (x.reply ? '<div class="field-note">“' + E(String(x.reply).slice(0, 200)) + '”</div>' : '') + '</div>').join('') + '</details>';
  }
  function drawer(c, p) {
    const ok = p.eligibility && p.eligibility.ok;
    const ask = (c.asked || []).find((x) => String(x.id) === String(p.ask_id)) || {};
    return '<div style="margin-top:10px;border:1px solid var(--border);border-radius:12px;padding:12px 14px;background:var(--bg);">'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:baseline;"><b style="font-size:15px;color:var(--navy);">' + E(p.name) + '</b>'
      + (p.prn ? '<span style="font-size:11px;font-weight:800;color:#8A5A00;background:#FBF1D9;border-radius:999px;padding:1px 8px;">PRN</span>' : '')
      + '<span class="field-note">' + E(p.channel) + (p.replied_at ? ' · ' + E(when(p.replied_at)) : '') + (p.asked_at ? ' · asked ' + E(when(p.asked_at)) : '') + '</span></div>'
      + saidHtml(p)
      + (p.wants_regular ? '<div style="margin-top:5px;font-size:13px;font-weight:700;color:var(--green);">Would like this as their regular weekly shift. Talk with them; set it up in Caregiver Matching if you agree.</div>' : '')
      + historyHtml(p)
      + '<div style="margin-top:6px;font-size:13px;"><b style="color:' + (ok ? 'var(--green)' : 'var(--red)') + ';">' + (ok ? '✓ Eligible' : '✕ Not eligible') + '</b> <span class="field-note">' + E(p.eligibility ? p.eligibility.why : '') + '</span></div>'
      + '<div style="margin-top:4px;font-size:13px;font-weight:700;color:' + (p.recommended ? 'var(--green)' : 'var(--navy)') + ';">' + E(p.why) + '</div>'
      + ((p.reasons || []).length ? p.reasons.map((r) => '<div style="font-size:13px;"><span style="color:var(--green);font-weight:800;">&#10003;</span> ' + E(r) + '</div>').join('') : '')
      + ((p.concerns || []).length ? p.concerns.map((r) => '<div style="font-size:13px;color:#8A4E0C;">&#9888; ' + E(r) + '</div>').join('') : '')
      + '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">'
      + (p.can_confirm ? '<button class="addlead" onclick="covResolve(\'' + E(c.id) + '\',\'covered\',' + q(p.name) + ')">Confirm ' + E(first(p.name)) + ' &#10003;</button><span class="field-note">Writes them onto the visit in AxisCare and checks it.</span>'
        : p.column === 'nv' ? '<span class="field-note">Can\'t be offered or confirmed until the record is verified.</span>'
        : p.column === 'partial' ? '<span class="field-note">' + (c.handoff_ok ? 'Hand-off is allowed for this shift: talk it through, or wait for a full-shift yes.' : 'Hand-off isn\'t allowed for this shift, so part of it can\'t be confirmed.') + '</span>'
        : p.column === 'question' ? '<span class="field-note">Text back from the office line, then mark their answer on the case.</span>' : '')
      + '<a href="shift.html?preview=1&case=' + encodeURIComponent(c.id) + '&ask=' + encodeURIComponent(p.ask_id || '') + '" target="_blank" rel="noopener" style="font-size:12.5px;font-weight:700;margin-left:auto;">Preview ' + E(first(p.name)) + '\'s shift page &#8599;</a>'
      + (ask.link_revoked
        ? '<span class="field-note">Link taken back' + (ask.link_revoked_by ? ' by ' + E(ask.link_revoked_by) : '') + '.</span> <a href="javascript:void(0)" onclick="CB.linkBack(\'' + E(c.id) + '\',\'' + E(p.ask_id) + '\',false)" style="font-size:12.5px;">Give it back</a>'
        : '<a href="javascript:void(0)" onclick="CB.linkBack(\'' + E(c.id) + '\',\'' + E(p.ask_id) + '\',true)" style="font-size:12.5px;color:var(--red);">Take back their shift page link</a>')
      + '</div></div>';
  }
  function rulesHtml(c, d) {
    const tf = d.time_flex || 'exact', ho = !!d.handoff_ok;
    return '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:12.5px;margin-top:6px;">'
      + '<span class="field-note">This shift:</span>'
      + '<label style="display:inline-flex;gap:5px;align-items:center;">Time <select id="cbtf_' + E(c.id) + '" style="width:auto;font-size:12.5px;padding:2px 6px;" onchange="CB.saveRules(\'' + E(c.id) + '\')">'
      + '<option value="exact"' + (tf === 'exact' ? ' selected' : '') + '>Exact time</option><option value="flexible_start"' + (tf === 'flexible_start' ? ' selected' : '') + '>Flexible start</option></select></label>'
      + (tf === 'flexible_start' ? '<label style="display:inline-flex;gap:5px;align-items:center;">up to <select id="cbfm_' + E(c.id) + '" style="width:auto;font-size:12.5px;padding:2px 6px;" onchange="CB.saveRules(\'' + E(c.id) + '\')">'
        + [30, 60, 90, 120, 180].map((m) => '<option value="' + m + '"' + ((c.flex_minutes || 60) === m ? ' selected' : '') + '>' + (m < 60 ? m + ' min' : (m / 60) + ' hr' + (m > 60 ? 's' : '')) + '</option>').join('') + '</select></label>' : '')
      + '<label style="display:inline-flex;gap:5px;align-items:center;"><input type="checkbox" id="cbho_' + E(c.id) + '" style="width:auto;"' + (ho ? ' checked' : '') + ' onchange="CB.saveRules(\'' + E(c.id) + '\')"> Hand-off allowed</label>'
      + '<span class="field-note">Nothing changes in AxisCare from here.</span></div>';
  }
  async function saveRules(id) {
    const g = (x) => document.getElementById(x + id);
    const body = { action: 'set_time_rules', case_id: id, time_flex: g('cbtf_') ? g('cbtf_').value : 'exact', flex_minutes: g('cbfm_') ? Number(g('cbfm_').value) : 60, handoff_ok: !!(g('cbho_') && g('cbho_').checked) };
    try {
      const out = await call(body);
      const c = (DATA.coverage_cases || []).find((x) => x && x.id === id); if (c) Object.assign(c, { time_flex: out.time_flex, flex_minutes: out.flex_minutes, handoff_ok: out.handoff_ok });
      if (typeof ccToast === 'function') ccToast('Saved: ' + (out.time_flex === 'exact' ? 'exact time' : 'flexible start') + ', hand-off ' + (out.handoff_ok ? 'allowed' : 'not allowed'));
      load(id);
    } catch (e) { alert('Not saved: ' + (e.message || e)); }
  }
  /* PART SHIFTS THAT FIT TOGETHER (Cara Phase 2 Part A, her example 8a to 1p + 1p to 5p): shown for the office to consider.
     Nothing is offered or confirmed from here; a hand-off is the office's call, and only where the shift allows it. */
  function combosHtml(c, d) {
    const cm = d.combos || [], nh = d.parts_without_hours || [];
    if (!cm.length && !nh.length) return '';
    return '<div style="margin-top:9px;padding:9px 11px;border:1px dashed #b9dbe0;border-radius:10px;background:#F5FAFB;font-size:13px;">'
      + (cm.length ? '<b style="color:#14606F;">◐ Part shifts that fit together</b>' + cm.map((x) => '<div style="margin-top:4px;">' + E(x.first.name) + ' ' + E(x.first.from) + ' to ' + E(x.first.to) + ' + ' + E(x.second.name) + ' ' + E(x.second.from) + ' to ' + E(x.second.to)
          + ' <span class="field-note">(hand-off at ' + E(x.handoff_at) + '. ' + E(x.note) + ')</span></div>').join('') : '')
      + (nh.length ? '<div class="field-note" style="margin-top:' + (cm.length ? 6 : 0) + 'px;">Part of it, hours not given: ' + nh.map((x) => E(x.name) + (x.said ? ' (“' + E(x.said) + '”)' : '')).join(', ') + '</div>' : '')
      + '<div class="field-note" style="margin-top:4px;">Cara keeps asking for one caregiver for the whole shift; these stay here for you to consider.</div></div>';
  }
  /* the board for one case (an empty string when there is nothing to show yet) */
  function html(c) {
    if (!c || c.status !== 'open' || String(c.kind) === 'interest' || !(c.asked || []).length) return '';
    const st = ST[c.id];
    if (!st || st.key !== keyOf(c)) { if (!(st && st.loading)) setTimeout(() => load(c.id), 0); return '<div class="field-note" style="margin-top:9px;">Cara is sorting the answers…</div>'; }
    if (st.loading) return '<div class="field-note" style="margin-top:9px;">Cara is sorting the answers…</div>';
    if (st.err) return '<div style="margin-top:9px;color:var(--red);font-size:12.5px;">' + E(st.err) + ' <a href="javascript:void(0)" onclick="CB.load(\'' + E(c.id) + '\')">Try again</a></div>';
    const d = st.data, people = d.people || [];
    const chip = (p) => '<button type="button" onclick="CB.pick(\'' + E(c.id) + '\',\'' + E(p.ask_id) + '\')" aria-expanded="' + (st.open === p.ask_id) + '" style="display:block;width:100%;text-align:left;background:#fff;border:1px solid ' + (st.open === p.ask_id ? 'var(--teal)' : 'var(--border)') + ';border-radius:9px;padding:7px 9px;margin:0 0 6px;cursor:pointer;font:inherit;color:var(--text);">'
      + '<span style="font-weight:700;">' + E(p.name) + '</span>' + (p.prn ? ' <span style="font-size:10.5px;font-weight:800;color:#8A5A00;">PRN</span>' : '')
      + '<span style="display:block;font-size:12px;color:var(--text-muted);">' + E(p.column === 'partial' && p.offer_from ? t12(p.offer_from) + ' to ' + t12(p.offer_to) : p.condition ? p.condition : p.channel + (p.replied_at ? ' · ' + when(p.replied_at) : '')) + '</span>'
      + (p.recommended ? '<span style="display:inline-block;margin-top:3px;font-size:11px;font-weight:800;border-radius:6px;padding:0 6px;background:var(--green-bg);color:var(--green);">Cara\'s pick</span>' : '')
      + (p.wants_regular ? ' <span style="display:inline-block;margin-top:3px;font-size:11px;font-weight:800;border-radius:6px;padding:0 6px;background:var(--green-bg);color:var(--green);">wants it every week</span>' : '')
      + (p.stale ? ' <span style="display:inline-block;margin-top:3px;font-size:11px;font-weight:800;border-radius:6px;padding:0 6px;background:#f8e7e3;color:var(--red);">answered for old hours</span>' : '')
      + ((d.declined || []).some((x) => x.ask_id === p.ask_id) ? ' <span style="display:inline-block;margin-top:3px;font-size:11px;font-weight:800;border-radius:6px;padding:0 6px;background:#f1f3f6;color:var(--text-muted);">office: not this one</span>' : '')
      + ((p.concerns || []).some((x) => /Overtime risk/.test(x)) ? ' <span style="display:inline-block;margin-top:3px;font-size:11px;font-weight:800;border-radius:6px;padding:0 6px;background:#FFF4E3;color:#8A4E0C;">overtime risk</span>' : '')
      + '</button>';
    const cols = COLS.map(([k, label, ic, fg, bg, bd]) => { const list = people.filter((p) => p.column === k);
      return '<div style="background:' + bg + ';border:1px solid ' + bd + ';border-radius:12px;padding:9px;min-width:0;">'
        + '<div style="font-weight:800;font-size:13px;color:' + fg + ';margin-bottom:7px;">' + ic + ' ' + label + ' (' + list.length + ')</div>'
        + (list.length ? list.map(chip).join('') : '<div class="field-note" style="font-size:12px;">None</div>') + '</div>'; }).join('');
    const waiting = people.filter((p) => p.column === 'waiting');
    const sel = st.open ? people.find((p) => p.ask_id === st.open) : null;
    return '<div style="margin-top:10px;padding:12px;border:1px solid var(--border);border-radius:12px;background:#FFFCF5;">'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:baseline;"><b style="color:var(--navy);font-size:14.5px;">Who answered</b>'
      + '<span class="field-note">' + E(d.note || '') + '</span></div>'
      + (d.pattern ? '<div style="margin-top:6px;display:inline-block;font-size:12.5px;font-weight:800;border-radius:999px;padding:3px 11px;' + (d.pattern.kind === 'ongoing' ? 'background:var(--green-bg);color:var(--green);' : 'background:#e3f0f2;color:#14606F;') + '">' + E(d.pattern.label) + '</div>' : '')
      + profileNote(d)
      + rulesHtml(c, d)
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:9px;">' + cols + '</div>'
      + combosHtml(c, d)
      + (waiting.length ? '<div class="field-note" style="margin-top:7px;">Not answered yet: ' + waiting.map((p) => '<a href="javascript:void(0)" onclick="CB.pick(\'' + E(c.id) + '\',\'' + E(p.ask_id) + '\')">' + E(p.name) + '</a>').join(', ') + '</div>' : '')
      + (sel ? drawer(c, sel) : '<div class="field-note" style="margin-top:7px;">Click a name to see exactly what they said and why Cara would or wouldn\'t pick them.</div>')
      + '</div>';
  }
  window.CB = { on, html, load, pick, saveRules, linkBack };
})();
