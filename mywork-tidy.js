/* =====================================================================================================================
   MY WORK, TIDIER (Samantha 2026-10-22, looking at My Work: "Big pile of nobody's work needs to be cleared and be able to
   choose many or clear them more easily ... maybe do a look at if we need every notification"; "remove too much stuff at
   the top"; approved mockup https://claude.ai/artifact/12fzWPbw75wAZcHdF3Ufa6). Read-only 1069 found 105 cards in the Team
   Work pile, 81 of them call cards from the AI call reader, most about days that had passed.
   Only while ops_settings.mywork_tidy_live is on:
   · Team Work: the escalation rules are said once at the top instead of on every card. Owners get a box on each card,
     "Select everything over 3 days late", and Clear selected with one reason; every cleared card keeps who, when and why
     (status done, resolution_code 'cleared'), and Undo reopens the last clear for a day.
   · Fewer cards in the pile: a call card 2 days past its due day goes to Past its day (still open, folded); "Make it
     official?" suggestions show as one weekly line; EVV review cards are not shown (EVV is retired since 2026-10-17).
   · The top of My Work: one short line instead of the five summary boxes, and five tabs (Today, Team Work, All mine,
     Waiting, More); More holds the rest and shows when one of them has something.
   · Settings > Clear old cards (owners): every open card more than 7 days late, by person, to clear with a reason (the
     one-time cleanup, Zach's six write-up reminder cards included; the write-up records themselves are not touched).
   Nothing here texts, emails or calls anyone. Off: nothing changes anywhere.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const DAY = 864e5;
  const lc = s => String(s == null ? '' : s).trim().toLowerCase();
  const ms = v => { const t = Date.parse(v || ''); return isNaN(t) ? null : t; };
  /* ── the rules (pure; tests/mywork-tidy-test.js runs them under node) ── */
  function liveOn(settings){ return !!(settings && settings.mywork_tidy_live === true); }
  function official(it){ return /^\s*make it official\?/i.test(String(it && it.title || '')); }
  function evv(it){ return /^evv[_-]?review$/.test(lc(it && it.kind)); }
  /* a call card whose due day ended more than 2 days ago (its day has passed) */
  function callPast(it, now){ if(lc(it && it.kind) !== 'call_followup') return false; const d = ms(it.due); return d != null && now - d > 2 * DAY; }
  /* where a Team Work card goes while tidy is on: '' (the pile), 'past', 'official' or 'evv' */
  function sortOut(it, now){ if(evv(it)) return 'evv'; if(official(it)) return 'official'; if(callPast(it, now)) return 'past'; return ''; }
  /* how late a card is in days (by due, else when it was made); 0 when not late */
  function daysLate(it, now){ const d = ms(it && it.due) != null ? ms(it.due) : ms(it && it.created_at); return d == null || d > now ? 0 : Math.floor((now - d) / DAY); }
  const REASONS = ['Handled by phone', 'The day has passed', 'Already done in AxisCare', 'Not needed', 'Old or test card'];
  /* the change Clear makes on one open card (kept on the card: who, when, why); returns null when the card is not open */
  function clearOne(it, who, why, at){
    if(!it || it.status !== 'open') return null;
    const name = String(who && (who.name || who.email) || ''), by = lc(who && who.email);
    return Object.assign({}, it, { status:'done', closed_at:at, closed_by:by, resolution_code:'cleared', close_reason:why,
      cleared:{ by, by_name:name, at, why, from:'open' }, last_activity_at:at,
      history:(Array.isArray(it.history) ? it.history : []).concat([{ at, by:name || by, text:'Cleared: ' + why }]).slice(-60) });
  }
  /* Undo puts it back exactly open, keeping the clear in its history */
  function reopenOne(it, who, at){
    if(!it || it.status !== 'done' || it.resolution_code !== 'cleared') return null;
    const o = Object.assign({}, it, { status:'open', last_activity_at:at, history:(Array.isArray(it.history) ? it.history : []).concat([{ at, by:String(who && (who.name || who.email) || ''), text:'Reopened (undo clear)' }]).slice(-60) });
    ['closed_at', 'closed_by', 'resolution_code', 'close_reason', 'cleared'].forEach(k => { delete o[k]; });
    return o;
  }
  const CORE = { liveOn, official, evv, callPast, sortOut, daysLate, clearOne, reopenOne, REASONS };
  if(typeof module !== 'undefined' && module.exports){ module.exports = CORE; return; }

  /* ═══════════════════════════════════ in the Hub ═══════════════════════════════════════════════════════════════ */
  const W = root;
  const D = () => { try{ return DATA || {}; }catch(e){ return {}; } };
  const esc = s => (typeof W.escapeHtmlComms === 'function' ? W.escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
  const on = () => liveOn(D().ops_settings || {});
  const owner = () => { try{ return !!W.ccIsOwner(); }catch(e){ return false; } };
  const actor = () => { try{ return W.ccActor() || {}; }catch(e){ return {}; } };
  const T = { sel:new Set(), why:REASONS[0], open:false, last:null, oldSel:new Set(), oldWhy:REASONS[4] };
  try{ const u = JSON.parse(localStorage.getItem('mwtLastClear') || 'null'); if(u && Date.now() - Date.parse(u.at) < DAY) T.last = u; }catch(e){}
  function redraw(){ try{ if(typeof W.myWorkRefresh === 'function') W.myWorkRefresh(); else if(typeof W.renderMyWork === 'function') W.renderMyWork(); }catch(e){} try{ oldFill(); }catch(e){} }
  async function clear(ids, why){
    if(!owner()){ alert('Only Samantha or Zachary can clear cards.'); return 0; }
    const a = actor(), at = new Date().toISOString(), items = (D().ops_items || []);
    let n = 0; const done = [];
    for(const id of ids){
      const i = items.findIndex(x => x && x.id === id); if(i < 0) continue;
      const next = clearOne(items[i], a, why, at); if(!next) continue;
      items[i] = Object.assign(items[i], next);
      if(typeof W.persist === 'function') await W.persist('ops_items', items[i]);
      n++; done.push(id);
    }
    try{ if(n && typeof W.opEvent === 'function') W.opEvent('items_cleared', { summary:(a.name || a.email || 'An owner') + ' cleared ' + n + ' card' + (n === 1 ? '' : 's') + ': ' + why }); }catch(e){}
    T.last = { ids:done, at, why, by:lc(a.email) };
    try{ localStorage.setItem('mwtLastClear', JSON.stringify(T.last)); }catch(e){}
    return n;
  }
  async function undo(){
    if(!T.last || !owner()) return;
    const a = actor(), at = new Date().toISOString(), items = (D().ops_items || []);
    let n = 0;
    for(const id of T.last.ids){
      const i = items.findIndex(x => x && x.id === id); if(i < 0) continue;
      const next = reopenOne(items[i], a, at); if(!next) continue;
      Object.keys(items[i]).forEach(k => { if(!(k in next)) delete items[i][k]; }); Object.assign(items[i], next);
      if(typeof W.persist === 'function') await W.persist('ops_items', items[i]); n++;
    }
    T.last = null; try{ localStorage.removeItem('mwtLastClear'); }catch(e){}
    try{ W.ccToast('Reopened ' + n + ' card' + (n === 1 ? '' : 's') + '.'); }catch(e){}
    redraw();
  }

  /* ── Team Work hooks (team-work.js asks these only while tidy is on) ── */
  const RULES = 'How every card here escalates, said once: not taken in 15 min, everyone on duty sees an alert; deadline missed, the person in charge; an hour after, Owner Overview. No texts. Care at risk cards still text Samantha at 20 minutes and Zach at 35.';
  function box(id){ return owner() ? '<input type="checkbox" class="mwt-box" aria-label="Select this card" style="width:18px;height:18px;margin:2px 4px 0 0;accent-color:var(--navy);" ' + (T.sel.has(id) ? 'checked ' : '') + 'onclick="event.stopPropagation()" onchange="MWTidy.pick(\'' + esc(id) + '\',this.checked)">' : ''; }
  function toolbar(rows){
    if(!owner()) return '';
    const now = Date.now(), old = rows.filter(x => daysLate(x.it, now) > 3).length, n = [...T.sel].filter(id => rows.some(x => x.it.id === id)).length;
    let h = '<div class="card mwt-bar" style="padding:10px 14px;margin-bottom:10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;">'
      + '<b style="font-size:13px;color:var(--text-muted);">Owners:</b>'
      + '<button class="secondary" style="padding:6px 12px;font-size:13px;" onclick="MWTidy.pickOld()">Select everything over 3 days late (' + old + ')</button>'
      + '<button class="ghost" style="padding:6px 12px;font-size:13px;" onclick="MWTidy.pickNone()">Select none</button>'
      + '<span style="flex:1;"></span><span class="field-note">' + n + ' selected</span>'
      + '<button class="primary" style="padding:6px 14px;font-size:13px;" ' + (n ? '' : 'disabled ') + 'onclick="MWTidy.ask()">Clear selected</button></div>';
    if(T.open && n) h += '<div class="card" style="padding:14px 16px;margin-bottom:10px;border:2px solid var(--navy);"><b style="color:var(--navy);">Clear ' + n + ' card' + (n === 1 ? '' : 's') + '?</b>'
      + '<div class="field-note" style="margin:6px 0;">Why (kept on every card, with your name and the time):</div><div style="display:flex;flex-wrap:wrap;gap:6px;">'
      + REASONS.map(r => '<button class="' + (T.why === r ? 'primary' : 'secondary') + '" style="padding:6px 12px;font-size:13px;" onclick="MWTidy.why(\'' + esc(r) + '\')">' + esc(r) + '</button>').join('') + '</div>'
      + '<div class="field-note" style="margin:8px 0;">Nothing is deleted. Cleared cards are closed with the reason and can be reopened. Nothing is sent to anyone.</div>'
      + '<button class="primary" style="padding:7px 16px;" onclick="MWTidy.go()">Clear them</button> <button class="ghost" style="padding:7px 14px;" onclick="MWTidy.cancel()">Cancel</button></div>';
    if(T.last && T.last.ids.length) h += '<div class="card" style="padding:9px 14px;margin-bottom:10px;background:#E7F6EC;color:#1E6B45;font-size:13px;">Cleared ' + T.last.ids.length + ' card' + (T.last.ids.length === 1 ? '' : 's') + ': “' + esc(T.last.why) + '”. <button class="linklike" onclick="MWTidy.undo()">Undo</button></div>';
    return h;
  }
  /* the folded lines under the pile: Past its day (call cards) is drawn by team-work.js with its own past fold; here the
     weekly "Make it official?" list and the hidden EVV count */
  function extras(byKind){
    const offs = byKind.official || [], ev = byKind.evv || [];
    let h = '';
    if(offs.length) h += '<details style="margin-top:12px;"><summary style="cursor:pointer;font-size:12.5px;font-weight:700;letter-spacing:.06em;color:var(--navy);">MAKE IT OFFICIAL? · ' + offs.length + ' <span class="field-note" style="font-weight:400;letter-spacing:0;">one list for the week instead of cards: a caregiver keeps covering the same slot</span></summary>' + offs.map(x => W.TW.cardHtml(x)).join('') + '</details>';
    if(ev.length && owner()) h += '<div class="field-note" style="margin-top:8px;">' + ev.length + ' EVV review card' + (ev.length === 1 ? ' is' : 's are') + ' not shown (EVV is retired). Clear ' + (ev.length === 1 ? 'it' : 'them') + ' in Settings &gt; Clear old cards.</div>';
    return h;
  }

  /* ── the top of My Work: one line instead of the five boxes ── */
  function stripHtml(parts){
    const item = p => { const v = '<b' + (p.red ? ' style="color:var(--red);"' : ' style="color:var(--navy);"') + '>' + esc(p.v) + '</b>' + (p.sub ? ' <span class="field-note">' + esc(p.sub) + '</span>' : '');
      return '<span class="mwt-part">' + esc(p.k) + ': ' + (p.go ? '<button class="linklike" style="font:inherit;" onclick="' + p.go + '">' + v + '</button>' : v) + '</span>'; };
    return '<div class="card mwt-strip" style="padding:10px 14px;margin-bottom:12px;display:flex;flex-wrap:wrap;gap:6px 16px;align-items:baseline;font-size:13.5px;">' + parts.map(item).join('<span style="color:var(--border);" aria-hidden="true">|</span>') + '</div>';
  }
  /* ── five tabs: Today, Team Work, All mine, Waiting, More ── */
  const MAIN = ['today', 'team', 'mine', 'waiting'];
  function tabsHtml(TABS, active, badge){
    const main = TABS.filter(([k]) => MAIN.indexOf(k) > -1), rest = TABS.filter(([k]) => MAIN.indexOf(k) === -1);
    const tab = ([k, label]) => '<div class="subtab' + (active === k ? ' active' : '') + '" onpointerdown="if(MYWORK_TAB!==\'' + k + '\')myWorkGo(\'' + k + '\')" onclick="if(MYWORK_TAB!==\'' + k + '\')myWorkGo(\'' + k + '\')">' + label + badge(k) + '</div>';
    if(!rest.length) return main.map(tab).join('');
    const inRest = rest.some(([k]) => k === active), busy = rest.some(([k]) => badge(k));
    return main.map(tab).join('')
      + '<div class="subtab' + (inRest ? ' active' : '') + '" onclick="MWTidy.more()">More ' + (T.moreOpen || inRest ? '▴' : '▾') + (busy ? ' <span class="subtab-badge">•</span>' : '') + '</div>'
      + (T.moreOpen || inRest ? '<div style="flex-basis:100%;height:0;"></div>' + rest.map(tab).join('') : '');
  }

  /* ── Settings > Clear old cards (owners): every open card more than 7 days late, by person ── */
  function oldList(){ const now = Date.now(); return (D().ops_items || []).filter(i => i && i.status === 'open' && daysLate(i, now) > 7); }
  function oldFill(){
    const box = document.getElementById('mwtOld'), now = document.getElementById('mwtSetNow'), tb = document.getElementById('mwtToggleBtn');
    if(now) now.innerHTML = (on() ? '<b style="color:#1E8449;">On.</b> Team Work says its rules once, owners can clear many cards at once, and the top of My Work is one line.' : '<b style="color:#B7791F;">Off.</b> My Work and Team Work are as before.') + (owner() ? '' : ' Only Samantha or Zachary can change this.');
    if(tb){ tb.textContent = on() ? 'Turn off the tidier My Work' : 'Turn on the tidier My Work'; tb.style.display = owner() ? '' : 'none'; }
    if(!box) return;
    if(!owner()){ box.innerHTML = '<div class="field-note">Only Samantha or Zachary can clear old cards.</div>'; return; }
    if(!on()){ box.innerHTML = '<div class="field-note">Turn on the tidier My Work to clear old cards here.</div>'; return; }
    const t = Date.now(), L = oldList(), who = {};
    L.forEach(i => { const k = lc(i.owner) || 'nobody'; (who[k] = who[k] || []).push(i); });
    const name = e => { try{ return (typeof W.opsOwnerName === 'function' && W.opsOwnerName(e)) || e; }catch(_){ return e; } };
    box.innerHTML = !L.length ? '<div class="field-note">No open card is more than 7 days late.</div>'
      : Object.keys(who).sort((a, b) => who[b].length - who[a].length).map(k => '<details style="margin:6px 0;"><summary style="cursor:pointer;"><b>' + esc(k === 'nobody' ? 'Nobody (the pile)' : name(k)) + '</b> · ' + who[k].length + ' <button class="linklike" onclick="event.preventDefault();MWTidy.oldPickAll(\'' + esc(k) + '\')">select all</button></summary>'
        + who[k].sort((a, b) => daysLate(b, t) - daysLate(a, t)).map(i => '<label style="display:flex;gap:8px;align-items:flex-start;padding:4px 0;font-size:13px;"><input type="checkbox" style="width:auto;margin-top:2px;" ' + (T.oldSel.has(i.id) ? 'checked ' : '') + 'onchange="MWTidy.oldPick(\'' + esc(i.id) + '\',this.checked)"><span>' + esc(String(i.title || i.about || i.id).slice(0, 140)) + ' <span class="field-note">' + daysLate(i, t) + ' days late</span></span></label>').join('') + '</details>').join('')
        + '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px;"><label class="field-note" for="mwtOldWhy">Why</label><select id="mwtOldWhy" onchange="MWTidy.oldWhy(this.value)">' + REASONS.map(r => '<option' + (T.oldWhy === r ? ' selected' : '') + '>' + esc(r) + '</option>').join('') + '</select>'
        + '<button class="primary" style="padding:6px 14px;" ' + (T.oldSel.size ? '' : 'disabled ') + 'onclick="MWTidy.oldGo(this)">Clear ' + T.oldSel.size + ' selected</button></div>'
        + '<div class="field-note" style="margin-top:4px;">Clearing closes the reminder card with the reason, your name and the time. It never changes a write-up, a client or a lead.</div>';
  }
  async function toggle(btn){
    if(!owner()){ alert('Only Samantha or Zachary can change this.'); return; }
    const want = !on();
    const ok = typeof W.ccConfirm === 'function' ? await W.ccConfirm(want ? 'Turn on the tidier My Work?\n\n· Team Work says its escalation rules once at the top, and owners can select many cards and clear them with a reason\n· call cards 2 days past their day move to Past its day; "Make it official?" is one weekly list; EVV review cards are not shown\n· the top of My Work is one short line, and the tabs are Today, Team Work, All mine, Waiting and More\n· Settings > Clear old cards lists every card more than 7 days late\n\nNothing is sent to anyone, and escalation is unchanged.' : 'Turn off the tidier My Work? Everything goes back to how it was. Cards already cleared stay cleared.') : true;
    if(!ok) return;
    if(btn) btn.disabled = true;
    const r = typeof W.tkMerge === 'function' ? await W.tkMerge(m => { m.mywork_tidy_live = want; if(want && !m.mywork_tidy_live_since) m.mywork_tidy_live_since = new Date().toISOString(); return ['tidier My Work ' + (want ? 'ON' : 'OFF')]; }, 'tidier My Work') : { error:{ message:'saving is not available here' } };
    if(btn) btn.disabled = false;
    const sv = document.getElementById('mwtSaved'); if(sv) sv.textContent = r && r.error ? 'Could not save: ' + r.error.message : (want ? 'On.' : 'Off.');
    redraw();
  }

  W.MWTidy = Object.assign({}, CORE, { on, owner, RULES, box, toolbar, extras, stripHtml, tabsHtml, oldFill, toggle, clear, undo, state:T,
    pick:(id, v) => { if(v) T.sel.add(id); else T.sel.delete(id); redraw(); },
    pickOld:() => { const now = Date.now(); T.sel = new Set(((W.TW && W.TW.list()) || []).filter(x => daysLate(x.it, now) > 3 && ['evv', 'official'].indexOf(sortOut(x.it, now)) === -1).map(x => x.it.id)); redraw(); },   /* only cards on screen */
    pickNone:() => { T.sel = new Set(); T.open = false; redraw(); },
    ask:() => { T.open = true; redraw(); }, cancel:() => { T.open = false; redraw(); }, why:r => { T.why = r; redraw(); },
    go:async () => { const ids = [...T.sel]; T.open = false; const n = await clear(ids, T.why); T.sel = new Set(); try{ W.ccToast('Cleared ' + n + ' card' + (n === 1 ? '' : 's') + '.'); }catch(e){} redraw(); },
    more:() => { T.moreOpen = !T.moreOpen; redraw(); },
    oldPick:(id, v) => { if(v) T.oldSel.add(id); else T.oldSel.delete(id); oldFill(); },
    oldPickAll:k => { oldList().filter(i => (lc(i.owner) || 'nobody') === k).forEach(i => T.oldSel.add(i.id)); oldFill(); },
    oldWhy:r => { T.oldWhy = r; },
    oldGo:async btn => { if(btn) btn.disabled = true; const n = await clear([...T.oldSel], T.oldWhy); T.oldSel = new Set(); try{ W.ccToast('Cleared ' + n + ' old card' + (n === 1 ? '' : 's') + '.'); }catch(e){} redraw(); } });
})(typeof window !== 'undefined' ? window : globalThis);
