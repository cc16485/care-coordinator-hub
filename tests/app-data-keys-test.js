/* node tests/app-data-keys-test.js          (check)
   node tests/app-data-keys-test.js --write  (rewrite app-data-keys.json from the code)
   2026-10-17: Samantha's header read "Save failed · server rejected the change · 24 waiting". Same cause as 2026-09-20:
   the shared database refuses any app_data key that has no row in app_data_key_hub_map (fail closed, by design), and
   keys added since (medicaid_plans, visit_watch, ghe_watch, call_lead_marks, ...) were never given one. Every save to
   them was refused and queued in her browser.
   app-data-keys.json is the list of every app_data key these pages read or save. This check fails when the code uses a
   key the list does not have. The fix is always two things: add the key to app-data-keys.json AND run the Desktop
   key-map step (882 Register Every Hub Storage Slot) so the database accepts it. The Hub also checks the live map at
   sign-in (app_data_keys_unmapped) and names any slot the database would refuse. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const LIST = path.join(ROOT, 'app-data-keys.json');

/* Every way a page names an app_data key. A new save helper that takes the key as its first argument goes in WRITERS. */
const WRITERS = ['persist', 'removeItem', 'attPersist', 'ccMergeSave', 'readKey', 'wholeSave', 'hlSetStatus', 'hlSeen', 'hlNote', 'hlDelete'];
const SIDE_PAGE_HELPERS = ['save', 'load', 'del', 'list'];   // game.html, guide.html, series417.html: own small helpers
const K = "'([a-z][a-z0-9_]*)'";
function extract() {
  const found = {};
  const add = (k, f) => { (found[k] = found[k] || new Set()).add(f); };
  const files = fs.readdirSync(ROOT).filter((f) => /\.(html|js)$/.test(f));
  for (const f of files) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (!/app_data/.test(s)) continue;
    const rx = [
      new RegExp('(?<![\\w.])(?:' + WRITERS.join('|') + ')\\(\\s*' + K, 'g'),
      new RegExp('target_key\\s*:\\s*' + K, 'g'),
      new RegExp('p_key\\s*:\\s*' + K, 'g'),
      new RegExp("from\\(\\s*'app_data'\\s*\\)[^;\\n]{0,120}?\\.eq\\(\\s*'key'\\s*,\\s*" + K, 'g')
    ];
    /* a key held in a constant (var KEY='ht_included') counts only when that constant is what the page reads app_data by */
    for (const m of s.matchAll(/\b([A-Z_]*KEY)\s*=\s*'([a-z][a-z0-9_]*)'/g))
      if (new RegExp("eq\\(\\s*'key'\\s*,\\s*" + m[1] + '\\b').test(s)) add(m[2], f);
    if (/function (save|load)\s*\(key/.test(s)) rx.push(new RegExp('(?<![\\w.])(?:' + SIDE_PAGE_HELPERS.join('|') + ')\\(\\s*' + K, 'g'));
    for (const r of rx) for (const m of s.matchAll(r)) add(m[1], f);
    for (const m of s.matchAll(/from\(\s*'app_data'\s*\)[^;\n]{0,120}?\.in\(\s*'key'\s*,\s*\[([^\]]*)\]/g))
      for (const x of m[1].matchAll(/'([a-z][a-z0-9_]*)'/g)) add(x[1], f);
    const wl = s.match(/const WHOLE_LABEL\s*=\s*\{([^}]*)\}/);
    if (wl) for (const x of wl[1].matchAll(/([a-z][a-z0-9_]*)\s*:/g)) add(x[1], f + ' (whole save)');
    const ld = f === 'index.html' && s.match(/async function loadAllData\(\)[\s\S]{0,600}?const keys = \[([^\]]+)\]/);
    if (ld) for (const x of ld[1].matchAll(/'([a-z][a-z0-9_]*)'/g)) add(x[1], 'index.html (loader)');
  }
  return found;
}
if (require.main === module) {
  const found = extract(), keys = Object.keys(found).sort();
  if (process.argv.includes('--write')) {
    fs.writeFileSync(LIST, JSON.stringify({ note: 'Every app_data key the Care Coordinator Hub pages read or save. Each one needs a row in app_data_key_hub_map or the database refuses it. Kept by tests/app-data-keys-test.js --write.', keys }, null, 2) + '\n');
    console.log('wrote ' + keys.length + ' keys to app-data-keys.json');
    process.exit(0);
  }
  let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + x)); };
  let listed = [];
  try { listed = JSON.parse(fs.readFileSync(LIST, 'utf8')).keys || []; } catch (e) { ck('app-data-keys.json reads', false, e.message); }
  const missing = keys.filter((k) => !listed.includes(k));
  ck('every app_data key the code uses is in app-data-keys.json (' + keys.length + ' keys)', !missing.length,
    missing.map((k) => k + ' [' + [...found[k]].join(', ') + ']').join('; ') + '  -> add it to app-data-keys.json (node tests/app-data-keys-test.js --write) AND run the Desktop key-map step so the database accepts it');
  ck('the list is sorted and has no repeats', JSON.stringify(listed) === JSON.stringify([...new Set(listed)].sort()));
  ck('the keys that broke on 2026-10-17 are found', ['medicaid_plans', 'visit_watch', 'ghe_watch', 'call_lead_marks'].every((k) => keys.includes(k)));
  ck('another table\'s key column is not mistaken for app_data (activity_types "interview")', !keys.includes('interview'));
  ck('the side pages\' own slots are found (game, guide, series)', ['memory_clients', 'guide_screens', 'pro_videos', 'ht_included'].every((k) => keys.includes(k)));
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ck('the Hub checks the live map at sign-in', /app_data_keys_unmapped/.test(idx) && /app-data-keys\.json/.test(idx));
  console.log(`app-data-keys: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
}
module.exports = { extract };
