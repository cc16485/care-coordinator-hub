/* node tests/profile-top-test.js: profile-top.js, a calmer profile top (Samantha 2026-10-15, refined the same day). One
   header line and ONE next action above the tabs, picked safety first, then an uncovered shift, then anything late, then
   the routine step; no card when nothing needs doing; Pause/End care, the review ask and the journey links in More; the
   path on Start of Care; only office roles may change the Care Coordinator. */
const path = require('path'), fs = require('fs');
const P = require('../profile-top.js');
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };
const keys = p => p.menu.map(m => m.key).join(',');

/* what moves */
const active = P.plan({ care:{ state:'active', can:{ pause:true, end:true } } });
ck('plain Active: the care block leaves the top, Pause care and End care go to More', active.hideCare && keys(active) === 'pause,end' && active.menu[0].call.join() === 'ccCareForm,pause', active);
ck('paused: the block stays (since when, follow-up, Resume), nothing moves to More', (p => !p.hideCare && keys(p) === '')(P.plan({ care:{ state:'paused', can:{ resume:true, end:true }, checklist:true } })));
ck('past, deceased, or an open checklist: the block stays', !P.plan({ care:{ state:'past', can:{} } }).hideCare && !P.plan({ care:{ state:'deceased', can:{} } }).hideCare
  && !P.plan({ care:{ state:'active', can:{ pause:true }, checklist:true } }).hideCare);
ck('starting care: the status is on the header line, Pause care and End care go to More', (p => p.hideCare && keys(p) === 'pause,end')(P.plan({ care:{ state:'starting', can:{ pause:true, end:true } } })));
ck('a lead\'s next step never shows a bare phone number under it', P.pickNext({ lead:{ text:'Call Joe', sub:'4175550122', source:'lead' } }).sub === '' && P.pickNext({ lead:{ text:'Call Joe', sub:'about the visit', source:'lead' } }).sub === 'about the visit');
ck('a lead with no AxisCare client: nothing about care', (p => !p.hideCare && !p.menu.length)(P.plan({ care:null })));
ck('no ask to make: no review box; Ask for a Google review is in More', (p => !p.showReview && keys(p) === 'review')(P.plan({ review:{ can_suggest:true } })));
ck('an ask to make or follow up: the review box shows (on the Overview)', P.plan({ review:{ open:true } }).showReview && P.plan({ review:{ followup:true } }).showReview);

/* the one next action, her order */
const due = (kind, tone, label, tab) => ({ kind, tone, label, tab:tab || 'checkins' });
const routineJ = { key:'team.staffed', title:'Staff every shift', why:'', status:'ready' };
let n = P.pickNext({ due:[due('review', 'warn', 'first plan review needed', 'care:reviews'), due('calloff', 'bad', '2 open call-offs', 'team'), due('ckconcern', 'bad', 'check-in escalated: fell Tuesday')], journey:routineJ });
ck('safety first: an escalated check-in beats an uncovered shift and the routine step', n.tier === 1 && n.kicker === 'Safety' && /fell Tuesday/.test(n.text) && n.go.tab === 'checkins' && n.more === 3, n);
n = P.pickNext({ due:[due('review', 'warn', 'first plan review needed', 'care:reviews'), due('calloff', 'bad', '2 open call-offs', 'team')], journey:routineJ });
ck('then an uncovered shift', n.kicker === 'Uncovered shift' && n.text === '2 open call-offs' && n.go.tab === 'team', n);
n = P.pickNext({ due:[due('concern', 'bad', '1 open concern: wants a new caregiver', 'summary'), due('calloff', 'bad', '1 open call-off', 'team')] });
ck('an open concern counts as safety', n.kicker === 'Safety' && /new caregiver/.test(n.text));
n = P.pickNext({ due:[due('review', 'warn', 'first plan review needed', 'care:reviews'), due('checkin', 'bad', 'check-in overdue since Oct 9')], journey:routineJ });
ck('then anything late (an overdue check-in beats routine work)', n.tier === 3 && n.kicker === 'Late' && /overdue/.test(n.text), n);
n = P.pickNext({ due:[due('review', 'warn', 'first plan review needed', 'care:reviews')], journey:{ key:'asmt.book', title:'Book the in-home assessment', why:'2 days late', status:'attention' } });
ck('a journey step that needs attention is time-sensitive and opens that step', n.tier === 3 && n.kicker === 'Needs attention' && n.go.step === 'asmt.book' && n.sub === '2 days late', n);
n = P.pickNext({ lead:{ text:'Call Karen back (promised 2:00)', source:'family', due:true, late:'1 hour late' }, journey:routineJ });
ck('a promise to a family that is due wins over the routine journey step', n.tier === 3 && n.kicker === '1 hour late' && /Call Karen back/.test(n.text) && n.go.lead, n);
n = P.pickNext({ lead:{ text:'Confirm the client\'s basics', source:'journey', due:false }, journey:{ key:'intake.basics', title:'Confirm the client\'s basics', status:'ready' } });
ck('a lead whose next step IS the journey step: one entry, opening the step', n.kicker === 'Next' && n.go.step === 'intake.basics' && n.more === 0, n);
n = P.pickNext({ due:[due('review', 'warn', 'first plan review needed', 'care:reviews')] });
ck('routine only: plain Next, opens the right tab', n.tier === 4 && n.kicker === 'Next' && n.text === 'First plan review needed' && n.go.tab === 'care:reviews', n);
ck('nothing to do: no card at all', P.pickNext({ due:[due('calloff', 'dim', '1 call-off in 30 days', 'team')] }) === null && P.pickNext({}) === null && P.pickNext({ lead:{ text:'', source:'none' } }) === null);

/* the header line */
ck('status: AxisCare\'s care state wins once they are a client', P.statusWords('care', 'active') === 'Receiving care' && P.statusWords('care', 'paused') === 'Paused' && P.statusWords('past', 'past') === 'Past client');
ck('status: a new client still starting shows the stage, a lead shows its stage and detail', P.statusWords('ready', 'starting', 'before staffing') === 'Getting ready · before staffing' && P.statusWords('talking', null, 'intake') === 'Talking · intake' && P.statusWords('new', null) === 'New lead');
ck('a restart (past client coming back, journey open) shows its stage, not Past', P.statusWords('talking', 'starting', 'intake') === 'Talking · intake');
ck('only an owner or a Care Coordinator gets the change button', P.canChangeCc(['care_coordinator']) && P.canChangeCc(['owner_admin']) && !P.canChangeCc(['staffing_coordinator']) && !P.canChangeCc([]) && !P.canChangeCc(undefined));

/* the page */
const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const top = page.slice(page.indexOf('<section id="leadProfileView"'), page.indexOf('<div id="cpTabs"'));
ck('above the tabs: header row with More, facts, the one-line top, care; no path, no review box', top.includes('id="cpTopMore"') && top.includes('id="cpFacts"') && top.includes('<div id="cpTop"></div>') && top.includes('id="ccCare"') && !top.includes('id="cpPath"') && !top.includes('id="ccReview"'));
ck('the journey card is hidden while profile-top runs', page.includes('#leadProfileView.pt-on #cjHead{display:none !important;}'));
const pane = k => { const i = page.indexOf('data-cp-pane="' + k + '"'); return page.slice(i, page.indexOf('data-cp-pane=', i + 20)); };
ck('the stage bar and tracks are on Start of Care', pane('start').includes('<div id="cpPath"></div>') && !page.includes('cpStartNote'));
ck('the review box and the journey extras are on the Overview', pane('summary').includes('<div id="ccReview"></div>') && pane('summary').includes('<div id="cpOverJ"></div>'));
ck('index.html loads profile-top.js after the files it reads', (i => i > page.indexOf('src="client-journey.js') && i > page.indexOf('src="client-care.js') && i > page.indexOf('src="review-ask.js') && i > page.indexOf('src="lead-workspace.js'))(page.indexOf('src="profile-top.js?v=')));
const src = fs.readFileSync(path.join(__dirname, '..', 'profile-top.js'), 'utf8');
ck('profile-top.js has no em dashes and no screen-side "receiving care" guess (the server decides, Staffing #454)', src.indexOf('—') < 0 && !/intakeHidden/.test(src));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
