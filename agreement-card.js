/* agreement-card.js · the Client Care Agreement card on a client's Start of Care tab (Stage 1, Samantha 2026-10-16).
   Lists this client's agreements (newest first), starts a new one on the tablet page (agreement.html), continues a draft,
   and opens a signed PDF (a 5-minute link; every open is logged on the server). Reads the page-level CP (never window.CP).
   Nothing here changes AxisCare or sends anything. */
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
  const go = (q) => { location.href = 'agreement.html?' + q; };

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
      const btn = a.status === 'countersigned' && a.has_pdf ? `<button type="button" class="primary" data-cag-open="${esc(a.id)}">Open signed PDF</button>`
        : (a.status === 'draft' || a.status === 'signed') ? `<button type="button" data-cag-go="${esc(a.id)}">${a.status === 'draft' ? 'Continue on the tablet' : 'Countersign'}</button>` : '';
      return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 0;border-top:1px solid var(--border)">
        <div><span style="font-size:12px;font-weight:700;border-radius:99px;padding:2px 9px;color:${st[1]};background:${st[2]}">${esc(st[0])}</span>
        <span class="field-note" style="margin-left:6px">${esc(a.version || '')} · started ${esc(when(a.created_at))}${who ? ' · ' + who : ''}${a.countersigned_at ? ' · signed ' + esc(when(a.countersigned_at)) : ''}${a.void_reason ? ' · ' + esc(a.void_reason) : ''}</span></div>${btn}</div>`;
    }).join('');
    box.innerHTML = `<div class="card" style="padding:14px;margin:10px 0">${head}
      <button type="button" class="primary" data-cag-new="1">${open.length ? 'Start another' : 'Start on the tablet'}</button></div>
      <div class="field-note" style="margin:6px 0 4px">The tablet shows the real agreement pages. The office or the family types into the blanks, the family taps their initials and signs, and the office countersigns. The signed PDF is saved here.</div>
      ${rows || '<div class="field-note" style="padding-top:6px">No agreement yet.</div>'}
      <div class="field-note" id="cagMsg" style="margin-top:6px"></div></div>`;
    box.querySelector('[data-cag-new]').onclick = () => go('ax=' + encodeURIComponent(ax));
    box.querySelectorAll('[data-cag-go]').forEach(b => { b.onclick = () => go('id=' + encodeURIComponent(b.dataset.cagGo)); });
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
