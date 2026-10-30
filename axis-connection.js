/* =============================================================================
   axis-connection.js · Settings > AxisCare connection (Samantha, 2026-10-29: "a simple AxisCare Connection section in
   Hub Settings showing the last successful reads, failed reads, 429 errors, request volume, and whether scheduling
   information is current"). Reads the server's axis_connection (Staffing-Coordinator-Hub axis_health_B.sql), which
   counts every AxisCare call the server jobs make. One line per kind of AxisCare information, so a good caregiver-list
   read never makes failing visit reads look fine.
   Two switches, owners only, both OFF until she turns them on:
     ops_settings.axis_shared_reader_live  "Shared AxisCare reader" (A: one global limit, AxisCare's wait respected,
                                           identical reads combined, short copies; Cara always reads schedules fresh)
     ops_settings.axis_failure_cards_live  "Tell me when AxisCare can't be read" (B: one card per kind that cannot be
                                           read, closing itself when AxisCare reads again)
   AxisConn.cardLine(card) gives the "AxisCare checked 2:14 PM" line for an AxisCare-based card (for the card lists to
   show; not hooked into Team Work yet).
   No em dashes in anything a person reads.
   ============================================================================= */
(function (W) {
  'use strict';
  const D = () => (W.DATA || {});
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const owner = () => { try { return typeof W.ccIsOwner === 'function' && W.ccIsOwner(); } catch (_) { return false; } };
  const KINDS = [
    ['visits', 'Visit lists', 'shifts, clock-ins, coverage'],
    ['visit', 'Single visits', 'clock-in and clock-out checks'],
    ['schedules', 'Schedules', 'ongoing open shifts'],
    ['caregivers', 'Caregiver list', 'who Cara may text'],
    ['clients', 'Client records', 'client details'],
    ['reasons', 'Cancel reasons', 'cancelled visits'],
  ];
  /* which AxisCare information each kind of card is built from */
  const CARD_SOURCE = { coverage: 'visits', coverage_outcome: 'visits', open_shift: 'visits', confirm_times: 'visits', late_notice: 'visits', staffing_issue: 'visits', care_note: 'visit' };
  let S = { at: 0, conn: null, error: '' };

  function when(iso, nowMs) {
    if (!iso) return '';
    const t = Date.parse(iso); if (!isFinite(t)) return '';
    const o = { timeZone: 'America/Chicago' };
    const day = (ms) => new Date(ms).toLocaleDateString('en-US', Object.assign({ month: 'short', day: 'numeric' }, o));
    const hm = new Date(t).toLocaleTimeString('en-US', Object.assign({ hour: 'numeric', minute: '2-digit' }, o));
    return day(t) === day(nowMs == null ? Date.now() : nowMs) ? hm : day(t) + ', ' + hm;
  }

  async function load(force) {
    if (!force && S.conn && Date.now() - S.at < 60000) return S;
    try {
      if (!W.sb) throw new Error('not signed in');
      const r = await W.sb.rpc('axis_connection', { p_minutes: 60 });
      if (r.error) throw new Error(/axis_connection/.test(r.error.message || '') ? 'The AxisCare log is not installed yet.' : (r.error.message || 'could not read'));
      S = { at: Date.now(), conn: r.data || null, error: '' };
    } catch (e) { S = { at: Date.now(), conn: null, error: String((e && e.message) || e) }; }
    return S;
  }

  /* the pure page part (tested with a fake summary) */
  function html(conn, error, nowMs) {
    if (!conn) return '<div class="field-note">' + esc(error || 'Not read yet.') + '</div>';
    const now = nowMs == null ? Date.now() : nowMs;
    const src = conn.sources || {}, tot = conn.totals || {};
    const vis = src.visits || {};
    const cur = conn.scheduling_current === true;
    const top = '<div style="padding:10px 12px;border-radius:8px;margin:6px 0 10px;background:' + (cur ? '#E8F6EE' : '#FDF2E3') + ';">'
      + (cur ? '<b style="color:#1E8449;">Scheduling information is current.</b> The last visit read worked at ' + esc(when(vis.last_ok_at, now)) + '.'
        : '<b style="color:#B7791F;">Scheduling information is NOT current.</b> '
          + (vis.last_ok_at ? 'The last good visit read was at ' + esc(when(vis.last_ok_at, now)) + '.' : 'No good visit read in the log yet.')
          + (vis.last_try_ok === false && vis.last_error ? ' Last answer: ' + esc(String(vis.last_error).slice(0, 120)) + '.' : '')
          + ' Check urgent shifts in AxisCare.')
      + (conn.axiscare_wait_until ? '<br>AxisCare asked the Hub to wait until ' + esc(when(conn.axiscare_wait_until, now)) + '.' : '')
      + '</div>';
    const n = (x) => Number(x || 0);
    const vol = '<div class="field-note" style="margin:0 0 8px;">Last hour: <b>' + n(tot.calls) + '</b> AxisCare reads, <b>' + n(tot.failed) + '</b> failed, <b>' + n(tot.r429) + '</b> turned away by AxisCare (429)'
      + (n(tot.held) ? ', ' + n(tot.held) + ' held back while AxisCare asked the Hub to wait' : '')
      + (n(tot.shared) ? ', ' + n(tot.shared) + ' answered from a read another job had just made' : '') + '.</div>';
    const row = (k) => {
      const s = src[k[0]];
      if (!s) return '<tr><td>' + esc(k[1]) + '<div class="field-note">' + esc(k[2]) + '</div></td><td colspan="4" class="field-note">Not read in the last 14 days</td></tr>';
      const bad = s.last_try_ok === false;
      return '<tr><td>' + esc(k[1]) + '<div class="field-note">' + esc(k[2]) + '</div></td>'
        + '<td>' + (s.last_ok_at ? esc(when(s.last_ok_at, now)) : '<span style="color:#B7791F;">none</span>') + '</td>'
        + '<td>' + (s.last_fail_at ? '<span style="color:' + (bad ? '#C0392B' : 'inherit') + ';">' + esc(when(s.last_fail_at, now)) + '</span>' : 'none') + '</td>'
        + '<td style="text-align:right;">' + n(s.failed) + '</td><td style="text-align:right;">' + n(s.r429) + '</td></tr>';
    };
    const table = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">'
      + '<thead><tr style="text-align:left;"><th>AxisCare information</th><th>Last good read</th><th>Last failed read</th><th style="text-align:right;">Failed (1 h)</th><th style="text-align:right;">429s (1 h)</th></tr></thead><tbody>'
      + KINDS.map(row).join('') + '</tbody></table></div>';
    const jobs = (conn.jobs || []);
    const jobsHtml = jobs.length ? '<details style="margin-top:8px;"><summary style="cursor:pointer;">By job, last hour</summary><div class="field-note">'
      + jobs.map((j) => esc(j.job) + ': ' + n(j.calls) + ' reads, ' + n(j.failed) + ' failed, ' + n(j.r429) + ' 429s' + (n(j.held) ? ', ' + n(j.held) + ' held' : '') + (n(j.shared) ? ', ' + n(j.shared) + ' shared' : '')).join('<br>') + '</div></details>' : '';
    const hours = (conn.hours || []);
    const hoursHtml = hours.length ? '<details style="margin-top:4px;"><summary style="cursor:pointer;">Hour by hour, last 24 hours</summary><div class="field-note">'
      + hours.map((h) => esc(when(h.hour, now)) + ': ' + n(h.calls) + ' reads, ' + n(h.r429) + ' 429s, ' + n(h.failed) + ' failed' + (h.live ? ' (shared reader on)' : '')).join('<br>') + '</div></details>' : '';
    return top + vol + table + jobsHtml + hoursHtml
      + '<div class="field-note" style="margin-top:6px;">Checked ' + esc(when(conn.as_of, now)) + '. The server counts every AxisCare read, whichever switch is on.</div>';
  }

  const READER = 'axis_shared_reader_live', CARDS = 'axis_failure_cards_live';
  const isOn = (k) => (D().ops_settings || {})[k] === true;
  function switchesFill() {
    const set = (k, nowId, btnId, onTxt, offTxt, label) => {
      const now = document.getElementById(nowId), b = document.getElementById(btnId);
      if (now) now.innerHTML = (isOn(k) ? '<b style="color:#1E8449;">On.</b> ' + onTxt : '<b style="color:#B7791F;">Off.</b> ' + offTxt) + (owner() ? '' : ' Only Samantha or Zachary can change this.');
      if (b) { b.textContent = (isOn(k) ? 'Turn off ' : 'Turn on ') + label; b.style.display = owner() ? '' : 'none'; }
    };
    set(READER, 'axcReaderNow', 'axcReaderBtn', 'Server jobs share one AxisCare reader: one request limit, AxisCare\'s "wait" respected, identical reads combined. Cara always reads schedules fresh before offering or confirming a shift.',
      'Each job calls AxisCare on its own, as before. Every read is still counted below.', 'the shared AxisCare reader');
    set(CARDS, 'axcCardsNow', 'axcCardsBtn', 'If AxisCare cannot be read for 15 minutes, one card says what and since when, and closes by itself when it reads again. Old "Cara is HOLDING all callouts" cards close once the caregiver list reads again.',
      'No cards about AxisCare reads. The server only reports what it would do.', 'AxisCare read cards');
  }
  async function fill(force) {
    switchesFill();
    const box = document.getElementById('axcBox'); if (!box) return;
    const s = await load(force);
    box.innerHTML = html(s.conn, s.error);
  }
  async function toggle(k, btn) {
    if (!owner()) { alert('Only Samantha or Zachary can change this.'); return; }
    const want = !isOn(k);
    const msg = k === READER
      ? (want ? 'Turn on the shared AxisCare reader?\n\n· all server jobs that read AxisCare share one request limit, and urgent scheduling reads go first\n· when AxisCare says "too many requests", nobody asks again until the time AxisCare gives\n· identical reads at the same time become one read\n· cards and lists may use a read up to 2 minutes old; Cara always reads visits, schedules and the caregiver list fresh before offering or confirming a shift\n\nNothing is sent to anyone. Turning it off puts every job back as it was.' : 'Turn off the shared AxisCare reader? Every job calls AxisCare on its own again, as before. Reads are still counted.')
      : (want ? 'Turn on AxisCare read cards?\n\n· if AxisCare cannot be read for 15 minutes, one card for each kind of information (visits, caregiver list, ...) says since when and what may be out of date\n· it closes by itself when AxisCare reads again, saying from when to when\n· old "Cara is HOLDING all callouts" cards close once the caregiver list reads again\n\nNothing is sent to anyone.' : 'Turn off AxisCare read cards? No new cards about AxisCare reads. Open ones stay until someone closes them.');
    if (!(await W.ccConfirm(msg))) return;
    if (btn) btn.disabled = true;
    const label = k === READER ? 'shared AxisCare reader' : 'AxisCare read cards';
    const out = await W.tkMerge((m) => { m[k] = want; if (want && !m[k + '_since']) m[k + '_since'] = new Date().toISOString(); return [label + ' ' + (want ? 'ON' : 'OFF')]; }, label);
    if (btn) btn.disabled = false;
    const sv = document.getElementById('axcSaved'); if (sv) sv.textContent = out && out.error ? 'Could not save: ' + out.error.message : (want ? 'On.' : 'Off.');
    switchesFill();
  }

  /* "AxisCare checked 2:14 PM" for a card built from AxisCare; '' for other cards or before the summary is read */
  function cardLine(card, conn, nowMs) {
    conn = conn || S.conn; if (!conn || !card) return '';
    const k = CARD_SOURCE[String(card.kind || '')]; if (!k) return '';
    const s = (conn.sources || {})[k]; const now = nowMs == null ? Date.now() : nowMs;
    if (!s || !s.last_ok_at) return '<span style="color:#B7791F;">AxisCare not checked yet</span>';
    const old = now - Date.parse(s.last_ok_at) > 15 * 60000 || s.last_try_ok === false;
    return old ? '<span style="color:#B7791F;">AxisCare last checked ' + esc(when(s.last_ok_at, now)) + '. This may be out of date.</span>'
      : 'AxisCare checked ' + esc(when(s.last_ok_at, now));
  }

  W.AxisConn = { fill, load, html, toggle, cardLine, when, KINDS, CARD_SOURCE, READER, CARDS };
})(window);
