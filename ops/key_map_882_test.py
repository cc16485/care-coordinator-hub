#!/usr/bin/env python3
# python3 ops/key_map_882_test.py   (needs: pip install pgserver pg8000)
# Rehearses 882 against a throwaway local Postgres set up like the shared hub project: the fail-closed key map, the
# hub-scoped row rule, and upsert_app_data_item running as the caller. Made-up people only.
import os, json, glob, shutil, subprocess, sys, tempfile, uuid
import pgserver
from pg8000.native import Connection, DatabaseError
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
D = tempfile.mkdtemp(prefix="cc882-"); srv = pgserver.get_server(D)
host = [kv[5:] for kv in srv.get_uri().split("?", 1)[1].split("&") if kv.startswith("host=")][0]
SOCK = [p for p in glob.glob(os.path.join(host, ".s.PGSQL.*")) if not p.endswith(".lock")][0]
conn = lambda: Connection(user="postgres", database="postgres", unix_sock=SOCK)
c = conn()
c.run("drop schema if exists public cascade; drop schema if exists auth cascade; create schema public; create schema auth")
for r in ("anon", "authenticated", "service_role"):
    try: c.run(f"create role {r}")
    except DatabaseError: pass
c.run("alter role service_role bypassrls")
c.run("grant usage on schema public, auth to anon, authenticated, service_role")
c.run("create table auth.users(id uuid primary key, email text, raw_app_meta_data jsonb)")
c.run("""create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$""")
c.run("""create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb $$""")
c.run("grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role")
c.run("create function public.jwt_hub_access() returns jsonb language sql stable as $$ select nullif(auth.jwt() -> 'app_metadata' -> 'hub_access', 'null'::jsonb) $$")
SAM, KRY = str(uuid.uuid4()), str(uuid.uuid4())
c.run("insert into auth.users values (:a, 'samantha@mo-care.com', :m), (:b, 'krystal@mo-care.com', :n)",
      a=SAM, m=json.dumps({"hub_access": ["care_coordinator", "staffing", "team_hub", "core"]}), b=KRY, n=json.dumps({"hub_access": ["care_coordinator", "staffing", "team_hub"]}))
c.run("create table public.app_data(key text primary key, data jsonb, updated_at timestamptz default now())")
c.run("create table public.app_data_key_hub_map(data_key text, hub_slug text, primary key (data_key, hub_slug))")
MAPPED = {"leads": ["care_coordinator"], "ops_items": ["care_coordinator", "team_hub"], "ops_settings": ["care_coordinator", "team_hub"],
          "caregivers": ["care_coordinator", "staffing"], "settings": ["staffing"], "calls_cache": ["server_only"]}
for k, hs in MAPPED.items():
    for h in hs: c.run("insert into public.app_data_key_hub_map values (:k, :h)", k=k, h=h)
c.run("""insert into public.app_data values ('leads', '[{"id":"L1"}]'), ('ops_items', '[]'), ('medicaid_plans', '[{"id":"P1","client":"made up"}]')""")
c.run("grant select, insert, update, delete on public.app_data to authenticated")
c.run("""create function public.can_access_data_key(k text) returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select public.jwt_hub_access() is null or exists (select 1 from public.app_data_key_hub_map m where m.data_key = k and public.jwt_hub_access() ? m.hub_slug) $$""")
c.run("alter table public.app_data enable row level security")
c.run('create policy "Hub-scoped read/write" on public.app_data for all to authenticated using (public.can_access_data_key(key)) with check (public.can_access_data_key(key))')
c.run("create policy app_data_people_lock_upd on public.app_data as restrictive for update to authenticated using (key <> all (array['candidates','caregivers'])) with check (key <> all (array['candidates','caregivers']))")
c.run("create policy app_data_people_lock_ins on public.app_data as restrictive for insert to authenticated with check (key <> all (array['candidates','caregivers']))")
c.run("""create function public.upsert_app_data_item(target_key text, item jsonb) returns void language plpgsql security invoker as $$
declare d jsonb; begin
  select data into d from public.app_data where key = target_key for update;
  if d is null then insert into public.app_data(key, data) values (target_key, jsonb_build_array(item)); return; end if;
  update public.app_data set data = (select coalesce(jsonb_agg(case when x->>'id' = item->>'id' then item else x end), '[]'::jsonb) from jsonb_array_elements(d) x)
       || case when exists (select 1 from jsonb_array_elements(d) x where x->>'id' = item->>'id') then '[]'::jsonb else jsonb_build_array(item) end
   where key = target_key; end $$""")
c.run("grant execute on function public.upsert_app_data_item(text, jsonb) to authenticated")
c.close()

res = []
def ck(n, cond, d=""): res.append((n, bool(cond), "" if cond else str(d)[:600]))
def as_sam(q):
    cc = conn()
    try:
        cc.run("begin"); cc.run("set local role authenticated")
        cc.run("select set_config('request.jwt.claims', :c, true)", c=json.dumps({"sub": SAM, "role": "authenticated", "app_metadata": {"hub_access": ["care_coordinator", "staffing", "team_hub", "core"]}}))
        out = cc.run(q); cc.run("commit"); return ("ok", out)
    except DatabaseError as e:
        try: cc.run("rollback")
        except Exception: pass
        return ("refused", str(e))
    finally: cc.close()
def q1(q):
    cc = conn()
    try: return cc.run(q)
    finally: cc.close()
CMD = os.environ.get("CMD")   # rehearse the real Desktop .command (a copy pinned to this commit) instead of the script alone
def run882(tag):
    rep = os.path.join(D, f"report-{tag}.txt")
    if CMD:
        p = subprocess.run(["zsh", CMD], input="sbp_rehearsal\n\n", capture_output=True, text=True, env=dict(os.environ, SB_LOCAL_SOCK=SOCK))
        reps = sorted(glob.glob(os.path.join(os.environ["CMD_REPORT_DIR"], "Register every Hub storage slot 882 report *.txt")), key=os.path.getmtime)
        return p.returncode, (open(reps[-1]).read() if reps else p.stdout + p.stderr)
    p = subprocess.run([sys.executable, os.path.join(HERE, "key_map_882.py")], capture_output=True, text=True,
                       env=dict(os.environ, SB_LOCAL_SOCK=SOCK, SB_REPORT=rep, SB_KEYS_FILE=os.path.join(ROOT, "app-data-keys.json")))
    return p.returncode, (open(rep).read() if os.path.exists(rep) else p.stdout + p.stderr)

r = as_sam("""select public.upsert_app_data_item('medicaid_plans', '{"id":"P2"}'::jsonb)""")
ck("before: Samantha's save to medicaid_plans is refused (the 10-17 chip)", r[0] == "refused" and "row-level security" in r[1], r)
r = as_sam("""select public.upsert_app_data_item('call_lead_marks', '{"id":"C1","verdict":"not"}'::jsonb)""")
ck("before: a 'Not a lead' mark is refused too", r[0] == "refused", r)
before = q1("select data_key, hub_slug from public.app_data_key_hub_map order by 1, 2")
code, out = run882("first")
ck("882 runs and says DONE", code == 0 and "✓ DONE" in out, out[-1500:])
ck("it names the unregistered slots", "medicaid_plans" in out and "call_lead_marks" in out and "visit_watch" in out, out[:1500])
ck("it says how many records already sit under one (medicaid_plans holds 1)", "medicaid_plans  (the database holds 1 saved records" in out, out[:1500])
after = q1("select data_key, hub_slug from public.app_data_key_hub_map order by 1, 2")
ck("every row that was there is still there, unchanged", all(r in after for r in before))
added = [r for r in after if r not in before]
ck("every added row is for the Care Coordinator Hub only", added and all(h == "care_coordinator" for _, h in added), added)
ck("the people lists are never added here (candidates left alone)", not any(k == "candidates" for k, _ in added) and "Locked on purpose, NOT added here" in out and "candidates" in out)
keys = json.load(open(os.path.join(ROOT, "app-data-keys.json")))["keys"]
ck("every other key the Hub uses now has a row", all(k in {a for a, _ in after} for k in keys if k != "candidates"))
ck("the test saves were thrown away (no __probe_882 anywhere)", q1("select count(*) from public.app_data a, jsonb_array_elements(case when jsonb_typeof(a.data)='array' then a.data else '[]'::jsonb end) x where x->>'id' = '__probe_882'")[0][0] == 0)
ck("...and no new empty lists were left behind by the proof", q1("select count(*) from public.app_data")[0][0] == 3)
ck("medicaid_plans' saved record is untouched", q1("select data from public.app_data where key = 'medicaid_plans'")[0][0] == [{"id": "P1", "client": "made up"}])
r = as_sam("""select public.upsert_app_data_item('medicaid_plans', '{"id":"P2"}'::jsonb)""")
ck("after: Samantha's waiting medicaid_plans change now saves", r[0] == "ok" and len(q1("select data from public.app_data where key = 'medicaid_plans'")[0][0]) == 2, r)
r = as_sam("""select public.upsert_app_data_item('call_lead_marks', '{"id":"C1","verdict":"not"}'::jsonb)""")
ck("after: the 'Not a lead' mark saves (a brand-new list)", r[0] == "ok", r)
r = as_sam("select public.app_data_keys_unmapped(array['leads','medicaid_plans','brand_new_key'])")
ck("the sign-in check names only the unregistered slot", r[0] == "ok" and r[1][0][0] == ["brand_new_key"], r)
ck("a visitor who is not signed in cannot call the check", q1("select has_function_privilege('anon', 'public.app_data_keys_unmapped(text[])', 'execute')")[0][0] is False)
r = as_sam("select public.upsert_app_data_item('caregivers', '{\"id\":5}'::jsonb)")
ck("caregivers stay locked to one-person-at-a-time saves", r[0] == "refused", r)
code2, out2 = run882("second")
ck("running it again changes nothing and still says DONE", code2 == 0 and "Every slot the Hub uses is already registered." in out2 and "✓ DONE" in out2, out2[-1200:])
ck("...the map is the same size", q1("select count(*) from public.app_data_key_hub_map")[0][0] == len(after))
for n_, ok, d in res: print(("PASS  " if ok else "FAIL  ") + n_ + ("" if ok else "  " + d))
print(f"\n{sum(1 for r in res if r[1])}/{len(res)} passed")
print(open(os.path.join(D, "report-first.txt")).read()) if os.environ.get("SHOW") else None
shutil.rmtree(D, ignore_errors=True)
raise SystemExit(0 if all(r[1] for r in res) else 1)
