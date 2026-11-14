// The Campaigns view (Samantha 2026-11-14: "make it very clear in the hub what the campain is and who is in it or has
// been in it and the results").   node tests/campaigns-view-test.js
const fs = require('fs'), path = require('path');
const C = require('../campaigns-view.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const src = fs.readFileSync(path.join(__dirname, '..', 'campaigns-view.js'), 'utf8');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 800)]);
const NOW = new Date(2026, 10, 17, 14);   // Tue Nov 17 2026, the day after the first partner send
const at = (y, m, d) => new Date(y, m - 1, d, 9).toISOString();
const lib = [1, 2, 3, 4, 5, 6].map((n) => ({ key: 'r' + (38 + n), aud: 'referrers', series: n, subj: 'Partner email ' + n }))
  .concat([{ key: 'r45', aud: 'referrers', subj: 'We have your referral' }, { key: 'm23', aud: 'monthly', subj: 'Home for the holidays?' }, { key: 'm5', aud: 'monthly', subj: 'Noticed something?' }, { key: 'm17', aud: 'monthly', subj: 'Most falls are preventable' },
    { key: 'g8', aud: 'caregivers', when: 'Nov 20–27', subj: 'This Thanksgiving, we are thankful for you' }, { key: 'g9', aud: 'caregivers', when: 'Dec 18–24', subj: 'Happy holidays' }]);
const orgs = [
  { id: 'o1', name: 'Birch Pointe', type: 'Assisted Living', program_track: 'email_list', email: 'admit@birch.example', contacts: [{ name: 'Dana', email: 'dana@birch.example' }, { name: 'Old', email: 'old@birch.example', archived: true }] },
  { id: 'o2', name: 'Able Law', type: 'Elder Law / Financial', program_track: 'email_list', email: 'amy@able.example' },
  { id: 'o3', name: 'Hope Hospice', type: 'Hospice', program_track: 'email_list', email: 'info@hope.example' },
  { id: 'o4', name: 'No Email Rehab', type: 'Rehab / Skilled Nursing', program_track: 'email_list' },
  { id: 'o5', name: 'Mercy Hospital', type: 'Hospital', owner_email: 'k@mo-care.com', email: 'dc@mercy.example' },
  { id: 'o6', name: 'Gone Home Health', type: 'Home Health', program_track: 'email_list', email: 'x@gone.example', archived: true },
  { id: 'o7', name: 'New On List', type: 'Hospice', program_track: 'email_list', email: 'hi@new.example' } ];
const act = (org, key, to, when) => ({ id: org + key + to, org_id: org, kind: 'email', email_key: key, to, at: when, by: 'campaign-auto', auto: true });
const acts = [act('o1', 'r39', 'admit@birch.example', at(2026, 11, 16)), act('o1', 'r39', 'dana@birch.example', at(2026, 11, 16)), act('o2', 'r39', 'amy@able.example', at(2026, 11, 16)), act('o3', 'r39', 'info@hope.example', at(2026, 11, 16)),
  act('o5', 'r39', 'dc@mercy.example', at(2026, 11, 16)), act('o6', 'r39', 'x@gone.example', at(2026, 11, 16)),
  { id: 'hand', org_id: 'o7', kind: 'email', email_key: 'r39', to: 'hi@new.example', at: at(2026, 11, 1), by: 'Katlin' }, { id: 'v', org_id: 'o1', kind: 'visit', at: at(2026, 11, 2) }];
const send = (o) => Object.assign({ at: at(2026, 11, 16), key: 'r39', subj: 'Partner email 1', aud: 'referrers', by: 'campaign-auto', auto: true, checked_at: at(2026, 11, 16), found: true, status: 'delivered', opened_at: '', replied_at: '', problem: '', error: '' }, o);
const resData = { sends: [send({ to: 'admit@birch.example', org_id: 'o1' }), send({ to: 'dana@birch.example', org_id: 'o1', status: 'opened', opened_at: at(2026, 11, 16) }), send({ to: 'amy@able.example', org_id: 'o2', status: 'opened', opened_at: at(2026, 11, 16), replied_at: at(2026, 11, 17) }),
    send({ to: 'info@hope.example', org_id: 'o3' }), send({ to: 'dc@mercy.example', org_id: 'o5' }), send({ to: 'x@gone.example', org_id: 'o6', status: 'bounced', problem: 'bounced' }),
    send({ to: 'lee@example.com', key: 'm23', subj: 'Home for the holidays?', aud: 'monthly', at: at(2026, 11, 10), status: 'opened', opened_at: at(2026, 11, 11) }), send({ to: 'won@example.com', key: 'm23', subj: 'Home for the holidays?', aud: 'monthly', at: at(2026, 11, 10) }),
    send({ to: 'lee@example.com', key: 'm23', subj: 'By hand', aud: 'lead', auto: false, by: 'Sam' })],
  unsubscribed: [{ email: 'INFO@hope.example', at: at(2026, 11, 17) }], switched_off: [] };
const leads = [{ id: 1, first_name: 'Lee', last_name: 'Park', email: 'Lee@Example.com', status: 'New' }, { id: 2, first_name: 'Won', last_name: 'Kim', email: 'won@example.com', status: 'Converted' },
  { id: 3, first_name: 'Off', last_name: 'Person', email: 'off@example.com', status: 'New', monthly_emails: false }, { id: 4, first_name: 'Drip', last_name: 'Now', email: 'drip@example.com', status: 'New', nurture_started_at: at(2026, 11, 12) },
  { id: 5, first_name: 'Dnc', last_name: 'Person', email: 'dnc@example.com', status: 'New', do_not_contact: true }, { id: 6, first_name: 'No', last_name: 'Email', status: 'New' }, { id: 7, first_name: 'Ana', last_name: 'Ruiz', email: 'ana@example.com', status: 'Contacted' }];
const cgs = [{ name: 'Ruth Able', email: 'ruth@example.com', active: true }, { name: 'Gone Away', email: 'gone@example.com', active: false }, { name: 'Axis Off', email: 'ax@example.com', axiscare_status_active: false }, { name: 'No Mail' }, { first: 'Sam', last: 'Cole', email: 'sam@example.com' }];
const cfg = { enabled: true, aud_caregivers: true, auto_partner_series: true, partner_series_day: 10, auto_monthly_leads: true, monthly_day: 10, monthly_plan: { '03': 'm5', '09': 'm17', '12': 'm23' } };
const log = [{ at: at(2026, 9, 2), key: 'm17', sent: 6, source: 'Autopilot · monthly' }, { at: at(2026, 10, 8), key: 'g4', sent: 0, source: 'Autopilot · caregivers' }];
const I = { now: NOW, cfg, lib, orgs, acts, leads, caregivers: cgs, log, res: resData };

const P = C.partner(I);
ck('partner series: in it now = organizations on the email list with an address that have not unsubscribed', P.members.map((m) => m.name).join('|') === 'Able Law|Birch Pointe|New On List', P.members.map((m) => m.name));
const birch = P.members.find((m) => m.name === 'Birch Pointe'), able = P.members.find((m) => m.name === 'Able Law'), fresh = P.members.find((m) => m.name === 'New On List');
ck('...each says what it has received and what comes next', birch.had.join() === '1' && birch.next === 2 && birch.addresses === 2 && fresh.had.length === 0 && fresh.next === 1, [birch, fresh]);
ck('...an email sent by hand does not count as a step of the series', fresh.had.length === 0);
ck('...the last email shows the best thing that happened across its addresses (an open beats unopened, a reply beats an open)', birch.status.word === 'Opened' && able.status.word === 'Wrote back', [birch.status, able.status]);
ck('...an archived contact is not counted as an address', birch.addresses === 2);
ck('no longer in it: says who and why (unsubscribed, archived, became a full partner)', P.left.map((l) => l.name + ':' + l.why).join('|') === 'Gone Home Health:archived|Hope Hospice:unsubscribed|Mercy Hospital:now a full partner, with an owner and visits', P.left);
ck('on the list with no email address is said out loud, not hidden', P.noEmail.join() === 'No Email Rehab');
const e1 = P.emails[0];
ck('the emails: email 1 went to 6 addresses with its results; email 2 is next for those who had 1, email 1 for the new one', e1.to === 6 && e1.counts.opened === 2 && e1.counts.replied === 1 && e1.counts.problems === 1 && P.emails[1].upNext === 2 && e1.upNext === 1 && P.emails[5].to === 0, [e1, P.emails[1]]);
ck('it is ON only when the master switch and the series switch are both on', P.on === true && C.partner({ ...I, cfg: { ...cfg, enabled: false } }).on === false && C.partner({ ...I, cfg: { ...cfg, auto_partner_series: false } }).on === false);
ck('next send: someone new still owes this month, so it is the next weekday morning', /Next send: Wed, Nov 18/.test(P.when), P.when);
ck('...and when nobody is owed this month, it is next month on or after the 10th', /Next send: Thu, Dec 10/.test(C.partner({ ...I, orgs: orgs.filter((o) => o.id !== 'o7') }).when), C.partner({ ...I, orgs: orgs.filter((o) => o.id !== 'o7') }).when);
ck('...an empty list says nobody is on it, never "everyone has had all six"', /Nobody is on the email list yet/.test(C.partner({ ...I, orgs: [], acts: [], res: null }).when) && /Everyone on the list has had all 6/.test(C.partner({ ...I, orgs: [orgs[1]], acts: [1, 2, 3, 4, 5, 6].map((n) => act('o2', 'r' + (38 + n), 'amy@able.example', at(2026, n, 12))), res: null }).when));
ck('...a 10th on a weekend moves to Monday; before the 10th it is this month', C.nextRun(new Date(2027, 0, 4, 12), 10, true).getDate() === 11 && C.nextRun(new Date(2026, 11, 1, 12), 10, false).getDate() === 10);
ck('without the results yet it still knows who is in it and what they received, from the partner history', C.partner({ ...I, res: null }).members.length === 4 && C.partner({ ...I, res: null }).emails[0].to === 6 && C.partner({ ...I, res: null }).emails[0].counts === null);

const L = C.leads(I);
ck('lead email: in it now = open leads with an email, not switched off, not do-not-contact, not in welcome emails', L.members.map((m) => m.name).join('|') === 'Ana Ruiz|Lee Park', L.members.map((m) => m.name));
ck('...what each has received counts only the automatic monthly emails, not one sent by hand', L.members.find((m) => m.name === 'Lee Park').had === 1 && L.members.find((m) => m.name === 'Lee Park').status.word === 'Opened' && L.members.find((m) => m.name === 'Ana Ruiz').had === 0);
ck('...someone still in welcome emails is listed as not in it yet', L.waiting.map((w) => w.name).join() === 'Drip Now');
ck('no longer in it: the lead who became a client, and the one switched off on their profile', L.left.map((l) => l.name + ':' + l.why).join('|') === 'Off Person:Monthly emails turned off on their profile|Won Kim:became a client', L.left);
ck('the plan month by month: sent, next, planned, or nothing planned', L.emails.length === 12 && L.emails[8].to === 6 && L.emails[8].sentAt && L.emails[11].next === true && L.emails[11].subj === 'Home for the holidays?' && L.emails[0].key === '' && L.empty.includes('January') && !L.empty.includes('December'), L.emails);
ck('next send names the date and the month', /Next send: Thu, Dec 10, about 9 AM \(December's email\)/.test(L.when), L.when);

const G = C.caregivers(I);
ck('caregiver notes: active caregivers with an email; inactive in the Hub or in AxisCare are left out; no email is counted', G.members.map((m) => m.name).join('|') === 'Ruth Able|Sam Cole' && G.noEmail === 1 && G.on === true, G);
ck('...a run that reached nobody is not shown as sent', G.emails.every((e) => !e.sentAt));

const h = C.html(I, { open: { 'partner:left': true }, pick: 'partner' });
const hL = C.html(I, { open: {}, pick: 'leads' }), hG = C.html(I, { open: {}, pick: 'caregivers' }), hC = C.html(I, { open: {}, pick: 'clients' });
ck('a row of buttons names every campaign with ON or OFF and how many are in it; clients say "by hand only"', (h.match(/data-pick=/g) || []).length === 4 && /Partner series<div[^>]*>ON · 3 in it/.test(h) && /Monthly email to open leads<div[^>]*>ON · 2 in it/.test(h) && /Caregiver holiday notes<div[^>]*>ON · 2 in it/.test(h) && /Clients and families<div[^>]*>by hand only/.test(h), (h.match(/data-pick="[a-z]+"[^<]*<[^<]*<div[^>]*>[^<]*/g) || []));
ck('only the picked campaign is on the page, so there is nothing to scroll past', (h.match(/data-campaign=/g) || []).length === 1 && /data-campaign="partner"/.test(h) && !/Home for the holidays/.test(h) && /data-campaign="leads"/.test(hL) && !/Partner email 1/.test(hL) && /data-campaign="caregivers"/.test(hG) && /data-campaign="clients"/.test(hC));
ck('the picked campaign says what it is, who gets it and when the next one goes', /Who gets it:/.test(h) && /Next send:/.test(h) && />ON</.test(h));
ck('...its emails with results and who is in it are open from the start; "no longer in it" opens on a press', /Partner email 1/.test(h) && /2<\/b> opened/.test(h) && /Birch Pointe/.test(h) && /Emails? 1 of 6/.test(h) && /Wrote back/.test(h) && /now a full partner/.test(h) && !/became a client/.test(hL) && /Lee Park/.test(hL) && /Ruth Able/.test(hG));
ck('...a picked name that does not exist falls back to the first campaign', /data-campaign="partner"/.test(C.html(I, { open: {}, pick: 'nope' })));
ck('...clients and families are said to have no campaign', /Clients and their families/.test(hC) && /Nothing goes to clients or families by itself/.test(hC));
ck('...while results are still being read it says so, and when they failed it says that and still shows the rest', /Reading who opened/.test(C.html({ ...I, res: null }, { open: {} })) && /could not be read just now \(boom\)/.test(C.html({ ...I, res: null, resError: 'boom' }, { open: {} })) && /Birch|Partner email 1/.test(C.html({ ...I, res: null, resError: 'boom' }, { open: {} })));
ck('a name with code in it is shown as text', !/<img/.test(C.html({ ...I, orgs: [{ id: 'x', name: '<img src=x>', program_track: 'email_list', email: 'a@b.co' }], acts: [] }, { open: { 'partner:people': true } })));
ck('her wording rules: no em dashes and no "AI" on the page', !/—/.test(h) && !/\bAI\b/.test(h));
ck('it saves and sends nothing', !/persist\(|fetch\(|upsert|localStorage/.test(src));
ck('Campaigns opens on the campaigns, then the Email library, then All results', /cmpView='campaigns';/.test(html) && /\[\['campaigns','Campaigns'\],\['library','Email library'\],\['results','All results'\]\]/.test(html) && /<div id="cmpCampaigns" style="display:none;">/.test(html) && /<script src="campaigns-view\.js\?v=1"><\/script>/.test(html));
for (const [n, c, d] of res) console.log((c ? '  ✓ ' : '  ✗ ') + n + (d ? '\n      ' + d : ''));
console.log(res.filter((x) => x[1]).length + '/' + res.length + ' passed');
process.exit(res.every((x) => x[1]) ? 0 : 1);
