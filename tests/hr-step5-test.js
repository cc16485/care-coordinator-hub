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
ck('talking points exist for every watched rule and kind words', ['w06', 'w01', 'w02', 'w03', 'w05'].every((r) => new RegExp('\\b' + r + ': \\{ kind: ').test(SRC)) && /c\.rule === 'kind'/.test(SRC));
ck('no em dashes in hr.js', !/—/.test(SRC));
ck('My Work: coaching is a card kind', /coaching:\s*\{ label:'Coaching'/.test(H));
ck('My Work: a coaching card can only be finished on HR, Coaching', /if\(it\.kind==='coaching'\)\{ location\.hash='hr\/coaching'; return; \}/.test(H));
ck('Performance shows coaching history from hr_coaching, read only', /async function cgdCoachMount\(c\)/.test(H) && /from\('hr_coaching'\)\.select\('\*'\)\.eq\('axiscare_caregiver_id'/.test(H) && /try\{ cgdCoachMount\(c\); \}catch/.test(H));
ck('hr.js is cache-busted', /hr\.js\?v=20261018h/.test(H));
// the talking points read well for a sample case
const ctx = { window: {}, document: { getElementById: () => null }, localStorage: { getItem: () => null, setItem: () => {} }, ccCan: () => true, console };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(SRC, ctx);
ck('hr.js loads', !!ctx.HR && typeof ctx.HR.assign === 'function' && typeof ctx.HR.done === 'function');
ck('talking points follow Situation-Behavior-Impact plus an open question (research 2026-10-18)', /Situation-Behavior-Impact/.test(SRC) && /What has been getting in the way\?/.test(SRC));
ck('the tips say to stop and tell Zach if a protected situation comes up', SRC.includes("Thank them, write it down and tell Zach before going further"));
ck('the tips never use labels: dates from the record instead', SRC.includes('never "always late"'));
// her ask 2026-10-18: say clearly where to stop, and write down their answer to each question
const ctx2 = { window: {}, document: { getElementById: () => null }, localStorage: { getItem: () => null, setItem: () => {} }, ccCan: () => true, console };
ctx2.window = ctx2; vm.createContext(ctx2); vm.runInContext(SRC.replace('window.HR = {', 'window.__tp = talkingPoints; window.__sq = stopQuestions; window.__html = tpHtml; window.HR = {'), ctx2);
const F = [{ date: '2026-10-03', what: 'x' }, { date: '2026-10-10', what: 'y' }, { date: '2026-10-15', what: 'z' }];
for (const r of ['w06', 'w01', 'w02', 'w03', 'w05']) {
  const tp = ctx2.__tp({ caregiver: 'Jessica Miller', rule: r, facts: F });
  ck(r + ': every question is followed by a STOP', ctx2.__sq(tp).length >= 1 && ctx2.__sq(tp).every((q) => /\?$/.test(q)), ctx2.__sq(tp));
}
// her direction 2026-10-18: a coaching call first, how can we help, and write-ups if it continues
for (const r of ['w06', 'w01', 'w02', 'w03', 'w05', 'other']) {
  const tp = ctx2.__tp({ caregiver: 'Jessica Miller', rule: r, facts: F, title: 'Something' }), q = ctx2.__sq(tp);
  ck(r + ': says it is a coaching call, not a write-up, and the goal is to keep it from becoming write-ups', tp.includes('This is a coaching call, not a write-up.') && tp.includes("so this doesn't turn into write-ups"));
  ck(r + ': asks how we can help and stops for the answer', q.some((x) => /^How can we help\?/.test(x)), q);
  ck(r + ': offers a different shift time where that fits', ['w06', 'w05'].includes(r) || /different (shift|start) time/.test(tp), tp);
  ck(r + ': says clearly that if it continues, official write-ups come next and can lead to termination', tp.includes('if this keeps happening, the next step is an official write-up, and write-ups can lead to termination'));
  ck(r + ': three stops: why, how can we help, any questions', q.length === 3 && q[2] === 'Do you have any questions for me?', q);
}
ck('the record form requires the box: told them write-ups come next', SRC.includes('Tick the box once you have told them that if it continues, official write-ups come next.'));
ck('...and saves that it was said, with the expectation', SRC.includes("Told them: this was a coaching call; if it keeps happening, the next step is an official write-up, which can lead to termination."));
ck('the record form asks what help was agreed and who does it', SRC.includes('Help we agreed to give'));
ck('the first tip: say it is a coaching call', SRC.includes("'Start by saying it plainly: this is a coaching call, not a write-up."));
ck('kind words have no STOP (nothing to ask)', ctx2.__sq(ctx2.__tp({ caregiver: 'J', rule: 'kind', facts: F })).length === 0);
ck('the card shows each STOP as a box that says to write down what they say', /class="hr-stop">STOP\. Let them answer, and write down what they say\./.test(ctx2.__html(ctx2.__tp({ caregiver: 'J', rule: 'w05', facts: F }))));
ck('the record form has an answer box per question and refuses a missing answer', SRC.includes('You asked: <b>') && SRC.includes('Write down what they said to each question first.'));
ck('the answers are saved as Asked / They said pairs', SRC.includes("'Asked: ' + x.q + '\\nThey said: ' + x.a"));
ck('the tips say to stop talking at each STOP and not answer for them', SRC.includes('do not answer for them'));
ck('the late-arrival talk no longer says clients plan their day around them (her edit 2026-10-18)', !SRC.includes('plan their day around you'));
ck('late arrivals: not calling makes it twice as bad (her words 2026-10-18)', SRC.includes("Not calling makes it twice as bad: we don\\'t get the chance to let your client or their family know, and it makes our company look unprofessional and unreliable."));
let f = 0; for (const [n, ok, d] of res) { console.log((ok ? 'PASS' : 'FAIL') + ' · ' + n + (ok ? '' : '  ' + d)); if (!ok) f++; }
console.log((res.length - f) + '/' + res.length); process.exit(f ? 1 : 0);
