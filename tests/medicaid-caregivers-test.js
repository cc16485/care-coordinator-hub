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

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
