/* =====================================================================================================================
   HOW DID THEY REACH US? (Samantha 2026-10-22: "a lead that calls us should be marked as a Call, just like leads that are
   from a website form should be labeled as that"; mockup board 3 of https://claude.ai/artifact/UsJfjnivkUHXSRJjsRgi2U).
   Two separate facts on every lead: how they reached us (lead.reached_by) and who sent them (the Referred By boxes, as
   before; "Source" stays for the referral reports). A family who called us or walked in has already talked to a person, so
   picking Called us or Walked in counts as the first conversation: no first-call clock and no first-call alerts. A form
   still starts the 5-minute clock.
   Switch: ops_settings.lead_reached_by_live (off = the form and the cards as before; nothing is written).
   Hub only: the server reads first_human_contact_at as it always has.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const WAYS = [['call', 'Called us'], ['web', 'Website form'], ['facebook', 'Facebook form'], ['referral_form', 'Referral form'], ['walk_in', 'Walked in'], ['email', 'Email']];
  const LABEL = Object.fromEntries(WAYS);
  const TALKED = ['call', 'walk_in'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  function liveOn(settings){ return !!(settings && settings.lead_reached_by_live === true); }
  /* what is on the lead, or the best reading of the lead's own record: a website inquiry, a lead made from a call,
     the old Source box. '' when nothing says. */
  function of(l){
    if(!l) return '';
    if(LABEL[l.reached_by]) return l.reached_by;
    const evs = Array.isArray(l.contact_events) ? l.contact_events : [];
    const words = [l.source, l.referral_source_name].join(' ');
    if(evs.some(e => e && e.channel === 'web' && e.outcome === 'inquiry')) return /facebook|\bfb\b|meta/i.test(words) ? 'facebook' : 'web';
    if(Array.isArray(l.from_calls) && l.from_calls.length) return 'call';
    if(/facebook/i.test(words)) return 'facebook';
    if(l.source === 'Phone') return 'call';
    if(l.source === 'Website') return 'web';
    return '';
  }
  function label(k){ return LABEL[k] || ''; }
  function talked(k){ return TALKED.indexOf(k) > -1; }
  /* the word under the buttons */
  function noteFor(k){
    if(!k) return '';
    return talked(k) ? 'Counts as the first conversation. No first-call alerts.' : 'Nobody has talked to them yet. The 5-minute first-call clock starts.';
  }
  /* saveLead, while the switch is on: keep the answer, and Called us or Walked in is the first real conversation (the same
     record a logged connected call writes), once, only if nobody has talked to them yet. Returns true when it wrote one. */
  function applyOnSave(lead, way, o){
    o = o || {};
    if(!LABEL[way]) return false;
    const before = lead.reached_by;
    lead.reached_by = way;
    if(!talked(way) || lead.first_human_contact_at || o.fromCall) return false;
    if(!o.isNew && before === way) return false;                    /* an edit that did not change the answer writes nothing */
    const at = o.at || new Date().toISOString(), by = o.by || '';
    const note = way === 'walk_in' ? 'They walked in and talked to us' : o.isNew ? 'They called us; talked on the call this lead was typed in from' : 'Set on the lead: they called us and talked to us';
    if(typeof o.push === 'function') o.push(lead, { at, channel:way === 'walk_in' ? 'in_person' : 'call', direction:'in', outcome:'connected', actor:'human', by, note });
    lead.comm_log = Array.isArray(lead.comm_log) ? lead.comm_log : [];
    lead.comm_log.push({ body:(way === 'walk_in' ? '🚶 walked in: talked' : '☎ they called us: talked') + ' (How did they reach us?)', at, by });
    lead.last_contacted_at = at.slice(0, 10);
    if(String(lead.status || 'New') === 'New' && root.LeadRules && root.LeadRules.setStatus) root.LeadRules.setStatus(lead, 'Contacted', { by, why:'first real conversation (' + label(way).toLowerCase() + ')' });
    return true;
  }
  /* the tag on a Leads card, and who sent them */
  function tagHtml(l){
    const k = of(l); if(!k) return '';
    const ref = String((l && l.referral_source_name) || '').trim();
    const t = talked(k) ? '<span class="rb-tag rb-talk">' + esc(label(k)) + '</span>' : '<span class="rb-tag rb-form">' + esc(label(k)) + '</span>';
    return t + (ref && !/^(online|website|web|facebook)$/i.test(ref) ? '<span class="rb-ref">Referred by ' + esc(ref) + '</span>' : '');
  }

  /* ── the form (only while the switch is on; the old "talking to them on this call" box steps aside) ── */
  function formUI(l){
    if(typeof document === 'undefined') return;
    const row = document.getElementById('leadReachedRow'), old = document.getElementById('leadTalkedRow'), inp = document.getElementById('lead_reached_by');
    if(!row || !inp) return;
    const on = liveOn(((typeof DATA !== 'undefined' ? DATA : root.DATA) || {}).ops_settings || {});   /* DATA is the page's own (a let, not on window) */
    row.style.display = on ? '' : 'none';
    if(!on){ inp.value = ''; return; }
    if(old) old.style.display = 'none';
    const isNew = !document.getElementById('lead_id').value;
    inp.value = (l && of(l)) || (isNew ? 'call' : '');
    draw();
  }
  function draw(){
    const box = document.getElementById('leadReachedPills'), inp = document.getElementById('lead_reached_by'), note = document.getElementById('leadReachedNote');
    if(!box || !inp) return;
    box.innerHTML = WAYS.map(([k, t]) => '<button type="button" class="rb-pill' + (inp.value === k ? ' on' : '') + '" aria-pressed="' + (inp.value === k) + '" onclick="rbPick(\'' + k + '\')">' + t + '</button>').join('');
    if(note){ note.textContent = noteFor(inp.value); note.className = 'rb-note' + (inp.value ? (talked(inp.value) ? ' rb-note-talk' : ' rb-note-form') : ''); }
  }
  function rbPick(k){ const inp = document.getElementById('lead_reached_by'); if(!inp || !LABEL[k]) return; inp.value = k; draw(); }
  function style(){
    if(typeof document === 'undefined' || document.getElementById('reachedByStyle')) return;
    const s = document.createElement('style'); s.id = 'reachedByStyle';
    s.textContent = '.rb-pills{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 6px;}'
      + '.rb-pill{min-height:40px;padding:0 16px;border-radius:999px;border:2px solid var(--border);background:#fff;color:var(--navy);font:inherit;font-size:14px;font-weight:700;cursor:pointer;}'
      + '.rb-pill.on{background:#1F7A8C;border-color:#1F7A8C;color:#fff;}'
      + '.rb-note{display:inline-block;padding:6px 12px;border-radius:10px;font-size:13px;font-weight:700;}.rb-note:empty{display:none;}.rb-note-talk{background:#E6F3EA;color:#1E6B3A;}.rb-note-form{background:#FBE7E3;color:#9B2C1A;}'
      + '.rb-tag{padding:1px 9px;border-radius:999px;font-size:11.5px;font-weight:800;}.rb-talk{background:#0D365F;color:#fff;}.rb-form{border:1.5px solid #8FD1C7;color:#14606F;}.rb-ref{font-size:12.5px;color:var(--text-muted);}';
    document.head.appendChild(s);
  }
  style();

  const api = { WAYS, LABEL, TALKED, liveOn, of, label, talked, noteFor, applyOnSave, tagHtml, formUI };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ReachedBy = api;
  root.rbPick = rbPick;
})(typeof globalThis !== 'undefined' ? globalThis : this);
