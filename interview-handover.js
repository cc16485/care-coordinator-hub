/* interview-handover.js (1547, 2026-11-18). Samantha: "I would like to be able to jump in and do video interviews if the first
   person is not available, or really for us each to be able to rebook and it send the person who is going to now do the
   interview ... if Krystal can't do an inperson interview because she booked an assessment ... i can jump in and switch it to
   a video interview at the same time". Her answers: anyone can hand any booked interview to any interviewer (herself
   included); the old and the new interviewer both get a text; the applicant gets ONE short text (+ email), "Short and warm".
   One "🤝 Hand over" button on every upcoming interview (the Interviews list, the red ✗ "Assessment booked at this time"
   rows, Katlin's calendar). Same time, pick the new interviewer, tick "Make it a video interview" for an in-person one.
   The server (Staffing-Coordinator-Hub applicant-text, handover_draft / handover) holds the words and the rules: video needs
   the new interviewer's own Google Meet or Zoom link, a clash on their calendar asks "hand it over anyway?", texts 8am to
   9pm (held for 8am after that). This file only draws and asks. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m) => { try { (typeof ccToast === 'function' ? ccToast : alert)(m); } catch (e) { /* nowhere to show it */ } };

  async function call(body) {
    const { data, error } = await sb.functions.invoke('applicant-text', { body });
    if (error) { let msg = error.message || 'error', j = null; try { j = await error.context.json(); if (j && j.error) msg = j.error; } catch (e) { /* no body */ }
      const err = new Error(msg); err.reason = j && j.reason; throw err; }
    if (data && data.error) throw new Error(data.error);
    return data || {};
  }

  function css() {
    if (document.getElementById('iho-css')) return;
    const s = document.createElement('style'); s.id = 'iho-css';
    s.textContent = '#ihoBack{position:fixed;inset:0;background:rgba(14,56,96,.42);z-index:10050;display:flex;align-items:center;justify-content:center;padding:12px}'
      + '#ihoBox{background:#fff;border-radius:14px;width:100%;max-width:560px;max-height:94vh;overflow:auto;box-shadow:0 20px 60px rgba(14,56,96,.25);padding:18px 20px;font-family:inherit;color:#1F2A36}'
      + '#ihoBox h3{margin:0 0 2px;font-size:17px;color:#0E3860}#ihoBox .iho-sub{font-size:12.5px;color:#6E6559;margin-bottom:10px}'
      + '#ihoBox .iho-note{font-size:12.5px;border-radius:8px;padding:7px 10px;margin:8px 0}#ihoBox .iho-wait{background:#FFF8E8;border:1px solid #F5D9A0;color:#8A5A00}#ihoBox .iho-no{background:#FEE2E2;border:1px solid #FCA5A5;color:#991B1B}#ihoBox .iho-ok{background:#F0FDF4;border:1px solid #BBF7D0;color:#166534}'
      + '#ihoBox .iho-who{display:flex;flex-direction:column;gap:6px;margin:6px 0}#ihoBox .iho-who label{border:1.5px solid #CBD5E1;border-radius:10px;padding:8px 10px;font-size:13.5px;cursor:pointer;display:flex;gap:8px;align-items:center;justify-content:flex-start;font-weight:600;text-align:left}'
      + '#ihoBox .iho-who label.on{border-color:#0E3860;background:#F4FBFB}#ihoBox .iho-who label.off{opacity:.55;cursor:default}#ihoBox .iho-who small{font-weight:400;color:#6E6559}#ihoBox .iho-who small.busy{color:#B91C1C;font-weight:700}'
      + '#ihoBox input[type=radio],#ihoBox input[type=checkbox]{width:auto;flex:0 0 auto;margin:0}'
      + '#ihoBox label.iho-ch{display:flex;gap:8px;align-items:center;font-size:13.5px;margin-top:10px;cursor:pointer;font-weight:600;justify-content:flex-start}'
      + '#ihoBox textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;line-height:1.5;padding:10px;border:1.5px solid #CBD5E1;border-radius:10px;min-height:120px;resize:vertical;margin-top:4px}'
      + '#ihoBox .iho-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}#ihoBox .iho-row .sp{flex:1}'
      + '#ihoBox .iho-b{font:inherit;font-size:13.5px;font-weight:700;padding:9px 16px;border-radius:9px;border:1.5px solid #CBD5E1;background:#fff;color:#0E3860;cursor:pointer}#ihoBox .iho-b.p{background:#0E3860;color:#fff;border-color:#0E3860}#ihoBox .iho-b[disabled]{opacity:.55;cursor:default}';
    document.head.appendChild(s);
  }
  function close() { const b = document.getElementById('ihoBack'); if (b) b.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function sheet(html) {
    css(); close();
    const b = document.createElement('div'); b.id = 'ihoBack'; b.innerHTML = '<div id="ihoBox" role="dialog" aria-modal="true">' + html + '</div>';
    b.addEventListener('click', (e) => { if (e.target === b) close(); });
    document.body.appendChild(b); document.addEventListener('keydown', onKey);
    return b.querySelector('#ihoBox');
  }
  function refresh() {
    try { if (typeof ivqLoad === 'function') ivqLoad(); } catch (e) { /* not on this page */ }
  }

  async function open(applicantId) {
    const box = sheet('<h3>Hand to someone else</h3><div class="iho-sub">Looking…</div>');
    let d;
    try { d = await call({ action: 'handover_draft', id: applicantId }); }
    catch (e) { box.innerHTML = '<h3>Hand to someone else</h3><div class="iho-note iho-no">' + esc(e.message) + '</div><div class="iho-row"><span class="sp"></span><button class="iho-b" onclick="IHO.close()">Close</button></div>'; return; }
    const bk = d.booked || {}, wasVideo = bk.video === true;
    const list = (d.interviewers || []);
    const curName = (list.find((x) => x.current) || {}).name || 'nobody';
    let pick = null, toVideo = false, edited = false;
    box.innerHTML = '<h3>Hand ' + esc(d.first || 'their') + '\'s interview to someone else</h3>'
      + '<div class="iho-sub"><b>' + esc(bk.short_day || bk.day) + ' at ' + esc(bk.time) + '</b> · ' + (wasVideo ? '🎥 video' : '🏢 in person') + ' with ' + esc(curName) + '. Same time; only the interviewer changes.</div>'
      + '<div class="iho-sub" style="margin:0">Who is doing it now?</div>'
      + '<div class="iho-who">' + list.map((x) => '<label data-id="' + esc(x.id) + '"' + (x.current && wasVideo ? ' class="off"' : '') + '><input type="radio" name="ihoWho" value="' + esc(x.id) + '"' + (x.current && wasVideo ? ' disabled' : '') + '> '
        + esc(x.name) + (x.current ? ' <small>(has it now)</small>' : '')
        + (x.has_link ? ' <small>· 🎥 video link saved</small>' : ' <small>· no video link</small>')
        + (x.busy && !x.current ? ' <small class="busy">· busy then: ' + esc(x.busy) + '</small>' : '') + '</label>').join('') + '</div>'
      + (wasVideo ? '<div class="iho-sub">It stays a video interview, with the new person\'s own link.</div>'
                  : '<label class="iho-ch"><input type="checkbox" id="ihoVideo"> 🎥 Make it a video interview (they don\'t come to the office)</label><div id="ihoVidNote"></div>')
      + '<div id="ihoMsgWrap"></div>'
      + '<div class="iho-row"><span class="sp"></span><button class="iho-b" onclick="IHO.close()">Not now</button><button class="iho-b p" id="ihoGo" disabled>Hand it over</button></div>';
    const go = box.querySelector('#ihoGo'), wrap = box.querySelector('#ihoMsgWrap'), vid = box.querySelector('#ihoVideo'), vnote = box.querySelector('#ihoVidNote');
    const who = () => list.find((x) => String(x.id) === String(pick));
    const paint = () => {
      box.querySelectorAll('.iho-who label').forEach((l) => l.classList.toggle('on', String(l.getAttribute('data-id')) === String(pick)));
      const w = who();
      if (vnote) vnote.innerHTML = toVideo && w && !w.has_link ? '<div class="iho-note iho-no">' + esc(w.name) + ' has no video link yet, so it can\'t be video with them. Add it first: Today, Calendar, 🎥 Add video link.</div>' : '';
      const same = w && w.current && !toVideo;
      const words = w ? (toVideo && !wasVideo ? w.words.video : w.words.keep) : null;
      go.disabled = !w || same || (toVideo && !w.has_link) || (wasVideo && !w.has_link);
      go.textContent = d.confirmed && d.can_text ? (d.in_hours ? 'Hand it over and text ' + (d.first || 'them') : 'Hand it over (text at 8 AM)') : 'Hand it over';
      if (!w) { wrap.innerHTML = ''; return; }
      if (same) { wrap.innerHTML = '<div class="iho-note iho-wait">It is already with ' + esc(w.name) + '. Pick someone else, or tick video.</div>'; return; }
      if (wasVideo && !w.has_link) { wrap.innerHTML = '<div class="iho-note iho-no">' + esc(w.name) + ' has no video link yet, and this is a video interview. Add it first: Today, Calendar, 🎥 Add video link.</div>'; return; }
      if (!words) { wrap.innerHTML = ''; return; }
      const head = !d.confirmed ? '<div class="iho-note iho-ok">Their booking confirmation has not gone out yet, so it will name ' + esc(w.name) + '. No extra text is sent.</div>'
        : !d.can_text ? '<div class="iho-note iho-no">Can\'t text them: ' + esc(d.why_not || '') + '.' + (d.email ? ' It goes by email.' : ' Call them to tell them.') + '</div>'
        : (d.waits ? '<div class="iho-note iho-wait">' + esc(d.waits) + '</div>' : '');
      const keep = edited && wrap.querySelector('#ihoMsg') ? wrap.querySelector('#ihoMsg').value : words;
      wrap.innerHTML = head + (d.confirmed ? '<div class="iho-sub" style="margin:8px 0 0">' + esc(d.first || 'They') + ' gets this' + (d.email ? ' (and the same by email)' : '') + '. Change anything you like:</div><textarea id="ihoMsg">' + esc(keep) + '</textarea>' : '')
        + '<div class="iho-sub" style="margin-top:6px">' + esc(curName) + ' and ' + esc(w.name) + ' each get a text saying so (an email instead after 8 PM). You are not texted about your own hand-over.</div>';
      const ta = wrap.querySelector('#ihoMsg'); if (ta) ta.addEventListener('input', () => { edited = true; });
    };
    box.querySelectorAll('input[name=ihoWho]').forEach((r) => r.addEventListener('change', () => { pick = r.value; edited = false; paint(); }));
    if (vid) vid.addEventListener('change', () => { toVideo = vid.checked; edited = false; paint(); });
    go.addEventListener('click', () => send(applicantId, d, () => ({ coordinator_id: pick, video: toVideo, message: (wrap.querySelector('#ihoMsg') || {}).value || '' }), go));
  }

  async function send(applicantId, d, read, go, force) {
    const v = read();
    go.disabled = true; const label = go.textContent; go.textContent = 'Handing it over…';
    try {
      const r = await call({ action: 'handover', id: applicantId, coordinator_id: v.coordinator_id, video: v.video, message: v.message, force: force === true });
      const a = r.applicant || {}, t = r.told || {};
      const ap = a.held ? 'Their text goes at 8 AM.' : a.sent ? (a.texted ? 'Texted' + (a.emailed ? ' and emailed' : '') + ' ' + (d.first || 'them') + '.' : a.emailed ? 'Emailed ' + (d.first || 'them') + ' (no text).' : '') : a.why ? 'No text to ' + (d.first || 'them') + ': ' + a.why + '.' : '';
      const notSent = (a.not_sent || []).length ? ' Not sent: ' + a.not_sent.join('; ') + '.' : '';
      const team = [t.to ? r.to + ': ' + t.to : '', t.from ? t.from.name + ': ' + t.from.how : ''].filter(Boolean).join(' · ');
      const box = document.getElementById('ihoBox');
      if (box) box.innerHTML = '<h3>Handed to ' + esc(r.to) + (r.video ? ' 🎥' : '') + '</h3>'
        + '<div class="iho-note ' + (notSent ? 'iho-wait' : 'iho-ok') + '">' + esc(ap + notSent) + '</div>'
        + (team ? '<div class="iho-sub">' + esc(team) + '</div>' : '')
        + '<div class="iho-row"><span class="sp"></span><button class="iho-b p" onclick="IHO.close()">Done</button></div>';
      refresh();
    } catch (e) {
      go.textContent = label; go.disabled = false;
      if (e.reason === 'busy' && !force) {
        const ok = typeof ccConfirm === 'function' ? await ccConfirm(e.message) : confirm(e.message);
        if (ok) return send(applicantId, d, read, go, true);
        return;
      }
      toast(e.message);
    }
  }

  /* the button for any row (class 'fb' in the Hub); hot = the red ✗ assessment clash, so it stands out */
  function btn(applicantId, hot) {
    return '<button type="button" class="fb"' + (hot ? ' style="border-color:#B91C1C;color:#B91C1C;font-weight:700;"' : '') + ' title="Same time, someone else does it (you can switch it to video)" onclick="event.stopPropagation();IHO.open(\'' + esc(applicantId) + '\')">🤝 Hand over</button>';
  }

  window.IHO = { open, close, btn };
})();
