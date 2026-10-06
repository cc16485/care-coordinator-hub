/* Projects on My Work (Stage 1, 2026-10-06, her "yes start builiding").
   A project is a My Work item (ops_items, kind 'project') with steps. Each step has a person and a due date, and the card shows
   a progress bar. A project can't be closed until every step is done. A client-start project also needs an owner's sign-off
   (owner_admin role: Samantha or Zachary). Any other project gets a tick box: "Needs owner sign-off".
   ALL HANDS ON DECK (her words: "ALL HANDS ON DECK moments happen a lot in Home Care") works on any project or task:
   - the whole office team (everyone with a Hub role) sees it on My Work, with a banner on My Work and the Dashboard
     and a section on To talk about;
   - anyone can take a step ("I've got this"), but the owner keeps the project.
   It is on by itself for a client-start project, and for any project inside the alert window (9 days; ops_settings.project_alert_days can change it) that
   still has open steps. One tap turns it off.
   Inside the alert window a project with open steps sits in Act Now for its team and for the owners.
   Nothing here texts or emails anyone. */
(function(){
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s));
  const lc = s => String(s || '').toLowerCase();
  const DAY = 864e5;
  const isPj = it => !!it && it.kind === 'project';
  function meEmail(){ try{ return lc(ccActor().email); }catch(e){ return ''; } }
  function nameOf(e){ try{ return (typeof opsOwnerName === 'function' && opsOwnerName(e)) || String(e || '').split('@')[0]; }catch(_){ return String(e || '').split('@')[0]; } }
  function first(e){ return String(nameOf(e)).split(' ')[0]; }
  function roles(){ return (typeof CC_ROLE_BY_EMAIL !== 'undefined' && CC_ROLE_BY_EMAIL) || {}; }
  function holders(role){ const r = roles(); return Object.keys(r).filter(e => (r[e] || []).indexOf(role) > -1).sort(); }
  /* the whole office team: everyone who holds a Hub role (owners, care coordinators, staffing) */
  function officeTeam(){ const r = roles(); return Object.keys(r).filter(e => (r[e] || []).length).sort(); }
  function isOwner(e){ try{ return ccIsOwner(e == null ? undefined : e); }catch(_){ return false; } }
  function alertDays(){ const n = Number(((typeof DATA !== 'undefined' && DATA.ops_settings) || {}).project_alert_days); return n >= 1 && n <= 30 ? Math.round(n) : 9; }

  /* dates are YYYY-MM-DD, read at local noon so a date never lands on the evening before */
  function dParse(s){ const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null; }
  function dStr(d){ return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function today(){ const d = new Date(); d.setHours(12, 0, 0, 0); return d; }
  function addDays(d, n){ const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function dWords(s){ const d = dParse(s); return d ? d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) : ''; }
  function daysLeft(p){ const d = dParse(p && p.ready_by); return d ? Math.round((d - today()) / DAY) : null; }
  function leftWords(n){ return n == null ? '' : n < 0 ? (-n) + ' day' + (n === -1 ? '' : 's') + ' past' : n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days'; }

  function steps(p){ return Array.isArray(p && p.steps) ? p.steps : []; }
  function openSteps(p){ return steps(p).filter(s => !s.done_at); }
  function team(p){ return [...new Set([lc(p.owner)].concat((p.team || []).map(lc)).filter(Boolean))]; }

  /* ── All hands ──────────────────────────────────────────────────────────── */
  function allHands(it){
    if(!it || it.status !== 'open') return false;
    const ah = it.all_hands || {};
    if(ah.off_at && !(ah.on_at && ah.on_at > ah.off_at)) return false;     // turned off by a person, and not back on since
    if(ah.on) return true;
    if(!isPj(it)) return false;
    const n = daysLeft(it);
    return n != null && n <= alertDays() && openSteps(it).length > 0;
  }
  /* inside the alert window with open steps: Act Now for the team and the owners */
  function hot(it){
    if(!it || it.status !== 'open') return false;
    if(!isPj(it)) return allHands(it);
    const n = daysLeft(it);
    return openSteps(it).length > 0 && (allHands(it) || (n != null && n <= alertDays()));
  }
  function sees(it, me){
    me = lc(me || meEmail()); if(!me || !it || it.status !== 'open') return false;
    if(allHands(it) && officeTeam().indexOf(me) > -1) return true;
    if(!isPj(it)) return false;
    if(team(it).indexOf(me) > -1) return true;
    const n = daysLeft(it);
    return isOwner(me) && n != null && n <= alertDays() && openSteps(it).length > 0;
  }
  function list(){ return ((typeof DATA !== 'undefined' && DATA.ops_items) || []).filter(i => i && i.status === 'open' && (isPj(i) || (i.all_hands && i.all_hands.on))); }
  function allHandsList(){ const me = meEmail(); return list().filter(i => allHands(i) && sees(i, me)).sort((a, b) => String(a.ready_by || a.due || '').localeCompare(String(b.ready_by || b.due || ''))); }

  /* ── Saving: read the latest copy first, change only what this click changes, then save ─────────────── */
  async function mutate(id, fn, said){
    let cur = null;
    try{
      const { data, error } = await sb.from('app_data').select('data').eq('key', 'ops_items').maybeSingle();
      if(error) throw error;
      cur = (Array.isArray(data && data.data) ? data.data : []).find(x => x && x.id === id) || null;
    }catch(e){ ccToast('Couldn’t read the latest copy just now. Nothing was changed. Try again in a moment.'); return null; }
    if(!cur){ ccToast('Couldn’t find that just now. Nothing was changed.'); return null; }
    const line = fn(cur);
    if(line === false) return null;
    cur.last_activity_at = new Date().toISOString();
    if(line && typeof opsLog === 'function') opsLog(cur, line);
    await persist('ops_items', cur);
    const all = DATA.ops_items = DATA.ops_items || [];
    const k = all.findIndex(x => x && x.id === id); if(k >= 0) all[k] = cur; else all.push(cur);
    if(line) opEvent('project_changed', { item:cur, summary:(cur.title || cur.about || '') + ': ' + line });
    if(said) ccToast(said);
    refresh();
    return cur;
  }
  function refresh(){
    try{ if(typeof myWorkRefresh === 'function') myWorkRefresh(); }catch(e){}
    try{ renderBanners(); }catch(e){}
    try{ if(typeof suRender === 'function' && typeof activeTab !== 'undefined' && activeTab === 'standup') suRender(); }catch(e){}
  }
  function actor(){ const a = ccActor(); return { email:lc(a.email), name:a.name || a.email || '' }; }

  /* ── Steps ────────────────────────────────────────────────────────────── */
  async function stepTick(id, sid){
    const a = actor();
    await mutate(id, p => {
      const s = steps(p).find(x => x.id === sid); if(!s) return false;
      if(s.done_at){ s.done_at = null; s.done_by = null; s.done_by_name = null; return 'Step reopened: ' + s.label + ' (' + a.name + ')'; }
      s.done_at = new Date().toISOString(); s.done_by = a.email; s.done_by_name = a.name;
      return 'Step done: ' + s.label + ' (' + a.name + ')';
    });
  }
  async function stepClaim(id, sid){
    const a = actor();
    await mutate(id, p => {
      const s = steps(p).find(x => x.id === sid); if(!s || s.done_at) return false;
      s.claimed_by = a.email; s.claimed_by_name = a.name; s.claimed_at = new Date().toISOString();
      if((s.who || []).map(lc).indexOf(a.email) < 0) s.who = (s.who || []).concat(a.email);
      return a.name + ' has this step: ' + s.label;
    }, '✓ That step is yours. The project stays with its owner.');
  }
  function stepAdd(id, anchor){
    const p = (DATA.ops_items || []).find(x => x.id === id); if(!p) return;
    const people = officeTeam();
    const el = ccPopOpen(anchor || document.body,
      '<div style="font-size:14px;font-weight:800;color:var(--navy);margin-bottom:6px;">Add a step</div>'
      + '<input id="pjSL" placeholder="What needs doing" style="width:100%;padding:7px 9px;font-size:13px;border:1px solid var(--border);border-radius:8px;">'
      + '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">'
      + '<select id="pjSW" style="flex:1 1 140px;padding:6px;font-size:13px;">' + people.map(e => '<option value="' + esc(e) + '"' + (e === meEmail() ? ' selected' : '') + '>' + esc(nameOf(e)) + '</option>').join('') + '</select>'
      + '<input id="pjSD" type="date" value="' + esc(p.ready_by || '') + '" style="flex:0 0 150px;padding:6px;font-size:13px;"></div>'
      + '<div style="display:flex;gap:8px;margin-top:10px;"><button class="primary" id="pjSGo" style="padding:6px 12px;font-size:13px;">Add</button>'
      + '<button class="ghost" id="pjSNo" style="padding:6px 12px;font-size:13px;">Cancel</button></div>', { width:330 });
    el.querySelector('#pjSNo').onclick = ccPopClose;
    el.querySelector('#pjSGo').onclick = async () => {
      const label = el.querySelector('#pjSL').value.trim(), who = el.querySelector('#pjSW').value, due = el.querySelector('#pjSD').value;
      if(!label){ ccToast('Say what needs doing'); return; }
      ccPopClose();
      await mutate(id, x => {
        x.steps = steps(x).concat({ id:'x' + Date.now().toString(36), label, who:[lc(who)], due:due || x.ready_by || null });
        if(who && team(x).indexOf(lc(who)) < 0){ x.team = (x.team || []).concat(lc(who)); x.also_for = team(x).filter(e => e !== lc(x.owner)); }
        return 'Step added: ' + label + ' (' + first(who) + ')';
      }, '✓ Step added');
    };
    const f = el.querySelector('#pjSL'); if(f) f.focus();
  }

  /* Team Builder, Stage 2: "Every shift confirmed" follows the board. It ticks itself when every shift has a confirmed Yes,
     and reopens if a Yes is taken back (only when it was the board that ticked it). */
  async function autoStep(id, key, done, words){
    const p = (DATA.ops_items || []).find(x => x.id === id); if(!p) return;
    const s = steps(p).find(x => x.key === key); if(!s) return;
    if(done ? !!s.done_at : (!s.done_at || !s.auto)) return;     // nothing to change
    await mutate(id, x => {
      const t = steps(x).find(y => y.key === key); if(!t) return false;
      if(done){ if(t.done_at) return false; t.done_at = new Date().toISOString(); t.done_by = 'team-builder'; t.done_by_name = 'the Team Builder'; t.auto = true;
        return 'Step done by itself: ' + t.label + ' (' + words + ')'; }
      if(!t.done_at || !t.auto) return false;
      t.done_at = null; t.done_by = null; t.done_by_name = null; t.auto = false;
      return 'Step reopened by itself: ' + t.label + ' (' + words + ')';
    }, done ? '✓ Every shift is confirmed: that step on the project ticked itself' : 'A shift is no longer confirmed: the project step reopened');
  }

  /* ── All hands on / off ────────────────────────────────────────────────── */
  async function setAllHands(id, on){
    const a = actor(), now = new Date().toISOString();
    await mutate(id, p => {
      if(!on && !(lc(p.owner) === a.email || isOwner(a.email))){ ccToast('Only ' + first(p.owner) + ' (the owner) or an owner can turn it off.'); return false; }
      const ah = p.all_hands = p.all_hands || {};
      if(on){ ah.on = true; ah.on_at = now; ah.on_by = a.email; ah.on_by_name = a.name; }
      else { ah.on = false; ah.off_at = now; ah.off_by = a.email; ah.off_by_name = a.name; }
      return (on ? 'All hands on deck turned on' : 'All hands on deck turned off') + ' by ' + a.name;
    }, on ? '✓ All hands on deck: the whole office team sees it now' : '✓ All hands off. It stays with its owner.');
  }

  /* ── Closing: every step done, then sign-off (or the owner's tick) ─────────────────────────────────── */
  function closeBlocked(p){
    const left = openSteps(p).length;
    if(left) return left + ' step' + (left === 1 ? ' is' : 's are') + ' still open. A project closes when every step is done' + (p.signoff && p.signoff.needed ? ' and an owner signs it off.' : '.');
    if(p.signoff && p.signoff.needed && !isOwner()) return 'Every step is done. It now needs an owner’s sign-off (Samantha or Zachary).';
    if(!(p.signoff && p.signoff.needed) && !(lc(p.owner) === meEmail() || isOwner())) return 'Every step is done. ' + first(p.owner) + ' (the owner) closes it.';
    return '';
  }
  async function close(id, anchor){
    const p = (DATA.ops_items || []).find(x => x.id === id); if(!p) return;
    const why = closeBlocked(p); if(why){ ccToast(why); return; }
    const sign = !!(p.signoff && p.signoff.needed);
    const el = ccPopOpen(anchor || document.body,
      '<div style="font-size:14px;font-weight:800;color:var(--navy);margin-bottom:4px;">' + (sign ? 'Sign off and close' : 'Close the project') + '</div>'
      + '<div class="field-note" style="margin-bottom:8px;">' + esc(p.title || '') + ' · all ' + steps(p).length + ' steps done.</div>'
      + '<textarea id="pjCN" rows="2" placeholder="Anything to record? Optional." style="width:100%;font-size:13px;padding:8px;border-radius:8px;"></textarea>'
      + '<div style="display:flex;gap:8px;margin-top:10px;"><button class="primary" id="pjCGo" style="padding:7px 14px;font-size:13px;">' + (sign ? 'Sign off' : 'Close it') + '</button>'
      + '<button class="ghost" id="pjCNo" style="padding:7px 14px;font-size:13px;">Cancel</button></div>', { width:340 });
    el.querySelector('#pjCNo').onclick = ccPopClose;
    el.querySelector('#pjCGo').onclick = async () => {
      const note = el.querySelector('#pjCN').value.trim(); ccPopClose();
      const a = actor(), now = new Date().toISOString();
      await mutate(id, x => {
        const w = closeBlocked(x); if(w){ ccToast(w); return false; }   // checked again on the latest copy
        if(x.signoff && x.signoff.needed){ x.signoff.at = now; x.signoff.by = a.email; x.signoff.by_name = a.name; }
        x.status = 'done'; x.closed_at = now; x.closed_by = a.email; x.close_note = note;
        if(x.all_hands) x.all_hands.on = false;
        return (sign ? 'Signed off and closed by ' : 'Closed by ') + a.name + (note ? ': ' + note : '');
      }, sign ? '✓ Signed off. The project is closed.' : '✓ Project closed');
    };
  }

  /* ── The card ───────────────────────────────────────────────────────── */
  function bar(done, total){
    const pct = total ? Math.round(done / total * 100) : 0;
    return '<div style="display:flex;gap:10px;align-items:center;margin-top:8px;"><div style="flex:1;height:9px;border-radius:99px;background:var(--bg);border:1px solid var(--border);overflow:hidden;">'
      + '<div class="pj-bar" style="height:100%;width:' + pct + '%;background:' + (pct === 100 ? 'var(--teal)' : 'var(--navy)') + ';"></div></div>'
      + '<b style="font-size:12.5px;color:var(--navy);white-space:nowrap;">' + done + ' of ' + total + ' steps</b></div>';
  }
  function chip(t, bg, fg){ return '<span class="tag-chip" style="background:' + bg + ';color:' + fg + ';font-weight:700;">' + t + '</span>'; }
  function stepRow(p, s){
    const me = meEmail(), done = !!s.done_at;
    const who = (s.who || []).map(first).join(' & ') || 'nobody yet';
    const late = !done && s.due && dParse(s.due) && dParse(s.due) < today();
    const claimed = s.claimed_by ? (lc(s.claimed_by) === me ? 'you’ve got this' : first(s.claimed_by) + ' has it') : '';
    return '<div class="pj-step" data-sid="' + esc(s.id) + '" style="display:flex;gap:9px;align-items:flex-start;padding:6px 0;border-top:1px solid var(--border);">'
      + '<input type="checkbox" class="pj-tick"' + (done ? ' checked' : '') + ' onchange="pjStepTick(\'' + esc(p.id) + '\',\'' + esc(s.id) + '\')" style="width:17px;height:17px;margin-top:2px;cursor:pointer;flex:0 0 auto;" title="' + (done ? 'Reopen this step' : 'Mark this step done') + '">'
      + '<div style="flex:1;min-width:0;"><div style="font-size:13.5px;' + (done ? 'text-decoration:line-through;color:var(--text-muted);' : '') + '">' + esc(s.label) + '</div>'
      + '<div class="field-note">' + esc(who)
      + (done ? ' · done ' + esc(dWords(String(s.done_at).slice(0, 10))) + (s.done_by_name ? ' by ' + esc(String(s.done_by_name).split(' ')[0]) : '')
        : (s.due ? ' · by ' + esc(dWords(s.due)) : '') + (late ? ' · <b style="color:var(--red);">late</b>' : '') + (claimed ? ' · ' + esc(claimed) : ''))
      + '</div></div>'
      + (!done && lc(s.claimed_by) !== me && (s.who || []).map(lc).indexOf(me) < 0 ? '<button class="ghost pj-claim" style="padding:4px 10px;font-size:12px;flex:0 0 auto;" onclick="pjStepClaim(\'' + esc(p.id) + '\',\'' + esc(s.id) + '\')">I’ve got this</button>' : '')
      + '</div>';
  }
  function card(p, i){
    const me = meEmail(), st = steps(p), done = st.filter(s => s.done_at).length, n = daysLeft(p);
    const ah = allHands(p), sign = !!(p.signoff && p.signoff.needed);
    const focused = (typeof MYWORK_FOCUS !== 'undefined' && i === MYWORK_FOCUS);
    const canOff = lc(p.owner) === me || isOwner();
    const blocked = closeBlocked(p);
    let h = '<div class="wkcard pj-card' + (focused ? ' focused' : '') + '" data-id="' + esc(p.id) + '" style="padding:13px 15px;margin-bottom:8px;' + (ah ? 'border:2px solid var(--red);' : 'border-left:4px solid var(--navy);') + '">'
      + '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;">'
      + chip('PROJECT', 'var(--navy)', '#fff')
      + (ah ? chip('ALL HANDS ON DECK', 'var(--red)', '#fff') : '')
      + '<b style="font-size:15px;">' + esc(p.title || p.about || '') + '</b>'
      + '<span class="tag-chip" style="font-weight:700;background:var(--bg);color:var(--navy);">' + esc(first(p.owner)) + ' owns it</span>'
      + (p.ready_by ? '<span class="tag-chip" style="font-weight:700;' + (n != null && n <= alertDays() && openSteps(p).length ? 'background:var(--red-bg);color:var(--red);' : 'background:var(--bg);color:var(--navy);') + '">ready by ' + esc(dWords(p.ready_by)) + ' · ' + esc(leftWords(n)) + '</span>' : '')
      + '<span style="flex:1;"></span>'
      + '<span class="wkmore" id="more_' + esc(p.id) + '" onclick="pjMore(\'' + esc(p.id) + '\',\'more_' + esc(p.id) + '\')">⋯</span></div>';
    const facts = [];
    if(p.date_contact) facts.push('<b>Date from:</b> ' + esc(p.date_contact) + (p.notice ? ' (ask for ' + esc(p.notice) + ' notice)' : ''));
    if(p.shifts) facts.push('<b>Shifts:</b> ' + esc(p.shifts));
    if(p.care_level) facts.push('<b>Care level:</b> ' + esc(p.care_level));
    if(team(p).length > 1) facts.push('<b>Team:</b> ' + esc(team(p).map(first).join(', ')));
    if(p.axiscare_client_id) facts.push('<b>AxisCare:</b> <a href="#" onclick="openClientProfile(\'' + esc(p.axiscare_client_id) + '\');return false;">' + esc(p.ax_name || p.about || 'client') + ' #' + esc(p.axiscare_client_id) + '</a>' + (p.ax_active === false ? ' (inactive in AxisCare)' : ''));
    if(facts.length) h += '<div class="field-note" style="margin-top:4px;line-height:1.6;">' + facts.join(' · ') + '</div>';
    if(p.detail) h += '<div style="font-size:13px;color:var(--text-muted);margin-top:3px;">' + esc(p.detail) + '</div>';
    h += bar(done, st.length);
    if(typeof tb2ProjectLine === 'function') h += tb2ProjectLine(p);
    h += '<div style="margin-top:6px;">' + st.map(s => stepRow(p, s)).join('') + '</div>';
    h += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:9px;">'
      + '<button class="ghost" style="padding:5px 11px;font-size:12px;" onclick="pjStepAdd(\'' + esc(p.id) + '\',this)">＋ Add a step</button>'
      + (p.template === 'client_start' && !p.axiscare_client_id ? '<button class="ghost pj-axfind" style="padding:5px 11px;font-size:12px;" onclick="pjAxFind(\'' + esc(p.id) + '\',this)">Find in AxisCare</button>' : '')
      + (ah ? (canOff ? '<button class="ghost" style="padding:5px 11px;font-size:12px;" onclick="pjAllHandsSet(\'' + esc(p.id) + '\',false)">Turn all hands off</button>' : '')
        : '<button class="ghost" style="padding:5px 11px;font-size:12px;color:var(--red);" onclick="pjAllHandsSet(\'' + esc(p.id) + '\',true)">All hands on deck</button>')
      + (window.suTalk ? '<button class="ghost" style="padding:5px 11px;font-size:12px;" onclick="myWorkTalk(\'' + esc(p.id) + '\',this)">' + (suTalk.forWork(p.id) ? 'Flagged to talk about' : 'Talk about') + '</button>' : '')
      + '<span style="flex:1;"></span>'
      + (blocked ? '<span class="field-note pj-gate">' + esc(blocked) + '</span>'
        : '<button class="primary pj-close" style="padding:6px 13px;font-size:12.5px;" onclick="pjClose(\'' + esc(p.id) + '\',this)">' + (sign ? 'Sign off and close' : 'Close the project') + '</button>')
      + '</div>';
    return h + '</div>';
  }
  /* an all-hands task (not a project) gets its chip from the ordinary card */
  function chipFor(it){ return (!isPj(it) && allHands(it)) ? chip('ALL HANDS ON DECK', 'var(--red)', '#fff') : ''; }

  function more(id, anchorId){
    const p = (DATA.ops_items || []).find(x => x.id === id); if(!p) return;
    const opt = (what, label) => '<div class="ccpick-row" data-what="' + what + '" style="padding:8px;border-radius:8px;cursor:pointer;font-size:13.5px;">' + label + '</div>';
    let h = '';
    if(lc(p.owner) === meEmail() || isOwner()) h += opt('owner', 'Give the project to someone else…') + opt('date', 'Change the ready-by date…');
    if(isOwner() && !(p.template === 'client_start')) h += opt('sign', p.signoff && p.signoff.needed ? 'Don’t need owner sign-off' : 'Needs owner sign-off');
    h += opt('add', 'Add a step…');
    const el = ccPopOpen(document.getElementById(anchorId) || document.body, h || '<div class="field-note">Nothing else to change here.</div>', { width:280 });
    el.querySelectorAll('.ccpick-row').forEach(r => {
      r.onmouseenter = () => r.style.background = 'var(--bg)'; r.onmouseleave = () => r.style.background = '';
      r.onclick = () => {
        ccPopClose(); const w = r.dataset.what, anchor = document.getElementById(anchorId);
        if(w === 'add') return stepAdd(id, anchor);
        if(w === 'sign') return mutate(id, x => { x.signoff = x.signoff || {}; x.signoff.needed = !x.signoff.needed; return x.signoff.needed ? 'Now needs owner sign-off' : 'No longer needs owner sign-off'; }, '✓ Saved');
        if(w === 'owner') return ccPickPerson(anchor, { onPick: (e, nm) => mutate(id, x => {
          const was = x.owner; x.owner = lc(e); x.owner_name = nm || nameOf(e);
          x.team = [...new Set((x.team || []).map(lc).concat(lc(was)).filter(t => t && t !== lc(e)))];
          x.also_for = x.team.slice();
          return 'Project moved from ' + first(was) + ' to ' + first(e);
        }, '✓ The project is ' + first(e) + '’s now') });
        if(w === 'date'){
          const el2 = ccPopOpen(anchor || document.body, '<div style="font-size:13.5px;font-weight:700;margin-bottom:6px;">Ready by</div><input id="pjRD" type="date" value="' + esc(p.ready_by || '') + '" style="width:100%;padding:7px;">'
            + '<div style="display:flex;gap:8px;margin-top:10px;"><button class="primary" id="pjRGo" style="padding:6px 12px;font-size:13px;">Save</button><button class="ghost" id="pjRNo" style="padding:6px 12px;font-size:13px;">Cancel</button></div>', { width:260 });
          el2.querySelector('#pjRNo').onclick = ccPopClose;
          el2.querySelector('#pjRGo').onclick = () => { const v = el2.querySelector('#pjRD').value; if(!v) return; ccPopClose();
            mutate(id, x => { const was = x.ready_by; x.ready_by = v; x.due = dParse(v).toISOString(); return 'Ready-by date moved from ' + dWords(was) + ' to ' + dWords(v); }, '✓ Date changed'); };
        }
      };
    });
  }

  /* ── Link a client-start project to the client's AxisCare record (2026-10-06, "is our client list not synced with
     Axiscare?"). AxisCare owns the client list; the Hub looks it up live (client-lookup, the same check that recognises a
     returning family) and copies nothing. A person picks the match; the project and its Team Builder plan keep the number.
     Nothing changes in AxisCare. ── */
  async function axFind(id, anchor){
    const p = (DATA.ops_items || []).find(x => x.id === id); if(!p) return;
    const parts = String(p.about || p.title || '').replace(/\s+coming home$/i, '').replace(/\(.*?\)/g, '').trim().split(/\s+/);
    const box = '<div style="font-size:14px;font-weight:800;color:var(--navy);margin-bottom:6px;">Find ' + esc(parts.join(' ') || 'the client') + ' in AxisCare</div>'
      + '<div style="display:flex;gap:6px;"><input id="pjAF" placeholder="First" value="' + esc(parts[0] || '') + '" style="flex:1;padding:6px;font-size:13px;"><input id="pjAL" placeholder="Last" value="' + esc(parts.slice(1).join(' ')) + '" style="flex:1;padding:6px;font-size:13px;">'
      + '<button class="primary" id="pjAGo" style="padding:6px 12px;font-size:12.5px;">Look</button></div><div id="pjAOut" class="field-note" style="margin-top:8px;">Current and former clients are both checked. Nothing is copied or changed in AxisCare.</div>';
    const el = ccPopOpen(anchor || document.body, box, { width:420 });
    const go = async () => {
      const out = el.querySelector('#pjAOut'), f = el.querySelector('#pjAF').value.trim(), l = el.querySelector('#pjAL').value.trim();
      if(!l){ out.textContent = 'Type the last name.'; return; }
      out.textContent = 'Looking in AxisCare…';
      let d; try{ d = await ckLookup(ckQuery({ first:f, last:l })); }catch(e){ out.textContent = 'AxisCare couldn’t be checked just now (' + String(e.message || e) + '). Nothing was changed.'; return; }
      if(d.axiscare_ok === false){ out.textContent = 'AxisCare couldn’t be checked just now (' + (d.axiscare_error || 'no answer') + '). Nothing was changed.'; return; }
      const m = (d.matches || []).filter(x => x.axiscare_client_id);
      if(!m.length){ out.innerHTML = 'No AxisCare client named ' + esc(f + ' ' + l) + '. Check the spelling (or try just the last name with the first name they go by).'; return; }
      out.innerHTML = m.map((x, i) => '<div style="display:flex;gap:8px;align-items:center;border:1px solid var(--border);border-radius:8px;padding:7px 9px;margin-top:5px;">'
        + '<div style="flex:1;"><b style="color:var(--navy);">' + esc(x.name) + '</b> · AxisCare #' + esc(x.axiscare_client_id) + '<div class="field-note">' + (x.active === true ? 'current client' : x.active === false ? 'former client (inactive)' : esc(x.status || '')) + '</div></div>'
        + '<button class="secondary pj-axpick" data-i="' + i + '" style="padding:5px 10px;font-size:12px;">This is ' + esc(String(x.name).split(' ')[0]) + '</button></div>').join('');
      out.querySelectorAll('.pj-axpick').forEach(b => b.onclick = async () => {
        const x = m[+b.dataset.i]; ccPopClose();
        const saved = await mutate(id, it => { it.axiscare_client_id = String(x.axiscare_client_id); it.ax_name = x.name; it.ax_active = x.active;
          return 'Linked to AxisCare client ' + x.name + ' #' + x.axiscare_client_id + (x.active === false ? ' (inactive)' : ''); }, '✓ Linked to AxisCare #' + x.axiscare_client_id);
        if(saved && saved.plan_id) await linkPlan(saved.plan_id, String(x.axiscare_client_id));
      });
    };
    el.querySelector('#pjAGo').onclick = go; el.querySelector('#pjAL').onkeydown = e => { if(e.key === 'Enter') go(); };
  }
  /* the project's Team Builder plan keeps the same number (latest copy read first; only that one field changes) */
  async function linkPlan(planId, ax){
    try{
      const { data, error } = await sb.from('app_data').select('data').eq('key', 'staffing_plans').maybeSingle(); if(error) throw error;
      const pl = (Array.isArray(data && data.data) ? data.data : []).find(x => x && x.id === planId); if(!pl) return;
      pl.axiscare_client_id = ax; await persist('staffing_plans', pl);
      const k = (DATA.staffing_plans || []).findIndex(x => x && x.id === planId); if(k >= 0) DATA.staffing_plans[k] = pl;
    }catch(e){ ccToast('The project is linked; the Team Builder plan couldn’t be updated just now.'); }
  }

  /* ── Banners: My Work and the Dashboard ───────────────────────────────────── */
  function bannerHtml(){
    const rows = allHandsList(); if(!rows.length) return '';
    return '<div class="card pj-banner" style="padding:12px 15px;margin-bottom:12px;border:2px solid var(--red);background:#FFF5F4;">'
      + '<div style="font-size:12.5px;font-weight:900;letter-spacing:.08em;color:var(--red);margin-bottom:4px;">ALL HANDS ON DECK</div>'
      + rows.map(p => {
        const st = steps(p), done = st.filter(s => s.done_at).length, n = daysLeft(p), mine = openSteps(p).filter(s => (s.who || []).map(lc).indexOf(meEmail()) > -1).length;
        return '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;padding:6px 0;border-top:1px solid #F3D3CF;">'
          + '<b style="color:var(--navy);flex:1 1 240px;min-width:0;">' + esc(p.title || p.about || '') + '</b>'
          + '<span class="field-note">' + (isPj(p) ? done + ' of ' + st.length + ' steps' + (p.ready_by ? ' · ready by ' + esc(dWords(p.ready_by)) + ' (' + esc(leftWords(n)) + ')' : '') + (mine ? ' · <b style="color:var(--red);">' + mine + ' step' + (mine === 1 ? '' : 's') + ' with your name</b>' : '') : 'a task · ' + esc(first(p.owner)) + ' owns it') + '</span>'
          + '<button class="primary" style="padding:5px 12px;font-size:12px;" onclick="pjOpen(\'' + esc(p.id) + '\')">Open</button></div>';
      }).join('') + '</div>';
  }
  function renderBanners(){
    const h = bannerHtml();
    ['pjDashBanner', 'pjWorkBanner'].forEach(id => { const el = document.getElementById(id); if(el) el.innerHTML = h; });
  }
  function openCard(id){
    try{ if(typeof switchTab === 'function') switchTab('mywork'); }catch(e){}
    const go = () => { const it = (DATA.ops_items || []).find(x => x.id === id);
      const b = (typeof myWorkBuckets === 'function') ? myWorkBuckets() : null;
      if(b && it && !b.today.some(x => x.id === id) && b.mine.some(x => x.id === id) && typeof myWorkGo === 'function') myWorkGo('mine');
      const c = document.querySelector('#myWorkWrap .wkcard[data-id="' + id + '"]');
      if(c){ c.scrollIntoView({ behavior:'smooth', block:'center' }); c.style.boxShadow = '0 0 0 3px var(--teal)'; setTimeout(() => { c.style.boxShadow = ''; }, 1800); } };
    setTimeout(go, 60);
  }

  /* ── To talk about: an "All hands on deck" section at the top ─────────────────────────────────── */
  function talkHtml(){
    const rows = allHandsList(); if(!rows.length) return '';
    return '<div class="pj-talk" style="margin-bottom:16px;"><div style="font-size:15px;font-weight:800;color:var(--red);margin:6px 0 6px;">All hands on deck <span class="field-note" style="font-weight:600;">(' + rows.length + ')</span></div>'
      + rows.map(p => {
        const open = openSteps(p);
        return '<div style="border:1.5px solid var(--red);border-radius:8px;padding:8px 11px;margin-bottom:6px;background:#fff;">'
          + '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;"><b style="color:var(--navy);flex:1 1 240px;">' + esc(p.title || p.about || '') + '</b>'
          + '<span class="field-note">' + esc(first(p.owner)) + ' owns it' + (p.ready_by ? ' · ready by ' + esc(dWords(p.ready_by)) + ' (' + esc(leftWords(daysLeft(p))) + ')' : '') + '</span>'
          + '<button class="ghost" style="padding:4px 10px;font-size:12px;" onclick="pjOpen(\'' + esc(p.id) + '\')">Open</button></div>'
          + (open.length ? '<div class="field-note" style="margin-top:4px;">Still open: ' + open.map(s => esc(s.label) + ' (' + esc((s.who || []).map(first).join(' & ') || 'nobody') + ')').join(' · ') + '</div>' : (isPj(p) ? '<div class="field-note" style="margin-top:4px;">Every step is done.</div>' : ''))
          + '</div>';
      }).join('') + '</div>';
  }

  /* ── New project ────────────────────────────────────────────────────── */
  /* Client start / coming home (her decisions 2026-10-06): the Care Coordinator owns client care and does the initial
     placement; the Staffing Coordinator is always on the team, making sure the right recruiting happens and helping.
     who: 'cc' = the project owner, 'sc' = the Staffing Coordinator, 'both' = the two of them.
     due: from = days after today, before = days before the ready-by date. */
  const CLIENT_START = [
    { k:'date',    who:'cc',   from:1,   label:o => 'Who tells us the date' + (o.date_contact ? ': ' + o.date_contact : '') + (o.notice ? ', ask for ' + o.notice + ' notice' : '') },
    { k:'level',   who:'cc',   from:2,   label:o => 'Care level set' + (o.care_level ? ' (' + o.care_level + ')' : '') },
    { k:'family',  who:'cc',   from:3,   label:() => 'Family told the plan' },
    { k:'recruit', who:'sc',   before:1, label:() => 'Recruiting for the open shifts' },
    { k:'shifts',  who:'both', before:1, label:o => 'Every shift confirmed' + (o.shifts ? ' (' + o.shifts + ')' : '') },
    { k:'transfer',who:'both', before:2, label:() => 'Transfer / Hoyer practice' },
    { k:'equip',   who:'cc',   before:3, label:() => 'Equipment at home checked' },
    { k:'plan',    who:'cc',   before:1, label:() => 'Care plan and AxisCare schedule' }
  ];
  function build(o){
    const owner = lc(o.owner), sc = holders('staffing_coordinator').filter(e => e !== owner)[0] || '';
    const ready = dParse(o.ready_by), t = today(), now = new Date().toISOString();
    const clamp = d => { if(d < t) d = t; if(ready && d > ready) d = ready; return dStr(d); };
    const whoFor = w => w === 'sc' ? [sc || owner] : w === 'both' ? [owner].concat(sc ? [sc] : []) : [owner];
    let st;
    if(o.template === 'client_start') st = CLIENT_START.map((s, k) => ({ id:'s' + (k + 1), key:s.k, label:s.label(o), who:whoFor(s.who),
      due:clamp(s.from != null ? addDays(t, s.from) : addDays(ready || t, -s.before)) }));
    else st = (o.steps || []).map((label, k) => ({ id:'s' + (k + 1), label, who:[owner], due:o.ready_by || null }));
    const tm = [...new Set([owner].concat(o.template === 'client_start' && sc ? [sc] : []).concat((o.team || []).map(lc)).filter(Boolean))];
    const a = actor();
    return {
      id:'ops_proj_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind:'project', status:'open',
      template:o.template, title:o.title, about:o.about || '', detail:o.detail || '',
      owner, owner_name:nameOf(owner), team:tm.filter(e => e !== owner), also_for:tm.filter(e => e !== owner),
      ready_by:o.ready_by, due:ready ? ready.toISOString() : null,
      date_contact:o.date_contact || '', notice:o.notice || '', shifts:o.shifts || '', care_level:o.care_level || '',
      steps:st, signoff:{ needed:o.template === 'client_start' || !!o.signoff },
      all_hands:o.template === 'client_start' ? { on:true, on_at:now, on_by:a.email, on_by_name:a.name, auto:true } : {},
      urgency:'normal', created_at:now, created_by:a.email, created_by_email:a.email, opened_by:'person'
    };
  }
  function newOpen(anchor){
    const cc = holders('care_coordinator'), people = officeTeam();
    const defOwner = cc[0] || meEmail();
    const d = addDays(today(), 7);
    const inp = (id, ph, v) => '<input id="' + id + '" placeholder="' + esc(ph) + '" value="' + esc(v || '') + '" style="width:100%;padding:7px 9px;font-size:13px;border:1px solid var(--border);border-radius:8px;">';
    const lab = t => '<div style="font-size:12.5px;font-weight:700;color:var(--navy);margin:9px 0 3px;">' + t + '</div>';
    const el = ccPopOpen(anchor || document.body,
      '<div style="font-size:15px;font-weight:800;color:var(--navy);">New project</div>'
      + '<div class="field-note" style="margin:2px 0 6px;">A job with several steps. It can’t be closed until every step is done.</div>'
      + lab('Kind') + '<select id="pjNT" style="width:100%;padding:7px;font-size:13px;"><option value="client_start">Client start / coming home</option><option value="blank">Other project</option></select>'
      + lab('Client') + inp('pjNA', 'Ed Anderson', '')
      + lab('What it is') + inp('pjNTi', 'Ed Anderson coming home', '')
      + '<div style="display:flex;gap:8px;"><div style="flex:1;">' + lab('Owner') + '<select id="pjNO" style="width:100%;padding:7px;font-size:13px;">' + people.map(e => '<option value="' + esc(e) + '"' + (e === defOwner ? ' selected' : '') + '>' + esc(nameOf(e)) + '</option>').join('') + '</select></div>'
      + '<div style="flex:1;">' + lab('Ready by') + '<input id="pjNR" type="date" value="' + dStr(d) + '" style="width:100%;padding:6px;font-size:13px;"></div></div>'
      + '<div id="pjNCS">'
      + '<div style="display:flex;gap:8px;"><div style="flex:2;">' + lab('Who tells us the date') + inp('pjNDC', 'Pamela Anderson (daughter)', '') + '</div><div style="flex:1;">' + lab('Notice to ask for') + inp('pjNNo', '48 hours', '48 hours') + '</div></div>'
      + lab('Shifts needed') + inp('pjNSh', '9am–2pm and 4pm–9pm, 7 days a week', '')
      + lab('Care level (or the possibilities)') + inp('pjNCL', 'bed bound, Hoyer lift or sit-to-stand', '')
      + '<div class="field-note" style="margin-top:6px;">The Staffing Coordinator joins the team by themselves. All hands on deck is on from the start, and an owner signs it off at the end.</div></div>'
      + '<div id="pjNBL" style="display:none;">' + lab('Steps, one per line')
      + '<textarea id="pjNSt" rows="4" style="width:100%;font-size:13px;padding:8px;border-radius:8px;"></textarea>'
      + '<label style="display:flex;gap:7px;align-items:center;font-size:13px;margin-top:6px;"><input type="checkbox" id="pjNSo" style="width:auto;margin:0;"> Needs owner sign-off</label></div>'
      + '<div style="display:flex;gap:8px;margin-top:12px;"><button class="primary" id="pjNGo" style="padding:7px 14px;font-size:13px;">Create</button><button class="ghost" id="pjNNoB" style="padding:7px 14px;font-size:13px;">Cancel</button></div>',
      { width:440 });
    const kind = el.querySelector('#pjNT'), cs = el.querySelector('#pjNCS'), bl = el.querySelector('#pjNBL'), ti = el.querySelector('#pjNTi'), ab = el.querySelector('#pjNA');
    let typed = false;
    ti.oninput = () => { typed = true; };
    ab.oninput = () => { if(!typed && kind.value === 'client_start') ti.value = ab.value.trim() ? ab.value.trim() + ' coming home' : ''; };
    kind.onchange = () => { const c = kind.value === 'client_start'; cs.style.display = c ? '' : 'none'; bl.style.display = c ? 'none' : ''; };
    el.querySelector('#pjNNoB').onclick = ccPopClose;
    el.querySelector('#pjNGo').onclick = async () => {
      const v = id => (el.querySelector('#' + id) || {}).value || '';
      const o = { template:kind.value, about:v('pjNA').trim(), title:v('pjNTi').trim(), owner:v('pjNO'), ready_by:v('pjNR'),
        date_contact:v('pjNDC').trim(), notice:v('pjNNo').trim(), shifts:v('pjNSh').trim(), care_level:v('pjNCL').trim(),
        steps:v('pjNSt').split('\n').map(s => s.trim()).filter(Boolean), signoff:!!(el.querySelector('#pjNSo') || {}).checked };
      if(!o.title){ ccToast('Say what the project is'); return; }
      if(!o.ready_by){ ccToast('Pick a ready-by date'); return; }
      if(o.template !== 'client_start' && !o.steps.length){ ccToast('Add at least one step'); return; }
      ccPopClose();
      const p = build(o);
      (DATA.ops_items = DATA.ops_items || []).push(p);
      if(typeof opsLog === 'function') opsLog(p, 'Project created by ' + actor().name);
      await persist('ops_items', p);
      opEvent('item_created', { item:p, summary:'New project: ' + p.title + ' (' + first(p.owner) + ', ready by ' + dWords(p.ready_by) + ')' });
      ccToast('✓ Project created' + (allHands(p) ? '. All hands on deck is on.' : ''));
      refresh(); openCard(p.id);
    };
    ab.focus();
  }

  Object.assign(window, {
    pjIs:isPj, pjAllHands:allHands, pjHot:hot, pjSees:sees, pjCard:card, pjChip:chipFor, pjMore:more,
    pjStepTick:stepTick, pjStepClaim:stepClaim, pjStepAdd:stepAdd, pjAllHandsSet:setAllHands, pjClose:close,
    pjCloseBlocked:closeBlocked, pjNewOpen:newOpen, pjOpen:openCard, pjRenderBanners:renderBanners, pjTalkHtml:talkHtml,
    pjBuild:build, pjAlertDays:alertDays, pjAxFind:axFind, pjAutoStep:autoStep
  });
})();
