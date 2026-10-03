/* node tests/evv-forms-test.js        (EVV_FORM_SRC=<path to Staffing evv-correction-form.html> to compare wording)
   422 (2026-10-03): the completed EVV correction form, viewed whole by the office.
   Proves: the view page reproduces the caregiver's form (same sections, headings, order, wording) with every answer
   and both signatures, a print button and print-only layout; not signed in / no access / not found / load errors are
   said; the pickers only SUGGEST (nothing is linked until Confirm); Accept & Log saves who it is for + the log entry
   with its submission_id; Dismiss is recorded; Past forms list + search; older log entries open their form only when
   exactly one form fits; both profiles list the linked forms; the AxisCare helper checks read-only and says every
   outcome; no em dashes in new words. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 700))); };
const html = fs.readFileSync(path.join(ROOT, 'evv-form.html'), 'utf8');
const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const lib = fs.readFileSync(path.join(ROOT, 'evv-forms.js'), 'utf8');
require(path.join(ROOT, 'evv-forms.js'));
const F = globalThis.EVVF;
const PNG1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const PNG2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const SUB = { id: '6f1c2d3e-4a5b-4c6d-8e7f-001122334455', attendant: 'Sarah Thomas', consumer: 'Mary Jones', visitdate: '2026-09-28', submitdate: '2026-09-29',
  orig_in: '08:07', orig_out: null, new_in: '08:00', new_out: '14:00', reason: 'Phone was dead / no battery',
  tasks: F.TASKS[0] + '; ' + F.TASKS[2] + '; ' + F.TASKS[6], notes: 'My phone died before I could clock out.\nI left at 2pm.',
  sig_attendant: PNG1, sig_consumer: PNG2, processed: true, processed_by: 'krystal@mo-care.com', processed_at: '2026-09-29T15:04:00Z', submitted_at: '2026-09-29T02:31:00Z',
  outcome: 'accepted', caregiver_axiscare_id: '77', caregiver_linked_name: 'Sarah Thomas', client_axiscare_id: '501', client_linked_name: 'Mary Jones', linked_by: 'krystal@mo-care.com', linked_at: '2026-09-29T15:04:00Z' };

/* ── 1. the view page, rendered from a fixture ── */
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
globalThis.__EVV_TEST__ = true;
vm.runInThisContext(inline[inline.length - 1]);
const P = globalThis.EVVPAGE;
const out = P.render(SUB, { log: null });
const has = s => out.includes(s);
ck('view: the six sections, in the form\'s order, with the form\'s headings',
  ['👤 1. You &amp; Your Client', '📅 2. Visit Details', '❓ 3. Reason for Correction', '📝 4. What Happened', '✍️ 5. Caregiver Signature', '👤 6. Client Signature (required)']
    .map(t => out.indexOf(t)).every((i, k, a) => i > 0 && (k === 0 || i > a[k - 1])));
ck('view: header, deadline banner and the fraud notice as the caregiver saw them', has('<h1>EVV Correction Form</h1>') && has('Caring Companions In-Home Senior Care')
  && has('Corrections must be submitted by Sunday Midnight of the pay period in which the visit occurred.') && has('Falsifying EVV records is fraud'));
ck('view: every answer is filled in (names, dates, original + corrected times, notes)', has('>Sarah Thomas<') && has('>Mary Jones<') && has('>09/28/2026<') && has('>09/29/2026<')
  && has('>8:07 AM<') && has('>8:00 AM<') && has('>2:00 PM<') && has('My phone died before I could clock out.\nI left at 2pm.'));
ck('view: a blank answer says so (original clock-out was left blank)', (out.match(/\(left blank\)/g) || []).length === 1);
const taskOn = F.TASKS.map(t => new RegExp('<div class="task-item on"><input type="checkbox" disabled checked aria-label="' + F.esc(t).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '"').test(out));
ck('view: all 7 tasks listed, exactly the 3 the caregiver ticked are checked', (out.match(/class="task-item/g) || []).length === 7 && taskOn.join() === 'true,false,true,false,false,false,true', taskOn);
ck('view: all 7 reasons listed, the chosen one selected', (out.match(/class="reason-item/g) || []).length === 7 && (out.match(/reason-item selected/g) || []).length === 1
  && /reason-item selected"><input type="radio" disabled checked> Phone was dead or had no battery/.test(out));
ck('view: BOTH signatures shown as images, from the saved form', out.includes('<img alt="Caregiver signature" src="' + PNG1 + '">') && out.includes('<img alt="Client signature" src="' + PNG2 + '">'));
ck('view: the print button (window.print) and the way back to the Hub', has('onclick="window.print()">🖨 Print / Save as PDF</button>') && has('href="./">← Back to the Hub'));
ck('view: office record: submitted date and time (Central), accepted by whom and when, the linked caregiver and client',
  has('Sep 28, 2026, 9:31 PM') && has('(Central)') && has('Accepted and logged') && has('krystal@mo-care.com on Sep 29, 2026, 10:04 AM') && has('Sarah Thomas · AxisCare #77') && has('Mary Jones · AxisCare #501'));
const oth = P.render(Object.assign({}, SUB, { reason: 'My car broke down', sig_consumer: 'javascript:alert(1)', processed: false, outcome: null, client_axiscare_id: null }), {});
ck('view: a typed "Other" reason shows Other selected and the explanation', /reason-item selected"><input type="radio" disabled checked> Other \(explain below\)/.test(oth) && oth.includes('>My car broke down<'));
ck('view: anything but a real image is never drawn as a signature; it says none was saved', !oth.includes('javascript:') && oth.includes('No signature was saved with this form.'));
ck('view: a waiting form says so; an unlinked one says not linked yet', oth.includes('Waiting for the office') && oth.includes('not linked yet'));
ck('view: dismissed shows Dismissed by', P.render(Object.assign({}, SUB, { outcome: 'dismissed' }), {}).includes('Dismissed by'));
const legacy = Object.assign({}, SUB, { outcome: null });
const logOne = [{ id: '1', attendant: 'sarah thomas', consumer: 'Mary  Jones', visitdate: '2026-09-28', newIn: '08:00', newOut: '14:00' }];
ck('view: an older processed form is "Accepted and logged" when exactly one log entry fits, else honest "most likely dismissed"',
  P.render(legacy, { log: logOne }).includes('Accepted and logged') && P.render(legacy, { log: [] }).includes('most likely dismissed') && P.render(legacy, { log: null }).includes('>Processed<'));
const xss = P.render(Object.assign({}, SUB, { attendant: '<img src=x onerror=alert(1)>', notes: '"><script>x()</script>' }), {});
ck('view: everything typed on the public form is escaped', !xss.includes('<img src=x') && !xss.includes('<script>x()'));
const css = (html.match(/@media print\{([\s\S]*?)\n\}/) || [])[1] || '';
ck('view: print layout: no toolbar, no AxisCare helper, letter page, sections never split', /\.toolbar,\.axwrap\{display:none!important\}/.test(css) && /@page\{size:letter/.test(css) && /break-inside:avoid/.test(css));
ck('view: staff only: it reads with the signed-in session, checks Care Coordinator Hub access, never the public key alone',
  /getSession\(\)/.test(inline[inline.length - 1]) && /hub_access/.test(inline[inline.length - 1]) && /HUB_SLUG = 'care_coordinator'/.test(inline[inline.length - 1]) && /<meta name="robots" content="noindex/.test(html));

/* the form's own wording, compared with the live public form */
const SRC = process.env.EVV_FORM_SRC || [path.join(ROOT, '../staffing/evv-correction-form.html'), path.join(ROOT, '../../Staffing-Coordinator-Hub/evv-correction-form.html'), '/Users/samantha/Claude/Projects/Staffing-Coordinator-Hub/evv-correction-form.html'].find(p => fs.existsSync(p));
if (SRC) {
  const form = fs.readFileSync(SRC, 'utf8');
  const titles = [...form.matchAll(/<div class="section-title">([\s\S]*?)<\/div>/g)].map(m => m[1].trim());
  ck('wording: the section titles are the public form\'s, in order (' + path.basename(path.dirname(SRC)) + ')', titles.length === 6 && titles.map(t => out.indexOf(t)).every((i, k, a) => i > 0 && (k === 0 || i > a[k - 1])), titles);
  const labels = [...form.matchAll(/<label>([\s\S]*?)<\/label>/g)].map(m => m[1].trim()).filter(l => !/Explain the reason/.test(l));
  ck('wording: every field label of the public form appears', labels.length >= 10 && labels.every(l => out.includes(l)), labels.filter(l => !out.includes(l)));
  const tvals = [...form.matchAll(/name="tasks" value="([^"]*)"/g)].map(m => m[1]);
  ck('wording: the 7 task boxes are identical (value and words)', JSON.stringify(tvals) === JSON.stringify(F.TASKS), tvals);
  const rs = [...form.matchAll(/name="reason" value="([^"]*)">\s*([^<]*)<\/label>/g)].map(m => [m[1], m[2].trim()]);
  ck('wording: the 7 reasons are identical (value and words)', JSON.stringify(rs) === JSON.stringify(F.REASONS), rs);
  const ws = t => t.replace(/\s+/g, ' ').trim();
  const para = s => ws((form.match(new RegExp(s + '[^<]*')) || [''])[0]);
  ck('wording: the signature and client paragraphs are the form\'s, word for word', ws(out).includes(para('By signing below, I certify')) && ws(out).includes(para('The client\'s signature confirms')) && para('The client\'s signature confirms').length > 150, [para('By signing below, I certify'), para('The client\'s signature confirms')]);
} else console.log('(the public form was not found next to this repo: wording comparison skipped)');

/* ── 2. the page's sign-in, access, not-found and error paths ── */
function page() { return { innerHTML: '' }; }
const client = (o) => ({ auth: { getSession: async () => o.session === undefined ? { data: { session: { access_token: 't', user: { app_metadata: { hub_access: ['care_coordinator'] } } } } } : { data: { session: o.session } } },
  from: (t) => { const b = { select() { return b; }, eq() { return b; }, maybeSingle: async () => t === 'app_data' ? { data: { data: o.log || [] }, error: null } : (o.err ? { data: null, error: o.err } : { data: o.row === undefined ? SUB : o.row, error: null }) }; return b; } });
(async () => {
  const lib0 = { createClient() {} };
  let pg = page(); await P.boot({ page: pg, search: '', supabase: lib0, sb: client({}) });
  ck('page: no form chosen is said', pg.innerHTML.includes('No form was chosen'));
  pg = page(); await P.boot({ page: pg, search: '?id=' + SUB.id, supabase: lib0, sb: client({ session: null }) });
  ck('page: not signed in: "Sign in first", nothing read', pg.innerHTML.includes('Sign in first') && pg.innerHTML.includes('signed-in office staff only'));
  pg = page(); await P.boot({ page: pg, search: '?id=' + SUB.id, supabase: lib0, sb: client({ session: { user: { app_metadata: { hub_access: ['team_hub'] } } } }) });
  ck('page: signed in without Care Coordinator Hub access: refused, said', pg.innerHTML.includes('Your account cannot open this'));
  pg = page(); await P.boot({ page: pg, search: '?id=' + SUB.id, supabase: lib0, sb: client({ row: null }) });
  ck('page: not found is said', pg.innerHTML.includes('Form not found') && pg.innerHTML.includes('No EVV correction form with this number'));
  pg = page(); await P.boot({ page: pg, search: '?id=nonsense', supabase: lib0, sb: client({ err: { code: '22P02', message: 'invalid input syntax for type uuid' } }) });
  ck('page: a broken form number is "Form not found"', pg.innerHTML.includes('Form not found'));
  pg = page(); await P.boot({ page: pg, search: '?id=' + SUB.id, supabase: lib0, sb: client({ err: { code: '42501', message: 'permission denied for table evv_submissions' } }) });
  ck('page: a load error is said with its reason', pg.innerHTML.includes('The form could not be loaded') && pg.innerHTML.includes('permission denied'));
  pg = page(); const ax = { innerHTML: '' }; const calls = [];
  const fakeFetch = async (url, o) => { calls.push({ url, body: JSON.parse(o.body), auth: o.headers.Authorization }); return { ok: true, status: 200, json: async () => ({ ok: true, outcome: 'match', seen: '08:00-14:00', want: { in: '08:00', out: '14:00' }, visit: { id: 's=3:d=2026-09-28', scheduled: '8:00 AM to 2:00 PM' }, checked_at: '2026-10-01T15:00:00Z', done_at: '2026-10-01T15:00:00Z' }) }; };
  await P.boot({ page: pg, search: '?id=' + SUB.id, supabase: lib0, sb: client({}), axbox: ax, fetch: fakeFetch });
  ck('page: success renders the whole form', pg.innerHTML.includes('✍️ 5. Caregiver Signature') && pg.innerHTML.includes(PNG2));
  ck('page: opening a linked form checks AxisCare automatically (with the staff sign-in) and says the answer',
    calls.length === 1 && /evv-axiscare-check$/.test(calls[0].url) && calls[0].body.submission_id === SUB.id && calls[0].auth === 'Bearer t' && ax.innerHTML.includes('✅ Done in AxisCare: the visit shows 8:00 AM to 2:00 PM'), [calls, ax.innerHTML.slice(0, 300)]);
  ck('page: the helper: open the client in AxisCare, copy date / clock-in / clock-out / reason / tasks, Check AxisCare',
    ax.innerHTML.includes('https://16485.axiscare.com/?clients-profile.php&amp;id=501') && ['Date', 'Clock-in', 'Clock-out', 'Reason', 'Tasks'].every(k => ax.innerHTML.includes('>' + k + '</span>'))
    && ax.innerHTML.includes('data-copy="09/28/2026"') && ax.innerHTML.includes('data-copy="8:00 AM"') && ax.innerHTML.includes('data-copy="2:00 PM"') && ax.innerHTML.includes('>Check AxisCare</button>'), ax.innerHTML.slice(0, 900));
  for (const [o, want] of [[{ outcome: 'mismatch', seen: '08:07-14:00', want: { in: '08:00', out: '14:00' } }, '⚠ AxisCare still shows 8:07 AM to 2:00 PM'],
    [{ outcome: 'none', error: 'AxisCare has no visit on 2026-09-28 for this client and caregiver.' }, 'Not found: AxisCare has no visit'],
    [{ outcome: 'several', visits: [{ id: 'a', scheduled: '8:00 AM to 10:00 AM' }, { id: 'b', scheduled: '12:00 PM to 2:00 PM' }] }, 'Pick the one this form is about'],
    [{ outcome: 'error', error: 'AxisCare answered 500' }, 'Could not check AxisCare: AxisCare answered 500']]) {
    const b2 = { innerHTML: '' };
    await P.boot({ page: page(), search: '?id=' + SUB.id, supabase: lib0, sb: client({}), axbox: b2, fetch: async () => ({ ok: true, status: 200, json: async () => Object.assign({ ok: true }, o) }) });
    ck('page: AxisCare ' + o.outcome + ' is said: "' + want + '"', b2.innerHTML.includes(F.esc(want)) && (o.outcome !== 'several' || (b2.innerHTML.match(/>This one</g) || []).length === 2), b2.innerHTML.slice(0, 400));
  }
  const b3 = { innerHTML: '' };
  await P.boot({ page: page(), search: '?id=' + SUB.id, supabase: lib0, sb: client({}), axbox: b3, fetch: async () => ({ ok: false, status: 404, json: async () => ({}) }) });
  ck('page: the check not installed yet is said (Desktop 422)', b3.innerHTML.includes('not switched on yet'));
  const b4 = { innerHTML: '' }; let called = 0;
  await P.boot({ page: page(), search: '?id=' + SUB.id, supabase: lib0, sb: client({ row: Object.assign({}, SUB, { client_axiscare_id: null }) }), axbox: b4, fetch: async () => { called++; return {}; } });
  ck('page: an unlinked form is never checked; the helper says link it first', called === 0 && b4.innerHTML.includes('Link this form to its client first'));

  /* ── 3. the pickers only suggest ── */
  const cgs = [{ id: '77', name: 'Sarah Thomas', active: true }, { id: '78', name: 'Sara Thompson', active: true }, { id: '79', name: 'Bob Smith', active: false }];
  const cls = [{ id: '501', name: 'Mary Jones', active: true }, { id: '502', name: 'Mary Jones', active: false }, { id: '503', name: 'Ann Lee', active: true }];
  const m = F.pickerModel({ attendant: 'sarah  thomas', consumer: 'Mary Jones' }, cgs, cls);
  ck('picker: a clear best match is PRESELECTED as a suggestion (Sarah Thomas), with the words "Suggested ... Check it"', m.cg.selected === '77' && m.cg.suggestion.id === '77'
    && F.selectHtml('x', m.cg).includes('Suggested from the name on the form') && F.selectHtml('x', m.cg).includes('<option value="77" selected>'));
  ck('picker: two clients with the same name: nothing preselected, it asks the office to pick', m.cl.selected === '' && m.cl.ambiguous && F.selectHtml('y', m.cl).includes('More than one person is close'));
  const m2 = F.pickerModel({ attendant: 'Zed Nobody', consumer: 'Ann' }, cgs, cls);
  ck('picker: no close name: nothing preselected, "Nobody matches"', m2.cg.selected === '' && F.selectHtml('x', m2.cg).includes('Nobody matches'));
  ck('picker: "Ann" alone ranks Ann Lee first but is not strong enough to preselect', m2.cl.selected === '' && m2.cl.ranked[0].p.id === '503');
  ck('picker: Kim / Kimberly and Sarah T / Sarah Thomas are suggested', F.suggest('Kim Lane', [{ id: 1, name: 'Kimberly Lane' }]).best.id === 1 && F.suggest('Sarah T', [{ id: 2, name: 'Sarah Thomas' }, { id: 3, name: 'Sarah Webb' }]).best.id === 2);
  const m3 = F.pickerModel(Object.assign({}, SUB, { caregiver_axiscare_id: '79' }), cgs, cls);
  ck('picker: an existing link wins over the name and says "Already linked"', m3.cg.selected === '79' && F.selectHtml('x', m3.cg).includes('Already linked'));
  ck('picker: every list ends with "Not on this list (leave unlinked for now)"; a list that failed to load says so', F.selectHtml('x', m.cg).includes('value="__none">Not on this list') && F.selectHtml('x', m.cg, 'census 500').includes('The list could not load: census 500'));

  /* linkSave: the one write */
  const W = []; const fake = (o = {}) => ({ from: () => { const st = {}; const b = { update(p) { st.p = p; return b; }, eq(k, v) { st.id = v; return b; }, select() { W.push(st); return Promise.resolve(o.seq ? o.seq.shift() : { data: [{ id: st.id }], error: null }); } }; return b; } });
  let r = await F.linkSave(fake(), SUB, { cg: '77', cgName: 'Sarah Thomas', cl: '501', clName: 'Mary Jones' }, { by: 'krystal@mo-care.com', accept: true });
  ck('save: Accept saves processed + accepted + both people + who linked it, on that one form', r.ok && W[0].id === SUB.id && W[0].p.processed === true && W[0].p.outcome === 'accepted' && W[0].p.caregiver_axiscare_id === '77'
    && W[0].p.client_axiscare_id === '501' && W[0].p.client_linked_name === 'Mary Jones' && W[0].p.linked_by === 'krystal@mo-care.com' && W[0].p.linked_at, W[0]);
  W.length = 0; r = await F.linkSave(fake(), SUB, { cg: '__none', cl: '501', clName: 'Mary Jones' }, { by: 'k' });
  ck('save: Link only (no accept): "Not on this list" stays unlinked; processed is not touched', r.ok && W[0].p.caregiver_axiscare_id === null && W[0].p.client_axiscare_id === '501' && !('processed' in W[0].p) && !('outcome' in W[0].p), W[0]);
  W.length = 0; r = await F.linkSave(fake(), SUB, {}, { by: 'k', dismiss: true });
  ck('save: Dismiss records outcome dismissed, links nothing', r.ok && W[0].p.outcome === 'dismissed' && W[0].p.processed === true && !('caregiver_axiscare_id' in W[0].p), W[0]);
  W.length = 0; r = await F.linkSave(fake({ seq: [{ error: { code: 'PGRST204', message: "Could not find the 'outcome' column" } }, { data: [{ id: 1 }], error: null }] }), SUB, { cg: '77', cl: '501' }, { by: 'k', accept: true });
  ck('save: before Desktop 422 (no new columns) Accept still marks it processed, and SAYS who it is for was not saved', r.ok && r.fellBack && W.length === 2 && Object.keys(W[1].p).sort().join() === 'processed,processed_at,processed_by', W);
  r = await F.linkSave(fake({ seq: [{ error: { code: '42703', message: 'column "client_axiscare_id" does not exist' } }] }), SUB, { cg: '77' }, { by: 'k' });
  ck('save: Link before Desktop 422 is refused with the reason', !r.ok && /Desktop 422/.test(r.error), r);
  r = await F.linkSave(fake({ seq: [{ data: [], error: null }] }), SUB, { cg: '77' }, { by: 'k' });
  ck('save: nothing updated (not found, or not allowed) is an error, never a silent success', !r.ok && /Nothing was saved/.test(r.error), r);
  r = await F.linkSave(fake({ seq: [{ data: null, error: { message: 'permission denied' } }] }), SUB, { cg: '77' }, { by: 'k' });
  ck('save: a refused update says why', !r.ok && r.error === 'permission denied', r);

  /* ── 4. the Hub's EVV tab, run with a fake page ── */
  const cut = (from, to) => { const a = idx.indexOf(from), b = idx.indexOf(to, a); if (a < 0 || b < 0) throw new Error('missing ' + from); return idx.slice(a, b); };
  const block = cut('let EVV_SUBS={data:null,loading:false};', 'function evvPaintStats(){');
  const els = {};
  const el = (id) => (els[id] ||= { id, innerHTML: '', value: '', style: {}, textContent: '', disabled: false });
  const UPD = [], PERSIST = [], SEL = [];
  let pending = [Object.assign({}, SUB, { processed: false, outcome: null, caregiver_axiscare_id: null, client_axiscare_id: null, caregiver_linked_name: null, client_linked_name: null, linked_by: null })];
  let past = [Object.assign({}, SUB, { id: 'p-1' }), Object.assign({}, SUB, { id: 'p-2', attendant: 'Bob Smith', consumer: 'Ann Lee', visitdate: '2026-08-02', outcome: null, caregiver_axiscare_id: null, client_axiscare_id: null, caregiver_linked_name: null, client_linked_name: null, axiscare_done_at: null, axiscare_seen: null, new_in: '09:00', new_out: '11:00' })];
  const sbFake = { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
    from: (t) => { const st = { eqs: [] }; const b = {
      select(c) { st.cols = c; return b; }, eq(k, v) { st.eqs.push([k, v]); return b; }, order() { return b; }, limit() { return b; },
      update(p) { st.upd = p; return b; },
      then(ok) { if (st.upd) { UPD.push({ p: st.upd, eqs: st.eqs }); return Promise.resolve({ data: [{ id: 1 }], error: null }).then(ok); }
        SEL.push(st); const proc = (st.eqs.find(e => e[0] === 'processed') || [])[1];
        return Promise.resolve({ data: proc === false ? pending : past, error: null }).then(ok); } };
      b.select = function (c) { st.cols = c; if (st.upd) return Promise.resolve(UPD.push({ p: st.upd, eqs: st.eqs }) && { data: [{ id: 1 }], error: null }); return b; };
      return b; } };
  const AXQ = [];
  const ctx = { sb: sbFake, console, Date, JSON, Promise, String, Object, Array, setTimeout,
    document: { getElementById: (id) => (id === 'evvLinkModal' ? els[id] || null : el(id)), createElement: () => ({ style: {} }), body: { appendChild: (x) => { x.id = 'evvLinkModal'; els.evvLinkModal = x; } } },
    window: null, DATA: { evv_corrections: [{ id: 'L-old', attendant: 'Bob Smith', consumer: 'Ann Lee', visitdate: '2026-08-02', newIn: '09:00', newOut: '11:00', wellskyDone: 'no' },
      { id: 'L-amb', attendant: 'Zed', consumer: 'Q', visitdate: '2026-01-01', newIn: '08:00', newOut: '09:00' }] },
    ME: { email: 'krystal@mo-care.com' }, SW_EVV: { data: null, loading: true }, swEvvLoad() {}, swEvvPaint() {}, evvPaintStats() {}, ccChiToday: () => '2026-10-03',
    esc: F.esc, alert: (m) => ctx.ALERTS.push(m), confirm: () => true, ALERTS: [],
    persist: async (k, item) => { PERSIST.push([k, JSON.parse(JSON.stringify(item))]); },
    cgdCensus: async () => ({ caregivers: [{ id: 77, first: 'Sarah', last: 'Thomas', active: true }, { id: 79, first: 'Bob', last: 'Smith', active: true }] }),
    cl360Roster: async () => [{ client_name: 'Mary Jones', axiscare_client_id: '501' }, { client_name: 'Ann Lee', axiscare_client_id: '503' }, { client_name: 'No Ax', axiscare_client_id: '' }],
    CL360_AXSTATUS: {}, fetch: async (url, o) => { AXQ.push(JSON.parse(o.body)); const ids = JSON.parse(o.body).submission_ids || [];
      return { ok: true, status: 200, json: async () => ({ ok: true, results: Object.fromEntries(ids.map(id => [id, { outcome: 'match', seen: '09:00-11:00', visit: { id: 'v' }, checked_at: 'x', done_at: 'x' }])) }) }; } };
  ctx.window = ctx; ctx.EVVF = F; ctx.globalThis = ctx;
  globalThis.fetch = (...a) => ctx.fetch(...a);   /* evv-forms.js calls the page's fetch */
  vm.createContext(ctx);
  vm.runInContext(block, ctx);
  const tick = () => new Promise(r => setTimeout(r, 20));
  vm.runInContext('evvLoadSubs()', ctx); await tick();
  const pend = el('evvPendingNative').innerHTML;
  ck('Hub pending: each waiting form has 📄 View form (opens evv-form.html?id=), ✓ Accept & Log and Dismiss', pend.includes('href="evv-form.html?id=' + SUB.id + '"') && pend.includes('📄 View form') && pend.includes('✓ Accept &amp; Log') && pend.includes('>Dismiss<'));
  await vm.runInContext(`evvProcessSub('${SUB.id}')`, ctx); await tick();
  const modal = els.evvLinkModal && els.evvLinkModal.innerHTML;
  ck('Accept & Log opens "Who is this form for?" with both pickers, the suggestions preselected, and writes NOTHING yet',
    modal && modal.includes('Who is this form for?') && modal.includes('<option value="77" selected>Sarah Thomas') && modal.includes('<option value="501" selected>Mary Jones') && UPD.length === 0 && PERSIST.length === 0, [modal && modal.slice(0, 300), UPD]);
  ck('... clients without an AxisCare number are not offered', !modal.includes('No Ax'));
  el('evvLinkCg').value = ''; el('evvLinkCl').value = '501';
  await vm.runInContext('evvLinkConfirm()', ctx);
  ck('Confirm with a picker left on "Choose…" is refused with a message, nothing written', /Choose the caregiver/.test(el('evvLinkMsg').textContent) && UPD.length === 0 && PERSIST.length === 0);
  el('evvLinkCg').value = '77';
  await vm.runInContext('evvLinkConfirm()', ctx); await tick();
  const u = UPD[0] && UPD[0].p;
  ck('Confirm: the form is saved as accepted, for caregiver 77 and client 501, by the signed-in staff member', u && u.outcome === 'accepted' && u.caregiver_axiscare_id === '77' && u.client_axiscare_id === '501' && u.linked_by === 'krystal@mo-care.com' && UPD[0].eqs[0][1] === SUB.id, UPD);
  ck('... and the corrections log entry carries submission_id (so the log opens the signed form)', PERSIST.length === 1 && PERSIST[0][0] === 'evv_corrections' && PERSIST[0][1].submission_id === SUB.id && PERSIST[0][1].formReceived === 'yes', PERSIST);
  ck('... the picker closes', els.evvLinkModal.style.display === 'none');
  UPD.length = 0;
  await vm.runInContext(`evvDismissSub('${SUB.id}')`, ctx); await tick();
  ck('Dismiss: recorded as dismissed (and an error would be said)', UPD[0] && UPD[0].p.outcome === 'dismissed');
  await vm.runInContext('evvLoadPast(true)', ctx); await tick(); await tick();
  const pastH = el('evvPastNative').innerHTML;
  ck('Past forms: every processed form, with 📄 View form, Link / Change link, status and who it is linked to', pastH.includes('evv-form.html?id=p-1') && pastH.includes('evv-form.html?id=p-2') && pastH.includes('>Change link<') && pastH.includes('>Link<')
    && pastH.includes('not linked to a caregiver or client yet') && pastH.includes('linked: Sarah Thomas · Mary Jones') && pastH.includes('Accepted and logged'), pastH.slice(0, 600));
  ck('Past forms: the AxisCare chip shows on accepted forms (Waiting for AxisCare / Done)', pastH.includes('Waiting for AxisCare') || pastH.includes('Done in AxisCare'));
  el('evvPastQ').value = 'bob'; vm.runInContext('evvPastFilter()', ctx);
  ck('Past forms: search by caregiver or client', el('evvPastNative').innerHTML.includes('p-2') && !el('evvPastNative').innerHTML.includes('id=p-1'));
  el('evvPastQ').value = ''; el('evvPastFrom').value = '2026-09-01'; vm.runInContext('evvPastFilter()', ctx);
  ck('Past forms: and by visit date', el('evvPastNative').innerHTML.includes('id=p-1') && !el('evvPastNative').innerHTML.includes('id=p-2'));
  el('evvPastFrom').value = '';
  ck('Past forms: the accepted forms waiting on AxisCare were checked automatically (one call, only the linked ones)', AXQ.length === 1 && JSON.stringify(AXQ[0].submission_ids) === '["p-1"]', AXQ);
  vm.runInContext('evvPaintLog()', ctx);
  const logH = el('evvLogNative').innerHTML;
  ck('Log: the new entry opens its form (submission_id); an older entry opens its form when exactly one form fits; an ambiguous one gets no button',
    logH.includes('evv-form.html?id=' + SUB.id) && logH.includes('evv-form.html?id=p-2') && (logH.match(/📄 View form/g) || []).length === 2, logH.slice(0, 900));
  past.push(Object.assign({}, past[1], { id: 'p-3' })); await vm.runInContext('evvLoadPast(true)', ctx); await tick(); vm.runInContext('evvPaintLog()', ctx);
  ck('Log: an older entry that two forms could fit gets no button (never a guess)', !el('evvLogNative').innerHTML.includes('id=p-2') && !el('evvLogNative').innerHTML.includes('id=p-3'));
  past.pop();
  /* a match from Check AxisCare ticks the log row's "AxisCare updated" */
  ctx.DATA.evv_corrections.unshift({ id: 'L-p1', submission_id: 'p-1', attendant: 'Sarah Thomas', consumer: 'Mary Jones', visitdate: '2026-09-28', newIn: '08:00', newOut: '14:00', wellskyDone: 'no' });
  await vm.runInContext('evvLoadPast(true)', ctx); await tick(); PERSIST.length = 0;
  ctx.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true, outcome: 'match', seen: '08:00-14:00', want: { in: '08:00', out: '14:00' }, visit: { id: 'v1' }, checked_at: 'now', done_at: 'now' }) });
  await vm.runInContext("evvAxCheck('p-1')", ctx); await tick();
  ck('Check AxisCare: a match shows ✅ Done in AxisCare and ticks the log entry "AxisCare updated" (saved)', el('evvPastNative').innerHTML.includes('✅ Done in AxisCare') && PERSIST.some(p => p[1].id === 'L-p1' && p[1].wellskyDone === 'yes'), PERSIST);
  ctx.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true, outcome: 'error', error: 'AxisCare answered 503' }) });
  await vm.runInContext("evvAxCheck('p-1')", ctx); await tick();
  ck('Check AxisCare: an error is said on the row', el('evvPastNative').innerHTML.includes('Could not check AxisCare: AxisCare answered 503'));
  ctx.ALERTS.length = 0;
  sbFake.from = () => { const b = { select() { return b; }, eq() { return b; }, order() { return b; }, limit() { return Promise.resolve({ data: null, error: { message: 'network down' } }); }, then(ok) { return Promise.resolve({ data: null, error: { message: 'network down' } }).then(ok); } }; return b; };
  await vm.runInContext('evvLoadPast(true)', ctx); await tick();
  ck('Past forms: a failed load is said, never an empty list', el('evvPastNative').innerHTML.includes('Could not load past forms: network down'));

  /* ── 5. both profiles ── */
  const cgFn = cut('async function cgdEvvFormsMount(c){', '\nasync function cgdMissedNotesMount');
  const cpFn = cut('async function cpRenderEvvForms(){', '\nfunction cpLeadClientName');
  const pc = { console, String, window: null, EVVF: F, CGD: { openId: '77' }, CP: { ax: '501' }, Q: [],
    document: { getElementById: (id) => el(id) },
    sb: { from: () => { const st = { eqs: [] }; const b = { select() { return b; }, eq(k, v) { st.eqs.push([k, v]); pc.Q.push(st); return b; }, order() { return Promise.resolve(pc.fail ? { data: null, error: { message: 'boom' } } : { data: [SUB], error: null }); } }; return b; } } };
  pc.window = pc; vm.createContext(pc); vm.runInContext(cgFn + '\n' + cpFn, pc);
  await vm.runInContext("cgdEvvFormsMount({ id: 77 })", pc);
  const cgH = el('cgdEvvForms').innerHTML;
  ck('caregiver profile: "EVV correction forms" lists their linked forms (date, client, corrected times, reason, status, 📄 View form)', cgH.includes('EVV correction forms') && cgH.includes('Mon, Sep 28, 2026') && cgH.includes('with Mary Jones')
    && cgH.includes('8:00 AM to 2:00 PM') && cgH.includes('Phone was dead') && cgH.includes('Accepted and logged') && cgH.includes('evv-form.html?id=' + SUB.id) && pc.Q[0].eqs[0].join() === 'caregiver_axiscare_id,77', cgH.slice(0, 500));
  await vm.runInContext('cpRenderEvvForms()', pc);
  const cpH = el('cp_evv_forms').innerHTML;
  ck('client profile (Activity & Documents): the same list, by client AxisCare id, naming the caregiver', cpH.includes('EVV correction forms') && cpH.includes('caregiver Sarah Thomas') && cpH.includes('evv-form.html?id=' + SUB.id) && pc.Q[1].eqs[0].join() === 'client_axiscare_id,501');
  pc.fail = true; await vm.runInContext("cgdEvvFormsMount({ id: 77 })", pc);
  ck('profiles: a failed load is said', el('cgdEvvForms').innerHTML.includes('Could not load the EVV correction forms: boom'));
  pc.fail = false; pc.sb.from = () => { const b = { select() { return b; }, eq() { return b; }, order() { return Promise.resolve({ data: [], error: null }); } }; return b; };
  await vm.runInContext('cpRenderEvvForms()', pc);
  ck('profiles: none yet says how forms get there', el('cp_evv_forms').innerHTML.includes('No EVV correction forms are linked to this client yet'));
  pc.CP.ax = ''; await vm.runInContext('cpRenderEvvForms()', pc);
  ck('client profile: an inquiry with no AxisCare id shows nothing (no forms can be linked yet)', el('cp_evv_forms').innerHTML === '');
  ck('profiles: wired in: caregiver Performance section and client Activity & Documents, called when the profile opens',
    idx.includes('<div id="cgdEvvForms"></div>') && /cgdLateMount\(c\); \}catch\(_\)\{\}\n  cgdEvvFormsMount\(c\);/.test(idx) && idx.includes('<div><div id="cp_evv_forms"></div><div id="cp_calls">') && idx.includes('callsLoad(); cpRenderEvvForms();'));
  ck('index.html loads evv-forms.js; the EVV tab has "4 · Past forms" with search and dates', idx.includes('<script src="evv-forms.js?v=422"></script>') && idx.includes('4 · Past forms') && idx.includes('id="evvPastQ"') && idx.includes('id="evvPastFrom"'));

  /* ── 6. words ── */
  const VERBATIM = F.TASKS.concat(F.REASONS.map(r => r[1]), ['This form is for legitimate errors only \u2014 it does not guarantee approval.']);
  const strip = (t) => VERBATIM.reduce((a, v) => a.split(v).join('').split(F.esc(v)).join(''), t);
  const newIdx = block + cgFn + cpFn + idx.slice(idx.indexOf('4 · Past forms') - 600, idx.indexOf('id="evvPastNative"'));
  ck('no em dashes in any new words (the public form\'s own task and reason wording is reproduced exactly, as signed)', ![strip(lib), strip(html), newIdx].some(t => /[\u2014\u2015]/.test(t)),
    [strip(lib), strip(html), newIdx].map(t => (t.match(/.{30}[\u2014\u2015].{10}/) || [''])[0]));
  ck('never "plain language" / "plain English"', ![lib, html, newIdx].some(t => /plain (language|english)/i.test(t)));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL  crashed: ' + (e && e.stack || e)); process.exit(1); });
