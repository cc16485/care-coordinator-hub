/* =============================================================================
   referral-desk.js · the Referral Partner Desk, Step 2 (Samantha approved 2026-10-08)
   The Referrers tab becomes the desk. Rules: partner-rules.js. Records: the ones the Hub already keeps
   (referral_orgs, referral_activities, activities, leads, ops_items); nothing new to sync.
     · This week: each owner's partners due by Sunday (or that sent a referral this week), best first, with why
     · Needs an owner (owners): partners added since the desk started, until someone is assigned
     · Link these referrals: referral leads with no partner, grouped by the name typed
     · Log a visit: one form that works on a phone (who you saw, what happened, the next touch)
     · Partner profile: owner, tier and why, relationship potential, how they like to be reached, best visit times,
       materials they asked for, relationship notes, and the people there
     · Today: "Partner visits this week" (and, for owners, "Partners needing an owner"), counted, never stored
     · My Work: ONE card per owner per week, a fixed id so it can't double; it closes itself when the week is done
     · Settings: tier timing, tier rules, the default owner, the towns (owners edit; every change is logged)
   Urgent referrals are not here: they stay on the Leads board (red flag, office alert, speed-to-lead).
   ============================================================================= */
(function () {
  'use strict';
  const PR = () => window.PartnerRules;
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
  const lc = s => String(s == null ? '' : s).trim().toLowerCase();
  const todayYmd = () => new Intl.DateTimeFormat('en-CA', { timeZone:'America/Chicago' }).format(new Date());
  const day = d => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) : '';
  const me = () => lc((typeof ME !== 'undefined' && ME && ME.email) || '');
  const isOwner = () => { try{ return ccIsOwner(); }catch(e){ return false; } };
  const st = () => (typeof DATA !== 'undefined' && DATA.ops_settings) || {};
  const ctx = () => ({ today:todayYmd(), leads:(DATA.leads || []), activities:(DATA.referral_activities || []), planned:(DATA.activities || []), settings:st() });
  const orgs = () => DATA.referral_orgs || [];
  const org = id => orgs().find(o => o.id === id) || null;
  const people = () => {
    const p = (typeof OPS_PEOPLE !== 'undefined' && OPS_PEOPLE || []).filter(x => x && x.primary_email).map(x => ({ email:lc(x.primary_email), name:x.full_name || x.primary_email }));
    const S = PR().settings(st()); if(!p.some(x => x.email === lc(S.default_owner))) p.unshift({ email:lc(S.default_owner), name:S.default_owner.split('@')[0] });
    return p.sort((a, b) => a.name.localeCompare(b.name));
  };
  const nameOf = e => { const p = people().find(x => x.email === lc(e)); return p ? p.name : (e ? String(e).split('@')[0] : 'Nobody'); };
  const PILL = { P:['Priority','pd-p'], A:['A','pd-a'], B:['B','pd-b'], C:['C','pd-c'] };
  const pill = x => '<span class="pd-pill ' + PILL[x.tier][1] + '" title="' + esc(x.why + ' · ' + x.cadence_why) + '">' + PILL[x.tier][0] + '</span>';
  const DESK = { who:'mine' };
  const phoneOf = o => (o.contacts || []).find(c => c && !c.archived && c.phone)?.phone || o.phone || '';

  /* ── the desk, at the top of Referrers ── */
  function deskHtml(){
    if(!PR()) return '';
    const c = ctx(), owner = DESK.who === 'all' && isOwner() ? '*' : me();
    const wk = PR().week(orgs(), c, owner), need = isOwner() ? PR().needsOwner(orgs(), c) : [], un = PR().unlinked(DATA.leads || []);
    let h = '<div class="card pd-desk"><div class="pd-head"><b>This week</b><span class="field-note">' + (wk.length ? wk.length + ' partner' + (wk.length === 1 ? '' : 's') + ' to see or call' : 'Nothing due this week') + '</span><span style="flex:1"></span>'
      + (isOwner() ? '<span class="pd-seg"><button class="' + (DESK.who !== 'all' ? 'on' : '') + '" onclick="pdWho(\'mine\')">Mine</button><button class="' + (DESK.who === 'all' ? 'on' : '') + '" onclick="pdWho(\'all\')">Everyone</button></span>' : '') + '</div>'
      + '<div class="field-note pd-sub">Urgent referrals are never here: they stay red on the Leads board until someone calls.</div>';
    h += wk.length ? wk.map(x => { const o = org(x.id) || {}, ph = phoneOf(o);
      return '<div class="pd-row"><div class="pd-main"><div><a href="javascript:void(0)" onclick="openRefProfile(\'' + esc(x.id) + '\')"><b>' + esc(x.name) + '</b></a> ' + pill(x)
        + (owner === '*' ? ' <span class="field-note">' + esc(nameOf(x.owner.email)) + '</span>' : '') + '</div>'
        + '<div class="field-note">' + esc(x.reasons.join(' · ')) + (o.best_visit_times ? ' · best: ' + esc(o.best_visit_times) : '') + (x.planned ? ' · planned ' + esc(day(x.planned.due)) : '') + '</div></div>'
        + '<div class="pd-acts"><button class="primary" onclick="pdLogOpen(\'' + esc(x.id) + '\')">Log visit</button>'
        + (ph ? '<a class="fb pd-btn"' + (typeof ocAttrs === 'function' ? ocAttrs(ph, { email:o.email }) : ' href="#"') + '>Call</a>' : '')
        + '<button class="fb" onclick="pdPlan(\'' + esc(x.id) + '\')">Plan it</button></div></div>'; }).join('')
      : '<div class="field-note" style="padding:8px 0;">You\'re caught up for the week.</div>';
    h += '</div>';
    if(need.length) h += '<div class="card pd-desk"><div class="pd-head"><b>Needs an owner</b><span class="field-note">' + need.length + ' new partner' + (need.length === 1 ? '' : 's') + '; until assigned they show on ' + esc(nameOf(PR().settings(st()).default_owner)) + '\'s week</span></div>'
      + need.map(o => '<div class="pd-row"><div class="pd-main"><a href="javascript:void(0)" onclick="openRefProfile(\'' + esc(o.id) + '\')"><b>' + esc(o.name) + '</b></a><div class="field-note">' + esc(o.type || '') + ' · added ' + esc(day(o.created_at)) + '</div></div>'
        + '<div class="pd-acts"><select id="pdOwn_' + esc(o.id) + '">' + people().map(p => '<option value="' + esc(p.email) + '">' + esc(p.name) + '</option>').join('') + '</select><button class="primary" onclick="pdAssign(\'' + esc(o.id) + '\')">Assign</button></div></div>').join('') + '</div>';
    if(un.length) h += '<div class="card pd-desk"><div class="pd-head"><b>Link these referrals to a partner</b><span class="field-note">so they count for the right partner</span></div>'
      + un.map((g, i) => '<div class="pd-row"><div class="pd-main"><b>' + esc(g.name) + '</b><div class="field-note">' + g.leads.length + ' referral' + (g.leads.length === 1 ? '' : 's') + (g.type ? ' · ' + esc(g.type) : '') + ' · no partner linked</div></div>'
        + '<div class="pd-acts"><select id="pdLink_' + i + '"><option value="">Pick the partner…</option>' + orgs().slice().sort((a, b) => String(a.name).localeCompare(String(b.name))).map(o => '<option value="' + esc(o.id) + '">' + esc(o.name) + '</option>').join('') + '</select>'
        + '<button class="primary" onclick="pdLink(' + i + ')">Link</button><button class="fb" onclick="pdAddFrom(' + i + ')">Add as a new partner</button></div></div>').join('') + '</div>';
    return h;
  }
  function render(){ const box = document.getElementById('refDesk'); if(box) box.innerHTML = deskHtml(); }

  async function assign(id){
    if(!isOwner()) return; const o = org(id), sel = document.getElementById('pdOwn_' + id); if(!o || !sel) return;
    o.owner_email = sel.value; o.owner_assigned_at = new Date().toISOString(); o.owner_assigned_by = me();
    await persist('referral_orgs', o); toast('Assigned to ' + nameOf(sel.value) + '.'); refresh();
  }
  async function link(i){
    const g = PR().unlinked(DATA.leads || [])[i], sel = document.getElementById('pdLink_' + i); if(!g || !sel || !sel.value) return;
    const o = org(sel.value); if(!o) return;
    if(!confirm('Link ' + g.leads.length + ' referral' + (g.leads.length === 1 ? '' : 's') + ' named "' + g.name + '" to ' + o.name + '?')) return;
    for(const id of g.leads){ const l = (DATA.leads || []).find(x => x.id === id); if(!l) continue; l.referral_org_id = o.id; delete l.referral_org_suggest; if(!l.referral_source_name) l.referral_source_name = o.name; await persist('leads', l); }
    toast('Linked to ' + o.name + '.'); refresh();
  }
  function addFrom(i){
    const g = PR().unlinked(DATA.leads || [])[i]; if(!g || typeof openOrgModal !== 'function') return;
    openOrgModal(); const n = document.getElementById('org_name'); if(n) n.value = g.name;
    DESK.pendingLink = g.key;   /* after saving the new partner, link this group to it */
  }
  function who(v){ DESK.who = v; render(); }
  /* "Add as a new partner": once the new partner is saved, that group's referrals are linked to it */
  async function afterOrgSaved(o){
    const k = DESK.pendingLink; DESK.pendingLink = null; if(!k || !o) return;
    const g = PR().unlinked(DATA.leads || []).find(x => x.key === k); if(!g) return;
    for(const id of g.leads){ const l = (DATA.leads || []).find(x => x.id === id); if(!l) continue; l.referral_org_id = o.id; delete l.referral_org_suggest; await persist('leads', l); }
    toast(g.leads.length + ' referral' + (g.leads.length === 1 ? '' : 's') + ' linked to ' + o.name + '.');
  }

  /* ── log a visit (works on a phone) ── */
  function logOpen(id){
    const o = org(id); if(!o) return;
    const cs = (o.contacts || []).filter(c => c && !c.archived);
    const ov = document.createElement('div'); ov.className = 'pd-ov'; ov.id = 'pdLogOv';
    ov.innerHTML = '<div class="pd-dlg" role="dialog" aria-modal="true"><div class="pd-dlg-t">Log a touch · ' + esc(o.name) + '</div>'
      + '<label for="pdKind">What</label><select id="pdKind"><option value="dropby">Visit (drop-by)</option><option value="appointment">Appointment</option><option value="event">Event</option><option value="call">Call</option><option value="email">Email</option></select>'
      + '<label for="pdWhoSaw">Who</label><select id="pdWhoSaw"><option value="">Someone not on the list</option>' + cs.map(c => '<option value="' + esc(c.id) + '">' + esc(c.name) + (c.role ? ', ' + esc(c.role) : '') + '</option>').join('') + '</select>'
      + '<label for="pdNote">What happened <span class="pd-req">required</span></label><textarea id="pdNote" rows="3" placeholder="Who you saw, what was said, what they need from us"></textarea>'
      + '<label for="pdNext">Next touch (optional)</label><input type="date" id="pdNext" min="' + todayYmd() + '" value="' + esc(PR().addDays(todayYmd(), PR().look(o, ctx()).cadence)) + '">'
      + '<div class="pd-err" id="pdErr"></div><div class="pd-dlg-a"><button class="primary" id="pdSave">Save</button><button class="secondary" onclick="document.getElementById(\'pdLogOv\').remove()">Cancel</button></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('#pdSave').onclick = async () => {
      const note = ov.querySelector('#pdNote').value.trim(), kind = ov.querySelector('#pdKind').value, cid = ov.querySelector('#pdWhoSaw').value, next = ov.querySelector('#pdNext').value;
      if(!note){ ov.querySelector('#pdErr').textContent = 'Write a line about it, even a short one.'; return; }
      const c = cs.find(x => x.id === cid);
      const a = { id:uid(), org_id:o.id, kind, note:(c ? c.name + ': ' : '') + note, contact_id:cid || null, at:new Date().toISOString(), by:me() };
      DATA.referral_activities = DATA.referral_activities || []; DATA.referral_activities.push(a); await persist('referral_activities', a);
      if(next){ const t = { id:uid(), title:(kind === 'call' ? 'Call ' : 'Visit ') + o.name, kind:kind === 'call' ? 'call' : 'visit', due:next, lead_id:null, org_id:o.id, created_at:new Date().toISOString() };
        DATA.activities = DATA.activities || []; DATA.activities.push(t); await persist('activities', t); }
      ov.remove(); toast('Logged.' + (next ? ' Next touch ' + day(next) + '.' : '')); refresh();
    };
  }
  /* plan a visit: a line on your own desk (My Desk), or a next touch on Today when there's no desk */
  async function plan(id){
    const o = org(id); if(!o) return;
    if(typeof dkQuickJot === 'function'){ try{ await dkQuickJot('Visit ' + o.name, PR().look(o, ctx()).reasons.join('; '), '#referrers'); toast('On your desk.'); return; }catch(e){} }
    if(typeof openActivityModal === 'function') openActivityModal(null, o.id);
  }

  /* ── partner profile: owner, tier, potential, details, people ── */
  function profileCard(o){
    if(!PR() || !o) return '';
    const x = PR().look(o, ctx()), own = PR().ownerOf(o, st()), can = isOwner();
    const sel = (id, opts, v) => '<select id="' + id + '">' + opts.map(([k, l]) => '<option value="' + esc(k) + '"' + (k === (v || '') ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select>';
    return '<div class="card pd-prof" style="padding:16px 18px;margin-bottom:14px;"><div class="pd-head"><b>Relationship</b> ' + pill(x) + '</div>'
      + '<div class="field-note">' + esc(x.why) + ' · ' + esc(x.cadence_why) + '. Next: ' + esc(day(x.due)) + (x.last_touch ? ' (last touch ' + esc(day(x.last_touch)) + ')' : ' (never touched)') + '</div>'
      + '<div class="field-note">' + x.sent + ' referral' + (x.sent === 1 ? '' : 's') + ' · ' + x.became + ' became client' + (x.became === 1 ? '' : 's') + (x.last_referral ? ' · last ' + esc(day(x.last_referral)) : '') + '</div>'
      + '<div class="pd-grid">'
      + '<label>Owner</label>' + (can ? sel('pdOwner', people().map(p => [p.email, p.name]), own.email) : '<div>' + esc(own.email ? nameOf(own.email) : 'Needs an owner') + '</div>')
      + '<label>Relationship potential</label>' + sel('pdPot', [['', 'Not set'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']], o.potential)
      + '<label>Best way to reach them</label>' + sel('pdPref', [['', 'Not set'], ['visit', 'Visit'], ['call', 'Call'], ['email', 'Email'], ['text', 'Text']], o.preferred_contact)
      + '<label for="pdTimes">Best visit times</label><input id="pdTimes" value="' + esc(o.best_visit_times || '') + '" placeholder="e.g. Tue/Thu after 2, not Mondays">'
      + '<label for="pdMat">Materials they asked for</label><input id="pdMat" value="' + esc(o.materials || '') + '" placeholder="e.g. 20 brochures, the CDS one-pager">'
      + '<label for="pdRel">Relationship notes</label><textarea id="pdRel" rows="2" placeholder="What matters to them, who decides, what we promised">' + esc(o.relationship_notes || '') + '</textarea>'
      + '</div><button class="primary" style="margin-top:8px;" onclick="pdSaveProfile(\'' + esc(o.id) + '\')">Save</button> <span class="field-note" id="pdProfMsg"></span>'
      + peopleHtml(o) + '</div>';
  }
  function peopleHtml(o){
    const cs = (o.contacts || []).filter(c => c && !c.archived);
    return '<div class="pd-people"><div class="pd-head" style="margin-top:14px;"><b>People there</b><span style="flex:1"></span><button class="fb" onclick="pdPerson(\'' + esc(o.id) + '\')">Add a person</button></div>'
      + (cs.length ? cs.map(c => '<div class="pd-person"><div><b>' + esc(c.name) + '</b>' + (c.role ? ' · ' + esc(c.role) : '') + '</div>'
          + '<div class="field-note">' + [c.phone ? '<a' + (typeof ocAttrs === 'function' ? ocAttrs(c.phone, { email:c.email }) : ' href="#"') + '>' + esc(c.phone) + '</a>' : '', c.email ? esc(c.email) : '', c.preferred_contact ? 'prefers ' + esc(c.preferred_contact) : '', c.best_times ? 'best: ' + esc(c.best_times) : ''].filter(Boolean).join(' · ') + '</div>'
          + (c.materials || c.notes ? '<div class="field-note">' + esc([c.materials ? 'wants ' + c.materials : '', c.notes].filter(Boolean).join(' · ')) + '</div>' : '')
          + '<button class="linklike" onclick="pdPerson(\'' + esc(o.id) + '\',\'' + esc(c.id) + '\')">Edit</button></div>').join('')
        : '<div class="field-note">Nobody yet.' + (o.people ? ' The old note says: ' + esc(o.people) : '') + '</div>')
      + '</div>';
  }
  async function saveProfile(id){
    const o = org(id); if(!o) return; const v = k => (document.getElementById(k) || {}).value;
    const pot = v('pdPot') || '';
    if(pot !== (o.potential || '')){ o.potential = pot; o.potential_set_at = new Date().toISOString(); }
    o.preferred_contact = v('pdPref') || ''; o.best_visit_times = (v('pdTimes') || '').trim(); o.materials = (v('pdMat') || '').trim(); o.relationship_notes = (v('pdRel') || '').trim();
    if(isOwner() && v('pdOwner') && lc(v('pdOwner')) !== lc(PR().ownerOf(o, st()).email)){ o.owner_email = lc(v('pdOwner')); o.owner_assigned_at = new Date().toISOString(); o.owner_assigned_by = me(); }
    await persist('referral_orgs', o); const m = document.getElementById('pdProfMsg'); if(m) m.textContent = 'Saved.'; refresh();
  }
  function person(orgId, cid){
    const o = org(orgId); if(!o) return; const c = cid ? (o.contacts || []).find(x => x.id === cid) || {} : {};
    const ov = document.createElement('div'); ov.className = 'pd-ov'; ov.id = 'pdPerOv';
    const f = (id, label, val, ph) => '<label for="' + id + '">' + label + '</label><input id="' + id + '" value="' + esc(val || '') + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '>';
    ov.innerHTML = '<div class="pd-dlg" role="dialog" aria-modal="true"><div class="pd-dlg-t">' + (cid ? 'Edit' : 'Add') + ' a person · ' + esc(o.name) + '</div>'
      + f('pcName', 'Name <span class="pd-req">required</span>', c.name) + f('pcRole', 'Role', c.role, 'e.g. discharge planner, social worker') + f('pcPhone', 'Phone', c.phone) + f('pcEmail', 'Email', c.email)
      + '<label for="pcPref">Best way to reach them</label><select id="pcPref">' + [['', 'Not set'], ['visit', 'Visit'], ['call', 'Call'], ['email', 'Email'], ['text', 'Text']].map(([k, l]) => '<option value="' + k + '"' + ((c.preferred_contact || '') === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>'
      + f('pcTimes', 'Best times', c.best_times) + f('pcMat', 'Materials they asked for', c.materials) + f('pcNotes', 'Notes', c.notes)
      + '<div class="pd-err" id="pcErr"></div><div class="pd-dlg-a"><button class="primary" id="pcSave">Save</button>' + (cid ? '<button class="secondary" id="pcArch">No longer there</button>' : '') + '<button class="secondary" onclick="document.getElementById(\'pdPerOv\').remove()">Cancel</button></div></div>';
    document.body.appendChild(ov);
    const val = k => ov.querySelector('#' + k).value.trim();
    ov.querySelector('#pcSave').onclick = async () => {
      if(!val('pcName')){ ov.querySelector('#pcErr').textContent = 'A name is needed.'; return; }
      const row = Object.assign({}, c, { id:c.id || uid(), name:val('pcName'), role:val('pcRole'), phone:val('pcPhone'), email:val('pcEmail').toLowerCase(), preferred_contact:ov.querySelector('#pcPref').value, best_times:val('pcTimes'), materials:val('pcMat'), notes:val('pcNotes'), updated_at:new Date().toISOString(), created_at:c.created_at || new Date().toISOString() });
      o.contacts = (o.contacts || []).filter(x => x.id !== row.id).concat([row]);
      await persist('referral_orgs', o); ov.remove(); refresh();
    };
    if(cid) ov.querySelector('#pcArch').onclick = async () => { c.archived = true; c.updated_at = new Date().toISOString(); await persist('referral_orgs', o); ov.remove(); refresh(); };
  }

  /* ── the lead's partner card: who referred (one of the partner's people) ── */
  function leadWhoHtml(l, o){
    if(!PR() || !l || !o) return '';
    const cs = (o.contacts || []).filter(c => c && !c.archived), cur = cs.find(c => c.id === l.referral_contact_id);
    const hit = !cur && l.referrer ? PR().contactFor(o, l.referrer) : null;
    if(!cs.length && !l.referrer) return '';
    return '<div class="field-note" style="margin-top:6px;">Who referred: ' + (cur ? '<b>' + esc(cur.name) + '</b>' + (cur.role ? ', ' + esc(cur.role) : '') : 'not set')
      + (hit ? ' · <a href="javascript:void(0)" onclick="pdLeadWho(\'' + esc(l.id) + '\',\'' + esc(hit.id) + '\')">It\'s ' + esc(hit.name) + ' (same ' + (lc(hit.email) && lc(hit.email) === lc(l.referrer.email) ? 'email' : 'phone') + ')</a>' : '')
      + (cs.length ? ' · <select onchange="pdLeadWho(\'' + esc(l.id) + '\',this.value)"><option value="">Pick…</option>' + cs.map(c => '<option value="' + esc(c.id) + '"' + (cur && cur.id === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select>' : '') + '</div>';
  }
  async function leadWho(leadId, cid){ const l = (DATA.leads || []).find(x => x.id === leadId); if(!l) return; l.referral_contact_id = cid || null; await persist('leads', l); toast('Saved.'); try{ if(typeof lwRender === 'function') lwRender(); }catch(e){} }

  /* ── Today: counted lines, nothing stored ── */
  function myDayRows(rowFn){
    if(!PR() || typeof rowFn !== 'function') return [];
    const c = ctx(), out = [], mine = PR().week(orgs(), c, me());
    if(mine.length) out.push(rowFn('var(--teal)', 'i-calendar', 'Partner visits this week: ' + mine.length, esc(mine.slice(0, 3).map(x => x.name).join(', ') + (mine.length > 3 ? ' and more' : '')), 'PARTNERS', 'var(--teal)', 'var(--teal-bg, #E4F1F3)', '', 'Open', "switchTab('referrers')"));
    if(isOwner()){ const n = PR().needsOwner(orgs(), c).length; if(n) out.push(rowFn('var(--gold)', 'i-person', 'Partners needing an owner: ' + n, 'New partners wait here until you assign them', 'ASSIGN', 'var(--gold-text)', 'var(--amber-bg)', '', 'Open', "switchTab('referrers')")); }
    return out;
  }
  /* ── My Work: one card per owner per week (fixed id), kept in step with the week's list, closed when it's done ── */
  let lastEnsure = 0;
  async function ensureWeeklyCard(force){
    if(!PR() || !me() || typeof persist !== 'function' || !Array.isArray(DATA.ops_items)) return;
    if(!force && Date.now() - lastEnsure < 60000) return; lastEnsure = Date.now();
    const c = ctx(), wk = PR().week(orgs(), c, me()), id = PR().weeklyCardId(me(), c.today), cur = DATA.ops_items.find(x => x && x.id === id), fri = PR().weekOf(c.today).start;
    const title = 'Your partner outreach this week (' + wk.length + ')', detail = wk.slice(0, 6).map(x => x.name + ': ' + x.reasons[0]).join('\n') + (wk.length > 6 ? '\n…and ' + (wk.length - 6) + ' more' : '');
    if(!cur && !wk.length) return;
    if(!cur){ const it = { id, kind:'partner_week', status:'open', source_type:'partner_desk', owner:me(), owner_name:(typeof ME !== 'undefined' && ME.name) || me(), title, detail, link:'#referrers', urgency:'normal',
        due:new Date(PR().addDays(fri, 4) + 'T17:00:00-05:00').toISOString(), created_by:'partner desk', opened_by:'partner desk', created_at:new Date().toISOString() };
      DATA.ops_items.push(it); await persist('ops_items', it); return; }
    if(cur.status === 'open' && !wk.length){ Object.assign(cur, { status:'done', closed_at:new Date().toISOString(), closed_by:'partner desk', close_note:'This week\'s partner outreach is done' }); await persist('ops_items', cur); return; }
    if(cur.status === 'open' && (cur.title !== title || cur.detail !== detail)){ Object.assign(cur, { title, detail, updated_at:new Date().toISOString() }); await persist('ops_items', cur); }
  }

  /* ── Settings: tier timing, tier rules, default owner, towns (owners; logged) ── */
  function setFill(){
    const box = document.getElementById('pdSet'); if(!box || !PR()) return;
    const S = PR().settings(st()), can = isOwner(), dis = can ? '' : ' disabled';
    const num = (id, v, label) => '<label for="' + id + '">' + label + '</label><input type="number" min="1" max="3650" id="' + id + '" value="' + v + '"' + dis + '>';
    box.innerHTML = '<div class="pd-grid pd-set">' + num('pdsA', S.cadence.A, 'A partners: every … days') + num('pdsB', S.cadence.B, 'B partners: every … days') + num('pdsC', S.cadence.C, 'C partners: every … days')
      + num('pdsNew', S.cadence.new, 'New partner: follow up … days after the first visit') + num('pdsAd', S.a_days, 'A: a client started within … days') + num('pdsAc', S.a_count, 'A: or this many referrals in 12 months (with high potential)')
      + num('pdsPd', S.priority_days, 'Priority (new or high potential): A timing for … days')
      + '<label for="pdsOwn">Default owner (existing partners, and new ones until assigned)</label><select id="pdsOwn"' + dis + '>' + people().map(p => '<option value="' + esc(p.email) + '"' + (p.email === lc(S.default_owner) ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select>'
      + '<label for="pdsTowns">Towns we serve (one per line; used by the staffing sheet)</label><textarea id="pdsTowns" rows="6"' + dis + '>' + esc((S.towns.length ? S.towns : DEFAULT_TOWNS).join('\n')) + '</textarea></div>'
      + (can ? '<button class="primary" style="margin-top:8px;" onclick="pdSetSave(this)">Save</button> <span class="field-note" id="pdSetMsg"></span>' : '<div class="field-note">Only an owner can change these.</div>');
  }
  async function setSave(b){
    if(!isOwner()) return; const v = id => document.getElementById(id).value;
    const next = { cadence:{ A:+v('pdsA'), B:+v('pdsB'), C:+v('pdsC'), new:+v('pdsNew') }, a_days:+v('pdsAd'), a_count:+v('pdsAc'), priority_days:+v('pdsPd'), default_owner:lc(v('pdsOwn')),
      towns:v('pdsTowns').split('\n').map(t => t.trim()).filter(Boolean) };
    const bad = Object.values(next.cadence).concat([next.a_days, next.a_count, next.priority_days]).some(n => !(n >= 1 && n <= 3650));
    const msg = document.getElementById('pdSetMsg'); if(bad){ if(msg) msg.textContent = 'Each number must be between 1 and 3650.'; return; }
    if(b) b.disabled = true;
    const out = await tkMerge(m => { const was = m.partner_desk || {}; m.partner_desk = Object.assign({}, was, next, { since:was.since || PR().DEFAULTS.since });
      return JSON.stringify(was) === JSON.stringify(m.partner_desk) ? [] : ['referral partner desk settings: A ' + next.cadence.A + 'd, B ' + next.cadence.B + 'd, C ' + next.cadence.C + 'd, new +' + next.cadence.new + 'd, default owner ' + next.default_owner + ', ' + next.towns.length + ' towns']; }, 'Referral partner desk');
    if(b) b.disabled = false;
    if(out && out.error){ if(msg) msg.textContent = 'Could not save: ' + out.error.message; return; }
    DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { partner_desk:Object.assign({}, (DATA.ops_settings || {}).partner_desk || {}, next) }); if(msg) msg.textContent = 'Saved.'; refresh();
  }
  /* her service area (mo-care.com/service-area, CDS-only towns left out); editable above */
  const DEFAULT_TOWNS = ['Springfield', 'Nixa', 'Ozark', 'Republic', 'Willard', 'Rogersville', 'Battlefield', 'Strafford', 'Ash Grove', 'Fair Grove', 'Halltown', 'Walnut Grove', 'Billings', 'Clever', 'Fremont Hills', 'Highlandville', 'Sparta', 'Spokane',
    'Marshfield', 'Seymour', 'Fordland', 'Diggins', 'Niangua', 'Branson', 'Forsyth', 'Hollister', 'Kirbyville', 'Kissee Mills', 'Merriam Woods', 'Rockaway Beach', 'Taneyville', 'Ava', 'Bolivar', 'Humansville', 'Fair Play', 'Flemington', 'Morrisville', 'Aldrich',
    'Rolla', 'St. James', 'Newburg', 'Edgar Springs'];

  function toast(m){ if(typeof ccToast === 'function') ccToast(m); }
  function refresh(){ render(); try{ if(typeof renderRefDashboard === 'function') renderRefDashboard(); }catch(e){} try{ if(typeof REF_PROF !== 'undefined' && REF_PROF && typeof renderRefProfile === 'function') renderRefProfile(); }catch(e){} ensureWeeklyCard(true); }

  if(!document.getElementById('pdCss')){ const s = document.createElement('style'); s.id = 'pdCss'; s.textContent = [
    '.pd-desk{padding:14px 16px;margin-bottom:12px}.pd-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.pd-head b{color:var(--navy);font-size:15px}.pd-sub{margin:2px 0 6px}',
    '.pd-row{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:9px 0;border-top:1px solid var(--border)}.pd-main{flex:1 1 260px;min-width:0}.pd-main a{color:var(--navy);text-decoration:none}',
    '.pd-acts{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.pd-acts select{width:auto;max-width:200px}.pd-btn{display:inline-flex;align-items:center;text-decoration:none}',
    '.pd-pill{display:inline-block;font-size:11px;font-weight:800;padding:3px 7px;border-radius:999px;vertical-align:1px}.pd-p{background:#FDF1DC;color:#8A5A12}.pd-a{background:#E4F1F3;color:#1F7A8C}.pd-b{background:#EAF1F8;color:#0D365F}.pd-c{background:#EEF0F2;color:#5D6B78}',
    '.pd-seg{display:inline-flex;border:1px solid var(--border);border-radius:8px;overflow:hidden}.pd-seg button{border:0;background:transparent;padding:6px 10px;font-size:12.5px;cursor:pointer}.pd-seg button.on{background:var(--navy);color:#fff}',
    '.pd-grid{display:grid;grid-template-columns:minmax(140px,max-content) minmax(0,1fr);gap:8px 12px;align-items:center;margin-top:10px}.pd-grid label{font-size:12.5px;color:var(--text-muted);font-weight:600}',
    '.pd-person{padding:8px 0;border-top:1px dashed var(--border);font-size:13.5px}',
    '.pd-ov{position:fixed;inset:0;background:rgba(13,54,95,.35);display:flex;align-items:center;justify-content:center;z-index:9000;padding:16px}.pd-dlg{background:#fff;border-radius:12px;padding:18px;width:100%;max-width:460px;max-height:90vh;overflow:auto;display:flex;flex-direction:column;gap:6px}',
    '.pd-dlg-t{font-weight:800;color:var(--navy);font-size:16px;margin-bottom:4px}.pd-dlg label{font-size:12.5px;font-weight:600;color:var(--text-muted);margin-top:4px}.pd-dlg-a{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.pd-err{color:var(--red);font-size:13px}.pd-req{color:var(--red);font-weight:700;font-size:11px}',
    '@media (max-width:640px){.pd-grid{grid-template-columns:1fr}.pd-acts{width:100%}.pd-acts>*{flex:1 1 auto}.pd-acts select{max-width:none}#refKpis{grid-template-columns:repeat(2,1fr)!important}.pd-dlg{max-width:none}}'
  ].join(''); document.head.appendChild(s); }

  Object.assign(window, { pdRender:render, pdDeskHtml:deskHtml, pdWho:who, pdAssign:assign, pdLink:link, pdAddFrom:addFrom, pdLogOpen:logOpen, pdPlan:plan, pdProfileCard:profileCard,
    pdSaveProfile:saveProfile, pdPerson:person, pdLeadWhoHtml:leadWhoHtml, pdLeadWho:leadWho, pdMyDayRows:myDayRows, pdEnsureWeeklyCard:ensureWeeklyCard, pdSetFill:setFill, pdSetSave:setSave,
    PD_STATE:DESK, PD_DEFAULT_TOWNS:DEFAULT_TOWNS, pdAfterOrgSaved:afterOrgSaved });
})();
