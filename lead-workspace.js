/* =====================================================================================================================
   THE LEAD WORKSPACE (screen 2 of her Leads design, 2026-10-07; mockup https://claude.ai/artifact/Q4TtPPMhwWTNxUdJTWiyXA).
   The profile's Overview while a family has not said yes: the five steps with dates, ONE next card in the urgency colour
   with the one task, a script line for that moment and the outcome buttons, what we know (red only where the next stage
   needs it), everything that happened, and a right rail (coming up, contacts, can we staff it, everything else as links).
   Draws only what lead-rules.js decides (boardRow, steps, timeline, scriptFor, staffingLook): the board and this page
   can never disagree. Every button reuses what the Hub already has (the office line, the log-call pop-up, the follow-up
   pop-up, the booking, the one status writer, the yes). Nothing here contacts the family by itself: the text box sends
   only what a person typed, as that person. Once they say yes, the client journey card takes over and this steps aside.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
  const R = () => window.LeadRules;
  const TONE = { red:['#DC2626', '#B91C1C', 'Next · now'], amber:['#D97706', '#B45309', 'Next · now'], green:['#15803D', '#15803D', 'Next · now'], navy:['var(--navy)', 'var(--navy)', 'Next · scheduled'], muted:['#9A9388', '#6E6559', 'Waiting'] };
  const first = n => String(n || '').trim().split(/\s+/)[0] || '';
  const lead = () => (typeof CP !== 'undefined' && CP.lead) || null;
  const q = v => JSON.stringify(String(v)).replace(/"/g, '&quot;');

  /* the workspace speaks for a family from the inquiry until the yes (or while they are lost); after that the journey does */
  function active(){
    const l = lead(); if(!l || !R()) return false;
    if(typeof CP !== 'undefined' && CP.ax) return false;
    if(l.said_yes_at || String(l.status || '') === 'Converted' || l.soc) return false;
    return true;
  }
  function names(){ const o = {}; (typeof OPS_PEOPLE !== 'undefined' && OPS_PEOPLE || []).forEach(p => { if(p && p.primary_email) o[String(p.primary_email).toLowerCase()] = p.full_name || ''; }); return o; }
  function ctxFor(l){
    const st = (typeof ccLeadStage === 'function') ? ccLeadStage(l) : { k:'new' };
    const base = (window.LeadsBoard && LeadsBoard.ctxFor) ? LeadsBoard.ctxFor(l, st) : { hours:R().responseHours(DATA.ops_settings || {}), stage:'new', assessments:[] };
    const me = (typeof ccActor === 'function') ? ccActor() : { name:'' };
    return Object.assign(base, { now:new Date().toISOString(), today:R().ymd(new Date()), names:names(), me:me.name || '', scripts:(DATA.ops_settings || {}).lead_scripts || {}, st });
  }
  function people(){
    const byAx = {}; (DATA.caregivers || []).forEach(g => { if(g && g.axiscare_id) byAx[String(g.axiscare_id)] = g; });
    return (DATA.caregiver_availability || []).map(a => { const g = byAx[String(a.axiscare_id || '')]; return { name:a.name, town:(g && g.city) || '', windows:a.windows || {} }; });
  }
  /* the command box keeps only what the workspace doesn't say (learned from a call, open items); empty, it goes too */
  function trim(){
    const cmd = document.getElementById('cpCommand'); if(!cmd) return;
    const has = ['cpcLearned', 'cp_open_now'].some(id => { const e = document.getElementById(id); return e && e.innerText.trim(); });
    cmd.style.display = (active() && !has) ? 'none' : '';
  }
  function hide(ids, on){ ids.forEach(id => { const el = document.getElementById(id); if(el) el.style.display = on ? 'none' : ''; }); }

  /* ── drawing ── */
  function btn(l, a, primary){
    const k = a.kind, id = esc(l.id), cls = primary ? 'lb-btn lb-btn-primary' : 'lb-btn';
    if(k === 'call'){ if(!l.phone) return '<span class="lb-btn lb-btn-dim" title="No phone number on the inquiry">No phone</span>';
      return '<a class="' + cls + '" href="#" role="button" data-oc-phone="' + esc(l.phone) + '"' + (l.email ? ' data-oc-email="' + esc(l.email) + '"' : '') + ' title="Call from the office line">Call from the office line</a>'; }
    if(k === 'draft') return '<button class="' + cls + '" onclick="lbDraft(\'' + id + '\', \'' + esc(a.id) + '\')">' + esc(a.label) + '</button>';
    if(k === 'text') return '<button class="' + cls + '" onclick="lwText(this)">' + esc(a.label) + '</button>';
    const fn = { log:'lwLog', followup:'lwFollowUp', schedule:'lwSchedule', open_asmt:'lwOpenAsmt', open:'lwFollowUp', dsds:'lwDsds' }[k];
    return fn ? '<button class="' + cls + '" onclick="' + fn + '(this)">' + esc(k === 'open' ? 'Move the check-back' : a.label) + '</button>' : '';
  }
  function stepsHtml(st){
    const C = { done:['#E7F6EC', '#BFE6CC', '#1F7A4D', '✓ '], now:['#FDF3E3', '#F3DDB3', '#A8660E', '● '], todo:['#fff', 'var(--border)', '#8a7f70', ''] };
    return '<div class="lw-steps">' + st.map(s => { const c = C[s.state]; return '<div class="lw-step" style="background:' + c[0] + ';border:1px ' + (s.state === 'todo' ? 'dashed' : 'solid') + ' ' + c[1] + ';"><div class="lw-step-k" style="color:' + c[2] + ';">' + c[3] + esc(s.label) + '</div><div class="lw-step-w" style="color:' + c[2] + ';">' + esc(s.words) + '</div></div>'; }).join('') + '</div>';
  }
  function fact(label, value, miss, tab){
    const v = value ? esc(value) : (miss ? '<span class="lw-miss">' + esc(miss) + '</span>' : '<span class="field-note">not asked yet</span>');
    return '<div class="lw-fact"' + (tab ? ' role="button" tabindex="0" onclick="cpShowTab(\'' + tab + '\');window.scrollTo(0,0)"' : '') + '><div class="lw-fact-k">' + esc(label) + '</div><div class="lw-fact-v">' + v + '</div></div>';
  }
  function knowHtml(l, ctx, r){
    const RR = R(), miss = {}; RR.missing(l, ctx.stage).forEach(m => { miss[m.key] = m.short; });
    const client = !l.client_name_not_provided ? ((l.client_first_name || '') + ' ' + (l.client_last_name || '')).trim() : '';
    const age = (typeof cpxAge === 'function') ? cpxAge(l.client_dob) : null;
    const caller = ((l.first_name || '') + ' ' + (l.last_name || '')).trim();
    const pay = l.funding_source ? (ctx.payer_label || RR.PAYER_WORDS[l.funding_source] || l.funding_source) + (l.price_quoted ? ' · quoted' + (l.quoted_price_amount ? ' ' + l.quoted_price_amount : '') : (l.funding_source === 'private' ? ' · no price quoted yet' : '')) : '';
    const care = (typeof cpxCareChips === 'function' ? cpxCareChips(l) : []).map(c => c.t);
    const needs = (Array.isArray(l.needs) ? l.needs : []).map(k => (typeof LPI_L !== 'undefined' && LPI_L.needs[k]) || k);
    const src = [l.source, ctx.referral].filter(Boolean).join(' · ') + (l.created_at ? ' · ' + RR.cameInWords(l.created_at, ctx.now).replace(/^came in /, '') : '');
    return '<div class="card lw-card"><div class="lw-head"><b>What we know</b><span class="field-note">red = needed before the next stage</span><span style="flex:1;"></span><button class="linklike" onclick="openLeadModal(lpLead.id)">Edit the inquiry</button></div>'
      + '<div class="lw-facts">'
      + fact('Who needs care', client ? client + (age ? ', ' + age : '') + (RR.whyCalled(l) ? ' · ' + RR.whyCalled(l) : '') : '', miss.client || miss.why, 'intake')
      + fact('Decision-maker', caller ? caller + (l.relationship ? ' (' + l.relationship + ')' : '') + (l.phone ? ' · ' + l.phone : '') + (l.email ? ' · ' + l.email : '') : '', '', 'family')
      + fact('Wants to start', RR.desiredStartWords(l, ctx.today), miss.start, 'intake')
      + fact('Schedule', RR.scheduleWords(l), miss.schedule, 'intake')
      + fact('Payer', pay, miss.payer, 'payer')
      + fact('Where', [l.client_address, l.client_city].filter(Boolean).join(', '), miss.town, 'intake')
      + fact('Needs and safety', care.concat(needs).join(' · '), '', 'care')
      + fact('Came from', src, '', '')
      + '</div></div>';
  }
  function timelineHtml(l, ctx){
    const items = R().timeline(l, ctx), fmt = iso => { const c = R().chicago(iso); return (c.ymd === ctx.today ? 'Today' : R().dayWords(c.ymd, ctx.today).replace(/^\w/, ch => ch.toUpperCase())) + ' ' + R().clockWords(iso); };
    const K = { family:'lw-tl-family', talked:'lw-tl-talked', try:'', sent:'', auto:'lw-tl-auto', clock:'lw-tl-auto', inquiry:'', note:'lw-tl-note', promise:'', stage:'lw-tl-stage' };
    return '<div class="card lw-card"><div class="lw-head"><b>What happened</b><span class="field-note">every call, text, email, automatic message and change, newest first</span></div>'
      + '<div class="lw-tl">' + (items.length ? items.map(it => '<div class="lw-tl-row ' + (K[it.kind] || '') + '"><div class="lw-tl-when">' + esc(fmt(it.at)) + '</div><div><b>' + esc(it.text) + '</b>' + (it.sub ? ' <span class="field-note">' + (it.kind === 'family' || it.kind === 'sent' ? '"' + esc(it.sub) + '"' : esc(it.sub)) + '</span>' : '') + '</div></div>').join('') : '<div class="field-note">Nothing yet.</div>') + '</div>'
      + '<div class="lw-note"><input id="lwNoteIn" placeholder="Add a note (a call goes through Log a call, so it counts)" onkeydown="if(event.key===\'Enter\')lwNote()"><button class="lb-btn" onclick="lwNote()">Add</button></div></div>';
  }
  function railHtml(l, ctx, r){
    const RR = R(), nx = RR.leadNext(l, ctx.now), asm = (ctx.assessments || []).filter(a => a && a.status === 'Scheduled' && a.visit_date && a.visit_date >= ctx.today).sort((a, b) => a.visit_date.localeCompare(b.visit_date))[0];
    const up = [];
    if(nx) up.push('<div><b>' + esc(RR.dayWords(nx.day, ctx.today).replace(/^\w/, c => c.toUpperCase())) + (nx.kind === 'promise' || nx.timed ? ' ' + esc(RR.clockWords(nx.at)) : '') + '</b> · ' + esc(RR.nextWords(nx, ctx.now)) + '</div>');
    if(asm) up.push('<div><b>' + esc(RR.dayWords(asm.visit_date, ctx.today).replace(/^\w/, c => c.toUpperCase())) + '</b> · assessment at the home</div>');
    if(ctx.journey_next) up.push('<div><b>Journey</b> · ' + esc(ctx.journey_next.title) + '</div>');
    const cn = !nx ? RR.cadenceNext(l, ctx) : null;
    if(cn) up.push('<div class="field-note"><b>Suggested</b> · ' + esc(cn.words) + (cn.day ? ' · <a href="javascript:void(0)" onclick="lwFollowUp(this)">set it</a>' : '') + '</div>');
    const org = l.referral_org_id ? (DATA.referral_orgs || []).find(o => o.id === l.referral_org_id) : null;
    const caller = ((l.first_name || '') + ' ' + (l.last_name || '')).trim(), client = !l.client_name_not_provided ? ((l.client_first_name || '') + ' ' + (l.client_last_name || '')).trim() : '';
    const tel = (p, e) => p ? '<a href="#" data-oc-phone="' + esc(p) + '"' + (e ? ' data-oc-email="' + esc(e) + '"' : '') + ' title="Call from the office line">' + esc(p) + '</a>' : '';
    const look = RR.staffingLook(l, people());
    return '<div class="lw-rail">'
      + '<div class="card lw-card"><b class="lw-rail-t">Coming up</b>' + (up.length ? '<div class="lw-up">' + up.join('') + '</div>' : '<div class="field-note" style="margin-top:6px;">Nothing scheduled. The buttons on the next card set it.</div>') + '<div class="field-note" style="margin-top:8px;">Your tasks, never automatic messages. They move when you log what happened.</div></div>'
      + '<div class="card lw-card"><b class="lw-rail-t">Contacts</b><div class="lw-contacts">'
      + (caller ? '<div><b>' + esc(caller) + '</b>' + (l.relationship ? ' · ' + esc(l.relationship) : '') + (caller !== client ? ', decides' : '') + (l.phone ? ' · ' + tel(l.phone, l.email) : '') + (l.email ? '<div class="field-note">' + esc(l.email) + '</div>' : '') + (l.do_not_contact ? '<div style="color:var(--red);font-weight:700;font-size:12px;">asked us not to contact them</div>' : '') + '</div>' : '<div class="field-note">No caller name recorded.</div>')
      + (client && client !== caller ? '<div><b>' + esc(client) + '</b> · the client' + (l.client_phone ? ' · ' + tel(l.client_phone) : '') + '</div>' : '')
      + '</div></div>'
      + partnerHtml(l, ctx, org)
      + '<div class="card lw-card"><b class="lw-rail-t">Can we staff it?</b><div style="margin-top:6px;font-size:13px;' + (look.asked && look.count ? '' : 'color:var(--text-muted);') + '">' + (look.asked && look.count ? esc(look.words).replace(/^(\d+ caregivers? says? they are)/, '<b style="color:#15803D;">$1</b>') : esc(look.words)) + '</div>'
      + (look.asked && look.total && look.count < 2 && !ctx.pre_matched ? '<div class="lb-chip" style="display:inline-block;margin-top:6px;background:var(--amber-bg);color:var(--amber);">Staffing risk</div>' : '')
      + '<div class="field-note" style="margin-top:4px;">Read from the caregivers\' own availability; a stated window is not a promise.</div>'
      + '<div style="margin-top:8px;"><button class="lb-btn" onclick="openStaffingModal(lpLead.id)">Ask Staffing to pre-match</button></div></div>'
      + '<div class="card lw-card"><b class="lw-rail-t">Everything else</b><div class="lw-links">'
      + '<a href="javascript:void(0)" onclick="cpShowTab(\'payer\');window.scrollTo(0,0)">Payer and the state (Payer tab)</a><a href="javascript:void(0)" onclick="cpShowTab(\'care\');window.scrollTo(0,0)">Assessment and care plan (Care tab)</a>'
      + '<a href="javascript:void(0)" onclick="cpShowTab(\'intake\');window.scrollTo(0,0)">Everything the family told us (Lead intake)</a><a href="javascript:void(0)" onclick="cpShowTab(\'family\');window.scrollTo(0,0)">Texts and emails, the whole thread (Family &amp; Contacts)</a>'
      + '<a href="javascript:void(0)" onclick="cpShowTab(\'history\');window.scrollTo(0,0)">Documents and history</a><a href="javascript:void(0)" onclick="lwAi()">AI summary of the call notes</a>'
      + '<a href="javascript:void(0)" onclick="lpPrintFacesheet()">Print facesheet</a><a href="javascript:void(0)" onclick="openActivityModal(lpLead.id)">Schedule an activity</a><a href="javascript:void(0)" onclick="lpArchiveLead()">Archive</a>'
      + (typeof leadFromWebForm === 'function' && leadFromWebForm(l) ? '<a href="javascript:void(0)" onclick="lpMarkSpam(lpLead.id, this)">Not a real inquiry (spam)</a>' : '')
      + '</div></div></div>';
  }
  /* item 3 (2026-10-07): the referral partner loop. What the referrer has heard from us and what is due to go: every one
     a DRAFT a person reads, edits and sends (her audience law); the Hub only says which message is due and offers the words. */
  function partnerHtml(l, ctx, org){
    const RR = R(), pl = RR.partnerLoop(l, Object.assign({}, ctx, { templates:(DATA.ops_settings || {}).partner_templates || {} }));
    if(!pl.partner) return '<div class="card lw-card"><b class="lw-rail-t">Referral partner</b><div class="field-note" style="margin-top:6px;">No referral partner on this one' + (l.source ? ' (' + esc(l.source).toLowerCase() + ')' : '') + '.</div></div>';
    const tel = (p, e) => p ? '<a href="#" data-oc-phone="' + esc(p) + '"' + (e ? ' data-oc-email="' + esc(e) + '"' : '') + ' title="Call from the office line">' + esc(p) + '</a>' : '';
    const fmt = iso => { const c = RR.chicago(iso); return RR.dayWords(c.ymd, ctx.today) + ' ' + RR.clockWords(iso); };
    return '<div class="card lw-card"><b class="lw-rail-t">Referral partner</b>'
      + '<div style="margin-top:6px;font-size:13px;"><b>' + esc(pl.partner.name) + '</b>' + (pl.partner.label ? ' · ' + esc(pl.partner.label) : '') + (org && org.people ? '<div class="field-note">' + esc(org.people) + '</div>' : '')
      + (org && (org.phone || org.email) ? '<div class="field-note">' + (org.phone ? tel(org.phone, org.email) : '') + (org.phone && org.email ? ' · ' : '') + (org.email ? esc(org.email) : '') + '</div>' : '') + '</div>'
      + (pl.due.length ? '<div class="lw-fact-k" style="margin-top:10px;">Due to go (a draft, you send it)</div>' + pl.due.map(d => '<div style="margin-top:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;"><span style="font-size:13px;font-weight:700;color:var(--navy);">' + esc(d.title) + '</span><button class="lb-btn" onclick="lwPartnerDraft(this, \'' + esc(d.kind) + '\')">Draft it</button></div>').join('') : '')
      + (pl.sent.length ? '<div class="lw-fact-k" style="margin-top:10px;">They heard from us</div>' + pl.sent.slice(0, 5).map(m => '<div style="font-size:12.5px;margin-top:4px;"><b>' + esc(RR.PARTNER_LABEL[m.kind] || 'An update') + '</b> · ' + esc(fmt(m.at)) + ' · ' + esc(m.channel) + (m.by ? ' · ' + esc(first(ctx.names[String(m.by).toLowerCase()] || String(m.by).split('@')[0])) : '') + '</div>').join('') : '<div class="field-note" style="margin-top:8px;">Nothing has gone to them yet about this family.</div>')
      + '<div class="field-note" style="margin-top:8px;">Nothing goes to a partner by itself. Each line is a draft you read, change and send.</div></div>';
  }
  /* the draft: her words (or Settings\'), editable; Send by email (the partner\'s address, from you), or Copy and mark it told by call or text */
  function partnerDraft(b, kind){
    const l = lead(), RR = R(); if(!l || typeof ccPopOpen !== 'function') return;
    const ctx = ctxFor(l), org = ctx.org || null, pl = RR.partnerLoop(l, Object.assign({}, ctx, { templates:(DATA.ops_settings || {}).partner_templates || {} }));
    const d = pl.due.find(x => x.kind === kind) || { kind, title:RR.PARTNER_LABEL[kind] || 'An update', text:'' };
    const to = (org && org.email) || '';
    const el = ccPopOpen(b || document.body, '<div style="font-size:13.5px;font-weight:700;margin-bottom:6px;">To ' + esc(pl.partner.name) + ': ' + esc(d.title) + '</div>'
      + '<textarea id="lwPdText" rows="6" style="width:100%;box-sizing:border-box;font-size:13.5px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;">' + esc(d.text) + '</textarea>'
      + '<div style="display:flex;gap:8px;margin-top:10px;align-items:center;flex-wrap:wrap;">'
      + (to ? '<button class="primary" id="lwPdEmail" style="padding:7px 14px;font-size:13px;">Email ' + esc(to) + '</button>' : '<span class="field-note">No email on the partner\'s record.</span>')
      + '<button class="ghost" id="lwPdCopy" style="padding:7px 14px;font-size:13px;">Copy, I will call or text</button><button class="ghost" id="lwPdNo" style="padding:7px 14px;font-size:13px;">Cancel</button><span class="field-note" id="lwPdMsg"></span></div>'
      + '<div class="field-note" style="margin-top:6px;">Sent from you, through the office email. The family is not copied.</div>', { width:420 });
    el.querySelector('#lwPdNo').onclick = ccPopClose;
    const record = async (channel) => {
      const a = (typeof ccActor === 'function') ? ccActor() : { email:'' };
      RR.recordPartnerMsg(l, { kind, channel, to:pl.partner.name, text:el.querySelector('#lwPdText').value.trim(), by:a.email });
      if(org){ const act = { id:(typeof uid === 'function' ? uid() : String(Date.now())), org_id:org.id, kind:channel === 'email' ? 'email' : 'call', note:d.title + ' (about ' + ((l.client_first_name || l.first_name || 'a family')) + ')', at:new Date().toISOString(), by:a.email, lead_id:l.id };
        DATA.referral_activities = DATA.referral_activities || []; DATA.referral_activities.push(act); await persist('referral_activities', act); }
      await persist('leads', l); ccPopClose(); render();
    };
    el.querySelector('#lwPdCopy').onclick = async () => {
      const t = el.querySelector('#lwPdText').value.trim(); try{ await navigator.clipboard.writeText(t); }catch(e){}
      if(confirm('Copied. Mark this as told to ' + pl.partner.name + ' by call or text? (It goes on the record as sent by you.)')) await record('call');
    };
    const em = el.querySelector('#lwPdEmail');
    if(em) em.onclick = async () => {
      const text = el.querySelector('#lwPdText').value.trim(), msg = el.querySelector('#lwPdMsg'); if(!text) return;
      em.disabled = true; msg.textContent = 'Sending…';
      try{ window.commsLead = l; try{ commsLead = l; }catch(e){}
        /* the partner's address, not the family's: the same door, pointed at the referrer (opt-out checked there too) */
        const contact = String((org && org.people) || '').split(/[,(]/)[0].trim();
        await commsCall({ action:'send_email', subject:'Caring Companions: ' + d.title + ' (' + ((l.client_first_name || '') + ' ' + (l.client_last_name || '')).trim() + ')', message:text, email:to, phone:undefined, first_name:contact.split(/\s+/)[0] || 'Referral', last_name:contact.split(/\s+/).slice(1).join(' ') || 'Partner' });
        await record('email'); if(typeof ccToast === 'function') ccToast('Sent to ' + pl.partner.name + '.'); }
      catch(e){ em.disabled = false; msg.textContent = 'Could not send: ' + e.message; }
    };
  }
  function partnerFill(){
    const box = document.getElementById('lwPartner'), RR = R(); if(!box || !RR) return;
    const cur = (DATA.ops_settings || {}).partner_templates || {};
    box.innerHTML = RR.PARTNER_KINDS.map(k => '<div style="margin-top:8px;"><label style="font-size:12.5px;font-weight:700;color:var(--navy);display:block;margin-bottom:3px;">' + esc(RR.PARTNER_LABEL[k]) + '</label>'
      + '<textarea data-partner="' + k + '" rows="2" placeholder="' + esc(RR.PARTNER_DEFAULT[k]) + '" style="width:100%;box-sizing:border-box;font-size:13px;">' + esc(cur[k] || '') + '</textarea></div>').join('')
      + '<div style="display:flex;gap:8px;align-items:center;margin-top:10px;"><button class="secondary" onclick="lwPartnerSave(this)">Save the partner lines</button><span class="field-note" id="lwPartnerMsg"></span></div>';
  }
  async function partnerSave(b){
    const out = {}; document.querySelectorAll('#lwPartner textarea[data-partner]').forEach(t => { const v = t.value.trim(); if(v) out[t.dataset.partner] = v; });
    const msg = document.getElementById('lwPartnerMsg'); if(b) b.disabled = true;
    const res = await tkMerge(m => { const was = JSON.stringify(m.partner_templates || {}); m.partner_templates = out; return was === JSON.stringify(out) ? [] : ['partner lines: ' + (Object.keys(out).join(', ') || 'back to the standard wording')]; }, 'Referral partner lines');
    if(b) b.disabled = false;
    if(res.error){ if(msg) msg.textContent = 'Could not save: ' + res.error.message; return; }
    DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { partner_templates:out }); if(msg) msg.textContent = 'Saved. Blank lines use the standard wording shown in grey.';
  }
  function render(){
    const host = document.getElementById('lwHost'); if(!host) return;
    const on = active();
    hide(['lp_head_card', 'lp_ai_card', 'cpcPath', 'cpcGrid', 'cpcCare', 'cpcNeeded'], on);
    if(!on){ host.innerHTML = ''; host.style.display = 'none'; tab(); trim(); return; }
    const l = lead(), RR = R(), ctx = ctxFor(l), r = RR.boardRow(l, ctx), st = RR.steps(l, ctx), sc = RR.scriptFor(l, r, ctx);
    const tone = TONE[r.when.tone] || TONE.navy, lost = String(l.status || '') === 'Lost';
    const callerFirst = first(l.first_name) || 'them';
    const owners = [...new Set((typeof OPS_PEOPLE !== 'undefined' && OPS_PEOPLE || []).map(p => first(p.full_name)).concat((DATA.leads || []).map(x => first(x.assigned_coordinator))).concat([first(l.assigned_coordinator)]).filter(Boolean))].sort();
    const yesOk = !!(l.first_human_contact_at && !l.said_yes_at && !lost);
    const reply = r.reason === 'replied' ? (RR.timeline(l, ctx).find(x => x.kind === 'family') || null) : null;
    let h = '<div class="card lw-card lw-top">'
      + '<div class="lw-top-row"><div style="flex:1 1 380px;min-width:0;">'
      + '<div class="lw-story"><b>' + esc(r.why || ('Inquiry' + (r.name ? ' for ' + r.name : ''))) + '</b>' + (r.last ? ' <span class="field-note">· ' + esc(r.last) + '</span>' : '') + '</div>'
      + (r.need ? '<div class="lw-need">' + esc(r.need) + '</div>' : '')
      + (r.chips.length ? '<div class="lb-chips">' + r.chips.map(c => '<span class="lb-chip" style="' + (c.tone === 'missing' ? 'background:#fff;color:#B91C1C;border:1px dashed #DC2626;' : c.tone === 'bad' ? 'background:var(--red-bg);color:var(--red);' : 'background:var(--amber-bg);color:var(--amber);') + '">' + esc(c.text) + '</span>').join('') + '</div>' : '')
      + '</div><div class="lw-moves">'
      + '<label for="lwOwner" class="lb-k">Owner</label><select id="lwOwner" onchange="lwOwner(this.value)"><option value="">Nobody</option>' + owners.map(o => '<option' + (o === first(l.assigned_coordinator) ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>'
      + (yesOk ? '<button class="cj-yes-btn" onclick="lwYes(this)" title="The family chose Caring Companions. Moves them into Getting ready and lands you on the next step. Undo is right there if it was a slip.">They said yes</button>' : '')
      + (typeof lpStageControlHtml === 'function' ? lpStageControlHtml(l) : '')
      + (lost ? '' : '<button class="lb-btn" onclick="lwWaiting(this)">' + (RR.waiting(l) ? 'Waiting on: ' + esc(RR.WAITING[RR.waiting(l).reason].on.toLowerCase()) + ' ▾' : 'Waiting on…') + '</button>')
      + '</div></div>' + stepsHtml(st) + '</div>';
    /* the one next card */
    if(lost) h += '<div class="card lw-card lw-next" style="border-color:#9A9388;"><div class="lw-next-k" style="color:#6E6559;">Lost</div><div class="lw-next-t">' + esc(l.lost_reason || 'No reason recorded') + '</div><div class="field-note">Not lost after all puts them back where they were; the reason stays in the history.</div></div>';
    else h += '<div class="card lw-card lw-next" style="border-color:' + tone[0] + ';">'
      + '<div class="lw-next-head"><span class="lw-next-k" style="color:' + tone[1] + ';">' + esc(tone[2]) + '</span><span class="lw-next-big" style="color:' + tone[0] + ';">' + esc(r.when.big) + '</span>' + (r.when.sub ? '<span class="field-note">' + esc(r.when.sub) + '</span>' : '') + '</div>'
      + '<div class="lw-next-t">' + esc(r.next.text) + '</div>'
      + (reply ? '<div class="lw-quote"><div class="lw-quote-k">' + esc(callerFirst) + ' wrote</div>"' + esc(reply.sub || reply.text) + '"</div>' : '')
      + (sc.text || sc.hint ? '<div class="lw-script">' + (sc.text ? '<div class="lw-quote-k" style="color:#A8660E;">Script · ' + esc(sc.title) + (sc.custom ? ' (your wording)' : '') + '</div>' + esc(sc.text) : '') + (sc.hint ? '<div class="lw-hint">' + esc(sc.hint) + '</div>' : '') + '</div>' : '')
      + '<div class="lb-actions">' + btn(l, r.primary, true) + r.secondary.map(a => btn(l, a, false)).join('')
      + (r.primary.kind !== 'text' && !r.secondary.some(a => a.kind === 'text') && l.phone ? '<button class="lb-btn" onclick="lwText(this)">Text ' + esc(callerFirst) + '</button>' : '')
      + (r.primary.kind !== 'log' && !r.secondary.some(a => a.kind === 'log') ? '<button class="lb-btn" onclick="lwLog(this)">Log a call</button>' : '')
      + (r.primary.kind !== 'followup' && !r.secondary.some(a => a.kind === 'followup' || a.kind === 'open') ? '<button class="lb-btn" onclick="lwFollowUp(this)">Set a follow-up</button>' : '') + '</div>'
      + '<div class="field-note" style="margin-top:8px;">Each button writes what happened and sets the next step. Nothing goes to ' + esc(callerFirst) + ' unless you send it.</div></div>';
    h = '<div class="lw-grid"><div class="lw-main">' + h + knowHtml(l, ctx, r) + timelineHtml(l, ctx) + '</div>' + railHtml(l, ctx, r) + '</div>';
    host.innerHTML = h; host.style.display = '';
    tab(); trim();
  }
  /* the journey card sits above the tabs on every tab; on the Overview the workspace speaks for them, so it steps aside there */
  function tab(){
    const head = document.getElementById('cjHead'); if(!head) return;
    const on = active() && (typeof CP === 'undefined' || !CP.tab || CP.tab === 'summary') && typeof cjHasJourney === 'function' && cjHasJourney();
    head.style.display = on ? 'none' : '';
  }

  /* ── the actions: the Hub's own, pointed at this family, then redraw ── */
  const afterPop = () => { const t = setInterval(() => { if(!document.querySelector('.ccpop')){ clearInterval(t); render(); } }, 400); setTimeout(() => clearInterval(t), 120000); };
  const redrawBoard = () => { try{ if(typeof renderLeadsStarts === 'function') renderLeadsStarts(); }catch(e){} };
  function lwLog(b){ const l = lead(); if(!l) return; lbLog(l.id, b); afterPop(); }
  function lwFollowUp(b){ const l = lead(); if(!l) return; lbFollowUp(l.id, b); afterPop(); }
  function lwSchedule(){ const l = lead(); if(!l) return; lbSchedule(l.id); }
  function lwOpenAsmt(){ if(typeof cpShowTab === 'function') cpShowTab('care'); window.scrollTo(0, 0); }
  async function lwDsds(){ const l = lead(); if(!l) return; await lbDsds(l.id); render(); }
  function lwYes(b){ const l = lead(); if(!l) return; lbYes(l.id, b); }
  async function lwOwner(v){ const l = lead(); if(!l) return; l.assigned_coordinator = v || ''; await persist('leads', l); try{ opsReconcileLeads(); }catch(e){} redrawBoard(); render(); }
  function lwAi(){ const c = document.getElementById('lp_ai_card'); if(!c) return; c.style.display = c.style.display === 'none' ? '' : 'none'; if(c.style.display !== 'none') c.scrollIntoView({ behavior:'smooth', block:'start' }); }
  async function lwNote(){
    const l = lead(), inp = document.getElementById('lwNoteIn'); if(!l || !inp) return;
    const body = inp.value.trim(); if(!body) return;
    const a = (typeof ccActor === 'function') ? ccActor() : { email:'' };
    l.comm_log = Array.isArray(l.comm_log) ? l.comm_log : []; l.comm_log.push({ body, at:new Date().toISOString(), by:a.email, kind:'note' });
    await persist('leads', l); render();
  }
  /* a text, typed by a person, sent as that person (the same door the Family tab uses); their reply is then answered */
  function lwText(b, prefill){
    const l = lead(); if(!l || typeof ccPopOpen !== 'function') return;
    if(!l.phone){ alert('This family has no phone number on the inquiry. Add one first.'); return; }
    const el = ccPopOpen(b || document.body, '<div style="font-size:13.5px;font-weight:700;margin-bottom:6px;">Text ' + esc(first(l.first_name) || 'them') + ' at ' + esc(l.phone) + '</div>'
      + '<textarea id="lwTextIn" rows="4" style="width:100%;box-sizing:border-box;font-size:13.5px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;" placeholder="Your words. It goes out from the office number, from you.">' + esc(prefill || '') + '</textarea>'
      + '<div style="display:flex;gap:8px;margin-top:10px;align-items:center;"><button class="primary" id="lwTextGo" style="padding:7px 14px;font-size:13px;">Send text</button><button class="ghost" id="lwTextNo" style="padding:7px 14px;font-size:13px;">Cancel</button><span class="field-note" id="lwTextMsg"></span></div>', { width:380 });
    el.querySelector('#lwTextNo').onclick = ccPopClose;
    el.querySelector('#lwTextGo').onclick = async () => {
      const text = el.querySelector('#lwTextIn').value.trim(), go = el.querySelector('#lwTextGo'), msg = el.querySelector('#lwTextMsg'); if(!text) return;
      if(l.do_not_contact && !confirm('This family asked us not to contact them. Send anyway, as a person, because they asked for this specific reply?')) return;
      go.disabled = true; msg.textContent = 'Sending…';
      try{ window.commsLead = l; try{ commsLead = l; }catch(e){}
        await commsCall({ action:'send_sms', message:text });
        ldPush(l, { channel:'sms', direction:'out', outcome:'sent', actor:'human', by:ccActor().email, ref:text.slice(0, 120) });
        await persist('leads', l); ccPopClose(); try{ opsReconcileLeads(); }catch(e){} redrawBoard(); render(); try{ if(typeof cjMountProfile === 'function' && l.said_yes_at) cjMountProfile({ lead:l, ax:'' }); }catch(e){} if(typeof ccToast === 'function') ccToast('Sent.'); }
      catch(e){ go.disabled = false; msg.textContent = 'Could not send: ' + e.message; }
    };
  }
  /* Waiting on…: the reason, the check-back date (always), a note; through the same form rules the intake uses */
  function lwWaiting(b){ waitingFor(lead(), b, null); }
  function waitingFor(l, b, after){
    const RR = R(); if(!l || typeof ccPopOpen !== 'function') return;
    const w = RR.waiting(l), today = RR.ymd(new Date());
    const el = ccPopOpen(b || document.body, '<div style="font-size:13.5px;font-weight:700;margin-bottom:6px;">What are we waiting on?</div>'
      + '<select id="lwWaitReason" style="width:100%;font-size:13px;"><option value="">Nothing: back on the working board</option>' + RR.WAITING_KEYS.map(k => '<option value="' + k + '"' + (w && w.reason === k ? ' selected' : '') + '>' + esc(RR.WAITING[k].label) + '</option>').join('') + '</select>'
      + '<div class="field-note" style="margin:8px 0 4px;">Check back on</div><input id="lwWaitDate" type="date" value="' + esc(w && w.check_back ? w.check_back : '') + '" style="width:100%;font-size:13px;padding:6px;">'
      + '<input id="lwWaitNote" placeholder="A few words (shows on the board)" value="' + esc(w ? w.note : '') + '" style="width:100%;margin-top:8px;padding:8px 10px;font-size:13px;border:1px solid var(--border);border-radius:8px;box-sizing:border-box;">'
      + '<div style="display:flex;gap:8px;margin-top:10px;"><button class="primary" id="lwWaitGo" style="padding:7px 14px;font-size:13px;">Save</button><button class="ghost" id="lwWaitNo" style="padding:7px 14px;font-size:13px;">Cancel</button></div>', { width:340 });
    const sel = el.querySelector('#lwWaitReason'), date = el.querySelector('#lwWaitDate');
    sel.onchange = () => { if(sel.value && !date.value) date.value = RR.defaultCheckBack(sel.value, today); };
    el.querySelector('#lwWaitNo').onclick = ccPopClose;
    el.querySelector('#lwWaitGo').onclick = async () => {
      const reason = sel.value; if(reason && !date.value) date.value = RR.defaultCheckBack(reason, today);
      RR.compose(l, { waiting_reason:reason, waiting_check_back:date.value, waiting_note:el.querySelector('#lwWaitNote').value }, today);
      ccPopClose(); await persist('leads', l); try{ opsReconcileLeads(); }catch(e){} redrawBoard(); render(); if(typeof after === 'function') after();
    };
  }
  /* item 5 (2026-10-07): after the yes, the handoff: what carried forward (read only) and what goes out now, as drafts a person
     sends: the thank-you text to the family, the outcome to the referrer. Drawn inside the journey card. */
  function handoffHtml(l){
    const RR = R(); if(!l || !RR || !l.said_yes_at) return '';
    const ctx = ctxFor(l), pl = RR.partnerLoop(l, Object.assign({}, ctx, { templates:(DATA.ops_settings || {}).partner_templates || {} }));
    const thanked = (Array.isArray(l.contact_events) ? l.contact_events : []).some(e => e && e.actor === 'human' && e.direction === 'out' && e.channel === 'sms' && e.at >= l.said_yes_at);
    const toldPartner = pl.partner && !pl.due.some(d => d.kind === 'outcome_started');
    return '<div class="lw-handoff"><div class="lw-fact-k">Carried forward</div><div style="font-size:13px;">' + esc(RR.carriedForward(l, ctx)) + '</div>'
      + '<div class="lw-fact-k" style="margin-top:8px;">Goes out now, when you send it</div><div class="lb-actions" style="margin-top:4px;">'
      + (l.phone ? (thanked ? '<span class="field-note">✓ ' + esc(first(l.first_name) || 'The family') + ' was texted after the yes.</span>' : '<button class="lb-btn" onclick="lwText(this, LeadRules.yesThanks(CP.lead, { me:(ccActor().name||\'\'), scripts:(DATA.ops_settings||{}).lead_scripts||{} }))">Thank-you text to ' + esc(first(l.first_name) || 'the family') + '</button>') : '')
      + (pl.partner ? (toldPartner ? '<span class="field-note">✓ ' + esc(pl.partner.name) + ' was told.</span>' : '<button class="lb-btn" onclick="lwPartnerDraft(this, \'outcome_started\')">Tell ' + esc(pl.partner.name) + ': they chose us</button>') : '')
      + '</div><div class="field-note" style="margin-top:4px;">Both are drafts in your words; nothing goes out by itself. Creating the client in AxisCare is the journey step below.</div></div>';
  }

  /* ── Settings: the script lines in her words ── */
  function scriptsFill(){
    const box = document.getElementById('lwScripts'), RR = R(); if(!box || !RR) return;
    const cur = (DATA.ops_settings || {}).lead_scripts || {};
    box.innerHTML = RR.SCRIPT_KEYS.map(k => '<div style="margin-top:8px;"><label style="font-size:12.5px;font-weight:700;color:var(--navy);display:block;margin-bottom:3px;">' + esc(RR.SCRIPT_LABEL[k]) + '</label>'
      + '<textarea data-script="' + k + '" rows="2" placeholder="' + esc(RR.SCRIPT_DEFAULT[k]) + '" style="width:100%;box-sizing:border-box;font-size:13px;">' + esc(cur[k] || '') + '</textarea></div>').join('')
      + '<div style="display:flex;gap:8px;align-items:center;margin-top:10px;"><button class="secondary" onclick="lwScriptsSave(this)">Save the script lines</button><span class="field-note" id="lwScriptsMsg"></span></div>';
  }
  async function scriptsSave(b){
    const out = {}; document.querySelectorAll('#lwScripts textarea[data-script]').forEach(t => { const v = t.value.trim(); if(v) out[t.dataset.script] = v; });
    const msg = document.getElementById('lwScriptsMsg'); if(b) b.disabled = true;
    const res = await tkMerge(m => { const was = JSON.stringify(m.lead_scripts || {}); m.lead_scripts = out; return was === JSON.stringify(out) ? [] : ['lead script lines: ' + (Object.keys(out).join(', ') || 'back to the standard wording')]; }, 'Lead script lines');
    if(b) b.disabled = false;
    if(res.error){ if(msg) msg.textContent = 'Could not save: ' + res.error.message; return; }
    DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { lead_scripts:out }); if(msg) msg.textContent = 'Saved. Blank lines use the standard wording shown in grey.';
  }

  try{ const st = document.createElement('style'); st.textContent = [
    '#lwHost{margin-bottom:14px}.lw-grid{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start}.lw-main{flex:999 1 560px;min-width:0;display:flex;flex-direction:column;gap:14px}.lw-rail{flex:1 1 280px;min-width:0;display:flex;flex-direction:column;gap:14px}',
    '.lw-card{padding:14px 18px;margin:0}.lw-head{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.lw-head b{font-size:14px;color:var(--navy)}',
    '.lw-top-row{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}.lw-story{font-size:14px}.lw-need{font-size:13px;color:var(--text-muted);margin-top:3px}',
    '.lw-moves{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.lw-moves select{width:auto;font-size:13px;padding:6px 10px;min-height:34px}',
    '.lw-steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:12px}.lw-step{padding:8px 10px;border-radius:8px;min-width:0}.lw-step-k{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}.lw-step-w{font-size:12px;margin-top:2px;overflow-wrap:anywhere}',
    '.lw-next{border-width:2px!important}.lw-next-head{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.lw-next-k{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.lw-next-big{font-size:17px;font-weight:800}.lw-next-t{font-size:15.5px;font-weight:700;color:var(--navy);margin-top:6px}',
    '.lw-quote{margin-top:8px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:13px}.lw-quote-k{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px}',
    '.lw-script{margin-top:8px;background:#FFFBEB;border:1px solid #F3DDB3;border-radius:8px;padding:10px 12px;font-size:13px;white-space:pre-wrap}.lw-hint{color:var(--text-muted);margin-top:4px;white-space:normal}',
    '.lw-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 24px;margin-top:10px;font-size:13px}.lw-fact{min-width:0}.lw-fact[role=button]{cursor:pointer}.lw-fact[role=button]:hover .lw-fact-v{text-decoration:underline}.lw-fact-k{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--text-muted)}.lw-fact-v{overflow-wrap:anywhere}',
    '.lw-miss{display:inline-block;padding:1px 8px;border-radius:12px;font-size:10.5px;font-weight:700;background:#fff;color:#B91C1C;border:1px dashed #DC2626}',
    '.lw-tl{margin-top:10px;max-height:460px;overflow-y:auto}.lw-tl-row{display:grid;grid-template-columns:120px minmax(0,1fr);gap:12px;padding:7px 0;border-top:1px solid var(--border);font-size:13px}.lw-tl-when{font-size:12px;color:var(--text-muted)}.lw-tl-family b{color:#B91C1C}.lw-tl-talked b{color:#15803D}.lw-tl-auto b{color:var(--text-muted);font-weight:600}.lw-tl-note b{font-weight:600}.lw-tl-stage b{color:var(--navy)}',
    '.lw-note{display:flex;gap:8px;margin-top:10px}.lw-note input{flex:1;font-size:13px}',
    '.lw-handoff{margin-top:10px;padding:10px 12px;background:#F6F9FD;border:1px solid var(--border);border-radius:8px}',
    '.lw-rail-t{font-size:13.5px;color:var(--navy)}.lw-up{margin-top:8px;font-size:13px;display:flex;flex-direction:column;gap:6px}.lw-contacts{margin-top:8px;font-size:13px;display:flex;flex-direction:column;gap:8px}.lw-links{margin-top:6px;font-size:13px;display:flex;flex-direction:column;gap:4px}',
    '@media (max-width:720px){.lw-steps{grid-template-columns:repeat(2,minmax(0,1fr))}.lw-facts{grid-template-columns:1fr}.lw-tl-row{grid-template-columns:1fr;gap:2px}}'
  ].join(''); document.head.appendChild(st); }catch(e){}
  Object.assign(window, { LeadWorkspace:{ render, active, people, waitingFor, handoffHtml }, lwRender:render, lwPartnerDraft:partnerDraft, lwPartnerFill:partnerFill, lwPartnerSave:partnerSave, lwActive:active, lwTab:tab, lwTrim:trim, lwLog, lwFollowUp, lwSchedule, lwOpenAsmt, lwDsds, lwYes, lwOwner, lwAi, lwNote, lwText, lwWaiting, lwScriptsFill:scriptsFill, lwScriptsSave:scriptsSave });
})();
