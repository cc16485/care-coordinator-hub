/* LAST-MINUTE SHIFTS (Samantha 2026-10-24, Dan's overnight: "I need this shift to go out to everyone when we are this last
   minute!!" and "also give the option of adding a bonus for last minute shifts").
   - Ask everyone now: everyone eligible for this shift who hasn't been asked, at once. The server lists them first (and who
     is left out and why); one confirm with every name; then it texts them (coverage-run ask_everyone). The same safety
     rules as Cara's waves; nobody is texted twice.
   - Bonus: a whole-dollar bonus on this shift (0 takes it off). Every ask texted after that says it; who set it is kept.
   Shown on open shifts that start within a day (or have started and not ended). */
(function () {
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  async function call(body) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session || !session.access_token) throw new Error('Sign in to the hub first.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/coverage-run', { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const out = await r.json().catch(() => null);
    if (!r.ok || !out || out.error) throw new Error((out && out.error) || ('The engine answered ' + r.status));
    return out;
  }
  const say = (m) => (typeof ccAlert === 'function' ? ccAlert(m) : alert(m));
  const ask = (m) => (typeof ccConfirm === 'function' ? ccConfirm(m) : Promise.resolve(confirm(m)));
  const askVal = (m, v) => (typeof ccPrompt === 'function' ? ccPrompt(m, v) : Promise.resolve(prompt(m, v)));
  const caseOf = (id) => (DATA.coverage_cases || []).find((x) => x && x.id === id);
  async function refresh() {
    try { const f = await sb.from('app_data').select('data').eq('key', 'coverage_cases').maybeSingle(); if (Array.isArray(f.data && f.data.data)) DATA.coverage_cases = f.data.data; } catch (e) {}
    try { if (typeof renderCoverage === 'function') renderCoverage(); } catch (e) {}
  }
  /* starts within a day, or has started and not ended */
  function lastMinute(c) {
    if (!c || c.status !== 'open' || String(c.kind) === 'interest' || typeof covShiftMs !== 'function') return false;
    const ms = covShiftMs(c) - Date.now(); if (!isFinite(ms)) return false;
    const m = /^(\d\d):(\d\d)-(\d\d):(\d\d)$/.exec(String(c.shift_time || '')); let len = 0;
    if (m) { const a = +m[1] * 60 + +m[2], z = +m[3] * 60 + +m[4]; len = (z > a ? z - a : z + 1440 - a) * 60000; }
    return ms < 24 * 3600000 && ms + len > 0;
  }
  const bonusOf = (c) => { const n = Math.round(Number(c && c.bonus && c.bonus.amount)); return n > 0 ? n : 0; };
  function buttons(c) {
    if (!lastMinute(c)) return '';
    const b = bonusOf(c), id = E(c.id);
    return ' <button class="addlead" style="font-size:12px;padding:3px 10px;background:var(--red);border-color:var(--red);" onclick="LM.everyone(\'' + id + '\')">Ask everyone now</button>'
      + ' <button class="ghost" style="font-size:12px;padding:3px 10px;" onclick="LM.bonus(\'' + id + '\')">' + (b ? '$' + b + ' bonus (change)' : 'Add a bonus') + '</button>';
  }
  async function everyone(id) {
    const c = caseOf(id); if (!c) return;
    let p; try { p = await call({ action: 'ask_everyone', case_id: id, preview: true }); } catch (e) { say('Could not build the list: ' + (e.message || e)); return; }
    if (!p.names || !p.names.length) { say('Everyone eligible has already been asked (' + (p.already_asked || 0) + '). Open the case to see who was left out and why, and call people.'); return; }
    if (p.held_night) { say('It\'s night and this shift doesn\'t start within 3 hours, so caregivers can\'t be texted now. Call them, or send from 8am.'); return; }
    const out = (p.left_out || []).length ? '\n\nLeft out (' + p.left_out.length + '): ' + p.left_out.slice(0, 12).map((x) => x.name + ' (' + x.why + ')').join('; ') + (p.left_out.length > 12 ? '; and more on the case' : '') : '';
    const b = bonusOf(c);
    if (!(await ask('Text everyone eligible for ' + (c.client || 'this shift') + ' now? ' + p.names.length + ' caregiver' + (p.names.length === 1 ? '' : 's') + (b ? ', with the $' + b + ' bonus' : '') + ':\n\n'
      + p.names.join(', ') + (p.already_asked ? '\n\n' + p.already_asked + ' already asked are not texted again.' : '') + out + '\n\nA yes is interest only. Nobody is assigned until you confirm.'))) return;
    try {
      const r = await call({ action: 'ask_everyone', case_id: id, send: true, names: p.names });
      let m = 'Sent to ' + (r.sent || []).length + '.';
      if ((r.failed || []).length) m += '\n\nNot sent: ' + r.failed.join('; ');
      if (r.refused) m += '\n\n' + r.refused + ' could no longer be asked (the list changed).';
      say(m); refresh();
    } catch (e) { say('Could not send: ' + (e.message || e)); }
  }
  async function bonus(id) {
    const c = caseOf(id); if (!c) return;
    const v = await askVal('Bonus for whoever takes ' + (c.client || 'this shift') + ' (whole dollars; 0 takes it off). Every text sent after this says it. Tell payroll if someone takes it.', String(bonusOf(c) || 25));
    if (v == null || String(v).trim() === '') return;
    const n = Number(String(v).replace(/[$,\s]/g, ''));
    if (!Number.isInteger(n) || n < 0 || n > 500) { say('Enter a whole dollar amount from 0 to 500.'); return; }
    try { await call({ action: 'set_bonus', case_id: id, amount: n }); say(n ? 'Bonus set: $' + n + '. Texts sent from now on say it.' : 'Bonus taken off.'); refresh(); }
    catch (e) { say('Could not save the bonus: ' + (e.message || e)); }
  }
  window.LM = { buttons, everyone, bonus, lastMinute };
})();
