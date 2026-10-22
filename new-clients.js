/* =====================================================================================================================
   NEW CLIENTS SCOREBOARD (2026-10-22 later, her call: "remove too much stuff at the top ... move that to the Client Goals
   tab"): the full scoreboard draws on Client Goals (#cgoNewClients); the top of My Work (#todayNewClients) shows only the
   "+$75, you just earned" moment, and only while she has one she has not seen.
   (bonus v2, Samantha 2026-10-22: "$75 for every new client no matter the hours ... I want to make
   the ladies excited to get new clients"; mockup https://claude.ai/artifact/79mQxzxzEqGTebQPhPvMVS). On Today:
   · the team goal (8 new clients in a month = team lunch, in Settings) for everyone
   · a card per Care Coordinator: new clients this month and where each one is (pending from the first shift, earned at day
     30, paid on payroll day). DOLLARS only on her own card, and on every card for owners ("share the client counts and
     the team goal, but keep each person's dollars private to her and owners"). The server (cc-bonus, action scoreboard)
     decides what each person may see; this page only draws it.
   · the moment: when one of hers is earned she sees "+$75" once (this browser); the team sees the client made it, no dollars.
   Switch: ops_settings.bonus_v2_live. Off: only owners see the card, marked as a practice preview.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const NC = { data:null, at:0, busy:false };
  const S = () => (typeof DATA !== 'undefined' && DATA.ops_settings) || {};
  const owner = () => typeof ccIsOwner === 'function' && ccIsOwner();
  const live = () => S().bonus_v2_live === true;
  const money = n => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
  const STAGE = { pending:['Pending', 'nc-pend'], earned:['Earned', 'nc-earn'], paid:['Paid', 'nc-paid'] };
  function css(){
    if(document.getElementById('ncCss')) return;
    const s = document.createElement('style'); s.id = 'ncCss';
    s.textContent = '.nc-wrap{margin:0 0 18px;display:flex;flex-direction:column;gap:12px}'
      + '.nc-card{background:#fff;border-radius:16px;box-shadow:0 4px 18px rgba(13,54,95,.07);padding:16px 20px}'
      + '.nc-goal-top{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;align-items:baseline}.nc-goal-t{font-size:18px;font-weight:800;color:var(--navy)}.nc-goal-n{font-size:14px;font-weight:800;color:#7A4E0B}'
      + '.nc-bar{height:14px;border-radius:999px;background:#f2f0e9;overflow:hidden;margin:8px 0 4px}.nc-bar>i{display:block;height:100%;border-radius:999px;background:#F0A63A}'
      + '.nc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(360px,100%),1fr));gap:12px}'
      + '.nc-who{display:flex;align-items:center;gap:10px;margin-bottom:10px}.nc-av{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:999px;background:#1F7A8C;color:#fff;font-weight:800}'
      + '.nc-name{font-size:18px;font-weight:800;color:var(--navy)}.nc-sub{font-size:13px;color:var(--text-muted)}'
      + '.nc-boxes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:10px}.nc-box{border-radius:12px;padding:8px 10px}.nc-box b{display:block;font-size:22px}.nc-box span{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}'
      + '.nc-pend{background:#FDF1DC;color:#7A4E0B}.nc-earn{background:#E6F3EA;color:#1E6B3A}.nc-paid{background:#E6ECF3;color:#0D365F}'
      + '.nc-row{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 10px;align-items:center;padding:8px 10px;border-radius:10px;background:#f6f5f0;margin-top:6px;font-size:13.5px}'
      + '.nc-chip{padding:2px 10px;border-radius:999px;font-size:12px;font-weight:800}.nc-note{font-size:12.5px;color:var(--text-muted);margin-top:8px}'
      + '.nc-practice{background:#FDF1DC;color:#7A4E0B;border-radius:10px;padding:8px 12px;font-size:13px}'
      + '.nc-moment{display:flex;align-items:center;gap:14px;background:#0D365F;color:#fff;border-radius:16px;padding:14px 18px}.nc-moment .nc-big{display:inline-flex;align-items:center;justify-content:center;min-width:56px;height:56px;border-radius:999px;background:#F0A63A;color:#16283a;font-weight:800;font-size:18px;padding:0 6px}'
      + '.nc-moment button{margin-left:auto;background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.6);border-radius:999px;padding:6px 14px;font:inherit;font-weight:700;cursor:pointer}'
      + '.nc-team{font-size:13.5px;color:#1E6B3A;background:#E6F3EA;border-radius:10px;padding:8px 12px}';
    document.head.appendChild(s);
  }
  const seenKey = id => 'ncSeen:' + id;
  const seen = id => { try{ return localStorage.getItem(seenKey(id)) === '1'; }catch(e){ return false; } };
  function markSeen(id){ try{ localStorage.setItem(seenKey(id), '1'); }catch(e){} draw(); }
  function stageWord(c){ return (STAGE[c.stage] || [''])[0]; }
  function personCard(p){
    const box = (k, v) => '<div class="nc-box ' + STAGE[k][1] + '"><span>' + STAGE[k][0] + '</span><b>' + (p.money ? money(v) : esc(v)) + '</b></div>';
    const list = p.clients || [], more = Math.max(0, list.length - 3);
    const rows = list.slice(0, 3).map(c => '<div class="nc-row"><div><b>' + esc(c.client) + '</b><div class="nc-sub">First shift ' + esc(c.first_visit) + '</div></div>'
      + '<span class="nc-chip ' + (STAGE[c.stage] || ['', 'nc-pend'])[1] + '">' + esc(p.money && c.amount ? money(c.amount) + ' ' + stageWord(c).toLowerCase() + ' · ' : '') + esc(c.words) + '</span></div>').join('');
    return '<div class="nc-card"><div class="nc-who"><span class="nc-av">' + esc(String(p.name || '?').charAt(0)) + '</span><div><div class="nc-name">' + esc(p.name) + (p.you ? ' (you)' : '') + '</div>'
      + '<div class="nc-sub">' + esc(p.count) + ' new client' + (p.count === 1 ? '' : 's') + ' this month</div></div></div>'
      + '<div class="nc-boxes">' + box('pending', p.pending) + box('earned', p.earned) + box('paid', p.paid) + '</div>'
      + (rows || '<div class="nc-sub">No new clients yet this month.</div>') + (more ? '<div class="nc-note">and ' + more + ' more</div>' : '')
      + (p.money ? '' : '<div class="nc-note">Her dollars are private to her and the owners; you see her client counts.</div>') + '</div>';
  }
  /* her own unseen "+$75" moments (the only thing on My Work) */
  function momentsHtml(d){
    const g = (d && d.goal) || {};
    return ((d && d.moments) || []).filter(m => m.you && m.amount && !seen(m.id)).map(m => '<div class="nc-moment" role="status"><span class="nc-big">+' + money(m.amount) + '</span><div><b style="font-size:18px;">You just earned ' + money(m.amount) + '</b>'
      + '<div style="opacity:.9;">' + esc(m.client) + ' made it to day 30. ' + esc(g.got) + ' of ' + esc(g.count) + ' toward ' + esc(g.prize) + '. The scoreboard is on Client Goals.</div></div><button type="button" onclick="ncSeen(\'' + esc(m.id) + '\')">Got it</button></div>').join('');
  }
  function html(d){
    if(!d || d.off) return '';
    if(d.error) return '<div class="nc-card nc-note">The new clients scoreboard could not load (' + esc(d.error) + ').</div>';
    const g = d.goal || {}, pct = g.count ? Math.min(100, Math.round(100 * g.got / g.count)) : 0;
    const team = (d.moments || []).filter(m => !m.you);
    return '<div class="nc-wrap" aria-label="New clients this month">'
      + (d.v2 === false ? '<div class="nc-practice"><b>Practice preview.</b> Only Samantha and Zachary see this until the new bonus rules are turned on in Settings.</div>' : '')
      + momentsHtml(d)
      + team.map(m => '<div class="nc-team">' + esc(m.name) + '’s new client ' + esc(m.client) + ' made it to day 30.' + (m.amount ? ' (' + money(m.amount) + ')' : '') + '</div>').join('')
      + '<div class="nc-card"><div class="nc-goal-top"><span class="nc-goal-t">Team goal: ' + esc(g.count) + ' new clients = ' + esc(g.prize) + '</span>'
      + '<span class="nc-goal-n">' + (g.reached ? 'Reached! ' + esc(g.prize) + ' is on' : esc(g.got) + ' of ' + esc(g.count) + ' · ' + esc(g.left) + ' more to go') + '</span></div>'
      + '<div class="nc-bar" role="img" aria-label="' + esc(g.got) + ' of ' + esc(g.count) + ' new clients toward the team goal"><i style="width:' + pct + '%"></i></div>'
      + '<div class="nc-sub">New clients with a first shift this month, both of you together. $75 for each one after day 30 and 3 visits.</div></div>'
      + '<div class="nc-grid">' + (d.people || []).map(personCard).join('') + '</div></div>';
  }
  function draw(){
    css();
    const board = document.getElementById('cgoNewClients'); if(board) board.innerHTML = html(NC.data);
    const top = document.getElementById('todayNewClients'); if(top){ const m = NC.data && !NC.data.off && !NC.data.error ? momentsHtml(NC.data) : ''; top.innerHTML = m ? '<div class="nc-wrap">' + m + '</div>' : ''; }
  }
  async function refresh(force){
    const box = document.getElementById('cgoNewClients'), top = document.getElementById('todayNewClients'); if(!box) return;
    if(!live() && !owner()){ NC.data = null; box.innerHTML = ''; if(top) top.innerHTML = ''; return; }
    /* off: nothing is asked until an owner clicks the preview link (the page stays quiet while it is off) */
    if(!live() && !NC.preview){ css(); box.innerHTML = '<div style="margin:0 0 12px;font-size:13px;"><button type="button" class="linklike" onclick="ncPreview()">Preview the new clients scoreboard (owners only)</button></div>'; return; }
    if(NC.busy || (!force && Date.now() - NC.at < 5 * 60e3 && NC.data)) { draw(); return; }
    if(!window.Bonus || !Bonus.call) return;
    NC.busy = true;
    try{ NC.data = await Bonus.call({ action:'scoreboard' }); }catch(e){ NC.data = { error:'could not reach the bonus service' }; }
    NC.at = Date.now(); NC.busy = false; draw();
  }
  /* draw once the settings and roles are in, then every 5 minutes and when the page comes back into view */
  let tries = 0;
  const boot = setInterval(() => { tries++; if((typeof DATA !== 'undefined' && DATA.ops_settings) || tries > 120){ clearInterval(boot); refresh(true); } }, 1000);
  setInterval(() => refresh(false), 5 * 60e3);
  document.addEventListener('visibilitychange', () => { if(!document.hidden) refresh(false); });

  /* ── Settings: the new rules (owners only) ── */
  function cfg(){ const b = S().bonus || {}, g = b.team_goal || {}; return { amount:b.amount_v2 || 75, visits:b.min_visits || 3, count:g.count || 8, prize:g.prize || 'team lunch' }; }
  function setFill(){
    const now = document.getElementById('bvSetNow'); if(!now) return;
    const c = cfg(), o = owner();
    const set = (id, v) => { const e = document.getElementById(id); if(e){ e.value = v; e.disabled = !o; } };
    set('bvAmount', c.amount); set('bvVisits', c.visits); set('bvGoal', c.count); set('bvPrize', c.prize);
    now.innerHTML = (live() ? '<b style="color:#1E8449;">On.</b> New bonuses use these rules, and everyone sees the scoreboard on Today.' : '<b style="color:#B7791F;">Off.</b> The rules above (Bonus program) still apply; only owners see the scoreboard, as a practice preview.') + (o ? '' : ' Only Samantha or Zachary can change this.');
    ['bvSaveBtn', 'bvToggleBtn'].forEach(id => { const b = document.getElementById(id); if(b) b.style.display = o ? '' : 'none'; });
    const tb = document.getElementById('bvToggleBtn'); if(tb) tb.textContent = live() ? 'Turn off the new rules' : 'Turn on the new rules and the scoreboard';
  }
  async function save(btn){
    if(!owner()){ alert('Only Samantha or Zachary can change the bonus rules.'); return; }
    const v = id => String((document.getElementById(id) || {}).value || '').trim();
    const amount = Math.round(Number(v('bvAmount'))), visits = Math.round(Number(v('bvVisits'))), count = Math.round(Number(v('bvGoal'))), prize = v('bvPrize').slice(0, 80);
    if(!(amount >= 1) || !(visits >= 1) || !(count >= 1) || !prize){ alert('Fill in the amount, the visits, the team goal and the prize.'); return; }
    if(btn) btn.disabled = true;
    const out = await tkMerge(m => { m.bonus = Object.assign({}, m.bonus || {}, { amount_v2:amount, min_visits:visits, team_goal:{ count, prize } }); return ['bonus v2 $' + amount + ', ' + visits + ' visits, goal ' + count + ' = ' + prize]; }, 'bonus rules');
    if(btn) btn.disabled = false;
    const sv = document.getElementById('bvSaved'); if(sv) sv.textContent = out.error ? ('Could not save: ' + out.error.message) : 'Saved.';
    setFill(); refresh(true);
  }
  async function toggle(btn){
    if(!owner()){ alert('Only Samantha or Zachary can turn the new bonus rules on or off.'); return; }
    const on = !live(), c = cfg();
    const ok = await ccConfirm(on ? 'Turn on the new bonus rules and the scoreboard?\n\nFrom the next daily check:\n· each new client (private pay, LTC, VA or GUIDE) whose first visit is on or after the program start starts a $' + c.amount + ' bonus for the Care Coordinator who did the home visit\n· it shows as pending from the first shift, and is earned at day 30 if the client is still with us and has had ' + c.visits + ' completed visits\n· everyone sees the scoreboard on Today and the team goal (' + c.count + ' = ' + c.prize + '); each person sees only her own dollars; you and Zachary see all\n· the 8am email gets a New clients line, with no dollars\n\nBonuses already on file keep the rules they started with. Nothing is sent to any family.'
      : 'Turn off the new rules? New bonuses go back to the Bonus program rules, and only owners see the scoreboard. Bonuses already on file keep their rules.');
    if(!ok) return;
    if(btn) btn.disabled = true;
    const out = await tkMerge(m => { m.bonus_v2_live = on; if(on && !m.bonus_v2_live_since) m.bonus_v2_live_since = new Date().toISOString(); return ['bonus v2 ' + (on ? 'ON' : 'OFF')]; }, 'bonus rules');
    if(btn) btn.disabled = false;
    const sv = document.getElementById('bvSaved'); if(sv) sv.textContent = out.error ? ('Could not save: ' + out.error.message) : (on ? 'On.' : 'Off.');
    setFill(); refresh(true);
  }
  function preview(){ NC.preview = true; refresh(true); }
  window.NewClients = { refresh, html, draw, state:NC };
  Object.assign(window, { ncPreview:preview, ncSeen:markSeen, bvSetFill:setFill, bvSave:save, bvToggle:toggle });
})();
