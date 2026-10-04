/* node tests/orientation-link-test.js
   Remote orientation slice 1b (2026-10-01): "Welcome call done – send orientation link". The real wcAct /
   wcOrientCall / wcOrientMsg / wcOrientLink and the welcome-call guide, cut out of caregivers-engine.js and run against
   a fake welcome-call function and a fake Training Platform. Proves: the call is marked done FIRST, then Training is
   asked with the staff member's own Hub sign-in, the offer id and every phone/email the Hub has; each answer is said
   plainly; a failed "done" asks Training nothing; the retry button exists; the guide and the journey say the new step;
   no em dashes. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return src.slice(a, b); };
const code = [
  cut('const WC_MEET =', 'async function wcWho('),
  cut('function wcResult(', '/* The newest welcome call'),
  cut('function wcCard(', 'function renderWelcomeCalls('),
  cut('const WC_GUIDE =', 'async function wcNotes('),
  cut('async function wcAct(', 'function renderOrientReadyQueue('),
  cut('function cgRecordFromCandidate(', '// ── Promote / Close Out'),
].join('\n');

let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 700))); };

function world(opts = {}) {
  const log = [], alerts = [], fetches = [];
  const ctx = {
    console, Date, JSON, Promise, Set, String, Array, Object, Number, Error, RegExp, Intl,
    caregivers: [], cgId: 100, safeTmpId: (() => { let n = -1; return () => n--; })(), safeIsTmp: (id) => typeof id === 'number' && id < 0,   /* 421: temporary numbers until the database gives the real one */ obPrehireRefs: () => [], saveCaregivers: async () => true, localStorage: { setItem() {} },
    candidates: [{ id: 41, first: 'Ava', last: 'Applicant', phone: '417-555-0199', email: 'ava@x.com', offer_id: opts.noOffer ? null : 'offer-uuid-1' }],
    TRAINING_HUB_ANON: 'training-anon',
    window: { trainHubTok: async () => 'staff-hub-token', CGP2: opts.published ? { isLive: () => true, rowFor: () => ({}) } : { isLive: () => false, rowFor: () => null } },
    confirm: (m) => { log.push(['confirm', m]); return opts.confirm !== false; },
    alert: (m) => { alerts.push(m); },
    wcCall: async (b) => { log.push(['welcome-call', b.action]); if (opts.doneFails) throw new Error('could not save'); return {}; },
    wcLoad: async () => { log.push(['wcLoad']); },
    saveCandidates: async () => {}, cgpBtnHtml: () => '',
    fetch: async (url, o) => { fetches.push({ url, headers: o.headers, body: JSON.parse(o.body) }); log.push(['training']);
      if (opts.trainingDown) throw new Error('Failed to fetch');
      return { ok: true, status: 200, json: async () => opts.answer || { status: 'sent', sms: true, email: true, not_sent: [], offer_linked: true, offer_note: '' } }; },
  };
  ctx.window.CGP2 && (ctx.CGP2 = ctx.window.CGP2);
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'caregiver-connect-rules.js'), 'utf8'), ctx);   /* the one copy the engine's hire record comes from */
  vm.runInContext(code + '\nthis.__x = { wcAct, wcOrientCall, wcOrientMsg, wcOrientLink, wcCard, WC_GUIDE, WC_ORIENT_LABEL, setRows: r => { WC_ROWS = r; } };', ctx);
  const X = ctx.__x;
  X.setRows([{ id: 'w1', candidate_id: '41', first_name: 'Ava', last_name: 'Applicant', phone: '(417) 555-0100', email: 'ava@x.com', status: 'booked', starts_at: '2026-10-06T15:00:00Z',
    i9_checked: true, app_setup: true, profile_reviewed: true, photo_link_sent: true }]);
  return { X, log, alerts, fetches };
}

(async () => {
  // ---- the done button: done first, then the orientation link ----
  let W = world();
  await W.X.wcAct('w1', 'done', '', null);
  ck('done: the welcome call is marked done FIRST, then Training is asked', JSON.stringify(W.log.filter((l) => l[0] !== 'confirm' && l[0] !== 'wcLoad').map((l) => l.join(':'))) === JSON.stringify(['welcome-call:done', 'training']), W.log);
  const f = W.fetches[0] || {};
  ck('done: Training job-offer, action orientation_link, the staff member\'s own Hub sign-in (x-hub-token), no shared key', /rdqujxiycycwhskyvrwa\.supabase\.co\/functions\/v1\/job-offer$/.test(f.url) && f.body.action === 'orientation_link' && f.headers['x-hub-token'] === 'staff-hub-token' && f.headers.Authorization === 'Bearer training-anon', f);
  ck('done: the offer id, the welcome call id and every phone and email the Hub has (no duplicates)', f.body.offer_id === 'offer-uuid-1' && f.body.welcome_call_id === 'w1' && f.body.phone === '(417) 555-0100' && JSON.stringify(f.body.phones) === '["417-555-0199"]' && f.body.email === 'ava@x.com' && f.body.emails.length === 0 && f.body.first === 'Ava', f.body);
  const confirmText = (W.log.find((l) => l[0] === 'confirm') || [])[1] || '';
  ck('done: the confirm says they must be In Training in AxisCare first', /hired in AxisCare with status In Training/.test(confirmText) && /I-9 Section 2/.test(confirmText), confirmText);
  ck('done: one message: marked done + sent + the profile reminder from 2c kept', W.alerts.length === 1 && /^Welcome call marked done\.\n\nAdded to the caregiver roster \(hire date \w{3} \d{1,2}, \d{4}\)\.\n\nOrientation link sent by text and email\./.test(W.alerts[0]) && /caregiver profile is not published yet/.test(W.alerts[0]), W.alerts);

  W = world({ doneFails: true });
  await W.X.wcAct('w1', 'done', '', null);
  ck('done fails: Training is NOT asked, nothing was changed is said', !W.fetches.length && /Nothing was changed/.test(W.alerts[0]), [W.fetches, W.alerts]);

  W = world({ trainingDown: true, published: true });
  await W.X.wcAct('w1', 'done', '', null);
  ck('Training unreachable: the call stays done and the office is told to press Send orientation link', /marked done/.test(W.alerts[0]) && /orientation link step did not run/.test(W.alerts[0]) && /Send orientation link/.test(W.alerts[0]) && !/not published yet/.test(W.alerts[0]), W.alerts);

  W = world({ noOffer: true, answer: { status: 'sent', sms: true, email: false, not_sent: ['email: the opt-out check said no'], offer_linked: false, offer_note: 'No job offer is linked to them in the Hub, so they were looked up by phone and email only and no offer was linked.' } });
  await W.X.wcAct('w1', 'done', '', null);
  ck('no offer on the board: still tried (phone/email), the office told plainly', W.fetches[0].body.offer_id === '' && /No job offer is linked/.test(W.alerts[0]) && /Not sent: email: the opt-out check said no/.test(W.alerts[0]), W.alerts);

  // ---- each answer, said plainly ----
  const M = world().X.wcOrientMsg;
  const msgs = {
    held: M({ status: 'held', why: 'The orientation link goes out at 9am (texts only go 8am to 6pm)' }),
    already: M({ status: 'already_sent', sent_at: '2026-10-06T15:00:00Z' }),
    notFound: M({ status: 'not_found', why: 'nobody in AxisCare\'s caregiver list has this phone number or email yet (are they still an applicant?)', card: true }),
    notSent: M({ status: 'not_sent', not_sent: ['text: Do Not Disturb is on for them in GoHighLevel'] }),
    noContact: M({ status: 'no_contact', why: 'there is no phone number or email for them to find them in AxisCare by' }),
    error: M({ status: 'error', why: 'could not read AxisCare (HTTP 503). Nothing was sent. Try again in a minute; if it keeps happening, tell Samantha.' }),
  };
  ck('held: "The orientation link goes out at 9am (texts only go 8am to 6pm)"', msgs.held.startsWith('The orientation link goes out at 9am (texts only go 8am to 6pm).'), msgs.held);
  ck('already sent: says so, with when, nothing new went', /^Their orientation link was already sent \(Oct 6, 10:00 AM\)\. Nothing new went\./.test(msgs.already), msgs.already);
  ck('not found: why + "Set them to In Training in AxisCare, then press Send orientation link" + the card', /^No orientation link went: nobody in AxisCare/.test(msgs.notFound) && /Set them to In Training in AxisCare, then press Send orientation link/.test(msgs.notFound) && /card is on Needs Attention/.test(msgs.notFound), msgs.notFound);
  ck('not sent: each reason named, Needs Attention mentioned', /Not sent: text: Do Not Disturb/.test(msgs.notSent) && /Needs Attention/.test(msgs.notSent), msgs.notSent);
  ck('no contact / error: said plainly, no double full stop', /Add one on their record/.test(msgs.noContact) && /^No orientation link went: could not read AxisCare/.test(msgs.error) && !/\.\.$/.test(msgs.error), [msgs.noContact, msgs.error]);

  // ---- retry button ----
  W = world({ answer: { status: 'already_sent', sent_at: '2026-10-06T15:00:00Z' } });
  await W.X.wcOrientLink('w1', null);
  ck('Send orientation link (retry): asks first, calls Training only (the call is not touched), says the answer', W.log.some((l) => l[0] === 'confirm') && !W.log.some((l) => l[0] === 'welcome-call') && W.fetches.length === 1 && /already sent/.test(W.alerts[0]), [W.log, W.alerts]);
  W = world({ confirm: false });
  await W.X.wcOrientLink('w1', null);
  ck('retry: Cancel sends nothing', !W.fetches.length, W.fetches);
  ck('the Done recently rows carry the retry button', /onclick="wcOrientLink\('\$\{wcEsc\(w\.id\)\}',this\)">Send orientation link<\/button>/.test(src));

  // ---- the button, the guide, the journey ----
  const card = world().X.wcCard({ id: 'w1', candidate_id: '41', first_name: 'Ava', starts_at: '2026-10-06T15:00:00Z', status: 'booked' });
  ck('the done button reads exactly "Welcome call done – send orientation link"', world().X.WC_ORIENT_LABEL === 'Welcome call done – send orientation link' && card.includes('>Welcome call done – send orientation link</button>'), card.slice(card.indexOf('wcAct'), card.indexOf('wcAct') + 200));
  const G = world().X.WC_GUIDE;
  ck('guide: hire them in AxisCare and set In Training during the call, before pressing the button', /hire them in AxisCare and set their status to <b>In Training<\/b>/.test(G) && G.indexOf('set their status to <b>In Training</b>') < G.indexOf('press <b>Welcome call done – send orientation link</b>'), null);
  ck('call script: the AxisCare hire step comes before the app step (company code 16485 kept)', G.indexOf('Hire them in AxisCare (office, while you talk)') > 0 && G.indexOf('Hire them in AxisCare (office, while you talk)') < G.indexOf('company code: 16485'), null);
  ck('call script: tells them the link comes right after the call (9am if after 6pm)', /Right after this call you'll get a text and an email with your own private orientation link \(if it's after 6pm, it comes at 9am\)/.test(G));
  ck('guide: not found means set In Training, then Send orientation link under Done recently', /press <b>Send orientation link<\/b> on their row under <b>Done recently<\/b>/.test(G));
  const newBits = cut('/* ── Orientation link (slice 1b', 'async function wcTick(') + G + card;
  ck('no em dash in the new code, the button, the guide or any message', !/—/.test(newBits + Object.values(msgs).join('')), (newBits.match(/.{40}—.{40}/) || [''])[0]);
  ck('never "plain language" / "plain English"', !/plain (language|english)/i.test(newBits));

  globalThis.window = {}; require('../applicant-journey.js');
  const J = globalThis.window.AP_JOURNEY, i = J.findIndex((x) => x.name === 'Orientation link (training welcome)'), e = J[i] || {};
  ck('journey: one orientation-link entry, right after the photo link and before the orientation invite; the old nightly-only entry is gone', i > 0 && J[i - 1].name === 'Caregiver profile photo link' && J[i + 1].name === 'Orientation invite (pick your date)' && !J.some((x) => /Training welcome \(nightly sync\)/.test(x.name)), [i, J[i - 1] && J[i - 1].name]);
  ck('journey: the button and the 9am run are both named; the consent rule and the In Training rule are there', /Welcome call done – send orientation link/.test(e.trigger) && /9am run/.test(e.trigger) && /did not say no to texts/.test(e.rule) && /In Training in AxisCare/.test(e.rule), e);
  ck('journey: the exact new text and email subject', e.text === "Hi {first}, welcome to Caring Companions! Your orientation is ready. Start any time on your phone or computer:\nhttps://training.mo-care.com/#/me/{token}\nIt's 2 hours of orientation plus 4 hours of dementia care training, and you can do it in pieces. This private link is just for you, no login needed. Questions? Call or text the office at (417) 234-8494. Caring Companions.\nReply STOP to opt out." && e.subject === 'Welcome to Caring Companions, your orientation is ready', e.text);
  ck('journey: no em dash in the new entry', !/—/.test(JSON.stringify(e)));
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ck('index.html loads the new journey (cache version bumped)', /applicant-journey\.js\?v=20261002/.test(html));

  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
