/* =============================================================================
   calmer-mywork.js · Calmer My Work, the Hub half (Samantha 2026-11-05: "Approve the Calmer My Work plan as shown, with all
   eleven of your picks. Build it switched off."; plan https://claude.ai/artifact/3NvvrwvkEhUWZY7RSFdsTv). window.CMW.

   Her ask: "it feels busy and overwhelming", and "Team work being a sub tab is just a way for things to get lost ... we also
   get texts for important things so if we already handled it it doesnt need to be a card".
     1  The top is one line (late · due today · for whoever is on duty · came in since you left). Hub problems are a small
        yellow note only when something is broken. The Staffing view folds to one line when nothing in it is waiting.
     2  Today is in time order: On duty now, Late, Today, Later this week. Reminders fold into one line.
     3  Each card is one line and one button that fits it; Hand off and Talk about move into ⋯. No "Unclassified", no code
        names, no "made on" date. Tick boxes only for owners.
     4  Empty sections are hidden. Group explanations show for a person's first two weeks only. The duplicate "+ Add work"
        on the page goes (the header has + Work); "+ Add lead" stays (her ask this morning).
     5  The header's late number is the page's Late count.
     7  No Team Work tab: what needs whoever is on duty sits at the top of Today ("On duty now"), only for people on duty
        (everyone when nobody is on the schedule), with Take it.
     8  A card a text is already handling (a missed clock-in or running-late text loop that is on, a call-off text) is not
        shown until its deadline passes with nothing handling it.
    10  Card words say only what really happens (team-work.js asks CMW.on()).
   The server half (cards that close on the same evidence as their texts, and an owner for cards with no text) is its own
   change in the Staffing repo, behind the same switch.
   Switch: ops_settings.calmer_mywork_live (Owners Hub Admin page), off. Owners can preview it in their own browser
   (localStorage cmwPreview). Off = My Work exactly as before. Nothing here sends anything.
   No em dashes in anything a person reads.
   ============================================================================= */
(function (W) {
  'use strict';
  const D = () => { try { return DATA || {}; } catch (e) { return {}; } };
  const lc = s => String(s == null ? '' : s).trim().toLowerCase();
  const esc = s => (typeof W.escapeHtmlComms === 'function' ? W.escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const isOwner = () => { try { return !!W.ccIsOwner(); } catch (e) { return false; } };
  const me = () => { try { return lc(W.ccActor().email); } catch (e) { return ''; } };
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } return null; };
  const live = () => (D().ops_settings || {}).calmer_mywork_live === true;
  const previewing = () => !live() && isOwner() && ls('cmwPreview') === '1';
  const on = () => live() || previewing();
  let remOpen = false, svShow = false;

  /* 8 · a card a text is already handling: hidden until its deadline passes with nothing handling it */
  function textWorking(it, now) {
    const id = String(it && it.id || ''), s = D().ops_settings || {};
    const due = Date.parse(it && it.due || '');
    if (Number.isFinite(due) && (now || Date.now()) >= due) return false;
    if (/^ops_tk_/.test(id)) return s.timekeeper_admin_loop_live === true;                      // missed clock-in: the admin text loop
    if (/^ops_late_/.test(id) && !/^ops_late_transcripts_/.test(id)) return s.late_admin_live === true;   // running late: the admin texts until Seen
    if (/^ops_cov(fill|esc|quiet)_/.test(id)) return true;                                       // a call-off: the office was texted when it came in
    return false;
  }
  /* 7 · On duty now: the Team Work pile, for people on duty (everyone when nobody is on the schedule) */
  function onDutyList() {
    if (!W.TW || typeof W.TW.list !== 'function' || !W.TW.on()) return [];
    try {
      const c = W.TW.ctx(), duty = W.TW.onDuty(c), m = me();
      if (duty.length && duty.indexOf(m) === -1) return [];
      const now = Date.now();
      return W.TW.list().filter(x => !textWorking(x.it, now));
    } catch (e) { return []; }
  }
  /* a red shift-note flag is "act today": never folded away as a reminder, whatever its urgency says */
  const isRem = it => !(it && it.kind === 'care_note' && it.level === 'red') && !!(W.MWT && typeof W.MWT.tierOf === 'function' && W.MWT.tierOf(it) === 'rem');
  /* 2 · the groups, from the same lanes My Work already works out */
  function groups() {
    let rows = [], b = { mine: [], waiting: [] };
    /* always Today's list, whichever tab is open (the header's late number reads this too) */
    let keep = null;
    try { keep = MYWORK_TAB; MYWORK_TAB = 'today'; rows = W.myWorkRows(); b = W.myWorkBuckets(); }
    catch (e) { return { rows: [], b, act: [], late: [], today: [], week: [], rest: [], rem: [], urgent: 0 }; }
    finally { if (keep !== null) MYWORK_TAB = keep; }
    const pins = new Set((typeof W.hoPinned === 'function' ? W.hoPinned() : []).map(i => i.id));
    const lane = n => rows.filter(r => !pins.has(r.id) && W.myWorkLane(r) === n);
    const act = lane(0), lateL = lane(1), due = lane(2);
    const inToday = new Set(rows.map(r => r.id).concat([...pins]));
    const more = (b.mine || []).filter(i => !inToday.has(i.id)).sort((a, c) => String(a.due || '9999').localeCompare(String(c.due || '9999')));
    const week = Date.now() + 7 * 864e5;
    const rem = act.concat(lateL, due).filter(isRem);
    /* anything past its due time is Late, whichever lane it came from (a journey step keeps its own lane rules) */
    const pastDue = i => !!i.due && Date.parse(i.due) < Date.now() && !(typeof W.opsParked === 'function' && W.opsParked(i));
    return { rows, b, act, late: act.concat(lateL, due.filter(pastDue)).filter(i => !isRem(i)), today: due.filter(i => !isRem(i) && !pastDue(i)), rem,
      week: more.filter(i => !i.due || Date.parse(i.due) <= week), rest: more.filter(i => i.due && Date.parse(i.due) > week),
      urgent: act.filter(i => !isRem(i)).length };
  }
  function counts() { const g = groups(); return { late: g.late.length, today: g.today.length, onDuty: onDutyList().length, urgent: g.urgent }; }

  /* 1 · the one line at the top (renderTodayStrip hands over what it knows) */
  function lineHtml(o) {
    const c = counts(), bits = [];
    bits.push(c.late ? '<b class="cmw-red">' + c.late + ' late</b>' : '<b>Nothing late</b>');
    bits.push('<b>' + c.today + '</b> due today');
    if (c.onDuty) bits.push('<b>' + c.onDuty + '</b> for whoever is on duty');
    if (o.cov) bits.push('<b>' + o.cov + '</b> open call-off' + (o.cov === 1 ? '' : 's'));
    bits.push(c.urgent ? '<b class="cmw-red">' + c.urgent + ' need' + (c.urgent === 1 ? 's' : '') + ' you now</b>' : 'nothing urgent right now');
    if (o.since) bits.push('<button class="cmw-link" onclick="tsToggle()">' + o.since + ' came in since you left</button>');
    const warn = [];
    if (o.axisErr) warn.push('AxisCare did not answer just now, so visits and open shifts may be missing. <button class="cmw-link" onclick="tsShifts&&tsShifts();renderTodayStrip()">Try again</button>');
    if (o.ivErr) warn.push('Interviews could not be loaded just now.');
    return '<div class="cmw-line">' + bits.join(' <span class="cmw-dot">·</span> ') + '</div>'
      + (warn.length ? '<div class="cmw-warn">' + warn.join(' ') + '</div>' : '');
  }
  /* 1 · the Staffing view folds to one line when nothing in it is waiting (staffing-view.js asks) */
  function svFold(S) {
    if (!on() || svShow) return false;
    return !(S.confirm.length || S.todayCases.length || S.clockins.length || S.tomCases.length || S.tomOpen.length);
  }
  function svLine(who, mine, tomError) {
    return '<div class="card" style="padding:10px 16px;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;">'
      + '<b style="color:var(--navy);">Staffing</b><span class="field-note">' + (mine ? 'You’re on Staffing duty. ' : (who ? esc(who) + ' is on Staffing duty. ' : ''))
      + 'Nothing waiting: no call-offs to confirm, no open shifts or late clock-ins today' + (tomError ? '.' : ', tomorrow is covered.') + '</span>'
      + (tomError ? '<span class="cmw-warn" style="margin:0;">Tomorrow\'s schedule could not be read from AxisCare.</span>' : '')
      + '<span style="flex:1;"></span><button class="cmw-link" onclick="CMW.svOpen()">Show</button></div>';
  }

  /* 2, 4, 7 · Today. renderMyWork hands over what it already drew above the lanes (handoffs, help asks, the porch). */
  function todayHtml(o) {
    const g = groups(), card = it => W.myWorkCard(it, g.rows.indexOf(it));
    const grp = (label, n, body, cls, note) => '<div class="cmw-grp' + (cls ? ' ' + cls : '') + '"><b>' + label + ' · ' + n + '</b>' + (note ? '<span class="field-note">' + note + '</span>' : '') + '</div>' + body;
    let h = o.top || '';
    const duty = onDutyList();
    /* the rules are said once here, not on every card (the tidy card) */
    if (duty.length) h += grp('ON DUTY NOW', duty.length, duty.map(x => W.TW.cardHtml(x, { tidy: !!W.MWTidy })).join(''), 'cmw-r', 'for whoever is on duty; Take it makes it yours. Not taken in 15 minutes, the person in charge sees it.');
    if (g.late.length) h += grp('LATE', g.late.length, g.late.map(card).join(''), 'cmw-r');
    if (g.today.length) h += grp('TODAY', g.today.length, g.today.map(card).join(''));
    if (!duty.length && !g.late.length && !g.today.length && !/porch|caught up/i.test(o.top || '')) h += '<div class="field-note" style="padding:10px 2px;">Nothing late and nothing due today.</div>';
    if (g.week.length) h += grp('LATER THIS WEEK', g.week.length, g.week.map(it => W.myWorkCard(it, -1)).join(''));
    if (g.rest.length) h += '<div class="cmw-fold">' + (W.MYWORK_LATER_OPEN || (typeof MYWORK_LATER_OPEN !== 'undefined' && MYWORK_LATER_OPEN)
      ? g.rest.map(it => W.myWorkCard(it, -1)).join('') + '<button class="cmw-link" onclick="MYWORK_LATER_OPEN=false;renderMyWork()">Fold away</button>'
      : '<button class="cmw-link" onclick="MYWORK_LATER_OPEN=true;renderMyWork()">' + g.rest.length + ' more, later than this week</button>') + '</div>';
    const past = g.rows.filter(r => W.myWorkLane(r) === 3);
    if (past.length) h += '<div class="cmw-fold">' + past.length + ' past their day. <button class="cmw-link" onclick="MYWORK_PAST_OPEN=!MYWORK_PAST_OPEN;renderMyWork()">' + ((typeof MYWORK_PAST_OPEN !== 'undefined' && MYWORK_PAST_OPEN) ? 'Fold away' : 'Look through them') + '</button>'
      + ' <button class="cmw-link" onclick="myWorkPastCloseAll()">Close all ' + past.length + '</button></div>'
      + ((typeof MYWORK_PAST_OPEN !== 'undefined' && MYWORK_PAST_OPEN) ? past.map(it => W.myWorkCard(it, -1)).join('') : '');
    if ((g.b.waiting || []).length) { const w = typeof W.myWorkStrips === 'function' ? W.myWorkStrips() : ''; if (w) h += grp('WAITING', g.b.waiting.length, w, '', 'comes back on its own'); }
    const offered = W.TP && typeof W.TP.offeredLaneBody === 'function' ? W.TP.offeredLaneBody() : '';
    if (offered) h += grp('OFFERED TO THE TEAM', '', offered).replace(' · </b>', '</b>');
    if (g.rem.length) h += '<div class="cmw-fold">' + g.rem.length + ' reminder' + (g.rem.length === 1 ? '' : 's') + ' for your information. <button class="cmw-link" onclick="CMW.rem()">' + (remOpen ? 'Hide' : 'Show') + '</button></div>'
      + (remOpen ? g.rem.map(card).join('') : '');
    return h;
  }
  /* 4 · group explanations: a person's first two weeks only (their start date on the Team page) */
  function newcomer() {
    const s = (D().coordinator_staff || []).find(x => lc(x.email) === me());
    const start = Date.parse(s && (s.start_date || s.hire_date || s.started_at) || '');
    return Number.isFinite(start) && Date.now() - start < 14 * 864e5;
  }
  /* 6 · the owner's preview line */
  function previewLink() {
    if (live() || !isOwner()) return '';
    return previewing()
      ? '<div class="cmw-prev"><b>Calmer My Work, preview.</b> Only you see this, only in this browser. Turn it on for everyone on the Owners Hub Admin page. <button class="cmw-link" onclick="CMW.preview(false)">Back to the usual My Work</button></div>'
      : '<div class="cmw-prev-link"><button class="cmw-link" onclick="CMW.preview(true)">Preview Calmer My Work (only you)</button></div>';
  }
  function sync() {
    const c = on();
    document.body.classList.toggle('cmw-on', c);
    document.body.classList.toggle('cmw-owner', isOwner());
    document.body.classList.toggle('cmw-new', c && newcomer());
    css();
  }
  function css() {
    if (document.getElementById('cmwCss')) return;
    const s = document.createElement('style'); s.id = 'cmwCss';
    s.textContent = `
.cmw-line{font-size:15px;padding:10px 14px;background:#fff;border:1px solid var(--border);border-radius:12px;display:flex;flex-wrap:wrap;gap:4px 6px;align-items:baseline}
.cmw-line b{color:var(--navy)}.cmw-red,.cmw-line b.cmw-red{color:var(--red)}.cmw-dot{color:var(--text-muted)}
.cmw-warn{font-size:13px;background:#FDF3E2;color:#8A5A00;border-radius:8px;padding:6px 10px;margin-top:6px}
.cmw-link{font:inherit;font-size:13px;color:var(--navy);background:none;border:none;padding:0;text-decoration:underline;cursor:pointer}
.cmw-grp{margin:16px 0 8px;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.cmw-grp b{font-size:12.5px;letter-spacing:.06em;color:var(--navy)}.cmw-grp.cmw-r b{color:var(--red)}
.cmw-fold{font-size:13.5px;color:var(--text-muted);margin:12px 0 6px}
.cmw-prev{font-size:13.5px;background:#FDF3E2;color:#8A5A00;border-radius:10px;padding:8px 12px;margin-bottom:10px}.cmw-prev-link{margin:0 0 8px}
body.cmw-on #tab-mywork .wkcard .wkchkhit{display:none}
body.cmw-on.cmw-owner #tab-mywork .wkcard.selected .wkchkhit,body.cmw-on.cmw-owner #tab-mywork .wkcard:hover .wkchkhit{display:inline-block}
body.cmw-on #tab-mywork .wkchip.cmw-unclassified{display:none}
body.cmw-on #tab-mywork button[onclick="opsToggleAdd()"]{display:none}
body.cmw-on:not(.cmw-new) #tab-mywork .mwt-tier>div:nth-child(2):not([class]){display:none}`;
    document.head.appendChild(s);
  }
  W.CMW = { on, live, previewing, textWorking, onDutyList, groups, counts, lineHtml, svFold, svLine, todayHtml, previewLink, sync, newcomer,
    preview(v) { ls('cmwPreview', v ? '1' : null); svShow = false; if (typeof W.renderMyWork === 'function') W.renderMyWork(); },
    rem() { remOpen = !remOpen; if (typeof W.renderMyWork === 'function') W.renderMyWork(); },
    svOpen() { svShow = true; if (typeof W.svRender === 'function') W.svRender(); } };
})(window);
