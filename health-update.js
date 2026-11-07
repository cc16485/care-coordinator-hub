/* =============================================================================
   health-update.js · window.HU · health news from calls, reviewed and sent to AxisCare (2026-11-07, Part 2 step 2)
   =============================================================================
   Samantha's "Straight to AxisCare" (2026-11-07): current clients have no care plan in the Hub, so a health card from a call
   (kind health_news, made by call-tasks) is reviewed here and sent straight to the client's tasks in AxisCare.
   Her ask the same day: the news goes into the "Awareness of Diagnosis / Injury" task, dated, so caregivers read it and check
   it off every shift. So the card always offers that task first: the dated news on top of what the task already says (or the
   task added on every day when the client doesn't have it yet). Each care task change the reader found comes next, with the
   six parts and "Ask before approving" where nothing was said.
   Rules: care coordinators and owners approve, one change at a time; nothing goes to AxisCare until someone approves it and
   taps Send (careplan-tasks health_send); an update keeps the days AxisCare has; nothing is ever removed; every send is read
   back and the result kept on the card.
   ============================================================================= */
(function () {
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = () => (typeof DATA !== 'undefined' && DATA) || {};
  const myEmail = () => String((typeof ME !== 'undefined' && ME && ME.email) || '').toLowerCase();
  const me = () => (typeof ME !== 'undefined' && ME && (ME.name || ME.email)) || '';
  const roles = () => (typeof ccRolesFor === 'function' ? ccRolesFor(myEmail()) : []);
  const isOwner = () => (typeof ccIsOwner === 'function' ? ccIsOwner(myEmail()) : false);
  const canApprove = () => isOwner() || roles().indexOf('care_coordinator') > -1 || roles().indexOf('owner_admin') > -1;
  const now = () => new Date().toISOString();
  const KIND = 'health_news';
  const AWARE_I = 100;
  /* her two tasks (2026-11-07): "Read First: Health Update" gets the health news; "Read First: Home and Family Update" is for
     the house, the people, pets and routines (a later step). Owners rename them in Settings > Home visit
     (ops_settings.health_task_names), so nothing here holds the name for good. */
  const NAMES_DEFAULT = { health: 'Read First: Health Update', home: 'Read First: Home and Family Update' };
  const names = () => Object.assign({}, NAMES_DEFAULT, ((D().ops_settings || {}).health_task_names) || {});
  const AWARE_NAME = NAMES_DEFAULT.health;
  const healthName = () => String(names().health || AWARE_NAME).trim();
  const isAware = (name) => String(name || '').trim().toLowerCase() === healthName().toLowerCase();
  const MAX = 2000;
  const DAYS = [['N', 'Sun'], ['M', 'Mon'], ['T', 'Tue'], ['W', 'Wed'], ['R', 'Thu'], ['F', 'Fri'], ['S', 'Sat']];
  const PARTS = [['when', 'When'], ['how', 'How to help'], ['equipment', 'Equipment and supplies'], ['preferences', 'Their preferences'], ['safety', 'Safety'], ['report_if', 'Report to the office if']];
  const KIND_W = { diagnosis: 'Diagnosis', injury: 'Injury', fall: 'Fall', hospital_or_rehab: 'Hospital or rehab', home_again: 'Home again', hospice: 'Hospice', equipment: 'Equipment',
    help_needed: 'Help needed', medicines: 'Medicines', thinking_or_mood: 'Thinking or mood', eating_drinking: 'Eating and drinking', eating_or_drinking: 'Eating and drinking', skin: 'Skin', other: 'Other' };

  const cardOf = (id) => (D().ops_items || []).find((x) => x && x.id === id) || null;
  const day = (iso) => { const t = Date.parse(iso || ''); return isFinite(t) ? new Date(t).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric' }) : ''; };
  async function save(it) { it.last_activity_at = now(); try { await persist('ops_items', it); } catch (e) {} }
  function log(it, text) { (it.history = it.history || []).push({ at: now(), by: me(), text }); }

  /* the dated lines caregivers read on the Awareness task */
  function awarenessBlock(it) {
    const h = it.health || {}, who = String(it.who || '').trim();
    return 'HEALTH UPDATE ' + day((it.source || {}).call_at || it.created_at) + (who ? ' (call with ' + who + ')' : '') + ':\n'
      + (h.news || []).map((n) => '- ' + (KIND_W[n.kind] || 'Other') + ': ' + String(n.what || '').trim() + (n.when ? ' (' + n.when + ')' : '')).join('\n');
  }
  /* a change's six parts as task instructions, the same layout the care plan uses */
  function partsText(c) {
    return PARTS.map(([k, l]) => {
      const x = c[k];
      if (k === 'how') { const st = ((x && x.steps) || []).filter(Boolean); return st.length ? l.toUpperCase() + ':\n' + st.map((s, i) => (i + 1) + '. ' + s).join('\n') : ''; }
      return x && x.text ? l.toUpperCase() + ': ' + x.text : '';
    }).filter(Boolean).join('\n');
  }
  const asks = (c) => PARTS.filter(([k]) => c[k] && c[k].ask).map(([, l]) => l);

  /* ---------- the skill check (her "Yes, all five" 2026-11-07, decisions B, C and D) ----------
     When the news is about equipment or how much help is needed, each caregiver on the next 3 days of shifts is checked
     against their skills record in the Hub. A warning on the card only (B): it never blocks or changes the schedule.
     Both kinds of record show, and say which (C): "seen by the office" (evidence observed) or "they say they have it".
     Max assist is not a skill of its own (her change 2026-11-07, replacing decision D): it needs one of the Level 3 skills,
     bed-bound care or the Hoyer lift (sit-to-stand included). More than one person to move is her rule: a lift before we staff. */
  const NEEDS = [
    [/sit.?to.?stand/i, 'hoyer_lift', 'Sit-to-stand lift'],
    [/hoyer|mechanical lift|sling lift|full.?body sling/i, 'hoyer_lift', 'Hoyer or mechanical lift'],
    [/bed.?bound|bedridden|stays? in bed/i, 'bedbound_care', 'Bed-bound care'],
    [/hospice/i, 'hospice_support', 'Hospice support'],
    [/dementia|alzheimer|confus|memory loss/i, 'dementia_care', 'Dementia care'],
    [/max(imum)?\s*assist|full assist|total assist/i, ['bedbound_care', 'hoyer_lift'], 'Level 3: bed-bound care, Hoyer or sit-to-stand'],
    [/transfer|gait belt|stand.?pivot|help (him|her|them) (stand|up)/i, 'transfers_gait_belt', 'Transfers with a gait belt'],
  ];
  const TWO = /two (people|persons?)|2.?person|more than one person/i;
  function needsOf(it) {
    const h = it.health || {}, text = [(h.news || []).map((n) => n.kind + ' ' + n.what).join(' \n '),
      (h.changes || []).filter((c) => !c.awareness).map((c) => c.task + ' ' + PARTS.map(([k]) => k === 'how' ? ((c[k] || {}).steps || []).join(' ') : (c[k] || {}).text || '').join(' ')).join(' \n ')].join(' \n ');
    const out = [];
    NEEDS.forEach(([rx, key, label]) => { if (rx.test(text) && !out.some((x) => x.label === label)) out.push({ key, label }); });
    return { skills: out, two: TWO.test(text) };
  }
  const cgOf = (axId) => (D().caregivers || []).find((g) => g && String(g.axiscare_id || '') === String(axId)) || null;
  function standing(g, key) {
    if (Array.isArray(key)) {   /* any one of them will do: the best record wins */
      const all = key.map((k) => standing(g, k)), rank = (x) => (x.ok ? (x.seen ? 3 : 2) : x.word === 'said no' ? 0 : 1);
      return all.sort((a, b) => rank(b) - rank(a))[0];
    }
    if (!g) return { ok: false, word: 'not in the Hub' };
    if (key === 'dementia_care' && g.alz_date) return { ok: true, seen: true, word: 'dementia training on file' };
    const e = (g.skills || {})[key];
    if (!e || !e.have) return { ok: false, word: 'not recorded' };
    if (e.have === 'no') return { ok: false, word: 'said no' };
    const which = { bedbound_care: 'bed-bound care', hoyer_lift: 'Hoyer lift' }[key] || '';
    return e.evidence === 'observed' ? { ok: true, seen: true, word: 'seen by the office', which } : { ok: true, seen: false, word: 'they say they have it', which };
  }
  const when = (iso) => { const t = Date.parse(iso || ''); return isFinite(t) ? new Date(t).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''; };
  function skillsHtml(it) {
    const need = needsOf(it);
    if (!need.skills.length && !need.two) return '';
    let h = '<div class="hu-card"><h2>Can the next caregivers do this?</h2>'
      + '<div class="hu-src">The news needs: ' + E(need.skills.map((x) => x.label).join(', ') || 'see below') + '. Checked against each caregiver\'s skills in the Hub. A warning only; nothing changes the schedule.</div>';
    if (need.two) h += '<div class="hu-bad">The news says more than one person to move. Our rule: we never do two-person transfers, so this client needs a lift before we staff.</div>';
    if (!S.tasks && !S.err) return h + '<div class="hu-src" style="margin-top:8px">Reading the schedule from AxisCare...</div></div>';
    if (S.upcoming == null) return h + '<div class="hu-bad">' + E(S.upErr || S.err || 'AxisCare\'s schedule could not be read') + '. Check who is coming up in AxisCare yourself.</div></div>';
    if (!S.upcoming.length) return h + '<div class="hu-src" style="margin-top:8px">Nobody is scheduled with ' + E(it.about || 'this client') + ' in the next ' + S.days + ' days.</div></div>';
    let gaps = 0;
    h += S.upcoming.map((u) => {
      const g = cgOf(u.caregiver_axiscare_id);
      const chips = need.skills.map((x) => { const st = standing(g, x.key); if (!st.ok) gaps++;
        return '<span class="hu-tag ' + (st.ok ? (st.seen ? 'grn' : 'amb') : 'red') + '" style="margin:2px 4px 2px 0">' + E(x.label) + ': ' + E(st.word) + (Array.isArray(x.key) && st.which ? ' (' + E(st.which) + ')' : '') + '</span>'; }).join('');
      return '<div class="hu-row" style="margin-top:10px;align-items:flex-start"><div style="min-width:200px"><b>' + E(u.caregiver_name) + '</b><div class="hu-src">next shift ' + E(when(u.next_start)) + '</div></div><div style="flex:1">' + chips + '</div></div>';
    }).join('');
    if (gaps) h += '<div class="hu-bad">Check before the shift: ' + gaps + ' skill' + (gaps === 1 ? ' is' : 's are') + ' not on record for someone scheduled. Ask them, or record it in their Skills and Willingness.</div>';
    return h + '</div>';
  }

  /* ---------- the review screen ---------- */
  const S = { id: null, msg: '', busy: '', tasks: null, catalog: null, err: '', upcoming: null, upErr: '', days: 14, textPreview: '', inHours: null };
  function css() {
    if (document.getElementById('huCss')) return;
    const s = document.createElement('style'); s.id = 'huCss';
    s.textContent = '#huRoot{position:fixed;inset:0;z-index:4100;background:#F6F8F7;overflow-y:auto;-webkit-overflow-scrolling:touch;color:#1B2A2E;font-size:15px}'
      + '#huRoot *{box-sizing:border-box}.hu-in{max-width:980px;margin:0 auto;padding:20px 16px 60px}'
      + '.hu-top{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.hu-top h1{margin:0;font-size:22px;flex:1;min-width:220px}'
      + '.hu-b{min-height:44px;padding:0 18px;border-radius:12px;border:none;background:#1F6F78;color:#fff;font:inherit;font-weight:700;cursor:pointer}.hu-b:disabled{background:#AEBBBD;cursor:not-allowed}'
      + '.hu-b2{min-height:40px;padding:0 14px;border-radius:12px;border:1.5px solid #CFCAC0;background:#fff;color:#1B2A2E;font:inherit;font-weight:600;cursor:pointer}'
      + '.hu-card{background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:14px 16px;margin-bottom:12px}.hu-card h2{margin:0 0 8px;font-size:17px}'
      + '.hu-src{color:#5C6B70;font-size:13px}.hu-q{color:#5C6B70;font-style:italic;font-size:13px}.hu-ask{display:inline-block;background:#FFF1C9;color:#5A4200;border-radius:8px;padding:1px 8px;font-size:12px;font-weight:700}'
      + '.hu-tag{display:inline-block;border-radius:8px;padding:2px 9px;font-size:12px;font-weight:700}.hu-tag.grn{background:#DDF3E6;color:#1E6B3E}.hu-tag.amb{background:#FFF1C9;color:#5A4200}.hu-tag.red{background:#FBE1DE;color:#8A2A20}.hu-tag.gry{background:#EEF1F2;color:#4A5A5E}'
      + '.hu-ta{width:100%;min-height:130px;font:inherit;font-size:14px;padding:10px;border:1.5px solid #CFCAC0;border-radius:10px}.hu-sel{min-height:40px;font:inherit;border:1.5px solid #CFCAC0;border-radius:10px;padding:0 8px;max-width:100%}'
      + '.hu-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}.hu-msg{background:#E8F4F4;border-radius:10px;padding:10px 12px;margin-bottom:12px}.hu-bad{background:#FBE1DE;color:#8A2A20;border-radius:10px;padding:8px 12px;margin-top:8px}'
      + '.hu-news li{margin-bottom:6px}.hu-part{margin:4px 0}';
    document.head.appendChild(s);
  }
  /* the Awareness change is added to the card the first time it is opened (one per card) */
  function ensureAware(it) {
    const h = it.health = it.health || {}; h.changes = h.changes || [];
    let c = h.changes.find((x) => x && x.i === AWARE_I);
    if (!c && (h.news || []).length) { c = { i: AWARE_I, task: healthName(), awareness: true, state: 'proposed' }; h.changes.unshift(c); }
    return c;
  }
  /* the text a change sends, worked out once AxisCare's side has been read; a person's edits are kept */
  function prepare(it, c) {
    if (!S.tasks || !S.catalog || c.state !== 'proposed' || (c.send && c.send.edited)) return;
    if (c.awareness) {
      const there = S.tasks.find((t) => isAware(t.name)), cat = S.catalog.find((x) => isAware(x.name));
      const block = awarenessBlock(it);
      if (there) c.send = { mode: 'update', assignment_id: there.assignment_id, name: there.name, instructions: (block + (there.instructions ? '\n\n' + there.instructions : '')).trim() };
      else if (cat) c.send = { mode: 'add', adl_id: cat.id, name: cat.name, days: DAYS.map((d) => d[0]), require: 1, when: 0, instructions: block };
      else c.send = { mode: '', name: healthName(), instructions: block, missing: true };
      return;
    }
    if (!c.send) c.send = { mode: '', name: '', instructions: partsText(c) };
  }
  function pick(it, c, val) {
    const body = partsText(c), dated = 'UPDATE ' + day((it.source || {}).call_at || it.created_at) + ':\n' + body;
    if (val.indexOf('u:') === 0) { const t = S.tasks.find((x) => String(x.assignment_id) === val.slice(2)); if (!t) return; c.send = { mode: 'update', assignment_id: t.assignment_id, name: t.name, instructions: (dated + (t.instructions ? '\n\n' + t.instructions : '')).trim() }; }
    else if (val.indexOf('a:') === 0) { const t = S.catalog.find((x) => String(x.id) === val.slice(2)); if (!t) return; c.send = { mode: 'add', adl_id: t.id, name: t.name, days: DAYS.map((d) => d[0]), require: 1, when: 0, instructions: body }; }
    else c.send = { mode: '', name: '', instructions: body };
  }
  function stateTag(c) {
    if (c.sent && c.sent.ok) return '<span class="hu-tag grn">In AxisCare ' + E(day(c.sent.at)) + '</span>';
    if (c.sent && !c.sent.ok) return '<span class="hu-tag red">Not confirmed: ' + E(c.sent.detail || 'try again') + '</span>';
    if (c.state === 'approved') return '<span class="hu-tag amb">Approved by ' + E(c.approved_by || '') + ', not sent yet</span>';
    if (c.state === 'skipped') return '<span class="hu-tag gry">Skipped' + (c.skipped_by ? ' by ' + E(c.skipped_by) : '') + '</span>';
    return '<span class="hu-tag gry">To review</span>';
  }
  /* ---------- the one button (her "one click", 2026-11-07) ---------- */
  const reachable = () => (S.upcoming || []).filter((u) => u.has_phone);
  function oneClickHtml(it, c, can) {
    const n = reachable().length, label = S.upcoming == null ? 'Update AxisCare' : n ? 'Update AxisCare and text ' + n + ' caregiver' + (n === 1 ? '' : 's') : 'Update AxisCare (nobody to text)';
    let h = '<div class="hu-row"><button class="hu-b" data-hua="oneclick" data-hui="' + c.i + '"' + (can ? '' : ' disabled') + '>' + E(label) + '</button><button class="hu-b2" data-hua="skip" data-hui="' + c.i + '"' + (canApprove() && !S.busy ? '' : ' disabled') + '>Skip</button>'
      + (canApprove() ? '' : '<span class="hu-src">Care coordinators and owners approve.</span>') + '</div>';
    if (S.upcoming == null) return h + '<div class="hu-src" style="margin-top:6px">AxisCare\'s schedule could not be read, so the caregivers can\'t be texted from here right now.</div>';
    h += '<div class="hu-src" style="margin-top:8px">Who gets the text (everyone on the schedule in the next ' + S.days + ' days): '
      + (S.upcoming.length ? S.upcoming.map((u) => E(u.caregiver_name) + (u.has_phone ? '' : ' <span class="hu-tag red">no number, call them</span>')).join(', ') : 'nobody is scheduled') + '</div>';
    if (S.textPreview) h += '<div class="hu-q" style="margin-top:6px">They get: "' + E(S.textPreview) + '"</div>';
    if (S.inHours === false) h += '<div class="hu-src" style="margin-top:4px">It\'s after 8 pm: AxisCare updates now, the texts go at 8 am.</div>';
    return h;
  }
  const TXT_W = { sent: ['grn', 'texted'], waiting: ['amb', 'goes at 8 am'], failed: ['red', 'did not go through'], refused: ['red', 'not texted'], no_phone: ['red', 'no number: call them'], not_on_roster: ['red', 'not on the Hub roster: call them'] };
  function textsHtml(it) {
    const T = (it.health || {}).texts; if (!T && !S.upcoming) return '';
    const list = (T && T.list) || [], seen = new Set(list.map((x) => String(x.ax)));
    let h = '<div style="margin-top:12px"><b>Caregivers</b>' + (T && T.error ? '<div class="hu-bad">' + E(T.error) + '</div>' : '');
    h += list.map((x) => { const w = TXT_W[x.state] || ['gry', x.state]; const again = ['failed', 'refused'].indexOf(x.state) > -1 && x.why !== 'asked not to get texts';
      return '<div class="hu-row" style="margin-top:6px"><span style="min-width:180px">' + E(x.name) + '</span><span class="hu-tag ' + w[0] + '">' + E(w[1]) + '</span>' + (x.why && x.state !== 'sent' && x.state !== 'waiting' ? ' <span class="hu-src">' + E(x.why) + '</span>' : '')
        + (again ? '<button class="hu-b2" data-hua="textone" data-ax="' + E(x.ax) + '"' + (canApprove() && !S.busy ? '' : ' disabled') + '>Try again</button>' : '') + '</div>'; }).join('');
    (S.upcoming || []).filter((u) => !seen.has(String(u.caregiver_axiscare_id))).forEach((u) => {
      h += '<div class="hu-row" style="margin-top:6px"><span style="min-width:180px">' + E(u.caregiver_name) + '</span><span class="hu-tag amb">added to the schedule after the update</span>'
        + (u.has_phone ? '<button class="hu-b2" data-hua="textone" data-ax="' + E(u.caregiver_axiscare_id) + '"' + (canApprove() && !S.busy ? '' : ' disabled') + '>Text ' + E(String(u.caregiver_name).split(' ')[0]) + ' too</button>' : ' <span class="hu-src">no number: call them</span>') + '</div>'; });
    return h + '</div>';
  }
  async function oneClick(it, c) {
    c.state = 'approved'; c.approved_by = me(); c.approved_email = myEmail(); c.approved_at = now(); log(it, 'Approved and sent: ' + healthName());
    S.busy = 'Updating AxisCare, then texting the caregivers...'; render();
    await save(it);
    let out; try { out = await cptCall({ action: 'health_send', card_id: it.id, text_caregivers: true }); } catch (e) { out = { error: String((e && e.message) || e) }; }
    S.busy = ''; take(it, out);
    if (!out || out.error) S.msg = 'Nothing was sent. ' + ((out && out.error) || '');
    else { const L = ((out.texts || {}).list) || [], n = (st) => L.filter((x) => x.state === st).length, aw = (out.steps || []).find((x) => x.i === AWARE_I) || {};
      S.msg = (aw.ok === false ? 'AxisCare did not confirm the update, so nobody was texted. ' + (aw.detail || '') : 'In AxisCare. ' + (out.texts && out.texts.error ? out.texts.error : n('sent') + ' texted' + (n('waiting') ? ', ' + n('waiting') + ' at 8 am' : '') + (L.length - n('sent') - n('waiting') ? ', ' + (L.length - n('sent') - n('waiting')) + ' to call' : '') + '.')); }
    render(); loadSide(cardOf(S.id));
  }
  async function textOne(it, ax) {
    S.busy = 'Texting...'; render();
    let out; try { out = await cptCall({ action: 'health_text_one', card_id: it.id, caregiver_axiscare_id: ax }); } catch (e) { out = { error: String((e && e.message) || e) }; }
    S.busy = ''; take(it, out); S.msg = out && out.error ? 'Not sent. ' + out.error : 'Done.'; render(); loadSide(cardOf(S.id));
  }
  function take(it, out) { if (out && out.card) { const list = D().ops_items || [], k = list.findIndex((x) => x && x.id === it.id); if (k > -1) list[k] = out.card; } }
  function changeHtml(it, c) {
    const s = c.send || {}, locked = c.state !== 'proposed', ok = canApprove() && !S.busy;
    const len = String(s.instructions || '').length;
    let h = '<div class="hu-card"><div class="hu-row" style="margin-top:0;justify-content:space-between"><h2 style="margin:0">' + E(c.awareness ? healthName() : c.task) + '</h2>' + stateTag(c) + '</div>';
    if (c.awareness) h += '<div class="hu-src">The dated news goes on this task so caregivers read it and check it off every shift. One press puts it in AxisCare, checks it landed, then texts everyone on the schedule.</div>';
    else {
      h += '<div class="hu-src">' + E({ add: 'New task', change: 'Change to a task', stop: 'Stop a task' }[c.change] || 'Change') + ', because of: ' + E((c.because || []).map((k) => ((it.health.news || [])[k] || {}).what).filter(Boolean).join('; ')) + '</div>';
      h += PARTS.map(([k, l]) => { const x = c[k] || {}; const tx = k === 'how' ? ((x.steps || []).join(' / ')) : x.text; return '<div class="hu-part"><b>' + E(l) + ':</b> ' + (tx ? E(tx) : '') + (x.ask ? ' <span class="hu-ask">Ask before approving</span>' : '') + '</div>'; }).join('');
      if (c.change === 'stop') h += '<div class="hu-src">Removing a task is never done from here. Change it in AxisCare yourself if it should stop.</div>';
    }
    if (!S.tasks) return h + '<div class="hu-src" style="margin-top:8px">' + (S.err ? 'Could not read AxisCare: ' + E(S.err) : 'Reading what AxisCare has for ' + E(it.about || 'the client') + '...') + '</div></div>';
    if (s.missing) h += '<div class="hu-bad">AxisCare\'s task list has no "' + E(healthName()) + '" task yet. Add it in AxisCare (or set its name in Settings > Home visit), then open this card again.</div>';
    else {
      if (!c.awareness) {
        const sel = s.mode === 'update' ? 'u:' + s.assignment_id : s.mode === 'add' ? 'a:' + s.adl_id : '';
        h += '<div class="hu-row"><select class="hu-sel" data-husel="' + c.i + '"' + (locked ? ' disabled' : '') + '><option value="">Which AxisCare task?</option><optgroup label="Update a task ' + E(it.about || 'the client') + ' already has">'
          + S.tasks.map((t) => '<option value="u:' + E(t.assignment_id) + '"' + (sel === 'u:' + t.assignment_id ? ' selected' : '') + '>' + E(t.name) + '</option>').join('')
          + '</optgroup><optgroup label="Add a new task">' + S.catalog.filter((x) => !S.tasks.some((t) => String(t.name).toLowerCase() === String(x.name).toLowerCase())).map((x) => '<option value="a:' + x.id + '"' + (sel === 'a:' + x.id ? ' selected' : '') + '>' + E(x.name) + '</option>').join('') + '</optgroup></select></div>';
      }
      if (s.mode === 'update') h += '<div class="hu-src" style="margin-top:6px">Updates the instructions on ' + E(s.name) + '. Its days and times stay as AxisCare has them.</div>';
      if (s.mode === 'add') h += '<div class="hu-src" style="margin-top:6px">Adds ' + E(s.name) + ' on these days, to be done every shift:</div><div class="hu-row">'
        + DAYS.map(([d, l]) => '<label><input type="checkbox" data-huday="' + c.i + ':' + d + '"' + ((s.days || []).indexOf(d) > -1 ? ' checked' : '') + (locked ? ' disabled' : '') + '> ' + l + '</label>').join(' ') + '</div>';
      h += '<div style="margin-top:8px"><textarea class="hu-ta" data-huta="' + c.i + '"' + (locked ? ' readonly' : '') + '>' + E(s.instructions || '') + '</textarea><div class="hu-src"' + (len > MAX ? ' style="color:#8A2A20;font-weight:700"' : '') + '>' + len + ' of ' + MAX + ' characters AxisCare takes' + (len > MAX ? '. Shorten it (older updates can go) before approving.' : '') + '</div></div>';
    }
    const can = ok && s.mode && len <= MAX && len && !(s.mode === 'add' && !(s.days || []).length);
    if (!locked && c.awareness) h += oneClickHtml(it, c, can);
    else if (!locked) h += '<div class="hu-row"><button class="hu-b" data-hua="approve" data-hui="' + c.i + '"' + (!can ? ' disabled' : '') + '>Approve</button><button class="hu-b2" data-hua="skip" data-hui="' + c.i + '"' + (ok ? '' : ' disabled') + '>Skip</button>'
      + (canApprove() ? '' : '<span class="hu-src">Care coordinators and owners approve.</span>') + '</div>';
    else if (c.state !== 'skipped' && !(c.sent && c.sent.ok)) h += '<div class="hu-row"><button class="hu-b2" data-hua="unapprove" data-hui="' + c.i + '"' + (ok ? '' : ' disabled') + '>Change it</button>'
      + (c.awareness && c.state === 'approved' ? '<button class="hu-b" data-hua="oneclick" data-hui="' + c.i + '"' + (ok ? '' : ' disabled') + '>Try again: update AxisCare and text them</button>' : '') + '</div>';
    if (c.awareness && c.sent && c.sent.ok) h += textsHtml(it);
    return h + '</div>';
  }
  function render() {
    const it = cardOf(S.id); if (!it) return close();
    css();
    let root = document.getElementById('huRoot');
    if (!root) { root = document.createElement('div'); root.id = 'huRoot'; document.body.appendChild(root); wire(root); }
    const h = it.health || {}, cs = h.changes || [];
    cs.forEach((c) => prepare(it, c));
    const ready = cs.filter((c) => c.state === 'approved' && !(c.sent && c.sent.ok)).length;
    const left = cs.filter((c) => c.state === 'proposed' || (c.state === 'approved' && !(c.sent && c.sent.ok))).length;
    root.innerHTML = '<div class="hu-in"><div class="hu-top"><h1>Health news for ' + E(h.client || it.about || 'a client') + '</h1><button class="hu-b2" data-hua="close">Close</button></div>'
      + (it.client_ax ? '' : '<div class="hu-bad">We couldn\'t tell which AxisCare client this is, so nothing can be sent from here. Open the call to see who it was about.</div>')
      + (S.msg ? '<div class="hu-msg">' + E(S.msg) + '</div>' : '') + (S.busy ? '<div class="hu-msg">' + E(S.busy) + '</div>' : '')
      + '<div class="hu-card"><h2>What was said</h2><div class="hu-src">On a call with ' + E(it.who || 'someone') + ', ' + E(day((it.source || {}).call_at)) + '. Only words really said on the call are kept.</div><ul class="hu-news">'
      + (h.news || []).map((n) => '<li><b>' + E(KIND_W[n.kind] || 'Other') + ':</b> ' + E(n.what) + (n.when ? ' <span class="hu-src">(' + E(n.when) + ')</span>' : '') + (n.said_by ? ' <span class="hu-src">said by ' + E(n.said_by) + '</span>' : '') + (n.quote ? '<div class="hu-q">On the call: "' + E(n.quote) + '"</div>' : '') + '</li>').join('') + '</ul></div>'
      + skillsHtml(it)
      + ((h.ask || []).length ? '<div class="hu-card"><h2>Questions before approving</h2><ul>' + h.ask.map((q) => '<li>' + E(q) + '</li>').join('') + '</ul></div>' : '')
      + cs.map((c) => changeHtml(it, c)).join('')
      + '<div class="hu-card"><div class="hu-row" style="margin-top:0"><button class="hu-b" data-hua="send"' + (ready && it.client_ax && !S.busy ? '' : ' disabled') + '>Send ' + (ready || '') + ' approved to AxisCare</button>'
      + (it.status === 'open' ? '<button class="hu-b2" data-hua="done"' + (left || S.busy ? ' disabled' : '') + '>Done, close the card</button>' : '<span class="hu-tag grn">Card closed</span>') + '</div>'
      + '<div class="hu-src" style="margin-top:6px">For the care task changes above. Nothing goes to AxisCare until you approve it and tap Send. Every send is read back from AxisCare.</div></div>'
      + '<div class="hu-card"><h2>History</h2>' + (it.history || []).slice().reverse().map((x) => '<div class="hu-src">' + E(day(x.at)) + ' · ' + E(x.by || '') + ': ' + E(x.text || '') + '</div>').join('') + '</div></div>';
  }
  function wire(root) {
    root.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-hua]'); if (!b || b.disabled) return;
      const act = b.getAttribute('data-hua'), it = cardOf(S.id); if (!it) return;
      const c = (it.health.changes || []).find((x) => String(x.i) === b.getAttribute('data-hui'));
      S.msg = '';
      if (act === 'close') return close();
      if (!canApprove() && act !== 'close') { S.msg = 'Care coordinators and owners approve health updates.'; return render(); }
      if (act === 'approve' && c) { c.state = 'approved'; c.approved_by = me(); c.approved_email = myEmail(); c.approved_at = now(); log(it, 'Approved: ' + (c.awareness ? healthName() : c.task)); await save(it); return render(); }
      if (act === 'skip' && c) { c.state = 'skipped'; c.skipped_by = me(); c.skipped_at = now(); log(it, 'Skipped: ' + (c.awareness ? healthName() : c.task)); await save(it); return render(); }
      if (act === 'unapprove' && c) { c.state = 'proposed'; delete c.approved_by; delete c.approved_email; delete c.approved_at; delete c.skipped_by; log(it, 'Reopened to change: ' + (c.awareness ? healthName() : c.task)); await save(it); return render(); }
      if (act === 'send') return send(it);
      if (act === 'oneclick' && c) return oneClick(it, c);
      if (act === 'textone') return textOne(it, b.getAttribute('data-ax'));
      if (act === 'done') { it.status = 'done'; it.closed_at = now(); it.closed_by = me(); it.close_note = 'Health news reviewed and sent to AxisCare'; try { if (typeof opsLog === 'function') opsLog(it, it.close_note); } catch (e) {} await save(it); S.msg = 'Card closed.'; return render(); }
    });
    root.addEventListener('change', async (ev) => {
      const it = cardOf(S.id); if (!it) return;
      const t = ev.target, find = (i) => (it.health.changes || []).find((x) => String(x.i) === String(i));
      if (t.matches('[data-husel]')) { const c = find(t.getAttribute('data-husel')); if (!c || c.state !== 'proposed') return; pick(it, c, t.value); await save(it); return render(); }
      if (t.matches('[data-huday]')) { const [i, d] = t.getAttribute('data-huday').split(':'), c = find(i); if (!c || !c.send || c.state !== 'proposed') return; const ds = new Set(c.send.days || []); if (t.checked) ds.add(d); else ds.delete(d); c.send.days = DAYS.map((x) => x[0]).filter((x) => ds.has(x)); await save(it); return render(); }
      if (t.matches('[data-huta]')) { const c = find(t.getAttribute('data-huta')); if (!c || !c.send || c.state !== 'proposed') return; c.send.instructions = String(t.value || ''); c.send.edited = true; await save(it); return render(); }
    });
  }
  async function send(it) {
    S.busy = 'Sending to AxisCare...'; render();
    await save(it);   /* the approvals are on the card before the server reads it */
    let out; try { out = await cptCall({ action: 'health_send', card_id: it.id }); } catch (e) { out = { error: String((e && e.message) || e) }; }
    S.busy = '';
    if (out && out.card) { const list = D().ops_items || [], k = list.findIndex((x) => x && x.id === it.id); if (k > -1) list[k] = out.card; }
    if (!out || out.error) S.msg = 'Nothing was sent. ' + ((out && out.error) || '');
    else { const good = (out.steps || []).filter((s) => s.ok).length; S.msg = good + ' of ' + (out.steps || []).length + ' confirmed in AxisCare.' + (out.card_saved === false ? ' The result could not be saved on the card; open it again.' : ''); }
    render(); loadSide(cardOf(S.id));
  }
  async function loadSide(it) {
    if (!it || !it.client_ax || typeof cptCall !== 'function') return;
    try { const d = await cptCall({ action: 'health_tasks', card_id: it.id }); if (d.error || d.outcome) throw new Error(d.error || d.detail); S.tasks = d.tasks || []; S.catalog = d.catalog || []; S.err = ''; S.upcoming = Array.isArray(d.upcoming) ? d.upcoming : null; S.upErr = d.upcoming_error || ''; S.days = d.days || 14; S.textPreview = d.text_preview || ''; S.inHours = d.in_hours; }
    catch (e) { S.err = String((e && e.message) || e); }
    if (S.id === it.id) { const c = cardOf(S.id); if (c) { const before = JSON.stringify(c.health.changes); render(); if (JSON.stringify(c.health.changes) !== before) await save(c); } }
  }
  async function open(id) {
    const it = cardOf(id); if (!it || it.kind !== KIND) return;
    S.id = id; S.msg = ''; S.busy = ''; S.tasks = null; S.catalog = null; S.err = ''; S.upcoming = null; S.upErr = '';
    const had = (it.health && it.health.changes || []).some((x) => x && x.i === AWARE_I);
    ensureAware(it); if (!had && (it.health.changes || []).some((x) => x && x.i === AWARE_I)) await save(it);
    render(); loadSide(it);
  }
  function close() { const r = document.getElementById('huRoot'); if (r) r.remove(); S.id = null; try { if (typeof renderMyWork === 'function') renderMyWork(); } catch (e) {} }
  /* Settings > Home visit (owners): the two AxisCare task names */
  function settingsHtml() {
    const n = names();
    return '<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px"><b>AxisCare tasks for updates caregivers read first</b>'
      + '<div class="field-note">The health card puts dated news on the first task and texts the caregivers to read it. Use the exact names from AxisCare\'s task list. Set Nov 7, 2026.</div>'
      + '<label class="field-note" style="display:flex;flex-direction:column;gap:4px;margin-top:8px">Health update task<input id="huSet_health" value="' + E(n.health) + '" style="max-width:360px"></label>'
      + '<label class="field-note" style="display:flex;flex-direction:column;gap:4px;margin-top:8px">Home and family update task<input id="huSet_home" value="' + E(n.home) + '" style="max-width:360px"></label>'
      + '<div style="display:flex;gap:8px;margin-top:8px;align-items:center"><button class="secondary" onclick="HU.settingsSave(this)">Save the task names</button><span class="field-note" id="huSetSaved"></span></div></div>';
  }
  async function settingsSave(btn) {
    if (!isOwner()) { alert('Only owners can change these names.'); return; }
    const v = (id) => String((document.getElementById(id) || {}).value || '').trim();
    const health = v('huSet_health'), home = v('huSet_home');
    if (!health || !home) { alert('Both tasks need a name.'); return; }
    if (btn) btn.disabled = true;
    const out = typeof tkMerge === 'function' ? await tkMerge((st) => { st.health_task_names = { health, home, by: me(), at: now() }; return ['Health and home update task names changed']; }, 'Health task names') : { error: { message: 'Settings are not loaded' } };
    if (btn) btn.disabled = false;
    const sv = document.getElementById('huSetSaved'); if (sv) sv.textContent = out && out.error ? 'Could not save: ' + out.error.message : 'Saved.';
  }
  /* the button on the My Work card */
  function actions(it) {
    const h = it.health || {}, cs = h.changes || [], sent = cs.filter((c) => c.sent && c.sent.ok).length;
    return '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;"><button class="ghost" style="padding:5px 11px;font-size:12px;" onclick="HU.open(\'' + E(it.id) + '\')">Review and send to AxisCare</button>'
      + '<span class="field-note">' + E((h.news || []).length + ' piece' + ((h.news || []).length === 1 ? '' : 's') + ' of news' + (sent ? ', ' + sent + ' sent' : '')) + '</span></div>';
  }
  window.HU = { open, close, actions, settingsHtml, settingsSave, names, healthName, needsOf, standing, skillsHtml, awarenessBlock, partsText, ensureAware, prepare, pick, isAware, KIND, AWARE_I, AWARE_NAME, _s: S };
})();
