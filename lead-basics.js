/* lead-basics.js · the basics, right at the top of a lead (Samantha 2026-10-15: "laura called and gave a ton of information.
   The Top of the overview should be basic information right there name, address, number of hours, care needs, etc. its
   so damn hard to find out where to even edit the name of the lead ... why when you have the full transcript of the call does
   it still say caller for the name". Approved mockup: https://claude.ai/artifact/LxGSCg9exDnY5J2EQpRwsU, "Yes, build it").

   - One Basics card at the top of a lead's Overview: the client, who called, where the client lives, the hours and care
     asked for, why now, how they'll pay, when they want to start. Each line edits in place ("edit"); "Edit all" opens the
     full lead form. Lines still to ask are red.
   - Filled from the call by itself: when a lead with a call has empty basics, the calls are read (call-to-lead read_lead,
     the same reading as Fill from the call) and ONLY the empty lines are filled. They are yellow ("heard on the call")
     until someone checks or edits them. Where the call said something different from what is typed, the card shows "the
     call said ..." with Use this / Keep ours. Nothing is ever sent to the family.
   - The lead is always the client: the title is the client's name; with no client name yet, "Carol Meyer's mother".
   - Hours: when a family gives days and times instead of a total ("5:30 to 9:30 pm M-F and 8 am to 9:30 pm Sat and Sun"),
     the card adds them up (hoursFromText) and shows "about 47 h a week". */
(function(){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const R = () => window.LeadRules;
  const S = { edit:'', busy:{}, tried:{} };
  const lead = id => ((typeof DATA !== 'undefined' && DATA.leads) || []).find(l => l && String(l.id) === String(id));
  const me = () => ((typeof ccActor === 'function' && ccActor()) || {}).email || '';
  const PLACE = /^\(phone lead\)$/i;
  const blank = v => v === '' || v == null || v === false || (Array.isArray(v) && !v.length) || PLACE.test(String(v).trim());
  const NEEDS = { personalCare:'Personal care', dementia:'Dementia care', transportation:'Rides', housekeeping:'Housekeeping', respite:'Respite', overnight:'Overnight' };
  const PAY = { private:'Private pay', ltc:'Long-term care insurance', va:'VA', guide:'Medicare GUIDE', cds:'CDS', medicaid:'Medicaid (no longer accepted)' };
  const START = { asap:'As soon as possible', this_week:'This week', this_month:'This month', by_date:'By a date', planning:'Planning ahead' };

  /* ── hours from days and times ── */
  const DAYW = { mon:0, monday:0, m:0, tue:1, tues:1, tuesday:1, tu:1, wed:2, wednesday:2, w:2, thu:3, thur:3, thurs:3, thursday:3, th:3, r:3, fri:4, friday:4, f:4, sat:5, saturday:5, sa:5, sun:6, sunday:6, su:6 };
  function daysIn(t){
    t = ' ' + String(t || '').toLowerCase().replace(/[.,]/g, ' ') + ' ';
    if(/\b(every ?day|daily|7 days|seven days|24\/7)\b/.test(t)) return 7;
    let n = 0;
    if(/\b(weekdays?|week days)\b/.test(t)) n += 5;
    if(/\b(weekends?|week ends)\b/.test(t)) n += 2;
    const rng = t.match(/\b(mon(?:day)?|m|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs?(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\s*(?:-|–|to|through|thru)\s*(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs?(?:day)?)?|fri(?:day)?|f|sat(?:urday)?|sun(?:day)?)\b/);
    if(rng){ const a = DAYW[rng[1]], b = DAYW[rng[2]]; if(a != null && b != null) n += (b >= a ? b - a : b + 7 - a) + 1; }
    else {
      const named = new Set(); (t.match(/\b(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs?(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/g) || []).forEach(w => { if(DAYW[w] != null) named.add(DAYW[w]); });
      n += named.size;
    }
    return n;
  }
  function clock(h, m, ap, fallbackAp){
    h = Number(h); m = Number(m || 0); ap = (ap || fallbackAp || '').toLowerCase();
    if(ap === 'pm' && h < 12) h += 12; if(ap === 'am' && h === 12) h = 0;
    return h + m / 60;
  }
  /* "5:30-9:30pm M-F and all day 8am-9:30pm Sat and Sun" → 47 (null when it can't tell) */
  function hoursFromText(text){
    const t = String(text || '');
    const re = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\s*(?:-|–|to|until|till)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/gi;
    const hits = []; let m;
    while((m = re.exec(t))){ hits.push({ m, at:m.index, end:m.index + m[0].length }); }
    if(!hits.length) return null;
    let total = 0, any = false;
    hits.forEach((h, i) => {
      const ap1 = (h.m[3] || '').replace(/\./g, ''), ap2 = (h.m[6] || '').replace(/\./g, '');
      let a = clock(h.m[1], h.m[2], ap1, ap2 && Number(h.m[1]) <= Number(h.m[4]) ? ap2 : ''), b = clock(h.m[4], h.m[5], ap2, '');
      if(!ap2 && !ap1 && b <= a) b += 12;
      let len = b - a; if(len <= 0) len += 24;
      if(len > 24) return;
      const after = t.slice(h.end, i + 1 < hits.length ? hits[i + 1].at : t.length), before = t.slice(i ? hits[i - 1].end : 0, h.at);
      const d = daysIn(after) || daysIn(before);
      if(!d) return;
      total += len * d; any = true;
    });
    return any ? Math.round(total * 2) / 2 : null;
  }

  /* ── what the card shows ── */
  function age(dob){ if(!/^\d{4}-\d{2}-\d{2}$/.test(String(dob || ''))) return ''; const d = new Date(dob + 'T12:00:00'), n = new Date(); let a = n.getFullYear() - d.getFullYear(); if(n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a > 0 && a < 120 ? a : ''; }
  const clientName = l => blank(l.client_first_name) && blank(l.client_last_name) ? '' : [l.client_first_name, l.client_last_name].filter(x => !blank(x)).join(' ').trim();
  const callerName = l => [l.first_name, l.last_name].filter(x => !blank(x)).join(' ').trim();
  const KIN = { daughter:'mother', son:'mother', 'daughter-in-law':'mother-in-law', 'son-in-law':'mother-in-law', wife:'husband', husband:'wife', spouse:'spouse', granddaughter:'grandmother', grandson:'grandmother', niece:'aunt', nephew:'aunt', sister:'sister', brother:'brother' };
  /* the title when we don't know the client's name yet: "Carol Meyer's mother" (her father when the client is male) */
  function titleFor(l){
    const c = clientName(l); if(c) return c;
    const who = callerName(l), rel = String(l.relationship || '').trim().toLowerCase();
    if(who && rel && rel !== 'self' && rel !== 'client'){
      let k = KIN[rel] || 'family member';
      if(/^male$|^m$/i.test(String(l.client_gender || ''))) k = k.replace('mother', 'father').replace('grandmother', 'grandfather').replace('aunt', 'uncle').replace('wife', 'husband');
      return who + '\'s ' + k;
    }
    return '';
  }
  function hoursOf(l){
    const s = R().schedule(l) || {};
    const n = Number(l.number_of_hours) || Number(s.hours_per_week) || 0;
    if(n) return { n, from:'' };
    const t = [s.times, l.times_needed, s.days_text, l.days_needed].filter(Boolean).join(' ');
    const g = hoursFromText(t);
    return g ? { n:g, from:'added up from the days and times' } : { n:0, from:'' };
  }
  function lines(l){
    const pf = (l.call_profile && l.call_profile.facts) || {};
    const s = R().schedule(l) || {}, h = hoursOf(l), ds = R().desiredStart(l);
    const where = [l.client_address, [l.client_city, l.client_zip].filter(Boolean).join(' ')].filter(x => !blank(x)).join(', ');
    const county = l.county || (window.FutureOpps && FutureOpps.countyFor(l)) || '';
    const tier = county && window.FutureOpps ? FutureOpps.TIER_WORD[FutureOpps.tierOf(county)] : '';
    const nd = (l.needs || []).map(k => NEEDS[k]).filter(Boolean), said = nd.join(' ').toLowerCase();
    const needs = nd.concat((l.medical_conditions || []).map(c => String(c).replace(/_/g, ' ')).filter(c => said.indexOf(c.toLowerCase()) < 0 && !(c === 'alzheimers' && /dementia/.test(said))));
    return [
      { k:'client', label:'Client', v:clientName(l) ? clientName(l) + (age(l.client_dob) ? ', ' + age(l.client_dob) : '') : '', ask:'Who needs care?' },
      { k:'caller', label:'Who called', v:callerName(l) ? callerName(l) + (l.relationship ? ', ' + String(l.relationship).toLowerCase() : '') : '', ask:'Their name and how they are related' },
      { k:'where', label:'Where the client lives', v:[pf.facility_name, where, county ? county + ' County' + (tier ? ', ' + tier : '') : ''].filter(Boolean).join(' · '), ask:'Town and address' },
      { k:'hours', label:'Hours asked', v:h.n ? 'About ' + h.n + ' h a week' + (s.times || l.times_needed ? ' · ' + (s.times || l.times_needed) : '') + (h.from ? ' (' + h.from + ')' : '') : (s.times || l.times_needed || ''), ask:'How many hours, which days and times' },
      { k:'needs', label:'Care needs', v:needs.join(', ') + (l.mobility ? (needs.length ? ' · ' : '') + 'mobility: ' + l.mobility : ''), ask:'What help they need' },
      { k:'why', label:'Why now', v:l.why_called || (Array.isArray(pf.why_now) ? pf.why_now.join(', ').replace(/_/g, ' ') : pf.why_now || ''), ask:'What made them call now' },
      { k:'payer', label:'Pays with', v:PAY[l.funding_source] || '', ask:'How they will pay' },
      { k:'start', label:'Start', v:ds ? R().desiredStartWords(l) : '', ask:'When they want to start' },
    ];
  }
  /* ── the card ── */
  function html(l){
    if(!l || !R()) return '';
    const L = lines(l), heard = l.basics_heard || {}, filled = L.filter(x => x.v).length, nHeard = L.filter(x => x.v && heard[x.k]).length;
    const busy = S.busy[l.id];
    const diffs = Array.isArray(l.basics_differs) ? l.basics_differs : [];
    return '<div class="card lb2-card" id="lbBasics"><div class="lb2-head"><b>Basics</b><span class="field-note">' + filled + ' of ' + L.length + ' filled'
      + (nHeard ? ' · ' + nHeard + ' heard on the call (yellow: check them)' : '') + (busy ? ' · reading the call…' : '') + '</span><span style="flex:1;"></span>'
      + (l.ghl_contact_id || l.phone ? '<button class="lb-btn" onclick="LeadBasics.fill(\'' + esc(l.id) + '\', true)"' + (busy ? ' disabled' : '') + '>Fill from the call</button>' : '')
      + '<button class="lb-btn" onclick="openLeadModal(\'' + esc(l.id) + '\')">Edit all</button></div>'
      + (diffs.length ? '<div class="lb2-diff">' + diffs.map((d, i) => '<div><b>The call said</b> ' + esc(d.label) + ': "' + esc(d.call) + '" (we have "' + esc(d.now) + '") <button class="linklike" onclick="LeadBasics.useCall(\'' + esc(l.id) + '\', ' + i + ')">Use this</button> · <button class="linklike" onclick="LeadBasics.keepOurs(\'' + esc(l.id) + '\', ' + i + ')">Keep ours</button></div>').join('') + '</div>' : '')
      + '<div class="lb2-grid">' + L.map(x => '<div class="lb2-f' + (x.v && heard[x.k] ? ' lb2-heard' : '') + (x.v ? '' : ' lb2-miss') + '" data-basic="' + x.k + '">'
        + '<span class="lb2-k">' + esc(x.label) + ' <button class="linklike lb2-pen" onclick="LeadBasics.edit(\'' + esc(l.id) + '\', \'' + x.k + '\')">edit</button>'
        + (x.v && heard[x.k] ? ' <button class="linklike lb2-pen" onclick="LeadBasics.checked(\'' + esc(l.id) + '\', \'' + x.k + '\')">looks right</button>' : '') + '</span>'
        + (S.edit === l.id + ':' + x.k ? editHtml(l, x.k) : '<span class="lb2-v">' + esc(x.v || 'Not asked yet: ' + x.ask.toLowerCase()) + '</span>') + '</div>').join('') + '</div></div>';
  }
  const inp = (id, v, ph, type) => '<input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(v || '') + '" placeholder="' + esc(ph || '') + '">';
  function editHtml(l, k){
    const id = esc(l.id), save = '<div class="lb2-btns"><button class="primary" onclick="LeadBasics.save(\'' + id + '\', \'' + k + '\')">Save</button><button class="ghost" onclick="LeadBasics.edit(\'' + id + '\', \'\')">Cancel</button></div>';
    const s = R().schedule(l) || {}, ds = R().desiredStart(l) || {};
    const f = {
      client:() => inp('lb2_cf', l.client_first_name, 'First name') + inp('lb2_cl', l.client_last_name, 'Last name') + '<label class="lb2-l">Birth date' + inp('lb2_dob', l.client_dob, '', 'date') + '</label>',
      caller:() => inp('lb2_f', blank(l.first_name) ? '' : l.first_name, 'First name') + inp('lb2_l', l.last_name, 'Last name') + inp('lb2_rel', l.relationship, 'Relationship to the client (daughter, son, wife…)'),
      where:() => inp('lb2_addr', l.client_address, 'Street address') + inp('lb2_city', l.client_city, 'Town') + inp('lb2_zip', l.client_zip, 'Zip') + inp('lb2_county', l.county, 'County'),
      hours:() => inp('lb2_hours', l.number_of_hours || s.hours_per_week || '', 'Hours a week (leave empty to add up the times)') + inp('lb2_times', s.times || l.times_needed, 'Days and times, e.g. 5:30 to 9:30 pm Mon to Fri'),
      needs:() => '<div class="lb2-checks">' + Object.keys(NEEDS).map(n => '<label><input type="checkbox" value="' + n + '"' + ((l.needs || []).indexOf(n) > -1 ? ' checked' : '') + '> ' + NEEDS[n] + '</label>').join('') + '</div>',
      why:() => '<textarea id="lb2_why" rows="2" placeholder="Why they called now">' + esc(l.why_called || '') + '</textarea>',
      payer:() => '<select id="lb2_pay"><option value="">Not asked</option>' + Object.keys(PAY).filter(p => p !== 'medicaid' || l.funding_source === 'medicaid').map(p => '<option value="' + p + '"' + (l.funding_source === p ? ' selected' : '') + '>' + PAY[p] + '</option>').join('') + '</select>',
      start:() => '<select id="lb2_sk"><option value="">Not asked</option>' + Object.keys(START).map(p => '<option value="' + p + '"' + (ds.kind === p ? ' selected' : '') + '>' + START[p] + '</option>').join('') + '</select>' + inp('lb2_sd', ds.date || '', '', 'date'),
    }[k];
    return '<div class="lb2-edit">' + (f ? f() : '') + save + '</div>';
  }
  const val = id => { const e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; };
  async function save(id, k){
    const l = lead(id); if(!l) return;
    const p = {};
    if(k === 'client'){ p.client_first_name = val('lb2_cf'); p.client_last_name = val('lb2_cl'); p.client_dob = val('lb2_dob'); if(p.client_first_name || p.client_last_name) p.client_name_not_provided = false; }
    if(k === 'caller'){ p.first_name = val('lb2_f'); p.last_name = val('lb2_l'); p.relationship = val('lb2_rel'); }
    if(k === 'where'){ p.client_address = val('lb2_addr'); p.client_city = val('lb2_city'); p.client_zip = val('lb2_zip'); p.county = val('lb2_county').replace(/\s+county$/i, ''); }
    if(k === 'hours'){ const t = val('lb2_times'), h = val('lb2_hours'); p.times_needed = t; p.number_of_hours = h || (hoursFromText(t) || ''); }
    if(k === 'needs'){ p.needs = [...document.querySelectorAll('#lbBasics .lb2-checks input:checked')].map(x => x.value).concat((l.needs || []).filter(n => !NEEDS[n])); }
    if(k === 'why') p.why_called = val('lb2_why');
    if(k === 'payer') p.funding_source = val('lb2_pay');
    if(k === 'start'){ p.desired_start_kind = val('lb2_sk'); p.desired_start_date = val('lb2_sd'); }
    R().compose(l, p);
    l.basics_heard = Object.assign({}, l.basics_heard || {}); delete l.basics_heard[k];
    l.basics_edited = Object.assign({}, l.basics_edited || {}, { [k]:{ by:me(), at:new Date().toISOString() } });
    S.edit = ''; await persist('leads', l); redraw();
  }
  async function checked(id, k){ const l = lead(id); if(!l) return; l.basics_heard = Object.assign({}, l.basics_heard || {}); delete l.basics_heard[k]; await persist('leads', l); redraw(); }

  /* ── filled from the call (only empty lines) ── */
  const LINE_OF = { client_first_name:'client', client_last_name:'client', client_dob:'client', first_name:'caller', last_name:'caller', relationship:'caller',
    client_address:'where', client_city:'where', client_zip:'where', client_state:'where', number_of_hours:'hours', times_needed:'hours', schedule_days:'hours',
    needs:'needs', medical_conditions:'needs', mobility:'needs', why_called:'why', funding_source:'payer', desired_start_kind:'start', desired_start_date:'start', client_gender:'client' };
  const LABEL = { client_first_name:'client\'s first name', client_last_name:'client\'s last name', first_name:'caller\'s first name', last_name:'caller\'s last name', relationship:'relationship',
    client_address:'address', client_city:'town', client_zip:'zip', number_of_hours:'hours a week', times_needed:'days and times', funding_source:'payer', why_called:'why now' };
  /* d = call-to-lead read_lead's answer. Returns how many lines were filled. Pure enough to test: no saving here. */
  function apply(l, d){
    const p = (d && d.prefill) || {}, heard = new Set((d && d.heard) || []), form = R().toForm(l), patch = {}, lineHit = {};
    const diffs = Array.isArray(l.basics_differs) ? l.basics_differs.slice() : [];
    Object.keys(LINE_OF).forEach(k => {
      if(!(k in p) || blank(p[k])) return;
      if(!heard.has(k) && ['first_name', 'last_name'].indexOf(k) < 0) return;   /* GoHighLevel's own name fills an empty caller name; nothing else unheard */
      const now = k === 'number_of_hours' ? (form.number_of_hours || (R().schedule(l) || {}).hours_per_week || '') : k === 'times_needed' ? (form.times_needed || (R().schedule(l) || {}).times || '') : form[k];
      if(blank(now) || (k === 'first_name' && PLACE.test(String(now)))){ patch[k] = p[k]; lineHit[LINE_OF[k]] = true; return; }
      if(Array.isArray(now) || Array.isArray(p[k])) return;
      if(LABEL[k] && String(now).trim().toLowerCase() !== String(p[k]).trim().toLowerCase() && !diffs.some(x => x.k === k && x.call === String(p[k])))
        diffs.push({ k, label:LABEL[k], now:String(now), call:String(p[k]) });
    });
    /* hours: a schedule with no total gets one added up */
    if(!patch.number_of_hours && blank(form.number_of_hours) && !(R().schedule(l) || {}).hours_per_week){ const g = hoursFromText(patch.times_needed || p.times_needed); if(g){ patch.number_of_hours = String(g); lineHit.hours = true; } }
    if(Object.keys(patch).length) R().compose(l, patch);
    if(PLACE.test(String(l.first_name || ''))) l.first_name = '';
    /* the call's Home & Life facts (facility, why now) where none are kept yet */
    const pf = d && d.profile;
    if(pf && pf.facts){ const pr = Object.assign({ facts:{}, people:[], filed:{} }, l.call_profile || {}); const before = JSON.stringify(pr.facts); pr.facts = Object.assign({}, pf.facts, pr.facts);
      if(JSON.stringify(pr.facts) !== before){ l.call_profile = pr; if(pf.facts.facility_name && !JSON.parse(before).facility_name) lineHit.where = true; } }
    l.basics_heard = Object.assign({}, l.basics_heard || {}, lineHit);
    l.basics_differs = diffs.slice(-12);
    const calls = (d && d.calls && d.calls.length ? d.calls : [d && d.call]).filter(Boolean), list = Array.isArray(l.from_calls) ? l.from_calls.slice() : [];
    calls.forEach(c => { if(c.message_id && !list.some(x => x && x.message_id === c.message_id)) list.push({ message_id:c.message_id, at:c.at || '', by:'basics', linked_at:new Date().toISOString() }); });
    l.from_calls = list;
    l.basics_filled_at = new Date().toISOString();
    return Object.keys(lineHit).length;
  }
  const needsFill = l => lines(l).some(x => !x.v) && !!(l.ghl_contact_id || l.phone);
  const lastCall = l => String((Array.isArray(l.contact_events) ? l.contact_events : []).filter(e => e && e.channel === 'call' && e.outcome === 'connected').map(e => e.at).sort().pop() || l.last_call_at || '');
  /* by itself: once per lead, and again after a newer answered call; a person can always press Fill from the call */
  async function fill(id, force){
    const l = lead(id); if(!l || S.busy[id] || !window.CallLead || !CallLead.readLead) return;
    if(!force){ if(!needsFill(l) || S.tried[id]) return; const at = String(l.basics_filled_at || l.basics_checked_at || ''); if(at && at >= lastCall(l)) return; }
    S.busy[id] = true; S.tried[id] = true; redraw();
    try{
      const d = await CallLead.readLead(id);
      const fresh = lead(id) || l;
      if(!d || !d.call){ fresh.basics_checked_at = new Date().toISOString(); if(force && typeof ccToast === 'function') ccToast((d && d.note) || 'No answered call with a transcript was found for this family.'); await persist('leads', fresh); return; }
      const n = apply(fresh, d);
      await persist('leads', fresh);
      if(typeof ccToast === 'function') ccToast(n ? n + ' line' + (n === 1 ? '' : 's') + ' filled from the call (yellow until you check them).' : 'The call had nothing new for the empty lines.');
    }catch(e){ if(force && typeof ccToast === 'function') ccToast('⚠ Could not read the call: ' + (e && e.message || e)); }
    finally{ delete S.busy[id]; redraw(); }
  }
  async function useCall(id, i){ const l = lead(id); const d = l && (l.basics_differs || [])[i]; if(!d) return; const p = { [d.k]:d.call }; if(d.k === 'times_needed'){ const g = hoursFromText(d.call); if(g) p.number_of_hours = String(g); } R().compose(l, p); l.basics_differs.splice(i, 1); await persist('leads', l); redraw(); }
  async function keepOurs(id, i){ const l = lead(id); if(!l || !l.basics_differs) return; l.basics_differs.splice(i, 1); await persist('leads', l); redraw(); }
  function redraw(){ try{ if(typeof lwRender === 'function') lwRender(); }catch(e){} }
  /* the leads nobody has opened yet: one at a time, at most one a minute, only leads still missing basics with a call */
  let bgAt = 0;
  function background(){
    if(Date.now() - bgAt < 60e3 || !window.CallLead || !CallLead.readLead) return;
    const l = ((typeof DATA !== 'undefined' && DATA.leads) || []).find(x => x && !x.archived && !(x.spam && x.spam.at) && ['Lost', 'Converted'].indexOf(String(x.status || '')) < 0
      && !x.basics_filled_at && !x.basics_checked_at && !S.tried[x.id] && needsFill(x));
    if(!l) return; bgAt = Date.now(); fill(l.id);
  }
  window.LeadBasics = { html, apply, fill, background, save, edit:(id, k) => { S.edit = k ? id + ':' + k : ''; redraw(); }, checked, useCall, keepOurs, lines, titleFor, hoursFromText, needsFill, _state:S };
})();
