/* =====================================================================================================================
   AFTER-HOURS SHIFT CARD (Samantha 2026-11-09: "I want her to be after-hours care coordinator, M-F" ... "We will
   eventually hire an after-hours care coordinator for the weekends as well". Plan: Katlin's Portal Plan doc.)
   Built for the ROLE, not one person: whoever holds a window in the After Hours duty area (Who's on duty) sees this
   card at the top of My Work. Katlin = Mon-Fri 5:30pm to 7:30pm; a weekend hire is just another window. Hours are
   always Missouri hours; people working from another time zone also see their own clock.
   The card: shift bar (on now / next shift, both clocks) · tonight's interviews (their own interview bookings) ·
   their role card (Every shift / Done means / Not yours, written by an owner in Settings > After-Hours Care
   Coordinator, saved in ops_settings.after_hours_role through tkMerge, so who changed what and when is kept) · how
   to reach the office (card conversations, End my shift).
   Being on an After Hours window also makes them "on shift" for Team Work (team-work.js OFFICE_AREAS), as Samantha
   chose 2026-11-09. Nothing here texts, emails or calls anyone.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const W = root, AREA = 'after_hours', MIN = 60000;
  const lc = s => String(s || '').trim().toLowerCase();
  const D = () => { try{ return DATA || {}; }catch(e){ return {}; } };
  /* sb is a top-level let in index.html, so it is not on window: read it by name */
  const SB = () => { try{ return sb || null; }catch(e){ return null; } };
  const esc = s => (typeof W.escapeHtmlComms === 'function' ? W.escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
  const me = () => { try{ return lc(W.ccActor().email); }catch(e){ return ''; } };
  const owner = () => { try{ return !!W.ccIsOwner(); }catch(e){ return false; } };   /* same check as the Overnight Handoff */
  const nameOf = e => { try{ return (typeof W.opsOwnerName === 'function' && W.opsOwnerName(e)) || String(e || '').split('@')[0]; }catch(_){ return String(e || '').split('@')[0]; } };
  const first = e => String(nameOf(e) || '').split(' ')[0];
  const covers = (w, t) => (typeof W.dutyCoversAt === 'function' ? W.dutyCoversAt(w, t) : false);

  /* ── the rules (pure apart from covers) ── */
  /* Their After Hours windows: active, not planned, theirs. */
  function windowsOf(rows, email){
    const e = lc(email); if(!e) return [];
    return (rows || []).filter(w => w && w.area === AREA && w.active !== false && lc(w.person) === e
      && !(typeof W.rowPlanned === 'function' && W.rowPlanned(w)));
  }
  /* Everyone who holds an After Hours window (for Settings). */
  function holders(rows){
    const s = {}; (rows || []).forEach(w => { if(w && w.area === AREA && w.active !== false && w.person) s[lc(w.person)] = 1; });
    return Object.keys(s);
  }
  /* On now (and until when), else when the next shift starts and ends. 5-minute steps, 8 days ahead. */
  function shift(ws, now, cov){
    const any = t => ws.some(w => cov(w, new Date(t)));
    const endFrom = t => { for(let m = 5; m <= 24 * 60; m += 5) if(!any(t + m * MIN)) return t + m * MIN; return null; };
    if(!ws.length) return { on:false, start:null, end:null };
    if(any(now)) return { on:true, start:null, end:endFrom(now) };
    for(let m = 5; m <= 8 * 24 * 60; m += 5){ const t = now + m * MIN; if(any(t)) return { on:false, start:t, end:endFrom(t) }; }
    return { on:false, start:null, end:null };
  }
  /* "Mon 5:30pm" in a time zone */
  function clock(t, tz, withDay){
    const o = { timeZone:tz, hour:'numeric', minute:'2-digit' }; if(withDay) o.weekday = 'short';
    return new Date(t).toLocaleString('en-US', o).replace(/\s?([AP])M/, (x, a) => a.toLowerCase() + 'm').replace(',', '');
  }
  const localTz = () => { try{ return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago'; }catch(e){ return 'America/Chicago'; } };
  const sameClock = (t, tz) => clock(t, tz, true) === clock(t, 'America/Chicago', true);
  /* "5:30pm Missouri (6:30am your time)", the second part only when their clock differs */
  function both(t, withDay){
    const tz = localTz(), mo = clock(t, 'America/Chicago', withDay) + ' Missouri';
    return sameClock(t, tz) ? mo : mo + ' (' + clock(t, tz, withDay) + ' your time)';
  }
  const lines = s => String(s || '').split(/\r?\n/).map(x => x.replace(/^[\s\-•*]+/, '').trim()).filter(Boolean);
  function role(){ const r = (D().ops_settings || {}).after_hours_role || {}; return { every:lines(r.every_shift), done:lines(r.done_means), notyours:lines(r.not_yours), by:r.updated_by_name || '', at:r.updated_at || '' }; }

  /* ── tonight's interviews: their interview bookings today and tomorrow (Missouri days) ── */
  const IV = { at:0, busy:false, rows:null, err:'' };
  async function loadInterviews(email){
    if(IV.busy || (IV.rows && Date.now() - IV.at < 2 * 60000) || !SB()) return;
    IV.busy = true;
    try{
      const c = await SB().from('coordinators').select('id,name,email');
      if(c.error) throw c.error;
      const ids = (c.data || []).filter(x => lc(x.email) === lc(email)).map(x => x.id);
      let rows = [];
      if(ids.length){
        const from = Date.now() - 6 * 3600e3, to = Date.now() + 30 * 3600e3;
        const b = await SB().from('interview_bookings').select('id,applicant_id,starts_at,status,coordinator_id').in('coordinator_id', ids)
          .in('status', ['booked','attended','noshow']).gte('starts_at', new Date(from).toISOString()).lt('starts_at', new Date(to).toISOString()).order('starts_at');
        if(b.error) throw b.error;
        rows = b.data || [];
        const aids = [...new Set(rows.map(x => x.applicant_id).filter(Boolean))];
        if(aids.length){
          const a = await SB().from('job_applicants').select('id,first_name,last_name').in('id', aids);
          const nm = {}; ((a && a.data) || []).forEach(x => { nm[x.id] = [x.first_name, x.last_name].filter(Boolean).join(' '); });
          rows.forEach(r => { r.name = nm[r.applicant_id] || 'Applicant'; });
        }
      }
      IV.rows = rows; IV.err = ids.length ? '' : 'noroom';
    }catch(e){ IV.rows = []; IV.err = String(e && e.message || e || 'error'); }
    finally{ IV.at = Date.now(); IV.busy = false; }
    pin();
  }

  /* ── drawing ── */
  function css(){
    if(document.getElementById('afhCss')) return;
    const st = document.createElement('style'); st.id = 'afhCss';
    st.textContent = '.afh{background:#fff;border:1px solid var(--border);border-left:4px solid var(--navy);border-radius:10px;padding:12px 16px;margin:0 0 12px;display:grid;gap:10px}'
      + '.afh-top{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.afh-k{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted)}'
      + '.afh-h{font-size:16px;font-weight:700;color:var(--navy)}.afh-on{color:#1E7A46}.afh-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}'
      + '.afh-box{border:1px solid var(--border);border-radius:8px;padding:8px 12px;min-width:0}.afh-box ul{margin:4px 0 0;padding-left:18px;font-size:13px}.afh-box li{margin:2px 0}'
      + '.afh-iv{display:flex;gap:8px;align-items:baseline;font-size:13px;padding:4px 0;border-top:1px solid var(--border)}.afh-iv:first-of-type{border-top:0}'
      + '@media(max-width:900px){.afh-grid{grid-template-columns:1fr}}';
    document.head.appendChild(st);
  }
  function cardHtml(email, preview){
    const ws = windowsOf(D().duty_windows, email), s = shift(ws, Date.now(), covers), r = role();
    let bar;
    if(s.on) bar = '<span class="afh-h afh-on">On shift now</span><span class="field-note">until ' + esc(both(s.end, false)) + '</span>';
    else if(s.start) bar = '<span class="afh-h">Next shift</span><span class="field-note">' + esc(both(s.start, true)) + (s.end ? ' to ' + esc(both(s.end, false)) : '') + '</span>';
    else bar = '<span class="afh-h">No After Hours shift scheduled</span>';
    const ul = (arr, empty) => arr.length ? '<ul>' + arr.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '<div class="field-note">' + empty + '</div>';
    const notYet = owner() ? 'Not written yet: Settings, After-Hours Care Coordinator.' : 'Not written yet.';
    let iv;
    if(preview) iv = '<div class="field-note">Their own interview bookings show here.</div>';
    else if(!IV.rows) iv = '<div class="field-note">Loading…</div>';
    else if(IV.err === 'noroom') iv = '<div class="field-note">You are not set up as an interviewer yet, so no interviews can be booked with you.</div>';
    else if(IV.err) iv = '<div class="field-note">Could not load interviews: ' + esc(IV.err) + '</div>';
    else if(!IV.rows.length) iv = '<div class="field-note">No interviews booked with you today.</div>';
    else iv = IV.rows.map(b => '<div class="afh-iv"><b style="min-width:150px">' + esc(both(Date.parse(b.starts_at), false)) + '</b><span>' + esc(b.name)
      + (b.status === 'attended' ? ' <span class="field-note">done</span>' : b.status === 'noshow' ? ' <span class="field-note">no-show</span>' : '') + '</span></div>').join('');
    return '<div class="afh"' + (preview ? '' : ' id="afhCard"') + '>'
      + '<div class="afh-top"><span class="afh-k">After-Hours Care Coordinator' + (preview ? ' · ' + esc(nameOf(email)) : '') + '</span>' + bar + '</div>'
      + '<div class="afh-box"><div class="afh-k">Interviews</div>' + iv + '</div>'
      + '<div class="afh-grid">'
      + '<div class="afh-box"><div class="afh-k">Every shift</div>' + ul(r.every, notYet) + '</div>'
      + '<div class="afh-box"><div class="afh-k">Done means</div>' + ul(r.done, notYet) + '</div>'
      + '<div class="afh-box"><div class="afh-k">Not yours: hand to Samantha</div>' + ul(r.notyours, notYet) + '</div></div>'
      + '<div class="field-note">Questions for the office: write on the card itself; the office answers on their next shift. When you finish, press End my shift so the morning team gets your handoff.</div>'
      + '</div>';
  }
  /* My Work: index.html renderMyWork calls AFH.pin() */
  function pin(){
    const box = document.getElementById('afhPin'); if(!box) return;
    const e = me();
    if(!windowsOf(D().duty_windows, e).length){ box.innerHTML = ''; return; }
    css(); loadInterviews(e);
    box.innerHTML = cardHtml(e, false);
  }

  /* ── Settings > After-Hours Care Coordinator (owners edit; everyone reads) ── */
  function settingsFill(){
    const host = document.getElementById('afhSet'); if(!host) return;
    css();
    const rows = D().duty_windows || [], hs = holders(rows), r = (D().ops_settings || {}).after_hours_role || {};
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const who = hs.length ? hs.map(e => '<div style="font-size:13px;padding:2px 0;"><b>' + esc(nameOf(e)) + '</b> <span class="field-note">'
      + windowsOf(rows, e).map(w => w.recur ? (w.recur.days || []).map(d => days[d]).join(' ') + ' ' + (typeof W.dutyClockRange === 'function' ? W.dutyClockRange(w.recur.from, w.recur.to) : (w.recur.from + ' to ' + w.recur.to)) : 'one-off ' + String(w.start || '').slice(0, 16).replace('T', ' ')).join(' · ')
      + ' (Missouri time)</span></div>').join('') : '<div class="field-note">Nobody yet. Add an After Hours window in Who\'s on duty: person, days, Missouri hours.</div>';
    const ta = (id, label, v, hint) => '<label class="field-note" for="' + id + '" style="display:block;margin-top:8px;"><b>' + label + '</b> · ' + hint + '</label>'
      + '<textarea id="' + id + '" rows="4" style="width:100%;box-sizing:border-box;"' + (owner() ? '' : ' disabled') + '>' + esc(v || '') + '</textarea>';
    host.innerHTML = '<div style="margin:6px 0 10px;"><div class="afh-k">On After Hours</div>' + who + '</div>'
      + ta('afhEvery', 'Every shift', r.every_shift, 'what a good shift includes, one per line')
      + ta('afhDone', 'Done means', r.done_means, 'how they know a task is finished, one per line')
      + ta('afhNot', 'Not yours', r.not_yours, 'what to hand back to Samantha, one per line')
      + (owner() ? '<div style="display:flex;gap:8px;align-items:center;margin-top:8px;"><button class="secondary" onclick="AFH.saveRole(this)">Save the role card</button><span class="field-note" id="afhSaved">'
        + (r.updated_at ? 'Last saved by ' + esc(first(r.updated_by) || r.updated_by_name || '') + ' on ' + esc(String(r.updated_at).slice(0, 10)) + '.' : '') + '</span></div>' : '<div class="field-note">Only Samantha or Zachary can change this.</div>')
      + (hs.length ? '<details style="margin-top:10px;"><summary class="field-note" style="cursor:pointer;">Preview what ' + esc(first(hs[0])) + ' sees</summary><div style="margin-top:8px;">' + cardHtml(hs[0], true) + '</div></details>' : '');
  }
  async function saveRole(btn){
    if(!owner()){ alert('Only Samantha or Zachary can change this.'); return; }
    const v = id => String((document.getElementById(id) || {}).value || '').trim();
    const next = { every_shift:v('afhEvery'), done_means:v('afhDone'), not_yours:v('afhNot'), updated_at:new Date().toISOString(), updated_by:me() };
    if(btn) btn.disabled = true;
    const r = typeof W.tkMerge === 'function' ? await W.tkMerge(m => { m.after_hours_role = next; return ['After-Hours role card updated']; }, 'After-Hours role card') : { error:{ message:'saving is not available here' } };
    if(btn) btn.disabled = false;
    const sv = document.getElementById('afhSaved'); if(sv) sv.textContent = r && r.error ? 'Could not save: ' + r.error.message : 'Saved.';
    try{ pin(); }catch(e){}
  }

  W.AFH = { pin, settingsFill, saveRole, windowsOf, holders, shift, both, clock, lines, role };
  if(typeof module !== 'undefined' && module.exports) module.exports = { windowsOf, holders, shift, clock, lines };
})(typeof window !== 'undefined' ? window : this);
