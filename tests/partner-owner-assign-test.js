/* node tests/partner-owner-assign-test.js
   Her ruling 2026-10-18: Care Coordinators own referral partners and Krystal (the Springfield lead) assigns them.
   The real referral-desk.js and partner-rules.js, with the role map cut out of index.html, run on a fake page.
   Proves: the Springfield lead and owners see "Needs an owner" and can assign or reassign; a Care Coordinator alone
   cannot; the desk timing settings stay owner-only; no default owner (nothing lands on Samantha); an empty pick or a
   profile save never assigns anybody by accident; the owner picker offers Care Coordinators, the lead and owners;
   no em dashes on screen. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cut = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return html.slice(a, b); };
const roleMap = cut('const CC_ROLE_PERMS_DEFAULT=', '/* The same permissions');
const rules = fs.readFileSync(path.join(ROOT, 'partner-rules.js'), 'utf8');
const desk = fs.readFileSync(path.join(ROOT, 'referral-desk.js'), 'utf8');

let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 700))); };

const ROLES = {
  'samantha@mo-care.com': ['owner_admin'],
  'krystal@mo-care.com': ['care_coordinator', 'springfield_lead'],
  'leah@mo-care.com': ['care_coordinator'],
  'sam2@mo-care.com': ['staffing_coordinator'],
};
const PEOPLE = Object.keys(ROLES).concat(['nobody@mo-care.com']).map((e) => ({ primary_email: e, full_name: e.split('@')[0] }));

function world(meEmail) {
  const els = {}, saved = [], merged = [], toasts = [];
  const el = (id) => els[id] || null;
  const ctx = {
    console, JSON, Promise, Set, Map, String, Array, Object, Number, Error, RegExp, Intl, Math, Date,
    ME: { email: meEmail, name: meEmail.split('@')[0] }, OPS_PEOPLE: PEOPLE,
    DATA: { ops_settings: {}, leads: [], referral_activities: [], activities: [], ops_items: [],
      referral_orgs: [
        { id: 'p1', name: 'Mercy Hospital', type: 'Hospital', created_at: '2025-01-10T00:00:00Z' },
        { id: 'p2', name: 'Ozark Rehab', type: 'Skilled Nursing Facility', created_at: '2026-10-17T00:00:00Z' },
        { id: 'p3', name: 'CoxHealth', created_at: '2025-01-10T00:00:00Z', owner_email: 'leah@mo-care.com' },
      ] },
    document: {
      getElementById: el,
      createElement: () => ({ style: {}, set textContent(v) {} }),
      head: { appendChild() {} }, body: { appendChild() {} },
    },
    persist: async (key, item) => { saved.push({ key, item: JSON.parse(JSON.stringify(item)) }); },
    tkMerge: async (apply) => { const m = JSON.parse(JSON.stringify(ctx.DATA.ops_settings)); apply(m); merged.push(m); return { error: null }; },
    ccToast: (m) => toasts.push(m), ccConfirm: async () => true, uid: () => 'u' + Math.random().toString(36).slice(2),
  };
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(roleMap + `
    const CC_ROLES = ${JSON.stringify(ROLES[meEmail] || [])}, CC_ROLE_BY_EMAIL = ${JSON.stringify(ROLES)};
    function ccCan(p){ return CC_ROLES.some(r => (CC_ROLE_PERMS_DEFAULT[r] || []).indexOf(p) > -1); }
    function ccIsOwner(e){ return (CC_ROLE_BY_EMAIL[String(e == null ? ME.email : e).toLowerCase()] || []).indexOf('owner_admin') > -1; }
    function ccRolesFor(e){ return CC_ROLE_BY_EMAIL[String(e || '').toLowerCase()] || []; }
    this.ccCan = ccCan; this.ccIsOwner = ccIsOwner; this.ccRolesFor = ccRolesFor;`, ctx);
  vm.runInContext(rules, ctx);
  vm.runInContext(desk, ctx);
  const setEl = (id, value) => { els[id] = { id, value, innerHTML: '', textContent: '' }; return els[id]; };
  return { ctx, els, saved, merged, toasts, setEl };
}
const opts = (h, id) => { const m = h.match(new RegExp('<select id="' + id + '"[^>]*>([\\s\\S]*?)</select>')); return m ? [...m[1].matchAll(/<option value="([^"]*)"/g)].map((x) => x[1]) : null; };

(async () => {
  /* the role map itself */
  {
    const w = world('krystal@mo-care.com');
    const map = vm.runInContext('CC_ROLE_PERMS_DEFAULT', w.ctx);
    ck('role map: the Springfield lead and owners hold assign_partners; a Care Coordinator or Staffing Coordinator alone does not',
      map.springfield_lead.includes('assign_partners') && map.owner_admin.includes('assign_partners') && !map.care_coordinator.includes('assign_partners') && !map.staffing_coordinator.includes('assign_partners'), map);
    ck('...the new permission has words for the role picker and a place in its order',
      /assign_partners:'assign referral partner owners'/.test(html) && /CC_PERM_ORDER=\[[^\]]*'assign_partners'/.test(html));
  }

  /* Krystal: sees Needs an owner, assigns, reassigns */
  {
    const w = world('krystal@mo-care.com');
    const h = w.ctx.pdDeskHtml();
    ck('Krystal (Springfield lead) sees "Needs an owner" with both unowned partners, old and new (no default owner)',
      /Needs an owner/.test(h) && /Mercy Hospital/.test(h) && /Ozark Rehab/.test(h) && /2 partners nobody owns yet/.test(h), h.slice(0, 600));
    ck('...the picker starts on "Pick a person" and offers Care Coordinators, the lead and owners only (not the Staffing Coordinator or someone with no role)',
      JSON.stringify(opts(h, 'pdOwn_p1')) === JSON.stringify(['', 'krystal@mo-care.com', 'leah@mo-care.com', 'samantha@mo-care.com']), opts(h, 'pdOwn_p1'));
    ck('...she gets the Mine / Everyone switch', /pdWho\('all'\)/.test(h));
    w.setEl('pdOwn_p1', '');
    await w.ctx.pdAssign('p1');
    ck('...an empty pick assigns nobody and says so', !w.saved.length && /Pick who will own Mercy Hospital first/.test(w.toasts.join()), w.toasts);
    w.setEl('pdOwn_p1', 'leah@mo-care.com');
    await w.ctx.pdAssign('p1');
    const s = w.saved[0];
    ck('...assigning Mercy to Leah saves the partner with the owner, when and by whom (the Hub\'s normal safe save)',
      s && s.key === 'referral_orgs' && s.item.id === 'p1' && s.item.owner_email === 'leah@mo-care.com' && s.item.owner_assigned_by === 'krystal@mo-care.com' && !!s.item.owner_assigned_at, s);
    const prof = w.ctx.pdProfileCard(w.ctx.DATA.referral_orgs[2]);
    ck('...on a partner\'s profile she can reassign (owner picker shown, current owner selected)', /<select id="pdOwner">/.test(prof) && /value="leah@mo-care.com" selected/.test(prof), prof.slice(0, 900));
    w.setEl('pdOwner', 'krystal@mo-care.com'); ['pdPot', 'pdPref', 'pdTimes', 'pdMat', 'pdRel'].forEach((k) => w.setEl(k, ''));
    await w.ctx.pdSaveProfile('p3');
    const orgSaves = () => w.saved.filter((x) => x.key === 'referral_orgs'), r = orgSaves()[orgSaves().length - 1].item;
    ck('...reassigning CoxHealth from Leah to herself is saved with who did it', r.owner_email === 'krystal@mo-care.com' && r.owner_assigned_by === 'krystal@mo-care.com', r);
    const unowned = w.ctx.pdProfileCard(w.ctx.DATA.referral_orgs[1]);
    ck('...an unowned partner\'s profile shows "Needs an owner" selected, not the first name in the list', /<option value="" selected>Needs an owner<\/option>/.test(unowned), unowned.slice(0, 900));
    w.setEl('pdOwner', '');
    const before = orgSaves().length;
    await w.ctx.pdSaveProfile('p2');
    const last = orgSaves()[orgSaves().length - 1];
    ck('...saving that profile without picking anybody leaves it unowned', orgSaves().length === before + 1 && last.item.id === 'p2' && !last.item.owner_email, last);
    const rows = w.ctx.pdMyDayRows((...a) => a[2]);
    ck('...Today tells her how many partners need an owner', rows.some((t) => /Partners needing an owner: 1/.test(t)), rows);
  }

  /* desk settings stay owner-only */
  {
    const w = world('krystal@mo-care.com');
    w.setEl('pdSet', '');
    w.ctx.pdSetFill();
    ck('desk timing settings: shown read-only to Krystal ("Only an owner can change these")', /Only an owner can change these/.test(w.els.pdSet.innerHTML) && /disabled/.test(w.els.pdSet.innerHTML));
    await w.ctx.pdSetSave(null);
    ck('...and her save does nothing', !w.merged.length);
    ck('...the default owner picker is gone; it says the lead assigns and new partners wait in "Needs an owner"', !/pdsOwn/.test(w.els.pdSet.innerHTML) && /Springfield lead \(or an owner\) assigns/.test(w.els.pdSet.innerHTML));
  }
  {
    const w = world('samantha@mo-care.com');
    w.setEl('pdSet', ''); w.ctx.pdSetFill();
    for (const [k, v] of [['pdsA', '14'], ['pdsB', '30'], ['pdsC', '42'], ['pdsNew', '7'], ['pdsAd', '90'], ['pdsAc', '3'], ['pdsPd', '90'], ['pdsTowns', 'Springfield\nNixa'], ['pdSetMsg', '']]) w.setEl(k, v);
    w.ctx.DATA.ops_settings = { partner_desk: { default_owner: 'samantha@mo-care.com', since: '2026-10-08' } };
    await w.ctx.pdSetSave(null);
    const m = w.merged[0];
    ck('an owner can still save the timing; an old default_owner is dropped on save', m && m.partner_desk.cadence.A === 14 && !('default_owner' in m.partner_desk) && m.partner_desk.since === '2026-10-08', m);
    const h = w.ctx.pdDeskHtml();
    ck('an owner (Samantha) can still assign', /Needs an owner/.test(h) && /pdAssign\('p1'\)/.test(h));
    ck('nothing is on Samantha\'s own week by default', /Nothing due this week/.test(h), h.slice(0, 400));
  }

  /* a Care Coordinator alone cannot assign */
  {
    const w = world('leah@mo-care.com');
    const h = w.ctx.pdDeskHtml();
    ck('Leah (Care Coordinator) does not see "Needs an owner" or the Everyone switch', !/Needs an owner/.test(h) && !/pdWho\('all'\)/.test(h), h.slice(0, 500));
    w.setEl('pdOwn_p1', 'leah@mo-care.com');
    await w.ctx.pdAssign('p1');
    ck('...a direct assign call from her does nothing', !w.saved.length);
    const prof = w.ctx.pdProfileCard(w.ctx.DATA.referral_orgs[2]);
    ck('...on a profile she sees the owner as words, no picker', !/id="pdOwner"/.test(prof) && /<div>leah<\/div>/.test(prof), prof.slice(0, 900));
    w.setEl('pdOwner', 'leah@mo-care.com'); ['pdPot', 'pdPref', 'pdTimes', 'pdMat', 'pdRel'].forEach((k) => w.setEl(k, ''));
    await w.ctx.pdSaveProfile('p1');
    const o1 = w.saved.find((x) => x.key === 'referral_orgs');
    ck('...and her profile save never changes an owner', o1 && o1.item.id === 'p1' && !o1.item.owner_email, o1);
    ck('...Today has no "needing an owner" line for her', !w.ctx.pdMyDayRows((...a) => a[2]).some((t) => /needing an owner/.test(t)));
  }

  /* wording */
  {
    const w = world('krystal@mo-care.com');
    w.setEl('pdSet', ''); w.ctx.pdSetFill();
    const shown = w.ctx.pdDeskHtml() + w.ctx.pdProfileCard(w.ctx.DATA.referral_orgs[1]) + w.els.pdSet.innerHTML;
    ck('no em dashes on the desk, the profile or the settings', !/—/.test(shown));
  }

  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
