/* Stuck in Step 1 on the Onboarding row (Samantha 2026-11-02: "Show the stuck Step 1 right on the Onboarding row: red Stuck,
   how many days, and a Call button, using the card that already exists"). FAKE people only. node tests/step1-stuck-row-test.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ENG = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
const cut = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error('cannot find ' + a); return src.slice(i, j); };
let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('PASS ', m); } else { fail++; console.log('FAIL ', m, d === undefined ? '' : JSON.stringify(d).slice(0, 400)); } };
const DAY = 86400000, now = Date.now();
const x = { String, Date, Math, Number, JSON, Object, console,
  bgrEsc: s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/'/g,'&#39;').replace(/"/g,'&quot;'),
  ocAttrs: (p, o) => ' href="#" data-oc-phone="' + p + '"' + (o && o.email ? ' data-oc-email="' + o.email + '"' : ''),
  DATA: { ops_items: [] }, OFFERS: [], caregivers: [] };
vm.createContext(x);
vm.runInContext(cut(ENG, 'function obFmtPhone(ph){', 'function obRefCellHTML(').replace('function obFmtPhone', 'var obFmtPhone = function') , x);
vm.runInContext(cut(ENG, 'function ckdLaneHTML(c, nx){', '/* ── ONBOARDING: one list'), x);
vm.runInContext(cut(ENG, '/* STUCK IN STEP 1', 'const ckdDay = iso =>'), x);
vm.runInContext('function ckdRosterNext(r){ return { text:"Step 1 is not finished. Waiting on Kim to sign the rest of their Step 1 forms.", label:"Open card", on:"CRX.openSide(1)", wait:true }; } function ckdRosterFor(){ return null; }', x);
const j = { journey_id: 'j-1', offer_id: 'o-1', name: 'Kim Test' };
const p = { j, stop: 0, name: 'Kim Test' };

let acts = x.ckdActsFor(p);
ok(!acts[0].warn && /Waiting on Kim/.test(acts[0].text), 'no open card: the row is the usual quiet wait', acts[0]);

x.DATA.ops_items = [{ id: 'cj_step1stall_j-1', kind: 'step1_stalled', status: 'open', created_at: new Date(now - 12 * DAY).toISOString() }];
x.OFFERS = [{ id: 'o-1', phone: '417-555-0142', email: 'kim@example.com', step1_sent_at: new Date(now - 18 * DAY - 3600e3).toISOString() }];
acts = x.ckdActsFor(p);
ok(acts[0].warn === true, 'an open stall card makes the row red (warn, so the stop reads "Stuck: Step 1")');
ok(/^Stuck in Step 1 for 18 days \(link sent [A-Z][a-z]{2} \d+\)\. The reminders did not do it: call Kim and help them finish\.$/.test(acts[0].text), 'how many days, counted from when the Step 1 link went', acts[0].text);
const h = x.ckdLaneHTML({}, acts[0]);
ok(/ckd-warn/.test(h) && /<a class="ckd-go" href="#" data-oc-phone="\+14175550142" data-oc-email="kim@example\.com">Call \(417\) 555-0142<\/a>/.test(h), 'a Call button from the office line (ocAttrs), never a bare tel: link', h);
ok(!/tel:/.test(h), 'no tel: link');
ok(acts.some(a => a.label === 'Take off'), 'Take off is still there');

x.DATA.ops_items[0].status = 'done';
ok(!x.ckdActsFor(p)[0].warn, 'the card closed (Step 1 finished or offer closed): the row goes back to normal');

x.DATA.ops_items[0].status = 'open'; x.OFFERS = [{ id: 'o-1', step1_sent_at: new Date(now - 1 * DAY - 60e3).toISOString() }];
acts = x.ckdActsFor(p);
ok(/for 1 day /.test(acts[0].text) && /No phone number on their offer\./.test(acts[0].text) && acts[0].label === 'Open card' && !acts[0].call, 'no phone on the offer: says so, and offers the card instead', acts[0]);

x.OFFERS = [];
acts = x.ckdActsFor(p);
ok(/for 12 days/.test(acts[0].text) && !/No phone/.test(acts[0].text), 'offers not loaded yet: days from the card, and no false "no phone"', acts[0].text);

ok(/x\.status !== 'done' && x\.status !== 'resolved'/.test(ENG) && /'cj_step1stall_' \+ j\.journey_id/.test(ENG), 'reads the existing card (cj_step1stall_<journey>), nothing new is stored');
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
