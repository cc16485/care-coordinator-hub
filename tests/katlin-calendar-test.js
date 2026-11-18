/* Katlin's calendar rules (katlin-calendar.js): which task lands on which day, ticks per day, moves, her shift clock.
   node tests/katlin-calendar-test.js */
const KPC = require('../katlin-calendar.js');
const R = KPC._rules;
let pass = 0, fail = 0;
const ok = (n, c, d) => { if(c){ pass++; console.log('PASS ·', n); } else { fail++; console.log('FAIL ·', n, d === undefined ? '' : JSON.stringify(d)); } };
const shift = R.shiftOf([], 'k@x.com');

/* her real tasks (wording from the live page, 2026-11-18) */
const T = {
  daily:{ id:'d', every:'day', text:'CDS, start of shift (10 min): open hub.caringcds.com > Starting.' },
  by7:{ id:'m', every:'day', text:'CDS, Medicaid check then call: for each lead ... Done by 7 PM Central.' },
  end:{ id:'e', every:'day', text:'CDS, end of shift (10 min): handle DSDS and Fusion items.' },
  search:{ id:'s', every:'day', text:'Search Nextdoor for neighbors asking for care (home care, caregiver, elderly parent, dementia). Send Samantha any you find.' },
  fri:{ id:'f', every:'week', text:'Friday: thank anyone new who recommended us on Nextdoor, and send Samantha the week\'s count.' },
  twt:{ id:'c', every:'week', text:'CDS Tuesday, Wednesday, Thursday: 2 or 3 monthly check-in calls to consumers each night, before 7 PM Central.' },
  cdsfri:{ id:'cf', every:'week', text:'CDS Friday: approve every finished EVV form so nothing is still open at the Saturday midnight deadline.' },
  plainweek:{ id:'pw', every:'week', text:'Look over the week.' },
  once:{ id:'o', every:'', text:'E-Verify setup (once): open the activation email.' },
  dated:{ id:'od', every:'', text:'Call the school', date:'2026-11-19' },
  month:{ id:'mo', every:'month', title:'Monthly report', text:'x', date:'2026-10-31' }
};
const all = Object.values(T);

ok('shift defaults to Mon to Fri 5:30 to 7:30 PM', shift.days.join() === '1,2,3,4,5' && shift.from === '17:30' && shift.to === '19:30');
ok('her duty window is read when it exists', R.shiftOf([{ person:'K@x.com', area:'after_hours', recur:{ days:[1,2,3], from:'18:00', to:'20:00' } }], 'k@x.com').from === '18:00');

ok('"Friday:" lands on Friday', R.daysOf(T.fri).join() === '5');
ok('"CDS Tuesday, Wednesday, Thursday:" lands on Tue, Wed, Thu', R.daysOf(T.twt).join() === '2,3,4', R.daysOf(T.twt));
ok('"CDS Friday:" lands on Friday', R.daysOf(T.cdsfri).join() === '5');
ok('a weekly task with no day named lands on Monday', R.daysOf(T.plainweek).join() === '1');

ok('short name: the words before the colon', R.titleOf(T.daily) === 'CDS, start of shift (10 min)', R.titleOf(T.daily));
ok('short name: day-only lead-in is dropped, CDS kept', R.titleOf(T.cdsfri).startsWith('CDS: Approve every finished EVV form'), R.titleOf(T.cdsfri));
ok('short name: first part of a sentence', R.titleOf(T.search) === 'Search Nextdoor for neighbors asking for care', R.titleOf(T.search));
ok('short name: a long one is cut on a word with …', R.titleOf(T.fri).length <= 66 && /…$/.test(R.titleOf(T.fri)) && /^Thank anyone new/.test(R.titleOf(T.fri)), R.titleOf(T.fri));
ok('a title typed by an owner wins', R.titleOf(T.month) === 'Monthly report');

ok('when in the shift: start / by 7 PM / end / during', R.slotOf(T.daily) === 'start' && R.slotOf(T.by7) === 'by7' && R.slotOf(T.end) === 'end' && R.slotOf(T.search) === 'any');
ok('kinds: CDS, Social, Samantha', R.catOf(T.daily) === 'cds' && R.catOf(T.search) === 'social' && R.catOf(T.once) === 'other');

/* Wed Nov 18 2026 */
const wed = '2026-11-18', fri = '2026-11-20', sat = '2026-11-21';
const on = (day, c) => R.itemsOn(all, c || {}, day, shift).map(x => x.t.id);
ok('Wednesday: every-day tasks and the Tue-Thu calls', ['d','m','e','s','c'].every(id => on(wed).includes(id)) && !on(wed).includes('f'), on(wed));
ok('Friday: the Friday tasks too', ['f','cf'].every(id => on(fri).includes(id)) && !on(fri).includes('c'), on(fri));
ok('Saturday: nothing (not a shift day)', on(sat).length === 0, on(sat));
ok('a dated one-time task is on its day only', on('2026-11-19').includes('od') && !on(wed).includes('od'));
ok('monthly on the 31st lands on Nov 30 (a short month), not before it starts', on('2026-11-30').includes('mo') && !on('2026-10-30').includes('mo'), on('2026-11-30'));
ok('a monthly date on a weekend falls back to Friday', R.natural({ id:'z', every:'month', date:'2026-10-03' }, '2026-11-02', shift) === false && R.natural({ id:'z', every:'month', date:'2026-10-07' }, '2027-02-05', shift) === true);

/* ticks are per day */
const c1 = { occ:{ 'd@2026-11-18':{ done:{ at:'2026-11-18T23:40:00Z', by_name:'Katlin' } } } };
ok('ticked on Wednesday', R.itemsOn(all, c1, wed, shift).find(x => x.t.id === 'd').done);
ok('not ticked on Thursday', !R.itemsOn(all, c1, '2026-11-19', shift).find(x => x.t.id === 'd').done);
const legacy = { done:{ d:{ at:'2026-11-18T23:40:00Z' }, f:{ at:'2026-11-20T23:40:00Z' }, o:{ at:'2026-11-01T10:00:00Z' } } };
ok('an older tick from the Tasks list still counts for that day', R.occDone(T.daily, wed, legacy) && !R.occDone(T.daily, '2026-11-19', legacy));
ok('an older weekly tick counts for that week', R.occDone(T.fri, fri, legacy) && !R.occDone(T.fri, '2026-11-27', legacy));
ok('a one-time task stays done', R.occDone(T.once, '', legacy));

/* moves */
const c2 = { occ:{ 'f@2026-11-20':{ to:'2026-11-23' } } };
ok('moved: gone from Friday', !on(fri, c2).includes('f'));
const mon = R.itemsOn(all, c2, '2026-11-23', shift).find(x => x.t.id === 'f' && x.moved);
ok('moved: on Monday, marked moved from Friday', mon && mon.from === fri, mon);

/* still open */
const open = R.stillOpen(all, {}, '2026-11-23', shift).map(x => x.t.id);
ok('still open: last week\'s once-a-week one and a past dated one', open.includes('f') && open.includes('od'), open);
ok('still open: not every-shift ones, nor ones that come back several days a week', !open.includes('d') && !open.includes('c'), open);
ok('still open: nothing from before the calendar started', !R.stillOpen(all, {}, '2026-11-18', shift).length && R.START === '2026-11-18');
ok('still open: a task added later does not count days before it existed', !R.stillOpen([Object.assign({}, T.fri, { at:'2026-11-21T10:00:00Z' })], {}, '2026-11-23', shift).length);
ok('still open: a skipped one is not', !R.stillOpen(all, { occ:{ 'f@2026-11-20':{ skipped:true, done:{ at:'x', skipped:true } } } }, '2026-11-23', shift).some(x => x.key === 'f@2026-11-20'));
ok('no day yet: a one-time task without a date', R.noDay(all, {}).map(t => t.id).join() === 'o');

/* pruning */
const pr = R.prune({ 'a@2026-08-01':{ done:{} }, 'b@2026-11-10':{ done:{} }, 'c@2026-08-01':{ to:'2026-11-30' } }, '2026-11-18');
ok('ticks older than 60 days are dropped, recent ones and future moves kept', !pr['a@2026-08-01'] && pr['b@2026-11-10'] && pr['c@2026-08-01'], pr);

/* clock: Missouri wall time to the real moment (CST is UTC-6, CDT UTC-5); Vietnam is +7 */
ok('5:30 PM Missouri on Nov 18 (CST) = 23:30 UTC', new Date(R.moAt(wed, '17:30')).toISOString() === '2026-11-18T23:30:00.000Z', new Date(R.moAt(wed, '17:30')).toISOString());
ok('5:30 PM Missouri on Jun 17 (CDT) = 22:30 UTC', new Date(R.moAt('2027-06-17', '17:30')).toISOString() === '2027-06-17T22:30:00.000Z');
const vn = new Date(R.moAt(wed, '17:30')).toLocaleString('en-US', { timeZone:'Asia/Ho_Chi_Minh', weekday:'short', hour:'numeric', minute:'2-digit' });
ok('that is Thu 6:30 AM in Vietnam', vn === 'Thu 6:30 AM', vn);
const s1 = R.shiftNow(Date.parse('2026-11-18T23:45:00Z'), shift);
ok('5:45 PM Wednesday: on shift, time left and the 7 PM line', s1.k === 'on' && /1 h 45 min left/.test(s1.say) && /7 PM: 1 h 15 min/.test(s1.say), s1);
const s2 = R.shiftNow(Date.parse('2026-11-21T18:00:00Z'), shift);
ok('Saturday: next shift is Monday', s2.k === 'next' && s2.day === '2026-11-23', s2);
const s3 = R.shiftNow(Date.parse('2026-11-18T15:00:00Z'), shift);
ok('9 AM Wednesday: starts later today', s3.k === 'soon' && s3.day === wed, s3);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
