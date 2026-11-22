/* =====================================================================================================================
   THE CLIENT'S DRIVING TAB (Samantha 2026-11-21: "a clear mark on driving - do they want us to provide transportation? Do
   they want the caregiver to drive the caregivers car or drive the clients car? If want us to drive the clients car we need
   to see that inspection is up to date and insurance proof before our caregiver can drive the clients car. The need to have
   a driver as a caregiver should be clear when we are putting out shifts and coverage").
   Her answers 2026-11-21: driving the client's car needs an Approved Driver too (the caregiver's own Driving tab); the
   inspection is the paper, or the office marks the car exempt with its year and miles; this tab is on the one client profile.
   The home visit's Finish and the agreement's countersign fill it; the office sets whose car and checks the car papers here.
   Everything comes from the server function client-driving (staff sign-in; the server decides and this page shows its own
   words). Papers open only through the server's logged open, read into memory (blob:), never a storage address on the page.
     CDRV.mount({ ax, lead, name })   when a profile opens
     CDRV.load()                       when the tab is shown (the server is read only then)
   ===================================================================================================================== */
(function(){
  'use strict';
  const FN = 'client-driving';
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const MODE = {
    none:          ['No driving', 'Caregivers do not drive this client.', '#3A342C', '#F4F2ED'],
    caregiver_car: ["Caregiver's car", 'A caregiver drives the client in their own car. Only Approved Drivers are offered these shifts.', '#1D4ED8', '#DBEAFE'],
    client_car:    ["Client's car", "A caregiver drives the client's car. Only Approved Drivers, and only once the client's insurance and inspection are checked.", '#92400E', '#FEF3C7'],
    either:        ["Caregiver's car or the client's car", "Either car. Until the client's car papers are checked, the caregiver uses their own car.", '#92400E', '#FEF3C7'],
    unset:         ['Not asked yet', 'Ask the family whether they want us to drive, and in whose car. The home visit asks it too.', '#6E6559', '#F4F2ED'],
  };
  const FROM = { visit:'the home visit', agreement:'the signed agreement', office:'the office' };
  const EV = { created:'Set up', mode:'Whose car', car:'Car details', doc_uploaded:'Paper uploaded', verified:'Checked', exempt:'Marked exempt from inspection', linked:'Linked', conflict:'Needs a check', note:'Note' };
  const day = d => { if(!d) return ''; try{ return new Date(String(d).slice(0,10) + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); }catch(_){ return String(d); } };
  const when = iso => { try{ return new Date(iso).toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }); }catch(_){ return ''; } };
  let ctx = { ax:'', lead:'', name:'' }, V = null, msg = '', err = '', busyNow = false;
  const LOOK = {};
  const host = () => document.getElementById('cdrvHost');

  async function call(body){
    try{
      const r = await sb.functions.invoke(FN, { body });
      if(r.error){
        let j = null; try{ if(r.error.context && typeof r.error.context.json === 'function') j = await r.error.context.json(); }catch(_){}
        return { ok:false, data:j || {}, error:(j && j.error) || r.error.message || 'The driving server did not answer.' };
      }
      if(!r.data || r.data.ok === false || r.data.error) return { ok:false, data:r.data || {}, error:(r.data && r.data.error) || 'The driving server did not answer.' };
      return { ok:true, data:r.data, error:'' };
    }catch(e){ return { ok:false, data:{}, error:'Could not reach the driving server: ' + ((e && e.message) || 'no answer') }; }
  }
  const who = () => ({ ax: ctx.ax || undefined, lead: ctx.lead || undefined, name: ctx.name || undefined });

  function mount(p){
    ctx = { ax:String((p && p.ax) || ''), lead:String((p && p.lead) || ''), name:String((p && p.name) || '') };
    V = null; msg = ''; err = '';
    const h = host(); if(h) h.innerHTML = '';
  }
  async function load(){
    const h = host(); if(!h) return;
    if(!ctx.ax && !ctx.lead){ h.innerHTML = '<div class="card" style="padding:14px 16px">This client has no lead or AxisCare number yet, so driving cannot be recorded.</div>'; return; }
    if(!V) h.innerHTML = '<div class="card" style="padding:14px 16px;color:var(--gray)">Reading the Driving tab…</div>';
    const key = ctx.ax + '|' + ctx.lead;
    const r = await call(Object.assign({ action:'get' }, who()));
    if(key !== ctx.ax + '|' + ctx.lead) return;
    if(!r.ok){ h.innerHTML = '<div class="card" style="padding:14px 16px;color:#B91C1C">' + esc(r.error) + '</div>'; return; }
    V = r.data; draw(); fillLooks();
  }

  function banner(row, d){
    const m = MODE[row && row.mode ? row.mode : 'unset'] || MODE.unset;
    const src = row && row.mode_from ? 'From ' + FROM[row.mode_from] + (row.mode_by ? ' (' + esc(row.mode_by) + ')' : '') + (row.mode_at ? ', ' + esc(when(row.mode_at)) : '') : '';
    let carLine = '';
    if(d && d.uses_client_car) carLine = d.car.ok
      ? '<div class="cdrv-ok">✓ The client\'s car is cleared for a caregiver to drive.</div>'
      : '<div class="cdrv-no">✗ The client\'s car is NOT cleared yet. No caregiver may drive it until the papers below are checked.</div>';
    return '<div class="cdrv-banner" style="background:' + m[3] + ';border-color:' + m[2] + '33">'
      + '<div class="cdrv-label" style="color:' + m[2] + '">' + esc(m[0]) + '</div>'
      + '<div class="cdrv-sub">' + esc(m[1]) + '</div>' + (src ? '<div class="cdrv-src">' + src + '</div>' : '') + carLine
      + (d && d.shift_words ? '<div class="cdrv-shift">Shifts and coverage texts say: <b>' + esc(d.shift_words) + '</b></div>' : '')
      + '</div>';
  }
  function modeButtons(row){
    const cur = row && row.mode ? row.mode : '';
    return '<div class="cdrv-q"><div class="cdrv-h">Do they want us to drive, and in whose car?</div><div class="cdrv-btns">'
      + ['none','caregiver_car','client_car','either'].map(k => '<button type="button" class="btn ' + (cur === k ? 'btn-primary' : 'btn-ghost') + '" data-cdrv="mode" data-v="' + k + '">' + esc(MODE[k][0]) + '</button>').join('')
      + '</div></div>';
  }
  function paperBox(kind, title, row, docs, d){
    const cur = docs.filter(x => x.kind === kind && !x.superseded_at)[0];
    const what = kind === 'car_insurance' ? 'insurance' : 'inspection';
    const vAt = row[what + '_verified_at'], exp = row[what + '_expires'];
    const exempt = kind === 'inspection' && row.inspection_exempt_at;
    let state = '';
    if(exempt) state = '<span class="cdrv-pill ok">Exempt: ' + esc(row.car_year || '?') + ', ' + esc(Number(row.car_miles || 0).toLocaleString()) + ' miles (' + esc(row.inspection_exempt_by || '') + ', ' + esc(day(row.inspection_exempt_at)) + ')</span>';
    else if(vAt && exp && exp > todayYmd()) state = '<span class="cdrv-pill ok">Checked by ' + esc(row[what + '_verified_by'] || '') + ' · expires ' + esc(day(exp)) + '</span>';
    else if(vAt) state = '<span class="cdrv-pill no">Expired ' + esc(day(exp)) + ': a new one is needed</span>';
    else state = '<span class="cdrv-pill no">' + (cur ? 'Uploaded, not checked yet' : 'Not on file') + '</span>';
    const look = cur ? '<div class="cdrv-look" data-doc="' + esc(cur.id) + '" data-ct="' + esc(cur.content_type || '') + '"><span style="color:var(--gray);font-size:12px">Loading the paper…</span></div>' : '';
    const check = cur && !(vAt && cur.verified_at) ? '<div class="cdrv-row"><label>Expiration date on the paper <input type="date" data-cdrv-exp="' + kind + '"></label>'
      + '<button type="button" class="btn btn-primary" data-cdrv="verify" data-v="' + what + '">I checked it</button></div>' : '';
    const exemptBtn = kind === 'inspection' && !exempt ? '<details class="cdrv-ex"><summary>Newer car? Mark it exempt from inspection</summary>'
      + '<div class="cdrv-note">Missouri lets newer cars skip the safety inspection. Record the model year and the miles on the dashboard; your name is kept with it.</div>'
      + '<div class="cdrv-row"><label>Model year <input type="number" min="1950" max="2100" data-cdrv-ey value="' + esc(row.car_year || '') + '"></label><label>Miles <input type="number" min="0" data-cdrv-em value="' + esc(row.car_miles || '') + '"></label></div>'
      + '<div class="cdrv-row"><label style="flex:1">Note (optional) <input type="text" maxlength="300" data-cdrv-en placeholder="e.g. 2022 Camry, 31,000 miles, saw the dashboard"></label><button type="button" class="btn btn-ghost" data-cdrv="exempt">Mark exempt</button></div></details>' : '';
    return '<div class="cdrv-paper"><div class="cdrv-h">' + esc(title) + ' ' + state + '</div>' + look
      + '<div class="cdrv-row"><label class="btn btn-ghost" style="cursor:pointer">' + (cur ? 'Upload a newer one' : 'Upload a photo or PDF') + '<input type="file" accept="image/*,application/pdf" data-cdrv-file="' + kind + '" style="display:none"></label></div>'
      + check + exemptBtn + '</div>';
  }
  function todayYmd(){ try{ return new Date().toLocaleDateString('en-CA', { timeZone:'America/Chicago' }); }catch(_){ return new Date().toISOString().slice(0,10); } }
  function agreementSaid(events){
    const e = (events || []).find(x => x.kind === 'car' && x.detail && x.detail.from === 'agreement');
    if(!e) return '';
    const d = e.detail, bits = [];
    if(d.car) bits.push(d.car === 'accept' ? 'Accepted use of the client\'s car' : 'Declined use of the client\'s car');
    if(d.make_model) bits.push(esc(d.make_model) + (d.year ? ' (' + esc(d.year) + ')' : ''));
    if(d.insurance_expires_typed) bits.push('insurance typed as expiring ' + esc(day(d.insurance_expires_typed)) + ' (not checked)');
    return '<div class="cdrv-note">The signed agreement (' + esc(when(e.at)) + '): ' + bits.join(' · ') + '</div>';
  }
  function draw(){
    const h = host(); if(!h || !V) return;
    const row = V.row || {}, d = V.derived || {}, docs = V.docs || [], ev = V.events || [];
    const conflicts = ev.filter(x => x.kind === 'conflict').slice(0, 2);
    let html = '<div class="card cdrv" style="padding:16px 18px;margin-bottom:12px">' + banner(V.row, d)
      + (err ? '<div class="cdrv-err">' + esc(err) + '</div>' : '') + (msg ? '<div class="cdrv-msg">' + esc(msg) + '</div>' : '')
      + conflicts.map(c => '<div class="cdrv-err">' + esc(when(c.at)) + ': ' + esc(c.detail && c.detail.why || 'The answers disagree. Check with the family.') + '</div>').join('')
      + modeButtons(V.row);
    if(d.uses_client_car){
      html += '<div class="cdrv-car"><div class="cdrv-h">The client\'s car</div>' + agreementSaid(ev)
        + '<div class="cdrv-row"><label style="flex:2">Make and model <input type="text" maxlength="120" data-cdrv-mm value="' + esc(row.car_make_model || '') + '"></label>'
        + '<label>Year <input type="number" min="1950" max="2100" data-cdrv-y value="' + esc(row.car_year || '') + '"></label>'
        + '<label>Miles <input type="number" min="0" data-cdrv-mi value="' + esc(row.car_miles || '') + '"></label>'
        + '<button type="button" class="btn btn-ghost" data-cdrv="car">Save</button></div>'
        + (d.car && d.car.missing && d.car.missing.length ? '<div class="cdrv-todo"><b>Still to do before a caregiver may drive this car</b><ul>' + d.car.missing.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '')
        + paperBox('car_insurance', 'Proof of insurance on the client\'s car', row, docs, d)
        + paperBox('inspection', 'Vehicle inspection', row, docs, d)
        + '</div>';
    }
    if(ev.length) html += '<details class="cdrv-hist"><summary>History (' + ev.length + ')</summary>' + ev.slice(0, 40).map(e => '<div>' + esc(when(e.at)) + ' · ' + esc(EV[e.kind] || e.kind) + (e.by_name ? ' · ' + esc(e.by_name) : '')
      + (e.kind === 'mode' && e.detail ? ': ' + esc((MODE[e.detail.now] || MODE.unset)[0]) + ' (from ' + esc(FROM[e.detail.from] || e.detail.from) + ')' : '') + '</div>').join('') + '</details>';
    html += '<div class="cdrv-note" style="margin-top:8px">The caregiver who drives must be an Approved Driver on their own Driving tab, whichever car it is.</div></div>';
    h.innerHTML = html;
  }
  async function fillLooks(){
    const h = host(); if(!h || h.offsetParent === null) return;
    for(const b of Array.from(h.querySelectorAll('.cdrv-look'))){
      const id = b.dataset.doc, ct = String(b.dataset.ct || '').toLowerCase();
      let u = LOOK[id] || '';
      if(!u){
        const r = await call({ action:'open', doc_id:id });
        const link = r.ok && r.data && r.data.url || '';
        if(link){ try{ const f = await fetch(link); if(f.ok){ u = URL.createObjectURL(await f.blob()); LOOK[id] = u; } }catch(_){} }
        if(!u){ if(b.isConnected) b.innerHTML = '<span style="color:#B91C1C;font-size:12.5px">Could not show it: ' + esc(r.ok ? 'the file did not load' : (r.error || 'no link')) + '</span>'; continue; }
      }
      if(!b.isConnected) return;
      if(ct === 'application/pdf') b.innerHTML = '<iframe src="' + esc(u) + '#toolbar=0&view=FitH" title="paper" style="width:100%;height:100%;border:0"></iframe>';
      else if(ct === 'image/heic') b.innerHTML = '<a href="' + esc(u) + '" target="_blank" rel="noopener">iPhone photo: tap to open it</a>';
      else b.innerHTML = '<a href="' + esc(u) + '" target="_blank" rel="noopener" style="display:flex;width:100%;height:100%;align-items:center;justify-content:center"><img src="' + esc(u) + '" alt="paper" style="max-width:100%;max-height:100%;object-fit:contain"></a>';
    }
  }
  const ctOf = f => { const t = String(f.type || '').toLowerCase(); if(t) return t === 'image/jpg' ? 'image/jpeg' : t; const n = String(f.name || '').toLowerCase(); return n.endsWith('.pdf') ? 'application/pdf' : n.endsWith('.png') ? 'image/png' : n.endsWith('.heic') ? 'image/heic' : n.endsWith('.webp') ? 'image/webp' : 'image/jpeg'; };
  async function upload(kind, file){
    if(file.size > 15 * 1024 * 1024) return { ok:false, error:'That file is over 15 MB. Please choose a smaller one.' };
    const ct = ctOf(file), key = V && V.row && V.row.id;
    const u = await call({ action:'upload_url', key, kind, content_type:ct });
    if(!u.ok) return u;
    try{
      const put = await fetch(u.data.url, { method:'PUT', headers:{ 'Content-Type':ct, 'x-upsert':'false' }, body:file });
      if(!put.ok) return { ok:false, error:'The upload did not finish (' + put.status + '). Please try again.' };
    }catch(e){ return { ok:false, error:'The upload did not finish. Check the connection and try again.' }; }
    return call({ action:'record', key, kind, path:u.data.path, content_type:ct });
  }
  async function act(fn, okMsg){
    if(busyNow) return; busyNow = true; err = ''; msg = '';
    try{ const r = await fn(); if(r && !r.ok) err = r.error; else msg = okMsg; }
    finally{ busyNow = false; }
    await load();
  }
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('[data-cdrv]'); if(!b || !host() || !host().contains(b)) return;
    const k = b.dataset.cdrv, h = host(), key = V && V.row && V.row.id;
    if(k === 'mode') act(() => call(Object.assign({ action:'set_mode', mode:b.dataset.v, from:'office' }, who())), 'Saved: ' + MODE[b.dataset.v][0] + '.');
    if(k === 'car') act(() => call({ action:'car', key, make_model:h.querySelector('[data-cdrv-mm]').value, year:h.querySelector('[data-cdrv-y]').value, miles:h.querySelector('[data-cdrv-mi]').value }), 'The car details are saved.');
    if(k === 'verify'){ const kind = b.dataset.v === 'insurance' ? 'car_insurance' : 'inspection'; const e = h.querySelector('[data-cdrv-exp="' + kind + '"]');
      act(() => call({ action:'verify', key, what:b.dataset.v, expires:e ? e.value : '' }), 'Recorded as checked, with your name and the time.'); }
    if(k === 'exempt') act(() => call({ action:'exempt', key, year:h.querySelector('[data-cdrv-ey]').value, miles:h.querySelector('[data-cdrv-em]').value, note:h.querySelector('[data-cdrv-en]').value }), 'The car is marked exempt from inspection, with your name.');
  });
  document.addEventListener('change', ev => {
    const i = ev.target.closest && ev.target.closest('[data-cdrv-file]'); if(!i || !host() || !host().contains(i) || !i.files || !i.files[0]) return;
    const f = i.files[0], kind = i.dataset.cdrvFile;
    act(() => upload(kind, f), 'Uploaded. Now check it and enter its expiration date.');
  });
  const css = document.createElement('style');
  css.textContent = '.cdrv-banner{border:1px solid;border-radius:12px;padding:14px 16px;margin-bottom:12px}.cdrv-label{font-size:22px;font-weight:800;letter-spacing:.2px}'
    + '.cdrv-sub{font-size:13.5px;margin-top:2px}.cdrv-src{font-size:12px;color:var(--gray);margin-top:4px}.cdrv-ok{margin-top:8px;font-weight:700;color:#15803D}.cdrv-no{margin-top:8px;font-weight:700;color:#B91C1C}'
    + '.cdrv-shift{margin-top:8px;font-size:13px}.cdrv-h{font-weight:700;margin:12px 0 6px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}.cdrv-btns{display:flex;gap:8px;flex-wrap:wrap}'
    + '.cdrv-row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin:6px 0}.cdrv-row label{display:flex;flex-direction:column;font-size:12px;color:var(--gray);gap:3px}.cdrv-row input{min-height:36px}'
    + '.cdrv-paper{border-top:1px solid var(--border);padding-top:6px;margin-top:10px}.cdrv-look{width:100%;max-width:420px;height:240px;border:1px solid var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fafafa}'
    + '.cdrv-pill{font-size:12px;font-weight:600;border-radius:999px;padding:2px 10px}.cdrv-pill.ok{background:#DCFCE7;color:#15803D}.cdrv-pill.no{background:#FEE2E2;color:#B91C1C}'
    + '.cdrv-todo{background:#FEF3C7;border-radius:8px;padding:8px 12px;font-size:13px;margin:8px 0}.cdrv-todo ul{margin:4px 0 0 18px;padding:0}.cdrv-note{font-size:12.5px;color:var(--gray);margin:4px 0}'
    + '.cdrv-err{background:#FEE2E2;color:#B91C1C;border-radius:8px;padding:8px 12px;font-size:13px;margin:8px 0}.cdrv-msg{background:#DCFCE7;color:#15803D;border-radius:8px;padding:8px 12px;font-size:13px;margin:8px 0}'
    + '.cdrv-hist{margin-top:12px;font-size:12.5px;color:var(--gray)}.cdrv-ex{margin-top:8px;font-size:13px}@media(max-width:600px){.cdrv-label{font-size:19px}.cdrv-look{height:200px}}';
  document.head.appendChild(css);
  window.CDRV = { mount, load, _draw: draw, _ctx: () => ctx, _set: v => { V = v; draw(); } };
})();
