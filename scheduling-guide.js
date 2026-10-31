/* =============================================================================
   HOW SCHEDULING WORKS (scheduling review step 5, 2026-10-12; her ask: "need a tab over to the right like we have in
   applicant journey to explain how to use all scheduling tabs")
   One page at the right end of the Scheduling strip: which tab handles which problem, step by step guides, the exact
   texts caregivers get (read from the live settings, so the words never go stale) and what Cara does on her own. It
   replaces the old scheduling-guide.html page. Reads only; nothing here sends or saves.
   2026-10-24 (her ask after the AxisCare reasons were renamed and "reasons by AxisCare id" went on): the call-off steps
   follow the response board and Send Cara's list; a new section on which AxisCare reason to pick and what Cara does with
   it; cancelling a visit; "Let Cara run it"; the Live Schedule asking why.
   ============================================================================= */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = () => (typeof DATA !== 'undefined' && DATA.ops_settings) || {};
  const on = (k) => S()[k] === true;
  const chip = (isOn, onWord, offWord) => '<span style="font-size:11px;font-weight:800;border-radius:999px;padding:1px 8px;margin-left:6px;white-space:nowrap;'
    + (isOn ? 'background:var(--green-bg);color:var(--green);">' + (onWord || 'On') : 'background:#F1F5F9;color:#64748B;">' + (offWord || 'Off')) + '</span>';
  const go = (tab, sub, label) => '<a href="javascript:void(0)" onclick="' + (sub ? "schedGo('coverage');covSubGo('" + sub + "')" : "switchTab('" + tab + "')") + '" style="font-weight:700;color:var(--teal);">' + label + '</a>';
  const ph = (id) => { const el = document.getElementById(id); return el ? el.getAttribute('placeholder') || '' : ''; };

  const WHERE = [
    ['A caregiver calls off', go('', 'calloffs', 'Cara: Call-offs & open shifts'), 'Send Cara\'s list, then confirm the best yes on the board.'],
    ['A client cancels a visit, or we can\'t staff it', go('', 'calloffs', 'Cara: Call-offs & open shifts'), 'In AxisCare: put it on "Canceled Shift" with "Client Cancelled Shift" or "Office Unable to Staff".'],
    ['Nobody has clocked in, or out', go('', 'clockins', 'Cara: Missed clock-ins & outs'), 'Call them from the office line. If they can\'t work, open a coverage case.'],
    ['A client\'s regular shift has nobody on it', go('', 'ongoing', 'Cara: Ongoing shifts'), 'Ask who wants it, the same way as a call-off.'],
    ['Regular hours to fill, or a new client', go('teambuilder', '', 'Scheduling: Caregiver Matching'), 'Ask the whole team, then pencil in the green names.'],
    ['Who can we staff this week? Who wants more hours?', go('', 'hours', 'Cara: Hours & matching'), 'Check it on Mondays; text the availability link to anyone missing.'],
    ['A visit is missing a clock-in or clock-out', go('ops', '', 'Needs Attention'), 'Call the client to confirm the times from the card, then fix the visit in AxisCare.'],
    ['See the schedule, or change one visit', go('', 'calloffs', 'Cara: Call-offs & open shifts'), 'Open shifts are on Cara\'s board. Change a visit in AxisCare.'],
    ['How did a new pairing go?', go('carematch', '', 'Care Match Check-ins'), 'Call when a check-in is due and log both sides.'],
    ['GHEs and medication visits', go('nursevisits', '', 'Nurse Scheduling'), 'Who is due, which nurse, and the GHE forms.'],
    ['A caregiver asked for no shift texts', go('', 'dno', 'Cara: No shift texts'), 'Add them here; nobody can text them about shifts.'],
  ];

  const steps = (title, open, items, foot) => '<details class="card" ' + (open ? 'open ' : '') + 'style="padding:12px 16px;margin:0 0 10px;">'
    + '<summary style="cursor:pointer;font-weight:800;color:var(--navy);font-size:15px;">' + title + '</summary>'
    + '<ol style="margin:8px 0 0 18px;padding:0;font-size:13.5px;line-height:1.55;">' + items.map((i) => '<li style="margin:3px 0;">' + i + '</li>').join('') + '</ol>'
    + (foot ? '<div class="field-note" style="margin-top:6px;font-size:12px;">' + foot + '</div>' : '') + '</details>';

  function guides() {
    const grace = S().timekeeper_grace_min || 5;
    return steps('📞 A caregiver calls off', true, [
      'It becomes one case on Cara. If they called the office, press <b>📞 Someone\'s calling off</b>. If the office takes them off the visit in AxisCare with <b>Caregiver Called Off</b> or <b>Caregiver No Show</b>, Cara opens the case herself within about 5 minutes.' + chip(on('coverage_watch_live'), 'watching AxisCare', 'not watching'),
      'The admins on the call-in list get a text with their own link to the case.' + chip(on('callin_reminders_live'), 'reminders on', 'reminders off'),
      'Open the case. The line at the top says what to do now.',
      'Press <b>Send Cara\'s list</b> (or <b>Build the ask list</b> to choose yourself). Cara ranks everyone who may be asked, people who have worked with this client first. Do Not Return, No shift texts, inactive, Needs Verification and not-yet-approved caregivers are never listed. Untick anyone you don\'t want, then send.' + chip(on('cara_list_live'), 'Cara\'s list on', 'Cara\'s list off'),
      'Or hand it to Cara: <b>Let Cara run it</b> asks 5 at a time, 20 minutes apart (10 for a shift within a day), and stops at the first full-shift yes for you to confirm. <b>Take it back</b> stops her any time.' + chip(on('cara_run_live'), 'on', 'owners only, practice'),
      'Answers land on the board under <b>Who answered</b>: Yes, full shift · Part or different hours · Question · No · Needs Verification. Click a name for their exact words and why Cara would or wouldn\'t pick them. Part shifts that fit together are shown as a pair. Text questions back from the office line.' + chip(on('cara_board_live'), 'board on', 'board off'),
      'Press <b>Confirm (their name) ✓</b> on the board. Only a full-shift yes from someone eligible can be confirmed. The Hub puts them on the AxisCare visit and reads it back to check.',
      'When the case closes, the person picked gets "You\'re confirmed" and the others who said yes get the "covered" text. The family hears who is coming instead only if their Family Circle opted in.' + chip(on('family_caregiver_change_text_approved'), 'family text on', 'family text off'),
      'If nobody can cover it: <b>More for this shift</b>, then <b>Close uncovered</b>, and in AxisCare put the visit on "Canceled Shift" with <b>Office Unable to Staff</b>. A card lands on My Work to call the family.',
    ], 'Cara never texts a caregiver about a shift unless a person picked them, or a coordinator handed the case to her with Let Cara run it.')
    + steps('🗂️ Which reason to pick in AxisCare', false, [
      'Ask one question: <b>why isn\'t the original caregiver going?</b> Then pick the reason. Cara reads the reason together with who is on the visit.' + chip(on('visit_reasons_live'), 'Cara reads them by id', 'Cara matches words (old way)'),
      '<b>Caregiver Called Off</b>: they told us they can\'t work. Opens a call-off case and counts on their attendance. Use it even when you already have the replacement and swap straight to them: the call-off is still recorded.',
      '<b>Caregiver No Show</b>: they didn\'t come. Opens a call-off case, and a card asks you to confirm the no-call/no-show (it is never logged by itself, because it starts a termination review).',
      '<b>Office Changed Caregiver</b>: we moved people. Never a call-off and never on attendance. If the visit is left with nobody, it shows as an open-shift card.',
      '<b>Client Cancelled Shift</b>: the client cancelled, for any reason (unavailable, in the hospital). Put the visit on "Canceled Shift". It is not an open shift, Cara texts nobody, and any call-off case for it closes as cancelled.',
      '<b>Office Unable to Staff</b>: we couldn\'t find anyone. Put the visit on "Canceled Shift". Cara makes an urgent "call the family" card for a person.',
      '<b>Client Added or Changed Visit</b>: a new visit the client asked for, or a new day or time. If nobody is on it, it shows as an open-shift card.',
      '<b>Office Entry Error</b>: we entered the schedule wrong. Documentation Update, the EVV Corrections and "Booked by family in app" are for records and timekeeping only.',
      'A reason Cara doesn\'t know yet gets one card asking what it means. A cancel reason with a caregiver still on the visit gets one card asking which is right.',
    ], 'Whatever the reason: a visit on "Canceled Shift" is cancelled and is never a caregiver, a cover or a missed clock-in. A visit deleted in AxisCare counts as cancelled only with a cancel reason; otherwise a person is asked. What each reason means: Settings, Callout texts, What AxisCare reasons mean.')
    + steps('⏰ Someone hasn\'t clocked in', false, [
      'About ' + esc(grace) + ' minutes after a shift starts with no clock-in, Cara opens it on <b>Missed clock-ins & outs</b>.' + chip(on('timekeeper_watch_live'), 'watching', 'not watching'),
      'When caregiver texts are on, the caregiver gets one text asking them to clock in.' + chip(on('timekeeper_text_live'), 'texts on', 'texts off'),
      'Call the caregiver from the office line. If they\'re on the way, there is nothing else to do: it clears itself when the clock-in lands.',
      'If they can\'t make it, press <b>If they cannot work, open a coverage case</b>, then follow the call-off steps.',
      'After a shift ends with no clock-out, the caregiver gets one reminder text to clock out. If it still doesn\'t land, a Call card opens to confirm the times with the client (below).',
    ], 'The minutes and the wording are in Settings, Missed clock-ins and Missed clock-outs. Visits on "Canceled Shift" are never treated as a missed clock-in.')
    + steps('📣 Regular open hours: ask the whole team', false, [
      'Go to <b>Scheduling, Caregiver Matching</b>, press <b>New care team plan</b> and pick <b>Open hours, no client yet</b>. Type the town, pick the days, and pick <b>Two halves</b> or <b>One day shift</b>.',
      'On the plan, press <b>See the text and who gets it</b>. Check the words and the head count.' + chip(on('open_hours_live'), 'texting on', 'texting off'),
      'Press <b>Text</b> (9am to 6pm only). Everyone eligible gets it, 20 at a time, and nobody twice.',
      'Answers sort themselves into green (yes, with their days), yellow (questions) and red (no).' + chip(on('open_hours_ai_live'), 'AI sorting on', 'AI sorting off'),
      'Text the yellow ones back from the office line, then press <b>Answered: Yes</b> or <b>No</b>.',
      'Green names show on each square they said yes to. Click one to pencil them in. When every square is confirmed, <b>Plan complete</b> puts the schedules into AxisCare after a preview.',
    ])
    + steps('🧩 Building a new client\'s team', false, [
      'Caregiver Matching, <b>New care team plan</b>, pick <b>A client</b>. Choose the days and the shifts.',
      'Click a square to pencil someone in. <b>💬 Text</b> asks them (the same checks as Cara: never someone on No shift texts or that client\'s Do Not Return list), or mark <b>Asked by phone</b>.' + chip(on('team_ask_live'), 'texting on', 'texting off'),
      'Mark yes, maybe or no as answers come in. The board counts what is confirmed.',
      'Use <b>Link to a Journey</b> once the client is in the Hub.',
      '<b>Plan complete</b> shows a preview, then puts the schedules into AxisCare. It can be undone the same day.',
    ])
    + steps('🧾 A missing clock-in or clock-out', false, [
      'The Hub opens a card in <b>Needs Attention</b>: <b>Call Ruth to confirm Maria\'s times</b>. It comes 30 minutes after a shift ends with no clock-out, when a shift ends with no clock-in, and overnight for anything from yesterday.',
      'Tap <b>Call</b> and ask what time the caregiver got there and left. Let them tell you the times.',
      '<b>Record the call</b> on the card, correct the visit in AxisCare, then tick <b>Fixed in AxisCare</b>. We no longer use the EVV correction form.',
    ])
    + steps('🗓️ Changing one visit', false, [
      'Open the visit in <b>AxisCare</b> and change the caregiver, or the time or day.',
      'Pick the reason AxisCare keeps with it: a new caregiver is <b>Office Changed Caregiver</b>, a new day or time is <b>Client Added or Changed Visit</b>. Taking someone off: choose <b>Caregiver Called Off</b> (on their attendance) or <b>Office Changed Caregiver</b> (never on attendance).',
    ]);
  }

  function texts() {
    const st = S();
    const T = [
      ['Asking about a shift, someone who has worked with this client', 'coverage_msg_tier1', "Hi {first_name}, can you cover {client} {when}? It's Caring Companions. Reply YES or NO.", 'coverage_send_live'],
      ['Asking about a shift today, everyone else', 'coverage_msg_other_sameday', "Hi {first_name}, it's Caring Companions. Last-minute fill-in for {client} at {address}: {when}. {care}Can you take it? Reply YES or NO. Questions welcome.", 'coverage_send_live'],
      ['Asking about a shift on a later day, everyone else', 'coverage_msg_other_advance', "Hi {first_name}, it's Caring Companions. We have an open shift for {client} at {address}: {when}. {care}Can you take it? Reply YES or NO. Questions welcome.", 'coverage_send_live'],
      ['Asking the PRN CNA Team', 'coverage_msg_prn', ph('set_cov_prn'), 'coverage_send_live'],
      ['You\'re confirmed (the person picked)', 'coverage_msg_confirmed', ph('set_cov_confirmed'), 'coverage_send_live'],
      ['The shift is covered (others who said yes)', 'coverage_msg_covered', ph('set_cov_covered'), 'coverage_send_live'],
      ['Open hours, to the whole team', 'open_hours_msg', ph('set_oh_msg'), 'open_hours_live'],
      ['Open hours, thank-you to a Yes', 'open_hours_ack_msg', ph('set_oh_ack'), 'open_hours_ack_live'],
      ['Team Builder, asking one caregiver', 'team_ask_msg', "Hi {first_name}, it's Caring Companions. We're building a care team for {client}, a new client{where}: {when}{start}. {care}Would you be interested in these hours? Nothing is set yet - reply YES if you'd like to be considered, or NO. Questions welcome.", 'team_ask_live'],
      ['No clock-in yet', 'timekeeper_msg', ph('set_tk_msg'), 'timekeeper_text_live'],
      ['No clock-out yet', 'timekeeper_msg_out', ph('set_tko_msg'), 'timekeeper_text_live'],
      ['Availability link', 'coverage_msg_avail_invite', ph('set_cov_avail_invite'), null],
      ['30-day availability text (on file)', 'avail_checkin_msg_on_file', ph('set_avail_ck_on'), 'avail_checkin_live'],
      ['30-day availability text (nothing on file)', 'avail_checkin_msg_none', ph('set_avail_ck_none'), 'avail_checkin_live'],
      ['To the family: a different caregiver is coming', 'circle_msg_caregiver_change', ph('set_cov_circle_change'), 'family_caregiver_change_text_approved'],
    ];
    return '<div class="card" style="padding:12px 16px;margin:0 0 10px;"><div style="font-weight:800;color:var(--navy);font-size:15px;">💬 The texts, word for word</div>'
      + '<div class="field-note" style="font-size:12px;margin:2px 0 8px;">What goes out today, read from Settings. The words in {curly brackets} are filled in for each person. Change them in Settings, Callout texts (clock-in texts: Missed clock-ins).</div>'
      + T.map(([label, key, def, sw]) => {
        const custom = String(st[key] || '').trim(), words = custom || def;
        return '<div style="padding:7px 0;border-top:1px solid var(--border);">'
          + '<div style="font-size:12.5px;font-weight:800;color:var(--navy);">' + esc(label) + (sw ? chip(on(sw), 'going out', 'not going out') : '') + (custom ? '<span class="field-note" style="font-size:11px;margin-left:6px;">your own words</span>' : '') + '</div>'
          + '<div style="font-size:13px;margin-top:2px;background:#F8FAFC;border-radius:8px;padding:6px 9px;">' + (words ? esc(words) : '<span class="field-note">(the standard wording)</span>') + '</div></div>';
      }).join('') + '</div>';
  }

  function cara() {
    const row = (txt, k) => '<li style="margin:3px 0;">' + txt + (k ? chip(on(k)) : '') + '</li>';
    return '<div class="card" style="padding:12px 16px;margin:0 0 10px;"><div style="font-weight:800;color:var(--navy);font-size:15px;">🤖 What Cara does on her own, and what she never does</div>'
      + '<div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:6px;">'
      + '<div style="flex:1 1 300px;"><div style="font-weight:700;font-size:13px;color:var(--green);">On her own</div><ul style="margin:4px 0 0 18px;padding:0;font-size:13px;line-height:1.5;">'
      + row('Watches AxisCare every 5 minutes for a shift taken off with "Caregiver Called Off" or "Caregiver No Show", and opens the case', 'coverage_watch_live')
      + row('Reads every AxisCare reason by its id, so a renamed reason keeps its meaning', 'visit_reasons_live')
      + row('Records a call-off even when the office swapped straight to the replacement, and takes it back off if the reason is changed', 'visit_reasons_live')
      + row('Closes a call-off case as cancelled when the visit is cancelled in AxisCare, with no texts', 'visit_reasons_live')
      + row('Makes a "call the family" card for a visit we couldn\'t staff', 'visit_reasons_live')
      + row('Asks in waves on a case a coordinator handed her (Let Cara run it), and stops at the first full-shift yes', 'cara_run_live')
      + row('Finds schedules with several open dates every hour, and lists them on Ongoing shifts', 'coverage_watch_live')
      + row('Reminds the admins until someone has a call-in', 'callin_reminders_live')
      + row('Watches clock-ins and clock-outs', 'timekeeper_watch_live')
      + row('Texts a caregiver who hasn\'t clocked in or out', 'timekeeper_text_live')
      + row('Reads the answers to an open-hours text and sorts them', 'open_hours_ai_live')
      + row('Thanks a caregiver who says yes to open hours', 'open_hours_ack_live')
      + row('Ranks who to ask, and has the list ready', null)
      + '</ul></div><div style="flex:1 1 300px;"><div style="font-weight:700;font-size:13px;color:var(--red);">Never</div><ul style="margin:4px 0 0 18px;padding:0;font-size:13px;line-height:1.5;">'
      + row('Texts a caregiver about a shift unless a person picked them, or handed the case to her (Let Cara run it)')
      + row('Counts an office caregiver change as a call-off, or "Canceled Shift" as a caregiver or a cover')
      + row('Calls or texts a family about a visit we couldn\'t staff (a person calls)')
      + row('Puts anyone on a visit in AxisCare unless a person confirmed them')
      + row('Texts anyone on No shift texts, or on that client\'s Do Not Return list')
      + row('Texts caregivers about shifts between 9pm and 8am, unless the shift starts within 3 hours')
      + row('Sends an open-hours text outside 9am to 6pm')
      + '</ul></div></div></div>';
  }

  function render() {
    const box = document.getElementById('sgBody'); if (!box) return;
    box.innerHTML = '<div class="card" style="padding:12px 16px;margin:0 0 10px;"><div style="font-weight:800;color:var(--navy);font-size:15px;">🧭 Which tab handles which problem</div>'
      + '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:6px;">'
      + WHERE.map(([p, w, d]) => '<tr><td style="padding:6px 8px 6px 0;border-top:1px solid var(--border);font-weight:700;color:var(--navy);width:32%;">' + esc(p) + '</td><td style="padding:6px 8px;border-top:1px solid var(--border);width:28%;">' + w + '</td><td style="padding:6px 0;border-top:1px solid var(--border);color:var(--text-muted);">' + esc(d) + '</td></tr>').join('')
      + '</table></div>'
      + '<div style="font-weight:800;color:var(--navy);font-size:16px;margin:16px 0 8px;">Step by step</div>' + guides()
      + '<div style="margin-top:16px;"></div>' + texts() + cara()
      + '<div class="field-note" style="font-size:12px;margin-top:8px;">Every On and Off on this page is read from the Hub\'s settings right now. The switches are on the Owners Hub Admin page.</div>';
  }
  window.SG = { render };
})();
