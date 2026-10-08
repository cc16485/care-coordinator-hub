/* =============================================================================
   partner-emails.js · partner emails by type (Referral Partner Desk Step 5, Samantha approved 2026-10-08)
   "Include the 38 existing partner emails, organized by partner type. Every email must be reviewed and manually sent."
     · From a partner (profile or the desk): the emails written for that partner's type (plus "Any Referral Partner"),
       grouped by when to use them; the person picks one, reads it, can change the subject and add a personal line,
       picks who gets it from the partner's people, and presses Send. A test to yourself first is one tap.
     · Nobody gets the same email twice: anyone who already received it is shown and can't be ticked.
     · Sent through campaign-send, the same sender as every campaign: the server's audience check (never anyone tied to a
       deceased, past or paused client) and the opt-out check run on every address; what it leaves out is shown.
     · Every send is recorded on the partner's history (who, which email, to whom, when), the same log as visits and calls.
     · The Campaigns tab's "Referral partners" list follows the same rules: only partners of the email's type, only people
       who haven't had it, and each send recorded on the partner.
   ============================================================================= */
(function () {
  'use strict';
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
  const lc = s => String(s == null ? '' : s).trim().toLowerCase();
  const lib = () => (typeof CC_EMAIL_LIBRARY !== 'undefined' ? CC_EMAIL_LIBRARY : []).filter(e => e && e.aud === 'referrers');
  const ANY = 'Any Referral Partner';
  /* the partner's type (Referrers) → the library's segment; anything else gets "Any Referral Partner" only */
  function segOf(o){
    const t = lc((o && o.type) || '') + ' ' + lc((o && o.subtype) || '');
    if(/hospice|palliative/.test(t)) return 'Hospice & Palliative';
    if(/home health/.test(t)) return 'Home Health';
    if(/rehab|skilled|nursing facility|snf/.test(t)) return 'Skilled Nursing & Rehab';
    if(/hospital|case manag|discharge/.test(t)) return 'Hospitals & Case Mgmt';
    if(/assisted|senior|independent|memory care|community|center/.test(t)) return 'Senior Living';
    if(/physician|clinic|doctor|office/.test(t)) return 'Physicians & Clinics';
    if(/law|attorney|financ|planner/.test(t)) return 'Elder Law & Financial';
    return '';
  }
  const forOrg = o => { const s = segOf(o); return lib().filter(e => e.seg === ANY || (s && e.seg === s)); };
  /* who has had which email: the partner history (referral_activities kind email, with the email's key and address) */
  function sentMap(){ const m = {}; (DATA.referral_activities || []).forEach(a => { if(a && a.kind === 'email' && a.email_key && a.to) m[a.email_key + '|' + lc(a.to)] = a.at; }); return m; }
  function people(o){
    const out = (o.contacts || []).filter(c => c && !c.archived && c.email).map(c => ({ email:lc(c.email), name:c.name, contact_id:c.id, role:c.role || '' }));
    if(o.email && !out.some(p => p.email === lc(o.email))) out.push({ email:lc(o.email), name:o.name, contact_id:null, role:'main address' });
    return out;
  }
  const PE = { org:null, key:null, subj:'', note:'', pick:{}, busy:false, msg:'' };
  function build(e){
    const x = JSON.parse(JSON.stringify(e)); x.subj = PE.subj || e.subj;
    if(PE.note.trim()) x.blocks = [{ t:'p', text:PE.note.trim() }].concat(x.blocks || []);
    return { subj:x.subj, html:typeof ccBuildEmailHTML === 'function' ? ccBuildEmailHTML(x) : '' };
  }
  function open(orgId){
    const o = (DATA.referral_orgs || []).find(x => x.id === orgId); if(!o) return;
    PE.org = o; PE.key = null; PE.subj = ''; PE.note = ''; PE.pick = {}; PE.msg = '';
    let ov = document.getElementById('peOv'); if(ov) ov.remove();
    ov = document.createElement('div'); ov.className = 'pd-ov'; ov.id = 'peOv'; document.body.appendChild(ov); paint();
  }
  function paint(){
    const ov = document.getElementById('peOv'), o = PE.org; if(!ov || !o) return;
    const list = forOrg(o), sent = sentMap(), ppl = people(o), seg = segOf(o), e = list.find(x => x.key === PE.key);
    const groups = {}; list.forEach(x => { (groups[x.seg + ' · ' + x.when] = groups[x.seg + ' · ' + x.when] || []).push(x); });
    let h = '<div class="pd-dlg pe-dlg" role="dialog" aria-modal="true"><div class="pd-dlg-t">Email ' + esc(o.name) + '</div>'
      + '<div class="field-note">Written for ' + esc(seg || 'any partner') + (seg ? ' (and any partner)' : '') + '. You read it, change what you like, and send it; nothing goes by itself.</div>';
    if(!e){
      h += Object.entries(groups).map(([g, xs]) => '<div class="pe-g"><b>' + esc(g) + '</b>' + xs.map(x => { const had = ppl.filter(p => sent[x.key + '|' + p.email]);
          return '<button class="pe-item" onclick="peChoose(\'' + esc(x.key) + '\')"><span>' + esc(x.subj) + '</span>' + (had.length ? '<small>already sent to ' + esc(had.map(p => p.name.split(' ')[0]).join(', ')) + '</small>' : '') + '</button>'; }).join('') + '</div>').join('')
        + '<div class="pd-dlg-a"><button class="secondary" onclick="peClose()">Close</button></div>';
    } else {
      const b = build(e);
      h += '<label for="peSubj">Subject</label><input id="peSubj" value="' + esc(PE.subj || e.subj) + '" oninput="peSet(\'subj\',this.value)">'
        + '<label for="peNote">A personal first line (optional)</label><textarea id="peNote" rows="2" placeholder="e.g. Lisa, it was good to see you Tuesday." oninput="peSet(\'note\',this.value)">' + esc(PE.note) + '</textarea>'
        + '<div class="pe-prev"><iframe title="The email as they will see it" sandbox="" srcdoc="' + esc(b.html) + '"></iframe></div>'
        + '<label>Send to</label>' + (ppl.length ? ppl.map(p => { const had = sent[e.key + '|' + p.email];
            return '<label class="pe-to' + (had ? ' pe-had' : '') + '"><input type="checkbox" ' + (had ? 'disabled ' : (PE.pick[p.email] ? 'checked ' : '')) + 'onchange="pePick(\'' + esc(p.email) + '\',this.checked)"> ' + esc(p.name) + (p.role ? ', ' + esc(p.role) : '') + ' <span class="field-note">' + esc(p.email) + (had ? ' · already got this one ' + esc(String(had).slice(0, 10)) : '') + '</span></label>'; }).join('')
          : '<div class="field-note">Nobody at this partner has an email address yet. Add one under People there.</div>')
        + '<div class="pd-err">' + esc(PE.msg) + '</div>'
        + '<div class="pd-dlg-a"><button class="primary" ' + (PE.busy ? 'disabled ' : '') + 'onclick="peSend()">' + (PE.busy ? 'Sending…' : 'Send') + '</button><button class="secondary" onclick="peTest()">Send a test to me</button><button class="secondary" onclick="peBack()">Pick another</button><button class="secondary" onclick="peClose()">Close</button></div>';
    }
    ov.innerHTML = h + '</div>';
  }
  async function auth(){ return (typeof cmpAuthHeaders === 'function') ? await cmpAuthHeaders() : { 'Content-Type':'application/json' }; }
  const endpoint = () => (typeof CAMPAIGN_ENDPOINT !== 'undefined' ? CAMPAIGN_ENDPOINT : '');
  async function test(){
    const e = lib().find(x => x.key === PE.key); if(!e || typeof ME === 'undefined' || !ME.email) return;
    const b = build(e); PE.msg = 'Sending a test to ' + ME.email + '…'; paint();
    try{ const r = await fetch(endpoint(), { method:'POST', headers:await auth(), body:JSON.stringify({ subject:'[TEST] ' + b.subj, html:b.html, recipients:[{ email:ME.email, name:ME.name || '' }], campaign:'partner:' + e.key + ':test', tag:'referral-partner' }) }).then(x => x.json());
      PE.msg = r && r.sent ? 'Test sent to ' + ME.email + '.' : 'The test didn\'t go: ' + ((r && (r.error || (r.results && r.results[0] && r.results[0].err))) || 'unknown'); }
    catch(err){ PE.msg = 'The test didn\'t go: ' + (err.message || err); }
    paint();
  }
  async function send(){
    const o = PE.org, e = lib().find(x => x.key === PE.key); if(!o || !e || PE.busy) return;
    const sent = sentMap(), to = people(o).filter(p => PE.pick[p.email] && !sent[e.key + '|' + p.email]);
    if(!to.length){ PE.msg = 'Tick who gets it.'; paint(); return; }
    const b = build(e);
    PE.busy = true; PE.msg = 'Checking who may get it…'; paint();
    let scr; try{ scr = await fetch(endpoint(), { method:'POST', headers:await auth(), body:JSON.stringify({ screen:true, tag:'referral-partner', recipients:to.map(p => ({ email:p.email, name:p.name })) }) }).then(x => x.json()); }catch(err){ scr = { ok:false, error:String(err.message || err) }; }
    if(!scr || !scr.ok){ PE.busy = false; PE.msg = ((scr && scr.error) || 'The check could not run.') + ' Nothing was sent.'; paint(); return; }
    const allowed = new Set((scr.allowed || []).map(r => lc(r.email))), left = scr.left_out || [];
    const go = to.filter(p => allowed.has(p.email));
    if(!go.length){ PE.busy = false; PE.msg = 'Nobody here may get it' + (left.length ? ': ' + left.map(l => l.email + ' (' + l.why + ')').join('; ') : '') + '. Nothing was sent.'; paint(); return; }
    if(!confirm('Send "' + b.subj + '" to ' + go.map(p => p.name).join(', ') + '?' + (left.length ? '\n\nLeft out: ' + left.map(l => l.email + ' (' + l.why + ')').join('; ') : '') + '\n\nThis sends real email.')){ PE.busy = false; PE.msg = ''; paint(); return; }
    let r; try{ r = await fetch(endpoint(), { method:'POST', headers:await auth(), body:JSON.stringify({ subject:b.subj, html:b.html, recipients:go.map(p => ({ email:p.email, name:p.name })), campaign:'partner:' + e.key, tag:'referral-partner' }) }).then(x => x.json()); }
    catch(err){ PE.busy = false; PE.msg = 'Not sent: ' + (err.message || err); paint(); return; }
    const okSet = new Set(((r && r.results) || []).filter(x => x && x.ok).map(x => lc(x.email)));
    await record(o, e, b.subj, go.filter(p => okSet.has(p.email)));
    const failed = go.filter(p => !okSet.has(p.email));
    PE.busy = false; PE.pick = {}; PE.msg = (okSet.size ? 'Sent to ' + go.filter(p => okSet.has(p.email)).map(p => p.name).join(', ') + '.' : '') + (failed.length ? ' Not sent to ' + failed.map(p => p.name).join(', ') + ' (see Didn\'t go through).' : '');
    paint(); try{ if(typeof pdRender === 'function') pdRender(); if(typeof REF_PROF !== 'undefined' && REF_PROF && typeof renderRefProfile === 'function') renderRefProfile(); }catch(x){}
  }
  /* one line per person on the partner's history (the same log as visits and calls) */
  async function record(o, e, subj, list){
    for(const p of list){
      const a = { id:uid(), org_id:o.id, kind:'email', note:(p.name ? p.name + ': ' : '') + 'sent "' + subj + '" (' + e.seg + ', ' + e.when + ')', email_key:e.key, to:p.email, contact_id:p.contact_id || null, at:new Date().toISOString(), by:(typeof ME !== 'undefined' && ME.email) || '' };
      DATA.referral_activities = DATA.referral_activities || []; DATA.referral_activities.push(a); await persist('referral_activities', a);
    }
  }
  /* the Campaigns tab's "Referral partners": only partners of the email's type, only people who haven't had it */
  function bulkRecipients(e){
    if(!e) return [];
    const sent = sentMap(), out = [];
    (DATA.referral_orgs || []).filter(o => o && !o.archived && (e.seg === ANY || segOf(o) === e.seg)).forEach(o => people(o).forEach(p => { if(!sent[e.key + '|' + p.email]) out.push({ email:p.email, name:p.name, org_id:o.id, contact_id:p.contact_id }); }));
    return out;
  }
  async function bulkRecord(e, results){
    const okSet = new Set((results || []).filter(x => x && x.ok).map(x => lc(x.email)));
    const by = {}; bulkRecipients(e).forEach(r => { if(okSet.has(r.email)) (by[r.org_id] = by[r.org_id] || []).push(r); });
    for(const [orgId, list] of Object.entries(by)){ const o = (DATA.referral_orgs || []).find(x => x.id === orgId); if(o) await record(o, e, e.subj, list); }
  }
  if(!document.getElementById('peCss')){ const s = document.createElement('style'); s.id = 'peCss'; s.textContent = [
    '.pe-dlg{max-width:640px}.pe-g{margin-top:10px}.pe-g b{display:block;font-size:12.5px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}',
    '.pe-item{display:flex;flex-direction:column;align-items:flex-start;width:100%;text-align:left;border:1px solid var(--border);background:#fff;border-radius:8px;padding:8px 10px;margin-bottom:6px;cursor:pointer;font:inherit;font-size:13.5px;color:var(--navy)}',
    '.pe-item small{color:var(--text-muted);font-size:12px}.pe-prev{border:1px solid var(--border);border-radius:8px;overflow:hidden;margin:6px 0}.pe-prev iframe{width:100%;height:340px;border:0;background:#fff}',
    '.pe-to{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:13.5px;font-weight:400;color:var(--text)}.pe-to input{width:auto;min-height:0}.pe-had{opacity:.6}'
  ].join(''); document.head.appendChild(s); }
  Object.assign(window, { peOpen:open, peChoose:k => { PE.key = k; PE.subj = ''; PE.note = ''; PE.pick = {}; PE.msg = ''; const ppl = PE.org ? people(PE.org) : []; const sent = sentMap(); if(ppl.length === 1 && !sent[k + '|' + ppl[0].email]) PE.pick[ppl[0].email] = true; paint(); },
    peBack:() => { PE.key = null; PE.msg = ''; paint(); }, peClose:() => { const ov = document.getElementById('peOv'); if(ov) ov.remove(); }, peSet:(k, v) => { PE[k] = v; const f = document.querySelector('.pe-prev iframe'), e = lib().find(x => x.key === PE.key); if(f && e) f.srcdoc = build(e).html; },
    pePick:(e, on) => { PE.pick[e] = on; }, peSend:send, peTest:test, peSegOf:segOf, peForOrg:forOrg, peBulkRecipients:bulkRecipients, peBulkRecord:bulkRecord, PE_STATE:PE });
})();
