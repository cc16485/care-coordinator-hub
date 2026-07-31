/* Caregiver lifecycle engine, moved from the Staffing Coordinator Hub
   on 2026-07-31. Wrapped so nothing here can reach the hub's own globals:
   switchTab, closeModal, addDays and renderCheckins exist in both and mean
   different things. Its data layer travels with it unchanged, so these tabs
   read and write exactly what they did before the move. */
(function(){

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
// Fixed slug this hub checks against a signed-in user's app_metadata.hub_access.
// Must exactly match this hub's row in Team Hub's hub_portals list ("staffing").
const HUB_SLUG = 'staffing';
// Real access control lives in Supabase Auth's app_metadata.hub_access. A
// missing hub_access array means the account predates this system — treat
// that as grandfathered in rather than denied, so this never locks out the
// existing team on deploy. Restriction only starts once an owner explicitly
// sets someone's portal access from Team Hub's Manage Team Access panel.
function hasHubAccess(user){
  const access = user && user.app_metadata && user.app_metadata.hub_access;
  if(access === undefined || access === null) return true;
  return Array.isArray(access) && access.includes(HUB_SLUG);
}
async function showApp(){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app').style.display='block';
  document.getElementById('hdr-date').textContent = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  await loadFromSupabase();
  migrateOldRecipients();
  renderAll();
  loadClientQueue();
  mergePendingBookings();
  loadOffers(); // fills the New Offers tab + red badge count
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
    errEl.textContent = "You don't have access to the Staffing Coordinator's Hub. Contact your owner to be granted access.";
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

// Auto-restore session on page load
(async ()=>{
  const { data: { session } } = await sb.auth.getSession();
  if(session){
    if(!hasHubAccess(session.user)){
      await sb.auth.signOut();
      const errEl = document.getElementById('err');
      errEl.textContent = "You don't have access to the Staffing Coordinator's Hub. Contact your owner to be granted access.";
      errEl.style.display = 'block';
      return;
    }
    await showApp();
    isOwner().then(ok => { const b = document.getElementById('settingsBtn'); if(b && !ok) b.style.display = 'none'; });
  }
})();

// ── OIG Exclusion Check ───────────────────────────────────────────────
async function runOIGCheck(first, last){
  const url = `https://exclusions.oig.hhs.gov/api/search.json?firstname=${encodeURIComponent(first)}&lastname=${encodeURIComponent(last)}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`OIG API returned ${res.status}`);
  const data = await res.json();
  const matches = data.results || [];
  return {
    clear: matches.length === 0,
    date: new Date().toISOString().slice(0,10),
    matches
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

  // Try Zapier webhook if configured
  const webhook = appSettings.ac_new_client_webhook;
  let sent = false;
  if(webhook && !webhook.includes('REPLACE')){
    try {
      await fetch(webhook, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      sent = true;
    } catch(e){ console.warn('New client webhook failed', e); }
  }

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
    alert(`📋 New Client Alert\n\nClient: ${name}\nStart: ${dateLabel}\nPayer: ${payer||'—'}\nHrs/Week: ${authHrs||'—'}\n${notes?'Notes: '+notes+'\n':''}\nAdd the Zapier webhook in Settings → AxisCare to send this automatically via email.`);
  }
}

// ── AxisCare Orientation Shift ────────────────────────────────────────
async function axisCreateOrientShift(session){
  const webhook = appSettings.ac_orient_webhook;
  if(!webhook || webhook.includes('REPLACE')) return;
  const [h, m] = (session.time||'10:00').split(':').map(Number);
  const start = new Date(`${session.date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
  const end = new Date(start.getTime() + getOrientDuration()*60*60*1000);
  const fmt = d => d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true});
  const payload = {
    session_id:       session.id,
    date:             session.date,
    time:             session.time,
    end_time:         `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`,
    time_readable:    fmt(start),
    end_time_readable:fmt(end),
    duration_hours:   getOrientDuration(),
    facilitator:      session.facilitator||'',
    facilitator_role: session.facilitator_role||'',
    location:         session.is_remote==='yes' ? (session.video_link||'Remote') : '1331 N Stewart Ave Ste B, Springfield MO 65802',
    is_remote:        session.is_remote==='yes',
    video_link:       session.video_link||'',
    capacity:         session.capacity||6,
    notes:            session.notes||'',
    shift_type:       'Orientation',
    agency:           'Caring Companions In-Home Senior Care',
  };
  try {
    await fetch(webhook, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
  } catch(e){ console.warn('AxisCare orient shift webhook failed', e); }
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
  if(name==='orientations'){ renderOrientations(); initOrientSettings(); mergePendingBookings(); }
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
  if(!_homeKicked && (appSettings.training_hub_key||'').trim()){
    _homeKicked=true;
    try{ loadOpenShifts(); }catch(e){}
    try{ loadCheckinPairs(); }catch(e){}
    try{ loadOffers(); }catch(e){}
    try{ loadRepliesWaiting(); }catch(e){}
  }
  const today10=new Date().toISOString().slice(0,10);
  let blocked=0; try{ blocked=(caregivers||[]).filter(c=>{try{return !trainStatus(c).preContactDone;}catch(e){return false;}}).length; }catch(e){}
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
  ['live_in','Live-In'],['male_caregiver','Male Caregiver'],['parkinsons',"Parkinson's Disease Experience"],
  ['payor_medicaid','Payor - Medicaid'],['payor_private_pay','Payor - Private Pay'],
  ['personal_care','Personal Care'],['smoking','Smoking'],
  ['spanish_speaking','Spanish Speaking'],['transportation','Transportation'],
];
let OFFERS=[];
async function loadOffers(btn){
  const box=document.getElementById('offersList');
  const key=(appSettings.training_hub_key||'').trim();
  if(!key){ box.innerHTML='<div style="color:#b45309;font-size:.85rem">Paste the Training Hub read key into ⚙️ Settings → Training Hub first.</div>'; return; }
  if(btn){ btn.disabled=true; btn.textContent='↻ Loading…'; }
  try{
    const r=await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/rest/v1/rpc/hub_job_offers',{
      method:'POST',headers:{'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
      body:JSON.stringify({p_key:key})});
    const data=await r.json();
    if(!Array.isArray(data)) throw new Error((data&&data.error)||'unexpected response');
    OFFERS=data;
    renderOffers();
    updateOffersBadge();
  }catch(e){ box.innerHTML='<div style="color:#b91c1c;font-size:.85rem">Could not load offers: '+(e&&e.message?e.message:'error')+'</div>'; }
  finally{ if(btn){ btn.disabled=false; btn.textContent='↻ Refresh'; } }
}
function updateOffersBadge(){
  const n=OFFERS.filter(o=>!o.attributes_entered_at).length;
  const b=document.getElementById('offersBadge');
  if(b){ b.style.display=n?'inline-block':'none'; b.textContent=n; }
  updateGroupBadges();
}
function renderOffers(){
  const esc=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const box=document.getElementById('offersList');
  if(!OFFERS.length){ box.innerHTML='<div style="color:#A89C8B;font-size:.85rem">No offers yet — they appear here the moment a coordinator submits the Offer a Job form on the Team Hub.</div>'; return; }
  box.innerHTML=OFFERS.map((o,i)=>{
    const done=!!o.attributes_entered_at;
    const attrs=o.attributes||{};
    const attrHtml=OFFER_ATTRS.map(a=>{
      const v=attrs[a[0]];
      const no=v===false;
      return '<div style="display:flex;justify-content:space-between;gap:.6rem;padding:.18rem 0;border-bottom:1px dashed #FAF9F6;font-size:.8rem">'+
        '<span>'+esc(a[1])+'</span><b style="color:'+(no?'#DC2626':'#15803D')+'">'+(no?'NO':'Yes')+'</b></div>';
    }).join('');
    const lvl=o.level_confirmed||'';
    return '<div style="background:#fff;border:1px solid '+(done?'#e4e1d8':'#f59e0b')+';border-radius:12px;padding:1rem 1.2rem">'+
      '<div style="display:flex;align-items:center;gap:.7rem;flex-wrap:wrap">'+
      '<b style="font-size:1rem;color:#0D365F">'+esc(o.name)+'</b>'+
      '<span style="font-size:.78rem;color:#6E6559">'+esc(o.position||'Caregiver')+(o.pay_rate?' · $'+Number(o.pay_rate).toFixed(2)+'/hr':'')+' · interviewed '+esc(o.interview_date||'')+(o.offered_by?' by '+esc(o.offered_by):'')+'</span>'+
      '<span style="flex:1"></span>'+
      (o.axiscare_applicant_id
        ? '<span style="font-size:.72rem;font-weight:700;color:#15803D;background:#DCFCE7;border-radius:999px;padding:.15rem .6rem">In AxisCare ✓</span>'
        : '<span title="'+esc(o.axiscare_push_error||'')+'" style="font-size:.72rem;font-weight:700;color:#B45309;background:#FEF3C7;border-radius:999px;padding:.15rem .6rem">Add to AxisCare by hand</span>')+
      (done
        ? '<span style="font-size:.72rem;font-weight:700;color:#15803D;background:#DCFCE7;border-radius:999px;padding:.15rem .6rem">Attributes entered ✓'+(o.attributes_entered_by?' ('+esc(o.attributes_entered_by)+')':'')+'</span>'
        : '<button class="fb" onclick="markOfferEntered(\''+esc(o.id)+'\',this)">☑ Entered in AxisCare</button>')+
      '</div>'+
      '<div style="display:flex;gap:1.2rem;flex-wrap:wrap;margin-top:.6rem;font-size:.82rem;color:#3A342C">'+
      (o.phone?'<span>📱 '+esc(o.phone)+'</span>':'')+(o.email?'<span>✉️ '+esc(o.email)+'</span>':'')+
      (o.availability?'<span>🗓 '+esc(o.availability)+'</span>':'')+
      '</div>'+
      '<div style="margin-top:.55rem;font-size:.82rem;color:#3A342C;line-height:1.5">'+
      (o.experience?'<div><b>Experience:</b> '+esc(o.experience)+'</div>':'')+
      (o.personality?'<div><b>Personality/fit:</b> '+esc(o.personality)+'</div>':'')+
      (o.notes?'<div><b>Notes:</b> '+esc(o.notes)+'</div>':'')+
      '</div>'+
      '<div style="display:flex;gap:.6rem;align-items:center;margin-top:.7rem;flex-wrap:wrap;font-size:.82rem;background:#FAF9F6;border:1px solid #e4e1d8;border-radius:8px;padding:.5rem .7rem">'+
      '<b style="color:#0D365F">Viventium:</b>'+
      '<span style="background:#EDE9FE;color:#5B21B6;border-radius:999px;padding:.12rem .6rem;font-size:.72rem;font-weight:700">plan: '+esc(o.onboarding_plan||'Default (Default)')+'</span>'+
      (o.viventium_entered_at
        ? '<span style="color:#15803D;font-weight:700">entered ✓</span>'
        : '<button class="fb" onclick="markOfferViventium(\''+esc(o.id)+'\',this)">☑ Entered in Viventium</button>')+
      (o.welcome_sent_at
        ? '<span style="color:#15803D;font-size:.75rem">💬 welcome text + email sent ✓</span>'
        : (o.viventium_entered_at
            ? '<button class="fb" style="font-size:.72rem" onclick="sendOfferWelcome(\''+esc(o.id)+'\',this)">💬 Send welcome text + email</button><span style="color:#b45309;font-size:.72rem">not sent yet</span>'
            : '<span style="color:#A89C8B;font-size:.72rem">💬 welcome text + email sends when you mark this</span>'))+
      '<span style="color:#E8E2D8">→</span>'+
      (o.step1_done_at
        ? '<span style="color:#15803D;font-weight:700">Step 1 paperwork done ✓</span>'
        : (o.viventium_entered_at
            ? '<button class="fb" onclick="markOfferStep1(\''+esc(o.id)+'\',this)">☑ Step 1 done (got the notification)</button>'+
              '<span style="color:#A89C8B">auto-reminders to them every 3 days'+
              (o.step1_reminder_count?(' · '+o.step1_reminder_count+' sent'):'')+'</span>'
            : '<span style="color:#A89C8B">waiting on Viventium entry</span>'))+
      '</div>'+
      '<div style="display:flex;gap:1rem;align-items:center;margin-top:.7rem;flex-wrap:wrap;font-size:.82rem">'+
      '<span><b>Level of care:</b> suggested '+(o.level_suggested||'—')+' at interview</span>'+
      '<label style="display:flex;align-items:center;gap:.4rem">confirmed:'+
      '<select onchange="confirmOfferLevel(\''+esc(o.id)+'\',this)" style="font-family:inherit;font-size:.82rem;padding:.2rem .4rem;border:1px solid #e4e1d8;border-radius:6px">'+
      '<option value=""'+(lvl===''?' selected':'')+'>not yet</option>'+
      [1,2,3].map(n=>'<option value="'+n+'"'+(lvl===n?' selected':'')+'>Level '+n+'</option>').join('')+
      '</select></label>'+
      '<span style="color:#A89C8B">(confirm from verified experience + references)</span>'+
      '</div>'+
      '<details style="margin-top:.7rem"><summary style="cursor:pointer;font-size:.82rem;font-weight:700;color:#5B21B6">📝 Viventium entry sheet — every field in screen order, copy one at a time</summary>'+
      '<div style="max-width:520px;margin-top:.4rem;background:#FBFAFF;border:1px solid #EDE9FE;border-radius:8px;padding:.6rem .8rem">'+vivSheet(o)+'</div></details>'+
      '<details style="margin-top:.5rem"><summary style="cursor:pointer;font-size:.82rem;font-weight:700;color:#0D365F">AxisCare attribute answers — same order as the Attributes screen</summary>'+
      '<div style="max-width:420px;margin-top:.4rem">'+attrHtml+'</div></details>'+
      '</div>';
  }).join('');
}
async function offerUpdate(id, payload){
  const key=(appSettings.training_hub_key||'').trim();
  const r=await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/rest/v1/rpc/hub_offer_update',{
    method:'POST',headers:{'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
    body:JSON.stringify(Object.assign({p_key:key,p_id:id},payload))});
  const data=await r.json();
  if(!data||data.error||data.ok===false) throw new Error((data&&data.error)||'update failed');
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
  const key=(appSettings.training_hub_key||'').trim();
  if(!key){ if(!quiet) alert('Paste the Training Hub read key into ⚙️ Settings first.'); return {ok:false,error:'hub key missing'}; }
  if(btn){btn.disabled=true;btn.textContent='Sending…';}
  try{
    const r=await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/job-offer',{
      method:'POST',headers:{'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
      body:JSON.stringify({key, action:'send_welcome', offer_id:id})});
    const d=await r.json();
    if(d.error) throw new Error(d.error);
    if(!quiet){
      alert(d.already_sent?'Already sent earlier ✓':'Welcome '+[d.sms?'text':null,d.email?'email':null].filter(Boolean).join(' + ')+' sent ✓');
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
function chkStatus(lastStr, interval, warnDays){
  if(!lastStr) return {status:'Pending',nextDue:null,days:null};
  const last=pd(lastStr), next=addDays(last,interval), left=daysLeft(next);
  return { status: left<0?'Overdue':left<=warnDays?'Due Soon':'Current', nextDue:next, days:left };
}
function badge(status,txt){
  const cls={Current:'b-green','Due Soon':'b-amber',Overdue:'b-red',Pending:'b-gray',
    CLEAR:'b-green',FLAGGED:'b-red',Clear:'b-green','Issues Found':'b-red',
    'N/A':'b-gray',Required:'b-amber',Submitted:'b-blue',Complete:'b-green'}[status]||'b-gray';
  return `<span class="badge ${cls}">${txt||status}</span>`;
}
function proofLink(url){ return url?`<a class="proof-link" href="${url}" target="_blank">📄 proof</a>`:`<span style="color:#E8E2D8;font-size:.67rem">no proof</span>`; }

// ── Zapier webhook helper — reads URLs from Settings (configurable without editing code) ─────────
// Returns a Promise so callers can optionally await it.
function zapFire(settingsKey, payload, json=false){
  const url = (appSettings[settingsKey]||'').trim();
  if(!url || url.includes('REPLACE') || !url.startsWith('http')) return Promise.resolve();
  const opts = {method:'POST', body: JSON.stringify(payload)};
  if(json) opts.headers = {'Content-Type':'application/json'};
  return fetch(url, opts).catch(e=>console.warn(`Zapier ${settingsKey} skipped/error:`, e));
}
// Fires when a caregiver is cleared to schedule (orientation+ALZ done) or candidate is Ready for Orientation
// Zap adds a note to their AxisCare profile so care coordinators can see status without hub access
const ZAPIER_AC_STATUS_WEBHOOK = "https://hooks.zapier.com/hooks/catch/28062149/42aqc9c/";

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
  DISC_ACTIONS.push(a);
  await attPersist('discipline_actions',a);
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
  const a=DISC_ACTIONS.find(x=>x.id===_writeupId); if(!a) return;
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
  const key=(appSettings.training_hub_key||'').trim();
  if(!key){ a.ax_note_error='Training Hub key missing in Settings'; await attPersist('discipline_actions',a); renderAttendance(); return; }
  const noteText='CORRECTIVE ACTION ISSUED — '+a.level+' ('+String(a.issued_at||'').slice(0,10)+')\n'
    +'Category: Attendance & Dependability (Handbook 2U/2V)\n'
    +'Reason: '+a.reason+'\n'
    +'Approved by: '+(a.approved_by||'Samantha Troutman')+' · Issued by: '+(a.created_by||'staffing')+'\n'
    +'Signed original filed in Viventium.';
  try{
    const r=await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/axiscare-convert-lead',{
      method:'POST',headers:{'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
      body:JSON.stringify({key, action:'caregiver_note', caregiver_name:a.caregiver, note:noteText})});
    const d=await r.json();
    if(d.error) throw new Error(d.error);
    a.ax_noted=true; a.ax_note_error='';
  }catch(e){ a.ax_noted=false; a.ax_note_error=(e&&e.message)||'failed'; }
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
  const a=DISC_ACTIONS.find(x=>x.id===_writeupId); if(!a) return;
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
  const key=(appSettings.training_hub_key||'').trim();
  if(!key){ box.innerHTML='<div style="color:#b45309;font-size:.8rem">Paste the Training Hub read key into ⚙️ Settings first.</div>'; return; }
  if(btn){btn.disabled=true;btn.textContent='Scanning…';}
  try{
    const r=await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/axiscare-open-shifts',{
      method:'POST',headers:{'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
      body:JSON.stringify({key,mode:'clockins',days:7,grace:attCfg().tardy_grace})});
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
  const key=(appSettings.training_hub_key||'').trim();
  if(!key){ box.innerHTML='<div style="color:#b45309;font-size:.85rem">Paste the Training Hub read key into ⚙️ Settings → Training Hub to turn this on.</div>'; return; }
  if(btn&&btn.tagName==='BUTTON'){ btn.disabled=true; btn.textContent='↻ Loading…'; }
  try{
    const r=await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/ghl-replies',{
      method:'POST',headers:{'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
      body:JSON.stringify({key})});
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
      method:'POST',headers:{'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
      body:JSON.stringify({key:appSettings.training_hub_key,conversation_id:el.dataset.conv})});
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
      method:'POST',headers:{'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
      body:JSON.stringify({key:appSettings.training_hub_key,contact_id:el.dataset.contact,message:msg})});
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
      method:'POST',headers:{'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
      body:JSON.stringify({key:appSettings.training_hub_key,action:'dismiss',conversation_id:el.dataset.conv})});
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
  const key=(appSettings.training_hub_key||'').trim();
  if(!key){ box.innerHTML='<div style="color:#b45309;font-size:.85rem">Paste the Training Hub read key into ⚙️ Settings → Training Hub to turn the board on.</div>'; return; }
  if(btn){ btn.disabled=true; btn.textContent='↻ Loading…'; }
  try{
    const r=await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/axiscare-open-shifts',{
      method:'POST',headers:{'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
      body:JSON.stringify({key, days:14})});
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
  const key=(appSettings.training_hub_key||'').trim();
  if(!key){ if(box) box.innerHTML='<div style="color:#b45309;font-size:.85rem">Paste the Training Hub read key into ⚙️ Settings → Training Hub to turn this board on.</div>'; return; }
  if(btn){ btn.disabled=true; btn.textContent='↻ Loading…'; }
  try{
    const r=await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/axiscare-open-shifts',{
      method:'POST',headers:{'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
      body:JSON.stringify({key, mode:'pairs', days:60})});
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
  if(!CI_PAIRS.length){ box.innerHTML='<div style="color:#A89C8B;font-size:.85rem">No completed visits found in the last 60 days.</div>'; return; }
  const fmt=d=>new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  const rank=i=>i.due==='concern'?0:i.due==='first'&&i.newPair?1:i.due==='first'?2:i.due==='fit'?3:4;
  const rows=CI_PAIRS.map(p=>({p,i:ciPairInfo(p)}))
    .sort((a,b)=>rank(a.i)-rank(b.i)||String(b.p.last_date).localeCompare(String(a.p.last_date)));
  const RATE={love:'⭐',good:'👍',concern:'🚩'};
  box.innerHTML=rows.map(({p,i})=>{
    const border=i.due==='concern'?'#DC2626':i.due==='first'?(i.newPair?'#DC2626':'#B45309'):i.due==='fit'?'#B45309':'#16a34a';
    const tag=i.due==='concern'?'<span style="font-size:.7rem;font-weight:800;color:#DC2626">🚩 concerns on '+fmt(String(i.last.at).slice(0,10))+' — check it got fixed</span>'
      :i.due==='first'&&i.newPair?'<span style="font-size:.7rem;font-weight:800;color:#DC2626">🆕 first shift '+fmt(p.first_date)+' — call them</span>'
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
  const key=(appSettings.training_hub_key||'').trim();
  if(!key){ alert('Paste the Training Hub read key into ⚙️ Settings first.'); return; }
  const noteText='CLIENT PREFERENCE — from a check-in call ('+String(e.at).slice(0,10)+')\n'
    +'Client: '+e.client+(e.spoke_with?' (spoke with '+e.spoke_with+')':'')+'\n'
    +'“'+e.coaching+'”\n'
    +'Passed along as friendly coaching so the match stays strong. — '+(e.by||'staffing');
  try{
    const r=await fetch('https://rdqujxiycycwhskyvrwa.supabase.co/functions/v1/axiscare-convert-lead',{
      method:'POST',headers:{'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},
      body:JSON.stringify({key, action:'caregiver_note', caregiver_name:e.caregiver, note:noteText})});
    const d=await r.json();
    if(d.error) throw new Error(d.error);
    e.coach_ax_noted=true; e.coach_ax_error='';
  }catch(err){ e.coach_ax_noted=false; e.coach_ax_error=(err&&err.message)||'failed'; }
  try{ await sb.rpc('upsert_app_data_item',{ target_key:'client_checkins', item:e }); }catch(err){}
  renderCheckins();
  if(e.coach_ax_noted) alert('✅ Noted on '+e.caregiver+'\'s AxisCare record.\n\nRemember to also tell them directly — a quick friendly text or call lands better than a note they might not see.');
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

async function syncToSupabase(key, data){
  try {
    // Guard: NEVER write while logged out. A fresh browser starts with empty
    // local arrays, and an unauthenticated write here can overwrite real data
    // in Supabase (this happened — see clearSeedPeople).
    const { data:{ session } } = await sb.auth.getSession();
    if(!session){ console.warn('Skipped Supabase sync for', key, '— not signed in'); return; }
    const { error } = await sb.from('app_data').upsert({ key, data, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if(error){ console.warn('Supabase sync failed for', key, error); setSyncStatus('offline'); }
    else setSyncStatus('ok');
  } catch(e){ console.warn('Supabase sync:', e); setSyncStatus('offline'); }
}

async function loadFromSupabase(){
  setSyncStatus('syncing');
  try {
    try{ const {data:{session}}=await sb.auth.getSession(); window._myEmail=((session&&session.user&&session.user.email)||'').toLowerCase(); }catch(e){}
    const { data, error } = await sb.from('app_data').select('*');
    if(error || !data) { setSyncStatus('offline'); return; }
    data.forEach(row => {
      if(!row.data) return;
      if(row.key==='candidates')     { candidates=row.data; obId=Math.max(obId,...candidates.map(c=>c.id+1),10); }
      if(row.key==='caregivers')     { caregivers=row.data; cgId=Math.max(cgId,...caregivers.map(c=>c.id+1),10); }
      if(row.key==='eod_reports')    { eodReports=row.data||[]; }
      if(row.key==='orient_sessions'){ orientSessions=row.data; orientId=Math.max(orientId,...orientSessions.map(s=>s.id+1),1); }
      if(row.key==='settings')       { appSettings=row.data; localStorage.setItem('cc_settings',JSON.stringify(row.data)); }
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
  } catch(e){ console.warn('Supabase load failed, using localStorage:', e); setSyncStatus('offline'); }
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
let candidates   = JSON.parse(localStorage.getItem('cc_candidates'))   || SEED_CANDIDATES;
let caregivers   = JSON.parse(localStorage.getItem('cc_caregivers'))   || SEED_CAREGIVERS;
let obId  = parseInt(localStorage.getItem('cc_ob_id')  || '10');
let cgId  = parseInt(localStorage.getItem('cc_cg_id')  || '10');
clearSeedPeople();

function saveCandidates(){
  localStorage.setItem('cc_candidates', JSON.stringify(candidates));
  localStorage.setItem('cc_ob_id', String(obId));
  syncToSupabase('candidates', candidates);
}
function saveCaregivers(){
  localStorage.setItem('cc_caregivers', JSON.stringify(caregivers));
  localStorage.setItem('cc_cg_id', String(cgId));
  syncToSupabase('caregivers', caregivers);
}

// ── TRAINING HUB LIVE SYNC ────────────────────────────────────────────
// Pulls authoritative training data from training.mo-care.com (the system of
// record for training) and fills this tab's fields: orientation + ALZ
// completion dates, hire date and first-client-contact date (fill-if-empty).
// Matches caregivers by AxisCare ID when known, otherwise by name.
const TRAINING_HUB_API='https://rdqujxiycycwhskyvrwa.supabase.co/rest/v1/rpc/hub_training_status';
const TRAINING_HUB_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkcXVqeGl5Y3ljd2hza3l2cndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMTg1NDgsImV4cCI6MjA5ODc5NDU0OH0.SFjAfj--b-tWrk8bMVLeM-tGwD8VBaPsEBtUAp5tPew';
async function syncFromTrainingHub(btn){
  const key=(appSettings.training_hub_key||'').trim();
  if(!key){ alert('First paste the Training Hub read key into ⚙️ Settings → Training Hub.'); return; }
  const orig=btn?btn.textContent:'';
  if(btn){ btn.textContent='☁ Syncing…'; btn.disabled=true; }
  try{
    const r=await fetch(TRAINING_HUB_API,{method:'POST',headers:{'apikey':TRAINING_HUB_ANON,'Authorization':'Bearer '+TRAINING_HUB_ANON,'Content-Type':'application/json'},body:JSON.stringify({p_key:key})});
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
function trainStatus(c){
  const hire = pd(c.hire_date);
  const preContactDone = !!(c.orient_date && c.alz_date);
  const thirtyDeadline = hire ? addDays(hire,30) : null;
  const thirtyPassed = thirtyDeadline && TODAY > thirtyDeadline;
  const ojtDone = !!(c.ojt_date && c.ojt_signed==='yes' && c.ojt_online);
  const thirtyDone = preContactDone && ojtDone;
  // Check OJT was within 30 days
  let ojtOnTime = false;
  if(ojtDone && hire && thirtyDeadline){
    const ojtD = pd(c.ojt_date), ojtOD = pd(c.ojt_online);
    ojtOnTime = ojtD<=thirtyDeadline && ojtOD<=thirtyDeadline;
  }
  // Annual: exempt if within first 12 months of hire
  const msPerYear = 365*86400000;
  const isFirstYear = hire && (TODAY - hire) < msPerYear;
  let annualStatus = 'Exempt (Year 1)';
  let annualNextDue = null;
  if(!isFirstYear){
    if(!c.annual_date){ annualStatus='Overdue'; }
    else {
      const lastA = pd(c.annual_date);
      annualNextDue = addDays(lastA, 365);
      const left = daysLeft(annualNextDue);
      annualStatus = left<0?'Overdue':left<=30?'Due Soon':'Current';
    }
  }
  // Overall
  let overall;
  if(!preContactDone) overall='Client Contact Blocked';
  else if(!thirtyDone && thirtyPassed) overall='Training Overdue';
  else if(!thirtyDone) overall='OJT Pending';
  else if(annualStatus==='Overdue') overall='Annual Overdue';
  else if(annualStatus==='Due Soon') overall='Annual Due Soon';
  else overall='Current';

  return {preContactDone,thirtyDeadline,thirtyDone,thirtyPassed,ojtDone,ojtOnTime,
          isFirstYear,annualStatus,annualNextDue,overall};
}

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
        const refs=[c.r1s,c.r2s,c.r3s,c.r4s]; const pos=refs.filter(r=>r==='Positive').length;
        if(pos<2) blocking.push(`Refs (${pos}/2)`);
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

function obDeriveStatus(c){
  const refs=[c.r1s,c.r2s,c.r3s,c.r4s];
  const pos=refs.filter(r=>r==='Positive').length;
  const neg=refs.some(r=>r==='Negative'||r==='Conditional');
  const oigOk=c.oig==='CLEAR', edlOk=c.edl==='Clear', bgOk=c.fcsr==='Clear';
  const fpOk=c.oos!=='yes'||(c.fp==='Clear');
  if(c.oig==='FLAGGED'||c.edl==='Issues Found'||c.fcsr==='Issues Found'||c.fp==='Issues Found') return 'Needs Review';
  if(pos>=2&&oigOk&&edlOk&&bgOk&&fpOk) return 'Ready for Orientation';
  return 'Awaiting';
}
function renderOB(){
  const q=((document.querySelector('#panel-onboarding input')||{value:''}).value||globalSearch).toLowerCase();
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
    return (!q||n.includes(q))&&matchF;
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
      <td><div class="name-cell" style="cursor:pointer;color:var(--navy)" onclick="openProfile('${c.first}','${c.last}')" title="View full profile">${c.first} ${c.last} <span style="font-size:.65rem;color:var(--teal)">↗</span></div>${c.oos==='yes'?'<span class="sub" style="color:#F97316">⚠ Out-of-state</span>':''}${addedLabel?`<span class="sub" style="color:var(--gray)">Added ${addedLabel}</span>`:''}${daysPending!==null&&st==='Awaiting'?`<span class="sub" style="color:${urgencyColor};font-weight:600">${daysPending}d in pipeline</span>`:''}${staleBadge?`<div style="margin-top:2px">${staleBadge}</div>`:''}</td>
      ${[1,2,3,4].map(n=>{
        const s=c[`r${n}s`],nm=c[`r${n}n`],pf=c[`r${n}_proof`],mn=c[`r${n}_manual`];
        const manualTag=mn?`<span class="sub" style="color:var(--teal)">📞 ${mn.via} · ${fmtD(mn.date)||''}${mn.staff?' · '+mn.staff:''}</span>`:'';
        const recordBtn=s==='Pending'?`<button onclick="openManualRef(${c.id},${n})" style="margin-top:3px;background:none;border:1px solid var(--teal);color:var(--teal);border-radius:5px;font-size:.68rem;padding:.18rem .45rem;cursor:pointer;font-family:inherit">📞 Record</button>`:`<button onclick="openManualRef(${c.id},${n})" style="margin-top:3px;background:none;border:1px solid var(--border);color:var(--gray);border-radius:5px;font-size:.68rem;padding:.18rem .45rem;cursor:pointer;font-family:inherit">✏️ Edit</button>`;
        const ph=c[`r${n}_phone`],em=c[`r${n}_email`];
        const contactLine=ph||em?`<span class="sub">${ph?`<a href="tel:${ph}" style="color:var(--teal);text-decoration:none" title="Call">📞 ${ph}</a>`:''}${ph&&em?' · ':''} ${em?`<a href="mailto:${em}" style="color:var(--teal);text-decoration:none" title="Email">✉️ ${em}</a>`:''}</span>`:'';
        return `<td><span class="badge ${refBadge(s)}">${s}</span>${nm?`<span class="sub">${nm}</span>`:''}${contactLine}${manualTag}${pf?proofLink(pf,'View form'):''}${recordBtn}</td>`;
      }).join('')}
      <td><div class="chk"><span class="badge ${c.oig==='CLEAR'?'b-green':c.oig==='FLAGGED'?'b-red':'b-gray'}">${c.oig||'Pending'}</span>${c.oig_date?`<span class="chk-date">${fmtD(c.oig_date)}</span>`:''}${proofLink(c.oig_proof,'View')}</div></td>
      <td><div class="chk"><span class="badge ${c.edl==='Clear'?'b-green':c.edl==='Issues Found'?'b-red':'b-gray'}">${c.edl||'Pending'}</span>${c.edl_date?`<span class="chk-date">${fmtD(c.edl_date)}</span>`:''}${proofLink(c.edl_proof,'View')}</div></td>
      <td><div class="chk"><span class="badge ${c.fcsr==='Clear'?'b-green':c.fcsr==='Issues Found'?'b-red':'b-gray'}">${c.fcsr||'Pending'}</span>${c.fcsr_date?`<span class="chk-date">${fmtD(c.fcsr_date)}</span>`:''}${proofLink(c.fcsr_proof,'View')}</div></td>
      <td><div class="chk">${fpShow?`<span class="badge ${fpBadge}">${c.fp}</span>${c.fp_date?`<span class="chk-date">${fmtD(c.fp_date)}</span>`:''}${proofLink(c.fp_proof,'View')}`:`<span class="badge b-gray">Not required</span>`}</div></td>
      <td>
        ${c.not_hired?`
          <span class="badge b-red">🚫 Not Hired</span>
          ${c.not_hired_reason?`<span class="sub" style="color:#ef4444">${{background:'BG Issue',reference:'Ref Concern',noshow:'No-Show',withdrew:'Withdrew',other:'Other'}[c.not_hired_reason]||c.not_hired_reason}</span>`:''}
          ${c.not_hired_notes?`<span class="sub" style="color:var(--gray);font-style:italic">${c.not_hired_notes}</span>`:''}
          ${c.not_hired_date?`<span class="sub" style="color:var(--gray)">${fmtD(c.not_hired_date)}</span>`:''}
        `:`
          <span class="badge ${stBadge}">${st}</span>
          ${c.invite_sent?`<br><span class="badge" style="margin-top:4px;background:#e0faf9;color:#0e7490;font-size:.62rem">✉️ Invited ${fmtD(c.invite_sent_date)}</span>`:''}
        `}
      </td>
      <td><div class="acts">
        ${c.not_hired?`<button class="ibtn" onclick="reactivateOB(${c.id})" style="color:var(--teal);border-color:var(--teal)" title="Reactivate candidate">↩ Reactivate</button>`:`
        ${st==='Ready for Orientation'&&!c.invite_sent?`<button class="ibtn" style="background:var(--teal);color:#fff;border-color:var(--teal);font-weight:600;padding:.28rem .65rem;" onclick="openInviteModal(${c.id})">📅 Invite</button>`:''}
        ${st==='Ready for Orientation'&&c.invite_sent?`<button class="ibtn" style="color:var(--teal);border-color:var(--teal);" onclick="openInviteModal(${c.id})">📅 Re-send</button>`:''}
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
  document.getElementById('train-alert').innerHTML=blocked.length
    ?`<div class="alert-banner">⛔ ${blocked.length} caregiver(s) not cleared for client contact — pre-contact training incomplete: ${blocked.map(c=>`<b>${c.first} ${c.last}</b>`).join(', ')}</div>`:'' ;

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
    const preBadge=ts.preContactDone?'b-green':'b-red';
    const preLabel=ts.preContactDone?'✓ Cleared to Schedule':'⛔ Blocked';
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
      <td><div class="chk"><span class="badge ${preBadge}">${preLabel}</span>${orientLine}${alzLine}${alzHrsLine}</div></td>
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
function fcsrRegStatus(c){
  if(c.fcsr_reg_date) return {status:'ok', label:`Registered ${fmtD(c.fcsr_reg_date)}`};
  if(!c.hire_date) return {status:'pending', label:'Registration: not recorded'};
  const hire=pd(c.hire_date);
  const daysSince=Math.floor((TODAY-hire)/86400000);
  if(daysSince>15) return {status:'overdue', label:`Registration overdue — ${daysSince}d since hire`};
  return {status:'pending', label:`Must register within ${15-daysSince}d`};
}
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
     'ob-r1-proof','ob-r2-proof','ob-r3-proof','ob-r4-proof','ob-oig-proof','ob-edl-proof','ob-fcsr-proof','ob-fp-proof'].forEach(k=>g(k).value='');
    g('ob-oos').value='';g('ob-r1s').value='Pending';g('ob-r2s').value='Pending';g('ob-r3s').value='Pending';g('ob-r4s').value='Pending';
    g('ob-oig').value='Pending';g('ob-edl').value='Pending';g('ob-fcsr').value='Pending';g('ob-fp').value='N/A';
  }
  document.getElementById('ob-modal').classList.add('open');
}
function saveOB(){
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
    oig:g('ob-oig'),oig_date:g('ob-oig-date'),oig_proof:g('ob-oig-proof'),
    edl:g('ob-edl'),edl_date:g('ob-edl-date'),edl_proof:g('ob-edl-proof'),
    fcsr:g('ob-fcsr'),fcsr_date:g('ob-fcsr-date'),fcsr_proof:g('ob-fcsr-proof'),
    fp:g('ob-fp'),fp_date:g('ob-fp-date'),fp_proof:g('ob-fp-proof'),notes:g('ob-notes')};
  let saved;
  if(editingOB){ const i=candidates.findIndex(x=>x.id===editingOB); candidates[i]={...candidates[i],...d}; saved=candidates[i]; }
  else { const rec={id:obId++,...d,invite_sent:false,invite_sent_date:'',addedAt:new Date().toISOString()}; candidates.push(rec); saved=rec; }
  // Auto-stamp resolvedAt the first time a candidate reaches a terminal status
  const nowStatus = obDeriveStatus(saved);
  const nowReady = nowStatus==='Ready for Orientation';
  if(!wasResolved && (nowStatus==='Ready for Orientation'||nowStatus==='Needs Review')){
    const idx=candidates.findIndex(x=>x.id===saved.id);
    candidates[idx].resolvedAt = new Date().toISOString();
    candidates[idx].resolvedStatus = nowStatus;
    saved = candidates[idx];
  }
  saveCandidates(); closeModal('ob-modal'); renderOB(); renderAlerts();
  if(nowReady && !wasReady){
    pushAxisCareStatus('orientation_ready', {
      first: saved.first, last: saved.last,
      axiscare_id: saved.axiscare_id||'',
      phone: saved.phone||'',
      note: `✅ Ready for Orientation — background checks clear, 2 positive references received. Ready to be scheduled for orientation.`
    });
  }
  // Push to AxisCare + Google Drive via Zapier (URL configured in Settings)
  zapFire('zapier_cand_webhook',{
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
  });
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
  const base = window.location.href.replace(/[^/]*$/, '');
  // email + office ride along so the GoHighLevel relay can match the contact
  // that already exists from the offer stage, and tag the right office.
  return `${base}orientation-booking.html?sessions=${encoded}&first=${encodeURIComponent(c.first)}&last=${encodeURIComponent(c.last)}&phone=${encodeURIComponent(c.phone||'')}&email=${encodeURIComponent(c.email||'')}&office=${encodeURIComponent(c.office||'springfield')}&id=${encodeURIComponent(c.id)}`;
}

function buildInviteMsg(c, url){
  return `Hi ${c.first}! Congratulations — you've been cleared to join Caring Companions! 🎉 Please choose your orientation date here: ${url}\n\nQuestions? Call/text (417) 234-8494. We can't wait to meet you!`;
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
function scoreManualRef(recommend,reliability,interpersonal,honesty,concerns){
  if(!recommend) return null;
  if(recommend==='no'||concerns==='serious') return 'Negative';
  const scores={Excellent:3,Good:2,Fair:1,Poor:0};
  const avg=([reliability,interpersonal,honesty].filter(Boolean).map(r=>scores[r]||0).reduce((a,b)=>a+b,0))/3;
  if(recommend==='reservations'||concerns==='minor'||avg<1.5) return 'Conditional';
  return 'Positive';
}
function updateMrefPreview(){
  const score=scoreManualRef(
    document.getElementById('mref-recommend').value,
    document.getElementById('mref-reliability').value,
    document.getElementById('mref-interpersonal').value,
    document.getElementById('mref-honesty').value,
    document.getElementById('mref-concerns').value
  );
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
  g('mref-type').value=existing.type||'Professional';
  g('mref-rel').value=existing.relationship||'';
  g('mref-howlong').value=existing.how_long||'';
  g('mref-recommend').value=existing.recommend||'';
  g('mref-reliability').value=existing.reliability||'';
  g('mref-interpersonal').value=existing.interpersonal||'';
  g('mref-honesty').value=existing.honesty||'';
  g('mref-concerns').value=existing.concerns||'none';
  g('mref-notes').value=existing.notes||'';
  updateMrefPreview();
  document.getElementById('manual-ref-modal').classList.add('open');
}
function saveManualRef(){
  const g=k=>document.getElementById(k).value;
  if(!g('mref-recommend')){ alert('Please select a recommendation.'); return; }
  const score=scoreManualRef(g('mref-recommend'),g('mref-reliability'),g('mref-interpersonal'),g('mref-honesty'),g('mref-concerns'));
  const manual={staff:g('mref-staff'),via:g('mref-via'),date:g('mref-date'),name:g('mref-name'),type:g('mref-type'),
    relationship:g('mref-rel'),how_long:g('mref-howlong'),recommend:g('mref-recommend'),
    reliability:g('mref-reliability'),interpersonal:g('mref-interpersonal'),honesty:g('mref-honesty'),
    concerns:g('mref-concerns'),notes:g('mref-notes')};
  const i=candidates.findIndex(x=>x.id===_mrefCandId);
  candidates[i][`r${_mrefSlot}n`]=g('mref-name');
  candidates[i][`r${_mrefSlot}s`]=score;
  candidates[i][`r${_mrefSlot}_manual`]=manual;
  saveCandidates(); closeModal('manual-ref-modal'); renderOB(); renderAlerts();
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
function saveCG(){
  const g=k=>document.getElementById(k).value;
  if(!g('cg-first')||!g('cg-last')){alert('Name required.');return;}
  // Capture pre-save state to detect status changes
  const oldCG = editingCG ? caregivers.find(x=>x.id===editingCG) : null;
  const wasCleared = oldCG ? trainStatus(oldCG).preContactDone : false;
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
  else { const rec={id:cgId++,...d}; caregivers.push(rec); savedCG=rec; }
  saveCaregivers(); closeModal('cg-modal'); renderAlerts();
  if(cgReturnTab==='training') renderTR(); else renderAC();
  // Push to AxisCare if caregiver just became cleared to schedule (orientation + ALZ done)
  const nowCleared = trainStatus(savedCG).preContactDone;
  if(nowCleared && !wasCleared){
    const ts = trainStatus(savedCG);
    const hire = pd(savedCG.hire_date);
    const ojtDeadline = hire ? addDays(hire,30).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'within 30 days of hire';
    pushAxisCareStatus('cleared_to_schedule', {
      first: savedCG.first, last: savedCG.last,
      axiscare_id: savedCG.axiscare_id||'',
      hire_date: savedCG.hire_date||'',
      orient_date: savedCG.orient_date||'',
      alz_date: savedCG.alz_date||'',
      ojt_deadline: ojtDeadline,
      note: `✅ Cleared for first shift — orientation and ALZ/dementia training complete. Remaining OJT (4hr in-home + 2hr online) must be completed by ${ojtDeadline}.`
    });
  }
}

// ── AXISCARE STATUS PUSH ──────────────────────────────────────────────
function pushAxisCareStatus(type, data){
  if(ZAPIER_AC_STATUS_WEBHOOK.includes('REPLACE_WITH_YOUR_URL')){
    console.log('AxisCare status push skipped — webhook not configured:', type, data);
    return;
  }
  // No Content-Type header → browser sends simple request with no CORS preflight → Zapier receives it
  fetch(ZAPIER_AC_STATUS_WEBHOOK,{method:'POST',body:JSON.stringify({
    type,
    timestamp: new Date().toISOString(),
    ...data
  })}).catch(e=>console.warn('AxisCare status webhook error:', e));
}

function closeModal(id){ document.getElementById(id).classList.remove('open'); editingOB=null; editingCG=null; editingOrient=null; editScope='single'; pendingEditId=null; pendingDeleteId=null; pendingCancelSessId=null; pendingCancelBookingIdx=null; }
document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{ if(e.target===o) closeModal(o.id); }));
document.getElementById('or-date')?.addEventListener('change',()=>{ if(document.getElementById('or-recur').value!=='none') updateRecurPreview(); });
document.getElementById('or-recur-count')?.addEventListener('change', updateRecurPreview);
document.getElementById('or-recur-end-date')?.addEventListener('change', updateRecurPreview);

// ── ORIENTATIONS ──────────────────────────────────────────────────────
const ORIENT_ADDR = '1331 N Stewart Ave Ste B, Springfield MO 65802';
const BOOKING_PAGE = 'orientation-booking.html';

let orientSessions = JSON.parse(localStorage.getItem('cc_orient_sessions') || '[]');
let eodReports = [];
let orientId = parseInt(localStorage.getItem('cc_orient_id') || '1');
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

// Pull self-serve bookings from the orient_bookings table (written by the public
// booking page as anon) and merge them into the session records the hub manages.
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
    if(changed){ saveOrientStore(); renderOrientations(); renderAlerts(); }
  } catch(e){ console.warn('mergePendingBookings:', e); }
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
        <span style="font-size:.75rem;color:var(--gray)">${ready.length===1?'candidate is':'candidates are'} cleared and waiting to be invited</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:.5rem">
        ${ready.map(c=>{
          const resolvedAt = c.resolvedAt ? new Date(c.resolvedAt) : null;
          const days = resolvedAt ? Math.floor((now-resolvedAt)/(1000*60*60*24)) : null;
          const wait = days===null?'':days===0?'Cleared today':days===1?'1 day waiting':`${days} days waiting`;
          const invited = c.invite_sent;
          return `<div style="display:flex;align-items:center;gap:.55rem;background:#fff;border:1.5px solid ${invited?'#86efac':'var(--teal)'};border-radius:9px;padding:.4rem .8rem">
            <span style="font-size:.84rem;font-weight:600;color:var(--navy)">${c.first} ${c.last}</span>
            ${wait?`<span style="font-size:.7rem;color:var(--gray)">${wait}</span>`:''}
            ${invited?`<span style="font-size:.68rem;color:#16a34a;font-weight:600">📩 Invited</span>`:''}
            <button onclick="openInviteModal(${c.id})" style="padding:.22rem .65rem;background:${invited?'#f0fdf4':'var(--teal)'};color:${invited?'#16a34a':'#fff'};border:1.5px solid ${invited?'#86efac':'var(--teal)'};border-radius:6px;font-size:.72rem;font-weight:600;cursor:pointer;font-family:inherit">${invited?'📅 Re-send':'📅 Invite'}</button>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function renderOrientations(){
  renderOrientReadyQueue();
  renderCalendar();
  renderSessionsList();
  // Stats
  const now = new Date(); now.setHours(0,0,0,0);
  const upcoming = orientSessions.filter(s => new Date(s.date+'T00:00:00') >= now);
  const totalSpots = upcoming.reduce((a,s)=>a+parseInt(s.capacity),0);
  const booked = upcoming.reduce((a,s)=>a+(s.bookings||[]).length,0);
  const available = totalSpots - booked;
  const full = upcoming.filter(s=>(s.bookings||[]).length>=parseInt(s.capacity)).length;
  document.getElementById('or-stats').innerHTML = `
    <div class="stat"><div class="lbl">Upcoming</div><div class="val v-navy">${upcoming.length}</div></div>
    <div class="stat"><div class="lbl">Booked</div><div class="val v-amber">${booked}</div></div>
    <div class="stat"><div class="lbl">Available</div><div class="val v-green">${available}</div></div>
    <div class="stat"><div class="lbl">Full</div><div class="val v-red">${full}</div></div>`;
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
      ${!showPastSessions ? `<div class="sess-bookings">${chips}</div>` : `
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
      axisCreateOrientShift(s);
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
      axisCreateOrientShift(newSess);
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
    saveCandidates();
  }
  // Push to AxisCare via Zapier
  if(status){
    const outcomeLabel={attended:'Attended',noshow:'No-Show',rescheduled:'Rescheduled'}[status]||status;
    zapFire('zapier_attend_webhook',{
      candidate_first:b.first, candidate_last:b.last, candidate_phone:b.phone||'',
      outcome:status, outcome_label:outcomeLabel,
      session_date:s.date, session_time:s.time||'',
      timestamp:new Date().toISOString()
    }, true);
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
  // Push cancellation details to AxisCare via Zapier
  const methodLabel={call:'Called us',text:'Texted us',other:'Other/Unknown'}[method]||method;
  zapFire('zapier_attend_webhook',{
    candidate_first:b.first, candidate_last:b.last, candidate_phone:b.phone||'',
    outcome:'canceled', outcome_label:'Canceled',
    cancel_method:method, cancel_method_label:methodLabel,
    cancel_reason:reason,
    session_date:s.date, session_time:s.time||'',
    timestamp:new Date().toISOString()
  }, true);
  saveOrientStore();
  closeModal('cancel-modal');
  renderSessionsList();
}

// ── Promote / Close Out / Reopen ──────────────────────────────────────
function promoteToCaregiver(candidateId){
  const c = candidates.find(x=>x.id===candidateId);
  if(!c) return;
  if(!confirm(`Promote ${c.first} ${c.last} to caregiver?\n\nThey will be added to Training & Active Compliance and removed from Background & References.`)) return;
  const hireDate = c.orient_session_date || new Date().toISOString().split('T')[0];
  caregivers.push({
    id: cgId++, first: c.first, last: c.last,
    hire_date: hireDate, oos: c.oos||'no',
    orient_date: hireDate, alz_date: '',
    ojt_date: '', ojt_signed: 'no', ojt_proof: '', ojt_online: '',
    annual_date: '', annual_proof: '', annual_online: '',
    oig_date: c.oig_date||'', oig_status: '', oig_proof: '',
    edl_date: c.edl_date||'', edl_status: '', edl_proof: '',
    fcsr_date: c.fcsr_date||'', fcsr_status: '', fcsr_proof: '',
    fp: c.fp||'N/A', fp_date: c.fp_date||'', fp_proof: '',
    supv_date: '', supv_proof: '',
    perf_date: '', perf_proof: ''
  });
  saveCaregivers();
  candidates = candidates.filter(x=>x.id!==candidateId);
  saveCandidates();
  renderOB(); renderTR(); renderAC();
  alert(`🎉 ${c.first} ${c.last} has been promoted! They now appear in Training and Active Compliance.`);
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
  if(document.getElementById('settings-training-key')) document.getElementById('settings-training-key').value=appSettings.training_hub_key||'';
  document.getElementById('settings-gdrive-client-id').value=appSettings.google_client_id||'';
  document.getElementById('settings-gdrive-folder-id').value=appSettings.google_drive_folder_id||'';
  document.getElementById('settings-gcal-id').value=appSettings.gcal_calendar_id||'';
  document.getElementById('settings-ac-orient-webhook').value=appSettings.ac_orient_webhook||'';
  if(document.getElementById('settings-nc-webhook')) document.getElementById('settings-nc-webhook').value=appSettings.ac_new_client_webhook||'';
  document.getElementById('settings-zapier-orient').value=appSettings.zapier_orient_webhook||'';
  document.getElementById('settings-zapier-attend').value=appSettings.zapier_attend_webhook||'';
  document.getElementById('settings-zapier-cand').value=appSettings.zapier_cand_webhook||'';
  document.getElementById('settings-zapier-not-hired').value=appSettings.zapier_not_hired_webhook||'';
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
  appSettings.training_hub_key = document.getElementById('settings-training-key')?.value.trim() || appSettings.training_hub_key || '';
  const newClientId = document.getElementById('settings-gdrive-client-id').value.trim();
  appSettings.google_drive_folder_id = document.getElementById('settings-gdrive-folder-id').value.trim();
  appSettings.gcal_calendar_id = document.getElementById('settings-gcal-id').value.trim() || 'primary';
  appSettings.ac_orient_webhook = document.getElementById('settings-ac-orient-webhook').value.trim();
  appSettings.ac_new_client_webhook = document.getElementById('settings-nc-webhook')?.value.trim() || appSettings.ac_new_client_webhook || '';
  appSettings.zapier_orient_webhook = document.getElementById('settings-zapier-orient').value.trim();
  appSettings.zapier_attend_webhook = document.getElementById('settings-zapier-attend').value.trim();
  appSettings.zapier_cand_webhook = document.getElementById('settings-zapier-cand').value.trim();
  appSettings.zapier_not_hired_webhook = document.getElementById('settings-zapier-not-hired').value.trim();
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

function confirmCSVImport(){
  if(!_csvParsed.length) return;
  _csvParsed.forEach(d => caregivers.push({id:cgId++,...d}));
  saveCaregivers();
  closeModal('csv-import-modal');
  renderTR(); renderAC(); renderAlerts();
  alert(`✅ Imported ${_csvParsed.length} caregiver${_csvParsed.length>1?'s':''}. They now appear in Training and Active Compliance.`);
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
  const url=`${window.location.href.replace('Compliance_Hub.html','').replace(/\?.*$/,'').replace(/#.*$/,'')}orientation-booking.html?sessions=${encoded}`;
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
window.SCX = {acFilter, addStaffHandoffItem, addStaffUser, attTypeUi, batchOIGCheck, bulkMarkCheck, calNext, calPrev, closeModal, confirmCSVImport, confirmNotHire, confirmSendInvite, copyBLToClipboard, deleteOrientConfirm, downloadCSVTemplate, exportComplianceCSV, gcalSyncAll, generateOrientSessions, gotoTab, handleCSVFile, hbCreateWriteup, hbTplChanged, logAttEvent, obFilter, oigCheckFromCGModal, oigCheckFromOBModal, openCGModal, openImportModal, openNewWriteup, openOrientModal, openOrientModalWithScope, postStaffHandoff, previewCSV, renderAC, renderOB, renderTR, saveAttSettings, saveCG, saveCancelDetails, saveEVVCorrection, saveManualRef, saveOB, saveOrient, saveOrientSettings, saveSettings, scanClockins, setPastView, submitAdminPwd, syncFromTrainingHub, toggleACSelectAll, toggleEVVReasonOther, toggleGuide, toggleRecurEnd, toggleRecurFields, trFilter, updateMrefPreview, updateOrientGenPreview};
window.dispatchEvent(new Event('scx-ready'));
})();
