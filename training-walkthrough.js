/* =====================================================================================================================
   TRY THE NEW-HIRE JOURNEY YOURSELF (Samantha 2026-10-11: "I would like for our staff to also put their info in to
   experience it, as a training, set up inside the applicant journey tab"; "yes to all"). The card on the Applicant journey
   tab. A staff member types their OWN first name, cell and email; the server (training-walkthrough) makes them a practice hire
   "<first> (TRAINING)" on the new onboarding path and sends them the real offer link. Every text and email of the journey
   then reaches them, through the Orientation Video Call. It ends by itself after 14 days, or with End. AxisCare is never written.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  async function call(body){
    const r = await sb.functions.invoke('training-walkthrough', { body });
    if(r.error){ let why = ''; try{ if(r.error.context && r.error.context.json) why = (await r.error.context.json()).error || ''; }catch(_){} throw new Error(why || r.error.message || 'the walkthrough server did not answer'); }
    if(!r.data || r.data.error) throw new Error((r.data && r.data.error) || 'the walkthrough server did not answer');
    return r.data;
  }
  const day = iso => { try{ return new Date(iso).toLocaleDateString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric' }); }catch(_){ return ''; } };
  let OPEN = [], MAY_ALL = false, MSG = '';
  async function mount(){
    const box = document.getElementById('twBox'); if(!box || typeof sb === 'undefined' || !sb) return;
    try{ const r = await call({ action:'list' }); OPEN = r.open || []; MAY_ALL = !!r.may_end_all; }catch(e){ MSG = 'Could not read the walkthroughs: ' + e.message; }
    render();
  }
  function render(){
    const box = document.getElementById('twBox'); if(!box) return;
    const me = (typeof ME !== 'undefined' && ME) || {}, mine = OPEN.find(x => x.mine);
    let h = '<div style="font-size:15px;font-weight:800;color:var(--navy)">Try the new-hire journey yourself (training)</div>'
      + '<div class="field-note" style="margin-top:4px">Get every text and email a new hire gets, on your own phone, from the job offer through the Orientation Video Call. You sign the offer, do the nine Step 1 screens (with a <b>made-up</b> SSN and date of birth), tap that Step 2 is done and book the Orientation Video Call, exactly as they would. Your practice hire shows as <b>"(TRAINING)"</b> everywhere and ends by itself after 14 days. Nothing goes to AxisCare.</div>';
    if(mine){
      h += '<div style="margin-top:10px;border:1px solid #E8E2D8;border-radius:10px;padding:10px 12px"><b>Your walkthrough is open:</b> ' + esc(mine.first) + ' (TRAINING) · started ' + esc(day(mine.started_at)) + ' · ends ' + esc(day(mine.ends_at))
        + '<div class="field-note">Messages go to ' + esc(mine.phone) + ' and ' + esc(mine.email) + '. The offer text comes 8am to 6pm Central; the email any time.</div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">' + (window.HP ? '<button class="ibtn" onclick="HP.open({offer_id:\'' + esc(mine.id) + '\'})">&#128100; My practice profile</button>' : '')
        + '<button class="ibtn" onclick="TW.end(\'' + esc(mine.id) + '\',this)">End my walkthrough</button></div></div>';
    } else {
      h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center">'
        + '<input id="twFirst" placeholder="Your first name" value="' + esc(String(me.name || '').split(' ')[0]) + '" style="width:150px;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font:inherit">'
        + '<input id="twPhone" placeholder="Your cell phone" inputmode="tel" style="width:160px;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font:inherit">'
        + '<input id="twEmail" placeholder="Your email" inputmode="email" style="width:220px;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font:inherit">'
        + '<button class="primary" onclick="TW.start(this)">Start my walkthrough</button></div>';
    }
    const others = OPEN.filter(x => !x.mine);
    if(others.length) h += '<div style="margin-top:10px"><b style="font-size:13px">Other open walkthroughs</b>' + others.map(x => '<div class="field-note" style="display:flex;gap:6px;align-items:center;margin-top:3px">' + esc(x.first) + ' (TRAINING) · by ' + esc(x.by_name || x.by_email) + ' · ends ' + esc(day(x.ends_at))
      + (window.HP ? ' <button class="ibtn" style="font-size:.72rem" onclick="HP.open({offer_id:\'' + esc(x.id) + '\'})">&#128100; Profile</button>' : '')
      + (MAY_ALL ? ' <button class="ibtn" style="font-size:.72rem" onclick="TW.end(\'' + esc(x.id) + '\',this)">End</button>' : '') + '</div>').join('') + '</div>';
    if(MSG) h += '<div class="field-note" style="margin-top:8px;color:var(--navy)">' + esc(MSG) + '</div>';
    box.innerHTML = h;
  }
  async function start(btn){
    const v = id => (document.getElementById(id) || {}).value || '';
    const first = v('twFirst').trim(), phone = v('twPhone').trim(), email = v('twEmail').trim();
    if(!confirm('Start your training walkthrough?\n\nEvery text and email a new hire gets will come to ' + phone + ' and ' + email + ', starting with the job offer now.\nUse ONLY your own phone and email, and a made-up SSN and date of birth in Step 1.')) return;
    if(btn){ btn.disabled = true; btn.textContent = 'Starting…'; }
    try{
      const r = await call({ action:'start', first, phone, email });
      const o = r.offer_sent || {};
      MSG = 'Started. ' + (o.sms || o.email ? 'Your offer went by ' + [o.sms ? 'text' : null, o.email ? 'email' : null].filter(Boolean).join(' and ') + (o.held ? ' (the text waits until 8am)' : '') + '.' : o.held ? 'Your offer text waits until 8am Central.' : 'The offer did not go out yet' + ((r.not_sent || []).length ? ': ' + r.not_sent.join('; ') : '') + '. Open your practice profile, or try again.');
    }catch(e){ MSG = 'Not started: ' + e.message; }
    if(btn){ btn.disabled = false; btn.textContent = 'Start my walkthrough'; }
    await mount();
  }
  async function end(id, btn){
    if(!confirm('End this training walkthrough? The practice offer is withdrawn and the practice records come off the lists (their history stays). The phone and email come off the test list.')) return;
    if(btn) btn.disabled = true;
    try{ await call({ action:'end', offer_id:id }); MSG = 'Ended.'; }catch(e){ MSG = 'Not ended: ' + e.message; }
    await mount();
  }
  window.TW = { mount, start, end };
})();
