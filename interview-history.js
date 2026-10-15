/* interview-history.js · 748 (2026-10-15). Every interview booking, cancel, move and no-show, on the applicant's page.
   Samantha: "when an applicant cancels and reschedules their interview please record that in their profile so we can see if
   theyve canceled and rescheduled a bunch of times, that can be a pattern of unreliability."
   Nothing new is stored here: every cancelled or moved booking already stays in interview_bookings. This reads all of them
   for the PERSON (every application with the same last 10 phone digits or email, as the database matches them), says in
   words what happened and who asked, and counts the changes the applicant asked for (online, by replying NO, or by ringing
   the office). Changes the office made for its own reasons are listed but never counted against them.
   Used by index.html: the Interview tab card (#apIvHist), the Overview warning (#apIvFlag), the list chip and the
   "At a glance" row (IVH.count), and the office's Move and Cancel (IVH.stamp, who in the office did it). */
(function () {
  'use strict';
  var CACHE = {};   // applicant id -> { rows, at }
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var dig = function (s) { return String(s || '').replace(/\D/g, '').slice(-10); };
  var low = function (s) { return String(s || '').trim().toLowerCase(); };
  var when = function (iso) { return iso ? new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''; };
  var day = function (iso) { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; };
  var rowsAll = function () { return (typeof AP_ROWS !== 'undefined' && AP_ROWS) || []; };

  /* every application by the same person (this one included) */
  function personIds(r) {
    if (!r) return [];
    var p = dig(r.phone), m = low(r.email), out = [String(r.id)];
    rowsAll().forEach(function (x) {
      if (String(x.id) === String(r.id)) return;
      if ((p.length === 10 && dig(x.phone) === p) || (m && low(x.email) === m)) out.push(String(x.id));
    });
    return out;
  }

  /* one booking row, in words. counts: 'asked' (they asked for the change), 'office', 'unknown', 'noshow', or null */
  function describe(b) {
    var by = b.office_user ? ' (' + b.office_user + ' in the office)' : '';
    var reason = b.cancel_reason && !/^(moved by the (applicant|office)|booked again under another application)$/.test(b.cancel_reason)
      && !/^Replied NO to the reminder/.test(b.cancel_reason) ? b.cancel_reason : '';
    if (b.status === 'booked') return { at: b.created_at, what: 'Booked for ' + when(b.starts_at), tone: 'now', kind: null };
    if (b.status === 'attended') return { at: b.starts_at, what: 'Came to their interview, ' + when(b.starts_at), tone: 'good', kind: null };
    if (b.status === 'noshow') return { at: b.starts_at, what: 'No-show for ' + when(b.starts_at), tone: 'bad', kind: 'noshow' };
    if (b.status !== 'cancelled') return { at: b.cancelled_at || b.created_at, what: 'Booking for ' + when(b.starts_at) + ' (' + b.status + ')', tone: '', kind: null };
    var was = ' (was ' + when(b.starts_at) + ')';
    if (b.cancelled_by === 'reschedule') {
      if (b.cancel_reason === 'booked again under another application') return null;   // the same person's duplicate application, tidied up
      if (b.cancel_reason === 'moved by the applicant')
        return { at: b.cancelled_at, what: (b.office_user ? 'Moved at their request' + by : 'Moved it themselves online') + was, tone: 'warn', kind: 'asked', move: true };
      if (b.cancel_reason === 'moved by the office')
        return b.office_user
          ? { at: b.cancelled_at, what: 'Moved by the office for our own reasons' + by + was, tone: '', kind: 'office', move: true }
          : { at: b.cancelled_at, what: 'Moved by the office' + was + ', from before we recorded who asked', tone: '', kind: 'unknown', move: true };
      return { at: b.cancelled_at, what: 'Moved' + was, tone: '', kind: 'unknown', move: true };
    }
    if (b.cancelled_by === 'applicant') {
      var how = b.cancel_kind === 'replied_no' ? 'Cancelled by replying NO to the reminder text'
        : b.office_user ? 'Cancelled at their request' + by : 'Cancelled it themselves';
      return { at: b.cancelled_at, what: how + was, why: reason, tone: 'warn', kind: 'asked' };
    }
    if (b.cancelled_by === 'office')
      return { at: b.cancelled_at, what: 'Cancelled by the office' + by + was, why: reason, tone: '', kind: 'office' };
    return { at: b.cancelled_at, what: 'Cancelled' + was, why: reason, tone: '', kind: 'unknown' };
  }

  function summary(rows) {
    var ev = (rows || []).map(describe).filter(Boolean)
      .sort(function (a, b) { return String(b.at || '').localeCompare(String(a.at || '')); });
    var n = { asked: 0, cancels: 0, moves: 0, office: 0, unknown: 0, noshow: 0 };
    ev.forEach(function (e) {
      if (e.kind === 'asked') { n.asked++; if (e.move) n.moves++; else n.cancels++; }
      else if (e.kind) n[e.kind]++;
    });
    return { ev: ev, n: n };
  }

  /* the list and "At a glance": how many changes they asked for, across all their applications, from what apLoad read */
  function count(r) {
    if (typeof AP_CHURN === 'undefined') return 0;
    return personIds(r).reduce(function (t, id) { return t + (AP_CHURN[id] || 0); }, 0);
  }

  var TONE = { bad: ['#B91C1C', '#FEE2E2'], warn: ['#B45309', '#FEF3C7'], good: ['#15803D', '#DCFCE7'], now: ['#1E3A5F', '#E0ECF8'] };
  function cardHtml(s) {
    if (!s.ev.length) return '<div class="field-note">No interview booked yet.</div>';
    var n = s.n, parts = [];
    if (n.cancels) parts.push(n.cancels + ' cancelled');
    if (n.moves) parts.push(n.moves + ' moved');
    var head = n.asked
      ? '<div style="font-size:13.5px;font-weight:700;color:' + (n.asked >= 3 ? '#B91C1C' : n.asked >= 2 ? '#B45309' : 'var(--navy)') + ';margin-bottom:6px;">'
        + 'They changed their interview ' + n.asked + ' time' + (n.asked === 1 ? '' : 's') + ' (' + parts.join(', ') + ')'
        + (n.noshow ? ', and missed it ' + n.noshow + ' time' + (n.noshow === 1 ? '' : 's') : '') + '.</div>'
      : '<div style="font-size:13.5px;color:var(--text-muted);margin-bottom:6px;">' + (n.noshow ? 'No changes asked for, but missed it ' + n.noshow + ' time' + (n.noshow === 1 ? '' : 's') + '.' : 'They have not changed their interview.') + '</div>';
    var list = s.ev.map(function (e) {
      var t = TONE[e.tone];
      return '<div style="display:flex;gap:10px;align-items:baseline;border-bottom:1px dashed var(--border);padding:7px 0;">'
        + '<span style="flex:0 0 96px;font-size:12px;color:var(--text-muted);">' + esc(day(e.at)) + '</span>'
        + '<span style="flex:1;font-size:13.5px;">'
        + (t ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + t[0] + ';margin-right:7px;vertical-align:middle;"></span>' : '')
        + esc(e.what) + (e.why ? '<div class="field-note" style="margin-top:2px;">Why: ' + esc(e.why) + '</div>' : '') + '</span></div>';
    }).join('');
    var foot = '<div class="field-note" style="margin-top:8px;">Counted against them: cancels and moves they asked for, online, by text or by phone. '
      + 'Changes the office made for its own reasons are listed but not counted.'
      + (n.unknown ? ' ' + n.unknown + ' older office change' + (n.unknown === 1 ? '' : 's') + ' from before we recorded who asked ' + (n.unknown === 1 ? 'is' : 'are') + ' not counted.' : '')
      + '</div>';
    return head + list + foot;
  }

  /* the Overview warning: two or more changes, or a change and a no-show */
  function flagHtml(s) {
    var n = s.n;
    if (!(n.asked >= 2 || (n.asked >= 1 && n.noshow >= 1))) return '';
    var red = n.asked >= 3 || n.noshow >= 1;
    var parts = [];
    if (n.cancels) parts.push('cancelled ' + n.cancels + ' time' + (n.cancels === 1 ? '' : 's'));
    if (n.moves) parts.push('moved ' + n.moves + ' time' + (n.moves === 1 ? '' : 's'));
    if (n.noshow) parts.push('missed it ' + n.noshow + ' time' + (n.noshow === 1 ? '' : 's'));
    return '<div style="margin-top:12px;background:' + (red ? '#FEE2E2' : '#FEF3C7') + ';border:1px solid ' + (red ? '#FCA5A5' : '#FCD34D')
      + ';border-radius:9px;padding:10px 12px;font-size:13px;color:' + (red ? '#991B1B' : '#92400E') + ';">'
      + '<b>🔁 Changed their interview ' + n.asked + ' time' + (n.asked === 1 ? '' : 's') + '</b>'
      + '<div style="margin-top:4px;">They ' + parts.join(', ') + '. That can be a pattern of unreliability. '
      + 'Every change, with dates and who asked, is on the Interview tab under Interview history.</div></div>';
  }

  function paint(r) {
    var c = CACHE[String(r.id)];
    var host = document.getElementById('apIvHist'), flag = document.getElementById('apIvFlag');
    if (!c) return;
    if (c.error) {
      if (host) host.innerHTML = '<div class="field-note" style="color:var(--red);">Could not read their interview history: ' + esc(c.error) + '. Refresh the page.</div>';
      return;
    }
    var s = summary(c.rows);
    if (host) host.innerHTML = cardHtml(s);
    if (flag) flag.innerHTML = flagHtml(s);
  }

  async function mount(r) {
    if (!r || typeof sb === 'undefined') return;
    var key = String(r.id);
    if (CACHE[key]) paint(r);
    try {
      var res = await sb.from('interview_bookings').select('*').in('applicant_id', personIds(r)).order('created_at', { ascending: true }).limit(500);
      if (res.error) throw res.error;
      CACHE[key] = { rows: res.data || [], at: Date.now() };
    } catch (e) {
      CACHE[key] = { error: String((e && e.message) || e) };
    }
    if (typeof AP_PROF !== 'undefined' && AP_PROF && String(AP_PROF.id) === key) paint(r);
  }

  /* after the office moves or cancels: who in the office did it, on the booking just closed */
  async function stamp(id, how) {
    var r = rowsAll().find(function (x) { return String(x.id) === String(id); }) || { id: id };
    var me = (typeof ME !== 'undefined' && ME && (ME.name || ME.email)) || 'the office';
    try {
      var q = sb.from('interview_bookings').select('id').in('applicant_id', personIds(r)).eq('status', 'cancelled').is('office_user', null);
      q = how === 'move' ? q.eq('cancelled_by', 'reschedule') : q.neq('cancelled_by', 'reschedule');
      var f = await q.order('cancelled_at', { ascending: false }).limit(1);
      if (f.error) throw f.error;
      if (!f.data || !f.data.length) return false;
      var u = await sb.from('interview_bookings').update({ office_user: me }).eq('id', f.data[0].id);
      if (u.error) throw u.error;
      return true;
    } catch (e) {
      console.warn('[interview history] could not record who in the office made the change:', e && e.message || e);
      return false;
    }
  }

  window.IVH = { mount: mount, count: count, stamp: stamp, personIds: personIds, _describe: describe, _summary: summary, _flag: flagHtml, _card: cardHtml };
})();
