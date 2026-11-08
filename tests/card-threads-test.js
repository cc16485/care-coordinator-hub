// Card conversations (Samantha 2026-11-08, "Approve all picks"): the rules in card-threads.js, made-up people only.
// node tests/card-threads-test.js
const CT = require('../card-threads.js');
const R = []; const ok = (n, c, d) => R.push([c ? 'PASS' : 'FAIL', n, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 500)]);
const S = 'sam@example.test', K = 'kris@example.test', Z = 'zed@example.test';
const now = Date.parse('2026-11-09T15:00:00Z'), ago = m => new Date(now - m * 60000).toISOString();
const msg = (id, x) => Object.assign({ id, card_id: 'c1', kind: 'msg', body: 'Hello', by_email: K, by_name: 'Kris', mentions: [], created_at: ago(30) }, x);

ok('off for everyone until the switch, except an owner who chose to try it', !CT.onFor({}, false, '1') && !CT.onFor({}, true, null) && CT.onFor({}, true, '1') && CT.onFor({ card_threads_live: true }, false, null));
ok('...a coordinator trying it on their own browser sees nothing while it is off', !CT.onFor({ card_threads_live: false }, false, '1'));

const ask = msg('a1', { kind: 'ask', to_email: S, body: 'Do we pay the visit?' });
const task = msg('t1', { kind: 'assign', to_email: S, by_email: Z, by_name: 'Zed', body: 'Call Ruth back', due_at: ago(10) });
const doneTask = msg('t2', { kind: 'assign', to_email: S, body: 'Old task', done_at: ago(5) });
const answered = msg('a2', { kind: 'ask', to_email: S, body: 'Old q', answered_at: ago(4), answer: 'Yes' });
const mine = msg('a3', { kind: 'ask', to_email: K, by_email: S, by_name: 'Sam', body: 'Can you cover?', card_id: 'c2' });
const gone = msg('a4', { kind: 'ask', to_email: S, body: 'Deleted q', deleted_at: ago(1) });
const closedCard = msg('a5', { kind: 'ask', to_email: S, body: 'On a closed card', card_id: 'cX' });
const ment = msg('m1', { body: 'Heads up @Sam', mentions: [S], card_id: 'c3', created_at: ago(20) });
const mentSeen = msg('m2', { body: 'Older @Sam', mentions: [S], card_id: 'c4', created_at: ago(90) });
const all = [ask, task, doneTask, answered, mine, gone, closedCard, ment, mentSeen];
const isOpen = id => id !== 'cX';
const F = CT.forYou(all, S, { c4: Date.parse(ago(60)) }, isOpen, now);
ok('For you: the late task first, then the question, then the new mention', JSON.stringify(F.mine.map(x => x.m.id)) === JSON.stringify(['t1', 'a1', 'm1']), F.mine.map(x => x.m.id));
ok('...answered questions, completed tasks, deleted messages and cards that are closed drop out', !F.mine.some(x => ['t2', 'a2', 'a4', 'a5'].includes(x.m.id)));
ok('...a mention you already opened the card for drops out', !F.mine.some(x => x.m.id === 'm2'));
ok('...the late task says so', F.mine[0].late === true && F.mine[1].late === false);
ok('You are waiting on: what you asked of others and is still open', JSON.stringify(F.waiting.map(x => x.m.id)) === JSON.stringify(['a3']), F.waiting);
const Fk = CT.forYou(all, K, {}, isOpen, now);
ok('Kris sees Sam\'s question for her, not Sam\'s own items; she is waiting on Sam for her question', JSON.stringify(Fk.mine.map(x => x.m.id)) === JSON.stringify(['a3']) && JSON.stringify(Fk.waiting.map(x => x.m.id)) === JSON.stringify(['a1']), Fk);
ok('...a mention never reaches the person who wrote it', !CT.mentionNew(msg('x', { mentions: [K] }), K, null));

const ci = CT.cardInfo(all, 'c1', S, null);
ok('a row: counts the card\'s messages (not deleted ones) and lights the dot when something waits on you', ci.n === 4 && ci.mine === true && ci.open.length === 2, ci);
ok('...no dot for someone nothing waits on', CT.cardInfo(all, 'c1', Z, null).mine === false);
ok('...the pinned decision', CT.cardInfo([msg('p', { pinned_at: ago(1) })], 'c1', S, null).pinned.id === 'p');

const staff = [{ email: 'Krystal@Example.test', name: 'Krystal Smith' }, { email: 'sam@example.test', name: 'Samantha Troutman' }, { email: 'kris@example.test', name: 'Kris Lee' }];
ok('@Krystal and @Samantha Troutman find the right people, once', JSON.stringify(CT.mentions('@Krystal can you and @Samantha Troutman look? @krystal', staff)) === JSON.stringify(['krystal@example.test', 'sam@example.test']));
ok('@Kris is Kris, not Krystal; an email address is not a mention', JSON.stringify(CT.mentions('ask @Kris. write to a@krystal.com', staff)) === JSON.stringify(['kris@example.test']), CT.mentions('ask @Kris. write to a@krystal.com', staff));
ok('no @, no mention', CT.mentions('Krystal will call', staff).length === 0);

const base = new Date(2026, 10, 9, 9, 30).getTime();
const at = k => { const d = CT.dueAt(k, base); return d ? d.getDate() + ' ' + d.getHours() + ':' + d.getMinutes() : null; };
ok('by-when: noon, 3 pm, end of day 5 pm, tomorrow noon, or none', at('noon') === '9 12:0' && at('3pm') === '9 15:0' && at('eod') === '9 17:0' && at('tmrw') === '10 12:0' && at('') === null, [at('noon'), at('3pm'), at('eod'), at('tmrw')]);
ok('...said as "by today 3 pm"', CT.dueWord({ due_at: new Date(2026, 10, 9, 15).toISOString() }, base) === 'by today 3 pm', CT.dueWord({ due_at: new Date(2026, 10, 9, 15).toISOString() }, base));
ok('...and "by tomorrow noon"', CT.dueWord({ due_at: new Date(2026, 10, 10, 12).toISOString() }, base) === 'by tomorrow noon', CT.dueWord({ due_at: new Date(2026, 10, 10, 12).toISOString() }, base));
ok('a task past its by-when is late; done or no by-when is not', CT.late(task, now) && !CT.late(doneTask, now) && !CT.late(msg('x', { kind: 'assign', to_email: S }), now));

ok('delete: your own, under 10 minutes, not answered', CT.canDelete(msg('d', { by_email: S, created_at: ago(9) }), S, now));
ok('...not after 10 minutes, not someone else\'s, not once answered or completed',
  !CT.canDelete(msg('d', { by_email: S, created_at: ago(11) }), S, now) && !CT.canDelete(msg('d', { created_at: ago(1) }), S, now)
  && !CT.canDelete(msg('d', { by_email: S, kind: 'ask', created_at: ago(1), answered_at: ago(0) }), S, now));

const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'card-threads.js'), 'utf8');
const words = (src.match(/'[^'\n]*'/g) || []).join(' ');
ok('no em dashes in anything a person reads', words.indexOf(String.fromCharCode(0x2014)) < 0);
ok('nothing here texts, emails or calls: no send functions, only the card_msg doors', !/send-|sendSms|ghl|twilio|mailto/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '')) && /card_msg_post/.test(src));

R.forEach(r => console.log(r[0] + ' ' + r[1] + (r[2] ? '  ' + r[2] : '')));
const f = R.filter(r => r[0] === 'FAIL').length;
console.log(`\n${R.length - f} passed, ${f} failed`); process.exit(f ? 1 : 0);
