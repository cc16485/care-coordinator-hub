// 650 · the Call follow-ups (practice) tab on My Work. Runs the REAL call-practice.js and the real tab wiring from
// index.html with a fake database: Steve's two calls of 2026-10-11 and the card Samantha made by hand.
//   node tests/call-practice-650-test.js
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
  const sb = { from: (tb) => { const q = { tb, f: [] }; Q.push(q); const p = { select() { return p }, gte(k, v) { q.f.push(['gte', k, v]); return p }, eq() { return p }, order() { return p }, limit() { return p }, maybeSingle() { return p },
    insert() { q.write = true; return p }, update() { q.write = true; return p }, delete() { q.write = true; return p }, upsert() { q.write = true; return p },
    then(ok) { const d = tb === 'op_events' ? (globalThis.__EVENTS || []) : tb === 'call_record' ? (globalThis.__OUTCOMES || []) : tb === 'call_promise_watch' ? (globalThis.__PROMISES || []) : tb === 'app_data' ? { data: globalThis.__BEATS || [] } : rows; return Promise.resolve(err && tb === 'call_task_reading' ? { data: null, error: { message: err } } : { data: d, error: null }).then(ok) } }; return p }, rpc() { Q.push({ rpc: true }); return Promise.resolve({}) } };
  const ctx = { DATA: { ops_settings: settings, ops_items: [
      { id: 'ops_mv4nasn0', about: 'Steve Algiere', opened_by: 'person', created_by: 'Samantha Troutman', created_at: '2026-10-12T02:41:02.076Z', title: 'Schedule Angiel for 2-3 hours with Steve sometime this week or next week, he needs a ride to the DMV' },
      { id: 'ops_job', about: 'Steve Algiere', opened_by: 'cara', created_by: 'coverage-run', created_at: '2026-10-12T01:00:00Z', title: 'A job card' },
      { id: 'ops_late', about: 'Steve Algiere', opened_by: 'person', created_by: 'Krystal', created_at: '2026-10-14T01:00:00Z', title: 'Two days later' }] },
    sb, document: { getElementById: () => null }, console, Date, Promise, setTimeout, clearTimeout, Intl, MYWORK_TAB: 'callpractice' };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(src, ctx); return { ctx, Q };
}
(async () => {
  // ── the tab wiring in index.html ──
  ck('My Work offers the tab only while practice is on (via CPR.offered); named "What the AI read" once cards are live', /if\(window\.CPR && CPR\.offered\(\)\) t\.push\(\['callpractice', \(DATA\.ops_settings && DATA\.ops_settings\.call_tasks_live===true\) \? 'What the AI read' : 'Call follow-ups \(practice\)'\]\);/.test(html));
  ck('the tab draws through CPR.render and nothing else', /if\(MYWORK_TAB==='callpractice'\)\{ wrap\.innerHTML=''; if\(window\.CPR\) CPR\.render\(wrap\); return; \}/.test(html));
  ck('the page loads call-practice.js (v7) after desk.js', html.indexOf('<script src="call-practice.js?v=7"></script>') > html.indexOf('<script src="desk.js?v='));
  let { ctx } = make({ call_tasks_practice: false }, ROWS);
  ck('switch off: the tab is not offered', ctx.CPR.offered() === false);
  ({ ctx } = make({ call_tasks_practice: true }, ROWS));
  ck('switch on: the tab is offered', ctx.CPR.offered() === true);
  // ── the list ──
  const { ctx: c2, Q } = make({ call_tasks_practice: true }, ROWS);
  const wrap = { innerHTML: '' };
  c2.CPR.render(wrap); await new Promise((r) => setTimeout(r, 20)); c2.CPR.render(wrap)
  const h = wrap.innerHTML;
  ck('it says plainly this is practice: in nobody\'s work, sends nothing', /<b style="color:#8A5A00;">Practice\.<\/b> These cards are not in anyone's work/.test(h) && /Nothing here sends anything/.test(h), h.slice(0, 400));
  ck('it reads the last 7 days from call_task_reading, and never writes', Q.some((q) => q.tb === 'call_task_reading' && q.f.some((f) => f[1] === 'call_at')) && !Q.some((q) => q.write || q.rpc), JSON.stringify(Q));
  ck('the headline: 4 calls read, 2 cards it would have made, 1 made by people', /<b>4<\/b> calls and texts read · <b>2<\/b> cards it would have made/.test(h) && /<b>1<\/b> cards people made for the same people within a day/.test(h), h.slice(0, 900));
  ck('Steve\'s call: his name and role from the identity layer, we called, 2 min 16 s', /Steve Algiere \(client\)/.test(h) && /we called · 2 min 16 s/.test(h), h);
  ck('an older reading still shows its card: title, reason, owner line, due Fri, Oct 16', /Schedule Angiel 2-3 hours with Steve this week: DMV trip for his new license/.test(h) && /<b>Due:<\/b> Fri, Oct 16/.test(h) && /Scheduling/.test(h), h);
  ck('beside it, the card Samantha made by hand (a job\'s card and a card two days later are not counted)', /Schedule Angiel for 2-3 hours with Steve sometime this week or next week/.test(h) && /\(Samantha, /.test(h) && !/A job card|Two days later/.test(h), h);
  ck('the voicemail card shows it was answered by the later call at 6:37 pm', /Call Steve Algiere back about arranging a ride/.test(h) && /Answered by the later call at Sun, Oct 11, 6:37/.test(h), h);
  ck('a call with no card says why; a call that could not be read says so', /No card: nothing left to do\./.test(h) && /Trying again<\/span> <span style="font-size:12.5px;">the model declined this call/.test(h) && /Try 1 of 3\. It tries again about 30 minutes after the last try/.test(h), h);
  ck('unknown and shared numbers are labelled, and text from the database is escaped', /\(not in our records\)/.test(h) && /\(shared number\)/.test(h) && !/<b>X<\/b>/.test(h) && /&lt;b&gt;X/.test(h), h);
  ck('there are no buttons that could act (only Refresh and the read-only view filters)', !/<button|onclick="(?!CPR\.(refresh|setFilter|setChannel|openCall))/.test(h), h.match(/<button[^>]*>|onclick="[^"]*"/g));
  const OLD = Object.assign({}, ROWS[0], { read_at: '2026-10-12T15:50:00Z', tasks: [{ title: 'OLD READING card', why: '', area: 'scheduling', due: '', add_to_card_id: '' }] });
  const NEW = Object.assign({}, ROWS[0], { read_at: '2026-10-12T17:00:00Z' });
  const { ctx: c4 } = make({ call_tasks_practice: true }, [OLD, NEW, ROWS[2]]);
  const w4 = { innerHTML: '' }; c4.CPR.render(w4); await new Promise((r) => setTimeout(r, 20)); c4.CPR.render(w4);
  ck('a call read twice (old and new reader) shows once, with its newest reading', !/OLD READING card/.test(w4.innerHTML) && /<b>2<\/b> calls and texts read/.test(w4.innerHTML) && (w4.innerHTML.match(/DMV trip for his new license/g) || []).length === 1, w4.innerHTML.slice(0, 700));
  // ── v7 readings: summary, understanding, promises, every responsibility with its decision, owner, urgency, due, why; and what the team did ──
  const V7 = [Object.assign({}, ROWS[0], { read_at: '2026-10-12T18:00:00Z', person_id: 'a4b0', version: 'v7-2026-10-12',
    tasks: [{ title: 'Schedule Angiel 2-3 hours with Steve this week: DMV trip', why: 'He will call Monday to confirm.', area: 'scheduling', due: '2026-10-16', urgency: 'this_week', owner: { name: 'Samantha Troutman', via: 'on the Staffing seat at that hour' } }],
    detail: { summary: 'Steve needs a ride to the DMV this week.', about: 'Steve Algiere, client', understood: ['License expired', 'Wants Angiel'],
      commitments: [{ what: 'Steve will call Monday to confirm', kind: 'caller_will', when: 'Monday' }, { what: 'We will work out a time', kind: 'we_agreed', when: 'this week' }],
      items: [{ responsibility: 'Arrange the DMV trip', decision: 'new_card', workflow: '', card_id: '', title: 'Schedule Angiel 2-3 hours with Steve this week: DMV trip', why: 'He will call Monday to confirm.', area: 'scheduling', urgency: 'this_week', due: '2026-10-16', reason: 'We agreed and nobody has it.', owner: { name: 'Samantha Troutman', via: 'on the Staffing seat at that hour' } },
        { responsibility: 'Wait for his confirmation', decision: 'caller_owns', workflow: '', card_id: '', title: '', why: '', area: 'scheduling', urgency: 'routine', due: '', reason: 'He said he will call.' },
        { responsibility: 'Cover Tanya\'s 9am', decision: 'already_in_workflow', workflow: 'call-off case', card_id: '', title: '', why: '', area: 'scheduling', urgency: 'now', due: '', reason: 'The call-off case has it.' }] } }),
    Object.assign({}, ROWS[2], { read_at: '2026-10-12T18:00:00Z', tasks: [{ title: 'Check Kristie pay', area: 'payroll', urgency: 'today', owner: { name: 'Samantha Troutman', via: 'owns money and approvals' } }], detail: { items: [{ responsibility: 'Pay', decision: 'new_card', title: 'Check Kristie pay', area: 'payroll', urgency: 'today', reason: 'r', owner: { name: 'Samantha Troutman', via: 'owns money and approvals' } }] } })]
  globalThis.__EVENTS = [{ at: '2026-10-12T00:10:00Z', actor_name: 'Krystal Land', actor_kind: 'person', verb: 'visit_changed', summary: 'Krystal changed a visit for Steve Algiere', item_id: '' }, { at: '2026-10-20T00:10:00Z', actor_name: 'Krystal', actor_kind: 'person', verb: 'x', summary: 'Steve Algiere much later', item_id: '' }]
  globalThis.__OUTCOMES = [{ recorded_at: '2026-10-11T23:40:00Z', kind: 'outcome', outcome: 'Schedule Change', person_id: 'a4b0' }]
  const { ctx: c7 } = make({ call_tasks_practice: true }, V7);
  const w7 = { innerHTML: '' }; c7.CPR.render(w7); await new Promise((r) => setTimeout(r, 20)); c7.CPR.render(w7);
  const h7 = w7.innerHTML
  ck('v7: the call summary and what it understood are shown', /<b>The call:<\/b> Steve needs a ride to the DMV this week\./.test(h7) && /WHAT IT UNDERSTOOD/.test(h7) && /<li>License expired<\/li>/.test(h7), h7.slice(0, 900))
  ck('v7: the promises are told apart (Caller will / We agreed) with when', /Caller will<\/span> Steve will call Monday to confirm <span class="field-note">\(Monday\)/.test(h7) && /We agreed<\/span> We will work out a time/.test(h7), h7)
  ck('v7: the proposed card shows its owner (and why that person), due date, urgency and the reason', /New card/.test(h7) && /<b>Owner:<\/b> Samantha Troutman <span style="color:var\(--muted\);">\(on the Staffing seat at that hour\)/.test(h7) && /<b>Due:<\/b> Fri, Oct 16/.test(h7) && /This week/.test(h7) && /<b>Why:<\/b> We agreed and nobody has it\./.test(h7), h7)
  ck('v7: jobs that need no card are shown with why: the caller\'s to do, and already in a workflow (and where)', /The caller&#39;s to do|The caller's to do/.test(h7) && /<b>Why:<\/b> He said he will call\./.test(h7) && /Already in a workflow/.test(h7) && /<b>Where:<\/b> call-off case/.test(h7), h7)
  ck('v7: what the team did, including work done without a card (a Hub action that names him; the call outcome tapped); nothing from days later', /Krystal Land: Krystal changed a visit for Steve Algiere/.test(h7) && /Call outcome tapped: Schedule Change/.test(h7) && !/much later/.test(h7), h7)
  ck('v7: the headline counts the jobs found already handled', /<b>1<\/b> jobs it found already handled/.test(h7), h7.slice(0, 900))
  const { ctx: ck9 } = make({ call_tasks_practice: true }, [Object.assign({}, ROWS[2], { read_at: 'z', tasks: [], detail: { summary: 'Lisa called to thank us.', items: [{ responsibility: 'Praise for Tanya', decision: 'kind_words', quote: 'Lisa Hill: Tanya has been a blessing.', area: 'caregiver_performance', urgency: 'routine', reason: 'Praise goes to Kind Words as a suggestion, not a card.' }] } })]);
  const w9 = { innerHTML: '' }; ck9.CPR.render(w9); await new Promise((r) => setTimeout(r, 20)); ck9.CPR.render(w9);
  ck('v9: praise shows as Kind Words (suggested) with the words, and says it is never a card', /Kind Words \(suggested\)/.test(w9.innerHTML) && /Tanya has been a blessing/.test(w9.innerHTML) && /Never a card/.test(w9.innerHTML) && !/New card/.test(w9.innerHTML), w9.innerHTML.slice(0, 900))
  c7.CPR.setFilter('urgent'); const w7u = { innerHTML: '' }; c7.CPR.render(w7u)
  ck('v7: the Urgent view shows only calls with a now or today card', /Check Kristie pay/.test(w7u.innerHTML) && !/DMV trip/.test(w7u.innerHTML), w7u.innerHTML.slice(0, 600))
  c7.CPR.setFilter('all'); globalThis.__EVENTS = []; globalThis.__OUTCOMES = []
  // ── v10: finding a call (search, day, calls or texts) and the prepared steps ──
  const now = Date.now(), ymd = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms))
  const TXT = { message_id: 'sms:m2', channel: 'text', call_at: new Date(now - 2 * 3600e3).toISOString(), read_at: 'z', direction: 'in', seconds: 0, caller: 'Dixie K.', match: 'one', who_name: 'Dixie Kuhn', who_roles: ['caregiver'], call_type: 'caregiver',
    tasks: [{ title: "Move Dixie's visit with LeeAnn tomorrow to 7-11", area: 'scheduling', urgency: 'today' }],
    detail: { summary: 'Dixie asks to move tomorrow with LeeAnn to 7-11.', items: [{ responsibility: 'Move the visit', decision: 'new_card', title: "Move Dixie's visit with LeeAnn tomorrow to 7-11", area: 'scheduling', urgency: 'today', due: '', reason: 'r', owner: { name: 'Krystal Land', via: 'on the Staffing seat at that hour' },
      actions: [{ kind: 'ask_client_family_permission', step: 1, to: 'LeeAnn Walker or her family', draft: 'Hi, Dixie asked to come at 7 tomorrow. Is that OK?', waits_for_yes: false },
        { kind: 'axiscare_visit_change', step: 2, to: 'AxisCare', draft: '', date: ymd(now + 864e5), start: '07:00', end: '11:00', client_name: 'LeeAnn', waits_for_yes: true, resolved: { found: true, visit: { client: 'LeeAnn Walker', caregiver: 'Dixie Kuhn', date: ymd(now + 864e5), start: '08:00', end: '12:00' }, after: { start: '07:00', end: '11:00' } } },
        { kind: 'text_client_caregivers', step: 3, to: "LeeAnn's caregivers", draft: 'FYI', waits_for_yes: true, resolved: { caregivers: ['Dixie Kuhn', 'Tanya Brooks'] } }] }] } }
  const OLDCALL = Object.assign({}, ROWS[2], { read_at: 'z', call_at: new Date(now - 3 * 864e5).toISOString(), channel: 'call', detail: { summary: 'Kristie asked about her pay.', items: [] } })
  const { ctx: cA } = make({ call_tasks_practice: true }, [TXT, OLDCALL])
  const wA = { innerHTML: '' }; cA.CPR.render(wA); await new Promise((r) => setTimeout(r, 20)); cA.CPR.render(wA)
  ck('v10: the steps show in order, who each goes to, the draft, the visit before and after from AxisCare, the caregivers it goes to, and which wait for their yes', /PREPARED, A PERSON PRESSES EACH STEP/.test(wA.innerHTML) && /1\. Ask permission<\/b> <span class="field-note">to LeeAnn Walker or her family/.test(wA.innerHTML)
    && /Dixie asked to come at 7 tomorrow/.test(wA.innerHTML) && /LeeAnn Walker with Dixie Kuhn, .*: 08:00–12:00 → <b>07:00–11:00<\/b> \(from AxisCare\)/.test(wA.innerHTML) && /Goes to: Dixie Kuhn, Tanya Brooks/.test(wA.innerHTML) && (wA.innerHTML.match(/Waits for their yes/g) || []).length === 2, wA.innerHTML.slice(0, 1500))
  ck('v10: a text reading says "texts" (not a call length)', /texts · caregiver/.test(wA.innerHTML))
  ck('v10: the search box, the day picker (Today, Yesterday, 14 days) and Calls / Texts are there', /id="cprQ"/.test(wA.innerHTML) && /<option value="">All 14 days<\/option>/.test(wA.innerHTML) && /Today<\/option>/.test(wA.innerHTML) && /Yesterday<\/option>/.test(wA.innerHTML) && /setChannel\('text'\)/.test(wA.innerHTML))
  cA.CPR.setQuery('leeann 7-11'); await new Promise((r) => setTimeout(r, 260)); const wQ = { innerHTML: '' }; cA.CPR.render(wQ)
  ck('v10 search: "leeann 7-11" finds Dixie\'s text and not the other call', /Move Dixie's visit with LeeAnn|Move Dixie&#39;s visit with LeeAnn/.test(wQ.innerHTML) && !/Kristie asked about her pay/.test(wQ.innerHTML), wQ.innerHTML.slice(0, 600))
  cA.CPR.setQuery('pay'); await new Promise((r) => setTimeout(r, 260)); const wQ2 = { innerHTML: '' }; cA.CPR.render(wQ2)
  ck('v10 search: "pay" finds Kristie\'s call (by its summary)', /Kristie asked about her pay/.test(wQ2.innerHTML) && !/LeeAnn Walker or her family/.test(wQ2.innerHTML))
  cA.CPR.setQuery(''); await new Promise((r) => setTimeout(r, 260))
  cA.CPR.setDay(ymd(now - 3 * 864e5)); const wD = { innerHTML: '' }; cA.CPR.render(wD)
  ck('v10 day picker: three days ago shows only that day\'s call', /Kristie asked about her pay/.test(wD.innerHTML) && !/LeeAnn Walker or her family/.test(wD.innerHTML))
  cA.CPR.setDay(''); cA.CPR.setChannel('text'); const wC = { innerHTML: '' }; cA.CPR.render(wC)
  ck('v10 Texts: only the text readings', /LeeAnn Walker or her family/.test(wC.innerHTML) && !/Kristie asked about her pay/.test(wC.innerHTML))
  cA.CPR.setChannel('call'); const wC2 = { innerHTML: '' }; cA.CPR.render(wC2)
  ck('v10 Calls: only the call readings', !/LeeAnn Walker or her family/.test(wC2.innerHTML) && /Kristie asked about her pay/.test(wC2.innerHTML))
  const { ctx: c3 } = make({ call_tasks_practice: true }, null, 'relation "public.call_task_reading" does not exist');
  const w3 = { innerHTML: '' }; c3.CPR.render(w3); await new Promise((r) => setTimeout(r, 20)); c3.CPR.render(w3);
  ck('before 650 has run: "This appears once Desktop step 650 has run."', /appears once Desktop step 650 has run/.test(w3.innerHTML), w3.innerHTML);
  // ── v13: nothing read quietly missing, and the promise watch ──
  {
    const ago = (min) => new Date(Date.now() - min * 60e3).toISOString();
    const R = (o) => Object.assign({ direction: 'in', seconds: 60, match: 'one', who_roles: [], call_type: 'client', tasks: [], resolves: [], no_task_reason: null, error: null, attempt: 1, detail: {} }, o);
    const rows = [
      R({ message_id: 'u1', call_at: ago(300), caller: 'Gail G.', who_name: 'Gail Green', seconds: 95, error: 'GoHighLevel has no transcript for this call (95 seconds). Listen to the recording.', attempt: 3 }),
      R({ message_id: 'u2', call_at: ago(200), caller: 'Hal H.', who_name: 'Hal Hill', error: 'overloaded', attempt: 3 }),
      R({ message_id: 'u3', call_at: ago(100), caller: 'Ivy I.', who_name: 'Ivy Ives', error: 'overloaded', attempt: 2 }),
      R({ message_id: 'p1', call_at: ago(3000), caller: 'Ann L.', who_name: 'Ann Late', detail: { summary: 'Ann asked about Tuesday.', commitments: [{ what: 'Call Ann back about Tuesday', kind: 'we_agreed', when: '' }, { what: 'Ann may add Saturdays', kind: 'caller_considering', when: '' }], items: [] } }),
      R({ message_id: 'p2', call_at: ago(60), caller: 'Bea K.', who_name: 'Bea Kept', channel: 'text', detail: { summary: 'Bea wants her new schedule.', commitments: [{ what: 'Text Bea the new schedule', kind: 'we_agreed', when: 'tomorrow' }], items: [] } })];
    globalThis.__PROMISES = [
      { message_id: 'p1', idx: 0, channel: 'call', call_at: ago(3000), who_name: 'Ann Late', what: 'Call Ann back about Tuesday', kind: 'we_agreed', area: 'scheduling', owner: { name: 'Krystal Land' }, due: '2026-10-09', status: 'would_remind', why: 'Nothing with them since the promise: no call, text or card.', evidence: [] },
      { message_id: 'p2', idx: 0, channel: 'text', call_at: ago(60), who_name: 'Bea Kept', what: 'Text Bea the new schedule', kind: 'we_agreed', area: 'client_care', owner: { name: 'Krystal Land' }, due: '2026-10-13', status: 'kept', why: 'The office texted Bea her new schedule.', evidence: ['Office text: new schedule sent'] },
      { message_id: 'p9', idx: 0, channel: 'call', call_at: ago(90), who_name: 'Cal Owed', what: 'Hear back from Cal\'s daughter', kind: 'awaiting_confirmation', area: 'family_enquiries', owner: { name: 'Krystal Land' }, due: '2026-10-14', status: 'waiting', why: '', evidence: [] },
      { message_id: 'p8', idx: 0, channel: 'call', call_at: ago(90), who_name: 'Old Gone', what: 'Dropped one', kind: 'we_agreed', area: 'scheduling', owner: {}, due: '2026-10-14', status: 'dropped', why: '', evidence: [] }];
    globalThis.__BEATS = [{ automation: 'call-tasks', at: ago(4), ok: true }, { automation: 'other', at: ago(900), ok: false }];
    const { ctx: cU, Q: QU } = make({ call_tasks_practice: true }, rows);
    const wU = { innerHTML: '' }; cU.CPR.render(wU); await new Promise((r) => setTimeout(r, 20)); cU.CPR.render(wU);
    const hU = wU.innerHTML;
    ck('v13: a banner says how many calls or texts could not be read and how many are being tried again, with a way to see them', /2 calls or texts could not be read\.<\/b> 1 being tried again\. Nothing is lost quietly/.test(hU) && /setFilter\('unread'\)/.test(hU), hU.slice(0, 900));
    ck('v13: the reader\'s last run is shown (4 min ago, healthy)', /Reader last ran 4 min ago<\/span>/.test(hU) && !/with a problem/.test(hU), hU.slice(0, 900));
    ck('v13: a call with no transcript says so, that the reader stopped, and to listen in GoHighLevel', /Not read<\/span> <span style="font-size:12.5px;">GoHighLevel has no transcript for this call \(95 seconds\)/.test(hU) && /stopped trying \(GoHighLevel has no transcript\)\. Listen to it in GoHighLevel/.test(hU), hU);
    ck('v13: after 3 failed tries it says the reader stopped (3 tries); on try 2 it says it is trying again', /stopped trying \(3 tries\)/.test(hU) && /Try 2 of 3/.test(hU), hU);
    ck('v13: each promise in a call shows its watch: would remind (due day, why); "considering" has none', /Call Ann back about Tuesday <span class="field-note">|Call Ann back about Tuesday <span/.test(hU) && /Would remind · due Fri, Oct 9/.test(hU) && /Nothing with them since the promise/.test(hU) && !/Ann may add Saturdays[^<]*<\/div>[^]*?Would remind · due/.test(hU.split('Ann may add Saturdays')[1]?.slice(0, 80) || ''), hU);
    ck('v13: it reads the promise watch and the heartbeat, and never writes', QU.some((q) => q.tb === 'call_promise_watch') && QU.some((q) => q.tb === 'app_data') && !QU.some((q) => q.write || q.rpc), JSON.stringify(QU));
    cU.CPR.setFilter('unread'); const wUn = { innerHTML: '' }; cU.CPR.render(wUn);
    ck('v13: "Couldn\'t read (3)" shows only the three that were not read', /Couldn't read \(3\)|Couldn&#39;t read \(3\)/.test(wUn.innerHTML) && /Gail Green/.test(wUn.innerHTML) && /Hal Hill/.test(wUn.innerHTML) && /Ivy Ives/.test(wUn.innerHTML) && !/Ann Late/.test(wUn.innerHTML), wUn.innerHTML.slice(0, 900));
    cU.CPR.setFilter('promises'); const wP = { innerHTML: '' }; cU.CPR.render(wP); const hP = wP.innerHTML;
    ck('v13 Promises: past due with no sign it was kept first, then still owed, then kept; dropped ones hidden', /Promises \(1 past due\)/.test(hP) && hP.indexOf('PAST DUE, NO SIGN IT WAS KEPT (1)') > -1 && hP.indexOf('PAST DUE') < hP.indexOf('STILL OWED (1)') && hP.indexOf('STILL OWED') < hP.indexOf('">KEPT (1)') && !/Dropped one/.test(hP), hP.slice(0, 1500));
    ck('v13 Promises: each shows who, owner, due day, what it saw and the evidence; past due says who would be reminded, and that nobody is in practice', /<b>With:<\/b> Ann Late · <b>Owner:<\/b> Krystal Land · <b>Due:<\/b> Fri, Oct 9/.test(hP) && /Live, Krystal would get a reminder the next morning\. In practice nobody is reminded\./.test(hP) && /<li>Office text: new schedule sent<\/li>/.test(hP), hP);
    cU.CPR.openCall('p2'); const wO = { innerHTML: '' }; cU.CPR.render(wO);
    ck('v13 Promises: "See the texts" opens just that conversation, with a way back', /See the texts<\/a>/.test(hP) && /Showing one text conversation\./.test(wO.innerHTML) && /Bea wants her new schedule/.test(wO.innerHTML) && !/Ann asked about Tuesday/.test(wO.innerHTML) && /openCall\(''\)/.test(wO.innerHTML), wO.innerHTML.slice(0, 900));
    cU.CPR.openCall(''); const wB = { innerHTML: '' }; cU.CPR.render(wB);
    ck('v13 Promises: back returns to the promises', /PAST DUE, NO SIGN IT WAS KEPT/.test(wB.innerHTML));
    globalThis.__BEATS = [{ automation: 'call-tasks', at: ago(95), ok: false }];
    const { ctx: cS } = make({ call_tasks_practice: true }, rows); const wS = { innerHTML: '' }; cS.CPR.render(wS); await new Promise((r) => setTimeout(r, 20)); cS.CPR.render(wS);
    ck('v13: a stopped or failing reader shows in red', /color:var\(--red\);font-weight:700;">Reader last ran 2 h ago, with a problem/.test(wS.innerHTML), wS.innerHTML.slice(0, 900));
    globalThis.__PROMISES = []; globalThis.__BEATS = [];
  }
  ck('no em dash in the module', !/[—―]/.test(src));
  const failed = res.filter((r) => !r[1]);
  for (const [n, ok, note] of res) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '\n      ' + note}`);
  console.log(`\n${res.length - failed.length}/${res.length} passed${failed.length ? ' · FAIL' : ''}`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.log('FAIL  crashed: ' + e.stack); process.exit(1); });
