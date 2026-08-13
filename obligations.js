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
      var s = { created: 0, skipped: 0, unroutable: 0, tooOld: 0 };
      var rows = [];
      try { rows = src.rows(data) || []; }
      catch (e) {
        out.errors.push({ source: src.key, message: 'rows() failed: ' + (e && e.message || e) });
        out.bySource[src.key] = s; return;
      }
      rows.forEach(function (r) {
        var dueYmd;
        try { dueYmd = src.due(r); } catch (e) { return; }
        if (!YMD.test(String(dueYmd || ''))) return;
        var id = src.prefix + '_' + src.id(r) + '_' + dueYmd;
        wanted[id] = true;
        if (today && dueYmd > today) { s.skipped++; out.skipped++; return; }   // not due yet
        if (existing[id]) { s.skipped++; out.skipped++; return; }              // generated already, ever
        /* Backlog guard. A first run must not dump a year of history on
           somebody. Skipped, counted and reported — never silently dropped. */
        if (oldestAllowed && dueYmd < oldestAllowed) {
          s.tooOld++; out.tooOld.push({ source: src.key, id: id, due: dueYmd }); return;
        }
        var owner = '';
        try { owner = resolveOwner(src.who(r)) || ''; } catch (e) { owner = ''; }
        if (!owner) owner = domainOwner(src.domain) || '';
        if (!owner) { s.unroutable++; out.unroutable.push(src.about(r) || src.id(r)); return; }
        var end = endOfLocalDay(dueYmd);
        out.create.push({
          id: id, kind: src.kind, status: 'open',
          title: src.title(r), about: src.about(r) || '', detail: src.detail(r),
          next_action: src.next(r), urgency: 'normal',
          due: (end ? end.toISOString() : nowIso),
          domain: src.domain, owner: owner, owner_name: ownerName(owner) || '',
          created_at: nowIso, last_activity_at: nowIso,
          opened_by: 'system', created_by: 'automation:' + src.key,
          source: { type: src.key, id: src.id(r), due: dueYmd }
        });
        s.created++;
      });
      out.bySource[src.key] = s;
    });

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
          if (row && src.satisfied(row, String((it.source || {}).due || ''))) why = 'done_at_source';
          else if (!row) why = 'source_gone';
        } catch (e) {
          out.errors.push({ id: it.id, message: 'satisfaction test failed: ' + (e && e.message || e) });
        }
      }
      out.stale.push({ item: it, why: why });
    });

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
