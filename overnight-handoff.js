/* =====================================================================================================================
   OVERNIGHT HANDOFF (Samantha 2026-10-29, mockup https://claude.ai/artifact/MsZAJoGKZqufHWzhw7QNU2; her words: "Yes to all
   four recommendations: one email at 8, 8pm to 7am window with Monday covering the weekend, on-duty person marks it read
   with the 9am Owner Overview flag, and I see Got it / Done on my note. Build it switched off.")
   Why: My Work is so busy that a note she makes overnight may be buried, and the morning office person needs to see
   clearly whether anything happened overnight.
   · An owner writes a Note for the morning (Owner Overview, or My Work). Before 8am on a weekday it is for that morning,
     otherwise the next weekday's. Staff press Got it, then Done; the owner sees who and when.
   · The 8am Morning Brief (Staffing repo lead-digest + _shared/overnight-handoff.ts) opens with the note and what
     happened overnight, and saves the same thing as report_<date>. My Work pins it above everything until somebody
     presses I've read it (who, when and whether they were on duty are kept).
   · Owner Overview: the note box, Got it / Done on this morning's note, and from 9am a red line while it is unread.
   Everything lives in app_data overnight_handoff: note_<date>, report_<date> (written by the server), read_<date>.
   Only while ops_settings.overnight_handoff_live is on. Nothing here texts, emails or calls anyone.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const KEY = 'overnight_handoff', SEND_HOUR = 8, FLAG_HOUR = 9;
  /* ── the rules (pure; tests/overnight-handoff-test.js runs them under node) ── */
  function liveOn(settings){ return !!(settings && settings.overnight_handoff_live === true); }
  /* which morning a note written at nowChi ('YYYY-MM-DD HH:MM:SS' Central) is for. Same rule as the server's noteDateFor. */
  function noteDateFor(nowChi){
    const day = nowChi.slice(0, 10), hour = Number(nowChi.slice(11, 13));
    const t = Date.parse(day + 'T12:00:00Z'), dow = new Date(t).getUTCDay();
    if(dow >= 1 && dow <= 5 && hour < SEND_HOUR) return day;
    let n = t + 864e5; while([0, 6].indexOf(new Date(n).getUTCDay()) > -1) n += 864e5;
    return new Date(n).toISOString().slice(0, 10);
  }
  const weekday = d => { const w = new Date(Date.parse(d + 'T12:00:00Z')).getUTCDay(); return w >= 1 && w <= 5; };
  /* what the Hub shows this morning. items = app_data overnight_handoff; nowChi = Central now */
  function state(items, nowChi){
    const today = nowChi.slice(0, 10), hour = Number(nowChi.slice(11, 13)), by = id => (items || []).find(x => x && x.id === id) || null;
    const report = by('report_' + today), read = by('read_' + today), note = by('note_' + today);
    const live = note && String(note.text || '').trim() ? note : null;
    return { today, report, read, note:live,
      /* the pin: the whole handoff until read; after that only a note nobody has marked Done */
      pin: report && !read ? 'full' : (live && !(live.done && live.done.at) ? 'note' : ''),
      /* 9am Owner Overview flag: a weekday, the brief has gone, nobody has read it */
      flag: weekday(today) && hour >= FLAG_HOUR && !!report && !read,
      next: noteDateFor(nowChi) };
  }
  /* a note change: Got it or Done, kept with who and when (pressing again never moves the first time) */
  function mark(note, what, who, at){
    if(!note || (what !== 'got_it' && what !== 'done')) return null;
    const o = Object.assign({}, note), stamp = { by:String(who && who.email || '').toLowerCase(), by_name:String(who && (who.name || who.email) || ''), at };
    if(!(o[what] && o[what].at)) o[what] = stamp;
    if(what === 'done' && !(o.got_it && o.got_it.at)) o.got_it = stamp;   /* Done means it was seen */
    return o;
  }
  const CORE = { KEY, liveOn, noteDateFor, state, mark, SEND_HOUR, FLAG_HOUR };
  if(typeof module !== 'undefined' && module.exports){ module.exports = CORE; return; }

  /* ═══════════════════════════════════ in the Hub ═══════════════════════════════════════════════════════════════ */
  const W = root;
  const D = () => { try{ return DATA || {}; }catch(e){ return {}; } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const on = () => liveOn(D().ops_settings || {});
  const owner = () => { try{ return !!W.ccIsOwner(); }catch(e){ return false; } };
  const actor = () => { try{ return W.ccActor() || {}; }catch(e){ return {}; } };
  const first = n => String(n || '').trim().split(/\s+/)[0] || '';
  const chiNow = () => new Date().toLocaleString('sv-SE', { timeZone:'America/Chicago' });
  const items = () => { const a = D()[KEY]; return Array.isArray(a) ? a : []; };
  const t12 = iso => { const t = Date.parse(iso || ''); return isNaN(t) ? '' : new Date(t).toLocaleTimeString('en-US', { timeZone:'America/Chicago', hour:'numeric', minute:'2-digit' }).toLowerCase().replace(/\s+/g, ''); };
  const chiT = c => { if(!c) return ''; const h = Number(c.slice(11, 13)); return ((h % 12) || 12) + ':' + c.slice(14, 16) + (h < 12 ? 'am' : 'pm'); };
  const dayName = d => new Date(Date.parse(d + 'T12:00:00Z')).toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric', timeZone:'UTC' });
  const ST = { open:false, fetched:0, draft:null, busy:false };
  function redraw(){ try{ if(typeof W.renderMyWork === 'function') W.renderMyWork(); }catch(e){} try{ if(W.OV && typeof OV.render === 'function' && document.getElementById('ovWrap')) OV.render(); }catch(e){} try{ pin(); }catch(e){} }
  async function save(item){
    const list = items(), i = list.findIndex(x => x && x.id === item.id);
    if(i > -1) list[i] = item; else list.push(item);
    D()[KEY] = list;
    if(typeof W.persist === 'function') await W.persist(KEY, item);
  }
  /* the server writes report_<date> at 8am: a page opened earlier fetches it (at most every 5 minutes) */
  async function refresh(){
    if(Date.now() - ST.fetched < 5 * 60000 || typeof sb === 'undefined' || !sb) return;
    ST.fetched = Date.now();
    try{ const { data } = await sb.from('app_data').select('data').eq('key', KEY).maybeSingle();
      if(data && Array.isArray(data.data)){ const before = JSON.stringify(items()); D()[KEY] = data.data; if(JSON.stringify(data.data) !== before) redraw(); } }catch(e){}
  }
  /* was the person pressing "I've read it" on duty right now (in charge or operations)? */
  function onDuty(email){ try{ return (W.dutyNow() || []).some(r => ['in_charge', 'operations'].indexOf(r.area) > -1 && r.holder && String(r.holder.person || '').toLowerCase() === email); }catch(e){ return false; } }

  /* ── the parts ── */
  function noteHtml(n, withButtons){
    const g = n.got_it && n.got_it.at, d = n.done && n.done.at;
    return '<div class="oh-note"><div class="oh-k">Note from ' + esc(first(n.by_name) || 'Samantha') + (n.at ? ' · ' + esc(t12(n.at)) : '') + '</div>'
      + '<div class="oh-txt">' + esc(n.text) + '</div>'
      + '<div class="oh-row">' + (d ? '<span class="oh-ok">Done by ' + esc(first(n.done.by_name)) + ' at ' + esc(t12(n.done.at)) + '</span>'
          : (g ? '<span class="oh-ok">Got it: ' + esc(first(n.got_it.by_name)) + ' at ' + esc(t12(n.got_it.at)) + '</span>' : ''))
      + (withButtons && !d ? (g ? '' : '<button class="secondary" onclick="OH.press(\'got_it\')">Got it</button>') + '<button class="primary" onclick="OH.press(\'done\')">Done</button>' : '')
      + '</div></div>';
  }
  function lineHtml(l){
    const live = l.key && l.id ? ((D()[l.key] || []).find(x => x && x.id === l.id) || null) : null;
    const since = live && live.status && live.status !== 'open' ? ' <span class="oh-ok">handled since</span>' : '';
    const open = l.key === 'ops_items' && l.id ? ' onclick="OH.card(\'' + esc(l.id) + '\')" style="cursor:pointer"' : '';
    return '<div class="oh-line"' + open + '><span class="oh-t">' + esc(chiT(l.at)) + '</span><span>' + esc(l.text) + since + '</span></div>';
  }
  function fullHtml(s){
    const r = s.report, n = s.note;
    const pills = (n ? '<span class="oh-pill r">Note from ' + esc(first(n.by_name) || 'Samantha') + '</span>' : '')
      + '<span class="oh-pill ' + ((r.needs || []).length ? 'r' : 'g') + '">' + (r.needs || []).length + ' need you</span>'
      + '<span class="oh-pill g">' + (r.handled || []).length + ' handled</span><span class="oh-pill b">' + (r.came_in || []).length + ' came in</span>';
    const quiet = !n && !(r.needs || []).length && !(r.handled || []).length && !(r.came_in || []).length;
    const sec = (t, arr, c) => arr && arr.length ? '<div class="oh-h ' + c + '">' + esc(t) + ' · ' + arr.length + '</div>' + arr.map(lineHtml).join('') : '';
    return '<div class="oh-card" id="ohCard"><div class="oh-top"><b>Overnight Handoff</b><span class="field-note">' + esc(chiT(r.from)) + ' ' + esc(dayName(r.from.slice(0, 10)).split(',')[0]) + ' to ' + esc(chiT(r.to)) + ' · not read yet</span></div>'
      + (n ? noteHtml(n, true) : '')
      + '<div class="oh-pills">' + pills + '</div>'
      + (ST.open || quiet ? (quiet ? '<div class="oh-quiet">Nothing happened overnight that needs you.</div>' : sec('Needs you this morning', r.needs, 'r') + sec('Handled overnight', r.handled, 'g') + sec('Came in overnight', r.came_in, 'b'))
          + ((r.errors || []).length ? '<div class="oh-err">Could not read ' + esc(r.errors.join(', ')) + '. Check before relying on this list.</div>' : '') : '')
      + '<div class="oh-row">' + (quiet ? '' : '<button class="ghost" onclick="OH.toggleOpen()">' + (ST.open ? 'Fold it' : 'Open it') + '</button>')
      + '<button class="primary" onclick="OH.read()">I\'ve read it</button></div></div>';
  }
  /* an owner's box for tomorrow's note */
  function writeHtml(s){
    const id = 'note_' + s.next, cur = items().find(x => x && x.id === id), txt = ST.draft != null ? ST.draft : (cur && cur.text) || '';
    return '<div class="oh-write"><div class="oh-k">Note for the morning of ' + esc(dayName(s.next)) + '</div>'
      + '<textarea id="ohDraft" rows="3" placeholder="What should the office do first thing? It goes at the top of the 8am email and on My Work." oninput="OH.draft(this.value)">' + esc(txt) + '</textarea>'
      + '<div class="oh-row"><button class="primary" ' + (ST.busy ? 'disabled ' : '') + 'onclick="OH.saveNote()">' + (cur ? 'Save changes' : 'Save the note') + '</button>'
      + (cur ? '<button class="ghost" onclick="OH.clearNote()">Remove it</button><span class="field-note">Saved ' + esc(t12(cur.updated_at || cur.at)) + '</span>' : '') + '</div></div>';
  }
  const css = () => { if(document.getElementById('ohCss')) return; const st = document.createElement('style'); st.id = 'ohCss';
    st.textContent = '.oh-card{background:#fff;border:2px solid var(--navy);border-radius:12px;padding:14px 16px;margin:0 0 12px;display:grid;gap:10px}'
      + '.oh-top{display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:space-between;align-items:baseline}.oh-top b{color:var(--navy);font-size:17px}'
      + '.oh-note{background:#FFF4DE;border-radius:9px;padding:11px 13px;display:grid;gap:5px}.oh-k{font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#A8660E}'
      + '.oh-txt{font-size:15px;line-height:1.5;white-space:pre-wrap}.oh-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.oh-row button{padding:6px 14px;font-size:13px}'
      + '.oh-pills{display:flex;flex-wrap:wrap;gap:6px}.oh-pill{font-size:12px;font-weight:700;border-radius:99px;padding:2px 10px}.oh-pill.r{background:#FDE8E8;color:#B23B2E}.oh-pill.g{background:#E7F6EC;color:#1F7A4D}.oh-pill.b{background:#E8EEF8;color:var(--navy)}'
      + '.oh-h{font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin-top:4px}.oh-h.r{color:#B23B2E}.oh-h.g{color:#1F7A4D}.oh-h.b{color:var(--navy)}'
      + '.oh-line{display:grid;grid-template-columns:64px 1fr;gap:8px;font-size:14px;padding:3px 0}.oh-t{color:var(--text-muted);font-size:12px;padding-top:2px}'
      + '.oh-ok{color:#1F7A4D;font-weight:600;font-size:12.5px}.oh-quiet{font-size:14px}.oh-err{color:#B23B2E;font-size:13px}'
      + '.oh-write{display:grid;gap:6px}.oh-write textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:8px 10px;border:1px solid var(--border);border-radius:8px}'
      + '.oh-flag{color:#B23B2E;font-weight:700}@media(max-width:480px){.oh-line{grid-template-columns:1fr;gap:0}}';
    document.head.appendChild(st); };

  /* ── My Work: the pin above everything (index.html renderMyWork calls OH.pin()) ── */
  function pin(){
    const box = document.getElementById('ohPin'); if(!box) return;
    if(!on()){ box.innerHTML = ''; return; }
    css(); const s = state(items(), chiNow());
    if(!s.report && Number(chiNow().slice(11, 13)) >= SEND_HOUR) refresh();
    let h = s.pin === 'full' ? fullHtml(s) : s.pin === 'note' ? '<div class="oh-card">' + noteHtml(s.note, true) + '</div>' : '';
    if(owner()) h += '<details class="card" style="padding:10px 14px;margin:0 0 12px;"' + (ST.draft != null ? ' open' : '') + '><summary style="cursor:pointer;font-weight:700;color:var(--navy);font-size:13.5px;">Leave a note for the morning</summary><div style="margin-top:8px;">' + writeHtml(s) + '</div></details>';
    box.innerHTML = h;
  }
  /* ── Owner Overview: one full-width box (owner-overview.js draw calls OH.overviewHtml()) ── */
  function overviewHtml(){
    if(!on()) return '';
    css(); const s = state(items(), chiNow()), rd = s.read;
    let status = '';
    if(s.note) status += noteHtml(s.note, false) + (s.note.got_it && s.note.got_it.at ? '' : '<div class="field-note">Nobody has pressed Got it yet.</div>');
    if(rd) status += '<div class="ov-it"><div class="t">Overnight Handoff read by ' + esc(first(rd.by_name)) + ' at ' + esc(t12(rd.at)) + (rd.on_duty ? ' (on duty)' : '') + '</div></div>';
    else if(s.flag) status += '<div class="ov-it"><div class="t oh-flag">Overnight Handoff not read yet</div><div class="m">It went out at 8am. Nobody has pressed I\'ve read it on My Work.</div></div>';
    else if(s.report) status += '<div class="ov-it"><div class="m">This morning\'s Overnight Handoff went out at ' + esc(t12(s.report.sent_at)) + '; not read yet.</div></div>';
    return '<div class="ov-box" style="margin-bottom:12px;"><h4>Overnight Handoff' + (s.flag ? ' <span class="n" style="color:#B23B2E">not read</span>' : '') + '</h4>' + status + writeHtml(s) + '</div>';
  }

  /* ── actions ── */
  async function press(what){
    const s = state(items(), chiNow()); if(!s.note) return;
    const next = mark(s.note, what, actor(), new Date().toISOString()); if(!next) return;
    await save(next);
    try{ W.ccToast(what === 'done' ? 'Marked Done. ' + first(s.note.by_name) + ' will see it.' : 'Got it.'); }catch(e){}
    try{ if(typeof W.opEvent === 'function') W.opEvent('overnight_note_' + what, { summary:(actor().name || actor().email || 'Someone') + (what === 'done' ? ' did' : ' saw') + ' the morning note' }); }catch(e){}
    redraw();
  }
  async function read(){
    const s = state(items(), chiNow()); if(!s.report || s.read) return;
    const a = actor(), email = String(a.email || '').toLowerCase();
    await save({ id:'read_' + s.today, kind:'read', date:s.today, by:email, by_name:String(a.name || email), at:new Date().toISOString(), on_duty:onDuty(email) });
    try{ if(typeof W.opEvent === 'function') W.opEvent('overnight_handoff_read', { summary:(a.name || email) + ' read the Overnight Handoff' }); }catch(e){}
    ST.open = false; redraw();
  }
  async function saveNote(){
    if(!owner()){ alert('Only Samantha or Zachary can leave the morning note.'); return; }
    const el = document.getElementById('ohDraft'), txt = String(el ? el.value : ST.draft || '').trim();
    if(!txt){ alert('Type the note first.'); return; }
    const s = state(items(), chiNow()), id = 'note_' + s.next, cur = items().find(x => x && x.id === id), a = actor(), at = new Date().toISOString();
    ST.busy = true; redraw();
    await save(Object.assign({}, cur || {}, { id, kind:'note', for_date:s.next, text:txt, by:String(a.email || '').toLowerCase(), by_name:String(a.name || a.email || ''), at:(cur && cur.at) || at, updated_at:at }));
    ST.busy = false; ST.draft = null;
    try{ W.ccToast('Saved. It goes out at 8am ' + dayName(s.next).split(',')[0] + '.'); }catch(e){}
    redraw();
  }
  async function clearNote(){
    const s = state(items(), chiNow()), id = 'note_' + s.next, cur = items().find(x => x && x.id === id); if(!cur || !owner()) return;
    await save(Object.assign({}, cur, { text:'', removed_at:new Date().toISOString() })); ST.draft = null; redraw();
  }
  /* Settings: the switch and the hours (owners only; every change goes through tkMerge, which keeps who/what/when) */
  async function toggle(btn){
    if(!owner()){ alert('Only Samantha or Zachary can change this.'); return; }
    const want = !on();
    const ok = typeof W.ccConfirm === 'function' ? await W.ccConfirm(want ? 'Turn on the Overnight Handoff?\n\n· the 8am Morning Brief opens with your note and what happened overnight (8pm to 7am; Monday covers the weekend)\n· My Work pins it at the top until someone presses I\'ve read it\n· Owner Overview shows Got it and Done on your note, and from 9am a red line if nobody has read it\n\nIt replaces "While you were out" in the email. Nothing is texted to anyone.' : 'Turn off the Overnight Handoff? The 8am email goes back to "While you were out", and the pin and note box go away. Notes already saved are kept.') : true;
    if(!ok) return;
    if(btn) btn.disabled = true;
    const r = typeof W.tkMerge === 'function' ? await W.tkMerge(m => { m.overnight_handoff_live = want; if(want && !m.overnight_handoff_live_since) m.overnight_handoff_live_since = new Date().toISOString(); return ['Overnight Handoff ' + (want ? 'ON' : 'OFF')]; }, 'Overnight Handoff') : { error:{ message:'saving is not available here' } };
    if(btn) btn.disabled = false;
    const sv = document.getElementById('ohSaved'); if(sv) sv.textContent = r && r.error ? 'Could not save: ' + r.error.message : (want ? 'On.' : 'Off.');
    settingsFill(); redraw();
  }
  async function saveHours(){
    if(!owner()){ alert('Only Samantha or Zachary can change this.'); return; }
    const f = (document.getElementById('ohFrom') || {}).value, t = (document.getElementById('ohTo') || {}).value;
    if(!/^\d\d:\d\d$/.test(f || '') || !/^\d\d:\d\d$/.test(t || '')){ alert('Pick both times.'); return; }
    const r = typeof W.tkMerge === 'function' ? await W.tkMerge(m => { m.overnight_handoff_hours = { from:f, to:t }; return ['Overnight Handoff hours ' + f + ' to ' + t]; }, 'Overnight Handoff hours') : { error:{ message:'saving is not available here' } };
    const sv = document.getElementById('ohSaved'); if(sv) sv.textContent = r && r.error ? 'Could not save: ' + r.error.message : 'Hours saved.';
  }
  function settingsFill(){
    const st = D().ops_settings || {}, h = st.overnight_handoff_hours || {};
    const now = document.getElementById('ohSetNow'); if(now) now.textContent = on() ? 'On since ' + String(st.overnight_handoff_live_since || '').slice(0, 10) + '.' : 'Off.';
    const b = document.getElementById('ohToggleBtn'); if(b) b.textContent = on() ? 'Turn off the Overnight Handoff' : 'Turn on the Overnight Handoff';
    const f = document.getElementById('ohFrom'); if(f && !f.matches(':focus')) f.value = /^\d\d:\d\d$/.test(h.from || '') ? h.from : '20:00';
    const t = document.getElementById('ohTo'); if(t && !t.matches(':focus')) t.value = /^\d\d:\d\d$/.test(h.to || '') ? h.to : '07:00';
  }
  function card(id){ if(W.OV && typeof OV.card === 'function') return OV.card(id); try{ W.switchTab('mywork'); }catch(e){} }

  W.OH = Object.assign({}, CORE, { on, pin, overviewHtml, press, read, saveNote, clearNote, toggle, saveHours, settingsFill, card, refresh,
    toggleOpen:() => { ST.open = !ST.open; pin(); }, draft:v => { ST.draft = v; }, state:() => state(items(), chiNow()) });
})(typeof window !== 'undefined' ? window : this);
