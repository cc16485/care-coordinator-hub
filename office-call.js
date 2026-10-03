/* =============================================================================
   office-call.js · every staff click-to-call in the Hub
   431 (Samantha 2026-10-03): calls go from the office line, never a bare tel: link. This is the ONLY place in the staff
   Hub that builds a tel: link.
   433 (2026-10-03, her option 1) "Call rings your phone first": no GoHighLevel web link opens the LeadConnector app, so
   a tap now asks the server to start a GoHighLevel call bridge: the contact is assigned to the person who tapped and
   tagged hub-call-bridge, and her GoHighLevel workflow "Hub call bridge" rings THEIR phone (the number on their
   GoHighLevel user), then connects them to the contact from the business number when they press a key. Logged in
   GoHighLevel. The panel says "Ringing your phone now. Answer, then press any key to connect to Ruth." with a small
   "Didn't ring? Open in browser · Call from my cell".
   =============================================================================
   Two ways to use it:
   1. In the Hub (signed in): put ocAttrs(phone, {email, client}) in place of href="tel:...". Nothing is asked when
      the page draws. On a tap a small panel opens and asks ghl-call-link {action:'bridge'} (staff sign-in).
   2. On a link page (clockin.html, late.html: no sign-in): the server already found the contact, so
      ocInline(phone, label, ghl, cls, target) draws the button straight away (ghl null means not found). When the page
      defines window.ocBridge(target) and gives a target ('client' or 'caregiver'), the tap rings the admin's phone
      through that page's own function (the admin is named by the sealed link).
   The contact is only ever SEARCHED for. Nothing here creates a contact or sends a text or email.
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
  var WHY = { not_found: 'Not in GoHighLevel. No contact there has this number.', several: 'Not called: more than one GoHighLevel contact has this number, so pick the right one in GoHighLevel.',
    no_number: 'There is no usable number to look up.', error: 'Could not check GoHighLevel just now.', not_set_up: 'GoHighLevel is not set up for this lookup.',
    no_user: 'Your GoHighLevel user isn\'t linked yet (Settings \u2192 Calls).',
    no_workflow: 'GoHighLevel can\'t ring you yet: the workflow "Hub call bridge" isn\'t published in GoHighLevel (Settings \u2192 Calls has the steps).',
    assign_failed: 'GoHighLevel did not start the call.', tag_failed: 'GoHighLevel did not start the call.' };
  var cellLink = function (phone, txt) { var t = digits(phone); return t ? '<a class="oc-cell" href="tel:' + e(t) + '">' + e(txt || 'Call from my cell') + '</a>' : ''; };

  /** attributes for a Hub call button: use in place of href="tel:..." (keeps the element's own class and style) */
  function ocAttrs(phone, o) {
    o = o || {};
    return ' href="#" role="button" data-oc-phone="' + e(phone) + '"' + (o.email ? ' data-oc-email="' + e(o.email) + '"' : '')
      + (o.client ? ' data-oc-client="' + e(o.client) + '"' : '') + ' title="Call (rings your phone first)"';
  }
  /** a link page's call block, from the server's lookup (ghl: {contact_id, app_url, web_url} or null).
      433: with a target ('client' | 'caregiver') and a page that defines window.ocBridge, the button rings your phone. */
  function ocInline(phone, label, ghl, cls, target) {
    if (!digits(phone) && !(ghl && okApp(ghl.app_url))) return '';
    var num = phone ? ' · ' + e(pretty(phone)) : '';
    if (ghl && okApp(ghl.app_url) && (target === 'client' || target === 'caregiver') && typeof window.ocBridge === 'function') {
      return '<a class="' + e(cls || 'call') + ' oc-office" href="#" role="button" data-oc-phone="' + e(phone || '') + '" data-oc-bridge="' + e(target) + '"'
        + (ghl.name ? ' data-oc-name="' + e(ghl.name) + '"' : '') + (okWeb(ghl.web_url) ? ' data-oc-web="' + e(ghl.web_url) + '"' : '') + '>📞 ' + e(label) + num + '</a>'
        + '<div class="oc-alt">Rings your phone first, then connects from the office number.'
        + ((okWeb(ghl.web_url) || digits(phone)) ? ' Or: ' + (okWeb(ghl.web_url) ? '<a href="' + e(ghl.web_url) + '" target="_blank" rel="noopener">Open in browser</a>' : '')
          + (okWeb(ghl.web_url) && digits(phone) ? ' · ' : '') + cellLink(phone) : '') + '</div>';
    }
    if (ghl && okApp(ghl.app_url)) {
      return '<a class="' + e(cls || 'call') + ' oc-office" href="' + e(ghl.app_url) + '" target="_blank" rel="noopener">📞 ' + e(label) + num + '</a>'
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
  var panel = null;
  function close() { if (panel) { panel.remove(); panel = null; } }
  function show(html) {
    addCss(); close();
    panel = document.createElement('div'); panel.className = 'oc-panel'; panel.setAttribute('role', 'dialog');
    panel.innerHTML = '<button class="oc-x" type="button" aria-label="Close">×</button>' + html;
    panel.querySelector('.oc-x').addEventListener('click', close);
    document.body.appendChild(panel);
  }
  /* 433: the Hub's bridge: the signed-in Supabase client (the global sb in index.html) asks ghl-call-link */
  async function bridge(q) {
    if (typeof window.ocHubBridge === 'function') return window.ocHubBridge(q);
    var client = (typeof sb !== 'undefined' && sb) ? sb : null; // eslint-disable-line no-undef
    if (!client || !client.functions) return { ok: false, why: 'error' };
    var r = await client.functions.invoke('ghl-call-link', { body: q });
    if (r.error || !r.data) return { ok: false, why: 'error', message: 'Could not reach the Hub\'s call service.' };
    return r.data;
  }
  var busy = false;
  function fallbacks(phone, web, lead) {
    var parts = [];
    if (okWeb(web)) parts.push('<a href="' + e(web) + '" target="_blank" rel="noopener">Open in browser</a>');
    var c = cellLink(phone); if (c) parts.push(c);
    return '<div class="oc-alt">' + (parts.length ? (lead ? e(lead) + ' ' : '') + parts.join(' · ') : 'No number to call.') + '</div>';
  }
  async function onTap(a) {
    if (busy) return;
    var phone = a.getAttribute('data-oc-phone') || '', email = a.getAttribute('data-oc-email') || '', client = a.getAttribute('data-oc-client') || '';
    var target = a.getAttribute('data-oc-bridge') || '', name0 = a.getAttribute('data-oc-name') || '', web0 = a.getAttribute('data-oc-web') || '';
    var head = '<div class="oc-h">Call ' + e(name0 || pretty(phone) || email) + '</div>';
    show(head + '<div class="oc-msg"><span class="oc-spin"></span>Asking GoHighLevel to ring your phone…</div>');
    var mine = panel, f;
    busy = true;
    try {
      if (target) f = typeof window.ocBridge === 'function' ? await window.ocBridge(target) : { ok: false, why: 'error' };
      else f = await bridge({ action: 'bridge', phone: phone, email: email || undefined, axiscare_client_id: client || undefined });
    } catch (err) { f = { ok: false, why: 'error', message: err && err.message ? String(err.message) : '' }; }
    busy = false;
    if (panel !== mine) return;                                   // closed meanwhile
    f = f || { ok: false, why: 'error' };
    var web = okWeb(f.web_url) ? f.web_url : web0;
    if (f.ok === true && f.ringing === 'you') {
      var who = f.name || name0 || 'them';
      show('<div class="oc-h">Calling ' + e(who) + '</div>'
        + '<div class="oc-msg" style="font-size:14.5px;color:inherit"><b>Ringing your phone now.</b> Answer, then press any key to connect to ' + e(who) + '.</div>'
        + fallbacks(phone, web, 'Didn\'t ring?'));
      return;
    }
    var why = f.why || 'error', msg;
    if (why === 'too_soon') msg = 'You just started a call. Try again in ' + (Number(f.wait_sec) > 0 ? Number(f.wait_sec) : 30) + ' seconds.';
    else msg = WHY[why] || WHY.error;
    if (f.message && why !== 'not_found' && why !== 'several') msg += ' ' + String(f.message);
    show(head + '<div class="oc-msg">' + e(msg) + '</div>' + fallbacks(phone, web, why === 'no_user' || why === 'no_workflow' || why === 'too_soon' ? 'For now:' : ''));
  }
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('[data-oc-phone]') : null;
    if (a) { ev.preventDefault(); ev.stopPropagation(); onTap(a); return; }
    if (panel && !panel.contains(ev.target)) close();
  }, true);
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') close(); });
  if (document.head) addCss(); else document.addEventListener('DOMContentLoaded', addCss);
  window.ocAttrs = ocAttrs; window.ocInline = ocInline; window.ocPretty = pretty;
  window.__oc = { onTap: onTap, close: close, okApp: okApp, okWeb: okWeb };
})();
