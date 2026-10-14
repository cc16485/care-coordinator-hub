/* node tests/nurse-review-hooks-test.js
   RN review (2026-10-14, LPN nurse visit plan steps 5 to 7): the index.html edit stays one script tag and one mount; the Nurse
   Portal rows still carry the markers nurse-review-portal.js finds its place by; rn.html reads only from the rn-review server
   function (never app_data, never a database call), uses the Hub's sign-in, keeps nothing in browser storage, and says no em
   dash; (the rule files the build spec protects are not touched by this change). */
const fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 400))); };
const html = R('index.html'), js = R('nurse-review-portal.js'), pageAll = R('rn.html'), page = pageAll.replace(/<!--[\s\S]*?-->/g, '');
ck('nurse-review-portal.js is loaded once, with ?v=2 (the one service list), after driver-compliance.js', (html.match(/<script src="nurse-review-portal\.js\?v=2"><\/script>/g) || []).length === 1 && html.indexOf('nurse-review-portal.js?v=2') > html.indexOf('driver-compliance.js?v=1'));
ck('one mount, at the end of nursePortalRender, guarded', (html.match(/NurseReview\.mount\(/g) || []).length === 1 && /try\{ if\(window\.NurseReview\) NurseReview\.mount\(me, real\); \}catch\(_\)\{\}/.test(html)
  && html.indexOf('NurseReview.mount(') > html.indexOf('function nursePortalRender(me)') && html.indexOf('NurseReview.mount(') < html.indexOf('async function npClaim(id)'));
ck('the Nurse Portal rows still carry gheNewFor(\'<client>\') and gheOpen(\'<form>\') buttons, the hooks the portal half finds its place by', /onclick="gheNewFor\(\\''\+c\.id\+'\\'\)">📋 GHE form<\/button>/.test(html) && /onclick="gheOpen\(\\''\+g\.id\+'\\'\)">Open<\/button>/.test(html) && /id="npMine"/.test(html) && /id="npGhe"/.test(html));
ck('rn.html calls only the rn-review function with the signed-in session; never app_data, a table, an rpc or storage', /functions\/v1\/rn-review/.test(page) && !/app_data|\.from\(|\.rpc\(|storage\.from|functions\.invoke\('(?!rn-review)/.test(page) && /Authorization: 'Bearer ' \+ session\.access_token/.test(page));
ck('rn.html uses the Hub sign-in (signInWithPassword) like the other staff pages', /sb\.auth\.signInWithPassword\(\{ email: \$\('liEmail'\)\.value\.trim\(\), password: \$\('liPass'\)\.value \}\)/.test(page));
ck('rn.html keeps nothing in browser storage itself', !/localStorage|sessionStorage|indexedDB/.test(page));
ck('nurse-review-portal.js calls only rn-review; never writes app_data', /const FN = 'rn-review'/.test(js) && !/upsert_app_data_item|\.from\(|persist\(/.test(js));
ck('no em dash in rn.html or nurse-review-portal.js; "skin monitoring", never "skin assessment"', !/\u2014/.test(pageAll + js) && !/skin assessment/i.test(page + js) && /Skin monitoring/.test(js));
ck('rn.html works on a phone (viewport, one narrow-screen rule)', /width=device-width, initial-scale=1/.test(page) && /@media \(max-width:520px\)/.test(page));
console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
