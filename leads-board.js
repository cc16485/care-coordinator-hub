/* =====================================================================================================================
   LEADS BOARD (Leads intake desk, Stage 2; Samantha 2026-10-06: "Who needs me right now, and what exactly do I need to
   do?"). Draws the Leads page from what lead-rules.js decides (LeadRules.boardRow): three groups, story rows, one primary
   action per row, the rest behind ···. Nothing here decides a rule; the page only draws and wires the buttons to what the
   Hub already has (the office line, the log-call pop-up, the assessment booking, the profile).
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
  const LB = { filter:'All', owner:'', sort:'imp', open:new Set() };
  try{ const v = localStorage.getItem('lbSort'); if(v === 'due' || v === 'imp') LB.sort = v; }catch(e){}
  const q = v => JSON.stringify(String(v)).replace(/"/g, '&quot;');
  const TONE = { red:'#DC2626', amber:'#B45309', green:'#15803D', navy:'var(--navy)', muted:'var(--text-muted)' };
  const G = { now:['Need you now', 'most urgent first. Anything a person has to do right now lands here on its own: a new inquiry nobody has tried, a family reply, a promised call, a late follow-up, a start coming with no assessment, a check-back that is due, a family with no next step.', '#FFF5F5', '#B91C1C'],
    later:['Scheduled', 'callbacks, assessments and follow-ups with a real time or day, in order. When the time comes, the family moves up on its own.', 'var(--bg)', 'var(--navy)'],
    waiting:['Waiting', 'something outside the office has to happen first. Every row says what we are waiting on and when we check back; on that day the family moves to Need you now by itself.', 'var(--bg)', 'var(--text-muted)'] };

  function ctxFor(l, st){
    const R = window.LeadRules;
    const stage = (typeof leadStage === 'function') ? leadStage(l) : 'new';
    const asm = (DATA.care_assessments || []).filter(a => a && a.lead_id === l.id).map(a => ({ status:a.status, visit_date:a.visit_date }));
    let jn = null; try{ const j = (typeof cjJourneyFor === 'function') ? cjJourneyFor({ lead:l }) : null; if(j && j.next && j.status === 'open') jn = { title:j.next.title, why:j.next.why || '', status:j.next.status }; }catch(e){}
    /* CRM plan step A (2026-10-15): the Start Contract, so the update we owe the family shows here like any other promise */
    let contract = null; try{ const F = (typeof LS !== 'undefined' && LS.facts) || null; const ep = F && F.epOf && F.epOf[String(l.id)]; contract = ep && F.scOf ? F.scOf[ep] || null : null; }catch(e){}
    const org = l.referral_org_id ? (DATA.referral_orgs || []).find(o => o.id === l.referral_org_id) : null;
    const drafts = (DATA.post_call_followups || []).filter(f => f && f.lead_id === l.id && f.status === 'pending_approval').map(f => f.id);
    /* item 3 (2026-10-07): the partner's record (subtype), the caregivers' availability (staffing risk) and whether a Team Builder plan is linked (pre-matched) */
    let pre = false; try{ const F = (typeof LS !== 'undefined' && LS.facts) || null; const ep = F && F.epOf && F.epOf[String(l.id)]; pre = !!(ep && F.planOf && F.planOf[ep]); }catch(e){}
    const people = (window.LeadWorkspace && LeadWorkspace.people) ? LeadWorkspace.people() : null;
    /* 2026-10-15 (her "tidier Leads board"): Medicaid is no longer accepted (one row, not the state's rows); the old AI's
       recap drafts are retired (no Draft ready row; they stay under Look up); no "assessment overdue" or "deciding 7+ days"
       nudge rows (the follow-up date you set says when) */
    return { no_medicaid:true, no_drafts:true, quiet_nudges:true, hours:R.responseHours(DATA.ops_settings || {}), stage, contract, name:(typeof cpLeadClientName === 'function' && cpLeadClientName(l)) || '', assessments:asm, journey_next:jn, drafts, org, people, pre_matched:pre,
      referral:(org && org.name) || l.referral_source_name || '', payer_label:(typeof CPX_PAY !== 'undefined' && CPX_PAY[l.funding_source]) || null };
  }
  window.lbCtxFor = ctxFor;   /* the same question for the profile's Next action and the Path card (LeadRules.oneNext) */
  function first(n){ return String(n || '').trim().split(/\s+/)[0] || ''; }
  function avatar(owner){ const f = first(owner); return f ? '<span class="lb-av">' + esc(f.charAt(0).toUpperCase()) + '</span><span>' + esc(f) + '</span>' : '<span class="lb-av lb-av-none">?</span><span style="color:var(--red);font-weight:700;">Nobody</span>'; }
  function btn(l, a, primary){
    const k = a.kind, id = esc(l.id), cls = primary ? 'lb-btn lb-btn-primary' : 'lb-btn';
    /* 769: once calls and texts record themselves, the row has no Log call (it stays under ··· for another phone) */
    if(k === 'log' && window.LeadRecorder && LeadRecorder.isLive()) return '';
    if(k === 'call'){
      if(!l.phone) return '<span class="lb-btn lb-btn-dim" title="No phone number on the inquiry">No phone</span>';
      return '<a class="' + cls + '" href="#" role="button" data-oc-phone="' + esc(l.phone) + '"' + (l.email ? ' data-oc-email="' + esc(l.email) + '"' : '') + ' data-no-open="1" title="Call from the office line">Call</a>';
    }
    if(k === 'draft') return '<button class="' + cls + '" data-no-open="1" onclick="lbDraft(\'' + id + '\', \'' + esc(a.id) + '\')">' + esc(a.label) + '</button>';
    /* item 5 (2026-10-07): the suggested next try rides on the follow-up button; Waiting on…, Mark lost…, Called the case manager, Offered bridge hours */
    if(k === 'followup' && a.suggest && a.suggest.day) return '<button class="' + cls + '" data-no-open="1" onclick="lbFollowUp(\'' + id + '\', this, ' + q(JSON.stringify(a.suggest)) + ')">' + esc(a.label) + '</button>';
    const fn = { text:'lbText', log:'lbLog', followup:'lbFollowUp', schedule:'lbSchedule', open_asmt:'lbOpenAsmt', open:'lbOpen', dsds:'lbDsds', waiting:'lbWaiting', lost:'lbLost', bridge:'lbBridge', case_manager:'lbCaseManager', payer:'lbPayer', lost_cds:'lbLostCds' }[k];
    return '<button class="' + cls + '" data-no-open="1" onclick="' + fn + '(\'' + id + '\', this)">' + esc(a.label) + '</button>';
  }
  /* the yes is offered on the row once a real conversation has happened and nothing blocks it (the server checks again) */
  function yesReady(l, r){ return !!(l.first_human_contact_at && !l.said_yes_at && r.reason !== 'new_overdue' && r.reason !== 'new_running' && r.reason !== 'new_before_open'); }
  function chip(c){ const st = c.tone === 'missing' ? 'background:#fff;color:#B91C1C;border:1px dashed #DC2626;' : c.tone === 'bad' ? 'background:var(--red-bg);color:var(--red);' : 'background:var(--amber-bg);color:var(--amber);'; return '<span class="lb-chip" style="' + st + '"' + (c.key ? ' data-flag="' + esc(c.key) + '"' : '') + '>' + esc(c.text) + '</span>'; }
  /* ── 2026-10-15 (Samantha: "make the leads list not so wide... know order of importance... how serious they sound, how
     many hours they want, put a dollar amount on them when we can"; approved mockup Part 1,
     https://claude.ai/artifact/MhFEgbLXTzmPCbegzHVv49): one line per family, ranked; click the line for the details. ── */
  const RD = { map:new Map(), at:0, busy:false, err:'' };
  async function rdLoad(){
    if(RD.busy || typeof sb === 'undefined' || !sb || Date.now() - RD.at < 60e3) return;
    RD.busy = true;
    try{ const { data, error } = await sb.from('lead_readiness').select('lead_id, level, why, hours_heard, source, read_at, error');
      RD.err = error ? (error.message || 'could not read') : ''; if(!error){ RD.map = new Map((data || []).map(x => [String(x.lead_id), x])); } }catch(e){ RD.err = 'could not read'; }
    RD.at = Date.now(); RD.busy = false; redraw();
  }
  const READY = { ready:[3, 'Ready now'], deciding:[2, 'Deciding'], looking:[1, 'Just looking'] };
  const numOf = v => { const m = String(v == null ? '' : v).match(/\d+(\.\d+)?/); const n = m ? Number(m[0]) : 0; return n > 0 && n <= 168 ? n : 0; };
  /* the rate card's level: dementia or a two-person transfer is Advanced (l3), help with the body is Personal Care (l2), else Wellness (l1) */
  function careLevel(l){
    const words = [l.why_called, l.notes, l.mobility, (l.care_plan_draft && l.care_plan_draft.fields && l.care_plan_draft.fields.adl_needs) || ''].join(' ');
    const needs = Array.isArray(l.needs) ? l.needs : [], conds = Array.isArray(l.medical_conditions) ? l.medical_conditions : [];
    if(needs.indexOf('dementia') >= 0 || conds.some(c => c === 'dementia' || c === 'alzheimers') || /dementia|alzheim|memory care|two.person|hoyer/i.test(words)) return ['l3', 'Advanced Care'];
    if(needs.indexOf('personalCare') >= 0 || /bath|shower|dress|toilet|incontinen|transfer|groom|hygien/i.test(words)) return ['l2', 'Personal Care'];
    return ['l1', 'Wellness'];
  }
  function valueOf(l){
    const rd = RD.map.get(String(l.id)) || null;
    const d = l.care_plan_draft && l.care_plan_draft.fields;
    const tries = [[l.number_of_hours, 'the Hours box'], [l.schedule && l.schedule.hours_per_week, 'the inquiry form'], [d && d.recommended_hours_per_week, 'the care plan draft'], [rd && rd.hours_heard, 'what they said']];
    let hours = 0, hoursFrom = '';
    for(const [v, from] of tries){ const n = numOf(v); if(n){ hours = n; hoursFrom = from; break; } }
    const [lv, lvName] = careLevel(l);
    let rate = 0; try{ const rec = (typeof clientRatesRec === 'function') ? clientRatesRec() : null; rate = numOf(rec && rec.levels && rec.levels[lv] && rec.levels[lv].rate); }catch(e){}
    const pay = String(l.funding_source || '');
    let usd = 0, txt = '', how = '';
    if(pay === 'guide'){ txt = 'GUIDE respite'; how = 'Paid through the Medicare GUIDE respite benefit'; }
    else if(pay === 'medicaid' || pay === 'cds'){ txt = ''; how = 'Not a private-pay family'; }
    else if(!hours){ how = 'No hours yet, so no amount (ask how many hours)'; }
    else if(!rate){ how = 'No ' + lvName + ' rate on the rate card'; }
    else { usd = Math.round(hours * rate * 4.33 / 10) * 10; how = hours + ' h a week (from ' + hoursFrom + ') × $' + rate + ' ' + lvName + ' × 4.33 weeks, about'; }
    const lvl = rd && rd.level && READY[rd.level] ? rd.level : '';
    return { hours, hoursFrom, usd, txt, how, rd, lvl, score:lvl ? READY[lvl][0] : 2 };
  }
  window.lbValueOf = valueOf;
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  function heat(v){
    if(!v.lvl) return '<span class="lbc-heat lbc-h0" title="' + esc(RD.err ? 'Readings could not be loaded' : 'Not read yet') + '">' + (RD.err ? '?' : 'Not read yet') + '</span>';
    const n = READY[v.lvl][0];
    return '<span class="lbc-heat lbc-h' + n + '"><i>' + [1, 2, 3].map(k => '<s' + (k <= n ? ' class="f"' : '') + '></s>').join('') + '</i>' + READY[v.lvl][1] + '</span>';
  }
  /* most important first: a new family nobody has tried and a family waiting on our reply stay on top; then how ready they
     sound, then what they are worth a month, then the board's own order */
  const pinned = r => r.reason === 'new_overdue' || r.reason === 'new_running' || r.reason === 'replied';
  function impSort(a, b){
    const pa = pinned(a.r) ? 0 : 1, pb = pinned(b.r) ? 0 : 1;
    if(pa !== pb) return pa - pb;
    if(!pa) return window.LeadRules.boardSort(a.r, b.r);
    return (b.v.score - a.v.score) || (b.v.usd - a.v.usd) || window.LeadRules.boardSort(a.r, b.r);
  }
  function compactHtml(r, l, v){
    const tone = TONE[r.when.tone] || TONE.navy, isNow = r.group === 'now', open = LB.open.has(String(l.id)), id = esc(l.id);
    return '<div class="lb-row lbc' + (isNow && r.rank === 0 ? ' lb-row-hot' : '') + (open ? ' lbc-open' : '') + '" data-lbc="' + id + '" tabindex="0" title="Show the details">'
      + '<span class="lbc-chev" aria-hidden="true">' + (open ? '▾' : '▸') + '</span>'
      + '<div class="lbc-fam"><button class="lbc-name" data-open-lead="' + id + '" data-open-tab="summary" title="Open their profile">' + esc(r.name) + '</button>' + (r.why ? '<div class="lbc-sub">' + esc(r.why) + '</div>' : '') + '</div>'
      + '<div class="lbc-ready">' + heat(v) + '</div>'
      + '<div class="lbc-num">' + (v.hours ? esc(v.hours) : '<span class="lbc-unk">?</span>') + '</div>'
      + '<div class="lbc-num">' + (v.usd ? '<span class="lbc-usd">' + money(v.usd) + '</span>' : '<span class="lbc-unk">' + esc(v.txt || '?') + '</span>') + '</div>'
      + '<div class="lbc-next">' + esc(r.next.text) + '</div>'
      + '<div class="lbc-due" style="color:' + tone + ';">' + esc(r.when.big) + '</div>'
      + '<div class="lbc-act" data-no-open="1">' + btn(l, r.primary, isNow) + '</div>'
      + '<div class="lbc-own" title="' + esc(r.owner || 'Nobody') + '">' + avatar(r.owner).split('</span>')[0] + '</span></div>'
      + '</div>'
      + '<div class="lbc-det"' + (open ? '' : ' hidden') + ' data-no-open="1">'
      + '<div class="lbc-grid">'
      + '<div><span class="lb-k">How ready</span>' + (v.rd && v.rd.why ? esc(v.rd.why) + '<span class="field-note"> (' + (v.rd.source === 'call' ? 'from their calls and texts' : 'from the inquiry form') + ')</span>' : '<span class="field-note">Not read yet. It is read within 15 minutes of anything new about them.</span>') + '</div>'
      + '<div><span class="lb-k">When</span>' + esc(r.when.big) + (r.when.sub ? ', ' + esc(r.when.sub) : '') + '</div>'
      + (r.need ? '<div><span class="lb-k">What they need</span>' + esc(r.need) + '</div>' : '')
      + '<div><span class="lb-k">How we figured $</span>' + esc(v.how) + '</div>'
      + (r.last ? '<div><span class="lb-k">Last</span>' + esc(r.last) + '</div>' : '')
      + (r.next.sub && r.next.sub !== r.last ? '<div><span class="lb-k">Next</span>' + esc(r.next.text) + ': ' + esc(r.next.sub) + '</div>' : '')
      + '</div>'
      + (r.chips.length ? '<div class="lb-chips">' + r.chips.map(chip).join('') + '</div>' : '')
      + '<div class="lb-actions">' + r.secondary.map(a => btn(l, a, false)).join('')
      + (yesReady(l, r) ? '<button class="lb-btn lb-btn-yes" onclick="lbYes(\'' + id + '\', this)">They said yes</button>' : '')
      + '<button class="lb-btn" data-open-lead="' + id + '" data-open-tab="summary">Open profile</button>'
      + '<button class="lb-btn lb-more" aria-label="More actions" onclick="lbMore(\'' + id + '\', this)">···</button></div></div>';
  }
  const HEAD = '<div class="lbc-head"><span></span><span>Family</span><span>How ready</span><span class="lbc-num">Hours/wk</span><span class="lbc-num">$/month</span><span>Next</span><span>Due</span><span></span><span></span></div>';
  function lbSort(v){ LB.sort = v === 'due' ? 'due' : 'imp'; try{ localStorage.setItem('lbSort', LB.sort); }catch(e){} redraw(); }
  function lbToggle(id){ id = String(id); if(LB.open.has(id)) LB.open.delete(id); else LB.open.add(id); redraw(); }
  function groupHtml(key, rows, today){
    const g = G[key], R = window.LeadRules;
    let h = '<div class="card lb-group"><div class="lb-group-head" style="background:' + g[2] + ';"><span class="lb-group-title" style="color:' + g[3] + ';">' + g[0] + '</span><span class="field-note">' + rows.length + ' · ' + g[1] + '</span></div>' + (rows.length ? HEAD : '');
    if(!rows.length) h += '<div class="lb-empty">' + (key === 'now' ? 'Nothing needs you right now.' : key === 'later' ? 'Nothing scheduled.' : 'Nobody is waiting.') + '</div>';
    let lastDay = null;
    rows.forEach(x => {
      if(key === 'later'){ const d = R.dayHeader(x.r.sort, today); if(d !== lastDay){ lastDay = d; h += '<div class="lb-day">' + esc(d) + '</div>'; } }
      h += compactHtml(x.r, x.l, x.v || valueOf(x.l));
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
      + tile(work.filter(x => x.r.chips.some(c => c.tone === 'missing')).length, 'missing required', '#B91C1C', 'missing')
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
      /* 2026-10-15: Future Service Opportunities (future-opps.js) */
      + (window.FutureOpps ? '<button class="filter-pill' + (LB.filter === 'future' ? ' active' : '') + '" onclick="lbFilter(\'future\')">Future opportunities ' + count('future') + (FutureOpps.matchCount() ? ' <b style="color:#6D28D9;">· ' + FutureOpps.matchCount() + ' may fit now</b>' : '') + '</button>' : '')
      + [['care', 'Receiving care'], ['past', 'Past'], ['archived', 'Archived'], ['spam', 'Spam']].map(s => '<button class="filter-pill' + (LB.filter === 'set:' + s[0] ? ' active' : '') + '" onclick="lbFilter(\'set:' + s[0] + '\')">' + s[1] + ' ' + count(s[0]) + '</button>').join('')
      /* 2026-10-15: Medicaid is no longer accepted: State submissions only while an older Medicaid family is still open */
      + ((DATA.leads || []).some(x => x && x.funding_source === 'medicaid' && !x.archived && x.status !== 'Lost') ? '<button class="filter-pill' + (LB.filter === 'state' ? ' active' : '') + '" onclick="lbFilter(\'state\')">State submissions</button>' : '')
      + '<span style="flex:1;"></span><button class="linklike" onclick="switchLeadsSubtab(\'followups\')">All follow-up drafts (pending, approved, sent)</button>';
    /* the board itself */
    if(LB.filter === 'future' && window.FutureOpps){ box.innerHTML = FutureOpps.html(); return; }
    if(LB.filter === 'state'){ box.innerHTML = (typeof lsStateHtml === 'function') ? lsStateHtml() : ''; return; }
    if(LB.filter.indexOf('set:') === 0){
      const set = LB.filter.slice(4), list = rows.filter(r => r.set === set);
      box.innerHTML = '<div class="card lb-group"><div class="lb-group-head" style="background:var(--bg);"><span class="lb-group-title" style="color:var(--text-muted);">' + esc({ care:'Receiving care', past:'Past', archived:'Archived', spam:'Spam' }[set]) + '</span><span class="field-note">' + list.length + ' · click a family to open their profile</span></div>'
        + (list.length ? list.map(r => '<div class="lb-row" data-open-lead="' + esc(r.l.id) + '" data-open-tab="summary"><div class="lb-when"><div class="lb-when-sub">' + esc(r.l.created_at ? R.dayWords(R.chicago(r.l.created_at).ymd, today) : '') + '</div></div><div class="lb-story"><div class="lb-name">' + esc(r.name) + '</div><div class="lb-last">' + esc(r.move || '') + '</div></div><div class="lb-next"></div><div class="lb-owner">' + avatar(r.l.assigned_coordinator) + '</div></div>').join('') : '<div class="lb-empty">Nobody here.</div>') + '</div>';
      return;
    }
    rdLoad();
    const shown = work.filter(x => lbIn(x, LB.filter)).map(x => Object.assign(x, { v:valueOf(x.l) })).sort((a, b) => R.boardSort(a.r, b.r));
    const worth = shown.reduce((t, x) => t + (x.v.usd || 0), 0);
    const bar = '<div class="lbc-bar"><button class="filter-pill' + (LB.sort === 'imp' ? ' active' : '') + '" onclick="lbSort(\'imp\')">Most important</button><button class="filter-pill' + (LB.sort === 'due' ? ' active' : '') + '" onclick="lbSort(\'due\')">Due first</button>'
      + '<span style="flex:1;"></span>' + (worth ? '<span class="field-note">Open families shown are worth about <b class="lbc-usd">' + money(worth) + ' a month</b></span>' : '') + '</div>';
    const by = { now:[], later:[], waiting:[] }; shown.forEach(x => by[x.r.group].push(x));
    const order = LB.filter === 'now' ? ['now'] : LB.filter === 'waiting' ? ['waiting'] : LB.filter === 'later' ? ['later'] : ['now', 'later', 'waiting'];
    if(LB.filter === 'missing' && !shown.length){ box.innerHTML = '<div class="card lb-group"><div class="lb-empty">Nothing is missing that the stage needs. <button class="linklike" onclick="lbFilter(\'All\')">Show everyone</button></div></div>'; return; }
    /* 2026-10-15: leads the old AI made, until each is filled from its calls */
    const top = (window.LeadRecorder && LB.filter === 'All' ? LeadRecorder.html() : '') + (window.CallLead && LB.filter === 'All' ? CallLead.oldAiHtml() : '');
    if(LB.sort === 'imp'){
      const list = shown.slice().sort(impSort);
      box.innerHTML = top + bar + '<div class="card lb-group"><div class="lb-group-head" style="background:var(--bg);"><span class="lb-group-title" style="color:var(--navy);">Most important first</span><span class="field-note">' + list.length + ' · a new family nobody has tried and a family waiting on our answer stay on top; then how ready they sound, then what they are worth a month. Click a line for the details.</span></div>'
        + (list.length ? HEAD + list.map(x => compactHtml(x.r, x.l, x.v)).join('') : '<div class="lb-empty">Nobody here.</div>') + '</div>';
    } else box.innerHTML = top + bar + order.map(k => groupHtml(k, by[k], today)).join('');
    if(!box.__lbc){ box.__lbc = true;
      box.addEventListener('click', e => { if(e.target.closest('button, a, input, select, [data-no-open], [data-open-lead]')) return; const row = e.target.closest('[data-lbc]'); if(row){ e.stopPropagation(); lbToggle(row.dataset.lbc); } }, true);
      box.addEventListener('keydown', e => { if(e.key !== 'Enter' || !e.target.matches('[data-lbc]')) return; lbToggle(e.target.dataset.lbc); }); }
  }
  function lbIn(x, f){
    if(LB.owner && first(x.r.owner) !== LB.owner) return false;
    if(f === 'All') return true; if(f === 'now' || f === 'later' || f === 'waiting') return x.r.group === f;
    if(f === 'missing') return x.r.chips.some(c => c.tone === 'missing');
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
  function lbFollowUp(id, btn, suggest){
    const l = lead(id); if(!l || typeof ccPopOpen !== 'function') return;
    const R = window.LeadRules, today = R.ymd(new Date());
    let sg = null; try{ sg = typeof suggest === 'string' ? JSON.parse(suggest) : (suggest || null); }catch(e){}
    const el = ccPopOpen(btn || document.body,
      '<div style="font-size:13.5px;font-weight:700;margin-bottom:6px;">When do we follow up with ' + esc((l.first_name || '').trim() || 'them') + '?</div>'
      + '<div style="display:flex;gap:6px;"><input id="lbFuDate" type="date" value="' + esc(sg && sg.day ? sg.day : String(l.follow_up_due || '').slice(0, 10) >= today ? String(l.follow_up_due).slice(0, 10) : R.addDays(today, 1)) + '" style="flex:1;font-size:13px;padding:6px;"><input id="lbFuTime" type="time" value="' + esc(sg ? (sg.time || '') : (l.follow_up_time || '')) + '" style="width:110px;font-size:13px;padding:6px;"></div>'
      + (sg ? '<div class="field-note" style="margin-top:6px;">Suggested from the usual cadence (today, later today, Day 1, Day 3, Day 7). Change it if you know better; nothing is sent to the family.</div>' : '')
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
      + row('Open their profile', 'open') + row('Edit the inquiry (start, schedule, waiting on…)', 'edit') + row('Schedule the assessment', 'schedule') + row('Set a follow-up', 'followup') + (window.FutureOpps ? row('Save for future…', 'future') : '') + (window.LeadRecorder && LeadRecorder.isLive() ? row('Log a call from another phone', 'log') : '') + (l.said_yes_at ? '' : row('They said yes', 'yes')) + row('Mark lost…', 'lost') + (typeof leadFromWebForm === 'function' && leadFromWebForm(l) ? row('Not a real inquiry (spam)', 'spam') : ''), { width:300 });
    el.querySelectorAll('.ccpick-row').forEach(r => { r.onmouseenter = () => r.style.background = 'var(--bg)'; r.onmouseleave = () => r.style.background = '';
      r.onclick = () => { const fn = r.dataset.fn; ccPopClose();
        if(fn === 'open') lbOpen(id); else if(fn === 'edit' && typeof openLeadModal === 'function') openLeadModal(id); else if(fn === 'schedule') lbSchedule(id); else if(fn === 'followup') lbFollowUp(id, btn); else if(fn === 'log') lbLog(id, btn); else if(fn === 'future') FutureOpps.save(id);
        else if(fn === 'yes') lbYes(id, btn); else if(fn === 'lost') lbLost(id); else if(fn === 'spam' && typeof lpMarkSpam === 'function') lpMarkSpam(id, btn); };
    });
  }
  async function lbLost(id){
    const l = lead(id); if(!l) return;
    const r = (typeof askLostReason === 'function') ? await askLostReason(l) : null; if(!r) return;
    Object.assign(l, r); window.LeadRules.setStatus(l, 'Lost', { by:(typeof ccActor === 'function' ? ccActor().email : ''), why:r.lost_reason });
    await persist('leads', l); if(typeof opsReconcileLeads === 'function'){ try{ opsReconcileLeads(); }catch(e){} } redraw();
    if(typeof ccToast === 'function') ccToast('Marked lost: ' + r.lost_reason);
  }
  /* 2026-10-15: a Medicaid family: change the payer on their Payer tab, or close it as sent to Caring CDS */
  function lbPayer(id){ if(typeof openLeadProfile === 'function') openLeadProfile(id, 'payer'); }
  async function lbLostCds(id){
    const l = lead(id); if(!l) return;
    if(!(await ccConfirm('Mark ' + ((typeof cpLeadClientName === 'function' && cpLeadClientName(l)) || 'this family') + ' lost: referred to Caring CDS?'))) return;
    Object.assign(l, { lost_reason:'Referred to Caring CDS', lost_reason_key:'referred_cds' });
    window.LeadRules.setStatus(l, 'Lost', { by:(typeof ccActor === 'function' ? ccActor().email : ''), why:'Referred to Caring CDS' });
    await persist('leads', l); if(typeof opsReconcileLeads === 'function'){ try{ opsReconcileLeads(); }catch(e){} } redraw();
    if(typeof ccToast === 'function') ccToast('Marked lost: referred to Caring CDS');
  }
  /* item 5: the Waiting on… pop-up (the workspace's), pointed at this row's family */
  function lbWaiting(id, btn){ const l = lead(id); if(!l) return; if(window.LeadWorkspace && LeadWorkspace.waitingFor) LeadWorkspace.waitingFor(l, btn, redraw); }
  /* item 5: the 45-day Medicaid rules: the case manager was called (7-day quiet on the row); private bridge hours were offered */
  async function lbCaseManager(id){
    const l = lead(id); if(!l) return; const now = new Date().toISOString(), a = (typeof ccActor === 'function') ? ccActor() : { email:'', name:'' };
    l.case_manager_called_at = now; l.comm_log = Array.isArray(l.comm_log) ? l.comm_log : []; l.comm_log.push({ body:'Called the case manager about the Medicaid authorization', at:now, by:a.email, kind:'case_manager' });
    if(typeof ldPush === 'function') ldPush(l, { channel:'call', direction:'out', outcome:'connected', actor:'human', by:a.email, note:'the case manager, about the authorization', ref:'case_manager' });
    await persist('leads', l); if(typeof opsReconcileLeads === 'function'){ try{ opsReconcileLeads(); }catch(e){} } redraw(); if(typeof ccToast === 'function') ccToast('Noted: the case manager was called.');
  }
  async function lbBridge(id){
    const l = lead(id); if(!l) return; const now = new Date().toISOString(), a = (typeof ccActor === 'function') ? ccActor() : { email:'', name:'' };
    if(!(await ccConfirm('Record that ' + ((l.first_name || 'the family')) + ' was offered private-pay bridge hours while the state decides? (Nothing is sent; this is what you told them.)'))) return;
    l.bridge_hours_offered_at = now; l.comm_log = Array.isArray(l.comm_log) ? l.comm_log : []; l.comm_log.push({ body:'Offered private bridge hours while the state decides', at:now, by:a.email, kind:'bridge' });
    await persist('leads', l); redraw(); if(typeof ccToast === 'function') ccToast('Noted: bridge hours offered.');
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
  Object.assign(window, { lbSort, lbToggle, LeadsBoard:{ render, state:LB, ctxFor, valueOf }, lbText, lbOpen, lbOpenAsmt, lbSchedule, lbLog, lbFollowUp, lbMore, lbLost, lbYes, lbDsds, lbDraft, lbFilter, lbOwner, lbGettingReady, lbWaiting, lbBridge, lbCaseManager, lbPayer, lbLostCds });
})();
