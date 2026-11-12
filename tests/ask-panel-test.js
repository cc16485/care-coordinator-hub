/* Ask caregivers, one panel: the pure rules (ask-panel.js). node tests/ask-panel-test.js */
const A = require('../ask-panel.js'); let pass = 0, n = 0;
const ok = (name, c, d) => { n++; if (c) pass++; console.log((c ? 'PASS  ' : 'FAIL  ') + name + (c ? '' : '  ' + JSON.stringify(d))); };
const pool = {
  client_level: 2,
  group1: [{ name: 'Dana R', level: 2, history: { visits: 3, last: '2026-11-01' } }, { name: 'Marcus T', level: 3, history: { visits: 14, last: '2026-11-05' }, this_client: { favorite: true } },
    { name: 'Pat W', level: 2, history: { visits: 20, last: '2026-10-01' }, this_client: { rating: 'concern' } }],
  group0: [{ name: 'Chris D', level: 3, prn_pref: { team: 'cna' } }, { name: 'Marcus T', level: 3, prn_pref: { team: 'cna' } }],
  prn_other: [{ name: 'Erin F', level: 2, prn_pref: { team: 'caregiver' } }],
  group2: [{ name: 'Alice B', level: 2, free_then: true }, { name: 'Gus H', level: 3 }, { name: 'Ida J', level: 2 }, { name: 'Kit L', level: 2 }, { name: 'Moe N', level: 2 }, { name: 'Oz P', level: 2 }],
  prn_ongoing: [],
  excluded: [{ name: 'Low L', why: 'Level 1 caregiver; client needs Level 2', code: 'level' }, { name: 'Busy B', why: 'working then', code: 'conflict' }, { name: 'Busy C', why: 'working then', code: 'conflict' },
    { name: 'Asked A', why: 'already asked', code: 'asked' }, { name: 'Gone G', why: 'inactive', code: 'x', ax_active: false }, { name: 'Canceled Shift', why: 'x', code: 'x' }]
};
const P = A.peopleOf(pool), names = (l) => l.map((p) => p.name);
ok('one row per person, even when the server lists them twice', P.length === 11 && P.filter((p) => p.name === 'Marcus T').length === 1, names(P));
ok('worked with: favorite first, then most visits, a concern last', JSON.stringify(names(A.listFor(P, 'worked'))) === JSON.stringify(['Marcus T', 'Dana R', 'Pat W']), names(A.listFor(P, 'worked')));
ok('right level: everyone else, in the server\'s order', JSON.stringify(names(A.listFor(P, 'level', 'any'))) === JSON.stringify(['Chris D', 'Erin F', 'Alice B', 'Gus H', 'Ida J', 'Kit L', 'Moe N', 'Oz P']), names(A.listFor(P, 'level', 'any')));
ok('filter: Level 3 only', JSON.stringify(names(A.listFor(P, 'level', 'l3'))) === JSON.stringify(['Chris D', 'Gus H']), names(A.listFor(P, 'level', 'l3')));
ok('filter: PRN CNA Team, PRN Caregiver Team', JSON.stringify(names(A.listFor(P, 'level', 'cna'))) === '["Chris D"]' && JSON.stringify(names(A.listFor(P, 'level', 'caregiver'))) === '["Erin F"]');
ok('whole team: worked with first, then the rest', names(A.listFor(P, 'all')).length === 11 && names(A.listFor(P, 'all'))[0] === 'Marcus T');
ok('counts for the three choices', JSON.stringify(A.counts(P)) === JSON.stringify({ worked: 3, level: 8, all: 11 }), A.counts(P));
ok('worked with starts all ticked, except a concern on file', JSON.stringify(A.defaultTicks(A.listFor(P, 'worked'), 'worked')) === JSON.stringify(['Marcus T', 'Dana R']));
ok('right level starts with the first five ticked', A.defaultTicks(A.listFor(P, 'level', 'any'), 'level').length === 5);
ok('whole team starts all ticked, except a concern', A.defaultTicks(A.listFor(P, 'all'), 'all').length === 10);
const out = A.leftOut(pool);
ok('left out: grouped by the server\'s reason, biggest first; never the already asked, the inactive, or the Canceled Shift placeholder', JSON.stringify(out) === JSON.stringify([{ why: 'working then', names: ['Busy B', 'Busy C'] }, { why: 'Level 1 caregiver; client needs Level 2', names: ['Low L'] }]), out);
ok('row facts read in plain words', A.facts(P.find((p) => p.name === 'Marcus T')) === 'Level 3 · PRN CNA Team · 14 visits · their favorite' && A.facts(P.find((p) => p.name === 'Alice B')) === 'Level 2 · free then', [A.facts(P.find((p) => p.name === 'Marcus T')), A.facts(P.find((p) => p.name === 'Alice B'))]);
ok('an empty answer is an empty list, not an error', A.peopleOf(null).length === 0 && A.leftOut(null).length === 0);
console.log(pass + '/' + n + ' passed'); process.exit(pass === n ? 0 : 1);
