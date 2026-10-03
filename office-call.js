/* =============================================================================
   office-call.js · 431 "Call from office line" (Samantha 2026-10-03: "I want it to be like that across the hub for
   everything that is a click to call, it should call from leadconnector app, or just have it say call from office line")
   =============================================================================
   GoHighLevel has no way for us to start a call. So every staff click-to-call in the Hub opens the person's EXISTING
   GHL contact in the LeadConnector app (the business number), and she taps Call there. The cell phone stays as a small
   backup. This is the ONLY place in the staff Hub that builds a tel: link.

   Two ways to use it:
   1. In the Hub (signed in): put ocAttrs(phone, {email, client}) in place of href="tel:...". Nothing is looked up when
      the page draws. On a tap a small panel opens, asks ghl-call-link (staff sign-in) for the contact, then opens it
      in LeadConnector, with "Open in browser" and "Call from my cell". Not found: "Not in GoHighLevel" + my cell.
   2. On a link page (clockin.html, late.html: no sign-in): the server already looked the contact up, so
      ocInline(phone, label, ghl) draws the buttons straight away (ghl null means not found).
   The lookup only ever SEARCHES GoHighLevel. It never creates a contact.
   Which link opens the LeadConnector app (app.leadconnectorhq.com) rather than the browser must be confirmed on her
   phone; "Open in browser" uses app.hirecara.com.
   ============================================================================= */
(function () {
  'use strict';
  var APP = 'https://app.leadconnectorhq.com/', WEB = 'https://app.hirecara.com/';
  var e = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var digits = function (p) { return String(p || '').replace(/[^\d+]/g, ''); };
  var ten = function (p) { return String(p || '').replace(/\D/g, '').slice(-10); };
  var pretty = function (p) { var d = ten(p); return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : String(p || ''); };
  /* only links we built, to the two GHL hosts, ever go into an href */
  var okApp = function (u) { return typeof u === 'string' && u.indexOf(APP + 'v2/location/') === 0 && /^[\w:/.-]+$/.test(u); };
  var okWeb = function (u) { return typeof u === 'string' && u.indexOf(WEB + 'v2/location/') === 0 && /^[\w:/.-]+$/.test(u); };
  var WHY = { not_found: 'Not in GoHighLevel. No contact there has this number.', several: 'Not opened: more than one GoHighLevel contact has this number, so pick the right one in GoHighLevel.',
    no_number: 'There is no usable number to look up.', error: 'Could not check GoHighLevel just now.', not_set_up: 'GoHighLevel is not set up for this lookup.' };
  var cellLink = function (phone, txt) { var t = digits(phone); return t ? '<a class="oc-cell" href="tel:' + e(t) + '">' + e(txt || 'Call from my cell') + '</a>' : ''; };

  /** attributes for a Hub call button: use in place of href="tel:..." (keeps the element's own class and style) */
  function ocAttrs(phone, o) {
    o = o || {};
    return ' href="#" role="button" data-oc-phone="' + e(phone) + '"' + (o.email ? ' data-oc-email="' + e(o.email) + '"' : '')
      + (o.client ? ' data-oc-client="' + e(o.client) + '"' : '') + ' title="Call from office line (LeadConnector)"';
  }
  /** a link page's call block, from the server's lookup (ghl: {contact_id, app_url, web_url} or null) */
  function ocInline(phone, label, ghl, cls) {
    if (!digits(phone) && !(ghl && okApp(ghl.app_url))) return '';
    var num = phone ? ' · ' + e(pretty(phone)) : '';
    if (ghl && okApp(ghl.app_url)) {
      return '<a class="' + e(cls || 'call') + ' oc-office" href="' + e(ghl.app_url) + '" target="_blank" rel="noopener">📞 ' + e(label) + ' from office line' + num + '</a>'
        + '<div class="oc-alt">' + (okWeb(ghl.web_url) ? '<a href="' + e(ghl.web_url) + '" target="_blank" rel="noopener">Open in browser</a>' : '')
        + (digits(phone) ? ' · ' + cellLink(phone) : '') + '</div>';
    }
    return '<div class="oc-none"><b>' + e(label) + num + '</b>: ' + (ghl === null ? 'Not in GoHighLevel.' : 'GoHighLevel was not checked.') + ' ' + cellLink(phone) + '</div>';
  }

  /* ── the panel for Hub buttons ── */
  var css = '.oc-panel{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);width:min(380px,calc(100vw - 32px));z-index:2147483000;background:#fff;color:#1f2a36;'
    + 'border:1px solid #E2E8F0;border-radius:14px;box-shadow:0 10px 30px rgba(14,56,96,.25);padding:14px 16px;font:14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}'
    + '.oc-panel .oc-x{position:absolute;right:8px;top:6px;border:0;background:none;font-size:20px;line-height:1;cursor:pointer;color:#6B7280;width:auto;padding:4px;margin:0}'
    + '.oc-panel .oc-h{font-weight:800;color:#0E3860;margin:0 22px 8px 0}'
    + '.oc-panel .oc-go{display:block;text-align:center;background:#54BDB8;color:#fff;font-weight:800;padding:11px;border-radius:10px;text-decoration:none;font-size:15px}'
    + '.oc-panel .oc-alt,.oc-alt{font-size:12.5px;color:#6B7280;margin-top:8px;text-align:center}.oc-alt a,.oc-panel a.oc-cell,.oc-none a{color:#0E3860;font-weight:600}'
    + '.oc-none{font-size:13px;color:#6B7280;margin-top:8px}.oc-panel .oc-msg{font-size:13px;color:#6B7280;margin:4px 0 6px}'
    + '.oc-spin{display:inline-block;width:14px;height:14px;border:2px solid #E2E8F0;border-top-color:#54BDB8;border-radius:50%;animation:ocs .8s linear infinite;vertical-align:-2px;margin-right:6px}'
    + '@keyframes ocs{to{transform:rotate(360deg)}}'
    + '@media (prefers-color-scheme:dark){.oc-panel{background:#1b2633;color:#e8eef5;border-color:#2c3a4a}.oc-panel .oc-h{color:#cfe3f5}.oc-panel .oc-alt a,.oc-panel a.oc-cell{color:#9fd6d3}}';
  function addCss() { if (document.getElementById('oc-css')) return; var s = document.createElement('style'); s.id = 'oc-css'; s.textContent = css; document.head.appendChild(s); }
  var panel = null, cache = {};
  function close() { if (panel) { panel.remove(); panel = null; } }
  function show(html) {
    addCss(); close();
    panel = document.createElement('div'); panel.className = 'oc-panel'; panel.setAttribute('role', 'dialog');
    panel.innerHTML = '<button class="oc-x" type="button" aria-label="Close">×</button>' + html;
    panel.querySelector('.oc-x').addEventListener('click', close);
    document.body.appendChild(panel);
  }
  /* the default lookup: the Hub's signed-in Supabase client (the global sb in index.html) */
  async function lookup(q) {
    if (typeof window.ocLookup === 'function') return window.ocLookup(q);
    var client = (typeof sb !== 'undefined' && sb) ? sb : null; // eslint-disable-line no-undef
    if (!client || !client.functions) return { found: false, why: 'error' };
    var r = await client.functions.invoke('ghl-call-link', { body: q });
    if (r.error || !r.data) return { found: false, why: 'error' };
    return r.data;
  }
  async function onTap(a) {
    var phone = a.getAttribute('data-oc-phone') || '', email = a.getAttribute('data-oc-email') || '', client = a.getAttribute('data-oc-client') || '';
    var head = '<div class="oc-h">Call ' + e(pretty(phone) || email) + '</div>';
    show(head + '<div class="oc-msg"><span class="oc-spin"></span>Finding them in GoHighLevel…</div>');
    var mine = panel, key = ten(phone) + '|' + email.toLowerCase() + '|' + client, f;
    try { f = cache[key] || await lookup({ phone: phone, email: email || undefined, axiscare_client_id: client || undefined }); }
    catch (err) { f = { found: false, why: 'error' }; }
    if (panel !== mine) return;                                   // closed, or another call tapped meanwhile
    if (f && f.found && okApp(f.app_url)) {
      cache[key] = f;
      var opened = null;
      try { opened = window.open(f.app_url, '_blank'); if (opened) opened.opener = null; } catch (err) { opened = null; }
      show(head + '<a class="oc-go" href="' + e(f.app_url) + '" target="_blank" rel="noopener">📞 Call from office line</a>'
        + '<div class="oc-msg" style="margin-top:8px">' + (opened ? 'Opened in LeadConnector. ' : '') + 'Tap Call on their contact there; it uses the office number.</div>'
        + '<div class="oc-alt">' + (okWeb(f.web_url) ? '<a href="' + e(f.web_url) + '" target="_blank" rel="noopener">Open in browser</a> · ' : '') + cellLink(phone) + '</div>');
    } else {
      if (f && f.found === false && f.why !== 'error') cache[key] = f;
      show(head + '<div class="oc-msg">' + e(WHY[(f && f.why) || 'error'] || WHY.error) + '</div><div class="oc-alt">' + (cellLink(phone) || 'No number to call.') + '</div>');
    }
  }
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('[data-oc-phone]') : null;
    if (a) { ev.preventDefault(); ev.stopPropagation(); onTap(a); return; }
    if (panel && !panel.contains(ev.target)) close();
  }, true);
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') close(); });
  if (document.head) addCss(); else document.addEventListener('DOMContentLoaded', addCss);
  window.ocAttrs = ocAttrs; window.ocInline = ocInline; window.ocPretty = pretty;
  window.__oc = { onTap: onTap, close: close, cache: cache, okApp: okApp, okWeb: okWeb };
})();
