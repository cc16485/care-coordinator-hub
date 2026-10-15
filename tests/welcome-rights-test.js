/* node tests/welcome-rights-test.js
   2026-10-13 (her ruling, 19 CSR 15-7.021(24)(B)5): the Step 1 Client Rights signature is receipt and review only; the office
   explains Client Rights, the Code of Ethics and the HIPAA policy at the Orientation Video Call. The real wcCard / wcRights /
   wcAct (cut out of caregivers-engine.js) against fakes: the box is on the call card in her words, the done press sends the
   tick (true only when ticked), an unticked press is warned, the server's refusal is shown as it is and nothing moves, a
   recorded explanation shows who and when instead of the box, and the call script says to do it. Then the readiness card and
   the Hiring tab say whose explanation it was and where it stands (caregiver-readiness.js CRX.rightsWords). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return src.slice(a, b); };
const code = [cut('const WC_MEET =', 'async function wcWho('), cut('function wcResult(', '/* ── Caregiver profile (part 2'), cut('function wcCard(', 'function renderWelcomeCalls('),
  cut('const WC_GUIDE =', 'async function wcNotes('), cut('async function wcAct(', '/* ── Orientation Video Call done -> caregiver roster')].join('\n');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };
const LABEL = 'I went over the Client Rights, the Code of Ethics and the HIPAA policy with them, and they confirmed they understand';

function world(opts = {}) {
  const calls = [], asks = [], alerts = [];
  const ctx = { console, Date, JSON, Promise, String, Object, Array, Error, Set,
    candidates: [], caregivers: [], window: {}, personName: (k, l) => l, cgpBtnHtml: () => '',
    confirm: (m) => { asks.push(m); return true; }, ccConfirm: async (m) => { asks.push(m); return true; }, alert: (m) => alerts.push(m),
    wcCall: async (b) => { calls.push(b); if (opts.refuse && b.action === 'done' && !b.rights_explained) throw new Error(opts.refuse); return { ok: true }; },
    wcLoad: async () => {}, wcAddToRoster: async () => ({ status: 'added' }), wcRosterMsg: () => 'Added.', wcOrientCall: async () => ({ status: 'sent', sms: true }), wcOrientMsg: () => 'Link sent.', wcSrcFor: () => null };
  vm.createContext(ctx);
  vm.runInContext(code + '\nthis.__x = { wcCard, wcRights, wcAct, WC_GUIDE, WC_RIGHTS, setRows: r => { WC_ROWS = r; } };', ctx);
  const X = ctx.__x;
  const w = Object.assign({ id: 'w1', candidate_id: '41', first_name: 'Ava', last_name: 'Lee', status: 'booked', starts_at: '2026-10-14T15:00:00Z', i9_checked: true, app_setup: true, profile_reviewed: true, photo_link_sent: true }, opts.row || {});
  X.setRows([w]);
  return { X, calls, asks, alerts, w };
}

(async () => {
  let W = world();
  const card = W.X.wcCard(W.w);
  ck('the call card carries her box, in her words, unticked, wired to wcRights', card.includes(LABEL) && /<input type="checkbox" style="margin-top:\.15rem"  onchange="wcRights\('w1',this\)">/.test(card), card.slice(card.indexOf('wcRights') - 200, card.indexOf('wcRights') + 60));
  ck('the box says why: signed in Step 1, explained on this call, needed before done on the new path', /They signed Client Rights in Step 1 \(received and reviewed\)\. Explain all three on this call before their first shift\./.test(card));
  await W.X.wcAct('w1', 'done', '', null);
  ck('done WITHOUT the tick: warned in the question, and sent with rights_explained false', /is not ticked\. On the new onboarding path the Hub will not mark the call done without it\./.test(W.asks[0]) && W.calls[0].action === 'done' && W.calls[0].rights_explained === false, [W.asks, W.calls]);
  W = world();
  W.X.wcRights('w1', { checked: true });
  ck('ticking redraws ticked (kept on the page only, never saved by the page)', /margin-top:\.15rem" checked onchange="wcRights/.test(W.X.wcCard(W.w)) && !/from\('welcome_calls'\)/.test(cut('function wcRights(', '\n')));
  await W.X.wcAct('w1', 'done', '', null);
  ck('done WITH the tick: no warning, and sent with rights_explained true', !/not ticked/.test(W.asks[0]) && W.calls[0].rights_explained === true && /^Orientation Video Call marked done\./.test(W.alerts[0]), [W.asks, W.calls, W.alerts]);
  ck('after the press the tick is cleared from the page', W.X.WC_RIGHTS.w1 === undefined);
  W = world();
  W.X.wcRights('w1', { checked: true }); W.X.wcRights('w1', { checked: false });
  await W.X.wcAct('w1', 'done', '', null);
  ck('ticked then unticked: sent as false', W.calls[0].rights_explained === false);
  const REFUSE = 'First tick "' + LABEL + '". On the new onboarding path the call cannot be marked done until the explanation is recorded. Nothing was changed.';
  W = world({ refuse: REFUSE });
  await W.X.wcAct('w1', 'done', '', null);
  ck('the server refuses (new path, no tick): its words are shown and nothing else runs', W.alerts.length === 1 && W.alerts[0].includes(REFUSE) && /Nothing was changed\./.test(W.alerts[0]) && W.calls.length === 1, W.alerts);
  W = world({ row: { rights_explained_at: '2026-10-13T15:30:00Z', rights_explained_by: 'Krystal', rights_ack_confirmed: true } });
  const done = W.X.wcCard(W.w);
  ck('a recorded explanation shows when and who instead of the box', /✓ Client Rights, Code of Ethics and HIPAA explained Oct 13 by Krystal; they confirmed they understand\./.test(done) && !done.includes('wcRights('), done.slice(0, 50));
  await W.X.wcAct('w1', 'done', '', null);
  ck('already recorded: no warning', !/not ticked/.test(W.asks[0]));
  const G = W.X.WC_GUIDE;
  ck('the call script: go over all three, ask if they understand, then tick the box (before their first shift)', /<b>Client Rights, Code of Ethics and HIPAA:<\/b>/.test(G) && G.includes('<b>' + LABEL + '</b>') && /This must happen before their first shift\./.test(G));
  ck('wcRights is on window for the inline handler', /wcAct, wcRights, wcOrientLink/.test(src));
  ck('no em dash and no "plain language" in the new words', !/—/.test(cut('const WC_RIGHTS_LABEL', 'function wcRights(') + cut('    ${w.rights_explained_at', '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:.35rem .6rem;margin:0 0 .45rem">') + G) && !/plain (language|english)/i.test(G));

  /* the readiness card and the Hiring tab */
  const ctx = { window: {}, sb: {}, console };
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, 'caregiver-readiness.js'), 'utf8'), ctx);
  const RW = ctx.window.CRX.rightsWords;
  let w = RW({ state: 'waiting_explanation', signed_at: '2026-10-10T15:00:00Z', explained_at: null }, null);
  ck('status: signed in Step 1, waiting for the explanation at the Orientation Video Call', w.state === 'waiting_explanation' && w.text === 'Signed in Step 1 Oct 10, 2026; waiting for the explanation at the Orientation Video Call.', w);
  w = RW({ state: 'complete', signed_at: '2026-10-10T15:00:00Z', explained_at: '2026-10-13T15:30:00Z', explained_by: 'Krystal' }, null);
  ck('status: complete, with the date and who explained it', w.state === 'complete' && w.text === 'Complete: Signed in Step 1 Oct 10, 2026; explained at the Orientation Video Call Oct 13, 2026 by Krystal, and they confirmed they understand.', w);
  w = RW(null, { signed_at: '2026-10-10T15:00:00Z', explained_at: '2026-10-13T15:30:00Z', explained_by: 'Angie' });
  ck('status: a completed row reads its own evidence (who and when stay with the row)', w.state === 'complete' && /by Angie/.test(w.text), w);
  w = RW({ state: 'waiting_signature', explained_at: '2026-10-13T15:30:00Z', explained_by: 'Krystal' }, null);
  ck('status: explained but not signed in Step 1 is not complete', w.state === 'waiting_signature' && /^Not signed in Step 1 yet; explained/.test(w.text), w);
  const rj = fs.readFileSync(path.join(ROOT, 'caregiver-readiness.js'), 'utf8'), hp = fs.readFileSync(path.join(ROOT, 'hire-profile.js'), 'utf8');
  ck('the readiness card draws the line under the participant rights row', /\(r\.key === 'cg\.step2\.participant_rights' \? rightsLine\(d\.facts && d\.facts\.rights, r\) : ''\)/.test(rj));
  ck('the Hiring tab (the person page) shows the same words from the readiness card it already reads', /CRX\.rightsWords\(RD\.facts && RD\.facts\.rights, rr\.st && rr\.st\.evidence\)/.test(hp) && /Client Rights, Code of Ethics and HIPAA<\/b>/.test(hp));
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
