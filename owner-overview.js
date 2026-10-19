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
   Not yet (later plan steps): Help with this from here (step 4), and the full weekly numbers (step 5).
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
    const errs = Object.keys(a.err || {});
    if(errs.length) out.push('<div class="ov-it m ov-red">Could not check: ' + esc(errs.map(k => a.err[k]).join('; ')) + '. Open those screens directly.</div>');
    return out;
  }
  function urgent(m){
    return open_().filter(i => window.TA && TA.critical(i)).map(i => { const e = i.escalation || {};
      return item('<span class="ov-red">●</span> ' + esc(i.title || i.about || 'Care at risk'), 'Owner ' + esc(nameOf(i.owner)) + (i.claimed_by ? ' · ' + esc(i.claimed_by_name || nameOf(i.claimed_by)) + ' is on it' : '') + (e.to && !e.cleared_at ? ' · reached ' + esc(nameOf(e.to)) + (e.at ? ' ' + esc(ago(e.at)) : '') : '') + (lc(e.to) === m && !e.cleared_at ? ' · <span class="ov-red">waiting on you</span>' : ''),
        B("OV.card('" + esc(i.id) + "')", 'Open', true)); });
  }
  function support(){
    return open_().filter(i => i.help_asked_at).map(i => item(esc(i.title || i.about || 'A task'), esc(nameOf(i.owner)) + ' owns · ' + (i.help_from ? esc(nameOf(i.help_from)) + ' helping' : '<span class="ov-red">asked the team ' + esc(ago(i.help_asked_at)) + ', nobody yet</span>'), B("OV.card('" + esc(i.id) + "')", 'Open')));
  }
  function people(){
    const its = open_(), out = duty().out.map(lc);
    return (D().coordinator_staff || []).filter(s => s && s.email).map(s => { const e = lc(s.email), mine = its.filter(i => lc(i.owner) === e).length, late = safe(() => opsLateFor(e).length, 0), o = out.indexOf(lc(first(s.name || s.email))) > -1;
      return { name:s.name || s.email, mine, late, o }; }).filter(p => p.mine || p.late || p.o)
      .map(p => '<div class="ov-it" style="display:flex;justify-content:space-between;gap:8px"><div><b>' + esc(p.name) + '</b><div class="m">' + p.mine + ' open, ' + (p.late ? '<span class="ov-red">' + p.late + ' late</span>' : '0 late') + (p.o ? ' · out today' : '') + '</div></div>'
        + '<span class="ov-status ' + (p.o ? 'ov-warn' : p.late >= 5 ? 'ov-bad' : p.late ? 'ov-warn' : 'ov-ok') + '">' + (p.o ? 'Out' : p.late >= 5 ? 'Behind' : p.late ? 'Some late' : 'On track') + '</span></div>');
  }
  function overdue(all){
    const late = safe(() => opsOverdue().filter(i => !(typeof opsParked === 'function' && opsParked(i))), []);
    const key = i => safe(() => opsPriorityKey(i), 9);
    late.sort((a, b) => (key(a) - key(b)) || String(a.due).localeCompare(String(b.due)));
    const row = i => item(esc(i.title || i.about || 'A task'), 'Owner ' + esc(nameOf(i.owner)) + ' · due ' + esc(ago(i.due)), B("OV.card('" + esc(i.id) + "')", 'Open'));
    if(!all) return { n:late.length, html:late.slice(0, 5).map(row) };
    const by = {}; late.forEach(i => { const o = nameOf(i.owner) || 'Nobody'; (by[o] = by[o] || []).push(i); });
    return { n:late.length, html:Object.keys(by).sort().map(o => '<div class="ov-it"><b>' + esc(o) + ' (' + by[o].length + ')</b></div>' + by[o].map(row).join('')) };
  }
  function numbers(m){
    const from = Date.now() - 7 * 864e5, inWk = iso => iso && Date.parse(iso) >= from;
    const leads = (D().leads || []).filter(l => l && !(l.spam && l.spam.at));
    const fresh = leads.filter(l => inWk(l.created_at));
    const hours = safe(() => LeadRules.responseHours(S()), null);
    const mins = fresh.filter(l => l.first_human_attempt_at).map(l => safe(() => Math.max(0, Math.round((Date.parse(l.first_human_attempt_at) - Date.parse(LeadRules.clockStart(l, hours))) / 60000)), null)).filter(x => x != null).sort((a, b) => a - b);
    const med = mins.length ? mins[Math.floor((mins.length - 1) / 2)] : null;
    const cov = (D().coverage_cases || []).filter(c => c && c.resolved_at && inWk(c.resolved_at) && !['open', 'flagged'].includes(c.status) && !c.interest);
    const covered = cov.filter(c => c.resolved_how === 'covered').length;
    const clockins = (D().timekeeper_cases || []).filter(t => t && t.kind !== 'clock_out' && inWk(t.created_at || (t.shift_date ? t.shift_date + 'T12:00:00Z' : ''))).length;
    const starts = leads.filter(l => inWk(l.first_shift_at)).length;
    const reached = (D().ops_items || []).filter(i => i && ((i.escalation && lc(i.escalation.to) === m && inWk(i.escalation.at)) || (i.decision && lc(i.decision.to) === m && inWk(i.decision.asked_at)))).length;
    const st = (v, l) => '<div class="ov-stat"><div class="v">' + esc(v) + '</div><div class="l">' + esc(l) + '</div></div>';
    return '<div class="ov-stats">' + st(cov.length ? covered + ' of ' + cov.length : 'none', 'call-offs covered') + st(med == null ? 'no calls' : med + ' min', 'median first call to a new lead (' + fresh.length + ' new)')
      + st(clockins, 'missed clock-ins') + st(starts, 'clients started') + st(reached, 'times work reached you') + '</div>';
  }

  /* ── the parts that come from the server (each says so if it could not be read) ── */
  async function loadAsync(){
    if(ST.loading) return; ST.loading = true; const a = { err:{} };
    const tasks = [];
    if(window.Bonus && typeof Bonus.call === 'function') tasks.push(Bonus.call({ action:'list' }).then(d => { if(d.error) a.err.bonus = 'bonuses (' + d.error + ')'; else a.bonus = (d.lines || []).filter(l => l.status === 'ready' || l.status === 'under_review'); }).catch(() => { a.err.bonus = 'bonuses'; }));
    if(window.CcTeam && typeof CcTeam.call === 'function') tasks.push(CcTeam.call({ action:'list' }).then(d => { if(d.error) a.err.team = 'management reviews (' + d.error + ')'; else a.reviews = (d.reviews || []).filter(r => ['open', 'coaching'].includes(r.status)); }).catch(() => { a.err.team = 'management reviews'; }));
    if(window.CRX && typeof CRX.call === 'function') tasks.push(CRX.call({ action:'list' }).then(d => { if(d && d.error) a.err.atw = 'Approve to Work (' + d.error + ')'; else a.atw = (d.rows || []).filter(r => (r.ready_for_final && !r.approved_to_work) || (r.approved_to_work && r.axiscare === 'failed')); }).catch(() => { a.err.atw = 'Approve to Work'; }));
    if(typeof sb !== 'undefined' && sb && sb.from) tasks.push(Promise.resolve(sb.from('client_admission_case').select('case_id,axiscare_name,observed_label,observed_at,needs_owner_decision').eq('status', 'open')).then(r => { if(r.error) a.err.adm = 'new-client decisions'; else a.adm = (r.data || []).filter(c => c.needs_owner_decision); }).catch(() => { a.err.adm = 'new-client decisions'; }));
    await Promise.all(tasks); ST.async = a; ST.loading = false; draw();
  }

  /* ── the screen ── */
  function draw(all){
    const w = document.getElementById('ovWrap'); if(!w) return; css();
    if(!allowed()){ w.innerHTML = '<p class="field-note">The Owner Overview is for Samantha and Zachary, once it is turned on (Settings > Owner Overview).</p>'; return; }
    const m = me(), du = duty(), dec = decisions(m), urg = urgent(m), sup = support(), od = overdue(all), ppl = people();
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
      + box('How the agency is doing', 'last 7 days', numbers(m), true) + '</div>'
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
  window.OV = { render, draw, pillSync, go, card, postCall, atw, bonus:() => { if(typeof bnOpen === 'function') bnOpen(); }, team:() => { if(typeof cctOpen === 'function') cctOpen(); }, all:() => draw(true), allowed };
})();
