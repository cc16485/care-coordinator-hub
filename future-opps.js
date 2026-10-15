/* future-opps.js · Future Service Opportunities (Samantha 2026-10-15: "We regularly receive inquiries from families in
   locations where we either do not currently provide services or do not have caregivers available. I do not want to lose
   these opportunities." Approved screen: https://claude.ai/artifact/T6F9vizYtQu57dcJumdDaD; "Build it as shown. Service
   area = a list of counties I'll give you. Expansion threshold: 3+ families or 40+ hours a week in 12 months. Yes, move the
   older Lost families in." Then: "currently our counties are probably too much...i need to look at that").

   - Save for Future (board ··· menu, the lead's Overview): a reason (three different problems kept apart: an area we don't
     serve, an area we serve but can't staff, a schedule we can't cover; plus Other), the county and town, an optional
     look-again date, and permission to contact them later (who said it, how, when; "didn't ask" counts as no).
     The lead's status becomes Saved (LeadRules.saveForFuture): off the board and every follow-up clock, never Lost.
   - Leads → Future opportunities: the saved families (search, by kind), demand by area (her numbers: 3+ families or 40+
     hours a week in 12 months), possible matches (a caregiver near a can't-staff / can't-cover family, added or updated
     since they were saved; a county added to the service area since an area family was saved), the service area itself
     (her county list, owner-edited, with what we know about each county beside it), and the one-step move of families
     Lost for area or staffing reasons.
   - Reactivate puts the same lead back on the board (LeadRules.reactivate): no copy, no second profile.
   Nothing here texts, emails or calls anyone. "Reactivate and call" opens the office line for a person to dial. */
(function(){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const R = () => window.LeadRules;
  const FO = { tab:'all', q:'', editArea:false };
  const lead = id => (DATA.leads || []).find(l => l && String(l.id) === String(id));
  const me = () => (typeof ccActor === 'function' ? ccActor() : { email:'', name:'' }) || { email:'', name:'' };
  const nameOf = l => (typeof cpLeadClientName === 'function' && cpLeadClientName(l)) || [l.first_name, l.last_name].filter(Boolean).join(' ') || 'This family';
  const callerOf = l => [l.first_name, l.last_name].filter(Boolean).join(' ');
  const day = iso => { try{ return new Date(iso).toLocaleDateString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric' }); }catch(e){ return String(iso || '').slice(0, 10); } };
  const toast = t => { if(typeof ccToast === 'function') ccToast(t); };
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const valueOf = l => (window.LeadsBoard && LeadsBoard.valueOf) ? LeadsBoard.valueOf(l) : { hours:Number(l.future && l.future.hours_per_week) || 0, usd:0, txt:'' };

  /* The towns we hear from, by county (southwest and south-central Missouri). Only a suggestion: the person saving picks
     or types the county, and the lead's own County box wins. */
  const TOWN_COUNTY = {
    Greene:'Springfield Republic Battlefield Willard Strafford Ash Grove Walnut Grove Fair Grove Brookline',
    Christian:'Nixa Ozark Clever Sparta Billings Highlandville Chadwick Fremont Hills',
    Taney:'Branson Hollister Forsyth Kirbyville Rockaway Beach Merriam Woods Taneyville Kissee Mills Powersite',
    Webster:'Marshfield Seymour Rogersville Fordland Niangua Diggins',
    Polk:'Bolivar Humansville Fair Play Pleasant Hope Morrisville Halfway Aldrich',
    Phelps:'Rolla St. James Newburg Edgar Springs Doolittle',
    Douglas:'Ava Vanzant Drury',
    Stone:'Kimberling City Reeds Spring Branson West Crane Galena Blue Eye Hurley Shell Knob',
    Lawrence:'Mount Vernon Aurora Marionville Pierce City Miller Verona',
    Dallas:'Buffalo Louisburg Urbana',
    Laclede:'Lebanon Conway Phillipsburg Stoutland',
    Wright:'Mountain Grove Mansfield Hartville Norwood',
    Barry:'Cassville Monett Purdy Exeter Washburn Wheaton',
    Jasper:'Joplin Carthage Webb City Carl Junction Sarcoxie Jasper',
    Newton:'Neosho Seneca Granby Diamond',
    Howell:'West Plains Willow Springs Mountain View Pomona',
    Texas:'Houston Cabool Licking Summersville',
    Pulaski:'Waynesville St. Robert Saint Robert Fort Leonard Wood Crocker Dixon Richland',
    Cedar:'Stockton El Dorado Springs',
    Hickory:'Hermitage Wheatland Weaubleau',
    Camden:'Camdenton Osage Beach Lake Ozark Sunrise Beach Climax Springs',
    Ozark:'Gainesville Theodosia Isabella',
    Dade:'Greenfield Lockwood Everton',
    Barton:'Lamar Liberal',
    Vernon:'Nevada',
    Benton:'Warsaw Lincoln Cole Camp',
    'St. Clair':'Osceola Appleton City Lowry City',
    McDonald:'Pineville Anderson Noel Goodman Lanagan',
  };
  const TOWN_TO = {};
  Object.entries(TOWN_COUNTY).forEach(([c, list]) => {
    /* multi-word towns first */
    ['Battlefield', 'Ash Grove', 'Walnut Grove', 'Fair Grove', 'Fremont Hills', 'Rockaway Beach', 'Merriam Woods', 'Kissee Mills', 'Fair Play', 'Pleasant Hope', 'St. James', 'Edgar Springs', 'Kimberling City',
     'Reeds Spring', 'Branson West', 'Blue Eye', 'Shell Knob', 'Mount Vernon', 'Pierce City', 'Mountain Grove', 'Webb City', 'Carl Junction', 'West Plains', 'Willow Springs', 'Mountain View', 'St. Robert', 'Saint Robert',
     'Fort Leonard Wood', 'El Dorado Springs', 'Osage Beach', 'Lake Ozark', 'Sunrise Beach', 'Climax Springs', 'Appleton City', 'Lowry City', 'Cole Camp']
      .forEach(t => { if(list.indexOf(t) > -1){ TOWN_TO[t.toLowerCase()] = c; list = list.replace(t, ''); } });
    list.split(/\s+/).filter(Boolean).forEach(t => { TOWN_TO[t.toLowerCase()] = c; });
  });
  function countyFor(l){
    const own = String((l && l.county) || '').replace(/\s+county$/i, '').trim();
    if(own) return own;
    return TOWN_TO[String((l && l.client_city) || '').trim().toLowerCase()] || '';
  }
  const COUNTIES = Object.keys(TOWN_COUNTY).sort();   /* every county the town list knows; the tiers can name others */
  /* her service area strategy (Samantha 2026-10-15), three tiers:
       core        · Tier 1, core service area: recruit, accept referrals, build reliable coverage
       conditional · Tier 2, conditional: new clients only with qualified caregivers nearby and enough hours to staff
       expansion   · Tier 3, expansion or waitlist only: keep interested families and applicants, promise nothing
     A county in no tier is outside our area. Stored as ops_settings.service_area { tiers, by, at, history }; until it is
     saved from the Hub, her list below is the area. */
  const TIERS = [['core', 'Tier 1 · Core', 'Recruit, accept referrals, build reliable coverage'], ['conditional', 'Tier 2 · Conditional', 'New clients only with qualified caregivers nearby and enough hours'],
    ['expansion', 'Tier 3 · Expansion or waitlist', 'Keep interested families and applicants; don\'t promise coverage']];
  const HER_TIERS = { core:['Greene', 'Christian', 'Webster', 'Polk'], conditional:['Lawrence', 'Dallas', 'Stone', 'Taney'],
    expansion:['Barry', 'Jasper', 'Newton', 'Cedar', 'Dade', 'Hickory', 'Benton', 'Laclede', 'Wright', 'Douglas', 'Ozark', 'Howell'] };
  function area(){
    const s = (DATA.ops_settings && DATA.ops_settings.service_area) || null;
    const t = s && s.tiers && typeof s.tiers === 'object' ? s.tiers : HER_TIERS;
    const tiers = { core:(t.core || []).slice(), conditional:(t.conditional || []).slice(), expansion:(t.expansion || []).slice() };
    return { tiers, counties:tiers.core.concat(tiers.conditional), by:(s && s.by) || 'samantha@mo-care.com', at:(s && s.at) || '', saved:!!(s && s.tiers), history:(s && s.history) || [] };
  }
  /* which tier a county is in: 'core' | 'conditional' | 'expansion' | '' (outside) */
  function tierOf(c){ const t = area().tiers, k = String(c || '').toLowerCase(); return ['core', 'conditional', 'expansion'].find(x => t[x].some(y => y.toLowerCase() === k)) || ''; }
  const TIER_WORD = { core:'Tier 1 (core)', conditional:'Tier 2 (conditional)', expansion:'Tier 3 (expansion or waitlist)', '':'not in our service area' };
  /* served = Tier 1 or 2: "we serve it but can't staff it" is a real answer there; Tier 3 and outside are area problems */
  const served = c => { const t = tierOf(c); return t === 'core' || t === 'conditional'; };

  /* ── 1 · Save for Future ── */
  function modal(html){
    close();
    const bg = document.createElement('div'); bg.id = 'foModal'; bg.className = 'fo-bg';
    bg.innerHTML = '<div class="fo-dlg" role="dialog" aria-modal="true">' + html + '</div>';
    bg.addEventListener('click', e => { if(e.target === bg) close(); });
    document.body.appendChild(bg); return bg.querySelector('.fo-dlg');
  }
  function close(){ const m = document.getElementById('foModal'); if(m) m.remove(); }
  function save(id){
    const l = lead(id); if(!l) return;
    const c = countyFor(l), v = valueOf(l), tier = tierOf(c), sugg = !c ? '' : served(c) ? 'no_caregiver' : tier === 'expansion' ? 'expansion' : 'outside_area';
    const where = [l.client_city, l.client_zip].filter(Boolean).join(', ');
    const reasons = R().FUTURE.map(r => '<label class="fo-opt"><input type="radio" name="foR" value="' + r[0] + '"' + (r[0] === sugg ? ' checked' : '') + '><div><b>' + esc(r[1]) + '</b><span>'
      + esc({ outside_area:'We don\'t provide care there yet.', no_caregiver:'We serve the area but have nobody nearby right now.', schedule:'We can staff the area, not these days or hours.', expansion:'Outside our area, and somewhere we\'d like to grow.', other:'Say what in the note.' }[r[0]])
      + (r[0] === sugg ? ' <span class="fo-sugg">suggested: ' + esc(c) + ' County is ' + esc(TIER_WORD[tier]) + '</span>' : '') + '</span></div></label>').join('');
    const perm = [['yes', 'Yes, they said we may', ''], ['no', 'No, they don\'t want to hear from us', 'Never listed for outreach; still counted as demand.'], ['not_asked', 'We didn\'t ask', 'Treated as no until someone asks and records the answer.']]
      .map(p => '<label class="fo-opt"><input type="radio" name="foP" value="' + p[0] + '"' + (p[0] === 'not_asked' ? ' checked' : '') + '><div><b>' + p[1] + '</b>' + (p[2] ? '<span>' + p[2] + '</span>' : '') + '</div></label>').join('');
    const d = modal('<h3>Save ' + esc(nameOf(l)) + ' for future</h3>'
      + '<div class="field-note">' + esc([callerOf(l) ? 'Inquiry from ' + callerOf(l) : '', where, v.hours ? 'about ' + v.hours + ' h a week' : ''].filter(Boolean).join(' · ')) + '</div>'
      + '<div class="fo-k">Why we can\'t help right now</div>' + reasons
      + '<div class="fo-two"><label class="fo-f">County<input id="foCounty" list="foCounties" value="' + esc(c) + '" placeholder="e.g. Polk"><datalist id="foCounties">' + COUNTIES.map(x => '<option value="' + esc(x) + '">').join('') + '</datalist></label>'
      + '<label class="fo-f">Town and zip<input id="foTown" value="' + esc(where) + '" placeholder="Bolivar, 65613"></label></div>'
      + '<label class="fo-f">Look again by (optional)<input id="foLook" type="date"></label>'
      + '<div class="fo-k">May we contact them about future availability?</div>' + perm
      + '<div id="foPermYes" class="fo-two" hidden><label class="fo-f">Who said so<input id="foSaid" value="' + esc(callerOf(l)) + '"></label><label class="fo-f">How to reach them<select id="foVia"><option value="call">Call</option><option value="text">Text</option><option value="email">Email</option></select></label></div>'
      + '<label class="fo-f">Note (optional; needed for Other)<input id="foNote" placeholder="Wants mornings Mon to Fri"></label>'
      + '<div id="foErr" class="fo-err"></div>'
      + '<div class="fo-btns"><button class="primary" id="foGo">Save for future</button><button class="ghost" id="foNo">Cancel</button></div>'
      + '<div class="field-note">They leave the Leads board and the follow-up clocks stop. They are not marked Lost. Their calls and texts keep recording on the same record. Nothing is sent to them.</div>');
    d.querySelectorAll('input[name=foP]').forEach(x => x.onchange = () => { d.querySelector('#foPermYes').hidden = d.querySelector('input[name=foP]:checked').value !== 'yes'; });
    d.querySelector('#foNo').onclick = close;
    d.querySelector('#foGo').onclick = async () => {
      const key = (d.querySelector('input[name=foR]:checked') || {}).value, err = d.querySelector('#foErr');
      const note = d.querySelector('#foNote').value.trim(), county = d.querySelector('#foCounty').value.trim().replace(/\s+county$/i, '');
      if(!key){ err.textContent = 'Pick why we can\'t help right now.'; return; }
      if(key === 'other' && !note){ err.textContent = '"Other" needs a few words in the note.'; return; }
      if(!county){ err.textContent = 'Which county? It is how the demand by area counts them.'; return; }
      const tz = d.querySelector('#foTown').value.split(','), ans = d.querySelector('input[name=foP]:checked').value;
      const a = me();
      const ok = R().saveForFuture(l, { key, note, county, town:(tz[0] || '').trim(), zip:((tz[1] || '').match(/\d{5}/) || [l.client_zip || ''])[0], look_again:d.querySelector('#foLook').value, by:a.email,
        permission:{ answer:ans, via:d.querySelector('#foVia').value, said_by:d.querySelector('#foSaid').value.trim() } });
      if(!ok){ err.textContent = 'That could not be saved. Check the reason.'; return; }
      if(!l.county) l.county = county;
      l.comm_log = Array.isArray(l.comm_log) ? l.comm_log : [];
      l.comm_log.push({ body:'📌 Saved for future: ' + l.future.reason + (note ? ' (' + note + ')' : '') + '. May contact later: ' + R().FUTURE_PERMISSION[l.future.permission.answer].toLowerCase(), at:l.future.saved_at, by:a.email });
      d.querySelector('#foGo').disabled = true;
      await persist('leads', l);
      if(typeof opEvent === 'function') opEvent('lead_saved_future', { item_id:String(l.id), area:'growth_leads', summary:(a.name || 'Someone') + ' saved ' + nameOf(l) + ' for future: ' + l.future.reason });
      if(typeof opsReconcileLeads === 'function'){ try{ opsReconcileLeads(); }catch(e){} }
      close(); toast('Saved for future. Find them under Leads → Future opportunities.');
      redraw();
    };
  }

  /* ── 5 · Reactivate ── */
  async function reactivate(id, why, call){
    const l = lead(id); if(!l || !R().isSaved(l)) return;
    const a = me(), w = why || 'reactivated from Future opportunities';
    const to = R().reactivate(l, { by:a.email, why:w });
    l.comm_log = Array.isArray(l.comm_log) ? l.comm_log : [];
    l.comm_log.push({ body:'↩ Reactivated: ' + w, at:new Date().toISOString(), by:a.email });
    if(!l.follow_up_due) l.follow_up_due = R().ymd(new Date());
    await persist('leads', l);
    if(typeof opEvent === 'function') opEvent('lead_reactivated', { item_id:String(l.id), area:'growth_leads', summary:(a.name || 'Someone') + ' reactivated ' + nameOf(l) + ': ' + w });
    toast('Back on the Leads board (' + to + '). Same record, nothing copied.' + (call ? ' Their profile is open; Call uses the office line.' : ''));
    if(call && typeof openLeadProfile === 'function') openLeadProfile(l.id, 'summary');
    redraw();
  }
  function notYet(id, key){
    const l = lead(id); if(!l || !l.future) return;
    l.future.not_yet = (Array.isArray(l.future.not_yet) ? l.future.not_yet : []).concat([key]).slice(-50);
    persist('leads', l); redraw();
  }
  function redraw(){ try{ if(typeof renderLeadsStarts === 'function') renderLeadsStarts(); }catch(e){} try{ if(typeof lwRender === 'function') lwRender(); }catch(e){} }

  /* ── 4 · possible matches (for a person; nothing is sent) ── */
  const cgZip = c => String((c && (c.zip || c.home_zip)) || '').replace(/\D/g, '').slice(0, 5);
  function matches(){
    const saved = (DATA.leads || []).filter(l => R().isSaved(l) && l.future), out = [];
    const cgs = (DATA.caregivers || []).filter(c => c && c.active !== false && !c.terminated && !c.inactive);
    const avail = {}; (DATA.caregiver_availability || []).forEach(x => { if(x && x.axiscare_id) avail[String(x.axiscare_id)] = x; });
    const ar = area();
    saved.forEach(l => {
      const f = l.future, nope = Array.isArray(f.not_yet) ? f.not_yet : [];
      if(f.kind === 'staff' || f.kind === 'schedule'){
        const z = f.zip || String(l.client_zip || '').slice(0, 5);
        const near = cgs.map(c => {
          const av = avail[String(c.axiscare_id)] || {}, since = String(c.hire_date || c.created_at || '') > String(f.saved_at) || String(av.updated_at || '') > String(f.saved_at);
          const mi = (z && cgZip(c) && typeof milesApart === 'function') ? milesApart(z, cgZip(c)) : null;
          const sameTown = !mi && c.city && f.town && String(c.city).toLowerCase() === String(f.town).toLowerCase();
          return { c, since, mi, sameTown, near:(mi != null && mi <= 25) || sameTown, av };
        }).filter(x => x.near && x.since);
        near.forEach(x => {
          const key = 'cg:' + (x.c.axiscare_id || x.c.id);
          if(nope.indexOf(key) > -1) return;
          const nm = x.av.name || [x.c.first, x.c.last].filter(Boolean).join(' ') || x.c.name || 'A caregiver';
          out.push({ l, key, why:nm + (x.mi != null ? ' (' + x.mi + ' mi)' : ' (same town)') + ' was ' + (String(x.c.hire_date || '') > String(f.saved_at) ? 'hired' : 'updated their availability') + ' after ' + day(f.saved_at) });
        });
      }
      if(f.kind === 'area' && f.county && served(f.county) && String(ar.at || '') > String(f.saved_at)){
        const key = 'area:' + f.county.toLowerCase();
        if(nope.indexOf(key) < 0) out.push({ l, key, why:f.county + ' County became ' + TIER_WORD[tierOf(f.county)] + ' on ' + day(ar.at) });
      }
    });
    return out;
  }
  function matchCount(){ try{ return matches().length; }catch(e){ return 0; } }

  /* the old Lost families for area or staffing reasons, moved in one step (her yes, 2026-10-15) */
  const oldLost = () => (DATA.leads || []).filter(l => l && !l.archived && l.status === 'Lost' && ['could_not_staff', 'outside_area'].indexOf(l.lost_reason_key) > -1);
  async function moveOldLost(btn){
    const list = oldLost(); if(!list.length) return;
    if(btn) btn.disabled = true;
    const a = me();
    for(const l of list){
      const key = l.lost_reason_key === 'outside_area' ? 'outside_area' : (l.lost_schedule && l.lost_schedule.days && l.lost_schedule.days.length ? 'schedule' : 'no_caregiver');
      const from = { reason:l.lost_reason || '', at:l.lost_at || '' };
      /* Lost → Saved: the record keeps everything; status history says why */
      l.status_history = (Array.isArray(l.status_history) ? l.status_history : []);
      R().saveForFuture(l, { key, note:l.lost_detail || '', county:countyFor(l), town:(l.lost_schedule && l.lost_schedule.city) || l.client_city || '', zip:(l.lost_schedule && l.lost_schedule.zip) || l.client_zip || '', by:a.email,
        permission:{ answer:'not_asked' }, from_lost:from }, l.lost_at || undefined);
      l.future.saved_at = new Date().toISOString(); l.future.from_lost = from;
      l.comm_log = Array.isArray(l.comm_log) ? l.comm_log : [];
      l.comm_log.push({ body:'📌 Moved from Lost (' + (l.lost_reason || '') + ') to Saved for future', at:l.future.saved_at, by:a.email });
      await persist('leads', l);
    }
    if(typeof opEvent === 'function') opEvent('lead_saved_future', { item_id:'bulk', area:'growth_leads', summary:(a.name || 'Someone') + ' moved ' + list.length + ' families Lost for area or staffing reasons into Future opportunities' });
    toast(list.length + ' famil' + (list.length === 1 ? 'y' : 'ies') + ' moved into Future opportunities.'); redraw();
  }

  /* ── the service area (owner) ── */
  async function saveArea(btn){
    const tiers = { core:[], conditional:[], expansion:[] };
    document.querySelectorAll('#foAreaEdit select[data-county]').forEach(x => { if(tiers[x.value]) tiers[x.value].push(x.dataset.county); });
    const typed = String((document.getElementById('foAreaMore') || {}).value || '').split(/[,;]+/).map(x => x.trim().replace(/\s+county$/i, '')).filter(Boolean);
    const typedTier = String((document.getElementById('foAreaMoreTier') || {}).value || 'expansion');
    typed.forEach(c => { if(tiers[typedTier] && tiers[typedTier].indexOf(c) < 0) tiers[typedTier].push(c); });
    Object.keys(tiers).forEach(k => tiers[k].sort());
    if(!tiers.core.length){ toast('Tier 1 needs at least one county.'); return; }
    if(btn) btn.disabled = true;
    const a = me(), at = new Date().toISOString();
    const out = await ccMergeSave('ops_settings', (m, base) => {
      const was = base.service_area && base.service_area.tiers ? base.service_area.tiers : null;
      if(was && JSON.stringify(was) === JSON.stringify(tiers)) return [];
      m.service_area = { tiers, by:a.email, at, history:((base.service_area && base.service_area.history) || []).concat([{ at, by:a.email, tiers:was || HER_TIERS }]).slice(-20) };
      return ['service area'];
    });
    if(out.error){ toast('⚠ Not saved: ' + out.error.message); if(btn) btn.disabled = false; return; }
    if(out.changed.length && typeof opEvent === 'function') opEvent('setting_changed', { item_id:'ops_settings', area:'growth_leads', summary:(a.name || 'Someone') + ' changed the service area: Tier 1 ' + tiers.core.join(', ') + '; Tier 2 ' + tiers.conditional.join(', ') + '; Tier 3 ' + tiers.expansion.join(', ') });
    FO.editArea = false; toast('Service area saved.'); redraw();
  }
  /* what we know about each county, to help decide what we really serve */
  function countyFacts(){
    const by = {};
    const get = c => by[c] || (by[c] = { county:c, clients:0, caregivers:0, leads:0, saved:0 });
    const since = new Date(Date.now() - 365 * 864e5).toISOString();
    (DATA.leads || []).forEach(l => { if(!l || l.archived || (l.spam && l.spam.at)) return; const c = countyFor(l); if(!c) return;
      if(l.status === 'Converted' || l.axiscare_client_id) get(c).clients++;
      if(String(l.created_at || '') >= since) get(c).leads++;
      if(l.status === 'Saved') get(c).saved++; });
    (DATA.caregivers || []).forEach(g => { if(!g || g.active === false || g.terminated) return; const c = TOWN_TO[String(g.city || '').trim().toLowerCase()]; if(c) get(c).caregivers++; });
    return by;
  }
  function areaHtml(){
    const ar = area(), owner = typeof ccIsOwner === 'function' && ccIsOwner(), facts = countyFacts();
    const list = k => ar.tiers[k].length ? esc(ar.tiers[k].join(', ')) : '<span class="field-note">none</span>';
    const head = '<div class="fo-head"><b>Service area</b><span class="field-note">' + (ar.saved ? 'Last changed by ' + esc(String(ar.by).split('@')[0]) + ' on ' + day(ar.at) : 'Your strategy of Oct 15') + '. Any county not listed is outside our area.</span>'
      + (owner && !FO.editArea ? '<button class="lb-btn" onclick="FutureOpps.editArea(true)">Change</button>' : '') + '</div>'
      + '<div class="fo-tiers">' + TIERS.map(t => '<div class="fo-tier fo-tier-' + t[0] + '"><b>' + t[1] + '</b><span class="field-note">' + esc(t[2]) + '</span><div>' + list(t[0]) + '</div></div>').join('') + '</div>';
    if(!FO.editArea) return '<div class="card fo-card">' + head + '</div>';
    const all = [...new Set(COUNTIES.concat(ar.tiers.core, ar.tiers.conditional, ar.tiers.expansion))].sort((a, b) => ((facts[b] || {}).clients || 0) - ((facts[a] || {}).clients || 0) || a.localeCompare(b));
    const opt = (c, k) => '<select data-county="' + esc(c) + '" aria-label="' + esc(c) + ' County tier">' + [['core', 'Tier 1'], ['conditional', 'Tier 2'], ['expansion', 'Tier 3'], ['', 'Not served']].map(o => '<option value="' + o[0] + '"' + (o[0] === k ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>';
    return '<div class="card fo-card" id="foAreaEdit">' + head
      + '<div class="field-note" style="margin:8px 0;">Beside each county: clients we have or had there, active caregivers living there, inquiries in the last 12 months, and families saved for future. Counts come from the towns on our records.</div>'
      + '<div class="fo-scroll"><table class="fo-t"><thead><tr><th>County</th><th>Tier</th><th class="n">Clients</th><th class="n">Caregivers</th><th class="n">Inquiries (12 mo)</th><th class="n">Saved</th></tr></thead><tbody>'
      + all.map(c => { const f = facts[c] || {}; return '<tr><td><b>' + esc(c) + '</b></td><td>' + opt(c, tierOf(c)) + '</td><td class="n">' + (f.clients || 0) + '</td><td class="n">' + (f.caregivers || 0) + '</td><td class="n">' + (f.leads || 0) + '</td><td class="n">' + (f.saved || 0) + '</td></tr>'; }).join('')
      + '</tbody></table></div>'
      + '<div class="fo-two" style="margin-top:8px;"><label class="fo-f">Another county (type it)<input id="foAreaMore" placeholder="e.g. Morgan"></label><label class="fo-f">Its tier<select id="foAreaMoreTier"><option value="core">Tier 1</option><option value="conditional">Tier 2</option><option value="expansion" selected>Tier 3</option></select></label></div>'
      + '<div class="fo-btns"><button class="primary" onclick="FutureOpps.saveArea(this)">Save the service area</button><button class="ghost" onclick="FutureOpps.editArea(false)">Cancel</button></div></div>';
  }
  /* ── 2 + 3 · the Future opportunities view on Leads ── */
  const KIND_TAG = { area:'fo-a', staff:'fo-s', schedule:'fo-c', other:'fo-o' };
  const KIND_SHORT = { area:'Area we don\'t serve', staff:'Can\'t staff', schedule:'Can\'t cover schedule', other:'Other' };
  const PERM = { yes:['fo-g', 'Yes'], no:['fo-r', 'No'], not_asked:['fo-o', 'Didn\'t ask'] };
  function html(){
    const saved = (DATA.leads || []).filter(l => R().isSaved(l) && l.future && (typeof ccViewMatch !== 'function' || ccViewMatch(l.assigned_coordinator)));
    const counts = { all:saved.length }; saved.forEach(l => { counts[l.future.kind] = (counts[l.future.kind] || 0) + 1; });
    const q = FO.q.toLowerCase();
    const list = saved.filter(l => FO.tab === 'all' || l.future.kind === FO.tab)
      .filter(l => !q || [nameOf(l), callerOf(l), l.future.town, l.future.zip, l.future.county, l.future.reason, l.future.note, l.why_called, (l.needs || []).join(' ')].join(' ').toLowerCase().indexOf(q) > -1)
      .sort((a, b) => String(b.future.saved_at).localeCompare(String(a.future.saved_at)));
    const ms = matches(), old = oldLost(), owner = typeof ccIsOwner === 'function' && ccIsOwner();
    const contacted = l => (l.contact_events || []).some(e => e && e.direction === 'in' && e.actor === 'family' && String(e.at || '') > String(l.future.saved_at));
    let h = '';
    if(ms.length) h += '<div class="card fo-card"><div class="fo-head"><b>Possible matches</b><span class="field-note">' + ms.length + ' · something changed since these families were saved. Review them; nothing is sent to anyone.</span></div>'
      + ms.map(m => '<div class="fo-m"><div><b>' + esc(nameOf(m.l)) + '</b> · ' + esc(m.l.future.town || m.l.future.county || '') + ' · ' + esc(KIND_SHORT[m.l.future.kind]) + (R().mayContact(m.l) ? ' · <span class="fo-tag fo-g">may contact by ' + esc(m.l.future.permission.via || 'call') + '</span>' : ' · <span class="fo-tag fo-o">no permission to contact on record</span>')
        + '<div class="field-note">' + esc(m.why) + '</div></div><div class="fo-btns">'
        + '<button class="lb-btn lb-btn-primary" onclick="FutureOpps.reactivate(\'' + esc(m.l.id) + '\', ' + esc(JSON.stringify(m.why)) .replace(/"/g, '&quot;') + ', ' + (R().mayContact(m.l) ? 'true' : 'false') + ')">' + (R().mayContact(m.l) ? 'Reactivate and call' : 'Reactivate') + '</button>'
        + '<button class="lb-btn" onclick="FutureOpps.notYet(\'' + esc(m.l.id) + '\', \'' + esc(m.key) + '\')">Not yet</button></div></div>').join('') + '</div>';
    if(old.length && owner) h += '<div class="card fo-card fo-note"><b>' + old.length + ' famil' + (old.length === 1 ? 'y was' : 'ies were') + ' marked Lost for area or staffing reasons.</b> <span class="field-note">Move them into Future opportunities so their demand counts. Their history stays; nobody is contacted.</span> <button class="lb-btn" onclick="FutureOpps.moveOldLost(this)">Move ' + old.length + ' in</button></div>';
    /* demand by area */
    const dem = R().demand(DATA.leads || [], l => valueOf(l));
    if(dem.length) h += '<div class="card fo-card"><div class="fo-head"><b>Demand by area</b><span class="field-note">Saved families in the last 12 months. Worth acting on: ' + R().DEMAND_FAMILIES + '+ families or ' + R().DEMAND_HOURS + '+ hours a week.</span></div>'
      + '<div class="fo-scroll"><table class="fo-t"><thead><tr><th>Area</th><th>Kind</th><th class="n">Families</th><th class="n">Hours/wk</th><th class="n">$/month</th><th>Points to</th></tr></thead><tbody>'
      + dem.map(d => '<tr><td><b>' + esc(d.area) + '</b><span class="fo-sub">' + esc([Object.keys(d.towns).join(', '), d.county ? TIER_WORD[tierOf(d.county)] : ''].filter(Boolean).join(' · ')) + '</span></td><td><span class="fo-tag ' + KIND_TAG[d.kind] + '">' + esc(KIND_SHORT[d.kind]) + '</span></td><td class="n">' + d.families + '</td><td class="n">' + (d.hours || '?') + '</td><td class="n">' + (d.usd ? '<b class="fo-usd">' + money(d.usd) + '</b>' : '') + '</td><td class="' + (d.worth ? 'fo-worth' : 'field-note') + '">'
        + (!d.worth ? 'Too few to act on yet' : d.kind === 'area' ? 'Worth a look at expanding here' : d.kind === 'staff' ? 'Recruit here: we cover it, nobody is nearby' : d.kind === 'schedule' ? 'Find caregivers for these days and hours' : 'Worth a look') + '</td></tr>').join('')
      + '</tbody></table></div></div>';
    h += areaHtml();
    /* the list */
    const pill = (k, label) => '<button class="filter-pill' + (FO.tab === k ? ' active' : '') + '" onclick="FutureOpps.tab(\'' + k + '\')">' + label + ' <span style="opacity:.65;">' + (counts[k] || 0) + '</span></button>';
    h += '<div class="card fo-card"><div class="fo-head"><b>Saved for future</b><span class="field-note">Off the active board, never Lost. Open one for every call, text and note.</span></div>'
      + '<div class="fo-tabs">' + pill('all', 'All') + pill('area', 'Area we don\'t serve') + pill('staff', 'Can\'t staff') + pill('schedule', 'Can\'t cover schedule') + pill('other', 'Other')
      + '<input id="foSearch" class="fo-search" placeholder="Search name, town, zip, need" value="' + esc(FO.q) + '" oninput="FutureOpps.search(this.value)"></div>'
      + (list.length ? '<div class="fo-scroll"><table class="fo-t"><thead><tr><th>Family</th><th>Where</th><th>Why</th><th class="n">Hours/wk</th><th class="n">$/month</th><th>May contact</th><th>Saved</th><th></th></tr></thead><tbody>'
        + list.map(l => { const f = l.future, v = valueOf(l), p = PERM[f.permission && f.permission.answer] || PERM.not_asked;
          return '<tr><td><button class="lbc-name" data-open-lead="' + esc(l.id) + '" data-open-tab="summary">' + esc(nameOf(l)) + '</button><span class="fo-sub">' + esc(callerOf(l)) + (contacted(l) ? ' · <b class="fo-hot">contacted us since</b>' : '') + '</span></td>'
            + '<td>' + esc(f.town || '') + '<span class="fo-sub">' + esc([f.county ? f.county + ' County' : '', f.zip].filter(Boolean).join(' · ')) + '</span></td>'
            + '<td><span class="fo-tag ' + KIND_TAG[f.kind] + '">' + esc(f.reason_key === 'expansion' ? 'Future expansion' : KIND_SHORT[f.kind]) + '</span>' + (f.note ? '<span class="fo-sub">' + esc(f.note) + '</span>' : '') + '</td>'
            + '<td class="n">' + (v.hours || '<span class="fo-sub">?</span>') + '</td><td class="n">' + (v.usd ? '<b class="fo-usd">' + money(v.usd) + '</b>' : '<span class="fo-sub">' + esc(v.txt || '?') + '</span>') + '</td>'
            + '<td><span class="fo-tag ' + p[0] + '">' + p[1] + (f.permission && f.permission.answer === 'yes' && f.permission.via ? ', ' + esc(f.permission.via) : '') + '</span></td>'
            + '<td>' + day(f.saved_at) + (f.look_again ? '<span class="fo-sub">look again ' + esc(f.look_again) + '</span>' : '') + '</td>'
            + '<td><button class="lb-btn" onclick="FutureOpps.reactivate(\'' + esc(l.id) + '\')">Reactivate</button></td></tr>'; }).join('')
        + '</tbody></table></div>' : '<div class="lb-empty">' + (saved.length ? 'Nobody matches.' : 'No families saved for future yet. Use Save for future on a lead (the ··· menu on the board, or their Overview).') + '</div>')
      + '</div>';
    return h;
  }
  /* the saved family's Overview card (in place of the next step) */
  function cardHtml(l){
    const f = l.future || {}, p = f.permission || {};
    return '<div class="card lw-card lw-next" style="border-color:#6D28D9;"><div class="lw-next-k" style="color:#6D28D9;">Saved for future</div>'
      + '<div class="lw-next-t">' + esc(f.reason || 'Saved') + (f.note ? ': ' + esc(f.note) : '') + '</div>'
      + '<div class="field-note">' + esc([f.town, f.county ? f.county + ' County' : ''].filter(Boolean).join(', ')) + ' · saved ' + day(f.saved_at) + ' · may contact later: ' + esc((R().FUTURE_PERMISSION[p.answer] || 'We didn\'t ask').toLowerCase())
      + (p.answer === 'yes' ? ' (' + esc([p.said_by, p.via].filter(Boolean).join(', by ')) + ')' : '') + (f.look_again ? ' · look again ' + esc(f.look_again) : '') + '</div>'
      + '<div class="lb-actions"><button class="lb-btn lb-btn-primary" onclick="FutureOpps.reactivate(\'' + esc(l.id) + '\')">Reactivate</button></div></div>';
  }
  window.FutureOpps = { save, reactivate, notYet, html, cardHtml, matches, matchCount, moveOldLost, saveArea, countyFor, area, served, tierOf, TIER_WORD, HER_TIERS, TOWN_TO,
    editArea:o => { FO.editArea = !!o; redraw(); }, tab:k => { FO.tab = k; redraw(); },
    search:v => { FO.q = String(v || ''); redraw(); setTimeout(() => { const s = document.getElementById('foSearch'); if(s){ s.focus(); s.setSelectionRange(s.value.length, s.value.length); } }, 0); } };
})();
