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
   caregiver's OJT deadline would pass without the running process noticing.
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

function chkStatus(lastStr, interval, warnDays){
  if(!lastStr) return {status:'Pending',nextDue:null,days:null};
  const last=pd(lastStr), next=addDays(last,interval), left=daysLeft(next);
  return { status: left<0?'Overdue':left<=warnDays?'Due Soon':'Current', nextDue:next, days:left };
}

function trainStatus(c){
  const hire = pd(c.hire_date);
  const preContactDone = !!(c.orient_date && c.alz_date);
  const thirtyDeadline = hire ? addDays(hire,30) : null;
  const thirtyPassed = thirtyDeadline && __ELIG_TODAY__ > thirtyDeadline;
  const ojtDone = !!(c.ojt_date && c.ojt_signed==='yes' && c.ojt_online);
  const thirtyDone = preContactDone && ojtDone;
  // Check OJT was within 30 days
  let ojtOnTime = false;
  if(ojtDone && hire && thirtyDeadline){
    const ojtD = pd(c.ojt_date), ojtOD = pd(c.ojt_online);
    ojtOnTime = ojtD<=thirtyDeadline && ojtOD<=thirtyDeadline;
  }
  // Annual: exempt if within first 12 months of hire
  const msPerYear = 365*86400000;
  const isFirstYear = hire && (__ELIG_TODAY__ - hire) < msPerYear;
  let annualStatus = 'Exempt (Year 1)';
  let annualNextDue = null;
  if(!isFirstYear){
    if(!c.annual_date){ annualStatus='Overdue'; }
    else {
      const lastA = pd(c.annual_date);
      annualNextDue = addDays(lastA, 365);
      const left = daysLeft(annualNextDue);
      annualStatus = left<0?'Overdue':left<=30?'Due Soon':'Current';
    }
  }
  // Overall
  let overall;
  if(!preContactDone) overall='Client Contact Blocked';
  else if(!thirtyDone && thirtyPassed) overall='Training Overdue';
  else if(!thirtyDone) overall='OJT Pending';
  else if(annualStatus==='Overdue') overall='Annual Overdue';
  else if(annualStatus==='Due Soon') overall='Annual Due Soon';
  else overall='Current';

  return {preContactDone,thirtyDeadline,thirtyDone,thirtyPassed,ojtDone,ojtOnTime,
          isFirstYear,annualStatus,annualNextDue,overall};
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
    why:(2-pos)+' more positive reference'+(2-pos===1?'':'s')+' needed.'};
  return {ok:true, blocked:false, why:''};
}
function obDeriveStatus(c){
  const rp=refPolicy(c);
  const oigOk=c.oig==='CLEAR', edlOk=c.edl==='Clear', bgOk=c.fcsr==='Clear';
  const fpOk=c.oos!=='yes'||(c.fp==='Clear');
  if(c.oig==='FLAGGED'||c.edl==='Issues Found'||c.fcsr==='Issues Found'||c.fp==='Issues Found') return 'Needs Review';
  if(rp.blocked) return 'Needs Review';
  if(rp.ok&&oigOk&&edlOk&&bgOk&&fpOk) return 'Ready for Orientation';
  return 'Awaiting';
}

function fcsrRegStatus(c){
  if(c.fcsr_reg_date) return {status:'ok', label:`Registered ${fmtD(c.fcsr_reg_date)}`};
  if(!c.hire_date) return {status:'pending', label:'Registration: not recorded'};
  const hire=pd(c.hire_date);
  const daysSince=Math.floor((__ELIG_TODAY__-hire)/86400000);
  if(daysSince>15) return {status:'overdue', label:`Registration overdue — ${daysSince}d since hire`};
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
const ELIG_LEGAL = 'legal', ELIG_MGMT = 'management';

function eligibilityFacts(c){
  const ts = trainStatus(c);
  const oig = chkStatus(c.oig_date, 90, 14);
  const edl = chkStatus(c.edl_date, 90, 14);
  const fcsr = chkStatus(c.fcsr_date, 365, 30);
  const reg = fcsrRegStatus(c);
  const hire = pd(c.hire_date);
  const ojtDeadline = hire ? addDays(hire, 30) : null;
  return { ts, oig, edl, fcsr, reg, hire, ojtDeadline };
}

function eligibility(c){
  const f = eligibilityFacts(c);
  const blockers = [];   // never worked: stops client contact
  const lapses   = [];   // was fine, now is not
  const tasks    = [];   // required, deadline running, does not stop work
  const mgmt     = [];   // management quality, never affects eligibility

  // ── PRE-WORK, gate A: pre-hire clearance ──────────────────────────────
  const rp = refPolicy(c);
  if(!rp.ok) blockers.push({ code:'references', kind:ELIG_LEGAL, why:rp.why,
                             needs_supervisor: rp.blocked });
  if(c.oig !== 'CLEAR')  blockers.push({code:'oig',  kind:ELIG_LEGAL, why:'OIG check not clear.'});
  if(c.edl !== 'Clear')  blockers.push({code:'edl',  kind:ELIG_LEGAL, why:'EDL check not clear.'});
  if(c.fcsr !== 'Clear') blockers.push({code:'fcsr', kind:ELIG_LEGAL, why:'FCSR background check not clear.'});
  if(c.oos === 'yes' && c.fp !== 'Clear')
    blockers.push({code:'fingerprints', kind:ELIG_LEGAL,
                   why:'Out-of-state history, so fingerprints are required and are not clear.'});

  // ── PRE-WORK, gate B: before any client contact ───────────────────────
  if(!f.ts.preContactDone){
    if(!c.orient_date) blockers.push({code:'orientation', kind:ELIG_LEGAL, why:'Orientation not attended.'});
    if(!c.alz_date)    blockers.push({code:'alz', kind:ELIG_LEGAL,
                                      why:"Alzheimer's / dementia training not completed."});
  }

  // ── OJT: a task until the 30-day deadline, a work restriction after ───
  /* A missed OJT deadline is a LAPSE — something that took work away from
     somebody who had it. If they never cleared the pre-work gate they were
     never working, so it stays a task and the real blocker speaks for itself.
     Without this, a caregiver who never attended orientation would be handed
     a DO NOT SCHEDULE note citing OJT, which is both wrong and confusing. */
  if(!f.ts.thirtyDone){
    if(f.ts.thirtyPassed && f.ts.preContactDone && !blockers.length){
      lapses.push({ code:'ojt_overdue', kind:ELIG_LEGAL, restriction:true,
        why:'Required OJT not completed within 30 days of hire',
        due: f.ojtDeadline ? f.ojtDeadline.toISOString().slice(0,10) : null });
    } else {
      tasks.push({ code:'ojt', kind:ELIG_LEGAL,
        high: !!f.ts.thirtyPassed,
        why: f.ts.thirtyPassed
          ? 'On-the-job training is past its 30-day deadline.'
          : 'On-the-job training due within 30 days of hire.',
        due: f.ojtDeadline ? f.ojtDeadline.toISOString().slice(0,10) : null });
    }
  }

  // ── FCSR registration: serious, but not a lapse in V1 ─────────────────
  if(f.reg.status === 'overdue')
    tasks.push({ code:'fcsr_registration', kind:ELIG_LEGAL, high:true,
      why:'FCSR registration overdue — Missouri requires it within 15 days of hire.' });
  else if(f.reg.status === 'pending' && c.hire_date)
    tasks.push({ code:'fcsr_registration', kind:ELIG_LEGAL, why:f.reg.label });

  // ── RECURRING CLEARANCES that can end eligibility ─────────────────────
  if(f.oig.status === 'Overdue')  lapses.push({code:'oig_expired',  kind:ELIG_LEGAL, why:'OIG check is overdue (90-day cycle).'});
  if(f.edl.status === 'Overdue')  lapses.push({code:'edl_expired',  kind:ELIG_LEGAL, why:'EDL check is overdue (90-day cycle).'});
  if(f.fcsr.status === 'Overdue') lapses.push({code:'fcsr_expired', kind:ELIG_LEGAL, why:'FCSR check is overdue (annual).'});
  if(f.ts.annualStatus === 'Overdue')
    lapses.push({code:'annual_training', kind:ELIG_LEGAL, why:'Annual training is overdue.'});

  // ── MANAGEMENT QUALITY: reported, never eligibility ───────────────────
  const sv = chkStatus(c.supv_date, 365, 30), pr = chkStatus(c.perf_date, 365, 30);
  if(sv.status === 'Overdue') mgmt.push({code:'supervisory_visit', kind:ELIG_MGMT, why:'Supervisory visit overdue.'});
  if(pr.status === 'Overdue') mgmt.push({code:'performance_review', kind:ELIG_MGMT, why:'Performance review overdue.'});

  const state = blockers.length ? 'not_eligible' : (lapses.length ? 'lapsed' : 'eligible');
  const label = state==='eligible' ? 'ELIGIBLE TO WORK'
              : state==='lapsed'   ? 'ELIGIBILITY LAPSED' : 'NOT ELIGIBLE';
  const reasons = blockers.concat(lapses);
  return {
    state, label, blockers, lapses, tasks, mgmt, facts:f, reasons,
    /* the single sentence a human reads first */
    summary: state==='eligible'
      ? 'All required pre-work conditions satisfied.'
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
  const ojt = (e.lapses.find(l=>l.code==='ojt_overdue') || {});
  return Object.assign({
    at: now,
    state: e.state,
    label: e.label,
    reason: e.summary,
    codes: e.reasons.map(r=>r.code),
    restricted: !!e.restricted,
    ojt_due: ojt.due || (e.facts.ojtDeadline ? e.facts.ojtDeadline.toISOString().slice(0,10) : null),
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
    const dl = e.facts.ojtDeadline;
    entry.became_overdue = dl ? addDays(dl,1).toISOString().slice(0,10)
                              : new Date().toISOString().slice(0,10);
    entry.detected_at    = new Date().toISOString().slice(0,10);
  }
  if(entry.event === 'restored'){
    entry.cleared_on  = c.ojt_date || null;      // when the work was actually done
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
    reason: 'Supervisor decision on references: ' + outcome + (note ? ' — ' + note : ''),
    refs, by: c.ref_decision.by
  });
  return c.ref_decision;
}

root.CCElig = { chkStatus, trainStatus, refPolicy, refDecisionCovers, obDeriveStatus,
                fcsrRegStatus, eligibility, eligibilityFacts, eligEntry, eligRecord,
                eligRecordRefDecision, ELIG_LEGAL, ELIG_MGMT,
                _helpers:{ pd, addDays, daysLeft, fmtD, today } };
})(typeof globalThis!=='undefined' ? globalThis : this);
