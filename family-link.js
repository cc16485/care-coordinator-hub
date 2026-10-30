/* =====================================================================================================================
   WHO DID THEY CALL FOR? (Samantha 2026-10-29: "Can you do the same for our leads on the Caring Companions sub account",
   after the CDS hub's linking, caring-companions-cds #118/#119; her pick: build on what the CC Hub already has.)
   When the son or daughter calls first and comes in as their own lead, one window says who they called for:
     - a family or client we already know: Link. The caller goes on that family's People involved (the Journey's own
       record_person door, with their phone), their notes, calls and texts, call back date and form answers move over
       (each marked as from their call), and their own lead closes as linked (archived, saying where it went).
       Unlink puts it all back.
     - someone new: type the client's name and this lead becomes the client's; the caller stays the caller.
   Builds on the existing pieces: the fold (ckFold: archived + folded_into), People involved (journey_person) and the
   Family Circle (people go into care from People involved, as before). Nothing is sent to anyone.
   A client with no inquiry on file (older AxisCare clients) uses the existing "Fold into the client" path instead.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const D = () => (typeof DATA !== 'undefined' ? DATA : root.DATA) || {};
  const digits = x => { const d = String(x || '').replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d; };
  const callerName = l => [l && l.first_name, l && l.last_name].filter(Boolean).join(' ').replace(/^\(phone lead\)\s*/i, '').trim();
  const clientName = l => (typeof root.cpLeadClientName === 'function' ? root.cpLeadClientName(l) : ((l.client_first_name || '') + ' ' + (l.client_last_name || '')).trim()) || '(no name)';
  const firstOf = n => String(n || '').trim().split(/\s+/)[0] || '';
  /* LPI is a const in the page's script, so it is reached by name, not on window */
  const dropBegan = id => { try{ if(typeof LPI !== 'undefined' && LPI.began) delete LPI.began[id]; }catch(e){} };
  const actor = () => { try{ return root.ccActor ? root.ccActor() : {}; }catch(e){ return {}; } };

  /* ── pure rules ── */
  /* the leads linked to this family (their callers), newest first */
  function linkedTo(leadId, leads){ return (leads || []).filter(x => x && x.linked_to && String(x.linked_to.lead_id) === String(leadId)).sort((a, b) => String(b.linked_to.at).localeCompare(String(a.linked_to.at))); }
  /* the words search looks at for a family: theirs, and their linked callers' names and numbers */
  function searchWords(l, leads){ return linkedTo(l && l.id, leads).map(c => [callerName(c), c.phone, digits(c.phone), c.email].filter(Boolean).join(' ')).join(' '); }
  const live = l => l && !l.archived && String(l.status || '') !== 'Lost' && !(l.spam && l.spam.at);
  /* who they might have called for: open inquiries and clients (inquiries with an AxisCare id), by name or phone.
     q = what was typed; with nothing typed, the ones sharing a number or the client name come first. */
  function candidates(l, q, leads, clients){
    q = String(q || '').trim().toLowerCase(); const qd = digits(q), out = [], seen = new Set();
    const phones = [l.phone, l.client_phone].map(digits).filter(p => p.length >= 7);
    (leads || []).forEach(x => {
      if(!x || x.id === l.id || x.linked_to || !(live(x) || String(x.axiscare_client_id || '').trim())) return;
      if(x.archived || (x.spam && x.spam.at)) return;
      const nm = clientName(x), hay = [nm, callerName(x), x.email].join(' ').toLowerCase(), xp = [x.phone, x.client_phone].map(digits);
      let why = '';
      if(q){ if(hay.indexOf(q) > -1) why = 'name'; else if(qd.length >= 3 && xp.some(p => p && p.indexOf(qd) > -1)) why = 'phone'; else return; }
      else { if(phones.some(p => xp.indexOf(p) > -1)) why = 'same phone'; else if(l.client_last_name && String(x.client_last_name || '').toLowerCase() === String(l.client_last_name).toLowerCase()) why = 'same last name'; else return; }
      const ax = String(x.axiscare_client_id || '').trim();
      if(ax) seen.add(ax);
      out.push({ kind:'lead', id:x.id, name:nm, ax, sub:(ax ? 'Client, AxisCare #' + ax : 'Open inquiry') + (x.assigned_coordinator ? ' · ' + firstOf(x.assigned_coordinator) + '’s' : '') + (why && !q ? ' · ' + why : ''), strong:why === 'same phone' });
    });
    (clients || []).forEach(c => {
      if(!c || !c.axiscare_client_id || seen.has(String(c.axiscare_client_id)) || c.role_status !== 'active') return;
      const hay = String(c.client_name || '').toLowerCase(), cp = digits(c.phone);
      if(q){ if(!(hay.indexOf(q) > -1 || (qd.length >= 3 && cp && cp.indexOf(qd) > -1))) return; }
      else if(!(cp && phones.indexOf(cp) > -1)) return;
      out.push({ kind:'client', ax:String(c.axiscare_client_id), name:c.client_name, sub:'Client, AxisCare #' + c.axiscare_client_id + ' · no inquiry on file' });
    });
    return out.sort((a, b) => (b.strong ? 1 : 0) - (a.strong ? 1 : 0) || a.name.localeCompare(b.name)).slice(0, 8);
  }
  /* what moves from the caller's lead to the family's: copies marked linked_from, so Unlink can take exactly them back */
  function moveOver(caller, kept, nowIso){
    const who = callerName(caller) || 'the caller', tag = { linked_from:caller.id };
    const notes = (Array.isArray(caller.comm_log) ? caller.comm_log : []).filter(n => n && n.body).map(n => Object.assign({}, n, tag, { body:'From ' + who + '’s call: ' + n.body }));
    const form = [['Why they called', caller.why_called], ['Notes', caller.interest_notes], ['Hours a week', caller.number_of_hours], ['Days', caller.days_needed], ['Times', caller.times_needed], ['Source', [caller.source, caller.referral_source_name].filter(Boolean).join(', ')]]
      .filter(x => x[1] && String(x[1]).trim()).map(x => x[0] + ': ' + String(Array.isArray(x[1]) ? x[1].join(', ') : x[1]).trim());
    if(form.length) notes.push(Object.assign({ at:caller.created_at || nowIso, by:caller.assigned_coordinator || '', kind:'linked_form' }, tag, { body:'From ' + who + '’s own inquiry: ' + form.join(' · ') }));
    const events = (Array.isArray(caller.contact_events) ? caller.contact_events : []).filter(e => e && e.at && e.outcome !== 'inquiry').map(e => Object.assign({}, e, tag, { note:[who, e.note].filter(Boolean).join(': ') }));
    /* the call back date moves when the family has none, or a later one */
    const fu = caller.follow_up_due && (!kept.follow_up_due || String(caller.follow_up_due) < String(kept.follow_up_due)) ? { day:String(caller.follow_up_due).slice(0, 10), time:caller.follow_up_time || '', why:caller.follow_up_note || ('Call ' + firstOf(who) + ' back') } : null;
    return { notes, events, fu, before_fu:{ follow_up_due:kept.follow_up_due || null, follow_up_time:kept.follow_up_time || null, follow_up_note:kept.follow_up_note || null } };
  }
  function applyLink(caller, kept, mv, info){
    kept.comm_log = (Array.isArray(kept.comm_log) ? kept.comm_log : []).concat(mv.notes);
    kept.contact_events = (Array.isArray(kept.contact_events) ? kept.contact_events : []).concat(mv.events).sort((a, b) => String(a.at).localeCompare(String(b.at)));
    if(mv.fu && root.LeadRules) root.LeadRules.setNext(kept, { kind:'follow_up', day:mv.fu.day, time:mv.fu.time, why:mv.fu.why });
    const now = info.at;
    caller.linked_to = { lead_id:kept.id, name:clientName(kept), relationship:info.relationship || caller.relationship || '', person_key:info.person_key || null, person_row:info.person_row || null,
      by:info.by, at:now, moved:{ notes:mv.notes.length, events:mv.events.length, fu:mv.fu ? mv.fu.day : null }, before_fu:mv.fu ? mv.before_fu : null, was:{ archived:!!caller.archived, archive_reason:caller.archive_reason || null } };
    caller.archived = true; caller.archived_at = now; caller.archived_by = info.by; caller.archive_reason = 'Linked: called for ' + clientName(kept);
    caller.folded_into = { kind:'lead', lead_id:kept.id, linked_caller:true, by:info.by, at:now };
  }
  /* Unlink: the copies come off the family, its call back date goes back if nobody changed it since, the caller's lead reopens */
  function applyUnlink(caller, kept){
    const lk = caller.linked_to; if(!lk) return;
    if(kept){
      kept.comm_log = (kept.comm_log || []).filter(n => !(n && n.linked_from === caller.id));
      kept.contact_events = (kept.contact_events || []).filter(e => !(e && e.linked_from === caller.id));
      if(lk.before_fu && lk.moved && lk.moved.fu && String(kept.follow_up_due || '').slice(0, 10) === lk.moved.fu) Object.assign(kept, lk.before_fu);
    }
    caller.archived = !!(lk.was && lk.was.archived); caller.archive_reason = lk.was ? lk.was.archive_reason : null;
    if(!caller.archived){ delete caller.archived_at; delete caller.archived_by; }
    delete caller.folded_into; delete caller.linked_to;
  }

  /* ── the window ── */
  let busy = false;
  async function open(id){
    const l = (D().leads || []).find(x => x && x.id === id); if(!l || busy) return;
    let clients = []; try{ clients = typeof root.cl360Identity === 'function' ? await root.cl360Identity() : []; }catch(e){ clients = []; }
    const who = callerName(l) || 'the caller', ov = document.createElement('div');
    ov.className = 'fl-ov';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(13,54,95,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto;';
    ov.innerHTML = '<div role="dialog" aria-modal="true" aria-labelledby="flTitle" style="background:#fff;border-radius:16px;max-width:640px;width:100%;padding:20px 22px;box-shadow:0 20px 50px rgba(0,0,0,.25);">'
      + '<div id="flTitle" style="font-weight:800;color:var(--navy);font-size:18px;">Who did ' + esc(firstOf(who) || 'they') + ' call for?</div>'
      + '<div class="field-note" style="margin-top:4px;">If ' + esc(firstOf(who) || 'they') + ' called about a family or client we already know, link them: ' + esc(firstOf(who) || 'they') + ' goes on that family’s People involved with their phone, and their notes, calls, call back date and form answers move over. Nothing is sent to anyone, and Unlink puts it all back.</div>'
      + '<label for="flQ" class="lb-k" style="display:block;margin-top:14px;">Search a family or client, by name or phone</label>'
      + '<input id="flQ" autocomplete="off" placeholder="e.g. Walter or 555-0142" style="width:100%;box-sizing:border-box;padding:10px 12px;font-size:14px;border:1.5px solid var(--border);border-radius:10px;margin-top:4px;">'
      + '<div id="flList" role="list" style="margin-top:8px;"></div>'
      + '<div style="border-top:1px solid var(--border);margin-top:14px;padding-top:12px;"><div style="font-weight:700;color:var(--navy);">Someone new</div>'
      + '<div class="field-note">This lead becomes the client’s. ' + esc(who) + ' stays as the caller, with their phone.</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;"><label class="lt-sr" for="flFirst">Client first name</label><input id="flFirst" placeholder="Client first name" style="flex:1 1 140px;padding:8px 10px;border:1.5px solid var(--border);border-radius:10px;">'
      + '<label class="lt-sr" for="flLast">Client last name</label><input id="flLast" placeholder="Last name" value="' + esc(l.client_last_name || l.last_name || '') + '" style="flex:1 1 140px;padding:8px 10px;border:1.5px solid var(--border);border-radius:10px;">'
      + '<label class="lt-sr" for="flRel">' + esc(firstOf(who) || 'The caller') + ' is their</label><select id="flRel" style="padding:8px 10px;border:1.5px solid var(--border);border-radius:10px;"><option value="">' + esc(firstOf(who) || 'Caller') + ' is their…</option>' + ['daughter', 'son', 'spouse', 'sibling', 'grandchild', 'niece or nephew', 'friend', 'neighbor', 'other'].map(r => '<option' + (String(l.relationship || '').toLowerCase() === r ? ' selected' : '') + '>' + r + '</option>').join('') + '</select>'
      + '<button class="secondary" id="flNew">This lead is for them</button></div></div>'
      + '<p id="flMsg" role="status" class="field-note" style="margin:10px 0 0;color:#9B2C1A;"></p>'
      + '<div style="display:flex;gap:8px;margin-top:12px;"><button class="secondary" id="flClose">Close</button></div></div>';
    document.body.appendChild(ov);
    const $ = s => ov.querySelector(s), msg = t => { $('#flMsg').textContent = t || ''; };
    const close = () => ov.remove();
    const draw = () => {
      const list = candidates(l, $('#flQ').value, D().leads, clients);
      $('#flList').innerHTML = list.length ? list.map((c, i) => '<div role="listitem" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-top:8px;">'
        + '<div style="flex:1 1 240px;"><div style="font-weight:700;color:var(--navy);">' + esc(c.name) + '</div><div class="field-note" style="font-size:12.5px;">' + esc(c.sub) + '</div></div>'
        + '<button class="' + (c.strong ? 'primary' : 'secondary') + '" data-i="' + i + '" style="white-space:nowrap;">Link ' + esc(firstOf(who) || 'them') + ' to ' + esc(firstOf(c.name)) + '</button></div>').join('')
        : '<div class="field-note" style="margin-top:8px;">' + ($('#flQ').value.trim() ? 'No family or client matches that.' : 'Type a name or phone number to find the family.') + '</div>';
      $('#flList').querySelectorAll('[data-i]').forEach(b => b.onclick = () => pick(list[+b.dataset.i], b));
    };
    const pick = async (c, b) => {
      if(c.kind === 'client'){
        /* an older client with no inquiry on file: the existing fold into the client (her change-in-care path) */
        if(!(await root.ccConfirm('Link ' + who + ' to ' + c.name + '? ' + c.name + ' has no inquiry on file, so this lead is folded into the client and its notes go with the change in care. Add ' + firstOf(who) + ' to their Family Circle on their profile.'))) return;
        close(); if(typeof root.ckFold === 'function') await root.ckFold(l, { kind:'client', axiscare_client_id:c.ax });
        if(typeof root.openClient === 'function') root.openClient({ ax:c.ax }, 'summary'); return;
      }
      const kept = (D().leads || []).find(x => x && x.id === c.id); if(!kept) return;
      b.disabled = true; msg('');
      const r = await link(l, kept, { relationship:$('#flRel').value || l.relationship || '' });
      if(r.error){ b.disabled = false; msg(r.error); return; }
      close(); if(typeof root.ccToast === 'function') root.ccToast(r.text);
    };
    $('#flQ').oninput = draw; $('#flClose').onclick = close; ov.addEventListener('click', e => { if(e.target === ov) close(); });
    $('#flNew').onclick = async () => {
      const f = $('#flFirst').value.trim(), la = $('#flLast').value.trim(), rel = $('#flRel').value;
      if(!f){ msg('Type the client’s first name.'); return; }
      if(!rel){ msg('Pick how ' + (firstOf(who) || 'the caller') + ' is related to them.'); return; }
      Object.assign(l, { client_first_name:f, client_last_name:la, client_name_not_provided:false, relationship:rel });
      close(); await root.persist('leads', l); redraw();
      if(typeof root.ccToast === 'function') root.ccToast('This lead is now ' + f + (la ? ' ' + la : '') + '’s. ' + (firstOf(who) || 'The caller') + ' stays the caller.');
    };
    draw(); $('#flQ').focus();
  }

  /* the link itself: the caller onto People involved first (if the family's Journey is open), then both leads are saved */
  async function link(caller, kept, o){
    if(busy) return { error:'Still working on the last one.' }; busy = true;
    try{
      const a = actor(), now = new Date().toISOString(), who = callerName(caller) || 'The caller';
      let person = { key:null, row:null, note:'' };
      if(typeof root.lpiLoadBegan === 'function' && typeof root.lpfCall === 'function'){
        let b = null; try{ dropBegan(kept.id); b = await root.lpiLoadBegan(kept); }catch(e){ b = null; }
        if(b && b.ep){
          let r; try{ r = await root.lpfCall({ action:'record_person', episode_id:b.ep, is_caller:false, change_kind:'first', person_key:null, supersedes_row_id:null, name:who,
            relationship:o.relationship || null, organization:null, roles:[], phone:caller.phone || null, email:caller.email || null, reach_way:null, reach_time:null, permission:'not_asked',
            permission_asked_by:null, permission_asked_at:null, reason:null }); }catch(e){ r = { error:String(e && e.message || e) }; }
          if(!r || r.outcome !== 'recorded') return { error:'Not linked: ' + who + ' could not be added to People involved (' + ((r && (r.message || r.reason || r.error)) || 'no answer') + '). Nothing changed.' };
          person = { key:r.person_key || null, row:r.row_id || null, note:'' };
          dropBegan(kept.id);
        } else person.note = ' Their Journey is not open yet, so add ' + firstOf(who) + ' to People involved once it is.';
      }
      const mv = moveOver(caller, kept, now);
      applyLink(caller, kept, mv, { at:now, by:a.email || '', relationship:o.relationship, person_key:person.key, person_row:person.row });
      await root.persist('leads', kept); await root.persist('leads', caller);
      try{ if(typeof root.opsReconcileLeads === 'function') root.opsReconcileLeads(); }catch(e){}
      redraw();
      return { text:who + ' is linked to ' + clientName(kept) + '. ' + [mv.notes.length ? mv.notes.length + ' note' + (mv.notes.length === 1 ? '' : 's') : '', mv.events.length ? mv.events.length + ' call' + (mv.events.length === 1 ? '' : 's') + ' and texts' : '', mv.fu ? 'the call back date' : ''].filter(Boolean).join(', ').replace(/^./, s => s.toUpperCase()) + (mv.notes.length || mv.events.length || mv.fu ? ' moved over.' : '') + person.note };
    } finally { busy = false; }
  }
  async function unlink(callerId, btn){
    const caller = (D().leads || []).find(x => x && x.id === callerId); if(!caller || !caller.linked_to) return;
    const kept = (D().leads || []).find(x => x && x.id === caller.linked_to.lead_id) || null, who = callerName(caller) || 'the caller';
    if(!(await root.ccConfirm('Unlink ' + who + ' from ' + (kept ? clientName(kept) : 'this family') + '? Their own lead opens again, and the notes, calls and call back date that moved over go back with it.'))) return;
    if(btn) btn.disabled = true;
    const lk = caller.linked_to;
    if(lk.person_key && kept && typeof root.lpiLoadBegan === 'function'){
      let b = null; try{ dropBegan(kept.id); b = await root.lpiLoadBegan(kept); }catch(e){}
      const cur = b && (b.people || []).find(p => p.person_key === lk.person_key);
      if(cur){ let r; try{ r = await root.lpfCall({ action:'record_person', episode_id:b.ep, is_caller:false, change_kind:'removed', person_key:cur.person_key, supersedes_row_id:cur.row_id,
        name:cur.name, relationship:cur.relationship, organization:null, roles:[], phone:null, email:null, reach_way:null, reach_time:null, permission:'not_asked', permission_asked_by:null, permission_asked_at:null, reason:'Unlinked: their own lead was opened again' }); }catch(e){ r = { error:String(e && e.message || e) }; }
        if(!r || r.outcome !== 'recorded'){ if(btn) btn.disabled = false; alert('Not unlinked: ' + who + ' could not be taken off People involved (' + ((r && (r.message || r.reason || r.error)) || 'no answer') + '). Nothing changed.'); return; } }
      dropBegan(kept.id);
    }
    applyUnlink(caller, kept);
    if(kept) await root.persist('leads', kept); await root.persist('leads', caller);
    try{ if(typeof root.opsReconcileLeads === 'function') root.opsReconcileLeads(); }catch(e){}
    redraw(); try{ if(typeof root.lppRender === 'function') root.lppRender(); }catch(e){}
    if(typeof root.ccToast === 'function') root.ccToast(who + ' is unlinked. Their own lead is open again.');
  }
  const redraw = () => { try{ root.renderLeadsStarts && root.renderLeadsStarts(); }catch(e){} try{ root.renderLeadProfile && root.renderLeadProfile(); }catch(e){} };

  /* ── on the profile: under People involved, each linked caller with Unlink (the same person row when they are on the Journey) ── */
  function noteFor(personKey, leadId){
    const c = linkedTo(leadId, D().leads).find(x => x.linked_to.person_key && x.linked_to.person_key === personKey); if(!c) return '';
    return '<div class="lp-prov fl-note">Linked from ' + esc(firstOf(callerName(c)) || 'their') + '’s own call, ' + esc(dateWords(c.linked_to.at)) + (c.linked_to.by ? ', by ' + esc(byWords(c.linked_to.by)) : '')
      + ' · <button class="lp-link" onclick="flUnlink(\'' + esc(c.id) + '\', this)">Unlink</button> · <button class="lp-link" data-open-lead="' + esc(c.id) + '" data-open-tab="summary">Their lead</button></div>';
  }
  function extraHtml(leadId){
    const list = linkedTo(leadId, D().leads).filter(c => !c.linked_to.person_key); if(!list.length) return '';
    return list.map(c => '<div class="lpp-person"><div class="lpp-top"><b>' + esc(callerName(c) || 'The caller') + '</b>' + (c.linked_to.relationship ? ' <span class="lp-prov">' + esc(c.linked_to.relationship) + '</span>' : '') + ' <span class="lp-tag unk">linked caller</span></div>'
      + '<div class="lp-prov">' + [c.phone, c.email].filter(Boolean).map(esc).join(' · ') + '</div>'
      + '<div class="lp-prov fl-note">Linked from their own call, ' + esc(dateWords(c.linked_to.at)) + (c.linked_to.by ? ', by ' + esc(byWords(c.linked_to.by)) : '') + '. Not on People involved yet (the Journey was not open). '
      + '<button class="lp-link" onclick="flUnlink(\'' + esc(c.id) + '\', this)">Unlink</button> · <button class="lp-link" data-open-lead="' + esc(c.id) + '" data-open-tab="summary">Their lead</button></div></div>').join('');
  }
  function dateWords(iso){ const ms = Date.parse(iso); if(isNaN(ms)) return ''; return new Date(ms).toLocaleDateString('en-US', { month:'short', day:'numeric', timeZone:'America/Chicago' }); }
  function byWords(e){ try{ return typeof root.lpscName === 'function' ? root.lpscName(e) : String(e).split('@')[0]; }catch(x){ return String(e).split('@')[0]; } }

  const api = { linkedTo, searchWords, candidates, moveOver, applyLink, applyUnlink, open, link, unlink, noteFor, extraHtml };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FamilyLink = api;
  root.flOpen = open; root.flUnlink = unlink;
})(typeof globalThis !== 'undefined' ? globalThis : this);
