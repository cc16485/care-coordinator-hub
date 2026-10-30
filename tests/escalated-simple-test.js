/* node tests/escalated-simple-test.js
   Escalated to you, made simple (Samantha 2026-10-30). The real escalated-simple.js with a fake page and fake Hub
   helpers (persist, opsTriage, TA, ccConfirm, tkMerge). Proves: grouped by person (busiest first, nobody last), only
   care at risk and promises one by one, the one-line card with three buttons, Leave with keeps the owner and clears the
   escalation with a dated stop, Leave the rest asks first and never touches care-at-risk cards, Close offers two
   reasons that use the existing close, the menu has at most four choices, the switch is owners only and saves only its
   own key, no em dashes. Made-up people only. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const code = fs.readFileSync(path.join(__dirname, '..', 'escalated-simple.js'), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };
const NOW = Date.parse('2026-10-30T15:00:00Z'), day = 864e5, ago = (d) => new Date(NOW - d * day).toISOString();
const card = (id, o) => Object.assign({ id, status: 'open', owner: 'kim@cc.test', kind: 'call_followup', title: 'Reply to Ann B. about her schedule (text Oct 14)', about: 'Ann B.', due: ago(14),
  escalation: { to: 'sam@cc.test', why: 'it is overdue', at: ago(1) } }, o || {});

function world({ items, isOwner = true, answer = true, settings = {} } = {}) {
  const els = {}, saved = [], triaged = [], asked = [], merged = [], took = [], popped = [];
  const el = (id) => els[id] || (els[id] = { id, innerHTML: '', textContent: '', style: {}, disabled: false, querySelectorAll: () => [] });
  const W = {
    DATA: { ops_items: items || [], ops_settings: Object.assign({ escalated_simple_live: true }, settings) },
    ME: { email: 'sam@cc.test', name: 'Sam T' }, ccActor: () => ({ email: 'sam@cc.test', name: 'Sam T' }), ccIsOwner: () => isOwner,
    opsOwnerName: (e) => ({ 'kim@cc.test': 'Kim Lee', 'pat@cc.test': 'Pat Ray' }[e] || e),
    persist: async (k, x) => { saved.push(JSON.parse(JSON.stringify(x))); },
    opsLog: (x, t) => { (x.history = x.history || []).push({ text: t }); }, opEvent: () => {},
    opsTriage: async (id, what) => { triaged.push([id, what]); }, opsTakeIt: async (id) => took.push(['take', id]),
    TA: { transfer: (id) => took.push(['transfer', id]), helpWith: (id) => took.push(['help', id]), critical: (it) => it.kind === 'staffing_issue' },
    TW: { callKept: (it) => String(it.id).indexOf('cfp_') === 0 || String(it.id).indexOf('cfu_') === 0 || it.urgency === 'urgent' || it.domain === 'incidents' || (it.domain === 'client_care' && it.urgency === 'today') },
    ccConfirm: async (t) => { asked.push(t); return answer; },
    tkMerge: async (apply) => { const m = Object.assign({}, W.DATA.ops_settings); const ch = apply(m); merged.push(m); W.DATA.ops_settings = m; return { error: null, ch }; },   /* the page's DATA is the same object */
    ccPopOpen: (anchor, html) => { popped.push(html); return { querySelectorAll: () => [] }; }, ccPopClose: () => {}, ccToast: () => {},
    myWorkCard: (it) => '<FULLCARD ' + it.id + '>', myWorkRefresh: () => {}, myWorkRows: () => W.DATA.ops_items.filter((x) => x.status === 'open'),
    suTalk: { forWork: () => false }, myWorkTalk: () => {}, opsWaitOpen: () => {}, dkAllowed: () => true, dkJotWork: () => {},
  };
  const ctx = { window: W, DATA: W.DATA, ME: W.ME, document: { getElementById: el, body: {} }, alert: (t) => asked.push('ALERT ' + t), console, Date, Math, JSON, String, Number, Object, Array, Map, Set, isFinite, Promise };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  return { E: W.ESC, W, els, saved, triaged, asked, merged, took, popped };
}

(async () => {
  /* 1 · grouping and the care-at-risk rule */
  const items = [
    card('cf_1'), card('cf_2', { due: ago(10) }), card('cfp_3', { title: 'Call the family back as promised', due: ago(3) }),
    card('cn_4', { kind: 'care_note', domain: 'client_care', urgency: 'today', title: 'Shift note: client fell, check in', about: 'Bo C.' }),
    card('cn_5', { kind: 'care_note', title: 'Shift note: ran out of gloves', about: 'Bo C.' }),
    card('st_6', { kind: 'staffing_issue', title: 'Missed clock-in', owner: 'pat@cc.test' }),
    card('x_7', { owner: '', title: 'New request from the website', about: 'Cy D.' }),
  ];
  let w = world({ items });
  const G = w.E.groups(items, NOW);
  ck('groups: one per person, busiest first, nobody last', G.map((g) => g.owner).join() === 'kim@cc.test,pat@cc.test,', G.map((g) => g.owner));
  ck('only care at risk and promises one by one (promise, client care today, critical)', G[0].top.map((x) => x.id).sort().join() === 'cfp_3,cn_4' && G[1].top.map((x) => x.id).join() === 'st_6', G.map((g) => g.top.map((x) => x.id)));
  ck('the rest stay grouped', G[0].rest.map((x) => x.id).sort().join() === 'cf_1,cf_2,cn_5');
  ck('days late', w.E.daysLate(items[0], NOW) === 14 && w.E.daysLate({ due: new Date(NOW + 3600e3).toISOString() }, NOW) === -1);

  /* 2 · the page */
  w.E.render(w.els.wrap = { innerHTML: '' }, items, '', NOW);
  const h = w.els.wrap.innerHTML;
  ck('person heading: name, count, kinds, oldest', /<b style="font-size:15px;">Kim<\/b><span>· 5 late cards<\/span>/.test(h) && /3 call follow-ups, 2 shift-note flags; oldest due Oct 16/.test(h), h.slice(0, 900));
  ck('says what is listed one by one', /One by one below: the 2 about a client’s care at risk or a promise to a family\./.test(h));
  ck('Leave the other 3 with Kim, and Show all 5', /Leave the other 3 with Kim/.test(h) && /Show all 5/.test(h));
  ck('only the listed cards are drawn as lines', (h.match(/class="card esc-line"/g) || []).length === 4 && /esc_cfp_3/.test(h) && !/esc_cf_1/.test(h), (h.match(/esc_[\w]+/g) || []));
  const at3 = h.indexOf('id="esc_cfp_3"'), one = h.slice(at3, h.indexOf('class="card', at3 + 10));
  ck('one line: what, then "3 days late · Kim’s"', /Call the family back as promised/.test(one) && /3 days late · Kim’s/.test(one) && /<b>Ann B\.<\/b>/.test(one), one);
  ck('three buttons and ⋯: I’ll do it, Leave with Kim, Close', /I’ll do it/.test(one) && /Leave with Kim/.test(one) && /Close ▾/.test(one) && />⋯</.test(one)
    && !/Help with this|Take it…|Helping keeps it|Why you’re seeing this|Talk about/.test(one), one);
  ck('nobody’s card: no Leave with', /New request from the website/.test(h) ? !/Leave with Nobody/.test(h) : true);
  ck('Nobody group lists everything (nothing to leave it with)', /Nobody<\/b>/.test(h));
  w.E.toggle('cfp_3'); w.E.render(w.els.wrap, items, '', NOW);
  ck('tapping a line shows the full card underneath', /<FULLCARD cfp_3>/.test(w.els.wrap.innerHTML));
  w.E.showAll('kim@cc.test'); w.E.render(w.els.wrap, items, '', NOW);
  ck('Show all lists all 5 of Kim’s', /esc_cf_1/.test(w.els.wrap.innerHTML) && /Show fewer/.test(w.els.wrap.innerHTML) && !/Leave the other/.test(w.els.wrap.innerHTML));
  ck('no em dashes anywhere a person reads', !/[—–]/.test(code.replace(/\/\*[\s\S]*?\*\//g, '')));
  w.E.render(w.els.wrap, [], '', NOW);
  ck('empty: the same "Nothing has been escalated to you. Good."', /Nothing has been escalated to you\. Good\./.test(w.els.wrap.innerHTML));

  /* 3 · Leave with */
  w = world({ items: [card('cf_1'), card('cfp_3')] });
  await w.E.leave('cf_1');
  const x = w.saved[0];
  ck('Leave with: still Kim’s, escalation cleared, dated stop for 3 days, said in its history', x.owner === 'kim@cc.test' && x.escalation.cleared_at && /left with Kim/.test(x.escalation.cleared_why)
    && x.left_with_owner.owner === 'kim@cc.test' && x.left_with_owner.by === 'sam@cc.test' && Date.parse(x.left_with_owner.until) - Date.parse(x.left_with_owner.at) === 3 * day
    && /Sam T left this with Kim: it stays Kim’s \(not escalated again for 3 days\)/.test(x.history.at(-1).text), x);
  ck('Leave with never closes or changes the card otherwise', x.status === 'open' && x.title === card('cf_1').title && w.triaged.length === 0);
  w = world({ items: [card('cf_1')], settings: { escalated_leave_days: 5 } }); await w.E.leave('cf_1');
  ck('the number of days is a Hub setting (escalated_leave_days)', Date.parse(w.saved[0].left_with_owner.until) - Date.parse(w.saved[0].left_with_owner.at) === 5 * day);
  w = world({ items: [card('cf_1'), card('cf_2'), card('cfp_3'), card('cn_4', { domain: 'client_care', urgency: 'today' }), card('o_9', { owner: 'pat@cc.test' })] });
  await w.E.leaveRest('kim@cc.test');
  ck('Leave the rest: asks first, then leaves only Kim’s non-urgent ones', /Leave these 2 with Kim\?/.test(w.asked[0]) && /None is closed, and nothing is sent to anyone/.test(w.asked[0])
    && w.saved.map((s) => s.id).sort().join() === 'cf_1,cf_2', w.saved.map((s) => s.id));
  w = world({ items: [card('cf_1')], answer: false }); await w.E.leaveRest('kim@cc.test');
  ck('Leave the rest: Cancel changes nothing', w.saved.length === 0);

  /* 4 · I’ll do it, Close, ⋯ */
  w = world({ items: [card('cf_1'), card('x_7', { owner: '' })] });
  await w.E.take('cf_1'); await w.E.take('x_7');
  ck('I’ll do it: someone else’s card goes through Take it with a reason; nobody’s is just taken', w.took[0].join() === 'transfer,cf_1' && w.took[1].join() === 'take,x_7');
  w.W.DATA.ops_items[0].owner = 'sam@cc.test'; w.E.render(w.els.wrap = { innerHTML: '' }, [], '', NOW);
  ck('a card I took shows at the top as the full card, under YOURS NOW', /YOURS NOW · 1/.test(w.els.wrap.innerHTML) && /<FULLCARD cf_1>/.test(w.els.wrap.innerHTML));
  w.E.closeMenu('cf_1');
  ck('Close: two reasons only, Done elsewhere and No longer needed', (w.popped[0].match(/ccpick-row/g) || []).length === 2 && /data-what="already_handled"[^>]*>Done elsewhere/.test(w.popped[0]) && /data-what="stale"[^>]*>No longer needed/.test(w.popped[0]), w.popped[0]);
  w = world({ items: [card('cf_1')] }); w.E.more('cf_1');
  ck('⋯ has four choices: Help with this (stays Kim’s), Waiting, Talk about, Jot', (w.popped[0].match(/ccpick-row/g) || []).length === 4 && /Help with this \(it stays Kim’s\)/.test(w.popped[0])
    && /Waiting on someone… \(with a date\)/.test(w.popped[0]) && /Talk about it at the meeting/.test(w.popped[0]) && /Jot on my desk/.test(w.popped[0]), w.popped[0]);

  /* 5 · the switch */
  w = world({ settings: { escalated_simple_live: false } });
  ck('off by default', w.E.on() === false);
  w.E.settingsFill();
  ck('settings: Off, with a Turn on button for owners', /Off\./.test(w.els.escSetNow.innerHTML) && w.els.escToggleBtn.textContent === 'Turn on the simpler Escalated to you');
  await w.E.settingsToggle(null);
  ck('turning it on saves only its own key, and says nothing is sent', w.merged.length === 1 && w.merged[0].escalated_simple_live === true && Object.keys(w.merged[0]).filter((k) => !/^escalated_simple_live/.test(k)).join() === 'escalated_simple_live'.slice(0, 0)
    && /Nothing is sent to anyone/.test(w.asked[0]), w.merged);
  w = world({ settings: { escalated_simple_live: false }, answer: false }); await w.E.settingsToggle(null);
  ck('Cancel saves nothing', w.merged.length === 0);
  w = world({ settings: { escalated_simple_live: false }, isOwner: false }); w.E.settingsFill(); await w.E.settingsToggle(null);
  ck('not an owner: no button, cannot change it', w.merged.length === 0 && w.els.escToggleBtn.style.display === 'none');

  /* 6 · the hook in index.html: only on the Escalated tab, only with the switch on */
  const ix = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ck('index.html: one hook, guarded by the tab and the switch', (ix.match(/ESC\.render\(/g) || []).length === 1 && /if\(MYWORK_TAB==='escalated' && window\.ESC && ESC\.on\(\)\)\{ ESC\.render\(wrap, rows, narrow\); return; \}/.test(ix));
  ck('index.html: loads the file once, and the Settings switch is there', (ix.match(/escalated-simple\.js\?v=1/g) || []).length === 1 && /id="escToggleBtn" onclick="ESC\.settingsToggle\(this\)"/.test(ix));

  console.log(`\n${pass}/${pass + fail} passed` + (fail ? ' · FAILURES' : ' · ALL PASSED'));
  process.exit(fail ? 1 : 0);
})();
