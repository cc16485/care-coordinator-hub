/* applicant-text.js (574, 2026-10-10). Samantha: "yes to all, build it": text an applicant from the Hub.
   One Text button wherever an applicant is (Applicants rows and page, the Interviews tab once they have booked, the
   phone's Find and Today screens), a composer that starts from a quick pick (her example: "we saw you started an
   application with us and have a client right now who may be a good fit for your experience and availability"),
   a "texted 2h ago by Krystal" chip on the card, the GoHighLevel thread with a reply box on their page, and Cancel
   asking whether they are cancelling or we are, with the message editable before it goes.
   The server (Staffing-Coordinator-Hub applicant-text) holds the words, the rules (their yes to texts, opt-out, 8am to
   6pm Central or held for 8am, STOP line) and the record (applicant_texts). This file only draws and asks. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m) => { try { (typeof ccToast === 'function' ? ccToast : alert)(m); } catch (e) { /* nothing to show it in */ } };
  const pretty = (p) => { const d = String(p || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : (p || ''); };
  const ago = (iso) => { if (!iso) return ''; const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); if (m < 1) return 'just now'; if (m < 60) return m + 'm ago'; const h = Math.round(m / 60); if (h < 24) return h + 'h ago'; const d = Math.round(h / 24); return d === 1 ? 'yesterday' : d + 'd ago'; };
  const when = (iso) => { try { return new Date(iso).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };
  const first = (s) => String(s || '').trim().split(/\s+/)[0] || '';

  async function call(body) {
    const { data, error } = await sb.functions.invoke('applicant-text', { body });
    if (error) { let msg = error.message || 'error'; try { const j = await error.context.json(); if (j && j.error) msg = j.error; } catch (e) { /* no body */ } throw new Error(msg); }
    if (data && data.error) throw new Error(data.error);
    return data || {};
  }

  /* ── the chips: the latest text per applicant ─────────────────────────────────────────────────────────────── */
  let LATEST = {};
  async function load() {
    try {
      const since = new Date(Date.now() - 90 * 86400000).toISOString();
      const { data, error } = await sb.from('applicant_texts').select('id,applicant_id,kind,status,send_after,created_at,created_by,sent_at,error').gte('created_at', since).order('created_at', { ascending: false }).limit(3000);
      if (error) throw error;
      LATEST = {};
      (data || []).forEach((r) => { if (!LATEST[r.applicant_id]) LATEST[r.applicant_id] = r; });
    } catch (e) { /* before the table exists, or offline: no chips */ }
    paint();
  }
  function chip(id) {
    const r = LATEST[id]; if (!r) return '';
    const by = first(r.created_by) ? ' by ' + esc(first(r.created_by)) : '';
    const what = r.kind === 'cancel' ? 'cancel notice' : 'text';
    if (r.status === 'held') return '<span class="apt-chip apt-held" title="Texts to applicants go 8am to 6pm. This one waits for the morning.">⏳ ' + what + ' waiting for ' + esc(when(r.send_after)) + by
      + ' <a href="#" onclick="event.preventDefault();event.stopPropagation();ApText.unhold(' + Number(r.id) + ')">take it back</a></span>';
    if (r.status === 'failed') return '<span class="apt-chip apt-bad" title="' + esc(r.error || '') + '">⚠️ ' + what + ' did not go ' + esc(ago(r.created_at)) + '</span>';
    if (r.status === 'sent') return '<span class="apt-chip" title="' + esc(new Date(r.sent_at || r.created_at).toLocaleString()) + '">💬 ' + (r.kind === 'cancel' ? 'cancel notice sent' : r.kind === 'reply' ? 'replied' : 'texted') + ' ' + esc(ago(r.sent_at || r.created_at)) + by + '</span>';
    return '';
  }
  function paint() { document.querySelectorAll('[data-aptext]').forEach((el) => { el.innerHTML = chip(el.getAttribute('data-aptext')); }); }
  /* the button and the chip, for any row: class 'fb' in the Hub, 'ph-b' on the phone */
  function btn(id, label, cls) { return '<button type="button" class="' + esc(cls || 'fb') + '" onclick="event.stopPropagation();ApText.open(\'' + esc(id) + '\')">💬 ' + esc(label || 'Text') + '</button>'; }
  function slot(id) { return '<span data-aptext="' + esc(id) + '">' + chip(id) + '</span>'; }

  /* ── the sheet (one at a time) ─────────────────────────────────────────────────────────────────────────────── */
  function css() {
    if (document.getElementById('apt-css')) return;
    const s = document.createElement('style'); s.id = 'apt-css';
    s.textContent = '#aptBack{position:fixed;inset:0;background:rgba(14,56,96,.42);z-index:10050;display:flex;align-items:center;justify-content:center;padding:12px}'
      + '#aptBox{background:#fff;border-radius:14px;width:100%;max-width:560px;max-height:94vh;overflow:auto;box-shadow:0 20px 60px rgba(14,56,96,.25);padding:18px 20px;font-family:inherit;color:#1F2A36}'
      + '#aptBox h3{margin:0 0 2px;font-size:17px;color:#0E3860}#aptBox label{text-align:left;justify-content:flex-start;font-weight:600;color:#1F2A36}#aptBox input[type=radio],#aptBox input[type=checkbox]{width:auto;flex:0 0 auto;margin:0 6px 0 0}#aptBox .apt-sub{font-size:12.5px;color:#6E6559;margin-bottom:10px}'
      + '#aptBox .apt-note{font-size:12.5px;border-radius:8px;padding:7px 10px;margin:8px 0}#aptBox .apt-wait{background:#FFF8E8;border:1px solid #F5D9A0;color:#8A5A00}#aptBox .apt-no{background:#FEE2E2;border:1px solid #FCA5A5;color:#991B1B}#aptBox .apt-ok{background:#F0FDF4;border:1px solid #BBF7D0;color:#166534}'
      + '#aptBox .apt-picks{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}#aptBox .apt-picks button{font:inherit;font-size:12.5px;padding:5px 10px;border-radius:999px;border:1.5px solid #CFE3E2;background:#F4FBFB;color:#0E3860;cursor:pointer}#aptBox .apt-picks button.on{background:#0E3860;color:#fff;border-color:#0E3860}'
      + '#aptBox textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;line-height:1.5;padding:10px;border:1.5px solid #CBD5E1;border-radius:10px;min-height:120px;resize:vertical}'
      + '#aptBox input[type=text]{width:100%;box-sizing:border-box;font:inherit;font-size:13.5px;padding:8px 10px;border:1.5px solid #CBD5E1;border-radius:8px}'
      + '#aptBox .apt-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}#aptBox .apt-row .sp{flex:1}'
      + '#aptBox .apt-b{font:inherit;font-size:13.5px;font-weight:700;padding:9px 16px;border-radius:9px;border:1.5px solid #CBD5E1;background:#fff;color:#0E3860;cursor:pointer}#aptBox .apt-b.p{background:#0E3860;color:#fff;border-color:#0E3860}#aptBox .apt-b.r{background:#B42318;color:#fff;border-color:#B42318}#aptBox .apt-b[disabled]{opacity:.55;cursor:default}'
      + '#aptBox .apt-cnt{font-size:11.5px;color:#A89C8B}#aptBox label.apt-ch{display:flex;gap:8px;align-items:flex-start;font-size:13.5px;margin-top:8px;cursor:pointer}#aptBox .apt-who{display:flex;gap:8px;margin:6px 0}#aptBox .apt-who label{flex:1;border:1.5px solid #CBD5E1;border-radius:10px;padding:8px 10px;font-size:13.5px;cursor:pointer;display:flex;gap:8px;align-items:center}#aptBox .apt-who label.on{border-color:#0E3860;background:#F4FBFB}'
      + '.apt-chip{display:inline-block;font-size:11.5px;font-weight:700;color:#0E3860;background:#E6F4F3;border-radius:999px;padding:2px 9px;white-space:nowrap}.apt-chip.apt-held{background:#FFF3D6;color:#8A5A00}.apt-chip.apt-bad{background:#FEE2E2;color:#991B1B}.apt-chip a{color:inherit;text-decoration:underline}'
      + '#aptBox .apt-thread{max-height:300px;overflow:auto;border:1px solid #E6E2DA;border-radius:10px;padding:6px 10px;margin-top:6px}';
    document.head.appendChild(s);
  }
  function close() { const b = document.getElementById('aptBack'); if (b) b.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function sheet(html) {
    css(); close();
    const b = document.createElement('div'); b.id = 'aptBack'; b.innerHTML = '<div id="aptBox" role="dialog" aria-modal="true">' + html + '</div>';
    b.addEventListener('click', (e) => { if (e.target === b) close(); });
    document.body.appendChild(b); document.addEventListener('keydown', onKey);
    return b.querySelector('#aptBox');
  }

  /* ── the composer ──────────────────────────────────────────────────────────────────────────────────────────── */
  async function open(id, opts) {
    opts = opts || {};
    const box = sheet('<h3>Text</h3><div class="apt-sub">Looking…</div>');
    let d;
    try { d = await call({ action: 'draft', id }); }
    catch (e) { box.innerHTML = '<h3>Text</h3><div class="apt-note apt-no">' + esc(e.message) + '</div><div class="apt-row"><span class="sp"></span><button class="apt-b" onclick="ApText.close()">Close</button></div>'; return; }
    const picks = d.picks || [];
    const start = opts.pick ? picks.find((p) => p.key === opts.pick) : null;
    box.innerHTML = '<h3>Text ' + esc(d.name || 'applicant') + '</h3>'
      + '<div class="apt-sub">' + (d.phone ? esc(pretty(d.phone)) + ' · from the office number, so it shows in GoHighLevel' : 'No phone number on their application') + '</div>'
      + (!d.can_text ? '<div class="apt-note apt-no">Can\'t text them: ' + esc(d.why_not || '') + '. Call or email instead.</div>' : '')
      + (d.can_text && d.waits ? '<div class="apt-note apt-wait">' + esc(d.waits) + '</div>' : '')
      + (d.can_text ? '<div class="apt-sub" style="margin:8px 0 0">Start from one of these, then change anything you like:</div>'
        + '<div class="apt-picks">' + picks.map((p) => '<button type="button" data-pick="' + esc(p.key) + '"' + (start && start.key === p.key ? ' class="on"' : '') + '>' + esc(p.label) + '</button>').join('') + '</div>'
        + '<textarea id="aptMsg" placeholder="Hi ' + esc(d.first || '') + ', this is ' + esc(d.me || '') + ' from Caring Companions. ">' + esc(start ? start.text : '') + '</textarea>'
        + '<div class="apt-cnt" id="aptCnt"></div>'
        + '<div class="apt-sub" style="margin-top:4px">"Reply STOP to opt out." is added when it goes.</div>' : '')
      + '<div class="apt-row"><span class="sp"></span><button class="apt-b" onclick="ApText.close()">' + (d.can_text ? 'Not now' : 'Close') + '</button>'
      + (d.can_text ? '<button class="apt-b p" id="aptSend">' + (d.in_hours ? 'Send' : 'Send at 8am') + '</button>' : '') + '</div>';
    if (!d.can_text) return;
    const ta = box.querySelector('#aptMsg'), cnt = box.querySelector('#aptCnt');
    const count = () => { const n = ta.value.length; cnt.textContent = n ? n + ' characters' + (n > 300 ? ' (a long text; it still goes as one message)' : '') : ''; };
    count(); ta.addEventListener('input', count);
    box.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => {
      const p = picks.find((x) => x.key === b.getAttribute('data-pick')); if (!p) return;
      box.querySelectorAll('[data-pick]').forEach((x) => x.classList.toggle('on', x === b));
      ta.value = p.text; count(); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    }));
    if (!start) { const own = picks.find((p) => p.key === 'own'); if (own && !ta.value) { ta.value = own.text; count(); } }
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    box.querySelector('#aptSend').addEventListener('click', async function () {
      const msg = ta.value.trim(); if (msg.length < 2) { ta.focus(); return; }
      this.disabled = true; this.textContent = 'Sending…';
      try {
        const r = await call({ action: 'send', id, message: msg, kind: opts.kind === 'reply' ? 'reply' : 'text' });
        if (r.held) toast('Held for 8am: ' + (d.first || 'they') + ' will get it in the morning.');
        else if (r.sent) toast('Sent to ' + (d.first || 'them') + '.');
        else { alert('Not sent: ' + ((r.not_sent || []).join('; ') || 'GoHighLevel did not accept it.')); }
        close(); load(); if (opts.after) { try { opts.after(r); } catch (e) { /* nothing */ } }
      } catch (e) { this.disabled = false; this.textContent = 'Send'; alert('Could not send: ' + e.message); }
    });
  }
  async function unhold(rowId) {
    if (!confirm('Take this text back so it is not sent at 8am?')) return;
    try { const r = await call({ action: 'unhold', row_id: rowId }); toast(r.unheld ? 'Taken back. Nothing will be sent.' : 'It had already gone.'); load(); }
    catch (e) { alert('Could not take it back: ' + e.message); }
  }

  /* ── cancel an interview: who is cancelling, and the words ─────────────────────────────────────────────────── */
  async function cancelOpen(id) {
    const box = sheet('<h3>Cancel the interview</h3><div class="apt-sub">Looking…</div>');
    let d;
    try { d = await call({ action: 'cancel_draft', id }); }
    catch (e) { box.innerHTML = '<h3>Cancel the interview</h3><div class="apt-note apt-no">' + esc(e.message) + '</div><div class="apt-row"><span class="sp"></span><button class="apt-b" onclick="ApText.close()">Close</button></div>'; return; }
    const how = d.can_text && d.email ? 'Goes as a text and as an email to ' + esc(d.email) + '.' : d.can_text ? 'Goes as a text (we have no email for them).' : d.email ? 'They did not say yes to texts (' + esc(d.why_not || '') + '), so this goes by email only, to ' + esc(d.email) + '.' : 'We cannot text them (' + esc(d.why_not || '') + ') and have no email, so no message can go. Call them.';
    box.innerHTML = '<h3>Cancel ' + esc(d.name || 'their') + '\'s interview</h3>'
      + '<div class="apt-sub">' + esc(d.booked ? d.booked.day + ' at ' + d.booked.time : '') + ' · to pick a new time with them now, use Move instead; this only cancels.</div>'
      + '<div class="apt-who">'
      + '<label class="on"><input type="radio" name="aptBy" value="applicant" checked> They asked to cancel</label>'
      + '<label><input type="radio" name="aptBy" value="office"> We need to cancel</label></div>'
      + '<input type="text" id="aptReason" placeholder="Why (kept on the booking, never sent to them)">'
      + '<label class="apt-ch"><input type="checkbox" id="aptSendIt" checked' + (!d.can_text && !d.email ? ' disabled' : '') + '> <span>Send them this message (change any of it)</span></label>'
      + '<textarea id="aptMsg">' + esc(d.drafts.applicant) + '</textarea>'
      + '<div class="apt-note ' + (!d.can_text && !d.email ? 'apt-no' : 'apt-ok') + '">' + how + (d.waits && (d.can_text || d.email) ? ' ' + esc(d.waits) : '') + '</div>'
      + '<div class="apt-sub">The text gets "Reply STOP to opt out." The email carries the same words with the subject "' + esc(d.subject || '') + '".</div>'
      + '<div class="apt-row"><span class="sp"></span><button class="apt-b" onclick="ApText.close()">Keep it</button><button class="apt-b r" id="aptGo">Cancel the interview</button></div>';
    const ta = box.querySelector('#aptMsg'), sendIt = box.querySelector('#aptSendIt');
    const edited = { applicant: false, office: false }; let cur = 'applicant';
    ta.addEventListener('input', () => { edited[cur] = true; });
    box.querySelectorAll('input[name=aptBy]').forEach((r) => r.addEventListener('change', () => {
      box.querySelectorAll('.apt-who label').forEach((l) => l.classList.toggle('on', l.querySelector('input').checked));
      const nxt = box.querySelector('input[name=aptBy]:checked').value;
      if (!edited[cur] || confirm('Replace your edited message with the ' + (nxt === 'office' ? '"we need to cancel"' : '"as you asked"') + ' wording?')) { ta.value = d.drafts[nxt]; edited[nxt] = false; }
      cur = nxt;
    }));
    sendIt.addEventListener('change', () => { ta.disabled = !sendIt.checked; });
    if (!d.can_text && !d.email) { sendIt.checked = false; ta.disabled = true; }
    box.querySelector('#aptGo').addEventListener('click', async function () {
      const by = box.querySelector('input[name=aptBy]:checked').value, send = !!sendIt.checked, message = ta.value.trim();
      if (send && message.length < 2) { ta.focus(); return; }
      this.disabled = true; this.textContent = 'Cancelling…';
      try {
        const r = await call({ action: 'cancel_interview', id, by, reason: box.querySelector('#aptReason').value.trim(), send, message });
        const tail = !send ? ' No message was sent.' : r.held ? ' The message waits for 8am.' : r.sent ? (' ' + [r.texted ? 'Texted' : '', r.emailed ? 'emailed' : ''].filter(Boolean).join(' and ') + '.') : ' The message could not go: ' + ((r.not_sent || []).join('; ') || 'see Needs Attention') + '.';
        toast('Interview cancelled.' + tail); close(); load();
        try { if (typeof AP_ROWS !== 'undefined' && AP_ROWS.length && typeof apLoad === 'function') await apLoad(); } catch (e) { /* list not open */ }
        try { if (document.getElementById('ivqList') && typeof ivqLoad === 'function') ivqLoad(); } catch (e) { /* tab not open */ }
      } catch (e) { this.disabled = false; this.textContent = 'Cancel the interview'; alert('Could not cancel it: ' + e.message); }
    });
  }

  /* ── their GoHighLevel thread, on their page, with a reply box ─────────────────────────────────────────────── */
  function threadHtml(r) {
    const id = esc(r.id);
    return '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
      + '<span class="field-note" id="gt_ap_meta"></span><span class="sp" style="flex:1"></span>'
      + '<button class="linklike" type="button" onclick="ghlThread(\'gt_ap\', {phone:' + JSON.stringify(String(r.phone || '')) + ', email:' + JSON.stringify(String(r.email || '')) + '})">↻ Load</button>'
      + '<a class="linklike" id="gt_ap_open" href="#" target="_blank" rel="noopener" style="display:none;">Open in GHL ↗</a></div>'
      + '<div id="gt_ap" style="margin-top:8px;"><div class="field-note">Not loaded. Press Load to see what we have sent and received.</div></div>'
      + '<div style="display:flex;gap:8px;margin-top:10px;align-items:flex-start;">'
      + '<textarea id="apReplyBox" placeholder="Reply by text…" style="flex:1;font:inherit;font-size:13.5px;padding:8px 10px;border:1.5px solid #CBD5E1;border-radius:9px;min-height:40px;resize:vertical;box-sizing:border-box"></textarea>'
      + '<button type="button" class="fb" onclick="ApText.reply(\'' + id + '\')">Send</button></div>'
      + '<div class="field-note" style="margin-top:4px">Goes from the office number with "Reply STOP to opt out." added, 8am to 6pm (held for 8am otherwise). ' + slot(r.id) + '</div>';
  }
  async function reply(id) {
    const ta = document.getElementById('apReplyBox'); if (!ta) return;
    const msg = ta.value.trim(); if (msg.length < 2) { ta.focus(); return; }
    const b = ta.nextElementSibling; if (b) { b.disabled = true; b.textContent = 'Sending…'; }
    try {
      const r = await call({ action: 'send', id, message: msg, kind: 'reply' });
      if (r.held) toast('Held for 8am.'); else if (r.sent) toast('Sent.'); else alert('Not sent: ' + ((r.not_sent || []).join('; ') || 'GoHighLevel did not accept it.'));
      if (r.sent || r.held) ta.value = '';
      load();
      const lb = document.querySelector('#gt_ap_meta ~ button'); if (r.sent && lb) setTimeout(() => lb.click(), 1500);
    } catch (e) { alert('Could not send: ' + e.message); }
    finally { if (b) { b.disabled = false; b.textContent = 'Send'; } }
  }

  window.ApText = { open, close, unhold, cancelOpen, btn, slot, chip, load, paint, threadHtml, reply, ago, _latest: () => LATEST };
})();
