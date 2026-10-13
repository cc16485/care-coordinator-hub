/* Reference cards on the person's page (2026-10-12, step 3): one card per reference with every action for it, status
   only from answers, a hand-set status shown as that, and a Conditional decided by an owner. FAKE people only. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ENG = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
global.window = global; require(path.join(ROOT, 'eligibility-rules.js'));
const cut = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error('cannot find ' + a); return src.slice(i, j); };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ', m); } else { fail++; console.log('FAIL ', m); } };
const html = (c, owner, reqs) => {
  const x = { CCElig: global.CCElig, globalThis: null, ccIsOwner: () => owner, String, Number, Array, Date, isNaN,
    bgrEsc: s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/'/g,'&#39;').replace(/"/g,'&quot;'),
    obRefType: v => { const t = String(v||'').toLowerCase(); return t === 'professional' ? 'professional' : t === 'personal' ? 'personal' : ''; },
    obFmtPhone: p => ({ dial: p, show: p }), ocAttrs: () => ' href="#"', obRefCellTypeLine: (c, n) => c['r' + n + '_type'] || '' };
  x.globalThis = x; vm.createContext(x);
  vm.runInContext(cut(ENG, 'function obRefCardsHtml(c, reqs){', '/* Owners only.'), x);
  return x.obRefCardsHtml(c, reqs || []);
};
const base = { id: 7, first: 'Ava', last: 'Sample' };
let h = html(Object.assign({}, base, { r1n: 'Dana', r1s: 'Positive', r1_type: 'professional', r1_manual: { via: 'Online form', date: '2026-10-10', type: 'professional' }, r1_pdf: 'refs/7/r1.pdf',
  r2n: 'Eli', r2s: 'Pending', r2_sent: { how: 'email', at: '2026-10-09T15:00:00Z', by: 'Krystal' } }), false, [{ id: 'q2', slot: 2, office_attempts: [{ at: '2026-10-11T15:00:00Z', method: 'voicemail', by: 'Samantha' }], reminder_count: 1 }]);
ok((h.match(/border-radius:10px;padding:10px 12px/g) || []).length === 2, 'one card per reference given');
ok(/Positive<\/span>/.test(h) && />Waiting<\/span>/.test(h), 'status chips: Positive, and Pending shown as Waiting');
ok(/answered online 10\/10\/2026/.test(h) && /emailed the form 10\/09\/2026 by Krystal/.test(h) && /voicemail 10\/11\/2026 by Samantha/.test(h) && /reminded 1 time/.test(h), 'every send, call and answer is on the card, dates as mm/dd/yyyy');
ok(/openManualRef\(7,2\)/.test(h) && /obRefEmailOpen\(7,2\)/.test(h) && /obRefTextOpen\(7,2\)/.test(h) && /bgrOpenAttemptModal\('q2'\)/.test(h), 'waiting reference: record from a call, email, text, log a call');
ok(/bgrViewProof\('refs\/7\/r1\.pdf'\)/.test(h) && /openOBModal\(7\)/.test(h), 'answered reference: its PDF; every card: Fix contact');
ok(/2 needed, at least 1 from work/.test(h), 'the rule is stated on the box');
h = html(Object.assign({}, base, { r1n: 'Lee', r1s: 'Positive' }), false);
ok(/Status set by hand before 10\/12\/2026/.test(h), 'a status with no answers behind it says it was set by hand');
const cond = Object.assign({}, base, { r1n: 'Pat', r1s: 'Conditional', r1_manual: { via: 'Phone', staff: 'Samantha', date: '2026-10-10' }, r2n: 'Dana', r2s: 'Positive', r2_type: 'professional' });
ok(/obRefDecide\(7,'proceed'\)/.test(html(cond, true)) && /obRefDecide\(7,'not_enough'\)/.test(html(cond, true)), 'a Conditional: owners get Accept with a note and Not enough');
ok(!/obRefDecide/.test(html(cond, false)) && /An owner decides/.test(html(cond, false)), 'everyone else sees that an owner decides');
ok(/answers taken by phone 10\/10\/2026 by Samantha/.test(html(cond, true)), 'a phone answer says who took it');
const decided = Object.assign({}, cond, { ref_decision: { outcome: 'proceed', refs: 'Conditional|Positive||', note: 'Late twice, otherwise strong', by: 'samantha@mo-care.com', at: '2026-10-12T20:00:00Z' } });
ok(/Accepted<\/b> by samantha@mo-care\.com on 10\/12\/2026: Late twice/.test(html(decided, true)) && !/obRefDecide/.test(html(decided, true)), 'a decision shows who, when and why, and the buttons go');
const reopened = Object.assign({}, decided, { r3n: 'New', r3s: 'Conditional' });
ok(/obRefDecide/.test(html(reopened, true)), 'a later change to the references re-opens the decision');
ok(/No references given yet/.test(html(base, false)), 'no references: says so, with a way to add them');

/* the wiring */
const so = cut(ENG, 'async function saveOB(){', 'let saved;');
ok(/r1s:\(oldCand&&oldCand\.r1s\)\|\|'Pending'/.test(so) && !/r[1-4]s:g\('ob-r[1-4]s'\)/.test(so), 'Edit candidate no longer saves a typed-in status');
ok([1,2,3,4].every(n => IDX.includes('<select id="ob-r' + n + 's" disabled')), 'and the status boxes there are greyed out');
ok(/if\(!\(typeof ccIsOwner === 'function' && ccIsOwner\(\)\)\)\{ alert\('Only an owner/.test(ENG), 'deciding is refused for anyone but an owner');
ok(/if\(r\.ok\) try\{ window\.ppRefCardsRefresh/.test(ENG), 'cards redraw after any Background & References save');
ok(/class="pp-refcards" data-cand=/.test(IDX) && /obRefCardsMount\(el, el\.dataset\.cand\)/.test(IDX), 'the Hiring tab shows the cards when their record is found by id');
ok(!/—/.test(cut(ENG, '/* ── REFERENCE CARDS ON THE PERSON', '// ── Employee Profile (name-matched')), 'no em dashes');
console.log(`ref-cards: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
