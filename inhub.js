/* Pages shown INSIDE the Hub (2026-10-17, her "they don't stay in the tab and subtab structure").
   programs.html, guide.html and client-folders.html open in the Hub's SOPs section, and forms.html + client-folders.html in
   Documents, with ?in=hub. Then: their own
   header and tab row are hidden (the Hub's stay put), links between them stay inside the Hub, a link to a Hub tab
   (/#ltcpolicy) moves the Hub itself, and a tab switch keeps the top of the page in view. Opened on their own, they
   are unchanged. */
(function () {
  if (!/[?&]in=hub\b/.test(location.search) || window.parent === window) return;
  var d = document.documentElement; d.classList.add('inhub');
  var st = document.createElement('style');
  st.textContent = 'html.inhub header,html.inhub .hubtabs{display:none!important}'
    + 'html.inhub,html.inhub body{background:transparent!important;min-height:0!important;height:auto!important}'
    + '.inhub-back{display:inline-block;margin:10px 18px 0;font-size:13.5px;font-weight:600;color:#155A68}';
  document.head.appendChild(st);
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
    var raw = a.getAttribute('href') || '';
    if (raw.charAt(0) === '#') return;                      // the page's own sub-tabs
    var u; try { u = new URL(raw, location.href); } catch (x) { return; }
    if (u.origin !== location.origin) return;
    if (u.pathname === '/' || /\/index\.html$/.test(u.pathname)) {
      e.preventDefault();
      try { window.parent.location.hash = u.hash || '#sops'; } catch (x) { window.parent.location.href = u.href; }
      return;
    }
    var m = u.pathname.match(/\/(programs|guide|client-folders|forms|supplies)(\.html)?$/);
    if (m) { e.preventDefault(); var q = new URLSearchParams(u.search); q.set('in', 'hub'); location.href = m[1] + '.html?' + q.toString() + (u.hash || ''); }
  }, true);
  window.ccInHubTop = function () {
    try { var r = window.frameElement.getBoundingClientRect(); if (r.top < 0) window.parent.scrollBy(0, r.top - 12); } catch (x) {}
  };
  if (/\/guide(\.html)?$/.test(location.pathname)) {
    document.addEventListener('DOMContentLoaded', function () {
      var app = document.getElementById('app'); if (!app) return;
      var b = document.createElement('a'); b.className = 'inhub-back'; b.href = 'programs.html?in=hub#guide';
      b.textContent = '← Payors & Programs'; app.insertBefore(b, app.firstChild);
    });
  }
})();
