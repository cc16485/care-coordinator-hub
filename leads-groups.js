/* leads-groups.js · THE SIMPLER LEADS PAGE (Samantha 2026-11-23: "make it less complicated on lead profiles and the layout and
   make it more clear who needs follow up"; then "how do the best CRMs in the world do it, but make it specially for home care",
   "link the chart in onboarding", "Cold, Warm, Hot leads", "with ai helping place them and we can drag and drop them";
   approved mockup https://claude.ai/artifact/1nPX3KE4umygkdu3VEtoHW v3, "Yes, use your picks").
   - A BOARD of three columns, Hot, Warm and Cold. The Hub places each family by how soon they need care and says why on the
     card; a person drags a card (or clicks Hot / Warm / Cold on it) to move it, and that choice wins (lead.lead_temp), except a
     home visit booked or done makes it Hot and 3 unanswered tries after the move make it Cold. Each card: five step dots
     (First call, Talked, Home visit, Care plan & agreement, Yes), what happened last, what's next, one button.
   - The same families as a CHART like Onboarding: one row per family, one column per step, a ✓ and date when done, the
     button in the step that's due, red words when it's late. Board or Chart is remembered per browser (lgView).
   - Leads that don't look like families (a business email nobody has talked to, or one phone on several leads) wait in a
     small "Not families?" box for a person: Spam, Partner, or It's a family. Nothing closes by itself; nothing is sent.
   - Shown while ops_settings.leads_groups_live is on, or as an owner's own preview. The same words feed the lead page's
     Next box (lead-workspace.js), so the list and the page never disagree. LeadRules.boardRow stays the brain. */
(function(root){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const R = () => root.LeadRules;
  const PREVIEW_KEY = 'lgPreview';
  const FREE = /@(gmail|googlemail|yahoo|ymail|rocketmail|hotmail|outlook|live|msn|icloud|me|mac|aol|att|sbcglobal|bellsouth|comcast|charter|cox|verizon|frontier|windstream|centurytel|centurylink|mchsi|suddenlink|proton|protonmail|mail|gmx|zoho)\./i;
  /* reasons where the board already knows the exact next step */
  const TRUST = ['promise_late', 'update_owed', 'medicaid_closed', 'authorized', 'draft_ready', 'urgent_start', 'medicaid_45', 'dsds_21', 'check_back_due'];

  const evts = l => Array.isArray(l && l.contact_events) ? l.contact_events.filter(Boolean) : [];
  const first = n => String(n || '').trim().split(/\s+/)[0] || '';
  const digits = p => { const d = String(p || '').replace(/\D/g, ''); return d.length === 11 && d[0] === '1' ? d.slice(1) : d; };
  const dayMs = 864e5;
  function lastOf(list, pred){ for(let i = list.length - 1; i >= 0; i--) if(pred(list[i])) return list[i]; return null; }
  function tries(l){ return Math.max(evts(l).filter(e => e.actor === 'human' && e.direction === 'out' && e.channel === 'call').length, Number(l && l.contact_attempts) || 0); }
  function talked(l){ return !!(l && (l.first_human_contact_at || evts(l).some(e => e.actor === 'human' && e.channel === 'call' && e.outcome === 'connected'))); }
  /* the family reached out after our last move (a missed call back, a text); the website form itself is not a reply */
  function familyReply(l){
    const E = evts(l), human = lastOf(E, e => e.actor === 'human' && e.direction === 'out');
    const fam = lastOf(E, e => e.actor === 'family' && e.direction === 'in' && e.outcome !== 'inquiry' && e.channel !== 'web');
    if(!fam) return null;
    if(human && String(human.at) >= String(fam.at)) return null;
    return fam;
  }
  function when(iso, now){ try{ return R().whenWords(iso, now); }catch(e){ return String(iso || '').slice(0, 10); } }
  function waitWords(days){ return days >= 14 ? Math.floor(days / 7) + ' weeks' : days === 1 ? '1 day' : days + ' days'; }
  function daysSince(iso, now){ const t = Date.parse(iso); return isNaN(t) ? 0 : Math.max(0, Math.floor((Date.parse(now) - t) / dayMs)); }
  function ordinal(n){ return n + (n === 2 ? 'nd' : n === 3 ? 'rd' : n === 1 ? 'st' : 'th'); }

  /* does it look like something other than a family? Only before anyone has talked with them, and never once a person said it is one */
  function notFamily(l, open){
    if(!l || l.family_confirmed_at || talked(l)) return '';
    const mail = String(l.email || '').trim();
    const ph = digits(l.phone);
    const same = ph.length === 10 ? (open || []).filter(x => x && x !== l && x.id !== l.id && digits(x.phone) === ph).length : 0;
    if(same) return 'same phone as ' + same + ' other lead' + (same === 1 ? '' : 's');
    if(/@/.test(mail) && !FREE.test(mail)) return 'business email (' + mail.split('@')[1].toLowerCase() + ')';
    return '';
  }

  /* what happened last, in one short sentence, plus what they asked for */
  function lastWords(l, now){
    const E = evts(l), n = tries(l), reply = familyReply(l), human = lastOf(E, e => e.actor === 'human' && e.direction === 'out');
    let s;
    if(reply) s = (reply.channel === 'call' ? 'They called ' + when(reply.at, now) + (reply.outcome === 'missed' ? ', we missed it' : '') : 'They ' + (reply.channel === 'email' ? 'emailed' : 'texted') + ' ' + when(reply.at, now)) + '.';
    else if(human){
      const o = String(human.outcome || ''), mins = human.duration_s ? Math.round(human.duration_s / 60) : 0;
      s = human.channel !== 'call' ? 'We ' + (human.channel === 'email' ? 'emailed' : 'texted') + ' ' + when(human.at, now) + '.'
        : o === 'connected' ? 'Talked ' + when(human.at, now) + (mins >= 1 ? ' (' + mins + ' min)' : '') + '.'
        : (o === 'voicemail' ? 'Voicemail ' : 'No answer ') + when(human.at, now) + (n > 1 ? ' (' + n + ' tries)' : '') + '.';
    }
    else s = talked(l) ? 'Talked with them.' : 'Never called.';
    let why = ''; try{ why = R().whyCalled(l) || ''; }catch(e){}
    why = String(why).replace(/\s+/g, ' ').trim();
    if(why.length > 90) why = why.slice(0, 88).replace(/\s+\S*$/, '') + '…';
    return { happened:s, why };
  }

  /* x = { l, r (LeadRules.boardRow), ctx }. Returns the group and the words for one family. */
  function place(x, now, open){
    const l = x.l, r = x.r || {}, fn = first(l.first_name) || 'them';
    const lw = lastWords(l, now), odd = notFamily(l, open);
    const CALL = { kind:'call', label:'Call' };
    let group = 'call', next = '', button = CALL, waited = 0, date = '';
    if(r.reason === 'asmt_plan'){ group = 'plan'; next = 'Write the care plan'; button = { kind:'open_asmt', label:'Write plan' }; waited = daysSince(r.sort, now); }
    else if((r.group === 'waiting' || r.group === 'later') && r.reason !== 'new_before_open'){
      group = 'wait'; date = /^\d{4}-\d{2}-\d{2}/.test(String(r.sort)) && String(r.sort) !== '9999' ? String(r.sort).slice(0, 10) : '';
      next = r.next && r.next.text || '';
      button = r.reason === 'waiting' || r.reason === 'waiting_state_nodate' ? { kind:'waiting', label:'Change date' } : r.reason === 'asmt_booked' ? { kind:'open_asmt', label:'Open visit' } : { kind:'followup', label:'Change date' };
    }
    else {
      const n = tries(l), reply = familyReply(l), human = lastOf(evts(l), e => e.actor === 'human' && e.direction === 'out');
      if(r.reason === 'new_overdue' || r.reason === 'new_running' || r.reason === 'new_before_open'){ next = 'First call to ' + fn; waited = daysSince(l.created_at, now); }
      else if(TRUST.indexOf(r.reason) > -1){ next = r.next && r.next.text || 'Call ' + fn; button = r.primary || CALL; waited = daysSince(r.sort, now); }
      else if(reply){ next = reply.channel === 'call' ? 'Call ' + fn + ' back' : 'Answer ' + fn; button = reply.channel === 'call' ? CALL : { kind:'text', label:'Text back' }; waited = daysSince(reply.at, now); }
      else if(!talked(l)){
        waited = daysSince(human ? human.at : l.created_at, now);
        next = !n ? 'Call ' + fn : n >= 3 ? 'Last try. No answer? Close it as can\'t reach' : 'Try ' + fn + ' again (' + ordinal(n + 1) + ' try)';
      }
      else { next = 'Call ' + fn + ' to book the home visit'; button = { kind:'schedule', label:'Book visit' }; waited = daysSince(human ? human.at : l.first_human_contact_at, now); }
    }
    return { group:odd ? 'odd' : group, odd, next, button, waited, date, happened:lw.happened, why:lw.why };
  }

  function liveOn(settings){ return !!(settings && settings.leads_groups_live === true); }
  function previewOn(){ try{ return !!root.localStorage && root.localStorage.getItem(PREVIEW_KEY) === '1'; }catch(e){ return false; } }
  function setPreview(on){ try{ if(on) root.localStorage.setItem(PREVIEW_KEY, '1'); else root.localStorage.removeItem(PREVIEW_KEY); }catch(e){} }
  function showing(settings, isOwner){ return liveOn(settings) || (!!isOwner && previewOn()); }

  /* sort and split; work = the board's rows ({ l, r, ctx }) */
  function groups(work, now){
    const open = work.map(x => x.l);
    const rows = work.map(x => Object.assign({}, x, { p:place(x, now, open) }));
    const by = { call:[], wait:[], plan:[], odd:[] };
    rows.forEach(x => by[x.p.group].push(x));
    const firstCall = x => ['new_overdue', 'new_running', 'promise_late'].indexOf(x.r && x.r.reason) > -1 ? 0 : 1;
    by.call.sort((a, b) => firstCall(a) - firstCall(b) || b.p.waited - a.p.waited);
    by.wait.sort((a, b) => String(a.p.date || '9999').localeCompare(String(b.p.date || '9999')));
    by.plan.sort((a, b) => b.p.waited - a.p.waited);
    return by;
  }

  function rowHtml(x, h, tone){
    const l = x.l, p = x.p, name = (x.r && x.r.name && x.r.name !== '(no name)' ? x.r.name : '') || ((l.first_name || '') + ' ' + (l.last_name || '')).trim() || '(no name)';
    const src = [l.source, l.created_at ? 'came in ' + R().dayWords(R().chicago(l.created_at).ymd, h.today) : ''].filter(Boolean).join(' · ');
    const chip = p.waited >= 1 && tone !== 'a' ? '<span class="lg-chip' + (tone === 'r' && p.waited >= 2 ? ' lg-chip-red' : '') + '">' + esc(waitWords(p.waited)) + '</span>' : '';
    const dateWords = p.date ? R().dayWords(p.date, h.today).replace(/^\w/, c => c.toUpperCase()) : '';
    const next = tone === 'a' ? (dateWords ? dateWords + ': ' : '') + p.next : p.next;
    return '<div class="lg-row lg-' + tone + '" data-open-lead="' + esc(l.id) + '" data-open-tab="summary" tabindex="0">'
      + '<div class="lg-who"><div class="lg-name">' + esc(name) + '</div><div class="lg-sub">' + esc(src) + (l.assigned_coordinator ? ' · ' + esc(first(l.assigned_coordinator)) : '') + '</div></div>'
      + '<div class="lg-what"><div class="lg-last">' + esc(p.happened) + (p.why ? ' <span class="lg-why">' + esc(p.why) + '</span>' : '') + '</div>'
      + '<div class="lg-next">' + esc(next) + chip + '</div></div>'
      + '<div class="lg-act" data-no-open="1">' + h.btn(l, p.button, tone !== 'a') + '</div></div>';
  }
  function oddHtml(list){
    if(!list.length) return '';
    return '<div class="lg-odd"><div class="lg-odd-head"><b>Not families? ' + list.length + ' to sort</b><span class="lg-sub">They stay off the list until someone sorts them. Nothing is sent to anyone.</span></div>'
      + list.map(x => { const l = x.l, nm = ((l.first_name || '') + ' ' + (l.last_name || '')).trim() || '(no name)';
        return '<div class="lg-odd-row"><span><a href="javascript:void(0)" data-open-lead="' + esc(l.id) + '" data-open-tab="summary">' + esc(nm) + '</a> <span class="lg-sub">· ' + esc(x.p.odd) + (x.p.why ? ' · ' + esc(x.p.why) : '') + '</span></span>'
          + '<span class="lg-odd-btns" data-no-open="1"><button class="lb-btn" onclick="lpMarkSpam(\'' + esc(l.id) + '\', this)">Spam</button><button class="lb-btn" onclick="lgPartner(\'' + esc(l.id) + '\', this)">Partner</button><button class="lb-btn" onclick="lgFamily(\'' + esc(l.id) + '\', this)">It\'s a family</button></span></div>'; }).join('')
      + '</div>';
  }
  function summary(by){
    const pill = (n, words, cls) => '<span class="lg-pill ' + cls + '"><b>' + n + '</b> ' + words + '</span>';
    return '<div class="lg-summary">' + pill(by.call.length, 'call today', 'lg-p-red') + pill(by.wait.length, 'waiting, with a date', 'lg-p-amber') + pill(by.plan.length, 'ready for the care plan', 'lg-p-green') + '</div>';
  }
  /* ── HOT, WARM, COLD (her words 2026-11-23: "Cold, Warm, Hot leads ... with ai helping place them and we can drag and drop them").
     The Hub places each family by how soon they need care; a person's move wins (lead.lead_temp), except that a home visit
     booked or done always makes a family Hot, and 3 unanswered tries after the move make it Cold. The card says which. ── */
  const TEMPS = ['hot', 'warm', 'cold'], TEMP_WORD = { hot:'Hot', warm:'Warm', cold:'Cold' };
  function hubTemp(x, now){
    const l = x.l, r = x.r || {}, today = String(now).slice(0, 10), n = tries(l), t = talked(l);
    if(r.reason === 'asmt_plan') return { v:'hot', why:'home visit done' };
    if(r.reason === 'asmt_booked') return { v:'hot', why:'home visit booked' };
    let fl = []; try{ fl = R().flags(l, x.ctx || {}) || []; }catch(e){}
    if(fl.some(f => f && f.key === 'urgent_discharge')) return { v:'hot', why:'coming home from the hospital or rehab' };
    let rank = 4; try{ rank = R().startRank(l, today); }catch(e){}
    if(!t && n >= 3) return { v:'cold', why:'not reached after ' + n + ' tries' };
    if(rank <= 2) return { v:'hot', why:rank <= 1 ? 'needs care now' : 'needs care within 2 weeks' };
    let ds = null; try{ ds = R().desiredStart(l); }catch(e){}
    if(ds && ds.kind === 'planning') return { v:'cold', why:'planning ahead' };
    const lastAt = String((lastOf(evts(l), e => e.actor === 'human' || e.actor === 'family') || {}).at || l.created_at || '');
    if(lastAt && daysSince(lastAt, now) >= 30) return { v:'cold', why:'quiet ' + Math.floor(daysSince(lastAt, now) / 7) + ' weeks' };
    return { v:'warm', why:t ? 'talked, not urgent yet' : 'not reached yet' };
  }
  function temp(x, now){
    const l = x.l, hub = hubTemp(x, now), m = l.lead_temp;
    if(!m || TEMPS.indexOf(m.v) < 0) return Object.assign({ by:'hub' }, hub);
    if(hub.v === 'hot' && /home visit/.test(hub.why) && m.v !== 'hot') return Object.assign({ by:'hub', moved:true }, hub);
    if(hub.v === 'cold' && /not reached/.test(hub.why) && m.v !== 'cold'){
      const after = evts(l).filter(e => e.actor === 'human' && e.direction === 'out' && e.channel === 'call' && String(e.at) > String(m.at || '')).length;
      if(after >= 3) return Object.assign({ by:'hub', moved:true }, hub);
    }
    return { v:m.v, why:'moved by ' + (first(m.by_name) || String(m.by || '').split('@')[0] || 'a person'), by:'person' };
  }
  /* the five steps of a home care lead, for the dots and the chart: First call, Talked, Home visit, Care plan & agreement, Yes */
  const STEP_WORDS = ['First call', 'Talked', 'Home visit', 'Care plan & agreement', 'Yes'];
  function steps(x, now){
    const l = x.l, r = x.r || {}, today = String(now).slice(0, 10), E = evts(l);
    const day = iso => { try{ return R().dayWords(R().chicago(iso).ymd, today).replace(/^\w/, c => c.toUpperCase()); }catch(e){ return String(iso || '').slice(5, 10); } };
    const firstTry = (E.find(e => e.actor === 'human' && e.direction === 'out') || {}).at || l.first_human_attempt_at || (talked(l) ? l.first_human_contact_at : '');
    const talkAt = l.first_human_contact_at || (E.find(e => e.actor === 'human' && e.channel === 'call' && e.outcome === 'connected') || {}).at || '';
    const list = ((x.ctx && x.ctx.assessments) || []).filter(Boolean);
    const visitDone = list.find(a => /complete/i.test(String(a.status || '')) || (a.status === 'Scheduled' && a.visit_date && a.visit_date < today));
    const planOpen = r.reason === 'asmt_plan';
    const visitDay = visitDone ? (visitDone.visit_date || '') : planOpen ? String(r.sort || '').slice(0, 10) : '';
    const out = [
      { done:!!firstTry, words:firstTry ? day(firstTry) : '' },
      { done:!!talkAt, words:talkAt ? day(talkAt) : '' },
      { done:!!(visitDone || planOpen), words:visitDay ? day(visitDay + 'T17:00:00Z') : '' },
      { done:!!(l.said_yes_at || (visitDone && !planOpen && (l.care_plan_done_at || l.agreement_signed_at))), words:'' },
      { done:!!l.said_yes_at, words:l.said_yes_at ? day(l.said_yes_at) : '' },
    ];
    let cur = out.findIndex(s => !s.done); if(cur < 0) cur = out.length - 1;
    return out.map((s, i) => Object.assign(s, { label:STEP_WORDS[i], state:s.done ? 'done' : i === cur ? 'now' : 'todo' }));
  }
  /* every reach-out, ours and theirs (her ask: "i want the chart to show every reach out call or text"), oldest first */
  function touches(l){
    return evts(l).filter(e => e.at && e.channel !== 'web' && ['call', 'sms', 'email'].indexOf(e.channel) > -1).sort((a, b) => String(a.at).localeCompare(String(b.at))).map(e => {
      const inn = e.direction === 'in', auto = e.actor === 'automation', o = String(e.outcome || '');
      const icon = e.channel === 'call' ? '☎' : e.channel === 'sms' ? '💬' : '✉';
      const word = inn ? (e.channel === 'call' ? (o === 'missed' ? 'they called, missed' : 'they called') : e.channel === 'sms' ? 'they texted' : 'they emailed')
        : e.channel === 'call' ? (o === 'connected' ? 'talked' + (e.duration_s >= 60 ? ' ' + Math.round(e.duration_s / 60) + ' min' : '') : o === 'voicemail' ? 'voicemail' : o === 'no_answer' ? 'no answer' : o.replace(/_/g, ' ') || 'call')
        : (auto ? 'auto ' : '') + (e.channel === 'sms' ? 'text' : 'email');
      return { at:e.at, icon, word, tone:inn ? 'in' : o === 'connected' ? 'ok' : auto ? 'auto' : 'out' };
    });
  }
  function touchesHtml(l, today){
    const t = touches(l); if(!t.length) return '<span class="lg-sub">none yet</span>';
    const d = iso => { try{ const c = R().chicago(iso); return c.ymd.slice(5).replace('-', '/'); }catch(e){ return ''; } };
    const shown = t.slice(-8);
    return (t.length > shown.length ? '<span class="lg-sub">' + (t.length - shown.length) + ' earlier · </span>' : '') + shown.map(x => '<span class="lg-touch lg-tc-' + x.tone + '" title="' + esc(x.word) + '">' + x.icon + ' ' + esc(d(x.at)) + ' ' + esc(x.word) + '</span>').join('');
  }
  /* her ask 2026-11-23: "open their profile or their contact so we can see all the texts/calls before we decide how to reach
     out". Named by what it shows, never by the tool behind it (her rule 11-19). */
  const CONTACT = 'https://app.hirecara.com/v2/location/Recp0AhyMh8lrtKJ9kaj/contacts/detail/';
  function contactLink(l, cls){ const id = String((l && l.ghl_contact_id) || ''); return /^[A-Za-z0-9_-]{1,64}$/.test(id) ? '<a class="' + (cls || 'lg-thread') + '" href="' + CONTACT + encodeURIComponent(id) + '" target="_blank" rel="noopener" data-no-open="1" title="Every text and call with this family, in a new tab">All texts &amp; calls ↗</a>' : ''; }
  /* her asks 2026-11-23: "see how the lead came in and make sure to prompt us to click easily to put in how they heard about
     us" and "easily mark as spam" */
  function cameWords(l, today){
    const src = String(l.source || '').trim(), w = { website:'Website form', phone:'Called us', referral:'Referral', walk_in:'Walked in', 'walk-in':'Walked in', email:'Email', facebook:'Facebook', text:'Text' }[src.toLowerCase()] || src;
    let d = ''; try{ d = l.created_at ? R().dayWords(R().chicago(l.created_at).ymd, today) : ''; }catch(e){}
    return [w, d].filter(Boolean).join(' · ');
  }
  function heardHtml(l){
    const H = root.HeardAbout, k = String(l.heard_about || '');
    if(H && k && H.label(k)) return '<span class="lg-heard">Heard about us: ' + esc(H.label(k)) + '</span>';
    return H ? '<button class="lg-ask lg-ask-heard" data-no-open="1" onclick="lgHeard(\'' + esc(l.id) + '\', this)">How did they hear about us?</button>' : '';
  }
  /* her ask 2026-11-23: "need how much we quoted them, when they need to start, a lot": the facts at a glance on every card and
     chart row; a missing one is a gold button that fills it with one tap (nothing is sent) */
  const PAYS = [['private', 'Private pay'], ['ltc', 'LTC insurance'], ['va', 'VA'], ['guide', 'Medicare GUIDE'], ['cds', 'CDS'], ['other', 'Other']];
  function factsHtml(l, today){
    let start = ''; try{ start = R().desiredStartWords(l, today).replace(/^(Needs|Wants) care /, '').replace(/^\w/, c => c.toUpperCase()); }catch(e){}
    const hrs = String(l.number_of_hours || (l.schedule && l.schedule.hours_per_week) || '').trim();
    const pay = l.funding_source ? ((R().PAYER_WORDS || {})[l.funding_source] || l.funding_source) : '';
    const quote = l.price_quoted ? (String(l.quoted_price_amount || '').trim() || 'yes') : '';
    const f = (label, v, k) => v ? '<span class="lg-fact"><span>' + label + '</span> ' + esc(v) + '</span>'
      : '<button class="lg-ask" data-no-open="1" onclick="lgFact(\'' + esc(l.id) + '\', \'' + k + '\', this)">+ ' + label.toLowerCase() + '</button>';
    return '<div class="lg-facts" data-no-open="1">' + f('Start', start, 'start') + f('Quoted', quote, 'quote') + f('Hours', hrs ? hrs + ' h/wk' : '', 'hours') + f('Pays with', pay, 'pay') + '</div>';
  }
  function spamHtml(l){ return '<button class="linklike lg-spam" data-no-open="1" onclick="lpMarkSpam(\'' + esc(l.id) + '\', this)" title="Not a real family: it leaves every list and count, and is never contacted">Spam</button>'; }
  function viewNow(){ try{ return root.localStorage && root.localStorage.getItem('lgView') === 'chart' ? 'chart' : 'board'; }catch(e){ return 'board'; } }
  function model(work, now){
    const open = work.map(x => x.l);
    const rows = work.map(x => { const p = place(x, now, open); return Object.assign({}, x, { p, t:p.group === 'odd' ? null : temp(x, now), s:p.group === 'odd' ? null : steps(x, now) }); });
    const act = x => x.p.group === 'wait' ? 1 : 0;
    const firstCall = x => ['new_overdue', 'new_running', 'promise_late'].indexOf(x.r && x.r.reason) > -1 ? 0 : 1;
    const sort = (a, b) => act(a) - act(b) || firstCall(a) - firstCall(b) || (act(a) ? String(a.p.date || '9999').localeCompare(String(b.p.date || '9999')) : b.p.waited - a.p.waited);
    const by = { hot:[], warm:[], cold:[], odd:[] };
    rows.forEach(x => (x.t ? by[x.t.v] : by.odd).push(x));
    TEMPS.forEach(k => by[k].sort(sort));
    return by;
  }
  const late = x => x.p.group !== 'wait' && x.p.waited >= 2;
  function nextLine(x, h){
    const p = x.p, dateWords = p.date ? R().dayWords(p.date, h.today).replace(/^\w/, c => c.toUpperCase()) : '';
    return p.group === 'wait' ? (dateWords ? dateWords + ': ' : '') + p.next : p.next + (p.waited >= 1 ? ' · ' + waitWords(p.waited) + (late(x) ? ' late' : '') : '');
  }
  function nameOf(x){ const l = x.l; return (x.r && x.r.name && x.r.name !== '(no name)' ? x.r.name : '') || ((l.first_name || '') + ' ' + (l.last_name || '')).trim() || '(no name)'; }
  function cardHtml(x, h){
    const l = x.l, p = x.p, t = x.t;
    const dots = '<span class="lg-dots" title="' + esc(x.s.map(s => s.label + (s.state === 'done' ? ' ✓' : s.state === 'now' ? ' (due)' : '')).join(' · ')) + '">' + x.s.map(s => '<i class="' + (s.state === 'done' ? 'ok' : s.state === 'now' ? 'now' : '') + '"></i>').join('') + '</span>';
    return '<div class="lg-cardx" draggable="true" data-lg-id="' + esc(l.id) + '" data-open-lead="' + esc(l.id) + '" data-open-tab="summary" tabindex="0">'
      + '<div class="lg-ctop"><b>' + esc(nameOf(x)) + '</b><span class="lg-pick' + (t.by === 'person' ? ' lg-moved' : '') + '" title="' + (t.by === 'person' ? 'A person put this family here' : 'The Hub put this family here') + '">' + (t.by === 'hub' ? 'Hub: ' : '') + esc(t.why) + '</span></div>'
      + '<div class="lg-cmid">' + dots + '<span class="lg-sub">' + esc(p.happened) + (touches(l).length ? ' · ' + touches(l).length + (touches(l).length === 1 ? ' call or text' : ' calls and texts') : '') + '</span></div>'
      + (p.why ? '<div class="lg-sub lg-cwhy">' + esc(p.why) + '</div>' : '')
      + '<div class="lg-came"><span class="lg-sub">Came in: ' + esc(cameWords(l, h.today)) + '</span>' + heardHtml(l) + '</div>'
      + factsHtml(l, h.today)
      + '<div class="lg-cnext' + (late(x) ? ' lg-late' : p.group === 'wait' ? ' lg-waitc' : '') + '">' + esc(nextLine(x, h)) + '</div>'
      + '<div class="lg-cact" data-no-open="1">' + h.btn(l, p.button, p.group !== 'wait') + contactLink(l) + '<span class="lg-move">Move: ' + TEMPS.filter(k => k !== t.v).map(k => '<button class="lg-temp lg-t-off" title="Move to ' + TEMP_WORD[k] + '" onclick="lgTemp(\'' + esc(l.id) + '\', \'' + k + '\')">' + TEMP_WORD[k] + '</button>').join(' ') + ' · ' + spamHtml(l) + '</span></div></div>';
  }
  function boardHtml(by, h){
    const col = k => '<div class="lg-col" data-lg-col="' + k + '"><div class="lg-colhead"><span class="lg-temp lg-t-' + k + '">● ' + TEMP_WORD[k] + '</span><span class="lg-sub">' + { hot:'need care soon', warm:'interested, not urgent', cold:'planning ahead or not reached' }[k] + '</span><b class="lg-cnt">' + by[k].length + '</b></div>'
      + (by[k].length ? by[k].map(x => cardHtml(x, h)).join('') : '<div class="lg-empty">Drag a family here.</div>') + '</div>';
    return '<div class="lg-board">' + TEMPS.map(col).join('') + '</div><div class="lg-sub">The dots: First call · Talked · Home visit · Care plan &amp; agreement · Yes. Green is done, the gold ring is the step that\'s due. Drag a card, or use the Hot / Warm / Cold words on it, to move a family.</div>';
  }
  function chartHtml(by, h){
    const rows = TEMPS.reduce((a, k) => a.concat(by[k]), []);
    const cell = (x, s, i) => {
      if(s.state === 'done') return '<td class="lg-done">✓ ' + esc(s.words || '') + '</td>';
      if(s.state !== 'now') return '<td class="lg-dim">·</td>';
      const p = x.p;
      return '<td class="lg-nowc" data-no-open="1">' + (p.group === 'wait' ? '<span class="lg-waitc">' + esc(nextLine(x, h)) + '</span><div>' + h.btn(x.l, p.button, false) + '</div>'
        : h.btn(x.l, p.button, true) + '<div class="' + (late(x) ? 'lg-late' : 'lg-sub') + '">' + esc(p.next + (p.waited >= 1 ? ' · ' + waitWords(p.waited) + (late(x) ? ' late' : '') : '')) + '</div>') + '</td>';
    };
    return '<div class="lg-scroll"><table class="lg-table"><thead><tr><th class="lg-fam">Family</th><th>Hot / Warm / Cold</th><th>Every call &amp; text</th>' + STEP_WORDS.map(w => '<th>' + esc(w) + '</th>').join('') + '</tr></thead><tbody>'
      + rows.map(x => '<tr data-open-lead="' + esc(x.l.id) + '" data-open-tab="summary"><td class="lg-fam"><b>' + esc(nameOf(x)) + '</b><div class="lg-sub">' + esc(x.p.happened) + (x.p.why ? ' ' + esc(x.p.why) : '') + '</div><div class="lg-came" data-no-open="1"><span class="lg-sub">Came in: ' + esc(cameWords(x.l, h.today)) + '</span>' + heardHtml(x.l) + ' ' + spamHtml(x.l) + '</div>' + factsHtml(x.l, h.today) + '</td>'
        + '<td data-no-open="1"><span class="lg-tpick">' + TEMPS.map(k => '<button class="lg-temp ' + (k === x.t.v ? 'lg-t-' + k : 'lg-t-off') + '" title="' + esc(k === x.t.v ? x.t.why : 'Move to ' + TEMP_WORD[k]) + '"' + (k === x.t.v ? '' : ' onclick="lgTemp(\'' + esc(x.l.id) + '\', \'' + k + '\')"') + '>' + TEMP_WORD[k] + '</button>').join('') + '</span><div class="lg-sub">' + (x.t.by === 'hub' ? 'Hub: ' : '') + esc(x.t.why) + '</div></td>'
        + '<td class="lg-touches">' + touchesHtml(x.l, h.today) + (contactLink(x.l) ? '<div>' + contactLink(x.l) + '</div>' : '') + '</td>' + x.s.map((s, i) => cell(x, s, i)).join('') + '</tr>').join('')
      + '</tbody></table></div>';
  }
  function html(work, now, h){
    h = Object.assign({ today:R().ymd(new Date(now)) }, h || {});
    const by = model(work, now), v = h.view || viewNow(), all = TEMPS.reduce((a, k) => a.concat(by[k]), []);
    const pill = (n, words, cls) => '<span class="lg-pill ' + cls + '"><b>' + n + '</b> ' + words + '</span>';
    const top = '<div class="lg-topbar"><div class="lg-summary">' + pill(by.hot.length, 'Hot', 'lg-p-red') + pill(by.warm.length, 'Warm', 'lg-p-amber') + pill(by.cold.length, 'Cold', 'lg-p-blue')
      + pill(all.filter(late).length, 'late', 'lg-p-late') + '</div><span style="flex:1;"></span>'
      + '<span class="lg-views"><button class="filter-pill' + (v === 'board' ? ' active' : '') + '" onclick="lgView(\'board\')">Board</button><button class="filter-pill' + (v === 'chart' ? ' active' : '') + '" onclick="lgView(\'chart\')">Chart</button></span></div>';
    return style() + '<div class="card lg-card" id="lgCard">' + top + (v === 'chart' ? chartHtml(by, h) : boardHtml(by, h)) + oddHtml(by.odd) + '</div>';
  }
  /* drag and drop on the board (desktop); the Hot / Warm / Cold words on each card do the same on a phone */
  function wire(box){
    const card = box && box.querySelector('#lgCard'); if(!card || card.__lg) return; card.__lg = true;
    let id = '';
    card.addEventListener('dragstart', e => { const c = e.target.closest('[data-lg-id]'); if(!c) return; id = c.dataset.lgId; c.classList.add('lg-dragging'); try{ e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; }catch(_){} });
    card.addEventListener('dragend', e => { const c = e.target.closest('[data-lg-id]'); if(c) c.classList.remove('lg-dragging'); card.querySelectorAll('.lg-over').forEach(c => c.classList.remove('lg-over')); });
    card.addEventListener('dragover', e => { const col = e.target.closest('[data-lg-col]'); if(!col || !id) return; e.preventDefault(); card.querySelectorAll('.lg-over').forEach(c => c !== col && c.classList.remove('lg-over')); col.classList.add('lg-over'); });
    card.addEventListener('drop', e => { const col = e.target.closest('[data-lg-col]'); if(!col || !id) return; e.preventDefault(); const k = col.dataset.lgCol, was = id; id = ''; lgTemp(was, k); });
  }
  /* the lead page's Next box uses the same words */
  function nextFor(l, r, now, open){ return place({ l, r }, now, open || []); }

  function style(){
    return '<style id="lgStyle">'
      + '.lg-card{padding:16px 18px;display:grid;gap:18px;}'
      + '.lg-summary{display:flex;flex-wrap:wrap;gap:8px;}'
      + '.lg-pill{border-radius:999px;padding:5px 14px;font-size:13.5px;font-weight:600;}.lg-pill b{font-size:15px;}'
      + '.lg-p-red{background:#FDECEA;color:#B42318;}.lg-p-amber{background:#FFF4E0;color:#A35A00;}.lg-p-green{background:#E7F5EC;color:#1D7A3E;}'
      + '.lg-group{display:grid;gap:7px;}'
      + '.lg-group-head{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;border-bottom:2px solid var(--border);padding-bottom:5px;}'
      + '.lg-title{font-size:16px;font-weight:800;color:var(--navy);}'
      + '.lg-sub{color:var(--text-muted);font-size:12.5px;}'
      + '.lg-row{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,2.6fr) auto;gap:14px;align-items:center;padding:9px 12px;border-radius:8px;border-left:4px solid var(--border);background:var(--bg);cursor:pointer;}'
      + '.lg-row:hover,.lg-row:focus-visible{outline:2px solid #1F7A8C33;}'
      + '.lg-r{border-left-color:#DC2626;}.lg-a{border-left-color:#D97706;}.lg-g{border-left-color:#15803D;}'
      + '.lg-name{font-weight:700;font-size:14px;}.lg-what{min-width:0;}.lg-last{font-size:13.5px;}.lg-why{color:var(--text-muted);}'
      + '.lg-next{font-weight:700;font-size:13.5px;margin-top:2px;}'
      + '.lg-chip{display:inline-block;margin-left:8px;font-size:11.5px;font-weight:700;border-radius:6px;padding:1px 7px;background:#FFF4E0;color:#A35A00;}.lg-chip-red{background:#FDECEA;color:#B42318;}'
      + '.lg-empty{color:var(--text-muted);font-size:13px;padding:6px 2px;}'
      + '.lg-odd{border:1px dashed var(--border);border-radius:10px;padding:10px 14px;display:grid;gap:7px;}'
      + '.lg-odd-head{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;}'
      + '.lg-odd-row{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;justify-content:space-between;font-size:13.5px;}'
      + '.lg-odd-btns{display:flex;gap:6px;flex-wrap:wrap;}'
      + '.lg-topbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}.lg-views{display:flex;gap:6px;}'
      + '.lg-p-blue{background:#E8EFFA;color:#2F5DA8;}.lg-p-late{background:#fff;color:#B42318;border:1px solid #F3C2BD;}'
      + '.lg-temp{display:inline-block;font-weight:700;font-size:12px;border-radius:999px;padding:1px 9px;white-space:nowrap;}'
      + '.lg-t-hot{background:#FDECEA;color:#B42318;}.lg-t-warm{background:#FFF4E0;color:#A35A00;}.lg-t-cold{background:#E8EFFA;color:#2F5DA8;}'
      + '.lg-board{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}'
      + '.lg-col{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:10px;display:grid;gap:8px;align-content:start;min-height:140px;}'
      + '.lg-col.lg-over{outline:3px dashed #1F7A8C;outline-offset:-3px;}'
      + '.lg-colhead{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}.lg-cnt{margin-left:auto;color:var(--text-muted);}'
      + '.lg-cardx{background:#fff;border:1px solid var(--border);border-radius:9px;padding:9px 11px;display:grid;gap:5px;cursor:grab;min-width:0;}'
      + '.lg-cardx:hover,.lg-cardx:focus-visible{border-color:#1F7A8C;}.lg-cardx.lg-dragging{opacity:.45;}'
      + '.lg-ctop{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:baseline;}.lg-ctop b{font-size:14px;}'
      + '.lg-pick{font-size:11.5px;color:var(--text-muted);background:var(--bg);border-radius:999px;padding:0 8px;}.lg-pick.lg-moved{color:#5B4BB7;background:#EFEDFB;}'
      + '.lg-cmid{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;}.lg-cwhy{margin-top:-2px;}'
      + '.lg-dots{display:inline-flex;gap:4px;}.lg-dots i{width:10px;height:10px;border-radius:50%;border:2px solid var(--border);display:block;}'
      + '.lg-dots i.ok{background:#15803D;border-color:#15803D;}.lg-dots i.now{border-color:#D97706;box-shadow:0 0 0 2px #FFF4E0;}'
      + '.lg-cnext{font-weight:700;font-size:13px;}.lg-late{color:#B42318;font-weight:700;font-size:12.5px;}.lg-waitc{color:#A35A00;font-weight:700;font-size:12.5px;}'
      + '.lg-cact{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;}.lg-move{font-size:12px;color:var(--text-muted);}.lg-move .linklike{font-size:12px;}'
      + 'button.lg-temp{border:none;cursor:pointer;font:inherit;font-weight:700;font-size:12px;}.lg-t-off{background:transparent;color:var(--text-muted);border:1px solid var(--border)!important;}.lg-t-off:hover{color:var(--navy);border-color:var(--navy)!important;}.lg-tpick{display:inline-flex;gap:4px;flex-wrap:wrap;}'
      + '.lg-came{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;}.lg-heard{font-size:11.5px;color:#1D7A3E;}.lg-ask{font:inherit;font-size:11.5px;font-weight:700;color:#A35A00;background:#FFF4E0;border:1px dashed #D97706;border-radius:999px;padding:1px 9px;cursor:pointer;}.lg-spam{font-size:12px;color:var(--text-muted);}'
      + '.lg-facts{display:flex;flex-wrap:wrap;gap:4px 6px;}.lg-fact{font-size:12px;background:var(--bg);border-radius:6px;padding:1px 7px;}.lg-fact span{color:var(--text-muted);}'
      + '.lg-hpop{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}'
      + '.lg-thread{font-size:12px;font-weight:600;color:#1F7A8C;white-space:nowrap;}'
      + '.lg-touches{min-width:220px;max-width:340px;}.lg-touch{display:inline-block;font-size:11.5px;border-radius:6px;padding:1px 6px;margin:0 4px 3px 0;background:var(--bg);color:var(--text);white-space:nowrap;}'
      + '.lg-tc-ok{background:#E7F5EC;color:#1D7A3E;font-weight:600;}.lg-tc-in{background:#E8EFFA;color:#2F5DA8;font-weight:600;}.lg-tc-auto{color:var(--text-muted);}'
      + '.lg-scroll{overflow-x:auto;border:1px solid var(--border);border-radius:10px;}'
      + '.lg-table{border-collapse:collapse;width:100%;min-width:900px;font-size:13px;}'
      + '.lg-table th{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--text-muted);text-align:left;padding:8px 10px;background:var(--bg);border-bottom:1px solid var(--border);white-space:nowrap;}'
      + '.lg-table td{padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:top;}.lg-table tr{cursor:pointer;}'
      + '.lg-fam{position:sticky;left:0;background:#fff;min-width:200px;max-width:260px;}th.lg-fam{background:var(--bg);z-index:1;}'
      + '.lg-done{color:#15803D;font-weight:600;white-space:nowrap;}.lg-dim{color:var(--border);}.lg-nowc{background:#FAFAF7;}'
      + '@media (max-width:820px){.lg-board{grid-template-columns:1fr;}}'
      + '@media (max-width:720px){.lg-row{grid-template-columns:1fr;gap:5px;}}'
      + '</style>';
  }
  function previewBar(on){
    return on ? '<div class="lc-preview"><b>Preview of the simpler Leads list.</b> Only you see it, in this browser. Everyone else still has today\'s list.<span style="flex:1;"></span><button class="lb-btn" onclick="lgPreview(false)">Back to today\'s list</button></div>'
      : '<div class="lb-preview-ask" style="grid-column:1/-1;margin:0;font-size:13px;"><button class="linklike" onclick="lgPreview(true)">Preview the simpler Leads list (only you see it)</button></div>';
  }

  /* ── the buttons in the Not families? box ── */
  function leadById(id){ const D = typeof DATA !== 'undefined' ? DATA : root.DATA; return ((D && D.leads) || []).find(x => x && String(x.id) === String(id)); }
  function redraw(){ try{ if(typeof root.renderLeadsStarts === 'function') root.renderLeadsStarts(); }catch(e){} try{ if(typeof root.lwRender === 'function' && root.CP && root.CP.lead) root.lwRender(); }catch(e){} }
  async function lgFamily(id){
    const l = leadById(id); if(!l) return;
    l.family_confirmed_at = new Date().toISOString(); l.family_confirmed_by = ((typeof root.ccActor === 'function' && root.ccActor()) || {}).email || '';
    if(typeof root.persist === 'function') await root.persist('leads', l);
    if(typeof root.ccToast === 'function') root.ccToast('Back on the list as a family.');
    redraw();
  }
  async function lgPartner(id, anchor){
    const l = leadById(id); if(!l) return;
    const pop = typeof root.ccPopOpen === 'function' ? root.ccPopOpen(anchor || document.body,
      '<div style="font-size:14px;font-weight:800;color:var(--navy);">A partner, not a family?</div>'
      + '<div class="field-note" style="margin-top:6px;">It comes off the Leads list (archived as a referral partner). Nothing is sent. Add them in Referrals &amp; Marketing if you want to keep in touch. You can restore it any time.</div>'
      + '<div style="display:flex;gap:8px;margin-top:12px;"><button class="primary" id="lgpGo" style="padding:7px 14px;font-size:13px;">Take it off the list</button><button class="ghost" id="lgpNo" style="padding:7px 14px;font-size:13px;">Cancel</button></div>', { width:380 }) : null;
    const go = async () => {
      if(typeof root.ccPopClose === 'function') root.ccPopClose();
      const now = new Date().toISOString();
      l.archived = true; l.archived_at = now; l.archived_by = ((typeof root.ccActor === 'function' && root.ccActor()) || {}).email || ''; l.archive_reason = 'Referral partner, not a family';
      if(typeof root.persist === 'function') await root.persist('leads', l);
      if(typeof root.ccToast === 'function') root.ccToast('Taken off the Leads list as a partner.');
      redraw();
    };
    if(!pop) return go();
    pop.querySelector('#lgpNo').onclick = () => root.ccPopClose();
    pop.querySelector('#lgpGo').onclick = go;
  }
  function lgPreview(on){ setPreview(!!on); redraw(); }
  function lgHeard(id, anchor){
    const l = leadById(id), H = root.HeardAbout; if(!l || !H) return;
    if(typeof root.ccPopOpen !== 'function') return;
    const pop = root.ccPopOpen(anchor || document.body, '<div style="font-size:14px;font-weight:800;color:var(--navy);">How did they hear about us?</div><div class="lg-hpop">'
      + H.OPTIONS.map(o => '<button class="lb-btn" data-k="' + esc(o[0]) + '">' + esc(o[1]) + '</button>').join('') + '</div>', { width:380 });
    pop.querySelectorAll('[data-k]').forEach(b => b.onclick = () => saveHeard(id, b.dataset.k));
  }
  async function saveHeard(id, k){
    const l = leadById(id), H = root.HeardAbout; if(!l || !H || !H.label(k)) return;
    if(typeof root.ccPopClose === 'function') root.ccPopClose();
    const me = (typeof root.ccActor === 'function' && root.ccActor()) || {};
    l.heard_about = k; l.heard_about_by = me.email || ''; l.heard_about_at = new Date().toISOString();
    if(typeof root.persist === 'function') await root.persist('leads', l);
    if(typeof root.ccToast === 'function') root.ccToast('Saved: ' + H.label(k) + '.');
    redraw();
  }
  function lgFact(id, k, anchor){
    const l = leadById(id); if(!l || typeof root.ccPopOpen !== 'function') return;
    const T = { start:'When do they need care to start?', quote:'What did we quote them?', hours:'How many hours a week?', pay:'How will they pay?' }[k];
    const body = k === 'start' ? '<div class="lg-hpop">' + [['asap', 'As soon as possible'], ['this_week', 'This week'], ['this_month', 'This month'], ['planning', 'Planning ahead']].map(o => '<button class="lb-btn" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div><div class="lg-hpop"><label class="lg-sub" for="lgfDate">Or by a date</label><input type="date" id="lgfDate"><button class="lb-btn" data-v="by_date">Save the date</button></div>'
      : k === 'pay' ? '<div class="lg-hpop">' + PAYS.map(o => '<button class="lb-btn" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>'
      : '<div class="lg-hpop"><input id="lgfIn" ' + (k === 'hours' ? 'type="number" min="1" placeholder="e.g. 12"' : 'placeholder="e.g. $34/hr, 4-hour visits"') + '><button class="lb-btn lb-btn-primary" data-v="in">Save</button></div>';
    const pop = root.ccPopOpen(anchor || document.body, '<div style="font-size:14px;font-weight:800;color:var(--navy);">' + esc(T) + '</div>' + body + '<div class="lg-sub" style="margin-top:6px;">Saved on the lead. Nothing is sent to the family.</div>', { width:400 });
    const inp = pop.querySelector('#lgfIn'); if(inp){ inp.focus(); inp.onkeydown = e => { if(e.key === 'Enter') pop.querySelector('[data-v="in"]').click(); }; }
    pop.querySelectorAll('[data-v]').forEach(b => b.onclick = async () => {
      const v = b.dataset.v, val = inp ? String(inp.value || '').trim() : '';
      if(k === 'start'){ const d = String((pop.querySelector('#lgfDate') || {}).value || ''); if(v === 'by_date' && !d) return; R().compose(l, { desired_start_kind:v, desired_start_date:v === 'by_date' ? d : '' }); }
      else if(k === 'pay') l.funding_source = v;
      else if(k === 'quote'){ if(!val) return; l.price_quoted = true; l.quoted_price_amount = val; }
      else if(k === 'hours'){ if(!(Number(val) > 0)) return; l.number_of_hours = val; }
      if(typeof root.ccPopClose === 'function') root.ccPopClose();
      if(typeof root.persist === 'function') await root.persist('leads', l);
      if(typeof root.ccToast === 'function') root.ccToast('Saved.');
      redraw();
    });
  }
  function lgView(v){ try{ root.localStorage.setItem('lgView', v === 'chart' ? 'chart' : 'board'); }catch(e){} redraw(); }
  async function lgTemp(id, v){
    const l = leadById(id); if(!l || TEMPS.indexOf(v) < 0) return;
    const me = (typeof root.ccActor === 'function' && root.ccActor()) || {};
    l.lead_temp = { v, by:me.email || '', by_name:me.name || '', at:new Date().toISOString() };
    if(typeof root.persist === 'function') await root.persist('leads', l);
    if(typeof root.ccToast === 'function') root.ccToast('Moved to ' + TEMP_WORD[v] + '.');
    redraw();
  }

  const api = { place, nextFor, groups, html, summary, model, temp, hubTemp, steps, wire, viewNow, touches, contactLink, cameWords, heardHtml, factsHtml, notFamily, familyReply, lastWords, tries, talked, liveOn, previewOn, setPreview, showing, previewBar, waitWords };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LeadGroups = api;
  root.lgFamily = lgFamily; root.lgPartner = lgPartner; root.lgPreview = lgPreview; root.lgView = lgView; root.lgTemp = lgTemp; root.lgHeard = lgHeard; root.lgFact = lgFact; root.lgSaveHeard = saveHeard;
})(typeof window !== 'undefined' ? window : globalThis);
