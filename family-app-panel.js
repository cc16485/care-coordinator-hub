/* family-app-panel.js (global window.FAMAPP; the Hub already has a const FAM, a cache) · The office side of the Family Circle
   lines on the client profile.
   2026-11-07 (Samantha): Caring Companions no longer offers the Booking App (it becomes its own company), "off and out of
   sight". Every Booking App line, switch, email and the Scheduling > Family bookings page are removed (they are in git
   history). What stays:
   - FAMAPP.circleLine(member, px, circ): the AxisCare Family Portal welcome line under each Family Circle person.
   - FAMAPP.aboutBox(...): About <client>, What they enjoy and Share the care needs, shown on Cara's shift page.
   All writes go through the Hub server door family-app-office (office staff only). */
(function () {
  'use strict'
  var e = function (s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
  var ctxs = {}   // px -> { reload }
  function call(body) { return window.callAction('family-app-office', body).then(function (r) { if (!r.data || r.status >= 400) throw new Error((r.data && r.data.error) || ('The Hub server answered ' + r.status)); return r.data }) }
  function settings() { return (window.DATA && window.DATA.ops_settings) || {} }

  // ── Family Circle line: the AxisCare welcome ────────────────────────────────────────────────────────────────────
  /* 2026-10-25 her rule: the AxisCare Family Portal email goes on its own to everyone in the circle who can use it (the Hub
     shows when, or why it couldn't), and a person can send it by hand. */
  var W = {}   // the last AxisCare welcome preview per person
  function when(iso) { try { return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch (x) { return '' } }
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
    if (m.stopped_at || m.axiscare_removed_at) return ''
    if (!m.email) return '<div class="fam-line" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:3px;font-size:12.5px;"><span class="field-note">Add an email for the AxisCare welcome</span></div>'
    return axisLine(m, px)
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
  function recordThenReopen(action, contactId, px, on, b, sureText) {
    if (on && !b.dataset.sure) { b.dataset.sure = '1'; b.textContent = sureText; return Promise.resolve() }
    b.disabled = true
    return call({ action: action, contact_id: contactId, on: !!on }).then(function () {
      var c = ctxs[px]
      return Promise.resolve(c && c.reload ? c.reload() : null).then(function () {
        var oa = document.getElementById('famaxw-' + px + '-' + contactId); if (oa) oa.remove()
        return axisWelcome(contactId, px)
      })
    }).catch(function (err) {
      b.disabled = false
      var m = b.parentNode && b.parentNode.querySelector('.fam-hmsg')
      if (m) m.innerHTML = '<span style="color:#b91c1c;">' + e(err.message) + '</span>'; else b.insertAdjacentHTML('afterend', ' <span style="color:#b91c1c;">' + e(err.message) + '</span>')
    })
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
      box.innerHTML = '<b>AxisCare welcome for ' + e(d.name) + '</b> <span class="field-note">(email only)</span>' + sent + failed +
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
      '<div class="field-note">A few friendly sentences caregivers see on Cara\'s shift page when they open their shift link. First name only. No address or medical details.</div>' +
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
      b.disabled = false; ta.value = d.text || ''; if (msg) msg.textContent = d.text ? 'Saved. Caregivers see this on the shift page.' : 'Cleared. Caregivers see no About.'
    }).catch(function (err) { b.disabled = false; if (msg) msg.innerHTML = '<span style="color:#b91c1c;">' + e(err.message) + '</span>' })
  }
  window.FAMAPP = { axisWelcome: axisWelcome, axisSend: axisSend, welcomeSkip: welcomeSkip, hipaaOk: hipaaOk, aboutBox: aboutBox, aboutSave: aboutSave, enjoysSave: enjoysSave, shareCare: shareCare, circleLine: circleLine, register: function (px, reload) { ctxs[px] = { reload: reload } } }
})()
