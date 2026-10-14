/* =====================================================================================================================
   NURSE VISITS: READY TO BILL (LPN nurse visit plan step 8, Samantha approved 2026-10-14; Desktop 707)
   One card on Nurse Scheduling. Everything comes from the server function nurse-visit-check (Staffing repo), which reads
   AxisCare and checks each completed nurse visit: authorized on the state care plan, one a day, 26 in the six-month period,
   documented, and an LPN's GHE signed by the RN. This card shows:
     · the nurse visits NOT ready to bill, each with its reasons, and a button that copies the list for the AxisCare
       billing team (AxisCare's managed Medicaid Billing makes the claims, so the office tells them what to hold)
     · any do-not-bill holds the Hub set in AxisCare (only with nurse_bill_hold_live on)
     · authorized against used nurse visits per client for this six-month period
   Nothing on this card writes anything; "Check now" asks the server to check again. No em dashes.
     NurseBilling.mount(tabId)   the card is placed under the care plan box (#mcpCard), once
   ===================================================================================================================== */
(function(){
  'use strict';
  const FN = 'nurse-visit-check';
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const day = d => { if(!d) return ''; try{ return new Date(String(d).slice(0,10) + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); }catch(_){ return String(d); } };
  const central = iso => { try{ return new Date(iso).toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }); }catch(_){ return String(iso || ''); } };
  let EL = null, DATA = null, MSG = '', BUSY = false, LOADED = 0;

  async function call(body){
    try{
      const r = await sb.functions.invoke(FN, { body });
      if(r.error){ let j = null; try{ if(r.error.context && typeof r.error.context.json === 'function') j = await r.error.context.json(); }catch(_){}
        const st = r.error.context && r.error.context.status;
        return { ok:false, missing: st === 404, error:(j && j.error) || r.error.message || 'The nurse visit check did not answer.' }; }
      if(!r.data || r.data.ok === false) return { ok:false, error:(r.data && r.data.error) || 'The nurse visit check did not answer.' };
      return { ok:true, data:r.data };
    }catch(e){ return { ok:false, error:'Could not reach the nurse visit check: ' + ((e && e.message) || 'no answer') }; }
  }

  function mount(tabId){
    const tab = document.getElementById(tabId || 'tab-nursevisits'); if(!tab) return;
    EL = document.getElementById('nbCard');
    const fresh = !EL;
    if(!EL){
      EL = document.createElement('div'); EL.id = 'nbCard'; EL.className = 'card'; EL.style.cssText = 'padding:16px 18px;margin-bottom:16px;';
      const after = document.getElementById('mcpCard');
      if(after && after.parentNode === tab) after.insertAdjacentElement('afterend', EL); else tab.appendChild(EL);
      EL.innerHTML = '<div class="field-note">Reading the nurse visit check…</div>';
    }
    /* Nurse Scheduling redraws often (after every save): the server is asked again at most once a minute */
    if(!fresh && DATA && DATA.ok && Date.now() - LOADED < 60000) draw(); else load();
  }
  async function load(){ LOADED = Date.now(); const r = await call({ action:'report' }); DATA = r; draw(); }
  async function checkNow(){
    if(BUSY) return; BUSY = true; MSG = 'Checking AxisCare now…'; draw();
    const r = await call({ action:'run' }); BUSY = false;
    if(r.ok){ MSG = 'Checked just now: ' + (r.data.visits_checked || 0) + ' nurse visit' + (r.data.visits_checked === 1 ? '' : 's') + ', ' + (r.data.not_ready || 0) + ' not ready.'
      + (r.data.read_failed ? ' AxisCare could not be read for ' + r.data.read_failed + ' client' + (r.data.read_failed === 1 ? '' : 's') + '; they keep their last check.' : '');
      if(r.data.report) DATA = { ok:true, data:r.data.report }; else await load(); }
    else MSG = r.error;
    draw();
  }
  function billingText(rows){
    return ['Nurse visits NOT ready to bill (do not bill these yet), from the Caring Companions Hub, ' + new Date().toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) + ':', '']
      .concat(rows.map(x => '- ' + day(x.date) + ', ' + (x.client || 'client') + ', ' + (x.service || 'nurse visit') + (x.nurse ? ', ' + x.nurse : '') + ' (AxisCare visit ' + x.visit_id + '): ' + (x.reasons || []).join(' ')))
      .concat(['', 'We will tell you when each one is ready.']).join('\n');
  }
  async function copyList(){
    const rows = (DATA && DATA.data && DATA.data.not_ready) || []; const t = billingText(rows);
    try{ await navigator.clipboard.writeText(t); MSG = 'Copied. Paste it into your message to the AxisCare billing team.'; }
    catch(_){ const ta = EL.querySelector('#nbCopyText'); if(ta){ ta.style.display = 'block'; ta.value = t; ta.select(); } MSG = 'Select the text below and copy it.'; }
    draw(true);
  }

  function draw(keepText){
    if(!EL || !EL.isConnected) return;
    const head = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><b style="font-size:15px;color:var(--navy);">Nurse visits: ready to bill?</b>'
      + '<span class="field-note">Each completed nurse visit in AxisCare, checked: authorized on the state care plan, one a day, at most 26 in six months, documented, and an LPN\'s GHE signed by the RN.</span>'
      + '<span style="flex:1;"></span><button class="secondary" id="nbCheck"' + (BUSY ? ' disabled' : '') + '>Check now</button></div>';
    let body = '';
    if(!DATA){ body = '<div class="field-note" style="margin-top:8px;">Reading…</div>'; }
    else if(!DATA.ok){ body = '<div class="field-note" style="margin-top:8px;">' + (DATA.missing ? 'This appears once Desktop step 707 has run.' : esc(DATA.error)) + '</div>'; }
    else {
      const d = DATA.data, nr = d.not_ready || [], holds = d.holds || [], cl = d.clients || [];
      const mode = d.live ? '<span class="tag-chip" style="background:#DCFCE7;color:#15803D;font-weight:700;">Cards on</span>' : '<span class="tag-chip" style="background:#FEF3C7;color:#92400E;font-weight:700;">Practice: shown here, no cards</span>';
      const hold = d.hold_live ? '<span class="tag-chip" style="background:#DCFCE7;color:#15803D;font-weight:700;">Do-not-bill hold on</span>' : '<span class="tag-chip">Do-not-bill hold off</span>';
      body += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px;">' + mode + hold
        + '<span class="field-note" style="margin:0;">' + (d.checked_at ? 'Last checked ' + esc(central(d.checked_at)) : 'Not checked yet') + (d.services_from === 'settings' ? ' · service list from the Admin page' : ' · built-in service list') + '</span></div>';
      if(MSG) body += '<div class="field-note" style="margin-top:6px;color:var(--navy);font-weight:600;">' + esc(MSG) + '</div>';
      body += '<div style="margin-top:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b style="font-size:13.5px;">Not ready to bill (' + nr.length + ')</b>'
        + (nr.length ? '<button class="ghost" id="nbCopy" style="padding:2px 10px;font-size:12px;">Copy the list for AxisCare billing</button>' : '') + '</div>'
        + '<textarea id="nbCopyText" readonly style="display:none;width:100%;min-height:90px;margin-top:6px;font-size:12px;"></textarea>';
      body += nr.length ? '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:6px;"><thead><tr>'
          + ['Visit', 'Client', 'Service and nurse', 'Why it is not ready', 'In AxisCare'].map(h => '<th style="text-align:left;padding:6px;border-bottom:1px solid var(--border);font-size:12px;">' + h + '</th>').join('') + '</tr></thead><tbody>'
          + nr.map(x => '<tr><td style="padding:6px;border-top:1px solid var(--border);white-space:nowrap;">' + esc(day(x.date)) + '</td><td style="padding:6px;border-top:1px solid var(--border);"><b>' + esc(x.client) + '</b></td>'
            + '<td style="padding:6px;border-top:1px solid var(--border);">' + esc(x.service) + (x.nurse ? '<div class="field-note">' + esc(x.nurse) + (x.cred ? ' (' + esc(x.cred) + ')' : '') + '</div>' : '') + '</td>'
            + '<td style="padding:6px;border-top:1px solid var(--border);min-width:220px;">' + (x.reasons || []).map(r => '<div>' + esc(r) + '</div>').join('') + '</td>'
            + '<td style="padding:6px;border-top:1px solid var(--border);" class="field-note">' + (x.hold && x.hold.state === 'held' ? 'Do-not-bill set by the Hub ' + esc(central(x.hold.set_at)) : x.office_marked ? 'Already marked do-not-bill by the office' : x.would_hold ? (d.hold_live ? 'Hold not set yet' : 'Would be held (hold off)') : '') + '</td></tr>').join('')
          + '</tbody></table></div>'
        : '<div class="field-note" style="margin-top:6px;">Every completed nurse visit from the last 120 days that AxisCare showed is ready to bill' + (d.ready_count ? ' (' + d.ready_count + ')' : '') + '.</div>';
      if(holds.length) body += '<div style="margin-top:12px;"><b style="font-size:13.5px;">Held from billing by the Hub (' + holds.length + ')</b><div class="field-note">The Hub takes each hold off by itself once the visit is ready. It never touches a do-not-bill the office set.</div>'
        + holds.map(x => '<div style="font-size:13px;padding:3px 0;">' + esc(day(x.date)) + ', ' + esc(x.client) + ', ' + esc(x.service) + '</div>').join('') + '</div>';
      body += '<div style="margin-top:14px;"><b style="font-size:13.5px;">Authorized and used this six-month period</b><div class="field-note">From the state care plan uploaded above. Missouri pays at most 26 nurse visits in six months and one a day.</div>'
        + (cl.length ? '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:6px;"><thead><tr>'
            + ['Client', 'Period', 'Authorized', 'Used', 'Not ready'].map(h => '<th style="text-align:left;padding:6px;border-bottom:1px solid var(--border);font-size:12px;">' + h + '</th>').join('') + '</tr></thead><tbody>'
            + cl.map(c => '<tr><td style="padding:6px;border-top:1px solid var(--border);"><b>' + esc(c.client || ('AxisCare ' + c.ax)) + '</b>' + (c.stale ? '<div class="field-note">AxisCare could not be read last time: these are the numbers before.</div>' : '') + '</td>'
              + '<td style="padding:6px;border-top:1px solid var(--border);">' + (c.period ? esc(day(c.period.from)) + ' to ' + esc(day(c.period.to)) : '<span class="field-note">' + esc(c.period_note ? 'Not known: ' + c.period_note : 'Not known') + '</span>') + '</td>'
              + '<td style="padding:6px;border-top:1px solid var(--border);">' + (c.authorized == null ? '<span class="field-note">no units on the plan</span>' : esc(c.authorized)) + '</td>'
              + '<td style="padding:6px;border-top:1px solid var(--border);' + (c.authorized != null && c.used > c.authorized ? 'color:#B91C1C;font-weight:700;' : '') + '">' + esc(c.used) + ' of at most ' + esc(c.cap) + '</td>'
              + '<td style="padding:6px;border-top:1px solid var(--border);">' + (c.not_ready ? '<b style="color:#B91C1C;">' + esc(c.not_ready) + '</b>' : '0') + '</td></tr>').join('')
            + '</tbody></table></div>'
          : '<div class="field-note" style="margin-top:6px;">No client with a state care plan or nurse needs was checked yet.</div>') + '</div>';
      if(!d.live) body += '<div class="field-note" style="margin-top:10px;">Practice: no cards are made until the "Nurse visit checks" switch is on (Owners Hub, Admin). The do-not-bill hold needs its own switch and AxisCare\'s billing team agreeing to skip visits marked do-not-bill.</div>';
    }
    const ta = keepText && EL.querySelector('#nbCopyText'), keep = ta && ta.style.display === 'block' ? ta.value : '';
    EL.innerHTML = head + body;
    if(keep){ const t2 = EL.querySelector('#nbCopyText'); t2.style.display = 'block'; t2.value = keep; }
    const b = EL.querySelector('#nbCheck'); if(b) b.onclick = checkNow;
    const c = EL.querySelector('#nbCopy'); if(c) c.onclick = copyList;
  }

  window.NurseBilling = { mount, billingText };
})();
