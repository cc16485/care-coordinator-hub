/* node tests/offer-no-start-date-test.js
   No start date on an offer (Samantha, 2026-10-08: "in home care we don't have an exact start date"). The offer form
   has no start date field, the offer and the applicant's copy carry none, and the Starting soon view no longer calls
   a hire with no date a problem: a hire stays on it for 4 weeks after being hired. No em dash in the new words. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 400))); };
ck('the offer form has no start date field', !html.includes('id="jo_start"') && !html.includes('Proposed start date'));
const submit = html.slice(html.indexOf('async function submitJobOffer('), html.indexOf('function joPreviewMsgs('));
ck('the offer sent to the server carries no start date', !/start_date/.test(submit));
ck('the reset list no longer names it', html.includes("['jo_hours','jo_build'].forEach") && !html.includes("'jo_start'"));
const starting = html.slice(html.indexOf("case 'starting':   {"), html.indexOf("case 'pool':"));
ck('Starting soon keeps a hire for 4 weeks after hire instead of flagging the missing date', /apDays\(r\.hired_at\) < 28/.test(starting) && !/itself the problem/.test(starting));
const view = html.slice(html.indexOf('/* ---- Starting soon'), html.indexOf('function apRenderFilter(') > 0 ? html.indexOf('<b>Offers</b>, <b>Background</b> and <b>Orientation</b>') : html.length);
ck('the cards no longer say "no start date" or count the stuck', !/no start date/.test(view) && !/quietly turns into somebody who never started/.test(view));
ck('a hire with no date shows when they were hired', /hired ' \+ esc\(day\(r\.hired_at\)\)/.test(view));
ck('an older record with a date still shows it', /if\(r\.start_date\) steps\.push/.test(view));
ck('no em dash in the new words', !/—/.test(starting) && !/—/.test(html.slice(html.indexOf('No start date on an offer (Samantha'), html.indexOf('No start date on an offer (Samantha') + 300)));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
