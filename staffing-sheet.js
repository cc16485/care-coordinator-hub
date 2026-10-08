/* =============================================================================
   staffing-sheet.js · "Where we can staff this week" (Referral Partner Desk Step 4, Samantha approved 2026-10-08)
   Rules: staffing-rules.js. Caregiver facts: coverage-shifts team_pool (the same read Team Builder uses: stated windows,
   stated weekly hours, and every AxisCare visit with its times for the next 14 days), caregiver_overlay (accepting new
   clients, travel towns, skills), coverage_do_not_offer, and the eligibility rules.
     · Staffing (next to Hours Watch): the sheet with names (internal), skill filters, an override per town/time (with a
       note), Confirm (Staffing Coordinators and owners; Monday, and any time after), the caregivers who still need an
       answer (accepting new clients? which towns?), and why everyone else isn't counted
     · Referrers desk: the confirmed sheet only, towns and times of day, flagged ones "being re-checked", and "Copy for
       a partner" (no names, no counts, no promised start)
     · Today: "Confirm this week's staffing sheet" until it's done, for Staffing and owners
   Confirmations live in ops_settings.staffing_sheet, saved through the logged settings save.
   ============================================================================= */
(function () {
  'use strict';
  const R = () => window.StaffingRules;
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
  const lc = s => String(s == null ? '' : s).trim().toLowerCase();
  const todayYmd = () => new Intl.DateTimeFormat('en-CA', { timeZone:'America/Chicago' }).format(new Date());
  const st = () => (typeof DATA !== 'undefined' && DATA.ops_settings) || {};
  const SS = { pool:null, loading:false, error:null, skills:[], over:{}, showAll:false, open:null };
  const canConfirm = () => { try{ return ccIsOwner() || (typeof CC_ROLES !== 'undefined' && (CC_ROLES || []).indexOf('staffing_coordinator') > -1); }catch(e){ return false; } };
  const towns = () => { const t = (window.PartnerRules ? PartnerRules.settings(st()).towns : []); return t.length ? t : (window.PD_DEFAULT_TOWNS || ['Springfield']); };
  const overlay = () => { const m = {}; (DATA.caregiver_overlay || []).forEach(o => { if(o && o.axiscare_id) m[String(o.axiscare_id)] = o; }); return m; };
  const dno = () => { const t = todayYmd(), s = new Set(); (DATA.coverage_do_not_offer || []).forEach(d => { if(d && d.axiscare_id && (!d.until || d.until >= t)) s.add(String(d.axiscare_id)); }); return s; };
  /* eligibility from the Hub's own rules when they're loaded; "needs verification" (working, training record not imported) still counts */
  const elig = ax => { try{ if(!globalThis.CCElig) return null; const c = (DATA.caregivers || []).find(g => String(g.axiscare_id || '') === String(ax)); return c ? CCElig.eligibility(c).state : null; }catch(e){ return null; } };
  const ctx = () => ({ today:todayYmd(), overlay:overlay(), towns:towns(), eligibility:elig, doNotOffer:dno(), skills:SS.skills, settings:st() });
  const SKILLS = [['dementia_care','Dementia'], ['hoyer_lift','Hoyer lift'], ['transfers_gait_belt','Transfers'], ['bedbound_care','Bedbound'], ['transportation','Transportation']];
  const day = iso => iso ? new Date(iso).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : '';

  async function load(force){
    if(SS.loading || (SS.pool && !force)) return;
    SS.loading = true; SS.error = null; paint();
    try{
      const s = await sb.auth.getSession(), tok = s && s.data && s.data.session && s.data.session.access_token; if(!tok) throw new Error('Sign in first.');
      const r = await fetch(CONFIG.supabase_url + '/functions/v1/coverage-shifts', { method:'POST', headers:{ Authorization:'Bearer ' + tok, apikey:CONFIG.supabase_anon_key, 'Content-Type':'application/json' }, body:JSON.stringify({ team_pool:true }) });
      const d = await r.json().catch(() => null); if(!r.ok || !d || d.error) throw new Error((d && d.error) || ('AxisCare answered ' + r.status));
      SS.pool = d.caregivers || [];
    }catch(e){ SS.error = String(e.message || e); }
    SS.loading = false; paint();
  }
  function paint(){ staffPaint(); deskPaint(); try{ if(typeof renderMyDay === 'function' && document.getElementById('myDayList')) renderMyDay(); }catch(e){} }

  /* ── Staffing's screen ── */
  function staffPaint(){
    const box = document.getElementById('ssRoot'); if(!box || !R()) return;
    if(!SS.pool){ box.innerHTML = card('<div class="ss-head"><b>Where we can staff this week</b><span style="flex:1"></span><button class="cara-btn ghost" onclick="ssLoad(true)">' + (SS.loading ? 'Loading…' : 'Load from AxisCare') + '</button></div>'
      + (SS.error ? '<div class="ss-err">Couldn\'t load: ' + esc(SS.error) + '</div>' : '<div class="field-note">Loads each caregiver\'s stated times and hours and their AxisCare visits, then works out where we could start a new client this week.</div>')); return; }
    const sh = R().sheet(SS.pool, ctx()), conf = st().staffing_sheet, rv = R().review(conf, sh, todayYmd());
    const showTowns = towns().filter(t => SS.showAll || R().WIN.some(w => sh.cells[t + '|' + w].status !== 'none' || (SS.over[t + '|' + w])));
    let h = '<div class="ss-head"><b>Where we can staff this week</b>'
      + (rv.confirmed ? '<span class="ss-ok">Confirmed by ' + esc(rv.by) + ', ' + esc(day(rv.at)) + '</span>' : '<span class="ss-warn">Not confirmed this week</span>')
      + (rv.flags.length ? '<span class="ss-warn">' + rv.flags.length + ' changed since then: re-check</span>' : '')
      + '<span style="flex:1"></span><button class="cara-btn ghost" onclick="ssLoad(true)">Refresh</button></div>'
      + '<div class="field-note">' + sh.counted + ' caregiver' + (sh.counted === 1 ? '' : 's') + ' counted. Open = 2 or more could take a new client, Limited = 1. Names are for the office only; partners see towns and times.</div>'
      + '<div class="ss-filters">Only caregivers with: ' + SKILLS.map(([k, l]) => '<label><input type="checkbox" ' + (SS.skills.indexOf(k) > -1 ? 'checked ' : '') + 'onchange="ssSkill(\'' + k + '\',this.checked)"> ' + l + '</label>').join('') + '</div>'
      + '<div class="ss-wrap"><table class="ss-grid"><thead><tr><th>Town</th>' + R().WIN.map(w => '<th>' + ({ morning:'Morning', afternoon:'Afternoon', evening:'Evening', overnight:'Overnight' })[w] + '</th>').join('') + '</tr></thead><tbody>'
      + showTowns.map(t => '<tr><td>' + esc(t) + '</td>' + R().WIN.map(w => { const k = t + '|' + w, c = sh.cells[k], o = SS.over[k], f = rv.flags.find(x => x.key === k);
          const names = c.ids.map(id => (SS.pool.find(p => String(p.axiscare_id || p.id) === id) || {}).name || id).join(', ');
          return '<td class="ss-' + (o ? o.status : c.status) + (f ? ' ss-flag' : '') + '" title="' + esc(names) + '"><button class="ss-cell" onclick="ssCell(\'' + esc(k) + '\')">' + ({ open:'Open', limited:'Limited', none:'·' })[o ? o.status : c.status]
            + (c.ids.length ? ' <small>' + c.ids.length + '</small>' : '') + (o ? ' <small>set by hand</small>' : '') + (f ? ' <small>changed</small>' : '') + '</button></td>'; }).join('') + '</tr>').join('')
      + '</tbody></table></div><label class="field-note"><input type="checkbox" ' + (SS.showAll ? 'checked ' : '') + 'onchange="ssAll(this.checked)"> Show every town we serve</label>'
      + (SS.open ? cellHtml(sh, SS.open) : '')
      + (canConfirm() ? '<div class="ss-confirm"><button class="primary" onclick="ssConfirm(this)">Confirm this week\'s sheet</button><span class="field-note"> Confirms what you see, including anything set by hand. You can confirm again any time this week.</span></div>' : '<div class="field-note">Staffing Coordinators and owners confirm the sheet.</div>');
    /* who still needs an answer, and why the rest aren't counted */
    const need = sh.excluded.filter(p => p.why.some(w => /not asked yet|travel towns not recorded/.test(w)) && !p.why.some(w => /no availability on file|older than|not eligible|do-not-offer|not accepting/.test(w)));
    if(need.length) h += '<div class="ss-need"><b>Needs an answer (' + need.length + ')</b><div class="field-note">Is each one accepting new clients, and which towns will they work in? Living in a town doesn\'t count by itself.</div>'
      + need.map(p => needRow(p)).join('') + '</div>';
    const rest = sh.excluded.filter(p => need.indexOf(p) < 0);
    if(rest.length) h += '<details class="ss-rest"><summary>Not counted (' + rest.length + ')</summary>' + rest.map(p => '<div><b>' + esc(p.name || p.ax) + '</b>: ' + esc(p.why.join('; ')) + '</div>').join('') + '</details>';
    box.innerHTML = card(h);
  }
  function card(h){ return '<div class="card ss-card">' + h + '</div>'; }
  function needRow(p){
    const ov = overlay()[p.ax] || {}, home = (SS.pool.find(g => String(g.axiscare_id || g.id) === p.ax) || {}).city || '';
    const acc = ov.accepting_new && ov.accepting_new.v, chosen = new Set((ov.travel_towns || []).map(lc));
    return '<div class="ss-nrow" id="ssn_' + esc(p.ax) + '"><div><b>' + esc(p.name || p.ax) + '</b>' + (home ? ' <span class="field-note">lives in ' + esc(home) + '</span>' : '') + '</div>'
      + '<div class="ss-acc">Accepting new clients? <label><input type="radio" name="ssa_' + esc(p.ax) + '" value="yes"' + (acc === 'yes' ? ' checked' : '') + '> Yes</label> <label><input type="radio" name="ssa_' + esc(p.ax) + '" value="no"' + (acc === 'no' ? ' checked' : '') + '> No</label></div>'
      + '<div class="ss-towns">' + towns().map(t => '<label class="ss-chip"><input type="checkbox" value="' + esc(t) + '"' + (chosen.has(lc(t)) ? ' checked' : '') + '> ' + esc(t) + '</label>').join('') + '</div>'
      + '<button class="fb" onclick="ssAnswer(\'' + esc(p.ax) + '\')">Save</button></div>';
  }
  async function answer(ax){
    const row = document.getElementById('ssn_' + ax); if(!row) return;
    const acc = (row.querySelector('input[name="ssa_' + ax + '"]:checked') || {}).value || '';
    const ts = [...row.querySelectorAll('.ss-towns input:checked')].map(i => i.value);
    if(typeof cgdOverlaySave !== 'function') return;
    await cgdOverlaySave(ax, ov => { if(acc) ov.accepting_new = { v:acc, by:(typeof ME !== 'undefined' && ME.email) || '', at:new Date().toISOString() }; ov.travel_towns = ts; });
    if(typeof ccToast === 'function') ccToast('Saved.'); paint();
  }
  function cellHtml(sh, k){
    const c = sh.cells[k], o = SS.over[k]; if(!c) return '';
    const names = c.ids.map(id => (SS.pool.find(p => String(p.axiscare_id || p.id) === id) || {}).name || id);
    return '<div class="ss-cellbox"><b>' + esc(c.town) + ', ' + esc(R().WIN_LABEL[c.time]) + '</b>: ' + (names.length ? esc(names.join(', ')) : 'nobody counted') + ' (worked out: ' + c.status + ')'
      + (canConfirm() ? '<div class="ss-ovr">Set by hand: <select id="ssOv"><option value="">Leave as worked out</option><option value="open"' + (o && o.status === 'open' ? ' selected' : '') + '>Open</option><option value="limited"' + (o && o.status === 'limited' ? ' selected' : '') + '>Limited</option><option value="none"' + (o && o.status === 'none' ? ' selected' : '') + '>Off</option></select>'
        + ' <input id="ssOvNote" placeholder="Why (required), e.g. she\'s out next week" value="' + esc(o ? o.note : '') + '"> <button class="fb" onclick="ssOver(\'' + esc(k) + '\')">Apply</button> <span class="ss-err" id="ssOvErr"></span></div>' : '') + '</div>';
  }
  function cellOpen(k){ SS.open = SS.open === k ? null : k; staffPaint(); }
  function over(k){
    const v = document.getElementById('ssOv').value, note = document.getElementById('ssOvNote').value.trim();
    if(v && !note){ document.getElementById('ssOvErr').textContent = 'Say why.'; return; }
    if(v) SS.over[k] = { status:v, note, by:(typeof ME !== 'undefined' && (ME.name || ME.email)) || '', at:new Date().toISOString() }; else delete SS.over[k];
    staffPaint();
  }
  async function confirmIt(b){
    if(!canConfirm() || !SS.pool) return;
    const sh = R().sheet(SS.pool, ctx()), cells = R().snapshot(sh, SS.over), wk = R().weekOf(todayYmd()).start;
    const open = Object.values(cells).filter(c => c.status === 'open').length, lim = Object.values(cells).filter(c => c.status === 'limited').length;
    if(b) b.disabled = true;
    const out = await tkMerge(m => { m.staffing_sheet = { week_start:wk, by:(typeof ME !== 'undefined' && ME.email) || '', by_name:(typeof ME !== 'undefined' && (ME.name || ME.email)) || '', at:new Date().toISOString(), cells, skills:SS.skills.slice() };
      return ['staffing sheet confirmed for the week of ' + wk + ': ' + open + ' open, ' + lim + ' limited' + (Object.keys(SS.over).length ? ', ' + Object.keys(SS.over).length + ' set by hand' : '')]; }, 'Staffing sheet');
    if(b) b.disabled = false;
    if(out && out.error){ if(typeof ccToast === 'function') ccToast('Could not save: ' + out.error.message); return; }
    DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { staffing_sheet:(DATA.ops_settings || {}).staffing_sheet });
    if(typeof ccToast === 'function') ccToast('Confirmed. Outreach can share it now.'); paint();
  }

  /* ── the Referrers desk: the confirmed sheet only ── */
  function deskHtml(){
    if(!R()) return '';
    const conf = st().staffing_sheet, wk = R().weekOf(todayYmd()).start;
    if(!conf || conf.week_start !== wk) return '<div class="card pd-desk"><div class="pd-head"><b>Where we can staff this week</b><span class="field-note">Openings we expect, not confirmed yet. Staffing confirms it each Monday; until then it isn\'t shared.</span></div></div>';
    const sh = SS.pool ? R().sheet(SS.pool, ctx()) : { cells:{} }, share = SS.pool ? R().shareable(conf, sh, todayYmd()) : R().shareable(conf, { cells:Object.fromEntries(Object.entries(conf.cells || {}).map(([k, c]) => [k, { town:k.split('|')[0], time:k.split('|')[1], ids:c.ids, status:c.live }])) }, todayYmd());
    return '<div class="card pd-desk"><div class="pd-head"><b>Where we can staff this week</b><span class="ss-ok">Confirmed by ' + esc(conf.by_name || conf.by) + ', ' + esc(day(conf.at)) + '</span></div>'
      + (share.rows.length ? share.rows.map(r => '<div class="pd-row"><div class="pd-main"><b>' + esc(r.town) + '</b> <span class="field-note">' + esc(r.times.map(t => R().WIN_LABEL[t]).join(', ')) + '</span></div></div>').join('') : '<div class="field-note">No openings confirmed this week.</div>')
      + (share.rechecking ? '<div class="field-note ss-warn">' + share.rechecking + ' town/time' + (share.rechecking === 1 ? ' is' : 's are') + ' being re-checked by Staffing and left out for now.</div>' : '')
      + (!SS.pool ? '<div class="field-note">Checking for changes since it was confirmed… <a href="javascript:void(0)" onclick="ssLoad()">check now</a></div>' : '')
      + (share.text ? '<div class="pd-acts" style="margin-top:8px;"><button class="fb" onclick="ssCopy()">Copy for a partner</button></div><div class="field-note">Towns and times only, never a caregiver or a promised start.</div>' : '') + '</div>';
  }
  function deskPaint(){ const box = document.getElementById('ssDesk'); if(box) box.innerHTML = deskHtml(); }
  async function copy(){
    const conf = st().staffing_sheet, sh = SS.pool ? R().sheet(SS.pool, ctx()) : null; if(!sh){ await load(); return copy(); }
    const s = R().shareable(conf, sh, todayYmd()); if(!s.text) return;
    try{ await navigator.clipboard.writeText(s.text); if(typeof ccToast === 'function') ccToast('Copied.'); }catch(e){ prompt('Copy this:', s.text); }
  }
  /* ── Today ── */
  function myDayRows(rowFn){
    if(!R() || typeof rowFn !== 'function' || !canConfirm()) return [];
    const conf = st().staffing_sheet, wk = R().weekOf(todayYmd()).start, out = [];
    if(!conf || conf.week_start !== wk) out.push(rowFn('var(--gold)', 'i-calendar', 'Confirm this week\'s staffing sheet', 'Outreach can\'t share openings until it\'s confirmed', 'STAFFING', 'var(--gold-text)', 'var(--amber-bg)', '', 'Open', "ssGo()"));
    else if(SS.pool){ const f = R().review(conf, R().sheet(SS.pool, ctx()), todayYmd()).flags.length; if(f) out.push(rowFn('var(--gold)', 'i-calendar', 'Staffing sheet: ' + f + ' changed since confirmed', 'Re-check and confirm again', 'STAFFING', 'var(--gold-text)', 'var(--amber-bg)', '', 'Open', "ssGo()")); }
    return out;
  }
  function go(){ try{ if(typeof switchTab === 'function') switchTab('hourswatch'); if(typeof swSubGo === 'function') swSubGo('hours'); }catch(e){} setTimeout(() => { const el = document.getElementById('ssRoot'); if(el) el.scrollIntoView(); load(); }, 200); }

  if(!document.getElementById('ssCss')){ const s = document.createElement('style'); s.id = 'ssCss'; s.textContent = [
    '.ss-card{padding:14px 16px;margin-bottom:16px}.ss-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.ss-head b{color:var(--navy);font-size:15px}',
    '.ss-ok{font-size:12.5px;font-weight:700;color:#2F7D4F}.ss-warn{font-size:12.5px;font-weight:700;color:#8A5A12}.ss-err{color:var(--red);font-size:13px}',
    '.ss-filters{display:flex;gap:10px;flex-wrap:wrap;font-size:12.5px;margin:8px 0}.ss-wrap{overflow-x:auto}.ss-grid{border-collapse:collapse;width:100%;font-size:13px;min-width:420px}',
    '.ss-grid th,.ss-grid td{border-bottom:1px solid var(--border);padding:4px 6px;text-align:left}.ss-cell{border:0;background:transparent;font:inherit;cursor:pointer;padding:4px 6px;border-radius:6px;width:100%;text-align:left}',
    '.ss-open .ss-cell{background:#E3F2E8;color:#2F7D4F;font-weight:700}.ss-limited .ss-cell{background:#FDF1DC;color:#8A5A12;font-weight:700}.ss-none .ss-cell{color:var(--text-muted)}.ss-flag .ss-cell{outline:2px dashed #B4412E}',
    '.ss-cellbox{background:var(--bg);border-radius:8px;padding:10px 12px;margin:10px 0;font-size:13px}.ss-ovr{margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}.ss-ovr input{min-width:200px}',
    '.ss-confirm{margin-top:10px}.ss-need{margin-top:14px;border-top:1px solid var(--border);padding-top:10px}.ss-nrow{padding:8px 0;border-bottom:1px dashed var(--border);display:grid;gap:6px}',
    '.ss-towns{display:flex;flex-wrap:wrap;gap:6px}.ss-chip{font-size:12.5px;border:1px solid var(--border);border-radius:999px;padding:3px 8px}.ss-rest{margin-top:10px;font-size:13px}.ss-rest div{padding:3px 0}',
    '.ss-filters label,.ss-chip,.ss-acc label{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}.ss-filters input,.ss-chip input,.ss-acc input,label.field-note input{width:auto;min-height:0;margin:0}',
    '@media (max-width:640px){.ss-ovr input{min-width:0;flex:1 1 100%}}'
  ].join(''); document.head.appendChild(s); }
  Object.assign(window, { ssLoad:load, ssPaint:paint, ssDeskHtml:deskHtml, ssSkill:(k, on) => { SS.skills = on ? SS.skills.concat([k]) : SS.skills.filter(x => x !== k); staffPaint(); }, ssAll:v => { SS.showAll = v; staffPaint(); },
    ssCell:cellOpen, ssOver:over, ssConfirm:confirmIt, ssAnswer:answer, ssCopy:copy, ssMyDayRows:myDayRows, ssGo:go, SS_STATE:SS });
})();
