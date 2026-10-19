/* node tests/today-one-count-test.js
   One count everywhere, and the EVV leftovers gone (2026-10-18, the Today page map, her yes). The header chip, the
   greeting, the Dashboard tile and the red Today badge all say the same "need you now" number (opsTodayCounts().act);
   the coverage tile no longer counts new-client checks; EVV (retired 2026-10-17) is off the Dashboard, the stand-up
   list and End my shift. The real ccRenderPulse runs against made-up counts. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const cut = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return html.slice(a, b); };
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 400))); };

/* the badge follows the header's number */
function pulse(act, late) {
  const els = { topbarPulse: { innerHTML: '' }, todayBadge: { style: {}, textContent: 'old' } };
  const c = { DATA: { leads: [], ghe_forms: [] }, document: { getElementById: (id) => els[id] || null }, today: () => '2026-10-18',
    opsLateFor: () => new Array(late).fill(0), opsLateUnowned: () => [], opsMeKey: () => 'me', ciLatestByClient: () => [],
    opsTodayCounts: () => ({ act, late }), String, Array };
  vm.createContext(c); vm.runInContext(cut('function ccRenderPulse(){', '\nfunction ') + '\nthis.f = ccRenderPulse;', c); c.f();
  return els;
}
let e = pulse(3, 5);
ck('badge: the red Today badge shows the same number as the "need you now" chip', e.todayBadge.textContent === 3 && e.todayBadge.style.display === 'inline-flex' && /<b>3<\/b> need/.test(e.topbarPulse.innerHTML), [e.todayBadge, e.topbarPulse.innerHTML.slice(0, 120)]);
e = pulse(0, 5);
ck('badge: nothing needs you now, so no badge (late work is the chip\'s job)', e.todayBadge.style.display === 'none');
ck('badge: renderToday no longer counts activities and lead dates into it', !/overdueA\.length\+overdueL\.length\+dueA\.length\+dueL\.length/.test(html) && /try\{ ccRenderPulse\(\); \}catch\(e\)\{\}   \/\* the Today badge/.test(html));

const hero = cut('function renderTodayHero(', 'async function heroLoadShifts(');
ck('tile: "need you now" with opsTodayCounts().act, not "for you today" (every lane)', /act=opsTodayCounts\(\)\.act/.test(hero) && /'need you now'/.test(hero) && !/for you today/.test(hero));
ck('coverage: a new-client check (kind interest) is not counted as a coverage case', /c\.status==='open'&&String\(c\.kind\)!=='interest'/.test(hero));
ck('EVV: no EVV misses tile and no "Yesterday\'s EVV misses" card on the Dashboard', !/EVV misses/.test(hero) && !/evv_missing/.test(hero));
ck('EVV: the huddle question no longer asks about EVV', !/What compliance, EVV, billing/.test(html));
ck('EVV: the stand-up list and End my shift no longer collect EVV fix cards', !/'evv_fix'/.test(rd('standup-board.js')) && !/'evv_fix'/.test(rd('end-shift.js')));
ck('wording: Call Follow Ups says "it made" while cards are live', /\(live\(\) \? ' it made' : ' it would have made'\)/.test(rd('call-practice.js')));
ck('wording: the scorecard no longer calls To talk about its own tab', !/To talk about is its own tab/.test(html));
ck('versions bumped so browsers load the changed files', /standup-board\.js\?v=15"/.test(html) && /end-shift\.js\?v=9"/.test(html) && /call-practice\.js\?v=12"/.test(html));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
