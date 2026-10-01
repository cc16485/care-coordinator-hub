// Loads caregivers-engine.js in a sandbox with a fake Supabase + permissive DOM.
const vm = require('vm'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
process.on('unhandledRejection', e => { if (process.env.CGDEBUG) console.warn('[unhandled]', e && e.message); });
function domProxy() {
  const fn = function(){};
  const store = {};
  return new Proxy(fn, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => '';
      if (k === Symbol.iterator) return function*(){};
      if (k === 'then') return undefined;
      if (k in store) return store[k];
      if (k === 'length') return 0;
      return domProxy();
    },
    set(t, k, v) { store[k] = v; return true; },
    apply() { return domProxy(); },
  });
}
function makeSb(store, log) {
  const res = (data, error=null) => ({ data, error });
  function builder(table) {
    const q = { table, filters: [], inKeys: null, single: false, op: 'select', payload: null };
    const b = {
      select(){ return b; }, order(){ return b; }, limit(){ return b; }, gte(){ return b; }, lte(){ return b; }, neq(){ return b; }, is(){ return b; }, not(){ return b; }, or(){ return b; }, ilike(){ return b; }, match(){ return b; }, range(){ return b; },
      eq(k, v){ q.filters.push([k, v]); return b; },
      in(k, v){ q.inKeys = v; return b; },
      single(){ q.single = true; return b; }, maybeSingle(){ q.single = true; return b; },
      upsert(p){ q.op = 'upsert'; q.payload = p; return b; },
      insert(p){ q.op = 'insert'; q.payload = p; return b; },
      update(p){ q.op = 'update'; q.payload = p; return b; },
      delete(){ q.op = 'delete'; return b; },
      then(ok, bad){ return Promise.resolve(run()).then(ok, bad); },
    };
    function run() {
      if (table !== 'app_data') return res(q.single ? null : []);
      if (q.op === 'upsert') { const rows = Array.isArray(q.payload) ? q.payload : [q.payload]; rows.forEach(r => { store[r.key] = JSON.parse(JSON.stringify(r.data)); log.push(['upsert', r.key]); }); return res(null); }
      if (q.op !== 'select') return res(null);
      if (store.__failRead) return res(null, { message: 'offline' });
      let rows = Object.keys(store).filter(k => k !== '__failRead').map(k => ({ key: k, data: JSON.parse(JSON.stringify(store[k])) }));
      q.filters.forEach(([k, v]) => { rows = rows.filter(r => r[k] === v); });
      if (q.inKeys) rows = rows.filter(r => q.inKeys.includes(r.key));
      if (q.single) return rows[0] ? res(rows[0]) : res(null, { message: 'no rows' });
      return res(rows);
    }
    return b;
  }
  return {
    auth: { getSession: async () => ({ data: { session: { access_token: 't', user: { email: 'tester@example.com', app_metadata: {} } } } }), onAuthStateChange(){ return { data: { subscription: { unsubscribe(){} } } }; }, signOut: async () => ({}) },
    from: builder,
    rpc: async (name, args) => {
      log.push(['rpc', name, args && args.target_key, args && args.item && args.item.id]);
      if (name === 'upsert_app_data_item') {
        const arr = Array.isArray(store[args.target_key]) ? store[args.target_key] : (store[args.target_key] = []);
        const i = arr.findIndex(x => x && x.id === args.item.id);
        const item = JSON.parse(JSON.stringify(args.item));
        if (i >= 0) arr[i] = item; else arr.push(item);
      }
      return { data: null, error: null };
    },
    functions: { invoke: async () => ({ data: {}, error: null }) },
    storage: { from(){ return { createSignedUrl: async()=>({data:null,error:null}), upload: async()=>({data:null,error:null}) }; } },
    channel(){ const c = { on(){ return c; }, subscribe(){ return c; } }; return c; },
    removeChannel(){},
  };
}
async function loadEngine(file, store, opts = {}) {
  const log = [];
  const ls = {}; Object.assign(ls, opts.local || {});
  const listeners = {};
  const sandbox = {
    console: opts.quiet === false ? console : { log(){}, warn(){}, error(){}, info(){} },
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval(){}, Promise, Date, JSON, Math,
    localStorage: { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: k => { delete ls[k]; } },
    sessionStorage: { getItem: () => null, setItem(){}, removeItem(){} },
    document: domProxy(),
    navigator: { clipboard: { writeText: async()=>{} }, userAgent: 'node' },
    location: { href: 'https://x/', hash: '', search: '', origin: 'https://x', pathname: '/' },
    confirm: () => true, alert: () => {}, prompt: () => null,
    fetch: async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => '' }),
    Event: class { constructor(t){ this.type = t; } },
    CustomEvent: class { constructor(t, o){ this.type = t; this.detail = o && o.detail; } },
    URL, URLSearchParams, Blob: class {}, FormData: class {}, atob: s => Buffer.from(s, 'base64').toString('binary'), btoa: s => Buffer.from(s, 'binary').toString('base64'),
    supabase: { createClient: () => makeSb(store, log) },
    trainHubTok: async () => 'tok',
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
  sandbox.addEventListener = (t, f) => { (listeners[t] = listeners[t] || []).push(f); };
  sandbox.removeEventListener = (t, f) => { listeners[t] = (listeners[t] || []).filter(x => x !== f); };
  sandbox.dispatchEvent = e => { (listeners[e.type] || []).slice().forEach(f => { try { f(e); } catch (x) {} }); return true; };
  Object.assign(sandbox, opts.globals || {});
  vm.createContext(sandbox);
  for (const pre of [path.join(ROOT, 'obligations.js'), path.join(ROOT, 'eligibility-rules.js')]) vm.runInContext(fs.readFileSync(pre, 'utf8'), sandbox, { filename: pre });
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  // wait for hydration (if the new engine), or a few ticks for the old
  for (let i = 0; i < 200; i++) {
    if (sandbox.scxIsHydrated && sandbox.scxIsHydrated()) break;
    await new Promise(r => setTimeout(r, 5));
  }
  return { w: sandbox, ls, log, store };
}
module.exports = { loadEngine };
