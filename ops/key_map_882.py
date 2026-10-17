#!/usr/bin/env python3
# 882 · REGISTER EVERY HUB STORAGE SLOT (approved by Samantha 2026-10-17).
# Her header read "Save failed · server rejected the change · 24 waiting". The shared database refuses any app_data key
# that has no row in app_data_key_hub_map (fail closed, by design since August). Keys added since (medicaid_plans,
# visit_watch, ghe_watch, call_lead_marks and others) never got one, so every save to them was refused and kept in her
# browser. This step:
#   1. reads the live map and compares it with app-data-keys.json (every key the Hub pages read or save);
#   2. gives each key with NO row at all one row for the Care Coordinator Hub. Rows already there are never touched,
#      and the owner-money, people and evidence keys are never added here;
#   3. adds app_data_keys_unmapped(keys), so the Hub can say at sign-in which slots the database would refuse;
#   4. proves it: acting as Samantha and as Krystal, saves a test record to every newly registered key inside a
#      transaction that is then thrown away (nothing test-saved stays), and checks the new function answers.
# Reading and the proof change nothing. Step 2 and 3 are the only changes. Texts and emails nobody.
import json, os, sys, urllib.request, urllib.error, datetime as dt
REPORT = os.environ["SB_REPORT"]; TOKEN = os.environ.get("SB_TOKEN", "").strip().strip('"').strip("'")
REF = os.environ.get("SB_REF", "zngsgedlsxinbygwmxwn"); LOCAL = os.environ.get("SB_LOCAL_SOCK")
API = os.environ.get("SB_API_BASE", "https://api.supabase.com"); KEYS_FILE = os.environ["SB_KEYS_FILE"]
lines = []
def say(s=""): print(s); lines.append(s)
def done(code): open(REPORT, "w").write("\n".join(lines) + "\n"); raise SystemExit(code)
def _crash(t, e, tb):
    say(); say("  ✗ STOPPED unexpectedly: " + type(e).__name__ + ": " + str(e)[:300])
    try: open(REPORT, "w").write("\n".join(lines) + "\n")
    except Exception: pass
sys.excepthook = _crash

def _run(q):
    if LOCAL:
        from pg8000.native import Connection, DatabaseError
        c = Connection(user="postgres", database="postgres", unix_sock=LOCAL)
        try: rows = c.run(q); cols = [d["name"] for d in (c.columns or [])]; return 200, [dict(zip(cols, r)) for r in (rows or [])]
        except DatabaseError as e: return 400, str(e)
        finally: c.close()
    req = urllib.request.Request(API + f"/v1/projects/{REF}/database/query", data=json.dumps({"query": q}).encode(), method="POST",
        headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json", "User-Agent": "cc-882/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r: return r.status, json.loads(r.read().decode(errors="replace"))
    except urllib.error.HTTPError as e: return e.code, e.read().decode(errors="replace")
    except Exception as e: return None, type(e).__name__ + ": " + str(e)[:200]
def sql(q):
    s, b = _run(q)
    return (True, b) if s in (200, 201) and isinstance(b, list) else (False, str(b)[:300])
def probe(q):
    s, b = _run(q)
    t = b if isinstance(b, str) else json.dumps(b)
    for cand in (t, t.replace('\\"', '"')):
        if "PROBE_RESULT: " in cand:
            try: return json.JSONDecoder().raw_decode(cand[cand.index("PROBE_RESULT: ") + 14:])[0], None
            except Exception: continue
    return None, f"HTTP {s}: {t[:300]}"
lit = lambda k: "'" + k.replace("'", "''") + "'"
arr = lambda ks: "array[" + ", ".join(lit(k) for k in ks) + "]::text[]"

# Never added here: these are locked on purpose (owner money, one-person-at-a-time people lists, server-only evidence).
NEVER = {"finance_snapshots", "owner_settings", "budget_lines", "budget_actuals", "offboardings", "file_audits",
         "candidates", "caregivers", "caregiver_evidence_events", "caregiver_claim_links", "caregiver_claims", "calls_cache"}
HUB = "care_coordinator"
TESTERS = ["samantha@mo-care.com", "krystal@mo-care.com"]

say("882 · REGISTER EVERY HUB STORAGE SLOT")
say("Report " + dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC") + ("   (DISPOSABLE TEST DATABASE)" if LOCAL else ""))
keys = sorted(set(json.load(open(KEYS_FILE))["keys"]))
if not keys or any(not k.replace("_", "").isalnum() or k != k.lower() for k in keys): say("  ✗ The Hub's key list looks wrong. Nothing was changed."); done(1)
say(f"The Hub's pages use {len(keys)} storage slots (app-data-keys.json).")

# ── 1 · what the database knows today ────────────────────────────────────────
say(); say("1 · THE LIVE MAP")
ok, rows = sql("select data_key, hub_slug from public.app_data_key_hub_map order by 1, 2")
if not ok: say("  ✗ Could not read the map: " + rows); done(1)
mapped = {}
for r in rows: mapped.setdefault(r["data_key"], []).append(r["hub_slug"])
say(f"  {len(rows)} rows over {len(mapped)} keys.")
if not any(HUB in v for v in mapped.values()): say(f"  ✗ No key is mapped to '{HUB}' today, so the pattern to copy is missing. Nothing was changed."); done(1)
missing = [k for k in keys if k not in mapped]
left_alone = [k for k in missing if k in NEVER]
todo = [k for k in missing if k not in NEVER]
ok, have = sql(f"select key, case when jsonb_typeof(data) = 'array' then jsonb_array_length(data) else null end as n from public.app_data where key = any({arr(todo or ['-'])})")
have = {r["key"]: r["n"] for r in (have if ok else [])}
if not todo: say("  Every slot the Hub uses is already registered.")
else:
    say(f"  NOT REGISTERED, so every save to them is refused ({len(todo)}):")
    for k in todo: say(f"    · {k}" + (f"  (the database holds {have[k]} saved records under it)" if have.get(k) is not None else ("  (the database holds a record under it)" if k in have else "  (nothing saved under it yet)")))
if left_alone: say("  Locked on purpose, NOT added here (tell Claude if the Hub needs them): " + ", ".join(left_alone))

# ── 2 + 3 · the change ───────────────────────────────────────────────────────
say(); say("2 · REGISTERING")
if todo:
    ok, res = sql(f"insert into public.app_data_key_hub_map (data_key, hub_slug) select k, {lit(HUB)} from unnest({arr(todo)}) k on conflict do nothing returning data_key")
    if not ok: say("  ✗ Could not register them: " + res + ". Nothing was changed."); done(1)
    ok, back = sql(f"select data_key from public.app_data_key_hub_map where hub_slug = {lit(HUB)} and data_key = any({arr(todo)})")
    got = {r["data_key"] for r in (back if ok else [])}
    for k in todo: say(("  ✓ " if k in got else "  ✗ NOT registered: ") + k)
    if got != set(todo): say("  ✗ Read-back did not match. Show this report to Claude."); done(1)
else: say("  Nothing to register.")
ok_map, rows2 = sql("select count(*)::int as n from public.app_data_key_hub_map")
say(f"  Rows already there before: {len(rows)}; now: {rows2[0]['n'] if ok_map else '?'} (only additions, nothing changed or removed).")

say(); say("3 · THE SIGN-IN CHECK FOR THE HUB")
FN = f"""create or replace function public.app_data_keys_unmapped(p_keys text[]) returns text[]
  language sql stable security definer set search_path = pg_catalog, public as $f$
  select coalesce(array_agg(k order by k), '{{}}'::text[]) from (select distinct k from unnest(p_keys[1:500]) k) x
   where auth.uid() is not null and k is not null and not exists (select 1 from public.app_data_key_hub_map m where m.data_key = x.k)
$f$;
revoke all on function public.app_data_keys_unmapped(text[]) from public, anon;
grant execute on function public.app_data_keys_unmapped(text[]) to authenticated, service_role;
comment on function public.app_data_keys_unmapped(text[]) is '882 (2026-10-17): which of these app_data keys have no row in app_data_key_hub_map, so the database would refuse saves to them. Names only. Called by the CC Hub at sign-in.';
select 1 as ok"""
ok, res = sql(FN)
say("  ✓ app_data_keys_unmapped is in place (signed-in logins only; it answers with key names, never data)." if ok else "  ✗ Could not add it: " + res)
if not ok: done(1)

# ── 4 · the proof, thrown away ──────────────────────────────────────────────
say(); say("4 · PROOF (acting as each login inside a transaction that is thrown away; nothing test-saved stays)")
tests = todo or [k for k in keys if k in mapped and HUB in mapped[k] and k not in NEVER][:3]
PROBE = f"""do $p$
declare u record; k text; r jsonb := '{{}}'::jsonb; one jsonb; un text[]; anon_ok boolean;
begin
  for u in select id, lower(email) as email, coalesce(raw_app_meta_data, '{{}}'::jsonb) as md from auth.users where lower(email) = any({arr(TESTERS)}) loop
    perform set_config('request.jwt.claims', jsonb_build_object('sub', u.id, 'role', 'authenticated', 'aud', 'authenticated', 'email', u.email, 'app_metadata', u.md)::text, true);
    perform set_config('request.jwt.claim.sub', u.id::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;
    one := '{{}}'::jsonb;
    foreach k in array {arr(tests)} loop
      begin
        perform public.upsert_app_data_item(k, jsonb_build_object('id', '__probe_882', 'note', 'thrown away'));
        one := one || jsonb_build_object(k, (select exists (select 1 from public.app_data a, jsonb_array_elements(case when jsonb_typeof(a.data) = 'array' then a.data else '[]'::jsonb end) x where a.key = k and x->>'id' = '__probe_882')));
      exception when others then one := one || jsonb_build_object(k, 'refused: ' || left(sqlerrm, 120));
      end;
    end loop;
    un := public.app_data_keys_unmapped({arr(keys)});
    reset role;
    r := r || jsonb_build_object(u.email, jsonb_build_object('saves', one, 'unmapped', to_jsonb(un)));
  end loop;
  anon_ok := has_function_privilege('anon', 'public.app_data_keys_unmapped(text[])', 'execute');
  r := r || jsonb_build_object('_anon_can_call', anon_ok);
  raise exception 'PROBE_RESULT: %', r;
end $p$"""
res, err = probe(PROBE)
if res is None: say("  ✗ The proof could not run: " + (err or "")); done(1)
bad = 0
for who in TESTERS:
    x = res.get(who)
    if x is None: say(f"  · {who}: no such login, skipped"); continue
    saves = x.get("saves", {}); refused = [k for k, v in saves.items() if v is not True]
    bad += len(refused)
    say(f"  · {who}: {len(saves) - len(refused)} of {len(saves)} test saves went through" + (" · REFUSED: " + "; ".join(f"{k} ({saves[k]})" for k in refused) if refused else ""))
    if who == "samantha@mo-care.com":
        un = x.get("unmapped") or []
        say("    sign-in check answers: " + ("every slot registered" if not un else "still not registered: " + ", ".join(un)))
        if un and set(un) - set(left_alone): bad += 1
if res.get("_anon_can_call"): say("  ✗ A visitor who is not signed in can call the new check."); bad += 1
else: say("  ✓ A visitor who is not signed in cannot call the new check.")
say("  The test saves were thrown away with the transaction.")

say()
if bad: say("✗ NOT DONE: something above was refused. Show this report to Claude. Your 24 waiting changes are still safe in your browser."); done(1)
say("✓ DONE. Now reload the Care Coordinator Hub page. The waiting changes are sent again on their own and the chip")
say("  at the top should turn to ☁ Synced. If it still shows red, click it and press Try again now, then show Claude the panel.")
done(0)
