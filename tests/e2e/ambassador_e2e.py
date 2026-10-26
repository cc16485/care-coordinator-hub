"""Community Ambassadors, end to end (2026-10-26), across the three pieces, nothing real touched:
  1. the WEBSITE application page (caring-companions-website, SITE_DIR) fills and sends an application (caught in the browser)
  2. the SERVER (Staffing-Coordinator-Hub, STAFFING_DIR) receives that exact body: one applied ambassador, never a lead
  3. the HUB (this checkout) shows it to the owner, who approves it: the code is made and the welcome email goes (caught)
  4. the SERVER again: a family form with the new code links the ambassador; before approval nothing could link
  5. the WEBSITE link page and the QR code page work for the new code
SITE_DIR=... STAFFING_DIR=... python3 tests/e2e/ambassador_e2e.py"""
import json, os, subprocess, tempfile, threading, http.server, functools
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); HUB = os.path.dirname(os.path.dirname(HERE))
SITE = os.environ["SITE_DIR"]; STAFF = os.environ["STAFFING_DIR"]
R = []; ok = lambda n, c, d="": R.append(("PASS" if c else "FAIL", n, "" if c else str(d)[:700]))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
def serve(d):
    h = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=d)); threading.Thread(target=h.serve_forever, daemon=True).start()
    return h, f"http://127.0.0.1:{h.server_address[1]}"
def server(app_data, posts):
    f = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False); json.dump({"app_data": app_data, "posts": posts}, f); f.close()
    p = subprocess.run(["node", os.path.join(HERE, "server_run.mjs"), STAFF, f.name], capture_output=True, text=True); os.unlink(f.name)
    if p.returncode != 0: raise SystemExit("server run failed: " + p.stderr[-800:])
    return json.loads(p.stdout.strip().splitlines()[-1])
SH, SB = serve(SITE); HH, HB = serve(HUB)
src = open(os.path.join(HUB, "tests/browser/client_journey_look.py")).read()
ns = {"__file__": os.path.join(HUB, "tests/browser/client_journey_look.py")}; exec(src[:src.rindex("with sync_playwright() as pw:")], ns)
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    # 1 · the website application
    pg = b.new_page(); posted = []
    pg.on("pageerror", lambda e: errs.append("site: " + str(e)[:200]))
    def catch(route):
        if "lead-intake" in route.request.url: posted.append(json.loads(route.request.post_data or "{}")); route.fulfill(status=200, body='{"status":"application received"}', content_type="application/json")
        elif "127.0.0.1" in route.request.url: route.continue_()
        else: route.abort()
    pg.route("**/*", catch); pg.goto(SB + "/ambassadors/"); pg.wait_for_timeout(500)
    for f, v in (("#am-first", "Linda"), ("#am-last", "Ortiz"), ("#am-email", "linda@example.com"), ("#am-phone", "417-555-0123"), ("#am-town", "Nixa")): pg.fill(f, v)
    pg.locator("#am-share label", has_text="Church or community group").click(); pg.check("#am-agree"); pg.click("#am-submit"); pg.wait_for_timeout(600)
    app = posted[0] if posted else {}
    ok("1 · website: the application is sent as an ambassador application, and the thank-you shows", app.get("kind") == "ambassador_application" and pg.is_visible("#am-thanks"), app)
    pg.close()
    # 2 · the server receives that exact body
    base = {"referral_orgs": [{"id": "jane", "name": "Ozark Senior Moves", "partner_code": "JANE-K7", "program_status": "active"}], "leads": []}
    s1 = server(base, [app])
    orgs = s1["app_data"]["referral_orgs"]; amb = next((o for o in orgs if o.get("program_track") == "ambassador"), None)
    ok("2 · server: saved as ONE applied ambassador on the Referral Partner Desk, no code; never a lead", s1["answers"][0]["j"].get("status") == "application received" and amb and amb["program_status"] == "applied" and not amb.get("partner_code") and s1["app_data"]["leads"] == [], s1)
    ok("...the owner was emailed; nothing went to the applicant", any("New Community Ambassador application: Linda Ortiz" in (m.get("subject") or "") for m in s1["sent"]) and len(s1["sent"]) == 1, s1["sent"])
    s1b = server(s1["app_data"], [{"name": "Gary Miller", "phone": "4175550142", "message": "Help for my mom", "partner_code": "LINDA-AA"}])
    g = s1b["app_data"]["leads"][-1]
    ok("...before approval nothing can link: a family arriving with a made-up code for her gets no partner", not g.get("referral_org_id") and (g.get("partner_link_seen") or {}).get("status") == "unknown", g)
    # 3 · the Hub: the owner approves
    hp = b.new_page(viewport={"width": 1280, "height": 1000}); hp.on("pageerror", lambda e: errs.append("hub: " + str(e)[:200]))
    hp.route("**/*", lambda r: r.abort() if "supabase.co" in r.request.url and "campaign-send" not in r.request.url else r.continue_())
    hp.goto(HB + "/index.html?proof=e2e"); hp.wait_for_timeout(1500)
    for s in (ns["STUB"], ns["DATA"]): hp.evaluate("s=>(0,eval)(s)", s)
    hp.evaluate("""o=>{ window.__P=[]; window.__mail=[]; (0,eval)("persist=async(k,i)=>{ window.__P.push([k,JSON.parse(JSON.stringify(i))]); }"); (0,eval)("ccToast=m=>{window.__toast=m}");
      window.ccConfirm=async()=>true; (0,eval)('ccConfirm=window.ccConfirm'); window.alert=m=>{(window.__alert=window.__alert||[]).push(m)};
      (0,eval)("cmpAuthHeaders=async()=>({'Content-Type':'application/json'})");
      const rf=window.fetch.bind(window); window.fetch=async(u,op)=>{ u=String(u); if(/campaign-send/.test(u)){ const b=JSON.parse(op.body); window.__mail.push(b);
        return new Response(JSON.stringify(b.screen?{ok:true,allowed:b.recipients,left_out:[]}:{results:b.recipients.map(r=>({email:r.email,ok:true}))}),{status:200}); } return rf(u,op); };
      DATA.referral_orgs=o.orgs; DATA.leads=o.leads; DATA.referral_activities=[]; DATA.ops_items=DATA.ops_items||[];
      document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; }""", {"orgs": orgs, "leads": s1["app_data"]["leads"]})
    hp.evaluate("()=>{ window.__as('krystal@mo-care.com','Krystal Land'); switchTab('referrers'); }"); hp.wait_for_timeout(300)
    ok("3 · Hub: a Care Coordinator doesn't see the application anywhere on Referral Partners", "Linda Ortiz" not in hp.inner_text("#tab-referrers"))
    hp.evaluate("()=>{ window.__as('sam@mo-care.com','Samantha Owner'); switchTab('referrers'); }"); hp.wait_for_timeout(300)
    ok("...the owner sees it under Community Ambassador applications", "Linda Ortiz" in hp.inner_text("#plProgram") and "Community Ambassador applications" in hp.inner_text("#plProgram").title() or "COMMUNITY AMBASSADOR APPLICATIONS" in hp.inner_text("#plProgram"))
    hp.evaluate("id=>plAmbApprove(id)", amb["id"]); hp.wait_for_timeout(200)
    hp.locator("#plAmbOv button", has_text="Approve and send").click(); hp.wait_for_timeout(600)
    saved = hp.evaluate("id=>window.__P.filter(x=>x[0]==='referral_orgs'&&x[1].id===id).slice(-1)[0][1]", amb["id"])
    mail = hp.evaluate("()=>window.__mail.filter(m=>!m.screen)")
    code = saved.get("partner_code", "")
    ok("...approved: a code is made and turned on only now", saved.get("program_status") == "active" and code.startswith("LINDA-"), saved)
    ok("...the welcome email went to Linda with her link, QR code page and simple instructions", len(mail) == 1 and mail[0]["recipients"][0]["email"] == "linda@example.com" and f"https://mo-care.com/r/?p={code}" in mail[0]["html"] and f"https://mo-care.com/r/qr/?p={code}" in mail[0]["html"] and "How to help" in mail[0]["html"], mail)
    hp.close()
    # 4 · the server again, with the approved record
    orgs2 = [saved if o["id"] == amb["id"] else o for o in orgs]
    s2 = server({"referral_orgs": orgs2, "leads": []}, [{"name": "Gary Miller", "phone": "4175550142", "message": "Help for my mom", "partner_code": code}])
    lead = s2["app_data"]["leads"][-1]
    ok("4 · server: a new family arriving through her link is credited to Linda (a link, from the approved code)", lead.get("referral_org_id") == amb["id"] and lead.get("referral_via") == "link" and lead.get("partner_code") == code, lead)
    # 5 · the website link page and QR page
    wp = b.new_page(); wp.on("pageerror", lambda e: errs.append("site: " + str(e)[:200]))
    wp.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    wp.goto(SB + f"/r/qr/?p={code}"); wp.wait_for_timeout(500)
    ok("5 · website: her QR code page draws the code and offers Save", wp.evaluate("()=>document.getElementById('qr-canvas').width>100") and f"mo-care.com/r/?p={code}" in wp.inner_text("#qr-link") and wp.is_visible("#qr-save"))
    wp.goto(SB + f"/r/?p={code}"); wp.wait_for_timeout(400)
    ok("...her link page keeps her code for the family's forms", (wp.evaluate("()=>JSON.parse(localStorage.getItem('cc_partner_ref')||'{}')") or {}).get("code") == code)
    wp.goto(SB + "/r/qr/?p=bad%20code"); wp.wait_for_timeout(300)
    ok("...a broken QR link says what to do instead of drawing anything", wp.is_visible("#qr-bad"))
    ok("no page errors anywhere", not errs, errs); b.close()
SH.shutdown(); HH.shutdown()
for r in R: print(r[0], "·", r[1], ("→ " + r[2]) if r[2] else "")
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}"); raise SystemExit(0 if all(r[0] == "PASS" for r in R) else 1)
