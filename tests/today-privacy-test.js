/* node tests/today-privacy-test.js
   Today privacy (2026-10-18, Samantha: "fix the privacy gap first"). An employment card (sensitive: a write-up, coaching,
   an HR file) must never show its title on a shared list to someone who can't open it. Found in the Today page map: the
   Dashboard's overnight list and family updates, the To talk about box and list, Worth mentioning, the stand-up prep
   list, and "what the team did since you were last here" read the cards without asking opsCanSee. The real opsCanSee,
   standup-board.js and ccSinceFetch run against made-up people and a fake database. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sbSrc = fs.readFileSync(path.join(ROOT, 'standup-board.js'), 'utf8');
const cut = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return html.slice(a, b); };
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const SECRET = 'Write-up for Pat Example (third late arrival)';
const OWNER = 'owner@cc.test', ZACH = 'zach@cc.test', KRYS = 'krys@cc.test';
const NOW = new Date().toISOString();
const OPS = () => [
  { id: 'ops_secret', kind: 'discipline', sensitive: true, status: 'open', urgency: 'urgent', title: SECRET, about: 'Pat Example', owner: ZACH, created_by_email: ZACH, created_at: NOW },
  { id: 'ops_plain', kind: 'client_issue', status: 'open', urgency: 'urgent', title: 'Call Ann about Tuesday', about: 'Ann Back', owner: KRYS, created_at: NOW },
];
const NOTES = () => [
  { id: 'su_secret', source: 'work', ops_id: 'ops_secret', summary: SECRET, assigned_to_email: ZACH, status: 'open', created_at: NOW, history: [] },
  { id: 'su_plain', source: 'work', ops_id: 'ops_plain', summary: 'Call Ann about Tuesday', assigned_to_email: KRYS, status: 'open', created_at: NOW, history: [] },
  { id: 'su_desk', source: 'desk', summary: 'Order more gloves', assigned_to_email: KRYS, status: 'open', created_at: NOW, history: [] },
];

/* the real opsCanSee, as signed in as `who` */
function canSeeFor(who) {
  const c = { ME: { email: who }, ccIsOwner: (e) => e === OWNER, opsMeKey: () => who, String };
  vm.createContext(c); vm.runInContext(cut('function opsCanSee(i){', '\n}\n') + '\n}\nthis.opsCanSee = opsCanSee;', c);
  return c.opsCanSee;
}

function board(who) {
  const els = {};
  const el = (id) => els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', style: {}, appendChild() {} });
  const ctx = {
    console, Date, JSON, Math, Promise, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, String, Number, Array, Object, Set, Map, RegExp, Error,
    escapeHtmlComms: esc, DATA: { ops_items: OPS(), coverage_cases: [] }, opsCanSee: canSeeFor(who),
    ccActor: () => ({ email: who, name: who.split('@')[0] }),
    roleEveryone: () => [{ email: OWNER, name: 'Sam Owner' }, { email: ZACH, name: 'Zach' }, { email: KRYS, name: 'Krys' }],
    opsPriorityKey: (i) => [i.urgency === 'urgent' ? 0 : 3], opsOwnerTag: (i) => i.owner, opsKindLabel: (k) => k,
    document: { getElementById: el, createElement: () => ({ style: {} }), head: { appendChild() {} }, addEventListener() {}, visibilityState: 'visible' },
    sb: { from: () => { const b = { select: () => b, eq: () => b, maybeSingle: async () => ({ data: { data: NOTES() }, error: null }) }; return b; } },
    activeTab: 'today',
  };
  ctx.window = ctx; ctx.addEventListener = () => {}; ctx.innerWidth = 1200;
  vm.createContext(ctx); vm.runInContext(sbSrc, ctx);
  return { ctx, el };
}

(async () => {
  /* the rule itself */
  ck('rule: Krystal cannot open the write-up; Zach (it is his) and the owner can', !canSeeFor(KRYS)(OPS()[0]) && canSeeFor(ZACH)(OPS()[0]) && canSeeFor(OWNER)(OPS()[0]) && canSeeFor(KRYS)(OPS()[1]));

  for (const [who, sees] of [[KRYS, false], [ZACH, true], [OWNER, true]]) {
    const nm = who.split('@')[0];
    const { ctx, el } = board(who);
    await ctx.suTalk.load(true);
    ctx.suTodayRender();
    const box = el('suTodayLine').innerHTML;
    ck(`${nm}: Dashboard To talk about box ${sees ? 'shows' : 'does not show'} the write-up; the other flags show`, box.includes(esc(SECRET)) === sees && box.includes('Call Ann about Tuesday') && box.includes('Order more gloves'), box.slice(0, 400));
    ck(`${nm}: the flagged count ${sees ? 'includes' : 'leaves out'} it`, box.includes((sees ? 3 : 2) + ' flagged'), (/\d+ flagged/.exec(box) || [])[0]);
    const prep = ctx.prepList();
    const txt = JSON.stringify(prep);
    ck(`${nm}: the stand-up prep list (Team Meetings, Worth mentioning) ${sees ? 'has' : 'does not have'} it, as a flag or an urgent card`, txt.includes(SECRET) === sees && txt.includes('Ann Back'), prep.map((r) => r.sec + ': ' + r.title));
    ctx.suRender();
    const list = el('suWrap').innerHTML;
    ck(`${nm}: the To talk about list and Worth mentioning ${sees ? 'show' : 'do not show'} it`, list.length > 200 && list.includes(esc(SECRET)) === sees && list.includes('Order more gloves'), list.slice(0, 300));
  }

  /* the Dashboard hero: the one list behind overnight, pass-alongs and family updates asks opsCanSee */
  const hero = cut('function renderTodayHero(', '/* ── NEW TODAY (2026-10-19');
  ck('Dashboard hero: its open-card list asks opsCanSee', /const open=\(DATA\.ops_items\|\|\[\]\)\.filter\(i=>i\.status==='open'&&opsCanSee\(i\)\);/.test(hero));
  ck('Dashboard hero: overnight, pass-alongs and family updates all come from that list', /const onOps=open\./.test(hero) && /const myPass=open\./.test(hero) && /const famCalls=open\./.test(hero) && !/DATA\.ops_items/.test(hero.replace("const open=(DATA.ops_items||[])", '')), 'another read of DATA.ops_items in the hero');

  ck('new Today strip: Since you left asks opsCanSee too', /i&&i\.status==='open'&&opsCanSee\(i\)&&born\(i\.created_at\)/.test(cut('function todayOvernight(){', 'async function tsShifts(')));
  /* since you were last here: events about a card you can't open are left out */
  for (const [who, sees] of [[KRYS, false], [OWNER, true]]) {
    const events = [{ at: NOW, actor_email: ZACH, verb: 'closed', summary: 'Closed: ' + SECRET, item_id: 'ops_secret' },
      { at: NOW, actor_email: ZACH, verb: 'closed', summary: 'Closed: Call Ann', item_id: 'ops_plain' }, { at: NOW, actor_email: ZACH, verb: 'note', summary: 'No card', item_id: null }];
    const c = { console, String, Array, JSON, DATA: { ops_items: OPS() }, ME: { email: who }, opsCanSee: canSeeFor(who), CC_SINCE: [], CC_SINCE_NOISE: [], ccSeenLast: () => '2026-10-01T00:00:00Z', ccSeenStamp() {},
      renderSinceYouLeft() {}, sb: { from: () => { const b = { select: () => b, gt: () => b, order: () => b, limit: async () => ({ data: events, error: null }) }; return b; } } };
    vm.createContext(c); vm.runInContext(cut('async function ccSinceFetch(){', '/* "Seen" = a real interaction') + '\nthis.f = ccSinceFetch;', c);
    await c.f();
    const got = JSON.stringify(vm.runInContext('CC_SINCE', c));
    ck(`since you left (${who.split('@')[0]}): ${sees ? 'includes' : 'leaves out'} the write-up; other events stay`, got.includes(SECRET) === sees && got.includes('Call Ann') && got.includes('No card'), got);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('FAIL  crashed: ' + (e && e.stack || e)); process.exit(1); });
