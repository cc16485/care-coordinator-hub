/* Katlin's page rules (katlin-page.js): when a task counts as done, which Nextdoor post is "this week".
   node tests/katlin-page-test.js */
const KP = require('../katlin-page.js');
const { dayOf, weekOf, isDone, currentPost, upcoming, missed, STARTER } = KP._rules;
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

/* the real posts file */
const list = require('../nextdoor/posts.json').posts;
const fs = require('fs'), path = require('path');
ok('26 Nextdoor posts, one per Tuesday', list.length === 26 && list.every(p => new Date(p.date + 'T12:00:00Z').getUTCDay() === 2), list.length);
ok('every post has its photo', list.every(p => fs.existsSync(path.join(__dirname, '..', 'nextdoor', p.photo))));
ok('no em dashes, no "AI"', list.every(p => !/[—–]/.test(p.text) && !/\bAI\b/.test(p.text)));
ok('hiring posts say 21 or older and background checks', list.filter(p => /hiring|caregiver team|great caregiver/i.test(p.title)).every(p => /21 or older/.test(p.text) && /background checks/.test(p.text)));

console.log(pass, '/', pass + fail);
process.exit(fail ? 1 : 0);
