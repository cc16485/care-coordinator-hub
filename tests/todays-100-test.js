/* node tests/todays-100-test.js : Today's 100 counting and saving rules (todays-100.js) */
const T = require('../todays-100.js');
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x))); };
const DAY = '2026-11-25', K = 'krystal@mo-care.com', SAM = 'samantha@mo-care.com';
const at = (h) => DAY + 'T' + String(h).padStart(2, '0') + ':00:00-06:00';
const data = {
  referral_activities: [
    { org_id:'o1', kind:'call', at:at(9), by:K },
    { org_id:'o1', kind:'email', at:at(10), by:K, to:'a@x.org' },
    { org_id:'o1', kind:'email', at:at(10), by:K, to:'b@x.org' },      /* same partner, same person: counted once */
    { org_id:'o2', kind:'email', at:at(10), by:K, to:'c@y.org' },
    { org_id:'o3', kind:'email', at:at(9), by:'campaign-auto' },        /* the series: once a day */
    { org_id:'o4', kind:'email', at:at(9), by:'campaign-auto' },
    { org_id:'o5', kind:'dropby', at:'2026-11-24T15:00:00Z', by:K }    /* yesterday */
  ],
  campaign_log: [
    { at:at(11), source:'Past families', sent:180, by:SAM },           /* one send = one action */
    { at:at(11), source:'Referral partners', sent:30, by:SAM },        /* already on the partner */
    { at:at(11), source:'Leads', sent:0, by:SAM }                      /* nothing went */
  ],
  recruit_posts: [ { at:at(13), by:K }, { at:at(13), by:K, removed_at:at(14) } ],
  ops_settings: { t100: { start:'2026-11-22', taps: { [DAY]: { [K]: { local:5, content:1 }, [SAM]: { local:2 } } } } }
};
const c = T.count(data, DAY, K);
ck('partners: call + one email per partner + series once = 4', c.buckets.partners.total === 4, c.buckets.partners);
ck('partners: the series counts as on its own', c.buckets.partners.auto === 1);
ck('warm: one Campaigns send, partner and empty sends left out', c.buckets.warm.total === 1 && c.buckets.warm.mine === 0);
ck('recruit: removed post left out', c.buckets.recruit.total === 1);
ck('local taps from two people add up', c.buckets.local.total === 7 && c.buckets.local.mine === 5);
ck('total', c.total === 4 + 1 + 1 + 7 + 1, c.total);
ck('mine is only Krystal', c.mine === 3 + 1 + 5 + 1, c.mine);
ck('people list', c.people[K] === 10 && c.people[SAM] === 3, c.people);
ck('day number', T.dayNumber('2026-11-22', DAY) === 4);
ck('Central day: 11:30 PM Central is still that day', T.ctDay('2026-11-26T05:30:00Z') === DAY);
ck('default targets add to 100', Object.values(T.targets({})).reduce((a, b) => a + b, 0) === 100);
/* saving */
const m = {};
ck('first tap saves', T.applyTap(m, DAY, 'Krystal@MO-care.com', 'local', 1).length === 1 && m.t100.taps[DAY][K].local === 1);
ck('first tap starts day 1', m.t100.start === DAY);
ck('unknown bucket refused', T.applyTap(m, DAY, K, 'nope', 1).length === 0);
ck('no email refused', T.applyTap(m, DAY, '', 'local', 1).length === 0);
T.applyTap(m, DAY, K, 'local', -1);
ck('undo goes back to 0', m.t100.taps[DAY][K].local === 0);
ck('never below 0 (nothing to save)', T.applyTap(m, DAY, K, 'local', -1).length === 0);
m.t100.taps['2026-07-01'] = { [K]: { local:3 } };
T.applyTap(m, DAY, K, 'warm', 1);
ck('days older than 120 are dropped', !m.t100.taps['2026-07-01']);
ck('targets save and clamp', T.applyTargets(m, { partners:'25', local:'-3', content:'abc', warm:10, recruit:9999 }).length === 1
  && m.t100.targets.partners === 25 && m.t100.targets.local === 30 && m.t100.targets.content === 5 && m.t100.targets.recruit === 30);
ck('same targets: nothing to save', T.applyTargets(m, m.t100.targets).length === 0);
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
