// The partner email list (Samantha 2026-11-13, "Yes, email-only"): organizations that get partner emails and no visits.
// node tests/partner-email-list-test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const L = require('../partner-email-list.js'), PR = require('../partner-rules.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 700)]);
const ORGS = [
  { id: 'e1', name: 'Birch Pointe', type: 'Assisted Living', program_track: 'email_list', email: 'admissions@birch.example', phone: '417-555-0100', city: 'Springfield', email_source_url: 'https://birch.example/contact', created_at: '2026-11-13T00:00:00Z' },
  { id: 'e2', name: 'Able Law', type: 'Elder Law / Financial', program_track: 'email_list', email: 'amy@able.example', contacts: [{ id: 'c1', name: 'Amy Able', role: 'Attorney', email: 'amy@able.example' }], email_source_url: 'javascript:alert(1)' },
  { id: 'e3', name: 'Gone Home Health', type: 'Home Health', program_track: 'email_list', email: 'x@gone.example', archived: true },
  { id: 'p1', name: 'Mercy Hospital', type: 'Hospital', owner_email: 'k@mo-care.com', email: 'dc@mercy.example', created_at: '2026-11-01T00:00:00Z' },
  { id: 'a1', name: 'Linda Ortiz', program_track: 'ambassador', program_status: 'active', email: 'linda@example.com' },
];
const rows = L.rows(ORGS);
ck('the list shows only email-list organizations that are not archived, by name', rows.map(r => r.id).join() === 'e2,e1', rows.map(r => r.id));
ck('...with the email, the named contact and role, the phone and the town', rows[0].contact === 'Amy Able' && rows[0].role === 'Attorney' && rows[1].email === 'admissions@birch.example' && rows[1].phone === '417-555-0100' && rows[1].city === 'Springfield', rows);
ck('...the "where it was found" link is only ever a web address', rows[1].source === 'https://birch.example/contact' && rows[0].source === '', rows.map(r => r.source));
ck('search finds by name, type, contact or email', L.filter(rows, 'attorney').length === 1 && L.filter(rows, 'birch').length === 1 && L.filter(rows, 'zzz').length === 0 && L.filter(rows, '').length === 2);

/* kept off the visit desk: the Hub's own filters, taken from index.html */
const grabLine = (name) => { const m = html.match(new RegExp('function ' + name + '\\(\\)\\{[^\\n]*\\}')); if (!m) throw new Error(name + ' not found'); return m[0]; };
const ctx = { DATA: { referral_orgs: ORGS } }; vm.createContext(ctx);
vm.runInContext('function ccIsAmbassador(o){ return !!o && o.program_track===\'ambassador\'; }\n' + grabLine('ccDeskOrgs') + '\n' + grabLine('ccPickOrgs') + '\nthis.desk = ccDeskOrgs(); this.pick = ccPickOrgs();', ctx);
ck('an email-list organization is NOT on the visit desk or in the directory (ccDeskOrgs)', ctx.desk.map(o => o.id).join() === 'p1', ctx.desk.map(o => o.id));
ck('...so it has no owner to assign and no follow-up date: the desk never looks at it', !ctx.desk.some(o => o.program_track));
const desk = fs.readFileSync(path.join(__dirname, '..', 'referral-desk.js'), 'utf8'), dir = fs.readFileSync(path.join(__dirname, '..', 'partner-directory.js'), 'utf8');
ck('the desk and the directory still leave out every program_track', /filter\(o => o && \(!o\.program_track \|\| \(o\.program_track === 'ambassador' && o\.program_status === 'active'\)\)\)/.test(desk) && /const isProfessional = o => !!o && !o\.program_track;/.test(dir));

/* can receive the partner emails */
const pe = fs.readFileSync(path.join(__dirname, '..', 'partner-emails.js'), 'utf8');
ck('the partner emails go to professional partners AND the email list, and to no other program', /!o\.archived && \(!o\.program_track \|\| o\.program_track === 'email_list'\) &&/.test(pe), '');
const sandbox = { DATA: { referral_orgs: ORGS, referral_activities: [{ kind: 'email', email_key: 'r13', to: 'dc@mercy.example', at: 'x' }] }, CC_EMAIL_LIBRARY: [{ key: 'r13', aud: 'referrers', seg: 'Any Referral Partner', subj: 's' }, { key: 'r5', aud: 'referrers', seg: 'Senior Living', subj: 's5' }], window: {}, document: { getElementById: () => null, createElement: () => ({ style: {} }), head: { appendChild() {} } } };
sandbox.window = sandbox; sandbox.self = sandbox; vm.createContext(sandbox);
try { vm.runInContext(pe, sandbox); } catch (e) { ck('partner-emails.js loads', false, String(e)); }
const bulk = sandbox.peBulkRecipients ? sandbox.peBulkRecipients(sandbox.CC_EMAIL_LIBRARY[0]).map(r => r.email).sort() : null;
ck('an "any partner" email: both email-list organizations, not the archived one, not the ambassador, not someone who already had it', bulk && bulk.join() === 'admissions@birch.example,amy@able.example', bulk);
const seg = sandbox.peBulkRecipients ? sandbox.peBulkRecipients(sandbox.CC_EMAIL_LIBRARY[1]).map(r => r.email) : null;
ck('an email written for senior living goes only to the assisted living organization on the list', seg && seg.join() === 'admissions@birch.example', seg);

/* make a full partner */
const full = L.promoted(ORGS[0], 'office@example.com', '2026-11-14T00:00:00Z');
ck('"Make a full partner" takes the track off and records who and when; nothing else on the record changes',
  !('program_track' in full) && full.email_list_promoted.by === 'office@example.com' && full.email === ORGS[0].email && full.id === 'e1' && ORGS[0].program_track === 'email_list', full);
const look = PR.look(full, { today: '2026-11-14', leads: [], activities: [], settings: {} });
ck('...and from then on the visit rules see it like any new partner (needs an owner, has a due date)', PR.ownerOf(full).how === 'needs_owner' && !!look.due, look);

ck('the page loads the file and has the place for the list, under the Directory', /<script src="partner-email-list\.js\?v=\d+"><\/script>/.test(html) && /id="referrersWrap"><\/div>\s*<div id="refEmailList"><\/div>/.test(html) && /PartnerEmailList\.render\(\)/.test(html));
let pass = 0; for (const [n, ok, note] of res) { console.log((ok ? '  ✓ ' : '  ✗ ') + n + (ok ? '' : '\n      ' + note)); if (ok) pass++; }
console.log(`\n${pass}/${res.length} passed`); process.exit(pass === res.length ? 0 : 1);
