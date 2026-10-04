/* node tests/applicant-links-hub-test.js
   Private applicant links (2026-10-04, Samantha "yes to all"): the Hub's Start link button and the orientation invite
   ask the Hub's server for a private link (applicant-link mint) and never build one with the person's details. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8');
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error('not found: ' + a); return src.slice(i, j); };
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };
const code = cut('async function appLinkMint(', 'function offerCopyLink(') + cut('function bookingSessionsParam(){', 'function buildInviteMsg(');
function world(answer) {
  const calls = [], els = {};
  const el = (id) => els[id] || (els[id] = { id, innerHTML: '', textContent: '', style: {} });
  const ctx = { console, JSON, String, Number, Date, Object, Array, Error, encodeURIComponent, btoa: (s) => Buffer.from(s, 'binary').toString('base64'), parseInt,
    OFFERS: [{ id: 'b3f0c2aa-1111-4222-8333-444455556666', first_name: 'Ben', last_name: 'B', phone: '417-555-0111', email: 'ben@x.com' }],
    orientSessions: [{ id: 3, date: '2099-01-01', time: '10:00', capacity: '5', bookings: [] }], getOrientDuration: () => 2, safeIsTmp: (id) => typeof id === 'number' && id < 0,
    document: { getElementById: el },
    sb: { functions: { invoke: async (name, o) => { calls.push([name, o.body]); return answer(o.body); } } } };
  vm.createContext(ctx); vm.runInContext(code + '\nthis.__x = { offerStartLink, buildBookingUrl, bookingSessionsParam };', ctx);
  return { X: ctx.__x, calls, els, el };
}
const OK = (b) => ({ data: { ok: true, url: b.kind === 'start' ? 'https://cc.mo-care.com/start.html?o=' + b.offer_id + '&e=1999999999&t=' + 'A'.repeat(43) : 'https://sc.mo-care.com/orientation-booking.html?sessions=x&c=' + b.candidate_id + '&e=1&t=' + 'A'.repeat(43) }, error: null });
(async () => {
  let W = world(OK); W.el('sl_b3f0c2aa-1111-4222-8333-444455556666');
  await W.X.offerStartLink('b3f0c2aa-1111-4222-8333-444455556666');
  const box = W.els['sl_b3f0c2aa-1111-4222-8333-444455556666'].innerHTML;
  ck('Start link: asks the server for a private link (applicant-link mint, the offer number)', W.calls.length === 1 && W.calls[0][0] === 'applicant-link' && W.calls[0][1].action === 'mint' && W.calls[0][1].kind === 'start', W.calls);
  ck('...the link shown, texted and emailed carries no name, phone or email', /start\.html\?o=b3f0/.test(box) && !/first=|last=|phone=|email=/.test(box.replace(/mailto:[^?]+\?/, '').replace(/sms:[^&]+&/, '')), box);
  ck('...and says it is private and runs out in 30 days', /private: works for 30 days, carries no personal details/.test(box));
  W = world(() => ({ data: { ok: false, error: 'Sign in first.' }, error: { message: 'non-2xx' } })); W.el('sl_b3f0c2aa-1111-4222-8333-444455556666');
  await W.X.offerStartLink('b3f0c2aa-1111-4222-8333-444455556666');
  ck('the link can\'t be made: it says so (never falls back to a link with details)', /could not be made \(Sign in first\.\)/.test(W.els['sl_b3f0c2aa-1111-4222-8333-444455556666'].innerHTML) && !/start\.html/.test(W.els['sl_b3f0c2aa-1111-4222-8333-444455556666'].innerHTML));
  W = world(OK);
  const u = await W.X.buildBookingUrl({ id: 17, first: 'Ava', phone: '4175550199', email: 'a@x.com' });
  ck('orientation invite: a private link for that candidate with the open sessions, nothing personal', W.calls[0][1].kind === 'orient' && W.calls[0][1].candidate_id === '17' && W.calls[0][1].sessions === W.X.bookingSessionsParam() && /c=17/.test(u) && !/first=|phone=|email=/.test(u), [W.calls, u]);
  let err = ''; try { await W.X.buildBookingUrl({ id: -3 }); } catch (e) { err = e.message; }
  ck('someone still being saved (a temporary number): no link yet, and it says why', /still being saved/.test(err) && W.calls.length === 1);
  ck('the engine builds no link with personal details anywhere', !/start\.html\?' \+ q\.toString\(\)|&first=\$\{encodeURIComponent\(c\.first\)\}/.test(src));
  ck('no em dash in the new code', !/—/.test(code));
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
