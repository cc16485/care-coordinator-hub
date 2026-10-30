/* =====================================================================================================================
   CALL NOTES FROM RECORDED CALLS (Samantha 2026-10-29: "Can you do the same for our leads on the Caring Companions sub
   account", after the CDS hub's call notes, caring-companions-cds #121; approved CDS mockup
   https://claude.ai/artifact/6CxaqzDSJABjRYnGxc6tZg). Built on the CC Hub's own call reader: call-learn already reads every
   answered recorded call on a lead (call_learned); from 2026-10-29 each reading also carries a short note, a suggested call
   back day and the phones of people heard. Here each note waits on the lead's row and profile until a person presses
   "OK, save it" (the note goes on the lead's call log, the call back date is set) or "Not about them". Read the whole call
   and Listen come from GoHighLevel through call-to-lead, for the signed-in person only. Add as a contact puts a person
   heard on the call on the family's People involved. Internal only: nothing is sent to anyone.
   Switch: ops_settings.call_notes_live (starts off). While off, an owner can preview it in this browser only.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const D = () => (typeof DATA !== 'undefined' ? DATA : root.DATA) || {};
  const PREVIEW_KEY = 'cnPreview';
  const CN = { rows:[], at:0, busy:false, err:'', saving:'' };

  /* ── pure rules ── */
  function liveOn(settings){ return !!(settings && settings.call_notes_live === true); }
  function previewOn(){ try{ return root.localStorage && root.localStorage.getItem(PREVIEW_KEY) === '1'; }catch(e){ return false; } }
  function showing(settings, isOwner){ return liveOn(settings) || (!!isOwner && previewOn()); }
  /* a reading waits when it has a note or a call back and nobody has decided it yet */
  function waiting(rows){ return (rows || []).filter(r => r && r.status === 'read' && !r.decided && r.reading && r.reading.call_note && (r.reading.call_note.note || r.reading.call_note.call_back)); }
  function forLead(id, rows){ return waiting(rows).filter(r => String(r.lead_id) === String(id)).sort((a, b) => String(b.msg_at).localeCompare(String(a.msg_at))); }
  const digits = x => String(x || '').replace(/\D/g, '').slice(-10);
  const phoneWords = d => { d = digits(d); return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : ''; };
  /* people heard on the call who are not already the caller, the client or on People involved */
  function heardNew(row, lead, known){
    const names = new Set([[lead.first_name, lead.last_name].join(' '), [lead.client_first_name, lead.client_last_name].join(' ')].concat((known || []).map(p => p && p.name)).map(n => String(n || '').trim().toLowerCase()).filter(Boolean));
    return ((row.reading && row.reading.profile && row.reading.profile.people) || []).filter(p => p && p.name && !names.has(String(p.name).trim().toLowerCase()));
  }
  /* what OK does to the lead: the note on the call log (marked with the call), the call back date set */
  function applyOk(lead, row, note, day, by){
    lead.comm_log = (Array.isArray(lead.comm_log) ? lead.comm_log : []).concat({ body:String(note).trim(), at:row.msg_at, by:by || '', kind:'call_note', from_call:row.message_id });
    const cb = row.reading.call_note.call_back;
    if(day && root.LeadRules) root.LeadRules.setNext(lead, { kind:'follow_up', day, time:'', why:(cb && cb.why) || 'Call back (from the call note)' });
    return lead;
  }

  /* ── loading (every minute at most, while it is showing) ── */
  async function load(force){
    if(CN.busy || typeof sb === 'undefined' || !sb) return;
    if(!force && Date.now() - CN.at < 60e3) return;
    CN.busy = true;
    try{
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const { data, error } = await sb.from('call_learned').select('message_id, lead_id, msg_at, direction, seconds, staff, status, reading, decided').eq('status', 'read').is('decided', null).gte('msg_at', since).order('msg_at', { ascending:false }).limit(300);
      if(error) throw error;
      CN.rows = data || []; CN.err = '';
    }catch(e){ CN.err = String((e && e.message) || e || 'could not read'); }
    CN.at = Date.now(); CN.busy = false; redraw();
  }
  const redraw = () => { try{ root.renderLeadsStarts && root.renderLeadsStarts(); }catch(e){} try{ renderProfile(); }catch(e){} };
  const on = () => { try{ return showing(D().ops_settings || {}, typeof root.ccIsOwner === 'function' && root.ccIsOwner()); }catch(e){ return false; } };

  /* ── drawing ── */
  function when(iso){ const ms = Date.parse(iso); if(isNaN(ms)) return ''; return new Date(ms).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZone:'America/Chicago' }); }
  function staffWords(e){ if(!e) return ''; try{ return typeof root.lpscName === 'function' ? root.lpscName(e) : String(e).split('@')[0]; }catch(x){ return String(e).split('@')[0]; } }
  function panel(row, lead){
    style();
    const id = esc(row.message_id), cn = row.reading.call_note, first = esc(String((root.cpLeadClientName ? root.cpLeadClientName(lead) : lead.first_name) || 'them').split(' ')[0]);
    const mins = Math.max(1, Math.round((row.seconds || 0) / 60)), cb = cn.call_back;
    const heard = heardNew(row, lead, []);
    return '<div class="cn-panel" id="cn_' + id + '" data-no-open="1">'
      + '<div class="cn-head"><b>Call note to check: ' + esc(when(row.msg_at)) + ' (' + mins + ' min' + (row.staff ? ', ' + esc(staffWords(row.staff)) : '') + ')</b>'
      + '<span><button type="button" class="linklike" onclick="cnWhole(\'' + id + '\')">Read the whole call</button> · <button type="button" class="linklike" onclick="cnListen(\'' + id + '\')">Listen</button></span></div>'
      + '<div class="cn-grid"><div><label class="cn-lbl" for="cnt_' + id + '">Note</label><textarea id="cnt_' + id + '" rows="3">' + esc(cn.note || '') + '</textarea></div>'
      + '<div><label class="cn-lbl" for="cnd_' + id + '">Call back</label><input type="date" id="cnd_' + id + '" value="' + esc(cb ? cb.day : '') + '">' + (cb && cb.why ? '<div class="cn-small">' + esc(cb.why) + '</div>' : '')
      + (heard.length ? '<div class="cn-lbl" style="margin-top:8px;">Heard on the call</div>' + heard.map((p, i) => '<div class="cn-heard">' + esc(p.name) + (p.relationship ? ', ' + esc(p.relationship) : '') + (p.phone ? ', ' + esc(phoneWords(p.phone)) : '')
        + ' <button type="button" class="linklike" onclick="cnAddPerson(\'' + id + '\',' + i + ',this)">Add as a contact</button></div>').join('') : '') + '</div></div>'
      + '<div class="cn-media" id="cnm_' + id + '"></div>'
      + '<div class="cn-btns"><button type="button" class="primary"' + (CN.saving === row.message_id ? ' disabled' : '') + ' onclick="cnDecide(\'' + id + '\',\'ok\')">OK, save it</button>'
      + '<button type="button" class="secondary"' + (CN.saving === row.message_id ? ' disabled' : '') + ' onclick="cnDecide(\'' + id + '\',\'not_about\')">Not about ' + first + '</button>'
      + '<span class="cn-small" id="cne_' + id + '">Nothing is saved until someone presses OK.</span></div></div>';
  }
  /* on the Leads row: the newest note waiting, and how many more */
  function rowHtml(lead){
    if(!on()) return '';
    const list = forLead(lead.id, CN.rows); if(!list.length) return '';
    return panel(list[0], lead) + (list.length > 1 ? '<div class="cn-small" style="margin-top:4px;">' + (list.length - 1) + ' more on their profile.</div>' : '');
  }
  /* the line above the list: how many wait, or that they could not be loaded (never quietly missing) */
  function summaryHtml(){
    if(!on()) return '';
    load();
    const n = new Set(waiting(CN.rows).map(r => String(r.lead_id))).size;
    const pv = !liveOn(D().ops_settings || {}) ? ' <span class="cn-small">(Preview: only you see call notes, in this browser. Turn them on for everyone in Settings.)</span>' : '';
    if(CN.err) return '<div class="cn-sum cn-bad">Call notes could not be loaded: ' + esc(CN.err) + '. <button class="lp-link" onclick="CallNotes.load(true)">Try again</button>' + pv + '</div>';
    return n ? '<div class="cn-sum"><b>' + n + (n === 1 ? ' family has a call note' : ' families have call notes') + ' waiting for your OK.</b>' + pv + '</div>' : (pv ? '<div class="cn-sum">No call notes waiting.' + pv + '</div>' : '');
  }
  function renderProfile(){
    const box = document.getElementById('lp_callnotes'), l = typeof lpLead !== 'undefined' ? lpLead : null; if(!box) return;
    if(!l || !on()){ box.innerHTML = ''; return; }
    load();
    const list = forLead(l.id, CN.rows);
    box.innerHTML = list.map(r => panel(r, l)).join('');
  }

  /* ── the buttons ── */
  const rowOf = id => CN.rows.find(r => r.message_id === id);
  const leadOf = r => (D().leads || []).find(l => l && String(l.id) === String(r.lead_id));
  const say = (id, t) => { const e = document.getElementById('cne_' + id); if(e){ e.textContent = t; e.style.color = '#9B2C1A'; } };
  async function decide(id, what){
    const r = rowOf(id), l = r && leadOf(r); if(!r || !l || CN.saving) return;
    const note = String((document.getElementById('cnt_' + id) || {}).value || '').trim(), day = String((document.getElementById('cnd_' + id) || {}).value || '');
    if(what === 'ok' && !note){ say(id, 'Write the note first, or press Not about.'); return; }
    CN.saving = id;
    try{
      const { data, error } = await sb.rpc('call_learned_decide', { p_message_id:id, p_decided:what === 'ok' ? 'added' : 'wrong', p_note:what === 'ok' ? note : 'not about them' });
      if(error) throw error; if(data !== true) throw new Error('someone else already answered this note');
    }catch(e){ CN.saving = ''; say(id, 'Not saved: ' + String((e && e.message) || e)); return; }
    if(what === 'ok'){
      const a = typeof root.ccActor === 'function' ? root.ccActor() : {};
      applyOk(l, r, note, day, a.email || '');
      await root.persist('leads', l);
      try{ if(typeof root.opsReconcileLeads === 'function') root.opsReconcileLeads(); }catch(e){}
    }
    r.decided = what === 'ok' ? 'added' : 'wrong'; CN.saving = '';
    redraw();
    if(typeof root.ccToast === 'function') root.ccToast(what === 'ok' ? 'Saved on the lead' + (day ? ', call back ' + day : '') + '.' : 'Dropped: not about them.');
  }
  async function whole(id){
    const box = document.getElementById('cnm_' + id); if(!box) return;
    if(box.dataset.open === 't'){ box.innerHTML = ''; box.dataset.open = ''; return; }
    box.innerHTML = '<div class="cn-small">Loading…</div>';
    try{ const { status, data } = await root.callAction('call-to-lead', { action:'transcript', message_id:id });
      if(status >= 400 || !data || !data.transcript) throw new Error((data && data.error) || 'The call could not be read (' + status + ').');
      box.innerHTML = '<pre class="cn-transcript">' + esc(data.transcript) + '</pre>'; box.dataset.open = 't'; }
    catch(e){ box.innerHTML = '<div class="cn-small" style="color:#9B2C1A;">' + esc(e.message) + '</div>'; }
  }
  /* the recording plays from our server for the signed-in person, never a public link */
  async function listen(id){
    const box = document.getElementById('cnm_' + id); if(!box) return;
    box.innerHTML = '<div class="cn-small">Loading the recording…</div>'; box.dataset.open = '';
    try{
      const sess = await sb.auth.getSession(), tok = sess && sess.data && sess.data.session && sess.data.session.access_token;
      if(!tok) throw new Error('Sign in first.');
      const r = await fetch(CONFIG.supabase_url + '/functions/v1/call-to-lead', { method:'POST', headers:{ Authorization:'Bearer ' + tok, apikey:CONFIG.supabase_anon_key, 'Content-Type':'application/json' }, body:JSON.stringify({ action:'recording', message_id:id }) });
      if(!r.ok){ const j = await r.json().catch(() => ({})); throw new Error(j.error || 'The recording could not be played.'); }
      box.innerHTML = '<audio controls autoplay src="' + URL.createObjectURL(await r.blob()) + '" style="width:100%;"></audio>';
    }catch(e){ box.innerHTML = '<div class="cn-small" style="color:#9B2C1A;">' + esc(e.message) + '</div>'; }
  }
  /* Add as a contact: onto the family's People involved (the Journey's own door), with the phone heard */
  async function addPerson(id, i, btn){
    const r = rowOf(id), l = r && leadOf(r); if(!r || !l) return;
    const p = heardNew(r, l, [])[i]; if(!p) return;
    if(btn) btn.disabled = true;
    let b = null; try{ if(typeof LPI !== 'undefined' && LPI.began) delete LPI.began[l.id]; b = await root.lpiLoadBegan(l); }catch(e){}
    if(!b || !b.ep){ if(btn) btn.disabled = false; say(id, 'Their Journey is not open yet, so people cannot be added. Try again tomorrow.'); return; }
    if((b.people || []).some(x => String(x.name || '').trim().toLowerCase() === String(p.name).trim().toLowerCase())){ if(btn){ btn.outerHTML = '<span class="cn-small">already on People involved</span>'; } return; }
    let res; try{ res = await root.lpfCall({ action:'record_person', episode_id:b.ep, is_caller:false, change_kind:'first', person_key:null, supersedes_row_id:null, name:p.name, relationship:p.relationship || null,
      organization:null, roles:[], phone:p.phone || null, email:null, reach_way:null, reach_time:null, permission:'not_asked', permission_asked_by:null, permission_asked_at:null, reason:null }); }catch(e){ res = { error:String((e && e.message) || e) }; }
    if(!res || res.outcome !== 'recorded'){ if(btn) btn.disabled = false; say(id, 'Not added: ' + ((res && (res.message || res.reason || res.error)) || 'no answer')); return; }
    try{ if(typeof LPI !== 'undefined' && LPI.began) delete LPI.began[l.id]; }catch(e){}
    if(btn) btn.outerHTML = '<span class="cn-small">added to People involved</span>';
    try{ root.lppRender && root.lppRender(); }catch(e){}
  }

  let styled = false;
  function style(){
    if(styled || typeof document === 'undefined') return; styled = true;
    const s = document.createElement('style'); s.id = 'callNotesStyle';
    s.textContent = '.cn-panel{background:#FFFBF2;border:1.5px solid #F3D9B5;border-radius:14px;padding:12px 14px;margin:8px 0;}'
      + '.cn-head{display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:space-between;align-items:center;font-size:13.5px;color:#7A4E0B;}'
      + '.cn-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(180px,1fr);gap:12px;margin-top:8px;}@media (max-width:700px){.cn-grid{grid-template-columns:1fr;}}'
      + '.cn-grid textarea{width:100%;box-sizing:border-box;padding:8px 10px;font:inherit;font-size:13.5px;border:1.5px solid var(--border);border-radius:10px;}'
      + '.cn-grid input[type=date]{padding:7px 10px;border:1.5px solid var(--border);border-radius:10px;font:inherit;}'
      + '.cn-lbl{display:block;font-size:11px;font-weight:800;color:#55677a;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;}'
      + '.cn-small{font-size:12.5px;color:#55677a;}.cn-heard{font-size:13px;margin-top:3px;}'
      + '.cn-btns{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px;}.cn-btns button{padding:7px 14px;font-size:13px;}'
      + '.cn-transcript{white-space:pre-wrap;max-height:280px;overflow:auto;background:#fff;border:1px solid var(--border);border-radius:10px;padding:10px;font-size:12.5px;margin:8px 0 0;}'
      + '.cn-sum{margin:0 0 10px;padding:8px 12px;border-radius:10px;background:#FDF1DC;color:#7A4E0B;font-size:13.5px;}.cn-bad{background:#FBE7E3;color:#9B2C1A;}';
    document.head.appendChild(s);
  }
  function cnPreview(v){ try{ if(v) root.localStorage.setItem(PREVIEW_KEY, '1'); else root.localStorage.removeItem(PREVIEW_KEY); }catch(e){} redraw(); }

  const api = { liveOn, previewOn, showing, waiting, forLead, heardNew, applyOk, load, rowHtml, summaryHtml, renderProfile, panel, state:CN };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CallNotes = api;
  Object.assign(root, { cnDecide:decide, cnWhole:whole, cnListen:listen, cnAddPerson:addPerson, cnPreview });
})(typeof globalThis !== 'undefined' ? globalThis : this);
