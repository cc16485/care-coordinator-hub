/* =============================================================================
   PROMISE ENGINE · what we owe each family, and when
   =============================================================================
   Same shape as obligations.js: a plain file with no import/export, loaded by
   the browser as a <script> (sets globalThis.CCPromise) and importable by a
   Deno runner later. There is one copy, so the two paths cannot drift.

   THIS FILE DECIDES. IT DOES NOT WRITE, AND IT NEVER CONTACTS ANYONE.
   evaluate() reads Start Contracts (start_contract_current rows) and returns,
   per Journey, what is owed and whether it is due; plus the work items a
   person should see on the day. Talking points are a prompt for the person
   making the call, never a message that sends itself.

   Two kinds of promise:
     update  the next update we owe the family (Start Contract, next_update_owed_on)
     lapsed  a committed start date that has passed while the Journey has not
             started care: the family was told a date, and it went by.
   The promised call-back on a lead is also a promise, but Leads already owns it
   and already escalates it, so this engine does not repeat it.

   Shadow first (build sequence, Stage 7): the hub displays these; turning the
   items into My Work entries is a separate, explicit activation.
   ============================================================================= */
(function (root) {
  'use strict';

  var YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
  var CONFIDENCE = { early: 'Early, no date yet', likely: 'Likely', expected: 'Expected', committed: 'Committed' };

  /* Today on the office's calendar, whatever the viewer's or server's clock says. */
  function todayChicago(now) {
    var d = now instanceof Date ? now : new Date();
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
    var get = function (t) { return (p.find(function (x) { return x.type === t; }) || {}).value; };
    return get('year') + '-' + get('month') + '-' + get('day');
  }
  function dayNum(ymd) {
    var m = YMD.exec(String(ymd || '').slice(0, 10)); if (!m) return null;
    return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000);
  }
  function ymdOf(v) { var s = String(v || '').slice(0, 10); return YMD.test(s) ? s : ''; }
  function pretty(ymd) {
    var m = YMD.exec(ymd || ''); if (!m) return '';
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
  }

  /* What the person making the call should have in front of them. */
  function talkingPoints(c, label) {
    var lines = [];
    var to = c.last_update_to || c.promised_to || 'the family';
    if (c.last_update_at && c.last_update_summary) {
      lines.push('Last update (' + pretty(ymdOf(c.last_update_at)) + ', to ' + c.last_update_to + '): "' + c.last_update_summary + '"');
    }
    if (c.promised_wording) {
      lines.push('What we promised ' + (c.promised_to || '') + (c.promised_on ? ' on ' + pretty(ymdOf(c.promised_on)) : '') + ': "' + c.promised_wording + '"');
    }
    lines.push('Current plan: ' + (CONFIDENCE[c.confidence] || c.confidence) +
      (c.target_date ? ', start ' + pretty(ymdOf(c.target_date)) : '') + '.');
    lines.push('Before calling ' + to + ' about ' + label + ': check what has changed since then.');
    return lines.join('\n');
  }

  /* input: { contracts: [start_contract_current rows], today: 'YYYY-MM-DD',
              labels: { episode_id: 'Linda Smith' }, states: { episode_id: 'provisional' } }
     output: { promises: [{episode_id, kind, state, due, days, owner, reason}], items: [...] } */
  function evaluate(input) {
    input = input || {};
    var today = ymdOf(input.today) || todayChicago();
    var t = dayNum(today);
    var labels = input.labels || {}, states = input.states || {};
    var promises = [], items = [];
    (input.contracts || []).forEach(function (c) {
      if (!c || !c.episode_id) return;
      var label = labels[c.episode_id] || 'this family';
      var owed = ymdOf(c.next_update_owed_on);
      if (!owed) {
        promises.push({ episode_id: c.episode_id, kind: 'update', state: 'none_owed', due: null, days: null,
                        owner: null, reason: c.none_owed_reason || '' });
      } else {
        var d = dayNum(owed) - t;
        var state = d > 0 ? 'upcoming' : (d === 0 ? 'due_today' : 'overdue');
        promises.push({ episode_id: c.episode_id, kind: 'update', state: state, due: owed, days: d, owner: c.owed_by || c.commitment_owner });
        if (state !== 'upcoming') {
          items.push({
            id: 'promise:update:' + c.episode_id + ':' + owed, engine: 'promise', kind: 'promise_update',
            episode_id: c.episode_id, due: owed, owner: c.owed_by || c.commitment_owner,
            title: 'Update owed to ' + (c.last_update_to || c.promised_to || 'the family') + ' about ' + label,
            detail: state === 'due_today' ? 'Due today' : 'Overdue by ' + (-d) + ' day' + (d === -1 ? '' : 's'),
            draft: talkingPoints(c, label)
          });
        }
      }
      var target = ymdOf(c.target_date);
      var started = states[c.episode_id] === 'established';
      if (c.confidence === 'committed' && target && dayNum(target) < t && !started) {
        promises.push({ episode_id: c.episode_id, kind: 'lapsed', state: 'overdue', due: target, days: dayNum(target) - t,
                        owner: c.commitment_owner });
        items.push({
          id: 'promise:lapsed:' + c.episode_id + ':' + target, engine: 'promise', kind: 'promise_lapsed',
          episode_id: c.episode_id, due: target, owner: c.commitment_owner,
          title: 'The start date we committed to for ' + label + ' has passed',
          detail: 'We told ' + (c.promised_to || 'the family') + ' ' + pretty(target) + '. Tell them where things stand and record a new plan.',
          draft: talkingPoints(c, label)
        });
      }
    });
    items.sort(function (a, b) { return String(a.due).localeCompare(String(b.due)) || String(a.id).localeCompare(String(b.id)); });
    return { today: today, promises: promises, items: items };
  }

  root.CCPromise = { evaluate: evaluate, todayChicago: todayChicago, CONFIDENCE: CONFIDENCE, version: 1 };
})(typeof globalThis !== 'undefined' ? globalThis : this);
