/* agreement-review.js · Client Care Agreement, Stage 2 (Samantha 2026-10-16: "yes start stage 2").
   After the agreement is countersigned, the office reviews the signed Contacts & Permissions here and approves them.
   Approved contacts go to AxisCare responsible parties 1-3 (with HIPAA and Medical Decisions from the signed agreement)
   and to the Hub Family Circle, with running-late and caregiver-change texts exactly as ticked. Then a checklist of what
   AxisCare's API cannot set (family sign-in, email choices), done by hand and ticked off here.
   The office may fix typos in names, phones, emails and addresses; the family's signed choices are never edited here.
   Nothing is sent to the family. Opened by agreement-card.js (CAR.open). Server: client-agreement contacts* actions. */
(function () {
  'use strict';
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  async function call(body) {
    const { status, data } = await callAction('client-agreement', body);
    if (!data) throw new Error('The agreement service answered ' + status);
    if (status >= 400) throw new Error(data.error || ('The agreement service answered ' + status));
    return data;
  }
  const ask = async (msg) => (typeof ccConfirm === 'function' ? await ccConfirm(msg) : window.confirm(msg));
  const when = iso => { const t = Date.parse(iso || ''); return Number.isFinite(t) ? new Date(t).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''; };
  const yn = v => v === true ? 'Yes' : v === false ? 'No' : 'Not answered';
  const FIELDS = [['name', 'Name'], ['relationship', 'Relationship'], ['cell', 'Cell phone'], ['home', 'Home phone'], ['email', 'Email'], ['line1', 'Address'], ['city', 'City'], ['state', 'State'], ['zip', 'Zip']];
  const valOf = (c, k) => ['line1', 'city', 'state', 'zip'].includes(k) ? (c.address || {})[k] : c[k];

  function where(c) {
    const p = c.plan, ax = p.axiscare;
    const a = ax.action === 'update' ? `AxisCare slot ${ax.slot} (updates ${esc(c.name)}, already there)` : ax.action === 'add' ? `AxisCare slot ${ax.slot} (new)` : `<b>Family Circle only:</b> ${esc(ax.why || "AxisCare's three slots are taken")}`;
    return a + (ax.action === 'hub_only' ? '' : ' and the Family Circle') + (p.hub.action === 'update' ? ' (already in the Family Circle: updated, not added twice)' : '');
  }
  function choices(c) {
    const list = (o, names) => Object.keys(names).filter(k => o[k]).map(k => names[k]).join(', ') || 'none';
    return `<div class="field-note" style="margin-top:6px;line-height:1.6">Signed choices (from the agreement, not changed here):
      Health information (HIPAA): <b>${yn(c.hipaa)}</b> · Medical decisions: <b>${yn(c.medical)}</b> · POA: <b>${esc(c.poa.length ? c.poa.join(', ') : 'not marked')}</b><br>
      Texts: <b>${esc(list(c.texts, { late: 'running late', change: 'caregiver change' }))}</b> · AxisCare access: <b>${esc(list(c.axis, { care_notes: 'care notes', invoices: 'invoices' }))}</b>
      · Emails: <b>${esc(list(c.emails, { weekly_calendar: 'weekly calendar', care_plans: 'care plans', office_messages: 'office messages', invoices: 'invoices' }))}</b></div>`;
  }
  function done(rec) {
    const ax = rec.axiscare || {}, hub = rec.hub || {};
    const axTxt = { confirmed: `AxisCare slot ${ax.slot}: saved and checked`, saved_differently: `AxisCare slot ${ax.slot}: saved, but ${ax.detail || 'it reads back differently'}`,
      hub_only: 'not in AxisCare (its three slots are taken)', refused: `AxisCare refused: ${ax.detail || ''}`, unconfirmed: `AxisCare slot ${ax.slot}: ${ax.detail || 'not confirmed yet'}` }[ax.outcome] || '';
    const hubTxt = hub.outcome === 'saved' ? 'Family Circle: saved' : hub.outcome === 'failed' ? 'Family Circle: NOT saved (' + (hub.detail || '') + ')' : '';
    const good = rec.outcome === 'done', warn = ax.outcome === 'saved_differently';
    return `<div style="margin-top:6px;font-size:14px;color:${good ? (warn ? '#8a6d00' : '#0f7a4d') : '#a33'}">${good ? '✓' : '✗'} ${esc([axTxt, hubTxt].filter(Boolean).join(' · '))}${rec.by ? ` <span class="field-note">(${esc(rec.by)}, ${esc(when(rec.at))})</span>` : ''}${good ? '' : '<br><b>Not finished:</b> tick Approve and send again.'}</div>`;
  }

  async function open(box, id, onChange) {
    box.innerHTML = '<div class="field-note" style="padding:8px 0">Reading the signed contacts and AxisCare…</div>';
    let d;
    try { d = await call({ action: 'contacts', id }); }
    catch (e) { box.innerHTML = `<div class="field-note" style="color:#a33;padding:8px 0">${esc(e.message)}</div>`; return; }
    const review = d.review || {}, people = review.people || {};
    const cards = d.contacts.map(c => {
      const rec = people[c.n], fin = rec && (rec.outcome === 'done' || rec.outcome === 'left_out');
      const now = c.axiscare_now ? `<div class="field-note" style="margin-top:4px">AxisCare now: ${esc([c.axiscare_now.name, c.axiscare_now.phone, c.axiscare_now.email, c.axiscare_now.address].filter(Boolean).join(' · '))} · HIPAA ${yn(c.axiscare_now.hipaa_authorized)} · Medical decisions ${yn(c.axiscare_now.can_make_medical_decisions)}</div>` : '';
      return `<div class="card" data-car-n="${c.n}" style="padding:12px 14px;margin:8px 0;border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center">
          <div style="font-weight:800;color:var(--navy)">${c.n}. ${esc(c.name)}${c.relationship ? ' <span class="field-note">(' + esc(c.relationship) + ')</span>' : ''}</div>
          ${fin ? '' : `<label style="display:flex;gap:6px;align-items:center;font-weight:700"><input type="checkbox" data-car-inc="${c.n}" checked style="width:18px;height:18px"> Approve</label>`}</div>
        <div class="field-note" style="margin-top:4px">Goes to: ${where(c)}</div>${now}
        ${fin ? (rec.outcome === 'left_out' ? `<div class="field-note" style="margin-top:6px">Left out by ${esc(rec.by)} (${esc(when(rec.at))}).</div>` : done(rec)) : `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:6px 10px;margin-top:8px">${FIELDS.map(([k, l]) => `<label style="font-size:12px;font-weight:700;color:var(--navy)">${l}<input type="text" data-car-f="${c.n}.${k}" value="${esc(valOf(c, k))}" style="width:100%;margin-top:2px"></label>`).join('')}</div>
        ${c.bad_state ? '<div class="field-note" style="color:#8a6d00;margin-top:4px">AxisCare needs a 2-letter state, like MO. Fix it above, or AxisCare keeps the state it has.</div>' : ''}
        ${c.hub_now && c.hub_now.stopped ? '<div class="field-note" style="color:#a33;margin-top:4px">This person replied STOP: no texts go to them until they text START, whatever the agreement says.</div>' : ''}
        ${rec && rec.outcome !== 'done' && rec.outcome !== 'left_out' ? done(rec) : ''}`}
        ${choices(c)}</div>`;
    }).join('');
    const todo = d.contacts.flatMap(c => c.todo || []), ticks = review.todo || {};
    const pending = d.contacts.filter(c => { const r = people[c.n]; return !r || (r.outcome !== 'done' && r.outcome !== 'left_out'); });
    box.innerHTML = `<div style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px">
      <div style="font-weight:800;color:var(--navy);font-size:15px">Contacts &amp; Permissions from the signed agreement</div>
      <div class="field-note" style="margin:4px 0 6px">Check each person. Fix a typo if you see one; their signed choices stay as signed. Nothing is texted or emailed to them.</div>
      ${cards || '<div class="field-note">No contacts on this agreement.</div>'}
      ${pending.length ? `<p style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button type="button" class="primary" data-car-go="1">Approve and send to AxisCare and the Family Circle</button><span class="field-note" data-car-msg></span></p>` : ''}
      ${todo.length ? `<div style="margin-top:10px"><div style="font-weight:800;color:var(--navy)">To do in AxisCare by hand <span class="field-note">(AxisCare's connection cannot set these)</span></div>
        ${todo.map(x => `<label style="display:flex;gap:8px;align-items:flex-start;margin:6px 0;font-size:14px"><input type="checkbox" data-car-todo="${esc(x.key)}" ${ticks[x.key] ? 'checked' : ''} style="width:18px;height:18px;flex:none;margin-top:2px"><span>${esc(x.text)}${ticks[x.key] ? ` <span class="field-note">(done by ${esc(ticks[x.key].by)}, ${esc(when(ticks[x.key].at))})</span>` : ''}</span></label>`).join('')}</div>` : ''}
    </div>`;
    const go = box.querySelector('[data-car-go]');
    if (go) go.onclick = async () => {
      const msg = box.querySelector('[data-car-msg]');
      const asks = pending.map(c => {
        const inc = box.querySelector(`[data-car-inc="${c.n}"]`);
        const edits = {}; FIELDS.forEach(([k]) => { const i = box.querySelector(`[data-car-f="${c.n}.${k}"]`); if (i) edits[k] = i.value; });
        return { n: c.n, include: !!(inc && inc.checked), edits };
      });
      const yes = asks.filter(a => a.include), slots = pending.filter(c => yes.some(a => a.n === c.n) && c.plan.axiscare.slot).map(c => c.plan.axiscare.slot);
      if (!yes.length && !(await ask('Nobody is ticked Approve. Mark these contacts as left out?'))) return;
      if (yes.length && !(await ask(`Send ${yes.length} contact${yes.length > 1 ? 's' : ''} to the Family Circle${slots.length ? ' and AxisCare (slot ' + slots.join(', ') + ')' : ''}?\n\nIn AxisCare, HIPAA and Medical Decisions are set from the signed agreement. Nobody is texted or emailed.`))) return;
      go.disabled = true; go.textContent = 'Sending…'; msg.textContent = '';
      try {
        const r = await call({ action: 'contacts_apply', id, people: asks });
        const probs = (r.results || []).filter(x => x.outcome === 'problems');
        await open(box, id, onChange); if (onChange) onChange();
        if (probs.length) { const m = box.querySelector('[data-car-msg]'); if (m) { m.style.color = '#a33'; m.textContent = probs.map(p => p.n + ': ' + p.problems.join(' ')).join(' · '); } }
      } catch (e) { go.disabled = false; go.textContent = 'Approve and send to AxisCare and the Family Circle'; msg.style.color = '#a33'; msg.textContent = e.message; }
    };
    box.querySelectorAll('[data-car-todo]').forEach(cb => {
      cb.onchange = async () => {
        cb.disabled = true;
        try { await call({ action: 'contacts_todo', id, key: cb.dataset.carTodo, done: cb.checked }); await open(box, id, onChange); if (onChange) onChange(); }
        catch (e) { cb.checked = !cb.checked; cb.disabled = false; alert(e.message); }
      };
    });
  }
  window.CAR = { open };
})();
