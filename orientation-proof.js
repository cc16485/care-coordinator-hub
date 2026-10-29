/* =============================================================================
   orientation-proof.js · "no caregiver is approved to work without verified orientation, while recognizing legitimate
   historical training records" (Samantha 2026-10-28)
   =============================================================================
   1. ORIENTATION & TRAINING near the top of every caregiver's profile, whatever their payer: status, date, the certificate
      or document (opens in a new tab), who verified it and when, and the next step when it isn't verified:
        Make certificate (finished on the Training Platform, certificate never saved: made from that record, original date)
        Verify a past record (upload the completion document, its date, and confirm you looked at it; no retraining)
        Send orientation link (assigns orientation on the Training Platform if needed, then sends their personal link)
   2. NEEDS ORIENTATION PROOF at the top of Caregivers, Orientation & Training: everyone AxisCare itself says is Active whose
      orientation isn't verified, with the same buttons. The one-time cleanup list, and the daily audit's view.
   The server (orientation-proof) decides every state and keeps every record. Nobody is ever deactivated by the Hub.
   ============================================================================= */
(function () {
  'use strict';
  var FN = 'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/orientation-proof';
  var e = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (d) { return d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; };
  var LIST = null;
  var LABEL = { missing: 'No orientation on record', in_progress: 'Orientation not finished', needs_certificate: 'Finished, certificate not saved', needs_document: 'Date only, no document' };

  async function call(body) {
    var s = (await sb.auth.getSession()).data.session;
    if (!s) throw new Error('Sign in first.');
    var r = await fetch(FN, { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok || j.error) throw new Error(j.error || ('orientation-proof ' + r.status));
    return j;
  }
  function say(msg) { if (typeof ccAlert === 'function') ccAlert(msg); else alert(msg); }

  /* a document: a Training Platform file through the server, anything else the way the Hub always opened proofs */
  async function open(ref) {
    if (!ref) return;
    if (String(ref).indexOf('training:') === 0) {
      var w = window.open('about:blank', '_blank');
      try { var j = await call({ action: 'open', ref: ref }); if (w) w.location = j.url; else window.open(j.url, '_blank', 'noopener'); }
      catch (x) { if (w) w.close(); say('Could not open the document: ' + x.message); }
      return;
    }
    if (typeof bgrViewProof === 'function') return bgrViewProof(ref);
  }

  /* a rehire: an earlier Training record under the same name, offered for the office to confirm (never linked on its own) */
  function earlierHtml(st, ax) {
    return (st.earlier || []).map(function (x, i) {
      return '<div class="op-earlier">Earlier Training Platform record found: orientation completed ' + e(fmt(x.completed_at)) + ' · <a href="javascript:void 0" onclick="OP.open(\'' + e(x.document) + '\')">View document</a> · '
        + '<button class="fb" onclick="OP.useEarlier(\'' + e(ax) + '\',' + i + ',this)">Use this record</button></div>';
    }).join('');
  }
  var EARLIER = {};
  function actions(st, ax) {
    EARLIER[ax] = st.earlier || [];
    var b = [];
    if (st.can_make_certificate && st.state !== 'verified') b.push('<button class="fb" onclick="OP.make(\'' + e(ax) + '\',this)">Make certificate</button>');
    if (st.state === 'missing' || st.state === 'in_progress') b.push('<button class="fb" onclick="OP.link(\'' + e(ax) + '\',this)">Send orientation link</button>');
    if (st.state !== 'verified' && st.state !== 'needs_certificate') b.push('<button class="fb" onclick="OP.verifyOpen(\'' + e(ax) + '\')">Verify a past record</button>');
    return b.join(' ');
  }
  function statusLine(st) {
    if (st.state === 'verified' && st.proof && st.proof.kind === 'pre_axiscare')
      return '<span class="op-ok">✓ Completed before AxisCare</span> · <span class="field-note">hired ' + e(fmt(st.proof.date)) + '; every employee hired before AxisCare started completed orientation (confirmed by ' + e(st.proof.by) + ')</span>';
    if (st.state === 'verified') {
      var p = st.proof || {}, doc = p.kind === 'certificate' ? 'View certificate (PDF)' : 'View document';
      var src = p.kind === 'certificate' ? 'Training Platform certificate' : p.kind === 'training_doc' ? 'completion document entered on the Training Platform' + (p.by && p.by !== 'Training Platform admin' ? ' by ' + e(p.by) : '')
        : 'historical record, verified by ' + e(p.by) + (p.at ? ' on ' + fmt(p.at) : '');
      return '<span class="op-ok">✓ Completed ' + e(fmt(st.date)) + '</span> · <a href="javascript:void 0" onclick="OP.open(\'' + e(p.ref) + '\')">' + doc + '</a> · <span class="field-note">' + src + '</span>';
    }
    return '<span class="op-bad">⚠ ' + e(LABEL[st.state] || st.why) + '</span>' + (st.date ? ' <span class="field-note">(date on record: ' + e(fmt(st.date)) + ')</span>' : '') + '<div class="field-note">' + e(st.why) + '</div>';
  }

  /* 1. the profile section */
  async function profile(ax, g) {
    var box = document.getElementById('cgdOrient'); if (!box) return;
    box.innerHTML = '<div class="card op-card"><h3>Orientation &amp; Training</h3><div class="field-note">Checking…</div></div>';
    var st;
    try { st = await call({ action: 'status', axiscare_id: String(ax) }); }
    catch (x) { box.innerHTML = '<div class="card op-card"><h3>Orientation &amp; Training</h3><div class="field-note" style="color:var(--red);">Could not check orientation: ' + e(x.message) + '</div></div>'; return; }
    if (String(CGD && CGD.openId) !== String(ax)) return;
    var opt = [];
    if (g && g.alz_date) opt.push('Dementia care ' + fmt(g.alz_date) + (g.alz_proof ? ' · <a href="javascript:void 0" onclick="OP.open(\'' + e(g.alz_proof) + '\')">document</a>' : ''));
    if (g && g.ojt_online) opt.push('On-the-job skills ' + fmt(g.ojt_online) + (g.ojt_online_proof ? ' · <a href="javascript:void 0" onclick="OP.open(\'' + e(g.ojt_online_proof) + '\')">document</a>' : ''));
    var act = actions(st, ax);
    box.innerHTML = '<div class="card op-card' + (st.state === 'verified' ? '' : ' op-attn') + '"><h3>Orientation &amp; Training</h3>'
      + '<div class="op-row"><b>Agency Orientation</b> <span class="field-note">(required before working)</span><div>' + statusLine(st) + '</div></div>'
      + earlierHtml(st, ax)
      + (act ? '<div class="op-acts">' + act + '<span class="field-note" id="opSt_' + e(ax) + '"></span></div>' : '')
      + (opt.length ? '<div class="field-note" style="margin-top:8px;">Optional training: ' + opt.join(' · ') + '</div>' : '')
      + (st.excluded ? '<div class="field-note" style="margin-top:6px;">Left out of the orientation audit (office staff or not a caregiver).</div>' : '')
      + '</div>';
  }

  /* 2. the cleanup list */
  async function cleanup() {
    var box = document.getElementById('tr-orient'); if (!box) return;
    box.innerHTML = '<div class="field-note">Checking orientation for everyone Active in AxisCare…</div>';
    try { LIST = await call({ action: 'list' }); }
    catch (x) { box.innerHTML = '<div class="field-note" style="color:var(--red);">Could not check orientation: ' + e(x.message) + '</div>'; return; }
    var rows = (LIST.flagged || []).map(function (f) {
      return '<tr><td><a href="javascript:void 0" onclick="OP.profileOf(\'' + e(f.axiscare_id) + '\')">' + e(f.name) + '</a></td><td>' + e(LABEL[f.state] || f.state) + (f.date ? '<div class="field-note">date on record ' + e(fmt(f.date)) + '</div>' : '') + '</td>'
        + '<td class="field-note">' + e(f.why) + earlierHtml(f, f.axiscare_id) + '</td><td>' + actions(f, f.axiscare_id) + '<span class="field-note" id="opSt_' + e(f.axiscare_id) + '"></span></td></tr>';
    }).join('');
    var s = LIST.settings || {};
    box.innerHTML = '<div class="card op-card' + ((LIST.flagged || []).length ? ' op-attn' : '') + '"><h3>Needs orientation proof</h3>'
      + '<div class="field-note">Everyone AxisCare says is Active, checked for verified orientation: ' + LIST.checked + ' checked, ' + LIST.verified + ' verified, ' + LIST.excluded + ' left out (office staff, the placeholder). Nobody is deactivated automatically.</div>'
      + ((LIST.flagged || []).length ? '<div style="overflow-x:auto;"><table class="op-table"><thead><tr><th>Caregiver</th><th>What\'s missing</th><th>Why</th><th>Resolve</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="op-ok" style="margin-top:8px;">✓ Everyone Active has verified orientation.</div>')
      + '<div class="field-note" style="margin-top:8px;">Switches: daily audit cards ' + (s.audit ? 'ON' : 'off') + ' · make missing certificates automatically ' + (s.autogen ? 'ON' : 'off') + ' · Approve to Work requires verified orientation ' + (s.gate ? 'ON' : 'off') + ' (Settings, Orientation proof).</div></div>';
  }
  function refresh(ax) { var p = document.getElementById('cgdOrient'); if (p && CGD && String(CGD.openId) === String(ax)) profile(ax, typeof cgdLegacyFor === 'function' ? cgdLegacyFor(ax) : null); if (document.getElementById('tr-orient')) cleanup(); }

  /* the past-record dialog */
  function verifyOpen(ax) {
    var old = document.getElementById('opVerify'); if (old) old.remove();
    var d = document.createElement('div'); d.id = 'opVerify'; d.className = 'op-modal';
    d.innerHTML = '<div class="op-box"><h3 style="margin-top:0;">Verify a past orientation record</h3>'
      + '<div class="field-note">For orientation done another way (an office session, a paper form, an older system). No retraining needed.</div>'
      + '<label>The completion document (PDF or photo)</label><input type="file" id="opVFile" accept=".pdf,image/*">'
      + '<label>The date it shows orientation was completed</label><input type="date" id="opVDate">'
      + '<label>Note (optional)</label><input id="opVNote" placeholder="For example: in-person orientation, paper sign-in sheet">'
      + '<label style="display:flex;gap:8px;align-items:flex-start;font-weight:600;margin-top:10px;"><input type="checkbox" id="opVAtt" style="width:auto;margin-top:3px;"> I looked at this document and it shows orientation was completed.</label>'
      + '<div style="display:flex;gap:8px;margin-top:12px;"><button class="primary" id="opVSave">Save</button><button class="fb" onclick="document.getElementById(\'opVerify\').remove()">Cancel</button><span class="field-note" id="opVErr" style="color:var(--red);"></span></div></div>';
    document.body.appendChild(d);
    document.getElementById('opVSave').onclick = function () { verifySave(ax, this); };
  }
  async function verifySave(ax, btn) {
    var err = document.getElementById('opVErr'), file = (document.getElementById('opVFile').files || [])[0], date = document.getElementById('opVDate').value;
    var att = document.getElementById('opVAtt').checked, note = document.getElementById('opVNote').value;
    if (!file) { err.textContent = 'Choose the document first.'; return; }
    if (!date) { err.textContent = 'Enter the date it shows.'; return; }
    if (!att) { err.textContent = 'Confirm you looked at the document.'; return; }
    var g = typeof cgdLegacyFor === 'function' ? cgdLegacyFor(ax) : null;
    if (!g || g.id == null) { err.textContent = 'This caregiver has no Hub record to save it on yet.'; return; }
    btn.disabled = true; btn.textContent = 'Saving…';
    var path = 'training/' + String(g.id).replace(/[^a-zA-Z0-9_-]/g, '_') + '/orient-' + Date.now() + '-' + String(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    try { var up = await sb.storage.from('lead-docs').upload(path, file); if (up.error) throw up.error; }
    catch (x) { err.textContent = 'The upload did not go through, so nothing was saved: ' + (x.message || x); btn.disabled = false; btn.textContent = 'Save'; return; }
    try { await call({ action: 'verify_record', axiscare_id: String(ax), date: date, document: path, attest: true, note: note }); document.getElementById('opVerify').remove(); refresh(ax); }
    catch (x) { err.textContent = x.message; btn.disabled = false; btn.textContent = 'Save'; }
  }

  window.OP = {
    profile: profile, cleanup: cleanup, open: open, verifyOpen: verifyOpen,
    profileOf: function (ax) { try { gotoTab('cgdir'); setTimeout(function () { cgdOpenProfile(String(ax)); }, 300); } catch (x) { /* */ } },
    useEarlier: async function (ax, i, btn) {
      var x = (EARLIER[ax] || [])[i]; if (!x) return;
      if (typeof ccConfirm === 'function' && !(await ccConfirm('Use the earlier orientation record (completed ' + fmt(x.completed_at) + ')?\n\nConfirm you looked at this document and it shows this same person completed orientation.'))) return;
      if (btn) btn.disabled = true;
      try { await call({ action: 'verify_record', axiscare_id: String(ax), date: x.completed_at, document: x.document, attest: true, note: 'Rehire: earlier Training Platform record' }); refresh(ax); }
      catch (err) { say(err.message); if (btn) btn.disabled = false; }
    },
    make: async function (ax, btn) {
      if (typeof ccConfirm === 'function' && !(await ccConfirm('Make the orientation certificate from their Training Platform completion?\n\nIt keeps the original completion date and says it was made from that record today.'))) return;
      var st = document.getElementById('opSt_' + ax); if (btn) btn.disabled = true;
      try { await call({ action: 'make_certificate', axiscare_id: String(ax) }); refresh(ax); }
      catch (x) { if (st) st.textContent = x.message; if (btn) btn.disabled = false; }
    },
    link: async function (ax, btn) {
      if (typeof ccConfirm === 'function' && !(await ccConfirm('Send their orientation link? Orientation is assigned on the Training Platform if it isn\'t yet, and they get a text and email with their personal link.'))) return;
      var st = document.getElementById('opSt_' + ax); if (btn) btn.disabled = true;
      try { var r = await call({ action: 'send_link', axiscare_id: String(ax) }); if (st) st.textContent = 'Sent' + ((r.channels || []).length ? ' by ' + r.channels.join(' and ') : '') + ((r.not_sent || []).length ? '. Not sent: ' + r.not_sent.join('; ') : '') + '.'; }
      catch (x) { if (st) st.textContent = x.message; if (btn) btn.disabled = false; }
    },
    _list: function () { return LIST; }
  };
})();
