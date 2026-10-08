/* node tests/video-optional-test.js
   The hello video on the caregiver profile is optional (Samantha, 2026-10-08), and the office can tell every current
   caregiver once. The caregiver's page no longer requires it for current caregivers; the office panel no longer waits
   for it; the Profiles view has the one button; the journey lists the notice. No em dash in the new words. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'caregiver-profile.html'), 'utf8');
const panel = fs.readFileSync(path.join(ROOT, 'caregiver-profile-panel.js'), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 500))); };
const selfMode = page.slice(page.indexOf('function selfMode() {'), page.indexOf('}', page.indexOf("$('doneHead')")));
ck("the caregiver's page: a current caregiver is not told the video is needed", !/videoNeed/.test(selfMode));
const submit = page.slice(page.indexOf("const photo = $('photo').files[0], video = $('video').files[0];"), page.indexOf('let photo_path = null'));
ck("the caregiver's page: sending without a video is allowed for everyone", !/hello video \(about 30 seconds\)'\)/.test(submit) && /a photo of yourself/.test(submit));
ck("the caregiver's page says the video is if you like", page.includes('then add a photo (and a short hello video if you like)') && page.includes('If you would rather not be on camera, that is fine.'));
ck('the office panel: sent in and ready to check without a video', panel.includes("if (row.submitted_at && row.photo_path && row.consent) return ['Sent in: check and publish'") && panel.includes("if (row && row.submitted_at && row.photo_path && row.consent) return 'check';"));
ck('the office panel says the video is if they like', panel.includes('a photo (required) and a short hello video if they like'));
ck('the Profiles view has the one button, and it is on CGP2', panel.includes('onclick="CGP2.noticeSend(this)">📣 Tell everyone the video is optional</button>') && panel.includes('noticeSend: noticeSend,'));
const ns = panel.slice(panel.indexOf('async function noticeSend(btn) {'), panel.indexOf('root.CGP2 = {'));
ck('the words come from the server (dry) and are shown before anyone is sent to', /action: 'notice', kind: 'video_optional', first: 'Sam', dry: true/.test(ns) && /Send to ' \+ reach\.length/.test(ns));
ck('one call per caregiver, with their id, mobile and email; already-told people are skipped; results listed', /axiscare_id: String\(p\.id\)/.test(ns) && /if \(r\.already\) \{ already\+\+; continue; \}/.test(ns) && /Not everything went/.test(ns) && /Can\\'t be reached/.test(ns));
ck('a warning outside 8am to 6pm', /outside 8am to 6pm, so only the emails would go now/.test(ns));
const w = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'applicant-journey.js'), 'utf8'))(w);
const j = w.AP_JOURNEY.find((e) => e.order === 36), c = w.AP_JOURNEY.find((e) => e.order === 35);
ck('the journey lists the notice: once per person, text + email, the button', j && /once per person/i.test(j.timing) && j.channel === 'text + email' && /Tell everyone the video is optional/.test(j.button) && /Reply STOP to opt out\.$/.test(j.text), j);
ck('the journey catch-up entry says the video is if you like', c && /and a short hello video if you like/.test(c.text) && c.subject === 'Your Caring Companions profile: 3 questions and a photo', c);
ck('no em dash in the new words', !/—/.test(ns + selfMode + (j ? JSON.stringify(j) : '')));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
