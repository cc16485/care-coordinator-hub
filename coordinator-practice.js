/* =============================================================================
   COORDINATOR PRACTICE (2026-11-14; her ask "could the training be really interactive and very advanced?", the mockup
   https://claude.ai/artifact/FVW3y6HtvKXibxfLz31BBF, then "All five"). The Practice tab inside Coordinator Training.
     1 Practice call        a made-up caller, played by the server (practice-call, Staffing repo). The five beats light up
                            as the coordinator covers them; at the end a coach grades the call against the PUBLISHED
                            "First call with a new lead". Text only: her rule is never a robot voice. Speaking into the
                            microphone works where the browser allows it (that is input, never a voice reading out).
     2 What do you do next? built here, from a PUBLISHED procedure's own steps: at each step pick the real next step from
                            three (the right one, a later step of the same procedure, a step from another procedure).
     3 Steps in order       the same procedure's steps, shuffled; tap them in order.
     4 Practice rounds      a pretend call-off and a pretend missed clock-in in screens laid out like the real ones. They
                            are a separate copy on purpose: the real coverage screen texts real caregivers, so practice
                            never runs there. Their rules are the How-to's (published 11-13).
     5 Trainer view         each person on their own card, never ranked: what they practiced, how it went, what comes back.
   Come-back practice: an item done perfectly comes back later and later (3, 7, 14, 30 days); a slip brings it back
   tomorrow. Saved in app_data call_coaching (already registered) as practice:<email>, written only by that person.
   Nothing here texts, emails or calls anyone, and nothing reaches AxisCare.
   ============================================================================= */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'call_coaching';
  const lc = (s) => String(s || '').trim().toLowerCase();
  const myEmail = () => lc(typeof ME !== 'undefined' && ME && ME.email);
  const owner = () => { try { return typeof ccIsOwner === 'function' && ccIsOwner(); } catch (e) { return false; } };
  const nameOf = (e) => { try { return (typeof opsOwnerName === 'function' && opsOwnerName(e)) || e; } catch (x) { return e; } };
  const firstName = (s) => String(s || '').trim().split(/[\s@]/)[0] || '';
  const items = () => (typeof DATA !== 'undefined' && DATA && Array.isArray(DATA[KEY])) ? DATA[KEY] : [];
  const lib = () => ((typeof DATA !== 'undefined' && DATA && Array.isArray(DATA.sop_library)) ? DATA.sop_library : [])
    .filter((d) => d && d.status !== 'draft' && d.title && Array.isArray(d.steps));
  const proc = (id) => lib().find((d) => d.id === id) || null;
  const stepsOf = (d) => (d && Array.isArray(d.steps) ? d.steps : []).map((s) => String(s || '').trim()).filter(Boolean);
  const usable = (d) => stepsOf(d).length >= 3;
  const say = (m) => { if (typeof ccToast === 'function') ccToast(m); else alert(m); };
  const DAY = 86400000;
  const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const words = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  /* a steady little hash, so a shuffle is the same every time for the same procedure (fair to compare tries) */
  const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const shuffle = (arr, seed) => { const a = arr.slice(); let h = hash(seed); for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 2246822519) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ======================================================================= the saved practice record ====== */
  const recOf = (e) => items().find((x) => x && x.id === 'practice:' + lc(e)) || null;
  const blank = (e) => ({ id: 'practice:' + lc(e), kind: 'practice', email: lc(e), results: [], calls: [], review: {} });
  const BOXES = [1, 3, 7, 14, 30];
  async function record(k, label, score, of, extra) {
    const e = myEmail(); if (!e) return;
    const r = Object.assign(blank(e), recOf(e) || {});
    const at = new Date().toISOString(), perfect = of > 0 && score === of;
    r.results = (r.results || []).concat([{ k, label, score, of, at }]).slice(-300);
    const rv = Object.assign({}, r.review || {}); const cur = rv[k] || { box: 0 };
    const box = perfect ? Math.min(cur.box + 1, BOXES.length - 1) : 0;
    rv[k] = { box, label, due: new Date(today0().getTime() + (perfect ? BOXES[box] : 1) * DAY).toISOString().slice(0, 10), last: at, last_score: score, of };
    r.review = rv;
    if (extra && extra.call) r.calls = (r.calls || []).concat([extra.call]).slice(-8);
    if (typeof DATA !== 'undefined' && !Array.isArray(DATA[KEY])) DATA[KEY] = [];
    const i = DATA[KEY].findIndex((x) => x && x.id === r.id); if (i >= 0) DATA[KEY][i] = r; else DATA[KEY].push(r);
    try { await persist(KEY, r); } catch (er) { console.error('practice save:', er); say('Your practice did not save. Try again.'); }
  }
  /** what is due for a person today (or overdue), soonest first */
  function dueFor(e) {
    const rv = (recOf(e) || {}).review || {}, t = today0().toISOString().slice(0, 10);
    return Object.entries(rv).filter(([, v]) => v && v.due && v.due <= t).map(([k, v]) => Object.assign({ k }, v)).sort((a, b) => String(a.due).localeCompare(String(b.due)));
  }
  function upcomingFor(e) {
    const rv = (recOf(e) || {}).review || {}, t = today0().toISOString().slice(0, 10);
    return Object.entries(rv).filter(([, v]) => v && v.due && v.due > t && v.box === 0).map(([k, v]) => Object.assign({ k }, v)).sort((a, b) => String(a.due).localeCompare(String(b.due)));
  }

  /* ======================================================================= 2 · what do you do next? ======== */
  /** questions built only from published procedures: the right next step, a later step of the same procedure, a step from another one */
  function scenario(id) {
    const d = proc(id); if (!d || !usable(d)) return null;
    const st = stepsOf(d), n = Math.min(st.length, 6);
    const others = lib().filter((x) => x.id !== d.id && usable(x));
    const near = others.filter((x) => x.moment === d.moment); const pool = (near.length ? near : others);
    const qs = [];
    for (let i = 0; i < n; i++) {
      const opts = [{ t: st[i], ok: true }];
      const later = st.length - 1 > i ? (i + 2 < st.length ? i + 2 : st.length - 1) : -1;
      if (later > i) opts.push({ t: st[later], ok: false, why: 'Not yet. That comes later, at step ' + (later + 1) + '.' });
      if (pool.length) {
        const o = pool[hash(d.id + i) % pool.length], os = stepsOf(o);
        opts.push({ t: os[hash(o.id + i) % os.length], ok: false, why: 'That is from a different procedure: ' + o.title + '.' });
      }
      qs.push({ q: i === 0 ? 'What do you do first?' : 'What do you do next?', done: st.slice(0, i), opts: shuffle(opts, d.id + ':' + i) });
    }
    return { id: d.id, title: d.title, when: d.when || '', qs, done_when: d.done_when || '', escalate_if: d.escalate_if || '' };
  }

  /* ======================================================================= 4 · practice rounds =========== */
  /* Pretend people only. Rules are the How-to's published wording (Scheduling cards, 2026-11-13). */
  const ROUNDS = {
    calloff: { title: 'A caregiver calls off', from: 'How-to: Scheduling, A caregiver calls off',
      start: 'Brenda (pretend caregiver) texted at 9:40 AM: her car will not start. She is on Walter P. (pretend client), today 2 to 6 PM.',
      nodes: [
        { say: 'Where do you start?', choices: [
          { t: 'Open a coverage case on Call-offs & open shifts.', ok: true, why: 'Right. One case holds everything: who was asked, who said yes.' },
          { t: 'Text a few caregivers you know from your own phone.', ok: false, why: 'Call from the office line and work it in the Hub, so the next person sees who was asked.' },
          { t: 'Call Walter\'s daughter to say Brenda is not coming.', ok: false, why: 'Tell the client once you know who is coming, not before.' } ] },
        { say: 'Cara\'s list: Maria S. (free, 6 miles), Deb K. (AxisCare shows her working 1 to 5 PM), Tony R. (free, 11 miles), Shay L. (no availability on file). Who should be asked?', choices: [
          { t: 'Maria and Tony. Deb is working then. Shay is unknown, so ask her separately.', ok: true, why: 'Right. Never ask someone AxisCare shows working then, and no availability on file means unknown, not free.' },
          { t: 'All four, to be safe.', ok: false, why: 'Never ask a caregiver AxisCare shows working or scheduled at that time. The Hub blocks it.' },
          { t: 'Only Maria, she is closest.', ok: false, why: 'Send Cara\'s list to everyone who fits. More yeses, faster cover.' } ] },
        { say: 'Maria said yes at 9:52 AM (6 miles, has met Walter). Tony said yes at 10:05 AM (11 miles, new to Walter). Who do you confirm?', choices: [
          { t: 'Maria.', ok: true, why: 'Right. She said yes first, is closer, and Walter knows her.' },
          { t: 'Tony.', ok: false, why: 'Tony would work, but Maria said yes first, is closer, and Walter knows her.' } ] },
        { say: 'Maria is confirmed on the board. What now?', choices: [
          { t: 'Tell Walter\'s family who is coming, and make sure AxisCare shows Maria on the visit.', ok: true, why: 'Right. Done when the shift has a caregiver, the client knows, and AxisCare is right.' },
          { t: 'Nothing. The Hub handles the rest.', ok: false, why: 'Tell the client who is coming, and check AxisCare shows it.' } ] } ],
      done: 'The shift has a caregiver, the client knows, and AxisCare is right.' },
    clockin: { title: 'Nobody clocked in', from: 'How-to: Scheduling, Nobody clocked in, or out',
      start: 'It is 8:20 AM. Helen W. (pretend client) has a visit from 8 AM with Marcus T. (pretend caregiver). There is no clock-in.',
      nodes: [
        { say: 'Where do you start?', choices: [
          { t: 'Open Missed clock-ins & outs and call Marcus from the office line.', ok: true, why: 'Right. Call the caregiver first.' },
          { t: 'Open a coverage case right away.', ok: false, why: 'Find out first. He may be there and just forgot to clock in.' },
          { t: 'Wait until 9 to see if he clocks in.', ok: false, why: 'Helen may be alone. Call now.' } ] },
        { say: 'Marcus answers: "I\'m here! I got here at 7:58 and forgot to clock in." What next?', choices: [
          { t: 'Call Helen or her family to confirm the times, then fix the visit in AxisCare.', ok: true, why: 'Right. The visit happened, so confirm the times with the client and fix them in AxisCare.' },
          { t: 'Fix the times in AxisCare from what Marcus said.', ok: false, why: 'Confirm the times with the client first. That is what makes the record right.' },
          { t: 'Nothing, he is there.', ok: false, why: 'The visit still has no clock-in. Confirm the times with the client and fix the visit.' } ] },
        { say: 'And if Marcus had not answered, or said he could not come?', choices: [
          { t: 'Open a coverage case, the same as a call-off.', ok: true, why: 'Right. No caregiver means it is a call-off.' },
          { t: 'Mark the visit as missed and move on.', ok: false, why: 'Helen still needs care. Open a coverage case, the same as a call-off.' } ] } ],
      done: 'The visit has real times, or it has cover.' },
  };

  /* ======================================================================= 1 · practice call ============= */
  const PERSONAS = [   /* the labels only; the stories live on the server so nobody reads ahead */
    ['daughter_falls', 'A worried daughter', 'Linda, about her mom, Ruth, 84, in Nixa'],
    ['veteran_wife', 'A veteran\'s wife', 'Carol, about her husband, Jim, 82, in Ozark'],
    ['dementia_son', 'A son whose dad has dementia', 'Mark, about his dad, Harold, 77, in Republic'],
    ['medicaid', 'A caller on Medicaid', 'Teresa, about herself, 68, in Springfield'],
    ['ltc_policy', 'A family with long-term care insurance', 'Susan, about her mom, Betty, 88, in Springfield'],
    ['discharge', 'A hospital discharge in two days', 'Kevin, about his dad, Ray, 80, in Springfield'] ];
  const BEATS = [['story', 'Their story'], ['home', 'Day to day at home'], ['help', 'What help looks like'], ['paid', 'How it gets paid'], ['next', 'Next step']];
  async function callServer(body) {
    const r = await sb.functions.invoke('practice-call', { body });
    if (r.error) { let why = ''; try { if (r.error.context && r.error.context.json) why = (await r.error.context.json()).error || ''; } catch (_) { /* no detail */ } throw new Error(why || 'The practice caller is not set up yet. Tell Samantha.'); }
    if (!r.data || r.data.error) throw new Error((r.data && r.data.error) || 'The practice caller did not answer. Try again.');
    return r.data;
  }

  /* ======================================================================= the player (a pop-up) ========= */
  let S = null;   /* what is open: { type, ... } */
  const css = '<style id="ctpCss">'
    + '#ctpBackdrop .modal{max-width:860px;}'
    + '.ctp-opt{display:block;width:100%;text-align:left;border:1.5px solid var(--border,#D8DEE6);background:#fff;color:inherit;font:inherit;font-size:14px;padding:10px 12px;border-radius:10px;cursor:pointer;margin:6px 0;line-height:1.45;}'
    + '.ctp-opt:hover:not(:disabled){border-color:#0F7A73;}.ctp-opt:disabled{cursor:default;}'
    + '.ctp-opt.ok{border-color:#0B6B4C;background:#E3F4EC;}.ctp-opt.no{border-color:#A83A2F;background:#FBE9E6;}'
    + '.ctp-why{border-radius:10px;padding:9px 12px;font-size:13.5px;margin-top:6px;line-height:1.5;}.ctp-why.ok{background:#E3F4EC;}.ctp-why.no{background:#FBE9E6;}'
    + '.ctp-pips{display:flex;gap:5px;flex-wrap:wrap;margin:6px 0 12px;}.ctp-pip{width:28px;height:6px;border-radius:999px;background:#E3E8EE;}.ctp-pip.ok{background:#0F7A73;}.ctp-pip.no{background:#F0A63A;}'
    + '.ctp-done{font-size:13px;color:#5B6B7A;margin:0 0 8px;}.ctp-done li{margin:2px 0;}'
    + '.ctp-place{display:flex;gap:10px;align-items:flex-start;border:1.5px solid #E3E8EE;border-radius:10px;padding:9px 12px;font-size:14px;margin:6px 0;}'
    + '.ctp-place .n{flex:0 0 24px;height:24px;border-radius:50%;background:#0D365F;color:#fff;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;}'
    + '.ctp-place.ok{border-color:#0B6B4C;background:#E3F4EC;}.ctp-place.no{border-color:#A83A2F;background:#FBE9E6;}'
    + '.ctp-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;}.ctp-call{display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:16px;}'
    + '@media (max-width:760px){.ctp-grid,.ctp-call{grid-template-columns:minmax(0,1fr);}}'
    + '.ctp-msgs{display:flex;flex-direction:column;gap:8px;max-height:46vh;overflow-y:auto;padding:4px 2px;}'
    + '.ctp-msg{max-width:85%;padding:9px 13px;border-radius:14px;font-size:14px;line-height:1.45;}.ctp-msg.them{background:#E3F3F1;align-self:flex-start;border-bottom-left-radius:4px;}'
    + '.ctp-msg.me{background:#0D365F;color:#fff;align-self:flex-end;border-bottom-right-radius:4px;}'
    + '.ctp-beat{display:flex;gap:8px;align-items:center;font-size:13.5px;margin:6px 0;}.ctp-dot{flex:0 0 22px;height:22px;border-radius:50%;border:2px solid #D8DEE6;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#5B6B7A;}'
    + '.ctp-beat.on .ctp-dot{background:#0F7A73;border-color:#0F7A73;color:#fff;}'
    + '.ctp-card{border:1px solid var(--border,#E3E8EE);border-radius:12px;padding:12px 14px;margin:0 0 10px;}'
    + '.ctp-tag{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700;background:#EAF4F6;color:#103D47;white-space:nowrap;}'
    + '.ctp-tag.honey{background:#FFF3DA;color:#7A4E00;}.ctp-tag.ok{background:#E3F4EC;color:#0B5F45;}'
    + '.ctp-launch{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;}'
    + '.ctp-launch button{text-align:left;border:1.5px solid #E3E8EE;background:#fff;border-radius:12px;padding:12px 14px;cursor:pointer;font:inherit;color:inherit;}'
    + '.ctp-launch button:hover{border-color:#0F7A73;}.ctp-launch b{display:block;color:var(--navy,#0D365F);font-size:14px;}'
    + '.ctp-launch span{font-size:12.5px;color:#5B6B7A;}'
    + '</style>';
  function ensure() {
    if (!document.getElementById('ctpCss')) document.head.insertAdjacentHTML('beforeend', css);
    if (document.getElementById('ctpBackdrop')) return;
    const d = document.createElement('div'); d.className = 'modal-backdrop'; d.id = 'ctpBackdrop';
    d.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="ctpTitle"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">'
      + '<h2 id="ctpTitle" style="margin:0;font-size:19px;color:var(--navy);"></h2><button class="linklike" onclick="CTP.close()">Close</button></div>'
      + '<div id="ctpSub" class="field-note" style="font-size:13px;margin:2px 0 10px;"></div><div id="ctpBody"></div></div>';
    document.body.appendChild(d);
  }
  function open(title, sub) { ensure(); document.getElementById('ctpTitle').textContent = title; document.getElementById('ctpSub').innerHTML = sub || ''; document.getElementById('ctpBackdrop').classList.add('open'); }
  function close() {
    const d = document.getElementById('ctpBackdrop'); if (d) d.classList.remove('open');
    try { if (S && S.rec) S.rec.stop(); } catch (e) { /* the microphone was already off */ }
    S = null; if (window.CTR && typeof CTR.render === 'function' && typeof activeTab !== 'undefined' && activeTab === 'cctraining') CTR.render();
  }
  const body = (h) => { document.getElementById('ctpBody').innerHTML = h; };
  const pips = (n, marks) => '<div class="ctp-pips">' + Array.from({ length: n }, (_, i) => '<span class="ctp-pip' + (marks[i] === true ? ' ok' : marks[i] === false ? ' no' : '') + '"></span>').join('') + '</div>';
  const finishBtns = (again, label) => '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;"><button class="primary" onclick="' + again + '">' + (label || 'Try it again') + '</button><button class="secondary" onclick="CTP.close()">Done</button></div>';

  /* ---- scenario ---- */
  function startScenario(id) {
    const sc = scenario(id); if (!sc) { say('That procedure has too few steps to practice.'); return; }
    S = { type: 'scen', sc, i: 0, marks: [], tried: false };
    open('What do you do next?', 'From the published procedure: <b>' + esc(sc.title) + '</b>'); drawScenario();
  }
  function drawScenario() {
    const { sc, i, marks } = S;
    if (i >= sc.qs.length) {
      const right = marks.filter((m) => m === true).length;
      record('scen:' + sc.id, 'What do you do next: ' + sc.title, right, sc.qs.length);
      body(pips(sc.qs.length, marks) + '<p style="font-size:16px;font-weight:700;color:var(--navy);margin:0 0 8px;">' + right + ' of ' + sc.qs.length + ' right the first time.</p>'
        + '<div class="field-note" style="font-size:13.5px;">' + (right === sc.qs.length ? 'Every step matched the procedure. This one comes back in a few days to keep it fresh.' : 'The ones you missed come back to you tomorrow.') + '</div>'
        + (sc.done_when ? '<div style="margin-top:10px;font-size:13.5px;"><b>Done when:</b> ' + esc(sc.done_when) + '</div>' : '')
        + (sc.escalate_if ? '<div class="ctp-why" style="background:#FFF8E6;"><b>Tell the person in charge if:</b> ' + esc(sc.escalate_if) + '</div>' : '')
        + '<div style="margin-top:10px;font-size:13px;"><a href="javascript:void(0)" onclick="CTP.close();CTR.openProcedure(\'' + esc(sc.id) + '\')" style="font-weight:700;color:var(--teal);">Read the full procedure</a></div>'
        + finishBtns("CTP.scenario('" + esc(sc.id) + "')"));
      return;
    }
    const q = sc.qs[i];
    body(pips(sc.qs.length, marks)
      + (i === 0 && sc.when ? '<div style="font-size:15px;font-weight:600;color:var(--navy);margin:0 0 10px;line-height:1.5;">' + esc(sc.when) + '</div>' : '')
      + (q.done.length ? '<div class="ctp-done"><b>Done so far:</b><ol style="margin:4px 0 0 18px;padding:0;">' + q.done.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ol></div>' : '')
      + '<div style="font-weight:800;color:var(--navy);margin-top:6px;">' + esc(q.q) + '</div>'
      + q.opts.map((o, k) => '<button class="ctp-opt" data-k="' + k + '" onclick="CTP.pick(' + k + ')">' + esc(o.t) + '</button>').join('') + '<div id="ctpWhy"></div>');
  }
  function pick(k) {
    if (!S) return;
    if (S.type === 'round') return pickRound(k);
    const q = S.sc.qs[S.i], o = q.opts[k];
    if (S.marks[S.i] === undefined) S.marks[S.i] = !!o.ok;
    const b = document.querySelector('#ctpBody .ctp-opt[data-k="' + k + '"]'); if (b) b.classList.add(o.ok ? 'ok' : 'no');
    if (o.ok) {
      document.querySelectorAll('#ctpBody .ctp-opt').forEach((x) => { x.disabled = true; });
      document.getElementById('ctpWhy').innerHTML = '<div class="ctp-why ok">Right.</div><div style="margin-top:10px;"><button class="primary" onclick="CTP.next()">Next</button></div>';
    } else document.getElementById('ctpWhy').innerHTML = '<div class="ctp-why no"><b>Not quite.</b> ' + esc(o.why || '') + ' Try again.</div>';
    const p = document.querySelector('#ctpBody .ctp-pips'); if (p) p.outerHTML = pips(S.sc.qs.length, S.marks);
  }
  function next() { if (!S) return; if (S.type === 'round') { S.i++; return drawRound(); } S.i++; drawScenario(); }

  /* ---- steps in order ---- */
  function startOrder(id) {
    const d = proc(id); if (!d || !usable(d)) { say('That procedure has too few steps to practice.'); return; }
    const st = stepsOf(d).slice(0, 7);
    let mix = shuffle(st.map((_, i) => i), d.id + ':order'); if (mix.every((v, i) => v === i)) mix = mix.slice(1).concat(mix[0]);
    S = { type: 'order', d, st, mix, built: [], checked: false };
    open('Put the steps in order', 'From the published procedure: <b>' + esc(d.title) + '</b>' + (stepsOf(d).length > 7 ? ' (its first 7 steps)' : '')); drawOrder();
  }
  function drawOrder() {
    const { st, mix, built, checked } = S;
    const left = mix.filter((i) => !built.includes(i));
    body('<div class="ctp-grid"><div><div style="font-weight:800;color:var(--navy);font-size:14px;">Tap the next step</div>'
      + (left.length ? left.map((i) => '<button class="ctp-opt" onclick="CTP.place(' + i + ')">' + esc(st[i]) + '</button>').join('') : '<div class="field-note" style="margin-top:8px;">All placed.</div>')
      + '</div><div><div style="font-weight:800;color:var(--navy);font-size:14px;">Your order</div>'
      + (built.length ? built.map((i, k) => '<div class="ctp-place' + (checked ? (i === k ? ' ok' : ' no') : '') + '"><span class="n">' + (k + 1) + '</span><span>' + esc(st[i]) + '</span></div>').join('') : '<div class="field-note" style="margin-top:8px;">Tap a step on the left to place it here.</div>')
      + '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">' + (checked ? '' : '<button class="primary" ' + (built.length === st.length ? '' : 'disabled ') + 'onclick="CTP.checkOrder()">Check my order</button>')
      + '<button class="secondary" onclick="CTP.order(\'' + esc(S.d.id) + '\')">Start over</button></div><div id="ctpOrderRes"></div></div></div>');
  }
  function place(i) { if (!S || S.checked) return; S.built.push(i); drawOrder(); }
  function checkOrder() {
    if (!S || S.built.length !== S.st.length) return;
    S.checked = true; const n = S.built.filter((v, k) => v === k).length; drawOrder();
    record('order:' + S.d.id, 'Steps in order: ' + S.d.title, n, S.st.length);
    document.getElementById('ctpOrderRes').innerHTML = '<div class="ctp-why ' + (n === S.st.length ? 'ok' : 'no') + '">' + (n === S.st.length ? '<b>All in order.</b>' : '<b>' + n + ' of ' + S.st.length + ' in the right place.</b> The red ones are out of order. This one comes back tomorrow.') + '</div>';
  }

  /* ---- practice rounds ---- */
  function startRound(key) {
    const R = ROUNDS[key]; if (!R) return;
    S = { type: 'round', key, R, i: 0, marks: [] };
    open('Practice round: ' + R.title, '<span class="ctp-tag honey">Practice</span> Pretend people. Nothing here is texted, called or saved in AxisCare.'); drawRound();
  }
  function drawRound() {
    const { R, i, marks } = S;
    if (i >= R.nodes.length) {
      const right = marks.filter((m) => m === true).length;
      record('round:' + S.key, 'Practice round: ' + R.title, right, R.nodes.length);
      body(pips(R.nodes.length, marks) + '<p style="font-size:16px;font-weight:700;color:var(--navy);margin:0 0 8px;">' + right + ' of ' + R.nodes.length + ' right the first time.</p>'
        + '<div style="font-size:13.5px;"><b>Done when:</b> ' + esc(R.done) + '</div><div class="field-note" style="font-size:12.5px;margin-top:6px;">From: ' + esc(R.from) + '</div>'
        + finishBtns("CTP.round('" + S.key + "')", 'Run it again'));
      return;
    }
    const n = R.nodes[i];
    body(pips(R.nodes.length, marks) + (i === 0 ? '<div class="ctp-card" style="background:#FAFBFC;font-size:14px;">' + esc(R.start) + '</div>' : '')
      + '<div style="font-weight:800;color:var(--navy);margin-top:6px;line-height:1.45;">' + esc(n.say) + '</div>'
      + n.choices.map((o, k) => '<button class="ctp-opt" data-k="' + k + '" onclick="CTP.pick(' + k + ')">' + esc(o.t) + '</button>').join('') + '<div id="ctpWhy"></div>');
  }
  function pickRound(k) {
    const o = S.R.nodes[S.i].choices[k];
    if (S.marks[S.i] === undefined) S.marks[S.i] = !!o.ok;
    const b = document.querySelector('#ctpBody .ctp-opt[data-k="' + k + '"]'); if (b) b.classList.add(o.ok ? 'ok' : 'no');
    if (o.ok) {
      document.querySelectorAll('#ctpBody .ctp-opt').forEach((x) => { x.disabled = true; });
      document.getElementById('ctpWhy').innerHTML = '<div class="ctp-why ok">' + esc(o.why) + '</div><div style="margin-top:10px;"><button class="primary" onclick="CTP.next()">Next</button></div>';
    } else document.getElementById('ctpWhy').innerHTML = '<div class="ctp-why no"><b>Not quite.</b> ' + esc(o.why) + ' Try again.</div>';
    const p = document.querySelector('#ctpBody .ctp-pips'); if (p) p.outerHTML = pips(S.R.nodes.length, S.marks);
  }

  /* ---- practice call ---- */
  function startCall(key) {
    const p = PERSONAS.find((x) => x[0] === key); if (!p) return;
    S = { type: 'call', persona: key, label: p[1], about: p[2], turns: [], beats: {}, busy: false, over: false, report: null, err: '' };
    open('Practice call: ' + p[1], '<span class="ctp-tag honey">Practice</span> A made-up caller: ' + esc(p[2]) + '. Answer the way you would on the office line. Nobody real is called.');
    drawCall(); talk();
  }
  const SR = () => (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null;
  function drawCall() {
    const c = S; if (!c || c.type !== 'call') return;
    const msgs = c.turns.map((t) => '<div class="ctp-msg ' + (t.who === 'me' ? 'me' : 'them') + '">' + esc(t.text) + '</div>').join('')
      + (c.busy ? '<div class="ctp-msg them" style="opacity:.6;">…</div>' : '');
    const beats = '<div style="font-weight:800;color:var(--navy);font-size:14px;">The five beats</div><div class="field-note" style="font-size:12px;margin-bottom:4px;">Any order. Get to all five.</div>'
      + BEATS.map((bt, i) => '<div class="ctp-beat' + (c.beats[bt[0]] ? ' on' : '') + '"><span class="ctp-dot">' + (c.beats[bt[0]] ? '&#10003;' : (i + 1)) + '</span>' + esc(bt[1]) + '</div>').join('');
    let foot = '';
    if (c.report) {
      const r = c.report, n = BEATS.filter((bt) => r.beats && r.beats[bt[0]]).length;
      foot = '<div class="ctp-card" style="margin-top:12px;"><div style="font-weight:800;color:var(--navy);font-size:15px;">Your coach: ' + n + ' of 5 beats</div>'
        + (r.did_well.length ? '<div style="font-weight:700;margin-top:8px;">You did well</div><ul style="margin:4px 0 0 18px;padding:0;font-size:13.5px;">' + r.did_well.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '')
        + (r.work_on.length ? '<div style="font-weight:700;margin-top:8px;">Next time</div><ul style="margin:4px 0 0 18px;padding:0;font-size:13.5px;">' + r.work_on.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '')
        + (r.rule_slips.length ? '<div class="ctp-why no" style="margin-top:8px;"><b>Against our procedure:</b><ul style="margin:4px 0 0 18px;padding:0;">' + r.rule_slips.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '')
        + '<div class="field-note" style="font-size:12px;margin-top:8px;">' + (r.from_procedure ? 'Graded against our published "First call with a new lead" and the five beats.' : 'Graded on the five beats (the first-call procedure is not published).') + '</div></div>'
        + finishBtns("CTP.call('" + c.persona + "')", 'Same caller again');
    } else {
      const mic = SR() ? '<button class="secondary" type="button" id="ctpMic" onclick="CTP.mic()" title="Speak instead of typing">Speak</button>' : '';
      foot = '<div style="display:flex;gap:8px;margin-top:10px;align-items:flex-end;flex-wrap:wrap;"><textarea id="ctpSay" rows="2" style="flex:1 1 300px;" placeholder="What you say. Enter to send." '
        + (c.busy || c.over ? 'disabled' : '') + ' onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();CTP.send();}"></textarea>'
        + '<button class="primary" onclick="CTP.send()" ' + (c.busy || c.over ? 'disabled' : '') + '>Say it</button>' + mic + '</div>'
        + '<div style="display:flex;gap:8px;margin-top:10px;align-items:center;flex-wrap:wrap;"><button class="secondary" onclick="CTP.endCall()" ' + (c.busy || !c.turns.some((t) => t.who === 'me') ? 'disabled' : '') + '>'
        + (c.over ? 'Get my coaching' : 'End the call and get coaching') + '</button>'
        + (c.over ? '<span class="field-note">The caller has hung up.</span>' : '') + '</div>';
    }
    body('<div class="ctp-call"><div><div class="ctp-msgs" id="ctpMsgs" aria-live="polite">' + msgs + '</div>'
      + (c.err ? '<div class="ctp-why no" style="margin-top:8px;">' + esc(c.err) + '</div>' : '') + foot + '</div><div>' + beats + '</div></div>');
    const m = document.getElementById('ctpMsgs'); if (m) m.scrollTop = m.scrollHeight;
    const t = document.getElementById('ctpSay'); if (t && !c.busy) t.focus();
  }
  async function talk() {
    const c = S; c.busy = true; c.err = ''; drawCall();
    try {
      const out = await callServer({ persona: c.persona, turns: c.turns.slice() });
      if (S !== c) return;
      c.turns.push({ who: 'them', text: out.reply }); c.beats = out.beats || c.beats; c.over = !!out.call_over;
    } catch (e) { if (S === c) c.err = e.message; }
    if (S === c) { c.busy = false; drawCall(); }
  }
  function send() {
    const c = S; if (!c || c.type !== 'call' || c.busy || c.over) return;
    const el = document.getElementById('ctpSay'); const text = String(el && el.value || '').trim().slice(0, 800); if (!text) return;
    c.turns.push({ who: 'me', text }); talk();
  }
  async function endCall() {
    const c = S; if (!c || c.type !== 'call' || c.busy) return;
    c.busy = true; c.err = ''; drawCall();
    try {
      const out = await callServer({ persona: c.persona, turns: c.turns.slice(), finish: true });
      if (S !== c) return;
      c.report = out.report; const n = BEATS.filter((bt) => out.report.beats && out.report.beats[bt[0]]).length;
      await record('call:' + c.persona, 'Practice call: ' + c.label, n, 5, { call: { persona: c.persona, label: c.label, at: new Date().toISOString(), beats: out.report.beats, report: out.report, turns: c.turns.slice(0, 60) } });
    } catch (e) { if (S === c) c.err = e.message; }
    if (S === c) { c.busy = false; drawCall(); }
  }
  function mic() {
    const c = S, R = SR(); if (!c || !R || c.busy || c.over) return;
    if (c.rec) { try { c.rec.stop(); } catch (e) { /* off */ } return; }
    const rec = new R(); rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = false; c.rec = rec;
    const t = document.getElementById('ctpSay'), b = document.getElementById('ctpMic'); const base = t ? t.value : '';
    if (b) b.textContent = 'Listening…';
    rec.onresult = (ev) => { let s = ''; for (const r of ev.results) s += r[0].transcript; if (t) t.value = (base ? base + ' ' : '') + s; };
    rec.onerror = () => { if (S === c) c.err = 'The microphone did not work here. Type instead.'; };
    rec.onend = () => { c.rec = null; const bb = document.getElementById('ctpMic'); if (bb) bb.textContent = 'Speak'; if (c.err && S === c) drawCall(); };
    try { rec.start(); } catch (e) { c.rec = null; if (b) b.textContent = 'Speak'; }
  }

  /* ======================================================================= the Practice tab =============== */
  const KIND = (k) => k.split(':')[0];
  function openItem(k) {
    const [kind, id] = [KIND(k), k.slice(k.indexOf(':') + 1)];
    if (kind === 'scen') startScenario(id); else if (kind === 'order') startOrder(id); else if (kind === 'round') startRound(id); else if (kind === 'call') startCall(id);
  }
  const statsOf = (e, sinceDays) => {
    const r = recOf(e) || {}, since = Date.now() - (sinceDays || 7) * DAY;
    const res = (r.results || []).filter((x) => x && new Date(x.at).getTime() >= since);
    const firsts = {}; for (const x of (r.results || [])) if (!(x.k in firsts)) firsts[x.k] = x;
    const firstTries = Object.values(firsts);
    return { week: res.length, calls: (r.calls || []).length, lastCall: (r.calls || []).slice(-1)[0] || null,
      firstRight: firstTries.filter((x) => x.of && x.score === x.of).length, firstTotal: firstTries.length };
  };
  function personCard(e, plan, isMe) {
    const st = statsOf(e), due = dueFor(e), up = upcomingFor(e), r = recOf(e) || {};
    const good = Object.values(r.review || {}).filter((v) => v && v.box >= 1).sort((a, b) => b.box - a.box).slice(0, 4);
    const lc_ = st.lastCall;
    return '<div class="card" style="padding:14px 18px;margin:0 0 12px;">'
      + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;"><b style="color:var(--navy);font-size:16px;">' + esc(isMe ? 'Your practice' : (plan && plan.name) || nameOf(e)) + '</b>'
      + (plan && window.CTR ? '<span class="ctp-tag">Week ' + Math.max(1, Math.min(8, CTR.weekNow(plan))) + ' of 8</span>' : '')
      + (plan && plan.trainer ? '<span class="ctp-tag honey">Trainer: ' + esc(firstName(nameOf(plan.trainer))) + '</span>' : '') + (plan && plan.remote ? '<span class="ctp-tag">Remote</span>' : '') + '</div>'
      + '<div style="font-size:13.5px;margin-top:8px;line-height:1.6;">Practiced this week: <b>' + st.week + '</b> · Practice calls: <b>' + st.calls + '</b>'
      + (st.firstTotal ? ' · Right the first time: <b>' + st.firstRight + ' of ' + st.firstTotal + '</b>' : '') + '</div>'
      + (good.length ? '<div style="font-weight:700;color:var(--navy);margin-top:10px;font-size:13.5px;">Getting it right</div><ul style="margin:4px 0 0 18px;padding:0;font-size:13.5px;">' + good.map((v) => '<li>' + esc(v.label) + '</li>').join('') + '</ul>' : '')
      + ((due.length || up.length) ? '<div style="font-weight:700;color:var(--navy);margin-top:10px;font-size:13.5px;">Coming back' + (isMe ? ' to you' : '') + '</div><ul style="margin:4px 0 0 18px;padding:0;font-size:13.5px;">'
          + due.map((v) => '<li>' + esc(v.label) + ' <span class="ctp-tag honey">Today</span></li>').join('') + up.slice(0, 4).map((v) => '<li>' + esc(v.label) + ' <span class="ctp-tag">' + esc(words(v.due + 'T12:00:00')) + '</span></li>').join('') + '</ul>' : '')
      + (lc_ ? '<details style="margin-top:10px;"><summary style="cursor:pointer;font-weight:700;color:var(--teal);font-size:13.5px;">Last practice call: ' + esc(lc_.label) + ', ' + esc(words(lc_.at)) + '</summary>'
          + '<div style="font-size:13.5px;margin-top:6px;">' + (lc_.report && lc_.report.work_on && lc_.report.work_on.length ? '<b>Next time:</b> ' + esc(lc_.report.work_on[0]) : '') + '</div>'
          + '<div style="margin-top:6px;max-height:240px;overflow-y:auto;border:1px solid #EEF2F4;border-radius:10px;padding:8px 10px;font-size:13px;line-height:1.5;">'
          + (lc_.turns || []).map((t) => '<div><b>' + (t.who === 'me' ? esc(isMe ? 'You' : firstName(nameOf(e))) : 'Caller') + ':</b> ' + esc(t.text) + '</div>').join('') + '</div></details>' : '')
      + (!st.week && !st.calls && !due.length ? '<div class="field-note" style="font-size:13px;margin-top:8px;">' + (isMe ? 'Nothing practiced yet. Pick anything below to start.' : 'Nothing practiced yet.') + '</div>' : '')
      + '</div>';
  }
  /** the Practice tab inside Coordinator Training. p = the plan on the page (may be null) */
  function html(p) {
    const me = myEmail(), mine = p && lc(p.email) === me;
    const trainer = p && !mine && (owner() || lc(p.trainer) === me);
    let top = '';
    if (trainer) top = '<div class="field-note" style="font-size:13px;margin:0 2px 8px;">What ' + esc(firstName(p.name)) + ' has practiced. Each person is shown on their own, never ranked.</div>' + personCard(p.email, p, false);
    const due = dueFor(me);
    const dueHtml = due.length ? '<div class="card" style="padding:14px 18px;margin:0 0 12px;border-color:#F0A63A;"><div style="font-weight:800;color:var(--navy);font-size:15px;">Coming back to you today</div>'
      + '<div class="ctp-launch" style="margin-top:8px;">' + due.map((v) => '<button onclick="CTP.openItem(\'' + esc(v.k) + '\')"><b>' + esc(v.label) + '</b><span>Last time ' + v.last_score + ' of ' + v.of + '</span></button>').join('') + '</div></div>' : '';
    const week = p && window.CTR ? CTR.weekNow(p) : 0, W = window.CTR && CTR.WEEKS[Math.max(0, Math.min(7, (week || 1) - 1))];
    const weekProcs = W ? W.drills.filter((id) => usable(proc(id))) : [];
    const thisWeek = weekProcs.length ? '<div class="card" style="padding:14px 18px;margin:0 0 12px;"><div style="font-weight:800;color:var(--navy);font-size:15px;">' + (p ? 'For week ' + Math.max(1, week) + ': ' + esc(W.title) : 'To start') + '</div>'
      + '<div class="ctp-launch" style="margin-top:8px;">' + weekProcs.map((id) => '<button onclick="CTP.scenario(\'' + id + '\')"><b>' + esc(proc(id).title) + '</b><span>What do you do next?</span></button><button onclick="CTP.order(\'' + id + '\')"><b>' + esc(proc(id).title) + '</b><span>Put the steps in order</span></button>').join('') + '</div></div>' : '';
    const calls = '<div class="card" style="padding:14px 18px;margin:0 0 12px;"><div style="font-weight:800;color:var(--navy);font-size:15px;">Practice calls</div>'
      + '<div class="field-note" style="font-size:13px;margin-top:2px;">A made-up caller answers whatever you say. At the end your coach grades the call against our first-call procedure and the five beats. Text only, or speak where your browser allows.</div>'
      + '<div class="ctp-launch" style="margin-top:8px;">' + PERSONAS.map((x) => '<button onclick="CTP.call(\'' + x[0] + '\')"><b>' + esc(x[1]) + '</b><span>' + esc(x[2]) + '</span></button>').join('') + '</div></div>';
    const rounds = '<div class="card" style="padding:14px 18px;margin:0 0 12px;"><div style="font-weight:800;color:var(--navy);font-size:15px;">Practice rounds</div>'
      + '<div class="field-note" style="font-size:13px;margin-top:2px;">Pretend people in screens laid out like the real ones. Nothing is texted, called or saved in AxisCare.</div>'
      + '<div class="ctp-launch" style="margin-top:8px;">' + Object.entries(ROUNDS).map(([k, R]) => '<button onclick="CTP.round(\'' + k + '\')"><b>' + esc(R.title) + '</b><span>' + esc(R.start.slice(0, 80)) + '…</span></button>').join('') + '</div></div>';
    const groups = {}; for (const d of lib()) if (usable(d)) (groups[d.moment || 'other'] = groups[d.moment || 'other'] || []).push(d);
    const MOM = { office: 'Your day', lead: 'New families', assess: 'Starting care', ongoing: 'Clients and scheduling', caregivers: 'Caregivers', wrong: 'When something goes wrong', ending: 'Ending care', other: 'Other' };
    const all = '<details class="card" style="padding:14px 18px;margin:0 0 12px;"><summary style="cursor:pointer;font-weight:800;color:var(--navy);font-size:15px;">Every procedure (' + lib().filter(usable).length + ')</summary>'
      + '<div class="field-note" style="font-size:13px;margin-top:4px;">Built from our published procedures. When a procedure changes, its practice changes with it.</div>'
      + Object.keys(MOM).filter((m) => groups[m]).map((m) => '<div style="font-weight:700;color:var(--navy);margin:12px 0 4px;font-size:13.5px;">' + esc(MOM[m]) + '</div>'
        + groups[m].sort((a, b) => a.title.localeCompare(b.title)).map((d) => '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:5px 0;border-top:1px solid #EEF2F4;font-size:13.5px;"><span style="flex:1 1 240px;">' + esc(d.title) + '</span>'
          + '<button class="linklike" onclick="CTP.scenario(\'' + esc(d.id) + '\')">What next?</button><button class="linklike" onclick="CTP.order(\'' + esc(d.id) + '\')">In order</button></div>').join('')).join('') + '</details>';
    const others = (owner() ? (window.CTR ? CTR.plans() : []) : (window.CTR ? CTR.plans().filter((x) => lc(x.trainer) === me) : [])).filter((x) => !p || lc(x.email) !== lc(p.email));
    const otherHtml = others.length ? '<details class="card" style="padding:14px 18px;margin:0 0 12px;"><summary style="cursor:pointer;font-weight:800;color:var(--navy);font-size:15px;">Everyone you train</summary><div style="margin-top:10px;">'
      + others.map((x) => personCard(x.email, x, false)).join('') + '</div></details>' : '';
    return top + (trainer ? '' : personCard(me, mine ? p : null, true)) + dueHtml + thisWeek + calls + rounds + all + otherHtml;
  }

  window.CTP = { html, close, scenario: startScenario, order: startOrder, round: startRound, call: startCall, pick, next, place, checkOrder, send, endCall, mic, openItem,
    build: scenario, dueFor, upcomingFor, recOf, ROUNDS, PERSONAS, state: () => S };
})();
