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
   assessments (btAssessmentsOn, with GoHighLevel's booked time), Orientation Video Calls and orientation sessions. Take it on a
   coverage or assessment card is the Hub's own Take it on that card's work item.
   Screen 4, END MY SHIFT (2026-10-07, "start screen 4"): the Hub's End My Shift (end-shift.js) with a phone layout.
   The lists are its eoLists(), the next person on duty is its EOX.nextOnDuty, and Post my handoff is its EOX.eoPost
   (hand to the next person on duty, mark done, keep with a note; urgent unowned work onto the Stand-Up board; the
   handoff written for the next person). Nobody is texted. A handoff someone posted to you shows at the top of Needs
   me now until you tap Got it (the Hub's hoAck), the same as on the Hub's Today.
   ===================================================================================================================== */
(function () {
  'use strict';
  /* THE HR DESK ON THE PHONE (2026-10-18, Samantha: "can the button Open the HR Page open only the HR page not the
     whole hub - and make it mobile friendly, he works from his phone 90% of the time"). index.html?m=hr is this same
     phone mode showing ONLY the HR section (hr.js, unchanged rules, the same sign-in), laid out for a phone. A phone
     that opens an HR link (#hr, #hr/formal, the link in Zach's alerts) is sent there; a computer keeps the Hub's HR page. */
  var HRM = /[?&]m=hr(&|$)/.test(location.search);
  var ON = HRM || /[?&]m=1(&|$)/.test(location.search);
  window.CC_PHONE = ON; window.CC_PHONE_HR = HRM;
  if (!ON) {
    try { if (/^#hr(\/|$)/i.test(location.hash) && window.matchMedia && window.matchMedia('(max-width: 760px)').matches) location.replace('index.html?m=hr' + location.hash); }
    catch (e) { /* the Hub's own HR page opens instead */ }
    return;
  }
  document.documentElement.classList.add('ccphone');
  if (HRM) document.documentElement.classList.add('ph-hr');

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
    + '.ph-tag.cl{background:#E7F6EC;color:#1F7A4D}.ph-tag.in{background:#FDF3E3;color:#A8660E}.ph-tag.ap{background:#EFEAFB;color:#6B4FBB}.ph-tag.fam{background:#FCEBF1;color:#9B3A5C}.ph-tag.past{background:#F1F5F9;color:#64748B}'
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
  /* The HR desk: hr.js's own screens, one column, the menu a row of chips you swipe, big tap targets, windows full screen. */
  css += ''
    + 'html.ph-hr #phApp{padding-bottom:calc(30px + env(safe-area-inset-bottom,0px))}'
    + 'html.ph-hr .hr-wrap{display:block;padding:0 0 24px}'
    + 'html.ph-hr .hr-menu{position:sticky;top:calc(52px + env(safe-area-inset-top,0px));z-index:4;flex-direction:row;flex-wrap:nowrap;overflow-x:auto;gap:8px;border:0;border-bottom:1px solid #DCE4EE;border-radius:0;padding:10px 14px;background:#F6F9FD;scrollbar-width:none;-webkit-overflow-scrolling:touch}'
    + 'html.ph-hr .hr-menu::-webkit-scrollbar{display:none}'
    + 'html.ph-hr .hr-menu-head,html.ph-hr .hr-item-note{display:none}'
    + 'html.ph-hr .hr-item{flex:0 0 auto;white-space:nowrap;border:1.5px solid #DCE4EE;background:#fff;border-radius:999px;padding:9px 15px}'
    + 'html.ph-hr .hr-item.on{border-color:#0E3860;background:#0E3860;color:#fff}'
    + 'html.ph-hr .hr-item-label{font-size:14px}'
    + 'html.ph-hr .hr-main{padding:12px 14px 0}'
    + 'html.ph-hr .hr-h{font-size:19px}'
    + 'html.ph-hr .hr-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}'
    + 'html.ph-hr .hr-card,html.ph-hr .card{border-radius:14px}'
    + 'html.ph-hr .hr-row{flex-direction:column;align-items:stretch;gap:8px;font-size:14px}'
    + 'html.ph-hr .hr-row>*{min-width:0;max-width:100%}'
    + 'html.ph-hr .hr-btn,html.ph-hr .hr-main .btn,html.ph-hr .hr-main button.fb,html.ph-hr .overlay .btn,html.ph-hr .overlay button{min-height:42px;font-size:14.5px;padding:9px 14px}'
    + 'html.ph-hr .hr-main input,html.ph-hr .hr-main select,html.ph-hr .hr-main textarea,html.ph-hr .overlay input,html.ph-hr .overlay select,html.ph-hr .overlay textarea{font-size:16px;max-width:100%;box-sizing:border-box}'
    + 'html.ph-hr .hr-main .tabpanel{display:none}html.ph-hr .hr-main .tabpanel.active{display:block}'
    + 'html.ph-hr .hr-main .panel>div{padding:0!important}'
    + 'html.ph-hr .hr-main table{font-size:13px}'
    + 'html.ph-hr .hr-main .panel,html.ph-hr .hr-main [id^="wu"],html.ph-hr .hr-main [id^="att"]{max-width:100%;overflow-x:auto}'
    + 'html.ph-hr .hr-quote,html.ph-hr .hr-role p,html.ph-hr .hr-role li{max-width:none}'
    + 'html.ph-hr .hr-hb-bar input[type=search]{min-width:0;width:100%;font-size:16px}'
    + 'html.ph-hr .overlay .modal{width:100%!important;max-width:100%!important;max-height:none!important;min-height:100%;margin:0!important;border-radius:0!important;box-sizing:border-box;padding:calc(14px + env(safe-area-inset-top,0px)) 14px calc(20px + env(safe-area-inset-bottom,0px))!important;overflow-y:auto}'
    + 'html.ph-hr .overlay.open,html.ph-hr .overlay.on,html.ph-hr .overlay.show{align-items:stretch!important;padding:0!important}'
    + 'html.ph-hr #writeup-body{font-size:14px!important;min-height:50vh}'
    + 'html.ph-hr .hr-main .panel{padding:0!important;margin:0!important;border:0!important;background:none!important;box-shadow:none!important}'
    + 'html.ph-hr .hr-kind{align-self:flex-start;display:inline-block}'
    + '.ph-close{position:sticky;top:calc(-14px - env(safe-area-inset-top,0px));z-index:2;display:flex;justify-content:flex-start;margin:-14px -14px 10px;padding:calc(10px + env(safe-area-inset-top,0px)) 14px 10px;background:#fff;border-bottom:1px solid #DCE4EE}'
    + '.ph-close button{appearance:none;background:none;border:0;font:inherit;font-size:15px;font-weight:700;color:#0E3860;padding:6px 0;min-height:0!important}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  /* 2026-10-12: the app's manifest only in phone mode, so a phone's home screen icon opens CC Office as its own app; the computer Hub is unchanged */
  if (!document.querySelector('link[rel="manifest"]')) { var mf = document.createElement('link'); mf.rel = 'manifest'; mf.href = 'cc-office.webmanifest'; document.head.appendChild(mf); }

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
    /* 2026-10-12 (her "build 6-8", item 6): a project's steps on the phone, ticked or taken with the Hub's own step
       actions (projects.js pjStepTick / pjStepClaim). Closing a project, editing steps and its conversation stay in the Hub. */
    if (it.kind === 'project' && Array.isArray(it.steps) && it.steps.length) {
      var me0 = me(), open0 = it.steps.filter(function (x) { return !x.done_at; }).length;
      h = h.replace(/<div class="ph-btns">$/, '') + '<div class="ph-h" style="margin-top:8px;font-weight:700;color:#0E3860">Steps · ' + (it.steps.length - open0) + ' of ' + it.steps.length + ' done</div>'
        + it.steps.map(function (st) {
          var mineStep = lc(st.claimed_by) === me0 || (st.who || []).map(lc).indexOf(me0) > -1;
          var whoS = (st.who || []).map(function (e) { return first(opsOwnerName(e) || e); }).join(' & ');
          return '<div class="ph-fam"><button type="button" class="ph-tick" data-pj="tick" data-id="' + esc(it.id) + '" data-sid="' + esc(st.id) + '" aria-label="' + (st.done_at ? 'Reopen' : 'Done') + '" style="width:30px;height:30px;border-radius:8px;border:1.5px solid ' + (st.done_at ? '#2E8F8B;background:#2E8F8B;color:#fff' : '#B9C6D6;background:#fff;color:#2E8F8B') + ';font-size:17px;flex:none">' + (st.done_at ? '✓' : '') + '</button>'
            + '<div><span style="' + (st.done_at ? 'text-decoration:line-through;color:#5B6878' : '') + '">' + esc(st.label) + '</span><small>' + esc([whoS, st.due && !st.done_at ? 'by ' + st.due : ''].filter(Boolean).join(' · ')) + '</small></div>'
            + (!st.done_at && !mineStep ? '<button type="button" class="ph-b" data-pj="claim" data-id="' + esc(it.id) + '" data-sid="' + esc(st.id) + '" style="padding:6px 10px;font-size:12.5px">I’ve got this</button>' : '') + '</div>';
        }).join('') + '<div class="ph-btns">';
    }
    if (!mine) h += '<button class="ph-b p" data-ph="take" data-id="' + esc(it.id) + '">Take it</button>';
    if (special(it)) h += '<a class="ph-b' + (mine ? ' p' : '') + '" href="' + hubLink() + '">' + (it.kind === 'project' ? 'Close or change it in the Hub' : 'Open in the Hub') + '</a>';
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
  async function pjTap(b) {
    var id = b.getAttribute('data-id'), sid = b.getAttribute('data-sid'), what = b.getAttribute('data-pj');
    b.disabled = true;
    try { if (what === 'tick') await pjStepTick(id, sid); else await pjStepClaim(id, sid); phRender(); }
    catch (e) { say('Not saved: ' + (e && e.message || e), 'bad'); b.disabled = false; }
  }
  function onTap(ev) {
    var pj = ev.target.closest && ev.target.closest('[data-pj]'); if (pj) return pjTap(pj);
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
  var FIND = { loaded: false, loading: false, cg: null, cl: null, ap: null, circ: null, cc: null, book: {}, coord: {}, err: {}, q: '', open: null };
  /* Apple Maps on an iPhone, Google Maps everywhere else (2026-10-12) */
  var mapsLink = function (addr) { var q = encodeURIComponent(String(addr || '') + (/\bMO\b|Missouri/i.test(addr) ? '' : ', MO'));
    return /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'https://maps.apple.com/?daddr=' + q : 'https://www.google.com/maps/dir/?api=1&destination=' + q; };
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
        var a = await sb.from('job_applicants').select('id,first_name,last_name,phone,email,status,screen_grade,position,created_at,city,office').order('created_at', { ascending: false }).limit(2000);
        if (window.OKO && a && a.data) OKO.remember(a.data);   /* 806 */
        if (a.error) throw a.error;
        FIND.ap = (a.data || []).filter(function (r) { return r.status !== 'hired'; });
        var b = await sb.from('interview_bookings').select('applicant_id,starts_at,status,coordinator_id').eq('status', 'booked').gte('starts_at', new Date().toISOString());
        FIND.book = {}; ((b && b.data) || []).forEach(function (x) { var cur = FIND.book[x.applicant_id]; if (!cur || x.starts_at < cur.starts_at) FIND.book[x.applicant_id] = x; });
        var c = await sb.from('coordinators').select('id,name'); FIND.coord = {}; ((c && c.data) || []).forEach(function (x) { FIND.coord[x.id] = x.name; });
      })().catch(function (e) { FIND.err.ap = e && e.message || String(e); FIND.ap = FIND.ap || []; }),
      /* Family circles in Find (Samantha, 2026-10-12: "i want to be able to see all family circles in the find area of
         phone"): every active circle and its family, so a family member is found by name or number like anyone else */
      (async function () {
        var c = await sb.from('care_circles').select('id,client_name,axiscare_client_id,active').eq('active', true);
        if (c.error) throw c.error;
        var m = await sb.from('circle_contacts').select('id,circle_id,name,relationship,phone,email,is_primary,axiscare_removed_at');
        if (m.error) throw m.error;
        FIND.circ = c.data || []; FIND.cc = (m.data || []).filter(function (x) { return !x.axiscare_removed_at; });
      })().catch(function (e) { FIND.err.fam = e && e.message || String(e); FIND.circ = FIND.circ || []; FIND.cc = FIND.cc || []; })
    ];
    await Promise.all(jobs);
    FIND.loading = false; FIND.loaded = true; findRender();
    if (FIND.open && FIND.open.type === 'circles') circlesList();
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
    var circById = {}; (FIND.circ || []).forEach(function (c) { circById[c.id] = c; });
    (FIND.cc || []).forEach(function (f) {
      var c = circById[f.circle_id]; if (!c) return;
      out.push({ type: 'fam', key: 'fam:' + f.id, f: f, circle: c, name: f.name || 'Family', past: false,
        sub: (f.relationship ? f.relationship + ' · ' : '') + 'family of ' + (c.client_name || 'a client') + (f.is_primary ? ' · main contact' : ''), ph: [f.phone] });
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
    var order = { cl: 0, fam: 1, in: 2, cg: 3, ap: 4 };
    return people().filter(function (p) {
      if (dq.length >= 4 && dq.length === t.replace(/[\s()+.-]/g, '').length) return p.ph.some(function (x) { return digits(x).indexOf(dq) > -1; });
      var hay = (p.name + ' ' + (p.also || '')).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) > -1; });
    }).sort(function (a, b) { return (a.past ? 1 : 0) - (b.past ? 1 : 0) || order[a.type] - order[b.type] || a.name.localeCompare(b.name); }).slice(0, 40);
  }
  var TAGS = { cl: ['Client', 'cl'], in: ['Inquiry', 'in'], cg: ['Caregiver', ''], ap: ['Applicant', 'ap'], fam: ['Family', 'fam'] };
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
      dl = row('Office', window.OKO ? OKO.chip(a) : '') + row('Applied for', esc(pos || a.position || 'Caregiver')) + row('Where they are', esc(AP_WORDS[a.status] || a.status || ''))
        + row('Interview', esc(bk ? when(bk.starts_at) + (FIND.coord[bk.coordinator_id] ? ' with ' + first(FIND.coord[bk.coordinator_id]) : '') : 'None booked'))
        + row('Phone', esc(pretty(a.phone))) + row('Lives in', esc(a.city || '')) + row('Applied', esc(day(a.created_at)));
      btns = '<button class="ph-b p" data-ivopen="' + esc(a.id) + '">Interview them</button>'
        + '<button class="ph-b" data-aplink="' + esc(a.id) + '">Copy their link</button>' + callBtn(a.phone, 'Call', { email: a.email }) + (window.ApText && a.phone ? ApText.btn(a.id, 'Text', 'ph-b') : '') + '<a class="ph-b" href="index.html#ap/' + encodeURIComponent(a.id) + '">Open in the Hub</a>';
    }
    if (p.type === 'fam') {
      var f = p.f, cc = p.circle, cp = clientOf(cc);
      dl = row('Family of', esc(cc.client_name || '')) + row('Relationship', esc(f.relationship || '')) + row('Phone', esc(pretty(f.phone)))
        + row('Email', esc(f.email || '')) + row('Main contact', f.is_primary ? 'Yes' : '');
      btns = callBtn(f.phone, 'Call ' + first(f.name || ''), { email: f.email, client: cc.client_name })
        + (cp ? '<button class="ph-b" data-pf="client" data-key="' + esc(cp.key) + '">Their client</button>' : '')
        + (cc.axiscare_client_id ? '<a class="ph-b" href="index.html#p/A' + encodeURIComponent(cc.axiscare_client_id) + '/family">Open in the Hub</a>' : '');
      extra = circleHtml(cc, f.id);
    }
    box.innerHTML = h + '<dl class="ph-dl">' + dl + '</dl><div class="ph-btns">' + btns + '</div>' + extra + '</div>';
    if (p.type === 'cl') famLoad(p.r);
  }
  /* the client a circle belongs to, as a search row (by AxisCare id, else the one client with that exact name) */
  function clientOf(c) {
    var all = people().filter(function (x) { return x.type === 'cl'; });
    if (c.axiscare_client_id) { var hit = all.find(function (x) { return String(x.r.axiscare_client_id) === String(c.axiscare_client_id); }); if (hit) return hit; }
    var n = lc(c.client_name), by = all.filter(function (x) { return lc(x.name) === n; });
    return by.length === 1 ? by[0] : null;
  }
  function circleMembers(c) {
    return (FIND.cc || []).filter(function (x) { return x.circle_id === c.id; }).sort(function (a, b) { return (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || String(a.name || '').localeCompare(String(b.name || '')); });
  }
  /* everyone in one circle, each with Call (skip = the person whose card this is) */
  function circleHtml(c, skip) {
    var fam = circleMembers(c).filter(function (x) { return x.id !== skip; });
    return '<div class="ph-lane" style="color:#0E3860;margin-top:14px">' + (skip ? 'THE REST OF THE FAMILY · ' : 'FAMILY · ') + fam.length + '</div>'
      + (fam.length ? fam.map(function (f) {
        return '<div class="ph-fam"><div>' + esc(f.name || 'Family') + (f.is_primary ? ' · main contact' : '') + '<small>' + esc([f.relationship, pretty(f.phone)].filter(Boolean).join(' · ')) + '</small></div>'
          + callBtn(f.phone, 'Call', { email: f.email, client: c.client_name }) + '</div>';
      }).join('') : '<div class="ph-none">' + (skip ? 'Nobody else on this circle.' : 'No family contacts on this circle yet.') + '</div>');
  }
  /* ALL FAMILY CIRCLES: the browse list, no typing needed */
  function circlesList() {
    var box = document.getElementById('phFindBody'); if (!box) return;
    var list = (FIND.circ || []).slice().sort(function (a, b) { return String(a.client_name || '').localeCompare(String(b.client_name || '')); });
    FIND.circList = list;
    box.innerHTML = '<button class="ph-back" data-pf="back">‹ Back to the search</button>'
      + '<div class="ph-lane" style="color:#0E3860">FAMILY CIRCLES<span>' + list.length + '</span></div>'
      + (FIND.err.fam ? '<div class="ph-msg bad">Could not load the family circles: ' + esc(FIND.err.fam) + '</div>' : '')
      + (list.length ? list.map(function (c, i) {
        var mem = circleMembers(c), main = mem.find(function (x) { return x.is_primary; }) || mem[0];
        return '<button class="ph-row" data-pf="circ" data-i="' + i + '"><b>' + esc(c.client_name || 'Client') + '</b><span class="ph-tag fam">' + mem.length + ' family</span>'
          + '<span>' + esc(main ? main.name + (main.relationship ? ' (' + String(main.relationship).toLowerCase() + ')' : '') + (mem.length > 1 ? ' and ' + (mem.length - 1) + ' more' : '') : 'Nobody listed yet')
          + (c.axiscare_client_id ? '' : ' · not linked to a client yet') + '</span></button>';
      }).join('') : '<div class="ph-none">' + (FIND.loading ? 'Still loading…' : 'No family circles yet.') + '</div>');
  }
  function circleDetail(c) {
    var box = document.getElementById('phFindBody'); if (!box) return;
    var cp = clientOf(c);
    box.innerHTML = '<button class="ph-back" data-pf="circles">‹ All family circles</button><div class="ph-card" style="margin-top:8px">'
      + '<div class="ph-t">' + esc(c.client_name || 'Client') + '<span class="ph-tag fam">Family circle</span></div>'
      + '<div class="ph-btns">' + (cp ? '<button class="ph-b" data-pf="client" data-key="' + esc(cp.key) + '">Their client</button>' : '')
      + (c.axiscare_client_id ? '<a class="ph-b" href="index.html#p/A' + encodeURIComponent(c.axiscare_client_id) + '/family">Open in the Hub</a>' : '') + '</div>'
      + circleHtml(c, null) + '</div>';
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
    if (FIND.loading) src.push('Loading caregivers, clients, family and applicants…');
    var bad = Object.keys(FIND.err).map(function (k) { return { cg: 'caregivers', cl: 'clients', ap: 'applicants', fam: 'family circles' }[k] + ' (' + FIND.err[k] + ')'; });
    var res = matches(FIND.q), t = FIND.q.trim();
    FIND.last = res;
    box.innerHTML = '<div class="ph-src">' + esc(src.join(' ')) + (bad.length ? ' <b>Could not load ' + esc(bad.join(', ')) + '. The search below is missing them.</b>' : '') + '</div>'
      + (!t || t.replace(/\s/g, '').length < 2 ? '<button class="ph-row" data-pf="circles" style="margin-top:10px"><b>Family circles</b><span class="ph-tag fam">'
          + (FIND.loaded ? (FIND.circ || []).length : '…') + '</span><span>Every client\'s family, with their numbers</span></button>' + todayPeopleHtml()
        : res.length ? '<div style="margin-top:10px">' + res.map(function (p, i) {
          var tg = TAGS[p.type]; return '<button class="ph-row" data-pf="open" data-i="' + i + '"><b>' + esc(p.name) + '</b><span class="ph-tag ' + (p.past ? 'past' : tg[1]) + '">' + tg[0] + '</span><span>' + esc(p.sub) + '</span></button>';
        }).join('') + '</div>'
          : '<div class="ph-none" style="margin-top:12px">' + (FIND.loading ? 'Still loading…' : 'Nobody matches “' + esc(t) + '”.') + '</div>');
  }
  /* Before anything is typed: the people on today's schedule (2026-10-12), so the person you are about to see or call is
     one tap away. Matched to the search list by their record, or by name when the timeline only has a name. */
  function todayPeopleHtml() {
    var hint = '<div class="ph-none" style="margin-top:12px">Type at least two letters of a name, or four digits of a phone number.</div>';
    if (!TD.rows) { if (!TD.loading) todayLoad(false).then(function () { if (VIEW === 'find' && !FIND.open && !FIND.q.trim()) findRender(); }); return hint; }
    if (!FIND.loaded) return hint;
    var all = people(), seen = {}, list = [];
    TD.rows.forEach(function (r) {
      var p = r.pkey ? all.find(function (x) { return x.key === r.pkey; }) : null;
      if (!p && r.title) { var n = lc(r.title); p = all.find(function (x) { return lc(x.name) === n && !x.past; }); }
      if (p && !seen[p.key]) { seen[p.key] = 1; list.push({ p: p, r: r }); }
    });
    if (!list.length) return hint;
    var start = (FIND.last || []).length;
    FIND.last = (FIND.last || []).concat(list.map(function (x) { return x.p; }));
    return '<div class="ph-lane" style="color:#0E3860">ON TODAY’S SCHEDULE<span>' + list.length + '</span></div>'
      + list.map(function (x, i) { var tg = TAGS[x.p.type];
        return '<button class="ph-row" data-pf="open" data-i="' + (start + i) + '"><b>' + esc(x.p.name) + '</b><span class="ph-tag ' + tg[1] + '">' + tg[0] + '</span><span>'
          + esc((x.r.min == null ? '' : btTime(x.r.min) + ' · ') + x.r.kind) + '</span></button>'; }).join('') + hint;
  }
  function onFindTap(ev) {
    var iv = ev.target.closest && ev.target.closest('[data-ivopen]'); if (iv) return ivOpen(iv.getAttribute('data-ivopen'));
    /* their own link: finish the application or pick (or move) their interview time (2026-10-12) */
    var al = ev.target.closest && ev.target.closest('[data-aplink]'); if (al) return copyText('https://mo-care.com/apply?book=' + encodeURIComponent(al.getAttribute('data-aplink')), al);
    var b = ev.target.closest && ev.target.closest('[data-pf]'); if (!b) return;
    var what = b.getAttribute('data-pf');
    if (what === 'open') { var p = (FIND.last || [])[Number(b.getAttribute('data-i'))]; if (!p) return; FIND.open = p; detail(p); window.scrollTo(0, 0); }
    if (what === 'back') { FIND.open = null; findRender(); var q = document.getElementById('phQ'); if (q) q.focus(); }
    if (what === 'shifts') { b.disabled = true; shiftsLoad(b.getAttribute('data-id')); }
    if (what === 'circles') { FIND.open = { type: 'circles' }; circlesList(); window.scrollTo(0, 0); }
    if (what === 'circ') { var c = (FIND.circList || [])[Number(b.getAttribute('data-i'))]; if (!c) return; FIND.open = { type: 'circ', c: c }; circleDetail(c); window.scrollTo(0, 0); }
    if (what === 'client') { var k = b.getAttribute('data-key'), cp = people().find(function (x) { return x.key === k; }); if (!cp) return; FIND.open = cp; detail(cp); window.scrollTo(0, 0); }
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
            item: it, link: 'index.html#cara/case/' + encodeURIComponent(c.id), asked: (c.asked || []).slice(0, 30) });
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
        var a = ids.length ? await sb.from('job_applicants').select('id,first_name,last_name,phone,email,office').in('id', ids) : { data: [] };
        if (window.OKO && a && a.data) OKO.remember(a.data);   /* 806 */
        if (a.error) throw a.error;
        var byId = {}; (a.data || []).forEach(function (x) { byId[x.id] = x; });
        btInterviewsOn(day, b.data || [], a.data || [], btAfternoonRule(DATA.ops_settings)).forEach(function (r) {
          var ap = byId[r.applicant_id] || {};
          rows.push({ min: r.min, kind: 'Interview', title: r.name, past: r.status !== 'booked', iv: r.status === 'booked' ? r.applicant_id : null, pkey: 'ap:' + r.applicant_id,
            sub: ['at the office', r.status === 'done' ? 'done' : r.status === 'no-show' ? 'did not come' : '', r.who ? 'with ' + r.who : ''].filter(Boolean).join(' · '),
            phone: ap.phone, email: ap.email, ap_id: r.applicant_id, link: 'index.html#ap/' + encodeURIComponent(r.applicant_id) });
        });
      }),
      safe('assessments', async function () {
        btAssessmentsOn(day, DATA.care_assessments, DATA.leads).forEach(function (r) {
          var l = (DATA.leads || []).find(function (x) { return String(x.id) === String(r.lead_id); }) || null;
          var it = r.lead_id ? itemFor(function (i) { return i.id === 'ops_asmt_' + r.lead_id; }) : null;
          rows.push({ min: r.min, kind: 'Assessment', title: r.name, past: r.status !== 'booked', addr: r.address || '', pkey: r.lead_id ? 'in:' + r.lead_id : '',
            sub: [r.address, r.who ? 'with ' + r.who : ''].filter(Boolean).join(' · '), item: it,
            phone: l && l.phone, phoneLabel: l && l.first_name ? 'Call ' + first(l.first_name) : 'Call',
            link: r.lead_id ? 'index.html#p/L' + encodeURIComponent(r.lead_id) + '/summary' : (r.ax ? 'index.html#p/A' + encodeURIComponent(r.ax) + '/summary' : '') });
        });
      }),
      safe('Orientation Video Calls', async function () {
        var w = await sb.from('welcome_calls').select('id,first_name,last_name,phone,starts_at,status').eq('status', 'booked')
          .gte('starts_at', new Date(midUtc - 864e5).toISOString()).lt('starts_at', new Date(midUtc + 2 * 864e5).toISOString());
        if (w.error) throw w.error;
        (w.data || []).forEach(function (x) { var p = btChi(x.starts_at); if (!p || p.date !== day) return;
          rows.push({ min: p.min, kind: 'Orientation Video Call', title: ((x.first_name || '') + ' ' + (x.last_name || '')).trim() || 'New caregiver', sub: '15 minutes, video', phone: x.phone }); });
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
      if (r.iv) btn += '<button class="ph-b p" data-pt="iv" data-ap="' + esc(r.iv) + '">Start the interview</button>';
      if (r.addr) btn += '<a class="ph-b" href="' + esc(mapsLink(r.addr)) + '" target="_blank" rel="noopener">Directions</a>';   /* 2026-10-12: one tap to Maps */
      /* 2026-10-12 (item 6): who was asked about an open shift and what they said, with Call (office line) */
      var asked = '';
      if (r.asked && r.asked.length) {
        var W = { yes: ['said yes', '#1F7A4D'], no: ['said no', '#64748B'] };
        var cgPhone = function (x) { var p0 = x.phone || x.mobile || ''; if (p0) return p0; var n = lc(x.name); var c0 = (FIND.cg || []).find(function (c) { return lc(((c.first || '') + ' ' + (c.last || '')).trim()) === n; }); return c0 ? c0.mobile : ''; };
        asked = '<details style="margin-top:8px"><summary style="font-size:13.5px;font-weight:700;color:#0E3860;cursor:pointer">Who was asked (' + r.asked.length + ')</summary>'
          + r.asked.slice().sort(function (a, b) { return (a.state === 'yes' ? 0 : a.state === 'no' ? 2 : 1) - (b.state === 'yes' ? 0 : b.state === 'no' ? 2 : 1); }).map(function (x) {
            var w = W[x.state] || ['waiting', '#A8660E'], ph = cgPhone(x);
            return '<div class="ph-fam"><div>' + esc(x.name || 'Caregiver') + '<small style="color:' + w[1] + '">' + w[0] + '</small></div>' + (ph && x.state !== 'no' ? callBtn(ph, 'Call') : '') + '</div>';
          }).join('') + '</details>';
      }
      if (r.phone) btn += callBtn(r.phone, r.phoneLabel || 'Call', { email: r.email });
      if (r.ap_id && r.phone && window.ApText) btn += ApText.btn(r.ap_id, 'Text', 'ph-b');   /* 574: text the applicant about today's interview */
      if (r.link) btn += '<a class="ph-b" href="' + esc(r.link) + '">Open in the Hub</a>';
      var who = r.item ? (r.item.mine ? 'Yours' : r.item.owner ? 'Owner: ' + esc(first(r.item.owner_name || opsOwnerName(r.item.owner) || r.item.owner)) : '<b>Nobody has it</b>') : '';
      h += '<div class="ph-tl' + (past ? ' past' : '') + '"><div class="ph-tm">' + esc(r.min == null ? 'Any time' : btTime(r.min)) + '</div>'
        + '<div class="ph-card' + (r.red ? ' act' : '') + '"><div class="ph-k"' + (r.red ? ' style="color:#B42318"' : '') + '>' + esc(r.kind) + '</div>'
        + '<div class="ph-t">' + esc(r.title) + '</div>' + (r.sub ? '<div class="ph-s">' + esc(r.sub) + '</div>' : '')
        + (who ? '<div class="ph-who">' + who + '</div>' : '') + asked + (btn ? '<div class="ph-btns">' + btn + '</div>' : '') + '</div></div>';
    });
    if (!drew) h += '<div class="ph-now">NOW ' + esc(btTime(now)) + '</div>';
    if (!TD.rows.length) h += '<div class="ph-none">Nothing on today’s schedule: no open shifts, interviews, assessments, Orientation Video Calls or orientation.</div>';
    box.innerHTML = h;
  }
  function onTodayTap(ev) {
    var b = ev.target.closest && ev.target.closest('[data-pt]'); if (!b) return;
    if (b.getAttribute('data-pt') === 'need') return show('need');
    if (b.getAttribute('data-pt') === 'iv') return ivOpen(b.getAttribute('data-ap'));
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

  /* ── screen 5: the interview (2026-10-12, Samantha: "I would like to be able to record and see the questions on my
     phone", then "yes to all, build it" on The Best Caregiver Interview). Opened from today's interview on Today, or from
     an applicant in Find. The recorder at the top (the Hub's own, which keeps the screen awake and saves every second on
     this phone), then the questions from Recruit → Interview questions, a note under each, the 30-second quick check,
     what to check with their references, and how it went. Typing is kept on this phone as you go; Save puts it on their
     record (post_interview, merged, the same place the Hub's interview screen reads). Hire, pool or not hiring stay in
     the full Hub. Nothing here texts or emails anybody. */
  var IV = { id: null, r: null, qs: [], A: null, t: null, saving: false };
  var IVKEY = function (id) { return 'cc_iv_' + id; };
  function ivDraftSave() { try { localStorage.setItem(IVKEY(IV.id), JSON.stringify({ at: Date.now(), A: IV.A })); } catch (e) { /* private window */ } }
  function ivDraftLoad(id) { try { return JSON.parse(localStorage.getItem(IVKEY(id)) || 'null'); } catch (e) { return null; } }
  function ivDraftDrop(id) { try { localStorage.removeItem(IVKEY(id)); } catch (e) { /* nothing kept */ } }
  async function ivOpen(id) {
    IV = { id: String(id), r: null, qs: [], A: null, t: null, saving: false };
    show('iv');
    var box = document.getElementById('phIvBody');
    box.innerHTML = '<div class="ph-none" style="padding-top:14px">Opening the interview…</div>';
    try {
      var a = await sb.from('job_applicants').select('id,first_name,last_name,position,status,post_interview').eq('id', IV.id).maybeSingle();
      if (a.error) throw a.error; if (!a.data) throw new Error('that applicant was not found');
      IV.r = a.data;
      var q = await sb.from('interview_questions').select('id,position,section,sort,question,guidance,active,seeded_as').eq('active', true).order('sort');
      if (q.error) throw q.error;
      var pos = IV.r.position || 'caregiver';
      IV.qs = (q.data || []).filter(function (x) { return x.position === pos; });
      if (!IV.qs.length) IV.qs = (q.data || []).filter(function (x) { return x.position === 'caregiver'; });
    } catch (e) {
      box.innerHTML = '<button class="ph-back" data-iv="back">‹ Back</button><div class="ph-msg bad" style="margin:8px 0">Could not open the interview: ' + esc(e && e.message || e) + '</div>';
      return;
    }
    var saved = IV.r.post_interview && typeof IV.r.post_interview === 'object' ? JSON.parse(JSON.stringify(IV.r.post_interview)) : {};
    var d = ivDraftLoad(IV.id);
    IV.A = d && d.A ? d.A : saved;
    IV.A.script = IV.A.script || {};
    ivRender(!!(d && d.A));
  }
  function ivRender(fromDraft) {
    var box = document.getElementById('phIvBody'), r = IV.r, A = IV.A;
    var nm = ((r.first_name || '') + ' ' + (r.last_name || '')).trim() || 'Applicant', pos = '';
    try { pos = typeof apPosLabel === 'function' ? apPosLabel(r.position) : ''; } catch (e) { /* no label */ }
    var h = '<button class="ph-back" data-iv="back">‹ Back to Today</button>'
      + '<div class="ph-card"><div class="ph-k">Interview</div><div class="ph-t">' + esc(nm) + '</div><div class="ph-s">' + esc(pos || 'Caregiver') + '</div>'
      + (fromDraft ? '<div class="ph-h">Your notes from earlier on this phone are back. Press Save to put them on their record.</div>' : '') + '</div>'
      + '<div id="phRecHost" style="margin-bottom:10px"></div>'
      + '<div class="ph-card" style="background:#F7F5F0"><div class="ph-k">Say first</div><div class="ph-s" style="color:#1B2733;font-size:14px">"Thanks for coming in. This is just a conversation, there are no wrong answers. I’ll ask about you and the care you’ve given, I’ll tell you honestly what the job is like, and you can ask me anything. Is it OK if I record so I can listen to you instead of writing? The recording is written out by software and summarized to help me review it."</div></div>';
    if (!IV.qs.length) h += '<div class="ph-msg bad" style="margin:0 0 10px">No interview questions are set up yet (Desktop step 622 installs them). Use the laminated sheet for now.</div>';
    IV.qs.forEach(function (q, i) {
      var a = A.script[q.id] || {};
      h += '<div class="ph-card"><div class="ph-k">' + (i + 1) + ' · ' + esc(q.section || '') + '</div>'
        + '<div class="ph-t" style="font-size:16.5px">' + esc(q.question) + '</div>'
        + (q.guidance ? '<div class="ph-s">' + esc(q.guidance) + '</div>' : '')
        + '<textarea class="ph-in" rows="3" data-ivq="' + esc(q.id) + '" placeholder="What they said (the recording catches it too)">' + esc(a.note || '') + '</textarea></div>';
    });
    /* 2026-10-13 (her "yes to all", reviewer point 3): after the questions, before the honest picture. Only on a tap. */
    h += '<div class="ph-card"><div class="ph-k">After question 6</div><div class="ph-t" style="font-size:16px">Check before they leave</div>'
      + '<div class="ph-s">Ends part 1 of the recording, writes it out, and lists anything the questions did not cover, so you can ask now. Then press Start recording for part 2. Usually a couple of minutes.</div>'
      + '<div class="ph-btns"><button class="ph-b" data-iv="check">Check before they leave</button></div><div id="phIvCheck"></div></div>';
    h += '<div class="ph-card" style="background:#F7F5F0"><div class="ph-k">The honest picture, 2 minutes</div><div class="ph-s" style="color:#1B2733">Hours build up · everyone starts at Level 1 · the schedule follows the client · the real work (bathing, toileting, dementia) · paid training online, clock in on your phone · late or can’t make it: call the office, never just the client. Then: "Does any of that give you pause?"</div></div>'
      + '<div class="ph-card"><div class="ph-k">Quick check, 30 seconds</div><div class="ph-s">Only what their application did not answer.</div><div id="phIvQuick"></div></div>'
      + '<div id="phIvObs"></div>'
      + '<div class="ph-card"><div class="ph-k">Check with their references</div><textarea class="ph-in" rows="2" data-ivf="ref_check" placeholder="Anything you want their references to confirm">' + esc(A.ref_check || '') + '</textarea>'
      + '<div class="ph-k" style="margin-top:12px">How did it go?</div><textarea class="ph-in" rows="3" data-ivf="notes" placeholder="How they came across, anything that decided it either way">' + esc(A.notes || '') + '</textarea></div>'
      + '<div class="ph-btns" style="margin:4px 0 6px"><button class="ph-b p" data-iv="save" style="flex:1;font-size:16px;padding:13px">Save to their record</button></div>'
      + '<div id="phIvSaid" class="ph-h"></div>'
      /* 2026-10-12 (item 6): the decision on the phone. Candidate pool and Not hiring are the Hub's own (same questions,
         same record, and the same message offered with OK first); Hire needs the offer form, which is in the full Hub. */
      + '<div class="ph-card"><div class="ph-k">After the interview</div><div class="ph-s">Saves your notes first.</div><div class="ph-btns">'
      + '<button class="ph-b" data-iv="pool">Candidate pool</button><button class="ph-b" data-iv="declined">Not hiring</button></div>'
      + '<div class="ph-h">Hire: <a href="index.html#ap/' + encodeURIComponent(IV.id) + '">make the offer in the full Hub</a> (the offer form is there).</div></div>'
      + '<div class="ph-card"><div class="ph-k">AI review (only when you tap it)</div><div class="ph-s">Once the recording is written out. Read it, confirm or dismiss each point, and make follow-up tasks on their Interview tab in the full Hub.</div>'
      + '<div class="ph-btns"><button class="ph-b" data-iv="analyze">Analyze Interview</button></div></div>';
    box.innerHTML = h;
    ivQuick();
    ivObsMount();
    try { recMount('phRecHost', 'interview', IV.id, nm); } catch (e) { document.getElementById('phRecHost').innerHTML = '<div class="ph-msg bad" style="margin:0">The recorder could not start: ' + esc(e && e.message || e) + '</div>'; }
  }
  function ivQuick() {
    var box = document.getElementById('phIvQuick'); if (!box) return;
    var A = IV.A, Q = (typeof AP_QS !== 'undefined' ? AP_QS : []).filter(function (x) { return ['smoker', 'dogs', 'cats', 'client_smokes'].indexOf(x[0]) > -1; });
    var h = Q.map(function (x) {
      return '<div style="margin-top:9px;font-size:14px">' + esc(x[1]) + '</div><div class="ph-ch">'
        + x[2].map(function (o) { return '<button type="button" data-ivk="' + esc(x[0]) + '" data-ivv="' + esc(o[0]) + '" class="' + (A[x[0]] === o[0] ? 'on' : '') + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>';
    }).join('');
    var ww = A.works_with || {};
    h += '<div style="margin-top:9px;font-size:14px">Comfortable working with</div><div class="ph-ch">'
      + [['males', 'Men'], ['females', 'Women']].map(function (g) { return '<button type="button" data-ivw="' + g[0] + '" class="' + (ww[g[0]] ? 'on' : '') + '">' + g[1] + '</button>'; }).join('') + '</div>';
    box.innerHTML = h;
  }
  /* 2026-10-13: the interviewer's observations and the family reflection (interview-observations.js, the same section
     as the Hub). Kept on this phone as you go, like the notes; Save puts them on their record. */
  function ivObsMount() {
    var ob = document.getElementById('phIvObs'); if (!ob || !window.OBS) return;
    IV.A.observations = IV.A.observations || {};
    var draw = function () { ob.innerHTML = OBS.html(IV.A.observations, { open: false }); };
    draw();
    OBS.bind(ob, function () { return (IV.A.observations = IV.A.observations || {}); }, function (redraw) {
      if (redraw) draw();
      clearTimeout(IV.t); IV.t = setTimeout(ivDraftSave, 300);
      var s = document.getElementById('phIvSaid'); if (s) s.textContent = 'Not saved to their record yet (kept on this phone).';
    });
  }
  function ivTyped(el) {
    var A = IV.A; if (!A) return;
    var q = el.getAttribute('data-ivq'), f = el.getAttribute('data-ivf');
    if (q) { A.script[q] = A.script[q] || {}; A.script[q].note = el.value; A.script[q].suggested = false;
      var tg = el.previousElementSibling; if (tg && tg.classList && tg.classList.contains('ph-from')) tg.remove(); }
    else if (f) A[f] = el.value;
    clearTimeout(IV.t); IV.t = setTimeout(ivDraftSave, 300);
    var s = document.getElementById('phIvSaid'); if (s) s.textContent = 'Not saved to their record yet (kept on this phone).';
  }
  async function ivSave(btn) {
    if (IV.saving) return; IV.saving = true; btn.disabled = true; btn.textContent = 'Saving…';
    var s = document.getElementById('phIvSaid');
    try {
      /* Merge into what is on their record now, so a note saved elsewhere in the meantime is not lost. */
      var cur = await sb.from('job_applicants').select('post_interview').eq('id', IV.id).maybeSingle();
      if (cur.error) throw cur.error;
      var base = cur.data && cur.data.post_interview && typeof cur.data.post_interview === 'object' ? cur.data.post_interview : {};
      var A = IV.A, out = Object.assign({}, base);
      out.script = Object.assign({}, base.script || {});
      Object.keys(A.script || {}).forEach(function (k) { out.script[k] = Object.assign({}, out.script[k] || {}, A.script[k]); });
      ['smoker', 'dogs', 'cats', 'client_smokes', 'ref_check', 'notes'].forEach(function (k) { if (A[k] !== undefined) out[k] = typeof A[k] === 'string' ? A[k].trim() : A[k]; });
      if (A.works_with) out.works_with = A.works_with;
      if (A.observations && window.OBS) out.observations = OBS.clean(A.observations, (typeof ME !== 'undefined' && ME && (ME.name || ME.email)) || null);
      out.phone_saved_at = new Date().toISOString();
      var up = await sb.from('job_applicants').update({ post_interview: out }).eq('id', IV.id);
      if (up.error) throw up.error;
      ivDraftDrop(IV.id); IV.A = JSON.parse(JSON.stringify(out));
      if (s) s.textContent = 'Saved to their record ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + '.';
    } catch (e) {
      if (s) s.innerHTML = '<span style="color:#B42318">Not saved: ' + esc(e && e.message || e) + '. Your notes are still kept on this phone; try again.</span>';
    }
    IV.saving = false; btn.disabled = false; btn.textContent = 'Save to their record';
  }
  /* 2026-10-12 (her "build 6-8", item 8): after a recording is transcribed, "Fill the answers from this" writes into
     these boxes on the phone. Anything a person already typed is never replaced; what it writes is marked as from the
     recording until somebody edits it. No scores (her rule). Kept on this phone until Save, like typing. */
  window.phIvFill = function (data) {
    if (VIEW !== 'iv' || !IV.A) return false;
    var A = IV.A, filled = 0; A.script = A.script || {};
    (data && data.answers || []).forEach(function (x) {
      var cur = A.script[x.id] || {};
      if (cur.note && !cur.suggested) return;
      if (!x.note) return;
      A.script[x.id] = { note: x.note, evidence: x.evidence || null, suggested: true }; filled++;
    });
    if (data && data.other && !String(A.notes || '').trim()) A.notes = data.other;
    ivBoxesRefresh(); ivDraftSave();
    say(filled ? filled + ' answers written from the recording. Check each one, then Save to their record.' : 'Nothing new to write: every box already has your own words.', 'ok');
    return true;
  };
  window.phIvAppendNotes = function (text) {
    if (VIEW !== 'iv' || !IV.A) return false;
    IV.A.notes = (String(IV.A.notes || '').trim() ? IV.A.notes + '\n\n' : '') + text;
    ivBoxesRefresh(); ivDraftSave(); say('The transcript is in How did it go. Save to put it on their record.', 'ok');
    return true;
  };
  function ivBoxesRefresh() {
    var box = document.getElementById('phIvBody'); if (!box) return;
    [].forEach.call(box.querySelectorAll('[data-ivq]'), function (t) {
      var a = IV.A.script[t.getAttribute('data-ivq')] || {};
      if (document.activeElement !== t) t.value = a.note || '';
      var tag = t.previousElementSibling && t.previousElementSibling.classList && t.previousElementSibling.classList.contains('ph-from') ? t.previousElementSibling : null;
      if (a.suggested && a.note && !tag) { var d = document.createElement('div'); d.className = 'ph-from ph-h'; d.style.color = '#A8660E'; d.textContent = 'Written from the recording. Check it, edit anything that is off.'; t.parentNode.insertBefore(d, t); }
      else if (!(a.suggested && a.note) && tag) tag.remove();
    });
    var n = box.querySelector('[data-ivf="notes"]'); if (n && document.activeElement !== n) n.value = IV.A.notes || '';
    var s2 = document.getElementById('phIvSaid'); if (s2) s2.textContent = 'Not saved to their record yet (kept on this phone).';
  }
  /* Check before they leave: stop part 1 if it is recording, wait for its transcript, then the short AI check. */
  async function ivWaitTranscript(since, out) {
    for (var i = 0; i < 72; i++) {
      var q = await sb.from('recordings').select('id,status,consent_given,created_at').eq('kind', 'interview').eq('subject_id', IV.id).order('created_at', { ascending: false });
      var rows = (q.data || []).filter(function (r) { return r.consent_given; });
      var mine = rows.filter(function (r) { return !since || Date.parse(r.created_at) >= since - 120000; });
      var pending = (mine.length ? mine : rows).filter(function (r) { return r.status === 'recorded' || r.status === 'transcribing'; });
      if (rows.length && !pending.length && rows.some(function (r) { return r.status === 'done'; })) return true;
      if (rows.length && !pending.length && rows.every(function (r) { return r.status === 'failed'; })) return false;
      out.innerHTML = '<div class="ph-h">Writing out the recording… ' + (i * 5) + 's</div>';
      await new Promise(function (r) { setTimeout(r, 5000); });
    }
    return false;
  }
  async function ivCheck(btn) {
    var out = document.getElementById('phIvCheck'); if (!out || !window.IR) return;
    btn.disabled = true; var since = Date.now();
    try {
      if (typeof REC !== 'undefined' && REC.mr && REC.mr.state === 'recording') { recStop(); out.innerHTML = '<div class="ph-h">Part 1 stopped. Uploading…</div>'; await new Promise(function (r) { setTimeout(r, 3000); }); }
      if (!(await ivWaitTranscript(since, out))) { out.innerHTML = '<div class="ph-msg bad" style="margin:8px 0 0">The transcript is not ready (or there is no recording with consent). Carry on; you can Analyze afterwards.</div>'; btn.disabled = false; return; }
      out.innerHTML = '<div class="ph-h">Reading it…</div>';
      var d = await IR.call({ applicant_id: IV.id, kind: 'check' });
      var items = (d.review && d.review.items) || [];
      var ask = items.filter(function (x) { return x.section === 'missed'; }), con = items.filter(function (x) { return x.section === 'concerns'; });
      out.innerHTML = '<div class="ph-k" style="margin-top:10px;color:#A8660E">AI · to ask now</div>'
        + (ask.length || con.length ? ask.concat(con).map(function (x) {
          return '<div class="ph-s" style="color:#1B2733;font-size:14px;border-left:3px solid #A8660E;padding-left:8px;margin-top:8px">' + esc(x.text || x.clarify || '')
            + (x.said && x.said[0] ? '<div class="ph-s">They said: “' + esc(x.said[0].quote) + '”</div>' : '') + '</div>'; }).join('')
          : '<div class="ph-s">Nothing obvious was missed.</div>')
        + '<div class="ph-h" style="margin-top:8px">Saved on their Interview tab. Now press Start recording above for part 2.</div>';
    } catch (e) { out.innerHTML = '<div class="ph-msg bad" style="margin:8px 0 0">The check did not run: ' + esc(e && e.message || e) + '. Nothing was saved.</div>'; }
    btn.disabled = false;
  }
  async function ivAnalyze(btn) {
    if (!window.IR) return; btn.disabled = true; btn.textContent = 'Reading the interview…';
    try { await IR.call({ applicant_id: IV.id, kind: 'full' }); say('The AI review is on their Interview tab in the full Hub.', 'ok'); }
    catch (e) { say('The AI review did not run: ' + (e && e.message || e), 'bad'); }
    btn.disabled = false; btn.textContent = 'Analyze Interview';
  }
  async function ivDecide(outcome, btn) {
    var r = IV.r, A = IV.A, nm = r.first_name || 'them';
    var reason = null, p = null;
    var miss = window.OBS ? OBS.missing(A.observations) : '';
    /* 2026-10-15: asked on the page (apAsk), not with alert()/prompt(), which Chrome can switch off so the tap did nothing. */
    if (miss) { await apAsk({ title: 'Not yet', text: miss }); var ob = document.getElementById('phIvObs'); if (ob) ob.scrollIntoView({ behavior: 'smooth', block: 'end' }); return; }
    if (outcome === 'declined') { reason = await apAsk({ title: 'Why are we not hiring ' + nm + '?', text: 'Kept for our records, never sent.', input: true, ok: 'Mark not hiring', back: 'Back' }); if (reason === null) return; }
    else { p = await apPoolPrompts(r, A); if (!p) return; }
    btn.disabled = true;
    await ivSave(document.querySelector('[data-iv="save"]') || btn);
    try {
      var cur = await sb.from('job_applicants').select('post_interview').eq('id', IV.id).maybeSingle();
      var Apost = (cur.data && cur.data.post_interview) || A;
      var patch = { post_interview: Apost, status: outcome, seen_at: new Date().toISOString() };
      if (outcome === 'declined') patch.decline_reason = String(reason || '').trim() || 'not a fit after interview';
      else { patch.pooled_at = new Date().toISOString(); patch.pool_wants = p.wants || null; patch.pool_area = p.area || null; patch.pool_note = p.note || Apost.notes || null; }
      var u = await sb.from('job_applicants').update(patch).eq('id', IV.id); if (u.error) throw u.error;
      var bk = await sb.from('interview_bookings').update({ status: 'attended', post_interview: Apost, outcome_notes: Apost.notes || null, outcome_at: new Date().toISOString() })
        .eq('applicant_id', IV.id).eq('status', 'booked');
      if (bk && bk.error) say('Saved, but their interview could not be closed (' + bk.error.message + '). Tell Samantha.', 'bad');
      ivDraftDrop(IV.id);
      say((outcome === 'pool' ? nm + ' is in the candidate pool.' : nm + ' is marked not hiring.'), 'ok');
      try { await apDecisionOffer(IV.id, outcome); } catch (e) { /* the Hub's own message step says what happened */ }
      show('today');
    } catch (e) { say('Not saved: ' + (e && e.message || e) + '. Nothing was changed.', 'bad'); btn.disabled = false; }
  }
  async function onIvTap(ev) {
    var b = ev.target.closest && ev.target.closest('[data-iv],[data-ivk],[data-ivw]'); if (!b) return;
    if (b.hasAttribute('data-ivk')) { var k = b.getAttribute('data-ivk'), v = b.getAttribute('data-ivv'); IV.A[k] = IV.A[k] === v ? null : v; ivQuick(); ivDraftSave(); return; }
    if (b.hasAttribute('data-ivw')) { var g = b.getAttribute('data-ivw'); IV.A.works_with = IV.A.works_with || {}; IV.A.works_with[g] = !IV.A.works_with[g]; ivQuick(); ivDraftSave(); return; }
    var a = b.getAttribute('data-iv');
    if (a === 'back') {
      if (typeof REC !== 'undefined' && REC.mr && REC.mr.state === 'recording' && !(await ccConfirm('You are still recording. Leave anyway? The recording stops, and what was recorded is kept on this phone.'))) return;
      if (typeof REC !== 'undefined' && REC.mr && REC.mr.state === 'recording') { try { recStop(); } catch (e) { /* stopped */ } }
      return show('today');
    }
    if (a === 'save') return ivSave(b);
    if (a === 'check') return ivCheck(b);
    if (a === 'analyze') return ivAnalyze(b);
    if (a === 'pool' || a === 'declined') return ivDecide(a, b);
  }

  /* ── screen 6: more (2026-10-12, Samantha "yes build 1-5"): everything the old CC Office menu page held, so the home
     screen icon opens straight into the app; the pre-screen link and Send the application for when somebody asks about a
     job while you are on your phone; Sign out moved here, away from Refresh. ── */
  var MORE = { open: '', pos: null, inv: null };
  var icon = function (k) { return '<svg aria-hidden="true" style="width:26px;height:26px;flex:none"><use href="icons.svg#' + k + '"/></svg>'; };
  function tile(href, ic, title, sub, data) {
    return (href ? '<a class="ph-row" href="' + href + '"' : '<button type="button" class="ph-row" data-mo="' + data + '"') + ' style="display:flex;gap:12px;align-items:center">'
      + icon(ic) + '<span style="flex:1;min-width:0"><b>' + esc(title) + '</b><span>' + esc(sub) + '</span></span>' + (href ? '</a>' : '</button>');
  }
  async function morePositions() {
    if (MORE.pos) return MORE.pos;
    try { var p = await sb.from('job_positions').select('key,label,active,sort').eq('active', true).order('sort'); MORE.pos = (p.data || []).filter(function (x) { return x.key !== 'live_in'; }); }
    catch (e) { MORE.pos = []; }
    if (!MORE.pos.length) MORE.pos = [{ key: 'caregiver', label: 'Caregiver' }];
    return MORE.pos;
  }
  var linkFor = function (k) { return 'https://mo-care.com/apply?position=' + encodeURIComponent(k || 'caregiver'); };
  function moreMsg() {
    var sel = document.getElementById('moPos'), k = sel ? sel.value : 'caregiver', lab = sel && sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : 'Caregiver';
    return 'Hi! Here is the application for our ' + lab + ' position at Caring Companions. It takes about 2 minutes, and at the end you can pick a time to come in and meet us: ' + linkFor(k);
  }
  async function copyText(text, btn) {
    var done = function () { var w = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(function () { btn.textContent = w; }, 1600); };
    try { await navigator.clipboard.writeText(text); done(); } catch (e) { (await ccPrompt('Copy this:', text)); }
  }
  /* Phone notifications were built 2026-10-12 and taken out the same day (Samantha: "we are already getting the notification
     about missed clock ins and call ins, i dont want a general notification"). */
  async function moreRender() {
    var box = document.getElementById('phMoreBody'); if (!box) return;
    var pos = MORE.open ? await morePositions() : (MORE.pos || []);
    var opts = (pos || []).map(function (p) { return '<option value="' + esc(p.key) + '">' + esc(p.label) + '</option>'; }).join('');
    var h = '<div class="ph-lane" style="color:#0E3860">WHEN THE PHONE RINGS</div>'
      + tile('capture.html', 'i-inbox', 'Quick Capture', 'Bank any call in 30 seconds: leads, questions, messages, schedule info')
      + tile('callout.html', 'i-phone', 'Caregiver Call-Off', 'Pick who is calling off and their shift; texting starts in 5 minutes')
      + '<div class="ph-lane" style="color:#0E3860">SOMEBODY ASKING ABOUT A JOB</div>'
      + tile('', 'i-link', 'Copy the pre-screen link', 'Send it any way you like: a text, Messenger, an email', 'link');
    if (MORE.open === 'link') {
      h += '<div class="ph-card"><div class="ph-k">Position</div><select id="moPos" class="ph-in">' + opts + '</select>'
        + '<input id="moUrl" class="ph-in" readonly onclick="this.select()" style="font-weight:600;color:#0E3860">'
        + '<div class="ph-btns"><button class="ph-b p" data-mo="copylink">Copy link</button><button class="ph-b" data-mo="copymsg">Copy with a message</button>'
        + (navigator.share ? '<button class="ph-b" data-mo="share">Share…</button>' : '') + '</div>'
        + '<div class="ph-s" id="moMsg" style="margin-top:8px"></div></div>';
    }
    h += tile('', 'i-send', 'Send the application', 'The Hub texts or emails it from the office, with their name on it', 'inv');
    if (MORE.open === 'inv') {
      h += '<div class="ph-card"><div class="ph-s">For someone who called asking about a job. You see exactly what they will get before anything goes.</div>'
        + '<input id="moF" class="ph-in" placeholder="First name" autocapitalize="words"><input id="moL" class="ph-in" placeholder="Last name" autocapitalize="words">'
        + '<input id="moP" class="ph-in" placeholder="Mobile phone" inputmode="tel"><input id="moE" class="ph-in" placeholder="Email" inputmode="email" autocapitalize="off">'
        + '<select id="moIP" class="ph-in">' + opts + '</select>'
        + '<label style="display:flex;gap:9px;align-items:flex-start;margin-top:10px;font-size:14px"><input type="checkbox" id="moSms" style="width:20px;height:20px;margin-top:1px"> They asked us to text it. Without this it goes by email only.</label>'
        + '<div class="ph-btns"><button class="ph-b" data-mo="invprev">Preview</button><button class="ph-b p" data-mo="invsend" disabled>Send</button></div>'
        + '<div id="moInv" class="ph-s" style="margin-top:8px"></div></div>';
    }
    h += '<div class="ph-lane" style="color:#0E3860">FOR CAREGIVERS</div>'
      + tile('', 'i-clock', 'Copy the My Hours link', 'cc.mo-care.com/availability: their wanted hours and days', 'hours')
      + '<div class="ph-lane" style="color:#0E3860">EVERYTHING ELSE</div>'
      + tile('index.html', 'i-home', 'Open the full Hub', 'Best on a computer')
      + tile('', 'i-lock', 'Sign out', 'You stay signed in on this phone for 14 days otherwise', 'out');
    box.innerHTML = '<div class="ph-wrap" style="padding:0">' + h + '</div>';
    if (MORE.open === 'link') moreLink();
  }
  function moreLink() {
    var sel = document.getElementById('moPos'); if (!sel) return;
    document.getElementById('moUrl').value = linkFor(sel.value);
    document.getElementById('moMsg').textContent = moreMsg();
  }
  function invBody(action) {
    var v = function (id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; };
    return { action: action, first_name: v('moF'), last_name: v('moL'), phone: v('moP'), email: v('moE'), position: v('moIP') || 'caregiver', sms_asked: !!(document.getElementById('moSms') || {}).checked };
  }
  async function moreTap(ev) {
    var b = ev.target.closest && ev.target.closest('[data-mo]'); if (!b) return;
    var a = b.getAttribute('data-mo');
    if (a === 'link' || a === 'inv') { MORE.open = MORE.open === a ? '' : a; MORE.inv = null; return moreRender(); }
    if (a === 'copylink') return copyText(document.getElementById('moUrl').value, b);
    if (a === 'copymsg') return copyText(moreMsg(), b);
    if (a === 'share') { try { await navigator.share({ text: moreMsg() }); } catch (e) { /* closed the share sheet */ } return; }
    if (a === 'hours') return copyText('https://cc.mo-care.com/availability', b);
    if (a === 'out') { if (!(await ccConfirm('Sign out of CC Office on this phone?'))) return; return phSignOut(); }
    var out = document.getElementById('moInv'), send = document.querySelector('[data-mo="invsend"]');
    if (a === 'invprev') {
      var body = invBody('preview'); MORE.inv = null; if (send) send.disabled = true;
      if (!body.first_name) { out.innerHTML = '<span style="color:#B42318">A first name is needed.</span>'; return; }
      if (!body.phone && !body.email) { out.innerHTML = '<span style="color:#B42318">Add a phone number or an email.</span>'; return; }
      b.disabled = true; b.textContent = 'Loading…';
      try {
        var j = await apInvCall(body);
        if (j.error) { out.innerHTML = '<span style="color:#B42318">' + esc(j.error) + '</span>'; return; }
        out.innerHTML = '<div style="background:#F7F5F0;border-radius:10px;padding:9px 11px;color:#1B2733">'
          + (j.text ? '<b>Text:</b> ' + esc(j.text) : 'No text: ' + esc(j.no_text_why || '')) + '<br>'
          + (j.email ? '<b>Email:</b> ' + esc(j.email.subject) : 'No email address, so no email.') + '</div>'
          + (j.in_hours ? '' : '<div style="color:#A8660E;margin-top:6px">It is outside 8am to 6pm, so Send waits until after 8am.</div>');
        MORE.inv = JSON.stringify(body); if (send) send.disabled = !j.in_hours;
      } catch (e) { out.innerHTML = '<span style="color:#B42318">Could not preview: ' + esc(e && e.message || e) + '</span>'; }
      finally { b.disabled = false; b.textContent = 'Preview'; }
      return;
    }
    if (a === 'invsend') {
      var body2 = invBody('send');
      if (!MORE.inv || MORE.inv !== JSON.stringify(Object.assign({}, body2, { action: 'preview' }))) { out.innerHTML = '<span style="color:#B42318">Something changed. Press Preview again first.</span>'; return; }
      if (!await apAsk({ title: 'Send the application to ' + body2.first_name + ' now?', ok: 'Send', back: 'Back' })) return;
      b.disabled = true; b.textContent = 'Sending…';
      try {
        var r = await apInvCall(body2);
        if (r.held) { out.innerHTML = '<span style="color:#A8660E">' + esc(r.held) + '</span>'; return; }
        if (r.error || !r.ok) { out.innerHTML = '<span style="color:#B42318">' + esc(r.error || 'Nothing was sent.') + '</span>'; return; }
        var how = [r.texted ? 'by text' : '', r.emailed ? 'by email' : ''].filter(Boolean).join(' and ');
        MORE.open = ''; MORE.inv = null; await moreRender();
        say('Sent ' + how + '.' + ((r.not_sent || []).length ? ' Not sent: ' + r.not_sent.join('; ') : ''), 'ok');
      } catch (e) { out.innerHTML = '<span style="color:#B42318">Could not send: ' + esc(e && e.message || e) + '</span>'; }
      finally { b.disabled = false; b.textContent = 'Send'; }
    }
  }

  /* ── the screens, and the tabs between them ── */
  var VIEW = 'need';
  function show(v) {
    VIEW = v;
    var n = document.getElementById('phNeed'), f = document.getElementById('phFind'), td = document.getElementById('phToday'), en = document.getElementById('phEnd'), iv = document.getElementById('phIv'), mo = document.getElementById('phMore'), t = document.getElementById('phTitle');
    if (n) n.hidden = v !== 'need'; if (f) f.hidden = v !== 'find'; if (td) td.hidden = v !== 'today'; if (en) en.hidden = v !== 'end'; if (iv) iv.hidden = v !== 'iv'; if (mo) mo.hidden = v !== 'more';
    if (t) t.firstChild.nodeValue = v === 'find' ? 'Find a person' : v === 'today' ? 'Today' : v === 'end' ? 'End my shift' : v === 'iv' ? 'Interview' : v === 'more' ? 'More' : 'Needs me now';
    var r = document.getElementById('phRefresh'); if (r) r.hidden = v === 'find' || v === 'end' || v === 'iv' || v === 'more';
    if (v === 'more') moreRender();
    if (v === 'end') endOpen();
    if (v === 'today') { todayRender(); todayLoad(false); var fl = findLoad(); if (fl && fl.then) fl.then(function () { if (VIEW === 'today') todayRender(); }); }   /* caregiver numbers for "who was asked" */
    [].forEach.call(document.querySelectorAll('.ph-tabs button'), function (b) { b.classList.toggle('on', b.getAttribute('data-v') === v); });
    if (v === 'find') { findLoad(); findRender(); }
    window.scrollTo(0, 0);
  }

  /* ── start (called by the Hub's boot and sign-in, phone mode only) ── */
  function build() {
    if (document.getElementById('phApp')) return;
    var d = document.createElement('div'); d.id = 'phApp';
    d.innerHTML = '<div class="ph-top"><b id="phTitle">Needs me now<small id="phWho"></small></b>'
      + '<button type="button" id="phRefresh">Refresh</button></div>'
      + '<div id="phMsg" style="display:none"></div><div id="phNeed">'
      + '<div class="ph-wrap"><div id="phList"><div class="ph-none" style="padding-top:14px">Loading…</div></div>'
      + '<div class="ph-foot"><a href="' + hubLink() + '">Open the full Hub</a></div></div></div>'
      + '<div id="phFind" hidden><div class="ph-wrap"><input id="phQ" class="ph-q" type="search" autocomplete="off" autocapitalize="words" enterkeyhint="search" placeholder="Name or phone number" aria-label="Find a person">'
      + '<div id="phFindBody"></div></div></div>'
      + '<div id="phToday" hidden><div class="ph-wrap"><div id="phTodayBody"></div></div></div>'
      + '<div id="phEnd" hidden><div class="ph-wrap"><div id="phEndBody"></div></div></div>'
      + '<div id="phIv" hidden><div class="ph-wrap"><div id="phIvBody"></div></div></div>'
      + '<div id="phMore" hidden><div class="ph-wrap"><div id="phMoreBody"></div></div></div>'
      + '<nav class="ph-tabs"><button type="button" data-v="need" class="on">Needs me</button><button type="button" data-v="find">Find</button><button type="button" data-v="today">Today</button><button type="button" data-v="end">End shift</button><button type="button" data-v="more">More</button></nav>';
    document.body.appendChild(d);
    d.querySelector('#phNeed').addEventListener('click', onTap);
    d.querySelector('#phFind').addEventListener('click', onFindTap);
    d.querySelector('#phToday').addEventListener('click', onTodayTap);
    d.querySelector('#phEnd').addEventListener('click', onEndTap);
    d.querySelector('#phEnd').addEventListener('input', onEndInput);
    d.querySelector('#phIv').addEventListener('click', onIvTap);
    d.querySelector('#phMore').addEventListener('click', moreTap);
    d.querySelector('#phMore').addEventListener('change', function (ev) { if (ev.target && ev.target.id === 'moPos') moreLink(); });
    d.querySelector('#phMore').addEventListener('input', function (ev) { if (ev.target && /^mo(F|L|P|E|IP|Sms)$/.test(ev.target.id)) { MORE.inv = null; var sb2 = document.querySelector('[data-mo="invsend"]'); if (sb2) sb2.disabled = true; } });
    d.querySelector('#phIv').addEventListener('input', function (ev) { if (ev.target && (ev.target.hasAttribute('data-ivq') || ev.target.hasAttribute('data-ivf'))) ivTyped(ev.target); });
    d.querySelector('.ph-tabs').addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (b) show(b.getAttribute('data-v')); });
    var q = d.querySelector('#phQ'), qt = null;
    q.addEventListener('input', function () { clearTimeout(qt); qt = setTimeout(function () { FIND.q = q.value; FIND.open = null; findRender(); }, 120); });
    document.getElementById('phRefresh').onclick = function () { tick(true); if (VIEW === 'today') todayLoad(true); };
    window.phSignOut = async function () {
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
  /* ── THE HR DESK (?m=hr): only the HR section ── */
  function hrStart() {
    var d = document.getElementById('phApp');
    if (!d) {
      d = document.createElement('div'); d.id = 'phApp';
      d.innerHTML = '<div class="ph-top"><b>Performance<small id="phWho">Caring Companions</small></b><button type="button" id="phHrOut">Sign out</button></div><div id="phHr"></div>';
      document.body.appendChild(d);
      /* hr.js draws into #hrRoot and moves the Write-Ups and Attendance panels in beside it; the Hub's windows (the
         write-up notice, Start a write-up) sit inside the hidden computer screen, so they come out to the page */
      var root = document.getElementById('hrRoot'); if (root) document.getElementById('phHr').appendChild(root);
      document.querySelectorAll('#appScreen .overlay').forEach(function (o) {
        document.body.appendChild(o);
        /* a full-screen window needs its way back at the top, not only at the end of a long form */
        var m = o.querySelector('.modal');
        if (m && !m.querySelector('.ph-close')) {
          var c = document.createElement('div'); c.className = 'ph-close';
          c.innerHTML = '<button type="button">\u2039 Back</button>';
          c.firstChild.onclick = function () { o.classList.remove('open'); };
          m.prepend(c);
        }
      });
      document.getElementById('phHrOut').onclick = async function () {
        try { localStorage.removeItem(KEY); } catch (e) { /* nothing kept */ }
        document.documentElement.classList.remove('ph-on');
        await signOut();
      };
      try { var n = (typeof ME !== 'undefined' && ME && ME.name) || ''; if (n) document.getElementById('phWho').textContent = first(n) + ' · Caring Companions'; } catch (e) { /* the name is optional */ }
    }
    document.documentElement.classList.add('ph-on');
    var s = document.getElementById('signinScreen'); if (s) s.style.display = 'none';
    var want = String((location.hash.match(/^#hr\/([a-z]+)/i) || [])[1] || '').toLowerCase();
    var draw = function (w) { try { if (window.HR) window.HR.render(w); } catch (e) { console.warn('hr', e); } };
    /* The Hub's own actions redraw the open screen when they finish: here that is the HR section */
    window.renderActiveTab = function () { draw(); };
    window.myWorkRefresh = function () {};
    window.addEventListener('scx-hydrated', function () { draw(); });
    if (window.HR) draw(want);
    else { var sc = document.createElement('script'); sc.src = 'hr.js?v=20261026b'; sc.onload = function () { draw(want); }; document.head.appendChild(sc); }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) draw(); });
  }
  function phStart() {
    if (HRM) { hrStart(); return; }
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
