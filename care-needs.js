/* =====================================================================================================================
   CARE NEEDS FOR MATCHING (Samantha "go", 2026-10-12, Track 3c). A checklist on the client profile's Care tab, shown only
   while the Admin switch "Care needs for matching" (ops_settings.care_needs_live) is on. The 17 needs on the one skill list
   (match-rules.js) plus whether more than one person is needed to transfer, the lift type, pets and smoking, caregiver gender, Spanish and the advanced tasks we do not provide.
   The lead's answers show as "from intake, to confirm" and never count as confirmed. Confirm saves each changed answer to the
   client's fact record on the care plan layer, through the one door (client-fact), with the coordinator's name and the
   date: a change is an update (their needs changed) or a correction with a reason (it was wrong); someone else's newer save
   is never overwritten (stale). Missing never means none: unanswered needs make the client "Matching requirements
   incomplete". Nothing here texts anyone, and no matching screen reads these yet.
   CN.render(boxId). Needs: sb, CP (the open client profile), lpfCall (the door), escapeHtmlComms.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = t => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(t) : String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]));
  const RPN = [['required', 'Required'], ['preferred', 'Preferred'], ['no', 'No']];
  const EXTRA = [
    /* her rule (2026-10-18): never two-person transfers; Yes = "Needs a lift before we staff" until a lift is Required above */
    { kind: 'need_more_than_one_to_transfer', label: 'Needs more than one person to transfer', opts: [['yes', 'Yes'], ['no', 'No']] },
    { kind: 'need_lift_type', label: 'Lift type (if a lift is used)', opts: [['full_body_sling', 'Full-body sling'], ['sit_to_stand', 'Sit-to-stand'], ['other', 'Other']], optional: true },
    { kind: 'home_cats', label: 'Cats in the home', opts: [['yes', 'Yes'], ['no', 'No']], lead: 'cats' },
    { kind: 'home_dogs', label: 'Dogs in the home', opts: [['yes', 'Yes'], ['no', 'No']], lead: 'dogs' },
    { kind: 'home_smoking', label: 'Someone smokes in the home', opts: [['yes', 'Yes'], ['no', 'No']], lead: 'smoking' },
    { kind: 'pref_caregiver_gender', label: 'Caregiver gender', opts: [['female_required', 'Female, required'], ['female_preferred', 'Female, preferred'], ['male_required', 'Male, required'], ['male_preferred', 'Male, preferred'], ['no_preference', 'No preference']] },
    { kind: 'need_spanish', label: 'Spanish-speaking caregiver', opts: RPN, lead: 'spanish_speaking' },
  ];
  const ADVANCED = [['catheter_change', 'Changing, inserting or removing a catheter'], ['stoma_care', 'Stoma care'], ['bowel_program', 'A bowel program'], ['prescription_creams', 'Prescription creams'], ['nurse_set_medication', 'Medication help set up by a nurse'], ['passive_range_of_motion', 'Passive range of motion']];
  const S = { box: null, key: null, ep: null, cur: {}, draft: {}, msg: '', busy: false, err: '' };
  const live = () => !!((window.DATA || {}).ops_settings || {}).care_needs_live;
  const q = p => p.then(r => { if (r.error) throw r.error; return r.data || []; });
  async function ensureRules(){
    if (window.CCMatch) return;
    await new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = 'match-rules.js?v=20261018'; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); });
  }
  async function load(){
    const l = window.CP && CP.lead; S.ep = null; S.cur = {}; S.err = '';
    if (!l) return;
    const src = await q(sb.from('episode_source').select('episode_id').eq('system', 'lead').eq('role', 'origin').eq('source_ref', String(l.id)));
    S.ep = (src[0] && src[0].episode_id) || null; if (!S.ep) return;
    const kinds = CCMatch.SKILLS.map(s => 'need_' + s.key).concat(EXTRA.map(e => e.kind), ['need_advanced_tasks']);
    (await q(sb.from('client_fact_current').select('fact_id,kind,layer,value,certainty,recorded_by,recorded_at').eq('episode_id', S.ep).in('layer', ['plan', 'current']).in('kind', kinds)))
      .forEach(f => { const was = S.cur[f.kind]; if (!was || (f.layer === 'current' && was.layer !== 'current') || String(f.recorded_at) > String(was.recorded_at)) S.cur[f.kind] = f; });
  }
  const curVal = k => S.cur[k] ? S.cur[k].value : undefined;
  const val = k => (k in S.draft) ? S.draft[k] : curVal(k);
  function intakeOf(){ const l = window.CP && CP.lead; return l ? CCMatch.fromLead(l.client_attributes || {}) : {}; }
  function needsForRule(){ const n = {}; CCMatch.SKILLS.forEach(s => { const f = S.cur['need_' + s.key]; if (f) n[s.key] = { value: f.value, stage: f.layer }; }); return n; }
  function seg(kind, opts, v){ return '<span style="display:inline-flex;gap:3px;flex-wrap:wrap">' + opts.map(([val2, lab]) => '<button type="button" class="' + (v === val2 ? 'primary' : 'secondary') + '" style="font-size:12px;padding:3px 9px" onclick="window.CN.set(\'' + kind + '\',\'' + val2 + '\')">' + esc(lab) + '</button>').join('') + '</span>'; }
  function who(f){ return f ? '<span class="field-note">' + (f.layer === 'current' ? 'current' : 'care plan') + ', ' + esc(String(f.recorded_by || '').split('@')[0]) + ' ' + esc(String(f.recorded_at || '').slice(0, 10)) + '</span>' : '<span class="field-note" style="color:#92400E">not yet known</span>'; }
  function render(){
    const box = S.box; if (!box) return;
    if (!live()) { box.innerHTML = ''; return; }
    if (!window.CCMatch) { box.innerHTML = '<div class="card" style="padding:14px 18px;margin-bottom:12px;"><div class="field-note">Loading…</div></div>'; return; }
    const l = window.CP && CP.lead;
    let h = '<div class="card" style="padding:14px 18px;margin-bottom:12px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><b style="font-size:15px;color:var(--navy);">🧩 Care needs for matching</b></div>'
      + '<div class="field-note" style="margin-bottom:8px">Confirm each need on the care plan: Required, Preferred or No. What the family told us at intake shows beside it, to confirm; it never counts until you confirm. Nothing here texts anyone, and no matching screen reads these yet.</div>';
    if (!l) return box.innerHTML = h + '<div class="field-note">No inquiry is on file for this client, so there is no Journey to keep their needs on yet.</div></div>';
    if (S.err) return box.innerHTML = h + '<div class="field-note" style="color:#B91C1C">Could not load: ' + esc(S.err) + '</div></div>';
    if (!S.ep) return box.innerHTML = h + '<div class="field-note">This client\'s Journey is not open yet, so needs cannot be kept. It opens with their inquiry.</div></div>';
    const cs = CCMatch.clientState({ payer: (l.funding_source === 'medicaid' ? 'medicaid' : l.funding_source), plan_current: true, needs: needsForRule(), facts: { more_than_one_to_transfer: curVal('need_more_than_one_to_transfer') === 'yes' }, advanced_tasks: (curVal('need_advanced_tasks') || []).map(k => (ADVANCED.find(a => a[0] === k) || [k, k])[1]) });
    const banner = cs.status === 'ok' ? ['#DCFCE7', '#15803D', 'Matching requirements complete: every need is confirmed on the care plan.'] : cs.status === 'flagged' ? ['#FEE2E2', '#991B1B', cs.message] : cs.status === 'not_matched' ? ['#F4F2ED', '#3A342C', cs.message] : ['#FEF3C7', '#92400E', cs.message];
    h += '<div style="background:' + banner[0] + ';color:' + banner[1] + ';border-radius:8px;padding:7px 10px;font-size:13px;font-weight:600;margin-bottom:8px">' + esc(banner[2]) + '</div>';
    const intake = intakeOf();
    h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
    CCMatch.SKILLS.forEach(s => { const k = 'need_' + s.key, it = intake[s.key];
      h += '<tr style="border-top:1px solid var(--border)"><td style="padding:5px 4px;font-weight:600">' + esc(s.label) + (s.checkFirst ? ' <span class="field-note">(checked first)</span>' : '') + (s.medicaid ? ' <span class="field-note" style="color:#92400E">(' + (s.medicaid === 'apc' ? 'Medicaid: advanced personal care' : 'Medicaid: waits on MMAC') + ')</span>' : '') + '</td>'
        + '<td style="padding:5px 4px">' + (it ? '<span class="field-note">from intake: ' + esc(it.value) + ', to confirm</span>' : '') + '</td>'
        + '<td style="padding:5px 4px;white-space:nowrap">' + seg(k, RPN, val(k)) + '</td><td style="padding:5px 4px">' + (k in S.draft && S.draft[k] !== curVal(k) ? '<span class="field-note" style="color:#1E40AF">changed, not saved</span>' : who(S.cur[k])) + '</td></tr>'; });
    EXTRA.forEach(e => { const ca = (l.client_attributes || {})[e.lead];
      h += '<tr style="border-top:1px solid var(--border)"><td style="padding:5px 4px;font-weight:600">' + esc(e.label) + '</td><td style="padding:5px 4px">' + (ca ? '<span class="field-note">from intake: ' + esc(ca) + ', to confirm</span>' : '') + '</td>'
        + '<td style="padding:5px 4px">' + seg(e.kind, e.opts, val(e.kind)) + '</td><td style="padding:5px 4px">' + (e.kind in S.draft && S.draft[e.kind] !== curVal(e.kind) ? '<span class="field-note" style="color:#1E40AF">changed, not saved</span>' : who(S.cur[e.kind])) + '</td></tr>'; });
    const adv = val('need_advanced_tasks') || [];
    h += '<tr style="border-top:1px solid var(--border)"><td style="padding:5px 4px;font-weight:600">Advanced tasks we do not provide <span class="field-note">(any one flags the client for review)</span></td><td></td><td colspan="2" style="padding:5px 4px">'
      + ADVANCED.map(([k, lab]) => '<label style="display:inline-flex;gap:4px;margin:0 10px 3px 0;font-size:12.5px"><input type="checkbox" ' + (adv.includes(k) ? 'checked ' : '') + 'onchange="window.CN.adv(\'' + k + '\',this.checked)">' + esc(lab) + '</label>').join('') + '</td></tr>';
    h += '</table>';
    const changed = Object.keys(S.draft).filter(k => JSON.stringify(S.draft[k]) !== JSON.stringify(curVal(k)));
    h += '<div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap"><button class="primary" ' + (changed.length && !S.busy ? '' : 'disabled ') + 'onclick="window.CN.confirm()">' + (S.busy ? 'Saving…' : 'Confirm ' + (changed.length || '') + ' on the care plan') + '</button>'
      + (changed.length ? '<button class="secondary" onclick="window.CN.discard()">Discard changes</button>' : '') + (S.msg ? '<span class="field-note">' + esc(S.msg) + '</span>' : '') + '</div></div>';
    box.innerHTML = h;
  }
  async function confirmAll(){
    const changed = Object.keys(S.draft).filter(k => JSON.stringify(S.draft[k]) !== JSON.stringify(curVal(k)));
    if (!changed.length || S.busy) return;
    let kind = 'update', reason = null;
    if (changed.some(k => S.cur[k])) {
      const wrong = !(await ccConfirm('Some of these replace an answer already confirmed.\n\nOK = their needs changed (an update)\nCancel = the earlier answer was wrong (a correction, with a reason)'));
      if (wrong) { reason = ((await ccPrompt('Why was the earlier answer wrong? (required for a correction)')) || '').trim(); if (!reason) { S.msg = 'Nothing saved: a correction needs a reason.'; return render(); } kind = 'correction'; }
    }
    S.busy = true; S.msg = ''; render();
    const done = [], refused = [];
    for (const k of changed) {
      const f = S.cur[k], v = S.draft[k];
      if (v == null || (Array.isArray(v) && !v.length && !f)) continue;
      const body = { action: 'record', episode_id: S.ep, kind: k, layer: 'plan', value: v, certainty: 'confirmed', change_kind: f ? kind : 'first', supersedes_fact_id: f ? f.fact_id : null, reason: f ? reason : null, said_how: 'staff_observation', said_at: new Date().toISOString() };
      try { const r = await lpfCall(body); if (r && (r.outcome === 'recorded' || (r.body && r.body.outcome === 'recorded'))) done.push(k); else refused.push((r && (r.message || (r.body && r.body.message))) || 'refused'); }
      catch (e) { refused.push(String(e && e.message || e)); }
    }
    S.busy = false; S.draft = {};
    try { await load(); } catch (e) { S.err = String(e && e.message || e); }
    S.msg = done.length + ' saved' + (refused.length ? '; ' + refused.length + ' not saved: ' + refused[0] : '') + '.';
    render();
  }
  async function mount(id){
    S.box = document.getElementById(id); if (!S.box) return;
    if (!live()) { S.box.innerHTML = ''; return; }
    const key = window.CP && CP.lead ? CP.lead.id : null;
    if (key !== S.key) { S.key = key; S.draft = {}; S.msg = ''; }
    render();
    try { await ensureRules(); await load(); } catch (e) { S.err = String(e && e.message || e); }
    render();
  }
  window.CN = { mount, render, set: (k, v) => { S.draft[k] = v; S.msg = ''; render(); }, adv: (k, on) => { const cur = (val('need_advanced_tasks') || []).filter(x => x !== k); if (on) cur.push(k); S.draft.need_advanced_tasks = cur; render(); },
    confirm: confirmAll, discard: () => { S.draft = {}; S.msg = ''; render(); }, _state: S };
})();
