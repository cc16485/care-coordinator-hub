/* Step 1 "have these ready" (Samantha 2026-11-07, Step 1 easier plan, piece 1). HER RULE: say nothing about how long
   Step 1 takes. Static checks on step1.html, plus the same list in the Training Platform's link and reminder email when
   that checkout sits beside this one (TRAINING_DIR to point elsewhere). */
const fs = require('fs'), path = require('path')
const html = fs.readFileSync(path.join(__dirname, '..', 'step1.html'), 'utf8')
let pass = 0, fail = 0
const ck = (n, ok) => { console.log((ok ? 'PASS ' : 'FAIL ') + n); ok ? pass++ : fail++ }
const m = html.match(/const HAVE_READY = \[([\s\S]*?)\];/)
const items = m ? [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1].replace(/\\'/g, "'")) : []
ck('the welcome screen has the four have-ready items', items.length === 4)
ck('jobs item asks for caregiving jobs and a supervisor phone (verify experience)', /caregiving jobs/.test(items[0] || '') && /supervisor's phone number/.test(items[0] || ''))
ck('references item has no count, so the reference change needs no new wording', /references, with a phone number for each/.test(items[1] || '') && !/\d/.test(items[1] || ''))
ck('the list shows on the welcome screen until Step 1 is done', /if \(!V\.completed_at\) h \+= '<div class="doc" id="haveReady">/.test(html))
const welcome = (html.match(/if \(s === '1'\) \{[\s\S]*?return h;\n  \}/) || [''])[0]
ck('the welcome screen says nothing about time', welcome.length > 0 && !/minute|hour/i.test(welcome))
ck('no em dash in the new words', !/—/.test(items.join(' ')))
const tdir = process.env.TRAINING_DIR || path.join(__dirname, '..', '..', 'training-wt')
const tf = path.join(tdir, 'supabase/functions/job-offer/index.ts')
if (fs.existsSync(tf)) {
  const ts = fs.readFileSync(tf, 'utf8')
  ck('the Training email list matches the welcome screen', items.every((x) => ts.includes(x.replace(/'/g, "'"))))
  ck('no "takes about 15 minutes" in the Step 1 link or reminder', !/takes about 15 minutes/.test(ts))
} else console.log('skip  Training checkout not found at ' + tdir)
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0)
