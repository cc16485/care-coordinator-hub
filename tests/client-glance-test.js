/* node tests/client-glance-test.js: client-glance.js, the client at a glance (Samantha 2026-10-29). One card for a client
   receiving care: born, address, phone, care level, payer, Care Coordinator, main contact, safety and what needs attention.
   AxisCare's answer wins; the lead's intake fills in; nothing is guessed. Leads and clients getting ready keep their Overview. */
const C = require('../client-glance.js');
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };
const f = (m, k) => m.facts.find(x => x.k === k);
const glance = { dob:'1939-04-12', address:'1420 E Cherry St, Springfield, MO 65802', phone:'(417) 555-0134', start_date:'2025-03-03',
  contact:{ name:'Susan', relationship:'Daughter', phone:'(417) 555-0190', from:'AxisCare' } };
const base = { stageK:'care', status:'Receiving care', ax:'297', name:'Dan Probstfield', glance, today:'2026-10-29',
  payer:'Private pay', cc:'Krystal', level:'<b>Level 2</b>', care:[{ tone:'bad', t:'Fall risk' }],
  due:[{ kind:'calloff', tone:'dim', label:'7 call-offs in 30 days', tab:'team' }, { kind:'checkin', tone:'warn', label:'no check-in yet', tab:'checkins' }] };
let m = C.model(base);
ck('a client receiving care gets the card', m.show);
ck('when care started; the name, status and AxisCare # are not repeated (the page title says them)', f(m, 'Care started').v === 'Mar 3, 2025' && !m.facts.some(x => /Dan|297|Receiving/.test(x.v)), m.facts);
ck('born with age (birthday not reached yet this year counts)', f(m, 'Born').v === 'Apr 12, 1939 (age 87)', f(m, 'Born'));
ck('address and phone from AxisCare', f(m, 'Address').v === glance.address && f(m, 'Phone').v === glance.phone && f(m, 'Phone').phone);
ck('care level, payer, Care Coordinator', f(m, 'Care level').v === '<b>Level 2</b>' && f(m, 'Pays by').v === 'Private pay' && f(m, 'Care Coordinator').v === 'Krystal');
ck('main contact names the relationship and carries the phone to call', f(m, 'Main contact').v === 'Susan (Daughter)' && f(m, 'Main contact').contact.phone === '(417) 555-0190');
ck('needs attention: the worst first', m.due[0].label === 'no check-in yet' && m.due[1].tone === 'dim');
ck('safety chips pass through', m.care.length === 1 && m.care[0].t === 'Fall risk');

m = C.model(Object.assign({}, base, { glance:null, glanceErr:'' }));
ck('while AxisCare is being read, blanks say so (never a guess)', f(m, 'Born').v === '' && f(m, 'Born').miss === 'reading AxisCare…' && !m.err);
m = C.model(Object.assign({}, base, { glance:null, glanceErr:'AxisCare answered 502' }));
ck('AxisCare could not be read: the card says so', m.err === 'AxisCare answered 502' && f(m, 'Address').miss === 'not in AxisCare');

const lead = { client_dob:'1940-12-01', client_address:'9 Elm St', client_city:'Nixa', client_phone:'4175550000', first_name:'Karen', last_name:'Lee', relationship:'Daughter', phone:'4175551234' };
m = C.model(Object.assign({}, base, { glance:{ dob:null, address:null, phone:null, start_date:null, contact:null }, lead }));
ck('AxisCare blank: the intake fills born, address, phone and the caller as main contact',
  f(m, 'Born').v === 'Dec 1, 1940 (age 85)' && f(m, 'Address').v === '9 Elm St, Nixa' && f(m, 'Phone').v === '(417) 555-0000' && f(m, 'Main contact').v === 'Karen Lee (Daughter)', m.facts);
m = C.model(Object.assign({}, base, { glance:{ contact:null }, lead:Object.assign({}, lead, { relationship:'Self' }) }));
ck('a client who called for themself is not their own main contact', f(m, 'Main contact').v === '' && f(m, 'Main contact').miss === 'none yet');
m = C.model(Object.assign({}, base, { glance:{}, census:{ start_date:'2024-01-05' } }));
ck('care started falls back to the AxisCare list', f(m, 'Care started').v === 'Jan 5, 2024', f(m, 'Care started'));

ck('a lead keeps its Overview', !C.model(Object.assign({}, base, { stageK:'talking' })).show);
ck('getting ready keeps its Overview', !C.model(Object.assign({}, base, { stageK:'ready' })).show);
ck('no AxisCare id: no card', !C.model(Object.assign({}, base, { ax:'' })).show);
m = C.model(Object.assign({}, base, { stageK:'past', status:'Past client' }));
ck('a past client gets the card', m.show);
ck('age: not yet their birthday', C.ageOn('1939-11-01', '2026-10-29') === 86 && C.ageOn('', '2026-10-29') === null);

console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
