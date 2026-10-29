/* THE SIMPLE CASE CARD (Samantha 2026-10-24: "This is all confusing and doesnt seem to work well together"; approved mockup
   PtLEzsAjvGybxXsTtXk926, artboard Simplified). One open shift, top to bottom:
     1. one line saying what Cara is doing (asking, waiting for you, stopped), with Stop Cara or Let Cara run it
     2. three actions: Ask everyone now, Follow up, Add a bonus (last-minute.js)
     3. who answered: only Yes / Part of the shift / Question (cara-board.js, compact)
     4. ONE list in three groups from the server (coverage-run ask_list): Ready to ask (ticks + "Text the ticked"),
        Your call (Ask anyway; a care review opens the review), Do not ask (folded, counts by reason)
     5. everything else folded under "More for this shift" (the old card's own section, unchanged)
   Every count comes from the same two reads (the case's asks and ask_list), so they agree.
   Switch ops_settings.simple_card_live: off, the office keeps today's card; owners can try it in their own browser. */
(function () {
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = () => (typeof DATA !== 'undefined' && DATA.ops_settings) || {};
  const owner = () => { try { return typeof ccCan === 'function' && ccCan('manage_settings'); } catch (e) { return false; } };
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
  const live = () => st().simple_card_live === true;
  const preview = () => owner() && ls.get('simple_card_preview') === '1';
  function on(c) { return !!c && c.status === 'open' && String(c.kind) !== 'interest' && c.open_hours !== true && (live() || preview()); }
  async function call(body) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session || !session.access_token) throw new Error('Sign in to the hub first.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/coverage-run', { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const out = await r.json().catch(() => null);
    if (!r.ok || !out || out.error) throw new Error((out && out.error) || ('The engine answered ' + r.status));
    return out;
  }
  const ST = {};   // per case: { key, list, run, err, loading, tick: Set, showMore, showDont }
  const keyOf = (c) => (c.asked || []).map((a) => [a.id, a.state].join('|')).join(',') + '|' + (c.bonus && c.bonus.amount || '') + '|' + c.shift_time;
  function rerender() { try { if (typeof renderCoverage === 'function') renderCoverage(); } catch (e) {} }
  const timers = {};
  async function load(id) {
    const c = (DATA.coverage_cases || []).find((x) => x && x.id === id); if (!c) return;
    const prev = ST[id] || {};
    ST[id] = Object.assign({}, prev, { key: keyOf(c), loading: !prev.list });
    try {
      const [list, run] = await Promise.all([call({ action: 'ask_list', case_id: id }), call({ action: 'cara_run_get', case_id: id }).catch(() => null)]);
      ST[id] = Object.assign({}, ST[id], { list, run, err: null, loading: false, at: Date.now() });
    } catch (e) { ST[id] = Object.assign({}, ST[id], { err: String(e.message || e), loading: false }); }
    rerender();
    clearTimeout(timers[id]);
    timers[id] = setTimeout(() => { if (document.getElementById('sc_' + id)) load(id); }, 60000);   /* keeps up with Cara's waves */
  }
  const clock = (iso) => { try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase(); } catch (e) { return ''; } };
  /* a date AxisCare wrote as 2026-10-24T07:45:00-05:00 reads "Oct 24" */
  const tidy = (s) => String(s || '').replace(/(\d{4})-(\d\d)-(\d\d)(T[\d:.+-]+)?/g, (m, y, mo, d) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(mo) - 1] + ' ' + Number(d))
    .replace(/\.\s*no availability on file \(Unknown\)/i, ' · availability not on file').replace(/^worked a shift in the last 14 days/i, 'Worked in the last 2 weeks').replace(/^active caregiver, no recent history/i, 'Active, no recent history');
  const texted = (a) => a && (a.auto === true || a.picked_by_coordinator === true);
  const btn = (txt, on, kind) => '<button type="button" onclick="' + on + '" style="font:inherit;font-weight:600;font-size:13px;border-radius:8px;padding:8px 14px;cursor:pointer;'
    + (kind === 'red' ? 'background:#B42318;color:#fff;border:0;' : kind === 'navy' ? 'background:#0E3860;color:#fff;border:0;' : 'background:#fff;color:#0E3860;border:1px solid #C9D5E3;') + '">' + txt + '</button>';

  function statusHtml(c, s) {
    const A = c.asked || [], tx = A.filter(texted), wait = A.filter((a) => a.state === 'waiting').length, no = A.filter((a) => a.state === 'no').length, yes = A.filter((a) => a.state === 'yes').length;
    const r = s.run && s.run.run, id = E(c.id);
    const status = !r ? '<b style="color:#344054;">Cara is not running this shift</b>'
      : r.status === 'running' ? '<b style="color:#12605C;">Cara is asking</b>' + (s.run.rules ? ' · ' + E(s.run.rules.size) + ' at a time, every ' + E(s.run.rules.gap) + ' minutes, until someone says yes' + (s.run.rules.urgent ? ' or the shift ends' : '') : '')
      : r.status === 'paused' ? '<b style="color:#8A5300;">Cara is waiting for you</b> · ' + E(r.paused_name || 'someone') + ' said yes to the whole shift. Confirm them below, or tap "Not this one" in their answer.'
      : r.status === 'needs_office' ? '<b style="color:#B42318;">Cara stopped</b> · ' + E(r.needs || 'over to the office')
      : r.status === 'stopped' ? '<b style="color:#344054;">Taken back from Cara</b>' : '<b style="color:#1D6B43;">Cara is finished</b>';
    const ctl = !r || r.status === 'stopped' || r.status === 'needs_office' ? (window.CRUN ? btn(r ? 'Let Cara keep asking' : 'Let Cara run it', 'CRUN.start(\'' + id + '\')', '') : '')
      : (r.status === 'running' || r.status === 'paused') && window.CRUN ? btn('Stop Cara', 'CRUN.stop(\'' + id + '\')', '') : '';
    const chip = (t, color) => '<span style="background:#fff;border-radius:8px;padding:4px 10px;font-weight:600;font-size:13px;' + (color ? 'color:' + color + ';' : '') + '">' + t + '</span>';
    /* her top priority (2026-10-25): AxisCare's schedule could not be read = nobody is texted; say so first */
    const held = s.list && s.list.meta && s.list.meta.schedule && s.list.meta.schedule.held;
    return (held ? '<div role="alert" style="margin-top:10px;background:#FDECEA;color:#B42318;border-radius:10px;padding:10px 14px;font-weight:600;">' + E(held) + '. Nobody is texted until it can be checked, so nobody gets offered a shift that clashes with one they already have. Try again in a minute, or call people.</div>' : '')
      + '<div style="background:#E6F4F3;border-radius:12px;padding:12px 14px;margin-top:10px;display:flex;flex-direction:column;gap:8px;">'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;justify-content:space-between;"><div style="font-size:14.5px;min-width:0;">' + status + '</div>' + ctl + '</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px;">' + chip(tx.length + ' texted') + chip(wait + ' waiting') + chip(no + ' said no') + (yes ? chip(yes + ' said yes', '#1D6B43') : chip('Nobody has said yes yet', '#8A4416'))
      + (r && r.status === 'running' && r.next_wave_at && Date.parse(r.next_wave_at) > Date.now() ? chip('Next wave at ' + E(clock(r.next_wave_at))) : '') + '</div></div>';
  }
  function actionsHtml(c, s) {
    const id = E(c.id), notAsked = (s.list.ready || []).filter((x) => !x.contacted).length, tx = (c.asked || []).filter((a) => texted(a) && a.state !== 'yes').length;
    const b = c.bonus && Number(c.bonus.amount) > 0 ? Math.round(Number(c.bonus.amount)) : 0;
    return '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">'
      + (notAsked && window.LM ? btn('Ask everyone now (' + notAsked + ' not asked yet)', 'LM.everyone(\'' + id + '\')', 'red') : '')
      + (tx && window.LM ? btn('Follow up with the ' + tx + ' texted', 'LM.followUp(\'' + id + '\')', '') : '')
      + (window.LM ? btn(b ? '$' + b + ' bonus (change)' : 'Add a bonus', 'LM.bonus(\'' + id + '\')', '') : '') + '</div>';
  }
  function statusOf(x) {
    const k = x.contacted; if (!k) return '';
    if (k.interested_on_page) return '<span style="color:#1D6B43;font-weight:700;">Interested (from their PRN page)</span>';   // PRN step 5b
    if (k.state === 'yes') return '<span style="color:#1D6B43;font-weight:700;">said yes</span>';
    if (k.state === 'no') return '<span style="color:#B42318;">' + (k.by_text ? 'Texted ' + E(clock(k.at)) + ' · ' : '') + 'said no</span>';
    if (k.state === 'inquiry') return '<span style="color:#8A5300;">asked a question</span>';
    return (k.by_text ? 'Texted ' + E(clock(k.at)) + ' · ' : 'Asked · ') + '<b>waiting</b>';
  }
  const td = (h, extra) => '<td style="padding:8px 8px;' + (extra || '') + '">' + h + '</td>';
  function readyHtml(c, s) {
    const id = E(c.id), R = s.list.ready || [], done = R.filter((x) => x.contacted), next = R.filter((x) => !x.contacted);
    s.tick = s.tick || new Set(next.slice(0, 3).map((x) => x.name));
    const shown = s.showMore ? next : next.slice(0, 5), rest = next.length - shown.length;
    const label = (x) => (x.label ? '<span style="font-size:11.5px;font-weight:700;color:#1D6B43;background:#E8F5EE;border-radius:6px;padding:1px 7px;margin-left:6px;">' + E(x.label) + '</span>' : '');
    const rows = done.map((x) => '<tr style="border-top:1px solid #EEF2F6;">' + td('') + td('<b>' + E(x.name) + '</b>' + label(x)) + td(E(tidy(x.why)), 'color:#33475B;font-size:13px;') + td(statusOf(x), 'font-size:13px;') + '</tr>').join('')
      + shown.map((x, i) => '<tr style="border-top:' + (i === 0 && done.length ? '2px solid #CFE8DA' : '1px solid #EEF2F6') + ';background:#FBFDFC;">'
        + td('<input type="checkbox" aria-label="Tick ' + E(x.name) + '"' + (s.tick.has(x.name) ? ' checked' : '') + ' onchange="SC.tick(\'' + id + '\',' + E(JSON.stringify(x.name)).replace(/"/g, '&quot;') + ',this.checked)">', 'width:30px;')
        + td('<b>' + E(x.name) + '</b>' + label(x)) + td(E(tidy(x.why)), 'color:#33475B;font-size:13px;') + td('<span style="color:#5D6B7C;">' + (i < 3 ? 'Next in line' : 'Not asked yet') + '</span>', 'font-size:13px;') + '</tr>').join('')
      + (rest > 0 ? '<tr style="border-top:1px solid #EEF2F6;"><td colspan="4" style="padding:8px 8px;color:#5D6B7C;font-size:13px;">and ' + rest + ' more not asked yet <a href="javascript:void(0)" onclick="SC.more(\'' + id + '\')">Show them</a></td></tr>' : '');
    const n = [...s.tick].filter((nm) => next.some((x) => x.name === nm)).length;
    return '<section style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;margin-top:12px;">'
      + '<div style="padding:10px 14px;background:#E8F5EE;display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;justify-content:space-between;"><div><b style="color:#1D6B43;font-size:15px;">Ready to ask · ' + R.length + '</b> <span style="color:#2F5D44;font-size:12.5px;">Cara asks these in this order. Tick anyone to text them now.</span></div>'
      + (n ? btn('Text the ' + n + ' ticked', 'SC.send(\'' + id + '\')', 'navy') : next.length ? '<span style="color:#5D6B7C;font-size:12.5px;">Tick people to text them now</span>' : '') + '</div>'
      + '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;min-width:620px;font-size:13.5px;"><tbody>' + (rows || '<tr><td style="padding:9px 14px;color:#5D6B7C;">Nobody meets every requirement for this shift.</td></tr>') + '</tbody></table></div>'
      + (R.length && R.every((x) => /no availability on file/.test(x.why || '')) ? '<div style="padding:6px 14px 10px;color:#5D6B7C;font-size:12.5px;">None of these have told us their availability yet, so Cara asks them all as "Unknown".</div>' : '')
      + '</section>';
  }
  function callHtml(c, s) {
    const V = s.list.review || []; if (!V.length) return '';
    const id = E(c.id);
    const rows = V.map((x) => {
      const act = x.approval ? '<span style="color:#1D6B43;font-weight:600;">Approved for this shift by ' + E(x.approval.by) + '</span>'
        : x.contacted ? statusOf(x)
        : x.kind === 'care' ? btn('Review', 'SC.review(\'' + id + '\',\'' + E(x.axiscare_id || x.name) + '\')', '')
        : btn('Ask anyway', 'SC.anyway(\'' + id + '\',' + E(JSON.stringify(x.name)).replace(/"/g, '&quot;') + ')', '');
      return '<tr style="border-top:1px solid #EEF2F6;">' + td('<b>' + E(x.name) + '</b>', 'width:200px;') + td(E(tidy(x.why)) + (x.kind === 'care' && x.blocking && x.blocking.length ? '. In the way: <b>' + E(x.blocking.map((t) => t.label).join(', ')) + '</b>' : ''), 'color:#33475B;font-size:13px;') + td(act, 'font-size:13px;') + '</tr>';
    }).join('');
    return '<section style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;margin-top:12px;">'
      + '<div style="padding:10px 14px;background:#FFF3DC;"><b style="color:#8A5300;font-size:15px;">Your call · ' + V.length + '</b> <span style="color:#6B4A12;font-size:12.5px;">Cara won\'t text these by herself. You can.</span></div>'
      + '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;min-width:620px;font-size:13.5px;"><tbody>' + rows + '</tbody></table></div></section>';
  }
  function dontHtml(c, s) {
    const D = s.list.dont || [], id = E(c.id);
    if (!D.length && !s.list.hidden) return '';
    const by = {}; D.forEach((x) => { by[x.label] = (by[x.label] || 0) + 1; });
    return '<section style="border:1px solid #E2E8F0;border-radius:12px;padding:10px 14px;margin-top:12px;background:#F7F8FA;">'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline;justify-content:space-between;"><div><b style="color:#344054;font-size:15px;">Do not ask · ' + D.length + '</b></div>'
      + (D.length ? '<a href="javascript:void(0)" onclick="SC.dont(\'' + id + '\')" style="font-weight:600;font-size:13px;">' + (s.showDont ? 'Hide' : 'Show the ' + D.length) + '</a>' : '') + '</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">' + Object.keys(by).map((k) => '<span style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:3px 9px;font-size:12.5px;">' + E(k) + ' · ' + by[k] + '</span>').join('') + '</div>'
      + (s.showDont ? '<div style="margin-top:8px;">' + D.map((x) => '<div style="font-size:13px;padding:4px 0;border-top:1px solid #EEF2F6;"><b>' + E(x.name) + '</b> <span style="color:#5D6B7C;">' + E(tidy(x.why)) + '</span></div>').join('') + '</div>' : '')
      + (s.list.hidden ? '<div style="color:#5D6B7C;font-size:12px;margin-top:6px;">Not counted: ' + s.list.hidden + ' inactive in AxisCare, office staff or retired records.</div>' : '')
      + '</section>';
  }
  /* the open shift's body, in place of today's (the old card's "More for this shift" is kept, folded, at the bottom) */
  function body(c, parts) {
    const id = c.id; let s = ST[id];
    if (!s || (s.key !== keyOf(c) && !s.loading)) { setTimeout(() => load(id), 0); s = ST[id] = Object.assign({}, s || {}, { key: keyOf(c), loading: !(s && s.list) }); }
    let h = '<div id="sc_' + E(id) + '">';
    if (preview() && !live()) h += '<div style="margin-top:8px;font-size:12.5px;background:#FFF4E3;border-radius:8px;padding:6px 10px;">The simple card, only in your browser (the office still sees today\'s card). <a href="javascript:void(0)" onclick="SC.preview(false)">Back to today\'s card</a></div>';
    if (s.err && !s.list) h += '<div style="margin-top:10px;color:var(--red);font-size:13px;">' + E(s.err) + ' <a href="javascript:void(0)" onclick="SC.load(\'' + E(id) + '\')">Try again</a></div>';
    else if (!s.list) h += '<div class="field-note" style="margin-top:10px;">Getting everyone for this shift…</div>';
    else h += statusHtml(c, s) + actionsHtml(c, s) + (parts.cip || '') + (window.CB ? CB.html(c, { compact: true }) : '') + readyHtml(c, s) + callHtml(c, s) + dontHtml(c, s);
    return h + '<div id="covFollow_' + E(id) + '"></div>' + (parts.more || '') + '</div>';
  }
  function tick(id, name, onOff) { const s = ST[id]; if (!s) return; s.tick = s.tick || new Set(); onOff ? s.tick.add(name) : s.tick.delete(name); rerender(); }
  function more(id) { if (ST[id]) ST[id].showMore = true; rerender(); }
  function dont(id) { if (ST[id]) ST[id].showDont = !ST[id].showDont; rerender(); }
  async function send(id) {
    const s = ST[id]; if (!s || !s.list) return;
    const names = [...(s.tick || [])].filter((nm) => (s.list.ready || []).some((x) => x.name === nm && !x.contacted));
    if (!names.length) { alert('Nobody is ticked.'); return; }
    if (typeof ccConfirm === 'function' && !(await ccConfirm('Text ' + names.length + ' caregiver' + (names.length === 1 ? '' : 's') + ' about this shift now?\n\n' + names.join(', ')))) return;
    try { const r = await call({ action: 'send_selected', case_id: id, recipients: names }); s.tick = new Set();
      alert('Sent to ' + (r.sent || []).length + '.' + ((r.failed || []).length ? '\n\nNot sent: ' + r.failed.join('; ') : ''));
      try { if (typeof loadFromSupabase === 'function') await loadFromSupabase(); } catch (e) {} load(id); }
    catch (e) { alert('Could not send: ' + (e.message || e)); }
  }
  async function anyway(id, name) {
    if (typeof ccConfirm === 'function' && !(await ccConfirm('Text ' + name + ' about this shift anyway? Their reason is on the list; you know things the data doesn\'t.'))) return;
    try { const r = await call({ action: 'send_selected', case_id: id, recipients: [name] }); alert((r.sent || []).length ? 'Sent to ' + name + '.' : 'Not sent: ' + ((r.failed || []).concat(r.refused_not_eligible || []).join('; ') || 'not on the list'));
      try { if (typeof loadFromSupabase === 'function') await loadFromSupabase(); } catch (e) {} load(id); }
    catch (e) { alert('Could not send: ' + (e.message || e)); }
  }
  async function review(id, key) { if (!window.AL) return; await AL.show(id); AL.review(key); }
  function setPreview(v) { ls.set('simple_card_preview', v ? '1' : null); rerender(); }
  /* owners, switch off: a way into the preview on today's card */
  function previewLink(c) {
    if (live() || !owner() || preview() || !c || c.status !== 'open' || String(c.kind) === 'interest') return '';
    return '<div style="margin-top:8px;"><a href="javascript:void(0)" onclick="SC.preview(true)" style="font-size:12.5px;font-weight:700;">Try the simple card (only you, only this browser) &rarr;</a></div>';
  }
  window.SC = { on, body, load, tick, more, dont, send, anyway, review, preview: setPreview, previewLink, tidy };
})();
