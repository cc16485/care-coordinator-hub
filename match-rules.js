/* =====================================================================================================================
   MATCH RULES · THE ONE SHARED RULE: "QUALIFIED FOR THIS CLIENT, AND WHY" (Samantha, October 11 and 12, 2026)
   =====================================================================================================================
   One file, like eligibility-rules.js: the browser loads it with a <script> tag (globalThis.CCMatch) and a server job imports
   it, and a server runs it only once Samantha has approved its fingerprint (public.rules_approved). It decides nothing on its
   own today: it is run in the dark (a report only) until she switches a screen on.

   Her rules, built in:
     • The one skill list (approved October 12): 18 skills; the lift, two-person transfers and bedbound care are checked first.
     • "If we can't verify it, it doesn't count": a skill counts only when independently corroborated (a reference who saw it,
       a coordinator's observation, our clients' history with no concern, a registry) or demonstrated. Self-reported,
       "believed" or questioned evidence never counts; it can only make someone "Needs one more step".
     • Missing never means none: a client need that is not answered, or answered only at intake or assessment, is "not yet
       confirmed"; until every need is confirmed on the care plan the client is "Matching requirements incomplete" and
       nobody shows as Ready.
     • Medicaid: any lift or device transfer is advanced personal care, which we do not provide: the client is flagged for
       review, never matched. Catheter or ostomy bag care for a Medicaid client is flagged until MMAC answers (task R).
     • CDS and ILW clients are not matched this way (their attendants are the consumer's own employees).
     • Six checks in order; the first that fails is the one reason shown. Preferences and strengths only rank people who passed.
   Pure functions over plain data: no DOM, no network, no clock except the date passed in.
   ===================================================================================================================== */
(function(root){
'use strict';
const VERSION = '1.1.0';   /* 1.1.0 (2026-10-12, the dark report): adapters for the stored facts, the overlay's willingness and Spanish, AxisCare gender; cleared-to-drive unknown is one more step, never Ready */
/* ── the one skill list (October 12): key, label, the level that task needs, checked first, the Medicaid note,
      and where today's records keep it (the lead's checkbox, the skills record's box) ── */
const SKILLS = [
  ['companionship', 'Companionship and conversation', 1, false, null, [], null],
  ['meals_housekeeping', 'Meals and light housekeeping', 1, false, null, [], null],
  ['med_reminders', 'Medication reminders', 1, false, null, [], null],
  ['transportation', 'Driving clients to appointments and errands', 1, false, null, ['transportation'], 'transportation'],
  ['bathing', 'Bathing or showering', 2, false, null, ['personal_care'], 'personal_care'],
  ['dressing_grooming', 'Dressing and grooming', 2, false, null, ['personal_care'], 'personal_care'],
  ['toileting', 'Toileting and incontinence care', 2, false, null, ['personal_care'], 'personal_care'],
  ['feeding', 'Feeding', 2, false, null, ['personal_care'], 'personal_care'],
  ['walking_wheelchair', 'Walking or wheelchair help', 2, false, null, ['personal_care'], 'personal_care'],
  ['transfers_gait_belt', 'Transfers with a gait belt', 2, false, null, ['gait_belt'], 'transfers_gait_belt'],
  ['two_person_transfers', 'Two-person transfers', 2, true, null, [], null],
  ['hoyer_lift', 'A Hoyer or other mechanical lift', 3, true, 'apc', ['hoyer_lift'], 'hoyer_lift'],
  ['bedbound_care', 'Bedbound care and repositioning', 3, true, null, ['bed_bound'], 'bedbound_care'],
  ['catheter_bag', 'Emptying a catheter bag and cleaning around the site', 2, false, 'mmac', [], null],
  ['ostomy_bag', 'Emptying an ostomy bag and cleaning around the site', 2, false, 'mmac', [], null],
  ['hospice_support', 'Hospice and end-of-life support', 3, false, null, ['hospice'], 'hospice_support'],
  ['dementia_care', "Dementia or Alzheimer's care", 1, false, null, ['dementia', 'alzheimers'], 'dementia_care'],
  ['parkinsons_care', "Parkinson's care", 1, false, null, ['parkinsons'], 'parkinsons_care'],
].map(([key, label, level, checkFirst, medicaid, lead, overlay]) => ({ key, label, level, checkFirst, medicaid, lead, overlay }));
const BY = {}; SKILLS.forEach(s => { BY[s.key] = s; });
const VERIFIED = ['corroborated', 'demonstrated'];          /* the only standings that count */
const CONFIRMED_STAGES = ['plan', 'current'];               /* only these client stages are enforced */
const NOT_MATCHED_PAYERS = ['cds', 'ilw'];
const lab = k => (BY[k] || { label: k }).label;
const needOf = (c, k) => { const n = (c.needs || {})[k]; return n && typeof n === 'object' ? n : { value: n == null ? null : n, stage: n == null ? null : 'plan' }; };
const req = (c, k) => { const n = needOf(c, k); return CONFIRMED_STAGES.includes(n.stage) && n.value === 'required'; };
const wanted = (c, k) => { const n = needOf(c, k); return n.value === 'required' || n.value === 'preferred'; };

/* ── the client, before any caregiver: incomplete, flagged, or ready to match ── */
function clientState(c){
  c = c || {};
  if (NOT_MATCHED_PAYERS.includes(String(c.payer || '').toLowerCase())) return { status: 'not_matched', message: 'CDS and ILW attendants are the consumer\'s own employees: not matched here.' };
  const medicaid = String(c.payer || '').toLowerCase() === 'medicaid';
  if (medicaid) {
    const apc = SKILLS.filter(s => s.medicaid === 'apc' && wanted(c, s.key));
    if (apc.length || (c.advanced_tasks || []).length) return { status: 'flagged', message: 'Flagged for review: ' + [...apc.map(s => s.label), ...(c.advanced_tasks || [])].join(', ') + ' is advanced personal care, which we do not provide for Medicaid clients.' };
    const mmac = SKILLS.filter(s => s.medicaid === 'mmac' && wanted(c, s.key));
    if (mmac.length) return { status: 'flagged', message: 'Flagged for review: ' + mmac.map(s => s.label).join(', ') + ' for a Medicaid client waits on MMAC (task R).' };
  } else if ((c.advanced_tasks || []).length) return { status: 'flagged', message: 'Flagged for review: ' + c.advanced_tasks.join(', ') + ' is not a service we offer.' };
  const unconfirmed = SKILLS.filter(s => !CONFIRMED_STAGES.includes(needOf(c, s.key).stage) || needOf(c, s.key).value == null);
  if (!c.plan_current) return { status: 'incomplete', message: 'Matching requirements incomplete: the care plan is not current.', unconfirmed: unconfirmed.map(s => s.key) };
  if (unconfirmed.length) return { status: 'incomplete', message: 'Matching requirements incomplete: ' + unconfirmed.length + ' of ' + SKILLS.length + ' needs not confirmed.', unconfirmed: unconfirmed.map(s => s.key) };
  return { status: 'ok', message: '' };
}
/* the level the client's confirmed required needs call for, and the level on their record */
function levelNeeded(c){ let l = Number(c.level) || 1; SKILLS.forEach(s => { if (req(c, s.key)) l = Math.max(l, s.level); }); return l; }

/* ── one caregiver against one client: the six checks, in order ── */
function evaluate(client, cg, opts){
  client = client || {}; cg = cg || {}; opts = opts || {};
  const cs = opts.clientState || clientState(client);
  const out = { caregiver: cg.name || cg.axiscare_id || '', group: 'ready', reason: '', steps: [], warnings: [], ranks: [] };
  const no = (why) => { out.group = 'not_for_visit'; out.reason = why; return out; };
  /* 1. the client */
  if (cs.status === 'not_matched' || cs.status === 'flagged') return no(cs.message);
  /* 2. cleared to work */
  if (!cg.cleared) return no('Not cleared to work: ' + (cg.cleared_reason || 'Approve to Work or a required check is not complete'));
  /* 3. the approved level */
  const need = levelNeeded(client), have = Number(cg.level) || 1;
  if (have < need) return no('Approved level ' + have + '; this client needs Level ' + need);
  /* 4. every required need has a verified skill (or the one missing step is named) */
  const sk = cg.skills || {};
  for (const s of SKILLS) {
    if (!req(client, s.key)) continue;
    const e = sk[s.key] || { standing: 'none' };
    if (s.key === 'dementia_care' && !(cg.training || {}).dementia) return no('Dementia training not complete');
    if (s.key === 'transportation' && cg.cleared_to_drive === false) return no('Not cleared to drive clients');
    if (s.key === 'transportation' && cg.cleared_to_drive !== true) out.steps.push({ skill: s.key, why: 'Driving: cleared to drive is not recorded yet', action: 'Record cleared to drive' });
    if ((cg.restrictions || []).includes(s.key)) return no(s.label + ': not at this time');
    const needsEvidence = s.level >= 2 && !['bathing', 'dressing_grooming', 'toileting', 'feeding', 'walking_wheelchair', 'transfers_gait_belt'].includes(s.key) || s.checkFirst || (s.key === 'dementia_care' && req(client, s.key) && client.dementia_experience_required);
    if (needsEvidence && !VERIFIED.includes(e.standing)) {
      if (['self_reported', 'supported'].includes(e.standing)) out.steps.push({ skill: s.key, why: s.label + ': says yes, not yet confirmed', action: 'Request a reference' });
      else if (e.standing === 'questioned') out.steps.push({ skill: s.key, why: s.label + ': a reference did not see it; talk it through', action: 'Talk it through, then request a reference' });
      else return no(s.label + ': no experience on record');
    }
    if (e.refresher) out.steps.push({ skill: s.key, why: s.label + ': wants a refresher first', action: 'Book a refresher with the PRN CNA Team' });
    if (s.key === 'hoyer_lift' && client.lift_type && VERIFIED.includes(e.standing) && (e.lift_types || []).length && !(e.lift_types || []).includes(client.lift_type))
      out.steps.push({ skill: s.key, why: 'Lift: confirmed on ' + e.lift_types.join(', ') + ', not on ' + client.lift_type, action: 'Request a reference or a refresher' });
    if (s.key === 'two_person_transfers') out.warnings.push('Two-person transfer: a second caregiver must be on the visit');
  }
  /* 5. nothing rules them out */
  if ((client.dnr_axiscare_ids || []).map(String).includes(String(cg.axiscare_id || ''))) return no('Do Not Return for this client');
  const f = client.facts || {}, w = cg.willing || {};
  for (const [k, label] of [['cats', 'cats'], ['dogs', 'dogs'], ['smoking', 'someone who smokes']]) if (f[k] === true && w[k] === 'not_now') return no('Not at this time: a home with ' + label);
  if (f.gender && f.gender.strength === 'require' && cg.gender && cg.gender !== f.gender.value) return no('The client requires a ' + f.gender.value + ' caregiver');
  const sp = ['none', 'basic', 'conversational', 'fluent'].indexOf(cg.spanish || 'none');
  if (f.spanish === 'require' && sp < 2) return no('The client requires Spanish (conversational or better)');
  for (const k of (cg.restrictions || [])) if (req(client, k)) return no(lab(k) + ': not at this time');
  /* 6. actually free */
  const a = cg.availability || {};
  if (a.free === false) return no(a.reason || 'Not free for this visit');
  if (a.over_target) out.warnings.push('Over their target hours this week');
  /* the group: steps make "Needs one more step"; an incomplete client caps everyone at "Likely fit" */
  if (out.steps.length) { out.group = 'one_more_step'; out.reason = out.steps[0].why; }
  if (cs.status === 'incomplete') { out.group = out.group === 'ready' ? 'likely_fit' : out.group; out.warnings.unshift(cs.message); }
  /* ranking inside the group only: preferences met, strengths */
  if (f.gender && f.gender.strength === 'prefer' && cg.gender === f.gender.value) out.ranks.push('Preferred: ' + f.gender.value + ' caregiver');
  if (f.spanish === 'prefer' && sp >= 2) out.ranks.push('Preferred: speaks Spanish');
  SKILLS.forEach(s => { if (wanted(client, s.key) && VERIFIED.includes((sk[s.key] || {}).standing)) out.ranks.push('Confirmed: ' + s.label); });
  (cg.strengths || []).forEach(x => out.ranks.push(x));
  return out;
}
const ORDER = ['ready', 'likely_fit', 'one_more_step', 'not_for_visit'];
/* ── every caregiver for one client: three groups (four while the client is incomplete), each person with one line ── */
function rankFor(client, caregivers){
  const cs = clientState(client);
  const rows = (caregivers || []).map(cg => evaluate(client, cg, { clientState: cs }));
  rows.sort((a, b) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group) || b.ranks.length - a.ranks.length);
  return { client: cs, rows, counts: ORDER.reduce((o, g) => { o[g] = rows.filter(r => r.group === g).length; return o; }, {}) };
}

/* ── adapters from what the Hub already keeps (nothing is upgraded on the way) ── */
/* the skills picture of Step 1 and the references (step1-experience.ts standings) */
function fromStep1(summary){
  const out = {};
  ((summary && summary.skills) || []).forEach(l => { out[l.key] = { standing: l.standing === 'confirmed' ? 'corroborated' : l.standing, refresher: !!l.refresher, lift_types: l.lifts || [] }; });
  return out;
}
/* today's skills record: "observed" is a coordinator's observation (corroborated); "attested" and "training" are not */
function fromOverlay(item){
  const out = {}, sk = (item && item.skills) || {};
  SKILLS.forEach(s => { if (!s.overlay) return; const e = sk[s.overlay]; if (!e || e.have !== 'yes') return;
    const standing = e.evidence === 'observed' ? 'corroborated' : 'self_reported';
    const prev = out[s.key]; if (!prev || (standing === 'corroborated' && prev.standing !== 'corroborated')) out[s.key] = { standing, source: 'skills record (' + (e.evidence || 'unlabelled') + ')' }; });
  return out;
}
/* the lead's checkboxes: intake answers only, never confirmed */
function fromLead(attrs){
  const needs = {}; const a = attrs || {};
  SKILLS.forEach(s => { const hit = s.lead.map(k => a[k]).filter(v => v != null && v !== ''); if (!hit.length) return;
    needs[s.key] = { value: hit.includes('yes') || hit.includes(true) ? 'required' : hit.includes('preferred') ? 'preferred' : 'no', stage: 'intake' }; });
  return needs;
}
/* the client's fact record (client_fact_current rows: kind, layer, value) as the rule's client parts; nothing is upgraded:
   the layer travels with each need, and only plan and current are ever enforced */
const LIFT = { full_body_sling: 'Full-body sling', sit_to_stand: 'Sit-to-stand', other: 'Other' };
const ADV = { catheter_change: 'Changing, inserting or removing a catheter', stoma_care: 'Stoma care', bowel_program: 'A bowel program', prescription_creams: 'Prescription creams', nurse_set_medication: 'Medication help set up by a nurse', passive_range_of_motion: 'Passive range of motion' };
function fromFacts(rows){
  const out = { needs: {}, facts: {}, lift_type: null, advanced_tasks: [] }, pick = {};
  const rank = l => ['intake', 'assessment', 'plan', 'current'].indexOf(l);
  (rows || []).forEach(f => { if (!f || !f.kind) return; const was = pick[f.kind]; if (!was || rank(f.layer) > rank(was.layer)) pick[f.kind] = f; });
  SKILLS.forEach(s => { const f = pick['need_' + s.key]; if (f && ['required', 'preferred', 'no'].includes(f.value)) out.needs[s.key] = { value: f.value, stage: f.layer }; });
  const enforced = f => f && CONFIRMED_STAGES.includes(f.layer);
  ['cats', 'dogs', 'smoking'].forEach(k => { const f = pick['home_' + k]; if (enforced(f)) out.facts[k] = f.value === 'yes'; });
  const g = pick.pref_caregiver_gender; if (enforced(g) && /^(female|male)_(required|preferred)$/.test(g.value)) { const [v, st] = g.value.split('_'); out.facts.gender = { value: v, strength: st === 'required' ? 'require' : 'prefer' }; }
  const sp = pick.need_spanish; if (enforced(sp) && sp.value !== 'no') out.facts.spanish = sp.value === 'required' ? 'require' : 'prefer';
  const lt = pick.need_lift_type; if (enforced(lt)) out.lift_type = LIFT[lt.value] || null;
  const at = pick.need_advanced_tasks; if (enforced(at) && Array.isArray(at.value)) out.advanced_tasks = at.value.map(k => ADV[k] || k);
  return out;
}
/* today's skills record item: willingness (ok_cats and the like: "no" = not at this time) and Spanish */
function overlayFacts(item){
  const sk = (item && item.skills) || {}, willing = {};
  ['cats', 'dogs', 'smoking'].forEach(k => { const e = sk['ok_' + k]; if (e && e.have === 'no') willing[k] = 'not_now'; });
  const sp = String((item && item.spanish_ability) || '').toLowerCase();
  return { willing, spanish: ['none', 'basic', 'conversational', 'fluent'].includes(sp) ? sp : 'none' };
}
/* AxisCare's caregiver gender ('F', 'M', 'Female', ...) */
const axisGender = g => { const x = String(g || '').trim().toUpperCase(); return x.startsWith('F') ? 'female' : x.startsWith('M') ? 'male' : null; };
const api = { VERSION, SKILLS, VERIFIED, clientState, levelNeeded, evaluate, rankFor, fromStep1, fromOverlay, fromLead, fromFacts, overlayFacts, axisGender };
root.CCMatch = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
