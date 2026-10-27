/* =====================================================================================================================
   FRIENDS & FAMILY (Referrals & Marketing > Friends & Family; step 4 of the Friends & Family Referral Program, 2026-10-27).
   Samantha 2026-10-27: "I approve step 4 as recommended: the wording as written, owners-only tab, family credit on the
   connected client's invoice, printed card requests emailed to me. Leave office staff out of caregiver invitations."
   Owners only. Everything comes from the ff-invite-check server function, which checks the person is an owner and keeps
   the records private (the page never reads them itself):
     · the two switches: Invitations (off until she turns them on after the two-week preview) and Program paused
     · today's list: who is ready, waiting (with the date) or held (with the reason); Skip (with a reason) and Undo skip
     · who was invited, when, by text or email, whether it went through; Resend
     · Payer needed: clients held only because the Hub doesn't know how they pay
     · referrals received: new inquiries that came in through someone's personal link (from the Hub's own inquiries)
   A Care Coordinator sees "Owners run this program" and nothing else: no names, no rewards (her rule).
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const ST = { data:null, busy:false, show:'ready', q:'' };
  const el = () => document.getElementById('ffMount');
  const owner = () => { try{ return typeof ccIsOwner === 'function' && !!ccIsOwner(); }catch(e){ return false; } };
  const day = iso => { if(!iso) return ''; const d = new Date(String(iso).length === 10 ? iso + 'T12:00:00Z' : iso); return isNaN(d) ? '' : d.toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric' }); };
  const when = iso => { if(!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }); };
  const css = () => { if(document.getElementById('ffCss')) return; const s = document.createElement('style'); s.id = 'ffCss';
    s.textContent = '.ff-sw{display:flex;gap:18px;flex-wrap:wrap;align-items:center;padding:12px 14px}.ff-sw label{display:flex;gap:8px;align-items:center;font-weight:600;color:var(--navy);font-size:14px;white-space:nowrap}'
      + '.ff-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0}.ff-t{border:1px solid var(--border);border-radius:10px;padding:10px 12px;background:#fff}'
      + '.ff-t b{display:block;font-size:24px;color:var(--navy);font-variant-numeric:tabular-nums}.ff-t span{font-size:12.5px;color:var(--text-muted)}'
      + '.ff-k{font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--text-muted);margin:18px 0 6px}'
      + '.ff-row{display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;padding:9px 0;border-top:1px solid var(--border)}.ff-row .who{flex:1 1 240px;min-width:0}'
      + '.ff-row b{color:var(--navy)}.ff-sub{font-size:12.5px;color:var(--text-muted)}.ff-chip{font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap}'
      + '.ff-ready{background:#E7F6EC;color:#1F7A4D}.ff-waiting{background:#FDF3E3;color:#A8660E}.ff-held{background:#F1F5F9;color:#64748B}.ff-bad{background:#FDE8E8;color:#B23B2E}'
      + '.ff-row button{padding:5px 11px;font-size:12px}.ff-banner{background:#FDF3E3;color:#7A4A0B;border-radius:10px;padding:10px 12px;margin:8px 0;font-size:13px}'
      + '.ff-filters{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.ff-filters button{padding:4px 11px;font-size:12.5px;border-radius:999px}'
      + '.ff-filters button[aria-pressed="true"]{background:var(--teal,#1F7A8C);color:#fff;border-color:transparent}'
      + '@media (max-width:760px){.ff-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}';
    document.head.appendChild(s); };
  async function call(body){
    try{ const { data, error } = await sb.functions.invoke('ff-invite-check', { body });
      if(error){ let m = error.message || 'Could not reach the Friends & Family service.'; try{ const j = await error.context.json(); if(j && j.error) m = j.error; }catch(e){} return { error:m }; }
      return data || { error:'No answer.' };
    }catch(e){ return { error:'Could not reach the Friends & Family service.' }; }
  }
  const say = m => { try{ ccToast(m); }catch(e){} };
  async function load(){ ST.busy = true; draw(); ST.data = await call({ action:'list' }); ST.busy = false; draw(); }

  /* referrals received: the Hub's own inquiries whose partner is a Friends & Family person (no money here) */
  function referrals(){
    const orgs = ((typeof DATA !== 'undefined' && DATA.referral_orgs) || []).filter(o => o && o.program_track === 'friends');
    const byId = new Map(orgs.map(o => [String(o.id), o]));
    return ((typeof DATA !== 'undefined' && DATA.leads) || []).filter(l => l && byId.has(String(l.referral_org_id)) && !(l.spam && l.spam.at))
      .map(l => ({ l, o:byId.get(String(l.referral_org_id)) })).sort((a, b) => String(b.l.created_at || '').localeCompare(String(a.l.created_at || '')));
  }
  const nameOf = l => [l.first_name, l.last_name].filter(Boolean).join(' ') || 'An inquiry';
  const chip = st => '<span class="ff-chip ff-' + esc(st) + '">' + esc({ ready:'Ready', waiting:'Waiting', held:'Held' }[st] || st) + '</span>';
  const kindWords = r => r.kind === 'caregiver' ? 'Caregiver' : r.kind === 'client' ? 'Client' : 'Family of ' + (r.client || 'a client');

  function draw(){
    const m = el(); if(!m) return; css();
    if(!owner()){ m.innerHTML = '<div class="card" style="padding:16px 18px;"><b style="color:var(--navy)">Owners run this program</b><p class="field-note" style="margin:6px 0 0;">Nothing here needs anything from you. If someone asks about referring a friend, they can call the office at (417) 234-8494.</p></div>'; return; }
    const d = ST.data;
    if(!d){ m.innerHTML = '<div class="field-note">' + (ST.busy ? 'Loading…' : '') + '</div>'; return; }
    if(d.error){ m.innerHTML = '<div class="ff-banner">' + esc(d.error) + ' <button class="secondary" onclick="FFT.load()">Try again</button></div>'; return; }
    const run = d.run || {}, people = Array.isArray(run.people) ? run.people : [], inv = Array.isArray(d.invites) ? d.invites : [], sw = d.switches || {};
    const sentCount = inv.filter(x => x.status === 'sent' || x.status === 'partial').length;
    const count = st => people.filter(p => p.status === st && p.kind !== 'client').length;
    const last = Array.isArray(sw.log) && sw.log.length ? sw.log[sw.log.length - 1] : null;
    let h = '<div class="card ff-sw">'
      + '<label><input type="checkbox" id="ffLive"' + (sw.live ? ' checked' : '') + ' onchange="FFT.flip(\'ff_invites_live\', this.checked)"> Invitations ' + (sw.live ? 'ON' : 'OFF') + '</label>'
      + '<label><input type="checkbox" id="ffPaused"' + (sw.paused ? ' checked' : '') + ' onchange="FFT.flip(\'ff_program_paused\', this.checked)"> Program paused</label>'
      + '<span class="ff-sub">' + (sw.live && !sw.paused ? 'Each ready person is invited once, weekday mornings, ' + esc(d.cap || 60) + ' at most a morning.' : 'Nothing is sent while Invitations are off or the program is paused. The list still updates every morning.')
      + (last ? ' Last change: ' + esc(last.name === 'ff_invites_live' ? 'Invitations' : 'Paused') + ' ' + (last.on ? 'on' : 'off') + ' by ' + esc(last.by) + ', ' + esc(when(last.at)) + '.' : '') + '</span></div>';
    h += '<div class="ff-tiles"><div class="ff-t"><b>' + count('ready') + '</b><span>Ready today</span></div><div class="ff-t"><b>' + count('waiting') + '</b><span>Waiting</span></div>'
      + '<div class="ff-t"><b>' + count('held') + '</b><span>Held</span></div><div class="ff-t"><b>' + sentCount + '</b><span>Invited so far</span></div></div>';
    if(!run.run_day) h += '<div class="ff-banner">The daily check hasn\'t run yet.</div>';
    else h += '<div class="ff-sub">The check ran ' + esc(when(run.ran_at)) + '.' + (run.sent ? ' ' + esc(run.sent) + ' invited that morning.' : '') + '</div>';
    if(run.problems && run.problems.length) h += '<div class="ff-banner"><b>Couldn\'t read everything that morning:</b> ' + run.problems.map(esc).join('; ') + '. Anyone it couldn\'t check is held, never invited.</div>';

    /* today's list */
    const q = ST.q.trim().toLowerCase();
    const shown = people.filter(p => p.kind !== 'client' && (ST.show === 'all' || p.status === ST.show) && (!q || (p.name + ' ' + (p.client || '')).toLowerCase().includes(q)))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    h += '<div id="ffList"><div class="ff-k">Today\'s list</div><div class="ff-filters">'
      + [['ready', 'Ready'], ['waiting', 'Waiting'], ['held', 'Held'], ['all', 'All']].map(([k, w]) => '<button class="secondary" aria-pressed="' + (ST.show === k) + '" onclick="FFT.show(\'' + k + '\')">' + w + '</button>').join('')
      + '<input id="ffQ" type="search" placeholder="Search a name" value="' + esc(ST.q) + '" oninput="FFT.search(this.value)" style="max-width:220px;margin-left:6px;"></div>';
    h += shown.length ? shown.map(p => {
      const skipped = (p.why || [])[0] && /^Skipped/.test(p.why[0]);
      const how = p.status === 'ready' ? (p.channels || []).map(c => c === 'text' ? 'Text' : 'Email').join(' and ') : '';
      const done = p.invited ? 'Invited ' + day(p.invited.at) + (p.invited.status !== 'sent' ? ' (' + p.invited.status + ')' : '') : '';
      const btn = skipped ? '<button class="secondary" onclick="FFT.unskip(\'' + esc(p.key) + '\')">Undo skip</button>'
        : (!p.invited ? '<button class="secondary" onclick="FFT.skip(\'' + esc(p.key) + '\', \'' + esc(String(p.name).replace(/'/g, '')) + '\')">Skip</button>' : '');
      return '<div class="ff-row" data-key="' + esc(p.key) + '"><div class="who"><b>' + esc(p.name) + '</b> ' + chip(p.status) + '<div class="ff-sub">' + esc(kindWords(p)) + (p.payer ? ' · ' + esc(p.payer) : '') + '</div>'
        + '<div class="ff-sub" style="color:var(--text)">' + esc([how, done, ...(p.why || [])].filter(Boolean).join(' · ')) + (p.note ? ' · ' + esc(p.note) : '') + '</div></div>' + btn + '</div>';
    }).join('') : '<div class="ff-sub" style="padding:8px 0;">Nobody here.</div>';
    h += '</div>';

    /* invited */
    const sent = inv.filter(x => x.status !== 'skipped');
    h += '<div id="ffInvited"><div class="ff-k">Invited</div>' + (sent.length ? sent.map(x => {
      const ch = (x.channels || []).map(c => (c.channel === 'text' ? 'Text' : 'Email') + (c.ok ? ' sent' : ' did not go' + (c.why ? ' (' + c.why + ')' : ''))).join(' · ');
      const tone = x.status === 'sent' ? 'ready' : x.status === 'partial' ? 'waiting' : 'bad';
      return '<div class="ff-row" data-inv="' + esc(x.person_key) + '"><div class="who"><b>' + esc(x.name) + '</b> <span class="ff-chip ff-' + tone + '">' + esc({ sent:'Sent', partial:'Partly sent', failed:'Did not go' }[x.status] || x.status) + '</span>'
        + '<div class="ff-sub">' + esc(x.kind === 'caregiver' ? 'Caregiver' : 'Family' + (x.client_name ? ' of ' + x.client_name : '')) + ' · ' + esc(when(x.last_sent_at)) + (x.sends > 1 ? ' · sent ' + esc(x.sends) + ' times' : '') + ' · link ' + esc(x.code || '') + '</div>'
        + '<div class="ff-sub" style="color:var(--text)">' + esc(ch) + '</div></div><button class="secondary" onclick="FFT.resend(\'' + esc(x.person_key) + '\')">Resend</button></div>';
    }).join('') : '<div class="ff-sub" style="padding:8px 0;">Nobody yet.' + (sw.live ? '' : ' Invitations are off.') + '</div>') + '</div>';

    /* payer needed (one line per client) */
    const pn = new Map();
    for(const p of people) if((p.why || []).some(w => /^Payer needed/.test(w))){ const k = p.client_ax || p.client || p.name; if(!pn.has(k)) pn.set(k, { client:p.client || p.name, why:(p.why || []).find(w => /^Payer needed/.test(w)) }); }
    h += '<div id="ffPayer"><div class="ff-k">Payer needed</div>' + (pn.size ? [...pn.values()].map(x => '<div class="ff-row"><div class="who"><b>' + esc(x.client) + '</b><div class="ff-sub">' + esc(x.why.replace(/^Payer needed: /, '').replace(/^./, c => c.toUpperCase())) + '. Set how they pay on their inquiry; the next morning\'s check picks it up.</div></div></div>').join('') : '<div class="ff-sub" style="padding:8px 0;">None.</div>') + '</div>';

    /* referrals received */
    const rs = referrals();
    h += '<div id="ffRefs"><div class="ff-k">Referrals received</div>' + (rs.length ? rs.map(({ l, o }) => '<div class="ff-row"><div class="who"><b>' + esc(nameOf(l)) + '</b><div class="ff-sub">Referred by ' + esc(o.name)
      + (o.ff_kind === 'caregiver' ? ' (caregiver)' : o.ff_client ? ' (family of ' + esc(o.ff_client) + ')' : '') + ' · came in ' + esc(day(l.created_at)) + ' · ' + esc(l.status || 'New') + (l.first_shift_at ? ' · first visit ' + esc(day(l.first_shift_at)) : '') + '</div></div>'
      + '<button class="secondary" onclick="try{openLeadProfile(\'' + esc(l.id) + '\')}catch(e){}">Open</button></div>').join('') : '<div class="ff-sub" style="padding:8px 0;">None yet.</div>') + '</div>';
    m.innerHTML = h;
    if(ST.focus){ const qq = document.getElementById('ffQ'); if(qq){ qq.focus(); qq.setSelectionRange(qq.value.length, qq.value.length); } ST.focus = false; }
  }

  async function flip(name, on){
    const word = name === 'ff_invites_live' ? (on ? 'Turn Invitations ON? Every ready person will be invited the next weekday morning, once, in the approved words.' : 'Turn Invitations OFF? Nothing more is sent until they are back on.')
      : (on ? 'Pause the program? Nothing is sent while it is paused.' : 'Unpause the program?');
    let yes = false; try{ yes = await ccConfirm(word); }catch(e){ yes = window.confirm(word); }
    if(!yes){ draw(); return; }
    const r = await call({ action:'switch', name, on });
    if(r.error) say(r.error); else say(name === 'ff_invites_live' ? 'Invitations ' + (on ? 'on.' : 'off.') : on ? 'Program paused.' : 'Program unpaused.');
    load();
  }
  async function skip(key, name){
    const why = window.prompt('Why skip ' + name + '? (They won\'t be invited.)', '');
    if(why == null) return; if(!why.trim()){ say('Say why, so the next person knows.'); return; }
    const r = await call({ action:'skip', key, name, why:why.trim() }); if(r.error) say(r.error); else { say(name + ' skipped.'); load(); }
  }
  async function unskip(key){ const r = await call({ action:'unskip', key }); if(r.error) say(r.error); else { say('Skip undone. They are checked again tomorrow morning.'); load(); } }
  async function resend(key){
    let yes = false; const w = 'Send this invitation again now? It takes about a minute.'; try{ yes = await ccConfirm(w); }catch(e){ yes = window.confirm(w); }
    if(!yes) return;
    say('Sending…'); const r = await call({ action:'resend', key }); say(r.error ? r.error : 'Sent again.'); load();
  }
  function mount(){ draw(); if(owner()) load(); }   /* a Care Coordinator's page never asks the server */
  window.FFT = { mount, load, draw, flip, skip, unskip, resend, referrals,
    show(k){ ST.show = k; draw(); }, search(v){ ST.q = v; ST.focus = true; draw(); }, state:ST };
})();
