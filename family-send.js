/* family-send.js · SEND TO FAMILY, the Hub card (Samantha 2026-10-28: "build it with your picks: Billing owner enters payment
   forms, no 3-digit code unless AxisCare needs it, start with the four pieces").
   On a client's Start of Care tab (under the Client Care Agreement) and on the Payer tab (payment picked). The office picks
   the piece and ONE person from this client's Family Circle; anyone who can't get it shows why. The card keeps the history:
   sent, opened, done, cancelled. A returned payment form shows the last 4 only; a care coordinator, the Billing owner or an
   owner can Show the full numbers once, to type into AxisCare (Samantha 2026-10-28: "Care Coordinators can input payment
   info into axiscare"), then "Entered in AxisCare" erases them. A shown number lives only in this page's
   memory for 5 minutes: never stored, never logged. Talks only to the family-send function. Reads the page-level CP. */
(function () {
  'use strict';
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const PIECES = [['payment', 'Payment authorization', 'Card or bank for the Thursday autopay'], ['circle', 'Family Circle check', 'They confirm who gets what'],
    ['guide', 'GUIDE program', 'Medicare GUIDE respite, with "call me about it"'], ['agreement', 'Whole Client Care Agreement', 'Sent from the agreement card above']];
  const S = { data: null, open: '', pick: null, who: '', err: '', shown: {}, timers: {} };
  const ax = () => String((typeof CP !== 'undefined' && CP && CP.ax) || '');
  const cname = () => String((typeof CP !== 'undefined' && CP && CP.r && CP.r.client_name) || '');
  const when = iso => { const t = Date.parse(iso || ''); return Number.isFinite(t) ? new Date(t).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''; };
  const dayOf = iso => { const t = Date.parse(iso || ''); return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' }) : ''; };
  async function call(body) {
    const { status, data } = await callAction('family-send', body);
    if (!data) throw new Error('The send service answered ' + status);
    if (status >= 400) { const e = new Error(data.message || data.error || ('The send service answered ' + status)); e.outcome = data.outcome; e.data = data; throw e; }
    return data;
  }
  const hosts = () => ['cp_fsend', 'cp_fsend_payer'].map(id => document.getElementById(id)).filter(Boolean);
  async function load() {
    const a = ax(); if (!a) return;
    try { S.data = await call({ action: 'list', client_ax: a }); S.err = ''; } catch (e) { S.data = null; S.err = e.message; }
    draw();
  }
  function status(s) {
    if (s.done_at) return s.payment && s.payment.locked ? ['To enter', 'sent'] : ['Done', 'done'];
    if (s.revoked_at) return [/held|not delivered/.test(s.revoked_by || '') ? 'Not sent' : 'Cancelled', 'off'];
    if (!s.live) return ['Expired', 'off'];
    return s.opened_at ? ['Opened', 'open'] : ['Sent', 'sent'];
  }
  const PILL = { done: ['#166534', '#E8F6EC'], open: ['#1F7A8C', '#E3F3F2'], sent: ['#9A5B00', '#FFF3DC'], off: ['#6b7280', '#f2f0e9'] };
  const pill = ([t, k]) => '<span style="font-size:12px;font-weight:600;padding:3px 9px;border-radius:999px;white-space:nowrap;color:' + PILL[k][0] + ';background:' + PILL[k][1] + '">' + esc(t) + '</span>';
  function sub(s) {
    const p = s.payment;
    if (s.piece === 'payment' && p) return (p.method === 'card' ? (p.brand || 'Card') + ' ending ' : (p.bank_type === 'savings' ? 'Savings' : 'Checking') + ' ending ') + esc(p.last4)
      + (p.entered_at ? ' · entered in AxisCare ' + esc(dayOf(p.entered_at)) + ' by ' + esc(p.entered_by) : p.erased_at ? ' · <b style="color:#b42318">erased before it was entered</b>' : ' · <b style="color:#9A5B00">waiting to be entered in AxisCare</b>');
    if (s.piece === 'circle' && s.result) return s.result.changes ? esc(s.result.changes) + ' change' + (s.result.changes === 1 ? '' : 's') + ' sent back (a card is on My Work)' : 'They said it all looks right';
    if (s.piece === 'guide' && s.result) return s.result.answer === 'call_me' ? '<b>Wants a call</b>' + (s.result.best_time ? ' · ' + esc(s.result.best_time) : '') : 'Not for them right now';
    if (s.revoked_at) return esc(s.revoked_by && /held/.test(s.revoked_by) ? 'Not sent: outside 8am to 6pm' : s.revoked_by === 'not delivered' ? 'Could not be delivered (it is in Needs Attention)' : 'Cancelled by ' + (s.revoked_by || 'the office'));
    return 'Sent by ' + esc(s.sent_by_name) + ' ' + esc(when(s.created_at)) + (s.opened_at ? ' · opened ' + esc(when(s.opened_at)) : '') + ' · link good until ' + esc(dayOf(s.expires_at));
  }
  function payBox(s) {
    const p = s.payment; if (!p) return '';
    const shown = S.shown[p.id];
    let h = '<div style="margin-top:8px;padding:10px 12px;border:1px solid var(--border,#E2E8F0);border-radius:10px;font-size:13.5px">'
      + '<div><b>' + esc(p.holder_name) + '</b> · ' + (p.method === 'card' ? esc(p.brand || 'Card') + ' · expires ' + esc(p.exp) + ' · ZIP ' + esc(p.zip) : esc(p.bank_type || 'bank') + ' account') + (p.invoice_email ? ' · invoices to ' + esc(p.invoice_email) : '') + '</div>'
      + '<div class="field-note">Signed by ' + esc(p.signer_name) + ' ' + esc(when(p.signed_at)) + '. ' + esc(p.words) + '</div>';
    if (p.locked) {
      if (shown) h += '<div style="margin:8px 0;padding:10px 12px;background:#FFF7E6;border-radius:8px;font-variant-numeric:tabular-nums;font-size:18px;letter-spacing:.06em">'
        + (shown.method === 'card' ? esc(String(shown.number).replace(/(\d{4})(?=\d)/g, '$1 ')) : 'Routing ' + esc(shown.routing) + '<br>Account ' + esc(shown.account))
        + '<div class="field-note" style="letter-spacing:0">Hidden again in <span data-left="' + esc(p.id) + '">5:00</span>. Type it into AxisCare now.</div></div>';
      else h += '<div style="margin-top:8px;font-variant-numeric:tabular-nums;letter-spacing:.06em">•••• •••• •••• ' + esc(p.last4) + '</div>';
      h += S.data.can_show ? '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' + (shown ? '' : '<button class="secondary" data-fs-show="' + esc(p.id) + '">Show to enter in AxisCare</button>')
          + '<button class="primary" data-fs-entered="' + esc(p.id) + '">Entered in AxisCare</button></div>'
        : '<div class="field-note" style="margin-top:6px">Only a care coordinator, ' + esc(S.data.billing_owner || 'the person who handles Billing') + ' or an owner can see the full numbers.</div>';
      h += '<div class="field-note" style="margin-top:6px">The numbers erase themselves ' + esc(when(p.erase_by)) + ' if this isn\'t marked.</div>';
    } else h += '<div class="field-note" style="margin-top:6px">Card or bank numbers erased' + (p.erased_why === 'entered' ? ' after entering in AxisCare.' : p.erased_why === 'replaced' ? ' (a newer form replaced it).' : ' after 7 days.') + ' The last 4 and the signature stay.</div>';
    return h + '</div>';
  }
  function rowHtml(s) {
    const open = S.open === s.id;
    return '<div style="border-top:1px solid var(--border,#E2E8F0);padding:9px 0">'
      + '<div data-fs-row="' + esc(s.id) + '" style="display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) auto;gap:10px;align-items:center;cursor:pointer;font-size:13.5px">'
      + '<div><b>' + esc(s.piece_name) + '</b><div class="field-note">' + sub(s) + '</div></div><div>' + esc(s.to_name) + '</div>' + pill(status(s)) + '</div>'
      + (open ? '<div style="margin-top:6px">' + (s.piece === 'payment' ? payBox(s) : '')
        + (s.live ? '<button class="secondary" style="margin-top:8px" data-fs-cancel="' + esc(s.id) + '">Cancel the link</button>' : '')
        + '<button class="secondary" style="margin-top:8px;margin-left:6px" data-fs-again="' + esc(s.piece) + '">Send again</button></div>' : '')
      + '</div>';
  }
  function sheet() {
    const d = S.data, pk = S.pick;
    let h = '<div style="margin-top:10px;padding:12px;border:1px solid var(--border,#E2E8F0);border-radius:12px;background:var(--bg,#F6F9FD)">'
      + '<div style="font-size:12.5px;font-weight:700;color:var(--navy,#0E3860);margin-bottom:6px">1. What are you sending?</div>'
      + PIECES.map(([k, t, n]) => '<label style="display:flex;gap:8px;align-items:flex-start;font-size:13.5px;margin:4px 0;cursor:pointer"><input type="radio" name="fsPiece" value="' + k + '"' + (pk === k ? ' checked' : '') + ' style="width:auto;margin-top:3px"> <span><b>' + esc(t) + '</b> <span class="field-note">' + esc(n) + '</span></span></label>').join('');
    if (pk === 'agreement') return h + '<div class="field-note" style="margin-top:8px">The whole agreement keeps its own link and code. Use the Client Care Agreement card above: start or continue it, then "Send to sign from home".</div>'
      + '<button class="secondary" style="margin-top:8px" data-fs-goagree="1">Go to the agreement card</button></div>';
    if (!pk) return h + '</div>';
    if (!d.linked) return h + '<div class="field-note" style="margin-top:8px"><b>This client has no Family Circle linked yet.</b> Link it on Family &amp; Contacts first.</div></div>';
    h += '<div style="font-size:12.5px;font-weight:700;color:var(--navy,#0E3860);margin:10px 0 6px">2. Who gets it? (Family Circle only)</div>'
      + (d.people.length ? d.people.map(p => '<label style="display:flex;gap:8px;align-items:flex-start;font-size:13.5px;margin:4px 0;' + (p.why ? 'opacity:.6;' : 'cursor:pointer;') + '"><input type="radio" name="fsWho" value="' + esc(p.id) + '"' + (p.why ? ' disabled' : '') + (S.who === p.id ? ' checked' : '') + ' style="width:auto;margin-top:3px"> <span><b>' + esc(p.name) + '</b>'
        + (p.main ? ' <span style="font-size:11px;font-weight:600;padding:1px 7px;border-radius:999px;background:#E3F3F2;color:#1F7A8C">Main contact</span>' : '')
        + '<span class="field-note" style="display:block">' + esc([p.relationship, p.phone, p.mail].filter(Boolean).join(' · ')) + (p.why ? ' · ' + esc(p.why) : '') + '</span></span></label>').join('')
        : '<div class="field-note">Nobody is in this Family Circle yet. Add someone on Family &amp; Contacts.</div>');
    const p = d.people.find(x => x.id === S.who);
    if (p) {
      const first = String(p.name).split(/\s+/)[0], cf = cname().split(/\s+/)[0];
      const what = pk === 'payment' ? 'the payment form for ' + (cf ? cf + '\'s' : 'your') + ' care. It takes about 3 minutes' : pk === 'circle' ? 'a quick check of who we keep in touch with about ' + (cf || 'your loved one') + '\'s care. It takes about 2 minutes' : 'information on Medicare\'s GUIDE program, which can cover respite visits for families living with dementia';
      h += '<div style="font-size:12.5px;font-weight:700;color:var(--navy,#0E3860);margin:10px 0 6px">3. How?</div>'
        + '<div style="border:1px dashed var(--border,#E2E8F0);border-radius:10px;padding:10px 12px;font-size:13px;background:#fff">Hi ' + esc(first) + ', this is Caring Companions. Here is ' + esc(what) + ': [link] The link works for 7 days. Questions? Call us at (417) 234-8494.</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' + (p.sms ? '<button class="primary" data-fs-send="sms">Send text</button>' : '') + (p.email ? '<button class="' + (p.sms ? 'secondary' : 'primary') + '" data-fs-send="email">Send email</button>' : '')
        + (p.sms && p.email ? '<button class="secondary" data-fs-send="both">Both</button>' : '') + '</div>'
        + '<div class="field-note" style="margin-top:6px">Sends go out 8am to 6pm. When they open it, a 6-digit code goes to the same phone or email.</div>';
    }
    return h + '<div id="fsOut" class="field-note" style="margin-top:6px"></div></div>';
  }
  function html(payer) {
    if (S.err) return '<div class="card" style="margin-top:12px"><b>Send to family</b><div class="field-note">Could not load: ' + esc(S.err) + '</div></div>';
    if (!S.data) return '<div class="card" style="margin-top:12px"><b>Send to family</b><div class="field-note">Loading…</div></div>';
    const d = S.data, list = payer ? d.sends.filter(s => s.piece === 'payment') : d.sends;
    return '<div class="card" style="margin-top:12px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><b style="color:var(--navy,#0E3860);font-size:15.5px">' + (payer ? 'Payment forms' : 'Send to family') + '</b>'
      + (d.can_send ? '<button class="primary" data-fs-new="' + (payer ? 'payment' : '') + '">' + (payer ? 'Send a payment form' : 'Send something') + '</button>' : '') + '</div>'
      + (!d.live ? '<div class="field-note" style="margin-top:4px">' + (d.can_send ? 'Not switched on yet: only owners can send, to try it.' : 'Not switched on yet.') + '</div>' : '')
      + (S.pick !== null && S.host === (payer ? 'payer' : 'soc') ? sheet() : '')
      + (list.length ? '<div style="margin-top:8px">' + list.map(rowHtml).join('') + '</div>' : '<div class="field-note" style="margin-top:6px">Nothing sent yet.' + (payer ? ' The payment form replaces the GHL Credit Card &amp; ACH form.' : '') + '</div>')
      + '</div>';
  }
  function draw() { hosts().forEach(h => { h.innerHTML = html(h.id === 'cp_fsend_payer'); }); }
  function tick(id) {
    clearInterval(S.timers[id]); const end = Date.now() + 300e3;
    S.timers[id] = setInterval(() => { const left = Math.max(0, end - Date.now()), el = document.querySelector('[data-left="' + id + '"]');
      if (el) el.textContent = Math.floor(left / 60000) + ':' + String(Math.floor(left / 1000) % 60).padStart(2, '0');
      if (!left) { clearInterval(S.timers[id]); delete S.shown[id]; draw(); } }, 1000);
  }
  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-fs-row],[data-fs-new],[data-fs-send],[data-fs-show],[data-fs-entered],[data-fs-cancel],[data-fs-again],[data-fs-goagree]'); if (!t || !t.closest('#cp_fsend,#cp_fsend_payer')) return;
    const payer = !!t.closest('#cp_fsend_payer');
    if (t.dataset.fsRow) { S.open = S.open === t.dataset.fsRow ? '' : t.dataset.fsRow; return draw(); }
    if (t.dataset.fsNew !== undefined) { S.host = payer ? 'payer' : 'soc'; S.pick = S.pick !== null ? null : (t.dataset.fsNew || ''); S.who = ''; return draw(); }
    if (t.dataset.fsAgain) { S.host = payer ? 'payer' : 'soc'; S.pick = t.dataset.fsAgain; S.who = ''; return draw(); }
    if (t.dataset.fsGoagree) { const el = document.getElementById('cp_agreement'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const out = document.getElementById('fsOut');
    try {
      t.disabled = true;
      if (t.dataset.fsSend) {
        const ch = t.dataset.fsSend === 'both' ? ['sms', 'email'] : [t.dataset.fsSend];
        const r = await call({ action: 'send', client_ax: ax(), client_name: cname(), piece: S.pick, contact_id: S.who, channels: ch });
        if (typeof ccToast === 'function') ccToast(r.message || 'Sent.'); S.pick = null; S.who = ''; return load();
      }
      if (t.dataset.fsShow) { const r = await call({ action: 'show', payment_id: t.dataset.fsShow }); S.shown[t.dataset.fsShow] = r; draw(); tick(t.dataset.fsShow); return; }
      if (t.dataset.fsEntered) {
        if (typeof ccConfirm === 'function' && !(await ccConfirm('Mark it entered in AxisCare?\n\nThe card or bank numbers are erased for good. The last 4 and the signature stay.'))) { t.disabled = false; return; }
        await call({ action: 'entered', payment_id: t.dataset.fsEntered }); delete S.shown[t.dataset.fsEntered]; if (typeof ccToast === 'function') ccToast('Entered. The numbers are erased.'); return load();
      }
      if (t.dataset.fsCancel) { await call({ action: 'cancel', id: t.dataset.fsCancel }); return load(); }
    } catch (x) {
      t.disabled = false;
      if (out) out.innerHTML = '<b style="color:#b42318">' + esc(x.message) + '</b>'; else alert(x.message);
    }
  });
  document.addEventListener('change', e => {
    if (!e.target.closest || !e.target.closest('#cp_fsend,#cp_fsend_payer')) return;
    if (e.target.name === 'fsPiece') { S.pick = e.target.value; S.who = ''; draw(); }
    if (e.target.name === 'fsWho') { S.who = e.target.value; draw(); }
  });
  function mount() {
    const soc = document.getElementById('cp_agreement'), pay = document.getElementById('cp_payer');
    if (soc && !document.getElementById('cp_fsend')) soc.insertAdjacentHTML('afterend', '<div id="cp_fsend"></div>');
    if (pay && !document.getElementById('cp_fsend_payer')) pay.insertAdjacentHTML('afterend', '<div id="cp_fsend_payer"></div>');
    if (S.ax !== ax()) { S.ax = ax(); S.data = null; S.open = ''; S.pick = null; S.who = ''; S.shown = {}; Object.values(S.timers).forEach(clearInterval); S.timers = {}; }
    draw(); load();
  }
  window.FSEND = { mount, reload: load };
})();
