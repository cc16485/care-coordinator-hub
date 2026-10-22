/* call-learned.js · LEARNED ON THIS CALL, step 1 (Samantha 2026-10-22: "sometimes we speak to someone several times before
   they book an assessment, we want to compaile as much information as possible, dont lose any info". Approved mockup
   https://claude.ai/artifact/BapTUgrqCvdYjjjvgFRDDR, her yes to all 5 decisions, "Build step 1 in practice").

   The server job call-learn reads every answered call the recorder put on a lead (the same reader as Make this a lead) and
   keeps what it heard in call_learned. This file draws that on the lead's Overview, one box per call, compared with the
   lead as it is NOW (LeadRules.toForm, the form's own boxes):
     · New: a box the lead has empty, or ticks it doesn't have yet (a safety tick is marked Safety);
     · Changed since an earlier call: the lead says one thing, this call another. Use the new one / Keep the old one;
     · New people the call named; also said (the call's notes); already on the profile (nothing to do).
   Add opens the REGULAR lead form with only what was checked (CallLead.fillLearned: empty boxes filled, "Use the new one"
   boxes replaced, all yellow) and the person saves; then the box is done. "Something is wrong" keeps it, marked, with why.
   Nothing here changes a lead by itself and nothing is sent to anyone.
   PRACTICE while ops_settings.call_learn_live is not true: owners only, every button off. Calls the reader could not read
   (no transcript, an error) say so on the profile, never quietly. */
(function(){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const S = { rows:{}, at:{}, busy:{}, pick:{}, err:{} };
  const settings = () => (typeof DATA !== 'undefined' && DATA.ops_settings && !Array.isArray(DATA.ops_settings)) ? DATA.ops_settings : {};
  const isLive = () => settings().call_learn_live === true;
  const isOwner = () => { try{ return !!ccIsOwner(); }catch(e){ return false; } };
  const visible = () => isLive() || isOwner();
  const leadOf = id => ((typeof DATA !== 'undefined' && DATA.leads) || []).find(l => l && String(l.id) === String(id));
  const say = m => { if(typeof ccToast === 'function') ccToast(m); else alert(m); };
  const redraw = () => { try{ if(typeof lwRender === 'function') lwRender(); }catch(e){} };

  /* the words for the form's own choices (call-lead.ts holds the reader to these) */
  const LABEL = { relationship:'Who called', client_first_name:'Client\'s first name', client_last_name:'Client\'s last name', client_dob:'Birth date', client_gender:'Gender',
    client_address:'Street address', client_city:'Town', client_state:'State', client_zip:'ZIP', client_phone:'Client\'s own phone', marital_status:'Marital status', language:'Language',
    source:'How they found us', referral_source_name:'Referred by', referral_subtype:'Kind of referral', desired_start_kind:'When they want to start', desired_start_date:'Start date',
    needs:'Help asked for', weight_bearing:'Can bear weight', level_estimate:'Likely care level', safety:'Safety', mobility:'Gets around', personal_care:'Hands-on help',
    medical_conditions:'Conditions', dementia_follow_up:'Dementia', physician_name:'Doctor', physician_phone:'Doctor\'s phone', preferred_hospital:'Hospital',
    schedule_days:'Days wanted', times_needed:'Times wanted', number_of_hours:'Hours a week', funding_source:'How they will pay', price_quoted:'Price quoted', quoted_price_amount:'Rate quoted',
    why_called:'Why they called', first_name:'Caller\'s first name', last_name:'Caller\'s last name' };
  const WORDS = {
    needs:{ personalCare:'personal care', dementia:'dementia care', transportation:'rides', housekeeping:'housekeeping', respite:'respite', overnight:'overnight', va:'VA', privatePay:'private pay' },
    safety:{ fallRisk:'fall risk', livesAlone:'lives alone', recentHospitalization:'recent hospital stay' },
    personal_care:{ bathing:'bathing', dressing:'dressing', toileting:'toileting', transfers:'transfers' },
    medical_conditions:{ dementia:'dementia', alzheimers:'Alzheimer\'s', parkinsons:'Parkinson\'s', stroke:'stroke', diabetes:'diabetes', copd:'COPD' },
    dementia_follow_up:{ wandering:'wandering', aggression:'aggression', sundowning:'sundowning' },
    desired_start_kind:{ asap:'as soon as possible', by_date:'by a date', this_week:'this week', this_month:'this month', planning:'just planning' },
    mobility:{ independent:'on their own', walker:'walker', wheelchair:'wheelchair', bedbound:'in bed' },
    funding_source:{ private:'private pay', ltc:'long-term care insurance', va:'VA', guide:'Medicare GUIDE', cds:'CDS' },
    weight_bearing:{ yes:'yes', no:'no', unsure:'not sure' }, level_estimate:{ 1:'level 1', 2:'level 2', 3:'level 3' } };
  const FACT = { preferred_name:'Likes to be called', living_situation:'Lives', facility_name:'Facility', why_now:'Why now', allergies:'Allergies' };
  const FACT_WORDS = { living_situation:{ alone:'alone', spouse_partner:'with a spouse or partner', family:'with family', paid_help:'with paid help', facility:'in a facility', other:'other' },
    why_now:{ fall:'a fall', discharge:'leaving the hospital', caregiver_cant_continue:'their caregiver can\'t keep going', memory_worse:'memory getting worse', provider_cant_staff:'their agency can\'t staff it', new_diagnosis:'a new diagnosis', other:'other' } };
  const ATTR = { cats:'a cat in the home', dogs:'a dog in the home', smoking:'smoking in the home', female_caregiver:'a female caregiver', male_caregiver:'a male caregiver', spanish_speaking:'a Spanish-speaking caregiver' };
  const TEXTISH = ['interest_notes', 'medical_notes'];   /* the call's own notes: added below the lead's, never compared */
  const SKIP = ['phone', 'email', 'source', 'price_quoted'];
  const word = (k, v) => (WORDS[k] && WORDS[k][v]) || v;
  const show = (k, v) => Array.isArray(v) ? v.map(x => word(k, x)).join(', ') : word(k, v === true ? 'yes' : v);
  const blank = v => v === '' || v == null || v === false || (Array.isArray(v) && !v.length) || /^\(phone lead\)$/i.test(String(v).trim());
  const same = (a, b) => String(a == null ? '' : a).trim().toLowerCase() === String(b == null ? '' : b).trim().toLowerCase();

  /** What one call's reading adds to this lead, compared with the lead as it is now. Pure (the tests call it). */
  function items(lead, reading){
    const r = reading || {}, p = r.prefill || {}, heard = Array.isArray(r.heard) ? r.heard : Object.keys(p);
    const flat = (window.LeadRules && LeadRules.toForm) ? LeadRules.toForm(lead || {}) : Object.assign({}, lead || {});
    const out = { fresh:[], changed:[], same:[], people:[], also:[], plan:0, medicaid: r.medicaid_mentioned === true };
    heard.forEach(k => {
      if(SKIP.indexOf(k) > -1 || !(k in p)) return;
      const v = p[k], sch = flat.schedule && typeof flat.schedule === 'object' ? flat.schedule : {};
      let now = flat[k];
      if(blank(now) && k === 'times_needed') now = sch.times;   /* kept in the schedule too (lead-rules compose) */
      if(blank(now) && k === 'number_of_hours' && sch.hours_per_week != null) now = String(sch.hours_per_week);
      if(TEXTISH.indexOf(k) > -1){ if(!blank(v) && String(now || '').indexOf(String(v).trim()) < 0) out.also.push({ key:k, text:String(v) }); return; }
      if(k === 'desired_start_date' && heard.indexOf('desired_start_kind') > -1) return;   /* shown with the start */
      const label = LABEL[k] || k;
      let words = show(k, v);
      if(k === 'desired_start_kind' && v === 'by_date' && p.desired_start_date) words = 'by ' + p.desired_start_date;
      if(Array.isArray(v)){
        const add = v.filter(x => (Array.isArray(now) ? now : []).indexOf(x) < 0);
        if(!add.length){ out.same.push(label); return; }
        out.fresh.push({ key:k, label, words: blank(now) ? show(k, v) : 'adds ' + show(k, add), safety: k === 'safety' || (k === 'dementia_follow_up' && add.indexOf('wandering') > -1) });
        return;
      }
      if(blank(now)){ out.fresh.push({ key:k, label, words }); return; }
      if(same(now, v) || (k === 'desired_start_kind' && v === flat.desired_start_kind && (v !== 'by_date' || same(p.desired_start_date, flat.desired_start_date)))){ out.same.push(label); return; }
      let before = show(k, now);
      if(k === 'desired_start_kind' && now === 'by_date' && flat.desired_start_date) before = 'by ' + flat.desired_start_date;
      out.changed.push({ key:k, label, before, now: words });
    });
    const prof = r.profile || {}, cp = (lead && lead.call_profile) || {}, haveFacts = cp.facts || {}, haveAttr = (lead && lead.client_attributes) || {};
    Object.keys(prof.facts || {}).forEach(k => {
      const v = prof.facts[k], had = haveFacts[k], label = FACT[k] || k;
      const w = x => Array.isArray(x) ? x.map(y => (FACT_WORDS[k] || {})[y] || y).join(', ') : ((FACT_WORDS[k] || {})[x] || x);
      if(blank(had)) out.fresh.push({ key:'fact:' + k, label, words:w(v), safety: k === 'why_now' && (Array.isArray(v) ? v : [v]).indexOf('fall') > -1 });
      else if(JSON.stringify(had) === JSON.stringify(v)) out.same.push(label);
      else out.changed.push({ key:'fact:' + k, label, before:w(had), now:w(v) });
    });
    Object.keys(prof.attributes || {}).forEach(k => {
      if(same(haveAttr[k], prof.attributes[k])) return;
      out.fresh.push({ key:'attr:' + k, label:'Home & Life', words:(ATTR[k] || k) + (prof.attributes[k] === 'preferred' ? ' (preferred)' : '') });
    });
    const known = new Set([lead && lead.first_name, lead && lead.client_first_name].concat((cp.people || []).map(x => x && x.name)).filter(Boolean).map(x => String(x).trim().toLowerCase().split(/\s+/)[0]));
    (prof.people || []).forEach(x => { if(x && x.name && !known.has(String(x.name).trim().toLowerCase().split(/\s+/)[0])) out.people.push(x); });
    const plan = r.care_plan || {};
    out.plan = Object.keys(plan.fields || {}).length + (plan.narrative ? 1 : 0) + ((plan.axiscare_tasks || []).length ? 1 : 0);
    return out;
  }

  async function load(id, force){
    if(!id || S.busy[id] || typeof sb === 'undefined' || !sb) return;
    if(!force && S.at[id] && Date.now() - S.at[id] < 60e3) return;
    S.busy[id] = true;
    try{
      const { data, error } = await sb.from('call_learned').select('message_id, lead_id, msg_at, direction, seconds, staff, status, tries, reading, note, decided, decided_by, decided_at, decided_note')
        .eq('lead_id', String(id)).order('msg_at', { ascending:false }).limit(30);
      S.rows[id] = error ? [] : (data || []); S.err[id] = error ? (error.message || 'could not read') : '';
    }catch(e){ S.rows[id] = []; S.err[id] = 'could not read'; }
    S.at[id] = Date.now(); S.busy[id] = false; redraw();
  }
  function refresh(id){ load(id, true); }

  const when = iso => { try{ return new Date(iso).toLocaleString('en-US', { timeZone:'America/Chicago', weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }).replace(/\s?([AP])M$/, (m, x) => ' ' + x.toLowerCase() + 'm'); }catch(e){ return ''; } };
  const who = e => { const p = ((typeof OPS_PEOPLE !== 'undefined' && OPS_PEOPLE) || []).find(x => x && String(x.primary_email || '').toLowerCase() === String(e || '').toLowerCase()); return p ? String(p.full_name || '').split(/\s+/)[0] : (e ? String(e).split('@')[0].replace(/^./, c => c.toUpperCase()) : 'the office'); };
  const callLine = r => (r.direction === 'outbound' ? who(r.staff) + ' called them' : 'They called, ' + who(r.staff) + ' answered') + ' · ' + when(r.msg_at) + (r.seconds ? ' · ' + Math.max(1, Math.round(r.seconds / 60)) + ' min' : '');

  function boxHtml(l, r, open){
    const it = items(l, r.reading), live = isLive(), dis = live ? '' : ' disabled';
    const pk = S.pick[r.message_id] || (S.pick[r.message_id] = { off:{}, keepOld:{} });
    const n = it.fresh.length + it.changed.length + it.people.length;
    if(!open) return '<div class="cl2-more"><b>' + esc(callLine(r)) + '</b> · ' + (n ? n + ' thing' + (n === 1 ? '' : 's') + ' learned' : 'nothing new') + ' <button class="linklike" onclick="CallLearned.open(\'' + esc(r.message_id) + '\')">Show</button></div>';
    const row = (key, inner, safety) => '<label class="cl2-row"><input type="checkbox"' + (pk.off[key] ? '' : ' checked') + dis + ' onchange="CallLearned.toggle(\'' + esc(r.message_id) + '\',\'' + esc(key) + '\',this.checked)"><span>' + inner + '</span>' + (safety ? '<span class="cl2-safe">Safety</span>' : '') + '</label>';
    let h = '<div class="card lw-card cl2-box"><div class="cl2-head"><b>Learned on this call</b><span class="field-note">' + esc(callLine(r)) + '</span>'
      + (live ? '' : '<span class="cl2-practice">Practice: only owners see this, and nothing can be added yet</span>') + '</div>';
    if(!n && !it.also.length) h += '<div class="field-note" style="margin:8px 0;">Nothing new on this call: everything it said is already on the profile' + (it.same.length ? ' (' + esc(it.same.join(', ')) + ')' : '') + '.</div>';
    if(it.fresh.length) h += '<div class="cl2-k">New</div>' + it.fresh.map(x => row(x.key, '<b>' + esc(x.label) + ':</b> ' + esc(x.words), x.safety)).join('');
    if(it.changed.length) h += '<div class="cl2-k">Changed since an earlier call</div>' + it.changed.map(x => '<div class="cl2-chg"><div><b>' + esc(x.label) + '</b><div class="field-note">Before: ' + esc(x.before) + '</div><div>Now: <b>' + esc(x.now) + '</b> <span class="field-note">(this call)</span></div></div>'
      + '<div class="cl2-chg-b"><button class="lb-btn' + (pk.keepOld[x.key] ? '' : ' cl2-on') + '"' + dis + ' onclick="CallLearned.keep(\'' + esc(r.message_id) + '\',\'' + esc(x.key) + '\',false)">Use the new one</button>'
      + '<button class="lb-btn' + (pk.keepOld[x.key] ? ' cl2-on' : '') + '"' + dis + ' onclick="CallLearned.keep(\'' + esc(r.message_id) + '\',\'' + esc(x.key) + '\',true)">Keep the old one</button></div></div>').join('');
    if(it.people.length) h += '<div class="cl2-k">New ' + (it.people.length === 1 ? 'person' : 'people') + '</div>' + it.people.map((x, i) => row('person:' + i, '<b>' + esc(x.name) + '</b>' + (x.relationship ? ', ' + esc(x.relationship) : '') + (x.note ? ': ' + esc(x.note) : ''))).join('');
    if(it.also.length) h += '<div class="cl2-k">Also said on this call</div><div class="cl2-also">' + it.also.map(x => esc(x.text)).join('<br><br>') + '</div><div class="field-note">Added below the lead\'s own notes.</div>';
    if(it.plan) h += '<div class="field-note" style="margin-top:6px;">Care plan draft: ' + it.plan + ' part' + (it.plan === 1 ? '' : 's') + ' heard on this call, added to the draft.</div>';
    if(it.medicaid) h += '<div class="field-note" style="margin-top:6px;color:#A83A2F;">They mentioned Medicaid. We no longer accept it; CDS may fit.</div>';
    if(it.same.length && n) h += '<div class="cl2-k">Already on the profile</div><div class="field-note">' + esc(it.same.join(' · ')) + '</div>';
    const count = it.fresh.filter(x => !pk.off[x.key]).length + it.people.filter((x, i) => !pk.off['person:' + i]).length + it.changed.filter(x => !pk.keepOld[x.key]).length;
    h += '<div class="cl2-bar"><button class="primary"' + (live && (count || it.also.length || it.plan) ? '' : ' disabled') + ' onclick="CallLearned.add(\'' + esc(r.message_id) + '\')">' + (count ? 'Add the ' + count + ' checked' : 'Add') + '</button>'
      + '<button class="ghost"' + dis + ' onclick="CallLearned.wrong(\'' + esc(r.message_id) + '\')">Something is wrong</button>'
      + '<span class="field-note">' + (live ? 'Add opens the lead form with these filled in (yellow) for you to check and save. Unchecked ones stay in this call\'s record.' : 'When this is switched on, Add opens the lead form with these filled in for you to check and save.') + '</span></div></div>';
    return h;
  }

  function html(l){
    if(!l || !visible()) return '';
    if(!S.rows[l.id]){ load(l.id); return ''; }
    if(S.at[l.id] && Date.now() - S.at[l.id] > 60e3) load(l.id);
    const rows = S.rows[l.id] || [];
    if(S.err[l.id]) return '<div class="card lw-card"><b>Learned on this call</b> <span class="field-note">Could not be read just now (' + esc(S.err[l.id]) + '). It tries again in a minute.</span></div>';
    const open = rows.filter(r => r.status === 'read' && !r.decided);
    const notes = rows.filter(r => !r.decided && (r.status === 'no_transcript' || r.status === 'error' || r.status === 'waiting' || (r.status === 'skipped' && /would not read/.test(r.note || ''))));
    const wrong = rows.filter(r => r.decided === 'wrong');
    if(!open.length && !notes.length && !wrong.length) return '';
    const shown = S.shown && open.some(r => r.message_id === S.shown) ? S.shown : (open[0] || {}).message_id;
    let h = open.map(r => boxHtml(l, r, r.message_id === shown)).join('');
    if(notes.length || wrong.length) h += '<div class="card lw-card cl2-notes">' + notes.map(r => '<div class="field-note">' + esc(callLine(r)) + ': '
      + (r.status === 'waiting' ? 'waiting for GoHighLevel\'s transcript, reading it soon.' : r.status === 'no_transcript' ? '<b>no transcript</b>, so nothing could be learned. Listen to the call and type anything new into the lead.' : r.status === 'skipped' ? '<b>the AI would not read this call</b>. Listen to it and type anything new into the lead.'
      : '<b style="color:#A83A2F;">could not be read</b> (' + esc(r.note || 'error') + ').' + (Number(r.tries || 0) >= 4 ? ' It stopped trying: listen to the call and type anything new into the lead.' : ' It tries again.')) + '</div>').join('')
      + wrong.map(r => '<div class="field-note">' + esc(callLine(r)) + ': marked wrong by ' + esc(who(r.decided_by)) + (r.decided_note ? ' ("' + esc(r.decided_note) + '")' : '') + '.</div>').join('') + '</div>';
    return h;
  }

  function toggle(id, key, on){ const pk = S.pick[id] || (S.pick[id] = { off:{}, keepOld:{} }); if(on) delete pk.off[key]; else pk.off[key] = true; redraw(); }
  function keep(id, key, old){ const pk = S.pick[id] || (S.pick[id] = { off:{}, keepOld:{} }); if(old) pk.keepOld[key] = true; else delete pk.keepOld[key]; redraw(); }
  function open(id){ S.shown = id; redraw(); }
  const rowOf = id => { for(const k in S.rows) for(const r of S.rows[k] || []) if(r.message_id === id) return r; return null; };

  /** Add: the regular lead form, only what was checked, the call's answer where "Use the new one". */
  function add(id){
    if(!isLive()) return;
    const r = rowOf(id), l = r && leadOf(r.lead_id); if(!r || !l || !r.reading) return;
    if(!(window.CallLead && CallLead.fillLearned)){ say('The lead form could not be opened. Refresh the page.'); return; }
    const it = items(l, r.reading), pk = S.pick[id] || { off:{}, keepOld:{} }, rd = r.reading;
    const take = new Set(it.fresh.filter(x => !pk.off[x.key]).map(x => x.key).concat(it.changed.filter(x => !pk.keepOld[x.key]).map(x => x.key)));
    const replace = new Set(it.changed.filter(x => !pk.keepOld[x.key]).map(x => x.key).filter(k => k.indexOf(':') < 0));
    const prefill = {}, heard = [];
    Object.keys(rd.prefill || {}).forEach(k => { if(take.has(k) || TEXTISH.indexOf(k) > -1 || (k === 'desired_start_date' && take.has('desired_start_kind'))){ prefill[k] = rd.prefill[k]; heard.push(k); } });
    const prof = rd.profile || {}, facts = {}, attributes = {};
    Object.keys(prof.facts || {}).forEach(k => { if(take.has('fact:' + k)) facts[k] = prof.facts[k]; });
    Object.keys(prof.attributes || {}).forEach(k => { if(take.has('attr:' + k)) attributes[k] = prof.attributes[k]; });
    const people = it.people.filter((x, i) => !pk.off['person:' + i]);
    const call = { message_id:r.message_id, at:r.msg_at, direction:r.direction, seconds:r.seconds };
    /* transcript:false = this only files what was heard; the call itself is already on the lead's history (the recorder) */
    CallLead.fillLearned({ prefill, heard, care_plan: rd.care_plan || { fields:{}, narrative:'', axiscare_tasks:[] }, profile:{ facts, attributes, people }, call, calls:[call], transcript:false, medicaid_mentioned: rd.medicaid_mentioned === true },
      String(l.id), { replace, learned: r.message_id, replaceFacts: it.changed.filter(x => !pk.keepOld[x.key] && x.key.indexOf('fact:') === 0).map(x => x.key.slice(5)) });
  }
  async function wrong(id){
    if(!isLive()) return;
    const why = prompt('What is wrong with what it heard? (kept with this call, so it can be fixed)');
    if(why === null) return;
    try{ const res = await sb.rpc('call_learned_decide', { p_message_id:id, p_decided:'wrong', p_note:why }); if(res && res.error) throw res.error; }
    catch(e){ say('Could not mark it: ' + (e && e.message || e)); return; }
    const r = rowOf(id); if(r) refresh(r.lead_id);
  }

  (function css(){
    if(typeof document === 'undefined' || document.getElementById('cl2Css')) return;
    const st = document.createElement('style'); st.id = 'cl2Css';
    st.textContent = '.cl2-box{border:2px solid var(--teal,#1F7A8C)}.cl2-head{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.cl2-head b{font-size:15px;color:var(--navy)}'
      + '.cl2-practice{background:#FFF4E3;color:#8A4E0C;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700}'
      + '.cl2-k{margin:12px 0 4px;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted,#55677a)}'
      + '.cl2-row{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid #EEF2F7;font-size:14px;cursor:pointer}.cl2-row input{width:18px;height:18px;margin:2px 0 0;flex-shrink:0}'
      + '.cl2-safe{margin-left:auto;background:#FDECEA;color:#A3321F;border-radius:6px;padding:1px 8px;font-size:12px;font-weight:700}'
      + '.cl2-chg{display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap;padding:10px 12px;margin:4px 0;background:#FFF8EC;border:1px solid #F2D6A6;border-radius:10px;font-size:14px}'
      + '.cl2-chg-b{display:flex;gap:6px;flex-wrap:wrap}.cl2-on{background:var(--teal,#1F7A8C)!important;color:#fff!important;border-color:var(--teal,#1F7A8C)!important}'
      + '.cl2-also{font-size:13.5px;white-space:pre-line;background:#F6F8FB;border-radius:8px;padding:8px 10px}'
      + '.cl2-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px}.cl2-bar .field-note{flex:1;min-width:200px}'
      + '.cl2-more{font-size:13.5px;padding:8px 2px}.cl2-notes{display:flex;flex-direction:column;gap:4px}'
      + '.cl2-box button:disabled,.cl2-box input:disabled{opacity:.45;cursor:not-allowed}';
    document.head.appendChild(st);
  })();

  window.CallLearned = { html, items, load, refresh, toggle, keep, open, add, wrong, _state:S };
})();
