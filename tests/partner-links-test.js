// Partner links, step 2 (2026-10-26): the rules behind codes, the source lock, Sources to check and the Program numbers.
// node tests/partner-links-test.js
const P = require('../partner-links-rules.js');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 900)]);
const clone = x => JSON.parse(JSON.stringify(x));
const ORGS = [
  { id: 'jane', name: 'Ozark Senior Moves', partner_code: 'JANE-K7', program_status: 'active', contacts: [{ id: 'c1', name: 'Jane Smith', phone: '(417) 555-0150' }] },
  { id: 'ron', name: 'Grace Community Church', partner_code: 'GRACE-4Q', program_status: 'paused' },
  { id: 'amy', name: 'Mercy Hospital', partner_code: 'MERCY-M3', program_status: 'invited', phone: '417-555-0100' },
  { id: 'cox', name: 'CoxHealth' },                                    // a partner, not in the program
  { id: 'old', name: 'Old Partner', partner_code: 'OLD-11', archived: true },
  { id: 'cox2', name: 'Cox Health South', contacts: [{ id: 'c9', name: 'Jane Smith' }] },
];
const OWNER = { owner: true, by: 'samantha@mo-care.com', orgs: ORGS, at: '2026-10-26T15:00:00Z' };
const CC = { owner: false, by: 'krystal@mo-care.com', orgs: ORGS, at: '2026-10-26T15:00:00Z' };

/* codes */
ck('the code rule matches the server: upper case, letters, digits, dashes, 3 to 20', P.normalCode(' jane-k7 ') === 'JANE-K7' && P.normalCode('AB') === '' && P.normalCode('JANE K7') === '' && P.normalCode('<x>') === '' && P.normalCode('X'.repeat(21)) === '');
const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
const c1 = P.newCode('The Ozark Senior Moves', ORGS, seq([0, 0]));
ck('a new code: the first real word (not "The"), up to 6 letters, a dash, two characters nobody misreads', c1 === 'OZARK-AA' && /^[A-Z0-9]{1,6}-[A-HJ-NP-Z2-9]{2}$/.test(c1), c1);
ck('...never one already in use (JANE-K7 exists: it tries again)', P.newCode('Jane', ORGS, seq([0.45, 0.3, 0, 0])) !== 'JANE-K7' && P.newCode('Jane', [{ partner_code: 'JANE-AA' }], seq([0, 0, 0.1, 0.1])) === 'JANE-DD');
ck('...a code in use on an archived partner still counts as used', P.newCode('Old', ORGS, seq([0.73, 0.73, 0, 0])) !== 'OLD-11');
ck('the link and the message', P.linkFor('JANE-K7') === 'https://mo-care.com/r/?p=JANE-K7' && /mo-care\.com\/r\/\?p=JANE-K7$/.test(P.shareText('JANE-K7')) && !/\$|rate|price|reward/i.test(P.shareText('JANE-K7')));
ck('status: invited, active, paused; no code = not in the program', P.statusOf(ORGS[0]) === 'active' && P.statusOf(ORGS[1]) === 'paused' && P.statusOf(ORGS[2]) === 'invited' && P.statusOf(ORGS[3]) === null && !P.inProgram(ORGS[4]));

/* manual phone referrals and the source lock */
let ch = P.sourceChange(null, { source: 'Referral', referral_org_id: 'jane', referral_source_name: 'Ozark Senior Moves' }, CC);
ck('manual phone referral: a coordinator picks the partner on a new lead (allowed, history "added")', ch.allowed && ch.kind === 'added' && ch.history.how === 'added' && ch.history.to.referral_org_id === 'jane' && ch.history.by === 'krystal@mo-care.com', ch);
ch = P.sourceChange({ source: 'Website' }, { source: 'Referral', referral_org_id: 'jane', referral_source_name: 'Ozark Senior Moves' }, CC);
ck('...a coordinator fills the blank source on a website lead after the call (allowed: nothing was recorded yet)', ch.allowed && ch.kind === 'added', ch);
ck('...nothing about the source changed: no history', P.sourceChange({ source: 'Referral', referral_org_id: 'jane', referral_source_name: 'Ozark Senior Moves' }, { source: 'Referral', referral_org_id: 'jane', referral_source_name: 'ozark senior moves ' }, CC).kind === 'none'
  && P.sourceChange({ source: 'Phone' }, { source: 'Website' }, CC).kind === 'none');
const est = { source: 'Referral', referral_org_id: 'cox', referral_source_name: 'CoxHealth' };
ch = P.sourceChange(est, { source: 'Referral', referral_org_id: 'jane', referral_source_name: 'Ozark Senior Moves' }, CC);
ck('a coordinator changing an established source (CoxHealth to Jane): refused', !ch.allowed && ch.kind === 'changed' && !ch.needs_reason, ch);
ck('...clearing it, or switching it away from Referral, is a change too', !P.sourceChange(est, { source: 'Phone', referral_source_name: '' }, CC).allowed && !P.sourceChange({ referral_source_name: 'my neighbor' }, { referral_source_name: 'Facebook' }, CC).allowed);
ch = P.sourceChange(est, { source: 'Referral', referral_org_id: 'jane', referral_source_name: 'Ozark Senior Moves' }, OWNER);
ck('an owner changing it without a reason: asked for one', !ch.allowed && ch.needs_reason, ch);
ch = P.sourceChange(est, { source: 'Referral', referral_org_id: 'jane', referral_source_name: 'Ozark Senior Moves' }, Object.assign({}, OWNER, { why: 'The daughter said Jane sent them; Cox was the hospital stay' }));
ck('...with a reason: allowed, history keeps from, to, why, who and when', ch.allowed && ch.history.how === 'owner_change' && ch.history.from.referral_org_id === 'cox' && ch.history.to.referral_org_id === 'jane' && /daughter/.test(ch.history.why) && ch.history.by === 'samantha@mo-care.com' && ch.history.at === OWNER.at, ch);
ch = P.sourceChange({ source: 'Referral', referral_source_name: 'cox health' }, { source: 'Referral', referral_org_id: 'cox', referral_source_name: 'CoxHealth' }, CC);
ck('linking a typed name to the partner of that name (the desk\'s Link button): anyone, kept as "linked"', ch.allowed && ch.kind === 'linked', ch);
ck('...but linking a typed name to a DIFFERENT partner is a change (refused for a coordinator)', !P.sourceChange({ source: 'Referral', referral_source_name: 'cox health' }, { source: 'Referral', referral_org_id: 'jane', referral_source_name: 'Ozark Senior Moves' }, CC).allowed);
const nx = { source: 'Referral', referral_org_id: 'jane', referral_source_name: 'Ozark Senior Moves', referral_subtype: 'other' };
P.restore(nx, { source: 'Referral', referral_org_id: 'cox', referral_source_name: 'CoxHealth', referral_subtype: 'hospital' });
ck('a refused change puts the saved source back', nx.referral_org_id === 'cox' && nx.referral_source_name === 'CoxHealth' && nx.referral_subtype === 'hospital', nx);
const hl = P.pushHistory(P.pushHistory({}, { how: 'added' }), { how: 'owner_change' });
ck('history is kept in order, never replaced', hl.source_history.length === 2 && hl.source_history[1].how === 'owner_change');

/* the partner a call named */
ck('a call naming the partner picks it', P.partnerFromCall(ORGS, 'ozark senior moves', '') && P.partnerFromCall(ORGS, 'ozark senior moves', '').org.id === 'jane');
ck('...a person\'s name that two partners share is never a guess (Jane Smith is at two)', P.partnerFromCall(ORGS, 'Jane Smith', '') === null);
ck('...the caller\'s number belonging to one partner picks it', P.partnerFromCall(ORGS, '', '4175550100').org.id === 'amy' && P.partnerFromCall(ORGS, '', '(417) 555-0150').org.id === 'jane');
ck('...nothing heard, nothing picked; archived partners never', P.partnerFromCall(ORGS, '', '') === null && P.partnerFromCall(ORGS, 'Old Partner', '') === null);

/* Sources to check */
const at = '2026-10-26T14:00:00Z';
const LEADS = [
  { id: 'new1', first_name: 'Gary', source: 'Referral', referral_org_id: 'jane', referral_source_name: 'Ozark Senior Moves', referral_via: 'link', partner_code: 'JANE-K7', created_at: at, first_shift_at: '2026-10-30T13:00:00Z', assessment_at: '2026-10-27T15:00:00Z' },
  { id: 'old1', first_name: 'Dorothy', last_name: 'Hayes', source: 'Website', created_at: '2026-10-02T15:00:00Z' },
  { id: 'dup1', first_name: 'Dorothy', last_name: 'Hayes', source: 'Website', created_at: at, possibly_returning: { matches: [{ kind: 'inquiry', lead_id: 'old1' }] },
    partner_link_seen: { code: 'JANE-K7', status: 'linked', org_id: 'jane', org_name: 'Ozark Senior Moves', at } },
  { id: 'ax1', first_name: 'Paul', source: 'Website', created_at: at, partner_link_seen: { code: 'JANE-K7', status: 'linked', org_id: 'jane', org_name: 'Ozark Senior Moves', at } },
  { id: 'pau1', first_name: 'Rita', source: 'Website', created_at: at, partner_link_seen: { code: 'GRACE-4Q', status: 'paused', org_id: 'ron', org_name: 'Grace Community Church', at } },
  { id: 'unk1', first_name: 'Bo', source: 'Referral', referral_source_name: 'Mercy Hospital', created_at: at, partner_link_seen: { code: 'BOB-22', status: 'unknown', at } },
  { id: 'amb1', first_name: 'Al', source: 'Website', created_at: at, partner_link_seen: { code: 'TWIN-1', status: 'ambiguous', at } },
  { id: 'fold1', first_name: 'Ann', source: 'Website', archived: true, duplicate_of: 'keep1', created_at: at, possibly_returning: { matches: [{ kind: 'inquiry', lead_id: 'keep1' }], decision: 'same_family' },
    partner_link_seen: { code: 'JANE-K7', status: 'linked', org_id: 'jane', at } },
  { id: 'keep1', first_name: 'Ann', source: 'Referral', referral_org_id: 'cox', referral_source_name: 'CoxHealth', created_at: '2026-09-01T15:00:00Z', first_shift_at: '2026-09-10T13:00:00Z' },
  { id: 'diff1', first_name: 'Lee', source: 'Website', created_at: at, possibly_returning: { matches: [{ kind: 'inquiry', lead_id: 'old1' }], decision: 'different_family' },
    partner_link_seen: { code: 'JANE-K7', status: 'linked', org_id: 'jane', at } },
  { id: 'done1', first_name: 'Sue', source: 'Website', created_at: at, partner_link_seen: { code: 'JANE-K7', status: 'linked', org_id: 'jane', at, resolved: { decision: 'keep' } } },
  { id: 'spam1', first_name: 'X', spam: { at }, partner_link_seen: { code: 'BOB-22', status: 'unknown', at } },
  { id: 'man1', first_name: 'Hal', source: 'Referral', referral_org_id: 'jane', referral_source_name: 'Ozark Senior Moves', referral_via: 'call', created_at: at, status: 'Contacted' },
  { id: 'man2', first_name: 'Ivy', source: 'Referral', referral_org_id: 'jane', referral_source_name: 'Ozark Senior Moves', referral_via: 'manual', created_at: at, status: 'Assessment Scheduled' },
];
const items = P.checks(LEADS, ORGS), I = id => items.find(x => x.lead_id === id);
ck('new family through a link (the server attached the partner): nothing to check', !I('new1'));
ck('returning family: on the list as "may already be known", with the code and partner', I('dup1') && I('dup1').kind === 'known_family' && /family we already know/.test(I('dup1').why) && I('dup1').org_name === 'Ozark Senior Moves' && I('dup1').code === 'JANE-K7', I('dup1'));
ck('AxisCare unavailable (no returning flag, no partner attached): on the list, saying AxisCare couldn\'t be checked', I('ax1') && I('ax1').kind === 'known_family' && /AxisCare couldn't be checked/.test(I('ax1').why), I('ax1'));
ck('paused partner: on the list', I('pau1') && I('pau1').kind === 'paused' && I('pau1').org_name === 'Grace Community Church');
ck('invalid codes: unknown and shared codes are on the list', I('unk1') && I('unk1').kind === 'unknown' && I('amb1') && I('amb1').kind === 'ambiguous');
ck('duplicate inquiry folded into the family\'s record: the decision lands on the kept record, which already has a source', I('fold1') && I('fold1').target_id === 'keep1' && I('fold1').folded && I('fold1').target_has_source, I('fold1'));
ck('a coordinator said "different family": flagged so the owner sees the partner may have sent a new one', I('diff1') && I('diff1').different_family && /different family/.test(I('diff1').why));
ck('decided items and spam never show', !I('done1') && !I('spam1'));

let L = clone(LEADS), it = P.checks(L, ORGS).find(x => x.lead_id === 'dup1');
ck('only an owner can decide', P.resolve(it, 'keep', L, ORGS, CC).error === 'Only an owner can decide these.');
let r = P.resolve(it, 'keep', L, ORGS, OWNER);
ck('Keep the current source: the item is closed with who and when; the family\'s source is untouched', r.changes.length === 1 && L.find(x => x.id === 'dup1').partner_link_seen.resolved.decision === 'keep' && L.find(x => x.id === 'dup1').source === 'Website' && !L.find(x => x.id === 'dup1').referral_org_id
  && !P.checks(L, ORGS).some(x => x.lead_id === 'dup1'), r);
L = clone(LEADS); it = P.checks(L, ORGS).find(x => x.lead_id === 'ax1');
r = P.resolve(it, 'credit', L, ORGS, OWNER);
ck('Credit with no reason is refused even when the family has no source yet (always an owner decision with a reason)', /Write why you are crediting/.test(r.error || '') && !L.find(x => x.id === 'ax1').referral_org_id && !L.find(x => x.id === 'ax1').partner_link_seen.resolved, r);
r = P.resolve(it, 'credit', L, ORGS, Object.assign({}, OWNER, { why: 'Rechecked AxisCare: no match, a new family' }));
const ax = L.find(x => x.id === 'ax1');
ck('Credit the partner (AxisCare was down; the owner checked): source Referral, partner attached, by link, history "sources_check"', !r.error && ax.referral_org_id === 'jane' && ax.source === 'Referral' && ax.referral_via === 'link' && ax.source_history[0].how === 'sources_check' && /Rechecked AxisCare/.test(ax.source_history[0].why) && ax.partner_link_seen.resolved.org_id === 'jane', ax);
ck('...nothing is lost while it waits: the link details stay on the inquiry until an owner decides, and after', !!L.find(x => x.id === 'ax1').partner_link_seen.code && LEADS.find(x => x.id === 'ax1').partner_link_seen.code === 'JANE-K7');
L = clone(LEADS); it = P.checks(L, ORGS).find(x => x.lead_id === 'fold1');
ck('crediting a folded family that already has a source needs a reason', /Write why/.test(P.resolve(it, 'credit', L, ORGS, OWNER).error));
r = P.resolve(it, 'credit', L, ORGS, Object.assign({}, OWNER, { why: 'Called the family; Jane sent them' }));
const kp = L.find(x => x.id === 'keep1');
ck('...with a reason: the KEPT record changes (CoxHealth to Jane), its history says from, to and why; the folded inquiry is closed', !r.error && r.changes.length === 2 && kp.referral_org_id === 'jane' && kp.source_history[0].from.referral_org_id === 'cox' && /Jane sent them/.test(kp.source_history[0].why)
  && L.find(x => x.id === 'fold1').partner_link_seen.resolved.applied_to === 'keep1', [r.error, kp]);
L = clone(LEADS); it = P.checks(L, ORGS).find(x => x.lead_id === 'unk1');
ck('an unknown code: crediting needs the owner to pick a partner', P.resolve(it, 'credit', L, ORGS, OWNER).error === 'Pick the partner to credit.');
ck('...and the family\'s typed source (Mercy Hospital) is established, so a reason is needed too', /Write why/.test(P.resolve(it, 'credit', L, ORGS, Object.assign({}, OWNER, { org_id: 'amy' })).error));
r = P.resolve(it, 'credit', L, ORGS, Object.assign({}, OWNER, { org_id: 'amy', why: 'Bo said Amy at Mercy gave him the card' }));
const bo = L.find(x => x.id === 'unk1');
ck('...with a reason, the typed source is replaced and kept in the history (never silently)', !r.error && bo.referral_org_id === 'amy' && bo.source_history[0].from.referral_source_name === 'Mercy Hospital' && /gave him the card/.test(bo.source_history[0].why), bo);

/* the Program numbers */
const rows = P.numbers(ORGS, LEADS), J = rows.find(x => x.id === 'jane');
ck('only program partners have a row (not CoxHealth, not archived)', rows.map(x => x.id).sort().join() === 'amy,jane,ron', rows.map(x => x.id));
ck('Jane: 3 referrals (the link one, a call, a typed one); unresolved links and the folded duplicate don\'t count', J.referrals === 3 && J.lead_ids.sort().join() === 'man1,man2,new1', J);
ck('...home visits 2 (an assessment booked, a lead past the first call), started 1, conversion 33%', J.consultations === 2 && J.started === 1 && J.conversion === 33, J);
ck('...how they came: 1 link, 1 call, 1 typed in', J.ways.link === 1 && J.ways.call === 1 && J.ways['typed in'] === 1, J.ways);
ck('a partner with no referrals: conversion is "not yet", never 0%', rows.find(x => x.id === 'ron').conversion === null);
const t = P.totals(rows);
ck('totals: 3 partners (2 not paused), 3 referred, 2 home visits, 1 started, 33%', t.partners === 3 && t.active === 2 && t.referrals === 3 && t.consultations === 2 && t.started === 1 && t.conversion === 33, t);
ck('no money anywhere: no revenue, amounts or rewards in the numbers', !/revenue|reward|amount|\$/i.test(JSON.stringify(rows)));

/* Community Ambassadors (step 2, 2026-10-26) */
const AMB = (o) => Object.assign({ id: 'amb1', name: 'Linda Ortiz', type: 'Community Ambassador', program_track: 'ambassador', program_status: 'applied', email: 'linda@example.com', phone: '417-555-0123',
  applied_at: '2026-10-26T15:00:00Z', application: { first_name: 'Linda', last_name: 'Ortiz', town: 'Nixa', share: ['Friends and family'], works_in_healthcare: false, works_for_us: false, flags: [] } }, o)
const AORGS = [AMB(), AMB({ id: 'amb2', name: 'Dana Smith', email: 'dana@x.com', phone: '', application: { first_name: 'Dana', works_in_healthcare: true, healthcare_where: 'Nurse at Mercy', works_for_us: false } }),
  AMB({ id: 'amb3', name: 'Ray Cole', email: 'ray@x.com', phone: '4175550777', program_status: 'info_requested', application: { first_name: 'Ray', works_for_us: true } }),
  AMB({ id: 'amb4', name: 'Old No', email: 'no@x.com', phone: '', program_status: 'declined' }),
  AMB({ id: 'amb5', name: 'Jo Live', email: 'jo@x.com', phone: '', program_status: 'active', partner_code: 'JO-K2' }),
  { id: 'jane', name: 'Ozark Senior Moves', partner_code: 'JANE-K7', program_status: 'active' }]
const apps = P.applications(AORGS)
ck('ambassadors: the applications list holds applied and waiting-on-answer only, oldest first (not declined, not approved)', apps.map((o) => o.id).join() === 'amb1,amb2,amb3', apps.map((o) => o.id))
const fl = (id, ctx) => P.ambFlags(AORGS.find((o) => o.id === id), ctx || { orgs: AORGS, leads: [{ id: 'l', first_name: 'Ray', last_name: 'Cole', phone: '(417) 555-0777' }], caregivers: [] })
ck('...healthcare work is a flag with where, not a refusal', fl('amb2').some((f) => f.key === 'healthcare' && /Nurse at Mercy/.test(f.words)) && P.applications(AORGS).some((o) => o.id === 'amb2'))
ck('...works for us is a flag', fl('amb3').some((f) => f.key === 'employee'))
ck('...the same phone as a family inquiry is "possibly already known"', fl('amb3').some((f) => f.key === 'duplicate' && /family inquiry \(Ray Cole\)/.test(f.words)), fl('amb3'))
ck('...the same email as a caregiver, or as a person at a partner, is flagged too', P.ambFlags(AMB(), { orgs: [AMB(), { id: 'x', name: 'Grace Church', contacts: [{ name: 'Linda O', email: 'LINDA@example.com' }] }], leads: [], caregivers: [{ first: 'Linda', last: 'Ortiz', phone: '4175550123' }] })
  .find((f) => f.key === 'duplicate').words.match(/a person at Grace Church|a caregiver record/g).length === 2)
ck('...an ordinary applicant has no flags', fl('amb1').length === 0, fl('amb1'))
ck('nothing is active before approval: no code, not in the program, not pickable, not matched from a call', !P.codeOf(AORGS[0]) && !P.inProgram(AORGS[0]) && !P.pickable(AORGS[0]) && P.partnerFromCall(AORGS, 'Linda Ortiz', '') === null)
ck('...a declined or waiting applicant isn\'t pickable either; an approved one and ordinary partners are', !P.pickable(AORGS[3]) && !P.pickable(AORGS[2]) && P.pickable(AORGS[4]) && P.pickable(AORGS[5]) && P.partnerFromCall(AORGS, 'Jo Live', '').org.id === 'amb5')
const L1 = clone(AMB()); let ar = P.approve(L1, AORGS, 'samantha@mo-care.com', '2026-10-27T15:00:00Z', seq([0, 0]))
ck('approve: a code from their first name, active, who and when, in the log; now in the program and pickable', ar.code === 'LINDA-AA' && L1.partner_code === 'LINDA-AA' && L1.program_status === 'active' && L1.approved_by === 'samantha@mo-care.com'
  && L1.program_log.slice(-1)[0].did === 'approved' && P.inProgram(L1) && P.pickable(L1) && P.linkFor(L1.partner_code) === 'https://mo-care.com/r/?p=LINDA-AA', L1)
ck('...approving twice is refused', /Already approved/.test(P.approve(L1, AORGS, 'x').error))
ck('...only ambassador records go through approval', /Not an ambassador/.test(P.approve({ id: 'p', name: 'X' }, AORGS, 'x').error))
const L2 = clone(AMB())
ck('ask a question: needs the question; then waiting on their answer, the question kept', /Write the question/.test(P.requestInfo(L2, ' ', 'x').error) && P.requestInfo(L2, 'Which group?', 'sam').ok && L2.program_status === 'info_requested' && L2.info_requests[0].question === 'Which group?')
const L3 = clone(AMB())
ck('decline: needs a reason (owners only see it); then declined with who and when', /short reason/.test(P.decline(L3, '', 'x').error) && P.decline(L3, 'Outside our area', 'sam').ok && L3.program_status === 'declined' && L3.declined_reason === 'Outside our area' && !L3.partner_code)
const W = P.welcomeEmail(L1)
ck('welcome email: their first name, link, QR code page, three steps, printed materials on request, the guidelines link, private families, the volunteer note',
  /Hi Linda/.test(W.html) && W.html.includes('https://mo-care.com/r/?p=LINDA-AA') && W.html.includes('https://mo-care.com/r/qr/?p=LINDA-AA') && /reply to this email or call \(417\) 234-8494 and we'll mail them/.test(W.html.replace(/&#39;|\\'/g, "'"))
  && W.html.includes('mo-care.com/ambassadors/#guidelines') && /won't share details about who contacts us/.test(W.html.replace(/\\'/g, "'")) && /voluntary and unpaid, and isn.t employment/.test(W.html) && W.subject === 'Welcome to Caring Companions Community Ambassadors', W.html.slice(0, 400))
ck('...and no money anywhere in it', !/\$|reward|commission|earn|paid for/i.test(W.html.replace(/voluntary and unpaid/, '')))
const Q = P.infoEmail(L2, 'Which <group>?')
ck('question email: their question shown safely, reply or call', /quick question/.test(Q.subject) && Q.html.includes('Which &lt;group&gt;?') && /reply to this email or call us/.test(Q.html))
ck('decline note: kind, no reason given', /not able to add you/.test(P.declineEmail(L3).html) && !P.declineEmail(L3).html.includes('Outside our area'))
let pass = 0; for (const [n, ok, d] of res) { console.log((ok ? '  ✓ ' : '  ✗ ') + n + (ok ? '' : '\n      ' + d)); if (ok) pass++; }
console.log(`\n${pass}/${res.length} passed`); process.exit(pass === res.length ? 0 : 1);
