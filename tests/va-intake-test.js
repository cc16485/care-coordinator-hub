/* The VA intake on the lead page (va-intake.js, 2026-11-27): the switch, the VA path in her order, the reminder each step
   sets, the Social Security number guard, and her wording rules. Made-up families only. Run: node tests/va-intake-test.js */
const R = require('../lead-rules.js');
global.LeadRules = R;
const V = require('../va-intake.js');
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (c, m) => { if(c){ pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')');
const T = '2026-11-27';

/* the switch: off by default, owners can preview */
ok(!V.liveOn({}) && !V.liveOn({ va_intake_live:'yes' }) && V.liveOn({ va_intake_live:true }), 'the switch is on only when va_intake_live is true');
ok(!V.showing({}, true) && !V.showing({}, false), 'off and no preview: nobody sees it');

/* the Veteran? answer is the Payer tab's program question */
ok(V.isVeteran({ program_check:{ veteran:'yes' } }) && V.isVeteran({ funding_source:'va' }) && !V.isVeteran({ program_check:{ veteran:'not_sure' } }) && !V.isVeteran({}), 'veteran = program_check.veteran yes, or pays with VA');
eq(V.answer({ program_check:{ veteran:'no' } }), 'no', 'the answer is read from program_check');

/* the path: enrolled decides it */
const keys = l => V.steps(l, T).map(s => s.key + ':' + s.state);
eq(keys({ va_referral:{} }), ['first:now', 'enroll:todo', 'ask:todo', 'prep:todo', 'waiting:todo', 'auth:todo'], 'a new veteran starts at the first call');
eq(keys({ va_referral:{ checklist_at:'2026-11-27T15:00:00Z', enrolled:'yes' } }), ['first:done', 'enroll:skip', 'ask:now', 'prep:todo', 'waiting:todo', 'auth:todo'], 'enrolled: sign-up is skipped, the ask to the VA is next');
eq(keys({ va_referral:{ checklist_at:'x', enrolled:'no' } }), ['first:done', 'enroll:now', 'ask:todo', 'prep:todo', 'waiting:todo', 'auth:todo'], 'not enrolled: sign up for VA health care first');
eq(keys({ va_referral:{ checklist_at:'x', enrolled:'not_sure' } })[1], 'enroll:now', 'not sure counts as not enrolled');
eq(keys({ va_referral:{ checklist_at:'x', enrolled:'yes', applied_at:'2026-11-20T00:00:00Z', enroll_confirmed_at:'2026-11-27T00:00:00Z' } })[1], 'enroll:done', 'helped them apply, then it came through: done (not skipped)');
eq(keys({ va_referral:{ checklist_at:'x', enrolled:'yes', ask_at:'x', prep_at:'x' } })[4], 'waiting:now', 'after the prep call: waiting on the VA');
eq(keys({ va_referral:{ checklist_at:'x', enrolled:'yes', ask_at:'x', prep_at:'x', auth_at:'x' } })[5], 'auth:now', 'authorization arrived: call the family');
eq(V.current({ va_referral:{ checklist_at:'x', enrolled:'yes', ask_at:'x', prep_at:'x', auth_at:'x', auth_called_at:'x' } }, T), '', 'all done: no step left');

/* the reminders (each one becomes the lead's next step) */
const rf = (ev, v, t) => V.reminderFor(ev, v || {}, t || T);
eq(rf('veteran_yes', { enrolled:'yes' }).day, '2026-12-04', 'Veteran yes: follow-up in 7 days');
ok(/did they ask their VA care team/.test(rf('veteran_yes', { enrolled:'yes' }).why) && /signing up for VA health care/.test(rf('veteran_yes', {}).why), '...about the ask when enrolled, about signing up when not');
eq([rf('enrolled_no').day, rf('applied').day], ['2026-12-04', '2026-12-04'], 'not enrolled / applied: check the enrollment a week later');
ok(/enrollment come through/.test(rf('applied').why) && /877-222-8387/.test(rf('applied').why), '...and the words say what to check and the VA number');
eq(rf('dd214', { dd214_expected:'2026-12-15' }).day, '2026-12-15', 'DD-214: the reminder lands on the expected date');
eq(rf('ask').day, '2026-12-02', 'after the ask: check in in 5 days');
eq(rf('assessment', { assessment_date:'2026-12-10' }).day, '2026-12-09', 'prep call: the day before the VA assessment');
eq(rf('assessment', { assessment_date:'2026-11-27' }).day, T, '...today when the assessment is today');
eq(rf('prep', { assessment_date:'2026-12-10' }).day, '2026-12-11', 'after the prep call: the day after the assessment');
eq(rf('checkin', { ask_at:'2026-11-25T15:00:00Z' }).day, '2026-12-02', 'a check-in: next one in 5 days');
const silent = rf('checkin', { ask_at:'2026-11-19T15:00:00Z' });
ok(silent.day === T && /Call the social worker/.test(silent.why), 'no word 7 days after the ask: call the social worker today');
ok(rf('checkin', { ask_at:'2026-11-19T15:00:00Z', va_word_at:'2026-11-24T00:00:00Z' }).day === '2026-12-02', '...unless the VA has been in touch');
eq(rf('checkin', { checkin_days:12 }).day, '2026-12-04', 'check-ins stay between 3 and 7 days');
ok(rf('auth').day === T && /Call the family today/.test(rf('auth').why), 'authorization arrived: call the family the same day');

/* the Social Security number guard (anywhere but the locked box) */
ok(V.ssnLike('234-56-7891') && V.ssnLike('234 56 7891') && V.ssnLike('ssn 234567891 ok'), 'a number shaped like a Social Security number is caught');
ok(!V.ssnLike('(417) 555-0142') && !V.ssnLike('417-555-0142') && !V.ssnLike('4175550142') && !V.ssnLike('65802') && !V.ssnLike('Dr. Example, Blue team'), 'phone numbers, zips and words are not');

/* hours and needs */
eq(V.hoursWeek({ hours_day:'4', days_week:'5' }), 20, '4 hours a day, 5 days = about 20 a week');
eq(V.hoursWeek({ hours_day:'4' }), null, 'no total without both');
eq(V.needsLine({ adl:['bathing', 'falls', 'nope'] }), 'Bathing, Recent falls', 'the help needed line from the checkboxes');

/* her wording rules, in the files themselves */
const vi = fs.readFileSync(path.join(__dirname, '..', 'va-intake.js'), 'utf8'), lw = fs.readFileSync(path.join(__dirname, '..', 'lead-workspace.js'), 'utf8');
ok(V.WORDS === 'I am having a harder time at home. I would like to be assessed for Homemaker and Home Health Aide care, and I would like Caring Companions In-Home Senior Care to provide it.', 'the words to tell the VA are hers, with the full name');
ok(!/social worker must OK|must OK it in writing|mention them when they call the VA|say who the caregiver should be/i.test(vi), 'nothing tells the veteran to tell the VA about a family or friend caregiver');
ok(/never goes on anything sent to the VA/.test(vi), 'the caregiver choice says it is for our office only');
const letter = lw.slice(lw.indexOf('window.lwVaCopy'), lw.indexOf('function lwCrosby'));
ok(letter.length > 500 && !/cg_name|cg_rel|caregiver the veteran would like|to be my caregiver/i.test(letter), 'the referral letter and the My HealtheVet copy never name a caregiver');
ok(/CC_FULL/.test(letter) && /const CC_FULL = 'Caring Companions In-Home Senior Care'/.test(lw), 'the letter and the copy use the full name');
ok(!/—/.test(vi), 'no em dashes in what staff read');
ok(/type="password"/.test(vi) && !/localStorage[^;]*shown|sessionStorage/.test(vi), 'the number is typed hidden, and a revealed number is never stored in the browser');
ok(!/ssn[^\n]*persist\(|va_referral[^\n]*ssn/i.test(vi.replace(/vai_ssn_new\):not\(#vai_ssn_reason\)/, '')), 'the number never goes on the lead record');

/* the switch is in Settings, off unless she turns it on */
const idx = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
ok(/id="vaiToggleBtn"/.test(idx) && /m\.va_intake_live=on/.test(idx) && /ccIsOwner\(\)\)\{ alert\('Only Samantha or Zachary can change the VA intake/.test(idx), 'Settings has the switch, owners only');
ok(/<script src="va-intake\.js\?v=\d+"><\/script>[\s\S]{0,200}<script src="lead-workspace\.js/.test(idx), 'va-intake.js loads before the lead workspace');

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
