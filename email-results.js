/* =============================================================================
   email-results.js · EMAIL RESULTS (Referrals & Marketing > Email results)
   =============================================================================
   Samantha, 2026-11-13: "where are the emails? where do i see if it's opened or read or responded to or who has
   unsubscribed", then "it should be in the marketing area".
   One screen for every email sent from the email library, by the schedule or by hand: who got it, whether it was
   opened, whether they wrote back, and who has unsubscribed. The server function email-results does the reading
   (it only reads; it never sends). Opens and replies are what GoHighLevel reports. An email that could not be
   checked says so: it is never shown as "not opened".
   This file only shows what the server returns. It saves nothing.
   ============================================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.CCEmailResults = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const AUDS = [['all', 'Everyone'], ['leads', 'Leads'], ['partners', 'Referral partners'], ['caregivers', 'Caregivers'], ['clients', 'Clients and families'], ['other', 'Other']];
  const AUD_WORD = { leads: 'Leads', partners: 'Referral partners', caregivers: 'Caregivers', clients: 'Clients and families', other: 'Other' };
  function audOf(s) {
    const a = String((s && s.aud) || '').toLowerCase();
    if (a === 'monthly' || a === 'lead') return 'leads';
    if (a === 'referrers' || a === 'referral-partner') return 'partners';
    if (a === 'caregivers' || a === 'caregiver') return 'caregivers';
    if (/^client/.test(a)) return 'clients';
    return 'other';
  }
  /* One plain answer per person. Order matters: a reply beats an open, a problem beats "delivered". */
  function statusOf(s) {
    if (!s) return { k: 'unknown', word: 'Not known', tone: 'muted' };
    if (s.replied_at) return { k: 'replied', word: 'Wrote back', tone: 'good' };
    if (s.problem) return { k: 'problem', word: 'Did not arrive (' + s.problem + ')', tone: 'bad' };
    if (s.opened_at) return { k: 'opened', word: 'Opened', tone: 'good' };
    if (s.error) return { k: 'unknown', word: 'Could not be checked just now', tone: 'muted' };
    if (!s.checked_at) return { k: 'waiting', word: 'Not checked yet', tone: 'muted' };
    if (s.found === false) return { k: 'unknown', word: 'Not found in GoHighLevel', tone: 'muted' };
    return { k: 'sent', word: 'Sent, not opened yet', tone: 'plain' };
  }
  const day = (iso) => String(iso || '').slice(0, 10);
  function filter(sends, aud, q) {
    const want = String(q || '').trim().toLowerCase();
    return (sends || []).filter((s) => (aud === 'all' || !aud || audOf(s) === aud)
      && (!want || [s.to, s.name, s.org, s.subj].some((v) => String(v || '').toLowerCase().includes(want))));
  }
  /* One line per email per day it went out, newest first, with its people underneath. */
  function groups(sends) {
    const by = new Map();
    for (const s of sends || []) {
      const k = day(s.at) + '|' + (s.key || s.subj) + '|' + audOf(s);
      if (!by.has(k)) by.set(k, { k, at: s.at, subj: s.subj || '(no subject)', key: s.key || '', aud: audOf(s), auto: !!s.auto, people: [] });
      const g = by.get(k); g.people.push(s); if (String(s.at) > String(g.at)) g.at = s.at; if (!s.auto) g.auto = false;
    }
    return [...by.values()].map((g) => Object.assign(g, counts(g.people))).sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }
  /* "known" is how many we could actually check: opened is only ever said out of those. */
  function counts(people) {
    const c = { sent: people.length, opened: 0, replied: 0, problems: 0, known: 0 };
    for (const s of people) { const st = statusOf(s).k;
      if (st === 'replied') { c.replied++; c.opened++; c.known++; }
      else if (st === 'opened') { c.opened++; c.known++; }
      else if (st === 'problem') { c.problems++; c.known++; }
      else if (st === 'sent') c.known++; }
    return c;
  }
  function totals(sends, nowMs, days) {
    const recent = (sends || []).filter((s) => nowMs - Date.parse(s.at) < (days || 30) * 86400000);
    return counts(recent);
  }
  const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const whenWord = (iso) => { try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };
  const dayWord = (iso) => { try { return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); } catch (e) { return ''; } };
  const TONE = { good: 'background:#DCFCE7;color:#166534;', bad: 'background:#FEE2E2;color:#991B1B;', plain: 'background:#EEF2F7;color:#334155;', muted: 'background:#F5F5F4;color:#78716C;' };
  const chip = (st) => '<span style="display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700;' + TONE[st.tone] + '">' + esc(st.word) + '</span>';

  const VIEW = { aud: 'all', q: '', open: {}, data: null, loading: false, err: '', notOn: false };
  function html(v, nowMs) {
    const d = v.data;
    const head = '<div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;"><div style="flex:1 1 320px;"><h2 style="font-size:22px;margin:0 0 4px;color:var(--navy);">Email results</h2>'
      + '<p style="color:var(--text-muted);font-size:14px;margin:0 0 14px;max-width:76ch;">Every email sent from the email library, by the schedule or by hand: who got it, who opened it, who wrote back, and who has unsubscribed. Opens and replies are what GoHighLevel reports. To read a reply, open that person in GoHighLevel.</p></div>'
      + '<button type="button" class="secondary" id="erRefresh" onclick="CCEmailResults.load(true)"' + (v.loading ? ' disabled' : '') + '>' + (v.loading ? 'Checking…' : 'Check again') + '</button></div>';
    if (v.notOn) return head + '<div class="card"><div class="empty">This screen is not switched on yet. The piece on the server that reads the results has not been installed.</div></div>';
    if (v.err) return head + '<div class="card"><div class="empty">The results could not be read just now: ' + esc(v.err) + ' Press Check again in a minute.</div></div>';
    if (!d) return head + '<div class="card"><div class="empty">Reading the results…</div></div>';
    const t = totals(d.sends, nowMs, 30);
    const tile = (n, w, sub) => '<div style="flex:1 1 150px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;"><div style="font-size:26px;font-weight:800;color:var(--navy);">' + n + '</div><div style="font-size:13px;font-weight:700;">' + w + '</div><div style="font-size:12px;color:var(--text-muted);">' + sub + '</div></div>';
    const tiles = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 16px;">'
      + tile(t.sent, 'Emails sent', 'last 30 days') + tile(t.opened, 'Opened', t.known ? 'of ' + t.known + ' we could check' : 'none checked yet')
      + tile(t.replied, 'Wrote back', 'last 30 days') + tile((d.unsubscribed || []).length, 'Unsubscribed', 'all time') + '</div>';
    const note = (d.still_to_check ? '<div style="font-size:13px;color:#B45309;margin:0 0 10px;">' + d.still_to_check + ' still to check. Press Check again to do the next batch.</div>' : '')
      + (d.unread ? '<div style="font-size:13px;color:#B45309;margin:0 0 10px;">GoHighLevel could not answer for ' + d.unread + ' just now. They show as "Could not be checked", not as unopened.</div>' : '');
    const pills = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 12px;">' + AUDS.map((a) => '<button type="button" class="cmp-aud ' + (v.aud === a[0] ? 'active' : '') + '" style="padding:6px 12px;border-radius:999px;border:1px solid var(--border);background:' + (v.aud === a[0] ? 'var(--navy)' : 'var(--card)') + ';color:' + (v.aud === a[0] ? '#fff' : 'inherit') + ';font-weight:700;font-size:13px;cursor:pointer;" onclick="CCEmailResults.setAud(\'' + a[0] + '\')">' + a[1] + '</button>').join('')
      + '<input id="erQ" type="search" placeholder="Search a name, organization or email" value="' + esc(v.q) + '" oninput="CCEmailResults.setQ(this.value)" style="flex:1 1 220px;min-width:180px;padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:14px;"></div>';
    const gs = groups(filter(d.sends, v.aud, v.q));
    const list = gs.length ? gs.map((g) => {
      const open = !!v.open[g.k] || !!String(v.q).trim();
      const people = !open ? '' : '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:10px;">' + g.people.slice().sort((a, b) => String(a.org || a.name || a.to).localeCompare(String(b.org || b.name || b.to))).map((s) =>
        '<tr><td style="padding:7px 8px;border-top:1px solid var(--border);"><b>' + esc(s.org || s.name || s.to) + '</b>' + (s.org && s.name ? ' · ' + esc(s.name) : '') + '<div style="color:var(--text-muted);font-size:12px;">' + esc(s.to) + '</div></td>'
        + '<td style="padding:7px 8px;border-top:1px solid var(--border);text-align:right;white-space:nowrap;">' + chip(statusOf(s)) + (s.replied_at ? '<div style="color:var(--text-muted);font-size:12px;">' + esc(whenWord(s.replied_at)) + '</div>' : '') + '</td></tr>').join('') + '</table>';
      return '<div class="card" style="padding:14px 16px;margin:0 0 10px;"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;cursor:pointer;" onclick="CCEmailResults.toggle(\'' + esc(g.k).replace(/'/g, '\\\'') + '\')">'
        + '<div style="flex:1 1 260px;"><div style="font-weight:800;color:var(--navy);">' + esc(g.subj) + '</div><div style="font-size:12px;color:var(--text-muted);">' + esc(dayWord(g.at)) + ' · ' + AUD_WORD[g.aud] + ' · ' + (g.auto ? 'sent by the schedule' : 'sent by hand') + '</div></div>'
        + '<div style="font-size:13px;white-space:nowrap;"><b>' + g.sent + '</b> sent · <b>' + g.opened + '</b> opened · <b>' + g.replied + '</b> wrote back' + (g.problems ? ' · <b style="color:#991B1B;">' + g.problems + '</b> did not arrive' : '') + '</div>'
        + '<div style="font-size:12px;color:var(--text-muted);">' + (open ? 'Hide' : 'Show who') + '</div></div>' + people + '</div>';
    }).join('') : '<div class="card"><div class="empty">' + ((d.sends || []).length ? 'Nothing matches. Clear the search or pick Everyone.' : 'No emails have gone out yet. The first ones will show here the morning they are sent.') + '</div></div>';
    const un = d.unsubscribed || [], off = d.switched_off || [];
    const unHtml = '<h3 style="font-size:16px;color:var(--navy);margin:24px 0 6px;">Unsubscribed (' + un.length + ')</h3><p style="color:var(--text-muted);font-size:13px;margin:0 0 8px;max-width:76ch;">These addresses pressed Unsubscribe in an email. No automatic email goes to them again.</p>'
      + (un.length ? '<div class="card" style="padding:6px 16px;"><table style="width:100%;border-collapse:collapse;font-size:13px;">' + un.map((u) => '<tr><td style="padding:7px 8px;border-bottom:1px solid var(--border);"><b>' + esc(u.org || u.name || u.email) + '</b>' + ((u.org || u.name) ? '<div style="color:var(--text-muted);font-size:12px;">' + esc(u.email) + '</div>' : '') + '</td><td style="padding:7px 8px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-muted);white-space:nowrap;">' + esc(dayWord(u.at)) + '</td></tr>').join('') + '</table></div>'
        : '<div class="card"><div class="empty">Nobody has unsubscribed.</div></div>')
      + (off.length ? '<h3 style="font-size:16px;color:var(--navy);margin:24px 0 6px;">Monthly emails turned off in the Hub (' + off.length + ')</h3><p style="color:var(--text-muted);font-size:13px;margin:0 0 8px;">Leads the office took off the monthly email with the button on their profile.</p><div class="card" style="padding:6px 16px;"><table style="width:100%;border-collapse:collapse;font-size:13px;">' + off.map((u) => '<tr><td style="padding:7px 8px;border-bottom:1px solid var(--border);"><b>' + esc(u.name || u.email) + '</b><div style="color:var(--text-muted);font-size:12px;">' + esc(u.email) + '</div></td><td style="padding:7px 8px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-muted);white-space:nowrap;">' + esc(u.at ? dayWord(u.at) : '') + '</td></tr>').join('') + '</table></div>' : '');
    const foot = '<p style="color:var(--text-muted);font-size:12px;margin:18px 0 0;max-width:80ch;">About "Opened": an email shows as opened when the person\'s email program loads its pictures. Some programs never do, so a person can read an email that still says "Sent, not opened yet". Goes back 120 days.' + (d.at ? ' Last read ' + esc(whenWord(d.at)) + '.' : '') + '</p>';
    return head + tiles + note + pills + list + unHtml + foot;
  }
  function render() {
    if (typeof document === 'undefined') return;
    const box = document.getElementById('emailResults'); if (!box) return;
    const q = document.getElementById('erQ'); const focus = q && document.activeElement === q; const pos = focus ? q.selectionStart : 0;
    box.innerHTML = html(VIEW, Date.now());
    if (focus) { const n = document.getElementById('erQ'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }
  }
  function endpoint() { return (typeof CAMPAIGN_ENDPOINT !== 'undefined' ? String(CAMPAIGN_ENDPOINT).replace(/campaign-send$/, 'email-results') : ''); }
  async function load(refresh) {
    if (VIEW.loading) return;
    VIEW.loading = true; VIEW.err = ''; VIEW.notOn = false; VIEW.askedAt = Date.now(); render();
    try {
      const url = endpoint(); if (!url || typeof cmpAuthHeaders !== 'function') throw new Error('the Hub is still loading.');
      const res = await fetch(url, { method: 'POST', headers: await cmpAuthHeaders(), body: JSON.stringify({ refresh: refresh !== false }) });
      if (res.status === 404) { VIEW.notOn = true; }
      else { const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.ok) throw new Error((j && j.error) || ('the server answered ' + res.status + '.'));
        VIEW.data = j; }
    } catch (e) { VIEW.err = String((e && e.message) || e); }
    VIEW.loading = false; render();
  }
  /* The Hub redraws the open tab whenever anything is saved anywhere. Redraw from what we have, and ask the server again
     only when the screen was just opened or what we have is more than five minutes old (Check again asks at once). */
  function show() { render(); if (!VIEW.loading && (!VIEW.askedAt || Date.now() - VIEW.askedAt > 300000)) load(true); }
  function setAud(a) { VIEW.aud = a; render(); }
  function setQ(q) { VIEW.q = q; render(); }
  function toggle(k) { VIEW.open[k] = !VIEW.open[k]; render(); }
  return { AUDS, audOf, statusOf, filter, groups, counts, totals, html, VIEW, render, load, show, setAud, setQ, toggle };
});
