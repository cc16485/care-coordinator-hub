/* =============================================================================
   confirm-times.js · "Call <client> to confirm <caregiver>'s times" (2026-10-17)
   Samantha: "just have the policy that we call the client to confirm a caregivers time or arrival departure if they
   didnt clock out". The EVV correction form is retired and the EVV tab is gone. A visit missing its clock-in or
   clock-out becomes ONE Needs Attention card (kind confirm_times, made on the server by timekeeper-watch and the
   overnight check in coverage-watch, _shared/confirm-times.ts). On the card a person:
     1. taps Call (rings their phone, connects from the office line: office-call.js),
     2. records the call: who they spoke with, what the client said, the times the client gave, notes,
     3. corrects the visit in AxisCare by hand and ticks "Fixed in AxisCare", which closes the card.
   Nobody outside the office is ever contacted from here. The SOP is Procedures > "Missed clock-in or clock-out:
   confirm the times with the client". Everything is saved on the card itself (ops_items), with its history.
   CftRules is the pure part (tests/confirm-times-test.js); the rest draws the card's buttons and the record box.
   ============================================================================= */
(function (root) {
  var REL = [['client', 'The client'], ['daughter', 'Daughter'], ['son', 'Son'], ['spouse', 'Spouse'], ['other_family', 'Other family'], ['other', 'Someone else']];
  var OUTCOMES = { confirmed: 'Confirmed the times', not_there: 'Says the caregiver was not there', unsure: 'Could not confirm' };
  var e = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var hm12 = function (t) { var m = /^(\d{1,2}):(\d{2})/.exec(String(t || '')); if (!m) return String(t || ''); var h = +m[1]; return ((h + 11) % 12 + 1) + (m[2] === '00' ? '' : ':' + m[2]) + (h < 12 ? ' AM' : ' PM'); };
  var first = function (n) { return String(n || '').trim().split(/\s+/)[0] || 'the caregiver'; };
  var needs = function (it) { var m = it && it.missing; return { arrival: m === 'in' || m === 'both' || !m, departure: m === 'out' || m === 'both' || !m }; };

  var CftRules = {
    OUTCOMES: OUTCOMES, REL: REL, needs: needs, hm12: hm12,
    /** The call record from the box's answers, or the reason it can't be saved yet. */
    record: function (it, a, by, at) {
      a = a || {};
      var n = needs(it), spoke = String(a.spoke_with || '').trim(), rel = String(a.relationship || ''), out = String(a.outcome || '');
      var arr = String(a.arrival || '').trim(), dep = String(a.departure || '').trim(), notes = String(a.notes || '').trim();
      if (!spoke) return { ok: false, why: 'Who did you speak with?' };
      if (!REL.some(function (r) { return r[0] === rel; })) return { ok: false, why: 'Pick how they are related to the client.' };
      if (!OUTCOMES[out]) return { ok: false, why: 'Pick what they told you.' };
      if (out === 'confirmed') {
        if (n.arrival && !/^\d{2}:\d{2}$/.test(arr)) return { ok: false, why: 'Put in the arrival time they gave you.' };
        if (n.departure && !/^\d{2}:\d{2}$/.test(dep)) return { ok: false, why: 'Put in the departure time they gave you.' };
      }
      if (out !== 'confirmed' && !notes) return { ok: false, why: 'Add a note: what did they say?' };
      return { ok: true, rec: { spoke_with: spoke.slice(0, 120), relationship: rel, outcome: out,
        arrival: out === 'confirmed' && n.arrival ? arr : null, departure: out === 'confirmed' && n.departure ? dep : null,
        notes: notes.slice(0, 1000), by: String(by || ''), at: String(at || new Date().toISOString()) } };
    },
    /** One line for the card and its history. */
    words: function (it, r) {
      if (!r) return '';
      var relW = (REL.find(function (x) { return x[0] === r.relationship; }) || [, ''])[1].toLowerCase();
      var who = e(r.spoke_with) + (r.relationship && r.relationship !== 'client' ? ' (' + e(relW) + ')' : '');
      var cg = first(it && it.caregiver);
      if (r.outcome === 'confirmed') {
        var t = [r.arrival ? 'arrived ' + hm12(r.arrival) : '', r.departure ? 'left ' + hm12(r.departure) : ''].filter(Boolean).join(', ');
        return 'Called ' + who + ': confirmed ' + e(cg) + ' ' + t + '.';
      }
      if (r.outcome === 'not_there') return 'Called ' + who + ': says ' + e(cg) + ' was not there. Times not changed.';
      return 'Called ' + who + ': could not confirm the times. Times not changed.';
    },
    /** What closing the card needs: a confirmed call before "Fixed in AxisCare"; otherwise a call on record. */
    canFix: function (it) { return !!(it && it.confirm && it.confirm.outcome === 'confirmed'); },
    canClose: function (it) { return !!(it && it.confirm && it.confirm.outcome !== 'confirmed'); }
  };
  root.CftRules = CftRules;
  if (typeof document === 'undefined') return;   // tests load the rules only

  /* DATA is a top-level let in index.html: shared by name between the page's scripts, but not a window property */
  var find = function (id) { return (((typeof DATA !== 'undefined' && DATA) ? DATA.ops_items : null) || []).find(function (x) { return x && x.id === id; }) || null; };
  var btn = function (on, label, primary) { return '<button class="' + (primary ? 'primary' : 'ghost') + '" style="padding:5px 11px;font-size:12px;" onclick="' + on + '">' + label + '</button>'; };

  /** The card's buttons (Needs Attention, My Work, Today). */
  root.ccCftActions = function (it) {
    var id = e(String(it.id)), c = it.confirm, cl = e(it.client_first || 'the client');
    var call = it.client_axiscare_id && typeof root.ocAttrs === 'function'
      ? '<a style="padding:5px 11px;font-size:12px;font-weight:700;text-decoration:none;display:inline-block;border-radius:6px;background:var(--teal,#54BDB8);color:#fff;"' + root.ocAttrs('', { client: String(it.client_axiscare_id) }) + '>📞 Call ' + cl + '</a>' : '';
    var tries = (it.no_answer || []).length;
    var h = '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">';
    if (!c) {
      h += call + btn("ccCftOpen('" + id + "',this)", 'Record the call', !call) + btn("ccCftNoAnswer('" + id + "')", 'No answer')
        + '<span class="field-note">Let them tell you the times.' + (tries ? ' No answer ' + tries + ' time' + (tries === 1 ? '' : 's') + ' so far.' : '') + '</span>';
    } else {
      h += '<span class="field-note" style="flex-basis:100%;">' + CftRules.words(it, c) + '</span>';
      if (CftRules.canFix(it)) h += btn("ccCftFixed('" + id + "')", '✓ Fixed in AxisCare', true) + '<span class="field-note">Correct the visit in AxisCare first.</span>';
      else {
        if (c.outcome === 'not_there') h += btn("switchTab('cgattendance')", 'Record the call-off or no-show');
        h += btn("ccCftClose('" + id + "')", 'Done', c.outcome !== 'not_there');
      }
      h += btn("ccCftOpen('" + id + "',this)", 'Change');
    }
    return h + '</div>';
  };

  root.ccCftOpen = function (id, anchor) {
    var it = find(id); if (!it) return;
    var n = needs(it), c = it.confirm || {}, cg = first(it.caregiver), cl = e(it.client_first || 'the client');
    var sched = it.shift_time ? hm12(it.shift_time) + (it.shift_end ? ' to ' + hm12(it.shift_end) : '') : '';
    var opt = function (v, l, cur) { return '<option value="' + v + '"' + (cur === v ? ' selected' : '') + '>' + e(l) + '</option>'; };
    var radio = function (v) { return '<label style="display:flex;gap:6px;align-items:center;font-size:13px;margin:3px 0;"><input type="radio" name="cftOut" value="' + v + '"' + (c.outcome === v ? ' checked' : '') + ' onchange="ccCftSync()" style="width:auto;margin:0;"> ' + e(OUTCOMES[v].replace('the caregiver', cg)) + '</label>'; };
    root.ccPopOpen(anchor || document.body,
      '<div style="font-size:14px;font-weight:800;color:var(--navy);">Record the call</div>'
      + '<div class="field-note" style="margin:3px 0 8px;">' + e(it.caregiver || '') + ' with ' + cl + (it.shift_date ? ', ' + e(it.shift_date) : '') + (sched ? ', scheduled ' + e(sched) : '') + '. Ask what time ' + e(cg) + ' got there and left, and let them tell you.</div>'
      + '<label class="field-note">Who did you speak with?</label><input id="cftWith" value="' + e(c.spoke_with || '') + '" placeholder="Name" style="margin-bottom:6px;">'
      + '<select id="cftRel" style="margin-bottom:8px;">' + opt('', 'How are they related?', c.relationship || '') + REL.map(function (r) { return opt(r[0], r[1], c.relationship || ''); }).join('') + '</select>'
      + '<div class="field-note">What did they tell you?</div>' + radio('confirmed') + radio('not_there') + radio('unsure')
      + '<div id="cftTimes" style="display:' + (c.outcome === 'confirmed' ? 'flex' : 'none') + ';gap:10px;margin:6px 0;">'
      + (n.arrival ? '<label class="field-note" style="flex:1;">Arrived<input id="cftArr" type="time" value="' + e(c.arrival || '') + '"></label>' : '')
      + (n.departure ? '<label class="field-note" style="flex:1;">Left<input id="cftDep" type="time" value="' + e(c.departure || '') + '"></label>' : '') + '</div>'
      + '<label class="field-note">Notes</label><textarea id="cftNotes" rows="2" style="margin-bottom:6px;">' + e(c.notes || '') + '</textarea>'
      + '<div id="cftErr" class="field-note" style="color:var(--red);display:none;"></div>'
      + '<button class="primary" style="margin-top:6px;padding:6px 12px;font-size:12.5px;" onclick="ccCftSave(\'' + e(id) + '\')">Save the call</button>',
      { width: 380 });
  };
  root.ccCftSync = function () {
    var on = document.querySelector('input[name="cftOut"]:checked'), t = document.getElementById('cftTimes');
    if (t) t.style.display = on && on.value === 'confirmed' ? 'flex' : 'none';
  };
  var val = function (id) { var el = document.getElementById(id); return el ? el.value : ''; };
  var actor = function () { try { return root.ccActor(); } catch (x) { return { email: '', name: '' }; } };
  var after = function (it, line) {
    try { root.opsLog(it, line); } catch (x) { /* history is a nicety */ }
  };
  var save = async function (it, toast) {
    await root.persist('ops_items', it);
    try { root.ccToast(toast); } catch (x) { /* */ }
    try { root.myWorkRefresh(); } catch (x) { /* */ }
  };

  root.ccCftSave = async function (id) {
    var it = find(id); if (!it) return;
    var a = actor(), on = document.querySelector('input[name="cftOut"]:checked');
    var r = CftRules.record(it, { spoke_with: val('cftWith'), relationship: val('cftRel'), outcome: on ? on.value : '',
      arrival: val('cftArr'), departure: val('cftDep'), notes: val('cftNotes') }, a.email, new Date().toISOString());
    var err = document.getElementById('cftErr');
    if (!r.ok) { if (err) { err.textContent = r.why; err.style.display = 'block'; } return; }
    it.confirm = Object.assign({ by_name: a.name }, r.rec);
    after(it, CftRules.words(it, it.confirm).replace(/<[^>]+>/g, ''));
    try { root.opEvent('item_updated', { item: it, summary: (it.about || 'A caregiver') + ': ' + CftRules.words(it, it.confirm).replace(/&#39;/g, "'") }); } catch (x) { /* */ }
    try { root.ccPopClose(); } catch (x) { /* */ }
    await save(it, '✓ Call saved');
  };
  root.ccCftNoAnswer = async function (id) {
    var it = find(id); if (!it) return;
    var a = actor(), now = new Date().toISOString();
    it.no_answer = (it.no_answer || []).concat([{ at: now, by: a.email }]);
    after(it, 'Called ' + (it.client_first || 'the client') + ': no answer. Try again later today.');
    await save(it, 'Noted. Try again later today; the card stays open.');
  };
  var close = async function (it, note) {
    var a = actor(), now = new Date().toISOString();
    it.status = 'done'; it.closed_at = now; it.closed_by = a.email; it.close_note = note;
    after(it, note);
    try { root.opEvent('item_resolved', { item: it, summary: (it.about || 'A caregiver') + ': ' + note }); } catch (x) { /* */ }
    await save(it, '✓ ' + note);
  };
  root.ccCftFixed = async function (id) {
    var it = find(id); if (!it || !CftRules.canFix(it)) return;
    var a = actor(); it.axiscare_fixed_at = new Date().toISOString(); it.axiscare_fixed_by = a.email;
    await close(it, 'Fixed in AxisCare with the times ' + (it.client_first || 'the client') + ' confirmed');
  };
  root.ccCftClose = async function (id) {
    var it = find(id); if (!it || !CftRules.canClose(it)) return;
    await close(it, it.confirm.outcome === 'not_there' ? 'Client says the caregiver was not there; times not changed' : 'Could not confirm the times; times not changed');
  };
})(typeof window !== 'undefined' ? window : globalThis);
