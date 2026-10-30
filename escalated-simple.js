/* =============================================================================
   escalated-simple.js · ESCALATED TO YOU, MADE SIMPLE (Samantha, 2026-10-30: "so complicated", then "Yes to all three:
   the one-line card, the shorter menu, and grouping by person. Build it behind a switch, off." Plan:
   https://claude.ai/artifact/2C6NzZXYUMVdzeQrR12BH4).
   Only while ops_settings.escalated_simple_live is on; off, the Escalated to you tab is exactly as before.
     1 · One line per card: who · what · "14 days late · Krystal's", and three buttons:
           I'll do it        it becomes yours (TA.transfer: the same take-it-with-a-reason step as Take it...), and the
                             full card opens at the top under "Yours now" with its text or call buttons
           Leave with Krystal it stays hers and leaves your list (the server's work-route stops escalating it for
                             ops_settings.escalated_leave_days, 3 by default); the reason is kept in its history
           Close ▾           Done elsewhere, or No longer needed (the existing close reasons already_handled and stale)
         Tapping the line shows the full card underneath.
     2 · The ⋯ menu has four choices: Help with this (it stays theirs), Waiting on someone... (with a date), Talk about
         it at the meeting, Jot on my desk.
     3 · Grouped by person: one heading per person with the count, what kinds and the oldest; only the cards about a
         client's care at risk or a promise to a family (the call reader's rule, TW.callKept, and TA.critical) are listed
         one by one. "Leave the other N with Krystal" and "Show all N".
   Nothing here texts, emails or calls anyone. No em dashes in anything a person reads.
   ============================================================================= */
(function (W) {
  'use strict';
  /* DATA and ME are the page's own let-variables (not on window), so they are read by name, as team-work.js does */
  const D = () => { try { return DATA || {}; } catch (_) { return {}; } };
  const ME_ = () => { try { return ME || {}; } catch (_) { return {}; } };
  const lc = (s) => String(s || '').toLowerCase();
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const meKey = () => { try { return lc((W.ccActor && W.ccActor().email) || ME_().email || ''); } catch (_) { return ''; } };
  const owner = () => { try { return typeof W.ccIsOwner === 'function' && W.ccIsOwner(); } catch (_) { return false; } };
  const nameOf = (e) => { try { return (typeof W.opsOwnerName === 'function' && W.opsOwnerName(e)) || e; } catch (_) { return e; } };
  const first = (e) => String(nameOf(e) || e || 'them').split(/[\s@]/)[0];
  const item = (id) => (D().ops_items || []).find((x) => x && x.id === id);
  const KEY = 'escalated_simple_live';
  const on = () => (D().ops_settings || {})[KEY] === true;
  const leaveDays = () => { const n = Number((D().ops_settings || {}).escalated_leave_days); return n >= 1 && n <= 14 ? Math.floor(n) : 3; };
  const KIND = { call_followup: ['call follow-up', 'call follow-ups'], care_note: ['shift-note flag', 'shift-note flags'], journey: ['journey step', 'journey steps'],
    coverage: ['coverage card', 'coverage cards'], coverage_outcome: ['coverage question', 'coverage questions'], confirm_times: ['times to confirm', 'times to confirm'] };
  const kindWord = (k, n) => { const w = KIND[k] || ['other card', 'other cards']; return n === 1 ? w[0] : w[1]; };
  const S = { taken: new Set(), all: new Set(), open: new Set() };   /* this page only: taken here, groups shown in full, lines opened */

  /* care at risk or a promise to a family: the one rule the call reader uses (TW.callKept), plus anything critical */
  function front(it) {
    if (!it) return false;
    try { if (W.TA && typeof W.TA.critical === 'function' && W.TA.critical(Object.assign({}, it, { escalation: null }))) return true; } catch (_) {}
    try { if (W.TW && typeof W.TW.callKept === 'function') return !!W.TW.callKept(it); } catch (_) {}
    const id = String(it.id || ''), u = lc(it.urgency), d = lc(it.domain);
    return id.indexOf('cfp_') === 0 || id.indexOf('cfu_') === 0 || u === 'urgent' || d === 'incidents' || (d === 'client_care' && u === 'today');
  }
  function daysLate(it, now) {
    const t = Date.parse(it && it.due || ''); if (!isFinite(t)) return null;
    return Math.floor(((now == null ? Date.now() : now) - t) / 864e5);
  }
  /* one group per person (nobody's cards last), the busiest first */
  function groups(rows, now) {
    const by = new Map();
    for (const it of rows || []) { const o = lc(it && it.owner); if (!by.has(o)) by.set(o, []); by.get(o).push(it); }
    const due = (x) => String(x.due || x.created_at || '9999');
    return [...by.entries()].map(([o, list]) => {
      list.sort((a, c) => due(a).localeCompare(due(c)));
      const kinds = {}; list.forEach((x) => { kinds[x.kind || 'other'] = (kinds[x.kind || 'other'] || 0) + 1; });
      return { owner: o, list, top: list.filter(front), rest: list.filter((x) => !front(x)), kinds, oldest: list[0] ? (list[0].due || list[0].created_at || '') : '' };
    }).sort((a, c) => (!a.owner) - (!c.owner) || c.list.length - a.list.length);
  }
  const shortDay = (iso) => { const t = Date.parse(iso || ''); return isFinite(t) ? new Date(t).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' }) : ''; };
  const btn = (cls, label, js, id) => '<button class="' + cls + '"' + (id ? ' id="' + id + '"' : '') + ' style="padding:5px 12px;font-size:12.5px;" onclick="event.stopPropagation();' + js + '">' + label + '</button>';

  /* the one line */
  function line(it, now) {
    const id = esc(it.id), o = lc(it.owner), n = daysLate(it, now);
    const late = n == null ? '' : n >= 1 ? n + ' day' + (n === 1 ? '' : 's') + ' late' : 'due today';
    const who = String(it.about || '').trim();
    let what = String(it.title || it.about || 'A card').replace(/\s*\([^)]*\)\s*$/, '').trim();
    const chip = (late ? late : '') + (o ? (late ? ' · ' : '') + esc(first(o)) + '’s' : (late ? ' · ' : '') + 'nobody’s');
    const opened = S.open.has(it.id);
    let h = '<div class="card esc-line" id="esc_' + id + '" style="padding:10px 14px;margin:6px 0;cursor:pointer;" onclick="ESC.toggle(\'' + id + '\')">'
      + '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;">'
      + (who && what.toLowerCase().indexOf(who.toLowerCase()) < 0 ? '<b>' + esc(who) + '</b><span>·</span>' : '')
      + '<span style="flex:1 1 260px;min-width:0;">' + esc(what) + '</span>'
      + (chip ? '<span style="font-size:11.5px;font-weight:700;color:var(--red);background:var(--red-l,#fdecea);border-radius:6px;padding:2px 7px;white-space:nowrap;">' + chip + '</span>' : '')
      + '</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;" id="escAct_' + id + '">'
      + btn('primary', 'I’ll do it', 'ESC.take(\'' + id + '\')')
      + (o && o !== meKey() ? btn('ghost', 'Leave with ' + esc(first(o)), 'ESC.leave(\'' + id + '\')') : '')
      + btn('ghost', 'Close ▾', 'ESC.closeMenu(\'' + id + '\')', 'escCl_' + id)
      + btn('ghost', '⋯', 'ESC.more(\'' + id + '\')', 'escMo_' + id)
      + '</div>';
    if (opened && typeof W.myWorkCard === 'function') h += '<div style="margin-top:8px;cursor:default;" onclick="event.stopPropagation();">' + W.myWorkCard(it, -1) + '</div>';
    else h += '<div class="field-note" style="margin-top:4px;">Tap to see everything</div>';
    return h + '</div>';
  }

  function render(wrap, rows, narrow, now) {
    if (!wrap) return;
    const me = meKey();
    let h = narrow || '';
    const taken = [...S.taken].map(item).filter((x) => x && x.status === 'open' && lc(x.owner) === me);
    if (taken.length && typeof W.myWorkCard === 'function')
      h += '<div style="margin:6px 0 4px;font-size:12.5px;font-weight:700;letter-spacing:.06em;color:var(--teal,#2f8f8a);">YOURS NOW · ' + taken.length + '</div>'
        + taken.map((x) => W.myWorkCard(x, -1)).join('');
    const G = groups(rows, now);
    if (!G.length && !taken.length) { wrap.innerHTML = h + '<div class="card" style="padding:22px;text-align:center;">Nothing has been escalated to you. Good.</div>'; return; }
    for (const g of G) {
      const o = g.owner, nm = o ? first(o) : 'Nobody', all = S.all.has(o || '-') || !o;   /* nobody's cards: there is nobody to leave them with, so all are listed */
      const kinds = Object.entries(g.kinds).sort((a, c) => c[1] - a[1]).map(([k, n]) => n + ' ' + kindWord(k, n)).join(', ');
      const late = g.list.filter((x) => (daysLate(x, now) || 0) >= 1).length;
      h += '<div class="card" style="padding:14px 16px;margin:10px 0 4px;">'
        + '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;"><b style="font-size:15px;">' + esc(nm) + '</b>'
        + '<span>· ' + g.list.length + (late === g.list.length ? ' late card' : ' card') + (g.list.length === 1 ? '' : 's') + '</span>'
        + '<span class="field-note">(' + esc(kinds) + (g.oldest ? '; oldest due ' + esc(shortDay(g.oldest)) : '') + ')</span></div>'
        + '<div class="field-note" style="margin-top:4px;">' + (!o ? 'Nobody has these yet.' : all ? 'Showing all ' + g.list.length + '.'
          : g.top.length ? 'One by one below: the ' + g.top.length + ' about a client’s care at risk or a promise to a family.'
          : 'None of these is about a client’s care at risk or a promise to a family.') + '</div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">'
        + (o && o !== me && g.rest.length && !all ? btn('primary', 'Leave the other ' + g.rest.length + ' with ' + esc(nm), 'ESC.leaveRest(\'' + esc(o) + '\')') : '')
        + (o && g.rest.length ? btn('ghost', all ? 'Show fewer' : 'Show all ' + g.list.length, 'ESC.showAll(\'' + esc(o || '-') + '\')') : '')
        + '</div></div>'
        + (all ? g.list : g.top).map((x) => line(x, now)).join('');
    }
    wrap.innerHTML = h;
  }

  const redraw = () => { try { if (typeof W.myWorkRefresh === 'function') W.myWorkRefresh(); else if (typeof W.renderMyWork === 'function') W.renderMyWork(); } catch (_) {} };
  const log = (x, t) => { try { if (typeof W.opsLog === 'function') W.opsLog(x, t); } catch (_) {} };
  const ev = (k, o) => { try { if (typeof W.opEvent === 'function') W.opEvent(k, o); } catch (_) {} };
  const save = async (x) => { if (typeof W.persist === 'function') return W.persist('ops_items', x); };

  function toggle(id) { if (S.open.has(id)) S.open.delete(id); else S.open.add(id); redraw(); }
  function showAll(o) { if (S.all.has(o)) S.all.delete(o); else S.all.add(o); redraw(); }
  async function take(id) {
    const it = item(id); if (!it) return;
    S.taken.add(id);
    if (W.TA && it.owner && lc(it.owner) !== meKey()) return W.TA.transfer(id, 'escAct_' + id);   /* asks why, like Take it... */
    if (typeof W.opsTakeIt === 'function') await W.opsTakeIt(id);
    redraw();
  }
  /* it stays theirs, off my list; work-route does not escalate it again for escalated_leave_days */
  function markLeft(x, at) {
    const o = lc(x.owner), days = leaveDays();
    x.left_with_owner = { owner: o, by: meKey(), by_name: ME_().name || meKey(), at, until: new Date(Date.parse(at) + days * 864e5).toISOString() };
    if (x.escalation && !x.escalation.cleared_at) { x.escalation.cleared_at = at; x.escalation.cleared_why = 'left with ' + first(o); }
    log(x, (ME_().name || 'Leadership') + ' left this with ' + first(o) + ': it stays ' + first(o) + '’s (not escalated again for ' + days + ' days)');
  }
  async function leave(id) {
    const it = item(id); if (!it || !it.owner) return;
    const at = new Date().toISOString();
    markLeft(it, at);
    ev('item_left_with_owner', { item: it, summary: (it.about || it.title || '') + ': left with ' + first(it.owner) });
    await save(it);
    try { if (W.ccToast) W.ccToast('Left with ' + first(it.owner) + '. It stays on ' + first(it.owner) + '’s list.'); } catch (_) {}
    redraw();
  }
  async function leaveRest(o) {
    o = lc(o);
    const rows = (typeof W.myWorkRows === 'function' ? W.myWorkRows() : []).filter((x) => lc(x.owner) === o && !front(x));
    if (!rows.length) return;
    const ok = typeof W.ccConfirm === 'function' ? await W.ccConfirm('Leave these ' + rows.length + ' with ' + first(o) + '?\n\nThey stay ' + first(o) + '’s and leave your Escalated to you list. None is closed, and nothing is sent to anyone. They are not escalated to you again for ' + leaveDays() + ' days.') : true;
    if (!ok) return;
    const at = new Date().toISOString();
    for (const x of rows) { markLeft(x, at); await save(x); }
    ev('items_left_with_owner', { summary: rows.length + ' late card(s) left with ' + first(o) });
    try { if (W.ccToast) W.ccToast(rows.length + ' left with ' + first(o)); } catch (_) {}
    redraw();
  }
  function pop(anchor, rowsHtml, onPick) {
    if (typeof W.ccPopOpen !== 'function') return;
    const el = W.ccPopOpen(document.getElementById(anchor) || document.body, rowsHtml, { width: 260 });
    el.querySelectorAll('.ccpick-row').forEach((r) => {
      r.onmouseenter = () => r.style.background = 'var(--bg)'; r.onmouseleave = () => r.style.background = '';
      r.onclick = () => { if (W.ccPopClose) W.ccPopClose(); onPick(r.dataset.what); };
    });
  }
  const opt = (what, label) => '<div class="ccpick-row" data-what="' + what + '" style="padding:8px;border-radius:8px;cursor:pointer;font-size:13.5px;">' + label + '</div>';
  function closeMenu(id) {
    pop('escCl_' + id, opt('already_handled', 'Done elsewhere') + opt('stale', 'No longer needed'),
      async (what) => { if (typeof W.opsTriage === 'function') await W.opsTriage(id, what); redraw(); });
  }
  function more(id) {
    const it = item(id); if (!it) return;
    const o = lc(it.owner), mine = o === meKey();
    let h = '';
    if (!mine && o && W.TA) h += opt('help', 'Help with this (it stays ' + esc(first(o)) + '’s)');
    h += opt('waiting', 'Waiting on someone… (with a date)');
    if (W.suTalk) h += opt('talk', W.suTalk.forWork && W.suTalk.forWork(id) ? 'Don’t need to talk about it' : 'Talk about it at the meeting');
    if (typeof W.dkAllowed === 'function' && W.dkAllowed() && typeof W.dkJotWork === 'function') h += opt('jot', 'Jot on my desk');
    pop('escMo_' + id, h, (what) => {
      if (what === 'help') return W.TA.helpWith(id);
      if (what === 'waiting') return W.opsWaitOpen && W.opsWaitOpen(id, 'escMo_' + id);
      if (what === 'talk') return W.myWorkTalk && W.myWorkTalk(id, null);
      if (what === 'jot') return W.dkJotWork(id, document.getElementById('escMo_' + id));
    });
  }

  /* Settings > Escalated to you, made simple (owners only) */
  function settingsFill() {
    const now = document.getElementById('escSetNow'), b = document.getElementById('escToggleBtn');
    if (now) now.innerHTML = (on() ? '<b style="color:#1E8449;">On.</b> Escalated to you is grouped by person, one line per card, three buttons.'
      : '<b style="color:#B7791F;">Off.</b> Escalated to you is as before.') + (owner() ? '' : ' Only Samantha or Zachary can change this.');
    if (b) { b.textContent = on() ? 'Turn off the simpler Escalated to you' : 'Turn on the simpler Escalated to you'; b.style.display = owner() ? '' : 'none'; }
  }
  async function settingsToggle(btnEl) {
    if (!owner()) { alert('Only Samantha or Zachary can change this.'); return; }
    const want = !on();
    const ok = typeof W.ccConfirm === 'function' ? await W.ccConfirm(want
      ? 'Turn on the simpler Escalated to you?\n\n· grouped by person, with how many and the oldest\n· only cards about a client’s care at risk or a promise to a family are listed one by one\n· each card is one line: I’ll do it, Leave with (it stays theirs and is not escalated again for ' + leaveDays() + ' days), Close\n· the ⋯ menu has four choices\n\nNothing is sent to anyone.'
      : 'Turn off the simpler Escalated to you? It goes back to how it was. Cards you left with someone stay theirs.') : true;
    if (!ok) return;
    if (btnEl) btnEl.disabled = true;
    const out = typeof W.tkMerge === 'function' ? await W.tkMerge((m) => { m[KEY] = want; if (want && !m[KEY + '_since']) m[KEY + '_since'] = new Date().toISOString(); return ['simpler Escalated to you ' + (want ? 'ON' : 'OFF')]; }, 'simpler Escalated to you') : { error: { message: 'saving is not available here' } };
    if (btnEl) btnEl.disabled = false;
    const sv = document.getElementById('escSaved'); if (sv) sv.textContent = out && out.error ? 'Could not save: ' + out.error.message : (want ? 'On.' : 'Off.');
    settingsFill(); redraw();
  }

  W.ESC = { on, front, daysLate, groups, line, render, toggle, showAll, take, leave, leaveRest, markLeft, closeMenu, more, settingsFill, settingsToggle, leaveDays, state: S, KEY };
})(window);
