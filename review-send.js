/* =============================================================================
   review-send.js · Google review asks in the Feedback tab (Samantha 2026-11-11)
   "Could we have the feedback tab be better, like be able to send out from there and also track who we've sent to and
   who has made the review." Her answers: a text from the office line, daytime only, with a link made just for that
   family; the link is mo-care.com/feedback (stars first); owners see every ask here; Google reviews are matched to the
   families we asked, and anything unmatched can be marked by hand.
   A person always picks who and presses Send. The server is review-send (Staffing repo).
   ============================================================================= */
(function () {
  'use strict';
  const S = { data: null, loading: false, filter: 'due', q: '', open: null, err: '' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const day = d => d ? new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '';
  const stars = n => n ? '<span class="rs-st">' + '★★★★★'.slice(0, n) + '</span><span class="rs-st0">' + '★★★★★'.slice(0, 5 - n) + '</span>' : '';
  const MAX = 320, LINK_LEN = 'https://mo-care.com/feedback/?k='.length + 10;
  async function call(body){
    const { data:{ session } } = await sb.auth.getSession(); if(!session) throw new Error('Sign in first.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/review-send', { method:'POST', headers:{ Authorization:'Bearer ' + session.access_token, apikey:CONFIG.supabase_anon_key, 'Content-Type':'application/json' }, body:JSON.stringify(body) });
    const d = await r.json().catch(() => null); if(!d) throw new Error('The review service answered ' + r.status + (r.status === 404 ? ' (it is not switched on yet)' : ''));
    if(d.error && !d.outcome) throw new Error(d.error);
    return d;
  }
  async function load(){
    if(S.loading) return; S.loading = true; S.err = '';
    try{ S.data = await call({ action:'list' }); }catch(e){ S.err = e.message; }
    S.loading = false; draw();
  }
  function counts(c){
    const box = (n, l, t) => '<div class="rs-n" title="' + esc(t) + '"><b>' + (n || 0) + '</b><span>' + l + '</span></div>';
    return '<div class="rs-counts">' + box(c.sent, 'texted', 'Review asks texted from here') + box(c.opened, 'opened the link', 'Opened their link') + box(c.rated, 'gave stars', 'Tapped stars and sent them')
      + box(c.happy, '4 or 5 stars', 'Were offered Google') + box(c.google_tapped, 'tapped Google', 'Pressed Review us on Google') + box(c.reviewed, 'reviewed', 'Left a Google review (matched from Google, or marked by hand)') + '</div>';
  }
  function clientRows(){
    const d = S.data, q = S.q.trim().toLowerCase();
    let rows = (d.clients || []).filter(c => !q || c.name.toLowerCase().includes(q) || String(c.cc || '').toLowerCase().includes(q));
    if(S.filter === 'due') rows = rows.filter(c => !c.recent);
    if(!rows.length) return '<div class="rs-empty">' + (S.filter === 'due' ? 'Every current family has been asked in the last ' + d.again_days + ' days.' : 'No current clients match.') + '</div>';
    return '<table class="rs-t"><thead><tr><th>Client</th><th>Care Coordinator</th><th>Last asked</th><th>Send to</th><th></th></tr></thead><tbody>' + rows.map(c => {
      const can = c.people.filter(p => p.can_text), sel = 'rsWho_' + c.ax;
      const pick = c.people.length ? '<select id="' + sel + '">' + c.people.map(p => '<option value="' + esc(p.id) + '"' + (p.can_text ? '' : ' disabled') + '>' + esc(p.name + (p.relationship ? ' (' + p.relationship + ')' : p.is_client ? ' (client)' : '') + (p.can_text ? ' · ' + (p.phone_last4 ? '…' + p.phone_last4 : '') : ' · ' + p.why)) + '</option>').join('') + '</select>'
        : '<span class="field-note">No Family Circle on file</span>';
      return '<tr><td><a href="#p/A' + esc(c.ax) + '/summary">' + esc(c.name) + '</a>' + (c.reviewed ? ' <span class="rs-pill ok">reviewed</span>' : '') + '</td><td>' + esc(c.cc || '') + '</td>'
        + '<td>' + (c.last_sent_at ? day(c.last_sent_at) + (c.recent ? ' <span class="rs-pill">within ' + d.again_days + ' days</span>' : '') : '<span class="field-note">never</span>') + '</td>'
        + '<td>' + pick + '</td><td>' + (can.length ? '<button class="secondary" onclick="rsOpen(\'' + esc(c.ax) + '\')">Write text…</button>' : '') + '</td></tr>'
        + (S.open && S.open.ax === c.ax ? '<tr class="rs-ed"><td colspan="5">' + editor() + '</td></tr>' : '');
    }).join('') + '</tbody></table>';
  }
  function editor(){
    const o = S.open, d = S.data;
    return '<div class="rs-box"><div class="field-note">To ' + esc(o.to) + '. Edit it if you like. <b>{link}</b> becomes their own link to mo-care.com/feedback. It goes from the office line, (417) 234-8494.</div>'
      + '<textarea id="rsMsg" rows="3" oninput="rsLen()">' + esc(o.message || '') + '</textarea>'
      + '<div class="rs-row"><span class="field-note" id="rsLen"></span>'
      + (d.in_hours ? '<button class="primary" id="rsSendBtn" onclick="rsSend(false)">Send text</button>' : '<span class="rs-pill warn">Review texts go out 8 AM to 9 PM</span>')
      + ' <button class="linklike" onclick="rsClose()">Cancel</button></div><div class="cc-err" id="rsErr">' + esc(o.err || '') + '</div></div>';
  }
  function sentRows(){
    const d = S.data, q = S.q.trim().toLowerCase();
    const rows = (d.sends || []).filter(s => !s.test && (!q || (s.client + ' ' + s.to + ' ' + s.by).toLowerCase().includes(q)));
    if(!rows.length) return '<div class="rs-empty">Nothing texted from here yet.</div>';
    const yes = (t, label) => t ? '<span class="rs-yes" title="' + esc(new Date(t).toLocaleString()) + '">' + label + '</span>' : '<span class="rs-no">not yet</span>';
    return '<table class="rs-t"><thead><tr><th>Texted</th><th>Client</th><th>To</th><th>By</th><th>Opened</th><th>Stars</th><th>Tapped Google</th><th>Google review</th></tr></thead><tbody>' + rows.map(s => {
      const rev = s.review === 'left' ? '<span class="rs-pill ok">' + (s.review_how === 'google' ? 'On Google' + (s.review_stars ? ' ' + s.review_stars + '★' : '') + (s.review_name ? ' as ' + esc(s.review_name) : '') : 'Left one (marked)') + '</span>'
          + (s.review_how === 'by_hand' ? ' <button class="linklike" onclick="rsMark(\'' + s.id + '\',null)">undo</button>' : '')
        : s.review === 'didnt' ? '<span class="rs-pill">Didn\'t</span> <button class="linklike" onclick="rsMark(\'' + s.id + '\',null)">undo</button>'
        : s.text === 'failed' ? '' : '<button class="linklike" onclick="rsMark(\'' + s.id + '\',\'left\')">Left one</button> · <button class="linklike" onclick="rsMark(\'' + s.id + '\',\'didnt\')">Didn\'t</button>';
      return '<tr><td>' + day(s.sent_at) + (s.text === 'failed' ? ' <span class="rs-pill warn">text refused</span>' : '') + '</td><td><a href="#p/A' + esc(s.ax) + '/summary">' + esc(s.client) + '</a></td>'
        + '<td>' + esc(s.to) + (s.relationship ? ' <span class="field-note">' + esc(s.relationship) + '</span>' : '') + '</td><td>' + esc(s.by) + '</td>'
        + '<td data-l="Opened">' + (s.text === 'failed' ? '' : yes(s.opened_at, day(s.opened_at))) + '</td><td data-l="Stars">' + (s.rating ? stars(s.rating) + (s.rating <= 3 ? ' <span class="rs-pill warn">call them</span>' : '') : (s.text === 'failed' ? '' : '<span class="rs-no">not yet</span>')) + '</td>'
        + '<td data-l="Tapped Google">' + (s.rating && s.rating <= 3 ? '<span class="field-note">not offered</span>' : s.text === 'failed' ? '' : yes(s.google_clicked_at, day(s.google_clicked_at))) + '</td><td>' + rev + '</td></tr>';
    }).join('') + '</tbody></table>';
  }
  function draw(){
    const box = document.getElementById('rsBox'); if(!box) return;
    if(S.err && !S.data){ box.innerHTML = '<div class="rs-wrap"><h3>Google review asks</h3><div class="cc-err">' + esc(S.err) + '</div></div>'; return; }
    if(!S.data){ box.innerHTML = '<div class="rs-wrap"><h3>Google review asks</h3><div class="field-note">Loading…</div></div>'; return; }
    const d = S.data, due = (d.clients || []).filter(c => !c.recent).length;
    box.innerHTML = '<div class="rs-wrap"><h3>Google review asks</h3>'
      + '<p class="fb-sub">Pick a family member and press Send. They get a short text from the office line with their own link to mo-care.com/feedback: 4 or 5 stars are offered Google, 1 to 3 come to you privately. Below you can see who opened it, their stars, and who left a Google review.</p>'
      + counts(d.counts || {})
      + '<div class="rs-bar"><input id="rsQ" placeholder="Find a client, family member or coordinator" value="' + esc(S.q) + '" oninput="rsFind(this.value)">'
      + '<button class="fb' + (S.filter === 'due' ? ' active' : '') + '" onclick="rsFilter(\'due\')">Not asked in ' + d.again_days + ' days (' + due + ')</button>'
      + '<button class="fb' + (S.filter === 'all' ? ' active' : '') + '" onclick="rsFilter(\'all\')">All current clients (' + (d.clients || []).length + ')</button></div>'
      + '<div id="rsClients">' + clientRows() + '</div>'
      + '<h4 class="rs-h4">Texted so far</h4><div id="rsSent">' + sentRows() + '</div></div>';
    if(S.open) rsLen();
  }
  async function open(ax){
    const c = (S.data.clients || []).find(x => x.ax === ax); if(!c) return;
    const sel = document.getElementById('rsWho_' + ax), pid = sel ? sel.value : '';
    const p = c.people.find(x => x.id === pid && x.can_text) || c.people.find(x => x.can_text); if(!p) return;
    S.open = { ax, contact_id:p.id, to:p.name, message:'', err:'' }; draw();
    try{ const r = await call({ action:'draft', client_ax:ax, contact_id:p.id }); if(S.open && S.open.ax === ax){ S.open.message = r.message; draw(); } }
    catch(e){ if(S.open){ S.open.err = e.message; draw(); } }
  }
  function len(){
    const t = (document.getElementById('rsMsg') || {}).value || '', el = document.getElementById('rsLen'); if(!el) return;
    if(S.open) S.open.message = t;
    const n = t.replace('{link}', '').length + LINK_LEN + (t.includes('{link}') ? 0 : 1);
    el.textContent = n + ' of ' + MAX + ' letters with the link'; el.style.color = n > MAX ? 'var(--red)' : '';
  }
  async function send(again){
    const o = S.open; if(!o) return;
    const msg = ((document.getElementById('rsMsg') || {}).value || '').trim(); if(!msg) return;
    const btn = document.getElementById('rsSendBtn'); if(btn) btn.disabled = true;
    let r; try{ r = await call({ action:'send', client_ax:o.ax, contact_id:o.contact_id, message:msg, again:again === true }); }catch(e){ r = { error:e.message }; }
    if(r.outcome === 'recent' && S.data.owner && !again){
      if(await ccConfirm(r.error.replace(' Press Send again to send anyway.', '') + '\n\nSend to ' + o.to + ' anyway?')) return send(true);
      if(btn) btn.disabled = false; return;
    }
    if(r.outcome !== 'sent'){ o.err = r.error || 'Not sent.'; o.message = msg; draw(); return; }
    S.open = null; if(typeof ccToast === 'function') ccToast('Texted ' + o.to + '. You\'ll see here when they open it, their stars, and their Google review.');
    await load();
  }
  async function mark(id, v){
    try{ const r = await call({ action:'mark', id, review:v }); if(r.outcome !== 'recorded' && r.error){ if(typeof ccToast === 'function') ccToast(r.error); } }catch(e){ if(typeof ccToast === 'function') ccToast(e.message); }
    await load();
  }
  function mount(){
    const tab = document.getElementById('tab-feedback'); if(!tab) return;
    let box = document.getElementById('rsBox');
    if(!box){ box = document.createElement('div'); box.id = 'rsBox'; const sub = tab.querySelector('.fb-sub'); if(sub) sub.insertAdjacentElement('afterend', box); else tab.prepend(box); }
    draw(); load();
  }
  if(!document.getElementById('rsCss')){ const s = document.createElement('style'); s.id = 'rsCss';
    s.textContent = '.rs-wrap{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;margin:0 0 18px}.rs-wrap h3{margin:0 0 4px;color:var(--navy);font-size:18px}.rs-h4{margin:18px 0 8px;color:var(--navy);font-size:14px;text-transform:uppercase;letter-spacing:.04em}'
      + '.rs-counts{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 14px}.rs-n{flex:1 1 110px;border:1px solid var(--border);border-radius:10px;padding:8px 10px;background:var(--bg,#F6F9FD)}.rs-n b{display:block;font-size:22px;color:var(--navy)}.rs-n span{font-size:12px;color:var(--text-muted)}'
      + '.rs-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}.rs-bar input{flex:1 1 240px;max-width:360px}'
      + '.rs-t{width:100%;border-collapse:collapse;font-size:13.5px}.rs-t th,.rs-t td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--border);vertical-align:middle}.rs-t th{font-size:12px;color:var(--text-muted);font-weight:700}.rs-t select{max-width:280px;width:auto}'
      + '.rs-ed td{background:var(--bg,#F6F9FD)}.rs-box textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;margin:6px 0}.rs-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}'
      + '.rs-pill{font-size:11.5px;font-weight:700;border-radius:999px;padding:2px 8px;background:var(--slate-bg,#EEF2F6);color:var(--slate,#475569);white-space:nowrap}.rs-pill.ok{background:#E6F4EC;color:#1F7A4D}.rs-pill.warn{background:var(--red-bg,#FDECEC);color:var(--red,#B42318)}'
      + '.rs-st{color:#F0A63A;letter-spacing:1px}.rs-st0{color:var(--border);letter-spacing:1px}.rs-yes{color:#1F7A4D;font-weight:600}.rs-no{color:var(--text-muted);font-size:12.5px}.rs-empty{color:var(--text-muted);font-size:13.5px;padding:8px 0}'
      + '@media(max-width:760px){.rs-t thead{display:none}.rs-t tr{display:block;border-bottom:1px solid var(--border);padding:6px 0}.rs-t td{display:inline-block;border:0;padding:3px 6px}.rs-t td[data-l]:before{content:attr(data-l) ": ";color:var(--text-muted);font-size:12px}}';
    document.head.appendChild(s); }
  Object.assign(window, { rsMount:mount, rsOpen:open, rsClose(){ S.open = null; draw(); }, rsLen:len, rsSend:send, rsMark:mark,
    rsFilter(v){ S.filter = v; draw(); }, rsFind(v){ S.q = v; const c = document.getElementById('rsClients'), s2 = document.getElementById('rsSent'); if(c) c.innerHTML = clientRows(); if(s2) s2.innerHTML = sentRows(); }, RS_STATE:S });
})();
