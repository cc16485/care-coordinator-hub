/* =============================================================================
   ELIGIBILITY RULES — THE ONE AUTHORITATIVE COPY
   =============================================================================
   Loaded by BOTH the browser (a plain <script> tag, which sets globalThis.CCElig)
   AND the scheduled server-side evaluator (Deno `await import(<this url>)`, which
   executes it and reads the same global).

   A file with no import/export statements is still a valid ES module, so Deno
   can import it and the browser can script-tag it. That is deliberate, and it is
   what stops the two paths drifting: there is no second copy to drift from.

   WHY THIS MATTERS: if the Staffing Hub said "Eligible" while the evaluator said
   "Lapsed", the wrong one would still be creating or closing real work about a
   real person. The failure would be silent and the disagreement invisible.

   Nothing here touches the DOM, Supabase, or any hub global. Pure functions over
   a caregiver record, plus their own date helpers, so both runtimes behave
   identically.

   TODAY is resolved per call rather than captured at load, because the evaluator
   is a long-lived process and a captured date would go stale overnight — a
   caregiver's monthly OIG check would go overdue without the process noticing.
   ============================================================================= */
(function(root){
'use strict';

function today(){ const d=new Date(); d.setHours(0,0,0,0); return d; }
function pd(s){ if(!s) return null; const d=new Date(s+'T00:00:00'); return isNaN(d)?null:d; }
function addDays(d,n){ const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function daysLeft(d){ return Math.round((d-today())/86400000); }
function fmtD(s){ const d=pd(s); if(!d) return null;
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }

/* The engine's originals read a module-level TODAY. Here it is a getter so the
   same source works in a process that runs for days. */
Object.defineProperty(root, '__ELIG_TODAY__', { get: today, configurable:true });

/* Supervisory visits, her decision 2026-10-18: from 2026-11-16 (IHS/ADW Medicaid ends) a supervisory visit happens
   only when there is a concern and is logged as a short note. No yearly due date, so nothing is ever due or overdue.
   Until then the yearly evaluation still applies to caregivers on IHS/ADW clients. The day is read on Central time,
   so the browser and the server flip together at midnight in Missouri. */
const SUPERVISORY_CONCERN_FROM = '2026-11-16';
function centralDay(now){
  const d = now ? new Date(now) : new Date();
  try{ return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(d); }
  catch(e){ return d.toISOString().slice(0,10); }
}
function supervisoryConcernOnly(now){ return centralDay(now) >= SUPERVISORY_CONCERN_FROM; }

function chkStatus(lastStr, interval, warnDays){
  if(!lastStr) return {status:'Pending',nextDue:null,days:null};
  const last=pd(lastStr), next=addDays(last,interval), left=daysLeft(next);
  return { status: left<0?'Overdue':left<=warnDays?'Due Soon':'Current', nextDue:next, days:left };
}

/* ORIENTATION ONLY (Samantha, 2026-10-15): "remove the alzheimer's and dementia training and the on-the-job
   training ... that was a requirement for IHS and that and the 5 hours per year is no longer required."
   The one training required before the first client visit is the Agency Orientation. Dementia, on-the-job,
   annual in-service and bloodborne pathogens stay in the Training Platform as OPTIONAL courses the office
   assigns for a client's needs. Their dates are still recorded as history; nothing here calls them required,
   missing, due or overdue, and none of them can block, lapse or restrict anybody.
   The returned shape keeps the informational fields (ojtDone, isFirstYear) so older callers keep working. */
function trainStatus(c){
  const hire = pd(c.hire_date);
  const ihs = ihsTraining(c);
  /* cleared for client contact: orientation, and for a Medicaid caregiver until 11-16 dementia training too */
  const preContactDone = !!c.orient_date && (!ihs.applies || ihs.alzDone);
  const ojtDone = !!(c.ojt_date && c.ojt_signed==='yes' && c.ojt_online);
  const msPerYear = 365*86400000;
  const isFirstYear = !!(hire && (__ELIG_TODAY__ - hire) < msPerYear);
  const overall = !preContactDone ? 'Client Contact Blocked' : ihs.applies ? ihs.overall : 'Current';
  return {preContactDone,ojtDone,isFirstYear,overall,ihs};
}

/* MEDICAID CAREGIVERS (Samantha, 2026-10-19): "Keep only for caregivers who have worked with IHS. I need to know all
   caregivers who have worked with medicaid clients because I will need to show proof of their training if I get
   audited later." A caregiver is a Medicaid caregiver when AxisCare shows a visit with a Medicaid (IHS/ADW) client
   (medicaid_clients, kept on the record for good, filled by the Training tab) or the office ticked it by hand for the
   WellSky days (medicaid_hand = 'yes'). For them the old IHS training rules (19 CSR 15-7.021(22)) still count until
   IHS/ADW Medicaid ends on 2026-11-16 (Central day, the same switch as supervisory visits): dementia training before
   the first client, on-the-job training within 30 days of hire, and from year two the yearly 5-hour in-service.
   From 2026-11-16 nothing here blocks anybody; the status is still worked out so the audit list can show it. */
const MEDICAID_TRAINING_UNTIL = '2026-11-16';
function medicaidCaregiver(c){
  return !!(c && (String(c.medicaid_hand||'') === 'yes' || (Array.isArray(c.medicaid_clients) && c.medicaid_clients.length)));
}
function medicaidTrainingApplies(c, now){ return medicaidCaregiver(c) && centralDay(now) < MEDICAID_TRAINING_UNTIL; }
/* MEDICAID PROOF (Samantha, 2026-10-19): "Caregiver who worked with medicaid clients have to have proof of all required
   trainings and certificates proving the training on their profiles." Permanent, for audits, past employees included.
   Required = the 4 IHS trainings (her answer): Agency Orientation, dementia training, on-the-job training (in person,
   signed off, and online), and the yearly 5-hour in-service, only for the years they served a Medicaid client (her
   answer: once Medicaid work ends no new yearly in-service is due). Each needs a date AND its certificate. This never
   blocks anybody; it is the audit answer. The Hub keeps only the latest in-service, so it checks the latest one covers
   their last Medicaid year (earlier years' certificates live in the Training Platform history). */
function medicaidLastDay(c, now){
  const cap = addDays(pd(MEDICAID_TRAINING_UNTIL), -1).toISOString().slice(0,10);
  const todayS = centralDay(now);
  const seen = (Array.isArray(c.medicaid_clients) ? c.medicaid_clients : []).map(m => String(m.last_date||'').slice(0,10)).filter(Boolean).sort();
  let last = seen.length ? seen[seen.length-1] : '';
  if(String(c.medicaid_hand||'') === 'yes' && !last) last = todayS < cap ? todayS : cap;   // hand tick: no dates, assume up to now (or 11-15)
  if(last && last > cap) last = cap;
  if(last && last > todayS) last = todayS;
  return last;
}
function medicaidProof(c, now){
  if(!medicaidCaregiver(c)) return { medicaid:false, items:[], missing:[] };
  const last = medicaidLastDay(c, now);
  const hire = pd(c.hire_date);
  const items = [];
  const add = (key, label, date, proof, extraOk, note) => {
    const st = !date ? 'no_date' : (extraOk === false ? 'not_signed' : (!proof ? 'no_proof' : 'ok'));
    items.push({ key, label, date: date || '', proof: proof || '', status: st, note: note || '' });
  };
  add('orient', 'Agency Orientation', c.orient_date, c.orient_proof);
  add('alz', 'Dementia training', c.alz_date, c.alz_proof);
  add('ojt', 'On-the-job, in person', c.ojt_date, c.ojt_proof, c.ojt_date ? c.ojt_signed === 'yes' : undefined);
  add('ojt_online', 'On-the-job, online', c.ojt_online, c.ojt_online_proof);
  /* yearly in-service: due only when they served Medicaid past their first year */
  const yearOneEnd = hire ? addDays(hire, 365).toISOString().slice(0,10) : '';
  if(last && yearOneEnd && last >= yearOneEnd){
    const needFrom = addDays(pd(last), -365).toISOString().slice(0,10);
    const d = String(c.annual_date||'').slice(0,10);
    const hrs = parseFloat(c.annual_hrs);
    if(!d) items.push({ key:'annual', label:'Annual in-service (5 hours)', date:'', proof:c.annual_proof||'', status:'no_date', note:'needed for the year up to ' + last });
    else if(d < needFrom) items.push({ key:'annual', label:'Annual in-service (5 hours)', date:d, proof:c.annual_proof||'', status:'too_old', note:'the latest on file is before the year up to ' + last });
    else if(!isNaN(hrs) && hrs < 5) items.push({ key:'annual', label:'Annual in-service (5 hours)', date:d, proof:c.annual_proof||'', status:'short_hours', note: hrs + ' of 5 hours' });
    else add('annual', 'Annual in-service (5 hours)', d, c.annual_proof);
  } else {
    items.push({ key:'annual', label:'Annual in-service (5 hours)', date:String(c.annual_date||''), proof:c.annual_proof||'', status:'not_due',
      note: last ? 'not due: Medicaid work ended in their first year' : 'not due' });
  }
  const WORD = { no_date:'not on record', no_proof:'no certificate', not_signed:'not signed off', too_old:'out of date', short_hours:'hours short' };
  const missing = items.filter(i => WORD[i.status]).map(i => i.label + ': ' + WORD[i.status] + (i.note && i.status !== 'no_proof' ? ' (' + i.note + ')' : ''));
  return { medicaid:true, last_medicaid_day:last, items, missing, complete: !missing.length };
}
function ihsTraining(c){
  const hire = pd(c.hire_date);
  const alzDone = !!c.alz_date;
  const thirtyDeadline = hire ? addDays(hire,30) : null;
  const thirtyPassed = !!(thirtyDeadline && __ELIG_TODAY__ > thirtyDeadline);
  const ojtDone = !!(c.ojt_date && c.ojt_signed==='yes' && c.ojt_online);
  const isFirstYear = !!(hire && (__ELIG_TODAY__ - hire) < 365*86400000);
  let annualStatus = 'Exempt (Year 1)', annualNextDue = null;
  if(!isFirstYear){
    if(!c.annual_date) annualStatus = 'Overdue';
    else {
      annualNextDue = addDays(pd(c.annual_date), 365);
      const left = daysLeft(annualNextDue);
      annualStatus = left<0 ? 'Overdue' : left<=30 ? 'Due Soon' : 'Current';
    }
  }
  const hrs = parseFloat(c.annual_hrs);
  const annualShort = !isFirstYear && !!c.annual_date && annualStatus !== 'Overdue' && !isNaN(hrs) && hrs < 5;
  const applies = medicaidTrainingApplies(c);
  let overall = 'Current';
  if(!alzDone) overall = 'Client Contact Blocked';
  else if(!ojtDone && thirtyPassed) overall = 'Training Overdue';
  else if(!ojtDone) overall = 'OJT Pending';
  else if(annualStatus === 'Overdue') overall = 'Annual Overdue';
  else if(annualStatus === 'Due Soon') overall = 'Annual Due Soon';
  return { medicaid: medicaidCaregiver(c), applies, until: MEDICAID_TRAINING_UNTIL, alzDone, thirtyDeadline, thirtyPassed,
           ojtDone, isFirstYear, annualStatus, annualNextDue, annualShort, overall };
}

/* REFERENCE POLICY, set 12 Aug 2026.
   Before this, `neg` was computed and never used, so two Positive references
   let somebody through even with a third marked Negative. They no longer do.

     · fewer than 2 Positive        -> Awaiting, as before
     · any Negative                 -> Needs Review, whatever the Positives say
     · any Conditional              -> Needs Review until a supervisor decides
     · 2+ Positive, neither of the above -> Ready for Orientation

   A supervisor decision is recorded on the candidate as ref_decision and is
   evidence, not a checkbox: it snapshots the references it was made against,
   so "decided on two Positive and one Conditional" stays readable even after a
   reference is later updated. A decision does NOT carry over to a Negative
   that arrives afterwards. */
function refDecisionCovers(c){
  const d=c.ref_decision;
  if(!d || d.outcome!=='proceed') return false;
  const now=[c.r1s,c.r2s,c.r3s,c.r4s].map(x=>x||'').join('|');
  return String(d.refs||'')===now;          // any change re-opens the decision
}
function refPolicy(c){
  const refs=[c.r1s,c.r2s,c.r3s,c.r4s];
  const pos=refs.filter(r=>r==='Positive').length;
  const negative=refs.some(r=>r==='Negative');
  const conditional=refs.some(r=>r==='Conditional');
  if(negative) return {ok:false, blocked:true,
    why:'A reference came back Negative. A supervisor has to resolve it.'};
  if(conditional && !refDecisionCovers(c)) return {ok:false, blocked:true,
    why:'A reference is Conditional. A supervisor has to decide before this one moves on.'};
  if(pos<2) return {ok:false, blocked:false,
    why:(2-pos)+' more positive reference'+(2-pos===1?'':'s')+' needed (at least one from a past job).'};
  /* Samantha 2026-10-09 decision 1, made the one rule 2026-10-12: two positive, at least one of them from work. The
     readiness card already asked for this; the type is the one recorded on the slot or with the answers. */
  const work=[1,2,3,4].some(n=>c['r'+n+'s']==='Positive' &&
    String((c['r'+n+'_manual']&&c['r'+n+'_manual'].type)||c['r'+n+'_type']||'').trim().toLowerCase()==='professional');
  if(!work) return {ok:false, blocked:false,
    why:'One of the positive references has to be from a past job. If one already is, mark it as a work reference.'};
  return {ok:true, blocked:false, why:''};
}
/* REFERENCE ANSWERS ON THE SLOT (Samantha 2026-10-12, step 3: answers land by themselves). One copy, used by the
   Sync button in the Hub and by the server's reference-land job, so both score an answer exactly alike. r is a
   reference_requests row the reference answered; the result is the fields to set on the candidate, never a send. */
function refTypeOf(v){
  const t=String(v||'').trim().toLowerCase();
  return t==='professional'?'professional':t==='personal'?'personal':'';
}
function refScore(recommend,reliability,interpersonal,honesty,concerns,extra){
  if(!recommend) return null;
  if(recommend==='no'||concerns==='serious') return 'Negative';
  const x=extra||{};
  const scores={Excellent:3,Good:2,Fair:1,Poor:0};
  const given=[reliability,interpersonal,honesty].filter(Boolean);
  const denom=refTypeOf(x.type)==='professional' ? Math.max(1,given.length) : 3;
  const avg=(given.map(r=>scores[r]||0).reduce((a,b)=>a+b,0))/denom;
  if(recommend==='reservations'||concerns==='minor'||avg<1.5) return 'Conditional';
  if(x.rehire==='no') return 'Conditional';
  if(x.trust_family==='no'||x.trust_family==='reservations') return 'Conditional';
  return 'Positive';
}
function refAnswerPatch(c, r){
  const n=Number(r && r.slot);
  if(!c || !(n>=1 && n<=4)) return null;
  const manual={
    staff:'answered by the reference', via:'Online form',
    date:String(r.responded_at||'').slice(0,10),
    name:r.responder_name||r.ref_name||'',
    type:refTypeOf(r.ref_type||c['r'+n+'_type']), relationship:r.ref_relationship||'', how_long:r.how_long||'',
    recommend:r.recommend||'', reliability:r.reliability||'',
    interpersonal:r.interpersonal||'', honesty:r.honesty||'',
    concerns:r.concerns||'', notes:r.notes||'',
    rel_answer:r.rel_answer||'', employer_confirmed:r.employer_confirmed||'',
    emp_from:r.emp_from||'', emp_to:r.emp_to||'', job_title:r.job_title||'',
    hours_type:r.hours_type||'', rehire:r.rehire||'', trust_family:r.trust_family||'',
    responder_title:r.responder_title||'', date_check:'' };
  const set={};
  set['r'+n+'n']=c['r'+n+'n']||r.ref_name||r.responder_name||'';
  set['r'+n+'_manual']=manual;
  if(r.ref_type && !c['r'+n+'_type']) set['r'+n+'_type']=refTypeOf(r.ref_type);
  if(r.ref_company && !c['r'+n+'_company']) set['r'+n+'_company']=r.ref_company;
  const score=refScore(r.recommend,r.reliability,r.interpersonal,r.honesty,r.concerns,
    { type:manual.type, rehire:manual.rehire, trust_family:manual.trust_family })||'Pending';
  set['r'+n+'s']=score;
  return { slot:n, set, score };
}
/* CANDIDATE / PRE-HIRE progression. References and the initial CLEAR results
   are pre-hire evidence and live only on the candidate record. This decides
   whether somebody may move toward hire and orientation — it is NOT the
   question of whether an employed caregiver may work today. */
function candidateProgress(c){
  const rp=refPolicy(c);
  const out={ status: obDeriveStatus(c), refs: rp, blockers: [] };
  if(!rp.ok) out.blockers.push({code:'references', why:rp.why, needs_supervisor:rp.blocked});
  if(c.oig !== 'CLEAR')  out.blockers.push({code:'oig',  why:'OIG check not clear.'});
  if(c.edl !== 'Clear')  out.blockers.push({code:'edl',  why:'EDL check not clear.'});
  if(c.fcsr !== 'Clear') out.blockers.push({code:'fcsr', why:'FCSR background check not clear.'});
  if(c.casenet !== 'Clear') out.blockers.push({code:'casenet', why:'Case.net court records search not clear.'});
  /* NO FINGERPRINTS (Samantha, 2026-10-21: "I don't need finger print anymore since we are stopping Medicaid IHS").
     Living outside Missouri no longer adds a check; the oos/fp fields stay on the record as history only. */
  out.ready = out.status === 'Ready for Orientation';
  return out;
}

/* The snapshot taken when a candidate becomes an employee. It answers "why did
   Caring Companions allow this person to be hired" without the live evaluator
   having to reach back into candidate records for ever. */
function hiringSnapshot(cand){
  const p=candidateProgress(cand);
  return { at:new Date().toISOString(), event:'pre_hire_clearance',
    ready:p.ready, status:p.status,
    refs:[cand.r1s,cand.r2s,cand.r3s,cand.r4s].map(x=>x||'').join('|'),
    oig:cand.oig||'', edl:cand.edl||'', fcsr:cand.fcsr||'', casenet:cand.casenet||'',
    oos:cand.oos||'', fp:cand.fp||'',
    ref_decision: cand.ref_decision || null,
    outstanding: p.blockers.map(b=>b.code) };
}

function obDeriveStatus(c){
  const rp=refPolicy(c);
  const oigOk=c.oig==='CLEAR', edlOk=c.edl==='Clear', bgOk=c.fcsr==='Clear';
  /* Case.net (Missouri court records name search), a background check on both paths from 2026-10-11 (Samantha: "add
     case.net to the old process too"). The new path's approvals already wait for it. */
  const casenetOk=c.casenet==='Clear';
  /* Fingerprints are no longer a check (2026-10-21, see candidateProgress). */
  if(c.oig==='FLAGGED'||c.edl==='Issues Found'||c.fcsr==='Issues Found'||c.casenet==='Issues Found') return 'Needs Review';
  if(rp.blocked) return 'Needs Review';
  if(rp.ok&&oigOk&&edlOk&&bgOk&&casenetOk) return 'Ready for Orientation';
  return 'Awaiting';
}

function fcsrRegStatus(c){
  if(c.fcsr_reg_date) return {status:'ok', label:`Registered ${fmtD(c.fcsr_reg_date)}`};
  if(!c.hire_date) return {status:'pending', label:'Registration: not recorded'};
  const hire=pd(c.hire_date);
  const daysSince=Math.floor((__ELIG_TODAY__-hire)/86400000);
  if(daysSince>15) return {status:'overdue', label:`Registration overdue: ${daysSince}d since hire`};
  return {status:'pending', label:`Must register within ${15-daysSince}d`};
}

/* ─────────────────────────────────────────────────────────────────────────
   ELIGIBLE TO WORK — computed, never selected.
   Built 12 Aug 2026. Composes the calculations that already exist; it does
   not recalculate anything and it does not replace acWorst.

   WHY NOT acWorst: that pools OIG, EDL, FCSR, supervisory visits and
   performance reviews into one worst-of status, which is right for the
   compliance screen and wrong here. An overdue performance review is a
   management-quality problem, not a reason somebody may not work. Eligibility
   looks at the four legal/contractual clearances only.

   THREE STATES, and nothing else:
     not_eligible   a pre-work requirement has never been satisfied
     eligible       cleared, and nothing required has expired
     lapsed         was eligible; something required has since expired

   FCSR REGISTRATION is deliberately NOT a lapse condition. Missouri requires
   registration within 15 days and the provider must ensure it, but the exact
   work-removal consequence has not been established, so V1 raises serious
   compliance work without silently stopping somebody working. Moving it is a
   one-line change once that is settled. */
const ELIG_LEGAL = 'legal', ELIG_MGMT = 'management', ELIG_AGENCY = 'agency';

/* ── CAREGIVER PROFILE BEFORE THE FIRST SHIFT (part 2, slice 2c, 2026-10-01) ──
   Samantha: "must have profile before can start work. The video is encouraged,
   the photo is required." Publishing already demands the photo, their OK and no
   [ask] prompts left, so "published" is the whole test here.

   NEW HIRES ONLY. Current caregivers are never blocked or flagged for having no
   profile; they get one over time through "Start a profile". A new hire is
   somebody who, by the record itself, joined on or after PROFILE_REQUIRED_FROM:
     · hire_date on or after it, or
     · promoted_at (the Hub's promote-to-caregiver stamp) on or after it, read
       as a Central date, or
     · has_welcome_call === true (filled by the Hub from welcome_calls; the
       remote welcome call only exists for people being hired now).
   One constant, so the line is obvious and moving it is a one-line change.

   profile_published is FILLED BY THE HUB, never stored on the record:
     true   a published, not withdrawn caregiver_profiles row was found
     false  looked, and there is none (or it is not published yet)
     undefined  nobody looked (the server sweep, older callers)
   UNKNOWN IS NOT FAILED: only an explicit false, for a new hire, blocks. This is
   why the server sweep and the obligations runner, which never fill it, are
   unaffected by this rule. It is agency policy, not a state requirement, so it
   carries its own kind and never becomes a lapse or a work restriction. */
const PROFILE_REQUIRED_FROM = '2026-10-02';
const PROFILE_WHY = 'Profile needed before first shift: new hires need a published caregiver profile, with their photo, before their first client visit.';
function centralYmd(iso){
  if(!iso) return '';
  const d = new Date(iso); if(isNaN(d)) return '';
  try{
    const p = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
    const g = t => (p.find(x=>x.type===t)||{}).value || '';
    return g('year')+'-'+g('month')+'-'+g('day');
  }catch(e){ return d.toISOString().slice(0,10); }
}
function profileNewHire(c){
  if(!c) return false;
  if(c.has_welcome_call === true) return true;
  const hd = String(c.hire_date||'').slice(0,10);
  if(/^\d{4}-\d{2}-\d{2}$/.test(hd) && hd >= PROFILE_REQUIRED_FROM) return true;
  const pr = centralYmd(c.promoted_at);
  return !!pr && pr >= PROFILE_REQUIRED_FROM;
}
function profileGate(c){
  const v = c ? c.profile_published : undefined;
  const newHire = profileNewHire(c);
  const blocked = newHire && v === false;
  return { new_hire:newHire, checked: v === true || v === false, published: v === true,
           blocked, why: blocked ? PROFILE_WHY : '' };
}

function eligibilityFacts(c){
  const ts = trainStatus(c);
  /* OIG monthly (Samantha, decision 2, 2026-10-10): HHS-OIG Special Advisory Bulletin (May 2013) recommends monthly LEIE
     screening with documented searches; Missouri MMAC requires a monthly HHS-OIG search. The 90-day figure was never a rule. */
  const oig = chkStatus(c.oig_date, 30, 7);
  /* EDL quarterly: Caring Companions policy (Samantha, 2026-10-14, replacing her 2026-10-09 monthly rule), not a Missouri interval */
  const edl = chkStatus(c.edl_date, 90, 14);
  const fcsr = chkStatus(c.fcsr_date, 365, 30);
  const reg = fcsrRegStatus(c);
  const hire = pd(c.hire_date);
  const ojtDeadline = ts.ihs.thirtyDeadline;
  return { ts, oig, edl, fcsr, reg, hire, ojtDeadline };
}

function eligibility(c){
  const f = eligibilityFacts(c);
  const blockers = [];   // never worked: stops client contact
  const lapses   = [];   // was fine, now is not
  const tasks    = [];   // required, deadline running, does not stop work
  const mgmt     = [];   // management quality, never affects eligibility

  /* NO CANDIDATE FIELDS ARE READ HERE. References and the initial CLEAR
     results are pre-hire evidence; they live on the candidate record and are
     preserved as a hiring snapshot. An employed caregiver's record does not
     carry r1s..r4s or the candidate oig/edl/fcsr strings, and treating their
     absence as failure marked every real caregiver Not Eligible on all six
     counts at once — which is how the dry run caught it.

     Current background compliance still matters, and is evaluated below from
     the caregiver's own dates and status overrides. Historical clearance and
     current compliance are different facts. */

  /* ── PRE-WORK: before any client contact ───────────────────────────────
     UNKNOWN IS NOT FAILED. This distinction is permanent and applies well
     beyond training: as older employee records move into newer systems, the
     absence of a field means "we have not looked there yet" far more often
     than it means "this did not happen".

     Orientation is populated by the Training Hub sync (course slug
     agency-orientation). A caregiver who has been working for months with no
     record at all is almost certainly a record that was never imported. A
     caregiver hired last week with no record has genuinely not done it yet.

     So: recent hire + absent = a real blocker.
         tenured + absent + no evidence anywhere = needs historical verification,
         which is work for a human and NEVER a hard work restriction.

     Dementia training is OPTIONAL from 2026-10-15 (see trainStatus): it is not
     a blocker and its absence is never reported, except for a Medicaid
     caregiver until 2026-11-16 (see ihsTraining). */
  const GRACE_DAYS = 45;              // long enough to complete it, short enough to notice
  const tenureDays = f.hire ? Math.floor((__ELIG_TODAY__ - f.hire)/86400000) : null;
  const longServing = tenureDays !== null && tenureDays > GRACE_DAYS;
  const noEvidenceAtAll = !c.orient_date && !c.orient_proof && !c.th_synced;
  const unverified = [];
  const ihs = f.ts.ihs;
  const historical = longServing && noEvidenceAtAll;
  if(!c.orient_date){
    (historical ? unverified : blockers).push({code:'orientation', kind:ELIG_LEGAL,
      why: historical
        ? 'No orientation record, and none has ever been imported for this caregiver. Verify before treating it as incomplete.'
        : 'Orientation not attended.'});
  }
  if(ihs.applies && !ihs.alzDone){
    const hist = longServing && noEvidenceAtAll && !c.alz_proof;
    (hist ? unverified : blockers).push({code:'alz', kind:ELIG_LEGAL, medicaid:true,
      why: hist
        ? 'Medicaid caregiver: no dementia-training record, and none has ever been imported. Verify before treating it as incomplete.'
        : 'Medicaid caregiver: dementia training not completed (required while serving IHS/ADW clients, until Nov 16, 2026).'});
  }

  // ── CAREGIVER PROFILE: new hires only, explicit false only (see profileGate) ──
  const pg = profileGate(c);
  if(pg.blocked) blockers.push({code:'caregiver_profile', kind:ELIG_AGENCY, why:pg.why});

  /* On-the-job training (and its old 30-day deadline) is optional from 2026-10-15: no task, no lapse, except for a
     Medicaid caregiver until 2026-11-16. A missed deadline is then a LAPSE only for somebody who had cleared the
     pre-work gate; otherwise it stays a task and the real blocker speaks for itself. */
  if(ihs.applies && !ihs.ojtDone){
    if(ihs.thirtyPassed && f.ts.preContactDone && !blockers.length && !unverified.length){
      lapses.push({ code:'ojt_overdue', kind:ELIG_LEGAL, restriction:true, medicaid:true,
        why:'Medicaid caregiver: required OJT not completed within 30 days of hire',
        due: f.ojtDeadline ? f.ojtDeadline.toISOString().slice(0,10) : null });
    } else {
      tasks.push({ code:'ojt', kind:ELIG_LEGAL, medicaid:true,
        high: ihs.thirtyPassed,
        why: ihs.thirtyPassed
          ? 'Medicaid caregiver: on-the-job training is past its 30-day deadline.'
          : 'Medicaid caregiver: on-the-job training due within 30 days of hire.',
        due: f.ojtDeadline ? f.ojtDeadline.toISOString().slice(0,10) : null });
    }
  }

  // ── FCSR registration: serious, but not a lapse in V1 ─────────────────
  if(f.reg.status === 'overdue')
    tasks.push({ code:'fcsr_registration', kind:ELIG_LEGAL, high:true,
      why:'FCSR registration overdue. Missouri requires it within 15 days of hire.' });
  else if(f.reg.status === 'pending' && c.hire_date)
    tasks.push({ code:'fcsr_registration', kind:ELIG_LEGAL, why:f.reg.label });

  // ── RECURRING CLEARANCES that can end eligibility ─────────────────────
  /* The caregiver record carries an optional override per check —
     Auto | Current | Overdue. 'Auto' or blank means derive it from the date,
     which is the normal case. An explicit value is a human saying they know
     better than the date, and it wins. */
  const eff = (override, derived) => {
    const o = String(override || '').trim();
    if(o === 'Overdue') return 'Overdue';
    if(o === 'Current') return 'Current';
    return derived;
  };
  if(eff(c.oig_status,  f.oig.status)  === 'Overdue') lapses.push({code:'oig_expired',  kind:ELIG_LEGAL, why:'OIG check is overdue (monthly, agency policy).'});
  if(eff(c.edl_status,  f.edl.status)  === 'Overdue') lapses.push({code:'edl_expired',  kind:ELIG_LEGAL, why:'EDL check is overdue (quarterly, agency policy).'});
  if(eff(c.fcsr_status, f.fcsr.status) === 'Overdue') lapses.push({code:'fcsr_expired', kind:ELIG_LEGAL, why:'FCSR check is overdue (annual).'});
  /* Annual in-service (the 5 hours a year) is optional from 2026-10-15: annual_date / annual_hrs are history only,
     except for a Medicaid caregiver until 2026-11-16 (overdue = lapse; short hours = a task, never a restriction). */
  if(ihs.applies && ihs.annualStatus === 'Overdue')
    lapses.push({code:'annual_training', kind:ELIG_LEGAL, medicaid:true, why:'Medicaid caregiver: annual training is overdue.'});
  if(ihs.applies && ihs.annualShort)
    tasks.push({code:'annual_hours', kind:ELIG_LEGAL, medicaid:true, why:'Medicaid caregiver: annual in-service hours short: ' + c.annual_hrs + ' of 5 recorded in the last year.'});
  /* SLICE 6 (her decision 2): typed credential expiries with proof (CNA, driver's license, auto insurance). Expired or due
     within 30 days = a task for the office (agency policy); the roster rows are blank for everyone until typed. */
  const credExp = [['cna_expires','cna_expired','CNA credential'], ['dl_expires','dl_expired',"Driver's license"], ['auto_ins_expires','auto_ins_expired','Auto insurance']];
  for(const [field, code, label] of credExp){
    const d = pd(c[field]); if(!d) continue;
    const left = daysLeft(d);
    if(left < 0) tasks.push({code, kind:ELIG_AGENCY, high:true, why:label + ' expired on ' + c[field] + '. Record the renewal with its proof.', due:c[field]});
    else if(left <= 30) tasks.push({code:code.replace('_expired','_due'), kind:ELIG_AGENCY, why:label + ' expires on ' + c[field] + ' (' + left + ' days).', due:c[field]});
  }

  // ── MANAGEMENT QUALITY: reported, never eligibility ───────────────────
  const sv = chkStatus(c.supv_date, 365, 30), pr = chkStatus(c.perf_date, 365, 30);
  if(sv.status === 'Overdue' && !supervisoryConcernOnly()) mgmt.push({code:'supervisory_visit', kind:ELIG_MGMT, why:'Supervisory visit overdue.'});
  if(pr.status === 'Overdue') mgmt.push({code:'performance_review', kind:ELIG_MGMT, why:'Performance review overdue.'});

  /* needs_verification sits between eligible and not_eligible on purpose. It
     is not a pass, and it is not a compliance failure — it is a record to go
     and find. It never produces a hard work restriction. */
  const state = blockers.length ? 'not_eligible'
              : (lapses.length ? 'lapsed'
              : (unverified.length ? 'needs_verification' : 'eligible'));
  const label = state==='eligible' ? 'ELIGIBLE TO WORK'
              : state==='lapsed'   ? 'ELIGIBILITY LAPSED'
              : state==='needs_verification' ? 'NEEDS HISTORICAL VERIFICATION'
              : 'NOT ELIGIBLE';
  const reasons = blockers.concat(lapses).concat(unverified);
  return {
    state, label, blockers, lapses, tasks, mgmt, unverified, facts:f, reasons,
    tenure_days: tenureDays,
    /* the single sentence a human reads first */
    summary: state==='eligible'
      ? 'All required pre-work conditions satisfied.'
      : state==='needs_verification'
      ? 'Working, but the orientation record was never imported. Verify it rather than assuming it is missing.'
      : reasons.map(r=>r.why).join(' '),
    /* a hard work restriction is a lapse that says so */
    restricted: lapses.some(l=>l.restriction===true),
    needs_supervisor: blockers.some(b=>b.needs_supervisor)
  };
}


/* ── STEP 3: the permanent record ──────────────────────────────────────────
   One array on the caregiver record that already exists. Not a second notes
   system, and not a second caregiver database — the Staffing Hub has no
   caregiver file-note structure at all, so this is the first one, kept beside
   the evidence rather than away from it.

   Written ONLY when the computed state changes. A caregiver who stays eligible
   for two years has an empty history, which is correct: nothing happened. */
function eligEntry(c, e, extra){
  const now = new Date().toISOString();
  return Object.assign({
    at: now,
    state: e.state,
    label: e.label,
    reason: e.summary,
    codes: e.reasons.map(r=>r.code),
    restricted: !!e.restricted,
    by: (typeof root.ME!=='undefined' && root.ME && root.ME.email) ? root.ME.email : 'system'
  }, extra||{});
}

/* Records a transition and returns true if anything was written. The caller
   saves; this does not, so a batch run writes once rather than per caregiver. */
function eligRecord(c, e){
  c.eligibility_history = c.eligibility_history || [];
  const last = c.eligibility_history[c.eligibility_history.length-1];
  if(last && last.state === e.state && String(last.codes||'') === String(e.reasons.map(r=>r.code))) return false;

  const entry = eligEntry(c, e);
  /* A restriction and a restoration are different events and read differently
     in a file six months later, so they are named rather than inferred. */
  if(e.restricted)                     entry.event = 'restricted';
  else if(last && last.restricted)     entry.event = 'restored';
  else if(e.state === 'eligible')      entry.event = 'eligible';
  else                                 entry.event = 'not_eligible';

  /* The date it BECAME overdue is the day after the deadline, not the day we
     happened to look. If the evaluator does not run for a week, a file that
     said "became overdue" on the day we noticed would be wrong, and this is a
     compliance record somebody may have to defend. `detected_at` keeps both
     facts, because when we noticed also matters. */
  if(entry.event === 'restricted'){
    const due = (e.lapses.find(l=>l.restriction===true && l.due) || {}).due;
    const dl = pd(due);
    entry.became_overdue = dl ? addDays(dl,1).toISOString().slice(0,10)
                              : new Date().toISOString().slice(0,10);
    entry.detected_at    = new Date().toISOString().slice(0,10);
  }
  if(entry.event === 'restored'){
    /* The only restriction there ever was is the old OJT 30-day one. From 2026-10-15 OJT is optional, so a
       restoration after it says so rather than pretending the course was done. */
    if(String(last.codes||'').split(',').includes('ojt_overdue')){
      entry.cleared_on = c.ojt_date || null;
      if(!c.ojt_date) entry.note = 'On-the-job training is no longer required (owner decision 2026-10-15).';
    }
    entry.restored_on = new Date().toISOString().slice(0,10);
    const wasRestrictedAt = [...c.eligibility_history].reverse().find(h=>h.event==='restricted');
    if(wasRestrictedAt) entry.restriction_started = wasRestrictedAt.at;
  }
  c.eligibility_history.push(entry);
  /* The current answer is cached on the record so other hubs and the
     server-side evaluator can read it without recomputing. It is a cache of a
     computation, never something a human sets. */
  c.eligibility_state  = e.state;
  c.eligibility_reason = e.summary;
  c.eligibility_at     = entry.at;
  return true;
}

/* A supervisor's reference decision is evidence too, and belongs in the same
   place as everything else that explains why somebody was cleared. */
function eligRecordRefDecision(c, outcome, note){
  const refs=[c.r1s,c.r2s,c.r3s,c.r4s].map(x=>x||'').join('|');
  c.ref_decision = { outcome, refs, note: note||'',
    by: (typeof root.ME!=='undefined' && root.ME && root.ME.email) ? root.ME.email : 'unknown',
    at: new Date().toISOString() };
  c.eligibility_history = c.eligibility_history || [];
  c.eligibility_history.push({
    at: c.ref_decision.at, event: 'ref_decision', state: null,
    reason: 'Supervisor decision on references: ' + outcome + (note ? ': ' + note : ''),
    refs, by: c.ref_decision.by
  });
  return c.ref_decision;
}

root.CCElig = { chkStatus, trainStatus, refPolicy, refDecisionCovers, refScore, refAnswerPatch, obDeriveStatus,
                candidateProgress, hiringSnapshot,
                fcsrRegStatus, eligibility, eligibilityFacts, eligEntry, eligRecord,
                eligRecordRefDecision, ELIG_LEGAL, ELIG_MGMT, ELIG_AGENCY,
                PROFILE_REQUIRED_FROM, profileNewHire, profileGate,
                SUPERVISORY_CONCERN_FROM, supervisoryConcernOnly, centralDay,
                MEDICAID_TRAINING_UNTIL, medicaidCaregiver, medicaidTrainingApplies, ihsTraining, medicaidProof, medicaidLastDay,
                _helpers:{ pd, addDays, daysLeft, fmtD, today } };
})(typeof globalThis!=='undefined' ? globalThis : this);
