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
    // Release 1 (her approval 2026-10-17): a request isn't on AxisCare until a caregiver is placed; unfilled requests end "not filled"
    waiting_for_caregiver: ['Asking caregivers (not on AxisCare until placed)', '#B45309'], placed: ['Caregiver placed', 'var(--green,#15803d)'], cancelled: ['Cancelled', '#6b7280'],
    not_filled: ['Not filled (family told, nothing scheduled)', '#6b7280']
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
        '<button class="btn btn-primary btn-sm" onclick="FAMAPP.place(\'' + e(b.id) + '\', this)">Place and put on AxisCare</button>'
    var when = flexWaiting(b) ? 'flexible, ' + e(Number(b.hours)) + ' hours anytime ' + e(t12(b.window_start)) + ' to ' + e(t12(b.window_end)) : e(t12(b.start_time)) + ' to ' + e(t12(b.end_time))
    var picks = (b.preferred_caregiver_ids || []).length ? ' · asked for ' + (b.preferred_caregiver_ids || []).map(cgName).join(', ') + ' first' : (b.who === 'any' ? ' · whoever is available' : '')
    return '<div class="card" style="padding:12px 14px;margin-bottom:8px;" id="famb-' + e(b.id) + '">' +
      '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;"><b>' + e(b.client_name || 'Client') + ' · ' + e(day(b.visit_date)) + ', ' + when + '</b>' +
      '<span style="font-weight:700;color:' + s[1] + ';">' + e(s[0]) + (b.caregiver_name ? ': ' + e(b.caregiver_name) : '') + '</span></div>' +
      '<div class="field-note">' + e(Number(b.hours)) + ' hours · ' + e((b.tasks || []).join(', ')) + ' · booked by ' + e(b.requested_by_name || 'family') +
        (b.who === 'regular' ? ' · wants the regular caregiver' : b.who === 'favorites' ? ' · someone the client knows' : picks) + (b.state ? ' · ' + e(b.state) : '') + '</div>' +
      (b.status === 'waiting_for_caregiver' && b.answer_by ? '<div class="field-note">The family hears by ' + e(byWords(b.answer_by)) + (b.two_stage && b.team_from ? ' · the wider team is asked from ' + e(byWords(b.team_from)) : '') + '. Nothing to do unless you want to place someone.</div>' : '') +
      (b.status === 'placed' && b.sync_state === 'no_caregiver' ? '<div class="field-note">' + e(b.sync_note || 'The caregiver') + ' came off this visit in AxisCare. Coverage Help (or the office) covers it; the family\'s app says our office is arranging another caregiver.</div>' : '') +
      (b.status === 'cancelled' && b.cancel_source === 'office' ? '<div class="field-note">Removed in AxisCare, not by the family. Their app says we cancelled it; please call them with the reason.</div>' : '') +
      (b.status === 'placed' && b.family_change_pending ? '<div class="field-note">Changed in AxisCare. The family is told (8 AM to 8 PM).</div>' : '') +
      (b.status === 'placed' && b.family_change_how && !b.family_change_pending ? '<div class="field-note">Change message: ' + e(b.family_change_how) + '</div>' : '') +
      (b.status === 'not_filled' ? '<div class="field-note">Nobody accepted' + (b.ended_why === 'early' ? ' (everyone asked)' : '') + '. The family is told nothing was scheduled.</div>' : '') +
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
      '<div class="field-note" style="margin-top:4px;">' + (o.family_offer_live === true ? 'Caregivers are offered each booking by text: the family\'s picks first, then the team, first yes goes on the schedule. You get a card if nobody has said yes 24 hours before, or everyone has been asked.' : 'Caregiver offers are off (Owners Hub Admin page): place each booking yourself.') + '</div></div>'
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
                   : '<div class="field-note">Nobody yet. Invite someone from the Care circle card on a client\'s profile.</div>') +
        plansBox(d.plans || []) + '<div id="famFee" style="margin-top:14px;"></div>'
      fee()
      if (window.updateFamBadge) window.updateFamBadge(open.length)
    }).catch(function (err) { box.innerHTML = '<div class="field-note" style="color:#b91c1c;">' + e(err.message) + '</div>' })
  }
  // ── App fee check (her yes 2026-10-16): free any month with a visit, $15 for a month with none, the join month free ──
  function plansBox(ps) {
    if (!ps.length) return ''
    return '<h3 style="margin:16px 0 6px;">App plan clients</h3><div class="field-note" style="margin-bottom:6px;">Ticked clients are on the app plan: no weekly minimum, and the app fee for a month with no visits. Set-shift clients who only add extra visits can be unticked.</div>' +
      ps.map(function (k) {
        return '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:3px 0;font-size:13px;"><b>' + e(k.client_name || 'Client') + '</b>' +
          '<span class="field-note">' + (k.app_plan ? 'App plan since ' + e(k.app_plan_since || '?') : 'not on the app plan') + '</span>' +
          '<button class="btn btn-ghost btn-sm" style="padding:2px 9px;font-size:12px;" onclick="FAMAPP.plan(\'' + e(k.id) + '\',' + (!k.app_plan) + ', this)">' + (k.app_plan ? 'Take off the app plan' : 'Put on the app plan') + '</button></div>'
      }).join('')
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
    return '<div style="margin:0 0 10px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;">' +
      '<div style="font-weight:600;font-size:13.5px;">About ' + e(first) + ', for caregivers</div>' +
      '<div class="field-note">A few friendly sentences caregivers see when they\'re offered a visit booked in the family app. First name only. No address or medical details.</div>' +
      '<textarea id="' + id + '" maxlength="400" rows="3" style="width:100%;margin-top:6px;font:inherit;font-size:13.5px;" placeholder="For example: ' + e(first) + ' loves gardening and old movies, and enjoys a short walk when it\'s nice out.">' + e(circ.caregiver_about || '') + '</textarea>' +
      '<div style="display:flex;gap:8px;align-items:center;margin-top:4px;"><button class="btn btn-ghost btn-sm" style="padding:2px 9px;font-size:12px;" onclick="FAMAPP.aboutSave(\'' + e(circ.id) + '\',\'' + e(px) + '\',this)">Save</button>' +
      '<span class="field-note" id="' + id + '-msg">' + (circ.caregiver_about_at ? 'Last saved ' + e(new Date(circ.caregiver_about_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) + (circ.caregiver_about_by ? ' by ' + e(String(circ.caregiver_about_by).split('@')[0]) : '') : '') + '</span></div></div>'
  }
  function aboutSave(circleId, px, b) {
    var ta = document.getElementById('famabout-' + px), msg = document.getElementById('famabout-' + px + '-msg')
    if (!ta) return
    b.disabled = true; if (msg) msg.textContent = 'Saving…'
    return call({ action: 'about', circle_id: circleId, text: ta.value }).then(function (d) {
      b.disabled = false; ta.value = d.text || ''; if (msg) msg.textContent = d.text ? 'Saved. Caregivers see this on visit offers.' : 'Cleared. Caregivers see no About.'
    }).catch(function (err) { b.disabled = false; if (msg) msg.innerHTML = '<span style="color:#b91c1c;">' + e(err.message) + '</span>' })
  }
  window.FAMAPP = { aboutBox: aboutBox, aboutSave: aboutSave, circleLine: circleLine, register: function (px, reload) { ctxs[px] = { reload: reload } }, act: act, copy: copy, welcome: welcome, welcomeAxis: welcomeAxis, welcomeSend: welcomeSend, render: render, schedule: schedule, place: place, fee: fee, feeCheck: feeCheck, feeBilled: feeBilled, plan: plan }
})()
