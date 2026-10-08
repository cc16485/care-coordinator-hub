// The Referral Partner Desk's rules (Step 2, 2026-10-08). node tests/partner-rules-test.js
const P = require('../partner-rules.js');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 700)]);
const T = '2026-10-08';   // a Thursday; the week is Mon Oct 5 to Sun Oct 11
const ST = { partner_desk: { since: '2026-10-08' } };
const ORGS = [
  { id: 'mercy', name: 'Mercy Hospital', created_at: '2025-01-10T00:00:00Z' },
  { id: 'cox', name: 'CoxHealth', created_at: '2025-01-10T00:00:00Z', owner_email: 'Krystal@mo-care.com' },
  { id: 'fount', name: 'The Fountains', created_at: '2025-03-01T00:00:00Z' },
  { id: 'quiet', name: 'Quiet Clinic', created_at: '2024-01-01T00:00:00Z' },
  { id: 'big', name: 'Big Potential Rehab', created_at: '2024-06-01T00:00:00Z', potential: 'high', potential_set_at: '2026-09-20' },
  { id: 'newp', name: 'Ozark Rehab', created_at: '2026-10-09T00:00:00Z' },   // added after the desk started: needs an owner
  { id: 'newv', name: 'New Visit Place', created_at: '2026-09-28T00:00:00Z' },
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

ck('owners: a partner that existed when the desk started is Samantha\'s; an assigned one keeps its owner (any case)', P.ownerOf(ORGS[0], ST).email === 'samantha@mo-care.com' && P.ownerOf(ORGS[0], ST).how === 'existing' && P.ownerOf(ORGS[1], ST).email === 'krystal@mo-care.com')
ck('...a partner added after that waits in "Needs an owner"', P.ownerOf(ORGS[5], ST).how === 'needs_owner' && P.needsOwner(ORGS, ctx).map((o) => o.id).join() === 'newp')
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
const sam = P.week(ORGS, ctx, 'samantha@mo-care.com')
ck('Samantha\'s week: her partners due by Sunday, priority first, then by tier, potential and how overdue (the partner needing an owner is on it; its website referral makes it B)', sam.map((x) => x.id).join() === 'big,newv,fount,newp,quiet', sam.map((x) => x.id + ':' + x.tier + ':' + x.due))
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
let pass = 0; for (const [n, ok, d] of res) { console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok ? '' : '  ' + d)); if (ok) pass++ }
console.log(`\n${pass} passed, ${res.length - pass} failed`); process.exit(pass === res.length ? 0 : 1)
