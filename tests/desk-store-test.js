// My Desk: the real database calls desk.js makes (Supabase), recorded against a pretend client. Checks each save is
// scoped to one row and, for lines and stickies, to the version last read (rev), so another screen's change is never
// overwritten. node tests/desk-store-test.js
global.window = global; global.document = { querySelector:()=>null };
const calls = [];
function chain(table){
  const c = { t:table, ops:[] }; calls.push(c);
  const p = new Proxy({}, { get(_, k){
    if(k === 'then') return (a, b) => Promise.resolve(c.result || { data:c.data || [{ rev:2 }], error:null }).then(a, b);
    return (...args) => { c.ops.push([k, ...args]); if(k === 'single' || k === 'maybeSingle') return Promise.resolve({ data:{ rev:1 }, error:null }); return p; };
  } });
  return p;
}
global.sb = { from:t => chain(t), rpc:async n => { calls.push({ t:'rpc', ops:[['rpc', n]] }); return { data:'p1', error:null }; } };
require('../desk.js');
const S = window.dkStore, R = []; const ok = (n, c, d) => R.push([c ? 'PASS' : 'FAIL', n, c ? '' : JSON.stringify(d)]);
(async () => {
  ok('who am I comes from the database (desk_me), never from the page', (await S.me()) === 'p1' && calls.pop().ops[0][1] === 'desk_me');
  calls.length = 0; await S.load('p1', '2026-07-22');
  const t = calls.map(c => c.t).sort().join();
  ok('loading reads only the four desk tables', t === 'desk_lines,desk_pages,desk_settings,desk_stickies', t);
  const L = calls.find(c => c.t === 'desk_lines').ops;
  ok('...only my own lines', L.some(o => o[0] === 'eq' && o[1] === 'person_id' && o[2] === 'p1'));
  ok('...not erased ones', L.some(o => o[0] === 'is' && o[1] === 'erased_at' && o[2] === null));
  ok('...and only recent pages (Later is always included)', L.some(o => o[0] === 'or' && o[1] === 'place.neq.day,day.gte.2026-07-22'));
  calls.length = 0; await S.update('desk_lines', 'L1', 5, { body:'x' });
  const U = calls[0].ops;
  ok('a save changes one row, and only if it is still the version I read', U[0][0] === 'update' && U.some(o => o[0] === 'eq' && o[1] === 'id' && o[2] === 'L1') && U.some(o => o[0] === 'eq' && o[1] === 'rev' && o[2] === 5) && U.some(o => o[0] === 'select'), U);
  calls.length = 0; await S.insert('desk_stickies', { id:'s1' });
  ok('a new sticky is one insert that reads back its version', calls[0].ops[0][0] === 'insert' && calls[0].ops.some(o => o[0] === 'single'));
  calls.length = 0; await S.saveSettings({ person_id:'p1', pad_labels:{} });
  ok('pad labels save as my one settings row', calls[0].ops[0][0] === 'upsert' && calls[0].ops[0][2].onConflict === 'person_id');
  calls.length = 0; await S.savePage({ person_id:'p1', day:'2026-10-06', leftovers_done:true });
  ok('a page fact saves as one row per day', calls[0].ops[0][0] === 'upsert' && calls[0].ops[0][2].onConflict === 'person_id,day');
  const X = window.DKX;
  ok('slots: a line dropped between two others lands between them', (() => { const s = X.slots([{ pos:1 }, { pos:2 }], 1, 1)[0]; return s > 1 && s < 2; })());
  ok('slots: a block of 3 keeps its order at the end', (() => { const s = X.slots([{ pos:1 }], 1, 3); return s[0] > 1 && s[0] < s[1] && s[1] < s[2]; })());
  ok('blockOf: a to-do takes the notes right under it, not the next to-do', X.blockOf([{ id:'a', kind:'todo' }, { id:'n', kind:'note' }, { id:'b', kind:'todo' }], 'a').map(x => x.id).join() === 'a,n');
  ok('parseTime: "at 2" is 2:00 PM, "at 10" is 10:00 AM, "2:30pm" works', X.parseTime('call at 2') === '2:00 PM' && X.parseTime('at 10') === '10:00 AM' && X.parseTime('2:30pm') === '2:30 PM' && X.parseTime('room 12') === null);
  ok('weekends are skipped: Friday\'s next page is Monday', X.nextBiz('2026-10-02') === '2026-10-05' && X.prevBiz('2026-10-05') === '2026-10-02');
  R.forEach(r => console.log(r[0], '·', r[1], r[2] ? '→ ' + r[2] : ''));
  console.log(R.filter(r => r[0] === 'PASS').length + ' / ' + R.length);
  process.exit(R.every(r => r[0] === 'PASS') ? 0 : 1);
})();
