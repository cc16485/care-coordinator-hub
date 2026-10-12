"""Matching check, practice only (Track 3d; was "Matching, in the dark"): the read-only report window. Offline, fed a report the Staffing builder made from
made-up visits (argv[1]: match_dark_test.mjs with DUMP_REPORT). Empty state; tiles; clients and flagged; gaps; the
filters; the replay; nothing but one read of app_data.   python3 tests/browser/match_report_look.py <report.json> [shots]"""
import json, sys, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
REP = json.load(open(sys.argv[1])); OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp'
page = '<!doctype html><meta charset="utf-8"><body><script>window.READS=[];window.REP=null;const ch={select:()=>ch,eq:(k,v)=>{READS.push(v);return ch},maybeSingle:async()=>({data:window.REP?{data:window.REP}:null,error:null})};window.sb={from:(t)=>{READS.push(t);return ch}};</script><script src="match-report.js"></script></body>'
open(os.path.join(ROOT, '_mr_test.html'), 'w').write(page)
R = []
ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
try:
  with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1200, 'height': 1300}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('file://' + os.path.join(ROOT, '_mr_test.html')); pg.evaluate('MR.open()'); pg.wait_for_timeout(300)
    ok('no report yet: says when it runs (the switch, or Desktop 617)', 'has not run yet' in pg.inner_text('#mrBody') and 'Desktop 617' in pg.inner_text('#mrBody'))
    pg.evaluate('(r) => { window.REP = r; return MR.open() }', REP); pg.wait_for_timeout(300)
    t = pg.inner_text('#mrBody')
    ok('the run, the rule version and fingerprints; "a report only"', 'rule version' in t and 'A report only' in t)
    ok('the tiles: visits judged and each group', 'visits judged' in t and 'Needs one more step' in t and 'open visits (not judged)' in t)
    ok('clients: complete, incomplete, flagged (with why), no Journey', 'flagged for review' in t and 'advanced personal care' in t and 'with no Journey in the Hub' in t)
    ok('needs attention first: the default list leaves out Ready visits', all('Ready' not in r.split('\n')[0] for r in []) and pg.locator('#mrBody table').first.inner_text().count('Not for this visit') >= 1)
    pg.click('text=Data gaps'); pg.wait_for_timeout(100)
    ok('the data gaps, in words (Do Not Return name not found; restrictions shown, not enforced)', 'Zed Nobody' in pg.inner_text('#mrBody') and 'shown, not enforced' in pg.inner_text('#mrBody'))
    pg.evaluate("MR.filter('ready')"); pg.wait_for_timeout(100)
    ok('filter Ready shows only Ready rows', 'Bo Bright' in pg.locator('#mrBody table').first.inner_text())
    pg.evaluate("MR.filter('all'); MR.search('Mary')"); pg.wait_for_timeout(100)
    ok('search by client', 'Mary Client' in pg.locator('#mrBody table').first.inner_text() and 'Hal Client' not in pg.locator('#mrBody table').first.inner_text())
    pg.click('text=Call-off replay'); pg.wait_for_timeout(100)
    ok('the replay: judged with today\'s records, who covered and how many asked would be Ready', "Judged with today's records" in pg.inner_text('#mrBody') and 'would be Ready' in pg.inner_text('#mrBody'))
    pg.screenshot(path=os.path.join(OUT, 'mr.png'), full_page=True)
    ok('it reads one thing: app_data match_dark_report', pg.evaluate('READS').count('app_data') == 2 and 'match_dark_report' in pg.evaluate('READS'))
    ok('no page errors', not errs, errs)
    b.close()
finally:
  os.remove(os.path.join(ROOT, '_mr_test.html'))
for s, n, d in R: print(s, ' ', n, ('  ' + d) if d else '')
