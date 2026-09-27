/* =============================================================================
   CLIENT START · is a start of care stuck, and whose work is it? (Change 8b, 2026-09-27)
   =============================================================================
   Same shape as obligations.js and promise-engine.js: a plain file, no import/export.
   The hub loads it as a <script> (sets globalThis.CCStart and the soc* / cs* names the
   page has always used); the server's client-start-run fetches the SAME bytes from
   cc.mo-care.com. One copy, so the "Stuck" badge and the My Work item can never disagree.

   THIS FILE DECIDES. IT DOES NOT WRITE, AND IT NEVER CONTACTS ANYONE.

   Moved here unchanged from the hub page (built 2026-08-12, never switched on), with two
   corrections Samantha ruled on 2026-09-27 ("14 days"):
     * a FAMILY-owned step, like a DSDS-owned one, gets 14 days before it counts as stuck
       (the page's badge already said 14; the never-used evaluator said 3);
     * the wait is measured from the time it is given, not the viewer's clock, so the server
       and the tests decide exactly what the page shows.
   ============================================================================= */
(function (root) {
  'use strict';

  /* Steps that OLD records still carry but that moved to the New Clients launch. */
  function socIsLaunchStep(pathway, id) {
    return (pathway === 'PP' ? ['m3', 'm4', 'm5', 'm6'] : ['m6', 'm7', 'm8', 'm9', 'm10']).indexOf(String(id)) >= 0;
  }
  function socPreSteps(soc) { return ((soc && soc.steps) || []).filter(function (s) { return !socIsLaunchStep(soc.pathway, s.id); }); }
  /* Current step and completion are judged over the PRE-STAFFING steps only. */
  function socCurrentStep(soc) { return socPreSteps(soc).filter(function (s) { return !s.done_at; })[0] || null; }
  function socWaitingDays(soc, nowMs) {
    var cur = socCurrentStep(soc); if (!cur) return 0;
    var done = (soc.steps || []).filter(function (s) { return s.done_at; }).map(function (s) { return s.done_at; }).sort();
    var since = done.length ? done[done.length - 1] : soc.started_at;
    var now = typeof nowMs === 'number' ? nowMs : Date.now();
    return Math.floor((now - new Date(since).getTime()) / 86400000);
  }
  /* The window before a stalled step becomes work: 14 days when DSDS or the family owns the
     step (that isn't the office being slow), 3 days for everything the office owns. */
  function csWindowFor(step) { return (step && (step.role === 'state' || step.role === 'family')) ? 14 : 3; }
  function socIsStuck(soc, nowMs) {
    var cur = socCurrentStep(soc); if (!cur) return false;
    return socWaitingDays(soc, nowMs) > csWindowFor(cur);
  }

  /* WHO OWNS EACH STEP: one explicit table keyed by pathway + step id (not keyword matching). */
  var CS_STEP_DOMAIN = {
    'A1:p0': 'family_enquiries', 'A1:p1': 'family_enquiries', 'A1:p2': 'family_enquiries',
    'A1:p3': 'payer_programs', 'A1:p4': 'payer_programs', 'A1:p5': 'payer_programs',
    'A2:p0': 'family_enquiries', 'A2:p1': 'family_enquiries',
    'A2:p2': 'payer_programs', 'A2:p3': 'payer_programs', 'A2:p4': 'payer_programs',
    'B:p0': 'payer_programs',
    'B:p1': 'scheduling_coverage',
    'PP:p0': 'client_care', 'PP:p1': 'family_enquiries', 'PP:p2': 'family_enquiries', 'PP:p3': 'client_care', 'PP:p4': 'payer_programs',
    'A1:m0': 'payer_programs', 'A2:m0': 'payer_programs', 'B:m0': 'payer_programs',
    'A1:m1': 'payer_programs', 'A2:m1': 'payer_programs', 'B:m1': 'payer_programs',
    'A1:m2': 'client_care', 'A2:m2': 'client_care', 'B:m2': 'client_care',
    'A1:m3': 'client_care', 'A2:m3': 'client_care', 'B:m3': 'client_care',
    'A1:m4': 'client_care', 'A2:m4': 'client_care', 'B:m4': 'client_care',
    'A1:m5': 'client_care', 'A2:m5': 'client_care', 'B:m5': 'client_care',
    'A1:m6': 'scheduling_coverage', 'A2:m6': 'scheduling_coverage', 'B:m6': 'scheduling_coverage',
    'A1:m7': 'scheduling_coverage', 'A2:m7': 'scheduling_coverage', 'B:m7': 'scheduling_coverage',
    'A1:m8': 'scheduling_coverage', 'A2:m8': 'scheduling_coverage', 'B:m8': 'scheduling_coverage',
    'A1:m9': 'client_care', 'A2:m9': 'client_care', 'B:m9': 'client_care',
    'A1:m10': 'payer_programs', 'A2:m10': 'payer_programs', 'B:m10': 'payer_programs',
    'PP:m0': 'client_care', 'PP:m1': 'client_care', 'PP:m2': 'client_care',
    'PP:m3': 'scheduling_coverage', 'PP:m4': 'scheduling_coverage', 'PP:m5': 'scheduling_coverage', 'PP:m6': 'client_care'
  };
  /* A step stamped at creation wins; otherwise the table; otherwise nothing, reported, never guessed. */
  function csDomainForStep(step, pathway) {
    if (step && step.domain) return step.domain;
    return CS_STEP_DOMAIN[(pathway || '') + ':' + ((step && step.id) || '')] || null;
  }

  /* TWO CLOCKS: stuck is calendar days; escalation is 2 BUSINESS days after the due date. */
  function csAddBusinessDays(from, n) {
    var d = (typeof from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(from)) ? new Date(from + 'T12:00:00') : new Date(from);
    var left = n;
    while (left > 0) { d.setDate(d.getDate() + 1); var day = d.getDay(); if (day !== 0 && day !== 6) left--; }
    return d;
  }
  var CS_ESCALATION_BUSINESS_DAYS = 2;
  function csEscalationDate(dueIso) {
    var d = csAddBusinessDays(String(dueIso).slice(0, 10), CS_ESCALATION_BUSINESS_DAYS);
    var pad = function (n) { return String(n).length < 2 ? '0' + n : String(n); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function csItemId(lead) { return 'cstart_' + lead.id; }

  /* ONE item per client start, id 'cstart_<lead id>', retitled and rerouted as the bottleneck
     moves. A start progressing normally creates NOTHING. Pure: decides, never writes. */
  function csEvaluate(leads, items, nowIso) {
    var now = nowIso || new Date().toISOString(), nowMs = Date.parse(now);
    var out = { create: [], update: [], resolve: [], quiet: 0, unrouted: [] };
    (leads || []).forEach(function (l) {
      if (!l || !l.soc) return;
      var existing = (items || []).filter(function (i) { return i.id === csItemId(l); })[0];
      var cur = socCurrentStep(l.soc);
      if (!cur || l.soc.abandoned) {
        if (existing && existing.status === 'open')
          out.resolve.push({ id: existing.id, close_reason: cur ? 'Client is not starting.' : 'Start of Care complete, care is established.' });
        else out.quiet++;
        return;
      }
      var waited = socWaitingDays(l.soc, nowMs);
      var window = csWindowFor(cur);
      if (waited <= window) {
        if (existing && existing.status === 'open')
          out.resolve.push({ id: existing.id, close_reason: 'Moving again, now on: ' + cur.label });
        else out.quiet++;
        return;
      }
      var who = ((l.first_name || '') + ' ' + (l.last_name || '')).trim() || l.id;
      var client = (!l.client_name_not_provided && (l.client_first_name || l.client_last_name))
        ? ((l.client_first_name || '') + ' ' + (l.client_last_name || '')).trim() : '';
      if (client) who = client;
      var domain = csDomainForStep(cur, l.soc.pathway);
      if (!domain) { out.unrouted.push({ lead: l.id, who: who, pathway: l.soc.pathway, step: cur.id, label: cur.label }); return; }
      var item = {
        id: csItemId(l), kind: 'client_start', source_id: l.id, about: who,
        title: who + ': start of care stuck ' + waited + ' days',
        detail: 'Waiting on: ' + cur.label,
        next_action: cur.role === 'state' ? 'Chase DSDS, or record what they have said and when to check again.'
          : cur.role === 'family' ? 'Check in with the family, or record what they have said and when to check again.'
          : 'Complete this step, or move it to whoever can.',
        status: 'open', domain: domain,
        priority: waited > window * 3 ? 'high' : 'normal',
        created_at: existing ? existing.created_at : now,
        last_activity_at: now,
        due: existing ? existing.due : new Date(nowMs - (waited - window) * 86400000).toISOString().slice(0, 10),
        opened_by: 'client-start',
        client_start: { step: cur.label, step_id: cur.id, role: cur.role, waited_days: waited, window: window, escalate_on: null }
      };
      item.client_start.escalate_on = csEscalationDate(item.due);
      item.escalate_to_domain = domain;
      if (!existing) out.create.push(item);
      else if (existing.status !== 'open' || (existing.client_start || {}).step !== cur.label || existing.domain !== domain
               || (existing.client_start || {}).waited_days !== waited) {
        item.history = (existing.history || []).concat([{ at: now, by: 'client-start',
          what: (existing.client_start || {}).step === cur.label ? 'Still waiting on: ' + cur.label + ' (' + waited + ' days)'
            : 'Bottleneck moved to: ' + cur.label + (existing.domain !== domain ? ', now owned by ' + domain : '') }]);
        out.update.push(item);
      } else out.quiet++;
    });
    return out;
  }

  /* Which leads count: a Start of Care exists, and the lead isn't archived or lost. */
  function csLeadsInScope(leads) {
    return (leads || []).filter(function (l) { return l && l.soc && !l.archived && l.status !== 'Lost'; });
  }

  var api = {
    version: '2026-09-27.1',
    socIsLaunchStep: socIsLaunchStep, socPreSteps: socPreSteps, socCurrentStep: socCurrentStep,
    socWaitingDays: socWaitingDays, socIsStuck: socIsStuck, csWindowFor: csWindowFor,
    CS_STEP_DOMAIN: CS_STEP_DOMAIN, csDomainForStep: csDomainForStep, csAddBusinessDays: csAddBusinessDays,
    CS_ESCALATION_BUSINESS_DAYS: CS_ESCALATION_BUSINESS_DAYS, csEscalationDate: csEscalationDate,
    csItemId: csItemId, csEvaluate: csEvaluate, csLeadsInScope: csLeadsInScope
  };
  root.CCStart = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
