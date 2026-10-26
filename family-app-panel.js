/* family-app-panel.js (global window.FAMAPP; the Hub already has a const FAM, a cache) · The office side of the Caring Companions family app (family.mo-care.com). Step 1c of the
   booking plan approved 2026-10-15.
   - FAMAPP.circleLine(member, ctx): the "Booking App" line under each Family Circle person on the client profile:
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
  /* Her rule 2026-10-17: the welcome is sent by a person, and the Hub notes when, by whom and which version.
     2026-10-25 HER CHANGE: two separate emails. The AxisCare Family Portal email goes on its own to everyone in the circle who
     can use it (the Hub shows when, or why it couldn't); the Booking App email is sent by hand, and never for a client whose
     Booking App is turned off (FAMAPP.bookingSwitch). */
  var KIND = { regular: 'Regular', flexible: 'Flexible', both: 'Combination' }
  function when(iso) { try { return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch (x) { return '' } }
  function sentLine(m) {
    if (m.welcome_sent_at) return '<span class="field-note" style="color:var(--green);">Booking App email sent ' + e(when(m.welcome_sent_at)) + (m.welcome_sent_by ? ' by ' + e(m.welcome_sent_by) : '') + ' (' + e(KIND[m.welcome_version] || m.welcome_version || '') + (m.welcome_how ? ', ' + e(m.welcome_how) : '') + ')</span>'
    return '<span class="field-note">Booking App email not sent</span>'
  }
  function btnOf(label, js, cls) { return '<button class="btn ' + (cls || 'btn-ghost') + ' btn-sm" style="padding:2px 9px;font-size:12px;" onclick="' + js + '">' + label + '</button>' }
  /* The AxisCare welcome line: sent (automatic or by whom), couldn't go (why), "No welcome", or waiting. */
  function axisLine(m, px) {
    if (m.stopped_at || m.axiscare_removed_at || !m.email) return ''
    var id = e(m.id), ref = "'" + id + "','" + e(px) + "'"
    var head = '<div class="fam-line" id="famax-' + e(px) + '-' + id + '" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:3px;font-size:12.5px;">'
    var st
    if (m.axis_welcome_sent_at) st = '<span class="field-note" style="color:var(--green);">AxisCare welcome sent ' + e(when(m.axis_welcome_sent_at)) + (m.axis_welcome_sent_by === 'automatic' ? ' (automatic)' : m.axis_welcome_sent_by ? ' by ' + e(m.axis_welcome_sent_by) : '') + '</span>'
    else if (m.welcome_skip_at) st = '<span class="field-note">No AxisCare welcome: ' + e(m.welcome_skip_reason || '') + '</span>'
    else if (m.axis_welcome_failed_at) st = '<span style="color:#b91c1c;font-weight:600;">AxisCare welcome couldn\'t go ' + e(when(m.axis_welcome_failed_at)) + ': ' + e(m.axis_welcome_failed_why || '') + '</span>'
    else st = '<span class="field-note" style="color:#B45309;">AxisCare welcome not sent yet' + (settings().family_axis_welcome_auto === true ? ' (it goes on its own once they can use it)' : '') + '</span>'
    return head + st + (m.welcome_skip_at ? '' : btnOf(m.axis_welcome_sent_at ? 'Send AxisCare welcome again' : 'Send AxisCare welcome', 'FAMAPP.axisWelcome(' + ref + ')', m.axis_welcome_sent_at ? '' : 'btn-primary')) + '</div>'
  }
  function circleLine(m, px, circ) {
    var id = e(m.id), st = m.app_status   // circle_contacts.id is a uuid (Number() made it NaN, so every press sent no one)
    var btn = btnOf
    var off = !!(circ && circ.booking_app_off_at)
    var head = '<div class="fam-line" id="fam-' + e(px) + '-' + id + '" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:3px;font-size:12.5px;">'
    var ax = axisLine(m, px)
    if (st === 'active') {
      return ax + head + '<span style="color:var(--green);font-weight:600;">Booking App: on</span><span class="field-note">' + (m.app_can_book ? 'can book visits' : 'can see visits, can\'t book') + '</span>' + sentLine(m) +
        (off ? '<span style="color:#B45309;font-weight:600;">The Booking App is off for this client; they can still sign in until you turn the app off for them.</span>' : '') +
        (m.phone_confirmed_at && m.phone_confirmed_number === m.phone ? '<span class="field-note">Number confirmed' + (m.phone_confirmed_by ? ' (' + e(m.phone_confirmed_by) + ')' : '') + '</span>' : '') +
        (m.hipaa_office_ok_at && m.hipaa_authorized !== true ? '<span class="field-note">HIPAA OK in the Hub' + (m.hipaa_office_ok_by ? ' (' + e(m.hipaa_office_ok_by) + ')' : '') + '</span>' : '') +
        (off ? '' : btn(m.app_can_book ? 'Turn booking off' : 'Turn booking on', "FAMAPP.act('can_book','" + id + "','" + e(px) + "'," + (!m.app_can_book) + ")") +
        btn('Send Booking App email', "FAMAPP.welcome('" + id + "','" + e(px) + "')", 'btn-primary')) +
        btn('Turn app off', "FAMAPP.act('revoke','" + id + "','" + e(px) + "')") + '</div>'
    }
    if (m.stopped_at || m.axiscare_removed_at) return ''
    if (off) return ax
    if (st === 'revoked') return ax + head + '<span class="field-note">Booking App: turned off</span>' + btn('Turn on again', "FAMAPP.act('invite','" + id + "','" + e(px) + "')") + '</div>'
    if (!m.email) return head + '<span class="field-note">Add an email for the AxisCare welcome and the Booking App</span></div>'
    // Her ask 2026-10-17: ONE press invites them and opens the Booking App email to read; it goes only when Send is pressed.
    return ax + head + '<span class="field-note">Booking App: not invited</span>' + btn('Invite and send Booking App email', "FAMAPP.act('invite','" + id + "','" + e(px) + "',null,true)") + '</div>'
  }
  /* The client's Booking App on/off (her rule 2026-10-25): off = no invites and no Booking App email for this client. */
  function bookingSwitch(circ, px) {
    if (!circ || !circ.id) return ''
    var cid = e(circ.id), ref = "'" + cid + "','" + e(px) + "'"
    var off = !!circ.booking_app_off_at
    return '<div id="fambs-' + e(px) + '-' + cid + '" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:4px 0 8px;font-size:12.5px;">' +
      '<b style="color:var(--navy);">Booking App for this client:</b>' +
      (off ? '<span style="color:#B45309;font-weight:600;">Off</span><span class="field-note">' + e(when(circ.booking_app_off_at)) + (circ.booking_app_off_by ? ' by ' + e(circ.booking_app_off_by) : '') + (circ.booking_app_off_reason ? ': ' + e(circ.booking_app_off_reason) : '') + '. No invites and no Booking App email.</span>' + btnOf('Turn on', 'FAMAPP.bookingSet(' + ref + ',true,this)')
        : '<span style="color:var(--green);font-weight:600;">On</span><span class="field-note">Send the Booking App email to the families who would use it.</span>' + btnOf('Turn off', 'FAMAPP.bookingSet(' + ref + ',false,this)')) +
      '<span class="fam-bmsg"></span></div>'
  }
  function bookingSet(circleId, px, on, b) {
    var row = document.getElementById('fambs-' + px + '-' + circleId), msg = row && row.querySelector('.fam-bmsg')
    var inp = document.getElementById('fambsr-' + px + '-' + circleId)
    if (!on && !inp) { if (msg) msg.innerHTML = '<input id="fambsr-' + e(px) + '-' + e(circleId) + '" maxlength="200" placeholder="Why (optional)" style="font-size:12px;min-width:180px;"> <button class="btn btn-ghost btn-sm" style="font-size:12px;" onclick="FAMAPP.bookingSet(\'' + e(circleId) + '\',\'' + e(px) + '\',false,this)">Turn off the Booking App</button>'; return Promise.resolve() }
    b.disabled = true
    return call({ action: 'booking_app', circle_id: circleId, on: !!on, reason: inp ? inp.value.trim() : '' }).then(function (d) {
      var c = ctxs[px]
      return Promise.resolve(c && c.reload ? c.reload() : null).then(function () {
        if (d.still_signed_in && d.still_signed_in.length) {
          var r2 = document.getElementById('fambs-' + px + '-' + circleId)
          if (r2) r2.insertAdjacentHTML('afterend', '<div style="background:#FBF0DD;border-radius:6px;padding:6px 8px;margin:0 0 8px;font-size:12.5px;color:#92400E;">' + e(d.still_signed_in.join(', ')) + (d.still_signed_in.length === 1 ? ' still has' : ' still have') + ' a Booking App login. Press Turn app off under each person if they should lose it.</div>')
        }
      })
    }).catch(function (err) { b.disabled = false; if (msg) msg.innerHTML = '<span style="color:#b91c1c;">' + e(err.message) + '</span>' })
  }
  /* The same person can be drawn twice (the hidden Family Circles list and the open profile): use the one on screen, so a
     message never lands somewhere nobody can see it. */
  function lineOf(px, contactId) {
    var all = document.querySelectorAll('[id="fam-' + px + '-' + contactId + '"]')
    for (var i = 0; i < all.length; i++) if (all[i].offsetParent !== null) return all[i]
    return all[0] || null
  }
  function act(action, contactId, px, on, thenWelcome) {
    var line = lineOf(px, contactId)
    if (action === 'revoke' && line && !line.dataset.sure) { line.dataset.sure = '1'; line.insertAdjacentHTML('beforeend', '<span class="fam-sure" style="color:#B45309;font-weight:600;">They won\'t be able to see anything. Press Turn app off again to confirm.</span>'); return Promise.resolve() }
    if (line) line.style.opacity = '.55'
    var body = { action: action, contact_id: contactId }
    if (action === 'can_book') body.on = !!on
    if (action === 'invite') body.can_book = true
    return call(body).then(function (d) {
      var c = ctxs[px]
      return Promise.resolve(c && c.reload ? c.reload() : null).then(function () {
        if (action === 'invite' && thenWelcome) return welcome(contactId, px, true)   // straight to the welcome preview
        if (action === 'invite' && d.words) {
          var l2 = lineOf(px, contactId)
          if (l2) l2.insertAdjacentHTML('afterend', '<div class="fam-words" style="background:var(--teal-pale,#EAF4F6);border-radius:8px;padding:8px 10px;margin:4px 0 6px;font-size:12.5px;">' +
            '<b>They can sign in now.</b> Nothing was sent. Press <b>Send Booking App email</b> to text and email them the app steps, or send this yourself from the office line:<div style="margin:6px 0;padding:6px 8px;background:#fff;border-radius:6px;" id="famw-' + e(px) + '-' + contactId + '">' + e(d.words) + '</div>' +
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

  // ── Welcome by text + email (her approved wording, 2026-10-17). A person presses Send; nothing goes on its own. ─────
  var W = {}
  function welcome(contactId, px, justInvited, kind) {
    var line = lineOf(px, contactId); if (!line) return Promise.resolve()
    var old = document.getElementById('famwel-' + px + '-' + contactId)
    if (old && !kind) { old.remove(); if (!justInvited) return Promise.resolve() }
    if (!old || !kind) line.insertAdjacentHTML('afterend', '<div class="fam-welcome" id="famwel-' + e(px) + '-' + contactId + '" style="border:1px solid var(--border,#e2e8f0);border-radius:8px;padding:10px;margin:4px 0 8px;font-size:12.5px;">Getting the welcome ready…</div>')
    var body = { action: 'welcome', contact_id: contactId }; if (kind) body.kind = kind
    return call(body).then(function (d) {
      W[px + '-' + contactId] = d
      var box = document.getElementById('famwel-' + px + '-' + contactId)
      var id = e(px) + '-' + contactId
      var how = [d.can_text && !d.text_held ? 'text' : '', d.can_email ? 'email' : ''].filter(Boolean)
      var choose = '<div style="margin:6px 0 4px;font-weight:600;">How will this client schedule their care?</div><div role="radiogroup" style="display:flex;flex-direction:column;gap:3px;">' +
        d.kinds.map(function (k) { return '<label style="display:flex;gap:6px;align-items:center;"><input type="radio" name="famwk-' + id + '" value="' + e(k.key) + '"' + (d.kind === k.key ? ' checked' : '') + ' onchange="FAMAPP.welcome(\'' + e(contactId) + '\',\'' + e(px) + '\',false,this.value)"> ' + e(k.label) + '</label>' }).join('') + '</div>' +
        (d.saved_kind ? '' : '<div class="field-note">Saved on the client for next time. Flexible turns the App plan on; Regular and Combination leave it off (you can still change it).</div>')
      var sent = d.sent ? '<div style="background:#FBF0DD;border-radius:6px;padding:6px 8px;margin:6px 0;">Already sent' + (d.sent.to ? ' to ' + e(d.sent.to) + ' (same email)' : '') + ' ' + e(when(d.sent.at)) + (d.sent.by ? ' by ' + e(d.sent.by) : '') + (d.sent.version ? ' (' + e(KIND[d.sent.version] || d.sent.version) + ')' : '') + '.</div>' : ''
      box.innerHTML = (justInvited ? '<div style="color:var(--green,#15803d);font-weight:600;">' + e(d.name) + ' can sign in now. Nothing is sent until you press Send Booking App email.</div>' : '') +
        '<b>Booking App email for ' + e(d.name) + '</b>' + sent +
        hipaaBox(d, contactId, px) +
        choose +
        (!d.kind ? '<div class="field-note" style="margin-top:6px;">Pick one to see the Booking App email.</div>' :
          '<div class="field-note">The text (you can change it):</div><textarea id="famwt-' + id + '" rows="5" style="width:100%;font-size:13px;">' + e(d.text) + '</textarea>' +
          '<div class="field-note" style="margin:6px 0 2px;">The email: "' + e(d.email_subject) + '"</div>' +
          '<iframe title="Booking App email preview" sandbox="" style="width:100%;height:420px;border:1px solid var(--border,#e2e8f0);border-radius:8px;background:#FAF9F6;" srcdoc="' + e(d.email_html) + '"></iframe>' +
          '<div class="field-note">' + (how.length ? 'Goes by ' + how.join(' and ') + (d.can_text ? '' : ' (no text: no phone with Texts OK)') : d.text_held ? 'Nothing can go yet: no email, and the text is held.' : 'No way to reach them: add an email, or a phone with Texts OK.') + '</div>' +
          phoneBox(d, contactId, px) +
          '') +
        '<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">' +
          (d.kind && how.length && d.hipaa_ok ? '<button class="btn btn-primary btn-sm" onclick="FAMAPP.welcomeSend(\'' + e(contactId) + '\',\'' + e(px) + '\', this)">' + (d.sent ? 'Send it again' : 'Send Booking App email') + '</button>' : '') +
          '<button class="btn btn-ghost btn-sm" onclick="FAMAPP.welcome(\'' + e(contactId) + '\',\'' + e(px) + '\')">' + (justInvited ? 'Not now' : 'Cancel') + '</button>' +
          '</div>' +
        '<div class="fam-wmsg" style="margin-top:4px;"></div>'
    }).catch(function (err) { var box = document.getElementById('famwel-' + px + '-' + contactId); if (box) box.innerHTML = '<span style="color:#b91c1c;">' + e(err.message) + '</span>' })
  }
  /* Her rule 2026-10-23: the office can mark HIPAA OK in the Hub (who and when), so the welcome needn't wait for AxisCare's
     nightly copy. AxisCare's explicit No still wins: then there is no button, only where to fix it. */
  function hipaaBox(d, contactId, px) {
    var ref = '\'' + e(contactId) + '\',\'' + e(px) + '\''
    if (d.hipaa_ok) return d.hipaa_office && d.hipaa_axis !== true ? '<div class="field-note" style="color:var(--green,#15803d);">HIPAA OK marked in the Hub' + (d.hipaa_office.by ? ' by ' + e(d.hipaa_office.by) : '') + ' ' + e(when(d.hipaa_office.at)) + '. <button class="linklike" style="font-size:12px;" onclick="FAMAPP.hipaaOk(' + ref + ',false,this)">Take it back</button></div>' : ''
    if (d.hipaa_axis === false) return '<div style="color:#b91c1c;font-weight:600;">AxisCare says ' + e(d.name) + ' does NOT have HIPAA permission, so the welcome can\'t go. If that\'s wrong, change it in AxisCare (the Hub copies it overnight).</div>'
    return '<div style="color:#b91c1c;font-weight:600;">No HIPAA permission for ' + e(d.name) + ' on file yet, so the welcome can\'t go. (AxisCare\'s answer copies over each night.)</div>' +
      '<div style="margin:4px 0;"><button class="btn btn-ghost btn-sm" style="font-size:12px;" onclick="FAMAPP.hipaaOk(' + ref + ',true,this)">' + e(String(d.name || '').split(' ')[0] || 'They') + ' gave HIPAA permission: mark HIPAA OK in the Hub</button> <span class="fam-hmsg"></span></div>'
  }
  function hipaaOk(contactId, px, on, b) { return recordThenReopen('hipaa_ok', contactId, px, on, b, 'Press again to confirm HIPAA OK (recorded with your name)') }
  /* Her rule 2026-10-23: a number from AxisCare isn't texted until a person confirms it. The welcome says when the text is held
     and offers Confirm number (who and when recorded); a number marked wrong before only says where to fix it. */
  function phoneBox(d, contactId, px) {
    var ref = '\'' + e(contactId) + '\',\'' + e(px) + '\'', first = e(String(d.name || '').split(' ')[0] || 'their')
    if (d.text_held) return '<div style="background:#FBF0DD;border-radius:6px;padding:6px 8px;margin:6px 0;color:#92400E;">' + e(d.text_held) +
      (d.phone_trust === 'unconfirmed' ? '<div style="margin-top:4px;"><button class="btn btn-ghost btn-sm" style="font-size:12px;" onclick="FAMAPP.confirmPhone(' + ref + ',true,this)">Confirm ' + e(d.phone) + ' is ' + first + '\'s number</button> <span class="fam-hmsg"></span></div>' : '') + '</div>'
    var textNow = d.sent && d.can_text && d.hipaa_ok && d.kind && !/text/.test(String(d.sent.how || '')) && !d.sent.to
      ? ' <button class="btn btn-ghost btn-sm" style="font-size:12px;" onclick="FAMAPP.welcomeSend(' + ref + ', this, true)">Send the text now (the email already went)</button>' : ''
    return (d.phone_confirmed ? '<div class="field-note" style="color:var(--green,#15803d);">Number confirmed in the Hub' + (d.phone_confirmed.by ? ' by ' + e(d.phone_confirmed.by) : '') + ' ' + e(when(d.phone_confirmed.at)) + '. <button class="linklike" style="font-size:12px;" onclick="FAMAPP.confirmPhone(' + ref + ',false,this)">Take it back</button></div>' : '') +
      (textNow ? '<div style="margin:4px 0;">' + textNow + '</div>' : '')
  }
  function confirmPhone(contactId, px, on, b) { return recordThenReopen('confirm_phone', contactId, px, on, b, 'Press again: you checked this is their own number (recorded with your name)') }
  function recordThenReopen(action, contactId, px, on, b, sureText) {
    if (on && !b.dataset.sure) { b.dataset.sure = '1'; b.textContent = sureText; return Promise.resolve() }
    var kind = (W[px + '-' + contactId] || {}).kind
    b.disabled = true
    return call({ action: action, contact_id: contactId, on: !!on }).then(function () {
      var c = ctxs[px]
      var wasAxis = !!document.getElementById('famaxw-' + px + '-' + contactId)   // reopen the box it was pressed in
      return Promise.resolve(c && c.reload ? c.reload() : null).then(function () {
        if (wasAxis) { var oa = document.getElementById('famaxw-' + px + '-' + contactId); if (oa) oa.remove(); return axisWelcome(contactId, px) }
        var old = document.getElementById('famwel-' + px + '-' + contactId); if (old) old.remove()
        return welcome(contactId, px, false, kind || undefined)
      })
    }).catch(function (err) {
      b.disabled = false
      var m = b.parentNode && b.parentNode.querySelector('.fam-hmsg')
      if (m) m.innerHTML = '<span style="color:#b91c1c;">' + e(err.message) + '</span>'; else b.insertAdjacentHTML('afterend', ' <span style="color:#b91c1c;">' + e(err.message) + '</span>')
    })
  }
  function welcomeSend(contactId, px, b, textOnly) {
    var d = W[px + '-' + contactId] || {}
    var ta = document.getElementById('famwt-' + px + '-' + contactId)
    var box = document.getElementById('famwel-' + px + '-' + contactId), msg = box && box.querySelector('.fam-wmsg')
    if (!d.kind) { if (msg) msg.innerHTML = '<span style="color:#b91c1c;">Pick how this client schedules care first.</span>'; return Promise.resolve() }
    if (!ta || !ta.value.trim()) { if (msg) msg.innerHTML = '<span style="color:#b91c1c;">The text is empty.</span>'; return Promise.resolve() }
    var label = b.textContent; b.disabled = true; b.textContent = 'Sending…'
    var body = { action: 'welcome', contact_id: contactId, send: true, kind: d.kind, again: !!d.sent, text: ta.value.trim() }
    if (textOnly) { body.by_email = false; body.again = true }
    return call(body).then(function (r) {
      var said = '<span style="color:var(--green,#15803d);font-weight:600;">Sent by ' + [r.by_text ? 'text' : '', r.by_email ? 'email' : ''].filter(Boolean).join(' and ') + ' (' + e(KIND[r.version] || '') + ').</span> Noted under the person and saved in this Family Circle\'s messages.' +
        (r.text_held ? '<div style="background:#FBF0DD;border-radius:6px;padding:6px 8px;margin-top:6px;color:#92400E;font-weight:600;">' + e(r.text_held) + (/isn't confirmed/.test(r.text_held) ? ' Press Send Booking App email on their line to confirm it, then Send the text now.' : '') + '</div>' : '') +
        (r.text_failed ? '<div style="color:#b91c1c;font-weight:600;margin-top:6px;">The text didn\'t go through. There\'s a Needs Attention card with why.</div>' : '')
      box.innerHTML = said
      /* the reload redraws the circle, which drops this box: put the result back under the person so it stays on screen */
      var c = ctxs[px]
      return Promise.resolve(c && c.reload ? c.reload() : null).then(function () {
        if (document.getElementById('famwel-' + px + '-' + contactId)) return
        var l2 = lineOf(px, contactId)
        if (l2) l2.insertAdjacentHTML('afterend', '<div class="fam-welcome" id="famwel-' + e(px) + '-' + contactId + '" style="border:1px solid var(--border,#e2e8f0);border-radius:8px;padding:10px;margin:4px 0 8px;font-size:12.5px;">' + said + '</div>')
      })
    }).catch(function (err) { b.disabled = false; b.textContent = label; if (msg) msg.innerHTML = '<span style="color:#b91c1c;">' + e(err.message) + '</span>' })
  }
  /* The AxisCare welcome by hand (2026-10-25): the same email that goes on its own. Preview, then Send; email only. */
  function axisLineOf(px, contactId) {
    var all = document.querySelectorAll('[id="famax-' + px + '-' + contactId + '"]')
    for (var i = 0; i < all.length; i++) if (all[i].offsetParent !== null) return all[i]
    return all[0] || null
  }
  function axisWelcome(contactId, px) {
    var line = axisLineOf(px, contactId); if (!line) return Promise.resolve()
    var old = document.getElementById('famaxw-' + px + '-' + contactId)
    if (old) { old.remove(); return Promise.resolve() }
    line.insertAdjacentHTML('afterend', '<div class="fam-welcome" id="famaxw-' + e(px) + '-' + contactId + '" style="border:1px solid var(--border,#e2e8f0);border-radius:8px;padding:10px;margin:4px 0 8px;font-size:12.5px;">Getting the AxisCare welcome ready…</div>')
    return call({ action: 'axis_welcome', contact_id: contactId }).then(function (d) {
      W['ax-' + px + '-' + contactId] = d
      var box = document.getElementById('famaxw-' + px + '-' + contactId), id = e(px) + '-' + contactId, ref = '\'' + e(contactId) + '\',\'' + e(px) + '\''
      var axis = d.axis_email_on_file === true ? '<div style="color:var(--green,#15803d);">Their email is on AxisCare, so Activate account will work for them.</div>'
        : d.axis_email_on_file === false ? '<div style="color:#b91c1c;font-weight:600;">Their email isn\'t on the client\'s AxisCare record, so Activate account won\'t work for them. Add them as a responsible party in AxisCare, or (past three people) as a Contact linked to the client, first.</div>'
        : '<div class="field-note">Couldn\'t check AxisCare just now.</div>'
      var sent = d.sent ? '<div style="background:#FBF0DD;border-radius:6px;padding:6px 8px;margin:6px 0;">Already sent' + (d.sent.to ? ' to ' + e(d.sent.to) + ' (same email)' : '') + ' ' + e(when(d.sent.at)) + (d.sent.by ? (d.sent.by === 'automatic' ? ' (automatic)' : ' by ' + e(d.sent.by)) : '') + '.</div>' : ''
      var failed = d.failed ? '<div style="color:#b91c1c;margin:6px 0;">The automatic send couldn\'t go ' + e(when(d.failed.at)) + ': ' + e(d.failed.why || '') + '</div>' : ''
      box.innerHTML = '<b>AxisCare welcome for ' + e(d.name) + '</b> <span class="field-note">(email only; it never mentions the Booking App)</span>' + sent + failed +
        hipaaBox(d, contactId, px) + axis +
        '<div class="field-note" style="margin:6px 0 2px;">The email: "' + e(d.email_subject) + '"</div>' +
        '<iframe title="AxisCare welcome email preview" sandbox="" style="width:100%;height:420px;border:1px solid var(--border,#e2e8f0);border-radius:8px;background:#FAF9F6;" srcdoc="' + e(d.email_html) + '"></iframe>' +
        '<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">' +
          (d.hipaa_ok && d.axis_email_on_file !== false ? '<button class="btn btn-primary btn-sm" onclick="FAMAPP.axisSend(' + ref + ', this)">' + (d.sent ? 'Send it again' : 'Send AxisCare welcome') + '</button>' : '') +
          '<button class="btn btn-ghost btn-sm" onclick="FAMAPP.axisWelcome(' + ref + ')">Cancel</button>' +
          '<button class="btn btn-ghost btn-sm" style="font-size:11.5px;" onclick="FAMAPP.welcomeSkip(' + ref + ', this)">No AxisCare welcome for this person</button> <span id="famwsk-' + id + '"></span></div>' +
        '<div class="fam-wmsg" style="margin-top:4px;"></div>'
    }).catch(function (err) { var box = document.getElementById('famaxw-' + px + '-' + contactId); if (box) box.innerHTML = '<span style="color:#b91c1c;">' + e(err.message) + '</span>' })
  }
  function axisSend(contactId, px, b) {
    var d = W['ax-' + px + '-' + contactId] || {}
    var box = document.getElementById('famaxw-' + px + '-' + contactId), msg = box && box.querySelector('.fam-wmsg')
    var label = b.textContent; b.disabled = true; b.textContent = 'Sending…'
    return call({ action: 'axis_welcome', contact_id: contactId, send: true, again: !!d.sent }).then(function () {
      var said = '<span style="color:var(--green,#15803d);font-weight:600;">AxisCare welcome sent by email.</span> Noted under the person.'
      var c = ctxs[px]
      return Promise.resolve(c && c.reload ? c.reload() : null).then(function () {
        var l2 = axisLineOf(px, contactId)
        if (l2 && !document.getElementById('famaxw-' + px + '-' + contactId)) l2.insertAdjacentHTML('afterend', '<div class="fam-welcome" id="famaxw-' + e(px) + '-' + contactId + '" style="border:1px solid var(--border,#e2e8f0);border-radius:8px;padding:10px;margin:4px 0 8px;font-size:12.5px;">' + said + '</div>')
        else if (box) box.innerHTML = said
      })
    }).catch(function (err) { b.disabled = false; b.textContent = label; if (msg) msg.innerHTML = '<span style="color:#b91c1c;">' + e(err.message) + '</span>' })
  }
  function welcomeSkip(contactId, px, b) {
    var holder = document.getElementById('famwsk-' + px + '-' + contactId); if (!holder) return Promise.resolve()
    var inp = document.getElementById('famwskr-' + px + '-' + contactId)
    if (!inp) { holder.innerHTML = '<input id="famwskr-' + e(px) + '-' + contactId + '" maxlength="200" placeholder="Why (for the record)" style="font-size:12px;min-width:200px;"> <button class="btn btn-ghost btn-sm" style="font-size:11.5px;" onclick="FAMAPP.welcomeSkip(\'' + e(contactId) + '\',\'' + e(px) + '\', this)">Save</button>'; return Promise.resolve() }
    if (!inp.value.trim()) { inp.focus(); return Promise.resolve() }
    b.disabled = true
    return call({ action: 'welcome_skip', contact_id: contactId, on: true, reason: inp.value.trim() }).then(function () {
      var box = document.getElementById('famaxw-' + px + '-' + contactId); if (box) box.innerHTML = '<span class="field-note">Noted: no AxisCare welcome for this person. It won\'t go on its own, and the reminder won\'t ask again.</span>'
      var c = ctxs[px]; if (c && c.reload) c.reload()
    }).catch(function (err) { b.disabled = false; holder.insertAdjacentHTML('beforeend', ' <span style="color:#b91c1c;">' + e(err.message) + '</span>') })
  }

  // ── Scheduling > Family bookings ─────────────────────────────────────────────────────────────────────────────────
  var STATUS = {
    received: ['Saving', '#B45309'], needs_office: ['Needs the office', '#b91c1c'], practice: ['Practice (not on the schedule)', '#6b7280'],
    // Release 1 (her approval 2026-10-17): a request isn't on AxisCare until a caregiver is placed; unfilled requests end "not filled"
    waiting_for_caregiver: ['Asking caregivers (not on AxisCare until placed)', '#B45309'], placed: ['Caregiver placed', 'var(--green,#15803d)'], cancelled: ['Cancelled', '#6b7280'],
    not_filled: ['Not filled (family told, nothing scheduled)', '#6b7280'],
    // Release 3 (her "Start Release 3." 2026-10-17): a request held for the office's check, and one declined
    held: ['Check before caregivers are asked', '#b91c1c'], declined: ['Declined (family told to call)', '#6b7280']
  }
  // Flexible bookings (her yes 2026-10-16): no start until a caregiver takes it, so they are not on AxisCare while waiting.
  var flexWaiting = function (b) { return b.kind === 'flex' && !b.start_time }
  function m2(t) { var p = String(t || '').split(':'); return Number(p[0]) * 60 + Number(p[1]) }
  function hm(n) { return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0') }
  function startOptions(b) {
    var out = ''
    for (var m = m2(b.window_start); m + Number(b.hours) * 60 <= m2(b.window_end); m += 30) out += '<option value="' + hm(m) + '">' + e(t12(hm(m))) + '</option>'
    return out
  }
  var OFFER_WORD = { sent: 'asked, no answer yet', yes: 'said yes', no: 'said no', taken: 'too late', closed: 'closed', failed: 'text did not go' }
  function offersLine(b) {
    var os = b.family_offers || []
    if (!os.length) return ''
    return '<div class="field-note" style="margin-top:4px;">Offered: ' + os.map(function (o) { return e(o.caregiver_name || '?') + ' (' + e(OFFER_WORD[o.state] || o.state) + (o.picked_start ? ', ' + e(t12(o.picked_start)) : '') + ')' }).join(' · ') + '</div>'
  }
  function caregiverOptions() {
    var list = ((window.DATA && window.DATA.caregivers) || []).filter(function (g) { return g && g.axiscare_id && g.active !== false })
    list.sort(function (a, b) { return String(a.first || '').localeCompare(String(b.first || '')) })
    var seen = {}
    return list.filter(function (g) { var k = String(g.axiscare_id); if (seen[k]) return false; seen[k] = 1; return true })
      .map(function (g) { return '<option value="' + e(g.axiscare_id) + '">' + e([g.first, g.last].filter(Boolean).join(' ')) + '</option>' }).join('')
  }
  function cgName(id) { var g = ((window.DATA && window.DATA.caregivers) || []).find(function (x) { return String(x.axiscare_id) === String(id) }); return g ? e([g.first, g.last].filter(Boolean).join(' ')) : 'caregiver ' + e(id) }
  // Release 1: when the family will hear back, Central time ("Wed, Oct 21, 6 PM")
  function byWords(iso) { try { return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(':00', '') } catch (x) { return '' } }
  function bookingCard(b, today) {
    var s = STATUS[b.status] || [b.status, '#6b7280']
    // Release 2: AxisCare is checked every 10 minutes for confirmed app visits
    if (b.status === 'placed' && b.sync_state === 'no_caregiver') s = ['No caregiver on it in AxisCare', '#B45309']
    if (b.status === 'cancelled' && b.cancel_source === 'office') s = ['Removed in AxisCare', '#6b7280']
    var acts = ''
    if ((b.status === 'waiting_for_caregiver' || b.status === 'needs_office') && b.visit_date >= today)
      acts = '<select id="famcg-' + e(b.id) + '" style="max-width:220px;"><option value="">Pick a caregiver…</option>' + caregiverOptions() + '</select> ' +
        (flexWaiting(b) ? '<select id="famst-' + e(b.id) + '" style="max-width:160px;"><option value="">Start time…</option>' + startOptions(b) + '</select> ' : '') +
        '<button class="btn btn-primary btn-sm" onclick="FAMAPP.place(\'' + e(b.id) + '\', this)">Place and put on AxisCare</button>' +
        // Help us fill: the office's one round, closed with one button (Placed is Place)
        (b.help_fill && b.fill_task_at && b.status === 'waiting_for_caregiver' ? ' <button class="btn btn-ghost btn-sm" style="padding:2px 9px;font-size:12px;" onclick="FAMAPP.fillClose(\'' + e(b.id) + '\',\'another_time\', this)">Another time agreed</button>' +
          ' <button class="btn btn-ghost btn-sm" style="padding:2px 9px;font-size:12px;" onclick="FAMAPP.fillClose(\'' + e(b.id) + '\',\'couldnt\', this)">Couldn\'t fill</button>' : '')
    if (b.status === 'held' && b.visit_date >= today)
      acts = '<button class="btn btn-primary btn-sm" onclick="FAMAPP.review(\'' + e(b.id) + '\',\'approve\', this)">Approve</button> ' +
        (b.note ? '<button class="btn btn-ghost btn-sm" style="padding:2px 9px;font-size:12px;" onclick="FAMAPP.review(\'' + e(b.id) + '\',\'approve_no_note\', this)">Approve without the note</button> ' : '') +
        '<input id="famdec-' + e(b.id) + '" maxlength="300" placeholder="Why decline (for the record)" style="min-width:200px;font-size:13px;"> ' +
        '<button class="btn btn-ghost btn-sm" style="padding:2px 9px;font-size:12px;" onclick="FAMAPP.review(\'' + e(b.id) + '\',\'decline\', this)">Decline</button>'
    var when = flexWaiting(b) ? 'flexible, ' + e(Number(b.hours)) + ' hours anytime ' + e(t12(b.window_start)) + ' to ' + e(t12(b.window_end)) : e(t12(b.start_time)) + ' to ' + e(t12(b.end_time))
    var picks = (b.preferred_caregiver_ids || []).length ? ' · asked for ' + (b.preferred_caregiver_ids || []).map(cgName).join(', ') + ' first' : (b.who === 'any' ? ' · whoever is available' : '')
    return '<div class="card" style="padding:12px 14px;margin-bottom:8px;" id="famb-' + e(b.id) + '">' +
      '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;"><b>' + e(b.client_name || 'Client') + ' · ' + e(day(b.visit_date)) + ', ' + when + '</b>' +
      '<span style="font-weight:700;color:' + s[1] + ';">' + e(s[0]) + (b.caregiver_name ? ': ' + e(b.caregiver_name) : '') + '</span></div>' +
      '<div class="field-note">' + e(Number(b.hours)) + ' hours · ' + e((b.tasks || []).join(', ')) + ' · booked by ' + e(b.requested_by_name || 'family') +
        (b.who === 'regular' ? ' · wants the regular caregiver' : b.who === 'favorites' ? ' · someone the client knows' : picks) + (b.state ? ' · ' + e(b.state) : '') + '</div>' +
      (b.status === 'waiting_for_caregiver' && b.answer_by ? '<div class="field-note">The family hears by ' + e(byWords(b.answer_by)) + (b.two_stage && b.team_from ? ' · the wider team is asked from ' + e(byWords(b.team_from)) : '') + '. Nothing to do unless you want to place someone.</div>' : '') +
      (b.status === 'placed' && b.sync_state === 'no_caregiver' ? '<div class="field-note">' + e(b.sync_note || 'The caregiver') + ' came off this visit in AxisCare. Coverage Help (or the office) covers it. The family\'s Booking App says we\'re checking for another caregiver, can\'t promise one, and will contact them either way.</div>' : '') +
      (b.status === 'cancelled' && b.cancel_source === 'office' ? '<div class="field-note">Removed in AxisCare, not by the family. Their Booking App says we cancelled it; please call them with the reason.</div>' : '') +
      (b.status === 'placed' && b.family_change_pending ? '<div class="field-note">Changed in AxisCare. The family is told (8 AM to 8 PM).</div>' : '') +
      (b.status === 'placed' && b.family_change_how && !b.family_change_pending ? '<div class="field-note">Change message: ' + e(b.family_change_how) + '</div>' : '') +
      (b.status === 'not_filled' ? '<div class="field-note">' + (b.unfilled_kind === 'couldnt' ? 'Help us fill: the office tried and couldn\'t fill it' : 'Nobody accepted' + (b.ended_why === 'early' ? ' (everyone asked)' : '')) + '. The family is told nothing was scheduled.</div>' : '') +
      (b.status === 'held' ? '<div class="field-note" style="color:#b91c1c;">Held: ' + e(b.hold_reason || 'needs a check') + '. The family\'s Booking App says our office is checking it; they hear by ' + e(byWords(b.answer_by)) + '. Not reviewed by then = it ends with the decline wording.</div>' : '') +
      (b.status === 'declined' ? '<div class="field-note">' + (b.ended_why === 'not_reviewed' ? 'Not reviewed by the answer-by time' : 'Declined by ' + e(String(b.reviewed_by || '').split('@')[0]) + (b.decline_reason ? ': ' + e(b.decline_reason) : '')) + '. The family is asked to call.</div>' : '') +
      (b.help_fill && b.status === 'waiting_for_caregiver' ? '<div class="field-note">Help us fill client' + (b.fill_task_at ? ': the office\'s round is open (Place, Another time agreed, or Couldn\'t fill)' : ': the office gets a task one office day before the family\'s answer-by time if nobody has said yes') + '.</div>' : '') +
      (b.note_check === 'ai_unavailable' ? '<div class="field-note">AI didn\'t read this note (it was unavailable); the fixed rules passed it. Glance at it.</div>' : '') +
      (b.note_hidden ? '<div class="field-note">Approved without the note: caregivers don\'t see it.</div>' : '') +
      offersLine(b) +
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
      '<b>' + (live ? 'Live: families request visits; a visit goes on the AxisCare schedule when a caregiver is placed.' : 'Practice mode: family requests are recorded here but caregivers aren\'t asked and nothing is scheduled.') + '</b>' +
      '<div class="field-note" style="margin-top:4px;">App address: <a href="https://family.mo-care.com" target="_blank" rel="noopener">family.mo-care.com</a> · ' +
      'Missouri: service ' + svc('MO') + ', rate ' + rate('MO') + ' · Oklahoma: service ' + svc('OK') + ', rate ' + rate('OK') + '. Ask Claude to change these.</div>' +
      '<div class="field-note" style="margin-top:4px;">' + (o.family_offer_live === true ? 'Caregivers are offered each booking by text: the family\'s picks first, then the team, first yes goes on the schedule. A request nobody takes ends on its own and the family is told. Only the ones that need a person are under Needs you.' : 'Caregiver offers are off (Owners Hub Admin page): place each booking yourself.') + '</div></div>'
  }
  function render() {
    var box = document.getElementById('famBookings'); if (!box) return Promise.resolve()
    box.innerHTML = '<div class="field-note">Loading family bookings…</div>'
    return call({ action: 'list' }).then(function (d) {
      var today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      var bs = d.bookings || [], ms = d.members || []
      /* Her check 2026-10-17 ("Check for anytime it's involving office staff when it shouldn't"): Needs you holds only what
         needs a person (AxisCare refused a placement, a Help us fill round, a held request from before, or every request
         while caregiver offers are switched off). Requests caregivers are being asked about are listed, not counted. */
      var offersOn = settings().family_offer_live === true
      var live = bs.filter(function (b) { return ['needs_office', 'received', 'waiting_for_caregiver', 'held'].indexOf(b.status) >= 0 && b.visit_date >= today })
      var open = live.filter(function (b) { return b.status === 'needs_office' || b.status === 'held' || (b.help_fill && b.fill_task_at) || (!offersOn && b.status === 'waiting_for_caregiver') })
      var asking = live.filter(function (b) { return open.indexOf(b) < 0 })
      var toBill = bs.filter(function (b) { return Number(b.late_charge_hours) > 0 && !b.late_billed_at })
      var placed = bs.filter(function (b) { return b.status === 'placed' && b.visit_date >= today })
      var other = bs.filter(function (b) { return live.indexOf(b) < 0 && placed.indexOf(b) < 0 })
      var on = ms.filter(function (m) { return m.status === 'active' })
      box.innerHTML = settingsBox() +
        '<h3 style="margin:6px 0;">Needs you (' + open.length + ')</h3>' + (open.length ? open.map(function (b) { return bookingCard(b, today) }).join('') : '<div class="field-note" style="margin-bottom:10px;">Nothing needs you.</div>') +
        (asking.length ? '<details style="margin:8px 0;"><summary>Asking caregivers, nothing for you to do (' + asking.length + ')</summary>' + asking.map(function (b) { return bookingCard(b, today) }).join('') + '</details>' : '') +
        (toBill.length ? '<h3 style="margin:12px 0 6px;">Late cancels to bill this week (' + toBill.length + ')</h3><div class="field-note" style="margin-bottom:4px;">The family cancelled inside 24 hours and agreed to the charge in the app. AxisCare won\'t add it by itself (nobody clocks in).</div>' +
          toBill.map(function (b) { return '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:3px 0;font-size:13px;" id="famlate-' + e(b.id) + '"><b>' + e(b.client_name || 'Client') + '</b> ' + e(day(b.visit_date)) + ': charge ' + e(b.late_charge_hours) + ' hours' + (b.late_pay_caregiver ? ', pay ' + e(b.late_pay_caregiver) + ' ' + e(b.late_charge_hours) + ' hours' : '') +
            ' <button class="btn btn-ghost btn-sm" style="padding:2px 9px;font-size:12px;" onclick="FAMAPP.lateBilled(\'' + e(b.id) + '\', this)">Added to invoice</button></div>' }).join('') : '') +
        '<h3 style="margin:12px 0 6px;">Coming up, caregiver placed (' + placed.length + ')</h3>' + (placed.length ? placed.map(function (b) { return bookingCard(b, today) }).join('') : '<div class="field-note">None yet.</div>') +
        (other.length ? '<details style="margin-top:12px;"><summary>Practice, cancelled and past (' + other.length + ')</summary>' + other.map(function (b) { return bookingCard(b, today) }).join('') + '</details>' : '') +
        '<h3 style="margin:16px 0 6px;">Families using the Booking App (' + on.length + ')</h3>' +
        (on.length ? '<div class="field-note">' + on.map(function (m) { return e(m.name) + ' for ' + e(m.client_name || '?') + (m.can_book ? '' : ' (view only)') }).join(' · ') + '</div>'
                   : '<div class="field-note">Nobody yet. Invite someone from the Care circle card on a client\'s profile.</div>') +
        plansBox(d.plans || [], d.tasks || []) + '<div id="famFee" style="margin-top:14px;"></div>'
      fee()
      if (window.updateFamBadge) window.updateFamBadge(open.length)
    }).catch(function (err) { box.innerHTML = '<div class="field-note" style="color:#b91c1c;">' + e(err.message) + '</div>' })
  }
  // ── App fee check (her yes 2026-10-16): free any month with a visit, $15 for a month with none, the join month free ──
  function plansBox(ps, tasks) {
    if (!ps.length) return ''
    var today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    return '<h3 style="margin:16px 0 6px;">App plan clients</h3><div class="field-note" style="margin-bottom:6px;">Ticked clients are on the app plan: no weekly minimum, and the app fee for a month with no visits. Set-shift clients who only add extra visits can be unticked.</div>' +
      ps.map(function (k) {
        return '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:3px 0;font-size:13px;"><b>' + e(k.client_name || 'Client') + '</b>' +
          '<span class="field-note">' + (k.app_plan ? 'App plan since ' + e(k.app_plan_since || '?') : 'not on the app plan') + '</span>' +
          '<button class="btn btn-ghost btn-sm" style="padding:2px 9px;font-size:12px;" onclick="FAMAPP.plan(\'' + e(k.id) + '\',' + (!k.app_plan) + ', this)">' + (k.app_plan ? 'Take off the app plan' : 'Put on the app plan') + '</button></div>' +
          clientSettings(k, tasks, today)
      }).join('')
  }
  /* Release 3: per client, what the family may pick in the app (set at the assessment) and "Help us fill extra visits"
     (Samantha or Krystal, with a reason, 90 days; the server checks the role). */
  function clientSettings(k, tasks, today) {
    var hf = k.help_fill || {}, on = hf.on === true && String(hf.review_by || '') >= today, only = Array.isArray(k.app_tasks) && k.app_tasks.length ? k.app_tasks : null
    var types = [['', 'Not set yet'], ['regular', 'Regular Scheduled Care'], ['flexible', 'Flexible Booking Care'], ['both', 'Combination of Both']]
    return '<div style="margin:0 0 8px 12px;font-size:12.5px;">' +
      '<div><span class="field-note">How they schedule care: </span><select id="famtype-' + e(k.id) + '" style="font-size:12.5px;" onchange="FAMAPP.setType(\'' + e(k.id) + '\', this)">' +
        types.map(function (t) { return '<option value="' + t[0] + '"' + ((k.care_scheduling_type || '') === t[0] ? ' selected' : '') + (t[0] === '' ? ' disabled' : '') + '>' + t[1] + '</option>' }).join('') + '</select></div>' +
      '<div><span class="field-note">Help us fill extra visits: </span>' + (on ? '<b>on</b> until ' + e(hf.review_by) + (hf.reason ? ' (' + e(hf.reason) + ')' : '') + ' <button class="btn btn-ghost btn-sm" style="padding:2px 9px;font-size:12px;" onclick="FAMAPP.helpFill(\'' + e(k.id) + '\', false, this)">Turn off</button>'
        : 'off <input id="famhf-' + e(k.id) + '" maxlength="300" placeholder="Why (e.g. respite for a worn-out family caregiver)" style="min-width:220px;font-size:12.5px;"> <button class="btn btn-ghost btn-sm" style="padding:2px 9px;font-size:12px;" onclick="FAMAPP.helpFill(\'' + e(k.id) + '\', true, this)">Turn on for 90 days</button>') + '</div>' +
      '<details style="margin-top:2px;"><summary class="field-note">App tasks: ' + (only ? e(only.join(', ')) : 'all companion tasks') + '</summary>' +
        '<div id="famtasks-' + e(k.id) + '" style="display:flex;flex-wrap:wrap;gap:4px 12px;margin:4px 0;">' + tasks.map(function (t) { return '<label style="font-size:12.5px;"><input type="checkbox" value="' + e(t) + '"' + (!only || only.indexOf(t) >= 0 ? ' checked' : '') + '> ' + e(t) + '</label>' }).join('') + '</div>' +
        '<button class="btn btn-ghost btn-sm" style="padding:2px 9px;font-size:12px;" onclick="FAMAPP.appTasks(\'' + e(k.id) + '\', this)">Save tasks</button> <span class="field-note" id="famtasks-' + e(k.id) + '-msg"></span></details>' +
      '<div class="fam-msg" id="famset-' + e(k.id) + '"></div></div>'
  }
  function setType(circleId, sel) {
    sel.disabled = true
    return call({ action: 'scheduling_type', circle_id: circleId, kind: sel.value }).then(render).catch(function (err) { sel.disabled = false; setMsg(circleId, '<span style="color:#b91c1c;">' + e(err.message) + '</span>') })
  }
  function setMsg(id, html) { var m = document.getElementById('famset-' + id); if (m) m.innerHTML = html }
  function helpFill(circleId, on, b) {
    var inp = document.getElementById('famhf-' + circleId), reason = inp ? inp.value.trim() : ''
    if (on && !reason) { setMsg(circleId, '<span style="color:#b91c1c;">Say why this client needs it first.</span>'); return Promise.resolve() }
    b.disabled = true
    return call({ action: 'help_fill', circle_id: circleId, on: on, reason: reason }).then(render).catch(function (err) { b.disabled = false; setMsg(circleId, '<span style="color:#b91c1c;">' + e(err.message) + '</span>') })
  }
  function appTasks(circleId, b) {
    var box = document.getElementById('famtasks-' + circleId), all = box ? box.querySelectorAll('input[type=checkbox]') : [], picked = []
    for (var i = 0; i < all.length; i++) if (all[i].checked) picked.push(all[i].value)
    if (!picked.length) { setMsg(circleId, '<span style="color:#b91c1c;">Pick at least one task.</span>'); return Promise.resolve() }
    b.disabled = true
    return call({ action: 'app_tasks', circle_id: circleId, tasks: picked.length === all.length ? null : picked }).then(render).catch(function (err) { b.disabled = false; setMsg(circleId, '<span style="color:#b91c1c;">' + e(err.message) + '</span>') })
  }
  function review(id, decision, b) {
    var inp = document.getElementById('famdec-' + id), reason = inp ? inp.value.trim() : ''
    if (decision === 'decline' && !reason) { rowMsg(id, '<span style="color:#b91c1c;">Say why you\'re declining (for the record; the family gets the approved wording).</span>'); return Promise.resolve() }
    b.disabled = true
    return call({ action: 'review', booking_id: id, decision: decision, reason: reason }).then(render).catch(function (err) { b.disabled = false; rowMsg(id, '<span style="color:#b91c1c;">' + e(err.message) + '</span>') })
  }
  function lateBilled(id, b) {
    b.disabled = true
    return call({ action: 'late_billed', booking_id: id, on: true }).then(render).catch(function (err) { b.disabled = false; var r = document.getElementById('famlate-' + id); if (r) r.insertAdjacentHTML('beforeend', ' <span style="color:#b91c1c;">' + e(err.message) + '</span>') })
  }
  function fillClose(id, how, b) {
    b.disabled = true
    return call({ action: 'fill_close', booking_id: id, how: how }).then(render).catch(function (err) { b.disabled = false; rowMsg(id, '<span style="color:#b91c1c;">' + e(err.message) + '</span>') })
  }
  var FEE_WORD = { fee: ['No visits: add the app fee', '#b91c1c'], free: ['Had a visit: free', 'var(--green,#15803d)'], joined: ['Joined this month: free', '#6b7280'], couldnt_check: ['AxisCare couldn\'t be checked: press Check again', '#B45309'] }
  function lastMonthKey() { var d = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }) + 'T12:00:00Z'); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7) }
  function feeView(month, rows, note) {
    var box = document.getElementById('famFee'); if (!box) return
    var owe = rows.filter(function (r) { return r.result === 'fee' }), left = owe.filter(function (r) { return !r.billed_at })
    box.innerHTML = '<h3 style="margin:0 0 6px;">App fee check</h3>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:6px;"><input type="month" id="famFeeMonth" value="' + e(month) + '" style="max-width:170px;"> ' +
      '<button class="btn btn-primary btn-sm" onclick="FAMAPP.feeCheck(this)">Check now</button><span class="field-note">Runs by itself on the 1st of each month for the month before.</span></div>' +
      (note ? '<div class="field-note" style="color:#b91c1c;">' + e(note) + '</div>' : '') +
      (rows.length ? '<div class="field-note" style="margin-bottom:4px;">' + owe.length + ' to bill' + (owe.length ? ', ' + left.length + ' not added yet' : '') + '. Add the fee on the client\'s AxisCare invoice, then tick it here.</div>' +
        rows.map(function (r) {
          var w = FEE_WORD[r.result] || [r.result, '#6b7280']
          return '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:3px 0;font-size:13px;"><b>' + e(r.client_name || r.axiscare_client_id) + '</b>' +
            '<span style="font-weight:700;color:' + w[1] + ';">' + e(w[0]) + (r.result === 'fee' ? ' ($' + e(Number(r.fee)) + ')' : '') + '</span>' +
            (r.result === 'fee' ? '<label style="display:flex;gap:4px;align-items:center;"><input type="checkbox"' + (r.billed_at ? ' checked' : '') + ' onchange="FAMAPP.feeBilled(\'' + e(r.month) + '\',\'' + e(r.axiscare_client_id) + '\', this)"> Added to the AxisCare invoice</label>' +
              (r.billed_at ? '<span class="field-note">' + e(r.billed_by || '') + ', ' + e(String(r.billed_at).slice(0, 10)) + '</span>' : '') : '') + '</div>'
        }).join('') : '<div class="field-note">Not checked yet for this month. Press Check now.</div>')
  }
  function fee(month) {
    month = month || lastMonthKey()
    return call({ action: 'fee_list', month: month }).then(function (d) { feeView(month, d.rows || []) }).catch(function (err) { feeView(month, [], err.message) })
  }
  function feeCheck(b) {
    var m = (document.getElementById('famFeeMonth') || {}).value || lastMonthKey()
    b.disabled = true; b.textContent = 'Checking AxisCare…'
    return call({ action: 'fee_check', month: m }).then(function (d) { feeView(m, d.rows || []) }).catch(function (err) { feeView(m, [], err.message) })
  }
  function feeBilled(month, cid, box) {
    var on = box.checked; box.disabled = true
    return call({ action: 'fee_billed', month: month, axiscare_client_id: cid, on: on }).then(function () { return fee(month) }).catch(function (err) { box.checked = !on; box.disabled = false; alert(err.message) })
  }
  function plan(circleId, on, b) {
    b.disabled = true
    return call({ action: 'app_plan', circle_id: circleId, on: on }).then(render).catch(function (err) { b.disabled = false; alert(err.message) })
  }
  function rowMsg(id, html) { var c = document.getElementById('famb-' + id); var m = c && c.querySelector('.fam-msg'); if (m) m.innerHTML = html }
  function schedule(id, b) {
    b.disabled = true; b.textContent = 'Putting it on the schedule…'
    return call({ action: 'schedule', booking_id: id }).then(render).catch(function (err) { b.disabled = false; b.textContent = 'Put it on the AxisCare schedule'; rowMsg(id, '<span style="color:#b91c1c;">' + e(err.message) + '</span>') })
  }
  function place(id, b) {
    var sel = document.getElementById('famcg-' + id), cg = sel && sel.value, ss = document.getElementById('famst-' + id), label = b.textContent
    if (!cg) { rowMsg(id, '<span style="color:#b91c1c;">Pick a caregiver first.</span>'); return Promise.resolve() }
    if (ss && !ss.value) { rowMsg(id, '<span style="color:#b91c1c;">Pick the start time inside the family\'s window.</span>'); return Promise.resolve() }
    b.disabled = true; b.textContent = 'Placing…'
    return call({ action: 'place', booking_id: id, caregiver_axiscare_id: cg, start: ss ? ss.value : undefined }).then(render).catch(function (err) { b.disabled = false; b.textContent = label; rowMsg(id, '<span style="color:#b91c1c;">' + e(err.message) + '</span>') })
  }
  window.updateFamBadge = function (n) { var b = document.getElementById('famPillBadge'); if (!b) return; b.textContent = n; b.style.display = n ? '' : 'none' }
  /* Her rule 2026-10-16: a short "About <client>" the office writes once; caregivers see it on the visit offer link.
     First name only, no address or medical detail. Empty = nothing shown to caregivers. */
  function aboutBox(circ, px, clientName) {
    if (!circ || !circ.id) return ''
    var first = String(clientName || circ.client_name || 'this client').split(' ')[0]
    var id = 'famabout-' + px
    /* Caregiver Preview (2026-10-24): once its switch is on, the About, What they enjoy and the care summary are kept on the
       profile's own Caregiver Preview tab; this box becomes a pointer to it (one place, one copy). */
    if (((typeof DATA !== 'undefined' && DATA && DATA.ops_settings) || {}).caregiver_preview_live === true)
      return '<div style="margin:0 0 10px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;font-size:13.5px;">What caregivers see about ' + e(first) +
        ' on shift offers is kept on the <a href="javascript:void(0)" onclick="cpShowTab(\'cgprev\')">Caregiver Preview</a> tab.</div>'
    return '<div style="margin:0 0 10px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;">' +
      '<div style="font-weight:600;font-size:13.5px;">About ' + e(first) + ', for caregivers</div>' +
      '<div class="field-note">A few friendly sentences caregivers see when they\'re offered a visit in the Booking App, and on Cara\'s shift page when they open their shift link. First name only. No address or medical details.</div>' +
      '<textarea id="' + id + '" maxlength="400" rows="3" style="width:100%;margin-top:6px;font:inherit;font-size:13.5px;" placeholder="For example: ' + e(first) + ' loves gardening and old movies, and enjoys a short walk when it\'s nice out.">' + e(circ.caregiver_about || '') + '</textarea>' +
      '<div style="display:flex;gap:8px;align-items:center;margin-top:4px;"><button class="btn btn-ghost btn-sm" style="padding:2px 9px;font-size:12px;" onclick="FAMAPP.aboutSave(\'' + e(circ.id) + '\',\'' + e(px) + '\',this)">Save</button>' +
      '<span class="field-note" id="' + id + '-msg">' + (circ.caregiver_about_at ? 'Last saved ' + e(new Date(circ.caregiver_about_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) + (circ.caregiver_about_by ? ' by ' + e(String(circ.caregiver_about_by).split('@')[0]) : '') : '') + '</span></div>' +
      /* 2026-10-24 (Cara's shift page): What they enjoy, up to 6 short things, office-approved */
      '<div style="font-weight:600;font-size:13.5px;margin-top:10px;">What ' + e(first) + ' enjoys</div>' +
      '<div class="field-note">Up to 6 short things, separated by commas. Caregivers see them on Cara\'s shift page. Nothing private.</div>' +
      '<input id="famenjoy-' + px + '" maxlength="200" style="width:100%;margin-top:6px;font:inherit;font-size:13.5px;" placeholder="Gardening, old movies, card games" value="' + e((circ.caregiver_enjoys || []).join(', ')) + '">' +
      '<div style="display:flex;gap:8px;align-items:center;margin-top:4px;"><button class="btn btn-ghost btn-sm" style="padding:2px 9px;font-size:12px;" onclick="FAMAPP.enjoysSave(\'' + e(circ.id) + '\',\'' + e(px) + '\',this)">Save</button>' +
      '<span class="field-note" id="famenjoy-' + px + '-msg">' + (circ.caregiver_enjoys_at ? 'Last saved ' + e(new Date(circ.caregiver_enjoys_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) + (circ.caregiver_enjoys_by ? ' by ' + e(String(circ.caregiver_enjoys_by).split('@')[0]) : '') : '') + '</span></div>' +
      /* 2026-10-24: the care-plan parts show on shift pages only when the office ticks this (off by default) */
      '<label style="display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:13.5px;"><input type="checkbox" style="width:auto;margin-top:3px;"' + (circ.caregiver_share_care ? ' checked' : '') + ' onchange="FAMAPP.shareCare(\'' + e(circ.id) + '\',\'' + e(px) + '\',this)">' +
      '<span><b>Share the care needs on shift pages</b><br><span class="field-note">What ' + e(first) + '\'s caregiver would help with, the care level, the skills needed, and pets or smoking in the home, from the care plan. Off: shift pages show only the shift, the About and What ' + e(first) + ' enjoys.</span>' +
      '<span class="field-note" id="famshare-' + px + '-msg" style="display:block;">' + (circ.caregiver_share_care_at ? 'Last changed ' + e(new Date(circ.caregiver_share_care_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) + (circ.caregiver_share_care_by ? ' by ' + e(String(circ.caregiver_share_care_by).split('@')[0]) : '') : '') + '</span></span></label></div>'
  }
  function shareCare(circleId, px, box) {
    var msg = document.getElementById('famshare-' + px + '-msg'), on = !!box.checked
    box.disabled = true; if (msg) msg.textContent = 'Saving…'
    return call({ action: 'share_care', circle_id: circleId, on: on }).then(function (d) {
      box.disabled = false; box.checked = !!d.on; if (msg) msg.textContent = d.on ? 'Shared: shift pages show the care needs.' : 'Not shared: shift pages show only the shift, the About and What they enjoy.'
    }).catch(function (err) { box.disabled = false; box.checked = !on; if (msg) msg.innerHTML = '<span style="color:#b91c1c;">' + e(err.message) + '</span>' })
  }
  function enjoysSave(circleId, px, b) {
    var inp = document.getElementById('famenjoy-' + px), msg = document.getElementById('famenjoy-' + px + '-msg')
    if (!inp) return
    b.disabled = true; if (msg) msg.textContent = 'Saving…'
    return call({ action: 'enjoys', circle_id: circleId, items: inp.value.split(',') }).then(function (d) {
      b.disabled = false; inp.value = (d.items || []).join(', '); if (msg) msg.textContent = (d.items || []).length ? 'Saved. Caregivers see these on the shift page.' : 'Cleared.'
    }).catch(function (err) { b.disabled = false; if (msg) msg.innerHTML = '<span style="color:#b91c1c;">' + e(err.message) + '</span>' })
  }
  function aboutSave(circleId, px, b) {
    var ta = document.getElementById('famabout-' + px), msg = document.getElementById('famabout-' + px + '-msg')
    if (!ta) return
    b.disabled = true; if (msg) msg.textContent = 'Saving…'
    return call({ action: 'about', circle_id: circleId, text: ta.value }).then(function (d) {
      b.disabled = false; ta.value = d.text || ''; if (msg) msg.textContent = d.text ? 'Saved. Caregivers see this on visit offers.' : 'Cleared. Caregivers see no About.'
    }).catch(function (err) { b.disabled = false; if (msg) msg.innerHTML = '<span style="color:#b91c1c;">' + e(err.message) + '</span>' })
  }
  window.FAMAPP = { axisWelcome: axisWelcome, axisSend: axisSend, bookingSwitch: bookingSwitch, bookingSet: bookingSet, setType: setType, welcomeSkip: welcomeSkip, hipaaOk: hipaaOk, confirmPhone: confirmPhone, lateBilled: lateBilled, review: review, fillClose: fillClose, helpFill: helpFill, appTasks: appTasks, aboutBox: aboutBox, aboutSave: aboutSave, enjoysSave: enjoysSave, shareCare: shareCare, circleLine: circleLine, register: function (px, reload) { ctxs[px] = { reload: reload } }, act: act, copy: copy, welcome: welcome, welcomeSend: welcomeSend, render: render, schedule: schedule, place: place, fee: fee, feeCheck: feeCheck, feeBilled: feeBilled, plan: plan }
})()
