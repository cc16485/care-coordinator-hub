/* ASK CAREGIVERS, ONE PANEL (Samantha 2026-11-12: "I need simplified scheduling - clear way to send message to entire team,
   clear way to search who has worked with a client before and send them the message, clear way to choose other
   caregivers/pro who are at the correct level"; her "Yes, build it" on the sketch).
   On an open shift, one question: who do you want to ask?
     Worked with <client>   visits with this client in the last 6 months (the server's 180 days), favorites first
     Right level            everyone else the server allows; it already leaves out anyone below the client's level.
                            Filters: Level 3 only, PRN CNA Team, PRN Caregiver Team
     Whole team             everyone the server allows
   Names with tick boxes, one line on who is left out and why, one send button.
   Nothing new on the server: the list is coverage-run "candidates_v2" and the send is "send_selected", which works out who
   may be texted again on the server, so this page can only choose WITHIN the safe set. The wording is the office's saved
   wording (Settings); it is shown, not typed here. Replies land on the shift as before.
   Switch: ops_settings.ask_panel_live (off). While off, an owner can try it in their own browser (localStorage ask_panel_preview).
   When on it stands in for the simple card's list, the classic picker, "Ask everyone now" and the PRN team buttons. */
(function (root) {
  'use strict';
  const lc = (s) => String(s == null ? '' : s).trim().toLowerCase();
  /* pure: one row per person the server will text, from the candidates answer */
  function peopleOf(pool) {
    const out = [], seen = {};
    const add = (x, prn) => {
      if (!x || !x.name) return; const k = lc(x.name);
      const h = x.history || null, mine = x.this_client || null, team = x.prn_pref && x.prn_pref.team ? String(x.prn_pref.team) : (prn ? 'cna' : '');
      /* listed twice (worked with them AND on a PRN team): one row, and it keeps the team */
      if (seen[k]) { if (team && !seen[k].team) seen[k].team = team === 'caregiver' ? 'caregiver' : 'cna'; return; }
      out.push(seen[k] = { name: String(x.name), level: typeof x.level === 'number' ? x.level : null, visits: h && h.visits ? Number(h.visits) : 0, last: h ? String(h.last || '') : '',
        favorite: !!(mine && mine.favorite), concern: !!(mine && mine.rating === 'concern'), team: team === 'caregiver' ? 'caregiver' : team ? 'cna' : '',
        free: x.free_then === true, why: String(x.why || '') });
    };
    const p = pool || {};
    (p.group1 || []).forEach((x) => add(x, false)); (p.group0 || []).forEach((x) => add(x, true)); (p.prn_other || []).forEach((x) => add(x, true));
    (p.group2 || []).forEach((x) => add(x, false)); (p.prn_ongoing || []).forEach((x) => add(x, true));
    return out;
  }
  const FILTERS = [['any', 'Everyone at the right level'], ['l3', 'Level 3 only'], ['cna', 'PRN CNA Team'], ['caregiver', 'PRN Caregiver Team']];
  /* pure: who a choice lists, in order. choice: 'worked' | 'level' | 'all'. filter applies to 'level' only. */
  function listFor(people, choice, filter) {
    const worked = people.filter((p) => p.visits > 0).sort((a, b) => (b.favorite - a.favorite) || (a.concern - b.concern) || (b.visits - a.visits));
    if (choice === 'worked') return worked;
    const others = people.filter((p) => !(p.visits > 0));
    if (choice === 'all') return worked.concat(others);
    return others.filter((p) => filter === 'l3' ? p.level === 3 : filter === 'cna' ? p.team === 'cna' : filter === 'caregiver' ? p.team === 'caregiver' : true);
  }
  /* pure: who starts ticked. Worked with and Whole team: everyone listed, except a concern. Right level: the first five. */
  function defaultTicks(list, choice) {
    const ok = list.filter((p) => !p.concern);
    return (choice === 'level' ? ok.slice(0, 5) : ok).map((p) => p.name);
  }
  /* pure: the people the server left out, grouped by its own reason, biggest group first. Never people already asked. */
  function leftOut(pool) {
    const by = {};
    ((pool && pool.excluded) || []).forEach((e) => {
      if (!e || !e.name || e.code === 'asked' || e.ax_active === false || /^cancel+ed( shifts?)?$/i.test(String(e.name))) return;
      const w = String(e.why || 'not asked').replace(/\s+/g, ' ').trim(); (by[w] = by[w] || []).push(String(e.name));
    });
    return Object.keys(by).map((w) => ({ why: w, names: by[w] })).sort((a, b) => b.names.length - a.names.length);
  }
  function counts(people) { return { worked: listFor(people, 'worked').length, level: listFor(people, 'level', 'any').length, all: people.length }; }
  /* pure: the small facts on a row */
  function facts(p) {
    const b = [];
    if (p.level != null) b.push('Level ' + p.level);
    if (p.team) b.push(p.team === 'cna' ? 'PRN CNA Team' : 'PRN Caregiver Team');
    if (p.visits) b.push(p.visits + (p.visits === 1 ? ' visit' : ' visits'));
    if (p.favorite) b.push('their favorite');
    if (p.concern) b.push('a concern on file');
    if (!p.visits && p.free) b.push('free then');
    return b.join(' · ');
  }
  const CORE = { peopleOf, listFor, defaultTicks, leftOut, counts, facts, FILTERS };
  if (typeof module !== 'undefined' && module.exports) { module.exports = CORE; return; }

  /* ═══════════════════════════════════ in the Hub ═══════════════════════════════════ */
  const W = root;
  const E = (s) => (typeof W.escapeHtmlComms === 'function' ? W.escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} } };
  const settings = () => { try { return (DATA && DATA.ops_settings) || {}; } catch (e) { return {}; } };
  const owner = () => { try { return !!W.ccIsOwner(); } catch (e) { return false; } };
  const live = () => settings().ask_panel_live === true;
  const preview = () => owner() && ls.get('ask_panel_preview') === '1';
  function on(c) { return !!c && c.status === 'open' && String(c.kind) !== 'interest' && c.open_hours !== true && (live() || preview()); }
  async function call(body) {
    const s = await sb.auth.getSession(), session = s && s.data && s.data.session;
    if (!session || !session.access_token) throw new Error('Sign in to the Hub first.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/coverage-run', { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const out = await r.json().catch(() => null);
    if (!r.ok || !out || out.error) throw new Error((out && out.error) || ('The scheduling service answered ' + r.status));
    return out;
  }
  const ST = {};   /* per case: { key, pool, people, err, loading, choice, filter, ticks:{choice:Set}, sending, said, out } */
  const keyOf = (c) => (c.asked || []).map((a) => [a.id || a.name, a.state].join('|')).join(',') + '|' + c.shift_time + '|' + c.shift_date;
  const caseOf = (id) => { try { return (DATA.coverage_cases || []).find((x) => x && x.id === id) || null; } catch (e) { return null; } };
  function rerender() { try { if (typeof W.renderCoverage === 'function') W.renderCoverage(); } catch (e) {} }
  async function load(id) {
    const c = caseOf(id); if (!c) return;
    const prev = ST[id] || {};
    ST[id] = Object.assign({ choice: 'worked', filter: 'any', ticks: {} }, prev, { key: keyOf(c), loading: true });
    try {
      const pool = await call({ action: 'candidates_v2', case_id: id }), people = peopleOf(pool), n = counts(people);
      const s = ST[id]; s.pool = pool; s.people = people; s.err = null; s.ticks = {};
      /* open on the first choice that has anyone in it */
      if (!prev.pool) s.choice = n.worked ? 'worked' : n.level ? 'level' : 'all';
    } catch (e) { ST[id].err = String((e && e.message) || e); }
    ST[id].loading = false; rerender();
  }
  function ticksOf(s) {
    const k = s.choice + (s.choice === 'level' ? ':' + s.filter : '');
    if (!s.ticks[k]) s.ticks[k] = new Set(defaultTicks(listFor(s.people || [], s.choice, s.filter), s.choice));
    return s.ticks[k];
  }
  const clientOf = (c) => String(c.client_name || c.client || 'this client');
  const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || 'this client';
  const btnCss = 'font:inherit;font-weight:600;font-size:13px;border-radius:8px;padding:8px 14px;cursor:pointer;';

  function html(c) {
    const id = E(c.id), s = ST[c.id];
    if (!s || (s.key !== keyOf(c) && !s.loading)) { setTimeout(() => load(c.id), 0); }
    let h = '<div id="askp_' + id + '" class="askp" style="margin-top:8px;border:1px solid #C9D5E3;border-radius:12px;padding:12px 14px;background:#fff;">';
    if (preview() && !live()) h += '<div style="font-size:12.5px;background:#FFF4E3;border-radius:8px;padding:6px 10px;margin-bottom:8px;">The new Ask caregivers panel, only in your browser (the office still sees the old card). '
      + '<a href="javascript:void(0)" onclick="AP.preview(false)">Back to the old card</a></div>';
    if (!s || (s.loading && !s.people)) return h + '<div class="field-note">Finding who can take this shift…</div></div>';
    if (s.err && !s.people) return h + '<div style="color:#B42318;font-size:13.5px;">Couldn\'t build the list: ' + E(s.err) + ' <a href="javascript:void(0)" onclick="AP.load(\'' + id + '\')">Try again</a></div></div>';
    const people = s.people || [], n = counts(people), list = listFor(people, s.choice, s.filter), ticks = ticksOf(s), who = firstName(clientOf(c));
    const lvl = s.pool && s.pool.client_level != null ? Number(s.pool.client_level) : null;
    const choice = (k, title, sub) => '<button type="button" data-askp-choice="' + k + '" aria-pressed="' + (s.choice === k) + '" onclick="AP.pick(\'' + id + '\',\'' + k + '\')" style="font:inherit;text-align:left;cursor:pointer;border-radius:10px;padding:9px 12px;'
      + (s.choice === k ? 'background:#E6EEF7;border:2px solid #0E3860;' : 'background:#fff;border:1px solid #C9D5E3;') + '"><b style="display:block;color:#0E3860;font-size:14px;">' + E(title) + '</b><span style="font-size:12.5px;color:#475467;">' + E(sub) + '</span></button>';
    h += '<div style="font-size:13px;font-weight:700;color:#344054;margin-bottom:6px;">Who do you want to ask?</div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;">'
      + choice('worked', 'Worked with ' + who, n.worked + (n.worked === 1 ? ' caregiver' : ' caregivers') + ', last 6 months')
      + choice('level', 'Right level', n.level + ' other' + (n.level === 1 ? '' : 's') + (lvl ? ' at Level ' + lvl + (lvl < 3 ? ' or higher' : '') : ' who fit'))
      + choice('all', 'Whole team', n.all + (n.all === 1 ? ' caregiver' : ' caregivers') + ' who can be asked')
      + '</div>';
    if (s.choice === 'level') h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">' + FILTERS.map((f) => '<button type="button" data-askp-filter="' + f[0] + '" aria-pressed="' + (s.filter === f[0]) + '" onclick="AP.filter(\'' + id + '\',\'' + f[0] + '\')" style="font:inherit;font-size:12.5px;cursor:pointer;border-radius:999px;padding:4px 11px;'
      + (s.filter === f[0] ? 'background:#0E3860;color:#fff;border:1px solid #0E3860;' : 'background:#fff;color:#0E3860;border:1px solid #C9D5E3;') + '">' + E(f[1]) + '</button>').join('') + '</div>';
    const nT = list.filter((p) => ticks.has(p.name)).length;
    if (list.length) {
      h += '<div style="display:flex;gap:12px;align-items:baseline;margin-top:10px;font-size:12.5px;"><span class="field-note">' + nT + ' of ' + list.length + ' ticked</span>'
        + '<a href="javascript:void(0)" onclick="AP.all(\'' + id + '\',true)">Tick all</a><a href="javascript:void(0)" onclick="AP.all(\'' + id + '\',false)">Untick all</a></div>'
        + '<div style="margin-top:4px;border-top:1px solid #EAECF0;' + (list.length > 12 ? 'max-height:420px;overflow:auto;' : '') + '">'
        + list.map((p, i) => '<label style="display:flex;gap:10px;align-items:center;padding:7px 2px;border-bottom:1px solid #EAECF0;font-size:14px;cursor:pointer;"><input type="checkbox" data-askp-row="' + E(p.name) + '"' + (ticks.has(p.name) ? ' checked' : '')
          + ' onchange="AP.tick(\'' + id + '\',' + i + ',this.checked)" style="width:auto;margin:0;"><span style="flex:1;min-width:0;font-weight:600;color:#101828;">' + E(p.name) + '</span><span style="font-size:12.5px;color:' + (p.concern ? '#B42318' : '#475467') + ';text-align:right;">' + E(facts(p)) + '</span></label>').join('') + '</div>';
    } else {
      h += '<div class="field-note" style="margin-top:10px;">' + (s.choice === 'worked' ? 'Nobody who can be asked has worked with ' + E(who) + ' in the last 6 months. Try Right level.' : s.choice === 'level' ? 'Nobody else fits this filter. Try another, or Whole team.' : 'Nobody is left to ask for this shift.') + '</div>';
    }
    const out = leftOut(s.pool), nOut = out.reduce((a, g) => a + g.names.length, 0);
    if (nOut) h += '<details style="margin-top:8px;"><summary class="field-note" style="cursor:pointer;">Not asked: ' + nOut + (nOut === 1 ? ' person' : ' people') + '. See who and why</summary>'
      + out.map((g) => '<div style="font-size:12.5px;margin-top:4px;"><b>' + E(g.why) + ':</b> ' + E(g.names.slice(0, 30).join(', ')) + (g.names.length > 30 ? ' and ' + (g.names.length - 30) + ' more' : '') + '</div>').join('')
      + '<div class="field-note" style="margin-top:4px;">These rules are checked again on the server when you send, so nobody outside them can be texted from here.</div></details>';
    h += '<details style="margin-top:6px;"><summary class="field-note" style="cursor:pointer;">The text they get</summary>' + (typeof W.covWordingPreview === 'function' ? W.covWordingPreview(c) : '')
      + '<div class="field-note" style="margin-top:4px;">This is the office\'s saved wording. Change it in Settings.</div></details>';
    if (s.said) h += '<div data-askp-said="1" style="margin-top:8px;font-size:13px;border-radius:8px;padding:7px 10px;background:' + (s.saidBad ? '#FDECEA;color:#B42318' : '#E8F5EC;color:#1D6B43') + ';">' + E(s.said) + '</div>';
    h += '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px;">'
      + '<button type="button" data-askp-send="1" onclick="AP.send(\'' + id + '\')"' + (nT && !s.sending ? '' : ' disabled') + ' style="' + btnCss + 'background:#0E3860;color:#fff;border:0;' + (nT && !s.sending ? '' : 'opacity:.5;cursor:default;') + '">'
      + (s.sending ? 'Sending…' : nT ? 'Text ' + nT + (nT === 1 ? ' caregiver' : ' caregivers') : 'Tick someone to text') + '</button>'
      + '<span class="field-note">Replies come back to this shift.</span>'
      + (s.loading ? '<span class="field-note">Refreshing…</span>' : '<a href="javascript:void(0)" class="field-note" onclick="AP.load(\'' + id + '\')">Refresh the list</a>') + '</div>';
    return h + '</div>';
  }
  async function send(id) {
    const c = caseOf(id), s = ST[id]; if (!c || !s || s.sending) return;
    const list = listFor(s.people || [], s.choice, s.filter), ticks = ticksOf(s), names = list.filter((p) => ticks.has(p.name)).map((p) => p.name);
    if (!names.length) return;
    const ask = 'Text ' + names.length + (names.length === 1 ? ' caregiver' : ' caregivers') + ' about this shift for ' + clientOf(c) + '?';
    let yes = true; try { if (typeof W.ccConfirm === 'function') yes = await W.ccConfirm(ask); } catch (e) { yes = false; }
    if (!yes) return;
    s.sending = true; s.said = ''; rerender();
    try {
      const who = (() => { try { return (W.ccActor() || {}).name || ''; } catch (e) { return ''; } })();
      const r = await call({ action: 'send_selected', case_id: id, recipients: names, asked_by: who });
      const sent = (r.sent || []).length, failed = (r.failed || []).length, already = (r.already_asked || []).length, refused = (r.refused_not_eligible || []).length;
      s.saidBad = !sent && (failed || refused);
      s.said = 'Texted ' + sent + '.' + (already ? ' ' + already + ' had already been asked.' : '') + (failed ? ' ' + failed + ' did not go out.' : '') + (refused ? ' ' + refused + ' could not be texted under the rules right now.' : '');
      try { if (typeof W.ccOpsRefresh === 'function') W.ccOpsRefresh(); } catch (e) {}
    } catch (e) { s.saidBad = true; s.said = 'Nothing was sent: ' + String((e && e.message) || e); }
    s.sending = false; await load(id);
  }
  function previewLink(c) {
    if (live() || !owner() || preview() || !c || c.status !== 'open' || String(c.kind) === 'interest' || c.open_hours === true) return '';
    return '<div style="margin-top:8px;"><a href="javascript:void(0)" onclick="AP.preview(true)" style="font-size:12.5px;font-weight:700;">Try the new Ask caregivers panel (only you, only this browser) &rarr;</a></div>';
  }
  W.AP = Object.assign({}, CORE, { on, html, load, send, previewLink, state: ST,
    pick(id, k) { const s = ST[id]; if (!s) return; s.choice = k; s.said = ''; rerender(); },
    filter(id, f) { const s = ST[id]; if (!s) return; s.filter = f; rerender(); },
    tick(id, i, v) { const s = ST[id]; if (!s) return; const p = listFor(s.people || [], s.choice, s.filter)[i]; if (!p) return; const t = ticksOf(s); if (v) t.add(p.name); else t.delete(p.name); rerender(); },
    all(id, v) { const s = ST[id]; if (!s) return; const t = ticksOf(s); listFor(s.people || [], s.choice, s.filter).forEach((p) => { if (v) t.add(p.name); else t.delete(p.name); }); rerender(); },
    preview(v) { ls.set('ask_panel_preview', v ? '1' : null); rerender(); } });
})(typeof window !== 'undefined' ? window : globalThis);
