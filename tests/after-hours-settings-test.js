/* node tests/after-hours-settings-test.js
   426 (Samantha, 2026-10-03): "i want the missed clock ins to be live after hours too, that and call ins".
   Two Hub switches, ON unless set to false (the same rule as the server's afterHoursAllowed):
     ops_settings.missed_clockin_after_hours  "Missed clock-ins text admins after hours (8pm to 7am)"
     ops_settings.callin_after_hours          "Call-ins text admins after hours (8pm to 7am)"
   The real ahOn / ahToggle / ahRender / tkRenderStatus / tkToggleLive, cut out of index.html and run with a fake
   clock, a fake page, a fake confirm() and a fake tkMerge (records what would be saved and the activity-log words).
   Proves: shown ON when unset; each toggle saves only its own key, with a confirm that says what happens at night and
   an activity-log label; Cancel saves nothing; the card says the admin texts themselves are OFF until switched on;
   the 425 wording ("7am to 8pm only") is gone at the default and back with the switch off; the admin loop switch is
   never touched by these buttons; no em dashes. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return src.slice(a, b); };
const block = cut('/* OFFICE QUIET HOURS (Samantha, 2026-10-03)', 'async function tkMerge(') + cut('async function tkToggleLive(', '/* Missed care notes');

let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 700))); };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function world(nowIso, ops = {}, answer = true) {
  const els = {}, asked = [], merged = [], logged = []
  const el = (id) => els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', style: {}, disabled: false })
  const now = Date.parse(nowIso)
  const ctx = {
    console, JSON, Promise, Set, Map, String, Array, Object, Number, Error, RegExp, Intl, Math,
    Date: class extends Date { constructor(...a) { super(...(a.length ? a : [now])) } static now() { return now } },
    escapeHtmlComms: esc, DATA: { ops_settings: ops, coordinator_staff: [], timekeeper_cases: [] },
    document: { getElementById: el }, today: () => nowIso.slice(0, 10),
    confirm: (t) => { asked.push(t); return answer },
    tkMerge: async (apply, what) => { const m = { ...ctx.DATA.ops_settings }; const ch = apply(m, ctx.DATA.ops_settings); merged.push(m); logged.push({ what, ch }); ctx.DATA.ops_settings = m; return { changed: ch, error: null } },
    tkAdminsNow: () => [],
  }
  vm.createContext(ctx); vm.runInContext(block, ctx)
  return { ctx, els, asked, merged, logged }
}

;(async () => {
  /* 1 · the rule: ON unless set to false */
  { const w = world('2026-10-03T15:00:00Z', {})
    ck('ahOn · unset is ON for both', w.ctx.ahOn('missed_clockin') === true && w.ctx.ahOn('callin') === true)
    w.ctx.DATA.ops_settings = { missed_clockin_after_hours: false, callin_after_hours: 'false' }
    ck('ahOn · false (or "false") is OFF', w.ctx.ahOn('missed_clockin') === false && w.ctx.ahOn('callin') === false)
    w.ctx.DATA.ops_settings = { missed_clockin_after_hours: true, callin_after_hours: null }
    ck('ahOn · true and null are ON', w.ctx.ahOn('missed_clockin') === true && w.ctx.ahOn('callin') === true)
    w.ctx.DATA.ops_settings = {}
    ck('labels · her words, with the hours', w.ctx.ahLabel('missed_clockin') === 'Missed clock-ins text admins after hours (8pm to 7am)' && w.ctx.ahLabel('callin') === 'Call-ins text admins after hours (8pm to 7am)') }

  /* 2 · the card at the default (admin loop OFF, as it is today) */
  let w = world('2026-10-03T15:00:00Z', { timekeeper_admin_loop_live: false })
  w.ctx.tkRenderStatus()
  ck('card · missed clock-ins after hours shown ON by default', /Missed clock-ins text admins after hours \(8pm to 7am\): ON\./.test(w.els.tkAfter.innerHTML) && w.els.tkAfterBtn.textContent === 'Turn off after-hours texts', w.els.tkAfter.innerHTML)
  ck('card · call-ins after hours shown ON by default', /Call-ins text admins after hours \(8pm to 7am\): ON\./.test(w.els.cvAfter.innerHTML) && /Every call-in texts the admins at any hour/.test(w.els.cvAfter.innerHTML) && w.els.cvAfterBtn.textContent === 'Turn off after-hours texts', w.els.cvAfter.innerHTML)
  ck('card · says clearly the admin texts themselves are OFF until switched on', /Admin texts are OFF \(practice run\)\.<\/b> No admin is texted about a missed clock-in, day or night, until you turn them on/.test(w.els.tkLive.innerHTML)
    && /This only matters once the admin texts are on; they are OFF now\./.test(w.els.tkAfter.innerHTML), [w.els.tkLive.innerHTML, w.els.tkAfter.innerHTML])
  ck('card · says what stays quiet at night either way', /The Saturday EVV reminder, running late and lead texts stay quiet at night either way\./.test(w.els.tkAfter.innerHTML))
  ck('card · the quiet-hours note names the exceptions, and no longer says "one text at 7am" at the default',
    /except missed clock-ins and call-ins while their after-hours switches are on/.test(w.els.tkQuietHint.innerHTML) && /after hours ON, so an overnight missed clock-in texts the admins too/.test(w.els.tkQuietHint.innerHTML)
    && !/each admin gets one text then/.test(w.els.tkQuietHint.innerHTML), w.els.tkQuietHint.innerHTML)

  /* 3 · with the admin loop ON at 3am: "any hour", no "quiet hours now: nobody is being texted" */
  w = world('2026-10-03T08:00:00Z', { timekeeper_admin_loop_live: true })
  w.ctx.tkRenderStatus()
  ck('card (loop ON, 3am, default) · "Admin texts are ON (any hour)", not "nobody is being texted"', /Admin texts are ON \(any hour\)\./.test(w.els.tkLive.innerHTML) && !/nobody is being texted/.test(w.els.tkLive.innerHTML) && !/never between/.test(w.els.tkLive.innerHTML), w.els.tkLive.innerHTML)
  ck('card (loop ON) · no "only matters once" note', !/This only matters once/.test(w.els.tkAfter.innerHTML), w.els.tkAfter.innerHTML)
  w = world('2026-10-03T08:00:00Z', { timekeeper_admin_loop_live: true, missed_clockin_after_hours: false, callin_after_hours: false })
  w.ctx.tkRenderStatus()
  ck('card (switch OFF) · back to 425: 7am to 8pm, quiet hours now', /Admin texts are ON \(7am to 8pm Central\)/.test(w.els.tkLive.innerHTML) && /It is quiet hours now/.test(w.els.tkLive.innerHTML)
    && /: OFF\.<\/b> At night nobody is texted about a missed clock-in/.test(w.els.tkAfter.innerHTML) && w.els.tkAfterBtn.textContent === 'Turn on after-hours texts', [w.els.tkLive.innerHTML, w.els.tkAfter.innerHTML])
  ck('card (switch OFF) · call-ins: email only at night, must-cover still texts', /Call-ins text admins after hours \(8pm to 7am\): OFF\.<\/b> From 8pm to 7am a call-in only emails the admins and waits on the board; a "must be covered" client still texts at any hour\./.test(w.els.cvAfter.innerHTML) && w.els.cvAfterBtn.textContent === 'Turn on after-hours texts', w.els.cvAfter.innerHTML)

  /* 4 · the 425 "turn on the admin texts" confirm, updated */
  w = world('2026-10-03T15:00:00Z', { timekeeper_admin_loop_live: false })
  await w.ctx.tkToggleLive(null)
  ck('admin-text confirm (default) · says ANY hour including 8pm to 7am, and how to keep nights quiet', /Hours: ANY hour, including 8pm to 7am \(missed clock-ins text admins after hours is on\)/.test(w.asked[0]) && /turn that switch off on this card/.test(w.asked[0]) && !/7am to 8pm Central only/.test(w.asked[0]), w.asked[0])
  ck('admin-text confirm (default) · still says the cap', /at most 6 texts each/.test(w.asked[0]), w.asked[0])
  w = world('2026-10-03T15:00:00Z', { timekeeper_admin_loop_live: false, missed_clockin_after_hours: false })
  await w.ctx.tkToggleLive(null)
  ck('admin-text confirm (switch OFF) · the 425 hours wording', /Hours: 7am to 8pm Central only\./.test(w.asked[0]), w.asked[0])

  /* 5 · the switches save with a confirm and an activity-log label; only their own key */
  w = world('2026-10-03T15:00:00Z', { timekeeper_admin_loop_live: false, coverage_send_live: true })
  await w.ctx.ahToggle('missed_clockin', null)
  ck('toggle missed clock-ins OFF · confirm says what happens at night', /^Turn off after-hours texts for missed clock-ins\? From 8pm to 7am nobody is texted about a missed clock-in: it waits in Needs Attention, and if it is still open at 7am each admin gets one text then\.$/.test(w.asked[0]), w.asked[0])
  ck('toggle missed clock-ins OFF · saves missed_clockin_after_hours false only (admin loop untouched)', w.merged[0]?.missed_clockin_after_hours === false && w.merged[0].timekeeper_admin_loop_live === false
    && !('callin_after_hours' in w.merged[0]) && w.merged[0].coverage_send_live === true, w.merged[0])
  ck('toggle missed clock-ins OFF · activity log: "missed clock-in settings: Missed clock-ins text admins after hours (8pm to 7am) OFF"', w.logged[0]?.what === 'missed clock-in settings' && w.logged[0].ch[0] === 'Missed clock-ins text admins after hours (8pm to 7am) OFF', w.logged)
  ck('toggle missed clock-ins OFF · the card updates', /: OFF\./.test(w.els.tkAfter.innerHTML) && w.els.tkSaved.textContent === 'Missed clock-ins text admins after hours (8pm to 7am): off.', [w.els.tkAfter.innerHTML, w.els.tkSaved.textContent])
  await w.ctx.ahToggle('missed_clockin', null)
  ck('toggle missed clock-ins back ON · confirm warns the admin texts themselves are OFF', /^Turn on after-hours texts for missed clock-ins\?/.test(w.asked[1]) && /at most 6 texts each/.test(w.asked[1]) && /The missed clock-in admin texts themselves are OFF right now, so nothing is texted until they are turned on\./.test(w.asked[1]), w.asked[1])
  ck('toggle missed clock-ins back ON · saves true, admin loop still off', w.merged[1]?.missed_clockin_after_hours === true && w.merged[1].timekeeper_admin_loop_live === false, w.merged[1])

  w = world('2026-10-03T15:00:00Z', {})
  await w.ctx.ahToggle('callin', null)
  ck('toggle call-ins OFF · confirm: email only at night, must-cover still texts', /^Turn off after-hours texts for call-ins\? From 8pm to 7am a call-in only emails the admins and waits on the board\. A client whose call-in plan says "must be covered" still texts at any hour\.$/.test(w.asked[0]), w.asked[0])
  ck('toggle call-ins OFF · saves callin_after_hours false only, logged as call-in alert settings', w.merged[0]?.callin_after_hours === false && !('missed_clockin_after_hours' in w.merged[0]) && !('timekeeper_admin_loop_live' in w.merged[0])
    && w.logged[0]?.what === 'call-in alert settings' && w.logged[0].ch[0] === 'Call-ins text admins after hours (8pm to 7am) OFF' && w.els.covMsgsSaved.textContent === 'Call-ins text admins after hours (8pm to 7am): off.', { m: w.merged, l: w.logged })
  await w.ctx.ahToggle('callin', null)
  ck('toggle call-ins ON · confirm says every call-in texts at any hour', /^Turn on after-hours texts for call-ins\? Every call-in will text the admins at any hour, including 8pm to 7am \(the email goes too\)\.$/.test(w.asked[1]) && w.merged[1]?.callin_after_hours === true, w.asked[1])

  w = world('2026-10-03T15:00:00Z', {}, false)
  await w.ctx.ahToggle('missed_clockin', null); await w.ctx.ahToggle('callin', null)
  ck('Cancel · nothing saved', w.merged.length === 0 && w.asked.length === 2, w.merged)

  w = world('2026-10-03T15:00:00Z', { office_quiet_start: 21, office_quiet_end: 6 })
  w.ctx.tkRenderStatus()
  ck('labels follow the quiet hours setting (9pm to 6am)', /Missed clock-ins text admins after hours \(9pm to 6am\): ON/.test(w.els.tkAfter.innerHTML) && /Call-ins text admins after hours \(9pm to 6am\): ON/.test(w.els.cvAfter.innerHTML))

  /* 6 · the page */
  ck('page · the Missed clock-ins card has the switch and its status line', /<div id="tkAfter" class="field-note"[^>]*><\/div>\s*<button class="secondary" id="tkAfterBtn" onclick="ahToggle\('missed_clockin',this\)"/.test(src))
  ck('page · the call-in alert setting (Callout texts) has the call-in switch', /id="set_cov_admin_alert"[^\n]*<\/textarea>\s*<div id="cvAfter" class="field-note"[^>]*><\/div>\s*<button class="secondary" id="cvAfterBtn" onclick="ahToggle\('callin',this\)"/.test(src))
  ck('page · the static quiet-hours note names the exceptions', /id="tkQuietHint"><b>Office quiet hours:<\/b> no admin or office text from 8pm to 7am Central, except missed clock-ins and call-ins while their after-hours switches are on\./.test(src))
  ck('page · no button here writes timekeeper_admin_loop_live except the existing admin-text toggle', (block.match(/timekeeper_admin_loop_live\s*=(?!=)/g) || []).length === 1)
  ck('no em dashes in the new code and wording', !/—/.test(block) && !/—/.test(cut('<div id="tkAfter"', '</button>')) && !/—/.test(cut('<div id="cvAfter"', '</button>')))

  console.log(`\n${pass}/${pass + fail}`)
  process.exitCode = fail ? 1 : 0
})()
