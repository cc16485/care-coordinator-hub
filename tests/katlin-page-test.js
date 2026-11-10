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

/* the real posts file */
const list = require('../nextdoor/posts.json').posts;
const fs = require('fs'), path = require('path');
ok('26 Nextdoor posts, one per Tuesday', list.length === 26 && list.every(p => new Date(p.date + 'T12:00:00Z').getUTCDay() === 2), list.length);
ok('every post has its photo', list.every(p => fs.existsSync(path.join(__dirname, '..', 'nextdoor', p.photo))));
ok('no em dashes, no "AI"', list.every(p => !/[—–]/.test(p.text) && !/\bAI\b/.test(p.text)));
ok('hiring posts say 21 or older and background checks', list.filter(p => /hiring|caregiver team|great caregiver/i.test(p.title)).every(p => /21 or older/.test(p.text) && /background checks/.test(p.text)));

console.log(pass, '/', pass + fail);
process.exit(fail ? 1 : 0);
