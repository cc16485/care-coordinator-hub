/* =====================================================================================================================
   RN REVIEW, the LPN's half on the Nurse Portal (LPN nurse visit plan, steps 5 to 7; Samantha approved "approve nursing plan"
   2026-10-14; build spec launch/review/lpn/build-spec.md). Mounted once from nursePortalRender (index.html):
     NurseReview.mount(me, real)   me = the nurse whose portal this is; real = the signed-in nurse (null while an owner or
                                   coordinator previews, in which case the mark is entered for that nurse, with their name)
   It adds, on the nurse's own rows:
     · "Mark for Natasha" on each client in My caseload: the nurse service, the visit date and what they saw, sent to the
       rn-review server function (nurse_flag). Natasha sees it on her review page (cc.mo-care.com/rn.html).
     · on each of their GHE forms: Natasha's note when she sent it back, or that she signed it.
     · one card, "Marked for Natasha": their own marks and Natasha's notes back.
   Switch ops_settings.nurse_review_live (Owners Hub Admin page). Off: the button shows only on practice clients (the server
   refuses real ones and says to call Natasha). The server decides everything; this file shows its words. No em dashes.
   ===================================================================================================================== */
(function(){
  'use strict';
  const FN = 'rn-review';
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  /* the build spec's service list; the Admin page's ops_settings.nurse_services wins (the server checks the key either way) */
  const FALLBACK = [['med_setup','Weekly medication organizer setup'],['ghe','General Health Evaluation'],['skin_monitoring','Skin monitoring'],['nail_care','Diabetic or medically necessary nail care'],['insulin_prefill','Insulin syringe prefill']];
  const todayC = () => { try{ return new Date().toLocaleDateString('en-CA', { timeZone:'America/Chicago' }); }catch(_){ return new Date().toISOString().slice(0,10); } };
  const day = d => { const s = String(d || '').slice(0,10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone:'UTC', month:'short', day:'numeric', year:'numeric' }) : ''; };
  const D = () => (typeof DATA !== 'undefined' && DATA) ? DATA : {};
  const st = () => { const o = D().ops_settings; return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; };
  const live = () => st().nurse_review_live === true;
  const practiceClient = c => !!c && (c.practice === true || /\(TRAINING\)|\bpractice\b/i.test(String(c.name || '')));
  function services(){
    const l = Array.isArray(st().nurse_services) ? st().nurse_services.filter(s => s && s.key && s.name) : [];
    return (l.length ? l.map(s => [String(s.key), String(s.name)]) : FALLBACK).concat([['other','Something else']]);
  }
  function rnFirst(){
    try{ const s = window.NurseRules && NurseRules.supervisor(D().nurse_staff || [], todayC()); if(s && s.name) return String(s.name).split(' ')[0]; }catch(_){}
    return 'the RN';
  }
  async function call(body){
    try{
      const r = await sb.functions.invoke(FN, { body });
      if(r.error){ let j = null; try{ j = await r.error.context.json(); }catch(_){} return j || { ok:false, error:'Could not reach the Hub. Try again, or call ' + rnFirst() + ' directly.' }; }
      return r.data || { ok:false, error:'No answer from the Hub.' };
    }catch(e){ return { ok:false, error:'Could not reach the Hub. Try again, or call ' + rnFirst() + ' directly.' }; }
  }
  let ME = null, REAL = null, MINE = { at:0, who:'', flags:[] };

  function markForm(row, clientId){
    const old = row.nextElementSibling; if(old && old.classList && old.classList.contains('nr-form')){ old.remove(); return; }
    const c = (D().nurse_clients || []).find(x => String(x.id) === String(clientId)) || {};
    const f = document.createElement('div'); f.className = 'nr-form card'; f.style.cssText = 'padding:12px 14px;margin:6px 0 10px;border-color:#F6C77E;background:#FFFBF2;';
    f.innerHTML = '<b style="color:var(--navy);">Mark for ' + esc(rnFirst()) + ': ' + esc(c.name || '') + '</b>'
      + '<div class="field-note" style="margin:3px 0 8px;">For something ' + esc(rnFirst()) + ' should look at: what you saw on the visit. She reviews it and answers you here. Anything urgent: call her now as well.</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;"><label style="flex:1 1 220px;font-size:13px;font-weight:600;">Nurse service<select class="nr-svc" style="width:100%;">' + services().map(s => '<option value="' + esc(s[0]) + '">' + esc(s[1]) + '</option>').join('') + '</select></label>'
      + '<label style="flex:0 1 170px;font-size:13px;font-weight:600;">Visit date<input type="date" class="nr-date" value="' + todayC() + '" max="' + todayC() + '" style="width:100%;"></label></div>'
      + '<label style="display:block;font-size:13px;font-weight:600;margin-top:8px;">What you saw<textarea class="nr-seen" rows="3" style="width:100%;" placeholder="For example: red area on the left heel, about 2 cm, skin not broken"></textarea></label>'
      + '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center;"><button class="primary nr-send">Send to ' + esc(rnFirst()) + '</button><button class="ghost nr-cancel">Cancel</button><span class="field-note nr-msg"></span></div>';
    row.after(f);
    f.querySelector('.nr-cancel').onclick = () => f.remove();
    f.querySelector('.nr-send').onclick = async (ev) => {
      const btn = ev.currentTarget, msg = f.querySelector('.nr-msg'); btn.disabled = true; msg.textContent = 'Sending…'; msg.style.color = '';
      const r = await call({ action:'flag_create', client_id:String(clientId), service_key:f.querySelector('.nr-svc').value, visit_date:f.querySelector('.nr-date').value, seen:f.querySelector('.nr-seen').value.trim(), ...(REAL ? {} : { as_nurse:ME.name }) });
      btn.disabled = false;
      if(!r.ok){ msg.textContent = r.error || 'Not sent.'; msg.style.color = 'var(--red)'; return; }
      f.innerHTML = '<b style="color:#15803D;">Sent to ' + esc(rnFirst()) + '.</b> <span class="field-note">' + (r.flag && r.flag.practice ? 'Practice: ' : '') + 'It is on her review page; her answer shows under "Marked for ' + esc(rnFirst()) + '" below.</span>';
      MINE.at = 0; drawMine();
    };
  }
  function addButtons(){
    const box = document.getElementById('npMine'); if(!box) return;
    box.querySelectorAll('.nvcase-row').forEach(row => {
      if(row.querySelector('.nr-mark')) return;
      const g = row.querySelector('button[onclick^="gheNewFor(\'"]'); if(!g) return;
      const id = (/gheNewFor\('([^']+)'\)/.exec(g.getAttribute('onclick')) || [])[1]; if(!id) return;
      const c = (D().nurse_clients || []).find(x => String(x.id) === String(id));
      if(!live() && !practiceClient(c)) return;
      const b = document.createElement('button'); b.className = 'secondary nr-mark'; b.style.fontSize = '12px'; b.type = 'button';
      b.textContent = 'Mark for ' + rnFirst(); b.onclick = () => markForm(row, id);
      g.after(b);
    });
  }
  function gheNotes(){
    const box = document.getElementById('npGhe'); if(!box) return;
    box.querySelectorAll('.nvcase-row').forEach(row => {
      if(row.querySelector('.nr-ghe')) return;
      const o = row.querySelector('button[onclick^="gheOpen(\'"]'); if(!o) return;
      const id = (/gheOpen\('([^']+)'\)/.exec(o.getAttribute('onclick')) || [])[1];
      const g = (D().ghe_forms || []).find(x => String(x.id) === String(id)); if(!g) return;
      let html = '';
      if(g.rn_sent_back && (g.status || 'draft') === 'draft' && !g.superseded_by)
        html = '<div class="nr-ghe" style="flex-basis:100%;margin-top:6px;padding:8px 10px;border-left:4px solid #F0A63A;background:#FFF7E8;border-radius:6px;font-size:13px;"><b>Sent back by ' + esc(g.rn_sent_back.by || 'the RN') + ' on ' + esc(day(g.rn_sent_back.at)) + ':</b> ' + esc(g.rn_sent_back.note)
          + '<div class="field-note" style="margin-top:3px;">Correct it, then send it to RN review again. If the participant already signed, use Amend on the form: it keeps the signed one and makes a corrected copy.</div></div>';
      else if(g.rn_signature && g.rn_signature.at)
        html = '<div class="nr-ghe field-note" style="flex-basis:100%;">Signed by ' + esc(g.rn_reviewer || 'the RN') + ' on ' + esc(day(g.rn_signature.at)) + '.</div>';
      if(!html) return;
      row.style.flexWrap = 'wrap'; row.insertAdjacentHTML('beforeend', html);
    });
  }
  async function drawMine(){
    const tab = document.getElementById('tab-nurseportal'); if(!tab || !ME) return;
    let card = document.getElementById('npRnMarks');
    if(!card){ card = document.createElement('div'); card.id = 'npRnMarks'; card.className = 'card'; card.style.cssText = 'padding:16px 18px;margin-top:16px;'; tab.appendChild(card); }
    const head = '<b style="font-size:15px;color:var(--navy);">Marked for ' + esc(rnFirst()) + '</b>';
    if(Date.now() - MINE.at > 60000 || MINE.who !== ME.name){
      card.innerHTML = head + '<div class="field-note" style="margin-top:8px;">Loading…</div>';
      const r = await call({ action:'mine', ...(REAL ? {} : { as_nurse:ME.name }) });
      if(!r.ok){ card.innerHTML = head + '<div class="field-note" style="margin-top:8px;">' + esc(r.error || 'Could not load.') + '</div>'; return; }
      MINE = { at:Date.now(), who:ME.name, flags:r.flags || [] };
    }
    const fl = MINE.flags;
    card.innerHTML = head + (fl.length ? fl.map(f => '<div class="nvcase-row" style="display:block;"><b>' + esc(f.client_name) + '</b> <span class="field-note">' + esc(f.service_name || f.service_key) + ' · ' + esc(day(f.visit_date || f.at)) + (f.practice ? ' · practice' : '') + '</span>'
      + '<div style="font-size:13px;margin-top:2px;">' + esc(f.seen) + '</div>'
      + (f.status === 'reviewed' ? '<div style="margin-top:4px;padding:6px 10px;background:#F0F7F4;border-radius:6px;font-size:13px;color:#15803D;"><b>' + esc(f.reviewed_by) + ':</b> ' + esc(f.rn_note) + '</div>' : '<div class="field-note" style="margin-top:2px;">Waiting for ' + esc(rnFirst()) + ' to review it.</div>') + '</div>').join('')
      : '<div class="field-note" style="margin-top:8px;">Nothing marked yet.</div>');
  }
  function mount(me, real){
    ME = me || null; REAL = real || null;
    if(!ME) return;
    addButtons(); gheNotes();
    if(live() || MINE.flags.length || practiceClient((D().nurse_clients || []).find(c => c.assigned_nurse === ME.name && practiceClient(c)))) drawMine();
  }
  window.NurseReview = { mount, _services:services };
})();
