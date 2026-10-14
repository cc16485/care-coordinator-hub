/* =====================================================================================================================
   LPN HIRING (Samantha approved the LPN nurse visit plan, 2026-10-14; Natasha Early is our W-2 RN). Two small things for the
   Hub page, in their own file:
   1. CCPositions: the position on an offer as a key ('caregiver', 'cna', 'lpn', 'rn', 'care_coordinator'), the same reading as
      the server's positions.ts, and THE one "offer signed" rule: the letter, plus the caregiver position description unless the
      offer is an LPN or RN offer (letter only). For every offer without an LPN or RN key it is exactly the old rule.
   2. NurseHire: the nurse forms on the readiness card (only on an LPN or RN card): the Nursys QuickConfirm check, the 7-topic
      nurse orientation, the signed Section 2 statement (with the printable statement and checklist), the nurse setup shown at
      Approve to Work, and the LPN packet tick on Verify Viventium Step 2. The page decides nothing: the server checks every
      field and refuses anything else. Caregiver cards never show any of it.
   ===================================================================================================================== */
(function(){
  'use strict';
  const KEYS = ['caregiver', 'cna', 'lpn', 'rn', 'care_coordinator'];
  const validKey = v => { const k = String(v == null ? '' : v).trim().toLowerCase(); return KEYS.indexOf(k) > -1 ? k : null; };
  /** the mapping helper (the server's positionKeyOf, the same words): unknown words such as Office are null */
  function keyOf(text){
    const t = String(text == null ? '' : text).trim(); if(!t) return null;
    const k = validKey(t.replace(/[\s-]+/g, '_')); if(k) return k;
    if(/\bL\.?P\.?N\.?\b|licensed\s+practical|licensed\s+vocational|\bLVN\b/i.test(t)) return 'lpn';
    if(/\bR\.?N\.?\b|registered\s+nurse/i.test(t)) return 'rn';
    if(/\bC\.?N\.?A\.?\b|certified\s+nurs(e|ing)\s+(assistant|aide)/i.test(t)) return 'cna';
    if(/coordinator/i.test(t)) return 'care_coordinator';
    if(/caregiver|companion|personal\s+care|home\s*care|\bPCA\b|\baide\b/i.test(t)) return 'caregiver';
    return null;
  }
  const isNurse = k => { const v = validKey(k); return v === 'lpn' || v === 'rn'; };
  const letterOnly = o => !!o && isNurse(o.position_key);
  const offerSigned = o => !!(o && o.offer_signed_at && (o.pd_signed_at || letterOnly(o)));
  window.CCPositions = { KEYS, validKey, keyOf, isNurse, letterOnly, offerSigned };

  /* ── the nurse forms ── */
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const RECORDED = ['cg.credential.nurse_license', 'cg.nurse.orientation', 'cg.nurse.section2_ack'];
  const handles = key => RECORDED.indexOf(key) > -1;
  async function call(body){
    const r = await sb.functions.invoke('caregiver-journey', { body });
    if(r.error){ let why=''; try{ if(r.error.context && r.error.context.json) why=(await r.error.context.json()).error||''; }catch(_){} throw new Error(why || r.error.message || 'the readiness server did not answer'); }
    if(!r.data || r.data.error) throw new Error((r.data && r.data.error) || 'the readiness server did not answer');
    return r.data;
  }
  const jid = () => { const d = window.CRX && CRX.cur && CRX.cur(); return d && d.journey ? d.journey.journey_id : null; };
  /** the buttons on a nurse row of the readiness card (Record when it may be recorded; the printable documents always) */
  function buttons(r, may){
    let h = '';
    if(r.key === 'cg.nurse.orientation') h += '<button class="ibtn" style="font-size:.72rem;flex:none" onclick="NurseHire.print(\'orientation\',this)" title="The 7-topic checklist with their name, to sign">&#128438; Checklist</button>';
    if(r.key === 'cg.nurse.section2_ack') h += '<button class="ibtn" style="font-size:.72rem;flex:none" onclick="NurseHire.print(\'section2\',this)" title="The Section 2 statement with their name and license, to sign">&#128438; Statement</button>';
    const ev = r.st && r.st.evidence; if(ev && ev.document) h += '<button class="ibtn" style="font-size:.72rem;flex:none" onclick="NurseHire.openDoc(\'' + esc(ev.document) + '\',this)">Open document</button>';
    if(may && ['ready', 'attention', 'blocked'].indexOf(r.status) > -1) h += '<button class="ibtn" style="font-size:.72rem;flex:none" onclick="NurseHire.open(\'' + esc(r.key) + '\')">Record</button>';
    return h;
  }
  let FACTS = null;
  function modal(inner){
    let w = document.getElementById('nhModal');
    if(!w){ w = document.createElement('div'); w.id = 'nhModal'; w.style.cssText = 'display:none;position:fixed;inset:0;z-index:10006;background:rgba(15,54,95,.35);align-items:flex-start;justify-content:center;padding:1rem;overflow:auto'; document.body.appendChild(w); }
    w.innerHTML = '<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;padding:16px 18px;box-shadow:0 12px 40px rgba(0,0,0,.2);margin:1rem 0;font-size:.86rem">' + inner + '</div>';
    w.style.display = 'flex'; return w;
  }
  function closeModal(){ const w = document.getElementById('nhModal'); if(w) w.style.display = 'none'; }
  const field = (id, label, input) => '<label style="display:block;margin:.45rem 0 .15rem;font-weight:700;color:#0D365F">' + esc(label) + '</label>' + input;
  const today = () => new Date().toLocaleString('sv-SE', { timeZone: 'America/Chicago' }).slice(0, 10);
  const up = (kind) => '<input type="file" id="nh_file" accept="image/*,application/pdf" data-kind="' + kind + '"><div id="nh_up" style="font-size:.76rem;color:#6E6559;margin-top:.2rem"></div>';
  async function open(key){
    if(!jid()) return;
    try { FACTS = await call({ action:'nurse_facts', journey_id: jid() }); } catch(e){ alert(e.message || e); return; }
    const f = FACTS, s1 = f.step1 || {};
    let h = '';
    if(key === 'cg.credential.nurse_license'){
      h += '<h3 style="margin:0 0 .3rem;color:#0D365F">Nursing license check (Nursys QuickConfirm)</h3>';
      h += '<div style="background:#F6F9FD;border-radius:8px;padding:.5rem .6rem;font-size:.8rem">From their Step 1 (their own words, not verified): ' + esc(s1.license_type || 'not answered') + ', number ' + (s1.license_last4 ? 'ending ' + esc(s1.license_last4) : 'not given') + ', ' + esc(s1.state || '?') + (s1.multistate ? ', ' + esc(s1.multistate) : '') + ', expires ' + esc(s1.expires || '?') + (s1.picture ? ' · <a href="#" onclick="NurseHire.openDoc(\'' + esc(s1.picture.path) + '\');return false">their picture</a>' : '') + '</div>';
      h += '<p style="font-size:.78rem;color:#6E6559">Search them on Nursys QuickConfirm (nursys.com), save the report as a PDF or screenshot, then record what it shows. Anything but an active license with no discipline blocks their card until an owner reviews it.</p>';
      h += field('', 'License type on Nursys', '<select id="nh_type"><option value="">Choose…</option><option value="LPN"' + (f.position === 'lpn' ? ' selected' : '') + '>LPN</option><option value="RN"' + (f.position === 'rn' ? ' selected' : '') + '>RN</option></select>');
      h += field('', 'Result', '<select id="nh_result"><option value="">Choose…</option><option value="active">Active</option><option value="not_active">Not active (expired, lapsed, inactive)</option><option value="not_found">Not found</option></select>');
      h += field('', 'Any discipline shown?', '<select id="nh_disc"><option value="">Choose…</option><option value="no">No</option><option value="yes">Yes</option></select>');
      h += field('', 'Issuing state', '<input type="text" id="nh_state" maxlength="2" style="width:4rem" value="' + esc(String(s1.state || '').slice(0, 2)) + '">');
      h += field('', 'Single state or multistate (Nurse Licensure Compact)?', '<select id="nh_multi"><option value="">Choose…</option><option value="no">Single state</option><option value="yes">Multistate</option></select>');
      h += field('', 'Expiration date on the report', '<input type="date" id="nh_exp">');
      h += field('', 'Date you checked', '<input type="date" id="nh_checked" value="' + today() + '">');
      h += field('', 'The Nursys report (PDF or screenshot)', up('nursys'));
    } else if(key === 'cg.nurse.orientation'){
      h += '<h3 style="margin:0 0 .3rem;color:#0D365F">Nurse orientation (Personal Care Provider Manual 2.6)</h3>';
      h += '<p style="font-size:.78rem;color:#6E6559">Before the first nurse visit. Tick each topic you covered with them; every one is needed.</p>';
      h += (f.topics || []).map(t => '<label style="display:flex;gap:.45rem;align-items:flex-start;padding:.2rem 0"><input type="checkbox" class="nh_topic" value="' + esc(t.id) + '" style="margin-top:.2rem"> <span>' + esc(t.text) + '</span></label>').join('');
      h += field('', 'Date of orientation', '<input type="date" id="nh_date" value="' + today() + '">');
      h += field('', 'Given by', '<input type="text" id="nh_by" placeholder="Full name">');
      h += field('', 'Signed checklist (optional)', up('orientation'));
    } else if(key === 'cg.nurse.section2_ack'){
      h += '<h3 style="margin:0 0 .3rem;color:#0D365F">Section 2 acknowledgment (manual 2.3)</h3>';
      h += '<p style="font-size:.78rem;color:#6E6559">Give her Section 2 of the MO HealthNet Personal Care Provider Manual and the statement (Statement button on the row). She signs and dates it after reading. Upload the signed copy here.</p>';
      h += field('', 'Date she signed', '<input type="date" id="nh_signed" value="' + today() + '">');
      h += field('', 'The signed statement', up('section2'));
    } else return;
    h += '<div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.8rem"><button class="ibtn" onclick="NurseHire.close()">Cancel</button><button class="ibtn" id="nh_go" style="background:#0D365F;color:#fff" onclick="NurseHire.save(\'' + esc(key) + '\')">Save</button></div><div id="nh_err" style="color:#B91C1C;font-size:.8rem;margin-top:.3rem"></div>';
    modal(h);
  }
  async function upload(){
    const el = document.getElementById('nh_file'); const file = el && el.files && el.files[0]; if(!file) return null;
    const box = document.getElementById('nh_up'); const say = m => { if(box) box.textContent = m; };
    if(file.size > 15 * 1024 * 1024) throw new Error('That file is larger than 15 MB.');
    const ext = ((file.name.split('.').pop() || '') + '').toLowerCase().replace('jpeg', 'jpg') || 'pdf';
    say('Uploading…');
    const u = await call({ action:'nurse_upload_url', journey_id: jid(), kind: el.dataset.kind, ext });
    const put = await fetch(u.signed_url, { method:'PUT', headers:{ 'Content-Type': file.type || 'application/octet-stream', 'x-upsert':'false' }, body:file });
    if(!put.ok) throw new Error('The upload did not go through (' + put.status + ').');
    say('Uploaded.'); return u.path;
  }
  const v = id => { const e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; };
  async function save(key){
    const err = document.getElementById('nh_err'), go = document.getElementById('nh_go'); err.textContent = '';
    try {
      go.disabled = true; go.textContent = 'Saving…';
      const doc = await upload();
      let body = { action:'nurse_record', step_key:key };
      if(key === 'cg.credential.nurse_license') body = Object.assign(body, { license_type: v('nh_type'), result: v('nh_result'), discipline: v('nh_disc') === 'yes' ? true : v('nh_disc') === 'no' ? false : null, state: v('nh_state').toUpperCase(), multistate: v('nh_multi') === 'yes' ? true : v('nh_multi') === 'no' ? false : null, expires: v('nh_exp'), checked_on: v('nh_checked'), document: doc });
      else if(key === 'cg.nurse.orientation') body = Object.assign(body, { topics: [...document.querySelectorAll('.nh_topic:checked')].map(x => x.value), date: v('nh_date'), given_by: v('nh_by'), document: doc });
      else body = Object.assign(body, { signed_on: v('nh_signed'), document: doc });
      if(!window.confirm('Save this to their readiness card, in your name and with the time? It is permanent history.')){ go.disabled = false; go.textContent = 'Save'; return; }
      await CRX.act(body, null); closeModal();
    } catch(e){ err.textContent = (e && e.message) || String(e); go.disabled = false; go.textContent = 'Save'; }
  }
  async function print(which, btn){
    try { if(btn) btn.disabled = true; const r = await call({ action:'nurse_doc', journey_id: jid(), which });
      const bin = atob(r.pdf_base64), bytes = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      window.open(URL.createObjectURL(new Blob([bytes], { type:'application/pdf' })), '_blank'); }
    catch(e){ alert(e.message || e); } finally { if(btn) btn.disabled = false; }
  }
  async function openDoc(path, btn){
    try { const r = await call({ action:'nurse_open', journey_id: jid(), path }); window.open(r.url, '_blank', 'noopener'); }
    catch(e){ alert(e.message || e); }
  }
  /* at Approve to Work: what the nurse setup did (or would do, in practice), and Run nurse setup for the Approve to Work list */
  function setupBlock(d){
    if(!d || !d.facts || d.facts.licensed_nurse !== true || !d.approve || !d.approve.approved) return '';
    const aw = ((d.view && d.view.rows) || []).find(r => r.key === 'cg.approve.work'), ns = aw && aw.st && aw.st.evidence ? aw.st.evidence.nurse_setup : null;
    let h = '<div style="margin-top:.4rem;border-top:1px dashed #EEE9DF;padding-top:.4rem"><b>Nurse setup</b> ';
    if(!ns) h += '<span style="color:#6E6559">not run yet.</span>';
    else if(ns.state === 'waiting') h += '<span style="color:#B45309">waiting: ' + esc(ns.why || '') + '</span>';
    else {
      const nl = ns.nurse_list || {}, cl = ns.axiscare_class || {}, wv = ns.waiver || {};
      h += ns.state === 'practice' ? '<span style="color:#B45309">practice: nothing written (turn on "Nurse hiring setup at Approve to Work" on the Admin page, then Run nurse setup)</span>' : '<span style="color:#15803D">done ' + esc(String(ns.at || '').slice(0, 10)) + '</span>';
      h += '<div style="font-size:.78rem;color:#6E6559;margin-top:.15rem">Nurse list: ' + esc(nl.would === 'update' ? 'update' : 'add') + ' ' + esc(nl.name || '') + ' (' + esc(nl.cred || ns.cred || '') + ', ' + esc(nl.license || '') + ', expires ' + esc(nl.expires || '?') + (nl.supervisor ? ', supervising RN ' + esc(nl.supervisor) : '') + ')' + (nl.state && nl.state !== 'practice' ? ': ' + esc(nl.state) : '') + (nl.problems && nl.problems.length ? ' · <span style="color:#B91C1C">' + esc(nl.problems.join('; ')) + '</span>' : '') + '</div>';
      h += '<div style="font-size:.78rem;color:#6E6559">AxisCare ' + esc(ns.cred || '') + ' class: ' + esc(cl.outcome || '') + (cl.detail ? ' (' + esc(cl.detail) + ')' : '') + ' · the license goes in AxisCare\'s Compliance tab by hand (a card says so)</div>';
      h += '<div style="font-size:.78rem;color:#6E6559">Training waived: ' + esc((wv.courses || []).join(', ')) + '; kept: ' + esc((wv.kept || []).join(', ')) + (wv.training && wv.training.ok === false ? ' · <span style="color:#B91C1C">Training Platform: ' + esc(wv.training.why || '') + '</span>' : '') + '</div>';
    }
    if(d.approve.may_approve_work) h += '<div style="margin-top:.3rem"><button class="ibtn" style="font-size:.74rem" onclick="NurseHire.runSetup(this)">&#8635; Run nurse setup</button></div>';
    return h + '</div>';
  }
  async function runSetup(btn){ if(!window.confirm('Run the nurse setup now? With the switch on it adds them to the nurse list, sets the AxisCare class and records the training waiver; with it off, practice only.')) return; await CRX.act({ action:'nurse_setup' }, btn); }
  /* Verify Viventium Step 2: the LPN packet line, only when the server named one for this person */
  const step2Tick = p => p && p.nurse_packet ? '<label style="display:flex;gap:.5rem;align-items:flex-start;font-size:.86rem;padding:.25rem 0"><input type="checkbox" id="s2nurse" style="margin-top:.2rem"> <span><b>' + esc(p.nurse_packet) + '</b></span></label>' : '';
  window.NurseHire = { handles, buttons, open, save, close: closeModal, print, openDoc, setupBlock, runSetup, step2Tick, RECORDED };
})();
