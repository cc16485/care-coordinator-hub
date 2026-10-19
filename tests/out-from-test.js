/* Planned time off (2026-10-18): Team Work's outOn respects out_from. node tests/out-from-test.js */
const TW = require('../team-work.js');
let pass = 0, fail = 0; const ck = (n, c, d) => { if(c) pass++; else { fail++; console.log('FAIL ' + n, d === undefined ? '' : JSON.stringify(d)); } };
const staff = [{ email:'a@x', out_until:'2026-11-10' }, { email:'b@x', out_from:'2026-11-05', out_until:'2026-11-10' }];
ck('no Out from: out from today through Out until (as before)', !!TW.outOn(staff, 'a@x', '2026-11-01') && !!TW.outOn(staff, 'a@x', '2026-11-10') && !TW.outOn(staff, 'a@x', '2026-11-11'));
ck('planned: not out before Out from', !TW.outOn(staff, 'b@x', '2026-11-04'));
ck('planned: out from Out from through Out until', !!TW.outOn(staff, 'b@x', '2026-11-05') && !!TW.outOn(staff, 'b@x', '2026-11-10') && !TW.outOn(staff, 'b@x', '2026-11-11'));
console.log(pass + ' passed, ' + fail + ' failed'); process.exitCode = fail ? 1 : 0;
