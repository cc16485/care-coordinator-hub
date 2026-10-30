/* node tests/axis-connection-test.js
   Settings > AxisCare connection (Samantha, 2026-10-29). The real axis-connection.js with a fake page, a fake summary
   (the shape the server's axis_connection returns), fake ccConfirm / tkMerge. Proves: "scheduling NOT current" is shown
   even when the caregiver list read fine (one line per kind); counts of reads, failures, 429s; the two switches save only
   their own key, owners only, Cancel saves nothing; the card line says when AxisCare was last checked and warns when old;
   the "not installed yet" message; no em dashes. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(ROOT, 'axis-connection.js'), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 700))); };
const NOW = Date.parse('2026-10-29T19:30:00Z'), ago = (m) => new Date(NOW - m * 60000).toISOString();

function world({ ops = {}, isOwner = true, answer = true, rpc } = {}) {
  const els = {}, asked = [], merged = [], logged = [];
  const el = (id) => els[id] || (els[id] = { id, innerHTML: '', textContent: '', style: {}, disabled: false });
  const W = {
    DATA: { ops_settings: ops }, ccIsOwner: () => isOwner,
    ccConfirm: async (t) => { asked.push(t); return answer; },
    tkMerge: async (apply, what) => { const m = { ...W.DATA.ops_settings }; const ch = apply(m); merged.push(m); logged.push({ what, ch }); W.DATA.ops_settings = m; return { error: null }; },
    sb: { rpc: rpc || (async () => ({ data: null, error: { message: 'Could not find the function public.axis_connection(p_minutes)' } })) },
  };
  const ctx = { window: W, DATA: W.DATA, sb: W.sb, document: { getElementById: el }, alert: (t) => asked.push('ALERT ' + t), console, Date, Math, JSON, String, Number, Object, Array, isFinite, Promise, Map, Set };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  return { A: W.AxisConn, W, els, asked, merged, logged };
}
const S = (o) => Object.assign({ calls: 0, failed: 0, r429: 0, held: 0, shared: 0, last_try_ok: true, last_ok_at: ago(2), last_fail_at: null }, o);
const CONN = {
  as_of: ago(0), scheduling_current: false, axiscare_wait_until: ago(-1), reader_on: false, cards_on: false,
  totals: { calls: 212, failed: 9, r429: 7, held: 3, shared: 40 },
  sources: {
    caregivers: S({ calls: 4 }),
    visits: S({ calls: 150, failed: 9, r429: 7, last_try_ok: false, last_ok_at: ago(16), last_fail_at: ago(1), last_error: 'AxisCare answered 429' }),
  },
  jobs: [{ job: 'coverage-run', calls: 90, failed: 5, r429: 4, held: 0, shared: 0 }],
  hours: [{ hour: ago(60), calls: 200, r429: 6, failed: 8, live: false }],
};

(async () => {
  /* 1 · the page */
  let w = world();
  const h = w.A.html(CONN, '', NOW);
  ck('NOT current is shown although the caregiver list read fine', /Scheduling information is NOT current/.test(h) && /last good visit read was at 2:14 PM/.test(h) && /Last answer: AxisCare answered 429/.test(h), h.slice(0, 400));
  ck('AxisCare\'s wait is shown', /AxisCare asked the Hub to wait until 2:31 PM/.test(h));
  ck('request volume, failures and 429s for the last hour', /<b>212<\/b> AxisCare reads, <b>9<\/b> failed, <b>7<\/b> turned away by AxisCare \(429\), 3 held back/.test(h) && /40 answered from a read another job had just made/.test(h));
  ck('one line per kind: visits with its last good and failed read and counts', /Visit lists[\s\S]*?2:14 PM[\s\S]*?2:29 PM[\s\S]*?>9<[\s\S]*?>7</.test(h));
  ck('a kind never read says so (not "fine")', /Schedules[\s\S]*?Not read in the last 14 days/.test(h));
  ck('by job and hour by hour are there', /coverage-run: 90 reads, 5 failed, 4 429s/.test(h) && /200 reads, 6 429s, 8 failed/.test(h));
  const h2 = w.A.html(Object.assign({}, CONN, { scheduling_current: true, axiscare_wait_until: null, sources: { visits: S({ calls: 3, last_ok_at: ago(1) }) } }), '', NOW);
  ck('current: says when the last visit read worked', /Scheduling information is current\.<\/b> The last visit read worked at 2:29 PM/.test(h2) && !/wait until/.test(h2));
  ck('no em dashes anywhere a person reads', !/[—–]/.test(code.replace(/\/\*[\s\S]*?\*\//g, '')));

  /* 2 · not installed yet */
  w = world(); w.els.axcBox = { innerHTML: '' }; await w.A.fill(true);
  ck('before the server part is installed it says so', /The AxisCare log is not installed yet/.test(w.els.axcBox.innerHTML), w.els.axcBox.innerHTML);
  w = world({ rpc: async (fn, a) => ({ data: fn === 'axis_connection' && a.p_minutes === 60 ? CONN : null, error: null }) }); w.els.axcBox = { innerHTML: '' }; await w.A.fill(true);
  ck('with the server part it fills the box from axis_connection(60)', /NOT current/.test(w.els.axcBox.innerHTML));

  /* 3 · the switches */
  w = world(); w.A.fill();
  ck('both switches show Off by default with a Turn on button', /Off\./.test(w.els.axcReaderNow.innerHTML) && w.els.axcReaderBtn.textContent === 'Turn on the shared AxisCare reader' && w.els.axcCardsBtn.textContent === 'Turn on AxisCare read cards');
  await w.A.toggle(w.A.READER, w.els.axcReaderBtn);
  ck('reader switch: confirm says Cara reads fresh and nothing is sent, saves only its own key', /Cara always reads visits, schedules and the caregiver list fresh/.test(w.asked[0]) && /Nothing is sent to anyone/.test(w.asked[0])
    && w.merged.length === 1 && w.merged[0].axis_shared_reader_live === true && !('axis_failure_cards_live' in w.merged[0]) && w.logged[0].ch[0] === 'shared AxisCare reader ON', w.merged);
  ck('after saving it shows On', /On\./.test(w.els.axcReaderNow.innerHTML) && w.els.axcReaderBtn.textContent === 'Turn off the shared AxisCare reader');
  await w.A.toggle(w.A.READER, w.els.axcReaderBtn);
  ck('turning it off says every job goes back as it was', /back on its own again|on its own again, as before/.test(w.asked[1]) && w.W.DATA.ops_settings.axis_shared_reader_live === false);
  w = world(); await w.A.toggle(w.A.CARDS, null);
  ck('cards switch saves only its own key', w.merged[0].axis_failure_cards_live === true && !('axis_shared_reader_live' in w.merged[0]) && /closes by itself/.test(w.asked[0]));
  w = world({ answer: false }); await w.A.toggle(w.A.READER, null);
  ck('Cancel saves nothing', w.merged.length === 0);
  w = world({ isOwner: false }); w.A.fill(); await w.A.toggle(w.A.READER, null);
  ck('not an owner: no button, cannot change it', w.merged.length === 0 && w.els.axcReaderBtn.style.display === 'none' && /Only Samantha or Zachary/.test(w.els.axcReaderNow.innerHTML));

  /* 4 · the card line */
  w = world();
  ck('card line: a shift card says when AxisCare was checked', w.A.cardLine({ kind: 'open_shift' }, { sources: { visits: S({ last_ok_at: ago(3) }) } }, NOW) === 'AxisCare checked 2:27 PM');
  ck('card line: old or failing says it may be out of date', /last checked 2:14 PM\. This may be out of date/.test(w.A.cardLine({ kind: 'confirm_times' }, CONN, NOW)));
  ck('card line: other cards get nothing', w.A.cardLine({ kind: 'call_followup' }, CONN, NOW) === '');

  console.log(`\n${pass}/${pass + fail} passed` + (fail ? ' · FAILURES' : ' · ALL PASSED'));
  process.exit(fail ? 1 : 0);
})();
