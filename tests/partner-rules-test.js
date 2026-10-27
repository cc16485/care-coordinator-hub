// The Referral Partner Desk's rules (Step 2, 2026-10-08). node tests/partner-rules-test.js
const P = require('../partner-rules.js');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 700)]);
const T = '2026-10-08';   // a Thursday; the week is Mon Oct 5 to Sun Oct 11
const ST = { partner_desk: { since: '2026-10-08' } };
const ORGS = [
  { id: 'mercy', name: 'Mercy Hospital', created_at: '2025-01-10T00:00:00Z', owner_email: 'coord@mo-care.com' },
  { id: 'cox', name: 'CoxHealth', created_at: '2025-01-10T00:00:00Z', owner_email: 'Krystal@mo-care.com' },
  { id: 'fount', name: 'The Fountains', created_at: '2025-03-01T00:00:00Z', owner_email: 'coord@mo-care.com' },
  { id: 'quiet', name: 'Quiet Clinic', created_at: '2024-01-01T00:00:00Z', owner_email: 'coord@mo-care.com' },
  { id: 'big', name: 'Big Potential Rehab', created_at: '2024-06-01T00:00:00Z', potential: 'high', potential_set_at: '2026-09-20', owner_email: 'coord@mo-care.com' },
  { id: 'newp', name: 'Ozark Rehab', created_at: '2026-10-09T00:00:00Z' },   // nobody assigned: needs an owner
  { id: 'newv', name: 'New Visit Place', created_at: '2026-09-28T00:00:00Z', owner_email: 'coord@mo-care.com' },
]
const LEADS = [
  { id: 'l1', referral_org_id: 'mercy', created_at: '2026-08-01T10:00:00Z', first_shift_at: '2026-08-20T13:00:00Z' },
  { id: 'l2', referral_org_id: 'fount', created_at: '2026-03-01T10:00:00Z', status: 'Lost' },
  { id: 'l3', referral_source_name: 'cox health', created_at: '2026-10-06T10:00:00Z', source: 'Referral' },   // typed name, sent this week
  { id: 'l4', referral_org_id: 'cox', created_at: '2026-05-01T10:00:00Z' }, { id: 'l5', referral_org_id: 'cox', created_at: '2026-06-01T10:00:00Z' },
  { id: 'l6', referral_org_id: 'quiet', created_at: '2024-02-01T10:00:00Z' },
  { id: 'u1', source: 'Referral', referral_source_name: 'St Johns', created_at: '2026-10-01T10:00:00Z' }, { id: 'u2', source: 'Referral', referral_source_name: 'St. Johns', created_at: '2026-10-02T10:00:00Z' },
  { id: 'u3', source: 'Referral', referral_org_suggest: { name: 'Ozark Rehab', type: 'Skilled Nursing Facility' }, referral_source_name: 'Ozark Rehab', created_at: '2026-10-03T10:00:00Z' },
  { id: 's1', source: 'Referral', referral_source_name: 'Spam Co', spam: { at: '2026-10-01' }, created_at: '2026-10-01T10:00:00Z' },
]
const ACTS = [
  { org_id: 'mercy', kind: 'dropby', at: '2026-09-30T15:00:00Z' },
  { org_id: 'cox', kind: 'call', at: '2026-08-01T15:00:00Z' },
  { org_id: 'fount', kind: 'dropby', at: '2026-08-15T15:00:00Z' }, { org_id: 'fount', kind: 'idea', at: '2026-10-07T15:00:00Z' },
  { org_id: 'quiet', kind: 'email', at: '2026-07-01T15:00:00Z' },
  { org_id: 'newv', kind: 'dropby', at: '2026-10-02T15:00:00Z' },
]
const ctx = { today: T, leads: LEADS, activities: ACTS, settings: ST }
const L = (id) => P.look(ORGS.find((o) => o.id === id), ctx)

ck('owners: an assigned partner keeps its owner (any case)', P.ownerOf(ORGS[0]).email === 'coord@mo-care.com' && P.ownerOf(ORGS[1]).email === 'krystal@mo-care.com' && P.ownerOf(ORGS[1]).how === 'assigned')
ck('2026-10-18: no default owner; a partner nobody owns waits in "Needs an owner", however old it is', P.ownerOf(ORGS[5]).how === 'needs_owner' && P.ownerOf({ id: 'old', created_at: '2020-01-01' }).how === 'needs_owner' && P.needsOwner(ORGS).map((o) => o.id).join() === 'newp')
ck('...a default_owner left in old settings is ignored (never Samantha by default)', P.ownerOf({ id: 'old', created_at: '2020-01-01' }, { partner_desk: { default_owner: 'samantha@mo-care.com', since: '2026-10-08' } }).email === '' && !('default_owner' in P.DEFAULTS))
ck('tier A: a client started from them in the last 90 days (Mercy), with the reason', L('mercy').tier === 'A' && /1 client from them in the last 90 days/.test(L('mercy').why), L('mercy'))
ck('tier B: a referral in the last 12 months that didn\'t start (The Fountains)', L('fount').tier === 'B' && L('fount').cadence === 30, L('fount'))
ck('tier C: nothing in 12 months (Quiet Clinic), every 42 days', L('quiet').tier === 'C' && L('quiet').cadence === 42 && /nothing in the last 12 months/.test(L('quiet').why), L('quiet'))
ck('older leads with only a typed name still count for the partner (cox health → CoxHealth)', L('cox').sent === 3 && L('cox').sent_this_week === 1, L('cox'))
ck('priority: marked high potential recently, nothing sent yet → A timing (every 14 days), never buried in C', L('big').tier === 'P' && L('big').cadence === 14 && /high potential/.test(L('big').cadence_why), L('big'))
ck('...a new partner (added within 90 days) is priority too', L('newv').tier === 'P', L('newv'))
ck('new partner: due 7 days after the first visit', L('newv').due === '2026-10-09' && /7 days after the first visit/.test(L('newv').cadence_why), L('newv'))
ck('an idea logged is not a touch (The Fountains\' last touch is the Aug 15 visit)', L('fount').last_touch === '2026-08-15')
ck('due: last touch + the tier timing (Mercy A: Sep 30 + 14 = Oct 14, next week, not on this week)', L('mercy').due === '2026-10-14' && !L('mercy').on_week, L('mercy'))
ck('...overdue shows with how long (Quiet Clinic: last touch 99 days ago)', L('quiet').on_week && /last touch 99 days ago/.test(L('quiet').reasons.join()), L('quiet').reasons)
ck('a partner that sent a referral this week always shows, first, "say thank you"', (() => { const w = P.week(ORGS, ctx, 'krystal@mo-care.com'); return w[0].id === 'cox' && /say thank you/.test(w[0].reasons[0]) })(), P.week(ORGS, ctx, 'krystal@mo-care.com'))
const mine = P.week(ORGS, ctx, 'coord@mo-care.com')
ck('a Care Coordinator\'s week: their partners due by Sunday, priority first, then by tier, potential and how overdue', mine.map((x) => x.id).join() === 'big,newv,fount,quiet', mine.map((x) => x.id + ':' + x.tier + ':' + x.due))
ck('a partner needing an owner is on nobody\'s own week (it is on the Needs an owner list), and Samantha gets none by default', !P.week(ORGS, ctx, 'samantha@mo-care.com').length && !P.week(ORGS, ctx, '').length)
ck('...but the Everyone view shows it, with its website referral making it B', (() => { const x = P.week(ORGS, ctx, '*').find((y) => y.id === 'newp'); return x && x.tier === 'B' && x.owner.how === 'needs_owner' })())
ck('everyone (owners\' view) includes Krystal\'s too', P.week(ORGS, ctx, '*').some((x) => x.id === 'cox'))
ck('timing is adjustable in Settings (A every 7 days pulls Mercy into this week)', P.look(ORGS[0], Object.assign({}, ctx, { settings: { partner_desk: { since: '2026-10-08', cadence: { A: 7 } } } })).due === '2026-10-07')
ck('...nonsense settings fall back to her defaults, never to nothing', (() => { const s = P.settings({ partner_desk: { cadence: { A: 0, B: 'x', C: -3 }, a_days: 99999 } }); return s.cadence.A === 14 && s.cadence.B === 30 && s.cadence.C === 42 && s.a_days === 90 })())
ck('unlinked referrals are grouped by the name as typed ("St Johns" + "St. Johns" = one), including a website referral\'s organization; spam is left out',
  (() => { const u = P.unlinked(LEADS); return u.length === 3 && u[0].leads.length === 2 && u.some((g) => g.name === 'Ozark Rehab' && g.type === 'Skilled Nursing Facility') && !u.some((g) => /Spam/.test(g.name)) })(), P.unlinked(LEADS))
const MERCY = { id: 'm', contacts: [{ id: 'c1', name: 'Lisa Marsh', phone: '(417) 555-0111', email: 'lisa@mercy.net' }, { id: 'c2', name: 'Dana', phone: '4175550222' }, { id: 'c3', name: 'Old', phone: '4175550333', archived: true }] }
ck('a website referrer is linked to one of the partner\'s people only on an exact phone or email', P.contactFor(MERCY, { phone: '417-555-0111' }).id === 'c1' && P.contactFor(MERCY, { email: 'LISA@mercy.net' }).id === 'c1' && !P.contactFor(MERCY, { phone: '4175550999' }) && !P.contactFor(MERCY, { phone: '4175550333' }))
ck('the weekly My Work card has one fixed id per owner per week (never doubles), and a new id next week', P.weeklyCardId('krystal@mo-care.com', '2026-10-06') === P.weeklyCardId('krystal@mo-care.com', '2026-10-11') && P.weeklyCardId('krystal@mo-care.com', '2026-10-12') !== P.weeklyCardId('krystal@mo-care.com', '2026-10-11'))
ck('urgent referrals are not on the weekly list (they are leads, on the Leads board)', !P.week(ORGS, ctx, '*').some((x) => /urgent/i.test(x.reasons.join())))
ck('an archived partner never shows', !P.week(ORGS.concat([{ id: 'arch', name: 'Gone', archived: true, created_at: '2024-01-01' }]), ctx, '*').some((x) => x.id === 'arch'))
/* Community Ambassadors (2026-10-26): never on anyone's week or in Needs an owner */
{ const AM = [{ id: 'a1', name: 'Linda Ortiz', program_track: 'ambassador', program_status: 'applied', created_at: '2026-10-25T00:00:00Z' }, { id: 'a2', name: 'Jo Live', program_track: 'ambassador', program_status: 'active', partner_code: 'JO-K2', created_at: '2026-10-20T00:00:00Z' }]
  const all = ORGS.concat(AM)
  ck('ambassadors (applied or approved) never in Needs an owner, and never on anyone\'s week, even "Everyone"', !P.needsOwner(all).some((o) => o.program_track === 'ambassador') && !P.week(all, ctx, '*').some((x) => /^a\d/.test(x.id)) && P.needsOwner(all).length === P.needsOwner(ORGS).length) }
ck('any other program (Friends & Family people, any program_track) is never in Needs an owner or on anyone\'s week (2026-10-26)',
  !P.needsOwner([{ id: 'ff', name: 'Barb', program_track: 'friends' }]).length && !P.week([{ id: 'ff', name: 'Barb', program_track: 'friends', owner_email: 'coord@mo-care.com' }], { today: T, leads: [], activities: [], settings: ST }, '*').length)
let pass = 0; for (const [n, ok, d] of res) { console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok ? '' : '  ' + d)); if (ok) pass++ }
console.log(`\n${pass} passed, ${res.length - pass} failed`); process.exit(pass === res.length ? 0 : 1)
