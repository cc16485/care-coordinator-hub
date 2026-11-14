/* =============================================================================
   checkins-tab.js · Caregivers > Check-ins (window.CHK)
   Samantha 2026-11-14: "one place, maybe a check-in tab next to caregiver roster, where we see what was sent and when,
   who responded, get notified when people respond, all the things to make a real effective program of retaining the
   first 90 days of employment and ongoing", then "go" to the first step: the tab, showing what already goes out.
   -----------------------------------------------------------------------------
   It SENDS NOTHING. It asks the server (supabase function `checkins`, signed-in office staff only) for every active
   caregiver, the check-in texts the Hub sent them (today: the first-shift text and the PRN "glad to go back?" text),
   and the first text back after each one. A coordinator marks each reply Fine, Needs a call, or Called. The red number
   on the pill is every reply nobody has marked yet plus every "Needs a call" not yet called.
   Texts are on record from 2026-11-05 (cc_comms), so older check-ins are not shown.
   ============================================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.CHK = api;
})(this, function () {
  'use strict';
  const DAY = 86400000;
  const e = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const VIEW = { data: null, loading: false, err: '', notOn: false, askedAt: 0, view: 'needs', saving: {}, msg: '' };
  const VIEWS = [['needs', 'Needs you'], ['first90', 'First 90 days'], ['everyone', 'Everyone'], ['sent', 'What was sent']];

  /** what a check-in is: 'concern' (marked Needs a call, not yet called), 'new' (a reply nobody marked), 'fine', 'called',
      'no_answer' (three days, nothing back), 'sent' (still inside the three days) */
  function stateOf(c) {
    if (c.mark && c.mark.state === 'call') return 'concern';
    if (c.mark && c.mark.state === 'called') return 'called';
    if (c.mark && c.mark.state === 'fine') return 'fine';
    if (c.reply) return 'new';
    return c.waiting === 'no_answer' ? 'no_answer' : 'sent';
  }
  const needsYou = (c) => { const s = stateOf(c); return s === 'new' || s === 'concern'; };
  function counts(people, nowMs) {
    const all = [].concat(...(people || []).map((p) => p.checkins.map((c) => ({ p, c }))));
    const recent = all.filter((x) => nowMs - Date.parse(x.c.sent_at) < 30 * DAY && stateOf(x.c) !== 'sent');
    return {
      needs: all.filter((x) => needsYou(x.c)).length,
      first90: (people || []).filter((p) => p.day != null && p.day >= 0 && p.day <= 90).length,
      answeredPct: recent.length ? Math.round(100 * recent.filter((x) => x.c.reply).length / recent.length) : null,
      noAnswer: all.filter((x) => stateOf(x.c) === 'no_answer').length,
      sent: all.length,
    };
  }
  const when = (iso, nowMs) => {
    const ms = Date.parse(iso); if (!Number.isFinite(ms)) return '';
    const d = new Date(ms), days = Math.floor((nowMs - ms) / DAY);
    const t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' });
    if (days < 1 && new Date(nowMs).toDateString() === d.toDateString()) return 'today ' + t;
    if (days < 2) return 'yesterday ' + t;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
  };
  const DOT = { fine: ['#1D9E75', 'answered, fine'], called: ['#1D9E75', 'answered, called'], new: ['#378ADD', 'answered, not read yet'],
    concern: ['#E24B4A', 'needs a call'], no_answer: ['#EF9F27', 'no answer in three days'], sent: ['#B4B2A9', 'sent, waiting'] };
  const dot = (s) => '<span class="chk-dot" title="' + e(DOT[s][1]) + '" style="background:' + DOT[s][0] + '"></span>';
  const phoneOf = (p) => { const cg = (typeof DATA !== 'undefined' && DATA.caregivers || []).find((c) => String(c.id) === String(p.id) || (p.axiscare_id && String(c.axiscare_id) === p.axiscare_id)); return (cg && cg.phone) || ''; };
  const callBtn = (p) => { const ph = phoneOf(p); return ph && typeof ocAttrs === 'function' ? '<a class="fb"' + ocAttrs(ph) + '>📞 Call</a>' : ''; };
  const markBtns = (c) => {
    const s = stateOf(c), busy = VIEW.saving[c.id];
    if (busy) return '<span class="field-note">Saving…</span>';
    const b = (state, label) => '<button class="fb" onclick="CHK.mark(\'' + e(c.id) + '\',\'' + state + '\')">' + label + '</button>';
    if (s === 'concern') return b('called', 'Called') + ' ' + b('fine', 'It was fine');
    return b('fine', 'Fine') + ' ' + b('call', 'Needs a call');
  };
  const markLine = (c, nowMs) => c.mark ? '<div class="field-note">' + e({ fine: 'Marked fine', call: 'Marked needs a call', called: 'Called' }[c.mark.state] || '') + ' by ' + e(c.mark.by) + ', ' + e(when(c.mark.at, nowMs)) + (c.mark.note ? ': ' + e(c.mark.note) : '') + '</div>' : '';

  function needsHtml(people, nowMs) {
    const rows = [];
    for (const p of people) for (const c of p.checkins) if (needsYou(c)) rows.push({ p, c });
    rows.sort((a, b) => (stateOf(a.c) === 'concern' ? 0 : 1) - (stateOf(b.c) === 'concern' ? 0 : 1) || String(b.c.reply ? b.c.reply.at : b.c.sent_at).localeCompare(String(a.c.reply ? a.c.reply.at : a.c.sent_at)));
    if (!rows.length) return '<div class="empty">Nothing waiting. Every reply has been read.</div>';
    return rows.map(({ p, c }) => '<div class="chk-row">' + dot(stateOf(c))
      + '<div class="chk-main"><b>' + e(p.name) + '</b> <span class="field-note">' + (p.day != null ? 'day ' + e(p.day) + ' · ' : '') + e(c.label) + ' · answered ' + e(when(c.reply ? c.reply.at : c.sent_at, nowMs)) + '</span>'
      + (c.reply ? '<div class="chk-reply">“' + e(c.reply.body) + '”</div>' : '') + markLine(c, nowMs) + '</div>'
      + '<div class="chk-acts">' + markBtns(c) + ' ' + callBtn(p) + '</div></div>').join('');
  }
  function peopleHtml(people, nowMs, only90) {
    const list = only90 ? people.filter((p) => p.day != null && p.day >= 0 && p.day <= 90) : people;
    if (!list.length) return '<div class="empty">' + (only90 ? 'Nobody is in their first 90 days.' : 'No active caregivers on the roster.') + '</div>';
    return '<table class="chk-table"><thead><tr><th>Caregiver</th><th>Day</th><th>Check-ins</th><th>Last answer</th></tr></thead><tbody>'
      + list.map((p) => {
        const last = p.checkins.find((c) => c.reply);
        return '<tr><td>' + e(p.name) + (p.phone_on_file ? '' : ' <span class="field-note">no phone on file</span>') + '</td>'
          + '<td>' + (p.day != null ? e(p.day) : '') + '</td>'
          + '<td>' + (p.checkins.length ? p.checkins.slice().reverse().map((c) => dot(stateOf(c))).join('') : '<span class="field-note">none yet</span>') + '</td>'
          + '<td>' + (last ? '<span class="field-note">' + e(when(last.reply.at, nowMs)) + ':</span> ' + e(String(last.reply.body).slice(0, 90)) : '') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  function sentHtml(people, nowMs) {
    const rows = [];
    for (const p of people) for (const c of p.checkins) rows.push({ p, c });
    rows.sort((a, b) => String(b.c.sent_at).localeCompare(String(a.c.sent_at)));
    if (!rows.length) return '<div class="empty">No check-in texts on record yet.</div>';
    return '<table class="chk-table"><thead><tr><th>Sent</th><th>To</th><th>Check-in</th><th>Answer</th></tr></thead><tbody>'
      + rows.map(({ p, c }) => '<tr><td>' + e(when(c.sent_at, nowMs)) + '</td><td>' + e(p.name) + '</td><td>' + e(c.label) + '</td><td>'
        + dot(stateOf(c)) + ' ' + (c.reply ? e(when(c.reply.at, nowMs)) : e(DOT[stateOf(c)][1])) + '</td></tr>').join('') + '</tbody></table>';
  }
  function html(V, nowMs) {
    if (V.notOn) return '<div class="card"><div class="empty">Check-ins is not switched on on the server yet. Run the Desktop step for it, then open this tab again.</div></div>';
    if (V.err && !V.data) return '<div class="card"><div class="empty">Check-ins could not load: ' + e(V.err) + ' <button class="fb" onclick="CHK.load()">Try again</button></div></div>';
    if (!V.data) return '<div class="card"><div class="empty">Loading check-ins…</div></div>';
    const people = V.data.people || [], n = counts(people, nowMs);
    const tile = (label, val, red) => '<div class="kpi"><div class="kl"><span>' + e(label) + '</span></div><div class="kv"' + (red && val ? ' style="color:var(--red)"' : '') + '>' + e(val == null ? '–' : val) + '</div></div>';
    const body = V.view === 'needs' ? needsHtml(people, nowMs) : V.view === 'first90' ? peopleHtml(people, nowMs, true) : V.view === 'everyone' ? peopleHtml(people, nowMs, false) : sentHtml(people, nowMs);
    return '<div class="chk-kpis">' + tile('Needs you', n.needs, true) + tile('In first 90 days', n.first90) + tile('Answered, last 30 days', n.answeredPct == null ? null : n.answeredPct + '%') + tile('No answer', n.noAnswer) + '</div>'
      + '<div class="toolbar">' + VIEWS.map(([k, l]) => '<button class="filter-pill' + (V.view === k ? ' active' : '') + '" onclick="CHK.setView(\'' + k + '\')">' + e(l) + (k === 'needs' && n.needs ? ' (' + n.needs + ')' : '') + '</button>').join('')
      + '<div class="spacer"></div><button class="fb" onclick="CHK.load()">' + (V.loading ? 'Checking…' : 'Check again') + '</button></div>'
      + (V.msg ? '<div class="field-note" role="alert" style="color:var(--red)">' + e(V.msg) + '</div>' : '')
      + '<div class="card">' + body + '</div>'
      + '<div class="chk-legend">' + Object.keys(DOT).filter((k) => k !== 'called').map((k) => dot(k) + ' ' + e(DOT[k][1])).join(' &nbsp; ') + '</div>'
      + '<p class="field-note">Today the check-ins are the morning-after text for each new caregiver and client pair, and the PRN "glad to go back?" text. A reply is the first text back within three days. Texts are on record from November 5, 2026. Nothing on this tab sends anything.</p>';
  }
  function setBadge() {
    if (typeof document === 'undefined') return;
    const b = document.getElementById('chkBadge'); if (!b) return;
    const n = VIEW.data ? counts(VIEW.data.people || [], Date.now()).needs : 0;
    b.textContent = n || ''; b.style.display = n ? 'inline-flex' : 'none';
  }
  function render() {
    setBadge();
    if (typeof document === 'undefined') return;
    const box = document.getElementById('checkinsWrap'); if (box) box.innerHTML = html(VIEW, Date.now());
  }
  const endpoint = () => (typeof CAMPAIGN_ENDPOINT !== 'undefined' ? String(CAMPAIGN_ENDPOINT).replace(/campaign-send$/, 'checkins') : '');
  async function post(body) {
    const url = endpoint(); if (!url || typeof cmpAuthHeaders !== 'function') throw new Error('the Hub is still loading.');
    const res = await fetch(url, { method: 'POST', headers: await cmpAuthHeaders(), body: JSON.stringify(body || {}) });
    if (res.status === 404) { const err = new Error('not installed'); err.notOn = true; throw err; }
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.ok) throw new Error((j && j.error) || ('the server answered ' + res.status + '.'));
    return j;
  }
  async function load() {
    if (VIEW.loading) return;
    VIEW.loading = true; VIEW.err = ''; VIEW.notOn = false; VIEW.askedAt = Date.now(); render();
    try { VIEW.data = await post({}); }
    catch (err) { if (err.notOn) VIEW.notOn = true; else VIEW.err = String((err && err.message) || err); }
    VIEW.loading = false; render();
  }
  async function mark(id, state) {
    VIEW.saving[id] = true; VIEW.msg = ''; render();
    try {
      const j = await post({ mark: { id, state } });
      for (const p of (VIEW.data && VIEW.data.people) || []) for (const c of p.checkins) if (c.id === id) c.mark = { state, by: j.mark.by_name || j.mark.by, at: j.mark.at, note: '' };
    } catch (err) { VIEW.msg = 'The mark was not saved: ' + String((err && err.message) || err); }
    delete VIEW.saving[id]; render();
  }
  /* the open tab is redrawn whenever anything is saved anywhere: draw from what we have, ask again after five minutes */
  function show() { render(); if (!VIEW.loading && (!VIEW.askedAt || Date.now() - VIEW.askedAt > 300000)) load(); }
  /* any Caregivers tab: ask once in the background, so the pill's number is there before the tab is opened */
  function peek() { if (!VIEW.askedAt && !VIEW.loading) load(); }
  function setView(v) { VIEW.view = v; render(); }
  return { stateOf, needsYou, counts, html, VIEW, render, load, mark, show, peek, setView };
});
