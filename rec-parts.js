/* =============================================================================
   LONG VISITS: THE RECORDER IN PARTS (home visit stage 2, Samantha 2026-10-29: "make the recorder handle a full
   90-minute home visit").

   An in-home assessment runs an hour and a half. One recording that long is one big upload at the end of the visit
   (over the family's wifi or a phone hotspot) and one long job for the transcriber. So an assessment is recorded in
   10-minute parts instead:
     • each part is its own complete audio file, uploaded while the visit is still going, and written out on its own,
       so by the time the coordinator stands up most of the transcript is already there;
     • a part that cannot upload (no signal) stays on the iPad and tries again by itself every 30 seconds;
     • the next part starts two seconds before the last one stops, so no words fall between them;
     • Pause holds the recording for a private moment, Resume carries on in the same part;
     • if the iPad locks or another app takes the microphone, everything up to then is kept and one tap on
       "Keep recording" carries on in the same recording.
   Each part is a row in `recordings` (session_id, part, offset_seconds; Desktop 1177 adds the columns), so the
   1-year audio clean-up and everything else that reads a recording works on parts unchanged. The list shows a
   visit as one recording.

   Interviews do not use this: they stay one recording each (the answer fill and the AI review read one transcript).
   Needs: index.html's recorder (REC, recDb*, recUpload, recLoadList, recRetry).
============================================================================= */
(function () {
  const PART_SECS = () => window.RECP_PART_SECS || 600;   // a part every 10 minutes (a test may shorten it)
  const OVERLAP_MS = 2000;        // the next part starts this long before the last one stops
  const RETRY_MS = 30000;         // a part that could not upload tries again this often
  const BITS = 48000;             // speech, not music: about 3.5 MB per 10 minutes instead of about 10 MB

  const pending = new Map();      // part id -> { blob, meta } waiting to upload (also on the iPad in IndexedDB)
  let flushing = false, retryT = null, upDone = 0, upErr = '';
  const esc = (s) => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(s) : String(s == null ? '' : s));
  const $ = (id) => document.getElementById(id);

  const on = () => REC.parts === true;
  function elapsed() {
    if (!REC.startedAt) return 0;
    const now = Date.now();
    const held = (REC.pausedMs || 0) + (REC.pauseAt ? now - REC.pauseAt : 0) + (REC.lostAt ? now - REC.lostAt : 0);
    return Math.max(0, (now - REC.startedAt - held) / 1000);
  }
  function state() {
    if (!on() || !REC.group) return 'off';
    if (REC.lostAt) return 'lost';
    if (REC.pauseAt) return 'paused';
    return 'recording';
  }
  const clock = (s) => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600);
    return (h ? h + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') : Math.floor(s / 60)) + ':' + String(s % 60).padStart(2, '0'); };

  /* ---- recording --------------------------------------------------------- */
  function begin(mime) {
    const by = (typeof ME !== 'undefined' && (ME.name || ME.email)) || null;
    const same = REC.group && REC.groupSubject === REC.subject && REC.groupKind === REC.kind;
    if (!same) {
      REC.group = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      REC.groupSubject = REC.subject; REC.groupKind = REC.kind; REC.groupLabel = REC.label;
      REC.part = 0; REC.startedAt = Date.now(); REC.pausedMs = 0; REC.pauseAt = 0; REC.lostAt = 0; upDone = 0;
    } else if (REC.lostAt) { REC.pausedMs += Date.now() - REC.lostAt; REC.lostAt = 0; }
    REC.parts = true; REC.by = by; REC.mime = mime; REC.stopping = false; REC.openParts = REC.openParts || new Set();
    const tr = REC.stream && REC.stream.getAudioTracks()[0];
    if (tr) {
      tr.addEventListener('ended', lost);
      tr.addEventListener('mute', () => { REC.muted = true; ui(); });
      tr.addEventListener('unmute', () => { REC.muted = false; ui(); });
    }
    REC.muted = false;
    open();
    clearInterval(REC.roll); REC.roll = setInterval(roll, 1000);
    clearInterval(REC.tick); REC.tick = setInterval(ui, 500);
    recWake(true);
    ui();
  }

  function open() {
    const n = REC.part + 1, id = REC.group + '#' + n;
    let mr;
    try { mr = new MediaRecorder(REC.stream, REC.mime ? { mimeType: REC.mime, audioBitsPerSecond: BITS } : { audioBitsPerSecond: BITS }); }
    catch (e) { mr = new MediaRecorder(REC.stream, REC.mime ? { mimeType: REC.mime } : undefined); }
    REC.part = n;
    const P = { id, n, mr, offset: Math.round(elapsed()), secs: null, chunks: [], writes: [], got: 0,
      kind: REC.groupKind, subject: REC.groupSubject, label: REC.groupLabel, group: REC.group, by: REC.by,
      mime: mr.mimeType || REC.mime || 'audio/webm', startedAt: Date.now() };
    P.sess = { id, kind: P.kind, subject: P.subject, label: P.label, startedAt: P.startedAt, mime: P.mime, by: P.by,
      group: P.group, part: n, offset: P.offset };
    recDbPutSess(P.sess);
    mr.ondataavailable = (e) => { if (e.data && e.data.size) { P.got++; P.chunks.push(e.data); P.writes.push(recDbPutChunk(id, e.data)); } };
    mr.onstop = () => {
      /* A browser that cannot run two recorders at once: the next part starts the moment this one stops. */
      if (P.next && on() && !REC.stopping && !REC.lostAt) { try { open(); } catch (er) { lost(); } }
      close(P);
    };
    mr.onerror = () => { if (REC.cur === P) lost(); };
    mr.start(1000);
    REC.mr = mr; REC.cur = P; REC.openParts.add(P);
    return P;
  }

  function roll() {
    if (state() !== 'recording' || !REC.cur || REC.rolling) return;
    if (elapsed() - REC.cur.offset < PART_SECS()) return;
    const old = REC.cur;
    if (REC.oneAtATime) { old.next = true; old.secs = Math.round(elapsed() - old.offset); try { old.mr.stop(); } catch (e) {} return; }
    let fresh;
    try { fresh = open(); } catch (e) { REC.oneAtATime = true; return; }
    REC.rolling = true;
    setTimeout(() => {
      REC.rolling = false;
      if (!on() || REC.cur !== fresh || REC.lostAt || REC.stopping) {           // stopped or lost in the meantime: both parts are already closing
        if (old.secs == null) old.secs = Math.round(elapsed() - old.offset);
        try { if (old.mr.state !== 'inactive') old.mr.stop(); } catch (e) {}
        return;
      }
      if (!fresh.got) {
        /* The second recorder heard nothing: this browser cannot run two at once. Keep the first going, and from
           now on roll over one after the other (a fraction of a second between parts). */
        REC.oneAtATime = true;
        fresh.mr.onstop = null; try { fresh.mr.stop(); } catch (e) {}
        REC.openParts.delete(fresh); recDbDrop(fresh.id);
        REC.cur = old; REC.mr = old.mr; REC.part = old.n;
        return;
      }
      if (old.secs == null) old.secs = Math.round(elapsed() - old.offset);
      try { if (old.mr.state !== 'inactive') old.mr.stop(); } catch (e) {}
    }, OVERLAP_MS);
  }

  async function close(P) {
    REC.openParts && REC.openParts.delete(P);
    if (P.secs == null) P.secs = Math.round((REC.startedAt ? elapsed() : (P.endAt || 0)) - P.offset);
    await Promise.all(P.writes);
    const blob = new Blob(P.chunks, { type: P.mime });
    P.chunks = [];
    if (P.secs < 2 || !blob.size) await recDbDrop(P.id);
    else {
      const meta = { kind: P.kind, subject: P.subject, label: P.label, by: P.by, group: P.group, part: P.n, offset: P.offset, secs: P.secs };
      await recDbPutSess(Object.assign({}, P.sess, { secs: P.secs, closed: true }));
      pending.set(P.id, { blob, meta });
    }
    if (REC.cur === P && REC.stopping) end();
    flush();
  }

  function pause() {
    if (state() !== 'recording') return;
    try { REC.mr.pause(); } catch (e) {}
    REC.pauseAt = Date.now(); ui();
  }
  function resume() {
    if (state() !== 'paused') return;
    try { REC.mr.resume(); } catch (e) {}
    REC.pausedMs += Date.now() - REC.pauseAt; REC.pauseAt = 0; ui();
  }

  /* The iPad locked, another app took the microphone, or the recorder failed. What was recorded is kept. */
  function lost() {
    if (!on() || REC.stopping || REC.lostAt || !REC.group) return;
    if (REC.pauseAt) { REC.pausedMs += Date.now() - REC.pauseAt; REC.pauseAt = 0; }
    REC.lostAt = Date.now();
    clearInterval(REC.roll); REC.roll = null;
    (REC.openParts || new Set()).forEach((P) => { if (P.secs == null) P.secs = Math.round(elapsed() - P.offset); try { if (P.mr.state !== 'inactive') P.mr.stop(); } catch (e) {} });
    try { REC.stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
    recWake(false); ui();
  }

  function stop() {
    if (!on()) return;
    REC.stopping = true;
    clearInterval(REC.roll); REC.roll = null;
    if (REC.pauseAt) { try { REC.mr.resume(); } catch (e) {} REC.pausedMs += Date.now() - REC.pauseAt; REC.pauseAt = 0; }
    const P = REC.cur;
    if (P && P.mr.state !== 'inactive') { P.secs = Math.round(elapsed() - P.offset); try { P.mr.stop(); } catch (e) { end(); } }
    else end();
  }
  function end() {
    (REC.openParts || new Set()).forEach((P) => { if (P.secs == null) P.secs = Math.round(elapsed() - P.offset); });
    try { REC.stream && REC.stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
    recWake(false);
    clearInterval(REC.tick); REC.tick = null; clearInterval(REC.roll); REC.roll = null;
    REC.group = null; REC.cur = null; REC.mr = null; REC.lostAt = 0; REC.pauseAt = 0; REC.pausedMs = 0;
    REC.stopping = false; REC.parts = false; REC.startedAt = 0; REC.muted = false;
    const keep = $('recKeep'); if (keep) keep.style.display = 'none';
    if (typeof recReset === 'function') recReset();
    ui();
  }

  /* ---- uploading, in order, as the visit goes ------------------------------ */
  async function flush() {
    if (flushing) return;
    flushing = true;
    try {
      const ids = [...pending.keys()].sort((a, b) => pending.get(a).meta.part - pending.get(b).meta.part);
      for (const id of ids) {
        const it = pending.get(id); if (!it) continue;
        it.up = true; ui();
        const ok = await recUpload(it.blob, it.meta.secs, it.meta);
        it.up = false;
        if (ok) { pending.delete(id); upDone++; if (upErr) { const er = $('recErr'); if (er) er.style.display = 'none'; } upErr = ''; await recDbDrop(id); }
        else { upErr = 'x'; break; }        // keep the order; the rest wait for the next try
      }
    } finally { flushing = false; ui(); }
    clearTimeout(retryT);
    if (pending.size) retryT = setTimeout(flush, RETRY_MS);
  }
  window.addEventListener('online', () => { if (pending.size) flush(); });

  /* ---- what the screen shows ----------------------------------------------- */
  function ui() {
    const st = state();
    const go = $('recGo'), stopB = $('recStopB'), pz = $('recPauseB'), rs = $('recResumeB'), kg = $('recKeepGo');
    const box = $('recLost'), up = $('recUp'), t = $('recTimer'), s = $('recState');
    if (st !== 'off') {
      if (go) go.style.display = 'none';
      if (stopB) stopB.style.display = '';
      if (pz) pz.style.display = st === 'recording' ? '' : 'none';
      if (rs) rs.style.display = st === 'paused' ? '' : 'none';
      if (t) t.textContent = clock(elapsed());
      if (s) s.textContent = st === 'recording' ? (REC.muted ? 'the microphone went quiet' : 'recording') : st === 'paused' ? 'paused' : 'stopped';
    } else {
      [pz, rs].forEach((b) => { if (b) b.style.display = 'none'; });
    }
    if (box) {
      box.style.display = st === 'lost' || (st === 'recording' && REC.muted) ? '' : 'none';
      box.innerHTML = st === 'lost'
        ? '<b>The recording stopped at ' + clock(elapsed()) + '.</b> The iPad locked or another app took the microphone. Everything up to then is saved.'
          + '<div style="margin-top:8px;"><button class="secondary" id="recKeepGo" onclick="recStart()">● Keep recording</button></div>'
        : '<b>The microphone went quiet.</b> A phone call or another app may have it. The recording carries on when the microphone comes back.';
    }
    if (kg && st !== 'lost') kg.remove();
    if (up) {
      const waiting = pending.size, sending = [...pending.values()].some((x) => x.up);
      const done = upDone;
      let msg = '';
      if (waiting && upErr) msg = (waiting === 1 ? '1 part is' : waiting + ' parts are') + ' waiting for a connection. ' + (waiting === 1 ? 'It is' : 'They are') + ' safe on this iPad and will go up by themselves.';
      else if (sending) msg = 'Sending part ' + Math.min(...[...pending.values()].filter((x) => x.up).map((x) => x.meta.part)) + ' to the office…';
      else if (done && st !== 'off') msg = (done === 1 ? '1 part' : done + ' parts') + ' already sent to the office.';
      else if (done && !waiting) msg = 'All parts sent to the office.';
      up.textContent = msg; up.style.display = msg ? '' : 'none';
      up.style.color = waiting && upErr ? 'var(--red)' : '';
    }
  }

  /* ---- a visit recording left on the iPad (the page closed, or the upload never got through) ---------- */
  function groupBoxes(sessions) {
    const groups = {};
    sessions.forEach((s) => { if (!pending.has(s.id)) (groups[s.group] = groups[s.group] || []).push(s); });
    return Object.keys(groups).filter((g) => g !== REC.group).map((g) => {
      const ps = groups[g].sort((a, b) => a.part - b.part);
      const when = new Date(ps[0].startedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      return '<div style="margin-top:9px;background:#FFF8E8;border:1px solid #F5D9A0;border-radius:9px;padding:9px 11px;font-size:13px;">'
        + '<b>A visit recording from ' + esc(when) + ' has ' + (ps.length === 1 ? '1 part' : ps.length + ' parts') + ' saved on this device</b> that did not reach the office yet.'
        + '<div style="display:flex;gap:8px;margin-top:7px;flex-wrap:wrap;">'
        + '<button class="secondary" onclick="RECP.recover(\'' + esc(g) + '\',this)">Upload ' + (ps.length === 1 ? 'it' : 'them') + '</button>'
        + '<button class="fb" onclick="RECP.discard(\'' + esc(g) + '\')">Discard ' + (ps.length === 1 ? 'it' : 'them') + '</button></div></div>';
    }).join('');
  }
  async function recover(g, btn) {
    const ps = (await recDbSessions()).filter((s) => s.group === g).sort((a, b) => a.part - b.part);
    if (btn) { btn.disabled = true; btn.textContent = 'Uploading…'; }
    let ok = true;
    for (const s of ps) {
      const ch = await recDbChunks(s.id);
      if (!ch.length) { await recDbDrop(s.id); continue; }
      const blob = new Blob(ch.map((c) => c.blob), { type: s.mime || 'audio/webm' });
      const secs = s.secs || Math.max(1, Math.round((ch[ch.length - 1].at - s.startedAt) / 1000));
      if (await recUpload(blob, secs, Object.assign({}, s, { secs }))) await recDbDrop(s.id);
      else { ok = false; break; }
    }
    if (!ok && btn) { btn.disabled = false; btn.textContent = 'Upload them'; }
    recRecoverShow();
  }
  async function discard(g) {
    if (!(await ccConfirm('Discard this unfinished visit recording? It cannot be brought back.'))) return;
    for (const s of (await recDbSessions()).filter((x) => x.group === g)) await recDbDrop(s.id);
    recRecoverShow();
  }

  /* ---- the list: a visit shows as one recording ----------------------------- */
  function groupHtml(rows) {
    const ps = rows.slice().sort((a, b) => (a.part || 0) - (b.part || 0));
    const sid = ps[0].session_id;
    const first = ps.reduce((m, r) => (r.created_at < m ? r.created_at : m), ps[0].created_at);
    const when = new Date(first).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const total = Math.max(...ps.map((r) => (r.offset_seconds || 0) + (r.seconds || 0)));
    const done = ps.filter((r) => r.status === 'done').length, failed = ps.filter((r) => r.status === 'failed').length;
    const by = ps.find((r) => r.recorded_by);
    const state = done === ps.length ? '' : done + ' of ' + ps.length + ' parts written out' + (failed ? ', ' + failed + ' could not be' : '');
    const anyAudio = ps.some((r) => !r.audio_purged_at);
    const turns = ps.some((r) => r.turns && r.turns.length);
    return '<div style="border-top:1px solid var(--border);padding:9px 0;">'
      + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;">'
        + '<b style="color:var(--navy);">' + esc(when) + '</b>'
        + '<span class="field-note">' + clock(total) + ' · ' + (ps.length === 1 ? '1 part' : ps.length + ' parts') + '</span>'
        + (by ? '<span class="field-note">by ' + esc(by.recorded_by) + '</span>' : '')
        + (state ? '<span class="field-note">' + esc(state) + '</span>' : '')
        + '<span style="flex:1;"></span>'
        + (anyAudio ? '<button class="fb" onclick="RECP.play(\'' + esc(sid) + '\')">▶ Listen</button>' : '<span class="field-note">audio deleted, transcript kept</span>')
        + (failed ? '<button class="fb" onclick="RECP.retry(\'' + esc(sid) + '\')">Try again</button>' : '')
        + (done && document.getElementById('assess_transcript_text') ? '<button class="fb" onclick="RECP.use(\'' + esc(sid) + '\')">Use this transcript</button>' : '')
      + '</div>'
      + ps.filter((r) => r.error).map((r) => '<div class="field-note" style="color:var(--red);">Part ' + (r.part || '?') + ': ' + esc(r.error) + '</div>').join('')
      + '<div id="recplay_' + esc(sid) + '"></div>'
      + (turns
        ? '<details style="margin-top:6px;"><summary style="cursor:pointer;font-size:13px;font-weight:700;color:var(--navy);">Read the transcript</summary>'
          + '<div class="field-note" style="margin-top:6px;">The voices are labelled again in each 10-minute part, so Speaker A in one part may be someone else in the next.</div>'
          + '<div style="max-height:360px;overflow:auto;margin-top:7px;">'
          + ps.map((r) => '<div style="font-size:12px;font-weight:700;color:var(--navy);margin:8px 0 2px;">Part ' + (r.part || '?') + ' · from ' + clock(r.offset_seconds || 0) + '</div>'
            + ((r.turns || []).map((t) => '<div style="font-size:13.5px;padding:4px 0;"><span class="field-note">' + clock((t.start || 0) + (r.offset_seconds || 0)) + ' · ' + esc(t.name || t.speaker || '') + '</span><br>' + esc(t.text) + '</div>').join('')
              || '<div class="field-note">' + (r.status === 'failed' ? 'Could not be written out.' : 'Being written out…') + '</div>')).join('')
          + '</div></details>'
        : '')
      + '</div>';
  }
  /* rows from recLoadList, newest first: a visit's parts become one entry where its first part appears */
  function listHtml(rows, single) {
    const seen = {}, groups = {};
    rows.forEach((r) => { if (r.session_id) (groups[r.session_id] = groups[r.session_id] || []).push(r); });
    return rows.map((r) => {
      if (!r.session_id) return single([r]);
      if (seen[r.session_id]) return '';
      seen[r.session_id] = 1;
      return groupHtml(groups[r.session_id]);
    }).join('');
  }

  async function parts(sid) {
    const { data, error } = await sb.from('recordings').select('id, part, offset_seconds, seconds, storage_path, status, transcript').eq('session_id', sid).order('part', { ascending: true });
    if (error) throw error;
    return data || [];
  }
  async function play(sid) {
    const host = $('recplay_' + sid); if (!host) return;
    if (host.innerHTML) { host.innerHTML = ''; return; }
    try {
      const ps = (await parts(sid)).filter((r) => r.storage_path);
      if (!ps.length) { host.innerHTML = '<div class="field-note">The audio has been deleted. The transcript is kept.</div>'; return; }
      const urls = [];
      for (const r of ps) { const { data, error } = await sb.storage.from('recordings').createSignedUrl(r.storage_path, 3600); if (error) throw error; urls.push(data.signedUrl); }
      host.innerHTML = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px;">'
        + ps.map((r, i) => '<button class="fb" data-recp="' + i + '">Part ' + r.part + ' · ' + clock(r.offset_seconds || 0) + '</button>').join('') + '</div>'
        + '<audio controls preload="none" style="width:100%;margin-top:7px;"></audio>';
      const au = host.querySelector('audio'); let at = 0;
      const go = (i, auto) => { at = i; au.src = urls[i];
        host.querySelectorAll('[data-recp]').forEach((b, j) => { b.style.fontWeight = j === i ? '700' : ''; });
        if (auto) au.play().catch(() => {}); };
      host.querySelectorAll('[data-recp]').forEach((b) => b.addEventListener('click', () => go(+b.getAttribute('data-recp'), true)));
      au.addEventListener('ended', () => { if (at + 1 < urls.length) go(at + 1, true); });
      go(0, false);
    } catch (e) { host.innerHTML = '<div class="field-note" style="color:var(--red);">Could not open the audio: ' + esc(e && e.message || 'error') + '</div>'; }
  }
  async function retry(sid) {
    try { for (const r of (await parts(sid)).filter((x) => x.status === 'failed')) await recRetry(r.id); }
    catch (e) { alert('Could not start it again: ' + (e && e.message || 'error')); }
  }
  async function use(sid) {
    const box = $('assess_transcript_text'); if (!box) return;
    const ps = await parts(sid);
    box.value = ps.filter((r) => r.transcript).map((r) => '--- Part ' + r.part + ', from ' + clock(r.offset_seconds || 0) + ' ---\n' + r.transcript).join('\n\n');
    const src = $('assess_transcript_source'); if (src) src.value = 'Recorded in the hub';
    alert('Put into the transcript box. Save the visit, then generate the care plan.');
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  window.RECP = { begin, stop, pause, resume, lost, state, elapsed, ui, flush, groupBoxes, recover, discard, listHtml, play, retry, use,
    _pending: pending, _clock: clock };
})();
