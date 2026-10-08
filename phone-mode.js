/* =====================================================================================================================
   CC OFFICE ON THE PHONE · screen 1, NEEDS ME NOW (Samantha, 2026-10-07: "yes to all" to the plan at
   https://claude.ai/artifact/4ZPwYn1gcLgW26bQvdHWDL). The coordinators asked for the Hub on their phones.
   This is the Hub itself in a phone mode, opened as index.html?m=1 (the CC Office icon). Nothing is copied: the list
   is the Hub's own Today (myWorkBuckets, opsPriorityKey) and the buttons are the Hub's own actions (opsTakeIt,
   opsCloseCommit, opsLog, opEvent, persist), so the phone and the Hub can never disagree.
   Her decisions: everyone with a Hub sign-in; the phone stays signed in 14 days then asks again; Done on the phone is
   the Hub's Done.
   What the phone never does: the sign-in work the Hub runs on a computer (runSignInWork), the desktop screens, or the
   caregiver engine. It reads, and does the one thing tapped. Nothing here texts or emails anybody; Call rings the
   person's own phone first (office-call.js) and connects them from the office line.
   ===================================================================================================================== */
(function () {
  'use strict';
  var ON = /[?&]m=1(&|$)/.test(location.search);
  window.CC_PHONE = ON;
  if (!ON) return;
  document.documentElement.classList.add('ccphone');

  var DAYS14 = 14 * 864e5, KEY = 'cc_phone_signed_in_at';
  var css = ''
    + 'html.ccphone #appScreen,html.ccphone #appScreen.on{display:none!important}'
    + 'html.ccphone body{background:#F6F9FD;-webkit-text-size-adjust:100%}'
    + 'html.ccphone .signin-card h1{font-size:22px}'
    + '#phApp{display:none;font-family:Poppins,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1B2733;min-height:100vh;padding-bottom:calc(30px + env(safe-area-inset-bottom,0px))}'
    + 'html.ccphone.ph-on #phApp{display:block}'
    + '.ph-top{position:sticky;top:0;z-index:5;background:#0E3860;color:#fff;padding:calc(10px + env(safe-area-inset-top,0px)) 16px 10px;display:flex;align-items:center;gap:10px}'
    + '.ph-top b{font-size:17px;flex:1}.ph-top small{display:block;font-size:11.5px;font-weight:400;opacity:.75}'
    + '.ph-top button{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.45);border-radius:8px;padding:6px 10px;font:inherit;font-size:12.5px}'
    + '.ph-wrap{padding:6px 14px 0}'
    + '.ph-lane{font-size:12px;font-weight:800;letter-spacing:.07em;margin:16px 2px 8px}'
    + '.ph-lane span{font-weight:400;letter-spacing:0;color:#5B6878;margin-left:6px}'
    + '.ph-card{background:#fff;border:1px solid #DCE4EE;border-radius:14px;padding:13px 13px 11px;margin-bottom:10px;box-shadow:0 1px 3px rgba(14,56,96,.05)}'
    + '.ph-card.act{border-color:#E8A39B;background:#FFF8F7}'
    + '.ph-k{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#2E8F8B}'
    + '.ph-t{font-size:15.5px;font-weight:700;color:#0E3860;margin:2px 0 3px;line-height:1.3}'
    + '.ph-s{font-size:13px;color:#5B6878;line-height:1.4}'
    + '.ph-who{font-size:12.5px;margin-top:6px}.ph-who b{color:#B42318}'
    + '.ph-d{font-size:13px;color:#1B2733;margin-top:6px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}'
    + '.ph-h{font-size:12px;color:#5B6878;margin-top:6px}'
    + '.ph-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}'
    + '.ph-b{appearance:none;border:1.5px solid #DCE4EE;background:#fff;color:#0E3860;border-radius:10px;padding:9px 14px;font:inherit;font-size:14px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;min-height:42px}'
    + '.ph-b.p{background:#2E8F8B;border-color:#2E8F8B;color:#fff}.ph-b:disabled{opacity:.5}'
    + '.ph-none{font-size:13.5px;color:#5B6878;padding:2px 4px 6px}'
    + '.ph-msg{margin:10px 14px 0;border-radius:10px;padding:10px 12px;font-size:13.5px}'
    + '.ph-msg.bad{background:#FDECEA;color:#8A1C12;border:1px solid #E8A39B}.ph-msg.ok{background:#E3F3F2;color:#1E5F5C;border:1px solid #9FD3CF}'
    + '.ph-foot{text-align:center;margin:22px 0 0;font-size:13px;color:#5B6878}.ph-foot a{color:#0E3860;font-weight:600}'
    + '.ph-sheet{position:fixed;inset:0;z-index:50;background:rgba(14,28,44,.45);display:flex;align-items:flex-end}'
    + '.ph-sheet>div{background:#fff;width:100%;border-radius:18px 18px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px))}'
    + '.ph-sheet h3{margin:0 0 4px;font-size:17px;color:#0E3860}.ph-sheet p{margin:0 0 10px;font-size:13px;color:#5B6878}'
    + '.ph-sheet textarea{width:100%;box-sizing:border-box;min-height:96px;font:inherit;font-size:16px;padding:10px;border:1.5px solid #DCE4EE;border-radius:10px}'
    + '.ph-sheet .ph-btns{justify-content:flex-end}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var lc = function (s) { return String(s || '').trim().toLowerCase(); };
  var first = function (s) { return String(s || '').split(/\s+/)[0]; };
  var BUSY = false, SHEET = false, TIMER = null, MSG = null;

  /* ── 14 days, then sign in again (her decision) ── */
  function stamp() { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* private window: nothing kept */ } }
  function expired() {
    try { var t = Number(localStorage.getItem(KEY) || 0); return !t || Date.now() - t > DAYS14; }
    catch (e) { return false; }
  }
  /* Called by the Hub's boot with a restored session. false = signed out, show the sign-in. */
  async function phGate() {
    if (!expired()) return true;
    try { await sb.auth.signOut(); } catch (e) { /* the sign-in shows anyway */ }
    var s = document.getElementById('signinScreen'); if (s) s.style.display = 'flex';
    var er = document.getElementById('loginError');
    if (er) { er.textContent = 'For safety on a phone, please sign in again (every 14 days).'; er.style.display = 'block'; er.style.color = '#5B6878'; }
    return false;
  }
  function phSignedIn() { stamp(); }

  /* ── the list: the Hub's own Today ── */
  function me() { try { return lc(opsMeKey()); } catch (e) { return ''; } }
  function rows() {
    var b = myWorkBuckets();
    return (b.today || []).slice().sort(function (a, c) {
      var ka = opsPriorityKey(a), kc = opsPriorityKey(c); return (ka[0] - kc[0]) || (ka[1] - kc[1]);
    });
  }
  /* Done needs the Hub's own screen for these: a project closes when every step is done, a journey step lives on the
     client, a review has its own form, a shift-note flag asks what was done. */
  function special(it) {
    return it.kind === 'project' || it.kind === 'journey' || it.kind === 'review'
      || (typeof cnIsFlag === 'function' && cnIsFlag(it));
  }
  function hubLink() { return 'index.html'; }
  function card(it, act) {
    var mine = lc(it.owner) === me() && !!me();
    var kind = ''; try { kind = opsKindLabel(it) || ''; } catch (e) { /* label is optional */ }
    var title = it.title || it.about || kind || 'Item';
    var sub = [it.title && it.about && it.about !== it.title ? it.about : '', it.caregiver ? 'Caregiver: ' + it.caregiver : ''].filter(Boolean).join(' · ');
    var due = ''; try { due = typeof opsDueText === 'function' ? opsDueText(it) : ''; } catch (e) { /* no due words */ }
    var who = !it.owner ? '<b>Nobody has it</b>' : mine ? 'Yours' : 'Owner: ' + esc(first(it.owner_name || opsOwnerName(it.owner) || it.owner));
    if (it.claimed_by && lc(it.claimed_by) !== lc(it.owner)) who += ' · ' + esc(first(it.claimed_by_name || opsOwnerName(it.claimed_by) || it.claimed_by)) + ' is on it';
    var last = (it.history || []).slice(-1)[0];
    var h = '<div class="ph-card' + (act ? ' act' : '') + '" id="ph_' + esc(it.id) + '">'
      + (kind ? '<div class="ph-k">' + esc(kind) + '</div>' : '')
      + '<div class="ph-t">' + esc(title) + '</div>'
      + (sub ? '<div class="ph-s">' + esc(sub) + '</div>' : '')
      + '<div class="ph-who">' + who + (due ? ' · ' + esc(due) : '') + '</div>'
      + (it.detail ? '<div class="ph-d">' + esc(it.detail) + '</div>' : '')
      + (last ? '<div class="ph-h">' + esc(last.by || '') + ': ' + esc(last.text || '') + '</div>' : '')
      + '<div class="ph-btns">';
    if (!mine) h += '<button class="ph-b p" data-ph="take" data-id="' + esc(it.id) + '">Take it</button>';
    if (special(it)) h += '<a class="ph-b' + (mine ? ' p' : '') + '" href="' + hubLink() + '">Open in the Hub</a>';
    else h += '<button class="ph-b' + (mine ? ' p' : '') + '" data-ph="done" data-id="' + esc(it.id) + '">Done</button>';
    h += '<button class="ph-b" data-ph="note" data-id="' + esc(it.id) + '">Note</button>';
    if (it.phone && typeof ocAttrs === 'function') h += '<a class="ph-b"' + ocAttrs(it.phone, {}) + '>Call</a>';
    return h + '</div></div>';
  }
  function phRender() {
    var box = document.getElementById('phList'); if (!box) return;
    var r = [];
    try { r = rows(); }
    catch (e) { box.innerHTML = '<div class="ph-msg bad">Today could not be worked out: ' + esc(e && e.message || e) + '. Open the full Hub.</div>'; return; }
    var act = r.filter(function (i) { return opsPriorityKey(i)[0] <= 2; }), due = r.filter(function (i) { return opsPriorityKey(i)[0] > 2; });
    var lane = function (label, note, color, list, none) {
      return '<div class="ph-lane" style="color:' + color + '">' + label + ' · ' + list.length + '<span>' + note + '</span></div>'
        + (list.length ? list.map(function (i) { return card(i, color === '#B42318'); }).join('') : '<div class="ph-none">' + none + '</div>');
    };
    box.innerHTML = lane('ACT NOW', 'urgent, late, or a shift about to start with nobody', '#B42318', act, 'Nothing urgent or late. Good.')
      + lane('DUE TODAY', 'everything else that needs doing today', '#B7791F', due, 'Nothing else due today.');
    var m = document.getElementById('phMsg');
    if (m) { m.className = MSG ? 'ph-msg ' + MSG.kind : ''; m.textContent = MSG ? MSG.text : ''; m.style.display = MSG ? 'block' : 'none'; }
    var who = document.getElementById('phWho');
    if (who) who.textContent = (typeof ME !== 'undefined' && ME.name ? first(ME.name) + ' · ' : '') + 'updated ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  function say(text, kind) { MSG = text ? { text: text, kind: kind || 'ok' } : null; phRender(); if (kind !== 'bad') setTimeout(function () { if (MSG && MSG.text === text) { MSG = null; phRender(); } }, 4000); }

  /* ── reading fresh, then doing the one thing tapped ── */
  async function fresh() {
    var r = await sb.from('app_data').select('data').eq('key', 'ops_items').maybeSingle();
    if (r.error) throw r.error;
    if (r.data && Array.isArray(r.data.data)) DATA.ops_items = r.data.data;
  }
  function saved() {
    var p = document.getElementById('syncPill');
    return !p || /Synced/.test(p.textContent || '');
  }
  async function act(id, fn, okText) {
    if (BUSY) return; BUSY = true;
    try {
      await fresh();
      var it = (DATA.ops_items || []).find(function (x) { return x.id === id; });
      if (!it || it.status !== 'open') { say('That one was already closed by someone else, so nothing was changed.', 'ok'); return; }
      await fn(it);
      if (saved()) say(okText, 'ok');
      else say('Not saved yet (the connection dropped). It is kept on this phone and tried again the next time CC Office opens. If it can\u2019t wait, do it in the full Hub.', 'bad');
    } catch (e) {
      say('Not saved: ' + (e && e.message || e) + '. Nothing was changed. Try again, or use the full Hub.', 'bad');
    } finally { BUSY = false; phRender(); }
  }
  function sheet(title, hint, placeholder, button, required, run) {
    SHEET = true;
    var d = document.createElement('div'); d.className = 'ph-sheet';
    d.innerHTML = '<div role="dialog" aria-modal="true"><h3>' + esc(title) + '</h3><p>' + esc(hint) + '</p>'
      + '<textarea id="phSheetText" placeholder="' + esc(placeholder) + '"></textarea>'
      + '<div class="ph-btns"><button class="ph-b" data-x="no">Cancel</button><button class="ph-b p" data-x="go">' + esc(button) + '</button></div></div>';
    document.body.appendChild(d);
    var ta = d.querySelector('textarea');
    var close = function () { SHEET = false; d.remove(); };
    d.addEventListener('click', function (ev) {
      if (ev.target === d || (ev.target.dataset && ev.target.dataset.x === 'no')) return close();
      if (ev.target.dataset && ev.target.dataset.x === 'go') {
        var v = (ta.value || '').trim();
        if (required && !v) { ta.focus(); ta.placeholder = 'Write the note first.'; return; }
        close(); run(v);
      }
    });
    setTimeout(function () { ta.focus(); }, 50);
  }
  function title(it) { return it.about || it.title || 'this'; }
  function onTap(ev) {
    var b = ev.target.closest && ev.target.closest('[data-ph]'); if (!b) return;
    var id = b.getAttribute('data-id'), what = b.getAttribute('data-ph');
    var it = (DATA.ops_items || []).find(function (x) { return x.id === id; }); if (!it) return;
    if (what === 'take') { b.disabled = true; act(id, function (x) { return opsTakeIt(x.id); }, 'It’s yours now.'); }
    if (what === 'done') sheet('Mark this done', title(it), 'What happened? Optional.', 'Done', false, function (note) {
      act(id, function (x) { return opsCloseCommit(x, note, null); }, 'Done. It’s off the list.');
    });
    if (what === 'note') sheet('Add a note', title(it) + '. It stays open; the note shows on the card in the Hub too.', 'e.g. 10 min out, client told', 'Save note', true, function (note) {
      act(id, async function (x) {
        opsLog(x, 'Note: ' + note);
        opEvent('item_note', { item: x, summary: (ccActor().name || 'Someone') + ' added a note to ' + title(x) + ': ' + note });
        await persist('ops_items', x);
      }, 'Note saved.');
    });
  }

  /* ── start (called by the Hub's boot and sign-in, phone mode only) ── */
  function build() {
    if (document.getElementById('phApp')) return;
    var d = document.createElement('div'); d.id = 'phApp';
    d.innerHTML = '<div class="ph-top"><b>Needs me now<small id="phWho"></small></b>'
      + '<button type="button" id="phRefresh">Refresh</button><button type="button" id="phOut">Sign out</button></div>'
      + '<div id="phMsg" style="display:none"></div>'
      + '<div class="ph-wrap"><div id="phList"><div class="ph-none" style="padding-top:14px">Loading…</div></div>'
      + '<div class="ph-foot"><a href="' + hubLink() + '">Open the full Hub</a></div></div>';
    document.body.appendChild(d);
    d.addEventListener('click', onTap);
    document.getElementById('phRefresh').onclick = function () { tick(true); };
    document.getElementById('phOut').onclick = async function () {
      try { localStorage.removeItem(KEY); } catch (e) { /* nothing kept */ }
      document.documentElement.classList.remove('ph-on');
      if (TIMER) { clearInterval(TIMER); TIMER = null; }
      await signOut();
    };
  }
  async function tick(force) {
    if (!force && (BUSY || SHEET || document.hidden)) return;
    try { await fresh(); MSG = MSG && MSG.kind === 'bad' && !force ? MSG : null; }
    catch (e) { MSG = { text: 'Could not refresh: ' + (e && e.message || e) + '. Showing what was last loaded.', kind: 'bad' }; }
    phRender();
  }
  function phStart() {
    build();
    document.documentElement.classList.add('ph-on');
    var s = document.getElementById('signinScreen'); if (s) s.style.display = 'none';
    /* The Hub's own actions redraw the desktop screens when they finish. On the phone those are hidden, so they redraw
       this list instead (and never run anything else). */
    window.myWorkRefresh = phRender;
    window.renderActiveTab = phRender;
    /* The phone says what happened in its own message (green, or red when a save did not go through), so the Hub's
       own pop-up would only repeat it, or contradict it when the connection drops. */
    window.ccToast = function () {};
    phRender();
    if (!TIMER) TIMER = setInterval(function () { tick(false); }, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(false); });
  }
  window.phGate = phGate; window.phStart = phStart; window.phSignedIn = phSignedIn; window.phRender = phRender;
})();
