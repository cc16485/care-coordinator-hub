/* family-app-panel.js (global window.FAMAPP; the Hub already has a const FAM, a cache) · The office side of the Caring Companions family app (family.mo-care.com). Step 1c of the
   booking plan approved 2026-10-15.
   - FAMAPP.circleLine(member, ctx): the "Family app" line under each Family Circle person on the client profile:
     Invite to the app / booking on-off / turn off. Invite never sends anything: it shows the words for a person to send.
   - FAMAPP.render(): Scheduling > Family bookings: every app booking, what needs the office, and the two office actions
     (put it on the AxisCare schedule, place a caregiver).
   All writes go through the Hub server door family-app-office (office staff only). */
(function () {
  'use strict'
  var e = function (s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
  var ctxs = {}   // px -> { reload }
  function call(body) { return window.callAction('family-app-office', body).then(function (r) { if (!r.data || r.status >= 400) throw new Error((r.data && r.data.error) || ('The family app door answered ' + r.status)); return r.data }) }
  function t12(hhmm) { var p = String(hhmm || '').split(':'), h = Number(p[0]); if (isNaN(h)) return ''; return ((h + 11) % 12 + 1) + ':' + (p[1] || '00') + ' ' + (h < 12 ? 'AM' : 'PM') }
  function day(d) { return new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }) }
  function settings() { return (window.DATA && window.DATA.ops_settings) || {} }

  // ── Family Circle line ──────────────────────────────────────────────────────────────────────────────────────────
  function circleLine(m, px) {
    var id = Number(m.id), st = m.app_status
    var btn = function (label, js, cls) { return '<button class="btn ' + (cls || 'btn-ghost') + ' btn-sm" style="padding:2px 9px;font-size:12px;" onclick="' + js + '">' + label + '</button>' }
    var head = '<div class="fam-line" id="fam-' + e(px) + '-' + id + '" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:3px;font-size:12.5px;">'
    if (st === 'active') {
      return head + '<span style="color:var(--green);font-weight:600;">Family app: on</span><span class="field-note">' + (m.app_can_book ? 'can book visits' : 'can see visits, can\'t book') + '</span>' +
        btn(m.app_can_book ? 'Turn booking off' : 'Turn booking on', "FAMAPP.act('can_book'," + id + ",'" + e(px) + "'," + (!m.app_can_book) + ")") +
        btn('Send welcome', "FAMAPP.welcome(" + id + ",'" + e(px) + "')", 'btn-primary') +
        btn('Turn app off', "FAMAPP.act('revoke'," + id + ",'" + e(px) + "')") + '</div>'
    }
    if (st === 'revoked') return head + '<span class="field-note">Family app: turned off</span>' + btn('Turn on again', "FAMAPP.act('invite'," + id + ",'" + e(px) + "')") + '</div>'
    if (m.stopped_at || m.axiscare_removed_at) return ''
    if (!m.email) return head + '<span class="field-note">Family app: add an email to invite them</span></div>'
    return head + btn('Invite to the family app', "FAMAPP.act('invite'," + id + ",'" + e(px) + "')", 'btn-primary') + '</div>'
  }
  function act(action, contactId, px, on) {
    var line = document.getElementById('fam-' + px + '-' + contactId)
    if (action === 'revoke' && line && !line.dataset.sure) { line.dataset.sure = '1'; line.insertAdjacentHTML('beforeend', '<span class="fam-sure" style="color:#B45309;font-weight:600;">They won\'t be able to see anything. Press Turn app off again to confirm.</span>'); return Promise.resolve() }
    if (line) line.style.opacity = '.55'
    var body = { action: action, contact_id: contactId }
    if (action === 'can_book') body.on = !!on
    if (action === 'invite') body.can_book = true
    return call(body).then(function (d) {
      var c = ctxs[px]
      return Promise.resolve(c && c.reload ? c.reload() : null).then(function () {
        if (action === 'invite' && d.words) {
          var l2 = document.getElementById('fam-' + px + '-' + contactId)
          if (l2) l2.insertAdjacentHTML('afterend', '<div class="fam-words" style="background:var(--teal-pale,#EAF4F6);border-radius:8px;padding:8px 10px;margin:4px 0 6px;font-size:12.5px;">' +
            '<b>They can sign in now.</b> Nothing was sent. Press <b>Send welcome</b> to text and email them the steps, or send this yourself from the office line:<div style="margin:6px 0;padding:6px 8px;background:#fff;border-radius:6px;" id="famw-' + e(px) + '-' + contactId + '">' + e(d.words) + '</div>' +
            '<button class="btn btn-ghost btn-sm" style="font-size:12px;" onclick="FAMAPP.copy(\'famw-' + e(px) + '-' + contactId + '\', this)">Copy the words</button></div>')
        }
      })
    }).catch(function (err) {
      if (line) { line.style.opacity = ''; line.insertAdjacentHTML('beforeend', '<span style="color:var(--red,#b91c1c);font-weight:600;">' + e(err.message) + '</span>') }
    })
  }
  function copy(id, b) {
    var el = document.getElementById(id); if (!el) return
    var done = function () { b.textContent = 'Copied' }
    try { navigator.clipboard.writeText(el.textContent).then(done, function () { selectText(el) }) } catch (x) { selectText(el) }
  }
  function selectText(el) { var r = document.createRange(); r.selectNodeContents(el); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r) }

  // ── Welcome by text + email (her approved wording, 2026-10-15). A person presses Send; nothing goes on its own. ─────
  var W = {}
  function welcome(contactId, px) {
    var line = document.getElementById('fam-' + px + '-' + contactId); if (!line) return Promise.resolve()
    var old = document.getElementById('famwel-' + px + '-' + contactId); if (old) { old.remove(); return Promise.resolve() }
    line.insertAdjacentHTML('afterend', '<div class="fam-welcome" id="famwel-' + e(px) + '-' + contactId + '" style="border:1px solid var(--border,#e2e8f0);border-radius:8px;padding:10px;margin:4px 0 8px;font-size:12.5px;">Getting the welcome ready…</div>')
    return call({ action: 'welcome', contact_id: contactId }).then(function (d) {
      W[px + '-' + contactId] = d
      var box = document.getElementById('famwel-' + px + '-' + contactId)
      var axis = d.axis_email_on_file === true ? '<div style="color:var(--green,#15803d);">Their email is on AxisCare, so they can activate the AxisCare portal.</div>'
        : d.axis_email_on_file === false ? '<div style="color:#B45309;font-weight:600;">Their email isn\'t on their AxisCare record yet, so AxisCare\'s Activate account won\'t work for them. Add them as a responsible party in AxisCare first, or send without the AxisCare part.</div>'
        : '<div class="field-note">Couldn\'t check AxisCare just now.</div>'
      var how = [d.can_text ? 'text' : '', d.can_email ? 'email' : ''].filter(Boolean)
      box.innerHTML = '<b>Welcome for ' + e(d.name) + '</b>' + axis +
        '<label style="display:flex;gap:6px;align-items:center;margin:6px 0;"><input type="checkbox" id="famwax-' + e(px) + '-' + contactId + '"' + (d.include_axis ? ' checked' : '') + ' onchange="FAMAPP.welcomeAxis(' + contactId + ',\'' + e(px) + '\', this.checked)"> Include the AxisCare portal steps (calendar, care notes, invoices)</label>' +
        '<div class="field-note">The text (you can change it):</div><textarea id="famwt-' + e(px) + '-' + contactId + '" rows="5" style="width:100%;font-size:13px;">' + e(d.text) + '</textarea>' +
        '<div class="field-note" style="margin:4px 0;">Email: "' + e(d.email_subject) + '" with the same steps and buttons.</div>' +
        '<div class="field-note">' + (how.length ? 'Goes by ' + how.join(' and ') + (d.can_text ? '' : ' (no text: no phone with Texts OK)') : 'No way to reach them: add an email, or a phone with Texts OK.') + '</div>' +
        (how.length ? '<div style="margin-top:6px;display:flex;gap:6px;"><button class="btn btn-primary btn-sm" onclick="FAMAPP.welcomeSend(' + contactId + ',\'' + e(px) + '\', this)">Send welcome</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="FAMAPP.welcome(' + contactId + ',\'' + e(px) + '\')">Cancel</button></div>' : '') +
        '<div class="fam-wmsg" style="margin-top:4px;"></div>'
    }).catch(function (err) { var box = document.getElementById('famwel-' + px + '-' + contactId); if (box) box.innerHTML = '<span style="color:#b91c1c;">' + e(err.message) + '</span>' })
  }
  function welcomeAxis(contactId, px, on) {
    var d = W[px + '-' + contactId], ta = document.getElementById('famwt-' + px + '-' + contactId); if (!d || !ta) return
    var from = on ? d.text_without_axis : d.text_with_axis, to = on ? d.text_with_axis : d.text_without_axis
    if (ta.value.trim() === from.trim()) ta.value = to   // only swap words the office hasn't changed
  }
  function welcomeSend(contactId, px, b) {
    var ta = document.getElementById('famwt-' + px + '-' + contactId), ax = document.getElementById('famwax-' + px + '-' + contactId)
    var box = document.getElementById('famwel-' + px + '-' + contactId), msg = box && box.querySelector('.fam-wmsg')
    if (!ta || !ta.value.trim()) { if (msg) msg.innerHTML = '<span style="color:#b91c1c;">The text is empty.</span>'; return Promise.resolve() }
    b.disabled = true; b.textContent = 'Sending…'
    return call({ action: 'welcome', contact_id: contactId, send: true, text: ta.value.trim(), include_axis: !!(ax && ax.checked) }).then(function (d) {
      box.innerHTML = '<span style="color:var(--green,#15803d);font-weight:600;">Sent by ' + [d.by_text ? 'text' : '', d.by_email ? 'email' : ''].filter(Boolean).join(' and ') + '.</span> It\'s saved in this Family Circle\'s messages.'
    }).catch(function (err) { b.disabled = false; b.textContent = 'Send welcome'; if (msg) msg.innerHTML = '<span style="color:#b91c1c;">' + e(err.message) + '</span>' })
  }

  // ── Scheduling > Family bookings ─────────────────────────────────────────────────────────────────────────────────
  var STATUS = {
    received: ['Saving', '#B45309'], needs_office: ['Needs the office', '#b91c1c'], practice: ['Practice (not on the schedule)', '#6b7280'],
    waiting_for_caregiver: ['On the schedule, needs a caregiver', '#B45309'], placed: ['Caregiver placed', 'var(--green,#15803d)'], cancelled: ['Cancelled', '#6b7280']
  }
  function caregiverOptions() {
    var list = ((window.DATA && window.DATA.caregivers) || []).filter(function (g) { return g && g.axiscare_id && g.active !== false })
    list.sort(function (a, b) { return String(a.first || '').localeCompare(String(b.first || '')) })
    var seen = {}
    return list.filter(function (g) { var k = String(g.axiscare_id); if (seen[k]) return false; seen[k] = 1; return true })
      .map(function (g) { return '<option value="' + e(g.axiscare_id) + '">' + e([g.first, g.last].filter(Boolean).join(' ')) + '</option>' }).join('')
  }
  function bookingCard(b, today) {
    var s = STATUS[b.status] || [b.status, '#6b7280']
    var acts = ''
    if (['needs_office', 'practice', 'received'].indexOf(b.status) >= 0 && !b.axiscare_visit_id && b.visit_date >= today)
      acts = '<button class="btn btn-primary btn-sm" onclick="FAMAPP.schedule(\'' + e(b.id) + '\', this)">Put it on the AxisCare schedule</button>'
    if (b.status === 'waiting_for_caregiver')
      acts = '<select id="famcg-' + e(b.id) + '" style="max-width:220px;"><option value="">Pick a caregiver…</option>' + caregiverOptions() + '</select> ' +
        '<button class="btn btn-primary btn-sm" onclick="FAMAPP.place(\'' + e(b.id) + '\', this)">Place on this visit</button>'
    return '<div class="card" style="padding:12px 14px;margin-bottom:8px;" id="famb-' + e(b.id) + '">' +
      '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;"><b>' + e(b.client_name || 'Client') + ' · ' + e(day(b.visit_date)) + ', ' + e(t12(b.start_time)) + ' to ' + e(t12(b.end_time)) + '</b>' +
      '<span style="font-weight:700;color:' + s[1] + ';">' + e(s[0]) + (b.caregiver_name ? ': ' + e(b.caregiver_name) : '') + '</span></div>' +
      '<div class="field-note">' + e(Number(b.hours)) + ' hours · ' + e((b.tasks || []).join(', ')) + ' · booked by ' + e(b.requested_by_name || 'family') +
        (b.who === 'regular' ? ' · wants the regular caregiver' : b.who === 'favorites' ? ' · someone she knows' : '') + (b.state ? ' · ' + e(b.state) : '') + '</div>' +
      (b.note ? '<div style="margin-top:4px;font-size:13px;">Note: ' + e(b.note) + '</div>' : '') +
      (b.error && b.status !== 'placed' ? '<div style="margin-top:4px;font-size:12.5px;color:#b91c1c;">' + e(b.error) + '</div>' : '') +
      (acts ? '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">' + acts + '</div>' : '') +
      '<div class="fam-msg" style="font-size:12.5px;margin-top:4px;"></div></div>'
  }
  function settingsBox() {
    var o = settings(), live = o.family_app_live === true
    var rate = function (st) { return o['family_app_rate_' + st] ? '$' + e(o['family_app_rate_' + st]) + '/hr' : 'not set (no estimate shown)' }
    var svc = function (st) { return o['family_app_service_' + st] ? e(o['family_app_service_' + st]) : 'not set (bookings come to you instead)' }
    return '<div class="card" style="padding:12px 14px;margin-bottom:12px;background:' + (live ? '#fff' : '#FBF0DD') + ';">' +
      '<b>' + (live ? 'Live: family bookings go on the AxisCare schedule.' : 'Practice mode: family bookings are recorded here but NOT put on the AxisCare schedule.') + '</b>' +
      '<div class="field-note" style="margin-top:4px;">App address: <a href="https://family.mo-care.com" target="_blank" rel="noopener">family.mo-care.com</a> · ' +
      'Missouri: service ' + svc('MO') + ', rate ' + rate('MO') + ' · Oklahoma: service ' + svc('OK') + ', rate ' + rate('OK') + '. Ask Claude to change these.</div></div>'
  }
  function render() {
    var box = document.getElementById('famBookings'); if (!box) return Promise.resolve()
    box.innerHTML = '<div class="field-note">Loading family bookings…</div>'
    return call({ action: 'list' }).then(function (d) {
      var today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      var bs = d.bookings || [], ms = d.members || []
      var open = bs.filter(function (b) { return ['needs_office', 'received', 'waiting_for_caregiver'].indexOf(b.status) >= 0 && b.visit_date >= today })
      var placed = bs.filter(function (b) { return b.status === 'placed' && b.visit_date >= today })
      var other = bs.filter(function (b) { return open.indexOf(b) < 0 && placed.indexOf(b) < 0 })
      var on = ms.filter(function (m) { return m.status === 'active' })
      box.innerHTML = settingsBox() +
        '<h3 style="margin:6px 0;">Needs you (' + open.length + ')</h3>' + (open.length ? open.map(function (b) { return bookingCard(b, today) }).join('') : '<div class="field-note" style="margin-bottom:10px;">Nothing waiting. Every family booking has a caregiver.</div>') +
        '<h3 style="margin:12px 0 6px;">Coming up, caregiver placed (' + placed.length + ')</h3>' + (placed.length ? placed.map(function (b) { return bookingCard(b, today) }).join('') : '<div class="field-note">None yet.</div>') +
        (other.length ? '<details style="margin-top:12px;"><summary>Practice, cancelled and past (' + other.length + ')</summary>' + other.map(function (b) { return bookingCard(b, today) }).join('') + '</details>' : '') +
        '<h3 style="margin:16px 0 6px;">Families using the app (' + on.length + ')</h3>' +
        (on.length ? '<div class="field-note">' + on.map(function (m) { return e(m.name) + ' for ' + e(m.client_name || '?') + (m.can_book ? '' : ' (view only)') }).join(' · ') + '</div>'
                   : '<div class="field-note">Nobody yet. Invite someone from the Care circle card on a client\'s profile.</div>')
      if (window.updateFamBadge) window.updateFamBadge(open.length)
    }).catch(function (err) { box.innerHTML = '<div class="field-note" style="color:#b91c1c;">' + e(err.message) + '</div>' })
  }
  function rowMsg(id, html) { var c = document.getElementById('famb-' + id); var m = c && c.querySelector('.fam-msg'); if (m) m.innerHTML = html }
  function schedule(id, b) {
    b.disabled = true; b.textContent = 'Putting it on the schedule…'
    return call({ action: 'schedule', booking_id: id }).then(render).catch(function (err) { b.disabled = false; b.textContent = 'Put it on the AxisCare schedule'; rowMsg(id, '<span style="color:#b91c1c;">' + e(err.message) + '</span>') })
  }
  function place(id, b) {
    var sel = document.getElementById('famcg-' + id), cg = sel && sel.value
    if (!cg) { rowMsg(id, '<span style="color:#b91c1c;">Pick a caregiver first.</span>'); return Promise.resolve() }
    b.disabled = true; b.textContent = 'Placing…'
    return call({ action: 'place', booking_id: id, caregiver_axiscare_id: cg }).then(render).catch(function (err) { b.disabled = false; b.textContent = 'Place on this visit'; rowMsg(id, '<span style="color:#b91c1c;">' + e(err.message) + '</span>') })
  }
  window.updateFamBadge = function (n) { var b = document.getElementById('famPillBadge'); if (!b) return; b.textContent = n; b.style.display = n ? '' : 'none' }
  window.FAMAPP = { circleLine: circleLine, register: function (px, reload) { ctxs[px] = { reload: reload } }, act: act, copy: copy, welcome: welcome, welcomeAxis: welcomeAxis, welcomeSend: welcomeSend, render: render, schedule: schedule, place: place }
})()
