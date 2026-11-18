/* Katlin video interviews (video-interviews.js): the video link rule, the Interview hours chip and button, and the
   driver's license check (anything but Matched = an owners' task, the offer waits for an owner, never an automatic no).
   node tests/video-interviews-test.js */
const fs = require('fs'), vm = require('vm'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if(c){ pass++; console.log('PASS ·', n); } else { fail++; console.log('FAIL ·', n, d === undefined ? '' : JSON.stringify(d)); } };
const src = fs.readFileSync(path.join(__dirname, '..', 'video-interviews.js'), 'utf8');

function world(o = {}){
  const els = {}, updates = [], persisted = [];
  const el = (id) => els[id] || (els[id] = { id, innerHTML: '' });
  const coords = o.coords || [{ id: 'co-v', name: 'Katlin', meeting_link: 'https://meet.google.com/abc-defg-hij' }, { id: 'co-k', name: 'Krystal', meeting_link: null }];
  const sb = { from: (t) => {
    const st = { eq: [] }, b = {
      select(){ return b; }, eq(c, v){ st.eq.push([c, v]); return b; },
      maybeSingle(){ const r = coords.find(x => st.eq.every(([c, v]) => x[c] === v)); return Promise.resolve({ data: r || null, error: null }); },
      update(obj){ return { eq(c, v){ if(o.updateError) return Promise.resolve({ error: { message: o.updateError } }); updates.push({ t, obj, c, v }); return Promise.resolve({ error: null }); } }; },
    }; return b; } };
  let checked = o.checked || null;
  const document = { getElementById: (id) => el(id), querySelector: () => checked ? { value: checked } : null };
  const ctx = { console, document, sb, IV_HOSTS: coords, AP_BOOK: o.book || { a1: { coordinator_id: 'co-v', video: true }, a2: { coordinator_id: 'co-k', video: false } }, DATA: { staffing_tasks: [] },
    alerts: [], prompts: o.prompts || [] };
  ctx.window = ctx;
  ctx.alert = (m) => ctx.alerts.push(m);
  ctx.ccPrompt = async () => ctx.prompts.shift();
  ctx.ccActor = () => ({ email: 'katlin@mo-care.com', name: 'Katlin' });
  ctx.ccIsOwner = () => !!o.owner;
  ctx.persist = async (k, t) => { persisted.push([k, t]); };
  ctx.uid = () => 'id_test';
  ctx.ivLoad = async () => { ctx.reloaded = true; };
  ctx.__apInt = {};
  vm.createContext(ctx); vm.runInContext(src, ctx);
  return { ctx, VI: ctx.VI, els, updates, persisted, set: (v) => { checked = v; } };
}

(async () => {
  const { VI } = world();
  ok('a Meet link is valid', VI.validLink(' https://meet.google.com/abc-defg-hij ') === 'https://meet.google.com/abc-defg-hij');
  ok('a Zoom link is valid', !!VI.validLink('https://us02web.zoom.us/j/123'));
  ok('the HighLevel room, plain http, and junk are not', !VI.validLink('https://meet.mo-care.com/meet/katlin') && !VI.validLink('http://meet.google.com/x') && !VI.validLink('meet.google.com/x') && !VI.validLink(''));
  ok('same rule as the server (office-from.ts videoLink)', /zoom\\\.us\|meet\\\.google\\\.com/.test(src) || src.includes('zoom\\.us|meet\\.google\\.com'));
  ok('chip only for an interviewer with a link', /Video link set/.test(VI.hostChip({ meeting_link: 'https://meet.google.com/a' })) && VI.hostChip({ meeting_link: '' }) === '' && VI.hostChip({}) === '');
  ok('button says Add video link / Video link', /Add video link/.test(VI.hostButton({ id: 'x' })) && />🎥 Video link</.test(VI.hostButton({ id: 'x', meeting_link: 'https://meet.google.com/a' })));
  ok('names in the chip are escaped', !VI.hostChip({ meeting_link: 'https://meet.google.com/"><b>' }).includes('"><b>'));

  { const w = world({ prompts: ['https://meet.google.com/new-link-abc'] }); await w.VI.setLink('co-v');
    ok('saving a Meet link writes coordinators.meeting_link and reloads', w.updates.length === 1 && w.updates[0].t === 'coordinators' && w.updates[0].obj.meeting_link === 'https://meet.google.com/new-link-abc' && w.updates[0].v === 'co-v' && w.ctx.reloaded, w.updates); }
  { const w = world({ prompts: ['https://meet.mo-care.com/meet/katlin'] }); await w.VI.setLink('co-v');
    ok('a non Meet/Zoom link is refused, nothing written', w.updates.length === 0 && /not a Google Meet/.test(w.ctx.alerts[0] || ''), w.ctx.alerts); }
  { const w = world({ prompts: [''] }); await w.VI.setLink('co-v');
    ok('empty = back to in person (null)', w.updates.length === 1 && w.updates[0].obj.meeting_link === null); }
  { const w = world({ prompts: [null] }); await w.VI.setLink('co-v');
    ok('Cancel changes nothing', w.updates.length === 0); }
  { const w = world({ prompts: ['https://meet.google.com/x-y-z'], updateError: 'column "meeting_link" does not exist' }); await w.VI.setLink('co-v');
    ok('before the Desktop step: a plain message, nothing changed', /not ready for video links/.test(w.ctx.alerts[0] || ''), w.ctx.alerts); }

  { const w = world(); await w.VI.idCheckMount('a2');
    ok('in-person interview: no license check shown', w.els.apIntIdCheck.innerHTML === '');
    const A = {}; ok('...and nothing is asked before an outcome', w.VI.beforeOutcome('a2', 'hired', A) === null && A.id_check === undefined); }
  { const w = world(); await w.VI.idCheckMount('a1');
    const h = w.els.apIntIdCheck.innerHTML;
    ok('video interview: the license check with the three choices', /Driver's license check/.test(h) && /Matched/.test(h) && /Not done/.test(h) && /Didn&#39;t look right|Didn't look right/.test(h), h);
    ok('...says do not write down the number or take a picture', /Do not write down the number or take a picture/.test(h));
    ok('...an outcome waits until it is marked', /Mark the driver's license check first/.test(w.VI.beforeOutcome('a1', 'pool', {}) || ''));
    w.set('matched'); const A = {};
    ok('Matched: the outcome goes ahead and the choice is kept on the interview', w.VI.beforeOutcome('a1', 'hired', A) === null && A.id_check === 'matched' && A.id_review === false && A.id_check_by === 'Katlin');
    await w.VI.afterSave('a1', 'Maria Test'); ok('...and no task', w.persisted.length === 0); }
  for (const v of ['not_done', 'wrong']) {
    const w = world(); await w.VI.idCheckMount('a1'); w.set(v); const A = {};
    ok(`${v}: Hire is held for an owner (Katlin is not one)`, /Samantha looks before an offer/.test(w.VI.beforeOutcome('a1', 'hired', A) || '') && A.id_review === true);
    ok(`${v}: Candidate pool still goes ahead (never an automatic no)`, w.VI.beforeOutcome('a1', 'pool', {}) === null);
    await w.VI.afterSave('a1', 'Maria Test');
    const t = (w.persisted[0] || [])[1] || {};
    ok(`${v}: one task to the owners naming the person and the choice`, w.persisted.length === 1 && w.persisted[0][0] === 'staffing_tasks' && t.direction === 'to_owners' && /Maria Test/.test(t.message) && /Nothing was rejected automatically/.test(t.message), t);
    await w.VI.afterSave('a1', 'Maria Test'); ok(`${v}: pressing again does not add a second task`, w.persisted.length === 1);
  }
  { const w = world({ owner: true }); await w.VI.idCheckMount('a1'); w.set('wrong');
    ok('an owner can still make the offer after looking', w.VI.beforeOutcome('a1', 'hired', {}) === null); }
  { const w = world({ book: { a3: { coordinator_id: 'co-v', video: false } } }); await w.VI.idCheckMount('a3');
    ok('1541: an in-person booking with an interviewer who has a link: no license check', w.els.apIntIdCheck.innerHTML === ''); }
  ok('no em dash in the file', !src.includes('—'));
  console.log(fail ? `${fail} OF ${pass + fail} FAILED` : `ALL ${pass} CHECKS PASS`); process.exit(fail ? 1 : 0);
})();
