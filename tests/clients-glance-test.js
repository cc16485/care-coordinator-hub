/* Clients at a glance: the hours math (her refinement 9: overnight visits and visits that cross time blocks count
   correctly, never twice) and the reconcile check (tiles, chart and rows agree). Made-up visits only.
   (node tests/clients-glance-test.js) */
require('../clients-glance.js');
const { span, pieces, summarize, reconcile, calloffKind, mismatch, addDays } = globalThis.CLG._;
let pass = 0, fail = 0;
const ok = (name, cond, got) => { if(cond){ pass++; console.log('PASS ·', name); } else { fail++; console.log('FAIL ·', name, JSON.stringify(got)); } };
const D0 = '2026-11-05', d = n => addDays(D0, n);
const v = (day, time, end, extra) => Object.assign({ visit_id:'v' + Math.random().toString(36).slice(2, 7), date:d(day), time, end, client:'Test Client', client_id:'900', caregiver:'Pat Example', caregiver_id:'1' }, extra || {});
const sumBy = ps => { const o = {}; (ps || []).forEach(p => { const k = p.day + ':' + p.band; o[k] = (o[k] || 0) + p.min; }); return o; };
const total = ps => (ps || []).reduce((n, p) => n + p.min, 0);

ok('8 am to noon: 4 h morning', JSON.stringify(sumBy(pieces(v(0, '08:00', '12:00'), D0))) === '{"0:0":240}', sumBy(pieces(v(0, '08:00', '12:00'), D0)));
ok('10 am to 2 pm: 2 h morning + 2 h afternoon', JSON.stringify(sumBy(pieces(v(0, '10:00', '14:00'), D0))) === '{"0:0":120,"0:1":120}');
ok('10 pm to 6 am: 8 h on the night it starts', JSON.stringify(sumBy(pieces(v(0, '22:00', '06:00'), D0))) === '{"0:3":480}');
ok('8 pm to 8 am: evening 2 + overnight 8 + next morning 2 = 12 h', JSON.stringify(sumBy(pieces(v(2, '20:00', '08:00'), D0))) === '{"2:2":120,"2:3":480,"3:0":120}', sumBy(pieces(v(2, '20:00', '08:00'), D0)));
ok('a 24-hour visit (start equals end) is 24 h, split across five blocks', total(pieces(v(1, '08:00', '08:00'), D0)) === 1440 && pieces(v(1, '08:00', '08:00'), D0).length === 5);
ok('midnight to 6 am on day 1 belongs to the night before the week: not counted', total(pieces(v(0, '00:00', '06:00'), D0)) === 0);
ok('4 am to 8 am on day 1: only 6 to 8 am counts', total(pieces(v(0, '04:00', '08:00'), D0)) === 120);
ok('2 am to 7 am on day 8: 4 h on day 7\'s night, 6 to 7 am is the next week', JSON.stringify(sumBy(pieces(v(7, '02:00', '07:00'), D0))) === '{"6:3":240}');
ok('a visit with no end time is skipped, not guessed', pieces(v(0, '08:00', ''), D0) === null && span(v(0, '', '10:00'), D0) === null);

/* a made-up week: two clients, one open overnight, one open visit across blocks */
const week = [
  v(0, '08:00', '12:00'), v(0, '22:00', '06:00', { caregiver:null, caregiver_id:'' }), v(1, '10:00', '14:00', { caregiver:null, caregiver_id:'' }),
  v(2, '20:00', '08:00', { client:'Other Client', client_id:'901', caregiver:'Lee Example', caregiver_id:'2' }), v(3, '09:00', '13:00', { caregiver:'Lee Example', caregiver_id:'2' }),
  v(0, '00:00', '06:00'), v(0, '07:00', '', {})
];
const S = summarize(week, D0), R = reconcile(S);
ok('week total: 4 + 8 + 4 + 12 + 4 = 32 h (the midnight visit is last week, the no-end one is skipped)', S.tot.min === 32 * 60 && S.tot.noEnd === 1, S.tot);
ok('open: the overnight 8 h + the 10 to 2 visit 4 h = 12 h in 2 visits', S.tot.open === 12 * 60 && S.tot.openVisits === 2, S.tot);
ok('client 900: 20 h scheduled, 8 h covered, 12 h open', S.cl['900'].min === 1200 && S.cl['900'].open === 720, S.cl['900']);
ok('client 900 main caregiver: Lee 4 h, Pat 4 h, two names', Object.keys(S.cl['900'].cg).length === 2);
ok('tiles, chart and rows agree', R.ok && R.chart === R.tiles && R.rows === R.tiles && R.chartOpen === R.open, R);
ok('the open overnight shows only in Thursday\'s overnight square', S.cells[3][0].open === 480 && S.cells[3][1].open === 0 && S.cells[0][0].open === 0, S.cells[3][0]);
ok('the 10 to 2 open visit shows as 2 h in each of two squares, 4 h total', S.cells[0][1].open === 120 && S.cells[1][1].open === 120);

/* fuzz: 2,000 random visits, the pieces always add up to the visit clipped to the week, and everything reconciles */
const W0 = 360, W1 = 7 * 1440 + 360; let bad = 0; const many = [];
for(let i = 0; i < 2000; i++){
  const day = Math.floor(Math.random() * 9) - 1, s = Math.floor(Math.random() * 96) * 15, len = 15 * (1 + Math.floor(Math.random() * 96));
  const e = (s + len) % 1440, t = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const x = v(day, t(s), t(e), Math.random() < .3 ? { caregiver:null, caregiver_id:'' } : { client_id:String(900 + i % 7) });
  const sp = span(x, D0), want = Math.max(0, Math.min(sp[1], W1) - Math.max(sp[0], W0));
  if(total(pieces(x, D0)) !== want) bad++;
  many.push(x);
}
ok('2,000 random visits: every one adds up to its time inside the week', bad === 0, bad);
ok('2,000 random visits: tiles, chart and rows agree to the minute', reconcile(summarize(many, D0)).ok);

/* call-offs: covered vs missed care vs no outcome */
ok('covered', calloffKind({ status:'resolved', resolved_how:'covered' }) === 'covered' && calloffKind({ status:'done', resolved_how:'covered_other_way' }) === 'covered');
ok('missed care: uncovered or couldn\'t staff', calloffKind({ status:'done', resolved_how:'uncovered' }) === 'missed' && calloffKind({ status:'done', resolved_how:'couldnt_staff' }) === 'missed');
ok('client cancelled is its own kind', calloffKind({ status:'resolved', resolved_how:'client_cancelled' }) === 'cancelled');
ok('still open and no outcome yet', calloffKind({ status:'open' }) === 'open' && calloffKind({ status:'flagged' }) === 'open' && calloffKind({ status:'needs_outcome' }) === 'unknown');
ok('left out: dismissed, merged, not a call-in, new-client checks', [{ status:'dismissed' }, { status:'merged' }, { status:'done', not_a_callin:true, resolved_how:'covered' }, { kind:'interest', status:'open' }].every(c => calloffKind(c) === null));

/* Check with AxisCare */
ok('in care in the Hub, Deceased in AxisCare', /Deceased in AxisCare/.test(mismatch({ past:false, ax:{ active:false, status_label:'Deceased' } }) || ''));
ok('ended in the Hub, active in AxisCare', /still active in AxisCare/.test(mismatch({ past:true, ax:{ active:true } }) || ''));
ok('agree: nothing', mismatch({ past:false, ax:{ active:true } }) === null && mismatch({ past:true, ax:{ active:false } }) === null);
ok('paused in the Hub, on hold in AxisCare: not a disagreement', mismatch({ past:false, paused:{}, ax:{ active:false } }) === null);
ok('not connected yet is shown elsewhere, not here', mismatch({ unconnected:true, ax:{ active:true } }) === null);

console.log(pass, '/', pass + fail);
process.exit(fail ? 1 : 0);
