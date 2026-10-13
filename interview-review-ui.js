/* The AI Interview Review in the Hub (2026-10-13, Samantha: "yes to all" on
   https://claude.ai/artifact/Ki7QEvLaDWqTQ5UAxuHGXp, then "build"). Office only (interview_reviews, 648).
   A second set of ears: it runs only when someone taps Analyze Interview (or Check before they leave on the phone),
   through the interview-review server function. What the applicant SAID (blue, with the time in the recording, tap to
   listen) is kept apart from what the AI SUGGESTS we clarify (gold). Each item: Confirm / Correct / Dismiss with a note
   (saved in the review's marks, never changing the AI's words or the interviewer's notes), and any item can become a
   follow-up task on someone's My Work. Confirming is not resolving: a task stays open until its owner marks it resolved.
   No score, verdict or hiring recommendation, by design. */
(function () {
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var clock = function (s) { s = Math.max(0, Math.round(+s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  var when = function (iso) { try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };
  var SEC = [['strengths', 'Experience and strengths, from specific answers'], ['concerns', 'Concerns or inconsistencies to follow up'],
    ['communication', 'Communication, from the transcript'], ['safety', 'Confidentiality, safety or boundaries'],
    ['missed', 'Questions the interview did not cover'], ['reference_questions', 'Suggested reference-check questions']];
  var MARK = { confirm: 'Confirmed', correct: 'Corrected', dismiss: 'Dismissed' };
  var CSS = '.ir-tag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:6px;padding:2px 7px;background:#FDF3E3;color:#A8660E}'
    + '.ir-sec{border-top:1px solid #E4E9F0;margin-top:12px;padding-top:10px}.ir-sec h4{margin:0 0 4px;font-size:14px;color:#0E3860}'
    + '.ir-item{border:1px solid #E4E9F0;border-radius:11px;padding:9px 11px;margin-top:8px;display:grid;gap:6px;background:#fff}'
    + '.ir-item.dis{opacity:.55}.ir-said{border-left:3px solid #0E3860;padding-left:9px;font-size:14px}'
    + '.ir-said .ts{appearance:none;border:0;background:#EEF3F9;color:#0E3860;border-radius:6px;padding:1px 6px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;margin-right:4px}'
    + '.ir-clar{border-left:3px solid #A8660E;padding-left:9px;font-size:14px}.ir-clar b{color:#A8660E}'
    + '.ir-acts{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.ir-act{appearance:none;border:1.5px solid #DCE4EE;background:#fff;border-radius:8px;padding:4px 10px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer}'
    + '.ir-act.on{background:#E7F6EC;border-color:#1F7A4D;color:#1F7A4D}.ir-act.on.x{background:#F3F6FA;border-color:#5B6878;color:#5B6878}.ir-act.on.e{background:#FDF3E3;border-color:#A8660E;color:#A8660E}'
    + '.ir-task{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;background:#F6F9FD;border-radius:8px;padding:6px 9px;font-size:13px}'
    + '.ir-stat{display:flex;flex-wrap:wrap;gap:16px;font-size:13px;margin-top:6px}.ir-stat b{display:block;font-size:18px;color:#0E3860;font-variant-numeric:tabular-nums}'
    + '.ir-ta{width:100%;box-sizing:border-box;font:inherit;font-size:13.5px;border:1.5px solid #DCE4EE;border-radius:8px;padding:6px 9px}';
  function css() { if (document.getElementById('irCss')) return; var s = document.createElement('style'); s.id = 'irCss'; s.textContent = CSS; document.head.appendChild(s); }
  var ROWS = {};      // review id -> row
  var HOSTS = {};     // applicant id -> host element

  async function call(body) {
    var r = await sb.functions.invoke('interview-review', { body: body });
    if (r.error) { var m = r.error.message || 'error'; try { var j = await r.error.context.json(); if (j && j.error) m = j.error; } catch (e) { /* plain */ } throw new Error(m); }
    if (r.data && r.data.error) throw new Error(r.data.error);
    return r.data || {};
  }
  function who() { return (typeof ME !== 'undefined' && ME && (ME.name || ME.email)) || ''; }
  function task(id) { return id && typeof DATA !== 'undefined' && (DATA.ops_items || []).find(function (x) { return x.id === id; }); }

  function itemHtml(row, it) {
    var mk = (row.marks || {})[it.id] || {}, rid = esc(row.id), iid = esc(it.id);
    var h = '<div class="ir-item' + (mk.mark === 'dismiss' ? ' dis' : '') + '" id="ir_' + rid + '_' + iid + '">';
    (it.said || []).forEach(function (s) {
      h += '<div class="ir-said">' + (s.source === 'application' ? '<span class="ts" style="cursor:default">application</span>'
        : '<button class="ts" title="Listen from here" onclick="IR.play(\'' + esc(s.rec) + '\',' + (+s.at || 0) + ',this)">' + (s.part > 1 || (row.review.parts || []).length > 1 ? 'Part ' + s.part + ' · ' : '') + clock(s.at) + '</button>')
        + (s.source === 'application' ? ' Their application says: ' : ' They said: ') + '<q>' + esc(s.quote) + '</q></div>';
    });
    if (it.clarify) h += '<div class="ir-clar"><b>AI suggests we clarify:</b> ' + esc(it.clarify) + '</div>';
    if (it.text) h += '<div class="ir-clar"><b>AI ' + (it.section === 'strengths' ? 'notes' : 'suggests') + ':</b> ' + esc(it.text) + '</div>';
    h += '<div class="ir-acts">' + ['confirm', 'correct', 'dismiss'].map(function (m) {
      return '<button class="ir-act' + (mk.mark === m ? ' on' + (m === 'dismiss' ? ' x' : m === 'correct' ? ' e' : '') : '') + '" onclick="IR.mark(\'' + rid + '\',\'' + iid + '\',\'' + m + '\')">' + { confirm: 'Confirm', correct: 'Correct', dismiss: 'Dismiss' }[m] + '</button>';
    }).join('') + (mk.mark ? '<span class="field-note">' + esc(MARK[mk.mark]) + (mk.by ? ' by ' + esc(mk.by) : '') + (mk.at ? ', ' + esc(when(mk.at)) : '') + '</span>' : '') + '</div>';
    if (mk.mark) h += '<textarea class="ir-ta" rows="2" placeholder="' + (mk.mark === 'correct' ? 'What is actually right' : 'Your follow-up note (for example, what the reference said)') + '" onchange="IR.note(\'' + rid + '\',\'' + iid + '\',this.value)">' + esc(mk.note || '') + '</textarea>';
    var t = task(mk.task_id);
    if (t) h += '<div class="ir-task"><span><b>Follow-up task:</b> ' + esc(t.title) + ' · ' + esc(t.owner_name || t.owner || 'Unassigned') + '</span>'
      + (t.status === 'done' ? '<span style="color:#1F7A4D;font-weight:700">Resolved' + (t.close_note ? ': ' + esc(t.close_note) : '') + '</span>'
        : '<button class="ir-act" onclick="IR.resolve(\'' + esc(t.id) + '\',\'' + rid + '\')">Mark resolved</button>') + '</div>';
    else if (mk.task_id) h += '<div class="ir-task field-note">A follow-up task was made (it is not on this computer\'s list yet; refresh).</div>';
    else if (it.section !== 'strengths' && mk.mark !== 'dismiss') h += '<div class="ir-task" id="irt_' + rid + '_' + iid + '"><button class="ir-act" onclick="IR.taskForm(\'' + rid + '\',\'' + iid + '\')">+ Make a follow-up task</button></div>';
    return h + '</div>';
  }

  function reviewHtml(row) {
    var R = row.review || {}, st = R.stats;
    var h = '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between">'
      + '<span><span class="ir-tag">AI-generated · second set of ears</span> <span class="field-note">' + (R.kind === 'check' ? 'Check before they left' : 'Analyze Interview') + ', ' + esc(when(row.created_at)) + (row.created_by ? ' by ' + esc(row.created_by) : '') + '</span></span></div>';
    if (R.parts_still_transcribing) h += '<div class="field-note" style="color:#A8660E">' + R.parts_still_transcribing + ' part(s) were still being written out and are not in this review.</div>';
    if (R.summary) h += '<div class="ir-sec" style="border-top:0;margin-top:6px;padding-top:0"><h4>Summary</h4><div style="font-size:14px">' + esc(R.summary) + '</div></div>';
    if (st) h += '<div class="ir-sec"><h4>Communication, counted from the recording</h4><div class="ir-stat">'
      + (st.applicant_share != null ? '<div><b>' + st.applicant_share + '%</b>of the talking was the applicant</div>' : '')
      + '<div><b>' + (st.overlap_count || 0) + '</b>times they started while the interviewer was still talking</div>'
      + (st.longest && st.longest.secs ? '<div><b>' + clock(st.longest.secs) + '</b>longest single answer</div>' : '') + '</div>'
      + '<div class="field-note">Recordings can mark people talking at once wrongly when someone pauses; listen before relying on it. Only how long, never why.</div></div>';
    SEC.forEach(function (s) {
      var list = (R.items || []).filter(function (x) { return x.section === s[0]; }); if (!list.length) return;
      h += '<div class="ir-sec"><h4>' + esc(s[1]) + '</h4>' + list.map(function (it) { return itemHtml(row, it); }).join('') + '</div>';
    });
    if (R.dropped_unverified) h += '<div class="field-note" style="margin-top:8px">' + R.dropped_unverified + ' AI item(s) left out because their quote could not be found in the transcript.</div>';
    h += '<div class="ir-sec field-note">Not in this review, by design: any hiring recommendation, score or verdict, and anything about personality, honesty, mental health or suitability drawn from how someone speaks, their accent or tone. The interviewer\'s notes are kept separately and never changed by the AI.</div>';
    return h;
  }
  function counts(row) {
    var items = (row.review && row.review.items || []).filter(function (x) { return x.section !== 'strengths'; }), m = row.marks || {};
    var open = items.filter(function (x) { var mk = m[x.id] || {}; var t = task(mk.task_id); return mk.mark !== 'dismiss' && (!mk.mark || (t && t.status !== 'done')); }).length;
    return { open: open, dismissed: items.filter(function (x) { return (m[x.id] || {}).mark === 'dismiss'; }).length };
  }

  async function load(applicantId) {
    var host = HOSTS[applicantId]; if (!host) return;
    var recs = await sb.from('recordings').select('id,status,consent_given,created_at,turns,seconds').eq('kind', 'interview').eq('subject_id', applicantId).order('created_at');
    var rv = await sb.from('interview_reviews').select('*').eq('applicant_id', applicantId).order('created_at', { ascending: false });
    if (rv.error && !/interview_reviews/.test(rv.error.message || '')) { host.innerHTML = '<div class="field-note" style="color:var(--red)">Could not load the AI review: ' + esc(rv.error.message) + '</div>'; return; }
    var rows = rv.data || [], R = recs.data || [];
    rows.forEach(function (r) { ROWS[r.id] = r; });
    var ready = R.filter(function (x) { return x.consent_given && x.status === 'done'; }).length, busy = R.filter(function (x) { return x.consent_given && (x.status === 'recorded' || x.status === 'transcribing'); }).length;
    var full = rows.filter(function (r) { return r.kind === 'full'; }), checks = rows.filter(function (r) { return r.kind === 'check'; });
    var h = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
      + (ready ? '<button class="primary" onclick="IR.run(\'' + esc(applicantId) + '\',\'full\',this)">' + (full.length ? 'Analyze again' : 'Analyze Interview') + '</button>' : '')
      + '<span class="field-note">' + (ready ? 'Only when you tap it. Reads ' + ready + ' recorded part' + (ready === 1 ? '' : 's') + ' with consent.' : busy ? 'The recording is still being written out. Analyze appears when the transcript is ready.' : 'Analyze appears once a recorded interview (with consent) has its transcript.') + '</span></div>';
    if (full.length) { var c = counts(full[0]); h += '<div class="field-note" style="margin-top:6px">' + c.open + ' to follow up · ' + c.dismissed + ' dismissed</div><div style="margin-top:8px">' + reviewHtml(full[0]) + '</div>'; }
    var older = full.slice(1).concat(checks);
    if (older.length) h += '<details style="margin-top:12px"><summary style="cursor:pointer;font-weight:700;color:var(--navy)">Earlier reviews and checks (' + older.length + ')</summary>' + older.map(function (r) { return '<div style="margin-top:10px;border-top:1px dashed var(--border);padding-top:8px">' + reviewHtml(r) + '</div>'; }).join('') + '</details>';
    if (R.some(function (x) { return x.turns && x.turns.length; })) h += '<details style="margin-top:12px"><summary style="cursor:pointer;font-weight:700;color:var(--navy)">Recording and transcript</summary>'
      + R.filter(function (x) { return x.turns && x.turns.length; }).map(function (x, i) {
        return '<div style="margin-top:8px"><b style="font-size:13px">Part ' + (i + 1) + '</b> <span class="field-note">' + esc(when(x.created_at)) + (x.seconds ? ' · ' + clock(x.seconds) : '') + '</span><div style="max-height:300px;overflow:auto">'
          + x.turns.map(function (t) { return '<div style="font-size:13.5px;padding:3px 0"><button class="ir-act" style="padding:0 6px" onclick="IR.play(\'' + esc(x.id) + '\',' + (+t.start || 0) + ',this)">' + clock(t.start) + '</button> <span class="field-note">' + esc(t.name || t.speaker || '') + '</span> ' + esc(t.text) + '</div>'; }).join('') + '</div></div>';
      }).join('') + '</details>';
    host.innerHTML = h;
  }

  async function save(rid, iid, patch) {
    var row = ROWS[rid]; if (!row) return;
    var cur = await sb.from('interview_reviews').select('marks').eq('id', rid).maybeSingle();
    if (cur.error) { alert('Could not save: ' + cur.error.message); return; }
    var marks = Object.assign({}, (cur.data && cur.data.marks) || {});
    marks[iid] = Object.assign({}, marks[iid] || {}, patch);
    var up = await sb.from('interview_reviews').update({ marks: marks }).eq('id', rid);
    if (up.error) { alert('Could not save: ' + up.error.message); return; }
    row.marks = marks;
    await load(row.applicant_id);
  }
  window.IR = {
    mount: function (el, r) { css(); HOSTS[r.id] = el; el.innerHTML = '<div class="field-note">Looking…</div>'; return load(r.id); },
    reload: function (applicantId) { return load(applicantId); },
    run: async function (applicantId, kind, btn) {
      if (btn) { btn.disabled = true; btn.textContent = 'Reading the interview…'; }
      try { var d = await call({ applicant_id: applicantId, kind: kind || 'full' }); await load(applicantId); return d; }
      catch (e) { alert('The AI review did not run: ' + (e && e.message || e) + '\n\nNothing was saved.'); if (btn) { btn.disabled = false; btn.textContent = 'Analyze Interview'; } return null; }
    },
    call: call, reviewHtml: function (row) { css(); ROWS[row.id] = row; return reviewHtml(row); },
    mark: function (rid, iid, m) { var cur = ((ROWS[rid] || {}).marks || {})[iid] || {}; return save(rid, iid, cur.mark === m ? { mark: null, by: who(), at: new Date().toISOString() } : { mark: m, by: who(), at: new Date().toISOString() }); },
    note: function (rid, iid, v) { return save(rid, iid, { note: String(v || '').trim(), by: who(), at: new Date().toISOString() }); },
    taskForm: function (rid, iid) {
      var row = ROWS[rid], it = (row.review.items || []).find(function (x) { return x.id === iid; }), el = document.getElementById('irt_' + rid + '_' + iid); if (!el || !it) return;
      var title = (it.clarify || it.text || '').slice(0, 120);
      el.innerHTML = '<input class="ir-ta" style="flex:1 1 260px" id="irtt_' + esc(rid) + '_' + esc(iid) + '" value="' + esc(title) + '"> <select id="irto_' + esc(rid) + '_' + esc(iid) + '" class="ir-ta" style="width:auto">'
        + (typeof opsStaffOptions === 'function' ? opsStaffOptions((typeof opsMeKey === 'function' && opsMeKey()) || '') : '<option value="">Unassigned</option>') + '</select>'
        + ' <button class="ir-act on" onclick="IR.taskMake(\'' + esc(rid) + '\',\'' + esc(iid) + '\')">Make it</button>';
    },
    taskMake: async function (rid, iid) {
      var row = ROWS[rid], a = (typeof AP_ROWS !== 'undefined' && AP_ROWS.find(function (x) { return String(x.id) === String(row.applicant_id); })) || {};
      var name = ((a.first_name || '') + ' ' + (a.last_name || '')).trim() || 'an applicant';
      var title = (document.getElementById('irtt_' + rid + '_' + iid) || {}).value || 'Interview follow-up';
      var owner = String((document.getElementById('irto_' + rid + '_' + iid) || {}).value || '').toLowerCase();
      var me = typeof ccActor === 'function' ? ccActor() : { name: who(), email: '' }, now = new Date().toISOString();
      var it = { id: 'irf_' + rid.slice(0, 8) + '_' + iid, kind: 'interview_followup', domain: 'hiring', title: title, about: name,
        detail: 'From the AI interview review. Open their Interview tab for the quote and the recording.', status: 'open', urgency: 'normal', created_at: now,
        due: new Date(Date.now() + 3 * 864e5).toISOString(), owner: owner, owner_name: owner && typeof opsOwnerName === 'function' ? opsOwnerName(owner) : '',
        created_by: me.name, created_by_email: me.email, opened_by: 'person', applicant_id: row.applicant_id,
        source: { type: 'interview_review', applicant_id: row.applicant_id, review_id: rid, item: iid } };
      try {
        DATA.ops_items = DATA.ops_items || []; DATA.ops_items.push(it);
        if (typeof opsLog === 'function') opsLog(it, 'Made from the AI interview review');
        await persist('ops_items', it);
        try { if (typeof opEvent === 'function') opEvent('item_created', { item: it, summary: name + ': ' + title }); } catch (e) { /* the record is optional */ }
        try { if (typeof myWorkRefresh === 'function') myWorkRefresh(); } catch (e) { /* not on screen */ }
        await save(rid, iid, { task_id: it.id });
      } catch (e) { alert('The task could not be made: ' + (e && e.message || e)); }
    },
    resolve: async function (taskId, rid) {
      var t = task(taskId); if (!t) return;
      var note = prompt('Mark this follow-up resolved?\n\n"' + t.title + '"\n\nA short note on what you found:', '');
      if (note === null) return;
      try { if (typeof opsCloseCommit === 'function') await opsCloseCommit(t, note.trim()); else { t.status = 'done'; t.close_note = note.trim(); await persist('ops_items', t); } }
      catch (e) { alert('Could not mark it resolved: ' + (e && e.message || e)); }
      var row = ROWS[rid]; if (row) await load(row.applicant_id);
    },
    play: async function (recId, at, btn) {
      try {
        var a = document.getElementById('irAudio');
        if (!a || a.dataset.rec !== recId) {
          var row = await sb.from('recordings').select('storage_path,audio_purged_at').eq('id', recId).maybeSingle();
          if (row.data && row.data.audio_purged_at) { alert('The audio for this part has been deleted (the transcript is kept).'); return; }
          var u = await sb.storage.from('recordings').createSignedUrl(row.data.storage_path, 3600); if (u.error) throw u.error;
          if (a) a.remove();
          a = document.createElement('audio'); a.id = 'irAudio'; a.controls = true; a.dataset.rec = recId; a.src = u.data.signedUrl;
          a.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);width:min(520px,92vw);z-index:9999;box-shadow:0 4px 18px rgba(0,0,0,.25);border-radius:30px';
          document.body.appendChild(a);
        }
        a.currentTime = Math.max(0, (+at || 0) - 2); await a.play();
      } catch (e) { alert('Could not play the recording: ' + (e && e.message || e)); }
    },
    counts: counts
  };
})();
