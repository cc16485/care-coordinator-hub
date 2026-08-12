/* The fixtures BOTH paths are tested against. If the browser engine and the
   server evaluator ever disagree, one of them fails these. */
const iso = d => new Date(Date.now() + d*86400000).toISOString().slice(0,10);
const CLEAN = { r1s:"Positive", r2s:"Positive", oig:"CLEAR", edl:"Clear", fcsr:"Clear",
  oig_date:iso(-10), edl_date:iso(-10), fcsr_date:iso(-10), fcsr_reg_date:iso(-40),
  orient_date:iso(-45), alz_date:iso(-45), hire_date:iso(-50),
  ojt_date:iso(-40), ojt_signed:"yes", ojt_online:iso(-40), annual_date:iso(-10),
  supv_date:iso(-10), perf_date:iso(-10) };
const K = o => Object.assign({}, CLEAN, o);
const FIXTURES = [
  ["clean caregiver",              K({}),                                        "eligible"],
  ["2 Positive + 1 Negative",      K({r3s:"Negative"}),                          "not_eligible"],
  ["Conditional, no decision",     K({r3s:"Conditional"}),                       "not_eligible"],
  ["Conditional + decision",       K({r3s:"Conditional",ref_decision:{outcome:"proceed",refs:"Positive|Positive|Conditional|"}}), "eligible"],
  ["decision then Negative",       K({r3s:"Conditional",r4s:"Negative",ref_decision:{outcome:"proceed",refs:"Positive|Positive|Conditional|"}}), "not_eligible"],
  ["out-of-state no fingerprints", K({oos:"yes"}),                               "not_eligible"],
  ["in-state no fingerprints",     K({}),                                        "eligible"],
  ["orientation but no ALZ",       K({alz_date:""}),                             "not_eligible"],
  ["hired 3d, OJT pending",        K({hire_date:iso(-3),ojt_date:"",ojt_online:"",ojt_signed:"",orient_date:iso(-2),alz_date:iso(-2),fcsr_reg_date:iso(-1)}), "eligible"],
  ["OJT past 30 days",             K({hire_date:iso(-40),ojt_date:"",ojt_online:"",ojt_signed:""}), "lapsed"],
  ["OIG 91 days old",              K({oig_date:iso(-91)}),                       "lapsed"],
  ["perf review 400d overdue",     K({perf_date:iso(-400)}),                     "eligible"],
  ["supv visit 400d overdue",      K({supv_date:iso(-400)}),                     "eligible"],
  ["hired 10mo no annual",         K({hire_date:iso(-300),annual_date:""}),      "eligible"],
  ["hired 13mo no annual",         K({hire_date:iso(-400),annual_date:"",ojt_date:iso(-390),ojt_online:iso(-390)}), "lapsed"],
  ["FCSR registration overdue",    K({hire_date:iso(-40),fcsr_reg_date:""}),     "eligible"],
];
if (typeof module !== 'undefined') module.exports = { FIXTURES, K, iso, CLEAN };
if (typeof globalThis !== 'undefined') globalThis.CCEligFixtures = { FIXTURES, K, iso, CLEAN };

/* EMPLOYED-CAREGIVER fixtures. These records deliberately carry NO candidate
   fields — no r1s..r4s, no candidate oig/edl/fcsr strings — because a real
   caregiver record does not have them. Every one of these was Not Eligible
   before the formulas were split. */
const CG = { first:"Real", last:"Caregiver", hire_date:iso(-800),
  orient_date:iso(-790), alz_date:iso(-790),
  ojt_date:iso(-780), ojt_signed:"yes", ojt_online:iso(-780),
  annual_date:iso(-30), oig_date:iso(-10), edl_date:iso(-10), fcsr_date:iso(-100),
  supv_date:iso(-10), perf_date:iso(-10) };
const G = o => Object.assign({}, CG, o);
const CG_FIXTURES = [
  ["long-tenured, current compliance",   G({}),                              "eligible"],
  ["OIG overdue (91 days)",              G({oig_date:iso(-91)}),             "lapsed"],
  ["EDL overdue",                        G({edl_date:iso(-91)}),             "lapsed"],
  ["FCSR overdue (annual)",              G({fcsr_date:iso(-400)}),           "lapsed"],
  ["annual training overdue",            G({annual_date:iso(-400)}),         "lapsed"],
  ["performance review overdue",         G({perf_date:iso(-400)}),           "eligible"],
  ["supervisory visit overdue",          G({supv_date:iso(-400)}),           "eligible"],
  ["both management items overdue",      G({perf_date:iso(-400),supv_date:iso(-400)}), "eligible"],
  ["OJT overdue after valid pre-work",   G({hire_date:iso(-40),ojt_date:"",ojt_online:"",ojt_signed:"",orient_date:iso(-38),alz_date:iso(-38),annual_date:""}), "lapsed"],
  ["new caregiver, no orientation",      G({hire_date:iso(-5),orient_date:"",alz_date:"",ojt_date:"",ojt_online:"",ojt_signed:"",annual_date:"",fcsr_date:iso(-5),oig_date:iso(-5),edl_date:iso(-5)}), "not_eligible"],
  ["status override says Overdue",       G({oig_status:"Overdue"}),          "lapsed"],
  ["status override says Current",       G({oig_date:iso(-91),oig_status:"Current"}), "eligible"],
];
if (typeof module !== 'undefined') module.exports.CG_FIXTURES = CG_FIXTURES;
if (typeof globalThis !== 'undefined') globalThis.CCEligFixtures.CG_FIXTURES = CG_FIXTURES;
