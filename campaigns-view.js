/* =============================================================================
   campaigns-view.js · THE CAMPAIGNS (Referrals & Marketing > Campaigns, first view)
   =============================================================================
   Samantha, 2026-11-14: "make it very clear in the hub what the campain is and who is in it or has been in it and the
   results".
   One card per campaign that runs by itself: the partner series, the monthly email to open leads, and the caregiver
   holiday notes. Each card answers four questions in the same order:
     1. What is it?            what goes out, to whom, how often, and whether it is on
     2. The emails             each email in order, when it went, to how many, and what happened
     3. Who is in it now       every organization or person, what they have received, what comes next
     4. No longer in it        anyone who received an email and is not in it any more, and why
   It only READS what the Hub already keeps (the partner list, the leads, the caregiver roster, the send log, the
   settings) and what email-results returns (who got each email, opened, wrote back, unsubscribed). It saves nothing
   and sends nothing. A number it cannot know is left out, never guessed.
   ============================================================================= */
(function (root, factory) {
  const R = (typeof module === 'object' && module.exports) ? require('./email-results.js') : root.CCEmailResults;
  const api = factory(R);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.CCCampaigns = api;
})(typeof self !== 'undefined' ? self : this, function (R) {
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const lc = (v) => String(v == null ? '' : v).trim().toLowerCase();
  const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const dayWord = (d) => { try { return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); } catch (e) { return ''; } };
  const dayOf = (n) => { n = Number(n); return (n >= 1 && n <= 28) ? n : 10; };
  const sameMonth = (iso, now) => { const d = new Date(iso); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); };
  /* The sender works on weekdays only: a day that lands on a weekend moves to Monday. */
  function weekdayOnOrAfter(d) { const x = new Date(d); while (x.getDay() === 0 || x.getDay() === 6) x.setDate(x.getDate() + 1); return x; }
  /* When the next run of a "first weekday on or after the Nth" campaign is. stillOwed = somebody has not had this month's. */
  function nextRun(now, day, stillOwed) {
    const first = weekdayOnOrAfter(new Date(now.getFullYear(), now.getMonth(), day, 9));
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9);
    if (today < first) return first;
    if (stillOwed) return weekdayOnOrAfter(now.getHours() < 9 ? today : new Date(today.getTime() + 86400000));
    return weekdayOnOrAfter(new Date(now.getFullYear(), now.getMonth() + 1, day, 9));
  }
  const RANK = { replied: 5, opened: 4, problem: 3, sent: 2, waiting: 1, unknown: 0 };
  const best = (rows) => rows.map((s) => R.statusOf(s)).sort((a, b) => RANK[b.k] - RANK[a.k])[0] || null;
  const unsubSet = (res) => new Set(((res && res.unsubscribed) || []).map((u) => lc(u.email)));

  /* ---- 1. the partner series ------------------------------------------------------------------------------------ */
  function partner(I) {
    const cfg = I.cfg || {}, now = I.now || new Date(), res = I.res;
    const emails = (I.lib || []).filter((e) => e && e.aud === 'referrers' && e.series).sort((a, b) => a.series - b.series);
    const nOf = new Map(emails.map((e) => [e.key, e.series])); const N = emails.length;
    const orgs = I.orgs || []; const byId = new Map(orgs.map((o) => [String(o.id), o]));
    const addrs = (o) => [...new Set([o.email].concat((o.contacts || []).filter((c) => c && !c.archived).map((c) => c.email)).map(lc).filter((x) => x.includes('@')))];
    const out = unsubSet(res);
    /* who got which email: the partner history (always there) and the recorded sends (once email-results has answered) */
    const got = new Map();   // org id -> Map(series n -> {at, tos:Set})
    const note = (orgId, key, to, at) => { const n = nOf.get(key); if (!n || !orgId) return; const id = String(orgId);
      if (!got.has(id)) got.set(id, new Map()); const g = got.get(id);
      if (!g.has(n)) g.set(n, { at, tos: new Set() }); const x = g.get(n); if (to) x.tos.add(lc(to)); if (String(at) < String(x.at)) x.at = at; };
    for (const a of I.acts || []) if (a && a.kind === 'email' && a.auto && nOf.has(a.email_key)) note(a.org_id, a.email_key, a.to, a.at);
    const sends = ((res && res.sends) || []).filter((s) => R.audOf(s) === 'partners' && nOf.has(s.key) && s.auto);
    const orgOfAddr = new Map(); for (const o of orgs) for (const a of addrs(o)) if (!orgOfAddr.has(a)) orgOfAddr.set(a, String(o.id));
    for (const s of sends) note(s.org_id || orgOfAddr.get(lc(s.to)), s.key, s.to, s.at);
    const rowsFor = (o, n) => sends.filter((s) => nOf.get(s.key) === n && addrs(o).includes(lc(s.to)));
    const onList = orgs.filter((o) => o && o.program_track === 'email_list' && !o.archived);
    const members = onList.filter((o) => addrs(o).length).map((o) => {
      const g = got.get(String(o.id)) || new Map(); const had = [...g.keys()].sort((a, b) => a - b);
      const last = had.length ? had[had.length - 1] : 0; let next = 0; for (let n = 1; n <= N; n++) if (!g.has(n)) { next = n; break; }
      const a = addrs(o), gone = a.filter((x) => out.has(x));
      const st = last ? best(rowsFor(o, last)) : null;
      return { id: String(o.id), name: o.name || '(no name)', type: o.type || '', addresses: a.length, had, last, lastAt: last ? g.get(last).at : '', next,
        owedThisMonth: !!next && !had.some((n) => sameMonth(g.get(n).at, now)),
        status: gone.length === a.length ? { k: 'out', word: 'Unsubscribed', tone: 'bad' } : st, someOut: gone.length && gone.length < a.length ? gone.length : 0 };
    }).sort((x, y) => x.name.localeCompare(y.name));
    const inIt = members.filter((m) => !(m.status && m.status.k === 'out'));
    const noEmail = onList.filter((o) => !addrs(o).length).map((o) => o.name || '(no name)').sort();
    const memberIds = new Set(inIt.map((m) => m.id));
    const left = [...got.keys()].filter((id) => !memberIds.has(id)).map((id) => { const o = byId.get(id), g = got.get(id), had = [...g.keys()].sort((a, b) => a - b);
      const why = !o ? 'no longer in the Hub' : o.archived ? 'archived' : o.program_track !== 'email_list' ? 'now a full partner, with an owner and visits' : !addrs(o).length ? 'no email address any more' : 'unsubscribed';
      return { name: o ? (o.name || '(no name)') : '(removed organization)', had, lastAt: g.get(had[had.length - 1]).at, why }; }).sort((x, y) => x.name.localeCompare(y.name));
    const on = !!cfg.enabled && !!cfg.auto_partner_series; const day = dayOf(cfg.partner_series_day);
    const owed = inIt.some((m) => m.owedThisMonth);
    return { id: 'partner', name: 'Partner series', on,
      what: 'Six emails that show referral partners why Caring Companions is the home care agency to send families to. Each organization on the Referral Partners email list gets one a month, in order, starting with email 1.',
      who: 'Organizations on the Referral Partners email list (they get emails and no visits). Add or remove one under Referral Partners.',
      when: on ? (inIt.some((m) => m.next) ? 'Next send: ' + dayWord(nextRun(now, day, owed)) + ', about 9 AM. One a month, on the first weekday on or after the ' + day + 'th.' : (inIt.length ? 'Everyone on the list has had all ' + N + ' emails.' : 'Nobody is on the email list yet, so nothing goes out.')) : 'Switched off. Nothing is being sent.',
      emails: emails.map((e) => { const rows = sends.filter((s) => s.key === e.key); const tos = new Set(); for (const g of got.values()) { const x = g.get(e.series); if (x) for (const t of x.tos) tos.add(t); }
        const dates = [...got.values()].map((g) => g.get(e.series)).filter(Boolean).map((x) => x.at).sort();
        return { n: e.series, key: e.key, subj: e.subj, to: Math.max(tos.size, rows.length), first: dates[0] || '', counts: rows.length ? R.counts(rows) : null, upNext: inIt.filter((m) => m.next === e.series).length }; }),
      members: inIt, left,
      noEmail, total: N };
  }

  /* ---- 2. the monthly email to open leads ------------------------------------------------------------------------ */
  function leads(I) {
    const cfg = I.cfg || {}, now = I.now || new Date(), res = I.res, lib = I.lib || [];
    const plan = (cfg.monthly_plan && typeof cfg.monthly_plan === 'object') ? cfg.monthly_plan : {};
    const out = unsubSet(res); const all = (I.leads || []).filter((l) => l && lc(l.email).includes('@'));
    const nameOf = (l) => (((l.first_name || '') + ' ' + (l.last_name || '')).trim()) || l.email;
    const inDrip = (l) => !!l.nurture_started_at && !l.nurture_stopped_at;
    const open = (l) => l.status !== 'Converted' && l.status !== 'Lost';
    const whyNot = (l) => !open(l) ? (l.status === 'Converted' ? 'became a client' : 'marked lost')
      : l.do_not_contact ? 'marked do not contact' : l.monthly_emails === false ? 'Monthly emails turned off on their profile'
      : out.has(lc(l.email)) ? 'unsubscribed' : inDrip(l) ? 'still getting their welcome emails; they join when those finish' : '';
    const sends = ((res && res.sends) || []).filter((s) => R.audOf(s) === 'leads' && s.auto);
    const rowsOf = (email) => sends.filter((s) => lc(s.to) === lc(email)).sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const seen = new Set();
    const members = all.filter((l) => !whyNot(l) && !seen.has(lc(l.email)) && seen.add(lc(l.email))).map((l) => { const rows = rowsOf(l.email), last = rows[rows.length - 1];
      return { name: nameOf(l), email: lc(l.email), had: rows.length, lastSubj: last ? last.subj : '', lastAt: last ? last.at : '', status: last ? R.statusOf(last) : null }; }).sort((a, b) => a.name.localeCompare(b.name));
    const waiting = all.filter((l) => open(l) && !l.do_not_contact && l.monthly_emails !== false && !out.has(lc(l.email)) && inDrip(l)).map((l) => ({ name: nameOf(l), why: whyNot(l) }));
    const memberSet = new Set(members.map((m) => m.email)); const byEmail = new Map(all.map((l) => [lc(l.email), l]));
    const gotBefore = [...new Set(sends.map((s) => lc(s.to)))].filter((e) => !memberSet.has(e));
    const left = gotBefore.map((e) => { const l = byEmail.get(e), rows = rowsOf(e); return { name: l ? nameOf(l) : e, had: rows.length, lastAt: rows[rows.length - 1].at, why: l ? (whyNot(l) || 'no longer an open lead') : (out.has(e) ? 'unsubscribed' : 'no longer a lead in the Hub') }; })
      .concat(all.filter((l) => l.monthly_emails === false && open(l) && !gotBefore.includes(lc(l.email))).map((l) => ({ name: nameOf(l), had: 0, lastAt: '', why: 'Monthly emails turned off on their profile' })))
      .sort((a, b) => a.name.localeCompare(b.name));
    const yr = String(now.getFullYear()); const log = (I.log || []).filter((x) => x && (x.sent || 0) > 0 && String(x.at || '').slice(0, 4) === yr && /monthly/i.test(String(x.source || '')));
    const on = !!cfg.enabled && !!cfg.auto_monthly_leads; const day = dayOf(cfg.monthly_day);
    let nextM = -1; for (let o = 0; o < 12 && nextM < 0; o++) { const m = (now.getMonth() + o) % 12, k = String(m + 1).padStart(2, '0');
      if (!plan[k]) continue; if (o === 0 && log.some((x) => x.key === plan[k])) continue; nextM = m; }
    const nextDate = nextM < 0 ? null : (nextM === now.getMonth() ? nextRun(now, day, true) : weekdayOnOrAfter(new Date(now.getFullYear() + (nextM < now.getMonth() ? 1 : 0), nextM, day, 9)));
    const emails = MON.map((name, m) => { const k = String(m + 1).padStart(2, '0'), key = plan[k], e = key ? lib.find((x) => x.key === key) : null, l = key ? log.filter((x) => x.key === key).sort((a, b) => String(b.at).localeCompare(String(a.at)))[0] : null;
      const rows = key ? sends.filter((s) => s.key === key && String(s.at).slice(0, 4) === yr) : [];
      return { month: name, key: key || '', subj: e ? e.subj : (key ? '(email ' + key + ' is not in the library)' : ''), sentAt: l ? l.at : '', to: l ? l.sent : 0, counts: rows.length ? R.counts(rows) : null, next: m === nextM }; });
    return { id: 'leads', name: 'Monthly email to open leads', on,
      what: 'One helpful email a month to families who asked about care and have not started. It keeps Caring Companions in front of them until they are ready.',
      who: 'Every open lead in the Hub with an email address. A lead still getting welcome emails joins when those finish. Take one person off with the Monthly emails button on their lead profile.',
      when: on ? (nextDate ? 'Next send: ' + dayWord(nextDate) + ', about 9 AM (' + MON[nextM] + '\'s email). One a month, on the first weekday on or after the ' + day + 'th.' : 'No month has an email planned.') : 'Switched off. Nothing is being sent.',
      emails, members, waiting, left, empty: emails.filter((x) => !x.key).map((x) => x.month) };
  }

  /* ---- 3. the caregiver holiday notes ----------------------------------------------------------------------------- */
  function caregivers(I) {
    const cfg = I.cfg || {}, now = I.now || new Date(), res = I.res, yr = String(now.getFullYear());
    const lib = (I.lib || []).filter((e) => e && e.aud === 'caregivers');
    const sends = ((res && res.sends) || []).filter((s) => R.audOf(s) === 'caregivers');
    const log = (I.log || []).filter((x) => x && (x.sent || 0) > 0 && String(x.at || '').slice(0, 4) === yr && /caregiver/i.test(String(x.source || '')));
    const seen = new Set();
    const members = (I.caregivers || []).filter((c) => c && c.active !== false && c.axiscare_status_active !== false && lc(c.email).includes('@') && !seen.has(lc(c.email)) && seen.add(lc(c.email)))
      .map((c) => { const rows = sends.filter((s) => lc(s.to) === lc(c.email)).sort((a, b) => String(a.at).localeCompare(String(b.at))), last = rows[rows.length - 1];
        return { name: String(c.name || ((c.first || c.first_name || '') + ' ' + (c.last || c.last_name || ''))).trim() || c.email, email: lc(c.email), had: rows.length, lastSubj: last ? last.subj : '', lastAt: last ? last.at : '', status: last ? R.statusOf(last) : null }; })
      .sort((a, b) => a.name.localeCompare(b.name));
    const on = !!cfg.enabled && !!cfg.aud_caregivers;
    return { id: 'caregivers', name: 'Caregiver holiday notes', on,
      what: 'Five short thank-you notes to the team through the year: New Year, February, the 4th of July, Thanksgiving and the December holidays.',
      who: 'Every active caregiver on the Hub\'s roster with an email address.',
      when: on ? 'Each note goes once a year, in its own week.' : 'Switched off. Nothing is being sent.',
      emails: lib.map((e) => { const l = log.filter((x) => x.key === e.key).sort((a, b) => String(b.at).localeCompare(String(a.at)))[0]; const rows = sends.filter((s) => s.key === e.key && String(s.at).slice(0, 4) === yr);
        return { when: e.when || '', key: e.key, subj: e.subj, sentAt: l ? l.at : '', to: l ? l.sent : 0, counts: rows.length ? R.counts(rows) : null }; }),
      members, left: [], noEmail: (I.caregivers || []).filter((c) => c && c.active !== false && c.axiscare_status_active !== false && !lc(c.email).includes('@')).length };
  }
  function model(I) { return [partner(I), leads(I), caregivers(I)]; }

  /* ---- drawing ------------------------------------------------------------------------------------------------------ */
  const TONE = { good: 'background:#DCFCE7;color:#166534;', bad: 'background:#FEE2E2;color:#991B1B;', plain: 'background:#EEF2F7;color:#334155;', muted: 'background:#F5F5F4;color:#78716C;' };
  const chip = (st) => st ? '<span style="display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap;' + TONE[st.tone] + '">' + esc(st.word) + '</span>' : '';
  const td = 'padding:7px 8px;border-top:1px solid var(--border);vertical-align:top;';
  const th = 'padding:6px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted);';
  const results = (c) => !c ? '' : '<b>' + c.opened + '</b> opened' + (c.known < c.sent ? ' of ' + c.known + ' checked' : '') + ' · <b>' + c.replied + '</b> wrote back' + (c.problems ? ' · <b style="color:#991B1B;">' + c.problems + '</b> did not arrive' : '');
  const fold = (id, key, title, n, body, open) => '<div style="border-top:1px solid var(--border);margin-top:12px;padding-top:10px;">'
    + '<div style="display:flex;align-items:center;gap:10px;cursor:pointer;" data-fold="' + id + ':' + key + '" onclick="CCCampaigns.toggle(\'' + id + ':' + key + '\')"><div style="font-weight:800;color:var(--navy);font-size:14px;flex:1;">' + title + (n == null ? '' : ' (' + n + ')') + '</div>'
    + '<div style="font-size:12px;color:var(--text-muted);">' + (open ? 'Hide' : 'Show') + '</div></div>' + (open ? '<div style="margin-top:8px;">' + body + '</div>' : '') + '</div>';
  /* 2026-11-14 (her "can we also preview the look of the email?"): every email row has a Preview button. It opens the email
     exactly as it arrives (photo, headline, button); Back returns to this campaign. */
  const preview = (key) => key ? '<button type="button" class="secondary" data-preview="' + esc(key) + '" onclick="openCampaign(\'' + esc(key) + '\')" style="padding:4px 12px;font-size:12.5px;white-space:nowrap;">Preview</button>' : '';
  const hadWords = (had, total) => !had.length ? 'Nothing yet' : 'Email' + (had.length > 1 ? 's ' : ' ') + had.join(', ') + ' of ' + total;

  function card(c, v, hasRes) {
    const open = (k, dflt) => (v.open[c.id + ':' + k] === undefined ? !!dflt : !!v.open[c.id + ':' + k]);
    const head = '<div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;"><div style="flex:1 1 320px;"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><div style="font-size:18px;font-weight:800;color:var(--navy);">' + esc(c.name) + '</div>'
      + '<span style="padding:3px 11px;border-radius:999px;font-size:12px;font-weight:800;' + (c.on ? 'background:#DCFCE7;color:#166534;' : 'background:#F5F5F4;color:#78716C;') + '">' + (c.on ? 'ON' : 'OFF') + '</span></div>'
      + '<div style="font-size:14px;margin-top:6px;max-width:80ch;">' + esc(c.what) + '</div>'
      + '<div style="font-size:13px;color:var(--text-muted);margin-top:6px;max-width:80ch;"><b>Who gets it:</b> ' + esc(c.who) + '</div>'
      + '<div style="font-size:13px;margin-top:6px;font-weight:700;color:' + (c.on ? '#166534' : 'var(--text-muted)') + ';">' + esc(c.when) + '</div></div>'
      + '<div style="display:flex;gap:8px;">' + [['In it now', c.members.length], ['No longer in it', c.left.length]].map((t) => '<div style="min-width:104px;background:var(--bg,#FAF8F3);border:1px solid var(--border);border-radius:10px;padding:9px 12px;text-align:center;"><div style="font-size:22px;font-weight:800;color:var(--navy);">' + t[1] + '</div><div style="font-size:12px;color:var(--text-muted);">' + t[0] + '</div></div>').join('') + '</div></div>';
    let emails;
    if (c.id === 'partner') emails = '<table style="width:100%;border-collapse:collapse;font-size:13px;"><tr><th style="' + th + '">Email</th><th style="' + th + '">Sent</th><th style="' + th + '">What happened</th><th style="' + th + '"></th></tr>' + c.emails.map((e) =>
      '<tr><td style="' + td + '"><b>' + e.n + '.</b> <a href="#" onclick="openCampaign(\'' + esc(e.key) + '\');return false;" style="color:var(--navy);font-weight:700;">' + esc(e.subj) + '</a></td>'
      + '<td style="' + td + 'white-space:nowrap;">' + (e.to ? 'To ' + e.to + (e.first ? ', first on ' + esc(dayWord(e.first)) : '') : '<span style="color:var(--text-muted);">Not sent yet</span>') + (e.upNext ? '<div style="color:#B45309;font-size:12px;">Next for ' + e.upNext + '</div>' : '') + '</td>'
      + '<td style="' + td + '">' + (e.counts ? results(e.counts) : (e.to ? '<span style="color:var(--text-muted);">' + (hasRes ? 'Not checked yet' : 'Reading results…') + '</span>' : '')) + '</td><td style="' + td + 'text-align:right;">' + preview(e.key) + '</td></tr>').join('') + '</table>';
    else emails = '<table style="width:100%;border-collapse:collapse;font-size:13px;"><tr><th style="' + th + '">' + (c.id === 'leads' ? 'Month' : 'When') + '</th><th style="' + th + '">Email</th><th style="' + th + '">Sent this year</th><th style="' + th + '">What happened</th><th style="' + th + '"></th></tr>' + c.emails.map((e) =>
      '<tr><td style="' + td + 'white-space:nowrap;">' + esc(e.month || e.when) + '</td><td style="' + td + '">' + (e.key ? '<a href="#" onclick="openCampaign(\'' + esc(e.key) + '\');return false;" style="color:var(--navy);font-weight:700;">' + esc(e.subj) + '</a>' : '<span style="color:#B45309;">No email planned. Nothing goes this month.</span>') + (e.next ? ' <span style="color:#B45309;font-size:12px;font-weight:700;">Next</span>' : '') + '</td>'
      + '<td style="' + td + 'white-space:nowrap;">' + (e.sentAt ? esc(dayWord(e.sentAt)) + ', to ' + e.to : (e.key ? '<span style="color:var(--text-muted);">Not yet</span>' : '')) + '</td>'
      + '<td style="' + td + '">' + (e.counts ? results(e.counts) : (e.sentAt ? '<span style="color:var(--text-muted);">Sent before people were recorded</span>' : '')) + '</td><td style="' + td + 'text-align:right;">' + preview(e.key) + '</td></tr>').join('') + '</table>';
    let people;
    if (!c.members.length) people = '<div class="empty">Nobody is in this campaign right now.</div>';
    else if (c.id === 'partner') people = '<table style="width:100%;border-collapse:collapse;font-size:13px;"><tr><th style="' + th + '">Organization</th><th style="' + th + '">Has received</th><th style="' + th + '">Next</th><th style="' + th + '">Last email</th></tr>' + c.members.map((m) =>
      '<tr><td style="' + td + '"><b>' + esc(m.name) + '</b><div style="color:var(--text-muted);font-size:12px;">' + esc(m.type) + (m.type ? ' · ' : '') + m.addresses + ' email address' + (m.addresses === 1 ? '' : 'es') + (m.someOut ? ' · ' + m.someOut + ' unsubscribed' : '') + '</div></td>'
      + '<td style="' + td + '">' + hadWords(m.had, c.total) + (m.lastAt ? '<div style="color:var(--text-muted);font-size:12px;">last on ' + esc(dayWord(m.lastAt)) + '</div>' : '') + '</td>'
      + '<td style="' + td + '">' + (m.next ? 'Email ' + m.next : 'Finished') + '</td><td style="' + td + '">' + (chip(m.status) || '') + '</td></tr>').join('') + '</table>';
    else people = '<table style="width:100%;border-collapse:collapse;font-size:13px;"><tr><th style="' + th + '">' + (c.id === 'leads' ? 'Lead' : 'Caregiver') + '</th><th style="' + th + '">Has received</th><th style="' + th + '">Last email</th></tr>' + c.members.map((m) =>
      '<tr><td style="' + td + '"><b>' + esc(m.name) + '</b><div style="color:var(--text-muted);font-size:12px;">' + esc(m.email) + '</div></td>'
      + '<td style="' + td + '">' + (m.had ? m.had + ' email' + (m.had === 1 ? '' : 's') : 'Nothing yet') + (m.lastAt ? '<div style="color:var(--text-muted);font-size:12px;">last: ' + esc(m.lastSubj) + ', ' + esc(dayWord(m.lastAt)) + '</div>' : '') + '</td>'
      + '<td style="' + td + '">' + (chip(m.status) || '') + '</td></tr>').join('') + '</table>';
    const extra = (c.noEmail && c.noEmail.length ? '<div style="font-size:13px;color:#B45309;margin-top:8px;"><b>On the list but with no email address, so they get nothing:</b> ' + esc(c.noEmail.join(', ')) + '</div>' : '')
      + (typeof c.noEmail === 'number' && c.noEmail ? '<div style="font-size:13px;color:#B45309;margin-top:8px;">' + c.noEmail + ' active caregiver' + (c.noEmail === 1 ? ' has' : 's have') + ' no email address on the roster, so they get nothing.</div>' : '')
      + (c.waiting && c.waiting.length ? '<div style="font-size:13px;color:var(--text-muted);margin-top:8px;"><b>Not in it yet (' + c.waiting.length + '):</b> ' + esc(c.waiting.map((w) => w.name).join(', ')) + '. They are still getting their welcome emails and join when those finish.</div>' : '')
      + (c.empty && c.empty.length ? '<div style="font-size:13px;color:#B45309;margin-top:8px;"><b>No email is planned for:</b> ' + esc(c.empty.join(', ')) + '.</div>' : '');
    const left = !c.left.length ? '<div class="empty">Nobody has left this campaign.</div>' : '<table style="width:100%;border-collapse:collapse;font-size:13px;"><tr><th style="' + th + '">Who</th><th style="' + th + '">Had received</th><th style="' + th + '">Why they are not in it now</th></tr>' + c.left.map((m) =>
      '<tr><td style="' + td + '"><b>' + esc(m.name) + '</b></td><td style="' + td + '">' + (Array.isArray(m.had) ? hadWords(m.had, c.total) : (m.had ? m.had + ' email' + (m.had === 1 ? '' : 's') : 'Nothing')) + (m.lastAt ? '<div style="color:var(--text-muted);font-size:12px;">last on ' + esc(dayWord(m.lastAt)) + '</div>' : '') + '</td><td style="' + td + '">' + esc(m.why) + '</td></tr>').join('') + '</table>';
    return '<div class="card" data-campaign="' + c.id + '" style="padding:18px 20px;margin:0 0 16px;' + (c.on ? 'border-left:5px solid #14606F;' : '') + '">' + head
      + fold(c.id, 'emails', 'The emails and the results', null, emails + extraLine(c), open('emails', true))
      + fold(c.id, 'people', 'Who is in it now', c.members.length, people + extra, open('people', true))
      + fold(c.id, 'left', 'No longer in it', c.left.length, left, open('left', false)) + '</div>';
  }
  const extraLine = (c) => c.id === 'leads' && c.empty && c.empty.length ? '<div style="font-size:12.5px;color:var(--text-muted);margin-top:8px;">A month with no email planned sends nothing. The plan is changed by a step, not on this screen.</div>' : '';

  /* 2026-11-14 (her "make another subtab under it with the different campaigns so i dont have to scroll"): one campaign
     on the page at a time, picked from a row of buttons. */
  const VIEW = { open: {}, pick: 'partner' };
  function html(I, v) {
    const res = I.res, cards = model(I);
    const note = !res ? '<div style="font-size:13px;color:var(--text-muted);margin:0 0 12px;">' + (I.resError ? 'Who opened and who wrote back could not be read just now (' + esc(I.resError) + '). Everything else below is current.' : 'Reading who opened and who wrote back…') + '</div>'
      : (res.still_to_check ? '<div style="font-size:13px;color:#B45309;margin:0 0 12px;">' + res.still_to_check + ' emails are still to be checked for opens. Open Results and press Check again to do the next batch.</div>' : '');
    const vv = v || VIEW; const tabs = cards.map((c) => [c.id, c.name, c.on, c.members.length]).concat([['clients', 'Clients and families', null, null]]);
    const pick = tabs.some((t) => t[0] === vv.pick) ? vv.pick : 'partner';
    const picker = '<div id="cmpPick" style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px;">' + tabs.map((t) => '<button type="button" data-pick="' + t[0] + '" onclick="CCCampaigns.pick(\'' + t[0] + '\')" style="padding:9px 14px;border-radius:10px;border:1px solid ' + (pick === t[0] ? 'var(--navy)' : 'var(--border)') + ';background:' + (pick === t[0] ? 'var(--navy)' : 'var(--card)') + ';color:' + (pick === t[0] ? '#fff' : 'inherit') + ';font-weight:700;font-size:13.5px;cursor:pointer;text-align:left;">'
      + esc(t[1]) + (t[2] === null ? '<div style="font-size:11.5px;font-weight:600;opacity:.8;">by hand only</div>' : '<div style="font-size:11.5px;font-weight:600;opacity:.8;">' + (t[2] ? 'ON' : 'OFF') + ' · ' + t[3] + ' in it</div>') + '</button>').join('') + '</div>';
    const clients = '<div class="card" data-campaign="clients" style="padding:18px 20px;"><div style="font-size:18px;font-weight:800;color:var(--navy);">Clients and their families</div><div style="font-size:14px;margin-top:6px;max-width:80ch;">No campaign. Nothing goes to clients or families by itself.</div><div style="font-size:13px;color:var(--text-muted);margin-top:6px;max-width:80ch;">The holiday and program notes in the Email library are sent by hand, by a person, one at a time. What was sent shows under All results.</div></div>';
    const shown = pick === 'clients' ? clients : card(cards.find((c) => c.id === pick), vv, !!res);
    return '<p style="color:var(--text-muted);font-size:14px;margin:0 0 12px;max-width:80ch;">The emails that go out by themselves. Pick one to see what it is, each email and what happened to it, who is in it now, and who has left. Nothing on this page sends or changes anything.</p>'
      + picker + note + shown
      + '<p style="color:var(--text-muted);font-size:12px;margin:14px 0 0;max-width:80ch;">"Opened" shows when the person\'s email program loads the pictures; some never do, so an opened email can still read "Sent, not opened yet". Each campaign is turned on and off by a step you run.</p>';
  }
  function inputs() {
    const D = (typeof DATA !== 'undefined' && DATA) || {}; const RV = (R && R.VIEW) || {};
    return { now: new Date(), cfg: (typeof cmpSettings === 'function') ? cmpSettings() : {}, lib: (typeof cmpLib === 'function') ? cmpLib() : [],
      orgs: D.referral_orgs || [], acts: D.referral_activities || [], leads: D.leads || [], caregivers: D.caregivers || ((typeof caregivers !== 'undefined' && caregivers) || []),
      log: D.campaign_log || [], res: RV.data || null, resError: RV.notOn ? 'the results reader is not installed' : (RV.err || '') };
  }
  function render() { if (typeof document === 'undefined') return; const box = document.getElementById('cmpCampaigns'); if (box) box.innerHTML = html(inputs(), VIEW); }
  /* Draw at once from what the Hub has; ask for opens and replies (at most every five minutes) and draw again when they come. */
  function show() { render(); if (R && R.VIEW && !R.VIEW.loading && (!R.VIEW.askedAt || Date.now() - R.VIEW.askedAt > 300000)) R.load(true).then(render, render); }
  function toggle(k) { const cur = VIEW.open[k]; const dflt = /:(emails|people)$/.test(k); VIEW.open[k] = !(cur === undefined ? dflt : cur); render(); }
  function pick(id) { VIEW.pick = id; render(); if (typeof window !== 'undefined' && window.scrollTo) { const b = document.getElementById('cmpPick'); if (b && b.getBoundingClientRect().top < 0) b.scrollIntoView(); } }
  return { partner, leads, caregivers, model, html, nextRun, weekdayOnOrAfter, VIEW, render, show, toggle, pick };
});
