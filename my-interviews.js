/* =====================================================================================================================
   MY INTERVIEWS (Samantha 2026-11-23: "Make samantha and krystals video interview setup like katlins").
   Katlin's calendar shows her booked interviews with an easy Join video and the applicant's answers (katlin-calendar.js).
   This is the same for every interviewer, as a pill on the My Work row: My interviews.
     · shown to anyone whose sign-in email is on an interviewer row (coordinators.email), and to the owners
     · an owner can look at anyone's (the "Whose" picker); everyone else sees only their own
     · a week of their bookings (interview_bookings for that coordinators row), blue chips at their time
     · the day's list: 🎥 Join video (their own coordinators.meeting_link, lit 15 minutes before), 👤 About (the answers
       from the application, no phone or email), Open full profile (HP.open), Call, 📝 How did it go (the Interviews
       screen's own outcome card, ivqOutcome) and 🤝 Hand over (IHO), so there is still one record of everything
     · Missouri time, and (2026-11-25, her ask "it needs to show her day/time in Vietnam") the viewer's own day and time too
       when their computer is somewhere else, e.g. Katlin in Vietnam sees "6:30 AM Thu in Vietnam" under each time
   Nothing here writes, texts, emails or calls anyone by itself.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const W = root, TZ = 'America/Chicago';
  const lc = s => String(s || '').trim().toLowerCase();
  const esc = s => (typeof W.escapeHtmlComms === 'function' ? W.escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
  const enc = s => esc(JSON.stringify(String(s)));
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const me = () => { try{ return lc(W.ccActor().email); }catch(e){ return ''; } };
  const owner = () => { try{ return !!W.ccIsOwner(); }catch(e){ return false; } };
  const SBC = () => { try{ return (0, eval)('sb'); }catch(e){ return null; } };
  const active = () => { try{ return (0, eval)('activeTab'); }catch(e){ return ''; } };

  const DAY3 = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const addDays = (day, n) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dowOf = day => new Date(day + 'T12:00:00Z').getUTCDay();
  const dayOf = t => new Date(t).toLocaleDateString('en-CA', { timeZone:TZ });
  const mondayOf = day => addDays(day, -((dowOf(day) + 6) % 7));
  const clock = ts => new Date(ts).toLocaleString('en-US', { timeZone:TZ, hour:'numeric', minute:'2-digit' });
  /* the viewer's own clock, only when it is not Missouri's (Katlin in Vietnam) */
  const myTZ = () => { try{ return Intl.DateTimeFormat().resolvedOptions().timeZone || TZ; }catch(e){ return TZ; } };
  const PLACE = { 'Asia/Ho_Chi_Minh':'Vietnam', 'Asia/Saigon':'Vietnam' };
  const sameClock = ts => new Date(ts).toLocaleString('en-US', { timeZone:myTZ(), weekday:'short', hour:'numeric', minute:'2-digit' })
    === new Date(ts).toLocaleString('en-US', { timeZone:TZ, weekday:'short', hour:'numeric', minute:'2-digit' });
  function localSay(ts){
    const t = typeof ts === 'number' ? ts : Date.parse(ts); if(!t || sameClock(t)) return '';
    const s = new Date(t).toLocaleString('en-US', { timeZone:myTZ(), weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
    return s + ' ' + (PLACE[myTZ()] ? 'in ' + PLACE[myTZ()] : 'your time');
  }
  const localTag = ts => { const x = localSay(ts); return x ? `<span class="mv-local">${esc(x)}</span>` : ''; };
  const longDay = day => new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric', timeZone:'UTC' });

  /* ── state ── */
  const S = { coords:null, who:'', list:null, apps:{}, at:0, busy:false, err:'', sel:'', week:'', open:{}, loadedFor:'' };
  const APP_COLS = 'id,first_name,last_name,phone,email,posting_title,position,city,zip,miles_out,availability,hours_wanted,job_type,experience_years,experience_kinds,experience,has_license,has_transport,has_insurance,one_year,referral_source,screen_flags,work_history,role_answers,created_at,status';

  const myRow = () => (S.coords || []).find(r => lc(r.email) && lc(r.email) === me()) || null;
  const whoRow = () => (S.coords || []).find(r => r.id === S.who) || null;
  const mine = () => { const r = whoRow(); return !!r && lc(r.email) === me(); };
  const firstOf = r => String((r && r.name) || (r && r.email) || '').split(/[ @]/)[0];
  /* who may see the pill: an interviewer (their email is on a coordinators row) or an owner */
  function allowed(){ return owner() || !!myRow(); }

  async function loadCoords(){
    const sbc = SBC(); if(!sbc || S.coords) return;
    try{
      const r = await sbc.from('coordinators').select('id,name,email,meeting_link,active').order('name');
      if(r.error) throw r.error;
      S.coords = (r.data || []).filter(x => x.active !== false);
    }catch(e){ S.coords = []; S.err = 'The interviewers did not load (' + ((e && e.message) || 'no answer') + ').'; }
    if(!S.who){ const m = myRow(); S.who = m ? m.id : (owner() && S.coords[0] ? S.coords[0].id : ''); }
    pillSync();
  }
  async function loadIv(force){
    const sbc = SBC(); if(!sbc || S.busy) return;
    await loadCoords();
    if(!S.who){ S.list = []; return; }
    if(!force && S.loadedFor === S.who && S.list && Date.now() - S.at < 2 * 60e3) return;
    S.busy = true;
    try{
      const from = new Date(Date.now() - 45 * 864e5).toISOString();
      const b = await sbc.from('interview_bookings').select('id,applicant_id,coordinator_id,starts_at,ends_at,status,video,notes,reply_text')
        .eq('coordinator_id', S.who).in('status', ['booked', 'attended', 'noshow']).gte('starts_at', from).order('starts_at');
      if(b.error) throw b.error;
      const list = b.data || [];
      const ids = [...new Set(list.map(x => x.applicant_id).filter(Boolean))].filter(id => !S.apps[id]);
      if(ids.length){ const a = await sbc.from('job_applicants').select(APP_COLS).in('id', ids); if(!a.error) (a.data || []).forEach(r => { S.apps[r.id] = r; }); }
      S.list = list; S.loadedFor = S.who; S.at = Date.now(); S.err = '';
    }catch(e){ S.err = 'The interviews did not load (' + ((e && e.message) || 'no answer') + '). They show again on the next refresh.'; S.list = S.list || []; S.at = Date.now(); }
    S.busy = false;
    if(active() === 'myinterviews') render();
  }

  const ivOn = (list, day) => (list || []).filter(b => b && b.starts_at && dayOf(b.starts_at) === day).sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at)));
  function ivWhen(b, now){
    const s = Date.parse(b.starts_at), e = Date.parse(b.ends_at || '') || s + 30 * 60e3;
    if(b.status !== 'booked') return 'over';
    if(now > e + 30 * 60e3) return 'past';
    if(now >= s - 15 * 60e3) return 'now';
    return 'later';
  }
  const isVideo = b => b.video === true;
  const ivName = a => ((a.first_name || '') + ' ' + (a.last_name || '')).trim() || 'Applicant';
  const ivShort = a => ((a.first_name || 'Applicant') + (a.last_name ? ' ' + String(a.last_name).charAt(0) + '.' : ''));
  const yesNo = v => v === true ? 'Yes' : v === false ? 'No' : '';
  const ONE_YEAR = { yes:'Yes', no:'No', family:'Caring for family only', unsure:'Not sure' };
  function listText(v){
    if(v == null || v === '') return '';
    if(Array.isArray(v)) return v.map(o => typeof o === 'string' ? o : o && typeof o === 'object' ? [o.employer || o.company || o.where, o.title || o.role || o.job, o.dates || o.years || o.when, o.label || o.text].filter(Boolean).join(' · ') : String(o)).filter(Boolean).join('\n');
    if(typeof v === 'object') return Object.keys(v).map(k => cap(String(k).replace(/_/g, ' ')) + ': ' + (typeof v[k] === 'object' ? JSON.stringify(v[k]) : v[k])).join('\n');
    return String(v);
  }
  function aboutRows(a, b){
    const where = [a.city || (a.zip ? 'ZIP ' + a.zip : ''), a.miles_out ? 'about ' + a.miles_out + ' miles from the office' : ''].filter(Boolean).join(' · ');
    const exp = [a.experience_years ? a.experience_years + (/year/i.test(a.experience_years) ? '' : ' years') : '', Array.isArray(a.experience_kinds) && a.experience_kinds.length ? a.experience_kinds.join(', ') : ''].filter(Boolean).join(' · ');
    const drive = [['License', a.has_license], ['Car', a.has_transport], ['Insurance', a.has_insurance]].filter(x => yesNo(x[1])).map(x => x[0] + ' ' + yesNo(x[1]).toLowerCase()).join(' · ');
    return [
      ['Applying for', a.posting_title || a.position || ''],
      ['Applied', a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { timeZone:TZ, month:'short', day:'numeric', year:'numeric' }) : ''],
      ['Lives', where],
      ['Wants', [a.hours_wanted, a.job_type].filter(Boolean).join(' · ')],
      ['Can work', a.availability || ''],
      ['Experience', exp],
      ['In their words', a.experience || ''],
      ['Driving', drive],
      ['Can stay a year', ONE_YEAR[lc(a.one_year)] || (a.one_year ? cap(String(a.one_year)) : '')],
      ['Past jobs', listText(a.work_history)],
      ['Their answers', listText(a.role_answers)],
      ['Worth asking about', listText(a.screen_flags)],
      ['Heard about us', a.referral_source || ''],
      ['Their note', [b && b.notes, b && b.reply_text].filter(Boolean).join('\n')]
    ].filter(r => String(r[1] || '').trim());
  }
  function joinBtn(b, now, big){
    const w = ivWhen(b, now), link = (whoRow() || {}).meeting_link || '';
    if(!isVideo(b)) return '<span class="mv-when">🏢 In person at the office</span>';
    if(!link) return `<span class="mv-when">${mine() ? 'No video link on your profile yet. Add it on the Team Calendar (🎥 Add video link).' : 'No video link saved for ' + esc(firstOf(whoRow())) + ' yet (Team Calendar, 🎥 Add video link).'}</span>`;
    if(w === 'past' || w === 'over') return '';
    return `<a class="mv-join${w === 'now' ? ' live' : ''}${big ? ' big' : ''}" href="${esc(link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🎥 Join video${w === 'now' ? ' now' : ''}</a>`;
  }
  function ivRow(b, now){
    const a = S.apps[b.applicant_id] || {}, w = ivWhen(b, now), key = 'iv:' + b.id, open = !!S.open[key], t = Date.parse(b.starts_at);
    const st = b.status === 'attended' ? '<span class="mv-tag" style="--c:#14606F;--b:#E3F1F3">Came</span>' : b.status === 'noshow' ? '<span class="mv-tag" style="--c:#B91C1C;--b:#FEE2E2">No-show</span>'
      : w === 'past' ? '<span class="mv-tag" style="--c:#B45309;--b:#FEF3C7">How did it go?</span>' : w === 'now' ? '<span class="mv-tag" style="--c:#1F5E8C;--b:#E6F0F8">Starting</span>' : '';
    const rows = aboutRows(a, b);
    return `<div class="mv-iv${w === 'now' ? ' live' : ''}">
      <div class="mv-iv-top"><span class="mv-iv-time">${isVideo(b) ? '🎥' : '🏢'} ${esc(clock(t))} Missouri</span>${localTag(t)}<span class="mv-when">${isVideo(b) ? 'Video' : 'In person'}</span>${st}</div>
      <div class="mv-iv-name">${esc(ivName(a))} <span class="mv-when">· ${esc(a.posting_title || a.position || 'Caregiver')} interview</span></div>
      <div class="mv-acts">${joinBtn(b, now, true)}
        <button onclick="MIV.toggle(${enc(key)})">${open ? 'Hide' : '👤 About ' + esc(a.first_name || 'them')}</button>
        <button onclick="MIV.openApplicant(${enc(b.applicant_id)})">Open full profile</button>
        ${a.phone && typeof W.ocAttrs === 'function' ? `<a class="mv-a"${W.ocAttrs(a.phone, { email:a.email })}>📞 Call</a>` : ''}
        ${b.status === 'booked' && (w === 'past' || w === 'now') ? `<button onclick="MIV.ivOutcome(${enc(b.applicant_id)})">📝 How did it go?</button>` : ''}
        ${b.status === 'booked' && t > now && W.IHO ? `<button onclick="MIV.handOver(${enc(b.applicant_id)})" title="Can't make it? Same time, someone else does it">🤝 Hand over</button>` : ''}</div>
      ${open ? `<div class="mv-about">${rows.length ? rows.map(r => `<div><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div>`).join('') : '<div class="mv-when">Their application did not load. Open full profile to see it.</div>'}</div>` : ''}</div>`;
  }

  function css(){
    if(document.getElementById('mivCss')) return;
    const s = document.createElement('style'); s.id = 'mivCss';
    s.textContent = `
.miv .mv-h{font-size:22px;font-weight:700;color:var(--navy,#0D365F);margin:4px 0 2px}
.miv .mv-sub{color:var(--text-muted,#55677a);margin-bottom:14px}
.miv .mv-when{color:#55677a;font-size:13px}
.miv .mv-top{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
.miv .mv-top select,.miv .mv-top button,.miv .mv-acts button,.miv .mv-acts a.mv-a{font:inherit;font-size:13.5px;padding:6px 12px;border-radius:8px;border:1px solid #cfd8e3;background:#fff;color:#0D365F;cursor:pointer;text-decoration:none}
.miv .mv-bar{display:flex;gap:14px;align-items:center;flex-wrap:wrap;background:#E6F0F8;border:1px solid #c7dbee;border-radius:12px;padding:12px 16px;margin-bottom:14px}
.miv .mv-bar b{color:#0D365F}
.miv .mv-local{display:inline-block;background:#FEF3C7;color:#92400E;border-radius:999px;padding:1px 9px;font-size:12px;font-weight:700;margin-left:6px}
.miv .mv-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;margin-bottom:16px}
.miv .mv-col{background:#fff;border:1px solid #e1e7ee;border-radius:10px;padding:8px;min-height:96px;cursor:pointer}
.miv .mv-col.sel{border-color:#1F5E8C;box-shadow:0 0 0 2px #1F5E8C33}
.miv .mv-col.today .mv-dh b{background:#0D365F;color:#fff;border-radius:999px;padding:0 7px}
.miv .mv-dh{display:flex;justify-content:space-between;font-size:12.5px;color:#55677a;margin-bottom:6px}
.miv .mv-chip{font-size:12.5px;background:#E6F0F8;color:#1F5E8C;border-radius:6px;padding:3px 6px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.miv .mv-chip.done{opacity:.55}
.miv .mv-none{font-size:12px;color:#9aa8b6}
.miv .mv-day{font-weight:700;color:#0D365F;margin:4px 0 8px;font-size:16px}
.miv .mv-iv{background:#fff;border:1px solid #c7dbee;border-left:4px solid #1F5E8C;border-radius:10px;padding:12px 14px;margin-bottom:10px}
.miv .mv-iv.live{background:#F3F8FC}
.miv .mv-iv-top{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.miv .mv-iv-time{font-weight:700;color:#1F5E8C}
.miv .mv-iv-name{font-size:16px;font-weight:600;color:#0D365F;margin:4px 0 8px}
.miv .mv-acts{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.miv .mv-tag{font-size:12px;font-weight:600;color:var(--c);background:var(--b);border-radius:999px;padding:2px 9px}
.miv a.mv-join{display:inline-block;background:#fff;color:#1F5E8C;border:1px solid #1F5E8C;border-radius:8px;padding:6px 12px;font-weight:600;font-size:13.5px;text-decoration:none}
.miv a.mv-join.live{background:#1F5E8C;color:#fff}
.miv a.mv-join.big{font-size:14.5px;padding:7px 14px}
.miv .mv-about{margin-top:10px;display:grid;gap:6px;font-size:13.5px}
.miv .mv-about div{display:grid;grid-template-columns:150px 1fr;gap:10px}
.miv .mv-about b{color:#55677a;font-weight:600}
.miv .mv-about span{white-space:pre-line}
.miv .mv-err{background:#FEF3C7;color:#92400E;border-radius:8px;padding:8px 12px;margin-bottom:12px}
@media(max-width:760px){.miv .mv-week{grid-template-columns:1fr}.miv .mv-col{min-height:0}.miv .mv-about div{grid-template-columns:1fr;gap:0}}`;
    document.head.appendChild(s);
  }

  function view(now){
    const today = dayOf(now);
    if(!S.sel) S.sel = today;
    if(!S.week) S.week = mondayOf(S.sel);
    const r = whoRow(), nm = firstOf(r);
    if(!S.coords) return '<div class="miv"><div class="mv-when">Loading…</div></div>';
    if(!r) return '<div class="miv"><div class="mv-h">My interviews</div><div class="mv-sub">You are not set up as an interviewer yet. An owner adds interview hours on the Team Calendar.</div></div>';
    const list = S.list || [];
    const next = list.filter(b => b.status === 'booked' && ['now', 'later'].includes(ivWhen(b, now))).sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at)))[0];
    const picker = owner() && S.coords.length > 1 ? `<label class="mv-when">Whose <select onchange="MIV.setWho(this.value)">${S.coords.map(c => `<option value="${esc(c.id)}"${c.id === S.who ? ' selected' : ''}>${esc(firstOf(c))}${lc(c.email) === me() ? ' (you)' : ''}</option>`).join('')}</select></label>` : '';
    const days = [0,1,2,3,4,5,6].map(i => addDays(S.week, i));
    const linkSay = r.meeting_link ? `${mine() ? 'Your' : esc(nm) + "'s"} video room: <a href="${esc(r.meeting_link)}" target="_blank" rel="noopener">${esc(r.meeting_link.replace(/^https?:\/\//, ''))}</a>` : (mine() ? 'No video link on your profile yet. Add it on the Team Calendar (🎥 Add video link).' : 'No video link saved for ' + esc(nm) + ' yet.');
    const nextSay = next ? `🎥 Next: <b>${esc(longDay(dayOf(next.starts_at)) === longDay(today) ? 'Today' : longDay(dayOf(next.starts_at)))} ${esc(clock(Date.parse(next.starts_at)))}</b> Missouri${localSay(next.starts_at) ? ' (<b>' + esc(localSay(next.starts_at)) + '</b>)' : ''} with <b>${esc(ivShort(S.apps[next.applicant_id] || {}))}</b> ${joinBtn(next, now, false)}` : 'No interviews booked coming up.';
    return `<div class="miv">
      <div class="mv-h">${mine() ? 'My interviews' : esc(nm) + "'s interviews"}</div>
      <div class="mv-sub">${mine() ? 'Every interview booked with you. Press 👤 About to read their application before you start. 🎥 Join video opens your video room and lights up 15 minutes before. Afterwards press 📝 How did it go?' : 'What ' + esc(nm) + ' sees: every interview booked with them.'} Times are Missouri time${localSay(Date.now()) ? ', with your ' + (PLACE[myTZ()] ? PLACE[myTZ()] + ' ' : '') + 'day and time under each one. Right now it is ' + esc(clock(Date.now())) + ' in Missouri and ' + esc(localSay(Date.now())) : ''}.</div>
      ${S.err ? `<div class="mv-err">${esc(S.err)}</div>` : ''}
      <div class="mv-bar"><div>${nextSay}</div><div class="mv-when" style="margin-left:auto">${linkSay}</div></div>
      <div class="mv-top">${picker}
        <button onclick="MIV.shift(-7)">‹ Last week</button><button onclick="MIV.thisWeek()">This week</button><button onclick="MIV.shift(7)">Next week ›</button>
        <span class="mv-when">${esc(longDay(days[0]))} to ${esc(longDay(days[6]))}</span>
        <button onclick="MIV.refresh()" style="margin-left:auto">↻ Refresh</button></div>
      <div class="mv-week">${days.map(d => { const ivs = ivOn(list, d), dt = new Date(d + 'T12:00:00Z');
        return `<div class="mv-col${d === S.sel ? ' sel' : ''}${d === today ? ' today' : ''}" onclick="MIV.pick(${enc(d)})"><div class="mv-dh"><span>${DAY3[dt.getUTCDay()]}</span><b>${dt.getUTCDate()}</b></div>
          ${ivs.length ? ivs.map(b => `<div class="mv-chip${b.status !== 'booked' ? ' done' : ''}">${isVideo(b) ? '🎥' : '🏢'} ${esc(clock(Date.parse(b.starts_at)))} ${esc(ivShort(S.apps[b.applicant_id] || {}))}</div>`).join('') : '<div class="mv-none">No interviews</div>'}</div>`; }).join('')}</div>
      <div class="mv-day">${esc(S.sel === today ? 'Today, ' + longDay(S.sel) : longDay(S.sel))}</div>
      ${ivOn(list, S.sel).map(b => ivRow(b, now)).join('') || '<div class="mv-when">No interviews this day.</div>'}
    </div>`;
  }

  function render(){
    const el = document.getElementById('mivWrap'); if(!el) return;
    css();
    el.innerHTML = view(Date.now());
    loadIv(false);
  }
  /* show the pill in the My Work row only for interviewers and owners: once the interviewer list is in, redraw the row */
  function pillSync(){
    if(!S.coords){ loadCoords(); return; }
    try{ const bar = document.getElementById('fsub2'), t = active(), want = allowed();
      if(bar && (0, eval)('CC_PARENT_OF')[t] === 'myworkgrp' && want !== !!bar.querySelector('[data-tab="myinterviews"]') && typeof W.ccRenderSub2 === 'function') W.ccRenderSub2(t); }catch(e){}
  }
  setInterval(() => { try{ if(active() === 'myinterviews' && !document.hidden){ const el = document.getElementById('mivWrap'); if(el){ css(); el.innerHTML = view(Date.now()); } loadIv(false); } }catch(e){} }, 60e3);

  const MIV = {
    allowed, render, pillSync, localSay, _s:S, _rules:{ ivWhen, aboutRows, ivOn, mondayOf },
    setWho(id){ S.who = String(id); S.list = null; S.loadedFor = ''; S.open = {}; render(); loadIv(true); },
    pick(day){ S.sel = String(day); render(); },
    shift(n){ S.week = addDays(S.week || mondayOf(dayOf(Date.now())), n); S.sel = S.week; render(); },
    thisWeek(){ S.sel = dayOf(Date.now()); S.week = mondayOf(S.sel); render(); },
    refresh(){ S.coords = null; render(); loadIv(true); },
    toggle(key){ S.open[key] = !S.open[key]; render(); },
    openApplicant(id){ try{ if(W.HP && typeof W.HP.open === 'function') W.HP.open({ applicant_id:String(id) }); }catch(e){} },
    ivOutcome(id){ try{ const f = (0, eval)('ivqOutcome'); if(typeof f === 'function') f(String(id)); }catch(e){} },
    handOver(id){ try{ if(W.IHO) W.IHO.open(String(id)); }catch(e){} }
  };
  W.MIV = MIV;
})(typeof window !== 'undefined' ? window : globalThis);
