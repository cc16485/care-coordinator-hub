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
  const keyOf = (c) => (c.asked || []).map((a) => [a.id, a.state, a.replied_at, a.condition, a.answer_kind].join('|')).join(',') + '|' + (c.time_flex || '') + (c.handoff_ok ? 'h' : '') + (c.flex_minutes || '');
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
  function drawer(c, p) {
    const ok = p.eligibility && p.eligibility.ok;
    return '<div style="margin-top:10px;border:1px solid var(--border);border-radius:12px;padding:12px 14px;background:var(--bg);">'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:baseline;"><b style="font-size:15px;color:var(--navy);">' + E(p.name) + '</b>'
      + (p.prn ? '<span style="font-size:11px;font-weight:800;color:#8A5A00;background:#FBF1D9;border-radius:999px;padding:1px 8px;">PRN</span>' : '')
      + '<span class="field-note">' + E(p.channel) + (p.replied_at ? ' · ' + E(when(p.replied_at)) : '') + (p.asked_at ? ' · asked ' + E(when(p.asked_at)) : '') + '</span></div>'
      + saidHtml(p)
      + '<div style="margin-top:6px;font-size:13px;"><b style="color:' + (ok ? 'var(--green)' : 'var(--red)') + ';">' + (ok ? '✓ Eligible' : '✕ Not eligible') + '</b> <span class="field-note">' + E(p.eligibility ? p.eligibility.why : '') + '</span></div>'
      + '<div style="margin-top:4px;font-size:13px;font-weight:700;color:' + (p.recommended ? 'var(--green)' : 'var(--navy)') + ';">' + E(p.why) + '</div>'
      + ((p.reasons || []).length ? p.reasons.map((r) => '<div style="font-size:13px;"><span style="color:var(--green);font-weight:800;">&#10003;</span> ' + E(r) + '</div>').join('') : '')
      + ((p.concerns || []).length ? p.concerns.map((r) => '<div style="font-size:13px;color:#8A4E0C;">&#9888; ' + E(r) + '</div>').join('') : '')
      + '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">'
      + (p.can_confirm ? '<button class="addlead" onclick="covResolve(\'' + E(c.id) + '\',\'covered\',' + q(p.name) + ')">Confirm ' + E(first(p.name)) + ' &#10003;</button><span class="field-note">Writes them onto the visit in AxisCare and checks it.</span>'
        : p.column === 'nv' ? '<span class="field-note">Can\'t be offered or confirmed until the record is verified.</span>'
        : p.column === 'partial' ? '<span class="field-note">' + (c.handoff_ok ? 'Hand-off is allowed for this shift: talk it through, or wait for a full-shift yes.' : 'Hand-off isn\'t allowed for this shift, so part of it can\'t be confirmed.') + '</span>'
        : p.column === 'question' ? '<span class="field-note">Text back from the office line, then mark their answer on the case.</span>' : '')
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
      + rulesHtml(c, d)
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:9px;">' + cols + '</div>'
      + (waiting.length ? '<div class="field-note" style="margin-top:7px;">Not answered yet: ' + waiting.map((p) => '<a href="javascript:void(0)" onclick="CB.pick(\'' + E(c.id) + '\',\'' + E(p.ask_id) + '\')">' + E(p.name) + '</a>').join(', ') + '</div>' : '')
      + (sel ? drawer(c, sel) : '<div class="field-note" style="margin-top:7px;">Click a name to see exactly what they said and why Cara would or wouldn\'t pick them.</div>')
      + '</div>';
  }
  window.CB = { on, html, load, pick, saveRules };
})();
