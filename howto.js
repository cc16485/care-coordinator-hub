/* =============================================================================
   HOW-TO FOR CARE COORDINATORS (2026-11-13; her ask: "build out a very clear how to for telling care coordinators what
   to do - maybe best to put them all in their own tab and sub tabs in the operations board")
   One pill, "How-to", on the Operations Board row (Today). Inside it, seven sub tabs: Your day, New families,
   Scheduling, Clients, Caregivers, When something goes wrong, Programs. Each sub tab is a short list of cards: when
   it happens, the steps with the Hub's own button names, our rules, and what done looks like.
   It is NOT a second procedure library. The written procedures stay in SOPs > Procedures (app_data sop_library, the
   owner publishes them); each sub tab lists the published ones for its moment and opens them there. The full
   scheduling guide stays on Scheduling > How scheduling works; the payor steps stay on SOPs > Payors & Programs.
   Reads only; nothing here sends or saves. The rules quoted are hers (dates in the comments beside each).
   ============================================================================= */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const go = (tab, label) => '<a href="javascript:void(0)" onclick="switchTab(\'' + tab + '\')" style="font-weight:700;color:var(--teal);">' + label + '</a>';
  const cov = (sub, label) => '<a href="javascript:void(0)" onclick="schedGo(\'coverage\');covSubGo(\'' + sub + '\')" style="font-weight:700;color:var(--teal);">' + label + '</a>';
  const b = (s) => '<b>' + s + '</b>';

  const VIEWS = [
    ['day', 'Your day'], ['families', 'New families'], ['scheduling', 'Scheduling'], ['clients', 'Clients'],
    ['caregivers', 'Caregivers'], ['wrong', 'When something goes wrong'], ['programs', 'Programs'],
  ];
  /* sub tab -> the SOP Library moments whose published procedures are listed under it */
  const MOMENTS = { day: ['office'], families: ['lead', 'assess'], scheduling: [], clients: ['ongoing', 'ending'], caregivers: ['caregivers'], wrong: ['wrong'], programs: [] };

  const LEAD = {
    day: 'Start on the Operations Board and work it top to bottom. Care or safety comes first. If something needs a person, it is on the board.',
    families: 'From the first call to the first shift. Sound like us: warm, local and helpful. Never promise what we do not control, such as a start date or a certain caregiver.',
    scheduling: 'The short version. The full guide, with the exact texts caregivers get, is on ' + go('schedguide', 'Scheduling: How scheduling works') + '.',
    clients: 'Keeping every client well looked after between visits. Families should trust Caring Companions, not one caregiver.',
    caregivers: 'From applicant to working caregiver, and looking after the ones we have.',
    wrong: 'Safety first, then tell the right people, then write it down the same day.',
    programs: 'Knowing who pays is your job. You help each family sign up for the right program.',
  };

  /* Each card: t title, when, steps[], rules[] (ours), done */
  const CARDS = {
    day: [
      { t: 'When your shift starts', when: 'First thing, before anything else.', steps: [
          'Open ' + go('mywork', 'Today: Operations Board') + '.',
          'Read the handoff from the last shift at the top and tap ' + b('Got it') + '.',
          'Look at ' + b('Open shifts, next 7 days') + '. Anything in the next two days comes first.',
          'Work the lanes in this order: ' + b('Care today') + ', then ' + b('Waiting on us') + ', then ' + b('Batches') + '.',
          'Open ' + go('callfollowups', 'Conversations: AI call reader') + ' and ' + go('inbox', 'Inbox') + ' for anything that came in overnight.' ],
        done: 'Nothing is left in Care today, and everyone in Waiting on us has heard from us or has a day we will call.' },
      { t: 'Working a card', when: 'Every card on the board.', steps: [
          'Each card has one button that says what to do: ' + b('Call back') + ', ' + b('Find cover') + ', ' + b('Confirm times') + ', ' + b('Read the note') + ', ' + b('Countersign') + ', ' + b('Fix the send') + ' and so on. Press it and do that one thing.',
          'When it is finished, press ' + b('Done') + '.',
          'It is nobody\'s yet and you can do it: press ' + b('Take it') + '.',
          'It cannot be done today: press ' + b('Later this week') + ' so it comes back.',
          'You are stuck: press ' + b('Ask for help') + ' on the card. The person you ask sees it on their board.',
          'You need to talk it through: write in the card\'s conversation. ' + b('Ask') + ' a question, ' + b('Assign') + ' a step, or ' + b('Pin as the decision') + '.' ],
        rules: [ 'One owner per card. If it is not yours, hand it to the person who owns that part of the work. Do not leave it sitting.',
                 'Thanks or praise for a caregiver or the office goes in the Kind Words jar, not on a work card.' ],
        done: 'The card is closed, or it has an owner and a day.' },
      { t: 'Calls and texts to answer', when: 'A missed call, a voicemail or a text that needs a person.', steps: [
          'They are in the ' + b('Waiting on us') + ' lane, and on ' + b('Follow-ups') + '.',
          'Press ' + b('Call or text') + ' and answer them.',
          'A new family: press ' + b('Make this a lead') + '. A wrong number or a sales call: ' + b('Not for us') + '.',
          'Press ' + b('Done') + ' when they have their answer.' ],
        rules: [ 'Call from the office line with the Hub\'s Call buttons, not from your own cell.',
                 'Following up with a family is your call. The Hub sends one "we got your message" note by itself and nothing after that.' ],
        done: 'Nobody is waiting on us without knowing when they will hear back.' },
      { t: 'Something comes up that is not on the board', when: 'A phone call, a walk-in, something a caregiver tells you.', steps: [
          'A new family asking about care: press ' + b('＋ Add Lead') + ' at the top of any page.',
          'A worry about a client or their care: press ' + b('＋ Report a concern') + ' at the top of any page. It asks four questions and puts it on the right person\'s list.',
          'Anything else that needs doing: press ' + b('＋ Work') + ' at the top, say who it is about, and give it an owner and a day.' ],
        done: 'It is written down where the next person will see it.' },
      { t: 'When your shift ends', when: 'Before you leave.', steps: [
          'Press ' + b('End my shift') + ' at the top of any page.',
          'Write what is still open and what the next person must know.',
          'Press ' + b('Post my handoff') + '.' ],
        done: 'The next person can pick up without calling you.' },
      { t: 'Every week', when: 'Mondays, and before the team meeting.', steps: [
          'Monday: open ' + cov('hours', 'Cara: Hours & matching') + '. Text the availability link to any caregiver whose availability is missing.',
          'Look at ' + b('Older than a week') + ' at the bottom of the board and clear it.',
          'Before the meeting: ' + go('teammeetings', 'Team Meetings') + ' lists everything flagged to talk about.' ] },
    ],

    families: [
      { t: 'The first call', when: 'A family calls, texts, or sends a form.', steps: [
          'Press ' + b('＋ Add Lead') + ' at the top of any page. The call screen walks you through the call.',
          'Get a phone number or an email. A lead cannot be saved without one.',
          'Listen first. Then ask the five program questions: a veteran or the spouse of one? A long-term care insurance policy? Dementia, with traditional Medicare? On Medicaid? If none of those, it is private pay.',
          'On Medicaid: tell them about our sister company, Caring Companions Consumer Directed Services, 417-218-2888, caringcds.com.',
          'Press ' + b('Fill from the call') + ' if the call was recorded, check what it filled in, then ' + b('Save lead') + '.',
          'Before you hang up, agree on the next step and press ' + b('Set follow-up') + ' or ' + b('Schedule assessment') + '.' ],
        rules: [ 'Warm, local, confident and helpful. Not salesy.',
                 'Never promise a start date, a certain caregiver, or how fast a program will approve them.',
                 'Minimum hours questions: point them to the client app. App visits depend on a caregiver being free, so they are never promised.' ],
        done: 'The lead is saved with who pays, and it has a follow-up day or an assessment booked.' },
      { t: 'Following up', when: 'A lead who has not decided.', steps: [
          'Open ' + go('leadsstarts', 'Leads: Leads board') + '. Work ' + b('Need you now') + ' first, then ' + b('Scheduled') + '. ' + b('Waiting') + ' is waiting on them.',
          'Press ' + b('Call') + ' or ' + b('Text back') + '. After a call, press ' + b('Log call') + ' and write what they said.',
          'Set the next ' + b('Set follow-up') + ' day before you leave the lead.' ],
        rules: [ 'There are no automatic day 1 or day 3 texts. Every family is different, so you decide when to reach out.',
                 'Say "I promised I would call," not "you asked us to."' ],
        done: 'Every open lead has a next day on it.' },
      { t: 'Booking the assessment', when: 'They want us to come out.', steps: [
          'The five program questions must be answered first. They show red on the lead until they are.',
          'Press ' + b('Schedule assessment') + ' on the lead, or ' + b('Book the assessment visit') + ' on their profile.',
          'Pick the folder for their level from ' + go('docfolders', 'SOPs: Client Folders') + ' and put it together before you go.' ],
        done: 'The visit is on the calendar and the folder is ready.' },
      { t: 'The home visit', when: 'The day of the assessment.', steps: [
          'Open the lead and press ' + b('Start the visit') + '.',
          'Go through the care needs with the client and family. Confirm who pays.',
          'The Client Care Agreement is signed on the tablet at the visit. A family member who is not there can sign from home with a 6-digit code. The code can be sent at any hour, because they asked for it.',
          'Press ' + b('Finish the visit') + '.' ],
        rules: [ 'The assessment sets the care plan. Do not promise hours or a schedule before it.' ],
        done: 'The visit is finished in the Hub and the agreement is signed or on its way.' },
      { t: 'They said yes', when: 'The family wants to start.', steps: [
          'Press ' + b('They said yes') + ' on the lead.',
          'They move to ' + go('soc', 'Client Care: Getting ready, Before staffing') + '. Finish each step listed there.',
          'Find caregivers on ' + go('teambuilder', 'Scheduling: Caregiver Matching') + '. Press ' + b('Ask the whole team') + ', then pencil in the green names.',
          'Call the family with who is coming and when.' ],
        rules: [ 'Introduce the team, not one person. On low-hour clients never promise the same caregiver every time.' ],
        done: 'Every Before staffing step is done and the first shift is on the schedule.' },
      { t: 'The first shift, and the days after', when: 'A new client\'s first week.', steps: [
          'Watch ' + go('clientqueue', 'Client Care: Getting ready, First shift') + ' on the day.',
          'Call the family 1 to 3 days after the first shift. It shows on the board as a first shift follow-up.',
          'When ' + go('carematch', 'Scheduling: Care Match Check-ins') + ' shows a check-in due, call both the family and the caregiver and press ' + b('Log check-in') + '.' ],
        done: 'The first shift happened, the family has been called, and the check-in is logged.' },
    ],

    scheduling: [
      { t: 'A caregiver calls off', when: 'Any time a caregiver cannot work a shift.', steps: [
          'Open ' + cov('calloffs', 'Cara: Call-offs & open shifts') + ' and press ' + b('Open a coverage case') + '.',
          'Press ' + b('Send Cara\'s list') + '. Cara texts the caregivers who fit.',
          'Confirm the best yes on the board, then tell the client who is coming.',
          'Nobody yet: press ' + b('Ask the whole team') + ' or ' + b('Ask caregivers') + '.',
          'Still nobody: the PRN team first. After that, the coordinator on duty covers it in person. Tell an owner.' ],
        rules: [ 'Never ask a caregiver to cover a shift when AxisCare shows them working or scheduled at that time. The Hub blocks it. Do not go around it by hand.',
                 'Taking a caregiver off a shift is not a call-off. The client may have cancelled, or time off was approved. Pick the right reason in AxisCare.',
                 'A caregiver with no availability on file is unknown, not free. Ask them.' ],
        done: 'The shift has a caregiver, the client knows, and AxisCare is right.' },
      { t: 'Nobody clocked in, or out', when: 'A shift started and there is no clock-in.', steps: [
          'Open ' + cov('clockins', 'Cara: Missed clock-ins & outs') + '.',
          'Call the caregiver from the office line.',
          'They cannot work: open a coverage case, the same as a call-off.',
          'The visit happened but the times are missing: call the client to confirm the times on the card, then fix the visit in AxisCare.' ],
        done: 'The visit has real times, or it has cover.' },
      { t: 'A visit needs to change', when: 'A different day, time or caregiver.', steps: [
          'Ask the client or family first. Many changes need their yes.',
          'Then change the visit in AxisCare.',
          'Then confirm with the caregiver.' ],
        done: 'The client agreed, AxisCare shows it, and the caregiver knows.' },
      { t: 'A new client, or regular hours to fill', when: 'A new start, or a regular shift with nobody on it.', steps: [
          'Open ' + go('teambuilder', 'Scheduling: Caregiver Matching') + '.',
          'Press ' + b('Ask the whole team') + '. Pencil in the green names.',
          'A regular shift that lost its caregiver is on ' + cov('ongoing', 'Cara: Ongoing shifts') + '. Ask who wants it the same way.' ],
        done: 'Every regular shift has a name on it.' },
      { t: 'Everything else in scheduling', when: 'Which AxisCare reason to pick, cancelled visits, the exact texts, what Cara does by herself.', steps: [
          'It is all on ' + go('schedguide', 'Scheduling: How scheduling works') + '.' ] },
    ],

    clients: [
      { t: 'Check-ins and plan reviews', when: 'Every week.', steps: [
          'Open ' + go('clientsboard', 'Client Care: Clients') + '.',
          'Press ' + b('Due this week') + '. Then ' + b('Check-ins') + ' and ' + b('Plan reviews') + ' to see each list.',
          'Call the client or family, ask how care is going, and log it on the client.',
          'A worry they raise: write it down on the check-in, and press ' + b('＋ Report a concern') + ' at the top of the page if someone needs to act.' ],
        done: 'Nothing is left in Due this week.' },
      { t: 'A client needs something', when: 'A family request, a concern, or a check-in that raised one.', steps: [
          'On ' + go('clientsboard', 'Clients') + ', press ' + b('Needs something') + ', ' + b('Concerns') + ' and ' + b('Family requests') + '.',
          'Open the client, read what was asked, and call them back.',
          'Write what you did on the client so the next person sees it.' ],
        done: 'The family has an answer and the client\'s history shows it.' },
      { t: 'Family Circles and feedback', when: 'The board shows "Family Circles need a look" or new feedback.', steps: [
          'Press ' + b('Open Family Circles') + ' or ' + b('Open Feedback') + ' on the board row.',
          'Read each one. Answer the family, or pass praise to the Kind Words jar.',
          'A happy family: on ' + go('feedback', 'Referrals & Marketing: Feedback') + ' press ' + b('Copy message') + ', send it from the office line, then press ' + b('I asked') + '.' ],
        done: 'The board row is gone.' },
      { t: 'Pausing or ending care', when: 'A hospital stay, a move, or the family stops care.', steps: [
          'Open the client and press ' + b('Pause care') + ' or ' + b('End care') + '. ' + b('Resume care') + ' brings them back.',
          'Follow the written procedure under Ending care below. If none is listed, ask an owner before you promise the family anything.',
          'Take their visits off the schedule in AxisCare with the right reason.' ],
        done: 'The Hub and AxisCare both show the same thing, and the family knows what happens next.' },
    ],

    caregivers: [
      { t: 'A new applicant', when: 'Someone applies.', steps: [
          'Open ' + go('applicants', 'Recruit & Onboard: Applicants') + '.',
          'New caregivers must be 21 or older.',
          'Book the interview. Interviews are in person at our office.',
          go('apjourney', 'Applicant journey') + ' shows every message and screen an applicant gets, so you know what they have already been told.' ],
        rules: [ 'Say "interview" and "background checks." Keep it simple.',
                 'Never talk about pay on the screens that ask about their experience.' ],
        done: 'The applicant has an interview time, or a clear no.' },
      { t: 'Interview, offer and checks', when: 'After they apply.', steps: [
          'The row runs left to right: ' + go('interviews', 'Interviews') + ', ' + go('offers', 'Offers') + ', ' + go('cgbackground', 'Onboarding') + ', ' + go('orientprog', 'Orientation') + '.',
          'After the interview, record how it went and make the offer on Offers.',
          'Run the background checks from Onboarding. Anyone in the office can show an applicant\'s Social Security number or birth date when a check needs it. Every time is logged.',
          'Office steps that are waiting show on the board under ' + b('Hiring steps waiting on the office') + '. Press ' + b('Countersign') + ' or ' + b('Next step') + '.' ],
        done: 'Every check is back clear and every office step is signed.' },
      { t: 'Orientation and training', when: 'Before their first shift.', steps: [
          'Only the 2-hour Agency Orientation is required.',
          'Other courses are optional. Send the ones that fit the client they will care for, from ' + go('cgtraining', 'Caregivers: Orientation & Training') + '.' ],
        done: 'Orientation is finished and shows on their record.' },
      { t: 'A concern about a caregiver', when: 'Lateness, a complaint, something a client said.', steps: [
          'Open ' + go('hr', 'HR') + ' and press ' + b('+ New coaching talk') + '. Write what happened and what you agreed.',
          'A write-up needs an owner\'s approval. You write it; an owner approves it.',
          'Hurt at work: press ' + b('+ New work injury report') + ' the same day.' ],
        done: 'It is written down and the caregiver knows where they stand.' },
      { t: 'Praise for a caregiver', when: 'A family or a teammate says something kind.', steps: [
          'Put it in the Kind Words jar. It is never a work card.' ] },
    ],

    wrong: [
      /* 2026-11-13: these four follow her published procedures (SOPs > Procedures, reviewed 2026-10-18) word for word on
         what to press and who to tell. My first wording had "+ New incident report", "tell an owner" and the wrong
         hotline hours; the published ones use Report a concern and name the hours as 7 am to 8 pm. */
      { t: 'A fall, an injury or a hospital trip', when: 'A caregiver, the client or the family tells us the client fell, got hurt, went to the ER or was admitted. Every fall counts, even if they say they are fine.', steps: [
          'If a caregiver is calling from the home, remind them: never lift the client. Check them, keep them comfortable on the floor, and call 911 if they are hurt.',
          'If the client hit their head, is in severe pain, has an injury, or cannot get up on their own, make sure 911 has been called.',
          'Press ' + b('＋ Report a concern') + ' and pick ' + b('Fall, injury or hospitalisation') + '. Fill in what happened, when, any injuries, which hospital, who was there, and whether the family has been told. This alerts the person in charge.',
          'Call the family. Share details only with people marked in AxisCare as allowed to hear about the client\'s care.',
          'In the hospital: press ' + b('Pause care') + ' on their profile, take their upcoming visits off in AxisCare and tell their caregivers.',
          'Before care restarts, review the care plan with the family. When they are home, press ' + b('Resume care') + ' and put their visits back in AxisCare.' ],
        rules: [ 'Caregivers never lift a fallen client, even if asked.',
                 'The office line reaches us after hours.' ],
        done: 'The client is safe, the concern is reported in the Hub, the family knows, and the schedule matches where the client really is.' },
      { t: 'A complaint', when: 'A client or family member tells us they are unhappy with our care, a caregiver, the schedule, billing or how we treated them. It counts however it reaches us.', steps: [
          'Listen. Thank them for telling us. Do not argue or explain it away. Write down their own words and ask what they would like to happen.',
          'If what they describe could be abuse, neglect or exploitation, it is not a complaint. Follow the card below and report it first.',
          'Press ' + b('＋ Report a concern') + '. Pick ' + b('Grievance') + ' if they are unhappy with our services overall, or ' + b('Family complaint about a caregiver') + ' if it is about one caregiver.',
          'Tell the person in charge the same day. They decide what we do.',
          'Look into it: talk to the caregiver, and check the visits and shift notes in AxisCare.',
          'Fix what we can. A refund, a credit or ending service is a leadership decision.',
          'Nothing about their care changes because they complained. Tell them so.',
          'Follow up within 14 days to check it stayed fixed, then close the card.' ],
        done: 'The family has their answer, it stayed fixed, and the card is closed.' },
      { t: 'You suspect abuse, neglect or someone taking advantage', when: 'You see, hear or are told something that makes you suspect a client is being hurt, neglected, bullied or taken advantage of.', steps: [
          'If the client is in danger right now, call 911 first.',
          'Report it yourself, right away, to the Missouri Adult Abuse and Neglect Hotline: 800-392-0210, 7 am to 8 pm every day. Any other time, report online at moapss.health.mo.gov.',
          'Write down when you reported, how, who you spoke with and any reference number.',
          'In the Hub, press ' + b('＋ Report a concern') + ' and pick ' + b('Possible abuse, neglect or exploitation') + '. This alerts the person in charge.',
          'Do not question the client or the person suspected, and do not tell the person suspected that a report was made.',
          'Keep the client\'s care going.' ],
        rules: [ 'Never wait for anyone\'s OK to report, and do not wait until you are sure.' ],
        done: 'The hotline has the report, it is recorded in the Hub, and the person in charge knows.' },
      { t: 'After hours', when: 'Nights, weekends and holidays.', steps: [
          'The steps and who to call are in the After-Hours Escalation Protocol on ' + go('sops', 'SOPs: Procedures') + '.',
          'Leave a handoff with ' + b('End my shift') + ' so the morning starts with what happened.' ] },
      { t: 'A text or an email did not go out', when: 'The board shows "Texts or emails that didn\'t go out".', steps: [
          'Open the row and press ' + b('Fix the send') + '.',
          'It is usually a wrong number or an address with a typo. Correct it on the person and send again, or call them.' ],
        done: 'The person got the message another way, or the row is closed.' },
    ],

    programs: [
      { t: 'Who pays? Ask on every first call', when: 'Every new family.', steps: [
          b('A veteran, or the spouse of one') + ': VA Community Care, or Aid and Attendance.',
          b('A long-term care insurance policy') + ': the policy may pay us or pay them back.',
          b('Dementia, with traditional Medicare') + ': the Medicare GUIDE program.',
          b('On Medicaid') + ': our sister company, Caring Companions Consumer Directed Services, 417-218-2888, caringcds.com.',
          b('None of those') + ': private pay.' ],
        done: 'The Payer tab on the lead is answered before the assessment.' },
      { t: 'Getting a family started in each program', when: 'Once you know who pays.', steps: [
          'Open ' + go('sopref', 'SOPs: Payors & Programs') + '. Each program has its own numbered "Getting a family started" steps.',
          'For a veteran, the call screen has a VA paperwork card that walks you through it.',
          'Folders and printed pieces for each care level are on ' + go('docfolders', 'SOPs: Client Folders') + '.',
          'Forms are on ' + go('docs', 'SOPs: Forms & Templates') + '.' ],
        rules: [ 'Never promise how fast a program will approve someone. That is not ours to control.',
                 'Referral rewards are for private pay only.' ],
        done: 'The family knows which program they are in and what happens next.' },
    ],
  };

  /* ---- the published written procedures for a sub tab (read from the SOP Library; drafts stay with the owner) ---- */
  function procedures(view) {
    const want = MOMENTS[view] || [];
    if (!want.length) return [];
    const lib = (typeof DATA !== 'undefined' && DATA && Array.isArray(DATA.sop_library)) ? DATA.sop_library : [];
    return lib.filter((d) => d && d.status !== 'draft' && want.includes(d.moment) && d.title)
      .sort((x, y) => String(x.title).localeCompare(String(y.title)));
  }
  function openProcedure(id) {
    if (typeof switchTab === 'function') switchTab('sops');
    setTimeout(function () { try { if (typeof sopOpenDoc === 'function') sopOpenDoc(id); } catch (e) { console.error('how-to procedure:', e); } }, 60);
  }

  function cardHtml(c, open) {
    return '<details class="card ht-card" ' + (open ? 'open ' : '') + 'style="padding:12px 16px;margin:0 0 10px;">'
      + '<summary style="cursor:pointer;font-weight:800;color:var(--navy);font-size:15px;">' + esc(c.t) + '</summary>'
      + (c.when ? '<div class="field-note" style="margin:6px 0 0;font-size:12.5px;"><b>When:</b> ' + c.when + '</div>' : '')
      + '<ol style="margin:8px 0 0 18px;padding:0;font-size:13.5px;line-height:1.55;">' + c.steps.map((s) => '<li style="margin:3px 0;">' + s + '</li>').join('') + '</ol>'
      + (c.rules && c.rules.length ? '<div style="margin-top:8px;padding:8px 12px;border-radius:10px;background:#FFF8E6;font-size:13px;line-height:1.5;"><b>Our rules</b><ul style="margin:4px 0 0 18px;padding:0;">'
          + c.rules.map((r) => '<li style="margin:2px 0;">' + r + '</li>').join('') + '</ul></div>' : '')
      + (c.done ? '<div class="field-note" style="margin-top:8px;font-size:12.5px;"><b>Done when:</b> ' + c.done + '</div>' : '')
      + '</details>';
  }

  let view = 'day';
  try { const v = localStorage.getItem('cch_howto_view'); if (v && CARDS[v]) view = v; } catch (e) { /* first visit */ }

  function html() {
    const pills = VIEWS.map(([k, l]) => '<button type="button" class="ht-pill' + (k === view ? ' on' : '') + '" data-ht="' + k + '" onclick="HT.show(\'' + k + '\')" '
      + 'style="border:1.5px solid ' + (k === view ? 'var(--navy)' : '#D8DEE6') + ';background:' + (k === view ? 'var(--navy)' : '#fff') + ';color:' + (k === view ? '#fff' : 'var(--navy)')
      + ';border-radius:999px;padding:7px 14px;font-weight:700;font-size:13px;cursor:pointer;">' + esc(l) + '</button>').join('');
    const procs = procedures(view);
    const procHtml = (MOMENTS[view] || []).length
      ? '<div class="card" style="padding:12px 16px;margin:14px 0 0;"><div style="font-weight:800;color:var(--navy);font-size:14px;">Written procedures for this</div>'
        + (procs.length ? '<ul style="margin:6px 0 0 18px;padding:0;font-size:13.5px;line-height:1.6;">' + procs.map((d) => '<li><a href="javascript:void(0)" onclick="HT.openProcedure(\'' + esc(d.id) + '\')" style="font-weight:700;color:var(--teal);">' + esc(d.title) + '</a></li>').join('') + '</ul>'
                        : '<div class="field-note" style="margin-top:4px;font-size:12.5px;">None published yet. They will show here when an owner publishes them on ' + go('sops', 'SOPs: Procedures') + '.</div>')
        + '</div>' : '';
    return '<div class="card" style="padding:18px;margin-bottom:14px;">'
      + '<div style="font-size:19px;font-weight:800;color:var(--navy);">How-to for care coordinators</div>'
      + '<div class="field-note" style="font-size:13.5px;margin-top:3px;max-width:80ch;">What to do, step by step, with the names of the buttons you press. Pick a tab. Tap a card to open it.</div>'
      + '<div id="htPills" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">' + pills + '</div></div>'
      + '<div class="field-note" style="font-size:14px;margin:0 2px 12px;max-width:85ch;">' + LEAD[view] + '</div>'
      + '<div id="htCards">' + CARDS[view].map((c, i) => cardHtml(c, i === 0)).join('') + '</div>'
      + procHtml;
  }

  function render() {
    const el = document.getElementById('htWrap'); if (!el) return;
    el.innerHTML = html();
  }
  function show(k) {
    if (!CARDS[k]) return;
    view = k;
    try { localStorage.setItem('cch_howto_view', k); } catch (e) { /* private window */ }
    render();
  }

  window.HT = { VIEWS, CARDS, MOMENTS, render, show, procedures, openProcedure, view: () => view };
})();
