/* =============================================================================
   cara-run.js · "LET CARA RUN IT" (Cara Phase 2 Part A, Samantha 2026-10-24: "A coordinator must authorize Cara per case."
   "Show exactly who started Cara, what was sent, who responded and what still needs attention.")
   On every open shift: a coordinator hands the case to Cara. Cara asks in waves (5 people, 20 minutes apart, 10 for a
   shift within a day, 3 waves at most) through the same send as "Send Cara's list". The first full-shift yes from an
   eligible caregiver pauses her and tells the office; the case stays open until someone confirms (the same Confirm as
   today, which puts them on the AxisCare visit and checks it). "Not this one" or no answer in time and she keeps asking.
   After 3 waves, or under 2 hours to the shift, she hands it back. "Take it back" stops her at any time.
   Everything happens on the server (coverage-run: cara_run_get / cara_run_start / cara_run_stop / cara_run_not_this_one);
   this file only shows it and sends the office's taps.
   Switch: ops_settings.cara_run_live (and caregiver texting, coverage_send_live). Off: only owners see it, and a run is
   PRACTICE: the waves are worked out and listed as "would text", nobody is texted, no card or office text.
   ============================================================================= */
(function () {
  'use strict';
  const E = (s) => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s));
  const settings = () => (typeof DATA !== 'undefined' && DATA.ops_settings) || {};
  const live = () => settings().cara_run_live === true;
  const owner = () => typeof CC_ROLES !== 'undefined' && Array.isArray(CC_ROLES) && CC_ROLES.includes('owner_admin');
  const visible = () => live() || owner();
  const first = (n) => String(n || '').trim().split(/\s+/)[0] || '';
  const tm = (iso) => { if (!iso) return ''; try { return new Date(iso).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };
  const ST = {};   // per case: { key, loading, data, err, busy, why }
  const keyOf = (c) => (c.asked || []).map((a) => [a.id, a.state, a.replied_at].join('|')).join(',') + '|' + c.status;
  async function call(body) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session || !session.access_token) throw new Error('Sign in to the hub first.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/coverage-run', { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const out = await r.json().catch(() => null);
    if (!r.ok || !out || out.error) throw new Error((out && out.error) || ('The engine answered ' + r.status));
    return out;
  }
  function rerender() { try { if (typeof renderCoverage === 'function') renderCoverage(); } catch (e) {} }
  const timers = {};
  async function load(id) {
    const c = (DATA.coverage_cases || []).find((x) => x && x.id === id); if (!c) return;
    const prev = ST[id] || {};
    ST[id] = { ...prev, key: keyOf(c), loading: !prev.data };
    try { ST[id] = { key: keyOf(c), data: await call({ action: 'cara_run_get', case_id: id }) }; }
    catch (e) { ST[id] = { key: keyOf(c), err: String(e.message || e) }; }
    rerender();
    /* while Cara is working, look again every minute so the page keeps up with her waves */
    clearTimeout(timers[id]);
    const r = ST[id].data && ST[id].data.run;
    if (r && (r.status === 'running' || r.status === 'paused')) timers[id] = setTimeout(() => { if (document.getElementById('crun_' + id)) load(id); }, 60000);
  }
  async function act(id, body, ok) {
    ST[id] = { ...(ST[id] || {}), busy: true }; rerender();
    try {
      const out = await call({ case_id: id, ...body });
      if (typeof ccToast === 'function') ccToast(ok(out));
      try { if (typeof loadFromSupabase === 'function') await loadFromSupabase(); } catch (e) {}
    } catch (e) { alert('Not done: ' + (e.message || e)); }
    ST[id] = { ...(ST[id] || {}), busy: false };
    try { if (window.CB && CB.on()) CB.load(id); } catch (e) {}
    await load(id);
  }
  async function start(id) {
    const d = ST[id] && ST[id].data; const r = d && d.rules;
    const msg = (d && d.practice_only ? 'PRACTICE: Cara works out each wave and lists who she WOULD text. Nobody is texted.\n\n' : '')
      + 'Let Cara run this shift? She asks ' + (r ? r.size : 5) + ' people at a time, ' + (r ? r.gap : 20) + ' minutes apart, ' + (r ? r.maxWaves : 3)
      + ' waves at most, using your usual wording. She stops at the first full-shift yes and asks you to confirm. Nothing is assigned until a person confirms.';
    if (typeof ccConfirm === 'function' && !(await ccConfirm(msg))) return;
    act(id, { action: 'cara_run_start' }, (o) => o.practice ? 'Cara is running this as practice' : 'Cara is running this');
  }
  async function stop(id) {
    const el = document.getElementById('crwhy_' + id); const why = el ? el.value.trim() : '';
    if (typeof ccConfirm === 'function' && !(await ccConfirm('Take this shift back from Cara? She won\'t send anything more. Answers still land on the board.'))) return;
    act(id, { action: 'cara_run_stop', why }, () => 'Taken back from Cara');
  }
  function notThis(id, askId, name) {
    ST[id] = { ...(ST[id] || {}), why: { ask_id: askId, name } }; rerender();
  }
  function notThisSend(id) {
    const w = ST[id] && ST[id].why; if (!w) return;
    const el = document.getElementById('crnot_' + id); const why = el ? el.value.trim() : '';
    ST[id].why = null;
    act(id, { action: 'cara_run_not_this_one', ask_id: w.ask_id, why }, () => 'Not ' + first(w.name) + ': Cara keeps asking');
  }
  function notThisCancel(id) { if (ST[id]) ST[id].why = null; rerender(); }

  const STATUS = {
    running: ['Cara is running this', '#14606F', '#e3f0f2'],
    paused: ['Cara is waiting for you', '#8a5a00', '#fdf3dc'],
    needs_office: ['Cara stopped: over to the office', 'var(--red)', '#f8e7e3'],
    stopped: ['Taken back from Cara', 'var(--text-muted)', '#f1f3f6'],
    done: ['Cara is finished', 'var(--green)', 'var(--green-bg)'],
  };
  const btn = (cls, on, label, dis) => '<button class="' + cls + '"' + (dis ? ' disabled' : '') + ' onclick="' + on + '">' + label + '</button>';
  function timeline(d) {
    const ev = d.events || []; if (!ev.length) return '';
    const icon = { started: '▶', wave: '📨', paused: '✋', resumed: '↻', not_this_one: '✕', needs_office: '⚑', night: '☾', stopped: '■', finished: '✓' };
    return '<details style="margin-top:8px;"' + (ev.length <= 6 ? ' open' : '') + '><summary class="field-note" style="cursor:pointer;font-weight:700;">What Cara did (' + ev.length + ')</summary>'
      + ev.map((e) => '<div style="display:flex;gap:8px;font-size:13px;padding:4px 0;border-top:1px dashed var(--border);">'
        + '<span style="min-width:96px;color:var(--text-muted);font-size:12px;">' + E(tm(e.at)) + '</span>'
        + '<span style="width:16px;text-align:center;">' + (icon[e.kind] || '·') + '</span>'
        + '<span style="flex:1;min-width:0;">' + E(e.summary) + (e.actor && e.actor !== 'Cara' && e.kind !== 'started' ? ' <span class="field-note">(' + E(e.actor) + ')</span>' : '') + '</span></div>').join('')
      + '</details>';
  }
  function asked(d) {
    const a = d.asks || []; if (!a.length) return '';
    const waves = [...new Set(a.map((x) => x.wave))].sort((x, y) => x - y);
    const said = (s) => s === 'yes' ? '<b style="color:var(--green);">yes</b>' : s === 'no' ? '<span style="color:var(--red);">no</span>' : s === 'inquiry' ? '<span style="color:#8a5a00;">question</span>' : '<span class="field-note">no answer yet</span>';
    return '<div style="margin-top:6px;font-size:13px;">' + waves.map((w) => '<div><b>Wave ' + w + ':</b> ' + a.filter((x) => x.wave === w).map((x) => E(x.name) + ' ' + said(x.state)).join(' · ') + '</div>').join('') + '</div>';
  }
  /* the panel for one open shift ('' where Cara can't run it or the person can't see it) */
  function html(c) {
    if (!visible() || !c || String(c.kind) === 'interest' || c.open_hours === true) return '';
    const id = c.id, st = ST[id];
    if (!st || (st.key !== keyOf(c) && !st.loading && !st.busy)) { if (!(st && st.loading)) setTimeout(() => load(id), 0); }
    const box = (inner) => '<div id="crun_' + E(id) + '" style="margin-top:10px;padding:11px 13px;border:1.5px solid #b9dbe0;border-radius:12px;background:#F5FAFB;">' + inner + '</div>';
    if (!st || (st.loading && !st.data)) return box('<span class="field-note">Checking whether Cara is running this…</span>');
    if (st.err) return box('<span style="color:var(--red);font-size:12.5px;">' + E(st.err) + '</span> <a href="javascript:void(0)" onclick="CRUN.load(\'' + E(id) + '\')">Try again</a>');
    const d = st.data, r = d.run, busy = !!st.busy, q = "'" + E(id) + "'";
    const rules = d.rules || { size: 5, gap: 20, maxWaves: 3 };
    const practiceNote = d.practice_only ? '<div class="field-note" style="margin-top:5px;color:#92400E;"><b>Practice.</b> The "Let Cara run it" switch is off, so only owners see this and nobody is texted.</div>' : '';
    if (!r) {
      if (c.status !== 'open') return '';
      return box('<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;"><b style="color:var(--navy);font-size:14px;flex:1;min-width:220px;">Let Cara ask for you</b>'
        + (d.start_refused ? '<span class="field-note">' + E(d.start_refused) + '</span>' : btn('addlead', 'CRUN.start(' + q + ')', d.practice_only ? 'Let Cara run it (practice)' : 'Let Cara run it', busy || !d.can_start))
        + '</div><div class="field-note" style="margin-top:4px;">She asks ' + E(rules.size) + ' at a time, ' + E(rules.gap) + ' minutes apart, ' + E(rules.maxWaves) + ' waves at most, with your usual wording and every safety check. She stops at the first full-shift yes and asks you to confirm.</div>' + practiceNote);
    }
    const [label, fg, bg] = STATUS[r.status] || [r.status, 'var(--navy)', '#fff'];
    const head = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">'
      + '<span style="font-weight:800;font-size:13px;border-radius:999px;padding:2px 11px;color:' + fg + ';background:' + bg + ';">' + E(label) + (r.practice ? ' · practice' : '') + '</span>'
      + '<span class="field-note">started by <b>' + E(r.started_by) + '</b> ' + E(tm(r.started_at)) + (r.wave ? ' · ' + E(r.wave) + ' wave' + (r.wave === 1 ? '' : 's') + ' sent' : '')
      + (r.status === 'running' && r.next_wave_at ? ' · next wave ' + (new Date(r.next_wave_at) > new Date() ? 'not before ' + E(tm(r.next_wave_at)) : 'due now') : '') + '</span>'
      + '<span style="flex:1;"></span>'
      + (['running', 'paused', 'needs_office'].includes(r.status) && c.status === 'open' ? btn('ghost', 'CRUN.stop(' + q + ')', 'Take it back', busy) : '')
      + (['stopped', 'needs_office'].includes(r.status) && c.status === 'open' && d.can_start && !d.start_refused ? btn('addlead', 'CRUN.start(' + q + ')', r.status === 'needs_office' ? 'Keep searching' : 'Let Cara run it again', busy) : '')
      + '</div>';
    let needs = '';
    if (d.needs) {
      needs = '<div style="margin-top:8px;padding:8px 11px;border-radius:9px;background:#FFF4E3;border:1px solid #f0d9a6;font-size:13.5px;"><b>Needs you:</b> ' + E(d.needs);
      if (r.status === 'paused' && c.status === 'open') {
        const w = st.why;
        needs += w ? '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">Not ' + E(first(w.name)) + ', because <input id="crnot_' + E(id) + '" placeholder="optional, for the record" style="width:auto;flex:1;min-width:160px;font-size:13px;padding:3px 8px;">'
            + btn('addlead', 'CRUN.notThisSend(' + q + ')', 'Not this one, keep asking', busy) + btn('ghost', 'CRUN.notThisCancel(' + q + ')', 'Cancel', busy) + '</div>'
          : '<div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">'
            + '<span class="field-note">Confirm ' + E(first(r.paused_name)) + ' on the board below.</span>'
            + btn('ghost', 'CRUN.notThis(' + q + ',\'' + E(r.paused_ask_id) + '\',\'' + E(String(r.paused_name || '').replace(/'/g, '')) + '\')', 'Not this one', busy)
            + (r.confirm_by ? '<span class="field-note">No answer by ' + E(tm(r.confirm_by)) + ' and Cara keeps asking; the yes stays on the board.</span>' : '') + '</div>';
      }
      needs += '</div>';
    }
    const ended = (r.status === 'stopped' || r.status === 'done') && r.end_why ? '<div class="field-note" style="margin-top:6px;">' + E(r.end_why) + (r.ended_at ? ' · ' + E(tm(r.ended_at)) : '') + '</div>' : '';
    const declined = (r.declined || []).length ? '<div class="field-note" style="margin-top:5px;">Not this one: ' + r.declined.map((x) => E(x.name) + ' (' + E(first(x.by)) + (x.why ? ', ' + E(x.why) : '') + ')').join(', ') + '</div>' : '';
    return box(head + needs + ended + asked(d) + declined + timeline(d) + (r.practice ? practiceNote : ''));
  }
  window.CRUN = { html, load, start, stop, notThis, notThisSend, notThisCancel, visible };
})();
