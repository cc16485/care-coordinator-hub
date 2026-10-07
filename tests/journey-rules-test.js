/* node tests/journey-rules-test.js — the journey rules against the real first catalog (Staffing-Coordinator-Hub/client-journey/catalog-v1.json) */
const path = require('path'), fs = require('fs');
const R = require('../journey-rules.js');
const cat = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'Staffing-Coordinator-Hub', 'client-journey', 'catalog-v1.json'), 'utf8')).steps;
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };
const ctx = (o) => Object.assign({ today:'2026-10-06', owner_emails:['sam@x.com', 'zach@x.com'], staffing_email:'sally@x.com' }, o || {});
const S = (k, o) => Object.assign({ step_key:k, state:'complete' }, o || {});
const J = (o) => Object.assign({ payer:'medicaid', assigned_cc:'angie@x.com', target_start:null }, o || {});

let v = R.compute(cat, J(), [S('intake.payer', { answer:{ payer:'medicaid' } })], ctx());
ck('Medicaid: payer done, next is the client basics (verified); eMOMED is ready alongside', v.next.key === 'intake.basics' && v.alsoReady.some(r => r.key === 'med.emomed'), [v.next && v.next.key, v.alsoReady.map(r => r.key)]);
ck('...the rail starts Intake (now), Pre-checks, Assessment …, ending Active', v.rail[0].key === 'intake' && v.rail[0].state === 'now' && v.rail[1].key === 'prechecks' && v.rail.at(-1).key === 'active', v.rail);
ck('...Coming next lists what follows (FUSION after eMOMED)', v.comingNext.some(r => r.key === 'med.fusion'), v.comingNext.map(r => r.key));
ck('...owners: Care Coordinator steps go to the assigned CC', v.next.owner.email === 'angie@x.com');
const pp = R.compute(cat, J({ payer:'private' }), [S('intake.payer', { answer:{ payer:'private' } })], ctx());
ck('Private Pay: no Pre-checks stage and no eMOMED', !pp.rail.some(s => s.key === 'prechecks') && !pp.rows.some(r => r.key === 'med.emomed'));
ck('...Book the assessment comes right after the basics (a step that doesn\'t apply never holds it back)', pp.rows.find(r => r.key === 'asmt.book').status === 'ready', pp.rows.find(r => r.key === 'asmt.book'));
ck('CDS-free: no step offers CDS as a payer', !JSON.stringify(cat).includes('"v":"cds"'));

// the 21-day hard stop
const base = [S('intake.payer', { answer:{ payer:'medicaid' } }), S('intake.basics'), S('med.emomed', { answer:{ result:'eligible', checked_on:'2026-10-01' }, evidence:{ files:['f'] } }), S('med.fusion')];
v = R.compute(cat, J(), base.concat([S('med.notices', { answer:{ count:2 } })]), ctx());
ck('2 prior notices: the step is BLOCKED as a stop, with the owner-exception words', v.stop && v.stop.key === 'med.notices' && v.next.key === 'med.notices' && v.next.status === 'blocked' && /Only an owner/.test(v.next.why), v.next && [v.next.key, v.next.status, v.next.why]);
ck('...everything after it waits (care plan, decision, booking can\'t be done)', ['med.careplan', 'med.decision', 'asmt.book'].every(k => v.rows.find(r => r.key === k).status === 'later'), ['med.careplan', 'med.decision', 'asmt.book'].map(k => v.rows.find(r => r.key === k).status));
ck('...the rail shows Pre-checks as stopped', v.rail.find(s => s.key === 'prechecks').state === 'stopped');
v = R.compute(cat, J(), base.concat([S('med.notices', { answer:{ count:1 } })]), ctx());
ck('1 prior notice passes: the care plan step is next', v.next.key === 'med.careplan' && !v.stop);
v = R.compute(cat, J(), base.concat([S('med.notices', { state:'exception', answer:{ count:3 }, exception:{ by:'sam@x.com', reason:'r' } })]), ctx());
ck('an owner exception lets it continue (the care plan is next)', !v.stop && v.next.key === 'med.careplan' && v.rows.find(r => r.key === 'med.notices').status === 'exception');
// eMOMED not eligible
v = R.compute(cat, J(), [S('intake.payer', { answer:{ payer:'medicaid' } }), S('med.emomed', { answer:{ result:'not_eligible' } })], ctx());
ck('eMOMED not eligible stops the journey too', v.stop && v.stop.key === 'med.emomed');

// waiting and check-back
v = R.compute(cat, J(), base.concat([S('med.notices', { answer:{ count:0 } }), { step_key:'med.careplan', state:'waiting', waiting_on:'the case manager', check_back:'2026-10-09' }]), ctx());
const cp = v.rows.find(r => r.key === 'med.careplan');
ck('Waiting with a check-back in the future: shows Waiting', cp.status === 'waiting' && /back 2026-10-09/.test(cp.why));
v = R.compute(cat, J(), base.concat([S('med.notices', { answer:{ count:0 } }), { step_key:'med.careplan', state:'waiting', waiting_on:'the case manager', check_back:'2026-10-06' }]), ctx());
ck('...on the check-back day it comes back as Needs attention ("Back from waiting")', v.rows.find(r => r.key === 'med.careplan').status === 'attention' && v.rows.find(r => r.key === 'med.careplan').back);

// due dates and attention
v = R.compute(cat, J({ payer:'private' }), [S('intake.payer', { answer:{ payer:'private' } }), { step_key:'intake.basics', state:'open', ready_since:'2026-09-28T15:00:00Z' }], ctx());
ck('a step past its due date becomes Needs attention ("Late since …")', v.rows.find(r => r.key === 'intake.basics').status === 'attention' && /Late since 2026-09-30/.test(v.rows.find(r => r.key === 'intake.basics').attention), v.rows.find(r => r.key === 'intake.basics'));
v = R.compute(cat, J({ payer:'private', target_start:'2026-10-08' }), [S('intake.payer', { answer:{ payer:'private' } })], ctx());
ck('start date in 2 days with an administrative step open: Needs attention', v.next.status === 'attention' && /Start date in 2 days/.test(v.next.attention));

// blocked by hand, unblocked by an owner
v = R.compute(cat, J({ payer:'private' }), [S('intake.payer', { answer:{ payer:'private' } }), { step_key:'intake.basics', state:'blocked', blocked_reason:'Family won\'t give a DOB', unblock:'An owner decides', unblock_role:'owner' }], ctx());
ck('blocked by hand: Blocked, with the reason', v.next.status === 'blocked' && v.next.why === 'Family won\'t give a DOB');
const cards = R.cardsFor(J({ payer:'private' }), v, ctx());
ck('...an owner-decision block goes on both owners\' My Work', cards.filter(c => c.kind === 'blocked').map(c => c.owner).sort().join() === 'sam@x.com,zach@x.com', cards);

// requested hours vs authorization
const signed = [S('intake.payer', { answer:{ payer:'medicaid' } }), S('pay.auth', { answer:{ hours_week:27 } })];
v = R.compute(cat, J(), signed.concat([S('sched.requested', { answer:{ hours_week:30 } })]), ctx());
ck('requested 30 hrs vs authorized 27: stops with the authorization words', v.stop && v.stop.key === 'sched.requested' && /above the authorized hours/.test(v.stop.why));
v = R.compute(cat, J(), signed.concat([S('sched.requested', { answer:{ hours_week:27 } })]), ctx());
ck('...27 vs 27 passes', !v.stop || v.stop.key !== 'sched.requested');

// cards
v = R.compute(cat, J({ payer:'private' }), [S('intake.payer', { answer:{ payer:'private' } })], ctx());
const c2 = R.cardsFor(J({ payer:'private' }), v, ctx());
ck('My Work: one card for the CC, a normal Next step, with "also ready" listed', c2.length === 1 && c2[0].owner === 'angie@x.com' && c2[0].kind === 'next' && c2[0].step_key === 'intake.basics', c2);

// completing
const row = (k) => R.compute(cat, J(), base.concat([S('med.notices', { answer:{ count:0 } })]), ctx()).rows.find(r => r.key === k);
ck('a proof step can\'t be completed without the file', !R.canComplete(row('med.careplan'), { answer:{ hours_week:27, reviewed:true, feasible:'yes' } }).ok);
ck('...with the file and every answer, it can', R.canComplete(row('med.careplan'), { answer:{ hours_week:27, reviewed:true, feasible:'yes' }, files:['x'] }).ok);
ck('FUSION: the "notes and history" box must be ticked, not only the care plan', /notes and history/.test(R.canComplete(R.compute(cat, J(), base.slice(0, 3), ctx()).rows.find(r => r.key === 'med.fusion'), { answer:{ checked_on:'2026-10-01', careplan:true, authorization:true, provider_changes:true }, files:['f'] }).why));
ck('a verified step can only be confirmed by hand with a reason', !R.canComplete(R.compute(cat, J(), [S('intake.payer', { answer:{ payer:'medicaid' } })], ctx()).rows.find(r => r.key === 'intake.basics'), {}).ok
   && R.canComplete(R.compute(cat, J(), [S('intake.payer', { answer:{ payer:'medicaid' } })], ctx()).rows.find(r => r.key === 'intake.basics'), { manual_reason:'AxisCare is down' }).ok);
ck('Other payer: "Which payer?" is required only when Other is picked', !R.canComplete({ def:cat.find(d => d.key === 'intake.payer'), st:{}, status:'ready' }, { answer:{ payer:'other' } }).ok && R.canComplete({ def:cat.find(d => d.key === 'intake.payer'), st:{}, status:'ready' }, { answer:{ payer:'private' } }).ok);

// a whole journey, done
const all = cat.filter(d => R.applies(d, J({ payer:'private' }))).map(d => S(d.key, { answer:{ payer:'private', outcome:'signed', hours_week:20 } }));
v = R.compute(cat, J({ payer:'private' }), all, ctx());
ck('every required step done: Active, nothing next', v.complete && v.stage === 'active' && !v.next && v.rail.at(-1).state === 'done');

/* They said yes (Stage 3): signed.yes is a confirmed step after the payer; the signed documents and the AxisCare client hang off it */
{
  const yes = cat.find(d => d.key === 'signed.yes');
  ck('signed.yes exists: Signed stage, confirmed by a person, required, after the payer only', yes && yes.stage === 'signed' && yes.proof === 'confirmed' && yes.required && yes.after.join() === 'intake.payer', yes);
  ck('the signed documents and the AxisCare client come after the yes', ['docs.agreement', 'docs.rights', 'docs.assessment', 'ax.client'].every(k => (cat.find(d => d.key === k).after || []).indexOf('signed.yes') > -1 && (cat.find(d => d.key === k).after || []).indexOf('asmt.outcome') < 0));
  const v0 = R.compute(cat, J({ payer:'private' }), [S('intake.payer', { answer:{ payer:'private' } })], ctx());
  ck('before the yes: the documents are "later" (After: Family chose Caring Companions)', v0.rows.find(r => r.key === 'docs.agreement').status === 'later' && /Family chose/.test(v0.rows.find(r => r.key === 'docs.agreement').why) && v0.rows.find(r => r.key === 'signed.yes').status === 'ready');
  const v1 = R.compute(cat, J({ payer:'private' }), [S('intake.payer', { answer:{ payer:'private' } }), S('signed.yes')], ctx());
  ck('after the yes: the documents and the AxisCare client are ready; the basics (verified) stay the next required step', ['docs.agreement', 'docs.rights', 'docs.assessment', 'ax.client'].every(k => v1.rows.find(r => r.key === k).status === 'ready') && v1.next.key === 'intake.basics', v1.next && v1.next.key);
  ck('a stop (2 notices) also holds the yes', (() => { const v = R.compute(cat, J(), base.concat([S('med.notices', { answer:{ count:2 } })]), ctx()); return v.stop && v.rows.find(r => r.key === 'signed.yes').status === 'later'; })());
  ck('the yes is quiet: ready, but never an "also ready" line and never a My Work card (the family\'s move, not the coordinator\'s)', !v0.alsoReady.some(r => r.key === 'signed.yes') && !R.cardsFor(J({ payer:'private' }), v0, ctx()).some(c => c.step_key === 'signed.yes') && v0.rows.find(r => r.key === 'signed.yes').status === 'ready', v0.alsoReady.map(r => r.key));
}

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
