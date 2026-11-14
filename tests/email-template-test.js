// The email look (email-template.js, Samantha 2026-11-13 "Yes, build it"): one file the Hub and the server both use.
// node tests/email-template-test.js
const fs = require('fs'), path = require('path');
const HUB = path.join(__dirname, '..');
const T = require('../email-template.js');
const lib = fs.readFileSync(path.join(HUB, 'email-library.js'), 'utf8'), html = fs.readFileSync(path.join(HUB, 'index.html'), 'utf8');
const api = new Function('CCEmailTemplate', lib + ';return { L: CC_EMAIL_LIBRARY, build: ccBuildEmailHTML, assets: CC_EMAIL_ASSETS }')(T);
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 600)]);
const all = api.L.map(e => [e, api.build(e)]);
ck('every email in the library is drawn, whole, with nothing missing', all.length > 80 && all.every(([e, h]) => /^<!DOCTYPE html>/.test(h) && /<\/html>$/.test(h) && !/undefined|NaN|\[object/.test(h)), all.filter(([e, h]) => /undefined|NaN|\[object/.test(h)).map(([e]) => e.key));
ck('...with its own subject, headline and every paragraph of its words', all.every(([e, h]) => h.includes(e.head) && (e.blocks || []).filter(b => b.t === 'p').every(b => h.includes(b.text))));
ck('...and one Unsubscribe link, left as {unsub} for the server to fill in for each person', all.every(([e, h]) => h.split('href="{unsub}"').length === 2));
ck('pictures come from mo-care.com, not the old address', api.assets === 'https://mo-care.com/email-assets' && all.every(([e, h]) => !/pages\.dev|guide\.mo-care/.test(h)));
const partners = all.filter(([e]) => e.aud === 'referrers'), others = all.filter(([e]) => e.aud !== 'referrers');
ck('every referral-partner email has a real photo, "For referral partners" and the three ways to refer', partners.length > 20 && partners.every(([e, h]) => /email-assets\/photos\/scene-[a-z-]+\.jpg/.test(h) && /For referral partners/.test(h) && /Refer in two minutes/.test(h)));
ck('...the photo follows the partner type', /scene-hands\.jpg/.test(api.build(api.L.find(e => e.aud === 'referrers' && e.seg === 'Hospice & Palliative'))) && /scene-puzzle\.jpg/.test(api.build(api.L.find(e => e.aud === 'referrers' && e.seg === 'Senior Living'))));
ck('...and its footer is written for a partner', partners.every(([e, h]) => /your organization serves older adults/.test(h) && !/about care for your family/.test(h)));
ck('no other email carries the partner lines; each keeps its drawn banner', others.every(([e, h]) => !/For referral partners|Refer in two minutes/.test(h) && (!e.banner || h.includes('/' + e.banner + '.jpg'))));
ck('caregivers, clients and families are each told why in their own words', /part of the Caring Companions team/.test(api.build(api.L.find(e => e.aud === 'caregivers'))) && /you are a Caring Companions client/.test(api.build(api.L.find(e => e.aud === 'clients'))) && /cares for someone in your family/.test(api.build(api.L.find(e => e.aud === 'client_contacts'))) && /about care for your family/.test(api.build(api.L.find(e => e.aud === 'monthly'))));
ck('the page loads the look before the library', /<script src="email-template\.js\?v=\d+"><\/script><script src="email-library\.js\?v=[0-9a-z]+"><\/script>/.test(html));
const staffing = process.env.STAFFING || path.join(HUB, '..', 'Staffing-Coordinator-Hub'), theirs = path.join(staffing, 'supabase/functions/_shared/email-template.js');
if (fs.existsSync(theirs)) ck('the server\'s copy is this very file', fs.readFileSync(theirs, 'utf8') === fs.readFileSync(path.join(HUB, 'email-template.js'), 'utf8'));
else console.log('  (skip: no server copy of email-template.js here to compare)');
let pass = 0; for (const [n, ok, note] of res) { console.log((ok ? '  ✓ ' : '  ✗ ') + n + (ok ? '' : '\n      ' + note)); if (ok) pass++; }
console.log(`\n${pass}/${res.length} passed`); process.exit(pass === res.length ? 0 : 1);
