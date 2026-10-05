/* =====================================================================================================================
   THE STAFFING VIEW OF TODAY (Today cockpit, Phase 4; Samantha approved 2026-10-05). Same data as everything else,
   arranged for whoever is on Staffing duty: what needs confirming, what's open today and who's been asked, late or
   missing clock-ins, and tomorrow's risks. Shown on the Dashboard under the Stand-Up card: open for the person on
   Staffing duty now, folded for everyone else (one tap opens it, remembered in this browser).
   Reads only: coverage_cases and timekeeper_cases (fresh from the database), and tomorrow's schedule from AxisCare
   (coverage-shifts live_schedule, the same read Live Schedule uses). Sends nothing, changes nothing.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s));
  const SV = { cases: null, tk: null, at: 0, tomorrow: null, tomorrowAt: 0, busy: null, open: null };
  const chiDate = (addDays) => { const d = new Date(Date.now() + (addDays || 0) * 864e5);
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }); };
  const t12 = (hm) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(hm || '')); if(!m) return String(hm || ''); let h = +m[1]; const ap = h < 12 ? 'am' : 'pm'; h = h % 12 || 12; return h + (m[2] === '00' ? '' : ':' + m[2]) + ap; };
  const span = (s) => String(s || '').split('-').map(t12).filter(Boolean).join('-');
  const minsUntil = (date, hm) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(hm || '')); if(!m || !date) return null;
    const nowChi = new Date().toLocaleString('sv-SE', { timeZone: 'America/Chicago' }).replace(' ', 'T');
    return Math.round((Date.parse(date + 'T' + m[1].padStart(2, '0') + ':' + m[2] + ':00Z') - Date.parse(nowChi.slice(0, 16) + ':00Z')) / 60000); };
  const meEmail = () => { try{ return String(ccActor().email || '').toLowerCase(); }catch(e){ return ''; } };
  const onStaffingNow = () => { try{ return typeof routeSeatNow === 'function' && routeSeatNow('staffing').person === meEmail(); }catch(e){ return false; } };
  const holderName = () => { try{ const s = routeSeatNow('staffing'); return (opsOwnerName(s.person) || s.person || '').split(' ')[0]; }catch(e){ return ''; } };
  function remembered(){ try{ const v = localStorage.getItem('cc_staffing_view'); return v === null ? null : v === '1'; }catch(e){ return null; } }
  function remember(on){ try{ localStorage.setItem('cc_staffing_view', on ? '1' : '0'); }catch(e){} }

  async function readKey(k){ const { data } = await sb.from('app_data').select('data').eq('key', k).maybeSingle(); return Array.isArray(data && data.data) ? data.data : []; }
  async function load(force){
    if(SV.busy) return SV.busy;
    if(!force && SV.cases && Date.now() - SV.at < 60000) return;
    SV.busy = (async () => {
      try{ const [c, t] = await Promise.all([readKey('coverage_cases'), readKey('timekeeper_cases')]); SV.cases = c; SV.tk = t; SV.at = Date.now(); }
      catch(e){ SV.cases = SV.cases || (DATA.coverage_cases || []); SV.tk = SV.tk || (DATA.timekeeper_cases || []); }
      finally{ SV.busy = null; }
    })();
    return SV.busy;
  }
  async function loadTomorrow(){
    if(SV.tomorrow && Date.now() - SV.tomorrowAt < 10 * 60000) return;
    try{
      const s = await sb.auth.getSession(); const tok = s && s.data && s.data.session && s.data.session.access_token;
      if(!tok || typeof CONFIG === 'undefined') { SV.tomorrow = { error: 'not signed in' }; return; }
      const r = await fetch(CONFIG.supabase_url + '/functions/v1/coverage-shifts', { method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, apikey: CONFIG.supabase_anon_key },
        body: JSON.stringify({ live_schedule: true, date: chiDate(1) }) });
      const j = await r.json().catch(() => ({}));
      SV.tomorrow = r.ok && Array.isArray(j.rows) ? j : { error: j.error || ('HTTP ' + r.status) };
    }catch(e){ SV.tomorrow = { error: 'AxisCare did not answer' }; }
    SV.tomorrowAt = Date.now();
  }

  /* What a case's asking looks like right now. */
  function asks(c){
    const a = Array.isArray(c.asked) ? c.asked : [];
    const yes = a.filter(x => x.state === 'yes'), no = a.filter(x => x.state === 'no'), wait = a.filter(x => x.state === 'waiting' || !x.state);
    const last = a.map(x => Date.parse(x.at || 0)).filter(Number.isFinite).sort((p, q) => q - p)[0];
    return { n: a.length, yes, no: no.length, wait: wait.length, last };
  }
  const ago = ms => { const m = Math.max(0, Math.round((Date.now() - ms) / 60000)); return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + 'm'; };

  /* The view's sections, from the data. Pure enough to test. */
  function sections(cases, tk, tomorrowRows){
    const today = chiDate(0), tom = chiDate(1);
    const open = (cases || []).filter(c => c && c.status === 'open' && String(c.kind) !== 'interest');
    const confirm = open.filter(c => asks(c).yes.length);
    const todayCases = open.filter(c => String(c.shift_date) === today)
      .sort((a, b) => String(a.shift_time).localeCompare(String(b.shift_time)));
    const clockins = (tk || []).filter(l => l && !l.resolved_at && l.kind !== 'clock_out' && String(l.shift_date) === today && l.office_alerted_at)
      .sort((a, b) => String(a.shift_time).localeCompare(String(b.shift_time)));
    const tomCases = open.filter(c => String(c.shift_date) === tom);
    const caseVisits = new Set(open.map(c => String(c.axiscare_visit_id || '')).filter(Boolean));
    const tomOpen = (tomorrowRows || []).filter(r => !r.caregiver && !caseVisits.has(String(r.visit_id)));
    return { confirm, todayCases, clockins, tomCases, tomOpen };
  }

  function render(){
    const box = document.getElementById('staffingView'); if(!box) return;
    const mine = onStaffingNow();
    const want = SV.open != null ? SV.open : (remembered() != null ? remembered() : mine);
    const who = holderName();
    if(!want){
      box.innerHTML = '<div class="card" style="padding:10px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">'
        + '<b style="color:var(--navy);">Staffing view</b><span class="field-note">' + (who ? esc(who) + ' is on Staffing duty now.' : '') + '</span>'
        + '<span style="flex:1;"></span><button class="secondary" style="padding:5px 12px;font-size:12.5px;" onclick="svToggle(true)">Show</button></div>';
      return;
    }
    if(!SV.cases){ box.innerHTML = '<div class="card" style="padding:12px 16px;"><b style="color:var(--navy);">Staffing view</b> <span class="field-note">Loading…</span></div>'; load().then(render); return; }
    const S = sections(SV.cases, SV.tk, SV.tomorrow && SV.tomorrow.rows);
    const go = (hash) => 'onclick="location.hash=\'' + esc(hash) + '\'" style="cursor:pointer;"';
    const row = (main, sub, right, hash) => '<div class="hero-row" ' + (hash ? go(hash) : '') + '>'
      + '<div class="m">' + main + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>' + (right ? '<div class="go">' + right + '</div>' : '') + '</div>';
    const sec = (title, n, body, empty) => '<div style="margin-top:10px;"><div style="font-size:11.5px;font-weight:800;letter-spacing:.06em;color:var(--text-muted);">'
      + esc(title) + (n != null ? ' · ' + n : '') + '</div>' + (n ? body : '<div class="field-note" style="padding:4px 0;">' + esc(empty) + '</div>') + '</div>';
    const caseLine = (c) => { const a = asks(c), m = minsUntil(c.shift_date, String(c.shift_time || '').split('-')[0]);
      const status = a.yes.length ? '<b style="color:var(--teal);">' + esc(a.yes.map(x => String(x.name || '').split(' ')[0]).join(', ')) + ' said yes</b>'
        : a.n ? a.n + ' asked · ' + a.no + ' said no · ' + a.wait + ' waiting' + (a.last ? ' · last ask ' + ago(a.last) + ' ago' : '')
        : '<span style="color:var(--red);">nobody asked yet</span>';
      return row('<b>' + esc(c.client || 'Client') + '</b> · ' + esc(span(c.shift_time))
        + (m != null ? (m <= 0 ? ' <span style="color:var(--red);">started ' + (-m) + 'm ago</span>' : m <= 180 ? ' <span style="color:' + (m <= 60 ? 'var(--red)' : 'var(--amber)') + ';">starts in ' + (m >= 60 ? Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '') : m + 'm') + '</span>' : '') : ''),
        (c.calling_off ? esc(c.calling_off) + ' called off · ' : 'Open shift · ') + status, 'Open', '#cara/case/' + encodeURIComponent(String(c.id))); };
    const tomError = SV.tomorrow && SV.tomorrow.error;
    box.innerHTML = '<div class="card" style="padding:13px 16px;">'
      + '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;">'
      + '<b style="font-size:16px;color:var(--navy);">Staffing view</b>'
      + '<span class="field-note">' + (mine ? 'You’re on Staffing duty now.' : (who ? esc(who) + ' is on Staffing duty now.' : '')) + '</span>'
      + '<span style="flex:1;"></span>'
      + '<span class="field-note" style="cursor:pointer;text-decoration:underline;" onclick="svRefresh()">Refresh</span>'
      + '<span class="field-note" style="cursor:pointer;text-decoration:underline;" onclick="svToggle(false)">Fold away</span></div>'
      + sec('ACCEPTED, NEEDS CONFIRMING', S.confirm.length, S.confirm.map(caseLine).join(''), 'Nobody is waiting for a confirmation.')
      + sec('OPEN SHIFTS AND CALL-OFFS TODAY', S.todayCases.length, S.todayCases.map(caseLine).join(''), 'No open shifts today.')
      + sec('LATE OR MISSING CLOCK-INS', S.clockins.length, S.clockins.map(l => row('<b>' + esc(l.caregiver || 'Caregiver') + '</b> · ' + esc(l.client_first || '') + '’s ' + esc(t12(l.shift_time)) + ' shift',
          (l.minutes_late != null ? l.minutes_late + ' min late · ' : '') + (l.texted_at ? 'caregiver texted' : 'caregiver not texted') + (l.admin_loop && l.admin_loop.sends ? ' · office alerted' : ''), 'My Work', '#mywork')).join(''), 'Every shift that started has a clock-in.')
      + sec('TOMORROW', S.tomCases.length + S.tomOpen.length,
          S.tomCases.map(caseLine).join('') + S.tomOpen.map(r => row('<b>' + esc(r.client) + '</b> · ' + esc(span(r.time + (r.end ? '-' + r.end : ''))), 'In AxisCare with nobody on it, and no coverage case yet', 'Cover', '#coverage')).join(''),
          tomError ? 'Couldn’t read tomorrow’s schedule from AxisCare just now (' + tomError + ').' : (SV.tomorrow ? 'Every shift tomorrow has a caregiver.' : 'Checking tomorrow’s schedule…'))
      + '<div class="field-note" style="margin-top:8px;">The same information as the Cara board and My Work, arranged for staffing. Nothing here sends anything.</div>'
      + '</div>';
    if(!SV.tomorrow) loadTomorrow().then(render);
  }
  function svToggle(on){ SV.open = !!on; remember(!!on); render(); if(on) load(true).then(render); }
  async function svRefresh(){ SV.tomorrowAt = 0; SV.tomorrow = null; await load(true); render(); }

  Object.assign(window, { svRender: render, svToggle, svRefresh, SVX: { sections, asks, chiDate, SV } });
})();
