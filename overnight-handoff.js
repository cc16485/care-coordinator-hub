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
     moves what is theirs to My Desk and presses Close out the overnight (who, when, on duty and how much went to a desk are kept).
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
      /* 9am Owner Overview flag: a weekday, the brief has gone, nobody has closed it out */
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
  /* was the person closing out the overnight on duty right now (in charge or operations)? */
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
  /* My Desk (desk.js): the line goes on today's page with a paperclip back to its card or lead */
  const deskOn = () => { try{ return typeof W.dkAllowed === 'function' && W.dkAllowed() && typeof W.dkQuickJot === 'function'; }catch(e){ return false; } };
  const lineKey = (sec, l, i) => sec + ':' + (l.id || i);
  const deskLink = l => l.key === 'ops_items' && l.id ? { type:'work', id:l.id, name:String(l.text).slice(0, 80) }
    : l.key === 'leads' && l.id ? { type:'lead', lead_id:String(l.id), ax:'', name:String(l.text).replace(/^New lead:\s*/, '').split(',')[0].slice(0, 80) } : null;
  const movedOf = s => (items().find(x => x && x.id === 'moved_' + s.today) || {}).lines || {};
  function stillLive(l){ const live = l.key && l.id ? ((D()[l.key] || []).find(x => x && x.id === l.id) || null) : null; return !(live && live.status && live.status !== 'open'); }
  function lineHtml(sec, l, i, moved){
    const k = lineKey(sec, l, i), m = moved[k], since = !stillLive(l) ? ' <span class="oh-ok">handled since</span>' : '';
    const open = l.key === 'ops_items' && l.id ? ' class="oh-go" onclick="OH.card(\'' + esc(l.id) + '\')"' : '';
    const act = m ? '<span class="oh-moved">On ' + esc(first(m.by_name)) + '\'s desk</span>'
      : deskOn() ? '<button class="oh-desk" onclick="OH.move(\'' + esc(k) + '\')">Move to my desk</button>' : '';
    return '<div class="oh-line"><span class="oh-t">' + esc(chiT(l.at)) + '</span><span' + open + '>' + esc(l.text) + since + '</span><span class="oh-a">' + act + '</span></div>';
  }
  /* the night sky behind the card: stars and a moon at the top, the sun coming up over the hills at the bottom */
  const SCENE = '<svg class="oh-scene" viewBox="0 0 640 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
    + '<defs><radialGradient id="ohGlow" cx="85%" cy="100%" r="60%"><stop offset="0" stop-color="#FFD27A" stop-opacity=".8"/><stop offset=".45" stop-color="#F0A63A" stop-opacity=".3"/><stop offset="1" stop-color="#F0A63A" stop-opacity="0"/></radialGradient></defs>'
    + '<rect width="640" height="260" fill="url(#ohGlow)"/>'
    + [[90,26,1.3],[170,58,1],[250,20,1.5],[330,48,1],[400,24,1.2],[470,64,.9],[200,96,.8],[60,80,.9],[300,104,.7],[430,112,.7],[120,140,.6],[360,150,.6]].map(([x,y,r],j) => '<circle class="oh-star" style="animation-delay:' + (j * .37).toFixed(2) + 's" cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#fff"/>').join('')
    + '</svg>'
    /* the moon, top right */
    + '<svg class="oh-moon" viewBox="0 0 60 60" aria-hidden="true"><defs><mask id="ohCres"><rect width="60" height="60" fill="#fff"/><circle cx="40" cy="22" r="20" fill="#000"/></mask></defs>'
    + '<circle cx="30" cy="30" r="22" fill="#F6F1DA" mask="url(#ohCres)"/></svg>'
    /* the sun coming up, bottom right, behind the hills */
    + '<svg class="oh-sunbox" viewBox="0 0 200 110" aria-hidden="true"><g class="oh-sun"><circle cx="100" cy="100" r="44" fill="#FFC85A"/>'
    + [0,1,2,3,4,5,6].map(j => { const a = Math.PI * (j + 1) / 8, x1 = 100 - Math.cos(a) * 56, y1 = 100 - Math.sin(a) * 56, x2 = 100 - Math.cos(a) * 74, y2 = 100 - Math.sin(a) * 74; return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="#FFC85A" stroke-width="5" stroke-linecap="round"/>'; }).join('') + '</g></svg>'
    + '<svg class="oh-hills" viewBox="0 0 640 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 22 C90 4 170 10 250 22 C330 34 420 8 500 16 C560 22 610 14 640 8 L640 40 L0 40 Z" fill="#141B3D"/></svg>';
  function fullHtml(s){
    const r = s.report, n = s.note, moved = movedOf(s);
    const needs = r.needs || [], handled = r.handled || [], came = r.came_in || [];
    const quiet = !n && !needs.length && !handled.length && !came.length;
    const left = needs.filter((l, i) => !moved[lineKey('needs', l, i)] && stillLive(l)).length;
    const tile = (num, word, c) => '<div class="oh-tile ' + c + '"><b>' + num + '</b><span>' + word + '</span></div>';
    const sec = (key, t, arr, c) => arr.length ? '<div class="oh-h ' + c + '">' + esc(t) + ' · ' + arr.length + '</div>' + arr.map((l, i) => lineHtml(key, l, i, moved)).join('') : '';
    return '<div class="oh-sky" id="ohCard">' + SCENE + '<div class="oh-in">'
      + '<div class="oh-eyebrow">Last night · ' + esc(chiT(r.from)) + ' ' + esc(dayName(r.from.slice(0, 10)).split(',')[0]) + ' to ' + esc(chiT(r.to)) + '</div>'
      + '<h3 class="oh-title">Overnight Handoff</h3>'
      + '<div class="oh-sub">' + (quiet ? 'A quiet night. Nothing happened overnight that needs you.' : 'Read it, move what is yours to your desk, then close out the overnight.') + '</div>'
      + (n ? noteHtml(n, true) : '')
      + (quiet ? '' : '<div class="oh-tiles">' + tile(needs.length, 'need you', needs.length ? 'r' : 'g') + tile(handled.length, 'handled', 'g') + tile(came.length, 'came in', 'b') + '</div>')
      + (needs.length ? '<div class="oh-panel">' + sec('needs', 'Needs you this morning', needs, 'r')
          + (left && deskOn() ? '<div class="oh-row" style="margin-top:6px;"><button class="oh-desk all" onclick="OH.moveAll()">Move all ' + left + ' to my desk</button></div>' : '') + '</div>' : '')
      + (handled.length || came.length ? '<div class="oh-panel">' + (ST.open ? sec('handled', 'Handled overnight', handled, 'g') + sec('came_in', 'Came in overnight', came, 'b')
          : '<button class="oh-more" onclick="OH.toggleOpen()">Show what was handled (' + handled.length + ') and what came in (' + came.length + ')</button>') + '</div>' : '')
      + ((r.errors || []).length ? '<div class="oh-err">Could not read ' + esc(r.errors.join(', ')) + '. Check before relying on this list.</div>' : '')
      + (!deskOn() && needs.length ? '<div class="oh-sub" style="font-size:12.5px;">My Desk is not on for you, so handle these from My Work before you close out.</div>' : '')
      + '<div class="oh-row oh-foot"><button class="oh-close" onclick="OH.closeOut()"><span aria-hidden="true">☀</span> Close out the overnight</button>'
      + (ST.open && (handled.length || came.length) ? '<button class="oh-more" onclick="OH.toggleOpen()">Fold the rest</button>' : '') + '</div>'
      + '</div></div>';
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
    /* one deliberate night-to-dawn look in both Hub themes: the card sets every color it uses */
    st.textContent = '.oh-sky{position:relative;overflow:hidden;border-radius:16px;margin:0 0 14px;color:#F3F1FA;background:linear-gradient(180deg,#070D2B 0%,#121C4A 42%,#3A2E66 70%,#9A5163 88%,#E39A4C 100%);box-shadow:0 10px 30px rgba(10,14,48,.35)}'
      + '.oh-scene{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.oh-in{position:relative;padding:20px 22px 30px;display:grid;gap:12px}'
      + '.oh-star{animation:ohTw 3.2s ease-in-out infinite}@keyframes ohTw{0%,100%{opacity:.9}50%{opacity:.25}}'
      + '.oh-moon{position:absolute;top:16px;right:22px;width:58px;height:58px;filter:drop-shadow(0 0 12px rgba(246,241,218,.45));pointer-events:none}.oh-sunbox{position:absolute;right:28px;bottom:14px;width:190px;height:105px;pointer-events:none;overflow:visible}.oh-hills{position:absolute;left:0;right:0;bottom:0;width:100%;height:46px;pointer-events:none}.oh-sun{animation:ohRise 2.4s cubic-bezier(.2,.7,.2,1) both}@keyframes ohRise{from{transform:translateY(60px)}to{transform:translateY(0)}}'
      + '.oh-sky.oh-dawn{transition:filter 1s,opacity .5s .9s;filter:brightness(1.5) saturate(1.2);opacity:0}.oh-sky.oh-dawn .oh-sun{transition:transform 1s;transform:translateY(-40px)}.oh-sky.oh-dawn .oh-moon{transition:opacity .6s;opacity:0}'
      + '.oh-eyebrow{font-size:11.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#C9C3F0;padding-right:70px}'
      + '.oh-title{margin:0;font-size:30px;line-height:1.1;font-weight:800;letter-spacing:-.01em;color:#fff;padding-right:70px;text-wrap:balance}'
      + '.oh-sub{font-size:14px;color:#D6D2EE;max-width:62ch}'
      + '.oh-note{background:#FFF4DE;color:#2A2140;border-radius:10px;padding:12px 14px;display:grid;gap:6px;box-shadow:0 4px 14px rgba(0,0,0,.25)}.oh-k{font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#A8660E}'
      + '.oh-txt{font-size:16px;line-height:1.5;white-space:pre-wrap}.oh-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.oh-row button{padding:6px 14px;font-size:13px}'
      + '.oh-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-width:520px}.oh-tile{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-radius:12px;padding:10px 12px;display:grid}'
      + '.oh-tile b{font-size:28px;line-height:1;font-variant-numeric:tabular-nums}.oh-tile span{font-size:12px;letter-spacing:.04em;color:#D6D2EE}.oh-tile.r b{color:#FF9F8A}.oh-tile.g b{color:#8FE0C9}.oh-tile.b b{color:#AFC6FF}'
      + '.oh-panel{background:rgba(6,10,36,.55);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 14px;display:grid;gap:2px;backdrop-filter:blur(3px)}'
      + '.oh-h{font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin:6px 0 2px}.oh-h.r{color:#FF9F8A}.oh-h.g{color:#8FE0C9}.oh-h.b{color:#AFC6FF}'
      + '.oh-line{display:grid;grid-template-columns:62px minmax(0,1fr) auto;gap:10px;align-items:center;font-size:14.5px;padding:6px 0;border-top:1px solid rgba(255,255,255,.08)}.oh-h+.oh-line{border-top:0}'
      + '.oh-t{color:#B9B3DC;font-size:12px;font-variant-numeric:tabular-nums}.oh-go{cursor:pointer;text-decoration:underline;text-decoration-color:rgba(255,255,255,.3);text-underline-offset:3px}'
      + '.oh-desk{background:transparent;color:#FFE1A8;border:1px solid rgba(255,225,168,.55);border-radius:99px;padding:4px 12px;font-size:12.5px;font-weight:700;white-space:nowrap;cursor:pointer}.oh-desk:hover,.oh-desk:focus-visible{background:rgba(255,225,168,.15);outline:none}'
      + '.oh-desk.all{background:rgba(255,225,168,.14)}.oh-moved{font-size:12.5px;font-weight:700;color:#8FE0C9;white-space:nowrap}'
      + '.oh-more{background:transparent;border:0;color:#C9C3F0;font-size:13px;font-weight:700;padding:4px 0;cursor:pointer;text-align:left;text-decoration:underline;text-underline-offset:3px}'
      + '.oh-close{background:linear-gradient(180deg,#FFD27A,#F0A63A);color:#1B1640;border:0;border-radius:99px;padding:11px 22px!important;font-size:15px!important;font-weight:800;box-shadow:0 6px 18px rgba(240,166,58,.45);cursor:pointer}.oh-close:hover,.oh-close:focus-visible{filter:brightness(1.06);outline:2px solid #fff;outline-offset:2px}'
      + '.oh-foot{margin-top:4px}.oh-ok{color:#1F7A4D;font-weight:600;font-size:12.5px}.oh-sky .oh-panel .oh-ok{color:#8FE0C9}.oh-err{color:#FFB4A6;font-size:13px}'
      + '.oh-mini{padding:12px 16px}.oh-mini .oh-in{padding:0;gap:8px}'
      + '.oh-write{display:grid;gap:6px}.oh-write textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:8px 10px;border:1px solid var(--border);border-radius:8px}'
      + '.oh-flag{color:#B23B2E;font-weight:700}'
      + '@media(max-width:560px){.oh-title{font-size:24px}.oh-moon{width:44px;height:44px;right:14px}.oh-sunbox{width:130px;height:72px;right:10px}.oh-line{grid-template-columns:1fr;gap:4px}.oh-tiles{gap:6px}.oh-tile b{font-size:22px}}'
      + '@media(prefers-reduced-motion:reduce){.oh-star,.oh-sun{animation:none}.oh-sky.oh-dawn,.oh-sky.oh-dawn .oh-sun{transition:none}}';
    document.head.appendChild(st); };

  /* ── My Work: the pin above everything (index.html renderMyWork calls OH.pin()) ── */
  function pin(){
    const box = document.getElementById('ohPin'); if(!box) return;
    if(!on()){ box.innerHTML = ''; return; }
    if(ST.closing) return;   /* the sunrise is playing */
    css(); const s = state(items(), chiNow());
    if(!s.report && Number(chiNow().slice(11, 13)) >= SEND_HOUR) refresh();
    let h = s.pin === 'full' ? fullHtml(s) : s.pin === 'note' ? '<div class="oh-sky oh-mini">' + '<div class="oh-in">' + noteHtml(s.note, true) + '</div></div>' : '';
    if(owner()) h += '<details class="card" style="padding:10px 14px;margin:0 0 12px;"' + (ST.draft != null ? ' open' : '') + '><summary style="cursor:pointer;font-weight:700;color:var(--navy);font-size:13.5px;">Leave a note for the morning</summary><div style="margin-top:8px;">' + writeHtml(s) + '</div></details>';
    box.innerHTML = h;
  }
  /* ── Owner Overview: one full-width box (owner-overview.js draw calls OH.overviewHtml()) ── */
  function overviewHtml(){
    if(!on()) return '';
    css(); const s = state(items(), chiNow()), rd = s.read;
    let status = '';
    if(s.note) status += noteHtml(s.note, false) + (s.note.got_it && s.note.got_it.at ? '' : '<div class="field-note">Nobody has pressed Got it yet.</div>');
    if(rd) status += '<div class="ov-it"><div class="t">Overnight closed out by ' + esc(first(rd.by_name)) + ' at ' + esc(t12(rd.at)) + (rd.on_duty ? ' (on duty)' : '') + '</div>'
      + (rd.moved ? '<div class="m">' + rd.moved + ' moved to a desk' + (rd.left ? ', ' + rd.left + ' that needed someone left off' : '') + '</div>' : (rd.left ? '<div class="m">' + rd.left + ' that needed someone were not moved to a desk</div>' : '')) + '</div>';
    else if(s.flag) status += '<div class="ov-it"><div class="t oh-flag">Overnight not closed out yet</div><div class="m">It went out at 8am. Nobody has closed out the overnight on My Work.</div></div>';
    else if(s.report) status += '<div class="ov-it"><div class="m">This morning\'s Overnight Handoff went out at ' + esc(t12(s.report.sent_at)) + '; not closed out yet.</div></div>';
    return '<div class="ov-box" style="margin-bottom:12px;"><h4>Overnight Handoff' + (s.flag ? ' <span class="n" style="color:#B23B2E">not closed out</span>' : '') + '</h4>' + status + writeHtml(s) + '</div>';
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
  /* Move to my desk: the line goes on the presser's own desk page with a paperclip; the handoff remembers who took it */
  async function moveLines(keys){
    const s = state(items(), chiNow()); if(!s.report || !deskOn()) return 0;
    const all = []; ['needs', 'handled', 'came_in'].forEach(sec => (s.report[sec] || []).forEach((l, i) => all.push([lineKey(sec, l, i), l])));
    const a = actor(), at = new Date().toISOString(), done = {};
    for(const [k, l] of all){
      if(keys.indexOf(k) < 0 || movedOf(s)[k]) continue;
      const ok = await W.dkQuickJot('Overnight: ' + l.text, false, deskLink(l));
      if(ok) done[k] = { by:String(a.email || '').toLowerCase(), by_name:String(a.name || a.email || ''), at };
    }
    const n = Object.keys(done).length; if(!n){ try{ W.ccToast('Could not open your desk just now.'); }catch(e){} return 0; }
    const cur = items().find(x => x && x.id === 'moved_' + s.today) || { id:'moved_' + s.today, kind:'moved', date:s.today, lines:{} };
    await save(Object.assign({}, cur, { lines:Object.assign({}, cur.lines || {}, done) }));
    try{ W.ccToast(n === 1 ? 'On your desk, with a paperclip.' : n + ' on your desk, each with a paperclip.'); }catch(e){}
    pin(); return n;
  }
  const move = k => moveLines([k]);
  function moveAll(){
    const s = state(items(), chiNow()); if(!s.report) return 0;
    const m = movedOf(s); return moveLines((s.report.needs || []).map((l, i) => [lineKey('needs', l, i), l]).filter(([k, l]) => !m[k] && stillLive(l)).map(([k]) => k));
  }
  /* Close out the overnight: kept with who, when, on duty, and how much went to a desk. The sunrise plays, then it goes. */
  async function closeOut(){
    const s = state(items(), chiNow()); if(!s.report || s.read) return;
    const m = movedOf(s), needs = s.report.needs || [];
    const left = needs.filter((l, i) => !m[lineKey('needs', l, i)] && stillLive(l)).length;
    if(left && typeof W.ccConfirm === 'function' && !(await W.ccConfirm(left + (left === 1 ? ' thing that needs' : ' things that need') + ' someone ' + (left === 1 ? 'is' : 'are') + ' not on a desk yet and not handled.\n\nClose out the overnight anyway?'))) return;
    const a = actor(), email = String(a.email || '').toLowerCase();
    await save({ id:'read_' + s.today, kind:'read', closed:true, date:s.today, by:email, by_name:String(a.name || email), at:new Date().toISOString(), on_duty:onDuty(email), moved:Object.keys(m).length, left });
    try{ if(typeof W.opEvent === 'function') W.opEvent('overnight_handoff_read', { summary:(a.name || email) + ' closed out the overnight' + (Object.keys(m).length ? ' (' + Object.keys(m).length + ' moved to a desk)' : '') }); }catch(e){}
    const card = document.getElementById('ohCard'), still = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ST.open = false;
    if(card && !still){ ST.closing = true; card.classList.add('oh-dawn'); await new Promise(r => setTimeout(r, 1500)); ST.closing = false; }
    try{ W.ccToast('Good morning. The overnight is closed out.'); }catch(e){}
    redraw();
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
    const ok = typeof W.ccConfirm === 'function' ? await W.ccConfirm(want ? 'Turn on the Overnight Handoff?\n\n· the 8am Morning Brief opens with your note and what happened overnight (8pm to 7am; Monday covers the weekend)\n· My Work pins it at the top, night sky and all, until someone moves what is theirs to their desk and closes out the overnight\n· Owner Overview shows Got it and Done on your note, and from 9am a red line if nobody has closed it out\n\nIt replaces "While you were out" in the email. Nothing is texted to anyone.' : 'Turn off the Overnight Handoff? The 8am email goes back to "While you were out", and the pin and note box go away. Notes already saved are kept.') : true;
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

  W.OH = Object.assign({}, CORE, { on, pin, overviewHtml, press, closeOut, read:closeOut, move, moveAll, saveNote, clearNote, toggle, saveHours, settingsFill, card, refresh,
    toggleOpen:() => { ST.open = !ST.open; pin(); }, deskOn, draft:v => { ST.draft = v; }, state:() => state(items(), chiNow()) });
})(typeof window !== 'undefined' ? window : this);
