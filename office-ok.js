/* office-ok.js · Caring Companions Oklahoma applicants in the same Hub (806, Samantha 2026-10-16: "Approve the Oklahoma
   Companion pre-screener plan with all six decisions as you recommended". Plan: https://claude.ai/artifact/KBxEA4jLABRzytSZqwPT9e)
   - Every applicant has an office, MO or OK (job_applicants.office). It follows the position: Companion is Oklahoma.
   - The applicant list gets a Both / Missouri / Oklahoma picker (remembered in this browser) and an MO or OK chip.
   - Oklahoma applicants get NO texts or emails from the Hub until she switches Oklahoma applicant messages on: every
     message today goes from the Missouri (417) number with Missouri wording. The server holds them too; here the buttons
     say so instead of trying. Calling works from the right number: the office line in LeadConnector.
   - Oklahoma offers wait for the Oklahoma hiring path (the offer, Step 1 forms and checks are written for Missouri law).
   window.OKO: office(r), isOk(r|id), pass(r), chip(r), heldNote(r), heldBox(r), pickerHtml(), setPicker(v), offerBlocked(r) */
(function () {
  'use strict';
  const KEY = 'cc_ap_office';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const OK_PHONE = '(405) 500-1758';
  let pick = '';
  try { pick = localStorage.getItem(KEY) || ''; } catch (_) { pick = ''; }
  if (!['', 'MO', 'OK'].includes(pick)) pick = '';

  const rows = () => (typeof AP_ROWS !== 'undefined' && Array.isArray(AP_ROWS)) ? AP_ROWS : [];
  const rowOf = (x) => (x && typeof x === 'object') ? x : rows().find((r) => String(r.id) === String(x)) || null;
  /* rows loaded somewhere other than the applicant list (the phone version) are remembered here by id */
  const SEEN = new Set();
  const remember = (list) => { (list || []).forEach((r) => { if (r && r.id != null && r.office === 'OK') SEEN.add(String(r.id)); }); };
  const office = (r) => {
    if (r != null && typeof r !== 'object' && SEEN.has(String(r))) return 'OK';
    r = rowOf(r); return r && r.office === 'OK' ? 'OK' : 'MO';
  };
  const isOk = (r) => office(r) === 'OK';
  const pass = (r) => !pick || office(r) === pick;

  function chip(r) {
    const ok = isOk(r);
    return '<span class="oko-chip ' + (ok ? 'oko-ok' : 'oko-mo') + '" title="' + (ok ? 'Caring Companions Oklahoma (Mustang)' : 'Caring Companions Missouri (Springfield)') + '">' + (ok ? 'OK' : 'MO') + '</span>';
  }
  const HELD = 'Oklahoma messages are off. Call from ' + OK_PHONE + ' in LeadConnector.';
  /* in place of a send button (the text button, the not-hiring message, the no-show message) */
  function heldNote(r) {
    return '<span class="oko-held" title="Texts and emails from the Hub would come from the Missouri number. They stay off for Oklahoma until Samantha turns them on.">' + esc(HELD) + '</span>';
  }
  /* the profile's overview: what is held, and the last thing the server held for them */
  function heldBox(r) {
    if (!isOk(r)) return '';
    const last = r.msgs_held_at
      ? '<div style="margin-top:4px;">Last held: ' + esc(r.msgs_held_note || 'a message') + ', '
        + esc(new Date(r.msgs_held_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + '.</div>'
      : '';
    return '<div class="oko-box"><b>Caring Companions Oklahoma applicant</b>'
      + '<div style="margin-top:4px;">Automatic messages: held for Oklahoma. Nothing goes to them by text or email from the Hub. ' + esc('Call from ' + OK_PHONE + ' in LeadConnector.') + '</div>'
      + last + '</div>';
  }
  function offerBlocked(r) { return isOk(r); }
  const OFFER_TEXT = 'Oklahoma offers are not set up yet. The offer letter, Step 1 forms and background checks are written for Missouri law, so Oklahoma offers wait for the Oklahoma hiring path.';

  function pickerHtml() {
    return '<select id="apOffice" onchange="OKO.setPicker(this.value)" aria-label="Office" class="oko-pick">'
      + '<option value=""' + (pick === '' ? ' selected' : '') + '>Both offices</option>'
      + '<option value="MO"' + (pick === 'MO' ? ' selected' : '') + '>Missouri</option>'
      + '<option value="OK"' + (pick === 'OK' ? ' selected' : '') + '>Oklahoma</option></select>';
  }
  function setPicker(v) {
    pick = ['MO', 'OK'].includes(v) ? v : '';
    try { if (pick) localStorage.setItem(KEY, pick); else localStorage.removeItem(KEY); } catch (_) { /* this browser only */ }
    const el = document.getElementById('apOffice'); if (el && el.value !== pick) el.value = pick;
    if (typeof apRender === 'function') apRender();
  }
  function mount() {
    const host = document.getElementById('apOfficeHost');
    if (host && !document.getElementById('apOffice')) host.innerHTML = pickerHtml();
  }
  function css() {
    if (document.getElementById('oko-css')) return;
    const s = document.createElement('style'); s.id = 'oko-css';
    s.textContent = '.oko-chip{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.05em;border-radius:999px;padding:2px 8px;line-height:1.4}'
      + '.oko-ok{color:#8A3A1C;background:#F8E7DD}.oko-mo{color:#1F5F8C;background:#E6F0F7}'
      + '.oko-held{display:inline-block;font-size:12px;color:#8A5A00;background:#FFF3D6;border-radius:8px;padding:4px 9px}'
      + '.oko-box{margin-top:12px;background:#FBF4EE;border:1px solid #EBCDBB;border-radius:9px;padding:10px 12px;font-size:13px;color:#6B3216}'
      + '.oko-pick{width:auto;font:inherit;font-size:13px;padding:7px 10px;border:1px solid var(--border,#E2E8F0);border-radius:8px;background:#fff}';
    document.head.appendChild(s);
  }
  css();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();

  window.OKO = { remember, office, isOk, pass, chip, heldNote, heldBox, pickerHtml, setPicker, mount, offerBlocked, OFFER_TEXT, HELD, get picked() { return pick; } };
})();
