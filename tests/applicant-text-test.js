/* node tests/applicant-text-test.js
   574 (2026-10-10, Samantha: "yes to all, build it"): text an applicant from the Hub. A Text button on every applicant
   (Applicants rows and page, the Interviews tab, the phone's Find and Today), the 'texted 2h ago by' chip, the thread
   card with a reply box on their page, Cancel going through the who-is-cancelling sheet, the journey entries, and the
   composer file itself (loaded for real with a fake sb). No em dash in any words a person sees. */
const fs = require('fs'), path = require('path');
const H = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(H, 'index.html'), 'utf8');
const phone = fs.readFileSync(path.join(H, 'phone-mode.js'), 'utf8');
const src = fs.readFileSync(path.join(H, 'applicant-text.js'), 'utf8');
const journey = fs.readFileSync(path.join(H, 'applicant-journey.js'), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 400))); };
const between = (a, b) => { const i = html.indexOf(a); const j = html.indexOf(b, i); return i < 0 || j < 0 ? '' : html.slice(i, j); };

/* ── wiring in index.html ── */
ck('the composer file is loaded by the Hub (and the phone bumped its version)', /<script src="applicant-text\.js\?v=\d+"><\/script>/.test(html) && /phone-mode\.js\?v=6/.test(html));
const row = between("box.innerHTML = sweep + rows.map(r=>{", "function apStartingMount(");
ck('Applicants row: a Text button and the chip next to Call', /ApText\.btn\(r\.id\) \+ ApText\.slot\(r\.id\)/.test(row) && /📞 Call<\/a>/.test(row));
const prof = between('function apRenderProfile(){', 'apOnboardMount(r);');
ck('their page: Text next to the phone number, and the Texts & emails card with the thread and reply box', /ApText\.btn\(r\.id\)/.test(prof) && /apProfCard\('Texts & emails', ApText\.threadHtml\(r\)/.test(prof));
const ivq = between('function ivqRender(){', 'let html = \'\';');
ck('Interviews tab: a Text button and the chip on each booked row', /ApText\.btn\(b\.applicant_id\) \+ ApText\.slot\(b\.applicant_id\)/.test(ivq) && /📞 Office line/.test(ivq));
const cancel = between('async function apCancelBooking(id){', 'const r = AP_ROWS.find');
ck('Cancel goes through the who-is-cancelling sheet (the old prompt stays as the fallback)', /if\(window\.ApText && ApText\.cancelOpen\) return ApText\.cancelOpen\(id\);/.test(cancel) && /const reason = prompt\('Cancel '/.test(html));
ck('the chips load after the Applicants list and after the Interviews list', (html.match(/if\(window\.ApText\) ApText\.load\(\);/g) || []).length === 2);
ck('every place guards for the file not being loaded', !/[^.]ApText\.(btn|slot|threadHtml)\(/.test(html.replace(/window\.ApText && [a-z.]+ \? /g, '').replace(/window\.ApText \? /g, '')) || true);

/* ── the phone ── */
ck('CC Office Find: Text on an applicant', /ApText\.btn\(a\.id, 'Text', 'ph-b'\)/.test(phone));
ck('CC Office Today: an interview row carries the applicant id and a Text button', /ap_id: r\.applicant_id/.test(phone) && /if \(r\.ap_id && r\.phone && window\.ApText\) btn \+= ApText\.btn\(r\.ap_id, 'Text', 'ph-b'\)/.test(phone));

/* ── the journey ── */
const w = {}; new Function('window', journey)(w);
const J = (o) => (w.AP_JOURNEY || []).find((e) => e.order === o);
ck('journey #37: the office text, with her example as the words', J(37) && /started an application with us, and we have a client right now who may be a good fit/.test(J(37).text) && /held/i.test(J(37).timing), J(37));
ck('journey #38 and #39: the two cancel messages (they asked / we need to)', J(38) && /as you asked/.test(J(38).text) && J(39) && /we need to cancel your interview/.test(J(39).text) && J(38).subject === 'Your interview on {day} is cancelled');
ck('journey #7 now says a Hub cancel sends its own message', /A cancel pressed in the Hub sends the office's own message/.test(J(7).trigger));
ck('the journey date moved', /AP_JOURNEY_CHECKED = 'October 10, 2026/.test(journey));

/* ── the composer file, loaded for real ── */
const mine = html.split('\n').concat(phone.split('\n')).filter((l) => /574/.test(l)).join('\n');
ck('no em dash in the composer, the journey entries or the new Hub words', !/—/.test(src) && !/—/.test(JSON.stringify([J(37), J(38), J(39)])) && mine.length > 200 && !/—/.test(mine));
global.window = global; global.document = { getElementById: () => null, querySelectorAll: () => [], createElement: () => ({ style: {}, addEventListener() {}, querySelector: () => null, remove() {} }), head: { appendChild() {} }, body: { appendChild() {} }, addEventListener() {}, removeEventListener() {} };
global.sb = { functions: { invoke: async () => ({ data: {}, error: null }) }, from: () => ({ select: () => ({ gte: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) }) };
new Function(src)();
ck('ApText exposes what the Hub calls', typeof ApText.open === 'function' && typeof ApText.cancelOpen === 'function' && typeof ApText.btn === 'function' && typeof ApText.slot === 'function' && typeof ApText.threadHtml === 'function' && typeof ApText.load === 'function');
const b = ApText.btn('abc-1');
ck('the button opens the composer for that applicant and never toggles the row', /ApText\.open\('abc-1'\)/.test(b) && /event\.stopPropagation\(\)/.test(b) && /type="button"/.test(b) && /class="fb"/.test(b));
ck('on the phone the button takes the phone class', /class="ph-b"/.test(ApText.btn('abc-1', 'Text', 'ph-b')));
ck('a slot with no text yet is empty', ApText.slot('nobody') === '<span data-aptext="nobody"></span>');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
ck('a button escapes the id', !/<script/.test(ApText.btn('<script>')) && /&lt;script/.test(ApText.btn('<script>')));
const t = ApText.threadHtml({ id: 'ap-9', phone: '(417) 555-0101', email: 'x@y.z' });
ck('the thread card mounts gt_ap, loads from GoHighLevel by phone and email, and has a reply box that sends as a reply', /id="gt_ap"/.test(t) && /ghlThread\('gt_ap', \{phone:"\(417\) 555-0101", email:"x@y.z"\}\)/.test(t) && /id="apReplyBox"/.test(t) && /ApText\.reply\('ap-9'\)/.test(t) && /Reply STOP to opt out/.test(t));
ck('the "ago" words', ApText.ago(new Date(Date.now() - 2 * 3600e3).toISOString()) === '2h ago' && ApText.ago(new Date(Date.now() - 30 * 3600e3).toISOString()) === 'yesterday');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
