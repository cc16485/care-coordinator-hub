/* MESSAGE CAREGIVERS, ONE STARTING POINT (Samantha 2026-11-12: "I want it to be simple, to where we could click to send out
   a mass message about a potential new client, maybe that we have an upcoming care assessment scheduled for, as well as
   sending out that's attached to actual shifts that are already on our AxisCare schedule"; she could not find the panel
   when it lived only inside an open call-off case).
   One card at the top of Scheduling > Cara, always in the same place:
     About a new client      care assessments coming up (the lead's assessment time), or type one in: town, days, hours.
                             It opens an interest check (coverage case kind 'interest', what the Hub already uses), so the
                             text asks who would WANT the hours and never names the client.
     About an AxisCare shift open shifts for the next 7 days (the same lookup as the Operations Board's week card). It
                             opens, or finds, the coverage case for that visit.
   Then the Ask caregivers panel (ask-panel.js) right there: worked with the client, right level, whole team, tick, send.
   "Messages out now" lists the open new-client messages with their answers, since those no longer had a home.
   Nothing new on the server. 2026-11-14 (Simpler Scheduling, her picks): it opens from the "Message caregivers" button at the
   top of Scheduling, for everyone, next to "Someone's calling off". Closed, a short line says how many new-client messages
   are out, so they are never lost. */
(function (root) {
  'use strict';
  const DAY = 864e5, lc = (s) => String(s == null ? '' : s).trim().toLowerCase();
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  /* pure: "8:00 AM" -> "08:00" */
  function to24(t) {
    const m = /^\s*(\d{1,2}):(\d{2})\s*([AP]M)\s*$/i.exec(String(t || '')); if (!m) return /^\d\d:\d\d$/.test(String(t || '')) ? String(t) : '';
    let h = Number(m[1]) % 12; if (/pm/i.test(m[3])) h += 12; return String(h).padStart(2, '0') + ':' + m[2];
  }
  /* pure: leads with a care assessment from yesterday to N days ahead, soonest first. Never a lost or closed lead. */
  function upcoming(leads, now, days) {
    const lo = now - DAY, hi = now + (days || 21) * DAY;
    return (leads || []).filter((l) => l && l.assessment_at && !/^(lost|closed|not a fit|duplicate)/i.test(String(l.status || ''))).map((l) => ({ l, at: Date.parse(l.assessment_at) }))
      .filter((x) => !isNaN(x.at) && x.at >= lo && x.at <= hi).sort((a, b) => a.at - b.at)
      .map((x) => ({ id: String(x.l.id), name: [x.l.client_first_name || x.l.first_name, x.l.client_last_name || x.l.last_name].filter(Boolean).join(' ').trim() || 'Name not on file',
        town: String(x.l.client_city || '').trim(), zip: String(x.l.client_zip || '').trim(), at: x.at }));
  }
  /* pure: the coverage case fields for one open AxisCare shift ({ id, client, date, start, end, start24 }) */
  function shiftFields(s) {
    const a = s.start24 || to24(s.start), z = to24(s.end);
    return { client: String(s.client || 'A client'), shift_date: String(s.date || ''), shift_time: a && z ? a + '-' + z : (a || ''), axiscare_visit_id: s.id != null ? String(s.id) : null };
  }
  /* pure: the open case already made for this shift (same AxisCare visit, or same client, day and time), if any */
  function findShiftCase(cases, f) {
    return (cases || []).find((c) => c && c.status === 'open' && String(c.kind) !== 'interest' && ((f.axiscare_visit_id && String(c.axiscare_visit_id || '') === f.axiscare_visit_id)
      || (lc(c.client) === lc(f.client) && String(c.shift_date || '') === f.shift_date && String(c.shift_time || '') === f.shift_time))) || null;
  }
  /* pure: the open new-client message already made for this lead, if any */
  function findInterest(cases, leadId) { return leadId ? ((cases || []).find((c) => c && c.status === 'open' && String(c.kind) === 'interest' && c.open_hours !== true && String(c.lead_id || '') === String(leadId)) || null) : null; }
  /* pure: the fields for a new-client message. Needs a name (kept in the Hub, never texted) and a town or zip. */
  function interestFields(f) {
    const tz = String(f.town || '').trim(), zip = (tz.match(/\b(\d{5})\b/) || [])[1] || String(f.zip || ''), town = tz.replace(/\b\d{5}(-\d{4})?\b/, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    const days = (f.days || []).map(lc).filter((d) => DAYS.indexOf(d) > -1), out = { kind: 'interest', reason: 'new', client: String(f.name || '').trim() };
    if (f.lead_id) out.lead_id = String(f.lead_id);
    if (town) out.client_city = town; if (zip) out.client_zip = zip;
    if (days.length) out.interest_days = days;
    if (/^\d\d:\d\d$/.test(String(f.start || ''))) out.interest_start = f.start;
    if (/^\d\d:\d\d$/.test(String(f.end || ''))) out.interest_end = f.end;
    if (String(f.care || '').trim()) out.care_note = String(f.care).trim().slice(0, 300);
    return out;
  }
  function interestProblem(f) { return !String(f.name || '').trim() ? 'Who is it for? The name stays in the Hub; it is not in the text.' : !String(f.town || f.zip || '').trim() ? 'Which town or zip? Caregivers are told where.' : ''; }
  /* pure: open new-client messages, newest first */
  function outNow(cases) { return (cases || []).filter((c) => c && c.status === 'open' && String(c.kind) === 'interest' && c.open_hours !== true).sort((a, b) => String(b.opened_at || '').localeCompare(String(a.opened_at || ''))); }
  const CORE = { to24, upcoming, shiftFields, findShiftCase, findInterest, interestFields, interestProblem, outNow, DAYS };
  if (typeof module !== 'undefined' && module.exports) { module.exports = CORE; return; }

  /* ═══════════════════════════════════ in the Hub ═══════════════════════════════════ */
  const W = root;
  const E = (s) => (typeof W.escapeHtmlComms === 'function' ? W.escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const D = () => { try { return DATA || {}; } catch (e) { return {}; } };
  const S = { shown: false, view: '', caseId: '', form: null, err: '', shifts: undefined, shiftsErr: '', shiftsAt: 0, busy: false };
  const visible = () => !!W.AP;
  const cases = () => D().coverage_cases || [];
  const caseOf = (id) => cases().find((c) => c && c.id === id) || null;
  const dayWord = (ms) => { try { return new Date(ms).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); } catch (e) { return ''; } };
  const timeWord = (ms) => { try { return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };
  const btn = (txt, on, kind) => '<button type="button" onclick="' + on + '" style="font:inherit;font-weight:600;font-size:13px;border-radius:8px;padding:8px 14px;cursor:pointer;'
    + (kind === 'navy' ? 'background:#0E3860;color:#fff;border:0;' : 'background:#fff;color:#0E3860;border:1px solid #C9D5E3;') + '">' + txt + '</button>';

  async function loadShifts(force) {
    if (S.shifts === null) return;
    if (!force && S.shifts !== undefined && Date.now() - S.shiftsAt < 10 * 60000) return;
    S.shifts = null; render();
    try {
      const anon = (typeof COMMS_ANON !== 'undefined') ? COMMS_ANON : '';
      const r = await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/axiscare-open-shifts', { method: 'POST',
        headers: { 'x-hub-token': await W.trainHubTok(), 'apikey': anon, 'Authorization': 'Bearer ' + anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ days: 7 }) });
      const d = await r.json();
      if (d && d.error) { S.shifts = []; S.shiftsErr = 'Couldn\'t load open shifts from AxisCare.'; }
      else { S.shifts = (d && d.open) || []; S.shiftsErr = ''; }
    } catch (e) { S.shifts = []; S.shiftsErr = 'Couldn\'t reach AxisCare\'s schedule. Check your connection.'; }
    S.shiftsAt = Date.now(); render();
  }
  async function saveCase(c) {
    const d = D(); d.coverage_cases = d.coverage_cases || []; d.coverage_cases.push(c);
    try { W.opEvent(c.kind === 'interest' ? 'coverage_interest_opened' : 'coverage_opened', { item_id: c.id, area: 'coverage', summary: (c.kind === 'interest' ? 'Interest check opened: ' : 'Coverage case opened: ') + c.client + (c.shift_date ? ' ' + c.shift_date : '') + (c.shift_time ? ' ' + c.shift_time : '') }); } catch (e) {}
    await W.persist('coverage_cases', c);
  }
  const blank = (o) => Object.assign({ id: W.uid(), status: 'open', asked: [], opened_at: new Date().toISOString(), opened_by: (() => { try { return ME.name || ME.email || ''; } catch (e) { return ''; } })(), resolved_at: null, resolved_how: null, covered_by: null, note: '' }, o);

  function newClientHtml() {
    const up = upcoming(D().leads, Date.now(), 21), f = S.form;
    let h = '';
    if (!f) {
      h += '<div style="font-size:13px;font-weight:700;color:#344054;margin:10px 0 4px;">Care assessments coming up</div>';
      h += up.length ? up.map((u) => { const has = findInterest(cases(), u.id);
        return '<div data-as-lead="' + E(u.id) + '" style="display:flex;gap:10px;align-items:center;padding:8px 2px;border-bottom:1px solid #EAECF0;flex-wrap:wrap;"><div style="flex:1;min-width:200px;"><b style="color:#101828;">' + E(u.name) + '</b>'
          + '<div class="field-note">' + E([u.town || 'town not on file', 'assessment ' + dayWord(u.at) + ', ' + timeWord(u.at)].join(' · ')) + '</div></div>'
          + (has ? btn('Open the message (' + (has.asked || []).length + ' asked)', 'AS.open(\'' + E(has.id) + '\')') : btn('Message caregivers', 'AS.forLead(\'' + E(u.id) + '\')', 'navy')) + '</div>'; }).join('')
        : '<div class="field-note">No care assessments on the calendar in the next 3 weeks.</div>';
      h += '<div style="margin-top:10px;">' + btn('Someone else: type it in', 'AS.forLead(\'\')') + '</div>';
      return h;
    }
    const day = (d) => '<button type="button" data-as-day="' + d + '" aria-pressed="' + (f.days.indexOf(d) > -1) + '" onclick="AS.day(\'' + d + '\')" style="font:inherit;font-size:12.5px;cursor:pointer;border-radius:999px;padding:4px 11px;'
      + (f.days.indexOf(d) > -1 ? 'background:#0E3860;color:#fff;border:1px solid #0E3860;' : 'background:#fff;color:#0E3860;border:1px solid #C9D5E3;') + '">' + d.charAt(0).toUpperCase() + d.slice(1) + '</button>';
    const inp = (id, label, val, ph, type) => '<label style="display:flex;flex-direction:column;gap:3px;font-size:12.5px;color:#475467;flex:1;min-width:150px;">' + label
      + '<input id="' + id + '" type="' + (type || 'text') + '" value="' + E(val || '') + '" placeholder="' + E(ph || '') + '" oninput="AS.set(\'' + id.replace('as_', '') + '\',this.value)"></label>';
    h += '<div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;">' + inp('as_name', 'Who it is for (stays in the Hub, not in the text)', f.name, 'Client name') + inp('as_town', 'Town or zip', f.town, 'Nixa, or 65714') + '</div>'
      + '<div style="margin-top:8px;font-size:12.5px;color:#475467;">Which days (leave blank if not known yet)</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">' + DAYS.map(day).join('') + '</div>'
      + '<div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap;">' + inp('as_start', 'From', f.start, '', 'time') + inp('as_end', 'To', f.end, '', 'time') + inp('as_care', 'What the care is, in a few words (optional)', f.care, 'Help with meals and a shower') + '</div>'
      + (S.err ? '<div data-as-err="1" style="margin-top:8px;color:#B42318;font-size:13px;">' + E(S.err) + '</div>' : '')
      + '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' + btn(S.busy ? 'Working…' : 'Find caregivers', 'AS.makeInterest()', 'navy') + btn('Back', 'AS.back()')
      + '<span class="field-note">Nothing is sent yet. Next you pick who gets it.</span></div>';
    return h;
  }
  function shiftHtml() {
    if (S.shifts === undefined) { setTimeout(() => loadShifts(), 0); return '<div class="field-note" style="margin-top:10px;">Checking AxisCare…</div>'; }
    if (S.shifts === null) return '<div class="field-note" style="margin-top:10px;">Checking AxisCare…</div>';
    if (S.shiftsErr) return '<div style="margin-top:10px;color:#B42318;font-size:13px;">' + E(S.shiftsErr) + ' <a href="javascript:void(0)" onclick="AS.reloadShifts()">Try again</a></div>';
    const list = S.shifts.slice().sort((a, b) => (String(a.date) + (a.start24 || '')).localeCompare(String(b.date) + (b.start24 || '')));
    let h = '<div style="font-size:13px;font-weight:700;color:#344054;margin:10px 0 4px;">Open shifts on the AxisCare schedule, next 7 days <a href="javascript:void(0)" class="field-note" style="font-weight:400;" onclick="AS.reloadShifts()">Refresh</a></div>';
    if (!list.length) return h + '<div class="field-note">Every visit in the next 7 days has a caregiver.</div>';
    return h + list.map((s, i) => { const f = shiftFields(s), has = findShiftCase(cases(), f), d = Date.parse(s.date + 'T12:00:00');
      return '<div data-as-shift="' + i + '" style="display:flex;gap:10px;align-items:center;padding:8px 2px;border-bottom:1px solid #EAECF0;flex-wrap:wrap;"><div style="flex:1;min-width:200px;"><b style="color:#101828;">' + E(f.client) + '</b>'
        + '<div class="field-note">' + E(dayWord(d) + ' · ' + (s.start || '') + ' to ' + (s.end || '')) + (has ? ' · ' + (has.asked || []).length + ' asked so far' : '') + '</div></div>'
        + btn(has ? 'Open it' : 'Message caregivers', 'AS.forShift(' + i + ')', has ? '' : 'navy') + '</div>'; }).join('');
  }
  function caseHtml(c) {
    const interest = String(c.kind) === 'interest';
    const head = interest ? [c.client_city || c.client_zip || 'town not set', (c.interest_days || []).join(', '), c.interest_start && c.interest_end ? c.interest_start + ' to ' + c.interest_end : ''].filter(Boolean).join(' · ')
      : [c.shift_date, typeof W.covT12 === 'function' ? W.covT12(c.shift_time || '') : c.shift_time].filter(Boolean).join(' · ');
    return '<div style="margin-top:10px;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;"><b style="font-size:15px;color:#0E3860;">' + E(c.client || '') + '</b><span class="field-note">' + E((interest ? 'New client · ' : 'AxisCare shift · ') + head) + '</span>'
      + '<span style="flex:1;"></span><a href="javascript:void(0)" onclick="AS.back()">Back</a></div>'
      + W.AP.html(c)
      + ((c.asked || []).length && typeof W.covOutreachHtml === 'function' ? '<div style="margin-top:8px;">' + W.covOutreachHtml(c) + '</div>' : '')
      + (interest ? '<div style="margin-top:8px;"><a href="javascript:void(0)" class="field-note" onclick="AS.close(\'' + E(c.id) + '\')">Done with this one: close the message</a></div>'
        : '<div class="field-note" style="margin-top:8px;">This shift is also in the list below, where you confirm who covers it.</div>');
  }
  function closedLine() {
    const out = outNow(cases()); if (!out.length) return '';
    const yes = out.reduce((n, x) => n + (x.asked || []).filter((a) => a.state === 'yes').length, 0);
    return '<div data-as-closed="1" class="field-note" style="margin:-6px 0 14px;">' + out.length + (out.length === 1 ? ' new-client message is' : ' new-client messages are') + ' out'
      + (yes ? ', ' + yes + ' said yes' : '') + '. <a href="javascript:void(0)" onclick="AS.toggle(true)">See them</a></div>';
  }
  function html() {
    if (!visible()) return '';
    if (!S.shown) return closedLine();
    const c = S.caseId ? caseOf(S.caseId) : null; if (S.caseId && (!c || c.status !== 'open')) S.caseId = '';
    let h = '<div class="card" id="askStartCard" style="padding:14px 18px;margin-bottom:14px;">'
      + '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;"><b style="font-size:16px;color:var(--navy);">Message caregivers</b><span class="field-note">What is it about? You pick who gets it; replies come back here.</span>'
      + '<span style="flex:1;"></span><a href="javascript:void(0)" onclick="AS.toggle(false)" style="font-size:13px;">Close</a></div>';
    if (c && S.caseId) return h + caseHtml(c) + '</div>';
    const pick = (k, title, sub) => '<button type="button" data-as-view="' + k + '" aria-pressed="' + (S.view === k) + '" onclick="AS.view(\'' + k + '\')" style="font:inherit;text-align:left;cursor:pointer;border-radius:10px;padding:10px 14px;'
      + (S.view === k ? 'background:#E6EEF7;border:2px solid #0E3860;' : 'background:#fff;border:1px solid #C9D5E3;') + '"><b style="display:block;color:#0E3860;font-size:14.5px;">' + title + '</b><span style="font-size:12.5px;color:#475467;">' + sub + '</span></button>';
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin-top:10px;">'
      + pick('new', 'About a new client', 'Someone we are meeting, like a care assessment coming up')
      + pick('shift', 'About a shift on the AxisCare schedule', 'An open visit in the next 7 days') + '</div>';
    if (S.view === 'new') h += newClientHtml();
    if (S.view === 'shift') h += shiftHtml();
    const out = outNow(cases());
    if (out.length && !S.form) h += '<div style="margin-top:12px;border-top:1px solid #EAECF0;padding-top:8px;"><div style="font-size:13px;font-weight:700;color:#344054;margin-bottom:2px;">New-client messages out now</div>'
      + out.map((x) => { const A = x.asked || [], yes = A.filter((a) => a.state === 'yes').length;
        return '<div data-as-out="' + E(x.id) + '" style="display:flex;gap:10px;align-items:center;padding:6px 2px;flex-wrap:wrap;"><span style="flex:1;min-width:200px;"><b>' + E(x.client || '') + '</b> <span class="field-note">'
          + E([x.client_city || '', A.length + ' asked', yes ? yes + ' said yes' : ''].filter(Boolean).join(' · ')) + '</span></span>' + btn('Open', 'AS.open(\'' + E(x.id) + '\')') + '</div>'; }).join('') + '</div>';
    return h + '</div>';
  }
  function render() {
    const box = document.getElementById('askStart'); if (box) box.innerHTML = html();
    const b = document.getElementById('asTopBtn'); if (b) b.setAttribute('aria-expanded', S.shown ? 'true' : 'false');
  }
  W.AS = Object.assign({}, CORE, { html, render, visible, state: S,
    toggle(v) { S.shown = typeof v === 'boolean' ? v : !S.shown; if (!S.shown) { S.view = ''; S.caseId = ''; S.form = null; S.err = ''; } render();
      const c = document.getElementById('askStartCard'); if (S.shown && c && c.scrollIntoView) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); },
    view(k) { S.view = S.view === k ? '' : k; S.form = null; S.err = ''; render(); },
    back() { if (S.caseId) S.caseId = ''; else S.form = null; S.err = ''; render(); },
    open(id) { S.caseId = id; render(); },
    forLead(id) { const u = id ? upcoming(D().leads, Date.now(), 21).find((x) => x.id === id) : null;
      S.form = { lead_id: u ? u.id : '', name: u ? u.name : '', town: u ? (u.town || u.zip) : '', days: [], start: '', end: '', care: '' }; S.err = ''; render(); },
    set(k, v) { if (S.form) S.form[k] = v; },
    day(d) { if (!S.form) return; const i = S.form.days.indexOf(d); if (i > -1) S.form.days.splice(i, 1); else S.form.days.push(d); render(); },
    async makeInterest() {
      if (!S.form || S.busy) return; S.err = interestProblem(S.form); if (S.err) { render(); return; }
      const had = findInterest(cases(), S.form.lead_id); if (had) { S.caseId = had.id; S.form = null; render(); return; }
      S.busy = true; render();
      try { const c = blank(interestFields(S.form)); await saveCase(c); S.caseId = c.id; S.form = null; }
      catch (e) { S.err = 'That did not save: ' + String((e && e.message) || e); }
      S.busy = false; render();
    },
    async forShift(i) {
      const list = (S.shifts || []).slice().sort((a, b) => (String(a.date) + (a.start24 || '')).localeCompare(String(b.date) + (b.start24 || ''))), s = list[i]; if (!s || S.busy) return;
      const f = shiftFields(s), had = findShiftCase(cases(), f); if (had) { S.caseId = had.id; render(); return; }
      S.busy = true;
      try { const c = blank(Object.assign({ reason: 'open', note: 'Open on the AxisCare schedule.' }, f)); await saveCase(c); S.caseId = c.id; try { if (typeof W.renderCoverage === 'function') W.renderCoverage(); } catch (e) {} }
      catch (e) { S.shiftsErr = 'That did not save: ' + String((e && e.message) || e); }
      S.busy = false; render();
    },
    reloadShifts() { loadShifts(true); },
    async close(id) { try { await W.covResolve(id, 'uncovered'); } catch (e) {} S.caseId = ''; render(); } });
})(typeof window !== 'undefined' ? window : globalThis);
