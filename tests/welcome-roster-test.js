/* node tests/welcome-roster-test.js
   Welcome call done -> caregiver roster (Samantha, 2026-10-02). The real wcAct / wcAddToRoster / wcRosterMsg /
   wcRosterAdd / wcOrientCall / wcRowFor / cgRecordFromCandidate / promoteToCaregiver, cut out of caregivers-engine.js
   and run against fakes. Proves: done adds them to the roster with today's Central hire date and orient_date '' (never
   marked trained), carries offer/intake/step 2/welcome call ids, removes the B&R record ONLY after the roster saved;
   a failed save keeps the candidate, rolls back the local add and says so; a second press never adds twice; the
   Send orientation link retry still finds offer id, phone and email through the roster record; the 2c gate treats
   them as a new hire; the office 🎓 Promote is unchanged (orient_date = hire date). Plus the Orientations tab layout. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return src.slice(a, b); };
const code = [
  cut('const WC_MEET =', 'async function wcWho('),
  cut('function wcResult(', '/* ── Caregiver profile (part 2'),
  cut('const WC_GUIDE =', 'async function wcNotes('),
  cut('async function wcAct(', 'function renderOrientReadyQueue('),
  cut('function cgRecordFromCandidate(', 'function closeOutCandidate('),
].join('\n');

let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 700))); };

/* Today in Central, worked out independently of the engine. */
const todayCentral = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

function world(opts = {}) {
  const log = [], alerts = [], fetches = [], local = {};
  const cand = { id: 41, first: 'Ava', last: 'Applicant', phone: '417-555-0199', email: 'ava@x.com', offer_id: 'offer-uuid-1', intake_id: 'intake-9', r1n: 'Ref One', r1s: 'Positive',   /* the real reference list (caregiver-connect-rules.js) carries it */
    position: 'Caregiver', step2_sent_at: '2026-10-01T14:00:00Z', step2_sent_by: 'angiel@mo-care.com', step2_done_at: '2026-10-01T15:00:00Z', step2_done_by: 'angiel@mo-care.com',
    welcome_call_id: 'w1', welcome_invited_at: '2026-10-01T16:00:00Z', oos: 'no', oig: 'Clear', oig_date: '2026-09-20', edl: 'Clear', edl_date: '2026-09-20',
    fcsr: 'Clear', fcsr_date: '2026-09-21', fp: 'N/A', orient_session_date: '' };
  const ctx = {
    console, Date, JSON, Promise, Set, String, Array, Object, Number, Error, RegExp, Intl,
    candidates: opts.noCandidate ? [] : [cand],
    caregivers: (opts.roster || []).slice(), cgId: 100, safeTmpId: (() => { let n = -1; return () => n--; })(), safeIsTmp: (id) => typeof id === 'number' && id < 0,   /* 421: temporary numbers until the database gives the real one */
    obPrehireRefs: () => [{ slot: 1, name: 'Ref One' }], hiringSnapshot: (c) => ({ frozen_for: c.id }),
    localStorage: { setItem(k, v) { local[k] = v; } },
    TRAINING_HUB_ANON: 'training-anon',
    window: { trainHubTok: async () => 'staff-hub-token' },
    CGP2: { isLive: () => true, rowFor: () => ({}) },
    confirm: (m) => { log.push(['confirm', m]); return opts.confirm !== false; },
    alert: (m) => { alerts.push(m); },
    wcCall: async (b) => { log.push(['welcome-call', b.action]); return {}; },
    wcLoad: async () => { log.push(['wcLoad']); },
    saveCaregivers: async () => { log.push(['saveCaregivers', ctx.caregivers.length]); if (opts.saveThrows) throw new Error('quota'); return !opts.saveFails; },
    saveCandidates: async () => { log.push(['saveCandidates', ctx.candidates.length]); },
    renderOB: () => {}, renderTR: () => {}, renderAC: () => {}, renderWelcomeCalls: () => { log.push(['render']); }, cgpBtnHtml: () => '',
    fetch: async (url, o) => { fetches.push({ url, body: JSON.parse(o.body) }); log.push(['training']);
      return { ok: true, status: 200, json: async () => ({ status: 'sent', sms: true, email: true, not_sent: [], offer_linked: true, offer_note: '' }) }; },
  };
  ctx.window.CGP2 = ctx.CGP2;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'caregiver-connect-rules.js'), 'utf8'), ctx);   /* the one copy the engine's hire record comes from */
  vm.runInContext(code + '\nthis.__x = { wcAct, wcAddToRoster, wcRosterMsg, wcRosterAdd, wcOrientLink, wcSrcFor, wcRowFor, wcNeedsRoster, promoteToCaregiver, WC_GUIDE, setRows: r => { WC_ROWS = r; } };', ctx);
  const X = ctx.__x;
  X.setRows([{ id: 'w1', candidate_id: '41', first_name: 'Ava', last_name: 'Applicant', phone: '(417) 555-0100', email: 'ava@x.com', status: 'booked', starts_at: '2026-10-06T15:00:00Z',
    i9_checked: true, app_setup: true, profile_reviewed: true, photo_link_sent: true }]);
  return { X, ctx, log, alerts, fetches, cand };
}

(async () => {
  // ---- done: roster add, then the link ----
  let W = world();
  await W.X.wcAct('w1', 'done', '', null);
  const g = W.ctx.caregivers[0] || {};
  ck('done: added to the caregiver roster once', W.ctx.caregivers.length === 1 && String(g.candidate_id) === '41', W.ctx.caregivers);
  ck('done: hire date is today in Central, promoted_at now', g.hire_date === todayCentral && g.prehire.hired_at === todayCentral && Math.abs(Date.now() - Date.parse(g.promoted_at)) < 60000, [g.hire_date, todayCentral]);
  ck('done: orient_date and alz_date are EMPTY (orientation is online after this, never marked trained)', g.orient_date === '' && g.alz_date === '', g);
  ck('done: phone, email, checks, prehire and hiring snapshot carried like Promote', g.phone === '417-555-0199' && g.email === 'ava@x.com' && g.oig_status === 'Clear' && g.oig_date === '2026-09-20'
     && g.fcsr_date === '2026-09-21' && g.fp === 'N/A' && g.prehire.oig.status === 'Clear' && g.prehire.refs[0].name === 'Ref One' && g.hiring_snapshot.frozen_for === 41, g);
  ck('done: offer id, intake id, step 2 and welcome call fields carried', g.offer_id === 'offer-uuid-1' && g.intake_id === 'intake-9' && g.step2_done_at === '2026-10-01T15:00:00Z'
     && g.step2_sent_by === 'angiel@mo-care.com' && g.welcome_call_id === 'w1' && g.welcome_invited_at && g.position === 'Caregiver' && g.promoted_via === 'welcome_call', g);
  ck('done: the B&R record is removed only AFTER the roster saved', W.ctx.candidates.length === 0
     && W.log.findIndex((l) => l[0] === 'saveCaregivers') < W.log.findIndex((l) => l[0] === 'saveCandidates'), W.log);
  const order = W.log.filter((l) => ['welcome-call', 'saveCaregivers', 'training'].includes(l[0])).map((l) => l[0]);
  ck('done: order is mark done, then roster, then orientation link', JSON.stringify(order) === '["welcome-call","saveCaregivers","training"]', order);
  ck('done: no extra confirm (just the done question) and one message', W.log.filter((l) => l[0] === 'confirm').length === 1 && W.alerts.length === 1, W.log);
  const label = (() => { const m = todayCentral.split('-'); return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m[1] - 1] + ' ' + (+m[2]) + ', ' + m[0]; })();
  ck('done: the message says "Added to the caregiver roster (hire date ' + label + ')." between done and the link', W.alerts[0].startsWith('Welcome call marked done.\n\nAdded to the caregiver roster (hire date ' + label + ').\n\nOrientation link sent by text and email.'), W.alerts[0]);
  const f = W.fetches[0] || { body: {} };
  ck('done: the link call still has the offer id and both phones, captured before the move', f.body.offer_id === 'offer-uuid-1' && f.body.phone === '(417) 555-0100' && JSON.stringify(f.body.phones) === '["417-555-0199"]' && f.body.email === 'ava@x.com', f.body);

  // ---- idempotent ----
  W.alerts.length = 0;
  const again = await W.X.wcAddToRoster({ id: 'w1', candidate_id: '41' });
  ck('second press: nobody added twice, said plainly', W.ctx.caregivers.length === 1 && again.status === 'already' && W.X.wcRosterMsg(again) === 'Already on the caregiver roster (hire date ' + label + ').', [again, W.ctx.caregivers.length]);
  const pre = world({ roster: [{ id: 7, first: 'Ava', last: 'Applicant', candidate_id: 41, hire_date: '2026-09-30', orient_date: '2026-09-30' }] });
  const r2 = await pre.X.wcAddToRoster({ id: 'w1', candidate_id: '41' });
  ck('already promoted at an office session: no second record, the old one untouched', r2.status === 'already' && pre.ctx.caregivers.length === 1 && pre.ctx.caregivers[0].orient_date === '2026-09-30', r2);
  const gone = world({ noCandidate: true });
  const r3 = await gone.X.wcAddToRoster({ id: 'w1', candidate_id: '41' });
  ck('no candidate and nobody on the roster: nothing added, said (not silent)', r3.status === 'no_candidate' && !gone.ctx.caregivers.length && /Not added to the caregiver roster/.test(gone.X.wcRosterMsg(r3)), r3);

  // ---- save failure ----
  W = world({ saveFails: true });
  await W.X.wcAct('w1', 'done', '', null);
  ck('save fails: the candidate is KEPT, the local roster add is undone, B&R not re-saved', W.ctx.candidates.length === 1 && W.ctx.caregivers.length === 0 && !W.log.some((l) => l[0] === 'saveCandidates'), [W.ctx.candidates.length, W.ctx.caregivers.length]);
  ck('save fails: the office is told, with what to press', /NOT added to the caregiver roster: the save did not reach the shared workspace/.test(W.alerts[0]) && /still in Background & References/.test(W.alerts[0]) && /Add to caregiver roster/.test(W.alerts[0]), W.alerts);
  ck('save fails: the call stays done and the orientation link still goes', /^Welcome call marked done\./.test(W.alerts[0]) && W.fetches.length === 1, W.alerts);
  ck('save fails: the Done recently row offers Add to caregiver roster', W.X.wcNeedsRoster({ candidate_id: '41' }) === true);
  W = world({ saveThrows: true });
  await W.X.wcAct('w1', 'done', '', null);
  ck('save throws: same, candidate kept and the reason shown', W.ctx.candidates.length === 1 && /NOT added to the caregiver roster.*\(quota\)/.test(W.alerts[0]), W.alerts);

  // ---- the retry / catch-up button ----
  W = world();
  await W.X.wcRosterAdd('w1', null);
  ck('Add to caregiver roster button: asks, adds once, says it', W.log.some((l) => l[0] === 'confirm') && W.ctx.caregivers.length === 1 && /^Added to the caregiver roster \(hire date/.test(W.alerts[0]) && W.X.wcNeedsRoster({ candidate_id: '41' }) === false, W.alerts);
  W = world({ confirm: false });
  await W.X.wcRosterAdd('w1', null);
  ck('Add to caregiver roster button: Cancel changes nothing', W.ctx.caregivers.length === 0 && W.ctx.candidates.length === 1);

  // ---- after the move: lookups fall back to the roster record ----
  W = world();
  await W.X.wcAct('w1', 'done', '', null);
  W.fetches.length = 0; W.alerts.length = 0;
  await W.X.wcOrientLink('w1', null);
  const rf = (W.fetches[0] || { body: {} }).body;
  ck('retry Send orientation link after the move: offer id, phone and email found through the roster', rf.offer_id === 'offer-uuid-1' && rf.phones.includes('417-555-0199') && rf.email === 'ava@x.com', rf);
  const s = W.X.wcSrcFor('41');
  ck('wcSrcFor falls back to the roster record by candidate id', s && s.intake_id === 'intake-9' && s.first === 'Ava');
  ck('wcRowFor finds the welcome call from the roster record', (W.X.wcRowFor(W.ctx.caregivers[0]) || {}).id === 'w1');

  // ---- 2c gate: a new hire ----
  require('../eligibility-rules.js');
  const E = globalThis.CCElig, gate = E.profileGate;
  const rec = W.ctx.caregivers[0];
  const pg = gate(Object.assign({}, rec, { profile_published: false }));
  ck('2c gate: hire date today makes them a new hire (blocked until the profile is published)', pg.new_hire && pg.blocked, pg);
  ck('2c gate: published profile clears them', !gate(Object.assign({}, rec, { profile_published: true })).blocked);
  const el = E.eligibility(Object.assign({}, rec, { profile_published: true }));
  ck('not cleared to work: orientation is not done yet (orient_date empty)', el.state === 'not_eligible' && el.blockers.some((b) => b.code === 'orientation') && el.blockers.some((b) => b.code === 'alz'), el);

  // ---- office Promote unchanged ----
  W = world();
  W.cand.orient_session_date = '2026-10-01';
  await W.X.promoteToCaregiver(41);   // 421: async (waits for the roster save before removing the candidate)
  const pr = W.ctx.caregivers[0] || {};
  ck('office Promote: still asks, orient_date = hire date = the session date, candidate removed', W.log.some((l) => l[0] === 'confirm' && /Promote Ava Applicant/.test(l[1])) && pr.hire_date === '2026-10-01' && pr.orient_date === '2026-10-01' && W.ctx.candidates.length === 0, pr);
  ck('office Promote: no welcome-call extras (only the pipeline links offer_id/intake_id travel)', pr.promoted_via === undefined && pr.welcome_call_id === undefined && pr.step2_done_at === undefined && pr.offer_id === 'offer-uuid-1' && pr.intake_id === 'intake-9', pr);

  // ---- guide and layout ----
  const G = W.X.WC_GUIDE;
  ck('guide: one line says done adds them to the roster and Training and Compliance track them', /Pressing done also adds them to the caregiver roster \(hire date today\)\. Training and Compliance then track their orientation and dementia training\./.test(G));
  const tab = html.slice(html.indexOf('<section class="tabpanel" id="tab-cgorient">'), html.indexOf('<section class="tabpanel" id="tab-cgtraining">'));
  ck('tab: the old "How This Tab Works" guide is gone', !/How This Tab Works/.test(tab) && !/guide-body-orient"/.test(tab));
  const iWc = tab.indexOf('id="wc-section"'), iReady = tab.indexOf('id="orient-ready-queue"'), iOffice = tab.indexOf('id="orient-office"');
  ck('tab: welcome calls, then Ready for Orientation, then the office section at the bottom', iWc > 0 && iWc < iReady && iReady < iOffice, [iWc, iReady, iOffice]);
  const office = tab.slice(iOffice);
  ck('tab: the office section holds the settings, the calendar and the sessions list, all old ids kept',
    ['guide-body-orient-cfg', 'orient-schedule-days', 'orient-gen-weeks', 'orient-cfg-save-btn', 'cal-days', 'cal-month-label', 'or-stats', 'or-sessions-list', 'pts-past'].every((id) => office.includes('id="' + id + '"')));
  ck('tab: titled "🏢 Office orientation (backup only)", closed by default, toggled by SCX.toggleOfficeOrient',
    /<span class="tab-guide-title"[^>]*>🏢 Office orientation \(backup only\)<\/span>/.test(office) && /class="tab-guide-body" id="guide-body-orient-office">/.test(office) && /onclick="SCX\.toggleOfficeOrient\(\)"/.test(office));
  ck('tab: the intro line, exactly', office.includes('Most new hires do orientation from home after their welcome call. Use this only when someone needs to come into the office: set up a session here, then use <b>📅 In the office instead</b> on their row. After the session, mark attendance and press <b>🎓 Promote</b> for anyone who attended.'));
  ck('engine: toggleOfficeOrient is on SCX and redraws the calendar and sessions when opened', /toggleGuide, toggleOfficeOrient,/.test(src) && /function toggleOfficeOrient\(\)\{[\s\S]{0,300}renderCalendar\(\); renderSessionsList\(\)/.test(src));
  const newCopy = office.slice(0, office.indexOf('Orientation Settings') + 60) + cut('/* ── Welcome call done -> caregiver roster', 'function renderOrientReadyQueue(') + G;
  ck('no em dash in the new copy', !/—/.test(newCopy), (newCopy.match(/.{40}—.{40}/) || [''])[0]);

  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
