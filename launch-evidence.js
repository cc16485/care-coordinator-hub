/* =============================================================================
   LAUNCH EVIDENCE · what AxisCare already knows about a new client's start
   =============================================================================
   Same shape as promise-engine.js: a plain file with no import/export, loaded
   by the browser as a <script> (sets globalThis.CCLaunchEvidence) and fetched
   by the launch-evidence edge function. One copy, so the two cannot drift.

   THIS FILE DECIDES. IT DOES NOT WRITE, AND IT NEVER CONTACTS ANYONE.
   evaluate() reads one New Clients launch and that client's AxisCare visits,
   and answers four questions the coordinator used to tick by hand:
     schedule     is there a schedule for this client in AxisCare?
     caregiver    is a caregiver assigned, and who?
     first shift  did care actually begin? (a real clock-in AND clock-out)
     evv          did clock-in work on that first shift?
   Actual SOC is the Chicago date of the first shift's clock-in. A scheduled
   visit, planned times, or the AxisCare profile start date never count.

   When the evidence is missing, conflicting or exceptional it says so and
   proposes nothing, so a person decides. It never un-ticks anything and
   never replaces something a person recorded. A step a person recorded by
   hand, with a reason (launch_evidence source 'person'), is that person's
   decision: its questions are closed, and AxisCare's later evidence is kept
   beside it, never over it.

   AxisCare went live around 2026-08-17. Visits before that were built by hand
   while caregivers clocked in on WellSky, so they carry no clock-ins and are
   never read as evidence either way.
   ============================================================================= */
(function (root) {
  'use strict';

  var GO_LIVE = '2026-08-17';
  var OPEN_GRACE_MIN = 120;   // a clock-in with no clock-out becomes a question this long after the scheduled end
  var ZONED = /(Z|[+-]\d{2}:?\d{2})$/i;
  var CHI = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hourCycle: 'h23', year: 'numeric',
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function mk(y, mo, d, h, mi, s) {
    return { ms: Date.UTC(y, mo - 1, d, h, mi, s), ymd: y + '-' + pad(mo) + '-' + pad(d), hm: pad(h) + ':' + pad(mi) };
  }
  /* Office wall-clock time for an AxisCare stamp. Zoned stamps are converted to
     Chicago; stamps with no zone are already the site's local time. */
  function wall(stamp) {
    var s = stamp instanceof Date ? stamp.toISOString() : String(stamp == null ? '' : stamp).trim();
    if (!s) return null;
    if (ZONED.test(s)) {
      var t = Date.parse(s); if (!isFinite(t)) return null;
      var p = CHI.formatToParts(new Date(t)), g = function (k) { return +((p.find(function (x) { return x.type === k; }) || {}).value); };
      return mk(g('year'), g('month'), g('day'), g('hour') % 24, g('minute'), g('second'));
    }
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(s);
    return m ? mk(+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) : null;
  }

  /* AxisCare's clockIn / clockOut are records {time, method, ...}. Older code
     read them as text; accept a bare string too rather than miss a clock-in. */
  function clockTime(c) { return c && typeof c === 'object' ? (c.time || null) : (typeof c === 'string' && c ? c : null); }
  function clockMethod(c) { return c && typeof c === 'object' && c.method ? String(c.method) : null; }
  function caregiverOf(v) {
    var c = v && v.caregiver; if (!c || c.id == null) return null;
    var name = [c.firstName, c.lastName].map(function (x) { return String(x == null ? '' : x).trim(); }).filter(Boolean).join(' ');
    return { id: String(c.id), name: name || ('Caregiver #' + c.id) };
  }
  function startOf(v) { return wall(v && (v.scheduledStartDate || v.startDate)); }
  function endOf(v) { return wall(v && (v.scheduledEndDate || v.endDate)); }
  function niceDate(ymd) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || ''); if (!m) return String(ymd || '');
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1] + ' ' + (+m[3]);
  }
  function visitCard(v) {
    var s = startOf(v), ci = wall(clockTime(v.clockIn)), co = wall(clockTime(v.clockOut)), cg = caregiverOf(v);
    return { visit_id: v.id != null ? String(v.id) : null, date: s ? s.ymd : null, scheduled: s ? s.hm : null,
             clock_in: ci ? ci.hm : null, clock_in_date: ci ? ci.ymd : null, clock_out: co ? co.hm : null,
             clock_in_at: clockTime(v.clockIn), clock_out_at: clockTime(v.clockOut),
             method: clockMethod(v.clockIn), verified: v.verified === true,
             caregiver: cg ? cg.name : null, caregiver_id: cg ? cg.id : null };
  }

  function evaluate(input) {
    input = input || {};
    var L = input.launch || {}, visits = Array.isArray(input.visits) ? input.visits : [];
    var byHand = {};
    (Array.isArray(input.evidence) ? input.evidence : []).forEach(function (e) {
      if (e && e.source === 'person' && e.fact && !byHand[e.fact]) byHand[e.fact] = e;
    });
    var ax = String(L.axiscare_client_id == null ? '' : L.axiscare_client_id).trim();
    var nowW = wall(input.now || new Date());
    var out = { version: 1, today: nowW.ymd, ok: true, exceptions: [], record: [], actual_soc: null };
    if (!ax) { out.ok = false; out.reason = 'no_axiscare_id'; return out; }

    var opened = wall(L.added_at), episode = +L.episode_n || 1;
    var from = opened && opened.ymd > GO_LIVE ? opened.ymd : GO_LIVE;
    out.window_from = from;
    var mine = visits.filter(function (v) { return v && !v.removed && v.client && String(v.client.id) === ax && startOf(v); });
    var byStart = function (a, b) { return startOf(a).ms - startOf(b).ms; };
    var inWin = mine.filter(function (v) { return startOf(v).ymd >= from; }).sort(byStart);
    var before = mine.filter(function (v) { var s = startOf(v).ymd; return s < from && s >= GO_LIVE; }).sort(byStart);
    var flag = function (code, text, extra) { var e = { code: code, text: text }; for (var k in extra || {}) e[k] = extra[k]; out.exceptions.push(e); };

    /* schedule */
    var upcoming = inWin.filter(function (v) { return startOf(v).ms >= nowW.ms; });
    out.schedule = { state: inWin.length ? 'yes' : 'no', visits: inWin.length, upcoming: upcoming.length,
                     next: upcoming.length ? visitCard(upcoming[0]) : null };

    /* caregiver: who is on the upcoming visits; if nothing is upcoming, who was last */
    var tally = {}, order = [];
    (upcoming.length ? upcoming : inWin).forEach(function (v) {
      var cg = caregiverOf(v); if (!cg) return;
      if (!tally[cg.id]) { tally[cg.id] = { id: cg.id, name: cg.name, visits: 0 }; order.push(cg.id); }
      tally[cg.id].visits++;
    });
    var cgs = order.map(function (id) { return tally[id]; });
    var unassignedUpcoming = upcoming.filter(function (v) { return !caregiverOf(v); }).length;
    var primary = upcoming.length ? (upcoming.map(caregiverOf).filter(Boolean)[0] || null)
                                  : (inWin.slice().reverse().map(caregiverOf).filter(Boolean)[0] || null);
    out.caregiver = { state: cgs.length ? 'yes' : 'no', caregivers: cgs, unassigned_upcoming: unassignedUpcoming,
                      primary: primary ? primary.name : null };

    /* first shift */
    var clocked = inWin.filter(function (v) { return wall(clockTime(v.clockIn)); })
      .sort(function (a, b) { return wall(clockTime(a.clockIn)).ms - wall(clockTime(b.clockIn)).ms; });
    var f = clocked[0] || null, fs = { state: 'none', visit: null };
    var clockedBefore = episode === 1 ? before.filter(function (v) { return wall(clockTime(v.clockIn)); }) : [];
    if (clockedBefore.length) {
      var cb = visitCard(clockedBefore[0]);
      flag('clocked_before_launch', 'AxisCare shows a clocked visit on ' + niceDate(cb.clock_in_date || cb.date) +
        ', before this launch opened on ' + niceDate(from) + '. Check whether care began earlier.', { date: cb.clock_in_date || cb.date });
    }
    if (f) {
      var fci = wall(clockTime(f.clockIn)), fco = wall(clockTime(f.clockOut)), fend = endOf(f);
      fs.visit = visitCard(f);
      var missed = inWin.filter(function (v) {
        var e = endOf(v); return v !== f && !wall(clockTime(v.clockIn)) && caregiverOf(v) && e && e.ms < fci.ms;
      });
      if (missed.length) {
        var mv = visitCard(missed[0]);
        flag('earlier_visit_unclocked', 'An earlier visit on ' + niceDate(mv.date) + (mv.caregiver ? ' with ' + mv.caregiver : '') +
          ' has no clock-in. Care may have begun then without EVV.', { date: mv.date });
      }
      if (fco) fs.state = 'evidenced';
      else if (fend && nowW.ms <= fend.ms + OPEN_GRACE_MIN * 60000) fs.state = 'under_way';
      else { fs.state = 'review'; flag('no_clock_out', 'The first visit (' + niceDate(fci.ymd) + ') has a clock-in but no clock-out.', { date: fci.ymd }); }
      if (fs.state === 'evidenced' && (missed.length || clockedBefore.length)) fs.state = 'review';
      if (fs.state === 'evidenced') out.actual_soc = { date: fci.ymd, basis: 'axiscare_first_clock_in', visit_id: fs.visit.visit_id };
    } else {
      if (clockedBefore.length) fs.state = 'review';
      var pastUnclocked = inWin.filter(function (v) { var e = endOf(v); return caregiverOf(v) && e && e.ms + OPEN_GRACE_MIN * 60000 < nowW.ms; });
      if (pastUnclocked.length) flag('past_visits_unclocked', pastUnclocked.length + ' past visit' + (pastUnclocked.length === 1 ? '' : 's') +
        ' with a caregiver but no clock-in, the first on ' + niceDate(startOf(pastUnclocked[0]).ymd) + '.', { date: startOf(pastUnclocked[0]).ymd });
      var target = String(L.start_date || '').slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(target) && target < nowW.ymd)
        flag('start_passed_no_clock_in', 'The start date (' + niceDate(target) + ') has passed and AxisCare shows no clocked visit yet.', { date: target });
    }
    /* a person's hand record (with a reason) settles the first shift: its questions close */
    var hf = byHand.first_shift;
    if (hf) {
      var hd = String((hf.evidence && hf.evidence.date) || '').slice(0, 10);
      out.exceptions = [];
      fs.by_hand = { date: hd, by: hf.recorded_by || null, reason: hf.reason || null, at: hf.recorded_at || null };
      if (fs.state !== 'evidenced') fs.state = 'recorded_by_hand';
      out.actual_soc = /^\d{4}-\d{2}-\d{2}$/.test(hd) ? { date: hd, basis: 'recorded_by_hand', by: hf.recorded_by || null } : null;
    }
    /* a checkbox tick earlier than any care AxisCare shows is a real conflict */
    var hand = !hf && L.first_shift_done && L.first_shift_done_at ? wall(L.first_shift_done_at) : null;
    if (hand && out.actual_soc && hand.ymd < out.actual_soc.date) {
      flag('hand_mark_before_care', 'First shift was marked done on ' + niceDate(hand.ymd) + ', but AxisCare\'s first clock-in is ' +
        niceDate(out.actual_soc.date) + '.', { date: hand.ymd });
      fs.state = 'review'; out.actual_soc = null;
    }
    out.first_shift = fs;
    out.evv = fs.state === 'evidenced' ? { state: 'proven', method: fs.visit.method } : { state: 'not_yet', method: null };
    out.by_hand = Object.keys(byHand);

    /* what the door may record: evidence once per fact; a tick only where the box is still empty */
    if (String(L.status || '') !== 'complete') {
      if (out.schedule.state === 'yes')
        out.record.push({ fact: 'schedule', tick: !L.schedule_added, detail: { visits: inWin.length, first: visitCard(inWin[0]) } });
      if (out.caregiver.state === 'yes')
        out.record.push({ fact: 'caregiver', tick: !L.caregiver_assigned, name: L.caregiver_assigned_name ? null : out.caregiver.primary,
                          detail: { caregivers: cgs } });
      if (fs.state === 'evidenced') {
        out.record.push({ fact: 'first_shift', tick: !L.first_shift_done, at: fs.visit.clock_in_at, detail: fs.visit });
        out.record.push({ fact: 'evv', tick: !L.evv_verified, detail: { method: fs.visit.method, visit_id: fs.visit.visit_id } });
      }
    }
    return out;
  }

  root.CCLaunchEvidence = { evaluate: evaluate, wall: wall, clockTime: clockTime, GO_LIVE: GO_LIVE,
                            OPEN_GRACE_MIN: OPEN_GRACE_MIN, version: 1 };
})(typeof globalThis !== 'undefined' ? globalThis : this);
