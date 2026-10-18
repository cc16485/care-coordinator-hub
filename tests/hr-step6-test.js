// HR Agent step 6 (2026-10-18): formal cases. node tests/hr-step6-test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const H = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), E = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8'), J = fs.readFileSync(path.join(ROOT, 'hr.js'), 'utf8');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : String(d === undefined ? '' : d).slice(0, 300)]);
ck('the write-up window has room for the checklist and the audit trail', H.includes('<div id="writeup-check"></div>') && H.includes('id="writeup-audit-list"'));
ck('the checklist has the four items', ['wuFacts', 'wuHb', 'wuExText', 'wuExNo', 'wuProtected()'].every((x) => E.includes(x)));
ck('Send for approval refuses until the four items are in, and saves what was typed', /missingBeforeDecision\(a\):\[\];\s*if\(miss\.length\)\{ await attPersist\('discipline_actions',a\);[^]*Before it goes for approval, fill in: /.test(E));
ck('Mark issued refuses too (fails closed if the rules did not load)', E.includes("This can\\'t be issued yet. Missing: ") && E.includes("['the write-up rules (reload the page)']"));
ck('Draft with AI calls hr-draft with the signed-in session and only fills the box', E.includes("sb.functions.invoke('hr-draft',{ body:{ id:a.id } })") && E.includes('box.value=data.draft;') && E.includes('nothing is saved until you press Save'));
ck('...it saves the checklist first so the AI sees their side and the section', /if\(!\(await wuSave\(true\)\)\) return;\s*btn\.disabled=true/.test(E));
ck('...and asks before replacing text already in the box', E.includes('Replace the text in the box with an AI draft?'));
ck('the audit trail reads hr_formal_log for this write-up', E.includes("from('hr_formal_log').select('at,by_email,action,changes').eq('item_id', id)"));
ck('only owners see the checklist', E.includes("ck.innerHTML=attCanDecide()?wuCheckHtml(a):''"));
ck('the HR page starts a formal case only from a recurring or serious case, and only owners', J.includes("if (!owner() || (c.kind !== 'recurring' && c.kind !== 'serious')) return ''"));
ck('...a serious case starts as a termination review; a recurring one at the next step on the ladder', J.includes("c.kind === 'serious' ? 'Termination Review' : LADDER[Math.min(issued, 3)]"));
ck('...it never starts two for the same case', J.includes("if (window.SCX.hasCase(c.id))"));
ck('...and leaves the handbook section for Zach to pick', !/handbook: \{ section/.test(J.slice(J.indexOf('async function startFormal'), J.indexOf('async function openFormal'))));
ck('the engine lets the HR page add and open a write-up', E.includes('window.SCX.addWriteup = async (a) =>') && E.includes('window.SCX.openWriteup = (id) => openWriteup(id);'));
ck('the rules file is cache-busted to v4', H.includes('writeup-rules.js?v=4'));
ck('no em dashes in the new code', !/—/.test(E.slice(E.indexOf('let WU_HB=null;'), E.indexOf('function openWriteup(id){'))) && !/—/.test(J));
let f = 0; for (const [n, ok, d] of res) { console.log((ok ? 'PASS' : 'FAIL') + ' · ' + n + (ok ? '' : '  ' + d)); if (!ok) f++; }
console.log((res.length - f) + '/' + res.length); process.exit(f ? 1 : 0);
