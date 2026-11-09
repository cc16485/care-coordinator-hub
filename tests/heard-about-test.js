// heard-about.js (2026-11-09): run `node tests/heard-about-test.js`
const H = require('../heard-about.js'); const fs = require('fs');
let p = 0, f = 0; const ok = (n, c) => { if (c) p++; else { f++; console.log('FAIL', n); } };
ok('seven choices', H.OPTIONS.length === 7);
ok('label', H.label('youtube') === 'YouTube' && H.label('nope') === '');
ok('options html has not asked first', /^<option value="">Not asked yet<\/option>/.test(H.optionsHtml('')));
ok('selected', H.optionsHtml('google').includes('value="google" selected'));
const c = H.count([{ heard_about: 'youtube' }, { heard_about: 'youtube' }, { heard_about: '' }, {}, { heard_about: 'junk' }, { heard_about: 'friend' }]);
ok('count total', c.total === 6); ok('count youtube', c.by.youtube === 2); ok('count friend', c.by.friend === 1); ok('not asked incl junk', c.not_asked === 3);
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
ok('form has the select', html.includes('<select id="lead_heard_about"></select>'));
ok('field table saves it', html.includes("['heard_about','lead_heard_about','raw','']"));
ok('profile chapter edits it', /const LPI_CALLER=\[[^\]]*'heard_about'\]/.test(html));
ok('script loaded', html.includes('<script src="heard-about.js?v=1"></script>'));
ok('no em dash in file', !fs.readFileSync(__dirname + '/../heard-about.js', 'utf8').includes('—'));
console.log(p + ' passed, ' + f + ' failed'); process.exit(f ? 1 : 0);
