/* Who may approve, in the hiring screens (Samantha 2026-11-02: "Keep the list as it is ... fix the wording to say a person on
   the Approve to Work list"). The Approve to Work and Approve to Advance lists are set on the Admin page and are not only
   Samantha and Zachary, so the screens name the list, never two people.  node tests/approve-list-wording-test.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('PASS ', m); } else { fail++; console.log('FAIL ', m); } };
const CRX = read('caregiver-readiness.js'), OPR = read('orient-progress.js'), ENG = read('caregivers-engine.js');
const lines = s => s.split('\n').filter(l => /Samantha or Zachary/.test(l) && /Approve to (Work|Advance)|approve them to work|approved? to work|go for Step 2|before Step 2|ready_for_final|const whose/i.test(l));
ok(!lines(CRX).length, 'readiness card: no Approve to Work line names Samantha or Zachary');
ok(!lines(OPR).length, 'Orientation tab Finish line: names the list');
ok(!lines(ENG).length, 'Onboarding: the advance, approve and owner lines name the list');
ok(/Waiting on a person on the Approve to Work list or a care coordinator to approve\./.test(ENG), 'the Approve to Work waiting line names care coordinators too (11-11)');
ok(/coSign \? 'an owner or a coordinator' : n\.key === 'cg\.approve\.work' \? 'a person on the Approve to Work list or a care coordinator' : n\.key === 'cg\.approve\.advance' \? 'a person on the Approve to Advance list' : 'an owner'/.test(ENG), 'the next step owner: Approve to Work names its list and care coordinators; the company signature says an owner or a coordinator (11-11)');
ok(/const mine = !n\.owner \|\| coSign \|\| ccWork/.test(ENG) && /' \(an owner or a coordinator\)'/.test(ENG) && /An owner or a coordinator signs for Caring Companions here\./.test(read('step1.html')) && !/Approve to Work list signs for Caring/.test(read('step1.html')), '11-11: the company signature is a coordinator\'s own step in Onboarding and on the Step 1 screen');
ok(/caregiver-readiness\.js\?v=12/.test(read('index.html')) && /orient-progress\.js\?v=13/.test(read('index.html')), 'the page loads the new copies');
ok(/Waiting on a person on the Approve to Work list or a care coordinator\./.test(ENG) && /Waiting for a person on the Approve to Work list or a care coordinator\./.test(OPR) && /Approve to Work list or a care coordinator may approve/.test(CRX), '11-11: care coordinators named for Approve to Work in Onboarding, the Finish line and the readiness card');
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
