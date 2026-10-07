/* =====================================================================================================================
   LEADS BOARD (Leads intake desk, Stage 2; Samantha 2026-10-06: "Who needs me right now, and what exactly do I need to
   do?"). Draws the Leads page from what lead-rules.js decides (LeadRules.boardRow): three groups, story rows, one primary
   action per row, the rest behind ···. Nothing here decides a rule; the page only draws and wires the buttons to what the
   Hub already has (the office line, the log-call pop-up, the assessment booking, the profile).
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
  const LB = { filter:'All', owner:'' };
  const TONE = { red:'#DC2626', amber:'#B45309', green:'#15803D', navy:'var(--navy)', muted:'var(--text-muted)' };
  const G = { now:['Need you now', 'most urgent first. Anything a person has to do right now lands here on its own: a new inquiry nobody has tried, a family reply, a promised call, a late follow-up, a start coming with no assessment, a check-back that is due, a family with no next step.', '#FFF5F5', '#B91C1C'],
    later:['Scheduled', 'callbacks, assessments and follow-ups with a real time or day, in order. When the time comes, the family moves up on its own.', 'var(--bg)', 'var(--navy)'],
    waiting:['Waiting', 'something outside the office has to happen first. Every row says what we are waiting on and when we check back; on that day the family moves to Need you now by itself.', 'var(--bg)', 'var(--text-muted)'] };

  function ctxFor(l, st){
    const R = window.LeadRules;
    const stage = (typeof leadStage === 'function') ? leadStage(l) : 'new';
    const asm = (DATA.care_assessments || []).filter(a => a && a.lead_id === l.id).map(a => ({ status:a.status, visit_date:a.visit_date }));
    let jn = null; try{ const j = (typeof cjJourneyFor === 'function') ? cjJourneyFor({ lead:l }) : null; if(j && j.next && j.status === 'open') jn = { title:j.next.title, why:j.next.why || '' }; }catch(e){}
    const org = l.referral_org_id ? (DATA.referral_orgs || []).find(o => o.id === l.referral_org_id) : null;
    const drafts = (DATA.post_call_followups || []).filter(f => f && f.lead_id === l.id && f.status === 'pending_approval').map(f => f.id);
    return { hours:R.responseHours(DATA.ops_settings || {}), stage, name:(typeof cpLeadClientName === 'function' && cpLeadClientName(l)) || '', assessments:asm, journey_next:jn, drafts,
      referral:(org && org.name) || l.referral_source_name || '', payer_label:(typeof CPX_PAY !== 'undefined' && CPX_PAY[l.funding_source]) || null };
  }
  function first(n){ return String(n || '').trim().split(/\s+/)[0] || ''; }
  function avatar(owner){ const f = first(owner); return f ? '<span class="lb-av">' + esc(f.charAt(0).toUpperCase()) + '</span><span>' + esc(f) + '</span>' : '<span class="lb-av lb-av-none">?</span><span style="color:var(--red);font-weight:700;">Nobody</span>'; }
  function btn(l, a, primary){
    const k = a.kind, id = esc(l.id), cls = primary ? 'lb-btn lb-btn-primary' : 'lb-btn';
    if(k === 'call'){
      if(!l.phone) return '<span class="lb-btn lb-btn-dim" title="No phone number on the inquiry">No phone</span>';
      return '<a class="' + cls + '" href="#" role="button" data-oc-phone="' + esc(l.phone) + '"' + (l.email ? ' data-oc-email="' + esc(l.email) + '"' : '') + ' data-no-open="1" title="Call from the office line">Call</a>';
    }
    if(k === 'draft') return '<button class="' + cls + '" data-no-open="1" onclick="lbDraft(\'' + id + '\', \'' + esc(a.id) + '\')">' + esc(a.label) + '</button>';
    const fn = { text:'lbText', log:'lbLog', followup:'lbFollowUp', schedule:'lbSchedule', open_asmt:'lbOpenAsmt', open:'lbOpen', dsds:'lbDsds' }[k];
    return '<button class="' + cls + '" data-no-open="1" onclick="' + fn + '(\'' + id + '\', this)">' + esc(a.label) + '</button>';
  }
  /* the yes is offered on the row once a real conversation has happened and nothing blocks it (the server checks again) */
  function yesReady(l, r){ return !!(l.first_human_contact_at && !l.said_yes_at && r.reason !== 'new_overdue' && r.reason !== 'new_running' && r.reason !== 'new_before_open'); }
  function chip(c){ const st = c.tone === 'missing' ? 'background:#fff;color:#B91C1C;border:1px dashed #DC2626;' : c.tone === 'bad' ? 'background:var(--red-bg);color:var(--red);' : 'background:var(--amber-bg);color:var(--amber);'; return '<span class="lb-chip" style="' + st + '">' + esc(c.text) + '</span>'; }
  function rowHtml(r, l){
    const tone = TONE[r.when.tone] || TONE.navy, isNow = r.group === 'now';
    return '<div class="lb-row' + (isNow && r.rank === 0 ? ' lb-row-hot' : '') + '" data-open-lead="' + esc(l.id) + '" data-open-tab="summary" title="Open their profile">'
      + '<div class="lb-when"><div class="lb-when-big" style="color:' + tone + ';">' + esc(r.when.big) + '</div>' + (r.when.sub ? '<div class="lb-when-sub" style="color:' + (r.when.tone === 'red' ? '#B91C1C' : 'var(--text-muted)') + ';">' + esc(r.when.sub) + '</div>' : '') + '</div>'
      + '<div class="lb-story"><div class="lb-name">' + esc(r.name) + (r.why ? ' <span class="lb-why">· ' + esc(r.why) + '</span>' : '') + '</div>'
      + (r.need ? '<div class="lb-need">' + esc(r.need).replace(/^([^·]+)/, '<b>$1</b>') + '</div>' : '')
      + (r.chips.length ? '<div class="lb-chips">' + r.chips.map(chip).join('') + '</div>' : '')
      + (r.last ? '<div class="lb-last">' + esc(r.last) + '</div>' : '') + '</div>'
      + '<div class="lb-next"><div class="lb-k">Next</div><div class="lb-next-text">' + esc(r.next.text) + '</div>' + (r.next.sub && r.next.sub !== r.last ? '<div class="lb-next-sub">' + esc(r.next.sub) + '</div>' : '')
      + '<div class="lb-actions" data-no-open="1">' + btn(l, r.primary, isNow) + r.secondary.slice(0, 1).map(a => btn(l, a, false)).join('')
      + (yesReady(l, r) ? '<button class="lb-btn lb-btn-yes" data-no-open="1" onclick="lbYes(\'' + esc(l.id) + '\', this)">They said yes</button>' : '')
      + '<button class="lb-btn lb-more" data-no-open="1" aria-label="More actions" onclick="lbMore(\'' + esc(l.id) + '\', this)">···</button></div></div>'
      + '<div class="lb-owner">' + avatar(r.owner) + '</div></div>';
  }
  function groupHtml(key, rows, today){
    const g = G[key], R = window.LeadRules;
    let h = '<div class="card lb-group"><div class="lb-group-head" style="background:' + g[2] + ';"><span class="lb-group-title" style="color:' + g[3] + ';">' + g[0] + '</span><span class="field-note">' + rows.length + ' · ' + g[1] + '</span></div>';
    if(!rows.length) h += '<div class="lb-empty">' + (key === 'now' ? 'Nothing needs you right now.' : key === 'later' ? 'Nothing scheduled.' : 'Nobody is waiting.') + '</div>';
    let lastDay = null;
    rows.forEach(x => {
      if(key === 'later'){ const d = R.dayHeader(x.r.sort, today); if(d !== lastDay){ lastDay = d; h += '<div class="lb-day">' + esc(d) + '</div>'; } }
      h += rowHtml(x.r, x.l);
    });
    return h + '</div>';
  }
  /* rows = lsRows() (every lead with its set); the board draws the working set, the look-ups draw their own flat list */
  function render(rows, opts){
    const R = window.LeadRules, box = document.getElementById('lbBoard'), nums = document.getElementById('lbNumbers'), fl = document.getElementById('lbFilters'), lk = document.getElementById('lbLookup');
    if(!box || !R) return;
    opts = opts || {};
    const today = R.ymd(new Date()), now = new Date().toISOString();
    const work = rows.filter(r => r.set === 'work' && r.l).map(r => { const st = r.st; const br = R.boardRow(r.l, Object.assign(ctxFor(r.l, st), { now, today })); return { r:br, l:r.l, st, lead:r.l }; });
    /* numbers */
    const hours = R.responseHours(DATA.ops_settings || {});
    const nowRows = work.filter(x => x.r.group === 'now'), newUntouched = work.filter(x => x.r.reason === 'new_overdue' || x.r.reason === 'new_running');
    const asmToday = work.filter(x => x.r.reason === 'asmt_booked' && R.dayHeader(x.r.sort, today) === 'Today').length;
    const med = R.medianFirstAttemptMinutes(DATA.leads || [], hours, today);
    const tile = (n, label, col, f) => '<button class="lb-tile" onclick="lbFilter(\'' + f + '\')"><span class="lb-tile-n" style="color:' + col + ';">' + n + '</span><span class="lb-tile-l">' + label + '</span></button>';
    if(nums) nums.innerHTML = tile(nowRows.length, 'need you now', '#DC2626', 'now') + tile(newUntouched.length, 'new, nobody has tried', '#DC2626', 'new') + tile(asmToday, 'assessments today', 'var(--navy)', 'later')
      + tile(work.filter(x => x.r.group === 'waiting').length, 'waiting', 'var(--text-muted)', 'waiting')
      + '<div class="lb-tile lb-tile-static"><span class="lb-tile-n" style="color:#15803D;">' + (med == null ? '–' : med + ' <span style="font-size:14px;">min</span>') + '</span><span class="lb-tile-l">median first attempt today</span></div>';
    /* filters: owner + stage words */
    const owners = [...new Set(work.map(x => first(x.r.owner)).filter(Boolean))].sort();
    const F = [['All', 'All'], ['now', 'Need you now'], ['new', 'New'], ['talking', 'Talking'], ['assessment', 'Assessment'], ['waiting', 'Waiting']];
    if(fl) fl.innerHTML = '<label for="lbOwner" class="lb-k" style="margin-right:4px;">Showing</label><select id="lbOwner" onchange="lbOwner(this.value)"><option value="">Everyone\'s families</option>' + owners.map(o => '<option value="' + esc(o) + '"' + (LB.owner === o ? ' selected' : '') + '>' + esc(o) + '\'s</option>').join('') + '</select>'
      + F.map(f => '<button class="filter-pill' + (LB.filter === f[0] ? ' active' : '') + '" onclick="lbFilter(\'' + f[0] + '\')">' + f[1] + ' <span style="opacity:.65;">' + work.filter(x => lbIn(x, f[0])).length + '</span></button>').join('');
    /* the look-ups (the sets that are not the working board) */
    const count = s => rows.filter(r => r.set === s).length;
    const yesMonth = (DATA.leads || []).filter(l => l && l.status === 'Converted' && String(l.converted_at || '').slice(0, 7) === today.slice(0, 7)).length;
    if(lk) lk.innerHTML = '<span class="lb-k" style="margin-right:4px;">Look up</span>'
      + '<button class="filter-pill" onclick="lbGettingReady()">Said yes this month ' + yesMonth + ' · Getting ready</button>'
      + [['care', 'Receiving care'], ['past', 'Past'], ['archived', 'Archived'], ['spam', 'Spam']].map(s => '<button class="filter-pill' + (LB.filter === 'set:' + s[0] ? ' active' : '') + '" onclick="lbFilter(\'set:' + s[0] + '\')">' + s[1] + ' ' + count(s[0]) + '</button>').join('')
      + '<button class="filter-pill' + (LB.filter === 'state' ? ' active' : '') + '" onclick="lbFilter(\'state\')">State submissions</button>'
      + '<span style="flex:1;"></span><button class="linklike" onclick="switchLeadsSubtab(\'followups\')">All follow-up drafts (pending, approved, sent)</button>';
    /* the board itself */
    if(LB.filter === 'state'){ box.innerHTML = (typeof lsStateHtml === 'function') ? lsStateHtml() : ''; return; }
    if(LB.filter.indexOf('set:') === 0){
      const set = LB.filter.slice(4), list = rows.filter(r => r.set === set);
      box.innerHTML = '<div class="card lb-group"><div class="lb-group-head" style="background:var(--bg);"><span class="lb-group-title" style="color:var(--text-muted);">' + esc({ care:'Receiving care', past:'Past', archived:'Archived', spam:'Spam' }[set]) + '</span><span class="field-note">' + list.length + ' · click a family to open their profile</span></div>'
        + (list.length ? list.map(r => '<div class="lb-row" data-open-lead="' + esc(r.l.id) + '" data-open-tab="summary"><div class="lb-when"><div class="lb-when-sub">' + esc(r.l.created_at ? R.dayWords(R.chicago(r.l.created_at).ymd, today) : '') + '</div></div><div class="lb-story"><div class="lb-name">' + esc(r.name) + '</div><div class="lb-last">' + esc(r.move || '') + '</div></div><div class="lb-next"></div><div class="lb-owner">' + avatar(r.l.assigned_coordinator) + '</div></div>').join('') : '<div class="lb-empty">Nobody here.</div>') + '</div>';
      return;
    }
    const shown = work.filter(x => lbIn(x, LB.filter)).sort((a, b) => R.boardSort(a.r, b.r));
    const by = { now:[], later:[], waiting:[] }; shown.forEach(x => by[x.r.group].push(x));
    const order = LB.filter === 'now' ? ['now'] : LB.filter === 'waiting' ? ['waiting'] : LB.filter === 'later' ? ['later'] : ['now', 'later', 'waiting'];
    box.innerHTML = order.map(k => groupHtml(k, by[k], today)).join('');
  }
  function lbIn(x, f){
    if(LB.owner && first(x.r.owner) !== LB.owner) return false;
    if(f === 'All') return true; if(f === 'now' || f === 'later' || f === 'waiting') return x.r.group === f;
    if(f === 'new') return x.st && x.st.k === 'new'; if(f === 'talking') return x.st && x.st.k === 'talking' && x.r.group !== 'waiting'; if(f === 'assessment') return x.st && x.st.k === 'assessment';
    return true;
  }
  /* ── the row actions, all reusing what the Hub already has ── */
  const lead = id => (DATA.leads || []).find(l => l && l.id === id);
  const redraw = () => { try{ if(typeof renderLeadsStarts === 'function') renderLeadsStarts(); }catch(e){} };
  function lbText(id){ if(typeof openLeadProfile === 'function') openLeadProfile(id, 'summary'); }
  function lbOpen(id){ if(typeof openLeadProfile === 'function') openLeadProfile(id, 'summary'); }
  function lbOpenAsmt(id){ if(typeof openLeadProfile === 'function') openLeadProfile(id, 'care'); }
  function lbSchedule(id){ if(typeof asmtBook === 'function') asmtBook(id); }
  /* the same log-call pop-up the profile uses; it writes to the lead it is pointed at */
  function lbLog(id, btn){ const l = lead(id); if(!l) return; try{ commsLead = l; }catch(e){ window.commsLead = l; } if(btn) btn.focus(); if(typeof logManualCall === 'function') logManualCall(); const t = setInterval(() => { if(!document.querySelector('.ccpop')){ clearInterval(t); redraw(); } }, 400); setTimeout(() => clearInterval(t), 120000); }
  /* set the follow-up: the day, an optional time, a note; the row moves to Scheduled */
  function lbFollowUp(id, btn){
    const l = lead(id); if(!l || typeof ccPopOpen !== 'function') return;
    const R = window.LeadRules, today = R.ymd(new Date());
    const el = ccPopOpen(btn || document.body,
      '<div style="font-size:13.5px;font-weight:700;margin-bottom:6px;">When do we follow up with ' + esc((l.first_name || '').trim() || 'them') + '?</div>'
      + '<div style="display:flex;gap:6px;"><input id="lbFuDate" type="date" value="' + esc(String(l.follow_up_due || '').slice(0, 10) >= today ? String(l.follow_up_due).slice(0, 10) : R.addDays(today, 1)) + '" style="flex:1;font-size:13px;padding:6px;"><input id="lbFuTime" type="time" value="' + esc(l.follow_up_time || '') + '" style="width:110px;font-size:13px;padding:6px;"></div>'
      + '<input id="lbFuNote" placeholder="What is the call about? (shows on the board)" value="' + esc(l.follow_up_note || '') + '" style="width:100%;margin-top:8px;padding:8px 10px;font-size:13px;border:1px solid var(--border);border-radius:8px;box-sizing:border-box;">'
      + '<div style="display:flex;gap:8px;margin-top:10px;"><button class="primary" id="lbFuGo" style="padding:7px 14px;font-size:13px;">Save</button><button class="ghost" id="lbFuNo" style="padding:7px 14px;font-size:13px;">Cancel</button></div>', { width:320 });
    el.querySelector('#lbFuNo').onclick = ccPopClose;
    el.querySelector('#lbFuGo').onclick = async () => {
      const d = el.querySelector('#lbFuDate').value, t = el.querySelector('#lbFuTime').value, n = el.querySelector('#lbFuNote').value.trim();
      if(!d){ alert('Pick the day.'); return; }
      R.setNext(l, { kind:'follow_up', day:d, time:t || '', why:n });   /* the one writer (clean-up 6.2); a waiting family's check-back moves with it */
      ccPopClose(); await persist('leads', l); if(typeof opsReconcileLeads === 'function'){ try{ opsReconcileLeads(); }catch(e){} } redraw();
    };
  }
  function lbMore(id, btn){
    const l = lead(id); if(!l || typeof ccPopOpen !== 'function') return;
    const row = (t, fn) => '<div class="ccpick-row" data-fn="' + fn + '" style="padding:8px;border-radius:8px;cursor:pointer;font-size:13.5px;">' + t + '</div>';
    const el = ccPopOpen(btn, '<div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:4px;">' + esc(((l.client_first_name || '') + ' ' + (l.client_last_name || '')).trim() || ((l.first_name || '') + ' ' + (l.last_name || '')).trim()) + '</div>'
      + row('Open their profile', 'open') + row('Edit the inquiry (start, schedule, waiting on…)', 'edit') + row('Schedule the assessment', 'schedule') + row('Set a follow-up', 'followup') + (l.said_yes_at ? '' : row('They said yes', 'yes')) + row('Mark lost…', 'lost') + (typeof leadFromWebForm === 'function' && leadFromWebForm(l) ? row('Not a real inquiry (spam)', 'spam') : ''), { width:300 });
    el.querySelectorAll('.ccpick-row').forEach(r => { r.onmouseenter = () => r.style.background = 'var(--bg)'; r.onmouseleave = () => r.style.background = '';
      r.onclick = () => { const fn = r.dataset.fn; ccPopClose();
        if(fn === 'open') lbOpen(id); else if(fn === 'edit' && typeof openLeadModal === 'function') openLeadModal(id); else if(fn === 'schedule') lbSchedule(id); else if(fn === 'followup') lbFollowUp(id, btn);
        else if(fn === 'yes') lbYes(id, btn); else if(fn === 'lost') lbLost(id); else if(fn === 'spam' && typeof lpMarkSpam === 'function') lpMarkSpam(id, btn); };
    });
  }
  async function lbLost(id){
    const l = lead(id); if(!l) return;
    const r = (typeof askLostReason === 'function') ? askLostReason(l) : null; if(!r) return;
    Object.assign(l, r); l.status = 'Lost';
    await persist('leads', l); if(typeof opsReconcileLeads === 'function'){ try{ opsReconcileLeads(); }catch(e){} } redraw();
    if(typeof ccToast === 'function') ccToast('Marked lost: ' + r.lost_reason);
  }
  /* Stage 4: "Called DSDS" restarts the 21-day clock on a family waiting on the state and writes a history line */
  async function lbDsds(id){
    const l = lead(id); if(!l) return;
    const now = new Date().toISOString(), a = (typeof ccActor === 'function') ? ccActor() : { email:'', name:'' };
    l.dsds_called_at = now; l.comm_log = Array.isArray(l.comm_log) ? l.comm_log : [];
    l.comm_log.push({ body:'Called DSDS about the authorization', at:now, by:a.email, kind:'dsds_called' });
    if(typeof ldPush === 'function') ldPush(l, { channel:'call', direction:'out', outcome:'connected', actor:'human', by:a.email, note:'DSDS, about the authorization', ref:'dsds' });
    await persist('leads', l); if(typeof opsReconcileLeads === 'function'){ try{ opsReconcileLeads(); }catch(e){} } redraw();
    if(typeof ccToast === 'function') ccToast('Noted: DSDS called. The 21-day clock restarts today.');
  }
  /* clean-up 6.5: the AI draft review opens from the row (the Follow-ups tab is gone; its archive is under Look up) */
  function lbDraft(id, draftId){ if(typeof openFollowUpModal === 'function') openFollowUpModal(draftId, id); }
  function lbYes(id, btn){ if(typeof cjSaidYes === 'function') cjSaidYes(id, btn); else alert('The client journey page did not load. Refresh and try again.'); }
  function lbFilter(f){ LB.filter = f; redraw(); }
  function lbOwner(o){ LB.owner = o || ''; redraw(); }
  function lbGettingReady(){ if(typeof ccParentClick === 'function') ccParentClick('gettingready'); else if(typeof switchTab === 'function') switchTab('soc'); }
  Object.assign(window, { LeadsBoard:{ render, state:LB, ctxFor }, lbText, lbOpen, lbOpenAsmt, lbSchedule, lbLog, lbFollowUp, lbMore, lbLost, lbYes, lbDsds, lbDraft, lbFilter, lbOwner, lbGettingReady });
})();
