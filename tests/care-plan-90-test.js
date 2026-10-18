// SOP ruling 4 (2026-10-17): care plan reviews every 90 days, and sooner whenever a shift note shows a change.
const t = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8')
const s = t.indexOf('const CP_REVIEW_DAYS'), e = t.indexOf('(function(){', s)
global.DATA = { ops_items: [
  { kind: 'care_note', level: 'yellow', client_ax: '7', created_at: '2026-10-12T10:00:00Z', why: 'needed help standing' },
  { kind: 'care_note', level: 'red', client_ax: '7', created_at: '2026-10-14T10:00:00Z', cn_actions: [{ what: 'ok' }] },
  { kind: 'care_note', level: 'unread', client_ax: '8', created_at: '2026-10-14T10:00:00Z' },
  { kind: 'care_note', level: 'red', client_ax: '9', created_at: '2026-09-01T10:00:00Z' }] }
eval(t.slice(s, e).replace('const CP_REVIEW_DAYS', 'global.CP_REVIEW_DAYS').replace('function cpShiftChangeSince', 'global.cpShiftChangeSince=function'))
let bad = 0; const ck = (n, ok) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + n) }
ck('the next review defaults to 90 days', CP_REVIEW_DAYS === 90 && !/cp-next-due'\)\.value=new Date\(Date\.now\(\)\+30\*86400000/.test(t))
ck('a yellow flag since the last review counts; one closed as Not a concern does not', cpShiftChangeSince('7', '2026-10-01T00:00:00Z').why === 'needed help standing')
ck('a flag before the last review does not count', cpShiftChangeSince('9', '2026-10-01T00:00:00Z') === null)
ck('an unread note is not a change', cpShiftChangeSince('8', null) === null)
ck('never reviewed: any flag counts', !!cpShiftChangeSince('9', null))
ck('no AxisCare id: nothing', cpShiftChangeSince('', null) === null)
ck('the help text says 90 days and shift notes', /every 90 days<\/b>, and sooner <b>whenever a shift note shows a change/.test(t))
console.log(bad ? bad + ' failed' : '7 passed'); process.exit(bad ? 1 : 0)
