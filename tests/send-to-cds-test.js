/* Send to Caring CDS (2026-11-01): send-to-cds.js with a fake Hub and a fake server. node tests/send-to-cds-test.js */
const path = require('path');
let pass = 0, fail = 0; const ck = (n, c, note) => { if(c){ pass++; } else { fail++; console.log('FAIL ' + n + (note !== undefined ? '\n   ' + JSON.stringify(note).slice(0, 600) : '')); } };
const store = {}; let SAVED = [], ALERTS = [], TOASTS = [], ANSWER, ASKED = [], CONFIRM = true, OWNER = false;
Object.assign(global, {
  window: global, localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); } },
  document: { getElementById: () => null },
  ME: { name: 'Krystal Smith', email: 'krystal@mo-care.com' }, ccIsOwner: () => OWNER,
  ccConfirm: async (m) => { ASKED.push(m); return CONFIRM; }, alert: m => ALERTS.push(m), ccToast: m => TOASTS.push(m),
  persist: async (k, v) => { SAVED.push([k, JSON.parse(JSON.stringify(v))]); },
  CONFIG: { supabase_url: 'http://sb', supabase_anon_key: 'anon' },
  sb: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } },
  LeadRules: { setStatus: (l, s, o) => { l.status = s; l.status_why = o.why; } },
  fetch: async (url, o) => { global.LAST = { url, body: JSON.parse(o.body) }; const a = typeof ANSWER === 'function' ? ANSWER() : ANSWER; return { ok: a.status === 200, status: a.status, json: async () => a.body }; },
});
const reset = (ops) => { global.DATA = { ops_settings: ops || { send_to_cds_live: true }, call_lead_marks: [],
  leads: [{ id: 'L1', first_name: 'Kim', client_first_name: 'Ann', client_last_name: 'Lee', funding_source: 'cds', status: 'New' },
          { id: 'L2', first_name: 'Bo', funding_source: 'private', status: 'New' }, { id: 'L3', first_name: 'Cy', funding_source: 'medicaid', status: 'Lost' }] };
  SAVED = []; ALERTS = []; TOASTS = []; ASKED = []; CONFIRM = true; OWNER = false; delete store.cc_send_to_cds_preview;
  ANSWER = { status: 200, body: { ok: true, cds: { added: true, name: 'Ann Lee' }, ghl: { done: ['a', 'b', 'c'], problems: [], contact_id: 'C1', workflows_listed: 1 } } }; };
require(path.join(__dirname, '..', 'send-to-cds.js'));
const S = global.SendToCds;
(async () => {
  /* the switch */
  reset({});
  ck('off: nothing on a call', S.callHtml('msg123456', 'She has Medicaid', null, true) === '');
  ck('off: nothing on Leads', S.boardHtml() === '');
  OWNER = true; ck('off: an owner is offered the preview', /Preview Send to Caring CDS/.test(S.previewAsk()));
  store.cc_send_to_cds_preview = '1'; ck('owner preview: shows, says only you', /Sounds like CDS/.test(S.callHtml('msg123456', 'She has Medicaid', null, false)) && /Preview: only you/.test(S.boardHtml()));
  OWNER = false; ck('preview is owners only', S.callHtml('msg123456', 'She has Medicaid', null, false) === '');

  /* the hint */
  reset();
  ck('Medicaid heard: hint + button', /Sounds like CDS/.test(S.callHtml('msg123456', 'Caller asked if Medicaid would pay for her mom', null, false)));
  ck('CDS heard', S.soundsLikeCds('wants to do CDS so her daughter is paid') && S.soundsLikeCds('consumer-directed services') && S.soundsLikeCds('can I hire my own caregiver'));
  ck('ordinary call: no hint', !S.soundsLikeCds('Asked about private pay rates for 20 hours a week'));
  const nf = S.callHtml('msg123456', 'Asked about rates', null, true);
  ck('a new family with no hint: the button, no chip', /Send to Caring CDS/.test(nf) && !/Sounds like CDS/.test(nf));
  ck('any other call: nothing', S.callHtml('msg123456', 'Caregiver calling in sick', null, false) === '');
  ck('on a CDS-payer lead: sends the lead', /sendLead\(&quot;L1&quot;\)/.test(S.callHtml('msg123456', '', DATA.leads[0], false)));
  ck('on a closed lead: nothing', S.callHtml('msg123456', 'Medicaid', DATA.leads[2], false) === '');

  /* Leads card */
  const b = S.boardHtml();
  ck('Leads: the CDS-payer lead waits, the closed Medicaid lead and the private one do not', /NOT SENT YET \(1\)/.test(b) && /Ann Lee/.test(b) && !/Bo\b/.test(b) && !/Cy\b/.test(b), b);

  /* sending a lead */
  await S.sendLead('L1');
  ck('asks first, says nothing goes to the family', /Send Ann Lee to Caring CDS\?/.test(ASKED[0]) && /Nothing is sent to the family/.test(ASKED[0]));
  ck('server gets only the lead id', JSON.stringify(LAST.body) === '{"lead_id":"L1"}' && /send-to-cds$/.test(LAST.url));
  const l = DATA.leads[0];
  ck('lead closed: Lost, Referred to Caring CDS', l.status === 'Lost' && l.lost_reason_key === 'referred_cds' && l.status_why === 'Referred to Caring CDS');
  ck('the send is kept on the lead', l.sent_to_cds && l.sent_to_cds.by === 'Krystal Smith' && l.sent_to_cds.cds_added && l.sent_to_cds.problems.length === 0, l.sent_to_cds);
  ck('saved', SAVED.length === 1 && SAVED[0][0] === 'leads');
  ck('told: CDS calls them, follow-up stopped', /Sent to Caring CDS\. Their office gets the alert and calls Ann\./.test(TOASTS[0]) && /follow-up is stopped/.test(TOASTS[0]), TOASTS);
  ck('no em dashes in what staff read', !/—/.test(ASKED.concat(TOASTS).join(' ')));
  ck('Leads: no longer waiting', !/NOT SENT YET/.test(S.boardHtml()));
  ck('a call on it says sent', /Sent to Caring CDS \(Krystal\)/.test(S.callHtml('msg123456', 'Medicaid', l, false)));

  /* said no */
  reset(); CONFIRM = false; await S.sendLead('L1');
  ck('said no: nothing sent, nothing saved', !SAVED.length && DATA.leads[0].status === 'New');

  /* CDS did not take them */
  reset(); ANSWER = { status: 502, body: { error: 'CDS did not take them: could not reach CDS. Nothing was changed.' } }; global.LAST = null;
  await S.sendLead('L1');
  ck('server refused: lead untouched, shown', DATA.leads[0].status === 'New' && !DATA.leads[0].sent_to_cds && !SAVED.length && /Not sent to Caring CDS: CDS did not take them/.test(ALERTS[0]), ALERTS);

  /* part not finished, then Try again */
  reset(); ANSWER = { status: 200, body: { ok: true, cds: { added: true }, ghl: { done: ['a'], problems: ['out of workflow wf-1: GoHighLevel answered 422'], contact_id: 'C1', workflows_listed: 1 } } };
  await S.sendLead('L1');
  ck('not finished: shown, lead still closed', /Not finished in GoHighLevel: out of workflow wf-1/.test(ALERTS[0]) && DATA.leads[0].status === 'Lost');
  ck('Leads: under not finished, with Try again', /NOT FINISHED \(1\)/.test(S.boardHtml()) && /sendLead\(&quot;L1&quot;,true\)/.test(S.boardHtml()));
  ANSWER = { status: 200, body: { ok: true, cds: { already: { kind: 'sent' } }, ghl: { done: ['a', 'b', 'c'], problems: [], contact_id: 'C1', workflows_listed: 1 } } }; ASKED = [];
  await S.sendLead('L1', true);
  ck('Try again: no question, finished, first send time kept', !ASKED.length && !/NOT FINISHED/.test(S.boardHtml()) && DATA.leads[0].sent_to_cds.tries === 2);

  /* already on CDS */
  reset(); ANSWER = { status: 200, body: { ok: true, cds: { added: false, already: { kind: 'lead', name: 'Ann Lee' } }, ghl: { done: ['a'], problems: [], contact_id: 'C1', workflows_listed: 0 } } };
  await S.sendLead('L1');
  ck('already a CDS lead: said plainly', /already on CDS Leads \(Ann Lee\), so CDS was not sent a second copy/.test(TOASTS[0]) && /no workflows are listed/.test(TOASTS[0]), TOASTS);

  /* a call with no lead */
  reset(); await S.sendCall('msg123456', 'Pat Ray');
  const m = DATA.call_lead_marks[0];
  ck('a call: marked on the call, saved', m && m.verdict === 'cds' && m.by === 'Krystal Smith' && SAVED[0][0] === 'call_lead_marks' && JSON.stringify(LAST.body) === '{"message_id":"msg123456"}', m);
  ck('a call: decided, says sent', S.callDecided('msg123456') && /Sent to Caring CDS \(Krystal\)/.test(S.callHtml('msg123456', 'Medicaid', null, true)));
  ck('a bad call id is ignored', (await S.sendCall('x'), DATA.call_lead_marks.length === 1));

  console.log(`\nsend-to-cds: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
