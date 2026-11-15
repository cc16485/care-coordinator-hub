/* =====================================================================================================================
   OWNERS ONLY · the private inbox and "Message the owners" (Samantha 2026-11-14, Care & Connection).
   window.OIX
     compose()   any signed-in office person: a private message to Samantha and Zach, sent as themselves.
     render()    owners: Today > Private messages. Read, mark handled, keep a private note, reply (the sender is told a
                 message is waiting, never the words; they open it with their own PIN), or share a short note with one
                 office person (only the words typed here; a warning if the message names that person).
   The page only draws. The server (owner-inbox) decides who may read: it checks the Hub sign-in against staff_roles
   owner_admin and refuses everyone else, whatever this page shows. Nothing here is saved in the Hub's shared records,
   so My Work, Team Work, Ask Cara, reports and the Check-ins tab never hold or count a private message.
   ===================================================================================================================== */
(function(){
  'use strict';
  const API = 'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/owner-inbox';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const KIND = { concern:'A concern', idea:'A suggestion', thanks:'Praise or a compliment', sensitive:'Something sensitive' };
  const ROLE = { family:'Client family', caregiver:'Caregiver', staff:'Office team', other:'Someone else' };
  const REPLY = { call:'Wants a call', private:'Wants a written reply', none:'No reply needed' };
  const ST = { list:null, open:null, err:'', view:'open', loading:false, at:0 };
  const when = iso => { try{ return new Date(iso).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZone:'America/Chicago' }); }catch(_){ return ''; } };
  function allowed(){ return typeof ccIsOwner === 'function' && ccIsOwner(); }

  async function api(body){
    const h = typeof cmpAuthHeaders === 'function' ? await cmpAuthHeaders() : { 'Content-Type':'application/json' };
    const r = await fetch(API, { method:'POST', headers:h, body:JSON.stringify(body), cache:'no-store' });
    const j = await r.json().catch(() => ({}));
    if(!r.ok){ const e = new Error(j.error || 'Something went wrong.'); e.status = r.status; throw e; }
    return j;
  }
  function css(){ if(document.getElementById('oixCss')) return; const s = document.createElement('style'); s.id = 'oixCss';
    s.textContent = '.oix-top{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;justify-content:space-between;margin-bottom:10px}.oix-top h2{margin:0;color:var(--navy);font-size:22px}'
      + '.oix-lock{display:inline-flex;gap:6px;align-items:center;background:#0E3860;color:#FFC671;font-weight:700;font-size:12px;border-radius:99px;padding:3px 11px}'
      + '.oix-grid{display:grid;grid-template-columns:minmax(260px,1fr) minmax(0,1.6fr);gap:12px}@media(max-width:860px){.oix-grid{grid-template-columns:1fr}}'
      + '.oix-box{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px;min-width:0}'
      + '.oix-row{display:block;width:100%;text-align:left;background:#fff;border:0;border-top:1px solid var(--border);padding:10px 6px;cursor:pointer;font:inherit}.oix-row:first-child{border-top:0}.oix-row:hover,.oix-row.on{background:#F3F8FC}'
      + '.oix-row b{color:var(--navy)}.oix-row .m{font-size:12px;color:var(--text-muted)}.oix-new{display:inline-block;background:#B23B2E;color:#fff;border-radius:99px;font-size:10.5px;font-weight:700;padding:1px 7px;margin-left:6px}'
      + '.oix-msg{white-space:pre-wrap;background:#F6F9FD;border-radius:10px;padding:12px;margin:10px 0;font-size:14px}'
      + '.oix-note{border-left:3px solid #FFC671;padding:6px 10px;margin:8px 0;font-size:13.5px;white-space:pre-wrap}.oix-note.sent{border-color:#54BDB8}.oix-note .m{font-size:11.5px;color:var(--text-muted)}'
      + '.oix-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.oix-box textarea{width:100%;min-height:80px;font:inherit;border:1px solid var(--border);border-radius:8px;padding:8px;margin-top:6px}'
      + '.oix-trail{font-size:11.5px;color:var(--text-muted);margin-top:12px}.oix-err{color:#B23B2E;font-size:13px;margin:6px 0}';
    document.head.appendChild(s); }

  /* ------------------------------------------------------------ owners: the pill, the badge, the inbox */
  function pillSync(){
    const p = document.querySelector('.fpill[data-tab="ownersinbox"]'); if(p) p.style.display = allowed() ? '' : 'none';
    if(allowed() && !ST.list && !ST.loading && Date.now() - ST.at > 300000) load(true);
  }
  function badge(){
    const b = document.getElementById('oixBadge'); if(!b) return;
    const n = (ST.list || []).filter(m => m.status === 'new').length;
    b.textContent = n; b.style.display = n && allowed() ? '' : 'none';
  }
  async function load(quiet){
    if(!allowed()) return;
    ST.loading = true; ST.err = ''; ST.at = Date.now();
    try{ ST.list = (await api({ action:'list' })).messages || []; }
    catch(e){ ST.err = e.status === 404 || /fetch/i.test(e.message) ? 'The private inbox is not switched on yet.' : e.message; }
    ST.loading = false; badge(); if(!quiet || activeTabIs()) draw();
  }
  const activeTabIs = () => typeof activeTab !== 'undefined' && activeTab === 'ownersinbox';
  function render(){ css(); if(!allowed()){ wrap().innerHTML = '<div class="oix-box">This page is for the owners.</div>'; return; }
    draw(); if(!ST.loading && (!ST.list || Date.now() - ST.at > 60000)) load(); }
  const wrap = () => document.getElementById('oixWrap') || document.createElement('div');
  function draw(){
    css(); const W = wrap(); if(!allowed()) return;
    const list = (ST.list || []).filter(m => ST.view === 'all' || m.status !== 'handled');
    let h = '<div class="oix-top"><h2>Private messages</h2><span class="oix-lock">🔒 Only Samantha and Zach</span></div>'
      + '<p style="margin:0 0 10px;color:var(--text-muted);font-size:13px">From families, caregivers and the office team. Nobody else in the Hub can see these, count them, or know they exist. Every look is recorded.</p>'
      + '<div style="display:flex;gap:6px;margin-bottom:10px"><button class="filter-pill' + (ST.view === 'open' ? ' active' : '') + '" onclick="OIX.view(\'open\')">Open</button><button class="filter-pill' + (ST.view === 'all' ? ' active' : '') + '" onclick="OIX.view(\'all\')">All</button><button class="ghost" style="margin-left:auto" onclick="OIX.load()">Refresh</button></div>';
    if(ST.err) h += '<div class="oix-box oix-err">' + esc(ST.err) + '</div>';
    else if(!ST.list) h += '<div class="oix-box">Loading...</div>';
    else {
      h += '<div class="oix-grid"><div class="oix-box">' + (list.length ? list.map(m => '<button class="oix-row' + (ST.open && ST.open.message.id === m.id ? ' on' : '') + '" onclick="OIX.get(\'' + esc(m.id) + '\')">'
        + '<b>' + esc(m.sender_name || 'No name') + '</b>' + (m.status === 'new' ? '<span class="oix-new">New</span>' : '') + (m.locked ? ' 🔒' : '')
        + '<div class="m">' + esc(ROLE[m.role] || '') + ' · ' + esc(KIND[m.kind] || '') + ' · ' + esc(REPLY[m.reply_wanted] || '') + '</div><div class="m">' + esc(when(m.created_at)) + (m.status === 'handled' ? ' · handled' : '') + '</div></button>').join('')
        : '<div style="color:var(--text-muted);padding:8px">Nothing waiting.</div>') + '</div><div class="oix-box" id="oixOpen">' + openHtml() + '</div></div>';
    }
    W.innerHTML = h;
  }
  function openHtml(){
    const o = ST.open; if(!o) return '<div style="color:var(--text-muted)">Pick a message to read it.</div>';
    const m = o.message, contact = [m.sender_phone && ('<a href="tel:+1' + esc(m.sender_phone) + '">' + esc(m.sender_phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')) + '</a>'), m.sender_email && ('<a href="mailto:' + esc(m.sender_email) + '">' + esc(m.sender_email) + '</a>')].filter(Boolean).join(' · ');
    let h = '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><b style="color:var(--navy);font-size:16px">' + esc(m.sender_name || 'No name') + '</b><div style="font-size:12.5px;color:var(--text-muted)">'
      + esc(ROLE[m.role] || '') + ' · ' + esc(KIND[m.kind] || '') + ' · ' + esc(REPLY[m.reply_wanted] || '') + ' · ' + esc(when(m.created_at)) + '</div><div style="font-size:13px;margin-top:2px">' + (contact || 'No contact on file') + '</div></div>'
      + '<div>' + (m.status === 'handled' ? '<button class="ghost" onclick="OIX.mark(\'seen\')">Reopen</button>' : '<button class="addlead" onclick="OIX.mark(\'handled\')">Mark handled</button>') + '</div></div>'
      + '<div class="oix-msg">' + esc(m.body) + '</div>';
    for(const n of o.notes) h += '<div class="oix-note' + (n.visible_to_sender ? ' sent' : '') + '"><div class="m">' + (n.author === 'sender' ? esc(m.sender_name || 'They') + ' wrote back' : esc(n.author) + (n.visible_to_sender ? ' replied' : ' · private note')) + ' · ' + esc(when(n.at)) + '</div>' + esc(n.body) + '</div>';
    h += '<textarea id="oixText" placeholder="Write a reply, a private note, or a note to share"></textarea><div class="oix-err" id="oixErr"></div><div class="oix-acts">'
      + (m.has_pin ? '<button class="addlead" onclick="OIX.act(\'reply\')">Reply privately</button>' : '')
      + '<button class="ghost" onclick="OIX.act(\'note\')">Save as private note</button>'
      + '<select id="oixTo" style="font:inherit;border:1px solid var(--border);border-radius:8px;padding:4px 6px"><option value="">Share a note with...</option>' + staffOptions() + '</select><button class="ghost" onclick="OIX.act(\'share\')">Share note</button></div>'
      + '<div style="font-size:12px;color:var(--text-muted);margin-top:6px">' + (m.has_pin ? (m.locked ? 'Their link is locked after 5 wrong PINs. Make a reset code and call them.' : 'They open your reply with their own PIN. If they gave an email, they are emailed that a message is waiting (never the words, never through GoHighLevel); otherwise you text them from your own phone.') : m.reply_wanted === 'call' ? 'They asked for a call.' : 'They did not ask for a reply.')
      + ' Sharing sends only the words you type, as a card for that person.</div>'
      + (m.has_pin ? '<div class="oix-acts"><button class="ghost" onclick="OIX.link()">Their conversation link</button><button class="ghost" onclick="OIX.resetCode()">Forgot PIN: make a reset code</button></div>' : '')
      + '<div id="oixSend"></div>';
    h += '<div class="oix-trail"><b>Record:</b> ' + o.trail.map(t => esc(t.by_who) + ' ' + esc(t.action) + ' ' + esc(when(t.at))).join(' · ') + '</div>';
    return h;
  }
  function staffOptions(){
    try{ const owners = typeof ccOwnerEmails === 'function' ? ccOwnerEmails() : [];
      return Object.keys(CC_ROLE_BY_EMAIL || {}).filter(e => !owners.includes(e) && (CC_ROLE_BY_EMAIL[e] || []).length).sort()
        .map(e => '<option value="' + esc(e) + '">' + esc((typeof opsOwnerName === 'function' && opsOwnerName(e)) || e) + '</option>').join(''); }catch(_){ return ''; }
  }
  async function get(id){ try{ ST.open = await api({ action:'get', id }); const m = (ST.list || []).find(x => x.id === id); if(m && m.status === 'new') m.status = 'seen'; badge(); draw(); }catch(e){ ST.err = e.message; draw(); } }
  async function mark(status){ const id = ST.open.message.id; try{ await api({ action:'mark', id, status }); await load(true); await get(id); }catch(e){ err(e.message); } }
  function err(t){ const e = document.getElementById('oixErr'); if(e) e.textContent = t; }
  async function act(what, confirm){
    const id = ST.open.message.id, text = (document.getElementById('oixText') || {}).value || '';
    if(!text.trim()) return err('Write something first.');
    const body = { action:what, id, body:text };
    if(what === 'share'){ const to = (document.getElementById('oixTo') || {}).value; if(!to) return err('Pick who to share the note with.'); Object.assign(body, { to_email:to, words:text, confirm:!!confirm }); }
    try{
      const r = await api(body);
      if(r.warn){ if(window.confirm(r.warn)) return act(what, true); return; }
      if(what === 'reply'){ await get(id); return r.told === 'email' ? sendBox('Saved. They were emailed that a message is waiting.') : sendBox(r.say || 'Saved. Let them know from your own phone.', r); }
      if(what === 'share' && r.ok) alert('Shared as a card for that person, with only your words.');
      await get(id);
    }catch(e){ err(e.message); }
  }

  /* Telling a sender from the owner's OWN phone: never the office line, never GoHighLevel, so the office cannot see it. */
  function sendBox(say, r){
    const el = document.getElementById('oixSend'); if(!el) return;
    let h = '<div class="oix-msg" style="background:#FFF8E6">' + esc(say);
    if(r && r.sms){ const ph = String(r.phone || '').replace(/\D/g, '');
      h += '<div style="margin-top:8px;font-size:13px"><b>Text to send:</b> ' + esc(r.sms) + '</div><div class="oix-acts">'
        + (ph ? '<a class="addlead" href="sms:+1' + esc(ph) + '?&body=' + encodeURIComponent(r.sms) + '">Text from my phone</a><a class="ghost" href="tel:+1' + esc(ph) + '">Call them</a>' : '')
        + '<button class="ghost" onclick="navigator.clipboard&&navigator.clipboard.writeText(' + esc(JSON.stringify(r.sms)) + ')">Copy the text</button></div>'; }
    el.innerHTML = h + '</div>';
  }
  async function link(){ try{ const r = await api({ action:'link', id:ST.open.message.id }); sendBox('Their private conversation link. Send it from your own phone; it opens with their PIN.', r); }catch(e){ err(e.message); } }
  async function resetCode(){
    if(!window.confirm('Make a one-time reset code? Call them from your own phone and read it to them. It works once, for 24 hours, and unlocks a locked link.')) return;
    try{ const r = await api({ action:'reset_code', id:ST.open.message.id });
      sendBox(r.say); const el = document.getElementById('oixSend'); if(el) el.firstChild.insertAdjacentHTML('afterbegin', '<div style="font-size:28px;font-weight:800;letter-spacing:6px;color:var(--navy)">' + esc(r.code.replace(/(\d{3})(\d{3})/, '$1 $2')) + '</div>');
    }catch(e){ err(e.message); } }

  /* ------------------------------------------------------------ anyone in the office: Message the owners */
  function compose(){
    css(); let bd = document.getElementById('oixModal');
    if(!bd){ bd = document.createElement('div'); bd.id = 'oixModal'; bd.className = 'modal-backdrop'; document.body.appendChild(bd); }
    bd.innerHTML = '<div class="modal" style="max-width:520px"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0;color:var(--navy)">🔒 Message the owners</h3><button class="ghost" onclick="OIX.close()">Close</button></div>'
      + '<p style="font-size:13px;color:var(--text-muted)">Only Samantha and Zach will read this. Nobody else in the office can see it, or that you wrote. If someone could be hurt, the owners may need to involve others and will share as little as they can.</p>'
      + '<select id="oixKind" style="width:100%;font:inherit;padding:8px;border:1px solid var(--border);border-radius:8px"><option value="">What is it about?</option>' + Object.entries(KIND).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select>'
      + '<textarea id="oixBody" style="width:100%;min-height:140px;margin-top:8px;font:inherit;padding:8px;border:1px solid var(--border);border-radius:8px" placeholder="Your message" maxlength="4000"></textarea>'
      + '<select id="oixReply" style="width:100%;font:inherit;padding:8px;border:1px solid var(--border);border-radius:8px;margin-top:8px"><option value="">Would you like a reply?</option><option value="call">Yes, call me</option><option value="private">Yes, a private written reply</option><option value="none">No reply needed</option></select>'
      + '<input id="oixPhone" type="tel" placeholder="Best phone number" style="display:none;width:100%;margin-top:8px;padding:8px;border:1px solid var(--border);border-radius:8px">'
      + '<input id="oixPin" type="password" inputmode="numeric" maxlength="6" placeholder="Choose a PIN (4 to 6 numbers) to read the reply" style="display:none;width:100%;margin-top:8px;padding:8px;border:1px solid var(--border);border-radius:8px">'
      + '<div class="oix-err" id="oixCErr"></div><button class="addlead" id="oixSend" style="margin-top:8px" onclick="OIX.send()">Send to the owners</button></div>';
    bd.style.display = 'flex';
    document.getElementById('oixReply').onchange = e => { document.getElementById('oixPhone').style.display = e.target.value === 'call' ? '' : 'none'; document.getElementById('oixPin').style.display = e.target.value === 'private' ? '' : 'none'; };
  }
  function close(){ const bd = document.getElementById('oixModal'); if(bd){ bd.style.display = 'none'; bd.innerHTML = ''; } }
  async function send(){
    const v = id => (document.getElementById(id) || {}).value || '', e = document.getElementById('oixCErr');
    const body = { action:'send', hub:true, kind:v('oixKind'), body:v('oixBody'), reply:v('oixReply'), phone:v('oixPhone'), pin:v('oixPin') };
    if(!body.kind) return e.textContent = 'Pick what it is about.';
    if(body.body.trim().length < 3) return e.textContent = 'Write your message first.';
    if(!body.reply) return e.textContent = 'Tell us if you would like a reply.';
    const b = document.getElementById('oixSend'); b.disabled = true; b.textContent = 'Sending...';
    try{
      const r = await api(body);
      document.querySelector('#oixModal .modal').innerHTML = '<h3 style="color:var(--navy)">Sent to the owners 💛</h3><p>Only Samantha and Zach will read it.</p>'
        + (r.reply_link ? '<p style="font-size:13px">When they reply, you will get a text or email. You can also keep <a href="' + esc(r.reply_link) + '" target="_blank" rel="noopener noreferrer">your private conversation link</a>; it opens with your PIN.</p>' : '')
        + '<button class="addlead" onclick="OIX.close()">Done</button>';
    }catch(x){ b.disabled = false; b.textContent = 'Send to the owners'; e.textContent = /fetch/i.test(x.message) ? 'The private inbox is not switched on yet.' : x.message; }
  }

  window.OIX = { allowed, pillSync, render, load:() => load(false), get, mark, act, link, resetCode, compose, close, send, view:(v) => { ST.view = v; draw(); }, _st:ST };
})();
