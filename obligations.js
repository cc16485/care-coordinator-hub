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

  var CG_LABELS = {
    oig_expired:'OIG check', edl_expired:'EDL check', fcsr_expired:'FCSR check',
    fcsr_registration:'FCSR registration', annual_training:'Annual training',
    orientation:'Orientation', alz:'Dementia training',
    ojt:'On-the-job training', ojt_overdue:'OJT past its 30-day deadline',
    supervisory_visit:'Supervisory visit', performance_review:'Performance review'
  };
  function LABEL(code){ return CG_LABELS[code] || String(code || 'Compliance item'); }

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
      /* Gate on the function actually used below. This checked
         eligibilityFacts while obligations() consumes eligibility(), so a
         rules file exposing one and not the other would have reported zero
         caregivers and looked like an empty source. */
      var E = (typeof globalThis !== 'undefined') ? globalThis.CCElig : null;
      if (!E || !E.eligibility) return [];
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
    obligations: function (c, todayYmd) {
      var E = globalThis.CCElig;
      if (!E || !E.eligibility) return [];
      var v; try { v = E.eligibility(c); } catch (e) { return []; }
      if (!v) return [];
      var f = v.facts || {}, name = cgName(c), out = [];

      /* THE RULE'S VERDICT IS THE INPUT. An earlier version of this read
         eligibilityFacts() and decided for itself whether OJT was missing,
         which made it a second rule source — exactly what it must not be.

         It also got the answer wrong in a way that mattered. The caregivers
         restored after the July incident came back with names and hire dates
         only, so ojt_date is blank for nearly all of them. Reading that as
         "OJT never happened" produced 54 work-restriction obligations about
         long-serving caregivers whose records were simply lost.

         eligibility() already refuses to do that: ojt_overdue with
         restriction:true only fires when there is nothing unverified, so a
         caregiver with no imported evidence gets a VERIFICATION task and never
         a work restriction. Consuming the verdict inherits that judgement
         instead of re-litigating it. */

      /* A STABLE ANCHOR PER OBLIGATION. The id carries a date, so that date
         must not move day to day or a fresh obligation appears every morning.
         Prefer the rule's own due date; then the computed next-due for a
         recurring check; then the hire date, which never changes. */
      var nextDue = {
        oig_expired:  f.oig  && f.oig.nextDue,
        edl_expired:  f.edl  && f.edl.nextDue,
        fcsr_expired: f.fcsr && f.fcsr.nextDue
      };
      function anchor(it) {
        return ymdOf(it.due) || ymdOf(fmtISO(nextDue[it.code])) || ymdOf(c.hire_date) || '';
      }

      function add(it, severity, domain, lead) {
        var a = anchor(it); if (!a) return;
        /* Verification is not late — nobody missed a deadline, a record was
           never imported. Its id stays anchored to the hire date so it is
           stable forever, but it becomes actionable now rather than being
           judged against a date years in the past. */
        var isVerify = (severity === 'verification');
        /* Due today, not in a week. The record has been missing since the
           caregiver was hired; adding a grace period to a gap that is already
           years old just delays the only action that resolves it. The id stays
           anchored to the hire date so it never regenerates. */
        var dueOn = isVerify ? (todayYmd || a)
                             : (lead ? addDaysYmd(a, -lead) : a);
        out.push({
          code: it.code,
          anchor: a,
          due: dueOn,
          kind: 'request',
          severity: severity,
          restriction: it.restriction === true,
          domain: domain,
          title: LABEL(it.code) + ' — ' + name,
          about: name,
          detail: (it.why || LABEL(it.code)) +
            (severity === 'verification'
              ? ' This is a record to verify, NOT a compliance failure. Do not treat this person as ineligible.'
              : severity === 'management'
              ? ' This is a management obligation: being overdue does not make anyone ineligible to work.'
              : it.restriction === true
              ? ' This is a work restriction: they come off future shifts until it is completed, and the restriction is recorded.'
              : ''),
          next: severity === 'verification'
            ? 'Check the paper file and the Training Hub, then record what you find.'
            : 'Complete it, then record the date on the caregiver.'
        });
      }

      /* Work-affecting. Lapses have already happened; tasks have not yet. */
      (v.lapses || []).forEach(function (it) { add(it, 'legal', 'training_compliance', 0); });
      (v.tasks  || []).forEach(function (it) { add(it, 'legal', 'training_compliance', 7); });
      /* Cannot work yet — same domain, but never a restriction, because they
         were never working in the first place. */
      (v.blockers || []).forEach(function (it) { add(it, 'legal', 'training_compliance', 0); });
      /* Management quality: reported, never eligibility, and routed to the
         person who runs performance rather than the one who runs compliance. */
      (v.mgmt || []).forEach(function (it) { add(it, 'management', 'caregiver_performance', 0); });
      /* Unknown history is not failed compliance. */
      (v.unverified || []).forEach(function (it) { add(it, 'verification', 'training_compliance', 0); });

      return out;
    },

    /* SATISFIED BY THE SOURCE, as everywhere else. Recording the new date on
       the caregiver moves nextDue forward, the derived id changes, and the old
       obligation reconciles itself. Nothing writes back to the caregiver. */
    satisfied: function (c, dueYmd, code) {
      /* Ask the rule again rather than second-guessing it. If the code no
         longer appears anywhere in the current verdict, the requirement has
         been met or has ceased to apply — either way this obligation is done.
         Reading the date fields directly would mean re-implementing, for the
         second time, the judgement about what counts as satisfied. */
      var E = globalThis.CCElig;
      if (!E || !E.eligibility) return false;
      var v; try { v = E.eligibility(c); } catch (e) { return false; }
      if (!v) return false;
      var still = []
        .concat(v.lapses || [], v.tasks || [], v.blockers || [],
                v.mgmt || [], v.unverified || [])
        .some(function (it) { return it.code === code; });
      return !still;
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
            ? (src.obligations(r, today) || [])
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
        /* The id may be anchored to something OTHER than the due date. A
           verification task is anchored to the hire date so its id never moves,
           while its deadline is soon — otherwise a tenured caregiver's
           verification would be permanently "45 days too old" and never
           surface at all. */
        var anchorYmd = ymdOf(ob.anchor) || dueYmd;
        var id = src.prefix + '_' + src.id(r) + (ob.code ? '_' + ob.code : '') + '_' + anchorYmd;
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
          source: { type: src.key, id: src.id(r), code: ob.code || null,
                    due: dueYmd, anchor: anchorYmd }
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
