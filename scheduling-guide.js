/* =============================================================================
   HOW SCHEDULING WORKS (scheduling review step 5, 2026-10-12; her ask: "need a tab over to the right like we have in
   applicant journey to explain how to use all scheduling tabs")
   One page at the right end of the Scheduling strip: which tab handles which problem, step by step guides, the exact
   texts caregivers get (read from the live settings, so the words never go stale) and what Cara does on her own. It
   replaces the old scheduling-guide.html page. Reads only; nothing here sends or saves.
   2026-10-24 (her ask after the AxisCare reasons were renamed and "reasons by AxisCare id" went on): the call-off steps
   follow the response board and Send Cara's list; a new section on which AxisCare reason to pick and what Cara does with
   it; cancelling a visit; "Let Cara run it"; the Live Schedule asking why.
   2026-11-14 (Simpler Scheduling, her picks): rewritten as one short page for the three tabs (Today, Open shifts, Care
   planning) and the one way to ask (the Ask caregivers panel). The texts and "what Cara does" are one click away.
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
    ['A caregiver calls off', go('coverage', '', 'Today'), 'Press Someone\'s calling off, then ask on the shift.'],
    ['A shift has nobody on it', go('', 'open', 'Open shifts'), 'Open the shift and ask caregivers.'],
    ['A new client, or a care assessment coming up', go('coverage', '', 'Message caregivers (top of Today)'), 'About a new client: ask who wants the hours.'],
    ['Building a client\'s week', go('teambuilder', '', 'Care planning'), 'Pencil people in on the chart.'],
    ['Someone hasn\'t clocked in or out', go('coverage', '', 'Today'), 'It shows as a card at the top. Call them.'],
    ['A finished visit is missing a clock-in or clock-out', go('ops', '', 'Needs Attention'), 'Call the client to confirm the times, then fix it in AxisCare.'],
    ['Who wants more hours?', go('', 'hours', 'Care planning: Hours and matching'), 'Check it on Mondays.'],
    ['A caregiver asked for no shift texts', go('', 'dno', 'Settings: No shift texts'), 'Add them there.'],
  ];

  const steps = (title, open, items, foot) => '<details class="card" ' + (open ? 'open ' : '') + 'style="padding:12px 16px;margin:0 0 10px;">'
    + '<summary style="cursor:pointer;font-weight:800;color:var(--navy);font-size:15px;">' + title + '</summary>'
    + '<ol style="margin:8px 0 0 18px;padding:0;font-size:13.5px;line-height:1.55;">' + items.map((i) => '<li style="margin:3px 0;">' + i + '</li>').join('') + '</ol>'
    + (foot ? '<div class="field-note" style="margin-top:6px;font-size:12px;">' + foot + '</div>' : '') + '</details>';

  function guides() {
    const grace = S().timekeeper_grace_min || 5;
    return steps('📞 A caregiver calls off', true, [
      'Press <b>📞 Someone\'s calling off</b> at the top of Scheduling. If the office takes them off the visit in AxisCare with <b>Caregiver Called Off</b> or <b>Caregiver No Show</b>, Cara opens it for you.',
      'Open the shift. The line at the top says what is happening.',
      'In <b>Ask caregivers</b>, choose <b>Worked with</b> the client, <b>Right level</b> or <b>Whole team</b>. Untick anyone you would rather not ask, then press <b>Text</b>. Cara already left out anyone who can\'t be asked, and says why.',
      'When someone says yes, press <b>Confirm</b>. The Hub puts them on the AxisCare visit and checks it.',
      'If nobody can cover it, press <b>Close uncovered</b> and put the visit on "Canceled Shift" with <b>Office Unable to Staff</b> in AxisCare.',
    ], 'Everything else (follow up, add a bonus, Let Cara run it, the wording) is under <b>More for this shift</b>. Nobody is texted unless a person picked them.')
    + steps('💬 A new client or a care assessment coming up', false, [
      'Press <b>💬 Message caregivers</b> at the top of Scheduling, then <b>About a new client</b>.',
      'Pick the care assessment, or type the town, days and hours. The client\'s name is never in the text.',
      'Choose who to ask and press <b>Text</b>. Answers come back on the message.',
    ])
    + steps('🧩 Building a client\'s week', false, [
      'Go to <b>Care planning</b>, press <b>New care plan</b>: who, which town, which days.',
      'Change the shifts right on the chart. Mark what the client needs at the top.',
      'Press <b>Message caregivers about these hours</b> to ask, or click a square to pencil someone in and mark asked, yes, maybe or no.',
      'When every square is confirmed, <b>Plan complete</b> shows the summary and puts the schedules into AxisCare after a preview.',
    ], 'The shortlist, the family\'s preference, the whole-team text and Flag gaps are under <b>More for this plan</b>.')
    + steps('⏰ Someone hasn\'t clocked in or out', false, [
      'About ' + esc(grace) + ' minutes after a shift starts with no clock-in, it shows as a card at the top of <b>Today</b>.' + chip(on('timekeeper_watch_live'), 'watching', 'not watching'),
      'Call the caregiver from the office line. If they\'re on the way, it clears itself when the clock-in lands.',
      'If they can\'t make it, open a coverage case from the card and follow the call-off steps.',
    ])
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
      ['Care planning, asking one caregiver', 'team_ask_msg', "Hi {first_name}, it's Caring Companions. We're building a care team for {client}, a new client{where}: {when}{start}. {care}Would you be interested in these hours? Nothing is set yet - reply YES if you'd like to be considered, or NO. Questions welcome.", 'team_ask_live'],
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
      + row('Finds schedules with several open dates every hour, and lists them on Open shifts', 'coverage_watch_live')
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
      + '<details style="margin-top:16px;"><summary style="cursor:pointer;font-weight:800;color:var(--navy);font-size:15px;">The texts caregivers get, and what Cara does on her own</summary><div style="margin-top:8px;">' + texts() + cara() + '</div></details>'
      + '<div class="field-note" style="font-size:12px;margin-top:8px;">Every On and Off on this page is read from the Hub\'s settings right now. The switches are on the Owners Hub Admin page.</div>';
  }
  window.SG = { render };
})();
