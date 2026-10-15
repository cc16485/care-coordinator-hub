/* node tests/profile-top-test.js: profile-top.js, a calmer profile top (Samantha 2026-10-15). Above the tabs only who
   this is and the one next step; Pause/End care, the review ask and the journey links go in More; the path goes to Start
   of Care; a client AxisCare shows as receiving care is never shown intake steps. */
const path = require('path'), fs = require('fs');
const P = require('../profile-top.js');
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };
const keys = p => p.menu.map(m => m.key).join(',');

/* care */
const active = P.plan({ care:{ state:'active', can:{ pause:true, end:true } } });
ck('plain Active: the care block leaves the top, Pause care and End care go to More', active.hideCare && keys(active) === 'pause,end' && active.menu[0].call.join() === 'ccCareForm,pause', active);
const paused = P.plan({ care:{ state:'paused', can:{ resume:true, end:true }, checklist:true } });
ck('paused: the block stays (since when, follow-up, Resume), nothing moves to More', !paused.hideCare && keys(paused) === '', paused);
ck('past or deceased: the block stays', !P.plan({ care:{ state:'past', can:{ end_date:true } } }).hideCare && !P.plan({ care:{ state:'deceased', can:{} } }).hideCare);
ck('active with an open Medicaid checklist: the block stays', !P.plan({ care:{ state:'active', can:{ pause:true }, checklist:true } }).hideCare);
ck('starting care: the block stays', !P.plan({ care:{ state:'starting', can:{ pause:true } } }).hideCare);
ck('no AxisCare client (a lead): nothing about care', (p => !p.hideCare && !p.menu.length)(P.plan({ care:null })));

/* review */
ck('no ask to make: the review box is hidden; Ask for a Google review is in More', (p => !p.showReview && keys(p) === 'review' && p.menu[0].call[0] === 'rvSuggest')(P.plan({ review:{ can_suggest:true } })));
ck('an ask to make: the review box shows (on the Overview)', P.plan({ review:{ open:true } }).showReview && !keys(P.plan({ review:{ open:true } })));
ck('a follow-up on an ask: the box shows', P.plan({ review:{ followup:true } }).showReview);
ck('nothing to suggest: no box, no menu line', (p => !p.showReview && !p.menu.length)(P.plan({ review:{} })));

/* the active-client fix */
const dan = P.plan({ care:{ state:'active', can:{ pause:true, end:true } }, journey:{ status:'open', stage:'intake' } });
ck('Dan: active in AxisCare, journey still at intake → no intake step at the top', dan.intakeHidden, dan);
ck('...same at pre-checks and the assessment', P.plan({ care:{ state:'active' }, journey:{ status:'open', stage:'prechecks' } }).intakeHidden && P.plan({ care:{ state:'paused' }, journey:{ status:'open', stage:'assessment' } }).intakeHidden);
ck('a new client in AxisCare (starting) still sees the intake steps', !P.plan({ care:{ state:'starting' }, journey:{ status:'open', stage:'intake' } }).intakeHidden);
ck('an active client getting ready (staffing) keeps the step: that is real work', !P.plan({ care:{ state:'active' }, journey:{ status:'open', stage:'team' } }).intakeHidden);
ck('a lead (no care state) keeps its intake steps', !P.plan({ journey:{ status:'open', stage:'intake' } }).intakeHidden);
ck('the note says why, in her words, no em dashes', /receiving care/.test(P.NOTE) && /See every step/.test(P.NOTE) && P.NOTE.indexOf('—') < 0);

/* the page */
const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const top = page.slice(page.indexOf('<section id="leadProfileView"'), page.indexOf('<div id="cpTabs"'));
ck('above the tabs: header, facts, care, the journey card; no path, no review box', top.includes('id="cpTopMore"') && top.includes('id="cpFacts"') && top.includes('id="ccCare"') && top.includes('id="cjHead"') && !top.includes('id="cpPath"') && !top.includes('id="ccReview"'));
const pane = k => { const i = page.indexOf('data-cp-pane="' + k + '"'); return page.slice(i, page.indexOf('data-cp-pane=', i + 20)); };
ck('the stage bar and tracks are on Start of Care, with the note above them', pane('start').includes('<div id="cpStartNote"></div>\n  <div id="cpPath"></div>'));
ck('the review box and the journey extras are on the Overview', pane('summary').includes('<div id="ccReview"></div>') && pane('summary').includes('<div id="cpOverJ"></div>'));
ck('the More menu is in the header row', /id="cpChips"[^]*?id="cpTopMore"[^]*?id="cpTopMenu"[^]*?id="cpTopLinks"[^]*?<\/div>\s*<!-- Gate 1a/.test(page));
ck('index.html loads profile-top.js after the files it arranges', (i => i > page.indexOf('src="client-journey.js') && i > page.indexOf('src="client-care.js') && i > page.indexOf('src="review-ask.js'))(page.indexOf('src="profile-top.js?v=')));
const lw = fs.readFileSync(path.join(__dirname, '..', 'lead-workspace.js'), 'utf8');
ck('the lead workspace says the stage itself now (the path is on another tab)', lw.includes("+ '</div></div>' + stepsHtml(st) + '</div>';"));
const src = fs.readFileSync(path.join(__dirname, '..', 'profile-top.js'), 'utf8');
ck('profile-top.js never edits the files that draw the blocks, and has no em dashes', !/innerHTML\s*=\s*['"`].*cj-next/.test(src) && src.indexOf('—') < 0);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
