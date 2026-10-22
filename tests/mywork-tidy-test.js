/* node tests/mywork-tidy-test.js — mywork-tidy.js (2026-10-22, her approved mockup): which Team Work cards leave the pile,
   how late a card is, and what Clear and Undo write on a card. */
const M = require('../mywork-tidy.js');
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 500))); };
const now = Date.parse('2026-10-22T20:00:00Z'), D = 864e5, iso = t => new Date(t).toISOString();
ck('off unless the switch is exactly on', !M.liveOn({}) && !M.liveOn({ mywork_tidy_live:'yes' }) && M.liveOn({ mywork_tidy_live:true }));
ck('EVV review cards leave the pile', M.sortOut({ kind:'evv_review' }, now) === 'evv' && M.sortOut({ kind:'EVV-review' }, now) === 'evv');
ck('"Make it official?" goes to the weekly list', M.sortOut({ kind:'staffing', title:'Make it official? Robin has covered April’s Friday slot' }, now) === 'official');
ck('a call card 3 days past its due day: Past its day', M.sortOut({ kind:'call_followup', due:iso(now - 3 * D) }, now) === 'past');
ck('a call card 1 day late stays in the pile', M.sortOut({ kind:'call_followup', due:iso(now - D) }, now) === '');
ck('a coverage check 5 days late stays (only call cards fold)', M.sortOut({ kind:'coverage_outcome', due:iso(now - 5 * D) }, now) === '');
ck('a care-at-risk clock-out card stays', M.sortOut({ kind:'missed_clockout', opened_by:'timekeeper', due:iso(now - 3 * 36e5) }, now) === '');
ck('days late: by due, else when made, 0 when not late', M.daysLate({ due:iso(now - 7.5 * D) }, now) === 7 && M.daysLate({ created_at:iso(now - 4 * D) }, now) === 4 && M.daysLate({ due:iso(now + D) }, now) === 0);
const card = { id:'c1', status:'open', kind:'call_followup', title:'Call back Amber', owner:'', history:[{ at:'x', by:'Hub', text:'made' }] };
const c = M.clearOne(card, { email:'Sam@mo-care.com', name:'Samantha T' }, 'Handled by phone', '2026-10-22T20:00:00Z');
ck('Clear: done, with who, when and why kept on the card', c.status === 'done' && c.resolution_code === 'cleared' && c.close_reason === 'Handled by phone' && c.closed_by === 'sam@mo-care.com' && c.cleared.by_name === 'Samantha T' && c.history.at(-1).text === 'Cleared: Handled by phone', c);
ck('Clear never touches who owns it, the family or the lead', c.owner === card.owner && c.title === card.title && c.kind === card.kind && card.status === 'open');
ck('Clear on a card already closed does nothing', M.clearOne({ id:'c2', status:'done' }, {}, 'x', 'y') === null);
const u = M.reopenOne(c, { name:'Samantha T' }, '2026-10-22T20:05:00Z');
ck('Undo: open again, the clear fields gone, both steps in its history', u.status === 'open' && !('cleared' in u) && !('close_reason' in u) && !('resolution_code' in u) && u.history.slice(-2).map(h => h.text).join('|') === 'Cleared: Handled by phone|Reopened (undo clear)', u);
ck('Undo only reopens a card that Clear closed', M.reopenOne({ status:'done', resolution_code:'done' }, {}, 'x') === null);
ck('the reasons', M.REASONS.join('|') === 'Handled by phone|The day has passed|Already done in AxisCare|Not needed|Old or test card');
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
