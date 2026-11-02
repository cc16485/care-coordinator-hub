/* =====================================================================================================================
   LEARNED FROM AXISCARE AND CALLS (Samantha 2026-11-02: "pull from ADL tasks and all info from clients and any calls or info to
   fill out their client profile"; mockup on Dan Probstfield, her yes: "Calls from the family's first call onward, and open a
   Journey on the first Save for clients with no inquiry.")
   One card at the top of a client's Care tab (Assessments & care plans). "Read what's new" has the server (Staffing
   profile-learn) read the family's calls not read yet, the AxisCare task list, the last 30 days of visit notes, the caregiver
   packet and what caregivers write about, and list what is not on the profile yet. Each line says where it came from. Save puts
   it on the profile under the coordinator's name and the date; Not right hides it for good. Nothing saves on its own, nothing
   changes in AxisCare, and nothing here texts anyone.
   Where Save puts each line: a care need -> the client's record (the Care needs card, through the server); Life Story -> the
   Life Story answers; home -> Home & Life notes; safety -> the Safety row on Overview; family -> Family asks on Overview. The
   last four are on DATA.client_profiles (id cp_ax<AxisCare id>), saved with persist like Home & Life.
   Switch: ops_settings.profile_learn_live. Off (practice): only owners see the card.
   PLRN.mount(boxId). Needs: sb, CONFIG, CP, DATA, ME, CC_ROLES, persist.
   ===================================================================================================================== */
(function(){
  'use strict';
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = () => (typeof DATA !== 'undefined' && DATA && DATA.ops_settings) || {};
  const live = () => st().profile_learn_live === true;
  const owner = () => typeof CC_ROLES !== 'undefined' && Array.isArray(CC_ROLES) && CC_ROLES.includes('owner_admin');
  const me = () => (typeof ME !== 'undefined' && ME && (ME.name || ME.email)) || '';
  const day = (iso) => { try { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; } catch (e) { return ''; } };
  const SECTION = [['needs', 'Care needs for matching', 'Save'], ['safety', 'Safety', 'Save'], ['life', 'Life Story', 'Save to Life Story'],
    ['home', 'Home & Life', 'Save'], ['family', 'Family & Contacts', 'Save']];
  const SAVED_TO = { needs: 'Care needs for matching', safety: 'Safety on Overview', life: 'Life Story', home: 'Home & Life notes', family: 'Family asks on Overview' };
  const S = { box: null, ax: '', d: null, err: '', busy: '', msg: '', at: 0 };

  async function call(body){
    const sess = await sb.auth.getSession(), tok = sess && sess.data && sess.data.session && sess.data.session.access_token;
    if (!tok) throw new Error('Sign in first.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/profile-learn', { method: 'POST',
      headers: { Authorization: 'Bearer ' + tok, apikey: CONFIG.supabase_anon_key, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ axiscare_client_id: S.ax }, body)) });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d || d.error) throw new Error((d && d.error) || ('The server answered ' + r.status));
    return d;
  }
  const src = (n) => ((S.d && S.d.sources) || []).find((s) => s.n === n);
  const srcText = (ns) => (ns || []).map(src).filter(Boolean).map((s) => s.label + (s.at ? ', ' + s.at : '')).join(' · ');

  function row(l, section, saveWord){
    const busy = S.busy === l.key;
    return '<div style="display:flex;gap:12px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--border);flex-wrap:wrap;">'
      + '<div style="flex:1;min-width:220px;"><b style="font-weight:600;">' + E(l.text) + '</b>'
      + '<div class="field-note" style="margin-top:2px;">' + E(srcText(l.sources)) + (section === 'needs' && l.label ? '. Saves as: ' + E(l.label) : '') + '</div></div>'
      + '<div style="display:flex;gap:6px;flex-shrink:0;">'
      + (saveWord ? '<button class="primary" style="font-size:12.5px;padding:4px 11px;"' + (S.busy ? ' disabled' : '') + ' onclick="PLRN.save(\'' + E(l.key) + '\')">' + (busy ? 'Saving…' : E(saveWord)) + '</button>' : '')
      + '<button class="secondary" style="font-size:12.5px;padding:4px 11px;"' + (S.busy ? ' disabled' : '') + ' onclick="PLRN.decide(\'' + E(l.key) + '\',\'' + (saveWord ? 'not_right' : 'handled') + '\')">' + (saveWord ? 'Not right' : 'Done') + '</button>'
      + '</div></div>';
  }
  const group = (title, inner, note) => '<div style="margin-top:14px;"><div style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted, #5B6670);font-weight:700;margin-bottom:4px;">' + E(title) + '</div>' + (note ? '<div class="field-note" style="margin-bottom:4px;">' + note + '</div>' : '') + inner + '</div>';

  function render(){
    const box = S.box; if (!box) return;
    if (!S.ax || !(live() || owner())) { box.innerHTML = ''; return; }
    const d = S.d, bx = d && d.box;
    let h = '<div class="card" style="padding:14px 18px;margin-bottom:12px;">'
      + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b style="font-size:15px;color:var(--navy);">📋 Learned from AxisCare and calls</b><span style="flex:1;"></span>'
      + '<button class="secondary" style="font-size:12.5px;"' + (S.busy ? ' disabled' : '') + ' onclick="PLRN.read()">' + (S.busy === 'read' ? 'Reading… (up to two minutes)' : '🔄 Read what\'s new') + '</button></div>'
      + (live() ? '' : '<div class="field-note" style="margin-top:4px;color:#92400E;"><b>Practice.</b> Only owners see this until the "Learned from AxisCare and calls" switch is on.</div>')
      + '<div class="field-note" style="margin:6px 0 2px;">What the family\'s calls, AxisCare and caregivers\' notes tell us that is not on the profile yet. Each line says where it came from. Save puts it on the profile under your name and today\'s date; Not right hides it for good. Nothing saves on its own, nothing changes in AxisCare, and nothing here texts anyone.</div>';
    if (S.err) h += '<div class="field-note" style="color:#B91C1C;margin-top:6px;">' + E(S.err) + '</div>';
    if (S.msg) h += '<div class="field-note" style="color:#15803D;margin-top:6px;">' + E(S.msg) + '</div>';
    if (!d) return box.innerHTML = h + (S.err ? '' : '<div class="field-note" style="margin-top:8px;">Loading…</div>') + '</div>';
    const c = d.calls || {};
    h += '<div class="field-note" style="margin-top:6px;">'
      + (d.built_at ? 'Last read ' + E(day(d.built_at)) + (d.built_by ? ' by ' + E(String(d.built_by).split('@')[0]) : '') + '. ' : 'Not read yet: press Read what\'s new. ')
      + (c.found != null ? E(c.read || 0) + ' of ' + E(c.found) + ' family calls read' + (c.first_at ? ', the first on ' + E(day(c.first_at)) : '') + '. ' : '')
      + (c.waiting ? E(c.waiting) + ' still to read: press Read what\'s new again. ' : '')
      + (c.not_readable ? E(c.not_readable) + ' had nothing to read (too short or no recording). ' : '')
      + ((d.said || []).length ? E(d.said.join(' ')) : '') + '</div>';
    if (bx) {
      const lines = bx.lines || [];
      if (bx.decisions && bx.decisions.length) h += group('Needs your decision', bx.decisions.map((x) => '<div style="background:#FEE2E2;border:1px solid #F5C2C2;border-radius:8px;padding:10px 12px;margin-top:6px;">'
        + '<b style="color:#991B1B;">' + E(x.title) + '</b> ' + E(x.text) + '<div class="field-note" style="margin-top:2px;">' + E(srcText(x.sources)) + '</div>'
        + '<div style="margin-top:6px;"><button class="secondary" style="font-size:12.5px;padding:4px 11px;"' + (S.busy ? ' disabled' : '') + ' onclick="PLRN.decide(\'' + E(x.key) + '\',\'handled\')">Handled</button></div></div>').join(''));
      SECTION.forEach(([k, title, word]) => { const ls = lines.filter((l) => l.section === k); if (ls.length) h += group(title, ls.map((l) => row(l, k, word)).join('')); });
      if (bx.team && bx.team.length) h += group('For the team, not the profile', bx.team.map((t) => row(t, 'team', '')).join(''), 'Caregiver likes and schedule changes belong in AxisCare. Press Done once it is handled there.');
      if (!lines.length && !(bx.decisions || []).length && !(bx.team || []).length) h += '<div class="field-note" style="margin-top:8px;">Nothing new to add. Everything found is on the profile or already decided.</div>';
    }
    const t = d.tasks;
    h += group('AxisCare task list', t == null ? '<div class="field-note">AxisCare did not answer for the task list just now.</div>'
      : !t.length ? '<div class="field-note">No care tasks in AxisCare for this client.</div>'
      : '<ul style="margin:2px 0 0;padding-left:18px;font-size:13px;">' + t.map((x) => '<li><b style="font-weight:600;">' + E(x.name) + '</b>' + (x.when ? ' <span class="field-note">' + E(x.when) + '</span>' : '') + (x.instructions ? '<div class="field-note">' + E(x.instructions) + '</div>' : '') + '</li>').join('') + '</ul>',
      'Read live from AxisCare. Change tasks in AxisCare or through an approved care plan.');
    box.innerHTML = h + '</div>';
  }

  function labelNeeds(d){
    const W = { required: 'Required', preferred: 'Preferred', no: 'No', yes: 'Yes' };
    ((d && d.box && d.box.lines) || []).forEach((l) => { if (l.section === 'needs' && l.kind) {
      const sk = window.CCMatch && CCMatch.SKILLS ? CCMatch.SKILLS.find((s) => 'need_' + s.key === l.kind) : null;
      l.label = (sk ? sk.label : l.kind.replace(/^(need|home|pref)_/, '').replace(/_/g, ' ')) + ', ' + (W[l.value] || String(l.value).replace(/_/g, ' ')); } });
    return d;
  }
  async function load(){ try { S.d = labelNeeds(await call({ action: 'look' })); S.err = ''; } catch (e) { S.err = String(e && e.message || e); } S.at = Date.now(); render(); }

  async function read(){
    if (S.busy) return; S.busy = 'read'; S.msg = ''; S.err = ''; render();
    try { const d = await call({ action: 'read' }); S.d = labelNeeds(d);
      S.msg = (d.read_now ? 'Read ' + d.read_now + ' call' + (d.read_now === 1 ? '' : 's') + '. ' : '') + (d.calls_left ? d.calls_left + ' more to read: press again.' : 'Up to date.'); }
    catch (e) { S.err = 'Not read: ' + String(e && e.message || e); }
    S.busy = ''; render();
  }
  const find = (key) => { const b = S.d && S.d.box; if (!b) return null;
    for (const [list, sec] of [[b.decisions, 'decision'], [b.lines, null], [b.team, 'team']]) { const x = (list || []).find((y) => y.key === key); if (x) return Object.assign({ sec: sec || x.section }, x); } return null; };
  function drop(key){ const b = S.d && S.d.box; if (!b) return; ['decisions', 'lines', 'team'].forEach((k) => { b[k] = (b[k] || []).filter((x) => x.key !== key); }); }

  async function decide(key, decision, savedTo){
    const x = find(key); if (!x || (S.busy && S.busy !== key)) return;
    S.busy = key; S.err = ''; S.msg = ''; render();
    try { await call({ action: 'decide', line_key: key, section: x.sec, text: x.title || x.text, decision, saved_to: savedTo || null });
      drop(key); S.msg = decision === 'saved' ? 'Saved to ' + (savedTo || 'the profile') + '.' : decision === 'not_right' ? 'Hidden. It will not come back.' : 'Marked handled.'; }
    catch (e) { S.err = 'Not recorded: ' + String(e && e.message || e); }
    S.busy = ''; render();
  }

  /* safety, family, home and Life Story lines are kept on the client's profile the same way Home & Life saves */
  async function saveOnProfile(x){
    const id = 'cp_ax' + S.ax, prev = (DATA.client_profiles || []).find((p) => p && p.id === id) || {};
    const now = new Date().toISOString(), from = srcText(x.sources).slice(0, 200);
    const item = Object.assign({}, prev, { id, axiscare_client_id: S.ax, client_name: prev.client_name || (typeof CP !== 'undefined' && CP && CP.r && CP.r.client_name) || '', updated_at: now, updated_by: me() });
    if (x.section === 'safety' || x.section === 'family') {
      const k = x.section + '_notes'; item[k] = (Array.isArray(prev[k]) ? prev[k] : []).concat([{ text: x.text, by: me(), at: now, from }]);
    } else if (x.section === 'home') {
      item.home_notes = [String(prev.home_notes || '').trim(), x.text].filter(Boolean).join('\n').slice(0, 4000);
    } else if (x.section === 'life') {
      const q = ['work', 'enjoys', 'little'].includes(x.life_q) ? x.life_q : 'enjoys', life = Object.assign({}, prev.life || {}), was = life[q] && String(life[q].text || '').trim();
      if (was && was.length + x.text.length + 2 > 500) throw new Error('That Life Story answer is full. Add it on Home & Life by hand.');
      life[q] = { text: was ? was.replace(/[.\s]+$/, '') + '; ' + x.text : x.text, by: me(), at: now, via: 'calls and caregiver notes' };
      item.life = life;
    }
    DATA.client_profiles = (DATA.client_profiles || []).filter((p) => p.id !== id).concat([item]);
    await persist('client_profiles', item);
  }
  async function save(key){
    const x = find(key); if (!x || S.busy) return;
    if (x.section === 'needs') {
      S.busy = key; S.err = ''; S.msg = ''; render();
      try { const r = await call({ action: 'save_need', line_key: key }); drop(key);
        S.msg = (r.already ? 'Already on the Care needs card: ' : 'Saved to Care needs for matching: ') + (r.label || x.text) + (r.opened ? '. This client had no Journey, so one was opened.' : '.');
        try { if (window.CN && CN.mount && document.getElementById('cp_needs')) CN.mount('cp_needs'); } catch (e) {} }
      catch (e) { S.err = 'Not saved: ' + String(e && e.message || e); }
      S.busy = ''; return render();
    }
    S.busy = key; S.err = ''; render();
    try { await saveOnProfile(x); } catch (e) { S.busy = ''; S.err = 'Not saved: ' + String(e && e.message || e); return render(); }
    S.busy = ''; await decide(key, 'saved', SAVED_TO[x.section]);
  }

  function mount(id){
    S.box = document.getElementById(id); if (!S.box) return;
    const ax = (typeof CP !== 'undefined' && CP) && CP.ax ? String(CP.ax).trim() : '';
    if (!ax || !(live() || owner())) { S.box.innerHTML = ''; return; }
    if (ax !== S.ax) { S.ax = ax; S.d = null; S.err = ''; S.msg = ''; S.busy = ''; S.at = 0; }
    render();
    if (!S.d || Date.now() - S.at > 120000) load();
  }
  window.PLRN = { mount, read, save, decide, render, _state: S };
})();
