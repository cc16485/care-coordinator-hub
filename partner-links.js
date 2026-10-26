/* =============================================================================
   partner-links.js · Partner links, step 2 of the tracking build (Samantha approved 2026-10-26). Rules: partner-links-rules.js.
   Records: the ones the Hub already keeps (referral_orgs, leads); nothing new to sync, no new storage slot.
     · Partner profile: the partner's code, link and QR code, copy buttons for the link and a ready text; owners add a
       partner to the program and pause or resume it
     · Referrers > Program (owners only): each program partner's referrals, home visits, clients started, conversion and
       how the referrals came in; billed revenue is read on request from AxisCare by the partner-revenue server function
       (owners only; completed visits × each visit's charge rate, an estimate, never saved)
     · Sources to check (owners only): links that came in without a partner being attached, each decided with one click
     · Saving a lead: an established referral source changes only for an owner, with a reason, kept in source_history
     · Make this a lead: the partner the call named is picked in Referred By (the usual box; yellow like the rest)
   Tracking only: nothing about money. Nothing here contacts a partner or a family.
   ============================================================================= */
(function () {
  'use strict';
  const R = () => window.PartnerLinksRules;
  const esc = v => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(v) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
  const say = m => { if(typeof ccToast === 'function') ccToast(m); else alert(m); };
  const owner = () => { try{ return ccIsOwner(); }catch(e){ return false; } };
  const actor = () => { try{ return (ccActor() || {}).email || ''; }catch(e){ return ''; } };
  const orgs = () => (typeof DATA !== 'undefined' && DATA.referral_orgs) || [];
  const leads = () => (typeof DATA !== 'undefined' && DATA.leads) || [];
  const org = id => orgs().find(o => String(o.id) === String(id)) || null;
  const pageLive = () => !!((typeof DATA !== 'undefined' && DATA.ops_settings) || {}).partner_link_page_live;
  const day = d => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '';
  const STATUS_TONE = { invited:'pl-inv', active:'pl-act', paused:'pl-pau' };
  /* billed revenue (2026-10-26): read from AxisCare only when an owner asks; kept on this page, never saved */
  const REV = { data:null, busy:false, error:'' };
  const money = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:0 });
  const css = () => { if(document.getElementById('plCss')) return; const s = document.createElement('style'); s.id = 'plCss';
    s.textContent = '.pl-card{padding:16px 18px;margin-bottom:14px}.pl-k{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted)}'
      + '.pl-code{font-size:20px;font-weight:800;color:var(--navy);letter-spacing:.04em;font-variant-numeric:tabular-nums}'
      + '.pl-link{font-size:13px;word-break:break-all;background:#F4F8FB;border:1px solid var(--border);border-radius:8px;padding:6px 9px;margin:6px 0}'
      + '.pl-acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.pl-acts button{font-size:12.5px;padding:5px 11px}'
      + '.pl-pill{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;margin-left:6px}'
      + '.pl-act{background:#E7F6EC;color:#1F7A4D}.pl-amb{background:#EEE8F7;color:#5B3E8F}.pl-flag{background:#FDF3E3;color:#8A5A00;margin:2px 4px 0 0}.pl-inv{background:#FDF3E3;color:#8A5A00}.pl-pau{background:#F1F5F9;color:#64748B}'
      + '.pl-note{font-size:12.5px;background:#FFF8EC;border:1px solid #F0D9A8;border-radius:8px;padding:7px 10px;margin-top:8px}'
      + '.pl-ov{position:fixed;inset:0;background:rgba(13,54,95,.45);z-index:10000;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto}'
      + '.pl-dlg{background:#fff;border-radius:14px;max-width:560px;width:100%;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.2)}'
      + '.pl-dlg h3{margin:0 0 6px;color:var(--navy);font-size:18px}.pl-dlg label{display:block;font-size:12.5px;font-weight:700;margin:10px 0 4px}'
      + '.pl-dlg textarea,.pl-dlg select{width:100%}.pl-err{color:#B23B2E;font-size:12.5px;min-height:16px;margin-top:6px}'
      + '.pl-tiles{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:12px}'
      + '.pl-tile{background:#fff;border:1px solid var(--border);border-radius:10px;padding:10px 12px}.pl-tile b{display:block;font-size:22px;color:var(--navy);font-variant-numeric:tabular-nums}'
      + '.pl-tile span{font-size:12px;color:var(--text-muted)}.pl-tbl{width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}'
      + '.pl-tbl th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);text-align:left;padding:6px 8px;border-bottom:1px solid var(--border)}'
      + '.pl-tbl td{padding:8px;border-bottom:1px solid var(--border);vertical-align:top}.pl-row{display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--border)}'
      + '.pl-row:first-of-type{border-top:0}.pl-row .pl-main{flex:1;min-width:220px}.pl-scroll{overflow-x:auto}'
      + '@media (max-width:760px){.pl-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}';
    document.head.appendChild(s); };

  async function copy(text, what){
    try{ await navigator.clipboard.writeText(text); say((what || 'Copied') + '.'); }
    catch(e){ if(typeof ccPrompt === 'function') await ccPrompt('Copy this:', text); else prompt('Copy this:', text); }
  }

  /* ── the partner profile card ── */
  function profileCard(o){
    if(!R() || !o) return '';
    css();
    const code = R().codeOf(o), st = R().statusOf(o);
    /* a Community Ambassador who isn't approved: nothing to share, and no way around the owners' approval */
    if(R().isAmbassador(o) && o.program_status !== 'active' && o.program_status !== 'paused')
      return '<div class="card pl-card"><div class="pl-k">Community Ambassador</div><div class="field-note" style="margin-top:6px;">' + esc(R().AMB_STATUS[o.program_status] || 'Not approved') + '. Owners approve ambassadors on Referral Partners, Program. No link or QR code until then.</div></div>';
    if(!code) return '<div class="card pl-card"><div class="pl-k">Partner link</div><div class="field-note" style="margin-top:6px;">Not in the Referral Partner Program yet, so there is no link or QR code.</div>'
      + (owner() ? '<div class="pl-acts"><button class="primary" onclick="plAdd(\'' + esc(o.id) + '\')">Add to the program</button></div>' : '') + '</div>';
    const link = R().linkFor(code);
    return '<div class="card pl-card"><div class="pl-k">Partner link<span class="pl-pill ' + STATUS_TONE[st] + '">' + esc(R().STATUS[st]) + '</span></div>'
      + '<div class="pl-code" style="margin-top:6px;">' + esc(code) + '</div><div class="pl-link">' + esc(link) + '</div>'
      + '<div class="pl-acts"><button class="primary" onclick="plCopyLink(\'' + esc(o.id) + '\')">Copy link</button><button class="fb" onclick="plCopyText(\'' + esc(o.id) + '\')">Copy a message</button>'
      + '<button class="fb" onclick="plQr(\'' + esc(o.id) + '\')">QR code</button></div>'
      + (st === 'paused' ? '<div class="field-note" style="margin-top:6px;">Paused: families who use this link are saved as usual, but no partner is attached, and it goes on Sources to check.</div>' : '')
      + (!pageLive() ? '<div class="pl-note">The website page for these links comes in the next step. Until then the link doesn\'t open, so don\'t share it yet.</div>' : '')
      + (owner() ? '<div class="pl-acts" style="margin-top:10px;">' + (st === 'invited' ? '<button class="fb" onclick="plStatus(\'' + esc(o.id) + '\',\'active\')">Mark active</button>' : '')
        + (st === 'paused' ? '<button class="fb" onclick="plStatus(\'' + esc(o.id) + '\',\'active\')">Resume</button>' : '<button class="fb" onclick="plStatus(\'' + esc(o.id) + '\',\'paused\')">Pause</button>') + '</div>' : '')
      + (o.program_added_at ? '<div class="field-note" style="margin-top:6px;">In the program since ' + esc(day(o.program_added_at)) + '</div>' : '')
      + '</div>';
  }
  async function add(id){
    const o = org(id); if(!o || !owner() || R().codeOf(o)) return;
    const code = R().newCode(o.name, orgs()); if(!code){ say('Couldn\'t make a code that isn\'t already used. Tell Claude.'); return; }
    if(typeof ccConfirm === 'function' && !(await ccConfirm('Add ' + o.name + ' to the Referral Partner Program?\n\nTheir code will be ' + code + '. They start as Invited.'))) return;
    o.partner_code = code; o.program_status = 'invited'; o.program_added_at = new Date().toISOString(); o.program_added_by = actor();
    o.program_log = (o.program_log || []).concat([{ at:o.program_added_at, by:o.program_added_by, did:'added', code }]);
    await persist('referral_orgs', o); say(o.name + ' is in the program: ' + code + '.'); redraw();
  }
  async function setStatus(id, v){
    const o = org(id); if(!o || !owner() || !R().codeOf(o) || !R().STATUS[v]) return;
    const at = new Date().toISOString();
    o.program_status = v; o.program_log = (o.program_log || []).concat([{ at, by:actor(), did:v }]);
    await persist('referral_orgs', o); say(o.name + ': ' + R().STATUS[v].toLowerCase() + '.'); redraw();
  }
  const copyLink = id => { const o = org(id); if(o && R().codeOf(o)) copy(R().linkFor(R().codeOf(o)), 'Link copied'); };
  const copyText = id => { const o = org(id); if(o && R().codeOf(o)) copy(R().shareText(R().codeOf(o)), 'Message copied'); };
  function qr(id){
    const o = org(id); if(!o || !R().codeOf(o) || typeof qrcode !== 'function') return;
    css();
    const code = R().codeOf(o), link = R().linkFor(code), q = qrcode(0, 'M'); q.addData(link); q.make();
    const n = q.getModuleCount(), cell = 8, pad = 4 * cell, size = n * cell + pad * 2;
    const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.fillStyle = '#0D365F';
    for(let r = 0; r < n; r++) for(let c = 0; c < n; c++) if(q.isDark(r, c)) g.fillRect(pad + c * cell, pad + r * cell, cell, cell);
    const url = cv.toDataURL('image/png');
    const ov = document.createElement('div'); ov.className = 'pl-ov'; ov.id = 'plQrOv';
    ov.innerHTML = '<div class="pl-dlg" role="dialog" aria-modal="true"><h3>' + esc(o.name) + ' · ' + esc(code) + '</h3>'
      + '<div style="text-align:center;margin:10px 0;"><img src="' + url + '" alt="QR code for ' + esc(link) + '" style="width:240px;height:240px;image-rendering:pixelated;"></div>'
      + '<div class="pl-link">' + esc(link) + '</div>'
      + (!pageLive() ? '<div class="pl-note">The website page for these links comes in the next step. Don\'t print or share this yet.</div>' : '')
      + '<div class="pl-acts"><a class="primary pl-dl" href="' + url + '" download="partner-' + esc(code) + '-qr.png" style="text-decoration:none;padding:6px 12px;border-radius:8px;">Download</a>'
      + '<button class="secondary" onclick="document.getElementById(\'plQrOv\').remove()">Close</button></div></div>';
    document.body.appendChild(ov);
  }

  /* ── saving a lead: the source rule ── */
  /** called by saveLead with the saved lead (or null) and what the form will save. Returns nothing; may change `next`. */
  async function onSave(prev, next, o){
    if(!R() || !next) return;
    o = o || {};
    const isOwner = owner(), by = actor();
    let ch = R().sourceChange(prev, next, { owner:isOwner, by, orgs:orgs() });
    if(ch.kind === 'changed' && !ch.allowed && ch.needs_reason){
      const from = prev.referral_org_id ? ((org(prev.referral_org_id) || {}).name || prev.referral_source_name) : prev.referral_source_name;
      const why = typeof ccPrompt === 'function' ? await ccPrompt('This family\'s referral source is "' + (from || prev.source) + '". Why is it changing? (kept in its history)', '') : '';
      ch = R().sourceChange(prev, next, { owner:isOwner, by, orgs:orgs(), why:why || '' });
      if(!ch.allowed){ R().restore(next, prev); alert('The referral source was not changed (a reason is needed). Everything else on the form was saved.'); return; }
    } else if(ch.kind === 'changed' && !ch.allowed){
      R().restore(next, prev);
      alert('Only Samantha or Zachary can change a referral source that is already recorded. Everything else on the form was saved.');
      return;
    }
    if(ch.kind === 'added' && next.referral_org_id && !next.referral_via) next.referral_via = o.fromCall ? 'call' : 'manual';
    if(ch.kind === 'changed' && next.referral_org_id) next.referral_via = o.fromCall ? 'call' : 'manual';
    if(ch.history) R().pushHistory(next, ch.history);
  }

  /* ── Make this a lead: the partner the call named ── */
  function afterCallFill(prefill){
    if(!R()) return;
    const sel = document.getElementById('lead_referral_org_id'); if(!sel || sel.value) return;
    const p = prefill || {}, hit = R().partnerFromCall(orgs(), p.referral_source_name, p.phone);
    if(!hit) return;
    sel.value = String(hit.org.id);
    if(sel.value !== String(hit.org.id)) return;
    if(typeof leadRefOrgPicked === 'function') leadRefOrgPicked();
    sel.classList.add('cl-heard');
    sel.addEventListener('change', () => sel.classList.remove('cl-heard'), { once:true });
  }

  /* ── on the lead: how the partner came, and the history ── */
  function leadSourceHtml(l){
    if(!R() || !l) return '';
    const v = l.referral_via && R().VIA[l.referral_via], h = Array.isArray(l.source_history) ? l.source_history : [];
    if(!v && !h.length) return '';
    const name = x => x.referral_org_id ? ((org(x.referral_org_id) || {}).name || x.referral_source_name || 'a partner') : (x.referral_source_name || x.source || 'none');
    const HOW = { added:'set', linked:'linked to the partner', owner_change:'changed', sources_check:'credited from Sources to check' };
    return (v ? '<div class="field-note" style="margin-top:4px;">Came in by ' + esc(v) + (l.partner_code ? ' (' + esc(l.partner_code) + ')' : '') + '</div>' : '')
      + (h.length ? '<details style="margin-top:4px;"><summary class="field-note" style="cursor:pointer;">Referral source history (' + h.length + ')</summary>'
        + h.slice().reverse().map(x => '<div class="field-note" style="margin-top:3px;">' + esc(day(x.at)) + ' · ' + esc(HOW[x.how] || x.how) + ': ' + esc(name(x.from || {})) + ' → ' + esc(name(x.to || {}))
          + (x.why ? ' · "' + esc(x.why) + '"' : '') + (x.by ? ' · ' + esc(String(x.by).split('@')[0]) : '') + '</div>').join('') + '</details>' : '');
  }

  /* ── Referrers > Program (owners only) ── */
  const counted = () => (typeof leadsCounted === 'function' ? leadsCounted() : leads());
  function programHtml(){
    if(!R() || !owner()) return '';
    css();
    const rows = R().numbers(orgs(), counted()), t = R().totals(rows), items = R().checks(leads(), orgs());
    const pct = v => v == null ? 'not yet' : v + '%';
    let h = '<div class="card pl-card"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b style="font-size:15.5px;color:var(--navy);">Referral Partner Program</b>'
      + '<span class="field-note">owners only · tracking only, no rewards</span></div>';
    h += '<div class="pl-tiles" style="margin-top:10px;">'
      + [[t.partners, 'partners (' + t.active + ' not paused)'], [t.referrals, 'families referred'], [t.consultations, 'home visits'], [t.started, 'clients started'], [pct(t.conversion), 'referred who started']]
        .map(x => '<div class="pl-tile"><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>').join('') + '</div>';
    h += ambHtml();
    h += '<div class="pl-k" style="margin-top:14px;">Sources to check' + (items.length ? ' · ' + items.length : '') + '</div>'
      + (items.length ? items.map(checkRow).join('') : '<div class="field-note" style="margin:6px 0 10px;">Nothing to check. Links that come in without a partner attached show here.</div>');
    h += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px;"><span class="pl-k">Partners</span><span style="flex:1"></span>'
      + (rows.length ? '<button class="fb" style="font-size:12px;padding:4px 10px;" onclick="plRevenue()"' + (REV.busy ? ' disabled' : '') + '>' + (REV.busy ? 'Reading AxisCare…' : REV.data ? 'Read AxisCare again' : 'Get billed revenue from AxisCare') + '</button>' : '') + '</div>'
      + (REV.error ? '<div class="pl-note">' + esc(REV.error) + '</div>' : '')
      + (REV.data ? '<div class="field-note" style="margin-top:4px;">Billed revenue read from AxisCare ' + esc(new Date(REV.data.at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })) + '. An estimate: completed visits times each visit\'s charge rate, not invoices or payments.'
        + (REV.data.more_than_read ? ' ' + REV.data.more_than_read + ' more clients weren\'t read this time.' : '') + '</div>' : '');
    h += rows.length ? '<div class="pl-scroll"><table class="pl-tbl"><thead><tr><th>Partner</th><th>Status</th><th>Referred</th><th>Home visits</th><th>Started</th><th>Conversion</th><th>Billed revenue</th><th>How they came</th><th>Link</th></tr></thead><tbody>'
      + rows.map(r => '<tr><td><a href="javascript:void(0)" onclick="openRefProfile(\'' + esc(r.id) + '\')"><b>' + esc(r.name) + '</b></a>' + (r.ambassador ? ' <span class="pl-pill pl-amb">Ambassador</span>' : '') + '<div class="field-note">' + esc(r.code) + (r.last_referral ? ' · last ' + esc(day(r.last_referral)) : '') + '</div></td>'
        + '<td><span class="pl-pill ' + STATUS_TONE[r.status] + '" style="margin:0;">' + esc(R().STATUS[r.status]) + '</span></td>'
        + '<td>' + r.referrals + '</td><td>' + r.consultations + '</td><td>' + r.started + '</td><td>' + pct(r.conversion) + '</td>'
        + '<td>' + revCell(r) + '</td>'
        + '<td class="field-note">' + (Object.keys(r.ways).length ? Object.entries(r.ways).map(([k, n]) => n + ' ' + esc(k)).join(' · ') : 'none yet') + '</td>'
        + '<td><button class="fb" style="font-size:12px;padding:4px 9px;" onclick="plCopyLink(\'' + esc(r.id) + '\')">Copy</button></td></tr>').join('')
      + '</tbody></table></div>'
      : '<div class="field-note" style="margin-top:6px;">No partner is in the program yet. Open a partner and choose "Add to the program".</div>';
    h += '<div class="field-note" style="margin-top:10px;">Started = the first clock-in AxisCare showed for that family. Home visits = an assessment booked or a lead past the first call. '
      + 'Billed revenue is an estimate from AxisCare: completed visits since each referred client\'s first shift, times each visit\'s charge rate. It isn\'t invoices or what was paid, and it\'s only read when you ask. Counts are every referral credited to the partner, all time.</div></div>';
    return h;
  }
  function revCell(r){
    if(!REV.data) return '<span class="field-note">not read yet</span>';
    const p = (REV.data.partners || {})[r.id];
    if(!p) return r.started ? '<span class="field-note">no AxisCare id on the started client</span>' : '<span class="field-note">no clients started</span>';
    if(!p.read) return '<span class="field-note" style="color:#B23B2E;">couldn\'t read AxisCare</span>';
    return '<b>' + esc(money(p.billed)) + '</b> <span class="field-note">est. · ' + esc(String(p.hours)) + ' hrs</span>'
      + (p.unread ? '<div class="field-note">' + p.unread + ' client' + (p.unread === 1 ? '' : 's') + ' not read</div>' : '')
      + (p.no_rate_clients ? '<div class="field-note">some visits have no rate in AxisCare</div>' : '');
  }
  async function revenue(){
    if(!owner() || REV.busy) return;
    REV.busy = true; REV.error = ''; render();
    try{
      const { data, error } = await sb.functions.invoke('partner-revenue', { body:{} });
      if(error){ let m = ''; try{ const j = await error.context.json(); m = j && j.error; }catch(e){}
        const st = error.context && error.context.status;
        REV.error = m || (st === 404 ? 'The billed revenue reader isn\'t set up on the server yet.' : 'Couldn\'t read billed revenue just now. Try again in a minute.'); }
      else if(data && data.error) REV.error = data.error;
      else REV.data = data;
    }catch(e){ REV.error = 'Couldn\'t read billed revenue just now. Try again in a minute.'; }
    REV.busy = false; render();
  }
  /* ── Community Ambassador applications (owners only; step 2, 2026-10-26) ── */
  const AMB = { busy:false, msg:'' };
  const ambCtx = () => ({ orgs:orgs(), leads:leads(), caregivers:(typeof DATA !== 'undefined' && DATA.caregivers) || [] });
  function ambHtml(){
    const apps = R().applications(orgs()), declined = orgs().filter(o => R().isAmbassador(o) && o.program_status === 'declined').length;
    const day2 = d => d ? new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '';
    let h = '<div class="pl-k" style="margin-top:4px;">Community Ambassador applications' + (apps.length ? ' · ' + apps.length : '') + '</div>';
    if(!apps.length) return h + '<div class="field-note" style="margin:6px 0 4px;">No applications waiting. They arrive from mo-care.com/ambassadors' + (declined ? ' · ' + declined + ' declined' : '') + '.</div>';
    h += apps.map(o => { const a = o.application || {}, fl = R().ambFlags(o, ambCtx()), last = (o.info_requests || []).slice(-1)[0];
      return '<div class="pl-row"><div class="pl-main"><b>' + esc(o.name) + '</b> <span class="pl-pill ' + (o.program_status === 'info_requested' ? 'pl-inv' : 'pl-amb') + '">' + esc(R().AMB_STATUS[o.program_status]) + '</span>'
        + '<div class="field-note">' + esc([a.town, a.share && a.share.length ? 'would share with ' + a.share.join(', ').toLowerCase() : '', 'applied ' + day2(o.applied_at || o.created_at)].filter(Boolean).join(' · ')) + '</div>'
        + '<div class="field-note">' + esc([o.email, o.phone].filter(Boolean).join(' · ')) + '</div>'
        + (fl.length ? '<div>' + fl.map(f => '<span class="pl-pill pl-flag" data-flag="' + f.key + '">' + esc(f.words) + '</span>').join('') + '</div>' : '')
        + (last ? '<div class="field-note">Asked ' + esc(day2(last.at)) + ': "' + esc(last.question) + '"</div>' : '') + '</div>'
        + '<div class="pl-acts"><button class="primary" onclick="plAmbApprove(\'' + esc(o.id) + '\')">Approve</button><button class="fb" onclick="plAmbAsk(\'' + esc(o.id) + '\')">Ask a question</button><button class="fb" onclick="plAmbDecline(\'' + esc(o.id) + '\')">Decline</button></div></div>'; }).join('');
    return h + (declined ? '<div class="field-note">' + declined + ' declined (kept, not shown)</div>' : '');
  }
  /* one email through the campaign sender (the same one as partner emails): the audience and opt-out checks run there.
     Returns { ok } or { why }. Never silent: the caller shows why. */
  async function ambSend(o, mail, key){
    if(!o.email) return { why:'there is no email on their application' };
    if(typeof CAMPAIGN_ENDPOINT === 'undefined' || typeof cmpAuthHeaders !== 'function') return { why:'the email sender isn\'t available here' };
    try{
      const head = await cmpAuthHeaders(), to = [{ email:o.email, name:o.name }];
      const scr = await fetch(CAMPAIGN_ENDPOINT, { method:'POST', headers:head, body:JSON.stringify({ screen:true, tag:'referral-partner', recipients:to }) }).then(x => x.json());
      if(!scr || !scr.ok) return { why:(scr && scr.error) || 'the send check couldn\'t run' };
      if(!(scr.allowed || []).some(r => String(r.email).toLowerCase() === o.email.toLowerCase())) return { why:'the email check left them out' + ((scr.left_out || [])[0] ? ' (' + scr.left_out[0].why + ')' : '') };
      const r = await fetch(CAMPAIGN_ENDPOINT, { method:'POST', headers:head, body:JSON.stringify({ subject:mail.subject, html:mail.html, recipients:to, campaign:'ambassador:' + key, tag:'referral-partner' }) }).then(x => x.json());
      if(!((r && r.results) || []).some(x => x && x.ok)) return { why:'GoHighLevel didn\'t accept it' + (((r && r.results) || [])[0] && r.results[0].error ? ' (' + r.results[0].error + ')' : '') };
      const act = { id:uid(), org_id:o.id, kind:'email', note:o.name + ': sent "' + mail.subject + '"', email_key:'ambassador:' + key, to:o.email.toLowerCase(), at:new Date().toISOString(), by:actor() };
      DATA.referral_activities = DATA.referral_activities || []; DATA.referral_activities.push(act); await persist('referral_activities', act);
      return { ok:true };
    }catch(e){ return { why:'the email couldn\'t be sent (' + String(e.message || e).slice(0, 80) + ')' }; }
  }
  function ambDialog(title, inner, buttons){
    css();
    const ov = document.createElement('div'); ov.className = 'pl-ov'; ov.id = 'plAmbOv';
    ov.innerHTML = '<div class="pl-dlg" role="dialog" aria-modal="true" style="max-width:640px"><h3>' + esc(title) + '</h3>' + inner + '<div class="pl-err" id="plAmbErr"></div><div class="pl-acts" id="plAmbBtns"></div></div>';
    document.body.appendChild(ov);
    const box = ov.querySelector('#plAmbBtns');
    buttons.concat([['Cancel', 'secondary', () => ov.remove()]]).forEach(([label, cls, fn]) => { const b = document.createElement('button'); b.className = cls; b.textContent = label; b.onclick = () => fn(ov, b); box.appendChild(b); });
    return ov;
  }
  const preview = mail => '<div class="field-note" style="margin-top:8px;">The email ' + '(you can read it before it goes):</div><div style="border:1px solid var(--border);border-radius:10px;padding:10px 14px;margin-top:4px;max-height:280px;overflow:auto;background:#fff;"><div class="field-note"><b>Subject:</b> ' + esc(mail.subject) + '</div>' + mail.html + '</div>';
  function ambApprove(id){
    const o = org(id); if(!o || !owner()) return;
    const fl = R().ambFlags(o, ambCtx());
    const trial = JSON.parse(JSON.stringify(o)); trial.partner_code = R().codeOf(o) || 'YOURCODE';
    ambDialog('Approve ' + o.name + '?', '<div class="field-note">Approving makes their personal link and QR code and turns them on. Nothing is active before this.</div>'
      + (fl.length ? '<div class="pl-note">' + fl.map(f => esc(f.words)).join('<br>') + '</div>' : '')
      + (o.email ? preview(R().welcomeEmail(trial)).replace(/YOURCODE/g, '(their code)') : '<div class="pl-note">There\'s no email on their application, so no welcome email can go. You\'ll get their link to send another way.</div>'),
      [[o.email ? 'Approve and send the welcome email' : 'Approve', 'primary', async (ov, b) => {
        b.disabled = true;
        const r = R().approve(o, orgs(), actor());
        if(r.error){ ov.querySelector('#plAmbErr').textContent = r.error; b.disabled = false; return; }
        await persist('referral_orgs', o);
        const sent = o.email ? await ambSend(o, R().welcomeEmail(o), 'welcome') : { why:'there is no email on their application' };
        if(!sent.ok){ o.welcome_problem = { at:new Date().toISOString(), why:sent.why }; await persist('referral_orgs', o); }
        else { o.welcome_sent_at = new Date().toISOString(); delete o.welcome_problem; await persist('referral_orgs', o); }
        ov.remove();
        if(sent.ok) say(o.name + ' is approved (' + o.partner_code + ') and the welcome email went.');
        else alert(o.name + ' is approved and their link is on (' + R().linkFor(o.partner_code) + '), but the welcome email didn\'t go: ' + sent.why + '. Send them the link another way.');
        redraw();
      }]]);
  }
  function ambAsk(id){
    const o = org(id); if(!o || !owner()) return;
    const ov = ambDialog('Ask ' + o.name + ' a question', '<label for="plAmbQ">Your question (it goes in the email)</label><textarea id="plAmbQ" rows="3" placeholder="For example: which church group would you share with?"></textarea>'
      + (o.email ? '' : '<div class="pl-note">There\'s no email on their application. Call them at ' + esc(o.phone || 'the number they gave') + ' instead; this records that you asked.</div>'),
      [[o.email ? 'Send the question' : 'Record that I asked', 'primary', async (ov2, b) => {
        const q = ov2.querySelector('#plAmbQ').value, r = R().requestInfo(o, q, actor());
        if(r.error){ ov2.querySelector('#plAmbErr').textContent = r.error; return; }
        b.disabled = true;
        const sent = o.email ? await ambSend(o, R().infoEmail(o, q.trim()), 'question') : { ok:true };
        if(!sent.ok){ o.info_requests.pop(); o.program_status = 'applied'; ov2.querySelector('#plAmbErr').textContent = 'Not sent: ' + sent.why + '. Nothing was changed.'; b.disabled = false; return; }
        await persist('referral_orgs', o); ov2.remove(); say(o.email ? 'Question sent to ' + o.name + '.' : 'Recorded.'); redraw();
      }]]);
    return ov;
  }
  function ambDecline(id){
    const o = org(id); if(!o || !owner()) return;
    ambDialog('Decline ' + o.name + '?', '<label for="plAmbWhy">Reason (only owners see it)</label><textarea id="plAmbWhy" rows="2"></textarea>'
      + (o.email ? '<label style="display:flex;gap:8px;align-items:center;font-weight:400;"><input type="checkbox" id="plAmbNote" style="width:auto;margin:0;"> Email them a kind note</label>' + preview(R().declineEmail(o)) : ''),
      [['Decline', 'primary', async (ov, b) => {
        const r = R().decline(o, ov.querySelector('#plAmbWhy').value, actor());
        if(r.error){ ov.querySelector('#plAmbErr').textContent = r.error; return; }
        b.disabled = true; await persist('referral_orgs', o);
        let note = '';
        if(o.email && ov.querySelector('#plAmbNote') && ov.querySelector('#plAmbNote').checked){ const sent = await ambSend(o, R().declineEmail(o), 'declined'); note = sent.ok ? ' The note went.' : ' The note didn\'t go: ' + sent.why + '.'; }
        ov.remove(); say('Declined.' + note); redraw();
      }]]);
  }
  function checkRow(it){
    const l = leads().find(x => String(x.id) === it.lead_id) || {}, tgt = leads().find(x => String(x.id) === it.target_id) || l;
    const who = ((tgt.client_first_name || tgt.first_name || '') + ' ' + (tgt.client_last_name || tgt.last_name || '')).trim() || 'A family';
    const KIND = { known_family:'May already be known', paused:'Paused partner', unknown:'Unknown code', ambiguous:'Code on two partners' };
    return '<div class="pl-row"><div class="pl-main"><b>' + esc(who) + '</b> <span class="pl-pill pl-inv">' + esc(KIND[it.kind]) + '</span>'
      + '<div class="field-note">' + esc(it.why) + ' Code ' + esc(it.code) + (it.org_name ? ' (' + esc(it.org_name) + ')' : '') + ' · ' + esc(day(it.at)) + (it.folded ? ' · folded into the family\'s record' : '') + '</div>'
      + '<div class="field-note">Source now: ' + esc(tgt.referral_org_id ? ((org(tgt.referral_org_id) || {}).name || tgt.referral_source_name) : (tgt.referral_source_name || tgt.source || 'none')) + '</div></div>'
      + '<div class="pl-acts"><button class="fb" onclick="plOpenLead(\'' + esc(it.target_id) + '\')">Open</button><button class="primary" onclick="plDecide(\'' + esc(it.id) + '\')">Decide</button></div></div>';
  }
  function decide(itemId){
    const it = R().checks(leads(), orgs()).find(x => x.id === itemId); if(!it || !owner()) return;
    css();
    const tgt = leads().find(x => String(x.id) === it.target_id) || {}, has = R().established(tgt), src = leads().find(x => String(x.id) === it.lead_id) || tgt;
    const nowSrc = tgt.referral_org_id ? ((org(tgt.referral_org_id) || {}).name || tgt.referral_source_name) : (tgt.referral_source_name || '');
    const choices = orgs().filter(R().pickable).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const ov = document.createElement('div'); ov.className = 'pl-ov'; ov.id = 'plDecOv';
    ov.innerHTML = '<div class="pl-dlg" role="dialog" aria-modal="true"><h3>Decide the referral source</h3><div class="field-note">' + esc(it.why) + '</div>'
      + '<div class="pl-note">' + (has ? 'This family\'s referral source now: <b>' + esc(nowSrc) + '</b>. Crediting replaces it; the old one stays in the history.' : 'This family has no referral source recorded yet.') + '</div>'
      + (it.kind === 'known_family' && typeof ckFind === 'function' ? '<div class="pl-acts"><button class="fb" id="plDecAx">Check AxisCare again</button></div><div class="field-note" id="plDecAxOut" style="margin-top:4px;"></div>' : '')
      + '<label for="plDecOrg">Partner to credit</label><select id="plDecOrg"><option value="">Pick a partner…</option>'
      + choices.map(o => '<option value="' + esc(o.id) + '"' + (String(o.id) === it.org_id ? ' selected' : '') + '>' + esc(o.name) + (R().codeOf(o) ? ' (' + esc(R().codeOf(o)) + ')' : '') + '</option>').join('') + '</select>'
      + '<label for="plDecWhy">Reason <span style="color:#B23B2E;">(needed to credit)</span></label><textarea id="plDecWhy" rows="2" placeholder="What you checked"></textarea>'
      + '<div class="pl-err" id="plDecErr"></div><div class="pl-acts"><button class="primary" id="plDecCredit">Credit the partner</button><button class="fb" id="plDecKeep">Keep the current source</button>'
      + '<button class="secondary" onclick="document.getElementById(\'plDecOv\').remove()">Cancel</button></div></div>';
    document.body.appendChild(ov);
    const go = async decision => {
      const r = R().resolve(it, decision, leads(), orgs(), { owner:owner(), by:actor(), why:ov.querySelector('#plDecWhy').value, org_id:ov.querySelector('#plDecOrg').value });
      if(r.error){ ov.querySelector('#plDecErr').textContent = r.error; return; }
      for(const l of r.changes) await persist('leads', l);
      ov.remove(); say(decision === 'keep' ? 'Kept the current source.' : 'Credited to the partner.'); redraw();
    };
    ov.querySelector('#plDecCredit').onclick = () => go('credit');
    /* read only: the same live AxisCare and Family Circle lookup the "is this the same family?" check uses; changes nothing */
    const axb = ov.querySelector('#plDecAx');
    if(axb) axb.onclick = async () => {
      const out = ov.querySelector('#plDecAxOut'); axb.disabled = true; out.textContent = 'Checking AxisCare…';
      const q = ckQuery({ phones:[src.phone, src.client_phone], first:src.client_first_name || src.first_name, last:src.client_last_name || src.last_name, dob:src.client_dob, email:src.email });
      const f = await ckFind(q, src.id, true);
      const known = (f.leads || []).map(h => 'an earlier inquiry for ' + (((h.lead.client_first_name || h.lead.first_name || '') + ' ' + (h.lead.client_last_name || h.lead.last_name || '')).trim() || 'this family'))
        .concat((f.clients || []).map(m => (m.active === true ? 'current' : m.active === false ? 'former' : 'Family Circle') + ' client ' + m.name));
      out.innerHTML = (f.note ? esc(f.note) + ' ' : '') + (known.length ? '<b>Found:</b> ' + esc(known.join('; ')) + '. This may be a family we already know.' : (f.note ? '' : '<b>No match</b> in AxisCare, the Family Circles or earlier inquiries: this looks like a new family.'))
        + ' <span class="field-note">(checked ' + esc(new Date().toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })) + '; nothing was changed)</span>';
      axb.disabled = false;
    };
    ov.querySelector('#plDecKeep').onclick = () => go('keep');
  }
  function openLead(id){ if(typeof openLeadProfile === 'function') openLeadProfile(id); else if(typeof openLeadModal === 'function') openLeadModal(id); }
  function render(){ const box = document.getElementById('plProgram'); if(box) box.innerHTML = programHtml(); }
  function redraw(){ render(); try{ if(typeof REF_PROF !== 'undefined' && REF_PROF && typeof renderRefProfile === 'function') renderRefProfile(); }catch(e){} }

  window.PartnerLinks = { profileCard, onSave, afterCallFill, leadSourceHtml, programHtml, render, add, setStatus, qr, decide, revenue, _rev:REV, ambApprove, ambAsk, ambDecline, ambSend };
  window.plAmbApprove = ambApprove; window.plAmbAsk = ambAsk; window.plAmbDecline = ambDecline;
  window.plRevenue = revenue; window.plAdd = add; window.plStatus = setStatus; window.plCopyLink = copyLink; window.plCopyText = copyText; window.plQr = qr; window.plDecide = decide; window.plOpenLead = openLead;
})();
