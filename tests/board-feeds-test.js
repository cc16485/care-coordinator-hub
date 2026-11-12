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
const r2 = B.rowsOf({ carematch:{ n:2, names:['A and B', 'C and D'] }, first_shift:{ n:1, names:['E'] }, no_checkin:{ n:3 }, no_review:{ n:1 }, ff_needs:{ n:2 } });
ok('second slice rows, each with its own tab', JSON.stringify(r2.map(x => x.key + '>' + x.tab)) === JSON.stringify(['carematch>carematch', 'first_shift>clientqueue', 'no_checkin>clientsboard', 'no_review>clientsboard', 'ff_needs>friendsfamily']), r2);
ok('website chats Cara could not answer go to the Ask Cara chats tab', B.rowsOf({ cara_missed:{ n:2 } })[0].tab === 'carachats');
ok('every feed has a label, one, many, tab and button', B.FEEDS.every(f => f.label && f.one && f.many && f.tab && f.go), B.FEEDS);
ok('no em dashes in any wording', !/—/.test(JSON.stringify(B.FEEDS)));
console.log(pass + '/' + n + ' passed'); process.exit(pass === n ? 0 : 1);
