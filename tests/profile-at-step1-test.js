// node tests/profile-at-step1-test.js
// PROFILE AT STEP 1 (2026-11-21): the "One more thing" card on the Step 1 All done screen, the new-hire wording on the
// profile page, and the fourth line on the readiness card. Made-up people only; nothing is called.
const fs = require('fs'), path = require('path'), HUB = path.join(__dirname, '..')
const read = (f) => fs.readFileSync(path.join(HUB, f), 'utf8')
const res = []; const ck = (n, c, note) => res.push([n, !!c, c ? '' : String(note ?? '').slice(0, 400)])
const s1 = read('step1.html'), pg = read('caregiver-profile.html'), rc = read('caregiver-readiness.js'), jr = read('applicant-journey.js')

/* the card, run for real */
const fnSrc = /function profileAskBox\(\)\{[\s\S]*?\n\}/.exec(s1)
ck('the card function is on the Step 1 page', !!fnSrc)
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const box = (V) => new Function('V', 'esc', fnSrc[0] + '; return profileAskBox()')(V, esc)
ck('no link from the server: no card (switch off, practice hire, or Step 1 not finished)', box({}) === '' && box({ profile_ask: null }) === '' && box({ profile_ask: { link: '' } }) === '')
const h = box({ profile_ask: { link: 'https://cc.mo-care.com/caregiver-profile.html?t=made-up', sent_in: false } })
ck('her heading', h.includes('<h3>One more thing: your caregiver profile</h3>'), h)
ck('her words', h.includes('Families see a short profile of you before your first visit, so they know a friendly face is coming. Add a friendly photo and answer 3 quick questions, and we will write it for you. A short hello video is welcome if you like.'), h)
ck('the button goes to their own profile page', /<a class="go"[^>]*href="https:\/\/cc\.mo-care\.com\/caregiver-profile\.html\?t=made-up">Start my profile<\/a>/.test(h), h)
ck('it can wait: a reminder is promised', h.includes('Not ready? You can do it later. We will send you a reminder with your link.'), h)
ck('no time promise, no availability, no em dash, no vendor name', !/minute|hour/i.test(h) && !/availab/i.test(h) && !/[—―]/.test(h) && !/gohighlevel|\bghl\b/i.test(h))
ck('a link is escaped', box({ profile_ask: { link: 'https://x/?t="><b>' } }).includes('href="https://x/?t=&quot;&gt;&lt;b&gt;"'))
ck('already sent in: a thank-you, no button', (() => { const d = box({ profile_ask: { link: 'https://x', sent_in: true } }); return d.includes('your caregiver profile is in') && !d.includes('Start my profile') })())
ck('the card sits on the All done screen, before the references box', /if \(HPROOF\) h \+= proofBox\(\);\n    h \+= profileAskBox\(\);\n    h \+= laterRefsBox\(\);/.test(s1))
ck('the last signature fetches the link once', s1.includes("if (r.j.done) { V.completed_at = r.j.signed_at; go('9'); loadProfileAsk(); }") && /async function loadProfileAsk\(\)\{\n  try \{ const r = await call\(\{ action: 'view' \}\)/.test(s1))

/* the profile page: a new hire is told nothing about time; a current caregiver's words are unchanged */
ck('quick page: the time line is only for current caregivers', pg.includes('Add a friendly photo and answer 3 quick questions." + (ME.new_hire ? "" : " It takes about 2 minutes.")'))

/* the readiness card */
ck('readiness card: the profile line shows only when the server sends the rule', rc.includes("const pf = s.profile || null;") && rc.includes("if(pf) h += line(!!pf.sent, 'Caregiver profile sent in'"))
ck('readiness card: three things with the rule off, four with it on', rc.includes("(pf ? 'Four' : 'Three') + ' things and they are cleared to work.</div>'"))
ck('the card script version was bumped', /caregiver-readiness\.js\?v=19/.test(read('index.html')))

/* the message list */
ck('the follow-up is on the message journey list', jr.includes('"name": "Caregiver profile follow-ups after Step 1 (day 3 and day 6)"') && jr.includes('Please finish your caregiver profile before your first shift: {profile}'))
const added = require('child_process').execSync("git diff -U0 origin/main -- . ':!tests'", { cwd: HUB }).toString().split('\n').filter((l) => /^\+[^+]/.test(l))
ck('no em dash and no vendor name in anything added', !added.some((l) => /[—―]|gohighlevel|\bGHL\b/i.test(l) && !/shows_in_ghl/.test(l)), added.filter((l) => /[—―]|gohighlevel|\bGHL\b/i.test(l)).join(' | '))

let bad = 0; for (const [n, ok, note] of res) { console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : '  ' + note)); if (!ok) bad++ }
console.log(`\n${res.length - bad}/${res.length} passed`); process.exit(bad ? 1 : 0)
