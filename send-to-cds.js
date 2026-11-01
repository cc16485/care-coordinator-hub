/* =====================================================================================================================
   SEND TO CARING CDS (Samantha 2026-11-01). "We have many people calling our Caring Companions In-Home Senior Care
   number 417-234-8494 but are interested in the CDS program, so we need to be able to send leads to the CDS subaccount
   - and make sure they don't get the lead follow up that happens in the Caring Companions In-Home Senior Care
   subaccount in ghl". Her picks: a person clicks, the Hub only hints; she adds the GoHighLevel workflow filters herself.
     · A call that mentions Medicaid or CDS shows "Sounds like CDS" and Send to Caring CDS. A lead whose payer is CDS or
       Medicaid gets it too (Leads: the "Sounds like CDS" card, and the board's Medicaid row).
     · The server (send-to-cds) gives CDS the person and the call first; only once CDS has them does it put "sent to cds"
       on the Caring Companions GoHighLevel contact, take "lead" off, and take them out of the listed workflows.
     · Here: the lead closes as Lost, Referred to Caring CDS (so the Hub's own follow-up stops), or a call with no lead is
       marked Sent to Caring CDS in call_lead_marks. A part that did not finish stays on Leads with Try again.
   Nothing here sends anything to the family. Switch: ops_settings.send_to_cds_live (starts off); an owner can preview
   it in this browser only.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const PREVIEW_KEY = 'cc_send_to_cds_preview';
  const esc = s => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const q = v => JSON.stringify(String(v)).replace(/"/g, '&quot;');
  const D = () => (typeof DATA !== 'undefined' && DATA) ? DATA : {};
  const me = () => (typeof ME !== 'undefined' && ME && (ME.name || ME.email)) || (typeof ccActor === 'function' ? ccActor().email : '') || '';
  const say = m => { if(typeof ccToast === 'function') ccToast(m); else alert(m); };
  const first = s => String(s || '').trim().split(/\s+/)[0] || 'someone';
  const CLOSED = /^(converted|lost|closed|not a fit|spam)/i;
  const working = {};

  function liveOn(settings){ return !!(settings && settings.send_to_cds_live === true); }
  function previewOn(){ try{ return root.localStorage && root.localStorage.getItem(PREVIEW_KEY) === '1'; }catch(e){ return false; } }
  function showing(settings, isOwner){ return liveOn(settings) || (!!isOwner && previewOn()); }
  const owner = () => typeof root.ccIsOwner === 'function' && root.ccIsOwner();
  const on = () => { try{ return showing(D().ops_settings || {}, owner()); }catch(e){ return false; } };
  function preview(v){ try{ root.localStorage.setItem(PREVIEW_KEY, v ? '1' : '0'); }catch(e){} repaint(); }

  /** The hint: what the call reader heard, or the payer on the lead. A hint only; a person decides. */
  const CDS_WORDS = /\b(medicaid|cds|consumer[\s-]*directed|self[\s-]*directed|hire (my|her|his|their) own|pay (me|my|her|his) (daughter|son|wife|husband|family))\b/i;
  function soundsLikeCds(summary){ return CDS_WORDS.test(String(summary || '')); }
  function leadSounds(l){ return !!l && (l.funding_source === 'cds' || l.funding_source === 'medicaid'); }
  const leadName = l => (typeof cpLeadClientName === 'function' && cpLeadClientName(l)) || [l.client_first_name, l.client_last_name].filter(Boolean).join(' ') || [l.first_name, l.last_name].filter(Boolean).join(' ') || 'this family';
  const sent = l => l && l.sent_to_cds && l.sent_to_cds.at ? l.sent_to_cds : null;
  const unfinished = r => !!(r && Array.isArray(r.problems) && r.problems.length);
  const callMark = id => (Array.isArray(D().call_lead_marks) ? D().call_lead_marks : []).find(m => m && m.id === id && m.verdict === 'cds') || null;

  /** The words a person reads after the server answered. */
  function resultWords(name, j){
    const c = (j && j.cds) || {}, g = (j && j.ghl) || {};
    const lines = [];
    if(c.already && c.already.kind === 'consumer') lines.push(name + ' is already a CDS consumer (' + (c.already.name || 'same phone') + '), so CDS was not sent a new lead.');
    else if(c.already && c.already.kind === 'lead') lines.push(name + ' is already on CDS Leads (' + (c.already.name || 'same phone') + '), so CDS was not sent a second copy.');
    else if(c.already) lines.push(name + ' was already sent to CDS.');
    else lines.push('Sent to Caring CDS. Their office gets the alert and calls ' + first(name) + '.');
    if(g.none) lines.push(g.none);
    else if(unfinished(g)) lines.push('Not finished in GoHighLevel: ' + g.problems.join('; ') + '.');
    else lines.push('Caring Companions follow-up is stopped in GoHighLevel' + (g.workflows_listed ? '' : ' (tags changed; no workflows are listed to take them out of yet)') + '.');
    return lines.join(' ');
  }
  const record = (j, at) => ({ at: at || new Date().toISOString(), by: me(), cds_added: !!(j.cds && j.cds.added), already: (j.cds && j.cds.already) || null,
    ghl_contact_id: (j.ghl && j.ghl.contact_id) || '', problems: (j.ghl && j.ghl.problems) || [], words: '' });

  async function call(payload){
    const sess = await sb.auth.getSession(), tok = sess && sess.data && sess.data.session && sess.data.session.access_token;
    if(!tok) throw new Error('Please sign in again.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/send-to-cds', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, apikey: CONFIG.supabase_anon_key }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    if(!r.ok || !j.ok) throw new Error(j.error || ('The server answered ' + r.status));
    return j;
  }

  const ASK = name => 'Send ' + name + ' to Caring CDS?\n\nCDS gets their name, phone and the call notes, and the CDS office calls them.\n\n'
    + 'Caring Companions follow-up stops: the lead closes as Referred to Caring CDS, and in GoHighLevel they get the tag "sent to cds" and come out of our lead follow-up.\n\nNothing is sent to the family.';

  /** A Caring Companions lead. again = Try again after a part did not finish (no question, the lead is already closed). */
  async function sendLead(id, again){
    const l = (D().leads || []).find(x => x && x.id === id); if(!l || working[id]) return;
    const name = leadName(l);
    if(!again && !(await (typeof ccConfirm === 'function' ? ccConfirm(ASK(name)) : confirm(ASK(name))))) return;
    working[id] = true; repaint();
    try{
      const j = await call({ lead_id: id });
      const rec = record(j, again && sent(l) ? sent(l).at : ''); rec.words = resultWords(name, j);
      if(again && sent(l)) rec.tries = Number(sent(l).tries || 1) + 1;
      l.sent_to_cds = rec;
      if(!CLOSED.test(String(l.status || ''))){
        Object.assign(l, { lost_reason: 'Referred to Caring CDS', lost_reason_key: 'referred_cds' });
        if(root.LeadRules) root.LeadRules.setStatus(l, 'Lost', { by: (typeof ccActor === 'function' ? ccActor().email : ''), why: 'Referred to Caring CDS' });
      }
      await persist('leads', l);
      if(typeof opsReconcileLeads === 'function'){ try{ opsReconcileLeads(); }catch(e){} }
      if(unfinished(rec)) alert(rec.words + '\n\nIt stays on Leads under "Sent to CDS, not finished" with Try again.'); else say(rec.words);
    }catch(e){ alert('Not sent to Caring CDS: ' + (e && e.message || e)); }
    finally{ delete working[id]; repaint(); }
  }

  /** A call with no Caring Companions lead: marked on the call (call_lead_marks), so Make this a lead stops asking. */
  async function sendCall(messageId, who){
    if(!/^[A-Za-z0-9_-]{6,64}$/.test(String(messageId || '')) || working[messageId]) return;
    const was = callMark(messageId), name = who || 'this caller';
    if(!was && !(await (typeof ccConfirm === 'function' ? ccConfirm(ASK(name)) : confirm(ASK(name))))) return;
    working[messageId] = true; repaint();
    try{
      const j = await call({ message_id: messageId });
      const m = Object.assign({ id: messageId, verdict: 'cds' }, record(j, was ? was.at : ''), { name: (j.cds && j.cds.name) || who || '' });
      m.words = resultWords(m.name || name, j);
      if(!Array.isArray(D().call_lead_marks)) DATA.call_lead_marks = [];
      const i = DATA.call_lead_marks.findIndex(x => x && x.id === messageId); if(i >= 0) DATA.call_lead_marks[i] = m; else DATA.call_lead_marks.push(m);
      await persist('call_lead_marks', m);
      if(unfinished(m)) alert(m.words + '\n\nIt stays on Leads under "Sent to CDS, not finished" with Try again.'); else say(m.words);
    }catch(e){ alert('Not sent to Caring CDS: ' + (e && e.message || e)); }
    finally{ delete working[messageId]; repaint(); }
  }

  const btn = (label, js, primary) => '<button class="' + (primary ? 'primary' : 'ghost') + '" style="font-size:12px;padding:4px 10px;" onclick="' + js + '">' + esc(label) + '</button>';
  const chip = '<span class="tag-chip" style="background:#FFF1DC;color:#8A5A00;font-weight:700;">Sounds like CDS</span> ';

  /** call-lead.js: the CDS part of one call's buttons. summary = the call reader's; lead = the lead it is on, if any;
   *  newFamily = the call reader tagged it a new family. Returns '' when there is nothing to show. */
  function callHtml(id, summary, lead, newFamily){
    if(!on()) return '';
    if(working[id] || (lead && working[lead.id])) return '<span class="field-note">Sending to Caring CDS…</span>';
    const m = callMark(id);
    if(m) return '<span class="field-note">Sent to Caring CDS (' + esc(first(m.by)) + ')' + (unfinished(m) ? ' · <b style="color:#A83A2F;">not finished</b> ' + btn('Try again', 'SendToCds.sendCall(' + q(id) + ')', false) : '') + '</span>';
    const hinted = soundsLikeCds(summary) || leadSounds(lead);
    if(lead){
      if(sent(lead)) return '<span class="field-note">Sent to Caring CDS (' + esc(first(sent(lead).by)) + ')</span>';
      if(!hinted || CLOSED.test(String(lead.status || ''))) return '';
      return chip + btn('Send to Caring CDS', 'SendToCds.sendLead(' + q(lead.id) + ')', false);
    }
    if(!hinted && !newFamily) return '';
    return (hinted ? chip : '') + btn('Send to Caring CDS', 'SendToCds.sendCall(' + q(id) + ')', false);
  }
  /** call-lead.js: a call already sent to CDS is decided (not "waiting for a decision"). */
  function callDecided(id){ return !!callMark(id); }

  /** Leads board, top: open leads whose payer is CDS or Medicaid (not sent yet), and sends that did not finish. */
  function boardHtml(){
    if(!on()) return '';
    const leads = (D().leads || []).filter(l => l && !l.archived);
    const waiting = leads.filter(l => leadSounds(l) && !sent(l) && !CLOSED.test(String(l.status || '')) && !l.said_yes_at);
    const stuck = leads.filter(l => unfinished(sent(l)));
    const stuckCalls = (Array.isArray(D().call_lead_marks) ? D().call_lead_marks : []).filter(m => m && m.verdict === 'cds' && unfinished(m));
    const prev = owner() && !liveOn(D().ops_settings || {}) ? '<div class="field-note" style="margin:0 0 6px;">Preview: only you see Send to Caring CDS, in this browser. <button class="linklike" onclick="SendToCds.preview(false)">Stop the preview</button></div>' : '';
    if(!waiting.length && !stuck.length && !stuckCalls.length) return prev ? '<div style="grid-column:1/-1;">' + prev + '</div>' : '';
    const row = (name, sub, act) => '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:6px 0;border-top:1px solid var(--border);"><b style="color:var(--navy);min-width:140px;">' + esc(name) + '</b><span style="font-size:12.5px;flex:1 1 240px;min-width:0;">' + sub + '</span>' + act + '</div>';
    const open = id => '<button class="linklike" onclick="openLeadProfile(' + q(id) + ')">Open</button> ';
    return '<div class="card" style="grid-column:1/-1;padding:12px 14px;margin-bottom:10px;border:1.5px solid #F0D9A8;background:#FFFBF3;">' + prev
      + (waiting.length ? '<div style="font-size:11.5px;font-weight:800;letter-spacing:.06em;color:#8A5A00;">SOUNDS LIKE CDS, NOT SENT YET (' + waiting.length + ')</div>'
        + '<div class="field-note" style="margin:2px 0 6px;">Their payer is CDS or Medicaid. Send each one to Caring CDS, or change the payer if they will pay another way.</div>'
        + waiting.map(l => row(leadName(l), esc(l.funding_source === 'cds' ? 'Payer: CDS' : 'Payer: Medicaid (we no longer accept it)'), open(l.id) + (working[l.id] ? '<span class="field-note">Sending…</span>' : btn('Send to Caring CDS', 'SendToCds.sendLead(' + q(l.id) + ')', true)))).join('') : '')
      + (stuck.length || stuckCalls.length ? '<div style="font-size:11.5px;font-weight:800;letter-spacing:.06em;color:#A83A2F;margin-top:' + (waiting.length ? '10px' : '0') + ';">SENT TO CDS, NOT FINISHED (' + (stuck.length + stuckCalls.length) + ')</div>'
        + '<div class="field-note" style="margin:2px 0 6px;">CDS has them, but part of stopping Caring Companions follow-up in GoHighLevel did not go through.</div>'
        + stuck.map(l => row(leadName(l), esc(sent(l).problems.join('; ')), open(l.id) + btn('Try again', 'SendToCds.sendLead(' + q(l.id) + ',true)', false))).join('')
        + stuckCalls.map(m => row(m.name || 'A caller', esc(m.problems.join('; ')), btn('Try again', 'SendToCds.sendCall(' + q(m.id) + ')', false))).join('') : '')
      + '</div>';
  }
  /** Leads board footer for owners while off: start the preview. */
  function previewAsk(){
    if(!owner() || liveOn(D().ops_settings || {}) || previewOn()) return '';
    return '<div class="lb-preview-ask" style="grid-column:1/-1;margin:0;font-size:13px;"><button class="linklike" onclick="SendToCds.preview(true)">Preview Send to Caring CDS (only you see it)</button></div>';
  }

  function repaint(){
    try{ if(typeof root.renderLeadsStarts === 'function' && document.getElementById('lbBoard')) root.renderLeadsStarts(); }catch(e){}
    try{ if(root.CallLead && CallLead.repaint) CallLead.repaint(); }catch(e){}
  }

  root.SendToCds = { liveOn, showing, preview, soundsLikeCds, leadSounds, callHtml, callDecided, boardHtml, previewAsk, sendLead, sendCall, resultWords };
})(typeof window !== 'undefined' ? window : globalThis);
