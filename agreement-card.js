/* agreement-card.js · the Client Care Agreement card on a client's Start of Care tab (Stage 1, Samantha 2026-10-16).
   Lists this client's agreements (newest first), starts a new one on the tablet page (agreement.html), continues a draft,
   and opens a signed PDF (a 5-minute link; every open is logged on the server). Reads the page-level CP (never window.CP).
   Stage 2 (872): a countersigned agreement shows where its Contacts & Permissions stand and a "Review contacts" button
   that opens the office review (agreement-review.js, CAR.open). Nothing is sent to the family from here.
   873: "Print family copy" (the big "COPY" version to hand them) and "Email family copy" (asks the address first; the
   copy goes through GoHighLevel with the codes hidden, 8am to 6pm), with how the last email went. */
(function () {
  'use strict';
  const esc = t => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(t) : String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  async function call(body) {
    const { status, data } = await callAction('client-agreement', body);
    if (!data) throw new Error('The agreement service answered ' + status);
    if (status >= 400) { const e = new Error(data.error || ('The agreement service answered ' + status)); e.outcome = data.outcome; throw e; }
    return data;
  }
  const when = iso => { const t = Date.parse(iso || ''); return Number.isFinite(t) ? new Date(t).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''; };
  const STATUS = { draft: ['Started, not signed', '#8a6d00', '#fff7e0'], signed: ['Signed by the family, waiting for the office', '#8a6d00', '#fff7e0'],
    countersigned: ['Signed', '#0f7a4d', '#e8f6ef'], void: ['Set aside', '#6b7280', '#f2f0e9'] };
  /* 874: the client's name rides along so a sign-from-home text can say who the agreement is for */
  const go = (q) => { const cn = (typeof CP !== 'undefined' && CP && CP.r && CP.r.client_name) || ''; location.href = 'agreement.html?' + q + (cn ? '&cn=' + encodeURIComponent(cn) : ''); };
  const at = iso => { const t = Date.parse(iso || ''); return Number.isFinite(t) ? new Date(t).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''; };
  function homeLine(a) {
    const l = a.link
    if (a.status === 'signed' && a.signed_from_home) return ' · <b style="color:#8a6d00">signed from home: countersign it</b>'
    if (!l || a.status !== 'draft') return ''
    if (l.live) return ` · sent to ${esc(l.to_name)} to sign from home ${esc(at(l.created_at))} · ${l.verified_at ? 'opened, code checked ' + esc(at(l.verified_at)) : l.opened_at ? 'opened ' + esc(at(l.opened_at)) : 'not opened yet'} · works until ${esc(at(l.expires_at))}`
    return l.revoked_by === 'not delivered' ? ' · <span style="color:#a33">the home link could not be sent</span>' : ''
  }

  async function mount(boxId) {
    const box = document.getElementById(boxId); if (!box) return;
    const ax = String((typeof CP !== 'undefined' && CP && CP.ax) || '');
    const head = '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><div style="font-weight:800;color:var(--navy);font-size:15px">📝 Client Care Agreement</div>';
    if (!/^\d{1,12}$/.test(ax)) {
      box.innerHTML = '<div class="card" style="padding:14px;margin:10px 0">' + head + '</div><div class="field-note" style="margin-top:6px">The agreement can be signed on the tablet once this client is in AxisCare.</div></div>';
      return;
    }
    box.innerHTML = '<div class="card" style="padding:14px;margin:10px 0">' + head + '</div><div class="field-note" style="margin-top:6px">Loading…</div></div>';
    let list = [];
    try { list = (await call({ action: 'list', client_ax: ax })).agreements || []; }
    catch (e) { box.innerHTML = '<div class="card" style="padding:14px;margin:10px 0">' + head + '</div><div class="field-note" style="margin-top:6px;color:#a33">' + esc(e.message) + '</div></div>'; return; }
    const open = list.filter(a => a.status === 'draft' || a.status === 'signed');
    const rows = list.map(a => {
      const st = STATUS[a.status] || [a.status, '#555', '#eee'];
      const who = a.signer ? esc(a.signer.name) + (a.signer.role === 'representative' ? ' (for the client)' : '') : '';
      const rv = a.contacts_review, ppl = rv && rv.people ? Object.values(rv.people) : [];
      const cst = a.status !== 'countersigned' ? '' : !ppl.length ? ['Contacts not reviewed yet', '#8a6d00', '#fff7e0']
        : ppl.some(p => p.outcome === 'needs_another_try') ? ['Contacts: needs another try', '#a33', '#fdf0f0'] : ['Contacts reviewed', '#0f7a4d', '#e8f6ef'];
      const rbtn = a.status === 'countersigned' ? `<button type="button" data-cag-rev="${esc(a.id)}">${ppl.length ? 'Contacts and checklist' : 'Review contacts'}</button>` : '';
      const em = (a.copies && a.copies.emails) || [], last = em[em.length - 1]
      const mailNote = last ? (last.outcome === 'sent' ? ` · family copy emailed to ${esc(last.to)} ${esc(when(last.at))}` : ` · <span style="color:#a33">family copy not emailed: ${esc(last.detail || last.outcome)}</span>`) : ''
      const copyBtns = a.status === 'countersigned' && a.has_pdf ? `<button type="button" data-cag-print="${esc(a.id)}">Print family copy</button>${a.answers && a.answers['comm.decline'] === true ? '' : `<button type="button" data-cag-mail="${esc(a.id)}">Email family copy</button>`}` : ''
      const btn = a.status === 'countersigned' && a.has_pdf ? `<span style="display:flex;gap:6px;flex-wrap:wrap">${rbtn}${copyBtns}<button type="button" class="primary" data-cag-open="${esc(a.id)}">Open signed PDF</button></span>`
        : (a.status === 'draft' || a.status === 'signed') ? `<button type="button" data-cag-go="${esc(a.id)}">${a.status === 'draft' ? 'Continue on the tablet' : 'Countersign'}</button>` : '';
      return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 0;border-top:1px solid var(--border)">
        <div><span style="font-size:12px;font-weight:700;border-radius:99px;padding:2px 9px;color:${st[1]};background:${st[2]}">${esc(st[0])}</span>
        ${cst ? `<span style="font-size:12px;font-weight:700;border-radius:99px;padding:2px 9px;margin-left:4px;color:${cst[1]};background:${cst[2]}">${esc(cst[0])}</span>` : ''}
        <span class="field-note" style="margin-left:6px">${esc(a.version || '')} · started ${esc(when(a.created_at))}${who ? ' · ' + who : ''}${a.countersigned_at ? ' · signed ' + esc(when(a.countersigned_at)) : ''}${a.void_reason ? ' · ' + esc(a.void_reason) : ''}${mailNote}${homeLine(a)}</span></div>${btn}</div>
        ${a.status === 'countersigned' ? `<div data-cag-revbox="${esc(a.id)}"></div>` : ''}`;
    }).join('');
    box.innerHTML = `<div class="card" style="padding:14px;margin:10px 0">${head}
      <button type="button" class="primary" data-cag-new="1">${open.length ? 'Start another' : 'Start on the tablet'}</button></div>
      <div class="field-note" style="margin:6px 0 4px">The tablet shows the real agreement pages. The office or the family types into the blanks, the family taps their initials and signs, and the office countersigns. The signed PDF is saved here. To have them sign from home, open it and use "Send to sign from home".</div>
      ${rows || '<div class="field-note" style="padding-top:6px">No agreement yet.</div>'}
      <div class="field-note" id="cagMsg" style="margin-top:6px"></div></div>`;
    box.querySelector('[data-cag-new]').onclick = () => go('ax=' + encodeURIComponent(ax));
    box.querySelectorAll('[data-cag-go]').forEach(b => { b.onclick = () => go('id=' + encodeURIComponent(b.dataset.cagGo)); });
    box.querySelectorAll('[data-cag-rev]').forEach(b => {
      b.onclick = () => {
        const slot = box.querySelector(`[data-cag-revbox="${b.dataset.cagRev}"]`);
        if (slot.innerHTML) { slot.innerHTML = ''; return; }
        const show = () => window.CAR.open(slot, b.dataset.cagRev, null);
        if (window.CAR) show(); else { const sc = document.createElement('script'); sc.src = 'agreement-review.js?v=20261018b'; sc.onload = show; document.head.appendChild(sc); }
      };
    });
    box.querySelectorAll('[data-cag-print]').forEach(b => {
      b.onclick = async () => {
        const msg = box.querySelector('#cagMsg'); b.disabled = true;
        try { const r = await call({ action: 'copy_print', id: b.dataset.cagPrint }); window.open(r.url, '_blank', 'noopener'); msg.textContent = ''; }
        catch (e) { msg.textContent = e.message; msg.style.color = '#a33'; }
        b.disabled = false;
      };
    });
    box.querySelectorAll('[data-cag-mail]').forEach(b => {
      b.onclick = async () => {
        const a = list.find(x => x.id === b.dataset.cagMail) || {}, ans = a.answers || {}
        const def = [ans['c1.email'], ans['poa.email']].map(x => String(x || '').trim()).find(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)) || ''
        const ask = typeof ccPrompt === 'function' ? ccPrompt : (m, d) => Promise.resolve(window.prompt(m, d))
        const to = await ask('Email the family\'s copy (big "COPY", lockbox and garage codes hidden) to:', def)
        if (to == null || !String(to).trim()) return
        const msg = box.querySelector('#cagMsg'); b.disabled = true; b.textContent = 'Sending…'
        try { const r = await call({ action: 'copy_email', id: b.dataset.cagMail, to: String(to).trim() }); msg.textContent = r.email.detail; msg.style.color = r.email.outcome === 'sent' ? '#0f7a4d' : '#a33'; }
        catch (e) { msg.textContent = e.message; msg.style.color = '#a33'; }
        b.disabled = false; b.textContent = 'Email family copy';
      };
    });
    box.querySelectorAll('[data-cag-open]').forEach(b => {
      b.onclick = async () => {
        const msg = box.querySelector('#cagMsg'); b.disabled = true; b.textContent = 'Opening…';
        try { const r = await call({ action: 'open', id: b.dataset.cagOpen }); window.open(r.url, '_blank', 'noopener'); msg.textContent = ''; }
        catch (e) { msg.textContent = e.message; msg.style.color = '#a33'; }
        b.disabled = false; b.textContent = 'Open signed PDF';
      };
    });
  }
  window.CAG = { mount };
})();
