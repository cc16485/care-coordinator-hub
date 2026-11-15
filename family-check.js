/* Family Circles check (2026-10-18, her ask): every active client's Family Circle on one page, so the office can quickly
   see the circles are up to date and have the right people. READ ONLY: fixing stays on the client's profile
   (Family & Contacts tab), one place to edit. "Open their Family tab" goes straight there.
   Uses the Hub's own: sb, cl360Identity (the live client list), naBeatLoad/naSyncLine (nightly AxisCare sync),
   fcSyncAxis (the on-demand sync), escapeHtmlComms.
   2026-11-15 her ask ("I wanted to be able to check quickly and make sure everyone is checked texts okay"): a "Texts ok?"
   view, now the first pill: one line per family member with the same "texts ok" box as the Family tab, unticked first.
   That box is the ONE thing this page writes (circle_contacts.sms_consent, the same field the Family tab sets). */
(function () {
  var S = { loaded: false, loading: false, err: '', filter: 'texts', q: '', saving: {}, saveErr: '', clients: [], circles: [], people: {} }
  function esc(s) { return (window.escapeHtmlComms || function (x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) })(s) }
  function chip(t, tone, title) {
    var c = { bad: 'color:#8A1F17;background:#FDECEA;', warn: 'color:#92400E;background:#FBF0DD;', ok: 'color:#15803D;background:#DCFCE7;', info: 'color:#0F5E73;background:#E4F2F0;', mute: 'color:#6B6357;background:#F0EDE6;' }[tone || 'mute']
    return '<span' + (title ? ' title="' + esc(title) + '"' : '') + ' style="font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;white-space:nowrap;' + c + '">' + esc(t) + '</span>'
  }
  function day(iso) { try { return new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' }) } catch (x) { return '' } }
  function textable(p) { return !!(p.phone && p.sms_consent && !p.stopped_at) }
  /* 2026-10-25: the welcome that every family member gets is the AxisCare one */
  function welcomeDue(p) { return !!(p.email && p.source === 'axiscare' && p.hipaa_authorized === true && !p.axis_welcome_sent_at && !p.welcome_skip_at) }

  /* what needs a look for one client: [label, tone] */
  function issues(circle, people, gone) {
    var out = []
    if (!circle) return [['No Family Circle', 'bad']]
    if (!people.length) out.push(['Nobody in the circle', 'bad'])
    else {
      if (!people.some(function (p) { return p.hipaa_authorized === true })) out.push(['Nobody with HIPAA', 'bad'])
      if (!people.some(textable)) out.push(['Nobody we can text', 'warn'])
      if (!people.some(function (p) { return p.email })) out.push(['No email for anyone', 'warn'])
      var w = people.filter(welcomeDue).length
      if (w) out.push([w + ' AxisCare welcome' + (w === 1 ? '' : 's') + ' not sent', 'warn'])
      var typed = people.filter(function (p) { return p.source !== 'axiscare' && p.carried_from !== 'client' }).length
      if (typed) out.push([typed + ' not in AxisCare', 'info'])
    }
    if (gone.length) out.push([gone.length + ' left AxisCare\'s list', 'warn'])
    return out
  }

  function personLine(p, gone) {
    var bits = []
    if (p.is_primary) bits.push(chip('main contact', 'ok'))
    bits.push(p.hipaa_authorized === true ? chip('HIPAA ok', 'ok') : chip(p.hipaa_authorized === false ? 'no HIPAA' : 'HIPAA not answered', 'warn'))
    if (p.can_make_medical_decisions) bits.push(chip('medical decisions', 'info'))
    bits.push(p.email ? chip('email', 'mute', p.email) : chip('no email', 'warn'))
    bits.push(!p.phone ? chip('no phone', 'warn') : p.stopped_at ? chip('replied STOP', 'bad') : p.sms_consent ? chip('texts ok', 'ok', p.phone) : chip('no texts', 'mute', p.phone))
    bits.push(p.source === 'axiscare' ? chip('AxisCare', 'info') : p.carried_from === 'client' ? chip('the client', 'mute') : chip('typed by office', 'mute'))
    if (p.axis_welcome_sent_at) bits.push(chip('AxisCare welcome sent ' + day(p.axis_welcome_sent_at), 'ok'))
    else if (p.welcome_skip_at) bits.push(chip('no AxisCare welcome: ' + (p.welcome_skip_reason || ''), 'mute'))
    else if (p.axis_welcome_failed_at) bits.push(chip('AxisCare welcome couldn\'t go', 'bad', p.axis_welcome_failed_why || ''))
    else if (welcomeDue(p)) bits.push(chip('AxisCare welcome not sent', 'warn'))
    if (gone) bits = [chip('no longer on AxisCare\'s list', 'warn')]
    return '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:5px;padding:4px 0;font-size:13px;' + (gone ? 'opacity:.6;' : '') + '">'
      + '<b style="color:var(--navy);">' + esc(p.name || '(no name)') + '</b>'
      + (p.relationship || p.role ? '<span class="field-note">' + esc(p.relationship || p.role) + '</span>' : '')
      + bits.join('') + '</div>'
  }

  function rows() {
    var byAx = {}; S.circles.forEach(function (c) { if (c.axiscare_client_id) byAx[String(c.axiscare_client_id)] = c })
    return S.clients.map(function (r) {
      var ax = String(r.axiscare_client_id), c = byAx[ax] || null, all = c ? (S.people[c.id] || []) : []
      var people = all.filter(function (p) { return !p.axiscare_removed_at }), gone = all.filter(function (p) { return p.axiscare_removed_at })
      return { name: r.client_name, ax: ax, circle: c, people: people, gone: gone, issues: issues(c, people, gone) }
    }).sort(function (a, b) { return String(a.name).localeCompare(String(b.name)) })
  }

  /* the Texts ok? view: every family member of every active client, flat, unticked first */
  function textRow(x, p) {
    var id = esc(p.id), busy = S.saving[p.id]
    var box = p.stopped_at
      ? '<span style="width:18px;text-align:center;color:#8A1F17;font-weight:800;">✕</span>'
      : '<input type="checkbox" id="fckt_' + id + '" ' + (p.sms_consent ? 'checked ' : '') + (busy ? 'disabled ' : '') + 'onchange="FCK.setText(\'' + id + '\',this.checked)" style="width:18px;height:18px;margin:0;accent-color:#15803D;cursor:pointer;">'
    var note = p.stopped_at ? chip('replied STOP, we can\'t text them', 'bad') : busy ? '<span class="field-note">saving…</span>' : ''
    return '<label for="fckt_' + id + '" style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 4px;border-top:1px solid var(--border);font-size:14px;cursor:' + (p.stopped_at ? 'default' : 'pointer') + ';">'
      + box + '<b style="color:var(--navy);">' + esc(p.name || '(no name)') + '</b>'
      + (p.relationship || p.role ? '<span class="field-note">' + esc(p.relationship || p.role) + '</span>' : '')
      + '<span class="field-note">for ' + esc(x.name) + '</span>'
      + '<span style="flex:1;"></span><span style="font-size:13px;color:var(--text-muted);white-space:nowrap;">' + esc(p.phone) + '</span>' + note + '</label>'
  }
  function textsView(list) {
    var people = []; list.forEach(function (x) { x.people.forEach(function (p) { people.push({ x: x, p: p }) }) })
    var phone = people.filter(function (o) { return o.p.phone }), nophone = people.filter(function (o) { return !o.p.phone })
    var todo = phone.filter(function (o) { return !o.p.sms_consent && !o.p.stopped_at }), ok = phone.filter(function (o) { return o.p.sms_consent && !o.p.stopped_at }), stop = phone.filter(function (o) { return o.p.stopped_at })
    var sec = function (title, tone, arr, open) {
      if (!arr.length) return ''
      return '<div class="card" style="padding:10px 16px;margin:10px 0;"><div style="font-weight:800;font-size:15px;color:' + tone + ';padding-bottom:4px;">' + title + ' (' + arr.length + ')</div>'
        + arr.map(function (o) { return textRow(o.x, o.p) }).join('') + '</div>'
    }
    return '<div class="card" style="padding:12px 16px;margin:10px 0;font-size:15px;">'
      + (todo.length ? '<b style="color:#92400E;">' + todo.length + ' not ticked yet.</b> ' : '<b style="color:#15803D;">Everyone with a phone is ticked.</b> ')
      + '<span class="field-note" style="font-size:13.5px;">' + ok.length + ' of ' + phone.length + ' family members with a phone are ticked "texts ok". Tick the box once they say texts are fine; it saves straight away, the same box as on their Family tab.</span>'
      + (S.saveErr ? '<div style="color:var(--red);font-weight:700;margin-top:6px;">' + esc(S.saveErr) + '</div>' : '') + '</div>'
      + sec('Not ticked yet', '#92400E', todo)
      + sec('Texts ok', '#15803D', ok)
      + sec('Replied STOP', '#8A1F17', stop)
      + (nophone.length ? '<div class="card" style="padding:10px 16px;margin:10px 0;"><div style="font-weight:800;font-size:15px;color:var(--navy);">No phone number (' + nophone.length + ')</div>'
        + '<div class="field-note">Add a phone on their Family tab first: ' + nophone.map(function (o) { return '<a href="javascript:void(0)" data-open-client="' + esc(o.x.ax) + '" data-open-tab="family" style="color:var(--navy);font-weight:700;">' + esc(o.p.name || '(no name)') + '</a> (' + esc(o.x.name) + ')' }).join(', ') + '</div></div>' : '')
      + (people.length ? '' : '<div class="card" style="padding:14px 18px;color:var(--text-muted);">' + (S.q.trim() ? 'No active client or family member by that name.' : 'No family members yet.') + '</div>')
  }

  function render() {
    var box = document.getElementById('fck_box'); if (!box) return
    if (!S.loaded) { box.innerHTML = '<div class="field-note">' + (S.err ? '<span style="color:var(--red);">Could not load the circles: ' + esc(S.err) + '</span>' : 'Loading every Family Circle…') + '</div>'; return }
    var all = rows(), look = all.filter(function (x) { return x.issues.some(function (i) { return i[1] !== 'info' }) })
    var q = S.q.trim().toLowerCase()
    var match = q ? all.filter(function (x) { return String(x.name).toLowerCase().indexOf(q) >= 0 || x.people.some(function (p) { return String(p.name || '').toLowerCase().indexOf(q) >= 0 }) }) : null
    var texts = S.filter === 'texts', show = match || (S.filter === 'look' ? look : all)
    var untick = 0; all.forEach(function (x) { x.people.forEach(function (p) { if (p.phone && !p.sms_consent && !p.stopped_at) untick++ }) })
    var unlinked = S.circles.filter(function (c) { return !c.axiscare_client_id })
    var pill = function (k, label, n) { return '<button class="filter-pill' + (S.filter === k && (!q || k === 'texts') ? ' active' : '') + '" onclick="FCK.setFilter(\'' + k + '\')">' + label + ' <span style="opacity:.65;">' + n + '</span></button>' }
    box.innerHTML =
      '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">' + pill('texts', 'Texts ok?', untick ? untick + ' to tick' : 'all ticked') + pill('look', 'Needs a look', look.length) + pill('all', 'All active clients', all.length)
      + '<input id="fck_q" placeholder="Search a client or family member" value="' + esc(S.q) + '" oninput="FCK.search(this.value)" style="max-width:260px;margin-left:auto;"></div>'
      + (typeof naSyncLine === 'function' ? naSyncLine() : '')
      + (texts ? textsView(match ? match.map(function (x) { return String(x.name).toLowerCase().indexOf(q) >= 0 ? x : { name: x.name, ax: x.ax, people: x.people.filter(function (p) { return String(p.name || '').toLowerCase().indexOf(q) >= 0 }) } }) : all) : show.length ? show.map(function (x) {
        return '<div class="card" style="padding:12px 16px;margin:10px 0;">'
          + '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;">'
          + '<b style="font-size:15px;color:var(--navy);">' + esc(x.name) + '</b><span class="field-note">AxisCare #' + esc(x.ax) + ' · ' + x.people.length + ' in the circle</span>'
          + x.issues.map(function (i) { return chip(i[0], i[1]) }).join('')
          + (x.issues.length ? '' : chip('looks good', 'ok'))
          + '<span style="flex:1;"></span><a href="javascript:void(0)" data-open-client="' + esc(x.ax) + '" data-open-tab="family" style="font-size:12.5px;font-weight:700;color:var(--navy);">Open their Family tab →</a></div>'
          + (x.people.length || x.gone.length ? '<div style="margin-top:6px;border-top:1px solid var(--border);padding-top:4px;">' + x.people.map(function (p) { return personLine(p, false) }).join('') + x.gone.map(function (p) { return personLine(p, true) }).join('') + '</div>' : '')
          + '</div>'
      }).join('') : '<div class="card" style="padding:14px 18px;color:var(--text-muted);">' + (q ? 'No active client or family member by that name.' : S.filter === 'look' ? 'Every active client\'s circle looks good.' : 'No active clients.') + '</div>')
      + (unlinked.length && !q && !texts ? '<div class="card" style="padding:12px 16px;margin-top:14px;"><b style="color:#8A1F17;">' + unlinked.length + ' circle' + (unlinked.length === 1 ? ' isn\'t' : 's aren\'t') + ' tied to a client</b>'
        + '<div class="field-note">Nothing is sent from these until they are linked to a client: ' + unlinked.map(function (c) { return esc(c.client_name || '(no name)') }).join(', ') + '</div></div>' : '')
  }

  function load() {
    if (S.loading) return Promise.resolve(); S.loading = true; S.err = ''; render()
    return Promise.all([
      sb.from('care_circles').select('*').eq('active', true),
      sb.from('circle_contacts').select('*'),
      typeof cl360Identity === 'function' ? cl360Identity() : Promise.resolve([]),
      typeof naBeatLoad === 'function' ? naBeatLoad() : Promise.resolve()
    ]).then(function (a) {
      if (a[0].error) throw a[0].error
      if (a[1].error) throw a[1].error
      S.circles = a[0].data || []
      S.people = {}; (a[1].data || []).forEach(function (p) { (S.people[p.circle_id] = S.people[p.circle_id] || []).push(p) })
      S.clients = (a[2] || []).filter(function (r) { return r.axiscare_client_id && r.role_status === 'active' })
      S.loaded = true
    }).catch(function (e) { S.loaded = false; S.err = (e && e.message) || String(e) })
      .then(function () { S.loading = false; render() })
  }

  window.FCK = {
    mount: function () { if (!S.loaded) return load(); render(); return load() },
    refresh: function (btn) { if (btn) btn.disabled = true; return load().then(function () { if (btn) btn.disabled = false }) },
    sync: function (btn) { return Promise.resolve(typeof fcSyncAxis === 'function' ? fcSyncAxis(btn) : null).then(load) },
    setFilter: function (k) { S.filter = k; S.q = ''; S.saveErr = ''; render() },
    /* the one write on this page: the same "texts ok" box as the Family tab. A failed or refused save puts the box back and says so. */
    setText: function (id, on) {
      var p = null; Object.keys(S.people).forEach(function (k) { S.people[k].forEach(function (x) { if (String(x.id) === String(id)) p = x }) })
      if (!p || p.stopped_at) { render(); return Promise.resolve() }
      S.saving[p.id] = true; S.saveErr = ''; render()
      return sb.from('circle_contacts').update({ sms_consent: !!on }).eq('id', p.id).select('id').then(function (r) {
        if (r.error) throw r.error
        if (!r.data || !r.data.length) throw new Error('the change was not saved')
        p.sms_consent = !!on
      }).catch(function (e) { S.saveErr = 'Could not save ' + (p.name || 'that') + ': ' + ((e && e.message) || e) + '. Nothing changed.' })
        .then(function () { delete S.saving[p.id]; render() })
    },
    search: function (v) { S.q = v; S.saveErr = ''; render(); var i = document.getElementById('fck_q'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length) } },
    /* the Operations Board's row (board-feeds.js, 2026-11-12): the clients whose circle needs a look, by this page's own rule */
    look: function () {
      return (S.loaded ? Promise.resolve() : load()).then(function () {
        if (!S.loaded) return { err: S.err || 'not loaded', names: [] }
        return { names: rows().filter(function (x) { return x.issues.some(function (i) { return i[1] !== 'info' }) }).map(function (x) { return x.name }) }
      })
    },
    _state: S
  }
})()
