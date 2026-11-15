// 2026-11-15: a caregiver's page opened documents with bgrViewProof, which only exists
// after caregivers-engine.js loads ("bgrViewProof is not defined" on the FCSR document).
// Every document link on the caregiver page now goes through phdOpen, which is always there.
const fs = require('fs');
const s = fs.readFileSync(__dirname + '/../index.html', 'utf8');
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const calls = (s.match(/bgrViewProof/g) || []).length;
ok(calls === 2 && s.includes("if(typeof window.bgrViewProof==='function') return window.bgrViewProof(path);"), 'index.html only touches bgrViewProof inside phdOpen (found ' + calls + ')');
const fn = s.slice(s.indexOf('async function phdOpen('), s.indexOf('function phdLink('));
ok(/\^training:/.test(fn) && /https\?/.test(fn) && /createSignedUrl/.test(fn), 'phdOpen opens training, web links and stored files by itself');
ok(/onclick="phdOpen\(\\''\+esc\(String\(o\.proof\)\)/.test(s), 'pre-hire check document link uses phdOpen');
ok(/function cgdRefPdf\(i\)\{[^}]*phdOpen\(r\.pdf\)/.test(s), 'reference PDF uses phdOpen');
ok(/onclick="phdOpen\(\\''\+esc\(String\(proof\)\)[^>]*>on file, open/.test(s), 'compliance evidence always opens');
if (bad) process.exit(1);
