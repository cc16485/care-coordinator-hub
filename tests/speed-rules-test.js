/* node tests/speed-rules-test.js — speed-rules.js (Speed to lead, Samantha 2026-10-22, design approved): the owners' card numbers
   and the private My speed numbers, on made-up families. Lead response hours are the default, Mon to Fri 8 to 6 Chicago. */
const fs = require('fs'), path = require('path');
require('../lead-rules.js'); require('../speed-rules.js');
const R = globalThis.LeadRules, S = globalThis.SpeedRules;
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 700))); };
const H = R.responseHours({});
const NOW = '2026-10-22T19:00:00Z';                       /* Thu Oct 22, 2:00pm Chicago (CDT) */
const at = (iso, mins) => new Date(Date.parse(iso) + mins * 60000).toISOString();
const L = (id, created, tryMin, o) => Object.assign({ id, first_name: id, last_name: 'Fam', created_at: created, assigned_coordinator: 'Krystal',
  first_human_attempt_at: tryMin == null ? undefined : at(created, tryMin), contact_events: [{ at: created, channel: 'web', direction: 'in', outcome: 'inquiry', actor: 'family' }] }, o || {});

/* this week (Mon Oct 19 on), office hours */
const week = [
  L('Ann', '2026-10-19T14:00:00Z', 2), L('Bea', '2026-10-19T15:00:00Z', 4), L('Cal', '2026-10-20T16:00:00Z', 3),
  L('Dee', '2026-10-21T14:30:00Z', 11), L('Eve', '2026-10-21T18:00:00Z', 1),
  L('Fay', '2026-10-22T15:00:00Z', 0, { first_human_contact_at: '2026-10-22T15:00:00Z', contact_events: [{ at: '2026-10-22T15:00:00Z', channel: 'call', direction: 'in', outcome: 'connected', actor: 'human' }] }),
  L('Gus', '2026-10-22T17:00:00Z', null),                 /* 2 hours, nobody has tried */
  L('Hal', '2026-10-22T18:57:00Z', null),                 /* 3 minutes old: inside the 5 */
  L('Ivy', '2026-10-22T02:30:00Z', null, { first_human_attempt_at: '2026-10-22T13:05:00Z' }),   /* 9:30pm Wed form: the clock starts 8am Thu, tried 8:05 */
  L('Sam', '2026-10-21T15:00:00Z', 1, { spam: { at: 'x' } }) ];
const old = [ L('Old1', '2026-09-30T15:00:00Z', 22), L('Old2', '2026-10-01T15:00:00Z', 30), L('Sat1', '2026-10-17T15:00:00Z', 70), L('Sun1', '2026-10-18T16:00:00Z', 50) ];
const all = week.concat(old);

const p = S.speedPage(all, H, { period: 'week', now: NOW });
ck('week · spam never counts; nine families, eight judged (Hal is still inside his first 5 minutes)', p.families === 9 && p.counted === 8, p);
ck('week · waits: Ivy is measured from 8am, not from her 9:30pm form', S.waitOf(week[8], H) === 5);
ck('week · buckets: 6 under 5 (Ann, Bea, Cal, Eve, Fay, Ivy), 1 in 5 to 15 (Dee), 0, 1 over an hour (Gus, never tried)', p.buckets.map(b => b.count).join() === '6,1,0,1', p.buckets);
ck('week · tiles: middle wait 3 min, 1 over an hour, 1 after hours', p.tiles.median === 3 && p.tiles.overHour === 1 && p.tiles.afterHours === 1, p.tiles);
ck('week · the answer in words: 6 of 8 is "Somewhat", with the slow days named', p.tone === 'mixed' && /^Somewhat/.test(p.verdict) && /^6 of 8 families got a call within 5 minutes\. 1 waited over an hour, 1 not called yet\. Slowest days lately: /.test(p.why), [p.verdict, p.why]);
const good = S.speedPage(all.filter(l => l.id !== 'Gus' && l.id !== 'Dee'), H, { period: 'week', now: NOW });
ck('week · without the two slow ones it is "Mostly no", and no slow days are named', good.tone === 'good' && /^Mostly no/.test(good.verdict) && good.why === '6 of 6 families got a call within 5 minutes.', [good.verdict, good.why]);
ck('week · how they reached us: Fay called and is right away', S.howCame(week[5]) === 'called' && p.rows.find(r => r.name === 'Fay Fam').wait === 'Right away' && p.rows.find(r => r.name === 'Fay Fam').how === 'Called us');
ck('week · Gus shows waiting, red; Hal is still inside his 5 minutes', p.rows.find(r => r.name === 'Gus Fam').wait === 'Waiting 2 h' && p.rows.find(r => r.name === 'Gus Fam').tone === 'bad' && p.rows.find(r => r.name === 'Hal Fam').tone === 'quiet', p.rows);
ck('week · Ivy says when her clock started', /^5 min \(from 8:00am\)$/.test(p.rows.find(r => r.name === 'Ivy Fam').wait), p.rows.find(r => r.name === 'Ivy Fam'));
ck('week · rows are newest first, with the owner first name', p.rows[0].name === 'Hal Fam' && p.rows.every(r => r.owner === 'Krystal'));
ck('trend · 8 weeks, oldest first, this week last', p.trend.length === 8 && p.trend[7].week === '2026-10-19' && p.trend[0].week === '2026-08-31', p.trend.map(t => t.week));
ck('days · weekends show their own middle wait', p.byDay.find(d => d.day === 'Sat').median === 70 && p.byDay.find(d => d.day === 'Mon').median === 3, p.byDay);
const m4 = S.speedPage(all, H, { period: 'month', now: NOW });
ck('4 weeks · the weekend waits make it "Somewhat"... with the slow days named', m4.counted === 13 && m4.tone !== 'good' || /Sat|Sun/.test(m4.why), [m4.verdict, m4.why]);
ck('empty · no families says so, no made-up numbers', S.speedPage([], H, { now: NOW }).verdict === 'No families to measure yet.' && S.speedPage([], H, { now: NOW }).tiles.median === null);
ck('words · no em dashes anywhere a person reads', !/—/.test(JSON.stringify(p) + JSON.stringify(m4)));

/* My speed */
const ms = S.mySpeed(all, H, 'Krystal Land', { now: NOW });
ck('my speed · Gus has waited 2 hours: the streak starts again from him (Hal, inside his 5 minutes, is not counted)', ms.streak === 0, ms);
const ms2 = S.mySpeed(all.map(l => l.id === 'Gus' ? Object.assign({}, l, { rungs: { owner_excused: 'out' } }) : l), H, 'Krystal', { now: NOW });
ck('my speed · time off never breaks a streak: Gus while Krystal was out is skipped, then Fay, Ivy and Eve count and Dee (11 min) stops it', ms2.streak === 3, ms2);
ck('my speed · only my own families', S.mySpeed(all, H, 'Angiel', { now: NOW }).families === 0 && S.mySpeed(all, H, 'Angiel', { now: NOW }).streak === 0);
ck('my speed · month middle wait and the best week (weeks with 2 or more families)', ms.monthMedian === 5 && ms.best && ms.best.median === 26 && ms.best.week === 'Sep 28', ms);
ck('my speed · the team week counts everyone together, no names', ms.team.of === 8 && ms.team.done === 6 && !('names' in ms.team), ms.team);
const clean = [L('A1', '2026-10-12T14:00:00Z', 2), L('A2', '2026-10-14T14:00:00Z', 3)];
ck('my speed · a 5-minute week shows on Monday only', S.mySpeed(clean, H, 'Krystal', { now: '2026-10-19T14:00:00Z' }).celebrate === true && S.mySpeed(clean, H, 'Krystal', { now: '2026-10-20T14:00:00Z' }).celebrate === false);
ck('my speed · one slow family last week: no celebration', S.mySpeed(clean.concat([L('A3', '2026-10-15T14:00:00Z', 20)]), H, 'Krystal', { now: '2026-10-19T14:00:00Z' }).celebrate === false);

console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
