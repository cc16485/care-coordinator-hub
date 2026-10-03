/* 2026-09-27: lead texts, GoHighLevel replies and job offers need the staff member's own Hub sign-in (x-hub-token), not
   the shared Training key; the Training functions check it with the Hub and run the Hub's opt-out check. */
/* (the page's own trainHubTok, defined in index.html, supplies the staff member's Hub session) */
/* Caregiver lifecycle engine, moved from the Staffing Coordinator Hub
   on 2026-07-31. Wrapped so nothing here can reach the hub's own globals:
   switchTab, closeModal, addDays and renderCheckins exist in both and mean
   different things. Its data layer travels with it unchanged, so these tabs
   read and write exactly what they did before the move. */
(function(){
/* The Staffing hub boots by hiding its login screen and showing its app
   shell. Neither exists here, and the resulting TypeError killed the boot
   before it ever loaded any data. Assignment cannot be optional-chained,
   so the handful of ids its boot path writes to are created hidden. */
['login-screen','app','hdr-date','err','settingsBtn','sync-status'].forEach(function(id){
  if(document.getElementById(id)) return;
  var d=document.createElement('div'); d.id=id; d.style.display='none';
  document.body.appendChild(d);
});

// ── SUPABASE CLIENT (must be first) ───────────────────────────────────
const SB_URL  = 'https://zngsgedlsxinbygwmxwn.supabase.co';
const SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZ3NnZWRsc3hpbmJ5Z3dteHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NDIzNDQsImV4cCI6MjA5ODExODM0NH0.L_31_UKdccyRH9n7p1GaBlZTqcJipB008H-GIvxwLxM';
const sb = supabase.createClient(SB_URL, SB_KEY);

// ── Admin passcode — gates Settings access ────────────────────────────
// Stored in localStorage; set on first use via Settings.
function getAdminPwd(){ return localStorage.getItem('cc_admin_pwd') || ''; }

function checkAdminPwd(val){ return val !== '' && btoa(val) === getAdminPwd(); }

const TODAY = new Date(); TODAY.setHours(0,0,0,0);

// ── Supabase Auth ─────────────────────────────────────────────────────
// The slugs this engine accepts from a signed-in user's app_metadata.hub_access.
// This code serves TWO hubs now — its original Staffing hub home and the Care
// Coordinator Hub it was moved into — so either portal grant is enough.
// Checking 'staffing' alone silently signed care coordinators out the moment
// they opened Offers or Background & References, with no message at all.
const HUB_SLUGS = ['staffing', 'care_coordinator'];
// Real access control lives in Supabase Auth's app_metadata.hub_access. A
// missing hub_access array means the account predates this system — treat
// that as grandfathered in rather than denied, so this never locks out the
// existing team on deploy. Restriction only starts once an owner explicitly
// sets someone's portal access from Team Hub's Manage Team Access panel.
function hasHubAccess(user){
  const access = user && user.app_metadata && user.app_metadata.hub_access;
  if(access === undefined || access === null) return true;
  return Array.isArray(access) && HUB_SLUGS.some(s => access.includes(s));
}
async function showApp(){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app').style.display='block';
  document.getElementById('hdr-date').textContent = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  HYDRATED = !!(await loadFromSupabase());   // the write gate applies here too
  if (HYDRATED) HYDRATE_ERR = null;
  migrateOldRecipients();
  renderAll();
  loadClientQueue();
  await loadOffers(); // fills the New Offers tab + red badge count
  /* Standalone boot must hydrate hire_intake the SAME way the embedded boot
     (bootHydrate) does. Without this, INTAKE_ROWS stays empty here, so
     Background & References cannot see start-link submissions: submitted people
     show as "Start not confirmed" and no Import ever appears. Read-only (it only
     assigns INTAKE_ROWS); guarded so a hire_intake hiccup never breaks sign-in.
     loadOffers first to match bootHydrate's offers->intake order, before
     anything derives B&R lifecycle state. */
  try { await loadIntake(); } catch(e){ console.warn('loadIntake (standalone boot):', (e && e.message) || e); }
  /* Refresh the read-only B&R views now that offers + intake are loaded — the
     same signal bootHydrate emits; its sole listener re-renders People & Checks
     and Reference Activity. No writes, no invokes. */
  try { window.dispatchEvent(new Event('scx-hydrated')); } catch(e){}
  /* ── BOOT MUST BE READ-ONLY (owner ruling 2026-09-21, formalized 2026-09-22) ──
     showApp() now obeys the SAME safety invariant bootHydrate() already documents:
     authentication / boot / restored session / reload / navigation / tab switch /
     render must NEVER perform an operational MUTATE just because the Hub was
     viewed. The legacy side-effect chain that used to run here is removed from
     boot; every capability is retained, only behind its explicit action or an
     intentional server process:
       · mergePendingBookings()   -> still ingests on the Orientations-tab open
       · linkCandidatesToOffers() -> dropped from boot; it never affected display
                                     (lifecycleRows derives the board<->offer link
                                     from the persisted offer_id); heuristics may
                                     display, never write
       · intakeReconcile()        -> explicit Import button (intakeImport, Gate A
                                     persistence + rollback + seen_at guarantees)
       · autoAskReferences()      -> explicit "Ask references" button (askReferences)
       · refFixReconcile() / refReconcile() / markScreeningCleared()
                                  -> off until ruled; never a page-load action
     Outreach (the reference-chase edge fn) still runs server-side for reference
     requests a human already created. No boot path can reach it. */
}

async function doLogin(){
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('pwd').value;
  const errEl = document.getElementById('err');
  const btn = document.getElementById('login-btn');
  errEl.style.display='none';
  errEl.textContent='';
  if(!email || !password){
    errEl.textContent='Please enter your email and password.';
    errEl.style.display='block'; return;
  }
  btn.disabled=true; btn.textContent='Signing in…';
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  btn.disabled=false; btn.textContent='Sign In';
  if(error){
    errEl.textContent = error.message === 'Invalid login credentials'
      ? 'Incorrect email or password.' : error.message;
    errEl.style.display='block';
  } else if(!hasHubAccess(data.user)){
    await sb.auth.signOut();
    errEl.textContent = "You don't have access to this hub. Contact your owner to be granted access.";
    errEl.style.display='block';
  } else {
    await showApp();
  }
}

async function doLogout(){
  await sb.auth.signOut();
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('app').style.display='none';
  document.getElementById('pwd').value='';
  document.getElementById('login-email').value='';
}

async function doForgotPassword(){
  const email = document.getElementById('login-email')?.value.trim()
    || prompt('Enter your email address:');
  if(!email) return;
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/' });
  if(error){ alert('Error: ' + error.message); }
  else { alert(`Reset link sent to ${email}.\nCheck your inbox (and spam). The link brings you back here to set a new password.`); }
}

/* ---- Set-new-password step (arriving from the reset email) ---- */
sb.auth.onAuthStateChange(function(event){ if(event==='PASSWORD_RECOVERY') showSetNewPassword(); });
function showSetNewPassword(){
  if(document.getElementById('pwResetOverlay')) return;
  var d=document.createElement('div');
  d.id='pwResetOverlay';
  d.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.78);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px';
  d.innerHTML='<div style="background:#fff;border-radius:14px;padding:26px;width:100%;max-width:360px;font-family:inherit">'
    +'<h2 style="margin:0 0 6px;color:#0D365F;font-size:18px">Set a new password</h2>'
    +'<p style="margin:0 0 14px;font-size:13px;color:#6E6559">Your email link signed you in — now choose a new password.</p>'
    +'<input id="pwNew1" type="password" placeholder="New password (8+ characters)" style="width:100%;box-sizing:border-box;padding:11px;border:1.5px solid #e4e1d8;border-radius:8px;font-size:16px;margin-bottom:8px;font-family:inherit">'
    +'<input id="pwNew2" type="password" placeholder="Type it again" style="width:100%;box-sizing:border-box;padding:11px;border:1.5px solid #e4e1d8;border-radius:8px;font-size:16px;margin-bottom:10px;font-family:inherit">'
    +'<div id="pwErr" style="display:none;color:#DC2626;font-size:12.5px;margin-bottom:10px"></div>'
    +'<button id="pwSaveBtn" style="width:100%;background:#0D365F;color:#fff;border:none;padding:12px;border-radius:999px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit">Save new password</button>'
    +'</div>';
  document.body.appendChild(d);
  document.getElementById('pwSaveBtn').onclick=async function(){
    var p1=document.getElementById('pwNew1').value, p2=document.getElementById('pwNew2').value, err=document.getElementById('pwErr');
    err.style.display='none';
    if(p1.length<8){ err.textContent='Please use at least 8 characters.'; err.style.display='block'; return; }
    if(p1!==p2){ err.textContent='Those don\'t match — try again.'; err.style.display='block'; return; }
    this.disabled=true; this.textContent='Saving…';
    var res=await sb.auth.updateUser({password:p1});
    if(res.error){ err.textContent=res.error.message; err.style.display='block'; this.disabled=false; this.textContent='Save new password'; return; }
    d.remove();
    alert('Password updated — you\'re signed in.');
    window.location.reload();
  };
}

document.getElementById('pwd')?.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
document.getElementById('login-email')?.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('pwd').focus();});

/* ── EMBEDDED (CC HUB) HYDRATION ──────────────────────────────────────────────
   This engine runs in two homes. Standalone (its own page, with a login
   screen) it boots through showApp(). Embedded in the CC hub there is no
   login chrome, and from Jul 31 to Sep 21 the boot died on its first
   getElementById and NOTHING loaded — every tab rendered stale localStorage.

   bootHydrate() is the embedded boot: reads only. The legacy showApp()
   side-effect chain stays DORMANT here on purpose (owner ruling 2026-09-21):
     · intakeReconcile()        — retired as an auto-importer; the B&R tab now
                                  reads hire_intake natively and staff Import
     · autoAskReferences()      — outreach may NEVER fire from boot
     · refFixReconcile()        — heuristic reference repair, off until ruled
     · refReconcile()           — reference-answer sync, off until ruled
     · markScreeningCleared()   — screening write-back, off until ruled
     · linkCandidatesToOffers() — contact-heuristic linkage WRITER, off:
                                  heuristics may display, never write
     · migrateOldRecipients(), loadClientQueue(), mergePendingBookings()
                                — legacy standalone duties, off here
   HYDRATED is the write gate: until a fresh shared load has succeeded, no
   engine tab may save its cached copy over the shared database. */
let HYDRATED = false;
let HYDRATE_ERR = null;
let INTAKE_ROWS = [];
async function loadIntake(){
  /* email + phone are added for the identity-grouping hierarchy (same-person
     submissions). authenticated has column SELECT on both (ssn is deliberately
     NOT selected — it is not granted and would error the whole read). */
  const { data, error } = await sb.from('hire_intake')
    .select('id, created_at, first_name, last_name, candidate_id, email, phone, seen_at, signed_at, screening_cleared_at, refs')
    .order('created_at', { ascending: false });
  if (error) throw new Error('hire_intake: ' + error.message);
  INTAKE_ROWS = data || [];
}
function hydrateBanner(){
  let el = document.getElementById('scxHydrateBanner');
  if(!el){
    el = document.createElement('div');
    el.id = 'scxHydrateBanner';
    el.style.cssText = 'display:none;margin:0 0 12px;padding:10px 14px;border-radius:10px;'
      + 'background:#FEE2E2;border:1px solid #FCA5A5;color:#B91C1C;font-size:13px;font-weight:600;';
    const host = document.querySelector('.tabpanel.active') || document.body;
    host.prepend(el);
  }
  if (HYDRATED) { el.style.display = 'none'; return; }
  el.style.display = '';
  el.innerHTML = '⚠ Shared data has not loaded'
    + (HYDRATE_ERR ? ' (' + String(HYDRATE_ERR).slice(0,120) + ')' : '')
    + '. This section is READ-ONLY: nothing you change here will be saved. '
    + '<button class="ibtn" onclick="retryHydrate(this)">Try again</button>';
}
async function bootHydrate(){
  try{
    const okLoad = await loadFromSupabase();
    if (!okLoad) throw new Error('shared app data did not load');
    await loadOffers();
    await loadIntake();
    HYDRATED = true; HYDRATE_ERR = null;
  }catch(e){
    HYDRATED = false;
    HYDRATE_ERR = String((e && e.message) || e);
    console.warn('bootHydrate failed:', HYDRATE_ERR);
  }
  hydrateBanner();
  try{ renderAll(); }catch(e){}
  try{ window.dispatchEvent(new Event('scx-hydrated')); }catch(e){}
}
async function retryHydrate(btn){
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }
  await bootHydrate();
  if (btn) { btn.disabled = false; btn.textContent = 'Try again'; }
}

// Auto-restore session on page load
(async ()=>{
  const { data: { session } } = await sb.auth.getSession();
  if(session){
    if(!hasHubAccess(session.user)){
      await sb.auth.signOut();
      const errEl = document.getElementById('err');
      if (errEl) {
        errEl.textContent = "You don't have access to this hub. Contact your owner to be granted access.";
        errEl.style.display = 'block';
      }
      return;
    }
    if (document.getElementById('login-screen')) {
      /* Standalone page: the legacy boot, untouched. */
      await showApp();
      isOwner().then(ok => { const b = document.getElementById('settingsBtn'); if(b && !ok) b.style.display = 'none'; });
    } else {
      /* Embedded in the CC hub: safe hydration only. */
      await bootHydrate();
    }
  }
})();

// ── OIG Exclusion Check ───────────────────────────────────────────────
async function runOIGCheck(first, last){
  // The government's browser API is gone and the CSV database has no CORS, so we
  // check server-side via the oig-check edge function (queries the live LEIE
  // database and returns matches). Same shape the result modal already expects.
  const { data, error } = await sb.functions.invoke('oig-check', { body: { first, last } });
  if(error) throw new Error(error.message || 'OIG check could not run');
  if(data && data.error) throw new Error(data.error);
  return {
    clear: !!(data && data.clear),
    date: (data && data.date) || new Date().toISOString().slice(0,10),
    matches: (data && data.matches) || []
  };
}

function oigMatchTable(matches){
  return `<table style="width:100%;border-collapse:collapse;font-size:.78rem;margin-top:.5rem">
    <thead><tr style="background:var(--red-bg)">
      <th style="padding:.4rem .6rem;text-align:left;color:var(--red-text)">Name</th>
      <th style="padding:.4rem .6rem;text-align:left;color:var(--red-text)">DOB</th>
      <th style="padding:.4rem .6rem;text-align:left;color:var(--red-text)">State</th>
      <th style="padding:.4rem .6rem;text-align:left;color:var(--red-text)">Exclusion Type</th>
      <th style="padding:.4rem .6rem;text-align:left;color:var(--red-text)">Excl. Date</th>
    </tr></thead>
    <tbody>${matches.map(m=>`<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:.4rem .6rem">${m.firstname||''} ${m.lastname||''}</td>
      <td style="padding:.4rem .6rem">${m.dob||'—'}</td>
      <td style="padding:.4rem .6rem">${m.state||'—'}</td>
      <td style="padding:.4rem .6rem">${m.excltype||'—'}</td>
      <td style="padding:.4rem .6rem">${m.excldate||'—'}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function showOIGResult(name, result, onClear, onFlagged, onDismiss){
  const c = document.getElementById('oig-result-content');
  const a = document.getElementById('oig-result-acts');
  if(result.clear){
    c.innerHTML = `<div style="text-align:center;padding:.5rem 0">
      <div style="font-size:2.5rem">✅</div>
      <h3 style="margin:.5rem 0 .25rem;color:var(--green-text)">OIG Check — CLEAR</h3>
      <p style="font-size:.85rem;color:var(--gray)"><strong>${name}</strong> was not found on the OIG Exclusions List.</p>
      <p style="font-size:.78rem;color:var(--gray);margin-top:.35rem">Checked: ${result.date}</p>
    </div>`;
    a.innerHTML = `<button class="btn-save" style="width:100%;background:var(--green)" onclick="oigResultConfirm()">Save — Mark CLEAR</button>`;
    a._onConfirm = () => { onClear(result.date); closeModal('oig-result-modal'); };
  } else {
    c.innerHTML = `<div>
      <div style="text-align:center;margin-bottom:.75rem">
        <div style="font-size:2rem">⚠️</div>
        <h3 style="margin:.4rem 0 .2rem;color:var(--red-text)">Potential OIG Match Found</h3>
        <p style="font-size:.82rem;color:var(--gray)">The name <strong>${name}</strong> returned ${result.matches.length} result${result.matches.length>1?'s':''} on the OIG Exclusions List. Review carefully — common names may return false positives.</p>
      </div>
      ${oigMatchTable(result.matches)}
      <p style="font-size:.75rem;color:var(--gray);margin-top:.75rem">If this is NOT your employee, click "Not a Match — Mark CLEAR". If it IS a match, click "Confirm FLAGGED".</p>
    </div>`;
    a.innerHTML = `
      <button class="btn-cancel" onclick="oigResultDismiss()">Cancel</button>
      <button class="btn-save" style="background:var(--green)" onclick="oigResultNotMatch()">Not a Match — Mark CLEAR</button>
      <button class="btn-save" style="background:var(--red)" onclick="oigResultFlagged()">Confirm FLAGGED</button>`;
    a._onClear   = () => { onClear(result.date); closeModal('oig-result-modal'); };
    a._onFlagged = () => { onFlagged(result.date); closeModal('oig-result-modal'); };
    a._onDismiss = () => { if(onDismiss) onDismiss(); closeModal('oig-result-modal'); };
  }
  document.getElementById('oig-result-modal').classList.add('open');
}
function oigResultConfirm(){ document.getElementById('oig-result-acts')._onConfirm?.(); }
function oigResultNotMatch(){ document.getElementById('oig-result-acts')._onClear?.(); }
function oigResultFlagged(){ document.getElementById('oig-result-acts')._onFlagged?.(); }
function oigResultDismiss(){ document.getElementById('oig-result-acts')._onDismiss?.(); closeModal('oig-result-modal'); }

async function oigCheckFromCGModal(){
  const first = document.getElementById('cg-first').value.trim();
  const last  = document.getElementById('cg-last').value.trim();
  if(!first || !last){ alert('Enter the caregiver name first.'); return; }
  const btn = document.getElementById('cg-oig-check-btn');
  btn.textContent = '⏳ Checking…'; btn.disabled = true;
  try {
    const result = await runOIGCheck(first, last);
    btn.textContent = '🔍 Run OIG Check'; btn.disabled = false;
    showOIGResult(`${first} ${last}`, result,
      (date) => { // CLEAR
        document.getElementById('cg-oig').value = date;
        document.getElementById('cg-oig-s').value = 'Current';
      },
      (date) => { // FLAGGED
        document.getElementById('cg-oig').value = date;
        document.getElementById('cg-oig-s').value = 'Overdue';
      }
    );
  } catch(e){
    btn.textContent = '🔍 Run OIG Check'; btn.disabled = false;
    alert('OIG check failed: ' + e.message + '\n\nCheck your internet connection or try again.');
  }
}

async function oigCheckFromOBModal(){
  const first = document.getElementById('ob-first').value.trim();
  const last  = document.getElementById('ob-last').value.trim();
  if(!first || !last){ alert('Enter the candidate name first.'); return; }
  const btn = document.getElementById('ob-oig-check-btn');
  btn.textContent = '⏳ Checking…'; btn.disabled = true;
  try {
    const result = await runOIGCheck(first, last);
    btn.textContent = '🔍 Run OIG Check'; btn.disabled = false;
    showOIGResult(`${first} ${last}`, result,
      (date) => {
        document.getElementById('ob-oig').value = 'CLEAR';
        document.getElementById('ob-oig-date').value = date;
      },
      (date) => {
        document.getElementById('ob-oig').value = 'FLAGGED';
        document.getElementById('ob-oig-date').value = date;
      }
    );
  } catch(e){
    btn.textContent = '🔍 Run OIG Check'; btn.disabled = false;
    alert('OIG check failed: ' + e.message);
  }
}

async function batchOIGCheck(){
  if(!caregivers.length){ alert('No caregivers to check.'); return; }
  document.getElementById('oig-batch-modal').classList.add('open');
  document.getElementById('oig-batch-close-btn').style.display = 'none';
  const content = document.getElementById('oig-batch-content');
  const today = new Date().toISOString().slice(0,10);
  let cleared=0, flagged=0, errors=0;
  const flaggedList = [];
  content.innerHTML = `<div style="font-size:.83rem;color:var(--gray);margin-bottom:.75rem">Checking ${caregivers.length} caregiver${caregivers.length>1?'s':''}…</div>
    <div id="oig-batch-progress" style="font-size:.8rem;color:var(--navy)"></div>`;
  const errorList = [];
  for(let i=0; i<caregivers.length; i++){
    const cg = caregivers[i];
    document.getElementById('oig-batch-progress').textContent = `${i+1} of ${caregivers.length}: ${cg.first} ${cg.last}…`;
    let result = null;
    // Retry up to 3 times with increasing delay
    for(let attempt=1; attempt<=3; attempt++){
      try {
        result = await runOIGCheck(cg.first, cg.last);
        break;
      } catch(e){
        if(attempt < 3){ await new Promise(r=>setTimeout(r, attempt * 1000)); }
      }
    }
    if(result){
      if(result.clear){
        caregivers[i].oig_date = today;
        cleared++;
      } else {
        flagged++;
        flaggedList.push({ name:`${cg.first} ${cg.last}`, matches: result.matches });
      }
    } else {
      errors++;
      errorList.push(`${cg.first} ${cg.last}`);
    }
    await new Promise(r=>setTimeout(r,700)); // rate limit — OIG API needs breathing room
  }
  saveCaregivers(); renderAC(); renderAlerts();
  let html = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-bottom:1rem">
    <div style="background:var(--green-bg);border-radius:8px;padding:.75rem;text-align:center">
      <div style="font-size:1.6rem;font-weight:700;color:var(--green-text)">${cleared}</div>
      <div style="font-size:.72rem;color:var(--green-text);font-weight:600">CLEAR</div>
    </div>
    <div style="background:${flagged?'var(--red-bg)':'var(--slate-bg)'};border-radius:8px;padding:.75rem;text-align:center">
      <div style="font-size:1.6rem;font-weight:700;color:${flagged?'var(--red-text)':'var(--slate-text)'}">${flagged}</div>
      <div style="font-size:.72rem;color:${flagged?'var(--red-text)':'var(--slate-text)'};font-weight:600">FLAGGED — Review</div>
    </div>
    <div style="background:var(--slate-bg);border-radius:8px;padding:.75rem;text-align:center">
      <div style="font-size:1.6rem;font-weight:700;color:var(--slate-text)">${errors}</div>
      <div style="font-size:.72rem;color:var(--slate-text);font-weight:600">Errors</div>
    </div>
  </div>`;
  if(flaggedList.length){
    html += `<div style="font-size:.8rem;font-weight:700;color:var(--red-text);margin-bottom:.5rem">⚠️ Review these potential matches:</div>`;
    flaggedList.forEach(f=>{
      html += `<div style="margin-bottom:.75rem"><div style="font-weight:600;font-size:.83rem;color:var(--navy);margin-bottom:.25rem">${f.name}</div>${oigMatchTable(f.matches)}</div>`;
    });
    html += `<p style="font-size:.75rem;color:var(--gray);margin-top:.5rem">Open each flagged caregiver's record to review and update their OIG status manually.</p>`;
  }
  if(errors){ html += `<div style="background:var(--amber-bg);border:1.5px solid #fcd34d;border-radius:8px;padding:.75rem 1rem;margin-top:.5rem;font-size:.78rem;color:var(--amber-text)">
    <strong>⚠ ${errors} caregiver${errors>1?'s':''} could not be checked after 3 attempts (OIG API may be slow — try them individually):</strong>
    <div style="margin-top:.4rem">${errorList.join(', ')}</div>
  </div>`; }
  content.innerHTML = html;
  document.getElementById('oig-batch-close-btn').style.display = 'block';
}

// ── Google Drive Integration ──────────────────────────────────────────
let gdriveTokenClient = null;
let gdriveAccessToken = null;
let gdriveFolderId    = null;
let gdrivePendingId   = null;

function gdriveInit(){
  const clientId = appSettings.google_client_id;
  if(!clientId || typeof google === 'undefined' || !google.accounts) return;
  gdriveTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar',
    callback: async (resp) => {
      if(resp.error){ alert('Google sign-in failed: ' + resp.error); return; }
      gdriveAccessToken = resp.access_token;
      if(gdrivePendingId){ await gdrivePickAndUpload(gdrivePendingId); gdrivePendingId = null; }
    }
  });
}

function gdriveUploadClick(inputId){
  if(!appSettings.google_client_id){
    alert('Add your Google Client ID in ⚙️ Settings → Google Drive Integration first.');
    return;
  }
  if(!gdriveTokenClient) gdriveInit();
  if(!gdriveTokenClient){
    alert('Google sign-in is still loading — try again in a moment.');
    return;
  }
  gdrivePendingId = inputId;
  if(!gdriveAccessToken){
    gdriveTokenClient.requestAccessToken({ prompt: '' });
    return;
  }
  gdrivePickAndUpload(inputId);
}

function gdrivePickAndUpload(inputId){
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    document.body.removeChild(fileInput);
    if(!file) return;
    const btn = document.querySelector(`button[data-gdrive-btn="${inputId}"]`);
    if(btn){ btn.textContent = '⏳'; btn.disabled = true; }
    try {
      const personName = gdriveGetPersonName();
      const folderId = await gdriveGetUploadFolder(inputId);
      const ext = file.name.split('.').pop();
      const label = inputId.replace(/^(cg|ob)-/,'').replace(/-proof$/,'').replace(/-/g,'_');
      const stamp = new Date().toISOString().slice(0,10);
      const safeName = personName ? personName.replace(/ /g,'_')+'_' : '';
      const filename = `${safeName}${label}_${stamp}.${ext}`;
      const url = await gdriveUploadFile(file, folderId, filename);
      document.getElementById(inputId).value = url;
      if(btn){ btn.textContent = '✓'; btn.style.background = 'var(--green)';
        setTimeout(() => { btn.textContent = '📤'; btn.style.background = 'var(--navy)'; btn.disabled = false; }, 2000); }
    } catch(e){
      alert('Upload failed: ' + e.message);
      if(btn){ btn.textContent = '📤'; btn.disabled = false; }
    }
  };
  fileInput.click();
}

// Get the name of the person whose modal is currently open
function gdriveGetPersonName(){
  if(document.getElementById('cg-modal')?.classList.contains('open')){
    const f=document.getElementById('cg-first')?.value.trim();
    const l=document.getElementById('cg-last')?.value.trim();
    if(f&&l) return `${f} ${l}`;
  }
  if(document.getElementById('ob-modal')?.classList.contains('open')){
    const f=document.getElementById('ob-first')?.value.trim();
    const l=document.getElementById('ob-last')?.value.trim();
    if(f&&l) return `${f} ${l}`;
  }
  return null;
}

// Map proof input IDs to document-type subfolder names
const GDRIVE_DOC_FOLDERS = {
  'oig':'OIG','edl':'EDL','fcsr':'FCSR','fp':'Fingerprint',
  'orient':'Training','alz':'Training','ojt':'Training','ojt-online':'Training',
  'annual':'Training','ethics':'Training','rights':'Training',
  'supv':'Supervisory','perf':'Performance',
  'r1':'References','r2':'References','r3':'References','r4':'References'
};
function gdriveDocFolder(inputId){
  const key = inputId.replace(/^(cg|ob)-/,'').replace(/-proof$/,'');
  return GDRIVE_DOC_FOLDERS[key] || 'Other';
}

async function gdriveEnsureFolder(){
  if(gdriveFolderId) return gdriveFolderId;
  // Use the configured root folder ID if set
  const configured = appSettings.google_drive_folder_id;
  if(configured){ gdriveFolderId = configured; return gdriveFolderId; }
  // Fallback: find or create a root folder in My Drive
  const q = encodeURIComponent(`name='Caring Companions Compliance' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${gdriveAccessToken}` }
  });
  const data = await res.json();
  if(data.files && data.files.length > 0){ gdriveFolderId = data.files[0].id; return gdriveFolderId; }
  const create = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${gdriveAccessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Caring Companions Compliance', mimeType: 'application/vnd.google-apps.folder' })
  });
  const folder = await create.json();
  if(!create.ok) throw new Error(folder.error?.message || 'Could not create Drive folder');
  gdriveFolderId = folder.id;
  return gdriveFolderId;
}

// Cache for subfolder IDs: "PersonName/DocType" → folderId
const gdrivePersonFolderCache = {};
async function gdriveEnsureSubfolder(parentId, name){
  const cacheKey = `${parentId}/${name}`;
  if(gdrivePersonFolderCache[cacheKey]) return gdrivePersonFolderCache[cacheKey];
  const q = encodeURIComponent(`name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`, {
    headers: { Authorization: `Bearer ${gdriveAccessToken}` }
  });
  const data = await res.json();
  if(data.files && data.files.length > 0){
    gdrivePersonFolderCache[cacheKey] = data.files[0].id;
    return data.files[0].id;
  }
  const create = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
    method: 'POST',
    headers: { Authorization: `Bearer ${gdriveAccessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] })
  });
  const folder = await create.json();
  if(!create.ok) throw new Error(folder.error?.message || `Could not create folder: ${name}`);
  gdrivePersonFolderCache[cacheKey] = folder.id;
  return folder.id;
}

async function gdriveGetUploadFolder(inputId){
  const rootId   = await gdriveEnsureFolder();
  const person   = gdriveGetPersonName();
  const docType  = gdriveDocFolder(inputId);
  const personId = person ? await gdriveEnsureSubfolder(rootId, person) : rootId;
  return await gdriveEnsureSubfolder(personId, docType);
}

async function gdriveUploadFile(file, folderId, filename){
  const metadata = { name: filename, parents: [folderId] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id&supportsAllDrives=true', {
    method: 'POST',
    headers: { Authorization: `Bearer ${gdriveAccessToken}` },
    body: form
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error?.message || 'Upload failed');
  await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${gdriveAccessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'anyone', role: 'reader' })
  });
  return `https://drive.google.com/file/d/${data.id}/view`;
}

// Inject 📤 upload buttons next to every proof URL input
function setupDriveButtons(){
  document.querySelectorAll('input[type="url"][id$="-proof"]').forEach(input => {
    if(input.parentElement.querySelector('[data-gdrive-btn]')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '📤';
    btn.title = 'Upload file to Google Drive';
    btn.setAttribute('data-gdrive-btn', input.id);
    btn.style.cssText = 'padding:.35rem .6rem;background:var(--navy);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.75rem;white-space:nowrap;flex-shrink:0;line-height:1';
    btn.onclick = () => gdriveUploadClick(input.id);
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;gap:.35rem;align-items:center;width:100%';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    wrapper.appendChild(btn);
  });
}

// Initialize GIS after the library loads
window.addEventListener('load', () => {
  setTimeout(() => { if(appSettings.google_client_id) gdriveInit(); setupDriveButtons(); }, 500);
});
// Password changes handled via Supabase — "Forgot password?" on the sign-in screen.

// ── Tab Guide toggle ─────────────────────────────────────────────────
function toggleGuide(id){
  const body  = document.getElementById('guide-body-'+id);
  const arrow = document.getElementById('guide-arrow-'+id);
  const open  = body.classList.toggle('open');
  arrow.classList.toggle('open', open);
}

/* 🏢 Office orientation (backup only), collapsed at the bottom of the Orientations tab. Its calendar and sessions
   list render while hidden; opening it draws them again so it always shows the latest. */
function toggleOfficeOrient(){
  toggleGuide('orient-office');
  const body = document.getElementById('guide-body-orient-office');
  if(body && body.classList.contains('open')){ try{ renderCalendar(); renderSessionsList(); }catch(e){ console.warn('office orientation render:', e); } }
}

// ── Google Calendar Sync ─────────────────────────────────────────────
function getOrientDuration(){ return parseFloat(appSettings.orient_config?.duration)||2; }

function gcalCalendarId(){
  return (appSettings.gcal_calendar_id||'primary').trim();
}

async function gcalEnsureToken(){
  // Reuse the same Drive/Calendar token client
  if(!gdriveTokenClient) gdriveInit();
  if(!gdriveAccessToken){
    return new Promise((resolve, reject) => {
      if(!gdriveTokenClient){ reject(new Error('Google not configured')); return; }
      const orig = gdriveTokenClient.callback;
      gdriveTokenClient.callback = (resp) => {
        if(resp.error){ reject(new Error(resp.error)); }
        else { gdriveAccessToken = resp.access_token; resolve(resp.access_token); }
        gdriveTokenClient.callback = orig;
      };
      gdriveTokenClient.requestAccessToken({ prompt: '' });
    });
  }
  return gdriveAccessToken;
}

function gcalBuildEvent(session){
  const [h, m] = (session.time||'10:00').split(':').map(Number);
  const start = new Date(`${session.date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
  const end = new Date(start.getTime() + getOrientDuration()*60*60*1000);
  // Format as local wall-clock time (NOT toISOString, which converts to UTC and
  // shifted events by 5-6 hours when paired with the America/Chicago timeZone)
  const pad2 = n => String(n).padStart(2,'0');
  const toLocal = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;
  const locParts = session.is_remote==='yes'
    ? { location: session.video_link||'Remote — video call', conferenceUrl: session.video_link }
    : { location: '1331 N Stewart Ave Ste B, Springfield, MO 65802' };
  const facName = session.facilitator || '';
  const facRole = session.facilitator_role || '';
  const facFull = facName && facRole ? `${facName} (${facRole})` : facName || facRole || '';
  const facilitatorNote = facFull ? `\nFacilitator: ${facFull}` : '';
  const notesNote = session.notes ? `\nNotes: ${session.notes}` : '';
  const attendeeCount = (session.bookings||[]).length;
  return {
    summary: `Caring Companions Orientation${facFull ? ` — ${facFull}` : ''}`,
    description: `Agency orientation session (${attendeeCount}/${session.capacity||6} booked)${facilitatorNote}${notesNote}`,
    location: locParts.location,
    start: { dateTime: toLocal(start), timeZone: 'America/Chicago' },
    end:   { dateTime: toLocal(end),   timeZone: 'America/Chicago' },
  };
}

async function gcalCreateEvent(session){
  if(!appSettings.google_client_id) return null;
  try {
    const token = await gcalEnsureToken();
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(gcalCalendarId())}/events`,
      { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify(gcalBuildEvent(session)) }
    );
    if(!res.ok){ console.warn('gcal create failed', await res.text()); return null; }
    const data = await res.json();
    return data.id;
  } catch(e){ console.warn('gcal create error', e); return null; }
}

async function gcalUpdateEvent(session){
  if(!appSettings.google_client_id || !session.gcal_event_id) return;
  try {
    const token = await gcalEnsureToken();
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(gcalCalendarId())}/events/${session.gcal_event_id}`,
      { method:'PUT', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify(gcalBuildEvent(session)) }
    );
    if(!res.ok){ console.warn('gcal update failed', await res.text()); }
  } catch(e){ console.warn('gcal update error', e); }
}

async function gcalDeleteEvent(session){
  if(!appSettings.google_client_id || !session.gcal_event_id) return;
  try {
    const token = await gcalEnsureToken();
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(gcalCalendarId())}/events/${session.gcal_event_id}`,
      { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } }
    );
  } catch(e){ console.warn('gcal delete error', e); }
}

// ── New Client Queue ─────────────────────────────────────────────────
let clientQueueShowCompleted = false;

async function loadClientQueue(forceRender=false){
  const el = document.getElementById('client-queue-list');
  if(el) el.innerHTML = `<div style="text-align:center;padding:1rem;color:var(--gray);font-size:.8rem">⏳ Loading client queue…</div>`;
  try {
    const { data:{ session } } = await sb.auth.getSession();
    if(!session){
      window._clientQueue = [];
      if(el) el.innerHTML = `<div style="background:#fef3c7;border:1.5px solid #fcd34d;border-radius:8px;padding:.75rem 1rem;font-size:.82rem;color:#92400e">⚠️ Not signed in — client queue requires authentication. Please sign in to view new clients.</div>`;
      return;
    }
    const { data, error } = await sb.from('client_queue').select('*').order('added_at', { ascending: false });
    if(error) throw error;
    window._clientQueue = data || [];
  } catch(e){
    window._clientQueue = window._clientQueue || [];
    console.warn('client_queue load failed', e);
    if(el) el.innerHTML = `<div style="background:#fee2e2;border:1.5px solid #fca5a5;border-radius:8px;padding:.75rem 1rem;font-size:.82rem;color:#b91c1c">❌ Could not load client queue: <strong>${e.message}</strong>${e.code ? ` (code: ${e.code})` : ''}<br><span style="font-size:.72rem;margin-top:.3rem;display:block">Open browser console (F12) for details.</span></div>`;
    return;
  }
  renderClientQueue();
}


function renderClientQueue(){
  const el = document.getElementById('client-queue-list');
  if(!el) return;
  const all = window._clientQueue || [];
  const pending = all.filter(c => c.status !== 'complete');
  const completed = all.filter(c => c.status === 'complete');

  let html = '';

  // Pending section
  if(!pending.length){
    html += `<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:1.25rem;text-align:center;color:#166534;font-size:.82rem;margin-bottom:.75rem">
      ✅ No pending clients — all scheduled!
      <div style="font-size:.7rem;margin-top:.3rem;color:var(--gray)">New clients appear here automatically when added in AxisCare via Zapier. <a href="#" onclick="openAddClientManual();return false" style="color:var(--teal)">Or add one manually →</a></div>
    </div>`;
  } else {
    html += pending.map(c => renderClientCard(c)).join('');
    html += `<div style="font-size:.7rem;color:var(--gray);text-align:right;margin-bottom:.5rem">
      <a href="#" onclick="openAddClientManual();return false" style="color:var(--teal)">+ Add client manually</a>
    </div>`;
  }

  // Completed section — always collapsed, compact
  if(completed.length){
    html += `<div style="border:1.5px solid #d1fae5;border-radius:10px;overflow:hidden;margin-top:.5rem">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:.5rem .9rem;background:#f0fdf4;cursor:pointer;user-select:none" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='block'?'none':'block'">
        <span style="font-size:.77rem;font-weight:700;color:#166534">✅ Completed (${completed.length})</span>
        <span style="font-size:.72rem;color:#166534">▼</span>
      </div>
      <div style="display:none;padding:.65rem .9rem;display:none">
        ${completed.map(c=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid #d1fae5;font-size:.78rem;color:var(--navy)">
          <div>
            <span style="font-weight:600">${c.client_name}</span>
            ${c.caregiver_assigned_name?`<span style="color:var(--gray);margin-left:.5rem">→ ${c.caregiver_assigned_name}</span>`:''}
            ${c.payer?`<span style="font-size:.68rem;background:#e0f2fe;color:#0369a1;border-radius:4px;padding:.1rem .35rem;margin-left:.35rem">${c.payer}</span>`:''}
          </div>
          <div style="display:flex;align-items:center;gap:.5rem">
            <span style="font-size:.7rem;color:var(--gray)">${c.completed_at?new Date(c.completed_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):''}</span>
            <button onclick="deleteClientQueueItem('${c.id}')" style="background:none;border:none;cursor:pointer;font-size:.78rem;color:#ccc;padding:.1rem .25rem" title="Remove">✕</button>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
  }

  el.innerHTML = html;
  // Re-attach the completed toggle properly
  const completedSect = el.querySelector('[style*="d1fae5"]');
  if(completedSect){
    const hdr = completedSect.querySelector('div');
    const body = completedSect.querySelectorAll('div')[1];
    if(hdr && body) hdr.onclick = ()=>{ body.style.display = body.style.display==='block'?'none':'block'; };
  }
}

// Track which client cards are expanded
const _cqExpanded = new Set();

function toggleCQCard(id){
  if(_cqExpanded.has(id)) _cqExpanded.delete(id); else _cqExpanded.add(id);
  const body = document.getElementById(`cq-body-${id}`);
  const arrow = document.getElementById(`cq-arrow-${id}`);
  if(body) body.style.display = _cqExpanded.has(id) ? 'block' : 'none';
  if(arrow) arrow.textContent = _cqExpanded.has(id) ? '▲' : '▼';
}

function renderClientCard(c){
  const allChecked = c.caregiver_assigned && c.caregiver_called && c.client_called && c.schedule_added;
  const notesOk = (c.caregiver_call_notes||'').trim() && (c.client_call_notes||'').trim();
  const canComplete = allChecked && notesOk;
  const progress = [c.caregiver_assigned, c.caregiver_called, c.client_called, c.schedule_added].filter(Boolean).length;
  const dateLabel = c.start_date ? new Date(c.start_date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'TBD';
  const addedLabel = new Date(c.added_at).toLocaleDateString('en-US',{month:'short',day:'numeric'});

  // Auto-expand cards that are partially started but not complete
  if(progress > 0 && progress < 4 && !_cqExpanded.has(c.id)) _cqExpanded.add(c.id);
  // Also expand if notes are missing on an otherwise complete card
  if(allChecked && !notesOk && !_cqExpanded.has(c.id)) _cqExpanded.add(c.id);
  const isOpen = _cqExpanded.has(c.id);

  const fmtTs = ts => ts ? new Date(ts).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}) : '';

  // Step dots for the compact header
  const steps = [c.caregiver_assigned, c.caregiver_called, c.client_called, c.schedule_added];
  const stepLabels = ['Assigned','CG Called','Client Called','Scheduled'];
  const stepDots = steps.map((done,i)=>`<span title="${stepLabels[i]}" style="display:inline-flex;align-items:center;justify-content:center;width:1.2rem;height:1.2rem;border-radius:50%;font-size:.62rem;font-weight:700;background:${done?'#22c55e':'#F3EDE3'};color:${done?'#fff':'#A89C8B'}">${done?'✓':(i+1)}</span>`).join('');

  const borderColor = canComplete?'#fde68a':allChecked&&!notesOk?'#fca5a5':progress>0?'#86efac':'#F3EDE3';

  const cgNotesHtml = c.caregiver_called ? `
    <div style="margin-top:.45rem" onclick="event.stopPropagation()">
      ${c.caregiver_called_at ? `<div style="font-size:.67rem;color:#8A7F70;margin-bottom:.25rem">✓ Completed ${fmtTs(c.caregiver_called_at)}</div>` : ''}
      <textarea rows="2" placeholder="Required — notes from caregiver call (confirmed schedule, any concerns…)" onblur="saveCallNotes('${c.id}','caregiver_call_notes',this.value)" style="width:100%;padding:.35rem .55rem;border:1.5px solid ${(c.caregiver_call_notes||'').trim()?'#86efac':'#fca5a5'};border-radius:6px;font-family:inherit;font-size:.74rem;resize:vertical;box-sizing:border-box;background:#fff">${c.caregiver_call_notes||''}</textarea>
      ${!(c.caregiver_call_notes||'').trim() ? `<div style="font-size:.68rem;color:#dc2626;margin-top:.15rem">⚠ Notes required</div>` : ''}
    </div>` : '';

  const clientNotesHtml = c.client_called ? `
    <div style="margin-top:.45rem" onclick="event.stopPropagation()">
      ${c.client_called_at ? `<div style="font-size:.67rem;color:#8A7F70;margin-bottom:.25rem">✓ Completed ${fmtTs(c.client_called_at)}</div>` : ''}
      <textarea rows="2" placeholder="Required — notes from client call (schedule confirmed, client reaction, anything to flag…)" onblur="saveCallNotes('${c.id}','client_call_notes',this.value)" style="width:100%;padding:.35rem .55rem;border:1.5px solid ${(c.client_call_notes||'').trim()?'#86efac':'#fca5a5'};border-radius:6px;font-family:inherit;font-size:.74rem;resize:vertical;box-sizing:border-box;background:#fff">${c.client_call_notes||''}</textarea>
      ${!(c.client_call_notes||'').trim() ? `<div style="font-size:.68rem;color:#dc2626;margin-top:.15rem">⚠ Notes required</div>` : ''}
    </div>` : '';

  return `<div style="background:#fff;border:2px solid ${borderColor};border-radius:10px;margin-bottom:.5rem;overflow:hidden">

    <!-- Compact header row — always visible, click to expand -->
    <div onclick="toggleCQCard('${c.id}')" style="display:flex;align-items:center;gap:.75rem;padding:.6rem .9rem;cursor:pointer;user-select:none;${isOpen?'border-bottom:1.5px solid #FAF9F6':''}">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:.55rem;flex-wrap:wrap">
          <span style="font-size:.88rem;font-weight:700;color:var(--navy);white-space:nowrap">${c.client_name}</span>
          ${c.payer?`<span style="font-size:.65rem;background:#e0f2fe;color:#0369a1;border-radius:4px;padding:.1rem .35rem;font-weight:600;white-space:nowrap">${c.payer}</span>`:''}
          ${c.auth_hours?`<span style="font-size:.65rem;background:#f0fdf4;color:#166534;border-radius:4px;padding:.1rem .35rem;font-weight:600;white-space:nowrap">${c.auth_hours}</span>`:''}
          <span style="font-size:.65rem;color:var(--gray);white-space:nowrap">Start: ${dateLabel}</span>
        </div>
        ${c.caregiver_assigned_name?`<div style="font-size:.7rem;color:#166534;margin-top:.15rem">👤 ${c.caregiver_assigned_name}</div>`:''}
      </div>
      <div style="display:flex;align-items:center;gap:.5rem;flex-shrink:0">
        <div style="display:flex;gap:.2rem">${stepDots}</div>
        <span style="font-size:.7rem;font-weight:700;color:${progress===4?'#22c55e':'#92400e'};background:${progress===4?'#f0fdf4':'#fff7ed'};border-radius:5px;padding:.15rem .45rem;white-space:nowrap">${progress}/4</span>
        <button onclick="event.stopPropagation();deleteClientQueueItem('${c.id}')" style="background:none;border:none;cursor:pointer;font-size:.8rem;color:#E8E2D8;padding:.1rem .25rem;line-height:1" title="Remove">✕</button>
        <span id="cq-arrow-${c.id}" style="font-size:.65rem;color:var(--gray);min-width:.7rem;text-align:center">${isOpen?'▲':'▼'}</span>
      </div>
    </div>

    <!-- Expandable checklist body -->
    <div id="cq-body-${c.id}" style="display:${isOpen?'block':'none'};padding:.75rem .9rem">
      ${c.schedule_notes?`<div style="font-size:.74rem;color:#92400e;margin-bottom:.6rem;background:#fff7ed;border-radius:5px;padding:.25rem .5rem">📋 ${c.schedule_notes}</div>`:''}
      ${c.axiscare_client_id?`<div style="font-size:.68rem;color:var(--gray);margin-bottom:.5rem">AxisCare ID: ${c.axiscare_client_id}</div>`:''}

      <div style="display:flex;flex-direction:column;gap:.5rem">

        <!-- Step 1: Assign caregiver -->
        <label style="display:flex;align-items:flex-start;gap:.65rem;cursor:pointer;padding:.5rem .7rem;border-radius:8px;border:1.5px solid ${c.caregiver_assigned?'#86efac':'var(--border)'};background:${c.caregiver_assigned?'#f0fdf4':'#fafafa'}">
          <input type="checkbox" ${c.caregiver_assigned?'checked':''} onchange="updateCQStep('${c.id}','caregiver_assigned',this.checked)" style="margin-top:.15rem;accent-color:#22c55e;width:1rem;height:1rem;flex-shrink:0">
          <div style="flex:1">
            <div style="font-size:.8rem;font-weight:600;color:var(--navy)${c.caregiver_assigned?';text-decoration:line-through;opacity:.55':''}">Caregiver assigned in AxisCare</div>
            <div style="font-size:.72rem;color:var(--gray);margin-top:.1rem">Match and assign a caregiver to this client's shifts in AxisCare.</div>
            ${c.caregiver_assigned && !c.caregiver_assigned_name ? `<input type="text" placeholder="Enter caregiver name…" onblur="saveCaregiverName('${c.id}',this.value)" onclick="event.stopPropagation()" style="margin-top:.3rem;width:100%;padding:.3rem .55rem;border:1.5px solid #86efac;border-radius:6px;font-family:inherit;font-size:.75rem;background:#fff;box-sizing:border-box">` : ''}
            ${c.caregiver_assigned_name ? `<div style="font-size:.73rem;font-weight:600;color:#166534;margin-top:.2rem">👤 ${c.caregiver_assigned_name}</div>` : ''}
            ${c.caregiver_assigned && c.caregiver_assigned_at ? `<div style="font-size:.67rem;color:#8A7F70;margin-top:.15rem">✓ ${fmtTs(c.caregiver_assigned_at)}</div>` : ''}
          </div>
        </label>

        <!-- Step 2: Call caregiver + notes -->
        <div style="padding:.5rem .7rem;border-radius:8px;border:1.5px solid ${c.caregiver_called?'#86efac':'var(--border)'};background:${c.caregiver_called?'#f0fdf4':'#fafafa'}${!c.caregiver_assigned?';opacity:.4':''}">
          <label style="display:flex;align-items:flex-start;gap:.65rem;${!c.caregiver_assigned?'cursor:not-allowed':'cursor:pointer'}">
            <input type="checkbox" ${c.caregiver_called?'checked':''} ${!c.caregiver_assigned?'disabled':''} onchange="updateCQStep('${c.id}','caregiver_called',this.checked)" style="margin-top:.15rem;accent-color:#22c55e;width:1rem;height:1rem;flex-shrink:0">
            <div>
              <div style="font-size:.8rem;font-weight:600;color:var(--navy)${c.caregiver_called?';text-decoration:line-through;opacity:.55':''}">Called &amp; briefed ${c.caregiver_assigned_name||'assigned caregiver'}</div>
              <div style="font-size:.72rem;color:var(--gray);margin-top:.1rem">Introduce the client, review care plan and schedule, confirm start date.</div>
            </div>
          </label>
          ${cgNotesHtml}
        </div>

        <!-- Step 3: Call client + notes -->
        <div style="padding:.5rem .7rem;border-radius:8px;border:1.5px solid ${c.client_called?'#86efac':'var(--border)'};background:${c.client_called?'#f0fdf4':'#fafafa'}${!c.caregiver_assigned?';opacity:.4':''}">
          <label style="display:flex;align-items:flex-start;gap:.65rem;${!c.caregiver_assigned?'cursor:not-allowed':'cursor:pointer'}">
            <input type="checkbox" ${c.client_called?'checked':''} ${!c.caregiver_assigned?'disabled':''} onchange="updateCQStep('${c.id}','client_called',this.checked)" style="margin-top:.15rem;accent-color:#22c55e;width:1rem;height:1rem;flex-shrink:0">
            <div>
              <div style="font-size:.8rem;font-weight:600;color:var(--navy)${c.client_called?';text-decoration:line-through;opacity:.55':''}">Called ${c.client_name} &amp; confirmed schedule</div>
              <div style="font-size:.72rem;color:var(--gray);margin-top:.1rem">Share caregiver's name, confirm start date and days/times of care.</div>
            </div>
          </label>
          ${clientNotesHtml}
        </div>

        <!-- Step 4: Added schedule into AxisCare -->
        <label style="display:flex;align-items:flex-start;gap:.65rem;${!c.client_called?'opacity:.4;cursor:not-allowed':'cursor:pointer'};padding:.5rem .7rem;border-radius:8px;border:1.5px solid ${c.schedule_added?'#86efac':'var(--border)'};background:${c.schedule_added?'#f0fdf4':'#fafafa'}">
          <input type="checkbox" ${c.schedule_added?'checked':''} ${!c.client_called?'disabled':''} onchange="updateCQStep('${c.id}','schedule_added',this.checked)" style="margin-top:.15rem;accent-color:#22c55e;width:1rem;height:1rem;flex-shrink:0">
          <div>
            <div style="font-size:.8rem;font-weight:600;color:var(--navy)${c.schedule_added?';text-decoration:line-through;opacity:.55':''}">Added schedule into AxisCare</div>
            <div style="font-size:.72rem;color:var(--gray);margin-top:.1rem">Enter the confirmed shift schedule in AxisCare so it appears on the caregiver's calendar.</div>
            ${c.schedule_added && c.schedule_added_at ? `<div style="font-size:.67rem;color:#8A7F70;margin-top:.15rem">✓ ${fmtTs(c.schedule_added_at)}</div>` : ''}
          </div>
        </label>

      </div>

      ${allChecked && !notesOk ? `<div style="margin-top:.65rem;background:#fef2f2;border:1.5px solid #fca5a5;border-radius:8px;padding:.5rem .75rem;font-size:.78rem;color:#dc2626">
        ⚠ Please add call notes for steps 2 and 3 before marking complete.
      </div>` : ''}

      ${canComplete ? `<div style="margin-top:.65rem">
        <button onclick="completeClientQueueItem('${c.id}')" style="padding:.4rem 1rem;background:#22c55e;color:#fff;border:none;border-radius:8px;font-family:inherit;font-size:.8rem;font-weight:700;cursor:pointer">✅ Mark Scheduling Complete</button>
      </div>` : ''}
    </div>

  </div>`;
}

// Surfaces Supabase save failures (e.g. a missing column) instead of losing the
// change silently — the checklist state lives in the client_queue table.
function cqSaveError(error){
  alert('⚠️ Could not save to the client queue: ' + error.message +
    '\n\nIf this mentions a missing column, run fix-scheduling-and-bookings.sql in the Supabase SQL Editor.');
}

async function updateCQStep(id, field, value){
  const item = (window._clientQueue||[]).find(c=>c.id===id);
  const tsField = field + '_at';
  const tsValue = value ? new Date().toISOString() : null;
  if(item){ item[field] = value; item[tsField] = tsValue; }
  renderClientQueue();
  const { error } = await sb.from('client_queue').update({ [field]: value, [tsField]: tsValue }).eq('id', id);
  if(error) cqSaveError(error);
}

async function saveCallNotes(id, field, value){
  const item = (window._clientQueue||[]).find(c=>c.id===id);
  if(item) item[field] = value;
  renderClientQueue();
  const { error } = await sb.from('client_queue').update({ [field]: value }).eq('id', id);
  if(error) cqSaveError(error);
}

async function saveCaregiverName(id, name){
  if(!name.trim()) return;
  const item = (window._clientQueue||[]).find(c=>c.id===id);
  if(item) item.caregiver_assigned_name = name.trim();
  renderClientQueue();
  const { error } = await sb.from('client_queue').update({ caregiver_assigned_name: name.trim() }).eq('id', id);
  if(error) cqSaveError(error);
}

async function completeClientQueueItem(id){
  const { data:{ user } } = await sb.auth.getUser();
  const { data:{ session } } = await sb.auth.getSession();
  const now = new Date().toISOString();
  const item = (window._clientQueue||[]).find(c=>c.id===id);
  if(item){ item.status='complete'; item.completed_at=now; item.completed_by=user?.email||''; }
  renderClientQueue();
  const { error } = await sb.from('client_queue').update({ status:'complete', completed_at:now, completed_by:user?.email||'' }).eq('id', id);
  if(error) cqSaveError(error);

  // Push scheduling summary note to AxisCare client profile
  if(item?.axiscare_client_id && session?.access_token){
    try {
      const res = await fetch('https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/axiscare-push-note', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_queue_id: id })
      });
      const data = await res.json();
      if(data.success){
        console.log('✅ Scheduling note pushed to AxisCare, note ID:', data.note_id);
      } else {
        console.warn('AxisCare note push failed:', data.error);
      }
    } catch(e){
      console.warn('AxisCare note push error:', e);
    }
  }
}

async function deleteClientQueueItem(id){
  if(!confirm('Remove this client from the queue?')) return;
  window._clientQueue = (window._clientQueue||[]).filter(c=>c.id!==id);
  renderClientQueue();
  await sb.from('client_queue').delete().eq('id', id);
}

function openAddClientManual(){
  const name = prompt('Client name:');
  if(!name) return;
  addClientToQueue({ client_name: name.trim(), source: 'manual' });
}

async function addClientToQueue(data){
  const payload = {
    client_name: data.client_name || '',
    client_address: data.client_address || '',
    start_date: data.start_date || null,
    auth_hours: data.auth_hours || '',
    payer: data.payer || '',
    schedule_notes: data.schedule_notes || data.notes || '',
    axiscare_client_id: data.axiscare_client_id || data.client_id || '',
    caregiver_assigned: false,
    caregiver_called: false,
    client_called: false,
    schedule_added: false,
    caregiver_call_notes: '',
    client_call_notes: '',
    status: 'pending',
  };
  const { data: inserted, error } = await sb.from('client_queue').insert([payload]).select();
  if(!error && inserted){
    if(!window._clientQueue) window._clientQueue = [];
    window._clientQueue.unshift(inserted[0]);
    renderClientQueue();
  }
}

// ── New Client Scheduling Alert (legacy — replaced by queue) ──────────
async function sendNewClientAlert(){
  const name      = document.getElementById('nc-client-name').value.trim();
  const startDate = document.getElementById('nc-start-date').value;
  const authHrs   = document.getElementById('nc-auth-hours').value.trim();
  const payer     = document.getElementById('nc-payer').value;
  const notes     = document.getElementById('nc-notes').value.trim();
  const statusEl  = document.getElementById('nc-alert-status');

  if(!name){ alert('Please enter the client name.'); return; }

  // Build formatted date
  const dateLabel = startDate
    ? new Date(startDate+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})
    : 'TBD';

  // Who sent the alert
  const { data:{ user } } = await sb.auth.getUser();
  const sentBy = user?.email || 'Care Coordinator';

  const payload = {
    type:           'new_client_scheduling',
    client_name:    name,
    start_date:     startDate || '',
    start_date_label: dateLabel,
    auth_hours:     authHrs || 'See AxisCare',
    payer:          payer || 'See AxisCare',
    notes:          notes || '',
    sent_by:        sentBy,
    sent_at:        new Date().toISOString(),
    recipients:     getNotifEmails('comp'), // uses Comp notification group — adjust as needed
  };

  statusEl.style.display='inline';
  statusEl.textContent='⏳ Sending…';

  const sent = false;   /* Zapier removed 2026-09-28: the alert shows here for you to pass on */

  if(sent){
    statusEl.textContent = `✅ Staffing Coordinator notified about ${name}`;
    document.getElementById('nc-client-name').value='';
    document.getElementById('nc-start-date').value='';
    document.getElementById('nc-auth-hours').value='';
    document.getElementById('nc-payer').value='';
    document.getElementById('nc-notes').value='';
  } else {
    // Fallback: show the notification as a visible alert in the hub
    statusEl.textContent='';
    alert(`📋 New Client Alert\n\nClient: ${name}\nStart: ${dateLabel}\nPayer: ${payer||'—'}\nHrs/Week: ${authHrs||'—'}\n${notes?'Notes: '+notes+'\n':''}`);
  }
}


async function gcalSyncAll(){
  if(!appSettings.google_client_id){
    alert('Set up your Google Client ID in Settings → Google Drive/Calendar first.');
    return;
  }
  const now = new Date(); now.setHours(0,0,0,0);
  const upcoming = orientSessions.filter(s=>new Date(s.date+'T00:00:00')>=now);
  if(!upcoming.length){ alert('No upcoming sessions to sync.'); return; }
  const btn = event.target; btn.disabled=true; btn.textContent='⏳ Syncing…';
  let synced=0, failed=0;
  for(const s of upcoming){
    try {
      if(s.gcal_event_id){ await gcalUpdateEvent(s); synced++; }
      else {
        const eid = await gcalCreateEvent(s);
        if(eid){ s.gcal_event_id=eid; synced++; } else { failed++; }
      }
    } catch(e){ failed++; }
  }
  saveOrientStore();
  renderOrientations();
  btn.disabled=false; btn.textContent='📅 Sync to GCal';
  alert(`Calendar sync complete: ${synced} synced${failed?`, ${failed} failed`:''}. Check Google Calendar at calendar.google.com.`);
}

// ── Tabs ──────────────────────────────────────────────────────────────
/* One file serves several sidebar entries — Recruit, Onboarding, HR &
   Compliance, Scheduling, Training, Coordinator Team all deep-link into it. So
   a fixed page title is wrong for most of them: clicking "HR & Compliance" and
   landing on a page headed "Recruiting & Onboarding" is worse than the neutral
   name it replaced. The header names the SECTION you're in, not the file. */
const SECTION_TITLES = {
  home:'Recruiting &amp; Onboarding', offers:'Recruit', onboarding:'Onboarding',
  orientations:'Orientations', training:'Training', compliance:'HR &amp; Compliance',
  attendance:'Attendance', writeups:'Write-Ups', scheduling:'Scheduling', evv:'EVV Corrections',
  checkins:'Check-ins', coordreq:'Coordinator Requests', sendmsg:'Send a Message',
  meetings:'Meetings', comms:'Communication', eod:'End of Day',
};
function setSectionTitle(name){
  const el=document.querySelector('.hdr-center h1');
  if(el) el.innerHTML = SECTION_TITLES[name] || 'Caring Companions';
  const t=String(SECTION_TITLES[name]||'').replace(/&amp;/g,'&');
  if(t) document.title = t+' — Caring Companions';
}

function switchTab(name, btn){
  activeTab = name;
  setSectionTitle(name);
  document.querySelectorAll('.subbar .tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  if(btn) btn.classList.add('active');
  document.getElementById('panel-'+name).classList.add('active');
  if(name==='home') { renderStaffHome(); }
  if(name==='orientations'){ renderOrientations(); initOrientSettings(); orientLoadPending().then(renderOrientations); }
  if(name==='evv') { renderEVVCorrections(); loadPendingEVVSubmissions(); }
  if(name==='offers') { loadOffers(); }
  if(name==='eod') { renderEod(); }
  if(name==='coordreq') { renderCoordReqs(); }
  if(name==='scheduling') { loadOpenShifts(); renderDnrLog(); }
  if(name==='comms') { loadRepliesWaiting(); }
  if(name==='meetings') { renderMeetings(); }
  if(name==='writeups'){ renderWriteups(); }
  if(name==='sendmsg') { renderSendMsg(); }
  if(name==='attendance') { renderAttendance(); }
  if(name==='checkins') { renderCheckins(); renderCheckinPairs(); loadCheckinPairs(); }
}

async function resolveReturnedItem(hid,i){
  const h=(HANDOFFS||[]).find(x=>x.id===hid); if(!h||!h.items[i]) return;
  const note=prompt('Resolved ✓ — note for the record (optional):',''); if(note===null) return;
  h.items[i].done_at=new Date().toISOString();
  h.items[i].done_by=(window._myEmail||'staffing').split('@')[0];
  if(note.trim()) h.items[i].done_note=note.trim();
  try{ const { error } = await sb.rpc('upsert_app_data_item',{ target_key:'handoffs', item:h }); if(error) throw error; }
  catch(e){ alert('Could not save — try again.'); return; }
  renderStaffHome();
}

// ── END-OF-SHIFT HANDOFF (writes the same shared 'handoffs' key the CC hub
//    reads — the evening/after-hours coordinator sees it in their banner) ──
let staffHandoffDraft=[];
function openStaffHandoff(){
  staffHandoffDraft=[];
  const today10=new Date().toISOString().slice(0,10);
  const now=Date.now();
  (OPEN_SHIFTS||[]).forEach(s=>{
    const hrs=(new Date(s.date+'T'+(s.start24||'23:59')).getTime()-now)/3600000;
    if(hrs<=48) staffHandoffDraft.push({include:true,note:'',label:'🔴 OPEN SHIFT still unfilled: '+s.client+' — '+s.date+(s.start?' '+s.start:'')});
  });
  STASKS.filter(t=>t.direction==='to_staffing'&&t.status==='open'&&t.urgency==='Today').forEach(t=>
    staffHandoffDraft.push({include:true,note:'',label:'📨 Unfinished TODAY request: '+(t.about?t.about+' — ':'')+String(t.message||'').slice(0,80)}));
  OFFERS.filter(o=>!o.attributes_entered_at).slice(0,5).forEach(o=>
    staffHandoffDraft.push({include:false,note:'',label:'🤝 New hire awaiting AxisCare attributes: '+(o.name||'')}));
  if(!(eodReports||[]).some(r=>r.report_date===today10))
    staffHandoffDraft.push({include:false,note:'',label:'📄 (Reminder to me) End-of-day report not uploaded yet'});
  renderStaffHandoffDraft();
  document.getElementById('staffhandoff-note').value='';
  document.getElementById('staffhandoff-modal').classList.add('open');
}
function renderStaffHandoffDraft(){
  document.getElementById('staffhandoff-items').innerHTML = staffHandoffDraft.length
    ? staffHandoffDraft.map((it,i)=>'<div style="display:flex;align-items:flex-start;gap:.5rem;padding:.4rem 0;border-bottom:1px solid var(--border);font-size:.8rem">'
      +'<input type="checkbox" style="width:auto;margin-top:.15rem" '+(it.include?'checked':'')+' onchange="staffHandoffDraft['+i+'].include=this.checked">'
      +'<div style="flex:1;min-width:0">'+creqEsc(it.label)
      +'<input placeholder="Context for tonight… (optional)" value="'+creqEsc(it.note||'')+'" oninput="staffHandoffDraft['+i+'].note=this.value" style="width:100%;margin-top:.25rem;font-size:.74rem;padding:.3rem .5rem">'
      +'</div></div>').join('')
    : '<div style="color:#A89C8B;font-size:.8rem;padding:.4rem 0">Nothing time-sensitive is open — add items below or just leave a note.</div>';
}
function addStaffHandoffItem(){
  const inp=document.getElementById('staffhandoff-custom');
  const v=inp.value.trim(); if(!v) return;
  staffHandoffDraft.push({include:true,note:'',label:v});
  inp.value=''; renderStaffHandoffDraft();
}
async function postStaffHandoff(){
  const items=staffHandoffDraft.filter(it=>it.include).map(it=>({id:'shi'+Date.now()+Math.random().toString(36).slice(2,5),type:'custom',ref:'',label:it.label,note:(it.note||'').trim(),done_at:null,done_by:null}));
  const note=document.getElementById('staffhandoff-note').value.trim();
  if(!items.length&&!note){ alert('Nothing to hand off — include an item or leave a note.'); return; }
  let by=''; try{ const {data:{session}}=await sb.auth.getSession(); by=(session&&session.user&&session.user.email)||''; }catch(e){}
  const h={ id:'ho'+Date.now(), posted_at:new Date().toISOString(), from_email:by,
    from_name:(by.split('@')[0]||'Staffing')+' (Staffing)', shift:'staffing',
    items, general_note:note, ack_by:null, ack_at:null };
  try{ const { error } = await sb.rpc('upsert_app_data_item',{ target_key:'handoffs', item:h }); if(error) throw error; }
  catch(e){ alert('Could not post — check your connection and try again.'); return; }
  document.getElementById('staffhandoff-modal').classList.remove('open');
  alert('Handoff posted ✓ — the evening/after-hours coordinator sees it the moment they open their hub, and it\'s on the permanent Communication Log.');
}

// ── SOP LINK (URL shared via appSettings.sop_onboarding) ──
function openSopLink(){
  const url=(appSettings.sop_onboarding||'').trim();
  if(url){ window.open(url,'_blank','noopener'); return; }
  editSopLink();
}
function editSopLink(){
  const v=prompt('Paste the link to the Onboarding & Compliance SOP (Google Doc, PDF, etc.) — saved for the whole team:', appSettings.sop_onboarding||'');
  if(v===null) return;
  appSettings.sop_onboarding=v.trim();
  syncToSupabase('settings', appSettings);
  if(appSettings.sop_onboarding) window.open(appSettings.sop_onboarding,'_blank','noopener');
}

function openRoleSopLink(){
  const url=(appSettings.sop_role||'').trim();
  if(url){ window.open(url,'_blank','noopener'); return; }
  editRoleSopLink();
}
function editRoleSopLink(){
  const v=prompt('Paste the link to the Staffing Coordinator Job Description & Duties document — saved for the whole team:', appSettings.sop_role||'');
  if(v===null) return;
  appSettings.sop_role=v.trim();
  syncToSupabase('settings', appSettings);
  if(appSettings.sop_role) window.open(appSettings.sop_role,'_blank','noopener');
}
function openCommsSopLink(){
  const url=(appSettings.sop_communication||'').trim();
  if(url){ window.open(url,'_blank','noopener'); return; }
  editCommsSopLink();
}
function editCommsSopLink(){
  const v=prompt('Paste the link to the Communication SOP (Google Doc, PDF, etc.) — saved for the whole team:', appSettings.sop_communication||'');
  if(v===null) return;
  appSettings.sop_communication=v.trim();
  syncToSupabase('settings', appSettings);
  if(appSettings.sop_communication) window.open(appSettings.sop_communication,'_blank','noopener');
}
function openSchedSopLink(){
  const url=(appSettings.sop_scheduling||'').trim();
  if(url){ window.open(url,'_blank','noopener'); return; }
  editSchedSopLink();
}
function editSchedSopLink(){
  const v=prompt('Paste the link to the Scheduling SOP (Google Doc, PDF, etc.) — saved for the whole team:', appSettings.sop_scheduling||'');
  if(v===null) return;
  appSettings.sop_scheduling=v.trim();
  syncToSupabase('settings', appSettings);
  if(appSettings.sop_scheduling) window.open(appSettings.sop_scheduling,'_blank','noopener');
}

// ── GROUPED NAVIGATION + STAFFING OVERVIEW ──
const SC_GROUPS={home:['home'],onboard:['offers','onboarding','orientations','training'],hr:['compliance','attendance','writeups'],sched:['scheduling','evv','checkins'],team:['coordreq','sendmsg','meetings','comms','eod']};
function groupOf(tab){ for(const g in SC_GROUPS) if(SC_GROUPS[g].includes(tab)) return g; return 'home'; }
function showGroupChrome(g){
  document.querySelectorAll('#groupBar .gtab').forEach(b=>b.classList.toggle('active',b.dataset.group===g));
  document.querySelectorAll('.subbar').forEach(s=>{ s.style.display = s.id==='sub-'+g ? 'flex' : 'none'; });
}
function switchGroup(g){
  showGroupChrome(g);
  if(g==='home'){ gotoTab('home'); return; }
  const last=localStorage.getItem('sc_last_'+g);
  gotoTab(SC_GROUPS[g].includes(last)?last:SC_GROUPS[g][0]);
}
function gotoTab(name){
  const g=groupOf(name);
  showGroupChrome(g);
  if(g!=='home') localStorage.setItem('sc_last_'+g,name);
  switchTab(name, document.querySelector('.tab[data-name="'+name+'"]'));
}
function badgeNum(id){ const el=document.getElementById(id); return (el&&el.style.display!=='none')?(+String(el.textContent).replace(/\D/g,'')||0):0; }
function updateGroupBadges(){
  const set=(gid,n)=>{ const el=document.getElementById(gid); if(!el) return; el.style.display=n?'inline':'none'; el.textContent=n; };
  set('gb-onboard', badgeNum('offersBadge'));
  set('gb-hr', badgeNum('attBadge'));
  set('gb-sched', badgeNum('schedBadge')+badgeNum('checkinsBadge'));
  set('gb-team', badgeNum('coordreqBadge')+badgeNum('commsBadge')+badgeNum('meetingsBadge'));
  if(activeTab==='home') renderStaffHome();
}
let _homeKicked=false;
function renderStaffHome(){
  const box=document.getElementById('home-rows'); if(!box) return;
  const hr=new Date().getHours();
  document.getElementById('home-greeting').textContent=(hr<12?'Good morning':hr<17?'Good afternoon':'Good evening')+' — your day at a glance';
  // Kick the async sources once so the counts fill themselves in.
  if(!_homeKicked){
    _homeKicked=true;
    try{ loadOpenShifts(); }catch(e){}
    try{ loadCheckinPairs(); }catch(e){}
    try{ loadOffers(); }catch(e){}
    try{ loadRepliesWaiting(); }catch(e){}
  }
  const today10=new Date().toISOString().slice(0,10);
  let blocked=0; try{ blocked=(caregivers||[]).filter(c=>{try{return !trainStatus(c).preContactDone;}catch(e){return false;}}).length; }catch(e){}
  /* 2c: new hires whose caregiver profile is not published (null until the lookup answers) */
  let profN=null; try{ const st=(caregivers||[]).map(c=>cgpgFor(c)).filter(Boolean);
    if(st.length && st[0].loaded) profN=st.filter(x=>x.blocked).length; }catch(e){}
  const attN=(typeof attCaregivers==='function')?attCaregivers().reduce((a,cg)=>a+attStatus(cg).triggers.length,0)+DISC_ACTIONS.filter(a=>a.status==='draft'||a.status==='approved').length:0;
  const reqN=STASKS.filter(t=>t.direction==='to_staffing'&&t.status==='open').length;
  const repN=(_repliesData&&_repliesData.replies)?_repliesData.replies.length:null;
  const mtgN=MEETINGS.filter(mtgIncoming).length;
  const offN=OFFERS.length?OFFERS.filter(o=>!o.attributes_entered_at).length:null;
  const shiftN=(typeof OPEN_SHIFTS!=='undefined'&&OPEN_SHIFTS)?OPEN_SHIFTS.length:null;
  const ciN=CI_PAIRS?CI_PAIRS.filter(p=>ciPairInfo(p).dueNow).length:null;
  const eodDone=(eodReports||[]).some(r=>r.report_date===today10);
  const row=(icon,n,label,sub,tab,urgent)=>{
    const chip=n===null?'<span style="color:#A89C8B;font-size:.8rem">…</span>'
      :n===0?'<span style="background:#dcfce7;color:#166534;border-radius:999px;padding:.1rem .6rem;font-size:.72rem;font-weight:800">clear ✓</span>'
      :'<span style="background:#DC2626;color:#fff;border-radius:999px;padding:.1rem .6rem;font-size:.72rem;font-weight:800">'+n+'</span>';
    return '<div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:.7rem 1rem;margin-bottom:.45rem;display:flex;align-items:center;gap:.8rem;flex-wrap:wrap">'
      +'<span style="font-size:1.15rem">'+icon+'</span>'
      +'<div style="flex:1;min-width:200px"><b style="font-size:.88rem;color:var(--navy)">'+label+'</b>'
      +'<div style="font-size:.72rem;color:var(--gray)">'+sub+'</div></div>'+chip
      +'<button class="fb" style="font-size:.72rem" onclick="gotoTab(\''+tab+'\')">Open →</button></div>';
  };
  const returned=(HANDOFFS||[]).flatMap(h=>(h.items||[]).map((it,i)=>({h,it,i})))
    .filter(x=>(x.h.from_email||'').toLowerCase()===(window._myEmail||'')&&x.it.returned_at&&!x.it.done_at);
  const returnedHtml=returned.length
    ? '<div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:.7rem 1rem;margin-bottom:.6rem">'
      +'<b style="font-size:.85rem;color:#92400E">↩ Sent back to you from your handoff ('+returned.length+')</b>'
      +returned.map(x=>'<div style="display:flex;align-items:flex-start;gap:.6rem;padding:.4rem 0;font-size:.8rem;flex-wrap:wrap">'
        +'<div style="flex:1;min-width:200px">'+creqEsc(x.it.label)
        +'<div style="font-size:.72rem;color:#92400E">'+creqEsc(x.it.returned_by||'')+': “'+creqEsc(x.it.return_note||'')+'” — it\'s yours again</div></div>'
        +'<button class="fb" style="font-size:.72rem" onclick="resolveReturnedItem(\''+x.h.id+'\','+x.i+')">✓ Resolved</button></div>').join('')
      +'</div>'
    : '';
  box.innerHTML= returnedHtml
    +'<div style="font-size:.72rem;font-weight:800;letter-spacing:.06em;color:var(--gray);text-transform:uppercase;margin:.2rem 0 .4rem">🗓 Scheduling</div>'
    +row('🔴',shiftN,'Open shifts — next 14 days','Every unassigned visit in AxisCare is yours to fill','scheduling',true)
    +row('💛',ciN,'Client check-in calls due','First-shift calls on new matches + concern re-checks — two calls per match, then done','checkins',false)
    +'<div style="font-size:.72rem;font-weight:800;letter-spacing:.06em;color:var(--gray);text-transform:uppercase;margin:.8rem 0 .4rem">📋 Onboarding &amp; Compliance</div>'
    +row('🤝',offN,'New offers — enter AxisCare attributes','Interviewed caregivers waiting on their profile checklist','offers',false)
    +row('⛔',blocked,'Blocked from first client contact','Orientation/dementia training incomplete — can\'t be scheduled yet','training',true)
    +row('🪪',profN,'New hires: profile needed before first shift','Publish their caregiver profile (photo required) before their first client visit','training',true)
    +row('⏰',attN,'Attendance needs action','Write-ups due, drafted, or approved and ready to issue','attendance',true)
    +'<div style="font-size:.72rem;font-weight:800;letter-spacing:.06em;color:var(--gray);text-transform:uppercase;margin:.8rem 0 .4rem">🤝 Team &amp; Reports</div>'
    +row('📨',reqN,'Coordinator requests waiting','Coverage gaps, do-not-returns, hours changes from the coordinators','coordreq',true)
    +row('💬',repN,'Automation replies waiting','Applicants & caregivers texting back on the automation line','comms',false)
    +row('🎥',mtgN,'Meeting requests for you','Accept and both sides get the video room','meetings',false)
    +row('📄',eodDone?0:1,'End-of-day report',''+(eodDone?'Today\'s report is uploaded — nice.':'Not uploaded yet — do it before you sign off'),'eod',false);
}

// ── NEW OFFERS (interview records from the Team Hub "Offer a Job" form) ──
const OFFER_ATTRS=[
  ['alzheimers',"Alzheimer's Disease"],['bed_bound','Bed Bound'],['cats','Cats'],
  ['dementia','Dementia'],['dogs','Dogs'],['female_caregiver','Female Caregiver'],
  ['gait_belt','Gait Belt'],['hospice','Hospice'],['hoyer_lift','Hoyer Lift'],
  ['male_caregiver','Male Caregiver'],['parkinsons',"Parkinson's Disease Experience"],
  ['payor_medicaid','Payor - Medicaid'],['payor_private_pay','Payor - Private Pay'],
  ['personal_care','Personal Care'],['smoking','Smoking'],
  ['spanish_speaking','Spanish Speaking'],['transportation','Transportation'],
];
let OFFERS=[];
async function loadOffers(btn){
  const box=document.getElementById('offersList');
  /* Fetch even with no panel on screen: Background & References reads OFFERS
     to show Step 1 status without keeping a second copy of it. */
  if(btn){ btn.disabled=true; btn.textContent='↻ Loading…'; }
  try{
    /* T2 (2026-09-28): through hub-training-data with your own sign-in, not the shared key. */
    const r=await fetch(TRAINING_DATA_FN+'?action=job_offers',{
      method:'POST',headers:{'x-hub-token':await trainHubTok(),'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
      body:'{}'});
    const data=await r.json();
    if(!Array.isArray(data)) throw new Error((data&&data.error)||'unexpected response');
    OFFERS=data;
    if(box) renderOffers();
    updateOffersBadge();
  }catch(e){ if(box) box.innerHTML='<div style="color:#b91c1c;font-size:.85rem">Could not load offers: '+(e&&e.message?e.message:'error')+'</div>'; }
  finally{ if(btn){ btn.disabled=false; btn.textContent='↻ Refresh'; } }
}
function updateOffersBadge(){
  /* Everything still on this card, not just the ones missing attributes.
     An offer waiting on Viventium entry is waiting on you too. */
  const n=OFFERS.filter(o=>!offerMovedOn(o)).length;
  const b=document.getElementById('offersBadge');
  if(b){ b.style.display=n?'inline-block':'none'; b.textContent=n; }
  updateGroupBadges();
}
function renderOffers(){
  const esc=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const box=document.getElementById('offersList');
  if(!OFFERS.length){ box.innerHTML='<div style="color:#A89C8B;font-size:.85rem">No offers yet — they appear here the moment a coordinator submits the Offer a Job form on the Team Hub.</div>'; return; }
  /* An offer that has reached Background & References is history, not work.
     It moves to Previous offers so this card only ever holds what is left. */
  const active=OFFERS.filter(o=>!offerMovedOn(o))
    .sort((a,b)=>String(a.interview_date||'').localeCompare(String(b.interview_date||'')));  // oldest first: the ones going stale surface

  /* One line telling you the single next thing, so the card can stay shut. */
  const nextStep=o=>
      !o.axiscare_applicant_id   ? ['Add to AxisCare','#B45309','#FEF3C7']
    : !o.attributes_entered_at   ? ['Enter attributes','#B45309','#FEF3C7']
    : !o.viventium_entered_at    ? ['Enter in Viventium','#B45309','#FEF3C7']
    : !o.step1_done_at           ? ['Waiting on their Step 1','#6E6559','#F4F2ED']
    :                              ['Ready for background & references','#15803D','#DCFCE7'];

  /* One card, four things: who they are, the single next step, the level, and
     the two reference sheets. Every step used to get its own coloured box on
     screen at once, which meant reading four to find the one that was yours. */
  const body=o=>{
    const attrs=o.attributes||{};
    const attrHtml=OFFER_ATTRS.map(a=>{
      const no=attrs[a[0]]===false;
      return '<div style="display:flex;justify-content:space-between;gap:.6rem;padding:.18rem 0;border-bottom:1px dashed #FAF9F6;font-size:.8rem">'+
        '<span>'+esc(a[1])+'</span><b style="color:'+(no?'#DC2626':'#15803D')+'">'+(no?'NO':'Yes')+'</b></div>';
    }).join('');
    const lvl=o.level_confirmed||'';
    const id=esc(o.id);

    /* The ladder, in order. Done ones tick quietly; the first unfinished one
       is the only place a button appears. */
    const steps=[
      {done:!!o.attributes_entered_at, label:'AxisCare attributes',
       btn:'<button class="fb" onclick="markOfferEntered(\''+id+'\',this)">Mark entered in AxisCare</button>',
       note:o.axiscare_applicant_id?'Pushed automatically, just confirm the attributes.':'Auto-push did not take, so add them by hand first.'},
      {done:!!o.viventium_entered_at, label:'Viventium entry',
       btn:'<button class="fb" onclick="markOfferViventium(\''+id+'\',this)">Mark entered in Viventium</button>',
       note:'Use the entry sheet below, then mark it. That is what sends their welcome message.'},
      {done:!!o.step1_done_at, label:'Their Step 1 paperwork',
       btn:'<button class="fb" onclick="markOfferStep1(\''+id+'\',this)">Mark Step 1 done</button>',
       note:'Theirs to do. Viventium reminds them every two days'+(o.step1_alerted_at?', and this one is flagged as stalled':'')+'.'},
      {done:false, label:'Background &amp; references',
       btn:'<button class="fb" onclick="offerToCandidate(\''+id+'\',this)">Start checks early (before their start link)</button>',
       note:'Moves them across with their references already filled in.'},
    ];
    const at=steps.findIndex(s=>!s.done);

    const ladder=steps.map((s,i)=>
      i<at ? '<span style="font-size:.76rem;color:#15803D">✓ '+s.label+'</span>'
    : i===at? ''
    :         '<span style="font-size:.76rem;color:#C9C1B4">'+s.label+'</span>'
    ).filter(Boolean).join('<span style="color:#E8E2D8">·</span>');

    const now=steps[at];

    return '<div style="display:flex;gap:1rem;flex-wrap:wrap;font-size:.82rem;color:#3A342C">'+
      (o.phone?'<span>📱 '+esc(o.phone)+'</span>':'')+
      (o.email?'<span>✉️ '+esc(o.email)+'</span>':'')+
      (o.pay_rate?'<span>💵 $'+Number(o.pay_rate).toFixed(2)+'/hr</span>':'')+
      (o.availability?'<span>🗓 '+esc(o.availability)+'</span>':'')+
      '</div>'+
      ((o.experience||o.personality||o.notes)
        ? '<div style="margin-top:.5rem;font-size:.82rem;color:#3A342C;line-height:1.5">'+
          (o.experience?'<div><b>Experience:</b> '+esc(o.experience)+'</div>':'')+
          (o.personality?'<div><b>Personality/fit:</b> '+esc(o.personality)+'</div>':'')+
          (o.notes?'<div><b>Notes:</b> '+esc(o.notes)+'</div>':'')+'</div>'
        : '')+

      /* The one thing to do next. */
      '<div style="margin-top:.7rem;background:#FFF7ED;border:1px solid #FCD9A8;border-radius:8px;padding:.6rem .75rem">'+
      '<div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">'+
      '<b style="font-size:.82rem;color:#0D365F">Next: '+now.label+'</b>'+
      '<span style="flex:1"></span>'+now.btn+'</div>'+
      '<div style="font-size:.76rem;color:#6E6559;margin-top:.3rem">'+now.note+'</div>'+
      '</div>'+
      (ladder?'<div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-top:.45rem">'+ladder+'</div>':'')+

      /* Start link, one line, because it sends itself. */
      '<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-top:.6rem;font-size:.78rem">'+
      '<b style="color:#0D365F">Start link:</b>'+
      (o.start_link_sent_at
        ? '<span style="color:#15803D">sent when you saved the offer ✓</span>'
        : '<span style="color:#B45309">not sent yet</span>')+
      '<button class="fb" style="font-size:.72rem" onclick="offerStartLink(\''+id+'\',this)">'+(o.start_link_sent_at?'Send again':'Send')+'</button>'+
      (o.welcome_sent_at?'<span style="color:#15803D">· welcome message sent ✓</span>':'')+
      '</div>'+
      '<div id="sl_'+id+'" style="display:none;margin-top:.4rem;background:#fff;border:1px solid #e4e1d8;border-radius:8px;padding:.6rem .7rem;font-size:.8rem"></div>'+

      '<div style="display:flex;gap:.6rem;align-items:center;margin-top:.6rem;flex-wrap:wrap;font-size:.8rem">'+
      '<b style="color:#0D365F">Level of care:</b><span style="color:#6E6559">suggested '+(o.level_suggested||'—')+'</span>'+
      '<label style="display:flex;align-items:center;gap:.35rem">confirmed:'+
      '<select onchange="confirmOfferLevel(\''+id+'\',this)" style="font-family:inherit;font-size:.8rem;padding:.2rem .4rem;border:1px solid #e4e1d8;border-radius:6px">'+
      '<option value=""'+(lvl===''?' selected':'')+'>not yet</option>'+
      [1,2,3].map(n=>'<option value="'+n+'"'+(lvl===n?' selected':'')+'>Level '+n+'</option>').join('')+
      '</select></label></div>'+

      '<details style="margin-top:.6rem"><summary style="cursor:pointer;font-size:.8rem;font-weight:700;color:#5B21B6">📝 Viventium entry sheet</summary>'+
      '<div style="max-width:520px;margin-top:.4rem;background:#FBFAFF;border:1px solid #EDE9FE;border-radius:8px;padding:.6rem .8rem">'+vivSheet(o)+'</div></details>'+
      '<details style="margin-top:.35rem"><summary style="cursor:pointer;font-size:.8rem;font-weight:700;color:#0D365F">AxisCare attribute answers</summary>'+
      '<div style="max-width:420px;margin-top:.4rem">'+attrHtml+'</div></details>';
  };

  box.innerHTML = active.length
    ? active.map(o=>{
        const s=nextStep(o);
        /* Age earns a mention only once it is worth noticing. An offer sitting
           a week without moving is the thing this card exists to surface. */
        const age=offerAgeDays(o.interview_date);
        const stale=age!=null&&age>=7;
        return '<details style="background:#fff;border:1px solid '+(o.attributes_entered_at?'#e4e1d8':'#f59e0b')+';border-radius:12px;margin-bottom:.5rem">'+
          '<summary style="cursor:pointer;list-style:none;display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;padding:.75rem .95rem">'+
          '<span style="min-width:4.1rem;font-size:.78rem;font-weight:700;font-variant-numeric:tabular-nums;color:'+(stale?'#B45309':'#6E6559')+'">'+esc(offerDate(o.interview_date))+'</span>'+
          '<b style="font-size:.95rem;color:#0D365F">'+esc(o.name)+'</b>'+
          '<span style="font-size:.76rem;color:#6E6559">'+esc(o.position||'Caregiver')+(o.offered_by?' · by '+esc(o.offered_by):'')+'</span>'+
          (age==null?'':'<span style="font-size:.72rem;'+(stale?'font-weight:700;color:#B45309;background:#FEF3C7;border-radius:999px;padding:.1rem .5rem':'color:#A89C8B')+'">'+
            (age===0?'today':age===1?'1 day ago':age+' days ago')+'</span>')+
          '<span style="flex:1"></span>'+
          '<span style="font-size:.72rem;font-weight:700;color:'+s[1]+';background:'+s[2]+';border-radius:999px;padding:.15rem .6rem">'+s[0]+'</span>'+
          '<span style="color:#A89C8B;font-size:.74rem">details ▾</span>'+
          '</summary>'+
          '<div style="padding:0 .95rem .95rem">'+body(o)+'</div></details>';
      }).join('')
    : '<div style="color:#A89C8B;font-size:.85rem">Nothing waiting on you. Offers land here when you save one, and move to <b>Previous offers</b> below once they reach Background &amp; References.</div>';

  renderPastOffers();
  if(window.offNavCounts) window.offNavCounts(active.length, OFFERS.length-active.length);
}

/* Linked when the offer was moved across; the candidate carries the offer id. */
function offerMovedOn(o){
  return candidates.some(c=>String(c.offer_id)===String(o.id))
    /* welcome call done moves them to the roster with their offer id (2026-10-02) */
    || (typeof caregivers!=='undefined' ? caregivers : []).some(g=>g.offer_id!=null && String(g.offer_id)===String(o.id));
}

/* "Jul 31" reads faster than "2026-07-31" in a list you scan. The year only
   earns its space when it is not this one. */
const OFF_MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function offerDate(iso){
  const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(!m) return '—';
  const out=OFF_MONTHS[+m[2]-1]+' '+(+m[3]);
  return (+m[1]===new Date().getFullYear()) ? out : out+' '+m[1];
}
/* Whole days since the offer, so a stalled one can announce itself. */
function offerAgeDays(iso){
  const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(!m) return null;
  const then=new Date(+m[1],+m[2]-1,+m[3]), now=new Date();
  return Math.floor((new Date(now.getFullYear(),now.getMonth(),now.getDate())-then)/86400000);
}

/* Everything already moved on, searchable, one line each. Kept out of the way
   but never thrown away, because "did we ever offer this person a job?" is a
   question that gets asked months later. */
function renderPastOffers(){
  const box=document.getElementById('pastOffersList'); if(!box) return;
  const esc=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const el=document.getElementById('pastOffersSearch');
  const q=((el&&el.value)||'').trim().toLowerCase();

  let rows=OFFERS.filter(offerMovedOn);
  const all=rows.length;
  if(q) rows=rows.filter(o=>((o.name||'')+' '+(o.position||'')+' '+(o.offered_by||'')).toLowerCase().includes(q));
  rows.sort((a,b)=>String(b.interview_date||'').localeCompare(String(a.interview_date||'')));

  const cnt=document.getElementById('pastOffersCount');
  if(cnt) cnt.textContent = all ? (q? rows.length+' of '+all : all+' offer'+(all===1?'':'s')) : '';

  if(!all){ box.innerHTML='<div class="field-note">Nothing here yet. An offer moves down here once you start their background &amp; references.</div>'; return; }
  if(!rows.length){ box.innerHTML='<div class="field-note">No offer matches “'+esc(q)+'”.</div>'; return; }

  box.innerHTML=rows.map(o=>{
    const c=candidates.find(x=>String(x.offer_id)===String(o.id));
    const onRoster=!c && (typeof caregivers!=='undefined' ? caregivers : []).some(g=>g.offer_id!=null && String(g.offer_id)===String(o.id));
    const where=c ? (c.not_hired ? 'Not hired' : obDeriveStatus(c)) : (onRoster ? 'On the caregiver roster' : 'In background & references');
    const tone=where==='Ready for Orientation' ? ['#15803D','#DCFCE7']
             : where==='Not hired'             ? ['#B91C1C','#FEE2E2']
             : ['#6E6559','#F4F2ED'];
    return '<div style="display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;padding:.5rem 0;border-bottom:1px solid #F0EDE6;font-size:.84rem">'+
      '<span style="min-width:4.1rem;font-weight:700;font-variant-numeric:tabular-nums;color:#6E6559">'+esc(offerDate(o.interview_date))+'</span>'+
      '<b style="color:#0D365F">'+esc(o.name)+'</b>'+
      '<span style="color:#6E6559">'+esc(o.position||'Caregiver')+(o.offered_by?' · by '+esc(o.offered_by):'')+'</span>'+
      '<span style="flex:1"></span>'+
      '<span style="font-size:.72rem;font-weight:700;color:'+tone[0]+';background:'+tone[1]+';border-radius:999px;padding:.15rem .6rem">'+esc(where)+'</span>'+
      (c?'<button class="fb" style="font-size:.72rem" onclick="gotoTab(\'onboarding\')">Open</button>':'')+
      '</div>';
  }).join('');
}
async function offerUpdate(id, payload){
  /* T2: your own sign-in; the server records you as "who", whatever the payload says. */
  const r=await fetch(TRAINING_DATA_FN+'?action=offer_update',{
    method:'POST',headers:{'x-hub-token':await trainHubTok(),'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
    body:JSON.stringify(Object.assign({p_id:id},payload))});
  const data=await r.json();
  if(!data||data.error||data.ok===false) throw new Error((data&&data.error)||'update failed');
}
/* The candidate's start link. Prefilled from the offer so they are not asked
   for anything we already know, and offered three ways out because the
   coordinator might be on a phone in a parking lot or at a desk. */
function offerStartLink(id, btn){
  const o = OFFERS.find(x => String(x.id) === String(id));
  if (!o) return;
  const box = document.getElementById('sl_' + id);
  if (!box) return;
  if (box.style.display === 'block') { box.style.display = 'none'; return; }
  const q = new URLSearchParams();
  if (o.first_name) q.set('first', o.first_name);
  if (o.last_name)  q.set('last',  o.last_name);
  if (o.phone)      q.set('phone', o.phone);
  if (o.email)      q.set('email', o.email);
  const url = 'https://cc.mo-care.com/start.html?' + q.toString();
  const first = o.first_name || 'there';
  const msg = 'Hi ' + first + ", it's Caring Companions! We would love to bring you onto the team. "
            + 'One quick step before your offer letter goes out: ' + url
            + ' It takes about two minutes and lets us start your reference checks today.';
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const digits = String(o.phone || '').replace(/[^0-9+]/g, '');
  box.style.display = 'block';
  box.innerHTML =
    '<div style="font-weight:700;color:#0D365F;margin-bottom:.35rem">Their link</div>'
    + '<div style="word-break:break-all;background:#FAF9F6;border-radius:6px;padding:.4rem .5rem;font-size:.74rem;margin-bottom:.5rem">' + esc(url) + '</div>'
    + '<div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">'
    + (digits ? '<a class="fb" style="text-decoration:none" href="sms:' + esc(digits) + '&body=' + encodeURIComponent(msg) + '">💬 Text it</a>' : '<span style="color:#b45309;font-size:.76rem">No phone on this offer</span>')
    + (o.email ? '<a class="fb" style="text-decoration:none" href="mailto:' + esc(o.email) + '?subject=' + encodeURIComponent('Getting you started at Caring Companions') + '&body=' + encodeURIComponent(msg) + '">✉️ Email it</a>' : '')
    + '<button class="fb" onclick="offerCopyLink(this,\'' + esc(url) + '\')">📋 Copy link</button>'
    + '</div>';
}
function offerCopyLink(btn, url){
  const done = () => { const t = btn.textContent; btn.textContent = '✓ Copied'; setTimeout(() => btn.textContent = t, 1600); };
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => prompt('Copy this link:', url));
  else prompt('Copy this link:', url);
}
/* Hand an offer over to Background & References. Everything we already know
   comes with it, including the references and the out-of-state answer from
   their start link, so nobody retypes a person who exists one tab away. */
/* ---- Start-link submissions become candidates on their own ---------------
   Finishing the start link IS the signal that background checks should begin,
   so waiting for someone to press a button afterwards just adds a step that
   can be forgotten. Runs on load and whenever Background & References opens,
   the same shape as mergePendingBookings, which keeps the browser as the only
   writer of app_data. Idempotent: each intake row is stamped with the
   candidate it produced, so a second pass does nothing. */
/* ---- Reference requests -------------------------------------------------
   The five questions the office asks on the phone, asked of the reference
   directly instead. A typed answer and a called answer score identically,
   because both end up in the same r{n}_manual shape through scoreManualRef.
   Nothing here replaces the phone: it just stops the phone being the only way. */
/* Creating the request rows is the half that can happen on its own; showing
   the links is the half that needs a person looking at the screen. */
/* One reference_requests row for one slot. Shared by createRefRequests and
   obEnsureRefRequest so both write exactly the same shape. */
function obRefRequestRow(c, n){
  return {
    candidate_id: c.id, slot: n, candidate_name: ((c.first || '') + ' ' + (c.last || '')).trim(),
    /* Carried so the chase can go back to the applicant when a reference
       goes quiet. They gave us these on their start link. */
    candidate_phone: c.phone || null, candidate_email: c.email || null,
    ref_name: c['r'+n+'n'] || null, ref_phone: c['r'+n+'_phone'] || null, ref_email: c['r'+n+'_email'] || null,
    /* sent_at stays null until something actually goes out. Stamping it here
       started the chase clock on a message nobody received, so the reference's
       first contact was a reminder to answer a question never asked. */
    ref_relationship: c['r'+n+'_rel'] || null, sent_at: null,
    /* R1: which question set the reference is shown (refs_r1r5.sql). */
    ref_type: obRefType(c['r'+n+'_type']) || null, ref_company: c['r'+n+'_company'] || null,
  };
}
async function createRefRequests(c){
  /* Gate A read-only guard (owner ruling 2026-09-22): this is the ONLY place
     reference rows are inserted and reference-chase is invoked. No fresh shared
     load means no mutation and no outreach, full stop. */
  if (!HYDRATED) { console.warn('BLOCKED createRefRequests: shared data not loaded, no reference rows created and no chase invoked'); return []; }
  if (safeIsTmp(c.id)) { console.warn('BLOCKED createRefRequests: the candidate has no database number yet'); return []; }
  const slots = [1,2,3,4]
    .map(n => ({ n, name: c['r'+n+'n'], phone: c['r'+n+'_phone'], email: c['r'+n+'_email'], rel: c['r'+n+'_rel'], status: c['r'+n+'s'],
                 type: obRefType(c['r'+n+'_type']), company: c['r'+n+'_company'] || '' }))
    .filter(r => r.name && (r.phone || r.email) && r.status === 'Pending');
  if (!slots.length) return [];
  let existing = [];
  try {
    const { data } = await sb.from('reference_requests').select('slot').eq('candidate_id', c.id);
    existing = (data || []).map(r => r.slot);
  } catch (e) { return []; }
  const wanted = slots.filter(r => !existing.includes(r.n));
  if (!wanted.length) return [];
  const { data, error } = await sb.from('reference_requests').insert(
    wanted.map(r => obRefRequestRow(c, r.n))).select();
  if (error) throw error;
  /* Ask them now rather than at tomorrow's run. The function only touches rows
     with no sent_at, so calling it twice costs nothing. Awaited, because a
     fire-and-forget here was how "sending shortly" quietly meant "never":
     if this attempt is refused (evening, weekend, outage), say so — the
     weekday-morning cron is the backstop that actually sends it. */
  try {
    const { data: chase, error: chaseErr } = await sb.functions.invoke('reference-chase', { body: {} });
    if (chaseErr) console.warn('reference-chase: immediate send failed, the weekday-morning run will send these —', chaseErr.message || chaseErr);
    else if (chase && chase.skipped) console.warn('reference-chase: held (' + chase.skipped + ') — the weekday-morning run will send these');
  } catch (e) {
    console.warn('reference-chase: immediate send failed, the weekday-morning run will send these —', e && e.message || e);
  }
  return data || [];
}

/* Office send (Desktop 377, 2026-10-01): the one open request row for ONE
   slot, so the office can email or text that reference their form. Reuses the
   newest unanswered row; otherwise inserts a single row for this slot only.
   Never calls createRefRequests (that would set up every slot and the morning
   job would email them all) and never sends anything itself. */
async function obEnsureRefRequest(c, n){
  if (!HYDRATED) throw new Error('Shared data has not loaded, so nothing was sent. Use Try again at the top, then retry.');
  if (!c || ![1,2,3,4].includes(n) || !String(c['r'+n+'n'] || '').trim()) throw new Error('Add the reference\'s name first.');
  const { data: found, error: findErr } = await sb.from('reference_requests').select('*')
    .eq('candidate_id', c.id).eq('slot', n).is('responded_at', null)
    .order('created_at', { ascending: false }).limit(1);
  if (findErr) throw new Error('Could not look up the reference request: ' + (findErr.message || 'error'));
  if (found && found.length) return found[0];
  const { data, error } = await sb.from('reference_requests').insert([obRefRequestRow(c, n)]).select();
  if (error) throw new Error('Could not set up the reference request: ' + (error.message || 'error'));
  if (!data || !data[0]) throw new Error('Could not set up the reference request.');
  return data[0];
}

/* References arriving from a start link is the signal to ask them, so the ask
   happens by itself. Anything already asked is skipped, so this is safe to run
   as often as the tab is opened. */
async function autoAskReferences(){
  if (!HYDRATED) { console.warn('BLOCKED autoAskReferences: shared data not loaded'); return; }
  const waiting = candidates.filter(c =>
    !c.not_hired && [1,2,3,4].some(n => c['r'+n+'n'] && (c['r'+n+'_phone'] || c['r'+n+'_email']) && c['r'+n+'s'] === 'Pending'));
  for (const c of waiting) {
    try { await createRefRequests(c); } catch (e) { /* table may not exist yet */ }
  }
}

async function askReferences(candId, btn){
  const c = candidates.find(x => x.id === candId);
  if (!c) return;
  if (!HYDRATED) { alert('Shared data has not loaded, so this section is read-only right now. No reference requests were created and nothing was sent. Use Try again at the top, then retry.'); return; }
  if (safeIsTmp(c.id)) { alert(c.first + ' ' + c.last + ' is still being saved. Nothing was sent. Try again in a moment.'); return; }
  const slots = [1,2,3,4]
    .map(n => ({ n, name: c['r'+n+'n'], phone: c['r'+n+'_phone'], email: c['r'+n+'_email'], rel: c['r'+n+'_rel'], status: c['r'+n+'s'] }))
    .filter(r => r.name && (r.phone || r.email) && r.status === 'Pending');
  if (!slots.length) {
    alert('No references on this candidate are waiting on an answer.\n\nAdd their names and numbers first, or they have all come back already.');
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = 'Setting up…'; }

  let rows = [];
  try {
    await createRefRequests(c);                       // fills any gaps
    const { data, error } = await sb.from('reference_requests')
      .select('*').eq('candidate_id', c.id).is('responded_at', null);
    if (error) throw error;
    rows = data || [];
  } catch (e) {
    alert('Could not set those up: ' + ((e && e.message) || 'error') +
      '\n\nIf this mentions a missing table, run reference-requests.sql in the Supabase SQL editor.');
    if (btn) { btn.disabled = false; btn.textContent = '📨 Ask references'; }
    return;
  }

  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const cname = (c.first + ' ' + c.last).trim();
  const body = rows.map(r => {
    const url = 'https://cc.mo-care.com/reference.html?r=' + encodeURIComponent(r.id)
      + '&c=' + encodeURIComponent(cname)
      + '&n=' + encodeURIComponent(r.ref_name || '')
      + (r.ref_relationship ? '&rel=' + encodeURIComponent(r.ref_relationship) : '')
      + obRefLinkExtra(r.ref_type || c['r' + r.slot + '_type'], r.ref_company || c['r' + r.slot + '_company']);
    const msg = 'Hi ' + (r.ref_name || 'there') + ", this is Caring Companions In-Home Senior Care. "
      + cname + ' listed you as a reference for a caregiving job. A few quick questions, about two minutes: '
      + url + ' Thank you!';
    const digits = String(r.ref_phone || '').replace(/[^0-9+]/g, '');
    /* Email goes out on its own now, so these buttons are for a personal nudge
       or for a reference who only left a phone number. Saying which is which
       stops anyone sending a second copy of a message already delivered. */
    const state = r.sent_at
      ? '<span style="color:#15803D;font-size:.72rem;font-weight:600">✓ emailed automatically</span>'
      : (r.ref_email
          ? '<span style="color:#6E6559;font-size:.72rem">sending shortly</span>'
          : '<span style="color:#B45309;font-size:.72rem;font-weight:600">no email on file, needs you</span>');
    return '<div style="border-top:1px solid #e4e1d8;padding:.6rem 0">'
      + '<b style="font-size:.86rem;color:#0D365F">' + esc(r.ref_name || 'Reference ' + r.slot) + '</b> '
      + state
      + '<div style="display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.4rem">'
      + (digits ? '<a class="fb" style="text-decoration:none" href="sms:' + esc(digits) + '&body=' + encodeURIComponent(msg) + '">💬 Text</a>' : '')
      + (r.ref_email ? '<a class="fb" style="text-decoration:none" href="mailto:' + esc(r.ref_email) + '?subject=' + encodeURIComponent('A quick reference for ' + cname) + '&body=' + encodeURIComponent(msg) + '">✉️ Email</a>' : '')
      + '<button class="fb" onclick="offerCopyLink(this,\'' + esc(url) + '\')">📋 Copy link</button>'
      + '</div></div>';
  }).join('');

  const host = document.getElementById('askRefsBox');
  if (host) {
    host.style.display = 'block';
    host.innerHTML = '<b style="color:#0D365F">' + esc(cname) + "'s references</b>"
      + '<div style="font-size:.78rem;color:#6E6559;margin:.2rem 0 .3rem">Anyone with an email address is asked automatically, '
      + 'and their answers come back here and score themselves. Use these to add a personal nudge, '
      + 'or to reach someone who only left a phone number.</div>' + body;
    host.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (btn) { btn.disabled = false; btn.textContent = '📨 Ask references'; }
}

/* Answers coming home. Same shape a phone call produces, so the rest of the
   pipeline cannot tell the difference and Ready for Orientation still means
   what it always meant. */
/* Screening clearing is not a box anyone should have to tick. The moment a
   candidate reaches Ready for Orientation, every check has come back clean and
   two references are positive, which is exactly what "your screening cleared"
   means. Stamping it here is what lets the nightly job delete their social
   security number, which is what we promised them on the form. */
async function markScreeningCleared(){
  const done = candidates.filter(c =>
    c.intake_id && !c.screening_cleared_stamped && obDeriveStatus(c) === 'Ready for Orientation');
  if (!done.length) return 0;
  let n = 0;
  for (const c of done) {
    try {
      const { error } = await sb.from('hire_intake')
        .update({ screening_cleared_at: new Date().toISOString() })
        .eq('id', c.intake_id);
      if (!error) { c.screening_cleared_stamped = true; n++; }
    } catch (e) { /* try again next pass */ }
  }
  saveCandidates();
  return n;
}
/* ---- Applicant-supplied reference fixes ---------------------------------
   When we cannot reach a reference, the applicant is asked to help, and this
   is where their answer comes home: a better contact for the same person, or
   somebody else entirely. The dead request is retired so its link stops
   working, the candidate's slot is rewritten, and autoAskReferences issues a
   fresh one on the next pass. Nobody in the office touches it. */
async function refFixReconcile(){
  let fixes = [];
  try {
    const { data, error } = await sb.from('reference_fixes').select('*')
      .is('merged_at', null).order('created_at', { ascending: true }).limit(50);
    if (error) return;
    fixes = data || [];
  } catch (e) { return; }
  if (!fixes.length) return;

  let applied = 0;
  for (const f of fixes) {
    // The stalled request tells us who this is about and which slot to rewrite.
    let req = null;
    try {
      const { data } = await sb.from('reference_requests').select('*').eq('id', f.request_id).maybeSingle();
      req = data || null;
    } catch (e) { /* fall through to the candidate_id below */ }

    const candId = req ? req.candidate_id : f.candidate_id;
    const c = candidates.find(x => x.id === candId);
    if (!c) continue;
    const n = req ? req.slot : [1,2,3,4].find(i => !c['r'+i+'n']) || 4;

    c['r'+n+'n'] = f.new_name || c['r'+n+'n'] || '';
    c['r'+n+'_phone'] = f.new_phone || '';
    c['r'+n+'_email'] = f.new_email || '';
    if (f.new_relationship) c['r'+n+'_rel'] = f.new_relationship;
    c['r'+n+'s'] = 'Pending';                       // so it gets asked again
    delete c['r'+n+'_manual'];

    // Retire the dead request: its link should stop working, and leaving it
    // would keep the chase nagging about a contact we have already replaced.
    try { if (req) await sb.from('reference_requests').delete().eq('id', req.id); } catch (e) {}
    try { await sb.from('reference_fixes').update({ merged_at: new Date().toISOString() }).eq('id', f.id); } catch (e) {}
    applied++;
  }

  if (applied) {
    saveCandidates();
    await autoAskReferences();                       // the new one gets asked now
    try { renderOB(); renderHirePipeline(); renderAlerts(); } catch (e) {}
  }
}
async function refReconcile(){
  let rows = [];
  try {
    const { data, error } = await sb.from('reference_requests').select('*')
      .not('responded_at', 'is', null).is('merged_at', null).limit(50);
    if (error) return 0;
    rows = data || [];
  } catch (e) { return 0; }
  if (!rows.length) return 0;

  let merged = 0;
  const answered = [];                 // R3: each merged answer gets its dates check + PDF after the save below
  for (const r of rows) {
    const c = candidates.find(x => x.id === r.candidate_id);
    if (!c) continue;
    const n = r.slot;
    c['r'+n+'n'] = c['r'+n+'n'] || r.ref_name || r.responder_name || '';
    c['r'+n+'_manual'] = {
      staff: 'answered by the reference', via: 'Online form',
      date: String(r.responded_at || '').slice(0,10),
      name: r.responder_name || r.ref_name || '',
      type: obRefType(r.ref_type || c['r'+n+'_type']), relationship: r.ref_relationship || '', how_long: r.how_long || '',
      recommend: r.recommend || '', reliability: r.reliability || '',
      interpersonal: r.interpersonal || '', honesty: r.honesty || '',
      concerns: r.concerns || '', notes: r.notes || '',
      /* R2: the professional and personal answers (refs_r1r5.sql). */
      rel_answer: r.rel_answer || '', employer_confirmed: r.employer_confirmed || '',
      emp_from: r.emp_from || '', emp_to: r.emp_to || '', job_title: r.job_title || '',
      hours_type: r.hours_type || '', rehire: r.rehire || '', trust_family: r.trust_family || '',
      responder_title: r.responder_title || '', date_check: '',
    };
    if (r.ref_type && !c['r'+n+'_type']) c['r'+n+'_type'] = obRefType(r.ref_type);
    if (r.ref_company && !c['r'+n+'_company']) c['r'+n+'_company'] = r.ref_company;
    const m0 = c['r'+n+'_manual'];
    const score = scoreManualRef(r.recommend, r.reliability, r.interpersonal, r.honesty, r.concerns,
      { type: m0.type, rehire: m0.rehire, trust_family: m0.trust_family }) || 'Pending';
    if (score !== 'Pending') answered.push({ id: c.id, n });
    c['r'+n+'s'] = score;
    merged++;
    /* A negative reference on someone about to be alone in a client's home is
       not a colour change on a row. It goes where late and serious things go,
       and it names what was said so nobody has to go digging for it. */
    if (score === 'Negative') {
      try {
        await sb.rpc('upsert_app_data_item', { target_key: 'ops_items', item: {
          id: 'ops_negref_' + r.id, kind: 'discipline', source_id: 'negref_' + r.id,
          title: 'Negative reference for ' + (c.first + ' ' + c.last).trim(),
          detail: (r.responder_name || r.ref_name || 'A reference') +
            (r.ref_relationship ? ' (' + r.ref_relationship + ')' : '') +
            ' would not recommend them' +
            (r.concerns === 'serious' ? ' and raised a serious concern' : '') + '.' +
            (r.notes ? ' They said: "' + String(r.notes).slice(0, 300) + '"' : '') +
            ' Read the full record before this candidate goes any further.',
          about: (c.first + ' ' + c.last).trim(), urgency: 'today', status: 'open',
          created_at: new Date().toISOString(),
          due: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
          owner: '', owner_name: '', created_by: 'reference check', opened_by: 'system',
        }});
      } catch (e) { /* the reference is recorded either way */ }
    }
    try { await sb.from('reference_requests').update({ merged_at: new Date().toISOString() }).eq('id', r.id); }
    catch (e) { /* correct locally already; it will retry next pass */ }
  }
  if (merged) {
    await saveCandidates();
    try { renderOB(); renderAlerts(); } catch (e) {}
    /* The answers are saved above, first. The dates check and the PDF come
       after, so a failure there can never lose what the reference said. */
    let fails = 0;
    for (const a of answered) {
      const ok = await obAfterRefRecorded(a.id, a.n, { save: false, quiet: true });
      if (!ok) fails++;
    }
    if (answered.length) {
      await saveCandidates();
      try { renderOB(); } catch (e) {}
    }
    if (fails) obToast(fails + ' reference PDF' + (fails === 1 ? '' : 's') + ' could not be made. The answers are saved. Use "Make reference PDFs" to try again.');
  }
  return merged;
}
async function intakeReconcile(){
  let rows = [];
  try {
    const { data, error } = await sb.from('hire_intake').select('*')
      .is('candidate_id', null).order('created_at', { ascending: true }).limit(50);
    if (error) return;                     // table not created yet
    rows = data || [];
  } catch (e) { return; }
  if (!rows.length) return;

  const digits = t => String(t || '').replace(/\D/g, '').slice(-10);
  let made = 0, filled = 0;

  for (const r of rows) {
    const refs = Array.isArray(r.refs) ? r.refs : [];
    let c = candidates.find(x =>
      (digits(x.phone) && digits(x.phone) === digits(r.phone)) ||
      (x.email && r.email && x.email.toLowerCase() === String(r.email).toLowerCase()) ||
      ((x.first || '').toLowerCase() === String(r.first_name || '').toLowerCase() &&
       (x.last  || '').toLowerCase() === String(r.last_name  || '').toLowerCase()));

    if (!c) {
      const offer = OFFERS.find(o =>
        (digits(o.phone) && digits(o.phone) === digits(r.phone)) ||
        (o.email && r.email && String(o.email).toLowerCase() === String(r.email).toLowerCase()));
      c = {
        id: safeTmpId(),   /* 421: the database gives the real number */
        first: r.first_name || '', last: r.last_name || '',
        phone: r.phone || '', email: r.email || '',
        oig: 'Pending', edl: 'Pending', fcsr: 'Pending',
        r1s: 'Pending', r2s: 'Pending', r3s: 'Pending', r4s: 'Pending',
        invite_sent: false, invite_sent_date: '',
        notes: 'Started from their own start link.',
        addedAt: new Date().toISOString(),
      };
      if (offer) { c.offer_id = String(offer.id); c.position = offer.position || ''; }
      c.intake_id = r.id;
      candidates.push(c);
      made++;
    } else { filled++; if (!c.intake_id) c.intake_id = r.id; }

    // What they told us wins over blanks, never over something already recorded.
    if (!c.oos) c.oos = r.lived_outside_mo ? 'yes' : 'no';
    if (r.lived_outside_mo && (!c.fp || c.fp === 'N/A')) c.fp = 'Required';
    if (r.previous_names && !c.previous_names) c.previous_names = r.previous_names;
    refs.slice(0, 4).forEach((ref, i) => {
      const n = i + 1;
      if (!c['r' + n + 'n']) {
        c['r' + n + 'n'] = ref.name || '';
        c['r' + n + '_phone'] = ref.phone || '';
        c['r' + n + '_email'] = ref.email || '';
        c['r' + n + '_rel'] = ref.relationship || '';
        c['r' + n + '_type'] = obRefType(ref.type);
        c['r' + n + '_company'] = ref.company || '';
        c['r' + n + '_howlong'] = ref.how_long || '';
      }
    });
    if (r.no_employer_history != null && c.no_employer_history == null) c.no_employer_history = !!r.no_employer_history;

    try {
      /* candidate_id is the AxisCare identity field (script 185; the
         hiring-history reader depends on it) and may NEVER hold a board id.
         The board linkage is c.intake_id, set above. Only seen_at is
         stamped here. (This whole function is dormant in the CC hub.) */
      await sb.from('hire_intake')
        .update({ seen_at: new Date().toISOString() })
        .eq('id', r.id);
    } catch (e) { /* the record is already correct locally; try again next pass */ }
  }

  saveCandidates();
  try { renderOB(); renderAlerts(); } catch (e) {}
  if (made) {
    const n = document.getElementById('intakeNote');
    if (n) { n.textContent = made + (made === 1 ? ' new candidate' : ' new candidates') +
      ' arrived from their start link and ' + (made === 1 ? 'is' : 'are') + ' ready for checks.'; n.style.display = ''; }
  }
}
/* Heals the candidates the old boot race left behind: anyone on the board
   with no offer_id is matched to their offer by phone or email, once, so the
   offer stops looking stalled and its Step-1 pip can light. Idempotent —
   a linked candidate is never touched. */
function linkCandidatesToOffers(){
  if (!Array.isArray(OFFERS) || !OFFERS.length) return;
  const digits = t => String(t || '').replace(/\D/g, '').slice(-10);
  let changed = 0;
  candidates.forEach(c => {
    if (c.offer_id) return;
    const o = OFFERS.find(x =>
      (digits(x.phone) && digits(x.phone) === digits(c.phone)) ||
      (x.email && c.email && String(x.email).toLowerCase() === String(c.email).toLowerCase()));
    if (o) {
      c.offer_id = String(o.id);
      if (!c.position && o.position) c.position = o.position;
      changed++;
    }
  });
  if (changed) saveCandidates();
}

async function offerToCandidate(offerId, btn){
  const o = OFFERS.find(x => String(x.id) === String(offerId));
  if (!o) return;
  const digits = t => String(t || '').replace(/\D/g, '').slice(-10);
  const dupe = candidates.find(c =>
    (digits(c.phone) && digits(c.phone) === digits(o.phone)) ||
    ((c.first || '').toLowerCase() === String(o.first_name || '').toLowerCase() &&
     (c.last  || '').toLowerCase() === String(o.last_name  || '').toLowerCase()));
  if (dupe) {
    /* Already on the board — but if the race left them unlinked, this click
       is the moment we know which offer is theirs. Take it. */
    if (!dupe.offer_id) {
      dupe.offer_id = String(o.id);
      if (!dupe.position && o.position) dupe.position = o.position;
      saveCandidates();
      try { renderOffers(); } catch (e) {}
    }
    alert(dupe.first + ' ' + dupe.last + ' is already in Background & References.');
    gotoTab('onboarding'); return;
  }
  if (btn) { btn.disabled = true; btn.textContent = 'Moving…'; }

  // Their start-link submission, if it has landed yet.
  let intake = null;
  try {
    const { data } = await sb.from('hire_intake').select('*')
      .order('created_at', { ascending: false }).limit(50);
    intake = (data || []).find(r =>
      (digits(r.phone) && digits(r.phone) === digits(o.phone)) ||
      (r.email && o.email && String(r.email).toLowerCase() === String(o.email).toLowerCase())) || null;
  } catch (e) { /* table may not exist yet — carry on without it */ }

  const rec = {
    id: safeTmpId(),   /* 421: the database gives the real number when it saves */
    first: o.first_name || '', last: o.last_name || '',
    phone: o.phone || '', email: o.email || '',
    oos: intake ? (intake.lived_outside_mo ? 'yes' : 'no') : '',
    fp: (intake && intake.lived_outside_mo) ? 'Required' : 'N/A',
    oig: 'Pending', edl: 'Pending', fcsr: 'Pending',
    r1s: 'Pending', r2s: 'Pending', r3s: 'Pending', r4s: 'Pending',
    offer_id: String(o.id),
    position: o.position || '',
    notes: 'From the job offer' + (o.offered_by ? ' by ' + o.offered_by : '') +
           (o.interview_date ? ', interviewed ' + o.interview_date : '') + '.',
    invite_sent: false, invite_sent_date: '',
    addedAt: new Date().toISOString(),
  };
  (intake && Array.isArray(intake.refs) ? intake.refs : []).slice(0, 4).forEach((r, i) => {
    const n = i + 1;
    rec['r' + n + 'n'] = r.name || '';
    rec['r' + n + '_phone'] = r.phone || '';
    rec['r' + n + '_email'] = r.email || '';
    rec['r' + n + '_rel'] = r.relationship || '';
    rec['r' + n + '_type'] = obRefType(r.type);
    rec['r' + n + '_company'] = r.company || '';
    rec['r' + n + '_howlong'] = r.how_long || '';
  });
  if (intake && intake.no_employer_history != null) rec.no_employer_history = !!intake.no_employer_history;
  candidates.push(rec);
  /* 421: wait for the database's number before anything shows or uses it. */
  if (!(await saveCandidates({ quiet: true }))) {
    candidates = candidates.filter(c => c !== rec);
    try { renderOB(); } catch (e) {}
    alert('Could not move ' + (rec.first + ' ' + rec.last).trim() + ' to Background & References: the save did not reach the shared workspace, so nothing was added. Check your connection and try again.');
    if (btn) { btn.disabled = false; btn.textContent = 'Start checks early'; }
    return;
  }
  renderOB(); renderAlerts();
  gotoTab('onboarding');
  const gotRefs = (intake && (intake.refs || []).length) || 0;
  alert(rec.first + ' ' + rec.last + ' is now in Background & References.\n\n' +
    (gotRefs ? gotRefs + ' reference' + (gotRefs === 1 ? '' : 's') + ' came across from their start link.'
             : 'No start-link submission found yet, so references are still blank.') +
    (rec.fp === 'Required' ? '\nThey lived outside Missouri, so a fingerprint check is required.' : ''));
}

/* Step 1 is Viventium's paperwork and it is what gates orientation, so it
   belongs in front of whoever is working the checks. Reads the real offer
   record rather than a second copy that could drift out of step. */
function step1Chip(c){
  if (!c.offer_id) return '';
  const o = OFFERS.find(x => String(x.id) === String(c.offer_id));
  if (!o) return '';
  return o.step1_done_at
    ? '<span class="badge" style="background:#DCFCE7;color:#15803D;font-size:.62rem">&#10003; Step 1 done</span>'
    : '<button class="ibtn" style="font-size:.62rem;padding:.16rem .5rem;color:#B45309;border-color:#FCD9A8" onclick="event.stopPropagation();markOfferStep1(\'' + c.offer_id + '\',this)">Step 1 pending</button>';
}
async function markOfferEntered(id,btn){
  if(btn){btn.disabled=true;btn.textContent='Saving…';}
  try{
    const {data:{session}}=await sb.auth.getSession();
    const who=(session&&session.user&&session.user.email)||'staff';
    await offerUpdate(id,{p_entered:true,p_who:who});
    await loadOffers();
  }catch(e){ alert('Could not save: '+(e&&e.message?e.message:'error')); if(btn){btn.disabled=false;btn.textContent='☑ Entered in AxisCare';} }
}
async function confirmOfferLevel(id,sel){
  const v=sel.value?Number(sel.value):null;
  if(v==null) return;
  try{ await offerUpdate(id,{p_level:v}); }
  catch(e){ alert('Could not save the confirmed level: '+(e&&e.message?e.message:'error')); }
}
async function markOfferViventium(id,btn){
  if(btn){btn.disabled=true;btn.textContent='Saving…';}
  try{
    const {data:{session}}=await sb.auth.getSession();
    await offerUpdate(id,{p_viventium:true,p_who:(session&&session.user&&session.user.email)||'staff'});
    // Entering Viventium is the trigger for the applicant's welcome text +
    // email — it tells them to watch for the Viventium invite that just went
    // out. The function never double-sends (welcome_sent_at guard).
    if(btn) btn.textContent='Sending welcome…';
    try{
      const w=await sendOfferWelcome(id,null,true);
      if(!w.ok) alert('Viventium entry saved ✓ — but the welcome text/email did not send: '+w.error+'\n\nUse the "💬 Send welcome text + email" button on the record to retry.');
    }catch(e){}
    await loadOffers();
  }catch(e){ alert('Could not save: '+(e&&e.message?e.message:'error')); if(btn){btn.disabled=false;btn.textContent='☑ Entered in Viventium';} }
}
async function sendOfferWelcome(id,btn,quiet){
  if(btn){btn.disabled=true;btn.textContent='Sending…';}
  try{
    const r=await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/job-offer',{
      method:'POST',headers:{'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'x-hub-token':await (window.trainHubTok ? window.trainHubTok() : ''),'Content-Type':'application/json'},
      body:JSON.stringify({action:'send_welcome', offer_id:id})});
    const d=await r.json();
    if(d.error) throw new Error(d.error);
    if(!quiet){
      /* TRAINING TEXTS (2026-10-01): a part that did not go (after hours, no yes to texts, refused) is said, not hidden */
      alert(d.already_sent?'Already sent earlier ✓':'Welcome '+[d.sms?'text':null,d.email?'email':null].filter(Boolean).join(' + ')+' sent ✓'
        +((d.not_sent&&d.not_sent.length)?'\n\nNot sent: '+d.not_sent.join('; '):''));
      await loadOffers();
    }
    return {ok:true};
  }catch(e){
    const msg=(e&&e.message)||'failed';
    if(!quiet){ alert('Could not send: '+msg); if(btn){btn.disabled=false;btn.textContent='💬 Send welcome text + email';} }
    return {ok:false,error:msg};
  }
}
// Viventium is typed field by field — no bulk paste. This sheet mirrors her
// actual Add New Hire screen (TR9-001, screenshots Jul 13 2026) top to bottom:
// PERSONAL → POSITION → WORK SCHEDULE → PAY INFO → RATES → TAXES → PLAN.
function vivSheet(o){
  const esc=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const row=(label,val,hint)=>'<div style="display:flex;align-items:center;gap:.5rem;padding:.26rem 0;border-bottom:1px dashed #FAF9F6;font-size:.8rem">'
    +'<span style="min-width:145px;color:#6E6559">'+label+'</span>'
    +(val!=null&&String(val).trim()!==''
      ?'<b style="flex:1;word-break:break-word">'+esc(val)+'</b><button class="fb" style="font-size:.68rem;padding:.12rem .5rem;flex-shrink:0" data-v="'+esc(val)+'" onclick="vivCopy(this)">📋 copy</button>'
      :'<span style="flex:1;color:#A89C8B;font-style:italic">'+(hint||'—')+'</span>')
    +'</div>';
  const sec=t=>'<div style="font-size:.68rem;font-weight:800;letter-spacing:.05em;color:#5B21B6;text-transform:uppercase;margin:.5rem 0 .1rem">'+t+'</div>';
  const nm=String(o.name||'').trim();
  const first=o.first_name||nm.split(' ')[0]||'';
  const last=o.last_name||nm.split(' ').slice(1).join(' ')||'';
  // Viventium's phone field is US-format; strip the +1 and punctuate.
  const digits=String(o.phone||'').replace(/\D/g,'').replace(/^1(?=\d{10}$)/,'');
  const phone=digits.length===10?'('+digits.slice(0,3)+') '+digits.slice(3,6)+'-'+digits.slice(6):(o.phone||'');
  // Date picker is US-style MM/DD/YYYY.
  const dm=String(o.interview_date||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
  const usDate=dm?dm[2]+'/'+dm[3]+'/'+dm[1]:(o.interview_date||'');
  return sec('Personal')
    +row('First Name',first)
    +row('Last Name',last)
    +row('Email Address',o.email,'none given — their invite needs an email; ask them for one')
    +row('Phone Type',null,'select Mobile')
    +row('Phone',phone,'none given')
    +sec('Position')
    +row('Hire Date',usDate)
    +row('Job Title',o.position||'Caregiver')
    +row('Employee Status',null,'leave as Onboarding')
    +row('Employee # / Badge #',null,'click AUTO-GENERATE on both')
    +row('Department',null,'required dropdown — pick per company setup')
    +row('Pay Group / Benefit Category',null,'leave blank unless told otherwise')
    +row('Employee Type',null,'Full/Part Time — availability: '+(o.availability||'not given'))
    +sec('Work Schedule')
    +row('Work Schedule Template',null,'skip — leave empty')
    +sec('Pay Info')
    +row('Pay Type',null,'select Hourly')
    +row('Pay Frequency',null,'Weekly — already set')
    +row('Standard Hours / Auto Pay',null,'leave the defaults')
    +sec('Rates')
    +row('Rate Code',null,'Base Rate — already set')
    +row('Rate',o.pay_rate?Number(o.pay_rate).toFixed(2):null,'no rate on the offer — ask '+(o.offered_by||'the coordinator'))
    +sec('Taxes')
    +row('Tax Type',null,'choose W2')
    +sec('Onboarding Plan')
    +row('Select a Plan',o.onboarding_plan||'Default (Default)');
}
function vivCopy(btn){
  navigator.clipboard.writeText(btn.dataset.v||'')
    .then(()=>{ btn.textContent='✓'; setTimeout(()=>{btn.textContent='📋 copy';},1200); })
    .catch(()=>{ alert(btn.dataset.v||''); });
}
async function markOfferStep1(id,btn){
  if(btn){btn.disabled=true;btn.textContent='Saving…';}
  try{
    await offerUpdate(id,{p_step1:true});
    await loadOffers();
  }catch(e){ alert('Could not save: '+(e&&e.message?e.message:'error')); if(btn){btn.disabled=false;btn.textContent='☑ Step 1 done (got the notification)';} }
}

// ── Helpers ───────────────────────────────────────────────────────────
function pd(s){ if(!s)return null; const d=new Date(s+'T00:00:00'); return isNaN(d)?null:d; }
function addDays(d,n){ const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function daysLeft(d){ return Math.round((d-TODAY)/86400000); }
function fmtD(s){ const d=pd(s); if(!d)return null; return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
/* ── ELIGIBILITY: ONE COPY, NOT TWO ────────────────────────────────────────
   These used to be defined here. They now live in eligibility-rules.js, which
   the scheduled evaluator imports too, so the hub and the server cannot
   disagree about whether somebody may work. The definitions were deleted
   rather than left beside the aliases on purpose: a copy that still exists is
   a copy that can be edited by mistake.

   eligibility-rules.js loads before this file. If it is somehow absent these
   throw immediately and loudly, rather than quietly computing a different
   answer. */
function __elig(){
  const E = (typeof globalThis!=='undefined') && globalThis.CCElig;
  if(!E) throw new Error('eligibility-rules.js has not loaded — refusing to guess at eligibility');
  return E;
}
function chkStatus(a,b,c){ return __elig().chkStatus(a,b,c); }
function trainStatus(c){ return __elig().trainStatus(c); }
function refPolicy(c){ return __elig().refPolicy(c); }
function refDecisionCovers(c){ return __elig().refDecisionCovers(c); }
function obDeriveStatus(c){ return __elig().obDeriveStatus(c); }
function fcsrRegStatus(c){ return __elig().fcsrRegStatus(c); }
function eligibility(c){ return __elig().eligibility(c); }
function eligibilityFacts(c){ return __elig().eligibilityFacts(c); }
function eligRecord(c,e){ return __elig().eligRecord(c,e); }
function eligRecordRefDecision(c,o,n){ return __elig().eligRecordRefDecision(c,o,n); }

/* ── PROFILE BEFORE THE FIRST SHIFT (part 2, slice 2c, 2026-10-01) ─────────
   "must have profile before can start work". NEW HIRES ONLY: the rule and the
   "new hire" line are CCElig.profileGate in eligibility-rules.js; the lookup is
   CGP2.gateLoad / gateFor in caregiver-profile-panel.js (one query, the panel's
   own AxisCare-id-then-candidate-id order). Nothing is saved on the caregiver
   record. Before the lookup has answered, nobody shows as blocked; a lookup that
   FAILED says so on the screen for any new hire it could not check. */
let _cgpgKicked=false;
function cgpgFor(c){
  if(!window.CGP2 || !CGP2.gateFor) return null;
  if(!_cgpgKicked){
    _cgpgKicked=true;
    window.addEventListener('cgp-gate-changed', cgpgRedraw);
    CGP2.gateLoad(caregivers);
  }
  return CGP2.gateFor(c);
}
function cgpgRedraw(){
  try{ if(document.getElementById('tr-tbody')) renderTR(); }catch(e){}
  try{ if(typeof activeTab!=='undefined' && activeTab==='home') renderStaffHome(); }catch(e){}
}

function badge(status,txt){
  const cls={Current:'b-green','Due Soon':'b-amber',Overdue:'b-red',Pending:'b-gray',
    CLEAR:'b-green',FLAGGED:'b-red',Clear:'b-green','Issues Found':'b-red',
    'N/A':'b-gray',Required:'b-amber',Submitted:'b-blue',Complete:'b-green'}[status]||'b-gray';
  return `<span class="badge ${cls}">${txt||status}</span>`;
}
function proofLink(url){ return url?`<a class="proof-link" href="${url}" target="_blank">📄 proof</a>`:`<span style="color:#E8E2D8;font-size:.67rem">no proof</span>`; }


// ── Candidate texting via Supabase edge function + GoHighLevel ────────
// Replaces the zapier_orient/not_hired webhooks. The send-candidate-message
// edge function upserts the contact in GoHighLevel and sends the SMS from
// the agency number. Throws with a readable message on failure.
async function sendCandidateSMS(payload){
  const { data, error } = await sb.functions.invoke('send-candidate-message', { body: payload });
  if(error){
    let msg = error.message || 'SMS service error';
    try { const body = await error.context.json(); if(body?.error) msg = body.error; } catch(_){}
    throw new Error(msg);
  }
  if(data?.error) throw new Error(data.error);
  return data;
}


// ── ATTENDANCE & DISCIPLINE (Handbook 2U Attendance & Dependability +
//    2V Corrective Action, applied consistently; humans issue, hub drafts) ──
let ATT_EVENTS=[], DISC_ACTIONS=[];
const ATT_DEFAULTS={notice_hours:4, callin_count:3, callin_window:90, tardy_grace:7, tardy_count:3, tardy_window:90, lookback_months:12};
function attCfg(){ return Object.assign({}, ATT_DEFAULTS, appSettings.attendance||{}); }
function saveAttSettings(){
  appSettings.attendance={
    notice_hours:+document.getElementById('att-set-notice').value||4,
    callin_count:+document.getElementById('att-set-ccount').value||3,
    callin_window:+document.getElementById('att-set-cwin').value||90,
    tardy_grace:+document.getElementById('att-set-grace').value||7,
    tardy_count:+document.getElementById('att-set-tcount').value||3,
    tardy_window:+document.getElementById('att-set-twin').value||90,
    lookback_months:+document.getElementById('att-set-look').value||12,
  };
  syncToSupabase('settings', appSettings);
  renderAttendance();
}
function attTypeUi(){
  const t=document.getElementById('att-type').value;
  document.getElementById('att-called-wrap').style.display = t==='callin'?'inline':'none';
  document.getElementById('att-late-wrap').style.display = t==='tardy'?'inline':'none';
  document.getElementById('att-log-hint').textContent =
    t==='ncns'?'Per Handbook 2U this is serious misconduct — logging it flags an immediate termination review and alerts Samantha.'
    :t==='callin'?'The hub computes the notice from shift time minus call time — under '+attCfg().notice_hours+' hours = write-up required.':'';
}
async function attPersist(key,item){
  try{ const { error } = await sb.rpc('upsert_app_data_item',{ target_key:key, item }); if(error) throw error; }
  catch(e){ alert('Could not save — check your connection and try again.'); throw e; }
}
async function logAttEvent(){
  const type=document.getElementById('att-type').value;
  const cg=document.getElementById('att-cg').value.trim();
  const sd=document.getElementById('att-shift-date').value;
  const st=document.getElementById('att-shift-time').value;
  if(!cg||!sd){ alert('Caregiver and shift date are required.'); return; }
  let by=''; try{ const {data:{session}}=await sb.auth.getSession(); by=(session&&session.user&&session.user.email)||''; }catch(e){}
  const ev={ id:'att'+Date.now(), caregiver:cg, type, shift_date:sd, shift_time:st||'',
    note:document.getElementById('att-note').value.trim(), logged_by:by.split('@')[0]||'staffing',
    created_at:new Date().toISOString(), action_id:null };
  if(type==='callin'){
    const called=document.getElementById('att-called-at').value;
    if(called&&st){
      const h=(new Date(sd+'T'+st).getTime()-new Date(called).getTime())/3600000;
      ev.notice_hours=Math.round(h*10)/10;
    }
    ev.reported_at=called||'';
  }
  if(type==='tardy') ev.minutes_late=+document.getElementById('att-late-min').value||null;
  ATT_EVENTS.push(ev);
  await attPersist('attendance_events',ev);
  document.getElementById('att-cg').value=''; document.getElementById('att-note').value='';
  document.getElementById('att-late-min').value=''; document.getElementById('att-called-at').value='';
  renderAttendance();
  if(type==='ncns') alert('Logged. Per Handbook 2U this is an immediate termination review — it now shows on Samantha\'s manager view. Draft the notice from '+cg+'\'s card, and call Samantha before anything is issued.');
}
/* Pending triggers = uncovered strikes, per her rules:
   every short-notice call-in AND every NCNS is its own trigger; hitting the
   call-in/tardy totals inside the window is a trigger for the accumulation. */
function attStatus(cg){
  const cfg=attCfg(), now=Date.now();
  const evs=ATT_EVENTS.filter(e=>e.caregiver===cg);
  const inWin=(e,days)=>now-new Date(e.shift_date+'T00:00').getTime()<=days*86400000;
  const uncovered=evs.filter(e=>!e.action_id);
  const callinsWin=evs.filter(e=>e.type==='callin'&&inWin(e,cfg.callin_window));
  const tardiesWin=evs.filter(e=>e.type==='tardy'&&inWin(e,cfg.tardy_window));
  const triggers=[];
  uncovered.filter(e=>e.type==='ncns').forEach(e=>triggers.push({kind:'ncns',events:[e],label:'No-call/no-show — immediate termination review'}));
  uncovered.filter(e=>e.type==='callin'&&e.notice_hours!=null&&e.notice_hours<cfg.notice_hours)
    .forEach(e=>triggers.push({kind:'short_notice',events:[e],label:'Call-in with only '+e.notice_hours+'h notice (policy: '+cfg.notice_hours+'h)'}));
  const uncCallins=callinsWin.filter(e=>!e.action_id);
  if(callinsWin.length>=cfg.callin_count&&uncCallins.length)
    triggers.push({kind:'callin_total',events:uncCallins,label:callinsWin.length+' call-ins in '+cfg.callin_window+' days (policy: '+cfg.callin_count+')'});
  const uncTardies=tardiesWin.filter(e=>!e.action_id);
  if(tardiesWin.length>=cfg.tardy_count&&uncTardies.length)
    triggers.push({kind:'tardy_total',events:uncTardies,label:tardiesWin.length+' tardies in '+cfg.tardy_window+' days (policy: '+cfg.tardy_count+')'});
  const lookMs=cfg.lookback_months*30.4*86400000;
  const issued=DISC_ACTIONS.filter(a=>a.caregiver===cg&&a.status==='issued'&&now-new Date(a.issued_at).getTime()<=lookMs);
  const drafts=DISC_ACTIONS.filter(a=>a.caregiver===cg&&(a.status==='draft'||a.status==='pending_approval'||a.status==='approved'));
  const LADDER=['Verbal Warning','Written Warning','Final Written Warning','Termination Review'];
  const nextLevel=triggers.some(t=>t.kind==='ncns')?'Termination Review':LADDER[Math.min(issued.length,3)];
  return {evs,callinsWin,tardiesWin,triggers,issued,drafts,nextLevel,
    termEligible:issued.length>=2||triggers.some(t=>t.kind==='ncns')};
}
function attCaregivers(){ return [...new Set(ATT_EVENTS.map(e=>e.caregiver))].sort(); }

/* ── WRITE-UP TEMPLATES ───────────────────────────────────────────────────────
   Until now a write-up could only be raised from an attendance trigger, so
   conduct, communication and boundary issues had no route at all.
   Every quote below is verbatim from the 2025-2027 Employee Handbook with its
   section code, checked 2026-07-29. Earlier drafts quoted the 2024-2025 manual;
   three of those passages no longer exist and the gift language was the
   opposite of current policy. Do not paraphrase these into something stricter
   than the handbook actually says — that is what unravels a notice. */
const HB_LEVELS = ['Coaching','Verbal Warning','Written Warning','Final Written Warning','Suspension','Termination Review'];

const HB_TEMPLATES = {
  callout: {
    label:'Short-notice call-off', section:'2U — Attendance & Dependability', level:'Verbal Warning',
    policy:['Employees are expected to: Report to work as scheduled. Arrive on time. Complete assigned shifts. Notify the office immediately if attendance issues arise. Maintain reliable attendance.',
            'Whenever possible, notify the office at least four (4) hours before the beginning of your shift. For shifts beginning between 7:00 AM and 9:00 AM, notify the office no later than 5:00 PM the previous day, whenever reasonably possible.'],
    boxes:['Less than 4 hours notice','7-9 AM shift, not notified by 5 PM the day before','Repeated short-notice call-offs'],
    why:'Clients depend on scheduled care for safety and daily living. Short notice makes replacement coverage difficult and can leave a vulnerable client without the support they were promised.',
    expect:['Report to all assigned shifts as scheduled.','Give as much notice as the circumstances allow.','Call the office directly rather than telling a coworker.','Keep transportation arrangements reliable, including a backup where possible.','Consider your availability carefully before accepting an assignment.'] },

  ncns: {
    label:'No Call / No Show', section:'2U — Attendance & Dependability', level:'Termination Review', serious:true,
    policy:['A No Call / No Show occurs when an employee fails to report to work and fails to notify the company. Because this places vulnerable clients at significant risk, No Call / No Show incidents are considered serious misconduct and may result in immediate termination.',
            'Employees may never leave a client without ensuring appropriate coverage or receiving authorization from the office.'],
    boxes:['Did not report for a scheduled shift','Did not notify the office','Client was left without coverage'],
    why:'A client expecting care received none, and the office had no opportunity to arrange a replacement. Handbook section 2V lists No Call / No Show among violations that may result in immediate termination without prior warning.',
    expect:['This notice is a review of continued employment. Any expectations going forward will be set in that review.'] },

  communicate: {
    label:'Failure to communicate', section:'2N — Communication', level:'Verbal Warning',
    policy:['Employees should: Return calls and messages promptly. Notify the office of concerns immediately. Report changes in client condition. Ask questions when unsure. Maintain a respectful tone. Communicate honestly.',
            'Never assume someone else has already reported a concern.',
            'Refer questions regarding scheduling, billing, care plans, or medical concerns to the office.',
            'Employees must maintain a working telephone capable of receiving calls and text messages.'],
    boxes:['Did not return office calls','Did not return office texts','Did not report a scheduling problem','Did not report a change in client condition','Did not report an incident','Arranged schedule changes directly with the client or family'],
    why:'The office cannot coordinate care, document concerns or respond to an emergency it does not know about. Arranging things directly with a family also leaves the client with no record and no backup if the arrangement fails.',
    expect:['Return office calls and messages promptly.','Report scheduling problems to the office as soon as you know.','Report any change in a client’s condition immediately.','Send clients and families to the office for scheduling, billing and care plan questions.','Keep a working phone that can receive calls and texts.'] },

  conduct: {
    label:'Unprofessional conduct', section:'2M — Professionalism', level:'Verbal Warning',
    policy:['Employees are expected to conduct themselves with honesty, integrity, compassion, and respect at all times.',
            'Professional behavior includes: Being courteous. Speaking respectfully. Maintaining appropriate boundaries. Being dependable. Following company policies. Demonstrating patience. Respecting client choices. Maintaining confidentiality.',
            'Employees should avoid: Becoming personally involved in family conflicts. Sharing excessive personal information. Accepting inappropriate gifts. Making promises they cannot keep. Discussing company matters with clients. Speaking negatively about coworkers or previous caregivers.'],
    boxes:['Disrespectful to office staff','Disrespectful to a coworker','Disrespectful to a client or family','Spoke negatively about coworkers or previous caregivers','Discussed company matters with a client','Inappropriate language'],
    why:'Clients and families judge the whole agency by how one caregiver speaks and behaves. Unprofessional conduct damages trust that is difficult to rebuild, and it makes the working relationship harder for everyone on the team.',
    expect:['Speak respectfully to clients, families, coworkers and office staff at all times.','Keep conversations client-focused and work-related.','Raise concerns about the company with the office, not with clients.','Do not speak negatively about coworkers or previous caregivers.','Maintain professional boundaries in every interaction.'] },

  insub: {
    label:'Refusing to follow direction (insubordination)', section:'2V — Corrective Action', level:'Written Warning',
    policy:['Handbook section 2V lists Insubordination among behaviors that may result in corrective action. In plain terms, that means failure or refusal to follow reasonable directions, instructions, or policies from supervisors or agency leadership.'],
    boxes:['Refused to perform assigned duties','Refused to follow a care plan after being directed','Refused to complete required documentation','Argued with or hung up on office staff','Ignored scheduling instructions'],
    why:'The office is responsible for the client’s care plan and for the agency’s compliance. When direction is refused, care can fall outside what was authorised and the agency cannot stand behind it.',
    expect:['Follow reasonable direction from the office and from agency leadership.','Complete assigned duties and required documentation.','Follow the care plan as written; raise concerns with the office rather than changing it yourself.','Bring disagreements to the office professionally and at the time.'] },

  boundary: {
    label:'Client boundaries and gifts', section:'4Q — Gifts & Gratuities', level:'Verbal Warning',
    policy:['Many clients express appreciation through gifts or tips. While small tokens of appreciation may occasionally be appropriate, employees should never request or expect gifts.',
            'Employees may NOT: Ask clients for money. Request gifts. Solicit donations. Pressure clients to purchase items. Accept expensive gifts or valuable property.',
            'If a client offers large amounts of cash, jewelry, vehicles, real estate, valuable collectibles or other significant gifts, politely decline the gift and notify the office.'],
    boxes:['Asked a client for money','Requested or solicited a gift','Accepted an expensive gift or valuable property','Did not decline and report a significant gift','Became personally involved in family conflicts','Shared excessive personal information','Made promises that could not be kept'],
    why:'Clients are often vulnerable and depend on their caregiver. Financial involvement or over-familiarity puts them at risk, compromises judgement, and creates exposure for the caregiver as much as for the agency.',
    expect:['Never ask for or expect money, gifts or favours from a client or family.','Politely decline any significant gift and tell the office the same day.','Keep the relationship professional and focused on care.','Do not become involved in family disagreements.'],
    caution:'Under 4Q a small token of appreciation is NOT a violation. Do not issue this notice for one. If the concern is a pattern, describe the pattern.' },

  phone: {
    label:'Improper phone use', section:'2P — Personal Cell Phone Use', level:'Coaching',
    policy:['Employees are expected to limit personal phone use while providing services.',
            'Employees should not: Spend excessive time texting. Browse social media during work hours. Watch videos or stream media. Play games. Make lengthy personal phone calls.',
            'Phones may be used for AxisCare, Electronic Visit Verification, reviewing care plans, documenting care notes, work-related communication with the office, emergencies and approved client-related communication.'],
    boxes:['Excessive personal texting during a shift','Social media during work hours','Watching or streaming media','Lengthy personal calls','Phone use that interrupted client care'],
    why:'A client paying for care should have the caregiver’s attention. Phone use during a shift is also visible to families, and it is one of the most common complaints agencies receive.',
    expect:['Keep personal phone use to breaks and genuine emergencies.','Use your phone during a shift for AxisCare, EVV, care notes and office communication.','Give the client your attention for the shift they are paying for.'] },
};

/* Every corrective action, grouped by where it is stuck. Ordered by who is
   waiting on whom: sent back to you first, then yours to finish, then waiting
   on the owners, then ready to hand over. History last. */
function renderWriteups(){
  const box=document.getElementById('wuList'); if(!box) return;
  const all=(DISC_ACTIONS||[]).slice().sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const bucket=(f)=>all.filter(f);
  const sentBack = bucket(a=>a.status==='draft' && a.reject_note);
  const drafts   = bucket(a=>a.status==='draft' && !a.reject_note);
  const waiting  = bucket(a=>a.status==='pending_approval');
  const approved = bucket(a=>a.status==='approved');
  const issued   = bucket(a=>a.status==='issued');

  const badge=document.getElementById('wuBadge');
  const needsMe=sentBack.length+drafts.length+approved.length;
  if(badge){ badge.style.display=needsMe?'inline-block':'none'; badge.textContent=needsMe; }

  const row=(a,note)=>'<div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;padding:.5rem 0;border-bottom:1px solid var(--border)">'
    +'<b style="font-size:.85rem;color:var(--navy);min-width:150px">'+creqEsc(a.caregiver||'')+'</b>'
    +'<span style="font-size:.75rem;background:var(--slate-bg);border-radius:999px;padding:.1rem .5rem">'+creqEsc(a.level||'')+'</span>'
    +'<span style="font-size:.76rem;color:var(--gray)">'+creqEsc(a.reason||a.category||'')+'</span>'
    +(note?'<span style="font-size:.74rem;color:#b45309">'+note+'</span>':'')
    +'<span style="flex:1"></span>'
    +'<span style="font-size:.72rem;color:var(--gray)">'+String(a.created_at||'').slice(0,10)+'</span>'
    +'<button class="fb" style="font-size:.72rem;padding:.25rem .7rem" onclick="openWriteup(\''+a.id+'\')">Open</button>'
    +'</div>';

  const group=(title,rows,hint,tone)=>rows.length
    ? '<div style="margin-bottom:1.1rem"><div style="display:flex;align-items:baseline;gap:.5rem;margin-bottom:.2rem">'
      +'<b style="font-size:.85rem;color:'+(tone||'var(--navy)')+'">'+title+'</b>'
      +'<span style="font-size:.74rem;color:var(--gray)">'+hint+'</span></div>'+rows+'</div>'
    : '';

  const html =
     group('Sent back to you', sentBack.map(a=>row(a,'↩ '+creqEsc(a.reject_note||''))).join(''), 'an owner asked for changes', '#b91c1c')
   + group('Your drafts', drafts.map(a=>row(a,'')).join(''), 'not submitted yet')
   + group('Waiting on Samantha or Zach', waiting.map(a=>row(a,'⏳')).join(''), 'nothing is sent until they approve')
   + group('Approved, ready to issue', approved.map(a=>row(a,'✅')).join(''), 'review it with the caregiver, get the signature, then mark issued', '#15803d')
   + group('Issued', issued.slice(0,25).map(a=>row(a,'📄 '+String(a.issued_at||'').slice(0,10))).join(''), 'on file');

  box.innerHTML = html || '<div style="font-size:.82rem;color:var(--gray)">No corrective actions on file. Use <b>Start a write-up</b> when one is needed.</div>';
}

function openNewWriteup(prefillCg){
  const sel=document.getElementById('hb-tpl');
  sel.innerHTML=hbTemplateOptions('callout');
  document.getElementById('hb-cg').value=prefillCg||'';
  document.getElementById('hb-date').value=new Date().toLocaleDateString('en-CA');
  document.getElementById('hb-details').value='';
  // caregivers on the roster, plus anyone who already has attendance history
  const names=[...new Set([].concat(
    (typeof caregivers!=='undefined'?caregivers:[]).map(c=>((c.first||'')+' '+(c.last||'')).trim()),
    attCaregivers()
  ).filter(Boolean))].sort();
  document.getElementById('hb-cg-list').innerHTML=names.map(n=>'<option value="'+creqEsc(n)+'">').join('');
  hbTplChanged();
  document.getElementById('newwriteup-modal').classList.add('open');
}

function hbTplChanged(){
  const key=document.getElementById('hb-tpl').value, t=HB_TEMPLATES[key];
  document.getElementById('hb-level').innerHTML=hbLevelOptions(t.level);
  document.getElementById('hb-levelnote').textContent =
    t.serious ? 'Handbook 2V allows immediate termination for this without prior warning.'
              : 'Suggested from the handbook. Change it if the situation warrants.';
  const cau=document.getElementById('hb-caution');
  if(t.caution){ cau.style.display='block'; cau.textContent='⚠️ '+t.caution; } else cau.style.display='none';
  document.getElementById('hb-boxes').innerHTML = t.boxes.map((b,i)=>
    '<label style="display:flex;gap:.45rem;align-items:flex-start;font-size:.8rem">'
    +'<input type="checkbox" class="hb-box" value="'+creqEsc(b)+'" style="margin-top:.15rem"> '+creqEsc(b)+'</label>').join('');
  document.getElementById('hb-policy-preview').innerHTML =
    '<b>Handbook '+creqEsc(t.section)+'</b> will be quoted in full on the notice.';
}

async function hbCreateWriteup(){
  const cg=document.getElementById('hb-cg').value.trim();
  const key=document.getElementById('hb-tpl').value;
  const level=document.getElementById('hb-level').value;
  const when=document.getElementById('hb-date').value;
  const details=document.getElementById('hb-details').value.trim();
  const checked=[...document.querySelectorAll('.hb-box:checked')].map(b=>b.value);
  if(!cg){ alert('Which caregiver is this about?'); return; }
  if(!checked.length && !details){ alert('Tick what happened, or describe it. A notice with no facts on it is not usable.'); return; }
  let by=''; try{ const {data:{session}}=await sb.auth.getSession(); by=(session&&session.user&&session.user.email)||''; }catch(e){}
  const t=HB_TEMPLATES[key];
  const a={ id:'hb'+Date.now(), caregiver:cg, level, reason:t.label, category:key, event_ids:[],
    body:hbDocBody(cg,key,level,when,checked,details),
    status:'draft', created_at:new Date().toISOString(),
    created_by:by.split('@')[0]||'coordinator', created_by_email:by, issued_at:null };
  // Persist FIRST, then show it locally — so a failed save never leaves a
  // phantom draft that looks saved but vanishes on reload. attPersist alerts
  // "Could not save" and throws on failure, so the coordinator is told.
  try{ await attPersist('discipline_actions',a); }
  catch(e){ return; }
  DISC_ACTIONS.push(a);
  document.getElementById('newwriteup-modal').classList.remove('open');
  openWriteup(a.id);
  renderAttendance();
  renderWriteups();
}

function hbTemplateOptions(sel){
  return Object.entries(HB_TEMPLATES).map(([k,t])=>
    '<option value="'+k+'"'+(k===sel?' selected':'')+'>'+creqEsc(t.label)+'</option>').join('');
}
function hbLevelOptions(sel){
  return HB_LEVELS.map(l=>'<option value="'+l+'"'+(l===sel?' selected':'')+'>'+l+'</option>').join('');
}

/* Builds the notice body. Same shape as the attendance one so a coordinator
   reading either recognises it. */
function hbDocBody(cg, tplKey, level, incidentDate, checked, details){
  const t=HB_TEMPLATES[tplKey];
  const today=new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  const wrap=(s,ind='  ')=>{ const out=[]; let line=ind;
    s.split(/\s+/).forEach(w=>{ if((line+w).length>76){ out.push(line); line=ind; } line+=w+' '; });
    out.push(line); return out.join('\n').replace(/\s+$/gm,''); };
  return 'CARING COMPANIONS — CORRECTIVE ACTION NOTICE\n'
    +'══════════════════════════════════════════════\n\n'
    +'Employee:        '+cg+'\n'
    +'Date of notice:  '+today+'\n'
    +(incidentDate?'Date of incident: '+new Date(incidentDate+'T12:00:00').toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})+'\n':'')
    +'Action level:    '+level+'\n'
    +'Category:        '+t.label+' (Handbook '+t.section+')\n\n'
    +'THIS NOTICE IS BEING ISSUED FOR:\n'
    +(checked.length?checked.map(c=>'  • '+c).join('\n')+'\n':'  • '+t.label+'\n')
    +'\nWHAT HAPPENED:\n'+wrap(details||'(to be completed by the supervisor)')+'\n'
    +'\nCOMPANY POLICY (Employee Handbook '+t.section+'):\n'
    +t.policy.map(p=>wrap('"'+p+'"')).join('\n\n')+'\n'
    +'\nWHY THIS MATTERS:\n'+wrap(t.why)+'\n'
    +'\nWHAT WE EXPECT NOW:\n'
    +t.expect.map((e,i)=>wrap((i+1)+'. '+e)).join('\n')+'\n'
    +'\nFailure to demonstrate immediate and sustained improvement may result in\n'
    +'further corrective action, up to and including termination of employment.\n'
    +'Handbook 2V: "The company reserves the right to skip any step depending\n'
    +'upon the seriousness of the policy violation."\n'
    +'\nEMPLOYEE COMMENTS:\n\n\n'
    +'\nACKNOWLEDGMENT:\n'
    +wrap('My signature below acknowledges that this notice has been reviewed with me. My signature does not necessarily indicate agreement with its contents.')+'\n\n'
    +'  Employee: ______________________________  Date: ____________\n'
    +'  Supervisor: ____________________________  Date: ____________\n'
    +'  Witness (optional): ____________________  Date: ____________\n';
}
function renderAttendance(){
  const cfg=attCfg();
  ['notice','ccount','cwin','grace','tcount','twin','look'].forEach((k,i)=>{
    const map={notice:'notice_hours',ccount:'callin_count',cwin:'callin_window',grace:'tardy_grace',tcount:'tardy_count',twin:'tardy_window',look:'lookback_months'};
    const el=document.getElementById('att-set-'+k); if(el&&!el.value) el.value=cfg[map[k]];
  });
  const dl=document.getElementById('att-cg-list');
  if(dl) dl.innerHTML=(caregivers||[]).map(c=>'<option value="'+creqEsc(((c.first||'')+' '+(c.last||'')).trim())+'">').join('');
  if(!document.getElementById('att-shift-date').value) document.getElementById('att-shift-date').value=new Date().toISOString().slice(0,10);
  attTypeUi();
  const wrap=document.getElementById('att-roster'); if(!wrap) return;
  const names=attCaregivers();
  if(!names.length){ wrap.innerHTML='<div style="color:#A89C8B;font-size:.85rem">No attendance events logged yet — the record starts with the first log.</div>'; updateAttBadge(); return; }
  const TYPE_ICON={callin:'📞',tardy:'🕐',ncns:'🚨'};
  wrap.innerHTML=names.map(cg=>{
    const s=attStatus(cg);
    const chip=s.triggers.some(t=>t.kind==='ncns')?'<span style="background:#DC2626;color:#fff;border-radius:999px;padding:.15rem .6rem;font-size:.7rem;font-weight:800">🚨 TERMINATION REVIEW</span>'
      :s.triggers.length?'<span style="background:#fef3c7;color:#92400e;border-radius:999px;padding:.15rem .6rem;font-size:.7rem;font-weight:800">⚠ WRITE-UP DUE</span>'
      :s.termEligible?'<span style="background:#fee2e2;color:#b91c1c;border-radius:999px;padding:.15rem .6rem;font-size:.7rem;font-weight:800">eligible for termination on next occurrence</span>'
      :'<span style="background:#dcfce7;color:#166534;border-radius:999px;padding:.15rem .6rem;font-size:.7rem;font-weight:700">in good standing</span>';
    return '<div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:.85rem 1.1rem;margin-bottom:.6rem">'
      +'<div style="display:flex;align-items:center;gap:.7rem;flex-wrap:wrap">'
      +'<b style="font-size:.95rem;color:var(--navy)">'+creqEsc(cg)+'</b>'+chip
      +'<span style="margin-left:auto;font-size:.72rem;color:#6E6559">'+s.callinsWin.length+' call-ins · '+s.tardiesWin.length+' tardies (window) · '+s.issued.length+' warning'+(s.issued.length===1?'':'s')+' on file</span>'
      +'</div>'
      +(s.triggers.length?'<div style="margin-top:.5rem">'+s.triggers.map((t,ti)=>
        '<div style="display:flex;align-items:center;gap:.6rem;font-size:.8rem;padding:.3rem 0;flex-wrap:wrap"><span style="color:#b91c1c;font-weight:700">→</span>'
        +'<span style="flex:1">'+creqEsc(t.label)+'</span>'
        +'<button class="fb" style="font-size:.72rem;background:#DC2626" onclick="draftWriteup(\''+creqEsc(cg).replace(/'/g,"\\'")+'\','+ti+')">📝 Draft '+creqEsc(attStatus(cg).nextLevel)+'</button></div>').join('')+'</div>':'')
      +(s.drafts.length?s.drafts.map(a=>{
        const st=a.status==='pending_approval'?'⏳ awaiting approval':a.status==='approved'?'✅ approved — ready to issue':(a.reject_note?'↩ sent back: “'+creqEsc(a.reject_note)+'”':'📝 draft');
        return '<div style="font-size:.75rem;color:#92400e;margin-top:.3rem">'+creqEsc(a.level)+' — '+st+' · <a href="#" onclick="openWriteup(\''+a.id+'\');return false;">open</a></div>';
      }).join(''):'')
      +'<details style="margin-top:.45rem"><summary style="cursor:pointer;font-size:.72rem;color:#6E6559">History ('+s.evs.length+' events'+(s.issued.length?', '+s.issued.length+' issued warnings':'')+')</summary>'
      +s.evs.slice().sort((a,b)=>String(b.shift_date).localeCompare(String(a.shift_date))).map(e=>
        '<div style="font-size:.75rem;padding:.2rem 0;color:#3A342C">'+(TYPE_ICON[e.type]||'')+' '+e.shift_date+(e.shift_time?' '+e.shift_time:'')
        +(e.type==='callin'&&e.notice_hours!=null?' · '+e.notice_hours+'h notice':'')
        +(e.type==='tardy'&&e.minutes_late?' · '+e.minutes_late+' min late':'')
        +(e.note?' · '+creqEsc(e.note):'')+(e.action_id?' · <span style="color:#92400e">covered by warning</span>':'')+'</div>').join('')
      +s.issued.map(a=>'<div style="font-size:.75rem;padding:.2rem 0;color:#b91c1c">📄 '+creqEsc(a.level)+' issued '+String(a.issued_at).slice(0,10)+'</div>').join('')
      +'</details></div>';
  }).join('');
  updateAttBadge();
}
function updateAttBadge(){
  const b=document.getElementById('attBadge'); if(!b) return;
  const n=attCaregivers().reduce((acc,cg)=>acc+attStatus(cg).triggers.length,0)+DISC_ACTIONS.filter(a=>a.status==='draft'||a.status==='approved').length;
  b.style.display=n?'inline':'none'; b.textContent=n;  updateGroupBadges();
}
let _writeupId=null;
function attDocBody(cg, trigger, level){
  const s=attStatus(cg), cfg=attCfg(), today=new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  const evLine=e=>'  • '+e.shift_date+(e.shift_time?' at '+e.shift_time:'')+' — '
    +(e.type==='ncns'?'No-call/no-show':e.type==='callin'?'Call-in'+(e.notice_hours!=null?' with '+e.notice_hours+' hours notice':''):'Tardy'+(e.minutes_late?' ('+e.minutes_late+' minutes late)':''))
    +(e.note?' — '+e.note:'');
  return 'CARING COMPANIONS — CORRECTIVE ACTION NOTICE\n'
    +'══════════════════════════════════════════════\n\n'
    +'Employee:        '+cg+'\n'
    +'Date:            '+today+'\n'
    +'Action level:    '+level+'\n'
    +'Category:        Attendance & Dependability (Handbook 2U)\n\n'
    +'THIS NOTICE IS BEING ISSUED FOR:\n'+trigger.label+'\n\n'
    +'THE FACTS:\n'+trigger.events.map(evLine).join('\n')+'\n\n'
    +'ATTENDANCE HISTORY ('+cfg.callin_window+'-day window):\n'
    +'  • Call-ins: '+s.callinsWin.length+'   • Tardies: '+s.tardiesWin.length+'\n'
    +(s.issued.length?'  Prior corrective actions on file:\n'+s.issued.map(a=>'  • '+a.level+' — issued '+String(a.issued_at).slice(0,10)).join('\n')+'\n':'  No prior corrective actions on file.\n')
    +'\nCOMPANY POLICY (Employee Handbook):\n'
    +'  2U — Attendance & Dependability: "Notify the office as soon as possible\n'
    +'  when unable to report to work. Whenever possible, provide at least four\n'
    +'  (4) hours notice; early morning shifts should be reported the evening\n'
    +'  before." A No Call / No Show "places vulnerable clients at significant\n'
    +'  risk, is considered serious misconduct and may result in immediate\n'
    +'  termination."\n'
    +'  2V — Corrective Action: Coaching → Verbal Warning → Written Warning →\n'
    +'  Final Written Warning → Suspension → Termination. The company reserves\n'
    +'  the right to skip any step depending upon the seriousness of the\n'
    +'  violation.\n\n'
    +'EXPECTATION GOING FORWARD:\n'
    +'  Report to every scheduled shift on time. If you cannot make a shift,\n'
    +'  call the office with at least '+cfg.notice_hours+' hours notice (the evening before\n'
    +'  for early-morning shifts).\n\n'
    +'CONSEQUENCE OF FURTHER OCCURRENCES:\n'
    +(level==='Termination Review'||level==='Final Written Warning'
      ?'  Any further attendance occurrence may result in termination of\n  employment.\n\n'
      :'  Further occurrences will result in the next step of corrective action,\n  up to and including termination of employment.\n\n')
    +'──────────────────────────────────────────────\n'
    +'Employee signature (confirms receipt, not agreement):\n\n'
    +'  X ______________________________   Date: ____________\n\n'
    +'Issued by:\n\n'
    +'  X ______________________________   Date: ____________\n\n'
    +'File the signed original in Viventium. Samantha Troutman must be\n'
    +'notified before this notice is issued.\n';
}
async function draftWriteup(cg, triggerIdx){
  const s=attStatus(cg);
  const t=s.triggers[triggerIdx]; if(!t) return;
  const level=t.kind==='ncns'?'Termination Review':s.nextLevel;
  let by=''; try{ const {data:{session}}=await sb.auth.getSession(); by=(session&&session.user&&session.user.email)||''; }catch(e){}
  const a={ id:'dw'+Date.now(), caregiver:cg, level, reason:t.label, event_ids:t.events.map(e=>e.id),
    body:attDocBody(cg,t,level), status:'draft', created_at:new Date().toISOString(), created_by:by.split('@')[0]||'staffing', issued_at:null };
  DISC_ACTIONS.push(a);
  await attPersist('discipline_actions',a);
  openWriteup(a.id);
  renderAttendance();
}
function openWriteup(id){
  const a=DISC_ACTIONS.find(x=>x.id===id); if(!a) return;
  _writeupId=id;
  document.getElementById('writeup-title').textContent='📝 '+a.level+' — '+a.caregiver;
  document.getElementById('writeup-body').value=a.body;
  const notice=document.getElementById('writeup-notice');
  const acts=document.getElementById('writeup-actions');
  const closeBtn='<button onclick="document.getElementById(\'writeup-modal\').classList.remove(\'open\')" style="margin-left:auto;background:#FAF9F6;border:1px solid var(--border);border-radius:7px;padding:.4rem .9rem;cursor:pointer;font-family:inherit;font-size:.8rem">Close</button>';
  document.getElementById('writeup-body').readOnly = a.status==='pending_approval';
  if(a.status==='draft'){
    notice.innerHTML='This is a draft. Edit if needed, then <b>send it for approval</b> — only <b>Samantha or Zach</b> can approve discipline (they see it in the Owners Hub and the CC Hub); nothing can be issued without that.'+(a.reject_note?'<br>↩ Sent back: “'+creqEsc(a.reject_note)+'”':'');
    acts.innerHTML='<button class="fb" onclick="printWriteup()">🖨 Print preview</button>'
      +'<button class="fb" style="background:#0d3a5f" onclick="sendForApproval()">📤 Send for approval</button>'+closeBtn;
  }else if(a.status==='pending_approval'){
    notice.innerHTML='⏳ Waiting for Samantha or Zach to approve — they see this in the Owners Hub. It can\'t be edited or issued until it\'s approved.';
    acts.innerHTML='<button class="fb" onclick="printWriteup()">🖨 Print preview</button>'+closeBtn;
  }else if(a.status==='approved'){
    notice.innerHTML='✅ Approved by '+creqEsc(a.approved_by||'a care coordinator')+'. <b>Copy notice</b> → paste into the AxisCare "Corrective Action Notice" form → send to the caregiver to e-sign in their app. Once signed, click Mark issued — that stamps the proof note on their AxisCare record too. (🖨 Print / Save as PDF if you also want a copy in Viventium.)';
    acts.innerHTML='<button class="fb" style="background:#0d3a5f" onclick="copyWriteup(this)">📋 Copy notice</button>'
      +'<button class="fb" onclick="printWriteup()">🖨 Print / PDF</button>'
      +'<button class="fb" style="background:#16a34a" onclick="issueWriteup()">✓ Mark issued</button>'+closeBtn;
  }else{
    notice.innerHTML='📄 Issued '+String(a.issued_at||'').slice(0,10)+(a.ax_noted?' · ✅ proof noted on the AxisCare record':a.ax_note_error?' · ⚠ AxisCare note failed: '+creqEsc(a.ax_note_error)+' — <a href="#" onclick="pushAxNote(\''+a.id+'\');return false;">retry</a>':'');
    acts.innerHTML='<button class="fb" onclick="printWriteup()">🖨 Print</button>'+closeBtn;
  }
  document.getElementById('writeup-modal').classList.add('open');
}
async function sendForApproval(){
  const a=DISC_ACTIONS.find(x=>x.id===_writeupId);
  if(!a){ alert('This write-up could not be found — reload the page, open it again, then resend. (Nothing was lost; your draft is saved.)'); return; }
  a.body=document.getElementById('writeup-body').value;
  a.status='pending_approval'; a.sent_for_approval_at=new Date().toISOString(); a.reject_note='';
  await attPersist('discipline_actions',a);
  document.getElementById('writeup-modal').classList.remove('open');
  renderAttendance();
  renderWriteups();
  alert('Sent ✓ — Samantha and Zach will see it in the Owners Hub. You\'ll see the approval here.');
}
async function pushAxNote(id){
  const a=DISC_ACTIONS.find(x=>x.id===id); if(!a) return;
  const noteText='CORRECTIVE ACTION ISSUED — '+a.level+' ('+String(a.issued_at||'').slice(0,10)+')\n'
    +'Category: Attendance & Dependability (Handbook 2U/2V)\n'
    +'Reason: '+a.reason+'\n'
    +'Approved by: '+(a.approved_by||'Samantha Troutman')+' · Issued by: '+(a.created_by||'staffing')+'\n'
    +'Signed original filed in Viventium.';
  /* C2b: by AxisCare number, picked by a person, through our own server with their sign-in (recorded) */
  const d=await axCaregiverNote(a.caregiver, noteText, a.ax_caregiver_id);
  if(d.outcome==='sent'){ a.ax_noted=true; a.ax_note_error=''; a.ax_caregiver_id=d.picked.id; }
  else { a.ax_noted=false; a.ax_note_error=d.outcome==='cancelled'?'not sent: no caregiver was picked':String(d.detail||d.error||'failed'); }
  await attPersist('discipline_actions',a);
  renderAttendance();
  return a.ax_noted;
}
function copyWriteup(btn){
  navigator.clipboard.writeText(document.getElementById('writeup-body').value)
    .then(()=>{ btn.textContent='✓ Copied'; setTimeout(()=>{btn.textContent='📋 Copy notice';},1800); })
    .catch(()=>{ document.getElementById('writeup-body').select(); alert('Press Cmd+C / Ctrl+C to copy.'); });
}
function printWriteup(){
  const w=window.open('','_blank');
  w.document.write('<pre style="font:12px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap;padding:24px">'+document.getElementById('writeup-body').value.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</pre>');
  w.document.close(); w.print();
}
async function issueWriteup(){
  const a=DISC_ACTIONS.find(x=>x.id===_writeupId);
  if(!a){ alert('This write-up could not be found — reload the page and open it again.'); return; }
  if(a.status!=='approved'){ alert('Samantha has to approve this first — send it to her from the draft view.'); return; }
  if(!confirm('Mark this '+a.level+' as ISSUED to '+a.caregiver+'? Only do this once the signed copy is in hand.')) return;
  a.body=document.getElementById('writeup-body').value;
  a.status='issued'; a.issued_at=new Date().toISOString();
  await attPersist('discipline_actions',a);
  // The covered events stop re-triggering the ladder.
  for(const eid of a.event_ids){
    const e=ATT_EVENTS.find(x=>x.id===eid);
    if(e&&!e.action_id){ e.action_id=a.id; await attPersist('attendance_events',e); }
  }
  document.getElementById('writeup-modal').classList.remove('open');
  // Proof onto the caregiver's AxisCare record — the paper trail lives where
  // the state and the schedule live.
  const ok=await pushAxNote(a.id);
  alert(ok?'Issued ✓ — proof note added to '+a.caregiver+'\'s AxisCare record. File the signed original in Viventium.'
          :'Issued ✓ — but the AxisCare note didn\'t attach ('+(a.ax_note_error||'error')+'). A retry link is on their card; file the signed original in Viventium either way.');
  renderAttendance();
}
async function scanClockins(btn){
  const box=document.getElementById('att-scan-results');
  if(btn){btn.disabled=true;btn.textContent='Scanning…';}
  try{
    const r=await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/axiscare-open-shifts',{
      method:'POST',headers:{'x-hub-token':await trainHubTok(),'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
      body:JSON.stringify({mode:'clockins',days:7,grace:attCfg().tardy_grace})});
    const d=await r.json();
    if(d.error) throw new Error(d.error);
    const late=(d.flagged||[]).filter(f=>!f.missing_clock_in);
    const missing=(d.flagged||[]).filter(f=>f.missing_clock_in);
    box.innerHTML=
      (late.length?late.map(f=>'<div style="background:#fff;border:1px solid var(--border);border-left:4px solid #B45309;border-radius:8px;padding:.5rem .8rem;margin-bottom:.3rem;font-size:.78rem;display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">'
        +'<b>'+creqEsc(f.caregiver)+'</b> clocked in '+f.minutes_late+' min late — '+f.date+' '+(f.scheduled||'')+' ('+creqEsc(f.client)+')'
        +'<button class="fb" style="font-size:.7rem;margin-left:auto" onclick="prefillTardy(\''+creqEsc(f.caregiver).replace(/'/g,"\\'")+'\',\''+f.date+'\',\''+(f.scheduled||'')+'\','+f.minutes_late+')">Log as tardy</button></div>').join('')
        :'<div style="font-size:.78rem;color:#166534">No confirmed late clock-ins found.</div>')
      +(missing.length?'<div style="font-size:.72rem;color:#A89C8B;margin-top:.3rem">'+missing.length+' shifts had no clock-in recorded (likely the EVV gap above, not true no-shows).</div>':'');
  }catch(e){ box.innerHTML='<div style="color:#b91c1c;font-size:.8rem">Scan failed: '+creqEsc(e&&e.message?e.message:'error')+'</div>'; }
  finally{ if(btn){btn.disabled=false;btn.textContent='Run scan';} }
}
function prefillTardy(cg,date,time,mins){
  document.getElementById('att-type').value='tardy'; attTypeUi();
  document.getElementById('att-cg').value=cg;
  document.getElementById('att-shift-date').value=date;
  document.getElementById('att-shift-time').value=time;
  document.getElementById('att-late-min').value=mins;
  window.scrollTo({top:0,behavior:'smooth'});
}

// ── AUTOMATION REPLIES (moved here from the Team Hub — this is the Staffing
//    Coordinator's desk; ghl-replies/-thread/-reply fns, no GHL seat needed) ──
let _repliesData=null, repliesExpanded=true;
async function loadRepliesWaiting(btn){
  const box=document.getElementById('repliesWaiting'); if(!box) return;
  if(btn&&btn.tagName==='BUTTON'){ btn.disabled=true; btn.textContent='↻ Loading…'; }
  try{
    const r=await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/ghl-replies',{
      method:'POST',headers:{'x-hub-token':await trainHubTok(),'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
      body:'{}'});
    const data=await r.json();
    if(!data||!Array.isArray(data.replies)) throw new Error((data&&data.error)||'unexpected response');
    _repliesData=data;
    renderReplies();
  }catch(e){ box.innerHTML='<div style="color:#b91c1c;font-size:.85rem">Could not load replies: '+creqEsc(e&&e.message?e.message:'error')+'</div>'; }
  finally{ if(btn&&btn.tagName==='BUTTON'){ btn.disabled=false; btn.textContent='↻ Refresh'; } }
}
function renderReplies(){
  const box=document.getElementById('repliesWaiting'), data=_repliesData;
  const cnt=document.getElementById('replies-count');
  if(!box||!data) return;
  if(cnt) cnt.textContent=data.replies.length?'('+data.replies.length+(data.replies.length>=10?'+':'')+')':'';
  updateCommsBadge();
  if(!data.replies.length){ box.innerHTML='<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:.75rem 1rem;font-size:.85rem;color:#166534">✅ Nothing waiting — every reply has been handled.</div>'; return; }
  const loc=data.location_id||'Recp0AhyMh8lrtKJ9kaj';
  const ago=ms=>{ if(!ms) return ''; const m=Math.round((Date.now()-ms)/60000); if(m<60) return m+'m ago'; const h=Math.round(m/60); if(h<24) return h+'h ago'; return Math.round(h/24)+'d ago'; };
  box.innerHTML=data.replies.map((x,i)=>
    '<div style="background:#fff;border:1px solid var(--border);border-left:4px solid #f59e0b;border-radius:10px;padding:.6rem 1rem;margin-bottom:.4rem">'
    +'<div style="display:flex;align-items:center;gap:.6rem;font-size:.85rem;flex-wrap:wrap">'
    +'<b style="color:var(--navy)">'+creqEsc(x.name)+'</b>'
    +'<span style="color:#6E6559;flex:1;min-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">“'+creqEsc(x.preview)+'”</span>'
    +'<span style="color:#A89C8B;font-size:.72rem;white-space:nowrap">'+ago(x.at)+'</span>'
    +'<button onclick="toggleThread('+i+')" style="font-size:.75rem;font-weight:600;color:#92400e;background:#fde68a;border:none;border-radius:6px;padding:.2rem .55rem;cursor:pointer;font-family:inherit">💬 View & reply</button>'
    +'<button onclick="dismissReply('+i+')" id="done-'+i+'" title="No reply needed — mark it read in GHL and clear it" style="font-size:.75rem;font-weight:600;color:#166534;background:#dcfce7;border:none;border-radius:6px;padding:.2rem .55rem;cursor:pointer;font-family:inherit">✓ Done</button>'
    +'<a href="https://app.gohighlevel.com/v2/location/'+loc+'/conversations/conversations/'+encodeURIComponent(x.id)+'" target="_blank" rel="noopener" style="font-size:.75rem;font-weight:600;color:#1e40af;white-space:nowrap;text-decoration:none;border:1px solid #93c5fd;border-radius:6px;padding:.15rem .5rem">GHL ↗</a>'
    +'</div>'
    +'<div id="thread-'+i+'" data-conv="'+creqEsc(x.id)+'" data-contact="'+creqEsc(x.contact_id||'')+'" data-name="'+creqEsc(x.name)+'" style="display:none;margin:.5rem 0 .3rem 1rem"></div>'
    +'</div>').join('');
}
async function toggleThread(i){
  const el=document.getElementById('thread-'+i); if(!el) return;
  if(el.style.display!=='none'){ el.style.display='none'; return; }
  el.style.display='block';
  el.innerHTML='<div style="font-size:.8rem;color:#A89C8B">Loading conversation…</div>';
  try{
    const r=await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/ghl-thread',{
      method:'POST',headers:{'x-hub-token':await trainHubTok(),'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
      body:JSON.stringify({conversation_id:el.dataset.conv})});
    const data=await r.json();
    if(!data||!Array.isArray(data.thread)) throw new Error(data&&data.error?data.error:'no thread');
    const fmt=iso=>{try{return new Date(iso).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}catch(e){return ''}};
    el.innerHTML=
      '<div style="max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:.35rem;padding:.5rem;background:#fff;border:1px solid #fcd34d;border-radius:8px">'
      +(data.thread.length>=25?'<div style="align-self:center;font-size:.68rem;color:#A89C8B">Showing the last 25 messages — open GHL for the full history</div>':'')
      +data.thread.map(m=>
        '<div style="align-self:'+(m.direction==='inbound'?'flex-start':'flex-end')+';max-width:85%;background:'+(m.direction==='inbound'?'#FAF9F6':'#0D365F')+';color:'+(m.direction==='inbound'?'#3A342C':'#fff')+';border-radius:10px;padding:.4rem .65rem;font-size:.8rem;white-space:pre-wrap">'+creqEsc(m.body)
        +'<div style="font-size:.62rem;opacity:.65;margin-top:.15rem">'+fmt(m.at)+'</div></div>').join('')
      +'</div>'
      +'<div style="display:flex;gap:.4rem;margin-top:.45rem">'
      +'<input id="reply-'+i+'" type="text" placeholder="Type a reply to '+creqEsc(el.dataset.name)+'…" style="flex:1;padding:.45rem .65rem;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:.82rem" onkeydown="if(event.key===\'Enter\')sendReply('+i+')">'
      +'<button onclick="sendReply('+i+')" style="background:var(--navy);color:#fff;border:none;border-radius:8px;padding:.45rem .9rem;font-family:inherit;font-size:.8rem;font-weight:600;cursor:pointer">Send</button>'
      +'</div>';
  }catch(e){ el.innerHTML='<div style="font-size:.8rem;color:#b91c1c">Could not load the conversation: '+creqEsc(e&&e.message?e.message:'error')+'</div>'; }
}
async function sendReply(i){
  const el=document.getElementById('thread-'+i), input=document.getElementById('reply-'+i);
  if(!el||!input||!input.value.trim()) return;
  const btn=el.querySelector('button'), msg=input.value.trim();
  if(btn){btn.textContent='Sending…';btn.disabled=true;}
  try{
    const r=await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/ghl-reply',{
      method:'POST',headers:{'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'x-hub-token':await (window.trainHubTok ? window.trainHubTok() : ''),'Content-Type':'application/json'},
      body:JSON.stringify({contact_id:el.dataset.contact,message:msg})});
    const data=await r.json();
    if(!data||data.error) throw new Error(data&&data.error?data.error:'send failed');
    input.value='';
    await toggleThread(i); await toggleThread(i);
    setTimeout(loadRepliesWaiting, 1200);
  }catch(e){ alert('Could not send: '+(e&&e.message?e.message:'error')); }
  finally{ if(btn){btn.textContent='Send';btn.disabled=false;} }
}
async function dismissReply(i){
  const el=document.getElementById('thread-'+i), btn=document.getElementById('done-'+i);
  if(!el) return;
  if(!confirm('Clear "'+(el.dataset.name||'this message')+'" without replying? It will be marked read in GHL.')) return;
  if(btn){btn.textContent='Clearing…';btn.disabled=true;}
  try{
    const r=await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/ghl-reply',{
      method:'POST',headers:{'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'x-hub-token':await (window.trainHubTok ? window.trainHubTok() : ''),'Content-Type':'application/json'},
      body:JSON.stringify({action:'dismiss',conversation_id:el.dataset.conv})});
    const data=await r.json();
    if(!data||data.error) throw new Error(data&&data.error?data.error:'could not clear');
    await loadRepliesWaiting();
  }catch(e){ alert('Could not clear it: '+(e&&e.message?e.message:'error')); if(btn){btn.textContent='✓ Done';btn.disabled=false;} }
}

// ── MEETINGS (shared app_data key 'meetings' — both hubs read/write it) ──
let MEETINGS=[];
const MTG_ROLE='staffing'; // this hub's seat at the table
const MTG_WHO={samantha:'Samantha',care:'the Care Coordinators',staffing:'the Staffing Coordinator',team:'the whole team'};
function mtgJoinUrl(m){ return 'https://meet.jit.si/'+encodeURIComponent(m.room); }
async function mtgPersist(m){
  try{ const { error } = await sb.rpc('upsert_app_data_item',{ target_key:'meetings', item:m }); if(error) throw error; }
  catch(e){ alert('Could not save — check your connection and try again.'); throw e; }
}
async function requestMeeting(role){
  const topic=document.getElementById('mtg-topic').value.trim();
  if(!topic){ alert('Say what the meeting is about first.'); return; }
  let by=''; try{ const {data:{session}}=await sb.auth.getSession(); by=(session&&session.user&&session.user.email)||''; }catch(e){}
  const m={ id:'mtg'+Date.now()+Math.random().toString(36).slice(2,6),
    room:'CaringCompanions-'+Math.random().toString(36).slice(2,10),
    with:document.getElementById('mtg-with').value, topic,
    when_pref:document.getElementById('mtg-when').value.trim(),
    requested_by_name:(by.split('@')[0]||'Staffing')+' (Staffing)', requested_by_email:by, requested_by_role:role,
    status:'requested', scheduled_for:'', accepted_by:'', declined_reason:'', created_at:new Date().toISOString() };
  MEETINGS.push(m);
  await mtgPersist(m);
  document.getElementById('mtg-topic').value=''; document.getElementById('mtg-when').value='';
  renderMeetings();
}
function mtgIncoming(m){ return m.status==='requested' && m.requested_by_role!==MTG_ROLE && (m.with===MTG_ROLE||m.with==='team'); }
function mtgInvolvesMe(m){ return m.requested_by_role===MTG_ROLE || m.with===MTG_ROLE || m.with==='team'; }
async function acceptMeeting(id){
  const m=MEETINGS.find(x=>x.id===id); if(!m) return;
  const when=prompt('When is the meeting? (both hubs will show this)', m.when_pref||''); if(when===null) return;
  let by=''; try{ const {data:{session}}=await sb.auth.getSession(); by=(session&&session.user&&session.user.email)||''; }catch(e){}
  m.status='accepted'; m.scheduled_for=when.trim()||m.when_pref||'time TBD'; m.accepted_by=by.split('@')[0]||'staffing';
  await mtgPersist(m); renderMeetings();
}
async function declineMeeting(id){
  const m=MEETINGS.find(x=>x.id===id); if(!m) return;
  const why=prompt('Suggest another time or say why it doesn\'t work (they\'ll see this):',''); if(why===null) return;
  m.status='declined'; m.declined_reason=why.trim();
  await mtgPersist(m); renderMeetings();
}
async function doneMeeting(id){
  const m=MEETINGS.find(x=>x.id===id); if(!m) return;
  m.status='done'; await mtgPersist(m); renderMeetings();
}
function renderMeetings(){
  const box=document.getElementById('meetings-list'); if(!box) return;
  const inc=MEETINGS.filter(mtgIncoming);
  const upcoming=MEETINGS.filter(m=>m.status==='accepted'&&mtgInvolvesMe(m));
  const mine=MEETINGS.filter(m=>m.status==='requested'&&m.requested_by_role===MTG_ROLE);
  const recent=MEETINGS.filter(m=>(m.status==='declined'||m.status==='done')&&mtgInvolvesMe(m)).slice(-4).reverse();
  const card=(m,inner)=>'<div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:.65rem 1rem;margin-bottom:.4rem;font-size:.85rem">'
    +'<b>'+creqEsc(m.topic)+'</b><div style="font-size:.72rem;color:#6E6559;margin:.15rem 0 .35rem">'
    +creqEsc(m.requested_by_name)+' → '+creqEsc(MTG_WHO[m.with]||m.with)
    +(m.scheduled_for?' · 🗓 <b>'+creqEsc(m.scheduled_for)+'</b>':m.when_pref?' · suggested: '+creqEsc(m.when_pref):'')
    +'</div>'+inner+'</div>';
  box.innerHTML=
    (inc.length?'<div style="font-weight:700;font-size:.85rem;margin:.2rem 0">📥 Meeting requests for you</div>'+inc.map(m=>card(m,
      '<button class="fb" style="font-size:.75rem" onclick="acceptMeeting(\''+m.id+'\')">✓ Accept & set time</button> '
      +'<button style="font-size:.75rem;background:#FAF9F6;border:1px solid var(--border);border-radius:7px;padding:.3rem .7rem;cursor:pointer;font-family:inherit" onclick="declineMeeting(\''+m.id+'\')">Suggest another time</button>')).join(''):'')
    +(upcoming.length?'<div style="font-weight:700;font-size:.85rem;margin:.8rem 0 .2rem">🎥 Upcoming — join when it\'s time</div>'+upcoming.map(m=>card(m,
      '<a href="'+mtgJoinUrl(m)+'" target="_blank" rel="noopener" style="display:inline-block;background:#16a34a;color:#fff;border-radius:7px;padding:.35rem .9rem;font-size:.78rem;font-weight:700;text-decoration:none">🎥 Join Video</a> '
      +'<button style="font-size:.75rem;background:#FAF9F6;border:1px solid var(--border);border-radius:7px;padding:.3rem .7rem;cursor:pointer;font-family:inherit" onclick="doneMeeting(\''+m.id+'\')">Mark done</button>'
      +'<div style="font-size:.68rem;color:#A89C8B;margin-top:.3rem">Opens in your browser — allow camera &amp; mic. The 🖥 button inside shares your screen.</div>')).join(''):'')
    +(mine.length?'<div style="font-weight:700;font-size:.85rem;margin:.8rem 0 .2rem">⏳ Waiting for an answer</div>'+mine.map(m=>card(m,'<span style="font-size:.72rem;color:#A89C8B">requested '+new Date(m.created_at).toLocaleDateString()+'</span>')).join(''):'')
    +(recent.length?'<div style="font-weight:700;font-size:.85rem;margin:.8rem 0 .2rem;color:#6E6559">Recent</div>'+recent.map(m=>card(m,
      m.status==='declined'?'<span style="font-size:.75rem;color:#b45309">↩ '+creqEsc(m.declined_reason||'didn\'t work — try another time')+'</span>':'<span style="font-size:.75rem;color:#166534">✓ held</span>')).join(''):'')
    ||'<div style="color:#A89C8B;font-size:.85rem">No meetings yet — request one above.</div>';
  updateCommsBadge();
}
function updateCommsBadge(){
  const b=document.getElementById('commsBadge'); if(!b) return;
  const n=((_repliesData&&_repliesData.replies)||[]).length;
  b.style.display=n?'inline':'none'; b.textContent=n;
  const m=document.getElementById('meetingsBadge');
  if(m){ const k=MEETINGS.filter(mtgIncoming).length; m.style.display=k?'inline':'none'; m.textContent=k; }
  updateGroupBadges();
}

// ── OPEN SHIFTS BOARD (live unassigned visits via axiscare-open-shifts fn) ──
let OPEN_SHIFTS=null; // null = not loaded yet
async function loadOpenShifts(btn){
  const box=document.getElementById('open-shifts-board'); if(!box) return;
  if(btn){ btn.disabled=true; btn.textContent='↻ Loading…'; }
  try{
    const r=await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/axiscare-open-shifts',{
      method:'POST',headers:{'x-hub-token':await trainHubTok(),'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
      body:JSON.stringify({days:14})});
    const data=await r.json();
    if(data.error){
      OPEN_SHIFTS=null;
      box.innerHTML='<div style="color:#b91c1c;font-size:.85rem">'+creqEsc(String(data.error).includes('403')
        ?'AxisCare said no (403) — the API token needs "Visits" read permission. In AxisCare, edit the API token and check Visits, then refresh.'
        :'Could not load open shifts: '+data.error)+'</div>';
      updateSchedBadge(); return;
    }
    OPEN_SHIFTS=data.open||[];
    renderOpenShifts();
  }catch(e){ box.innerHTML='<div style="color:#b91c1c;font-size:.85rem">Could not reach the open-shifts service — check your connection.</div>'; }
  finally{ if(btn){ btn.disabled=false; btn.textContent='↻ Refresh'; } }
}
function renderOpenShifts(){
  const box=document.getElementById('open-shifts-board'); if(!box) return;
  const cnt=document.getElementById('open-shifts-count');
  if(!OPEN_SHIFTS||!OPEN_SHIFTS.length){
    if(cnt) cnt.textContent='';
    box.innerHTML='<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:.75rem 1rem;font-size:.85rem;color:#166534">✅ No open shifts in the next 14 days — everything is covered.</div>';
    updateSchedBadge(); return;
  }
  if(cnt) cnt.textContent='('+OPEN_SHIFTS.length+')';
  const now=Date.now();
  const fmt=d=>new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  box.innerHTML=OPEN_SHIFTS.map(s=>{
    const hrs=(new Date(s.date+'T'+(s.start24||'23:59')).getTime()-now)/3600000;
    const color=hrs<=48?'#DC2626':hrs<=168?'#B45309':'#6E6559';
    const tag=hrs<=48?'⚠ within 48 hours':hrs<=168?'this week':'';
    return '<div style="background:#fff;border:1px solid var(--border);border-left:4px solid '+color+';border-radius:10px;padding:.6rem 1rem;margin-bottom:.4rem;display:flex;align-items:center;gap:.8rem;flex-wrap:wrap">'
      +'<b style="min-width:130px">'+creqEsc(s.client)+'</b>'
      +'<span style="font-size:.85rem">'+fmt(s.date)+(s.start?' · '+creqEsc(s.start)+(s.end?'–'+creqEsc(s.end):''):'')+'</span>'
      +(tag?'<span style="font-size:.72rem;font-weight:700;color:'+color+'">'+tag+'</span>':'')
      +'<span style="margin-left:auto;font-size:.72rem;color:#A89C8B">fill in AxisCare ↗</span>'
      +'</div>';
  }).join('');
  updateSchedBadge();
}
function updateSchedBadge(){
  const b=document.getElementById('schedBadge'); if(!b) return;
  const n=(OPEN_SHIFTS||[]).length;
  b.style.display=n?'inline':'none'; b.textContent=n;  updateGroupBadges();
}

// ── DO-NOT-RETURN LOG (permanent, app_data key 'dnr_log') ──
let DNRLOG=[];
function renderDnrLog(){
  const box=document.getElementById('dnr-log-list'); if(!box) return;
  if(!DNRLOG.length){ box.innerHTML='<div style="color:#A89C8B;font-size:.85rem">Nothing on the log.</div>'; return; }
  box.innerHTML=DNRLOG.slice().sort((a,b)=>String(b.logged_at).localeCompare(String(a.logged_at))).map(e=>
    '<div style="background:#fff;border:1px solid #fecaca;border-left:4px solid #DC2626;border-radius:10px;padding:.6rem 1rem;margin-bottom:.4rem;font-size:.85rem">'
    +'<b>'+creqEsc(e.caregiver||'(caregiver)')+'</b> must not return to <b>'+creqEsc(e.client||'(client)')+'</b>'
    +(e.reason?' — '+creqEsc(e.reason):'')
    +'<div style="font-size:.72rem;color:#6E6559;margin-top:.2rem">requested by '+creqEsc(e.requested_by||'—')
    +' · logged '+new Date(e.logged_at).toLocaleDateString()+' by '+creqEsc(e.logged_by||'—')
    +(e.axiscare_entered?' · ✅ exclusion entered in AxisCare':' · ⚠ <a href="#" onclick="dnrMarkAxis(\''+e.id+'\');return false;">mark exclusion entered in AxisCare</a>')
    +'</div></div>').join('');
}
async function dnrMarkAxis(id){
  const e=DNRLOG.find(x=>x.id===id); if(!e) return;
  e.axiscare_entered=true;
  try{ await sb.rpc('upsert_app_data_item',{ target_key:'dnr_log', item:e }); }catch(err){ alert('Could not save — try again.'); e.axiscare_entered=false; }
  renderDnrLog();
}

// ── CLIENT CHECK-INS (permanent, app_data key 'client_checkins') ──
// After a caregiver has been in a client's home — long-term match or one-shift
// fill-in — the client gets a quick satisfaction call. Outcomes: ⭐ favorite
// (preferred caregiver in AxisCare), 💬 coaching (small preference passed to
// the caregiver + noted on their AxisCare record), 🚫 exclusion (Do-Not-Return
// log + AxisCare exclusion).
let CHECKINS=[]; let CI_PAIRS=null;
const ciKey=(c,g)=>String(c||'').trim().toLowerCase()+'|'+String(g||'').trim().toLowerCase();
function ciLastFor(client,caregiver){
  const k=ciKey(client,caregiver); let best=null;
  (CHECKINS||[]).forEach(e=>{ if(ciKey(e.client,e.caregiver)===k && (!best||String(e.at)>String(best.at))) best=e; });
  return best;
}
// Two calls per match, then done: (1) after the FIRST shift together,
// (2) a good-fit follow-up about a month later. Only exception: a call that
// turned up concerns gets re-checked after a week until a later call is clear.
function ciPairInfo(p){
  const daysAgo=iso=>(Date.now()-new Date(iso).getTime())/86400000;
  const newPair=daysAgo(p.first_date+'T12:00:00')<=14;
  const k=ciKey(p.client,p.caregiver);
  const mine=(CHECKINS||[]).filter(e=>ciKey(e.client,e.caregiver)===k).sort((a,b)=>String(a.at).localeCompare(String(b.at)));
  const last=mine.length?mine[mine.length-1]:null;
  let due=null; // 'first' | 'concern' | 'fit' | null
  if(!last) due='first';
  else if(last.rating==='concern'&&daysAgo(last.at)>=7) due='concern';
  else if(mine.length===1&&!last.skip&&daysAgo(last.at)>=30&&String(p.last_date)>=String(last.at).slice(0,10)) due='fit';
  return {newPair,last,count:mine.length,due,dueNow:due==='concern'||(due==='first'&&newPair)};
}
async function loadCheckinPairs(btn){
  const box=document.getElementById('ci-pairs-board');
  if(btn){ btn.disabled=true; btn.textContent='↻ Loading…'; }
  try{
    const r=await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/axiscare-open-shifts',{
      method:'POST',headers:{'x-hub-token':await trainHubTok(),'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
      body:JSON.stringify({mode:'pairs', days:60})});
    const data=await r.json();
    if(data.error){ CI_PAIRS=null; if(box) box.innerHTML='<div style="color:#b91c1c;font-size:.85rem">Could not load matches: '+creqEsc(data.error)+'</div>'; updateCheckinsBadge(); return; }
    CI_PAIRS=data.pairs||[];
    renderCheckinPairs(); updateCheckinsBadge();
    if(activeTab==='home') renderStaffHome();
  }catch(e){ if(box) box.innerHTML='<div style="color:#b91c1c;font-size:.85rem">Could not reach the visits service — check your connection.</div>'; }
  finally{ if(btn){ btn.disabled=false; btn.textContent='↻ Refresh'; } }
}
function renderCheckinPairs(){
  const box=document.getElementById('ci-pairs-board'); if(!box||CI_PAIRS===null) return;
  if(!CI_PAIRS.length){ box.innerHTML='<div style="color:#A89C8B;font-size:.85rem">No scheduled visits found in the last 60 days.</div>'; return; }
  const fmt=d=>new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  const rank=i=>i.due==='concern'?0:i.due==='first'&&i.newPair?1:i.due==='first'?2:i.due==='fit'?3:4;
  const rows=CI_PAIRS.map(p=>({p,i:ciPairInfo(p)}))
    .sort((a,b)=>rank(a.i)-rank(b.i)||String(b.p.last_date).localeCompare(String(a.p.last_date)));
  const RATE={love:'⭐',good:'👍',concern:'🚩'};
  box.innerHTML=rows.map(({p,i})=>{
    const border=i.due==='concern'?'#DC2626':i.due==='first'?(i.newPair?'#DC2626':'#B45309'):i.due==='fit'?'#B45309':'#16a34a';
    const tag=i.due==='concern'?'<span style="font-size:.7rem;font-weight:800;color:#DC2626">🚩 concerns on '+fmt(String(i.last.at).slice(0,10))+' — check it got fixed</span>'
      :i.due==='first'&&i.newPair?'<span style="font-size:.7rem;font-weight:800;color:#DC2626">🆕 first shift scheduled '+fmt(p.first_date)+' — call them</span>'
      :i.due==='first'?'<span style="font-size:.7rem;font-weight:700;color:#B45309">first check-in still to do</span>'
      :i.due==='fit'?'<span style="font-size:.7rem;font-weight:700;color:#B45309">good-fit follow-up — first call was '+fmt(String(i.last.at).slice(0,10))+'</span>'
      :i.count>=2?'<span style="font-size:.7rem;font-weight:700;color:#166534">✓ good fit confirmed — no more calls needed</span>'
      :i.last&&i.last.skip?'<span style="font-size:.7rem;font-weight:700;color:#166534">✓ known good match</span>'
      :i.last?'<span style="font-size:.7rem;font-weight:700;color:#166534">✓ checked in '+fmt(String(i.last.at).slice(0,10))+' '+(RATE[i.last.rating]||'')+'</span>':'';
    const skip=i.due==='first'?'<a href="#" style="font-size:.68rem;color:#A89C8B" onclick="ciSkip('+creqAttr(p.client)+','+creqAttr(p.caregiver)+');return false;" title="No call needed — logs it as an established match">known good match ✓</a>':'';
    return '<div style="background:#fff;border:1px solid var(--border);border-left:4px solid '+border+';border-radius:10px;padding:.55rem 1rem;margin-bottom:.4rem;display:flex;align-items:center;gap:.7rem;flex-wrap:wrap">'
      +'<div style="flex:1;min-width:220px"><b style="font-size:.85rem">'+creqEsc(p.client)+'</b> <span style="color:#A89C8B">×</span> <b style="font-size:.85rem">'+creqEsc(p.caregiver)+'</b>'
      +'<div style="font-size:.7rem;color:var(--gray)">'+p.visits+' shift'+(p.visits===1?'':'s')+' · '+p.hours+' hrs · last '+fmt(p.last_date)+'</div></div>'
      +tag+skip
      +(i.due?'<button class="fb" style="font-size:.72rem" onclick="ciPrefill('+creqAttr(p.client)+','+creqAttr(p.caregiver)+')">📞 Log check-in</button>':'')
      +'</div>';
  }).join('');
}
function creqAttr(s){ return "'"+String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;').replace(/</g,'&lt;')+"'"; }
function ciPrefill(client,caregiver){
  const c=document.getElementById('ci-client'), g=document.getElementById('ci-caregiver');
  if(c) c.value=client; if(g) g.value=caregiver;
  const f=document.getElementById('ci-form'); if(f) f.scrollIntoView({behavior:'smooth',block:'start'});
  const s=document.getElementById('ci-spoke'); if(s) setTimeout(()=>s.focus(),350);
}
async function saveCheckin(){
  const val=id=>(document.getElementById(id)?document.getElementById(id).value.trim():'');
  const client=val('ci-client'), caregiver=val('ci-caregiver'), spoke=val('ci-spoke');
  const rating=val('ci-rating'), notes=val('ci-notes'), coaching=val('ci-coaching');
  const fav=document.getElementById('ci-fav').checked, excl=document.getElementById('ci-excl').checked;
  if(!client||!caregiver){ alert('Client and caregiver names are both needed.'); return; }
  if(!rating){ alert('Pick how it\'s going — ⭐ 👍 or 🚩.'); return; }
  if(excl&&!notes){ alert('For a do-not-return, write what the client said in "What they said" — it goes on the permanent log.'); return; }
  let by=''; try{ const {data:{session}}=await sb.auth.getSession(); by=(session&&session.user&&session.user.email)||''; }catch(e){}
  const who=by.split('@')[0]||'staffing';
  const e={ id:'ci'+Date.now()+Math.random().toString(36).slice(2,6), client, caregiver, spoke_with:spoke, rating, notes, coaching,
    want_favorite:fav, want_exclusion:excl, at:new Date().toISOString(), by:who,
    fav_ax_done:false, coach_ax_noted:false, coach_ax_error:'' };
  CHECKINS.push(e);
  try{ await sb.rpc('upsert_app_data_item',{ target_key:'client_checkins', item:e }); }
  catch(err){ alert('Could not save — check your connection and try again.'); CHECKINS.pop(); return; }
  if(excl){
    const entry={ id:'dnr'+Date.now(), client, caregiver, reason:notes,
      requested_by:(spoke||client)+' (check-in call)', requested_at:e.at, logged_at:e.at, logged_by:who, axiscare_entered:false, task_id:e.id };
    DNRLOG.push(entry);
    try{ await sb.rpc('upsert_app_data_item',{ target_key:'dnr_log', item:entry }); }catch(err){ DNRLOG.pop(); }
    try{ renderDnrLog(); }catch(err){}
    alert('Added to the permanent Do-Not-Return log ✓\n\nNow enter it in AxisCare too: open '+client+' → Caregiver Exclusions → add '+caregiver+' — that\'s what physically blocks the schedule from pairing them.');
  }
  if(fav){
    alert('⭐ Nice find. Make it stick in AxisCare: open '+client+'\'s profile and mark '+caregiver+' as a preferred caregiver so scheduling pairs them first. Then click "mark done" on the entry below.');
  }
  ['ci-client','ci-caregiver','ci-spoke','ci-rating','ci-notes','ci-coaching'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('ci-fav').checked=false; document.getElementById('ci-excl').checked=false;
  renderCheckins(); renderCheckinPairs(); updateCheckinsBadge();
}
function renderCheckins(){
  const box=document.getElementById('ci-history'); if(!box) return;
  if(!(CHECKINS||[]).length){ box.innerHTML='<div style="color:#A89C8B;font-size:.85rem">No check-ins logged yet — the first one appears here.</div>'; return; }
  const RATE={love:['⭐','#16a34a','They love them'],good:['👍','#2F6FB0','Going fine'],concern:['🚩','#DC2626','Some concerns']};
  box.innerHTML=CHECKINS.slice().sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,40).map(e=>{
    const rm=RATE[e.rating]||RATE.good;
    let extra='';
    if(e.coaching){
      extra+='<div style="font-size:.78rem;background:#F0F9FF;border:1px solid #BAE6FD;border-radius:6px;padding:.35rem .6rem;margin-top:.35rem">💬 Pass along: “'+creqEsc(e.coaching)+'” — '
        +(e.coach_ax_noted?'✅ on the caregiver\'s AxisCare record'
          :'<a href="#" onclick="ciPushCoach(\''+e.id+'\');return false;">put it on the caregiver\'s AxisCare record</a>'
           +(e.coach_ax_error?' <span style="color:#b91c1c">(last try failed: '+creqEsc(e.coach_ax_error)+')</span>':''))
        +'</div>';
    }
    if(e.want_favorite){
      extra+='<div style="font-size:.78rem;margin-top:.35rem">⭐ Favorite — '
        +(e.fav_ax_done?'✅ marked preferred in AxisCare':'⚠ <a href="#" onclick="ciMarkFav(\''+e.id+'\');return false;">mark done once set as preferred caregiver in AxisCare</a>')+'</div>';
    }
    if(e.want_exclusion) extra+='<div style="font-size:.78rem;margin-top:.35rem;color:#b91c1c">🚫 On the Do-Not-Return log</div>';
    return '<div style="background:#fff;border:1px solid var(--border);border-left:4px solid '+rm[1]+';border-radius:10px;padding:.65rem 1rem;margin-bottom:.45rem;font-size:.85rem">'
      +'<b>'+creqEsc(e.client)+'</b> <span style="color:#A89C8B">×</span> <b>'+creqEsc(e.caregiver)+'</b>'
      +' — '+rm[0]+' '+rm[2]
      +'<div style="font-size:.72rem;color:#6E6559;margin-top:.2rem">'+new Date(e.at).toLocaleDateString('en-US',{month:'short',day:'numeric'})
      +(e.skip?' · marked established — no call needed':(e.spoke_with?' · spoke with '+creqEsc(e.spoke_with):''))+' · by '+creqEsc(e.by||'')+'</div>'
      +(e.notes?'<div style="font-size:.8rem;color:#3A342C;margin-top:.3rem">“'+creqEsc(e.notes)+'”</div>':'')
      +extra+'</div>';
  }).join('');
}
async function ciMarkFav(id){
  const e=(CHECKINS||[]).find(x=>x.id===id); if(!e) return;
  e.fav_ax_done=true;
  try{ await sb.rpc('upsert_app_data_item',{ target_key:'client_checkins', item:e }); }catch(err){ alert('Could not save — try again.'); e.fav_ax_done=false; }
  renderCheckins();
}
async function ciPushCoach(id){
  const e=(CHECKINS||[]).find(x=>x.id===id); if(!e) return;
  const noteText='CLIENT PREFERENCE — from a check-in call ('+String(e.at).slice(0,10)+')\n'
    +'Client: '+e.client+(e.spoke_with?' (spoke with '+e.spoke_with+')':'')+'\n'
    +'“'+e.coaching+'”\n'
    +'Passed along as friendly coaching so the match stays strong. — '+(e.by||'staffing');
  const d=await axCaregiverNote(e.caregiver, noteText, e.coach_ax_caregiver_id);
  if(d.outcome==='cancelled') return;
  if(d.outcome==='sent'){ e.coach_ax_noted=true; e.coach_ax_error=''; e.coach_ax_caregiver_id=d.picked.id; }
  else { e.coach_ax_noted=false; e.coach_ax_error=String(d.detail||d.error||'failed'); }
  try{ await sb.rpc('upsert_app_data_item',{ target_key:'client_checkins', item:e }); }catch(err){}
  renderCheckins();
  if(e.coach_ax_noted) alert('✅ Noted on '+d.picked.name+'\'s AxisCare record (#'+d.picked.id+').\n\nRemember to also tell them directly — a quick friendly text or call lands better than a note they might not see.');
  else alert('Could not attach the AxisCare note: '+e.coach_ax_error);
}
async function ciSkip(client,caregiver){
  if(!confirm('Mark '+client+' × '+caregiver+' as an established match that\'s already known to be good?\n\nNo call needed — it logs a ✓ and this pair won\'t come up for calls again.')) return;
  let by=''; try{ const {data:{session}}=await sb.auth.getSession(); by=(session&&session.user&&session.user.email)||''; }catch(e){}
  const e={ id:'ci'+Date.now()+Math.random().toString(36).slice(2,6), client, caregiver, spoke_with:'', rating:'good',
    notes:'Marked as an established match — no call needed.', coaching:'', want_favorite:false, want_exclusion:false,
    at:new Date().toISOString(), by:by.split('@')[0]||'staffing', skip:true, fav_ax_done:false, coach_ax_noted:false, coach_ax_error:'' };
  CHECKINS.push(e);
  try{ await sb.rpc('upsert_app_data_item',{ target_key:'client_checkins', item:e }); }
  catch(err){ alert('Could not save — try again.'); CHECKINS.pop(); return; }
  renderCheckins(); renderCheckinPairs(); updateCheckinsBadge();
}
function updateCheckinsBadge(){
  const b=document.getElementById('checkinsBadge'); if(!b) return;
  const n=(CI_PAIRS||[]).filter(p=>ciPairInfo(p).dueNow).length;
  b.style.display=n?'inline':'none'; b.textContent=n;  updateGroupBadges();
}

// ── COORDINATOR REQUESTS (shared app_data key 'staffing_tasks', written by
//    the Care Coordinator Hub; saved atomically via upsert_app_data_item so
//    both hubs can write at the same moment without clobbering each other) ──
let STASKS=[]; let HANDOFFS=[];
const creqEsc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function creqPersist(item){
  try{
    const { error } = await sb.rpc('upsert_app_data_item', { target_key:'staffing_tasks', item });
    if(error) throw error;
  }catch(e){ alert('Could not save — check your connection and try again.'); throw e; }
}
function updateCoordreqBadge(){
  const b=document.getElementById('coordreqBadge'); if(!b) return;
  const n=STASKS.filter(t=>t.direction==='to_staffing'&&t.status==='open').length;
  b.style.display=n?'inline':'none'; b.textContent=n;  updateGroupBadges();
}
function renderCoordReqs(){
  const wrap=document.getElementById('coordreq-list'); if(!wrap) return;
  const inbox=STASKS.filter(t=>t.direction==='to_staffing');
  const outbox=STASKS.filter(t=>t.direction==='to_coordinators'||t.direction==='to_owners');
  const urgRank=u=>u==='Today'?0:u==='This week'?1:2;
  const open=inbox.filter(t=>t.status==='open').sort((a,b)=>urgRank(a.urgency)-urgRank(b.urgency)||String(a.created_at).localeCompare(String(b.created_at)));
  const recentDone=inbox.filter(t=>t.status==='done').sort((a,b)=>String(b.done_at).localeCompare(String(a.done_at))).slice(0,10);
  const KIND_META={ dnr:['🚫','#DC2626','Do not send back'], hours:['➕','#B45309','Add / change hours'], coverage:['🕐','#DC2626','Coverage gap'], schedule:['📅','#2F6FB0','Schedule change'], attendance:['⏰','#B45309','Attendance issue — log it on the ⏰ Attendance tab'], todo:['☑️','#DC2626',''], update:['ℹ️','#2F6FB0',''] };
  const row=(t,mine)=>{
    const urgColor=t.urgency==='Today'?'#DC2626':t.urgency==='This week'?'#B45309':'#6E6559';
    const km=KIND_META[t.kind]||KIND_META.update;
    return '<div style="background:#fff;border:1px solid var(--border);border-left:4px solid '+(t.status==='done'?'#16a34a':km[1])+';border-radius:10px;padding:.75rem 1rem">'
      +'<div style="display:flex;align-items:flex-start;gap:.6rem;flex-wrap:wrap">'
      +'<span style="font-size:1.05rem">'+(t.status==='done'?'✅':km[0])+'</span>'
      +'<div style="flex:1;min-width:200px">'
      +(km[2]?'<span style="font-size:.68rem;font-weight:800;letter-spacing:.03em;color:'+km[1]+';text-transform:uppercase">'+km[2]+'</span><br>':'')
      +(t.about?'<b>'+creqEsc(t.about)+'</b>'+(t.caregiver?' / caregiver: <b>'+creqEsc(t.caregiver)+'</b>':'')+' — ':'')+creqEsc(t.message)
      +(t.kind==='hours'&&t.status!=='done'?'<div style="font-size:.72rem;background:#FFFBEB;border:1px solid #FDE68A;border-radius:6px;padding:.3rem .55rem;margin-top:.3rem;color:#92400E">💡 Medicaid client? Check authorized units before promising the hours — if this exceeds the authorization, send it back to the evening coordinator to request a DSDS reassessment.</div>':'')
      +'<div style="font-size:.75rem;color:#6E6559;margin-top:.25rem">'
      +(mine?(t.direction==='to_owners'?'to the Owners':'to the care coordinators'):'from '+creqEsc(t.from_name||'a care coordinator'))
      +' · '+new Date(t.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})
      +' · <span style="color:'+urgColor+';font-weight:600">'+creqEsc(t.urgency||'')+'</span>'
      +(t.status==='done'?' · done by '+creqEsc(t.done_by||'')+(t.reply?' · 💬 '+creqEsc(t.reply):''):'')
      +'</div></div>'
      +(t.status==='open'&&!mine
        ?'<span style="display:flex;gap:.4rem"><button class="fb" style="font-size:.75rem" onclick="creqDone(\''+t.id+'\',true)">Done ✓ + reply</button>'
        +'<button class="fb" style="font-size:.75rem" onclick="creqDone(\''+t.id+'\',false)">Done ✓</button></span>'
        :'')
      +'</div></div>';
  };
  wrap.innerHTML =
    (open.length
      ? '<div style="font-weight:700;font-size:.85rem;margin:.2rem 0">📥 Needs your attention ('+open.length+')</div>'+open.map(t=>row(t,false)).join('')
      : '<div style="color:#A89C8B;font-size:.85rem;padding:.4rem 0">📥 Nothing waiting from the coordinators. 🎉</div>')
    +(recentDone.length
      ? '<div style="font-weight:700;font-size:.85rem;margin:.8rem 0 .2rem;color:#6E6559">Recently completed</div>'+recentDone.map(t=>row(t,false)).join('')
      : '');
  updateCoordreqBadge();
}
async function creqDone(id, withReply){
  const t=STASKS.find(x=>x.id===id); if(!t) return;
  let reply='';
  if(withReply){ reply=prompt('Reply to the coordinator (they see it in their hub):','')||''; }
  let by=''; try{ const {data:{session}}=await sb.auth.getSession(); by=(session&&session.user&&session.user.email)||''; }catch(e){}
  const who=by.split('@')[0]||'staffing';
  // Do-not-return requests go on the permanent log the moment they're done.
  if(t.kind==='dnr'){
    const caregiver=t.caregiver||prompt('Which caregiver must not return? (goes on the permanent log)','')||'';
    if(!caregiver.trim()){ alert('The Do-Not-Return log needs the caregiver\'s name — nothing was marked done.'); return; }
    const entry={ id:'dnr'+Date.now(), client:t.about||'', caregiver:caregiver.trim(), reason:t.message||'',
      requested_by:t.from_name||'', requested_at:t.created_at, logged_at:new Date().toISOString(), logged_by:who, axiscare_entered:false, task_id:t.id };
    DNRLOG.push(entry);
    try{ await sb.rpc('upsert_app_data_item',{ target_key:'dnr_log', item:entry }); }catch(e){ alert('Could not save the log entry — try again.'); DNRLOG.pop(); return; }
    renderDnrLog();
    alert('Added to the Do-Not-Return log ✓\n\nNow enter it in AxisCare too: open the client → Caregiver Exclusions → add '+caregiver.trim()+' — that\'s what physically blocks the schedule from pairing them.');
  }
  t.status='done'; t.done_at=new Date().toISOString(); t.done_by=who; if(reply.trim()) t.reply=reply.trim();
  await creqPersist(t);
  renderCoordReqs();
}
function renderSendMsg(){
  const box=document.getElementById('sendmsg-list'); if(!box) return;
  const sent=STASKS.filter(x=>x.direction==='to_coordinators'||x.direction==='to_owners')
    .sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,50);
  box.innerHTML = sent.length ? sent.map(x=>
    '<div style="background:#fff;border:1px solid var(--border);border-left:4px solid '+(x.status==='done'?'#16a34a':'#2F6FB0')+';border-radius:10px;padding:.7rem 1rem;font-size:.92rem">'
    +'<div>'+(x.about?'<b>'+creqEsc(x.about)+'</b> — ':'')+creqEsc(x.message||'')+'</div>'
    +'<div style="font-size:.72rem;color:#6E6559;margin-top:.2rem">'
    +(x.direction==='to_owners'?'to the Owners':'to the care coordinators')
    +' · '+new Date(x.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})
    +' · '+creqEsc(x.urgency||'')
    +(x.status==='done'?' · ✅ done by '+creqEsc(x.done_by||'')+(x.reply?' · 💬 “'+creqEsc(x.reply)+'”':''):' · ⏳ open')
    +'</div></div>').join('')
    : '<div style="color:#A89C8B;font-size:.85rem">Nothing sent yet — the first message you send appears here, permanently.</div>';
}
async function sendCoordReq(){
  const message=document.getElementById('creq-message').value.trim();
  if(!message){ alert('Write the message first.'); return; }
  let by=''; try{ const {data:{session}}=await sb.auth.getSession(); by=(session&&session.user&&session.user.email)||''; }catch(e){}
  const t={ id:'st'+Date.now()+Math.random().toString(36).slice(2,7), direction:document.getElementById('creq-to').value,
    kind:document.getElementById('creq-kind').value, urgency:document.getElementById('creq-urgency').value,
    about:document.getElementById('creq-about').value.trim(), lead_id:null, message,
    created_at:new Date().toISOString(), from_name:(by.split('@')[0]||'Staffing')+' (Staffing)', from_email:by,
    status:'open', done_at:null, done_by:null, reply:'' };
  STASKS.push(t);
  await creqPersist(t);
  document.getElementById('creq-message').value=''; document.getElementById('creq-about').value='';
  renderSendMsg();
}

// ── END-OF-DAY REPORTS (files in shared storage bucket lead-docs/eod/, metadata in app_data) ──
async function uploadEod(input){
  const file = input.files && input.files[0]; input.value='';
  if(!file) return;
  if(file.size > 25*1024*1024){ alert('That file is over 25 MB — please shrink it.'); return; }
  const day = document.getElementById('eod-date').value || new Date().toISOString().slice(0,10);
  const note = document.getElementById('eod-note').value.trim();
  const st = document.getElementById('eod-status');
  st.textContent = 'Uploading…';
  const path = 'eod/'+day+'-'+Date.now()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  const { error } = await sb.storage.from('lead-docs').upload(path, file);
  if(error){ st.textContent=''; alert('Upload failed: '+error.message+(String(error.message).match(/bucket/i)?' — the lead-docs storage SQL may not be run yet (ask Claude/Samantha).':'')); return; }
  let by=''; try{ const {data:{session}}=await sb.auth.getSession(); by=(session&&session.user&&session.user.email)||''; }catch(e){}
  eodReports.unshift({ id: Date.now(), report_date: day, role: (document.getElementById('eod-role')||{}).value||'', name: file.name, path, size: file.size, note, by, at: new Date().toISOString() });
  await syncToSupabase('eod_reports', eodReports);
  document.getElementById('eod-note').value='';
  st.textContent='✓ Uploaded';
  setTimeout(()=>{ st.textContent=''; }, 2500);
  renderEod();
}
async function openEod(path){
  const { data, error } = await sb.storage.from('lead-docs').createSignedUrl(path, 3600);
  if(error||!data){ alert('Could not open: '+(error?error.message:'unknown')); return; }
  window.open(data.signedUrl, '_blank', 'noopener');
}
function renderEod(){
  const el = document.getElementById('eod-list');
  const dt = document.getElementById('eod-date');
  if(dt && !dt.value) dt.value = new Date().toISOString().slice(0,10);
  if(!eodReports.length){ el.innerHTML='<div style="color:#A89C8B;font-size:.85rem">No reports uploaded yet — the first one lands here. Reports are permanent: they can\'t be deleted, so the record stays audit-clean.</div>'; return; }
  const esc=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const sorted=[...eodReports].sort((a,b)=> (b.report_date||'').localeCompare(a.report_date||'') || (b.at||'').localeCompare(a.at||''));
  const byMonth={};
  sorted.forEach(r=>{ const m=(r.report_date||'').slice(0,7)||'unknown'; (byMonth[m]=byMonth[m]||[]).push(r); });
  const months=Object.keys(byMonth).sort().reverse();
  const monthName=m=>{ try{ return new Date(m+'-15T00:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'}); }catch(e){ return m; } };
  el.innerHTML = months.map((m,i)=>
    '<details '+(i===0?'open ':'')+'style="background:#fff;border:1px solid var(--border);border-radius:10px;overflow:hidden">'
    +'<summary style="cursor:pointer;padding:.7rem 1rem;font-weight:700;font-size:.9rem;color:var(--navy);display:flex;align-items:center;gap:.5rem">📁 '+esc(monthName(m))
    +'<span style="font-weight:400;font-size:.78rem;color:#A89C8B">'+byMonth[m].length+' report'+(byMonth[m].length===1?'':'s')+'</span></summary>'
    +'<div style="border-top:1px solid var(--border)">'
    +byMonth[m].map(r=>
      '<div style="display:flex;align-items:center;gap:.7rem;padding:.55rem 1rem;border-bottom:1px solid #FAF9F6;font-size:.85rem">'
      +'<span>📄</span>'
      +'<b style="white-space:nowrap">'+esc(r.report_date)+'</b>'
      +(r.role?'<span style="font-size:.7rem;font-weight:700;background:#E4EDF6;color:#1F517F;border-radius:999px;padding:.1rem .5rem;white-space:nowrap">'+esc(r.role)+'</span>':'')
      +'<a href="#" onclick="openEod(\''+esc(r.path)+'\');return false;" style="font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--navy)">'+esc(r.name)+'</a>'
      +(r.note?'<span style="color:#6E6559;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(r.note)+'</span>':'')
      +'<span style="margin-left:auto;color:#A89C8B;font-size:.75rem;white-space:nowrap">'+(r.size?Math.round(r.size/1024)+' KB · ':'')+esc((r.by||'').split('@')[0])+'</span>'
      +'</div>').join('')
    +'</div></details>').join('');
  el.style.gap='.6rem';
}

// ── SUPABASE — client initialized at top of script ────────────────────

/* ── SAFE SAVES (421, Samantha 2026-10-02/03) ─────────────────────────────
   Candidates and caregivers are saved ONE PERSON AT A TIME through the
   database function app_data_items_apply (Staffing repo safe_saves_2.sql),
   never as a whole list. Why: Aimee Driggers was lost because her Import got
   a number another candidate already had (each tab counted numbers on its
   own) and every save wrote the whole list, so a page opened earlier could
   save its old list over newer work.
   · loadFromSupabase keeps, per list, the version it loaded and a copy of
     each person as loaded (SAFE[key].snap).
   · saveCandidates()/saveCaregivers() compare the list now with that copy and
     send only what changed: put (a changed person, with the _rev it was
     based on), add (a new person, with a temporary negative number), remove.
   · NEW PEOPLE GET THEIR NUMBER FROM THE DATABASE. Until it answers they
     carry a temporary negative number (safeTmpId); nothing that leaves this
     page (reference requests, welcome calls, the roster link) may use it.
     The real number replaces it in place before the save resolves.
   · If the database is unreachable, a new person is taken back off the list
     and the office is told: no person ever exists on this device only.
   · Someone else changed that person since this page loaded: nothing is
     saved, the list is reloaded and the office is told who to redo.
   · More than 2 people removed in one save is refused by the database (no
     Hub path removes more than one at a time today).
   · Saves of one list run one after another (SAFE[key].chain), so a new
     person is never sent twice.
   · Boot never saves (bootHydrate / showApp only load), and nothing is sent
     until a fresh shared load succeeded (HYDRATED + a loaded snapshot). */
const SAFE_KEYS = ['candidates', 'caregivers'];
const SAFE = { candidates: { snap: null, dups: null, version: null, chain: Promise.resolve() },
               caregivers: { snap: null, dups: null, version: null, chain: Promise.resolve() } };
let SAFE_TMP = -1;
function safeTmpId(){ return SAFE_TMP--; }
function safeIsTmp(id){ return typeof id === 'number' && id < 0; }
function safeCopy(v){ return v == null ? v : JSON.parse(JSON.stringify(v)); }
function safeCanon(v){
  if (Array.isArray(v)) return '[' + v.map(x => x === undefined ? 'null' : safeCanon(x)).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).filter(k => v[k] !== undefined && typeof v[k] !== 'function').sort()
    .map(k => JSON.stringify(k) + ':' + safeCanon(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
function safeList(key){ return key === 'candidates' ? candidates : caregivers; }
function safeSetList(key, arr){ if (key === 'candidates') candidates = arr; else caregivers = arr; }
function safeCacheLocal(key){
  try { localStorage.setItem(key === 'candidates' ? 'cc_candidates' : 'cc_caregivers', JSON.stringify(safeList(key))); } catch(_){}
}
function safeName(r){ return r ? (String(r.first || '') + ' ' + String(r.last || '')).trim() : ''; }
function safeNames(arr){
  const n = arr.filter(Boolean);
  if (n.length <= 1) return n[0] || 'a person';
  return n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
}
function safeListLabel(key){ return key === 'candidates' ? 'Background & References' : 'the caregiver roster'; }
/* What the page loaded: a copy of each person by number. Numbers two records
   share are kept apart (dups): changes to them are never sent, and the office
   is told, because the database cannot know which of the two is meant. */
function safeRemember(key, rows, version){
  const snap = new Map(), count = {}, dups = new Map();
  (rows || []).forEach(r => { if (r && typeof r === 'object' && r.id != null && r.id !== '') count[String(r.id)] = (count[String(r.id)] || 0) + 1; });
  (rows || []).forEach(r => {
    if (!r || typeof r !== 'object' || r.id == null || r.id === '') return;
    const id = String(r.id);
    if (count[id] > 1) { if (!dups.has(id)) dups.set(id, []); dups.get(id).push(safeCanon(r)); }
    else snap.set(id, safeCopy(r));
  });
  SAFE[key].snap = snap; SAFE[key].dups = dups; SAFE[key].version = version == null ? null : version;
}
/* The list now against what was loaded: the changes to send. */
function safeDiff(key){
  const st = SAFE[key], arr = safeList(key) || [];
  const changes = [], adds = [], puts = [], removes = [], seen = new Set(), dupNow = new Map(), dupChanged = [];
  arr.forEach(rec => {
    if (!rec || typeof rec !== 'object') return;
    const id = rec.id == null ? '' : String(rec.id);
    if (id && st.dups.has(id)) { if (!dupNow.has(id)) dupNow.set(id, []); dupNow.get(id).push(rec); return; }
    if (!id || safeIsTmp(rec.id) || !st.snap.has(id) || seen.has(id)) {
      if (rec.id == null || rec.id === '' || seen.has(id) || !safeIsTmp(rec.id)) rec.id = safeTmpId();
      const sent = safeCopy(rec);
      adds.push({ rec, tmp: String(rec.id), sent });
      changes.push({ op: 'add', tmp: String(rec.id), record: sent });
      return;
    }
    seen.add(id);
    const was = st.snap.get(id);
    if (safeCanon(rec) !== safeCanon(was)) {
      const sent = safeCopy(rec);
      puts.push({ rec, sent });
      changes.push({ op: 'put', id: rec.id, base_rev: Number(was._rev) || 0, record: sent });
    }
  });
  st.snap.forEach((was, id) => {
    if (!seen.has(id)) { removes.push(was); changes.push({ op: 'remove', id: was.id, base_rev: Number(was._rev) || 0 }); }
  });
  st.dups.forEach((canons, id) => {
    const now = (dupNow.get(id) || []).map(safeCanon).sort().join('\n');
    if (now !== canons.slice().sort().join('\n')) dupChanged.push(id);
  });
  return { changes, adds, puts, removes, dupChanged };
}
/* Fixed-position notice, one per kind; the office closes it. Never silent. */
function safeNotice(id, html){
  if (!(typeof document !== 'undefined' && document.body && document.createElement)) return null;
  let el = document.getElementById ? document.getElementById(id) : null;
  if (el && el.remove) el.remove();
  el = document.createElement('div');
  el.id = id;
  el.setAttribute('role', 'alert');
  el.style.cssText = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:10000;max-width:560px;'
    + 'background:#FEF2F2;border:1px solid #FCA5A5;color:#991B1B;padding:12px 14px;border-radius:12px;'
    + 'box-shadow:0 8px 24px rgba(0,0,0,.12);font-size:13px;line-height:1.45;';
  el.innerHTML = html + '<br><button type="button" class="safe-notice-close" style="margin-top:8px;background:#991B1B;color:#fff;border:0;border-radius:8px;padding:5px 11px;font-size:12px;cursor:pointer">OK</button>';
  document.body.appendChild(el);
  try { const b = el.querySelector && el.querySelector('.safe-notice-close'); if (b) b.onclick = function(){ if (el.remove) el.remove(); }; } catch(_){}
  return el;
}
function safeEsc(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function safeConflictMsg(names){
  return 'Someone else changed ' + safeNames(names) + ' since this page opened. We loaded the latest; please redo your last change.';
}
function safeRerender(){
  try { if (typeof renderAll === 'function') renderAll(); } catch(_){}
  try { if (typeof renderPeopleChecks === 'function') renderPeopleChecks(); } catch(_){}
  try { if (typeof renderOrientReadyQueue === 'function') renderOrientReadyQueue(); } catch(_){}
}
/* The latest list from the database (after a refusal). */
async function safeReload(key){
  try {
    const { data, error } = await sb.from('app_data').select('data, version').eq('key', key).maybeSingle();
    if (error) throw error;
    const rows = data && Array.isArray(data.data) ? data.data : [];
    safeSetList(key, rows);
    safeRemember(key, rows, data ? data.version : null);
    safeCacheLocal(key);
    safeRerender();
    return true;
  } catch (e) {
    safeNotice('safeReloadWarn', '<b>Could not load the latest ' + safeEsc(safeListLabel(key)) + '.</b> Refresh this page before changing anything else.');
    return false;
  }
}
/* A record the database has just numbered: the temporary number is replaced
   everywhere this page holds it, before anything else can use it. */
function safeAdoptId(key, tmp, id){
  if (key === 'candidates') {
    if (typeof editingOB !== 'undefined' && String(editingOB) === String(tmp)) editingOB = id;
    (typeof caregivers !== 'undefined' ? caregivers : []).forEach(g => { if (g && String(g.candidate_id) === String(tmp)) g.candidate_id = id; });
  } else {
    if (typeof editingCG !== 'undefined' && String(editingCG) === String(tmp)) editingCG = id;
    try { if (typeof acSelected !== 'undefined' && acSelected.has(Number(tmp))) { acSelected.delete(Number(tmp)); acSelected.add(id); } } catch(_){}
  }
}
async function safeRun(key, opts){
  const st = SAFE[key];
  if (!HYDRATED || !st.snap) {
    console.warn('BLOCKED save of', key, '- shared data never loaded this session');
    try { hydrateBanner(); } catch(_){}
    return { ok: false, reason: 'not_loaded' };
  }
  let session = null;
  try { ({ data: { session } } = await sb.auth.getSession()); } catch(_){}
  if (!session) {
    if (!opts.quiet) safeNotice('safeSaveWarn', '<b>Not saved: you are signed out.</b> Sign in again, then redo your last change.');
    return { ok: false, reason: 'signed_out' };
  }
  const d = safeDiff(key);
  if (d.dupChanged.length) {
    safeNotice('safeDupWarn', '<b>Not saved:</b> two records in ' + safeEsc(safeListLabel(key)) + ' share number ' + safeEsc(d.dupChanged.join(', '))
      + ', so a change to them cannot be saved until that is fixed. Tell Claude.');
  }
  if (!d.changes.length) return { ok: !d.dupChanged.length, nothing: true, reason: d.dupChanged.length ? 'duplicate_id' : undefined };
  const changes = d.changes.slice();
  if (opts.allowBulkRemove) changes.push({ op: 'allow_bulk_remove' });
  try { setSyncStatus('syncing'); } catch(_){}
  let data = null, error = null;
  try { ({ data, error } = await sb.rpc('app_data_items_apply', { p_key: key, p_changes: changes })); }
  catch (e) { error = e; }
  if (error || !data) {
    const why = String((error && (error.message || error.hint)) || error || 'no answer');
    const missing = /app_data_items_apply|PGRST202|could not find the function/i.test(why + ' ' + String(error && error.code || ''));
    /* A new person must never exist on this device only: take them back off. */
    if (d.adds.length) { const gone = new Set(d.adds.map(a => a.rec)); safeSetList(key, safeList(key).filter(r => !gone.has(r))); safeCacheLocal(key); safeRerender(); }
    try { setSyncStatus('offline'); } catch(_){}
    if (missing) {
      safeNotice('safeSaveWarn', '<b>Not saved.</b> The new safe-save step is not installed on the database yet (421), so nothing in '
        + safeEsc(safeListLabel(key)) + ' can be saved. Tell Claude.');
    } else if (d.adds.length && !opts.quiet) {
      safeNotice('safeAddWarn', '<b>Could not add ' + safeEsc(safeNames(d.adds.map(a => safeName(a.rec)))) + ':</b> the shared workspace did not answer, so nothing was saved and they were not added. Check your connection and try again.');
    }
    return { ok: false, reason: missing ? 'rpc_missing' : 'error', why, kept: d.puts.length + d.removes.length };
  }
  if (data.ok) {
    const ids = data.ids || {}, revs = data.revs || {};
    d.adds.forEach(a => {
      const nid = ids[a.tmp];
      if (nid == null) return;
      a.rec.id = nid; a.sent.id = nid;
      const rv = Number(revs[String(nid)]) || 0;
      if (rv || a.rec._rev != null) { a.rec._rev = rv; a.sent._rev = rv; }
      st.snap.set(String(nid), a.sent);
      safeAdoptId(key, Number(a.tmp), nid);
    });
    d.puts.forEach(p => {
      const rv = revs[String(p.rec.id)];
      if (rv != null) { p.rec._rev = Number(rv); p.sent._rev = Number(rv); }
      st.snap.set(String(p.rec.id), p.sent);
    });
    d.removes.forEach(was => st.snap.delete(String(was.id)));
    st.version = data.version == null ? st.version : data.version;
    safeCacheLocal(key);
    try { setSyncStatus('ok'); } catch(_){}
    if (d.adds.length) safeRerender();
    return { ok: true, ids };
  }
  /* Refused: nothing in this save was saved. Show the truth, then say why. */
  const conflicts = Array.isArray(data.conflicts) ? data.conflicts : [];
  const local = id => safeList(key).find(r => r && String(r.id) === String(id)) || (st.snap.get(String(id)) || null);
  const dupIds = conflicts.filter(c => c.reason === 'duplicate_id').map(c => String(c.id));
  const names = conflicts.filter(c => c.reason !== 'duplicate_id').map(c => safeName(c.current_record) || safeName(local(c.id)) || ('number ' + c.id));
  await safeReload(key);
  if (data.reason === 'bulk_remove') {
    safeNotice('safeBulkWarn', '<b>Not saved:</b> that save would have removed ' + Number(data.removes || 0) + ' people from ' + safeEsc(safeListLabel(key))
      + ' at once, so it was stopped and nothing was saved. We loaded the latest list. If this was meant to happen, tell Claude.');
    return { ok: false, reason: 'bulk_remove' };
  }
  if (dupIds.length) {
    safeNotice('safeDupWarn', '<b>Not saved:</b> two records in ' + safeEsc(safeListLabel(key)) + ' share number ' + safeEsc(dupIds.join(', '))
      + ', so a change to them cannot be saved until that is fixed. Tell Claude.');
  }
  if (names.length || !dupIds.length) safeNotice('safeConflictWarn', '<b>' + safeEsc(safeConflictMsg(names.length ? names : [])) + '</b>');
  return { ok: false, reason: 'conflict', names };
}
/* One save per list at a time; each starts from what the previous one left. */
function safeSave(key, opts){
  const st = SAFE[key];
  const run = () => safeRun(key, opts || {}).catch(e => { console.error('safeSave', key, e); return { ok: false, reason: 'error', why: String((e && e.message) || e) }; });
  const p = st.chain.then(run, run);
  st.chain = p.then(() => {}, () => {});
  return p;
}
/* index.html saved one caregiver itself (skills, supervisory visit): take the
   database's copy here too, unless this page holds an unsaved change to them. */
function safeSavesAdopt(key, rec){
  const st = SAFE[key];
  if (!st || !st.snap || !rec || rec.id == null) return false;
  const id = String(rec.id), arr = safeList(key) || [];
  const i = arr.findIndex(r => r && String(r.id) === id);
  const was = st.snap.get(id);
  if (i < 0 || !was || safeCanon(arr[i]) !== safeCanon(was)) return false;
  arr[i] = safeCopy(rec); st.snap.set(id, safeCopy(rec)); safeCacheLocal(key);
  return true;
}
if (typeof window !== 'undefined') window.safeSavesAdopt = safeSavesAdopt;

async function syncToSupabase(key, data){
  /* 421: candidates and caregivers are never saved as a whole list (safeSave). */
  if(SAFE_KEYS.includes(key)){ console.error('BLOCKED whole-list save of', key, '- use saveCandidates/saveCaregivers'); return false; }
  try {
    /* Guard 1: NEVER write before a fresh shared load has succeeded. These
       saves replace the WHOLE blob, so a stale localStorage copy written
       back would erase everyone else's changes. Invariant (owner ruling
       2026-09-21): no successful fresh shared load -> no shared write. */
    if(!HYDRATED){
      console.warn('BLOCKED stale write of', key, '- shared data never loaded this session');
      try{ hydrateBanner(); }catch(e){}
      return false;
    }
    // Guard 2: NEVER write while logged out. A fresh browser starts with empty
    // local arrays, and an unauthenticated write here can overwrite real data
    // in Supabase (this happened — see clearSeedPeople).
    const { data:{ session } } = await sb.auth.getSession();
    if(!session){ console.warn('Skipped Supabase sync for', key, '— not signed in'); return false; }
    const { error } = await sb.from('app_data').upsert({ key, data, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if(error){ console.warn('Supabase sync failed for', key, error); setSyncStatus('offline'); return false; }
    setSyncStatus('ok');
    return true;
  } catch(e){ console.warn('Supabase sync:', e); setSyncStatus('offline'); return false; }
}

async function loadFromSupabase(){
  setSyncStatus('syncing');
  try {
    try{ const {data:{session}}=await sb.auth.getSession(); window._myEmail=((session&&session.user&&session.user.email)||'').toLowerCase(); }catch(e){}
    const { data, error } = await sb.from('app_data').select('*');
    /* Returns false on failure so bootHydrate can refuse to declare the app
       hydrated — silent failure here is how stale local caches ended up
       being the only data this hub ever showed. */
    if(error || !data) { setSyncStatus('offline'); return false; }
    /* 421: a list with no row in the database is empty there, so it is empty
       here too: a cached copy from this device is never saved as if it were new. */
    SAFE_KEYS.forEach(k => { if(!data.some(r => r && r.key === k && r.data)){ safeSetList(k, []); safeRemember(k, [], null); } });
    data.forEach(row => {
      if(!row.data) return;
      if(row.key==='candidates')     { candidates=Array.isArray(row.data)?row.data:[]; safeRemember('candidates', candidates, row.version); }
      if(row.key==='caregivers')     { caregivers=Array.isArray(row.data)?row.data:[]; safeRemember('caregivers', caregivers, row.version); }
      if(row.key==='eod_reports')    { eodReports=row.data||[]; }
      if(row.key==='orient_sessions'){ orientSessions=row.data; orientId=Math.max(orientId,...orientSessions.map(s=>s.id+1),1); }
      if(row.key==='settings')       { appSettings=row.data; if(appSettings&&typeof appSettings==='object') delete appSettings.training_hub_key; if(appSettings&&typeof appSettings==='object') ZAPIER_FIELDS.forEach(k=>{ delete appSettings[k]; }); /* T3: the key is retired */ localStorage.setItem('cc_settings',JSON.stringify(row.data)); }
      if(row.key==='evv_corrections'){ localStorage.setItem('cc_evv_corrections', JSON.stringify(row.data)); }
      if(row.key==='staffing_tasks') { STASKS=row.data||[]; }
      // One staff list across every hub. This is the same key the Care
      // Coordinator Hub writes, so adding someone in either place is the same
      // person — no more two lists drifting apart.
      if(row.key==='coordinator_staff'){ SHARED_STAFF=row.data||[]; }
      if(row.key==='dnr_log')        { DNRLOG=row.data||[]; }
      if(row.key==='meetings')       { MEETINGS=row.data||[]; }
      if(row.key==='handoffs')       { HANDOFFS=row.data||[]; }
      if(row.key==='attendance_events')  { ATT_EVENTS=row.data||[]; }
      if(row.key==='discipline_actions') { DISC_ACTIONS=row.data||[]; }
      if(row.key==='client_checkins')    { CHECKINS=row.data||[]; }
    });
    updateCoordreqBadge();
    if(typeof activeTab!=='undefined' && activeTab==='coordreq') renderCoordReqs();
    if(typeof activeTab!=='undefined' && activeTab==='home') renderStaffHome();
    setSyncStatus('ok');
    return true;
  } catch(e){ console.warn('Supabase load failed, using localStorage:', e); setSyncStatus('offline'); return false; }
}

function setSyncStatus(s){
  const el = document.getElementById('sync-status');
  if(!el) return;
  const map = { syncing:['⟳ Syncing…','#A89C8B'], ok:['☁ Synced','#22c55e'], offline:['⚡ Local only','#f59e0b'] };
  const [label,color] = map[s]||map.ok;
  el.textContent=label; el.style.color=color;
}

// ── DATA — localStorage-backed ─────────────────────────────────────────
const SEED_CANDIDATES = [];
const SEED_CAREGIVERS = [];
// One-time migration: remove example people that shipped with earlier versions
const SEED_CANDIDATE_NAMES = ["Maria Rodriguez","James Wilson","Tanya Brooks"];
const SEED_CAREGIVER_NAMES = ["Jane Smith","Marcus Johnson","Angela Torres","Robert Davis"];
function clearSeedPeople(){
  if(localStorage.getItem('cc_seed_cleared')) return;
  const nm = (f,l)=>`${f} ${l}`;
  const beforeC = candidates.length, beforeG = caregivers.length;
  candidates = candidates.filter(c=>!SEED_CANDIDATE_NAMES.includes(nm(c.first,c.last)));
  caregivers = caregivers.filter(c=>!SEED_CAREGIVER_NAMES.includes(nm(c.first,c.last)));
  // Only persist if something was actually removed — an unconditional save
  // here pushed empty arrays to Supabase from fresh (logged-out) browsers.
  if(candidates.length !== beforeC || caregivers.length !== beforeG){
    saveCandidates(); saveCaregivers();
  }
  localStorage.setItem('cc_seed_cleared','1');
}

let appSettings  = JSON.parse(localStorage.getItem('cc_settings'))    || { alert_recipients: [{name:'Samantha', email:'samantha@mo-care.com'}] };
/* 2026-09-28: Zapier is gone; drop any Zapier address this browser kept. */
const ZAPIER_FIELDS=['ac_orient_webhook','zapier_orient_webhook','zapier_attend_webhook','zapier_cand_webhook','zapier_not_hired_webhook','ac_new_client_webhook'];
ZAPIER_FIELDS.forEach(k=>{ delete appSettings[k]; });
delete appSettings.training_hub_key;   /* T3 (2026-09-28): the shared Training key is retired; every Training call uses your own sign-in */
let candidates   = JSON.parse(localStorage.getItem('cc_candidates'))   || SEED_CANDIDATES;
let caregivers   = JSON.parse(localStorage.getItem('cc_caregivers'))   || SEED_CAREGIVERS;
/* 421: no per-tab number counters any more (obId/cgId gave Aimee a number already in use).
   New people get a temporary negative number (safeTmpId) until the database gives the real one. */
clearSeedPeople();

async function saveCandidates(opts){
  // Local cache is written synchronously first (before any await), so callers
  // that read localStorage right after calling this still see the update.
  localStorage.setItem('cc_candidates', JSON.stringify(candidates));
  // 421: only what changed is sent, one person at a time (safeSave). The outcome
  // is SURFACED: a refusal or a conflict has its own notice; a save that did not
  // reach the database shows the "Saved on this device only" warning below.
  // Resolves true only when the database confirmed every change.
  const r = await safeSave('candidates', opts);
  if(r.ok) bgrSharedSaveResult(true, 'candidates');
  else if(r.reason === 'error' && r.kept && !(opts && opts.quiet)) bgrSharedSaveResult(false, 'candidates');
  return r.ok === true;
}
// Visible, actionable warning when a shared candidates save did not go through.
function bgrSharedSaveResult(ok, key){
  key = key || 'candidates';
  let el = (typeof document!=='undefined' && document.getElementById) ? document.getElementById('scxSharedSaveWarn') : null;
  if(ok){ if(el && el.remove) el.remove(); return; }
  // A false result while shared data never loaded this session is the "stale
  // write blocked" case — syncToSupabase already showed the hydrate banner for
  // that distinct cause, so don't stack a second warning on top of it.
  if(typeof HYDRATED !== 'undefined' && !HYDRATED) return;
  if(!(typeof document!=='undefined' && document.body)) return;
  if(el) return; // already showing
  el = document.createElement('div');
  el.id = 'scxSharedSaveWarn';
  el.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;max-width:520px;'
    + 'background:#FEF2F2;border:1px solid #FCA5A5;color:#991B1B;padding:12px 14px;border-radius:12px;'
    + 'box-shadow:0 8px 24px rgba(0,0,0,.12);font-size:13px;line-height:1.45;display:flex;gap:10px;align-items:flex-start;';
  el.innerHTML =
      '<span style="font-size:16px;line-height:1">&#9888;&#65039;</span>'
    + '<span><b>Saved on this device only.</b> This change did not reach the shared workspace, '
    + 'so the rest of the team will not see it yet. You may not have access to save shared changes, '
    + 'or the connection dropped.<br>'
    + '<button type="button" id="scxSharedSaveRetry" style="margin-top:9px;background:#991B1B;color:#fff;border:0;border-radius:8px;padding:6px 11px;font-size:12px;cursor:pointer">Try saving to shared again</button>'
    + '<button type="button" id="scxSharedSaveDismiss" style="margin-top:9px;margin-left:8px;background:transparent;color:#991B1B;border:0;font-size:12px;cursor:pointer;text-decoration:underline">Dismiss</button>'
    + '</span>';
  document.body.appendChild(el);
  const r = document.getElementById('scxSharedSaveRetry');
  const d = document.getElementById('scxSharedSaveDismiss');
  // Remove the stale banner before retrying so a fresh outcome (success = no
  // banner, failure = a new banner) is shown cleanly.
  if(r) r.onclick = function(){ if(el.remove) el.remove(); if(key === 'caregivers') saveCaregivers(); else saveCandidates(); };
  if(d) d.onclick = function(){ if(el.remove) el.remove(); };
}
function saveCaregivers(opts){
  localStorage.setItem('cc_caregivers', JSON.stringify(caregivers));
  /* Returns the shared-save outcome (a promise of true/false) for callers that
     must know it (the welcome-call roster add, Step 2 marks). Older callers
     ignore it, as before. 421: one person at a time (safeSave); when it is
     true, every new caregiver already carries the number the database gave. */
  return safeSave('caregivers', opts).then(r => {
    if(r.ok) bgrSharedSaveResult(true, 'caregivers');
    else if(r.reason === 'error' && r.kept && !(opts && opts.quiet)) bgrSharedSaveResult(false, 'caregivers');
    return r.ok === true;
  });
}

// ── TRAINING HUB LIVE SYNC ────────────────────────────────────────────
// Pulls authoritative training data from training.mo-care.com (the system of
// record for training) and fills this tab's fields: orientation + ALZ
// completion dates, hire date and first-client-contact date (fill-if-empty).
// Matches caregivers by AxisCare ID when known, otherwise by name.
const TRAINING_DATA_FN='https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/hub-training-data';
const TRAINING_HUB_API=TRAINING_DATA_FN+'?action=training_status';   /* T2: your own sign-in, not the shared key */
const TRAINING_HUB_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkcXVqeGl5Y3ljd2hza3l2cndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMTg1NDgsImV4cCI6MjA5ODc5NDU0OH0.SFjAfj--b-tWrk8bMVLeM-tGwD8VBaPsEBtUAp5tPew';
async function syncFromTrainingHub(btn){
  const orig=btn?btn.textContent:'';
  if(btn){ btn.textContent='☁ Syncing…'; btn.disabled=true; }
  try{
    const r=await fetch(TRAINING_HUB_API,{method:'POST',headers:{'x-hub-token':await trainHubTok(),'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},body:'{}'});
    const data=await r.json();
    if(!Array.isArray(data)) throw new Error((data&&data.error)?data.error:'unexpected response — is the read key correct?');
    const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z]/g,'');
    const byId={}, byName={}, dupes={};
    data.forEach(h=>{
      if(h.axiscare_id) byId[String(h.axiscare_id)]=h;
      const n=norm(h.name);
      if(byName[n]) dupes[n]=true; else byName[n]=h;
    });
    const day=iso=>iso?String(iso).slice(0,10):'';
    let matched=0, updated=0; const unmatched=[];
    caregivers.forEach(c=>{
      const nkey=norm((c.first||'')+(c.last||''));
      const h=(c.axiscare_id&&byId[String(c.axiscare_id)])||(!dupes[nkey]&&byName[nkey])||null;
      if(!h){ unmatched.push(((c.first||'')+' '+(c.last||'')).trim()+(dupes[nkey]?' (duplicate name — match by hand once, then IDs take over)':'')); return; }
      matched++;
      let ch=false;
      if(h.axiscare_id&&c.axiscare_id!==h.axiscare_id){ c.axiscare_id=h.axiscare_id; ch=true; }
      const course=slug=>(h.trainings||[]).find(t=>t.slug===slug);
      const or=course('agency-orientation'), alz=course('dementia-care');
      if(or&&or.status==='complete'&&or.completed_at&&c.orient_date!==day(or.completed_at)){
        c.orient_date=day(or.completed_at);
        if(!c.orient_proof) c.orient_proof='https://training.mo-care.com';
        ch=true;
      }
      if(alz&&alz.status==='complete'&&alz.completed_at){
        if(c.alz_date!==day(alz.completed_at)){ c.alz_date=day(alz.completed_at); ch=true; }
        if(!(parseInt(c.alz_hrs)>=4)){ c.alz_hrs='4'; ch=true; }
        if(!c.alz_proof){ c.alz_proof='https://training.mo-care.com'; ch=true; }
      }
      if(h.hire_date&&!c.hire_date){ c.hire_date=day(h.hire_date); ch=true; }
      if(h.first_contact_date&&!c.first_contact){ c.first_contact=day(h.first_contact_date); ch=true; }
      // OJT: the platform's 6-hour online OJT fills the online portion; the
      // in-home portion stays manual until MMAC settles the delivery split.
      const ojt=course('on-the-job-training');
      if(ojt&&ojt.status==='complete'&&ojt.completed_at&&c.ojt_online!==day(ojt.completed_at)){
        c.ojt_online=day(ojt.completed_at);
        if(!c.ojt_online_proof) c.ojt_online_proof='https://training.mo-care.com';
        ch=true;
      }
      // Annual in-service: latest date + trailing-12-month hours from the
      // Training Hub's in-service ledger.
      if(h.inservice_last_date){
        if(c.annual_date!==day(h.inservice_last_date)){ c.annual_date=day(h.inservice_last_date); ch=true; }
        const hrs=String(h.inservice_hours_12mo!=null?h.inservice_hours_12mo:'');
        if(hrs&&c.annual_hrs!==hrs){ c.annual_hrs=hrs; ch=true; }
        if(h.inservice_has_doc&&!c.annual_proof){ c.annual_proof='https://training.mo-care.com'; ch=true; }
      }
      if(ch){ c.th_synced=new Date().toISOString(); updated++; }
    });
    if(updated) saveCaregivers();
    renderTR();
    alert('Training Hub sync complete.\n\nMatched: '+matched+' caregiver(s)\nUpdated: '+updated+
      (unmatched.length?('\n\nNot found in the Training Hub (name spelling differs, or not active there):\n• '+unmatched.slice(0,12).join('\n• ')+(unmatched.length>12?('\n…and '+(unmatched.length-12)+' more'):'')):'\n\nAll caregivers matched ✓'));
  }catch(e){
    alert('Training Hub sync failed: '+((e&&e.message)?e.message:'network error'));
  }finally{
    if(btn){ btn.textContent=orig; btn.disabled=false; }
  }
}
// ── TRAINING LOGIC ────────────────────────────────────────────────────


// ── ONBOARDING RENDER ─────────────────────────────────────────────────
let obFilterVal='all', obSearch='';
function obFilter(f,btn){
  obFilterVal=f;
  document.querySelectorAll('#panel-onboarding .fb').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const isStats = f==='stats';
  document.querySelector('.tbl-wrap').style.display = isStats?'none':'';
  document.getElementById('ob-stats-panel').style.display = isStats?'block':'none';
  if(isStats) renderOBStats();
  else renderOB();
}
function renderOBStats(){
  const el = document.getElementById('ob-stats-panel');
  const now = new Date();

  function getAddedMs(c){
    const ts = c.addedAt || (c.added ? c.added+'T00:00:00' : null);
    return ts ? new Date(ts).getTime() : null;
  }
  function msToDays(ms){ return ms/(1000*60*60*24); }
  function fmtDur(ms){
    const h=ms/(1000*60*60); if(h<24) return `${Math.round(h)}h`; return `${msToDays(ms).toFixed(1)}d`;
  }
  function fmtTs(ts){
    if(!ts) return '—';
    const d=new Date(ts);
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+' '+d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
  }

  // Resolved (Ready for Orientation or Needs Review)
  const resolved = candidates.filter(c=>c.resolvedAt && getAddedMs(c));
  const resolvedTimes = resolved.map(c=>new Date(c.resolvedAt).getTime() - getAddedMs(c)).filter(ms=>ms>0);
  const avgMs = resolvedTimes.length ? resolvedTimes.reduce((a,b)=>a+b,0)/resolvedTimes.length : null;
  const fastestMs = resolvedTimes.length ? Math.min(...resolvedTimes) : null;
  const slowestMs = resolvedTimes.length ? Math.max(...resolvedTimes) : null;

  // Active pipeline (Awaiting or Needs Review without resolvedAt)
  const active = candidates.filter(c=>!c.resolvedAt).map(c=>{
    const addedMs = getAddedMs(c);
    const elapsed = addedMs ? now.getTime()-addedMs : null;
    return {...c, elapsed};
  }).sort((a,b)=>(b.elapsed||0)-(a.elapsed||0));

  const urgencyColor = d => d===null?'var(--gray)':d>=10?'var(--red)':d>=5?'#F97316':'var(--green-text)';

  el.innerHTML = `
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1.5rem">
    <div style="background:var(--white);border-radius:10px;padding:1rem;text-align:center;box-shadow:0 2px 8px rgba(14,56,96,.07)">
      <div style="font-size:1.6rem;font-weight:700;color:var(--navy)">${resolved.length}</div>
      <div style="font-size:.72rem;color:var(--gray);margin-top:.2rem">Resolved Total</div>
    </div>
    <div style="background:var(--white);border-radius:10px;padding:1rem;text-align:center;box-shadow:0 2px 8px rgba(14,56,96,.07)">
      <div style="font-size:1.6rem;font-weight:700;color:var(--navy)">${avgMs!==null?fmtDur(avgMs):'—'}</div>
      <div style="font-size:.72rem;color:var(--gray);margin-top:.2rem">Avg Time to Clear</div>
    </div>
    <div style="background:var(--white);border-radius:10px;padding:1rem;text-align:center;box-shadow:0 2px 8px rgba(14,56,96,.07)">
      <div style="font-size:1.6rem;font-weight:700;color:var(--green-text)">${fastestMs!==null?fmtDur(fastestMs):'—'}</div>
      <div style="font-size:.72rem;color:var(--gray);margin-top:.2rem">Fastest</div>
    </div>
    <div style="background:var(--white);border-radius:10px;padding:1rem;text-align:center;box-shadow:0 2px 8px rgba(14,56,96,.07)">
      <div style="font-size:1.6rem;font-weight:700;color:var(--red)">${slowestMs!==null?fmtDur(slowestMs):'—'}</div>
      <div style="font-size:.72rem;color:var(--gray);margin-top:.2rem">Slowest</div>
    </div>
  </div>

  <!-- Active pipeline -->
  <div style="background:var(--white);border-radius:10px;box-shadow:0 2px 8px rgba(14,56,96,.07);margin-bottom:1.25rem;overflow:hidden">
    <div style="padding:.8rem 1rem;background:var(--navy);color:#fff;font-size:.82rem;font-weight:700">⏳ Active Pipeline — sorted by longest waiting (${active.length})</div>
    ${active.length===0?'<div style="padding:1rem;font-size:.82rem;color:var(--gray)">No active candidates.</div>':''}
    ${active.length?`<table style="width:100%;border-collapse:collapse;font-size:.8rem">
      <thead><tr style="background:var(--bg)">
        <th style="padding:.5rem .75rem;text-align:left;font-weight:600;color:var(--navy)">Candidate</th>
        <th style="padding:.5rem .75rem;text-align:left;font-weight:600;color:var(--navy)">Added</th>
        <th style="padding:.5rem .75rem;text-align:left;font-weight:600;color:var(--navy)">Time in Pipeline</th>
        <th style="padding:.5rem .75rem;text-align:left;font-weight:600;color:var(--navy)">Status</th>
        <th style="padding:.5rem .75rem;text-align:left;font-weight:600;color:var(--navy)">Blocking</th>
      </tr></thead>
      <tbody>${active.map((c,i)=>{
        const days = c.elapsed!==null ? msToDays(c.elapsed) : null;
        const st = obDeriveStatus(c);
        const blocking = [];
        if(!['CLEAR'].includes(c.oig)) blocking.push('OIG');
        if(!['Clear'].includes(c.edl)) blocking.push('EDL');
        if(!['Clear'].includes(c.fcsr)) blocking.push('FCSR');
        /* Asks the one authoritative rule rather than counting positives again
           here. This was a third copy of the reference policy and would have
           kept displaying the old one. */
        const rp=refPolicy(c);
        if(!rp.ok) blocking.push(rp.blocked ? 'Refs (supervisor)'
          : `Refs (${[c.r1s,c.r2s,c.r3s,c.r4s].filter(r=>r==='Positive').length}/2)`);
        return `<tr style="border-top:1px solid var(--border);background:${i%2===0?'#fff':'#FAF9F6'}">
          <td style="padding:.5rem .75rem;font-weight:600">${c.first} ${c.last}</td>
          <td style="padding:.5rem .75rem;color:var(--gray)">${fmtTs(c.addedAt||c.added)}</td>
          <td style="padding:.5rem .75rem;font-weight:700;color:${urgencyColor(days)}">${days!==null?fmtDur(c.elapsed):'—'}</td>
          <td style="padding:.5rem .75rem"><span class="badge ${st==='Ready for Orientation'?'b-green':st==='Needs Review'?'b-red':'b-gray'}">${st}</span></td>
          <td style="padding:.5rem .75rem;color:var(--amber-text);font-size:.75rem">${blocking.join(', ')||'—'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`:''}
  </div>

  <!-- Resolved history -->
  <div style="background:var(--white);border-radius:10px;box-shadow:0 2px 8px rgba(14,56,96,.07);overflow:hidden">
    <div style="padding:.8rem 1rem;background:var(--teal);color:#fff;font-size:.82rem;font-weight:700">✅ Resolved History (${resolved.length})</div>
    ${resolved.length===0?'<div style="padding:1rem;font-size:.82rem;color:var(--gray)">No resolved candidates yet — data will populate as candidates are cleared.</div>':''}
    ${resolved.length?`<table style="width:100%;border-collapse:collapse;font-size:.8rem">
      <thead><tr style="background:var(--bg)">
        <th style="padding:.5rem .75rem;text-align:left;font-weight:600;color:var(--navy)">Candidate</th>
        <th style="padding:.5rem .75rem;text-align:left;font-weight:600;color:var(--navy)">Added</th>
        <th style="padding:.5rem .75rem;text-align:left;font-weight:600;color:var(--navy)">Resolved</th>
        <th style="padding:.5rem .75rem;text-align:left;font-weight:600;color:var(--navy)">Total Time</th>
        <th style="padding:.5rem .75rem;text-align:left;font-weight:600;color:var(--navy)">Outcome</th>
      </tr></thead>
      <tbody>${resolved.slice().sort((a,b)=>new Date(b.resolvedAt)-new Date(a.resolvedAt)).map((c,i)=>{
        const dur = new Date(c.resolvedAt).getTime() - getAddedMs(c);
        return `<tr style="border-top:1px solid var(--border);background:${i%2===0?'#fff':'#FAF9F6'}">
          <td style="padding:.5rem .75rem;font-weight:600">${c.first} ${c.last}</td>
          <td style="padding:.5rem .75rem;color:var(--gray)">${fmtTs(c.addedAt||c.added)}</td>
          <td style="padding:.5rem .75rem;color:var(--gray)">${fmtTs(c.resolvedAt)}</td>
          <td style="padding:.5rem .75rem;font-weight:700;color:${urgencyColor(msToDays(dur))}">${fmtDur(dur)}</td>
          <td style="padding:.5rem .75rem"><span class="badge ${c.resolvedStatus==='Ready for Orientation'?'b-green':'b-red'}">${c.resolvedStatus}</span></td>
        </tr>`;
      }).join('')}</tbody>
    </table>`:''}
  </div>
  <p style="font-size:.72rem;color:var(--gray);margin-top:.75rem">⚠ Timestamps are only captured for candidates added or updated after this feature was deployed. Historical records show date only.</p>
  `;
}


/* ---- Where everyone stands ----------------------------------------------
   The answer to "how far along is this person" used to live across two tabs
   and a coordinator's memory. Four columns, one row each, and a plain sentence
   saying what the next move is. Anything waiting on us is red; anything
   waiting on them is amber; done is quiet. */
/* ── THE LIFECYCLE ROWS ───────────────────────────────────────────────────────
   One row per person in flight, assembled from three sources:
     job_offers (OFFERS)          — the durable offer record
     hire_intake (INTAKE_ROWS)    — their start-link submission
     the B&R board (candidates)   — the checks workspace
   Deterministic links only: board.offer_id -> offer, board.intake_id ->
   intake. The offer<->intake pairing has NO stored key yet, so it uses a
   contact-info heuristic for DISPLAY ASSISTANCE ONLY, always labeled '~'.
   It never establishes identity, never writes a linkage, never changes
   state, never triggers anything (owner ruling 2026-09-21).

   State is FOUR INDEPENDENT dimensions, never inferred from identity:
     offerState  : none | sent | stalled           (from job_offers columns)
     linkState   : none | waiting | submitted      (does an intake row exist)
     checksState : none | active | ready | not_hired  (board workspace) | roster (moved to the caregiver roster)
     attention[] : inconsistencies rendered loudly, never skipped
   hire_intake.candidate_id is the AxisCare identity (script 185; the
   hiring-history reader depends on it). It informs the identity chip and
   roster corroboration ONLY — it never by itself means resolved. */
function lifecycleRows(){
  const digits = t => String(t || '').replace(/\D/g, '').slice(-10);
  const rows = [];
  const usedIntake = new Set();
  const usedBoard = new Set();

  const boardFor = i => candidates.find(c => c.intake_id === i.id);
  /* Moved to the caregiver roster (welcome call done or office Promote): matched ONLY by the links the roster
     record carries over from the board, intake_id and offer_id. hire_intake.candidate_id is an AxisCare
     applicant id, never a board id, so it is never compared with the roster's candidate_id. */
  const rosterList = typeof caregivers !== 'undefined' ? caregivers : [];
  const rosterFor = (offer, intakes) => rosterList.find(g =>
      (g.intake_id != null && g.intake_id !== '' && intakes.some(i => i && String(i.id) === String(g.intake_id)))
   || (offer && g.offer_id != null && g.offer_id !== '' && String(g.offer_id) === String(offer.id))) || null;
  const rosterHit = axid => (typeof caregivers !== 'undefined' ? caregivers : [])
    .some(g => String(g.axiscare_id || '') === String(axid));

  /* ── IDENTITY GROUPING (deterministic, never by name alone) ──────────────────
     A person may submit their start link more than once. Those submissions are
     the SAME person's history, not two people, so they collapse into one person
     with a submission list. Strong identifiers, strongest to weakest:
       1) AxisCare applicant id (hire_intake.candidate_id)
       2) normalized email
       3) normalized phone
     Union-find across EVERY strong key a row carries (so a row linked by email to
     one that also has an AxisCare id joins the same person). Name is NEVER a
     grouping key. If a resulting group's strong ids DISAGREE (e.g. two different
     AxisCare ids pulled together by a shared phone), the person is surfaced as
     attention — never silently combined. Read-only: operates on a copy, sorts a
     copy, mutates no hire_intake row. */
  const normEmail = e => { const s = String(e == null ? '' : e).trim().toLowerCase(); return s || null; };
  const normPhone = p => { const d = digits(p); return d.length >= 10 ? d : null; };
  const persons = (function buildPersons(){
    const list = INTAKE_ROWS.slice();
    const parent = new Map(); list.forEach(r => parent.set(r.id, r.id));
    const find = x => { let r = x; while (parent.get(r) !== r) r = parent.get(r);
      while (parent.get(x) !== r) { const n = parent.get(x); parent.set(x, r); x = n; } return r; };
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
    const keysOf = r => [
      r.candidate_id != null ? 'ax:' + String(r.candidate_id) : null,
      normEmail(r.email) ? 'em:' + normEmail(r.email) : null,
      normPhone(r.phone) ? 'ph:' + normPhone(r.phone) : null,
    ].filter(Boolean);
    const seen = new Map();
    for (const r of list) for (const k of keysOf(r)) {
      if (seen.has(k)) union(r.id, seen.get(k)); else seen.set(k, r.id);
    }
    const byRoot = new Map();
    for (const r of list) { const root = find(r.id); if (!byRoot.has(root)) byRoot.set(root, []); byRoot.get(root).push(r); }
    const out = [];
    for (const subs of byRoot.values()) {
      subs.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))); // newest first
      const distinct = sel => new Set(subs.map(sel).filter(v => v != null && v !== '')).size;
      const conflict = distinct(r => r.candidate_id != null ? String(r.candidate_id) : null) > 1
                    || distinct(r => normEmail(r.email)) > 1
                    || distinct(r => normPhone(r.phone)) > 1;
      out.push({ submissions: subs, latest: subs[0], conflict });
    }
    return out;
  })();
  const personByIntakeId = new Map();
  persons.forEach(p => p.submissions.forEach(s => personByIntakeId.set(s.id, p)));
  const personFor = i => personByIntakeId.get(i.id) || { submissions: [i], latest: i, conflict: false };
  const claimPerson = p => p.submissions.forEach(s => usedIntake.add(s.id));
  const boardForPerson = p => p.submissions.map(boardFor).find(Boolean) || null;

  for (const o of OFFERS) {
    const board = candidates.find(c => String(c.offer_id) === String(o.id)) || null;
    if (board) usedBoard.add(board.id);
    let intake = board && board.intake_id ? INTAKE_ROWS.find(r => r.id === board.intake_id) : null;
    let approx = false;
    if (!intake) {
      intake = INTAKE_ROWS.find(r => !usedIntake.has(r.id)
        && String(o.first_name || '').toLowerCase() === String(r.first_name || '').toLowerCase()
        && String(o.last_name || '').toLowerCase() === String(r.last_name || '').toLowerCase()
        && (o.first_name || o.last_name)) || null;
      if (intake) approx = true;      // display assistance only, labeled '~'
    }
    if (intake) {
      const person = personFor(intake);
      claimPerson(person);                       // marks EVERY submission used, so no duplicate card
      const b2 = boardForPerson(person); if (b2) usedBoard.add(b2.id);
      rows.push(mkRow(o, person.latest, b2 || board, approx, person));
    } else {
      rows.push(mkRow(o, null, board, false, null));
    }
  }
  for (const r of INTAKE_ROWS) {
    if (usedIntake.has(r.id)) continue;
    const person = personFor(r);
    claimPerson(person);
    const b = boardForPerson(person); if (b) usedBoard.add(b.id);
    rows.push(mkRow(null, person.latest, b || null, false, person));
  }
  for (const c of candidates) {
    if (usedBoard.has(c.id)) continue;
    rows.push(mkRow(null, null, c, false, null));
  }
  // board rows whose intake_id points at nothing = attention
  for (const c of candidates) {
    if (c.intake_id && !INTAKE_ROWS.some(r => r.id === c.intake_id)) {
      const row = rows.find(x => x.board && x.board.id === c.id);
      if (row) row.attention.push('workspace is linked to a submission that no longer exists');
    }
  }
  const rank = r => r.attention.length ? 0 : (r.linkState === 'submitted' && r.checksState === 'none') ? 1
              : r.checksState === 'active' ? 2 : r.linkState === 'waiting' ? 3 : 4;
  return rows.sort((a, b) => rank(a) - rank(b));

  function mkRow(offer, intake, board, approxPair, person){
    const roster = board ? null : rosterFor(offer, person ? person.submissions : (intake ? [intake] : []));
    const name = (offer && (offer.first_name + ' ' + offer.last_name))
              || (intake && (intake.first_name + ' ' + intake.last_name))
              || (board && (board.first + ' ' + board.last)) || '(unnamed)';
    const offerState = !offer ? 'none'
      : (offer.stall_alerted_at && !offer.step1_done_at) ? 'stalled' : 'sent';
    const linkState = intake ? 'submitted' : (offer ? 'waiting' : 'none');
    let checksState = 'none';
    if (!board && roster) checksState = 'roster';
    if (board) checksState = board.not_hired ? 'not_hired'
      : (obDeriveStatus(board) === 'Ready for Orientation' ? 'ready' : 'active');
    const attention = [];
    if (intake && intake.seen_at && !board && !roster)
      attention.push('was imported before but the workspace is gone. Review.');
    /* Identity: applicant vs caregiver. hire_intake.candidate_id is an AxisCare
       APPLICANT id (pre-hire); a pre-hire applicant is NOT expected on the hired-
       caregiver roster, so its absence there is not an issue. The roster is
       corroborated ONLY for a CAREGIVER-stage id (board.axiscare_id, set once the
       person is hired/linked to a caregiver record). That preserves genuine
       "hired but missing from the roster" detection without flagging applicants. */
    const applicantAxid = intake && intake.candidate_id != null ? String(intake.candidate_id) : null;
    const caregiverAxid = board && board.axiscare_id ? String(board.axiscare_id) : null;
    const identity = (applicantAxid || caregiverAxid) ? {
      axid: caregiverAxid || applicantAxid,
      kind: caregiverAxid ? 'caregiver' : 'applicant',
      onRoster: caregiverAxid ? rosterHit(caregiverAxid) : null,   // null = not applicable (pre-hire applicant)
    } : null;
    if (caregiverAxid && !rosterHit(caregiverAxid))
      attention.push('AxisCare caregiver ' + caregiverAxid + ' recorded but not found on the caregiver roster. Review.');
    /* Submission history: one person may carry several submissions. The earlier
       ones are never discarded; the newest is the representative for the row. */
    const submissions = person ? person.submissions : (intake ? [intake] : []);
    if (person && person.conflict)
      attention.push('submissions were grouped as one person but their AxisCare id / email / phone disagree. Review whether they are the same person.');
    return { name: name.trim(), offer, intake, board, roster, approxPair,
             offerState, linkState, checksState, attention, identity,
             submissions, submissionCount: submissions.length };
  }
}
function renderHirePipeline(){
  const box = document.getElementById('hirePipeline');
  if (!box) return;
  hydrateBanner();
  if (!HYDRATED) {
    box.innerHTML = '<div style="color:#B91C1C;font-size:.85rem;font-weight:600">Shared data has not loaded. '
      + 'The pipeline cannot be shown from a local cache. Use "Try again" above.</div>';
    return;
  }
  const rows = lifecycleRows();
  if (!rows.length) { box.innerHTML = '<div style="color:#A89C8B;font-size:.85rem">Nobody in the hiring pipeline right now.</div>'; return; }
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const chip = (bg, fg, label) =>
    '<span style="font-size:.68rem;font-weight:700;padding:.12rem .5rem;border-radius:999px;white-space:nowrap;background:'
    + bg + ';color:' + fg + '">' + label + '</span>';
  const on  = l => chip('#DCFCE7', '#15803D', '✓ ' + l);
  const off = l => chip('#F3F0EA', '#8A7F70', l);
  const warn = l => chip('#FEF3C7', '#B45309', l);
  const bad  = l => chip('#FEE2E2', '#B91C1C', l);
  const d10 = t => t ? String(t).slice(0, 10) : '';

  /* "Waiting to import" is defined the SAME way People & Checks derives its
     Import group (bgrTriage): submitted, no workspace yet, and no genuine issue.
     A pre-hire AxisCare applicant id is NOT an issue, so it no longer excludes
     the person here — that kept the two views in agreement after the identity
     semantics change. */
  const waiting = rows.filter(r => r.linkState === 'submitted' && r.checksState === 'none' && !r.attention.length).length;
  const head = '<div class="field-note" style="margin-bottom:.4rem">'
    + rows.length + ' in flight · ' + waiting + ' submitted and waiting to be imported</div>';

  box.innerHTML = head + rows.map(r => {
    const pips = [];
    if (r.offer) {
      pips.push(on('offer ' + d10(r.offer.created_at)));
      pips.push(r.offer.attributes_entered_at ? on('AxisCare') : off('AxisCare'));
      pips.push(r.offer.viventium_entered_at ? on('Viventium') : off('Viventium'));
      pips.push(r.offer.step1_done_at ? on('Step 1') : off('Step 1'));
      if (r.offerState === 'stalled') pips.push(warn('no response'));
    }
    if (r.linkState === 'submitted') pips.push(on('start link ' + d10(r.intake.created_at) + (r.approxPair ? ' ~' : '')));
    else if (r.linkState === 'waiting') pips.push(bgrUnk('not submitted · send not recorded'));
    if (r.checksState === 'active') pips.push(on('checks in progress'));
    if (r.checksState === 'ready') pips.push(on('READY for orientation'));
    if (r.checksState === 'not_hired') pips.push(off('not hired'));
    if (r.checksState === 'roster') pips.push(on('On the caregiver roster' + (r.roster.hire_date ? ' (hired ' + esc(r.roster.hire_date) + ')' : '')));
    if (r.identity) pips.push(chip('#E0E7FF', '#3730A3',
      'AxisCare ' + (r.identity.kind === 'caregiver' ? 'caregiver' : 'applicant') + ' #' + esc(r.identity.axid)
      + (r.identity.onRoster === true ? ' · on roster' : (r.identity.onRoster === false ? ' · not on roster' : ''))));

    const actions = [];
    if (r.intake && !r.board && !r.roster)
      actions.push('<button class="ibtn" onclick="intakeImport(\'' + r.intake.id + '\',this)">Import</button>');
    if (r.board)
      actions.push('<button class="ibtn" onclick="openOBModal(' + r.board.id + ')">open</button>');
    if (r.board && !r.board.not_hired && [1,2,3,4].some(n => r.board['r'+n+'n'] && r.board['r'+n+'s'] === 'Pending'))
      actions.push('<button class="ibtn" onclick="askReferences(' + r.board.id + ',this)">Ask references</button>');
    if (r.offer && !r.intake && !r.board && !r.roster)
      actions.push('<button class="ibtn" onclick="offerStartLink(\'' + r.offer.id + '\',this)">Start link</button>');
    /* Gate B: the offer's own step actions live on the person row, so the
       retired Offer a Job tab is not needed to finish an offer. */
    if (r.offer && !r.offer.attributes_entered_at)
      actions.push('<button class="ibtn" onclick="markOfferEntered(\'' + r.offer.id + '\',this)">☑ AxisCare</button>');
    if (r.offer && !r.offer.viventium_entered_at)
      actions.push('<button class="ibtn" onclick="markOfferViventium(\'' + r.offer.id + '\',this)">☑ Viventium</button>');
    if (r.offer && r.offer.viventium_entered_at && !r.offer.step1_done_at)
      actions.push('<button class="ibtn" onclick="markOfferStep1(\'' + r.offer.id + '\',this)">☑ Step 1</button>');
    if (r.offer && !r.intake && !r.board && !r.roster)
      actions.push('<button class="ibtn" title="Optional: open a checks workspace before their start link arrives"'
        + ' onclick="offerToCandidate(\'' + r.offer.id + '\',this)">Start checks early</button>');

    const att = r.attention.map(a => '<div style="font-size:.75rem;color:#B91C1C;font-weight:600">⚠ ' + esc(a) + '</div>').join('');
    return '<div style="padding:.55rem 0;border-top:1px solid #e4e1d8">'
      + '<div style="display:flex;gap:.7rem;align-items:center;flex-wrap:wrap">'
      + '<b style="flex:0 0 160px;color:#0D365F;font-size:.88rem">' + esc(r.name) + '</b>'
      + '<span style="display:flex;gap:.3rem;flex-wrap:wrap;flex:1">' + pips.join('') + '</span>'
      + '<span style="display:flex;gap:.35rem">' + actions.join('') + '</span>'
      + '</div>' + att + '</div>';
  }).join('');
}

/* Import: creates the checks workspace from a submission. WORKSPACE CREATION
   ONLY — it records who did it and it contains no path to any reference
   outreach. Ask References is its own explicit button. */
async function intakeImport(intakeId, btn){
  if (!HYDRATED) { alert('Shared data has not loaded. This section is read-only right now.'); return; }
  const existing = candidates.find(c => c.intake_id === intakeId);
  if (existing) { openOBModal(existing.id); return; }
  /* Already moved to the caregiver roster (welcome call done or office Promote): importing again would make a duplicate. */
  const hired = (typeof caregivers !== 'undefined' ? caregivers : []).find(g => g.intake_id != null && g.intake_id !== '' && String(g.intake_id) === String(intakeId));
  if (hired) { alert(((hired.first || '') + ' ' + (hired.last || '')).trim() + ' is already on the caregiver roster (Training tab). Nothing was imported.'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Importing…'; }
  let who = '';
  try { const { data:{ session } } = await sb.auth.getSession(); who = (session && session.user && session.user.email) || ''; } catch(e){}
  /* Select ONLY the granted columns this import reads. select('*') pulled in the
     ssn column, which authenticated is deliberately denied (SSN column-lock), so
     the read failed with "permission denied" and Import was broken for every
     coordinator. These 7 columns are all SELECT-granted to authenticated. */
  /* no_employer_history (refs_r1r5.sql) is SELECT-granted too. If that script
     has not run yet the column is missing, so retry without it rather than
     breaking Import. */
  let { data: row, error } = await sb.from('hire_intake')
    .select('id, first_name, last_name, phone, email, lived_outside_mo, refs, no_employer_history')
    .eq('id', intakeId).maybeSingle();
  if (error && /no_employer_history/.test(String(error.message || ''))) {
    ({ data: row, error } = await sb.from('hire_intake')
      .select('id, first_name, last_name, phone, email, lived_outside_mo, refs')
      .eq('id', intakeId).maybeSingle());
  }
  if (error || !row) {
    alert('Could not read that submission: ' + (error ? error.message : 'not found'));
    if (btn) { btn.disabled = false; btn.textContent = 'Import'; }
    return;
  }
  const rec = {
    id: safeTmpId(),   /* 421: a temporary number; the database gives the real one below */
    first: row.first_name || '', last: row.last_name || '',
    phone: row.phone || '', email: row.email || '',
    oos: row.lived_outside_mo ? 'yes' : 'no',
    fp: row.lived_outside_mo ? 'Required' : 'N/A',
    oig: 'Pending', edl: 'Pending', fcsr: 'Pending',
    r1s: 'Pending', r2s: 'Pending', r3s: 'Pending', r4s: 'Pending',
    intake_id: row.id,
    imported_by: who, imported_at: new Date().toISOString(),
    notes: 'Imported from their start link by ' + (who || 'staff') + '.',
    invite_sent: false, invite_sent_date: '',
    addedAt: new Date().toISOString(),
  };
  (Array.isArray(row.refs) ? row.refs : []).slice(0, 4).forEach((ref, i) => {
    const n = i + 1;
    rec['r'+n+'n'] = ref.name || '';
    rec['r'+n+'_phone'] = ref.phone || '';
    rec['r'+n+'_email'] = ref.email || '';
    rec['r'+n+'_rel'] = ref.relationship || '';
    rec['r'+n+'_type'] = obRefType(ref.type);
    rec['r'+n+'_company'] = ref.company || '';
    rec['r'+n+'_howlong'] = ref.how_long || '';
  });
  if (row.no_employer_history != null) rec.no_employer_history = !!row.no_employer_history;
  candidates.push(rec);
  /* Gate A (owner ruling 2026-09-22): the workspace must be CONFIRMED in the
     shared database before we mark this submission seen. seen_at is what drops
     them off the import queue, so stamping it on an unconfirmed write is how a
     person could vanish (imported here, never saved there). Persist first, and
     stamp seen_at only if that persist truly succeeded. */
  localStorage.setItem('cc_candidates', JSON.stringify(candidates));
  /* 421: saved one person at a time; true means the database confirmed it AND
     rec.id is now the number the database gave (never a number in use). */
  const persisted = await saveCandidates({ quiet: true });
  if (!persisted) {
    /* Roll the workspace back out of memory and local cache so state stays
       consistent and they REMAIN importable. Nothing was stamped, so their row
       still shows in the queue and a retry starts clean. */
    candidates = candidates.filter(c => c !== rec);
    localStorage.setItem('cc_candidates', JSON.stringify(candidates));
    try { renderOB(); } catch(e) {}
    alert('Could not save this workspace to the shared database, so we did not mark them as imported. Nothing was lost. Try Import again in a moment.');
    if (btn) { btn.disabled = false; btn.textContent = 'Import'; }
    return;
  }
  /* Workspace is confirmed in the shared database. NOW it is safe to mark the
     submission seen. */
  try {
    await sb.from('hire_intake').update({ seen_at: new Date().toISOString() }).eq('id', row.id);
    const local = INTAKE_ROWS.find(r => r.id === row.id);
    if (local) local.seen_at = new Date().toISOString();
  } catch(e) { /* the workspace is saved either way; seen_at can retry, and the dupe-guard re-opens rather than re-creating */ }
  renderOB(); renderAlerts();
  if (btn) { btn.disabled = false; btn.textContent = 'Import'; }
}
/* ══════════════ UI GATE 1 — Background & References (read-only) ══════════════
   People & Checks and Reference Activity are read-only PROJECTIONS of records
   we already store (lifecycleRows + the candidate workspace + reference_requests
   + the automation heartbeat). They perform NO writes, NO function invokes, and
   NO outreach. Gate A (intakeImport / syncToSupabase / the guards) and seen_at
   are untouched. Data loads once per tab open with SELECTs only. Anything we
   cannot prove is shown as "Unknown", "Not recorded", or "Needs review" — never
   a manufactured status. */
let REF_REQUESTS = [];
let BGR_HEARTBEATS = null;        // parsed app_data 'automation_heartbeats' (array)
let BGR_DATA_LOADED = false;
let BGR_DATA_ERR = null;

/* Read-only loads. reference_requests is readable by authenticated staff (RLS
   refreq_auth_all + grant select); the heartbeat is in app_data, the table this
   hub already reads. Neither statement mutates anything. */
async function bgrEnsureData(force){
  if(!HYDRATED){ BGR_DATA_ERR = 'Shared data has not loaded.'; return; }
  if(BGR_DATA_LOADED && !force) return;
  BGR_DATA_ERR = null;
  try{
    const rr = await sb.from('reference_requests')
      .select('id, created_at, candidate_id, candidate_name, slot, ref_name, ref_email, ref_phone, sent_at, reminded_at, reminder_count, responded_at, responder_name, recommend, concerns, applicant_nudged_at, applicant_nudge_count, office_attempts')
      .order('created_at', { ascending: false });
    REF_REQUESTS = (rr && rr.data) ? rr.data : [];
    if(rr && rr.error) BGR_DATA_ERR = 'Could not read reference requests.';
  }catch(e){ REF_REQUESTS = []; BGR_DATA_ERR = 'Could not read reference requests.'; }
  try{
    const hb = await sb.from('app_data').select('data').eq('key','automation_heartbeats').maybeSingle();
    const blob = hb && hb.data && hb.data.data;
    BGR_HEARTBEATS = Array.isArray(blob) ? blob : null;
  }catch(e){ BGR_HEARTBEATS = null; }
  BGR_DATA_LOADED = true;
}

const bgrEsc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const bgrD   = t => t ? String(t).slice(0,10) : '';
function bgrDaysSince(t){ if(!t) return null; const d = Math.floor((Date.now() - new Date(t).getTime())/86400000); return isFinite(d) ? d : null; }
function bgrChip(bg, fg, label){ return '<span style="font-size:.68rem;font-weight:700;padding:.1rem .48rem;border-radius:999px;white-space:nowrap;background:'+bg+';color:'+fg+'">'+label+'</span>'; }
const bgrOn  = l => bgrChip('#DCFCE7','#15803D', l);
const bgrOff = l => bgrChip('#F3F0EA','#8A7F70', l);
const bgrWarn= l => bgrChip('#FEF3C7','#B45309', l);
const bgrBad = l => bgrChip('#FEE2E2','#B91C1C', l);
const bgrUnk = l => bgrChip('#EEF2F7','#5B6472', l);
const bgrOp  = l => bgrChip('#E4EDF7','#2C5A86', l);   // operational, NOT a warning
/* Group tone: only "Needs attention" is urgent (red). "Our next step" is a calm
   operational blue so normal progressing work never looks like a problem. */
function bgrGroupColor(key){
  return key==='attention' ? ['#FEE2E2','#B91C1C']
       : key==='nextstep'  ? ['#E4EDF7','#2C5A86']
       : key==='ready'     ? ['#DCFCE7','#15803D']
       : key==='roster'    ? ['#DCFCE7','#15803D']
       : ['#EEF2F7','#5B6472'];
}

/* Reference rows attached to a board (candidate workspace), factual. */
function bgrReqsFor(board){ return board ? REF_REQUESTS.filter(r => String(r.candidate_id) === String(board.id)) : []; }

/* One-line reference summary from what we actually record. Uses the request
   lifecycle when requests exist; falls back to the workspace slots otherwise. */
function bgrRefsSummary(board){
  if(!board) return { text:'Not applicable', tone:'unk' };
  const onFile = [1,2,3,4].filter(n => board['r'+n+'n']);
  const reqs = bgrReqsFor(board);
  if(onFile.length === 0 && reqs.length === 0) return { text:'None on file', tone:'unk' };
  if(reqs.length === 0) return { text: onFile.length + ' on file · not yet requested', tone:'warn' };
  const responded = reqs.filter(r => r.responded_at).length;
  const awaiting  = reqs.filter(r => r.sent_at && !r.responded_at).length;
  const notSent   = reqs.filter(r => !r.sent_at).length;
  const attempts  = reqs.reduce((n,r)=> n + (Array.isArray(r.office_attempts) ? r.office_attempts.length : 0), 0);
  let text = responded + ' of ' + reqs.length + ' responded';
  if(awaiting) text += ' · ' + awaiting + ' awaiting';
  if(notSent)  text += ' · ' + notSent + ' not sent';
  if(attempts) text += ' · ' + attempts + ' outreach logged';
  return { text, tone: responded === reqs.length ? 'ok' : 'warn' };
}

/* ── Log an office outreach attempt to a reference ──────────────────────────
   Records that a human on the office side TRIED to reach a reference (a call, a
   voicemail, a hand-sent text or email, or something else) with an optional
   note, so a phone-only reference that is being actively worked stops reading as
   untouched. This is manual data entry only: it appends one entry to
   reference_requests.office_attempts and invokes NOTHING (no email, no SMS, no
   automation). Each entry is stamped with who logged it and when. */
const BGR_ATT_METHODS = [
  { k:'call',      label:'Call',           short:'calls' },
  { k:'voicemail', label:'Voicemail',      short:'voicemails' },
  { k:'text',      label:'Text',           short:'texts' },
  { k:'email',     label:'Email',          short:'emails' },
  { k:'other',     label:'Something else', short:'other' }
];
function bgrAttMethodLabel(k){ const m = BGR_ATT_METHODS.find(x=>x.k===k); return m ? m.label : (k||'attempt'); }

/* Factual summary of a request's logged attempts, or null when there are none.
   e.g. "3 attempts · 2 voicemails · 1 call · last Sep 24". */
function bgrAttemptSummary(req){
  const a = Array.isArray(req && req.office_attempts) ? req.office_attempts : [];
  if(!a.length) return null;
  const counts = {};
  a.forEach(x => { const k = (x && x.method) || 'other'; counts[k] = (counts[k]||0) + 1; });
  const bits = [];
  BGR_ATT_METHODS.forEach(m => { if(counts[m.k]) bits.push(counts[m.k] + ' ' + (counts[m.k]===1 ? m.label.toLowerCase() : m.short)); });
  const last = a.map(x => x && x.at).filter(Boolean).sort().slice(-1)[0];
  return {
    count: a.length,
    last, lastD: last ? bgrD(last) : '',
    text: (a.length + (a.length===1 ? ' attempt' : ' attempts'))
        + (bits.length ? ' · ' + bits.join(' · ') : '')
        + (last ? ' · last ' + bgrD(last) : '')
  };
}

/* Append one attempt to a reference request. Returns true on a confirmed write,
   false otherwise (and writes nothing on false). Re-reads the single row first
   so a second logger does not clobber the array. authenticated already holds
   table SELECT/UPDATE on reference_requests (RLS refreq_auth_all) — no RPC. */
async function logRefAttempt(reqId, method, note){
  if(!HYDRATED){ console.warn('BLOCKED logRefAttempt: shared data not loaded'); return false; }
  if(BGR_ATT_METHODS.map(m=>m.k).indexOf(method) < 0) return false;
  let by = '';
  try{ const s = await sb.auth.getSession(); by = (s && s.data && s.data.session && s.data.session.user && s.data.session.user.email) || ''; }catch(e){}
  let current = [];
  try{
    const { data, error } = await sb.from('reference_requests').select('office_attempts').eq('id', reqId).maybeSingle();
    if(error) return false;
    current = Array.isArray(data && data.office_attempts) ? data.office_attempts : [];
  }catch(e){ return false; }
  const entry = { at: new Date().toISOString(), method: method, note: String(note||'').slice(0,280), by: by };
  const next = current.concat([entry]);
  try{
    const { error } = await sb.from('reference_requests').update({ office_attempts: next }).eq('id', reqId);
    if(error) return false;
  }catch(e){ return false; }
  const r = REF_REQUESTS.find(x => String(x.id) === String(reqId));
  if(r) r.office_attempts = next;
  return true;
}

/* Small self-injecting modal so logging works in the embedded hub with no
   index.html markup. Pick a method, add an optional note, Save. */
let _bgrAttReqId = null, _bgrAttMethod = null;
function bgrEnsureAttemptModal(){
  if(document.getElementById('bgrAttemptModal')) return;
  const wrap = document.createElement('div');
  wrap.id = 'bgrAttemptModal';
  wrap.style.cssText = 'display:none;position:fixed;inset:0;z-index:10000;background:rgba(15,54,95,.35);align-items:center;justify-content:center;padding:1rem';
  wrap.innerHTML =
      '<div style="background:#fff;border-radius:12px;max-width:430px;width:100%;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.2)">'
    +   '<div style="font-weight:800;color:#0D365F;font-size:1rem;margin-bottom:.2rem">Log an outreach attempt</div>'
    +   '<div id="bgrAttWho" style="font-size:.82rem;color:#6E6559;margin-bottom:.2rem"></div>'
    +   '<div style="font-size:.72rem;color:#A89C8B;margin-bottom:.7rem">This only records that you tried to reach them. It sends nothing.</div>'
    +   '<div id="bgrAttRefWrap" style="display:none;margin-bottom:.8rem">'
    +     '<div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:#8A7F70;margin-bottom:.25rem">Which reference?</div>'
    +     '<select id="bgrAttRefSel" onchange="bgrAttPickRef()" style="width:100%;padding:.45rem .6rem;border:1px solid var(--border,#d9d4c8);border-radius:8px;font-size:.85rem;box-sizing:border-box"></select>'
    +   '</div>'
    +   '<div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:#8A7F70;margin-bottom:.35rem">How did you reach out?</div>'
    +   '<div id="bgrAttMethods" style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.8rem">'
    +     BGR_ATT_METHODS.map(m => '<button type="button" class="ibtn" data-m="'+m.k+'" onclick="bgrPickAttemptMethod(\''+m.k+'\')">'+bgrEsc(m.label)+'</button>').join('')
    +   '</div>'
    +   '<div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:#8A7F70;margin-bottom:.25rem">Note (optional)</div>'
    +   '<input id="bgrAttNote" maxlength="280" placeholder="e.g. left voicemail, will try again Friday" style="width:100%;padding:.5rem .6rem;border:1px solid var(--border,#d9d4c8);border-radius:8px;font-size:.85rem;margin-bottom:.9rem;box-sizing:border-box">'
    +   '<div style="display:flex;justify-content:flex-end;gap:.5rem">'
    +     '<button type="button" class="ibtn" onclick="bgrCloseAttemptModal()">Cancel</button>'
    +     '<button type="button" class="ibtn" id="bgrAttSave" onclick="bgrSaveAttempt(this)" style="background:#0D365F;color:#fff">Save attempt</button>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(wrap);
}
/* Reflect the currently-targeted request in the "who" line. */
function bgrAttSyncWho(){
  const req = REF_REQUESTS.find(r => String(r.id) === String(_bgrAttReqId));
  const who = document.getElementById('bgrAttWho'); if(!who) return;
  if(!req){ who.textContent = ''; return; }
  who.innerHTML = 'For <b>'+bgrEsc(req.ref_name || ('slot '+req.slot))+'</b>'
    + (req.candidate_name ? (' · '+bgrEsc(req.candidate_name)) : '')
    + (req.ref_phone ? (' · '+bgrEsc(req.ref_phone)) : '');
}
function bgrAttResetForm(){
  const note = document.getElementById('bgrAttNote'); if(note) note.value = '';
  _bgrAttMethod = null;
  Array.prototype.forEach.call(document.querySelectorAll('#bgrAttMethods [data-m]'), b => { b.style.background=''; b.style.color=''; });
}
/* Open for ONE known request (used from the Reference Activity row). */
function bgrOpenAttemptModal(reqId){
  if(!HYDRATED){ alert('Open Background & References first so the shared data loads, then log the attempt.'); return; }
  const req = REF_REQUESTS.find(r => String(r.id) === String(reqId));
  if(!req){ alert('That reference could not be found. Refresh the tab and try again.'); return; }
  bgrEnsureAttemptModal();
  _bgrAttReqId = reqId;
  const wrap = document.getElementById('bgrAttRefWrap'); if(wrap) wrap.style.display = 'none';
  bgrAttResetForm();
  bgrAttSyncWho();
  document.getElementById('bgrAttemptModal').style.display = 'flex';
}
/* Open from a person card. With one reference it targets it directly; with
   several it shows a picker so the attempt lands on the right reference. */
function bgrLogForPerson(boardId){
  if(!HYDRATED){ alert('Open Background & References first so the shared data loads, then log the attempt.'); return; }
  const reqs = REF_REQUESTS.filter(r => String(r.candidate_id) === String(boardId))
                           .slice().sort((a,b)=>(a.slot||0)-(b.slot||0));
  if(!reqs.length){ alert('Click "Ask refs" first. Once a reference is requested you can log the calls and voicemails you make to them.'); return; }
  if(reqs.length === 1){ bgrOpenAttemptModal(reqs[0].id); return; }
  bgrEnsureAttemptModal();
  const sel = document.getElementById('bgrAttRefSel');
  sel.innerHTML = reqs.map(r => {
    const a = bgrAttemptSummary(r);
    return '<option value="'+bgrEsc(String(r.id))+'">'+bgrEsc(r.ref_name || ('slot '+r.slot))
      + (r.ref_phone ? (' · '+bgrEsc(r.ref_phone)) : (r.ref_email ? (' · '+bgrEsc(r.ref_email)) : ''))
      + (a ? (' · '+a.count+' logged') : '') + '</option>';
  }).join('');
  document.getElementById('bgrAttRefWrap').style.display = 'block';
  _bgrAttReqId = sel.value;
  bgrAttResetForm();
  bgrAttSyncWho();
  document.getElementById('bgrAttemptModal').style.display = 'flex';
}
function bgrAttPickRef(){
  const sel = document.getElementById('bgrAttRefSel'); if(!sel) return;
  _bgrAttReqId = sel.value;
  bgrAttSyncWho();
}
function bgrPickAttemptMethod(k){
  _bgrAttMethod = k;
  Array.prototype.forEach.call(document.querySelectorAll('#bgrAttMethods [data-m]'), b => {
    const on = b.getAttribute('data-m') === k;
    b.style.background = on ? '#0D365F' : ''; b.style.color = on ? '#fff' : '';
  });
}
function bgrCloseAttemptModal(){ const m = document.getElementById('bgrAttemptModal'); if(m) m.style.display='none'; _bgrAttReqId=null; _bgrAttMethod=null; }
async function bgrSaveAttempt(btn){
  if(!_bgrAttMethod){ alert('Pick how you reached out first (call, voicemail, text, email, or something else).'); return; }
  const note = ((document.getElementById('bgrAttNote')||{value:''}).value || '').trim().slice(0,280);
  const reqId = _bgrAttReqId;
  if(btn){ btn.disabled=true; btn.textContent='Saving…'; }
  let ok = false;
  try{ ok = await logRefAttempt(reqId, _bgrAttMethod, note); }catch(e){ ok = false; }
  if(btn){ btn.disabled=false; btn.textContent='Save attempt'; }
  if(ok){ bgrCloseAttemptModal(); try{ renderReferenceActivity(); }catch(e){} try{ renderPeopleChecks(); }catch(e){} }
  else { alert('Could not save the attempt. Nothing was recorded — please try again.'); }
}

/* ── Sync reference answers (explicit, gated action) ─────────────────────────
   Brings reference answers that arrived through the online form onto their
   candidate (refReconcile) and stamps screening-cleared for anyone now fully
   done (markScreeningCleared, which is what lets the nightly job delete the SSN
   we promised to remove). This is the deliberate home for those two writes: it
   runs ONLY when a human clicks it, never at boot, and it records an audit
   line. It sends nothing. */
async function bgrSyncRefAnswers(btn){
  if(!HYDRATED){ alert('Open Background & References first so the shared data loads, then sync.'); return; }
  if(btn){ btn.disabled = true; btn._t = btn.textContent; btn.textContent = 'Syncing…'; }
  let merged = 0, cleared = 0, err = null;
  try { merged = (await refReconcile()) || 0; } catch(e){ err = e; }
  if(!err){ try { cleared = (await markScreeningCleared()) || 0; } catch(e){ err = e; } }
  // Audit only a run that changed something or errored, so no-op clicks don't
  // fill the log.
  if(merged || cleared || err){
    let by = '';
    try { const s = await sb.auth.getSession(); by = (s && s.data && s.data.session && s.data.session.user && s.data.session.user.email) || ''; } catch(e){}
    try {
      await sb.rpc('upsert_app_data_item', { target_key: 'audit_log', item: {
        id: 'refsync_' + Date.now(), kind: 'ref_answer_sync', at: new Date().toISOString(),
        by: by, merged: merged, cleared: cleared, ok: !err,
        note: err ? ('error: ' + ((err && err.message) || err)) : ('merged ' + merged + ' answer(s), cleared ' + cleared)
      }});
    } catch(e){ /* audit is best-effort; the work itself already persisted */ }
  }
  try { await bgrEnsureData(true); } catch(e){}
  try { renderPeopleChecks(); } catch(e){}
  try { renderReferenceActivity(); } catch(e){}
  if(btn){ btn.disabled = false; btn.textContent = btn._t || '↻ Sync reference answers'; }
  if(err){ alert('The sync hit a problem and may be incomplete: ' + ((err && err.message) || err) + '\n\nNothing was sent. You can run it again.'); return; }
  if(!merged && !cleared){ alert('Nothing new to sync. Any emailed answers were already on their candidate.'); return; }
  alert('Synced. '
    + (merged ? (merged + ' reference answer' + (merged>1?'s':'') + ' brought onto their candidate. ') : 'No new reference answers. ')
    + (cleared ? (cleared + ' candidate' + (cleared>1?'s':'') + ' now cleared for orientation.') : ''));
}

/* Run the OIG exclusion check for one candidate straight from their card, then
   write the result to their record and re-render. Explicit, gated. */
async function bgrRunOIG(boardId, btn){
  if(!HYDRATED){ alert('Open Background & References first so the shared data loads, then run the check.'); return; }
  const c = candidates.find(x => x.id === boardId);
  if(!c){ alert('That candidate could not be found. Refresh the tab and try again.'); return; }
  if(btn){ btn.disabled = true; btn._t = btn.textContent; btn.textContent = 'Checking…'; }
  try {
    const result = await runOIGCheck(c.first, c.last);
    showOIGResult((c.first + ' ' + c.last).trim(), result,
      (date) => { c.oig = 'CLEAR';   c.oig_date = date; saveCandidates(); try{ renderPeopleChecks(); renderOB(); renderAlerts(); }catch(e){} },
      (date) => { c.oig = 'FLAGGED'; c.oig_date = date; saveCandidates(); try{ renderPeopleChecks(); renderOB(); renderAlerts(); }catch(e){} });
  } catch(e){ alert('OIG check failed: ' + ((e && e.message) || e)); }
  if(btn){ btn.disabled = false; btn.textContent = btn._t || 'Run OIG'; }
}

/* Record a reference's answer from the card. Picks the reference (or opens
   directly when there is only one), then opens the existing scored form. */
let _bgrRefPickCb = null;
function bgrEnsureRefPicker(){
  if(document.getElementById('bgrRefPickModal')) return;
  const w = document.createElement('div');
  w.id = 'bgrRefPickModal';
  w.style.cssText = 'display:none;position:fixed;inset:0;z-index:10000;background:rgba(15,54,95,.35);align-items:center;justify-content:center;padding:1rem';
  w.innerHTML =
      '<div style="background:#fff;border-radius:12px;max-width:420px;width:100%;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.2)">'
    +   '<div id="bgrRefPickTitle" style="font-weight:800;color:#0D365F;font-size:1rem;margin-bottom:.15rem">Which reference?</div>'
    +   '<div id="bgrRefPickSub" style="font-size:.78rem;color:#6E6559;margin-bottom:.8rem"></div>'
    +   '<div id="bgrRefPickList" style="display:flex;flex-direction:column;gap:.4rem"></div>'
    +   '<div style="display:flex;justify-content:flex-end;margin-top:.9rem"><button type="button" class="ibtn" onclick="bgrCloseRefPicker()">Cancel</button></div>'
    + '</div>';
  document.body.appendChild(w);
}
function bgrCloseRefPicker(){ const m = document.getElementById('bgrRefPickModal'); if(m) m.style.display = 'none'; _bgrRefPickCb = null; }
function bgrRefPickChoose(n){ const cb = _bgrRefPickCb; bgrCloseRefPicker(); if(cb) cb(n); }
function bgrPickReferenceSlot(boardId, title, onPick){
  const c = candidates.find(x => x.id === boardId);
  if(!c){ alert('That candidate could not be found. Refresh the tab and try again.'); return; }
  const slots = [1,2,3,4].filter(n => c['r'+n+'n']);
  if(!slots.length){ alert('No references are on file for this candidate yet. Add them from Open, then record their answer.'); return; }
  if(slots.length === 1){ onPick(slots[0]); return; }
  bgrEnsureRefPicker();
  _bgrRefPickCb = onPick;
  document.getElementById('bgrRefPickTitle').textContent = title || 'Which reference?';
  document.getElementById('bgrRefPickSub').textContent = (c.first + ' ' + c.last).trim();
  document.getElementById('bgrRefPickList').innerHTML = slots.map(n =>
    '<button type="button" class="ibtn" style="text-align:left" onclick="bgrRefPickChoose('+n+')">'
    + bgrEsc(c['r'+n+'n']) + ' <span style="color:#8A7F70;font-weight:600">· ' + bgrEsc(c['r'+n+'s'] || 'Pending') + '</span></button>').join('');
  document.getElementById('bgrRefPickModal').style.display = 'flex';
}
function bgrRecordForPerson(boardId){
  if(!HYDRATED){ alert('Open Background & References first so the shared data loads, then record the answer.'); return; }
  bgrPickReferenceSlot(boardId, "Record a reference's answer", (slot) => openManualRef(boardId, slot));
}

/* Background-check summary, per recorded field only. */
function bgrChecksSummary(board){
  if(!board) return { chips:[bgrUnk('Not recorded')], problem:false };
  const chips = [];
  let problem = false;
  const mk = (label, val, clearVals, ran) => {
    if(clearVals.indexOf(val) > -1) return bgrOn(label + ' clear');
    if(val === 'FLAGGED' || val === 'Issues Found'){ problem = true; return bgrBad(label + ' problem'); }
    return ran ? bgrWarn(label + ' pending') : bgrOff(label + ' not started');
  };
  chips.push(mk('OIG', board.oig, ['CLEAR'], !!board.oig_date));
  chips.push(mk('EDL', board.edl, ['Clear'], !!board.edl_date));
  chips.push(mk('FCSR', board.fcsr, ['Clear'], !!board.fcsr_date));
  if(board.oos === 'yes') chips.push(mk('FP', board.fp, ['Clear'], !!board.fp_date));
  else chips.push(bgrOff('FP n/a'));
  return { chips, problem };
}

/* TRIAGE: turn a lifecycle row into {stage, waitingOn, why, next, group}, using
   ONLY factual states. Where evidence is absent the fields say so. This assigns
   Us / Applicant / Reference / External check ONLY when a record supports it;
   otherwise Unknown. It never infers that the applicant is stalling merely from
   an absent submission. */
function bgrTriage(r){
  const board = r.board, offer = r.offer, intake = r.intake;
  // 1) genuine problems / decisions
  if(r.attention && r.attention.length)
    return { stage:'Data needs review', waitingOn:'Us', why:r.attention[0], next:'Review record', group:'attention' };
  if(board && obDeriveStatus(board) === 'Needs Review')
    return { stage:'Needs review', waitingOn:'Us', why:'A check is flagged or a reference is negative', next:'Review and decide', group:'attention' };
  // 1b) moved on to the caregiver roster: done here, nothing to import
  if(r.roster && !board)
    return { stage:'On the caregiver roster', waitingOn:'Nobody', why:'Hired'+(r.roster.hire_date?' '+r.roster.hire_date:'')+'. Training and Compliance track them now', next:'Training tab', group:'roster' };
  // 2) submitted but not imported
  if(intake && !board)
    return { stage:'Submitted, not imported', waitingOn:'Us', why:'Their start-link submission has not been imported', next:'Import', group:'nextstep' };
  // 3) has a workspace
  if(board){
    if(board.not_hired)
      return { stage:'Not hired', waitingOn:'—', why:'Marked not hired', next:'Closed', group:'closed' };
    const status = obDeriveStatus(board);
    if(status === 'Ready for Orientation')
      return { stage:'Ready for orientation', waitingOn:'Us', why:'All required checks are clear', next:'Book orientation', group:'ready' };
    // Awaiting: find the primary factual blocker.
    // LIFECYCLE PREREQUISITES (no invented deadlines, no "old = overdue"):
    //  · "Ask references" only when references are ON FILE and pending. A person
    //    with no references on file is NOT told to request them.
    //  · A background check is only a next step once the person is imported
    //    (a board exists); FP only when they lived outside Missouri (oos==='yes').
    //    A check that does not apply at this stage never becomes our next step.
    const reqs = bgrReqsFor(board);
    const refsPending = [1,2,3,4].some(n => board['r'+n+'n'] && board['r'+n+'s'] === 'Pending');
    if(refsPending){
      const awaiting = reqs.some(x => x.sent_at && !x.responded_at);
      const nudged   = reqs.some(x => x.applicant_nudged_at && !x.responded_at);
      const anyReq   = reqs.length > 0;
      if(!anyReq)   return { stage:'Checks in progress', waitingOn:'Us', why:'References are on file and not yet requested', next:'Ask references', group:'nextstep' };
      if(nudged)    return { stage:'Checks in progress', waitingOn:'Applicant', why:'A reference has not answered; handed to the applicant', next:'Awaiting applicant help', group:'others' };
      if(awaiting)  return { stage:'Checks in progress', waitingOn:'Reference', why:'Reference request sent, awaiting a response', next:'Awaiting reference', group:'others' };
    }
    // background checks
    const fcsrOrdered = !!board.fcsr_date && board.fcsr !== 'Clear';
    if(fcsrOrdered) return { stage:'Checks in progress', waitingOn:'External check', why:'FCSR ordered, awaiting the result', next:'Awaiting FCSR result', group:'others' };
    if(board.oig !== 'CLEAR' && !board.oig_date)  return { stage:'Checks in progress', waitingOn:'Us', why:'OIG check not run yet', next:'Run OIG', group:'nextstep' };
    if(board.edl !== 'Clear' && !board.edl_date)  return { stage:'Checks in progress', waitingOn:'Us', why:'EDL result not recorded', next:'Record EDL', group:'nextstep' };
    if(board.fcsr !== 'Clear' && !board.fcsr_date) return { stage:'Checks in progress', waitingOn:'Us', why:'FCSR not ordered yet', next:'Order FCSR', group:'nextstep' };
    if(board.oos === 'yes' && board.fp !== 'Clear'){
      return board.fp_date
        ? { stage:'Checks in progress', waitingOn:'External check', why:'Fingerprint submitted, awaiting the result', next:'Awaiting fingerprint result', group:'others' }
        : { stage:'Checks in progress', waitingOn:'Us', why:'Fingerprint required, not scheduled', next:'Schedule fingerprint', group:'nextstep' };
    }
    return { stage:'Checks in progress', waitingOn:'Unknown', why:'Needs review', next:'Needs review', group:'others' };
  }
  // 4) offer exists, no submission — send is NOT recorded, so we do not claim
  //    the applicant is holding it.
  if(offer && !intake && !board){
    const days = bgrDaysSince(offer.created_at);
    return { stage:'Start not submitted · send status not recorded', waitingOn:'Unknown',
             why: (days != null ? days + ' days since offer, no submission' : 'No submission on record') + '; whether a start link was sent is not recorded',
             next:'Needs review (start-link send is not tracked)', group:'startunknown' };
  }
  return { stage:'Unknown', waitingOn:'Unknown', why:'No records to determine state', next:'Needs review', group:'others' };
}

const BGR_GROUPS = [
  { key:'attention',    title:'Needs attention',     note:'flagged, inconsistent, or otherwise needs a decision' },
  { key:'nextstep',     title:'Our next step',       note:'progressing normally; the next factual action is ours' },
  { key:'others',       title:'Waiting on others',   note:'reference, applicant, or an external check' },
  { key:'startunknown', title:'Start not confirmed', note:'offer made, no submission, send status not recorded' },
  { key:'ready',        title:'Ready',               note:'all required checks clear' },
  { key:'roster',       title:'On the caregiver roster', note:'hired; Training and Compliance track them now' },
  { key:'closed',       title:'Closed',              note:'not hired' },
];
/* "Us" is operational blue (our action), not amber; the waiting states are
   neutral grey; nothing here is coloured as a problem. */
const bgrWaitTone = w => w==='Us' ? bgrOp : (w==='Unknown' ? bgrUnk : bgrOff);

/* ── Gate 1b: per-person timeline ───────────────────────────────────────────
   A READ-ONLY projection of the SAME records People & Checks already reads
   (offer + hire_intake + workspace + reference_requests). It stores nothing,
   writes nothing, and invents no state. Every line traces to a stored value;
   anything absent reads "Not recorded" / "Not submitted" / "n/a". */
function bgrKey(r){
  if(r.board)  return 'b'+r.board.id;
  if(r.intake) return 'i'+String(r.intake.id).replace(/[^a-z0-9]/gi,'');
  if(r.offer)  return 'o'+String(r.offer.id).replace(/[^a-z0-9]/gi,'');
  return 'x'+String(r.name||'').replace(/[^a-z0-9]/gi,'').slice(0,12);
}
function bgrTLrow(dot, label, value, valColor){
  return '<div style="display:flex;gap:.55rem;padding:.14rem 0">'
    + '<span style="flex:0 0 8px;height:8px;width:8px;border-radius:50%;background:'+dot+';margin-top:.35rem"></span>'
    + '<span style="flex:0 0 148px;font-size:.77rem;color:#4A4A4A">'+bgrEsc(label)+'</span>'
    + '<span style="flex:1;min-width:120px;font-size:.77rem;color:'+(valColor||'#0D365F')+';font-weight:600">'+value+'</span>'
    + '</div>';
}
function bgrTimelineHTML(r, t){
  const board=r.board, intake=r.intake, offer=r.offer;
  const reqs = bgrReqsFor(board);
  const done='#15803D', pend='#C9B99B', prob='#EF4444', unk='#CBD2DA', dim='#A89C8B';
  let h = '';
  h += bgrTLrow(offer?done:unk, 'Offer saved', offer? bgrD(offer.created_at) : 'Not recorded', offer?'#15803D':dim);
  h += bgrTLrow(unk, 'Start link sent', 'Not recorded (send is not tracked)', dim);
  const subs = (r.submissions && r.submissions.length) ? r.submissions : (intake ? [intake] : []);
  if(!subs.length){
    h += bgrTLrow(unk, 'Start submitted', 'Not submitted', dim);
  } else {
    // every submission is history; the newest is the latest, older ones are kept
    subs.forEach((s,i) => h += bgrTLrow(done, 'Start submitted' + (subs.length>1 ? (i===0 ? ' · latest' : ' · earlier') : ''),
      bgrD(s.created_at), '#15803D'));
  }
  if(board){
    const imp = board.imported_at ? bgrD(board.imported_at) : (board.addedAt ? bgrD(board.addedAt) : 'imported, date not recorded');
    h += bgrTLrow(done, 'Imported', imp, '#15803D');
    const onFile = [1,2,3,4].filter(n => board['r'+n+'n']);
    if(!reqs.length && !onFile.length){
      h += bgrTLrow(unk, 'References', 'None on record', dim);
    } else {
      reqs.slice().sort((a,b)=>(a.slot||0)-(b.slot||0)).forEach(q => {
        const parts = [ q.sent_at ? 'sent '+bgrD(q.sent_at) : 'not sent' ];
        if((q.reminder_count||0) > 0) parts.push(q.reminder_count+'× reminded'+(q.reminded_at?' '+bgrD(q.reminded_at):''));
        const qa = bgrAttemptSummary(q);
        if(qa) parts.push(qa.count + (qa.count===1?' office attempt':' office attempts') + (qa.lastD?(' (last '+qa.lastD+')'):''));
        if(q.applicant_nudged_at) parts.push('applicant nudged '+bgrD(q.applicant_nudged_at));
        const neg = q.responded_at && (q.recommend==='no' || q.concerns==='serious');
        parts.push(q.responded_at ? ('responded '+bgrD(q.responded_at)+(neg?' (negative)':'')) : 'awaiting');
        const logBtn = q.responded_at ? '' :
          ' <button class="ibtn" style="padding:.02rem .42rem;font-size:.68rem;font-weight:700;vertical-align:middle" onclick="bgrOpenAttemptModal(\''+bgrEsc(String(q.id))+'\')">+ Log</button>';
        h += bgrTLrow(neg?prob:(q.responded_at?done:pend), 'Reference: '+(q.ref_name||('slot '+q.slot)),
                      parts.join(' · ') + logBtn, neg?'#B91C1C':(q.responded_at?'#15803D':'#B45309'));
      });
      const reqSlots = new Set(reqs.map(q=>q.slot));
      onFile.filter(n=>!reqSlots.has(n)).forEach(n =>
        h += bgrTLrow(pend, 'Reference: '+bgrEsc(board['r'+n+'n']), 'on file, not requested', '#B45309'));
    }
    const chk = (label,val,clear,ran,date) => {
      const text = clear ? ('clear'+(date?' '+bgrD(date):'')) : ((val==='FLAGGED'||val==='Issues Found') ? 'problem' : (ran?'pending':'not started'));
      const color = clear ? '#15803D' : ((val==='FLAGGED'||val==='Issues Found') ? '#B91C1C' : '#8A7F70');
      const dot = clear ? done : ((val==='FLAGGED'||val==='Issues Found') ? prob : pend);
      return bgrTLrow(dot, label, text, color);
    };
    h += chk('OIG', board.oig, board.oig==='CLEAR', !!board.oig_date, board.oig_date);
    h += chk('EDL', board.edl, board.edl==='Clear', !!board.edl_date, board.edl_date);
    h += chk('FCSR', board.fcsr, board.fcsr==='Clear', !!board.fcsr_date, board.fcsr_date);
    if(board.oos==='yes') h += chk('Fingerprint', board.fp, board.fp==='Clear', !!board.fp_date, board.fp_date);
    else h += bgrTLrow(unk, 'Fingerprint', 'n/a (in state)', dim);
  } else if(r.roster){
    h += bgrTLrow(done, 'Caregiver roster', 'On the roster'+(r.roster.hire_date?', hired '+bgrEsc(r.roster.hire_date):'')+' (checks moved with them)', '#15803D');
  } else {
    h += bgrTLrow(unk, 'Imported', 'Not imported', dim);
    h += bgrTLrow(unk, 'Background checks', 'Not started (no workspace)', dim);
  }
  h += '<div style="margin-top:.4rem;padding-top:.35rem;border-top:1px dashed #E5E1D8;font-size:.77rem">'
     + '<b style="color:#8A7F70">Waiting on:</b> '+bgrEsc(t.waitingOn)+' &nbsp;·&nbsp; <b style="color:#8A7F70">Next:</b> '+bgrEsc(t.next)+'</div>';
  return '<div style="margin:.45rem 0 .2rem;padding:.5rem .65rem;background:#FBFAF7;border:1px solid #EEE9DF;border-radius:8px">'
    + '<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:#8A7F70;margin-bottom:.35rem">Timeline · from stored records only</div>'
    + h + '</div>';
}
function bgrToggleTimeline(key, btn){
  const el = document.getElementById('bgrtl-'+key); if(!el) return;
  const opening = (el.style.display === 'none' || !el.style.display);
  el.style.display = opening ? 'block' : 'none';
  if(btn) btn.textContent = opening ? '▾ Timeline' : '▸ Timeline';
}
window.bgrToggleTimeline = bgrToggleTimeline;

function bgrPersonCard(r, t){
  const key = bgrKey(r);
  const refs = bgrRefsSummary(r.board);
  const checks = bgrChecksSummary(r.board);
  const refTone = refs.tone==='ok'?bgrOn:(refs.tone==='warn'?bgrWarn:bgrUnk);
  /* Actions are grouped by what they are, so background checks and reference
     work read as separate things. Open/Timeline are plain navigation; the
     Background and References clusters each carry a small label + divider. */
  const open = r.board ? '<button class="ibtn" onclick="openOBModal('+r.board.id+')">Open</button>'
             : (r.intake && !r.roster ? '<button class="ibtn" onclick="intakeImport(\''+r.intake.id+'\',this)">Import</button>' : '');
  const bgBtns = [], refBtns = [];
  if(r.board){
    const b = r.board;
    if(b.oig !== 'CLEAR' && !b.oig_date) bgBtns.push('<button class="ibtn" onclick="bgrRunOIG('+b.id+',this)" title="Run the OIG exclusion check for this candidate now">Run OIG</button>');
    const refsPending = [1,2,3,4].some(n => b['r'+n+'n'] && b['r'+n+'s'] === 'Pending');
    if(refsPending) refBtns.push('<button class="ibtn" onclick="askReferences('+b.id+',this)" title="Email any reference with an email address; a phone-only reference stays yours to call">&#128233; Ask refs</button>');
    if([1,2,3,4].some(n => b['r'+n+'n'])) refBtns.push('<button class="ibtn" onclick="bgrRecordForPerson('+b.id+')" title="Record a reference&#39;s answer from a phone call or in person">Record answer</button>');
    if(bgrReqsFor(b).length) refBtns.push('<button class="ibtn" onclick="bgrLogForPerson('+b.id+')" title="Record a call, voicemail, or text you made by hand to a reference">+ Log</button>');
  }
  const timeline = '<button class="ibtn ibtn-strong" onclick="bgrToggleTimeline(\''+key+'\',this)">&#9656; Timeline</button>';
  const grp = (label, btns) => btns.length
    ? '<span style="display:inline-flex;align-items:center;gap:.3rem;padding-left:.5rem;border-left:1px solid #E1DBCF">'
      + '<span style="font-size:.58rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#A89C8B">'+label+'</span>'
      + btns.join('') + '</span>'
    : '';
  const actionsHtml = '<span style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;justify-content:flex-end">'
    + open + grp('Background', bgBtns) + grp('References', refBtns) + timeline + '</span>';
  /* Only genuine problems carry the red accent; normal next steps do not. */
  const accent = t.group==='attention' ? 'border-left:3px solid #EF4444;padding-left:.55rem;' : '';
  const metaBits = [];
  if(r.offer && r.offer.created_at) metaBits.push('Offer '+bgrD(r.offer.created_at));
  const sub0 = (r.submissions && r.submissions[0]) || r.intake;
  if(sub0 && sub0.created_at) metaBits.push('started '+bgrD(sub0.created_at));
  if(sub0 && sub0.candidate_id) metaBits.push('applicant #'+bgrEsc(String(sub0.candidate_id)));
  if(r.board && r.board.oos === 'yes') metaBits.push('lived outside MO');
  const metaLine = metaBits.length
    ? '<div style="color:#9a8f7f;font-size:.74rem;margin-top:.15rem">'+metaBits.join(' · ')+'</div>' : '';
  return '<div style="padding:.6rem .1rem;border-top:1px solid #ece9e1;'+accent+'">'
    + '<div style="display:flex;gap:.7rem;align-items:baseline;flex-wrap:wrap">'
    +   '<b style="flex:0 0 150px;color:#0D365F;font-size:.9rem">'+bgrEsc(r.name)+'</b>'
    +   '<span style="flex:1;color:#4A4A4A;font-size:.82rem">'+bgrEsc(t.stage)+'</span>'
    +   (r.submissionCount>1 ? '<span style="flex:0 0 auto;font-size:.72rem;font-weight:600;color:#8A7F70">'+r.submissionCount+' submissions</span>' : '')
    +   actionsHtml
    + '</div>'
    + metaLine
    + '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.35rem;align-items:center">'
    +   bgrWaitTone(t.waitingOn)('Waiting on: '+t.waitingOn)
    +   refTone('Refs: '+refs.text)
    +   checks.chips.join(' ')
    + '</div>'
    + '<div style="margin-top:.3rem;font-size:.78rem;color:#6E6559"><b style="color:#8A7F70;font-weight:700">Why:</b> '+bgrEsc(t.why)+'</div>'
    + '<div style="font-size:.78rem;color:#0D365F"><b style="color:#8A7F70;font-weight:700">Next:</b> '+bgrEsc(t.next)+'</div>'
    + '<div id="bgrtl-'+key+'" style="display:none">'+bgrTimelineHTML(r, t)+'</div>'
    + '</div>';
}

/* Compact, clickable pipeline row. The full record + every action lives in the
   side drawer that opens on click, so the main view stays scannable. */
function bgrCompactRow(r, t){
  const key = bgrKey(r);
  const refs = bgrRefsSummary(r.board);
  const refTone = refs.tone==='ok'?bgrOn:(refs.tone==='warn'?bgrWarn:bgrUnk);
  const checks = bgrChecksSummary(r.board);
  const accent = t.group==='attention' ? '3px solid #EF4444' : '3px solid transparent';
  return '<div role="button" tabindex="0" onclick="bgrOpenDrawer(\''+key+'\')" '
    + 'onkeydown="if(event.key===\'Enter\'){bgrOpenDrawer(\''+key+'\')}" '
    + 'onmouseover="this.style.background=\'#FAF8F3\'" onmouseout="this.style.background=\'\'" '
    + 'style="cursor:pointer;display:flex;gap:.55rem;align-items:center;flex-wrap:wrap;padding:.5rem .55rem;border-top:1px solid #ece9e1;border-left:'+accent+'">'
    +   '<b style="flex:0 0 145px;color:#0D365F;font-size:.88rem">'+bgrEsc(r.name)+'</b>'
    +   '<span style="flex:0 0 auto;color:#4A4A4A;font-size:.78rem;min-width:110px">'+bgrEsc(t.stage)+'</span>'
    +   '<span style="display:flex;gap:.3rem;flex-wrap:wrap;flex:1;align-items:center;min-width:120px">'
    +     bgrWaitTone(t.waitingOn)(t.waitingOn) + refTone('Refs: '+refs.text) + checks.chips.join(' ')
    +   '</span>'
    +   (r.submissionCount>1 ? '<span style="font-size:.68rem;color:#8A7F70;font-weight:700">'+r.submissionCount+' subs</span>' : '')
    +   '<span style="color:#B9AF9E;font-weight:800;font-size:1.05rem;line-height:1">&rsaquo;</span>'
    + '</div>';
}

/* Pure builder so the same output can be rendered in the preview harness. */
function bgrPeopleHTML(rows, term){
  BGR_ROW_INDEX = {};
  rows.forEach(r => { BGR_ROW_INDEX[bgrKey(r)] = r; });
  const q = (term||'').toLowerCase();
  const items = rows
    .map(r => ({ r, t: bgrTriage(r) }))
    .filter(x => !q || x.r.name.toLowerCase().indexOf(q) > -1);
  if(!items.length) return '<div style="color:#A89C8B;font-size:.85rem;padding:.6rem 0">Nobody matches.</div>';
  const counts = {};
  items.forEach(x => { counts[x.t.group] = (counts[x.t.group]||0) + 1; });
  const summary = '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin:.2rem 0 .8rem">'
    + BGR_GROUPS.filter(g=>counts[g.key]).map(g => {
        const c = bgrGroupColor(g.key);
        return bgrChip(c[0], c[1], g.title + ' (' + counts[g.key] + ')');
      }).join('')
    + '</div>';
  let html = summary;
  BGR_GROUPS.forEach(g => {
    const inGroup = items.filter(x => x.t.group === g.key);
    if(!inGroup.length) return;
    // oldest first within a group, so the longest-waiting rises
    inGroup.sort((a,b) => {
      const ka = (a.r.offer&&a.r.offer.created_at) || (a.r.intake&&a.r.intake.created_at) || (a.r.board&&a.r.board.addedAt) || '';
      const kb = (b.r.offer&&b.r.offer.created_at) || (b.r.intake&&b.r.intake.created_at) || (b.r.board&&b.r.board.addedAt) || '';
      return String(ka).localeCompare(String(kb));
    });
    const hc = g.key==='attention' ? '#B91C1C' : '#8A7F70';
    html += '<div style="margin:.6rem 0 .2rem;font-size:.72rem;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:'+hc+'">'
      + bgrEsc(g.title) + ' <span style="font-weight:600;text-transform:none;letter-spacing:0;color:#A89C8B">· ' + bgrEsc(g.note) + '</span></div>';
    html += inGroup.map(x => bgrCompactRow(x.r, x.t)).join('');
  });
  return html;
}

function renderPeopleChecks(){
  const box = document.getElementById('bgrPeople'); if(!box) return;
  if(!HYDRATED){ box.innerHTML = '<div style="color:#B91C1C;font-size:.85rem;font-weight:600">Shared data has not loaded. This view is read-only and cannot be shown from a local cache.</div>'; return; }
  const term = (document.getElementById('bgrPeopleSearch')||{value:''}).value || '';
  let rows = [];
  try{ rows = lifecycleRows(); }catch(e){ rows = []; }
  box.innerHTML = bgrPeopleHTML(rows, term);
  bgrRefreshDrawer();
}

/* ── Side drawer: click a name in the pipeline, get the full record + every
   action in one panel. Reuses the existing derivations; writes go through the
   same handlers as before. ─────────────────────────────────────────────────*/
let BGR_ROW_INDEX = {};
let _bgrDrawerKey = null;
const BGR_CHECKS = [
  { k:'oig',  label:'OIG',         opts:['Pending','CLEAR','FLAGGED'] },
  { k:'edl',  label:'EDL',         opts:['Pending','Clear','Issues Found'] },
  { k:'fcsr', label:'FCSR',        opts:['Pending','Clear','Issues Found'] },
  { k:'fp',   label:'Fingerprint', opts:['N/A','Required','Submitted','Clear','Issues Found'] },
];
function bgrEnsureDrawer(){
  if(document.getElementById('bgrDrawer')) return;
  const bd = document.createElement('div');
  bd.id = 'bgrDrawerBackdrop';
  bd.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(15,54,95,.28);z-index:9998';
  bd.onclick = bgrCloseDrawer;
  const dr = document.createElement('div');
  dr.id = 'bgrDrawer';
  dr.style.cssText = 'position:fixed;top:0;right:0;bottom:0;width:470px;max-width:94vw;background:#fff;box-shadow:-8px 0 30px rgba(0,0,0,.18);z-index:9999;transform:translateX(102%);transition:transform .22s ease;overflow-y:auto';
  document.body.appendChild(bd);
  document.body.appendChild(dr);
}
function bgrOpenDrawer(key){
  const r = BGR_ROW_INDEX[key]; if(!r) return;
  let t; try{ t = bgrTriage(r); }catch(e){ return; }
  bgrEnsureDrawer();
  _bgrDrawerKey = key;
  document.getElementById('bgrDrawer').innerHTML = bgrDrawerHTML(r, t);
  document.getElementById('bgrDrawerBackdrop').style.display = 'block';
  const dr = document.getElementById('bgrDrawer');
  requestAnimationFrame(() => { dr.style.transform = 'translateX(0)'; });
}
function bgrCloseDrawer(){
  const dr = document.getElementById('bgrDrawer'); if(dr) dr.style.transform = 'translateX(102%)';
  const bd = document.getElementById('bgrDrawerBackdrop'); if(bd) bd.style.display = 'none';
  _bgrDrawerKey = null;
}
/* After a write re-renders the list (which rebuilds BGR_ROW_INDEX with fresh
   rows), refresh an open drawer so it shows the new state for the same person. */
function bgrRefreshDrawer(){
  if(!_bgrDrawerKey) return;
  const bd = document.getElementById('bgrDrawerBackdrop');
  if(!bd || bd.style.display === 'none') return;
  const r = BGR_ROW_INDEX[_bgrDrawerKey];
  if(!r){ return; }
  try{ document.getElementById('bgrDrawer').innerHTML = bgrDrawerHTML(r, bgrTriage(r)); }catch(e){}
}
function bgrDrawerHTML(r, t){
  const b = r.board;
  const refs = bgrRefsSummary(b);
  const refTone = refs.tone==='ok'?bgrOn:(refs.tone==='warn'?bgrWarn:bgrUnk);
  const checks = bgrChecksSummary(b);
  const bgBtns = [], refBtns = [];
  if(b){
    if(b.oig !== 'CLEAR' && !b.oig_date) bgBtns.push('<button class="ibtn" onclick="bgrRunOIG('+b.id+',this)">Run OIG</button>');
    bgBtns.push('<button class="ibtn" onclick="bgrRecordCheck('+b.id+',\'edl\')">Record EDL</button>');
    bgBtns.push('<button class="ibtn" onclick="bgrRecordCheck('+b.id+',\'fcsr\')">Record FCSR</button>');
    if(b.oos === 'yes') bgBtns.push('<button class="ibtn" onclick="bgrRecordCheck('+b.id+',\'fp\')">Record fingerprint</button>');
    const refsPending = [1,2,3,4].some(n => b['r'+n+'n'] && b['r'+n+'s'] === 'Pending');
    if(refsPending) refBtns.push('<button class="ibtn" onclick="askReferences('+b.id+',this)">&#128233; Ask refs</button>');
    if([1,2,3,4].some(n => b['r'+n+'n'])) refBtns.push('<button class="ibtn" onclick="bgrRecordForPerson('+b.id+')">Record answer</button>');
    if(bgrReqsFor(b).length) refBtns.push('<button class="ibtn" onclick="bgrLogForPerson('+b.id+')">+ Log</button>');
  } else if(r.intake && !r.roster){
    bgBtns.push('<button class="ibtn ibtn-strong" onclick="intakeImport(\''+r.intake.id+'\',this)">Import</button>');
  }
  const grp = (label, btns) => btns.length
    ? '<div style="margin-top:.7rem"><div style="font-size:.6rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#A89C8B;margin-bottom:.3rem">'+label+'</div>'
      + '<div style="display:flex;gap:.4rem;flex-wrap:wrap">'+btns.join('')+'</div></div>' : '';
  const metaBits = [];
  if(r.offer && r.offer.created_at) metaBits.push('Offer '+bgrD(r.offer.created_at));
  const sub0 = (r.submissions && r.submissions[0]) || r.intake;
  if(sub0 && sub0.created_at) metaBits.push('started '+bgrD(sub0.created_at));
  if(sub0 && sub0.candidate_id) metaBits.push('applicant #'+bgrEsc(String(sub0.candidate_id)));
  if(b && b.oos === 'yes') metaBits.push('lived outside MO');
  const profile = b ? '<button class="ibtn" onclick="openOBModal('+b.id+')" title="Open the full candidate record">Full record &#8599;</button>' : '';
  return ''
    + '<div style="position:sticky;top:0;background:#fff;border-bottom:1px solid #ECE9E1;padding:14px 16px;display:flex;align-items:flex-start;gap:.6rem;z-index:1">'
    +   '<div style="flex:1">'
    +     '<div style="font-weight:800;color:#0D365F;font-size:1.05rem">'+bgrEsc(r.name)+(r.submissionCount>1?' <span style="font-size:.7rem;font-weight:600;color:#8A7F70">'+r.submissionCount+' submissions</span>':'')+'</div>'
    +     '<div style="color:#4A4A4A;font-size:.82rem;margin-top:.1rem">'+bgrEsc(t.stage)+'</div>'
    +     (metaBits.length?'<div style="color:#9a8f7f;font-size:.74rem;margin-top:.15rem">'+metaBits.join(' · ')+'</div>':'')
    +   '</div>'
    +   '<button class="ibtn" onclick="bgrCloseDrawer()" title="Close" style="flex:0 0 auto">&times;</button>'
    + '</div>'
    + '<div style="padding:14px 16px">'
    +   '<div style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;margin-bottom:.5rem">'
    +     bgrWaitTone(t.waitingOn)('Waiting on: '+t.waitingOn) + refTone('Refs: '+refs.text) + checks.chips.join(' ')
    +   '</div>'
    +   '<div style="font-size:.82rem;color:#6E6559"><b style="color:#8A7F70">Why:</b> '+bgrEsc(t.why)+'</div>'
    +   '<div style="font-size:.82rem;color:#0D365F"><b style="color:#8A7F70">Next:</b> '+bgrEsc(t.next)+'</div>'
    +   (profile ? '<div style="margin-top:.6rem">'+profile+'</div>' : '')
    +   grp('Background checks', bgBtns)
    +   grp('References', refBtns)
    +   '<div style="margin-top:.8rem">'+bgrTimelineHTML(r, t)+'</div>'
    + '</div>';
}

/* Record a single background check (EDL / FCSR / Fingerprint) from the drawer.
   Writes through bgrApplyBoardChange so its side effects fire. */
let _bgrCheckCand = null, _bgrCheckWhich = null;
function bgrEnsureCheckModal(){
  if(document.getElementById('bgrCheckModal')) return;
  const w = document.createElement('div');
  w.id = 'bgrCheckModal';
  w.style.cssText = 'display:none;position:fixed;inset:0;z-index:10001;background:rgba(15,54,95,.35);align-items:center;justify-content:center;padding:1rem';
  const lbl = 'font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:#8A7F70;margin:.5rem 0 .25rem';
  const inp = 'width:100%;padding:.5rem .6rem;border:1px solid var(--border,#d9d4c8);border-radius:8px;font-size:.85rem;box-sizing:border-box';
  w.innerHTML =
      '<div style="background:#fff;border-radius:12px;max-width:420px;width:100%;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.2)">'
    +   '<div id="bgrCheckTitle" style="font-weight:800;color:#0D365F;font-size:1rem;margin-bottom:.2rem">Record a background check</div>'
    +   '<div style="font-size:.72rem;color:#A89C8B;margin-bottom:.5rem">Records the result on the candidate. Reaching all-clear can move them to Ready and sync to AxisCare.</div>'
    +   '<div style="'+lbl+'">Result</div><select id="bgrCheckResult" style="'+inp+'"></select>'
    +   '<div style="'+lbl+'">Date</div><input id="bgrCheckDate" type="date" style="'+inp+'">'
    +   '<div style="'+lbl+'">Proof document <span style="font-weight:400;text-transform:none;letter-spacing:0;color:#A89C8B">(PDF or photo — saved privately for audit)</span></div>'
    +   '<input id="bgrCheckFile" type="file" accept=".pdf,image/*" style="'+inp+';padding:.4rem">'
    +   '<div id="bgrCheckCurrent" style="font-size:.74rem;color:#6E6559;margin:.35rem 0 0"></div>'
    +   '<div style="'+lbl+'">…or paste a link instead</div><input id="bgrCheckProof" type="url" placeholder="https://…" style="'+inp+'">'
    +   '<div style="display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem">'
    +     '<button class="ibtn" onclick="bgrCloseCheckModal()">Cancel</button>'
    +     '<button class="ibtn ibtn-strong" onclick="bgrSaveCheck(this)">Save</button>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(w);
}
function bgrRecordCheck(candId, which){
  if(!HYDRATED){ alert('Open Background & References first so the shared data loads, then record the check.'); return; }
  const c = candidates.find(x => x.id === candId);
  if(!c){ alert('That candidate could not be found. Refresh the tab and try again.'); return; }
  const meta = BGR_CHECKS.find(x => x.k === which); if(!meta) return;
  bgrEnsureCheckModal();
  _bgrCheckCand = candId; _bgrCheckWhich = which;
  document.getElementById('bgrCheckTitle').textContent = 'Record ' + meta.label + ' — ' + (c.first + ' ' + c.last).trim();
  const cur = c[which] || meta.opts[0];
  document.getElementById('bgrCheckResult').innerHTML = meta.opts.map(o => '<option value="'+bgrEsc(o)+'"'+(o===cur?' selected':'')+'>'+bgrEsc(o)+'</option>').join('');
  document.getElementById('bgrCheckDate').value = c[which+'_date'] || new Date().toISOString().slice(0,10);
  const f = document.getElementById('bgrCheckFile'); if(f) f.value = '';
  const url = document.getElementById('bgrCheckProof'); if(url) url.value = '';
  const curDoc = c[which+'_proof'];
  document.getElementById('bgrCheckCurrent').innerHTML = curDoc
    ? 'On file: <a class="proof-link" style="cursor:pointer;color:var(--teal)" onclick="bgrViewProof(\''+bgrEsc(curDoc).replace(/\x27/g,'')+'\')">📄 View document</a> — upload a new one to replace it.'
    : '<span style="color:#A89C8B">No document on file yet.</span>';
  document.getElementById('bgrCheckModal').style.display = 'flex';
}
function bgrCloseCheckModal(){ const m = document.getElementById('bgrCheckModal'); if(m) m.style.display = 'none'; _bgrCheckCand = null; _bgrCheckWhich = null; }
async function bgrSaveCheck(btn){
  const candId = _bgrCheckCand, which = _bgrCheckWhich;
  if(candId == null || !which) return;
  const changes = {};
  changes[which] = document.getElementById('bgrCheckResult').value;
  changes[which+'_date'] = document.getElementById('bgrCheckDate').value;
  const fileInput = document.getElementById('bgrCheckFile');
  const file = fileInput && fileInput.files && fileInput.files[0];
  const urlVal = (document.getElementById('bgrCheckProof').value || '').trim();
  const restore = () => { if(btn){ btn.disabled = false; btn.textContent = btn._t || 'Save'; } };
  if(btn){ btn.disabled = true; btn._t = btn.textContent; btn.textContent = 'Saving…'; }
  if(file){
    if(file.size > 20*1024*1024){ alert('That file is over 20 MB — please shrink it first.'); restore(); return; }
    const safe = String(file.name).replace(/[^a-zA-Z0-9._-]/g,'_');
    const path = 'bgcheck/' + candId + '/' + which + '-' + Date.now() + '-' + safe;
    try{
      const { error } = await sb.storage.from('lead-docs').upload(path, file);
      if(error){ alert('Upload failed: ' + error.message); restore(); return; }
      changes[which+'_proof'] = path;
    }catch(e){ alert('Upload failed. Nothing was saved — please try again.'); restore(); return; }
  } else if(urlVal){
    changes[which+'_proof'] = urlVal;
  }
  restore();
  bgrCloseCheckModal();
  bgrApplyBoardChange(candId, changes);
  if(changes[which+'_proof']) bgrPushDocToGHL(candId, which, changes[which+'_proof']);  // fire-and-forget
}
/* File the proof onto the caregiver's GoHighLevel contact (a note + secure link
   now; the file itself lands in GHL's media library once the token has the
   medias.write scope — no code change needed then) and send a Google Drive copy
   through the candidate webhook. This files a document; it never messages the
   caregiver. */
async function bgrPushDocToGHL(candId, which, proof, labelOverride){
  const c = candidates.find(x => x.id === candId);
  if(!c || (!c.email && !c.phone) || !proof) return;
  /* labelOverride (R3): a reference PDF reads "Reference 1 (Professional): Jane Doe". */
  const label = labelOverride || (({oig:'OIG',edl:'EDL',fcsr:'FCSR',fp:'Fingerprint'}[which] || which) + ' background check');
  const fname = /^https?:\/\//i.test(proof) ? 'document' : (String(proof).split('/').pop() || 'document.pdf');
  /* T2 (2026-09-28): filed onto the GoHighLevel contact with your own sign-in. The function fetches the document
     from our storage by a 10-minute link right away; no long-lived link goes to GoHighLevel, and a pasted outside
     link is never sent (the contact just gets a note that the document is in the Hub). */
  let ghlLink = '';
  if(!/^https?:\/\//i.test(proof)){
    try{ const { data } = await sb.storage.from('lead-docs').createSignedUrl(proof, 600); ghlLink = (data && data.signedUrl) || ''; }catch(e){ ghlLink = ''; }
  }
  try{
    await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/ghl-attach-doc', {
      method: 'POST', headers: { 'x-hub-token': await trainHubTok(), 'apikey': TRAINING_HUB_ANON, 'Authorization': 'Bearer '+TRAINING_HUB_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ first: c.first||'', last: c.last||'', email: c.email||'', phone: c.phone||'', label, file_url: ghlLink || undefined, file_name: fname })
    });
  }catch(e){ console.warn('GHL doc attach skipped', e); }
}
/* Open a proof: a pasted http link directly, or a private storage path via a
   short-lived signed URL. */
async function bgrViewProof(proof){
  if(!proof) return;
  if(/^https?:\/\//i.test(proof)){ window.open(proof, '_blank', 'noopener'); return; }
  try{
    const { data, error } = await sb.storage.from('lead-docs').createSignedUrl(proof, 3600);
    if(error || !data){ alert('Could not open the document: ' + (error ? error.message : 'unknown')); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  }catch(e){ alert('Could not open the document.'); }
}
/* Proof display for a check cell: works for both a pasted link and an uploaded
   private document (opens via a signed URL). */
function bgrCheckProofHtml(proof){
  if(!proof) return '';
  return ' <a class="proof-link" style="cursor:pointer" onclick="bgrViewProof(\''+bgrEsc(proof).replace(/\x27/g,'')+'\')" title="Open the proof document">📄 doc</a>';
}

/* ── Reference Activity (observational) ─────────────────────────────────────
   Automation-health language is EVIDENCE-BASED: a heartbeat proves a run
   happened at a time; its absence or staleness does NOT prove OFF or ERROR,
   and the browser cannot read the cron, so we never claim RUNNING/OFF/ERROR. */
const BGR_CHASE_WINDOW_H = 80;   // reference-chase allowed window (automation-watchdog)
function bgrHealthModel(){
  const beat = Array.isArray(BGR_HEARTBEATS) ? BGR_HEARTBEATS.find(b => b && b.automation === 'reference-chase') : null;
  let heartbeat = 'None recorded', ageH = null, lastSuccess = 'No successful run recorded', lastNote = '';
  if(beat && beat.at){
    ageH = (Date.now() - new Date(beat.at).getTime())/3600000;
    heartbeat = (ageH <= BGR_CHASE_WINDOW_H) ? 'Recent' : 'Stale';
    if(beat.ok !== false) lastSuccess = bgrD(beat.at) + ' (' + Math.round(ageH) + 'h ago)';
    else { lastSuccess = 'No successful run recorded'; lastNote = 'Last recorded run (' + bgrD(beat.at) + ') reported a problem'; }
  }
  const sent = REF_REQUESTS.filter(r => r.sent_at);
  const awaiting = sent.filter(r => !r.responded_at).length;
  const responses = REF_REQUESTS.filter(r => r.responded_at).length;
  const needs = REF_REQUESTS.filter(r => r.responded_at && (r.recommend === 'no' || r.concerns === 'serious')).length;
  return { heartbeat, lastSuccess, lastNote, awaiting, responses, needs };
}

function bgrRefActivityHTML(){
  if(!HYDRATED) return '<div style="color:#B91C1C;font-size:.85rem;font-weight:600">Shared data has not loaded. This view is read-only and cannot be shown from a local cache.</div>';
  const h = bgrHealthModel();
  const line = (k,v) => '<div style="display:flex;justify-content:space-between;gap:1rem;padding:.2rem 0;font-size:.82rem"><span style="color:#8A7F70">'+k+'</span><span style="color:#0D365F;font-weight:600;text-align:right">'+v+'</span></div>';
  const hbTone = h.heartbeat==='Recent'?'#15803D':(h.heartbeat==='Stale'?'#B45309':'#5B6472');
  let health = '<div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:14px">'
    + '<div style="font-weight:800;color:#0D365F;font-size:.9rem;margin-bottom:.3rem">Automation activity</div>'
    + line('Last recorded successful run', bgrEsc(h.lastSuccess))
    + (h.lastNote ? '<div style="font-size:.76rem;color:#B45309;margin:-.05rem 0 .15rem">'+bgrEsc(h.lastNote)+'</div>' : '')
    + line('Heartbeat status', '<span style="color:'+hbTone+'">'+h.heartbeat+'</span>')
    + line('Schedule', 'Not visible from Hub')
    + line('Requests awaiting response', String(h.awaiting))
    + line('Responses received', String(h.responses))
    + line('Needs attention (negative or serious)', String(h.needs))
    + '<div style="font-size:.72rem;color:#A89C8B;margin-top:.4rem">A heartbeat proves a run happened. A missing or stale one does not by itself prove the automation is off or errored, and the schedule is not readable from here. We do not track delivery or opens.</div>'
    + (BGR_DATA_ERR ? '<div style="font-size:.76rem;color:#B91C1C;margin-top:.3rem">'+bgrEsc(BGR_DATA_ERR)+'</div>' : '')
    + '</div>';

  if(!REF_REQUESTS.length) return health + '<div style="color:#A89C8B;font-size:.85rem">No reference requests on record yet.</div>';
  const rowsHtml = REF_REQUESTS.map(r => {
    const cell = (label, val, tone) => '<td style="padding:.4rem .5rem;white-space:nowrap">'+(val ? (tone||bgrOn)(label) : bgrOff('—'))+'</td>';
    const reminders = (r.reminder_count||0) > 0 ? bgrWarn((r.reminder_count)+'× '+(bgrD(r.reminded_at)||'')) : bgrOff('none');
    const responded = r.responded_at
      ? ((r.recommend==='no'||r.concerns==='serious') ? bgrBad('responded '+bgrD(r.responded_at)) : bgrOn('responded '+bgrD(r.responded_at)))
      : bgrOff('—');
    const needs = (r.responded_at && (r.recommend==='no'||r.concerns==='serious')) ? bgrBad('review') : bgrOff('—');
    const att = bgrAttemptSummary(r);
    const attCell = '<td style="padding:.4rem .5rem;font-size:.76rem;color:#4A4A4A;min-width:120px">'
      + (att ? bgrEsc(att.text) : bgrOff('none logged')) + '</td>';
    const logCell = '<td style="padding:.4rem .5rem;white-space:nowrap">'
      + '<button class="ibtn" onclick="bgrOpenAttemptModal(\''+bgrEsc(String(r.id))+'\')" title="Record a call, voicemail, text, or email you made by hand">+ Log</button></td>';
    return '<tr style="border-top:1px solid #ece9e1">'
      + '<td style="padding:.4rem .5rem">'+bgrEsc(r.candidate_name||('#'+r.candidate_id))+'</td>'
      + '<td style="padding:.4rem .5rem">'+bgrEsc(r.ref_name||('slot '+r.slot))+'</td>'
      + '<td style="padding:.4rem .5rem;white-space:nowrap">'+(bgrD(r.created_at)||bgrUnk('—'))+'</td>'
      + cell('sent '+(bgrD(r.sent_at)||''), r.sent_at)
      + '<td style="padding:.4rem .5rem">'+reminders+'</td>'
      + '<td style="padding:.4rem .5rem">'+responded+'</td>'
      + cell('nudged '+(bgrD(r.applicant_nudged_at)||''), r.applicant_nudged_at, bgrWarn)
      + attCell
      + logCell
      + '<td style="padding:.4rem .5rem">'+(r.responder_name?bgrEsc(r.responder_name):bgrUnk('Not recorded'))+'</td>'
      + '<td style="padding:.4rem .5rem">'+needs+'</td>'
      + '</tr>';
  }).join('');
  return health
    + '<div style="font-size:.78rem;color:#6E6559;margin:0 0 .5rem">A reference with only a phone number is never texted automatically. Use <b>+ Log</b> to record each call, voicemail, or text you make by hand so it stops looking untouched.</div>'
    + '<div class="tbl-wrap"><table><thead><tr>'
    + ['Candidate','Reference','Requested','Sent','Reminders','Responded','Applicant nudged','Office attempts','Log','Response source','Needs attention']
        .map(h2 => '<th>'+h2+'</th>').join('')
    + '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';
}

function renderReferenceActivity(){
  const box = document.getElementById('bgrRefActivity'); if(!box) return;
  box.innerHTML = bgrRefActivityHTML();
}

/* Fired on tab open and subtab switch. Loads read-only data once, then renders
   the two dynamic views. No writes, no invokes. */
async function bgrOnOpen(){
  try{ await bgrEnsureData(false); }catch(e){}
  try{ renderOB(); }catch(e){}
  try{ renderPeopleChecks(); }catch(e){}
  try{ renderReferenceActivity(); }catch(e){}
}

/* Called by the subtab bar (index.html) after it flips the mode class. */
/* ── Pre-Hire Background Checks — audit roster ───────────────────────────────
   One screen a state auditor can scan: every person and their four pre-hire
   screenings (OIG / EDL / FCSR / Fingerprint) with the document on file.
   Read-only. Kept separate from ongoing/annual checks. */
/* prehire.refs shape (SPEC): [{slot, name, type, company, status, date, pdf}] plus (2026-10-01, her ask: open what they
   said from the caregiver profile even without a PDF) relationship, how_long, phone, email and answers (the r{n}_manual). */
function obPrehireRefs(c){
  return [1,2,3,4].filter(n=>String(c[`r${n}n`]||'').trim()).map(n=>{
    const m=c[`r${n}_manual`]||{};
    return { slot:n, name:String(c[`r${n}n`]).trim(), type:obRefType(m.type||c[`r${n}_type`]),
      company:c[`r${n}_company`]||m.employer_confirmed||'', status:c[`r${n}s`]||'Pending',
      date:m.date||'', pdf:c[`r${n}_pdf`]||'',
      relationship:m.relationship||c[`r${n}_rel`]||'', how_long:m.how_long||c[`r${n}_howlong`]||'',
      phone:c[`r${n}_phone`]||'', email:c[`r${n}_email`]||'',
      /* Office send (Desktop 377): their OK to a text, and how the form went out. */
      sms_ok:c[`r${n}_sms_ok`]?Object.assign({},c[`r${n}_sms_ok`]):null, sent:c[`r${n}_sent`]?Object.assign({},c[`r${n}_sent`]):null,
      answers:(c[`r${n}_manual`]&&typeof c[`r${n}_manual`]==='object')?JSON.parse(JSON.stringify(c[`r${n}_manual`])):null };
  });
}
function preHireRows(){
  const rows = [];
  const cand = (typeof candidates !== 'undefined' && candidates) ? candidates : [];
  cand.forEach(c => {
    if(c.not_hired) return;
    rows.push({ name:(c.first+' '+c.last).trim(), stage:'In pipeline',
      oig:{s:c.oig||'',d:c.oig_date||'',p:c.oig_proof||''},
      edl:{s:c.edl||'',d:c.edl_date||'',p:c.edl_proof||''},
      fcsr:{s:c.fcsr||'',d:c.fcsr_date||'',p:c.fcsr_proof||''},
      fp:{s:c.fp||'',d:c.fp_date||'',p:c.fp_proof||'',applicable:c.oos==='yes'}, refs:obPrehireRefs(c) });
  });
  const cgs = (typeof caregivers !== 'undefined' && caregivers) ? caregivers : [];
  cgs.forEach(cg => {
    if(cg.not_hired) return;
    const ph = cg.prehire;
    /* The hire snapshot stores {status, date, proof}; this list reads {s, d, p}. Reading only the latter made every
       hired caregiver show "Pending / no document" (fixed 2026-10-01). Either shape is accepted, and a missing piece
       falls back to the caregiver's own check fields. */
    const own = { oig:{s:cg.oig_status,d:cg.oig_date,p:cg.oig_proof}, edl:{s:cg.edl_status,d:cg.edl_date,p:cg.edl_proof},
                  fcsr:{s:cg.fcsr_status,d:cg.fcsr_date,p:cg.fcsr_proof}, fp:{s:cg.fp,d:cg.fp_date,p:cg.fp_proof} };
    const nz = (k) => { const o = (ph && ph[k]) || {}, f = own[k];
      const r = { s: o.s ?? o.status ?? f.s ?? '', d: o.d ?? o.date ?? f.d ?? '', p: o.p ?? o.proof ?? f.p ?? '' };
      if(k === 'fp') r.applicable = (o.applicable !== undefined) ? o.applicable : cg.oos === 'yes';
      return r; };
    rows.push(ph
      ? { name:(cg.first+' '+cg.last).trim(), stage:'Hired', oig:nz('oig'), edl:nz('edl'), fcsr:nz('fcsr'), fp:nz('fp'), refs:Array.isArray(ph.refs)?ph.refs:null }
      : { name:(cg.first+' '+cg.last).trim(), stage:'Hired',
          oig:{s:cg.oig_status||'',d:cg.oig_date||'',p:cg.oig_proof||''},
          edl:{s:cg.edl_status||'',d:cg.edl_date||'',p:cg.edl_proof||''},
          fcsr:{s:cg.fcsr_status||'',d:cg.fcsr_date||'',p:cg.fcsr_proof||''},
          fp:{s:cg.fp||'',d:cg.fp_date||'',p:cg.fp_proof||'',applicable:cg.oos==='yes'}, refs:null });
  });
  rows.sort((a,b)=>a.name.localeCompare(b.name));
  return rows;
}
function preHireStatus(r){
  const issue = r.oig.s==='FLAGGED' || r.edl.s==='Issues Found' || r.fcsr.s==='Issues Found' || r.fp.s==='Issues Found';
  const fpOk = !r.fp.applicable || r.fp.s==='Clear' || r.fp.s==='N/A';
  const complete = r.oig.s==='CLEAR' && r.edl.s==='Clear' && r.fcsr.s==='Clear' && fpOk;
  return issue ? 'attention' : complete ? 'complete' : 'progress';
}
function bgrAuditHTML(forPrint){
  const rows = preHireRows();
  const chkCell = (label, obj, clearVal) => {
    const st = obj.s || 'Pending';
    const isClear = obj.s===clearVal || obj.s==='N/A';
    const isBad = obj.s==='FLAGGED' || obj.s==='Issues Found';
    const naFp = (label==='FP' && obj.applicable===false && !obj.s);
    const badge = naFp ? bgrOff('n/a') : (isClear ? bgrOn(st) : isBad ? bgrBad(st) : bgrOff(st));
    const date = obj.d ? '<div style="font-size:.66rem;color:#8A7F70">'+bgrD(obj.d)+'</div>' : '';
    const doc = obj.p
      ? (forPrint ? '<div style="font-size:.62rem;color:#15803D">document on file</div>' : '<div>'+bgrCheckProofHtml(obj.p)+'</div>')
      : (naFp ? '' : '<div style="font-size:.62rem;color:#B45309">no document</div>');
    return '<td style="padding:.4rem .5rem;vertical-align:top">'+badge+date+doc+'</td>';
  };
  /* References column (R3). null = hired before references were carried over. */
  const refCell = refs => {
    if(!Array.isArray(refs)) return '<td style="padding:.4rem .5rem;vertical-align:top;font-size:.7rem;color:#8A7F70">Kept in the hiring file (hired before Oct 2026)</td>';
    if(!refs.length) return '<td style="padding:.4rem .5rem;vertical-align:top">'+bgrOff('None given')+'</td>';
    const pos = refs.filter(x=>x.status==='Positive').length;
    const lines = refs.map(x => {
      const st = x.status||'Pending';
      const col = st==='Positive'?'#15803D':st==='Negative'?'#B91C1C':st==='Conditional'?'#B45309':'#8A7F70';
      const tl = obRefTypeLabel(x.type, x.company);
      const pdf = x.pdf ? (forPrint ? ' · PDF on file' : ' <a class="proof-link" style="cursor:pointer" onclick="bgrViewProof(\''+bgrEsc(x.pdf).replace(/\x27/g,'')+'\')">📄 PDF</a>') : '';
      return '<div style="font-size:.7rem;line-height:1.35"><b style="color:'+col+'">'+bgrEsc(st)+'</b> '+bgrEsc(x.name||'')+(tl?' <span style="color:#8A7F70">('+bgrEsc(tl)+')</span>':'')+pdf+'</div>';
    }).join('');
    return '<td style="padding:.4rem .5rem;vertical-align:top"><div style="font-size:.74rem;font-weight:700;color:'+(pos>=2?'#15803D':'#B45309')+'">'+pos+' of '+refs.length+' positive</div>'+lines+'</td>';
  };
  const body = rows.map(r => {
    const s = preHireStatus(r);
    const overall = s==='complete' ? bgrOn('✓ Complete') : s==='attention' ? bgrBad('Needs attention') : bgrWarn('In progress');
    return '<tr style="border-top:1px solid #ece9e1">'
      + '<td style="padding:.4rem .5rem;vertical-align:top;font-weight:700;color:#0D365F">'+bgrEsc(r.name)+'<div style="font-size:.66rem;font-weight:600;color:#8A7F70">'+bgrEsc(r.stage)+'</div></td>'
      + chkCell('OIG', r.oig, 'CLEAR') + chkCell('EDL', r.edl, 'Clear') + chkCell('FCSR', r.fcsr, 'Clear') + chkCell('FP', r.fp, 'Clear')
      + refCell(r.refs)
      + '<td style="padding:.4rem .5rem;vertical-align:top">'+overall+'</td>'
      + '</tr>';
  }).join('');
  const head = ['Caregiver','OIG','EDL','FCSR','Fingerprint','References','Pre-hire status'].map(h=>'<th style="text-align:left;padding:.4rem .5rem;font-size:.68rem;text-transform:uppercase;letter-spacing:.03em;color:#8A7F70;background:#F6F3EC">'+h+'</th>').join('');
  const total = rows.length, complete = rows.filter(r=>preHireStatus(r)==='complete').length, attn = rows.filter(r=>preHireStatus(r)==='attention').length;
  const summary = total ? '<div style="font-size:.82rem;color:#0D365F;margin:.2rem 0 .6rem"><b>'+complete+' of '+total+'</b> have all pre-hire screenings clear'+(attn?' · <span style="color:#B91C1C;font-weight:700">'+attn+' need attention</span>':'')+'.</div>' : '';
  return summary + '<div class="tbl-wrap"><table style="width:100%;border-collapse:collapse"><thead><tr>'+head+'</tr></thead><tbody>'+(body||'<tr><td colspan="7" style="padding:.6rem;color:#A89C8B">Nobody on record yet.</td></tr>')+'</tbody></table></div>';
}
function renderPreHireAudit(){
  const box = document.getElementById('bgrAudit'); if(!box) return;
  if(!HYDRATED){ box.innerHTML = '<div style="color:#B91C1C;font-weight:600">Shared data has not loaded.</div>'; return; }
  box.innerHTML =
      '<div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;margin-bottom:.5rem">'
    +   '<b style="font-size:1rem;color:#0D365F">Pre-Hire Background Checks</b>'
    +   '<button class="ibtn" onclick="bgrPrintAudit()">&#128424; Print binder</button>'
    +   '<span class="field-note" style="flex:1;min-width:200px">The screenings completed before hire, with the document on file. Separate from ongoing and annual checks.</span>'
    + '</div>'
    + bgrAuditHTML(false);
}
function bgrPrintAudit(){
  const w = window.open('', '_blank'); if(!w){ alert('Please allow pop-ups to print the binder.'); return; }
  const when = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  w.document.write('<html><head><title>Pre-Hire Background Checks — Caring Companions</title>'
    + '<style>body{font-family:system-ui,Arial,sans-serif;color:#1a1a1a;padding:24px}h1{color:#0D365F;font-size:18px;margin:0 0 2px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}</style>'
    + '</head><body><h1>Pre-Hire Background Checks</h1><div style="color:#666;font-size:12px;margin-bottom:12px">Caring Companions &middot; generated '+when+'</div>'
    + bgrAuditHTML(true)
    + '</body></html>');
  w.document.close(); w.focus(); setTimeout(()=>{ try{ w.print(); }catch(e){} }, 350);
}

function bgrRenderSub(which){
  if(which === 'people') renderPeopleChecks();
  else if(which === 'refs') renderReferenceActivity();
  else if(which === 'audit') renderPreHireAudit();
}

/* Tab-open entry: keep the legacy table working, then load + render the new
   read-only views. */
function renderBGRTab(){
  try{ renderOB(); }catch(e){}
  bgrOnOpen();
}

/* When shared data finishes loading, the legacy views refresh via renderAll,
   but the new read-only views are NOT in that path. Re-render them on the
   hydration signal so People & Checks / Reference Activity never stay stuck on
   "shared data has not loaded" after a load that actually succeeded. Read-only. */
try{ window.addEventListener('scx-hydrated', function(){ try{ bgrOnOpen(); }catch(e){} }); }catch(e){}

/* ── References R1–R5 (2026-10-01, her "yes to all") ─────────────────────────
   Professional vs personal references, the dates check, the reference PDF and
   reference search. See refs_r1r5 SPEC. Pure helpers first, then the few that
   read or write, which only ever run from an explicit click (Save Reference,
   Sync reference answers, Make reference PDFs). Nothing here runs at boot. */
function obRefType(v){
  const t=String(v||'').trim().toLowerCase();
  return t==='professional'?'professional':t==='personal'?'personal':'';
}
function obRefTypeLabel(type, company){
  const t=obRefType(type);
  if(t==='professional') return 'Professional'+(company?' · '+company:'');
  if(t==='personal') return 'Personal';
  return '';
}
/* Under the name in the B&R cell (her ask, 2026-10-01): who they are to the
   applicant at a glance. "Professional · <Company> · <role>" or
   "Personal · <relationship> · <how long>". */
function obRefCellTypeLine(c,n){
  const m=c[`r${n}_manual`]||{};
  const t=obRefType(m.type||c[`r${n}_type`]);
  const rel=String(c[`r${n}_rel`]||'').trim();
  if(t==='professional') return ['Professional', c[`r${n}_company`]||m.employer_confirmed||'', rel].filter(Boolean).join(' · ');
  if(t==='personal') return ['Personal', rel, c[`r${n}_howlong`]||m.how_long||''].filter(Boolean).join(' · ');
  return '';
}
/* &t= and &co= on the reference link. No type means no t, which the form
   treats as the personal set, exactly as before. */
function obRefLinkExtra(type, company){
  const t=obRefType(type);
  return (t?'&t='+t:'') + (t==='professional'&&company?'&co='+encodeURIComponent(company):'');
}
/* R5: which of a candidate's reference slots match a search. Names and emails
   by contains; phones by digits only (last 10), when the search is a run of
   at least four digits. */
function obRefMatchSlots(c, q){
  const s=String(q||'').trim().toLowerCase();
  if(!s||!c) return [];
  const qd=s.replace(/\D/g,'');
  const phoneQ=qd.length>=4 && /^[\d\s()+.\-]+$/.test(s);
  const hits=[];
  [1,2,3,4].forEach(n=>{
    const nm=String(c[`r${n}n`]||'').toLowerCase(), em=String(c[`r${n}_email`]||'').toLowerCase();
    let d=String(c[`r${n}_phone`]||'').replace(/\D/g,''); if(d.length>10) d=d.slice(-10);
    if((nm&&nm.includes(s)) || (em&&em.includes(s)) || (phoneQ&&d&&d.includes(qd.slice(-10)))) hits.push(n);
  });
  return hits;
}
/* Used by the Hub's top search: "<ref name> · reference for <candidate>". */
function obRefSearch(q){
  const out=[];
  (candidates||[]).forEach(c=>{
    if(c.not_hired) return;
    obRefMatchSlots(c,q).forEach(n=>out.push({ candId:c.id, slot:n, ref:String(c[`r${n}n`]||'').trim()||('Reference '+n),
      cand:((c.first||'')+' '+(c.last||'')).trim() }));
  });
  return out;
}

/* ── Dates check (her decision 3) ─────────────────────────────────────────── */
function obYear(s){ const m=String(s==null?'':s).match(/\b(19|20)\d{2}\b/); return m?m[0]:''; }
function obIsPresent(s){ return /\b(present|current|currently|now|still)\b/i.test(String(s||'')); }
function obCoNorm(s){
  return String(s||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9 ]/g,' ')
    .replace(/\b(inc|llc|l l c|co|corp|corporation|company|ltd|the)\b/g,' ').replace(/\s+/g,' ').trim();
}
function obCoMatch(a,b){ a=obCoNorm(a); b=obCoNorm(b); return !!(a&&b&&(a.includes(b)||b.includes(a))); }
/* 'matches' | 'differs: applicant said A to B, employer said C to D' | ''.
   '' whenever there is nothing fair to compare. Never blocks anything. */
function obDateCheckCompare(workHistory, companies, empFrom, empTo){
  let wh=workHistory;
  if(typeof wh==='string'){ try{ wh=JSON.parse(wh); }catch(e){ return ''; } }
  if(!Array.isArray(wh)||!wh.length) return '';
  const cos=(Array.isArray(companies)?companies:[companies]).filter(Boolean);
  if(!cos.length) return '';
  const job=wh.find(j=>j&&typeof j==='object'&&cos.some(co=>obCoMatch(j.employer||j.company||'',co)));
  if(!job) return '';
  const eTp=obIsPresent(empTo), eF=obYear(empFrom), eT=eTp?'present':obYear(empTo);
  const aTp=job.current===true||String(job.current)==='true'||obIsPresent(job.to), aF=obYear(job.from), aT=aTp?'present':obYear(job.to);
  const pairs=[]; if(eF&&aF) pairs.push(eF===aF); if(eT&&aT) pairs.push(eT===aT);
  if(!pairs.length) return '';
  if(pairs.every(Boolean)) return 'matches';
  return 'differs: applicant said '+(aF||'?')+' to '+(aT||'?')+', employer said '+(eF||'?')+' to '+(eT||'?');
}
function obDateCheckText(dc){
  if(dc==='matches') return 'The dates match what the applicant told us.';
  if(/^differs:/.test(String(dc||''))) return 'The dates differ. '+String(dc).replace(/^differs:\s*/,'').replace(/^./,ch=>ch.toUpperCase())+'.';
  return '';
}
/* Their application's work history. Linked through reference_requests or
   hire_intake (applicant_id, the same link the applicant profile uses), and
   otherwise matched on email, then phone digits. Read-only. */
const OB_WH_CACHE={};
async function obFindWorkHistory(c){
  if(!c) return null;
  if(Object.prototype.hasOwnProperty.call(OB_WH_CACHE,c.id)) return OB_WH_CACHE[c.id];
  let appId=null, wh=null;
  try{
    const { data } = await sb.from('reference_requests').select('applicant_id').eq('candidate_id', c.id).limit(8);
    appId=((data||[]).find(r=>r&&r.applicant_id)||{}).applicant_id||null;
  }catch(e){}
  if(!appId && c.intake_id){
    try{ const { data } = await sb.from('hire_intake').select('applicant_id').eq('id', c.intake_id).maybeSingle(); appId=(data&&data.applicant_id)||null; }catch(e){}
  }
  try{
    if(appId){
      const { data } = await sb.from('job_applicants').select('id,work_history').eq('id', appId).maybeSingle();
      wh=(data&&data.work_history)||null;
    }
    if(!wh && c.email){
      const { data } = await sb.from('job_applicants').select('id,work_history,created_at').ilike('email', String(c.email).trim()).order('created_at',{ascending:false}).limit(5);
      wh=((data||[]).find(r=>r&&r.work_history)||{}).work_history||null;
    }
    const d=String(c.phone||'').replace(/\D/g,'').slice(-10);
    if(!wh && d.length===10){
      const { data } = await sb.from('job_applicants').select('id,phone,work_history,created_at').ilike('phone', '%'+d.slice(-4)).order('created_at',{ascending:false}).limit(25);
      wh=((data||[]).find(r=>r&&r.work_history&&String(r.phone||'').replace(/\D/g,'').slice(-10)===d)||{}).work_history||null;
    }
  }catch(e){ wh=null; }
  OB_WH_CACHE[c.id]=wh;
  return wh;
}
async function obDateCheck(c, n){
  const m=c&&c[`r${n}_manual`]; if(!m) return '';
  if(obRefType(m.type||c[`r${n}_type`])!=='professional'){ m.date_check=''; return ''; }
  let wh=null; try{ wh=await obFindWorkHistory(c); }catch(e){ wh=null; }
  m.date_check=obDateCheckCompare(wh, [m.employer_confirmed, c[`r${n}_company`]], m.emp_from, m.emp_to);
  return m.date_check;
}

/* ── Plain words for every answer, shared by the PDF and the printed record ── */
const OB_ANS={
  recommend:{yes:'Yes, without reservation',reservations:'Yes, with reservations',no:'No'},
  concerns:{none:'None at all',minor:'Minor, nothing serious',serious:'Yes, something serious'},
  hours_type:{full:'Full time',part:'Part time',both:'Both at different times',unsure:'Not sure'},
  rehire:{yes:'Yes',no:'No',policy:"Their policy doesn't allow them to say"},
  trust_family:{yes:'Yes',reservations:'Yes, with some reservations',no:'No'},
};
function obRefQA(m, type){
  m=m||{};
  const a=(k,v)=>{ const raw=v!==undefined?v:m[k]; return raw?((OB_ANS[k]&&OB_ANS[k][raw])||String(raw)):'Not answered'; };
  const t=obRefType(type||m.type);
  if(t==='professional'){
    const to=String(m.emp_to||'').toLowerCase()==='present'?'still works there':(m.emp_to||'?');
    return [
      ['Company or employer, as they gave it', a('employer_confirmed')],
      ['When they worked there', (m.emp_from||m.emp_to)?((m.emp_from||'?')+' to '+to):'Not answered'],
      ['Their job title', a('job_title')],
      ['Full time or part time?', a('hours_type')],
      ['Eligible for rehire?', a('rehire')],
      ['Reliability and attendance', a('reliability')],
      ['Any concerns about them working with older or vulnerable adults?', a('concerns')],
      ['Would they recommend them for this kind of work?', a('recommend')],
      ['Anything they added', m.notes||'Nothing added'],
    ];
  }
  const rows=[
    ['How long they have known them', a('how_long')],
    ['How they know them', a('rel_answer')],
    ['Would they trust them to care for someone in their own family?', a('trust_family')],
    ['Reliability and attendance', a('reliability')],
    ['How they are with people', a('interpersonal')],
    ['Honesty and trustworthiness', a('honesty')],
    ['Any concerns about them working with older or vulnerable adults?', a('concerns')],
    ['Would they recommend them for this kind of work?', a('recommend')],
    ['Anything they added', m.notes||'Nothing added'],
  ];
  /* Answers recorded before the two sets existed never asked these two. */
  return t ? rows : rows.filter(r=>!((r[0]==='How they know them'&&!m.rel_answer)||(r[0].indexOf('own family')>-1&&!m.trust_family)));
}
function obRefHowCollected(m){
  m=m||{};
  const d=m.date?(fmtD(m.date)||m.date):'';
  if(m.via==='Online form') return 'Online form, answered by the reference'+(d?' on '+d:'');
  return (m.via||'Phone call')+(m.staff?' by '+m.staff:'')+(d?' on '+d:'');
}

/* ── The reference PDF (R3) ─────────────────────────────────────────────── */
function obPdfSafe(t){
  return String(t==null?'':t).replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"')
    .replace(/[\u2013\u2014]/g,'-').replace(/\u2026/g,'...').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g,'');
}
/* Builds the document. JsPDF is the constructor (window.jspdf.jsPDF), passed
   in so this stays testable. */
function obRefPdfDoc(JsPDF, c, n, nowDate){
  const m=c[`r${n}_manual`]||{};
  const type=obRefType(m.type||c[`r${n}_type`]);
  const company=c[`r${n}_company`]||m.employer_confirmed||'';
  const doc=new JsPDF({ unit:'pt', format:'letter' });
  const W=doc.internal.pageSize.getWidth(), H=doc.internal.pageSize.getHeight(), L=54, R=W-54;
  let y=60;
  const need=h=>{ if(y+h>H-54){ doc.addPage(); y=60; } };
  const line=(txt,o)=>{ o=o||{};
    doc.setFont('helvetica', o.bold?'bold':'normal'); doc.setFontSize(o.size||10.5);
    doc.setTextColor.apply(doc, o.color||[22,40,58]);
    const parts=doc.splitTextToSize(obPdfSafe(txt), (R-L)-(o.indent||0));
    parts.forEach(p=>{ need((o.size||10.5)*1.35); doc.text(p, L+(o.indent||0), y); y+=(o.size||10.5)*1.35; });
  };
  const rule=()=>{ need(10); doc.setDrawColor(216,211,200); doc.line(L,y,R,y); y+=12; };
  const kv=(k,v)=>{ if(!v) return; line(k+': '+v); };
  line('Caring Companions In-Home Senior Care · Reference Check', { bold:true, size:14, color:[13,54,95] });
  y+=4; rule();
  kv('Candidate', ((c.first||'')+' '+(c.last||'')).trim());
  line('Reference '+n+': '+(m.name||c[`r${n}n`]||''), { bold:true, size:12, color:[13,54,95] });
  kv('Type', type==='professional'?('Professional'+(company?', '+company:'')):type==='personal'?'Personal':'Not recorded');
  kv('Relationship', m.relationship||c[`r${n}_rel`]||'');
  kv('Contact', [c[`r${n}_phone`], c[`r${n}_email`]].filter(Boolean).join(' · '));
  kv('How collected', obRefHowCollected(m));
  obRefSendRecordLines(c, n).forEach(([k,v])=>kv(k, v));
  const who=[m.name, m.responder_title].filter(Boolean).join(', ');
  if(who && m.via==='Online form') kv('Answered by', who);
  y+=4; rule();
  obRefQA(m, type).forEach(([q,ans])=>{ line(q, { bold:true }); line(ans, { indent:12 }); y+=3; });
  rule();
  if(type==='professional') kv('Dates check', obDateCheckText(m.date_check)||'Nothing to compare. Their application has no matching job with dates.');
  const res=c[`r${n}s`]||'Pending';
  line('Result: '+res, { bold:true, size:12, color: res==='Positive'?[21,128,61]:res==='Negative'?[176,0,32]:res==='Conditional'?[180,83,9]:[110,101,89] });
  y+=6;
  const when=(nowDate||new Date()).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  line('Generated '+when+' from the Caring Companions hiring record. References were contacted under the signed Reference Check and Authorization on file.', { size:9, color:[110,101,89] });
  return doc;
}
let _obJsPdfLoading=null;
function obLoadJsPDF(){
  if(window.jspdf&&window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if(_obJsPdfLoading) return _obJsPdfLoading;
  _obJsPdfLoading=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload=()=>{ (window.jspdf&&window.jspdf.jsPDF)?resolve(window.jspdf.jsPDF):reject(new Error('PDF library did not load')); };
    s.onerror=()=>{ _obJsPdfLoading=null; reject(new Error('PDF library could not be downloaded')); };
    document.head.appendChild(s);
  });
  return _obJsPdfLoading;
}
function obRefPdfLabel(c,n){
  const m=c[`r${n}_manual`]||{}, t=obRefType(m.type||c[`r${n}_type`]);
  return 'Reference '+n+(t?' ('+(t==='professional'?'Professional':'Personal')+')':'')+': '+(m.name||c[`r${n}n`]||'');
}
/* Makes, stores and files one reference PDF. Throws on failure; the caller
   decides how to say so. Explicit-click paths only. */
async function obMakeRefPdf(c, n){
  const JsPDF=await obLoadJsPDF();
  const blob=obRefPdfDoc(JsPDF, c, n).output('blob');
  const path=`refs/${c.id}/ref${n}-${Date.now()}.pdf`;
  const { error } = await sb.storage.from('lead-docs').upload(path, blob, { contentType:'application/pdf' });
  if(error) throw error;
  c[`r${n}_pdf`]=path;
  try{ await sb.from('reference_requests').update({ pdf_path:path }).eq('candidate_id', c.id).eq('slot', n); }catch(e){ /* the board holds the path either way */ }
  try{ bgrPushDocToGHL(c.id, 'ref'+n, path, obRefPdfLabel(c,n)); }catch(e){}   // fire-and-forget, files a document, messages nobody
  return path;
}
function obToast(msg){
  if(typeof document==='undefined'||!document.body) return;
  const el=document.createElement('div');
  el.style.cssText='position:fixed;right:18px;bottom:18px;z-index:9999;max-width:380px;background:#FFF7ED;border:1px solid #FCD9A8;color:#7C2D12;padding:10px 14px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);font-size:13px;line-height:1.45;';
  el.textContent=msg;
  document.body.appendChild(el);
  setTimeout(()=>{ try{ el.remove(); }catch(e){} }, 9000);
}
/* After a reference is recorded (office form) or merged (Sync): dates check,
   then the PDF. The answer itself is already saved before this runs. Returns
   true when the PDF was made. */
async function obAfterRefRecorded(candId, n, opts){
  opts=opts||{};
  const c=candidates.find(x=>x.id===candId); if(!c||!c[`r${n}_manual`]) return false;
  try{ await obDateCheck(c, n); }catch(e){}
  let ok=true;
  if((c[`r${n}s`]||'Pending')!=='Pending'){
    try{ await obMakeRefPdf(c, n); }
    catch(e){ ok=false; console.warn('reference PDF', e); if(!opts.quiet) obToast('The reference is saved, but its PDF could not be made ('+((e&&e.message)||'error')+'). Use "Make reference PDFs" to try again.'); }
  }
  if(opts.save!==false){ await saveCandidates(); try{ renderOB(); }catch(e){} }
  return ok;
}
/* R4: one button that makes every missing PDF. Explicit click only. */
function obRefPdfTodo(){
  const out=[];
  (candidates||[]).forEach(c=>[1,2,3,4].forEach(n=>{
    if(c[`r${n}_manual`] && (c[`r${n}s`]||'Pending')!=='Pending' && !c[`r${n}_pdf`]) out.push({ c, n });
  }));
  return out;
}
async function bgrMakeRefPdfs(btn){
  if(!HYDRATED){ alert('Open Background & References first so the shared data loads, then try again.'); return; }
  const todo=obRefPdfTodo();
  if(!todo.length){ alert('Every answered reference already has its PDF.'); return; }
  if(!confirm('Make '+todo.length+' reference PDF'+(todo.length===1?'':'s')+'?\n\nEach one is saved to the hiring record and filed to the person\'s GoHighLevel contact, the same way background checks are. Nobody is messaged.')) return;
  if(btn){ btn.disabled=true; btn._t=btn.textContent; }
  let made=0, failed=0;
  for(let i=0;i<todo.length;i++){
    const { c, n }=todo[i];
    if(btn) btn.textContent='Making '+(i+1)+' of '+todo.length+'…';
    try{
      if(c[`r${n}_manual`].date_check===undefined) await obDateCheck(c, n);
      await obMakeRefPdf(c, n); made++;
    }catch(e){ failed++; console.warn('reference PDF', e); }
  }
  await saveCandidates();
  try{ renderOB(); }catch(e){}
  if(btn){ btn.disabled=false; btn.textContent=btn._t||'📄 Make reference PDFs'; }
  alert('Made '+made+' reference PDF'+(made===1?'':'s')+'.'+(failed?'\n'+failed+' could not be made. You can run it again.':''));
}
/* People & Checks table cells (2026-10-01, her ask: "make these references look less jumbled"). Each reference is a
   small stack: name, phone (one format), email, then status + Record on one line. Pure: they only build HTML. */
function obFmtPhone(ph){
  let d=String(ph||'').replace(/\D/g,''); if(d.length===11&&d[0]==='1') d=d.slice(1);
  return d.length===10 ? { show:`(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`, tel:'+1'+d } : { show:String(ph||'').trim(), tel:String(ph||'').replace(/[^\d+]/g,'') };
}
function obRefCellHTML(c,n,hit){
  const s=c[`r${n}s`]||'Pending', nm=String(c[`r${n}n`]||'').trim(), pf=c[`r${n}_proof`], mn=c[`r${n}_manual`];
  const tl=obRefCellTypeLine(c,n);
  const pdf=c[`r${n}_pdf`], dc=mn&&mn.date_check;
  const ph=c[`r${n}_phone`], em=c[`r${n}_email`];
  const badge={Positive:'b-green',Conditional:'b-amber',Negative:'b-red',Pending:'b-gray'}[s]||'b-gray';
  const p=ph?obFmtPhone(ph):null;
  const given=!!(nm||ph||em);
  const btn=s==='Pending'
    ? `<button class="refc-btn" onclick="openManualRef(${c.id},${n})">📞 Record</button>`
      /* Office send (Desktop 377): email the form now, or text it once they said OK on the phone. Click only. */
      + (nm ? `<button class="refc-btn refc-btn-quiet" onclick="obRefEmailOpen(${c.id},${n})" title="Email ${bgrEsc(nm)} the reference form">✉️ Email</button>`
            + `<button class="refc-btn refc-btn-quiet" onclick="obRefTextOpen(${c.id},${n})" title="Text ${bgrEsc(nm)} the reference form (only after they said OK on the phone)">💬 Text</button>` : '')
    : `<button class="refc-btn refc-btn-quiet" onclick="openManualRef(${c.id},${n})">✏️ Edit</button>`;
  const sentLine=obRefSentLine(c,n);
  return `<td class="refc-td${hit?' refc-hit':''}"><div class="refc">`
    + (given ? `<div class="refc-name">${nm||'Name not given'}</div>` : `<div class="refc-none">No reference given</div>`)
    + (tl ? `<div class="refc-type">${bgrEsc(tl)}</div>` : '')
    + (p ? `<a class="refc-line" href="tel:${p.tel}" title="Call">${p.show}</a>` : '')
    + (em ? `<a class="refc-line refc-em" href="mailto:${em}" title="${em}">${em}</a>` : '')
    + (sentLine ? `<div class="refc-sent">${bgrEsc(sentLine)}</div>` : '')
    + (mn ? `<div class="refc-note">📞 ${mn.via||''}${mn.date?' · '+(fmtD(mn.date)||''):''}${mn.staff?' · '+mn.staff:''}</div>` : '')
    + (pf ? `<a class="proof-link refc-note" href="${pf}" target="_blank" rel="noopener">📄 View form</a>` : '')
    + (dc==='matches' ? `<div class="refc-dc" style="color:#15803D" title="${bgrEsc(obDateCheckText(dc))}">✓ Dates match</div>`
      : /^differs:/.test(String(dc||'')) ? `<div class="refc-dc" style="color:#B45309" title="${bgrEsc(obDateCheckText(dc))}">⚠ Dates differ: ${bgrEsc(String(dc).replace(/^differs:\s*/,''))}</div>` : '')
    + (pdf ? `<a class="proof-link refc-note" style="cursor:pointer" onclick="bgrViewProof('${bgrEsc(pdf).replace(/\x27/g,'')}')" title="Open the reference PDF">📄 PDF</a>` : '')
    + `<div class="refc-foot">${given||s!=='Pending'?`<span class="badge ${badge}">${s}</span>`:''}${btn}</div>`
    + `</div></td>`;
}
/* ── Office send: email or text a reference their form (Desktop 377, 2026-10-01) ──
   Samantha approved ("yes to all"): email needs no recorded permission; a text
   needs the reference's OK on the phone recorded first, every time, per
   reference; no automatic follow-up texts. Everything here runs only from a
   click. The server (reference-send) enforces the same rules and the hours. */
function obSendDay(iso){ const d=iso?new Date(iso):null; return d&&!isNaN(d)?d.toLocaleDateString('en-US',{month:'short',day:'numeric'}):''; }
function obSendDayLong(iso){ const d=iso?new Date(iso):null; return d&&!isNaN(d)?d.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}):''; }
/* "✉️ Emailed the form · Oct 1 · Krystal" / "💬 Texted the form · OK'd by phone · Oct 1 · Krystal" */
function obRefSentLine(c,n){
  const t=c&&c[`r${n}_sent`]; if(!t||!t.how) return '';
  const tail=[obSendDay(t.at), t.by].filter(Boolean);
  return t.how==='text'
    ? ['💬 Texted the form',"OK'd by phone"].concat(tail).join(' · ')
    : ['✉️ Emailed the form'].concat(tail).join(' · ');
}
/* Lines for the PDF and the printed record. Plain text, no em dashes. */
function obRefSendRecordLines(c,n){
  const out=[], ok=c&&c[`r${n}_sms_ok`], t=c&&c[`r${n}_sent`];
  if(ok&&ok.at) out.push(["Text permission","OK'd by phone"+(ok.by?' by '+ok.by:'')+' on '+obSendDayLong(ok.at)]);
  if(t&&t.how) out.push(['Form sent','by '+(t.how==='text'?'text':'email')+' on '+obSendDayLong(t.at)+(t.by?' by '+t.by:'')]);
  return out;
}
function obEmailLooksRight(e){ return /^[^\s@",()<>]+@[^\s@",()<>]+\.[^\s@",()<>]+$/.test(String(e||'').trim()); }
function obDigits10(p){ let d=String(p||'').replace(/\D/g,''); if(d.length===11&&d[0]==='1') d=d.slice(1); return d.length===10?d:''; }
/* Calls reference-send and returns its JSON either way. Non-2xx bodies are read
   from error.context, like sendCandidateSMS does. Throws only when there is no
   readable answer at all. */
async function obRefSendCall(body){
  const { data, error } = await sb.functions.invoke('reference-send', { body });
  if(error){
    let j=null;
    try{ j = await error.context.json(); }catch(_){}
    if(j && (j.error || j.held)) return Object.assign({ ok:false }, j);
    throw new Error(error.message || 'The sending service did not answer.');
  }
  return data || { ok:false, error:'The sending service did not answer.' };
}
let _obSend = null;   // { candId, n, mode: 'email' | 'permit' | 'text' }
function obEnsureSendModal(){
  if(document.getElementById('obSendModal')) return;
  const w=document.createElement('div');
  w.id='obSendModal';
  w.style.cssText='display:none;position:fixed;inset:0;z-index:10001;background:rgba(15,54,95,.35);align-items:center;justify-content:center;padding:1rem';
  const lbl='font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:#8A7F70;margin:.6rem 0 .25rem';
  const inp='width:100%;padding:.5rem .6rem;border:1px solid var(--border,#d9d4c8);border-radius:8px;font-size:.9rem;box-sizing:border-box';
  w.innerHTML=
      '<div style="background:#fff;border-radius:12px;max-width:420px;width:100%;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.2)">'
    +   '<div id="obSendTitle" style="font-weight:800;color:#0D365F;font-size:1rem;margin-bottom:.25rem"></div>'
    +   '<div id="obSendHelp" style="font-size:.82rem;color:#6E6559;line-height:1.45"></div>'
    +   '<div id="obSendFieldWrap"><div id="obSendLabel" style="'+lbl+'"></div><input id="obSendInput" style="'+inp+'"></div>'
    +   '<div id="obSendMsg" style="display:none;margin-top:.7rem;font-size:.82rem;line-height:1.45;border-radius:8px;padding:.5rem .65rem"></div>'
    +   '<div style="display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem">'
    +     '<button class="ibtn" id="obSendCancel" onclick="obRefSendClose()">Cancel</button>'
    +     '<button class="ibtn ibtn-strong" id="obSendGo" onclick="obRefSendGo(this)">Send</button>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(w);
}
function obSendMsg(text, tone){
  const el=document.getElementById('obSendMsg'); if(!el) return;
  if(!text){ el.style.display='none'; el.textContent=''; return; }
  el.style.display='block'; el.textContent=text;
  el.style.background = tone==='held' ? '#FFF7ED' : '#FEF2F2';
  el.style.color = tone==='held' ? '#7C2D12' : '#991B1B';
  el.style.border = '1px solid ' + (tone==='held' ? '#FCD9A8' : '#FECACA');
}
function obSendSetMode(mode){
  const st=_obSend; if(!st) return;
  const c=candidates.find(x=>x.id===st.candId); if(!c) return;
  const n=st.n, nm=String(c[`r${n}n`]||'').trim()||'this reference';
  st.mode=mode;
  const g=id=>document.getElementById(id);
  const input=g('obSendInput');
  if(mode==='email'){
    const em=c[`r${n}_email`]||'';
    g('obSendTitle').textContent='Email '+nm+' the form';
    g('obSendHelp').textContent=em
      ? 'We will email the reference form to the address below. Change it if they gave you a different one.'
      : 'Did they give you an email on the phone? Type it here and we will email them the form right away.';
    g('obSendLabel').textContent='Their email';
    input.type='email'; input.placeholder='name@example.com'; input.value=em;
    g('obSendGo').textContent='Send';
  } else {
    const ph=c[`r${n}_phone`]||'';
    input.type='tel'; input.placeholder='(417) 555-0123'; input.value=ph?obFmtPhone(ph).show:'';
    g('obSendLabel').textContent='Their mobile number';
    if(mode==='permit'){
      g('obSendTitle').textContent='Did '+nm+' say OK to a text on the phone?';
      g('obSendHelp').textContent='We only text a reference after they tell us it is OK. Saying yes records that they OK\'d it by phone, with your name and today\'s date, and then sends the form from the office number.';
      g('obSendGo').textContent='Yes, they said OK';
    } else {
      const ok=c[`r${n}_sms_ok`]||{};
      g('obSendTitle').textContent='Text '+nm+' the form'+(ph?' at '+obFmtPhone(ph).show:'')+'?';
      g('obSendHelp').textContent="They OK'd a text by phone"+(ok.by?' (recorded by '+ok.by+(ok.at?', '+obSendDay(ok.at):'')+')':'')+'. The text comes from the office number.';
      g('obSendGo').textContent='Send';
    }
  }
  obSendMsg('');
}
function obRefSendOpen(candId, n, mode){
  if(!HYDRATED){ alert('Shared data has not loaded, so nothing can be sent right now. Use Try again at the top, then retry.'); return; }
  const c=candidates.find(x=>x.id===candId);
  if(!c){ alert('That candidate could not be found. Refresh the tab and try again.'); return; }
  if(!String(c[`r${n}n`]||'').trim()){ alert('Add the reference\'s name first.'); return; }
  obEnsureSendModal();
  _obSend={ candId, n, mode };
  obSendSetMode(mode);
  const go=document.getElementById('obSendGo'); go.disabled=false;
  document.getElementById('obSendModal').style.display='flex';
  try{ document.getElementById('obSendInput').focus(); }catch(e){}
}
function obRefEmailOpen(candId, n){ obRefSendOpen(candId, n, 'email'); }
function obRefTextOpen(candId, n){
  const c=(candidates||[]).find(x=>x.id===candId);
  obRefSendOpen(candId, n, (c && c[`r${n}_sms_ok`] && c[`r${n}_sms_ok`].at) ? 'text' : 'permit');
}
function obRefSendClose(){ const m=document.getElementById('obSendModal'); if(m) m.style.display='none'; _obSend=null; }
async function obRefSendDone(c, n, res, how){
  c[`r${n}_sent`]={ how, at:res.at||new Date().toISOString(), by:res.by||'', to:res.to||'' };
  obRefSendClose();
  await saveCandidates();
  try{ renderOB(); }catch(e){}
  obToast(how==='email' ? 'Emailed the form to '+(res.to||'them')+'.' : 'Texted the form to '+(res.to?obFmtPhone(res.to).show:'them')+'.');
}
async function obRefSendGo(btn){
  const st=_obSend; if(!st) return;
  const c=candidates.find(x=>x.id===st.candId); if(!c){ obSendMsg('That candidate could not be found. Refresh the tab and try again.'); return; }
  const n=st.n, val=String((document.getElementById('obSendInput')||{}).value||'').trim();
  const label=btn?btn.textContent:'';
  const busy=t=>{ if(btn){ btn.disabled=true; btn.textContent=t; } };
  const idle=()=>{ if(btn){ btn.disabled=false; btn.textContent=(_obSend&&_obSend.mode==='permit')?'Yes, they said OK':(label==='Yes, they said OK'?'Send':label); } };
  obSendMsg('');
  try{
    if(st.mode==='email'){
      if(!val){ obSendMsg('Add their email first.'); return; }
      if(!obEmailLooksRight(val)){ obSendMsg('That email does not look right.'); return; }
      busy('Sending…');
      const row=await obEnsureRefRequest(c, n);
      const res=await obRefSendCall({ action:'email', id:row.id, email:val.toLowerCase() });
      if(res.held){ obSendMsg(res.held,'held'); idle(); return; }
      if(!res.ok){ obSendMsg(res.error||'The email was not sent.'); idle(); return; }
      c[`r${n}_email`]=res.to||val.toLowerCase();
      await obRefSendDone(c, n, res, 'email');
      return;
    }
    const d=obDigits10(val);
    if(!d){ obSendMsg('Add their mobile number first.'); return; }
    busy(st.mode==='permit'?'Recording…':'Sending…');
    const row=await obEnsureRefRequest(c, n);
    if(st.mode==='permit'){
      const p=await obRefSendCall({ action:'permit_text', id:row.id });
      if(!p.ok){ obSendMsg(p.error||'Their OK could not be recorded, so nothing was sent.'); idle(); return; }
      c[`r${n}_sms_ok`]={ at:p.sms_ok_at||new Date().toISOString(), by:p.sms_ok_by||'', how:'verbal, by phone' };
      await saveCandidates();      // the OK is on record even if the text below is held
      obSendSetMode('text');
      busy('Sending…');
    }
    const res=await obRefSendCall({ action:'text', id:row.id, phone:d });
    if(res.held){ obSendMsg(res.held,'held'); idle(); return; }
    if(!res.ok){ obSendMsg(res.error||'The text was not sent.'); idle(); return; }
    if(obDigits10(c[`r${n}_phone`])!==d) c[`r${n}_phone`]=d;
    await obRefSendDone(c, n, res, 'text');
  }catch(e){
    obSendMsg((e&&e.message)||'Something went wrong. Nothing was sent.');
    idle();
  }
}
/* Start forms waiting to be imported (2026-10-02). The Sept 25 "one clean table" change removed the pipeline view,
   and with it the only Import button, so a start-link submission with no Background & References record (never
   imported, or its record was removed) had no way back in. This strip shows ONLY those people, above the table,
   and is hidden when there are none. Same Import as before (intakeImport: duplicate and roster guards included). */
function renderImportStrip(){
  const box = document.getElementById('obImportStrip'); if(!box) return;
  let rows = [];
  try{ rows = lifecycleRows().filter(r => r.intake && !r.board && !r.roster); }catch(e){ rows = []; }
  if(!rows.length){ box.style.display = 'none'; box.innerHTML = ''; return; }
  const esc = s => String(s==null?'':s).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const day = t => t ? new Date(t).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
  box.style.display = 'block';
  box.innerHTML = '<div style="font-weight:800;color:var(--navy);font-size:.85rem;margin-bottom:.35rem">📥 Start forms waiting to be imported ('+rows.length+')</div>'
    + '<div style="font-size:.75rem;color:var(--gray);margin-bottom:.5rem">These people filled in their start form but are not in the table below yet. Import brings them in with their details and references.</div>'
    + rows.map(r => {
        const i = r.intake, why = (r.attention && r.attention[0]) ? ' · <span style="color:#B91C1C">'+esc(r.attention[0].replace(/\. Review\.$/,''))+'</span>' : '';
        return '<div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;padding:.35rem 0;border-top:1px solid var(--border)">'
          + '<b style="font-size:.85rem">'+esc(r.name)+'</b>'
          + '<span style="font-size:.75rem;color:var(--gray)">start form '+esc(day(i.signed_at||i.created_at))+why+'</span>'
          + '<button class="ibtn ibtn-strong" style="margin-left:auto" onclick="intakeImport(\''+esc(i.id)+'\',this)">Import</button></div>';
      }).join('');
}
function renderOB(){
  try{ renderHirePipeline(); }catch(e){}
  try{ renderImportStrip(); }catch(e){}
  const q=String(((document.getElementById('ob-search')||document.querySelector('#panel-onboarding input')||{value:''}).value||globalSearch)).trim().toLowerCase();
  const today=new Date(); today.setHours(0,0,0,0);
  const list=candidates.filter(c=>{
    const n=`${c.first} ${c.last}`.toLowerCase();
    const st=obDeriveStatus(c);
    let matchF=true;
    if(obFilterVal==='not_hired')   matchF=!!c.not_hired;
    else if(c.not_hired)            return false; // hide not-hired from all other views
    else if(obFilterVal==='ready')  matchF=st==='Ready for Orientation';
    else if(obFilterVal==='refs')   matchF=[c.r1s,c.r2s,c.r3s,c.r4s].some(r=>r==='Pending');
    else if(obFilterVal==='bg')     matchF=(!c.oig||c.oig==='Pending')||(!c.edl||c.edl==='Pending')||(!c.fcsr||c.fcsr==='Pending');
    else if(obFilterVal==='review') matchF=st==='Needs Review';
    return (!q||n.includes(q)||obRefMatchSlots(c,q).length>0)&&matchF;
  });
  const tbody=document.getElementById('ob-tbody');
  document.getElementById('ob-empty').style.display=list.length?'none':'block';
  if(!list.length){tbody.innerHTML='';return;}

  const refBadge=s=>({Positive:'b-green',Conditional:'b-amber',Negative:'b-red',Pending:'b-gray'}[s]||'b-gray');
  tbody.innerHTML=list.map(c=>{
    const st=obDeriveStatus(c);
    const stBadge=st==='Ready for Orientation'?'b-green':st==='Needs Review'?'b-red':'b-gray';
    const fpShow=c.oos==='yes';
    const fpBadge={Clear:'b-green',Required:'b-amber',Submitted:'b-blue','N/A':'b-gray','Issues Found':'b-red'}[c.fp]||'b-gray';
    const addedTs = c.addedAt || (c.added ? c.added+'T00:00:00' : null);
    const addedDate = addedTs ? new Date(addedTs) : null;
    const daysPending = addedDate ? Math.floor((today - addedDate)/86400000) : null;
    const addedLabel = addedTs ? (() => {
      const d = new Date(addedTs);
      return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
        + (c.addedAt ? ' ' + d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) : '');
    })() : null;
    const urgencyColor = daysPending===null?'':daysPending>=10?'var(--red)':daysPending>=5?'#F97316':'var(--green-text)';
    const staleBadge = (daysPending!==null && daysPending>=7 && st==='Awaiting')
      ? `<span class="badge b-amber" style="margin-top:3px;font-size:.62rem">⏰ ${daysPending}d pending</span>` : '';

    const proofLink=(url,label)=>url?`<a class="proof-link" href="${url}" target="_blank" rel="noopener">📄 ${label}</a>`:'';
    return `<tr>
      <td class="cand-td"><div class="name-cell" style="cursor:pointer;color:var(--navy)" onclick="openProfile('${c.first}','${c.last}')" title="View full profile">${c.first} ${c.last} <span style="font-size:.65rem;color:var(--teal)">↗</span></div>${c.oos==='yes'?'<div><span class="cand-chip">Out of state</span></div>':''}${addedLabel?`<div class="cand-meta">Added ${addedTs?new Date(addedTs).toLocaleDateString('en-US',{month:'short',day:'numeric'}):''}${daysPending!==null&&st==='Awaiting'?` · <b style="color:${urgencyColor}">${daysPending}d in pipeline</b>`:''}</div>`:''}${staleBadge?`<div style="margin-top:2px">${staleBadge}</div>`:''}</td>
      ${(()=>{ const hits=q?obRefMatchSlots(c,q):[]; return [1,2,3,4].map(n=>obRefCellHTML(c,n,hits.includes(n))).join(''); })()}
      <td><div class="chk"><span onclick="${(c.oig==='CLEAR'||c.oig==='FLAGGED')?`bgrRecordCheck(${c.id},'oig')`:`bgrRunOIG(${c.id})`}" title="${(c.oig==='CLEAR'||c.oig==='FLAGGED')?'Update the OIG result or attach the proof':'Run the OIG exclusion check now'}" style="cursor:pointer;display:inline-block;border-radius:6px;padding:1px 4px" onmouseover="this.style.background='#EEF2F7'" onmouseout="this.style.background=''"><span class="badge ${c.oig==='CLEAR'?'b-green':c.oig==='FLAGGED'?'b-red':'b-gray'}">${c.oig||'Pending'}</span> <span style="color:var(--teal);font-size:.62rem;font-weight:700">${(c.oig==='CLEAR'||c.oig==='FLAGGED')?'✎':'▸ run'}</span></span>${c.oig_date?`<span class="chk-date">${fmtD(c.oig_date)}</span>`:''}${bgrCheckProofHtml(c.oig_proof)}</div></td>
      <td><div class="chk"><span onclick="bgrRecordCheck(${c.id},'edl')" title="Record the EDL result" style="cursor:pointer;display:inline-block;border-radius:6px;padding:1px 4px" onmouseover="this.style.background='#EEF2F7'" onmouseout="this.style.background=''"><span class="badge ${c.edl==='Clear'?'b-green':c.edl==='Issues Found'?'b-red':'b-gray'}">${c.edl||'Pending'}</span> <span style="color:var(--teal);font-size:.62rem;font-weight:700">✎</span></span>${c.edl_date?`<span class="chk-date">${fmtD(c.edl_date)}</span>`:''}${bgrCheckProofHtml(c.edl_proof)}</div></td>
      <td><div class="chk"><span onclick="bgrRecordCheck(${c.id},'fcsr')" title="Record the FCSR result" style="cursor:pointer;display:inline-block;border-radius:6px;padding:1px 4px" onmouseover="this.style.background='#EEF2F7'" onmouseout="this.style.background=''"><span class="badge ${c.fcsr==='Clear'?'b-green':c.fcsr==='Issues Found'?'b-red':'b-gray'}">${c.fcsr||'Pending'}</span> <span style="color:var(--teal);font-size:.62rem;font-weight:700">✎</span></span>${c.fcsr_date?`<span class="chk-date">${fmtD(c.fcsr_date)}</span>`:''}${bgrCheckProofHtml(c.fcsr_proof)}</div></td>
      <td><div class="chk">${fpShow?`<span onclick="bgrRecordCheck(${c.id},'fp')" title="Record the fingerprint result" style="cursor:pointer;display:inline-block;border-radius:6px;padding:1px 4px" onmouseover="this.style.background='#EEF2F7'" onmouseout="this.style.background=''"><span class="badge ${fpBadge}">${c.fp}</span> <span style="color:var(--teal);font-size:.62rem;font-weight:700">✎</span></span>${c.fp_date?`<span class="chk-date">${fmtD(c.fp_date)}</span>`:''}${bgrCheckProofHtml(c.fp_proof)}`:`<span class="badge b-gray">Not required</span>`}</div></td>
      <td>
        ${c.not_hired?`
          <span class="badge b-red">🚫 Not Hired</span>
          ${c.not_hired_reason?`<span class="sub" style="color:#ef4444">${{background:'BG Issue',reference:'Ref Concern',noshow:'No-Show',withdrew:'Withdrew',other:'Other'}[c.not_hired_reason]||c.not_hired_reason}</span>`:''}
          ${c.not_hired_notes?`<span class="sub" style="color:var(--gray);font-style:italic">${c.not_hired_notes}</span>`:''}
          ${c.not_hired_date?`<span class="sub" style="color:var(--gray)">${fmtD(c.not_hired_date)}</span>`:''}
        `:`
          <span class="badge ${stBadge}">${st}</span>
          ${step1Chip(c)?`<br><span style="display:inline-block;margin-top:4px;">${step1Chip(c)}</span>`:''}
          ${c.invite_sent?`<br><span class="badge" style="margin-top:4px;background:#e0faf9;color:#0e7490;font-size:.62rem">✉️ Invited ${fmtD(c.invite_sent_date)}</span>`:''}
        `}
      </td>
      <td><div class="acts">
        ${c.not_hired?`<button class="ibtn" onclick="reactivateOB(${c.id})" style="color:var(--teal);border-color:var(--teal)" title="Reactivate candidate">↩ Reactivate</button>`:`
        ${st==='Ready for Orientation'?`<span style="display:inline-flex;align-items:center;gap:.3rem;flex-wrap:wrap">${step2Html(c)}</span><span style="display:inline-flex;align-items:center;gap:.3rem;flex-wrap:wrap">${wcInviteHtml(c)}</span><span style="display:inline-flex;align-items:center;gap:.3rem;flex-wrap:wrap">${cgpBtnHtml(c.id)}</span><button class="ibtn" onclick="openInviteModal(${c.id})" title="Invite to an in-person orientation session at the office">📅 In the office instead${c.invite_sent?' (re-send)':''}</button>`:''}
        ${[1,2,3,4].some(n=>c['r'+n+'n']&&c['r'+n+'s']==='Pending')?`<button class="ibtn" onclick="askReferences(${c.id},this)" title="Send each reference a two-minute form">📨 Ask refs</button>`:''}
        ${[1,2,3,4].some(n=>c['r'+n+'_manual'])?`<button class="ibtn" onclick="refReport(${c.id})" title="Reference check record for the personnel file">📄 Refs</button>`:''}
        <button class="ibtn" onclick="openOBModal(${c.id})">✏️</button>
        <button class="ibtn" onclick="openNotHireModal(${c.id})" style="color:#ef4444;border-color:#fca5a5" title="Not moving forward">🚫</button>`}
      </div></td>
    </tr>`;
  }).join('');

  // Stats
  const total=candidates.length, ready=candidates.filter(c=>obDeriveStatus(c)==='Ready for Orientation').length,
    review=candidates.filter(c=>obDeriveStatus(c)==='Needs Review').length,
    wait=candidates.filter(c=>obDeriveStatus(c)==='Awaiting').length,
    oos=candidates.filter(c=>c.oos==='yes').length;
  document.getElementById('ob-stats').innerHTML=`
    <div class="stat"><div class="lbl">Candidates</div><div class="val v-navy">${total}</div></div>
    <div class="stat"><div class="lbl">Ready for Orientation</div><div class="val v-green">${ready}</div></div>
    <div class="stat"><div class="lbl">Awaiting</div><div class="val v-amber">${wait}</div></div>
    <div class="stat"><div class="lbl">Needs Review</div><div class="val v-red">${review}</div></div>
    <div class="stat"><div class="lbl">Fingerprint Req.</div><div class="val v-amber">${oos}</div></div>`;
}

// ── TRAINING RENDER ───────────────────────────────────────────────────
let trFilterVal='all';
function trFilter(f,btn){ trFilterVal=f; document.querySelectorAll('#panel-training .fb').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderTR(); }
function renderTR(){
  const q=((document.querySelector('#panel-training input')||{value:''}).value||globalSearch).toLowerCase();
  const blocked=caregivers.filter(c=>!trainStatus(c).preContactDone);
  /* 2c: new hires only; current caregivers are never listed here for having no profile */
  const pgOf={}; caregivers.forEach(c=>{ pgOf[c.id]=cgpgFor(c); });
  const profBlocked=caregivers.filter(c=>pgOf[c.id]&&pgOf[c.id].blocked);
  const profUnchecked=caregivers.filter(c=>pgOf[c.id]&&pgOf[c.id].new_hire&&!pgOf[c.id].checked&&pgOf[c.id].err);
  document.getElementById('train-alert').innerHTML=(blocked.length
    ?`<div class="alert-banner">⛔ ${blocked.length} caregiver(s) not cleared for client contact, pre-contact training incomplete: ${blocked.map(c=>`<b>${c.first} ${c.last}</b>`).join(', ')}</div>`:'')
    +(profBlocked.length
    ?`<div class="alert-banner">🪪 ${profBlocked.length} new hire${profBlocked.length===1?'':'s'}: profile needed before first shift. Publish their caregiver profile (the photo is required) before their first client visit: ${profBlocked.map(c=>`<b>${c.first} ${c.last}</b>`).join(', ')}</div>`:'')
    +(profUnchecked.length
    ?`<div class="alert-banner">⚠ Could not check the caregiver profile for ${profUnchecked.length} new hire${profUnchecked.length===1?'':'s'} (${wcEsc(pgOf[profUnchecked[0].id].err)}). <button class="ibtn" onclick="CGP2.gateLoad(null,true)">Try again</button></div>`:'');

  const list=caregivers.filter(c=>{
    const n=`${c.first} ${c.last}`.toLowerCase();
    const ts=trainStatus(c);
    const matchQ=!q||n.includes(q);
    let matchF=true;
    if(trFilterVal==='blocked') matchF=!ts.preContactDone;
    else if(trFilterVal==='ojt-due') matchF=!ts.thirtyDone&&!!ts.thirtyDeadline;
    else if(trFilterVal==='annual-due') matchF=ts.annualStatus==='Due Soon'||ts.annualStatus==='Overdue';
    return matchQ&&matchF;
  });
  const tbody=document.getElementById('tr-tbody');
  document.getElementById('tr-empty').style.display=list.length?'none':'block';
  if(!list.length){tbody.innerHTML='';return;}

  tbody.innerHTML=list.map(c=>{
    const ts=trainStatus(c);
    // Pre-contact cell
    const pg=pgOf[c.id];
    const profBlock=!!(pg&&pg.blocked);
    const preBadge=ts.preContactDone&&!profBlock?'b-green':'b-red';
    const preLabel=ts.preContactDone?(profBlock?'🪪 Profile needed before first shift':'✓ Cleared to Schedule'):'⛔ Blocked';
    const profLine=pg&&window.CGP2?CGP2.gateHtml(c,pg):'';
    const orientLine=c.orient_date?`<span class="chk-date">Agency Orientation (2hr): ${fmtD(c.orient_date)} ✓${c.orient_proof?` <a class="proof-link" href="${c.orient_proof}" target="_blank">📄</a>`:' <span style="color:#f97316;font-size:.67rem">no proof</span>'}</span>`:`<span class="chk-date" style="color:var(--red)">Agency Orientation: missing</span>`;
    const alzLine=c.alz_date?`<span class="chk-date">ALZ/Dementia (4hr): ${fmtD(c.alz_date)} ✓${c.alz_proof?` <a class="proof-link" href="${c.alz_proof}" target="_blank">📄</a>`:' <span style="color:#f97316;font-size:.67rem">no proof</span>'}</span>`:`<span class="chk-date" style="color:var(--red)">ALZ/Dementia Training: missing</span>`;
    const alzHrsLine=c.alz_hrs?(parseInt(c.alz_hrs)>=4?`<span class="chk-date" style="color:var(--green)">ALZ hours: ${c.alz_hrs} ✓</span>`:`<span class="chk-date" style="color:var(--amber)">⚠ ALZ hours: ${c.alz_hrs}/4 required</span>`):'';
    // 30-day cell
    const ddStr=ts.thirtyDeadline?ts.thirtyDeadline.toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
    const daysLeft30=ts.thirtyDeadline?daysLeft(ts.thirtyDeadline):null;
    let thirtyBadge, thirtyLabel;
    if(ts.thirtyDone){ thirtyBadge='b-green'; thirtyLabel='✓ Complete'; }
    else if(ts.thirtyPassed){ thirtyBadge='b-red'; thirtyLabel='Overdue'; }
    else if(daysLeft30!==null&&daysLeft30<=7){ thirtyBadge='b-amber'; thirtyLabel=`Due in ${daysLeft30}d`; }
    else { thirtyBadge='b-gray'; thirtyLabel='Pending'; }
    const ojtLine=c.ojt_date?`<span class="chk-date">OJT In-Home/Office (4hr): ${fmtD(c.ojt_date)}${c.ojt_signed==='yes'?` ✓${c.ojt_proof?` <a class="proof-link" href="${c.ojt_proof}" target="_blank">📄</a>`:' <span style="color:#f97316;font-size:.67rem">no proof</span>'}`:` ⚠ no signed proof${c.ojt_proof?` <a class="proof-link" href="${c.ojt_proof}" target="_blank">📄</a>`:''}`}</span>`:`<span class="chk-date" style="color:${ts.thirtyPassed?'var(--red)':'var(--gray)'}">OJT In-Home/Office (4hr): pending</span>`;
    const ojtOnlineLine=c.ojt_online?`<span class="chk-date">OJT Online (2hr): ${fmtD(c.ojt_online)} ✓${c.ojt_online_proof?` <a class="proof-link" href="${c.ojt_online_proof}" target="_blank">📄</a>`:' <span style="color:#f97316;font-size:.67rem">no proof</span>'}</span>`:`<span class="chk-date">OJT Online (2hr): pending</span>`;
    const proofLine='';
    // Annual cell
    let annBadge,annLabel;
    if(ts.isFirstYear){ annBadge='b-blue'; annLabel='Exempt — Year 1'; }
    else if(ts.annualStatus==='Overdue'){ annBadge='b-red'; annLabel='Overdue'; }
    else if(ts.annualStatus==='Due Soon'){ annBadge='b-amber'; annLabel='Due Soon'; }
    else if(ts.annualStatus==='Current'){ annBadge='b-green'; annLabel='Current'; }
    else { annBadge='b-gray'; annLabel='Not on file'; }
    const annDateLine=c.annual_date?`<span class="chk-date">Last: ${fmtD(c.annual_date)}${ts.annualNextDue?` · Next: ${ts.annualNextDue.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`:''}</span>`:
      (ts.isFirstYear?'<span class="chk-date">Required from year 2</span>':'<span class="chk-date">No training on file</span>');
    const annHrsLine=(!ts.isFirstYear&&c.annual_hrs)?(parseInt(c.annual_hrs)>=5?`<span class="chk-date" style="color:var(--green)">Hours: ${c.annual_hrs}/5 ✓</span>`:`<span class="chk-date" style="color:var(--amber)">⚠ Hours: ${c.annual_hrs}/5 required</span>`):'';
    const annProofLine=c.annual_proof?`<a class="proof-link" href="${c.annual_proof}" target="_blank">📄 proof</a>`:'';
    // Overall
    const oBadge={Current:'b-green','Annual Due Soon':'b-amber','Annual Overdue':'b-red','Training Overdue':'b-red','OJT Pending':'b-gray','Client Contact Blocked':'b-red'}[ts.overall]||'b-gray';
    return `<tr>
      <td><div class="name-cell" style="cursor:pointer" onclick="openProfile('${c.first}','${c.last}')" title="View full profile">${c.first} ${c.last} <span style="font-size:.65rem;color:var(--teal)">↗</span></div></td>
      <td><span class="chk-date">${fmtD(c.hire_date)||'—'}</span></td>
      <td><div class="chk"><span class="badge ${preBadge}">${preLabel}</span>${orientLine}${alzLine}${alzHrsLine}${profLine?`<span class="chk-date">${profLine}</span>`:''}</div></td>
      <td>${(()=>{
        if(!c.first_contact){ return ts.preContactDone?`<div class="chk"><span class="badge b-gray">Not recorded</span><span class="chk-date" style="color:var(--gray)">Required in training file</span></div>`:`<div class="chk"><span class="badge b-gray">—</span></div>`; }
        const fcD=pd(c.first_contact);
        const orientOk=c.orient_date&&pd(c.orient_date)<=fcD;
        const alzOk=c.alz_date&&pd(c.alz_date)<=fcD;
        const preOk=orientOk&&alzOk;
        const statusBadge=preOk?'b-green':'b-red';
        const statusLabel=preOk?'✓ Compliant':'⚠ Training gap';
        const note=!orientOk?'Orientation not done before contact':!alzOk?'ALZ training not done before contact':'Pre-contact training was complete';
        return `<div class="chk"><span class="badge ${statusBadge}">${statusLabel}</span><span class="chk-date">${fmtD(c.first_contact)}</span><span class="chk-date" style="color:${preOk?'var(--green)':'var(--red)'}">${note}</span></div>`;
      })()}</td>
      <td><div class="chk"><span class="badge ${thirtyBadge}">${thirtyLabel}</span><span class="chk-date">Deadline: ${ddStr||'—'}</span>${ojtLine}${ojtOnlineLine}</div></td>
      <td><div class="chk"><span class="badge ${annBadge}">${annLabel}</span>${annDateLine}${annHrsLine}${annProofLine}</div></td>
      <td><span class="badge ${oBadge}">${ts.overall}</span></td>
      <td><div class="acts"><button class="ibtn" onclick="openCGModal('training',${c.id})">✏️</button></div></td>
    </tr>`;
  }).join('');

  // Stats
  const bl=caregivers.filter(c=>!trainStatus(c).preContactDone).length;
  const ojtOv=caregivers.filter(c=>{const ts=trainStatus(c);return !ts.thirtyDone&&ts.thirtyPassed;}).length;
  const annOv=caregivers.filter(c=>trainStatus(c).annualStatus==='Overdue').length;
  const allOk=caregivers.filter(c=>trainStatus(c).overall==='Current').length;
  document.getElementById('tr-stats').innerHTML=`
    <div class="stat"><div class="lbl">Total Caregivers</div><div class="val v-navy">${caregivers.length}</div></div>
    <div class="stat"><div class="lbl">Client Contact Blocked</div><div class="val v-red">${bl}</div></div>
    <div class="stat"><div class="lbl">Training Overdue</div><div class="val v-red">${ojtOv}</div></div>
    <div class="stat"><div class="lbl">Annual Overdue</div><div class="val v-red">${annOv}</div></div>
    <div class="stat"><div class="lbl">All Current</div><div class="val v-green">${allOk}</div></div>`;
}

// ── ACTIVE COMPLIANCE RENDER ──────────────────────────────────────────
let acFilterVal='all';
function acFilter(f,btn){ acFilterVal=f; document.querySelectorAll('#panel-compliance .fb').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderAC(); }




function acWorst(c){
  const o=chkStatus(c.oig_date,90,14), e=chkStatus(c.edl_date,90,14), f=chkStatus(c.fcsr_date,365,30);
  const sv=chkStatus(c.supv_date,365,30), pr=chkStatus(c.perf_date,365,30);
  const fReg=fcsrRegStatus(c);
  const ss=[o.status,e.status,f.status,sv.status,pr.status];
  if(fReg.status==='overdue') ss.push('Overdue');
  if(ss.includes('Overdue')) return 'overdue';
  if(ss.includes('Due Soon')) return 'duesoon';
  if(ss.every(s=>s==='Current')&&fReg.status==='ok') return 'current';
  return 'pending';
}
function renderAC(){
  const q=((document.querySelector('#panel-compliance input')||{value:''}).value||globalSearch).toLowerCase();
  const list=caregivers.filter(c=>{
    const n=`${c.first} ${c.last}`.toLowerCase();
    const w=acWorst(c);
    return (!q||n.includes(q))&&(acFilterVal==='all'||w===acFilterVal);
  });
  const tbody=document.getElementById('ac-tbody');
  document.getElementById('ac-empty').style.display=list.length?'none':'block';
  if(!list.length){tbody.innerHTML='';acSelected.clear();updateACBulkBar();return;}

  tbody.innerHTML=list.map(c=>{
    const o=chkStatus(c.oig_date,90,14), e=chkStatus(c.edl_date,90,14), f=chkStatus(c.fcsr_date,365,30);
    const sv=chkStatus(c.supv_date,365,30), pr=chkStatus(c.perf_date,365,30);
    function compCell(lastStr,info,overrideStatus,proof){
      const s=overrideStatus||info.status;
      const nd=info.nextDue?info.nextDue.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';
      const dl=info.days!==null?(info.days<0?`${Math.abs(info.days)}d overdue`:`due in ${info.days}d`):'';
      return `<div class="chk">${badge(s)}${lastStr?`<span class="chk-date">Last: ${fmtD(lastStr)}${dl?' · '+dl:''}</span>`:''}${nd&&s!=='Pending'?`<span class="chk-date">Next: ${nd}</span>`:''}<span>${proofLink(proof)}</span></div>`;
    }
    const fpBadge={Clear:'b-green',Required:'b-amber',Submitted:'b-blue','N/A':'b-gray','Issues':'b-red'}[c.fp]||'b-gray';
    const chkd = acSelected.has(c.id) ? 'checked' : '';
    return `<tr>
      <td style="width:36px"><input type="checkbox" ${chkd} onchange="toggleACSelect(${c.id},this.checked)" style="accent-color:var(--teal);cursor:pointer"></td>
      <td><div class="name-cell" style="cursor:pointer" onclick="openProfile('${c.first}','${c.last}')" title="View full profile">${c.first} ${c.last} <span style="font-size:.65rem;color:var(--teal)">↗</span></div>${c.oos==='yes'?'<span class="sub" style="color:#F97316">⚠ Out-of-state</span>':''}</td>
      <td>${compCell(c.oig_date,o,c.oig_status,c.oig_proof)}</td>
      <td>${compCell(c.edl_date,e,c.edl_status,c.edl_proof)}</td>
      <td>${(()=>{ const reg=fcsrRegStatus(c); const regColor=reg.status==='ok'?'var(--green)':reg.status==='overdue'?'var(--red)':'var(--amber)'; const regIcon=reg.status==='ok'?'✓':reg.status==='overdue'?'⚠':'⏳'; return compCell(c.fcsr_date,f,c.fcsr_status,c.fcsr_proof)+`<span class="chk-date" style="color:${regColor}">${regIcon} ${reg.label}</span>`; })()}</td>
      <td><div class="chk">${c.oos==='yes'?`<span class="badge ${fpBadge}">${c.fp}</span>${c.fp_date?`<span class="chk-date">${fmtD(c.fp_date)}</span>`:''}${proofLink(c.fp_proof)}`:`<span class="badge b-gray">Not required</span>`}</div></td>
      <td>${compCell(c.supv_date,sv,'',c.supv_proof)}</td>
      <td>${compCell(c.perf_date,pr,'',c.perf_proof)}</td>
      <td><div class="acts"><button class="ibtn" onclick="openCGModal('compliance',${c.id})">✏️</button></div></td>
    </tr>`;
  }).join('');
  updateACBulkBar();

  const total=caregivers.length;
  const od=caregivers.filter(c=>acWorst(c)==='overdue').length;
  const ds=caregivers.filter(c=>acWorst(c)==='duesoon').length;
  const cur=caregivers.filter(c=>acWorst(c)==='current').length;
  const oigOd=caregivers.filter(c=>chkStatus(c.oig_date,90,14).status==='Overdue'||(c.oig_status==='Overdue')).length;
  document.getElementById('ac-stats').innerHTML=`
    <div class="stat"><div class="lbl">Active Caregivers</div><div class="val v-navy">${total}</div></div>
    <div class="stat"><div class="lbl">All Current</div><div class="val v-green">${cur}</div></div>
    <div class="stat"><div class="lbl">Due Soon</div><div class="val v-amber">${ds}</div></div>
    <div class="stat"><div class="lbl">Overdue</div><div class="val v-red">${od}</div></div>
    <div class="stat"><div class="lbl">OIG Overdue</div><div class="val v-red">${oigOd}</div></div>`;
}

function renderAlerts(){
  const alerts = [];

  // Background & References
  const readyCount = candidates.filter(c=>obDeriveStatus(c)==='Ready for Orientation'&&!c.invite_sent).length;
  const reviewCount = candidates.filter(c=>obDeriveStatus(c)==='Needs Review').length;
  if(readyCount) alerts.push({color:'#22C55E', text:`${readyCount} candidate${readyCount>1?'s':''} ready for orientation — invite pending`, tab:'onboarding'});
  if(reviewCount) alerts.push({color:'#EF4444', text:`${reviewCount} candidate${reviewCount>1?'s':''} need review`, tab:'onboarding'});

  // Training alerts moved into the Overview's "Blocked from first client
  // contact" row (her request Jul 11 2026) — the banner trio was noise here.

  // Active Compliance
  let acOverdue=0, acDueSoon=0;
  caregivers.forEach(c=>{
    const oig=chkStatus(c.oig_date,90,14), edl=chkStatus(c.edl_date,90,14), fcsr=chkStatus(c.fcsr_date,365,30);
    if([oig,edl,fcsr].some(s=>s.status==='Overdue')) acOverdue++;
    else if([oig,edl,fcsr].some(s=>s.status==='Due Soon')) acDueSoon++;
  });
  if(acOverdue) alerts.push({color:'#EF4444', text:`${acOverdue} caregiver${acOverdue>1?'s':''} overdue for compliance check`, tab:'compliance'});
  if(acDueSoon) alerts.push({color:'#F97316', text:`${acDueSoon} caregiver${acDueSoon>1?'s':''} due for check within 14 days`, tab:'compliance'});

  // Orientations
  const now=new Date(); now.setHours(0,0,0,0);
  const upcomingSess = orientSessions.filter(s=>new Date(s.date+'T00:00:00')>=now);
  const totalOpen = upcomingSess.reduce((a,s)=>a+Math.max(0,parseInt(s.capacity)-(s.bookings||[]).length),0);
  if(upcomingSess.length && totalOpen>0) alerts.push({color:'#54BDB8', text:`${upcomingSess.length} orientation session${upcomingSess.length>1?'s':''} scheduled — ${totalOpen} spot${totalOpen>1?'s':''} available`, tab:'orientations'});

  const strip = document.getElementById('alert-strip');
  if(!strip) return;
  if(!alerts.length){ strip.style.display='none'; return; }
  strip.style.display='flex';
  strip.innerHTML = alerts.map(a=>`
    <span onclick="gotoTab('${a.tab}')" style="cursor:pointer;background:rgba(255,255,255,.1);border-left:3px solid ${a.color};border-radius:0 6px 6px 0;padding:.25rem .65rem;font-size:.72rem;color:#fff;font-weight:500;white-space:nowrap;transition:.15s" onmouseover="this.style.background='rgba(255,255,255,.18)'" onmouseout="this.style.background='rgba(255,255,255,.1)'">${a.text}</span>
  `).join('');
}

function renderAll(){ renderOB(); renderTR(); renderAC(); renderOrientations(); renderAlerts(); updateAxisCareLaunchBtn(); renderClientQueue(); }
function updateAxisCareLaunchBtn(){
  const btn = document.getElementById('axiscare-launch-btn');
  if(!btn) return;
  const site = appSettings.axiscare_site||'';
  btn.href = site ? `https://${site}.axiscare.com` : 'https://axiscare.com';
}

// ── MODALS ────────────────────────────────────────────────────────────
let editingOB=null, editingCG=null;

function openOBModal(id=null){
  editingOB=id;
  document.getElementById('ob-modal-title').textContent=id?'Edit Candidate':'Add Candidate';
  const c=id?candidates.find(x=>x.id===id):null;
  const g=k=>document.getElementById(k);
  if(c){
    g('ob-first').value=c.first;g('ob-last').value=c.last;g('ob-phone').value=c.phone||'';g('ob-email').value=c.email||'';g('ob-oos').value=c.oos||'';
    g('ob-r1n').value=c.r1n||'';g('ob-r1s').value=c.r1s||'Pending';g('ob-r1-phone').value=c.r1_phone||'';g('ob-r1-email').value=c.r1_email||'';
    g('ob-r2n').value=c.r2n||'';g('ob-r2s').value=c.r2s||'Pending';g('ob-r2-phone').value=c.r2_phone||'';g('ob-r2-email').value=c.r2_email||'';
    g('ob-r3n').value=c.r3n||'';g('ob-r3s').value=c.r3s||'Pending';g('ob-r3-phone').value=c.r3_phone||'';g('ob-r3-email').value=c.r3_email||'';
    g('ob-r4n').value=c.r4n||'';g('ob-r4s').value=c.r4s||'Pending';g('ob-r4-phone').value=c.r4_phone||'';g('ob-r4-email').value=c.r4_email||'';
    [1,2,3,4].forEach(n=>{ g(`ob-r${n}-type`).value=obRefType(c[`r${n}_type`]); g(`ob-r${n}-company`).value=c[`r${n}_company`]||'';
      g(`ob-r${n}-rel`).value=c[`r${n}_rel`]||''; g(`ob-r${n}-howlong`).value=c[`r${n}_howlong`]||''; });
    g('ob-r1-proof').value=c.r1_proof||'';g('ob-r2-proof').value=c.r2_proof||'';
    g('ob-r3-proof').value=c.r3_proof||'';g('ob-r4-proof').value=c.r4_proof||'';
    g('ob-oig').value=c.oig;g('ob-oig-date').value=c.oig_date;g('ob-oig-proof').value=c.oig_proof||'';
    g('ob-edl').value=c.edl||'Pending';g('ob-edl-date').value=c.edl_date||'';g('ob-edl-proof').value=c.edl_proof||'';
    g('ob-fcsr').value=c.fcsr;g('ob-fcsr-date').value=c.fcsr_date;g('ob-fcsr-proof').value=c.fcsr_proof||'';
    g('ob-fp').value=c.fp;g('ob-fp-date').value=c.fp_date;g('ob-fp-proof').value=c.fp_proof||'';g('ob-notes').value=c.notes||'';
  } else {
    ['ob-first','ob-last','ob-phone','ob-email','ob-r1n','ob-r1-phone','ob-r1-email','ob-r2n','ob-r2-phone','ob-r2-email',
     'ob-r3n','ob-r3-phone','ob-r3-email','ob-r4n','ob-r4-phone','ob-r4-email',
     'ob-oig-date','ob-edl-date','ob-fcsr-date','ob-fp-date','ob-notes',
     'ob-r1-proof','ob-r2-proof','ob-r3-proof','ob-r4-proof','ob-oig-proof','ob-edl-proof','ob-fcsr-proof','ob-fp-proof',
     'ob-r1-type','ob-r2-type','ob-r3-type','ob-r4-type','ob-r1-company','ob-r2-company','ob-r3-company','ob-r4-company',
     'ob-r1-rel','ob-r2-rel','ob-r3-rel','ob-r4-rel','ob-r1-howlong','ob-r2-howlong','ob-r3-howlong','ob-r4-howlong'].forEach(k=>g(k).value='');
    g('ob-oos').value='';g('ob-r1s').value='Pending';g('ob-r2s').value='Pending';g('ob-r3s').value='Pending';g('ob-r4s').value='Pending';
    g('ob-oig').value='Pending';g('ob-edl').value='Pending';g('ob-fcsr').value='Pending';g('ob-fp').value='N/A';
  }
  document.getElementById('ob-modal').classList.add('open');
}
async function saveOB(){
  const g=k=>document.getElementById(k).value;
  if(!g('ob-first')||!g('ob-last')){alert('Name required.');return;}
  // Capture pre-save state
  const oldCand = editingOB ? candidates.find(x=>x.id===editingOB) : null;
  const wasReady = oldCand ? obDeriveStatus(oldCand)==='Ready for Orientation' : false;
  const wasResolved = oldCand ? (obDeriveStatus(oldCand)==='Ready for Orientation'||obDeriveStatus(oldCand)==='Needs Review') : false;
  const d={first:g('ob-first'),last:g('ob-last'),phone:g('ob-phone'),email:g('ob-email'),oos:g('ob-oos'),
    r1n:g('ob-r1n'),r1s:g('ob-r1s'),r1_phone:g('ob-r1-phone'),r1_email:g('ob-r1-email'),
    r2n:g('ob-r2n'),r2s:g('ob-r2s'),r2_phone:g('ob-r2-phone'),r2_email:g('ob-r2-email'),
    r3n:g('ob-r3n'),r3s:g('ob-r3s'),r3_phone:g('ob-r3-phone'),r3_email:g('ob-r3-email'),
    r4n:g('ob-r4n'),r4s:g('ob-r4s'),r4_phone:g('ob-r4-phone'),r4_email:g('ob-r4-email'),
    r1_proof:g('ob-r1-proof'),r2_proof:g('ob-r2-proof'),r3_proof:g('ob-r3-proof'),r4_proof:g('ob-r4-proof'),
    r1_type:obRefType(g('ob-r1-type')),r2_type:obRefType(g('ob-r2-type')),r3_type:obRefType(g('ob-r3-type')),r4_type:obRefType(g('ob-r4-type')),
    r1_company:g('ob-r1-company').trim(),r2_company:g('ob-r2-company').trim(),r3_company:g('ob-r3-company').trim(),r4_company:g('ob-r4-company').trim(),
    r1_rel:g('ob-r1-rel').trim(),r2_rel:g('ob-r2-rel').trim(),r3_rel:g('ob-r3-rel').trim(),r4_rel:g('ob-r4-rel').trim(),
    r1_howlong:g('ob-r1-howlong').trim(),r2_howlong:g('ob-r2-howlong').trim(),r3_howlong:g('ob-r3-howlong').trim(),r4_howlong:g('ob-r4-howlong').trim(),
    oig:g('ob-oig'),oig_date:g('ob-oig-date'),oig_proof:g('ob-oig-proof'),
    edl:g('ob-edl'),edl_date:g('ob-edl-date'),edl_proof:g('ob-edl-proof'),
    fcsr:g('ob-fcsr'),fcsr_date:g('ob-fcsr-date'),fcsr_proof:g('ob-fcsr-proof'),
    fp:g('ob-fp'),fp_date:g('ob-fp-date'),fp_proof:g('ob-fp-proof'),notes:g('ob-notes')};
  let saved;
  if(editingOB){ const i=candidates.findIndex(x=>x.id===editingOB); candidates[i]={...candidates[i],...d}; saved=candidates[i]; }
  else { const rec={id:safeTmpId(),...d,invite_sent:false,invite_sent_date:'',addedAt:new Date().toISOString()}; candidates.push(rec); saved=rec; }
  // Auto-stamp resolvedAt the first time a candidate reaches a terminal status
  const nowStatus = obDeriveStatus(saved);
  const nowReady = nowStatus==='Ready for Orientation';
  if(!wasResolved && (nowStatus==='Ready for Orientation'||nowStatus==='Needs Review')){
    const idx=candidates.findIndex(x=>x.id===saved.id);
    candidates[idx].resolvedAt = new Date().toISOString();
    candidates[idx].resolvedStatus = nowStatus;
    saved = candidates[idx];
  }
  /* 421: a NEW person is shown only once the database has given their number
     (a failed add is taken back off and the office is told). */
  if(!editingOB){ closeModal('ob-modal'); await saveCandidates(); renderOB(); renderAlerts(); return; }
  saveCandidates(); closeModal('ob-modal'); renderOB(); renderAlerts();
}

/* Candidate sync payload, shared by saveOB and any other path that persists a
   candidate (e.g. recording a single background check from the side drawer) so
   the AxisCare / Google Drive sync stays identical no matter where the edit
   came from. */
function obCandPayload(saved){
  return {
    candidate_id: saved.id,
    first: saved.first, last: saved.last, full_name:`${saved.first} ${saved.last}`,
    phone: saved.phone||'', email: saved.email||'',
    r1_name:saved.r1n||'', r1_status:saved.r1s||'', r1_proof:saved.r1_proof||'',
    r2_name:saved.r2n||'', r2_status:saved.r2s||'', r2_proof:saved.r2_proof||'',
    r3_name:saved.r3n||'', r3_status:saved.r3s||'', r3_proof:saved.r3_proof||'',
    r4_name:saved.r4n||'', r4_status:saved.r4s||'', r4_proof:saved.r4_proof||'',
    oig_status:saved.oig||'', oig_date:saved.oig_date||'', oig_proof:saved.oig_proof||'',
    edl_status:saved.edl||'', edl_date:saved.edl_date||'', edl_proof:saved.edl_proof||'',
    fcsr_status:saved.fcsr||'', fcsr_date:saved.fcsr_date||'', fcsr_proof:saved.fcsr_proof||'',
    fp_status:saved.fp||'', fp_date:saved.fp_date||'', fp_proof:saved.fp_proof||'',
    overall_status:obDeriveStatus(saved),
    notes:saved.notes||'',
    timestamp:new Date().toISOString()
  };
}
/* Persist a single change to a candidate board with the SAME side effects saveOB
   applies: resolution stamp, the AxisCare "ready for orientation" push the first
   time they become ready. Used by the drawer's check
   recording so those never get skipped. */
function bgrApplyBoardChange(candId, changes){
  const i = candidates.findIndex(x => x.id === candId);
  if(i < 0) return;
  const old = candidates[i];
  const wasReady = obDeriveStatus(old) === 'Ready for Orientation';
  const wasResolved = wasReady || obDeriveStatus(old) === 'Needs Review';
  candidates[i] = { ...old, ...changes };
  const saved = candidates[i];
  const nowStatus = obDeriveStatus(saved);
  const nowReady = nowStatus === 'Ready for Orientation';
  if(!wasResolved && (nowReady || nowStatus === 'Needs Review')){
    saved.resolvedAt = new Date().toISOString();
    saved.resolvedStatus = nowStatus;
  }
  saveCandidates();
  try{ renderOB(); renderAlerts(); renderPeopleChecks(); }catch(e){}
}

// ── ORIENTATION INVITE ────────────────────────────────────────────────
let invitingId=null;
function fmtPhone(p){ const d=p.replace(/\D/g,''); return d.length===10?`+1${d}`:d.length===11&&d[0]==='1'?`+${d}`:`+1${d}`; }

function buildBookingUrl(c){
  const now=new Date(); now.setHours(0,0,0,0);
  const available=orientSessions.filter(s=>{
    const sd=new Date(s.date+'T00:00:00');
    return sd>=now && (s.bookings||[]).length<parseInt(s.capacity);
  }).sort((a,b)=>a.date.localeCompare(b.date));
  const encoded=btoa(JSON.stringify(available.map(s=>({
    id:s.id, date:s.date, time:s.time,
    remote:s.is_remote==='yes', link:s.video_link||'',
    notes:s.notes||'', spots:parseInt(s.capacity)-(s.bookings||[]).length,
    dur:getOrientDuration()
  }))));
  // email + office ride along so the GoHighLevel relay can match the contact
  // that already exists from the offer stage, and tag the right office.
  return `${ORIENT_BOOKING_URL}?sessions=${encoded}&first=${encodeURIComponent(c.first)}&last=${encodeURIComponent(c.last)}&phone=${encodeURIComponent(c.phone||'')}&email=${encodeURIComponent(c.email||'')}&office=${encodeURIComponent(c.office||'springfield')}&id=${encodeURIComponent(c.id)}`;
}

function buildInviteMsg(c, url){
  return `Hi ${c.first}! Congratulations, you've been cleared to join Caring Companions! 🎉 Please choose your orientation date here: ${url}\n\nQuestions? Call/text (417) 234-8494. We can't wait to meet you!`;
}

function openInviteModal(id){
  invitingId=id;
  const c=candidates.find(x=>x.id===id);
  document.getElementById('inv-name').textContent=`${c.first} ${c.last}`;
  document.getElementById('inv-phone').textContent=c.phone?fmtPhone(c.phone):'⚠ No phone — add in Edit';

  // Show available sessions
  const now=new Date(); now.setHours(0,0,0,0);
  const avail=orientSessions.filter(s=>{
    const sd=new Date(s.date+'T00:00:00');
    return sd>=now && (s.bookings||[]).length<parseInt(s.capacity);
  }).sort((a,b)=>a.date.localeCompare(b.date));
  const sessEl=document.getElementById('inv-sessions-list');
  if(!avail.length){
    sessEl.innerHTML='<div style="padding:.75rem 1rem;font-size:.78rem;color:var(--gray);font-style:italic">No upcoming sessions with open spots. <a href="#" onclick="closeModal(\'invite-modal\');gotoTab(\'orientations\');return false" style="color:var(--teal);font-weight:600">Add a session first →</a></div>';
  } else {
    sessEl.innerHTML=avail.map(s=>{
      const d=new Date(s.date+'T00:00:00');
      const dow=d.toLocaleDateString('en-US',{weekday:'short'});
      const dt=d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
      const spots=parseInt(s.capacity)-(s.bookings||[]).length;
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:.5rem .85rem;border-bottom:1px solid var(--border);font-size:.78rem">
        <span><strong>${dow} ${dt}</strong> · ${fmtTime(s.time)} · ${s.is_remote==='yes'?'Remote':'In-Person'}</span>
        <span style="color:var(--green-text);font-weight:600">${spots} spot${spots>1?'s':''} open</span>
      </div>`;
    }).join('');
  }

  const url = buildBookingUrl(c);
  document.getElementById('inv-msg').textContent = buildInviteMsg(c, url);
  document.getElementById('inv-copy-link').onclick=(e)=>{
    e.preventDefault();
    navigator.clipboard.writeText(url).then(()=>{
      document.getElementById('inv-copy-link').textContent='✅ Copied!';
      setTimeout(()=>document.getElementById('inv-copy-link').textContent='Copy link only',2000);
    });
  };
  document.getElementById('inv-sending').style.display='none';
  document.getElementById('inv-actions').style.display='flex';
  document.getElementById('invite-modal').classList.add('open');
}

async function confirmSendInvite(){
  const c=candidates.find(x=>x.id===invitingId);
  if(!c.phone){alert('No phone number on file. Please edit the candidate and add a cell number first.');return;}
  document.getElementById('inv-sending').style.display='block';
  document.getElementById('inv-actions').style.display='none';
  const url=buildBookingUrl(c);
  try {
    await sendCandidateSMS({
      first: c.first, last: c.last,
      phone: c.phone, email: c.email||'',
      message: buildInviteMsg(c, url)
    });
  } catch(e){
    if(!confirm(`⚠️ The text could NOT be sent automatically (${e.message}).\n\nUse "Copy link only" and text the candidate yourself.\n\nMark them as Invited anyway?`)){
      document.getElementById('inv-sending').style.display='none';
      document.getElementById('inv-actions').style.display='flex';
      return;
    }
  }
  const i=candidates.findIndex(x=>x.id===invitingId);
  candidates[i].invite_sent=true;
  candidates[i].invite_sent_date=new Date().toISOString().split('T')[0];
  saveCandidates(); closeModal('invite-modal'); renderOB(); renderAlerts();
}
let _notHireId=null;
function openNotHireModal(id){
  const c=candidates.find(x=>x.id===id);
  if(!c) return;
  _notHireId=id;
  document.getElementById('not-hire-name').textContent=`${c.first} ${c.last}`;
  document.getElementById('not-hire-reason').value='';
  document.getElementById('not-hire-notes').value='';
  document.getElementById('not-hire-modal').classList.add('open');
}
async function confirmNotHire(){
  const reason=document.getElementById('not-hire-reason').value;
  if(!reason){ alert('Please select a reason.'); return; }
  const notes=document.getElementById('not-hire-notes').value.trim();
  const c=candidates.find(x=>x.id===_notHireId);
  if(!c){ closeModal('not-hire-modal'); return; }
  c.not_hired=true;
  c.not_hired_reason=reason;
  c.not_hired_notes=notes;
  c.not_hired_date=new Date().toISOString().split('T')[0];
  _notHireId=null;
  saveCandidates(); closeModal('not-hire-modal'); renderOB(); renderAlerts();
  // Offer a courtesy text (deliberately generic — never text the reason;
  // background-check rejections have their own formal notice requirements)
  if(c.phone && reason!=='withdrew'){
    const msg=`Hi ${c.first}, thank you for your interest in joining Caring Companions. After careful review, we won't be moving forward with your application at this time. We appreciate the time you invested and wish you all the best. — Caring Companions (417) 234-8494`;
    if(confirm(`Send ${c.first} a courtesy text letting them know?\n\n"${msg}"`)){
      try {
        await sendCandidateSMS({ first:c.first, last:c.last, phone:c.phone, email:c.email||'', message:msg });
        alert('✅ Text sent.');
      } catch(e){
        alert(`⚠️ The text could not be sent (${e.message}). You may want to reach out to ${c.first} directly.`);
      }
    }
  }
}
function reactivateOB(id){
  const c=candidates.find(x=>x.id===id);
  if(!c||!confirm(`Reactivate ${c.first} ${c.last}? They will return to the active pipeline.`)) return;
  delete c.not_hired; delete c.not_hired_reason; delete c.not_hired_notes; delete c.not_hired_date;
  saveCandidates(); renderOB(); renderAlerts();
}

// ── MANUAL REFERENCE ──────────────────────────────────────────────────
let _mrefCandId=null, _mrefSlot=null;
/* extra (R2, 2026-10-01) = { type, rehire, trust_family }. Her decision 1:
   "not eligible for rehire" makes a reference at most Conditional, never
   Negative on its own, and "our policy doesn't allow us to say" is neutral.
   A personal reference who would not, or only with reservations, trust them
   with their own family is at least Conditional too. The Negative rules are
   unchanged. A past employer is only asked about attendance, so for a
   professional reference the average is over the scales actually asked;
   everything else keeps the original divide-by-three. */
function scoreManualRef(recommend,reliability,interpersonal,honesty,concerns,extra){
  if(!recommend) return null;
  if(recommend==='no'||concerns==='serious') return 'Negative';
  const x=extra||{};
  const scores={Excellent:3,Good:2,Fair:1,Poor:0};
  const given=[reliability,interpersonal,honesty].filter(Boolean);
  const denom=obRefType(x.type)==='professional' ? Math.max(1,given.length) : 3;
  const avg=(given.map(r=>scores[r]||0).reduce((a,b)=>a+b,0))/denom;
  if(recommend==='reservations'||concerns==='minor'||avg<1.5) return 'Conditional';
  if(x.rehire==='no') return 'Conditional';
  if(x.trust_family==='no'||x.trust_family==='reservations') return 'Conditional';
  return 'Positive';
}
/* The office phone form shows the same two question sets as the online form.
   Answers belong to the set that is showing; the other set's fields are
   ignored on save. */
function mrefIsPro(){ return obRefType(document.getElementById('mref-type').value)==='professional'; }
function mrefTypeUI(){
  const pro=mrefIsPro();
  document.querySelectorAll('#manual-ref-modal .mref-pro').forEach(el=>{ el.style.display=pro?'':'none'; });
  document.querySelectorAll('#manual-ref-modal .mref-per').forEach(el=>{ el.style.display=pro?'none':''; });
  const st=document.getElementById('mref-still'), to=document.getElementById('mref-emp-to');
  if(st&&to){ to.disabled=st.checked; if(st.checked) to.value=''; }
  updateMrefPreview();
}
function mrefCollect(){
  const g=k=>{ const el=document.getElementById(k); return el?String(el.value||'').trim():''; };
  const pro=mrefIsPro();
  const still=!!(document.getElementById('mref-still')||{}).checked;
  return {
    type: pro?'professional':'personal',
    recommend:g('mref-recommend'), reliability:g('mref-reliability'),
    interpersonal: pro?'':g('mref-interpersonal'), honesty: pro?'':g('mref-honesty'),
    concerns:g('mref-concerns'), notes:g('mref-notes'),
    how_long: pro?'':g('mref-howlong'), rel_answer: pro?'':g('mref-rel-answer'),
    trust_family: pro?'':g('mref-trust'),
    employer_confirmed: pro?g('mref-employer'):'', emp_from: pro?g('mref-emp-from'):'',
    emp_to: pro?(still?'present':g('mref-emp-to')):'', job_title: pro?g('mref-job-title'):'',
    hours_type: pro?g('mref-hours'):'', rehire: pro?g('mref-rehire'):'',
    responder_title: pro?g('mref-resp-title'):'',
  };
}
function updateMrefPreview(){
  const a=mrefCollect();
  const score=scoreManualRef(a.recommend,a.reliability,a.interpersonal,a.honesty,a.concerns,
    { type:a.type, rehire:a.rehire, trust_family:a.trust_family });
  const el=document.getElementById('mref-score-preview');
  if(!score){el.style.display='none';return;}
  const colors={Positive:'#d1fae5',Conditional:'#fef3c7',Negative:'#fee2e2'};
  const text={Positive:'✅ This reference will score as Positive',Conditional:'⚠️ This reference will score as Conditional',Negative:'❌ This reference will score as Negative'};
  el.style.display='block';el.style.background=colors[score];el.style.color='#16283a';el.textContent=text[score];
}
function openManualRef(candidateId, slot){
  _mrefCandId=candidateId; _mrefSlot=slot;
  const c=candidates.find(x=>x.id===candidateId);
  document.getElementById('mref-title').textContent=`Record Reference ${slot} — ${c.first} ${c.last}`;
  document.getElementById('mref-sub').textContent=`Completing this form on behalf of the reference (phone/in-person). Will be saved as staff-completed.`;
  const existing=c[`r${slot}_manual`]||{};
  const g=k=>document.getElementById(k);
  g('mref-staff').value=existing.staff||'';
  g('mref-via').value=existing.via||'Phone call';
  g('mref-date').value=existing.date||new Date().toISOString().split('T')[0];
  g('mref-name').value=c[`r${slot}n`]||existing.name||'';
  /* Older records said 'Professional' / 'Personal'; the board now stores the
     lower-case word. Default stays Professional, as it always was. */
  g('mref-type').value=obRefType(existing.type)||obRefType(c[`r${slot}_type`])||'professional';
  g('mref-rel').value=existing.relationship||c[`r${slot}_rel`]||'';
  g('mref-howlong').value=existing.how_long||c[`r${slot}_howlong`]||'';
  g('mref-recommend').value=existing.recommend||'';
  g('mref-reliability').value=existing.reliability||'';
  g('mref-interpersonal').value=existing.interpersonal||'';
  g('mref-honesty').value=existing.honesty||'';
  g('mref-concerns').value=existing.concerns||'none';
  g('mref-notes').value=existing.notes||'';
  g('mref-rel-answer').value=existing.rel_answer||'';
  g('mref-trust').value=existing.trust_family||'';
  g('mref-employer').value=existing.employer_confirmed||c[`r${slot}_company`]||'';
  g('mref-emp-from').value=existing.emp_from||'';
  const still=String(existing.emp_to||'').toLowerCase()==='present';
  g('mref-still').checked=still;
  g('mref-emp-to').value=still?'':(existing.emp_to||'');
  g('mref-job-title').value=existing.job_title||'';
  g('mref-hours').value=existing.hours_type||'';
  g('mref-rehire').value=existing.rehire||'';
  g('mref-resp-title').value=existing.responder_title||'';
  mrefTypeUI();
  document.getElementById('manual-ref-modal').classList.add('open');
}
/* ---- Reference check record (printable) --------------------------------
   Viventium holds the personnel file, so a finished reference check has to
   leave here as a document. Opens a self-contained page and prints it, which
   means no hub styling bleeds into what gets uploaded, and the file is proof
   in its own right: who was asked, what they said, who collected it, when. */
const REF_LABELS = {
  recommend:    ['Would you rehire / recommend?', {yes:'Yes, without reservation', reservations:'Yes, with reservations', no:'No'}],
  reliability:  ['Reliability and attendance', {}],
  interpersonal:['Interpersonal skills', {}],
  honesty:      ['Honesty and trustworthiness', {}],
  concerns:     ['Any concerns raised?', {none:'None', minor:'Minor', serious:'Serious'}],
};
function refReport(idOrRecord){
  const c = (idOrRecord && typeof idOrRecord === 'object')
    ? idOrRecord
    : candidates.find(x => x.id === idOrRecord);
  if (!c) return;
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const slots = [1,2,3,4].map(n => ({ n, name: c['r'+n+'n'], status: c['r'+n+'s'], phone: c['r'+n+'_phone'], email: c['r'+n+'_email'], m: c['r'+n+'_manual'] }))
                         .filter(r => r.name || (r.m && r.m.name));
  if (!slots.length) { alert('No references recorded for this candidate yet.'); return; }

  const answer = (m, k) => {
    const [label, map] = REF_LABELS[k];
    const raw = m ? m[k] : '';
    return '<tr><th>' + label + '</th><td>' + (raw ? esc(map[raw] || raw) : '<i>not recorded</i>') + '</td></tr>';
  };
  const block = r => {
    const m = r.m || {};
    const tone = r.status === 'Positive' ? '#15803D' : r.status === 'Negative' ? '#B00020' : r.status === 'Conditional' ? '#B45309' : '#6E6559';
    return '<section>'
      + '<h2>Reference ' + r.n + ': ' + esc(m.name || r.name || '') + ''
      + '<span style="float:right;color:' + tone + '">' + esc(r.status || 'Pending') + '</span></h2>'
      + '<table class="meta">'
      + '<tr><th>Relationship</th><td>' + esc(m.relationship || '') + '</td>'
      + '<th>Known for</th><td>' + esc(m.how_long || '') + '</td></tr>'
      + '<tr><th>Contact</th><td>' + esc(r.phone || '') + (r.email ? ' · ' + esc(r.email) : '') + '</td>'
      + '<th>Type</th><td>' + esc(obRefTypeLabel(m.type || c['r'+r.n+'_type'], c['r'+r.n+'_company'] || m.employer_confirmed || '') || m.type || '') + '</td></tr>'
      + '<tr><th>Contacted on</th><td>' + esc(m.date || '') + '</td>'
      + '<th>Method</th><td>' + esc(m.via || '') + '</td></tr>'
      + '<tr><th>Collected by</th><td colspan="3">' + esc(m.staff || '') + '</td></tr>'
      + obRefSendRecordLines(c, r.n).map(([k, v]) => '<tr><th>' + esc(k) + '</th><td colspan="3">' + esc(v) + '</td></tr>').join('')
      + '</table>'
      + '<table class="ans">' + (r.m
          ? obRefQA(m, m.type || c['r'+r.n+'_type']).filter(([q]) => q !== 'Anything they added')
              .map(([q, a]) => '<tr><th>' + esc(q) + '</th><td>' + esc(a) + '</td></tr>').join('')
          : Object.keys(REF_LABELS).map(k => answer(m, k)).join('')) + '</table>'
      + (m.date_check ? '<p class="notes"><b>Dates check:</b> ' + esc(obDateCheckText(m.date_check)) + '</p>' : '')
      + (m.notes ? '<p class="notes"><b>Notes:</b> ' + esc(m.notes) + '</p>' : '')
      + '</section>';
  };

  const today = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  const html = '<!doctype html><html><head><meta charset="utf-8">'
    + '<title>Reference Checks - ' + esc(c.first + ' ' + c.last) + '</title><style>'
    + 'body{font-family:Georgia,serif;color:#16283a;max-width:780px;margin:28px auto;padding:0 26px;line-height:1.5;}'
    + 'h1{font-size:20px;margin:0;color:#0D365F;} .sub{color:#6E6559;font-size:13px;margin:2px 0 18px;}'
    + '.who{border:1px solid #d8d3c8;border-radius:6px;padding:10px 14px;margin-bottom:18px;font-size:14px;}'
    + 'section{border-top:2px solid #0D365F;margin-top:20px;padding-top:8px;break-inside:avoid;}'
    + 'h2{font-size:15px;color:#0D365F;margin:0 0 8px;}'
    + 'table{width:100%;border-collapse:collapse;font-size:13.5px;margin-bottom:8px;}'
    + 'table.meta th{width:88px;} table.ans th{width:52%;}'
    + 'th{text-align:left;font-weight:700;color:#6E6559;font-size:12px;padding:3px 6px 3px 0;vertical-align:top;}'
    + 'td{padding:3px 12px 3px 0;vertical-align:top;}'
    + 'table.ans tr{border-bottom:1px solid #efece4;}'
    + '.notes{font-size:13.5px;background:#faf9f6;border-left:3px solid #d8d3c8;padding:6px 10px;margin:6px 0 0;}'
    + 'footer{margin-top:26px;border-top:1px solid #d8d3c8;padding-top:8px;font-size:12px;color:#6E6559;}'
    + '@media print{body{margin:0;} @page{margin:14mm;}}'
    + '</style></head><body>'
    + '<h1>Caring Companions In-Home Senior Care</h1>'
    + '<div class="sub">Reference Check Record</div>'
    + '<div class="who"><b>' + esc(c.first + ' ' + c.last) + '</b>'
    + (c.phone ? ' &middot; ' + esc(c.phone) : '') + (c.email ? ' &middot; ' + esc(c.email) : '')
    + '<br><span style="color:#6E6559;font-size:13px;">'
    + (c.addedAt ? 'Candidate added ' + esc(String(c.addedAt).slice(0,10)) + ' &middot; ' : '')
    + slots.filter(r => r.status === 'Positive').length + ' of ' + slots.length + ' references positive</span></div>'
    + slots.map(block).join('')
    + '<footer>Prepared from the Caring Companions hiring record on ' + today + '. '
    + 'References were contacted under the signed Reference Check and Authorization on file.</footer>'
    + '</body></html>';

  const w = window.open('', '_blank');
  if (!w) { alert('Your browser blocked the popup. Allow popups for this site, then try again.'); return; }
  w.document.write(html); w.document.close();
  w.onload = () => { w.focus(); w.print(); };
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 400);
}
async function saveManualRef(){
  const g=k=>document.getElementById(k).value;
  if(!g('mref-recommend')){ alert('Please select a recommendation.'); return; }
  const a=mrefCollect();
  const score=scoreManualRef(a.recommend,a.reliability,a.interpersonal,a.honesty,a.concerns,
    { type:a.type, rehire:a.rehire, trust_family:a.trust_family });
  const manual=Object.assign({staff:g('mref-staff'),via:g('mref-via'),date:g('mref-date'),name:g('mref-name'),
    relationship:g('mref-rel')}, a, {date_check:''});
  const i=candidates.findIndex(x=>x.id===_mrefCandId);
  if(i<0) return;
  const id=candidates[i].id, slot=_mrefSlot;
  candidates[i][`r${slot}n`]=g('mref-name');
  candidates[i][`r${slot}s`]=score;
  candidates[i][`r${slot}_manual`]=manual;
  candidates[i][`r${slot}_type`]=a.type;
  if(a.type==='professional' && a.employer_confirmed && !candidates[i][`r${slot}_company`]) candidates[i][`r${slot}_company`]=a.employer_confirmed;
  /* A new answer means the old PDF no longer matches it. */
  delete candidates[i][`r${slot}_pdf`];
  saveCandidates(); closeModal('manual-ref-modal'); renderOB(); renderAlerts();
  try{ renderPeopleChecks(); renderReferenceActivity(); }catch(e){}
  /* R3: the dates check and the PDF happen after the answer is saved, so a
     failure in either never loses the answer. */
  await obAfterRefRecorded(id, slot, { save:true, quiet:false });
}

let cgReturnTab='training';
function openCGModal(tab,id=null){ cgReturnTab=tab; editingCG=id;
  document.getElementById('cg-modal-title').textContent=id?'Edit Caregiver':'Add Caregiver';
  const c=id?caregivers.find(x=>x.id===id):null;
  const g=k=>document.getElementById(k);
  const fields=['cg-first','cg-last','cg-hire','cg-axiscare-id','cg-orient','cg-orient-proof','cg-alz','cg-alz-hrs','cg-alz-proof','cg-first-contact','cg-ojt-date','cg-ojt-proof','cg-ojt-online','cg-ojt-online-proof','cg-annual','cg-annual-hrs','cg-annual-proof','cg-ethics-date','cg-ethics-proof','cg-rights-date','cg-rights-proof','cg-oig','cg-oig-proof','cg-edl','cg-edl-proof','cg-fcsr-reg','cg-fcsr','cg-fcsr-proof','cg-fp-date','cg-fp-proof','cg-supv-date','cg-supv-proof','cg-perf-date','cg-perf-proof'];
  if(c){
    g('cg-first').value=c.first;g('cg-last').value=c.last;g('cg-hire').value=c.hire_date||'';
    g('cg-oos').value=c.oos||'no';g('cg-orient').value=c.orient_date||'';g('cg-alz').value=c.alz_date||'';
    g('cg-orient-proof').value=c.orient_proof||'';g('cg-alz-hrs').value=c.alz_hrs||'';g('cg-alz-proof').value=c.alz_proof||'';g('cg-first-contact').value=c.first_contact||'';g('cg-ojt-online-proof').value=c.ojt_online_proof||'';
    g('cg-ojt-date').value=c.ojt_date||'';g('cg-ojt-signed').value=c.ojt_signed||'no';
    g('cg-ojt-proof').value=c.ojt_proof||'';g('cg-ojt-online').value=c.ojt_online||'';
    g('cg-annual').value=c.annual_date||'';g('cg-annual-hrs').value=c.annual_hrs||'';g('cg-annual-proof').value=c.annual_proof||'';
    g('cg-ethics-date').value=c.ethics_date||'';g('cg-ethics-proof').value=c.ethics_proof||'';
    g('cg-rights-date').value=c.rights_date||'';g('cg-rights-proof').value=c.rights_proof||'';
    g('cg-oig').value=c.oig_date||'';g('cg-oig-s').value=c.oig_status||'';g('cg-oig-proof').value=c.oig_proof||'';
    g('cg-edl').value=c.edl_date||'';g('cg-edl-s').value=c.edl_status||'';g('cg-edl-proof').value=c.edl_proof||'';
    g('cg-fcsr-reg').value=c.fcsr_reg_date||'';g('cg-fcsr').value=c.fcsr_date||'';g('cg-fcsr-s').value=c.fcsr_status||'';g('cg-fcsr-proof').value=c.fcsr_proof||'';
    g('cg-fp').value=c.fp||'N/A';g('cg-fp-date').value=c.fp_date||'';g('cg-fp-proof').value=c.fp_proof||'';
    g('cg-supv-date').value=c.supv_date||'';g('cg-supv-proof').value=c.supv_proof||'';
    g('cg-perf-date').value=c.perf_date||'';g('cg-perf-proof').value=c.perf_proof||'';
  } else { fields.forEach(k=>g(k).value=''); g('cg-oos').value='no';g('cg-ojt-signed').value='no';g('cg-oig-s').value='';g('cg-edl-s').value='';g('cg-fcsr-s').value='';g('cg-fp').value='N/A'; }
  document.getElementById('cg-modal').classList.add('open');
}
async function saveCG(){
  const g=k=>document.getElementById(k).value;
  if(!g('cg-first')||!g('cg-last')){alert('Name required.');return;}
  // Capture pre-save state to detect status changes
  const oldCG = editingCG ? caregivers.find(x=>x.id===editingCG) : null;
  const d={first:g('cg-first'),last:g('cg-last'),hire_date:g('cg-hire'),oos:g('cg-oos'),axiscare_id:g('cg-axiscare-id'),
    orient_date:g('cg-orient'),orient_proof:g('cg-orient-proof'),alz_date:g('cg-alz'),alz_hrs:g('cg-alz-hrs'),alz_proof:g('cg-alz-proof'),first_contact:g('cg-first-contact'),
    ojt_date:g('cg-ojt-date'),ojt_signed:g('cg-ojt-signed'),ojt_proof:g('cg-ojt-proof'),ojt_online:g('cg-ojt-online'),ojt_online_proof:g('cg-ojt-online-proof'),
    annual_date:g('cg-annual'),annual_hrs:g('cg-annual-hrs'),annual_proof:g('cg-annual-proof'),
    ethics_date:g('cg-ethics-date'),ethics_proof:g('cg-ethics-proof'),
    rights_date:g('cg-rights-date'),rights_proof:g('cg-rights-proof'),
    oig_date:g('cg-oig'),oig_status:g('cg-oig-s'),oig_proof:g('cg-oig-proof'),
    edl_date:g('cg-edl'),edl_status:g('cg-edl-s'),edl_proof:g('cg-edl-proof'),
    fcsr_reg_date:g('cg-fcsr-reg'),fcsr_date:g('cg-fcsr'),fcsr_status:g('cg-fcsr-s'),fcsr_proof:g('cg-fcsr-proof'),
    fp:g('cg-fp'),fp_date:g('cg-fp-date'),fp_proof:g('cg-fp-proof'),
    supv_date:g('cg-supv-date'),supv_proof:g('cg-supv-proof'),
    perf_date:g('cg-perf-date'),perf_proof:g('cg-perf-proof')};
  let savedCG;
  if(editingCG){ const i=caregivers.findIndex(x=>x.id===editingCG); caregivers[i]={...caregivers[i],...d}; savedCG=caregivers[i]; }
  else { const rec={id:safeTmpId(),...d}; caregivers.push(rec); savedCG=rec; }
  const isNew=!editingCG, back=cgReturnTab;
  /* 421: a NEW caregiver is shown only once the database has given their number. */
  if(isNew){ closeModal('cg-modal'); await saveCaregivers(); }
  else { saveCaregivers(); closeModal('cg-modal'); }
  renderAlerts();
  if(back==='training') renderTR(); else renderAC();
}


function closeModal(id){ document.getElementById(id).classList.remove('open'); editingOB=null; editingCG=null; editingOrient=null; editScope='single'; pendingEditId=null; pendingDeleteId=null; pendingCancelSessId=null; pendingCancelBookingIdx=null; }
document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{ if(e.target===o) closeModal(o.id); }));
document.getElementById('or-date')?.addEventListener('change',()=>{ if(document.getElementById('or-recur').value!=='none') updateRecurPreview(); });
document.getElementById('or-recur-count')?.addEventListener('change', updateRecurPreview);
document.getElementById('or-recur-end-date')?.addEventListener('change', updateRecurPreview);

// ── ORIENTATIONS ──────────────────────────────────────────────────────
const ORIENT_ADDR = '1331 N Stewart Ave Ste B, Springfield MO 65802';
const BOOKING_PAGE = 'orientation-booking.html';
/* 2026-10-01: the booking page lives on the Staffing hub only. Built from this page's own address it pointed at
   cc.mo-care.com/orientation-booking.html, which does not exist (404), whenever the invite came from the CC hub. */
const ORIENT_BOOKING_URL = 'https://sc.mo-care.com/orientation-booking.html';

let orientSessions = JSON.parse(localStorage.getItem('cc_orient_sessions') || '[]');
let eodReports = [];
let orientId = parseInt(localStorage.getItem('cc_orient_id') || '1');
/* Self-serve orient_bookings that have not been synced into the roster yet.
   READ-ONLY, transient, display-only: loaded when the Orientations tab opens and
   shown as a labeled "pending" section. They are NEVER pushed into a session's
   bookings[] (attendance/cancel index into that array — injecting would shift
   indices and could act on the wrong person), and viewing never persists them.
   Folding them in is the explicit Sync action (orientSyncBookings). */
let ORIENT_PENDING = [];
let calViewMonth = new Date(); calViewMonth.setDate(1); calViewMonth.setHours(0,0,0,0);
let calSelectedDate = null;
let editingOrient = null;
let editScope = 'single';   // 'single' | 'future'
let pendingEditId = null;
let pendingDeleteId = null;
let blCandidateId = null;
let showPastSessions = false;
let pendingCancelSessId = null;
let pendingCancelBookingIdx = null;
let activeTab = 'home';
let globalSearch = '';
let acSelected = new Set();

function saveOrientStore(){
  localStorage.setItem('cc_orient_sessions', JSON.stringify(orientSessions));
  localStorage.setItem('cc_orient_id', String(orientId));
  syncToSupabase('orient_sessions', orientSessions);
}

function fmtTime(t){
  if(!t) return '';
  const [h,m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}
function fmtSessionDate(dateStr){
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
}
function sessDateShort(dateStr){
  const d = new Date(dateStr + 'T00:00:00');
  return {
    dow: d.toLocaleDateString('en-US',{weekday:'short'}),
    date: d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
  };
}

// ── ORIENTATION SETTINGS ─────────────────────────────────────────────

const DEFAULT_ORIENT_SCHEDULE = {
  mon:{enabled:false,start:'09:00',end:'17:00'},
  tue:{enabled:false,start:'09:00',end:'17:00'},
  wed:{enabled:false,start:'09:00',end:'17:00'},
  thu:{enabled:false,start:'09:00',end:'17:00'},
  fri:{enabled:false,start:'09:00',end:'17:00'},
  sat:{enabled:false,start:'09:00',end:'17:00'},
  sun:{enabled:false,start:'09:00',end:'17:00'},
};

function getOrientConfig(){
  return appSettings.orient_config || {
    schedule: DEFAULT_ORIENT_SCHEDULE,
    duration: 2, capacity: 6, facilitator: '', location: 'inperson',
    address: '1331 N Stewart Ave Ste B, Springfield MO 65802'
  };
}

function buildTimeOptions(selectedVal){
  let html = '';
  for(let h=6; h<=21; h++){
    for(let m=0; m<60; m+=30){
      const val = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      const ampm = h < 12 ? 'AM' : 'PM';
      const h12  = h % 12 || 12;
      const label = `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
      html += `<option value="${val}"${val===selectedVal?' selected':''}>${label}</option>`;
    }
  }
  return html;
}

function initOrientSettings(){
  const container = document.getElementById('orient-schedule-days');
  if(!container) return;
  const cfg = getOrientConfig();
  const sched = cfg.schedule || DEFAULT_ORIENT_SCHEDULE;
  const DAYS = [
    {key:'mon',label:'Monday'},   {key:'tue',label:'Tuesday'},
    {key:'wed',label:'Wednesday'},{key:'thu',label:'Thursday'},
    {key:'fri',label:'Friday'},   {key:'sat',label:'Saturday'},
    {key:'sun',label:'Sunday'}
  ];
  container.innerHTML = DAYS.map(({key,label}) => {
    const dc = sched[key] || {enabled:false,start:'09:00',end:'17:00'};
    const on = dc.enabled;
    return `<div style="display:flex;align-items:center;gap:.65rem;padding:.4rem 0;border-bottom:1px solid var(--border)">
      <div id="odt-wrap-${key}" onclick="orientDayToggle('${key}')" style="position:relative;width:38px;height:22px;flex-shrink:0;cursor:pointer">
        <input type="checkbox" id="odt-${key}" ${on?'checked':''} style="opacity:0;width:0;height:0;position:absolute">
        <div id="odt-track-${key}" style="position:absolute;inset:0;border-radius:20px;background:${on?'var(--navy)':'#E8E2D8'};transition:.2s"></div>
        <div id="odt-knob-${key}" style="position:absolute;top:3px;left:${on?'19px':'3px'};width:16px;height:16px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>
      </div>
      <span style="font-size:.82rem;font-weight:600;width:5.5rem;color:${on?'var(--navy)':'#A89C8B'}" id="odt-lbl-${key}">${label}</span>
      <select id="ods-${key}-start" onchange="updateOrientGenPreview()"
        style="padding:.25rem .45rem;border:1.5px solid var(--border);border-radius:6px;font-size:.76rem;font-family:inherit;${on?'':'opacity:.35;pointer-events:none'}">
        ${buildTimeOptions(dc.start)}
      </select>
      <span style="font-size:.75rem;color:var(--gray)">–</span>
      <select id="ods-${key}-end" onchange="updateOrientGenPreview()"
        style="padding:.25rem .45rem;border:1.5px solid var(--border);border-radius:6px;font-size:.76rem;font-family:inherit;${on?'':'opacity:.35;pointer-events:none'}">
        ${buildTimeOptions(dc.end)}
      </select>
    </div>`;
  }).join('');

  // Populate defaults
  const durationEl   = document.getElementById('orient-cfg-duration');
  const capacityEl   = document.getElementById('orient-cfg-capacity');
  const facilitatorEl= document.getElementById('orient-cfg-facilitator');
  const addressEl    = document.getElementById('orient-cfg-address');
  if(durationEl)    durationEl.value    = String(cfg.duration||2);
  if(capacityEl)    capacityEl.value    = String(cfg.capacity||6);
  if(facilitatorEl) facilitatorEl.value = cfg.facilitator||'';
  if(addressEl)     addressEl.value     = cfg.address||'1331 N Stewart Ave Ste B, Springfield MO 65802';
  const locRadio = document.querySelector(`input[name="orient-cfg-loc"][value="${cfg.location||'inperson'}"]`);
  if(locRadio) locRadio.checked = true;

  updateOrientGenPreview();
}

function orientDayToggle(key){
  const cb    = document.getElementById('odt-'+key);
  const track = document.getElementById('odt-track-'+key);
  const knob  = document.getElementById('odt-knob-'+key);
  const lbl   = document.getElementById('odt-lbl-'+key);
  const startS= document.getElementById('ods-'+key+'-start');
  const endS  = document.getElementById('ods-'+key+'-end');
  cb.checked  = !cb.checked;
  const on    = cb.checked;
  if(track) track.style.background = on ? 'var(--navy)' : '#E8E2D8';
  if(knob)  knob.style.left        = on ? '19px' : '3px';
  if(lbl)   lbl.style.color        = on ? 'var(--navy)' : '#A89C8B';
  if(startS){ startS.style.opacity=on?'1':'.35'; startS.style.pointerEvents=on?'auto':'none'; }
  if(endS){   endS.style.opacity  =on?'1':'.35'; endS.style.pointerEvents  =on?'auto':'none'; }
  updateOrientGenPreview();
}

function updateOrientGenPreview(){
  const el = document.getElementById('orient-gen-preview');
  if(!el) return;
  const DAYS = ['mon','tue','wed','thu','fri','sat','sun'];
  const weeksEl = document.getElementById('orient-gen-weeks');
  const weeks   = weeksEl ? parseInt(weeksEl.value) : 8;
  const enabled = DAYS.filter(d => { const cb=document.getElementById('odt-'+d); return cb && cb.checked; });
  if(!enabled.length){ el.textContent='No days selected — enable at least one day above.'; return; }
  const count = enabled.length * weeks;
  const summary = enabled.map(d=>{
    const start=document.getElementById('ods-'+d+'-start')?.value||'12:00';
    const end  =document.getElementById('ods-'+d+'-end')?.value  ||'14:00';
    return d.charAt(0).toUpperCase()+d.slice(1)+' '+fmtTime(start)+'–'+fmtTime(end);
  }).join(', ');
  el.textContent = `Will create ${count} session${count!==1?'s':''} (${summary}) over the next ${weeks} weeks, skipping any that already exist.`;
}

function saveOrientSettings(){
  const DAYS=['mon','tue','wed','thu','fri','sat','sun'];
  const schedule = {};
  DAYS.forEach(d=>{
    const cb=document.getElementById('odt-'+d);
    schedule[d]={
      enabled: cb?cb.checked:false,
      start: document.getElementById('ods-'+d+'-start')?.value||'09:00',
      end:   document.getElementById('ods-'+d+'-end')  ?.value||'17:00'
    };
  });
  const locRadio = document.querySelector('input[name="orient-cfg-loc"]:checked');
  appSettings.orient_config = {
    schedule,
    duration:    parseFloat(document.getElementById('orient-cfg-duration')?.value||'2'),
    capacity:    parseInt  (document.getElementById('orient-cfg-capacity')?.value||'6'),
    facilitator: document.getElementById('orient-cfg-facilitator')?.value.trim()||'',
    location:    locRadio?locRadio.value:'inperson',
    address:     document.getElementById('orient-cfg-address')?.value.trim()||'1331 N Stewart Ave Ste B, Springfield MO 65802'
  };
  localStorage.setItem('cc_settings', JSON.stringify(appSettings));
  syncToSupabase('settings', appSettings);
  const btn = document.getElementById('orient-cfg-save-btn');
  if(btn){ const orig=btn.textContent; btn.textContent='✓ Saved'; btn.style.background='#22c55e'; setTimeout(()=>{btn.textContent=orig;btn.style.background='var(--teal)';},2000); }
}

function generateOrientSessions(){
  const DAYS=['sun','mon','tue','wed','thu','fri','sat']; // JS getDay() order
  const DAY_IDX={sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6};
  const weeksEl = document.getElementById('orient-gen-weeks');
  const weeks   = weeksEl ? parseInt(weeksEl.value) : 8;
  const cfg     = getOrientConfig();

  // Read current schedule state from UI
  const enabledDays = ['mon','tue','wed','thu','fri','sat','sun']
    .filter(d=>{ const cb=document.getElementById('odt-'+d); return cb&&cb.checked; })
    .map(d=>({
      dayIndex: DAY_IDX[d],
      start:    document.getElementById('ods-'+d+'-start')?.value||'09:00'
    }));

  if(!enabledDays.length){ alert('No days selected. Enable at least one day in the schedule above.'); return; }

  const capacity    = parseInt (document.getElementById('orient-cfg-capacity')  ?.value||'6');
  const facilitator = (document.getElementById('orient-cfg-facilitator')?.value||'').trim();
  const locRadio    = document.querySelector('input[name="orient-cfg-loc"]:checked');
  const isRemote    = locRadio?.value==='remote';

  // Build set of existing session date+time keys to avoid duplicates
  const existing = new Set(orientSessions.map(s=>s.date+'_'+(s.time||'')));

  const now = new Date(); now.setHours(0,0,0,0);
  const end = new Date(now); end.setDate(end.getDate()+weeks*7);
  let created=0;

  const cur = new Date(now);
  while(cur<=end){
    const dow = cur.getDay();
    const match = enabledDays.find(d=>d.dayIndex===dow);
    if(match){
      const dateStr = cur.toISOString().split('T')[0];
      const key = dateStr+'_'+match.start;
      if(!existing.has(key)){
        orientSessions.push({
          id: orientId++, date: dateStr, time: match.start,
          capacity: String(capacity), is_remote: isRemote?'yes':'no',
          video_link:'', facilitator, facilitator_role:'Staffing Coordinator',
          notes:'', bookings:[], series_id:'auto-gen-'+Date.now()
        });
        existing.add(key);
        created++;
      }
    }
    cur.setDate(cur.getDate()+1);
  }

  if(created===0){
    alert('All sessions for this schedule already exist — no new sessions were created.');
  } else {
    saveOrientStore();
    renderOrientations();
    // Flash feedback on the button
    const btn = document.querySelector('[onclick="generateOrientSessions()"]');
    if(btn){ const orig=btn.textContent; btn.textContent=`✓ Created ${created} sessions`; btn.style.background='#22c55e'; setTimeout(()=>{btn.textContent=orig;btn.style.background='var(--navy)';},3000); }
    // Collapse the settings panel
    const body=document.getElementById('guide-body-orient-cfg');
    const arrow=document.getElementById('guide-arrow-orient-cfg');
    if(body&&body.classList.contains('open')){ body.classList.remove('open'); if(arrow)arrow.classList.remove('open'); }
  }
}

/* READ-ONLY loader for the Orientations tab: fetch self-serve bookings that have
   not been synced yet, for display only. It performs NO update and NO save, so
   opening/viewing the tab never mutates operational truth. */
async function orientLoadPending(){
  try {
    const { data, error } = await sb.from('orient_bookings').select('*').eq('merged', false).order('booked_at', { ascending: true });
    if(error){ console.warn('orient_bookings load failed — run fix-scheduling-and-bookings.sql if the table is missing:', error); ORIENT_PENDING = []; return; }
    ORIENT_PENDING = data || [];
  } catch(e){ console.warn('orientLoadPending:', e); ORIENT_PENDING = []; }
}
const orientPendingFor = sid => (ORIENT_PENDING||[]).filter(p => String(p.session_id) === String(sid));
const orientPendingCount = () => (ORIENT_PENDING||[]).length;

// EXPLICIT SYNC ACTION (human-clicked, or an intentional server process): pull
// self-serve bookings from orient_bookings (written by the public booking page as
// anon) and merge them into the session records the hub manages. This is the ONLY
// path that stamps merged:true and saves — never tab navigation.
async function mergePendingBookings(){
  try {
    const { data, error } = await sb.from('orient_bookings').select('*').eq('merged', false).order('booked_at', { ascending: true });
    if(error){ console.warn('orient_bookings load failed — run fix-scheduling-and-bookings.sql if the table is missing:', error); return; }
    if(!data || !data.length) return;
    let changed = false;
    for(const row of data){
      const s = orientSessions.find(x => String(x.id) === String(row.session_id));
      if(s){
        if(!s.bookings) s.bookings = [];
        const dup = s.bookings.some(b => b.src_id === row.id
          || (`${b.first} ${b.last}`.toLowerCase() === `${row.first} ${row.last}`.toLowerCase() && b.booked_at === row.booked_at));
        if(!dup){
          s.bookings.push({
            first: row.first, last: row.last, phone: row.phone || '',
            candidate_id: row.candidate_id ? Number(row.candidate_id) : null,
            booked_at: row.booked_at, attend_status: null, src_id: row.id
          });
          changed = true;
        }
      } else {
        console.warn('Self-serve booking references a session that no longer exists:', row);
      }
      // Mark handled either way so orphaned rows don't re-import forever
      const { error: updErr } = await sb.from('orient_bookings').update({ merged: true }).eq('id', row.id);
      if(updErr){ console.warn('Could not mark booking merged:', updErr); }
    }
    if(changed){ saveOrientStore(); renderAlerts(); }
    ORIENT_PENDING = [];          // just synced -> nothing pending until next load
    renderOrientations();
  } catch(e){ console.warn('mergePendingBookings:', e); }
}

/* ── Remote orientation, slice 1a: Viventium Step 2 + welcome calls (2026-10-01) ──
   Samantha: once references and background checks are clear (Ready for
   Orientation) the office sends Viventium Step 2 in Viventium. Viventium has no
   link to the Hub, so staff mark "Step 2 sent" and "Step 2 done" here. The I-9
   documents are uploaded in Step 2, so Step 2 must be DONE before the welcome
   call. "Invite to welcome call" is a button, never automatic. The new hire
   books a 15-minute Google Meet call (one shared room) on welcome.html.
   Server side: welcome_calls.sql + the staff-only welcome-call edge function
   (Staffing-Coordinator-Hub repo). The function owns every word that is sent. */
const WC_MEET = 'https://meet.google.com/yqj-nzuo-tgp';
const WC_TZ = 'America/Chicago';
const WC_TICKS = [
  ['i9_checked', 'I-9 documents checked on camera'],
  ['app_setup', 'AxisCare app set up (code 16485)'],
  ['profile_reviewed', 'Caregiver profile reviewed'],
  ['photo_link_sent', 'Photo link sent'],
];
let WC_ROWS = [], WC_LOADED = false, WC_ERR = '', WC_AT = 0;
const wcEsc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const wcDay = iso => iso ? new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', timeZone: WC_TZ }) : '';
const wcWhen = iso => { const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', timeZone: WC_TZ })
    + ' at ' + d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', timeZone: WC_TZ }); };
const wcName = w => ([w.first_name, w.last_name].filter(Boolean).join(' ').trim() || 'this new hire');
async function wcWho(){
  try{ const { data:{ session } } = await sb.auth.getSession(); return (session && session.user && session.user.email) || 'staff'; }
  catch(e){ return 'staff'; }
}
/* Same pattern as apNoshowCall in index.html: the function's own error text wins. */
async function wcCall(body){
  const { data, error } = await sb.functions.invoke('welcome-call', { body });
  if(error){ let m = error.message || 'error'; try{ const j = await error.context.json(); if(j && j.error) m = j.error; }catch(_){} throw new Error(m); }
  if(data && data.error) throw new Error(data.error);
  return data || {};
}
function wcResult(head, d){
  const sent = [d.texted ? 'text' : '', d.emailed ? 'email' : ''].filter(Boolean);
  return head + (sent.length ? '\n\nSent by ' + sent.join(' and ') + '. It shows in their GoHighLevel conversation.' : '\n\nNo message went.')
    + ((d.not_sent && d.not_sent.length) ? '\n\nNot sent: ' + d.not_sent.join('; ') : '');
}
/* The newest welcome call for a candidate (by the Hub's candidate id). */
function wcRowFor(c){
  /* A caregiver roster record (added at welcome call done) is keyed by the candidate id it carries. */
  const key = (c && typeof caregivers !== 'undefined' && caregivers.includes(c)) ? c.candidate_id : (c && c.id);
  const rows = WC_ROWS.filter(w => String(w.candidate_id) === String(key) && w.status !== 'cancelled');
  rows.sort((a,b) => String(b.invited_at||'').localeCompare(String(a.invited_at||'')));
  return rows[0] || null;
}

/* ── Caregiver profile (part 2, slice 2a, 2026-10-01) ──
   Samantha: the office drafts the profile with AI before the welcome call, reads it to them on the call, types what
   they change, sends their personal photo link (photo required, video encouraged), then publishes it. The panel
   itself lives in caregiver-profile-panel.js (window.CGP2), shared with the employee's page. */
function cgpCtxFor(candId, w){
  const c = wcSrcFor(candId);
  const src = c ? { first:c.first, last:c.last, phone:c.phone, email:c.email, intake_id:c.intake_id }
                : { first:w && w.first_name, last:w && w.last_name, phone:w && w.phone, email:w && w.email };
  return { mode:'onboarding', candidate_id:String(candId), first:src.first||'', last:src.last||'', phone:src.phone||'',
    email:src.email||'', intake_id:src.intake_id||'', onChange: () => wcLoad() };
}
function cgpOpen(candId){
  if(!window.CGP2){ alert('Caregiver profiles did not load. Refresh the page and try again.'); return; }
  const w = WC_ROWS.find(x => String(x.candidate_id) === String(candId));
  CGP2.open(cgpCtxFor(candId, w));
}
function cgpBtnHtml(candId){
  const chip = window.CGP2 ? CGP2.chipHtml(CGP2.rowFor(candId)) : '';
  /* 2c: everyone in onboarding is a new hire, so an unpublished profile is said out loud (never "Not started" from a failed load) */
  const st = window.CGP2 && CGP2.cacheState ? CGP2.cacheState() : { ok:false, err:'' };
  const need = st.err ? `<span style="font-size:.7rem;font-weight:700;color:#92400E">Could not check the profile: ${wcEsc(st.err)}</span>`
    : (st.ok && !CGP2.isLive(CGP2.rowFor(candId))) ? '<span style="font-size:.7rem;font-weight:700;color:#B00020">Profile needed before first shift</span>' : '';
  return chip + `<button class="ibtn" style="font-size:.7rem;padding:.18rem .55rem" title="Draft, read, send the photo link, publish" onclick="event.stopPropagation();cgpOpen('${wcEsc(String(candId))}')">🪪 Caregiver profile</button>` + need;
}

/* ── Step 2 tracking on the candidate record ── */
async function step2Mark(id, which, undo){
  const c = wcSrcFor(id); if(!c) return;
  const onRoster = !candidates.includes(c);
  if(undo){
    if(!confirm('Undo "Step 2 ' + which + '" for ' + c.first + ' ' + c.last + '?')) return;
    c['step2_' + which + '_at'] = null; c['step2_' + which + '_by'] = null;
  } else {
    const who = await wcWho(), now = new Date().toISOString();
    c['step2_' + which + '_at'] = now; c['step2_' + which + '_by'] = who;
    if(which === 'done' && !c.step2_sent_at){ c.step2_sent_at = now; c.step2_sent_by = who; }
  }
  if(onRoster){ if(!(await saveCaregivers())){ alert('That did not reach the shared workspace, so the rest of the team will not see it. Check your connection and try again.'); return; } }
  else await saveCandidates();
  renderOrientReadyQueue();
  if(typeof renderOB === 'function') renderOB();
}
function step2Html(c){
  const by = (k) => c[k] ? ' by ' + wcEsc(String(c[k]).split('@')[0]) : '';
  const chip = (bg, fg, txt, title) => `<span class="badge" title="${title||''}" style="background:${bg};color:${fg};font-size:.66rem">${txt}</span>`;
  const undo = (w) => `<button class="ibtn" style="font-size:.66rem;padding:.14rem .45rem;color:var(--gray)" onclick="event.stopPropagation();step2Mark(${c.id},'${w}',true)">Undo</button>`;
  const btn = (w, label) => `<button class="ibtn" style="font-size:.7rem;padding:.18rem .55rem" onclick="event.stopPropagation();step2Mark(${c.id},'${w}')">${label}</button>`;
  if(c.step2_done_at) return chip('#DCFCE7', '#15803D', 'Step 2 done ✓', 'Marked done ' + wcDay(c.step2_done_at) + by('step2_done_by')) + undo('done');
  if(c.step2_sent_at) return chip('#FEF3C7', '#92400E', 'Step 2 sent ' + wcDay(c.step2_sent_at), 'Marked sent' + by('step2_sent_by'))
    + undo('sent') + btn('done', 'Step 2 done');
  return chip('#F3F4F6', '#4B5563', 'Step 2 not sent', 'Send Viventium Step 2 in Viventium, then mark it here') + btn('sent', 'Step 2 sent') + btn('done', 'Step 2 done');
}
/* "📹 Invite to welcome call": gated on Step 2 done; after inviting, the
   booked/done state or "Invited [date] · Re-send". */
function wcInviteHtml(c){
  const w = wcRowFor(c);
  if(w && w.status === 'done') return `<span class="badge" style="background:#DCFCE7;color:#15803D;font-size:.66rem">📹 Welcome call done ${wcDay(w.done_at)}</span>`;
  if(w && w.status === 'booked' && w.starts_at) return `<span class="badge" style="background:#E0F2FE;color:#075985;font-size:.66rem">📹 Booked ${wcEsc(wcWhen(w.starts_at))}</span>`;
  const invitedAt = (w && w.invited_at) || c.welcome_invited_at;
  const ok = !!c.step2_done_at;
  const tip = ok ? '' : 'Viventium Step 2 must be done first';
  if(invitedAt) return `<span style="font-size:.7rem;color:#0e7490;font-weight:600">📹 Invited ${wcDay(invitedAt)}${w && w.status === 'noshow' ? ' (missed the call)' : ''} ·</span>`
    + `<span title="${tip}"><button class="ibtn" style="font-size:.7rem;padding:.18rem .55rem" ${ok ? '' : 'disabled'} title="${tip}" onclick="event.stopPropagation();wcInvite(${c.id},this)">Re-send</button></span>`;
  return `<span title="${tip}"><button class="ibtn" style="font-size:.72rem;padding:.22rem .65rem;${ok ? 'background:var(--teal);color:#fff;border-color:var(--teal)' : ''}" ${ok ? '' : 'disabled'} title="${tip}" onclick="event.stopPropagation();wcInvite(${c.id},this)">📹 Invite to welcome call</button></span>`;
}
async function wcInvite(id, btn){
  const c = candidates.find(x => String(x.id) === String(id)); if(!c) return;
  if(!c.step2_done_at){ alert('Viventium Step 2 must be done first. Mark "Step 2 done" once it is finished in Viventium.'); return; }
  if(safeIsTmp(c.id)){ alert(c.first + ' is still being saved. Nothing was sent. Try again in a moment.'); return; }
  if(!c.phone && !c.email){ alert(c.first + ' has no phone number or email on file. Add one first (✏️ on the Background tab). Nothing was sent.'); return; }
  const name = (c.first + ' ' + c.last).trim();
  if(btn) btn.disabled = true;
  try{
    const p = await wcCall({ action:'preview', first: c.first || '' });
    if(!confirm('Invite ' + name + ' to a 15-minute welcome video call?\n\n'
      + 'This sends a TEXT (only if they said yes to texts, 8am to 6pm Central) and an EMAIL. The link (shown as …) is their own booking page.\n\n'
      + 'TEXT:\n' + (p.text || '') + '\n\nEMAIL: ' + (p.subject || ''))) return;
    const d = await wcCall({ action:'invite', candidate_id: String(c.id), first: c.first || '', last: c.last || '', phone: c.phone || '', email: c.email || '' });
    c.welcome_invited_at = new Date().toISOString();
    if(d.id) c.welcome_call_id = d.id;
    await saveCandidates();
    await wcLoad();
    alert(wcResult(d.reused ? 'Invitation sent again (same booking link as before).' : 'Invitation sent.', d));
  }catch(e){ alert('Could not send the invitation: ' + (e && e.message || e)); }
  finally{ if(btn) btn.disabled = false; }
}

/* ── 📹 Welcome calls section (top of the Orientations tab) ── */
async function wcLoad(){
  try{
    const { data, error } = await sb.from('welcome_calls').select('*').order('starts_at');
    if(error) throw error;
    WC_ROWS = data || []; WC_ERR = '';
  }catch(e){ WC_ERR = (e && e.message) || 'error'; console.warn('welcome_calls load failed:', e); }
  /* the profile chip on each welcome call and on the Ready for Orientation rows */
  if(window.CGP2){
    const ready = (typeof candidates !== 'undefined' ? candidates : []).filter(c => { try{ return obDeriveStatus(c) === 'Ready for Orientation'; }catch(_){ return false; } }).map(c => c.id);
    try{ await CGP2.loadForCandidates(WC_ROWS.map(w => w.candidate_id).concat(ready)); }catch(_){ /* chips show "Not started" */ }
  }
  WC_LOADED = true;
  renderWelcomeCalls();
  renderOrientReadyQueue();
  if(typeof renderOB === 'function'){ try{ renderOB(); }catch(_){} }
}
function wcCard(w){
  const now = Date.now(), t = w.starts_at ? new Date(w.starts_at).getTime() : 0;
  const past = t && t < now - 15*60000;
  const allTicked = WC_TICKS.every(([k]) => w[k]);
  const id = wcEsc(w.id);
  return `<div style="background:#fff;border:1.5px solid ${past ? '#FCD34D' : '#BAE6FD'};border-radius:10px;padding:.7rem .85rem;margin-bottom:.55rem">
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:.5rem .8rem">
      <span style="font-size:.9rem;font-weight:700;color:var(--navy)">${wcEsc(wcName(w))}</span>
      <span style="font-size:.8rem;color:#075985;font-weight:600">${wcEsc(wcWhen(w.starts_at))}</span>
      ${past ? '<span class="badge" style="background:#FEF3C7;color:#92400E;font-size:.62rem">Time has passed. Mark it done, missed or moved.</span>' : ''}
      <a href="${WC_MEET}" target="_blank" rel="noopener" class="ibtn" style="text-decoration:none;background:#0D365F;color:#fff;border-color:#0D365F">📹 Join the call</a>
      ${w.phone ? `<span style="font-size:.72rem;color:var(--gray)">${wcEsc(w.phone)}</span>` : ''}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:.35rem 1rem;margin:.55rem 0 .45rem">
      ${WC_TICKS.map(([k, label]) => `<label style="display:flex;align-items:center;gap:.35rem;font-size:.78rem;color:var(--navy);cursor:pointer">
        <input type="checkbox" ${w[k] ? 'checked' : ''} onchange="wcTick('${id}','${k}',this)"> ${label}</label>`).join('')}
    </div>
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:.35rem .6rem;margin:0 0 .45rem">${cgpBtnHtml(w.candidate_id)}
      <span style="font-size:.7rem;color:var(--gray)">Draft it before the call, read it to them, then send the photo link.</span></div>
    <textarea placeholder="Notes from the call" onchange="wcNotes('${id}',this)" style="width:100%;min-height:42px;font:inherit;font-size:.78rem;padding:.4rem .5rem;border:1px solid var(--border);border-radius:7px;box-sizing:border-box">${wcEsc(w.notes || '')}</textarea>
    <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.45rem">
      <button class="ibtn" style="${allTicked ? 'background:#15803D;color:#fff;border-color:#15803D' : 'opacity:.55'}" title="${allTicked ? '' : 'Tick all four boxes first'}" onclick="wcAct('${id}','done','',this)">${WC_ORIENT_LABEL}</button>
      <button class="ibtn" style="color:#B45309;border-color:#FCD9A8" onclick="wcAct('${id}','reschedule','step2',this)">Reschedule: Step 2 not done</button>
      <button class="ibtn" onclick="wcAct('${id}','reschedule','other',this)">Reschedule (other)</button>
      <button class="ibtn" style="color:#B00020;border-color:#FCA5A5" onclick="wcAct('${id}','noshow','',this)">Did not show</button>
      ${t > now + 15*60000 ? `<button class="ibtn" onclick="wcAct('${id}','now','',this)">📞 Call them now</button>` : ''}
    </div>
  </div>`;
}
function renderWelcomeCalls(){
  const el = document.getElementById('wc-section'); if(!el) return;
  const now = Date.now();
  const booked = WC_ROWS.filter(w => w.status === 'booked' && w.starts_at)
    .sort((a,b) => new Date(a.starts_at) - new Date(b.starts_at));
  const waiting = WC_ROWS.filter(w => w.status === 'invited' || w.status === 'noshow')
    .sort((a,b) => String(a.invited_at||'').localeCompare(String(b.invited_at||'')));
  const done = WC_ROWS.filter(w => w.status === 'done' && w.done_at && new Date(w.done_at).getTime() > now - 14*86400000)
    .sort((a,b) => String(b.done_at).localeCompare(String(a.done_at)));
  const h = (txt, n) => `<div style="font-size:.74rem;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.05em;margin:.8rem 0 .45rem">${txt}${n != null ? ` <span style="color:var(--gray);font-weight:600">(${n})</span>` : ''}</div>`;
  const body = !WC_LOADED ? '<div style="font-size:.8rem;color:var(--gray)">Loading welcome calls…</div>'
    : WC_ERR ? `<div style="font-size:.8rem;color:#B00020">Could not load welcome calls: ${wcEsc(WC_ERR)} <button class="ibtn" onclick="wcLoad()">Try again</button></div>`
    : h('Today and upcoming', booked.length)
      + (booked.length ? booked.map(wcCard).join('') : '<div style="font-size:.8rem;color:var(--gray)">No welcome calls booked.</div>')
      + h('Waiting to book', waiting.length)
      + (waiting.length ? waiting.map(w => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:.5rem .8rem;background:#fff;border:1px solid var(--border);border-radius:9px;padding:.45rem .8rem;margin-bottom:.4rem">
          <span style="font-size:.84rem;font-weight:600;color:var(--navy)">${wcEsc(wcName(w))}</span>
          <span style="font-size:.72rem;color:var(--gray)">Invited ${wcDay(w.invited_at)}</span>
          ${w.status === 'noshow' ? '<span class="badge" style="background:#FEE2E2;color:#991B1B;font-size:.62rem">Missed the call</span>' : ''}
          ${w.closed_reason && w.status === 'invited' ? `<span style="font-size:.7rem;color:#92400E">${wcEsc(w.closed_reason)}</span>` : ''}
          <span style="display:inline-flex;align-items:center;gap:.3rem;flex-wrap:wrap">${cgpBtnHtml(w.candidate_id)}</span>
          <button class="ibtn" onclick="wcAct('${wcEsc(w.id)}','now','',this)">📞 Call them now</button>
        </div>`).join('') : '<div style="font-size:.8rem;color:var(--gray)">Nobody is waiting to book.</div>')
      + `<details style="margin-top:.8rem"${done.some(w => { const r = window.CGP2 && CGP2.rowFor(w.candidate_id); return r && r.photo_path && !r.published; }) ? ' open' : ''}><summary style="cursor:pointer;font-size:.78rem;font-weight:700;color:var(--navy)">Done recently (last 14 days, ${done.length})</summary>
          ${done.length ? done.map(w => `<div style="font-size:.78rem;color:var(--navy);padding:.3rem 0;border-bottom:1px solid #f1f1f1;display:flex;flex-wrap:wrap;align-items:center;gap:.3rem .5rem"><span>✓ <b>${wcEsc(wcName(w))}</b> · ${wcDay(w.done_at)}${w.done_by ? ' by ' + wcEsc(String(w.done_by).split('@')[0]) : ''}${w.notes ? ` · <span style="color:var(--gray)">${wcEsc(w.notes)}</span>` : ''}</span> ${cgpBtnHtml(w.candidate_id)} <button class="ibtn" style="font-size:.7rem;padding:.18rem .55rem" title="Finds them in AxisCare (In Training, by phone or email) and sends their orientation link. Never sends twice." onclick="wcOrientLink('${wcEsc(w.id)}',this)">Send orientation link</button>${wcNeedsRoster(w) ? ` <button class="ibtn" style="font-size:.7rem;padding:.18rem .55rem;color:#B45309;border-color:#FCD9A8" title="Not on the caregiver roster yet. Adds them with today's hire date so Training and Compliance track them." onclick="wcRosterAdd('${wcEsc(w.id)}',this)">Add to caregiver roster</button>` : ''}</div>`).join('') : '<div style="font-size:.78rem;color:var(--gray);padding:.3rem 0">None yet.</div>'}
        </details>`;
  el.innerHTML = `<div style="background:linear-gradient(135deg,#f0f9ff,#fefce8);border:1.5px solid #7DD3FC;border-radius:12px;padding:.85rem 1rem">
    <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
      <span style="font-size:.95rem">📹</span>
      <span style="font-size:.95rem;font-weight:700;color:var(--navy)">Welcome calls</span>
      <span style="font-size:.75rem;color:var(--gray)">15-minute Google Meet calls in one shared room. I-9 documents, AxisCare app, caregiver profile.</span>
      <button class="ibtn" style="margin-left:auto" onclick="wcLoad()">↻ Refresh</button>
    </div>
    ${body}
    ${WC_GUIDE}
  </div>`;
}
const WC_GUIDE = `<details style="margin-top:.8rem;background:#fff;border:1px solid var(--border);border-radius:9px;padding:.5rem .8rem">
  <summary style="cursor:pointer;font-size:.8rem;font-weight:700;color:var(--navy)">📖 How welcome calls work + the call script</summary>
  <div style="font-size:.8rem;line-height:1.6;color:#1f2a36">
    <h4 style="margin:.7rem 0 .3rem;color:var(--navy)">How it works</h4>
    <ol style="margin:0;padding-left:1.3rem">
      <li>Ready for Orientation, then send Viventium Step 2, then mark Step 2 done in the Hub.</li>
      <li>Press <b>Invite to welcome call</b>. They book a 15-minute time, during interview hours, never overlapping an interview. Confirmations and reminders with the Meet link go out on their own.</li>
      <li>Before the call, press <b>🪪 Caregiver profile</b>, then <b>Draft with AI</b>. It writes a first draft from their application and interview. Anything in [ask: …] is a question to ask them on the call.</li>
      <li>At the time, join the shared room from the "Caring Companions Welcome Calls" event on your own Google Calendar, signed in with your own @mo-care.com account (never a shared login). Join a minute early and admit them when they ask to join.</li>
      <li>If Step 2 turns out not to be done, press <b>Reschedule: Step 2 not done</b>, which tells them to finish it and rebook.</li>
      <li>Had an interview no-show? Use <b>Call them now</b> on someone waiting.</li>
      <li>During the call, if they are still an applicant in AxisCare, hire them in AxisCare and set their status to <b>In Training</b>. Their phone number or email in AxisCare must match the one they gave us.</li>
      <li>After the call, tick the checklist and press <b>Welcome call done – send orientation link</b>. The Training Platform finds them in AxisCare (In Training, by phone or email, never by name), assigns their courses and sends their orientation link by text and email. Texts only go 8am to 6pm: after 6pm it goes at 9am.</li>
      <li>Pressing done also adds them to the caregiver roster (hire date today). Training and Compliance then track their orientation and dementia training.</li>
      <li>If the Hub says they were not found, set them to <b>In Training</b> in AxisCare, then press <b>Send orientation link</b> on their row under <b>Done recently</b>. Until then a card stays on Needs Attention.</li>
      <li>Once their photo is in, the profile chip says <b>Photo in, ready to publish</b>. Open <b>🪪 Caregiver profile</b>, check the photo and the words, and press <b>Publish</b>. The profile must be published before their first shift: until it is, the Hub shows <b>Profile needed before first shift</b> for them.</li>
    </ol>
    <h4 style="margin:.9rem 0 .3rem;color:var(--navy)">The call script</h4>
    <p style="margin:.3rem 0"><b>Before the call:</b> check that Step 2 is done, then open <b>🪪 Caregiver profile</b> and press <b>Draft with AI</b>. Read the draft through so you are ready to read it aloud.</p>
    <ol style="margin:0;padding-left:1.3rem">
      <li><b>Welcome:</b> "Hi [first name], it's [your name] from Caring Companions. Welcome to the team! Can you hear and see me okay? This call takes about 15 minutes: we'll check your ID for your employment paperwork, set up the app you'll use to clock in, go over your caregiver profile together, and walk through what happens next. This call and your orientation are paid time."</li>
      <li><b>ID check for the I-9:</b> "You uploaded photos of your documents in Viventium. Now I need to see the same original documents on camera. Hold up your [document 1], front first please, now the back. Thank you, and your [document 2], front and back." After the call, tick the remote examination box and complete Section 2 in Viventium (E-Verify remote procedure).</li>
      <li><b>Viventium:</b> confirm that Step 2 is done. If it is not, reschedule.</li>
      <li><b>Hire them in AxisCare (office, while you talk):</b> if they are still an applicant in AxisCare, hire them now and set their status to <b>In Training</b>. Check that their mobile phone or email in AxisCare is the one they use: that is how their orientation link finds them.</li>
      <li><b>AxisCare app:</b> "Open the App Store (iPhone) or Google Play (Android) and search for AxisCare Mobile. Install it and open it. Enter our company code: 16485. [Office: full instructions coming.] You'll clock in when you arrive at a client's home and clock out when you leave. If you ever forget, call the office right away."</li>
      <li><b>Caregiver profile:</b> open <b>🪪 Caregiver profile</b>. "Before your first visit, the family sees a short profile of you, so they know who's coming. I've written a first draft from your application and interview. Let me read it to you; tell me what you'd change or add." Read each part aloud. Ask any [ask: …] questions and type their answers in their own words (take the brackets out). Type their changes and press <b>Save</b>.
        Then press <b>Send photo link</b> and say: "I'm sending you a text and an email now with your own link. Please add a photo, it's required: a clear, friendly photo from the shoulders up, in good light. A short video of about 30 seconds is encouraged: say hi and tell families one thing you love about caregiving. You can check the words there too."</li>
      <li><b>What happens next:</b> "Right after this call you'll get a text and an email with your own private orientation link (if it's after 6pm, it comes at 9am). Your training is online, on your phone or computer, on your own schedule, and you can do it in pieces: Agency Orientation (about 2 hours), then Alzheimer's &amp; Dementia Care (about 4 hours), both before your first client; then on-the-job training within 30 days. Once you're done and your profile is published, we'll let you know you're cleared to work. Please save our office number: (417) 234-8494."</li>
      <li><b>Close:</b> "What questions do you have for me? Thank you, [first name], we're really glad you're here."</li>
    </ol>
    <p style="margin:.5rem 0 .2rem"><b>After the call:</b> make sure they are In Training in AxisCare, tick the checklist, press <b>Welcome call done – send orientation link</b>, and complete I-9 Section 2 in Viventium. When their photo is in, open <b>🪪 Caregiver profile</b> and press <b>Publish</b>. The profile must be published before their first shift.</p>
  </div>
</details>`;
/* ── Orientation link (slice 1b, 2026-10-01). Samantha: "Welcome call done – send orientation link". ──
   After the call is marked done, the Training Platform (job-offer action 'orientation_link', the staff member's own
   Hub sign-in) finds the new hire in AxisCare by phone or email (never by name; exactly one active caregiver In
   Training), saves them so their courses are assigned, links their offer and sends the same training welcome as the
   9am run. Not found: nothing is sent, a card goes on Needs Attention, and the office is told to set In Training in
   AxisCare and press Send orientation link (on the row under Done recently). It never sends twice. */
const WC_ORIENT_LABEL = 'Welcome call done – send orientation link';
/* Who a welcome call is about: their Background & References record, or (once welcome call done has moved them)
   their caregiver roster record, which carries the same candidate id, offer id, intake id, phone and email. */
function wcSrcFor(candId){
  if(candId == null || candId === '') return null;
  const c = (typeof candidates !== 'undefined' ? candidates : []).find(x => String(x.id) === String(candId));
  if(c) return c;
  return (typeof caregivers !== 'undefined' ? caregivers : []).find(g => g.candidate_id != null && String(g.candidate_id) === String(candId)) || null;
}
async function wcOrientCall(w, src){
  const c = src || wcSrcFor(w.candidate_id);
  const uniq = a => [...new Set(a.map(x => String(x == null ? '' : x).trim()).filter(Boolean))];
  const phones = uniq([w.phone, c && c.phone]), emails = uniq([w.email, c && c.email]);
  const body = { action:'orientation_link', offer_id: c && c.offer_id ? String(c.offer_id) : '', welcome_call_id: String(w.id),
    phone: phones[0] || '', email: emails[0] || '', phones: phones.slice(1), emails: emails.slice(1),
    first: w.first_name || (c && c.first) || '', last: w.last_name || (c && c.last) || '' };
  const r = await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/job-offer', { method:'POST',
    headers:{ 'apikey':TRAINING_HUB_ANON, 'Authorization':'Bearer '+TRAINING_HUB_ANON, 'x-hub-token':await (window.trainHubTok ? window.trainHubTok() : ''), 'Content-Type':'application/json' },
    body: JSON.stringify(body) });
  let d = {}; try{ d = await r.json(); }catch(_){ d = {}; }
  if(!d || !d.status){ throw new Error((d && d.error) || ('the Training Platform answered ' + r.status)); }
  return d;
}
/* What the office sees for each answer. */
function wcOrientMsg(d){
  const notSent = (d.not_sent && d.not_sent.length) ? '\n\nNot sent: ' + d.not_sent.join('; ') : '';
  const offer = d.offer_note ? '\n\n' + d.offer_note : '';
  const day = iso => { try{ return new Date(iso).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZone: WC_TZ }); }catch(_){ return ''; } };
  if(d.status === 'sent') return 'Orientation link sent by ' + [d.sms ? 'text' : '', d.email ? 'email' : ''].filter(Boolean).join(' and ')
    + '. It shows in their GoHighLevel conversation, and their courses are assigned in the Training Platform.' + notSent + offer;
  if(d.status === 'held') return 'The orientation link goes out at 9am (texts only go 8am to 6pm). They are set up in the Training Platform, so there is nothing else to do.' + offer;
  if(d.status === 'already_sent') return 'Their orientation link was already sent' + (d.sent_at ? ' (' + day(d.sent_at) + ')' : '') + '. Nothing new went.' + offer;
  if(d.status === 'not_found') return 'No orientation link went: ' + (d.why || 'they were not found in AxisCare') + '.\n\n'
    + 'Set them to In Training in AxisCare, then press Send orientation link (on their row under Done recently).'
    + (d.card ? ' A card is on Needs Attention so this is not forgotten.' : '') + offer;
  if(d.status === 'not_sent') return 'No orientation link went.' + notSent + '\n\nEach reason is on Needs Attention. Fix it and press Send orientation link again, or call them.' + offer;
  if(d.status === 'no_contact') return 'No orientation link went: ' + (d.why || 'there is no phone number or email for them') + '. Add one on their record, then press Send orientation link.';
  return 'No orientation link went: ' + (d.why || d.error || 'something went wrong') + (/\.$/.test(d.why || '') ? '' : '.');
}
async function wcOrientLink(id, btn){
  const w = WC_ROWS.find(x => String(x.id) === String(id)); if(!w) return;
  if(!confirm('Send ' + wcName(w) + ' their orientation link now?\n\nThe Training Platform finds them in AxisCare (an active caregiver In Training, by phone or email) and sends the text and email. It never sends twice.')) return;
  if(btn) btn.disabled = true;
  try{ alert(wcOrientMsg(await wcOrientCall(w))); }
  catch(e){ alert('That did not go through: ' + ((e && e.message) || e) + '\n\nNothing was sent.'); }
  finally{ if(btn) btn.disabled = false; }
}
async function wcTick(id, key, box){
  const w = WC_ROWS.find(x => String(x.id) === String(id)); if(!w) return;
  const val = !!box.checked;
  box.disabled = true;
  const { error } = await sb.from('welcome_calls').update({ [key]: val, updated_at: new Date().toISOString() }).eq('id', id);
  if(error){ box.checked = !val; box.disabled = false; alert('Could not save that tick: ' + error.message); return; }
  w[key] = val;
  renderWelcomeCalls();
}
async function wcNotes(id, ta){
  const w = WC_ROWS.find(x => String(x.id) === String(id)); if(!w) return;
  const v = ta.value.trim();
  const { error } = await sb.from('welcome_calls').update({ notes: v || null, updated_at: new Date().toISOString() }).eq('id', id);
  if(error){ alert('Could not save the notes: ' + error.message + '\n\nCopy them somewhere safe and try again.'); return; }
  w.notes = v || null;
}
async function wcAct(id, action, reason, btn){
  const w = WC_ROWS.find(x => String(x.id) === String(id)); if(!w) return;
  const name = wcName(w), when = w.starts_at ? wcWhen(w.starts_at) : '';
  let ask = '';
  if(action === 'done'){
    if(!WC_TICKS.every(([k]) => w[k]) && !confirm('Not every checklist box is ticked for ' + name + '.\n\nMark the welcome call done anyway?')) return;
    ask = 'Mark the welcome call with ' + name + ' as done and send their orientation link?\n\n'
      + 'First: they must be hired in AxisCare with status In Training. The Training Platform finds them there by phone or email and sends their orientation link by text and email.\n\n'
      + 'Remember to complete I-9 Section 2 in Viventium.';
  } else if(action === 'reschedule' && reason === 'step2'){
    ask = 'Move ' + name + "'s " + when + ' call because Viventium Step 2 is not done?\n\nThe time is freed and they get a text and email asking them to finish Step 2, then pick a new time.';
  } else if(action === 'reschedule'){
    ask = 'Move ' + name + "'s " + when + ' call?\n\nThe time is freed and they get a text and email asking them to pick a new time.';
  } else if(action === 'noshow'){
    ask = 'Mark ' + name + ' as a no-show for the ' + when + ' call?\n\nThe time is freed and they get a text and email with a link to pick a new time.';
  } else if(action === 'now'){
    ask = 'Text and email ' + name + " now: 'We have an opening right now for your welcome call, join in the next 10 minutes'? Their booked time (if any) stays the same unless the call happens.";
  } else return;
  if(!confirm(ask)) return;
  if(btn) btn.disabled = true;
  try{
    const d = await wcCall(reason ? { action, id: w.id, reason } : { action, id: w.id });
    let head = { done:'Welcome call marked done.', reschedule:'Call moved. Their invitation stays open so they can pick a new time.',
      noshow:'Marked as missed.', now:'Sent. Join the shared room and admit them when they ask to join.' }[action];
    /* Step 2 was marked done but is not: clear it so the record matches Viventium. */
    if(action === 'reschedule' && reason === 'step2'){
      const c = candidates.find(x => String(x.id) === String(w.candidate_id));
      if(c && c.step2_done_at){ c.step2_done_at = null; c.step2_done_by = null; await saveCandidates(); head += '\n\n"Step 2 done" was cleared on their record. Mark it again once Viventium shows it finished.'; }
    }
    /* Then the caregiver roster (2026-10-02), so Training and Compliance track them from day one. Their contact
       details and offer id are captured first: the Background & References record is removed once the roster saves. */
    if(action === 'done'){
      const src0 = wcSrcFor(w.candidate_id);
      const src = src0 ? { offer_id: src0.offer_id, phone: src0.phone, email: src0.email, first: src0.first, last: src0.last } : null;
      try{ head += '\n\n' + wcRosterMsg(await wcAddToRoster(w)); }
      catch(e){ head += '\n\n' + wcRosterMsg({ status:'save_failed', why: (e && e.message) || String(e) }); }
      /* 1b: then the orientation link (Training finds them in AxisCare and sends the welcome). The call stays done either way. */
      try{ head += '\n\n' + wcOrientMsg(await wcOrientCall(w, src)); }
      catch(e){ head += '\n\nThe orientation link step did not run: ' + ((e && e.message) || e) + '.\n\nPress Send orientation link on their row under Done recently to try again.'; }
    }
    await wcLoad();
    /* 2c: done without a published profile is allowed (the photo often comes after the call); the next step is said */
    if(action === 'done' && window.CGP2 && !CGP2.isLive(CGP2.rowFor(w.candidate_id)))
      head += '\n\nNext: their caregiver profile is not published yet. It must be published (the photo is required) before their first shift. Open 🪪 Caregiver profile once their photo is in.';
    alert(action === 'done' ? head : wcResult(head, d));
  }catch(e){ alert('That did not go through: ' + (e && e.message || e) + '\n\nNothing was changed.'); if(btn) btn.disabled = false; }
}

/* ── Welcome call done -> caregiver roster (Samantha, 2026-10-02) ──
   Pressing "Welcome call done – send orientation link" also adds them to the caregiver roster with today's hire date
   (Central), so Training and Compliance track their orientation and dementia training from day one. Same record as
   the office 🎓 Promote, except orient_date stays '' (orientation is done online AFTER this; it is never marked done
   here). Never twice: a roster record carrying this candidate id means it already happened. The Background &
   References record is removed ONLY after the roster reached the shared workspace; if that save fails, nothing is
   removed and the office is told (no silent failures). The office-session Promote is unchanged. */
function wcCentralYmd(d){
  try{
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: WC_TZ, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(d || new Date());
    const g = t => (p.find(x => x.type === t) || {}).value || '';
    return g('year') + '-' + g('month') + '-' + g('day');
  }catch(_){ return (d || new Date()).toISOString().slice(0, 10); }
}
function wcYmdLabel(ymd){
  const m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); if(!m) return String(ymd || '');
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1];
}
const WC_CARRY = ['offer_id', 'intake_id', 'position', 'welcome_call_id', 'welcome_invited_at',
  'step2_sent_at', 'step2_sent_by', 'step2_done_at', 'step2_done_by', 'previous_names'];
async function wcAddToRoster(w){
  const candId = w && w.candidate_id;
  if(candId == null || candId === '') return { status:'no_candidate' };
  const roster = typeof caregivers !== 'undefined' ? caregivers : [];
  const c = candidates.find(x => String(x.id) === String(candId)) || null;
  const already = roster.find(g => g.candidate_id != null && String(g.candidate_id) === String(candId));
  if(already) return { status:'already', hire_date: already.hire_date || '' };
  if(!c) return { status:'no_candidate' };
  if(typeof safeIsTmp === 'function' && safeIsTmp(c.id)) return { status:'save_failed', why:'their Background & References record is still being saved' };
  const hireDate = wcCentralYmd(new Date());
  const rec = cgRecordFromCandidate(c, hireDate, '');
  rec.orient_date = ''; rec.alz_date = '';
  WC_CARRY.forEach(k => { if(c[k] != null && c[k] !== '') rec[k] = c[k]; });
  if(!rec.welcome_call_id && w.id) rec.welcome_call_id = w.id;
  rec.promoted_via = 'welcome_call';
  caregivers.push(rec);
  let ok = false, why = '';
  try{ ok = (await saveCaregivers({ quiet:true })) === true; }catch(e){ why = (e && e.message) || String(e); }
  if(!ok){
    /* Undo the local add so this device matches the shared workspace; the next press tries again. */
    caregivers = caregivers.filter(g => g !== rec);
    try{ localStorage.setItem('cc_caregivers', JSON.stringify(caregivers)); }catch(_){}
    return { status:'save_failed', why };
  }
  candidates = candidates.filter(x => x !== c);
  await saveCandidates();
  try{ if(typeof renderOB === 'function') renderOB(); if(typeof renderTR === 'function') renderTR(); if(typeof renderAC === 'function') renderAC(); }catch(_){}
  return { status:'added', hire_date: hireDate };
}
function wcRosterMsg(r){
  if(r.status === 'added') return 'Added to the caregiver roster (hire date ' + wcYmdLabel(r.hire_date) + ').';
  if(r.status === 'already') return 'Already on the caregiver roster' + (r.hire_date ? ' (hire date ' + wcYmdLabel(r.hire_date) + ')' : '') + '.';
  if(r.status === 'save_failed') return 'NOT added to the caregiver roster: the save did not reach the shared workspace'
    + (r.why ? ' (' + r.why + ')' : '') + '. They are still in Background & References. Check your connection, then press Add to caregiver roster on their row under Done recently.';
  return 'Not added to the caregiver roster: their Background & References record was not found. If they are not on the Training tab, add them there with + Add Caregiver.';
}
/* The button on a Done recently row whose person is not on the roster yet: the retry after a failed save, and the
   catch-up for welcome calls marked done before this change. */
async function wcRosterAdd(id, btn){
  const w = WC_ROWS.find(x => String(x.id) === String(id)); if(!w) return;
  if(!confirm('Add ' + wcName(w) + ' to the caregiver roster with today\'s hire date?\n\nTraining and Compliance then track their orientation and dementia training. They move out of Background & References. Nothing is sent to them.')) return;
  if(btn) btn.disabled = true;
  try{ alert(wcRosterMsg(await wcAddToRoster(w))); renderWelcomeCalls(); }
  catch(e){ alert('That did not go through: ' + ((e && e.message) || e) + '\n\nNothing was changed.'); }
  finally{ if(btn) btn.disabled = false; }
}
function wcNeedsRoster(w){
  const has = (typeof caregivers !== 'undefined' ? caregivers : []).some(g => g.candidate_id != null && String(g.candidate_id) === String(w.candidate_id));
  return !has && (typeof candidates !== 'undefined' ? candidates : []).some(c => String(c.id) === String(w.candidate_id));
}

function renderOrientReadyQueue(){
  const el = document.getElementById('orient-ready-queue');
  if(!el) return;
  const ready = (typeof candidates!=='undefined'?candidates:[]).filter(c=>obDeriveStatus(c)==='Ready for Orientation');
  if(!ready.length){ el.innerHTML=''; return; }
  const now = new Date();
  el.innerHTML = `
    <div style="background:linear-gradient(135deg,#f0fffe,#e8f4fd);border:1.5px solid var(--teal);border-radius:12px;padding:.85rem 1rem">
      <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.7rem;flex-wrap:wrap">
        <span style="font-size:.95rem">✅</span>
        <span style="font-size:.88rem;font-weight:700;color:var(--navy)">Ready for Orientation</span>
        <span style="background:var(--teal);color:#fff;font-size:.68rem;font-weight:700;border-radius:12px;padding:.1rem .5rem">${ready.length}</span>
        <span style="font-size:.75rem;color:var(--gray)">${ready.length===1?'candidate is':'candidates are'} cleared. Send Viventium Step 2, mark it done, then invite to a welcome call.</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:.45rem">
        ${ready.map(c=>{
          const resolvedAt = c.resolvedAt ? new Date(c.resolvedAt) : null;
          const days = resolvedAt ? Math.floor((now-resolvedAt)/(1000*60*60*24)) : null;
          const wait = days===null?'':days===0?'Cleared today':days===1?'1 day waiting':`${days} days waiting`;
          const invited = c.invite_sent;
          return `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:.45rem .6rem;background:#fff;border:1.5px solid ${c.step2_done_at?'#86efac':'var(--teal)'};border-radius:9px;padding:.45rem .8rem">
            <span style="font-size:.84rem;font-weight:600;color:var(--navy)">${c.first} ${c.last}</span>
            ${wait?`<span style="font-size:.7rem;color:var(--gray)">${wait}</span>`:''}
            <span style="display:inline-flex;align-items:center;gap:.3rem;flex-wrap:wrap">${step2Html(c)}</span>
            <span style="display:inline-flex;align-items:center;gap:.3rem;flex-wrap:wrap">${wcInviteHtml(c)}</span>
            <span style="display:inline-flex;align-items:center;gap:.3rem;flex-wrap:wrap">${cgpBtnHtml(c.id)}</span>
            <span style="margin-left:auto;display:inline-flex;align-items:center;gap:.35rem">
              ${invited?`<span style="font-size:.68rem;color:#16a34a;font-weight:600">📩 Office session invite sent</span>`:''}
              <button class="ibtn" style="font-size:.7rem;padding:.18rem .55rem" onclick="openInviteModal(${c.id})" title="Invite to an in-person orientation session at the office">📅 In the office instead</button>
            </span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function renderOrientations(){
  renderOrientReadyQueue();
  /* Welcome calls: draw what we have, refresh from the table at most every 30 seconds. */
  renderWelcomeCalls();
  if(Date.now() - WC_AT > 30000){ WC_AT = Date.now(); wcLoad(); }
  renderCalendar();
  renderSessionsList();
  // Stats
  const now = new Date(); now.setHours(0,0,0,0);
  const upcoming = orientSessions.filter(s => new Date(s.date+'T00:00:00') >= now);
  const totalSpots = upcoming.reduce((a,s)=>a+parseInt(s.capacity),0);
  const booked = upcoming.reduce((a,s)=>a+(s.bookings||[]).length,0);
  const available = totalSpots - booked;
  const full = upcoming.filter(s=>(s.bookings||[]).length>=parseInt(s.capacity)).length;
  /* Read-only banner for pending self-serve bookings + the EXPLICIT sync button.
     The count is display-only; nothing is written until Sync is clicked. */
  const pc = orientPendingCount();
  const pendBanner = pc > 0
    ? `<div style="flex:1 0 100%;margin-top:.5rem;padding:.5rem .7rem;background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;font-size:.8rem;color:#92400E;display:flex;gap:.6rem;align-items:center;justify-content:space-between;flex-wrap:wrap">`
      + `<span>⏳ <b>${pc}</b> self-serve booking${pc!==1?'s':''} pending — shown read-only below, not yet in the roster.</span>`
      + `<button class="ibtn" onclick="orientSyncBookings(this)">Sync to roster</button></div>`
    : '';
  document.getElementById('or-stats').innerHTML = `
    <div class="stat"><div class="lbl">Upcoming</div><div class="val v-navy">${upcoming.length}</div></div>
    <div class="stat"><div class="lbl">Booked</div><div class="val v-amber">${booked}</div></div>
    <div class="stat"><div class="lbl">Available</div><div class="val v-green">${available}</div></div>
    <div class="stat"><div class="lbl">Full</div><div class="val v-red">${full}</div></div>` + pendBanner;
}

function renderCalendar(){
  const label = calViewMonth.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  document.getElementById('cal-month-label').textContent = label;
  const year = calViewMonth.getFullYear();
  const month = calViewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const now = new Date(); now.setHours(0,0,0,0);

  // Build a set of dates that have sessions
  const sessionDates = {};
  orientSessions.forEach(s => {
    const sd = new Date(s.date+'T00:00:00');
    if(sd.getFullYear()===year && sd.getMonth()===month){
      const key = s.date;
      if(!sessionDates[key]) sessionDates[key] = 0;
      sessionDates[key]++;
    }
  });

  let html = '';
  // Blanks before first day
  for(let i=0;i<firstDay;i++) html += '<div class="cal-day other"></div>';
  for(let d=1;d<=daysInMonth;d++){
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const date = new Date(dateStr+'T00:00:00');
    const isToday = date.getTime()===now.getTime();
    const isPast = date < now;
    const hasSess = sessionDates[dateStr];
    const isSelected = calSelectedDate===dateStr;
    let cls = 'cal-day';
    if(isPast) cls += ' past';
    if(isToday) cls += ' is-today';
    if(hasSess && !isPast) cls += ' has-session';
    if(isSelected) cls += ' selected';
    const cnt = hasSess ? `<div class="day-cnt">${hasSess}</div>` : '';
    const numEl = isToday ? `<div class="day-num"><span>${d}</span></div>` : `<div class="day-num">${d}</div>`;
    html += `<div class="${cls}" onclick="calClickDay('${dateStr}')">${numEl}${cnt}</div>`;
  }
  document.getElementById('cal-days').innerHTML = html;
}

function calClickDay(dateStr){
  if(calSelectedDate===dateStr){ calSelectedDate=null; }
  else { calSelectedDate=dateStr; }
  renderCalendar();
  renderSessionsList();
}
function calPrev(){ calViewMonth.setMonth(calViewMonth.getMonth()-1); calSelectedDate=null; renderCalendar(); renderSessionsList(); }
function calNext(){ calViewMonth.setMonth(calViewMonth.getMonth()+1); calSelectedDate=null; renderCalendar(); renderSessionsList(); }

function setPastView(isPast){
  showPastSessions = isPast;
  document.getElementById('pts-upcoming').classList.toggle('active',!isPast);
  document.getElementById('pts-past').classList.toggle('active',isPast);
  calSelectedDate = null;
  renderCalendar();
  renderSessionsList();
}
function renderSessionsList(){
  const now = new Date(); now.setHours(0,0,0,0);
  let sessions;
  if(showPastSessions){
    sessions = orientSessions.filter(s => new Date(s.date+'T00:00:00') < now);
    sessions.sort((a,b)=>b.date.localeCompare(a.date)); // newest-past first
  } else {
    sessions = orientSessions.filter(s => new Date(s.date+'T00:00:00') >= now);
    sessions.sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'').localeCompare(b.time||''));
  }

  const titleEl = document.getElementById('or-list-title');
  const countEl = document.getElementById('or-session-count');
  if(calSelectedDate){
    sessions = sessions.filter(s=>s.date===calSelectedDate);
    const d = new Date(calSelectedDate+'T00:00:00');
    titleEl.textContent = d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  } else {
    titleEl.textContent = showPastSessions ? 'Past Sessions — Mark Attendance' : 'All Upcoming Sessions';
  }
  countEl.textContent = `${sessions.length} session${sessions.length!==1?'s':''}`;

  const el = document.getElementById('or-sessions-list');
  if(!sessions.length){
    el.innerHTML = '<div class="empty" style="padding:2rem;text-align:center;color:var(--gray)">' +
      (calSelectedDate ? 'No sessions on this day. <a href="#" onclick="openOrientModalOnDate(\''+calSelectedDate+'\');return false">Add one?</a>' : 'No upcoming sessions scheduled.') +
      '</div>';
    return;
  }

  el.innerHTML = sessions.map(s=>{
    const cap = parseInt(s.capacity);
    const booked = (s.bookings||[]).length;
    const avail = cap - booked;
    const pct = Math.round((booked/cap)*100);
    const isFull = avail===0;
    const {dow,date} = sessDateShort(s.date);
    const locLabel = s.is_remote==='yes'
      ? `<span class="badge b-blue" style="font-size:.65rem">🖥 Remote</span>${s.video_link?` <a href="${s.video_link}" target="_blank" style="font-size:.68rem;color:var(--teal)">Join link</a>`:''}`
      : `📍 ${getOrientConfig().address||ORIENT_ADDR}`;
    const facilitatorLabel = s.facilitator
      ? (s.facilitator_role ? `${s.facilitator} · <span style="font-weight:400;color:var(--teal)">${s.facilitator_role}</span>` : s.facilitator)
      : null;
    const facilitatorTag = facilitatorLabel
      ? `<div style="font-size:.72rem;font-weight:600;color:var(--navy);margin-top:.3rem">👤 ${facilitatorLabel}</div>` : '';
    const calTag = s.gcal_event_id
      ? `<span title="Synced to Google Calendar" style="font-size:.65rem;color:#34A853;margin-left:.4rem">📅 GCal ✓</span>` : '';
    const chips = (s.bookings||[]).length
      ? (s.bookings||[]).map(b=>`<span class="booking-chip">${b.first} ${b.last}</span>`).join('')
      : '<span style="font-size:.7rem;color:var(--gray);font-style:italic">No bookings yet</span>';
    /* Self-serve bookings not yet synced into this session's roster. Read-only,
       shown separately so they are visible immediately without being pushed into
       bookings[] (which attendance/cancel index into). */
    const pend = orientPendingFor(s.id);
    const pendChips = pend.length
      ? `<div style="margin-top:.4rem;font-size:.68rem;color:#B45309"><b>⏳ ${pend.length} pending self-serve booking${pend.length!==1?'s':''} — sync to add to the roster:</b> `
        + pend.map(p=>`<span class="booking-chip" style="background:#FEF3C7;color:#92400E">${p.first} ${p.last}</span>`).join(' ') + '</div>'
      : '';
    const fullBadge = isFull ? '<span class="badge b-red" style="font-size:.65rem;margin-left:.4rem">FULL</span>' : '';
    const seriesBadge = s.series_id ? '<span class="badge b-navy" style="font-size:.62rem;margin-top:.3rem">🔁 Series</span>' : '';
    return `<div class="session-card${calSelectedDate&&s.date===calSelectedDate?' highlighted':''}">
      <div class="sess-top">
        <div class="sess-date-block">
          <div class="sess-dow">${dow}</div>
          <div class="sess-date">${date}${fullBadge}${calTag}</div>
          <div class="sess-time">${fmtTime(s.time)} · ${getOrientDuration()} hour${getOrientDuration()!==1?'s':''}</div>
          ${facilitatorTag}
          ${seriesBadge}
        </div>
        <div class="sess-actions">
          <button class="ibtn" title="Edit" onclick="openOrientModal(${s.id})">✏️</button>
          <button class="ibtn" title="Delete" onclick="deleteOrient(${s.id})">🗑️</button>
        </div>
      </div>
      <div class="sess-loc">${locLabel}</div>
      <div class="cap-row">
        <div class="cap-text">${booked}/${cap} booked</div>
        <div class="cap-bar"><div class="cap-fill${isFull?' full':''}" style="width:${pct}%"></div></div>
        <div style="font-size:.7rem;color:${isFull?'#F97316':'var(--green-text)'};font-weight:600">${isFull?'Full':`${avail} open`}</div>
      </div>
      ${!showPastSessions ? `<div class="sess-bookings">${chips}${pendChips}</div>` : `
        <div style="margin-bottom:.55rem">
          ${(s.bookings||[]).length===0
            ? '<span style="font-size:.7rem;color:var(--gray);font-style:italic">No bookings recorded</span>'
            : (s.bookings||[]).map((b,bi)=>{
                const ao=b.attend_status;
                const attBadge=ao==='attended'?'<span class="badge b-green" style="font-size:.68rem">✅ Attended</span>'
                  :ao==='noshow'?'<span class="badge b-red" style="font-size:.68rem">🚫 No-Show</span>'
                  :ao==='rescheduled'?'<span class="badge b-amber" style="font-size:.68rem">📅 Rescheduled</span>'
                  :ao==='canceled'?`<span class="badge b-gray" style="font-size:.68rem">❌ Canceled${b.cancel_method?` (${b.cancel_method==='call'?'📞':b.cancel_method==='text'?'💬':'❓'})`:''}</span>${b.cancel_reason?`<span class="chk-date" style="margin-left:.3rem">${b.cancel_reason}</span>`:''}`:''
                ;
                // Find matching candidate for Promote button
                const matchCand = candidates.find(c=>
                  `${c.first} ${c.last}`.toLowerCase()===`${b.first} ${b.last}`.toLowerCase()
                  ||(b.candidate_id && c.id===b.candidate_id));
                const promoteBtn = ao==='attended' && matchCand
                  ? `<button class="att-btn" style="background:#22C55E;color:#fff;border:none;font-size:.68rem;padding:.22rem .5rem;white-space:nowrap" onclick="promoteToCaregiver(${matchCand.id})">🎓 Promote</button>` : '';
                const btns = ao ? `${promoteBtn}<button class="att-btn" style="font-size:.65rem;padding:.15rem .35rem" onclick="markAttendance(${s.id},${bi},null)" title="Undo">↩</button>`
                  : `<button class="att-btn att-attended" onclick="markAttendance(${s.id},${bi},'attended')">✅</button>
                     <button class="att-btn att-noshow" onclick="markAttendance(${s.id},${bi},'noshow')">🚫</button>
                     <button class="att-btn att-rescheduled" onclick="markAttendance(${s.id},${bi},'rescheduled')">📅</button>
                     <button class="att-btn att-canceled" onclick="openCancelModal(${s.id},${bi})">❌</button>`;
                return `<div class="attend-booking"><span class="attend-name">${b.first} ${b.last}</span><div style="display:flex;align-items:center;gap:.3rem;flex-wrap:wrap">${attBadge}<div class="attend-btns">${btns}</div></div></div>`;
              }).join('')
          }
        </div>
      `}
      ${s.notes?`<div style="font-size:.71rem;color:var(--gray);margin-bottom:.55rem;font-style:italic">📝 ${s.notes}</div>`:''}
      ${!showPastSessions?`<div class="sess-link-row">
        <button class="copy-link-btn" onclick="openBookingLinkModal(${s.id})">🔗 Copy Booking Link</button>
        ${!isFull?`<button class="copy-link-btn" style="background:var(--navy)" onclick="addManualBooking(${s.id})">+ Add Booking</button>`:''}
      </div>`:''}
    </div>`;
  }).join('');
}

function toggleRecurFields(){
  const val = document.getElementById('or-recur').value;
  const show = val !== 'none';
  document.getElementById('or-recur-fields').style.display = show ? 'block' : 'none';
  document.getElementById('or-save-btn').textContent = show ? 'Create Sessions' : 'Save Session';
  if(show) updateRecurPreview();
}
function toggleRecurEnd(){
  const type = document.getElementById('or-recur-end-type').value;
  document.getElementById('or-recur-count-grp').style.display = type==='count' ? 'block' : 'none';
  document.getElementById('or-recur-date-grp').style.display  = type==='date'  ? 'block' : 'none';
  updateRecurPreview();
}
function updateRecurPreview(){
  const dates = calcRecurDates();
  const el = document.getElementById('or-recur-preview');
  if(!dates.length){ el.textContent=''; return; }
  const fmt = d => new Date(d+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  el.innerHTML = `<strong>${dates.length} session${dates.length!==1?'s':''} will be created:</strong><br>` +
    dates.map(d=>`• ${fmt(d)}`).join('<br>');
}
function calcRecurDates(){
  const startStr = document.getElementById('or-date').value;
  const recur    = document.getElementById('or-recur').value;
  if(!startStr || recur==='none') return [];
  const endType  = document.getElementById('or-recur-end-type').value;
  const maxCount = parseInt(document.getElementById('or-recur-count').value)||4;
  const endDateStr = document.getElementById('or-recur-end-date').value;

  const intervalDays = recur==='weekly' ? 7 : recur==='biweekly' ? 14 : 0;
  const dates = [startStr];
  let cur = new Date(startStr+'T00:00:00');

  if(recur === 'monthly'){
    const limit = endType==='count' ? maxCount : 52;
    const endD  = endType==='date' && endDateStr ? new Date(endDateStr+'T00:00:00') : null;
    for(let i=1; i<limit; i++){
      const next = new Date(cur);
      next.setMonth(next.getMonth()+1);
      if(endD && next > endD) break;
      const ds = next.toISOString().split('T')[0];
      dates.push(ds);
      cur = next;
      if(dates.length >= limit) break;
    }
  } else {
    const limit = endType==='count' ? maxCount : 104;
    const endD  = endType==='date' && endDateStr ? new Date(endDateStr+'T00:00:00') : null;
    for(let i=1; i<limit; i++){
      const next = new Date(cur);
      next.setDate(next.getDate() + intervalDays);
      if(endD && next > endD) break;
      dates.push(next.toISOString().split('T')[0]);
      cur = next;
      if(dates.length >= limit) break;
    }
  }
  return dates;
}
function openOrientModalWithScope(scope){
  editScope = scope;
  closeModal('edit-scope-modal');
  _doOpenOrientModal(pendingEditId);
}
function openOrientModal(id=null){
  if(id){
    const s = orientSessions.find(x=>x.id===id);
    if(s && s.series_id){
      const hasFuture = orientSessions.some(x=>x.series_id===s.series_id && x.date>=s.date && x.id!==id);
      if(hasFuture){
        pendingEditId = id;
        document.getElementById('edit-scope-modal').classList.add('open');
        return;
      }
    }
  }
  editScope = 'single';
  _doOpenOrientModal(id);
}
function _doOpenOrientModal(id){
  editingOrient=id;
  document.getElementById('orient-modal-title').textContent = id ? 'Edit Orientation Session' : 'Add Orientation Session';
  // Reset recurrence UI
  document.getElementById('or-recur').value='none';
  document.getElementById('or-recur-fields').style.display='none';
  document.getElementById('or-recur-end-type').value='count';
  document.getElementById('or-recur-count').value='4';
  document.getElementById('or-recur-end-date').value='';
  document.getElementById('or-recur-count-grp').style.display='block';
  document.getElementById('or-recur-date-grp').style.display='none';
  document.getElementById('or-recur-preview').innerHTML='';
  document.getElementById('or-save-btn').textContent='Save Session';
  // Recurrence only for new sessions
  document.getElementById('or-recur-grp').style.display = id ? 'none' : 'block';

  if(id){
    const s=orientSessions.find(x=>x.id===id);
    document.getElementById('or-date').value=s.date||'';
    document.getElementById('or-time').value=s.time||'10:00';
    document.getElementById('or-cap').value=s.capacity||'6';
    document.getElementById('or-remote').value=s.is_remote||'no';
    document.getElementById('or-video-link').value=s.video_link||'';
    document.getElementById('or-facilitator').value=s.facilitator||'';
    document.getElementById('or-facilitator-role').value=s.facilitator_role||'';
    document.getElementById('or-notes-field').value=s.notes||'';
    document.getElementById('or-link-grp').style.display=s.is_remote==='yes'?'block':'none';
  } else {
    // Pre-populate from orient_config defaults
    const oc = getOrientConfig();
    document.getElementById('or-date').value='';
    document.getElementById('or-time').value='10:00';
    document.getElementById('or-cap').value=String(oc.capacity||6);
    document.getElementById('or-remote').value=oc.location==='remote'?'yes':'no';
    document.getElementById('or-video-link').value='';
    document.getElementById('or-facilitator').value=oc.facilitator||'';
    document.getElementById('or-facilitator-role').value=oc.facilitator?'Staffing Coordinator':'';
    document.getElementById('or-notes-field').value='';
    document.getElementById('or-link-grp').style.display=oc.location==='remote'?'block':'none';
  }
  document.getElementById('orient-modal').classList.add('open');
}
function openOrientModalOnDate(dateStr){
  openOrientModal();
  document.getElementById('or-date').value=dateStr;
}
function saveOrient(){
  const g=k=>document.getElementById(k).value;
  if(!g('or-date')||!g('or-time')){ alert('Date and time are required.'); return; }
  const base={
    time:g('or-time'), capacity:g('or-cap'),
    is_remote:g('or-remote'), video_link:g('or-video-link'),
    notes:g('or-notes-field'), facilitator:g('or-facilitator').trim(), facilitator_role:g('or-facilitator-role')
  };
  if(editingOrient){
    if(editScope==='future'){
      // Update this session and all later sessions in the same series
      const sess=orientSessions.find(x=>x.id===editingOrient);
      if(sess && sess.series_id){
        orientSessions=orientSessions.map(s=>{
          if(s.series_id===sess.series_id && s.date>=sess.date){
            return {...s, ...base};
          }
          return s;
        });
        // Sync updated sessions to calendar
        orientSessions.filter(s=>s.series_id===sess.series_id && s.date>=sess.date).forEach(s=>{
          if(s.gcal_event_id) gcalUpdateEvent(s); else gcalCreateEvent(s).then(eid=>{ if(eid){ s.gcal_event_id=eid; saveOrientStore(); } });
        });
      } else {
        const i=orientSessions.findIndex(x=>x.id===editingOrient);
        orientSessions[i]={...orientSessions[i],...base, date:g('or-date')};
        const s=orientSessions[i];
        if(s.gcal_event_id) gcalUpdateEvent(s); else gcalCreateEvent(s).then(eid=>{ if(eid){ s.gcal_event_id=eid; saveOrientStore(); } });
      }
    } else {
      const i=orientSessions.findIndex(x=>x.id===editingOrient);
      orientSessions[i]={...orientSessions[i],...base, date:g('or-date')};
      const s=orientSessions[i];
      if(s.gcal_event_id) gcalUpdateEvent(s); else gcalCreateEvent(s).then(eid=>{ if(eid){ s.gcal_event_id=eid; saveOrientStore(); } });
    }
  } else {
    const recur = g('or-recur');
    const dates = recur==='none' ? [g('or-date')] : calcRecurDates();
    if(!dates.length){ alert('No valid dates generated. Check the date and recurrence settings.'); return; }
    const seriesId = dates.length>1 ? Date.now() : null;
    dates.forEach(date=>{
      const newSess = {id:orientId++, bookings:[], ...base, date, ...(seriesId?{series_id:seriesId}:{})};
      orientSessions.push(newSess);
      gcalCreateEvent(newSess).then(eid=>{ if(eid){ newSess.gcal_event_id=eid; saveOrientStore(); } });
    });
  }
  saveOrientStore();
  closeModal('orient-modal');
  renderOrientations();
}
function deleteOrient(id){
  const s=orientSessions.find(x=>x.id===id);
  if(!s) return;
  if(s.series_id){
    const hasFuture=orientSessions.some(x=>x.series_id===s.series_id && x.date>=s.date && x.id!==id);
    if(hasFuture){
      pendingDeleteId=id;
      document.getElementById('delete-scope-modal').classList.add('open');
      return;
    }
  }
  const {dow,date}=sessDateShort(s.date);
  if(!confirm(`Delete the ${dow} ${date} at ${fmtTime(s.time)} session?`)) return;
  gcalDeleteEvent(s);
  orientSessions=orientSessions.filter(x=>x.id!==id);
  saveOrientStore(); renderOrientations();
}
function deleteOrientConfirm(scope){
  closeModal('delete-scope-modal');
  const s=orientSessions.find(x=>x.id===pendingDeleteId);
  if(!s){pendingDeleteId=null;return;}
  if(scope==='future'){
    const seriesId=s.series_id, sessDate=s.date;
    const count=orientSessions.filter(x=>x.series_id===seriesId && x.date>=sessDate).length;
    if(!confirm(`Delete ${count} sessions (this and all future in this series)?`)){pendingDeleteId=null;return;}
    // Delete calendar events for all affected sessions
    orientSessions.filter(x=>x.series_id===seriesId && x.date>=sessDate).forEach(x=>gcalDeleteEvent(x));
    orientSessions=orientSessions.filter(x=>!(x.series_id===seriesId && x.date>=sessDate));
  } else {
    const {dow,date}=sessDateShort(s.date);
    if(!confirm(`Delete just the ${dow} ${date} session?`)){pendingDeleteId=null;return;}
    gcalDeleteEvent(s);
    orientSessions=orientSessions.filter(x=>x.id!==pendingDeleteId);
  }
  pendingDeleteId=null;
  saveOrientStore(); renderOrientations();
}

// ── Attendance marking ────────────────────────────────────────────────
function markAttendance(sessId, bookingIdx, status){
  const s = orientSessions.find(x=>x.id===sessId);
  if(!s||!s.bookings||!s.bookings[bookingIdx]) return;
  const b = s.bookings[bookingIdx];
  b.attend_status = status;
  if(!status){ b.cancel_method=null; b.cancel_reason=''; }
  // Sync outcome to matching candidate record
  const cIdx = candidates.findIndex(c=>
    `${c.first} ${c.last}`.toLowerCase()===`${b.first} ${b.last}`.toLowerCase()
    || (b.candidate_id && c.id===b.candidate_id)
  );
  if(cIdx!==-1){
    candidates[cIdx].orient_outcome = status;
    candidates[cIdx].orient_session_date = status ? s.date : '';
    if(!status){ candidates[cIdx].cancel_method=null; candidates[cIdx].cancel_reason=''; }
    /* A no-show or a reschedule is a seat still owed. Keeping invite_sent
       meant they never resurfaced anywhere — not in the ready queue, not in
       any count — and "follow up and rebook them" was an instruction to a
       memory. Clearing it puts them straight back in the invite queue with
       a live Invite button. */
    if(status==='noshow' || status==='rescheduled'){
      candidates[cIdx].invite_sent = false;
      candidates[cIdx].invite_sent_date = '';
    }
    saveCandidates();
  }
  saveOrientStore();
  renderSessionsList();
}
function openCancelModal(sessId, bookingIdx){
  pendingCancelSessId = sessId;
  pendingCancelBookingIdx = bookingIdx;
  const s = orientSessions.find(x=>x.id===sessId);
  const b = s && s.bookings && s.bookings[bookingIdx];
  document.getElementById('cancel-modal-name').textContent = b ? `${b.first} ${b.last}` : 'this candidate';
  document.getElementById('cancel-reason-input').value = b && b.cancel_reason ? b.cancel_reason : '';
  document.querySelectorAll('input[name="cancel-method"]').forEach(r=>{
    r.checked = b && b.cancel_method ? r.value===b.cancel_method : r.value==='call';
  });
  document.getElementById('cancel-modal').classList.add('open');
}
function saveCancelDetails(){
  const s = orientSessions.find(x=>x.id===pendingCancelSessId);
  if(!s||!s.bookings||s.bookings[pendingCancelBookingIdx]===undefined) { closeModal('cancel-modal'); return; }
  const b = s.bookings[pendingCancelBookingIdx];
  const method = document.querySelector('input[name="cancel-method"]:checked')?.value || 'other';
  const reason = document.getElementById('cancel-reason-input').value.trim();
  b.attend_status = 'canceled';
  b.cancel_method = method;
  b.cancel_reason = reason;
  // Sync to candidate
  const cIdx = candidates.findIndex(c=>
    `${c.first} ${c.last}`.toLowerCase()===`${b.first} ${b.last}`.toLowerCase()
    || (b.candidate_id && c.id===b.candidate_id)
  );
  if(cIdx!==-1){
    candidates[cIdx].orient_outcome = 'canceled';
    candidates[cIdx].orient_session_date = s.date;
    candidates[cIdx].cancel_method = method;
    candidates[cIdx].cancel_reason = reason;
    saveCandidates();
  }
  saveOrientStore();
  closeModal('cancel-modal');
  renderSessionsList();
}

/* The caregiver roster record built from a Background & References candidate. Shared by the office-session
   🎓 Promote (orientDate = the session date, they attended) and the welcome-call done path (orientDate = '',
   orientation is done online after the call). */
function cgRecordFromCandidate(c, hireDate, orientDate){
  return {
    id: safeTmpId(), first: c.first, last: c.last,   /* 421: the database gives the real number when it saves */
    // Carry the contact details and the SOURCE ID forward. Without these the
    // promotion destroys the identity trail: the candidate record is deleted
    // a few lines below, taking the only copy of their phone and email with
    // it, and nothing links the new caregiver back to who they came from.
    // That is why 56 caregivers ended up with no way to recognise their calls.
    // (This fix already lived in the Staffing hub's copy; this is the copy
    // that actually runs, and it was still losing them.)
    phone: c.phone||'', email: c.email||'',
    candidate_id: c.id,
    /* The deterministic hiring-pipeline links travel too, so the pipeline shows them as on the roster
       instead of "workspace is gone" with an Import button (a duplicate risk). 2026-10-02. */
    offer_id: c.offer_id!=null && c.offer_id!=='' ? String(c.offer_id) : '',
    intake_id: c.intake_id!=null ? c.intake_id : '',
    promoted_at: new Date().toISOString(),
    // Why we were allowed to hire them, frozen at the only moment it can be —
    // the candidate record and its evidence are deleted just below.
    hiring_snapshot: (typeof hiringSnapshot === 'function' ? hiringSnapshot(c) : null),
    hire_date: hireDate, oos: c.oos||'no',
    orient_date: orientDate, alz_date: '',
    ojt_date: '', ojt_signed: 'no', ojt_proof: '', ojt_online: '',
    annual_date: '', annual_proof: '', annual_online: '',
    oig_date: c.oig_date||'', oig_status: c.oig||'', oig_proof: c.oig_proof||'',
    edl_date: c.edl_date||'', edl_status: c.edl||'', edl_proof: c.edl_proof||'',
    fcsr_date: c.fcsr_date||'', fcsr_status: c.fcsr||'', fcsr_proof: c.fcsr_proof||'',
    fp: c.fp||'N/A', fp_date: c.fp_date||'', fp_proof: c.fp_proof||'',
    supv_date: '', supv_proof: '',
    perf_date: '', perf_proof: '',
    // Frozen pre-hire background-check record for the state audit binder, kept
    // separate from the ongoing/annual checks above so the two never blur.
    prehire: {
      hired_at: hireDate,
      oig:  { status: c.oig||'',  date: c.oig_date||'',  proof: c.oig_proof||''  },
      edl:  { status: c.edl||'',  date: c.edl_date||'',  proof: c.edl_proof||''  },
      fcsr: { status: c.fcsr||'', date: c.fcsr_date||'', proof: c.fcsr_proof||'' },
      fp:   { status: c.fp||'',   date: c.fp_date||'',   proof: c.fp_proof||'',  applicable: c.oos==='yes' },
      /* R3: the references travel with them too. Before this, every reference
         detail was deleted with the candidate record below. */
      refs: obPrehireRefs(c)
    }
  };
}
// ── Promote / Close Out / Reopen ──────────────────────────────────────
async function promoteToCaregiver(candidateId){
  const c = candidates.find(x=>x.id===candidateId);
  if(!c) return;
  if(safeIsTmp(c.id)){ alert(`${c.first} ${c.last} is still being saved. Try again in a moment.`); return; }
  if(!confirm(`Promote ${c.first} ${c.last} to caregiver?\n\nThey will be added to Training & Active Compliance and removed from Background & References.`)) return;
  const hireDate = c.orient_session_date || new Date().toISOString().split('T')[0];
  caregivers.push(cgRecordFromCandidate(c, hireDate, hireDate));
  /* 421: their Background & References record is removed ONLY after the roster
     record reached the shared workspace (it carries the only copy of their checks). */
  if(!(await saveCaregivers({ quiet: true }))){
    alert(`${c.first} ${c.last} was NOT promoted: the roster did not reach the shared workspace. They are still in Background & References. Check your connection and try again.`);
    renderOB(); renderTR(); renderAC();
    return;
  }
  candidates = candidates.filter(x=>x.id!==candidateId);
  await saveCandidates();
  renderOB(); renderTR(); renderAC();
  /* 2c: a new hire needs a published caregiver profile before their first shift */
  const live=!!(window.CGP2&&CGP2.isLive&&CGP2.isLive(CGP2.rowFor(c.id)));
  alert(`🎉 ${c.first} ${c.last} has been promoted! They now appear in Training and Active Compliance.`
    +(live?'':`\n\nProfile needed before first shift: their caregiver profile is not published yet. Publish it (the photo is required) before their first client visit. The Training tab shows it until then.`));
}
function closeOutCandidate(candidateId){
  const c = candidates.find(x=>x.id===candidateId);
  if(!c||!confirm(`Close out ${c.first} ${c.last}?\n\nThey will be hidden from regular views. You can reopen them anytime.`)) return;
  const i = candidates.findIndex(x=>x.id===candidateId);
  candidates[i].closed_out = true;
  saveCandidates(); renderOB();
}
function reopenCandidate(candidateId){
  const i = candidates.findIndex(x=>x.id===candidateId);
  if(i===-1) return;
  candidates[i].closed_out = false;
  candidates[i].orient_outcome = null;
  candidates[i].orient_session_date = '';
  saveCandidates(); renderOB();
}

// ── Bulk compliance actions ───────────────────────────────────────────
function toggleACSelect(id, checked){
  if(checked) acSelected.add(id); else acSelected.delete(id);
  updateACBulkBar();
}
function toggleACSelectAll(checked){
  const visibleIds = [...document.querySelectorAll('#ac-tbody tr')].map(tr=>{
    const chk=tr.querySelector('input[type=checkbox]');
    return chk ? parseInt(chk.getAttribute('onchange').match(/\d+/)[0]) : null;
  }).filter(Boolean);
  if(checked) visibleIds.forEach(id=>acSelected.add(id));
  else acSelected.clear();
  renderAC();
}
function updateACBulkBar(){
  const bar=document.getElementById('ac-bulk-bar');
  const cnt=document.getElementById('ac-bulk-count');
  if(!bar) return;
  if(acSelected.size>0){
    bar.style.display='flex';
    cnt.textContent=`${acSelected.size} selected`;
    // Round top corners on tbl-wrap to match bar
    document.getElementById('ac-tbl-wrap').style.borderRadius='0 0 12px 12px';
  } else {
    bar.style.display='none';
    document.getElementById('ac-tbl-wrap').style.borderRadius='12px';
    const allChk=document.getElementById('ac-chk-all');
    if(allChk) allChk.checked=false;
  }
}
function bulkMarkCheck(type){
  if(!acSelected.size){ alert('No caregivers selected.'); return; }
  const today=new Date().toISOString().split('T')[0];
  const label={oig:'OIG',edl:'EDL',fcsr:'FCSR'}[type];
  if(!confirm(`Mark OIG/EDL/FCSR checked today for ${acSelected.size} caregiver(s)?\n\nThis sets ${label} date to ${today} and status to Current.`.replace('OIG/EDL/FCSR',label))) return;
  acSelected.forEach(id=>{
    const i=caregivers.findIndex(x=>x.id===id);
    if(i===-1) return;
    if(type==='oig')  { caregivers[i].oig_date=today; caregivers[i].oig_status=''; }
    if(type==='edl')  { caregivers[i].edl_date=today; caregivers[i].edl_status=''; }
    if(type==='fcsr') { caregivers[i].fcsr_date=today; caregivers[i].fcsr_status=''; }
  });
  saveCaregivers();
  acSelected.clear();
  renderAC();
}

// ── CSV Export ────────────────────────────────────────────────────────
function exportComplianceCSV(){
  const today=new Date(); today.setHours(0,0,0,0);
  const rows=[['Name','Hire Date','OIG Last Check','OIG Status','EDL Last Check','EDL Status','FCSR Last Check','FCSR Status','Fingerprint','Overall']];
  caregivers.forEach(c=>{
    const o=chkStatus(c.oig_date,90,14), e=chkStatus(c.edl_date,90,14), f=chkStatus(c.fcsr_date,365,30);
    rows.push([
      `${c.first} ${c.last}`,
      c.hire_date||'',
      c.oig_date||'', c.oig_status||o.status,
      c.edl_date||'', c.edl_status||e.status,
      c.fcsr_date||'', c.fcsr_status||f.status,
      c.fp||'N/A',
      acWorst(c)
    ]);
  });
  const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download=`compliance_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

// ── Employee Profile ──────────────────────────────────────────────────
function openProfile(first, last){
  const nm = `${first} ${last}`;
  const cand = candidates.find(c=>`${c.first} ${c.last}`.toLowerCase()===nm.toLowerCase());
  const cg   = caregivers.find(c=>`${c.first} ${c.last}`.toLowerCase()===nm.toLowerCase());
  // Find orientation booking across all sessions
  let booking=null, bookSess=null;
  for(const s of orientSessions){
    const b=(s.bookings||[]).find(b=>`${b.first} ${b.last}`.toLowerCase()===nm.toLowerCase());
    if(b){booking=b;bookSess=s;break;}
  }

  const refBadge=s=>({Positive:'b-green',Conditional:'b-amber',Negative:'b-red',Pending:'b-gray'}[s]||'b-gray');
  const compBadge=s=>({Current:'b-green','Due Soon':'b-amber',Overdue:'b-red'}[s]||'b-gray');
  const miss='<span style="color:#E8E2D8;font-size:.75rem">—</span>';

  // ── Header ──
  const phone = cand?.phone || cg?.phone || '';
  const hireDate = cg?.hire_date ? `Hired ${fmtD(cg.hire_date)}` : (cand ? 'Pre-hire / Candidate' : '');
  const acwStatus = cg ? acWorst(cg) : null;
  const acwBadge = {current:'b-green',duesoon:'b-amber',overdue:'b-red',pending:'b-gray'}[acwStatus]||'b-gray';
  const acwLabel = {current:'Compliance Current',duesoon:'Due Soon',overdue:'Compliance Overdue',pending:'Pending'}[acwStatus]||'';
  const candStatus = cand ? obDeriveStatus(cand) : null;
  const candBadge = candStatus==='Ready for Orientation'?'b-green':candStatus==='Needs Review'?'b-red':'b-gray';

  let html = `<div style="border-bottom:2px solid var(--border);padding-bottom:1rem;margin-bottom:1rem">`;
  html += `<h2 style="font-size:1.25rem;font-weight:700;color:var(--navy);margin-bottom:.25rem">👤 ${nm}</h2>`;
  html += `<div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;font-size:.82rem;color:var(--gray)">`;
  if(phone) html += `<a href="tel:${phone}" style="color:var(--teal);text-decoration:none">📞 ${phone}</a>`;
  if(hireDate) html += `<span>${hireDate}</span>`;
  if(cg?.axiscare_id) html += `<span style="color:var(--gray)">AxisCare ID: ${cg.axiscare_id}</span>`;
  html += `</div>`;
  html += `<div style="display:flex;gap:.4rem;margin-top:.6rem;flex-wrap:wrap">`;
  if(candStatus) html += `<span class="badge ${candBadge}">${candStatus}</span>`;
  if(acwLabel)   html += `<span class="badge ${acwBadge}">${acwLabel}</span>`;
  if(!cand && !cg) html += `<span class="badge b-gray">No records found</span>`;
  html += `</div></div>`;

  // ── Background & References ──
  html += `<div class="sect-lbl">Background &amp; References</div>`;
  if(cand){
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem .75rem;margin:.5rem 0 .75rem">`;
    [1,2,3,4].forEach(n=>{
      const s=cand[`r${n}s`]||'Pending', nm2=cand[`r${n}n`]||'', ph=cand[`r${n}_phone`]||'', em=cand[`r${n}_email`]||'';
      const mn=cand[`r${n}_manual`];
      html+=`<div style="background:var(--slate-bg);border-radius:8px;padding:.5rem .65rem">`;
      html+=`<div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.2rem"><span style="font-size:.72rem;font-weight:600;color:var(--gray)">REF ${n}</span><span class="badge ${refBadge(s)}" style="font-size:.65rem">${s}</span></div>`;
      html+=nm2?`<div style="font-size:.8rem;font-weight:600;color:var(--navy)">${nm2}</div>`:miss;
      if(ph) html+=`<a href="tel:${ph}" style="font-size:.72rem;color:var(--teal);text-decoration:none;display:block">📞 ${ph}</a>`;
      if(em) html+=`<a href="mailto:${em}" style="font-size:.72rem;color:var(--teal);text-decoration:none;display:block">✉️ ${em}</a>`;
      if(mn) html+=`<span style="font-size:.67rem;color:var(--teal);display:block;margin-top:.15rem">📞 Staff completed · ${mn.via} · ${fmtD(mn.date)||''}</span>`;
      if(cand[`r${n}_proof`]) html+=`<a class="proof-link" href="${cand[`r${n}_proof`]}" target="_blank" style="display:block;margin-top:.2rem">📄 form</a>`;
      html+=`</div>`;
    });
    html+=`</div>`;
    // Background checks
    html+=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem;margin-bottom:.75rem">`;
    [{label:'OIG',val:cand.oig,date:cand.oig_date,ok:'CLEAR'},{label:'EDL',val:cand.edl,date:cand.edl_date,ok:'Clear'},{label:'FCSR',val:cand.fcsr,date:cand.fcsr_date,ok:'Clear'},{label:'Fingerprint',val:cand.fp,date:cand.fp_date,ok:'Clear'}].forEach(({label,val,date,ok})=>{
      const b=val===ok?'b-green':(!val||val==='Pending'||val==='N/A')?'b-gray':'b-red';
      html+=`<div style="background:var(--slate-bg);border-radius:8px;padding:.45rem .6rem;text-align:center"><div style="font-size:.68rem;font-weight:600;color:var(--gray)">${label}</div><span class="badge ${b}" style="font-size:.65rem;margin-top:.2rem">${val||'Pending'}</span>${date?`<div style="font-size:.65rem;color:var(--gray);margin-top:.15rem">${fmtD(date)}</div>`:''}</div>`;
    });
    html+=`</div>`;
  } else {
    html+=`<p style="font-size:.8rem;color:var(--gray);margin:.4rem 0 .75rem">No candidate record found.</p>`;
  }

  // ── Orientation ──
  html+=`<div class="sect-lbl">Orientation</div>`;
  html+=`<div style="background:var(--slate-bg);border-radius:8px;padding:.6rem .8rem;margin:.5rem 0 .75rem;font-size:.82rem">`;
  if(cand?.invite_sent){
    html+=`<div style="margin-bottom:.2rem">📅 Invite sent: <strong>${fmtD(cand.invite_sent_date)||'Yes'}</strong></div>`;
  } else {
    html+=`<div style="color:var(--gray);margin-bottom:.2rem">📅 Invite not yet sent</div>`;
  }
  if(bookSess){
    const outcomeLabel={attended:'✅ Attended',noshow:'🚫 No-Show',rescheduled:'📅 Rescheduled',canceled:'❌ Canceled'}[booking?.attend_status]||'⏳ Booked';
    const outColor={attended:'var(--green)',noshow:'var(--red)',rescheduled:'#F97316',canceled:'var(--red)'}[booking?.attend_status]||'var(--navy)';
    html+=`<div>Session: <strong>${fmtD(bookSess.date)}${bookSess.time?' · '+bookSess.time:''}</strong> — <span style="color:${outColor};font-weight:600">${outcomeLabel}</span></div>`;
  } else {
    html+=`<div style="color:var(--gray)">No orientation session booked</div>`;
  }
  html+=`</div>`;

  // ── Training ──
  html+=`<div class="sect-lbl">Training</div>`;
  if(cg){
    const ts=trainStatus(cg);
    const daysLeft30=ts.thirtyDeadline?daysLeft(ts.thirtyDeadline):null;
    html+=`<div style="background:var(--slate-bg);border-radius:8px;padding:.6rem .8rem;margin:.5rem 0 .75rem">`;
    html+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:.3rem .75rem;font-size:.8rem">`;
    html+=`<div><span style="color:var(--gray);font-size:.72rem">Agency Orientation (2hr)</span><br>${cg.orient_date?`<strong>${fmtD(cg.orient_date)}</strong> <span style="color:var(--green)">✓</span>`:'<span style="color:var(--red)">Missing</span>'}</div>`;
    html+=`<div><span style="color:var(--gray);font-size:.72rem">ALZ/Dementia (4hr)</span><br>${cg.alz_date?`<strong>${fmtD(cg.alz_date)}</strong>${cg.alz_hrs?` · ${cg.alz_hrs}hr`:''} <span style="color:var(--green)">✓</span>`:'<span style="color:var(--red)">Missing</span>'}</div>`;
    html+=`<div><span style="color:var(--gray);font-size:.72rem">OJT In-Home (4hr)</span><br>${cg.ojt_date?`<strong>${fmtD(cg.ojt_date)}</strong> <span style="color:var(--green)">✓</span>`:'<span style="color:var(--amber)">Pending</span>'}</div>`;
    html+=`<div><span style="color:var(--gray);font-size:.72rem">OJT Online (2hr)</span><br>${cg.ojt_online?`<strong>${fmtD(cg.ojt_online)}</strong> <span style="color:var(--green)">✓</span>`:'<span style="color:var(--amber)">Pending</span>'}</div>`;
    html+=`<div><span style="color:var(--gray);font-size:.72rem">First Client Contact</span><br>${cg.first_contact?`<strong>${fmtD(cg.first_contact)}</strong>`:miss}</div>`;
    html+=`<div><span style="color:var(--gray);font-size:.72rem">30-Day Deadline</span><br>${ts.thirtyDeadline?`<strong>${ts.thirtyDeadline.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</strong> ${ts.thirtyDone?'<span style="color:var(--green)">✓ Done</span>':ts.thirtyPassed?'<span style="color:var(--red)">⚠ Overdue</span>':`<span style="color:${daysLeft30<=7?'var(--red)':'var(--amber)'}">${daysLeft30}d left</span>`}`:miss}</div>`;
    html+=`</div>`;
    const oBadge={Current:'b-green','Annual Due Soon':'b-amber','Annual Overdue':'b-red','Training Overdue':'b-red','OJT Pending':'b-gray','Client Contact Blocked':'b-red'}[ts.overall]||'b-gray';
    html+=`<div style="margin-top:.5rem;padding-top:.5rem;border-top:1px solid var(--border)"><span class="badge ${oBadge}">${ts.overall}</span></div>`;
    html+=`</div>`;
  } else {
    html+=`<p style="font-size:.8rem;color:var(--gray);margin:.4rem 0 .75rem">No caregiver / training record found.</p>`;
  }

  // ── Active Compliance ──
  html+=`<div class="sect-lbl">Active Compliance</div>`;
  if(cg){
    const o=chkStatus(cg.oig_date,90,14), e=chkStatus(cg.edl_date,90,14), f=chkStatus(cg.fcsr_date,365,30);
    const sv=chkStatus(cg.supv_date,365,30), pr=chkStatus(cg.perf_date,365,30);
    const fReg=fcsrRegStatus(cg);
    const regColor=fReg.status==='ok'?'var(--green)':fReg.status==='overdue'?'var(--red)':'var(--amber)';
    html+=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.4rem;margin:.5rem 0 .75rem">`;
    [{label:'OIG',chk:o,date:cg.oig_date},{label:'EDL',chk:e,date:cg.edl_date},{label:'FCSR Annual',chk:f,date:cg.fcsr_date},{label:'Supervisory Visit',chk:sv,date:cg.supv_date},{label:'Performance Review',chk:pr,date:cg.perf_date}].forEach(({label,chk,date})=>{
      const b=compBadge(chk.status);
      html+=`<div style="background:var(--slate-bg);border-radius:8px;padding:.45rem .6rem"><div style="font-size:.68rem;font-weight:600;color:var(--gray);margin-bottom:.2rem">${label}</div><span class="badge ${b}" style="font-size:.65rem">${chk.status}</span>${date?`<div style="font-size:.65rem;color:var(--gray);margin-top:.15rem">${fmtD(date)}</div>`:''}</div>`;
    });
    html+=`</div>`;
    html+=`<div style="font-size:.75rem;padding:.4rem .6rem;background:var(--slate-bg);border-radius:8px;margin-bottom:.5rem"><span style="color:${regColor};font-weight:600">FCSR Registration:</span> ${fReg.label}</div>`;
  } else {
    html+=`<p style="font-size:.8rem;color:var(--gray);margin:.4rem 0">No active compliance record found.</p>`;
  }

  document.getElementById('profile-content').innerHTML=html;
  document.getElementById('profile-modal').classList.add('open');
}

// ── Settings ──────────────────────────────────────────────────────────
/* Settings are OWNER-ONLY (email-gated, follows the login — a fresh browser
   can't reach them). The admin passcode remains as a second layer. */
const OWNER_EMAILS = ['samantha@mo-care.com'];
async function isOwner(){
  try{
    if(!sb) return false;
    const { data:{ session } } = await sb.auth.getSession();
    return !!session && OWNER_EMAILS.includes(String(session.user.email||'').toLowerCase());
  }catch(e){ return false; }
}
async function openSettings(){
  if(!(await isOwner())){
    alert('Settings are owner-only. If a link or key needs updating, ask Samantha.');
    return;
  }
  // The real security is the owner-email check above (Supabase auth). The
  // admin passcode is a per-browser second lock — but if none has been set on
  // THIS browser yet (new device, cleared storage), there is nothing to match,
  // which used to lock the owner out entirely. In that case, open directly and
  // let her optionally set a passcode inside. (Matches the Care Coordinator Hub.)
  if(!getAdminPwd()){
    _openSettingsModal();
    return;
  }
  // Gate behind the admin passcode when one exists on this browser.
  document.getElementById('admin-pwd-input').value='';
  document.getElementById('admin-pwd-err').style.display='none';
  document.getElementById('admin-pwd-modal').classList.add('open');
}
function submitAdminPwd(){
  const val = document.getElementById('admin-pwd-input').value;
  if(!checkAdminPwd(val)){
    document.getElementById('admin-pwd-err').style.display='block';
    return;
  }
  closeModal('admin-pwd-modal');
  _openSettingsModal();
}
document.getElementById('admin-pwd-input')?.addEventListener('keydown',e=>{if(e.key==='Enter')submitAdminPwd();});
function _openSettingsModal(){
  renderStaffUsers();
  document.getElementById('settings-ac-site').value=appSettings.axiscare_site||'';
  document.getElementById('settings-gdrive-client-id').value=appSettings.google_client_id||'';
  document.getElementById('settings-gdrive-folder-id').value=appSettings.google_drive_folder_id||'';
  document.getElementById('settings-gcal-id').value=appSettings.gcal_calendar_id||'';
  document.getElementById('settings-admin-current').value='';
  document.getElementById('settings-admin-new').value='';
  document.getElementById('settings-admin-confirm').value='';
  document.getElementById('settings-modal').classList.add('open');
}
const NOTIF_TYPES = [
  { key:'evv',    label:'EVV',    color:'#e8f4fd',  tc:'var(--navy)',  title:'EVV Monday 8am reminder' },
  { key:'comp',   label:'Comp',   color:'#f0fffe',  tc:'var(--teal)',  title:'Compliance alerts (Mon/Fri)', border:'1px solid var(--teal)' },
  { key:'orient', label:'Orient', color:'#fff7e6',  tc:'#b45309',      title:'Orientation reminders' },
  { key:'bg',     label:'BG',     color:'#f3f0ff',  tc:'#6d28d9',      title:'Background check alerts' },
  { key:'refs',   label:'Refs',   color:'#fdf2f8',  tc:'#be185d',      title:'Reference check completions' },
];

function renderStaffUsers(){
  const list = document.getElementById('staff-users-list');
  if(!list) return;
  const users = allStaff();
  if(!users.length){
    list.innerHTML = '<div style="font-size:.8rem;color:var(--gray);padding:.5rem 0;font-style:italic">No staff added yet. Anyone you add here also appears in the Care Coordinator Hub — it is one list now.</div>';
    return;
  }
  list.innerHTML = users.map((u,i)=>{
    const notifBadges = NOTIF_TYPES.map(n=>{
      const on = notifOn(u, n.key);
      return `<button onclick="toggleStaffNotif(${i},'${n.key}')" title="${n.title}"
        style="font-size:.65rem;font-weight:700;padding:.18rem .42rem;border-radius:4px;cursor:pointer;border:1.5px solid ${on?(n.border||'transparent'):'var(--border)'};
        background:${on?n.color:'#FAF9F6'};color:${on?n.tc:'#bbb'};transition:.12s">${n.label}</button>`;
    }).join('');
    return `<div style="display:grid;grid-template-columns:1fr 1.5fr auto auto;gap:.5rem;align-items:center;padding:.6rem .75rem;background:var(--slate-bg);border-radius:8px;border:1.5px solid var(--border)">
      <div>
        <div style="font-size:.83rem;font-weight:600;color:var(--navy)">${u.name}</div>
        <div style="font-size:.7rem;color:var(--gray)">${u.role||''}</div>
      </div>
      <div style="font-size:.75rem;color:var(--gray);word-break:break-all">${u.email}</div>
      <div style="display:flex;gap:.25rem;flex-wrap:wrap">${notifBadges}</div>
      <button onclick="removeStaffUser(${i})" style="background:none;border:none;cursor:pointer;font-size:1rem;color:var(--gray);padding:.2rem .4rem;flex-shrink:0" title="Remove">✕</button>
    </div>`;
  }).join('');
}

/* Every mutation below writes the SHARED list. If the person was still only in
   the old staff_users list, touching them moves them across — the migration
   happens by using the thing, so there's no separate step to remember. */
async function persistStaff(s){
  const key=(s.email||'').toLowerCase();
  const i=SHARED_STAFF.findIndex(x=> x.id===s.id || (key && (x.email||'').toLowerCase()===key));
  if(i>=0) SHARED_STAFF[i]=s; else SHARED_STAFF.push(s);
  try{
    const { error } = await sb.rpc('upsert_app_data_item',{ target_key:'coordinator_staff', item:s });
    if(error) throw error;
  }catch(e){ alert('Could not save that staff change — check your connection and try again.'); }
}

async function dropLegacy(u){
  const before=(appSettings.staff_users||[]).length;
  appSettings.staff_users=(appSettings.staff_users||[]).filter(x=>
    (x.email||'').toLowerCase()!==(u.email||'').toLowerCase());
  if(appSettings.staff_users.length!==before) await syncToSupabase('settings', appSettings);
}

async function toggleStaffNotif(idx, key){
  const u=allStaff()[idx]; if(!u) return;
  const s={...u}; delete s._legacy;
  if(!s.id) s.id='st'+Date.now();
  s['notify_'+key]=!notifOn(u,key);
  if(s.notifications) s.notifications[key]=s['notify_'+key];
  await persistStaff(s);
  if(u._legacy) await dropLegacy(u);
  syncAlertRecipients();
  renderStaffUsers();
}

async function addStaffUser(){
  const name  = document.getElementById('new-staff-name').value.trim();
  const email = document.getElementById('new-staff-email').value.trim();
  const role  = document.getElementById('new-staff-role').value;
  if(!name||!email){ alert('Name and email are required.'); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ alert('Please enter a valid email address.'); return; }
  const s = { id:'st'+Date.now(), name, email:email.toLowerCase(), role };
  NOTIF_TYPES.forEach(n=>{ s['notify_'+n.key] = document.getElementById('ns-'+n.key)?.checked||false; });
  await persistStaff(s);
  document.getElementById('new-staff-name').value='';
  document.getElementById('new-staff-email').value='';
  document.getElementById('new-staff-role').value='';
  NOTIF_TYPES.forEach(n=>{ const el=document.getElementById('ns-'+n.key); if(el) el.checked = (n.key==='evv'||n.key==='comp'); });
  syncAlertRecipients();
  renderStaffUsers();
}

async function removeStaffUser(idx){
  const u=allStaff()[idx]; if(!u) return;
  if(!confirm(`Remove ${u.name}? This removes them everywhere — both hubs read one staff list now.`)) return;
  if(u._legacy){ await dropLegacy(u); }
  else{
    SHARED_STAFF=SHARED_STAFF.filter(x=>x.id!==u.id);
    try{ await sb.rpc('delete_app_data_item',{ target_key:'coordinator_staff', item_id:u.id }); }
    catch(e){ alert('Could not remove that person — try again.'); }
  }
  syncAlertRecipients();
  renderStaffUsers();
}

// Keep alert_recipients in sync so existing compliance email logic still works
/* ── ONE STAFF LIST ───────────────────────────────────────────────────────────
   Staff used to live in two places: this hub's appSettings.staff_users and the
   Care Coordinator Hub's shared 'coordinator_staff'. Same people, two lists,
   silently drifting. 'coordinator_staff' is now the single list and both hubs
   read and write it. Any leftover staff_users rows still show (marked), so
   nothing disappears, and they merge in the moment someone is re-saved. */
let SHARED_STAFF = [];

// The two hubs named their notification flags differently. Read both.
function notifOn(u, key){
  return !!(u && (u['notify_'+key] || (u.notifications && u.notifications[key])));
}

function allStaff(){
  const merged = (SHARED_STAFF||[]).slice();
  const seen = new Set(merged.map(s=>(s.email||'').toLowerCase()).filter(Boolean));
  (appSettings.staff_users||[]).forEach(u=>{
    const e=(u.email||'').toLowerCase();
    if(e && seen.has(e)) return;          // already in the shared list
    merged.push({ ...u, _legacy:true });  // shown, flagged, not yet shared
  });
  return merged;
}

function syncAlertRecipients(){
  appSettings.alert_recipients = allStaff()
    .filter(u=>notifOn(u,'comp'))
    .map(u=>({name:u.name, email:u.email}));
}

// Helper: get emails for a given notification type
function getNotifEmails(key){
  return allStaff()
    .filter(u=>notifOn(u,key))
    .map(u=>u.email)
    .filter(Boolean);
}

// Migrate old alert_recipients into staff_users on first load
function migrateOldRecipients(){
  if(appSettings.staff_users) return; // already migrated
  const old = appSettings.alert_recipients || [];
  appSettings.staff_users = old.map(r=>({
    id: Date.now()+Math.random(),
    name: r.name, email: r.email, role: '',
    notifications: { evv:true, comp:true, orient:false, bg:false, refs:false }
  }));
}
function saveSettings(){
  appSettings.axiscare_site = document.getElementById('settings-ac-site').value.trim();
  const newClientId = document.getElementById('settings-gdrive-client-id').value.trim();
  appSettings.google_drive_folder_id = document.getElementById('settings-gdrive-folder-id').value.trim();
  appSettings.gcal_calendar_id = document.getElementById('settings-gcal-id').value.trim() || 'primary';
  if(newClientId !== appSettings.google_client_id){
    appSettings.google_client_id = newClientId;
    gdriveTokenClient = null;
    gdriveAccessToken = null;
    gdriveFolderId = null;
    Object.keys(gdrivePersonFolderCache).forEach(k=>delete gdrivePersonFolderCache[k]);
    if(newClientId) gdriveInit();
  }
  // Admin passcode change
  const curPwd  = document.getElementById('settings-admin-current').value;
  const newPwd  = document.getElementById('settings-admin-new').value;
  const confPwd = document.getElementById('settings-admin-confirm').value;
  if(newPwd || curPwd){
    if(!checkAdminPwd(curPwd)){ alert('Current admin passcode is incorrect.'); return; }
    if(!newPwd){ alert('Enter a new admin passcode.'); return; }
    if(newPwd !== confPwd){ alert('New passcode and confirmation do not match.'); return; }
    localStorage.setItem('cc_admin_pwd', btoa(newPwd));
    alert('Admin passcode updated.');
  }
  localStorage.setItem('cc_settings', JSON.stringify(appSettings));
  syncToSupabase('settings', appSettings);
  closeModal('settings-modal');
}

// ── CSV Import ────────────────────────────────────────────────────────
const CSV_TEMPLATE_HEADERS = 'first,last,hire_date';
const CSV_TEMPLATE_EXAMPLE = 'Jane,Smith,2023-04-10\nMike,Johnson,2024-01-15\nSarah,Williams,2022-09-01';

function downloadCSVTemplate(){
  const content = CSV_TEMPLATE_HEADERS + '\n' + CSV_TEMPLATE_EXAMPLE;
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(content);
  a.download = 'Caregiver_Import_Template.csv';
  a.click();
}

function openImportModal(){
  document.getElementById('csv-paste-area').value = '';
  document.getElementById('csv-preview').style.display = 'none';
  document.getElementById('csv-import-btn').style.display = 'none';
  document.getElementById('csv-preview-btn').style.display = '';
  document.getElementById('csv-import-modal').classList.add('open');
}

function handleCSVFile(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('csv-paste-area').value = ev.target.result;
    previewCSV();
  };
  reader.readAsText(file);
  e.target.value = '';
}

let _csvParsed = [];
function parseCSVLine(line){
  const result = [];
  let cur = '', inQ = false;
  for(let i=0;i<line.length;i++){
    const ch = line[i];
    if(ch==='"' && !inQ){ inQ=true; }
    else if(ch==='"' && inQ){ inQ=false; }
    else if(ch===',' && !inQ){ result.push(cur.trim()); cur=''; }
    else { cur+=ch; }
  }
  result.push(cur.trim());
  return result;
}

function previewCSV(){
  const raw = document.getElementById('csv-paste-area').value.trim();
  if(!raw){ alert('Paste CSV content or choose a file first.'); return; }
  const lines = raw.split(/\r?\n/).filter(l=>l.trim());
  const headers = parseCSVLine(lines[0]).map(h=>h.toLowerCase().trim());
  _csvParsed = [];
  const skipped = [];
  for(let i=1;i<lines.length;i++){
    const vals = parseCSVLine(lines[i]);
    if(vals.every(v=>!v)) continue;
    const row = {};
    headers.forEach((h,idx) => row[h] = (vals[idx]||'').trim());
    const first = row.first||'', last = row.last||'';
    if(!first && !last){ skipped.push(`Row ${i+1}: no name`); continue; }
    const exists = caregivers.some(c=>c.first.toLowerCase()===first.toLowerCase()&&c.last.toLowerCase()===last.toLowerCase());
    if(exists){ skipped.push(`${first} ${last} — already exists, skipped`); continue; }
    _csvParsed.push({
      first, last,
      hire_date: row.hire_date||'', orient_date: row.orient_date||'',
      oos: row.oos||'no', alz_date: row.alz_date||'',
      ojt_date: row.ojt_date||'', ojt_signed: row.ojt_signed||'no',
      ojt_proof:'', ojt_online:'',
      annual_date: row.annual_date||'', annual_proof:'',
      oig_date: row.oig_date||'', oig_status:'', oig_proof:'',
      edl_date: row.edl_date||'', edl_status:'', edl_proof:'',
      fcsr_date: row.fcsr_date||'', fcsr_status:'', fcsr_proof:'',
      fp: row.fp||'N/A', fp_date: row.fp_date||'', fp_proof:'',
      supv_date: row.supv_date||'', supv_proof:'',
      perf_date: row.perf_date||'', perf_proof:''
    });
  }
  const msgEl = document.getElementById('csv-preview-msg');
  const listEl = document.getElementById('csv-preview-list');
  document.getElementById('csv-preview').style.display = 'block';
  const toImport = _csvParsed.map(c=>`<div style="padding:.3rem 0;border-bottom:1px solid #FAF9F6;color:var(--green-text)">✓ ${c.first} ${c.last}${c.hire_date?` · Hired ${c.hire_date}`:''}</div>`).join('');
  const toSkip = skipped.map(s=>`<div style="padding:.3rem 0;border-bottom:1px solid #FAF9F6;color:var(--slate-text)">— ${s}</div>`).join('');
  listEl.innerHTML = toImport + toSkip || '<div style="padding:.3rem 0;color:var(--gray)">No rows found.</div>';
  if(_csvParsed.length){
    msgEl.textContent = `Ready to import ${_csvParsed.length} caregiver${_csvParsed.length>1?'s':''}${skipped.length?` · ${skipped.length} skipped`:''}`;
    msgEl.style.color = 'var(--green-text)';
    document.getElementById('csv-import-btn').style.display = '';
    document.getElementById('csv-preview-btn').style.display = 'none';
  } else {
    msgEl.textContent = skipped.length ? `Nothing to import — ${skipped.length} row(s) skipped.` : 'No valid rows found.';
    msgEl.style.color = 'var(--amber-text)';
    document.getElementById('csv-import-btn').style.display = 'none';
  }
}

async function confirmCSVImport(){
  if(!_csvParsed.length) return;
  _csvParsed.forEach(d => caregivers.push({id:safeTmpId(),...d}));
  closeModal('csv-import-modal');
  /* 421: numbers come from the database; say "imported" only when it confirmed. */
  const ok = await saveCaregivers({ quiet: true });
  renderTR(); renderAC(); renderAlerts();
  if(ok) alert(`✅ Imported ${_csvParsed.length} caregiver${_csvParsed.length>1?'s':''}. They now appear in Training and Active Compliance.`);
  else alert(`Not imported: the ${_csvParsed.length} caregiver${_csvParsed.length>1?'s':''} did not reach the shared workspace, so none were added. Check your connection and try again.`);
  _csvParsed = [];
}

// ── Global search ─────────────────────────────────────────────────────
function onGlobalSearch(val){
  globalSearch = val.toLowerCase();
  const renders={onboarding:renderOB,training:renderTR,compliance:renderAC};
  if(renders[activeTab]) renders[activeTab]();
}
function addManualBooking(sessId){
  const first=prompt('Candidate first name:'); if(!first) return;
  const last=prompt('Candidate last name:'); if(!last) return;
  const phone=prompt('Candidate phone (optional):','') || '';
  const s=orientSessions.find(x=>x.id===sessId);
  if(!s.bookings) s.bookings=[];
  if(s.bookings.length>=parseInt(s.capacity)){ alert('This session is full.'); return; }
  s.bookings.push({first,last,phone,booked_at:new Date().toISOString().split('T')[0]});
  saveOrientStore(); renderOrientations(); renderAlerts();
}

// Booking link generation
function openBookingLinkModal(sessId){
  const sess = orientSessions.find(x=>x.id===sessId);
  if(!sess){ alert('Session not found.'); return; }
  // Build available sessions for this link (all upcoming with spots)
  const now=new Date(); now.setHours(0,0,0,0);
  const available=orientSessions.filter(s=>{
    const sd=new Date(s.date+'T00:00:00');
    return sd>=now && (s.bookings||[]).length<parseInt(s.capacity);
  }).sort((a,b)=>a.date.localeCompare(b.date));
  const encoded=btoa(JSON.stringify(available.map(s=>({
    id:s.id, date:s.date, time:s.time,
    remote:s.is_remote==='yes', link:s.video_link||'',
    notes:s.notes||'',
    spots:parseInt(s.capacity)-(s.bookings||[]).length,
    dur:getOrientDuration()
  }))));
  const url=`${ORIENT_BOOKING_URL}?sessions=${encoded}`;
  document.getElementById('bl-cand-name').textContent='Booking link for all available sessions';
  document.getElementById('bl-url').textContent=url;
  document.getElementById('booking-link-modal').classList.add('open');
}
function copyBLToClipboard(){
  const url=document.getElementById('bl-url').textContent;
  navigator.clipboard.writeText(url).then(()=>{
    const btn=document.querySelector('#booking-link-modal .btn-save');
    btn.textContent='✅ Copied!'; btn.style.background='var(--green)';
    setTimeout(()=>{ btn.textContent='📋 Copy Link'; btn.style.background='var(--teal)'; },2000);
  });
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                  EVV CORRECTIONS MODULE                     ║
// ╚══════════════════════════════════════════════════════════════╝

const EVV_WARN_THRESHOLD    = 5;   // agency-wide yellow
const EVV_DANGER_THRESHOLD  = 10;  // agency-wide red
const EVV_ATTENDANT_LIMIT   = 3;   // per-attendant red flag
const EVV_FORM_URL = 'https://sc.mo-care.com/evv-correction-form';

// ── Storage ──────────────────────────────────────────────────────────
function getEVVCorrections() {
  try { return JSON.parse(localStorage.getItem('cc_evv_corrections')) || []; }
  catch(e) { return []; }
}
function saveEVVCorrections(arr) {
  localStorage.setItem('cc_evv_corrections', JSON.stringify(arr));
  syncToSupabase('evv_corrections', arr);
}

// ── Helpers ───────────────────────────────────────────────────────────
function evvGetPayPeriod(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T12:00:00');
  const sun = new Date(d); sun.setDate(d.getDate() - d.getDay());
  const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
  const fmt = dt => dt.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  return fmt(sun) + ' – ' + fmt(sat);
}

function evvIsLate(visitdate, submitdate) {
  if (!visitdate || !submitdate) return false;
  const visit = new Date(visitdate + 'T12:00:00');
  const cutoff = new Date(visit);
  cutoff.setDate(visit.getDate() + (6 - visit.getDay()));
  cutoff.setHours(23, 59, 59);
  return new Date(submitdate + 'T23:59:59') > cutoff;
}

function evvGetStatus(c) {
  if (c.status === 'denied') return 'denied';
  if (c.wellskyDone === 'yes' && c.formReceived === 'yes') return 'complete';
  if (c.formReceived === 'yes') return 'pending_wellsky';
  return 'pending_form';
}

function evvStatusBadge(status) {
  if (status === 'complete')         return '<span class="badge b-green">✓ Complete</span>';
  if (status === 'pending_wellsky')  return '<span class="badge b-amber">⏳ Awaiting AxisCare</span>';
  if (status === 'denied')           return '<span class="badge b-red">Denied</span>';
  return '<span class="badge b-red">⏳ Awaiting Form</span>';
}

// ── Open modal ────────────────────────────────────────────────────────
function openEVVModal() {
  // Reset all fields
  ['evv-cor-attendant','evv-cor-consumer','evv-cor-reason-other','evv-cor-admin','evv-cor-notes'].forEach(id=>{
    const el = document.getElementById(id); if(el) el.value='';
  });
  ['evv-cor-visitdate','evv-cor-submitdate','evv-cor-orig-in','evv-cor-orig-out',
   'evv-cor-new-in','evv-cor-new-out','evv-cor-wellsky-date'].forEach(id=>{
    const el = document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('evv-cor-reason').value = '';
  document.getElementById('evv-cor-form-received').value = 'no';
  document.getElementById('evv-cor-wellsky-done').value = 'no';
  document.getElementById('evv-reason-other-grp').style.display = 'none';
  document.getElementById('evv-correction-modal').classList.add('open');
}

function toggleEVVReasonOther(val) {
  document.getElementById('evv-reason-other-grp').style.display = val === 'Other' ? 'grid' : 'none';
}

// ── Save new correction ───────────────────────────────────────────────
function saveEVVCorrection() {
  const attendant = document.getElementById('evv-cor-attendant').value.trim();
  const consumer  = document.getElementById('evv-cor-consumer').value.trim();
  const visitdate = document.getElementById('evv-cor-visitdate').value;
  if (!attendant || !consumer || !visitdate) {
    alert('Attendant name, client name, and visit date are required.'); return;
  }
  const reason = document.getElementById('evv-cor-reason').value;
  const reasonOther = document.getElementById('evv-cor-reason-other').value.trim();
  const corrections = getEVVCorrections();
  corrections.unshift({
    id: Date.now().toString(),
    attendant, consumer, visitdate,
    submitdate:    document.getElementById('evv-cor-submitdate').value,
    origIn:        document.getElementById('evv-cor-orig-in').value,
    origOut:       document.getElementById('evv-cor-orig-out').value,
    newIn:         document.getElementById('evv-cor-new-in').value,
    newOut:        document.getElementById('evv-cor-new-out').value,
    reason:        reason === 'Other' ? (reasonOther || 'Other') : reason,
    formReceived:  document.getElementById('evv-cor-form-received').value,
    wellskyDone:   document.getElementById('evv-cor-wellsky-done').value,
    admin:         document.getElementById('evv-cor-admin').value.trim(),
    wellskyDate:   document.getElementById('evv-cor-wellsky-date').value,
    notes:         document.getElementById('evv-cor-notes').value.trim(),
    loggedAt:      new Date().toISOString()
  });
  saveEVVCorrections(corrections);
  closeModal('evv-correction-modal');
  renderEVVCorrections();
}

// ── Toggle AxisCare checkbox inline ───────────────────────────────────
function evvToggleWellsky(id, checked) {
  const corrections = getEVVCorrections();
  const idx = corrections.findIndex(c => c.id === id);
  if (idx === -1) return;
  corrections[idx].wellskyDone = checked ? 'yes' : 'no';
  if (checked) corrections[idx].wellskyDate = new Date().toISOString().split('T')[0];
  saveEVVCorrections(corrections);
  renderEVVCorrections();
}

// ── Remove a record ───────────────────────────────────────────────────
function evvRemove(id) {
  if (!confirm('Remove this correction record?')) return;
  saveEVVCorrections(getEVVCorrections().filter(c => c.id !== id));
  renderEVVCorrections();
}

// ── Copy form link ────────────────────────────────────────────────────
function copyEVVFormLink(btn) {
  navigator.clipboard.writeText(EVV_FORM_URL).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => btn.textContent = orig, 2000);
  });
}

// ── Pending submissions from Supabase ─────────────────────────────────
// Cache of pending rows keyed by id — used by the Accept button so we don't
// have to embed the full record (signatures included) in the onclick attribute.
let _evvPendingCache = {};
async function loadPendingEVVSubmissions() {
  const container = document.getElementById('evv-pending-body');
  const badge     = document.getElementById('evv-pending-badge');
  if (!container) return;

  container.innerHTML = '<p style="font-size:.82rem;color:var(--gray)">Loading…</p>';

  try {
    const { data, error } = await sb
      .from('evv_submissions')
      .select('*')
      .eq('processed', false)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      badge.style.display = 'none';
      container.innerHTML = '<p style="font-size:.82rem;color:var(--gray)">No pending submissions — all caught up ✅</p>';
      return;
    }

    badge.textContent = data.length + ' new';
    badge.style.display = 'inline-flex';

    _evvPendingCache = {};
    container.innerHTML = data.map(sub => {
      const origTime = [sub.orig_in, sub.orig_out].filter(Boolean).join(' – ') || '—';
      const newTime  = [sub.new_in,  sub.new_out ].filter(Boolean).join(' – ') || '—';
      const submitted = sub.submitted_at
        ? new Date(sub.submitted_at).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})
        : '—';

      // Late check (after Saturday 11:59 PM of visit week)
      let lateTag = '';
      if (sub.visitdate && sub.submitdate) {
        const visit = new Date(sub.visitdate + 'T12:00:00');
        const cutoff = new Date(visit);
        cutoff.setDate(visit.getDate() + (6 - visit.getDay()));
        cutoff.setHours(23,59,59);
        if (new Date(sub.submitdate + 'T23:59:59') > cutoff) {
          lateTag = '<span class="badge b-red" style="font-size:.65rem;margin-left:.3rem">⚠️ Late</span>';
        }
      }

      const sigHtml = (sig, label) => sig
        ? `<div style="margin-top:.5rem"><div style="font-size:.68rem;color:var(--gray);margin-bottom:.2rem">${label}</div><img src="${sig}" style="max-width:180px;border:1px solid var(--border);border-radius:4px"></div>`
        : '';

      _evvPendingCache[sub.id] = sub;
      return `<div style="border:1.5px solid var(--border);border-radius:8px;padding:1rem 1.1rem;margin-bottom:.75rem;background:var(--bg)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem;margin-bottom:.65rem">
          <div>
            <div style="font-weight:700;font-size:.9rem">${sub.attendant} <span style="color:var(--gray)">→</span> ${sub.consumer}</div>
            <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.35rem;align-items:center">
              <span class="badge b-blue">📅 Visit: ${sub.visitdate||'—'}</span>
              ${lateTag}
              <span style="font-size:.72rem;color:var(--gray)">Submitted: ${submitted}</span>
            </div>
          </div>
          <div style="display:flex;gap:.4rem;flex-shrink:0">
            <button class="add-btn" style="background:var(--green);font-size:.75rem;padding:.3rem .65rem" onclick="acceptEVVSubmission('${sub.id}')">✓ Accept &amp; Log</button>
            <button class="ibtn" style="color:var(--red);font-size:.75rem" onclick="dismissEVVSubmission('${sub.id}')">✕ Dismiss</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;font-size:.78rem;margin-bottom:.5rem">
          <div><span style="color:var(--gray)">Original:</span><br><strong>${origTime}</strong></div>
          <div><span style="color:var(--gray)">Corrected:</span><br><strong>${newTime}</strong></div>
          <div><span style="color:var(--gray)">Reason:</span><br><strong>${sub.reason||'—'}</strong></div>
        </div>
        ${sub.notes ? `<div style="font-size:.78rem;background:var(--white);border-radius:6px;padding:.4rem .65rem;margin-bottom:.3rem"><span style="color:var(--gray)">Notes:</span> ${sub.notes}</div>` : ''}
        <div style="display:flex;gap:1rem;flex-wrap:wrap">
          ${sigHtml(sub.sig_attendant,'Attendant signature')}
          ${sigHtml(sub.sig_consumer,'Client signature')}
        </div>
      </div>`;
    }).join('');
  } catch(err) {
    console.error('loadPendingEVVSubmissions:', err);
    container.innerHTML = `<p style="font-size:.82rem;color:var(--red-text)">Could not load submissions: ${err.message}.<br>Make sure the <code>evv_submissions</code> table exists in Supabase (see setup SQL).</p>`;
  }
}

async function acceptEVVSubmission(subId) {
  const sub = _evvPendingCache[subId];
  if(!sub){ alert('Could not find this submission — click ↻ Refresh and try again.'); return; }
  const { data: { user } } = await sb.auth.getUser();
  const adminEmail = user?.email || 'unknown';

  const corrections = getEVVCorrections();
  corrections.unshift({
    id: Date.now().toString(),
    attendant:    sub.attendant,
    consumer:     sub.consumer,
    visitdate:    sub.visitdate,
    submitdate:   sub.submitdate || '',
    origIn:       sub.orig_in || '',
    origOut:      sub.orig_out || '',
    newIn:        sub.new_in || '',
    newOut:       sub.new_out || '',
    reason:       sub.reason || '',
    formReceived: 'yes',
    wellskyDone:  'no',
    admin:        adminEmail,
    wellskyDate:  '',
    notes:        sub.notes || '',
    loggedAt:     new Date().toISOString()
  });
  saveEVVCorrections(corrections);

  // Mark processed + log which admin acted
  const { error: procErr } = await sb.from('evv_submissions').update({
    processed:    true,
    processed_by: adminEmail,
    processed_at: new Date().toISOString()
  }).eq('id', sub.id);
  if(procErr){ alert('Logged locally, but could not mark the submission processed in Supabase: ' + procErr.message); }

  await loadPendingEVVSubmissions();
  renderEVVCorrections();
  alert(`✅ Logged! "${sub.attendant}" correction is now in the log. Update AxisCare and check the form-received box once done.`);
}

async function dismissEVVSubmission(id) {
  if (!confirm('Dismiss this submission? It will be removed from the pending list.')) return;
  const { data: { user } } = await sb.auth.getUser();
  const adminEmail = user?.email || 'unknown';
  await sb.from('evv_submissions').update({
    processed:    true,
    processed_by: adminEmail,
    processed_at: new Date().toISOString()
  }).eq('id', id);
  loadPendingEVVSubmissions();
}

// ── Populate month filter ─────────────────────────────────────────────
function evvPopulateMonths() {
  const corrections = getEVVCorrections();
  const months = new Set();
  corrections.forEach(c => { if (c.visitdate) months.add(c.visitdate.substring(0,7)); });
  const sel = document.getElementById('evv-filter-month');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">All Months</option>';
  Array.from(months).sort().reverse().forEach(m => {
    const [yr, mo] = m.split('-');
    const label = new Date(yr, mo-1).toLocaleString('en-US',{month:'long',year:'numeric'});
    sel.innerHTML += `<option value="${m}" ${m===current?'selected':''}>${label}</option>`;
  });
}

// ── Main render ───────────────────────────────────────────────────────
function renderEVVCorrections() {
  const corrections = getEVVCorrections();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  // Month label
  const labelEl = document.getElementById('evv-month-label');
  if (labelEl) labelEl.textContent = now.toLocaleString('en-US',{month:'long',year:'numeric'});

  evvPopulateMonths();

  const filterMonth  = document.getElementById('evv-filter-month')?.value  || '';
  const filterStatus = document.getElementById('evv-filter-status')?.value || '';

  let filtered = corrections;
  if (filterMonth)  filtered = filtered.filter(c => c.visitdate && c.visitdate.startsWith(filterMonth));
  if (filterStatus) filtered = filtered.filter(c => evvGetStatus(c) === filterStatus);

  const countEl = document.getElementById('evv-filter-count');
  if (countEl) countEl.textContent = `${filtered.length} record${filtered.length!==1?'s':''}`;

  const tbody = document.getElementById('evv-table-body');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11"><div class="empty">No corrections match the current filter.</div></td></tr>';
  } else {
    tbody.innerHTML = filtered.map((c, i) => {
      const status   = evvGetStatus(c);
      const origTime = [(c.origIn||'?'), (c.origOut||'?')].join(' – ');
      const newTime  = [(c.newIn||'?'),  (c.newOut||'?')].join(' – ');
      const formBadge = c.formReceived === 'yes'
        ? '<span class="badge b-green">✓ On File</span>'
        : '<span class="badge b-red">Missing</span>';
      const wsDone = c.wellskyDone === 'yes';
      const wsCell = `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap">
          <input type="checkbox" ${wsDone?'checked':''} onchange="evvToggleWellsky('${c.id}',this.checked)"
            style="width:16px;height:16px;accent-color:var(--green);cursor:pointer;flex-shrink:0">
          <span style="font-size:.72rem;color:${wsDone?'var(--green-text)':'var(--red-text)'}">
            ${wsDone ? (c.wellskyDate ? 'Done '+c.wellskyDate : 'Done') : 'Not yet'}
          </span>
        </label>
        ${c.admin ? `<div style="font-size:.67rem;color:var(--gray);margin-top:2px">By: ${c.admin}</div>` : ''}`;
      const lateTag = evvIsLate(c.visitdate, c.submitdate)
        ? '<span class="badge b-red" style="font-size:.62rem">Late</span>' : '';
      return `<tr>
        <td style="font-size:.72rem;color:var(--gray)">${corrections.indexOf(c)+1}</td>
        <td><strong style="font-size:.83rem">${c.visitdate}</strong>${c.submitdate?`<div class="sub">Submitted: ${c.submitdate} ${lateTag}</div>`:''}</td>
        <td class="name-cell">${c.attendant}</td>
        <td>${c.consumer}</td>
        <td style="font-size:.78rem;color:var(--gray)">${origTime}</td>
        <td style="font-size:.78rem;font-weight:600">${newTime}</td>
        <td style="font-size:.78rem;max-width:150px">${c.reason||'—'}${c.notes?`<div class="sub">${c.notes}</div>`:''}</td>
        <td>${formBadge}</td>
        <td>${wsCell}</td>
        <td>${evvStatusBadge(status)}</td>
        <td class="acts">
          <button class="ibtn" style="color:var(--red)" onclick="evvRemove('${c.id}')">✕</button>
        </td>
      </tr>`;
    }).join('');
  }

  // ── Threshold summary ──
  const thisMonth = corrections.filter(c => c.visitdate && c.visitdate.startsWith(currentMonth));
  const total = thisMonth.length;

  const totalEl = document.getElementById('evv-thresh-total');
  if (totalEl) {
    totalEl.textContent = total;
    totalEl.className = 'evv-stat-num ' +
      (total >= EVV_DANGER_THRESHOLD ? 'v-red' : total >= EVV_WARN_THRESHOLD ? 'v-amber' : 'v-green');
  }

  // Per-attendant
  const byAtt = {};
  thisMonth.forEach(c => { byAtt[c.attendant] = (byAtt[c.attendant]||0)+1; });
  const sorted = Object.entries(byAtt).sort((a,b)=>b[1]-a[1]);
  const maxCount = sorted.length > 0 ? sorted[0][1] : 0;
  const maxName  = sorted.length > 0 ? sorted[0][0] : '—';

  const maxCountEl = document.getElementById('evv-thresh-max-count');
  if (maxCountEl) {
    maxCountEl.textContent = maxCount;
    maxCountEl.className = 'evv-stat-num ' +
      (maxCount >= EVV_ATTENDANT_LIMIT ? 'v-red' : maxCount >= 2 ? 'v-amber' : 'v-green');
  }
  const maxNameEl = document.getElementById('evv-thresh-max-name');
  if (maxNameEl) maxNameEl.textContent = maxName;

  const summaryDiv = document.getElementById('evv-attendant-summary');
  if (!summaryDiv) return;
  if (sorted.length === 0) {
    summaryDiv.innerHTML = '<p style="font-size:.82rem;color:var(--gray)">No corrections logged this month.</p>';
  } else {
    summaryDiv.innerHTML =
      '<div style="font-size:.72rem;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.5rem">This Month — By Attendant</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:.5rem">' +
      sorted.map(([name, count]) => {
        const color = count >= EVV_ATTENDANT_LIMIT ? 'var(--red)' : count >= 2 ? '#F97316' : 'var(--green)';
        const flag  = count >= EVV_ATTENDANT_LIMIT ? ' ⚠️ RED FLAG' : count >= 2 ? ' 🟡 Watch' : '';
        return `<div style="padding:.5rem .85rem;border-radius:8px;background:var(--bg);border-left:4px solid ${color}">
          <div style="font-weight:700;font-size:.82rem">${name}</div>
          <div style="font-size:.77rem;color:${color}">${count} correction${count!==1?'s':''}${flag}</div>
        </div>`;
      }).join('') + '</div>';
  }
}

/* the only things the panels' handlers need */
window.SCX = {loadOffers, renderHirePipeline, renderBGRTab, renderPeopleChecks, renderReferenceActivity, bgrOnOpen, bgrRenderSub, acFilter, addStaffHandoffItem, addStaffUser, attTypeUi, batchOIGCheck, bulkMarkCheck, calNext, calPrev, closeModal, confirmCSVImport, confirmNotHire, confirmSendInvite, copyBLToClipboard, deleteOrientConfirm, downloadCSVTemplate, exportComplianceCSV, gcalSyncAll, generateOrientSessions, gotoTab, handleCSVFile, hbCreateWriteup, hbTplChanged, logAttEvent, obFilter, oigCheckFromCGModal, oigCheckFromOBModal, openCGModal, openImportModal, openNewWriteup, openOrientModal, openOrientModalWithScope, postStaffHandoff, previewCSV, renderAC, renderAttendance, renderOB, renderOrientations, renderTR, renderWriteups, saveAttSettings, saveCG, saveCancelDetails, saveEVVCorrection, saveManualRef, saveOB, saveOrient, saveOrientSettings, saveSettings, scanClockins, setPastView, submitAdminPwd, syncFromTrainingHub, toggleACSelectAll, toggleEVVReasonOther, toggleGuide, toggleOfficeOrient, toggleRecurEnd, toggleRecurFields, trFilter, updateMrefPreview, updateOrientGenPreview};
/* The offer cards are built with inline onclick handlers, so these have to be
   reachable as globals, not just through SCX. */
window.loadOffers = loadOffers;
window.refReport = refReport;
window.offerStartLink = offerStartLink;
window.offerToCandidate = offerToCandidate;
window.askReferences = askReferences;
/* window.autoAskReferences intentionally NOT exposed: nothing in the UI calls it
   (its only in-engine caller is the explicit reference-slot rewrite action), and
   a global handle to an outreach-triggering function is exactly the kind of
   "reading/console access can cause an action" surface the boot-read-only gate
   closes. The explicit human path is window.askReferences (above). */
window.renderHirePipeline = renderHirePipeline;
/* Explicit, human-clicked (or intentional server) sync of self-serve orientation
   bookings — the ONLY path that stamps merged:true + saves. Exposed for its Sync
   button; tab navigation calls the read-only orientLoadPending() instead. */
window.orientSyncBookings = mergePendingBookings;
/* window.intakeReconcile / refFixReconcile / refReconcile / markScreeningCleared
   intentionally NOT exposed: their only caller was the standalone-boot chain the
   boot-read-only gate removed, so they now have zero UI/external callers. A global
   handle to a mutating reconciler is an accidental operational entry point (console
   / future assistant), and server-side authorization — not this — is the real
   boundary. The functions remain defined for an explicit/server caller if reintroduced. */
window.offerCopyLink = offerCopyLink;
window.markOfferEntered = markOfferEntered;
window.markOfferViventium = markOfferViventium;
window.markOfferStep1 = markOfferStep1;
window.sendOfferWelcome = sendOfferWelcome;
window.confirmOfferLevel = confirmOfferLevel;
window.renderPastOffers = renderPastOffers;
/* Every function the engine's own rendered HTML calls through an inline
   onclick. The engine is an IIFE, so anything not exported here throws
   ReferenceError the moment somebody clicks — which is exactly what
   happened to the Background & References "open" button and 53 siblings.
   This list is the complete audit of onclick="fn(" occurrences in this
   file; keep it complete when adding a new inline handler. */
for (const [n, f] of Object.entries({
  acceptEVVSubmission, acceptMeeting, addManualBooking, calClickDay,
  ciMarkFav, ciPrefill, ciPushCoach, ciSkip, completeClientQueueItem,
  copyWriteup, creqDone, declineMeeting, deleteClientQueueItem,
  deleteOrient, dismissEVVSubmission, dismissReply, dnrMarkAxis,
  doneMeeting, draftWriteup, evvRemove, generateOrientSessions,
  issueWriteup, markAttendance, oigResultConfirm, oigResultDismiss,
  oigResultFlagged, oigResultNotMatch, openAddClientManual,
  openBookingLinkModal, openCGModal, openCancelModal, openEod,
  openInviteModal, openManualRef, openNotHireModal, openOBModal,
  openOrientModal, openOrientModalOnDate, openProfile, openWriteup,
  orientDayToggle, prefillTardy, printWriteup, promoteToCaregiver,
  pushAxNote, reactivateOB, removeStaffUser, resolveReturnedItem,
  sendForApproval, sendReply, toggleCQCard, toggleStaffNotif,
  toggleThread, vivCopy,
})) window[n] = f;
window.intakeImport = intakeImport;
window.retryHydrate = retryHydrate;
/* Background & References card / timeline / modal actions reached from onclick.
   The engine runs in a closure, so every onclick target must be attached here. */
window.bgrOpenAttemptModal = bgrOpenAttemptModal;
window.bgrPickAttemptMethod = bgrPickAttemptMethod;
window.bgrCloseAttemptModal = bgrCloseAttemptModal;
window.bgrSaveAttempt = bgrSaveAttempt;
window.bgrAttPickRef = bgrAttPickRef;
window.bgrLogForPerson = bgrLogForPerson;
window.bgrRunOIG = bgrRunOIG;
window.bgrRecordForPerson = bgrRecordForPerson;
window.bgrCloseRefPicker = bgrCloseRefPicker;
window.bgrRefPickChoose = bgrRefPickChoose;
window.bgrSyncRefAnswers = bgrSyncRefAnswers;
window.bgrOpenDrawer = bgrOpenDrawer;
window.bgrCloseDrawer = bgrCloseDrawer;
window.bgrRecordCheck = bgrRecordCheck;
window.bgrCloseCheckModal = bgrCloseCheckModal;
window.bgrSaveCheck = bgrSaveCheck;
window.bgrViewProof = bgrViewProof;
window.obRefQA = obRefQA; window.obDateCheckText = obDateCheckText; window.obRefHowCollected = obRefHowCollected;
window.bgrPrintAudit = bgrPrintAudit;
/* References R1–R5 (2026-10-01): inline handlers and the Hub's top search. */
window.bgrMakeRefPdfs = bgrMakeRefPdfs;
window.mrefTypeUI = mrefTypeUI;
window.obRefSearch = obRefSearch;
/* Office send (Desktop 377): the cell's Email / Text buttons and the send modal. */
window.obRefEmailOpen = obRefEmailOpen;
window.obRefTextOpen = obRefTextOpen;
window.obRefSendClose = obRefSendClose;
window.obRefSendGo = obRefSendGo;
/* Remote orientation, slice 1a (2026-10-01): Step 2 tracking + welcome calls. */
Object.assign(window, { step2Mark, wcInvite, wcLoad, wcTick, wcNotes, wcAct, wcOrientLink, cgpOpen });
window.dispatchEvent(new Event('scx-ready'));
})();
