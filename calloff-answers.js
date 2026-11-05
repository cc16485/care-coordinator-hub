/* =====================================================================================================================
   WAS IT COVERED? ANSWERS (Samantha 2026-11-05: 21 call-offs sat at "no outcome yet"; she approved the plan
   https://claude.ai/artifact/FhGxoafnwiDyD5GzLju93A with "start with the cleanup and the Hub card fix, behind a switch").
     · Cara > "Was it covered?": every call-off waiting for an answer (status needs_outcome), whether or not its card is
       still there, oldest first, with how it was opened, how long it has waited and who has its card
     · "What AxisCare shows": the client's visits at that time, read live (the coverage-shifts live_schedule read the
       Hub already has), with who clocked in, so the answer comes from AxisCare instead of memory
     · five answers: Covered, Not covered, Client cancelled, Couldn't staff, and the new Not needed (no care was owed,
       such as care that hadn't started). Owners can answer several at once, with one reason.
     · a "Was it covered?" card closes only with an answer: Done, This is finished and Clear old cards ask the question
     · answering closes the case AND its card, sends nothing (as before), and Not covered still makes a call-the-family
       card for a person. The Hub never contacts a family by itself.
   Behind ops_settings.calloff_answers_live (owners switch it on the Admin page or in Settings), or an owner's preview.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const get = n => { try{ return (0, eval)(n); }catch(e){ return undefined; } };
  const KEY = 'caaPreview';
  const ST = { look:{}, byDate:{}, loading:{}, sel:new Set(), why:'' };

  function live(settings){ return !!(settings && settings.calloff_answers_live === true); }
  function preview(){ try{ return root.localStorage.getItem(KEY) === '1'; }catch(e){ return false; } }
  function setPreview(on){ try{ if(on) root.localStorage.setItem(KEY, '1'); else root.localStorage.removeItem(KEY); }catch(e){} }
  const isOwner = () => { try{ return typeof ccIsOwner === 'function' && !!ccIsOwner(); }catch(e){ return false; } };
  const D = () => get('DATA') || {};
  const settings = () => D().ops_settings || {};
  function showing(){ return live(settings()) || (isOwner() && preview()); }
  const redraw = () => { try{ if(typeof renderCoverage === 'function') renderCoverage(); }catch(e){} try{ if(typeof myWorkRefresh === 'function') myWorkRefresh(); }catch(e){} };

  /* the answers, in the order a person sees them */
  const ANSWERS = [
    ['covered_other_way', 'Covered', 'covered'],
    ['uncovered', 'Not covered', 'not covered'],
    ['client_cancelled', 'Client cancelled', 'cancelled by the client'],
    ['couldnt_staff', 'Couldn\'t staff', 'we couldn\'t staff it'],
    ['not_needed', 'Not needed', 'not needed: no care was owed'] ];
  const wordsFor = how => (ANSWERS.find(a => a[0] === how) || [0, 0, how])[2];

  const waiting = () => (D().coverage_cases || []).filter(c => c && c.status === 'needs_outcome' && String(c.kind || '') !== 'interest')
    .sort((a, b) => String(a.shift_date || '').localeCompare(String(b.shift_date || '')) || String(a.id).localeCompare(String(b.id)));
  const ownerName = e => { if(!e) return 'nobody'; let n = ''; try{ n = (typeof opsOwnerName === 'function' && opsOwnerName(e)) || ''; }catch(_){} return String(n || e).split('@')[0]; };
  const cardFor = c => (D().ops_items || []).find(i => i && i.id === 'ops_covq_' + c.id) || null;

  /* ── times ─────────────────────────────────────────────────────────────────────────────────────────────── */
  /* "09:00-14:00" (Cara's cases) or "10pm-8am", "9a-1p" (typed): minutes from midnight, end past midnight when earlier */
  function window_(shiftTime){
    const one = s => { const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?m?\.?\s*$/i.exec(s || ''); if(!m) return null;
      let h = +m[1]; const mm = +(m[2] || 0), ap = (m[3] || '').toLowerCase();
      if(ap === 'p' && h < 12) h += 12; if(ap === 'a' && h === 12) h = 0; return h > 24 || mm > 59 ? null : h * 60 + mm; };
    const p = String(shiftTime || '').split(/\s*(?:-|–|to)\s*/);
    if(p.length !== 2) return null;
    const a = one(p[0]), b = one(p[1]); if(a == null || b == null) return null;
    return [a, b > a ? b : b + 1440];
  }
  const t12 = m => { m = ((m % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return ((h % 12) || 12) + (mm ? ':' + String(mm).padStart(2, '0') : '') + (h < 12 ? ' am' : ' pm'); };
  const hm = t => { const m = /^(\d{1,2}):(\d{2})/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  const addDays = (ymd, n) => { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dayDiff = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
  const dayName = ymd => /^\d{4}-\d{2}-\d{2}$/.test(String(ymd)) ? new Date(ymd + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) : 'no date';
  const ago = iso => { const t = Date.parse(iso); if(!Number.isFinite(t)) return ''; const d = Math.floor((Date.now() - t) / 864e5); return d < 1 ? 'today' : d === 1 ? '1 day' : d + ' days'; };
  function whenText(c){ const w = window_(c.shift_time); return dayName(c.shift_date) + (w ? ', ' + t12(w[0]) + ' to ' + t12(w[1]) : c.shift_time ? ', ' + c.shift_time : ''); }

  function howOpened(c){
    const who = c.calling_off ? String(c.calling_off) : '';
    if(c.opened_by === 'ongoing-sweep') return 'An open slot in the AxisCare schedule, found by Cara\'s sweep';
    if(c.opened_by === 'axiscare-watch') return (who ? who + ' was taken off the shift' : 'Taken off the shift') + ' in AxisCare';
    if(c.opened_by === 'cara-flag') return 'Cara flagged a phone call' + (who ? ' from ' + who : '') + (c.client_axiscare_id ? '' : ', no client attached');
    return (who ? who + ' called off. ' : '') + 'Opened by ' + (c.opened_by || 'someone');
  }

  /* ── what AxisCare shows for the client at that time ─────────────────────────────────────────────────── */
  async function readDay(date){
    if(ST.byDate[date] || ST.loading[date]) return ST.loading[date] || ST.byDate[date];
    ST.loading[date] = (async () => {
      const { data:{ session } } = await sb.auth.getSession();
      if(!session) throw new Error('sign in again');
      const r = await fetch(CONFIG.supabase_url + '/functions/v1/coverage-shifts', { method:'POST',
        headers:{ 'Authorization':'Bearer ' + session.access_token, 'Content-Type':'application/json' },
        body:JSON.stringify({ live_schedule:true, start:date, end:addDays(date, 1) }) });
      const out = await r.json().catch(() => ({}));
      if(out.error || !Array.isArray(out.rows)) throw new Error(out.error || ('AxisCare ' + r.status));
      ST.byDate[date] = out.rows; return out.rows;
    })();
    try{ return await ST.loading[date]; } finally { delete ST.loading[date]; }
  }
  /* the client's visits that overlap the shift (all that day when the shift has no times), and a plain verdict */
  function verdict(c, rows){
    const ax = String(c.client_axiscare_id || ''), w = window_(c.shift_time);
    const mine = (rows || []).filter(v => String(v.client_id) === ax).map(v => {
      const k = dayDiff(c.shift_date, v.date), s = hm(v.time), e = hm(v.end);
      const a = s == null ? null : k * 1440 + s, b = a == null || e == null ? null : a + (e > s ? e - s : e - s + 1440);
      return { v, a, b };
    }).filter(x => !w ? dayDiff(c.shift_date, x.v.date) === 0 : x.a != null && x.b != null && x.a < w[1] && x.b > w[0]);
    const worked = mine.filter(x => x.v.caregiver && x.v.clock_in);
    let say, hint = '';
    if(!mine.length){ say = 'AxisCare shows no visit for this client at that time.'; hint = 'Often: the visit was deleted because care wasn\'t needed, or it moved.'; }
    else if(worked.length){ say = worked.map(x => x.v.caregiver + ' clocked in at ' + t12(hm(x.v.clock_in)) + (x.v.clock_out ? ', out at ' + t12(hm(x.v.clock_out)) : '')).join('; ') + '.'; hint = 'Looks covered.'; }
    else if(mine.some(x => x.v.caregiver)){ say = mine.filter(x => x.v.caregiver).map(x => x.v.caregiver).join(', ') + ' on the schedule, no clock-in.'; hint = 'Ask them, or check the visit in AxisCare.'; }
    else { say = 'AxisCare shows the visit with nobody on it.'; hint = 'Looks not covered, unless it was cancelled.'; }
    return { say, hint, mine, suggest: worked.length ? 'covered_other_way' : '' };
  }
  async function look(caseId){
    const c = (D().coverage_cases || []).find(x => x && String(x.id) === String(caseId)); if(!c) return;
    if(!c.client_axiscare_id || !/^\d{4}-\d{2}-\d{2}$/.test(String(c.shift_date || ''))){ ST.look[caseId] = { say:'This call-off has no ' + (c.client_axiscare_id ? 'date' : 'client') + ' attached, so AxisCare can\'t be checked.', hint:'Answer from what you know.', mine:[] }; redraw(); return; }
    ST.look[caseId] = { loading:true }; redraw();
    try{ ST.look[caseId] = verdict(c, await readDay(String(c.shift_date))); }
    catch(e){ ST.look[caseId] = { err:e.message || String(e) }; }
    redraw();
  }
  async function lookAll(){ for(const c of waiting()) if(!ST.look[c.id] || ST.look[c.id].err) await look(c.id); }

  /* ── answering: closes the case and its card; nothing is sent ─────────────────────────────────────────── */
  async function answer(caseId, how, opts){
    opts = opts || {};
    if(!ANSWERS.some(a => a[0] === how)) return false;
    const a = ccActor(), now = new Date().toISOString(), words = wordsFor(how), why = String(opts.why || '').trim();
    let c = null;
    try{ const { data } = await sb.from('app_data').select('data').eq('key', 'coverage_cases').maybeSingle();
      c = (Array.isArray(data && data.data) ? data.data : []).find(x => String(x.id) === String(caseId)) || null; }catch(e){ c = null; }
    if(!c){ if(!opts.quiet) ccToast('Could not find that call-off just now. Nothing was changed.'); return false; }
    if(c.status !== 'needs_outcome' && c.status !== 'open'){ if(!opts.quiet) ccToast('Someone already answered this one.'); return false; }
    c.status = 'done'; c.resolved_at = now; c.resolved_how = how; c.resolved_by = a.email; c.resolved_by_name = a.name; c.outcome_answered_at = now;
    if(how === 'covered_other_way' && opts.covered_by) c.covered_by = opts.covered_by;
    if(!c.closure_notified){ c.closure_notified = now; c.closure_courtesy_count = 0; c.closure_skip_reason = 'Answered after the shift was over; no texts sent.'; }
    if(how !== 'uncovered' && !c.family_notified){ c.family_notified = now; c.family_notified_count = 0; c.family_no_recipients = true; c.family_skip_reason = 'Answered after the shift was over; no texts sent.'; }
    c.note = [String(c.note || '').trim(), 'After the shift, ' + (a.name || a.email) + ' recorded: ' + words + (why ? ' (' + why + ')' : '') + '.'].filter(Boolean).join('\n');
    let famId = '';
    if(how === 'uncovered' && !c.family_contact && !c.family_call_item){ famId = 'ops_famcall_' + c.id; c.family_call_item = famId; }
    await persist('coverage_cases', c);
    const k = (D().coverage_cases || []).findIndex(x => String(x.id) === String(c.id)); if(k >= 0) D().coverage_cases[k] = c;
    /* its card, if it still has one */
    const it = opts.item || cardFor(c);
    if(it && it.status === 'open'){
      it.status = 'done'; it.closed_at = now; it.closed_by = a.email; it.close_note = 'Answered: ' + words + (why ? ' (' + why + ')' : '');
      if(typeof opsLog === 'function') opsLog(it, 'Answered: the shift was ' + words);
      await persist('ops_items', it);
    }
    opEvent('item_resolved', { item:it || { id:'ops_covq_' + c.id, kind:'coverage_outcome', domain:'scheduling_coverage' }, summary:(c.client || 'A client') + '’s shift was ' + words + (why ? ' (' + why + ')' : '') + ' (recorded after the shift)' });
    if(famId && !(D().ops_items || []).some(x => x.id === famId)){
      const fam = { id:famId, kind:'family_call', case_id:c.id, status:'open', domain:'scheduling_coverage',
        title:'Call ' + (c.client || 'the client') + '’s family: the shift wasn’t covered', about:c.client || '',
        detail:'Nobody covered this shift. A person calls the family; the Hub never contacts them by itself. Record the call on this card.',
        owner:a.email, owner_name:a.name, urgency:'urgent', due:new Date(Date.now() + 3600000).toISOString(),
        created_at:now, created_by:a.email, opened_by:'loops' };
      if(typeof opsOwnerHistory === 'function') opsOwnerHistory(fam, { from:'', from_name:'', to:a.email, to_name:a.name, how:'assigned', note:'You recorded the shift as not covered' });
      (D().ops_items = D().ops_items || []).push(fam); await persist('ops_items', fam);
    }
    ST.sel.delete(String(c.id)); delete ST.look[c.id];
    if(!opts.quiet){ ccToast(how === 'uncovered' ? '✓ Recorded. A "call the family" card is on your list.' : '✓ Recorded: ' + words); redraw(); }
    return true;
  }
  async function answerOne(caseId, how){
    if(how === 'not_needed'){
      const why = await ccPrompt('Not needed: why was no care owed? (for example: care hadn\'t started yet)');
      if(why == null) return; if(!String(why).trim()){ ccToast('Say why, so the record shows it.'); return; }
      return answer(caseId, how, { why });
    }
    const L = ST.look[caseId], who = L && L.mine && (L.mine.find(x => x.v.caregiver && x.v.clock_in) || {}).v;
    return answer(caseId, how, { covered_by: who ? who.caregiver : '' });
  }
  /* owners: several at once, with one reason */
  async function answerChecked(how){
    if(!isOwner()){ alert('Only Samantha or Zachary can answer several at once.'); return; }
    const ids = [...ST.sel]; if(!ids.length) return;
    const why = String(ST.why || (document.getElementById('caaWhy') || {}).value || '').trim();
    if(!why){ ccToast('Say why, once for all of them, so the record shows it.'); return; }
    if(!(await ccConfirm('Answer ' + ids.length + ' call-off' + (ids.length === 1 ? '' : 's') + ' as "' + (ANSWERS.find(a => a[0] === how) || [])[1] + '"?\n\nReason: ' + why + '\n\nNothing is sent to anyone.' + (how === 'uncovered' ? ' Each one gets a call-the-family card for you.' : '')))) return;
    let n = 0; for(const id of ids) if(await answer(id, how, { why, quiet:true })) n++;
    ST.why = '';
    ccToast('✓ Recorded ' + n + ' of ' + ids.length + ': ' + wordsFor(how)); redraw();
  }
  function toggle(id, on){ if(on) ST.sel.add(String(id)); else ST.sel.delete(String(id)); redraw(); }
  function checkAll(ids, on){ (ids || []).forEach(id => on ? ST.sel.add(String(id)) : ST.sel.delete(String(id))); redraw(); }

  /* ── the card: five answers, and a look at AxisCare ───────────────────────────────────────────────────── */
  const btn = (on, label, primary) => '<button class="' + (primary ? 'primary' : 'ghost') + '" style="padding:5px 11px;font-size:12px;" onclick="' + on + '">' + label + '</button>';
  function lookHtml(caseId){
    const L = ST.look[caseId];
    if(!L) return btn("CAA.look('" + esc(caseId) + "')", 'What AxisCare shows');
    if(L.loading) return '<span class="field-note">Reading AxisCare…</span>';
    if(L.err) return '<span class="field-note" style="color:var(--red);">Couldn\'t read AxisCare: ' + esc(L.err) + '</span> ' + btn("CAA.look('" + esc(caseId) + "')", 'Try again');
    return '<span style="font-size:12.5px;"><b>AxisCare:</b> ' + esc(L.say) + (L.hint ? ' <span class="field-note">' + esc(L.hint) + '</span>' : '') + '</span>';
  }
  function answerButtons(caseId, suggest){
    return ANSWERS.map(a => btn("CAA.answerOne('" + esc(caseId) + "','" + a[0] + "')", a[1], !!suggest && a[0] === suggest)).join('');   /* only AxisCare's evidence picks one */
  }
  function cardActions(it){
    const cid = String(it.case_id || '');
    return '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">' + answerButtons(cid, (ST.look[cid] || {}).suggest) + '</div>'
      + '<div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' + lookHtml(cid) + '<span class="field-note">Answering closes the call-off and this card. No texts are sent.</span></div>';
  }
  /* any other way of closing the card asks the question instead */
  function ask(it, anchor){
    const cid = String(it.case_id || '');
    const el = ccPopOpen(anchor || document.body, '<div style="font-size:13.5px;font-weight:700;margin-bottom:2px;">Was it covered?</div>'
      + '<div class="field-note" style="margin-bottom:8px;">This card closes with an answer, so the call-off is recorded too. ' + esc(it.about || it.title || '') + '</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;">' + answerButtons(cid, (ST.look[cid] || {}).suggest) + '</div>'
      + '<div style="margin-top:8px;">' + lookHtml(cid) + '</div>', { width:380 });
    el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { if(!/AxisCare|Try again/.test(b.textContent)) ccPopClose(); }));
    return el;
  }
  const guards = it => !!(it && it.kind === 'coverage_outcome' && it.status === 'open' && showing());

  /* ── Cara > Was it covered? ───────────────────────────────────────────────────────────────────────────── */
  function count(){ return showing() ? waiting().length : 0; }
  function list(){
    const all = waiting(), owner = isOwner();
    if(!all.length) return '<div class="card" style="padding:18px;color:var(--text-muted);font-size:13.5px;">Every finished call-off has an answer. That is the goal state.</div>';
    const pv = !live(settings()) && owner ? '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:#EEF4FB;border:1px solid #C9DAF0;border-radius:10px;padding:8px 12px;margin:0 0 10px;font-size:13px;"><b>Preview.</b> Only you see this tab and the new card buttons, in this browser.<span style="flex:1;"></span><button class="secondary" style="font-size:12px;padding:3px 10px;" onclick="CAA.preview(false)">Stop my preview</button></div>' : '';
    const nCard = all.filter(c => { const i = cardFor(c); return i && i.status === 'open'; }).length;
    const head = '<div style="font-size:13.5px;color:var(--text-muted);margin:0 0 10px;max-width:80ch;">These shifts are over, and Cara couldn\'t tell from AxisCare whether someone worked them. Each needs a person\'s answer so the record and the reports are right. '
      + all.length + ' waiting, ' + nCard + ' with a card on someone\'s list. Answering sends nothing to anyone.</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px;">' + btn('CAA.lookAll()', 'Check all in AxisCare', true)
      + (owner ? '<span class="field-note">Owners: tick several to answer them at once.</span>' : '') + '</div>';
    const bulk = owner && ST.sel.size ? '<div class="card" style="padding:10px 14px;margin:0 0 10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-color:var(--navy);">'
      + '<b>' + ST.sel.size + ' ticked.</b><input id="caaWhy" placeholder="Why (once for all of them)" value="' + esc(ST.why) + '" oninput="CAA._.ST.why=this.value" style="flex:1;min-width:220px;font-size:13px;">'
      + ANSWERS.map(a => btn("CAA.answerChecked('" + a[0] + "')", a[1])).join('') + btn('CAA.checkAll(' + esc(JSON.stringify([...ST.sel])) + ',false)', 'Untick all') + '</div>' : '';
    /* group by client so a run of the same open slot reads as one thing */
    const groups = []; const byClient = {};
    all.forEach(c => { const k = String(c.client_axiscare_id || c.client || c.id); if(!byClient[k]){ byClient[k] = { name:c.client_axiscare_id ? (c.client || 'AxisCare client #' + c.client_axiscare_id) : 'No client attached', cases:[] }; groups.push(byClient[k]); } byClient[k].cases.push(c); });
    const rows = groups.map(g => {
      const ids = g.cases.map(c => String(c.id)), allOn = ids.every(id => ST.sel.has(id));
      return '<div class="card" style="padding:0;margin:0 0 12px;overflow:hidden;">'
        + '<div style="display:flex;gap:10px;align-items:center;padding:10px 14px;background:var(--bg);border-bottom:1px solid var(--border);">'
        + (owner ? '<input type="checkbox" style="width:auto;flex:none;margin:0;" ' + (allOn ? 'checked' : '') + ' onchange="CAA.checkAll(' + esc(JSON.stringify(ids)) + ',this.checked)" title="Tick all ' + g.cases.length + '">' : '')
        + '<b style="color:var(--navy);font-size:14.5px;text-align:left;flex:none;">' + esc(g.name) + '</b><span class="field-note">' + g.cases.length + ' waiting</span></div>'
        + g.cases.map(c => { const it = cardFor(c), L = ST.look[c.id] || {};
          const card = it && it.status === 'open' ? 'Card on ' + esc(ownerName(it.owner)) + '\'s list' + (it.escalation && it.escalation.to_name && !it.escalation.cleared_at ? ', escalated to ' + esc(it.escalation.to_name) : '') : '<span style="color:var(--red);font-weight:700;">No card: nobody is being asked</span>';
          return '<div class="caa-row" data-case="' + esc(c.id) + '" style="padding:10px 14px;border-top:1px solid var(--border);display:grid;gap:6px;">'
            + '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;">' + (owner ? '<input type="checkbox" style="width:auto;flex:none;margin:0;" ' + (ST.sel.has(String(c.id)) ? 'checked' : '') + ' onchange="CAA.toggle(\'' + esc(c.id) + '\',this.checked)">' : '')
            + '<b>' + esc(whenText(c)) + '</b><span class="field-note">' + esc(howOpened(c)) + '</span><span class="field-note">· waiting ' + esc(ago(c.outcome_asked_at || c.opened_at)) + ' · ' + card + '</span></div>'
            + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">' + answerButtons(c.id, L.suggest) + '</div>'
            + '<div>' + lookHtml(c.id) + '</div></div>'; }).join('')
        + '</div>';
    }).join('');
    return pv + head + bulk + rows;
  }

  /* Settings (data-set calloff-answers): the switch, owners only */
  function settingsFill(){
    const now = document.getElementById('caaSetNow'), b = document.getElementById('caaToggleBtn'), pv = document.getElementById('caaPreviewBtn'); if(!now) return;
    const on = live(settings()), owner = isOwner();
    now.innerHTML = (on ? '<b style="color:#1E8449;">On.</b> Everyone has the Was it covered? tab and the new card buttons.'
      : '<b style="color:#B7791F;">Off.</b> Cards work as before' + (preview() ? ', except for you (preview, this browser).' : '.')) + (owner ? '' : ' Only Samantha or Zachary can change this.');
    if(b){ b.textContent = on ? 'Turn off Was it covered? answers' : 'Turn on Was it covered? answers for everyone'; b.style.display = owner ? '' : 'none'; }
    if(pv){ pv.textContent = preview() ? 'Stop my preview' : 'Preview it (only me)'; pv.style.display = owner && !on ? '' : 'none'; }
  }
  async function toggleLive(btnEl){
    if(!isOwner()){ alert('Only Samantha or Zachary can change this.'); return; }
    const on = !live(settings());
    if(!(await ccConfirm(on ? 'Turn on Was it covered? answers for everyone?\n\nCara gets a Was it covered? tab listing every finished call-off still waiting for an answer, with what AxisCare shows. The cards get five answers (including Not needed) and close only with an answer. Nothing is sent to anyone.'
      : 'Turn off Was it covered? answers? The tab goes away and the cards work as before.'))) return;
    if(btnEl) btnEl.disabled = true;
    const out = await tkMerge(m => { m.calloff_answers_live = on; if(on && !m.calloff_answers_live_since) m.calloff_answers_live_since = new Date().toISOString(); return ['Was it covered? answers ' + (on ? 'ON' : 'OFF')]; }, 'Was it covered? answers');
    if(btnEl) btnEl.disabled = false;
    const sv = document.getElementById('caaSaved'); if(sv) sv.textContent = out.error ? ('Could not save: ' + out.error.message) : (on ? 'On.' : 'Off.');
    settingsFill(); redraw();
  }
  function setPreviewAndDraw(on){ setPreview(!!on); try{ if(typeof COV_SUB !== 'undefined' && !on && COV_SUB === 'answers') covSubGo('calloffs'); }catch(e){} settingsFill(); redraw(); }

  root.CAA = { live, showing, preview:setPreviewAndDraw, previewOn:preview, count, list, look, lookAll, answer, answerOne, answerChecked, toggle, checkAll,
    cardActions, ask, guards, settingsFill, toggle_:toggleLive,
    /* for the tests */ _:{ ST, window_, verdict, howOpened, wordsFor, waiting, ANSWERS } };
})(typeof window !== 'undefined' ? window : globalThis);
