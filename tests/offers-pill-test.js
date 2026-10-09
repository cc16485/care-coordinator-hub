/* node tests/offers-pill-test.js
   The Offers pill is back in Recruit & Onboard (Samantha, 2026-10-09: "put the offers tab back"). Open offers is the one
   place an offer with no applicant record can be reached, and the signing link lives on its card. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 400))); };
const bar = html.slice(html.indexOf('id="fsub-interviews"'), html.indexOf('</div>', html.indexOf('data-tab="apjourney"')));
ck('the Recruit & Onboard row has an Offers pill that opens the offers tab', /data-tab="offers" onclick="switchTab\('offers'\)"/.test(bar) && /> Offers</.test(bar));
ck('it sits between Interviews and Background & References', bar.indexOf('data-tab="interviews"') < bar.indexOf('data-tab="offers"') && bar.indexOf('data-tab="offers"') < bar.indexOf('data-tab="cgbackground"'));
ck('the pill carries the open-offers count badge the engine already fills', /id="offersBadge"/.test(bar));
ck('the pill uses a sprite icon, not an emoji', /icons\.svg#i-doc/.test(bar) && !/📋|💼/.test(bar.slice(bar.indexOf('data-tab="offers"'), bar.indexOf('data-tab="offers"') + 200)));
ck('the offers panel still exists and belongs to the Recruit & Onboard group', /id="tab-offers"/.test(html) && /interviews:\[[^\]]*'offers'/.test(html));
ck('offers is remembered as the section\'s last page like any other tab', /if\(g!=='today'\) localStorage\.setItem\('cch_last_'\+g,tab\);/.test(html) && !/tab!=='offers'/.test(html));
ck('no em dash in the new words', !/—/.test(bar));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
