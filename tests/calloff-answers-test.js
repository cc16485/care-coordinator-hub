/* Was it covered? answers: reading shift times and what AxisCare shows (made-up visits). (node tests/calloff-answers-test.js) */
require('../calloff-answers.js');
const { window_, verdict, howOpened, wordsFor, ANSWERS } = globalThis.CAA._;
let pass = 0, fail = 0;
const ok = (n, c, got) => { if(c){ pass++; console.log('PASS ·', n); } else { fail++; console.log('FAIL ·', n, JSON.stringify(got)); } };
ok('Cara\'s "09:00-14:00"', JSON.stringify(window_('09:00-14:00')) === '[540,840]');
ok('typed "10pm-8am" runs past midnight', JSON.stringify(window_('10pm-8am')) === '[1320,1920]');
ok('typed "9a-1p" and "10a – 6p"', JSON.stringify(window_('9a-1p')) === '[540,780]' && JSON.stringify(window_('10a – 6p')) === '[600,1080]');
ok('no time: null, never a guess', window_('') === null && window_('morning') === null);
const C = { shift_date:'2026-10-14', shift_time:'12:00-16:00', client_axiscare_id:'120' };
const V = (date, time, end, cg, cin, cid) => ({ date, time, end, client_id:cid || '120', caregiver:cg, clock_in:cin, clock_out:null });
let r = verdict(C, [V('2026-10-14', '12:00', '16:00', 'Pat Helper', '12:04'), V('2026-10-14', '08:00', '10:00', 'Lee Helper', '08:00')]);
ok('someone clocked in during the shift: looks covered, suggests Covered', /Pat Helper clocked in at 12:04 pm/.test(r.say) && r.suggest === 'covered_other_way' && r.mine.length === 1, r);
r = verdict(C, [V('2026-10-14', '12:00', '16:00', null, null)]);
ok('the visit with nobody on it: looks not covered', /nobody on it/.test(r.say) && !r.suggest, r);
r = verdict(C, [V('2026-10-14', '12:00', '16:00', 'Pat Helper', null)]);
ok('on the schedule but no clock-in: says so', /Pat Helper on the schedule, no clock-in/.test(r.say), r);
r = verdict(C, [V('2026-10-14', '08:00', '11:00', 'Pat Helper', '08:00'), V('2026-10-14', '12:00', '16:00', 'Pat Helper', '12:00', '999')]);
ok('nothing for this client at that time (other times and other clients don\'t count)', /no visit for this client at that time/.test(r.say), r);
r = verdict({ shift_date:'2026-11-03', shift_time:'10pm-8am', client_axiscare_id:'120' }, [V('2026-11-04', '00:00', '08:00', 'Kim Night', '00:02')]);
ok('an overnight shift finds the visit after midnight', /Kim Night clocked in/.test(r.say), r);
r = verdict({ shift_date:'2026-10-14', shift_time:'', client_axiscare_id:'120' }, [V('2026-10-14', '18:00', '20:00', 'Pat Helper', '18:01')]);
ok('no times on the call-off: the whole day for that client', /Pat Helper clocked in/.test(r.say), r);
ok('how it was opened, in words', /open slot.*sweep/.test(howOpened({ opened_by:'ongoing-sweep' })) && /Iris Dorsey was taken off the shift in AxisCare/.test(howOpened({ opened_by:'axiscare-watch', calling_off:'Iris Dorsey' }))
  && /phone call from Rebecca.*no client attached/.test(howOpened({ opened_by:'cara-flag', calling_off:'Rebecca' })) && /Opened by Samantha/.test(howOpened({ opened_by:'Samantha' })));
ok('five answers, Not needed among them', ANSWERS.length === 5 && wordsFor('not_needed') === 'not needed: no care was owed');
console.log(pass, '/', pass + fail); process.exit(fail ? 1 : 0);
