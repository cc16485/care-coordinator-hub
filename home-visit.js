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

  /* 2026-10-29 Care plan Stage 2 (her "Stage 2 approved as written"): Home and safety sits between Daily activities and Preferences */
  const SECS = ['Start the visit', 'Their story', 'Health', 'Daily activities', 'Home and safety', 'Preferences', 'Schedule and level', 'Sign-off', 'After the visit'];
  const S_ = { start: 0, story: 1, health: 2, daily: 3, home: 4, prefs: 5, plan: 6, sign: 7 };
  const AFTER = 8;   /* stage 3 (2026-10-29): back at the office, what the recording heard */
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
  const YN = [['yes', 'Yes'], ['no', 'No']];
  /* 2026-10-29 (her: "fix caregiver and contact preferences to reflect what we currently ask"): the same choices the Hub keeps,
     Care needs (care-needs.js), the lead's attributes, People involved (LPP_ROLES) and the Family Circle texts, and that
     the Client Care Agreement's contact page asks. The paper form's group text, check-ins, surveys and personality are gone. */
  const PREF = {
    gender: [['female_required', 'Female, required'], ['female_preferred', 'Female, preferred'], ['male_required', 'Male, required'], ['male_preferred', 'Male, preferred'], ['no_preference', 'No preference']],
    spanish: [['required', 'Required'], ['preferred', 'Preferred'], ['no', 'No']],
  };
  const SKILL_KEYS = ['dementia_care', 'parkinsons_care', 'transfers_gait_belt', 'hoyer_lift', 'bedbound_care', 'hospice_support', 'catheter_bag', 'ostomy_bag', 'transportation'];
  const SKILL_W = { dementia_care: "Dementia or Alzheimer's care", parkinsons_care: "Parkinson's care", transfers_gait_belt: 'Transfers with a gait belt', hoyer_lift: 'A Hoyer or other mechanical lift',
    bedbound_care: 'Bedbound care and repositioning', hospice_support: 'Hospice and end-of-life support', catheter_bag: 'Emptying a catheter bag', ostomy_bag: 'Emptying an ostomy bag', transportation: 'Driving to appointments and errands' };
  const skills = () => SKILL_KEYS.map((k) => { const m = window.CCMatch && (CCMatch.SKILLS || []).find((x) => x.key === k); return [k, (m && m.label) || SKILL_W[k]]; });
  const ROLES = [['primary', 'Primary contact'], ['medical_decisions', 'Medical decisions'], ['poa_health', 'Health care POA'], ['poa_financial', 'Financial POA'], ['billing', 'Billing'], ['emergency', 'Emergency contact']];
  const REACH = [['call', 'Call'], ['text', 'Text'], ['email', 'Email']];
  const TEXTS = [['changes', 'Caregiver changes'], ['late', 'Running late']];
  const NURSE = [['yes', 'Yes'], ['no', 'No'], ['later', 'Ask later']];

  /* ---------- from the phone calls (2026-10-29, her "yes, build the phone call pre-fill: blue boxes plus the reminder cards") ----------
     What Make this a lead / Fill from the call saved on the lead. Short, clear answers go into EMPTY boxes once, in blue
     ("from the phone call, check it with the family"); the longer descriptions show as a card to talk from. Never a typed box. */
  const COND_W = { dementia: 'Dementia', alzheimers: "Alzheimer's", parkinsons: "Parkinson's", stroke: 'Stroke', diabetes: 'Diabetes', copd: 'COPD' };
  const MOB_EQ = { walker: 'Walker', wheelchair: 'Wheelchair' };
  const PC_W = { bathing: 'Bathing', dressing: 'Dressing', toileting: 'Toileting', transfers: 'Transfers', dementia: 'Dementia care' };
  const LIVING_W = { alone: 'Lives alone', spouse_partner: 'Lives with a spouse or partner', family: 'Lives with family', paid_help: 'Lives with paid help', facility: 'Lives in a facility', other: 'Other' };
  const WHY_W = { fall: 'a fall', discharge: 'a hospital discharge', caregiver_cant_continue: "their caregiver can't continue", memory_worse: 'memory getting worse', provider_cant_staff: "their provider can't staff", new_diagnosis: 'a new diagnosis', other: 'other' };
  const fromCall = (l) => !!(l && (l.call_profile || l.care_plan_draft || (Array.isArray(l.from_calls) && l.from_calls.length)));
  const nil = (x) => x == null || String(x).trim() === '';
  function callGoals(t) {
    const parts = String(t || '').replace(/([.!?])\s+(?=[A-Z])/g, '$1\n').split(/\n+|;\s*/).map((x) => x.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean);
    return parts.length && parts.length <= 3 && parts.every((x) => x.length <= 140) ? parts : null;
  }
  function callFill(a, l) {
    const v = a.visit;
    if (!fromCall(l) || v.call_filled_at || v.finished_at) return;
    const mark = (p) => { (v.from_call = v.from_call || {})[p] = true; };
    const f = (l.call_profile || {}).facts || {}, d = (l.care_plan_draft || {}).fields || {};
    if (nil(v.allergies) && !nil(f.allergies)) { v.allergies = String(f.allergies).trim(); mark('visit.allergies'); }
    const cs = v.conditions = Array.isArray(v.conditions) ? v.conditions : [];
    (Array.isArray(l.medical_conditions) ? l.medical_conditions : []).map((k) => COND_W[k]).filter(Boolean).forEach((name) => {
      if (cs.some((c) => c && String(c.name || '').toLowerCase() === name.toLowerCase())) return;
      let i = cs.findIndex((c) => !c || (nil(c.name) && nil(c.onset) && nil(c.effect)));
      if (i < 0) { cs.push({}); i = cs.length - 1; }
      cs[i] = Object.assign({}, cs[i], { name }); mark('visit.conditions.' + i + '.name');
    });
    const eq = MOB_EQ[l.mobility];
    if (eq && (v.equipment || []).indexOf(eq) < 0) { v.equipment = (v.equipment || []).concat([eq]); mark('visit.equipment:' + eq); }
    const gs = callGoals(d.client_goals);
    if (gs && (v.goals || []).every((g) => nil(g && g.text))) { gs.forEach((t, i) => { v.goals[i] = { text: t }; mark('visit.goals.' + i + '.text'); }); v.goals_from_call = true; }
    v.call_filled_at = new Date().toISOString();
  }
  /* what the lead already holds about the caregiver (its attributes), into the Preferences screen's empty answers, once, in blue */
  function leadPrefs(a, l) {
    const v = a.visit, at = (l && l.client_attributes) || {};
    if (!l || v.lead_prefs_at || v.finished_at) return;
    const mark = (p) => { (v.from_call = v.from_call || {})[p] = true; }, pr = v.prefs, strict = l.gender_pref_normalized === true;
    const g = (x) => x === 'preferred' || (x === 'yes' && !strict) ? 'preferred' : x === 'yes' ? 'required' : '';
    if (nil(pr.gender)) { const f = g(at.female_caregiver), m = g(at.male_caregiver), val = f && !m ? 'female_' + f : m && !f ? 'male_' + m : '';
      if (val) { pr.gender = val; mark('visit.prefs.gender:' + val); } }
    if (nil(pr.spanish)) { const sp = at.spanish_speaking === 'yes' ? 'required' : at.spanish_speaking === 'preferred' ? 'preferred' : at.spanish_speaking === 'no' ? 'no' : '';
      if (sp) { pr.spanish = sp; mark('visit.prefs.spanish:' + sp); } }
    ['cats', 'dogs', 'smoking'].forEach((k) => { if (nil(pr[k]) && (at[k] === 'yes' || at[k] === 'no')) { pr[k] = at[k]; mark('visit.prefs.' + k + ':' + at[k]); } });
    const SK = { dementia: 'dementia_care', alzheimers: 'dementia_care', parkinsons: 'parkinsons_care', gait_belt: 'transfers_gait_belt', hoyer_lift: 'hoyer_lift', bed_bound: 'bedbound_care', hospice: 'hospice_support', transportation: 'transportation' };
    pr.skills = Array.isArray(pr.skills) ? pr.skills : [];
    Object.keys(SK).forEach((k) => { const sk = SK[k]; if ((at[k] === 'yes' || at[k] === 'preferred') && pr.skills.indexOf(sk) < 0) { pr.skills.push(sk); mark('visit.prefs.skills:' + sk); } });
    (v.attendees || []).forEach((p) => { if (p.role === 'primary' && !Array.isArray(p.roles)) p.roles = ['primary']; });
    v.lead_prefs_at = new Date().toISOString();
  }
  function callBy() {
    const l = ST.lead; if (!l) return '';
    const n = ((l.call_profile || {}).said_by) || [l.first_name, l.last_name].filter((x) => x && !/^\(.*\)$/.test(x)).join(' ');
    return n ? 'Said by ' + n + (l.relationship ? ', ' + l.relationship : '') : '';
  }
  /* the reminder card on a screen: the longer things the calls said, to talk from */
  function callCard(rows) {
    rows = rows.filter((r) => !nil(r[1]));
    if (!rows.length) return '';
    const by = callBy();
    return '<section class="hv-card hv-callc"><div class="hv-ch"><h2>From the phone call</h2>' + (by ? '<span class="hv-tag">' + E(by) + '</span>' : '') + '</div>'
      + '<div class="hv-n" style="margin:0">Check it with the family and tap their answers below. Blue boxes came from the call.</div>'
      + rows.map((r) => '<div class="hv-cr"><b>' + E(r[0]) + '</b><span>' + E(String(r[1]).trim()) + '</span></div>').join('') + '</section>';
  }
  function callRows(which) {
    const l = ST.lead; if (!fromCall(l)) return [];
    const f = (l.call_profile || {}).facts || {}, d = (l.care_plan_draft || {}).fields || {};
    if (which === 'story') return [
      ['Why now', [].concat(f.why_now || []).map((x) => WHY_W[x] || x).join(', ')],
      ['Living situation', LIVING_W[f.living_situation] || ''],
      ['What they hope for', ST.a.visit.goals_from_call ? '' : d.client_goals]];
    if (which === 'health') return [['Health', d.medical_conditions], ['Medicines named', d.medications], ['Other health details', l.medical_notes], ['Safety worries', d.safety_concerns]];
    if (which === 'daily') return [['Asked for help with', (Array.isArray(l.personal_care) ? l.personal_care : []).map((k) => PC_W[k] || k).join(', ')], ['Daily living', d.adl_needs], ['Around the home', d.iadl_needs]];
    return [];
  }
  function callPeople() {
    const l = ST.lead; if (!fromCall(l)) return [];
    const have = new Set((ST.a.visit.attendees || []).map((p) => String(p.name || '').trim().toLowerCase()));
    return ((l.call_profile || {}).people || []).filter((p) => p && p.name && !have.has(String(p.name).trim().toLowerCase()));
  }
  function callPeopleHtml() {
    const ps = callPeople(); if (!ps.length) return '';
    return '<div class="hv-callp"><div class="hv-n" style="margin:0 0 4px">Named on the phone call. Tap to add anyone who is here or on the phone.</div>'
      + ps.map((p) => '<button type="button" class="hv-b2" data-hva="addcallperson" data-v="' + E(p.name) + '">+ ' + E(p.name) + (p.relationship ? ', ' + E(p.relationship) : '') + '</button>').join('') + '</div>';
  }

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
      prefs: { gender: '', spanish: '', cats: '', dogs: '', smoking: '', skills: [], other: '' },
      safety: { ec: {} }, home: {}, shift: [],
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
    try { if (window.CPV) CPV.safetyWatch(ST.a); } catch (e) {}
    const pill = document.getElementById('syncPill'), s = document.getElementById('hvSaved');
    if (s) s.textContent = pill && /Not saved|✗|⚠/.test(pill.textContent) ? 'Not saved yet. It will try again.' : 'Saved ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  /* ---------- small pieces ---------- */
  const field = (path, ph, opt) => {
    opt = opt || {};
    const v = get(path), cls = 'hv-f' + (opt.from || (ST.a.visit.from_call || {})[path] ? ' hv-from' : '') + ((ST.a.visit.heard || {})[path] ? ' hv-heard' : '');
    return opt.rows ? '<textarea class="' + cls + '" rows="' + opt.rows + '" data-hv="' + E(path) + '" placeholder="' + E(ph || '') + '">' + E(v || '') + '</textarea>'
      : '<input class="' + cls + '" ' + (opt.type ? 'type="' + opt.type + '"' : '') + ' data-hv="' + E(path) + '" value="' + E(v || '') + '" placeholder="' + E(ph || '') + '"' + (opt.attrs || '') + '>';
  };
  const lab = (t, inner, note) => '<label class="hv-l">' + E(t) + (note ? '<span class="hv-n">' + E(note) + '</span>' : '') + inner + '</label>';
  const pills = (path, opts, multi) => '<div class="hv-seg' + ((ST.a.visit.heard || {})[path] ? ' hv-heardseg' : '') + '">' + opts.map((o) => {
    const cur = get(path), on = multi ? (Array.isArray(cur) && cur.indexOf(o[0]) > -1) : cur === o[0];
    return '<button type="button" class="' + (on ? 'on' : '') + ((ST.a.visit.from_call || {})[path + ':' + o[0]] ? ' hv-pfrom' : '') + '" data-hvp="' + E(path) + '" data-v="' + E(o[0]) + '"' + (multi ? ' data-multi="1"' : '') + ' aria-pressed="' + on + '">' + E(o[1]) + '</button>';
  }).join('') + '</div>';
  const yn = (path) => pills(path, YN);
  const card = (title, inner, right) => '<section class="hv-card"><div class="hv-ch"><h2>' + E(title) + '</h2>' + (right || '') + '</div>' + inner + '</section>';

  /* ---------- the seven screens ---------- */
  function sec1() {
    const v = ST.a.visit, l = ST.lead;
    return '<div class="hv-h"><div><h1>Home visit with ' + E(ST.a.client_name || 'the client') + '</h1>'
      + '<div class="hv-sub">' + (l ? 'Lead' + (l.status ? ': ' + E(l.status) : '') + ' · ' : '') + 'Coordinator: ' + E(ST.a.coordinator || me()) + '</div></div></div>'
      + '<div class="hv-cols">'
      + '<div class="hv-stack">'
      + card("Who's here today", '<div id="hvPeople">' + peopleHtml() + '</div><div id="hvCallPeople">' + callPeopleHtml() + '</div>', '<button type="button" class="hv-b2" data-hva="addperson">+ Add someone</button>')
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
      + callCard(callRows('story'))
      + '<div class="hv-g2">'
      + card('What prompted the call', '<p class="hv-ask">"What made you feel in-home care was needed now, or a change in agencies?"</p>' + field('visit.story.trigger', '', { rows: 4, from: !!v.story.trigger }))
      + card("What's been going on lately", '<p class="hv-ask">"To start, can you tell me a little about what\'s been going on? What are the main concerns or changes you\'ve noticed?"</p>' + field('visit.story.overview', '', { rows: 4 }))
      + '</div>'
      + card('A day at home', '<p class="hv-ask">When you know their day, the daily activities flow: "You mentioned mornings are difficult. How does bathing go for you?"</p><div class="hv-g3">'
        + lab('Morning', field('visit.story.morning', '', { rows: 5 }), 'Wake time? Breakfast? Medications? Help with the routine?')
        + lab('Afternoon', field('visit.story.afternoon', '', { rows: 5 }), 'Appointments? Interests? Outings? Lunch? Nap or rest?')
        + lab('Evening', field('visit.story.evening', '', { rows: 5 }), 'Bedtime? Dinner? Medications? Trouble dressing or bathing?')
        + '</div>')
      + card('What matters to them', '<div class="hv-g3">'
        + lab('What good care looks like to you', field('visit.story.good_care', 'In their own words', { rows: 3 }), '"If this goes well, what will be different?"')
        + lab('What they still do themselves', field('visit.story.self', 'What they want to keep doing', { rows: 3 }), 'Their independence, and their dignity')
        + lab('What they like to be called', field('visit.story.called', 'Name or nickname'), 'Mrs. Harlow, Betty, Mom?')
        + '</div>')
      + '<div class="hv-g2">'
      + card('Top 3 goals', '<p class="hv-n" style="margin:0">Tap the star on the one that matters most.</p>' + [0, 1, 2].map((i) => '<div class="hv-goal"><b>' + (i + 1) + '</b>' + field('visit.goals.' + i + '.text', 'Goal ' + (i + 1))
        + '<button type="button" class="hv-star' + (v.top_goal === i ? ' on' : '') + '" data-hva="star" data-i="' + i + '" aria-pressed="' + (v.top_goal === i) + '">' + (v.top_goal === i ? 'Most important' : 'Star') + '</button></div>').join(''))
      + card('Life story', '<div id="hvLife"><div class="hv-n">Loading…</div></div>', '<span class="hv-tag">Saves to Home &amp; Life</span>')
      + '</div>';
  }
  /* ---------- the safety screen everyone answers (Care plan Stage 1, her decision 4) ----------
     Short questions for everyone; a follow-up opens only when an answer calls for it. The care plan can't be approved
     until every one is answered, and existing allergies and the emergency contact are confirmed with the family. */
  const SY = 'visit.safety.';
  function safetyHtml() {
    const v = ST.a.visit, s = v.safety || {}, lv = (k) => ((v.acts || {})[k] || {}).level;
    const miss = window.CPV ? CPV.safetyMissing(v) : [];
    const q = (label, inner, note) => '<div class="hv-sq"><div><b>' + E(label) + '</b>' + (note ? '<span class="hv-n">' + E(note) + '</span>' : '') + '</div>' + inner + '</div>';
    const follow = (path, ph) => '<div class="hv-fu">' + field(path, ph, { rows: 2 }) + '</div>';
    return '<div class="hv-ch"><h2>Safety check</h2><span class="hv-tag' + (miss.length ? ' hv-sug' : '') + '">' + (miss.length ? miss.length + ' to answer' : 'All answered') + '</span></div>'
      + '<p class="hv-n" style="margin:0">Asked at every visit. The care plan can\'t be approved until each one is answered.</p>'
      + q('Any falls in the last 6 months?', yn(SY + 'falls')) + (s.falls === 'yes' ? follow(SY + 'falls_note', 'How, where, and was anyone hurt?') : '')
      + q('Lives alone?', yn(SY + 'lives_alone'))
      + q('Walking', pills('visit.acts.mobility.level', PERSONAL.find((r) => r[0] === 'mobility')[3]))
      + q('Getting up and down (transfers)', pills('visit.acts.transfers.level', PERSONAL.find((r) => r[0] === 'transfers')[3]))
      + (lv('transfers') === 'full' ? q('Needs more than one person, or a lift, to transfer?', yn(SY + 'two_person'), 'Caregivers never do two-person transfers.') : '')
      + q('Memory concerns?', yn('visit.memory'))
      + q('Needs supervision to be safe (judgment)?', yn('visit.supervision'))
      + (v.memory === 'yes' || v.supervision === 'yes' ? follow(SY + 'cognition_note', 'What happens, and when? (wandering, the stove, getting lost, mixing up pills)') : '')
      + q('Any recent decline in what they can do?', yn(SY + 'decline')) + (s.decline === 'yes' ? follow(SY + 'decline_note', 'What changed, and when?') : '')
      + q('Can they call for help in an emergency?', pills(SY + 'summon', window.CPV ? CPV.SUMMON : []))
      + q('Oxygen in the home?', yn(SY + 'oxygen')) + (s.oxygen === 'yes' ? follow(SY + 'oxygen_note', 'Where it is kept, and how it is used') : '')
      + q('Does anyone smoke in the home?', yn('visit.prefs.smoking'))
      + q('Home hazards you can see', pills(SY + 'hazards', window.CPV ? CPV.HAZARDS : [], true)) + ((s.hazards || []).some((h) => h !== 'none') ? follow(SY + 'hazards_note', 'Where, and anything the family will fix') : '')
      + '<div class="hv-sq hv-sqw"><div><b>Allergies</b><span class="hv-n">Medicines and food. Read back what we have and confirm it.</span></div>'
      + '<div class="hv-stack">' + field('visit.allergies', 'List every one', { rows: 2 }) + '<div class="hv-seg"><button type="button" class="hv-b2" data-hva="noallergy">None known</button></div>'
      + '<div class="hv-row" style="min-height:0"><span class="hv-n">Confirmed with the family?</span>' + pills(SY + 'allergies_ok', [['yes', 'Yes, confirmed']]) + '</div></div></div>'
      + '<div class="hv-sq hv-sqw"><div><b>Emergency contact</b><span class="hv-n">Who we call first. Read it back and confirm it.</span></div>'
      + '<div class="hv-stack"><div class="hv-g3">' + field(SY + 'ec.name', 'Name') + field(SY + 'ec.rel', 'Relationship') + field(SY + 'ec.phone', 'Phone', { type: 'tel' }) + '</div>'
      + '<div class="hv-row" style="min-height:0"><span class="hv-n">Confirmed with the family?</span>' + pills(SY + 'ec_ok', [['yes', 'Yes, confirmed']]) + '</div></div></div>';
  }
  const SAFETY_PATHS = /^visit\.(safety\.|memory$|supervision$|prefs\.smoking$|acts\.(mobility|transfers)\.level$|allergies$)/;
  function safetyRefresh() { const el = document.getElementById('hvSafety'); if (el) el.innerHTML = safetyHtml(); }
  /* once: the emergency contact starts as the caller from the lead, in blue, to read back and confirm */
  function safetyPrefill(a, l) {
    const v = a.visit; v.safety = v.safety || {};
    if (!l || v.safety_filled_at || v.finished_at) return;
    const ec = v.safety.ec = v.safety.ec || {};
    if (!isSelf(l) && nil(ec.name) && callerName(l) && l.phone) { ec.name = callerName(l); ec.rel = l.relationship || ''; ec.phone = l.phone; ['name', 'rel', 'phone'].forEach((k) => { (v.from_call = v.from_call || {})['visit.safety.ec.' + k] = true; }); }
    v.safety_filled_at = new Date().toISOString();
  }
  /* every answer the visit holds, for the care plan draft: path, label, section, value (with where it came from) */
  function factsFor(a) {
    const keep = ST.a; ST.a = a;
    try {
      const v = a.visit || {}, out = [], mark = (p) => (v.from_call || {})[p] ? ' (said on a phone call, not checked at the visit)' : (v.heard || {})[p] ? ' (heard on the recording, kept)' : '';
      const add = (path, label, section, val) => { if (!blank(val)) out.push({ path, label, section, value: String(val) + mark(path) }); };
      boxes().forEach((b) => add(b.path, b.label, b.section, blank(get(b.path)) ? '' : shown(b, get(b.path))));
      const s = v.safety || {}, w = (list, k) => ((list.find((x) => x[0] === k) || [0, k])[1]);
      add('visit.safety.falls', 'Falls in the last 6 months', 'Safety', s.falls); add('visit.safety.falls_note', 'The fall', 'Safety', s.falls_note);
      add('visit.safety.lives_alone', 'Lives alone', 'Safety', s.lives_alone); add('visit.safety.two_person', 'Needs more than one person or a lift to transfer', 'Safety', s.two_person);
      add('visit.safety.cognition_note', 'Memory and judgment: what happens', 'Safety', s.cognition_note);
      add('visit.safety.decline', 'Recent decline', 'Safety', s.decline); add('visit.safety.decline_note', 'What changed', 'Safety', s.decline_note);
      add('visit.safety.summon', 'Can call for help', 'Safety', s.summon && window.CPV ? w(CPV.SUMMON, s.summon) : s.summon);
      add('visit.safety.oxygen', 'Oxygen in the home', 'Safety', s.oxygen); add('visit.safety.oxygen_note', 'The oxygen', 'Safety', s.oxygen_note);
      add('visit.safety.hazards', 'Home hazards seen', 'Safety', (s.hazards || []).map((h) => window.CPV ? w(CPV.HAZARDS, h) : h).join(', '));
      add('visit.safety.hazards_note', 'About the hazards', 'Safety', s.hazards_note);
      add('visit.allergies', 'Allergies', 'Safety', v.allergies + (s.allergies_ok === 'yes' ? ' (confirmed with the family)' : ''));
      add('visit.safety.ec', 'Emergency contact', 'Safety', [((s.ec || {}).name || ''), ((s.ec || {}).rel || ''), ((s.ec || {}).phone || '')].filter(Boolean).join(', ') + (s.ec_ok === 'yes' ? ' (confirmed)' : ''));
      /* Stage 1 fix (2026-10-29): conditions already filled in were never sent (the catalogue above only lists empty rows) */
      (v.conditions || []).forEach((c, i) => { if (!c || nil(c.name)) return; const b = 'visit.conditions.' + i + '.';
        add(b + 'name', 'Health condition', 'Health', c.name); add(b + 'onset', 'About when (' + c.name + ')', 'Health', c.onset); add(b + 'effect', 'How it affects the day (' + c.name + ')', 'Health', c.effect);
        add(b + 'notice', 'Warning sign for ' + c.name + ': what we would notice', 'Health', c.notice); add(b + 'todo', 'Warning sign for ' + c.name + ': what the caregiver should do', 'Health', c.todo); });
      /* Stage 2: the coordinator's own step-by-step notes for each activity with help; the draft's instructions come from these first */
      HOUSE.concat(PERSONAL).forEach((r) => { const hp = (((v.acts || {})[r[0]]) || {}).help || {}, b = 'visit.acts.' + r[0] + '.help.';
        add(b + 'steps', 'How we help with ' + r[1] + ': the steps, in order (the coordinator\'s notes)', 'Daily activities', hp.steps);
        add(b + 'self', 'How we help with ' + r[1] + ': what they do themselves', 'Daily activities', hp.self);
        add(b + 'supplies', 'How we help with ' + r[1] + ': where the supplies are', 'Daily activities', hp.supplies);
        add(b + 'likes', 'How we help with ' + r[1] + ': how they like it done', 'Daily activities', hp.likes);
        add(b + 'watch', 'How we help with ' + r[1] + ': what to watch for', 'Daily activities', hp.watch); });
      const hm = v.home || {};
      add('visit.home.entry', 'How the caregiver gets in', 'Home and safety', hm.entry ? ((ENTRY.find((x) => x[0] === hm.entry) || [0, hm.entry])[1] + (hm.code_in_axis === 'yes' ? ' (the code or key details are in AxisCare)' : '')) : '');
      add('visit.home.stairs', 'Stairs inside or to get in', 'Home and safety', hm.stairs);
      add('visit.home.call_order', 'The order the office calls the family', 'Home and safety', hm.call_order);
      const sh = (v.shift || []).filter((r) => r && !nil(r.what));
      add('visit.shift', 'A typical shift, in order (the coordinator agreed it); a line marked TOP 3 is a must-do', 'Schedule', sh.map((r) => (r.t ? r.t + ' ' : '') + r.what + (r.star ? ' (TOP 3)' : '')).join('; '));
      add('visit.memory', 'Memory concerns', 'Health', v.memory); add('visit.supervision', 'Needs supervision for safety', 'Health', v.supervision);
      add('visit.pain', 'Has pain', 'Health', v.pain);
      add('visit.equipment', 'Equipment they use or have', 'Health', (v.equipment || []).join(', '));
      const days = DAYS.filter((d) => dayHours(d[0])).map((d) => d[1] + ' ' + v.week[d[0]].from + ' to ' + v.week[d[0]].to);
      add('visit.week', 'Schedule agreed', 'Schedule', days.join(', ')); add('visit.start', 'Hoped-for start', 'Schedule', v.start);
      add('visit.level', 'Care level', 'Schedule', ((LEVELS.find((L) => L[0] === v.level) || [0, ''])[1]));
      add('visit.comments', 'General comments', 'Schedule', v.comments);
      add('visit.attendees', 'People in the room', 'Start', (v.attendees || []).filter((p) => p.name).map((p) => p.name + (p.rel ? ' (' + p.rel + ')' : '')).join(', '));
      (v.goals || []).forEach((g, i) => { if (g && g.text && v.top_goal === i) add('visit.top_goal', 'Most important goal', 'Their story', g.text); });
      const life = (ST.lead && ST.lead.life) || {};
      ['work', 'enjoys', 'little'].forEach((k) => { const x = life[k]; add('life.' + k, { work: 'Life story: work and life', enjoys: 'Life story: enjoys', little: 'Life story: little things that make the day better' }[k], 'Their story', x && (x.text || x)); });
      if (v.after) { add('visit.after.summary', 'Summary of the recording', 'After the visit', v.after.summary);
        (v.after.missed || []).forEach((m, i) => add('visit.after.missed.' + i, 'Missed or unclear', 'After the visit', m.title + ': ' + m.text)); }
      return out;
    } finally { ST.a = keep; }
  }
  function condHtml() {
    return '<div class="hv-cond hv-th"><span>CONDITION</span><span>ABOUT WHEN</span><span>HOW IT AFFECTS DAILY LIFE</span><span></span></div>'
      + (ST.a.visit.conditions || []).map((c, i) => '<div class="hv-cond">' + field('visit.conditions.' + i + '.name', 'Condition') + field('visit.conditions.' + i + '.onset', 'Year') + field('visit.conditions.' + i + '.effect', 'How it affects the day')
        + '<button type="button" class="hv-x" data-hva="delcond" data-i="' + i + '" aria-label="Remove this condition">×</button></div>'
        /* Stage 2: the warning signs, only once the condition has a name */
        + (c && !nil(c.name) ? '<div class="hv-warn2"><span class="hv-n">Warning signs for ' + E(c.name) + ' (optional)</span>' + field('visit.conditions.' + i + '.notice', 'What we would notice') + field('visit.conditions.' + i + '.todo', 'What to do') + '</div>' : '')).join('');
  }
  function sec3() {
    const v = ST.a.visit;
    return '<h1>Health</h1>' + callCard(callRows('health'))
      + '<section class="hv-card hv-safe" id="hvSafety">' + safetyHtml() + '</section>'
      + card('Health conditions', '<div id="hvConds">' + condHtml() + '</div>', '<button type="button" class="hv-b2" data-hva="addcond">+ Add a condition</button>')
      + '<div class="hv-g2">'
      + card('Pain',
        '<div class="hv-row"><b>Has pain?</b>' + yn('visit.pain') + '</div>'
        + lab('Where?', field('visit.pain_where'))
        + lab('What makes it harder or easier?', field('visit.pain_easier')))
      + card('Doctors and pharmacy',
        '<div class="hv-g2">' + lab('Primary doctor', field('physician_name', 'Name', { from: !!ST.a.physician_name })) + lab("Doctor's phone", field('physician_phone', '', { from: !!ST.a.physician_phone })) + '</div>'
        + '<div class="hv-g2">' + lab('Preferred hospital', field('preferred_hospital', '', { from: !!ST.a.preferred_hospital })) + lab('Preferred pharmacy', field('visit.pharmacy')) + '</div>')
      + '</div>'
      + card('Mobility and equipment', '<p class="hv-n" style="margin:0">Tap everything they use or have in the home.</p>' + pills('visit.equipment', EQUIP.map((x) => [x, x]), true) + lab('Other', field('visit.equipment_other')));
  }
  function actRow(r) {
    const p = 'visit.acts.' + r[0];
    return '<div class="hv-act"><div><div class="hv-an">' + E(r[1]) + '</div><div class="hv-ask">' + E(r[2]) + '</div></div>' + pills(p + '.level', r[3]) + field(p + '.note', 'Notes') + '</div>'
      + '<div id="hvHelp_' + r[0] + '">' + helpHtml(r) + '</div>';
  }
  /* Stage 2: "How we help", only under an activity where help is needed. Five short answers the care plan's instructions are drawn from. */
  const NO_HELP = ['', 'none', 'not_needed'];
  const helps = (k) => { const lv = (((ST.a.visit.acts || {})[k]) || {}).level || ''; return NO_HELP.indexOf(lv) < 0; };
  const HELP_ASK = {
    bathing: 'Shower or bath? Which days and time? Where are the towels and clothes?', dressing: 'Where are the clothes kept? What is hard (buttons, shoes, socks)?',
    toileting: 'Day and night? Where are the supplies (briefs, wipes, gloves)?', transfers: 'Bed, chair, toilet, car? What do they hold on to?', mobility: 'Walker or cane? Inside and outside? Where are the trip spots?',
    eating: 'Cutting food? Diet? Where do they like to eat?', meals: 'What do they like? Any diet? What is in the kitchen, and where?', meds: 'When? Where is the pill box? What if a dose was missed?',
    light_house: 'Which rooms, and what do they like done first?', heavy_house: 'Which jobs, how often?', laundry: 'Where is the washer? Which loads, which days?', shopping: 'Which stores? Who pays, and how?',
    transport: 'Where to? Whose car? Do they need help getting in and out?', appts: 'Which appointments, and where is the calendar?', phone: 'Which phone? Where is the charger?',
  };
  function helpHtml(r) {
    if (!helps(r[0])) return '';
    const b = 'visit.acts.' + r[0] + '.help.';
    return '<div class="hv-help"><div class="hv-ch"><b>How we help: ' + E(r[1]) + '</b><span class="hv-n">' + E(HELP_ASK[r[0]] || '') + '</span></div><div class="hv-g2">'
      + lab('The steps, in order', field(b + 'steps', 'One step per line', { rows: 4 }))
      + '<div class="hv-stack">' + lab('What they do themselves', field(b + 'self')) + lab('Where the supplies are', field(b + 'supplies')) + '</div>'
      + lab('How they like it done', field(b + 'likes', '', { rows: 2 })) + lab('What to watch for', field(b + 'watch', '', { rows: 2 })) + '</div></div>';
  }
  function sec4() {
    return '<h1>Daily activities</h1><div class="hv-sub">"These help us see what\'s going well and where a caregiver can make life easier and safer for you."</div>'
      + callCard(callRows('daily'))
      + card('Around the house', '<div class="hv-act hv-th"><span>ACTIVITY</span><span>LEVEL OF NEED</span><span>NOTES</span></div>'
        + HOUSE.map((r) => actRow(r) + (r[0] === 'meds' ? '<div class="hv-g3 hv-medq">'
          + lab('Who fills the pill organizer?', field('visit.meds.fills'))
          + lab('Needs our nurse (RN/LPN)?', pills('visit.meds.nurse', NURSE))
          + lab('Where is the organizer kept?', field('visit.meds.where'))
          + lab('Can the client know where it is?', yn('visit.meds.may_know'))
          + lab('Where are prescriptions refilled?', field('visit.meds.refills'))
          + '</div>' : '')).join(''))
      + card('Personal care', '<div class="hv-act hv-th"><span>ACTIVITY</span><span>LEVEL OF NEED</span><span>NOTES</span></div>'
        + PERSONAL.map((r) => actRow(r) + (r[0] === 'toileting' ? '<div class="hv-row hv-medq"><b>Changing Depends?</b>' + yn('visit.acts.toileting.depends') + '</div>' : '')).join(''));
  }
  function sec5() {
    const c = 'visit.prefs.';
    return '<h1>Caregiver and contact preferences</h1>'
      + card('The caregiver',
        '<b class="hv-q2">Caregiver gender</b>' + pills(c + 'gender', PREF.gender)
        + '<b class="hv-q2">Spanish-speaking caregiver</b>' + pills(c + 'spanish', PREF.spanish)
        + '<b class="hv-q2">Skills they need</b><span class="hv-n">Hands-on care (bathing, dressing, toileting) is on Daily activities.</span>' + pills(c + 'skills', skills(), true)
        + '<div class="hv-g3">'
        + '<div class="hv-stack"><b class="hv-q2">Cats in the home</b>' + yn(c + 'cats') + '</div>'
        + '<div class="hv-stack"><b class="hv-q2">Dogs in the home</b>' + yn(c + 'dogs') + '</div>'
        + '<div class="hv-stack"><b class="hv-q2">Someone smokes in the home</b><span class="hv-n">Asked on the safety check (Health): ' + E(({ yes: 'Yes', no: 'No' })[ST.a.visit.prefs.smoking] || 'not answered yet') + '</span></div></div>'
        + '<div class="hv-n">The agreement asks them to secure pets and not smoke during visits.</div>'
        + lab('Anything else they asked for in a caregiver', field(c + 'other', 'For example: someone patient, a quiet personality, likes to cook')))
      + card('How we stay in touch', '<div id="hvTouch">' + touchHtml() + '</div>'
        + '<div class="hv-n">The same questions as the contact page of the Client Care Agreement. Saved with the visit; nothing is sent to the family from this screen.</div>');
  }
  /* one block per person in the room: their roles, how and when to reach them, which texts they want, and (not the client) whether we may discuss care with them */
  function touchHtml() {
    const ps = (ST.a.visit.attendees || []).map((p, i) => [p, i]).filter((x) => x[0].name);
    if (!ps.length) return '<div class="hv-n">Add the people in the room on Start the visit first.</div>';
    return ps.map(([p, i]) => {
      const b = 'visit.attendees.' + i + '.';
      return '<div class="hv-touch"><div class="hv-tn"><b>' + E(p.name) + '</b><span class="hv-n">' + E(p.rel || '') + '</span></div>'
        + (p.role === 'client' ? '' : '<div class="hv-stack"><span class="hv-n">Their roles</span>' + pills(b + 'roles', ROLES, true) + '</div>')
        + '<div class="hv-g2"><div class="hv-stack"><span class="hv-n">Best way to reach them</span>' + pills(b + 'reach_way', REACH) + '</div>'
        + lab('Best time', field(b + 'reach_time', 'For example: after 3 pm'))
        + '<div class="hv-stack"><span class="hv-n">Texts they want</span>' + pills(b + 'texts', TEXTS, true) + '</div>'
        + (p.role === 'client' ? '' : '<div class="hv-stack"><span class="hv-n">May we discuss care with them?</span>' + yn(b + 'permission') + '</div>')
        + '</div></div>';
    }).join('');
  }
  /* ---------- Home and safety (Care plan Stage 2, her decisions: its own screen; the door code stays in AxisCare) ---------- */
  const ENTRY = [['key', 'A key'], ['lockbox', 'Lockbox'], ['family', 'Family lets them in'], ['other', 'Other']];
  function callOrder() {
    const v = ST.a.visit, ec = (v.safety || {}).ec || {}, out = [];
    if (ec.name) out.push(ec.name + (ec.rel ? ' (' + ec.rel + ')' : '') + (ec.phone ? ', ' + ec.phone : ''));
    (v.attendees || []).filter((p) => p.name && p.role !== 'client' && !(ec.name && p.name.toLowerCase() === ec.name.toLowerCase())).forEach((p) => out.push(p.name + (p.rel ? ' (' + p.rel + ')' : '')));
    return out.map((x, i) => (i + 1) + '. ' + x).join('\n');
  }
  function secHome() {
    const v = ST.a.visit, h = v.home = v.home || {}, pr = v.prefs || {};
    if (nil(h.call_order) && callOrder()) h.call_order = callOrder();   /* starts from How we stay in touch; the coordinator changes the order */
    const office = window.CPV ? CPV.officePhone() : '(417) 234-8494';
    const stairs = h.stairs === 'yes' || ((v.safety || {}).hazards || []).indexOf('stairs') > -1;
    return '<h1>Home and safety</h1><div class="hv-sub">What a caregiver needs to know before they walk in the door.</div>'
      + '<div class="hv-g2">'
      + card('Getting in', pills('visit.home.entry', ENTRY)
        + lab('How, and where', field('visit.home.entry_note', 'Which door, where the key or lockbox is', { rows: 2 }), 'Don\'t type a door or lockbox code here. It goes in AxisCare.')
        + (h.entry === 'key' || h.entry === 'lockbox' ? '<div class="hv-row" style="min-height:0"><span class="hv-n">Code or key details</span>' + pills('visit.home.code_in_axis', [['yes', 'In AxisCare'], ['todo', 'Still to add to AxisCare']]) + '</div>' : '')
        + lab('Parking', field('visit.home.parking', 'Driveway, street, which side')))
      + card('Who to call', '<div class="hv-li" style="border-top:none"><span>The office first, day or night</span><span>' + E(office) + '</span></div>'
        + lab('The office calls the family in this order', field('visit.home.call_order', 'One person per line', { rows: 3 }), 'From How we stay in touch and the emergency contact. Change the order if the family wants.')
        + '<div class="hv-n">What a caregiver does in an emergency is the same for every client and is set in Settings.</div>')
      + '</div>'
      + (pr.cats === 'yes' || pr.dogs === 'yes' ? card('Pets', lab('Names, and where they stay during visits', field('visit.home.pets_note', '', { rows: 2 }))) : '')
      + card('Stairs', '<div class="hv-row"><b>Any stairs inside, or to get in?</b>' + yn('visit.home.stairs') + '</div>' + (stairs ? lab('Where, and is there a rail?', field('visit.home.stairs_note')) : ''))
      + card('Where things are kept', '<div class="hv-g2">'
        + lab('Equipment (walker, shower chair, lift)', field('visit.home.equipment_where')) + lab('Cleaning supplies', field('visit.home.cleaning_where'))
        + lab('Towels and linens', field('visit.home.linens_where')) + lab('The medicine list', field('visit.home.medlist_where'), 'Where it is kept. We don\'t collect it.')
        + lab('Important papers (POA, advance directive)', field('visit.home.papers_where'), 'Where they are kept, if the family wants us to know. We don\'t collect them.') + '</div>');
  }
  /* ---------- A typical shift (Stage 2, her decision: built by itself, then the coordinator adjusts it) ---------- */
  const SHIFT_ORDER = [['meds', 'Medication reminder'], ['bathing', 'Help with the shower or bath'], ['dressing', 'Dressing and grooming'], ['toileting', 'Toileting'],
    ['light_house', 'Light housekeeping'], ['laundry', 'Laundry'], ['heavy_house', 'Heavier housekeeping'], ['meals', 'Make the meal and eat together'], ['eating', 'Help with eating'],
    ['shopping', 'Shopping and errands'], ['transport', 'Drive to appointments or errands'], ['appts', 'Go over appointments'], ['phone', 'Phone and computer help']];
  const mins_ = (t) => { const p = String(t || '').split(':'); return (+p[0]) * 60 + (+p[1] || 0); };
  const hhmm = (m) => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  function buildShift() {
    const v = ST.a.visit, first = DAYS.find((d) => dayHours(d[0]));
    if (!first) return [];
    const w = v.week[first[0]], a = mins_(w.from), z = mins_(w.to) > a ? mins_(w.to) : a + 240;
    const tasks = SHIFT_ORDER.filter((x) => helps(x[0]));
    if (!tasks.length) return [];
    const rows = [{ t: hhmm(a), what: 'Arrive, say hello, and see how ' + (((v.story || {}).called) || 'they') + ' are today' }];
    const step = Math.max(15, Math.floor((z - a - 30) / (tasks.length + 1) / 15) * 15);
    tasks.forEach((x, i) => rows.push({ t: hhmm(a + 15 + i * step), what: x[1] }));
    if (helps('mobility') || helps('transfers')) rows.push({ t: '', what: 'Throughout: stand by when walking and getting up' });
    rows.push({ t: hhmm(z - 15), what: 'Write the visit note in AxisCare' });
    return rows;
  }
  function shiftHtml() {
    const v = ST.a.visit, rows = v.shift || [];
    if (!rows.length) return '<div class="hv-n">Add the days and times above, and the help needed on Daily activities. The shift builds itself from them.</div>';
    const stars = rows.filter((r) => r.star).length;
    return '<div class="hv-n" style="margin-bottom:6px">Star the top 3 must-do tasks (' + stars + ' of 3). Change anything; it is a starting point.</div>'
      + rows.map((r, i) => '<div class="hv-shift"><input class="hv-f" type="time" data-hv="visit.shift.' + i + '.t" value="' + E(r.t || '') + '" aria-label="Time">'
        + field('visit.shift.' + i + '.what', 'What happens')
        + '<button type="button" class="hv-star' + (r.star ? ' on' : '') + '" data-hva="shiftstar" data-i="' + i + '" aria-pressed="' + !!r.star + '"' + (!r.star && stars >= 3 ? ' disabled' : '') + '>' + (r.star ? 'Top 3' : 'Star') + '</button>'
        + '<button type="button" class="hv-x" data-hva="shiftdel" data-i="' + i + '" aria-label="Remove this line">×</button></div>').join('')
      + '<div style="display:flex;gap:8px;margin-top:8px"><button type="button" class="hv-b2" data-hva="shiftadd">+ Add a line</button><button type="button" class="hv-b2" data-hva="shiftbuild">Build it again from the schedule</button></div>';
  }
  /* ---------- Still needs attention (Stage 2): a count in the top bar, each item jumps to its box ---------- */
  function needsList() {
    const v = ST.a.visit, h = v.home || {}, out = [];
    (window.CPV ? CPV.safetyMissing(v) : []).forEach((m) => out.push([m[0], S_.health, m[1]]));
    if (nil(h.entry)) out.push(['How the caregiver gets in', S_.home, 'visit.home.entry']);
    HOUSE.concat(PERSONAL).filter((r) => helps(r[0])).forEach((r) => {
      const hp = (((v.acts || {})[r[0]]) || {}).help || {};
      if (nil(hp.steps)) out.push(['How we help with ' + r[1].toLowerCase() + ': the steps', S_.daily, 'visit.acts.' + r[0] + '.help.steps']);
      if (nil(hp.supplies)) out.push(['Where the supplies are for ' + r[1].toLowerCase(), S_.daily, 'visit.acts.' + r[0] + '.help.supplies']);
    });
    return out;
  }
  function needsRefresh() {
    const el = document.getElementById('hvNeedsList'); if (el && !el.hidden) el.innerHTML = needsListHtml();
    const b = document.querySelector('#hvBar [data-hva="needs"]'); if (b) { const n = needsList().length; b.textContent = n ? n + ' still needs attention' : 'All answered'; b.classList.toggle('on', !!n); b.setAttribute('aria-label', 'Still needs attention: ' + n); }
  }
  function needsListHtml() {
    const l = needsList();
    return '<div class="hv-ch"><b>Still needs attention</b><button type="button" class="hv-b2" data-hva="needsclose">Close</button></div>'
      + (l.length ? l.map((x, i) => '<button type="button" class="hv-need" data-hva="needsgo" data-sec="' + x[1] + '" data-p="' + E(x[2]) + '">' + E(x[0]) + '<span class="hv-n">' + E(SECS[x[1]]) + '</span></button>').join('') : '<div class="hv-n">Nothing left. Everything the care plan needs is answered.</div>');
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
    if (!(v.shift || []).length && !v.shift_cleared) v.shift = buildShift();
    return '<h1>Schedule, payment and care level</h1>'
      + card('Care proposal: days and times', '<div class="hv-week">' + DAYS.map((d) => '<div class="hv-day' + (dayHours(d[0]) ? ' on' : '') + '"><b>' + d[1] + '</b>'
        + field('visit.week.' + d[0] + '.from', '', { type: 'time', attrs: ' aria-label="' + d[1] + ' start"' }) + field('visit.week.' + d[0] + '.to', '', { type: 'time', attrs: ' aria-label="' + d[1] + ' end"' }) + '</div>').join('') + '</div>'
        + '<div class="hv-sum" id="hvWeekSum">' + weekSummary() + '</div>' + lab('Hoped-for start', field('visit.start', '', { type: 'date', attrs: ' style="max-width:220px"' })))
      + card('A typical shift', '<div id="hvShift">' + shiftHtml() + '</div>')
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
  /* ---------- 8 After the visit (stage 3, 2026-10-29) ----------
     Her rule: the recording fills EMPTY boxes, in yellow, for review, and never changes what someone typed. The office taps
     "Read the recording" (the visit-review function reads every written-out part); nothing goes into the form until Keep. */
  const blank = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
  function boxes() {
    const out = [], add = (sec, section, path, label, options) => out.push({ sec, section, path, label, ...(options ? { options } : {}) });
    const v = ST.a.visit;
    add(1, 'Their story', 'visit.story.trigger', 'What prompted the call');
    add(1, 'Their story', 'visit.story.overview', "What's been going on lately");
    ['morning', 'afternoon', 'evening'].forEach((k) => add(1, 'Their story', 'visit.story.' + k, 'A day at home: ' + k));
    [0, 1, 2].forEach((i) => add(1, 'Their story', 'visit.goals.' + i + '.text', 'Goal ' + (i + 1)));
    add(1, 'Their story', 'visit.story.good_care', 'What good care looks like to the family'); add(1, 'Their story', 'visit.story.self', 'What they still do themselves');
    add(1, 'Their story', 'visit.story.called', 'What they like to be called');
    add(S_.home, 'Home and safety', 'visit.home.entry_note', 'How the caregiver gets in (never a door or lockbox code)'); add(S_.home, 'Home and safety', 'visit.home.parking', 'Parking');
    add(S_.home, 'Home and safety', 'visit.home.pets_note', 'Pets: names, and where they stay during visits'); add(S_.home, 'Home and safety', 'visit.home.stairs_note', 'Stairs: where, and is there a rail');
    [['equipment_where', 'Where equipment is kept'], ['cleaning_where', 'Where cleaning supplies are kept'], ['linens_where', 'Where towels and linens are kept'], ['medlist_where', 'Where the medicine list is kept']]
      .forEach((x) => add(S_.home, 'Home and safety', 'visit.home.' + x[0], x[1]));
    const nc = (v.conditions || []).length;
    for (let i = 0; i < nc + 3; i++) {
      const c = (v.conditions || [])[i] || {};
      if (!blank(c.name) || !blank(c.onset) || !blank(c.effect)) continue;
      add(2, 'Health', 'visit.conditions.' + i + '.name', 'Health condition ' + (i + 1) + ': the condition');
      add(2, 'Health', 'visit.conditions.' + i + '.onset', 'Health condition ' + (i + 1) + ': about when (year)');
      add(2, 'Health', 'visit.conditions.' + i + '.effect', 'Health condition ' + (i + 1) + ': how it affects the day');
    }
    add(2, 'Health', 'visit.memory', 'Memory concerns?', YN); add(2, 'Health', 'visit.supervision', 'Needs supervision for safety?', YN); add(2, 'Health', 'visit.pain', 'Has pain?', YN);
    add(2, 'Health', 'visit.pain_where', 'Pain: where'); add(2, 'Health', 'visit.pain_easier', 'Pain: what makes it harder or easier');
    add(2, 'Health', 'visit.allergies', 'Allergies (medicines and food)');
    add(2, 'Health', 'physician_name', 'Primary doctor'); add(2, 'Health', 'physician_phone', "Doctor's phone");
    add(2, 'Health', 'preferred_hospital', 'Preferred hospital'); add(2, 'Health', 'visit.pharmacy', 'Preferred pharmacy');
    add(2, 'Health', 'visit.equipment_other', 'Other equipment they use (not cane, walker, wheelchair, shower chair, grab bars, medical alert, gait belt, bed rails, Hoyer lift)');
    HOUSE.concat(PERSONAL).forEach((r) => { add(3, 'Daily activities', 'visit.acts.' + r[0] + '.level', r[1] + ': level of need', r[3]); add(3, 'Daily activities', 'visit.acts.' + r[0] + '.note', r[1] + ': notes'); });
    add(3, 'Daily activities', 'visit.acts.toileting.depends', 'Changing Depends?', YN);
    add(3, 'Daily activities', 'visit.meds.fills', 'Who fills the pill organizer?'); add(3, 'Daily activities', 'visit.meds.nurse', 'Needs our nurse (RN/LPN)?', NURSE);
    add(3, 'Daily activities', 'visit.meds.where', 'Where the pill organizer is kept'); add(3, 'Daily activities', 'visit.meds.may_know', 'Can the client know where it is?', YN);
    add(3, 'Daily activities', 'visit.meds.refills', 'Where prescriptions are refilled');
    const c = 'visit.prefs.';
    add(S_.prefs, 'Preferences', c + 'gender', 'Caregiver gender', PREF.gender); add(S_.prefs, 'Preferences', c + 'spanish', 'Spanish-speaking caregiver', PREF.spanish);
    add(S_.prefs, 'Preferences', c + 'cats', 'Cats in the home', YN); add(S_.prefs, 'Preferences', c + 'dogs', 'Dogs in the home', YN); add(S_.prefs, 'Preferences', c + 'smoking', 'Someone smokes in the home', YN);
    add(S_.prefs, 'Preferences', c + 'other', 'Anything else they asked for in a caregiver');
    (v.attendees || []).forEach((p, i) => { if (!p.name) return; const b = 'visit.attendees.' + i + '.';
      add(S_.prefs, 'Preferences', b + 'reach_way', p.name + ': best way to reach them', REACH); add(S_.prefs, 'Preferences', b + 'reach_time', p.name + ': best time to reach them');
      if (p.role !== 'client') add(S_.prefs, 'Preferences', b + 'permission', p.name + ': may we discuss care with them?', YN); });
    return out;
  }
  const shown = (b, val) => (b.options ? ((b.options.find((o) => o[0] === val) || [0, val])[1]) : String(val));
  function knownText() {
    const lines = boxes().filter((b) => !blank(get(b.path))).map((b) => b.section + ': ' + b.label + ': ' + shown(b, get(b.path)));
    const v = ST.a.visit, days = DAYS.filter((d) => dayHours(d[0]));
    if (days.length) lines.push('Schedule proposed: ' + days.map((d) => d[1] + ' ' + v.week[d[0]].from + ' to ' + v.week[d[0]].to).join(', '));
    if (v.level) lines.push('Care level: ' + ((LEVELS.find((L) => L[0] === v.level) || [0, v.level])[1]));
    if ((v.equipment || []).length) lines.push('Equipment: ' + v.equipment.join(', '));
    return lines.join('\n');
  }
  const hms = (s) => { s = Math.max(0, Math.round(+s || 0)); return Math.floor(s / 3600) + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  const hear = (x) => x && x.rec ? '<button type="button" class="hv-play" data-hva="hear" data-rec="' + E(x.rec) + '" data-t="' + (+x.local || 0) + '">Hear it, ' + hms(x.at) + '</button>' : '';
  const voiceOf = (label) => { const af = ST.a.visit.after || {}; return ((af.names || {})[label]) || ((af.voices || []).find((x) => x.label === label) || {}).person || 'Unknown'; };
  function voicesHtml() {
    const af = ST.a.visit.after, vs = af.voices || [];
    if (!vs.length) return '';
    const names = (ST.a.visit.attendees || []).filter((p) => p.name).map((p) => [p.name, p.name + (p.rel ? ', ' + p.rel : '')]).concat([['Caring Companions', 'Caring Companions (you)'], ['Unknown', "Can't tell"]]);
    const sel = (label) => '<select class="hv-f" data-hvvoice="' + E(label) + '" aria-label="Who is ' + E(label) + '">' + names.map((n) => '<option value="' + E(n[0]) + '"' + (voiceOf(label) === n[0] ? ' selected' : '') + '>' + E(n[1]) + '</option>').join('') + '</select>';
    const row = (x) => '<div class="hv-spk"><span class="hv-chip">' + E(x.label.replace(/^P(\d+) /, 'Part $1, ')) + '</span><span class="hv-quote">"' + E(x.sample) + '"</span>' + sel(x.label) + '</div>';
    return card("Who's who", '<div class="hv-n" style="margin:0">The voices are labelled again in each 10-minute part. Check each one is the right person; change any that are wrong.</div>' + vs.map(row).join(''));
  }
  function fillRow(f) {
    const b = boxes().find((x) => x.path === f.path) || { label: f.path, section: '' };
    const mk = (ST.a.visit.after.marks || {})[f.path], typed = !blank(get(f.path));
    const inp = b.options ? '<select class="hv-f hv-heard" data-hvfill="' + E(f.path) + '">' + b.options.map((o) => '<option value="' + E(o[0]) + '"' + (o[0] === f.value ? ' selected' : '') + '>' + E(o[1]) + '</option>').join('') + '</select>'
      : '<textarea class="hv-f hv-heard" rows="2" data-hvfill="' + E(f.path) + '">' + E(f.value) + '</textarea>';
    const right = mk === 'kept' ? '<span class="hv-ok">Kept</span>' : mk === 'skip' ? '<span class="hv-n">Left out</span> <button type="button" class="hv-b2" data-hva="fillundo" data-p="' + E(f.path) + '">Undo</button>'
      : typed ? '<span class="hv-n">Someone typed an answer, so it stays as typed</span>'
      : '<button type="button" class="hv-b2" data-hva="fillkeep" data-p="' + E(f.path) + '">Keep</button><button type="button" class="hv-b2" data-hva="fillskip" data-p="' + E(f.path) + '">Not right</button>';
    return '<div class="hv-fill' + (mk || typed ? ' hv-fdone' : '') + '"><div class="hv-where"><strong>' + E(b.label) + '</strong>' + E(b.section) + '<div class="hv-said">Heard: "' + E(f.quote) + '"' + (f.who ? ' (' + E(voiceOf(f.who)) + ')' : '') + '</div></div>'
      + (mk || typed ? '<div class="hv-fv">' + E(shown(b, mk === 'kept' ? get(f.path) : f.value)) + '</div>' : inp)
      + '<div class="hv-fa">' + hear(f) + right + '</div></div>';
  }
  function afterBody() {
    const af = ST.a.visit.after;
    if (!af) return '';
    const fills = af.fills || [], left = fills.filter((f) => !(af.marks || {})[f.path] && blank(get(f.path))).length;
    return voicesHtml()
      + card('Summary', '<div style="font-size:15px;line-height:1.6;white-space:pre-wrap">' + E(af.summary || 'No summary came back.') + '</div>')
      + card('Filled from the recording', fills.length ? fills.map(fillRow).join('') + (left > 1 ? '<div style="display:flex;justify-content:flex-end"><button type="button" class="hv-b" data-hva="fillall">Keep all ' + left + ' left</button></div>' : '')
        : '<div class="hv-n">Nothing new for the empty boxes. Everything heard was already on the form, or it wasn\'t said clearly.</div>',
        fills.length ? '<span class="hv-tag hv-sug">' + (left ? left + ' to check' : 'All checked') + '</span>' : '')
      + card('Missed or unclear', (af.missed || []).length ? af.missed.map((m) => '<div class="hv-miss"><span class="hv-mi">?</span><div style="flex:1"><div style="font-size:15px;font-weight:600">' + E(m.title) + '</div><div class="hv-n" style="font-size:14px">' + E(m.text) + '</div></div>' + hear(m) + '</div>').join('')
        : '<div class="hv-n">Nothing stood out as missed or unclear.</div>');
  }
  function afterSec() {
    return '<div class="hv-h"><div><h1>After the visit</h1><div class="hv-sub">Nothing from the recording goes into the form until you tap Keep. Anything typed during the visit stays as it was typed.</div></div></div>'
      + '<section class="hv-card"><div class="hv-ch"><h2>The recording</h2></div><div id="hvAfterRec"><div class="hv-n">Checking…</div></div></section>'
      + '<div id="hvAfterBody" class="hv-stack" style="gap:18px">' + afterBody() + '</div>';
  }
  async function afterLoad() {
    const box = document.getElementById('hvAfterRec'); if (!box) return;
    let rows = [];
    try { const r = await sb.from('recordings').select('id, status, consent_given, part, seconds, offset_seconds').eq('kind', 'assessment').eq('subject_id', String(ST.a.id)); if (r.error) throw r.error; rows = r.data || []; }
    catch (e) { box.innerHTML = '<div class="hv-warn">Could not check the recording: ' + E(e.message || e) + '</div>'; return; }
    const done = rows.filter((r) => r.status === 'done').length, failed = rows.filter((r) => r.status === 'failed').length, mins = Math.round(rows.reduce((a, r) => Math.max(a, (+r.offset_seconds || 0) + (+r.seconds || 0)), 0) / 60);
    const af = ST.a.visit.after;
    if (!rows.length) { box.innerHTML = '<div class="hv-n">This visit has no recording on the Hub. If it was recorded somewhere else, paste the transcript on the assessment.</div>'; return; }
    const wait = rows.length - done - failed;
    box.innerHTML = '<div class="hv-row"><span><b>' + rows.length + ' part' + (rows.length === 1 ? '' : 's') + '</b>' + (mins ? ', about ' + mins + ' minutes' : '') + '. '
      + (wait ? wait + ' still being written out. ' : 'All written out. ') + (failed ? '<span class="hv-warn">' + failed + ' could not be written out; retry it in the recording list on the assessment.</span>' : '') + '</span>'
      + (done ? '<button type="button" class="hv-b" data-hva="readrec">' + (af ? 'Read it again' : 'Read the recording') + '</button>' : '') + '</div>'
      + (af ? '<div class="hv-n">Read ' + E(new Date(af.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + (af.by ? ' by ' + E(af.by) : '') + (af.parts_waiting ? ', before ' + af.parts_waiting + ' part' + (af.parts_waiting === 1 ? ' was' : 's were') + ' written out' : '') + '.</div>' : '')
      + '<div id="hvReadMsg"></div>';
  }
  async function afterRead(btn) {
    const msg = document.getElementById('hvReadMsg');
    const af0 = ST.a.visit.after;
    if (af0 && (af0.fills || []).some((f) => (af0.marks || {})[f.path]) && !(await ask('Read it again? Answers you already kept stay in the form. The new reading replaces this list.'))) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Reading…'; }
    if (msg) msg.innerHTML = '<div class="hv-n">Reading the whole visit. This can take a minute or two; keep this screen open.</div>';
    try {
      const empty = boxes().filter((b) => blank(get(b.path))).map((b) => ({ path: b.path, label: b.label, section: b.section, ...(b.options ? { options: b.options } : {}) }));
      const r = await sb.functions.invoke('visit-review', { body: { assessment_id: String(ST.a.id), client: String(ST.a.client_name || '').split(/\s+/)[0], people: (ST.a.visit.attendees || []).filter((p) => p.name).map((p) => ({ name: p.name, rel: p.rel || p.role || '' })), known: knownText(), fields: empty } });
      if (r.error) { let m = r.error.message || 'error'; try { const j = await r.error.context.json(); if (j && j.error) m = j.error; } catch (e) {} throw new Error(m); }
      if (!r.data || r.data.error) throw new Error((r.data && r.data.error) || 'no answer');
      const d = r.data, keep = ST.a.visit.after && ST.a.visit.after.names;
      ST.a.visit.after = { at: d.at, by: d.by || me(), summary: d.summary || '', voices: d.voices || [], fills: d.fills || [], missed: d.missed || [], parts: d.parts || [], parts_waiting: d.parts_waiting || 0, dropped: d.dropped || 0, marks: {}, names: {} };
      if (keep) for (const k of Object.keys(keep)) if (ST.a.visit.after.voices.some((x) => x.label === k)) ST.a.visit.after.names[k] = keep[k];
      await saveNow();
      document.getElementById('hvAfterBody').innerHTML = afterBody();
      await afterLoad();
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = ST.a.visit.after ? 'Read it again' : 'Read the recording'; }
      const m = document.getElementById('hvReadMsg'); if (m) m.innerHTML = '<div class="hv-note">Could not read the recording: ' + E(e.message || e) + '</div>';
    }
  }
  /* writes one heard answer into the form, only into an empty box */
  function keepFill(path) {
    const af = ST.a.visit.after, f = (af.fills || []).find((x) => x.path === path); if (!f) return false;
    if (!blank(get(path))) return false;
    const el = document.querySelector('#hvRoot [data-hvfill="' + path + '"]'), val = el ? el.value.trim() : f.value;
    if (!val) return false;
    const m = path.match(/^visit\.conditions\.(\d+)\./); if (m) { const cs = ST.a.visit.conditions; while (cs.length <= +m[1]) cs.push({}); }
    set(path, val);
    (ST.a.visit.heard = ST.a.visit.heard || {})[path] = true;
    (af.marks = af.marks || {})[path] = 'kept';
    return true;
  }
  function redrawSecs(paths) {
    const secs = new Set(boxes().filter((b) => paths.indexOf(b.path) > -1).map((b) => b.sec));
    paths.forEach((p) => { if (/^visit\.conditions\./.test(p)) secs.add(2); });
    secs.forEach((i) => { const el = document.querySelector('#hvRoot .hv-sec[data-sec="' + i + '"]'); if (el) el.innerHTML = SEC_FN[i](); if (i === 1) lifeMount(); });
    const b = document.getElementById('hvAfterBody'); if (b) b.innerHTML = afterBody();
  }
  let AUD = null;
  async function hearAt(rec, t) {
    try {
      if (!AUD || AUD.dataset.rec !== rec) {
        const row = await sb.from('recordings').select('storage_path, audio_purged_at').eq('id', rec).maybeSingle();
        if (row.error) throw row.error;
        if (!row.data) throw new Error('that part is not on the server');
        if (row.data.audio_purged_at) { toast('The sound for this part has been deleted (the words are kept).'); return; }
        const u = await sb.storage.from('recordings').createSignedUrl(row.data.storage_path, 3600); if (u.error) throw u.error;
        if (AUD) AUD.remove();
        AUD = document.createElement('audio'); AUD.controls = true; AUD.dataset.rec = rec; AUD.src = u.data.signedUrl; AUD.className = 'hv-aud';
        document.getElementById('hvRoot').appendChild(AUD);
      }
      AUD.currentTime = Math.max(0, (+t || 0) - 2); await AUD.play();
    } catch (e) { toast('Could not play the recording: ' + (e && e.message || e)); }
  }

  const SEC_FN = [sec1, sec2, sec3, sec4, secHome, sec5, sec6, sec7, afterSec];

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
      + '.hv-callc{background:#F3F8F8;border-color:#C2D7D8}.hv-cr{display:grid;grid-template-columns:170px minmax(0,1fr);gap:12px;padding:8px 0;border-top:1px solid #DCE8E8;font-size:15px;line-height:1.45}.hv-cr b{color:#14565D;font-size:14px}'
      + '.hv-callp{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding-top:10px;border-top:1px dashed #C2D7D8}.hv-callp .hv-n{flex-basis:100%}'
      + '.hv-touch{display:flex;flex-direction:column;gap:10px;padding:14px 0;border-top:1px solid #EEEAE3}.hv-touch:first-child{border-top:none;padding-top:0}.hv-tn{display:flex;gap:10px;align-items:baseline}.hv-tn b{font-size:17px}'
      + '.hv-seg button.hv-pfrom{box-shadow:0 0 0 3px #9CC3C6}'
      + '.hv-safe{border:2px solid #9CC3C6}.hv-sq{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:8px 0;border-top:1px solid #EEEAE3}.hv-sq b{display:block;font-size:15px}.hv-sq .hv-n{display:block}'
      + '.hv-sqw{grid-template-columns:minmax(0,1fr) minmax(0,1.6fr);align-items:start}.hv-fu{padding:0 0 8px 18px;border-left:3px solid #9CC3C6;margin-left:4px}'
      + '@media (max-width:700px){.hv-sq,.hv-sqw{grid-template-columns:minmax(0,1fr)}}'
      + '.hv-warn2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;padding:0 0 10px 12px;border-left:3px solid #E8C66A;margin:-2px 0 6px 4px}.hv-warn2 .hv-n{grid-column:1/-1}'
      + '.hv-help{background:#F3F8F8;border:1px solid #C2D7D8;border-radius:12px;padding:12px 14px;margin:0 0 10px;display:flex;flex-direction:column;gap:10px}.hv-help .hv-ch{flex-wrap:wrap;justify-content:flex-start}'
      + '.hv-shift{display:grid;grid-template-columns:130px minmax(0,1fr) auto 44px;gap:8px;align-items:center;padding:4px 0}.hv-shift .hv-star:disabled{opacity:.45}'
      + '.hv-needsb.on{border-color:#D99A1E;color:#7A5200;background:#FFF8E8}.hv-needs{position:absolute;right:16px;top:64px;z-index:5;width:min(420px,calc(100% - 32px));max-height:70vh;overflow:auto;background:#fff;border:1px solid #CFCAC0;border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.18);padding:12px 14px;display:flex;flex-direction:column;gap:6px}'
      + '.hv-need{display:flex;justify-content:space-between;gap:10px;align-items:center;text-align:left;min-height:44px;padding:8px 10px;border:1px solid #EEEAE3;border-radius:10px;background:#fff;font:inherit;font-size:14px;cursor:pointer}'
      + '.hv-main{position:relative}'
      + '@media (max-width:700px){.hv-warn2{grid-template-columns:minmax(0,1fr)}.hv-shift{grid-template-columns:110px minmax(0,1fr) 44px}.hv-shift .hv-star{grid-column:2}}'
      + '.hv-heardseg{background:#FFF4B8;border-radius:24px;padding:4px;box-shadow:0 0 0 1px #D9BC3A}'
      + '.hv-spk{display:grid;grid-template-columns:110px minmax(0,1fr) 240px;gap:12px;align-items:center;padding:8px 0;border-top:1px solid #EEEAE3}'
      + '.hv-chip{font-size:13px;font-weight:700;padding:6px 10px;border-radius:10px;text-align:center;background:#E3F0EF;color:#14565D}'
      + '.hv-quote{font-size:14px;color:#465255;font-style:italic;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}'
      + '.hv-fill{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.3fr) auto;gap:12px;align-items:center;padding:10px 0;border-top:1px solid #EEEAE3}'
      + '.hv-fdone{opacity:.85}.hv-fv{font-size:15px}.hv-fa{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}'
      + '.hv-where{font-size:13px;color:#465255;line-height:1.35}.hv-where strong{display:block;color:#1E2B2F;font-size:14px}.hv-said{font-style:italic;margin-top:3px}'
      + '.hv-play{background:none;border:none;font:inherit;font-size:13px;color:#14565D;font-weight:600;cursor:pointer;min-height:44px;padding:0 4px;white-space:nowrap}'
      + '.hv-miss{display:flex;gap:14px;align-items:flex-start;padding:12px 0;border-top:1px solid #EEEAE3}'
      + '.hv-mi{width:28px;height:28px;flex:none;border-radius:14px;background:#FCE6DC;color:#9A3412;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px}'
      + '.hv-aud{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);width:min(520px,92vw);z-index:4001;box-shadow:0 4px 18px rgba(0,0,0,.25);border-radius:30px}'
      + '@media (max-width:900px){#hvRoot{flex-direction:column}.hv-rail{width:auto;flex-direction:row;padding:8px;border-right:none;border-bottom:1px solid #E4E0D8;overflow-x:auto}.hv-rail .hv-brand,.hv-rail .hv-who,.hv-rail .hv-gap{display:none}.hv-barlogo{display:block}.hv-rail button{white-space:nowrap}'
      + '.hv-cols,.hv-g2,.hv-g3,.hv-act{grid-template-columns:minmax(0,1fr)}.hv-week{grid-template-columns:repeat(auto-fill,minmax(124px,1fr))}.hv-person{grid-template-columns:36px minmax(0,1fr) 44px;grid-template-areas:"av n x" ". r ." ". s s"}.hv-body{padding:16px}'
      + '.hv-spk,.hv-fill,.hv-cr{grid-template-columns:minmax(0,1fr)}.hv-fa{justify-content:flex-start}.hv-miss{flex-wrap:wrap}}';
    document.head.appendChild(s);
  }
  function railHtml() {
    return '<div class="hv-brand"><img src="cc-logo.png" alt="Caring Companions"></div><div class="hv-who"><b>' + E(ST.a.client_name || 'Home visit') + '</b><span class="hv-n">Home visit, ' + E(ST.a.visit_date || '') + '</span></div>'
      + SECS.map((t, i) => (i === AFTER ? '<div class="hv-gap" style="flex:1"></div>' : '') + '<button type="button" data-hvs="' + i + '" class="' + (i === ST.sec ? 'on' : (ST.a.visit.seen || {})[i] || (i === AFTER && ST.a.visit.after) ? 'done' : '') + '"' + (i === ST.sec ? ' aria-current="step"' : '') + '><span class="hv-num">' + (i + 1) + '</span>' + E(t) + '</button>').join('')
      + '<button type="button" data-hva="close"><span class="hv-num">×</span>Close</button>';
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
      + (function () { const n = needsList().length; return '<button type="button" class="hv-b2 hv-needsb' + (n ? ' on' : '') + '" data-hva="needs" aria-label="Still needs attention: ' + n + '">' + (n ? n + ' still needs attention' : 'All answered') + '</button>'; })()
      + (st === 'recording' ? '<button type="button" class="hv-b2" data-hva="pauserec">Pause</button>' : '')
      + (st === 'paused' ? '<button type="button" class="hv-b" data-hva="resumerec">Resume</button>' : '')
      + (st === 'lost' ? '<button type="button" class="hv-b" data-hva="keeprec">Keep recording</button>' : '')
      + (rec ? '<button type="button" class="hv-b2 hv-stop" data-hva="stoprec">Stop recording</button>' : '');
  }
  function footHtml() {
    return '<div class="hv-foot">' + (ST.sec > 0 ? '<button type="button" class="hv-b2" data-hvs="' + (ST.sec - 1) + '">Back</button>' : '<span></span>')
      + (ST.sec < AFTER - 1 ? '<button type="button" class="hv-b" data-hvs="' + (ST.sec + 1) + '">Next: ' + E(SECS[ST.sec + 1]) + '</button>'
        : ST.sec === AFTER - 1 ? '<button type="button" class="hv-b" data-hva="finish">Finish the visit</button>'
        : '<button type="button" class="hv-b" data-hva="close">Close</button>') + '</div>';
  }
  function show(i) {
    (ST.a.visit.seen = ST.a.visit.seen || {})[ST.sec] = true;
    ST.sec = i;
    document.querySelectorAll('#hvRoot .hv-sec').forEach((el) => { el.style.display = +el.getAttribute('data-sec') === i ? '' : 'none'; });
    if (i === S_.prefs) { const t = document.getElementById('hvTouch'); if (t) t.innerHTML = touchHtml(); }
    if (i === S_.health) safetyRefresh();
    if (i === S_.daily || i === S_.home || i === S_.plan) { const d = document.querySelector('#hvRoot .hv-sec[data-sec="' + i + '"]'); if (d) d.innerHTML = SEC_FN[i](); }
    if (i === S_.plan) { refreshLevels(); }
    if (i === S_.sign) { const ag = document.getElementById('hvAgree'); if (ag) ag.innerHTML = agreeHtml(); sigInit(); }
    needsRefresh();
    if (i === AFTER) { const b = document.getElementById('hvAfterBody'); if (b) b.innerHTML = afterBody(); afterLoad(); }
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
      + '<div class="hv-main"><div class="hv-bar" id="hvBar">' + barHtml() + '</div><div id="hvNeedsList" class="hv-needs" hidden></div><div class="hv-body">'
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
      if (ST.a.visit.from_call && ST.a.visit.from_call[p]) delete ST.a.visit.from_call[p];
      if (p === 'visit.rate') ST.a.visit.rate_typed = true;
      needsRefresh();
      if (p.indexOf('visit.week.') === 0) { const s = document.getElementById('hvWeekSum'); if (s) s.innerHTML = weekSummary(); const d = el.closest('.hv-day'); if (d) d.classList.toggle('on', !!dayHours(p.split('.')[2])); }
      if (/^visit\.attendees\.\d+\.name$/.test(p)) { /* the bar's head count */ }
      saveSoon();
    });
    root.addEventListener('change', (e) => {
      const lb = e.target.getAttribute && e.target.getAttribute('data-hvvoice'); if (!lb || !ST.a.visit.after) return;
      (ST.a.visit.after.names = ST.a.visit.after.names || {})[lb] = e.target.value;
      const b = document.getElementById('hvAfterBody'); if (b) b.innerHTML = afterBody(); saveSoon();
    });
    root.addEventListener('change', (e) => {
      const p = e.target.getAttribute && e.target.getAttribute('data-hv');
      if (p && /^visit\.conditions\.\d+\.name$/.test(p)) { const c = document.getElementById('hvConds'); if (c) c.innerHTML = condHtml(); }
      if (p && /^visit\.week\./.test(p) && !(ST.a.visit.shift || []).length) { ST.a.visit.shift = buildShift(); const el = document.getElementById('hvShift'); if (el) el.innerHTML = shiftHtml(); }
    });
    root.addEventListener('click', async (e) => {
      const s = e.target.closest('[data-hvs]'); if (s) { show(+s.getAttribute('data-hvs')); return; }
      const pb = e.target.closest('[data-hvp]');
      if (pb && !pb.disabled) {
        const p = pb.getAttribute('data-hvp'), v = pb.getAttribute('data-v');
        if (pb.getAttribute('data-multi')) { const cur = Array.isArray(get(p)) ? get(p).slice() : []; const i = cur.indexOf(v); if (i > -1) cur.splice(i, 1); else cur.push(v); set(p, cur); pb.classList.toggle('on', i < 0); pb.setAttribute('aria-pressed', String(i < 0)); }
        else { const on = get(p) !== v; set(p, on ? v : ''); pb.parentElement.querySelectorAll('button').forEach((b) => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }); if (on) { pb.classList.add('on'); pb.setAttribute('aria-pressed', 'true'); } }
        if (ST.a.visit.heard && ST.a.visit.heard[p]) { delete ST.a.visit.heard[p]; pb.parentElement.classList.remove('hv-heardseg'); }
        if (ST.a.visit.from_call && ST.a.visit.from_call[p + ':' + v]) { delete ST.a.visit.from_call[p + ':' + v]; pb.classList.remove('hv-pfrom'); }
        if (p.indexOf('visit.acts.') === 0 || p === 'visit.equipment') refreshLevels();
        { const m = p.match(/^visit\.acts\.([a-z_]+)\.level$/), r = m && HOUSE.concat(PERSONAL).find((x) => x[0] === m[1]); const h = r && document.getElementById('hvHelp_' + r[0]); if (h) h.innerHTML = helpHtml(r); }
        if (/^visit\.(home\.|prefs\.(cats|dogs)$|safety\.hazards$)/.test(p)) { const hs = document.querySelector('#hvRoot .hv-sec[data-sec="' + S_.home + '"]'); if (hs && ST.sec === S_.home) hs.innerHTML = secHome(); }
        needsRefresh();
        if (SAFETY_PATHS.test(p)) safetyRefresh();
        saveSoon(); return;
      }
      const a = e.target.closest('[data-hva]'); if (!a) return;
      const act = a.getAttribute('data-hva'), i = +a.getAttribute('data-i');
      if (act === 'addperson') { ST.a.visit.attendees.push({ name: '', rel: '', role: 'family' }); document.getElementById('hvPeople').innerHTML = peopleHtml(); saveSoon(); return; }
      if (act === 'needs') { const el = document.getElementById('hvNeedsList'); el.hidden = !el.hidden; if (!el.hidden) el.innerHTML = needsListHtml(); return; }
      if (act === 'needsclose') { document.getElementById('hvNeedsList').hidden = true; return; }
      if (act === 'needsgo') { document.getElementById('hvNeedsList').hidden = true; show(+a.getAttribute('data-sec')); const p = a.getAttribute('data-p');
        setTimeout(() => { const t = document.querySelector('#hvRoot .hv-sec[data-sec="' + a.getAttribute('data-sec') + '"] [data-hv="' + p + '"], #hvRoot .hv-sec[data-sec="' + a.getAttribute('data-sec') + '"] [data-hvp="' + p + '"]');
          if (t) { t.scrollIntoView({ block: 'center' }); if (t.focus) t.focus(); } }, 30); return; }
      if (act === 'shiftstar') { const r = ST.a.visit.shift[i]; if (!r) return; if (!r.star && ST.a.visit.shift.filter((x) => x.star).length >= 3) return; r.star = !r.star; document.getElementById('hvShift').innerHTML = shiftHtml(); saveSoon(); return; }
      if (act === 'shiftdel') { ST.a.visit.shift.splice(i, 1); if (!ST.a.visit.shift.length) ST.a.visit.shift_cleared = true; document.getElementById('hvShift').innerHTML = shiftHtml(); saveSoon(); return; }
      if (act === 'shiftadd') { (ST.a.visit.shift = ST.a.visit.shift || []).push({ t: '', what: '' }); document.getElementById('hvShift').innerHTML = shiftHtml(); saveSoon(); return; }
      if (act === 'shiftbuild') { if ((ST.a.visit.shift || []).length && !(await ask('Build the typical shift again from the schedule? Your changes to it are replaced.'))) return; ST.a.visit.shift = buildShift(); delete ST.a.visit.shift_cleared; document.getElementById('hvShift').innerHTML = shiftHtml(); saveSoon(); return; }
      if (act === 'noallergy') { set('visit.allergies', 'None known'); if (ST.a.visit.from_call) delete ST.a.visit.from_call['visit.allergies']; safetyRefresh(); saveSoon(); return; }
      if (act === 'addcallperson') {
        const p = callPeople().find((x) => x.name === a.getAttribute('data-v')); if (!p) return;
        ST.a.visit.attendees.push({ name: p.name, rel: p.relationship || '', role: 'family' });
        document.getElementById('hvPeople').innerHTML = peopleHtml(); document.getElementById('hvCallPeople').innerHTML = callPeopleHtml(); saveSoon(); return;
      }
      if (act === 'delperson') { ST.a.visit.attendees.splice(i, 1); document.getElementById('hvPeople').innerHTML = peopleHtml(); const cp = document.getElementById('hvCallPeople'); if (cp) cp.innerHTML = callPeopleHtml(); saveSoon(); return; }
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
      if (act === 'readrec') { await afterRead(a); return; }
      if (act === 'hear') { await hearAt(a.getAttribute('data-rec'), +a.getAttribute('data-t')); return; }
      if (act === 'fillkeep') { const p = a.getAttribute('data-p'); if (!keepFill(p)) toast('That box already has an answer, so it stays as typed.'); redrawSecs([p]); saveSoon(); return; }
      if (act === 'fillskip') { (ST.a.visit.after.marks = ST.a.visit.after.marks || {})[a.getAttribute('data-p')] = 'skip'; redrawSecs([]); saveSoon(); return; }
      if (act === 'fillundo') { delete (ST.a.visit.after.marks || {})[a.getAttribute('data-p')]; redrawSecs([]); saveSoon(); return; }
      if (act === 'fillall') {
        const ps = (ST.a.visit.after.fills || []).filter((f) => !(ST.a.visit.after.marks || {})[f.path]).map((f) => f.path).filter(keepFill);
        redrawSecs(ps); saveSoon(); toast(ps.length + ' answer' + (ps.length === 1 ? '' : 's') + ' kept. They show in yellow on the form until someone changes them.'); return;
      }
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
    const recorded = typeof REC !== 'undefined' && REC.groupKind === 'assessment' && REC.groupSubject === String(ST.a.id);
    if (recording()) { if (!(await ask('Stop the recording and finish the visit?'))) return; try { recStop(); } catch (e) {} }
    const v = ST.a.visit;
    const miss = window.CPV ? CPV.safetyMissing(v) : [];
    if (miss.length && !(await ask('The safety check still has ' + miss.length + ' to answer:\n' + miss.map((m) => '· ' + m[0]).join('\n') + '\n\nOK = finish anyway (the care plan can\'t be approved until they are answered) · Cancel = answer them now'))) { show(2); return; }
    if (!v.sign.client.png && !(await ask('Nobody has signed the assessment yet. Finish anyway?'))) return;
    v.finished_at = new Date().toISOString(); v.finished_by = me(); v.finished_by_email = String((typeof ME !== 'undefined' && ME && ME.email) || '').toLowerCase();
    if (ST.a.status === 'Scheduled' || !ST.a.status) ST.a.status = 'Completed — Awaiting Plan';
    await saveNow();
    toast((window.CPV ? 'The care plan draft is being written; it will be on the Care tab to review. ' : '') + (v.outcome ? 'Visit saved. Now record "' + (OUTCOMES.find((o) => o[0] === v.outcome) || [0, ''])[1] + '" on Start of Care, step 3.' : 'Visit saved. Record how it ended on Start of Care, step 3.')
      + (recorded ? ' Back at the office, open the visit and tap After the visit to read the recording.' : ''));
    const root = document.getElementById('hvRoot'); if (root) root.remove();
    clearInterval(ST.tick);
    /* Care plan Stage 1 (her decision 2): the draft starts as soon as the visit is finished; nothing waits on the iPad */
    try { if (window.CPV) CPV.autoDraft(ST.a); } catch (e) {}
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
    callFill(ST.a, l); leadPrefs(ST.a, l); safetyPrefill(ST.a, l);
    if (o.sec != null) ST.sec = +o.sec;
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
      + '<button class="secondary" onclick="HV.settingsSave(this)">Save</button><span class="field-note" id="hvSetSaved"></span></div>'
      + (window.CPV && CPV.emSettingsHtml ? CPV.emSettingsHtml() : '');
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

  window.HV = { open, close, settingsFill, settingsSave, factsFor, _st: ST, _suggest: suggestLevel, _weekSummary: weekSummary, _boxes: boxes };
})();
