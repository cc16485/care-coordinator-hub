/* =====================================================================================================================
   CAREGIVERS AT A GLANCE (Caregivers > Directory; Samantha 2026-11-04: "I love the charts you have been doing - do you
   think there is room for improvement here?", then "build it ... behind a switch"). The directory was a phone book; this
   look tells a coordinator something about each caregiver:
     · four tiles on top: active caregivers by level, hours on the schedule next 7 days against the hours they want,
       who wants more hours, who has nothing on the schedule (the last two are tappable and narrow the list)
     · a count on every filter button
     · labeled columns: caregiver (level, skills), town, next 7 days (a bar of scheduled against wanted), time with us, phone
     · a key for the coloured dots, and the AxisCare upkeep lines moved under the list
   Nothing new is fetched for it: the census is the list's own, wanted hours are caregiver_availability (self-reported at
   cc.mo-care.com/availability), and scheduled hours are the same next-7-days figure Hours watch and the profile's Work
   section use (coverage-shifts hours_watch, HW_SCHED). Only the look changes; nothing is sent to anyone.
   Behind ops_settings.caregivers_glance_live (owners switch it in Settings), or an owner's own preview in this browser.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const get = n => { try{ return (0, eval)(n); }catch(e){ return undefined; } };
  const KEY = 'cgGlance';
  const ST = { loading:false, err:'' };

  function live(settings){ return !!(settings && settings.caregivers_glance_live === true); }
  function preview(){ try{ return root.localStorage.getItem(KEY) === '1'; }catch(e){ return false; } }
  function setPreview(on){ try{ if(on) root.localStorage.setItem(KEY, '1'); else root.localStorage.removeItem(KEY); }catch(e){} }
  const isOwner = () => { try{ return typeof ccIsOwner === 'function' && !!ccIsOwner(); }catch(e){ return false; } };
  const settings = () => { const d = get('DATA'); return (d && d.ops_settings) || {}; };
  function showing(){ return live(settings()) || (isOwner() && preview()); }

  /* the next-7-days schedule, loaded once the same way Hours watch loads it */
  function sched(){ const s = get('HW_SCHED'); return s && typeof s === 'object' ? s : null; }
  async function loadSched(){
    if(sched() || ST.loading) return;
    ST.loading = true; ST.err = '';
    try{
      const { data:{ session } } = await sb.auth.getSession();
      if(!session) throw new Error('sign in again');
      const r = await fetch(CONFIG.supabase_url + '/functions/v1/coverage-shifts', { method:'POST',
        headers:{ 'Authorization':'Bearer ' + session.access_token, 'Content-Type':'application/json' }, body:JSON.stringify({ hours_watch:true }) });
      const out = await r.json().catch(() => ({}));
      if(out.error || !out.scheduled_hours) throw new Error(out.error || ('schedule ' + r.status));
      /* the Hub's own Hours watch globals (top-level let in index.html), so Hours watch and the profile reuse this load */
      HW_SCHED = out.scheduled_hours; HW_WIN = out.window || '';
    }catch(e){ ST.err = e.message || String(e); }
    ST.loading = false;
    try{ if(typeof cgdRenderList === 'function') cgdRenderList(); }catch(e){}
  }

  /* one caregiver's numbers */
  const r1 = n => Math.round(n * 10) / 10;
  function facts(c){
    const nm = (c.first + ' ' + c.last).trim();
    const av = typeof cgdAvailFor === 'function' ? cgdAvailFor(c.id, nm) : null;
    const s = sched();
    const have = s ? r1(Number(s[String(c.id)] || 0)) : null;
    const w = av && Number(av.target_hours);
    const want = Number.isFinite(w) && w > 0 ? w : null;
    const short = have != null && want != null ? r1(want - have) : null;
    return { av, have, want, short, wantsMore: short != null && short >= 1 };
  }
  function tenure(hire){
    const t = Date.parse(String(hire || '').slice(0, 10) + 'T12:00:00');
    if(!Number.isFinite(t)) return { text:'', isNew:false };
    const days = Math.floor((Date.now() - t) / 864e5);
    if(days < 0) return { text:'starts ' + String(hire).slice(5, 10).replace('-', '/'), isNew:true };
    const mo = Math.floor(days / 30.44);
    const text = mo < 1 ? days + (days === 1 ? ' day' : ' days') : mo < 12 ? mo + ' mo' : Math.floor(mo / 12) + (mo < 24 ? ' yr' : ' yrs');
    return { text, isNew: days < 60 };
  }
  const hrs = n => (Math.round(n) === n ? String(n) : n.toFixed(1)) + ' h';

  /* the two lists the tiles open */
  function rowsFor(filter, working){
    if(filter === 'wantmore') return working.map(c => [c, facts(c)]).filter(x => x[1].wantsMore).sort((a, b) => b[1].short - a[1].short).map(x => x[0]);
    if(filter === 'nosched') return sched() ? working.filter(c => facts(c).have === 0) : [];
    return null;
  }

  function style(){
    if(document.getElementById('cggStyle')) return;
    const st = document.createElement('style'); st.id = 'cggStyle';
    st.textContent = '.cgg-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 12px}'
      + '.cgg-tile{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px 14px;text-align:left;font:inherit;color:inherit}'
      + 'button.cgg-tile{cursor:pointer}button.cgg-tile:hover{border-color:var(--navy)}button.cgg-tile.on{border-color:var(--navy);box-shadow:inset 0 0 0 1px var(--navy)}'
      + '.cgg-lab{font-size:12.5px;color:var(--text-muted)}.cgg-big{font-size:26px;font-weight:800;color:var(--navy);line-height:1.2;margin-top:2px}'
      + '.cgg-sub{font-size:12px;color:var(--text-muted);margin-top:3px}'
      + '.cgg-meter{height:6px;border-radius:3px;background:#EEF0F3;margin-top:7px;overflow:hidden}.cgg-meter>span{display:block;height:6px;border-radius:3px;background:#1F7A8C}'
      + '.cgg-n{margin-left:5px;font-weight:700;opacity:.75}'
      + '.cgg-row{display:grid;grid-template-columns:14px minmax(170px,2.3fr) minmax(90px,1fr) minmax(150px,1.6fr) minmax(70px,.7fr) minmax(110px,1fr);gap:12px;align-items:center;padding:9px 14px;border-bottom:1px solid #F3EFE7;font-size:13.5px}'
      + '.cgg-row.hd{font-size:12px;color:var(--text-muted);padding:8px 14px;background:#FBFAF7;cursor:default}'
      + '.cgg-row.cg{cursor:pointer}.cgg-row.cg:hover{background:#FBFAF7}'
      + '.cgg-bar{display:inline-block;width:64px;height:6px;border-radius:3px;background:#EEF0F3;vertical-align:middle;margin-right:7px;overflow:hidden}.cgg-bar>span{display:block;height:6px;border-radius:3px;background:#1F7A8C}'
      + '.cgg-more{color:#1F5FA8;font-weight:700}.cgg-none{color:#B45309;font-weight:700}'
      + '.cgg-key{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--text-muted);margin:0 0 8px}.cgg-key i{display:inline-block;width:8px;height:8px;border-radius:99px;margin-right:5px;vertical-align:1px}'
      + '.cgg-pv{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:#EEF4FB;border:1px solid #C9DAF0;border-radius:10px;padding:8px 12px;margin:0 0 10px;font-size:13px}'
      + '.cgg-upkeep{margin-top:14px}'
      + '@media (max-width:760px){.cgg-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.cgg-row{grid-template-columns:14px minmax(0,2fr) minmax(0,1.5fr) minmax(0,.8fr)}.cgg-row .town,.cgg-row .ph{display:none}}';
    document.head.appendChild(st);
  }

  /* the tiles, the filter counts and the preview line; returns the HTML that goes above the list */
  function top(all, filter, counts){
    style();
    const working = all.filter(cgdWorking);
    const lv = { 1:0, 2:0, 3:0, none:0 };
    working.forEach(c => { const l = cgdLevelOf(c.classes); if(l) lv[l]++; else lv.none++; });
    const s = sched();
    let tot = 0, totWant = 0, haveForWant = 0, noGoal = 0, more = 0, none = 0;
    working.forEach(c => { const f = facts(c);
      if(f.have != null) tot += f.have;
      if(f.want != null && f.have != null){ totWant += f.want; haveForWant += Math.min(f.have, f.want); } else if(f.want == null) noGoal++;
      if(f.wantsMore) more++; if(f.have === 0) none++; });
    const pct = totWant ? Math.round(haveForWant / totWant * 100) : null;
    const wait = ST.err ? '<span style="color:var(--red);">couldn\'t load: ' + esc(ST.err) + '</span>' : 'loading…';
    const tile = (lab, big, sub, extra) => '<div class="cgg-tile"><div class="cgg-lab">' + lab + '</div><div class="cgg-big">' + big + '</div>' + (extra || '') + '<div class="cgg-sub">' + sub + '</div></div>';
    const btn = (f, lab, big, sub, tip) => '<button class="cgg-tile' + (filter === f ? ' on' : '') + '" title="' + esc(tip) + '" onclick="CGG.pick(\'' + f + '\')"><div class="cgg-lab">' + lab + '</div><div class="cgg-big">' + big + '</div><div class="cgg-sub">' + sub + '</div></button>';
    const tiles = '<div class="cgg-tiles">'
      + tile('Active caregivers', String(working.length), 'L1 ' + lv[1] + ' · L2 ' + lv[2] + ' · L3 ' + lv[3] + (lv.none ? ' · no level ' + lv.none : ''))
      + tile('Hours on the schedule, next 7 days', s ? hrs(Math.round(tot)) : '…',
          s ? (pct != null ? pct + '% of the hours they want' : 'nobody has set the hours they want') + (noGoal ? ' · ' + noGoal + ' haven\'t said' : '') : wait,
          s && pct != null ? '<div class="cgg-meter"><span style="width:' + Math.min(pct, 100) + '%"></span></div>' : '')
      + btn('wantmore', 'Want more hours', s ? String(more) : '…', s ? (filter === 'wantmore' ? 'showing them, biggest gap first' : 'tap to see who, biggest gap first') : wait,
          'Scheduled at least 1 hour less than the hours they told us they want, next 7 days')
      + btn('nosched', 'Nothing on the schedule', s ? String(none) : '…', s ? (filter === 'nosched' ? 'showing them' : 'next 7 days · tap to see who') : wait,
          'Active in AxisCare with no visits scheduled in the next 7 days')
      + '</div>';
    const pv = !live(settings()) && isOwner()
      ? '<div class="cgg-pv"><b>Preview of the new Caregivers look.</b> Only you see it, in this browser. Everyone else still has the current list.<span style="flex:1;"></span><button class="secondary" style="font-size:12px;padding:3px 10px;" onclick="CGG.preview(false)">Back to the current list</button></div>' : '';
    /* a count on every filter button */
    document.querySelectorAll('#cgdFilters .filter-pill').forEach(b => {
      const k = b.getAttribute('data-cf'); let n = b.querySelector('.cgg-n');
      if(counts[k] == null){ if(n) n.remove(); return; }
      if(!n){ n = document.createElement('span'); n.className = 'cgg-n'; b.appendChild(n); }
      n.textContent = String(counts[k]);
    });
    return pv + tiles;
  }

  /* the labeled list */
  function list(rows){
    style();
    const head = '<div class="cgg-row hd"><span></span><span>Caregiver</span><span class="town">Town</span><span>Next 7 days</span><span>With us</span><span class="ph">Phone</span></div>';
    const body = rows.map(c => {
      const nm = (c.first + ' ' + c.last).trim();
      const g = cgdLegacyFor(c.id, nm), ov = cgdOverlayFor(c.id);
      const merged = cgdSkillsMerged(c.id, g);
      const nSkills = Object.keys(merged.skills).length + (merged.spanish ? 1 : 0);
      const lvl = cgdLevelOf(c.classes);
      const bad = g && (String(g.oig_status || '') === 'FLAGGED' || /issues/i.test(g.edl_status || '') || /issues/i.test(g.fcsr_status || ''));
      const dot = !g && !ov ? ['#B45309', 'needs data connection'] : bad ? ['var(--red)', 'background issue']
        : (g && g.oig_status && g.orient_date) ? ['var(--green)', 'checks recorded'] : ['#B45309', 'answers needed'];
      const f = facts(c), tn = tenure(c.hire_date), working = cgdWorking(c);
      const tags = []
        .concat(lvl ? ['<span class="tag-chip" style="background:#E1F1ED;color:#1F7A8C;">L' + lvl + '</span>'] : ['<span class="tag-chip" style="background:#F3EDE3;color:#6E6559;">no level</span>'])
        .concat(nSkills ? ['<span class="field-note" title="skills and willingness recorded">' + nSkills + ' skill' + (nSkills === 1 ? '' : 's') + '</span>'] : [])
        .concat(cgdTraining(c) ? ['<span class="tag-chip" style="background:#F7E7CD;color:#8A4E0C;" title="In Training in AxisCare: onboarding until their orientation is done. Not offered shifts.">In Training</span>'] : [])
        .concat(!c.active ? ['<span class="tag-chip" style="background:#F3EDE3;color:#6E6559;">' + esc(c.status_label || 'inactive') + '</span>'] : [])
        .concat(!g && !ov && working ? ['<span class="tag-chip" style="background:#FFF7ED;color:#B45309;" title="AxisCare says they exist. The Hub just has no operational data connected yet">needs data connection</span>'] : [])
        .concat(tn.isNew && working ? ['<span class="tag-chip" style="background:#EEF4FB;color:#1F5FA8;" title="Hired in the last 60 days">new</span>'] : []);
      const told = f.av && f.av.updated_at ? 'told us ' + String(f.av.updated_at).slice(0, 10) : '';
      let hours;
      if(!working) hours = '<span class="field-note">not working</span>';
      else if(f.have == null) hours = '<span class="field-note">' + (ST.err ? 'couldn\'t load' : '…') + '</span>';
      else if(f.want != null){
        const w = Math.max(4, Math.min(100, Math.round(f.have / f.want * 100)));
        hours = '<span title="Wants ' + esc(hrs(f.want)) + ' a week (' + esc(told) + ')"><span class="cgg-bar"><span style="width:' + (f.have ? w : 0) + '%"></span></span>'
          + esc(Math.round(f.have) + ' of ' + hrs(f.want)) + '</span>'
          + (f.wantsMore ? ' <span class="cgg-more">wants ' + esc(hrs(Math.round(f.short))) + ' more</span>' : '');
      } else hours = (f.have ? esc(hrs(f.have)) : '<span class="cgg-none">none</span>') + ' <span class="field-note" title="No hours goal at cc.mo-care.com/availability yet">· goal not set</span>';
      return '<div class="cgg-row cg" onclick="cgdOpenProfile(\'' + esc(c.id) + '\')">'
        + '<span style="width:9px;height:9px;border-radius:99px;background:' + dot[0] + ';" title="' + dot[1] + '"></span>'
        + '<span style="display:flex;gap:7px;align-items:center;flex-wrap:wrap;min-width:0;"><b style="color:var(--navy);">' + esc(nm) + '</b>' + tags.join('') + '</span>'
        + '<span class="town field-note">' + esc(c.city || '') + '</span>'
        + '<span>' + hours + '</span>'
        + '<span class="field-note" title="' + esc('Hire date ' + String(c.hire_date || '').slice(0, 10)) + '">' + esc(tn.text) + '</span>'
        + '<span class="ph field-note">' + esc(c.mobile || 'no mobile') + '</span>'
        + '</div>';
    }).join('');
    const key = '<div class="cgg-key"><span><i style="background:var(--green)"></i>checks recorded</span><span><i style="background:#B45309"></i>answers needed or no Hub data yet</span><span><i style="background:var(--red)"></i>background issue</span><span>Hours: scheduled in AxisCare against the weekly hours they told us they want</span></div>';
    return key + '<div class="card" style="padding:0;overflow:hidden;">' + head + body + '</div>';
  }

  /* the AxisCare upkeep lines (caregiver connect, Hub vs AxisCare) go under the list in this look, back on top without it */
  function placeUpkeep(on){
    const view = document.getElementById('cgdListView'), list = document.getElementById('cgdList');
    const a = document.getElementById('cgcLine'), b = document.getElementById('cgaxLine');
    if(!view || !list || !a || !b) return;
    let box = document.getElementById('cggUpkeep');
    if(on){
      if(!box){ box = document.createElement('div'); box.id = 'cggUpkeep'; box.className = 'cgg-upkeep'; view.appendChild(box); }
      if(a.parentNode !== box){ box.appendChild(a); box.appendChild(b); }
    } else if(box && a.parentNode === box){ view.insertBefore(a, list); view.insertBefore(b, list); }
  }

  function pick(f){
    const cur = get('CGD');
    const next = cur && cur.filter === f ? 'active' : f;
    cur.filter = next;
    document.querySelectorAll('#cgdFilters .filter-pill').forEach(b => b.classList.toggle('active', b.getAttribute('data-cf') === next));
    cgdRenderList();
  }
  function setPreviewAndDraw(on){ setPreview(!!on); try{ cgdRenderList(); }catch(e){} }

  /* Settings (data-set caregivers-glance): the switch, owners only */
  function settingsFill(){
    const now = document.getElementById('cggSetNow'), b = document.getElementById('cggToggleBtn'), pv = document.getElementById('cggPreviewBtn'); if(!now) return;
    const on = live(settings()), owner = isOwner();
    now.innerHTML = (on ? '<b style="color:#1E8449;">On.</b> Everyone sees the new Caregivers look.'
      : '<b style="color:#B7791F;">Off.</b> Everyone sees the current Caregivers list' + (preview() ? ' except you (preview, this browser).' : '.')) + (owner ? '' : ' Only Samantha or Zachary can change this.');
    if(b){ b.textContent = on ? 'Turn off the new Caregivers look' : 'Turn on the new Caregivers look for everyone'; b.style.display = owner ? '' : 'none'; }
    if(pv){ pv.textContent = preview() ? 'Stop my preview' : 'Preview it (only me)'; pv.style.display = owner && !on ? '' : 'none'; }
  }
  async function toggle(btn){
    if(!isOwner()){ alert('Only Samantha or Zachary can change the Caregivers look.'); return; }
    const on = !live(settings());
    const ok = await ccConfirm(on ? 'Turn on the new Caregivers look for everyone?\n\nTiles on top (hours on the schedule, who wants more hours, who has nothing scheduled), counts on the filter buttons and labeled columns. Only the look changes. Nothing is sent to anyone.'
      : 'Turn off the new Caregivers look? Everyone goes back to the current list.');
    if(!ok) return;
    if(btn) btn.disabled = true;
    const out = await tkMerge(m => { m.caregivers_glance_live = on; if(on && !m.caregivers_glance_live_since) m.caregivers_glance_live_since = new Date().toISOString(); return ['Caregivers at a glance ' + (on ? 'ON' : 'OFF')]; }, 'Caregivers at a glance');
    if(btn) btn.disabled = false;
    const sv = document.getElementById('cggSaved'); if(sv) sv.textContent = out.error ? ('Could not save: ' + out.error.message) : (on ? 'On.' : 'Off.');
    settingsFill(); try{ cgdRenderList(); }catch(e){}
  }
  function previewLink(){
    return !live(settings()) && isOwner() && !preview()
      ? ' · <a href="javascript:void(0)" onclick="CGG.preview(true)">Preview the new Caregivers look (only you)</a>' : '';
  }

  root.CGG = { live, showing, preview:setPreviewAndDraw, previewOn:preview, loadSched, facts, tenure, rowsFor, top, list, placeUpkeep, pick, settingsFill, toggle, previewLink };
})(typeof window !== 'undefined' ? window : globalThis);
