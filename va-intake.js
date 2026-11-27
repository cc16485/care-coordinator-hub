/* =====================================================================================================================
   VA INTAKE ON THE LEAD PAGE (Samantha 2026-11-27: "we need this in the hub"; approved mockup
   https://claude.ai/artifact/SKihZZbPd3zsPFnerk2iGQ, "Yes, build it"). Behind ops_settings.va_intake_live (off until she
   turns it on; an owner can preview it for themselves). While it is off the lead page keeps the VA paperwork card as it was.
   - A "Veteran?" question on every open lead page. It writes the SAME answer as the Payer tab's program question
     (lead.program_check.veteran), so it is asked once.
   - Yes opens the VA path (her hand-holding steps, each one setting the lead's one next step = the reminder on the Leads
     list and in the VA guide's My Work) and the VA intake (the paper sheet, sections 1 to 6). Everything is saved on the
     lead's existing VA record (lead.va_referral) and the lead's own lines (name, birth date, address, phone).
   - Her rules: enrolled in VA health care decides the path (not enrolled = sign up first, then the ask); the caregiver
     choice is for our office only and never goes to the VA; what the VA hears is "Caring Companions In-Home Senior Care",
     never a specific caregiver; never sign for the veteran; never promise hours.
   - The Social Security number lives ONLY in its locked box: sealed on the server (va-identity), last 4 shown, reveal with a
     reason for 5 minutes, logged, deleted when the lead closes. A number that looks like one typed anywhere else on this
     card is refused. Nothing here texts, emails or faxes anyone.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const R = () => root.LeadRules;
  const FULL = 'Caring Companions In-Home Senior Care';
  const VA_PHONE = '877-222-8387', ENROLL_URL = 'va.gov/health-care/apply', DD214_URL = 'archives.gov/veterans';
  const APPLY_LINK = 'https://mo-care.com/apply?position=va_family_caregiver&channel_source=va-intake';
  const WORDS = 'I am having a harder time at home. I would like to be assessed for Homemaker and Home Health Aide care, and I would like ' + FULL + ' to provide it.';

  /* ── the switch (owners only; an owner may preview it in this browser) ── */
  const PREVIEW_KEY = 'cc_va_intake_preview';
  function liveOn(settings){ return !!(settings && settings.va_intake_live === true); }
  function previewOn(){ try{ return !!root.localStorage && root.localStorage.getItem(PREVIEW_KEY) === '1'; }catch(e){ return false; } }
  function setPreview(on){ try{ if(on) root.localStorage.setItem(PREVIEW_KEY, '1'); else root.localStorage.removeItem(PREVIEW_KEY); }catch(e){} }
  function showing(settings, isOwner){ return liveOn(settings) || (!!isOwner && previewOn()); }

  /* ── plain rules (tests/va-intake-test.js) ── */
  const ADL = [['bathing','Bathing'],['dressing','Dressing'],['toileting','Toileting'],['grooming','Grooming'],['eating','Eating'],['walking','Walking / transfers'],['falls','Recent falls'],
    ['memory','Memory / confusion'],['med_reminders','Medication reminders'],['meals','Meals'],['housekeeping','Housekeeping'],['laundry','Laundry'],['errands','Errands'],['respite','Break for family caregiver (respite)']];
  const ADL_WORD = Object.fromEntries(ADL);
  /* the lead's own care needs each ADL also counts as (only ever added, never taken away) */
  const ADL_NEEDS = { bathing:'personalCare', dressing:'personalCare', toileting:'personalCare', grooming:'personalCare', memory:'dementia', housekeeping:'housekeeping', laundry:'housekeeping', meals:'housekeeping', respite:'respite' };
  const LIVES = [['alone','Alone'],['spouse','With spouse'],['family','With family'],['other','Other']];
  const FOR = [['veteran','The veteran'],['spouse','A surviving spouse']];
  const ENROLL_WAYS = { phone:'a three-way call to the VA (877-222-8387)', visit:'a kitchen-table visit', mail:'the paper 10-10EZ by mail' };
  const CHECKIN_DAYS = 5, ENROLL_CHECK_DAYS = 7, CONSULT_SILENT_DAYS = 7;
  const isYmd = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
  function addDays(ymd, n){ const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  const dayOf = iso => String(iso || '').slice(0, 10);
  /* a Social Security number typed where it must not go: 3-2-4 digits (with or without - or spaces), or 9 digits alone */
  const SSN_LIKE = /(^|[^\d])(\d{3}[- ]\d{2}[- ]\d{4}|\d{9})(?!\d)/;
  const ssnLike = s => SSN_LIKE.test(String(s == null ? '' : s));
  function answer(l){ return String(((l && l.program_check) || {}).veteran || ''); }
  /* 2026-11-27 (her "Yes, do that"): a lead from the veterans web page already told us who they are and whether the veteran is
     enrolled. Its note (lead.interest_notes, written by the page) reads "VA COMMUNITY CARE. From the Veterans page. They said:
     I'm the veteran. Veteran enrolled in VA health care: Yes. Where: 65803. Best time to call: Afternoon. ..." */
  const VA_FORM = /^\s*VA COMMUNITY CARE\. From the Veterans page\./i;
  function fromForm(l){
    const t = String((l && l.interest_notes) || '');
    if(!VA_FORM.test(t)) return null;
    const grab = re => { const m = re.exec(t); return m ? m[1].trim() : ''; };
    const who = grab(/They said:\s*([^.]*)\./i), en = grab(/enrolled in VA health care:\s*([^.]*)\./i).toLowerCase(), time = grab(/Best time to call:\s*([^.]*)\./i);
    return {
      who:/i'?m the veteran/i.test(who) ? 'self' : /caregiver/i.test(who) ? 'caregiver' : /helping/i.test(who) ? 'helper' : '',
      enrolled:en === 'yes' ? 'yes' : en === 'no' ? 'no' : en === 'not sure' ? 'not_sure' : '',
      best_time:/^any time$/i.test(time) ? '' : time,
    };
  }
  /* what the form fills in, only where nothing is there yet. Returns the lines it filled (empty = nothing to do). */
  function applyForm(l, today){
    const f = fromForm(l); if(!f || (l.va_referral && l.va_referral.form_filled_at)) return [];
    const v = data(l), filled = [], pc = Object.assign({}, l.program_check || {});
    if(!pc.veteran){ pc.veteran = 'yes'; pc.by = 'the veterans page form'; pc.at = new Date().toISOString(); l.program_check = pc; filled.push('Veteran: yes'); }
    if(f.enrolled && !v.enrolled){ v.enrolled = f.enrolled; filled.push('enrolled in VA health care: ' + { yes:'yes', no:'no', not_sure:'not sure' }[f.enrolled]); }
    if(f.best_time && !v.best_time){ v.best_time = f.best_time; filled.push('best time to call: ' + f.best_time); }
    if(f.who && !v.calling_for){ v.calling_for = 'veteran'; filled.push('calling for: the veteran'); }
    if(f.who === 'self'){
      if(!l.relationship){ l.relationship = 'self'; filled.push('the caller is the veteran'); }
      if(!l.client_first_name && !l.client_last_name && (l.first_name || l.last_name)){ l.client_first_name = l.first_name || ''; l.client_last_name = l.last_name || ''; l.client_name_not_provided = false; filled.push('veteran\'s name from the caller'); }
    }
    if(f.who === 'caregiver' && !v.cg_choice){ v.cg_choice = 'family'; if(!v.cg_name) v.cg_name = [l.first_name, l.last_name].filter(Boolean).join(' '); if(!v.cg_phone && l.phone) v.cg_phone = l.phone; filled.push('wants to be the caregiver: ' + (v.cg_name || 'the caller')); }
    v.form_filled_at = new Date().toISOString();
    l.va_referral = v;
    return filled;
  }
  function isVeteran(l){ return answer(l) === 'yes' || (l && l.funding_source === 'va') || !!fromForm(l); }
  function data(l){ return Object.assign({}, (l && l.va_referral) || {}); }
  function hoursWeek(v){ const a = Number(v.hours_day), b = Number(v.days_week); return a > 0 && b > 0 ? Math.round(a * b * 2) / 2 : null; }
  function needsLine(v){ return (Array.isArray(v.adl) ? v.adl : []).map(k => ADL_WORD[k]).filter(Boolean).join(', '); }
  const enrolled = v => v.enrolled === 'yes';
  /* 2026-11-27 (her ask: "make sure the surviving spouse is eligible for that, they may not be"): they are not. VA Community
     Care, Homemaker and Home Health Aide included, is for a veteran enrolled in VA health care, which a surviving spouse cannot
     get (va.gov "Eligibility for community care outside VA"). CHAMPVA, which some surviving spouses have, does not cover
     homemaker or attendant care (CHAMPVA Guidebook). A surviving spouse's VA help is the Survivors Pension (or DIC) with
     Aid and Attendance, applied for with a free Veterans Service Officer; care with us is then private pay. */
  const spouse = v => v.calling_for === 'spouse';
  /* the VA path, in her order (VA-billing-prep.md 3a). Each step: key, label, state done|now|todo|skip, words. */
  function steps(l, today){
    const v = data(l), out = [];
    const s = (key, label, done, skip, words) => out.push({ key, label, done:!!done, skip:!!skip, words:words || '' });
    if(spouse(v)){
      s('first', 'First call: intake filled in, family checklist sent', v.checklist_at, false, v.checklist_at ? 'Checklist sent ' + dayOf(v.checklist_at) : '');
      s('vso', 'A free Veterans Service Officer: Survivors Pension with Aid and Attendance', v.vso_at, false, v.vso_at ? 'VSO meeting set ' + dayOf(v.vso_at) : '');
      s('private', 'Care with us as private pay, if they want it', v.private_at, false, v.private_at ? 'Talked through private pay ' + dayOf(v.private_at) : '');
      let n = false; out.forEach(x => { x.state = x.done ? 'done' : (!n ? (n = true, 'now') : 'todo'); });
      return out;
    }
    s('first', 'First call: VA intake filled in, family checklist sent', v.checklist_at, false, v.checklist_at ? 'Checklist sent ' + dayOf(v.checklist_at) + (v.walk_me ? ' · they want us to walk them through each step' : '') : '');
    s('enroll', 'Signed up for VA health care', enrolled(v) && (v.applied_at || v.enroll_confirmed_at || true), enrolled(v) && !v.applied_at, enrolled(v) ? (v.enroll_confirmed_at ? 'Enrollment came through ' + dayOf(v.enroll_confirmed_at) : 'Already enrolled') : v.applied_at ? 'Applied ' + dayOf(v.applied_at) + ' by ' + (ENROLL_WAYS[v.enroll_way] || 'phone') : '');
    s('ask', 'Three-way call to the VA primary care team', v.ask_at, false, v.ask_at ? 'Asked ' + dayOf(v.ask_at) + (v.ask_spoke_to ? ', spoke to ' + v.ask_spoke_to : '') + (v.ask_promised ? ' · promised: ' + v.ask_promised : '') : '');
    s('prep', 'Prep call before the VA assessment', v.prep_at, false, v.prep_at ? 'Prep call done ' + dayOf(v.prep_at) : v.assessment_date ? 'VA assessment ' + v.assessment_date : '');
    s('waiting', 'Waiting on the VA: check in', v.auth_at, false, v.last_checkin_at ? 'Last check-in ' + dayOf(v.last_checkin_at) : '');
    s('auth', 'Authorization arrives: call the family the same day', v.auth_called_at, false, v.auth_at ? 'Authorization arrived ' + dayOf(v.auth_at) + (v.auth_called_at ? ' · family called' : '') : '');
    let now = false;
    out.forEach(x => { x.state = x.skip ? 'skip' : x.done ? 'done' : (!now ? (now = true, 'now') : 'todo'); });
    return out;
  }
  function current(l, today){ const st = steps(l, today); return (st.find(x => x.state === 'now') || {}).key || ''; }
  /* the reminder each step sets: the lead's one next step (LeadRules.setNext follow_up) */
  function reminderFor(ev, v, today){
    const t = today;
    switch(ev){
      case 'veteran_yes': return { day:addDays(t, 7), why:enrolled(v) ? 'VA: did they ask their VA care team for Homemaker and Home Health Aide care?' : 'VA: check on signing up for VA health care' };
      case 'enrolled_yes': return { day:addDays(t, 7), why:'VA: did they ask their VA care team for Homemaker and Home Health Aide care?' };
      case 'enrolled_no': return { day:addDays(t, ENROLL_CHECK_DAYS), why:'VA: did the VA health care enrollment come through?' };
      case 'applied': return { day:addDays(t, ENROLL_CHECK_DAYS), why:'VA: did the VA health care enrollment come through? Not sure: three-way call to ' + VA_PHONE };
      case 'dd214': return { day:isYmd(v.dd214_expected) ? v.dd214_expected : addDays(t, 14), why:'VA: did the DD-214 copy arrive?' };
      case 'ask': return { day:addDays(t, CHECKIN_DAYS), why:'VA: check in. Has the VA scheduled the assessment? No word ' + CONSULT_SILENT_DAYS + ' days after the ask: call the social worker' };
      case 'assessment': return isYmd(v.assessment_date) ? { day:v.assessment_date > t ? addDays(v.assessment_date, -1) : t, why:'VA: prep call before the VA assessment (the hardest days list)' } : null;
      case 'prep': return { day:isYmd(v.assessment_date) && v.assessment_date >= t ? addDays(v.assessment_date, 1) : addDays(t, CHECKIN_DAYS), why:'VA: how did the VA assessment go? Any word on the authorization?' };
      case 'checkin': {
        const silent = v.ask_at && !v.assessment_date && !v.va_word_at && addDays(dayOf(v.ask_at), CONSULT_SILENT_DAYS) <= t;
        return silent ? { day:t, why:'VA: no word from the VA ' + CONSULT_SILENT_DAYS + ' days after the ask. Call the social worker or the VA Community Care office' }
          : { day:addDays(t, Math.max(3, Math.min(7, Number(v.checkin_days) || CHECKIN_DAYS))), why:'VA: check in with the family on the VA steps' };
      }
      case 'auth': return { day:t, why:'VA: the authorization arrived. Call the family today' };
      case 'spouse': return { day:addDays(t, 7), why:'VA (surviving spouse): did they meet a free Veterans Service Officer about Survivors Pension with Aid and Attendance?' };
      case 'vso_set': return { day:addDays(t, 14), why:'VA (surviving spouse): how did the Veterans Service Officer meeting go? Care with us would be private pay' };
      default: return null;
    }
  }
  /* "x of 6" for the intake card head */
  function sectionsDone(l){
    const v = data(l), cn = [l.first_name, l.relationship, l.phone].every(Boolean), vt = [l.client_first_name, l.client_dob].every(Boolean) && !!v.calling_for;
    const hc = !!v.enrolled, hp = (Array.isArray(v.adl) && v.adl.length) || !!v.needs, cg = !!v.cg_choice, end = !!v.read_words_at;
    return [cn, vt, hc, hp, cg, end].filter(Boolean).length;
  }

  /* ── drawing ── */
  const S = { ssn:{}, ssnBusy:{}, shown:null, timer:null, ask:false, add:false, msg:'' };
  const lead = () => (typeof CP !== 'undefined' && CP && CP.lead) || null;
  const me = () => ((typeof ccActor === 'function' && ccActor()) || {});
  const today = () => (R() && R().ymd) ? R().ymd(new Date()) : new Date().toISOString().slice(0, 10);
  const pill = (on, label, onclick) => '<button class="lb-btn' + (on ? ' lb-btn-primary' : '') + '" onclick="' + onclick + '">' + esc(label) + '</button>';
  const q = v => JSON.stringify(String(v)).replace(/"/g, '&quot;');
  const box = (id, label, val, ph, type, wide) => '<label class="vai-f' + (wide ? ' vai-wide' : '') + '"><span>' + esc(label) + '</span><input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '"></label>';
  const chk = (id, label, on, extra, dis) => '<label class="vai-c"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + (dis ? ' disabled' : '') + '> <span>' + label + (extra ? ' <span class="field-note">' + extra + '</span>' : '') + '</span></label>';
  const who = (at, by) => at ? ' · ' + esc(dayOf(at)) + (by ? ', ' + esc(String(by).split(' ')[0]) : '') : '';
  function css(){
    if(document.getElementById('vaiCss')) return;
    const st = document.createElement('style'); st.id = 'vaiCss';
    st.textContent = '.vai-card{border:2px solid var(--navy)!important;}.vai-sec{border-top:1px solid var(--border);padding-top:12px;margin-top:12px;}.vai-sec>b{color:var(--navy);display:block;margin-bottom:6px;}'
      + '.vai-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 10px;}@media(max-width:760px){.vai-grid{grid-template-columns:1fr;}}'
      + '.vai-f{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted,#5b6b7a);}.vai-f input{font-size:14px;}.vai-wide{grid-column:span 2;}'
      + '.vai-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:13px;margin:6px 0;}.vai-row>span.vai-k{min-width:90px;color:var(--muted,#5b6b7a);}'
      + '.vai-adl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px 12px;font-size:13.5px;}@media(max-width:760px){.vai-adl{grid-template-columns:1fr 1fr;}}'
      + '.vai-c{display:flex;gap:8px;align-items:baseline;font-size:13.5px;margin:4px 0;cursor:pointer;}.vai-c input{width:auto;flex:none;}'
      + '.vai-say{border:2px solid var(--navy);border-radius:10px;padding:10px 14px;margin-top:12px;}.vai-say b{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--navy);}'
      + '.vai-help{background:var(--cream,#faf9f6);border:1px solid var(--border);border-radius:10px;padding:10px 12px;font-size:13px;margin:6px 0;}'
      + '.vai-steps{border:1px solid var(--border);border-radius:10px;overflow:hidden;}.vai-st{display:flex;gap:10px;padding:9px 12px;border-top:1px solid var(--border);flex-wrap:wrap;align-items:baseline;}.vai-st:first-child{border-top:0;}'
      + '.vai-st.done,.vai-st.skip{background:#E7F6EC;color:#1F7A4D;}.vai-st.now{background:#FDF3E3;}.vai-st .vai-n{width:20px;font-weight:700;}.vai-st .vai-b{flex:1 1 420px;min-width:0;}'
      + '.vai-drawer-bg{position:fixed;inset:0;background:rgba(13,54,95,.25);z-index:9990;}.vai-drawer{position:fixed;top:0;right:0;bottom:0;width:min(460px,100vw);background:#fff;z-index:9991;overflow-y:auto;padding:18px 20px;box-shadow:-8px 0 24px rgba(0,0,0,.15);font-size:13.5px;line-height:1.5;}'
      + '.vai-ex{border-top:1px solid var(--border);padding:9px 0;}.vai-ex .vai-ex-k{color:var(--navy);display:block;margin-bottom:2px;font-weight:700;}'
      + '.vai-ssn{display:flex;flex-wrap:wrap;gap:8px;align-items:center;border:1px solid var(--border);border-radius:8px;padding:8px 12px;margin-top:8px;background:#FAFBFC;font-size:13.5px;}';
    document.head.appendChild(st);
  }
  /* ── the explainer drawer (her ask 2026-11-27: "since we are new to the va, put a little asterisk or drawer page to explain to
     care coordinators about the community care network") ── */
  const explainBtn = () => ' <button class="linklike vai-why" style="font-size:12.5px;margin-left:8px;" onclick="vaiExplain(true)" title="What VA Community Care is, who qualifies, how it starts">* What is VA Community Care?</button>';
  const EXPLAIN = [
    ['What it is', 'VA Community Care is how the VA pays outside providers to care for a veteran when the VA approves it. Caring Companions In-Home Senior Care is in network with the VA Community Care Network for <b>Homemaker and Home Health Aide</b> care: non-medical help at home, like bathing, dressing, meals, light housekeeping and medication reminders. "Home Health Aide" is the VA\'s name for the program. We do not provide skilled nursing.'],
    ['Who qualifies', '<b>A veteran who is enrolled in VA health care</b>, and whose VA care team decides they need help at home: usually help with 2 or more daily activities (bathing, dressing, toileting, eating, moving), or serious memory problems. Not enrolled yet? They sign up for VA health care first (877-222-8387, va.gov/health-care/apply, or a VA clinic), then ask for the care.'],
    ['A surviving spouse does not qualify', 'VA Community Care, including Homemaker and Home Health Aide care, is only for veterans enrolled in VA health care, and a surviving spouse cannot enroll. CHAMPVA, which some surviving spouses have, does not pay for homemaker or aide care either. A surviving spouse\'s VA help is the <b>Survivors Pension (or DIC) with Aid and Attendance</b>, a monthly payment they apply for with a free Veterans Service Officer. Care with us is then private pay.'],
    ['How it starts', 'Only the VA can create the referral. The veteran (or their family) asks their VA primary care team or VA social worker for a Homemaker and Home Health Aide assessment and names Caring Companions In-Home Senior Care. The VA assesses them, decides the hours, and sends us a referral with a written authorization. <b>We never start care before the written authorization.</b>'],
    ['Who pays', 'The VA pays us directly for authorized care. Say "you don\'t pay Caring Companions for VA-authorized care". Do not say "nothing out of pocket": the VA can charge some veterans its own copay (VA materials say up to $15 a day for home care), which we never collect.'],
    ['Hours', 'The VA sets the hours, and the authorization usually runs 60 to 90 days before it is renewed. Never promise hours or approval.'],
    ['The caregiver', 'Who gives the care is our decision. The veteran may want a family member or friend: they are welcome to apply to become our employee (background check, orientation, able to do the care), and we let them know if they can be assigned. Never promise "you\'ll get paid to care for your dad". The VA is not told who the caregiver is; we ask the VA for Caring Companions In-Home Senior Care, never a specific person.'],
    ['Not the same thing', '<b>Aid and Attendance</b> is a pension: money paid to the veteran or surviving spouse, who then pays us privately. A veteran can have both: the VA does not count the pension when it sets aide hours. Never promise they will qualify or an amount. Only accredited people, like a free Veterans Service Officer, may help with that claim; we never charge for it and never prepare it. <b>The VA family caregiver program</b> (PCAFC) is a separate VA program that pays a family caregiver directly.'],
    ['Never', 'Sign anything for the veteran, promise hours or approval, charge for help with VA paperwork, or use the VA seal or logo.'],
  ];
  function explainHtml(){
    return '<div class="vai-drawer-bg" onclick="vaiExplain(false)"></div><aside class="vai-drawer" role="dialog" aria-label="What is VA Community Care?"><div style="display:flex;align-items:center;gap:8px;"><b style="font-size:17px;color:var(--navy);flex:1;">What is VA Community Care?</b><button class="lb-btn" onclick="vaiExplain(false)">Close</button></div>'
      + '<div class="field-note" style="margin:2px 0 10px;">For care coordinators. Plain answers to the questions families ask most.</div>'
      + EXPLAIN.map(x => '<div class="vai-ex"><span class="vai-ex-k">' + x[0] + '</span><div>' + x[1] + '</div></div>').join('')
      + '<div class="field-note" style="margin-top:10px;">More: <a href="javascript:void(0)" onclick="vaiExplain(false);ccOpenRef(\'va\')">VA on Payors &amp; Programs</a>. Sources: va.gov, Eligibility for community care outside VA; the CHAMPVA Guidebook; VA survivor benefits.</div></aside>';
  }
  function explain(on){
    let el = document.getElementById('vaiDrawer');
    if(!on){ if(el) el.remove(); return; }
    css(); if(!el){ el = document.createElement('div'); el.id = 'vaiDrawer'; document.body.appendChild(el); }
    el.innerHTML = explainHtml();
    const close = el.querySelector('aside .lb-btn'); if(close) close.focus();
  }
  function stripHtml(l){
    const a = answer(l), va = l.funding_source === 'va';
    if(a === 'yes' || a === 'no' || va)
      return '<div class="card lw-card" id="vaiStrip" style="padding:10px 16px;"><span style="font-size:13.5px;"><b style="color:var(--navy);">Veteran?</b> ' + (a === 'no' && !va ? 'No' : 'Yes')
        + (va && a !== 'yes' ? ' (pays with VA)' : '') + ' <button class="linklike" style="font-size:12.5px;margin-left:6px;" onclick="vaiVetChange()">change</button></span>' + (a === 'no' && !va ? '' : explainBtn()) + '</div>';
    return '<div class="card lw-card" id="vaiStrip" style="padding:10px 16px;"><div class="vai-row" style="margin:0;"><b style="color:var(--navy);">Veteran?</b><span style="flex:1 1 280px;">Did they serve in the military, or were they married to someone who did?</span>'
      + pill(false, 'Yes', 'vaiVet(\'yes\')') + pill(false, 'No', 'vaiVet(\'no\')') + pill(a === 'not_sure', 'Not sure', 'vaiVet(\'not_sure\')') + '</div></div>';
  }
  function pathHtml(l){
    const v = data(l), st = steps(l, today()), owner = l.assigned_coordinator || '';
    const nowKey = (st.find(x => x.state === 'now') || {}).key;
    const body = k => {
      if(k === 'first') return '<div class="field-note">' + (spouse(v) ? 'Say: "I\'ll be your guide. The VA home aide program is only for veterans, but there is VA help for surviving spouses, and I\'ll help you find it." Mail' : 'Say: "I\'ll be your VA guide. There are four steps to VA home care, and I\'ll walk you through every one." Mail')
        + ' or email the family checklist the same day, with your name and direct number on it.</div>'
        + chk('vai_walk', 'They want us to walk them through each step (we call every few days until care starts)', !!v.walk_me)
        + '<div class="lb-actions"><button class="lb-btn lb-btn-primary" onclick="vaiStep(\'first\')">Checklist sent today</button></div>';
      if(k === 'enroll') return '<div class="vai-help">VA health care comes first. Offer, in this order: <b>(1)</b> a three-way call: they call ' + VA_PHONE + ' with us on the line, or we walk them through ' + ENROLL_URL + ' while they type (fastest); <b>(2)</b> a kitchen-table visit; <b>(3)</b> by mail: we fill in the paper 10-10EZ with them, <b>leave the Social Security number box blank</b>, and mail it to them with a stamped envelope to the VA. They add the number, sign and mail it themselves. We never sign for them.</div>'
        + '<div class="vai-row"><span class="vai-k">How</span>' + Object.keys(ENROLL_WAYS).map(w => pill(v.enroll_way === w, { phone:'Three-way call', visit:'Kitchen-table visit', mail:'By mail' }[w], 'vaiSet(\'enroll_way\',' + q(w) + ')')).join('') + '</div>'
        + '<div class="vai-row"><span class="vai-k">DD-214</span>' + pill(v.dd214 === 'has', 'They have it', 'vaiSet(\'dd214\',\'has\')') + pill(v.dd214 === 'requested', 'Lost: free copy requested', 'vaiSet(\'dd214\',\'requested\')')
        + (v.dd214 === 'requested' ? '<label class="vai-f" style="flex-direction:row;align-items:center;gap:6px;">expected<input id="vai_dd214_expected" type="date" value="' + esc(v.dd214_expected || '') + '" style="width:auto;"></label><button class="lb-btn" onclick="vaiStep(\'dd214\')">Set the reminder</button>' : '')
        + '</div>' + (v.dd214 === 'requested' ? '<div class="field-note">Request it the same day at ' + DD214_URL + '.</div>' : '')
        + '<div class="lb-actions">' + (v.applied_at ? '' : '<button class="lb-btn lb-btn-primary" onclick="vaiStep(\'applied\')">Helped them apply today</button>') + '<button class="lb-btn" onclick="vaiStep(\'enroll_confirmed\')">Enrollment came through</button></div>';
      if(k === 'ask') return '<div class="field-note">Veteran\'s OK first. They say the words (below); we handle the hold and transfers and write down who we spoke to. Offer VA form 10-5345 (lets the VA share health information with us): fill it in with them and mail it to them to sign.</div>'
        + '<div class="vai-grid">' + box('vai_ask_spoke_to', 'Who we spoke to', v.ask_spoke_to, 'name and role') + box('vai_ask_date', 'Date', v.ask_date || today(), '', 'date') + box('vai_ask_promised', 'What they promised', v.ask_promised, 'e.g. consult sent to the social worker') + '</div>'
        + chk('vai_f5345', '10-5345 filled in and mailed to them to sign', !!v.f5345_at, who(v.f5345_at, v.f5345_by))
        + '<div class="lb-actions"><button class="lb-btn lb-btn-primary" onclick="vaiStep(\'ask\')">Call made: save it</button></div>';
      if(k === 'prep') return '<div class="field-note">15 minutes: make the list of the hardest days (falls, bathing, dressing, toileting, missed meals, memory). A family member there if they can.</div>'
        + '<div class="vai-row"><label class="vai-f" style="flex-direction:row;align-items:center;gap:6px;">VA assessment date<input id="vai_assessment_date" type="date" value="' + esc(v.assessment_date || '') + '" style="width:auto;"></label><button class="lb-btn" onclick="vaiStep(\'assessment\')">Save the date</button></div>'
        + '<div class="lb-actions"><button class="lb-btn lb-btn-primary" onclick="vaiStep(\'prep\')">Prep call done</button></div>';
      if(k === 'waiting') return '<div class="field-note">Text or call every 3 to 7 days and after every step ("Your enrollment went through", "The VA has the request", "Your assessment is Tuesday"). No word ' + CONSULT_SILENT_DAYS + ' days after the ask: call the social worker or the VA Community Care office.</div>'
        + '<div class="lb-actions"><button class="lb-btn lb-btn-primary" onclick="vaiStep(\'checkin\')">Checked in today</button><button class="lb-btn" onclick="vaiStep(\'va_word\')">Heard from the VA</button><button class="lb-btn" onclick="vaiStep(\'auth\')">Authorization arrived</button></div>';
      if(k === 'vso') return '<div class="vai-help">A surviving spouse cannot get VA Community Care home aide care: it is only for veterans enrolled in VA health care. Their VA help is the <b>Survivors Pension (or DIC) with Aid and Attendance</b>, a monthly payment that can help pay for care. A free, accredited <b>Veterans Service Officer</b> (VSO) helps them apply. Offer to sit in. We never charge for this and never prepare the claim.</div>'
        + '<div class="lb-actions"><button class="lb-btn lb-btn-primary" onclick="vaiStep(\'vso\')">VSO meeting set</button></div>';
      if(k === 'private') return '<div class="field-note">Care with us is private pay, the same as any family (the pension can help pay for it). Never promise the pension will be approved.</div>'
        + '<div class="lb-actions"><button class="lb-btn lb-btn-primary" onclick="vaiStep(\'private\')">Talked through private pay</button></div>';
      if(k === 'auth') return '<div class="field-note">Call the family the same day. Then the home visit, care plan and first shift, as for every new client. Never start care before the written authorization.</div>'
        + '<div class="lb-actions"><button class="lb-btn lb-btn-primary" onclick="vaiStep(\'auth_called\')">Called the family</button></div>';
      return '';
    };
    const remind = { vso:'Reminder: 1 week to check the VSO meeting', private:'', first:'', enroll:'Reminder: 1 week to check the enrollment', ask:'Reminder: check-in every ' + CHECKIN_DAYS + ' days', prep:'Reminder: the day before the assessment', waiting:'Reminder: every ' + CHECKIN_DAYS + ' days', auth:'Reminder: the same day' };
    return '<div class="card lw-card vai-card" id="vaiPath"><div class="lw-head"><b>VA path</b><span class="field-note">one step at a time; each step sets the reminder (the next step on Leads and in My Work)</span>' + explainBtn() + '<span style="flex:1;"></span>'
      + '<span class="field-note">VA guide: <b>' + esc(owner || 'nobody yet') + '</b> (the lead\'s owner)</span></div>'
      + (spouse(v) ? '<div class="vai-help" style="border-color:#E0B25B;background:#FDF3E3;margin:0 0 8px;"><b>Surviving spouse: VA Community Care does not cover them.</b> It is only for veterans enrolled in VA health care. The steps below point them to a free Veterans Service Officer for the Survivors Pension with Aid and Attendance; care with us is private pay.</div>' : '')
      + '<div class="vai-steps">' + st.map((x, i) => '<div class="vai-st ' + x.state + '"><span class="vai-n">' + (x.state === 'done' || x.state === 'skip' ? '✓' : i + 1) + '</span><div class="vai-b"><b>' + esc(x.label) + '</b>'
        + (x.state === 'skip' ? ' <span class="field-note">not needed: already enrolled</span>' : '') + (x.words ? '<div class="field-note">' + esc(x.words) + '</div>' : '')
        + (x.key === nowKey ? '<div style="margin-top:6px;">' + body(x.key) + '</div>' : '') + '</div>' + (x.state === 'todo' || x.state === 'now' ? '<span class="field-note">' + esc(remind[x.key] || '') + '</span>' : '') + '</div>').join('') + '</div>'
      + '<div class="vai-grid" style="margin-top:10px;">'
      + '<div class="vai-help" style="margin:0;"><b>Family or friend caregiver</b><br>' + (v.cg_choice === 'family' ? 'Start their application now, while we wait (VA Family or Friend Caregiver). Never promise they will be paid to care for the veteran: we let them know if they can be assigned. ' + (v.cg_link_at ? '✓ Application link copied' + who(v.cg_link_at) : '<button class="linklike" onclick="vaiCopyApply(this)">Copy the application link</button>') : 'They chose one of our caregivers (or have not said).') + '</div>'
      + (spouse(v) ? '' : '<div class="vai-help" style="margin:0;"><b>Aid and Attendance</b><br>' + (v.aa_interest ? 'Set up a free Veterans Service Officer meeting and offer to sit in. We never charge and never prepare the claim. ' + (v.vso_at ? '✓ VSO meeting set' + who(v.vso_at) : '<button class="linklike" onclick="vaiStep(\'vso\')">VSO meeting set</button>') : 'Not asked about, or not interested.') + '</div>')
      + '<div class="vai-help" style="margin:0;"><b>Never</b><br>Sign for the veteran, promise hours or approval, or charge for VA paperwork help. The Social Security number goes only in its locked box below.</div>'
      + '</div></div>';
  }
  function ssnHtml(l){
    const st = S.ssn[l.id], busy = S.ssnBusy[l.id];
    let h = '<div class="vai-ssn" id="vaiSsn"><span style="min-width:170px;color:var(--muted,#5b6b7a);font-size:12px;">Social Security number</span>';
    if(st === undefined) h += '<span class="field-note">checking what is on file…</span>';
    else if(st && st.error) h += '<span class="field-note" style="color:var(--red);">' + esc(st.error) + '</span>';
    else if(S.shown && S.shown.id === l.id) h += '<b style="font-size:15px;letter-spacing:.04em;">' + esc(S.shown.value.replace(/^(\d{3})(\d{2})(\d{4})$/, '$1-$2-$3')) + '</b><span class="field-note">hides in ' + S.shown.left + ' s</span><button class="lb-btn" onclick="vaiSsnHide()">Hide now</button>';
    else if(S.ask) h += '<input id="vai_ssn_reason" maxlength="200" placeholder="Why are you opening it? e.g. VA enrollment call" style="flex:1;min-width:220px;"><button class="lb-btn lb-btn-primary" onclick="vaiSsnReveal(this)"' + (busy ? ' disabled' : '') + '>Reveal for 5 minutes</button><button class="lb-btn" onclick="vaiSsnAsk(false)">Cancel</button>';
    else if(S.add || !(st && st.on_file)) h += '<input id="vai_ssn_new" type="password" inputmode="numeric" autocomplete="off" maxlength="11" placeholder="9 digits" style="width:150px;"><button class="lb-btn lb-btn-primary" onclick="vaiSsnSave(this)"' + (busy ? ' disabled' : '') + '>Save it locked</button>' + (st && st.on_file ? '<button class="lb-btn" onclick="vaiSsnAdd(false)">Cancel</button>' : '') + (st && st.purge_reason && !st.on_file ? '<span class="field-note">Deleted ' + esc(dayOf(st.purged_at)) + ': ' + esc(st.purge_reason) + '</span>' : '');
    else h += '<b>On file, ending ' + esc(st.last4 || '') + '</b><button class="lb-btn" onclick="vaiSsnAsk(true)">Reveal for 5 minutes</button><button class="lb-btn" onclick="vaiSsnAdd(true)">Change</button><button class="linklike" style="font-size:12.5px;" onclick="vaiSsnRemove(this)">Remove</button>'
      + '<span class="field-note">saved' + who(st.captured_at, st.captured_by) + (st.reveals ? ' · opened ' + st.reveals + ' time' + (st.reveals === 1 ? '' : 's') : '') + '</span>';
    return h + '<span class="field-note" style="flex:1 1 100%;">Locked: sealed on the server, never on the lead itself, never printed or faxed. Opening it asks why and is logged. Deleted by itself if the lead is marked lost or saved for later.</span>' + (S.msg ? '<span class="field-note" id="vaiSsnMsg" style="flex:1 1 100%;color:var(--red);">' + esc(S.msg) + '</span>' : '') + '</div>';
  }
  function intakeHtml(l){
    const v = data(l), en = v.enrolled || '', hw = hoursWeek(v), done = sectionsDone(l);
    const caller = [l.first_name, l.last_name].filter(Boolean).join(' '), vet = [l.client_first_name, l.client_last_name].filter(Boolean).join(' ');
    let h = '<div class="card lw-card vai-card" id="vaiCard"><div class="lw-head"><b>VA intake</b><span class="field-note">fill it in while you talk. It saves to this lead. Nothing is sent to anyone until you send it.</span>' + explainBtn() + '<span style="flex:1;"></span><span class="field-note" style="color:var(--green);font-weight:700;">' + done + ' of 6 done</span></div>'
      + (v.form_filled_at ? '<div class="field-note" style="margin:-2px 0 6px;">Some answers came from the veterans page form (' + esc(dayOf(v.form_filled_at)) + '). Check them with them on the call.</div>' : '');
    h += '<div class="vai-sec" style="border:0;margin:0;padding:0;"><b>1 · Who is calling</b><div class="vai-grid">' + box('vai_caller', 'Name', caller) + box('vai_rel', 'Relationship', l.relationship, 'daughter, son, self…') + box('vai_phone', 'Phone', l.phone)
      + box('vai_email', 'Email', l.email, 'if they have one') + box('vai_best_time', 'Best time to call', v.best_time) + '<div class="vai-f"><span>Heard about us</span><span style="font-size:13.5px;color:var(--ink,#1d2b3a);">' + esc(l.heard_about ? ((root.HeardAbout && (root.HeardAbout.OPTIONS.find(o => o[0] === l.heard_about) || [])[1]) || l.heard_about) : 'ask them (Notes card above)') + '</span></div></div></div>';
    h += '<div class="vai-sec"><b>2 · The veteran</b><div class="vai-grid">' + box('vai_vet', 'Full name', vet) + box('vai_dob', 'Date of birth', l.client_dob, '', 'date') + box('vai_vphone', 'Phone', l.client_phone)
      + box('vai_addr', 'Home address', l.client_address, '', 'text', true) + box('vai_city', 'City / county', [l.client_city, l.county].filter(Boolean).join(', '), 'Springfield, Greene') + '</div>'
      + '<div class="vai-row"><span class="vai-k">Lives</span>' + LIVES.map(o => pill(v.lives === o[0], o[1], 'vaiSet(\'lives\',' + q(o[0]) + ')')).join('') + (v.lives === 'other' ? '<input id="vai_lives_other" value="' + esc(v.lives_other || '') + '" placeholder="who with" style="width:200px;">' : '') + '</div>'
      + '<div class="vai-row"><span class="vai-k">Calling for</span>' + FOR.map(o => pill(v.calling_for === o[0], o[1], 'vaiSet(\'calling_for\',' + q(o[0]) + ')')).join('') + '</div>'
      + (spouse(v) ? '<div class="vai-help" style="border-color:#E0B25B;background:#FDF3E3;"><b>A surviving spouse is not eligible for VA Community Care home aide care.</b> It is only for veterans enrolled in VA health care. Do not read them the words for the VA. Point them to a free Veterans Service Officer for the Survivors Pension with Aid and Attendance (the VA path above). Care with us is private pay. ' + explainBtn() + '</div>' : '')
      + ssnHtml(l) + '</div>';
    if(spouse(v)) h += '<div class="vai-sec"><b>3 · VA health care</b><div class="field-note">Not needed for a surviving spouse.</div></div>';
    else h += '<div class="vai-sec"><b>3 · VA health care</b><div class="vai-row"><span class="vai-k">Enrolled?</span>' + pill(en === 'yes', 'Yes', 'vaiEnrolled(\'yes\')') + pill(en === 'no', 'No', 'vaiEnrolled(\'no\')') + pill(en === 'not_sure', 'Not sure', 'vaiEnrolled(\'not_sure\')') + '</div>'
      + (en === 'no' || en === 'not_sure' ? '<div class="vai-help"><b>Sign up for VA health care first.</b> Then they ask for Homemaker and Home Health Aide care. ' + ENROLL_URL + ' (form 10-10EZ), ' + VA_PHONE + ', or in person at a VA clinic. Have the DD-214 (a lost one can be requested free at ' + DD214_URL + ').' + (en === 'not_sure' ? ' Not sure: call ' + VA_PHONE + ' and ask.' : '') + ' The VA path above walks through it.</div>' : '')
      + '<div class="vai-grid">' + box('lwVa_clinic', 'VA clinic they go to', v.clinic) + box('lwVa_doctor', 'VA doctor / care team', v.doctor) + box('lwVa_social', 'VA social worker', v.social, 'if they know')
      + box('vai_social_phone', 'Social worker phone', v.social_phone) + box('vai_social_fax', 'Social worker fax', v.social_fax) + box('lwVa_clinic_fax', 'Clinic fax', v.clinic_fax, 'ask the clinic for it') + '</div>'
      + '<div class="vai-row"><span class="vai-k">VA home care now?</span>' + pill(v.va_home_care === 'no', 'No', 'vaiSet(\'va_home_care\',\'no\')') + pill(v.va_home_care === 'yes', 'Yes', 'vaiSet(\'va_home_care\',\'yes\')') + (v.va_home_care === 'yes' ? '<input id="vai_va_home_agency" value="' + esc(v.va_home_agency || '') + '" placeholder="which agency" style="width:220px;">' : '') + '</div></div>';
    const adl = Array.isArray(v.adl) ? v.adl : [];
    h += '<div class="vai-sec"><b>4 · Help needed</b><div class="vai-adl">' + ADL.map(a => '<label class="vai-c" style="margin:0;' + (a[0] === 'respite' ? 'grid-column:span 2;' : '') + '"><input type="checkbox" data-adl="' + a[0] + '"' + (adl.indexOf(a[0]) > -1 ? ' checked' : '') + '> <span>' + esc(a[1]) + '</span></label>').join('') + '</div>'
      + '<div class="vai-grid" style="margin-top:8px;">' + box('vai_hours_day', 'Hours a day', v.hours_day, '', 'number') + box('vai_days_week', 'Days a week', v.days_week, '', 'number')
      + '<div class="vai-f"><span>Leaving hospital / rehab soon?</span><div class="vai-row" style="margin:0;">' + pill(v.discharge === 'no', 'No', 'vaiSet(\'discharge\',\'no\')') + pill(v.discharge === 'yes', 'Yes', 'vaiSet(\'discharge\',\'yes\')') + (v.discharge === 'yes' ? '<input id="vai_discharge_date" type="date" value="' + esc(v.discharge_date || '') + '" style="width:auto;">' : '') + '</div></div></div>'
      + (hw ? '<div class="field-note">About ' + hw + ' hours a week. The VA sets the real hours; never promise them.</div>' : '') + '</div>';
    h += '<div class="vai-sec"><b>5 · Who would be the caregiver</b><span class="field-note">For our office only. It never goes on anything sent to the VA.</span><div class="vai-row">' + pill(v.cg_choice === 'ours', 'One of our caregivers', 'vaiSet(\'cg_choice\',\'ours\')') + pill(v.cg_choice === 'family', 'A family member or friend they trust', 'vaiSet(\'cg_choice\',\'family\')') + '</div>'
      + (v.cg_choice === 'family' ? '<div class="vai-grid">' + box('lwVa_cg_name', 'Name', v.cg_name) + box('lwVa_cg_rel', 'Relationship', v.cg_rel) + box('vai_cg_phone', 'Phone', v.cg_phone) + '</div><div class="field-note">They can apply to become our employee: background check, orientation, able to give the care the veteran needs. Never promise they will be assigned or paid to care for the veteran. The VA path has the application link.</div>' : '') + '</div>';
    if(!spouse(v)) h += '<div class="vai-say"><b>Read this to them: what to tell the VA</b><div>Call your VA primary care team or ask for the VA social worker, and say:</div><div style="font-size:15px;font-weight:600;margin:4px 0;">"' + esc(WORDS) + '"</div>'
      + '<div class="field-note">Only the VA can create the referral. Hours are set by the VA. Never start care before the written VA authorization.</div></div>';
    h += '<div class="vai-sec"><b>6 · Before you hang up</b>'
      + (spouse(v) ? '' : chk('vai_read_words', 'Read them the words to tell the VA', !!v.read_words_at, who(v.read_words_at, v.read_words_by))
      + chk('lwVa_ok', esc(vet || 'The veteran') + ' (or the person with their power of attorney) said OK to fax our referral sheet to their social worker', !!v.ok_at, who(v.ok_at, v.ok_by))
      + chk('vai_enroll_help', 'Not enrolled: gave them the enroll link and number', !!v.enroll_help_at, enrolled(v) ? '(not needed: enrolled)' : who(v.enroll_help_at), enrolled(v)))
      + chk('vai_aa', 'Interested in Aid and Attendance (pension)? Point them to a free Veterans Service Officer', !!v.aa_interest)
      + '<div class="vai-c"><span>Follow-up call: ' + esc(l.follow_up_due ? (R().dayWords ? R().dayWords(l.follow_up_due, today()) : l.follow_up_due) + (l.follow_up_note ? ' · ' + l.follow_up_note : '') : 'not set') + '</span> <button class="linklike" style="font-size:12.5px;" onclick="lwFollowUp(this)">change</button></div>'
      + chk('vai_va_emails', 'On the VA emails ("va lead"): one VA guide a month instead of the main email', String(l.email_campaign || '') === 'va')
      + '<div class="lb-actions" style="margin-top:8px;"><button class="lb-btn lb-btn-primary" onclick="vaiSave(this)">Save</button>' + (spouse(v) ? '' : '<button class="lb-btn" onclick="vaiSave(null).then(()=>lwVaLetter())">Print or fax the referral sheet</button>'
      + '<button class="lb-btn" onclick="vaiSave(null).then(()=>lwVaCopy(this))">Copy as a My HealtheVet message</button>'
      + (v.sent_at ? '' : '<select id="lwVa_how" style="width:auto;"><option value="fax">Faxed to the VA clinic</option><option value="mhv">Sent as a My HealtheVet message</option><option value="mail">Mailed</option><option value="call">Read to the care team on a call</option><option value="person">Taken in person</option></select><button class="lb-btn" onclick="vaiSave(null).then(()=>{ lwVaSent(); })">Mark sent today</button>'))
      + '<button class="linklike" style="font-size:12.5px;" onclick="officeFaxOpen(this)">Our fax and eFax sign-in</button></div>'
      + (v.sent_at ? '<div class="field-note">✓ Sent ' + esc(vaDay(v.sent_at)) + (v.sent_by ? ' by ' + esc(v.sent_by) : '') + '. VA-paid visits start only once we have the authorization number.</div>' : '')
      + '<span class="field-note" id="lwVaMsg"></span></div>';
    h += '<div class="field-note" style="border-top:1px solid var(--border);padding-top:8px;margin-top:10px;">The Social Security number goes only in its locked box (section 2), never in notes or other boxes. The VA sends the veteran\'s VA ID (ICN) on the referral.</div></div>';
    return h;
  }
  function vaDay(iso){ const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric', timeZone:'America/Chicago' }); }
  /* what the lead workspace draws in place of the old VA paperwork card */
  function html(l){
    if(!l || !R()) return '';
    css();
    let h = stripHtml(l);
    if(fromForm(l) && !(l.va_referral && l.va_referral.form_filled_at)) setTimeout(() => formFill(l), 0);
    if(isVeteran(l)){ h += pathHtml(l) + intakeHtml(l); setTimeout(() => ssnLoad(l), 0); }
    return h;
  }

  /* the form's answers, saved once, the first time the lead is opened with the VA intake on */
  const S_FORM = {};
  async function formFill(l){
    if(S_FORM[l.id]) return; S_FORM[l.id] = true;
    const filled = applyForm(l, today()); if(!filled.length && !(l.va_referral && l.va_referral.form_filled_at)) return;
    if(filled.length){ note(l, 'filled in from the veterans page form: ' + filled.join('; ') + '.'); remind(l, 'veteran_yes', data(l), true); }
    try{ await persist('leads', l); }catch(e){ S_FORM[l.id] = false; return; }
    redraw(); if(filled.length) toast('VA intake filled in from the veterans page form. Check it with them on the call.');
  }

  /* ── saving ── */
  const val = id => { const e = document.getElementById(id); return e ? String(e.value || '').trim() : null; };
  const nowIso = () => new Date().toISOString();
  function note(l, body){ l.comm_log = (Array.isArray(l.comm_log) ? l.comm_log : []).concat([{ kind:'note', body:'VA: ' + body, at:nowIso(), by:me().email || '' }]); }
  function remind(l, ev, v, onlyIfNone){
    const r = reminderFor(ev, v, today()); if(!r || !R() || !R().setNext) return null;
    if(onlyIfNone && isYmd(l.follow_up_due) && l.follow_up_due <= r.day) return null;
    R().setNext(l, { kind:'follow_up', day:r.day, why:r.why }); return r;
  }
  /* read every box on the card into the lead; refuses a Social Security number anywhere but its locked box */
  function readCard(l){
    const card = document.getElementById('vaiCard'), path = document.getElementById('vaiPath');
    const typed = [card, path].filter(Boolean).flatMap(c => [...c.querySelectorAll('input:not([type=checkbox]):not([type=date]):not([type=number]):not(#vai_ssn_new):not(#vai_ssn_reason),textarea')]);
    const hit = typed.find(e => ssnLike(e.value));
    if(hit) return { error:'That looks like a Social Security number in "' + ((hit.closest('label') || {}).innerText || 'a box').split('\n')[0].trim() + '". Put it only in the locked box. Nothing was saved.' };
    const v = data(l), set = (k, id) => { const x = val(id); if(x !== null) v[k] = x; };
    ['best_time:vai_best_time', 'social_phone:vai_social_phone', 'social_fax:vai_social_fax', 'clinic:lwVa_clinic', 'doctor:lwVa_doctor', 'social:lwVa_social', 'clinic_fax:lwVa_clinic_fax',
      'va_home_agency:vai_va_home_agency', 'lives_other:vai_lives_other', 'hours_day:vai_hours_day', 'days_week:vai_days_week', 'discharge_date:vai_discharge_date', 'cg_name:lwVa_cg_name', 'cg_rel:lwVa_cg_rel', 'cg_phone:vai_cg_phone',
      'ask_spoke_to:vai_ask_spoke_to', 'ask_date:vai_ask_date', 'ask_promised:vai_ask_promised', 'assessment_date:vai_assessment_date', 'dd214_expected:vai_dd214_expected'].forEach(p => { const [k, id] = p.split(':'); set(k, id); });
    if(card){ const boxes = [...card.querySelectorAll('input[data-adl]')]; if(boxes.length) v.adl = boxes.filter(b => b.checked).map(b => b.dataset.adl); }
    const hw = hoursWeek(v); if(hw) v.hours = String(hw);
    if(needsLine(v)) v.needs = needsLine(v);
    const by = me().name || '', flag = (id, k) => { const e = document.getElementById(id); if(!e) return; if(e.checked && !v[k]){ v[k] = nowIso(); v[k.replace(/_at$/, '_by')] = by; } if(!e.checked && v[k]){ delete v[k]; delete v[k.replace(/_at$/, '_by')]; } };
    flag('vai_read_words', 'read_words_at'); flag('lwVa_ok', 'ok_at'); flag('vai_enroll_help', 'enroll_help_at'); flag('vai_f5345', 'f5345_at');
    const aa = document.getElementById('vai_aa'); if(aa) v.aa_interest = !!aa.checked;
    const wm = document.getElementById('vai_walk'); if(wm) v.walk_me = !!wm.checked;
    /* the lead's own lines */
    const p = {}, split = s => { const w = String(s || '').trim().split(/\s+/); return [w.shift() || '', w.join(' ')]; };
    const c = val('vai_caller'); if(c !== null){ const [f, la] = split(c); p.first_name = f; p.last_name = la; }
    ['relationship:vai_rel', 'phone:vai_phone', 'email:vai_email', 'client_dob:vai_dob', 'client_phone:vai_vphone', 'client_address:vai_addr'].forEach(x => { const [k, id] = x.split(':'); const y = val(id); if(y !== null) p[k] = y; });
    const vt = val('vai_vet'); if(vt !== null){ const [f, la] = split(vt); p.client_first_name = f; p.client_last_name = la; if(f) p.client_name_not_provided = false; }
    const cc = val('vai_city'); if(cc !== null){ const [town, county] = cc.split(',').map(s => s.trim()); p.client_city = town || ''; if(county !== undefined) p.county = county.replace(/\s+county$/i, ''); }
    return { v, p };
  }
  async function put(l, v, p, msg){
    v.updated_at = nowIso(); v.updated_by = me().name || '';
    if(p && Object.keys(p).length) R().compose(l, p);
    const adlNeeds = (Array.isArray(v.adl) ? v.adl : []).map(k => ADL_NEEDS[k]).filter(Boolean);
    if(adlNeeds.length) l.needs = Array.from(new Set((Array.isArray(l.needs) ? l.needs : []).concat(adlNeeds)));
    l.va_referral = v;
    try{ await persist('leads', l); }catch(e){ toast('Could not save: ' + (e && e.message || e)); return false; }
    redraw(); if(msg) toast(msg); return true;
  }
  const toast = m => { if(typeof ccToast === 'function') ccToast(m); };
  function redraw(){ try{ if(typeof root.lwRender === 'function') root.lwRender(); }catch(e){} }
  async function save(btn){
    const l = lead(); if(!l) return false;
    const r = readCard(l); if(r.error){ const m = document.getElementById('lwVaMsg'); if(m){ m.textContent = r.error; m.style.color = 'var(--red)'; } toast(r.error); throw new Error(r.error); }
    return put(l, r.v, r.p, btn ? 'Saved.' : '');
  }
  async function setKey(k, value){
    const l = lead(); if(!l) return; const r = readCard(l); if(r.error){ toast(r.error); return; }
    r.v[k] = r.v[k] === value && ['lives', 'calling_for', 'cg_choice', 'va_home_care', 'discharge', 'dd214', 'enroll_way'].indexOf(k) > -1 ? '' : value;
    if(k === 'calling_for' && r.v[k] === 'spouse'){ note(l, 'calling for a surviving spouse: not eligible for VA Community Care home aide care. Next: a free Veterans Service Officer about the Survivors Pension with Aid and Attendance; care with us is private pay.'); remind(l, 'spouse', r.v); }
    await put(l, r.v, r.p);
  }
  async function vet(ans){
    const l = lead(); if(!l) return;
    const pc = Object.assign({}, l.program_check || {}); pc.veteran = ans; pc.by = me().name || ''; pc.at = nowIso(); l.program_check = pc;
    const v = data(l);
    if(ans === 'yes'){ note(l, 'they are a veteran (or a surviving spouse). VA intake started.'); remind(l, 'veteran_yes', v, true); }
    await put(l, v, null, ans === 'yes' ? 'Veteran: yes. The VA intake is open and the follow-up is set.' : '');
  }
  async function vetChange(){ const l = lead(); if(!l) return; const pc = Object.assign({}, l.program_check || {}); pc.veteran = ''; l.program_check = pc; await put(l, data(l), null); }
  async function setEnrolled(ans){
    const l = lead(); if(!l) return; const r = readCard(l); if(r.error){ toast(r.error); return; }
    const was = r.v.enrolled; r.v.enrolled = ans;
    if(was !== ans){ note(l, ans === 'yes' ? 'enrolled in VA health care. Next: ask the VA care team.' : 'not enrolled in VA health care' + (ans === 'not_sure' ? ' (not sure)' : '') + '. Next: sign up first.'); remind(l, ans === 'yes' ? 'enrolled_yes' : 'enrolled_no', r.v); }
    await put(l, r.v, r.p, 'Saved. The follow-up is set.');
  }
  async function step(k){
    const l = lead(); if(!l) return; const r = readCard(l); if(r.error){ toast(r.error); return; }
    const v = r.v, at = nowIso(), by = me().name || '';
    const ev = { first:() => { v.checklist_at = at; v.checklist_by = by; note(l, 'family checklist sent' + (v.walk_me ? '; they want us to walk them through each step' : '') + '.'); },
      applied:() => { v.applied_at = at; v.applied_by = by; note(l, 'helped them apply for VA health care (' + (ENROLL_WAYS[v.enroll_way] || 'phone') + ').'); return 'applied'; },
      enroll_confirmed:() => { v.enrolled = 'yes'; v.enroll_confirmed_at = at; note(l, 'VA health care enrollment came through. Next: ask the VA care team.'); return 'enrolled_yes'; },
      dd214:() => { if(!isYmd(v.dd214_expected)) return 'need_date'; note(l, 'DD-214 copy requested, expected ' + v.dd214_expected + '.'); return 'dd214'; },
      ask:() => { v.ask_at = isYmd(v.ask_date) ? v.ask_date + 'T12:00:00Z' : at; v.ask_by = by; note(l, 'three-way call to the VA care team' + (v.ask_spoke_to ? ', spoke to ' + v.ask_spoke_to : '') + (v.ask_promised ? '; promised: ' + v.ask_promised : '') + '.'); return 'ask'; },
      assessment:() => { if(!isYmd(v.assessment_date)) return 'need_date'; note(l, 'VA assessment on ' + v.assessment_date + '.'); return 'assessment'; },
      prep:() => { v.prep_at = at; note(l, 'prep call done before the VA assessment.'); return 'prep'; },
      checkin:() => { v.last_checkin_at = at; note(l, 'checked in with the family.'); return 'checkin'; },
      va_word:() => { v.va_word_at = at; v.last_checkin_at = at; note(l, 'heard from the VA.'); return 'checkin'; },
      auth:() => { v.auth_at = at; note(l, 'the VA authorization arrived. Call the family today.'); return 'auth'; },
      auth_called:() => { v.auth_called_at = at; note(l, 'called the family about the authorization. Next: home visit, care plan, first shift.'); },
      vso:() => { v.vso_at = at; note(l, 'Veterans Service Officer meeting set for ' + (spouse(v) ? 'the Survivors Pension with ' : '') + 'Aid and Attendance.'); return spouse(v) ? 'vso_set' : null; },
      private:() => { v.private_at = at; note(l, 'talked through care with us as private pay (surviving spouse).'); } }[k];
    if(!ev) return;
    const out = ev();
    if(out === 'need_date'){ toast('Type the date first.'); return; }
    if(out) remind(l, out, v);
    await put(l, v, r.p, out ? 'Saved. The next reminder is set.' : 'Saved.');
  }
  async function vaEmails(l, on){
    const now = nowIso(), a = me();
    if(on){ l.email_campaign = 'va'; l.intent_tags = Array.from(new Set([...(l.intent_tags || []), 'va lead'])); }
    else { l.email_campaign = 'main'; if(Array.isArray(l.intent_tags)) l.intent_tags = l.intent_tags.filter(t => t !== 'va lead'); }
    l.email_campaign_at = now; l.email_campaign_by = a.email || ''; l.monthly_emails = true;
    l.comm_log = (l.comm_log || []).concat([{ body:'Emails: ' + (on ? 'the VA series (veterans)' : 'the main monthly email') + ' (from the VA intake)', at:now, by:a.email || '' }]);
  }
  async function saveAll(btn){
    const l = lead(); if(!l) return;
    const e = document.getElementById('vai_va_emails');
    if(e && e.checked !== (String(l.email_campaign || '') === 'va')){
      const ok = typeof ccConfirm === 'function' ? await ccConfirm(e.checked ? 'Put them on the VA emails?\n\nThey get one VA guide a month instead of the main monthly email. (The "va lead" tag in GoHighLevel is not added from here; add it there too if you want the contact tagged.)' : 'Take them off the VA emails? They go back to the main monthly email.') : true;
      if(ok) await vaEmails(l, e.checked); else e.checked = !e.checked;
    }
    return save(btn);
  }
  function copyApply(btn){
    const l = lead(); if(!l) return;
    const done = async () => { const v = data(l); v.cg_link_at = nowIso(); note(l, 'copied the VA family or friend caregiver application link.'); await put(l, v, null, 'Link copied. Text or email it to them yourself.'); };
    if(navigator.clipboard) navigator.clipboard.writeText(APPLY_LINK).then(done, () => { prompt('Copy this link:', APPLY_LINK); done(); }); else { prompt('Copy this link:', APPLY_LINK); done(); }
  }

  /* ── the locked Social Security number (va-identity on the server). The revealed number lives only in S.shown, in this
     page's memory, for 5 minutes: never storage, a URL, a log or the console. ── */
  async function fn(body){
    if(typeof sb === 'undefined' || !sb || !sb.functions) throw new Error('not connected');
    const r = await sb.functions.invoke('va-identity', { body });
    if(r.error){ let why = ''; try{ if(r.error.context && r.error.context.json) why = (await r.error.context.json()).error || ''; }catch(_){} throw new Error(why || r.error.message || 'the server did not answer'); }
    if(!r.data || r.data.ok !== true) throw new Error((r.data && r.data.error) || 'the server did not answer');
    return r.data;
  }
  function ssnRedraw(){ const l = lead(), el = document.getElementById('vaiSsn'); if(!l || !el) return; const t = document.createElement('div'); t.innerHTML = ssnHtml(l); el.replaceWith(t.firstChild); }
  async function ssnLoad(l, force){
    if(!l || (S.ssn[l.id] !== undefined && !force)) return;
    try{ const d = await fn({ action:'state', lead_ids:[String(l.id)] }); S.ssn[l.id] = d.state[String(l.id)] || { on_file:false }; }
    catch(e){ S.ssn[l.id] = { error:'The locked box could not be read (' + (e.message || e) + ').' }; }
    ssnRedraw();
  }
  async function ssnSave(btn){
    const l = lead(); if(!l) return; const e = document.getElementById('vai_ssn_new'), raw = e ? e.value : '';
    if(e) e.value = '';
    if(String(raw).replace(/\D/g, '').length !== 9){ S.msg = 'Type all 9 digits.'; ssnRedraw(); return; }
    S.ssnBusy[l.id] = true; S.msg = ''; ssnRedraw();
    try{ const d = await fn({ action:'save', lead_id:String(l.id), ssn:raw }); S.ssn[l.id] = d.state; S.add = false; toast('Saved locked. Only the last 4 show.'); }
    catch(err){ S.msg = err.message || String(err); }
    delete S.ssnBusy[l.id]; ssnRedraw();
  }
  async function ssnReveal(btn){
    const l = lead(); if(!l) return; const reason = val('vai_ssn_reason') || '';
    if(reason.length < 3){ S.msg = 'Type why you are opening it first.'; ssnRedraw(); return; }
    S.ssnBusy[l.id] = true; S.msg = ''; ssnRedraw();
    try{
      const d = await fn({ action:'reveal', lead_id:String(l.id), reason });
      S.shown = { id:l.id, value:String(d.value || ''), left:Number(d.ttl_seconds) || 300 }; S.ask = false;
      clearInterval(S.timer); S.timer = setInterval(() => { if(!S.shown){ clearInterval(S.timer); return; } S.shown.left--; if(S.shown.left <= 0) hide(); else ssnRedraw(); }, 1000);
      if(S.ssn[l.id]) S.ssn[l.id].reveals = (S.ssn[l.id].reveals || 0) + 1;
    }catch(err){ S.msg = err.message || String(err); }
    delete S.ssnBusy[l.id]; ssnRedraw();
  }
  function hide(){ S.shown = null; clearInterval(S.timer); ssnRedraw(); }
  async function ssnRemove(btn){
    const l = lead(); if(!l) return;
    if(typeof ccConfirm === 'function' && !(await ccConfirm('Remove the Social Security number from the locked box? It cannot be brought back.'))) return;
    try{ const d = await fn({ action:'remove', lead_id:String(l.id) }); S.ssn[l.id] = d.state; hide(); toast('Removed.'); }catch(err){ S.msg = err.message || String(err); ssnRedraw(); }
  }

  const api = { fromForm, applyForm, EXPLAIN, explainHtml, liveOn, previewOn, setPreview, showing, ADL, answer, isVeteran, steps, current, reminderFor, addDays, ssnLike, hoursWeek, needsLine, sectionsDone, html, WORDS, FULL, APPLY_LINK, _state:S };
  root.VaIntake = api;
  Object.assign(root, { vaiVet:vet, vaiVetChange:vetChange, vaiSet:setKey, vaiEnrolled:setEnrolled, vaiStep:step, vaiSave:saveAll, vaiCopyApply:copyApply,
    vaiExplain:explain, vaiSsnSave:ssnSave, vaiSsnReveal:ssnReveal, vaiSsnHide:hide, vaiSsnRemove:ssnRemove,
    vaiSsnAsk:on => { S.ask = !!on; S.msg = ''; ssnRedraw(); }, vaiSsnAdd:on => { S.add = !!on; S.msg = ''; ssnRedraw(); } });
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
