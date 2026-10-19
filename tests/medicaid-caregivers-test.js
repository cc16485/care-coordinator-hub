/* node tests/medicaid-caregivers-test.js
   Orientation only (Samantha, 2026-10-15), with her 2026-10-19 exception: caregivers who have worked with a Medicaid
   (IHS/ADW) client keep the old IHS training rules until 2026-11-16, and the office can always see who they are and
   their training proof. Runs the one rules file the Hub and the server both run. */
const RealDate = Date;
function at(iso, fn){
  const fixed = new RealDate(iso).getTime();
  global.Date = class extends RealDate { constructor(...a){ super(...(a.length ? a : [fixed])); } static now(){ return fixed; } };
  try { return fn(); } finally { global.Date = RealDate; }
}
require('../eligibility-rules.js');
const E = globalThis.CCElig;
let pass = 0, fail = 0;
const ck = (name, ok, extra) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (ok || extra === undefined ? '' : '  ' + JSON.stringify(extra))); };
const codes = e => e.reasons.concat(e.tasks).map(r => r.code);

// a clean, working caregiver as of 2026-11-10 (everything recurring is fresh)
const base = { first:'Test', last:'Person', hire_date:'2025-01-10', orient_date:'2025-01-08', th_synced:true,
  oig_date:'2026-11-01', edl_date:'2026-10-20', fcsr_date:'2026-06-01', fcsr_reg_date:'2025-01-12',
  bg_status:'Clear', casenet_status:'Clear', fp_status:'Clear', ref_status:'Ready for Orientation' };
const cg = o => Object.assign({}, base, o);
const ON = '2026-11-10T15:00:00Z', OFF = '2026-11-20T15:00:00Z';

ck('the day is 2026-11-16', E.MEDICAID_TRAINING_UNTIL === '2026-11-16');
ck('not a Medicaid caregiver by default', !E.medicaidCaregiver(cg({})));
ck('AxisCare visit with a Medicaid client marks them', E.medicaidCaregiver(cg({ medicaid_clients:[{ client_id:'7', client:'A B', first_date:'2026-08-20', last_date:'2026-10-01' }] })));
ck('the hand tick marks them', E.medicaidCaregiver(cg({ medicaid_hand:'yes' })));
ck('an empty list does not', !E.medicaidCaregiver(cg({ medicaid_clients:[] })));

// everyone else: orientation only, today and after
const plain = cg({ alz_date:'', ojt_date:'', ojt_online:'', annual_date:'' });
ck('not Medicaid, no dementia / OJT / annual: nothing raised', at(ON, () => codes(E.eligibility(plain))).every(c => !['alz','ojt','ojt_overdue','annual_training','annual_hours'].includes(c)), at(ON, () => codes(E.eligibility(plain))));
ck('not Medicaid: missing orientation still blocks', at(ON, () => E.eligibility(cg({ hire_date:'2026-11-05', orient_date:'', th_synced:false })).state) === 'not_eligible');

// Medicaid caregiver before 11-16: the old rules
const med = o => cg(Object.assign({ medicaid_hand:'yes' }, o));
const before = (o) => at(ON, () => E.eligibility(med(o)));
ck('before: no dementia training blocks', before({ alz_date:'', ojt_date:'2025-01-20', ojt_online:'2025-01-20', ojt_signed:'yes', annual_date:'2026-01-05', annual_hrs:'5' }).state === 'not_eligible');
ck('before: OJT past 30 days is a lapse', codes(before({ alz_date:'2025-01-08', ojt_date:'', ojt_online:'', annual_date:'2026-01-05', annual_hrs:'5' })).includes('ojt_overdue'));
ck('before: annual in-service over a year old is a lapse', codes(before({ alz_date:'2025-01-08', ojt_date:'2025-01-20', ojt_online:'2025-01-20', ojt_signed:'yes', annual_date:'2025-09-01' })).includes('annual_training'));
ck('before: 3 of 5 hours is a task, not a lapse', (() => { const e = before({ alz_date:'2025-01-08', ojt_date:'2025-01-20', ojt_online:'2025-01-20', ojt_signed:'yes', annual_date:'2026-03-01', annual_hrs:'3' }); return e.tasks.some(t => t.code === 'annual_hours') && e.state === 'eligible'; })());
ck('before: everything done is eligible', before({ alz_date:'2025-01-08', ojt_date:'2025-01-20', ojt_online:'2025-01-20', ojt_signed:'yes', annual_date:'2026-03-01', annual_hrs:'5' }).state === 'eligible');
ck('before: the reasons say Medicaid', before({ alz_date:'' }).reasons.some(r => r.medicaid && /Medicaid/.test(r.why)));

// Medicaid caregiver from 11-16: nothing blocks, the status is still there for the audit list
const after = at(OFF, () => E.eligibility(med({ alz_date:'', ojt_date:'', ojt_online:'', annual_date:'' })));
ck('from 11-16: nothing raised for the same person', codes(after).every(c => !['alz','ojt','ojt_overdue','annual_training','annual_hours'].includes(c)), codes(after));
ck('from 11-16: still a Medicaid caregiver with an IHS status', after.facts.ts.ihs.medicaid === true && after.facts.ts.ihs.applies === false && after.facts.ts.ihs.alzDone === false);
ck('Central time decides: Nov 15 11:59pm still applies', at('2026-11-16T05:59:00Z', () => E.medicaidTrainingApplies(med({}))) === true);
ck('Central time decides: Nov 16 12:00am off', at('2026-11-16T06:00:00Z', () => E.medicaidTrainingApplies(med({}))) === false);

// PROOF (her rule 2026-10-19): every required training with its certificate, for good, past employees too
const full = { alz_date:'2025-01-08', alz_proof:'training/1/alz.pdf', ojt_date:'2025-01-20', ojt_signed:'yes', ojt_proof:'training/1/ojt.pdf',
  ojt_online:'2025-01-20', ojt_online_proof:'training/1/oo.pdf', orient_proof:'training/1/or.pdf', annual_date:'2026-03-01', annual_hrs:'5', annual_proof:'training/1/an.pdf' };
const P = (o, when) => at(when || ON, () => E.medicaidProof(med(Object.assign({}, full, o))));
ck('proof: not a Medicaid caregiver, nothing asked', E.medicaidProof(cg({})).medicaid === false);
ck('proof: every training with its certificate is complete', P({}).complete === true, P({}).missing);
ck('proof: a date without the certificate is a gap', P({ alz_proof:'' }).missing.some(m => /Dementia training: no certificate/.test(m)), P({ alz_proof:'' }).missing);
ck('proof: orientation needs its certificate too', P({ orient_proof:'' }).missing.some(m => /Agency Orientation: no certificate/.test(m)));
ck('proof: in-person OJT must be signed off', P({ ojt_signed:'no' }).missing.some(m => /in person: not signed off/.test(m)));
ck('proof: online OJT counts on its own', P({ ojt_online:'' }).missing.some(m => /online: not on record/.test(m)));
ck('proof: still a gap after 11-16 (permanent)', P({ alz_proof:'' }, OFF).missing.some(m => /no certificate/.test(m)));
ck('proof: a past employee is still checked', P({ active:false, alz_proof:'' }).complete === false);
// yearly in-service only for the years they served Medicaid
const mc = (last) => ({ medicaid_hand:'', medicaid_clients:[{ client_id:'1', client:'A', first_date:'2025-02-01', last_date:last }] });
const yr = (o, when) => at(when || ON, () => E.medicaidProof(cg(Object.assign({}, full, o))).items.find(i => i.key === 'annual'));
ck('in-service: Medicaid work only in year one, not due', yr(Object.assign(mc('2025-06-01'), { annual_date:'', annual_proof:'' })).status === 'not_due');
ck('in-service: served past year one with none on file, a gap', yr(Object.assign(mc('2026-09-01'), { annual_date:'', annual_proof:'' })).status === 'no_date');
ck('in-service: the latest covers the last Medicaid year, ok', yr(mc('2026-09-01')).status === 'ok');
ck('in-service: the latest is older than the last Medicaid year, out of date', yr(Object.assign(mc('2026-09-01'), { annual_date:'2025-06-01' })).status === 'too_old');
ck('in-service: after Medicaid ends no new year is required (2027, last visit Sep 2026, in-service Mar 2026)', yr(mc('2026-09-01'), '2027-08-01T15:00:00Z').status === 'ok');
ck('in-service: 3 of 5 hours is a gap', yr(Object.assign(mc('2026-09-01'), { annual_hrs:'3' })).status === 'short_hours');
ck('last Medicaid day never passes 11-15', at('2027-01-10T15:00:00Z', () => E.medicaidLastDay(med({}))) === '2026-11-15');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
