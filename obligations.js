/* =============================================================================
   RECURRING OBLIGATIONS — THE ONE AUTHORITATIVE COPY
   =============================================================================
   Loaded by BOTH the browser (a plain <script> tag, which sets globalThis.CCOblig)
   AND the scheduled server-side runner (Deno `await import(<this url>)`, which
   executes it and reads the same global).

   No import/export statements, so the same file is a valid ES module for Deno
   and a valid script for the browser. That is deliberate: it is what stops the
   two paths drifting. There is no second copy to drift from.

   WHY IT MATTERS HERE: if the browser decided a client check-in was due and the
   scheduled runner decided it was not, one of them would be creating or closing
   real work about a real client, and the disagreement would be invisible.

   THIS FILE DECIDES. IT DOES NOT WRITE.
   evaluate() returns what should be created and what should be closed. The
   caller performs the writes, because the browser writes through persist() and
   the server writes through the upsert RPC, and neither belongs in a rules file.

   THE STANDING RULE: the source record is the truth; the work item is the
   prompt. An obligation is satisfied by READING the source, never by writing to
   it. Task completion must never pretend to be source completion — that is how
   you get false compliance and corrupted records.
   ============================================================================= */
(function (root) {
  'use strict';

  var YMD = /^(\d{4})-(\d{2})-(\d{2})/;
  function ymdOf(v){ var m = YMD.exec(String(v || '')); return m ? m[0] : ''; }
  /* End of the given day in LOCAL time, built from parts. Never
     new Date('YYYY-MM-DD'), which is parsed as UTC midnight and lands on the
     previous evening for anybody west of Greenwich. */
  function endOfLocalDay(ymd){
    var m = YMD.exec(String(ymd || '')); if(!m) return null;
    return new Date(+m[1], +m[2]-1, +m[3], 23, 59, 59, 999);
  }

  function cgName(c){
    var n = [c.first, c.last].filter(Boolean).join(' ').trim();
    return n || c.name || ('caregiver ' + c.id);
  }
  function fmtISO(d){
    if (!d) return '';
    if (typeof d === 'string') return d;
    try { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0')
                 + '-' + String(d.getDate()).padStart(2,'0'); } catch (e) { return ''; }
  }
  function addDaysYmd(ymd, n){
    var m = YMD.exec(String(ymd || '')); if (!m) return '';
    var d = new Date(+m[1], +m[2]-1, +m[3] + n, 12, 0, 0);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0')
         + '-' + String(d.getDate()).padStart(2,'0');
  }

  /* ── THE REGISTRY ─────────────────────────────────────────────────────────
     A source is a declaration. Adding one is six fields here, not a second
     engine with its own subtly different idea of idempotency.

     Each source says: where the records live, which of them count, when the
     obligation falls due, whose it is, what the item says, how to tell from
     the SOURCE that it has been satisfied, and where a human goes to do it.

     Everything else — deduplication, date maths, routing fallback, staleness,
     reconciliation — belongs to the engine. */
  var SOURCES = [
    {
      key: 'client_checkin',
      label: 'Client check-ins',
      prefix: 'ops_ci',
      domain: 'client_care',
      kind: 'client_issue',
      /* Care Match records share the client_checkins key and are shaped
         .client/.caregiver. Requiring client_name is what keeps them out. */
      rows: function (d) {
        return (d.client_checkins || []).filter(function (c) {
          return c && c.client_name && c.next_checkin_due;
        });
      },
      id:     function (c) { return String(c.id); },
      due:    function (c) { return ymdOf(c.next_checkin_due); },
      who:    function (c) { return c.coordinator; },
      title:  function (c) { return 'Client check-in due — ' + c.client_name; },
      about:  function (c) { return c.client_name; },
      detail: function (c) {
        return 'Scheduled check-in. Last one ' + (c.checkin_date || 'not recorded')
          + (c.satisfaction_rating ? ', rated ' + c.satisfaction_rating + '/5' : '')
          + '. Record what is going well, what has changed, and what needs attention.';
      },
      next:   function () { return 'Call the client or family, then update the check-in record.'; },
      /* SATISFACTION IS READ, NOT WRITTEN.
         saveCheckin() already records the date, method, satisfaction, concerns
         and resolution and advances next_checkin_due by CONFIG.checkin_cadence.
         Writing back from a closed task would mark the check-in done and
         destroy everything that made the record worth keeping.
         Completing early counts: the work was done. */
      satisfied: function (c, dueYmd) {
        return !!(c.checkin_date && ymdOf(c.checkin_date) >= dueYmd);
      },
      open: function (c) {
        return "openCheckinModal('" + String(c.id).replace(/'/g, "\\'") + "')";
      }
    }
  ,
  {
    key: 'caregiver_compliance',
    label: 'Caregiver compliance',
    prefix: 'ops_cgc',
    domain: 'training_compliance',
    kind: 'request',

    /* THE RULES ARE NOT RESTATED HERE. Every frequency — OIG and EDL at 90
       days, FCSR annual, the 30-day OJT deadline, annual training — lives in
       eligibility-rules.js and is consumed through chkStatus().nextDue. If a
       frequency changes there, it changes here, because there is nothing here
       to change.

       If CCElig has not loaded, this source returns NO ROWS rather than
       guessing. rows_seen will read zero and the Control Centre will say the
       source is empty, which is true and visible, instead of quietly
       evaluating caregivers against nothing. */
    rows: function (d) {
      var E = (typeof globalThis !== 'undefined') ? globalThis.CCElig : null;
      if (!E || !E.eligibilityFacts) return [];
      return (d.caregivers || []).filter(function (c) {
        /* Somebody who has left stops generating obligations. A discharged
           caregiver chased for an expired background check is noise that
           teaches people to ignore the list. */
        return c && c.id && !c.inactive && !c.terminated && !c.left_at;
      });
    },
    id: function (c) { return String(c.id); },
    who: function () { return ''; },              // routed by domain, not by name
    due: function () { return ''; },              // unused: obligations() supplies dates
    title: function (c) { return 'Compliance — ' + cgName(c); },
    about: function (c) { return cgName(c); },
    detail: function () { return ''; },
    next: function () { return ''; },

    /* MANY OBLIGATIONS PER CAREGIVER, each with its own due date and its own
       consequence. Three categories, kept apart on purpose:

         legal        a lapse can stop somebody working
         management   overdue, but it does not make anyone ineligible
         verification unknown history is NOT failed compliance

       An overdue performance review must never look like an expired OIG
       check, and an unimported training record must never be reported as a
       failure. */
    obligations: function (c) {
      var E = globalThis.CCElig;
      if (!E || !E.eligibilityFacts) return [];
      var f, out = [];
      try { f = E.eligibilityFacts(c); } catch (e) { return []; }
      var name = cgName(c);

      /* Warn BEFORE it lapses. The rules already carry a warn window
         (14 days for the 90-day checks, 30 for annual), and nextDue is the
         date itself, so acting early costs nothing and prevents the lapse. */
      function recurring(code, st, label, lead) {
        if (!st || !st.nextDue) return;                 // never done: handled below
        var dueYmd = ymdOf(fmtISO(st.nextDue));
        if (!dueYmd) return;
        var act = addDaysYmd(dueYmd, -(lead || 14));    // create it early
        out.push({
          code: code, due: act, kind: 'request', severity: 'legal',
          domain: 'training_compliance',
          title: label + ' due — ' + name,
          about: name,
          detail: label + ' is due ' + dueYmd + '. Recorded ' +
                  (st.status === 'Pending' ? 'never' : 'previously') +
                  '. Completing it and recording the date closes this by itself.',
          next: 'Complete ' + label.toLowerCase() + ', then record the date on the caregiver.'
        });
      }
      recurring('oig_expired',  f.oig,  'OIG check', 14);
      recurring('edl_expired',  f.edl,  'EDL check', 14);
      recurring('fcsr_expired', f.fcsr, 'FCSR check', 30);

      /* OJT KEEPS ITS OWN CONSEQUENCE and does not get generalised. The
         30-day deadline is a hard restriction: overdue means off future
         shifts, an admin notified, and the restriction on the record.
         Nothing else in this list behaves that way, and flattening them all
         into one shape would either over-punish a late supervisory visit or
         under-punish this. */
      if (f.ojtDeadline && !c.ojt_date) {
        var ojt = ymdOf(fmtISO(f.ojtDeadline));
        if (ojt) out.push({
          code: 'ojt', due: addDaysYmd(ojt, -7), kind: 'request', severity: 'legal',
          restriction: true, domain: 'training_compliance',
          title: 'OJT deadline approaching — ' + name,
          about: name,
          detail: 'OJT must be completed by ' + ojt + ', 30 days from hire. ' +
                  'If it passes uncompleted they become ineligible, come off future ' +
                  'shifts, and the restriction is recorded.',
          next: 'Schedule and complete OJT, then record the date.'
        });
      }

      /* MANAGEMENT QUALITY. Same engine, different consequence. Routed to
         caregiver_performance rather than training_compliance so it reaches
         the person who runs performance, and marked so no screen can render
         it as a work-affecting lapse. */
      function annualMgmt(code, lastStr, label) {
        var st = E.chkStatus ? E.chkStatus(lastStr, 365, 30) : null;
        if (!st || !st.nextDue) return;
        var dueYmd = ymdOf(fmtISO(st.nextDue));
        if (!dueYmd) return;
        out.push({
          code: code, due: addDaysYmd(dueYmd, -30), kind: 'request',
          severity: 'management', domain: 'caregiver_performance',
          title: label + ' due — ' + name,
          about: name,
          detail: label + ' is due ' + dueYmd +
                  '. This is a management obligation: being overdue does NOT ' +
                  'make anyone ineligible to work.',
          next: 'Carry out the ' + label.toLowerCase() + ' and record the date.'
        });
      }
      annualMgmt('supervisory_visit',  c.supv_date, 'Supervisory visit');
      annualMgmt('performance_review', c.perf_date, 'Performance review');

      return out;
    },

    /* SATISFIED BY THE SOURCE, as everywhere else. Recording the new date on
       the caregiver moves nextDue forward, the derived id changes, and the old
       obligation reconciles itself. Nothing writes back to the caregiver. */
    satisfied: function (c, dueYmd, code) {
      var map = { oig_expired: c.oig_date, edl_expired: c.edl_date,
                  fcsr_expired: c.fcsr_date, ojt: c.ojt_date,
                  supervisory_visit: c.supv_date, performance_review: c.perf_date };
      var last = map[code];
      if (!last) return false;
      /* The obligation was created ahead of the due date, so "done" means the
         record moved past the point that generated it. */
      return ymdOf(last) >= addDaysYmd(dueYmd, 0);
    }
  }
  ];

  /* ── THE ENGINE ───────────────────────────────────────────────────────────
     ctx = {
       data          the app_data blobs, at minimum the keys the sources read
       today         'YYYY-MM-DD' in the operating timezone
       items         existing ops_items
       resolveOwner  name-or-email  -> canonical email, '' when unresolvable
       domainOwner   domain code    -> canonical email, '' when vacant
       ownerName     email          -> display name
       maxAgeDays    optional. Obligations older than this are NOT created.
                     Switching a runner on should never flood a team with a
                     year of backlog on its first morning.
     }

     Returns decisions only. Nothing here writes, logs or mutates ctx. */
  function evaluate(ctx) {
    ctx = ctx || {};
    var data = ctx.data || {};
    var today = ymdOf(ctx.today) || '';
    var items = ctx.items || [];
    var resolveOwner = ctx.resolveOwner || function () { return ''; };
    var domainOwner = ctx.domainOwner || function () { return ''; };
    var ownerName = ctx.ownerName || function (e) { return e; };
    var maxAgeDays = (typeof ctx.maxAgeDays === 'number') ? ctx.maxAgeDays : null;

    var out = { create: [], stale: [], skipped: 0, unroutable: [], errors: [],
                tooOld: [], bySource: {} };
    var existing = {}; items.forEach(function (i) { existing[i.id] = i; });
    var wanted = {};
    var nowIso = (ctx.nowIso || new Date().toISOString());

    var oldestAllowed = null;
    if (maxAgeDays !== null && today) {
      var t = endOfLocalDay(today);
      if (t) { var o = new Date(t.getTime() - maxAgeDays * 86400000); oldestAllowed =
        o.getFullYear() + '-' + String(o.getMonth()+1).padStart(2,'0') + '-' + String(o.getDate()).padStart(2,'0'); }
    }

    SOURCES.forEach(function (src) {
      /* `rows` is the count the engine actually SAW. Without it, a source
         whose table is empty and a source that is perfectly up to date both
         report zeros, and an automation processing nothing looks identical to
         an automation with nothing to process. That is the false green this
         whole exercise exists to prevent. */
      var s = { rows: 0, created: 0, skipped: 0, unroutable: 0, tooOld: 0 };
      var rows = [];
      try { rows = src.rows(data) || []; }
      catch (e) {
        out.errors.push({ source: src.key, message: 'rows() failed: ' + (e && e.message || e) });
        out.bySource[src.key] = s; return;
      }
      s.rows = rows.length;
      rows.forEach(function (r) {
        /* A source may emit ONE obligation per row (a client check-in) or MANY
           (a caregiver has OIG, EDL, FCSR, annual training and more, each with
           its own due date). Sources that declare obligations() get the second
           shape; everything else keeps the first. The id carries the code, so
           two obligations for the same caregiver can never collide. */
        var many;
        try {
          many = (typeof src.obligations === 'function')
            ? (src.obligations(r) || [])
            : [{ code: '', due: src.due(r) }];
        } catch (e) {
          out.errors.push({ source: src.key, message: 'obligations() failed: ' + (e && e.message || e) });
          return;
        }
        many.forEach(function (ob) { emit(src, r, ob, s); });
      });
      out.bySource[src.key] = s;
    });

    function emit(src, r, ob, s) {
        var dueYmd = ymdOf(ob.due);
        if (!YMD.test(String(dueYmd || ''))) return;
        var id = src.prefix + '_' + src.id(r) + (ob.code ? '_' + ob.code : '') + '_' + dueYmd;
        wanted[id] = true;
        if (today && dueYmd > today) { s.skipped++; out.skipped++; return; }   // not due yet
        if (existing[id]) { s.skipped++; out.skipped++; return; }              // generated already, ever
        /* Backlog guard. A first run must not dump a year of history on
           somebody. Skipped, counted and reported — never silently dropped. */
        if (oldestAllowed && dueYmd < oldestAllowed) {
          s.tooOld++; out.tooOld.push({ source: src.key, id: id, due: dueYmd }); return;
        }
        var owner = '';
        try { owner = resolveOwner(ob.who !== undefined ? ob.who : src.who(r)) || ''; } catch (e) { owner = ''; }
        if (!owner) owner = domainOwner(ob.domain || src.domain) || '';
        if (!owner) { s.unroutable++; out.unroutable.push(src.about(r) || src.id(r)); return; }
        var end = endOfLocalDay(dueYmd);
        out.create.push({
          id: id, kind: ob.kind || src.kind, status: 'open',
          title: ob.title || src.title(r), about: ob.about || src.about(r) || '',
          detail: ob.detail || src.detail(r),
          next_action: ob.next || src.next(r), urgency: ob.urgency || 'normal',
          /* Carried so a supervisor screen can separate a lapsed background
             check from an overdue performance review without re-deriving it. */
          compliance: ob.code ? { code: ob.code, severity: ob.severity || null,
                                  restriction: ob.restriction === true } : undefined,
          due: (end ? end.toISOString() : nowIso),
          domain: ob.domain || src.domain, owner: owner, owner_name: ownerName(owner) || '',
          created_at: nowIso, last_activity_at: nowIso,
          opened_by: 'system', created_by: 'automation:' + src.key,
          source: { type: src.key, id: src.id(r), code: ob.code || null, due: dueYmd }
        });
        s.created++;
    }

    /* Generated work whose obligation no longer exists — and WHY.
       "She did the check-in" and "somebody moved the date" are different
       facts, and closing both with one reason throws away the useful one.
       Satisfaction is decided by asking the SOURCE, never the work item. */
    var byKey = {}; SOURCES.forEach(function (s) { byKey[s.key] = s; });
    var rowCache = {};
    items.forEach(function (it) {
      if (it.status !== 'open') return;
      var mine = SOURCES.some(function (s) { return String(it.id).indexOf(s.prefix + '_') === 0; });
      if (!mine) return;                       // hand-typed work is never touched
      if (wanted[it.id]) return;
      var src = byKey[(it.source || {}).type];
      var why = 'obligation_moved';
      if (src && typeof src.satisfied === 'function') {
        try {
          if (!rowCache[src.key]) rowCache[src.key] = src.rows(data) || [];
          var row = rowCache[src.key].filter(function (r) {
            return String(src.id(r)) === String((it.source || {}).id);
          })[0];
          /* No row at all means the source was deleted or deactivated. The
             obligation genuinely no longer exists, and continuing to generate
             work for a client who left would be worse than closing it. */
          /* The code is passed so a source with many obligations per row can
             tell which one it is being asked about. A caregiver's OIG date
             says nothing about their FCSR. */
          if (row && src.satisfied(row, String((it.source || {}).due || ''),
                                   (it.source || {}).code || '')) why = 'done_at_source';
          else if (!row) why = 'source_gone';
        } catch (e) {
          out.errors.push({ id: it.id, message: 'satisfaction test failed: ' + (e && e.message || e) });
        }
      }
      out.stale.push({ item: it, why: why });
    });

    out.rowsSeen = SOURCES.reduce(function (n, src) {
      return n + ((out.bySource[src.key] || {}).rows || 0);
    }, 0);
    out.satisfied   = out.stale.filter(function (x) { return x.why === 'done_at_source'; }).length;
    out.rescheduled = out.stale.filter(function (x) { return x.why === 'obligation_moved'; }).length;
    out.sourceGone  = out.stale.filter(function (x) { return x.why === 'source_gone'; }).length;
    return out;
  }

  var CLOSE_NOTE = {
    done_at_source:   'The record shows this was completed. Closed automatically.',
    obligation_moved: 'The underlying date changed, so this obligation no longer exists.',
    source_gone:      'The record this was generated from no longer exists. Closed automatically.'
  };
  var CLOSE_LOG = {
    done_at_source:   'Closed automatically — the record shows it was done',
    obligation_moved: 'Closed automatically — the date it was generated for has moved',
    source_gone:      'Closed automatically — the record it came from is gone'
  };

  root.CCOblig = {
    SOURCES: SOURCES,
    evaluate: evaluate,
    CLOSE_NOTE: CLOSE_NOTE,
    CLOSE_LOG: CLOSE_LOG,
    _helpers: { ymdOf: ymdOf, endOfLocalDay: endOfLocalDay }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
