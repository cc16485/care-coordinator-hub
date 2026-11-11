// Step 1 paper packet, plain and compact (Samantha 2026-11-11: "basic and not take up so much space").
// The SAME approved Step 1 wording (step1-documents.ts) laid out blank, to print and mail. Only the phone-only phrases in
// swaps.json change. Forms run one after another (no page per form), small type, fill-in lines and boxes inline.
import { writeFileSync } from 'node:fs'
import { BrandPdf, NAVY, MUTED, TEXT, textWidth } from './brand-pdf.ts'
import { FORMS, FORM_ORDER, APPROVED_FOR_REAL, SKILL_GROUPS, LIFT_TYPES, DECIDING, OFFICE_PHONE, type Form, type Item } from './step1-documents.ts'

const ML = 60, MR = 552, W = MR - ML, FS = 8.5, RH = 15, GAP = 12
const SW: [string, string][] = JSON.parse(process.env.SWAPS || '[]')
const swap = (s: string) => { for (const [a, b] of SW) s = s.split(a).join(b); return s }
const tw = (s: string, f: 'R' | 'S' | 'B' = 'R', size = FS) => textWidth(s, f, size)

const forms: Form[] = FORM_ORDER.map((k) => FORMS[k]).filter((f) => APPROVED_FOR_REAL[f.key] === f.version && f.step1Gate !== 'nurse')
const pdf = new BrandPdf('Step 1 New-Hire Paperwork (paper copy)')
pdf.footer('Caring Companions In-Home Senior Care · Step 1 paperwork · (417) 234-8494')
pdf.headerFn = (p) => { p.y = 792 - 40 }
pdf.y = 792 - 40

/* ── the inline flow: segments sit left to right on a row and wrap to the next row ── */
let cx = ML, open = false
function nl() { if (open) pdf.y -= RH; cx = ML; open = false }
function seg(w: number, draw: (x: number, yb: number) => void) {
  if (open && cx + w > MR) nl()
  if (!open) { pdf.ensure(RH + 2); open = true }
  draw(cx, pdf.y - 11); cx += w + GAP
}
const box = (x: number, yb: number) => pdf.rect(x, yb - 1, 7.5, 7.5, undefined, TEXT, 0.7)
function field(label: string, len = 120) {
  label = swap(label)
  if (tw(label, 'S') > W - 60) { nl(); para(label, { font: 'S' }); label = '' }
  const lw = label ? tw(label, 'S') + 4 : 0
  if (len < 0) { if (open && MR - cx - lw < 110) nl(); len = MR - (open ? cx : ML) - lw }
  if (lw + len > W) len = W - lw
  seg(lw + len, (x, yb) => { if (label) pdf.textAt(label, x, yb, 'S', FS, NAVY); pdf.line(x + lw, yb - 1.5, Math.min(MR, x + lw + len), yb - 1.5, MUTED, 0.5) })
}
function check(opt: string) { seg(11 + tw(opt), (x, yb) => { box(x, yb); pdf.textAt(opt, x + 11, yb, 'R', FS, TEXT) }) }
function label(t: string) { t = swap(t); if (tw(t, 'S') > W - 40) { nl(); para(t, { font: 'S', after: 1 }); return } seg(tw(t, 'S'), (x, yb) => pdf.textAt(t, x, yb, 'S', FS, NAVY)) }
function question(t: string, opts: string[]) { nl(); label(t); for (const o of opts) check(o); nl() }
function para(t: string, o: { font?: 'R' | 'S' | 'B'; size?: number; color?: typeof TEXT; after?: number } = {}) {
  nl(); const size = o.size ?? FS; pdf.para(swap(t), { font: o.font, size, color: o.color ?? (o.font ? NAVY : TEXT), lh: size * 1.3, after: o.after ?? 2 })
}
const note = (t?: string) => { if (t) para(t, { size: 7.3, color: MUTED, after: 1 }) }
function heading(t: string) { nl(); pdf.ensure(48); pdf.y -= 3; pdf.para(t, { font: 'B', size: 9, color: NAVY, lh: 12, after: 1, keep: true }) }
function sign(who = 'Signature') { nl(); pdf.y -= 4; field(who, 230); field('Date', 90); nl() }

const SHORT_LEN: Record<string, number> = { date: 80, month: 85, number: 60, initials: 50, tel: 110, email: 170, text: 170 }
const bigList = (o?: string[]) => !!o && o.length > 20
function inputItem(it: { label: string; kind: string; options?: string[]; still?: string }) {
  let l = it.label; if (it.kind === 'date') l += ' (MM/DD/YYYY)'
  if (bigList(it.options)) { field(l + (it.kind === 'multi' ? ' (write each)' : ''), it.kind === 'multi' ? -1 : 50); return }
  field(l, SHORT_LEN[it.kind] ?? 170); if (it.still) check(it.still)
}
const isInput = (k: string, o?: string[]) => ['text', 'tel', 'email', 'month', 'number', 'date', 'initials'].includes(k) || bigList(o)

const COPIES: Record<string, string[]> = {
  jobs: ['Job 1 (most recent)', 'Job 2 (optional)'], family_care: ['Family or private-client care (optional)'],
  professional_refs: ['Professional reference 1', 'Professional reference 2'], personal_refs: ['Personal reference'], backup_refs: ['Backup reference (optional)'],
}
function card(it: Item, title: string) {
  nl(); pdf.y -= 2; pdf.para(title, { font: 'B', size: FS, color: TEXT, lh: 12, after: 0, keep: true })
  for (const f of it.fields || []) {
    if (isInput(f.kind, f.options)) { inputItem(f); continue }
    if (f.kind === 'yesno') { label(f.label); check('Yes'); check('No'); continue }
    if (f.kind === 'choice' || f.kind === 'multi') { question(f.label, f.options || []); continue }
    if (f.kind === 'lifts') { question(f.label, LIFT_TYPES); continue }
    if (f.kind === 'skills') { question(f.label, []); for (const g of SKILL_GROUPS) { label(g.h + ':'); for (const [, s] of g.skills) check(s); nl() } continue }
    if (f.kind === 'refresher') { nl(); label(f.label); check('None'); field('or list', -1); nl() }
  }
  nl()
}
function table(it: Item) {
  const o = it.options || []
  if (it.id === 'windows') {
    const cols = o.filter((c) => !c.startsWith('Hours')), dayW = 62, cw = 52, hx = ML + dayW + cols.length * cw
    nl(); pdf.ensure(12 + 7 * 13); let y = pdf.y - 9
    cols.forEach((c, j) => pdf.textAt(c, ML + dayW + j * cw + cw / 2, y, 'S', 7.5, NAVY, 0, 'center')); pdf.textAt('Exact hours (optional)', hx, y, 'S', 7.5, NAVY)
    for (const d of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) { y -= 13; pdf.textAt(d, ML, y, 'R', FS, TEXT); cols.forEach((_, j) => box(ML + dayW + j * cw + cw / 2 - 4, y)); pdf.line(hx, y - 1.5, MR, y - 1.5, MUTED, 0.5) }
    pdf.y = y - 6; return
  }
  if (it.id === 'specialties' || it.id === 'matching_facts') {
    question(it.label + ' (tick Yes or Not at this time for each)', [])
    const half = (W - 20) / 2
    o.forEach((r, i) => { const x = ML + (i % 2) * (half + 20); if (i % 2 === 0) { pdf.ensure(13); pdf.y -= 12 } const yb = pdf.y + 1
      box(x, yb); box(x + 14, yb); let t = r; while (tw(t, 'R', 7.8) > half - 32) t = t.slice(0, -1); if (t !== r) t = t.trimEnd()
      pdf.textAt(t === r ? r : r, x + 30, yb, 'R', tw(r, 'R', 7.8) > half - 32 ? 6.6 : 7.8, TEXT) })
    pdf.y -= 6; para('First box = Yes, second box = Not at this time.', { size: 7.3, color: MUTED }); return
  }
  question(it.label, []); const cw = W / o.length; pdf.ensure(40); let y = pdf.y - 9
  o.forEach((c, j) => pdf.textAt(c, ML + j * cw, y, 'S', 7.5, NAVY))
  for (let r = 0; r < 2; r++) { y -= 15; pdf.line(ML, y, MR, y, MUTED, 0.5) }
  pdf.y = y - 4
}
function item(it: Item) {
  if (it.kind === 'statement') return para(it.label)
  if (isInput(it.kind, it.options)) { inputItem(it); if (it.note && !it.locked) note(it.note); return }
  nl()
  if (it.kind === 'yesno') { label(it.label); check('Yes'); check('No') }
  else if (it.kind === 'choice' || it.kind === 'multi') question(it.label, it.options || [])
  else if (it.kind === 'photo') check('Copy enclosed: ' + swap(it.label))
  else if (it.kind === 'cards') (COPIES[it.id] || [it.label]).forEach((t) => card(it, t))
  else if (it.kind === 'table') table(it)
  nl(); note(it.note)
}

/* ── cover (top of page 1) ── */
pdf.para('Caring Companions In-Home Senior Care', { font: 'S', size: 9, color: MUTED, lh: 12, after: 0 })
pdf.para('Step 1 New-Hire Paperwork (paper copy)', { font: 'B', size: 14, color: NAVY, lh: 18, after: 4 })
field('Legal name', 200); field('Phone', -1); field('Email', 200); field('Position', -1); nl()
para(`These are the same Step 1 forms our new caregivers sign on their phone. Print clearly in blue or black ink, answer every question, and sign and date each form. If you will drive clients, fill in the Driver Agreement and enclose a copy of your driver's license (front and back) and auto insurance card; if not, fill in the Non-Driver Agreement. Fold the Hepatitis B form on its own: it is kept in a separate confidential file. Mail everything to Caring Companions, 1331 N Stewart Ave, Springfield, MO 65802. Questions? Call or text ${OFFICE_PHONE}.`, { after: 3 })
for (const d of Object.values(DECIDING)) question(d.label, d.options.map(([, l]) => l))
para('Office use: mailed ________  received ________  by ______________', { size: 7.5, color: MUTED, after: 2 })

/* ── the forms, one after another ── */
forms.forEach((f, i) => {
  nl(); if (f.confidential) pdf.newPage(); pdf.ensure(80); pdf.y -= 6;   /* the confidential form starts its own page so it can be kept apart */
  pdf.line(ML, pdf.y, MR, pdf.y, NAVY, 1); pdf.y -= 2
  pdf.para(`${i + 1}. ${f.title}`, { font: 'B', size: 11, color: NAVY, lh: 15, after: 0 })
  para(`Version ${f.version}${f.when ? (f.when.equals === 'yes' ? '. Only if you will drive clients.' : '. Only if you will not drive clients.') : ''}${f.confidential ? '. Confidential: fold on its own.' : ''}`, { size: 7.3, color: MUTED, after: 1 })
  field('Printed name', -1); nl()
  for (const p of f.intro || []) para(p)
  for (const s of f.sections) {
    heading(swap(s.h)); for (const p of s.p || []) para(p); if (s.tip) para(s.tip, { font: 'B' })
    for (const it of s.items || []) item(it)
    nl()
  }
  if (f.choices) {
    heading(f.choices.label)
    for (const o of f.choices.options) { check(o.label); nl(); note(o.note) }
    if (f.decline) { heading(f.decline.title); para(f.decline.intro, { size: 7.5, color: MUTED }); para(f.decline.statement); para('Sign here only if you chose not to get the vaccine.', { font: 'S' }); sign() }
  }
  heading('Certification'); for (const c of f.certification) para(c)
  if (f.signature === 'typed+initials') { field('Initials (the AxisCare line above)', 50); nl() }
  sign()
  if (f.countersign) { field('For Caring Companions, signature', 170); field('Title', 90); field('Date', -1); nl() }
})
nl()
const out = process.argv[2]; writeFileSync(out, pdf.build()); console.log('wrote', out, pdf.pages.length, 'pages,', forms.length, 'forms')
