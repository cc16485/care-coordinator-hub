/* =====================================================================================================================
   DRIVER COMPLIANCE, the office half (Samantha 2026-10-13, her 7-point ask; spec launch/review/driver-compliance-spec.md).
   One card on a person's page: the caregiver page's Checks tab and the applicant page's Hiring tab, plus one line in the
   caregiver Overview's "Anything in the way of scheduling?" when they are not an Approved Driver.
   Everything comes from the server function driver-compliance (staff sign-in; the server decides who may do what and this
   page shows the server's own refusal words). Documents open only through the server's logged open (a five-minute link,
   every open written to the access log with your name); no storage address is ever drawn on the page.
     DRV.mount(el, key)       key = { caregiver_id, axiscare_id } | { offer_id } | { applicant_id } (resolved to its offer)
     DRV.gate(el, key)        the one Overview line (empty for an Approved Driver)
   Every action reads the record again and redraws. One card, never stacked layers (her rule).
   ===================================================================================================================== */
(function(){
  'use strict';
  const FN = 'driver-compliance';
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const STATUS = {
    non_driver: ['Non-Driver', '#3A342C', '#F4F2ED'],
    pending:    ['Pending Verification', '#92400E', '#FEF3C7'],
    approved:   ['Approved Driver', '#15803D', '#DCFCE7'],
    suspended:  ['Suspended', '#B91C1C', '#FEE2E2'],
    none:       ['Not set up yet', '#6E6559', '#F4F2ED'],
  };
  const DOC_LABEL = { license_front:'License, front', license_back:'License, back', insurance:'Insurance card or declarations page', mvr:'Driving record (MVR)', other:'Other document', agreement:'Signed agreement' };
  const EVENT_WORD = { created:'Set up', agreement_signed:'Agreement signed', doc_uploaded:'Document uploaded', verified:'Verified', approved:'Approved to drive',
    suspended:'Suspended', non_driver:'Marked Non-Driver', driver_requested:'Asked to drive', reminder_sent:'Reminder sent', reminder_held:'Reminder held',
    reminder_refused:'Reminder not sent', expired:'Expired', note:'Note', link_sent:'Secure link sent' };
  const VERIFY_WORD = { license:'license', insurance:'insurance', coverage:'coverage for transporting clients', mvr:'driving record' };
  const central = iso => { try{ return new Date(iso).toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' }); }catch(_){ return String(iso || ''); } };
  const day = d => { if(!d) return ''; try{ return new Date(String(d).slice(0,10) + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); }catch(_){ return String(d); } };
  const todayCentral = () => { try{ return new Date().toLocaleDateString('en-CA', { timeZone:'America/Chicago' }); }catch(_){ return new Date().toISOString().slice(0,10); } };
  function daysLeft(d){
    if(!d) return null;
    const a = Date.parse(String(d).slice(0,10) + 'T12:00:00Z'), b = Date.parse(todayCentral() + 'T12:00:00Z');
    return isNaN(a) ? null : Math.round((a - b) / 864e5);
  }
  function leftWords(n){
    if(n == null) return '';
    if(n < 0) return '<b style="color:#B91C1C">expired ' + (-n) + ' day' + (n === -1 ? '' : 's') + ' ago</b>';
    if(n === 0) return '<b style="color:#B91C1C">expires today</b>';
    const c = n <= 7 ? '#B91C1C' : n <= 30 ? '#B45309' : '#6E6559';
    return '<span style="color:' + c + ';font-weight:' + (n <= 30 ? 700 : 400) + '">' + n + ' day' + (n === 1 ? '' : 's') + ' left</span>';
  }
  const keyStr = k => JSON.stringify(k || {});
  const idOf = k => { const o = {}; ['caregiver_id','axiscare_id','offer_id'].forEach(x => { if(k && k[x] != null && k[x] !== '') o[x] = String(k[x]); }); return o; };

  /* the server, through the Hub's own sign-in. Answers { ok, status, data, error } and never throws. */
  async function call(body){
    try{
      const r = await sb.functions.invoke(FN, { body });
      if(r.error){
        let j = null; try{ if(r.error.context && typeof r.error.context.json === 'function') j = await r.error.context.json(); }catch(_){}
        const status = (r.error.context && r.error.context.status) || 0;
        return { ok:false, status, data:j || {}, error:(j && j.error) || r.error.message || 'The driver compliance server did not answer.' };
      }
      if(!r.data || r.data.error) return { ok:false, status:200, data:r.data || {}, error:(r.data && r.data.error) || 'The driver compliance server did not answer.' };
      return { ok:true, status:200, data:r.data, error:'' };
    }catch(e){ return { ok:false, status:0, data:{}, error:'Could not reach the driver compliance server: ' + ((e && e.message) || 'no answer') }; }
  }

  /* an applicant's page knows the application, not the offer: the main profile's own read names the offer (and the Hub record) */
  const RESOLVED = {};
  async function resolve(k){
    if(!k || !k.applicant_id) return idOf(k);
    const ks = String(k.applicant_id);
    if(RESOLVED[ks]) return RESOLVED[ks];
    try{
      const r = await sb.functions.invoke('hire-profile', { body:{ action:'get', applicant_id:k.applicant_id } });
      const ids = (r && r.data && r.data.ids) || {};
      const o = {}; if(ids.offer_id) o.offer_id = String(ids.offer_id); if(ids.caregiver_id != null) o.caregiver_id = String(ids.caregiver_id);
      if(Object.keys(o).length) RESOLVED[ks] = o;
      return o;
    }catch(_){ return {}; }
  }

  /* one read per person, shared by the card and the Overview line */
  const CACHE = {};
  function read(ids, force){
    const ks = keyStr(ids);
    if(!force && CACHE[ks] && Date.now() - CACHE[ks].at < 60000) return CACHE[ks].p;
    const p = call(Object.assign({ action:'get' }, ids));
    CACHE[ks] = { at:Date.now(), p };
    return p;
  }
  function drop(ids){ delete CACHE[keyStr(ids)]; }

  /* ---- the card -------------------------------------------------------------------------------------------------- */
  const CARDS = {};   /* number -> { el, ids, k, form, msg, blockers, data }; a number is never reused, so a drawn button always finds its own card */
  let N = 0;
  function cardFor(el){ for(const n of Object.keys(CARDS)){ if(!CARDS[n].el.isConnected) delete CARDS[n]; } return Object.values(CARDS).find(c => c.el === el) || null; }
  function cardIdx(c){ return c.n; }
  async function mount(el, k, opt){
    if(!el) return;
    el.innerHTML = '<div class="field-note">Reading their driver record…</div>';
    const ids = await resolve(k);
    let c = cardFor(el);
    if(!c){ c = { el, n:++N }; CARDS[c.n] = c; }
    Object.assign(c, { k, ids, form:null, msg:'', msgOk:false, blockers:null, roster:(opt && opt.roster) || c.roster || null });
    if(!Object.keys(ids).length){ el.innerHTML = '<div class="field-note">No offer or Hub record is connected to this person yet, so there is no driver record to show.</div>'; return; }
    await load(c);
  }
  async function load(c, force){
    const r = await read(c.ids, force);
    if(!c.el.isConnected) return;
    c.data = r; draw(c);
  }
  function pill(st){ const s = STATUS[st] || STATUS.none; return '<span class="tag-chip" style="background:' + s[2] + ';color:' + s[1] + ';font-weight:800">' + esc(s[0]) + '</span>'; }
  const kv = (k, v) => '<div style="display:flex;gap:8px;font-size:13.5px;padding:3px 0;border-bottom:1px dashed #EEE9DF"><span class="field-note" style="min-width:150px;flex:none">' + k + '</span><span style="min-width:0;flex:1">' + v + '</span></div>';
  const by = (at, who) => at ? '<span style="color:#15803D;font-weight:700">Verified</span> <span class="field-note">' + esc(day(at)) + (who ? ' by ' + esc(who) : '') + '</span>' : '<span style="color:#B45309;font-weight:700">Not verified</span>';
  function docBtns(c, docs, kinds){
    const list = (docs || []).filter(d => kinds.includes(d.kind) && !d.superseded_at);
    if(!list.length) return '<span class="field-note">none on file</span>';
    const i = cardIdx(c);
    return list.map(d => '<button type="button" class="ibtn" style="margin:0 4px 4px 0" data-doc="' + esc(d.id) + '" onclick="DRV.open(' + i + ',\'' + esc(d.id) + '\',this)">Open ' + esc((DOC_LABEL[d.kind] || d.kind).replace(/^License, /, '').replace(/^[A-Z](?=[a-z])/, (m) => m.toLowerCase())) + '</button>'
      + '<span class="field-note" style="margin-right:8px">' + (d.uploaded_at ? esc(day(d.uploaded_at)) : '') + (d.uploaded_by ? ' · ' + esc(d.uploaded_by === 'caregiver' ? 'from the caregiver' : d.uploaded_by) : '') + '</span>').join('');
  }
  function draw(c){
    const el = c.el, r = c.data || {}, i = cardIdx(c);
    if(!r.ok){
      el.innerHTML = '<div style="color:#B91C1C;font-size:13.5px">Could not read the driver record: ' + esc(r.error) + '</div>'
        + '<button type="button" class="ibtn" style="margin-top:6px" onclick="DRV.reload(' + i + ')">Try again</button>';
      return;
    }
    const p = r.data || {}, row = p.row || null, docs = p.docs || [], ev = p.events || [], d = p.derived || {};
    let h = '';
    if(!row){
      /* Existing drivers today: nothing is assumed. Office-typed roster dates are shown as just that. */
      const g = c.roster || {};
      h += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px">' + pill('none') + '<span class="field-note">No driver compliance record yet. Nobody is treated as a driver until one is set up and approved.</span></div>';
      if(g.dl_expires || g.auto_ins_expires) h += '<div class="field-note" style="margin:4px 0 8px">On the roster, typed by the office and not verified here: '
        + [g.dl_expires ? 'license expires ' + esc(day(g.dl_expires)) : '', g.auto_ins_expires ? 'insurance expires ' + esc(day(g.auto_ins_expires)) : ''].filter(Boolean).join(', ') + '.</div>';
      h += '<button type="button" class="ibtn ibtn-strong" onclick="DRV.act(' + i + ',\'setup\',this)">Set up driver compliance</button>';
      h += msgHtml(c);
      el.innerHTML = h; return;
    }
    const st = row.status || 'none';
    h += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:4px">' + pill(st)
      + (row.status_reason ? '<span style="font-size:13px">' + esc(row.status_reason) + '</span>' : '')
      + (row.status_at ? '<span class="field-note">since ' + esc(central(row.status_at)) + '</span>' : '') + '</div>';
    if(st !== 'approved') h += '<div class="field-note" style="margin-bottom:6px">Not eligible for shifts that include transporting a client.' + (st === 'non_driver' ? ' They may work every non-driving assignment.' : '') + '</div>';
    /* the record */
    const agreeWord = row.agreement_form === 'non_driver' ? 'Non-Driver Agreement' : row.agreement_form === 'vehicle' ? 'Driver/Vehicle Insurance & Transportation Standards Agreement' : '';
    const agreeDoc = docs.find(x => x.kind === 'agreement');
    h += kv('Signed agreement', row.agreement_signed_at
      ? esc(agreeWord) + ' <span class="field-note">signed ' + esc(central(row.agreement_signed_at)) + (row.agreement_version ? ', version ' + esc(row.agreement_version) : '') + '</span> '
        + '<button type="button" class="ibtn" onclick="DRV.open(' + i + ',\'' + esc(agreeDoc ? agreeDoc.id : 'agreement') + '\',this)">Open the signed agreement</button>'
      : '<span style="color:#B45309;font-weight:700">Not signed yet</span>');
    if(st !== 'non_driver' || row.license_expires || row.insurance_expires || docs.some(x => x.kind !== 'agreement')){
      h += kv('Driver\'s license', docBtns(c, docs, ['license_front','license_back']));
      h += kv('License expires', row.license_expires ? esc(day(row.license_expires)) + ' · ' + leftWords(daysLeft(row.license_expires)) + (row.license_state ? ' <span class="field-note">(' + esc(row.license_state) + ')</span>' : '') + '<br>' + by(row.license_verified_at, row.license_verified_by) : '<span class="field-note">not given</span>');
      h += kv('Auto insurance', docBtns(c, docs, ['insurance']));
      h += kv('Insurance expires', row.insurance_expires ? esc(day(row.insurance_expires)) + ' · ' + leftWords(daysLeft(row.insurance_expires)) + '<br>' + by(row.insurance_verified_at, row.insurance_verified_by) : '<span class="field-note">not given</span>');
      h += kv('Insurer', row.insurer ? esc(row.insurer) : '<span class="field-note">not given</span>');
      h += kv('Coverage for transporting clients', by(row.coverage_verified_at, row.coverage_verified_by) + (row.coverage_note ? ' <span class="field-note">· ' + esc(row.coverage_note) + '</span>' : ''));
      h += kv('Driving record', (row.mvr_verified_at ? (row.mvr_result ? '<b>' + esc(mvrWord(row.mvr_result)) + '</b> · ' : '') + by(row.mvr_verified_at, row.mvr_verified_by) : '<span style="color:#B45309;font-weight:700">Not checked yet</span>')
        + (docs.some(x => x.kind === 'mvr' && !x.superseded_at) ? '<div style="margin-top:4px">' + docBtns(c, docs, ['mvr']) + '</div>' : ''));
      const other = docs.filter(x => x.kind === 'other' && !x.superseded_at);
      if(other.length) h += kv('Other documents', docBtns(c, docs, ['other']));
    }
    h += kv('Approved to drive', row.approved_at ? esc(central(row.approved_at)) + (row.approved_by ? ' by <b>' + esc(row.approved_by) + '</b>' : '') : '<span class="field-note">not approved</span>');
    /* missing and renewals, from the server's own reading */
    const miss = d.missing || [], ren = d.renewals || [];
    if(miss.length) h += '<div style="margin-top:8px;background:#FFF7ED;border:1px solid #FCD9A8;border-radius:8px;padding:6px 10px;font-size:13px"><b>Missing:</b> ' + miss.map(x => esc(typeof x === 'string' ? x : (x.what || x.label || ''))).join('; ') + '</div>';
    if(ren.length) h += '<div style="margin-top:6px;font-size:13px"><b>Upcoming renewals:</b> ' + ren.map(x => esc(x.what || '') + ' ' + esc(day(x.expires)) + ' (' + leftWords(x.days_left != null ? Number(x.days_left) : daysLeft(x.expires)) + ')').join('; ') + '</div>';
    /* actions */
    const b = (act, label, strong) => '<button type="button" class="ibtn' + (strong ? ' ibtn-strong' : '') + '" style="margin:0 6px 6px 0" onclick="DRV.form(' + i + ',\'' + act + '\')">' + label + '</button>';
    h += '<div style="margin-top:10px;padding-top:8px;border-top:1px solid #EEE9DF">'
      + b('verify:license', 'Verify license') + b('verify:insurance', 'Verify insurance') + b('verify:coverage', 'Verify coverage') + b('verify:mvr', 'Verify driving record')
      + (st !== 'approved' ? b('approve', 'Approve driver', true) : '')
      + (st !== 'suspended' && st !== 'non_driver' ? b('suspend', 'Suspend') : '')
      + (st !== 'non_driver' ? b('non_driver', 'Mark Non-Driver') : '')
      + b('send_link', 'Send the caregiver their secure link') + '</div>';
    if(st !== 'approved' && d.can_approve === false && (d.approve_blockers || []).length && c.form !== 'approve')
      h += '<div class="field-note" style="margin-top:2px">Before approval: ' + d.approve_blockers.map(esc).join('; ') + '.</div>';
    h += formHtml(c, row, d);
    h += msgHtml(c);
    /* the full history, collapsed */
    h += '<details style="margin-top:10px"><summary style="cursor:pointer;font-size:13px;font-weight:700;color:var(--navy,#0D365F)">Full history (' + ev.length + ')</summary>'
      + (ev.length ? '<table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-top:6px"><tbody>' + ev.slice().sort((a, z) => String(z.at).localeCompare(String(a.at))).map(x =>
          '<tr style="border-bottom:1px solid #F4F2ED"><td style="padding:3px 6px;white-space:nowrap;color:#6E6559;vertical-align:top">' + esc(central(x.at)) + '</td>'
          + '<td style="padding:3px 6px;vertical-align:top;font-weight:700">' + esc(EVENT_WORD[x.kind] || x.kind) + '</td>'
          + '<td style="padding:3px 6px;vertical-align:top">' + esc(eventDetail(x)) + '</td>'
          + '<td style="padding:3px 6px;vertical-align:top;color:#6E6559;white-space:nowrap">' + esc(x.by_name || '') + '</td></tr>').join('') + '</tbody></table>'
        : '<div class="field-note" style="margin-top:4px">Nothing yet.</div>') + '</details>';
    el.innerHTML = h;
  }
  function mvrWord(v){ return v === 'acceptable' ? 'Acceptable' : v === 'not_acceptable' ? 'Not acceptable' : String(v || ''); }
  function eventDetail(x){
    const d = x.detail || {};
    if(typeof d === 'string') return d;
    const parts = [];
    if(d.what) parts.push(VERIFY_WORD[d.what] || d.what);
    if(d.kind) parts.push(DOC_LABEL[d.kind] || d.kind);
    if(d.form) parts.push(d.form === 'non_driver' ? 'Non-Driver Agreement' : d.form === 'vehicle' ? 'Driver/Vehicle Agreement' : d.form);
    if(d.expires) parts.push('expires ' + day(d.expires));
    if(d.result) parts.push(mvrWord(d.result));
    if(d.reason) parts.push(d.reason);
    if(d.note) parts.push(d.note);
    if(d.why) parts.push(d.why);
    if(d.words) parts.push(d.words);
    return parts.join(' · ');
  }
  function msgHtml(c){
    if(!c.msg && !(c.blockers && c.blockers.length)) return '';
    const col = c.msgOk ? '#15803D' : '#B91C1C', bg = c.msgOk ? '#F0F7F4' : '#FEF2F2';
    return '<div class="drv-msg" style="margin-top:8px;background:' + bg + ';color:' + col + ';border-radius:8px;padding:7px 10px;font-size:13px">' + esc(c.msg)
      + (c.blockers && c.blockers.length ? '<ul style="margin:4px 0 0 18px;padding:0">' + c.blockers.map(x => '<li>' + esc(typeof x === 'string' ? x : (x.what || x.label || JSON.stringify(x))) + '</li>').join('') + '</ul>' : '') + '</div>';
  }
  const inp = 'style="font:inherit;font-size:13px;padding:5px 8px;border:1px solid var(--border,#e4e1d8);border-radius:6px;width:100%;box-sizing:border-box"';
  function formHtml(c, row, d){
    if(!c.form) return '';
    const i = cardIdx(c), f = c.form;
    const box = (title, inner, go, goLabel) => '<div class="drv-form" style="margin-top:8px;background:#FAF9F6;border:1px solid var(--border,#e4e1d8);border-radius:10px;padding:10px 12px">'
      + '<div style="font-weight:800;color:var(--navy,#0D365F);font-size:13.5px;margin-bottom:6px">' + title + '</div>' + inner
      + '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="ibtn ibtn-strong" id="drvGo' + i + '" onclick="' + go + '">' + goLabel + '</button><button type="button" class="ibtn" onclick="DRV.form(' + i + ',\'\')">Cancel</button></div></div>';
    const lab = t => '<label style="display:block;font-size:12px;font-weight:700;color:#6E6559;margin:6px 0 2px">' + t + '</label>';
    if(f.indexOf('verify:') === 0){
      const what = f.slice(7);
      let inner = '';
      if(what === 'license') inner += lab('License expiration date (as printed on the card)') + '<input type="date" id="drvExp' + i + '" ' + inp + ' value="' + esc(row.license_expires || '') + '">';
      if(what === 'insurance') inner += lab('Policy expiration date') + '<input type="date" id="drvExp' + i + '" ' + inp + ' value="' + esc(row.insurance_expires || '') + '">';
      if(what === 'mvr'){
        inner += lab('Result') + '<select id="drvRes' + i + '" ' + inp + '><option value="">Choose…</option><option value="acceptable">Acceptable</option><option value="not_acceptable">Not acceptable</option></select>';
        inner += lab('The driving record itself (optional): a PDF or photo, kept private') + '<input type="file" id="drvFile' + i + '" accept="image/*,application/pdf" style="font-size:13px">';
      }
      inner += lab(what === 'coverage' ? 'What you checked (the policy allows transporting clients during paid caregiving, limits)' : 'Note (optional)') + '<textarea id="drvNote' + i + '" rows="2" ' + inp + '></textarea>';
      return box('Verify ' + esc(VERIFY_WORD[what]), inner, 'DRV.verify(' + i + ',\'' + what + '\',this)', 'Record as verified');
    }
    if(f === 'approve'){
      const bl = d.approve_blockers || [];
      const inner = (d.can_approve === false && bl.length
        ? '<div style="color:#B91C1C;font-size:13px"><b>Not ready to approve.</b> The server lists:</div><ul style="margin:4px 0 0 18px;padding:0;font-size:13px">' + bl.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>'
        : '<div style="font-size:13px">Approve <b>' + esc(row.name || 'this caregiver') + '</b> to drive clients? Only the people on the Approve drivers list may do this; the server checks.</div>');
      return box('Approve driver', inner, 'DRV.act(' + i + ',\'approve\',this)', 'Approve driver');
    }
    if(f === 'suspend') return box('Suspend driving', lab('Reason (required)') + '<textarea id="drvNote' + i + '" rows="2" ' + inp + ' placeholder="e.g. license suspended, insurance lapsed"></textarea>', 'DRV.act(' + i + ',\'suspend\',this)', 'Suspend');
    if(f === 'non_driver') return box('Mark Non-Driver', lab('Reason (required)') + '<textarea id="drvNote' + i + '" rows="2" ' + inp + ' placeholder="e.g. they told us they no longer drive"></textarea>', 'DRV.act(' + i + ',\'non_driver\',this)', 'Mark Non-Driver');
    if(f === 'send_link') return box('Send the caregiver their secure link',
      lab('Why') + '<select id="drvWhy' + i + '" ' + inp + '><option value="renewal">A renewal: new license or insurance</option><option value="driver_change">They want to change to driving (or back)</option><option value="missing">Something is missing</option><option value="other">Something else</option></select>'
      + lab('Words for the office record (optional)') + '<input type="text" id="drvNote' + i + '" ' + inp + '>'
      + '<div class="field-note" style="margin-top:6px">One text and one email with their private link, inside sending hours, to their own number and email. Opt-outs are respected.</div>',
      'DRV.act(' + i + ',\'send_link\',this)', 'Send the link');
    return '';
  }
  function cardAt(i){ const c = CARDS[i]; return c && c.el.isConnected ? c : null; }
  function setForm(i, f){ const c = cardAt(i); if(!c) return; c.form = f || null; c.msg = ''; c.blockers = null; draw(c); }
  const val = id => { const e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; };
  async function after(c, r, okWords){
    if(r.ok){ c.form = null; c.msg = okWords; c.msgOk = true; c.blockers = null; }
    else { c.msg = r.error; c.msgOk = false; const bl = r.data && (r.data.approve_blockers || r.data.blockers || r.data.missing); c.blockers = Array.isArray(bl) ? bl : null; }
    drop(c.ids); await load(c, true);
    refreshGates(c.ids);
  }
  function busy(btn, on){ if(btn){ btn.disabled = on; if(on){ btn.dataset.t = btn.textContent; btn.textContent = 'Working…'; } else if(btn.dataset.t) btn.textContent = btn.dataset.t; } }
  async function act(i, action, btn){
    const c = cardAt(i); if(!c) return;
    const body = Object.assign({ action }, c.ids, { key:c.ids });
    const row = (c.data && c.data.data && c.data.data.row) || null; if(row && row.id) body.dc_id = row.id;
    if(action === 'suspend' || action === 'non_driver'){
      const reason = val('drvNote' + i);
      if(!reason){ c.msg = 'Please give the reason.'; c.msgOk = false; draw(c); return; }
      body.reason = reason;
    }
    if(action === 'send_link'){
      body.why = val('drvWhy' + i) || 'other'; const n = val('drvNote' + i); if(n) body.note = n;
      if(!confirm('Send ' + ((row && row.name) || 'the caregiver') + ' their secure driver link now, by text and email?')) return;
    }
    busy(btn, true);
    const r = await call(body);
    busy(btn, false);
    const words = { setup:'Set up. Nothing is assumed: they show as Pending until documents are verified and approved, or Non-Driver once they sign that agreement.', approve:'Approved to drive clients.', suspend:'Driving suspended.', non_driver:'Marked Non-Driver.', send_link:'Sent. It shows in the history.' }[action] || 'Done.';
    await after(c, r, (r.ok && r.data && r.data.message) || words);
  }
  /* verify: an optional staff upload of the proof first (MVR), through the server's signed upload, then the stamp */
  async function verify(i, what, btn){
    const c = cardAt(i); if(!c) return;
    const row = (c.data && c.data.data && c.data.data.row) || null;
    const body = Object.assign({ action:'verify', what }, c.ids, { key:c.ids }); if(row && row.id) body.dc_id = row.id;
    const exp = val('drvExp' + i), note = val('drvNote' + i), res = val('drvRes' + i);
    if((what === 'license' || what === 'insurance') && !exp){ c.msg = 'Please enter the expiration date you checked.'; c.msgOk = false; draw(c); return; }
    if(what === 'mvr' && !res){ c.msg = 'Please choose the driving record result.'; c.msgOk = false; draw(c); return; }
    if(exp) body.expires = exp; if(note) body.note = note; if(res) body.result = res;
    const fileEl = document.getElementById('drvFile' + i), file = fileEl && fileEl.files && fileEl.files[0];
    busy(btn, true);
    if(file){
      const up = await uploadProof(c, 'mvr', file);
      if(!up.ok){ busy(btn, false); c.msg = up.error; c.msgOk = false; c.blockers = null; draw(c); return; }
    }
    const r = await call(body);
    busy(btn, false);
    await after(c, r, 'The ' + VERIFY_WORD[what] + ' is recorded as verified, with your name and the time.');
  }
  async function uploadProof(c, kind, file){
    if(file.size > 15 * 1024 * 1024) return { ok:false, error:'That file is over 15 MB. Please choose a smaller one.' };
    const ext = (String(file.name || '').split('.').pop() || '').toLowerCase();
    const u = await call(Object.assign({ action:'upload_url', kind, content_type:file.type || '', ext }, c.ids, { key:c.ids }));
    if(!u.ok) return { ok:false, error:u.error };
    const url = u.data.signed_url || u.data.url || u.data.signedUrl;
    if(!url || !u.data.path) return { ok:false, error:'The upload could not start: the server gave no upload address.' };
    try{
      const put = await fetch(url, { method:'PUT', headers:{ 'Content-Type':file.type || 'application/octet-stream', 'x-upsert':'false' }, body:file });
      if(!put.ok) return { ok:false, error:'The upload did not finish (' + put.status + '). Please try again.' };
    }catch(e){ return { ok:false, error:'The upload did not finish. Check the connection and try again.' }; }
    const rec = await call(Object.assign({ action:'record', kind, path:u.data.path }, c.ids, { key:c.ids }));
    return rec.ok ? { ok:true } : { ok:false, error:rec.error };
  }
  /* documents open only through the server: it writes the open to the access log with your name, then a five-minute link */
  async function open(i, docId, btn){
    const c = cardAt(i); if(!c) return;
    const w = window.open('', '_blank');
    if(w) try{ w.document.write('<p style="font-family:sans-serif">Opening the document…</p>'); }catch(_){}
    busy(btn, true);
    const body = Object.assign({ action:'open' }, c.ids, { key:c.ids });
    if(docId === 'agreement') body.doc = 'agreement'; else body.doc_id = docId;
    const r = await call(body);
    busy(btn, false);
    const url = r.ok && r.data && (r.data.url || r.data.signed_url);
    if(url){ if(w) w.location = url; else window.open(url, '_blank'); c.msg = ''; draw(c); return; }
    if(w) try{ w.close(); }catch(_){}
    c.msg = 'Not opened: ' + (r.error || 'the server gave no link.'); c.msgOk = false; c.blockers = null; draw(c);
  }

  /* ---- the Overview line --------------------------------------------------------------------------------------- */
  const GATES = [];
  async function gate(el, k){
    if(!el) return;
    for(let j = GATES.length - 1; j >= 0; j--) if(GATES[j].el === el || !GATES[j].el.isConnected) GATES.splice(j, 1);
    const ids = await resolve(k); if(!Object.keys(ids).length){ el.innerHTML = ''; return; }
    const g = { el, ids }; GATES.push(g);
    await gateDraw(g);
  }
  async function gateDraw(g){
    const r = await read(g.ids);
    if(!g.el.isConnected) return;
    if(!r.ok){ g.el.innerHTML = '<div class="field-note" style="margin-bottom:.4rem">Driver status could not be read: ' + esc(r.error) + '</div>'; return; }
    const row = r.data && r.data.row, st = row ? row.status : 'none';
    if(st === 'approved'){ g.el.innerHTML = ''; return; }
    const why = st === 'none' ? 'no driver compliance record yet' : st === 'non_driver' ? 'non-driving assignments only' : st === 'pending' ? 'documents waiting for the office to verify' : (row.status_reason || 'driving paused');
    g.el.innerHTML = '<div style="background:#FBF6EA;border:1px solid #ECD9AE;border-radius:9px;padding:.45rem .7rem;margin-bottom:.5rem;font-size:.8rem">'
      + '<b>Driving clients:</b> ' + pill(st) + ' <span>' + esc(why) + '.</span> <span class="field-note">Not eligible for transport shifts.</span>'
      + (typeof cgdSection === 'function' ? ' <a href="javascript:void(0)" onclick="cgdSection(\'checks\')">See Driver Compliance</a>' : '') + '</div>';
  }
  function refreshGates(ids){ const ks = keyStr(ids); GATES.forEach(g => { if(g.el.isConnected && keyStr(g.ids) === ks) gateDraw(g); }); }

  /* the hooks the person pages call */
  function mountCaregiver(c, g){
    const k = {}; if(g && g.id != null) k.caregiver_id = String(g.id); if(c && c.id != null) k.axiscare_id = String(c.id);
    const roster = g ? { dl_expires:g.dl_expires || null, auto_ins_expires:g.auto_ins_expires || null } : null;
    mount(document.getElementById('cgdDrv'), k, { roster });
    gate(document.getElementById('cgdDrvGate'), k);
  }
  window.DRV = { mount, gate, mountCaregiver, open, act, verify, form:setForm, reload:(i) => { const c = cardAt(i); if(c){ drop(c.ids); load(c, true); } },
    _call:call, _status:STATUS, daysLeft };
})();
