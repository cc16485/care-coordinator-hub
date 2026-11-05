/* =====================================================================================================================
   ONBOARDING AVAILABILITY (Caregivers > Onboarding; Samantha 2026-11-04: "lets brainstorm a way to easily show a chart of
   what our onboarding caregivers/cna/prn availability is", then "I approve the plan and your picks for all five decisions",
   https://claude.ai/artifact/AE8V9sfNesKVBdnCqu6s2L). A Show availability button on the Onboarding table opens, above it:
     · job chips: Everyone, Caregivers, CNAs, PRN (PRN = the offer said "PRN, as needed" or they said yes to a PRN offer;
       a PRN CNA is under both)
     · three counts: people counted, hours a week they want, availability unknown (tap for names)
     · the week: Monday to Sunday by Morning, Afternoon, Evening, Overnight (the four words of the Step 1 grid), each box
       the number of people who ticked it; tap a box for the names, a name finds that person in the table
     · ready by: the hours they want, added up by how far along they are
   Who is counted (her picks 2 and 5): everyone on the Onboarding table from a signed offer through Approved to Work; an
   offer not signed yet is left out (they have not seen the availability question). Where the answers come from: the
   person's availability record once they are on the AxisCare roster (they may have changed it since), otherwise their own
   Step 1 grid, read through step1-sign availability_board (office sign-in, availability only). Filled in but the
   availability form not signed yet still counts, marked (her pick 3). No availability = Availability unknown, never free
   (her rule 2026-10-17). It only shows: nothing is sent, saved or changed.
   Behind ops_settings.onboarding_availability_live (with the Onboarding table on), or an owner's own preview in this browser.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const get = n => { try{ return (0, eval)(n); }catch(e){ return undefined; } };
  const KEY = 'onbAvail', OPEN_KEY = 'onbAvailOpen', JOB_KEY = 'onbAvailJob';
  const DAYS = [['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun']];
  const BANDS = [['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening'], ['overnight', 'Overnight']];
  const STAGES = [['approved', 'Approved to Work', 'Can be scheduled now'], ['nearly', 'Nearly ready', 'One step from Approve to Work'],
    ['middle', 'Checks, references or orientation', 'Still working through onboarding'], ['step1', 'Still in Step 1', 'Signed the offer, forms not done']];
  const FRESH_MS = 5 * 60 * 1000;
  const ST = { rows:null, at:0, loading:false, err:'', asked:'', cell:null, unknown:false };

  const ls = (k, v) => { try{ if(v === undefined) return root.localStorage.getItem(k); if(v === null) root.localStorage.removeItem(k); else root.localStorage.setItem(k, v); }catch(e){} return null; };
  const settings = () => { const d = get('DATA'); return (d && d.ops_settings) || {}; };
  function live(s){ return !!(s && s.onboarding_availability_live === true && s.onboarding_table_live === true); }
  function preview(){ return ls(KEY) === '1'; }
  const isOwner = () => { try{ return typeof ccIsOwner === 'function' && !!ccIsOwner(); }catch(e){ return false; } };
  function showing(){ return live(settings()) || (isOwner() && preview() && settings().onboarding_table_live === true); }
  const isOpen = () => ls(OPEN_KEY) === '1';
  let job = (() => { const j = ls(JOB_KEY); return ['all', 'cg', 'cna', 'prn'].includes(j) ? j : 'all'; })();
  const redraw = () => { try{ if(typeof renderCkd === 'function') renderCkd(); }catch(e){} };

  /* one person on the table: who they are, which jobs, how far along, and their availability */
  const offerOf = id => { const L = get('OFFERS'); return id && Array.isArray(L) ? L.find(o => o && String(o.id) === String(id)) || null : null; };
  function offerIdOf(p){ return String((p.c && p.c.offer_id) || (p.j && p.j.offer_id) || (p.o && p.o.id) || ''); }
  /* 11-04 fix (Samantha: "these arent all caregivers, a few are PRN"): the offer wins over the application, and PRN is read the
     way the server reads it (prn-welcome-video.sql, offer-sign): hours PRN, classification prn, or a PRN position such as prn_cna */
  const words = v => String(v == null ? '' : v).replace(/[_-]+/g, ' ');
  function jobsOf(p, g){
    const o = p.o || offerOf(offerIdOf(p)), c = p.c || {};
    const pos = words((o && (o.position_key || o.position)) || c.position || (g && g.position) || c.credential);
    const out = [];
    if(/\bcna\b/i.test(pos)) out.push('cna'); else if(!/\b(lpn|rn|nurse)\b/i.test(pos)) out.push('cg');
    const prn = (o && (/^prn$/i.test(String(o.hours_type || '')) || /^prn$/i.test(String(o.classification || '')) || /\bprn\b/i.test(words(o.position)) || /\bprn\b/i.test(words(o.position_key))))
      || /\bprn\b/i.test(words(c.position)) || (c.prn_offer && c.prn_offer.answer === 'yes');
    if(prn) out.push('prn');
    return out;
  }
  function stageOf(m){
    const p = m.p;
    if(p.stop === 4 || (p.j && p.j.approved_to_work)) return 'approved';
    if(m.nearly) return 'nearly';
    return p.stop >= 1 ? 'middle' : 'step1';
  }
  const unsignedOffer = p => !!(p.o && typeof obtOfferSent === 'function' && obtOfferSent(p.o));
  function availOf(p, g){
    const ax = (g && g.axiscare_id) || (p.c && p.c.axiscare_id) || '';
    if(ax && typeof cgdAvailFor === 'function'){
      const a = cgdAvailFor(ax, p.name);
      if(a && a.windows && DAYS.some(([d]) => (a.windows[d] || []).length))
        return { windows:a.windows, want:Number(a.target_hours) > 0 ? Number(a.target_hours) : null, signed:true, byDay:(a.step1 && a.step1.hours_by_day) || {}, from:'record' };
    }
    const r = ST.rows && ST.rows[offerIdOf(p)];
    return r ? { windows:r.windows, want:Number(r.target_hours) > 0 ? Number(r.target_hours) : null, signed:!!r.signed, byDay:r.hours_by_day || {}, from:'step1' } : null;
  }
  function people(models){
    return (models || []).filter(m => !unsignedOffer(m.p)).map(m => {
      const g = m.g || (m.j && typeof ckdRosterFor === 'function' ? ckdRosterFor(m.j) : null);
      return { m, name:m.name, jobs:jobsOf(m.p, g), stage:stageOf(m), av:availOf(m.p, g) };
    });
  }

  /* the Step 1 grids, read once per open (and again after five minutes) */
  async function load(models, force){
    const ids = [...new Set((models || []).filter(m => !unsignedOffer(m.p)).map(m => offerIdOf(m.p)).filter(Boolean))].sort();
    const key = ids.join(',');
    if(ST.loading || (!force && ST.rows && ST.asked === key && Date.now() - ST.at < FRESH_MS)) return;
    if(!ids.length){ ST.rows = {}; ST.asked = key; ST.at = Date.now(); return; }
    ST.loading = true; ST.err = '';
    try{
      const r = await sb.functions.invoke('step1-sign', { body:{ action:'availability_board', offer_ids:ids } });
      const out = r && r.data;
      if(r.error || !out || out.ok !== true) throw new Error((out && out.error) || (r.error && r.error.message) || 'no answer');
      const rows = {}; (out.people || []).forEach(x => { if(x && x.offer_id) rows[String(x.offer_id)] = x; });
      ST.rows = rows; ST.asked = key; ST.at = Date.now();
    }catch(e){ ST.err = e.message || String(e); ST.asked = key; ST.at = Date.now(); }   /* no retry loop: Try again, or five minutes */
    ST.loading = false;
    redraw();
  }

  const inJob = x => job === 'all' || x.jobs.includes(job);
  const count = (xs, d, b) => xs.filter(x => x.av && (x.av.windows[d] || []).includes(b)).length;
  function heat(n, max){ if(!n) return 'oav-h0'; const t = n / max; return t <= 1 / 3 ? 'oav-h1' : t <= 2 / 3 ? 'oav-h2' : 'oav-h3'; }
  const nameBtn = (x, extra) => '<button type="button" class="oav-name" onclick="OAV.find(' + esc(JSON.stringify(x.name)) + ')" title="Find ' + esc(x.name) + ' in the table">'
    + esc(x.name) + (x.av && !x.av.signed ? '<span class="oav-dot" title="Filled in, availability form not signed yet">not signed yet</span>' : '') + (extra ? '<span class="oav-x">' + esc(extra) + '</span>' : '') + '</button>';

  function button(){
    if(!showing()) return '';
    return '<span class="oav-bar">' + '<button type="button" class="obt-q oav-toggle' + (isOpen() ? ' obt-on' : '') + '" onclick="OAV.toggleOpen()" aria-expanded="' + isOpen() + '">'
      + (isOpen() ? 'Hide availability' : 'Show availability') + '</button>'
      + (!live(settings()) ? '<span class="oav-pv">Preview, only you see this. <a href="javascript:void(0)" onclick="OAV.preview(false)">Stop my preview</a></span>' : '') + '</span>';
  }
  /* the panel, drawn inside the Onboarding table (obtRender); its button sits up by the search box (button()) */
  function panel(models){
    if(!showing() || !isOpen()) return '';
    load(models);
    const all = people(models), xs = all.filter(inJob), known = xs.filter(x => x.av), unknown = xs.filter(x => !x.av);
    const n = j => all.filter(x => j === 'all' || x.jobs.includes(j)).length;
    const chip = (k, label) => '<button type="button" class="oav-chip' + (job === k ? ' on' : '') + '" aria-pressed="' + (job === k) + '" onclick="OAV.job(\'' + k + '\')">' + label + ' <b>' + n(k) + '</b></button>';
    const want = Math.round(xs.reduce((s, x) => s + (x.av && x.av.want || 0), 0));
    const waiting = ST.loading && !ST.rows;
    const msg = ST.err ? '<div class="ckd-msg ckd-err">Could not read the Step 1 availability: ' + esc(ST.err) + '. The chart below only shows people already on the AxisCare roster. <a href="javascript:void(0)" onclick="OAV.reload()">Try again</a></div>'
      : waiting ? '<div class="ckd-msg">Reading everyone\'s Step 1 availability…</div>' : '';
    let max = 1; DAYS.forEach(([d]) => BANDS.forEach(([b]) => { max = Math.max(max, count(known, d, b)); }));
    const sel = ST.cell;
    let grid = '<div class="oav-grid" role="grid" aria-label="People available by day and time"><div></div>' + DAYS.map(([, t]) => '<div class="oav-hd">' + t + '</div>').join('');
    BANDS.forEach(([b, bt]) => {
      grid += '<div class="oav-rl">' + bt + '</div>';
      DAYS.forEach(([d, dt]) => { const c = count(known, d, b), on = sel && sel[0] === d && sel[1] === b;
        grid += '<button type="button" class="oav-c ' + heat(c, max) + (on ? ' oav-sel' : '') + '" onclick="OAV.cell(\'' + d + '\',\'' + b + '\')" aria-label="' + dt + ' ' + bt.toLowerCase() + ': ' + c + ' available">' + c + '</button>'; });
    });
    grid += '</div>';
    let who = '<div class="oav-who oav-muted">Tap a box to see who.</div>';
    if(ST.unknown) who = '<div class="oav-who"><b>Availability unknown (' + unknown.length + '):</b> ' + (unknown.map(x => nameBtn(x)).join('') || 'nobody') + '<div class="oav-muted">No availability from Step 1 or the AxisCare roster yet. They are never counted as free.</div></div>';
    else if(sel){ const dt = DAYS.find(x => x[0] === sel[0])[1], bt = BANDS.find(x => x[0] === sel[1])[1];
      const ws = known.filter(x => (x.av.windows[sel[0]] || []).includes(sel[1]));
      who = '<div class="oav-who"><b>' + dt + ' ' + bt.toLowerCase() + ' (' + ws.length + '):</b> ' + (ws.map(x => nameBtn(x, x.av.byDay[sel[0]] ? x.av.byDay[sel[0]] : '')).join('') || 'nobody yet')
        + (unknown.length ? '<div class="oav-muted">Plus ' + unknown.length + ' with availability unknown, not counted.</div>' : '') + '</div>'; }
    const tot = STAGES.map(([k]) => Math.round(known.filter(x => x.stage === k).reduce((s, x) => s + (x.av.want || 0), 0)));
    const ppl = STAGES.map(([k]) => known.filter(x => x.stage === k).length);
    const top = Math.max(1, ...tot);
    const ready = '<div class="oav-ready"><div class="oav-rh">Ready by <span class="oav-muted">hours a week they want, by how far along they are</span></div>'
      + STAGES.map(([k, t, tip], i) => '<div class="oav-row" title="' + esc(tip) + '"><span>' + esc(t) + ' <span class="oav-muted">(' + ppl[i] + ')</span></span><i style="width:' + Math.round(tot[i] / top * 100) + '%"></i><em>' + tot[i] + ' h</em></div>').join('') + '</div>';
    return '<section class="oav" aria-label="Onboarding availability">'
      + '<div class="oav-chips">' + chip('all', 'Everyone') + chip('cg', 'Caregivers') + chip('cna', 'CNAs') + chip('prn', 'PRN') + '</div>'
      + '<div class="oav-tiles"><div class="oav-t"><b>' + xs.length + '</b><span>in onboarding</span></div>'
      + '<div class="oav-t"><b>' + want + ' h</b><span>a week they want</span></div>'
      + '<button type="button" class="oav-t oav-unk' + (ST.unknown ? ' on' : '') + '" onclick="OAV.unknown()"><b>' + unknown.length + '</b><span>availability unknown</span></button></div>'
      + msg
      + '<div class="oav-gw">' + grid + '</div>' + who + ready
      + '<div class="oav-note oav-muted">From each person\'s Step 1 answers, or their availability record once they are on the AxisCare roster. Offers not signed yet are not counted.</div>'
      + '</section>';
  }

  function cell(d, b){ ST.unknown = false; ST.cell = ST.cell && ST.cell[0] === d && ST.cell[1] === b ? null : [d, b]; redraw(); }
  function unknown(){ ST.cell = null; ST.unknown = !ST.unknown; redraw(); }
  function setJob(k){ job = ['all', 'cg', 'cna', 'prn'].includes(k) ? k : 'all'; ls(JOB_KEY, job); redraw(); }
  function toggleOpen(){ ls(OPEN_KEY, isOpen() ? null : '1'); ST.cell = null; ST.unknown = false; redraw(); }
  function find(name){ root.CKD_FIND = String(name || ''); redraw(); }
  function reload(){ ST.at = 0; ST.err = ''; ST.asked = ''; redraw(); }
  function setPreviewAndDraw(on){ ls(KEY, on ? '1' : null); if(on) ls(OPEN_KEY, '1'); settingsFill(); redraw(); }

  /* Settings (data-set onboarding-availability): the switch, owners only */
  function settingsFill(){
    const now = document.getElementById('oavSetNow'), b = document.getElementById('oavToggleBtn'), pv = document.getElementById('oavPreviewBtn'); if(!now) return;
    const s = settings(), on = live(s), owner = isOwner(), table = s.onboarding_table_live === true;
    now.innerHTML = (on ? '<b style="color:#1E8449;">On.</b> Everyone sees the Show availability button on Onboarding.'
      : '<b style="color:#B7791F;">Off.</b> Nobody sees the availability chart' + (preview() && table ? ' except you (preview, this browser).' : '.'))
      + (table ? '' : ' It lives in the Onboarding table, so turn on "Onboarding as a table" first.') + (owner ? '' : ' Only Samantha or Zachary can change this.');
    if(b){ b.textContent = s.onboarding_availability_live === true ? 'Turn off the availability chart' : 'Turn on the availability chart for everyone'; b.style.display = owner ? '' : 'none'; }
    if(pv){ pv.textContent = preview() ? 'Stop my preview' : 'Preview it (only me)'; pv.style.display = owner && !on && table ? '' : 'none'; }
  }
  async function toggle(btn){
    if(!isOwner()){ alert('Only Samantha or Zachary can change the availability chart.'); return; }
    const on = settings().onboarding_availability_live !== true;
    const ok = await ccConfirm(on ? 'Turn on the availability chart for everyone?\n\nA Show availability button on Onboarding opens a week grid of when the people in onboarding can work, by job, with a Ready by line. It only shows what people told us in Step 1: nothing is sent or changed.'
      : 'Turn off the availability chart? The Show availability button goes away for everyone.');
    if(!ok) return;
    if(btn) btn.disabled = true;
    const out = await tkMerge(m => { m.onboarding_availability_live = on; if(on && !m.onboarding_availability_live_since) m.onboarding_availability_live_since = new Date().toISOString(); return ['Onboarding availability chart ' + (on ? 'ON' : 'OFF')]; }, 'Onboarding availability chart');
    if(btn) btn.disabled = false;
    const sv = document.getElementById('oavSaved'); if(sv) sv.textContent = out && out.error ? ('Could not save: ' + out.error.message) : (on ? 'On.' : 'Off.');
    settingsFill(); redraw();
  }
  function previewLink(){
    return !live(settings()) && isOwner() && !preview() && settings().onboarding_table_live === true
      ? '<a href="javascript:void(0)" class="oav-pvl" onclick="OAV.preview(true)">Preview the availability chart (only you)</a>' : '';
  }

  root.OAV = { live, showing, panel, button, people, load, cell, unknown, job:setJob, toggleOpen, find, reload, preview:setPreviewAndDraw, previewOn:preview, settingsFill, toggle, previewLink, _st:ST, _jobs:jobsOf };
})(typeof window !== 'undefined' ? window : globalThis);
