/* Board feeds, the pure rules (board-feeds.js). node tests/board-feeds-test.js */
const B = require('../board-feeds.js'); let pass = 0, n = 0;
const ok = (name, c, d) => { n++; if (c) pass++; console.log((c ? 'PASS  ' : 'FAIL  ') + name + (c ? '' : '  ' + JSON.stringify(d))); };
const r = B.rowsOf({ feedback:{ n:1 }, circles:{ n:5, names:['A', 'B', 'C', 'D', 'E'] }, partner_owner:{ n:0 }, checkins_unlinked:{ n:2, names:['X', 'Y'] } });
ok('only lists with something to do become rows, in the set order', JSON.stringify(r.map(x => x.key)) === JSON.stringify(['feedback', 'circles', 'checkins_unlinked']), r);
ok('one says "piece", many says "Circles"', /^piece of feedback/.test(r[0].title) && /^Family Circles need a look$/.test(r[1].title), r);
ok('first three names, then "and 2 more"', r[1].sub === 'A, B, C and 2 more', r[1].sub);
ok('no names: the plain description', r[0].sub === 'From families and caregivers', r[0].sub);
ok('each row knows its tab and button', r[1].tab === 'fccheck' && r[1].go === 'Open Family Circles' && r[2].tab === 'ops', r);
ok('nothing found, no rows', B.rowsOf({}).length === 0 && B.rowsOf(null).length === 0);
ok('a list that could not be read is named once', JSON.stringify(B.problemsOf({ circles:{ err:true }, partner_owner:{ err:true }, partner_link:{ err:true } })) === JSON.stringify(['Family Circles', 'Referral Partners']), B.problemsOf({ circles:{ err:true } }));
ok('no em dashes in any wording', !/—/.test(JSON.stringify(B.FEEDS)));
console.log(pass + '/' + n + ' passed'); process.exit(pass === n ? 0 : 1);
