/* agreement-paper.js · A SIGNED PAPER CLIENT CARE AGREEMENT, UPLOADED AS A PDF (Samantha 2026-11-21: "need a way to upload a
   pdf of signed care agreement and pull the info from it"). Her answers: Accept COUNTS AS SIGNED (Start of Care, Driving tab,
   profile fill; the contacts then go through "Review contacts" on the agreement card like a tablet agreement); any version
   of the agreement is read. Her rule (no confirming each AI point): the office reads what the reader pulled, fixes any box,
   and presses one Accept. Server: agreement-paper (staff sign-in). The PDF opens only through the server's logged link.
     CAP.mount(slot, key, onDone)   key = { client_ax } | { lead_id }; shows uploads in review and the Upload button */
(function () {
  'use strict';
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const GROUP = { client: 'Client information', ci: 'Client information', c1: 'Contact 1', c2: 'Contact 2', c3: 'Contact 3', c4: 'Contact 4', poa: 'Legal representative (POA)',
    backup: 'Backup contact', access: 'How caregivers get in', car: 'Use of my car', vehicle: "The client's car", comm: 'Permission to communicate (email)', photos: 'Photos',
    level: 'Care level and rate (office)', rates: 'Rates (office)', esv: 'Early Support Visits (office)' };
  const ORDER = ['client', 'ci', 'c1', 'c2', 'c3', 'c4', 'poa', 'backup', 'access', 'car', 'vehicle', 'comm', 'photos', 'level', 'rates', 'esv'];
  const SKIP = k => /^(ini|sig|date)\./.test(k) || k.indexOf('ci.sig.') === 0 || k === 'poa.initials' || k === 'ci.client_s_name';
  const label = k => { const r = k.split('.').slice(1).join(' ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim(); return r.charAt(0).toUpperCase() + r.slice(1); };
  let FIELDS = null;
  async function fields() {
    if (FIELDS) return FIELDS;
    try { const r = await fetch('agreement-pages/rev-2026-11-19/fields.json'); const j = await r.json(); FIELDS = j.fields || j; }
    catch (e) { FIELDS = {}; }
    return FIELDS;
  }
  async function call(body) {
    const r = await sb.functions.invoke('agreement-paper', { body });
    if (r.error) { let j = null; try { if (r.error.context && r.error.context.json) j = await r.error.context.json(); } catch (_) {} throw new Error((j && j.error) || r.error.message || 'The server did not answer.'); }
    if (!r.data || r.data.error) throw new Error((r.data && r.data.error) || 'The server did not answer.');
    return r.data;
  }
  const when = iso => { const t = Date.parse(iso || ''); return Number.isFinite(t) ? new Date(t).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''; };

  function reviewHtml(p, F) {
    const rd = p.read || {}, a = p.answers || {}, unclear = {}; (rd.unclear || []).forEach(u => { unclear[u.key] = u.why; });
    const keys = Object.keys(F).filter(k => !SKIP(k));
    const groups = ORDER.map(g => [g, keys.filter(k => k.split('.')[0] === g)]).filter(x => x[1].length);
    const box = k => {
      const f = F[k] || {}, u = unclear[k], tag = u ? ' style="background:#FEF3C7;border-radius:6px;padding:4px 6px"' : '';
      const inner = f.type === 'check'
        ? `<label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" data-cap-k="${esc(k)}" ${a[k] === true ? 'checked' : ''} style="width:16px;height:16px"> ${esc(label(k))}</label>`
        : `<label style="display:flex;flex-direction:column;gap:2px;font-size:12px;color:var(--text-muted)">${esc(label(k))}<input type="text" maxlength="200" data-cap-k="${esc(k)}" value="${esc(a[k] || '')}" style="font-size:13px;min-height:32px"></label>`;
      return `<div${tag}>${inner}${u ? `<div style="font-size:11.5px;color:#92400E">Please look: ${esc(u)}</div>` : ''}</div>`;
    };
    const sec = ([g, ks]) => { const any = ks.some(k => a[k] === true || (typeof a[k] === 'string' && a[k]) || unclear[k]);
      return `<details ${any ? 'open' : ''} style="border-top:1px solid var(--border);padding:6px 0"><summary style="cursor:pointer;font-weight:700;color:var(--navy);font-size:13.5px">${esc(GROUP[g] || g)}${any ? '' : ' <span class="field-note">(nothing on the paper)</span>'}</summary>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px 12px;margin-top:6px">${ks.map(box).join('')}</div></details>`; };
    const warn = [!rd.client_signed && 'The reader did not find the family\'s signature. Check the PDF before you accept.',
      rd.client_name_on_paper && 'Name on the paper: ' + rd.client_name_on_paper + '. Make sure it is this client.'].filter(Boolean);
    return `<div class="card" style="padding:12px 14px;margin:8px 0;border:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><b style="color:var(--navy)">Paper agreement: ${esc(rd.version_label || 'version not known')}</b>
        <span style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" data-cap-open="${esc(p.id)}">Open the PDF</button></span></div>
      <div class="field-note" style="margin:4px 0">Signed by ${esc(rd.signer_name || 'not found')}${rd.signer_role === 'representative' ? ' (for the client)' : ''}${rd.signed_date ? ' on ' + esc(rd.signed_date) : ''}${rd.office_signed ? ' · office signature found' : ''} · read ${esc(when(p.read_at))} by ${esc(p.read_by || '')}</div>
      ${warn.map(w => `<div style="background:#FEE2E2;color:#B91C1C;border-radius:8px;padding:6px 10px;margin:4px 0;font-size:13px">${esc(w)}</div>`).join('')}
      ${rd.notes ? `<div class="field-note" style="margin:4px 0">Reader's note: ${esc(rd.notes)}</div>` : ''}
      ${(rd.unclear || []).length ? `<div style="font-size:13px;margin:4px 0;color:#92400E">${rd.unclear.length} answer${rd.unclear.length === 1 ? ' is' : 's are'} marked "Please look" below.</div>` : ''}
      ${(rd.not_on_this_version || []).length ? `<div class="field-note" style="margin:4px 0">This version did not ask ${rd.not_on_this_version.length} of today's questions; those stay blank.</div>` : ''}
      <div class="field-note" style="margin:6px 0 2px">Read it over and fix any box. Nothing is used until you press Accept.</div>
      ${groups.map(sec).join('')}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center">
        <button type="button" class="primary" data-cap-accept="${esc(p.id)}">Accept as the signed agreement</button>
        <button type="button" data-cap-save="${esc(p.id)}">Save my changes</button>
        <input type="text" maxlength="300" data-cap-why="${esc(p.id)}" placeholder="Why set it aside (wrong client, not signed, a copy)" style="flex:1;min-width:200px;font-size:13px">
        <button type="button" data-cap-aside="${esc(p.id)}">Set aside</button></div>
      <div class="field-note" style="margin-top:6px">Accept counts as the signed agreement: Start of Care is ticked, the Driving tab and the profile fill in, and the contacts wait for "Review contacts" on the card. The scan is printed, never emailed (its door codes cannot be hidden).</div>
      <div class="field-note" data-cap-msg="${esc(p.id)}" style="margin-top:4px"></div></div>`;
  }

  async function mount(slot, key, onDone) {
    if (!slot) return;
    const F = await fields();
    let papers = [];
    try { papers = (await call(Object.assign({ action: 'list' }, key))).papers || []; } catch (e) { slot.innerHTML = `<div class="field-note" style="color:#a33">${esc(e.message)}</div>`; return; }
    const review = papers.filter(p => p.status === 'review'), stuck = papers.filter(p => p.status === 'uploading');
    slot.innerHTML = `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0 2px">
        <label class="secondary" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;padding:6px 12px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-weight:600">Upload a signed paper agreement (PDF)<input type="file" accept="application/pdf" data-cap-file="1" style="display:none"></label>
        <span class="field-note">The Hub reads it and fills in the same boxes as the tablet. You check it, then Accept.</span></div>
      <div class="field-note" data-cap-top style="margin:2px 0"></div>
      ${stuck.map(p => `<div class="field-note" style="margin:2px 0">An upload from ${esc(when(p.created_at))} was not read yet. <button type="button" data-cap-read="${esc(p.id)}">Read it now</button></div>`).join('')}
      ${review.map(p => reviewHtml(p, F)).join('')}`;
    const top = slot.querySelector('[data-cap-top]');
    const msgOf = id => slot.querySelector(`[data-cap-msg="${id}"]`) || top;
    const collect = () => { const a = {}; slot.querySelectorAll('[data-cap-k]').forEach(i => { const k = i.dataset.capK; if (i.type === 'checkbox') { if (i.checked) a[k] = true; } else if (i.value.trim()) a[k] = i.value.trim(); }); return a; };
    const readIt = async (id) => { top.textContent = 'Reading the agreement. This takes about a minute…'; try { await call({ action: 'read', id }); top.textContent = ''; await mount(slot, key, onDone); } catch (e) { top.textContent = 'Not read: ' + e.message; top.style.color = '#a33'; } };
    slot.querySelector('[data-cap-file]').onchange = async (ev) => {
      const f = ev.target.files && ev.target.files[0]; if (!f) return;
      if (f.size > 15 * 1024 * 1024) { top.textContent = 'That PDF is over 15 MB. Scan it in black and white, then try again.'; return; }
      top.style.color = ''; top.textContent = 'Uploading…';
      try {
        const name = (typeof CP !== 'undefined' && CP && CP.r && CP.r.client_name) || '';
        const u = await call(Object.assign({ action: 'upload_url', name }, key));
        const put = await fetch(u.url, { method: 'PUT', headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'false' }, body: f });
        if (!put.ok) throw new Error('the upload did not finish (' + put.status + ')');
        await readIt(u.id);
      } catch (e) { top.textContent = 'Not uploaded: ' + e.message; top.style.color = '#a33'; }
    };
    slot.querySelectorAll('[data-cap-read]').forEach(b => { b.onclick = () => readIt(b.dataset.capRead); });
    slot.querySelectorAll('[data-cap-open]').forEach(b => { b.onclick = async () => { try { const r = await call({ action: 'open', id: b.dataset.capOpen }); window.open(r.url, '_blank', 'noopener'); } catch (e) { msgOf(b.dataset.capOpen).textContent = e.message; } }; });
    slot.querySelectorAll('[data-cap-save]').forEach(b => { b.onclick = async () => { const id = b.dataset.capSave; try { await call({ action: 'save', id, answers: collect() }); msgOf(id).textContent = 'Saved.'; } catch (e) { msgOf(id).textContent = 'Not saved: ' + e.message; } }; });
    slot.querySelectorAll('[data-cap-aside]').forEach(b => { b.onclick = async () => { const id = b.dataset.capAside, why = (slot.querySelector(`[data-cap-why="${id}"]`) || {}).value || '';
      try { await call({ action: 'set_aside', id, reason: why }); await mount(slot, key, onDone); } catch (e) { msgOf(id).textContent = e.message; } }; });
    slot.querySelectorAll('[data-cap-accept]').forEach(b => { b.onclick = async () => { const id = b.dataset.capAccept; b.disabled = true; msgOf(id).textContent = 'Saving and accepting…';
      try { await call({ action: 'save', id, answers: collect() }); await call({ action: 'accept', id }); if (typeof onDone === 'function') onDone(); else await mount(slot, key, onDone); }
      catch (e) { msgOf(id).textContent = 'Not accepted: ' + e.message; b.disabled = false; } }; });
  }
  window.CAP = { mount, _reviewHtml: reviewHtml };
})();
