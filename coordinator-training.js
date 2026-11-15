/* =============================================================================
   COORDINATOR TRAINING (2026-11-14; her ask: "write up a full plan for her working M-W in the office to start and her
   training schedule with everything you know from the hubs ... build an entire training program for care coordinators!
   Put it in the hub and make it world class!")
   One pill, "Coordinator Training", on the Operations Board row (Today), beside How-to. Four views inside it:
     This week        the week the new coordinator is in: sessions with their trainer, work on their own, practice drills
     The whole program  every week (nine since 2026-11-15, when How families pay was added)
     Skills           what they must be able to do alone; the trainer or an owner signs each one off
     The plan         office days and hours, the three stages, the trainer; an owner starts and edits it
   It is NOT a second library and it writes no policy of its own:
     · what to read      links to How-to and to the PUBLISHED procedures in SOPs > Procedures (app_data sop_library)
     · practice drills   drawn at the moment of reading from the published procedure itself (its "when", steps, done
                         when, and when to tell the person in charge), so a drill can never say something her procedure
                         does not. A draft or a missing procedure is left out.
     · calls             Calls: Call coaching (call-coach.js) stays the place for best calls, the five beats and reviews
   Saved in app_data call_coaching (already a registered key, so no database step), two rows per person so the new
   coordinator and the trainer never save over each other:
     training:<email>   kind 'training'   the plan (trainer, start day, office days, stages) and what has been ticked
     trainsign:<email>  kind 'trainsign'  skills signed off (by whom, when) and the trainer's notes
   call-coach.js reads only kinds person / best / review, so these rows are invisible to it.
   Nothing here sends anything to anyone. Her fun rules: good news only, never ranking or comparing people.
   ============================================================================= */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'call_coaching';
  const lc = (s) => String(s || '').trim().toLowerCase();
  const say = (m) => { if (typeof ccToast === 'function') ccToast(m); else alert(m); };
  const myEmail = () => lc(typeof ME !== 'undefined' && ME && ME.email);
  const owner = () => { try { return typeof ccIsOwner === 'function' && ccIsOwner(); } catch (e) { return false; } };
  const nameOf = (e) => { try { return (typeof opsOwnerName === 'function' && opsOwnerName(e)) || e; } catch (x) { return e; } };
  const firstName = (s) => String(s || '').trim().split(/[\s@]/)[0] || '';
  const items = () => (typeof DATA !== 'undefined' && DATA && Array.isArray(DATA[KEY])) ? DATA[KEY] : [];
  const lib = () => (typeof DATA !== 'undefined' && DATA && Array.isArray(DATA.sop_library)) ? DATA.sop_library : [];
  const proc = (id) => lib().find((d) => d && d.id === id && d.status !== 'draft' && d.title) || null;

  /* ---- links (the same three kinds the How-to uses, plus a published procedure by id) ---- */
  const go = (tab, label) => '<a href="javascript:void(0)" onclick="switchTab(\'' + tab + '\')" style="font-weight:700;color:var(--teal);">' + label + '</a>';
  const cov = (sub, label) => '<a href="javascript:void(0)" onclick="schedGo(\'coverage\');covSubGo(\'' + sub + '\')" style="font-weight:700;color:var(--teal);">' + label + '</a>';
  const how = (view, label) => '<a href="javascript:void(0)" onclick="CTR.openHowTo(\'' + view + '\')" style="font-weight:700;color:var(--teal);">' + label + '</a>';
  const b = (s) => '<b>' + s + '</b>';
  /** a published procedure, by its id, under its live title; when it is not published the fallback words stay plain text */
  const P = (id, fallback) => {
    const d = proc(id);
    return d ? '<a href="javascript:void(0)" onclick="CTR.openProcedure(\'' + esc(id) + '\')" style="font-weight:700;color:var(--teal);">' + esc(d.title) + '</a>' : esc(fallback);
  };
  const READ = (pairs) => 'Read these procedures: ' + pairs.map((p) => P(p[0], p[1])).join(', ') + '.';
  /* 2026-11-15: a program's own tab on the Payors & Programs page, the GUIDE page, a practice call, the Practice tab */
  const prog = (tab, label) => '<a href="javascript:void(0)" onclick="CTR.openProgram(\'' + tab + '\')" style="font-weight:700;color:var(--teal);">' + label + '</a>';
  const guideL = (anchor, label) => '<a href="javascript:void(0)" onclick="CTR.openGuide(\'' + anchor + '\')" style="font-weight:700;color:var(--teal);">' + label + '</a>';
  const callL = (key, label) => '<a href="javascript:void(0)" onclick="CTP.call(\'' + key + '\')" style="font-weight:700;color:var(--teal);">' + label + '</a>';
  const practiceL = '<a href="javascript:void(0)" onclick="CTR.show(\'practice\')" style="font-weight:700;color:var(--teal);">Practice</a>';

  /* =============================================================================
     THE PROGRAM. Nine weeks. Each week has three sessions; a session is one office day for someone in the office
     three days a week, and the weeks go faster for someone in five. "with" = beside the trainer; "solo" = on your
     own; "drills" = published procedures to practice from; "review" = what the two of you talk through at the end.
     Functions, not strings, so procedure titles are read from the live library each time the page draws.
     ============================================================================= */
  const WEEKS = [
    { k: 'w1', title: 'Welcome, the Hub and how we work',
      goal: 'You can find your way around, you know who decides what, and you know what to do if something serious happens on day one.',
      sessions: [
        { t: 'Getting set up and the Operations Board', withT: () => [
            'Get signed in to the Hub, the office phone line, AxisCare and your email. Your trainer checks each one works.',
            'Tour the top menu of the Hub together, one section at a time, and say what each one is for.',
            'Watch your trainer open the day on ' + go('mywork', 'Today: Operations Board') + ': the handoff, open shifts, then the lanes in order. Care today, then Waiting on us, then Batches.',
            'Learn the three buttons at the top of every page: ' + b('＋ Work') + ', ' + b('＋ Add Lead') + ' and ' + b('＋ Report a concern') + '.' ],
          solo: () => [
            'Read ' + how('day', 'How-to: Your day') + ', all six cards.',
            READ([['sop_decide', 'Who decides what, and who is in charge'], ['sop_open_day', 'Opening the day and running it'], ['sop_privacy', 'Privacy and what we share'], ['sop_phone', 'The office phone line and click-to-call']]),
            'Find the handoff from the last shift at the top of the board and read it.',
            'Write down three questions for your trainer.' ] },
        { t: 'Working a card, and safety from day one', withT: () => [
            'Your trainer reads the board out loud and says why each card is where it is.',
            'Work three simple cards together. Use ' + b('Take it') + ', ' + b('Done') + ', ' + b('Later this week') + ' and ' + b('Ask for help') + ' so you have pressed each one.',
            'Make a call from the office line with a Hub Call button. Call your trainer\'s cell so you hear how it works.',
            'Open ' + b('＋ Report a concern') + ' together and read its four questions. Close it without saving.' ],
          solo: () => [
            'So you know what to do if it happens today, read: ' + P('sop_fall', 'A fall, injury or hospital trip') + ', ' + P('sop_abuse', 'Suspected abuse, neglect or exploitation') + ', ' + P('sop_complaint', 'A client complaint or grievance') + '.',
            READ([['sop_handoff', 'Owning, helping and handing off work'], ['sop_callcards', 'Call Follow Ups cards'], ['sop_send_problem', 'A text or email didn\'t go through']]),
            'Open ' + go('clientsboard', 'Client Care: Clients') + ', pick three clients and read each profile top to bottom.',
            'Press ' + b('End my shift') + ' and post your first handoff. Your trainer reads it tomorrow.' ] },
        { t: 'AxisCare, and the people we work with', withT: () => [
            'This time you read the board out loud and your trainer listens.',
            'AxisCare together: find a client, a caregiver and a visit. See where the Hub shows the same thing.',
            'Sit in on an in-person interview if one is booked. From now on, sit in whenever one is on the calendar.',
            'Meet Kind Words: praise goes in the jar, never on a work card.' ],
          solo: () => [
            READ([['sop_records', 'Keeping records'], ['sop_talk', 'Talk about flags and team meetings'], ['sop_kind', 'Kind words and recognition'], ['sop_supplies', 'Supplies, client folders and Forms & Templates']]),
            'Open ' + go('teammeetings', 'Team Meetings') + ' and read what is flagged to talk about.',
            'Post your handoff with ' + b('End my shift') + '.' ] },
      ],
      drills: ['sop_fall', 'sop_abuse', 'sop_privacy', 'sop_handoff'],
      review: ['Which page of the Hub do you open first, and why?', 'Who is the person in charge today, and where do you look that up?', 'What is still unclear?'] },

    { k: 'w2', title: 'New families: the first call and the Leads board',
      goal: 'You can take a call from a new family, find out who pays, and leave every lead with a next step.',
      sessions: [
        { t: 'Hearing what a good call sounds like', withT: () => [
            'Open ' + go('calls', 'Calls: Call coaching') + ' and listen to two of the best calls together. Talk about the five beats: their story, day to day at home, what help looks like, how it gets paid, the next step.',
            'Watch your trainer take or call back a new family, with the call screen open beside them.',
            'Walk the ' + go('leadsstarts', 'Leads board') + ' together: Need you now, Scheduled, Waiting.',
            'Learn the five program questions and why they come before an assessment.' ],
          solo: () => [
            'Read ' + how('families', 'How-to: New families') + ', the first two cards, and ' + how('programs', 'How-to: Programs') + '.',
            READ([['sop_first_call', 'First call with a new lead'], ['sop_leads_board', 'Working the Leads board and keeping promises'], ['sop_missed_calls', 'Missed calls and calls nobody could match'], ['sop_call_lead', 'Making a lead from a call']]),
            'Listen to the rest of the best calls on Call coaching.',
            'Say the opening line from the first call procedure out loud until it sounds like you.' ] },
        { t: 'Your first calls, with help', withT: () => [
            'Practice at the desk: your trainer plays a daughter calling about her mom, and you take the call. Nothing is saved.',
            'Take your first real new family call with your trainer beside you and the five beats showing.',
            'Make two follow-up calls from the Leads board together. Press ' + b('Log call') + ' and ' + b('Set follow-up') + ' each time.',
            'Find the Rates panel on the call screen. Prices are only ever quoted from there.' ],
          solo: () => [
            READ([['sop_future', 'Families we can\'t serve yet'], ['sop_returning', 'A returning family'], ['sop_guide', 'Medicare GUIDE: screening, assessment and respite'], ['sop_exceptions', 'Exceptions: rates, minimums, area and refunds'], ['sop_referral_credit', 'Client referral credit']]),
            'Open ' + go('sopref', 'SOPs: Payors & Programs') + ' and read "Getting a family started" for private pay and for the VA.',
            'Post your handoff with ' + b('End my shift') + '.' ] },
        { t: 'Taking calls yourself', withT: () => [
            'You take the new family calls today. Your trainer listens and reviews one with you on Call coaching.',
            'Work ' + b('Need you now') + ' on the Leads board yourself. Your trainer checks it at the end.',
            'Talk through referral partners: who sends families to us and how we keep in touch.' ],
          solo: () => [
            READ([['sop_partners', 'Referral partner visits and follow-up']]),
            'Go through every lead that is yours. Each one has a follow-up day or an assessment booked before you leave.',
            'Post your handoff with ' + b('End my shift') + '.' ] },
      ],
      drills: ['sop_first_call', 'sop_missed_calls', 'sop_future', 'sop_guide'],
      review: ['Which of the five beats is hardest for you so far?', 'A caller is on Medicaid. What do you say and where do you send them?', 'What must a lead have before you leave it?'] },

    /* 2026-11-15 (her ask): "I want all coordinators to know all payors and program fully ... the ins and outs of private
       pay, Medicare GUIDE program, VA community care network, Long Term care policies". Taught from the Payors & Programs
       page itself, one day for each. */
    { k: 'wpay', title: 'How families pay: private pay, Medicare GUIDE, VA and long-term care insurance',
      goal: 'From a first call you can tell which programs a family can use, explain each one in your own words, and get a family started in any of them without promising approval, hours or a start date.',
      sessions: [
        { t: 'Private pay, and the five questions', withT: () => [
            'Open ' + prog('all', 'Payors & Programs: Who pays?') + ' together and read "This is your job" and the five questions on every first call.',
            'Walk ' + prog('private', 'Private pay') + ': the three rates, the minimums, the terms, the Best Price Guarantee and the paperwork.',
            'Find where ' + prog('early', 'Early Support Visits') + ' fits: someone in Springfield who needs less than 8 hours a week.',
            'Take a practice call with ' + callL('daughter_falls', 'a worried daughter') + ' while your trainer listens.' ],
          solo: () => [
            'Read ' + prog('private', 'Private pay') + ' and ' + prog('early', 'Early Support Visits') + ' until you can give the rates and terms without looking.',
            READ([['sop_exceptions', 'Exceptions: rates, minimums, area and refunds'], ['sop_billing', 'Rate changes and unpaid balances'], ['sop_referral_credit', 'Client referral credit']]),
            'On ' + practiceL + ', do Private pay: Getting started, steps in order, and What do you do next?' ] },
        { t: 'Medicare GUIDE', withT: () => [
            'Walk ' + prog('guide', 'Medicare GUIDE') + ' together: who qualifies, the 20 respite visits a year, Continuum and Crosby Health.',
            'Open the ' + guideL('screen', 'GUIDE screener') + ' and screen a pretend family together.',
            'Go over the words we never say: "free care" or "you\'re approved". Medicare decides.',
            'Take a practice call with ' + callL('dementia_son', 'a son whose dad has dementia') + '.' ],
          solo: () => [
            READ([['sop_guide', 'Medicare GUIDE: screening, assessment and respite']]),
            'Read the rest of the ' + guideL('', 'GUIDE page') + ', including the Crosby Health steps.',
            'On ' + practiceL + ', do Medicare GUIDE: Getting started, steps in order, and What do you do next?' ] },
        { t: 'VA: Community Care and Aid & Attendance', withT: () => [
            'Walk ' + prog('va', 'VA') + ' together. Start with the two paths: Community Care, where the VA pays us, and Aid & Attendance, where the family pays us.',
            'Go through the Community Care rules: the authorization number, EVV on every visit, no driving, no holiday rate or mileage, and what happens when an authorization ends.',
            'Open a veteran\'s lead and see the VA paperwork card on the call screen.',
            'Take practice calls with ' + callL('veteran_wife', 'a veteran\'s wife') + ' and ' + callL('aa_widow', 'a veteran\'s widow') + '.' ],
          solo: () => [
            'Read ' + prog('va', 'VA') + ' again, all of it, including a family member or friend as the veteran\'s caregiver.',
            'On ' + practiceL + ', do VA Community Care and Aid & Attendance: Getting started, steps in order, and What do you do next?' ] },
        { t: 'Long-term care insurance', withT: () => [
            'Walk ' + prog('ltc', 'Long-term care insurance') + ' together: the benefit trigger, the elimination period, the daily maximum, and the two ways to bill.',
            'Read a sample policy together and find each of those in it.',
            'Talk through the three-way call with the carrier: who has to be on the line, and what you write down.',
            'Take a practice call with ' + callL('ltc_policy', 'a family with long-term care insurance') + '.' ],
          solo: () => [
            'Read ' + prog('ltc', 'Long-term care insurance') + ' until you can explain the elimination period and the daily maximum to a family in your own words.',
            'On ' + practiceL + ', do Long-term care insurance: Getting started, steps in order, and What do you do next?, then Which program is it? until you get every one right.' ] },
      ],
      drills: ['sop_guide', 'sop_exceptions', 'sop_first_call', 'sop_referral_credit'],
      review: ['A caller\'s dad served in the Navy and needs help three afternoons a week. What are the two VA paths, and how do you tell which one fits?',
        'A family has dementia and traditional Medicare. What do you say, and what do you never say?',
        'A family found a long-term care policy in a drawer. What do you look for first?',
        'Care is needed now but the program is still going through. What do you offer?', 'What is still unclear?'] },

    { k: 'w3', title: 'Caregivers: interviews, hiring and orientation',
      goal: 'You can run an in-person interview and move a new hire from offer to their first shift.',
      sessions: [
        { t: 'The hiring row, left to right', withT: () => [
            'Walk the row together: ' + go('applicants', 'Applicants') + ', ' + go('interviews', 'Interviews') + ', ' + go('offers', 'Offers') + ', ' + go('cgbackground', 'Onboarding') + ', ' + go('orientprog', 'Orientation') + '.',
            'Sit in on an interview and watch how your trainer records how it went.',
            'See what an applicant sees: open ' + go('apjourney', 'Applicant journey') + ' and read every message and screen.',
            'Our hiring rules: new caregivers are 21 or older, we say "interview" and "background checks", and pay is never discussed on the screens about their experience.' ],
          solo: () => [
            'Read ' + how('caregivers', 'How-to: Caregivers') + ', all five cards.',
            READ([['sop_hiring', 'Hiring: interview, offer, checks, orientation'], ['sop_interview_ai', 'Interview recording and the AI review'], ['sop_profiles', 'Caregiver profiles']]),
            'On the Applicant journey page, use "Try the new-hire journey yourself" so every text and email a new hire gets comes to your own phone.' ] },
        { t: 'Leading an interview, with help', withT: () => [
            'You lead an interview and your trainer sits in. Afterwards, record how it went together.',
            'Make an offer together on Offers.',
            'Run background checks from Onboarding together, and see where a result that needs a second look shows up.',
            'Find ' + b('Hiring steps waiting on the office') + ' on the board and press ' + b('Countersign') + ' or ' + b('Next step') + ' on one.' ],
          solo: () => [
            READ([['sop_checks', 'Ongoing checks: OIG, EDL and FCSR'], ['sop_bgflag', 'A flagged background check'], ['sop_approve_work', 'Approving someone to work'], ['sop_training', 'Training: orientation and courses by client need'], ['sop_hepb', 'The Hepatitis B vaccine offer'], ['sop_drivers', 'Approving drivers']]),
            'Open two caregiver profiles and read them the way a family would hear about them from you.' ] },
        { t: 'Interviews on your own', withT: () => [
            'You lead the interviews today. Your trainer reads what you recorded afterwards.',
            'Orientation: see how the 2-hour Agency Orientation is given and where it shows on the caregiver\'s record.',
            'New hires waiting for hours: who they are and how they get their first shifts.' ],
          solo: () => [
            READ([['sop_new_hires', 'New hires waiting for hours'], ['sop_dnr', 'Do-not-rehire and people who reapply'], ['sop_corrective', 'Coaching and corrective action']]),
            'Post your handoff with ' + b('End my shift') + '.' ] },
      ],
      drills: ['sop_hiring', 'sop_bgflag', 'sop_approve_work', 'sop_new_hires'],
      review: ['What makes you say yes to an applicant, and what makes you say no?', 'What has to be true before someone works their first shift?', 'What is still unclear?'] },

    { k: 'w4', title: 'From the assessment to the first week of care',
      goal: 'You can prepare and run a home visit, and carry a family from "yes" to a good first week.',
      sessions: [
        { t: 'The assessment visit', withT: () => [
            'Book an assessment together with ' + b('Schedule assessment') + ' on a lead.',
            'Put the folder together for the care level from ' + go('docfolders', 'SOPs: Client Folders') + '.',
            'Go along on a home visit and watch: ' + b('Start the visit') + ', the care needs, who pays, the Client Care Agreement on the tablet, ' + b('Finish the visit') + '.',
            'Talk about what we never promise before the assessment: hours, a schedule, a start date or a certain caregiver.' ],
          solo: () => [
            'Read ' + how('families', 'How-to: New families') + ', the last four cards.',
            READ([['sop_soc', 'Start of care: from the assessment visit to the first week'], ['sop_agreement', 'The Client Care Agreement and family permissions'], ['sop_packet', 'The caregiver packet']]),
            'Put together one practice folder for each care level and show your trainer.' ] },
        { t: 'They said yes', withT: () => [
            'Open ' + go('soc', 'Client Care: Getting ready, Before staffing') + ' and work each step for a real new client together.',
            'Find caregivers on ' + go('teambuilder', 'Scheduling: Caregiver Matching') + ': ' + b('Ask the whole team') + ', then pencil in the green names.',
            'Listen while your trainer calls the family with who is coming and when. We introduce the team, not one person.' ],
          solo: () => [
            READ([['sop_team', 'Building the team for a new client'], ['sop_carematch', 'Care Match check-ins']]),
            'Read two recent starts on ' + go('clientqueue', 'Client Care: Getting ready, First shift') + ' from beginning to end.' ] },
        { t: 'The first shift and the days after', withT: () => [
            'Lead a home visit with your trainer there, if one is booked. If not, lead the next one that is.',
            'Make a first-week call to a family with your trainer listening.',
            'When ' + go('carematch', 'Scheduling: Care Match Check-ins') + ' shows one due, call the family and the caregiver and press ' + b('Log check-in') + '.' ],
          solo: () => [
            'Go back to your own leads. Each one has a next day.',
            'Post your handoff with ' + b('End my shift') + '.' ] },
      ],
      drills: ['sop_soc', 'sop_agreement', 'sop_team', 'sop_carematch'],
      review: ['What goes in the folder, and how do you pick the right one?', 'How do you tell a family who is coming without promising one person?', 'What is still unclear?'] },

    { k: 'w5', title: 'Scheduling and coverage',
      goal: 'You can cover a call-off from start to finish and keep AxisCare right.',
      sessions: [
        { t: 'How scheduling works', withT: () => [
            'Read ' + go('schedguide', 'Scheduling: How scheduling works') + ' together, including which AxisCare reason to pick.',
            'Watch a call-off from start to finish on ' + cov('calloffs', 'Cara: Call-offs & open shifts') + ': ' + b('Open a coverage case') + ', ' + b('Send Cara\'s list') + ', confirm the best yes, tell the client.',
            'Our rules: never ask a caregiver who is already working or scheduled then, and taking a caregiver off a shift is not always a call-off.' ],
          solo: () => [
            'Read ' + how('scheduling', 'How-to: Scheduling') + ', all five cards.',
            READ([['sop_calloff', 'A caregiver calls off: finding coverage'], ['sop_late', 'A caregiver is running late'], ['sop_no_clock', 'Missed clock-in or clock-out: confirm the times with the client']]),
            'Look at ' + b('Open shifts, next 7 days') + ' on the board and say which one you would work first.' ] },
        { t: 'Covering a shift, with help', withT: () => [
            'You run a call-off and your trainer sits beside you.',
            'Work ' + cov('clockins', 'Cara: Missed clock-ins & outs') + ' together: call the caregiver, confirm the times with the client, fix the visit in AxisCare.',
            'Change a visit the right way: the client or family first, then AxisCare, then the caregiver.' ],
          solo: () => [
            READ([['sop_visit_change', 'Changing a visit and telling families'], ['sop_prn', 'Using the PRN CNA Team'], ['sop_availability', 'Availability check-ins']]),
            'Open ' + cov('hours', 'Cara: Hours & matching') + ' and find any caregiver whose availability is missing.' ] },
        { t: 'Scheduling is yours this afternoon', withT: () => [
            'Talk through what happens when nobody can cover: the PRN team first, then the coordinator on duty in person, and the person in charge is told.',
            'Fill a regular shift that has nobody on it from ' + cov('ongoing', 'Cara: Ongoing shifts') + '.',
            'Agree who your backup is this afternoon before your trainer leaves.' ],
          solo: () => [
            'Scheduling cards are yours this afternoon. Ask your backup when you are not sure.',
            'Post a handoff that says which shifts are still open and who has been asked.' ] },
      ],
      drills: ['sop_calloff', 'sop_late', 'sop_no_clock', 'sop_visit_change'],
      review: ['A caregiver calls off for a shift that starts in an hour. What do you do first?', 'When is taking someone off a shift not a call-off?', 'What is still unclear?'] },

    { k: 'w6', title: 'Looking after clients',
      goal: 'Every client is checked on, and a worry is acted on the day it comes up.',
      sessions: [
        { t: 'Check-ins and plan reviews', withT: () => [
            'Open ' + go('clientsboard', 'Client Care: Clients') + ' and work ' + b('Due this week') + ' together.',
            'Listen to your trainer make a check-in call, then make the next one yourself and log it on the client.',
            'See how a care plan review is done and where it is recorded.' ],
          solo: () => [
            'Read ' + how('clients', 'How-to: Clients') + ', all four cards.',
            READ([['sop_careplan', 'Care plan reviews'], ['sop_supervisory', 'Supervisory visits'], ['sop_condition', 'A change in the client\'s condition']]),
            'Make two check-in calls on your own and log them.' ] },
        { t: 'Shift notes, flags and families', withT: () => [
            'Read today\'s shift-note flags together and decide what each one needs.',
            'Work ' + b('Needs something') + ', ' + b('Concerns') + ' and ' + b('Family requests') + ' on the Clients board.',
            'Open Family Circles and Feedback from the board and answer what is there.' ],
          solo: () => [
            READ([['sop_flags', 'Shift-note red and yellow flags'], ['sop_missed_notes', 'Missed shift notes'], ['sop_review', 'Asking a happy family for a Google review']]),
            'Ask one happy family for a review from ' + go('feedback', 'Referrals & Marketing: Feedback') + ': ' + b('Copy message') + ', send it from the office line, then ' + b('I asked') + '.' ] },
        { t: 'Pausing and ending care', withT: () => [
            'Walk through ' + b('Pause care') + ', ' + b('Resume care') + ' and ' + b('End care') + ' on a client profile without pressing them.',
            'Talk through a real pause or ending from the last month: what the family was told, and what changed in AxisCare.',
            'The Clients board is yours this afternoon.' ],
          solo: () => [
            READ([['sop_end_care', 'Ending care'], ['sop_billing', 'Rate changes and unpaid balances']]),
            'Nothing is left in Due this week before you post your handoff.' ] },
      ],
      drills: ['sop_condition', 'sop_flags', 'sop_missed_notes', 'sop_end_care'],
      review: ['A shift note says the client seemed confused today. What do you do?', 'A family wants to stop care. What do you do before you promise anything?', 'What is still unclear?'] },

    { k: 'w7', title: 'When something goes wrong',
      goal: 'You can handle a fall, a complaint or a suspected abuse report without stopping to look it up.',
      sessions: [
        { t: 'Falls and injuries', withT: () => [
            'Talk through a fall at the desk. Your trainer is the caregiver calling from the home; you say each step out loud.',
            'Go over the rule every caregiver must hear: never lift a client who has fallen.',
            'See where a hospital stay shows on the client and how visits come off and go back on in AxisCare.' ],
          solo: () => [
            'Read ' + how('wrong', 'How-to: When something goes wrong') + ', all five cards.',
            'Read again, slowly: ' + P('sop_fall', 'A fall, injury or hospital trip') + ' and ' + P('sop_condition', 'A change in the client\'s condition') + '.',
            'Do the practice drills below without looking first.' ] },
        { t: 'Complaints, and suspected abuse', withT: () => [
            'Talk through a complaint at the desk. Your trainer is an unhappy daughter; you listen, write her own words, and say what happens next.',
            'Talk through a suspected abuse report: who reports, how fast, and what you never do.',
            'Find the hotline number and the online report in the published procedure so you know where they are.' ],
          solo: () => [
            'Read again, slowly: ' + P('sop_complaint', 'A client complaint or grievance') + ' and ' + P('sop_abuse', 'Suspected abuse, neglect or exploitation') + '.',
            READ([['sop_corrective', 'Coaching and corrective action'], ['sop_separation', 'Final warnings, terminations and caregiver offboarding']]),
            'Find where a coaching talk is written on ' + go('hr', 'Caregivers: Performance') + '. A write-up needs an owner\'s approval.' ] },
        { t: 'After hours, weather and outages', withT: () => [
            'Talk through a snow day: which visits matter most and who calls whom.',
            'Talk through what happens after hours and how the morning finds out.',
            'Work a row of ' + b('Texts or emails that didn\'t go out') + ' with ' + b('Fix the send') + '.' ],
          solo: () => [
            READ([['sop_weather', 'Bad weather and system outages'], ['sop_oncall', 'After-hours on-call']]),
            'Post your handoff with ' + b('End my shift') + '.' ] },
      ],
      drills: ['sop_fall', 'sop_complaint', 'sop_abuse', 'sop_weather'],
      review: ['Without looking: what are the first three things you do when a caregiver calls about a fall?', 'Who do you tell, and when, after a complaint?', 'What is still unclear?'] },

    { k: 'w8', title: 'Holding the office on your own',
      goal: 'You can run the office for an afternoon with nobody beside you, and every family who calls ends up in the right program.',
      sessions: [
        { t: 'Every way to pay, mixed', withT: () => [
            'Your trainer calls in as three different families, one after another. For each one, name every program they could use and say the first two steps.',
            'Open a veteran\'s lead and see the VA paperwork card on the call screen.',
            'Talk about what is never promised: how fast a program will approve someone.' ],
          solo: () => [
            'On ' + practiceL + ', do Which program is it? until you get them all right, then one practice call with each caller.',
            READ([['sop_guide', 'Medicare GUIDE: screening, assessment and respite'], ['sop_exceptions', 'Exceptions: rates, minimums, area and refunds'], ['sop_change', 'Changing a policy, an SOP or a Hub switch']]),
            'You hold the office this afternoon. Your backup is a phone call away.' ] },
        { t: 'A full afternoon alone', withT: () => [
            'Your trainer reads yesterday\'s handoff with you: what was clear, and what they had to ask about.',
            'Go through any skills not signed off yet and plan when to show each one.',
            'Know what is not yours: payroll, write-ups, refunds, credits and ending service are decided by the people named in "Who decides what".' ],
          solo: () => [
            READ([['sop_payroll', 'Weekly payroll'], ['sop_decide', 'Who decides what, and who is in charge']]),
            'You hold the office this afternoon. Post a handoff the morning can work from without calling you.' ] },
        { t: 'Looking back, and what comes next', withT: () => [
            'Show any skill still waiting for a sign-off.',
            'Sit down with your trainer and an owner: what you are strong at, what you want more practice in, and what the next stage looks like.',
            'Pick the three procedures you want to read again next month.' ],
          solo: () => [
            'You hold the office this afternoon.',
            'Write a note in The plan about what would have helped you most in your first week, for the next person.' ] },
      ],
      drills: ['sop_guide', 'sop_exceptions', 'sop_decide', 'sop_oncall'],
      review: ['What do you feel ready to own?', 'Where do you still want someone beside you?', 'What should change in this program for the next new coordinator?'] },
  ];

  /* What a coordinator must be able to do alone. The trainer, or an owner, signs each one when they have SEEN it done. */
  const SKILLS = [
    { g: 'Your day', list: [
      ['day_board', 'Opens the day and works the Operations Board in order without being reminded'],
      ['day_handoff', 'Leaves a handoff the next person can work from without calling'],
      ['day_privacy', 'Calls from the office line, and shares client details only with people allowed to hear them'],
      ['day_decide', 'Knows who decides what, and tells the person in charge the same day when it is theirs to decide'] ] },
    { g: 'New families', list: [
      ['fam_call', 'Takes a new family call that covers all five beats'],
      ['fam_payer', 'Asks the five program questions, and points Medicaid callers to Caring Companions CDS'],
      ['fam_leads', 'Keeps every open lead with a follow-up day or an assessment booked'],
      ['fam_assess', 'Books an assessment and brings the right folder'] ] },
    { g: 'Paying for care', list: [
      ['pay_private', 'Explains our private-pay rates, minimums and terms, and when Early Support Visits fits instead'],
      ['pay_guide', 'Screens a family for Medicare GUIDE and gets them submitted in Crosby Health, without promising approval'],
      ['pay_vacc', 'Gets a veteran started with VA Community Care, from the referral request to the authorization, and knows its rules'],
      ['pay_aa', 'Explains Aid & Attendance, starts care as private pay, and sends the family to a Veterans Service Officer'],
      ['pay_ltc', 'Reads a long-term care policy for the trigger, the waiting period and the daily maximum, and runs the three-way call with the carrier'] ] },
    { g: 'Starting care', list: [
      ['soc_visit', 'Runs a home visit and gets the Client Care Agreement signed'],
      ['soc_team', 'Builds the team for a new client and introduces the team, not one person'],
      ['soc_week', 'Makes the first-week call and logs the Care Match check-in'] ] },
    { g: 'Scheduling', list: [
      ['sch_calloff', 'Covers a call-off from start to finish'],
      ['sch_clock', 'Fixes a missed clock-in or clock-out with the client\'s confirmation'],
      ['sch_change', 'Changes a visit in the right order: client, AxisCare, caregiver'] ] },
    { g: 'Clients', list: [
      ['cl_checkin', 'Makes a check-in call and logs it on the client'],
      ['cl_flag', 'Acts on a shift-note flag or a change in condition the same day'],
      ['cl_end', 'Pauses or ends care so the Hub, AxisCare and the family all match'] ] },
    { g: 'Caregivers', list: [
      ['cg_interview', 'Leads an interview alone and records how it went'],
      ['cg_hire', 'Moves a new hire through the offer, background checks and orientation'],
      ['cg_coach', 'Writes up a coaching talk, and knows a write-up needs an owner\'s approval'] ] },
    { g: 'When something goes wrong', list: [
      ['wr_fall', 'Talks through a fall from memory, start to finish'],
      ['wr_complaint', 'Talks through a complaint from memory, start to finish'],
      ['wr_abuse', 'Talks through a suspected abuse report from memory, start to finish'] ] },
    { g: 'On your own', list: [
      ['own_office', 'Holds the office alone for a full afternoon'] ] },
  ];
  const ALL_SKILLS = SKILLS.reduce((a, g) => a.concat(g.list), []);

  /* REMOTE (2026-11-14, her pick for Katlin, who works from Vietnam 5:30 to 7:30pm Central): a plan marked remote hides the
     lines and skills that need someone physically in Springfield, so the progress can reach the end. Video interviews,
     calls, the Hub and AxisCare all work from anywhere and stay. */
  const IN_PERSON = new Set([
    'w1-3w-3',                         // sit in on in-person interviews from now on
    'w4-1w-2', 'w4-1w-3', 'w4-1s-3',   // the client folder, going on a home visit, practice folders
    'w4-3w-1',                         // leading a home visit
    'w8-1s-3', 'w8-2s-2', 'w8-3s-1'    // holding the office alone
  ]);
  const IN_PERSON_SKILLS = new Set(['fam_assess', 'soc_visit', 'own_office']);
  const isRemote = (p) => !!(p && p.remote);
  const skillsFor = (p) => isRemote(p) ? ALL_SKILLS.filter((k) => !IN_PERSON_SKILLS.has(k[0])) : ALL_SKILLS;

  /* every tick has a steady id: week, session number, with/solo, line number (w2-1w-3). Lines are only ever added at
     the end of a list, so a tick never moves to a different line. */
  const sessionItems = (w, si, p) => {
    const s = w.sessions[si], keep = (x) => !(isRemote(p) && IN_PERSON.has(x.id));
    return { withT: s.withT().map((t, i) => ({ id: w.k + '-' + (si + 1) + 'w-' + (i + 1), t })).filter(keep), solo: s.solo().map((t, i) => ({ id: w.k + '-' + (si + 1) + 's-' + (i + 1), t })).filter(keep) };
  };
  const weekIds = (w, p) => {
    const ids = [];
    w.sessions.forEach((s, si) => { const it = sessionItems(w, si, p); it.withT.concat(it.solo).forEach((x) => ids.push(x.id)); });
    w.drills.forEach((d) => { if (proc(d)) ids.push(w.k + '-d-' + d); });
    return ids;
  };

  /* ---------------------------------------------------------------- the saved plan ---- */
  const plans = () => items().filter((x) => x && x.kind === 'training' && x.email && !x.ended_at);
  const planOf = (e) => items().find((x) => x && x.id === 'training:' + lc(e)) || null;
  const signOf = (e) => items().find((x) => x && x.id === 'trainsign:' + lc(e)) || null;
  async function put(item) {
    if (typeof DATA !== 'undefined' && !Array.isArray(DATA[KEY])) DATA[KEY] = [];
    const i = DATA[KEY].findIndex((x) => x && x.id === item.id); if (i >= 0) DATA[KEY][i] = item; else DATA[KEY].push(item);
    await persist(KEY, item);
  }
  const isTrainerOf = (p) => !!p && lc(p.trainer) === myEmail();
  const canSign = (p) => !!p && (owner() || isTrainerOf(p)) && lc(p.email) !== myEmail();
  const canTick = (p) => !!p && (lc(p.email) === myEmail() || owner() || isTrainerOf(p));

  /* whose plan is on the page: your own if you are in training; otherwise the one an owner or trainer picked */
  let who = '';
  function current() {
    const mine = planOf(myEmail());
    if (mine && !mine.ended_at && !who) return mine;
    const seen = plans().filter((p) => owner() || isTrainerOf(p) || lc(p.email) === myEmail());
    if (who) { const p = seen.find((x) => lc(x.email) === who); if (p) return p; }
    return (mine && !mine.ended_at) ? mine : (seen[0] || null);
  }

  /* ---------------------------------------------------------------- dates ---- */
  const DAY = 86400000;
  const NW = () => (['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][WEEKS.length] || String(WEEKS.length));
  const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const parse = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const monday = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const words = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const longDay = (s) => { const d = parse(s); return d ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''; };
  /** which program week today falls in: 0 = has not started, 1..WEEKS.length, WEEKS.length + 1 = all behind them */
  function weekNow(p) {
    const st = parse(p && p.start); if (!st) return 1;
    const today = new Date();
    if (today < new Date(st.getFullYear(), st.getMonth(), st.getDate())) return 0;
    const n = Math.round((monday(today) - monday(st)) / (7 * DAY)) + 1;
    return n > WEEKS.length ? WEEKS.length + 1 : Math.max(1, n);
  }
  /** the office days of program week n, as dates */
  function officeDays(p, n) {
    const st = parse(p && p.start); if (!st) return [];
    const m0 = monday(st); const days = (p.days || []).slice().sort();
    const out = [];
    for (const wd of days) {
      const d = new Date(m0.getFullYear(), m0.getMonth(), m0.getDate() + (n - 1) * 7 + ((wd + 6) % 7));
      if (d >= new Date(st.getFullYear(), st.getMonth(), st.getDate())) out.push(d);
    }
    return out;
  }
  const dayList = (p) => (p.days || []).slice().sort((a, c) => ((a + 6) % 7) - ((c + 6) % 7)).map((d) => DN[d]).join(', ');

  /* ---------------------------------------------------------------- progress ---- */
  const doneMap = (p) => (p && p.done) || {};
  function weekProgress(p, w) { const ids = weekIds(w, p); const d = doneMap(p); return { n: ids.filter((i) => d[i]).length, of: ids.length }; }
  function totals(p) {
    let n = 0, of = 0; WEEKS.forEach((w) => { const x = weekProgress(p, w); n += x.n; of += x.of; });
    const s = (signOf(p && p.email) || {}).signed || {};
    const list = skillsFor(p);
    return { n, of, signed: list.filter((k) => s[k[0]]).length, skills: list.length };
  }

  /* ---------------------------------------------------------------- drawing ---- */
  let view = 'week', openWeek = '';
  try { const v = localStorage.getItem('cch_training_view'); if (['week', 'practice', 'program', 'skills', 'plan'].includes(v)) view = v; } catch (e) { /* first visit */ }
  const VIEWS = [['week', 'This week'], ['practice', 'Practice'], ['program', 'The whole program'], ['skills', 'Skills'], ['plan', 'The plan']];

  const css = '<style id="ctCss">'
    + '.ct-pill{border:1.5px solid #D8DEE6;background:#fff;color:var(--navy);border-radius:999px;padding:7px 14px;font-weight:700;font-size:13px;cursor:pointer;}'
    + '.ct-pill.on{border-color:var(--navy);background:var(--navy);color:#fff;}'
    + '.ct-stones{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:14px;}'
    + '.ct-stone{width:38px;height:38px;border-radius:50%;border:2px solid #CADDD9;background:#fff;color:var(--navy);font-weight:800;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;}'
    + '.ct-stone.done{background:#0F7A73;border-color:#0F7A73;color:#fff;}.ct-stone.now{border-color:#F0A63A;box-shadow:0 0 0 3px rgba(240,166,58,.25);}'
    + '.ct-link{flex:0 0 14px;height:2px;background:#CADDD9;}'
    + '.ct-bar{height:8px;border-radius:999px;background:#EEF2F4;overflow:hidden;}.ct-bar>i{display:block;height:100%;background:#0F7A73;border-radius:999px;}'
    + '.ct-item{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-top:1px solid #EEF2F4;font-size:13.5px;line-height:1.5;}'
    + '.ct-item:first-child{border-top:0;}.ct-item input{width:18px;height:18px;margin:2px 0 0;flex:0 0 18px;accent-color:#0F7A73;}'
    + '.ct-item.done>span{color:#5B6B7A;}'
    + '.ct-h{font-weight:800;color:var(--navy);font-size:13px;letter-spacing:.02em;margin:12px 0 2px;}'
    + '.ct-tag{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700;background:#EAF4F6;color:#103D47;white-space:nowrap;}'
    + '.ct-tag.ok{background:#E3F4EC;color:#0B5F45;}.ct-tag.wait{background:#FFF3DA;color:#7A4E00;}'
    + '.ct-drill{border:1px solid #E3E8EE;border-radius:12px;padding:10px 14px;margin:8px 0 0;background:#FBFCFD;}'
    + '.ct-drill>summary{cursor:pointer;font-weight:700;color:var(--navy);font-size:13.5px;}'
    + '.ct-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}@media (max-width:760px){.ct-grid{grid-template-columns:minmax(0,1fr);}}'
    + '.ct-form label{display:block;font-size:12.5px;font-weight:700;color:var(--navy);margin:10px 0 3px;}.ct-form input[type=text],.ct-form input[type=email],.ct-form input[type=date],.ct-form select{width:100%;}'
    + '</style>';

  const check = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  /* a small hand-drawn mark for the header: a path up a hill to a flag (navy outline, teal and honey fills) */
  const hill = '<svg width="92" height="64" viewBox="0 0 92 64" aria-hidden="true" style="flex:0 0 92px;"><path d="M2 60c14-30 30-44 44-44s30 14 44 44z" fill="#EAF4F6" stroke="#0D365F" stroke-width="2" stroke-linejoin="round"/>'
    + '<path d="M14 58c8-6 14-8 20-12s8-10 12-16" fill="none" stroke="#0F7A73" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 7"/>'
    + '<path d="M46 30V8" stroke="#0D365F" stroke-width="2.5" stroke-linecap="round"/><path d="M46 8l16 5-16 6z" fill="#F0A63A" stroke="#0D365F" stroke-width="2" stroke-linejoin="round"/></svg>';

  function itemHtml(p, it) {
    const d = doneMap(p)[it.id], can = canTick(p);
    return '<label class="ct-item' + (d ? ' done' : '') + '"><input type="checkbox" ' + (d ? 'checked ' : '') + (can ? '' : 'disabled ')
      + 'onchange="CTR.tick(\'' + it.id + '\',this.checked)" aria-label="Done"><span>' + it.t + '</span></label>';
  }
  function drillHtml(p, w, id) {
    const d = proc(id); if (!d) return '';
    const tid = w.k + '-d-' + id, done = doneMap(p)[tid], can = canTick(p);
    const steps = Array.isArray(d.steps) ? d.steps : [];
    return '<details class="ct-drill"><summary>' + esc(d.title) + (done ? ' <span class="ct-tag ok">Practiced</span>' : '') + '</summary>'
      + '<div style="font-size:13.5px;line-height:1.55;margin-top:8px;"><b>The situation.</b> ' + esc(d.when || 'See the procedure.') + '</div>'
      + '<div class="field-note" style="font-size:12.5px;margin-top:6px;">Say out loud what you would do, step by step. Then open "What we do" and compare.</div>'
      + '<details style="margin-top:8px;"><summary style="cursor:pointer;font-weight:700;color:var(--teal);font-size:13px;">What we do</summary>'
      + (steps.length ? '<ol style="margin:8px 0 0 18px;padding:0;font-size:13.5px;line-height:1.55;">' + steps.map((s) => '<li style="margin:3px 0;">' + esc(s) + '</li>').join('') + '</ol>' : '')
      + (d.done_when ? '<div class="field-note" style="margin-top:8px;font-size:12.5px;"><b>Done when:</b> ' + esc(d.done_when) + '</div>' : '')
      + (d.escalate_if ? '<div style="margin-top:8px;padding:8px 12px;border-radius:10px;background:#FFF8E6;font-size:13px;line-height:1.5;"><b>Tell the person in charge if:</b> ' + esc(d.escalate_if) + '</div>' : '')
      + '<div style="margin-top:8px;font-size:13px;"><a href="javascript:void(0)" onclick="CTR.openProcedure(\'' + esc(id) + '\')" style="font-weight:700;color:var(--teal);">Open the full procedure</a></div>'
      + (window.CTP && steps.length >= 3 ? '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;"><button class="secondary" style="padding:4px 12px;font-size:12.5px;" onclick="CTP.scenario(\'' + esc(id) + '\')">Practice it: what do you do next?</button>'
          + '<button class="secondary" style="padding:4px 12px;font-size:12.5px;" onclick="CTP.order(\'' + esc(id) + '\')">Put the steps in order</button></div>' : '')
      + '</details>'
      + (p ? '<label class="ct-item" style="border-top:0;margin-top:6px;"><input type="checkbox" ' + (done ? 'checked ' : '') + (can ? '' : 'disabled ') + 'onchange="CTR.tick(\'' + tid + '\',this.checked)"><span>I practiced this one out loud</span></label>' : '')
      + '</details>';
  }
  function weekHtml(p, w, n, open) {
    const pr = p ? weekProgress(p, w) : null;
    const days = p ? officeDays(p, n) : [];
    const trainer = p && p.trainer ? firstName(nameOf(p.trainer)) : 'your trainer';
    const head = '<summary style="cursor:pointer;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">'
      + '<span style="font-weight:800;color:var(--navy);font-size:15px;">Week ' + n + ': ' + esc(w.title) + '</span>'
      + (pr ? '<span class="ct-tag' + (pr.n === pr.of && pr.of ? ' ok' : '') + '">' + pr.n + ' of ' + pr.of + ' done</span>' : '') + '</summary>';
    const sess = w.sessions.map((s, si) => {
      const it = sessionItems(w, si, p);
      return '<div class="card" style="padding:12px 16px;margin:10px 0 0;">'
        + '<div style="font-weight:800;color:var(--navy);font-size:14px;">Day ' + (si + 1) + ': ' + esc(s.t) + (days[si] && days.length <= w.sessions.length ? ' <span class="field-note" style="font-weight:600;">' + esc(words(days[si])) + '</span>' : '') + '</div>'
        + '<div class="ct-h">With ' + esc(trainer) + '</div>' + it.withT.map((x) => itemHtml(p, x)).join('')
        + '<div class="ct-h">On your own</div>' + it.solo.map((x) => itemHtml(p, x)).join('')
        + '</div>';
    }).join('');
    const drills = w.drills.map((id) => drillHtml(p, w, id)).join('');
    const notes = p ? notesHtml(p, w.k) : '';
    return '<details class="card ct-week" data-week="' + w.k + '" ' + (open ? 'open ' : '') + 'style="padding:14px 18px;margin:0 0 12px;">' + head
      + '<div style="font-size:13.5px;line-height:1.5;margin-top:8px;max-width:85ch;"><b>By the end of this week:</b> ' + esc(w.goal) + '</div>'
      + (days.length ? '<div class="field-note" style="font-size:12.5px;margin-top:4px;">' + (isRemote(p) ? 'Training days: ' : 'In the office: ') + days.map(words).map(esc).join(', ') + '.'
          + (days.length < w.sessions.length ? ' Fewer ' + (isRemote(p) ? 'training' : 'office') + ' days than sessions this week, so carry what is left into next week.' : days.length > w.sessions.length ? ' Spread the three sessions across these days.' : '') + '</div>' : '')
      + sess
      + (drills ? '<div class="card" style="padding:12px 16px;margin:10px 0 0;"><div style="font-weight:800;color:var(--navy);font-size:14px;">Practice drills</div>'
          + '<div class="field-note" style="font-size:12.5px;margin-top:2px;">Each one is a real situation from our published procedures. The answers are the procedure itself.</div>' + drills + '</div>' : '')
      + '<div class="card" style="padding:12px 16px;margin:10px 0 0;"><div style="font-weight:800;color:var(--navy);font-size:14px;">End of the week: fifteen minutes together</div>'
      + '<ul style="margin:6px 0 0 18px;padding:0;font-size:13.5px;line-height:1.6;">' + w.review.map((q) => '<li>' + esc(q) + '</li>').join('') + '</ul>' + notes + '</div>'
      + '</details>';
  }
  function notesHtml(p, wk) {
    const all = ((p.notes || []).concat((signOf(p.email) || {}).notes || [])).filter((x) => x && x.week === wk).sort((a, c) => String(a.at).localeCompare(String(c.at)));
    const list = all.map((x) => '<div style="font-size:13px;line-height:1.5;margin-top:6px;"><b>' + esc(firstName(nameOf(x.by))) + '</b> <span class="field-note">' + esc(words(new Date(x.at))) + '</span><br>' + esc(x.text) + '</div>').join('');
    return list + (canTick(p) ? '<div style="display:flex;gap:8px;margin-top:10px;align-items:flex-start;flex-wrap:wrap;"><textarea id="ctNote_' + wk + '" rows="2" style="flex:1 1 320px;" placeholder="A note from this week. Optional."></textarea>'
      + '<button class="secondary" onclick="CTR.addNote(\'' + wk + '\')">Save note</button></div>' : '');
  }

  function headerHtml(p) {
    const seen = plans().filter((x) => owner() || isTrainerOf(x) || lc(x.email) === myEmail());
    const pick = seen.length > 1 || (seen.length === 1 && lc(seen[0].email) !== myEmail())
      ? '<label class="field-note" style="font-size:12.5px;">Showing <select onchange="CTR.pick(this.value)" style="margin-left:4px;">' + seen.map((x) => '<option value="' + esc(lc(x.email)) + '"' + (p && lc(x.email) === lc(p.email) ? ' selected' : '') + '>' + esc(x.name || x.email) + '</option>').join('') + '</select></label>' : '';
    let line = NW().charAt(0).toUpperCase() + NW().slice(1) + ' weeks from the first day to holding the office alone. What to read, what to watch, what to do, and what you must be able to do by yourself at the end.';
    let prog = '';
    if (p) {
      const t = totals(p), n = weekNow(p);
      const me = lc(p.email) === myEmail();
      line = n === 0 ? (me ? 'Your training starts ' : esc(firstName(p.name)) + ' starts ') + esc(longDay(p.start)) + '.'
        : n > WEEKS.length ? (me ? 'Your ' + NW() + ' weeks are behind you.' : esc(firstName(p.name)) + ' has finished the ' + NW() + ' weeks.') + ' ' + (t.signed < t.skills ? (t.skills - t.signed) + ' skills are still to be signed off.' : 'Every skill is signed off.')
        : (me ? 'You are in ' : esc(firstName(p.name)) + ' is in ') + 'week ' + n + ' of ' + WEEKS.length + ': ' + esc(WEEKS[n - 1].title) + '.';
      const pct = t.of ? Math.round(100 * t.n / t.of) : 0;
      prog = '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:12px;"><div style="flex:1 1 220px;"><div class="ct-bar"><i style="width:' + pct + '%"></i></div></div>'
        + '<span class="ct-tag">' + t.n + ' of ' + t.of + ' done</span><span class="ct-tag' + (t.signed === t.skills ? ' ok' : '') + '">' + t.signed + ' of ' + t.skills + ' skills signed off</span></div>'
        + '<div class="ct-stones" id="ctStones">' + WEEKS.map((w, i) => {
            const x = weekProgress(p, w), full = x.of && x.n === x.of;
            return (i ? '<span class="ct-link"></span>' : '') + '<button type="button" class="ct-stone' + (full ? ' done' : '') + (n === i + 1 ? ' now' : '') + '" title="Week ' + (i + 1) + ': ' + esc(w.title) + '" onclick="CTR.openWeek(\'' + w.k + '\')">' + (full ? check : (i + 1)) + '</button>';
          }).join('') + '</div>';
    }
    const pills = VIEWS.map(([k, l]) => '<button type="button" class="ct-pill' + (k === view ? ' on' : '') + '" data-ct="' + k + '" onclick="CTR.show(\'' + k + '\')">' + esc(l) + '</button>').join('');
    return '<div class="card" style="padding:18px;margin-bottom:14px;"><div style="display:flex;gap:16px;align-items:flex-start;">' + hill
      + '<div style="flex:1;min-width:0;"><div style="display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;justify-content:space-between;"><div style="font-size:19px;font-weight:800;color:var(--navy);">Coordinator Training</div>' + pick + '</div>'
      + '<div class="field-note" id="ctLine" style="font-size:13.5px;margin-top:3px;max-width:80ch;">' + line + '</div></div></div>'
      + prog + '<div id="ctPills" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;">' + pills + '</div></div>';
  }

  function noPlanHtml() {
    return '<div class="card" style="padding:14px 18px;margin-bottom:12px;font-size:13.5px;line-height:1.55;">'
      + (owner() ? 'Nobody is in training right now. Open ' + b('The plan') + ' to start one for a new coordinator. Until then, this is the program as they will see it.'
                 : 'You do not have a training plan. An owner starts one for each new coordinator. You can read the whole program here any time.') + '</div>';
  }

  function viewWeek(p) {
    if (!p) return noPlanHtml() + weekHtml(null, WEEKS[0], 1, true);
    const n = weekNow(p);
    if (n === 0) return '<div class="card" style="padding:14px 18px;margin-bottom:12px;font-size:13.5px;">Week 1 begins ' + esc(longDay(p.start)) + '. Here is what it holds.</div>' + weekHtml(p, WEEKS[0], 1, true);
    if (n > WEEKS.length) {
      const t = totals(p);
      return '<div class="card" style="padding:16px 18px;margin-bottom:12px;font-size:14px;line-height:1.55;"><b style="color:var(--navy);">The ' + NW() + ' weeks are done.</b> '
        + (t.signed < t.skills ? 'What is left is on ' + b('Skills') + ': ' + (t.skills - t.signed) + ' still to show and sign off.' : 'Every skill is signed off. Well done.')
        + (t.n < t.of ? ' ' + (t.of - t.n) + ' lines in the program are not ticked yet; they are in ' + b('The whole program') + '.' : '') + '</div>';
    }
    const behind = WEEKS.slice(0, n - 1).map((w, i) => ({ w, i, x: weekProgress(p, w) })).filter((r) => r.x.n < r.x.of);
    return (behind.length ? '<div class="card" style="padding:12px 16px;margin-bottom:12px;font-size:13.5px;line-height:1.55;">Still open from earlier weeks: '
        + behind.map((r) => '<a href="javascript:void(0)" onclick="CTR.openWeek(\'' + r.w.k + '\')" style="font-weight:700;color:var(--teal);">Week ' + (r.i + 1) + ' (' + (r.x.of - r.x.n) + ' left)</a>').join(', ') + '.</div>' : '')
      + weekHtml(p, WEEKS[n - 1], n, true);
  }
  function viewProgram(p) {
    return (p ? '' : noPlanHtml()) + WEEKS.map((w, i) => weekHtml(p, w, i + 1, openWeek ? openWeek === w.k : false)).join('');
  }
  function viewSkills(p) {
    const s = p ? ((signOf(p.email) || {}).signed || {}) : {};
    const sign = canSign(p);
    return '<div class="card" style="padding:14px 18px;margin-bottom:12px;font-size:13.5px;line-height:1.55;">These are what a care coordinator must be able to do alone. '
      + 'A skill is signed off by the trainer or an owner after they have watched it done, not after it has been read about.' + (p ? '' : ' Nobody is in training right now, so nothing here is signed.') + '</div>'
      + SKILLS.map((g) => ({ g: g.g, list: g.list.filter((k) => !(isRemote(p) && IN_PERSON_SKILLS.has(k[0]))) })).filter((g) => g.list.length)
        .map((g) => '<div class="card" style="padding:12px 16px;margin:0 0 10px;"><div style="font-weight:800;color:var(--navy);font-size:14px;">' + esc(g.g) + '</div>'
        + g.list.map((k) => {
            const got = s[k[0]];
            return '<div class="ct-item" data-skill="' + k[0] + '"><span style="flex:1;">' + esc(k[1]) + '</span>'
              + (got ? '<span class="ct-tag ok">Signed off by ' + esc(firstName(nameOf(got.by))) + ', ' + esc(words(new Date(got.at))) + '</span>' + (sign ? ' <button class="linklike" onclick="CTR.sign(\'' + k[0] + '\',false)">Undo</button>' : '')
                     : (p ? (sign ? '<button class="secondary" style="padding:4px 12px;font-size:12.5px;" onclick="CTR.sign(\'' + k[0] + '\',true)">Sign off</button>' : '<span class="ct-tag wait">Not yet</span>') : ''))
              + '</div>';
          }).join('') + '</div>').join('');
  }

  const STAGE_HELP = [
    ['Learning', 'In the office part of the week, beside the trainer every morning. The weeks of this program.'],
    ['More days', 'More office time. Leads interviews, and takes scheduling in the afternoons with a backup a phone call away.'],
    ['On your own', 'Full office hours. Shares every client with the other care coordinator and holds the afternoons alone.'],
  ];
  const STAGE_HELP_REMOTE = [
    ['Learning', 'Trains live with the trainer by video during their own hours. The weeks of this program.'],
    ['More', 'More of the work alone: interviews, calls and the evening cards, with the trainer reachable.'],
    ['On your own', 'Holds their hours alone and hands off to the office every morning.'],
  ];
  function viewPlan(p) {
    const stages = (p && Array.isArray(p.stages)) ? p.stages : [];
    const help = isRemote(p) ? STAGE_HELP_REMOTE : STAGE_HELP;
    const stageHtml = '<div class="ct-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));">' + help.map((h, i) => {
      const st = stages[i] || {};
      return '<div class="card" style="padding:12px 16px;margin:0;"><div class="ct-tag">Stage ' + (i + 1) + '</div><div style="font-weight:800;color:var(--navy);font-size:15px;margin-top:6px;">' + esc(h[0]) + '</div>'
        + (st.from ? '<div style="font-size:13px;font-weight:700;margin-top:4px;">From ' + esc(longDay(st.from)) + '</div>' : (p && i ? '<div class="field-note" style="font-size:12.5px;margin-top:4px;">Date not set</div>' : ''))
        + (st.hours ? '<div style="font-size:13.5px;margin-top:4px;">' + esc(st.hours) + '</div>' : '')
        + '<div class="field-note" style="font-size:12.5px;margin-top:6px;line-height:1.5;">' + esc(h[1]) + '</div></div>';
    }).join('') + '</div>';
    const rhythm = isRemote(p) ? '<div class="card" style="padding:14px 18px;margin:12px 0 0;"><div style="font-weight:800;color:var(--navy);font-size:14px;">What a training day looks like (remote)</div>'
      + '<ol style="margin:8px 0 0 18px;padding:0;font-size:13.5px;line-height:1.6;">'
      + '<li><b>Start on a video call together.</b> Read the Operations Board side by side and agree what today\'s session is.</li>'
      + '<li><b>Share your screen.</b> Watch it done on the trainer\'s screen, then do it on yours while they watch.</li>'
      + '<li><b>The rest of your hours are yours.</b> Do the reading and the practice drills, and work the real cards you have been shown how to do.</li>'
      + '<li><b>Finish with a handoff.</b> Press End my shift and write what the office needs in the morning.</li></ol>'
      + '<div class="field-note" style="font-size:12.5px;margin-top:8px;line-height:1.5;">Lines that need someone in Springfield, such as home visits and holding the office, are left out of this plan.</div></div>'
      : '<div class="card" style="padding:14px 18px;margin:12px 0 0;"><div style="font-weight:800;color:var(--navy);font-size:14px;">What a training day looks like</div>'
      + '<ol style="margin:8px 0 0 18px;padding:0;font-size:13.5px;line-height:1.6;">'
      + '<li><b>Start together.</b> Read the Operations Board with your trainer and agree what today\'s session is.</li>'
      + '<li><b>The morning is beside your trainer.</b> Watch it done, then do it with help. In-person interviews are 10:30am to 12:30pm, so sit in whenever one is booked.</li>'
      + '<li><b>Hand over before your trainer leaves.</b> What is open, and who your backup is for the afternoon.</li>'
      + '<li><b>The afternoon is yours.</b> Do the reading and the practice drills, and work the real cards you have been shown how to do.</li>'
      + '<li><b>Finish with a handoff.</b> Press End my shift and write what the next person needs. Your trainer reads it in the morning.</li></ol>'
      + '<div class="field-note" style="font-size:12.5px;margin-top:8px;line-height:1.5;">How each thing is learned: read it, watch it, do it with help, do it alone, then show it. A skill is signed off at "show it".</div></div>';
    let top = '';
    if (p) {
      top = '<div class="card" style="padding:14px 18px;margin-bottom:12px;"><div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;justify-content:space-between;">'
        + '<div style="font-weight:800;color:var(--navy);font-size:16px;">' + esc(p.name || p.email) + '</div>'
        + (owner() ? '<span><button class="secondary" style="padding:4px 12px;font-size:12.5px;" onclick="CTR.edit()">Change the plan</button> <button class="linklike" onclick="CTR.end()">End this plan</button></span>' : '') + '</div>'
        + '<div style="font-size:13.5px;line-height:1.7;margin-top:6px;">'
        + '<b>First day:</b> ' + esc(longDay(p.start) || 'Not set') + '<br>'
        + '<b>' + (isRemote(p) ? 'Training days' : 'Office days') + ':</b> ' + esc(dayList(p) || 'Not set') + (isRemote(p) ? ' (works remotely)' : '') + '<br>'
        + '<b>Trainer:</b> ' + esc(p.trainer ? nameOf(p.trainer) : 'Not set') + '</div></div>';
    } else top = noPlanHtml();
    const form = (owner() && (formOpen || !p)) ? formHtml(formOpen === 'edit' ? p : null) : '';
    const more = owner() && p && !formOpen ? '<div style="margin-top:12px;"><button class="secondary" onclick="CTR.startNew()">Start a plan for someone else</button></div>' : '';
    return top + stageHtml + rhythm + form + more;
  }

  let formOpen = '';
  function formHtml(p) {
    const staff = ((typeof DATA !== 'undefined' && DATA.coordinator_staff) || []).filter((s) => s && s.email && s.active !== false);
    const st = (p && p.stages) || [];
    const v = (x) => esc(x == null ? '' : x);
    return '<div class="card ct-form" id="ctForm" style="padding:16px 18px;margin:12px 0 0;"><div style="font-weight:800;color:var(--navy);font-size:15px;">' + (p ? 'Change the plan' : 'Start a training plan') + '</div>'
      + '<div class="ct-grid"><div><label for="ct_name">Their name</label><input id="ct_name" type="text" autocomplete="off" value="' + v(p && p.name) + '"></div>'
      + '<div><label for="ct_email">Their Hub sign-in email</label><input id="ct_email" type="email" autocomplete="off" value="' + v(p && p.email) + '"' + (p ? ' disabled' : '') + '></div>'
      + '<div><label for="ct_start">First day in the office</label><input id="ct_start" type="date" value="' + v(p && p.start) + '"></div>'
      + '<div><label for="ct_trainer">Trainer</label><select id="ct_trainer"><option value="">Choose</option>' + staff.map((s) => '<option value="' + esc(lc(s.email)) + '"' + (p && lc(p.trainer) === lc(s.email) ? ' selected' : '') + '>' + esc(s.name || s.email) + '</option>').join('') + '</select></div></div>'
      + '<label style="display:inline-flex;gap:6px;align-items:center;font-weight:700;"><input type="checkbox" id="ct_remote"' + (p && p.remote ? ' checked' : '') + '> Works remotely (leaves out home visits, folders and holding the office)</label>'
      + '<label>Office days during training (training days if remote)</label><div style="display:flex;gap:12px;flex-wrap:wrap;font-size:13.5px;">' + [1, 2, 3, 4, 5].map((d) => '<label style="display:inline-flex;gap:5px;align-items:center;margin:0;font-weight:600;"><input type="checkbox" class="ct_day" value="' + d + '"' + (p && (p.days || []).includes(d) ? ' checked' : '') + '>' + DN[d] + '</label>').join('') + '</div>'
      + '<label style="margin-top:14px;">The three stages: the hours, and the day each one starts</label>'
      + STAGE_HELP.map((h, i) => '<div style="display:grid;grid-template-columns:110px minmax(0,1fr) 160px;gap:8px;align-items:center;margin-top:6px;"><span style="font-size:13px;font-weight:700;">' + (i + 1) + '. ' + esc(h[0]) + '</span>'
          + '<input type="text" id="ct_hours' + i + '" placeholder="Days and hours" value="' + v(st[i] && st[i].hours) + '">'
          + (i ? '<input type="date" id="ct_from' + i + '" value="' + v(st[i] && st[i].from) + '" aria-label="Stage ' + (i + 1) + ' starts">' : '<span class="field-note" style="font-size:12px;">starts on the first day</span>') + '</div>').join('')
      + '<div id="ct_say" class="field-note" style="margin-top:10px;font-size:12.5px;">Pay is not kept here. Nothing is sent to anyone when you save.</div>'
      + '<div style="display:flex;gap:8px;margin-top:12px;"><button class="primary" onclick="CTR.save()">Save the plan</button><button class="secondary" onclick="CTR.cancel()">Cancel</button></div></div>';
  }

  function html() {
    const p = current();
    const body = view === 'week' ? viewWeek(p) : view === 'practice' ? (window.CTP ? CTP.html(p) : '<div class="card" style="padding:14px 18px;">Practice did not load. Reload the page.</div>') : view === 'program' ? viewProgram(p) : view === 'skills' ? viewSkills(p) : viewPlan(p);
    return css + headerHtml(p) + '<div id="ctBody">' + body + '</div>';
  }
  function render() { const el = document.getElementById('ctWrap'); if (!el) return; el.innerHTML = html(); }
  function show(k) {
    if (!VIEWS.some((v) => v[0] === k)) return;
    view = k; if (k !== 'program') openWeek = ''; if (k !== 'plan') formOpen = '';
    try { localStorage.setItem('cch_training_view', k); } catch (e) { /* private window */ }
    render();
  }
  function openWeekFn(k) { view = 'program'; openWeek = k; render(); const el = document.querySelector('.ct-week[data-week="' + k + '"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' }); }
  function pick(e) { who = lc(e); render(); }

  /* ---------------------------------------------------------------- saving ---- */
  const now = () => new Date().toISOString();
  async function tick(id, on) {
    const p = current(); if (!p || !canTick(p)) return;
    const next = Object.assign({}, p, { done: Object.assign({}, p.done || {}) });
    if (on) next.done[id] = { at: now(), by: myEmail() }; else delete next.done[id];
    try { await put(next); } catch (e) { console.error('training tick:', e); say('That did not save. Try again.'); }
    render();
  }
  async function sign(id, on) {
    const p = current(); if (!p || !canSign(p)) return;
    const s = signOf(p.email) || { id: 'trainsign:' + lc(p.email), kind: 'trainsign', email: lc(p.email), signed: {}, notes: [] };
    const next = Object.assign({}, s, { signed: Object.assign({}, s.signed || {}) });
    if (on) next.signed[id] = { by: myEmail(), at: now() }; else delete next.signed[id];
    try { await put(next); } catch (e) { console.error('training sign-off:', e); say('That did not save. Try again.'); }
    render();
  }
  async function addNote(wk) {
    const p = current(); if (!p || !canTick(p)) return;
    const el = document.getElementById('ctNote_' + wk); const text = String(el && el.value || '').trim().slice(0, 1200); if (!text) return;
    const n = { week: wk, by: myEmail(), at: now(), text };
    try {
      if (lc(p.email) === myEmail()) await put(Object.assign({}, p, { notes: (p.notes || []).concat([n]) }));
      else { const s = signOf(p.email) || { id: 'trainsign:' + lc(p.email), kind: 'trainsign', email: lc(p.email), signed: {}, notes: [] }; await put(Object.assign({}, s, { notes: (s.notes || []).concat([n]) })); }
    } catch (e) { console.error('training note:', e); say('That did not save. Try again.'); }
    render();
  }
  function startNew() { formOpen = 'new'; view = 'plan'; render(); }
  function edit() { formOpen = 'edit'; view = 'plan'; render(); }
  function cancel() { formOpen = ''; render(); }
  async function save() {
    if (!owner()) return;
    const g = (id) => { const el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; };
    const sayEl = document.getElementById('ct_say'); const bad = (m) => { sayEl.innerHTML = '<b style="color:#A83A2F;">' + esc(m) + '</b>'; };
    const editing = formOpen === 'edit' ? current() : null;
    const email = editing ? lc(editing.email) : lc(g('ct_email')), name = g('ct_name'), start = g('ct_start'), trainer = lc(g('ct_trainer'));
    const days = [...document.querySelectorAll('.ct_day:checked')].map((x) => +x.value);
    if (!name) return bad('Add their name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Add the email they sign in to the Hub with.');
    if (!parse(start)) return bad('Pick their first day in the office.');
    if (!days.length) return bad('Tick the days they train.');
    const remote = !!(document.getElementById('ct_remote') || {}).checked;
    if (!trainer) return bad('Choose who trains them.');
    if (trainer === email) return bad('The trainer has to be someone else.');
    if (!editing && planOf(email) && !planOf(email).ended_at) return bad('They already have a plan. Use Change the plan.');
    const stages = STAGE_HELP.map((h, i) => ({ name: h[0], hours: g('ct_hours' + i).slice(0, 160), from: i ? (parse(g('ct_from' + i)) ? g('ct_from' + i) : '') : start }));
    const old = editing || planOf(email) || {};
    const next = Object.assign({}, old, { id: 'training:' + email, kind: 'training', email, name, trainer, start, days, stages, remote,
      done: old.done || {}, notes: old.notes || [], started_by: old.started_by || myEmail(), started_at: old.started_at || now(), ended_at: '' });
    try {
      await put(next);
      try { if (typeof opEvent === 'function') opEvent('setting_changed', { item_id: next.id, area: 'training', summary: (editing ? 'Changed' : 'Started') + ' the coordinator training plan for ' + name }); } catch (e) { /* the record of changes is extra */ }
    } catch (e) { console.error('training plan:', e); return bad('That did not save. Try again.'); }
    formOpen = ''; who = email; render();
  }
  async function end() {
    const p = current(); if (!p || !owner()) return;
    if (!confirm('End the training plan for ' + (p.name || p.email) + '? What they finished is kept.')) return;
    try { await put(Object.assign({}, p, { ended_at: now(), ended_by: myEmail() })); } catch (e) { console.error('training end:', e); say('That did not save. Try again.'); }
    who = ''; render();
  }

  /* ---------------------------------------------------------------- going elsewhere ---- */
  function openProcedure(id) {
    if (typeof switchTab === 'function') switchTab('sops');
    setTimeout(function () { try { if (typeof sopOpenDoc === 'function') sopOpenDoc(id); } catch (e) { console.error('training procedure:', e); } }, 60);
  }
  function openProgram(tab) {
    if (typeof switchTab === 'function') switchTab('sopref');
    setTimeout(function () { try { if (typeof sopRefShow === 'function') sopRefShow(tab || 'all'); } catch (e) { console.error('training program:', e); } }, 60);
  }
  function openGuide(anchor) {
    if (typeof switchTab === 'function') switchTab('sopref');
    setTimeout(function () { try { const f = document.getElementById('sopRefFrame'); if (f && typeof ccHubFrame === 'function') ccHubFrame(f, 'guide.html?in=hub' + (anchor ? '#' + anchor : '')); } catch (e) { console.error('training guide:', e); } }, 60);
  }
  function openHowTo(v) {
    if (typeof switchTab === 'function') switchTab('howto');
    setTimeout(function () { try { if (window.HT) HT.show(v); } catch (e) { console.error('training how-to:', e); } }, 60);
  }

  window.CTR = { WEEKS, SKILLS, VIEWS, render, show, openWeek: openWeekFn, pick, tick, sign, addNote, startNew, edit, cancel, save, end,
    openProcedure, openHowTo, openProgram, openGuide, view: () => view, current, weekNow, officeDays, totals, weekIds, plans, IN_PERSON, IN_PERSON_SKILLS };
})();
