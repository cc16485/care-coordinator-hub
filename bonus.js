/* =====================================================================================================================
   BONUSES (Care Coordinator Leads and Bonus, Stage 4; policy approved by Samantha 2026-10-18). The window opened from
   My Work. Everything comes from the cc-bonus server function, which decides who sees what (pay is private and the Hub
   page never reads the bonus records itself):
     · a Care Coordinator sees their own bonuses ("Day 18 of 30 · 14 of 20 hours")
     · the payroll person (Krystal) also sees every approved bonus, to enter in Viventium, and marks it paid
     · Samantha and Zachary see them all; either approves one that is ready; only Samantha makes an exception or marks
       one not earned, each with a written reason, and records the one-time Viventium overtime check
   The switch (ops_settings.bonus_live) and the program settings are in Settings > Leads > Bonus program. Nothing here
   contacts anyone.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const ST = { data:null, busy:false };
  const TONE = { on_the_way:['#E8F0FB', '#2F6FB0'], ready:['#FDF3E3', '#A8660E'], under_review:['#FDE8E8', '#B23B2E'], approved:['#E7F6EC', '#1F7A4D'], paid:['#E7F6EC', '#1F7A4D'], not_earned:['#F1F5F9', '#64748B'] };
  const css = () => { if(document.getElementById('bnCss')) return; const s = document.createElement('style'); s.id = 'bnCss';
    s.textContent = '.bn-bg{position:fixed;inset:0;background:rgba(13,54,95,.45);z-index:10000;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto}'
      + '.bn-dlg{background:#fff;border-radius:14px;max-width:820px;width:100%;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.2)}'
      + '.bn-h{display:flex;align-items:center;gap:10px;margin-bottom:6px}.bn-h h3{margin:0;color:var(--navy);font-size:19px}'
      + '.bn-k{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin:16px 0 6px}'
      + '.bn-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:9px 0;border-top:1px solid var(--border)}'
      + '.bn-row b{color:var(--navy)}.bn-chip{font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px}'
      + '.bn-sub{font-size:12.5px;color:var(--text-muted)}.bn-banner{background:#FDF3E3;color:#7A4A0B;border-radius:10px;padding:10px 12px;margin:8px 0;font-size:13px}'
      + '.bn-row button{padding:5px 11px;font-size:12px}';
    document.head.appendChild(s); };
  async function call(body){
    try{ const { data, error } = await sb.functions.invoke('cc-bonus', { body });
      if(error){ let m = error.message || 'Could not reach the bonus service.'; try{ const j = await error.context.json(); if(j && j.error) m = j.error; }catch(e){} return { error:m }; }
      return data || { error:'No answer.' };
    }catch(e){ return { error:'Could not reach the bonus service.' }; }
  }
  function on(){ const s = (typeof DATA !== 'undefined' && DATA.ops_settings) || {}; return s.bonus_live === true; }
  /* the My Work button: everyone in the office once the program is on; owners always (to see it before it starts) */
  function btnSync(){ const b = document.getElementById('bnBtn'); if(!b) return; b.style.display = (on() || (typeof ccIsOwner === 'function' && ccIsOwner())) ? '' : 'none'; }
  function close(){ const m = document.getElementById('bnModal'); if(m) m.remove(); }
  async function open(){
    css(); close();
    const bg = document.createElement('div'); bg.id = 'bnModal'; bg.className = 'bn-bg';
    bg.innerHTML = '<div class="bn-dlg" role="dialog" aria-modal="true" aria-label="Bonuses"><div class="field-note">Loading…</div></div>';
    bg.addEventListener('click', e => { if(e.target === bg) close(); });
    document.body.appendChild(bg);
    ST.data = await call({ action:'list' }); draw();
  }
  const money = n => '$' + Number(n || 0).toLocaleString('en-US');
  function chip(l){ const t = TONE[l.status] || TONE.not_earned; return '<span class="bn-chip" style="background:' + t[0] + ';color:' + t[1] + ';">' + esc(l.status_words || l.status) + '</span>'; }
  function row(l, actions){
    return '<div class="bn-row" data-id="' + esc(l.id) + '"><div style="flex:1 1 260px;min-width:0;"><b>' + esc(l.client) + '</b> ' + chip(l)
      + '<div class="bn-sub">' + esc(l.recipient) + ' · first visit ' + esc(l.first_visit) + ' · ' + money(l.amount) + '</div>'
      + '<div class="bn-sub" style="color:var(--text)">' + esc(l.words || '') + (l.decision_why ? ' · ' + esc(l.decision_why) : '') + '</div></div>' + (actions || '') + '</div>';
  }
  function draw(){
    const box = document.querySelector('#bnModal .bn-dlg'); if(!box) return; const d = ST.data || {};
    if(d.error){ box.innerHTML = '<div class="bn-h"><h3>Bonuses</h3><span style="flex:1"></span><button class="ghost" onclick="bnClose()">Close</button></div><p style="color:var(--red)">' + esc(d.error) + '</p>'; return; }
    const me = d.me || {}, lines = d.lines || [], mine = lines.filter(l => String(l.recipient_email || '').toLowerCase() === String(me.email || '').toLowerCase());
    const B = (fn, label, primary) => '<button class="' + (primary ? 'primary' : 'ghost') + '" onclick="' + fn + '">' + label + '</button>';
    let h = '<div class="bn-h"><h3>Bonuses</h3><span class="bn-sub">' + money(d.amount) + ' per new private-pay client · ' + d.min_hours + ' hours by day ' + d.days + ' · first visits from ' + esc(d.start) + '</span><span style="flex:1"></span><button class="ghost" onclick="bnClose()">Close</button></div>';
    if(!d.live) h += '<div class="bn-banner">The bonus program is switched off. ' + (me.owner ? 'Turn it on in Settings > Leads > Bonus program.' : 'Samantha or Zachary turns it on.') + '</div>';
    h += '<div class="bn-k">Your bonuses</div>' + (mine.length ? mine.map(l => row(l)).join('') : '<div class="bn-sub">None yet. A bonus starts here when a private-pay client whose lead was yours has their first visit.</div>');
    if(me.payroll || me.owner){
      const toPay = lines.filter(l => l.status === 'approved');
      h += '<div class="bn-k">Approved, to enter in Viventium</div>';
      if(!d.ot_checked) h += '<div class="bn-banner">Before the first payout, Samantha confirms with Viventium how bonuses count toward overtime. Marking paid waits for that.'
        + (me.decider ? ' ' + B('bnOt()', 'I checked with Viventium', true) : '') + '</div>';
      h += toPay.length ? toPay.map(l => row(l, '<input type="date" id="bnPaid_' + esc(l.id) + '" style="width:150px;"> ' + B("bnAct('" + esc(l.id) + "','paid')", 'Mark paid', true))).join('') : '<div class="bn-sub">Nothing approved is waiting to be paid.</div>';
    }
    if(me.owner){
      const waiting = lines.filter(l => l.status === 'ready' || l.status === 'under_review');
      h += '<div class="bn-k">Waiting on a decision</div>' + (waiting.length ? waiting.map(l => row(l,
        (l.status === 'ready' ? B("bnAct('" + esc(l.id) + "','approve')", 'Approve', true) : (me.decider ? B("bnAct('" + esc(l.id) + "','approve',true)", 'Approve as an exception', true) : '<span class="bn-sub">Samantha decides</span>'))
        + (me.decider ? ' ' + B("bnAct('" + esc(l.id) + "','not_earned',true)", 'Not earned') : ''))).join('') : '<div class="bn-sub">Nothing is waiting on a decision.</div>');
      const rest = lines.filter(l => !waiting.includes(l) && l.status !== 'approved');
      h += '<div class="bn-k">Everyone’s bonuses</div>' + (rest.length ? rest.map(l => row(l, me.decider && (l.status === 'not_earned') ? B("bnAct('" + esc(l.id) + "','reopen',true)", 'Reopen') : '')).join('') : '<div class="bn-sub">None yet.</div>');
    }
    h += '<p class="field-note" style="margin-top:14px;">Hours come from AxisCare visits clocked in and out (read only). After day ' + d.days + ' a bonus is ready, or under review with the reason; it is never marked not earned without Samantha. Each bonus keeps who did what, when and why. Pay is private: only you, payroll and the owners see a bonus.</p>';
    box.innerHTML = h;
  }
  async function act(id, what, needWhy){
    if(ST.busy) return;
    const body = { action:'act', id, do:what };
    if(what === 'paid'){ const el = document.getElementById('bnPaid_' + id); body.paid_on = el ? el.value : ''; if(!body.paid_on){ alert('Pick the payroll date it was paid on.'); return; } }
    if(needWhy){ const w = await ccPrompt(what === 'not_earned' ? 'Why is this bonus not earned? (kept with it)' : what === 'reopen' ? 'Why reopen it? (kept with it)' : 'Why approve it as an exception? (kept with it)', ''); if(w === null) return; body.why = w; }
    ST.busy = true; const r = await call(body); ST.busy = false;
    if(r.error){ alert(r.error); return; }
    if(typeof ccToast === 'function') ccToast('✓ ' + (r.line ? r.line.status_words : 'Saved'));
    ST.data = await call({ action:'list' }); draw();
  }
  async function ot(){
    const note = await ccPrompt('What did Viventium say about bonuses and overtime? (kept as the record)', ''); if(!note) return;
    const r = await call({ action:'ot_checked', note }); if(r.error){ alert(r.error); return; }
    if(typeof ccToast === 'function') ccToast('✓ Recorded. Bonuses can be marked paid now.');
    ST.data = await call({ action:'list' }); draw();
  }
  window.Bonus = { open, close, btnSync, call };
  Object.assign(window, { bnOpen:open, bnClose:close, bnAct:act, bnOt:ot, bnBtnSync:btnSync });
})();
