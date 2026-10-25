/* booking-app-activity.js (window.BAA) · THE BOOKING APP PAGE (Samantha 2026-10-25: "how can we see in the hub that a family has
   signed up and what it all says", "what person made a booking app account or signed into one and when", "i want a good view
   of everything that happens in the app"). Client Care > Booking App. READ ONLY.
   - Everyone who has the app: invited when and by whom, the welcome, the Booking App's own last sign-in, when they last opened
     it (recorded by the Hub from 2026-10-25), whether they wrote their loved one's profile, and their requests.
   - Everything that happened, newest first: opens, requests (what, when, the note, how it ended), cancellations, profile
     changes with the words before and after, saves the app stopped, and the office's own steps (invites, welcomes).
   - Shown while ops_settings.app_activity_live is on; owners always see it.
   Server: family-app-office {action:'activity'} (office staff only). */
(function () {
  'use strict'
  var S = { data: null, err: '', loading: false, days: 90, who: '' }
  var e = function (s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
  var D = function () { return (window.DATA && window.DATA.ops_settings) || {} }
  function owner() { return typeof ccIsOwner === 'function' ? !!ccIsOwner() : (typeof CC_ROLES !== 'undefined' && Array.isArray(CC_ROLES) && CC_ROLES.indexOf('owner_admin') >= 0) }
  function allowed() { return D().app_activity_live === true || owner() }
  function pillSync() { var p = document.querySelector('.fpill[data-tab="bookingapp"]'); if (p) p.style.display = allowed() ? '' : 'none' }
  function when(iso) { if (!iso) return ''; try { return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch (x) { return '' } }
  function day(d) { try { return new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }) } catch (x) { return d } }
  function t12(h) { var p = String(h || '').split(':'), n = Number(p[0]); return isNaN(n) ? '' : ((n + 11) % 12 + 1) + (p[1] && p[1] !== '00' ? ':' + p[1] : '') + ' ' + (n < 12 ? 'AM' : 'PM') }
  function chip(t, tone) {
    var c = { bad: 'color:#8A1F17;background:#FDECEA;', warn: 'color:#92400E;background:#FBF0DD;', ok: 'color:#15803D;background:#DCFCE7;', info: 'color:#0F5E73;background:#E4F2F0;', mute: 'color:#4B5563;background:#EEF2F6;' }[tone || 'mute']
    return '<span style="font-size:11.5px;font-weight:700;border-radius:999px;padding:2px 9px;white-space:nowrap;' + c + '">' + e(t) + '</span>'
  }
  var STATUS = { waiting_for_caregiver: ['Asking caregivers', 'info'], placed: ['Caregiver confirmed', 'ok'], not_filled: ['No caregiver was available', 'warn'], cancelled: ['Cancelled', 'mute'],
    practice: ['Practice (not real)', 'mute'], declined: ["Couldn't arrange in the app", 'warn'], needs_office: ['Needs the office', 'warn'], held: ['Held', 'warn'] }
  var KIND = { regular: 'Regular', flexible: 'Flexible', both: 'Combination' }
  function host() { return document.getElementById('baa_box') }

  function load() {
    if (!allowed()) { var h0 = host(); if (h0) h0.innerHTML = '<div class="card" style="padding:14px 16px;">The Booking App page is turned off.</div>'; return Promise.resolve() }
    if (S.loading) return Promise.resolve(); S.loading = true; S.err = ''; draw()
    return window.callAction('family-app-office', { action: 'activity', days: S.days }).then(function (r) {
      S.loading = false
      if (!r.data || r.status >= 400) { S.err = (r.data && r.data.error) || ('The server answered ' + r.status); return draw() }
      S.data = r.data; draw()
    }).catch(function (x) { S.loading = false; S.err = x.message || String(x); draw() })
  }

  /* one timeline of everything, newest first: [{at, contact_id, client, who, kind, html}] */
  function timeline(d) {
    var out = [], byId = {}
    d.people.forEach(function (p) { byId[String(p.id)] = p })
    d.activity.forEach(function (a) {
      var html = e(a.summary || a.kind)
      if (a.kind === 'profile_saved' && a.data && a.data.changes) html += a.data.changes.map(function (c) {
        return '<div style="margin:4px 0 0 10px;font-size:12.5px;"><b>' + e(c.field) + ':</b> ' + (c.before ? '<span style="color:#8A1F17;text-decoration:line-through;">' + e(c.before) + '</span> ' : '') + (c.after ? '<span style="color:#15803D;">' + e(c.after) + '</span>' : '<i>removed</i>') + '</div>'
      }).join('') + (a.data.ai === 'unavailable' ? '<div class="field-note" style="margin-left:10px;">The AI check was unavailable; the fixed checks passed.</div>' : '')
      out.push({ at: a.at, contact_id: String(a.contact_id || ''), client: a.axiscare_client_id, kind: a.kind, html: html })
    })
    d.bookings.forEach(function (b) {
      var st = STATUS[b.status] || [b.status, 'mute'], w = b.start_time ? t12(b.start_time) + ' to ' + t12(b.end_time) : (b.hours + ' hours, anytime ' + t12(b.window_start) + ' to ' + t12(b.window_end))
      out.push({ at: b.created_at, contact_id: String(b.contact_id || ''), client: b.axiscare_client_id, kind: 'request',
        html: '<b>' + e(b.requested_by_name || 'A family member') + '</b> asked for a visit for ' + e(String(b.client_name || '').split(' ')[0]) + ': ' + e(day(b.visit_date)) + ', ' + e(w) +
          (b.tasks && b.tasks.length ? ' (' + e(b.tasks.join(', ')) + ')' : '') + ' ' + chip(st[0] + (b.caregiver_name && b.status === 'placed' ? ': ' + b.caregiver_name : ''), st[1]) +
          (b.note ? '<div style="margin:4px 0 0 10px;font-size:12.5px;">Note: “' + e(b.note) + '”' + (b.note_hidden ? ' <span class="field-note">(hidden from caregivers)</span>' : '') + '</div>' : '') +
          (b.cancelled_at ? '<div class="field-note" style="margin-left:10px;">Cancelled ' + e(when(b.cancelled_at)) + (b.cancelled_by ? ' by ' + e(b.cancelled_by) : '') + '</div>' : '') +
          (b.ended_why ? '<div class="field-note" style="margin-left:10px;">' + e(b.ended_why) + '</div>' : '') })
    })
    d.events.forEach(function (v) {
      if (v.verb === 'family_booked' || v.verb === 'family_profile_saved') return   /* shown above with the details */
      out.push({ at: v.at, contact_id: String((v.data && v.data.contact_id) || ''), client: v.data && (v.data.client || v.data.axiscare_client_id), kind: v.verb, html: e(v.summary || v.verb) })
    })
    return out.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)) })
  }

  function personRow(p, reqs) {
    var off = p.app_status !== 'active' || p.stopped_at || p.axiscare_removed_at
    var access = off ? chip('Turned off', 'mute') : p.app_can_book ? chip('Can book', 'ok') : chip('Can see, can\'t book', 'info')
    var welcome = p.welcome_sent_at ? e(when(p.welcome_sent_at)) + '<div class="field-note">' + e(p.welcome_sent_by || '') + (p.welcome_version ? ' · ' + e(KIND[p.welcome_version] || p.welcome_version) : '') + '</div>'
      : p.welcome_skip_at ? '<span class="field-note">No welcome: ' + e(p.welcome_skip_reason || '') + '</span>' : chip('Not sent', 'warn')
    var signed = p.last_sign_in ? e(when(p.last_sign_in)) : p.sign_in_readable ? chip('Never signed in', 'warn') : '<span class="field-note">Can\'t read</span>'
    var opened = p.last_open ? e(when(p.last_open)) + '<div class="field-note">' + p.opens + ' time' + (p.opens === 1 ? '' : 's') + (p.first_open ? ', first ' + e(when(p.first_open)) : '') + '</div>' : '<span class="field-note">Not yet</span>'
    var sel = S.who === String(p.id)
    return '<tr style="cursor:pointer;' + (sel ? 'background:#F1F7F8;' : '') + '" onclick="BAA.pick(\'' + e(p.id) + '\')">' +
      '<td><b>' + e(p.name) + '</b><div class="field-note">' + e(p.relationship || '') + (p.email ? ' · ' + e(p.email) : '') + '</div></td>' +
      '<td>' + e(p.client_name || '') + '</td><td>' + access + '<div class="field-note">Invited ' + e(when(p.app_invited_at)) + (p.app_invited_by ? ' by ' + e(String(p.app_invited_by).split('@')[0]) : '') + '</div></td>' +
      '<td>' + welcome + '</td><td>' + signed + '</td><td>' + opened + '</td><td>' + (reqs || '<span class="field-note">None</span>') + '</td></tr>'
  }

  function profilesBox(d) {
    if (!d.profiles.length) return ''
    var name = function (ax) { var p = d.people.find(function (x) { return String(x.axiscare_client_id) === String(ax) }); return p ? p.client_name : 'Client ' + ax }
    return '<div class="card" style="padding:14px 16px;margin-top:14px;"><div style="font-weight:800;color:var(--navy);font-size:15px;">Profiles families wrote</div>' +
      '<div class="field-note" style="margin:2px 0 8px;">What caregivers see on Booking App offers. Separate from your Caregiver Preview, which shows on shifts.</div>' +
      d.profiles.map(function (f) {
        var rows = [['About', f.about], ['Their work and life', f.work], ['Loves to talk about', f.talk], ['Little things that make the day better', f.little], ['Enjoys', (f.enjoys || []).join(', ')]].filter(function (r) { return r[1] })
        return '<div style="padding:8px 0;border-top:1px dashed var(--border);"><b>' + e(name(f.axiscare_client_id)) + '</b> <span class="field-note">by ' + e(f.updated_by_name || '') + ', ' + e(when(f.updated_at)) + '</span>' +
          rows.map(function (r) { return '<div style="font-size:13px;margin-top:3px;"><span class="field-note">' + e(r[0]) + ':</span> ' + e(r[1]) + '</div>' }).join('') + '</div>'
      }).join('') + '</div>'
  }

  function draw() {
    var h = host(); if (!h) return
    if (S.err) { h.innerHTML = '<div class="card" style="padding:14px 16px;color:var(--red);">The Booking App page could not load: ' + e(S.err) + '</div>'; return }
    if (!S.data) { h.innerHTML = '<div class="field-note">Loading…</div>'; return }
    var d = S.data, people = d.people.slice().sort(function (a, b) { return String(a.client_name).localeCompare(String(b.client_name)) || String(a.name).localeCompare(String(b.name)) })
    var live = people.filter(function (p) { return p.app_status === 'active' && !p.stopped_at && !p.axiscare_removed_at })
    var everIn = live.filter(function (p) { return p.last_sign_in || p.last_open }).length
    var reqBy = {}; d.bookings.forEach(function (b) { var k = String(b.contact_id || ''); reqBy[k] = (reqBy[k] || 0) + 1 })
    var tl = timeline(d).filter(function (x) { return !S.who || x.contact_id === S.who })
    var picked = S.who ? people.find(function (p) { return String(p.id) === S.who }) : null
    h.innerHTML =
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">' + chip(live.length + ' with the app', 'info') + chip(everIn + (everIn === 1 ? ' has' : ' have') + ' signed in', everIn ? 'ok' : 'mute') + chip((live.length - everIn) + ' never signed in', live.length - everIn ? 'warn' : 'mute') +
        chip(d.bookings.length + ' request' + (d.bookings.length === 1 ? '' : 's') + ' in ' + S.days + ' days', 'mute') + chip(d.profiles.length + ' profile' + (d.profiles.length === 1 ? '' : 's') + ' written by families', 'mute') + '</div>' +
      '<div class="card" style="padding:0;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13.5px;"><thead><tr style="text-align:left;color:var(--text-muted);font-size:12px;">' +
        ['Person', 'For', 'Access', 'Welcome', 'Last signed in', 'Last opened', 'Requests'].map(function (x) { return '<th style="padding:10px 12px;border-bottom:1px solid var(--border);">' + x + '</th>' }).join('') + '</tr></thead><tbody>' +
        (people.length ? people.map(function (p) { return personRow(p, reqBy[String(p.id)]) }).join('').replace(/<td>/g, '<td style="padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:top;">') : '<tr><td style="padding:14px;" colspan="7">Nobody has the Booking App yet.</td></tr>') + '</tbody></table></div>' +
      '<div class="field-note" style="margin-top:6px;">Last signed in comes from the Booking App\'s own sign-in record. Last opened is recorded by the Hub' + (d.recording_since ? ' since ' + e(when(d.recording_since)) : ' from now on') + '. Click a person to see only their activity.</div>' +
      '<div class="card" style="padding:14px 16px;margin-top:14px;"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><div style="font-weight:800;color:var(--navy);font-size:15px;">' + (picked ? 'Everything ' + e(picked.name) + ' did' : 'Everything that happened') + '</div>' +
        (picked ? '<button class="ghost" style="padding:3px 10px;" onclick="BAA.pick(\'\')">Show everyone</button>' : '') + '<span style="flex:1"></span>' +
        '<select onchange="BAA.days(this.value)" style="padding:4px 8px;">' + [30, 90, 365].map(function (n) { return '<option value="' + n + '"' + (n === S.days ? ' selected' : '') + '>Last ' + n + ' days</option>' }).join('') + '</select></div>' +
        (tl.length ? tl.map(function (x) { return '<div style="padding:8px 0;border-top:1px dashed var(--border);font-size:13.5px;"><span class="field-note" style="display:inline-block;min-width:120px;">' + e(when(x.at)) + '</span> ' + x.html + '</div>' }).join('')
          : '<div class="field-note" style="padding:8px 0;">Nothing yet.</div>') + '</div>' + profilesBox(d)
  }

  window.BAA = {
    mount: function () { pillSync(); return load() }, refresh: function () { return load() }, pillSync: pillSync, allowed: allowed,
    pick: function (id) { S.who = S.who === String(id) ? '' : String(id); draw() },
    days: function (n) { S.days = Number(n) || 90; load() },
  }
  pillSync()
})()
