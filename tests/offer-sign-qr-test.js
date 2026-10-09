/* node tests/offer-sign-qr-test.js
   The signing link as a QR code (2026-10-09: getting the link from the Hub onto a phone was the hard part of the
   Slice 1b test). Drawn on screen by the vendored MIT qrcode-generator; nothing leaves the page. */
const fs = require('fs'), path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 400))); };
ck('the QR library is vendored and loaded by the Hub page', fs.existsSync(path.join(__dirname, '..', 'qrcode.js')) && /<script src="qrcode\.js\?v=\d+"><\/script>/.test(html));
ck('the vendored file keeps its MIT notice', /Licensed under the MIT license/.test(fs.readFileSync(path.join(__dirname, '..', 'qrcode.js'), 'utf8')));
const fn = js.slice(js.indexOf('async function offerSignLink('), js.indexOf('function offerCopyLink('));
ck('the signing-link box draws the QR code next to Copy', /offerQr\(url\)/.test(fn) && /point a phone camera at the code/.test(fn));
const qr = js.slice(js.indexOf('function offerQr('), js.indexOf('function offerCopyLink('));
ck('the QR is an inline SVG made on the page, medium error correction, and degrades to nothing if the library is missing', /qrcode\(0, 'M'\)/.test(qr) && /createSvgTag\(/.test(qr) && /typeof qrcode !== 'function'\) return ''/.test(qr));
const q = require(path.join(__dirname, '..', 'qrcode.js'));
const url = 'https://cc.mo-care.com/offer.html?o=21748202-f0f6-47b5-8e04-723eab433b1c&e=1792620000&t=HjH1ri9NWKm_1IBbIWXEY_YEO-eUbywd_3eWgJKx-6U';
const c = q(0, 'M'); c.addData(url); c.make();
ck('a real-length signing link fits one QR code of a scannable size (version 7, 45 modules, or smaller)', c.getModuleCount() <= 49 && /<svg/.test(c.createSvgTag(3, 2, 'a', 'b')));
ck('the helper is exposed to the page', /window\.offerQr = offerQr;/.test(js));
ck('no em dash in the new words', !/—/.test(fn) && !/—/.test(qr));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
