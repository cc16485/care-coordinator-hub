/* Board feeds (Samantha 2026-11-12, "One Work List": https://claude.ai/artifact/PHoeX4ToT5pqBqWcpDud24).
   Her rule 2: if it needs a person, it is on the Operations Board; every other tab is for looking things up.
   Each feed is a to-do list that lives on its own tab. The board shows it as ONE row with a count ("3 Family Circles
   need a look") and an Open button that goes to that tab, where the work is done. Nothing is copied: the count is
   read from the tab's own data and rules each time, so a row leaves the board by itself when its list is empty.
   No switch. No new records. First slice: Feedback, Family Circles, Referral Partners (owner, link), calls nobody
   could match, check-ins with no AxisCare client. */
(function (root) {
  'use strict';
  /* key, title for one / many, what it is, the tab its work is done on, the button word */
  const FEEDS = [
    { key:'feedback', label:'Feedback', one:'piece of feedback nobody has opened', many:'pieces of feedback nobody has opened', sub:'From families and caregivers', tab:'feedback', go:'Open Feedback' },
    { key:'circles', label:'Family Circles', one:'Family Circle needs a look', many:'Family Circles need a look', sub:'Nobody with HIPAA, nobody we can text, or a welcome not sent', tab:'fccheck', go:'Open Family Circles' },
    { key:'partner_owner', label:'Referral Partners', one:'referral partner needs an owner', many:'referral partners need an owner', sub:'Pick a Care Coordinator for each', tab:'referrers', go:'Open Referral Partners' },
    { key:'partner_link', label:'Referral Partners', one:'referral to link to a partner', many:'referrals to link to a partner', sub:'So they count for the right partner', tab:'referrers', go:'Open Referral Partners' },
    { key:'calls_unmatched', label:'calls nobody could match', one:'call nobody could match', many:'calls nobody could match', sub:'Say who it was and it joins their profile', tab:'ops', go:'Open the calls' },
    { key:'checkins_unlinked', label:'check-ins', one:'check-in with no AxisCare client', many:'check-ins with no AxisCare client', sub:'Link each one to its client', tab:'ops', go:'Open the check-ins' }
  ];
  /* pure: the board rows from what each feed found. found = { key: { n, names, err } }. Only feeds with something to do. */
  function rowsOf(found) {
    return FEEDS.map(function (f) {
      const r = (found || {})[f.key] || {}, n = Number(r.n) || 0;
      if (n < 1) return null;
      const names = (Array.isArray(r.names) ? r.names : []).filter(Boolean).map(String);
      const shown = names.slice(0, 3).join(', ') + (names.length > 3 ? ' and ' + (names.length - 3) + ' more' : '');
      return { key:f.key, n:n, title:n === 1 ? f.one : f.many, sub:shown || f.sub, tab:f.tab, go:f.go };
    }).filter(Boolean);
  }
  /* pure: lists that could not be read, so the board never says "nothing" when it did not look */
  function problemsOf(found) { return FEEDS.filter(function (f) { return (found || {})[f.key] && (found || {})[f.key].err; }).map(function (f) { return f.label; }).filter(function (x, i, all) { return all.indexOf(x) === i; }); }
  const CORE = { FEEDS, rowsOf, problemsOf };
  if (typeof module !== 'undefined' && module.exports) { module.exports = CORE; return; }

  /* ═══════════════════════════════════ in the Hub ═══════════════════════════════════ */
  const W = root;
  const D = function () { try { return DATA || {}; } catch (e) { return {}; } };
  const esc = function (s) { return typeof W.escapeHtmlComms === 'function' ? W.escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); };
  const S = { found:{}, at:0, busy:false };
  const EVERY = 5 * 60 * 1000;

  /* lists already in the page: read every time the board draws */
  function quick() {
    const out = {}, d = D();
    out.feedback = { n:(d.feedback || []).filter(function (f) { return f && !f.seen; }).length, names:[] };
    try {
      const PR = W.PartnerRules, orgs = (d.referral_orgs || []).filter(function (o) { return o && (!o.program_track || (o.program_track === 'ambassador' && o.program_status === 'active')); });
      let can = false; try { can = W.ccCan('assign_partners') || W.ccIsOwner(); } catch (e) { try { can = !!W.ccIsOwner(); } catch (e2) {} }
      if (PR) {
        const need = can ? PR.needsOwner(orgs) : [], un = PR.unlinked(d.leads || []);
        out.partner_owner = { n:need.length, names:need.map(function (o) { return o.name; }) };
        out.partner_link = { n:un.length, names:[] };
      }
    } catch (e) { out.partner_owner = { n:0, err:true }; }
    const cks = (d.client_checkins || []).filter(function (c) { return c && c.client_name && !c.axiscare_client_id; });
    out.checkins_unlinked = { n:cks.length, names:cks.map(function (c) { return c.client_name; }) };
    return out;
  }
  /* lists that need a fetch: at most every five minutes, then the board redraws */
  function script(src) { return new Promise(function (ok) { const sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = ok; document.head.appendChild(sc); }); }
  async function circles() {
    if (!W.FCK) await script('family-check.js?v=20261112bf');
    if (!W.FCK || typeof W.FCK.look !== 'function') return { n:0, err:true };
    const r = await W.FCK.look();
    return r.err ? { n:0, err:true } : { n:r.names.length, names:r.names };
  }
  async function unmatched() {
    /* UC, ucLoad and callsGroup are the old Needs Attention page's own (index.html); same rows, same grouping */
    if (typeof ucLoad !== 'function' || typeof UC === 'undefined') return { n:0 };
    await ucLoad();
    if (UC.err && UC.err !== 'off') return { n:0, err:true };
    const calls = UC.rows && typeof callsGroup === 'function' ? callsGroup(UC.rows) : [];
    return { n:calls.length, names:[] };
  }
  function refresh(force) {
    const now = Date.now();
    if (S.busy || (!force && now - S.at < EVERY)) return Promise.resolve();
    S.busy = true; S.at = now;
    const safe = function (p) { return p.catch(function () { return { n:0, err:true }; }); };
    return Promise.all([safe(circles()), safe(unmatched())]).then(function (a) {
      S.found.circles = a[0]; S.found.calls_unmatched = a[1]; S.busy = false;
      try { if (typeof MYWORK_TAB !== 'undefined' && MYWORK_TAB === 'board' && typeof W.renderMyWork === 'function') W.renderMyWork(); } catch (e) {}
    });
  }
  function found() { return Object.assign({}, S.found, quick()); }
  function rows() { return rowsOf(found()); }
  /* the rows the board draws inside Batches (ops-board.js) */
  function html() {
    refresh();
    const f = found(), list = rowsOf(f), bad = problemsOf(f);
    let h = list.map(function (r) {
      return '<div class="opl-brow" data-feed="' + esc(r.key) + '"><div class="n">' + r.n + '</div><div><b>' + esc(r.title.charAt(0).toUpperCase() + r.title.slice(1)) + '</b><div class="opl-sub">' + esc(r.sub) + '</div></div>'
        + '<button class="primary" onclick="BF.go(\'' + esc(r.key) + '\')">' + esc(r.go) + '</button></div>';
    }).join('');
    if (bad.length) h += '<div class="opl-none" data-feed-problem="1" style="color:var(--amber,#B45309);">Couldn\'t check: ' + esc(bad.join(', ')) + '. Open that tab to look.</div>';
    return h;
  }
  function go(key) {
    const f = FEEDS.filter(function (x) { return x.key === key; })[0]; if (!f) return;
    S.at = 0;   /* coming back to the board looks again */
    try { W.switchTab(f.tab); } catch (e) {}
  }
  W.BF = Object.assign({}, CORE, { rows, html, go, refresh, found, state:S });
})(typeof window !== 'undefined' ? window : globalThis);
