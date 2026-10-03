/* node tests/evv-signature-test.js
   429 (2026-10-03, her rule: "it really needs to be completed at the time of the shift ... or worst case scenario the
   next time they are with that client --- if client doesnt sign we can call the client and verify over the phone").
   Proves: the badges (✍ Waiting for client signature / 📞 Verified by phone / Client declined / Signed); Accept & Log
   is refused on a waiting or declined form (Dismiss still works); the office's phone dialog records who they spoke with,
   when, what was confirmed (who called = the sign-in, from the server); the signed-form page and printout show the
   phone verification in place of the signature; the next-visit switch; the signing-link line; profiles; no em dashes. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 900))); };
const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const lib = fs.readFileSync(path.join(ROOT, 'evv-forms.js'), 'utf8');
const formPage = fs.readFileSync(path.join(ROOT, 'evv-form.html'), 'utf8');
require(path.join(ROOT, 'evv-forms.js'));
const F = globalThis.EVVF;
const DASH = /[\u2014\u2015]/;
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const BASE = { id: '9a1c2d3e-4a5b-4c6d-8e7f-001122334455', attendant: 'Maria Lopez', consumer: 'Ruth A.', visitdate: '2026-09-30', new_in: '09:00', new_out: '13:00', orig_in: '09:04',
  reason: 'Forgot to clock in or out', notes: 'Phone died', processed: false, outcome: null, sig_attendant: PNG, sig_consumer: null,
  caregiver_axiscare_id: '501', caregiver_linked_name: 'Maria Lopez', client_axiscare_id: '701', client_linked_name: 'Ruth Adams', linked_by: 'axiscare-visit', axiscare_visit_id: '9001' };
const WAIT = Object.assign({}, BASE, { client_sig_status: 'waiting' });
const PHONE = Object.assign({}, BASE, { client_sig_status: 'phone_verified', phone_verified_by: 'krystal.lee@mo-care.com', phone_call_at: '2026-10-02T15:15:00Z', phone_verified_at: '2026-10-02T15:20:00Z',
  phone_verified_with: 'Ann Brown', phone_verified_relationship: 'daughter', phone_verified_confirmed: true, phone_verified_notes: 'Ann was there that morning' });
const REFUSED = Object.assign({}, PHONE, { client_sig_status: 'refused', phone_verified_confirmed: false, phone_verified_notes: 'Ruth says Maria left at 11' });
const SIGNED = Object.assign({}, BASE, { client_sig_status: 'signed', sig_consumer: PNG, client_sign_via: 'form' });
const LATER = Object.assign({}, SIGNED, { client_sign_via: 'sign_link', client_signed_at: '2026-10-02T14:20:00Z' });

/* ── 1. the shared helpers ── */
ck('status: waiting / phone_verified / refused / signed; an older form follows its signature; a list without it shows nothing',
  F.sigStatus(WAIT).key === 'waiting' && F.sigStatus(PHONE).key === 'phone_verified' && F.sigStatus(REFUSED).key === 'refused' && F.sigStatus(SIGNED).key === 'signed'
  && F.sigStatus(Object.assign({}, BASE, { sig_consumer: PNG })).key === 'signed' && F.sigStatus(BASE).key === 'waiting' && F.sigStatus({ id: 1 }).key === '');
ck('badges: "✍ Waiting for client signature", "📞 Verified by phone", "✋ Client declined to confirm", "Signed", "Signed (at the next visit)"',
  F.sigChipHtml(WAIT).includes('✍ Waiting for client signature') && F.sigChipHtml(PHONE).includes('📞 Verified by phone') && F.sigChipHtml(REFUSED).includes('✋ Client declined to confirm')
  && F.sigChipHtml(SIGNED).includes('>Signed<') && F.sigChipHtml(LATER).includes('Signed (at the next visit)') && F.sigChipHtml({ id: 1 }) === '');
ck('Accept: blocked while waiting ("The client has not signed yet. Wait for the next visit, or verify by phone first.") and when declined; allowed when signed or verified by phone',
  F.acceptBlock(WAIT) === 'The client has not signed yet. Wait for the next visit, or verify by phone first.' && /Dismiss the form instead/.test(F.acceptBlock(REFUSED))
  && F.acceptBlock(SIGNED) === null && F.acceptBlock(PHONE) === null && F.acceptBlock(LATER) === null);
ck('phone words: "Client signature: verified by phone by Krystal Lee with Ann Brown (daughter) on Oct 2, 2026 at 10:15 AM"',
  F.phoneWords(PHONE) === 'Client signature: verified by phone by Krystal Lee with Ann Brown (daughter) on Oct 2, 2026 at 10:15 AM'
  && F.phoneWords(REFUSED) === 'Client declined to confirm: phone call by Krystal Lee with Ann Brown (daughter) on Oct 2, 2026 at 10:15 AM' && F.phoneWords(WAIT) === '', [F.phoneWords(PHONE), F.phoneWords(REFUSED)]);
ck('phone button: only on a waiting or declined form the office has not processed', F.canPhone(WAIT) && F.canPhone(REFUSED) && !F.canPhone(SIGNED) && !F.canPhone(PHONE) && !F.canPhone(Object.assign({}, WAIT, { processed: true })));
const SIGN = { submission_id: WAIT.id, token: '11111111-2222-4333-8444-555555555555', expires_at: '2099-01-01T00:00:00Z' };
ck('signing link: the client page + token only', F.signLink(SIGN) === 'https://sc.mo-care.com/evv-client-sign.html?t=11111111-2222-4333-8444-555555555555' && F.signLink(null) === '');
const lw = (s, g) => F.signLineWords(s, g);
ck('signing line: waiting for the next visit / practice / texted / no visit in 14 days / not reached / ran out / no visit link',
  /Waiting for her next visit with this client/.test(lw(WAIT, SIGN))
  && /Practice: the caregiver WOULD have been texted/.test(lw(WAIT, Object.assign({}, SIGN, { next_visit_practice_at: '2026-10-02T14:15:00Z' })))
  && /Signing link texted to the caregiver at her visit/.test(lw(WAIT, Object.assign({}, SIGN, { next_visit_texted_at: '2026-10-02T14:15:00Z' })))
  && /No visit with this client in the next 14 days: call the client to verify/.test(lw(WAIT, Object.assign({}, SIGN, { no_visit_item_at: 'x', last_note: 'Needs Attention: no_visit' })))
  && /could not be texted the signing link/.test(lw(WAIT, Object.assign({}, SIGN, { next_visit_refused_at: 'x', no_visit_item_at: 'x', last_note: 'Needs Attention: not_reached' })))
  && /ran out: call the client to verify/.test(lw(WAIT, Object.assign({}, SIGN, { expires_at: '2020-01-01T00:00:00Z' })))
  && /no visit link/.test(lw(Object.assign({}, WAIT, { caregiver_axiscare_id: null, client_axiscare_id: null }), null)) && /within a few minutes/.test(lw(WAIT, null)) && lw(SIGNED, SIGN) === '');
const now = new Date(Date.now() - 5 * 60000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);   /* a datetime-local value: local wall time */
ck('phone answers: name, time (not in the future), the tick for "verified", notes for "declined"',
  /Who did you speak with/.test(F.phonePayload('verify', { call_at: now, confirmed: true }).error) && /When was the call/.test(F.phonePayload('verify', { spoke_with: 'Ann', confirmed: true }).error)
  && /in the future/.test(F.phonePayload('verify', { spoke_with: 'Ann', call_at: '2099-01-01T10:00', confirmed: true }).error)
  && /Tick the box only if/.test(F.phonePayload('verify', { spoke_with: 'Ann', call_at: now }).error)
  && /Write what the client said/.test(F.phonePayload('refuse', { spoke_with: 'Ann', call_at: now }).error));
const okp = F.phonePayload('verify', { spoke_with: ' Ann Brown ', relationship: 'daughter', call_at: now, confirmed: true, notes: '' });
ck('phone answers: a good one; who called is NOT in it (the server takes it from the sign-in)', okp.ok && okp.payload.outcome === 'phone_verified' && okp.payload.spoke_with === 'Ann Brown' && okp.payload.confirmed === true
  && okp.payload.notes === null && !('by' in okp.payload) && Date.parse(okp.payload.call_at) > 0, okp);

(async () => {
  let calls = [];
  const rpcSb = (ans) => ({ rpc: async (fn, a) => { calls.push({ fn, a }); return ans; } });
  let r = await F.phoneSave(rpcSb({ data: { ok: true, status: 'phone_verified', by: 'k@x' }, error: null }), WAIT, okp.payload);
  ck('save: one call to evv_client_phone_record with the form id and the answers', r.ok && calls.length === 1 && calls[0].fn === 'evv_client_phone_record' && calls[0].a.p_id === WAIT.id && calls[0].a.p_payload.spoke_with === 'Ann Brown', calls);
  r = await F.phoneSave(rpcSb({ data: { ok: false, error: 'closed' }, error: null }), WAIT, okp.payload);
  ck('save: a refused save says why (never a silent success)', !r.ok && /already accepted or dismissed/.test(r.error), r);
  r = await F.phoneSave(rpcSb({ data: null, error: { message: 'Could not find the function public.evv_client_phone_record', code: 'PGRST202' } }), WAIT, okp.payload);
  ck('save: before Desktop 429 it says so', !r.ok && /Desktop 429/.test(r.error), r);

  /* the dialog itself (a fake page) */
  const els = {}; const mk = (id) => ({ id, value: '', checked: false, style: {}, textContent: '', innerHTML: '', disabled: false });
  const doc = { getElementById: (id) => els[id] || null, createElement: () => mk(''), body: { appendChild: (x) => { els.evvPhoneModal = x; x.id = 'evvPhoneModal'; } } };
  calls = []; let done = 0;
  F.openPhoneDialog({ doc, sb: rpcSb({ data: { ok: true }, error: null }), sub: WAIT, mode: 'verify', me: 'krystal@mo-care.com', onDone: () => { done++; } });
  const dlg = els.evvPhoneModal.innerHTML;
  ck('dialog: who called (from the sign-in), who they spoke with + relationship, date and time, the confirmation tick naming the caregiver and times, notes',
    dlg.includes('krystal@mo-care.com') && dlg.includes('(from your sign-in)') && dlg.includes('id="evvPhWith"') && dlg.includes('id="evvPhRel"') && dlg.includes('type="datetime-local"')
    && dlg.includes('The client confirmed Maria Lopez was there 9:00 AM to 1:00 PM on Wed, Sep 30, 2026.') && dlg.includes('id="evvPhNotes"') && dlg.includes('A person calls the client'), dlg.slice(0, 600));
  ['evvPhWith', 'evvPhRel', 'evvPhWhen', 'evvPhConf', 'evvPhNotes', 'evvPhMsg', 'evvPhGo'].forEach((k) => { els[k] = mk(k); });
  els.evvPhWhen.value = now; els.evvPhRel.value = 'daughter';
  r = await F.savePhoneDialog();
  ck('dialog: without a name nothing is saved, it says why', !r.ok && calls.length === 0 && /Who did you speak with/.test(els.evvPhMsg.textContent));
  els.evvPhWith.value = 'Ann Brown';
  r = await F.savePhoneDialog();
  ck('dialog: without the tick nothing is saved', !r.ok && calls.length === 0 && /Tick the box only if/.test(els.evvPhMsg.textContent));
  els.evvPhConf.checked = true;
  r = await F.savePhoneDialog();
  ck('dialog: saved once, closed, the list reloads', r.ok && calls.length === 1 && calls[0].a.p_payload.relationship === 'daughter' && calls[0].a.p_payload.confirmed === true && els.evvPhoneModal.style.display === 'none' && done === 1, calls);
  F.openPhoneDialog({ doc, sb: rpcSb({}), sub: WAIT, mode: 'refuse', me: 'k' });
  ck('dialog "Client declined to confirm": no tick; notes required; says the time is not corrected', !els.evvPhoneModal.innerHTML.includes('id="evvPhConf"') && els.evvPhoneModal.innerHTML.includes('What did they say? (required)')
    && els.evvPhoneModal.innerHTML.includes('cannot be accepted, so the time is not corrected'));
  F.closePhoneDialog();

  /* ── 2. the Hub's EVV tab, run with a fake page ── */
  const cut = (from, to) => { const a = idx.indexOf(from), b = idx.indexOf(to, a); if (a < 0 || b < 0) throw new Error('missing ' + from); return idx.slice(a, b); };
  const block = cut('let EVV_SUBS={data:null,loading:false};', 'function evvPaintStats(){');
  const hel = {};
  const el = (id) => (hel[id] ||= { id, innerHTML: '', value: '', style: {}, textContent: '', disabled: false });
  const UPD = [], ALERTS = [], MERGES = [], RPC = [];
  let pending = [WAIT, Object.assign({}, WAIT, { id: 'w-2', caregiver_axiscare_id: null, client_axiscare_id: null, linked_by: null, attendant: 'Bob Smith' }), Object.assign({}, PHONE, { id: 'p-ph' }), Object.assign({}, REFUSED, { id: 'p-rf' }), Object.assign({}, SIGNED, { id: 'p-sg' })];
  let past = [Object.assign({}, PHONE, { id: 'old-1', processed: true, outcome: 'accepted' }), Object.assign({}, REFUSED, { id: 'old-2', processed: true, outcome: 'dismissed' })];
  const sbFake = { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
    rpc: async (fn, a) => { RPC.push({ fn, a }); return { data: { ok: true }, error: null }; },
    from: (t) => { const st = { eqs: [], t }; const b = {
      select(c) { st.cols = c; if (st.upd) return Promise.resolve(UPD.push({ p: st.upd, eqs: st.eqs }) && { data: [{ id: 1 }], error: null }); return b; },
      eq(k, v) { st.eqs.push([k, v]); return b; }, in(k, v) { st.in = v; return b; }, order() { return b; }, limit() { return b; }, update(p) { st.upd = p; return b; },
      then(ok) {
        if (t === 'evv_sign') return Promise.resolve({ data: (st.in || []).includes(WAIT.id) ? [SIGN] : [], error: null }).then(ok);
        const proc = (st.eqs.find(e => e[0] === 'processed') || [])[1];
        return Promise.resolve({ data: proc === false ? pending : past, error: null }).then(ok); } };
      return b; } };
  const ctx = { sb: sbFake, console, Date, JSON, Promise, String, Object, Array, setTimeout,
    document: { getElementById: (id) => (id === 'evvLinkModal' || id === 'evvPhoneModal' ? hel[id] || null : el(id)), createElement: () => ({ style: {} }), body: { appendChild: (x) => { hel[x.id || 'evvLinkModal'] = x; if (!x.id) x.id = 'evvLinkModal'; } } },
    window: null, DATA: { evv_corrections: [], ops_settings: { timekeeper_text_live: true } }, ME: { email: 'krystal@mo-care.com' }, SW_EVV: { data: null, loading: true }, swEvvLoad() {}, swEvvPaint() {}, evvPaintStats() {}, ccChiToday: () => '2026-10-03',
    esc: F.esc, alert: (m) => ALERTS.push(m), confirm: (m) => { ALERTS.push('CONFIRM: ' + m); return true; }, persist: async () => {},
    tkMerge: async (apply, what) => { const m = {}; const ch = apply(m, {}); MERGES.push({ m, ch, what }); ctx.DATA.ops_settings = Object.assign({}, ctx.DATA.ops_settings, m); return { changed: ch, error: null }; },
    cgdCensus: async () => ({ caregivers: [] }), cl360Roster: async () => [], CL360_AXSTATUS: {}, fetch: async () => ({ ok: true, status: 200, json: async () => ({}) }) };
  ctx.window = ctx; ctx.EVVF = F; ctx.globalThis = ctx;
  vm.createContext(ctx); vm.runInContext(block, ctx);
  const tick = () => new Promise(r => setTimeout(r, 20));
  vm.runInContext('evvLoadSubs()', ctx); await tick();
  const pend = el('evvPendingNative').innerHTML;
  const rowOf = (id) => { const i = pend.indexOf("evvDismissSub('" + id + "')"); const a = pend.lastIndexOf('<div class="card"', i); const b = pend.indexOf('<div class="card"', i); return pend.slice(a, b < 0 ? undefined : b); };
  const w1 = rowOf(WAIT.id), w2 = rowOf('w-2');
  ck('pending: a waiting form shows "✍ Waiting for client signature", 📞 Verified by phone, Client declined to confirm, Copy signing link (the caregiver only)',
    w1.includes('✍ Waiting for client signature') && w1.includes('📞 Verified by phone') && w1.includes('Client declined to confirm') && w1.includes('Copy signing link')
    && w1.includes('data-link="https://sc.mo-care.com/evv-client-sign.html?t=11111111-2222-4333-8444-555555555555"') && w1.includes('Never send it to the client or family') && w1.includes('Waiting for her next visit with this client'), w1.slice(0, 900));
  ck('pending: a waiting form with no visit link says so and offers Link (no signing link yet)', w2.includes('Waiting for client signature, no visit link') && w2.includes(`evvLinkPast('w-2')`) && !w2.includes('Copy signing link'), w2.slice(0, 700));
  ck('pending: the Accept button on a waiting form is dimmed with the reason', /opacity:\.55;"\s*title="The client has not signed yet\. Wait for the next visit, or verify by phone first\."/.test(w1), w1.slice(0, 1200));
  ck('pending: verified by phone and declined forms show their badge and the phone words; signed shows "Signed"', rowOf('p-ph').includes('📞 Verified by phone') && rowOf('p-ph').includes('verified by phone by Krystal Lee with Ann Brown (daughter)')
    && rowOf('p-rf').includes('✋ Client declined to confirm') && rowOf('p-rf').includes('Dismiss it: the time is not corrected') && rowOf('p-sg').includes('>Signed<'));
  await vm.runInContext(`evvProcessSub('${WAIT.id}')`, ctx); await tick();
  ck('Accept & Log on a waiting form: the warning, no picker, nothing written', ALERTS.at(-1) === 'The client has not signed yet. Wait for the next visit, or verify by phone first.' && !hel.evvLinkModal && UPD.length === 0, ALERTS);
  await vm.runInContext(`evvProcessSub('p-rf')`, ctx); await tick();
  ck('Accept & Log on a declined form: refused, says to dismiss', /Dismiss the form instead/.test(ALERTS.at(-1)) && !hel.evvLinkModal && UPD.length === 0);
  await vm.runInContext(`evvProcessSub('p-ph')`, ctx); await tick();
  ck('Accept & Log on a form verified by phone: allowed (the "Who is this form for?" step opens)', hel.evvLinkModal && hel.evvLinkModal.innerHTML.includes('Who is this form for?'), hel.evvLinkModal && hel.evvLinkModal.innerHTML.slice(0, 200));
  vm.runInContext('evvLinkCancel()', ctx);
  await vm.runInContext(`evvDismissSub('${WAIT.id}')`, ctx); await tick();
  ck('Dismiss on a waiting form: allowed', UPD.some((u) => u.p.outcome === 'dismissed'), UPD);
  vm.runInContext(`evvPhone('${WAIT.id}', 'verify')`, ctx);
  ck('📞 Verified by phone opens the dialog for that form', hel.evvPhoneModal && hel.evvPhoneModal.innerHTML.includes('📞 Verified by phone') && hel.evvPhoneModal.innerHTML.includes('krystal@mo-care.com'));
  F.closePhoneDialog();
  await vm.runInContext('evvLoadPast(true)', ctx); await tick(); await tick();
  const pastH = el('evvPastNative').innerHTML;
  ck('Past forms: the client signature badge on each form', pastH.includes('📞 Verified by phone') && pastH.includes('✋ Client declined to confirm'), pastH.slice(0, 600));
  vm.runInContext('evvPaintNextVisit()', ctx);
  ck('next-visit switch: OFF by default, says practice and that the client/family are never texted', el('evvNextVisitCard').innerHTML.includes('Next-visit signature texts: OFF (practice).') && el('evvNextVisitCard').innerHTML.includes('Turn on next-visit texts'));
  await vm.runInContext('evvToggleNextVisit(null)', ctx);
  ck('next-visit switch: turning it on asks first (one text to the caregiver, never the client or family), saves evv_next_visit_live with the activity log',
    /Nothing is ever sent to the client or family/.test(ALERTS.at(-1)) && MERGES.length === 1 && MERGES[0].m.evv_next_visit_live === true && MERGES[0].what === 'EVV next-visit settings'
    && el('evvNextVisitCard').innerHTML.includes('Next-visit signature texts: ON.'), [ALERTS.at(-1), MERGES]);
  ctx.DATA.ops_settings.timekeeper_text_live = false; vm.runInContext('evvPaintNextVisit()', ctx);
  ck('next-visit switch: ON but caregiver texts off says nothing is sent', el('evvNextVisitCard').innerHTML.includes('but caregiver texts are OFF'));

  /* ── 3. the signed-form page and its printout ── */
  const inline = [...formPage.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]);
  globalThis.__EVV_TEST__ = true; vm.runInThisContext(inline[inline.length - 1]);
  const P = globalThis.EVVPAGE;
  const vph = P.render(PHONE, {}), vwait = P.render(WAIT, {}), vref = P.render(REFUSED, {}), vlater = P.render(LATER, {});
  ck('form page: verified by phone stands in for the signature: "Client signature: verified by phone by Krystal Lee with Ann Brown (daughter) on Oct 2, 2026 at 10:15 AM"',
    vph.includes('Client signature: verified by phone by Krystal Lee with Ann Brown (daughter) on Oct 2, 2026 at 10:15 AM') && !vph.includes('alt="Client signature"')
    && vph.includes('Confirmed on the call: Maria Lopez was there 9:00 AM to 1:00 PM on Wed, Sep 30, 2026.') && vph.includes('Notes: Ann was there that morning'));
  ck('form page: waiting / declined / signed at the next visit each say so', vwait.includes("Waiting for the client's signature.") && vref.includes('Client declined to confirm: phone call by Krystal Lee')
    && vlater.includes('alt="Client signature"') && vlater.includes("Signed by the client at the caregiver's next visit"), [vwait.slice(vwait.indexOf('6. Client'), vwait.indexOf('6. Client') + 600)]);
  ck('form page: office record has a "Client signature" row with the badge', vph.includes('<span class="k">Client signature</span>') && vph.includes('📞 Verified by phone'));
  const css = (formPage.match(/@media print\{([\s\S]*?)\n\}/) || [])[1] || '';
  ck('printout: the phone-verification box prints; the office buttons do not', /\.sigbar\{display:none!important\}/.test(css) && /\.phone-sig\{/.test(css));
  const box = { innerHTML: '' };
  P.sigBar({}, WAIT, 'krystal@mo-care.com', box);
  ck('form page: a waiting form has the office buttons (📞 Verified by phone, Client declined to confirm)', box.innerHTML.includes('📞 Verified by phone') && box.innerHTML.includes('Client declined to confirm'));
  P.sigBar({}, SIGNED, 'k', box); ck('form page: a signed form has no phone buttons', box.innerHTML === '');

  /* ── 4. profiles and the database-not-ready fallback ── */
  ck('profiles: each form shows its client signature badge', F.sectionHtml({ rows: [WAIT, PHONE], kind: 'client' }).includes('✍ Waiting for client signature') && F.sectionHtml({ rows: [WAIT, PHONE], kind: 'client' }).includes('📞 Verified by phone'));
  const seq = [{ data: null, error: { code: '42703', message: 'column evv_submissions.client_sig_status does not exist' } }, { data: [PHONE], error: null }]; const cols = [];
  const fb = { from: () => { const b = { select(c) { cols.push(c); return b; }, eq() { return b; }, order() { return Promise.resolve(seq.shift()); } }; return b; } };
  const lr = await F.loadFor(fb, 'client', '701');
  ck('profiles: before Desktop 429 the list still loads (asks again without the new columns)', lr.rows && lr.rows.length === 1 && cols.length === 2 && cols[0].includes('client_sig_status') && !cols[1].includes('client_sig_status'), [lr, cols]);

  /* ── 4b. the caregiver engine's EVV list (the same Accept rule) ── */
  { const eng = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
    const code = eng.slice(eng.indexOf('async function acceptEVVSubmission(subId)'), eng.indexOf('async function dismissEVVSubmission(id)'));
    const AL2 = [], SAVED = [];
    const c2 = { _evvPendingCache: { w: WAIT, s: SIGNED }, alert: (m) => AL2.push(m), window: { EVVF: F }, EVVF: F, getEVVCorrections: () => [], saveEVVCorrections: (x) => SAVED.push(x),
      sb: { auth: { getUser: async () => ({ data: { user: { email: 'k@x' } } }) } }, loadPendingEVVSubmissions: async () => {}, renderEVVCorrections() {}, Date, String };
    vm.createContext(c2); vm.runInContext(code, c2);
    await vm.runInContext("acceptEVVSubmission('w')", c2);
    ck('engine EVV list: Accept on a waiting form says why and logs nothing', AL2[0] === F.ACCEPT_WAIT && SAVED.length === 0, AL2);
    ck('engine EVV list: shows the signature badge', /EVVF\.sigChipHtml\(sub\)/.test(eng)); }

  /* ── 5. words ── */
  const added = lib.slice(lib.indexOf('/* ── 429: the client signature'), lib.indexOf('root.EVVF = {'));
  const idxAdded = cut('function evvProcessSub(id){', 'function evvLinkPast(id)') + cut('/* 429: the client signature has its own badge', "Accept &amp; Log asks who the form is for");
  ck('no em dashes in the words 429 added (helpers, EVV tab, form page)', added.length > 2000 && !DASH.test(added) && !DASH.test(idxAdded)
    && !DASH.test(formPage.slice(formPage.indexOf('/* 429: the client signature, or what stands in'), formPage.indexOf("var row = function"))) && !DASH.test(formPage.slice(formPage.indexOf('/* 429: the office'), formPage.indexOf('/* AxisCare helper on this page'))));
  ck('index.html and evv-form.html load evv-forms.js v429', idx.includes('evv-forms.js?v=429') && formPage.includes('evv-forms.js?v=429'));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('FAIL  crashed: ' + (e && e.stack || e)); process.exit(1); });
