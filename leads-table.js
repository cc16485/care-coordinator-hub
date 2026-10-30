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
  const LT = { tab:'all', sort:'imp', page:0, per:50 };
  try{ const s = root.localStorage;
    if(s){ LT.tab = s.getItem('ltTab') || 'all'; LT.sort = s.getItem('ltSort') || 'imp'; LT.per = [20, 50, 100].indexOf(+s.getItem('ltPer')) > -1 ? +s.getItem('ltPer') : 50; } }catch(e){}
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
  const FIRST_DIR = { name:'asc', came:'desc', last:'asc', usd:'desc' };
  const SORTS = [['imp', 'Most important'], ['need', 'Who to call first'], ['name:asc', 'Name, A to Z'], ['came:desc', 'Newest in'], ['came:asc', 'Oldest in'],
    ['last:asc', 'Quiet the longest'], ['last:desc', 'Most recent activity'], ['usd:desc', 'Worth the most a month']];
  function sorter(sort, impSort){
    if(sort === 'imp' && impSort) return impSort;
    if(sort === 'need' || sort === 'imp') return need;
    const [col, dir] = String(sort).split(':'), sg = dir === 'desc' ? -1 : 1;
    const key = { name:x => String(x.r.name || '').toLowerCase(), came:x => cameAt(x.l), last:x => (x.last && x.last.at) || '', usd:x => (x.v && x.v.usd) || 0 }[col];
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
      + '.lt-calm .lt-btns .lb-btn.lb-more{border-color:#e4e1d8;color:#55677a;}.lt-calm .lt-btns .lb-btn-dim{border-color:#e4e1d8;color:#8a96a3;}';
    document.head.appendChild(s);
  }
  const redraw = () => { try{ if(typeof root.renderLeadsStarts === 'function') root.renderLeadsStarts(); }catch(e){} };
  function ltTab(k){ LT.tab = k; LT.page = 0; save('ltTab', k); redraw(); }
  function ltSortBy(k){ LT.sort = k; LT.page = 0; save('ltSort', k); redraw(); }
  function ltSortCol(col){ ltSortBy(nextSort(LT.sort, col)); }
  function ltPage(n){ LT.page = Math.max(0, +n || 0); redraw(); try{ document.getElementById('ltList').scrollIntoView({ block:'start', behavior:'smooth' }); }catch(e){} }
  function ltCalmPreview(on){ setCalmPreview(!!on); redraw(); }
  function ltPer(n){ LT.per = [20, 50, 100].indexOf(+n) > -1 ? +n : 50; LT.page = 0; save('ltPer', LT.per); redraw(); }

  const api = { html, state:LT, phoneWords, initials, dayWords, agoWords, cameAt, lastActivity, sorter, nextSort, SORTS,
    calmLive, calmPreview, calmShowing, calmTone, calmCounts, calmSummary, calmFacts };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LeadTable = api;
  Object.assign(root, { ltTab, ltSortBy, ltSortCol, ltPage, ltPer, ltCalmPreview });
})(typeof globalThis !== 'undefined' ? globalThis : this);
