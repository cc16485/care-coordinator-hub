/* =====================================================================================================================
   PROFILE CARDS, profile fill Stage C (Samantha 2026-11-21: "Yes, build Stage C"; the map she approved).
   What the home visit and the signed agreement filled on the client's profile record (client_profiles), shown where the
   team works, and editable there (Save writes the same record, with your name):
     care   (Care tab, Assessments)  Health, Medicines, Equipment, Their goals
     team   (Team & Schedule)        Hours the family wants, Early Support Visits
     payer  (Payer)                  Care level and rate: signed on the agreement, and what the visit proposed
   Only empty places are ever filled by the visit or the agreement; a different answer is a My Work card (the server).
     PCARD.render('care' | 'team' | 'payer')
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const D = () => (typeof DATA !== 'undefined' && DATA) || {};
  const KINDS = {
    care: { host:'pcCareHost', title:'Health, medicines and goals', note:'From the home visit. The care plan and AxisCare tasks still come from the approved care plan.',
      fields:[['health','Health (conditions, warning signs, pain, memory)',4], ['medicines','Medicines',3], ['equipment','Equipment',2], ['goals','Their goals',3]] },
    team: { host:'pcTeamHost', title:'What the family wants', note:'From the home visit and the signed agreement. Use it when you plan the team and the schedule.',
      fields:[['hours_wanted','Hours the family wants',4], ['esv','Early Support Visits',2]] },
    payer: { host:'pcPayerHost', title:'Care level and rate', note:'The signed agreement is what the family agreed to. The visit\'s answer is what was proposed before signing.',
      fields:[['level_signed','Care level (signed agreement)',1], ['rate_signed','Hourly rate (signed agreement)',1], ['level_proposed','Care level (proposed at the visit)',1], ['rate_proposed','Hourly rate (proposed at the visit)',1]] },
  };
  function ctx(){
    if(typeof CP === 'undefined') return null;
    const ax = String(CP.ax || ''), l = CP.lead || null, name = (CP.r && CP.r.client_name) || (l && typeof cpLeadClientName === 'function' ? cpLeadClientName(l) : '') || '';
    const id = /^\d+$/.test(ax) ? 'cp_ax' + ax : 'cp_nm' + String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return { id, ax, name, prof:(D().client_profiles || []).find(p => p && p.id === id) || null };
  }
  function render(kind){
    const K = KINDS[kind], h = K && document.getElementById(K.host); if(!h) return;
    const c = ctx(); if(!c){ h.innerHTML = ''; return; }
    const p = c.prof || {};
    const any = K.fields.some(f => String(p[f[0]] || '').trim());
    const ff = (Array.isArray(p.filled_from) ? p.filled_from : []).slice(-1)[0];
    h.innerHTML = '<details class="card" ' + (any ? 'open' : '') + ' style="padding:12px 16px;margin-bottom:12px;">'
      + '<summary style="cursor:pointer;font-weight:800;color:var(--navy);font-size:15px;">' + esc(K.title) + (any ? '' : ' <span class="field-note" style="font-weight:400;">(nothing from the visit or the agreement yet)</span>') + '</summary>'
      + '<div class="field-note" style="margin:4px 0 8px;">' + esc(K.note) + (ff ? ' Last filled from ' + (ff.from === 'visit' ? 'the home visit' : 'the signed agreement') + ' on ' + esc(String(ff.at || '').slice(0, 10)) + '.' : '') + '</div>'
      + K.fields.map(f => '<label style="display:block;font-size:12.5px;font-weight:700;color:var(--text-muted);margin:6px 0 3px;">' + esc(f[1]) + '</label>'
        + (f[2] > 1 ? '<textarea data-pc-k="' + f[0] + '" rows="' + f[2] + '" style="width:100%;font-size:13px;">' + esc(p[f[0]] || '') + '</textarea>'
          : '<input type="text" data-pc-k="' + f[0] + '" value="' + esc(p[f[0]] || '') + '" style="width:100%;font-size:13px;">')).join('')
      + '<div style="margin-top:8px;display:flex;gap:8px;align-items:center;"><button type="button" class="secondary" data-pc-save="' + kind + '">Save</button><span class="field-note" data-pc-msg></span></div>'
      + '</details>';
    h.querySelector('[data-pc-save]').onclick = async () => {
      const cur = ctx(), msg = h.querySelector('[data-pc-msg]'); if(!cur) return;
      const item = Object.assign({}, cur.prof || { id:cur.id, client_name:cur.name, axiscare_client_id:/^\d+$/.test(cur.ax) ? cur.ax : '' });
      h.querySelectorAll('[data-pc-k]').forEach(i => { item[i.dataset.pcK] = i.value.trim(); });
      item.updated_at = new Date().toISOString(); item.updated_by = (typeof ME !== 'undefined' && ME && ME.name) || '';
      try{
        if(typeof persist === 'function') await persist('client_profiles', item);
        const d = D(); d.client_profiles = (d.client_profiles || []).filter(x => x.id !== item.id).concat([item]);
        msg.textContent = 'Saved.';
      }catch(e){ msg.textContent = 'Not saved: ' + ((e && e.message) || 'error'); }
    };
  }
  window.PCARD = { render, KINDS };
})();
