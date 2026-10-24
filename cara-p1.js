/* =============================================================================
   cara-p1.js · CARA PHASE 1 in the Hub (Samantha, 2026-10-23: "proceed with your recommended Phase 1").
   One place for the office to see, at a glance:
     Needs you now · Waiting for your OK (Cara recommends) · Cara is working on · Replies · Clients at risk
   plus "Send Cara's list" (one tap, her decision 1: the office approves every send in Phase 1), the better list's flags
   on the picker (Unknown availability, weekly hours / overtime, overlapping yeses, the skills rules), the shift Cara
   found for a texted or phoned call-off, and the words "said yes" vs "assigned" (a yes is interest; only AxisCare's
   read-back is an assignment).
   Switch: ops_settings.cara_today_live (owners turn it on). Off, the page is exactly as before; an owner can look at
   the new Today with "Preview" (kept only in that browser). Nothing here assigns anyone: Confirm uses covResolve,
   the one existing confirm path (AxisCare write + read-back).
   ============================================================================= */
(function () {
  'use strict';
  const E = (s) => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s));
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} } };
  const settings = () => (typeof DATA !== 'undefined' && DATA.ops_settings) || {};
  const owner = () => { try { return typeof ccCan === 'function' && ccCan('manage_settings'); } catch (e) { return false; } };
  const preview = () => ls.get('cara_p1_preview') === '1';
  const on = () => settings().cara_today_live === true || preview();
  const listOn = () => settings().cara_list_live === true;
  const first = (n) => String(n || '').trim().split(/\s+/)[0] || '';
  const ago = (iso) => (typeof covAgo === 'function' ? covAgo(iso) : '');

  /* urgency: the server's stamp when there is one (it knows the call-in plan), else the same rule read here */
  function urgency(c) {
    if (c && c.urgency && c.urgency.level) return c.urgency;
    if (!c || String(c.kind) === 'interest' || c.reason === 'open' || (c.shift_pattern && c.shift_pattern.kind === 'open_ongoing')) return { level: 'planning', why: 'a regular opening' };
    const ms = typeof covShiftMs === 'function' ? covShiftMs(c) : Infinity;
    if (!isFinite(ms)) return { level: 'unknown', why: 'no date and time yet' };
    const m = Math.round((ms - Date.now()) / 60000);
    if (m < -60) return { level: 'past', why: 'started over an hour ago' };
    if (m <= 180) return { level: 'critical', why: m >= 0 ? 'starts in ' + (m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + 'm') : 'started ' + (-m) + 'm ago' };
    if (m <= 1440) return { level: 'today', why: 'within 24 hours' };
    return { level: 'coming_up', why: 'starts in ' + Math.round(m / 1440) + ' day' + (Math.round(m / 1440) === 1 ? '' : 's') };
  }
  const U_LOOK = { critical: ['Critical', '#fff', 'var(--red)'], today: ['Today', '#8A4E0C', '#FFF4E3'], coming_up: ['Coming up', 'var(--navy)', 'var(--slate-bg)'], planning: ['Regular opening', 'var(--navy)', 'var(--slate-bg)'], past: ['Past', 'var(--text-muted)', 'var(--slate-bg)'], unknown: ['No time yet', 'var(--text-muted)', 'var(--slate-bg)'] };
  function chip(c) { const u = urgency(c), l = U_LOOK[u.level] || U_LOOK.unknown;
    return '<span title="' + E(u.why) + '" style="display:inline-block;border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:800;color:' + l[1] + ';background:' + l[2] + ';">' + l[0] + '</span>'; }
  const confirmedCase = (c) => !!(c && (c.covered_by || c.status !== 'open' || (c.axiscare_assignment && ['assigned', 'already'].includes(c.axiscare_assignment.status))));

  /* interest vs assigned: one word for each, everywhere Cara speaks */
  function fillWord(c) {
    const ax = c && c.axiscare_assignment;
    if (ax && (ax.status === 'assigned' || ax.status === 'already') && ax.verified === true) return ['Assigned in AxisCare', 'var(--green)'];
    if (c && c.covered_by) return ['Confirmed, not yet showing in AxisCare', 'var(--amber)'];
    const yes = (c && c.asked || []).filter((a) => a && a.state === 'yes').length;
    if (yes) return [yes + ' said yes (interest, nobody assigned)', 'var(--honey-ink)'];
    return (c && c.asked || []).length ? ['Asking', 'var(--navy)'] : ['Nobody asked yet', 'var(--text-muted)'];
  }

  /* ── Cara recommends ─────────────────────────────────────────────────────── */
  const REC = {};
  async function call(body) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session || !session.access_token) throw new Error('Sign in to the hub first.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/coverage-run', { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const out = await r.json().catch(() => null);
    if (!r.ok || !out || out.error) throw new Error((out && out.error) || ('The engine answered ' + r.status));
    return out;
  }
  const yesKey = (c) => (c.asked || []).filter((a) => a && a.state === 'yes').map((a) => a.id + (a.condition || '')).join(',');
  async function recLoad(id) {
    const c = (DATA.coverage_cases || []).find((x) => x && x.id === id); if (!c) return;
    REC[id] = { loading: true, key: yesKey(c) }; rerender();
    try { REC[id] = { data: await call({ action: 'recommend', case_id: id }), key: yesKey(c), at: Date.now() }; }
    catch (e) { REC[id] = { err: String(e.message || e), key: yesKey(c) }; }
    rerender();
  }
  function recHtml(c) {
    const st = REC[c.id];
    if (!st || st.key !== yesKey(c)) { setTimeout(() => recLoad(c.id), 0); return '<div class="field-note">Cara is comparing the people who said yes…</div>'; }
    if (st.loading) return '<div class="field-note">Cara is comparing the people who said yes…</div>';
    if (st.err) return '<div style="color:var(--red);font-size:12.5px;">' + E(st.err) + ' <a href="javascript:void(0)" onclick="CP1.recLoad(\'' + E(c.id) + '\')">Try again</a></div>';
    const d = st.data, p = d.pick, when = E(typeof caraWhen === 'function' ? caraWhen(c) : '');
    if (!p) return '<div class="field-note">' + E(d.note) + (d.not_eligible && d.not_eligible.length ? ' ' + d.not_eligible.map((x) => E(x.name) + ': ' + E(x.why)).join('; ') : '') + '</div>';
    const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;') + "'";
    return '<div style="font-size:15.5px;font-weight:800;color:var(--navy);">Cara recommends ' + E(p.name) + ' for ' + E(first(c.client)) + "'s " + when + ' shift</div>'
      + (p.reasons.length ? '<div style="margin-top:5px;">' + p.reasons.map((r) => '<div style="font-size:13px;"><span style="color:var(--green);font-weight:800;">&#10003;</span> ' + E(r) + '</div>').join('') + '</div>' : '')
      + (p.concerns.length ? '<div style="margin-top:4px;">' + p.concerns.map((r) => '<div style="font-size:13px;color:#8A4E0C;">&#9888; ' + E(r) + '</div>').join('') + '</div>' : '')
      + (d.others && d.others.length ? '<div class="field-note" style="margin-top:6px;">Also said yes: ' + d.others.map((o) => E(o.name) + (o.concerns.length ? ' (' + E(o.concerns[0]) + ')' : '')).join('; ') + '</div>' : '')
      + (d.not_eligible && d.not_eligible.length ? '<div class="field-note" style="margin-top:3px;">Said yes but can\'t be offered now: ' + d.not_eligible.map((x) => E(x.name) + ' (' + E(x.why) + ')').join('; ') + '</div>' : '')
      + '<div style="margin-top:9px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">'
      + '<button class="addlead" onclick="covResolve(\'' + E(c.id) + '\',\'covered\',' + q(p.name) + ')">Confirm ' + E(first(p.name)) + ' &#10003;</button>'
      + '<button class="ghost" onclick="caraOpenCase(\'' + E(c.id) + '\')">Pick someone else</button>'
      + '<span class="field-note">' + E(d.note) + '</span></div>';
  }

  /* ── Send Cara's list (one tap, the office approves) ───────────────────── */
  /* Cara's picks = the picker's default ticks: the PRN who fit, everyone in Group 1, the top 5 of Group 2; never
     anyone already working then, outside their availability, overlapping another yes, into overtime, or a new hire whose
     profile isn't published, or a lapsed eligibility check (still listed; a person can tick them). */
  function defaultPicks(d) {
    const bad = (x) => x.working_then || x.outside_avail || x.cleared_note || (x.overlaps || []).length || (x.hours && x.hours.level === 'ot') || (typeof cgpgAx === 'function' && (cgpgAx(x.axiscare_id, x.name) || {}).blocked);
    return [...(d.group0 || []), ...(d.group1 || []), ...(d.group2 || []).slice(0, 5)].filter((x) => !bad(x));
  }
  async function sendCaraList(id) {
    const c = (DATA.coverage_cases || []).find((x) => x && x.id === id); if (!c) return;
    let d = c.prebuilt && c.prebuilt_at && (Date.now() - new Date(c.prebuilt_at).getTime()) < 45 * 60000 ? c.prebuilt : null;
    try { if (!d) d = await call({ action: 'candidates', case_id: id }); } catch (e) { alert('Could not build the list: ' + (e.message || e)); return; }
    const picks = defaultPicks(d);
    if (!picks.length) { alert('Cara has nobody to suggest for this shift. Open the case to look at everyone, including who was left out and why.'); return; }
    const hr = new Date().getHours(), late = (hr >= 21 || hr < 8) ? 'It\'s late. Most caregivers are asleep. Send anyway only if this shift truly can\'t wait for morning.\n\n' : '';
    if (!(await ccConfirm(late + 'Send Cara\'s list for ' + (c.client || 'this shift') + '? ' + picks.length + ' caregiver' + (picks.length === 1 ? '' : 's') + ':\n\n' + picks.map((x) => x.name).join(', ') + '\n\nA yes is interest only. Nobody is assigned until you confirm.'))) return;
    try {
      const out = await call({ action: 'send_selected', case_id: id, recipients: picks.map((x) => x.name) });
      if ((out.sent || []).length && typeof opEvent === 'function') opEvent('wave_sent', { item_id: id, area: 'coverage', summary: ccActor().name + ' sent Cara\'s list (' + out.sent.length + ') for ' + (c.client || 'a shift') + ': ' + out.sent.join(', ') });
      let msg = 'Sent to ' + (out.sent || []).length + ' caregiver' + ((out.sent || []).length === 1 ? '' : 's') + '.';
      if ((out.failed || []).length) msg += '\n\nNot sent: ' + out.failed.join('; ');
      if ((out.refused_not_eligible || []).length) msg += '\n\nNo longer eligible: ' + out.refused_not_eligible.join(', ');
      alert(msg);
      try { const f = await sb.from('app_data').select('data').eq('key', 'coverage_cases').maybeSingle(); if (Array.isArray(f.data && f.data.data)) DATA.coverage_cases = f.data.data; } catch (e) {}
      rerender();
    } catch (e) { alert('Could not send: ' + (e.message || e)); }
  }

  /* ── the better list's flags on a picker row, and whether Cara would leave it unticked ── */
  function rowFlags(x) {
    let h = '';
    if (x.avail_unknown) h += ' · <b style="color:#8A4E0C;">🕐 ' + E(x.avail_unknown) + '</b>';
    if (x.hours && x.hours.text) h += ' · <b style="color:' + (x.hours.level === 'ot' ? 'var(--red)' : '#8A4E0C') + ';">⏳ ' + E(x.hours.text) + '</b>';
    (x.overlaps || []).forEach((o) => { h += ' · <b style="color:var(--red);">↔ ' + E(o) + '</b>'; });
    if (x.skills_note) h += ' · <b style="color:#8A4E0C;">🧩 ' + E(x.skills_note) + '</b>';
    /* a lapsed eligibility check (OIG and the like): listed, flagged, never dropped (Samantha 2026-10-23) */
    if (x.cleared_note) h += ' · <b style="color:var(--red);">⚠ ' + E(x.cleared_note) + '</b>';
    return h;
  }
  /* NEEDS VERIFICATION (Samantha 2026-10-23): expired or missing clearances are listed so the office knows why, with no tick
     box: the server never offers them a shift until they are verified as eligible */
  function nvHtml(d) {
    const nv = (d && d.needs_verification) || [];
    if (!nv.length) return '';
    return '<div style="margin-top:8px;padding:7px 10px;background:#FFF1EE;border:1px solid #F2C9C0;border-radius:8px;">'
      + '<div style="font-size:12.5px;font-weight:700;color:var(--red);">Needs Verification (' + nv.length + '): can\'t be offered a shift until verified as eligible</div>'
      + nv.map((x) => '<div style="font-size:12.5px;padding:2px 0;"><b>' + E(x.name) + '</b> <span class="field-note">' + E(String(x.needs_verification || '').replace(/^Needs Verification: /, '')) + (x.history && x.history.visits ? ' · ' + x.history.visits + ' visits with this client' : '') + '</span></div>').join('')
      + '</div>';
  }
  const uncheck = (x) => !!((x.overlaps || []).length || (x.hours && x.hours.level === 'ot') || x.cleared_note);   /* a lapsed check: listed, unticked; a person can still tick them */

  /* ── the old list next to the new one (owners, while cara_list_live is off) ── */
  const PREV = {};
  async function previewList(id) { PREV[id] = { loading: true }; rerender(); try { PREV[id] = { data: await call({ action: 'candidates_v2', case_id: id }) }; } catch (e) { PREV[id] = { err: String(e.message || e) }; } rerender(); }
  function previewHtml(c) {
    if (listOn() || String(c.kind) === 'interest') return '';
    const st = PREV[c.id];
    if (!st) return '<div style="margin-top:6px;"><a href="javascript:void(0)" onclick="CP1.previewList(\'' + E(c.id) + '\')" style="font-size:12.5px;font-weight:700;">Compare with Cara\'s new list (preview, sends nothing) &rarr;</a></div>';
    if (st.loading) return '<div class="field-note" style="margin-top:6px;">Building Cara\'s new list…</div>';
    if (st.err) return '<div style="color:var(--red);font-size:12.5px;margin-top:6px;">' + E(st.err) + '</div>';
    const d = st.data, rows = [...(d.group0 || []), ...(d.group1 || []), ...(d.group2 || [])];
    return '<div style="margin-top:8px;padding:9px 11px;border:1px dashed var(--border);border-radius:9px;background:#fff;">'
      + '<div style="font-weight:800;font-size:12.5px;color:var(--navy);">Preview: Cara\'s new list (nothing is sent from here)</div>'
      + '<div class="field-note" style="margin:2px 0 6px;">' + E((d.meta && d.meta.cara_list && [d.meta.cara_list.skills, d.meta.cara_list.hours, d.meta.cara_list.client_state].filter(Boolean).join(' · ')) || '') + '</div>'
      + rows.map((x, i) => '<div style="font-size:12.5px;padding:2px 0;"><b>' + (i + 1) + '. ' + E(x.name) + '</b> <span class="field-note">' + E(x.why || '') + rowFlags(x) + (x.working_then ? ' · already working then' : '') + (x.outside_avail ? ' · ' + E(x.outside_avail) : '') + '</span></div>').join('')
      + nvHtml(d)
      + ((d.excluded || []).filter((x) => /^Skills rules/.test(x.why)).length ? '<div class="field-note" style="margin-top:4px;">Left out by the skills rules: ' + d.excluded.filter((x) => /^Skills rules/.test(x.why)).map((x) => E(x.name) + ' (' + E(x.why.replace(/^Skills rules: /, '')) + ')').join('; ') + '</div>' : '')
      + '</div>';
  }

  /* ── the shift Cara found for a texted or phoned call-off ── */
  function flagVisitLine(c) {
    const m = c.visit_match, p = c.visit_match_practice;
    if (m && m.state === 'one' && c.axiscare_visit_id) return '<div style="font-size:13px;margin-top:4px;color:var(--green);font-weight:700;">Cara found the shift in AxisCare: ' + E(c.client) + ', ' + E(typeof caraWhen === 'function' ? caraWhen(c) : c.shift_date) + '.</div>';
    if (m && m.state === 'several') return '<div style="font-size:13px;margin-top:4px;color:#8A4E0C;font-weight:700;">' + m.options.length + ' shifts in the next 36 hours: you pick which one when you confirm.</div>';
    if (m && (m.state === 'none' || m.state === 'unreadable')) return '<div class="field-note" style="margin-top:4px;">' + E(m.why) + '.</div>';
    if (p && owner()) return '<div class="field-note" style="margin-top:4px;">Practice (switch off): Cara ' + (p.state === 'one' && p.chosen ? 'would attach ' + E(p.chosen.client) + ' ' + E(p.chosen.shift_date) + ' ' + E(p.chosen.shift_time) : p.state === 'several' ? 'found ' + p.options.length + ' shifts' : 'found no shift (' + E(p.why) + ')') + '.</div>';
    return '';
  }
  /* covFlagConfirm hook: returns false to stop (the office cancelled), true to go on */
  async function beforeFlagConfirm(c) {
    const m = c.visit_match;
    if (!m || m.state !== 'several' || c.axiscare_visit_id) return true;
    const list = m.options.map((o, i) => (i + 1) + '. ' + o.client + ', ' + o.shift_date + ' ' + o.shift_time).join('\n');
    const ans = await ccPrompt('Which shift is ' + (first(c.calling_off) || 'the caregiver') + ' calling off?\n\n' + list + '\n\nType the number.', '1');
    const i = Number(String(ans || '').trim()) - 1;
    if (!(i >= 0 && i < m.options.length)) return false;
    const o = m.options[i];
    Object.assign(c, { axiscare_visit_id: o.visit_id, client: o.client, client_axiscare_id: o.client_axiscare_id, shift_date: o.shift_date, shift_time: o.shift_time, visit_picked_by: (typeof ME !== 'undefined' && (ME.name || ME.email)) || '' });
    return true;
  }

  /* ── the new Today: five questions ─────────────────────────────────────── */
  function todayHtml(S) {
    const H = (t, sub, n) => '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin:4px 0 8px;"><h3 style="margin:0;font-size:16.5px;font-weight:800;color:var(--navy);">' + t + '</h3>'
      + (n ? '<span style="background:var(--gold-text);color:#fff;border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:700;">' + n + '</span>' : '') + (sub ? '<span class="field-note" style="font-size:12.5px;">' + sub + '</span>' : '') + '</div>';
    const soon = (a, b) => (covShiftMs(a) - covShiftMs(b));
    const crit = (c) => urgency(c).level === 'critical' && !confirmedCase(c);
    const pending = S.open.filter((c) => caraNeedsReason(c) === 'pending');
    const needs = S.needs.filter((c) => caraNeedsReason(c) !== 'pending' && !(c.status === 'open' && confirmedCase(c))).concat(S.working.filter(crit)).sort((a, b) => (crit(b) - crit(a)) || soon(a, b));
    const working = S.working.filter((c) => !crit(c)).sort(soon);
    let h = '';
    if (preview() && settings().cara_today_live !== true) h += '<div class="field-note" style="margin-bottom:8px;padding:6px 10px;background:#FFF4E3;border-radius:8px;">Preview of Cara\'s new Today, only in this browser. The office still sees the current page. <a href="javascript:void(0)" onclick="CP1.preview(false)">Leave the preview</a></div>';
    /* 1. what needs attention right now */
    const ck = typeof swClockinN === 'function' ? swClockinN() : 0;
    h += H('Needs you now', 'soonest and most urgent first', needs.length + (ck ? 1 : 0));
    if (ck) h += '<div class="card" style="padding:11px 14px;margin:0 0 8px;border:1.5px solid var(--red);"><b style="color:var(--red);">' + ck + ' missed clock-in' + (ck === 1 ? '' : 's') + ' or out</b> <span class="field-note">Arrival isn\'t confirmed until AxisCare shows the clock-in or you\'ve called the client.</span> <a href="javascript:void(0)" onclick="covSubGo(\'clockins\')" style="font-weight:700;">Open &rarr;</a></div>';
    const pickBtn = (c) => caraNeedsReason(c) === 'pick' && String(c.kind) !== 'interest' ? ' <button class="addlead" style="font-size:12px;padding:3px 10px;" onclick="CP1.sendCaraList(\'' + E(c.id) + '\')">Send Cara\'s list</button>' : ''
    h += needs.length ? needs.map((c) => '<div style="position:relative;">' + '<div style="margin:0 0 3px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">' + chip(c) + ' <span class="field-note">' + E(urgency(c).why) + '</span>' + pickBtn(c) + '</div>' + caraNeedsCard(c) + '</div>').join('')
      : (ck ? '' : '<div class="card" style="padding:12px 15px;margin:0 0 10px;"><b style="color:var(--navy);">Nothing needs you right now.</b></div>');
    /* 2. what is waiting for office approval */
    h += '<div style="height:8px;"></div>' + H('Waiting for your OK', 'a yes is interest only; you confirm, AxisCare shows it', pending.length);
    h += pending.length ? pending.sort(soon).map((c) => '<div class="card" style="padding:14px 16px;margin:0 0 10px;background:#FFFCF5;border:1.5px solid var(--gold);"><div style="margin-bottom:5px;">' + chip(c) + ' <b style="color:var(--navy);">' + E(c.client || '?') + '</b> <span class="field-note">' + E(typeof caraWhen === 'function' ? caraWhen(c) : '') + '</span></div>' + (window.CB && CB.on() ? CB.html(c) : recHtml(c)) + '</div>').join('')
      : '<div class="field-note" style="margin-bottom:10px;">No yeses waiting.</div>';
    /* 3. which shifts Cara is working on */
    h += H('Cara is working on', 'asks are out, waiting on replies', working.length);
    h += working.length ? working.map((c) => '<div style="display:flex;gap:6px;align-items:flex-start;"><div style="padding-top:12px;">' + chip(c) + '</div><div style="flex:1;min-width:0;">' + covWaitingRow(c) + '</div></div>').join('') : '<div class="field-note" style="margin-bottom:10px;">No asks out right now.</div>';
    /* 4. which caregivers have responded */
    const since = Date.now() - 12 * 3600000, rep = [];
    S.open.forEach((c) => (c.asked || []).forEach((a) => { const t = Date.parse(a.replied_at || ''); if (a && a.state !== 'waiting' && t > since) rep.push({ c, a, t }); }));
    rep.sort((x, y) => y.t - x.t);
    const word = (a) => a.state === 'yes' ? (a.condition ? 'said yes, with a condition: ' + a.condition : 'said yes (interest)') : a.state === 'no' ? 'said no' : a.state === 'inquiry' ? 'asked a question' : a.state;
    h += H('Replies', 'the last 12 hours', rep.length);
    h += rep.length ? '<div class="card" style="padding:8px 14px;margin:0 0 10px;">' + rep.slice(0, 15).map((r) => '<div style="font-size:13px;padding:4px 0;border-bottom:1px solid var(--border);"><b>' + E(r.a.name) + '</b> ' + E(word(r.a)) + ' <span class="field-note">for ' + E(first(r.c.client)) + ' ' + E(typeof caraWhen === 'function' ? caraWhen(r.c) : '') + ' · ' + ago(r.a.replied_at) + ' ago' + (r.a.reply ? ' · "' + E(String(r.a.reply).slice(0, 80)) + '"' : '') + '</span></div>').join('') + '</div>'
      : '<div class="field-note" style="margin-bottom:10px;">No replies in the last 12 hours.</div>';
    /* 5. which clients are at risk of uncovered care */
    const risk = S.open.filter((c) => { const m = covShiftMs(c) - Date.now(); return isFinite(m) && m > -3600000 && m < 72 * 3600000 && !confirmedCase(c); }).sort(soon);
    h += H('Clients at risk', 'open shifts in the next 72 hours with nobody confirmed', risk.length);
    h += risk.length ? '<div class="card" style="padding:8px 14px;margin:0 0 10px;">' + risk.map((c) => { const f = fillWord(c);
      return '<div style="font-size:13px;padding:5px 0;border-bottom:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap;align-items:baseline;">' + chip(c) + ' <b>' + E(c.client || '?') + '</b> <span class="field-note">' + E(typeof caraWhen === 'function' ? caraWhen(c) : '') + '</span> <span style="color:' + f[1] + ';font-weight:700;">' + E(f[0]) + '</span><span style="flex:1;"></span>'
        + (!(c.asked || []).length && String(c.kind) !== 'interest' ? '<button class="addlead" style="font-size:12px;padding:3px 10px;" onclick="CP1.sendCaraList(\'' + E(c.id) + '\')">Send Cara\'s list</button> ' : '')
        + '<a href="javascript:void(0)" onclick="caraOpenCase(\'' + E(c.id) + '\')" style="font-size:12.5px;font-weight:700;">Open &rarr;</a></div>'; }).join('') + '</div>'
      : '<div class="field-note" style="margin-bottom:10px;">Every shift in the next 72 hours has someone confirmed or no open case.</div>';
    if (S.filled.length) h += H('Filled today', '', S.filled.length) + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px;">' + S.filled.map(caraFilledCard).join('') + '</div>';
    return h + '<div class="field-note" style="font-size:11.5px;margin-top:8px;">This view refreshes itself every minute.</div>';
  }
  /* the owner's way into the preview, shown on the current Today while the switch is off */
  function previewLink() {
    if (settings().cara_today_live === true || preview() || !owner()) return '';
    return '<div style="margin:0 0 10px;"><a href="javascript:void(0)" onclick="CP1.preview(true)" style="font-size:12.5px;font-weight:700;">Preview Cara\'s new Today (only you, only this browser) &rarr;</a></div>';
  }
  function setPreview(v) { ls.set('cara_p1_preview', v ? '1' : null); rerender(); }
  function rerender() { try { if (typeof renderCoverage === 'function') renderCoverage(); } catch (e) {} }
  /* "said yes" is interest, wherever the case shows a state */
  function wordsOn() { try { if (on() && typeof COV_STATE_UI !== 'undefined') COV_STATE_UI.yes = ['✅ said yes (not assigned)', 'var(--green)']; } catch (e) {} }

  window.CP1 = { nvHtml, on, listOn, urgency, chip, fillWord, recHtml, recLoad, sendCaraList, defaultPicks, rowFlags, uncheck, previewList, previewHtml, flagVisitLine, beforeFlagConfirm, todayHtml, previewLink, preview: setPreview, wordsOn };
})();
