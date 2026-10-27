/* node tests/call-learned-test.js
   Learned on this call, step 1 (1050, Samantha 2026-10-22: "dont lose any info"). The pure comparison in call-learned.js,
   with the REAL lead-rules.js (LeadRules.toForm), on a made-up family: Linda calling about her mother Dorothy, three calls. */
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 700))); };
const ctx = { console, Date, JSON, Math, Set, Map, Object, Array, String, Number, RegExp, Intl };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['lead-rules.js', 'call-learned.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
const CL = ctx.CallLearned;
const lead = { id: 'L1', first_name: 'Linda', last_name: 'Morris', relationship: 'Daughter', client_first_name: 'Dorothy', client_city: 'Republic', needs: ['housekeeping'],
  schedule: { days: ['Mon', 'Wed', 'Fri'], times: 'afternoons', hours_per_week: '12' }, number_of_hours: '12', funding_source: 'private', desired_start: { kind: 'asap' },
  call_profile: { facts: { living_situation: 'alone' }, people: [{ name: 'Biscuit the dog' }] }, client_attributes: { dogs: 'yes' } };
const reading = { prefill: { first_name: 'Linda', relationship: 'daughter', client_first_name: 'Dorothy', client_city: 'Republic', needs: ['housekeeping', 'personalCare'], safety: ['fallRisk'],
    schedule_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], times_needed: '8 am to noon', number_of_hours: '20', funding_source: 'private', desired_start_kind: 'by_date', desired_start_date: '2026-11-03',
    physician_name: 'Dr. Patel', interest_notes: 'Linda called again; her mom fell in the shower.', phone: '+14175550148' },
  heard: ['first_name', 'relationship', 'client_first_name', 'client_city', 'needs', 'safety', 'schedule_days', 'times_needed', 'number_of_hours', 'funding_source', 'desired_start_kind', 'desired_start_date', 'physician_name', 'interest_notes', 'phone'],
  profile: { facts: { living_situation: 'alone', why_now: ['fall'] }, attributes: { dogs: 'yes', female_caregiver: 'preferred' }, people: [{ name: 'Mark Hayes', relationship: 'Son', note: 'pays the bills' }, { name: 'Linda', relationship: 'Daughter' }] },
  care_plan: { fields: { safety_concerns: 'Fell in the shower' }, narrative: 'From the call.', axiscare_tasks: [] }, medicaid_mentioned: false };
const it = CL.items(lead, reading);
const keys = a => a.map(x => x.key);
ck('new: an empty box the call filled (doctor)', keys(it.fresh).includes('physician_name'), it.fresh);
ck('new: ticks the lead does not have yet, only those ("adds personal care")', it.fresh.find(x => x.key === 'needs')?.words === 'adds personal care', it.fresh);
ck('new: a safety tick is marked Safety', it.fresh.find(x => x.key === 'safety')?.safety === true && it.fresh.find(x => x.key === 'safety').words === 'fall risk', it.fresh);
ck('new: days the lead lacks', it.fresh.find(x => x.key === 'schedule_days')?.words === 'adds Tue, Thu', it.fresh);
ck('changed: hours 12 then 20, with before and now', JSON.stringify(it.changed.find(x => x.key === 'number_of_hours')) === JSON.stringify({ key: 'number_of_hours', label: 'Hours a week', before: '12', now: '20' }), it.changed);
ck('changed: the start, "as soon as possible" then "by 2026-11-03"', it.changed.find(x => x.key === 'desired_start_kind')?.before === 'as soon as possible' && it.changed.find(x => x.key === 'desired_start_kind').now === 'by 2026-11-03', it.changed);
ck('changed: times (afternoons then mornings)', it.changed.find(x => x.key === 'times_needed')?.now === '8 am to noon', it.changed);
ck('same: what the lead already says is not offered again (case does not matter)', ['Who called', 'Client\'s first name', 'Town', 'How they will pay', 'Caller\'s first name'].every(l => it.same.includes(l)) && !keys(it.changed).includes('relationship'), it.same);
ck('the phone heard on a call is never offered', !keys(it.fresh).includes('phone') && !keys(it.changed).includes('phone'));
ck('also said: the call\'s notes, to go below the lead\'s', it.also.length === 1 && /fell in the shower/.test(it.also[0].text), it.also);
ck('Home & Life: a new fact (why now: a fall, Safety) and an unchanged one left alone', it.fresh.find(x => x.key === 'fact:why_now')?.words === 'a fall' && it.fresh.find(x => x.key === 'fact:why_now').safety === true && it.same.includes('Lives'), it.fresh);
ck('Home & Life: a new caregiver wish; the dog already known is not repeated', it.fresh.some(x => x.key === 'attr:female_caregiver' && /preferred/.test(x.words)) && !it.fresh.some(x => x.key === 'attr:dogs'), it.fresh);
ck('people: Mark is new; Linda (the caller) is not', it.people.length === 1 && it.people[0].name === 'Mark Hayes', it.people);
ck('the care plan draft parts are counted', it.plan === 2, it.plan);
ck('Medicaid flag carried', CL.items(lead, Object.assign({}, reading, { medicaid_mentioned: true })).medicaid === true);
const after = Object.assign({}, lead, { physician_name: 'Dr. Patel', number_of_hours: '20', needs: ['housekeeping', 'personalCare'] });
const it2 = CL.items(after, reading);
ck('once added, the same call shows those as already on the profile', !keys(it2.fresh).includes('physician_name') && !keys(it2.changed).includes('number_of_hours') && !keys(it2.fresh).includes('needs'), [it2.fresh, it2.changed]);
const empty = CL.items({ id: 'L9', first_name: '(phone lead)' }, { prefill: { first_name: 'Greg' }, heard: ['first_name'] });
ck('"(phone lead)" counts as empty: the heard name is new', empty.fresh[0]?.key === 'first_name' && empty.fresh[0].words === 'Greg', empty);
ck('no reading at all: nothing offered, no crash', (r => !r.fresh.length && !r.changed.length && !r.people.length)(CL.items(lead, null)));
const src = fs.readFileSync(path.join(__dirname, '..', 'call-learned.js'), 'utf8');
ck('no em dashes in anything it says', !/—/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')));
console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
