/* node tests/today-booked-test.js
   Booked today (Samantha, 2026-10-02): "can interviews and booked assessments be on 'Today' ... mark interviews 2pm
   and after as Samantha's interviews". The real btChi / btAfternoonRule / btInterviewsOn / btAssessmentsOn /
   renderTodayBooked / btLoadInterviews / aivSave and the Interviews tab row, cut out of index.html and run against a
   fake database and a fake page. Proves: Chicago day (not the computer's), 2pm cutoff incl. daylight saving, GHL's
   words parsed, one family listed once, cancelled/lost left out, a failed load is SAID on the page, the Settings
   change is recorded, the Interviews tab shows the chip, the 8am wording, no em dashes in the new copy. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return src.slice(a, b); };
const block = cut('const BT_AFTERNOON_DEFAULT', 'function renderToday(){') + cut('async function ccMergeSave(', 'async function tkMerge(');   /* safe saves step 2: settings save one field at a time */
const ivq = cut('function ivqRender(){', '/* The outcome belongs on the person');

let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 700))); };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function world(opts = {}) {
  const els = {}, events = [], upserts = [], q = [];
  const el = (id) => els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', style: {}, disabled: false });
  const table = (name) => {
    const st = { name, f: [] };
    const b = {
      select() { return b }, order() { return b }, in(c, v) { st.f.push(['in', c, v]); return b }, gte(c, v) { st.f.push(['gte', c, v]); return b },
      lt(c, v) { st.f.push(['lt', c, v]); return b }, eq(c, v) { st.f.push(['eq', c, v]); return b },
      maybeSingle() { return Promise.resolve({ data: name === 'app_data' ? { data: JSON.parse(JSON.stringify(opts.ops || {})), version: 3 } : null, error: null }) },
      upsert(row) { upserts.push(row); return Promise.resolve({ error: opts.saveFails ? { message: 'denied' } : null }) },
      then(ok, ko) { q.push(st); let r;
        if (name === 'interview_bookings') r = opts.ivFails ? { data: null, error: { message: 'permission denied for table interview_bookings' } } : { data: opts.bookings || [], error: null };
        else if (name === 'job_applicants') r = { data: (opts.applicants || []).filter((a) => (st.f.find((f) => f[0] === 'in' && f[1] === 'id') || [, , []])[2].includes(a.id)), error: null };
        else r = { data: [], error: null };
        return Promise.resolve(r).then(ok, ko) },
    }; return b };
  const ctx = {
    console, Date: opts.now ? class extends Date { constructor(...a) { super(...(a.length ? a : [opts.now])) } static now() { return opts.now } } : Date, JSON, Promise, Set, Map, String, Array, Object, Number, Error, RegExp, Intl, Math, setTimeout,
    escapeHtmlComms: esc, window: {}, DATA: { ops_settings: opts.ops || null, care_assessments: opts.cas || [], leads: opts.leads || [] },
    document: { getElementById: el }, sb: { from: table, rpc: async (fn, a) => { if (fn !== 'app_data_save') return { error: { message: 'unexpected ' + fn } };
      if (opts.saveFails) return { data: null, error: { message: 'denied' } };
      upserts.push({ key: a.p_key, data: a.p_data, expected: a.p_expected_version }); return { data: { ok: true, version: 4 }, error: null }; } },
    opEvent: (v, o) => events.push([v, o]), gotoTab() {}, AP_ROWS: [], apLoad: async () => {}, apOpenProfile() {}, openLeadProfile() {}, openClient() {}, openAssessmentModal() {},
    IVQ_APP: {}, IVQ_CO: {},
  };
  vm.createContext(ctx);
  vm.runInContext(block + ivq + '\nthis.__x = { btChi, btAfternoonRule, btAfternoonName, btInterviewsOn, btAssessmentsOn, btTime, renderTodayBooked, btLoadInterviews, aivFill, aivSave, ivqRender, setIVQ: (r) => { IVQ = r }, setApp: (m) => { IVQ_APP = m } };', ctx);
  return { X: ctx.__x, els, events, upserts, q, ctx };
}

(async () => {
  const { X } = world();
  // ---- times ----
  ck('btChi: a real timestamp in daylight time (19:00Z = 2:00pm Chicago, CDT)', JSON.stringify(X.btChi('2026-10-02T19:00:00Z')) === JSON.stringify({ date: '2026-10-02', min: 840 }), X.btChi('2026-10-02T19:00:00Z'));
  ck('btChi: in standard time 19:00Z is 1:00pm Chicago (CST), so the label follows the clock on the wall', X.btChi('2026-12-02T19:00:00Z').min === 780, X.btChi('2026-12-02T19:00:00Z'));
  ck('btChi: late evening UTC is still the same Chicago day (04:30Z next day = 11:30pm)', X.btChi('2026-10-03T04:30:00Z').date === '2026-10-02');
  ck('btChi: GHL words ("Friday, October 2, 2026 2:30 PM") read as Chicago time', JSON.stringify(X.btChi('Friday, October 2, 2026 2:30 PM')) === JSON.stringify({ date: '2026-10-02', min: 870 }), X.btChi('Friday, October 2, 2026 2:30 PM'));
  ck('btChi: GHL words at 12:15 PM and 12:05 AM', X.btChi('Friday, October 2, 2026 12:15 PM').min === 735 && X.btChi('Friday, October 2, 2026 12:05 AM').min === 5);
  ck('btChi: a date with no time keeps "no time"', X.btChi('2026-10-02').min === null && X.btTime(null) === 'time not set');
  ck('btTime: 2:00pm, 9:05am', X.btTime(840) === '2:00pm' && X.btTime(545) === '9:05am');
  // ---- the afternoon rule ----
  const R = X.btAfternoonRule(null);
  ck('default rule: from 2pm, Samantha', R.from === '14:00' && R.name === 'Samantha' && R.fromMin === 840, R);
  ck('2:00pm exactly is Samantha\'s; 1:59pm has no name', X.btAfternoonName('2026-10-02T19:00:00Z', R) === 'Samantha' && X.btAfternoonName('2026-10-02T18:59:00Z', R) === '');
  ck('in standard time a 2pm interview (20:00Z) is still Samantha\'s', X.btAfternoonName('2026-12-02T20:00:00Z', R) === 'Samantha');
  const R2 = X.btAfternoonRule({ afternoon_interviews: { from: '15:30', name: 'Krystal' } });
  ck('Settings can change it (3:30pm, Krystal)', X.btAfternoonName('2026-10-02T20:29:00Z', R2) === '' && X.btAfternoonName('2026-10-02T20:30:00Z', R2) === 'Krystal');
  ck('an empty name in Settings means no label at all', X.btAfternoonName('2026-10-02T22:00:00Z', X.btAfternoonRule({ afternoon_interviews: { from: '14:00', name: '' } })) === '');
  // ---- interviews on a day ----
  const bookings = [
    { id: 'b1', applicant_id: 'a1', starts_at: '2026-10-02T19:30:00Z', status: 'booked' },
    { id: 'b2', applicant_id: 'a2', starts_at: '2026-10-02T14:00:00Z', status: 'attended' },
    { id: 'b3', applicant_id: 'a3', starts_at: '2026-10-02T15:00:00Z', status: 'noshow' },
    { id: 'b4', applicant_id: 'a4', starts_at: '2026-10-02T16:00:00Z', status: 'cancelled' },
    { id: 'b5', applicant_id: 'a5', starts_at: '2026-10-03T15:00:00Z', status: 'booked' },
    { id: 'b6', applicant_id: 'a6', starts_at: '2026-10-02T03:00:00Z', status: 'booked' }, // 10pm on Oct 1 in Chicago
  ];
  const apps = [{ id: 'a1', first_name: 'Ava', last_name: 'Afternoon' }, { id: 'a2', first_name: 'Ben', last_name: 'Morning' }, { id: 'a3', first_name: 'Cal', last_name: 'Missed' }];
  const ivs = X.btInterviewsOn('2026-10-02', bookings, apps, R);
  ck('interviews today: Chicago day only, cancelled left out, by time', JSON.stringify(ivs.map((i) => i.id)) === '["b2","b3","b1"]', ivs);
  ck('interviews today: status words booked / done / no-show', JSON.stringify(ivs.map((i) => i.status)) === '["done","no-show","booked"]', ivs);
  ck('interviews today: only the 2:30pm one is Samantha\'s', JSON.stringify(ivs.map((i) => i.who)) === '["","","Samantha"]' && ivs[2].name === 'Ava Afternoon', ivs);
  // ---- assessments on a day ----
  const leads = [
    { id: 'L1', first_name: 'Dana', last_name: 'Daughter', client_first_name: 'Mae', client_last_name: 'Mom', assessment_at: 'Friday, October 2, 2026 10:00 AM', status: 'Assessment Scheduled', client_address: '1 Elm St, Nixa' },
    { id: 'L2', first_name: 'Eli', last_name: 'Ghl', assessment_at: 'Friday, October 2, 2026 1:00 PM', status: 'Assessment Scheduled' },
    { id: 'L3', first_name: 'Fay', last_name: 'Lost', assessment_at: 'Friday, October 2, 2026 3:00 PM', status: 'Lost' },
    { id: 'L4', first_name: 'Gus', last_name: 'Tomorrow', assessment_at: 'Saturday, October 3, 2026 9:00 AM', status: 'Assessment Scheduled' },
  ];
  const cas = [
    { id: 'A1', lead_id: 'L1', client_name: 'Mae Mom', visit_date: '2026-10-02', coordinator: 'Krystal', address: '1 Elm St, Nixa', status: 'Scheduled' },
    { id: 'A2', client_name: 'Hal Reassess', visit_date: '2026-10-02', coordinator: 'Angiel', address: '', status: 'Completed — Awaiting Plan', axiscare_client_id: '77' },
    { id: 'A3', client_name: 'Ivy Cancelled', visit_date: '2026-10-02', status: 'cancelled' },
  ];
  const as = X.btAssessmentsOn('2026-10-02', cas, leads);
  ck('assessments today: Hub visits + GHL bookings, same family once, lost and other days left out', JSON.stringify(as.map((a) => a.name)) === '["Mae Mom","Eli Ghl","Hal Reassess"]', as);
  ck('assessments today: a Hub visit with no time borrows the booked time (10:00am); one with none says so', as[0].min === 600 && as[2].min === null, as);
  ck('assessments today: address and who is going when stored; a GHL booking has neither', as[0].address === '1 Elm St, Nixa' && as[0].who === 'Krystal' && as[1].who === '' && as[1].address === '', as);
  ck('assessments today: a visit already written up shows done', as[2].status === 'done' && as[0].status === 'booked');

  // ---- the Today card, with the real loader against a fake database ----
  const NOW = Date.parse('2026-10-02T13:00:00Z')   // 8am Chicago on Friday Oct 2 (the page's "today" is pinned here)
  let W = world({ bookings, applicants: apps, cas, leads, now: NOW });
  W.X.renderTodayBooked();
  ck('Today: shows "Loading" for interviews first and the assessments at once', /Loading today/.test(W.els.todayBooked.innerHTML) && /Assessments today \(3\)/.test(W.els.todayBooked.innerHTML), W.els.todayBooked.innerHTML.slice(0, 300));
  await new Promise((r) => setTimeout(r, 20));
  const html = W.els.todayBooked.innerHTML;
  ck('Today: "Interviews today (3)" with time, name, status chip and the Samantha chip on the 2:30pm one only', /Interviews today \(3\)/.test(html) && /<b>2:30pm<\/b> · Ava Afternoon <span class="hero-badge"[^>]*>booked<\/span> <span class="hero-badge"[^>]*>Samantha&#39;s interview<\/span>/.test(html) && (html.match(/Samantha&#39;s interview/g) || []).length === 1, html);
  ck('Today: no-show and done chips', />no-show</.test(html) && />done</.test(html));
  ck('Today: tapping an interview opens the applicant; an assessment opens its record', /btOpenApplicant\('a1'\)/.test(html) && /btOpenAssessment\(0\)/.test(html));
  ck('Today: assessment rows say address and who, or that they are not on file', /1 Elm St, Nixa · with Krystal/.test(html) && /address not on file · who is going is not on file/.test(html), html);
  const ivq = W.q.find((s) => s.name === 'interview_bookings');
  ck('Today: the interview query asks a window around the Chicago day (and the page filters to the day)', ivq && ivq.f.some((f) => f[0] === 'gte') && ivq.f.some((f) => f[0] === 'lt'), ivq);

  W = world({ ivFails: true, cas, leads, now: NOW });
  W.X.renderTodayBooked(); await new Promise((r) => setTimeout(r, 20));
  ck('NO SILENT FAILURES: a failed interview load is said on Today, with the reason', /Could not load today's interviews: permission denied/.test(W.els.todayBooked.innerHTML) && /Assessments today \(3\)/.test(W.els.todayBooked.innerHTML), W.els.todayBooked.innerHTML.slice(0, 400));

  W = world({ bookings: [], cas: [], leads: [] });
  W.ctx.__x.renderTodayBooked(); await new Promise((r) => setTimeout(r, 20));
  ck('Today: empty days say so', /No interviews booked today\./.test(W.els.todayBooked.innerHTML) && /No assessments booked today\./.test(W.els.todayBooked.innerHTML));

  // ---- Settings ----
  W = world({ ops: { morning_brief_recipients: [{ email: 'x@mo-care.com' }] } });
  W.X.aivFill();
  ck('Settings: shows the defaults until saved (14:00, Samantha)', W.els.set_aiv_from.value === '14:00' && W.els.set_aiv_name.value === 'Samantha');
  W.els.set_aiv_from.value = '15:00'; W.els.set_aiv_name.value = 'Krystal';
  await W.X.aivSave(null);
  const up = W.upserts[0];
  ck('Settings: saves into ops_settings and keeps everything else there (compare-and-save on the version it read)', up && up.key === 'ops_settings' && up.expected === 3 && up.data.afternoon_interviews.from === '15:00' && up.data.afternoon_interviews.name === 'Krystal' && up.data.morning_brief_recipients.length === 1, up);
  ck('Settings: the change is recorded (config_changed, before and after)', W.events.length === 1 && W.events[0][0] === 'config_changed' && /from 2:00pm Samantha to from 3:00pm Krystal/.test(W.events[0][1].summary), W.events);
  ck('Settings: says what it saved', /Interviews from 3:00pm on are marked Krystal&#39;s|Interviews from 3:00pm on are marked Krystal's/.test(W.els.aivStatus.textContent), W.els.aivStatus.textContent);
  W = world({ saveFails: true }); W.els.set_aiv_from = { value: '14:00' }; W.els.set_aiv_name = { value: 'Samantha' };
  await W.X.aivSave(null);
  ck('Settings: a failed save says so and records nothing', /Could not save: denied/.test(W.els.aivStatus.textContent) && !W.events.length, W.els.aivStatus.textContent);

  // ---- the Interviews tab ----
  W = world();
  W.X.setIVQ([{ applicant_id: 'a1', starts_at: '2030-06-14T19:30:00Z', status: 'booked' },
    { applicant_id: 'a2', starts_at: '2030-06-14T15:00:00Z', status: 'booked' }]);
  W.X.setApp({ a1: { first_name: 'Ava' }, a2: { first_name: 'Ben' } });
  W.X.ivqRender();
  const ih = W.els.ivqList.innerHTML;
  const iA = ih.indexOf('Ava'), iC = ih.indexOf('Samantha&#39;s interview'), iB = ih.indexOf('Ben');
  ck('Interviews tab: the afternoon row carries "Samantha\'s interview", the morning row does not', (ih.match(/Samantha&#39;s interview/g) || []).length === 1 && iA < iC && iC < iB, ih.slice(0, 600));

  // ---- wording ----
  ck('8am: Settings, the save message and What runs by itself say 8am; no 6:45 left', /<b>8am Central on workdays<\/b>/.test(src) && /go out at 8am\./.test(src) && /when: 'Every weekday at 8am Central'/.test(src) && !/6:45/.test(src));
  ck('the activity form no longer claims activities are in the email (they never were)', !/7 AM email/.test(src));
  ck('Today has the booked-today mount under the hero and renderToday paints it', /<div id="todayHero"><\/div>\s*<!--[^>]*-->\s*<div id="todayBooked"><\/div>/.test(src) && /try\{ renderTodayBooked\(\); \}catch\(e\)\{\}/.test(src));
  const added = block + cut('<h3>🕑 Afternoon interviews</h3>', '<h3>Cadences</h3>') + cut("{ name: 'The Morning Brief',", "{ name: 'A backup of the whole hub',");
  ck('no em dashes in the new copy (the one in the old assessment status word is data, not copy)', !added.replace(/Completed — Awaiting Plan/g, '').includes('—'));
  ck('never "plain language"', !/plain (language|english)/i.test(added));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
