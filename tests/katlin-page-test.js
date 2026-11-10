/* Katlin's page rules (katlin-page.js): when a task counts as done, which Nextdoor post is "this week".
   node tests/katlin-page-test.js */
const KP = require('../katlin-page.js');
const { dayOf, weekOf, isDone, currentPost, upcoming, missed, STARTER, placeDue, autoNeeds, townOf } = KP._rules;
let pass = 0, fail = 0;
const ok = (n, c, d) => { if(c){ pass++; console.log('PASS ·', n); } else { fail++; console.log('FAIL ·', n, d === undefined ? '' : JSON.stringify(d)); } };

/* Missouri days, wherever the computer is */
ok('11pm Missouri on Tue Nov 10 is still Nov 10', dayOf('2026-11-11T05:00:00Z') === '2026-11-10', dayOf('2026-11-11T05:00:00Z'));
ok('1am Missouri on Wed Nov 11 is Nov 11', dayOf('2026-11-11T07:00:00Z') === '2026-11-11');
ok('the week starts Monday', weekOf('2026-11-15') === '2026-11-09' && weekOf('2026-11-16') === '2026-11-16', [weekOf('2026-11-15'), weekOf('2026-11-16')]);

const once = { id:'a' }, daily = { id:'b', every:'day' }, weekly = { id:'c', every:'week' };
const done = { a:{ at:'2026-11-02T15:00:00Z' }, b:{ at:'2026-11-10T15:00:00Z' }, c:{ at:'2026-11-09T15:00:00Z' } };
ok('a one-time task stays done', isDone(once, done, '2026-11-20'));
ok('a daily task is done the day it is ticked', isDone(daily, done, '2026-11-10'));
ok('a daily task is open again the next day', !isDone(daily, done, '2026-11-11'));
ok('a weekly task is done all that week', isDone(weekly, done, '2026-11-15'));
ok('a weekly task is open again next Monday', !isDone(weekly, done, '2026-11-16'));
ok('an unticked task is open', !isDone({ id:'z' }, done, '2026-11-10'));

const posts = [ { week:1, date:'2026-11-10' }, { week:2, date:'2026-11-17' }, { week:3, date:'2026-11-24' }, { week:4, date:'2026-12-01' } ];
ok('before the first post, this week = the first post', currentPost(posts, '2026-11-09').week === 1);
ok('on its Tuesday, that week\'s post', currentPost(posts, '2026-11-17').week === 2);
ok('the rest of that week, still that post', currentPost(posts, '2026-11-23').week === 2);
ok('coming up = the next ones', upcoming(posts, currentPost(posts, '2026-11-17'), 4).map(p => p.week).join() === '3,4');
ok('an earlier post never marked posted is listed', missed(posts, currentPost(posts, '2026-11-24'), { 2:{ at:'x' } }, '2026-11-24').map(p => p.week).join() === '1');
ok('a miss older than 4 weeks is not', missed(posts, { week:9, date:'2027-01-05' }, {}, '2027-01-05').length === 0);
ok('three starter tasks for Nextdoor', STARTER.length === 3 && STARTER.every(t => t.id && t.text));

/* automatic hiring needs: town, day, time, count, never a name (made-up clients) */
const roster = [ { name:'Pat Fakename', town:'nixa' }, { name:'Ned Q Testperson', town:'Ozark' } ];
ok('town by full name', townOf('Pat Fakename', roster) === 'Nixa');
ok('town by first and last name when a middle name differs', townOf('Ned Testperson', roster) === 'Ozark');
ok('no town when the client is not on file', townOf('Client #41', roster) === '');
const open = [
  { date:'2026-11-14', start:'9:30am', end:'1:30pm', client:'Pat Fakename' },
  { date:'2026-11-15', start:'9:30am', end:'1:30pm', client:'Pat Fakename' },
  { date:'2026-11-18', start:'5:00pm', end:'10:00pm', client:'Ned Testperson' },
  { date:'2026-11-19', start:'5:00pm', end:'10:00pm', client:'Ned Testperson' },
  { date:'2026-11-20', start:'5:00pm', end:'10:00pm', client:'Ned Testperson' },
  { date:'2026-11-16', start:'8:00am', end:'12:00pm', client:'Client #41' } ];
const an = autoNeeds(open, roster);
ok('grouped by town and time, biggest first', an.length === 3 && an[0].town === 'Ozark' && an[0].count === 3 && an[0].days.join() === 'Wed,Thu,Fri', an);
ok('weekend shifts in Nixa', an[1].town === 'Nixa' && an[1].days.join() === 'Sat,Sun' && an[1].time === '9:30am to 1:30pm', an[1]);
ok('an unknown client still counts, with no town', an[2].town === '' && an[2].count === 1);
ok('no client name anywhere in the summary', !/Pat|Ned|Fakename|Testperson|#41/.test(JSON.stringify(an)), JSON.stringify(an));
ok('a weekly place is due after 7 days', placeDue({ every:'week' }, { at:new Date(Date.now() - 8 * 864e5).toISOString() }, Date.now()) && !placeDue({ every:'week' }, { at:new Date().toISOString() }, Date.now()));

/* Follow-ups (2026-11-09): who is stuck, from the Hub's own rules */
{
  const { fuApplicants, fuStage, fuSort, FU_SAY } = KP._rules;
  const now = Date.parse('2026-11-17T17:00:00Z'), ago = d => new Date(now - d * 864e5).toISOString();
  const h = { decided:['offer','hired','pool','left','declined'], qualified:r => r.age_ok !== false, offered:r => !!r.offer_sent_at || r.status === 'hired', noshowElsewhere:r => r.phone === '5550000009' };
  const rows = [
    { id:'a1', status:'partial', created_at:ago(3) }, { id:'a2', status:'new', created_at:ago(9) }, { id:'a3', status:'noshow', created_at:ago(5) },
    { id:'a4', status:'new', created_at:ago(4) }, { id:'a5', status:'hired', created_at:ago(30) }, { id:'a6', status:'declined', created_at:ago(6) },
    { id:'a7', status:'new', age_ok:false, created_at:ago(2) }, { id:'a8', status:'reviewing', created_at:ago(70) }, { id:'a9', status:'new', screen_grade:'review', created_at:ago(2) },
    { id:'a10', status:'new', phone:'5550000009', created_at:ago(2) }, { id:'a11', status:'reviewing', post_interview:true, created_at:ago(8) }, { id:'a12', status:'pool', created_at:ago(8) } ];
  const got = fuApplicants(rows, { a4:{ status:'booked' } }, now, h);
  ok('applicants: unfinished form and not booked are listed', got.map(x => x.r.id + ':' + x.k).join() === 'a1:form,a2:book', got.map(x => x.r.id + ':' + x.k));
  ok('applicants: no-shows, an earlier no-show, booked, hired, declined, not qualified, Needs a look, interviewed, pool and 60+ days are left out', !got.some(x => /^a(3|4|5|6|7|8|9|10|11|12)$/.test(x.r.id)));
  ok('applicants: days since they applied', got[0].days === 3 && got[1].days === 9);
  const W = (who, extra) => Object.assign({ s:'wait', who }, extra || {});
  ok('onboarding: offer not signed', fuStage({ cells:{ offer:W('applicant', { days:4 }) } }).k === 'offer');
  ok('onboarding: Step 1 not done', fuStage({ cells:{ offer:{ s:'ok' }, step1:W('applicant') } }).k === 'step1');
  ok('onboarding: references not in (form sent, or none given)', fuStage({ cells:{ step1:{ s:'ok' }, refs:W('outside') } }).k === 'refs' && fuStage({ cells:{ step1:{ s:'ok' }, refs:{ s:'todo', who:'office', days:6 } } }).days === 6);
  ok('onboarding: Step 2 not finished', fuStage({ cells:{ refs:{ s:'ok' }, step2:W('applicant', { days:9, late:true }) } }).k === 'step2');
  ok('onboarding: orientation not finished', fuStage({ cells:{ refs:{ s:'ok' }, orient:W('applicant') } }).k === 'orient');
  ok('onboarding: welcome video call invited, not booked', fuStage({ cells:{ finish:{ s:'wait', marks:[{ k:'O', s:'ok' }, { k:'V', s:'wait', tip:'Invited Nov 10, not booked yet' }] } } }).k === 'video');
  ok('onboarding: a booked video call is not stuck', fuStage({ cells:{ finish:{ s:'wait', marks:[{ k:'V', s:'wait', tip:'Booked Thu 3pm' }] } } }).skip === 'office');
  ok('onboarding: only background checks open = Krystal has it', fuStage({ cells:{ step1:{ s:'ok' }, refs:{ s:'ok', t:'2/2' }, oig:{ s:'todo', who:'office' }, fcsr:W('outside') } }).skip === 'checks');
  ok('onboarding: a check with something on it is for the owners', fuStage({ cells:{ edl:{ s:'rev', who:'review' }, step2:W('applicant') } }).skip === 'review');
  ok('onboarding: only office to-dos = not listed', fuStage({ cells:{ refs:{ s:'ok' }, orient:{ s:'todo', who:'office' } } }).skip === 'office');
  ok('longest first, unknown last', fuSort([{ name:'b', days:2 }, { name:'c', days:null }, { name:'a', days:12 }]).map(x => x.name).join() === 'a,b,c');
  ok('wording: warm and simple, no dashes', Object.values(FU_SAY).every(t => !/[—–]/.test(t) && !/\bAI\b|\bVA\b/.test(t)));
}

/* the real posts file */
const list = require('../nextdoor/posts.json').posts;
const fs = require('fs'), path = require('path');
ok('26 Nextdoor posts, one per Tuesday', list.length === 26 && list.every(p => new Date(p.date + 'T12:00:00Z').getUTCDay() === 2), list.length);
ok('every post has its photo', list.every(p => fs.existsSync(path.join(__dirname, '..', 'nextdoor', p.photo))));
ok('no em dashes, no "AI"', list.every(p => !/[—–]/.test(p.text) && !/\bAI\b/.test(p.text)));
ok('hiring posts say 21 or older and background checks', list.filter(p => /hiring|caregiver team|great caregiver/i.test(p.title)).every(p => /21 or older/.test(p.text) && /background checks/.test(p.text)));

console.log(pass, '/', pass + fail);
process.exit(fail ? 1 : 0);
