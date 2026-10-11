// 582 · Phase 1 Slice 3: the Hub side of the door. Runs the REAL callAction, lpfCall and ucPlace from index.html with a
// fake sign-in and a fake network, and checks that every field the Hub sends to client-fact and call-place is one the
// door declares (the door refuses anything else by name).
//   node tests/door-callaction-582-test.js            (from the repo root)
//   STAFFING=<path to Staffing-Coordinator-Hub> node tests/door-callaction-582-test.js   also compares with the server's declarations
const fs = require('fs'), path = require('path'), vm = require('vm');
const res = []; const ck = (n, c, note) => res.push([n, !!c, c ? '' : JSON.stringify(note ?? null).slice(0, 500)]);
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const cut = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a); if (a < 0 || b < 0) throw new Error('missing ' + from); return html.slice(a, b); };
const code = cut('async function callAction(fn, body){', 'function lpfLabel(') + cut('async function ucPlace(body){', 'async function ucPick(');
(async () => {
  // ── 1. the helpers, with a fake network ──
  const SENT = []; let mode = 'ok';
  const ctx = { CONFIG: { supabase_url: 'https://x.supabase.co', supabase_anon_key: 'anon' }, location: { search: '' }, crypto: { randomUUID: () => 'u-' + (SENT.length + 1) + '-0000-0000' }, console,
    sb: { auth: { getSession: async () => ({ data: { session: mode === 'nosession' ? null : { access_token: 'tok' } } }) } },
    fetch: async (url, o) => { SENT.push({ url, o, body: JSON.parse(o.body) });
      if (mode === 'drop' && SENT.length === 1) throw new TypeError('Failed to fetch');
      const b = JSON.parse(o.body); return { status: 200, json: async () => ({ outcome: url.endsWith('call-place') ? 'placed' : 'recorded', request_id: b.request_id }) }; } };
  vm.createContext(ctx); vm.runInContext(code + '\nthis.callAction=callAction; this.lpfCall=lpfCall; this.ucPlace=ucPlace;', ctx);
  let d = await ctx.lpfCall({ action: 'record', episode_id: 'e1', kind: 'falls' });
  ck('lpfCall goes through callAction to client-fact, with a request id, the sign-in token and via hub', SENT.length === 1 && SENT[0].url === 'https://x.supabase.co/functions/v1/client-fact' && /^r-u-1/.test(SENT[0].body.request_id)
    && SENT[0].o.headers.Authorization === 'Bearer tok' && SENT[0].o.headers['x-cc-via'] === 'hub' && d.outcome === 'recorded', SENT);
  ck('the page never sends who it is (no recorder, email or name of the person saving)', !('recorded_by' in SENT[0].body) && !('by' in SENT[0].body) && !('email' in SENT[0].body));
  SENT.length = 0; mode = 'drop';
  d = await ctx.lpfCall({ action: 'record', episode_id: 'e1', kind: 'falls' });
  ck('the network drops: it retries ONCE with the SAME request id (so the door can never record twice)', SENT.length === 2 && SENT[0].body.request_id === SENT[1].body.request_id && d.outcome === 'recorded', SENT.map((x) => x.body.request_id));
  SENT.length = 0; mode = 'ok';
  await ctx.lpfCall({ action: 'record' }); await ctx.lpfCall({ action: 'record' });
  ck('two separate presses get two different request ids', SENT[0].body.request_id !== SENT[1].body.request_id);
  SENT.length = 0; ctx.location.search = '?m=1';
  const u = await ctx.ucPlace({ call_ids: [4], decision: 'not_ours' });
  ck('ucPlace goes through callAction to call-place, names the action, says via phone in phone mode', SENT[0].url.endsWith('/call-place') && SENT[0].body.action === 'place' && SENT[0].o.headers['x-cc-via'] === 'phone' && u.outcome === 'placed', SENT);
  mode = 'nosession'; let err = ''; try { await ctx.lpfCall({ action: 'record' }); } catch (e) { err = e.message; }
  const u2 = await ctx.ucPlace({ call_ids: [4], decision: 'not_ours' });
  ck('no sign-in: lpfCall says "Sign in first." and ucPlace answers it as an error, as before', err === 'Sign in first.' && u2.error === 'Sign in first.', [err, u2]);
  ck('the page carries the 582 marker the Desktop step looks for', /CC_DOOR_582/.test(html));
  ck('no other page code calls client-fact or call-place directly any more', (html.match(/functions\/v1\/(client-fact|call-place)/g) || []).length === 0);

  // ── 2. every field the Hub sends is declared ──
  const keysIn = (src) => [...src.matchAll(/(?:[{,]\s*)([a-z_]+)\s*:/g)].map((m) => m[1]);
  const calls = [...html.matchAll(/lpfCall\(\{([\s\S]*?)\}\)/g)].map((m) => m[1]);
  const personBody = cut("const body={ action:'record_person'", 'if(note) note.textContent=\'Saving');
  const factKeys = new Set(calls.filter((c) => /action:'record'/.test(c)).flatMap(keysIn));
  const beganKeys = new Set(calls.filter((c) => /action:'care_began'/.test(c)).flatMap(keysIn));
  const personKeys = new Set(keysIn(personBody.replace(/\?[^:]*:/g, ',')).filter((k) => !['f', 'v'].includes(k)));
  const placeSrc = cut('async function ucPick(i, anchor){', '\n}\n');
  const placeKeys = new Set([...placeSrc.matchAll(/go\(\{([^}]*)\}\)/g)].flatMap((m) => keysIn('{' + m[1])).concat(['call_ids']));
  const FACT = ['action', 'episode_id', 'kind', 'layer', 'value', 'certainty', 'change_kind', 'supersedes_fact_id', 'reason', 'said_by', 'said_by_relationship', 'said_how', 'said_at', 'words', 'source_ref'];
  const PERSON = ['action', 'episode_id', 'person_key', 'supersedes_row_id', 'is_caller', 'name', 'relationship', 'organization', 'roles', 'phone', 'email', 'reach_way', 'reach_time', 'permission', 'permission_asked_by', 'permission_asked_at', 'change_kind', 'reason'];
  const PLACE = ['call_ids', 'decision', 'lead_id', 'person_id', 'axiscare_client_id', 'note'];
  const extra = (s, ok) => [...s].filter((k) => !ok.includes(k));
  ck('every field the Hub sends with a fact is declared by the door', factKeys.size > 5 && !extra(factKeys, FACT).length, [...factKeys], extra(factKeys, FACT));
  ck('every field the Hub sends for "has care begun" is declared', beganKeys.size && !extra(beganKeys, ['action', 'episode_id']).length, [...beganKeys]);
  ck('every field the Hub sends for a person on the Journey is declared', personKeys.size > 10 && !extra(personKeys, PERSON).length, extra(personKeys, PERSON));
  ck('every field the Hub sends to place a call is declared', placeKeys.size >= 4 && !extra(placeKeys, PLACE).length, extra(placeKeys, PLACE));
  if (process.env.STAFFING) {
    const cf = fs.readFileSync(path.join(process.env.STAFFING, 'supabase/functions/client-fact/index.ts'), 'utf8');
    const cp = fs.readFileSync(path.join(process.env.STAFFING, 'supabase/functions/call-place/index.ts'), 'utf8');
    const decl = (src, name) => { const m = src.match(new RegExp(name + '[^{]*\\{([\\s\\S]*?)\\n\\}')); return m ? [...m[1].matchAll(/([a-z_]+): T\(/g)].map((x) => x[1]) : []; };
    const placeDecl = [...(cp.match(/inputs: \{([^}]*)\}/) || ['', ''])[1].matchAll(/([a-z_]+): T\(/g)].map((x) => x[1]);
    ck('STAFFING: this list matches the server\'s declarations exactly', JSON.stringify(decl(cf, 'const FACT_INPUTS').sort()) === JSON.stringify(FACT.filter((k) => k !== 'action').sort())
      && JSON.stringify(decl(cf, 'const PERSON_INPUTS').sort()) === JSON.stringify(PERSON.filter((k) => k !== 'action').sort()) && JSON.stringify(placeDecl.sort()) === JSON.stringify([...PLACE].sort()),
      [decl(cf, 'const FACT_INPUTS'), decl(cf, 'const PERSON_INPUTS'), placeDecl]);
  }
  const failed = res.filter((r) => !r[1]);
  for (const [n, ok, note] of res) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '\n      ' + note}`);
  console.log(`\n${res.length - failed.length}/${res.length} passed${failed.length ? ' · FAIL' : ''}`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.log('FAIL  crashed: ' + e.message); process.exit(1); });
