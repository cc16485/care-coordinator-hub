/* =====================================================================================================================
   FAMILY NOTES, top of Family & Contacts (profile fill, Stage B; Samantha 2026-11-21, her answers "as recommended").
   - The order the office calls the family (from the home visit), whether the family said yes to email (the signed
     agreement's Permission to communicate) and the photo choice: read from the client's profile record
     (client_profiles, filled by the profile-fill server; edited on Home & Life).
   - "From the home visit": the people in the room and the emergency contact who are not yet in People involved, each
     offered one tap at a time ("Add to People involved" or "Not now"); never added silently. Adding goes through the same
     client-fact "record a person" the People involved form uses (first record, permission not asked, nothing texted).
     The answer is kept on the visit (visit.people_offers), so an offer never comes back.
     FNOTE.load()   when Family & Contacts is shown
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const key = s => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
  const PHOTOS = { family:'Photos may be shared with the family', marketing:'Photos may be used in our marketing', none:'No photos, please' };
  const ROLE_OF = { primary:['primary'], poa:[], family:[] };
  let msg = '', busy = false;
  const host = () => document.getElementById('famNotesHost');
  const D = () => (typeof DATA !== 'undefined' && DATA) || {};

  function profileOf(){
    if(typeof CP === 'undefined') return {};
    const ax = String(CP.ax || ''), l = CP.lead || null, name = (CP.r && CP.r.client_name) || (l && typeof cpLeadClientName === 'function' ? cpLeadClientName(l) : '') || '';
    const id = /^\d+$/.test(ax) ? 'cp_ax' + ax : 'cp_nm' + String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return (D().client_profiles || []).find(p => p && p.id === id) || {};
  }
  function visitOf(){
    if(typeof CP === 'undefined') return null;
    const ax = String(CP.ax || ''), l = CP.lead || null;
    return (D().care_assessments || []).filter(a => a && a.visit && a.visit.finished_at && ((l && a.lead_id === l.id) || (ax && String(a.axiscare_client_id || '') === ax)))
      .sort((a, b) => String(b.visit.finished_at).localeCompare(String(a.visit.finished_at)))[0] || null;
  }
  /* the people the visit names: who was in the room (not the client) and the emergency contact, merged by name */
  function offersFrom(a, known){
    const v = (a && a.visit) || {}, done = v.people_offers || {}, out = [];
    const add = (name, rel, roles, phone) => {
      const k = key(name); if(!k || known.has(k) || done[k]) return;
      const have = out.find(x => x.k === k);
      if(have){ roles.forEach(r => { if(have.roles.indexOf(r) < 0) have.roles.push(r); }); if(!have.phone && phone) have.phone = phone; if(!have.rel && rel) have.rel = rel; return; }
      out.push({ k, name:String(name).trim(), rel:String(rel || '').trim(), roles:roles.slice(), phone:String(phone || '').trim() });
    };
    (v.attendees || []).forEach(p => { if(p && p.name && p.role !== 'client') add(p.name, p.rel || (p.role === 'poa' ? 'Legal representative' : ''), ROLE_OF[p.role] || [], ''); });
    const ec = (v.safety || {}).ec || {};
    if(ec.name) add(ec.name, ec.rel, ['emergency'], ec.phone);
    return out;
  }
  async function load(){
    const h = host(); if(!h) return;
    const p = profileOf(), a = visitOf(), l = (typeof CP !== 'undefined' && CP.lead) || null;
    let known = new Set(), began = null;
    if(l && typeof lpiLoadBegan === 'function'){ try{ began = await lpiLoadBegan(l); (began.people || []).forEach(x => { if(x && x.name) known.add(key(x.name)); }); }catch(e){ began = null; } }
    const offers = a && began && began.ep ? offersFrom(a, known) : [];
    const ph = String(p.photos || '').split(',').map(k => PHOTOS[k.trim()]).filter(Boolean);
    const rows = [];
    if(p.call_order) rows.push(['Call the family in this order', esc(p.call_order)]);
    if(p.email_ok) rows.push(['Email', p.email_ok === 'yes' ? 'Yes, the family agreed to email (signed agreement)' : '<b style="color:#B91C1C">No email.</b> The family declined email on the signed agreement. Call or text instead.']);
    if(ph.length) rows.push(['Photos', esc(ph.join(' · ')) + ' <span class="field-note">(caregivers see this on their shift page)</span>']);
    if(!rows.length && !offers.length){ h.innerHTML = ''; return; }
    h.innerHTML = '<div class="card" style="padding:14px 18px;margin-bottom:12px;">'
      + '<b style="font-size:15px;color:var(--navy);">Family notes</b>'
      + rows.map(r => '<div style="display:flex;gap:10px;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid #F0EDE6;font-size:13.5px;"><span style="min-width:190px;font-weight:700;color:var(--text-muted);">' + r[0] + '</span><span style="flex:1;min-width:0;">' + r[1] + '</span></div>').join('')
      + (offers.length ? '<div style="margin-top:10px;font-weight:700;color:var(--navy);font-size:13.5px;">From the home visit: add to People involved?</div>'
        + '<div class="field-note" style="margin:2px 0 6px;">Nobody is added until you tap. Adding never texts them.</div>'
        + offers.map(o => '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid #F0EDE6;font-size:13.5px;">'
          + '<b style="color:var(--navy);">' + esc(o.name) + '</b>' + (o.rel ? '<span class="field-note">' + esc(o.rel) + '</span>' : '')
          + (o.roles.indexOf('emergency') > -1 ? '<span style="font-size:11px;font-weight:700;color:#B91C1C;background:#FEE2E2;border-radius:999px;padding:2px 8px;">Emergency contact</span>' : '')
          + (o.phone ? '<span class="field-note">' + esc(o.phone) + '</span>' : '') + '<span style="flex:1;"></span>'
          + '<button type="button" class="secondary" data-fn-add="' + esc(o.k) + '">Add to People involved</button>'
          + '<button type="button" class="secondary" data-fn-skip="' + esc(o.k) + '">Not now</button></div>').join('') : '')
      + (msg ? '<div class="field-note" style="margin-top:8px;">' + esc(msg) + '</div>' : '')
      + '</div>';
    h.onclick = async (ev) => {
      const b = ev.target.closest && ev.target.closest('[data-fn-add],[data-fn-skip]'); if(!b || busy) return;
      const k = b.getAttribute('data-fn-add') || b.getAttribute('data-fn-skip'), o = offers.find(x => x.k === k); if(!o) return;
      busy = true; b.disabled = true;
      try{
        if(b.hasAttribute('data-fn-add')){
          const r = await lpfCall({ action:'record_person', episode_id:began.ep, is_caller:false, change_kind:'first', person_key:null, supersedes_row_id:null, reason:null,
            name:o.name, relationship:o.rel || null, organization:null, roles:o.roles, phone:o.phone || null, email:null, reach_way:null, reach_time:null,
            permission:'not_asked', permission_asked_by:null, permission_asked_at:null });
          if(r.outcome !== 'recorded'){ msg = 'Not added: ' + (r.message || r.reason || 'the server said no'); return; }
          msg = o.name + ' is in People involved now.';
          if(typeof LPI !== 'undefined' && LPI.began) delete LPI.began[l.id];
        } else msg = 'Not added. It will not be offered again.';
        a.visit.people_offers = Object.assign({}, a.visit.people_offers || {}, { [k]: b.hasAttribute('data-fn-add') ? 'added' : 'not_now' });
        if(typeof persist === 'function') await persist('care_assessments', a);
      }catch(e){ msg = 'Not saved: ' + ((e && e.message) || 'error'); }
      finally{ busy = false; await load(); try{ if(typeof lppRender === 'function') lppRender(); }catch(_){} }
    };
  }
  window.FNOTE = { load, _offersFrom: offersFrom };
})();
