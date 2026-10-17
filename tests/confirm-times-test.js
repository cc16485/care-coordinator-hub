/* node tests/confirm-times-test.js
   2026-10-17 (Samantha): the EVV correction form is retired and the EVV tab is removed. A visit missing a clock-in or
   clock-out is a "Call <client> to confirm <caregiver>'s times" card in Needs Attention (confirm-times.js): Call,
   record what the client said, correct AxisCare by hand, tick "Fixed in AxisCare". Her approved SOP is the no_clock
   procedure. Made-up people only. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const idx = rd('index.html'), lib = rd('confirm-times.js'), clockin = rd('clockin.html'), guide = rd('scheduling-guide.js');
const DASH = /[—―]/, PLAIN = new RegExp('pla' + 'in (lang' + 'uage|eng' + 'lish)', 'i');
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };

/* ── 1 · the rules ── */
const R = (() => { const c = { globalThis: {} }; c.globalThis = c; vm.createContext(c); vm.runInContext(lib, c); return c.CftRules; })();
const OUT = { id: 'ops_cft_9401', kind: 'confirm_times', status: 'open', caregiver: 'Maria Lopez', client_first: 'Ruth', client_axiscare_id: '701', missing: 'out', shift_date: '2026-10-06', shift_time: '09:00', shift_end: '13:00' };
const BOTH = Object.assign({}, OUT, { id: 'ops_cft_9301', missing: 'both' });
ck('rules · who you spoke with is required', R.record(OUT, { relationship: 'client', outcome: 'confirmed', departure: '13:05' }).why === 'Who did you speak with?');
ck('rules · the relationship is required', /related/.test(R.record(OUT, { spoke_with: 'Ruth', outcome: 'confirmed', departure: '13:05' }).why));
ck('rules · what they said is required', /what they told you/.test(R.record(OUT, { spoke_with: 'Ruth', relationship: 'client' }).why));
ck('rules · confirmed, a missed clock-out: the departure time is needed, the arrival is not', /departure/.test(R.record(OUT, { spoke_with: 'Ruth', relationship: 'client', outcome: 'confirmed' }).why)
  && R.record(OUT, { spoke_with: 'Ruth', relationship: 'client', outcome: 'confirmed', departure: '13:05' }).ok);
ck('rules · confirmed, both missing: both times are needed', /arrival/.test(R.record(BOTH, { spoke_with: 'Ann', relationship: 'daughter', outcome: 'confirmed', departure: '13:00' }).why)
  && R.record(BOTH, { spoke_with: 'Ann', relationship: 'daughter', outcome: 'confirmed', arrival: '09:02', departure: '13:00' }).ok);
ck('rules · "not there" or "could not confirm" needs a note and keeps no times', /note/.test(R.record(OUT, { spoke_with: 'Ruth', relationship: 'client', outcome: 'not_there' }).why)
  && (() => { const r = R.record(OUT, { spoke_with: 'Ruth', relationship: 'client', outcome: 'unsure', departure: '13:05', notes: 'Not sure' }); return r.ok && r.rec.departure === null; })());
{ const r = R.record(OUT, { spoke_with: 'Ann Adams', relationship: 'daughter', outcome: 'confirmed', departure: '13:05', notes: '' }, 'sam@mo-care.com', '2026-10-06T19:00:00Z').rec;
  ck('rules · the words: who, how related, the time they gave', R.words(OUT, r) === 'Called Ann Adams (daughter): confirmed Maria left 1:05 PM.', R.words(OUT, r));
  ck('rules · "Fixed in AxisCare" only after a confirmed call; "Done" only after a call that was not', R.canFix(Object.assign({}, OUT, { confirm: r })) && !R.canFix(OUT)
    && !R.canClose(Object.assign({}, OUT, { confirm: r })) && R.canClose(Object.assign({}, OUT, { confirm: Object.assign({}, r, { outcome: 'unsure' }) }))); }

/* ── 2 · the card in a fake page ── */
const els = {}; const el = (id) => (els[id] ||= { id, value: '', style: {}, textContent: '' });
let POP = '', SAVED = [], TOAST = '', LOG = [], EVENTS = [];
const ctx = { console, JSON, Object, String, Array, Date, Promise,
  document: { getElementById: el, querySelector: (q) => (/cftOut/.test(q) ? (ctx.__out ? { value: ctx.__out } : null) : null) },
  ocAttrs: (phone, o) => ' href="#" data-oc-phone="' + phone + '" data-oc-client="' + (o && o.client) + '"',
  ccPopOpen: (a, h) => { POP = h; }, ccPopClose: () => { POP = ''; }, ccActor: () => ({ email: 'sam@mo-care.com', name: 'Samantha T' }),
  opsLog: (it, t) => { (it.history ||= []).push({ text: t }); LOG.push(t); }, opEvent: (k, x) => EVENTS.push([k, x.summary]),
  persist: async (k, it) => { SAVED.push([k, JSON.parse(JSON.stringify(it))]); }, ccToast: (m) => { TOAST = m; }, myWorkRefresh: () => {} };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext('var DATA = { ops_items: [] };', ctx);
vm.runInContext(lib, ctx);
const reset = () => { vm.runInContext('DATA.ops_items = ' + JSON.stringify([OUT, BOTH]) + ';', ctx); SAVED = []; LOG = []; EVENTS = []; POP = ''; };
const item = (id) => vm.runInContext('DATA.ops_items.find(x => x.id === ' + JSON.stringify(id) + ')', ctx);
(async () => {
  reset();
  let h = ctx.ccCftActions(item('ops_cft_9401'));
  ck('card · Call Ruth (rings your phone, by her AxisCare client id), Record the call, No answer', /📞 Call Ruth/.test(h) && /data-oc-client="701"/.test(h) && /Record the call/.test(h) && /No answer/.test(h) && /Let them tell you the times/.test(h), h);
  ck('card · no Fixed in AxisCare before the call is recorded', !/Fixed in AxisCare/.test(h));
  ctx.ccCftOpen('ops_cft_9401', null);
  ck('record box · asks who, how related, what they said; only the departure time for a missed clock-out', /Who did you speak with/.test(POP) && /cftRel/.test(POP) && /Confirmed the times/.test(POP)
    && /Says Maria was not there/.test(POP) && /id="cftDep"/.test(POP) && !/id="cftArr"/.test(POP), POP.slice(0, 300));
  el('cftWith').value = ''; el('cftRel').value = 'client'; ctx.__out = 'confirmed'; el('cftDep').value = '13:05';
  await ctx.ccCftSave('ops_cft_9401');
  ck('save · a missing name is refused with the reason shown, nothing saved', SAVED.length === 0 && el('cftErr').textContent === 'Who did you speak with?' && el('cftErr').style.display === 'block');
  el('cftWith').value = 'Ruth Adams'; el('cftNotes').value = '';
  await ctx.ccCftSave('ops_cft_9401');
  const c = item('ops_cft_9401').confirm;
  ck('save · the call is kept on the card: who, client, confirmed, the time, by whom; the card stays open', SAVED.length === 1 && SAVED[0][0] === 'ops_items' && c.spoke_with === 'Ruth Adams' && c.relationship === 'client'
    && c.outcome === 'confirmed' && c.departure === '13:05' && c.arrival === null && c.by === 'sam@mo-care.com' && item('ops_cft_9401').status === 'open', c);
  ck('save · its history says it in words, and the event record has it', LOG[0] === 'Called Ruth Adams: confirmed Maria left 1:05 PM.' && EVENTS[0] && EVENTS[0][0] === 'item_updated', [LOG, EVENTS]);
  h = ctx.ccCftActions(item('ops_cft_9401'));
  ck('card · after the call: what was said and "✓ Fixed in AxisCare"', /Called Ruth Adams: confirmed Maria left 1:05 PM\./.test(h) && /Fixed in AxisCare/.test(h) && /Change/.test(h), h);
  await ctx.ccCftFixed('ops_cft_9401');
  const it = item('ops_cft_9401');
  ck('Fixed in AxisCare · closes the card: done, who, when, the note, the AxisCare stamp', it.status === 'done' && it.closed_by === 'sam@mo-care.com' && !!it.axiscare_fixed_at
    && /Fixed in AxisCare with the times Ruth confirmed/.test(it.close_note) && SAVED.length === 2 && EVENTS.some((e) => e[0] === 'item_resolved'), it);
  reset(); await ctx.ccCftFixed('ops_cft_9401');
  ck('Fixed in AxisCare · refused before a confirmed call (nothing saved)', SAVED.length === 0 && item('ops_cft_9401').status === 'open');
  await ctx.ccCftNoAnswer('ops_cft_9301');
  ck('No answer · noted with who and when, the card stays open, the count shows', item('ops_cft_9301').no_answer.length === 1 && item('ops_cft_9301').status === 'open'
    && /No answer 1 time so far/.test(ctx.ccCftActions(item('ops_cft_9301'))) && /no answer\. Try again later today/.test(LOG[0]), item('ops_cft_9301'));
  reset(); ctx.ccCftOpen('ops_cft_9301', null); el('cftWith').value = 'Ann'; el('cftRel').value = 'daughter'; ctx.__out = 'not_there'; el('cftNotes').value = 'Says nobody came';
  await ctx.ccCftSave('ops_cft_9301');
  h = ctx.ccCftActions(item('ops_cft_9301'));
  ck('not there · the times are not changed; the card offers the call-off / no-show record and Done, never Fixed', /says Maria was not there\. Times not changed/.test(h) && /Record the call-off or no-show/.test(h) && /Done/.test(h) && !/Fixed in AxisCare/.test(h), h);
  await ctx.ccCftClose('ops_cft_9301');
  ck('not there · Done closes it with what happened', item('ops_cft_9301').status === 'done' && /was not there; times not changed/.test(item('ops_cft_9301').close_note));
  ck('the card never contacts anyone: no fetch, no send in confirm-times.js', !/fetch\(|functions\.invoke|send_sms|ghl/i.test(lib.replace(/^\s*\/\*[\s\S]*?\*\//m, '')));

  /* ── 3 · the Hub around it ── */
  ck('index · the EVV tab is gone: no tab, no menu entry, no Missing EVV board, no form inbox', !/id="tab-evv"/.test(idx) && !/data-tab="evv"/.test(idx) && !/evvMissingBoard|evvPendingNative|swEvvText|evvToggleNextVisit/.test(idx));
  ck('index · an old link to EVV opens Needs Attention', /GOTO_ALIAS=\{[^}]*evv:'ops'/.test(idx) && !/'schedguide','evv'/.test(idx));
  ck('index · the card draws its buttons, and its kind has a label and a 4-hour window', /it\.kind==='confirm_times' && it\.status==='open' && typeof ccCftActions==='function'\) return ccCftActions\(it\)/.test(idx)
    && /confirm_times:\s*\{ label:'Confirm times with the client', hours:4 \}/.test(idx) && /<script src="confirm-times\.js\?v=\d+"><\/script>/.test(idx));
  ck('index · Settings: the clock-out wording has no form link; the call-the-client minutes are a setting', /id="set_cft_after"/.test(idx) && /set\('confirm_times_out_after_min', cft, 'call-the-client minutes'\)/.test(idx)
    && !/placeholder="[^"]*evv-correction-form/.test(idx));
  ck('index · no "Text the EVV form" or "correction form link" left to press', !/Text the EVV form|Text the correction form|📱 Text the correction/.test(idx));
  ck('link page · the EVV form card and button are gone; it says the office calls the client', !/bEvv|act\('evv'/.test(clockin) && /If the shift ends with no clock-in/.test(clockin) && /We no longer use the EVV correction form/.test(clockin));
  ck('scheduling guide · points to Needs Attention and the call, not the form', /go\('ops', '', 'Needs Attention'\)/.test(guide) && !/Text the correction form|text form/.test(guide));
  const a = idx.indexOf('  const STARTERS=['), b = idx.indexOf('];', idx.indexOf("slot:'ihs_end'"));
  const S = vm.runInNewContext(idx.slice(a + '  const STARTERS='.length, b + 1)), sop = S.find((x) => x.slot === 'no_clock');
  ck('SOP · the approved procedure: her title, the 7 steps, Call / record / AxisCare / Fixed in AxisCare, tell Samantha', sop && sop.title === 'Missed clock-in or clock-out: confirm the times with the client' && sop.steps.length === 7
    && /tap Call/.test(sop.steps[0]) && /Let them tell you the times/.test(sop.steps[1]) && /Fixed in AxisCare/.test(sop.steps[3]) && /tell Samantha/.test(sop.escalate_if) && sop.where[0].url === '#ops', sop);
  ck('no em dashes and never her banned phrase in anything new', ![lib, JSON.stringify(sop), clockin.slice(clockin.indexOf('2026-10-17'), clockin.indexOf('2026-10-17') + 600)].some((t) => DASH.test(t) || PLAIN.test(t)));
  console.log(`confirm-times: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('FAIL  crashed: ' + (e && e.stack || e)); process.exit(1); });
