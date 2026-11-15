/* =====================================================================================================================
   LEADS LIST, THE GOHIGHLEVEL WAY, MADE BETTER (Samantha 2026-10-29: "Can you do the same for our leads on the Caring
   Companions sub account", after the CDS hub's Leads list, caring-companions-cds #117/#120). Replaces the card grid of
   lead-cards.js under the same switch (ops_settings.leads_cards_live, or an owner's own preview):
     - Smart List style tabs: All, then To call, Home visit, Deciding (LeadCards.step), each with its count and how many are late
     - a lead count pill and a Sort menu; every column heading sorts too, a second click flips it
     - initials circle, Phone (rings from the office line), Came in with the time of day, Last activity with a call or note
       icon and "8 hours ago"
     - 20, 50 or 100 a page with Prev and Next
   and keeps what GoHighLevel lacks: the coloured When pill, the next step on every row, and the row's own buttons.
   Only the look changes: every row still comes from LeadRules.boardRow, and every button calls what leads-board.js has.
   The rules below (sorting, dates, last activity) are pure; LeadTable.html draws. Hub only: the server never reads this.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const R = () => root.LeadRules, LC = () => root.LeadCards;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ── state, kept per computer ── */
  const LT = { tab:'all', sort:'imp', page:0, per:50, view:'list', q:'', fPay:'', fReady:'', menus:{} };
  try{ const s = root.localStorage;
    if(s){ LT.tab = s.getItem('ltTab') || 'all'; LT.sort = s.getItem('ltSort') || 'imp'; LT.per = [20, 50, 100].indexOf(+s.getItem('ltPer')) > -1 ? +s.getItem('ltPer') : 50;
      LT.view = s.getItem('ltView') === 'cards' ? 'cards' : 'list'; } }catch(e){}
  const save = (k, v) => { try{ root.localStorage.setItem(k, String(v)); }catch(e){} };

  /* ── the words ── */
  function phoneWords(p){
    const d = String(p || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : String(p || '');
  }
  const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
  /* "Oct 29" (and the year when it is not this year), in Chicago */
  function dayWords(iso, now){
    const ms = Date.parse(iso); if(!iso || isNaN(ms)) return '';
    const c = R().chicago(new Date(ms).toISOString()), n = R().chicago(now || new Date().toISOString());
    const [y, m, d] = c.ymd.split('-').map(Number);
    return MONTH_SHORT[m - 1] + ' ' + d + (c.ymd.slice(0, 4) !== n.ymd.slice(0, 4) ? ', ' + y : '');
  }
  /* "5 min ago" · "8 hours ago" · "Yesterday" · "3 days ago" · "2 weeks ago" · "4 months ago" */
  function agoWords(iso, now){
    const at = Date.parse(iso), nw = Date.parse(now || new Date().toISOString()); if(isNaN(at)) return '';
    const ms = Math.max(0, nw - at), h = Math.floor(ms / 36e5);
    if(h < 1) return Math.max(1, Math.floor(ms / 6e4)) + ' min ago';
    if(h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    const days = R().daysBetween(R().chicago(new Date(at).toISOString()).ymd, R().chicago(new Date(nw).toISOString()).ymd);
    return days <= 1 ? 'Yesterday' : days < 14 ? days + ' days ago' : days < 60 ? Math.round(days / 7) + ' weeks ago' : Math.round(days / 30) + ' months ago';
  }
  /* when the inquiry came in: the inquiry event, else the record's own date */
  function cameAt(l){
    const ev = (Array.isArray(l && l.contact_events) ? l.contact_events : []).find(e => e && e.outcome === 'inquiry' && e.at);
    return (ev && ev.at) || (l && l.created_at) || '';
  }
  /* the newest thing that happened with the family: a call, text or email either way (the office line's recorder writes
     these too), a walk-in, or a note someone wrote on their profile. Never the inquiry itself.
     extra = more people's events (piece 2: their Contacts), already in the same shape. */
  function lastActivity(l, extra){
    l = l || {};
    let best = null;
    const take = (at, kind, what) => { if(at && !isNaN(Date.parse(at)) && (!best || Date.parse(at) > Date.parse(best.at))) best = { at, kind, what }; };
    (Array.isArray(l.contact_events) ? l.contact_events : []).concat(extra || []).forEach(e => {
      if(!e || !e.at || e.outcome === 'inquiry' || e.actor === 'system') return;
      const ch = e.channel === 'sms' ? 'Text' : e.channel === 'email' ? 'Email' : e.channel === 'in_person' ? 'Walk-in' : 'Call';
      take(e.at, e.channel === 'email' ? 'note' : 'call', ch + (e.direction === 'in' ? ' from them' : ' from us'));
    });
    (Array.isArray(l.comm_log) ? l.comm_log : []).forEach(n => { if(n && n.at && n.body) take(n.at, 'note', 'Note'); });
    if(!best && l.last_contacted_at) take(l.last_contacted_at, 'call', 'Last contact');
    return best;
  }

  /* ── sorting ── */
  const TONE_RANK = { red:0, amber:1, green:1, navy:2, muted:2 };
  const toneOf = r => (r && r.when && r.when.tone) || 'navy';
  /* who to call first: red, then yellow, then the rest; inside a colour, the board's own order */
  const need = (a, b) => ((TONE_RANK[toneOf(a.r)] || 0) - (TONE_RANK[toneOf(b.r)] || 0)) || R().boardSort(a.r, b.r);
  const FIRST_DIR = { name:'asc', came:'desc', last:'asc', usd:'desc', hours:'desc' };
  const SORTS = [['imp', 'Most important'], ['need', 'Who to call first'], ['name:asc', 'Name, A to Z'], ['came:desc', 'Newest in'], ['came:asc', 'Oldest in'],
    ['last:asc', 'Quiet the longest'], ['last:desc', 'Most recent activity'], ['usd:desc', 'Worth the most a month']];
  function sorter(sort, impSort){
    if(sort === 'imp' && impSort) return impSort;
    if(sort === 'need' || sort === 'imp') return need;
    const [col, dir] = String(sort).split(':'), sg = dir === 'desc' ? -1 : 1;
    const key = { name:x => String(x.r.name || '').toLowerCase(), came:x => cameAt(x.l), last:x => (x.last && x.last.at) || '', usd:x => (x.v && x.v.usd) || 0, hours:x => (x.v && +x.v.hours) || 0 }[col];
    if(!key) return need;
    /* empty values go last either way ("never talked to" sorts first only when you ask for the quietest) */
    return (a, b) => {
      const ka = key(a), kb = key(b), ea = ka === '' || ka === 0, eb = kb === '' || kb === 0;
      if(col === 'last' && dir === 'asc'){ if(ea !== eb) return ea ? -1 : 1; }
      else if(ea !== eb) return ea ? 1 : -1;
      if(ka === kb) return need(a, b);
      return sg * (typeof ka === 'number' ? ka - kb : ka.localeCompare(kb, 'en', { sensitivity:'base' })) || need(a, b);
    };
  }
  /* clicking a heading sorts by it; clicking it again flips the order. When = who to call first. */
  function nextSort(cur, col){
    if(col === 'need') return 'need';
    const [c, d] = String(cur).split(':');
    return col + ':' + (c === col ? (d === 'asc' ? 'desc' : 'asc') : FIRST_DIR[col] || 'asc');
  }

  const ICON = {
    call:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    note:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16v12l-4 4H4z"/><path d="M8 9h8M8 13h5"/></svg>',
    sort:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 15 5 5 5-5M7 9l5-5 5 5"/></svg>'
  };
  const DUE_CLS = { red:'ltd-red', amber:'ltd-amber', green:'ltd-green' };
  const READY_WORDS = { ready:['Sounds ready', 'lt-hot'], deciding:['Interested', 'lt-warm'], looking:['Just looking', 'lt-cool'] };
  const money = n => '$' + Math.round(n).toLocaleString('en-US');

  /* ── the calm look (2026-10-30, her "so busy and colorful … still a lot to the eye"; approved mockup
     https://claude.ai/artifact/9ReTBpXJ7PwkbreCVSb8te): colour only means "this needs you". Red = needs you now, gold = needs
     you today, everyone else plain gray. No initials circles, no coloured tags, one button style. Behind
     ops_settings.leads_calm_live, or an owner's own preview in this browser (ltCalm). Only the look changes. ── */
  const CALM_KEY = 'ltCalm';
  function calmLive(settings){ return !!(settings && settings.leads_calm_live === true); }
  function calmPreview(){ try{ return !!root.localStorage && root.localStorage.getItem(CALM_KEY) === '1'; }catch(e){ return false; } }
  function setCalmPreview(on){ try{ if(on) root.localStorage.setItem(CALM_KEY, '1'); else root.localStorage.removeItem(CALM_KEY); }catch(e){} }
  function calmShowing(settings, isOwner){ return calmLive(settings) || (!!isOwner && calmPreview()); }
  /* red rows need you now; the rest of the board's "now" group needs you today; everyone else can wait */
  const calmTone = r => toneOf(r) === 'red' ? 'now' : r && r.group === 'now' ? 'today' : 'wait';
  function calmCounts(work){
    const n = { now:0, today:0, wait:0 }; (work || []).forEach(x => { n[calmTone(x.r)]++; }); return n;
  }
  /* the one line above the list: "6 families right now. 2 need you now · 1 today · 3 can wait" */
  function calmSummary(work, opts){
    style(); opts = opts || {};
    const n = calmCounts(work), parts = [];
    if(n.now) parts.push('<b class="lts-now">' + n.now + ' need' + (n.now === 1 ? 's' : '') + ' you now</b>');
    if(n.today) parts.push('<b class="lts-today">' + n.today + ' today</b>');
    if(n.wait) parts.push('<span>' + n.wait + ' can wait</span>');
    return '<div class="lts-sum"><div class="lts-main">' + work.length + (work.length === 1 ? ' family' : ' families') + ' right now.' + (parts.length ? ' ' + parts.join(' · ') : '') + '</div>'
      + '<div class="lts-sub">' + [opts.nextUp ? 'Next up for a new lead: <b>' + esc(opts.nextUp) + '</b>' : '', opts.median != null ? 'First calls today: <b>' + esc(opts.median) + ' min</b> (median)' : ''].filter(Boolean).join(' · ') + '</div></div>';
  }
  /* the facts under the name, as one gray line of words instead of coloured tags */
  function calmFacts(x, h){
    const l = x.l, v = x.v || {}, out = [];
    if(l.funding_source) out.push((x.ctx && x.ctx.payer_label) || (R().PAYER_WORDS || {})[l.funding_source] || l.funding_source);
    const RB = root.ReachedBy, rbOn = RB && RB.liveOn(((typeof DATA !== 'undefined' ? DATA : root.DATA) || {}).ops_settings || {}), k = rbOn ? RB.of(l) : '';
    if(k){ out.push(RB.label(k)); const ref = String(l.referral_source_name || '').trim(); if(ref && !/^(online|website|web|facebook)$/i.test(ref)) out.push('Referred by ' + ref); }
    else if(h.fromWeb && h.fromWeb(l)) out.push('Website');
    if(v.lvl && READY_WORDS[v.lvl]) out.push(READY_WORDS[v.lvl][0]);
    if(v.usd) out.push(money(v.usd) + '/mo');
    return out;
  }

  /* ── the cleaner list, the GoHighLevel layout (2026-11-15, her "would this layout work for any hub pages" with a screenshot of
     GHL's Campaigns list, then "Mock up Leads", then "Build it switched off"): one row of tabs, a tool row (Add filter, Sort,
     list or card view, Search), a plain table (Family, Hours, Per month, When, Status, ···) and Rows per page. Colour still
     only means "this needs you". The row's own buttons move into the ··· menu. Behind ops_settings.leads_simple_live, or an
     owner's own preview in this browser (ltSimple). Only the look changes. ── */
  const SIMPLE_KEY = 'ltSimple';
  function simpleLive(settings){ return !!(settings && settings.leads_simple_live === true); }
  function simplePreview(){ try{ return !!root.localStorage && root.localStorage.getItem(SIMPLE_KEY) === '1'; }catch(e){ return false; } }
  function setSimplePreview(on){ try{ if(on) root.localStorage.setItem(SIMPLE_KEY, '1'); else root.localStorage.removeItem(SIMPLE_KEY); }catch(e){} }
  function simpleShowing(settings, isOwner){ return simpleLive(settings) || (!!isOwner && simplePreview()); }
  /* the gray Status tag: what happened last between us and the family, in two words */
  function statusWord(l){
    const ev = (Array.isArray(l && l.contact_events) ? l.contact_events : [])
      .filter(e => e && e.at && !isNaN(Date.parse(e.at)) && e.outcome !== 'inquiry' && e.actor !== 'system')
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
    if(!ev) return 'New';
    if(ev.direction === 'in'){
      if(ev.outcome === 'missed') return 'Missed their call';
      return ev.channel === 'sms' || ev.channel === 'email' ? 'Replied' : ev.channel === 'in_person' ? 'Walked in' : 'Called us';
    }
    if(ev.channel === 'sms') return 'Texted';
    if(ev.channel === 'email') return 'Emailed';
    if(ev.channel === 'in_person') return 'Met in person';
    if(/no_answer|voicemail|missed|busy/.test(String(ev.outcome || ''))) return 'No answer';
    return ev.outcome === 'connected' ? 'Talked' : 'Called';
  }
  const READY_LABEL = { ready:'Sounds ready', deciding:'Interested', looking:'Just looking', none:'Not read yet' };
  function payerOf(x){ const l = x.l; return l.funding_source ? ((x.ctx && x.ctx.payer_label) || (R().PAYER_WORDS || {})[l.funding_source] || l.funding_source) : ''; }
  /* who called, then the gray facts (no $: it has its own column) */
  function simpleFacts(x, h){
    const l = x.l, out = [], cl = String(l.client_first_name || '').trim(), caller = String(l.first_name || '').trim();
    if(caller && cl && caller.toLowerCase() !== cl.toLowerCase()) out.push((l.relationship ? String(l.relationship).trim() + ' ' : '') + caller);
    else if(cl && caller && caller.toLowerCase() === cl.toLowerCase()) out.push('Called for themselves');
    return out.concat(calmFacts(x, h).filter(f => !/\/mo$/.test(f)));
  }
  function simpleMatch(x){
    const q = String(LT.q || '').trim().toLowerCase(); if(!q) return true;
    const l = x.l, d = q.replace(/\D/g, '');
    const words = [x.r.name, l.first_name, l.last_name, l.client_first_name, l.client_last_name, l.email].join(' ').toLowerCase();
    if(q.split(/\s+/).every(w => words.indexOf(w) > -1)) return true;
    return d.length >= 3 && [l.phone, l.client_phone].some(p => String(p || '').replace(/\D/g, '').indexOf(d) > -1);
  }
  function simpleFilterOk(x){
    if(LT.fPay && (x.l.funding_source || '') !== LT.fPay) return false;
    if(LT.fReady && ((x.v && x.v.lvl) || 'none') !== LT.fReady) return false;
    return true;
  }
  function simpleRow(x, now, h){
    const r = x.r, l = x.l, v = x.v || {}, id = esc(l.id), ct = calmTone(r), hv = LC().hv;
    let due = hv(r.when.big);
    if(r.group === 'later' && r.sort){ const day = R().dayHeader(r.sort, R().chicago(now).ymd); if(day && String(due).toLowerCase().indexOf(day.toLowerCase().slice(0, 3)) !== 0) due = day + ', ' + due; }
    const owner = String(r.owner || '').trim().split(/\s+/)[0], facts = simpleFacts(x, h);
    /* the row's own buttons ride at the top of its ··· menu: Call, the next step, They said yes */
    const ph = l.phone || l.client_phone || '';
    const yes = h.yesReady && h.yesReady(l, r) && x.step === 'decide';
    LT.menus[String(l.id)] = (ph ? '<a class="lb-btn" href="#" role="button" data-oc-phone="' + esc(ph) + '"' + (l.email ? ' data-oc-email="' + esc(l.email) + '"' : '') + ' title="Call from the office line">Call ' + esc(phoneWords(ph)) + '</a>' : '')
      + (r.primary && r.primary.kind !== 'call' && h.btn ? h.btn(l, Object.assign({}, r.primary, { label:hv(r.primary.label) }), false) : '')
      + (yes ? '<button class="lb-btn" onclick="lbYes(\'' + id + '\', this)">They said yes</button>' : '');
    return '<article class="lts-row' + (ct === 'wait' ? '' : ' ltr-' + ct) + '" role="row" data-lead="' + id + '">'
      + '<div class="lts-fam" role="cell"><button type="button" class="lt-namebtn" data-open-lead="' + id + '" data-open-tab="summary" title="Open their profile">' + esc(r.name || 'No name') + '</button>'
        + (facts.length ? '<span class="lt-facts" title="' + esc(facts.join('\n')) + '">' + esc(facts.join(' · ')) + '</span>' : '') + '</div>'
      + '<div class="lts-num" role="cell"><span class="lt-lbl">Hours</span>' + (v.hours ? esc(v.hours) + ' / wk' : '<span class="lts-unk">Not heard</span>') + '</div>'
      + '<div class="lts-num" role="cell"><span class="lt-lbl">Per month</span>' + (v.usd ? money(v.usd) : '<span class="lts-unk">Not known</span>') + '</div>'
      + '<div class="lts-when" role="cell"><span class="lt-lbl">When</span><span class="ltw ltw-' + ct + '" title="' + esc([r.when.sub ? hv(r.when.sub) : '', 'Next: ' + hv(r.next.text)].filter(Boolean).join('\n')) + '">' + esc(due) + '</span>'
        + '<small class="lt-own">' + (owner ? esc(owner) : 'No owner yet') + '</small></div>'
      + '<div class="lts-st" role="cell"><span class="lts-tag">' + esc(statusWord(l)) + '</span></div>'
      + '<div class="lts-more" role="cell" data-no-open="1"><button type="button" class="lts-dots" aria-label="Actions for ' + esc(r.name || 'this family') + '" onclick="ltRowMenu(\'' + id + '\', this)">'
        + '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg></button></div>'
      + (x.extra ? '<div class="lt-extra">' + x.extra + '</div>' : '')
      + '</article>';
  }
  const SVG_GRID = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>';
  const SVG_LIST = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>';
  const SVG_FIND = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  function simpleHtml(work, now, h){
    LT.menus = {};
    const tabs = [{ key:'all', label:'All', desc:'Every family still open.' }].concat(LC().STEPS);
    if(!tabs.some(t => t.key === LT.tab)) LT.tab = 'all';
    work.forEach(x => { x.step = LC().step(x.r, x.l, x.ctx); const ex = h.extraFor ? h.extraFor(x.l) || {} : {}; x.last = lastActivity(x.l, ex.events); x.extra = ex.html || ''; });
    const pool = work.filter(x => simpleFilterOk(x) && simpleMatch(x));
    const tabsHtml = tabs.map(s => {
      const inTab = s.key === 'all' ? pool : pool.filter(x => x.step === s.key), on = s.key === LT.tab;
      return '<button type="button" role="tab" aria-selected="' + on + '" class="lts-tab' + (on ? ' on' : '') + '" title="' + esc(s.desc) + '" onclick="ltTab(\'' + s.key + '\')">' + esc(s.label) + ' (' + inTab.length + ')</button>';
    }).join('');
    /* searching looks across every tab, so nobody hides behind the wrong one */
    const searching = !!String(LT.q || '').trim() || h.searching;
    const shown = (searching || LT.tab === 'all' ? pool.slice() : pool.filter(x => x.step === LT.tab)).sort(sorter(LT.sort, h.impSort));
    const pages = Math.max(1, Math.ceil(shown.length / LT.per));
    if(LT.page >= pages) LT.page = pages - 1;
    const from = LT.page * LT.per, page = shown.slice(from, from + LT.per);
    /* the filters in use, each one a chip you can take off */
    const chips = [];
    if(h.owner) chips.push(['Showing ' + h.owner + '\'s families', 'owner']);
    if(LT.fPay){ const x = work.find(y => (y.l.funding_source || '') === LT.fPay); chips.push(['Payer: ' + (x ? payerOf(x) : LT.fPay), 'pay']); }
    if(LT.fReady) chips.push(['How ready: ' + (READY_LABEL[LT.fReady] || LT.fReady), 'ready']);
    const chipHtml = chips.map(c => '<span class="lts-chip">' + esc(c[0]) + '<button type="button" aria-label="Take off this filter" onclick="ltFilterOff(\'' + c[1] + '\')">&times;</button></span>').join('');
    const view = LT.view === 'cards' ? 'cards' : 'list';
    const tools = '<div class="lts-tools">'
      + '<button type="button" class="lts-pill" onclick="ltAddFilter(this)"><span aria-hidden="true">+</span> Add filter</button>' + chipHtml
      + '<label class="lts-pill lts-sort">' + ICON.sort + '<span class="lt-sr">Sort</span><select id="ltSort" onchange="ltSortBy(this.value)">' + SORTS.map(s => '<option value="' + s[0] + '"' + (s[0] === LT.sort ? ' selected' : '') + '>' + s[1] + '</option>').join('')
        + (SORTS.some(s => s[0] === LT.sort) ? '' : '<option value="' + esc(LT.sort) + '" selected>By the column you clicked</option>') + '</select></label>'
      + '<span class="lts-gap"></span>'
      + '<span class="lts-view" role="group" aria-label="View"><button type="button" aria-label="Card view" aria-pressed="' + (view === 'cards') + '" class="' + (view === 'cards' ? 'on' : '') + '" onclick="ltView(\'cards\')">' + SVG_GRID + '</button>'
        + '<button type="button" aria-label="List view" aria-pressed="' + (view === 'list') + '" class="' + (view === 'list' ? 'on' : '') + '" onclick="ltView(\'list\')">' + SVG_LIST + '</button></span>'
      + '<label class="lts-find">' + SVG_FIND + '<span class="lt-sr">Search the leads</span><input id="ltQ" type="search" placeholder="Search" value="' + esc(LT.q || '') + '" oninput="ltSearch(this.value)" autocomplete="off"></label>'
      + '</div>';
    const [col, dir] = String(LT.sort).split(':');
    const th = (key, label, cls) => {
      const on = key === 'need' ? LT.sort === 'need' : col === key;
      const arrow = !on ? ICON.sort : key === 'need' ? '&#9650;' : dir === 'asc' ? '&#9650;' : '&#9660;';
      return '<button type="button" role="columnheader" class="lts-colbtn' + (on ? ' on' : '') + (cls ? ' ' + cls : '') + '" aria-pressed="' + on + '" onclick="ltSortCol(\'' + key + '\')">' + label + ' <span class="lt-arrow">' + arrow + '</span></button>';
    };
    const head = '<div class="lts-row lts-head" role="row">' + th('name', 'Family') + th('hours', 'Hours') + th('usd', 'Per month') + th('need', 'When') + '<span role="columnheader">Status</span><span></span></div>';
    const label = (tabs.find(t => t.key === LT.tab) || tabs[0]).label;
    const empty = '<div class="lt-empty">' + (searching ? 'Nobody matches that search.' : chips.length ? 'Nobody matches those filters.' : LT.tab === 'all' ? 'No open families right now.' : 'Nobody in ' + esc(label) + ' right now.') + '</div>';
    const list = !page.length ? '<div class="lts-table">' + empty + '</div>'
      : view === 'cards' ? '<div class="lc-grid lts-cards">' + page.map(x => LC().card(x, now, h)).join('') + '</div>'
      : '<div class="lts-table" id="ltList" role="table">' + head + page.map(x => simpleRow(x, now, h)).join('') + '</div>';
    const pager = shown.length ? '<div class="lts-pager"><label for="ltPer">Rows per page</label><select id="ltPer" onchange="ltPer(this.value)">'
      + [20, 50, 100].map(n => '<option value="' + n + '"' + (n === LT.per ? ' selected' : '') + '>' + n + '</option>').join('') + '</select>'
      + '<span>' + (from + 1) + ' to ' + (from + page.length) + ' of ' + shown.length + '</span>'
      + '<button type="button" onclick="ltPage(' + (LT.page - 1) + ')"' + (LT.page ? '' : ' disabled') + '>Previous</button>'
      + '<button type="button" onclick="ltPage(' + (LT.page + 1) + ')"' + (LT.page + 1 < pages ? '' : ' disabled') + '>Next</button></div>' : '';
    return '<div class="lt-calm lts">' + '<div class="lts-tabs" role="tablist">' + tabsHtml + '</div>' + tools + list + pager + '</div>';
  }

  function row(x, now, h){
    const r = x.r, l = x.l, v = x.v || {}, id = esc(l.id), t = toneOf(r), hv = LC().hv;
    const pay = l.funding_source ? ((x.ctx && x.ctx.payer_label) || (R().PAYER_WORDS || {})[l.funding_source] || l.funding_source) : '';
    const tags = [];
    if(pay) tags.push('<span class="lt-tag lt-pay-' + esc(l.funding_source) + '">' + esc(pay) + '</span>');
    const rb = root.ReachedBy && root.ReachedBy.liveOn(((typeof DATA !== 'undefined' ? DATA : root.DATA) || {}).ops_settings || {}) ? root.ReachedBy.tagHtml(l) : '';
    if(rb) tags.push(rb); else if(h.fromWeb && h.fromWeb(l)) tags.push('<span class="lt-tag lt-web">Website</span>');
    if(v.lvl && READY_WORDS[v.lvl]) tags.push('<span class="lt-tag ' + READY_WORDS[v.lvl][1] + '">' + READY_WORDS[v.lvl][0] + '</span>');
    if(v.usd) tags.push('<span class="lt-tag lt-usd" title="' + esc(v.how || '') + '">' + money(v.usd) + '/mo</span>');
    /* the phone: theirs, else the client's own; it rings from the office line (her rule 2026-10-03) */
    const ph = l.phone || l.client_phone || '';
    const phone = ph ? '<a class="lt-tel" href="#" role="button" data-oc-phone="' + esc(ph) + '"' + (l.email ? ' data-oc-email="' + esc(l.email) + '"' : '') + ' data-no-open="1" title="Call from the office line">' + ICON.call + esc(phoneWords(ph)) + '</a>'
      + (!l.phone && l.client_phone ? '<small>' + esc(String(l.client_first_name || 'client').trim()) + '\'s own</small>' : '')
      : '<span class="lt-tel lt-none">No phone yet</span>';
    const came = cameAt(l), cameTime = came ? R().clockWords(new Date(Date.parse(came)).toISOString()) : '';
    const la = x.last;
    let due = hv(r.when.big);
    if(r.group === 'later' && r.sort){ const day = R().dayHeader(r.sort, R().chicago(now).ymd); if(day && String(due).toLowerCase().indexOf(day.toLowerCase().slice(0, 3)) !== 0) due = day + ', ' + due; }
    const chips = (r.chips || []).filter(c => c.tone === 'missing' || c.tone === 'bad');
    const yes = h.yesReady(l, r) && x.step === 'decide';
    const main = r.primary ? h.btn(l, Object.assign({}, r.primary, { label:hv(r.primary.label) }), !yes) : '';
    const owner = String(r.owner || '').trim().split(/\s+/)[0];
    if(h.calm){
      const ct = calmTone(r), facts = calmFacts(x, h);
      const chipWords = chips.map(c => c.tone === 'missing' ? 'Missing: ' + c.text : c.text);
      const cameCell = came ? esc(dayWords(came, now)) + (cameTime ? '<small>' + esc(cameTime) + '</small>' : '') : '<small>Not known</small>';
      const lastCell = la ? '<span class="lt-act" title="' + esc(la.what + ', ' + dayWords(la.at, now) + ' ' + R().clockWords(new Date(Date.parse(la.at)).toISOString())) + '">' + esc(agoWords(la.at, now)) + '</span><small>' + esc(la.what) + '</small>' : '<small>Not yet</small>';
      return '<article class="lt-row' + (ct === 'wait' ? '' : ' ltr-' + ct) + '" role="row" data-lead="' + id + '">'
        + '<div class="lt-c-name"><span class="lt-nm"><button type="button" class="lt-namebtn" data-open-lead="' + id + '" data-open-tab="summary" title="Open their profile">' + esc(r.name || 'No name') + '</button>'
          + (facts.length ? '<span class="lt-facts" title="' + esc(facts.join('\n')) + '">' + esc(facts.join(' · ')) + '</span>' : '') + '</span></div>'
        + '<div class="lt-c-phone"><span class="lt-lbl">Phone</span>' + phone + '</div>'
        + '<div class="lt-c-date"><span class="lt-lbl">Came in</span>' + cameCell + '</div>'
        + '<div class="lt-c-date"><span class="lt-lbl">Last activity</span>' + lastCell + '</div>'
        + '<div class="lt-c-due"><span class="lt-lbl">When</span><span class="ltw ltw-' + ct + '"' + (r.when.sub ? ' title="' + esc(hv(r.when.sub)) + '"' : '') + '>' + esc(due) + '</span>'
          + '<small class="lt-own">' + (owner ? esc(owner) : 'No owner yet') + '</small></div>'
        + '<div class="lt-c-about" title="' + esc([r.why || '', 'Next: ' + hv(r.next.text)].concat(chipWords).filter(Boolean).join('\n')) + '">' + (r.why ? '<span class="lt-who">' + esc(r.why) + '</span>' : '')
          + '<span class="lt-next"><b>Next:</b> ' + esc(hv(r.next.text)) + (chipWords.length ? ' · ' + esc(chipWords[0]) + (chipWords.length > 1 ? ' +' + (chipWords.length - 1) + ' more' : '') : '') + '</span></div>'
        + '<div class="lt-btns" data-no-open="1">' + main
          + (yes ? '<button class="lb-btn" onclick="lbYes(\'' + id + '\', this)">They said yes</button>' : '')
          + '<button class="lb-btn lb-more" aria-label="More actions for ' + esc(r.name || 'this family') + '" onclick="lbMore(\'' + id + '\', this)">···</button></div>'
        + (x.extra ? '<div class="lt-extra">' + x.extra + '</div>' : '')
        + '</article>';
    }
    return '<article class="lt-row" role="row" data-lead="' + id + '">'
      + '<div class="lt-c-name"><span class="lt-av lt-av-' + t + '" aria-hidden="true">' + esc(initials(r.name)) + '</span>'
        + '<span class="lt-nm"><button type="button" class="lt-namebtn" data-open-lead="' + id + '" data-open-tab="summary" title="Open their profile">' + esc(r.name || 'No name') + '</button>'
        + (tags.length ? '<span class="lt-tags">' + tags.join('') + '</span>' : '') + '</span></div>'
      + '<div class="lt-c-phone"><span class="lt-lbl">Phone</span>' + phone + '</div>'
      + '<div class="lt-c-date"><span class="lt-lbl">Came in</span>' + (came ? esc(dayWords(came, now)) + (cameTime ? '<small>' + esc(cameTime) + '</small>' : '') : '<small>Not known</small>') + '</div>'
      + '<div class="lt-c-date"><span class="lt-lbl">Last activity</span>' + (la ? '<span class="lt-act" title="' + esc(la.what + ', ' + dayWords(la.at, now) + ' ' + R().clockWords(new Date(Date.parse(la.at)).toISOString())) + '">' + ICON[la.kind] + esc(agoWords(la.at, now)) + '</span><small>' + esc(la.what) + '</small>' : '<small>Not yet</small>') + '</div>'
      + '<div class="lt-c-due"><span class="lt-lbl">When</span><span class="ltd ' + (DUE_CLS[t] || 'ltd-gray') + '"' + (r.when.sub ? ' title="' + esc(hv(r.when.sub)) + '"' : '') + '>' + esc(due) + '</span>'
        + '<small class="lt-own">' + (owner ? esc(owner) : '<b style="color:var(--red);">Nobody yet</b>') + '</small></div>'
      + '<div class="lt-c-about" title="' + esc((r.why || '') + '\nNext: ' + hv(r.next.text)) + '">' + (r.why ? '<span class="lt-who">' + esc(r.why) + '</span>' : '')
        + '<span class="lt-next"><b>Next:</b> ' + esc(hv(r.next.text)) + '</span>'
        /* one chip on the row (the rest on hover and on the profile), so every row stays one line high */
        + (chips.length ? '<span class="lt-chips" title="' + esc(chips.map(c => c.tone === 'missing' ? 'Missing: ' + c.text : c.text).join('\n')) + '">' + chips.slice(0, 1).map(c => '<span class="lt-chip' + (c.tone === 'bad' ? ' lt-chip-bad' : '') + '">' + esc(c.tone === 'missing' ? 'Missing: ' + c.text : c.text) + '</span>').join('')
          + (chips.length > 1 ? '<span class="lt-more">+' + (chips.length - 1) + ' more</span>' : '') + '</span>' : '') + '</div>'
      + '<div class="lt-btns" data-no-open="1">' + main
        + (yes ? '<button class="lb-btn lb-btn-yes" onclick="lbYes(\'' + id + '\', this)">They said yes</button>' : '')
        + '<button class="lb-btn lb-more" aria-label="More actions for ' + esc(r.name || 'this family') + '" onclick="lbMore(\'' + id + '\', this)">···</button></div>'
      + (x.extra ? '<div class="lt-extra">' + x.extra + '</div>' : '')
      + '</article>';
  }

  /* work = [{ r, l, ctx, v }] already filtered by owner and search; h = the board's helpers { btn, yesReady, fromWeb, impSort,
     searching, extraFor(l) → { events, html } } */
  function html(work, now, h){
    style(); h = h || {};
    if(h.simple) return simpleHtml(work, now, h);
    const tabs = [{ key:'all', label:'All', desc:'Every family still open.' }].concat(LC().STEPS);
    if(!tabs.some(t => t.key === LT.tab)) LT.tab = 'all';
    work.forEach(x => { x.step = LC().step(x.r, x.l, x.ctx); const ex = h.extraFor ? h.extraFor(x.l) || {} : {}; x.last = lastActivity(x.l, ex.events); x.extra = ex.html || ''; });
    const tabsHtml = tabs.map(s => {
      const inTab = s.key === 'all' ? work : work.filter(x => x.step === s.key), late = inTab.filter(x => toneOf(x.r) === 'red').length, on = s.key === LT.tab;
      return '<button type="button" role="tab" aria-selected="' + on + '" class="lt-tab' + (on ? ' on' : '') + '" title="' + esc(s.desc) + '" onclick="ltTab(\'' + s.key + '\')">'
        + esc(s.label) + ' <span class="lt-tabn">' + inTab.length + '</span>' + (late ? '<span class="lt-late">' + late + ' late</span>' : '') + '</button>';
    }).join('');
    /* searching looks across every tab, so nobody hides behind the wrong one */
    const shown = (h.searching || LT.tab === 'all' ? work.slice() : work.filter(x => x.step === LT.tab)).sort(sorter(LT.sort, h.impSort));
    const pages = Math.max(1, Math.ceil(shown.length / LT.per));
    if(LT.page >= pages) LT.page = pages - 1;
    const page = shown.slice(LT.page * LT.per, (LT.page + 1) * LT.per);
    const [col, dir] = String(LT.sort).split(':');
    const th = (key, label) => {
      const on = key === 'need' ? LT.sort === 'need' : col === key;
      const arrow = !on ? ICON.sort : key === 'need' ? '&#9650;' : dir === 'asc' ? '&#9650;' : '&#9660;';
      return '<button type="button" class="lt-colbtn' + (on ? ' on' : '') + '" aria-pressed="' + on + '" onclick="ltSortCol(\'' + key + '\')">' + label + ' <span class="lt-arrow">' + arrow + '</span></button>';
    };
    const tools = '<div class="lt-tools"><span class="lt-count">' + shown.length + (shown.length === 1 ? ' lead' : ' leads') + '</span>'
      + '<label class="lt-sortpick">Sort <select id="ltSort" onchange="ltSortBy(this.value)">' + SORTS.map(s => '<option value="' + s[0] + '"' + (s[0] === LT.sort ? ' selected' : '') + '>' + s[1] + '</option>').join('')
      + (SORTS.some(s => s[0] === LT.sort) ? '' : '<option value="' + esc(LT.sort) + '" selected>By the column you clicked</option>') + '</select></label></div>';
    const head = '<div class="lt-row lt-headrow" role="row">' + th('name', 'Name') + '<span>Phone</span>' + th('came', 'Came in') + th('last', 'Last activity') + th('need', 'When') + '<span>About them and next step</span><span></span></div>';
    const pager = shown.length ? '<div class="lt-pager"><span>Page ' + (LT.page + 1) + ' of ' + pages + '</span><span class="lt-pagebtns"><label class="lt-sr" for="ltPer">Leads per page</label><select id="ltPer" onchange="ltPer(this.value)">'
      + [20, 50, 100].map(n => '<option value="' + n + '"' + (n === LT.per ? ' selected' : '') + '>' + n + ' a page</option>').join('') + '</select>'
      + '<button type="button" onclick="ltPage(' + (LT.page - 1) + ')"' + (LT.page ? '' : ' disabled') + '>Prev</button>'
      + '<button type="button" onclick="ltPage(' + (LT.page + 1) + ')"' + (LT.page + 1 < pages ? '' : ' disabled') + '>Next</button></span></div>' : '';
    const label = (tabs.find(t => t.key === LT.tab) || tabs[0]).label;
    const body = '<div class="lt-tabs" role="tablist">' + tabsHtml + '</div>' + tools
      + '<div class="lt-list" id="ltList">' + (page.length ? head + page.map(x => row(x, now, h)).join('') : '<div class="lt-empty">' + (h.searching ? 'Nobody matches that search.' : LT.tab === 'all' ? 'No open families right now.' : 'Nobody in ' + esc(label) + ' right now.') + '</div>') + '</div>'
      + pager;
    return h.calm ? '<div class="lt-calm">' + body + '</div>' : body;
  }

  let styled = false;
  function style(){
    if(styled || typeof document === 'undefined') return; styled = true;
    const s = document.createElement('style'); s.id = 'leadTableStyle';
    s.textContent = '.lt-tabs{display:flex;flex-wrap:wrap;gap:4px 22px;border-bottom:1.5px solid #e4e1d8;margin-bottom:12px;}'
      + '.lt-tab{display:flex;align-items:center;gap:7px;min-height:46px;padding:0 2px;border:0;border-bottom:3px solid transparent;margin-bottom:-1.5px;background:none;font:inherit;font-size:15px;font-weight:700;color:#55677a;cursor:pointer;}'
      + '.lt-tab:hover{color:var(--navy);}.lt-tab.on{color:#14606F;border-bottom-color:#1F7A8C;}'
      + '.lt-tabn{min-width:22px;padding:1px 7px;border-radius:999px;background:#efece4;color:#3c4a58;font-size:12px;font-weight:700;text-align:center;}.lt-tab.on .lt-tabn{background:#1F7A8C;color:#fff;}'
      + '.lt-late{font-size:12px;font-weight:700;color:#9B2C1A;}'
      + '.lt-tools{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;margin-bottom:12px;}'
      + '.lt-count{display:inline-flex;align-items:center;min-height:34px;padding:0 14px;border-radius:999px;background:#EAF0FA;color:#2B4C7E;font-size:13.5px;font-weight:700;}'
      + '.lt-sortpick{display:flex;align-items:center;gap:8px;font-size:14px;color:#55677a;}.lt-sortpick select{min-height:38px;padding:0 10px;border:1.5px solid #e4e1d8;border-radius:12px;background:#fff;font:inherit;font-size:14px;}'
      + '.lt-list{background:#fff;border-radius:18px;box-shadow:0 4px 18px rgba(13,54,95,.07);overflow:hidden;}'
      + '.lt-row{display:grid;grid-template-columns:minmax(190px,1.4fr) 150px 88px 124px 136px minmax(200px,2.3fr) auto;gap:4px 14px;align-items:center;padding:12px 18px;border-top:1px solid #efece4;}'
      + '.lt-row:hover:not(.lt-headrow){background:#fbfaf6;}'
      + '.lt-headrow{border-top:0;background:#f6f5f0;padding-top:8px;padding-bottom:8px;font-size:12px;font-weight:700;color:#55677a;text-transform:uppercase;letter-spacing:.04em;}'
      + '.lt-colbtn{display:inline-flex;align-items:center;gap:4px;border:0;background:none;padding:0;font:inherit;color:inherit;text-transform:inherit;letter-spacing:inherit;text-align:left;cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px;}'
      + '.lt-colbtn.on{color:#14606F;text-decoration:none;}.lt-arrow{display:inline-flex;font-size:10px;opacity:.75;}.lt-colbtn.on .lt-arrow{opacity:1;}'
      + '.lt-c-name{display:flex;align-items:center;gap:10px;min-width:0;}'
      + '.lt-av{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:999px;font-size:12.5px;font-weight:800;background:#E3F3F1;color:#14606F;}'
      + '.lt-av-red{background:#FBE7E3;color:#9B2C1A;}.lt-av-amber{background:#FDF1DC;color:#7A4E0B;}'
      + '.lt-nm{display:flex;flex-direction:column;gap:3px;min-width:0;}'
      + '.lt-namebtn{border:0;background:none;padding:0;font:inherit;font-size:15.5px;font-weight:800;color:var(--navy);text-align:left;cursor:pointer;}.lt-namebtn:hover{text-decoration:underline;}'
      + '.lt-tags{display:flex;flex-wrap:wrap;gap:4px;}.lt-tag{padding:1px 8px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap;background:#EAF4F6;color:#14606F;}'
      + '.lt-pay-ltc{background:#FDF1DC;color:#7A4E0B;}.lt-pay-va{background:#E6ECF3;color:#0D365F;}.lt-pay-guide{background:#EFE9F6;color:#5B3A86;}.lt-pay-medicaid,.lt-pay-cds{background:#F1F5F9;color:#475569;}'
      + '.lt-web{background:#fff;border:1.5px solid #8FD1C7;}.lt-hot{background:#FBE7E3;color:#9B2C1A;}.lt-warm{background:#FDF1DC;color:#7A4E0B;}.lt-cool{background:#F1F5F9;color:#475569;}.lt-usd{background:#E6F3EA;color:#1E6B3A;}'
      + '.lt-c-phone{display:flex;flex-direction:column;min-width:0;}.lt-tel{display:inline-flex;align-items:center;gap:6px;font-size:13.5px;font-weight:700;color:#14606F;text-decoration:none;white-space:nowrap;}.lt-tel:hover{text-decoration:underline;}'
      + '.lt-none{font-weight:400;color:#8a96a3;}.lt-c-phone small,.lt-c-date small,.lt-c-due small{font-size:12px;color:#8a96a3;}'
      + '.lt-c-date,.lt-c-due{display:flex;flex-direction:column;gap:2px;font-size:14px;min-width:0;}'
      + '.lt-act{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;}.lt-act svg{color:#55677a;}'
      + '.ltd{align-self:flex-start;padding:3px 10px;border-radius:999px;font-size:12.5px;font-weight:800;background:#f1efe8;color:#55677a;}.ltd-red{background:#FBE7E3;color:#9B2C1A;}.ltd-amber{background:#FDF1DC;color:#7A4E0B;}.ltd-green{background:#E6F3EA;color:#1E6B3A;}'
      + '.lt-c-about{display:flex;flex-direction:column;gap:2px;min-width:0;font-size:13.5px;line-height:1.4;}'
      + '.lt-who,.lt-next{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;}.lt-next{color:#55677a;}'
      + '.lt-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px;}.lt-chip{padding:1px 8px;border-radius:999px;border:1.5px dashed #B91C1C;color:#9B2C1A;font-size:11px;font-weight:800;}.lt-chip-bad{border-style:solid;background:var(--red-bg);}'
      + '.lt-btns{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap;max-width:230px;}.lt-more{font-size:11.5px;color:#8a96a3;align-self:center;}.lt-btns .lb-btn{min-height:36px;display:inline-flex;align-items:center;white-space:nowrap;}'
      + '.lt-extra{grid-column:1/-1;}.lt-empty{padding:22px;color:var(--text-muted);}.lt-lbl{display:none;}'
      + '.lt-pager{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding:12px 4px 0;font-size:14px;color:#55677a;}'
      + '.lt-pagebtns{display:flex;gap:8px;align-items:center;}.lt-pagebtns select,.lt-pagebtns button{min-height:38px;padding:0 14px;border:1.5px solid #e4e1d8;border-radius:10px;background:#fff;font:inherit;font-size:14px;cursor:pointer;}.lt-pagebtns button:disabled{color:#a8b0b9;cursor:default;}'
      + '.lt-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);}'
      + '@media (max-width:1100px){.lt-headrow{display:none;}.lt-row{grid-template-columns:1fr 1fr;align-items:start;}.lt-c-name,.lt-c-about,.lt-btns{grid-column:1/-1;}.lt-btns{justify-content:flex-start;}'
      + '.lt-lbl{display:block;font-size:11px;font-weight:700;color:#8a96a3;text-transform:uppercase;letter-spacing:.04em;}}'
      /* the calm look: colour only on the rows that need you (a left edge and the When words), everything else gray */
      + '.lts-sum{margin:2px 0 12px;}.lts-main{font-size:15px;}.lts-now{color:#9B2C1A;}.lts-today{color:#8A5A08;}.lts-sub{font-size:13px;color:var(--text-muted);margin-top:2px;}'
      + '.lt-calm .lt-count{background:#f1efe8;color:#3c4a58;}'
      + '.lt-calm .lt-row{grid-template-columns:minmax(190px,1.4fr) 150px 88px 124px 136px minmax(200px,2.3fr) auto;}'
      + '.lt-calm .ltr-now{box-shadow:inset 4px 0 0 #B42318;}.lt-calm .ltr-today{box-shadow:inset 4px 0 0 #C98A0E;}'
      + '.lt-facts{font-size:12.5px;color:#6b7884;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
      + '.ltw{font-size:13.5px;font-weight:800;line-height:1.3;color:#6b7884;}.ltw-wait{font-weight:400;}.ltw-now{color:#9B2C1A;}.ltw-today{color:#8A5A08;}'
      + '.lt-calm .lt-tel{color:var(--navy);}.lt-calm .lt-tel svg{color:#8a96a3;}'
      + '.lt-calm .lt-btns .lb-btn{background:#fff;border:1.5px solid var(--navy);color:var(--navy);font-weight:700;border-radius:10px;}'
      + '.lt-calm .lt-btns .lb-btn.lb-more{border-color:#e4e1d8;color:#55677a;}.lt-calm .lt-btns .lb-btn-dim{border-color:#e4e1d8;color:#8a96a3;}'
      /* the cleaner list, the GoHighLevel layout */
      + '.lts-tabs{display:flex;flex-wrap:wrap;gap:4px 26px;border-bottom:1px solid #e4e1d8;margin-bottom:14px;}'
      + '.lts-tab{min-height:44px;padding:0 2px;border:0;border-bottom:2px solid transparent;margin-bottom:-1px;background:none;font:inherit;font-size:15px;font-weight:600;color:#55677a;cursor:pointer;}'
      + '.lts-tab:hover{color:var(--navy);}.lts-tab.on{color:var(--navy);border-bottom-color:#1F7A8C;}'
      + '.lts-tools{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;margin-bottom:12px;}.lts-gap{flex:1;}'
      + '.lts-pill{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 14px;border:1px solid #d9d5ca;border-radius:999px;background:#fff;font:inherit;font-size:14px;color:#2c3a47;cursor:pointer;}'
      + '.lts-pill:hover{border-color:#b9b4a7;}.lts-sort select{border:0;background:none;font:inherit;font-size:14px;color:inherit;cursor:pointer;padding:0;}'
      + '.lts-chip{display:inline-flex;align-items:center;gap:4px;min-height:32px;padding:0 4px 0 12px;border-radius:999px;background:#EAF4F6;color:#14606F;font-size:13px;font-weight:600;}'
      + '.lts-chip button{border:0;background:none;font-size:17px;line-height:1;color:inherit;cursor:pointer;padding:2px 6px;}'
      + '.lts-view{display:inline-flex;border:1px solid #d9d5ca;border-radius:10px;overflow:hidden;background:#fff;}.lts-view button{display:inline-flex;align-items:center;justify-content:center;width:40px;height:36px;border:0;background:none;color:#8a96a3;cursor:pointer;}'
      + '.lts-view button.on{background:#EAF4F6;color:#14606F;}'
      + '.lts-find{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 10px;border:1px solid #d9d5ca;border-radius:10px;background:#fff;color:#8a96a3;width:220px;max-width:100%;}'
      + '.lts-find input{border:0;outline:0;background:none;font:inherit;font-size:14px;width:100%;color:#2c3a47;padding:0;}'
      + '.lts-table{background:#fff;border:1px solid #e4e1d8;border-radius:14px;overflow:hidden;}'
      + '.lts-row{display:grid;grid-template-columns:minmax(220px,2.4fr) 100px 110px minmax(160px,1.5fr) 140px 48px;gap:4px 14px;align-items:center;padding:12px 16px;border-top:1px solid #efece4;}'
      + '.lts-row:hover:not(.lts-head){background:#fbfaf6;}'
      + '.lts-head{border-top:0;background:#f6f5f0;padding-top:10px;padding-bottom:10px;font-size:13.5px;font-weight:600;color:#55677a;}'
      + '.lts-colbtn{display:inline-flex;align-items:center;gap:5px;border:0;background:none;padding:0;font:inherit;color:inherit;text-align:left;cursor:pointer;}.lts-colbtn.on{color:var(--navy);}'
      + '.lts-fam{display:flex;flex-direction:column;gap:2px;min-width:0;}.lts .lt-namebtn{font-size:15px;font-weight:700;}'
      + '.lts-num{font-size:14px;white-space:nowrap;}.lts-unk{color:#8a96a3;}'
      + '.lts-when{display:flex;flex-direction:column;gap:2px;min-width:0;}.lts-when small{font-size:12px;color:#8a96a3;}'
      + '.lts-tag{display:inline-block;padding:3px 10px;border-radius:999px;background:#f1efe8;color:#55677a;font-size:12.5px;font-weight:600;white-space:nowrap;}'
      + '.lts-more{display:flex;justify-content:flex-end;}.lts-dots{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border:0;border-radius:10px;background:none;color:#55677a;cursor:pointer;}.lts-dots:hover{background:#f1efe8;}'
      + '.lts-pager{display:flex;justify-content:flex-end;align-items:center;flex-wrap:wrap;gap:10px;padding:12px 2px 0;font-size:14px;color:#55677a;}'
      + '.lts-pager select,.lts-pager button{min-height:36px;padding:0 12px;border:1px solid #d9d5ca;border-radius:10px;background:#fff;font:inherit;font-size:14px;cursor:pointer;}.lts-pager button:disabled{color:#b0b6bd;cursor:default;}'
      + '.lts-cards{margin-top:2px;}.ltm-top{display:flex;flex-direction:column;gap:6px;padding-bottom:8px;margin-bottom:6px;border-bottom:1px solid #efece4;}.ltm-top .lb-btn{justify-content:center;text-align:center;}'
      + '@media (max-width:900px){.lts-head{display:none;}.lts-row{grid-template-columns:1fr 1fr;align-items:start;}.lts-fam{grid-column:1/-1;}.lts-more{grid-column:2;grid-row:1;}.lts-fam{grid-column:1;}'
      + '.lts .lt-lbl{display:block;font-size:11px;font-weight:700;color:#8a96a3;text-transform:uppercase;letter-spacing:.04em;}.lts-find{width:100%;}}';
    document.head.appendChild(s);
  }
  const redraw = () => { try{ if(typeof root.renderLeadsStarts === 'function') root.renderLeadsStarts(); }catch(e){} };
  function ltTab(k){ LT.tab = k; LT.page = 0; save('ltTab', k); redraw(); }
  function ltSortBy(k){ LT.sort = k; LT.page = 0; save('ltSort', k); redraw(); }
  function ltSortCol(col){ ltSortBy(nextSort(LT.sort, col)); }
  function ltPage(n){ LT.page = Math.max(0, +n || 0); redraw(); try{ document.getElementById('ltList').scrollIntoView({ block:'start', behavior:'smooth' }); }catch(e){} }
  function ltCalmPreview(on){ setCalmPreview(!!on); redraw(); }
  function ltSimplePreview(on){ setSimplePreview(!!on); redraw(); }
  function ltView(v){ LT.view = v === 'cards' ? 'cards' : 'list'; save('ltView', LT.view); redraw(); }
  /* typing redraws the list; the search box keeps its focus and caret */
  function ltSearch(v){
    LT.q = String(v || ''); LT.page = 0; redraw();
    try{ const el = document.getElementById('ltQ'); if(el && document.activeElement !== el){ el.focus(); const n = el.value.length; el.setSelectionRange(n, n); } }catch(e){}
  }
  function ltFilterOff(k){ if(k === 'owner'){ if(typeof root.lbOwner === 'function') root.lbOwner(''); return; } if(k === 'pay') LT.fPay = ''; if(k === 'ready') LT.fReady = ''; LT.page = 0; redraw(); }
  /* Add filter: who the family belongs to, the payer, how ready they sound */
  function ltAddFilter(btn){
    if(typeof root.ccPopOpen !== 'function') return;
    const D = (typeof DATA !== 'undefined' ? DATA : root.DATA) || {}, LB = (root.LeadsBoard && root.LeadsBoard.state) || {};
    const leads = (D.leads || []).filter(l => l && !l.archived && l.status !== 'Lost' && l.status !== 'Converted');
    const owners = [...new Set(leads.map(l => String(l.assigned_coordinator || '').trim().split(/\s+/)[0]).filter(Boolean))].sort();
    const pays = [...new Set(leads.map(l => l.funding_source || '').filter(Boolean))].sort();
    const PW = R().PAYER_WORDS || {};
    const sel = (id, label, opts, cur) => '<label style="display:block;margin-bottom:10px;font-size:13px;font-weight:600;color:#55677a;">' + label
      + '<select id="' + id + '" style="display:block;width:100%;margin-top:4px;min-height:36px;padding:0 8px;border:1px solid #d9d5ca;border-radius:8px;font:inherit;font-size:14px;">'
      + opts.map(o => '<option value="' + esc(o[0]) + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></label>';
    const el = root.ccPopOpen(btn, '<div style="font-size:14px;font-weight:700;margin-bottom:10px;">Filter the leads</div>'
      + sel('ltfOwner', 'Whose families', [['', 'Everyone\'s']].concat(owners.map(o => [o, o + '\'s'])), LB.owner || '')
      + sel('ltfPay', 'Payer', [['', 'Any payer']].concat(pays.map(p => [p, PW[p] || p])), LT.fPay)
      + sel('ltfReady', 'How ready they sound', [['', 'Any']].concat(Object.keys(READY_LABEL).map(k => [k, READY_LABEL[k]])), LT.fReady)
      + '<div style="display:flex;gap:8px;margin-top:4px;"><button class="primary" id="ltfGo" style="padding:7px 14px;font-size:13px;">Show</button><button class="ghost" id="ltfClear" style="padding:7px 14px;font-size:13px;">Clear all</button></div>', { width:290 });
    const done = (o, p, r) => { LT.fPay = p; LT.fReady = r; LT.page = 0; root.ccPopClose(); if(typeof root.lbOwner === 'function' && (LB.owner || '') !== o) root.lbOwner(o); else redraw(); };
    el.querySelector('#ltfGo').onclick = () => done(el.querySelector('#ltfOwner').value, el.querySelector('#ltfPay').value, el.querySelector('#ltfReady').value);
    el.querySelector('#ltfClear').onclick = () => done('', '', '');
  }
  /* the ··· on a row: the row's own buttons first (Call, the next step, They said yes), then everything under ··· before */
  function ltRowMenu(id, btn){ if(typeof root.lbMore === 'function') root.lbMore(id, btn, LT.menus[String(id)] || ''); }
  function ltPer(n){ LT.per = [20, 50, 100].indexOf(+n) > -1 ? +n : 50; LT.page = 0; save('ltPer', LT.per); redraw(); }

  const api = { html, state:LT, phoneWords, initials, dayWords, agoWords, cameAt, lastActivity, sorter, nextSort, SORTS,
    calmLive, calmPreview, calmShowing, calmTone, calmCounts, calmSummary, calmFacts,
    simpleLive, simplePreview, simpleShowing, statusWord, simpleFacts };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LeadTable = api;
  Object.assign(root, { ltTab, ltSortBy, ltSortCol, ltPage, ltPer, ltCalmPreview, ltSimplePreview, ltView, ltSearch, ltFilterOff, ltAddFilter, ltRowMenu });
})(typeof globalThis !== 'undefined' ? globalThis : this);
