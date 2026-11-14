// Email results (Samantha 2026-11-13: "where do i see if it's opened or read or responded to or who has unsubscribed",
// then "it should be in the marketing area").   node tests/email-results-test.js
const fs = require('fs'), path = require('path');
const R = require('../email-results.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const src = fs.readFileSync(path.join(__dirname, '..', 'email-results.js'), 'utf8');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 700)]);
const NOW = Date.parse('2026-11-16T18:00:00Z'); const at = (h) => new Date(NOW - h * 3600000).toISOString();
const S = [
  { id: '1', at: at(3), key: 'r39', subj: 'A different kind of partner', aud: 'referrers', to: 'a@hospice.org', org: 'Hope Hospice', auto: true, checked_at: at(1), found: true, status: 'opened', opened_at: at(1) },
  { id: '2', at: at(3), key: 'r39', subj: 'A different kind of partner', aud: 'referrers', to: 'b@alf.org', org: 'Birch Pointe', name: 'Dana Cole', auto: true, checked_at: at(1), found: true, status: 'delivered' },
  { id: '3', at: at(3), key: 'r39', subj: 'A different kind of partner', aud: 'referrers', to: 'c@law.org', org: 'Able Law', auto: true, checked_at: at(1), found: true, status: 'opened', opened_at: at(2), replied_at: at(1) },
  { id: '4', at: at(3), key: 'r39', subj: 'A different kind of partner', aud: 'referrers', to: 'd@gone.org', org: 'Gone Home Health', auto: true, checked_at: at(1), found: true, status: 'bounced', problem: 'bounced' },
  { id: '5', at: at(3), key: 'r39', subj: 'A different kind of partner', aud: 'referrers', to: 'e@x.org', auto: true, error: 'messages 500' },
  { id: '6', at: at(3), key: 'r39', subj: 'A different kind of partner', aud: 'referrers', to: 'f@x.org', auto: true },
  { id: '7', at: at(3), key: 'r39', subj: 'A different kind of partner', aud: 'referrers', to: 'g@x.org', auto: true, checked_at: at(1), found: false },
  { id: '8', at: at(30), key: 'r5', subj: 'By hand', aud: 'referral-partner', to: 'a@hospice.org', org: 'Hope Hospice', auto: false, checked_at: at(1), found: true, status: 'delivered' },
  { id: '9', at: at(24 * 40), key: 'm23', subj: 'Home for the holidays?', aud: 'monthly', to: 'lee@example.com', name: 'Lee Park', auto: true, checked_at: at(1), found: true, status: 'opened', opened_at: at(900) },
  { id: '10', at: at(50), key: 'g2', subj: 'Team news', aud: 'caregivers', to: 'cg@example.com', auto: true },
];
const w = (i) => R.statusOf(S[i]).word;
ck('each person gets one plain answer', w(0) === 'Opened' && w(1) === 'Sent, not opened yet' && w(2) === 'Wrote back' && /Did not arrive \(bounced\)/.test(w(3)), S.map((_, i) => w(i)));
ck('an email that could not be checked, has not been checked, or was not found NEVER reads as "not opened"', w(4) === 'Could not be checked just now' && w(5) === 'Not checked yet' && w(6) === 'Not found in GoHighLevel' && ![4, 5, 6].some((i) => /not opened/i.test(w(i))));
const g = R.groups(S);
ck('one line per email per day, newest first; the same person by hand on another day is its own line', g.length === 4 && g[0].key === 'r39' && g[0].people.length === 7 && g[1].key === 'r5', g.map((x) => [x.key, x.people.length]));
ck('the counts: a reply counts as opened too; "known" leaves out the ones we could not check', g[0].sent === 7 && g[0].opened === 2 && g[0].replied === 1 && g[0].problems === 1 && g[0].known === 4, g[0]);
ck('it says whether the schedule or a person sent it', g[0].auto === true && g[1].auto === false);
ck('the audience pills sort leads, partners (both spellings), caregivers', R.audOf(S[8]) === 'leads' && R.audOf(S[7]) === 'partners' && R.audOf(S[0]) === 'partners' && R.audOf(S[9]) === 'caregivers' && R.audOf({ aud: 'client-contact' }) === 'clients' && R.audOf({ aud: '' }) === 'other');
ck('filter by audience and by a name, organization or address', R.filter(S, 'leads', '').length === 1 && R.filter(S, 'all', 'hope').length === 2 && R.filter(S, 'partners', 'dana').length === 1 && R.filter(S, 'all', 'LEE@').length === 1);
const t = R.totals(S, NOW, 30);
ck('the tiles count the last 30 days only', t.sent === 9 && t.opened === 2 && t.replied === 1, t);
const data = { ok: true, at: at(0), sends: S, unsubscribed: [{ email: 'gone@example.com', at: at(5), how: 'pressed Unsubscribe in an email', org: 'Old Org' }], switched_off: [{ email: 'off@example.com', name: 'Off Person', at: at(9) }], still_to_check: 3, unread: 1 };
let h = R.html({ aud: 'all', q: '', open: {}, data }, NOW);
ck('the screen: four tiles, the pills, a line per email, who unsubscribed, who is switched off', /Emails sent/.test(h) && /Wrote back/.test(h) && /Unsubscribed \(1\)/.test(h) && /gone@example\.com/.test(h) && /Monthly emails turned off in the Hub \(1\)/.test(h) && /Off Person/.test(h) && /Referral partners/.test(h) && /A different kind of partner/.test(h));
ck('opened is said out of the ones we could check', /of 5 we could check/.test(h), (h.match(/of \d+ we could check/) || [])[0]);
ck('it says plainly when some are still to check or GoHighLevel did not answer', /3 still to check/.test(h) && /could not answer for 1 just now/.test(h));
ck('people stay folded until a line is opened', !/b@alf\.org/.test(h) && /Show who/.test(h));
h = R.html({ aud: 'all', q: '', open: { [g[0].k]: true }, data }, NOW);
ck('an opened line lists each person with their answer', /b@alf\.org/.test(h) && /Birch Pointe/.test(h) && /Dana Cole/.test(h) && /Sent, not opened yet/.test(h) && /Did not arrive/.test(h));
h = R.html({ aud: 'all', q: 'hope', open: {}, data }, NOW);
ck('a search opens the matching lines by itself', /a@hospice\.org/.test(h) && !/b@alf\.org/.test(h));
ck('nothing sent yet says so kindly', /No emails have gone out yet/.test(R.html({ aud: 'all', q: '', open: {}, data: { sends: [], unsubscribed: [] } }, NOW)) && /Nobody has unsubscribed/.test(R.html({ aud: 'all', q: '', open: {}, data: { sends: [], unsubscribed: [] } }, NOW)));
ck('before the server piece is installed it says so, and an error is shown as an error', /not switched on yet/.test(R.html({ notOn: true }, NOW)) && /could not be read just now: boom/.test(R.html({ err: 'boom' }, NOW)));
ck('a name with code in it is shown as text', !/<img/.test(R.html({ aud: 'all', q: '', open: { x: 1 }, data: { sends: [{ id: 'x', at: at(2), key: 'k', subj: '<img src=x>', aud: 'monthly', to: 'a@b.co', name: '<img src=x>' }], unsubscribed: [{ email: '<img src=x>' }] } }, NOW)));
ck('it explains what "Opened" can and cannot tell her, and where to read a reply', /loads its pictures/.test(h) && /open that person in GoHighLevel/.test(h));
ck('her wording rules: no em dashes, and the screen never says AI', !/—/.test(src.split('=============================================================================')[2] || src) && !/\bAI\b/.test(h));
ck('it is the Results view inside Campaigns, not a pill of its own', !/data-tab="emailresults"/.test(html) && !/id="tab-emailresults"/.test(html) && /partners:\['referrers','friendsfamily','campaigns','feedback','materials'\]/.test(html) && /<div id="cmpSub"/.test(html) && /<div id="emailResults" style="display:none;">/.test(html) && /\['results','Results'\]/.test(html));
ck('an old link or the old pill name lands on Campaigns, Results', /if\(tab==='emailresults'\)\{ try\{ cmpView='results'; \}catch\(e\)\{\} tab='campaigns'; \}/.test(html) && /'email-results':'emailresults'/.test(html) && /<script src="email-results\.js\?v=1"><\/script>/.test(html));
ck('the Hub draws it only while Results is the open view', /if\(cmpView==='results' && window\.CCEmailResults\)\{[\s\S]{0,260}CCEmailResults\.show\(\); return;/.test(html));
ck('the Autopilot row keeps what it does not show: saving starts from what is saved', /const item=\{\.\.\.cmpSettings\(\),\s*id:'settings',/.test(html) && !/DATA\.campaign_settings=\[item\];\s*try\{ await persist\('campaign_settings', item\)[\s\S]{0,40}const item=\{id:'settings',/.test(html));
ck('the row no longer says partner emails stay manual, and says where the two series stand', !/Referral-partner emails stay manual/.test(html) && /Monthly email to open leads/.test(html) && /'Partner series'/.test(html) && /turned on and off by a step you run, not by the boxes above/.test(html));
ck('coming up and "due and not gone" count only audiences whose box is on', /if\(onlyOn && !onlyOn\['aud_'\+e\.aud\]\) continue;/.test(html) && /cmpDueSoon\(0, cfg\)/.test(html) && /cmpDueSoon\(30, cfg\)/.test(html));
ck('it asks the server at most every five minutes on its own, and only ever POSTs to email-results', /askedAt > 300000/.test(src) && /replace\(\/campaign-send\$\/, 'email-results'\)/.test(src) && (src.match(/fetch\(/g) || []).length === 1);
ck('it saves nothing itself', !/persist\(|localStorage|upsert/.test(src));
for (const [n, c, d] of res) console.log((c ? '  ✓ ' : '  ✗ ') + n + (d ? '\n      ' + d : ''));
console.log(res.filter((x) => x[1]).length + '/' + res.length + ' passed');
process.exit(res.every((x) => x[1]) ? 0 : 1);
