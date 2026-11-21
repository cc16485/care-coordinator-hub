/* =============================================================================
   checkins-tab.js · Caregivers > Check-ins and Clients > Check-ins (window.CHK)
   2026-11-14 (Samantha, "yes build it and show me"): family and client check-in answers live on Clients > Check-ins
   (#clientCheckinsWrap, badge #cchkBadge); Caregivers > Check-ins is caregivers only again. One load serves both.
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
  const VIEW = { data: null, loading: false, err: '', notOn: false, askedAt: 0, view: 'needs', saving: {}, msg: '', note: '', dnrForm: '' };
  const VIEWS = [['needs', 'Needs you'], ['answers', 'One-tap answers'], ['first90', 'First 90 days'], ['everyone', 'Everyone'], ['sent', 'What was sent'], ['dnr', "Don't send back"]];
  /* CARE & CONNECTION (2026-11-14): the smart-link check-ins (families now, caregivers later), from the same server.
     A link row's state: needs (a concern, nobody called yet), called, resolved (only with how they know it got better),
     happy, no_response (three days), waiting, not_sent. confirm: its card was closed in My Work but nobody confirmed. */
  const MOOD = { great: 'Going great', good: 'Mostly good', improve: 'Something needs to change', call: 'Asked for a call', stressed: 'A little stressed', hard: 'Having a hard time' };
  const LDOT = { needs: ['#E24B4A', 'needs attention'], called: ['#EF9F27', 'called, not yet resolved'], resolved: ['#1D9E75', 'resolved'], happy: ['#1D9E75', 'happy'],
    no_response: ['#B4B2A9', 'no answer in three days'], waiting: ['#D3D1C7', 'sent, waiting'], not_sent: ['#888780', 'did not send'] };
  /* aud: 'family' (Clients > Check-ins) or 'caregiver' (Caregivers > Check-ins) */
  const linksOf = (aud) => ((VIEW.data && VIEW.data.links) || []).filter((l) => !aud || l.audience === aud);
  const linkNeeds = (l) => l.state === 'needs' || l.state === 'called' || l.confirm;

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
      needs: all.filter((x) => needsYou(x.c)).length + linksOf('caregiver').filter(linkNeeds).length,
      familyNeeds: linksOf('family').filter(linkNeeds).length,
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

  /* DON'T SEND BACK (Samantha 2026-11-15): "Needs to have a spot to check that we have marked as don't send back and have that
     also happen in Axiscare". One tap on a check-in puts the caregiver + client on the Do-Not-Return log (every shift text
     skips the pair) and writes an important note on both AxisCare profiles. AxisCare's own Caregiver Exclusions has to be
     set by hand there, so each entry waits on "Set in AxisCare". */
  const ASK = { caregiver: 'The caregiver', client: 'The client', family: 'The family' };
  const dnrBtn = (c) => !c.client ? '' : c.dnr_id ? '<span class="chk-dnr" title="On the Do-Not-Return log">🚫 Not sending back</span>'
    : '<button class="fb" onclick="CHK.noReturn(\'' + e(c.id) + '\')">Don\'t send back</button>';
  function dnrForm(p, c) {
    if (VIEW.dnrForm !== c.id) return '';
    const busy = VIEW.saving['dnr:' + c.id];
    return '<div class="chk-dnr-form" id="chkDnrForm"><b>Don\'t send ' + e(p.name) + ' back to ' + e(c.client) + '</b>'
      + '<div class="field-note">Every shift text skips this pair, and an important note goes on both AxisCare profiles.</div>'
      + '<label>Who asked <select id="chkDnrWho"><option value="">Pick one</option>' + Object.keys(ASK).map((k) => '<option value="' + k + '">' + ASK[k] + '</option>').join('') + '</select></label>'
      + '<label>What they said <textarea id="chkDnrWhy" rows="2">' + e(c.reply ? c.reply.body : '') + '</textarea></label>'
      + (busy ? '<span class="field-note">Saving…</span>' : '<button class="fb fb-primary" onclick="CHK.saveNoReturn(\'' + e(c.id) + '\')">Save</button> <button class="fb" onclick="CHK.noReturn(\'\')">Cancel</button>')
      + '</div>';
  }
  const usDay = (iso) => { const ms = Date.parse(iso); return Number.isFinite(ms) ? new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' }) : ''; };
  const noteState = (n) => !n ? '' : (n.client === 'sent' && n.caregiver === 'sent') ? '✓ notes on both AxisCare profiles'
    : '⚠ AxisCare notes: client ' + (n.client === 'sent' ? 'sent' : 'not sent (' + n.client + ')') + ', caregiver ' + (n.caregiver === 'sent' ? 'sent' : 'not sent (' + n.caregiver + ')');
  function dnrHtml(V) {
    const list = (V.data && V.data.dnr) || [];
    if (!list.length) return '<div class="empty">Nobody is marked "don\'t send back" yet. Use the button on a check-in answer, or the Do-Not-Return form on Care Match.</div>';
    return list.map((r) => {
      const busy = VIEW.saving['dnrrow:' + r.id], lifted = !!r.lifted_at;
      const acts = lifted || busy ? (busy ? '<span class="field-note">Saving…</span>' : '')
        : (r.axiscare_entered ? '' : '<button class="fb fb-primary" onclick="CHK.dnrSet(\'' + e(r.id) + '\')">Set in AxisCare ✓</button> ') + '<button class="fb" onclick="CHK.dnrLift(\'' + e(r.id) + '\')">Undo</button>';
      return '<div class="chk-row' + (lifted ? ' chk-lifted' : '') + '"><span class="chk-dot" style="background:' + (lifted ? '#B4B2A9' : r.axiscare_entered ? '#1D9E75' : '#E24B4A') + '"></span><div class="chk-main">'
        + '<b>' + e(r.caregiver) + '</b> does not go back to <b>' + e(r.client) + '</b>' + (lifted ? ' <span class="field-note">(lifted)</span>' : '')
        + (r.reason ? '<div class="chk-reply">“' + e(r.reason) + '”</div>' : '')
        + '<div class="field-note">' + e(r.asked_by ? ASK[r.asked_by] + ' asked' : 'Requested by ' + (r.requested_by || 'not set')) + (r.requested_at ? ', ' + e(usDay(r.requested_at)) : '')
        + ' · marked by ' + e(r.logged_by || 'not set') + (r.logged_at ? ', ' + e(usDay(r.logged_at)) : '') + '</div>'
        + (r.axiscare_notes ? '<div class="field-note">' + e(noteState(r.axiscare_notes)) + '</div>' : '')
        + '<div class="field-note"' + (r.axiscare_entered || lifted ? '' : ' style="color:var(--red)"') + '>' + (r.axiscare_entered ? '✅ Set in AxisCare (Caregiver Exclusions)' + (r.axiscare_entered_by ? ' by ' + e(r.axiscare_entered_by) + (r.axiscare_entered_at ? ', ' + e(usDay(r.axiscare_entered_at)) : '') : '')
          : lifted ? '' : 'Still to do: in AxisCare open ' + e(r.client) + ' → Caregiver Exclusions → add ' + e(r.caregiver) + ', then tick Set in AxisCare.') + '</div>'
        + (lifted ? '<div class="field-note">Lifted ' + e(usDay(r.lifted_at)) + ' by ' + e(r.lifted_by) + (r.lifted_why ? ': ' + e(r.lifted_why) : '') + '. Shift texts can go to this pair again. If it was set in AxisCare, remove it there too.</div>' : '')
        + '</div><div class="chk-acts">' + acts + '</div></div>';
    }).join('');
  }
  const dnrToSet = (V) => ((V.data && V.data.dnr) || []).filter((r) => !r.lifted_at && !r.axiscare_entered).length;

  const ldot = (s) => '<span class="chk-dot" title="' + e(LDOT[s][1]) + '" style="background:' + LDOT[s][0] + '"></span>';
  /* the client's own check-in (2026-11-14) says "the client", never "Dorothy's family" */
  const famName = (l) => l.audience === 'caregiver' ? e([l.first, l.last].filter(Boolean).join(' ')) : l.audience === 'family' && l.self ? e(l.client_first || l.first) + ' <span class="field-note">(the client)</span>'
    : e(l.first) + (l.audience === 'family' && l.client_first ? ' <span class="field-note">(' + e(l.client_first) + "'s family)</span>" : '');
  /* EXACT ANSWERS (Samantha 2026-11-16: "i want to see their exact answers to the form"): every question as the person saw
     it on checkin.html, with exactly what they tapped or typed. Keep these words the same as checkin.html. */
  const FACE = { family: { great: 'Going great', good: 'Mostly good', improve: 'Something needs to change', call: "I'd like a call" },
    caregiver: { great: 'I love it', good: 'Pretty well', stressed: 'A little stressed', hard: 'Having a hard time' } };
  const EXTRA_Q = { 'family:first_visit': 'Did the caregiver arrive when you expected?', 'family:day_90': 'How likely are you to recommend us to a friend?',
    'caregiver:day_30': 'Are you getting the hours you want?', 'caregiver:day_90': 'How likely are you to tell a friend to work here?' };
  const WHEN = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Early evening' };
  function answersHtml(l) {
    const fam = l.audience === 'family', qa = [], none = '<span class="field-note">(nothing picked)</span>', blank = '<span class="field-note">(left blank)</span>';
    /* before the server sends good/thank (Staffing checkins v6), those two rows are left out rather than shown as empty */
    const full = Array.isArray(l.good);
    const add = (q, a) => qa.push('<div class="chk-q">' + e(q) + '</div><div class="chk-a">' + a + '</div>');
    /* READY TO WORK (Samantha approved 2026-11-19): its own four questions, the same words as checkin.html */
    if (l.audience === 'caregiver' && l.kind === 'ready') {
      const app = (v) => v === 'yes' ? 'Yes' : v === 'help' ? '<b style="color:#B45309">I need help</b>' : none
      add('How ready do you feel for your first shift?', l.ready != null ? e(l.ready + ' of 5') : none)
      add('Is the AxisCare app set up?', app(l.axiscare_app))
      add('Is Viventium set up?', app(l.viventium))
      add('Any questions or anything we should know?', l.note ? '“' + e(l.note) + '”' : blank)
      return '<div class="chk-reply chk-answers">' + qa.join('') + '</div>'
    }
    add(fam ? (l.self ? 'How are things going with your care?' : 'How are things going with ' + (l.client_first || 'their loved one') + "'s care?") : 'How are you feeling about work lately?',
      e((FACE[l.audience] || {})[l.mood] || MOOD[l.mood] || l.mood));
    const xq = EXTRA_Q[l.audience + ':' + l.kind];
    if (xq) add(xq, l.extra != null && l.extra !== '' ? e(typeof l.extra === 'number' ? l.extra + ' (0 to 10)' : l.extra) : none);
    const good = l.good || [], thank = l.thank || [];
    if (l.mood === 'great' && fam) {
      if (full) add("We love hearing that! What's going right? Someone who stands out", thank.length ? e(thank.map((t) => t === 'office' ? 'The office team' : t).join(', ')) : none);
      if (full) add("Something that's working", good.length ? e(good.join(', ')) : none);
      add('Tell us about it', l.note ? '“' + e(l.note) + '”' : blank);
    } else if (l.mood === 'great') {
      add('So glad to hear it! Anything you want to share?', l.note ? '“' + e(l.note) + '”' : blank);
    } else if (l.mood !== 'call') {
      add(fam ? 'What could be better?' : 'What would help most?', (l.what || []).length ? e(l.what.join(', ')) : none);
      add('Tell us a little more', l.note ? '“' + e(l.note) + '”' : blank);
    }
    if (l.mood !== 'great') {
      const wants = l.mood === 'call' || l.mood === 'hard';
      if (!wants) add('Would you like a call from the office?', l.call ? 'Yes, please' : 'No, this is enough');
      if (wants || l.call) add('When is a good time to call?', l.when ? e(WHEN[l.when] || l.when) : none);
      if (l.alt_phone) add('Best number', e(l.alt_phone.replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3')));
    }
    return '<div class="chk-reply chk-answers">' + qa.join('') + '</div>';
  }
  /* CLIENT PROFILE (Samantha 2026-11-16: "can their completed form be saved on the clients profile"): every answered
     family and client check-in for this AxisCare client, newest first, each question with exactly what they picked. */
  function profileHtml(ax) {
    if (!ax) return '';
    if (VIEW.notOn) return '';
    if (!VIEW.data) return '<div class="field-note">' + (VIEW.err ? 'Check-in forms could not load: ' + e(VIEW.err) : 'Loading check-in forms…') + '</div>';
    const rows = linksOf('family').filter((l) => String(l.client_ax) === String(ax) && l.answered_at && l.mood)
      .sort((a, b) => String(b.answered_at).localeCompare(String(a.answered_at)));
    if (!rows.length) return '<div class="field-note">No check-in forms answered yet.</div>';
    const day = (iso) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' });
    return rows.map((l) => '<div style="padding:8px 0;border-top:1px solid var(--border);"><b>' + famName(l) + '</b> <span class="field-note">' + e(l.label) + ' · answered ' + e(day(l.answered_at)) + '</span>'
      + answersHtml(l) + (l.follow === 'kind_words' || l.thanked ? '<div class="field-note">Sent to Kind Words (waiting there for an OK)</div>' : '') + '</div>').join('');
  }
  function linkRow(l, nowMs) {
    const busy = VIEW.saving[l.id], b = (st, label) => '<button class="fb" onclick="CHK.follow(\'' + e(l.id) + '\',\'' + st + '\')">' + label + '</button>';
    const acts = busy ? '<span class="field-note">Saving…</span>'
      : l.state === 'needs' ? b('called', 'Called') + ' ' + b('resolved', 'Resolved…')
      : l.state === 'called' || l.confirm ? b('resolved', 'Resolved…') + ' ' + b('reopened', 'Still a problem')
      : l.state === 'happy' ? b('reopened', 'Needs a call') : l.state === 'resolved' ? b('reopened', 'Reopen') : '';
    const last = l.followups[l.followups.length - 1];
    return '<div class="chk-row">' + ldot(l.state) + '<div class="chk-main"><b>' + famName(l) + '</b> <span class="field-note">' + e(l.label)
      + (l.answered_at ? ' · answered ' + e(when(l.answered_at, nowMs)) : ' · sent ' + e(when(l.sent_at, nowMs)) + (l.opened_at ? ', opened' : '')) + '</span>'
      + (l.mood ? answersHtml(l) : '')
      + (l.call ? '<div class="field-note" style="color:var(--red)">Asked for a call' + (l.when ? ' in the ' + e(l.when) : '') + '</div>' : '')
      + (l.follow === 'kind_words' || l.thanked ? '<div class="field-note">Sent to Kind Words (waiting there for an OK)</div>' : '')
      + (l.confirm ? '<div class="field-note" style="color:var(--red)">The card was closed, but nobody confirmed with them that it got better.</div>' : '')
      + (last ? '<div class="field-note">' + e({ called: 'Called', resolved: 'Resolved', reopened: 'Reopened', fine: 'Looked fine' }[last.state] || last.state) + ' by ' + e(last.by) + ', ' + e(when(last.at, nowMs)) + (last.note ? ': ' + e(last.note) : '') + '</div>' : '')
      + '</div><div class="chk-acts">' + acts + '</div></div>';
  }
  function familiesHtml(nowMs, aud) {
    const fam = linksOf(aud || 'family');
    if (!fam.length) return '<div class="empty">' + (aud === 'caregiver' ? 'No one-tap caregiver check-ins yet. They start only after Samantha approves the texts and turns them on.' : 'No family or client check-ins yet. They go out on weekdays between 10 AM and 5 PM.') + '</div>';
    const order = { needs: 0, called: 1, no_response: 3, waiting: 4, happy: 5, resolved: 6, not_sent: 7 };
    return fam.slice().sort((a, b) => ((linkNeeds(a) ? 0 : order[a.state] ?? 8) - (linkNeeds(b) ? 0 : order[b.state] ?? 8)) || String(b.sent_at).localeCompare(String(a.sent_at)))
        .map((l) => linkRow(l, nowMs)).join('');
  }
  function needsHtml(people, nowMs) {
    const linkRows = linksOf('caregiver').filter(linkNeeds).map((l) => linkRow(l, nowMs)).join('');
    const rows = [];
    for (const p of people) for (const c of p.checkins) if (needsYou(c)) rows.push({ p, c });
    rows.sort((a, b) => (stateOf(a.c) === 'concern' ? 0 : 1) - (stateOf(b.c) === 'concern' ? 0 : 1) || String(b.c.reply ? b.c.reply.at : b.c.sent_at).localeCompare(String(a.c.reply ? a.c.reply.at : a.c.sent_at)));
    if (!rows.length) return linkRows || '<div class="empty">Nothing waiting. Every reply has been read.</div>';
    return linkRows + rows.map(({ p, c }) => '<div class="chk-row">' + dot(stateOf(c))
      + '<div class="chk-main"><b>' + e(p.name) + '</b> <span class="field-note">' + (p.day != null ? 'day ' + e(p.day) + ' · ' : '') + e(c.label) + ' · answered ' + e(when(c.reply ? c.reply.at : c.sent_at, nowMs)) + '</span>'
      + (c.reply ? '<div class="chk-reply">“' + e(c.reply.body) + '”</div>' : '') + markLine(c, nowMs) + dnrForm(p, c) + '</div>'
      + '<div class="chk-acts">' + markBtns(c) + ' ' + dnrBtn(c) + ' ' + callBtn(p) + '</div></div>').join('');
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
    return '<table class="chk-table"><thead><tr><th>Sent</th><th>To</th><th>Check-in</th><th>Answer</th><th></th></tr></thead><tbody>'
      + rows.map(({ p, c }) => '<tr><td>' + e(when(c.sent_at, nowMs)) + '</td><td>' + e(p.name) + '</td><td>' + e(c.label) + '</td><td>'
        + dot(stateOf(c)) + ' ' + (c.reply ? e(when(c.reply.at, nowMs)) + ': ' + e(String(c.reply.body).slice(0, 60)) : e(DOT[stateOf(c)][1])) + dnrForm(p, c) + '</td><td>' + dnrBtn(c) + '</td></tr>').join('') + '</tbody></table>';
  }
  function html(V, nowMs) {
    if (V.notOn) return '<div class="card"><div class="empty">Check-ins is not switched on on the server yet. Run the Desktop step for it, then open this tab again.</div></div>';
    if (V.err && !V.data) return '<div class="card"><div class="empty">Check-ins could not load: ' + e(V.err) + ' <button class="fb" onclick="CHK.load()">Try again</button></div></div>';
    if (!V.data) return '<div class="card"><div class="empty">Loading check-ins…</div></div>';
    const people = V.data.people || [], n = counts(people, nowMs);
    const tile = (label, val, red) => '<div class="kpi"><div class="kl"><span>' + e(label) + '</span></div><div class="kv"' + (red && val ? ' style="color:var(--red)"' : '') + '>' + e(val == null ? '–' : val) + '</div></div>';
    const body = V.view === 'needs' ? needsHtml(people, nowMs) : V.view === 'answers' ? familiesHtml(nowMs, 'caregiver') : V.view === 'first90' ? peopleHtml(people, nowMs, true) : V.view === 'everyone' ? peopleHtml(people, nowMs, false) : V.view === 'dnr' ? dnrHtml(V) : sentHtml(people, nowMs);
    return '<div class="chk-kpis">' + tile('Needs you', n.needs, true) + tile('In first 90 days', n.first90) + tile('Answered, last 30 days', n.answeredPct == null ? null : n.answeredPct + '%') + tile('No answer', n.noAnswer) + '</div>'
      + '<div class="toolbar">' + VIEWS.map(([k, l]) => '<button class="filter-pill' + (V.view === k ? ' active' : '') + '" onclick="CHK.setView(\'' + k + '\')">' + e(l) + (k === 'needs' && n.needs ? ' (' + n.needs + ')' : '') + (k === 'dnr' && dnrToSet(V) ? ' (' + dnrToSet(V) + ' to set in AxisCare)' : '') + '</button>').join('')
      + '<div class="spacer"></div><button class="fb" onclick="CHK.load()">' + (V.loading ? 'Checking…' : 'Check again') + '</button></div>'
      + (V.msg ? '<div class="field-note" role="alert" style="color:var(--red)">' + e(V.msg) + '</div>' : '')
      + (V.note ? '<div class="field-note" role="status" style="color:var(--green,#1D9E75)">' + e(V.note) + '</div>' : '')
      + '<div class="card">' + body + '</div>'
      + (V.view === 'dnr' ? '' : '<div class="chk-legend">' + (V.view === 'answers' ? Object.keys(LDOT).map((k) => ldot(k) + ' ' + e(LDOT[k][1])).join(' &nbsp; ') : Object.keys(DOT).filter((k) => k !== 'called').map((k) => dot(k) + ' ' + e(DOT[k][1])).join(' &nbsp; ')) + '</div>')
      + (V.view === 'dnr' ? '<p class="field-note">Every caregiver and client pair on the Do-Not-Return log, from this tab and from Care Match. While a pair is on it, no open shift, fill-in, on-call, PRN or follow-up text offers that client to that caregiver. Undo keeps the entry here, with who lifted it and why, and adds a note on both AxisCare profiles.</p>' : '')
      + '<p class="field-note">One-tap answers come from the caregiver check-in page (week 1, day 30, 60, 90, then every 3 months); a hard time or a call request makes a card. The texted check-ins are the morning-after text for each new caregiver and client pair, and the PRN "glad to go back?" text. A reply is the first text back within three days. Texts are on record from November 5, 2026. Family and client check-ins are on Clients &gt; Check-ins. Nothing on this tab sends anything.</p>';
  }
  /** Clients > Check-ins: the family and client answers (Care &amp; Connection) */
  function clientHtml(V, nowMs) {
    if (V.notOn) return '<div class="card"><div class="empty">Check-ins is not switched on on the server yet.</div></div>';
    if (V.err && !V.data) return '<div class="card"><div class="empty">Check-ins could not load: ' + e(V.err) + ' <button class="fb" onclick="CHK.load()">Try again</button></div></div>';
    if (!V.data) return '<div class="card"><div class="empty">Loading check-ins…</div></div>';
    const fam = linksOf('family'), c = (f) => fam.filter(f).length;
    const tile = (label, val, red) => '<div class="kpi"><div class="kl"><span>' + e(label) + '</span></div><div class="kv"' + (red && val ? ' style="color:var(--red)"' : '') + '>' + e(val) + '</div></div>';
    return '<div class="chk-kpis">' + tile('Needs you', c(linkNeeds), true) + tile('Asked for a call', c((l) => l.call && l.state !== 'resolved'), true) + tile('Answered', c((l) => l.answered_at)) + tile('Happy', c((l) => l.state === 'happy')) + tile('No answer', c((l) => l.state === 'no_response')) + '</div>'
      + '<div class="toolbar"><div class="spacer"></div><button class="fb" onclick="CHK.load()">' + (V.loading ? 'Checking…' : 'Check again') + '</button></div>'
      + (V.msg ? '<div class="field-note" role="alert" style="color:var(--red)">' + e(V.msg) + '</div>' : '')
      + '<div class="card">' + familiesHtml(nowMs) + '</div>'
      + '<div class="chk-legend">' + Object.keys(LDOT).map((k) => ldot(k) + ' ' + e(LDOT[k][1])).join(' &nbsp; ') + '</div>'
      + '<p class="field-note">Families and clients answer on their own one-minute check-in page (after the first visit, day 30, day 90, then every 3 months). A concern makes a card the same day; mark it Resolved only once you know it got better. Thanks go to Kind Words. Nothing on this tab sends anything.</p>';
  }
  function setBadge() {
    if (typeof document === 'undefined') return;
    const n = VIEW.data ? counts(VIEW.data.people || [], Date.now()) : { needs: 0, familyNeeds: 0 };
    for (const [id, v] of [['chkBadge', n.needs], ['cchkBadge', n.familyNeeds]]) { const b = document.getElementById(id); if (b) { b.textContent = v || ''; b.style.display = v ? 'inline-flex' : 'none'; } }
  }
  function render() {
    setBadge();
    if (typeof document === 'undefined') return;
    const box = document.getElementById('checkinsWrap'); if (box) box.innerHTML = html(VIEW, Date.now());
    const cbox = document.getElementById('clientCheckinsWrap'); if (cbox) cbox.innerHTML = clientHtml(VIEW, Date.now());
    const pbox = document.getElementById('cp_checkin_forms'); if (pbox) pbox.innerHTML = profileHtml(pbox.dataset.ax);
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
  async function follow(id, state) {
    let note = '';
    if (state === 'resolved') { note = typeof prompt === 'function' ? (prompt('How do you know it got better? (for example: "Called Linda 11/20, she says the schedule is right now")') || '').trim() : ''; if (note.length < 8) { VIEW.msg = 'Resolved needs a short note on how you know it got better.'; render(); return; } }
    VIEW.saving[id] = true; VIEW.msg = ''; render();
    try { await post({ followup: { invite_id: id, state, note } });
      for (const l of linksOf()) if (l.id === id) { l.followups.push({ state, by: 'you', at: new Date().toISOString(), note });
        l.state = state === 'resolved' ? 'resolved' : state === 'called' ? 'called' : state === 'reopened' ? 'needs' : l.state; if (state === 'resolved') l.confirm = false; }
    } catch (err) { VIEW.msg = 'Not saved: ' + String((err && err.message) || err); }
    delete VIEW.saving[id]; render();
  }
  function noReturn(id) { VIEW.dnrForm = id || ''; VIEW.msg = ''; VIEW.note = ''; render(); }
  async function saveNoReturn(id) {
    const who = typeof document !== 'undefined' && document.getElementById('chkDnrWho') ? document.getElementById('chkDnrWho').value : '';
    const why = typeof document !== 'undefined' && document.getElementById('chkDnrWhy') ? document.getElementById('chkDnrWhy').value.trim() : '';
    if (!who) { VIEW.msg = 'Pick who asked: the caregiver, the client or the family.'; render(); return; }
    let reqAt = '';
    for (const p of (VIEW.data && VIEW.data.people) || []) for (const c of p.checkins) if (c.id === id && c.reply) reqAt = c.reply.at;
    VIEW.saving['dnr:' + id] = true; VIEW.msg = ''; VIEW.note = ''; render();
    try {
      const j = await post({ no_return: { checkin_id: id, asked_by: who, note: why, requested_at: reqAt } });
      const r = j.entry || {};
      VIEW.dnrForm = '';
      VIEW.note = j.already ? r.caregiver + ' and ' + r.client + ' were already on the Do-Not-Return log.'
        : 'Saved: ' + r.caregiver + ' will not be offered ' + r.client + "'s shifts. " + (noteState(r.axiscare_notes) || '') + '. Last step: in AxisCare open ' + r.client + ' → Caregiver Exclusions → add ' + r.caregiver + ", then tick Set in AxisCare on the Don't send back list.";
      delete VIEW.saving['dnr:' + id];
      await load();
      return;
    } catch (err) { VIEW.msg = 'Not saved: ' + String((err && err.message) || err); }
    delete VIEW.saving['dnr:' + id]; render();
  }
  async function dnrRow(id, body, done) {
    VIEW.saving['dnrrow:' + id] = true; VIEW.msg = ''; VIEW.note = ''; render();
    try { const j = await post(body); const list = (VIEW.data && VIEW.data.dnr) || [], i = list.findIndex((r) => r.id === id);
      if (i >= 0 && j.entry) list[i] = Object.assign({}, list[i], j.entry); VIEW.note = done; }
    catch (err) { VIEW.msg = 'Not saved: ' + String((err && err.message) || err); }
    delete VIEW.saving['dnrrow:' + id]; render();
  }
  function dnrSet(id) { return dnrRow(id, { dnr_axiscare: { id } }, 'Marked as set in AxisCare.'); }
  async function dnrLift(id) {
    const why = typeof prompt === 'function' ? (prompt('Why is this lifted? (for example: "marked by mistake")') || '').trim() : '';
    if (why.length < 4) { VIEW.msg = 'Undo needs a short reason.'; render(); return; }
    await dnrRow(id, { dnr_lift: { id, why } }, 'Lifted. Shift texts can go to this pair again. If it was set in AxisCare, remove it from Caregiver Exclusions there too.');
    for (const p of (VIEW.data && VIEW.data.people) || []) for (const c of p.checkins) if (c.dnr_id === id) c.dnr_id = '';
    render();
  }
  function show() { render(); if (!VIEW.loading && (!VIEW.askedAt || Date.now() - VIEW.askedAt > 300000)) load(); }
  /* any Caregivers tab: ask once in the background, so the pill's number is there before the tab is opened */
  function peek() { if (!VIEW.askedAt && !VIEW.loading) load(); }
  function setView(v) { VIEW.view = VIEWS.some(([k]) => k === v) ? v : 'needs'; render(); }
  return { stateOf, needsYou, counts, html, clientHtml, profileHtml, VIEW, render, load, mark, follow, show, peek, setView, linkNeeds, noReturn, saveNoReturn, dnrSet, dnrLift, dnrHtml };
});
