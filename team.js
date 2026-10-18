/* =====================================================================================================================
   TEAM NUMBERS AND REVIEWS (Care Coordinator Leads and Bonus, Stage 5; policy approved by Samantha 2026-10-18). The
   window opened from My Work. Everything comes from the cc-team server function, which decides who sees what (the
   review records never reach the page except through it):
     · a Care Coordinator: "My month", their own numbers and what is overdue for them now. Nothing about anyone else.
     · Samantha and Zachary: "Team", every Care Coordinator side by side.
     · management reviews: the HR lead (Zachary) sees and decides them (the cause, then No action or Coaching with an
       owner, a deadline and a plan); Samantha sees one only once it is unresolved; a coaching owner sees their coaching
       and checks it off with a note. Never discipline.
   The switch (ops_settings.team_live) and the HR lead are in Settings > Leads > Team numbers and reviews. Nothing here
   contacts anyone. The numbers start a conversation; they never decide it.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const ST = { data:null, busy:false };
  const KIND = { first_call:'first call', promise:'call we promised', follow_up:'follow-up', check_back:'check-back', second_try:'second try', relationship_call:'relationship call' };
  const ROWS = [['leads_assigned', 'Leads assigned'], ['assessments_owned', 'Assessments on their leads'], ['assessments_helped', 'Assessments helped with'], ['starts', 'New clients started'],
    ['retained_30', 'Retained at 30 days'], ['overdue_now', 'Overdue follow-ups and calls now'], ['bonuses', 'Bonuses earned']];
  const css = () => { if(document.getElementById('cctCss')) return; const s = document.createElement('style'); s.id = 'cctCss';
    s.textContent = '.cct-bg{position:fixed;inset:0;background:rgba(13,54,95,.45);z-index:10000;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto}'
      + '.cct-dlg{background:#fff;border-radius:14px;max-width:860px;width:100%;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.2)}'
      + '.cct-h{display:flex;align-items:center;gap:10px;margin-bottom:6px}.cct-h h3{margin:0;color:var(--navy);font-size:19px}'
      + '.cct-k{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin:16px 0 6px}'
      + '.cct-t{width:100%;border-collapse:collapse;font-size:13.5px}.cct-t th,.cct-t td{padding:7px 8px;border-top:1px solid var(--border);text-align:left}.cct-t td.n,.cct-t th.n{text-align:right}'
      + '.cct-t th{color:var(--navy);font-weight:700}.cct-red{color:#B23B2E;font-weight:700}'
      + '.cct-card{border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin:8px 0}.cct-sub{font-size:12.5px;color:var(--text-muted)}'
      + '.cct-banner{background:#FDF3E3;color:#7A4A0B;border-radius:10px;padding:10px 12px;margin:8px 0;font-size:13px}'
      + '.cct-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-top:8px}.cct-grid label{font-size:12px}';
    document.head.appendChild(s); };
  async function call(body){
    try{ const { data, error } = await sb.functions.invoke('cc-team', { body });
      if(error){ let m = error.message || 'Could not reach the team service.'; try{ const j = await error.context.json(); if(j && j.error) m = j.error; }catch(e){} return { error:m }; }
      return data || { error:'No answer.' };
    }catch(e){ return { error:'Could not reach the team service.' }; }
  }
  const S = () => (typeof DATA !== 'undefined' && DATA.ops_settings) || {};
  const isCc = () => { const me = String((typeof ccActor === 'function' && ccActor().name) || '').split(/\s+/)[0].toLowerCase(); const p = (S().lead_rotation && S().lead_rotation.people) || []; return !!me && p.some(x => String(x && x.name || '').split(/\s+/)[0].toLowerCase() === me); };
  /* the My Work button: "Team" for owners (always), "My month" for a Care Coordinator once it is on */
  function btnSync(){ const b = document.getElementById('cctBtn'); if(!b) return; const owner = typeof ccIsOwner === 'function' && ccIsOwner();
    b.textContent = owner ? 'Team' : 'My month'; b.style.display = (owner || (S().team_live === true && isCc())) ? '' : 'none'; }
  function close(){ const m = document.getElementById('cctModal'); if(m) m.remove(); }
  async function open(){
    css(); close();
    const bg = document.createElement('div'); bg.id = 'cctModal'; bg.className = 'cct-bg';
    bg.innerHTML = '<div class="cct-dlg" role="dialog" aria-modal="true" aria-label="Team numbers"><div class="field-note">Loading…</div></div>';
    bg.addEventListener('click', e => { if(e.target === bg) close(); });
    document.body.appendChild(bg);
    ST.data = await call({ action:'list' }); draw();
  }
  const val = (m, k) => k === 'bonuses' ? (m.bonuses + (m.bonus_dollars ? ' ($' + m.bonus_dollars + ')' : '')) : k === 'overdue_now' && m.overdue_while_out ? m[k] + ' (+' + m.overdue_while_out + ' while out, not counted)' : m[k];   /* audit step 2: time off never counts */
  function review(r, me, people){
    const B = (fn, label, primary) => '<button class="' + (primary ? 'primary' : 'ghost') + '" style="padding:5px 11px;font-size:12px;" onclick="' + fn + '">' + label + '</button>';
    const co = (ST.data && ST.data.overdue_causes) || {};
    const items = (r.items || []).map(x => esc(KIND[x.kind] || x.kind) + (x.client ? ' (' + esc(x.client) + ')' : '') + ' ' + esc(x.day) + (x.cause && ST.data.causes_live ? ': ' + esc(co[x.cause] || x.cause) + (x.cause_note ? ' (' + esc(x.cause_note) + ')' : '') : '')).join(' · ');
    const causeEdit = ST.data.causes_live && (me.hr || me.decider) && ['open', 'coaching'].includes(r.status) ? (r.items || []).filter(x => x.key).map(x => '<div class="cct-grid"><label>' + esc(KIND[x.kind] || x.kind) + (x.client ? ' (' + esc(x.client) + ')' : '') + '<select id="cctCz_' + esc(x.key) + '">' + Object.keys(co).filter(k => k !== 'leave').map(k => '<option value="' + k + '"' + (k === x.cause ? ' selected' : '') + '>' + esc(co[k]) + '</option>').join('') + '</select></label><label>Note<input id="cctCn_' + esc(x.key) + '" value="' + esc(x.cause_note || '') + '"></label></div><div style="margin:4px 0 6px"><button class="ghost" style="padding:4px 10px;font-size:12px;" onclick="cctCause(\'' + esc(x.key) + '\')">Save the cause</button></div>').join('') : '';
    let h = '<div class="cct-card" data-id="' + esc(r.id) + '"><b style="color:var(--navy)">' + esc(r.person) + '</b> <span class="cct-sub">review opened ' + esc(r.opened_on) + '</span>'
      + (r.unresolved ? ' <span class="cct-red">unresolved</span>' : '') + (items ? '<div class="cct-sub">Overdue: ' + items + '</div>' : '') + (causeEdit ? '<details style="margin:6px 0"><summary class="cct-sub">Change why an item happened</summary>' + causeEdit + '</details>' : '');
    if(r.status === 'open' && (me.hr || me.decider)){
      const opts = Object.keys(ST.data.causes || {}).map(k => '<option value="' + k + '">' + esc(ST.data.causes[k]) + '</option>').join('');
      const ppl = people.map(p => '<option value="' + esc(p.e) + '">' + esc(p.n) + '</option>').join('');
      h += '<div class="cct-grid"><label>Cause<select id="cctCause_' + esc(r.id) + '">' + opts + '</select></label>'
        + '<label>What happens<select id="cctChoice_' + esc(r.id) + '" onchange="cctChoice(\'' + esc(r.id) + '\')"><option value="no_action">No action</option><option value="coaching">Coaching</option></select></label>'
        + '<label class="cctC_' + esc(r.id) + '" style="display:none">Coaching owner<select id="cctOwner_' + esc(r.id) + '">' + ppl + '</select></label>'
        + '<label class="cctC_' + esc(r.id) + '" style="display:none">Deadline<input type="date" id="cctDead_' + esc(r.id) + '"></label></div>'
        + '<input class="cctC_' + esc(r.id) + '" id="cctPlan_' + esc(r.id) + '" placeholder="What the coaching covers" style="display:none;width:100%;margin-top:6px;">'
        + '<input id="cctNote_' + esc(r.id) + '" placeholder="Note (optional): what you found" style="width:100%;margin-top:6px;">'
        + '<div style="margin-top:8px;">' + B("cctDecide('" + esc(r.id) + "')", 'Save the decision', true) + ' <span class="cct-sub">A review is never discipline.</span></div>';
    } else if(r.status === 'coaching'){
      h += '<div class="cct-sub">Coaching: ' + esc(r.coaching && r.coaching.plan) + ' · by ' + esc(r.coaching && r.coaching.deadline) + ' · ' + esc(r.cause || '') + '</div>'
        + '<input id="cctDone_' + esc(r.id) + '" placeholder="What was covered?" style="width:100%;margin-top:6px;"><div style="margin-top:6px;">' + B("cctDone('" + esc(r.id) + "')", 'Coaching done', true) + '</div>';
    } else h += '<div class="cct-sub">' + esc(r.status === 'no_action' ? 'No action' : r.status === 'done' ? 'Coaching done' : r.status) + (r.cause ? ' · ' + esc(r.cause) : '') + '</div>';
    return h + '</div>';
  }
  function draw(){
    const box = document.querySelector('#cctModal .cct-dlg'); if(!box) return; const d = ST.data || {};
    const head = t => '<div class="cct-h"><h3>' + t + '</h3><span class="cct-sub">' + esc(d.month || '') + ' so far</span><span style="flex:1"></span><button class="ghost" onclick="cctClose()">Close</button></div>';
    if(d.error){ box.innerHTML = head('Team') + '<p style="color:var(--red)">' + esc(d.error) + '</p>'; return; }
    const me = d.me || {}, months = d.months || [];
    let h = head(me.owner ? 'Team' : 'My month');
    if(!d.live) h += '<div class="cct-banner">Team numbers and reviews are switched off. ' + (me.owner ? 'Turn them on in Settings > Leads > Team numbers and reviews.' : 'Samantha or Zachary turns them on.') + '</div>';
    if(months.length){
      h += '<table class="cct-t"><tr><th></th>' + months.map(m => '<th class="n">' + esc(m.person) + '</th>').join('') + '</tr>'
        + ROWS.map(([k, label]) => '<tr><td>' + label + '</td>' + months.map(m => '<td class="n' + (k === 'overdue_now' && m[k] ? ' cct-red' : '') + '">' + esc(val(m, k)) + '</td>').join('') + '</tr>').join('') + '</table>';
      if(me.owner) h += '<p class="cct-sub" style="margin-top:6px;">The numbers start a conversation; they never decide it. Someone with fewer new clients may be carrying a heavier caseload.</p>';
    }
    if((d.my_overdue || []).length) h += '<div class="cct-k">Overdue for you now</div>' + d.my_overdue.map(o => '<div class="cct-sub" style="color:var(--text)">' + esc(KIND[o.kind] || o.kind) + ': ' + esc(o.client) + ' (since ' + esc(o.since) + ')' + (o.lead_id ? ' <button class="linklike" onclick="cctClose();openLeadProfile(\'' + esc(o.lead_id) + '\')">Open</button>' : '') + '</div>').join('');
    else if(!me.owner && months.length) h += '<div class="cct-k">Overdue for you now</div><div class="cct-sub">Nothing. Nicely done.</div>';
    /* audit step 3: why each miss happened (only "Mine" counts toward a review) */
    if(d.causes_live && (d.my_missed || []).length){
      const co = d.overdue_causes || {};
      h += '<div class="cct-k">Missed in the last 30 days</div><p class="cct-sub">Mark why each one happened. Only "Mine" counts toward a review. Anything else needs a short note. You have until the next morning\'s check.</p>'
        + d.my_missed.map(x => '<div class="cct-card"><b style="color:var(--navy)">' + esc(KIND[x.kind] || x.kind) + (x.client ? ': ' + esc(x.client) : '') + '</b> <span class="cct-sub">' + esc(x.day) + (x.counts ? '' : ' · not counted') + '</span>'
          + (x.in_review ? '<div class="cct-sub">Part of a review: ' + esc(co[x.cause] || x.cause) + '. Zachary decides its cause now.</div>'
            : x.cause === 'leave' ? '<div class="cct-sub">Approved leave (you were out). Never counts.</div>'
            : '<div class="cct-grid"><label>Why<select id="cctCz_' + esc(x.key) + '">' + Object.keys(co).filter(k => k !== 'leave').map(k => '<option value="' + k + '"' + (k === x.cause ? ' selected' : '') + '>' + esc(co[k]) + '</option>').join('') + '</select></label>'
              + '<label>Note<input id="cctCn_' + esc(x.key) + '" value="' + esc(x.cause_note || '') + '" placeholder="What happened?"></label></div><div style="margin-top:6px"><button class="ghost" style="padding:5px 11px;font-size:12px;" onclick="cctCause(\'' + esc(x.key) + '\')">Save</button></div>')
          + '</div>').join('');
    }
    const rs = d.reviews || [];
    if(me.hr || me.decider || rs.length){
      const people = (typeof OPS_PEOPLE !== 'undefined' && OPS_PEOPLE || []).filter(p => p && p.primary_email).map(p => ({ e:String(p.primary_email).toLowerCase(), n:p.full_name || p.primary_email }));
      h += '<div class="cct-k">' + (me.hr ? 'Management reviews' : me.decider ? 'Unresolved reviews' : 'Your coaching') + '</div>'
        + (rs.length ? rs.map(r => review(r, me, people)).join('') : '<div class="cct-sub">' + (me.decider && !me.hr ? 'Nothing unresolved. Zachary handles reviews; one comes here only if it is open 7 days or coaching runs past its deadline.' : 'Nothing open.') + '</div>');
    }
    box.innerHTML = h;
  }
  function choice(id){ const c = (document.getElementById('cctChoice_' + id) || {}).value; document.querySelectorAll('.cctC_' + id).forEach(e => { e.style.display = c === 'coaching' ? '' : 'none'; }); }
  const v = id => String((document.getElementById(id) || {}).value || '').trim();
  async function send(body){
    if(ST.busy) return; ST.busy = true; const r = await call(body); ST.busy = false;
    if(r.error){ alert(r.error); return; }
    if(typeof ccToast === 'function') ccToast('✓ Saved'); ST.data = await call({ action:'list' }); draw(); btnBadge();
  }
  function decide(id){ const c = v('cctChoice_' + id);
    send(Object.assign({ action:'act', id, do:'decide', cause:v('cctCause_' + id), choice:c, note:v('cctNote_' + id) }, c === 'coaching' ? { coaching_owner:v('cctOwner_' + id), deadline:v('cctDead_' + id), plan:v('cctPlan_' + id) } : {})); }
  function done(id){ send({ action:'act', id, do:'coaching_done', note:v('cctDone_' + id) }); }
  function cause(key){ send({ action:'set_cause', key, cause:v('cctCz_' + key), note:v('cctCn_' + key) }); }
  /* the HR lead's button shows how many reviews wait on him */
  async function btnBadge(){ const b = document.getElementById('cctBtn'); if(!b || b.style.display === 'none' || !(typeof ccIsOwner === 'function' && ccIsOwner())) return;
    const d = (ST.data && !ST.data.error) ? ST.data : null; const n = d && d.waiting ? d.waiting : 0; b.textContent = 'Team' + (n ? ' (' + n + ')' : ''); }
  window.CcTeam = { open, close, btnSync, call };
  Object.assign(window, { cctOpen:open, cctClose:close, cctChoice:choice, cctDecide:decide, cctDone:done, cctCause:cause, cctBtnSync:btnSync });
})();
