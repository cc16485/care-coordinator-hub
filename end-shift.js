/* =====================================================================================================================
   END MY SHIFT (Today cockpit, Phase 5; Samantha decided 2026-10-05). A button on My Work. It walks through what you
   still own that is moving today (Act Now, Due Today, waiting with no wake-up): each one stays with you, goes to the
   next person on duty for that area, or is marked done, with an optional note. Then it writes the handoff for you.
     · The handoff goes to the NEXT PERSON ON DUTY for each item's area (Operations or Staffing), from the duty schedule;
       when nobody is scheduled, the seat's "when nobody is scheduled" person. Never back to yourself.
     · It sits at the top of their Today (Dashboard and My Work) until they tap Got it.
     · Only urgent items with no owner also go on the Stand-Up board, never the whole handoff.
     · Kept on the record ('handoffs', the same record the Communication Log reads). Nobody is texted or emailed.
   Parked work (a wake-up is set) and Later work stay yours and come back by themselves; they are counted, not listed.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s));
  const lc = s => String(s || '').trim().toLowerCase();
  const me = () => { try{ const a = ccActor(); return { email: lc(a.email), name: a.name || a.email || 'Someone' }; }catch(e){ return { email: '', name: 'Someone' }; } };
  const first = e => String((typeof opsOwnerName === 'function' && opsOwnerName(e)) || String(e || '').split('@')[0]).split(/\s+/)[0];
  const full = e => (typeof opsOwnerName === 'function' && opsOwnerName(e)) || e;
  const STAFFING_KINDS = ['coverage', 'staffing_issue', 'coverage_outcome', 'family_call', 'evv_fix', 'staffing'];
  const HO = { list: null, at: 0, busy: null };

  /* Which seat an item belongs to: staffing work to Staffing, everything else to Operations. */
  function areaOf(it){
    if(!it) return 'operations';
    if(it.domain === 'scheduling_coverage' || STAFFING_KINDS.indexOf(String(it.kind)) > -1) return 'staffing';
    return 'operations';
  }
  /* Who holds a seat at a moment: the schedule, else the "when nobody is scheduled" person, else the first alert admin. */
  function seatAt(area, t){
    const h = typeof dutyHolder === 'function' ? dutyHolder(area, t) : null;
    if(h && h.person) return lc(h.person);
    const st = DATA.ops_settings || {};
    const d = lc(st['duty_default_' + area]); if(d) return d;
    return lc((Array.isArray(st.coverage_alert_admins) && st.coverage_alert_admins[0]) || 'samantha@mo-care.com');
  }
  /* The next person on duty for an area who is not me: now if someone else holds it, else the first change in the
     next 4 days (covers a Friday-afternoon handoff to Monday morning). */
  function nextOnDuty(area, from){
    const mine = me().email, t0 = from || new Date();
    for(let m = 0; m <= 4 * 24 * 60; m += 15){
      const p = seatAt(area, new Date(t0.getTime() + m * 60000));
      if(p && p !== mine) return { person: p, at: m ? new Date(t0.getTime() + m * 60000) : null };
    }
    return null;
  }
  const tier = it => (typeof opsPriorityKey === 'function' ? opsPriorityKey(it)[0] : 4);
  const dueText = it => (typeof opsDueText === 'function' ? opsDueText(it) : (it.due ? String(it.due).slice(0, 10) : ''));

  /* What the walk-through lists, and what it only counts. */
  function eoLists(){
    const b = myWorkBuckets(), m = me().email;
    const moving = b.today.filter(i => lc(i.owner) === m).sort((a, c) => { const ka = opsPriorityKey(a), kc = opsPriorityKey(c); return (ka[0] - kc[0]) || (ka[1] - kc[1]); });
    const inMoving = new Set(moving.map(i => i.id));
    const later = b.mine.filter(i => !inMoving.has(i.id));
    /* Needs attention: urgent (Act Now) work with nobody's name on it. */
    const attention = (DATA.ops_items || []).filter(i => i.status === 'open' && !i.owner && opsCanSee(i) && !opsParked(i) && tier(i) <= 1);
    return { moving, parked: b.waiting, later, attention };
  }

  function eoOpen(btn){
    const L = eoLists(), who = me(), esc8 = esc;
    const nx = { operations: nextOnDuty('operations'), staffing: nextOnDuty('staffing') };
    const nxName = a => nx[a] ? first(nx[a].person) : '';
    const row = (it, k) => {
      const a = areaOf(it), to = nx[a], t = tier(it);
      const def = (t <= 1 && to) ? 'hand' : 'keep';
      return '<div class="eoRow" data-k="' + k + '" style="border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:6px;' + (t <= 2 ? 'border-left:3px solid var(--red);' : '') + '">'
        + '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;"><b style="font-size:13.5px;flex:1;min-width:200px;">' + esc8(it.about || it.title || '') + '</b>'
        + '<span class="field-note">' + esc8(dueText(it)) + '</span></div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center;">'
        + '<select class="eoWhat" style="width:auto;font-size:12.5px;padding:4px 6px;">'
        + '<option value="keep"' + (def === 'keep' ? ' selected' : '') + '>Stays with me</option>'
        + (to ? '<option value="hand"' + (def === 'hand' ? ' selected' : '') + '>Hand to ' + esc8(nxName(a)) + ' (' + esc8(dutyAreaLabel(a)) + ')</option>' : '')
        + '<option value="done">Done</option></select>'
        + '<input class="eoNote" placeholder="Note for ' + esc8(to ? nxName(a) : 'the record') + ' (where it stands)" style="flex:1;min-width:180px;font-size:12.5px;padding:5px 8px;">'
        + '</div></div>';
    };
    const toLine = ['operations', 'staffing'].map(a => '<b>' + esc8(dutyAreaLabel(a)) + '</b>: ' + (nx[a] ? esc8(full(nx[a].person)) + (nx[a].at ? ' (from ' + esc8(nx[a].at.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })) + ')' : ' (now)') : 'nobody else in the next 4 days, so it stays with you')).join(' · ');
    const el = ccPopOpen(btn,
      '<div style="font-size:16px;font-weight:800;color:var(--navy);">End my shift</div>'
      + '<div class="field-note" style="margin:3px 0 8px;">Next on duty. ' + toLine + '</div>'
      + (L.moving.length
        ? '<div style="font-size:12px;font-weight:800;letter-spacing:.05em;color:var(--navy);margin:6px 0;">STILL MOVING TODAY · ' + L.moving.length + '</div>'
          + '<div class="field-note" style="margin-bottom:6px;">For each one: it stays with you, goes to the next person on duty, or it is done. A note helps whoever picks it up.</div>'
          + L.moving.map(row).join('')
        : '<div class="field-note" style="margin:6px 0;">Nothing of yours is moving today.</div>')
      + ((L.parked.length || L.later.length) ? '<div class="field-note" style="margin:6px 0;">' + [L.parked.length ? L.parked.length + ' waiting with a wake-up' : '', L.later.length ? L.later.length + ' later' : ''].filter(Boolean).join(' and ') + ' stay with you and come back by themselves.</div>' : '')
      + (L.attention.length
        ? '<div style="font-size:12px;font-weight:800;letter-spacing:.05em;color:var(--red);margin:10px 0 4px;">NEEDS ATTENTION, NOBODY HAS IT · ' + L.attention.length + '</div>'
          + '<div class="field-note" style="margin-bottom:4px;">These go in the handoff and on the To talk about list.</div>'
          + L.attention.map(i => '<div style="font-size:13px;">· ' + esc8(i.about || i.title || '') + ' <span class="field-note">' + esc8(dueText(i)) + '</span></div>').join('')
        : '')
      /* My Desk (Stage 4): a short step for my own desk, and the ribbon moves on */
      + (typeof dkShiftHtml === 'function' ? dkShiftHtml() : '')
      + '<div style="margin-top:10px;"><label class="field-note">Anything else the next person should know</label>'
      + '<textarea id="eoGeneral" rows="2" style="width:100%;font-size:13px;padding:7px;border-radius:8px;"></textarea></div>'
      + '<div class="field-note" style="margin-top:6px;">Nobody is texted. The handoff shows at the top of their Today until they tap Got it, and stays on the record.</div>'
      + '<div style="display:flex;gap:8px;margin-top:10px;"><button class="primary" id="eoGo">Post my handoff</button><button class="ghost" id="eoNo">Cancel</button></div>',
      { width: 640 });
    el.querySelector('#eoNo').onclick = ccPopClose;
    el.querySelector('#eoGo').onclick = async (ev) => {
      ev.target.disabled = true; ev.target.textContent = 'Posting…';
      const picks = [...el.querySelectorAll('.eoRow')].map(r => ({ it: L.moving[Number(r.dataset.k)], what: r.querySelector('.eoWhat').value, note: r.querySelector('.eoNote').value.trim() }));
      const general = el.querySelector('#eoGeneral').value.trim();
      const out = await eoPost(picks, L.attention, general, nx);
      try{ if(typeof dkShiftApply === 'function') await dkShiftApply(el); }catch(e){ console.error('end of shift: my desk step', e); }
      ccPopClose();
      ccToast(out.to.length ? '✓ Handoff posted to ' + out.to.map(first).join(' and ') + '. Nobody was texted.' : '✓ Your shift is wrapped up. Nobody else is on duty, so nothing was handed off.');
      if(typeof myWorkRefresh === 'function') myWorkRefresh();
    };
  }

  async function eoPost(picks, attention, general, nx){
    const who = me(), at = new Date().toISOString(), stamp = Date.now().toString(36);
    const per = {};   // recipient -> handoff items
    const add = (to, line) => { if(!to) return; (per[to] = per[to] || []).push(line); };
    let done = 0, handed = 0;
    for(const p of picks){
      const it = p.it, a = areaOf(it), to = nx[a] && nx[a].person;
      const base = { label: it.about || it.title || '', ops_id: it.id, area: a, due: it.due || '', note: p.note };
      if(p.what === 'hand' && to){
        await opsSetOwner(it.id, to, full(to), 'End of shift' + (p.note ? ': ' + p.note : ''));
        handed++; add(to, Object.assign(base, { what: 'handed' }));
      } else if(p.what === 'done'){
        it.status = 'done'; it.closed_at = at; it.closed_by = who.email; it.close_note = p.note || 'Done at end of shift';
        if(!it.claimed_by){ it.claimed_by = who.email; it.claimed_by_name = who.name; it.claimed_at = at; }
        opsLog(it, 'Closed at end of shift' + (p.note ? ': ' + p.note : ''));
        opEvent('item_resolved', { item: it, summary: (it.about || it.title || '') + ': done at end of shift' + (p.note ? ', ' + p.note : '') });
        await persist('ops_items', it);
        if(typeof reviewMaybeCreate === 'function') await reviewMaybeCreate(it);
        done++;
      } else {
        if(p.note){ opsLog(it, 'End of shift note: ' + p.note); await persist('ops_items', it); }
        add(to, Object.assign(base, { what: 'kept', owner_name: who.name }));
      }
    }
    for(const it of attention){
      const to = nx[areaOf(it)] && nx[areaOf(it)].person;
      add(to, { label: it.about || it.title || '', ops_id: it.id, area: areaOf(it), due: it.due || '', what: 'attention' });
      await eoStandUp(it, who);
    }
    /* Nothing still moving still deserves a word: the next person on Operations hears that the shift ended clean. */
    let recips = Object.keys(per);
    const fallback = (nx.operations && nx.operations.person) || (nx.staffing && nx.staffing.person);
    if(!recips.length && fallback){ per[fallback] = []; recips = [fallback]; }
    if(general && recips.length === 0 && fallback){ per[fallback] = []; recips = [fallback]; }
    for(const to of recips){
      const rec = { id: 'ho_' + stamp + '_' + to.replace(/[^a-z0-9]/g, ''), kind: 'end_of_shift', from: who.email, from_name: who.name,
        to, to_name: full(to), posted_at: at, general_note: general, items: per[to], counts: { handed, done }, ack_at: null, ack_by: null };
      await persist('handoffs', rec);
      (DATA.handoffs = DATA.handoffs || []).push(rec);
    }
    opEvent('shift_ended', { summary: who.name + ' ended their shift' + (recips.length ? ': handoff to ' + recips.map(full).join(' and ') : '') + ' (' + handed + ' handed, ' + done + ' done)' });
    return { to: recips, handed, done };
  }
  /* Urgent, nobody's: onto the Stand-Up board once (an open board item already pointing at it is enough). */
  async function eoStandUp(it, who){
    try{
      const W = window.SUB, cur = (W && W.SU && W.SU.items) || [];
      if(cur.some(x => x && x.ops_item_id === it.id && x.status !== 'done')) return;
      const item = { id: 'su_eos_' + String(it.id).replace(/[^A-Za-z0-9_]/g, '') + '_' + Date.now().toString(36), summary: (it.about || it.title || '') + ' (nobody has it; from ' + who.name.split(' ')[0] + '’s end of shift)',
        category: 'General', client: '', related_to: '', ops_item_id: it.id, occurred_at: new Date().toISOString(), reported_by: who.name, reported_by_email: who.email,
        assigned_to_email: '', assigned_to: '', due: '', urgent: true, status: 'open', resolved: false, created_at: new Date().toISOString(), created_by: who.name,
        updates: [], rev: 1, history: [{ at: new Date().toISOString(), by: who.name, by_email: who.email, what: 'Added at end of shift (urgent, no owner)' }] };
      await persist('standup_notes', item);
      if(W && W.SU) (W.SU.items = W.SU.items || []).push(item);
    }catch(e){ console.error('end of shift: could not add to the Stand-Up board', e); }
  }

  /* ── The handoff at the top of the next person's Today ── */
  async function hoLoad(force){
    if(HO.busy) return HO.busy;
    if(!force && HO.list && Date.now() - HO.at < 120000) return;
    HO.busy = (async () => {
      try{ const { data } = await sb.from('app_data').select('data').eq('key', 'handoffs').maybeSingle();
        if(data && Array.isArray(data.data)){ HO.list = data.data; DATA.handoffs = data.data; } HO.at = Date.now(); }
      catch(e){ /* keep what we have */ }
      finally{ HO.busy = null; }
    })();
    return HO.busy;
  }
  function hoMine(){
    const m = me().email, since = Date.now() - 4 * 864e5;
    return (HO.list || DATA.handoffs || []).filter(h => h && h.kind === 'end_of_shift' && lc(h.to) === m && !h.ack_at && Date.parse(h.posted_at || 0) > since)
      .sort((a, c) => String(a.posted_at).localeCompare(String(c.posted_at)));
  }
  function hoCardHtml(h){
    const when = new Date(h.posted_at).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    const items = h.items || [], moving = items.filter(i => i.what !== 'attention'), att = items.filter(i => i.what === 'attention');
    const line = i => '<li>' + esc(i.label) + (i.what === 'kept' ? ' <span class="field-note">(stays with ' + esc(String(i.owner_name || h.from_name).split(' ')[0]) + ')</span>' : ' <span class="field-note">(now yours)</span>')
      + (i.note ? ': ' + esc(i.note) : '') + '</li>';
    return '<div class="card hoCard" style="padding:12px 16px;margin-bottom:12px;border:1px dashed var(--teal);background:#EEF8F7;">'
      + '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;"><b style="color:var(--navy);">Handoff from ' + esc(h.from_name) + ', ' + esc(when) + '</b>'
      + '<span class="field-note">' + (moving.length ? moving.length + ' thing' + (moving.length === 1 ? '' : 's') + ' still moving' : 'nothing still moving') + '</span>'
      + '<span style="flex:1;"></span><button class="primary" style="padding:5px 14px;font-size:12.5px;" onclick="hoAck(\'' + esc(h.id) + '\', this)">Got it</button></div>'
      + (moving.length ? '<ul style="margin:6px 0 0;padding-left:18px;font-size:13.5px;">' + moving.map(line).join('') + '</ul>' : '')
      + (att.length ? '<div style="margin-top:6px;font-size:13.5px;color:var(--red);font-weight:700;">' + att.length + ' need' + (att.length === 1 ? 's' : '') + ' attention, nobody has ' + (att.length === 1 ? 'it' : 'them') + ':</div>'
        + '<ul style="margin:2px 0 0;padding-left:18px;font-size:13.5px;">' + att.map(i => '<li>' + esc(i.label) + '</li>').join('') + '</ul>' : '')
      + (h.general_note ? '<div style="margin-top:6px;font-size:13.5px;">“' + esc(h.general_note) + '”</div>' : '')
      + '</div>';
  }
  function hoRender(){
    const html = hoMine().map(hoCardHtml).join('');
    ['hoCardDash', 'hoCardWork'].forEach(id => { const el = document.getElementById(id); if(el) el.innerHTML = html; });
  }
  async function hoAck(id, btn){
    if(btn) btn.disabled = true;
    await hoLoad(true);
    const h = (HO.list || DATA.handoffs || []).find(x => x && x.id === id); if(!h){ hoRender(); return; }
    const who = me(); h.ack_at = new Date().toISOString(); h.ack_by = who.name;
    await persist('handoffs', h);
    opEvent('handoff_seen', { summary: who.name + ' saw ' + h.from_name + '’s end-of-shift handoff' });
    hoRender();
  }
  async function hoRefresh(){ hoRender(); await hoLoad(false); hoRender(); }

  Object.assign(window, { eoOpen, eoLists, hoRender, hoRefresh, hoAck,
    EOX: { areaOf, seatAt, nextOnDuty, eoPost, hoMine, HO } });
})();
