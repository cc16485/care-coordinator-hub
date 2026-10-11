/* =====================================================================================================================
   THE MAIN PROFILE OF A HIRE (Samantha 2026-10-11): "make sure every send, receive, completed time stamp is recorded in
   their main profile and make it easy for us to access the applicant's main profile from anywhere, and the PDF of all
   signed documents should be saved in the main profile... we need to be able to look at the profile and see it all".
   One panel, opened from anywhere (👤 Profile on the offer cards, Background & References, the caregiver roster, the
   readiness card, the welcome calls, the applicant page). The server (hire-profile) reads every permanent record for that
   one person; nothing is copied or typed here. Every document opens by a five-minute link and every open is logged.
     HP.open({ offer_id | candidate_id | caregiver_id | applicant_id })   HP.chip(key)   HP.fillOfferProgress()
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  async function call(body){
    const r = await sb.functions.invoke('hire-profile', { body });
    if(r.error){ let why = ''; try{ if(r.error.context && r.error.context.json) why = (await r.error.context.json()).error || ''; }catch(_){} throw new Error(why || r.error.message || 'the profile server did not answer'); }
    if(!r.data || r.data.error) throw new Error((r.data && r.data.error) || 'the profile server did not answer');
    return r.data;
  }
  const central = iso => { try{ return new Date(iso).toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' }); }catch(_){ return String(iso || ''); } };
  const TYPES = { sent:['Sent','#0D365F','#E8EEF5'], received:['Received','#15803D','#DCFCE7'], done:['Done','#3A342C','#F4F2ED'], refused:['Not sent','#B91C1C','#FEE2E2'],
                  opened:['Opened','#6E6559','#F4F2ED'], changed:['Changed','#92400E','#FEF3C7'], card:['Card','#B45309','#FFF7ED'] };
  let CUR = null, KEY = null, FILTER = 'all';
  function keyAttr(k){ return esc(JSON.stringify(k)); }
  function chip(k, label){ return '<button class="ibtn" style="font-size:.72rem" title="Their main profile: every send, receipt and completion with its time, and every signed document" onclick="HP.open(' + keyAttr(k) + ')">&#128100; ' + esc(label || 'Profile') + '</button>'; }
  function panel(){
    let w = document.getElementById('hpPanel'); if(w) return w;
    w = document.createElement('div'); w.id = 'hpPanel';
    w.style.cssText = 'position:fixed;inset:0;z-index:10010;background:rgba(15,54,95,.35);display:none;align-items:flex-start;justify-content:center;padding:1rem;overflow:auto';
    w.innerHTML = '<div id="hpBody" style="background:#fff;border-radius:12px;max-width:980px;width:100%;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.2);margin:1rem 0"></div>';
    w.addEventListener('click', e => { if(e.target === w) close(); });
    document.body.appendChild(w); return w;
  }
  function close(){ const w = document.getElementById('hpPanel'); if(w) w.style.display = 'none'; }
  async function open(k){
    KEY = k; FILTER = 'all';
    const w = panel(), b = document.getElementById('hpBody'); w.style.display = 'flex';
    b.innerHTML = '<div class="field-note">Gathering everything on file…</div>';
    try{ CUR = await call(Object.assign({ action:'get' }, k)); render(); }
    catch(e){ b.innerHTML = '<div style="color:#B91C1C">Could not open the profile: ' + esc(e.message) + '</div><div style="text-align:right;margin-top:.8rem"><button class="ibtn" onclick="HP.close()">Close</button></div>'; }
  }
  function render(){
    const p = CUR, b = document.getElementById('hpBody'); if(!p || !b) return;
    const ids = p.ids || {};
    const tl = (p.timeline || []).filter(x => FILTER === 'all' || x.type === FILTER);
    const counts = {}; (p.timeline || []).forEach(x => { counts[x.type] = (counts[x.type] || 0) + 1; });
    const phone = p.phone ? (typeof ocAttrs === 'function' ? '<a' + ocAttrs(p.phone) + ' style="color:var(--teal);text-decoration:none">&#128222; ' + esc(p.phone) + '</a>' : '&#128222; ' + esc(p.phone)) : '';
    let h = '<div style="display:flex;gap:.6rem;align-items:flex-start;flex-wrap:wrap;border-bottom:2px solid #E8E2D8;padding-bottom:.7rem">'
      + '<div style="flex:1;min-width:240px"><div style="font-size:1.25rem;font-weight:800;color:#0D365F">&#128100; ' + esc(p.name) + '</div>'
      + '<div style="font-size:.82rem;color:#6E6559;margin-top:.2rem;display:flex;gap:.7rem;flex-wrap:wrap">' + phone + (p.email ? '<span>&#9993;&#65039; ' + esc(p.email) + '</span>' : '')
      + (p.position ? '<span>' + esc(p.position) + '</span>' : '') + (p.path ? '<span>' + (p.path === 'new' ? 'New onboarding path' : 'Old onboarding path') + '</span>' : '') + '</div>'
      + '<div style="margin-top:.45rem"><b style="font-size:.86rem;color:#0D365F">Where they are:</b> <span style="font-size:.86rem">' + esc(p.where) + '</span></div></div>'
      + '<div style="display:flex;gap:.35rem;flex-wrap:wrap">'
      + (ids.offer_id && p.path === 'new' && window.CRX ? '<button class="ibtn" onclick="HP.close();CRX.open(\'' + esc(ids.offer_id) + '\')">&#9776; Readiness card</button>' : '')
      + (ids.applicant_id && typeof apOpenProfile === 'function' ? '<button class="ibtn" onclick="HP.close();HP.openApplication(\'' + esc(ids.applicant_id) + '\')">Their application</button>' : '')
      + '<button class="ibtn" onclick="HP.close()">Close</button></div></div>';
    const docs = p.documents || [];
    h += '<div style="margin-top:.8rem"><b style="color:#0D365F">Signed documents and proofs</b> <span class="field-note">(' + docs.length + ') · each opens by a five-minute link; every open is logged with your name</span>'
      + (docs.length ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:.35rem;margin-top:.4rem">' + docs.map((d, i) =>
          '<div style="border:1px solid #E8E2D8;border-radius:8px;padding:.4rem .55rem;display:flex;gap:.5rem;align-items:center"><span style="flex:1;font-size:.82rem"><b>' + esc(d.label) + '</b>'
          + (d.at ? '<br><span class="field-note">' + esc(central(d.at)) + '</span>' : '') + '</span><button class="ibtn" onclick="HP.doc(' + i + ',this)">Open</button></div>').join('') + '</div>'
        : '<div class="field-note" style="margin-top:.3rem">Nothing signed yet.</div>') + '</div>';
    h += '<div style="margin-top:1rem"><b style="color:#0D365F">Everything that happened, oldest first</b> <span class="field-note">every send, receipt and completion, with who and when (Central time)</span>'
      + '<div style="display:flex;gap:.3rem;flex-wrap:wrap;margin:.4rem 0">' + [['all','All',(p.timeline || []).length]].concat(Object.keys(TYPES).filter(k => counts[k]).map(k => [k, TYPES[k][0], counts[k]])).map(([k, l, n]) =>
          '<button class="ibtn" style="font-size:.72rem;' + (FILTER === k ? 'background:#0D365F;color:#fff;border-color:#0D365F' : '') + '" onclick="HP.filter(\'' + k + '\')">' + esc(l) + ' (' + n + ')</button>').join('') + '</div>'
      + (tl.length ? '<table style="width:100%;border-collapse:collapse;font-size:.8rem"><tbody>' + tl.map(x => { const T = TYPES[x.type] || TYPES.done;
          return '<tr style="border-bottom:1px solid #F4F2ED"><td style="padding:.3rem .4rem;white-space:nowrap;color:#6E6559;vertical-align:top">' + esc(central(x.at)) + '</td>'
            + '<td style="padding:.3rem .4rem;vertical-align:top"><span style="font-size:.7rem;font-weight:700;color:' + T[1] + ';background:' + T[2] + ';border-radius:6px;padding:.05rem .4rem;white-space:nowrap">' + T[0] + '</span></td>'
            + '<td style="padding:.3rem .4rem;vertical-align:top">' + esc(x.what) + '</td><td style="padding:.3rem .4rem;color:#6E6559;vertical-align:top;white-space:nowrap">' + esc(x.by || '') + '</td></tr>'; }).join('') + '</tbody></table>'
        : '<div class="field-note">Nothing here yet.</div>') + '</div>';
    b.innerHTML = h;
  }
  async function doc(i, btn){
    const d = CUR && (CUR.documents || [])[i]; if(!d) return;
    if(btn){ btn.disabled = true; btn.textContent = 'Opening…'; }
    try{ const r = await call(Object.assign({ action:'doc', ref:d.ref }, KEY)); window.open(r.url, '_blank', 'noopener'); }
    catch(e){ alert('Could not open it: ' + e.message); }
    finally{ if(btn){ btn.disabled = false; btn.textContent = 'Open'; } }
  }
  function openApplication(id){
    if(typeof apOpenProfile !== 'function') return;
    if(typeof AP_ROWS !== 'undefined' && AP_ROWS.some(x => String(x.id) === String(id))) return apOpenProfile(id);
    if(typeof switchTab === 'function') try{ switchTab('applicants'); }catch(_){}
    if(typeof apLoad === 'function') Promise.resolve(apLoad()).then(() => apOpenProfile(id)).catch(() => {});
  }
  /* the offer cards: how far their Step 1 is, filled in after the cards draw (one call for every card on screen) */
  let filling = false;
  async function fillOfferProgress(){
    if(filling || typeof sb === 'undefined') return;
    const spans = [...document.querySelectorAll('.hp1[data-offer]:not([data-filled])')]; if(!spans.length) return;
    filling = true;
    try{
      const ids = [...new Set(spans.map(s => s.dataset.offer))];
      const r = await call({ action:'step1_progress', offer_ids: ids });
      spans.forEach(s => { const p = (r.progress || {})[s.dataset.offer]; s.dataset.filled = '1'; if(!p){ s.textContent = ''; return; }
        s.textContent = p.completed_at ? 'Complete ' + central(p.completed_at) + '.'
          : (p.sent_at ? 'Sent ' + central(p.sent_at) + (p.practice ? ' (practice: recorded, not sent)' : '') + '. ' : 'Not sent yet. ')
            + (p.started_at ? 'Opened ' + central(p.started_at) + '; ' + p.signed + ' of ' + p.forms + ' forms signed.' : 'Not opened yet.'); });
    }catch(e){ spans.forEach(s => { s.dataset.filled = '1'; s.textContent = '(how far they are could not be read: ' + e.message + ')'; }); }
    finally{ filling = false; }
  }
  function watch(){ const box = document.getElementById('offersList'); if(!box || box.dataset.hpWatch) return; box.dataset.hpWatch = '1'; new MutationObserver(() => fillOfferProgress()).observe(box, { childList:true, subtree:true }); fillOfferProgress(); }
  document.addEventListener('DOMContentLoaded', watch); setInterval(watch, 3000);
  window.HP = { open, close, chip, doc, filter: k => { FILTER = k; render(); }, openApplication, fillOfferProgress };
})();
