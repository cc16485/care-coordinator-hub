/* THE THREE-GROUP ASK LIST (Samantha 2026-10-24, mockup PtLEzsAjvGybxXsTtXk926): "Cara should show us every potential
   caregiver, including the ones she didn't contact, and explain exactly why."
   One screen per open shift: Ready to ask (Cara contacts them herself), Possible with your review (care review: a level or
   skill gap a coordinator may approve for this shift only; your call: overtime, outside their times, PRN notice), and Do
   not ask (safety, compliance, clearance, Do Not Return, working then). Each person: whether they were contacted, the
   answer, and why. A care review shows Ruth's tasks against the caregiver's verified skills; the coordinator moves or drops
   what stands in the way, ticks two checks, says who agreed and why, and approves THIS shift: recorded on the shift, a card
   for any moved task, then the offer (coverage-run review_approve). Never changes a caregiver's level or the care plan.
   Switch ops_settings.ask_list_live: off, only owners see it, as a preview (approving is refused by the server). */
(function () {
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = () => (typeof DATA !== 'undefined' && DATA.ops_settings) || {};
  const live = () => st().ask_list_live === true;
  const owner = () => { try { return typeof ccCan === 'function' && ccCan('manage_settings'); } catch (e) { return false; } };
  const visible = () => live() || owner();
  async function call(body) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session || !session.access_token) throw new Error('Sign in to the hub first.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/coverage-run', { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const out = await r.json().catch(() => null);
    if (!r.ok || !out || out.error) throw new Error((out && out.error) || ('The engine answered ' + r.status));
    return out;
  }
  const say = (m) => alert(m);
  const ask = (m) => (typeof ccConfirm === 'function' ? ccConfirm(m) : Promise.resolve(confirm(m)));
  const caseOf = (id) => (DATA.coverage_cases || []).find((x) => x && x.id === id);
  const clock = (iso) => { try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase(); } catch (e) { return ''; } };
  const S = { id: null, data: null, open: null, err: null };

  function button(c) {
    if (!visible() || !c || c.status !== 'open' || String(c.kind) === 'interest') return '';
    return ' <button class="ghost" style="font-size:12px;padding:3px 10px;" onclick="AL.show(\'' + E(c.id) + '\')">Everyone, in 3 groups' + (live() ? '' : ' (preview)') + '</button>';
  }
  async function show(id) {
    S.id = id; S.data = null; S.open = null; S.err = null; paint();
    try { S.data = await call({ action: 'ask_list', case_id: id }); } catch (e) { S.err = String(e.message || e); }
    paint();
  }
  function close() { S.id = null; const el = document.getElementById('alSheet'); if (el) el.remove(); }

  const chip = (txt, bg, fg) => '<span style="background:' + bg + ';color:' + fg + ';border-radius:6px;padding:2px 8px;font-size:12px;font-weight:600;white-space:nowrap;">' + E(txt) + '</span>';
  function contacted(x) {
    const k = x.contacted; if (!k) return '<span class="field-note">Not contacted</span>';
    const ans = k.state === 'yes' ? 'said yes' : k.state === 'no' ? '<b>said no</b>' : k.state === 'inquiry' ? 'asked a question' : 'waiting';
    return (k.by_text ? 'Texted ' : 'Asked ') + E(clock(k.at)) + ' · ' + ans;
  }
  function row(x, matchHtml, whyHtml) {
    return '<tr style="border-top:1px solid #EEF2F6;"><td style="padding:9px 12px;font-weight:600;">' + E(x.name) + '</td><td style="padding:9px 6px;">' + matchHtml
      + '</td><td style="padding:9px 6px;font-size:13px;">' + contacted(x) + '</td><td style="padding:9px 12px 9px 6px;font-size:13px;color:#33475B;">' + whyHtml + '</td></tr>';
  }
  function table(rows) {
    return '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;min-width:640px;"><thead><tr style="text-align:left;color:#5D6B7C;font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;">'
      + '<th style="padding:8px 12px;">Caregiver</th><th style="padding:8px 6px;">Match</th><th style="padding:8px 6px;">Contacted?</th><th style="padding:8px 12px 8px 6px;">Why · next step</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function group(title, sub, bg, fg, body) {
    return '<section style="background:#fff;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;margin-top:12px;"><div style="padding:11px 14px;background:' + bg + ';">'
      + '<b style="color:' + fg + ';font-size:15px;">' + title + '</b> <span style="font-size:12.5px;color:' + fg + ';">' + sub + '</span></div>' + body + '</section>';
  }
  const WORD = { moved: 'Move to another visit', not_needed: 'Not needed tonight', needed: 'Needed tonight' };
  function reviewPanel(x) {
    const tasks = (x.care && x.care.tasks) || [], blockKeys = (x.blocking || []).map((b) => b.key), a = S.adjust || {};
    const lines = tasks.length ? tasks.map((t) => {
      const blocks = blockKeys.includes(t.key);
      const amy = t.restricted ? '<span style="color:#B42318;">Their own limit</span>' : t.verified ? '<span style="color:#1D6B43;font-weight:600;">Verified</span>' : '<span style="color:#8A4416;">Not verified</span>';
      const pick = blocks ? ['moved', 'not_needed', 'needed'].map((v) => '<label style="display:inline-flex;gap:4px;align-items:center;margin:2px 8px 2px 0;font-size:12.5px;"><input type="radio" name="al_' + E(t.key) + '" value="' + v + '"' + (a[t.key] === v ? ' checked' : '') + ' onchange="AL.adj(\'' + E(t.key) + '\',this.value)"> ' + WORD[v] + '</label>').join('') : '<span class="field-note">No change</span>';
      return '<tr style="border-top:1px solid #F1E4C8;"><td style="padding:7px 6px 7px 0;">' + (blocks ? '<b>' + E(t.label) + '</b>' : E(t.label)) + '</td><td style="padding:7px 6px;">' + E(t.level) + '</td><td style="padding:7px 6px;">' + amy + '</td><td style="padding:7px 0 7px 6px;">' + pick + '</td></tr>';
    }).join('') : '<tr><td colspan="4" class="field-note" style="padding:7px 0;">No required tasks are listed in the client\'s care plan. ' + E(x.why) + '. Check the care plan before approving.</td></tr>';
    const needed = blockKeys.filter((k) => a[k] === 'needed'), open = blockKeys.filter((k) => !a[k]);
    const verdict = needed.length ? '<div style="background:#FDECEA;color:#B42318;border-radius:8px;padding:7px 10px;font-weight:600;font-size:13px;">' + E(x.name.split(' ')[0]) + ' can\'t take this shift: ' + E(needed.map((k) => (tasks.find((t) => t.key === k) || {}).label || k).join(', ')) + ' is needed tonight.</div>'
      : open.length ? '<div class="field-note">Choose what happens to each task in bold.</div>'
      : '<div style="background:#E8F5EE;color:#1D6B43;border-radius:8px;padding:7px 10px;font-weight:600;font-size:13px;">With these changes, everything left is within ' + E(x.name.split(' ')[0]) + '\'s verified skills.</div>';
    const anyMoved = blockKeys.some((k) => a[k] === 'moved');
    return '<tr><td colspan="4" style="padding:4px 12px 14px;"><div style="border:2px solid #E9B65C;border-radius:10px;padding:12px 14px;background:#FFFDF8;display:flex;flex-direction:column;gap:9px;">'
      + '<b style="color:#0E3860;">Review: ' + E(x.name) + ' (Level ' + E(x.cg_level || '?') + ') for this shift (Level ' + E(x.client_level || '?') + ')</b>'
      + '<div class="field-note">' + E(x.name.split(' ')[0]) + '\'s approved level in AxisCare stays as it is. This approval is for this shift only.</div>'
      + '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;min-width:560px;font-size:13px;"><thead><tr style="text-align:left;color:#5D6B7C;font-size:11.5px;"><th style="padding:4px 6px 4px 0;">The client\'s care</th><th style="padding:4px 6px;">Level</th><th style="padding:4px 6px;">' + E(x.name.split(' ')[0]) + '</th><th style="padding:4px 0 4px 6px;">For this shift</th></tr></thead><tbody>' + lines + '</tbody></table></div>'
      + verdict
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px 14px;font-size:13px;">'
      + '<label style="display:flex;gap:6px;align-items:flex-start;"><input type="checkbox" id="al_ck_skills" style="margin-top:3px;"> <span>I checked the remaining tasks are within their verified skills</span></label>'
      + '<label style="display:flex;gap:6px;align-items:flex-start;"><input type="checkbox" id="al_ck_payer" style="margin-top:3px;"> <span>Allowed by our policy and the client\'s payer</span></label>'
      + (anyMoved ? '<label class="al-field" style="gap:3px;"><b style="font-size:12.5px;">When the moved task will be done</b><input type="text" id="al_moved" placeholder="Sunday\'s 9am visit"></label>' : '')
      + '<label class="al-field" style="gap:3px;"><b style="font-size:12.5px;">Who agreed to the change</b><input type="text" id="al_agreed" placeholder="Lisa (daughter), by phone 8:03pm"></label>'
      + '<label class="al-field" style="gap:3px;"><b style="font-size:12.5px;">Why this coverage is appropriate</b><input type="text" id="al_why" placeholder="The shower is the only Level 2 task tonight"></label></div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;"><button class="al-btn al-primary"' + (needed.length || open.length ? ' disabled' : '') + ' onclick="AL.approve()">Approve for this shift and text ' + E(x.name.split(' ')[0]) + '</button>'
      + '<button class="al-btn" onclick="AL.review(null)">Not appropriate</button>'
      + (live() ? '' : '<span class="field-note">Preview: the switch is off, so approving is refused.</span>') + '</div></div></td></tr>';
  }
  /* the sheet's own small style: the Hub's form styles (labels as blocks, inputs full width) don't fit inline choices */
  function styleOnce() {
    if (document.getElementById('alStyle')) return;
    const st = document.createElement('style'); st.id = 'alStyle';
    st.textContent = '#alSheet label{display:inline-flex;width:auto;margin:0;font-weight:500;color:#16263A;text-transform:none;letter-spacing:0}'
      + '#alSheet label.al-field{display:flex;flex-direction:column}'
      + '#alSheet input[type=checkbox],#alSheet input[type=radio]{width:auto;min-width:16px;height:16px;margin:0;flex:0 0 auto}'
      + '#alSheet input[type=text],#alSheet input:not([type]){width:100%;box-sizing:border-box;font:inherit;font-size:13.5px;padding:7px 10px;border:1px solid #C9D5E3;border-radius:7px;background:#fff}'
      + '#alSheet .al-btn{font:inherit;font-weight:600;font-size:13px;border-radius:8px;padding:8px 14px;cursor:pointer;border:1px solid #C9D5E3;background:#fff;color:#0E3860}'
      + '#alSheet .al-btn.al-primary{background:#0E3860;color:#fff;border-color:#0E3860}#alSheet .al-btn[disabled]{opacity:.45;cursor:not-allowed}'
      + '#alSheet .al-sm{font-size:12px;padding:3px 10px}';
    document.head.appendChild(st);
  }
  function paint() {
    styleOnce();
    let el = document.getElementById('alSheet');
    if (!S.id) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'alSheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Everyone for this shift');
      el.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(14,56,96,.35);overflow:auto;padding:max(12px,env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) 24px max(12px,env(safe-area-inset-left,0px));';
      document.body.appendChild(el); }
    const c = caseOf(S.id) || {}, d = S.data;
    let h = '<div style="max-width:1100px;margin:0 auto;background:#F6F9FD;border-radius:14px;padding:16px;">'
      + '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;"><div><b style="color:#0E3860;font-size:18px;">' + E(c.client || 'This shift') + ' · ' + E(typeof covWhenText === 'function' ? covWhenText(c) : (c.shift_date + ' ' + c.shift_time)) + '</b>'
      + '<div class="field-note">Everyone who could cover it, contacted or not, and why.' + (live() ? '' : ' Preview, only owners see this (switch off).') + '</div></div>'
      + '<button class="al-btn" onclick="AL.close()">Close</button></div>';
    if (S.err) h += '<div style="color:var(--red);margin-top:10px;">' + E(S.err) + '</div>';
    else if (!d) h += '<div class="field-note" style="margin-top:12px;">Building the list…</div>';
    else {
      if (d.meta && d.meta.schedule && d.meta.schedule.held) h += '<div role="alert" style="margin-top:10px;background:#FDECEA;color:#B42318;border-radius:10px;padding:9px 12px;font-weight:600;">' + E(d.meta.schedule.held) + '. Nobody is texted until it can be checked.</div>';
      h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">' + chip('Ready to ask · ' + d.ready.length + ' (' + d.ready.filter((x) => x.contacted).length + ' contacted)', '#E8F5EE', '#1D6B43')
        + chip('Possible with your review · ' + d.review.length, '#FFF3DC', '#8A5300') + chip('Do not ask · ' + d.dont.length, '#F2F4F7', '#475467') + '</div>';
      h += group('1. Ready to ask', 'Cara contacts these by herself: familiar first, then the PRN Team, then everyone else who qualifies.', '#E8F5EE', '#1D6B43',
        table(d.ready.map((x) => row(x, chip(x.label ? 'Ready · ' + x.label : 'Ready', '#E8F5EE', '#1D6B43'), E(x.why))).join('') || '<tr><td colspan="4" class="field-note" style="padding:9px 12px;">Nobody meets every requirement.</td></tr>'));
      h += group('2. Possible with your review', 'Cara never contacts these. Each row says what stands in the way.', '#FFF3DC', '#8A5300',
        table(d.review.map((x) => {
          const isCare = x.kind === 'care', appr = x.approval;
          const match = appr ? chip('Approved for this shift', '#E8F5EE', '#1D6B43') : chip((isCare ? 'Care review · ' : 'Your call · ') + x.label, isCare ? '#FFF3DC' : '#FDF0E6', isCare ? '#8A5300' : '#8A4416');
          const why = appr ? 'Approved by ' + E(appr.by) + ' ' + E(clock(appr.at)) + (appr.adjusted && appr.adjusted.length ? '. ' + E(appr.adjusted.map((t) => t.label + ': ' + (t.change === 'moved' ? 'moved to ' + (appr.moved_to || 'another visit') : 'not needed')).join('; ')) : '') + '.'
            : isCare ? E(x.why) + (x.blocking && x.blocking.length ? '. In the way: <b>' + E(x.blocking.map((t) => t.label).join(', ')) + '</b>' : '') + ' <button class="al-btn al-sm" onclick="AL.review(\'' + E(x.axiscare_id || x.name) + '\')">' + (S.open === (x.axiscare_id || x.name) ? 'Close review' : 'Review') + '</button>'
            : E(x.why) + (x.contacted ? '' : ' <button class="al-btn al-sm" onclick="AL.askAnyway(\'' + E(x.name) + '\')">Ask anyway</button>');
          return row(x, match, why) + (isCare && !appr && S.open === (x.axiscare_id || x.name) ? reviewPanel(x) : '');
        }).join('') || '<tr><td colspan="4" class="field-note" style="padding:9px 12px;">Nobody.</td></tr>'));
      h += group('3. Do not ask', 'Safety, compliance or scheduling limits that nobody waives here.', '#F2F4F7', '#344054',
        table(d.dont.map((x) => row(x, chip(x.label, '#F2F4F7', '#475467'), E(x.why))).join('') || '<tr><td colspan="4" class="field-note" style="padding:9px 12px;">Nobody.</td></tr>')
        + (d.hidden ? '<div class="field-note" style="padding:8px 14px 12px;">Not shown: ' + d.hidden + ' not active in AxisCare.</div>' : ''));
    }
    el.innerHTML = h + '</div>';
  }
  function review(key) { S.open = key && S.open !== key ? key : null; S.adjust = {}; paint(); }
  function adj(k, v) { S.adjust = Object.assign({}, S.adjust || {}, { [k]: v }); const keep = { skills: (document.getElementById('al_ck_skills') || {}).checked, payer: (document.getElementById('al_ck_payer') || {}).checked,
    moved: (document.getElementById('al_moved') || {}).value, agreed: (document.getElementById('al_agreed') || {}).value, why: (document.getElementById('al_why') || {}).value };
    paint(); const set = (id, v, p) => { const e = document.getElementById(id); if (e && v != null) e[p] = v; };
    set('al_ck_skills', keep.skills, 'checked'); set('al_ck_payer', keep.payer, 'checked'); set('al_moved', keep.moved, 'value'); set('al_agreed', keep.agreed, 'value'); set('al_why', keep.why, 'value'); }
  async function approve() {
    const x = (S.data && S.data.review || []).find((r) => (r.axiscare_id || r.name) === S.open); if (!x) return;
    const adjust = {}; Object.entries(S.adjust || {}).forEach(([k, v]) => { if (v === 'moved' || v === 'not_needed') adjust[k] = v; });
    const body = { action: 'review_approve', case_id: S.id, axiscare_id: x.axiscare_id, name: x.name, adjust,
      moved_to: (document.getElementById('al_moved') || {}).value || '', agreed_by: (document.getElementById('al_agreed') || {}).value || '', why: (document.getElementById('al_why') || {}).value || '',
      checks: { skills: !!(document.getElementById('al_ck_skills') || {}).checked, payer: !!(document.getElementById('al_ck_payer') || {}).checked } };
    if (!(await ask('Approve ' + x.name + ' for this shift only and text them the offer?\n\nRecorded on the shift with your name. Their level in AxisCare does not change.'))) return;
    try { const r = await call(body); say('Approved and recorded.' + ((r.sent || []).length ? ' ' + x.name + ' has been texted.' : '') + ((r.failed || []).length ? '\n\nNot sent: ' + r.failed.join('; ') : ''));
      S.open = null; S.adjust = {}; await show(S.id); }
    catch (e) { say('Not approved: ' + (e.message || e)); }
  }
  async function askAnyway(name) {
    if (!(await ask('Text ' + name + ' about this shift anyway? The reason they were left out is on the list; you know things the data doesn\'t.'))) return;
    try { const r = await call({ action: 'send_selected', case_id: S.id, recipients: [name] }); say((r.sent || []).length ? 'Sent to ' + name + '.' : 'Not sent: ' + ((r.failed || []).concat(r.refused_not_eligible || []).join('; ') || 'not on the list')); await show(S.id); }
    catch (e) { say('Could not send: ' + (e.message || e)); }
  }
  window.AL = { button, show, close, review, adj, approve, askAnyway, visible };
})();
