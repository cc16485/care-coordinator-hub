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
   Screen 2, FIND A PERSON (2026-10-07, her "start screen 2"): one search over the people the Hub already knows,
   from the same places the Hub reads them: caregivers (the AxisCare caregiver list, cgdCensus), clients (the Hub's
   client list, cl360Identity, with their family contacts from the care circle), inquiries (DATA.leads, still in the
   intake stages) and applicants (job_applicants and their booked interview). Looking only: nothing is saved from this
   screen. The card shows what you need to act (phone, where they are, what is next), never birth dates, Social
   Security numbers, background results, Medicaid numbers or medical details.
   Screen 3, TODAY (2026-10-07, "start screen 3"): one timeline of today in Chicago time, from the Hub's own readers:
   open shifts and missed clock-ins (SVX.sections, the Staffing view of Today), interviews (btInterviewsOn),
   assessments (btAssessmentsOn, with GoHighLevel's booked time), welcome calls and orientation sessions. Take it on a
   coverage or assessment card is the Hub's own Take it on that card's work item.
   Screen 4, END MY SHIFT (2026-10-07, "start screen 4"): the Hub's End My Shift (end-shift.js) with a phone layout.
   The lists are its eoLists(), the next person on duty is its EOX.nextOnDuty, and Post my handoff is its EOX.eoPost
   (hand to the next person on duty, mark done, keep with a note; urgent unowned work onto the Stand-Up board; the
   handoff written for the next person). Nobody is texted. A handoff someone posted to you shows at the top of Needs
   me now until you tap Got it (the Hub's hoAck), the same as on the Hub's Today.
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
    + '.ph-sheet .ph-btns{justify-content:flex-end}'
    + '.ph-tabs{position:fixed;left:0;right:0;bottom:0;z-index:20;background:#fff;border-top:1px solid #DCE4EE;display:flex;padding-bottom:env(safe-area-inset-bottom,0px)}'
    + '.ph-tabs button{flex:1;appearance:none;background:none;border:0;font:inherit;font-size:13px;font-weight:600;color:#5B6878;padding:12px 4px 13px}'
    + '.ph-tabs button.on{color:#0E3860;box-shadow:inset 0 3px 0 #2E8F8B}'
    + '#phApp{padding-bottom:calc(76px + env(safe-area-inset-bottom,0px))}'
    + '.ph-q{width:100%;box-sizing:border-box;font:inherit;font-size:17px;padding:12px 14px;border:1.5px solid #B9C6D6;border-radius:12px;margin-top:12px;background:#fff}'
    + '.ph-src{font-size:12px;color:#5B6878;margin:8px 2px 0}.ph-src b{color:#B42318;font-weight:600}'
    + '.ph-row{display:block;width:100%;text-align:left;appearance:none;background:#fff;border:1px solid #DCE4EE;border-radius:12px;padding:11px 13px;margin-bottom:8px;font:inherit;color:#1B2733}'
    + '.ph-row b{font-size:15px;color:#0E3860}.ph-row span{display:block;font-size:12.5px;color:#5B6878;margin-top:2px}'
    + '.ph-row .ph-tag{display:inline-block;margin-top:0}'
    + '.ph-tag{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;border-radius:6px;padding:2px 6px;margin-left:6px;vertical-align:2px;background:#E3F3F2;color:#1E6E6A}'
    + '.ph-tag.cl{background:#E7F6EC;color:#1F7A4D}.ph-tag.in{background:#FDF3E3;color:#A8660E}.ph-tag.ap{background:#EFEAFB;color:#6B4FBB}.ph-tag.past{background:#F1F5F9;color:#64748B}'
    + '.ph-dl{margin:10px 0 0;font-size:14px}.ph-dl div{display:flex;gap:10px;padding:7px 0;border-top:1px solid #EEF2F7}.ph-dl dt{flex:0 0 96px;color:#5B6878;font-size:12.5px}.ph-dl dd{margin:0;flex:1;min-width:0}'
    + '.ph-back{appearance:none;background:none;border:0;font:inherit;color:#0E3860;font-weight:600;font-size:14px;padding:12px 0 2px}'
    + '.ph-tl{display:grid;grid-template-columns:62px minmax(0,1fr);gap:8px;align-items:start}'
    + '.ph-tl .ph-tm{font-size:13px;font-weight:700;color:#0E3860;padding-top:14px;font-variant-numeric:tabular-nums}'
    + '.ph-tl.past{opacity:.55}.ph-now{display:flex;align-items:center;gap:8px;margin:4px 0 10px;font-size:11.5px;font-weight:800;letter-spacing:.06em;color:#2E8F8B}.ph-now:after{content:"";flex:1;height:2px;background:#2E8F8B}'
    + '.ph-ch{display:flex;gap:6px;margin-top:8px}.ph-ch button{flex:1;appearance:none;border:1.5px solid #DCE4EE;background:#fff;border-radius:9px;padding:9px 4px;font:inherit;font-size:13px;font-weight:600;color:#5B6878;min-height:42px}'
    + '.ph-ch button.on{background:#2E8F8B;border-color:#2E8F8B;color:#fff}'
    + '.ph-in{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:9px 10px;border:1.5px solid #DCE4EE;border-radius:9px;margin-top:8px}'
    + '.ph-ho{background:#EEF8F7;border:1.5px dashed #2E8F8B;border-radius:14px;padding:12px 13px;margin:12px 0 4px}.ph-ho ul{margin:6px 0 0;padding-left:18px;font-size:13.5px}'
    + '.ph-fam{border-top:1px solid #EEF2F7;padding:8px 0;display:flex;align-items:center;gap:10px}.ph-fam div{flex:1;min-width:0;font-size:14px}.ph-fam small{display:block;color:#5B6878;font-size:12px}';
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
    /* from your handoff (her call 2026-10-07): handed-to-me items sit above everything until Got it, as in the Hub */
    var pinned = []; try { pinned = typeof hoPinned === 'function' ? hoPinned() : []; } catch (e) { pinned = []; }
    var pinIds = pinned.map(function (i) { return i.id; });
    r = r.filter(function (i) { return pinIds.indexOf(i.id) < 0; });
    var act = r.filter(function (i) { return opsPriorityKey(i)[0] <= 2; }), due = r.filter(function (i) { return opsPriorityKey(i)[0] > 2; });
    var lane = function (label, note, color, list, none) {
      return '<div class="ph-lane" style="color:' + color + '">' + label + ' · ' + list.length + '<span>' + note + '</span></div>'
        + (list.length ? list.map(function (i) { return card(i, color === '#B42318'); }).join('') : '<div class="ph-none">' + none + '</div>');
    };
    box.innerHTML = handoffsHtml()
      + (pinned.length ? '<div class="ph-lane" style="color:#2E8F8B">FROM YOUR HANDOFF · ' + pinned.length + '<span>here until you tap Got it</span></div>' + pinned.map(function (i) { return card(i, false); }).join('') : '')
      + lane('ACT NOW', 'urgent, late, or a shift about to start with nobody', '#B42318', act, 'Nothing urgent or late. Good.')
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
    } finally { BUSY = false; phRender(); if (typeof VIEW !== 'undefined' && VIEW === 'today') { todayLoad(true); } }
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
    var g = ev.target.closest && ev.target.closest('[data-ho]');
    if (g) { g.disabled = true; g.textContent = 'Saving…'; Promise.resolve(hoAck(g.getAttribute('data-ho'))).then(function () { say(saved() ? 'Got it. The handoff is cleared.' : 'Not saved yet (the connection dropped). Try Got it again in a moment.', saved() ? 'ok' : 'bad'); }); return; }
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

  /* ── screen 2: find a person (looking only) ── */
  var FIND = { loaded: false, loading: false, cg: null, cl: null, ap: null, book: {}, coord: {}, err: {}, q: '', open: null };
  var digits = function (p) { var d = String(p || '').replace(/\D/g, ''); return d.length === 11 && d[0] === '1' ? d.slice(1) : d; };
  var pretty = function (p) { var d = digits(p); return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : String(p || ''); };
  /* a date with no time is that calendar day here, never the evening before (a bare date reads as midnight in London) */
  var day = function (iso) { var s = String(iso || ''); var d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T12:00:00' : s); return !s || isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
  var when = function (iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); };
  var AP_WORDS = { new: 'Applied', partial: 'Started an application', failed: 'Did not pass the screen', noshow: 'Missed an interview', offer: 'Offer made',
    pool: 'In the caregiver pool', left: 'Left', declined: 'Not moving forward', hired: 'Hired' };
  var STAGE = function (st) { var m = (typeof CC_STAGE_META !== 'undefined' && st && CC_STAGE_META[st.k]) || null; return m ? m[0] + (st.d ? ' · ' + st.d : '') : ''; };
  function openLead(l) { var k = ''; try { k = ccLeadStage(l).k; } catch (e) { return true; } return ['new', 'talking', 'assessment', 'ready'].indexOf(k) > -1; }
  async function findLoad() {
    if (FIND.loading || FIND.loaded) return; FIND.loading = true; FIND.err = {}; findRender();
    var jobs = [
      (async function () { var c = await cgdCensus(); FIND.cg = (c && c.caregivers) || []; })().catch(function (e) { FIND.err.cg = e && e.message || String(e); FIND.cg = []; }),
      (async function () { FIND.cl = (await cl360Identity()) || []; })().catch(function (e) { FIND.err.cl = e && e.message || String(e); FIND.cl = []; }),
      (async function () {
        var a = await sb.from('job_applicants').select('id,first_name,last_name,phone,email,status,screen_grade,position,created_at,city').order('created_at', { ascending: false }).limit(2000);
        if (a.error) throw a.error;
        FIND.ap = (a.data || []).filter(function (r) { return r.status !== 'hired'; });
        var b = await sb.from('interview_bookings').select('applicant_id,starts_at,status,coordinator_id').eq('status', 'booked').gte('starts_at', new Date().toISOString());
        FIND.book = {}; ((b && b.data) || []).forEach(function (x) { var cur = FIND.book[x.applicant_id]; if (!cur || x.starts_at < cur.starts_at) FIND.book[x.applicant_id] = x; });
        var c = await sb.from('coordinators').select('id,name'); FIND.coord = {}; ((c && c.data) || []).forEach(function (x) { FIND.coord[x.id] = x.name; });
      })().catch(function (e) { FIND.err.ap = e && e.message || String(e); FIND.ap = FIND.ap || []; })
    ];
    await Promise.all(jobs);
    FIND.loading = false; FIND.loaded = true; findRender();
  }
  /* every person as one search row: { type, key, name, sub, hay, digits } */
  function people() {
    var out = [];
    (FIND.cl || []).forEach(function (r) {
      var past = r.role_status && r.role_status !== 'active';
      out.push({ type: 'cl', key: 'cl:' + (r.person_id || r.axiscare_client_id), r: r, name: r.client_name || 'Client', past: past,
        sub: past ? 'Ended care' + (r.ended_at ? ' ' + day(r.ended_at) : '') : 'Receiving care', ph: [r.phone] });
    });
    (DATA.leads || []).filter(function (l) { return l && !l.spam && !l.is_test && !l.archived && openLead(l); }).forEach(function (l) {
      var caller = ((l.first_name || '') + ' ' + (l.last_name || '')).trim(), client = cpLeadClientName(l), st = '';
      try { st = STAGE(ccLeadStage(l)); } catch (e) { /* no stage words */ }
      out.push({ type: 'in', key: 'in:' + l.id, l: l, name: client, also: caller !== client ? caller : '',
        sub: (st || 'New') + (caller && caller !== client ? ' · ' + caller + (l.relationship ? ' (' + String(l.relationship).toLowerCase() + ')' : '') : ''), ph: [l.phone, l.client_phone] });
    });
    (FIND.cg || []).forEach(function (c) {
      var nm = ((c.first || '') + ' ' + (c.last || '')).trim();
      out.push({ type: 'cg', key: 'cg:' + c.id, c: c, name: nm || 'Caregiver', past: c.active === false,
        sub: (c.active === false ? 'No longer with us' : 'Active') + (c.city ? ' · ' + c.city : ''), ph: [c.mobile] });
    });
    (FIND.ap || []).forEach(function (a) {
      var nm = ((a.first_name || '') + ' ' + (a.last_name || '')).trim(), bk = FIND.book[a.id];
      out.push({ type: 'ap', key: 'ap:' + a.id, a: a, name: nm || 'Applicant',
        sub: (bk ? 'Interview ' + when(bk.starts_at) : (AP_WORDS[a.status] || a.status || '')) + ' · applied ' + day(a.created_at), ph: [a.phone] });
    });
    return out;
  }
  function matches(q) {
    var t = String(q || '').toLowerCase().trim(); if (t.replace(/\s/g, '').length < 2) return [];
    var dq = t.replace(/\D/g, ''), words = t.split(/\s+/).filter(Boolean);
    var order = { cl: 0, in: 1, cg: 2, ap: 3 };
    return people().filter(function (p) {
      if (dq.length >= 4 && dq.length === t.replace(/[\s()+.-]/g, '').length) return p.ph.some(function (x) { return digits(x).indexOf(dq) > -1; });
      var hay = (p.name + ' ' + (p.also || '')).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) > -1; });
    }).sort(function (a, b) { return (a.past ? 1 : 0) - (b.past ? 1 : 0) || order[a.type] - order[b.type] || a.name.localeCompare(b.name); }).slice(0, 40);
  }
  var TAGS = { cl: ['Client', 'cl'], in: ['Inquiry', 'in'], cg: ['Caregiver', ''], ap: ['Applicant', 'ap'] };
  function callBtn(phone, label, o) { return digits(phone).length >= 10 && typeof ocAttrs === 'function' ? '<a class="ph-b p"' + ocAttrs(phone, o || {}) + '>' + esc(label || 'Call') + '</a>' : ''; }
  function row(label, value) { return value ? '<div><dt>' + esc(label) + '</dt><dd>' + value + '</dd></div>' : ''; }
  var GHL = 'https://app.hirecara.com/v2/location/Recp0AhyMh8lrtKJ9kaj/contacts/detail/';
  async function detail(p) {
    var box = document.getElementById('phFindBody'); if (!box) return;
    var h = '<button class="ph-back" data-pf="back">‹ Back to the search</button><div class="ph-card" style="margin-top:8px">';
    var tg = TAGS[p.type];
    h += '<div class="ph-t">' + esc(p.name) + '<span class="ph-tag ' + (p.past ? 'past' : tg[1]) + '">' + tg[0] + '</span></div>';
    var btns = '', dl = '', extra = '';
    if (p.type === 'cg') {
      var c = p.c;
      dl = row('Status', esc(c.active === false ? 'Past caregiver' : 'Active caregiver')) + row('Phone', esc(pretty(c.mobile))) + row('Lives in', esc(c.city || ''))
        + row('Hired', esc(c.hire_date ? day(c.hire_date) : ''));
      btns = callBtn(c.mobile, 'Call', { email: c.email }) + (c.active !== false ? '<button class="ph-b" data-pf="shifts" data-id="' + esc(c.id) + '">Next shifts</button>' : '')
        + '<a class="ph-b" href="index.html#cg/' + encodeURIComponent(c.id) + '">Open in the Hub</a>';
      extra = '<div id="phShifts"></div>';
    }
    if (p.type === 'cl') {
      var r = p.r, nx = '';
      try { if (typeof cjJourneyFor === 'function' && typeof cjStageFor === 'function' && cjStageFor({ ax: r.axiscare_client_id })) { var j = cjJourneyFor({ ax: r.axiscare_client_id }); if (j && j.next && j.next.title) nx = j.next.title; } } catch (e) { /* no journey */ }
      dl = row('Status', esc(p.past ? 'Past client' + (r.ended_at ? ', ended ' + day(r.ended_at) : '') + (r.end_reason ? ' (' + r.end_reason + ')' : '') : 'Receiving care'))
        + row('Phone', esc(pretty(r.phone))) + row('Next step', esc(nx));
      btns = callBtn(r.phone, 'Call', { client: p.name })
        + (r.ghl_contact_id && /^[A-Za-z0-9]+$/.test(r.ghl_contact_id) ? '<a class="ph-b" target="_blank" rel="noopener" href="' + GHL + r.ghl_contact_id + '">GoHighLevel</a>' : '')
        + (r.axiscare_client_id ? '<a class="ph-b" href="index.html#p/A' + encodeURIComponent(r.axiscare_client_id) + '/summary">Open in the Hub</a>' : '');
      extra = '<div id="phFam"><div class="ph-src">Loading family contacts…</div></div>';
    }
    if (p.type === 'in') {
      var l = p.l, st = ''; try { st = STAGE(ccLeadStage(l)); } catch (e) { /* none */ }
      var caller = ((l.first_name || '') + ' ' + (l.last_name || '')).trim();
      var back = l.promised_callback_at || l.follow_up_due || '';
      dl = row('Stage', esc(st)) + row('Caller', esc(caller + (l.relationship ? ' (' + String(l.relationship).toLowerCase() + ')' : '')))
        + row('Phone', esc(pretty(l.phone))) + row('Client phone', esc(digits(l.client_phone) !== digits(l.phone) ? pretty(l.client_phone) : ''))
        + row('Coordinator', esc(l.assigned_coordinator || 'Nobody yet')) + row('Call back', esc(back ? (String(back).length > 10 ? when(back) : day(back)) : ''))
        + row('Asked us', esc(day(l.created_at)));
      btns = callBtn(l.phone, caller ? 'Call ' + first(caller) : 'Call', { email: l.email })
        + (digits(l.client_phone) && digits(l.client_phone) !== digits(l.phone) ? callBtn(l.client_phone, 'Call ' + first(cpLeadClientName(l))) : '')
        + '<a class="ph-b" href="index.html#p/L' + encodeURIComponent(l.id) + '/summary">Open in the Hub</a>';
    }
    if (p.type === 'ap') {
      var a = p.a, bk = FIND.book[a.id], pos = '';
      try { pos = typeof apPosLabel === 'function' ? apPosLabel(a.position) : ''; } catch (e) { /* no label */ }
      dl = row('Applied for', esc(pos || a.position || 'Caregiver')) + row('Where they are', esc(AP_WORDS[a.status] || a.status || ''))
        + row('Interview', esc(bk ? when(bk.starts_at) + (FIND.coord[bk.coordinator_id] ? ' with ' + first(FIND.coord[bk.coordinator_id]) : '') : 'None booked'))
        + row('Phone', esc(pretty(a.phone))) + row('Lives in', esc(a.city || '')) + row('Applied', esc(day(a.created_at)));
      btns = callBtn(a.phone, 'Call', { email: a.email }) + '<a class="ph-b" href="index.html#ap/' + encodeURIComponent(a.id) + '">Open in the Hub</a>';
    }
    box.innerHTML = h + '<dl class="ph-dl">' + dl + '</dl><div class="ph-btns">' + btns + '</div>' + extra + '</div>';
    if (p.type === 'cl') famLoad(p.r);
  }
  async function famLoad(r) {
    var box = document.getElementById('phFam'); if (!box) return;
    if (!r.axiscare_client_id) { box.innerHTML = ''; return; }
    try {
      var c = await sb.from('care_circles').select('id,client_name,axiscare_client_id,active').eq('axiscare_client_id', r.axiscare_client_id).eq('active', true);
      if (c.error) throw c.error;
      var circle = (c.data || [])[0];
      var m = circle ? await sb.from('circle_contacts').select('name,relationship,phone,email,is_primary,axiscare_removed_at').eq('circle_id', circle.id) : { data: [] };
      if (m.error) throw m.error;
      var fam = (m.data || []).filter(function (x) { return !x.axiscare_removed_at; }).sort(function (a, b) { return (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0); });
      var el = document.getElementById('phFam'); if (!el) return;
      el.innerHTML = '<div class="ph-lane" style="color:#0E3860;margin-top:14px">FAMILY · ' + fam.length + '</div>'
        + (fam.length ? fam.map(function (f) {
          return '<div class="ph-fam"><div>' + esc(f.name || 'Family') + (f.is_primary ? ' · main contact' : '') + '<small>' + esc([f.relationship, pretty(f.phone)].filter(Boolean).join(' · ')) + '</small></div>'
            + callBtn(f.phone, 'Call', { email: f.email, client: r.client_name }) + '</div>';
        }).join('') : '<div class="ph-none">No family contacts on their care circle yet.</div>');
    } catch (e) { var b2 = document.getElementById('phFam'); if (b2) b2.innerHTML = '<div class="ph-msg bad" style="margin:10px 0 0">Could not load the family contacts: ' + esc(e && e.message || e) + '</div>'; }
  }
  async function shiftsLoad(axid) {
    var box = document.getElementById('phShifts'); if (!box) return;
    box.innerHTML = '<div class="ph-src">Loading their shifts from AxisCare…</div>';
    try {
      var ses = (await sb.auth.getSession()).data.session; if (!ses) throw new Error('please sign in again');
      var r = await fetch(CONFIG.supabase_url + '/functions/v1/coverage-shifts', { method: 'POST',
        headers: { Authorization: 'Bearer ' + ses.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ caregiver_axiscare_id: String(axid) }) });
      var out = await r.json().catch(function () { return {}; });
      if (!r.ok || out.error) throw new Error(out.error || ('shifts ' + r.status));
      var sh = (out.shifts || []).slice(0, 8), el = document.getElementById('phShifts'); if (!el) return;
      el.innerHTML = '<div class="ph-lane" style="color:#0E3860;margin-top:14px">NEXT SHIFTS · NEXT 14 DAYS</div>'
        + (sh.length ? sh.map(function (s) { return '<div class="ph-fam"><div>' + esc(s.client || '') + '<small>' + esc([s.date, s.time].filter(Boolean).join(' · ')) + '</small></div></div>'; }).join('')
          : '<div class="ph-none">No shifts in the next 14 days.</div>');
    } catch (e) { var b2 = document.getElementById('phShifts'); if (b2) b2.innerHTML = '<div class="ph-msg bad" style="margin:10px 0 0">Could not load their shifts: ' + esc(e && e.message || e) + '</div>'; }
  }
  function findRender() {
    var box = document.getElementById('phFindBody'); if (!box || FIND.open) return;
    var src = [];
    if (FIND.loading) src.push('Loading caregivers, clients and applicants…');
    var bad = Object.keys(FIND.err).map(function (k) { return { cg: 'caregivers', cl: 'clients', ap: 'applicants' }[k] + ' (' + FIND.err[k] + ')'; });
    var res = matches(FIND.q), t = FIND.q.trim();
    box.innerHTML = '<div class="ph-src">' + esc(src.join(' ')) + (bad.length ? ' <b>Could not load ' + esc(bad.join(', ')) + '. The search below is missing them.</b>' : '') + '</div>'
      + (!t || t.replace(/\s/g, '').length < 2 ? '<div class="ph-none" style="margin-top:12px">Type at least two letters of a name, or four digits of a phone number.</div>'
        : res.length ? '<div style="margin-top:10px">' + res.map(function (p, i) {
          var tg = TAGS[p.type]; return '<button class="ph-row" data-pf="open" data-i="' + i + '"><b>' + esc(p.name) + '</b><span class="ph-tag ' + (p.past ? 'past' : tg[1]) + '">' + tg[0] + '</span><span>' + esc(p.sub) + '</span></button>';
        }).join('') + '</div>'
          : '<div class="ph-none" style="margin-top:12px">' + (FIND.loading ? 'Still loading…' : 'Nobody matches “' + esc(t) + '”.') + '</div>');
    FIND.last = res;
  }
  function onFindTap(ev) {
    var b = ev.target.closest && ev.target.closest('[data-pf]'); if (!b) return;
    var what = b.getAttribute('data-pf');
    if (what === 'open') { var p = (FIND.last || [])[Number(b.getAttribute('data-i'))]; if (!p) return; FIND.open = p; detail(p); window.scrollTo(0, 0); }
    if (what === 'back') { FIND.open = null; findRender(); var q = document.getElementById('phQ'); if (q) q.focus(); }
    if (what === 'shifts') { b.disabled = true; shiftsLoad(b.getAttribute('data-id')); }
  }

  /* ── screen 3: today (one timeline, Chicago time) ── */
  var TD = { loading: false, at: 0, rows: null, err: [] };
  var hm = function (t) { var m = /^(\d{1,2})(?::(\d{2}))?\s*([ap])?/i.exec(String(t || '').trim()); if (!m) return null;
    var h = +m[1] % (m[3] ? 12 : 24) + (m[3] && /p/i.test(m[3]) ? 12 : 0); return h * 60 + (+(m[2] || 0)); };
  var span = function (t) { return String(t || '').split('-').map(function (x) { var m = hm(x); return m == null ? x.trim() : btTime(m); }).join('-'); };
  var nowMin = function () { var c = new Date().toLocaleString('sv-SE', { timeZone: 'America/Chicago' }); return +c.slice(11, 13) * 60 + +c.slice(14, 16); };
  function itemFor(pred) {
    var me_ = me();
    return (DATA.ops_items || []).filter(function (i) { return i.status === 'open' && pred(i); })
      .map(function (i) { return { id: i.id, mine: lc(i.owner) === me_ && !!me_, owner: i.owner, owner_name: i.owner_name }; })[0] || null;
  }
  async function todayLoad(force) {
    if (TD.loading || (!force && TD.rows && Date.now() - TD.at < 60000)) return; TD.loading = true; TD.err = [];
    var day = btChiToday(), rows = [];
    var midUtc = Date.parse(day + 'T00:00:00Z');
    var safe = async function (label, fn) { try { await fn(); } catch (e) { TD.err.push(label + ' (' + (e && e.message || e) + ')'); } };
    var readKey = async function (k) { var r = await sb.from('app_data').select('data').eq('key', k).maybeSingle(); if (r.error) throw r.error; return Array.isArray(r.data && r.data.data) ? r.data.data : []; };
    await Promise.all([
      safe('open shifts', async function () {
        var cases = await readKey('coverage_cases'), tk = await readKey('timekeeper_cases');
        DATA.coverage_cases = cases; DATA.timekeeper_cases = tk;
        var S = SVX.sections(cases, tk, []);
        S.todayCases.forEach(function (c) {
          var a = SVX.asks(c), it = itemFor(function (i) { return String(i.coverage_case_id || '') === String(c.id); });
          var how = a.yes.length ? a.yes.map(function (y) { return first(y.name); }).join(', ') + ' said yes' : a.n ? a.n + ' asked · ' + a.no + ' said no · ' + a.wait + ' waiting' : 'nobody asked yet';
          rows.push({ min: hm(String(c.shift_time || '').split('-')[0]), kind: 'Open shift', red: true, title: c.client || 'Client',
            sub: [span(c.shift_time), c.calling_off ? first(c.calling_off) + ' called off' : '', how].filter(Boolean).join(' · '),
            item: it, link: 'index.html#cara/case/' + encodeURIComponent(c.id) });
        });
        S.clockins.forEach(function (l) {
          rows.push({ min: hm(l.shift_time), kind: 'No clock-in yet', red: true, title: l.caregiver || 'Caregiver',
            sub: [(l.client_first ? l.client_first + '’s ' : '') + span(l.shift_time) + ' shift', l.minutes_late != null ? l.minutes_late + ' min late' : ''].filter(Boolean).join(' · '), need: true });
        });
      }),
      safe('interviews', async function () {
        var b = await sb.from('interview_bookings').select('id,applicant_id,starts_at,status,coordinator_id').in('status', ['booked', 'attended', 'noshow'])
          .gte('starts_at', new Date(midUtc - 864e5).toISOString()).lt('starts_at', new Date(midUtc + 2 * 864e5).toISOString()).order('starts_at');
        if (b.error) throw b.error;
        var ids = (b.data || []).map(function (x) { return x.applicant_id; }).filter(Boolean);
        var a = ids.length ? await sb.from('job_applicants').select('id,first_name,last_name,phone,email').in('id', ids) : { data: [] };
        if (a.error) throw a.error;
        var byId = {}; (a.data || []).forEach(function (x) { byId[x.id] = x; });
        btInterviewsOn(day, b.data || [], a.data || [], btAfternoonRule(DATA.ops_settings)).forEach(function (r) {
          var ap = byId[r.applicant_id] || {};
          rows.push({ min: r.min, kind: 'Interview', title: r.name, past: r.status !== 'booked',
            sub: ['at the office', r.status === 'done' ? 'done' : r.status === 'no-show' ? 'did not come' : '', r.who ? 'with ' + r.who : ''].filter(Boolean).join(' · '),
            phone: ap.phone, email: ap.email, link: 'index.html#ap/' + encodeURIComponent(r.applicant_id) });
        });
      }),
      safe('assessments', async function () {
        btAssessmentsOn(day, DATA.care_assessments, DATA.leads).forEach(function (r) {
          var l = (DATA.leads || []).find(function (x) { return String(x.id) === String(r.lead_id); }) || null;
          var it = r.lead_id ? itemFor(function (i) { return i.id === 'ops_asmt_' + r.lead_id; }) : null;
          rows.push({ min: r.min, kind: 'Assessment', title: r.name, past: r.status !== 'booked',
            sub: [r.address, r.who ? 'with ' + r.who : ''].filter(Boolean).join(' · '), item: it,
            phone: l && l.phone, phoneLabel: l && l.first_name ? 'Call ' + first(l.first_name) : 'Call',
            link: r.lead_id ? 'index.html#p/L' + encodeURIComponent(r.lead_id) + '/summary' : (r.ax ? 'index.html#p/A' + encodeURIComponent(r.ax) + '/summary' : '') });
        });
      }),
      safe('welcome calls', async function () {
        var w = await sb.from('welcome_calls').select('id,first_name,last_name,phone,starts_at,status').eq('status', 'booked')
          .gte('starts_at', new Date(midUtc - 864e5).toISOString()).lt('starts_at', new Date(midUtc + 2 * 864e5).toISOString());
        if (w.error) throw w.error;
        (w.data || []).forEach(function (x) { var p = btChi(x.starts_at); if (!p || p.date !== day) return;
          rows.push({ min: p.min, kind: 'Welcome call', title: ((x.first_name || '') + ' ' + (x.last_name || '')).trim() || 'New caregiver', sub: '15 minutes, video', phone: x.phone }); });
      }),
      safe('orientation', async function () {
        (DATA.orient_sessions || []).forEach(function (o) {
          if (!o || o.cancelled || String(o.date || '') !== day) return;
          var n = (o.bookings || []).filter(function (b) { return !/cancel/i.test(String(b.attend_status || '')); }).length;
          rows.push({ min: hm(o.time || o.start), kind: 'Orientation', title: 'Orientation session', sub: n + ' booked' });
        });
      })
    ]);
    rows.sort(function (a, b) { return (a.min == null ? 9999 : a.min) - (b.min == null ? 9999 : b.min); });
    TD.rows = rows; TD.at = Date.now(); TD.loading = false; todayRender();
  }
  function todayRender() {
    var box = document.getElementById('phTodayBody'); if (!box) return;
    if (!TD.rows) { box.innerHTML = '<div class="ph-none" style="padding-top:14px">Loading today…</div>'; return; }
    var now = nowMin(), drew = false, h = '';
    var head = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Chicago' });
    h += '<div class="ph-lane" style="color:#0E3860">' + esc(head.toUpperCase()) + '<span>' + TD.rows.length + ' on the schedule</span></div>';
    if (TD.err.length) h += '<div class="ph-msg bad" style="margin:0 0 10px">Could not load ' + esc(TD.err.join(', ')) + '. The rest is below.</div>';
    TD.rows.forEach(function (r) {
      var past = r.past || (!r.red && r.min != null && r.min < now - 30);
      if (!drew && r.min != null && r.min >= now) { h += '<div class="ph-now">NOW ' + esc(btTime(now)) + '</div>'; drew = true; }
      var btn = '';
      if (r.item && !r.item.mine) btn += '<button class="ph-b p" data-pt="take" data-id="' + esc(r.item.id) + '">Take it</button>';
      if (r.need) btn += '<button class="ph-b p" data-pt="need">See in Needs me now</button>';
      if (r.phone) btn += callBtn(r.phone, r.phoneLabel || 'Call', { email: r.email });
      if (r.link) btn += '<a class="ph-b" href="' + esc(r.link) + '">Open in the Hub</a>';
      var who = r.item ? (r.item.mine ? 'Yours' : r.item.owner ? 'Owner: ' + esc(first(r.item.owner_name || opsOwnerName(r.item.owner) || r.item.owner)) : '<b>Nobody has it</b>') : '';
      h += '<div class="ph-tl' + (past ? ' past' : '') + '"><div class="ph-tm">' + esc(r.min == null ? 'Any time' : btTime(r.min)) + '</div>'
        + '<div class="ph-card' + (r.red ? ' act' : '') + '"><div class="ph-k"' + (r.red ? ' style="color:#B42318"' : '') + '>' + esc(r.kind) + '</div>'
        + '<div class="ph-t">' + esc(r.title) + '</div>' + (r.sub ? '<div class="ph-s">' + esc(r.sub) + '</div>' : '')
        + (who ? '<div class="ph-who">' + who + '</div>' : '') + (btn ? '<div class="ph-btns">' + btn + '</div>' : '') + '</div></div>';
    });
    if (!drew) h += '<div class="ph-now">NOW ' + esc(btTime(now)) + '</div>';
    if (!TD.rows.length) h += '<div class="ph-none">Nothing on today’s schedule: no open shifts, interviews, assessments, welcome calls or orientation.</div>';
    box.innerHTML = h;
  }
  function onTodayTap(ev) {
    var b = ev.target.closest && ev.target.closest('[data-pt]'); if (!b) return;
    if (b.getAttribute('data-pt') === 'need') return show('need');
    if (b.getAttribute('data-pt') === 'take') { b.disabled = true; act(b.getAttribute('data-id'), function (x) { return opsTakeIt(x.id); }, 'It’s yours now.'); }
  }

  /* ── screen 4: end my shift (the Hub's own End My Shift, phone layout) ── */
  var EO = { L: null, nx: null, pick: {}, note: {}, general: '', posted: null, busy: false };
  var areaWord = function (a) { try { return dutyAreaLabel(a); } catch (e) { return a === 'staffing' ? 'Staffing' : 'Operations'; } };
  var fullName = function (e) { try { return opsOwnerName(e) || e; } catch (x) { return e; } };
  async function endOpen() {
    var box = document.getElementById('phEndBody'); if (!box) return;
    if (EO.posted) return endRender();
    box.innerHTML = '<div class="ph-none" style="padding-top:14px">Getting your list…</div>';
    try { await fresh(); } catch (e) { /* the list below is what was last loaded */ }
    EO.L = eoLists(); EO.nx = { operations: EOX.nextOnDuty('operations'), staffing: EOX.nextOnDuty('staffing') };
    EO.L.moving.forEach(function (it) {
      if (EO.pick[it.id]) return;
      var to = EO.nx[EOX.areaOf(it)], t = opsPriorityKey(it)[0];
      EO.pick[it.id] = (t <= 1 && to) ? 'hand' : 'keep';   // the Hub's own default
    });
    endRender();
  }
  function endRender() {
    var box = document.getElementById('phEndBody'); if (!box) return;
    if (EO.posted) {
      var o = EO.posted;
      box.innerHTML = '<div class="ph-card" style="margin-top:14px"><div class="ph-t">' + esc(o.to.length ? 'Handoff posted to ' + o.to.map(function (e) { return first(fullName(e)); }).join(' and ') : 'Your shift is wrapped up')
        + '</div><div class="ph-s">' + esc(o.handed + ' handed on · ' + o.done + ' marked done' + (o.skipped ? ' · ' + o.skipped + ' already changed by someone else, left alone' : '')) + '</div>'
        + '<div class="ph-s" style="margin-top:6px">' + esc(o.to.length ? 'It shows at the top of their Today until they tap Got it. Nobody was texted.' : 'Nobody else is on duty in the next 4 days, so nothing was handed off. Nobody was texted.') + '</div>'
        + '<div class="ph-btns"><button class="ph-b p" data-pe="again">Back to my lists</button></div></div>';
      return;
    }
    var L = EO.L, nx = EO.nx; if (!L) return;
    var toLine = ['operations', 'staffing'].map(function (a) {
      return areaWord(a) + ': ' + (nx[a] ? fullName(nx[a].person) + (nx[a].at ? ' (from ' + nx[a].at.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) + ')' : ' (now)') : 'nobody else in the next 4 days');
    }).join(' · ');
    var h = '<div class="ph-s" style="margin-top:12px"><b>Next on duty.</b> ' + esc(toLine) + '</div>';
    h += '<div class="ph-lane" style="color:#0E3860">STILL MOVING TODAY · ' + L.moving.length + '<span>stays with you, goes to the next person, or done</span></div>';
    if (!L.moving.length) h += '<div class="ph-none">Nothing of yours is moving today.</div>';
    L.moving.forEach(function (it) {
      var a = EOX.areaOf(it), to = nx[a], p = EO.pick[it.id] || 'keep', t = opsPriorityKey(it)[0];
      var due = ''; try { due = opsDueText(it); } catch (e) { /* none */ }
      h += '<div class="ph-card' + (t <= 2 ? ' act' : '') + '" data-eo="' + esc(it.id) + '"><div class="ph-t">' + esc(it.about || it.title || '') + '</div>'
        + (due ? '<div class="ph-s">' + esc(due) + '</div>' : '')
        + '<div class="ph-ch">'
        + '<button type="button" data-pk="keep"' + (p === 'keep' ? ' class="on"' : '') + '>Stays with me</button>'
        + (to ? '<button type="button" data-pk="hand"' + (p === 'hand' ? ' class="on"' : '') + '>To ' + esc(first(fullName(to.person))) + '</button>' : '')
        + '<button type="button" data-pk="done"' + (p === 'done' ? ' class="on"' : '') + '>Done</button></div>'
        + '<input class="ph-in" data-note="' + esc(it.id) + '" value="' + esc(EO.note[it.id] || '') + '" placeholder="' + esc('Note for ' + (to && p === 'hand' ? first(fullName(to.person)) : 'the record') + ' (where it stands)') + '"></div>';
    });
    if (L.parked.length || L.later.length) h += '<div class="ph-s" style="margin:6px 2px">' + esc([L.parked.length ? L.parked.length + ' waiting with a wake-up' : '', L.later.length ? L.later.length + ' later' : ''].filter(Boolean).join(' and ') + (L.parked.length + L.later.length === 1 ? ' stays with you and comes back by itself.' : ' stay with you and come back by themselves.')) + '</div>';
    if (L.attention.length) h += '<div class="ph-lane" style="color:#B42318">NEEDS ATTENTION, NOBODY HAS IT · ' + L.attention.length + '<span>these go in the handoff and on the To talk about list</span></div>'
      + L.attention.map(function (i) { return '<div class="ph-s" style="margin:0 2px 4px">· ' + esc(i.about || i.title || '') + '</div>'; }).join('');
    h += '<div id="phDesk">' + (typeof dkShiftHtml === 'function' ? dkShiftHtml() : '') + '</div>';
    h += '<div class="ph-lane" style="color:#0E3860">ANYTHING ELSE<span>for the next person</span></div><textarea class="ph-in" id="phEoGeneral" rows="3" style="min-height:80px">' + esc(EO.general) + '</textarea>';
    h += '<div class="ph-s" style="margin:8px 2px">Nobody is texted. The handoff shows at the top of their Today until they tap Got it, and stays on the record.</div>'
      + '<div class="ph-btns"><button class="ph-b p" data-pe="post" style="flex:1;justify-content:center">Post my handoff</button></div>';
    box.innerHTML = h;
  }
  async function endPost(btn) {
    if (EO.busy) return; EO.busy = true; btn.disabled = true; btn.textContent = 'Posting…';
    try {
      await fresh();
      var me_ = me(), skipped = 0, picks = [];
      (EO.L.moving || []).forEach(function (old) {
        var it = (DATA.ops_items || []).find(function (x) { return x.id === old.id; });
        if (!it || it.status !== 'open' || lc(it.owner) !== me_) { skipped++; return; }
        picks.push({ it: it, what: EO.pick[old.id] || 'keep', note: String(EO.note[old.id] || '').trim() });
      });
      var out = await EOX.eoPost(picks, eoLists().attention, String(EO.general || '').trim(), EO.nx);
      try { if (typeof dkShiftApply === 'function') await dkShiftApply(document.getElementById('phDesk')); } catch (e) { /* the desk step is extra */ }
      if (!saved()) { say('Not everything saved (the connection dropped). It is kept on this phone and tried again the next time CC Office opens.', 'bad'); }
      EO.posted = { to: out.to || [], handed: out.handed || 0, done: out.done || 0, skipped: skipped };
      EO.pick = {}; EO.note = {}; EO.general = '';
    } catch (e) {
      say('The handoff did not post: ' + (e && e.message || e) + '. Nothing more was changed. Try again, or use the full Hub.', 'bad');
      btn.disabled = false; btn.textContent = 'Post my handoff';
    } finally { EO.busy = false; endRender(); phRender(); }
  }
  function onEndTap(ev) {
    var t = ev.target;
    var pk = t.closest && t.closest('[data-pk]');
    if (pk) { var card = pk.closest('[data-eo]'); EO.pick[card.getAttribute('data-eo')] = pk.getAttribute('data-pk'); endRender(); return; }
    var pe = t.closest && t.closest('[data-pe]'); if (!pe) return;
    if (pe.getAttribute('data-pe') === 'post') endPost(pe);
    if (pe.getAttribute('data-pe') === 'again') { EO.posted = null; endOpen(); }
  }
  function onEndInput(ev) {
    var id = ev.target.getAttribute && ev.target.getAttribute('data-note');
    if (id) EO.note[id] = ev.target.value;
    if (ev.target.id === 'phEoGeneral') EO.general = ev.target.value;
  }
  /* a handoff posted to me, at the top of Needs me now (the Hub's own list and Got it) */
  function handoffsHtml() {
    var list = []; try { list = EOX.hoMine(); } catch (e) { return ''; }
    return list.map(function (h) {
      var when = new Date(h.posted_at).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
      var items = h.items || [], moving = items.filter(function (i) { return i.what !== 'attention'; }), att = items.filter(function (i) { return i.what === 'attention'; });
      return '<div class="ph-ho"><div class="ph-t">Handoff from ' + esc(h.from_name || '') + ', ' + esc(when) + '</div>'
        + (moving.length ? '<ul>' + moving.map(function (i) { return '<li>' + esc(i.label) + ' <span class="ph-s">(' + (i.what === 'kept' ? 'stays with ' + esc(first(i.owner_name || h.from_name)) : 'now yours') + ')</span>' + (i.note ? ': ' + esc(i.note) : '') + '</li>'; }).join('') + '</ul>' : '<div class="ph-s">Nothing still moving.</div>')
        + (att.length ? '<div class="ph-s" style="color:#B42318;font-weight:700;margin-top:6px">' + att.length + ' need' + (att.length === 1 ? 's' : '') + ' attention, nobody has ' + (att.length === 1 ? 'it' : 'them') + ':</div><ul>' + att.map(function (i) { return '<li>' + esc(i.label) + '</li>'; }).join('') + '</ul>' : '')
        + (h.general_note ? '<div class="ph-s" style="margin-top:6px;color:#1B2733">“' + esc(h.general_note) + '”</div>' : '')
        + '<div class="ph-btns"><button class="ph-b p" data-ho="' + esc(h.id) + '">Got it</button></div></div>';
    }).join('');
  }

  /* ── the screens, and the tabs between them ── */
  var VIEW = 'need';
  function show(v) {
    VIEW = v;
    var n = document.getElementById('phNeed'), f = document.getElementById('phFind'), td = document.getElementById('phToday'), en = document.getElementById('phEnd'), t = document.getElementById('phTitle');
    if (n) n.hidden = v !== 'need'; if (f) f.hidden = v !== 'find'; if (td) td.hidden = v !== 'today'; if (en) en.hidden = v !== 'end';
    if (t) t.firstChild.nodeValue = v === 'find' ? 'Find a person' : v === 'today' ? 'Today' : v === 'end' ? 'End my shift' : 'Needs me now';
    var r = document.getElementById('phRefresh'); if (r) r.hidden = v === 'find' || v === 'end';
    if (v === 'end') endOpen();
    if (v === 'today') { todayRender(); todayLoad(false); }
    [].forEach.call(document.querySelectorAll('.ph-tabs button'), function (b) { b.classList.toggle('on', b.getAttribute('data-v') === v); });
    if (v === 'find') { findLoad(); findRender(); }
    window.scrollTo(0, 0);
  }

  /* ── start (called by the Hub's boot and sign-in, phone mode only) ── */
  function build() {
    if (document.getElementById('phApp')) return;
    var d = document.createElement('div'); d.id = 'phApp';
    d.innerHTML = '<div class="ph-top"><b id="phTitle">Needs me now<small id="phWho"></small></b>'
      + '<button type="button" id="phRefresh">Refresh</button><button type="button" id="phOut">Sign out</button></div>'
      + '<div id="phMsg" style="display:none"></div><div id="phNeed">'
      + '<div class="ph-wrap"><div id="phList"><div class="ph-none" style="padding-top:14px">Loading…</div></div>'
      + '<div class="ph-foot"><a href="' + hubLink() + '">Open the full Hub</a></div></div></div>'
      + '<div id="phFind" hidden><div class="ph-wrap"><input id="phQ" class="ph-q" type="search" autocomplete="off" autocapitalize="words" enterkeyhint="search" placeholder="Name or phone number" aria-label="Find a person">'
      + '<div id="phFindBody"></div></div></div>'
      + '<div id="phToday" hidden><div class="ph-wrap"><div id="phTodayBody"></div></div></div>'
      + '<div id="phEnd" hidden><div class="ph-wrap"><div id="phEndBody"></div></div></div>'
      + '<nav class="ph-tabs"><button type="button" data-v="need" class="on">Needs me</button><button type="button" data-v="find">Find</button><button type="button" data-v="today">Today</button><button type="button" data-v="end">End shift</button></nav>';
    document.body.appendChild(d);
    d.querySelector('#phNeed').addEventListener('click', onTap);
    d.querySelector('#phFind').addEventListener('click', onFindTap);
    d.querySelector('#phToday').addEventListener('click', onTodayTap);
    d.querySelector('#phEnd').addEventListener('click', onEndTap);
    d.querySelector('#phEnd').addEventListener('input', onEndInput);
    d.querySelector('.ph-tabs').addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (b) show(b.getAttribute('data-v')); });
    var q = d.querySelector('#phQ'), qt = null;
    q.addEventListener('input', function () { clearTimeout(qt); qt = setTimeout(function () { FIND.q = q.value; FIND.open = null; findRender(); }, 120); });
    document.getElementById('phRefresh').onclick = function () { tick(true); if (VIEW === 'today') todayLoad(true); };
    document.getElementById('phOut').onclick = async function () {
      try { localStorage.removeItem(KEY); } catch (e) { /* nothing kept */ }
      document.documentElement.classList.remove('ph-on');
      if (TIMER) { clearInterval(TIMER); TIMER = null; }
      await signOut();
    };
  }
  async function tick(force) {
    if (!force && (BUSY || SHEET || document.hidden)) return;
    try { await fresh(); try { if (typeof hoRefresh === 'function') await hoRefresh(); } catch (e) { /* handoffs keep what was loaded */ } MSG = MSG && MSG.kind === 'bad' && !force ? MSG : null; }
    catch (e) { MSG = { text: 'Could not refresh: ' + (e && e.message || e) + '. Showing what was last loaded.', kind: 'bad' }; }
    phRender();
    if (VIEW === 'today') todayLoad(force);
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
  window.phGate = phGate; window.phStart = phStart; window.phSignedIn = phSignedIn; window.phRender = phRender; window.phShow = show;
})();
