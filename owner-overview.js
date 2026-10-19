/* =====================================================================================================================
   OWNER OVERVIEW (audit step 9, Samantha 2026-10-18; built from the Owner Overview plan approved 2026-10-17, section 4).
   One screen for Samantha and Zachary, phone first, read in under a minute: exceptions only, every row shows its owner.
     · the status line and who is on duty now (empty seats in red), who is out today, and "since you last looked"
     · Your decisions: questions asked of you (Escalate for decision), write-ups to approve, Approve to Work, new-client
       admission decisions, bonuses to approve, management reviews that are unresolved, post-call drafts, SOP drafts
     · Urgent escalations: care at risk right now (the critical cards), with who owns it and how far it has climbed
     · Team support: asks for help, and who is helping
     · By person: open and late work, out today
     · Overdue or at risk: the five most pressing late items, grouped by owner on "See all"
     · How the agency is doing, the last 7 days, including "times work reached you"
   It READS what the Hub already has and opens the screen where each thing is done. It never changes an owner, never
   marks anything seen or done, and never contacts anyone. Owners only, behind ops_settings.owner_overview_live.
   Helping from here (plan step 4, Samantha 2026-10-18 "start"): on care at risk, team support and overdue rows that are
   not yours: Help with this (you are added as a helper; it stays theirs), then My part is done or This is finished;
   Make this mine is a separate step with a reason. These are the same team actions My Work uses (team-actions.js).
   How the agency is doing (plan step 5): seven numbers for the last 7 days against the 7 before.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const lc = v => String(v == null ? '' : v).trim().toLowerCase();
  const D = () => (typeof DATA !== 'undefined' ? DATA : {});
  const S = () => D().ops_settings || {};
  const me = () => lc((typeof ccActor === 'function' && (ccActor() || {}).email) || (typeof ME !== 'undefined' && ME.email) || '');
  const nameOf = e => { try{ return (typeof opsOwnerName === 'function' && opsOwnerName(e)) || e || 'nobody'; }catch(_){ return e || 'nobody'; } };
  const first = n => String(n || '').trim().split(/\s+/)[0] || '';
  const ago = iso => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); if(!(m >= 0)) return ''; return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; };
  const today = () => new Date().toLocaleDateString('en-CA', { timeZone:'America/Chicago' });
  const LAST = 'ov_last_look';
  const ST = { async:{}, loading:false };
  function on(){ return S().owner_overview_live === true; }
  function allowed(){ return on() && typeof ccIsOwner === 'function' && ccIsOwner(); }
  /* the Today pill shows only for owners while it is on */
  function pillSync(){ const p = document.querySelector('.fpill[data-tab="owneroverview"]'); if(p) p.style.display = allowed() ? '' : 'none'; }
  function open_(){ try{ return (DATA.ops_items || []).filter(i => i && i.status === 'open' && (typeof opsCanSee !== 'function' || opsCanSee(i))); }catch(_){ return []; } }
  const css = () => { if(document.getElementById('ovCss')) return; const s = document.createElement('style'); s.id = 'ovCss';
    s.textContent = '.ov{max-width:1080px}.ov-top{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:baseline;justify-content:space-between;margin-bottom:10px}'
      + '.ov-top h2{margin:0;color:var(--navy);font-size:22px}.ov-status{display:inline-flex;gap:8px;align-items:center;font-weight:700;font-size:13px;padding:4px 12px;border-radius:99px}'
      + '.ov-ok{background:#E7F6EC;color:#1F7A4D}.ov-warn{background:#FDF3E3;color:#A8660E}.ov-bad{background:#FDE8E8;color:#B23B2E}'
      + '.ov-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}.ov-chip{background:#fff;border:1px solid var(--border);border-radius:99px;padding:3px 11px;font-size:12.5px}.ov-chip b{color:var(--navy)}.ov-chip.gap{border-color:#B23B2E;color:#B23B2E}'
      + '.ov-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}.ov-box{background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px;min-width:0}'
      + '.ov-box h4{margin:0 0 8px;font-size:11.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-muted);display:flex;justify-content:space-between;gap:8px}.ov-box h4 .n{color:var(--navy);font-size:14px;letter-spacing:0}'
      + '.ov-it{padding:8px 0;border-top:1px solid var(--border)}.ov-it:first-of-type{border-top:0;padding-top:0}.ov-it .t{font-weight:600;font-size:13.5px}.ov-it .m{font-size:12px;color:var(--text-muted)}'
      + '.ov-it button{margin-top:5px;padding:4px 10px;font-size:12px}.ov-red{color:#B23B2E;font-weight:700}.ov-none{font-size:12.5px;color:var(--text-muted)}'
      + '.ov-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}.ov-stat .v{font-size:22px;color:var(--navy);font-weight:700}.ov-stat .l{font-size:12px;color:var(--text-muted)}';
    document.head.appendChild(s); };
  const B = (fn, label, primary) => '<button class="' + (primary ? 'primary' : 'ghost') + '" onclick="' + fn + '">' + label + '</button>';
  const item = (t, m, btn) => '<div class="ov-it"><div class="t">' + t + '</div>' + (m ? '<div class="m">' + m + '</div>' : '') + (btn || '') + '</div>';
  const box = (title, n, body, full) => '<div class="ov-box"' + (full ? ' style="grid-column:1/-1"' : '') + '><h4>' + esc(title) + (n != null ? ' <span class="n">' + esc(n) + '</span>' : '') + '</h4>' + body + '</div>';
  /* the team actions on a row that is not yours (team-actions.js); anchors are the row's own buttons */
  function acts(i, m){
    if(!window.TA || !i || lc(i.owner) === m) return B("OV.card('" + esc(i.id) + "')", 'Open');
    const id = esc(i.id), a = 'ovA_' + id;
    if(lc(i.help_from) === m) return '<div class="m" style="margin-top:4px;">You are helping · still ' + esc(first(nameOf(i.owner))) + '’s</div>'
      + B("OV.part('" + id + "','" + a + "p')", 'My part is done', true).replace('<button', '<button id="' + a + 'p"') + ' '
      + B("OV.finish('" + id + "','" + a + "f')", 'This is finished').replace('<button', '<button id="' + a + 'f"') + ' ' + B("OV.card('" + id + "')", 'Open');
    return B("OV.help('" + id + "')", 'Help with this', true) + ' ' + B("OV.card('" + id + "')", 'Open') + ' '
      + B("OV.mine('" + id + "','" + a + "t')", 'Make this mine').replace('<button', '<button id="' + a + 't"');
  }
  const safe = (f, fallback) => { try{ return f(); }catch(e){ console.warn('owner overview', e); return fallback; } };

  /* ── the parts read on the page ── */
  function duty(){
    const core = (typeof DUTY_CORE !== 'undefined' ? DUTY_CORE : ['operations', 'in_charge', 'staffing', 'owner_escalation']);
    const rows = safe(() => dutyNow().filter(x => core.indexOf(x.area) > -1), []);
    const out = (D().coordinator_staff || []).filter(s => s && String(s.out_until || '').slice(0, 10) >= today()).map(s => first(s.name || s.email));
    return { rows, out, gaps:rows.filter(r => r.gap) };
  }
  function decisions(m){
    const out = [];
    open_().forEach(i => { if(window.TA && TA.decisionFor(i, m)){ const d = i.decision || {};
      out.push(item(esc(d.question || i.title || 'A question for you'), 'From ' + esc(d.asked_by_name || nameOf(d.asked_by)) + ' · owner ' + esc(nameOf(i.owner)) + (d.recommend ? ' · recommends ' + esc(d.recommend) : '') + (d.asked_at ? ' · asked ' + esc(ago(d.asked_at)) : ''),
        B("OV.card('" + esc(i.id) + "')", 'Answer', true))); } });
    safe(() => (D().discipline_actions || []).filter(a => a && a.status === 'pending_approval' && typeof discCanApprove === 'function' && discCanApprove(a).ok).forEach(a =>
      out.push(item('Write-up to approve: ' + esc(a.level || 'write-up') + ' for ' + esc(a.caregiver || 'a caregiver'), (a.sent_for_approval_at ? 'Sent ' + esc(ago(a.sent_for_approval_at)) : ''), B("OV.go('hr')", 'Open', true)))), null);
    const pc = safe(() => (D().post_call_followups || []).filter(f => f && f.status === 'pending_approval').length, 0);
    if(pc) out.push(item(pc + ' post-call message' + (pc === 1 ? '' : 's') + ' waiting for approval', 'Drafts to families after a call', B('OV.postCall()', 'Open')));
    const sop = safe(() => (D().sop_library || []).filter(s => s && s.status === 'draft').length, 0);
    if(sop) out.push(item(sop + ' SOP draft' + (sop === 1 ? '' : 's') + ' not published', '', B("OV.go('sops')", 'Open')));
    const a = ST.async;
    if(a.atw) a.atw.forEach(r => out.push(item('Approve to Work: ' + esc(r.name || r.caregiver_name || r.caregiver || 'a new caregiver'), r.axiscare === 'failed' ? '<span class="ov-red">approved, AxisCare update failed</span>' : 'every requirement complete', B("OV.atw('" + esc(r.offer_id || '') + "')", 'Open', true))));
    if(a.adm) a.adm.forEach(c => out.push(item('New client needs your decision: ' + esc(c.axiscare_name || 'a client'), esc(c.observed_label || '') + (c.observed_at ? ' · ' + esc(ago(c.observed_at)) : ''), B("OV.go('clientqueue')", 'Open', true))));
    if(a.bonus && a.bonus.length) out.push(item(a.bonus.length + ' bonus' + (a.bonus.length === 1 ? '' : 'es') + ' waiting on a decision', a.bonus.map(l => esc(first(l.recipient)) + ' (' + esc(l.client) + ', ' + esc(l.status_words || l.status) + ')').join(' · '), B('OV.bonus()', 'Open', true)));
    if(a.reviews && a.reviews.length) out.push(item(a.reviews.length + ' management review' + (a.reviews.length === 1 ? '' : 's') + ' unresolved', a.reviews.map(r => esc(r.person) + ' (' + esc(r.status) + ')').join(' · '), B('OV.team()', 'Open', true)));
    const errs = Object.keys(a.err || {}).filter(k => k !== 'iv');   /* interviews belong to the numbers, which say so themselves */
    if(errs.length) out.push('<div class="ov-it m ov-red">Could not check: ' + esc(errs.map(k => a.err[k]).join('; ')) + '. Open those screens directly.</div>');
    return out;
  }
  function urgent(m){
    return open_().filter(i => window.TA && TA.critical(i)).map(i => { const e = i.escalation || {};
      return item('<span class="ov-red">●</span> ' + esc(i.title || i.about || 'Care at risk'), 'If someone is in danger, call 911 now. · Owner ' + esc(nameOf(i.owner)) + (i.claimed_by ? ' · ' + esc(i.claimed_by_name || nameOf(i.claimed_by)) + ' is on it' : '') + (e.to && !e.cleared_at ? ' · reached ' + esc(nameOf(e.to)) + (e.at ? ' ' + esc(ago(e.at)) : '') : '') + (lc(e.to) === m && !e.cleared_at ? ' · <span class="ov-red">waiting on you</span>' : ''),
        acts(i, m)); });
  }
  function support(m){
    return open_().filter(i => i.help_asked_at).map(i => item(esc(i.title || i.about || 'A task'), esc(nameOf(i.owner)) + ' owns · ' + (i.help_from ? esc(lc(i.help_from) === m ? 'you are' : nameOf(i.help_from) + ' is') + ' helping' : '<span class="ov-red">asked the team ' + esc(ago(i.help_asked_at)) + ', nobody yet</span>'), acts(i, m)));
  }
  function people(){
    const its = open_(), out = duty().out.map(lc);
    return (D().coordinator_staff || []).filter(s => s && s.email).map(s => { const e = lc(s.email), mine = its.filter(i => lc(i.owner) === e).length, late = safe(() => opsLateFor(e).length, 0), o = out.indexOf(lc(first(s.name || s.email))) > -1;
      return { name:s.name || s.email, mine, late, o }; }).filter(p => p.mine || p.late || p.o)
      .map(p => '<div class="ov-it" style="display:flex;justify-content:space-between;gap:8px"><div><b>' + esc(p.name) + '</b><div class="m">' + p.mine + ' open, ' + (p.late ? '<span class="ov-red">' + p.late + ' late</span>' : '0 late') + (p.o ? ' · out today' : '') + '</div></div>'
        + '<span class="ov-status ' + (p.o ? 'ov-warn' : p.late >= 5 ? 'ov-bad' : p.late ? 'ov-warn' : 'ov-ok') + '">' + (p.o ? 'Out' : p.late >= 5 ? 'Behind' : p.late ? 'Some late' : 'On track') + '</span></div>');
  }
  function overdue(all, m){
    const late = safe(() => opsOverdue().filter(i => !(typeof opsParked === 'function' && opsParked(i))), []);
    const key = i => safe(() => opsPriorityKey(i), 9);
    late.sort((a, b) => (key(a) - key(b)) || String(a.due).localeCompare(String(b.due)));
    const row = i => item(esc(i.title || i.about || 'A task'), 'Owner ' + esc(nameOf(i.owner)) + ' · due ' + esc(ago(i.due)) + (i.help_from && lc(i.help_from) !== m ? ' · ' + esc(first(nameOf(i.help_from))) + ' helping' : ''), acts(i, m));
    if(!all) return { n:late.length, html:late.slice(0, 5).map(row) };
    const by = {}; late.forEach(i => { const o = nameOf(i.owner) || 'Nobody'; (by[o] = by[o] || []).push(i); });
    return { n:late.length, html:Object.keys(by).sort().map(o => '<div class="ov-it"><b>' + esc(o) + ' (' + by[o].length + ')</b></div>' + by[o].map(row).join('')) };
  }
  /* HOW THE AGENCY IS DOING (plan step 5, Samantha 2026-10-18): the last 7 days against the 7 before, each with which
     way is better. Visits are AxisCare's, so coverage is call-offs covered (the Hub's own record), and it says so. */
  function weekOf(m, from, to){
    const inW = iso => { const t = iso ? Date.parse(iso) : NaN; return t >= from && t < to; };
    const leads = (D().leads || []).filter(l => l && !(l.spam && l.spam.at));
    const fresh = leads.filter(l => inW(l.created_at));
    const hours = safe(() => LeadRules.responseHours(S()), null);
    const mins = fresh.filter(l => l.first_human_attempt_at).map(l => safe(() => Math.max(0, Math.round((Date.parse(l.first_human_attempt_at) - Date.parse(LeadRules.clockStart(l, hours))) / 60000)), null)).filter(x => x != null).sort((a, b) => a - b);
    const cov = (D().coverage_cases || []).filter(c => c && c.resolved_at && inW(c.resolved_at) && !['open', 'flagged'].includes(c.status) && !c.interest);
    const endOf = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d)) ? Date.parse(d + 'T23:59:59-05:00') : Date.parse(d);
    const closed = (D().ops_items || []).filter(i => i && i.status === 'done' && i.due && inW(i.closed_at) && i.closed_by !== 'system');
    const iv = (ST.async.iv || []).filter(b => inW(b.outcome_at)), hired = (ST.async.hires || []).filter(a => inW(a.hired_at));
    return {
      covered: cov.length ? Math.round(100 * cov.filter(c => c.resolved_how === 'covered').length / cov.length) : null, cov_n: cov.length,
      ontime: closed.length ? Math.round(100 * closed.filter(i => Date.parse(i.closed_at) <= endOf(i.due)).length / closed.length) : null, closed_n: closed.length,
      first: mins.length ? (mins.length % 2 ? mins[(mins.length - 1) / 2] : Math.round((mins[mins.length / 2 - 1] + mins[mins.length / 2]) / 2)) : null, new_n: fresh.length,
      clockins: (D().timekeeper_cases || []).filter(t => t && t.kind !== 'clock_out' && inW(t.created_at || (t.shift_date ? t.shift_date + 'T12:00:00Z' : ''))).length,
      starts: leads.filter(l => inW(l.first_shift_at)).length,
      interviews: ST.async.iv ? iv.length : null, hires: ST.async.hires ? hired.length : null,
      reached: (D().ops_items || []).filter(i => i && ((i.escalation && lc(i.escalation.to) === m && inW(i.escalation.at)) || (i.decision && lc(i.decision.to) === m && inW(i.decision.asked_at)))).length
    };
  }
  function numbers(m){
    const now = Date.now(), W = 7 * 864e5, a = weekOf(m, now - W, now + 1), b = weekOf(m, now - 2 * W, now - W);
    /* the change against last week, coloured by which way is better (up = better, or down = better) */
    const chg = (x, y, upGood, unit) => { if(x == null || y == null) return '<div class="d">no week before to compare</div>'; const d = x - y;
      if(!d) return '<div class="d">same as last week</div>'; const good = upGood ? d > 0 : d < 0;
      return '<div class="d" style="color:' + (good ? '#1F7A4D' : '#B23B2E') + ';font-weight:700;">' + (d > 0 ? '+' : '') + d + (unit || '') + ' vs last week</div>'; };
    const st = (v, l, d) => '<div class="ov-stat"><div class="v">' + esc(v) + '</div><div class="l">' + esc(l) + '</div>' + d + '</div>';
    const pct = x => x == null ? 'none' : x + '%';
    const err = ST.async.err || {};
    return '<div class="ov-stats">'
      + st(pct(a.covered), 'call-offs covered (' + a.cov_n + ')', chg(a.covered, b.covered, true, ' pts'))
      + st(pct(a.ontime), 'work closed on time (' + a.closed_n + ' closed)', chg(a.ontime, b.ontime, true, ' pts'))
      + st(a.first == null ? 'no calls' : a.first + ' min', 'median first call to a new lead (' + a.new_n + ' new)', chg(a.first, b.first, false, ' min'))
      + st(a.clockins, 'missed clock-ins', chg(a.clockins, b.clockins, false))
      + st(a.starts, 'clients started', chg(a.starts, b.starts, true))
      + st(a.interviews == null ? (err.iv ? 'could not read' : '…') : a.interviews + ' → ' + a.hires, 'interviews to hires', a.interviews == null ? '' : chg(a.hires, b.hires, true, ' hires'))
      + st(a.reached, 'times work reached you', chg(a.reached, b.reached, false)) + '</div>'
      + '<div class="field-note" style="margin-top:6px;">Last 7 days against the 7 before. Visits live in AxisCare, so coverage here is call-offs the team covered. Green is better, red is worse.</div>';
  }

  /* ── the parts that come from the server (each says so if it could not be read) ── */
  async function loadAsync(){
    if(ST.loading) return; ST.loading = true; const a = { err:{} };
    const tasks = [];
    if(window.Bonus && typeof Bonus.call === 'function') tasks.push(Bonus.call({ action:'list' }).then(d => { if(d.error) a.err.bonus = 'bonuses (' + d.error + ')'; else a.bonus = (d.lines || []).filter(l => l.status === 'ready' || l.status === 'under_review'); }).catch(() => { a.err.bonus = 'bonuses'; }));
    if(window.CcTeam && typeof CcTeam.call === 'function') tasks.push(CcTeam.call({ action:'list' }).then(d => { if(d.error) a.err.team = 'management reviews (' + d.error + ')'; else a.reviews = (d.reviews || []).filter(r => ['open', 'coaching'].includes(r.status)); }).catch(() => { a.err.team = 'management reviews'; }));
    if(window.CRX && typeof CRX.call === 'function') tasks.push(CRX.call({ action:'list' }).then(d => { if(d && d.error) a.err.atw = 'Approve to Work (' + d.error + ')'; else a.atw = (d.rows || []).filter(r => (r.ready_for_final && !r.approved_to_work) || (r.approved_to_work && r.axiscare === 'failed')); }).catch(() => { a.err.atw = 'Approve to Work'; }));
    const since = new Date(Date.now() - 14 * 864e5).toISOString();
    if(typeof sb !== 'undefined' && sb && sb.from){
      const q = f => { try{ return Promise.resolve(f()); }catch(e){ return Promise.reject(e); } };
      tasks.push(q(() => sb.from('interview_bookings').select('outcome_at,status').gte('outcome_at', since)).then(r => { if(r.error) a.err.iv = 'interviews'; else a.iv = (r.data || []).filter(x => x.status === 'attended'); }).catch(() => { a.err.iv = 'interviews'; }));
      tasks.push(q(() => sb.from('job_applicants').select('hired_at').gte('hired_at', since)).then(r => { if(r.error) a.err.iv = 'hires'; else a.hires = r.data || []; }).catch(() => { a.err.iv = 'hires'; }));
    }
    if(typeof sb !== 'undefined' && sb && sb.from) tasks.push(Promise.resolve(sb.from('client_admission_case').select('case_id,axiscare_name,observed_label,observed_at,needs_owner_decision').eq('status', 'open')).then(r => { if(r.error) a.err.adm = 'new-client decisions'; else a.adm = (r.data || []).filter(c => c.needs_owner_decision); }).catch(() => { a.err.adm = 'new-client decisions'; }));
    await Promise.all(tasks); ST.async = a; ST.loading = false; draw();
  }

  /* ── the screen ── */
  function draw(all){
    const w = document.getElementById('ovWrap'); if(!w) return; css();
    if(!allowed()){ w.innerHTML = '<p class="field-note">The Owner Overview is for Samantha and Zachary, once it is turned on (Settings > Owner Overview).</p>'; return; }
    const m = me(), du = duty(), dec = decisions(m), urg = urgent(m), sup = support(m), od = overdue(all, m), ppl = people();
    const last = ST.last;   /* read once when the page loaded, so a redraw never resets "since you looked" */
    const closed = last ? (D().ops_items || []).filter(i => i && i.closed_at && i.closed_at > last).length : 0, made = last ? (D().ops_items || []).filter(i => i && i.created_at && i.created_at > last).length : 0;
    const asks = dec.filter(x => x.indexOf('ov-it m ov-red') < 0).length + urg.filter(x => /waiting on you/.test(x)).length;
    const covered = !du.gaps.length && !urg.length;
    const h = new Date().getHours(), hello = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    let html = '<div class="ov"><div class="ov-top"><h2>' + hello + ', ' + esc(first((typeof ccActor === 'function' && (ccActor() || {}).name) || '')) + '</h2>'
      + '<span class="ov-status ' + (urg.length ? 'ov-bad' : covered ? 'ov-ok' : 'ov-warn') + '">' + (urg.length ? urg.length + ' care at risk' : covered ? 'Springfield is covered' : 'An empty seat') + ' · ' + asks + ' thing' + (asks === 1 ? '' : 's') + ' for you</span></div>';
    html += '<div class="ov-chips">' + du.rows.map(r => '<span class="ov-chip' + (r.gap ? ' gap' : '') + '">' + esc(r.label) + ': ' + (r.gap ? 'nobody' : '<b>' + esc(first(nameOf(r.holder.person))) + '</b>') + '</span>').join('')
      + (du.out.length ? '<span class="ov-chip">Out today: <b>' + esc(du.out.join(', ')) + '</b></span>' : '')
      + (last ? '<span class="ov-chip">Since you looked ' + esc(ago(last)) + ': <b>' + closed + ' closed</b>, ' + made + ' new</span>' : '') + '</div>';
    html += '<div class="ov-grid">'
      + box('Your decisions', dec.filter(x => x.indexOf('ov-it m ov-red') < 0).length, (dec.length ? dec.join('') : '<div class="ov-none">Nothing is waiting on your yes.</div>') + (ST.loading ? '<div class="ov-none">Checking bonuses, reviews, Approve to Work…</div>' : ''))
      + box('Urgent escalations', urg.length, urg.length ? urg.join('') : '<div class="ov-none">Nothing critical. Care is not at risk anywhere right now.</div>')
      + box('Team support', sup.length, sup.length ? sup.join('') : '<div class="ov-none">Nobody has asked the team for help.</div>')
      + box('By person', null, ppl.length ? ppl.join('') : '<div class="ov-none">No open work.</div>')
      + box('Overdue or at risk', od.n, (od.html.length ? od.html.join('') : '<div class="ov-none">Nothing is late.</div>') + (od.n > 5 && !all ? '<div class="ov-it">' + B('OV.all()', 'See all ' + od.n + ', grouped by owner') + '</div>' : ''))
      + box('How the agency is doing', 'this week', numbers(m), true) + '</div>'
      + '<p class="field-note" style="margin-top:10px;">Exceptions only. Looking here never changes an owner or marks anything done; Open takes you to where it is handled.</p></div>';
    w.innerHTML = html;
  }
  function render(){
    if(!ST.lastRead){ ST.lastRead = true; try{ ST.last = localStorage.getItem(LAST); }catch(_){ ST.last = null; } }
    pillSync(); draw();
    if(allowed()){ loadAsync(); try{ localStorage.setItem(LAST, new Date().toISOString()); }catch(_){} }
  }
  /* ── where each row is handled ── */
  function go(tab){ if(typeof switchTab === 'function') switchTab(tab); }
  function card(id){
    go('mywork');
    setTimeout(() => { const el = document.querySelector('[data-id="' + String(id).replace(/"/g, '') + '"]');
      if(el){ el.scrollIntoView({ behavior:'smooth', block:'center' }); el.style.outline = '3px solid #F0A63A'; setTimeout(() => { el.style.outline = ''; }, 2500); }
      else if(typeof ccToast === 'function') ccToast('It is on My Work under Escalated to you or Team work.'); }, 350);
  }
  function postCall(){ try{ LS.view = 'followups'; activeLeadsSubtab = 'followups'; }catch(_){} go('leadsstarts'); try{ lsShowView(); }catch(_){} }
  function atw(offerId){ if(offerId && window.CRX && typeof CRX.open === 'function') CRX.open(offerId); else go('cgorient'); }
  /* helping: the team actions, then this screen redraws (the popups finish on their own, so wait for them to close) */
  let showAll = false;
  const redraw = () => { try{ draw(showAll); }catch(e){} };
  const afterPop = () => { const t = setInterval(() => { if(!document.querySelector('.ccpop')){ clearInterval(t); redraw(); } }, 300); setTimeout(() => clearInterval(t), 600000); };
  async function help(id){ if(!window.TA) return; await TA.helpWith(id); redraw(); }
  function part(id, anchor){ if(!window.TA) return; TA.partDone(id, anchor); afterPop(); }
  function finish(id, anchor){ if(!window.TA) return; TA.finish(id, anchor); afterPop(); }
  function mine(id, anchor){ if(!window.TA) return; TA.transfer(id, anchor); afterPop(); }
  window.OV = { render, draw, pillSync, go, card, postCall, atw, help, part, finish, mine, bonus:() => { if(typeof bnOpen === 'function') bnOpen(); }, team:() => { if(typeof cctOpen === 'function') cctOpen(); }, all:() => { showAll = true; draw(true); }, allowed };
})();
