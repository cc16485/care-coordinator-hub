// 583 · the Call follow-ups (practice) tab on My Work. Runs the REAL call-practice.js and the real tab wiring from
// index.html with a fake database: Steve's two calls of 2026-10-11 and the card Samantha made by hand.
//   node tests/call-practice-583-test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const res = []; const ck = (n, c, note) => res.push([n, !!c, c ? '' : String(note ?? '').slice(0, 600)]);
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const src = fs.readFileSync(path.join(root, 'call-practice.js'), 'utf8');
const STEVE = 'a4b036e3-587e-4b76-bdeb-27357b461a3c';
const ROWS = [
  { message_id: 'gMcTDQ5WoAXMHUmrCbdN', call_at: '2026-10-11T23:37:00Z', direction: 'out', seconds: 136, caller: 'Steve A.', match: 'one', who_name: 'Steve Algiere', who_roles: ['client'], call_type: 'client_or_family',
    tasks: [{ title: 'Schedule Angiel 2-3 hours with Steve this week: DMV trip for his new license', why: 'His license expired; he needs someone to go with him to the DMV. He will call Monday to confirm.', area: 'scheduling', due: '2026-10-16', add_to_card_id: '', voicemail: false }],
    resolves: [{ message_id: 'ipoVD64wn8dUcDyPdjqW', task_index: 0 }], no_task_reason: null, error: null },
  { message_id: 'ipoVD64wn8dUcDyPdjqW', call_at: '2026-10-11T23:36:00Z', direction: 'in', seconds: 20, caller: 'Steve A.', match: 'one', who_name: 'Steve Algiere', who_roles: ['client'], call_type: 'client_or_family',
    tasks: [{ title: 'Call Steve Algiere back about arranging a ride', why: 'Voicemail: Steve wants to arrange a ride.', area: 'scheduling', due: '2026-10-12', add_to_card_id: '', voicemail: true }], resolves: [], no_task_reason: null, error: null },
  { message_id: 'k1', call_at: '2026-10-12T13:29:00Z', direction: 'in', seconds: 616, caller: 'Kristie M.', match: 'none', who_name: null, who_roles: [], call_type: 'caregiver', tasks: [], resolves: [], no_task_reason: 'nothing left to do', error: null },
  { message_id: 'e1', call_at: '2026-10-12T14:00:00Z', direction: 'in', seconds: 40, caller: '<b>X</b>', match: 'several', who_name: null, who_roles: [], call_type: 'other', tasks: [], resolves: [], no_task_reason: null, error: 'the model declined this call' },
];
function make(settings, rows, err) {
  const Q = [];
  const sb = { from: (tb) => { const q = { tb, f: [] }; Q.push(q); const p = { select() { return p }, gte(k, v) { q.f.push(['gte', k, v]); return p }, order() { return p }, limit() { return p },
    insert() { q.write = true; return p }, update() { q.write = true; return p }, delete() { q.write = true; return p }, upsert() { q.write = true; return p },
    then(ok) { return Promise.resolve(err ? { data: null, error: { message: err } } : { data: rows, error: null }).then(ok) } }; return p }, rpc() { Q.push({ rpc: true }); return Promise.resolve({}) } };
  const ctx = { DATA: { ops_settings: settings, ops_items: [
      { id: 'ops_mv4nasn0', about: 'Steve Algiere', opened_by: 'person', created_by: 'Samantha Troutman', created_at: '2026-10-12T02:41:02.076Z', title: 'Schedule Angiel for 2-3 hours with Steve sometime this week or next week, he needs a ride to the DMV' },
      { id: 'ops_job', about: 'Steve Algiere', opened_by: 'cara', created_by: 'coverage-run', created_at: '2026-10-12T01:00:00Z', title: 'A job card' },
      { id: 'ops_late', about: 'Steve Algiere', opened_by: 'person', created_by: 'Krystal', created_at: '2026-10-14T01:00:00Z', title: 'Two days later' }] },
    sb, document: { getElementById: () => null }, console, Date, Promise, setTimeout, MYWORK_TAB: 'callpractice' };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(src, ctx); return { ctx, Q };
}
(async () => {
  // ── the tab wiring in index.html ──
  ck('My Work offers the tab only while practice is on (via CPR.offered)', /if\(window\.CPR && CPR\.offered\(\)\) t\.push\(\['callpractice','Call follow-ups \(practice\)'\]\);/.test(html));
  ck('the tab draws through CPR.render and nothing else', /if\(MYWORK_TAB==='callpractice'\)\{ wrap\.innerHTML=''; if\(window\.CPR\) CPR\.render\(wrap\); return; \}/.test(html));
  ck('the page loads call-practice.js after desk.js', html.indexOf('<script src="call-practice.js?v=1"></script>') > html.indexOf('<script src="desk.js?v=12"></script>'));
  let { ctx } = make({ call_tasks_practice: false }, ROWS);
  ck('switch off: the tab is not offered', ctx.CPR.offered() === false);
  ({ ctx } = make({ call_tasks_practice: true }, ROWS));
  ck('switch on: the tab is offered', ctx.CPR.offered() === true);
  // ── the list ──
  const { ctx: c2, Q } = make({ call_tasks_practice: true }, ROWS);
  const wrap = { innerHTML: '' };
  c2.CPR.render(wrap); await new Promise((r) => setTimeout(r, 20)); c2.CPR.render(wrap)
  const h = wrap.innerHTML;
  ck('it says plainly this is practice: in nobody\'s work, creates and sends nothing', /<b style="color:#8A5A00;">Practice\.<\/b> These cards are not in anyone's work/.test(h) && /Nothing here creates, changes or sends anything/.test(h), h.slice(0, 400));
  ck('it reads the last 7 days from call_task_reading, and never writes', Q.some((q) => q.tb === 'call_task_reading' && q.f.some((f) => f[1] === 'call_at')) && !Q.some((q) => q.write || q.rpc), JSON.stringify(Q));
  ck('the headline: 4 calls read, 2 cards it would have made, 1 made by people', /<b>4<\/b> calls read, <b>2<\/b> cards it would have made, <b>1<\/b> made by people/.test(h), h.slice(0, 900));
  ck('Steve\'s call: his name and role from the identity layer, we called, 2 min 16 s', /Steve Algiere \(client\)/.test(h) && /we called · 2 min 16 s/.test(h), h);
  ck('the would-be card: title, reason, Scheduling, due Fri, Oct 16', /Schedule Angiel 2-3 hours with Steve this week: DMV trip for his new license/.test(h) && /Scheduling · due Fri, Oct 16/.test(h), h);
  ck('beside it, the card Samantha made by hand (a job\'s card and a card two days later are not counted)', /Schedule Angiel for 2-3 hours with Steve sometime this week or next week/.test(h) && /\(Samantha, /.test(h) && !/A job card|Two days later/.test(h), h);
  ck('the voicemail card shows it was answered by the later call at 6:37 pm', /Call Steve Algiere back about arranging a ride/.test(h) && /Answered by the later call at Sun, Oct 11, 6:37/.test(h) && /from a voicemail/.test(h), h);
  ck('a call with no card says why; a call that could not be read says so', /No card: nothing left to do\./.test(h) && /Could not read this call: the model declined this call/.test(h), h);
  ck('unknown and shared numbers are labelled, and text from the database is escaped', /\(not in our records\)/.test(h) && /\(shared number\)/.test(h) && !/<b>X<\/b>/.test(h) && /&lt;b&gt;X/.test(h), h);
  ck('there are no buttons that could act (only Refresh)', !/<button|onclick="(?!CPR\.refresh)/.test(h), h.match(/<button[^>]*>|onclick="[^"]*"/g));
  const { ctx: c3 } = make({ call_tasks_practice: true }, null, 'relation "public.call_task_reading" does not exist');
  const w3 = { innerHTML: '' }; c3.CPR.render(w3); await new Promise((r) => setTimeout(r, 20)); c3.CPR.render(w3);
  ck('before 583 has run: "This appears once Desktop step 583 has run."', /appears once Desktop step 583 has run/.test(w3.innerHTML), w3.innerHTML);
  ck('no em dash in the module', !/[—―]/.test(src));
  const failed = res.filter((r) => !r[1]);
  for (const [n, ok, note] of res) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '\n      ' + note}`);
  console.log(`\n${res.length - failed.length}/${res.length} passed${failed.length ? ' · FAIL' : ''}`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.log('FAIL  crashed: ' + e.stack); process.exit(1); });
