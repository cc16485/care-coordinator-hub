/* node tests/quiet-hours-settings-test.js
   Office quiet hours (Samantha, 2026-10-03, after the missed clock-in admin loop texted coordinators at 3am):
   the Settings card and the "Turn on the admin texts" confirm must state the hours. The real tkQuiet /
   tkRenderStatus / tkToggleLive, cut out of index.html and run with a fake clock, a fake page and a fake confirm().
   Proves: the hours (8pm to 7am by default, or ops_settings.office_quiet_start/end), the cap, "quiet hours now" at
   3am, the confirm wording, a cancelled confirm changes nothing, no em dashes in the new copy.
   426: these checks run with the missed clock-in after-hours switch OFF (missed_clockin_after_hours false), which is
   the 425 behaviour; the default (switch on) is tested in tests/after-hours-settings-test.js. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return src.slice(a, b); };
const block = cut('/* OFFICE QUIET HOURS (Samantha, 2026-10-03)', 'async function tkMerge(') + cut('async function tkToggleLive(', '/* Missed care notes');

let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 700))); };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function world(nowIso, ops = {}, answer = true) {
  const els = {}, asked = [], merged = []
  const el = (id) => els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', style: {}, disabled: false })
  const now = Date.parse(nowIso)
  const ctx = {
    console, JSON, Promise, Set, Map, String, Array, Object, Number, Error, RegExp, Intl, Math,
    Date: class extends Date { constructor(...a) { super(...(a.length ? a : [now])) } static now() { return now } },
    escapeHtmlComms: esc, DATA: { ops_settings: ops, coordinator_staff: [], timekeeper_cases: [] },
    document: { getElementById: el }, today: () => nowIso.slice(0, 10),
    confirm: (t) => { asked.push(t); return answer },
    tkMerge: async (apply) => { const m = { ...ops }; const ch = apply(m, ops); merged.push(m); return { changed: ch, error: null } },
    tkAdminsNow: () => [],
  }
  vm.createContext(ctx); vm.runInContext(block, ctx)
  return { ctx, els, asked, merged }
}

/* 1 · the hours, by the Chicago clock (CDT = UTC-5 in October, CST = UTC-6 in January) */
for (const [iso, quiet, label] of [
  ['2026-10-03T08:00:00Z', true, '3am'], ['2026-10-03T12:05:00Z', false, '7:05am'], ['2026-10-04T00:59:00Z', false, '7:59pm'],
  ['2026-10-04T01:00:00Z', true, '8:00pm'], ['2026-10-03T11:59:00Z', true, '6:59am'], ['2026-10-03T12:00:00Z', false, '7:00am'],
  ['2026-01-15T13:00:00Z', false, '7:00am CST'], ['2026-01-15T12:59:00Z', true, '6:59am CST'], ['2026-11-01T07:30:00Z', true, '1:30am on the fall-back night'],
]) { const w = world(iso); ck(`tkQuiet · ${label} Central: ${quiet ? 'quiet' : 'texts allowed'}`, w.ctx.tkQuiet().now === quiet, w.ctx.tkQuiet()) }
{ const q = world('2026-10-03T08:00:00Z').ctx.tkQuiet(); ck('tkQuiet · default words: 8pm to 7am', q.from === '8pm' && q.to === '7am' && !q.off, q) }
{ const q = world('2026-10-03T08:00:00Z', { office_quiet_start: 21, office_quiet_end: 6 }).ctx.tkQuiet(); ck('tkQuiet · ops_settings override 9pm to 6am', q.from === '9pm' && q.to === '6am', q) }
{ const q = world('2026-10-03T08:00:00Z', { office_quiet_start: 'x', office_quiet_end: 6 }).ctx.tkQuiet(); ck('tkQuiet · an invalid override falls back to 8pm to 7am (never to "no quiet hours")', q.from === '8pm' && q.to === '7am' && q.now, q) }

/* 2 · the confirm states the hours */
;(async () => {
  let w = world('2026-10-03T15:00:00Z', { timekeeper_admin_loop_live: false, missed_clockin_after_hours: false })
  await w.ctx.tkToggleLive(null)
  const t = w.asked[0] || ''
  ck('confirm (10am) · says the hours, 7am to 8pm Central only', /Hours: 7am to 8pm Central only\./.test(t), t)
  ck('confirm (10am) · says nobody is texted 8pm to 7am and the overnight item waits in Needs Attention', /From 8pm to 7am nobody is texted: an overnight missed clock-in waits in Needs Attention, and if it is still open at 7am each admin gets one text then\./.test(t), t)
  ck('confirm (10am) · says the cap (6) and how it stops (Resolved)', /at most 6 texts each/.test(t) && /taps Resolved/.test(t), t)
  ck('confirm (10am) · does not claim it is quiet hours now', !/quiet hours right now/.test(t), t)
  ck('confirm (10am) · yes turns it on', w.merged[0]?.timekeeper_admin_loop_live === true, w.merged)

  w = world('2026-10-03T08:00:00Z', { timekeeper_admin_loop_live: false, missed_clockin_after_hours: false })
  await w.ctx.tkToggleLive(null)
  ck('confirm (3am) · says it is quiet hours right now, nothing before 7am', /It is quiet hours right now, so nothing will be texted before 7am\./.test(w.asked[0] || ''), w.asked[0])

  w = world('2026-10-03T15:00:00Z', { timekeeper_admin_loop_live: false, timekeeper_admin_max_texts: 3, office_quiet_start: 21, office_quiet_end: 6, missed_clockin_after_hours: false })
  await w.ctx.tkToggleLive(null)
  ck('confirm · follows the settings (cap 3, 6am to 9pm)', /at most 3 texts each/.test(w.asked[0]) && /Hours: 6am to 9pm Central only/.test(w.asked[0]), w.asked[0])

  w = world('2026-10-03T15:00:00Z', { timekeeper_admin_loop_live: false, office_quiet_start: 7, office_quiet_end: 7 })
  await w.ctx.tkToggleLive(null)
  ck('confirm · quiet hours switched off is said plainly (ANY hour, including overnight)', /Office quiet hours are OFF, so these texts can go at ANY hour, including overnight\./.test(w.asked[0]), w.asked[0])

  w = world('2026-10-03T15:00:00Z', { timekeeper_admin_loop_live: false, missed_clockin_after_hours: false }, false)
  await w.ctx.tkToggleLive(null)
  ck('confirm · Cancel changes nothing', w.merged.length === 0, w.merged)

  w = world('2026-10-03T15:00:00Z', { timekeeper_admin_loop_live: true })
  await w.ctx.tkToggleLive(null)
  ck('turning it OFF keeps its own plain confirm', /^Turn off the admin texts\?/.test(w.asked[0]) && w.merged[0]?.timekeeper_admin_loop_live === false, w.asked[0])

  /* 3 · the Settings card */
  w = world('2026-10-03T08:00:00Z', { timekeeper_admin_loop_live: true, missed_clockin_after_hours: false })
  w.ctx.tkRenderStatus()
  ck('card · ON shows the hours and "quiet hours now" at 3am', /Admin texts are ON \(7am to 8pm Central\)/.test(w.els.tkLive.innerHTML) && /It is quiet hours now/.test(w.els.tkLive.innerHTML), w.els.tkLive.innerHTML)
  ck('card · the quiet-hours note names the hours and the cap', /no admin or office text from 8pm to 7am Central/.test(w.els.tkQuietHint.innerHTML) && /at most 6 texts/.test(w.els.tkQuietHint.innerHTML), w.els.tkQuietHint.innerHTML)
  ck('page · the static note in the Settings HTML says the hours too', /id="tkQuietHint"><b>Office quiet hours:<\/b> no admin or office text from 8pm to 7am Central/.test(src))

  /* 4 · no em dashes in the new copy */
  ck('no em dashes in the quiet-hours code and wording', !/—/.test(block) && !/—/.test(cut('<p class="hint" id="tkQuietHint">', '</p>')))
  console.log(`\n${pass}/${pass + fail}`)
  process.exitCode = fail ? 1 : 0
})()
