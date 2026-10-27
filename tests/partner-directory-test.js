// The professional Referral Partner directory (Referrals & Marketing > Referral Partners, 2026-10-26). node tests/partner-directory-test.js
global.window = { PartnerRules: require('../partner-rules.js') };
require('../partner-directory.js');
const D = window.PartnerDirectory;
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 700)]);
const T = '2026-10-26';
const ORGS = [
  { id: 'mercy', name: 'Mercy Hospital', type: 'Hospital', owner_email: 'Krystal@mo-care.com', created_at: '2025-01-10T00:00:00Z',
    contacts: [{ id: 'c0', name: 'Old Contact', archived: true }, { id: 'c1', name: 'Jane Doe', role: 'Discharge planner', phone: '417-555-0101', email: 'jane@mercy.org' }] },
  { id: 'oak', name: 'Oak Park Senior Living', type: 'Senior Living', created_at: '2025-03-01T00:00:00Z', people: 'Tom Hill (director), Ann' },
  { id: 'cox', name: 'CoxHealth', type: 'Hospital', owner_email: 'angiel@mo-care.com', created_at: '2025-01-10T00:00:00Z' },
  { id: 'gone', name: 'Closed Clinic', type: 'Physician Office', archived: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'amb', name: 'Linda Ortiz', type: 'Community Ambassador', program_track: 'ambassador', program_status: 'active', partner_code: 'LINDA-AA' },
  { id: 'ff', name: 'Barb Probst', program_track: 'friends', partner_code: 'BARB-K7' },
]
const LEADS = [
  { id: 'l1', referral_org_id: 'mercy', created_at: '2026-08-01T10:00:00Z', first_shift_at: '2026-08-20T13:00:00Z' },
  { id: 'l2', referral_org_id: 'mercy', created_at: '2026-10-01T10:00:00Z' },
  { id: 'l3', referral_source_name: 'cox health', created_at: '2026-09-06T10:00:00Z', status: 'Converted', converted_at: '2026-09-10T10:00:00Z' },
  { id: 'l4', referral_org_id: 'amb', created_at: '2026-10-20T10:00:00Z' },
]
const ACTS = [
  { id: 'a1', org_id: 'mercy', kind: 'dropby', at: '2026-10-21T15:00:00Z', by: 'krystal@mo-care.com' },
  { id: 'a2', org_id: 'oak', kind: 'call', at: '2026-09-01T15:00:00Z' },
]
const PLANNED = [{ id: 'p1', org_id: 'cox', due: '2026-11-04', kind: 'dropby' }]
const ctx = { today: T, leads: LEADS, activities: ACTS, planned: PLANNED, settings: {} }
const names = { 'krystal@mo-care.com': 'Krystal Land', 'angiel@mo-care.com': 'Angiel M' }
const rows = D.rows(ORGS, ctx, e => names[String(e).toLowerCase()] || e)
const by = id => rows.find(r => r.id === id)
ck('professional partners only: Community Ambassadors and Friends & Family people never appear', rows.length === 4 && !by('amb') && !by('ff'), rows.map(r => r.id))
ck('main contact: the first saved person who is not archived, with role and phone', by('mercy').contact.name === 'Jane Doe' && by('mercy').contact.role === 'Discharge planner' && by('mercy').contact.phone === '417-555-0101')
ck('...an older partner with only the free-text people line shows its first name', by('oak').contact.name === 'Tom Hill (director)')
ck('responsible: the assigned owner by name; nobody = empty (the page says Needs an owner)', by('mercy').owner === 'Krystal Land' && by('oak').owner === '' && by('cox').owner === 'Angiel M')
ck('last contact: the latest logged touch', by('mercy').last === '2026-10-21' && by('oak').last === '2026-09-01' && by('cox').last === null)
ck('next follow-up: a planned touch wins', by('cox').next.on === '2026-11-04' && by('cox').next.how === 'planned', by('cox').next)
ck('...else when the desk says it is due, and overdue is flagged', by('oak').next.how === 'due' && by('oak').overdue === true, by('oak'))
ck('referrals and client starts: by partner id, older typed names matched, first clock-in or Converted counts as a start',
  by('mercy').referrals === 2 && by('mercy').starts === 1 && by('cox').referrals === 1 && by('cox').starts === 1, [by('mercy'), by('cox')])
ck('nothing about money on any row', !/revenue|reward|\$|pay/i.test(JSON.stringify(rows.map(r => { const { hay, ...x } = r; return x }))))
const f = (o, me) => D.filter(rows, o, me).map(r => r.id).sort().join(',')
ck('archived partners are hidden unless asked for', f({}) === 'cox,mercy,oak' && f({ archived: true }) === 'cox,gone,mercy,oak')
ck('search: organization, contact name, role, phone, email, type and owner all match', f({ q: 'jane' }) === 'mercy' && f({ q: 'discharge' }) === 'mercy' && f({ q: '555-0101' }) === 'mercy'
  && f({ q: 'mercy.org' }) === 'mercy' && f({ q: 'senior living' }) === 'oak' && f({ q: 'angiel' }) === 'cox' && f({ q: 'TOM' }) === 'oak')
ck('...several words must all match', f({ q: 'hospital jane' }) === 'mercy' && f({ q: 'hospital tom' }) === '')
ck('type filter', f({ type: 'Hospital' }) === 'cox,mercy')
ck('responsible filter: mine, needs an owner, or one person', f({ who: 'mine' }, 'krystal@mo-care.com') === 'mercy' && f({ who: 'none' }) === 'oak' && f({ who: 'angiel@mo-care.com' }) === 'cox')
const s = by => D.sortRows(D.filter(rows, {}), by).map(r => r.id).join(',')
ck('sort by name (the default)', s('name') === 'cox,mercy,oak')
ck('sort by next follow-up, soonest first (overdue Oak first; Cox planned and Mercy due both Nov 4, then by name)', s('next') === 'oak,cox,mercy' && by('mercy').next.on === '2026-11-04', s('next'))
ck('sort by longest since contact (never contacted first)', s('last') === 'cox,oak,mercy', s('last'))
ck('sort by most referrals', s('referrals').split(',')[0] === 'mercy', s('referrals'))
let pass = 0; for (const [n, ok, d] of res) { console.log((ok ? '  ✓ ' : '  ✗ ') + n + (ok ? '' : '\n      ' + d)); if (ok) pass++ }
console.log(`\n${pass}/${res.length} passed`); process.exit(pass === res.length ? 0 : 1)
