/* node tests/today-gap-cards-test.js
   Today gap cards (2026-10-18, Samantha: yes to the Today page map). Work that only showed on the Dashboard becomes a
   card in My Work: messages to the Staffing Coordinator or the Owners, one-to-one meeting requests, and a person tagged
   on a card. The real opsReconcileInbox (cut out of index.html) and standup-board.js run against made-up people. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cut = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return html.slice(a, b); };
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };
const SAM = 'samantha@mo-care.com', ZACH = 'zach@mo-care.com', KRYS = 'krystal@mo-care.com', SEAT = 'seat@mo-care.com';

function inbox(data, opts = {}) {
  const saved = [];
  const c = { console, Date, JSON, String, Array, Map, Set, Number, Object,
    DATA: data, persist: async (k, x) => { saved.push([k, JSON.parse(JSON.stringify(x))]); },
    routeSeatNow: () => (opts.noSeat ? null : { person: SEAT }), ccNoticeTo: (a) => (a === 'client_care' ? KRYS : SAM),
    ccOwnerEmails: () => [ZACH, SAM], opsOwnerName: (e) => ({ [SAM]: 'Samantha T', [ZACH]: 'Zach T', [KRYS]: 'Krystal L', [SEAT]: 'Seat Holder' })[e] || '',
    OPS_KINDS: { request: { label: 'Request', hours: 72 } }, OPS_URGENCY: { today: 8, normal: 72 } };
  vm.createContext(c);
  vm.runInContext(cut('function opsDueFor(kind, urgency, fromISO){', '\n}\n') + '\n}\n' + cut('function opsReconcileInbox(){', 'function opsOpen(kind){') + '\nthis.run = opsReconcileInbox;', c);
  return { run: () => c.run(), saved };
}
const item = (d, id) => (d.ops_items || []).find((x) => x.id === id);

/* ── messages ── */
{
  const d = { ops_items: [], staffing_tasks: [
    { id: 't1', direction: 'to_staffing', kind: 'schedule', urgency: 'Today', about: 'Ann Able', message: 'Ann wants Tuesdays moved to 9am.', from_name: 'Krystal Land', from_email: KRYS, status: 'open', created_at: '2026-10-18T14:00:00Z' },
    { id: 't2', direction: 'to_owners', kind: 'update', urgency: 'This week', about: '', message: 'Payroll question for you both.', from_name: 'Krystal Land', from_email: KRYS, status: 'open', created_at: '2026-10-18T14:00:00Z' },
    { id: 't3', direction: 'to_coordinators', message: 'old kind, nothing writes it now', status: 'open' },
    { id: 't4', direction: 'to_staffing', message: 'already done', status: 'done' },
  ] };
  const R = inbox(d); R.run();
  const a = item(d, 'ops_stask_t1'), b = item(d, 'ops_stask_t2');
  ck('message to Staffing: a card for whoever holds the Staffing seat, due today, with the words', a && a.owner === SEAT && a.urgency === 'today' && /Message for Staffing from Krystal: Ann Able/.test(a.title) && /Tuesdays moved/.test(a.detail) && a.status === 'open', a);
  ck('message to the Owners: one owner (Samantha first), the other also has it, and it is sensitive', b && b.owner === SAM && JSON.stringify(b.also_for) === JSON.stringify([ZACH]) && b.sensitive === true, b);
  ck('no card for the old "coordinators" kind or a message already done', !item(d, 'ops_stask_t3') && !item(d, 'ops_stask_t4'));
  ck('the two new cards are saved', R.saved.filter(([k]) => k === 'ops_items').length === 2);
  const n0 = R.saved.length; R.run();
  ck('a second pass makes nothing again and saves nothing', d.ops_items.length === 2 && R.saved.length === n0);
  /* the Owners Hub marks one done: its card closes */
  d.staffing_tasks[1].status = 'done'; d.staffing_tasks[1].done_by = 'Zach T'; R.run();
  ck('a message marked done anywhere closes its card, saying who', b.status === 'done' && b.closed_by === 'system' && /Marked done by Zach T/.test(b.auto_closed_reason), b);
  /* the seat holder closes the card: the message is marked done for Krystal */
  a.status = 'done'; a.closed_by = SEAT; a.closed_at = '2026-10-18T16:00:00Z'; R.run();
  const t1 = d.staffing_tasks[0];
  ck('closing the card marks the message done (the screen it never had)', t1.status === 'done' && t1.done_by === 'Seat Holder' && t1.done_at === '2026-10-18T16:00:00Z' && R.saved.some(([k, x]) => k === 'staffing_tasks' && x.id === 't1'), t1);
  const nobody = inbox({ ops_items: [], staffing_tasks: [{ id: 'x', direction: 'to_staffing', message: 'm', from_email: KRYS, status: 'open' }] }, { noSeat: true });
  nobody.run();
  ck('nobody on the Staffing seat: the scheduling owner has it', nobody.saved[0] && nobody.saved[0][1].owner === SAM, nobody.saved[0]);
}

/* ── meeting requests ── */
{
  const d = { ops_items: [], meetings: [
    { id: 'm1', with: 'samantha', topic: 'My schedule next month', when_pref: 'Tuesday afternoon', requested_by_name: 'Krystal Land', requested_by_email: KRYS, status: 'requested', created_at: '2026-10-18T14:00:00Z' },
    { id: 'm2', with: 'staffing', topic: 'Weekend coverage', requested_by_name: 'Krystal Land', requested_by_email: KRYS, status: 'requested' },
    { id: 'm3', with: 'care', topic: 'A client concern', requested_by_name: 'Samantha T', requested_by_email: SAM, status: 'requested' },
    { id: 'm4', with: 'samantha', topic: 'already set', requested_by_email: KRYS, status: 'accepted' },
    { id: 'm5', with: 'samantha', topic: 'to myself', requested_by_email: SAM, status: 'requested' },
  ] };
  const R = inbox(d); R.run();
  ck('meeting with Samantha: her card, with when they would like and where to answer', item(d, 'ops_mtg_m1') && item(d, 'ops_mtg_m1').owner === SAM && /Tuesday afternoon/.test(item(d, 'ops_mtg_m1').detail) && /Team Meetings/.test(item(d, 'ops_mtg_m1').next_action));
  ck('meeting "with the Staffing Coordinator" now reaches the Staffing seat (it reached nobody)', item(d, 'ops_mtg_m2') && item(d, 'ops_mtg_m2').owner === SEAT);
  ck('meeting with Client Care: the Client Care owner', item(d, 'ops_mtg_m3') && item(d, 'ops_mtg_m3').owner === KRYS);
  ck('no card for one already accepted, or for asking yourself', !item(d, 'ops_mtg_m4') && !item(d, 'ops_mtg_m5'));
  d.meetings[0].status = 'accepted'; d.meetings[0].scheduled_for = 'Tue 2pm'; d.meetings[1].status = 'declined'; R.run();
  ck('accepted: the card closes with the time; another time suggested: closes too', item(d, 'ops_mtg_m1').status === 'done' && /Accepted for Tue 2pm/.test(item(d, 'ops_mtg_m1').auto_closed_reason) && item(d, 'ops_mtg_m2').status === 'done');
  ck('closing a meeting card never changes the meeting itself', d.meetings[2].status === 'requested');
}

/* ── the hooks are in place ── */
ck('My Work runs it each time it draws', /try\{ opsReconcileInbox\(\); \}catch\(e\)/.test(cut('function renderMyWork(){', 'const b=myWorkBuckets();')));
ck('the Operations tab runs it with the other reconcilers', /opsReconcileDiscipline\(\);\n    opsReconcileInbox\(\);/.test(html));
ck('no em dash in the new words', !/[—―]/.test(cut('function opsReconcileInbox(){', 'function opsOpen(kind){')));

/* ── tags reach My Work (standup-board.js) ── */
(async () => {
  const src = fs.readFileSync(path.join(ROOT, 'standup-board.js'), 'utf8');
  const card = { id: 'ops_c1', kind: 'client_issue', status: 'open', title: 'Call Ann', owner: KRYS, history: [] };
  const notes = [{ id: 'su1', source: 'work', ops_id: 'ops_c1', summary: 'Call Ann', assigned_to_email: KRYS, status: 'open', updates: [], history: [] }];
  const saved = [];
  const ctx = { console, Date, JSON, Math, Promise, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, String, Number, Array, Object, Set, Map, RegExp, Error,
    escapeHtmlComms: (x) => String(x), DATA: { ops_items: [card] }, opsCanSee: () => true,
    ccActor: () => ({ email: SAM, name: 'Samantha T' }), roleEveryone: () => [{ email: SAM, name: 'Samantha T' }, { email: KRYS, name: 'Krystal Land' }, { email: ZACH, name: 'Zach T' }],
    persist: async (k, x) => { saved.push([k, JSON.parse(JSON.stringify(x))]); }, opsLog: (it, line) => { it.history.push({ text: line }); },
    document: { getElementById: () => null, createElement: () => ({ style: {} }), head: { appendChild() {} }, addEventListener() {} },
    sb: { from: () => { const b = { select: () => b, eq: () => b, maybeSingle: async () => ({ data: { data: JSON.parse(JSON.stringify(notes)) }, error: null }) }; return b; }, rpc: async () => ({ data: null, error: null }), functions: { invoke: async () => ({ data: {}, error: null }) } },
  };
  ctx.window = ctx; ctx.addEventListener = () => {}; ctx.innerWidth = 1200;
  vm.createContext(ctx); vm.runInContext(src, ctx);
  await ctx.suTalk.load(true);
  /* a reply that tags Zach and Krystal (the owner), the way the reply box sends it */
  const el = { value: 'Can you call her too @Zach @Krystal', disabled: false, focus() {} };
  await ctx.suReply('su1', el);
  const c = ctx.DATA.ops_items[0];
  ck('tag: Zach now has the card in his My Work (also_for); the owner is not added to her own card', JSON.stringify(c.also_for) === JSON.stringify([ZACH]) && JSON.stringify(c.talk_also_for) === JSON.stringify([ZACH]), c);
  ck('tag: the card is saved with the note on it', saved.some(([k, x]) => k === 'ops_items' && x.id === 'ops_c1' && (x.also_for || []).includes(ZACH)) && /Note for Zach, Krystal/.test(JSON.stringify(c.history)), c.history);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('FAIL  crashed: ' + (e && e.stack || e)); process.exit(1); });
