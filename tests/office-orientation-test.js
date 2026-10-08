/* node tests/office-orientation-test.js
   Moved into orientation + office orientation set by the office (2026-10-08, Samantha). The real helpers, cut out of
   caregivers-engine.js: the People & Checks row of a cleared person shows only the small banner (no orientation
   buttons); the office can book a date and time itself, onto the in-person session at that time or a new one-seat
   session; a canceled or past seat is not a booking; the confirmation text is the booking page's own words, and has
   no em dash. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return src.slice(a, b); };
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };

const code = [
  "const ORIENT_ADDR = '1331 N Stewart Ave Ste B, Springfield MO 65802';",
  cut('function fmtTime(t){', 'const DEFAULT_ORIENT_SCHEDULE'),
  "const wcEsc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');",
  "const wcDay = iso => iso ? new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', timeZone:'America/Chicago' }) : '';",
  "const wcWhen = iso => new Date(iso).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZone:'America/Chicago' });",
  "function fmtD(s){ if(!s) return null; const d = new Date(s + 'T00:00:00'); return isNaN(d) ? null : d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }",
  cut('function officeOrientBookingFor(', 'function officeOrientPreview('),
].join('\n');
const ctx = { console, Date, JSON, String, Array, Object, Number, Error, RegExp, Intl, Math, parseInt, orientSessions: [], WC: {} };
ctx.wcRowFor = (c) => ctx.WC[c.id] || null;
vm.createContext(ctx); vm.runInContext(code, ctx);

/* 1. the People & Checks row: banner, not buttons */
const row = cut('function renderOB(){', '// Stats');
ck('the cleared row shows the banner in place of its status badge', row.includes("st==='Ready for Orientation'?obOrientBanner(c):`<span class=\"badge ${stBadge}\">${st}</span>`"));
ck('the cleared row no longer carries the orientation buttons', !row.includes('In the office instead') && !row.includes('wcInviteHtml(c)') && !row.includes('step2Html(c)'));
ck('the ready queue on the Orientations tab still has the steps', cut('function renderOrientReadyQueue(){', 'function renderOrientations(){').includes('step2Html(c)'));
ck('the table has the banner style', html.includes('.ob-orient-banner{display:block'));
const ok = ctx.obOrientBanner({ id: 1, first: 'Ava', last: 'Test', resolvedAt: '2026-10-06T15:00:00Z' });
ck('the banner says they moved into orientation and links to the tab', ok.includes('Moved into orientation') && ok.includes("gotoTab('orientations')") && ok.includes('Cleared Oct 6'), ok);
ck('a fresh clear says Step 2 is next', ok.includes('Next: Viventium Step 2'));
ck('step 2 done says the welcome call is next', ctx.obOrientBanner({ id: 1, first: 'Ava', last: 'Test', step2_done_at: '2026-10-07T15:00:00Z' }).includes('Step 2 done, welcome call next'));
ctx.WC[1] = { status: 'booked', starts_at: '2026-10-10T15:00:00Z' };
ck('a booked welcome call is said', ctx.obOrientBanner({ id: 1, first: 'Ava', last: 'Test' }).includes('Welcome call Sat, Oct 10'));
ctx.WC[1] = { status: 'done', done_at: '2026-10-10T15:30:00Z' };
ck('a done welcome call wins', ctx.obOrientBanner({ id: 1, first: 'Ava', last: 'Test' }).includes('Welcome call done Oct 10'));
delete ctx.WC[1];
ck('no em dash anywhere in the new code', !/—/.test(code) && !/—/.test(row));

/* 2. who is booked where */
const sessions = [
  { id: 1, date: '2026-10-01', time: '10:00', capacity: '6', is_remote: 'no', bookings: [{ first: 'Ava', last: 'Test', candidate_id: 1 }] },           /* past */
  { id: 2, date: '2026-10-15', time: '10:00', capacity: '3', is_remote: 'no', bookings: [{ first: 'Bo', last: 'Test', candidate_id: 2, attend_status: 'canceled' }, { first: 'Cy', last: 'Test' }] },
  { id: 3, date: '2026-10-20', time: '14:00', capacity: '1', is_remote: 'no', bookings: [{ first: 'Ava', last: 'Test', candidate_id: 1 }] },
  { id: 4, date: '2026-10-20', time: '14:00', capacity: '3', is_remote: 'yes', bookings: [] },
];
const today = '2026-10-08';
const ava = ctx.officeOrientBookingFor({ id: 1, first: 'Ava', last: 'Test' }, sessions, today);
ck('a past seat is not a booking; the upcoming one is found by id', ava && ava.session.id === 3 && ava.idx === 0, ava);
ck('a canceled seat is not a booking', ctx.officeOrientBookingFor({ id: 2, first: 'Bo', last: 'Test' }, sessions, today) === null);
const cy = ctx.officeOrientBookingFor({ id: 9, first: 'cy', last: 'TEST' }, sessions, today);
ck('a seat with no candidate id is found by name', cy && cy.session.id === 2 && cy.idx === 1, cy);
ck('nobody else is booked', ctx.officeOrientBookingFor({ id: 7, first: 'Dee', last: 'Test' }, sessions, today) === null);
ck('the banner shows an office booking', (() => { ctx.orientSessions = sessions; const h = ctx.obOrientBanner({ id: 1, first: 'Ava', last: 'Test' }); ctx.orientSessions = []; return h.includes('Office orientation Tue, Oct 20, 2026 at 2:00 PM'); })());

/* 3. the seat: the in-person session at that time with room, else a new one-seat session */
let made = 0; const make = (d, t) => ({ id: 100 + (++made), date: d, time: t, capacity: '1', is_remote: 'no', bookings: [] });
const s1 = ctx.officeOrientSlot(sessions, '2026-10-15', '10:00', make);
ck('an in-person session at that time with a seat open is reused', !s1.created && s1.session.id === 2);
const s2 = ctx.officeOrientSlot(sessions, '2026-10-20', '14:00', make);
ck('a full in-person session is not reused and a remote one never is: a one-seat session is added', s2.created && s2.session.id === 101 && s2.session.capacity === '1' && sessions.length === 5, s2);
const s3 = ctx.officeOrientSlot(sessions, '2026-10-22', '09:30', make);
ck('no session at that time: one is added', s3.created && s3.session.date === '2026-10-22' && s3.session.time === '09:30');

/* 4. the text: the booking page's own words */
const msg = ctx.officeOrientConfirmText('Ava', '2026-10-20', '14:00');
ck('the confirmation says the day, the time, the address and what to bring',
  msg.startsWith("You're all set, Ava! 🎉 Your Caring Companions orientation is Tuesday, October 20, 2026 at 2:00 PM. Location: 1331 N Stewart Ave Ste B, Springfield MO 65802. ")
  && msg.endsWith('Please bring the original ID documents you uploaded in Viventium Step 2 (for example, your photo ID). Questions? Call/text (417) 234-8494.'), msg);
ck('no em dash in the text', !/—/.test(msg));
const server = path.join(ROOT, '..', 'Staffing-Coordinator-Hub', 'supabase', 'functions', 'send-candidate-message', 'index.ts');
const serverSrc = fs.existsSync(server) ? fs.readFileSync(server, 'utf8') : (process.env.SCM_SRC ? fs.readFileSync(process.env.SCM_SRC, 'utf8') : '');
if (serverSrc) {
  ck("the server's in-person wording has the same sentences", serverSrc.includes("You're all set, ${first}! 🎉 Your Caring Companions orientation is ${fmtDateLong(String(s.date))} at ${fmtTime(String(s.time || ''))}. ${where} ")
    && serverSrc.includes("`${bring} the original ID documents you uploaded in Viventium Step 2 (for example, your photo ID). Questions? Call/text (417) 234-8494.`")
    && serverSrc.includes("const bring = remote ? 'Please have ready' : 'Please bring'") && serverSrc.includes("`Location: ${ADDR}.`"));
} else console.log('SKIP  the server source is not next to the Hub; the server wording was not compared');

/* 5. the window and the guide */
const book = cut('async function bookOfficeOrientation(', 'let _notHireId=null;');
ck('booking asks before it moves an existing seat', book.includes('Move them to'));
ck('a text goes only when Book and text them is pressed, and the office is told if it could not go', book.includes('if(sendText){') && book.includes('The text could NOT be sent'));
ck('a past date is refused', book.includes('That date has passed'));
ck('the window has the date, the time and both buttons', html.includes('id="inv-manual-date"') && html.includes('id="inv-manual-time"') && html.includes('SCX.bookOfficeOrientation(false)') && html.includes('SCX.bookOfficeOrientation(true)'));
ck('the guide says the row shows the banner and the steps are on Orientations', html.includes('<strong>Moved into orientation</strong> banner'));
ck('the functions are reachable from the window', src.includes('window.SCX = {bookOfficeOrientation, officeOrientPreview,'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
