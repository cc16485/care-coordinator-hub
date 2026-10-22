/* =====================================================================================================================
   LEADS AS CARDS (Samantha 2026-10-22: "Is the new leads in CDS better than what we have now?" → "just the look of it";
   approved mockup https://claude.ai/artifact/UsJfjnivkUHXSRJjsRgi2U, with her change: every card shows the date the lead
   came in and the last contact). The CDS Leads look on the same rows: three steps across the top (To call · Home visit ·
   Deciding), one card per family, red first. Only the look changes: every row still comes from LeadRules.boardRow, and
   every button calls what leads-board.js already has.
   Switch: ops_settings.leads_cards_live (off = the list as before). While it is off an owner can preview it for
   themselves only (this browser).
   The rules below (step, dates) are pure; LeadCards.html draws. Hub only: the server never reads this file.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const R = () => root.LeadRules;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ── the three steps ─────────────────────────────────────────────────────────────────────────────────────────────
     Where the family is, not what is urgent (the colour says that):
       visit   a home visit to book, booked, or done with the care plan still to write
       decide  the visit is done and the plan is with the family, or we are waiting on them, the VA, an insurer or the state
       call    everything else: new families, replies, promised calls, tries, follow-ups, families we cannot reach */
  const STEPS = [
    { key:'call', label:'To call', desc:'New families, replies, and call backs we promised.' },
    { key:'visit', label:'Home visit', desc:'Book it, do it, then write the care plan.' },
    { key:'decide', label:'Deciding', desc:'Care plan is with the family. Waiting on their yes.' }
  ];
  const VISIT_REASONS = ['asmt_booked', 'asmt_plan', 'urgent_start', 'asmt_overdue'];
  const DECIDE_REASONS = ['decision_stale', 'authorized', 'dsds_21', 'medicaid_45', 'waiting_state_nodate'];
  const PLAN_DONE = ['Plan Drafted', 'Plan Sent', 'Completed'];
  function step(r, l, ctx){
    ctx = ctx || {}; l = l || {};
    const reason = r && r.reason;
    if(VISIT_REASONS.indexOf(reason) > -1) return 'visit';
    const w = R() && R().waiting ? R().waiting(l) : null;
    if(reason === 'waiting' || reason === 'check_back_due') return w && w.reason === 'unable_to_reach' ? 'call' : 'decide';
    if(DECIDE_REASONS.indexOf(reason) > -1) return 'decide';
    if((ctx.assessments || []).some(a => a && PLAN_DONE.indexOf(a.status) > -1)) return 'decide';
    if((ctx.assessments || []).some(a => a && (a.status === 'Completed — Awaiting Plan' || a.status === 'Scheduled'))) return 'visit';
    if(l.status === 'Assessment Scheduled') return 'visit';
    return 'call';
  }
  /* red first, then yellow, then gray; inside a colour, the board's own order */
  const TONE_RANK = { red:0, amber:1, green:1, navy:2, muted:2 };
  const toneOf = r => (r && r.when && r.when.tone) || 'navy';

  /* ── the two dates on every card (her change to the mockup, 2026-10-22) ──────────────────────────────────────────
     "Today, 2:12 pm" · "Yesterday, 4:30 pm" · "Tue, 11:15 am" (this week, with withTime) · "Mon, Oct 20" */
  function dateWords(iso, now, withTime){
    const ms = Date.parse(iso); if(!iso || isNaN(ms)) return '';
    const c = R().chicago(new Date(ms).toISOString()), n = R().chicago(now || new Date().toISOString());
    const back = R().daysBetween(c.ymd, n.ymd), d = new Date(c.ymd + 'T12:00:00Z');
    const clock = R().clockWords(new Date(ms).toISOString());
    if(back === 0) return 'Today, ' + clock;
    if(back === 1) return 'Yesterday, ' + clock;
    const day = DAY_SHORT[d.getUTCDay()];
    if(withTime && back > 1 && back < 7) return day + ', ' + clock;
    return day + ', ' + MONTH_SHORT[d.getUTCMonth()] + ' ' + d.getUTCDate();
  }
  /* when the inquiry came in: the inquiry event, else the record's own date */
  function cameIn(l, now){
    const ev = (Array.isArray(l && l.contact_events) ? l.contact_events : []).find(e => e && e.outcome === 'inquiry' && e.at);
    return dateWords((ev && ev.at) || (l && l.created_at), now, false);
  }
  /* the last time we and the family were in touch: a call, text or email either way, or the home visit; never the
     inquiry itself or anything a machine sent */
  function lastContact(l, now, ctx){
    l = l || {}; ctx = ctx || {};
    const first = String(l.first_name || '').trim();
    let best = null;
    (Array.isArray(l.contact_events) ? l.contact_events : []).forEach(e => {
      if(!e || !e.at || e.outcome === 'inquiry') return;
      const out = e.actor === 'human' && e.direction === 'out', inn = e.direction === 'in' && e.actor === 'family';
      const met = e.actor === 'human' && e.direction === 'in' && e.outcome === 'connected';   /* they called and we answered, or they walked in */
      if(!out && !inn && !met) return;
      if(!best || String(e.at) > String(best.at)) best = { at:e.at, e, out };
    });
    const visit = (ctx.assessments || []).filter(a => a && a.visit_date && a.status !== 'Scheduled').map(a => a.visit_date).sort().pop();
    if(visit && (!best || visit > String(best.at).slice(0, 10))) return { at:visit, text:'Home visit, ' + dateWords(visit + 'T17:00:00Z', now, false) };
    if(!best){
      if(l.last_contacted_at) return { at:l.last_contacted_at, text:dateWords(l.last_contacted_at, now, true) };
      return { at:null, text:l.first_human_attempt_at ? 'Not reached yet' : 'None yet' };
    }
    const e = best.e, when = dateWords(e.at, now, true);
    const ch = e.channel === 'sms' ? 'texted' : e.channel === 'email' ? 'emailed' : 'called';
    let what;
    if(!best.out) what = e.channel === 'in_person' ? (first || 'They') + ' walked in' : (first || 'They') + ' ' + ch;
    else if(e.channel === 'sms') what = 'We texted';
    else if(e.channel === 'email') what = 'We emailed';
    else if(e.outcome === 'connected') what = 'Call' + (first ? ' with ' + first : '');
    else if(e.outcome === 'voicemail') what = 'Voicemail';
    else if(e.outcome === 'no_answer') what = 'No answer';
    else if(e.outcome === 'requested_callback') what = 'Call, they asked for a call back';
    else what = 'Call';
    return { at:e.at, text:what + ', ' + when.replace(/^(Today|Yesterday)/, s => s.toLowerCase()) };
  }

  /* ── the switch and the owner's preview ── */
  const PREVIEW_KEY = 'lcPreview';
  function liveOn(settings){ return !!(settings && settings.leads_cards_live === true); }
  function previewOn(){ try{ return root.localStorage && root.localStorage.getItem(PREVIEW_KEY) === '1'; }catch(e){ return false; } }
  function setPreview(on){ try{ if(on) root.localStorage.setItem(PREVIEW_KEY, '1'); else root.localStorage.removeItem(PREVIEW_KEY); }catch(e){} }
  /* cards show when the switch is on, or when an owner turned the preview on in this browser */
  function showing(settings, isOwner){ return liveOn(settings) || (!!isOwner && previewOn()); }

  /* ── drawing ── */
  const LC = { step:'call' };
  try{ const s = root.localStorage && root.localStorage.getItem('lcStep'); if(STEPS.some(x => x.key === s)) LC.step = s; }catch(e){}
  const DUE_CLS = { red:'lcd-red', amber:'lcd-amber', green:'lcd-green' };
  const READY_WORDS = { ready:['Sounds ready', 'lcr-hot'], deciding:['Interested', 'lcr-warm'], looking:['Just looking', 'lcr-cool'] };
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  /* the mockup's words: on the cards the assessment is the home visit (the list keeps its own words) */
  const hv = t => String(t == null ? '' : t).replace(/assessment at the home/gi, 'home visit').replace(/\bSchedule assessment\b/g, 'Book home visit')
    .replace(/\bAssessment\b/g, 'Home visit').replace(/\bassessments?\b/g, m => m === 'assessments' ? 'home visits' : 'home visit');
  function card(x, now, h){
    const r = x.r, l = x.l, v = x.v || {}, id = esc(l.id), t = toneOf(r);
    const pay = l.funding_source ? ((x.ctx && x.ctx.payer_label) || (R().PAYER_WORDS || {})[l.funding_source] || l.funding_source) : '';
    const hours = v.hours ? 'About ' + v.hours + ' hrs a week' + (v.usd ? ' · ' + money(v.usd) + '/mo' : '') : (v.txt || '');
    const facts = [String(l.client_city || '').trim(), hours].filter(Boolean).map(s => '<span>' + esc(s) + '</span>');
    if(v.lvl && READY_WORDS[v.lvl]) facts.push('<span class="lcr ' + READY_WORDS[v.lvl][1] + '">' + READY_WORDS[v.lvl][0] + '</span>');
    /* 2026-10-22: How did they reach us? (its tag and who referred them) while that switch is on; else the website pill as before */
    const rb = root.ReachedBy && root.ReachedBy.liveOn(((typeof DATA !== 'undefined' ? DATA : root.DATA) || {}).ops_settings || {}) ? root.ReachedBy.tagHtml(l) : '';
    if(rb) facts.push(rb);
    else if(h.fromWeb && h.fromWeb(l)) facts.push('<span class="lc-web">From website</span>');
    const chips = (r.chips || []).filter(c => c.tone === 'missing' || c.tone === 'bad');
    const lc = lastContact(l, now, x.ctx);
    /* a Scheduled row's "10 am" needs its day on a card (the list had day headings) */
    let due = hv(r.when.big);
    if(r.group === 'later' && r.sort){ const day = R().dayHeader(r.sort, R().chicago(now).ymd); if(day && String(due).toLowerCase().indexOf(day.toLowerCase()) !== 0) due = day + ', ' + due; }
    const yes = h.yesReady(l, r) && x.step === 'decide';
    const main = r.primary ? h.btn(l, Object.assign({}, r.primary, { label:hv(r.primary.label) }), !yes) : '';
    const owner = String(r.owner || '').trim().split(/\s+/)[0];
    return '<article class="lc-card" data-lead="' + id + '">'
      + '<div class="lc-top"><button class="lc-name" data-open-lead="' + id + '" data-open-tab="summary" title="Open their profile">' + esc(r.name) + '</button>' + (pay ? '<span class="lc-pay lc-pay-' + esc(l.funding_source) + '">' + esc(pay) + '</span>' : '') + '</div>'
      + (r.why ? '<p class="lc-who">' + esc(r.why) + '</p>' : '')
      + '<div class="lc-dates"><div><span class="lc-k">Lead came in</span><span class="lc-v">' + esc(cameIn(l, now) || 'Not known') + '</span></div>'
      + '<div><span class="lc-k">Last contact</span><span class="lc-v">' + esc(lc.text) + '</span></div></div>'
      + (facts.length ? '<div class="lc-facts">' + facts.join('') + '</div>' : '')
      + (chips.length ? '<div class="lc-chips">' + chips.map(c => '<span class="lc-chip' + (c.tone === 'bad' ? ' lc-chip-bad' : '') + '">' + esc(c.tone === 'missing' ? 'Missing: ' + c.text : c.text) + '</span>').join('') + '</div>' : '')
      + '<div class="lc-due"><span class="lcd ' + (DUE_CLS[t] || 'lcd-gray') + '">' + esc(due) + (r.when.sub ? ' · ' + esc(hv(r.when.sub)) : '') + '</span>'
      + '<span class="lc-next"><b>Next:</b> ' + esc(hv(r.next.text)) + '</span></div>'
      + '<div class="lc-own"><span class="lc-av">' + esc(owner ? owner.charAt(0).toUpperCase() : '?') + '</span>' + (owner ? esc(owner) + '’s family' : '<b style="color:var(--red);">Nobody’s family yet</b>') + '</div>'
      + '<div class="lc-acts"><button class="lb-btn lc-open" data-open-lead="' + id + '" data-open-tab="summary">Open</button>' + main
      + (yes ? '<button class="lb-btn lb-btn-yes lc-yes" onclick="lbYes(\'' + id + '\', this)">They said yes</button>' : '')
      + '<button class="lb-btn lb-more" aria-label="More actions" onclick="lbMore(\'' + id + '\', this)">···</button></div>'
      + '</article>';
  }
  /* work = [{ r, l, ctx, v }] already filtered by owner/search; h = the board's helpers { btn, yesReady, fromWeb } */
  function html(work, now, h){
    style();
    const by = { call:[], visit:[], decide:[] };
    work.forEach(x => { x.step = step(x.r, x.l, x.ctx); by[x.step].push(x); });
    Object.keys(by).forEach(k => by[k].sort((a, b) => ((TONE_RANK[toneOf(a.r)] || 0) - (TONE_RANK[toneOf(b.r)] || 0)) || R().boardSort(a.r, b.r)));
    const tabs = STEPS.map(s => {
      const on = s.key === LC.step, hot = by[s.key].filter(x => toneOf(x.r) === 'red').length;
      return '<button type="button" class="lc-step' + (on ? ' on' : '') + '" onclick="lcStep(\'' + s.key + '\')" aria-pressed="' + on + '">'
        + '<span class="lc-step-top"><span class="lc-step-n">' + by[s.key].length + '</span><span class="lc-step-l">' + s.label + '</span>'
        + (hot ? '<span class="lc-step-hot">' + hot + ' late or new</span>' : '') + '</span>'
        + '<span class="lc-step-d">' + s.desc + '</span></button>';
    }).join('');
    const list = by[LC.step];
    return '<div class="lc-steps">' + tabs + '</div>'
      + (list.length ? '<div class="lc-grid">' + list.map(x => card(x, now, h)).join('') + '</div>'
        : '<div class="card lb-group"><div class="lb-empty">Nobody in ' + esc(STEPS.find(s => s.key === LC.step).label) + ' right now.</div></div>');
  }
  /* the line above the steps: how many, who needs you this minute, next up, first calls today */
  function summary(work, opts){
    style();
    const red = work.filter(x => toneOf(x.r) === 'red').length;
    return '<div class="lc-sum"><div class="lc-sum-main">' + work.length + (work.length === 1 ? ' family' : ' families') + ' right now.'
      + (red ? ' <b class="lc-sum-red">' + red + ' need' + (red === 1 ? 's' : '') + ' you this minute.</b>' : ' Nobody is late.') + '</div>'
      + '<div class="lc-sum-sub">' + [opts.nextUp ? 'Next up for a new lead: <b>' + esc(opts.nextUp) + '</b>' : '', opts.median != null ? 'First calls today: <b>' + esc(opts.median) + ' min</b> (median)' : ''].filter(Boolean).join(' · ') + '</div></div>';
  }
  let styled = false;
  function style(){
    if(styled || typeof document === 'undefined') return; styled = true;
    const s = document.createElement('style'); s.id = 'leadCardsStyle';
    s.textContent = '.lc-sum{margin:2px 0 12px;}.lc-sum-main{font-size:15px;}.lc-sum-red{color:#9B2C1A;}.lc-sum-sub{font-size:13px;color:var(--text-muted);margin-top:2px;}'
      + '.lc-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:12px;margin-bottom:16px;}'
      + '.lc-step{display:flex;flex-direction:column;gap:6px;padding:14px 18px;border-radius:18px;border:2px solid var(--border);background:transparent;text-align:left;cursor:pointer;font:inherit;color:inherit;}'
      + '.lc-step.on{background:#fff;border-color:#1F7A8C;box-shadow:0 6px 18px rgba(31,122,140,.14);}'
      + '.lc-step-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}.lc-step-n{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:999px;background:#f2f0e9;color:var(--navy);font-weight:800;font-size:16px;}'
      + '.lc-step.on .lc-step-n{background:#1F7A8C;color:#fff;}.lc-step-l{font-size:19px;font-weight:800;color:var(--navy);}.lc-step-hot{padding:2px 9px;border-radius:999px;background:#FBE7E3;color:#9B2C1A;font-size:12px;font-weight:800;}'
      + '.lc-step-d{font-size:13px;color:var(--text-muted);}'
      + '.lc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(330px,100%),1fr));gap:16px;}'
      + '.lc-card{background:#fff;border-radius:18px;box-shadow:0 4px 18px rgba(13,54,95,.07);padding:18px 20px;display:flex;flex-direction:column;gap:10px;min-width:0;}'
      + '.lc-top{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;justify-content:space-between;}'
      + '.lc-name{all:unset;cursor:pointer;font-size:19px;font-weight:800;color:var(--navy);}.lc-name:hover{text-decoration:underline;}.lc-name:focus-visible{outline:2px solid #1F7A8C;outline-offset:2px;}'
      + '.lc-pay{padding:3px 11px;border-radius:999px;font-size:12px;font-weight:800;white-space:nowrap;background:#EAF4F6;color:#14606F;}.lc-pay-ltc{background:#FDF1DC;color:#7A4E0B;}.lc-pay-va{background:#E6ECF3;color:#0D365F;}.lc-pay-guide{background:#EFE9F6;color:#5B3A86;}.lc-pay-medicaid,.lc-pay-cds{background:#F1F5F9;color:#475569;}'
      + '.lc-who{margin:0;font-size:14px;line-height:1.45;}'
      + '.lc-dates{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;border-top:1px solid #efece4;border-bottom:1px solid #efece4;padding:8px 0;}'
      + '.lc-dates>div{display:flex;flex-direction:column;gap:2px;min-width:0;}.lc-k{font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;}.lc-v{font-size:13.5px;font-weight:700;}'
      + '.lc-facts{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px;color:var(--text-muted);}.lcr{font-weight:800;}.lcr-hot{color:#9B2C1A;}.lcr-warm{color:#7A4E0B;}'
      + '.lc-web{padding:1px 9px;border-radius:999px;border:1.5px solid #8FD1C7;color:#14606F;font-size:11.5px;font-weight:800;}'
      + '.lc-chips{display:flex;flex-wrap:wrap;gap:6px;}.lc-chip{padding:2px 9px;border-radius:999px;border:1.5px dashed #B91C1C;color:#9B2C1A;font-size:11.5px;font-weight:800;}.lc-chip-bad{border-style:solid;background:var(--red-bg);}'
      + '.lc-due{background:#f6f5f0;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;}'
      + '.lcd{align-self:flex-start;padding:3px 10px;border-radius:999px;font-size:12.5px;font-weight:800;background:#fff;color:#55677a;}.lcd-red{background:#FBE7E3;color:#9B2C1A;}.lcd-amber{background:#FDF1DC;color:#7A4E0B;}.lcd-green{background:#E6F3EA;color:#1E6B3A;}'
      + '.lc-next{font-size:14px;line-height:1.4;}'
      + '.lc-own{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-muted);}.lc-av{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:#E6ECF3;color:var(--navy);font-weight:800;font-size:12px;}'
      + '.lc-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;}.lc-acts .lb-btn{min-height:40px;display:inline-flex;align-items:center;justify-content:center;}.lc-acts .lc-open{flex:1;}.lc-acts .lb-btn-primary,.lc-acts .lc-yes{flex:1.4;}'
      + '.lc-preview{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 10px;padding:8px 12px;border-radius:10px;background:#FDF1DC;color:#7A4E0B;font-size:13px;}';
    document.head.appendChild(s);
  }
  function lcStep(k){ if(!STEPS.some(s => s.key === k)) return; LC.step = k; try{ root.localStorage.setItem('lcStep', k); }catch(e){} try{ if(typeof root.renderLeadsStarts === 'function') root.renderLeadsStarts(); }catch(e){} }
  function lcPreview(on){ setPreview(!!on); try{ if(typeof root.renderLeadsStarts === 'function') root.renderLeadsStarts(); }catch(e){} }

  const api = { STEPS, step, hv, dateWords, cameIn, lastContact, liveOn, previewOn, setPreview, showing, html, summary, state:LC };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LeadCards = api;
  root.lcStep = lcStep; root.lcPreview = lcPreview;
})(typeof globalThis !== 'undefined' ? globalThis : this);
