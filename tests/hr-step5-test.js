// HR Agent step 5 (2026-10-18): the coaching tracker screens. node tests/hr-step5-test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const H = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SRC = fs.readFileSync(path.join(ROOT, 'hr.js'), 'utf8');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : String(d === undefined ? '' : d).slice(0, 300)]);
ck('every change goes through the database door, never a direct table write', /sb\.rpc\('hr_coaching_act'/.test(SRC) && !/from\('hr_coaching'\)\.(update|insert|delete|upsert)/.test(SRC));
ck('the record form needs date, how, discussed, response and expectation', /if \(!p\.held_on \|\| !p\.discussed \|\| !p\.response \|\| !p\.expectation\)/.test(SRC));
ck('Help me with this conversation: tips plus Ask Zach, and the coordinator stays the owner', /Help me with this conversation/.test(SRC) && /Ask Zach/.test(SRC) && /You stay the owner/.test(SRC));
ck('flag wrong, not needed and hand off each ask for a reason', /This flag is wrong/.test(SRC) && /Coaching isn\\'t right here/.test(SRC) && /Hand it to someone else/.test(SRC) && /Write the reason first/.test(SRC));
ck('postpone asks why and says Zach sees it', /Say why it has to wait first/.test(SRC) && /Zach sees how often a talk is postponed/.test(SRC));
ck('the 30-day check asks if it helped', /30 days on: did it help\?/.test(SRC));
ck('oversight separates asking for help from postponing', /Asking for help is a good sign/.test(SRC) && /Postponed 2\+/.test(SRC));
ck('assigning is for owners, coaching or recognition only, with editable talking points', /if \(!owner\(\) \|\| \(c\.kind !== 'coaching' && c\.kind !== 'recognition'\)\) return ''/.test(SRC) && /Suggested talking points \(edit them\)/.test(SRC));
ck('talking points exist for every watched rule and kind words', ['w06', 'w01', 'w02', 'w03', 'w05', 'kind'].every((r) => new RegExp('\\b' + r + ': first \\+').test(SRC)));
ck('no em dashes in hr.js', !/—/.test(SRC));
ck('My Work: coaching is a card kind', /coaching:\s*\{ label:'Coaching'/.test(H));
ck('My Work: a coaching card can only be finished on HR, Coaching', /if\(it\.kind==='coaching'\)\{ location\.hash='hr\/coaching'; return; \}/.test(H));
ck('Performance shows coaching history from hr_coaching, read only', /async function cgdCoachMount\(c\)/.test(H) && /from\('hr_coaching'\)\.select\('\*'\)\.eq\('axiscare_caregiver_id'/.test(H) && /try\{ cgdCoachMount\(c\); \}catch/.test(H));
ck('hr.js is cache-busted', /hr\.js\?v=20261018d/.test(H));
// the talking points read well for a sample case
const ctx = { window: {}, document: { getElementById: () => null }, localStorage: { getItem: () => null, setItem: () => {} }, ccCan: () => true, console };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(SRC, ctx);
ck('hr.js loads', !!ctx.HR && typeof ctx.HR.assign === 'function' && typeof ctx.HR.done === 'function');
ck('talking points follow Situation-Behavior-Impact plus an open question (research 2026-10-18)', /Situation-Behavior-Impact/.test(SRC) && /What has been getting in the way\?/.test(SRC));
ck('the tips say to stop and tell Zach if a protected situation comes up', SRC.includes("Thank them, write it down and tell Zach before going further"));
ck('the tips never use labels: dates from the record instead', SRC.includes('never "always late"'));
let f = 0; for (const [n, ok, d] of res) { console.log((ok ? 'PASS' : 'FAIL') + ' · ' + n + (ok ? '' : '  ' + d)); if (!ok) f++; }
console.log((res.length - f) + '/' + res.length); process.exit(f ? 1 : 0);
