/* =============================================================================
   HOME VISIT ON THE IPAD (Samantha 2026-10-29: "add assessment that we can complete during the assessment ... record the
   care assessment ... a lot of info is discussed and i dont want to miss anything"). Her 2026 paper form ("CC Client Home
   Assessment Form 2026.docx") as one full-screen view the coordinator fills while talking with the family. Mockup she
   approved: https://claude.ai/artifact/QRg36KyoT7FTZJVDfjhTun.
   Her answers (2026-10-29): 3 care levels that match the rates (not the paper's 4); payment is Private, LTC, VA, GUIDE and
   Medicaid points to CDS; the agreement is signed at the visit; the recording later fills EMPTY boxes for review only.

   ONE RECORD: the visit is the family's care assessment (DATA.care_assessments, the same record the Care tab and the
   Start of Care "Care Assessment" step read). The paper form's answers live in its `visit` object; the fields the old
   assessment pop-up already had (address, doctor, hospital, coordinator, visit date) stay where they were. Finishing the
   visit sets the status the Start of Care step checks ("Completed — Awaiting Plan"). Saves as it goes.
   The payer has one editor (the intake's Payer tab), so the visit shows it and never changes it.
   Recording uses the Hub's own recorder ("Recording the room": consent first, saved on the iPad as it goes, private upload).
   Nothing here texts or emails anyone, and nothing goes to AxisCare.
   Rates and minimums are Hub settings (ops_settings.visit_rates / visit_minimums, Settings > Home visit).
   ============================================================================= */
(function () {
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = () => (typeof DATA !== 'undefined' && DATA) || {};
  const me = () => (typeof ME !== 'undefined' && ME && (ME.name || ME.email)) || '';
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const ask = (m) => (typeof ccConfirm === 'function' ? ccConfirm(m) : Promise.resolve(confirm(m)));
  const toast = (m) => { try { ccToast(m); } catch (e) {} };

  const SECS = ['Start the visit', 'Their story', 'Health', 'Daily activities', 'Preferences', 'Schedule and level', 'Sign-off'];
  const NCF = [['not_needed', 'Not needed'], ['helps', 'Client helps'], ['full', 'Full help']];
  const NSF = [['none', 'None'], ['standby', 'Stand-by'], ['full', 'Full help']];
  const NF = [['none', 'None'], ['full', 'Full help']];
  const NVSF = [['none', 'None'], ['cues', 'Verbal cues'], ['standby', 'Stand-by'], ['full', 'Full help']];
  const NVF = [['none', 'None'], ['cues', 'Verbal cues'], ['full', 'Full help']];
  /* her paper's rows, in her order, with her questions */
  const HOUSE = [
    ['light_house', 'Light housekeeping', '"How are you managing with housekeeping, things like sweeping, dishes, or keeping the home tidy?"', NCF],
    ['heavy_house', 'Heavy housekeeping', '"What about heavier tasks, like mopping, lifting laundry baskets, or taking out the trash?"', NCF],
    ['laundry', 'Laundry', '"Is it easy to get clothes to the washer and dryer and put everything away?"', NCF],
    ['meals', 'Meal preparation', '"Do you feel comfortable making meals on your own? Do you plan meals or make grocery lists?"', NCF],
    ['meds', 'Medication reminders', '"Do you use a pillbox, set reminders, or could gentle reminders be helpful?"', [['needed', 'Reminders needed'], ['not_needed', 'Not needed']]],
    ['shopping', 'Shopping and errands', '"Do you go yourself, or does someone help you?"', NSF],
    ['transport', 'Transportation', '"How do you usually get to appointments or places you need to go?"', NF],
    ['appts', 'Managing appointments', '"Would reminders or help organizing your schedule be useful?"', NF],
    ['phone', 'Phone and computer', 'Answer the phone, check voicemail, carry and charge the phone or medical alert, help with the computer', NF],
  ];
  const PERSONAL = [
    ['mobility', 'Mobility and walking', '"Do you walk steadily, or do you use anything like a cane or walker?"', NSF],
    ['transfers', 'Transfers', '"Getting in and out of bed, standing up from chairs, on and off the toilet?" Shower rails? Bed rails?', NSF],
    ['bathing', 'Bathing and showering', '"Do you feel safe and steady, or would help make it easier?"', NSF],
    ['toileting', 'Toileting', '"Have you noticed any leaking, urgency, or occasional accidents, even small ones?"', NSF],
    ['dressing', 'Dressing and grooming', 'Clothes, shoes, buttons and zippers, hair, teeth, flossing, shaving', NVSF],
    ['eating', 'Eating', '"Do you ever need help cutting food or staying steady while eating?"', NVF],
  ];
  const EQUIP = ['Cane', 'Walker', 'Wheelchair', 'Shower chair', 'Grab bars', 'Medical alert device', 'Gait belt', 'Bed rails', 'Hoyer lift'];
  const DAYS = [['sun', 'Sun'], ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat']];
  const LEVELS = [
    ['wellness', 'Wellness Care', 'Companionship, activities and outings, light housekeeping and laundry, meal preparation, medication reminders, errands and transportation, safety check-ins.'],
    ['personal', 'Personal Care', 'Everything in Wellness, plus hands-on help with bathing, dressing, grooming and toileting, mobility and transfers, and respite for family.'],
    ['advanced', 'Advanced Care', 'Complete personal care for complex needs, including bed-bound clients, lift transfers (Hoyer), dementia and behavior support, and family coordination.'],
  ];
  const OUTCOMES = [['ready', 'Ready to start'], ['follow_up', 'Needs follow-up'], ['not_ready', 'Family not ready'], ['cannot', "Can't accept"]];
  const PAYERS = [['private', 'Private pay'], ['ltc', 'Long-term care insurance'], ['va', 'VA benefits'], ['guide', 'Medicare GUIDE']];

  function rates() { const r = (D().ops_settings || {}).visit_rates || {}; return { wellness: Number(r.wellness) || 30, personal: Number(r.personal) || 32, advanced: Number(r.advanced) || 34 }; }
  function mins() { const m = (D().ops_settings || {}).visit_minimums || {}; return { visit: Number(m.visit) || 4, week: Number(m.week) || 8 }; }

  const ST = { a: null, lead: null, sec: 0, saveT: null, tick: null };

  /* ---------- the record ---------- */
  const leadName = (l) => (l && !l.client_name_not_provided && (l.client_first_name || l.client_last_name)) ? ((l.client_first_name || '') + ' ' + (l.client_last_name || '')).trim() : (l ? ((l.first_name || '') + ' ' + (l.last_name || '')).trim() : '');
  const callerName = (l) => l ? ((l.first_name || '') + ' ' + (l.last_name || '')).trim() : '';
  const isSelf = (l) => !!(l && /^(self|client)$/i.test(String(l.relationship || '').trim()));
  function blankVisit(l) {
    const att = [];
    if (l) {
      att.push({ name: leadName(l), rel: 'Client', role: 'client' });
      if (!isSelf(l) && callerName(l)) att.push({ name: callerName(l), rel: l.relationship || 'Family', role: 'primary' });
    }
    return {
      v: 1,
      attendees: att,
      part1: {
        set_by: l ? (isSelf(l) ? 'Client' : 'Loved one: ' + callerName(l) + (l.relationship ? ', ' + l.relationship : '')) : '',
        phone_dob: l ? [l.client_phone || '', l.client_dob || ''].filter(Boolean).join('  ·  ') : '',
        hours_days: l ? [l.number_of_hours ? l.number_of_hours + ' hours' : '', l.days_needed || '', l.times_needed || ''].filter(Boolean).join(', ') : '',
        caregiver_in_mind: '',
      },
      story: { trigger: l ? (l.reason || '') : '', overview: '', morning: '', afternoon: '', evening: '' },
      goals: [{ text: '' }, { text: '' }, { text: '' }], top_goal: 0,
      conditions: [{}, {}],
      memory: '', supervision: '', pain: '', pain_where: '', pain_easier: '',
      allergies: '', pharmacy: '',
      equipment: [], equipment_other: '',
      acts: {}, meds: {},
      prefs: {
        gender: '', personality: '', skills: [], language: '', other: '',
        contact: l && !isSelf(l) ? { name: callerName(l), rel: l.relationship || '', phone: l.phone || '', email: l.email || '' } : { name: '', rel: '', phone: '', email: '' },
        change_to: '', method: '', time: '', group_text: '', group_include: [], checkin_to: '', survey_by: '',
      },
      week: {}, start: '', level: '', rate: '', rate_typed: false, comments: '', outcome: '',
      sign: { client: { png: '', name: '', date: '' }, assessor: { png: '', name: me(), date: '' } },
    };
  }
  function newRecord(l) {
    const a = {
      id: uid(), lead_id: l ? l.id : null,
      client_name: leadName(l),
      axiscare_client_id: l ? String(l.axiscare_client_id || '') : '',
      visit_date: today(), visit_time: '', coordinator: me(),
      address: l && l.client_address ? (l.client_address + (l.client_city ? ', ' + l.client_city : '') + (l.client_state ? ', ' + l.client_state : '') + ' ' + (l.client_zip || '')).trim() : '',
      physician_name: (l && l.physician_name) || '', physician_phone: (l && l.physician_phone) || '', preferred_hospital: (l && l.preferred_hospital) || '',
      payer: '', transcript_source: 'Recorded in the hub', transcript_link: '', transcript_text: '',
      status: 'Scheduled', ai_summary: '', pushed_to_axiscare: false, pushed_at: null, created_at: new Date().toISOString(),
      visit: blankVisit(l),
    };
    return a;
  }
  /* an older assessment (from the pop-up) gets the visit form the first time it opens here */
  function ensureVisit(a, l) {
    if (!a.visit) a.visit = blankVisit(l);
    const v = a.visit, b = blankVisit(l);
    for (const k of Object.keys(b)) if (v[k] == null) v[k] = b[k];
    for (const k of Object.keys(b.prefs)) if (v.prefs[k] == null) v.prefs[k] = b.prefs[k];
    return a;
  }

  /* dotted paths into the record: "visit.story.morning", "physician_name", "visit.acts.bathing.level" */
  function get(path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ST.a); }
  function set(path, val) {
    const ks = path.split('.'); let o = ST.a;
    for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = val;
  }

  function saveSoon() {
    clearTimeout(ST.saveT);
    const s = document.getElementById('hvSaved'); if (s) s.textContent = 'Saving…';
    ST.saveT = setTimeout(saveNow, 1200);
  }
  async function saveNow() {
    clearTimeout(ST.saveT); ST.saveT = null;
    if (!ST.a) return;
    ST.a.visit.saved_at = new Date().toISOString(); ST.a.visit.saved_by = me();
    const i = (D().care_assessments || []).findIndex((x) => x.id === ST.a.id);
    if (i >= 0) DATA.care_assessments[i] = ST.a; else (DATA.care_assessments = DATA.care_assessments || []).push(ST.a);
    try { await persist('care_assessments', ST.a); } catch (e) {}
    const pill = document.getElementById('syncPill'), s = document.getElementById('hvSaved');
    if (s) s.textContent = pill && /Not saved|✗|⚠/.test(pill.textContent) ? 'Not saved yet. It will try again.' : 'Saved ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  /* ---------- small pieces ---------- */
  const field = (path, ph, opt) => {
    opt = opt || {};
    const v = get(path), cls = 'hv-f' + (opt.from ? ' hv-from' : '') + ((ST.a.visit.heard || {})[path] ? ' hv-heard' : '');
    return opt.rows ? '<textarea class="' + cls + '" rows="' + opt.rows + '" data-hv="' + E(path) + '" placeholder="' + E(ph || '') + '">' + E(v || '') + '</textarea>'
      : '<input class="' + cls + '" ' + (opt.type ? 'type="' + opt.type + '"' : '') + ' data-hv="' + E(path) + '" value="' + E(v || '') + '" placeholder="' + E(ph || '') + '"' + (opt.attrs || '') + '>';
  };
  const lab = (t, inner, note) => '<label class="hv-l">' + E(t) + (note ? '<span class="hv-n">' + E(note) + '</span>' : '') + inner + '</label>';
  const pills = (path, opts, multi) => '<div class="hv-seg">' + opts.map((o) => {
    const cur = get(path), on = multi ? (Array.isArray(cur) && cur.indexOf(o[0]) > -1) : cur === o[0];
    return '<button type="button" class="' + (on ? 'on' : '') + '" data-hvp="' + E(path) + '" data-v="' + E(o[0]) + '"' + (multi ? ' data-multi="1"' : '') + ' aria-pressed="' + on + '">' + E(o[1]) + '</button>';
  }).join('') + '</div>';
  const yn = (path) => pills(path, [['yes', 'Yes'], ['no', 'No']]);
  const card = (title, inner, right) => '<section class="hv-card"><div class="hv-ch"><h2>' + E(title) + '</h2>' + (right || '') + '</div>' + inner + '</section>';

  /* ---------- the seven screens ---------- */
  function sec1() {
    const v = ST.a.visit, l = ST.lead;
    return '<div class="hv-h"><div><h1>Home visit with ' + E(ST.a.client_name || 'the client') + '</h1>'
      + '<div class="hv-sub">' + (l ? 'Lead' + (l.status ? ': ' + E(l.status) : '') + ' · ' : '') + 'Coordinator: ' + E(ST.a.coordinator || me()) + '</div></div></div>'
      + '<div class="hv-cols">'
      + '<div class="hv-stack">'
      + card("Who's here today", '<div id="hvPeople">' + peopleHtml() + '</div>', '<button type="button" class="hv-b2" data-hva="addperson">+ Add someone</button>')
      + card('Already known from the phone call',
        '<p class="hv-n" style="margin:0">Check these with the family and change anything that\'s wrong.</p><div class="hv-g2">'
        + lab('Address', field('address', 'Street, town', { from: !!ST.a.address }))
        + lab('Phone and date of birth', field('visit.part1.phone_dob', '', { from: !!v.part1.phone_dob }))
        + lab('Who set the visit', field('visit.part1.set_by', 'Client, or the loved one and how they are related', { from: !!v.part1.set_by }))
        + lab('Hours and days hoped for', field('visit.part1.hours_days', 'About how many hours, which days', { from: !!v.part1.hours_days }))
        + lab('Caregiver in mind?', field('visit.part1.caregiver_in_mind', 'Name, and what to share with the family'))
        + lab('Visit date', field('visit_date', '', { type: 'date' }))
        + '</div>')
      + '</div>'
      + '<section class="hv-card" style="align-self:start">'
      + '<div class="hv-ch"><h2>Record the visit</h2></div>'
      + '<div class="hv-n" style="font-size:14px">Read this out loud before you start:</div>'
      + '<blockquote class="hv-q">"With everyone\'s OK, I\'d like to record our conversation today so I don\'t miss anything you tell me. The recording is written out by software and summarized to help me review it."</blockquote>'
      + '<div id="hvRec"></div>'
      + '<div class="hv-n">A private moment? Tap Pause at the top, then Resume. A long visit is fine: it saves and sends in 10-minute parts as you go, so keep the iPad on this screen and don\'t lock it.</div>'
      + '</section></div>';
  }
  function peopleHtml() {
    const rows = ST.a.visit.attendees || [];
    return rows.map((p, i) => '<div class="hv-person"><span class="hv-av">' + E(String(p.name || '?').split(/\s+/).map((w) => w[0] || '').join('').slice(0, 2).toUpperCase()) + '</span>'
      + '<input class="hv-f hv-pn" data-hv="visit.attendees.' + i + '.name" value="' + E(p.name || '') + '" placeholder="Name" aria-label="Name">'
      + '<input class="hv-f hv-pr" data-hv="visit.attendees.' + i + '.rel" value="' + E(p.rel || '') + '" placeholder="Daughter, son, friend..." aria-label="How they are related">'
      + pills('visit.attendees.' + i + '.role', [['client', 'Client'], ['primary', 'Primary contact'], ['family', 'Family'], ['poa', 'Legal rep']])
      + '<button type="button" class="hv-x" data-hva="delperson" data-i="' + i + '" aria-label="Remove ' + E(p.name || 'this person') + '">×</button></div>').join('')
      || '<div class="hv-n">Add everyone in the room, and anyone on the phone.</div>';
  }
  function sec2() {
    const v = ST.a.visit;
    return '<h1>Their story</h1><div class="hv-sub">Let the conversation flow. Jot what stands out; the recording catches the rest.</div>'
      + '<div class="hv-g2">'
      + card('What prompted the call', '<p class="hv-ask">"What made you feel in-home care was needed now, or a change in agencies?"</p>' + field('visit.story.trigger', '', { rows: 4, from: !!v.story.trigger }))
      + card("What's been going on lately", '<p class="hv-ask">"To start, can you tell me a little about what\'s been going on? What are the main concerns or changes you\'ve noticed?"</p>' + field('visit.story.overview', '', { rows: 4 }))
      + '</div>'
      + card('A day at home', '<p class="hv-ask">When you know their day, the daily activities flow: "You mentioned mornings are difficult. How does bathing go for you?"</p><div class="hv-g3">'
        + lab('Morning', field('visit.story.morning', '', { rows: 5 }), 'Wake time? Breakfast? Medications? Help with the routine?')
        + lab('Afternoon', field('visit.story.afternoon', '', { rows: 5 }), 'Appointments? Interests? Outings? Lunch? Nap or rest?')
        + lab('Evening', field('visit.story.evening', '', { rows: 5 }), 'Bedtime? Dinner? Medications? Trouble dressing or bathing?')
        + '</div>')
      + '<div class="hv-g2">'
      + card('Top 3 goals', '<p class="hv-n" style="margin:0">Tap the star on the one that matters most.</p>' + [0, 1, 2].map((i) => '<div class="hv-goal"><b>' + (i + 1) + '</b>' + field('visit.goals.' + i + '.text', 'Goal ' + (i + 1))
        + '<button type="button" class="hv-star' + (v.top_goal === i ? ' on' : '') + '" data-hva="star" data-i="' + i + '" aria-pressed="' + (v.top_goal === i) + '">' + (v.top_goal === i ? 'Most important' : 'Star') + '</button></div>').join(''))
      + card('Life story', '<div id="hvLife"><div class="hv-n">Loading…</div></div>', '<span class="hv-tag">Saves to Home &amp; Life</span>')
      + '</div>';
  }
  function condHtml() {
    return '<div class="hv-cond hv-th"><span>CONDITION</span><span>ABOUT WHEN</span><span>HOW IT AFFECTS DAILY LIFE</span><span></span></div>'
      + (ST.a.visit.conditions || []).map((c, i) => '<div class="hv-cond">' + field('visit.conditions.' + i + '.name', 'Condition') + field('visit.conditions.' + i + '.onset', 'Year') + field('visit.conditions.' + i + '.effect', 'How it affects the day')
        + '<button type="button" class="hv-x" data-hva="delcond" data-i="' + i + '" aria-label="Remove this condition">×</button></div>').join('');
  }
  function sec3() {
    const v = ST.a.visit;
    return '<h1>Health</h1>'
      + card('Health conditions', '<div id="hvConds">' + condHtml() + '</div>', '<button type="button" class="hv-b2" data-hva="addcond">+ Add a condition</button>')
      + '<div class="hv-g2">'
      + card('Memory, safety and pain',
        '<div class="hv-row"><b>Memory concerns?</b>' + yn('visit.memory') + '</div>'
        + '<div class="hv-row"><b>Needs supervision for safety?</b>' + yn('visit.supervision') + '</div>'
        + '<div class="hv-row"><b>Has pain?</b>' + yn('visit.pain') + '</div>'
        + lab('Where?', field('visit.pain_where'))
        + lab('What makes it harder or easier?', field('visit.pain_easier')))
      + card('Allergies, doctors and pharmacy',
        lab('Allergies', field('visit.allergies', 'List every one', { rows: 2 }), 'Medicines and food. Specify all.')
        + '<div class="hv-g2">' + lab('Primary doctor', field('physician_name', 'Name', { from: !!ST.a.physician_name })) + lab("Doctor's phone", field('physician_phone', '', { from: !!ST.a.physician_phone })) + '</div>'
        + '<div class="hv-g2">' + lab('Preferred hospital', field('preferred_hospital', '', { from: !!ST.a.preferred_hospital })) + lab('Preferred pharmacy', field('visit.pharmacy')) + '</div>')
      + '</div>'
      + card('Mobility and equipment', '<p class="hv-n" style="margin:0">Tap everything they use or have in the home.</p>' + pills('visit.equipment', EQUIP.map((x) => [x, x]), true) + lab('Other', field('visit.equipment_other')));
  }
  function actRow(r) {
    const p = 'visit.acts.' + r[0];
    return '<div class="hv-act"><div><div class="hv-an">' + E(r[1]) + '</div><div class="hv-ask">' + E(r[2]) + '</div></div>' + pills(p + '.level', r[3]) + field(p + '.note', 'Notes') + '</div>';
  }
  function sec4() {
    return '<h1>Daily activities</h1><div class="hv-sub">"These help us see what\'s going well and where a caregiver can make life easier and safer for you."</div>'
      + card('Around the house', '<div class="hv-act hv-th"><span>ACTIVITY</span><span>LEVEL OF NEED</span><span>NOTES</span></div>'
        + HOUSE.map((r) => actRow(r) + (r[0] === 'meds' ? '<div class="hv-g3 hv-medq">'
          + lab('Who fills the pill organizer?', field('visit.meds.fills'))
          + lab('Needs our nurse (RN/LPN)?', pills('visit.meds.nurse', [['yes', 'Yes'], ['no', 'No'], ['later', 'Ask later']]))
          + lab('Where is the organizer kept?', field('visit.meds.where'))
          + lab('Can the client know where it is?', yn('visit.meds.may_know'))
          + lab('Where are prescriptions refilled?', field('visit.meds.refills'))
          + '</div>' : '')).join(''))
      + card('Personal care', '<div class="hv-act hv-th"><span>ACTIVITY</span><span>LEVEL OF NEED</span><span>NOTES</span></div>'
        + PERSONAL.map((r) => actRow(r) + (r[0] === 'toileting' ? '<div class="hv-row hv-medq"><b>Changing Depends?</b>' + yn('visit.acts.toileting.depends') + '</div>' : '')).join(''));
  }
  function sec5() {
    const c = 'visit.prefs.';
    const others = (ST.a.visit.attendees || []).filter((p) => p.name).map((p) => [p.name, p.name]);
    return '<h1>Caregiver and contact preferences</h1>'
      + '<div class="hv-g2">'
      + card('The caregiver',
        '<b class="hv-q2">Caregiver gender</b>' + pills(c + 'gender', [['male', 'Male'], ['female', 'Female'], ['none', 'No preference']])
        + lab('Personality they\'d click with', field(c + 'personality', 'Or "no preference"'))
        + '<b class="hv-q2">Skills needed</b>' + pills(c + 'skills', [['dementia', 'Dementia care'], ['lift', 'Lift or transfer'], ['language', 'Language']], true)
        + lab('Language', field(c + 'language', 'If a language is needed'))
        + lab('Anything else they asked for', field(c + 'other')))
      + card('Care updates',
        lab('Main contact for updates', '<div class="hv-g2">' + field(c + 'contact.name', 'Name') + field(c + 'contact.rel', 'Relationship') + field(c + 'contact.phone', 'Phone', { type: 'tel' }) + field(c + 'contact.email', 'Email', { type: 'email' }) + '</div>')
        + '<b class="hv-q2">Who to call about schedule or caregiver changes</b>' + pills(c + 'change_to', [['client', 'Client'], ['family', 'Family'], ['other', 'Other']])
        + '<b class="hv-q2">Best way to reach the client</b>' + pills(c + 'method', [['text', 'Text'], ['call', 'Phone call'], ['email', 'Email'], ['note', 'Written note']])
        + '<b class="hv-q2">Best time to reach them</b>' + pills(c + 'time', [['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening']]))
      + '</div>'
      + card('Keeping everyone in the loop', '<div class="hv-g3">'
        + '<div class="hv-stack"><b class="hv-q2">Group text for updates?</b><span class="hv-n">Schedule changes, caregiver updates</span>' + pills(c + 'group_text', [['yes', 'Yes, group text'], ['no', 'Contact each person']])
        + (others.length ? '<span class="hv-n">Include:</span>' + pills(c + 'group_include', others, true) : '') + '</div>'
        + '<div class="hv-stack"><b class="hv-q2">Routine check-ins go to</b><span class="hv-n">"We check in regularly to be sure care is going well."</span>' + pills(c + 'checkin_to', [['client', 'Client'], ['family', 'Family'], ['both', 'Both']]) + '</div>'
        + '<div class="hv-stack"><b class="hv-q2">Surveys by</b><span class="hv-n">How they\'d like to hear from us</span>' + pills(c + 'survey_by', [['mail', 'Mail'], ['email', 'Email'], ['text', 'Text']]) + '</div>'
        + '</div><div class="hv-n">These are saved as their wishes. Nothing is sent to the family from this screen.</div>');
  }
  /* hours of one day's visit, from "09:00" to "13:00" */
  function dayHours(d) { const w = (ST.a.visit.week || {})[d] || {}; if (!w.from || !w.to) return 0; const m = (t) => { const p = String(t).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }; let h = (m(w.to) - m(w.from)) / 60; if (h < 0) h += 24; return Math.round(h * 4) / 4; }
  function weekSummary() {
    const hs = DAYS.map((d) => dayHours(d[0])).filter((h) => h > 0), tot = hs.reduce((a, b) => a + b, 0), mn = mins();
    if (!hs.length) return '<span class="hv-n">Add start and end times on the days they want care.</span>';
    const short = hs.some((h) => h < mn.visit) || tot < mn.week;
    return '<span><b>' + tot + ' hours a week</b>, ' + hs.length + ' visit' + (hs.length === 1 ? '' : 's') + '</span>'
      + '<span class="' + (short ? 'hv-warn' : 'hv-ok') + '">' + (short ? 'Below the ' + mn.visit + ' hours a visit and ' + mn.week + ' hours a week minimum' : 'Meets the ' + mn.visit + ' hours a visit and ' + mn.week + ' hours a week minimum') + '</span>';
  }
  /* the level her daily-activities answers point to: hands-on personal care is Personal; a lift or full transfers is Advanced */
  function suggestLevel() {
    const a = ST.a.visit.acts || {}, lv = (k) => (a[k] || {}).level || '';
    const eq = ST.a.visit.equipment || [];
    if (eq.indexOf('Hoyer lift') > -1 || lv('transfers') === 'full' || lv('mobility') === 'full') return 'advanced';
    if (['bathing', 'toileting', 'dressing', 'transfers', 'mobility', 'eating'].some((k) => ['standby', 'full'].indexOf(lv(k)) > -1)) return 'personal';
    if (Object.keys(a).some((k) => lv(k))) return 'wellness';
    return '';
  }
  function levelHtml() {
    const r = rates(), cur = ST.a.visit.level, sug = suggestLevel();
    return '<div class="hv-g3">' + LEVELS.map((L) => '<button type="button" class="hv-lvl' + (cur === L[0] ? ' on' : '') + '" data-hva="level" data-v="' + L[0] + '" aria-pressed="' + (cur === L[0]) + '">'
      + '<span class="hv-ln">' + E(L[1]) + (sug === L[0] ? ' <span class="hv-tag hv-sug">Suggested</span>' : '') + '</span><span class="hv-price">$' + r[L[0]] + '<small> /hr</small></span><span class="hv-desc">' + E(L[2]) + '</span></button>').join('') + '</div>';
  }
  function payerHtml() {
    const fs = ST.lead && ST.lead.funding_source;
    return '<div class="hv-seg">' + PAYERS.map((p) => '<button type="button" disabled class="' + (fs === p[0] ? 'on' : '') + '" aria-pressed="' + (fs === p[0]) + '">' + E(p[1]) + '</button>').join('') + '</div>'
      + '<div class="hv-n">' + (fs ? 'From the intake. Change it on the Payer tab after the visit.' : 'Not set yet. Set it on the Payer tab after the visit.') + ' Family asks about Medicaid? Refer them to Caring Companions Direct Services (CDS).</div>';
  }
  function sec6() {
    const v = ST.a.visit;
    return '<h1>Schedule, payment and care level</h1>'
      + card('Care proposal: days and times', '<div class="hv-week">' + DAYS.map((d) => '<div class="hv-day' + (dayHours(d[0]) ? ' on' : '') + '"><b>' + d[1] + '</b>'
        + field('visit.week.' + d[0] + '.from', '', { type: 'time', attrs: ' aria-label="' + d[1] + ' start"' }) + field('visit.week.' + d[0] + '.to', '', { type: 'time', attrs: ' aria-label="' + d[1] + ' end"' }) + '</div>').join('') + '</div>'
        + '<div class="hv-sum" id="hvWeekSum">' + weekSummary() + '</div>' + lab('Hoped-for start', field('visit.start', '', { type: 'date', attrs: ' style="max-width:220px"' })))
      + card('How care will be paid', payerHtml())
      + card('Care level', '<div id="hvLevels">' + levelHtml() + '</div>' + '<div class="hv-row" style="justify-content:flex-start;gap:14px">' + lab('Rate quoted ($ an hour)', field('visit.rate', '', { attrs: ' inputmode="decimal" style="max-width:170px" id="hvRate"' })) + '<span class="hv-n">Fills in from the level. Change it only if you quoted something different.</span></div>')
      + '<div class="hv-g2">'
      + card('General comments', field('visit.comments', 'Anything else to remember or recommend', { rows: 3 }))
      + card('How did the visit end?', pills('visit.outcome', OUTCOMES) + '<div class="hv-n">You record it on Start of Care, step 3, when you finish the visit. This keeps it in mind until then.</div>')
      + '</div>';
  }
  function sigPad(who, h) {
    const s = ST.a.visit.sign[who] || {};
    return '<div class="hv-pad"><canvas data-sig="' + who + '" height="' + h + '" aria-label="Sign here with a finger" role="img"></canvas>'
      + (s.png ? '' : '<span class="hv-padhint">Sign here</span>') + '<button type="button" class="hv-b2 hv-clear" data-hva="clearsig" data-v="' + who + '">Clear</button></div>';
  }
  function agreeHtml() {
    const v = ST.a.visit, L = LEVELS.find((x) => x[0] === v.level), days = DAYS.filter((d) => dayHours(d[0]));
    const fmt = (t) => { if (!t) return ''; const p = t.split(':'), h = +p[0]; return ((h % 12) || 12) + ':' + p[1] + (h < 12 ? 'am' : 'pm'); };
    const sched = days.map((d) => d[1] + ' ' + fmt(v.week[d[0]].from) + ' to ' + fmt(v.week[d[0]].to)).join(', ');
    const rows = [['Care level and rate', L ? L[1] + (v.rate ? ', $' + String(v.rate).replace(/^\$/, '') + ' an hour' : '') : 'Pick a level on the last screen'],
      ['Schedule', sched || 'No days yet'], ['Hoped-for start', v.start || 'Not set'],
      ['Contacts', (v.attendees || []).filter((p) => p.role !== 'client' && p.name).map((p) => p.name).join(', ') || 'None added']];
    const ax = String(ST.a.axiscare_client_id || (ST.lead && ST.lead.axiscare_client_id) || '').trim();
    return '<div>' + rows.map((r) => '<div class="hv-li"><span>' + E(r[0]) + '</span><span>' + E(r[1]) + '</span></div>').join('') + '</div>'
      + (ax ? '<a class="hv-b hv-big" href="agreement.html?ax=' + encodeURIComponent(ax) + '&cn=' + encodeURIComponent(ST.a.client_name || '') + '" target="_blank" rel="noopener">Open the agreement on this iPad</a>'
        + '<div class="hv-n">Set the level and rate on its first screen from what is above.</div>'
        : '<div class="hv-note">Signing before they are in AxisCare comes in the next update. For now the agreement opens once the client is set up in AxisCare (the Client Care Agreement card on their Start of Care tab), or use the paper agreement.</div>');
  }
  function sec7() {
    const v = ST.a.visit;
    return '<h1>Sign-off and agreement</h1><div class="hv-g2">'
      + card('Sign the assessment',
        '<div class="hv-l">Client or legal representative</div>' + sigPad('client', 120)
        + '<div class="hv-g2">' + lab('Printed name', field('visit.sign.client.name', 'Name, and relationship if not the client')) + lab('Date', field('visit.sign.client.date', '', { type: 'date' })) + '</div>'
        + '<div class="hv-l" style="margin-top:6px">Assessor</div>' + sigPad('assessor', 96)
        + '<div class="hv-g2">' + lab('Printed name', field('visit.sign.assessor.name')) + lab('Date', field('visit.sign.assessor.date', '', { type: 'date' })) + '</div>'
        + '<div class="hv-n">This assessment is confidential and stored in keeping with HIPAA and state privacy laws.</div>')
      + card('Client Care Agreement', '<div class="hv-n" style="font-size:15px">These carry over, so nobody types them twice:</div><div id="hvAgree">' + agreeHtml() + '</div>', '<span class="hv-tag">' + (v.agreement_signed ? 'Signed' : 'Not signed yet') + '</span>')
      + '</div>';
  }
  const SEC_FN = [sec1, sec2, sec3, sec4, sec5, sec6, sec7];

  /* ---------- the frame ---------- */
  function css() {
    if (document.getElementById('hvCss')) return;
    const s = document.createElement('style'); s.id = 'hvCss';
    s.textContent = '#hvRoot{position:fixed;inset:0;z-index:4000;display:flex;background:#F7F5F0;color:#1E2B2F;font-size:15px;-webkit-text-size-adjust:100%}'
      + '#hvRoot *{box-sizing:border-box}'
      + '.hv-rail{width:232px;flex:none;background:#fff;border-right:1px solid #E4E0D8;padding:22px 14px;display:flex;flex-direction:column;gap:4px;overflow-y:auto}'
      + '.hv-rail .hv-brand{padding:0 12px 14px}.hv-rail .hv-brand img{display:block;width:100%;max-width:190px;height:auto}'
      + '.hv-barlogo{display:none;height:34px;width:auto;flex:none}'
      + '@media (max-width:600px){.hv-bar{padding:0 14px;gap:10px}.hv-bar .hv-tag{display:none}.hv-barlogo{height:28px}}'
      + '.hv-rail .hv-who{padding:0 12px 16px}.hv-rail .hv-who b{font-size:18px;display:block}'
      + '.hv-rail button{display:flex;align-items:center;gap:10px;min-height:44px;padding:0 12px;border-radius:10px;color:#3B4A4F;background:none;border:none;font:inherit;font-size:15px;text-align:left;cursor:pointer}'
      + '.hv-rail button.on{background:#E3F0EF;color:#14565D;font-weight:700}'
      + '.hv-num{width:24px;height:24px;flex:none;border-radius:12px;border:1.5px solid #8C999B;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}'
      + '.hv-rail button.done .hv-num{background:#1F6F78;border-color:#1F6F78;color:#fff}'
      + '.hv-main{flex:1;display:flex;flex-direction:column;min-width:0}'
      + '.hv-bar{height:60px;flex:none;display:flex;align-items:center;gap:14px;padding:0 24px;background:#fff;border-bottom:1px solid #E4E0D8}'
      + '@media (max-width:600px){.hv-bar{height:auto;min-height:56px;flex-wrap:wrap;padding:8px 14px;gap:8px}.hv-bar .hv-n{display:none}}'
      + '.hv-dot{width:12px;height:12px;border-radius:6px;background:#8C999B;flex:none}.hv-dot.rec{background:#C2362B}.hv-dot.hold{background:#D99A1E}'
      + '.hv-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:26px 28px 40px}'
      + '.hv-sec{display:flex;flex-direction:column;gap:18px;max-width:1100px}'
      + '#hvRoot h1{margin:0;font-size:28px;color:#1E2B2F}#hvRoot h2{margin:0;font-size:19px;color:#1E2B2F}'
      + '.hv-sub{font-size:15px;color:#56625F;margin-top:-10px}.hv-h{display:flex;justify-content:space-between;align-items:flex-end;gap:14px}.hv-h .hv-sub{margin-top:4px}'
      + '.hv-card{background:#fff;border:1px solid #E4E0D8;border-radius:14px;padding:18px 20px;display:flex;flex-direction:column;gap:12px;min-width:0}'
      + '.hv-ch{display:flex;justify-content:space-between;align-items:center;gap:10px}'
      + '.hv-cols{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:18px}.hv-stack{display:flex;flex-direction:column;gap:12px;min-width:0}'
      + '.hv-g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.hv-g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}'
      + '.hv-l{font-size:13px;font-weight:600;color:#465255;display:flex;flex-direction:column;gap:6px}.hv-n{font-size:13px;color:#56625F;font-weight:400}'
      + '.hv-ask{font-size:13.5px;color:#56625F;font-style:italic;margin:0;line-height:1.35}'
      + '.hv-f{border:1px solid #CFCAC0;border-radius:10px;padding:10px 12px;font-size:16px;min-height:44px;background:#fff;font-family:inherit;color:#1E2B2F;width:100%;font-weight:400}'
      + 'textarea.hv-f{resize:vertical;line-height:1.4}.hv-from{background:#EEF4F4;border-color:#C2D7D8}.hv-heard{background:#FFF4B8;border-color:#D9BC3A}'
      + '.hv-seg{display:flex;gap:6px;flex-wrap:wrap}.hv-seg button{min-height:44px;padding:0 14px;border-radius:22px;border:1.5px solid #CFCAC0;background:#fff;font:inherit;font-size:14px;color:#2E3B3F;cursor:pointer}'
      + '.hv-seg button.on{background:#1F6F78;border-color:#1F6F78;color:#fff;font-weight:600}.hv-seg button:disabled{cursor:default}.hv-seg button:disabled:not(.on){color:#6B7577}'
      + '.hv-b{min-height:48px;padding:0 22px;border-radius:12px;border:none;background:#1F6F78;color:#fff;font:inherit;font-size:16px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}'
      + '.hv-b2{min-height:44px;padding:0 16px;border-radius:12px;border:1.5px solid #CFCAC0;background:#fff;color:#1E2B2F;font:inherit;font-size:15px;font-weight:600;display:inline-flex;align-items:center;gap:8px;cursor:pointer;text-decoration:none}'
      + '.hv-big{min-height:60px;font-size:18px}.hv-stop{border-color:#C2362B;color:#A12A20}'
      + '.hv-tag{font-size:12px;padding:3px 10px;border-radius:12px;background:#EEF4F4;color:#14565D;font-weight:600;white-space:nowrap}.hv-sug{background:#FFF1D6;color:#7A5200}'
      + '.hv-q{margin:0;padding:14px 16px;background:#F7F5F0;border-radius:12px;font-size:16px;line-height:1.5}'
      + '.hv-person{display:grid;grid-template-columns:36px minmax(0,1.1fr) minmax(0,1fr) 44px;grid-template-areas:"av n r x" ". s s .";gap:8px;align-items:center;padding:6px 0;border-top:1px solid #EEEAE3}.hv-person:first-child{border-top:none}'
      + '.hv-person .hv-av{grid-area:av}.hv-person .hv-pn{grid-area:n}.hv-person .hv-pr{grid-area:r}.hv-person .hv-seg{grid-area:s}.hv-person .hv-x{grid-area:x}'
      + '.hv-av{width:36px;height:36px;border-radius:18px;background:#E3F0EF;color:#14565D;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px}'
      + '.hv-x{width:44px;height:44px;border-radius:10px;border:1px solid #E4E0D8;background:#fff;font-size:20px;color:#56625F;cursor:pointer}'
      + '.hv-goal{display:flex;gap:10px;align-items:center}.hv-star{min-height:44px;border-radius:10px;border:1.5px solid #CFCAC0;background:#fff;font:inherit;font-size:13px;font-weight:600;color:#465255;padding:0 10px;white-space:nowrap;cursor:pointer}.hv-star.on{background:#FFF1D6;border-color:#C98A12;color:#7A5200}'
      + '.hv-cond{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.55fr) minmax(0,2fr) 44px;gap:10px;align-items:center}.hv-th{font-size:12px;font-weight:700;color:#465255;letter-spacing:.04em}'
      + '.hv-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px}'
      + '.hv-act{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1.5fr) minmax(0,1fr);gap:14px;align-items:center;padding:10px 0;border-top:1px solid #EEEAE3}.hv-act.hv-th{border-top:none;padding:0}'
      + '.hv-an{font-size:16px;font-weight:700}.hv-medq{padding:0 0 12px}'
      + '.hv-q2{font-size:15px}'
      + '.hv-week{display:grid;grid-template-columns:repeat(auto-fill,minmax(124px,1fr));gap:8px}.hv-day{border:1px solid #E4E0D8;border-radius:12px;padding:8px;display:flex;flex-direction:column;gap:6px}.hv-day.on{background:#EEF4F4;border-color:#9CC3C6}.hv-day .hv-f{font-size:14px;padding:6px}'
      + '.hv-sum{display:flex;gap:20px;flex-wrap:wrap;align-items:center}.hv-ok{color:#1F6F78;font-weight:600}.hv-warn{color:#9A3412;font-weight:600}'
      + '.hv-lvl{border:1.5px solid #CFCAC0;border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:8px;background:#fff;text-align:left;font:inherit;color:#1E2B2F;cursor:pointer}.hv-lvl.on{border:2.5px solid #1F6F78;background:#F3F9F9}'
      + '.hv-ln{font-size:17px;font-weight:700}.hv-price{font-size:24px;font-weight:700}.hv-price small{font-size:14px}.hv-desc{font-size:13px;color:#465255;line-height:1.45}'
      + '.hv-pad{position:relative;height:auto;border:1.5px dashed #9CA8AA;border-radius:12px;background:#FBFAF7}.hv-pad canvas{display:block;width:100%;touch-action:none}.hv-padhint{position:absolute;left:18px;bottom:12px;color:#6B7577;pointer-events:none}.hv-clear{position:absolute;top:6px;right:6px;min-height:36px;font-size:13px}'
      + '.hv-li{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid #EEEAE3}.hv-li span:first-child{color:#465255}.hv-li span:last-child{font-weight:600;text-align:right}'
      + '.hv-note{background:#FFF8E8;border:1px solid #F5D9A0;border-radius:10px;padding:10px 12px;font-size:14px}'
      + '.hv-foot{display:flex;justify-content:space-between;gap:12px;max-width:1100px;margin-top:18px}'
      + '@media (max-width:900px){#hvRoot{flex-direction:column}.hv-rail{width:auto;flex-direction:row;padding:8px;border-right:none;border-bottom:1px solid #E4E0D8;overflow-x:auto}.hv-rail .hv-brand,.hv-rail .hv-who,.hv-rail .hv-gap{display:none}.hv-barlogo{display:block}.hv-rail button{white-space:nowrap}'
      + '.hv-cols,.hv-g2,.hv-g3,.hv-act{grid-template-columns:minmax(0,1fr)}.hv-week{grid-template-columns:repeat(auto-fill,minmax(124px,1fr))}.hv-person{grid-template-columns:36px minmax(0,1fr) 44px;grid-template-areas:"av n x" ". r ." ". s s"}.hv-body{padding:16px}}';
    document.head.appendChild(s);
  }
  function railHtml() {
    return '<div class="hv-brand"><img src="cc-logo.png" alt="Caring Companions"></div><div class="hv-who"><b>' + E(ST.a.client_name || 'Home visit') + '</b><span class="hv-n">Home visit, ' + E(ST.a.visit_date || '') + '</span></div>'
      + SECS.map((t, i) => '<button type="button" data-hvs="' + i + '" class="' + (i === ST.sec ? 'on' : (ST.a.visit.seen || {})[i] ? 'done' : '') + '"' + (i === ST.sec ? ' aria-current="step"' : '') + '><span class="hv-num">' + (i + 1) + '</span>' + E(t) + '</button>').join('')
      + '<div class="hv-gap" style="flex:1"></div><button type="button" data-hva="close"><span class="hv-num">×</span>Close</button>';
  }
  function barHtml() {
    /* stage 2 (2026-10-29): the recorder runs in 10-minute parts (rec-parts.js), with Pause, and says when the iPad stopped it */
    const st = window.RECP && typeof REC !== 'undefined' && REC.groupKind === 'assessment' && REC.groupSubject === String(ST.a.id) ? RECP.state() : 'off';
    const rec = st !== 'off';
    const secs = rec ? Math.floor(RECP.elapsed()) : 0;
    const clock = Math.floor(secs / 3600) + ':' + String(Math.floor(secs / 60) % 60).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
    const n = (ST.a.visit.attendees || []).filter((p) => p.name).length;
    const word = st === 'paused' ? 'Paused ' + clock : st === 'lost' ? 'Recording stopped at ' + clock : rec ? 'Recording ' + clock : 'Not recording';
    /* 2026-10-29 (Samantha: "add our logo to the assessment screen on the ipad"): the rail shows it sideways; upright and on a phone the rail is a tab strip, so the bar carries it */
    return '<img class="hv-barlogo" src="cc-logo.png" alt="Caring Companions"><span class="hv-dot' + (st === 'recording' ? ' rec' : st === 'paused' ? ' hold' : st === 'lost' ? ' rec' : '') + '"></span><strong style="font-variant-numeric:tabular-nums' + (st === 'lost' ? ';color:#C2362B' : '') + '">' + word + '</strong>'
      + (n ? '<span class="hv-n" style="font-size:15px">' + n + ' ' + (n === 1 ? 'person' : 'people') + ' in the room</span>' : '')
      + '<span class="hv-tag" id="hvSaved">Saves as you go</span><span style="flex:1"></span>'
      + (st === 'recording' ? '<button type="button" class="hv-b2" data-hva="pauserec">Pause</button>' : '')
      + (st === 'paused' ? '<button type="button" class="hv-b" data-hva="resumerec">Resume</button>' : '')
      + (st === 'lost' ? '<button type="button" class="hv-b" data-hva="keeprec">Keep recording</button>' : '')
      + (rec ? '<button type="button" class="hv-b2 hv-stop" data-hva="stoprec">Stop recording</button>' : '');
  }
  function footHtml() {
    return '<div class="hv-foot">' + (ST.sec > 0 ? '<button type="button" class="hv-b2" data-hvs="' + (ST.sec - 1) + '">Back</button>' : '<span></span>')
      + (ST.sec < SECS.length - 1 ? '<button type="button" class="hv-b" data-hvs="' + (ST.sec + 1) + '">Next: ' + E(SECS[ST.sec + 1]) + '</button>'
        : '<button type="button" class="hv-b" data-hva="finish">Finish the visit</button>') + '</div>';
  }
  function show(i) {
    (ST.a.visit.seen = ST.a.visit.seen || {})[ST.sec] = true;
    ST.sec = i;
    document.querySelectorAll('#hvRoot .hv-sec').forEach((el) => { el.style.display = +el.getAttribute('data-sec') === i ? '' : 'none'; });
    if (i === 5) { refreshLevels(); }
    if (i === 6) { const ag = document.getElementById('hvAgree'); if (ag) ag.innerHTML = agreeHtml(); sigInit(); }
    document.getElementById('hvRail').innerHTML = railHtml();
    document.getElementById('hvFoot').innerHTML = footHtml();
    const b = document.querySelector('#hvRoot .hv-body'); if (b) b.scrollTop = 0;
  }
  function refreshLevels() { const lv = document.getElementById('hvLevels'); if (lv) lv.innerHTML = levelHtml(); }

  function render() {
    css();
    let root = document.getElementById('hvRoot');
    if (!root) { root = document.createElement('div'); root.id = 'hvRoot'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Home visit'); document.body.appendChild(root); }
    root.innerHTML = '<nav class="hv-rail" id="hvRail" aria-label="Visit sections"></nav>'
      + '<div class="hv-main"><div class="hv-bar" id="hvBar">' + barHtml() + '</div><div class="hv-body">'
      + SEC_FN.map((f, i) => '<div class="hv-sec" data-sec="' + i + '" style="display:none">' + f() + '</div>').join('')
      + '<div id="hvFoot"></div></div></div>';
    wire(root);
    /* the Hub's own recorder: consent first, saved on the iPad as it goes, private upload */
    try { if (typeof recMount === 'function') recMount('hvRec', 'assessment', ST.a.id, 'everyone in the room'); } catch (e) {}
    lifeMount();
    show(ST.sec);
    clearInterval(ST.tick);
    ST.tick = setInterval(() => { const b = document.getElementById('hvBar'); if (!b) { clearInterval(ST.tick); return; } const keep = document.getElementById('hvSaved'); const txt = keep ? keep.textContent : ''; b.innerHTML = barHtml(); const k2 = document.getElementById('hvSaved'); if (k2 && txt) k2.textContent = txt; }, 1000);
  }
  function lifeMount() {
    const host = document.getElementById('hvLife'); if (!host) return;
    if (window.LSTORY && LSTORY.mount) { try { LSTORY.mount('hvLife', { lead: ST.lead, ax: String(ST.a.axiscare_client_id || ''), name: ST.a.client_name || '' }, 'assessment'); if (!host.innerHTML.trim()) host.innerHTML = '<div class="hv-n">Life Story is switched off. Put these in Their story above.</div>'; return; } catch (e) {} }
    host.innerHTML = '<div class="hv-n">Life Story is not available on this screen.</div>';
  }

  /* ---------- signatures (finger) ---------- */
  function sigInit() {
    document.querySelectorAll('#hvRoot canvas[data-sig]').forEach((cv) => {
      if (cv._hv) return; cv._hv = true;
      const who = cv.getAttribute('data-sig'), ctx = cv.getContext('2d');
      const fit = () => { const w = cv.clientWidth || 400; cv.width = w; const s = ST.a.visit.sign[who] || {}; if (s.png) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0, cv.width, cv.height); im.src = s.png; } };
      fit();
      let down = false, last = null, drew = false;
      const at = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      cv.addEventListener('pointerdown', (e) => { down = true; last = at(e); cv.setPointerCapture(e.pointerId); const h = cv.parentElement.querySelector('.hv-padhint'); if (h) h.remove(); });
      cv.addEventListener('pointermove', (e) => { if (!down) return; const p = at(e); ctx.strokeStyle = '#1B3A66'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p; drew = true; });
      const up = () => { if (!down) return; down = false; if (!drew) return; drew = false;
        const s = ST.a.visit.sign[who] = ST.a.visit.sign[who] || {}; s.png = cv.toDataURL('image/png'); s.at = new Date().toISOString(); if (!s.date) { s.date = today(); const d = document.querySelector('#hvRoot [data-hv="visit.sign.' + who + '.date"]'); if (d) d.value = s.date; } saveSoon(); };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', up);
    });
  }

  /* ---------- taps and typing ---------- */
  function wire(root) {
    root.addEventListener('input', (e) => {
      const el = e.target, p = el.getAttribute && el.getAttribute('data-hv'); if (!p) return;
      set(p, el.value);
      if (ST.a.visit.heard && ST.a.visit.heard[p]) { delete ST.a.visit.heard[p]; el.classList.remove('hv-heard'); }
      el.classList.remove('hv-from');
      if (p === 'visit.rate') ST.a.visit.rate_typed = true;
      if (p.indexOf('visit.week.') === 0) { const s = document.getElementById('hvWeekSum'); if (s) s.innerHTML = weekSummary(); const d = el.closest('.hv-day'); if (d) d.classList.toggle('on', !!dayHours(p.split('.')[2])); }
      if (/^visit\.attendees\.\d+\.name$/.test(p)) { /* the bar's head count */ }
      saveSoon();
    });
    root.addEventListener('click', async (e) => {
      const s = e.target.closest('[data-hvs]'); if (s) { show(+s.getAttribute('data-hvs')); return; }
      const pb = e.target.closest('[data-hvp]');
      if (pb && !pb.disabled) {
        const p = pb.getAttribute('data-hvp'), v = pb.getAttribute('data-v');
        if (pb.getAttribute('data-multi')) { const cur = Array.isArray(get(p)) ? get(p).slice() : []; const i = cur.indexOf(v); if (i > -1) cur.splice(i, 1); else cur.push(v); set(p, cur); pb.classList.toggle('on', i < 0); pb.setAttribute('aria-pressed', String(i < 0)); }
        else { const on = get(p) !== v; set(p, on ? v : ''); pb.parentElement.querySelectorAll('button').forEach((b) => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }); if (on) { pb.classList.add('on'); pb.setAttribute('aria-pressed', 'true'); } }
        if (p.indexOf('visit.acts.') === 0 || p === 'visit.equipment') refreshLevels();
        saveSoon(); return;
      }
      const a = e.target.closest('[data-hva]'); if (!a) return;
      const act = a.getAttribute('data-hva'), i = +a.getAttribute('data-i');
      if (act === 'addperson') { ST.a.visit.attendees.push({ name: '', rel: '', role: 'family' }); document.getElementById('hvPeople').innerHTML = peopleHtml(); saveSoon(); return; }
      if (act === 'delperson') { ST.a.visit.attendees.splice(i, 1); document.getElementById('hvPeople').innerHTML = peopleHtml(); saveSoon(); return; }
      if (act === 'addcond') { ST.a.visit.conditions.push({}); document.getElementById('hvConds').innerHTML = condHtml(); return; }
      if (act === 'delcond') { ST.a.visit.conditions.splice(i, 1); document.getElementById('hvConds').innerHTML = condHtml(); saveSoon(); return; }
      if (act === 'star') { ST.a.visit.top_goal = i; root.querySelectorAll('.hv-star').forEach((b, j) => { b.classList.toggle('on', j === i); b.textContent = j === i ? 'Most important' : 'Star'; b.setAttribute('aria-pressed', String(j === i)); }); saveSoon(); return; }
      if (act === 'level') {
        const v = a.getAttribute('data-v'); ST.a.visit.level = v;
        if (!ST.a.visit.rate_typed) { ST.a.visit.rate = String(rates()[v]); const r = document.getElementById('hvRate'); if (r) r.value = ST.a.visit.rate; }
        refreshLevels(); saveSoon(); return;
      }
      if (act === 'clearsig') { const w = a.getAttribute('data-v'); ST.a.visit.sign[w] = { png: '', name: (ST.a.visit.sign[w] || {}).name || '', date: '' }; const cv = root.querySelector('canvas[data-sig="' + w + '"]'); if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); saveSoon(); return; }
      if (act === 'pauserec') { try { RECP.pause(); } catch (er) {} return; }
      if (act === 'resumerec') { try { RECP.resume(); } catch (er) {} return; }
      if (act === 'keeprec') { try { recStart(); } catch (er) {} return; }   /* straight from the tap: the iPad only gives the microphone back to a tap */
      if (act === 'stoprec') { if (await ask('Stop the recording? The last part goes to the office now. To carry on later, start a new recording.')) { try { recStop(); } catch (er) {} } return; }
      if (act === 'close') { await close(); return; }
      if (act === 'finish') { await finish(); return; }
    });
  }
  const recording = () => typeof REC !== 'undefined' && ((window.RECP && RECP.state() !== 'off') || (REC.mr && REC.mr.state === 'recording'));
  async function close() {
    if (recording()) { if (!(await ask('The recording is still going. Close anyway? It keeps recording until you stop it on this visit.'))) return; }
    await saveNow();
    const root = document.getElementById('hvRoot'); if (root && !recording()) root.remove(); else if (root) root.style.display = 'none';
    clearInterval(ST.tick);
    try { if (typeof renderAssessments === 'function') renderAssessments(); } catch (e) {}
    try { if (typeof cpRenderCare === 'function') cpRenderCare(); } catch (e) {}
  }
  async function finish() {
    if (recording()) { if (!(await ask('Stop the recording and finish the visit?'))) return; try { recStop(); } catch (e) {} }
    const v = ST.a.visit;
    if (!v.sign.client.png && !(await ask('Nobody has signed the assessment yet. Finish anyway?'))) return;
    v.finished_at = new Date().toISOString(); v.finished_by = me();
    if (ST.a.status === 'Scheduled' || !ST.a.status) ST.a.status = 'Completed — Awaiting Plan';
    await saveNow();
    toast(v.outcome ? 'Visit saved. Now record "' + (OUTCOMES.find((o) => o[0] === v.outcome) || [0, ''])[1] + '" on Start of Care, step 3.' : 'Visit saved. Record how it ended on Start of Care, step 3.');
    const root = document.getElementById('hvRoot'); if (root) root.remove();
    clearInterval(ST.tick);
    try { if (ST.lead && typeof asmtToProfile === 'function') await asmtToProfile(ST.lead); } catch (e) {}
    try { if (typeof renderAssessments === 'function') renderAssessments(); } catch (e) {}
    try { if (typeof cpRenderCare === 'function') cpRenderCare(); } catch (e) {}
  }

  /* open({ leadId }) or open({ id }) or open({ ax, name }) */
  async function open(o) {
    o = o || {};
    if (recording() && document.getElementById('hvRoot')) { document.getElementById('hvRoot').style.display = ''; return; }
    const all = D().care_assessments || (DATA.care_assessments = []);
    let a = o.id ? all.find((x) => x.id === o.id) : null;
    let l = (a && a.lead_id) ? (D().leads || []).find((x) => x.id === a.lead_id) : (o.leadId ? (D().leads || []).find((x) => x.id === o.leadId) : null);
    if (!a && (l || o.ax)) {
      const have = typeof asmtExisting === 'function' ? asmtExisting(l, o.ax) : null;
      if (have && !(have.visit && have.visit.finished_at)) a = have;
      else if (have && (await ask('This family already has an assessment' + (have.visit_date ? ' (visit ' + have.visit_date + ')' : '') + '.\n\nOK = open it · Cancel = start a new one (a reassessment)'))) a = have;
    }
    if (!a) {
      a = newRecord(l);
      if (!l && o.ax) { a.axiscare_client_id = String(o.ax); a.client_name = o.name || ''; }
      all.push(a);
      if (l && (l.status === 'New' || l.status === 'Contacted') && window.LeadRules) { try { LeadRules.setStatus(l, 'Assessment Scheduled', { by: (typeof ccActor === 'function' ? (ccActor() || {}).email : ''), why: 'home visit started' }); persist('leads', l); } catch (e) {} }
    }
    if (!l && a.lead_id) l = (D().leads || []).find((x) => x.id === a.lead_id) || null;
    ST.a = ensureVisit(a, l); ST.lead = l; ST.sec = 0;
    await saveNow();
    render();
  }

  /* Settings > Home visit: the rates and minimums the visit shows (owners only, like the other settings) */
  function settingsFill() {
    const box = document.getElementById('hvSet'); if (!box) return;
    const r = rates(), m = mins();
    box.innerHTML = '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">'
      + LEVELS.map((L) => '<label class="field-note" style="display:flex;flex-direction:column;gap:4px">' + E(L[1]) + ' ($ an hour)<input id="hvSet_' + L[0] + '" inputmode="decimal" value="' + r[L[0]] + '" style="width:110px"></label>').join('')
      + '<label class="field-note" style="display:flex;flex-direction:column;gap:4px">Hours a visit, at least<input id="hvSet_visit" inputmode="decimal" value="' + m.visit + '" style="width:110px"></label>'
      + '<label class="field-note" style="display:flex;flex-direction:column;gap:4px">Hours a week, at least<input id="hvSet_week" inputmode="decimal" value="' + m.week + '" style="width:110px"></label>'
      + '<button class="secondary" onclick="HV.settingsSave(this)">Save</button><span class="field-note" id="hvSetSaved"></span></div>';
  }
  async function settingsSave(btn) {
    if (typeof ccIsOwner === 'function' && !ccIsOwner()) { alert('Only Samantha or Zachary can change the rates.'); return; }
    const n = (id) => Number(String((document.getElementById(id) || {}).value || '').replace(/[^\d.]/g, ''));
    const vr = { wellness: n('hvSet_wellness'), personal: n('hvSet_personal'), advanced: n('hvSet_advanced') }, vm = { visit: n('hvSet_visit'), week: n('hvSet_week') };
    if (Object.values(vr).concat(Object.values(vm)).some((x) => !(x > 0))) { alert('Every box needs a number above 0.'); return; }
    if (btn) btn.disabled = true;
    const out = await tkMerge((s) => { s.visit_rates = vr; s.visit_minimums = vm; return ['Home visit rates ' + vr.wellness + '/' + vr.personal + '/' + vr.advanced + ', minimums ' + vm.visit + 'h a visit, ' + vm.week + 'h a week']; }, 'Home visit rates');
    if (btn) btn.disabled = false;
    const sv = document.getElementById('hvSetSaved'); if (sv) sv.textContent = out && out.error ? 'Could not save: ' + out.error.message : 'Saved.';
  }

  window.HV = { open, close, settingsFill, settingsSave, _st: ST, _suggest: suggestLevel, _weekSummary: weekSummary };
})();
