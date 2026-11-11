// Step 1 paper packet: the SAME approved Step 1 wording (step1-documents.ts) laid out blank, to print and mail.
// Only the phone-only phrases in PAPER_SWAPS change, and each one is listed for Samantha's approval.
import { writeFileSync } from 'node:fs'
import { BrandPdf, COMPANY_RIGHT, FOOTER, MUTED, NAVY, RULE, GOLD, BEIGE, TEXT, textWidth } from './brand-pdf.ts'
import { FORMS, FORM_ORDER, APPROVED_FOR_REAL, SKILL_GROUPS, LIFT_TYPES, DECIDING, OFFICE_PHONE, type Form, type Item, type Field } from './step1-documents.ts'

const ML = 60, MR = 552, W = MR - ML
const SW: [string, string][] = JSON.parse(process.env.SWAPS || '[]')
const swap = (s: string) => { for (const [a, b] of SW) s = s.split(a).join(b); return s }

const forms: Form[] = FORM_ORDER.map((k) => FORMS[k]).filter((f) => APPROVED_FOR_REAL[f.key] === f.version && f.step1Gate !== 'nurse')
const pdf = new BrandPdf('Step 1 New-Hire Paperwork (paper copy)'); pdf.footer(FOOTER)
pdf.headerFn = (p, f) => p.letterhead(COMPANY_RIGHT, f); pdf.letterhead(COMPANY_RIGHT, true)

const box = (x: number, yBase: number, s = 8.5) => pdf.rect(x, yBase - 1, s, s, undefined, NAVY, 0.8)
function lbl(t: string, x: number, y: number, w: number, size = 9.5, font: 'S' | 'R' = 'S') {
  // wrap a label into width w, return lines drawn
  const words = t.split(/\s+/); const lines: string[] = []; let ln = ''
  for (const wd of words) { const c = ln ? ln + ' ' + wd : wd; if (textWidth(c, font, size) > w && ln) { lines.push(ln); ln = wd } else ln = c }
  if (ln) lines.push(ln)
  lines.forEach((l, i) => pdf.textAt(l, x, y - i * (size * 1.35), font, size, NAVY))
  return lines.length
}
function note(t?: string) { if (t) pdf.para(swap(t), { size: 8.5, color: MUTED, lh: 12, after: 3 }) }
/** fill-in lines, cols per row */
function fields(labels: string[], cols = 2) {
  const gap = 18, cw = (W - gap * (cols - 1)) / cols
  for (let i = 0; i < labels.length; i += cols) {
    const row = labels.slice(i, i + cols)
    const n = Math.max(...row.map((l) => { let c = 1, ln = ''; for (const wd of l.split(/\s+/)) { const t = ln ? ln + ' ' + wd : wd; if (textWidth(t, 'S', 9) > cw && ln) { c++; ln = wd } else ln = t } return c }))
    const h = n * 12 + 24; pdf.ensure(h); const top = pdf.y
    row.forEach((l, j) => { const x = ML + j * (cw + gap); lbl(l, x, top - 10, cw, 9); pdf.line(x, top - h + 4, x + cw, top - h + 4, MUTED, 0.6) })
    pdf.y = top - h - 4
  }
}
function checks(opts: string[], o: { cols?: number; size?: number } = {}) {
  const size = o.size ?? 9.5; const long = Math.max(...opts.map((x) => textWidth(x, 'R', size)))
  const cols = o.cols ?? (long < 120 ? 3 : long < 210 ? 2 : 1); const cw = W / cols
  for (let i = 0; i < opts.length; i += cols) {
    const row = opts.slice(i, i + cols); let n = 1
    const wrapped = row.map((t) => { const out: string[] = []; let ln = ''; for (const wd of t.split(/\s+/)) { const c = ln ? ln + ' ' + wd : wd; if (textWidth(c, 'R', size) > cw - 22 && ln) { out.push(ln); ln = wd } else ln = c } out.push(ln); n = Math.max(n, out.length); return out })
    const h = n * size * 1.35 + 6; pdf.ensure(h); const top = pdf.y
    wrapped.forEach((ls, j) => { const x = ML + j * cw; box(x + 2, top - size - 1); ls.forEach((l, k) => pdf.textAt(l, x + 16, top - size - k * size * 1.35, 'R', size, TEXT)) })
    pdf.y = top - h
  }
  pdf.y -= 4
}
function question(label: string, opts: string[], hint?: string) {
  const size = 9.5, inline = opts.length <= 3 && opts.every((o) => o.length < 18)
  const optW = opts.reduce((a, o) => a + textWidth(o, 'R', size) + 34, 0)
  if (inline && textWidth(label, 'S', size) + optW + 20 < W) {
    pdf.ensure(20); pdf.y -= 13; pdf.textAt(label, ML, pdf.y, 'S', size, NAVY)
    let x = MR - optW + 10; for (const o of opts) { box(x, pdf.y); pdf.textAt(o, x + 14, pdf.y, 'R', size, TEXT); x += textWidth(o, 'R', size) + 34 }
    pdf.y -= 9; return
  }
  pdf.ensure(Math.ceil(textWidth(label + (hint ? ' ' + hint : ''), 'S', size) / W + 1) * 14 + 22)
  pdf.para(label + (hint ? ' ' + hint : ''), { font: 'S', size, color: NAVY, lh: 14, after: 3, keep: true }); checks(opts)
}
const STATE_LIKE = (o?: string[]) => !!o && o.length > 20
const isShort = (it: { kind: string; options?: string[] }) => ['text', 'tel', 'email', 'month', 'number', 'date', 'initials'].includes(it.kind) || STATE_LIKE(it.options)
function fieldLabel(it: { label: string; kind: string; options?: string[] }) {
  let l = swap(it.label); if (it.kind === 'date') l += ' (MM/DD/YYYY)'; if (STATE_LIKE(it.options)) l += it.kind === 'multi' ? ' (write each state)' : ''
  return l
}

function renderCard(item: Item, n: number, title: string) {
  pdf.ensure(80); pdf.y -= 4
  pdf.rect(ML, pdf.y - 18, W, 18, BEIGE, undefined, 0, 4); pdf.textAt(title, ML + 8, pdf.y - 12.5, 'S', 9.5, NAVY); pdf.y -= 26
  let buf: string[] = []
  const flush = () => { if (buf.length) fields(buf); buf = [] }
  for (const f of item.fields || []) {
    if (isShort(f)) { buf.push(fieldLabel(f) + (f.still ? `  (or tick: ${f.still})` : '')); if (f.note) { flush(); note(f.note) } continue }
    flush()
    if (f.kind === 'yesno') question(swap(f.label), ['Yes', 'No'])
    else if (f.kind === 'choice' || f.kind === 'multi') question(swap(f.label), f.options || [], f.kind === 'multi' && !/tick all/i.test(f.label) ? '(Tick all that apply.)' : '')
    else if (f.kind === 'skills') { pdf.para(swap(f.label), { font: 'S', size: 9.5, color: NAVY, lh: 14, after: 2, keep: true }); for (const g of SKILL_GROUPS) { pdf.para(g.h, { size: 8.5, color: MUTED, lh: 12, after: 1, keep: true }); checks(g.skills.map(([, l]) => l), { size: 8.8 }) } }
    else if (f.kind === 'lifts') question(swap(f.label), LIFT_TYPES)
    else if (f.kind === 'refresher') { pdf.para(swap(f.label), { font: 'S', size: 9.5, color: NAVY, lh: 14, after: 2, keep: true }); checks(['None, ready for all of these']); fields(['Or write the tasks here'], 1) }
    note(f.note)
  }
  flush(); pdf.y -= 4
}
const CARD_COPIES: Record<string, (i: number) => string> = {
  jobs: (i) => i === 0 ? 'Job 1: your most recent job' : `Job ${i + 1} (optional)`,
  family_care: () => 'Family or private-client care (optional)',
  professional_refs: (i) => `Professional reference ${i + 1}`,
  personal_refs: () => 'Personal reference',
  backup_refs: () => 'Backup reference (optional)',
}
const COPIES: Record<string, number> = { jobs: 3, family_care: 1, professional_refs: 2, personal_refs: 1, backup_refs: 1 }

function renderItem(it: Item) {
  if (it.kind === 'statement') { pdf.para(swap(it.label), { after: 6 }); return }
  if (it.kind === 'yesno') { question(swap(it.label), ['Yes', 'No']); note(it.note); return }
  if ((it.kind === 'choice' || it.kind === 'multi') && !STATE_LIKE(it.options)) { question(swap(it.label), it.options || [], it.kind === 'multi' && !/tick all/i.test(it.label) ? '(Tick all that apply.)' : '(Tick one.)'); note(it.note); return }
  if (it.kind === 'photo') { pdf.ensure(20); pdf.y -= 13; box(ML, pdf.y); pdf.textAt('Copy enclosed: ' + swap(it.label), ML + 16, pdf.y, 'S', 9.5, NAVY); pdf.y -= 8; note(it.note); return }
  if (it.kind === 'cards') { const c = COPIES[it.id] ?? 1; for (let i = 0; i < c; i++) renderCard(it, i, (CARD_COPIES[it.id] || (() => it.label))(i)); return }
  if (it.kind === 'table') { renderTable(it); note(it.note); return }
  fields([fieldLabel(it)], 1); if (!it.locked) note(it.note)
}
function renderTable(it: Item) {
  const o = it.options || []
  if (it.id === 'windows') {
    const cols = o.filter((c) => !c.startsWith('Hours')), days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const dayW = 72, boxW = 58, hoursX = ML + dayW + cols.length * boxW + 6
    pdf.ensure(24 + days.length * 22); let y = pdf.y - 12
    pdf.textAt('Day', ML, y, 'S', 8.5, NAVY); cols.forEach((c, j) => pdf.textAt(c, ML + dayW + j * boxW + boxW / 2, y, 'S', 8, NAVY, 0, 'center')); pdf.textAt('Exact hours (optional)', hoursX, y, 'S', 8, NAVY)
    y -= 6
    for (const d of days) { y -= 22; pdf.line(ML, y - 5, MR, y - 5, RULE, 0.6); pdf.textAt(d, ML, y, 'R', 9.5, TEXT); cols.forEach((_, j) => box(ML + dayW + j * boxW + boxW / 2 - 5, y, 10)); pdf.line(hoursX, y - 2, MR, y - 2, MUTED, 0.5) }
    pdf.y = y - 14; return
  }
  if (it.id === 'specialties' || it.id === 'matching_facts') {
    pdf.para(swap(it.label), { font: 'S', size: 9.5, color: NAVY, lh: 14, after: 2, keep: true })
    for (const r of o) { const lines = Math.ceil(textWidth(r, 'R', 9.5) / 300); const h = Math.max(1, lines) * 13 + 8; pdf.ensure(h); const top = pdf.y
      pdf.para(r, { size: 9.5, width: 300, lh: 13, after: 0 }); box(ML + 330, top - 10.5); pdf.textAt('Yes', ML + 344, top - 10, 'R', 9.5, TEXT); box(ML + 380, top - 10.5); pdf.textAt('Not at this time', ML + 394, top - 10, 'R', 9.5, TEXT)
      pdf.y = Math.min(pdf.y, top - h + 4); pdf.line(ML, pdf.y, MR, pdf.y, RULE, 0.5); pdf.y -= 2 }
    pdf.y -= 6; return
  }
  // a plain rows table (convictions): column headers and blank rows
  pdf.para(swap(it.label), { font: 'S', size: 9.5, color: NAVY, lh: 14, after: 2, keep: true })
  const cw = W / o.length; pdf.ensure(20 + 3 * 24); let y = pdf.y - 11
  o.forEach((c, j) => pdf.textAt(c, ML + j * cw + 2, y, 'S', 8, NAVY))
  for (let r = 0; r < 3; r++) { y -= 24; pdf.line(ML, y, MR, y, MUTED, 0.5) }
  for (let j = 1; j < o.length; j++) pdf.line(ML + j * cw - 4, pdf.y - 16, ML + j * cw - 4, y, RULE, 0.5)
  pdf.y = y - 10
}
function signLines(who: string, withTitle = false) {
  pdf.ensure(withTitle ? 120 : 92)
  const row = (a: [string, number][]) => { pdf.y -= 30; let x = ML; for (const [l, w] of a) { pdf.line(x, pdf.y, x + w, pdf.y, MUTED, 0.6); pdf.textAt(l, x, pdf.y - 11, 'S', 7.5, MUTED, 1.2); x += w + 20 } pdf.y -= 12 }
  row([[`${who} SIGNATURE`, 320], ['DATE', W - 340]])
  row(withTitle ? [['PRINTED NAME', 320], ['TITLE', W - 340]] : [['PRINTED NAME', W]])
  pdf.y -= 6
}

/* ── cover page ── */
pdf.para('Step 1 New-Hire Paperwork', { font: 'B', size: 22, color: NAVY, lh: 28, after: 0 })
pdf.para('Paper copy, to fill in by hand and mail back', { font: 'S', size: 11, color: MUTED, lh: 16, after: 10 })
fields(['Your legal name (first, middle, last)', 'Phone', 'Email', 'Position you were offered'], 2)
pdf.heading('HOW TO FILL IT IN')
for (const b of [
  'These are the same Step 1 forms our new caregivers sign on their phone, on paper.',
  'Please print clearly in blue or black ink. Answer every question, then sign and date each form where it says to.',
  'Answer the driving question below, then fill in only the agreement that matches your answer: the Driver Agreement if you will drive clients, or the Non-Driver Agreement if you will not.',
  'If you will drive clients, put a copy of your driver\'s license (front and back) and your current auto insurance card in the envelope.',
  'The Hepatitis B Vaccination form is kept in a separate confidential medical file. Please put it in the envelope folded on its own.',
  `Questions? Call or text the office at ${OFFICE_PHONE}.`,
]) pdf.bullet(b)
pdf.heading('THE DRIVING QUESTION')
for (const [, d] of Object.entries(DECIDING)) question(d.label, d.options.map(([, l]) => l))
pdf.heading('MAIL EVERYTHING TO')
pdf.para('Caring Companions In-Home Senior Care\n1331 N Stewart Ave\nSpringfield, MO 65802', { font: 'S', color: NAVY, after: 8 })
pdf.heading('WHAT IS IN THIS PACKET')
checks(forms.map((f, i) => `${i + 1}. ${f.title}${f.when ? (f.when.equals === 'yes' ? ' (only if you will drive clients)' : ' (only if you will not drive clients)') : ''}`), { cols: 1, size: 9.3 })
pdf.ensure(46); pdf.y -= 6; const t = pdf.y; pdf.rect(ML, t - 38, W, 38, BEIGE, RULE, 0.8, 6)
pdf.textAt('OFFICE USE', ML + 10, t - 13, 'S', 7.5, MUTED, 1.2); pdf.textAt('Mailed on ________   Received on ________   By ____________________', ML + 10, t - 29, 'R', 9.5, TEXT); pdf.y = t - 48

/* ── each form ── */
forms.forEach((f, i) => {
  pdf.newPage()
  pdf.para(f.title, { font: 'B', size: 17, color: NAVY, lh: 22, after: 1 })
  pdf.para(`Step 1 new-hire paperwork · paper copy · form ${i + 1} of ${forms.length} · version ${f.version}${f.confidential ? ' · CONFIDENTIAL, kept apart from the other forms' : ''}${f.when ? (f.when.equals === 'yes' ? ' · only if you will drive clients' : ' · only if you will not drive clients') : ''}`, { size: 8.5, color: MUTED, after: 2 })
  fields(['Your printed name', 'Phone'], 2)
  if (f.key === 'employee_application') fields(['Email'], 1)
  for (const p of f.intro || []) pdf.para(swap(p), { after: 8 })
  for (const sec of f.sections) {
    pdf.heading(sec.h)
    if (sec.tone === 'cheer') { for (const p of sec.p || []) pdf.box(swap(p)) } else for (const p of sec.p || []) pdf.para(swap(p), { after: 6 })
    if (sec.tip) pdf.para(swap(sec.tip), { font: 'B', after: 6 })
    let buf: Item[] = []
    const flush = () => { if (buf.length) fields(buf.map(fieldLabel)); buf = [] }
    for (const it of sec.items || []) {
      if (isShort(it) && !it.note) { buf.push(it); continue }
      flush(); renderItem(it)
    }
    flush()
  }
  if (f.choices) {
    pdf.hr(RULE, 8); pdf.heading(f.choices.label)
    for (const o of f.choices.options) { pdf.ensure(30); pdf.y -= 4; const top = pdf.y; pdf.para(o.label, { font: 'S', size: 9.8, x: ML + 16, lh: 13, after: 0 }); box(ML, top - 10.2); if (o.note) pdf.para(o.note, { size: 8.8, color: MUTED, x: ML + 16, lh: 12, after: 4 }) }
    if (f.decline) {
      pdf.heading(f.decline.title); pdf.para(f.decline.intro, { size: 9.5, color: MUTED, after: 6 })
      pdf.box(f.decline.statement)
      pdf.para('Sign here only if you ticked the choice not to get the vaccine.', { font: 'S', size: 9.5, color: NAVY, after: 0 }); signLines('EMPLOYEE')
    }
  }
  pdf.hr(RULE, 8); pdf.heading('CERTIFICATION')
  for (const c of f.certification) pdf.para(swap(c), { after: 8 })
  if (f.signature === 'typed+initials') fields(['Your initials (the AxisCare scheduling line above)'], 2)
  signLines('EMPLOYEE')
  if (f.countersign) { pdf.heading('FOR CARING COMPANIONS (THE OFFICE SIGNS WHEN IT ARRIVES)'); signLines('COMPANY', true) }
})

const out = process.argv[2]; writeFileSync(out, pdf.build()); console.log('wrote', out, pdf.pages.length, 'pages,', forms.length, 'forms')
