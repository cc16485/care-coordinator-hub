/* =====================================================================================================================
   MATCHING, IN THE DARK (Samantha "go", 2026-10-12, Track 3d). A read-only window on app_data 'match_dark_report', which the
   match-dark job writes (nightly while the Admin switch is on, or once from a Desktop step): every visit in the next 14 days
   with the assigned caregiver judged by the shared match rule, the call-off replay, the data gaps and the history. Nothing
   here changes a visit, a schedule, a caregiver or a client, or sends anything. MR.open() from the Live Schedule.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const G = { ready: ['Ready', '#15803D', '#DCFCE7'], likely_fit: ['Likely fit (needs incomplete)', '#1E40AF', '#DBEAFE'], one_more_step: ['Needs one more step', '#92400E', '#FEF3C7'], not_for_visit: ['Not for this visit', '#991B1B', '#FEE2E2'] };
  let R = null, F = { group: 'attention', q: '' };
  const chip = g => { const c = G[g] || ['?', '#3A342C', '#F4F2ED']; return '<span style="font-size:11px;font-weight:800;color:' + c[1] + ';background:' + c[2] + ';border-radius:999px;padding:1px 8px;white-space:nowrap">' + esc(c[0]) + '</span>'; };
  const when = iso => { try { return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' Central'; } catch (e) { return String(iso || ''); } };
  function panel(){
    let w = document.getElementById('mrPanel'); if (w) return w;
    w = document.createElement('div'); w.id = 'mrPanel';
    w.style.cssText = 'position:fixed;inset:0;z-index:10010;background:rgba(15,54,95,.35);display:none;align-items:flex-start;justify-content:center;padding:1rem;overflow:auto';
    w.innerHTML = '<div id="mrBody" style="background:#fff;border-radius:12px;max-width:1100px;width:100%;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.2);margin:1rem 0"></div>';
    w.addEventListener('click', e => { if (e.target === w) close(); }); document.body.appendChild(w); return w;
  }
  function close(){ const w = document.getElementById('mrPanel'); if (w) w.style.display = 'none'; }
  async function open(){
    const w = panel(), b = document.getElementById('mrBody'); w.style.display = 'flex';
    b.innerHTML = '<div class="field-note">Opening the latest report…</div>';
    try { const { data, error } = await sb.from('app_data').select('data').eq('key', 'match_dark_report').maybeSingle(); if (error) throw error; R = data && data.data; render(); }
    catch (e) { b.innerHTML = '<div style="color:#B91C1C">Could not open the report: ' + esc(e.message || e) + '</div><div style="text-align:right;margin-top:.8rem"><button class="ibtn" onclick="MR.close()">Close</button></div>'; }
  }
  function render(){
    const b = document.getElementById('mrBody'); if (!b) return;
    let h = '<div style="display:flex;align-items:flex-start;gap:.6rem;border-bottom:2px solid #E8E2D8;padding-bottom:.6rem"><div style="flex:1"><div style="font-size:1.2rem;font-weight:800;color:#0D365F">🧪 Matching check (practice only)</div>'
      + '<div class="field-note">The shared match rule, run over the next 14 days of visits and the last 60 days of call-offs. A report only: nothing on the schedule, a caregiver or a client changes, and nothing is sent.</div></div><button class="ibtn" onclick="MR.close()">Close</button></div>';
    if (!R) { b.innerHTML = h + '<div style="margin-top:1rem" class="field-note">The report has not run yet. It runs each night once <b>Matching check, nightly (practice only)</b> is on (Owners Hub Admin page), or once from Desktop 617.</div>'; return; }
    const c = R.counts || {}, cl = R.clients || {}, g = R.gaps || {};
    h += '<div class="field-note" style="margin:.5rem 0">Run ' + esc(when(R.at)) + '</div>';
    const tile = (n, lab, g2) => '<div style="flex:1 1 130px;border:1px solid #E8E2D8;border-radius:10px;padding:.5rem .7rem;cursor:pointer" onclick="MR.filter(\'' + g2 + '\')"><div style="font-size:1.3rem;font-weight:800;color:#0D365F">' + (n || 0) + '</div><div style="font-size:.78rem">' + lab + '</div></div>';
    h += '<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin:.4rem 0">' + tile(c.visits, 'visits judged', 'all') + tile(c.ready, 'Ready', 'ready') + tile(c.likely_fit, 'Likely fit (needs incomplete)', 'likely_fit') + tile(c.one_more_step, 'Needs one more step', 'one_more_step') + tile(c.not_for_visit, 'Not for this visit', 'not_for_visit') + tile(c.open_visits, 'open visits (not judged)', 'all') + '</div>';
    h += '<div style="font-size:.84rem;margin:.5rem 0"><b>Clients:</b> ' + (cl.total || 0) + ' with visits · ' + (cl.ok || 0) + ' with every need confirmed · ' + (cl.incomplete || 0) + ' incomplete · ' + (cl.flagged || 0) + ' flagged for review · ' + (cl.no_journey || 0) + ' with no Journey in the Hub</div>';
    if ((cl.flagged_list || []).length) h += '<div style="font-size:.82rem;background:#FEE2E2;border-radius:8px;padding:.4rem .6rem;margin-bottom:.5rem">' + cl.flagged_list.map(x => '<div><b>' + esc(x.client) + ':</b> ' + esc(x.why) + '</div>').join('') + '</div>';
    const gl = [g.lock_unreadable ? 'the readiness lock could not be read, so nobody counted as cleared' : '', g.needs_verification ? g.needs_verification + ' caregiver(s) whose training record needs historical verification (shown as a warning)' : '', g.no_availability ? g.no_availability + ' visit(s) by caregivers with no availability on file (assumed available any time)' : '', g.drive_unknown ? g.drive_unknown + ' visit(s) needing driving, and cleared to drive is not recorded yet' : '', g.restrictions_said ? g.restrictions_said + ' caregiver(s) with restrictions written in words (shown, not enforced)' : '', (g.dnr_unmatched || []).length ? 'Do Not Return names not found on the roster: ' + g.dnr_unmatched.join('; ') : '', g.covered_by_unmatched ? g.covered_by_unmatched + ' call-off(s) whose "covered by" name is not on the roster' : ''].filter(Boolean);
    if (gl.length) h += '<details style="margin:.3rem 0 .6rem"><summary style="cursor:pointer;font-weight:700;color:#0D365F">Data gaps (' + gl.length + ')</summary><ul style="font-size:.82rem;margin:.3rem 0 0;padding-left:1.1rem">' + gl.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></details>';
    const rows = (R.rows || []).filter(r => (F.group === 'all' || (F.group === 'attention' ? r.group !== 'ready' : r.group === F.group)) && (!F.q || (r.client + ' ' + r.caregiver).toLowerCase().includes(F.q.toLowerCase())));
    h += '<div style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;margin:.4rem 0"><b style="color:#0D365F">Visits</b>' + [['attention', 'Needs attention'], ['all', 'All'], ['ready', 'Ready'], ['likely_fit', 'Likely fit'], ['one_more_step', 'One more step'], ['not_for_visit', 'Not for this visit']].map(([k, l]) => '<button class="ibtn" style="font-size:.72rem;' + (F.group === k ? 'background:#0D365F;color:#fff;border-color:#0D365F' : '') + '" onclick="MR.filter(\'' + k + '\')">' + l + '</button>').join('')
      + '<input placeholder="Client or caregiver…" value="' + esc(F.q) + '" oninput="MR.search(this.value)" style="flex:1;min-width:160px;padding:.3rem .5rem;border:1px solid #E8E2D8;border-radius:6px"><span class="field-note">' + rows.length + ' shown</span></div>';
    h += rows.length ? '<table style="width:100%;border-collapse:collapse;font-size:.8rem"><tbody>' + rows.slice(0, 400).map(r => '<tr style="border-top:1px solid #F4F2ED"><td style="padding:.3rem;white-space:nowrap;color:#6E6559">' + esc(r.date) + '<br>' + esc(r.time) + '</td><td style="padding:.3rem"><b>' + esc(r.client) + '</b><br>' + esc(r.caregiver) + '</td><td style="padding:.3rem">' + chip(r.group) + '</td><td style="padding:.3rem">' + esc(r.reason || '') + ((r.steps || []).length > 1 ? '<div class="field-note">' + r.steps.slice(1).map(esc).join('<br>') + '</div>' : '') + ((r.warnings || []).length ? '<div class="field-note" style="color:#92400E">' + r.warnings.map(esc).join('<br>') + '</div>' : '') + (r.said ? '<div class="field-note">They said: "' + esc(r.said) + '"</div>' : '') + '</td></tr>').join('') + '</tbody></table>' + (rows.length > 400 ? '<div class="field-note">The first 400 shown.</div>' : '') : '<div class="field-note">None.</div>';
    const rp = R.replay || {};
    h += '<details style="margin-top:.9rem"><summary style="cursor:pointer;font-weight:700;color:#0D365F">Call-off replay, last 60 days (' + (rp.cases || 0) + ' call-offs; the one who covered was Ready in ' + (rp.covered_ready || 0) + ')</summary><div class="field-note" style="margin:.3rem 0">Judged with today\'s records, not the records on the day.</div>'
      + ((rp.rows || []).length ? '<table style="width:100%;border-collapse:collapse;font-size:.8rem"><tbody>' + rp.rows.map(x => '<tr style="border-top:1px solid #F4F2ED"><td style="padding:.3rem;white-space:nowrap">' + esc(x.date) + '</td><td style="padding:.3rem"><b>' + esc(x.client) + '</b><br>covered by ' + esc(x.covered_by || 'nobody recorded') + '</td><td style="padding:.3rem">' + (x.covered_group ? chip(x.covered_group) : '<span class="field-note">not on the roster</span>') + '</td><td style="padding:.3rem">' + esc(x.covered_reason || '') + '<div class="field-note">' + x.asked + ' asked: ' + x.asked_ready + ' would be Ready, ' + x.asked_not_for_visit + ' not for this visit</div></td></tr>').join('') + '</tbody></table>' : '<div class="field-note">No call-offs in the last 60 days.</div>') + '</details>';
    const hi = R.history || [];
    if (hi.length > 1) h += '<details style="margin-top:.6rem"><summary style="cursor:pointer;font-weight:700;color:#0D365F">The last ' + hi.length + ' runs</summary><table style="font-size:.78rem;margin-top:.3rem"><tbody>' + hi.slice().reverse().map(x => '<tr><td style="padding:.15rem .5rem">' + esc(when(x.at)) + '</td><td style="padding:.15rem .5rem">' + (x.visits || 0) + ' visits</td><td style="padding:.15rem .5rem">' + (x.ready || 0) + ' Ready</td><td style="padding:.15rem .5rem">' + (x.not_for_visit || 0) + ' not for the visit</td><td style="padding:.15rem .5rem">' + (x.clients_incomplete || 0) + ' clients incomplete</td></tr>').join('') + '</tbody></table></details>';
    h += '<div class="field-note" style="margin-top:.8rem">' + (R.notes || []).map(esc).join(' ') + '</div>';
    b.innerHTML = h;
  }
  window.MR = { open, close, filter: g => { F.group = g; render(); }, search: q => { F.q = q; render(); }, _set: r => { R = r; } };
})();
