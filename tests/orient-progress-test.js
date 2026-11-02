/* node tests/orient-progress-test.js
   The Orientation tab (2026-11-01, Samantha): who was invited and when, the unit they are on, who is stuck, who finished.
   Runs orient-progress.js's own reading of each person (OPR._read) on made-up people, and checks the page wiring and the
   copy rules (no em dash, nothing texted). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'orient-progress.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };

const ctx = { console, Date, JSON, String, Array, Object, Number, Math, isNaN, setInterval: () => 0, window: {}, document: { getElementById: () => null, visibilityState: 'visible' },
  DATA: { ops_settings: {} } };
vm.createContext(ctx); vm.runInContext(src, ctx);
const OPR = ctx.window.OPR;
const H = 3600e3, D = 24 * H, ago = ms => new Date(Date.now() - ms).toISOString();
const full = n => ({ module: n, scene: 9, complete: true, heard: 10, first_at: ago(5 * D), last_at: ago(5 * D), moved_at: ago(5 * D) });

ck('eleven units, in order', OPR._units.length === 11 && OPR._units.map(u => u[0]).join() === '1,2,3,4,5,6,7,8,9,10,11');

let p = OPR._read({ status: 'not_started', assigned_at: ago(10 * D), welcome_sent_at: ago(3 * D), units: [] });
ck('invited 3 days ago, never opened: not started, needs you', p.state === 'notstarted' && /has not opened/.test(p.alert) && !p.soft, p);
ck('the invite day is the welcome send, not the older assignment', Math.abs(p.invited - (Date.now() - 3 * D)) < 5000);

p = OPR._read({ status: 'not_started', assigned_at: ago(20 * H), units: [] });
ck('invited 20 hours ago: waiting, no alert yet', p.state === 'notstarted' && !p.alert, p);

p = OPR._read({ status: 'in_progress', units: [full(1), full(2), full(3), { module: 4, scene: 2, complete: false, heard: 3, first_at: ago(4 * D), last_at: ago(3 * D), moved_at: ago(3 * D) }] });
ck('three units done, on Unit 4 screen 3, nothing new for 3 days: stuck', p.state === 'inprogress' && p.done === 3 && p.cur[0] === 4 && /Stuck on Unit 4, screen 3 of 12/.test(p.alert), p.alert);
ck('stuck is not the soft kind (it counts on the pill)', !p.soft);

p = OPR._read({ status: 'in_progress', units: [full(1), { module: 2, scene: 5, complete: false, heard: 6, first_at: ago(3 * D), last_at: ago(1 * H), moved_at: ago(3 * D) }] });
ck('came back an hour ago but no new screen for 3 days: says they could not get further', /could not get further/.test(p.alert), p.alert);

p = OPR._read({ status: 'in_progress', units: [full(1), { module: 2, scene: 5, complete: false, heard: 6, first_at: ago(3 * D), last_at: ago(2 * H), moved_at: ago(2 * H) }] });
ck('moving today: in orientation, no alert', p.state === 'inprogress' && !p.alert && p.cur[0] === 2, p);

ctx.DATA.ops_settings.orient_stuck_days = 5;
p = OPR._read({ status: 'in_progress', units: [full(1), { module: 2, scene: 5, complete: false, heard: 6, first_at: ago(4 * D), last_at: ago(3 * D), moved_at: ago(3 * D) }] });
ck('the office can set stuck to 5 days: 3 days still is not stuck', !p.alert, p.alert);
ctx.DATA.ops_settings.orient_stuck_days = 99;
p = OPR._read({ status: 'in_progress', units: [{ module: 1, scene: 0, complete: false, heard: 1, first_at: ago(3 * D), last_at: ago(3 * D), moved_at: ago(3 * D) }] });
ck('a setting out of range falls back to 2 days', /Stuck on Unit 1/.test(p.alert), p.alert);
ctx.DATA.ops_settings = {};

p = OPR._read({ status: 'complete', completed_at: ago(D), attested_at: ago(D), units: [1,2,3,4,5,6,7,8,9,10,11].map(full) });
ck('finished and signed off: done, no alert', p.state === 'done' && !p.alert && p.done === 11);
p = OPR._read({ status: 'complete', completed_at: ago(D), units: [] });
ck('finished, never signed off: a soft note (not on the pill)', p.state === 'done' && /never signed off/.test(p.alert) && p.soft);
p = OPR._read({ status: 'complete', completed_at: ago(D), signoff_note_at: ago(D), units: [] });
ck('finished with the office note on the sign-off: no alert', !p.alert);

ck('the pill is in Recruit & Onboard, right after Onboarding', /id="bgrPillBadge"[^\n]*\n[^\n]*\n\s*<div class="fpill" data-tab="orientprog"/.test(html));
ck('the tab is in the interviews group', /interviews:\[[^\]]*'orientprog'/.test(html));
ck('the panel and its mount exist', html.includes('id="tab-orientprog"') && html.includes('id="orpMount"'));
ck('opening the tab draws it', html.includes("if(activeTab==='orientprog' && window.OPR) OPR.mount();"));
ck('both sign-in paths start the pill count', (html.match(/if\(window\.OPR\) OPR\.watch\(\)/g) || []).length === 2);
ck('the script is loaded', html.includes('<script src="orient-progress.js?v=1"></script>'));
const ENG = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
const KEY = (ENG.match(/const TRAINING_HUB_ANON='([^']+)'/) || [])[1];
ck('reads through the office-only hub-training-data server, with the same public key as the engine', !!KEY && src.includes("FN + '?action=orientation_progress'") && src.includes('functions/v1/hub-training-data') && src.includes("const ANON = '" + KEY + "'") && src.includes("'x-hub-token':await trainHubTok()"));
const code = src.replace(/\/\*[\s\S]*?\*\//g, '');
ck('does not need caregivers-engine.js loaded (the pill count runs at sign-in)', !code.includes('TRAINING_DATA_FN') && !code.includes('TRAINING_HUB_ANON'));
ck('calls go from the office line (ocAttrs), never a bare tel: link', src.includes('ocAttrs(r.phone') && !/tel:/.test(src));
ck('nothing on this page texts or emails anyone', !/ghl|send-reminder|send-invite|sms/i.test(src.replace(/^\s*\/\*[\s\S]*?\*\//m, '')));
ck('no em dash in the copy', !src.includes('—') && !html.slice(html.indexOf('id="tab-orientprog"') - 200, html.indexOf('id="orpMount"')).includes('—'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
