/* =====================================================================================================================
   CARA'S READY STEPS (Samantha 2026-11-18: "Yes, build it", Practice). window.CS.

   When a caregiver texts or calls about a schedule change, the call reader already prepares the steps a coordinator would
   take: ask the client or family first, change the visit in AxisCare, text the caregiver back. Until now those drafts
   became plain lines on the card. Here they become one-tap steps on the opened Operations Board card:
     a text step      the draft in a box you can edit, who it goes to (caregiver, or the family member you pick), Send
     a permission ask after it is sent: "They said yes" / "They said no"; the AxisCare step waits for a yes
     an AxisCare step the exact visit Cara found, the new day or time, and her checks (no overlap, hours this week); Apply
                      goes through the Hub's own visit-change door (same checks, same record, same-day undo in AxisCare)
   Nothing is sent or changed unless a person taps it. Server: Staffing cara-step (look / send / mark).
   Switch: ops_settings.cara_steps_live. Off: owners see the steps as a preview (practice) and nothing can be sent.
   No em dashes in anything a person reads.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const S = v => String(v == null ? '' : v);
  const E = v => S(v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const TEXT_KINDS = ['text_caregiver', 'ask_client_family_permission', 'text_family_update'];
  const MAX = 640;

  /* ── the rules (pure; tests/cara-steps-test.js runs them under node) ── */
  function onFor(settings, isOwner){ return !!(settings && settings.cara_steps_live === true) || !!isOwner; }
  function liveOn(settings){ return !!(settings && settings.cara_steps_live === true); }
  /* only the reader's own follow-up cards carry prepared steps (cf_<reading>_<n>); a "Promise not kept yet" card (cfp_) and
     a could-not-read card do not, so they show nothing here (2026-11-18 fix) */
  function wants(it){ return !!it && it.kind === 'call_followup' && /^cf_/.test(String(it.id || '')) && !!(it.source && it.source.message_id) && (!it.source.type || it.source.type === 'call_reading'); }
  /* a step after a permission ask waits until that ask is marked yes */
  function blockedBy(steps, i){
    const s = steps[i]; if(!s || !s.waits_for_yes) return null;
    for(let k = 0; k < i; k++){
      const p = steps[k];
      if(p.kind === 'ask_client_family_permission'){
        const how = p.done && p.done.how;
        if(how !== 'yes') return how === 'no' ? 'The family said no, so this waits.' : 'Waits for the family\'s yes.';
      }
    }
    return null;
  }
  const hm = t => { const m = /^(\d{1,2}):(\d{2})/.exec(S(t)); if(!m) return S(t); let h = +m[1]; const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return h + (m[2] === '00' ? '' : ':' + m[2]) + ap; };
  const day = d => { const t = Date.parse(S(d) + 'T12:00:00'); return isNaN(t) ? S(d) : new Date(t).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }); };
  function visitWords(v){
    if(!v) return '';
    const from = day(v.date) + ' ' + hm(v.start) + ' to ' + hm(v.end);
    const p = v.proposed || {};
    const to = day(p.date || v.date) + ' ' + hm(p.start || v.start) + ' to ' + hm(p.end || v.end);
    return from + ' becomes ' + to;
  }
  function checkWords(v){
    const c = (v && v.checks) || {}, out = [];
    if(c.overlap) out.push({ bad:true, t:'Overlaps another visit' + (c.overlap_with && String(c.overlap_with) ? ' (' + (Array.isArray(c.overlap_with) ? c.overlap_with.join(', ') : c.overlap_with) + ')' : '') });
    else if(v && v.checks) out.push({ bad:false, t:'No overlap with their other visits' });
    if(c.week_hours_after != null) out.push({ bad:!!c.over_40, t:(c.over_40 ? 'Goes past 40 hours this week (' : 'Hours this week after the change: ') + Math.round(c.week_hours_after * 10) / 10 + (c.over_40 ? ')' : '') });
    return out;
  }
  /* the body visit-change wants (its own checks run again on the server) */
  function changeBody(v, changeId){
    if(v.change && v.change.visit_id && v.change.expect && v.change.set) return { action:'change', visit_id:S(v.change.visit_id), expect:v.change.expect, set:v.change.set, reason_id:0, change_id:changeId };
    const p = v.proposed || {}, set = {};
    if(p.date && p.date !== v.date) set.date = p.date;
    if(p.start && p.start !== v.start) set.start = p.start;
    if(p.end && p.end !== v.end) set.end = p.end;
    return { action:'change', visit_id:S(v.visit_id), expect:{ caregiver_id:v.caregiver_id == null ? null : S(v.caregiver_id), date:v.date, start:v.start, end:v.end }, set, reason_id:0, change_id:changeId };
  }
  /* the server's look answer, as the page reads it: a done step carries how / by_name / change_id on itself */
  function norm(look){
    const L = Object.assign({}, look || {});
    L.steps = (Array.isArray(L.steps) ? L.steps : []).map(x => {
      const s = Object.assign({}, x);
      if(!s.done && s.status === 'done') s.done = { how:s.how || 'done', by_name:s.by_name || '', change_id:s.change_id || '', at:s.at || '' };
      return s; });
    return L;
  }
  const CORE = { norm, onFor, liveOn, wants, blockedBy, visitWords, checkWords, changeBody, TEXT_KINDS, MAX };
  if(typeof module !== 'undefined' && module.exports){ module.exports = CORE; return; }

  /* ── the page ── */
  const W = root;
  const st = () => (typeof DATA !== 'undefined' && DATA.ops_settings) || {};
  const owner = () => { try{ return !!W.ccIsOwner(); }catch(e){ return false; } };
  const C = {};           /* card_id -> { loading, err, look, msg, busy } */
  async function call(fn, body){
    const { data:{ session } } = await sb.auth.getSession();
    if(!session || !session.access_token) throw new Error('Sign in again, then try.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/' + fn, { method:'POST', headers:{ Authorization:'Bearer ' + session.access_token, apikey:CONFIG.supabase_anon_key, 'Content-Type':'application/json' }, body:JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if(!r.ok) throw new Error(j.error || ('The server answered ' + r.status + '.'));
    return j;
  }
  function paint(id){ const el = document.querySelector('.cs-wrap[data-card="' + CSS.escape(id) + '"]'); if(el) el.innerHTML = body(id); }
  async function load(id, force){
    const c = C[id] || (C[id] = {});
    if(c.loading || (c.look && !force)) return;
    c.loading = true; c.err = ''; paint(id);
    try{ c.look = norm(await call('cara-step', { mode:'look', card_id:id })); }
    catch(e){ c.err = e.message || String(e); }
    c.loading = false; paint(id);
  }
  function panel(it){
    if(!wants(it) || !onFor(st(), owner())) return '';
    setTimeout(() => load(it.id), 0);
    return '<div class="cs-wrap" data-card="' + E(it.id) + '" style="margin:8px 0 4px;padding:12px 14px;border:1px solid var(--border);border-radius:10px;background:var(--bg);">' + body(it.id) + '</div>';
  }
  function body(id){
    const c = C[id] || {};
    let h = '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap;"><b style="color:var(--navy);">Cara has this ready</b><small style="color:var(--gray);">Nothing goes out until you tap it</small></div>';
    if(!liveOn(st())) h += '<div class="field-note" style="margin:6px 0;background:var(--amber-bg);color:var(--amber);padding:6px 8px;border-radius:6px;"><b>Practice.</b> Only owners see this. Sending and AxisCare changes stay off until Cara\'s ready steps are switched on.</div>';
    if(c.loading && !c.look) return h + '<div class="field-note">Getting Cara\'s steps...</div>';
    if(c.err) return h + '<div class="field-note" style="color:var(--red);">' + E(c.err) + ' <button class="linklike" onclick="CS.reload(\'' + E(id) + '\')">Try again</button></div>';
    const L = c.look; if(!L) return h;
    const steps = Array.isArray(L.steps) ? L.steps : [];
    if(!steps.length) return h + '<div class="field-note">No prepared steps on this card. Do it the usual way.</div>';
    if(c.msg) h += '<div class="field-note" style="margin:6px 0;color:' + (c.msgBad ? 'var(--red)' : 'var(--teal)') + ';">' + E(c.msg) + '</div>';
    h += '<ol style="margin:8px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:10px;">';
    steps.forEach((s, i) => { h += '<li>' + stepHtml(id, L, steps, i) + '</li>'; });
    return h + '</ol>';
  }
  function chip(t, col){ return '<span class="tag-chip" style="background:var(' + col + '-bg);color:var(' + col + ');margin-left:6px;">' + E(t) + '</span>'; }
  function stepHtml(id, L, steps, i){
    const s = steps[i], c = C[id], live = liveOn(st()), busy = c.busy === i;
    const done = s.done || null, block = blockedBy(steps, i) || (s.locked && !done ? 'Waits for the family\'s yes.' : null);
    let h = '<b>' + E(s.label || s.kind) + '</b>';
    if(done) h += chip(done.how === 'yes' ? 'They said yes' : done.how === 'no' ? 'They said no' : done.how === 'sent' ? 'Sent' + (done.by_name ? ' by ' + S(done.by_name).split(' ')[0] : '') : done.how === 'skip' ? 'Skipped' : 'Done', done.how === 'no' ? '--red' : '--teal');
    if(s.status === 'needs_person') return h + '<div class="field-note">' + E(s.why || 'A person does this one.') + (s.draft ? ' Cara\'s note: "' + E(s.draft) + '"' : '') + '</div>';
    if(block && !done) h += '<div class="field-note" style="color:var(--amber);">' + E(block) + '</div>';
    if(TEXT_KINDS.indexOf(s.kind) >= 0){
      const to = whoOptions(L, s, id, i);
      if(done && done.how !== 'yes' && done.how !== 'no'){
        if(s.kind === 'ask_client_family_permission' && done.how === 'sent' && live) h += '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;"><button class="primary" ' + (busy ? 'disabled' : '') + ' onclick="CS.mark(\'' + E(id) + '\',' + i + ',\'yes\')">They said yes</button><button class="ghost" ' + (busy ? 'disabled' : '') + ' onclick="CS.mark(\'' + E(id) + '\',' + i + ',\'no\')">They said no</button></div>';
        return h;
      }
      if(done) return h;
      h += '<div style="margin-top:6px;">' + to + '</div>';
      h += '<textarea id="cs-t-' + E(id) + '-' + i + '" maxlength="' + MAX + '" rows="3" style="width:100%;margin-top:6px;font:inherit;font-size:14px;padding:8px;border:1px solid var(--border);border-radius:8px;">' + E(s.draft || '') + '</textarea>';
      h += '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;"><button class="primary" ' + (!live || block || busy ? 'disabled' : '') + ' onclick="CS.send(\'' + E(id) + '\',' + i + ')">' + (busy ? 'Sending...' : 'Send') + '</button>'
        + '<button class="ghost" ' + (busy ? 'disabled' : '') + ' onclick="CS.mark(\'' + E(id) + '\',' + i + ',\'done\')">I did it another way</button><button class="ghost" ' + (busy ? 'disabled' : '') + ' onclick="CS.mark(\'' + E(id) + '\',' + i + ',\'skip\')">Skip</button></div>';
      return h;
    }
    if(s.kind === 'axiscare_visit_change'){
      const v = L.visit || null;
      if(done) return h + (done.change_id ? '<div class="field-note">Changed in AxisCare. To undo today, use the visit in AxisCare.</div>' : '');
      if(!v || v.state === 'unreadable') return h + '<div class="field-note">' + E((v && v.why) || 'AxisCare could not be read. Change it in AxisCare.') + '</div>';
      if(v.state === 'none') return h + '<div class="field-note">Cara found no matching visit for that day. Check AxisCare.</div>';
      if(v.state === 'several') return h + '<div class="field-note">Cara found more than one possible visit (' + E((v.options || []).map(o => o.client + ' ' + hm((o.shift_time || '').split('-')[0])).join(', ')) + '). Change it in AxisCare.</div>';
      h += '<div style="margin-top:4px;">' + E((v.client ? v.client + ': ' : '') + visitWords(v)) + '</div>';
      const ck = checkWords(v);
      if(ck.length) h += '<div class="field-note">' + ck.map(x => '<span style="color:var(' + (x.bad ? '--red' : '--teal') + ');">' + E(x.t) + '</span>').join(' · ') + '</div>';
      const stop = ck.some(x => x.bad) || v.can_change === false || v.started || v.verified;
      h += '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;"><button class="primary" ' + (!live || block || busy || stop ? 'disabled' : '') + ' onclick="CS.apply(\'' + E(id) + '\',' + i + ')">' + (busy ? 'Changing...' : 'Apply in AxisCare') + '</button>'
        + '<button class="ghost" ' + (busy ? 'disabled' : '') + ' onclick="CS.mark(\'' + E(id) + '\',' + i + ',\'done\')">I changed it in AxisCare</button></div>';
      if(stop) h += '<div class="field-note" style="color:var(--red);">' + (v.started || v.verified || v.can_change === false ? 'This visit has started or can\'t be changed from the Hub. Change it in AxisCare.' : 'Cara won\'t apply this one because of the check above. Decide in AxisCare.') + '</div>';
      if(v.why) h += '<div class="field-note">How Cara found it: ' + E(v.why) + '. Check the day and times before you apply.</div>';
      return h;
    }
    return h;
  }
  function whoOptions(L, s, id, i){
    if(s.kind === 'text_caregiver'){
      const g = L.caregiver;
      if(!g) return '<span class="field-note" style="color:var(--red);">Cara couldn\'t tell which caregiver this is. Text them the usual way.</span>';
      return '<span class="field-note">To ' + E(g.name) + (g.phone_last4 ? ' (number ending ' + E(g.phone_last4) + ')' : '') + (g.texts_ok === false ? ' · <b style="color:var(--red);">texts not OK</b>' : '') + '</span>';
    }
    const fam = (L.family_options || []).filter(f => f.texts_ok !== false);
    if(!fam.length) return '<span class="field-note" style="color:var(--red);">' + E(L.client_why || 'No family member with texts OK on file for this client.') + ' Call them, then tap "I did it another way".</span>';
    return '<label class="field-note">To <select id="cs-w-' + E(id) + '-' + i + '" style="font:inherit;">' + fam.map(f => '<option value="family:' + E(f.key) + '">' + E(f.name + (f.relation ? ' (' + f.relation + ')' : '') + (f.phone_last4 ? ' ··' + f.phone_last4 : '')) + '</option>').join('') + '</select></label>';
  }
  async function send(id, i){
    const c = C[id], s = c && c.look && c.look.steps[i]; if(!s) return;
    const t = document.getElementById('cs-t-' + id + '-' + i), text = S(t && t.value).trim();
    if(!text){ c.msg = 'Write the text first.'; c.msgBad = true; paint(id); return; }
    const w = document.getElementById('cs-w-' + id + '-' + i);
    const to = s.kind === 'text_caregiver' ? 'caregiver' : S(w && w.value);
    if(!to){ c.msg = 'Pick who it goes to.'; c.msgBad = true; paint(id); return; }
    c.busy = i; c.msg = ''; paint(id);
    try{ await call('cara-step', { mode:'send', card_id:id, i, text, to }); c.msg = 'Sent.'; c.msgBad = false; c.busy = null; await load(id, true); }
    catch(e){ c.msg = e.message || String(e); c.msgBad = true; c.busy = null; paint(id); }
  }
  async function mark(id, i, how, changeId){
    const c = C[id]; if(!c) return;
    c.busy = i; c.msg = ''; paint(id);
    try{ await call('cara-step', Object.assign({ mode:'mark', card_id:id, i, how }, changeId ? { change_id:changeId } : {})); c.busy = null; await load(id, true); }
    catch(e){ c.msg = e.message || String(e); c.msgBad = true; c.busy = null; paint(id); }
  }
  async function apply(id, i){
    const c = C[id], v = c && c.look && c.look.visit; if(!v) return;
    const cid = 'cs-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    c.busy = i; c.msg = ''; paint(id);
    try{
      const r = await call('visit-change', changeBody(v, cid));
      if(r.outcome !== 'changed' && r.outcome !== 'already_done') throw new Error(r.error || 'AxisCare did not take the change. Nothing was changed.');
      c.busy = null; c.msg = 'Changed in AxisCare' + (r.words ? ': ' + r.words : '') + (r.warning ? '. ' + r.warning : '.'); c.msgBad = !!r.warning;
      await mark(id, i, 'done', r.change_id || cid);
    }catch(e){ c.msg = e.message || String(e); c.msgBad = true; c.busy = null; paint(id); }
  }
  W.CS = Object.assign({ panel, reload:id => load(id, true), send, mark, apply }, CORE);
})(typeof window !== 'undefined' ? window : globalThis);
