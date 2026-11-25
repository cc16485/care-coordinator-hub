/* Today's 100 (2026-11-25, her "Yes, build it" to the mockup).
   Hormozi's Rule of 100: 100 marketing actions a day for 100 days. One quiet card on My Week (Samantha) and one
   line above My Work (everyone). No cards, no alerts, no texts.

   What counts on its own (read from logs the Hub already keeps, nothing copied):
     partners  referral_activities: each visit, call, drop-by or event; an email counts once per partner per person
               per day; the automatic partner series (by is not a person) counts once a day
     warm      campaign_log: each Campaigns send counts once (a send to 200 people is one action), partner sends left
               out because they are already counted on the partner
     recruit   recruit_posts: each job post logged on the After-Hours card
   Everything else is a +1 tap (Facebook and Nextdoor comments, Google replies, calls, posts, applicant replies).

   Saved in ops_settings.t100 = { start:'YYYY-MM-DD', targets:{bucket:n}, taps:{ 'YYYY-MM-DD': { email: {bucket:n} } } }.
   Days older than 120 are dropped on each save. No new app_data key. */
(function(){
  'use strict';
  const BUCKETS = [
    { k:'partners', short:'Partners', label:'Referral partners', hint:'calls, visits, emails', target:20 },
    { k:'local', short:'Local', label:'Local comments', hint:'Facebook, Nextdoor, Google', target:30 },
    { k:'content', short:'Content', label:'Content', hint:'posts and videos', target:5 },
    { k:'warm', short:'Warm', label:'Warm check-ins', hint:'past families, PRN, friends', target:15 },
    { k:'recruit', short:'Recruiting', label:'Recruiting', hint:'job posts, applicant replies', target:30 }
  ];
  const KEEP_DAYS = 120;
  const lc = (s) => String(s || '').trim().toLowerCase();
  const isPerson = (by) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(String(by || ''));
  /* the Central day of an ISO time */
  function ctDay(iso){ const t = Date.parse(iso || ''); if(isNaN(t)) return ''; return new Date(t).toLocaleString('sv-SE', { timeZone:'America/Chicago' }).slice(0, 10); }
  function today(){ return new Date().toLocaleString('sv-SE', { timeZone:'America/Chicago' }).slice(0, 10); }
  function dayNumber(start, day){ if(!start || !day) return 0; const a = Date.parse(start + 'T12:00:00Z'), b = Date.parse(day + 'T12:00:00Z'); if(isNaN(a) || isNaN(b)) return 0; return Math.floor((b - a) / 86400000) + 1; }
  function targets(cfg){ const t = (cfg && cfg.targets) || {}; const o = {}; BUCKETS.forEach(b => { const n = Number(t[b.k]); o[b.k] = (Number.isFinite(n) && n >= 0) ? Math.round(n) : b.target; }); return o; }

  /* Counts for one Central day. Returns { buckets:{k:{auto,mine,team,total}}, total, mine, auto, people:{email:n} }.
     mine = what `email` did (their taps + their logged actions); auto = done by the Hub's own senders. */
  function count(data, day, email){
    const D = data || {}, me = lc(email), cfg = (D.ops_settings && D.ops_settings.t100) || {};
    const out = { buckets:{}, total:0, mine:0, auto:0, people:{} };
    BUCKETS.forEach(b => { out.buckets[b.k] = { auto:0, mine:0, team:0, total:0 }; });
    const add = (k, who, n) => {
      if(!n || !out.buckets[k]) return; const b = out.buckets[k];
      b.total += n; out.total += n;
      if(!who){ b.auto += n; out.auto += n; return; }
      b.team += n; out.people[who] = (out.people[who] || 0) + n;
      if(who === me){ b.mine += n; out.mine += n; }
    };
    /* partners */
    const emailSeen = new Set(); let autoPartner = false;
    (D.referral_activities || []).forEach(a => {
      if(!a || ctDay(a.at) !== day) return;
      const by = lc(a.by);
      if(!isPerson(by)){ autoPartner = true; return; }
      if(a.kind === 'email'){ const key = by + '|' + (a.org_id || a.to || a.id); if(emailSeen.has(key)) return; emailSeen.add(key); }
      add('partners', by, 1);
    });
    if(autoPartner) add('partners', '', 1);
    /* warm: Campaigns sends, partner sends left out */
    (D.campaign_log || []).forEach(l => {
      if(!l || ctDay(l.at) !== day || !((l.sent || 0) > 0)) return;
      if(/partner|referr/i.test(String(l.source || '') + ' ' + String(l.key || ''))) return;
      add('warm', isPerson(l.by) ? lc(l.by) : '', 1);
    });
    /* recruiting: job posts */
    (D.recruit_posts || []).forEach(p => {
      if(!p || p.removed_at || ctDay(p.at) !== day) return;
      add('recruit', isPerson(p.by) ? lc(p.by) : '', 1);
    });
    /* taps */
    const taps = (cfg.taps && cfg.taps[day]) || {};
    Object.keys(taps).forEach(who => { const t = taps[who] || {}; BUCKETS.forEach(b => { const n = Math.max(0, Math.round(Number(t[b.k]) || 0)); add(b.k, lc(who), n); }); });
    return out;
  }

  /* the change one tap makes to ops_settings (pure, so the test can run it) */
  function applyTap(m, day, email, k, delta){
    const who = lc(email); if(!who || !BUCKETS.some(b => b.k === k)) return [];
    const t = m.t100 = (m.t100 && typeof m.t100 === 'object') ? m.t100 : {};
    if(!t.start) t.start = day;
    t.taps = (t.taps && typeof t.taps === 'object') ? t.taps : {};
    const d = t.taps[day] = t.taps[day] || {}; const p = d[who] = d[who] || {};
    const next = Math.max(0, (Number(p[k]) || 0) + delta);
    if(next === (Number(p[k]) || 0)) return [];
    p[k] = next;
    const cut = Date.parse(day + 'T12:00:00Z') - KEEP_DAYS * 86400000;
    Object.keys(t.taps).forEach(x => { const v = Date.parse(x + 'T12:00:00Z'); if(isNaN(v) || v < cut) delete t.taps[x]; });
    return ["today's 100"];
  }
  function applyTargets(m, vals){
    const t = m.t100 = (m.t100 && typeof m.t100 === 'object') ? m.t100 : {};
    const before = JSON.stringify(t.targets || {}); const o = {};
    BUCKETS.forEach(b => { const n = Math.round(Number(vals[b.k])); o[b.k] = (Number.isFinite(n) && n >= 0 && n <= 500) ? n : b.target; });
    if(JSON.stringify(o) === before) return [];
    t.targets = o; return ["today's 100 targets"];
  }

  const api = { BUCKETS, count, applyTap, applyTargets, targets, dayNumber, ctDay };
  if(typeof module !== 'undefined' && module.exports){ module.exports = api; return; }

  /* ---------- in the Hub ---------- */
  const W = window;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const data = () => (typeof DATA !== 'undefined' && DATA) || W.DATA || {};
  const myEmail = () => { try{ return lc(W.ccActor().email); }catch(e){ return ''; } };
  const isOwner = () => { try{ return typeof W.ccIsOwner === 'function' && W.ccIsOwner(myEmail()); }catch(e){ return false; } };
  const cfg = () => ((data().ops_settings || {}).t100) || {};
  const S = { mounts:{}, busy:false, msg:'', last:null, editing:false };

  function nameOf(email){
    const s = (data().coordinator_staff || []).find(x => lc(x.email) === email);
    return String((s && (s.first_name || s.name)) || String(email).split('@')[0]).split(' ')[0];
  }
  function bar(n, of){ const pct = of > 0 ? Math.min(100, Math.round(n * 100 / of)) : 0;
    return '<div style="height:8px;background:#EFE9DF;border-radius:4px;overflow:hidden;margin:6px 0 10px;"><div style="width:' + pct + '%;height:100%;background:#2E7D74;"></div></div>'; }
  function goal(tg){ return BUCKETS.reduce((s, b) => s + tg[b.k], 0); }

  function weekHtml(){
    const day = today(), c = count(data(), day, myEmail()), tg = targets(cfg()), g = goal(tg), dn = dayNumber(cfg().start, day);
    let h = '<div class="t100" style="background:#fff;border:1px solid var(--border,#E5DED3);border-radius:12px;padding:14px 16px;margin:0 0 14px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;"><b style="font-size:16px;">Today\'s 100</b>'
      + '<span style="font-size:12.5px;color:#8A7F70;">' + (dn > 0 && dn <= 100 ? 'Day ' + dn + ' of 100' : dn > 100 ? '100 days done' : 'Day 1 starts with the first +1') + '</span></div>'
      + '<div style="margin-top:4px;"><span style="font-size:26px;font-weight:800;">' + c.total + '</span> <span style="font-size:13.5px;color:#6B6257;">of ' + g + ' today'
      + (c.auto ? ' · ' + c.auto + ' counted on their own' : '') + '</span></div>' + bar(c.total, g);
    if(S.editing){
      h += '<div style="font-size:13px;color:#6B6257;margin-bottom:6px;">How many a day for each:</div>';
      BUCKETS.forEach(b => { h += '<label style="display:flex;justify-content:space-between;align-items:center;font-size:13.5px;padding:4px 0;">' + esc(b.label)
        + ' <input type="number" min="0" max="500" step="1" data-t100t="' + b.k + '" value="' + tg[b.k] + '" style="width:72px;padding:4px 6px;"></label>'; });
      h += '<div style="margin-top:8px;display:flex;gap:8px;"><button class="addlead" onclick="T100.saveTargets()">Save</button><button class="ghost" onclick="T100.edit(false)">Cancel</button></div>';
    } else {
      h += '<table style="width:100%;border-collapse:collapse;font-size:13.5px;">';
      BUCKETS.forEach(b => { const x = c.buckets[b.k];
        h += '<tr style="border-top:1px solid #EFE9DF;"><td style="padding:7px 0;">' + esc(b.label) + '<div style="font-size:12px;color:#8A7F70;">' + esc(b.hint) + (x.auto ? ' · ' + x.auto + ' on their own' : '') + '</div></td>'
          + '<td style="text-align:right;white-space:nowrap;">' + x.total + ' / ' + tg[b.k] + '</td>'
          + '<td style="text-align:right;width:52px;"><button class="ghost" style="padding:2px 10px;font-size:12.5px;" aria-label="Add one to ' + esc(b.label) + '" onclick="T100.tap(\'' + b.k + '\')">+1</button></td></tr>'; });
      h += '</table>';
      const ppl = Object.keys(c.people).sort((a, b) => c.people[b] - c.people[a]);
      h += '<div style="border-top:1px solid #EFE9DF;padding-top:8px;margin-top:2px;font-size:12.5px;color:#6B6257;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">'
        + '<span>' + (ppl.length ? ppl.map(e => esc(nameOf(e)) + ' ' + c.people[e]).join(' · ') : 'Nobody has added any yet today.') + '</span>'
        + '<span>' + (S.last ? '<button class="linklike" onclick="T100.undo()">Undo last +1</button> · ' : '') + (isOwner() ? '<button class="linklike" onclick="T100.edit(true)">Change the targets</button>' : '') + '</span></div>';
    }
    if(S.msg) h += '<div style="font-size:12.5px;color:#A33;margin-top:6px;">' + esc(S.msg) + '</div>';
    return h + '</div>';
  }
  function workHtml(){
    const day = today(), c = count(data(), day, myEmail()), g = goal(targets(cfg()));
    let h = '<div class="t100" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;color:#6B6257;margin:0 0 10px;padding:8px 12px;border:1px solid var(--border,#E5DED3);border-radius:10px;background:#fff;">'
      + '<b style="color:#2B2620;">Today\'s 100</b><span>You ' + c.mine + ' · Team ' + c.total + ' of ' + g + '</span><span style="flex:1;"></span>';
    BUCKETS.forEach(b => { h += '<button class="ghost" style="padding:2px 8px;font-size:12px;" title="' + esc(b.hint) + '" onclick="T100.tap(\'' + b.k + '\')">+1 ' + esc(b.short) + '</button>'; });
    if(S.last) h += '<button class="linklike" style="font-size:12px;" onclick="T100.undo()">Undo</button>';
    if(S.msg) h += '<span style="color:#A33;width:100%;">' + esc(S.msg) + '</span>';
    return h + '</div>';
  }
  function paint(){
    Object.keys(S.mounts).forEach(id => { const el = document.getElementById(id); if(!el) return; el.innerHTML = S.mounts[id] === 'week' ? weekHtml() : workHtml(); });
  }
  /* repaint once a minute while mounted, so the counts follow the Hub's own data refreshes */
  function render(id, kind){ S.mounts[id] = kind; paint(); if(!S.timer) S.timer = setInterval(() => { if(!S.busy && !S.editing) paint(); }, 60000); }
  async function save(apply){
    if(S.busy) return false; S.busy = true; S.msg = '';
    let out; try{ out = await W.ccMergeSave('ops_settings', apply); }catch(e){ out = { error:e }; }
    S.busy = false;
    if(out && out.error){ S.msg = 'Not saved: ' + (out.error.message || out.error); paint(); return false; }
    paint(); return true;
  }
  async function tap(k){
    const me = myEmail(); if(!me){ S.msg = 'Sign in first.'; paint(); return; }
    const day = today();
    if(await save(m => applyTap(m, day, me, k, 1))) { S.last = { k, day }; paint(); }
  }
  async function undo(){
    const l = S.last, me = myEmail(); if(!l || !me) return;
    if(await save(m => applyTap(m, l.day, me, l.k, -1))) { S.last = null; paint(); }
  }
  function edit(on){ S.editing = !!on; S.msg = ''; paint(); }
  async function saveTargets(){
    const vals = {}; document.querySelectorAll('[data-t100t]').forEach(i => { vals[i.getAttribute('data-t100t')] = i.value; });
    if(await save(m => applyTargets(m, vals))){ S.editing = false; paint(); }
  }
  W.T100 = Object.assign(api, { render, tap, undo, edit, saveTargets });
})();
