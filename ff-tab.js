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
     · the $100 (step 5, 2026-10-27, "live as I decided"): each referred client with a first visit, hours of 20 from AxisCare,
       the "payment received" tick, Ready / Under review with the reasons; Approve, Not earned, then Credit applied (family,
       the date it went on the invoice in AxisCare) or Paid (caregiver, the Viventium payroll date). Nothing pays by itself.
   A Care Coordinator sees "Owners run this program" and nothing else: no names, no rewards (her rule).
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const ST = { data:null, busy:false, view:'', show:'ready', q:'' };
  const el = () => document.getElementById('ffMount');
  const owner = () => { try{ return typeof ccIsOwner === 'function' && !!ccIsOwner(); }catch(e){ return false; } };
  const day = iso => { if(!iso) return ''; const d = new Date(String(iso).length === 10 ? iso + 'T12:00:00Z' : iso); return isNaN(d) ? '' : d.toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric' }); };
  const when = iso => { if(!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }); };
  /* DESIGN (her ask 2026-10-27: "make sure the design is clear not confusing or jumbled"): one status card with the two switches as
     real buttons; four views, one at a time (Needs you, Invitations, Rewards, Referrals), each a white card with a plain heading;
     every row = name + one status chip, one line saying who or what, one line only when there is a reason, the action on the right. */
  const css = () => { if(document.getElementById('ffCss')) return; const s = document.createElement('style'); s.id = 'ffCss';
    s.textContent = '.ff-top{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:16px 18px;border-radius:12px;border:1px solid var(--border);background:#fff;margin-bottom:14px}'
      + '.ff-top.on{border-color:#9FD5B4;background:#F3FBF6}.ff-top.paused{border-color:#EBC98A;background:#FFF8EC}'
      + '.ff-state{font-size:18px;font-weight:800;color:var(--navy)}.ff-state small{display:block;font-size:13px;font-weight:400;color:var(--text-muted);margin-top:3px}'
      + '.ff-top .acts{display:flex;gap:8px;flex-wrap:wrap}.ff-top button{padding:8px 14px;font-size:13.5px}'
      + '.ff-views{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px;border-bottom:1px solid var(--border)}'
      + '.ff-views button{background:none;border:0;border-bottom:3px solid transparent;border-radius:0;padding:8px 12px;font-size:14.5px;font-weight:600;color:var(--text-muted);margin-bottom:-1px}'
      + '.ff-views button[aria-selected="true"]{color:var(--navy);border-bottom-color:var(--teal,#1F7A8C)}'
      + '.ff-n{display:inline-block;min-width:20px;padding:0 6px;margin-left:6px;border-radius:999px;background:#EEF2F6;color:#475569;font-size:12px;font-weight:700;text-align:center;line-height:20px}'
      + '.ff-n.hot{background:#B23B2E;color:#fff}'
      + '.ff-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:6px 16px 4px;margin-bottom:14px}'
      + '.ff-card>h3{margin:10px 0 2px;font-size:16px;color:var(--navy);display:flex;align-items:center;gap:6px}.ff-card>p{margin:0 0 6px;font-size:13px;color:var(--text-muted)}'
      + '.ff-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:11px 0;border-top:1px solid #EEF1F5}.ff-row .who{flex:1 1 260px;min-width:0}'
      + '.ff-name{font-weight:700;color:var(--navy);font-size:15px}.ff-line{font-size:13px;color:var(--text);margin-top:2px}.ff-why{font-size:13px;color:#8A5A12;margin-top:2px}.ff-bad-why{color:#B23B2E}'
      + '.ff-row .acts{display:flex;gap:6px;flex-wrap:wrap}.ff-row button{padding:6px 12px;font-size:12.5px}'
      + '.ff-chip{font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap;margin-left:6px;vertical-align:2px}'
      + '.ff-ready{background:#E7F6EC;color:#1F7A4D}.ff-waiting{background:#FDF3E3;color:#A8660E}.ff-held{background:#F1F5F9;color:#64748B}.ff-bad{background:#FDE8E8;color:#B23B2E}'
      + '.ff-checks{display:flex;gap:14px;flex-wrap:wrap;margin-top:6px;font-size:13px}.ff-ck{display:flex !important;gap:6px;align-items:center;width:auto;font-weight:600;color:var(--text)}'
      + '.ff-ck input{width:auto !important;margin:0;flex:0 0 auto}.ff-ok{color:#1F7A4D}.ff-no{color:#94A3B8}'
      + '.ff-filters{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0 4px}.ff-filters button{padding:5px 12px;font-size:13px;border-radius:999px}'
      + '.ff-filters button[aria-pressed="true"]{background:var(--teal,#1F7A8C);color:#fff;border-color:transparent}.ff-filters input{max-width:220px;margin-left:auto}'
      + '.ff-empty{padding:12px 0;font-size:13.5px;color:var(--text-muted);border-top:1px solid #EEF1F5}'
      + '.ff-banner{background:#FDF3E3;color:#7A4A0B;border-radius:10px;padding:10px 12px;margin:0 0 12px;font-size:13px}.ff-meta{font-size:12.5px;color:var(--text-muted);margin:-6px 0 12px}'
      + '@media (max-width:760px){.ff-filters input{margin-left:0;max-width:none;width:100%}.ff-top button{flex:1 1 auto}}';
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
  const chip = (cls, words) => '<span class="ff-chip ff-' + esc(cls) + '">' + esc(words) + '</span>';
  const kindWords = r => r.kind === 'caregiver' ? 'Caregiver' : r.kind === 'client' ? 'Client' : 'Family of ' + (r.client || 'a client');
  const btn = (label, js, primary) => '<button class="' + (primary ? '' : 'secondary') + '" onclick="' + js + '">' + esc(label) + '</button>';
  const row = (o) => '<div class="ff-row"' + (o.attr || '') + '><div class="who"><span class="ff-name">' + esc(o.name) + '</span>' + (o.chip || '')
    + (o.line ? '<div class="ff-line">' + o.line + '</div>' : '') + (o.why ? '<div class="ff-why' + (o.bad ? ' ff-bad-why' : '') + '">' + o.why + '</div>' : '') + (o.extra || '') + '</div>'
    + (o.acts ? '<div class="acts">' + o.acts + '</div>' : '') + '</div>';
  const card = (title, sub, rows, empty, n, id) => '<div class="ff-card"' + (id ? ' id="' + id + '"' : '') + '><h3>' + esc(title) + (n != null ? '<span class="ff-n">' + n + '</span>' : '') + '</h3>'
    + (sub ? '<p>' + sub + '</p>' : '') + (rows.length ? rows.join('') : '<div class="ff-empty">' + esc(empty) + '</div>') + '</div>';

  /* one $100 line: who gets what, then the two checks (20 hours, payment received) as a checklist */
  function rewardRow(x){
    const fam = x.referrer_kind !== 'caregiver', lid = esc(x.lead_id), q = s => '\'' + s + '\'';
    const to = fam ? '$' + esc(x.amount || 100) + ' credit on ' + esc(x.referrer_client ? x.referrer_client + '’s' : 'their') + ' invoice' : '$' + esc(x.amount || 100) + ' bonus on ' + esc(x.referrer) + '’s paycheck';
    const line = 'Referred by ' + esc(x.referrer) + (fam ? (x.referrer_client ? ' (family of ' + esc(x.referrer_client) + ')' : ' (family)') : ' (caregiver)') + ' · ' + to + ' · first visit ' + esc(day(x.first_visit));
    const hrs = x.hours == null ? null : x.hours, h20 = hrs != null && hrs >= 20;
    const live = ['on_the_way', 'ready', 'under_review'].includes(x.status);
    const checks = ['on_the_way', 'ready', 'under_review', 'approved'].includes(x.status) ? '<div class="ff-checks"><span class="' + (h20 ? 'ff-ok' : 'ff-no') + '">' + (h20 ? '✓' : '○') + ' 20 hours' + (hrs == null ? ' (not read yet)' : ' (' + hrs + ' so far)') + '</span>'
      + '<label class="ff-ck"><input type="checkbox"' + (x.payment_checked_at ? ' checked' : '') + (live ? '' : ' disabled') + ' onchange="FFT.reward(' + q(lid) + ', \'payment\', this.checked)"> Payment received' + (x.payment_checked_by ? ' (' + esc(x.payment_checked_by) + ')' : '') + '</label></div>' : '';
    const why = x.status === 'under_review' ? esc((x.reasons || []).join('; ')) : x.status === 'on_the_way' && (x.reasons || []).length ? 'To look at once earned: ' + esc(x.reasons.join('; '))
      : x.status === 'not_earned' ? 'Not earned: ' + esc(x.decision_why || '') : x.status === 'applied' ? 'Credit applied ' + esc(day(x.done_on)) : x.status === 'paid' ? 'Paid on the ' + esc(day(x.done_on)) + ' payroll' : (x.decision_why ? 'Approved: ' + esc(x.decision_why) : '');
    const acts = (x.status === 'ready' ? btn('Approve', 'FFT.reward(' + q(lid) + ', \'approve\')', true) : '')
      + (x.status === 'under_review' ? btn('Approve anyway', 'FFT.reward(' + q(lid) + ', \'approve\', \'why\')') : '')
      + (live ? btn('Not earned', 'FFT.reward(' + q(lid) + ', \'not_earned\')') : '')
      + (x.status === 'approved' ? btn(fam ? 'Mark credit applied' : 'Mark paid', 'FFT.reward(' + q(lid) + ', \'done\', ' + (fam ? 'true' : 'false') + ')', true) : '')
      + (['approved', 'not_earned'].includes(x.status) ? btn('Reopen', 'FFT.reward(' + q(lid) + ', \'reopen\')') : '');
    /* no status chip: every $100 row sits in a card named for its stage (the chip only repeated the heading) */
    const done = ['applied', 'paid', 'not_earned'].includes(x.status);   /* a settled line's last word is plain text, not a warning colour */
    return row({ attr:' data-rw="' + lid + '" data-st="' + esc(x.status) + '"', name:x.client_name, line, why:done ? '' : why, bad:x.status === 'under_review', extra:(done && why ? '<div class="ff-line" style="color:var(--text-muted)">' + why + '</div>' : '') + checks, acts });
  }
  function inviteRow(x){
    const ch = (x.channels || []).map(c => (c.channel === 'text' ? 'Text' : 'Email') + (c.ok ? ' sent' : ' didn’t go' + (c.why ? ' (' + c.why + ')' : ''))).join(' · ');
    const st = { sent:['ready', 'Sent'], partial:['waiting', 'Partly sent'], failed:['bad', 'Didn’t go'] }[x.status] || ['held', x.status];
    return row({ attr:' data-inv="' + esc(x.person_key) + '"', name:x.name, chip:chip(st[0], st[1]),
      line:esc(x.kind === 'caregiver' ? 'Caregiver' : 'Family' + (x.client_name ? ' of ' + x.client_name : '')) + ' · ' + esc(when(x.last_sent_at)) + (x.sends > 1 ? ' · sent ' + esc(x.sends) + ' times' : '') + ' · their link: ' + esc(x.code || ''),
      why:x.status === 'sent' ? '' : esc(ch), bad:x.status === 'failed', acts:btn('Resend', 'FFT.resend(\'' + esc(x.person_key) + '\')') });
  }

  function draw(){
    const m = el(); if(!m) return; css();
    if(!owner()){ m.innerHTML = '<div class="ff-card" style="padding:16px 18px;"><b style="color:var(--navy)">Owners run this program</b><p class="field-note" style="margin:6px 0 0;">Nothing here needs anything from you. If someone asks about referring a friend, they can call the office at (417) 234-8494.</p></div>'; return; }
    const d = ST.data;
    if(!d){ m.innerHTML = '<div class="field-note">' + (ST.busy ? 'Loading…' : '') + '</div>'; return; }
    if(d.error){ m.innerHTML = '<div class="ff-banner">' + esc(d.error) + ' <button class="secondary" onclick="FFT.load()">Try again</button></div>'; return; }
    const run = d.run || {}, people = (Array.isArray(run.people) ? run.people : []).filter(p => p.kind !== 'client'), inv = Array.isArray(d.invites) ? d.invites : [], sw = d.switches || {};
    const rw = Array.isArray(d.rewards) ? d.rewards : [], refs = referrals();
    const sent = inv.filter(x => x.status !== 'skipped');
    /* what needs her */
    const toApprove = rw.filter(x => x.status === 'ready'), toReview = rw.filter(x => x.status === 'under_review');
    const toTick = rw.filter(x => x.status === 'on_the_way' && x.hours != null && x.hours >= 20 && !x.payment_checked_at);
    const toFinish = rw.filter(x => x.status === 'approved'), failed = sent.filter(x => x.status !== 'sent');
    const pn = new Map();
    for(const p of (Array.isArray(run.people) ? run.people : [])) if((p.why || []).some(w => /^Payer needed/.test(w))){ const k = p.client_ax || p.client || p.name; if(!pn.has(k)) pn.set(k, { client:p.client || p.name, why:(p.why || []).find(w => /^Payer needed/.test(w)) }); }
    const needN = toApprove.length + toReview.length + toTick.length + toFinish.length + failed.length + pn.size;
    if(!ST.view) ST.view = needN ? 'needs' : 'invites';
    const count = st => people.filter(p => p.status === st).length;

    /* the status card */
    const state = sw.paused ? 'paused' : sw.live ? 'on' : 'off';
    const last = Array.isArray(sw.log) && sw.log.length ? sw.log[sw.log.length - 1] : null;
    let h = '<div class="ff-top ' + state + '" id="ffTop"><div class="ff-state">' + ({ on:'Invitations are ON', off:'Invitations are OFF', paused:'The program is paused' }[state])
      + '<small>' + ({ on:'Each person who is ready gets one invitation, on a weekday morning (' + esc(d.cap || 60) + ' a morning at most).', off:'Nobody is invited. The list below still updates every morning so you can check it.', paused:'Nothing is sent while the program is paused. The $100 tracking keeps going.' }[state])
      + (last ? ' Last change by ' + esc(last.by) + ', ' + esc(when(last.at)) + '.' : '') + '</small></div><div class="acts">'
      + (sw.paused ? btn('Unpause', 'FFT.flip(\'ff_program_paused\', false)', true) : btn(sw.live ? 'Turn invitations off' : 'Turn invitations on', 'FFT.flip(\'ff_invites_live\', ' + (!sw.live) + ')', !sw.live) + btn('Pause program', 'FFT.flip(\'ff_program_paused\', true)'))
      + '</div></div>';
    h += '<div class="ff-meta">' + (run.run_day ? 'Last checked ' + esc(when(run.ran_at)) + (run.sent ? ' · ' + esc(run.sent) + ' invited that morning' : '') : 'The daily check hasn’t run yet.') + '</div>';
    if(run.problems && run.problems.length) h += '<div class="ff-banner"><b>Couldn’t read everything that morning:</b> ' + run.problems.map(esc).join('; ') + '. Anyone it couldn’t check is held, never invited.</div>';

    /* the four views */
    const V = [['needs', 'Needs you', needN, true], ['invites', 'Invitations', count('ready'), false], ['rewards', '$100 rewards', rw.filter(x => ['on_the_way', 'ready', 'under_review', 'approved'].includes(x.status)).length, false], ['referrals', 'Referrals', refs.length, false]];
    h += '<div class="ff-views" role="tablist">' + V.map(([k, w, n, hot]) => '<button role="tab" data-v="' + k + '" aria-selected="' + (ST.view === k) + '" onclick="FFT.view(\'' + k + '\')">' + esc(w) + '<span class="ff-n' + (hot && n ? ' hot' : '') + '">' + n + '</span></button>').join('') + '</div>';

    if(ST.view === 'needs'){
      if(!needN) h += '<div class="ff-card"><div class="ff-empty" style="border:0">Nothing needs you right now.</div></div>';
      if(toApprove.length) h += card('Ready to approve', '20 hours done and payment received. Approve, and it moves on to be credited or paid.', toApprove.map(rewardRow), '', toApprove.length);
      if(toReview.length) h += card('Under review', 'Earned, but something needs your look first. The reason is under each name.', toReview.map(rewardRow), '', toReview.length);
      if(toTick.length) h += card('Tick when payment is received', '20 hours are done. Once their payment for those hours comes in, tick it.', toTick.map(rewardRow), '', toTick.length);
      if(toFinish.length) h += card('Apply the credit or pay the bonus', 'Approved. Put the credit on the invoice in AxisCare, or the bonus on the Viventium payroll, then mark it here.', toFinish.map(rewardRow), '', toFinish.length);
      if(failed.length) h += card('Invitations that didn’t go through', 'A card is on your Needs Attention list too.', failed.map(inviteRow), '', failed.length);
      if(pn.size) h += card('Payer needed', 'Held only because the Hub doesn’t know how they pay. Set it on their inquiry; the next morning’s check picks it up.',
        [...pn.values()].map(x => row({ name:x.client, line:esc(x.why.replace(/^Payer needed: /, '').replace(/^./, c => c.toUpperCase())) })), '', pn.size, 'ffPayer');
    }
    if(ST.view === 'invites'){
      const F = [['ready', 'Ready to invite', count('ready')], ['waiting', 'Waiting', count('waiting')], ['held', 'Held', count('held')], ['invited', 'Invited', sent.length]];
      const q = ST.q.trim().toLowerCase(), hit = s => !q || String(s || '').toLowerCase().includes(q);
      let rows;
      if(ST.show === 'invited') rows = sent.filter(x => hit(x.name + ' ' + (x.client_name || ''))).map(inviteRow);
      else rows = people.filter(p => p.status === ST.show && hit(p.name + ' ' + (p.client || ''))).sort((a, b) => String(a.name).localeCompare(String(b.name))).map(p => {
        const skipped = (p.why || [])[0] && /^Skipped/.test(p.why[0]);
        const how = p.status === 'ready' ? 'By ' + (p.channels || []).map(c => c === 'text' ? 'text' : 'email').join(' and ') : '';
        const line = esc(kindWords(p)) + (p.payer ? ' · ' + esc(p.payer) : '') + (how ? ' · ' + esc(how) : '') + (p.invited ? ' · invited ' + esc(day(p.invited.at)) : '');
        const acts = skipped ? btn('Undo skip', 'FFT.unskip(\'' + esc(p.key) + '\')') : (!p.invited ? btn('Skip', 'FFT.skip(\'' + esc(p.key) + '\', \'' + esc(String(p.name).replace(/'/g, '')) + '\')') : '');
        return row({ attr:' data-key="' + esc(p.key) + '"', name:p.name, line,   /* the filter above says the status */ why:esc((p.why || []).filter(w => !/^Email only/.test(w) || p.status !== 'ready').join(' · ')) + (p.note ? ' · ' + esc(p.note) : ''), acts });
      });
      h += '<div class="ff-card" id="ffList"><h3>Who gets an invitation</h3><p>Checked every morning. Ready means they get one the next weekday morning once invitations are on.</p>'
        + '<div class="ff-filters">' + F.map(([k, w, n]) => '<button class="secondary" aria-pressed="' + (ST.show === k) + '" onclick="FFT.show(\'' + k + '\')">' + esc(w) + ' (' + n + ')</button>').join('')
        + '<input id="ffQ" type="search" placeholder="Search a name" value="' + esc(ST.q) + '" oninput="FFT.search(this.value)"></div>'
        + (rows.length ? rows.join('') : '<div class="ff-empty">Nobody here.</div>') + '</div>';
    }
    if(ST.view === 'rewards'){
      const g = st => rw.filter(x => st.includes(x.status));
      h += '<div id="ffRewards">'
        + card('Ready to approve', '', g(['ready']).map(rewardRow), 'None right now.', g(['ready']).length)
        + card('Under review', '', g(['under_review']).map(rewardRow), 'None right now.', g(['under_review']).length)
        + card('Approved: apply the credit or pay the bonus', '', g(['approved']).map(rewardRow), 'None right now.', g(['approved']).length)
        + card('On the way', 'Waiting for 20 completed hours (read from AxisCare every morning) and your payment tick.', g(['on_the_way']).map(rewardRow), 'None yet. One starts when someone who came through a Friends & Family link has their first visit.', g(['on_the_way']).length)
        + card('Done', '', g(['applied', 'paid', 'not_earned']).map(rewardRow), 'None yet.', g(['applied', 'paid', 'not_earned']).length)
        + '</div>';
    }
    if(ST.view === 'referrals'){
      h += card('Referrals received', 'New inquiries that came in through someone’s personal link.', refs.map(({ l, o }) => row({ name:nameOf(l), chip:chip(l.first_shift_at ? 'ready' : 'held', l.first_shift_at ? 'Started care' : (l.status || 'New')),
        line:'Referred by ' + esc(o.name) + (o.ff_kind === 'caregiver' ? ' (caregiver)' : o.ff_client ? ' (family of ' + esc(o.ff_client) + ')' : '') + ' · came in ' + esc(day(l.created_at)) + (l.first_shift_at ? ' · first visit ' + esc(day(l.first_shift_at)) : ''),
        acts:btn('Open', 'try{openLeadProfile(\'' + esc(l.id) + '\')}catch(e){}') })), 'None yet.', refs.length, 'ffRefs');
    }
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
  const todayC = () => new Date().toLocaleString('sv-SE', { timeZone:'America/Chicago' }).slice(0, 10);
  async function reward(lid, op, arg){
    const body = { action:'reward', lead_id:lid, op };
    if(op === 'payment') body.on = arg === true;
    if(op === 'not_earned' || op === 'reopen' || (op === 'approve' && arg === 'why')){
      const w = window.prompt(op === 'not_earned' ? 'Why is it not earned?' : op === 'reopen' ? 'Why reopen it?' : 'Why approve it despite the review?', '');
      if(w == null) { draw(); return; } if(!w.trim()){ say('Say why, so the record shows it.'); draw(); return; } body.why = w.trim();
    }
    if(op === 'approve' && arg !== 'why'){ let yes = false; const q = 'Approve this $100?'; try{ yes = await ccConfirm(q); }catch(e){ yes = window.confirm(q); } if(!yes) return; }
    if(op === 'done'){
      const dt = window.prompt(arg ? 'The date the $100 credit went on the invoice in AxisCare (YYYY-MM-DD):' : 'The Viventium payroll date the $100 bonus is on (YYYY-MM-DD):', todayC());
      if(dt == null) return; if(!/^\d{4}-\d{2}-\d{2}$/.test(dt.trim())){ say('Use the form 2026-11-21.'); return; } body.date = dt.trim();
    }
    const r = await call(body);
    if(r.error) say(r.error); else say({ payment: body.on ? 'Payment received, noted.' : 'Payment tick removed.', approve:'Approved.', not_earned:'Marked not earned.', done: arg ? 'Credit applied, noted.' : 'Paid, noted.', reopen:'Reopened.' }[op] || 'Saved.');
    load();
  }
  function mount(){ draw(); if(owner()) load(); }   /* a Care Coordinator's page never asks the server */
  window.FFT = { mount, load, draw, flip, skip, unskip, resend, referrals, reward,
    view(k){ ST.view = k; draw(); }, show(k){ ST.view = 'invites'; ST.show = k; draw(); }, search(v){ ST.q = v; ST.focus = true; draw(); }, state:ST };
})();
