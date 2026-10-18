// HR Agent step 1 (Samantha's HR decisions, 2026-10-18): write-ups are Samantha and Zach's only.
// node tests/hr-step1-test.js
const fs = require('fs'), path = require('path');
const H = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const E = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : String(d || '').slice(0, 300)]);
const between = (s, a, b) => { const i = s.indexOf(a); return i < 0 ? '' : s.slice(i, s.indexOf(b, i + a.length)); };

// roles: the CC role no longer approves any write-up
const cc = between(H, 'care_coordinator:[', ']');
ck('Care Coordinator role does not hold approve_team_discipline', cc && cc.indexOf('approve_team_discipline') < 0, cc);
ck('...nor approve_discipline', cc.indexOf("'approve_discipline'") < 0, cc);
const own = between(H, 'owner_admin:[', ']');
ck('owners still hold approve_discipline', own.indexOf("'approve_discipline'") > -1, own);

// the Write-Ups tab and its links show only to someone who can approve
const ui = between(H, 'function ccApplyRoleUi(){', '\n}');
ck('ccApplyRoleUi hides the Write-Ups tab without approve_discipline', /approve_discipline/.test(ui) && /cgwriteups/.test(ui) && /attWriteupsLink/.test(ui), ui);
ck('the Attendance link to Write-Ups starts hidden', /id="attWriteupsLink" style="display:none;/.test(H));
ck('opening Write-Ups without permission goes to Attendance', /tab==='cgwriteups' && CC_ROLES_CHECKED && !ccCan\('approve_discipline'\)/.test(H));

// profile: no formal records card for anyone else
const perf = between(H, 'function cgdPerformanceHtml(', '\nfunction ');
ck('profile Formal records card only for approve_discipline', /ccCan\('approve_discipline'\) \? card\('Formal records/.test(perf), perf.slice(-600));

// attendance: only owners see Draft / No write-up
const att = between(E, 'function renderAttendance(){', '\nfunction updateAttBadge');
ck('Attendance draft buttons only when attCanDecide()', /attCanDecide\(\)\s*\n?\s*\? '<button class="fb"[^]*draftWriteup/.test(att), att.slice(0, 200));
ck('...everyone else sees "Zach reviews this"', /Zach reviews this/.test(att));
ck('attCanDecide asks approve_discipline', /function attCanDecide\(\)\{[^}]*ccCan\('approve_discipline'\)/.test(E));
ck('the Attendance badge does not nag a coordinator', /if\(!attCanDecide\(\)\)\{ b\.style\.display='none'/.test(E));

// approvals: Zach first; protected check before approving; Samantha's consult button
const rec = between(H, 'function opsReconcileDiscipline(){', '\nfunction ');
ck('approval cards go to the HR lead first', /\[WriteupRules\.HR_LEAD\]/.test(rec), rec.slice(0, 200));
const ap = between(H, 'async function approveWriteupCc(id){', '\n}');
ck('approving asks the protected-situation question first', ap.indexOf('discProtectedCheck(a)') > -1 && ap.indexOf('discProtectedCheck(a)') < ap.indexOf('discCanApprove(a)'), ap);
ck('Samantha has an "I was consulted" button', /discMarkConsulted\(/.test(H) && /I was consulted/.test(H));
ck('the rules file is cache-busted to v3', /writeup-rules\.js\?v=3/.test(H));

// no team-approval wording left on screen
ck('no "any Care Coordinator" approval wording', !/any Care Coordinator<\/b>/.test(H) && !/approved by a Care Coordinator/.test(H));
const mine = [between(H, 'async function discProtectedCheck', '\n}'), between(H, 'async function discMarkConsulted', '\n}'),
  between(H, '/* HR step 1 (2026-10-18): write-ups are Samantha', 'if(CC_SETTINGS_PENDING'), between(E, '/* Owners (Zach, the HR lead', 'const n=')];
ck('no em dashes in the new words', mine.every(t => t && !/\u2014/.test(t)), mine.map(t => t.length));

let f = 0; for (const [n, ok, d] of res) { console.log((ok ? 'PASS' : 'FAIL') + ' · ' + n + (ok ? '' : '  ' + d)); if (!ok) f++; }
console.log((res.length - f) + '/' + res.length); process.exit(f ? 1 : 0);
