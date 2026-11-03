/* =====================================================================================================================
   TELL THEM ABOUT SHIFTS (Recruit & Onboard; Samantha 2026-11-02: "a lot of times its also nice to tell applicants in
   onboarding about shifts that we need them for and that start date to encourage them to get things done quickly".
   Part 5 of her plan; 2026-11-03 she approved the wording and "Team Builder + open hours").
   A button on onboarding rows (an offer to sign, Step 1, Viventium Step 2, orientation). It opens a window that lists real
   open hours the Hub already holds: the unfilled squares on Team Builder plans (staffing_plans) and open hours cases
   (coverage_cases), closest to them first when we know their zip. The office ticks one or more, picks a start date, edits
   the draft and presses Send. Town only: never a client's name, address or pay. Nothing is sent by itself.
   Sending: their application's text (applicant-text: 8am to 6pm or held for the morning, recorded on their row) when the
   Hub finds their application by phone; otherwise the office text (send-candidate-message, 8am to 6pm). Opt-outs are
   checked by the server either way.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const get = n => { try{ return (0, eval)(n); }catch(e){ return undefined; } };
  const toast = m => { try{ (typeof ccToast === 'function' ? ccToast : alert)(m); }catch(e){} };
  const DAYS = { mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat', sun:'Sun' }, ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  /* her approved next steps, per stage */
  const NEXT = { offer:'signing your offer', step1:'your Step 1', step2:'your Viventium Step 2 forms', orientation:'your online orientation' };
  const t12 = hm => { const m = /^(\d{1,2}):(\d{2})/.exec(String(hm || '')); if(!m) return String(hm || ''); let h = +m[1]; const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return h + (m[2] === '00' ? '' : ':' + m[2]) + ap; };
  const list = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const digits = p => String(p || '').replace(/\D/g, '').slice(-10);
  const ST = { who:null, shifts:[], picked:{}, start:'', zip:'', appId:null };

  /** the open hours the Hub holds (pure on its inputs; tested): one entry per plan time slot with open days, and per open case */
  function openHours(plans, cases){
    const out = [];
    (plans || []).forEach(p => {
      if(!p || p.status === 'done' || p.status === 'archived' || !p.city) return;
      (p.slots || []).forEach(s => {
        const open = ORDER.filter(d => (p.days || []).includes(d) && !(((p.cells || {})[d + '|' + s.k] || {}).status === 'yes'));
        if(open.length) out.push({ id:'p:' + p.id + ':' + s.k, town:String(p.city).trim(), zip:p.zip || '', when:list(open.map(d => DAYS[d])) + ', ' + t12(s.start) + ' to ' + t12(s.end), from:'Team Builder' });
      });
    });
    (cases || []).forEach(c => {
      if(!c || !c.client_city || ['filled', 'closed', 'done', 'cancelled'].includes(String(c.status || '')) || c.kind === 'callin') return;
      const when = [c.shift_date ? new Date(c.shift_date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) : '', c.shift_time || c.when || ''].filter(Boolean).join(', ');
      if(when) out.push({ id:'c:' + c.id, town:String(c.client_city).trim(), zip:c.client_zip || '', when, from:c.kind === 'open_hours' ? 'Open hours' : 'Open shift' });
    });
    return out;
  }
  /** her approved words, filled in (pure; tested) */
  function draft(first, me, picks, startLabel, stage){
    const towns = [...new Set(picks.map(x => x.town))];
    const whens = picks.map(x => towns.length > 1 ? x.when + ' in ' + x.town : x.when);
    return 'Hi ' + (first || 'there') + ', this is ' + (me || 'the office') + ' with Caring Companions. We have shifts that need you in ' + list(towns) + ': '
      + whens.join('; ') + ". We'd love for you to start by " + startLabel + ', so please finish ' + (NEXT[stage] || NEXT.step1)
      + ' as soon as you can. Questions? Reply here or call us at (417) 234-8494.';
  }
  const meFirst = () => { try{ const m = get('ME'); return String((m && (m.name || m.email)) || '').split(/[ @]/)[0]; }catch(e){ return ''; } };
  const longDay = ymd => { const d = new Date(ymd + 'T12:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' }); };

  function btn(who, stage){
    if(!who || !who.phone || !NEXT[stage]) return '';
    const data = encodeURIComponent(JSON.stringify({ name:who.name || '', phone:who.phone, zip:who.zip || '', stage }));
    return '<button type="button" class="hrm-shifts" title="Text them about open hours that need them, with a start date" onclick="event.preventDefault();event.stopPropagation();HSHIFT.open(this.dataset.w)" data-w="' + data + '">Tell them about shifts</button>';
  }
  async function open(raw){
    let w; try{ w = JSON.parse(decodeURIComponent(raw)); }catch(e){ return; }
    ST.who = w; ST.picked = {}; ST.appId = null; ST.zip = w.zip || '';
    const d = new Date(Date.now() + 7 * 864e5); ST.start = d.toLocaleDateString('en-CA', { timeZone:'America/Chicago' });
    /* their application (by phone): the zip for "closest first", and the text that is recorded on their row */
    try{
      const ph = digits(w.phone);
      if(ph.length === 10 && typeof sb !== 'undefined'){
        const { data } = await sb.from('job_applicants').select('id,phone,zip,city,created_at').ilike('phone', '%' + ph.slice(-4)).order('created_at', { ascending:false }).limit(20);
        const hit = (Array.isArray(data) ? data : []).find(x => digits(x.phone) === ph);
        if(hit){ ST.appId = hit.id; if(!ST.zip) ST.zip = hit.zip || ''; }
      }
    }catch(e){}
    const D = get('DATA') || {};
    ST.shifts = openHours(D.staffing_plans, D.coverage_cases);
    if(typeof get('zipsLoad') === 'function'){ try{ await get('zipsLoad')(); }catch(e){} }
    const mi = typeof get('milesApart') === 'function' ? get('milesApart') : null;
    ST.shifts.forEach(x => { x.miles = ST.zip && x.zip && mi ? mi(ST.zip, x.zip) : null; });
    ST.shifts.sort((a, b) => (a.miles == null) - (b.miles == null) || (a.miles || 0) - (b.miles || 0) || a.town.localeCompare(b.town));
    draw();
  }
  function current(){ const picks = ST.shifts.filter(x => ST.picked[x.id]); return picks.length ? draft(String(ST.who.name || '').split(' ')[0], meFirst(), picks, longDay(ST.start), ST.who.stage) : ''; }
  function draw(){
    css();
    let box = document.getElementById('hshBack');
    if(!box){ box = document.createElement('div'); box.id = 'hshBack'; box.onclick = e => { if(e.target === box) close(); }; document.body.appendChild(box); }
    const w = ST.who, first = String(w.name || '').split(' ')[0] || 'them';
    box.innerHTML = '<div id="hshBox" role="dialog" aria-label="Tell them about shifts"><h3>Tell ' + esc(first) + ' about shifts</h3>'
      + '<div class="hsh-sub">Pick the open hours that need them. The text names the town only, never the client. ' + (ST.zip ? 'Closest to ' + esc(ST.zip) + ' first.' : 'Their zip is not on file, so these are by town.') + '</div>'
      + (ST.shifts.length ? '<div class="hsh-list">' + ST.shifts.map(x => '<label class="hsh-row"><input type="checkbox" data-id="' + esc(x.id) + '"' + (ST.picked[x.id] ? ' checked' : '') + '> <span><b>' + esc(x.town) + '</b> ' + esc(x.when)
          + ' <span class="hsh-meta">' + esc(x.from) + (x.miles != null ? ' · ' + x.miles + ' mi' : '') + '</span></span></label>').join('') + '</div>'
        : '<div class="hsh-none">No open hours on Team Builder or open hours cases right now.</div>')
      + '<label class="hsh-date">Start by <input type="date" id="hshStart" value="' + esc(ST.start) + '"></label>'
      + '<textarea id="hshText" rows="6" placeholder="Pick one or more open hours above">' + esc(current()) + '</textarea>'
      + '<div class="hsh-sub">Goes 8am to 6pm Central' + (ST.appId ? ' (after 6pm it waits for the morning), recorded on their application.' : '. After 6pm it will not go; send it in the morning.') + ' Opt-outs are checked first.</div>'
      + '<div class="hsh-acts"><button type="button" class="secondary" onclick="HSHIFT.close()">Cancel</button><button type="button" id="hshSend" class="hsh-go"' + (current() ? '' : ' disabled') + ' onclick="HSHIFT.send(this)">Send</button></div></div>';
    box.querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener('change', () => { ST.picked[cb.dataset.id] = cb.checked; refresh(); }));
    const sd = document.getElementById('hshStart'); if(sd) sd.addEventListener('change', () => { ST.start = sd.value; refresh(); });
  }
  /* a new pick or date rewrites the draft (the office's own edits are kept until then) */
  function refresh(){ const ta = document.getElementById('hshText'), b = document.getElementById('hshSend'); const t = current(); if(ta) ta.value = t; if(b) b.disabled = !t; }
  function close(){ const b = document.getElementById('hshBack'); if(b) b.remove(); }
  async function send(btnEl){
    const ta = document.getElementById('hshText'), msg = String(ta && ta.value || '').trim();
    if(msg.length < 20){ alert('Pick the open hours first, or write the text.'); return; }
    if(/—/.test(msg)){ alert('Please take out the long dash (—) first.'); return; }
    const w = ST.who;
    if(btnEl){ btnEl.disabled = true; btnEl.textContent = 'Sending…'; }
    try{
      let out;
      if(ST.appId){
        const { data, error } = await sb.functions.invoke('applicant-text', { body:{ action:'send', id:ST.appId, message:msg } });
        if(error || (data && data.error)){ let m = (data && data.error) || (error && error.message) || 'no answer'; try{ const j = await error.context.json(); if(j && j.error) m = j.error; }catch(e){} throw new Error(m); }
        out = data && data.held ? 'It waits for the morning (' + (data.waits || 'after 6pm') + ').' : data && data.sent ? 'Sent to ' + w.name + '.' : 'Not sent: ' + ((data && data.not_sent) || []).join('; ');
      } else {
        const { data, error } = await sb.functions.invoke('send-candidate-message', { body:{ first:String(w.name || '').split(' ')[0], phone:w.phone, message:msg } });
        if(error || (data && data.error)){ let m = (data && data.error) || (error && error.message) || 'no answer'; try{ const j = await error.context.json(); if(j && j.error) m = j.error; }catch(e){} throw new Error(m); }
        out = 'Sent to ' + w.name + '.';
      }
      close(); toast(out);
      try{ if(window.HREM && HREM._st){ HREM._st.textsAt = 0; } }catch(e){}
    }catch(e){ alert('Not sent: ' + (e.message || e)); if(btnEl){ btnEl.disabled = false; btnEl.textContent = 'Send'; } }
  }
  const css = () => { if(document.getElementById('hshCss')) return; const s = document.createElement('style'); s.id = 'hshCss';
    s.textContent = '#hshBack{position:fixed;inset:0;background:rgba(14,56,96,.42);z-index:10050;display:flex;align-items:center;justify-content:center;padding:12px}'
      + '#hshBox{background:#fff;border-radius:14px;width:100%;max-width:580px;max-height:94vh;overflow:auto;padding:18px 20px;color:#1F2A36}#hshBox h3{margin:0 0 4px;font-size:17px;color:#0E3860}'
      + '.hsh-sub{font-size:12.5px;color:#6B7280;margin:4px 0 8px}.hsh-list{border:1px solid #E2E8F0;border-radius:10px;max-height:260px;overflow:auto;margin-bottom:10px}'
      + '.hsh-row{display:flex!important;gap:8px;align-items:flex-start;padding:7px 10px;border-top:1px solid #F1F5F9;font-size:13.5px;font-weight:400;cursor:pointer;margin:0}.hsh-row:first-child{border-top:0}.hsh-row input{width:auto!important;margin-top:3px}'
      + '.hsh-meta{color:#94A3B8;font-size:12px}.hsh-none{font-size:13px;color:#8A5A12;background:#FFF8E8;border-radius:8px;padding:8px 10px;margin-bottom:10px}'
      + '.hsh-date{display:flex!important;gap:8px;align-items:center;font-size:13px;margin:0 0 8px}.hsh-date input{width:auto}#hshText{width:100%;font:inherit;font-size:13.5px;border:1px solid #CBD5E1;border-radius:8px;padding:8px}'
      + '.hsh-acts{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}.hsh-go{background:#1F7A4D;color:#fff;border:0;border-radius:8px;font-weight:800;padding:8px 16px;cursor:pointer}.hsh-go:disabled{opacity:.5}'
      + '.hrm-shifts{font:inherit;font-size:12px;font-weight:700;color:#1F7A4D;background:#E7F6EC;border:1px solid #B7E1C6;border-radius:999px;padding:3px 11px;cursor:pointer;white-space:nowrap}';
    document.head.appendChild(s); };
  css();
  window.HSHIFT = { btn, open, close, send, _openHours:openHours, _draft:draft, _st:ST };
})();
