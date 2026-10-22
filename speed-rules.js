/* speed-rules.js · SPEED TO LEAD numbers (Samantha 2026-10-22, design approved: https://claude.ai/artifact/5vuSNJ9NKGhNiYf9ScEj7M).
   One file, read by the Owners Hub "Speed to lead" card (Samantha and Zach) and the CC Hub "My speed" tab (each coordinator,
   private). It only reads leads; it never writes. It builds on lead-rules.js (load that first): the clock is the same
   lead-response-hours clock the Leads board, the 5-minute text and the owners' numbers use, so nothing can disagree.
   A wait = from the clock start (a 9pm form starts at 8am) to the first time a person tried (first_human_attempt_at).
   Her fun rules for My speed: good news only, never a nudge, never ranking or comparing people. Time off never counts.
   No em dashes in anything a person reads. */
(function (root) {
  'use strict';
  const LR = () => root.LeadRules;
  const GOAL = 5;                                            /* minutes: the goal and the 5-minute text */
  const DAY = 864e5;
  const median = xs => { const a = xs.filter(x => x != null && !isNaN(x)).sort((p, q) => p - q); if (!a.length) return null; const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2); };
  const real = leads => (leads || []).filter(l => l && l.created_at && !(l.spam && l.spam.at) && !l.is_spam);
  const first = s => String(s || '').trim().split(/\s+/)[0].toLowerCase();
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /* minutes from the clock start to the first try; null when nobody has tried yet */
  function waitOf(l, hours) {
    const st = LR().clockStart(l, hours);
    if (!st || !l.first_human_attempt_at) return null;
    return Math.max(0, Math.round((Date.parse(l.first_human_attempt_at) - Date.parse(st)) / 60000));
  }
  /* minutes the clock has run with nobody trying (0 before it starts) */
  function openFor(l, hours, now) {
    const st = LR().clockStart(l, hours);
    return st ? Math.max(0, Math.round((Date.parse(now) - Date.parse(st)) / 60000)) : 0;
  }
  /* how they reached us: they called (and we answered), a referral, or a website form */
  function howCame(l) {
    const ev = (Array.isArray(l.contact_events) ? l.contact_events : []).filter(Boolean).sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')))[0];
    if (ev && ev.channel === 'call' && ev.direction === 'in') return 'called';
    if (l.referral_source_name || /referr|partner|hospital|agency/i.test(String(l.source || '')) || (ev && ev.actor === 'partner')) return 'referral';
    if (/call|phone/i.test(String(l.source || ''))) return 'called';
    return 'form';
  }
  const HOW = { called: 'Called us', form: 'Website form', referral: 'Referral' };
  /* Monday 00:00 Chicago of the week holding iso, as a Chicago day (yyyy-mm-dd) */
  function weekStart(iso) {
    const c = LR().chicago(iso); const back = (c.dow + 6) % 7;
    const [y, m, d] = c.ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d - back)).toISOString().slice(0, 10);
  }
  const at0 = day => LR().chicagoInstant(day, '00:00');
  const addDays = (day, n) => { const [y, m, d] = day.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  function minWords(m) {
    if (m == null) return 'no data yet';
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60), r = m % 60; return h + ' h' + (r ? ' ' + r + ' min' : '');
  }
  function whenWords(iso) {
    const c = LR().chicago(iso); const h = Math.floor(c.min / 60), mm = String(c.min % 60).padStart(2, '0');
    return DAYS[c.dow] + ' ' + ((h % 12) || 12) + ':' + mm + (h < 12 ? 'am' : 'pm');
  }

  /* ── the Speed to lead card (owners) ── */
  const PERIODS = { week: 'This week', month: 'Last 4 weeks', quarter: 'This quarter' };
  function periodRange(period, now) {
    if (period === 'week') return { from: at0(weekStart(now)), to: now };
    return { from: new Date(Date.parse(now) - (period === 'quarter' ? 91 : 28) * DAY).toISOString(), to: now };
  }
  function speedPage(leads, hours, opts) {
    opts = opts || {}; const now = opts.now || new Date().toISOString(), period = PERIODS[opts.period] ? opts.period : 'week';
    const { from, to } = periodRange(period, now);
    const all = real(leads);
    const came = all.filter(l => l.created_at >= from && l.created_at < to);
    /* counted once someone tried, or the 5 minutes are up: an after-hours form whose clock has not started, or a family
       still inside their first 5 minutes, is not judged yet */
    const counted = came.filter(l => !!l.first_human_attempt_at || openFor(l, hours, now) > GOAL);
    const waits = counted.map(l => waitOf(l, hours));
    const tried = waits.filter(w => w != null);
    const notYet = counted.filter(l => !l.first_human_attempt_at);
    const longNoTry = notYet.filter(l => openFor(l, hours, now) > 60);
    const b = [0, 0, 0, 0];
    waits.forEach((w, i) => { if (w == null) { if (openFor(counted[i], hours, now) > 60) b[3]++; return; } b[w <= GOAL ? 0 : w <= 15 ? 1 : w <= 60 ? 2 : 3]++; });
    const within5 = b[0], overHour = b[3];
    const talked24 = counted.filter(l => l.first_human_contact_at && Date.parse(l.first_human_contact_at) - Date.parse(LR().clockStart(l, hours)) <= DAY).length;
    const afterHours = came.filter(l => LR().clockStart(l, hours) !== new Date(l.created_at).toISOString()).length;
    const med = median(tried);
    /* the last 8 weeks, and the day of the week, from the same 8 weeks (steadier than one week) */
    const thisWeek = weekStart(now);
    const weeks = []; for (let i = 7; i >= 0; i--) weeks.push(addDays(thisWeek, -7 * i));
    const trend = weeks.map(w => { const f = at0(w), t = at0(addDays(w, 7)); const xs = all.filter(l => l.created_at >= f && l.created_at < t).map(l => waitOf(l, hours));
      const [y, m, d] = w.split('-').map(Number); return { week: w, label: new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }), median: median(xs), count: xs.filter(x => x != null).length }; });
    const eight = all.filter(l => l.created_at >= at0(weeks[0]) && l.created_at < now);
    const byDay = [1, 2, 3, 4, 5, 6, 0].map(dw => { const xs = eight.filter(l => LR().chicago(l.created_at).dow === dw).map(l => waitOf(l, hours)); return { day: DAYS[dw], median: median(xs), count: xs.filter(x => x != null).length }; });
    const bySource = ['called', 'form', 'referral'].map(k => { const xs = eight.filter(l => howCame(l) === k).map(l => waitOf(l, hours)); return { key: k, label: HOW[k], median: median(xs), count: xs.filter(x => x != null).length }; });
    /* is it a problem? Plain words from the numbers */
    let tone = 'good', verdict, why;
    if (!counted.length) { tone = 'quiet'; verdict = 'No families to measure yet.'; why = came.length ? 'The ones that came in are after hours; their clock starts at 8am.' : 'Nobody new reached out in this period.'; }
    else {
      const share = within5 / counted.length;
      const slow = byDay.filter(d => d.median != null && d.median > GOAL).map(d => d.day);
      const weekend = slow.length && slow.every(d => d === 'Sat' || d === 'Sun');
      if (share >= 0.8 && overHour <= 1) { verdict = 'Mostly no. Families hear from us fast.'; }
      else if (share >= 0.5) { tone = 'mixed'; verdict = weekend ? 'Somewhat. Weekends are the gap.' : 'Somewhat. Some families wait.'; }
      else { tone = 'bad'; verdict = 'Yes. Too many families wait.'; }
      why = within5 + ' of ' + counted.length + (counted.length === 1 ? ' family' : ' families') + ' got a call within 5 minutes.'
        + (overHour ? ' ' + overHour + ' waited over an hour' + (notYet.length ? ', ' + notYet.length + ' not called yet' : '') + '.' : notYet.length ? ' ' + notYet.length + ' not called yet.' : '')
        + (slow.length && tone !== 'good' ? ' Slowest days lately: ' + slow.join(', ') + '.' : '');
    }
    const rows = came.slice().sort((a, b2) => String(b2.created_at).localeCompare(String(a.created_at))).map(l => {
      const w = waitOf(l, hours), st = LR().clockStart(l, hours), after = st !== new Date(l.created_at).toISOString();
      const pending = !l.first_human_attempt_at, open = openFor(l, hours, now);
      return { id: l.id, name: [l.first_name, l.last_name].filter(Boolean).join(' ') || 'A family', came: whenWords(l.created_at), how: HOW[howCame(l)],
        tried: l.first_human_attempt_at ? whenWords(l.first_human_attempt_at) : 'Not yet', talked: l.first_human_contact_at ? whenWords(l.first_human_contact_at) : 'Not yet',
        owner: first(l.assigned_coordinator) ? String(l.assigned_coordinator).trim().split(/\s+/)[0] : '',
        wait: pending ? (open ? 'Waiting ' + minWords(open) : 'Clock starts ' + whenWords(st)) : (w === 0 && howCame(l) === 'called' ? 'Right away' : minWords(w) + (after ? ' (from ' + whenWords(st).split(' ')[1] + ')' : '')),
        tone: pending ? (open > 60 ? 'bad' : open > GOAL ? 'mid' : 'quiet') : w <= GOAL ? 'good' : w <= 60 ? 'mid' : 'bad' };
    });
    return { period, label: PERIODS[period], from, to, tone, verdict, why, families: came.length, counted: counted.length,
      tiles: { median: med, talked24, counted: counted.length, overHour, longNoTry: longNoTry.length, afterHours },
      buckets: [{ label: 'Under 5 minutes', count: b[0] }, { label: '5 to 15 minutes', count: b[1] }, { label: '15 to 60 minutes', count: b[2] }, { label: 'Over an hour', count: b[3] }],
      trend, byDay, bySource, rows, goal: GOAL };
  }

  /* ── My speed (each coordinator, private) ── */
  function mySpeed(leads, hours, me, opts) {
    opts = opts || {}; const now = opts.now || new Date().toISOString(); const who = first(me);
    const all = real(leads);
    const mine = all.filter(l => who && first(l.assigned_coordinator) === who);
    /* the streak: my families, newest first, reached within 5 minutes in a row. Time off and covering never break it. */
    const excused = l => !!(l.rungs && (l.rungs.owner_excused || l.rungs.manager_excused));
    let streak = 0;
    for (const l of mine.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))) {
      if (excused(l)) continue;
      const w = waitOf(l, hours);
      if (w == null) { if (openFor(l, hours, now) <= GOAL) continue; break; }   /* still inside the 5 minutes: not counted either way */
      if (w <= GOAL) streak++; else break;
    }
    const month = mine.filter(l => l.created_at >= new Date(Date.parse(now) - 30 * DAY).toISOString()).map(l => waitOf(l, hours));
    const thisWeek = weekStart(now);
    let best = null;
    for (let i = 1; i <= 12; i++) {
      const w = addDays(thisWeek, -7 * i), xs = mine.filter(l => l.created_at >= at0(w) && l.created_at < at0(addDays(w, 7))).map(l => waitOf(l, hours)).filter(x => x != null);
      const m = xs.length >= 2 ? median(xs) : null;
      if (m != null && (!best || m < best.median)) { const [y, mo, d] = w.split('-').map(Number); best = { median: m, week: new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) }; }
    }
    /* the team's week: everyone's families together, no names */
    const team = all.filter(l => l.created_at >= at0(thisWeek) && openFor(l, hours, now) > GOAL || (l.created_at >= at0(thisWeek) && l.first_human_attempt_at));
    const teamIn5 = team.filter(l => { const w = waitOf(l, hours); return w != null && w <= GOAL; }).length;
    const lastW = addDays(thisWeek, -7);
    const last = all.filter(l => l.created_at >= at0(lastW) && l.created_at < at0(thisWeek));
    const lastAll5 = last.length > 0 && last.every(l => { const w = waitOf(l, hours); return w != null && w <= GOAL; });
    return { me: who, families: mine.length, streak, monthMedian: median(month), best, team: { done: teamIn5, of: team.length },
      celebrate: lastAll5 && LR().chicago(now).dow === 1, goal: GOAL };
  }

  root.SpeedRules = { GOAL, PERIODS, waitOf, openFor, howCame, weekStart, minWords, speedPage, mySpeed };
})(typeof globalThis !== 'undefined' ? globalThis : this);
