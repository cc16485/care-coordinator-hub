/* The AI Interview Review in the Hub (2026-10-13, Samantha: "yes to all" on
   https://claude.ai/artifact/Ki7QEvLaDWqTQ5UAxuHGXp, then "build"). Office only (interview_reviews, 648).
   A second set of ears: it runs only when someone taps Analyze Interview (or Check before they leave on the phone),
   through the interview-review server function. What the applicant SAID (blue, with the time in the recording, tap to
   listen) is kept apart from what the AI SUGGESTS we clarify (gold). Each item: Confirm / Correct / Dismiss with a note
   (saved in the review's marks, never changing the AI's words or the interviewer's notes), and any item can become a
   follow-up task on someone's My Work. Confirming is not resolving: a task stays open until its owner marks it resolved.
   No score, verdict or hiring recommendation, by design.
   2026-11-21 (her Caregiver Interview Redesign, Part 3): a regular Caregiver interviewed on the six-section conversation
   screen gets the conversation review: a score from 1 to 5 with a plain fit word, a short opinion, five area scores, the
   quotes behind it and a Before you decide list (her words the same day: "I want a score ... then the care coordinator
   still decides"). Nothing to confirm point by point. It never changes a status, a level or an offer. With
   no recording it can read the interviewer's typed notes, and says so. Every other interview is shown exactly as before. */
(function () {
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var clock = function (s) { s = Math.max(0, Math.round(+s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  var when = function (iso) { try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };
  var SEC = [['strengths', 'Experience and strengths, from specific answers'], ['concerns', 'Concerns or inconsistencies to follow up'],
    ['communication', 'Communication, from the transcript'], ['safety', 'Confidentiality, safety or boundaries'],
    ['missed', 'Questions the interview did not cover'], ['reference_questions', 'Suggested reference-check questions']];
  var SEC_TALK = [['strengths', 'What they described, from specific answers'], ['concerns', 'Job-related points to follow up'],
    ['safety', 'Client safety, privacy or boundaries'], ['availability', 'Availability to follow up'], ['verify', 'To confirm before moving forward'],
    ['training', 'Training that would help'], ['missed', 'Topics the conversation did not cover'], ['reference_questions', 'Suggested reference-check questions']];
  var TONE = function (n) { return n >= 4 ? ['#2E8F8B', '#1F6F6B'] : n === 3 ? ['#D9972B', '#A8660E'] : ['#D4574A', '#B42318']; };
  /* The score card (2026-11-21, her drawing): the ring, the fit word, the opinion, the bars, how they communicated, two or three quotes and
     Before you decide. An area that was not covered shows as not covered, never as a number. */
  function scoreHtml(row, first) {
    var R = row.review || {}, n = R.score, tone = TONE(n || 0), items = R.items || [];
    var h = '<div class="ir-k">How the interview went \u00b7 written by AI ' + (R.notes_only ? 'from the interviewer notes' : 'from the recording') + '</div>'
      + '<div class="ir-h2">Is ' + esc(first || 'this applicant') + ' a good fit for Caring Companions?</div>';
    if (R.notes_only) h += '<div class="ir-warn"><b>No recording.</b> This read only the notes typed during the interview. Notes are not a full transcript, so treat it as a starting point.</div>';
    h += '<div class="ir-score"><div class="ir-ring" style="background:conic-gradient(' + (n ? tone[0] + ' 0 ' + (n * 20) + '%,#E4E9F0 ' + (n * 20) + '% 100%' : '#E4E9F0 0 100%') + ')"><div><b>' + (n || '\u2013') + '</b><span>' + (n ? 'out of 5' : 'no score') + '</span></div></div>'
      + '<div style="min-width:0"><div class="ir-fit" style="color:' + (n ? tone[1] : '#5B6878') + '">' + esc(R.fit || 'Not scored') + '</div>'
      + (R.opinion ? '<div class="ir-op">' + esc(R.opinion) + '</div>' : '') + '</div></div>';
    if ((R.areas || []).length) h += '<div class="ir-bars">' + R.areas.map(function (a) {
      var c = TONE(a.score || 0)[0];
      return '<span title="' + esc(a.why || '') + '">' + esc(a.label) + '</span><div class="ir-bar"><i style="width:' + ((a.score || 0) * 20) + '%;background:' + c + '"></i></div><b>' + (a.score || '<span class="field-note" style="font-weight:400">not covered</span>') + '</b>'
        + (a.why ? '<span></span><span class="ir-why">' + esc(a.why) + '</span><span></span>' : '');
    }).join('') + '</div>';
    /* How they communicated (2026-11-21, her ask): the plain lines under the Communication bar. Interrupting is counted
       from the recording by the server, the rest is the AI's read of what they did; a negative-employer line always
       carries their own words. */
    if ((R.habits || []).length) h += '<div class="ir-hab"><b>How they communicated</b>' + R.habits.map(function (x) {
      var w = x.level === 'good' ? ['\u2713', '#1F6F6B', '#E4F4F3'] : x.level === 'mixed' ? ['~', '#A8660E', '#FDF3E3'] : ['!', '#B42318', '#FDECEA'];
      return '<div class="ir-habrow"><i style="color:' + w[1] + ';background:' + w[2] + '">' + w[0] + '</i><div><span class="ir-habl">' + esc(x.label) + '</span> <span class="ir-why">' + esc(x.why || '') + '</span>'
        + (x.said || []).map(function (q) { return '<div class="ir-said" style="margin-top:4px">' + (q.source === 'notes' ? '<span class="ts" style="cursor:default">interviewer notes</span>'
          : '<button class="ts" title="Listen from here" onclick="IR.play(\'' + esc(q.rec) + '\',' + (+q.at || 0) + ',this)">' + clock(q.at) + '</button>') + ' <q>' + esc(q.quote) + '</q></div>'; }).join('')
        + (x.counted && x.level !== 'good' && (x.at || []).length && (R.parts || []).length ? '<div class="ir-said" style="margin-top:4px;border-left-color:#DCE4EE">Listen: ' + x.at.map(function (o) {
          var rec = ((R.parts || []).filter(function (p) { return p.part === o.part; })[0] || R.parts[0] || {}).rec;
          return '<button class="ts" title="Listen from here" onclick="IR.play(\'' + esc(rec) + '\',' + Math.max(0, (+o.at || 0) - 5) + ',this)">' + clock(o.at) + '</button>'; }).join('') + '</div>' : '')
        + '</div></div>'; }).join('') + '</div>';
    var quotes = []; items.forEach(function (it) { if (it.section === 'strengths' || it.section === 'concerns' || it.section === 'safety') (it.said || []).forEach(function (s) { if (quotes.length < 3 && s.source !== 'application') quotes.push(s); }); });
    if (quotes.length) h += '<div style="margin-top:12px">' + quotes.map(function (s) {
      return '<div class="ir-said" style="margin-top:7px">' + (s.source === 'notes' ? '<span class="ts" style="cursor:default">interviewer notes</span>'
        : '<button class="ts" title="Listen from here" onclick="IR.play(\'' + esc(s.rec) + '\',' + (+s.at || 0) + ',this)">' + clock(s.at) + '</button>') + ' <q>' + esc(s.quote) + '</q></div>'; }).join('') + '</div>';
    var todo = []; ['safety', 'concerns', 'availability', 'verify', 'training'].forEach(function (sec) { items.forEach(function (it) { if (it.section === sec && todo.length < 6) todo.push(it.clarify || it.text); }); });
    (R.score_held || []).forEach(function (x) { todo.unshift(x); });
    if (todo.length) h += '<div class="ir-todo"><b>Before you decide</b><ul>' + todo.filter(Boolean).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    h += '<div class="field-note" style="margin-top:10px">An opinion to help you, based only on what ' + esc(first || 'they') + ' said and what was entered. You decide. It never changes their status, level or offer.</div>';
    return h;
  }
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
    + '.ir-hab{margin-top:12px;border-top:1px solid #E4E9F0;padding-top:10px;display:grid;gap:7px}.ir-hab>b{font-size:13.5px;color:#0E3860}'
    + '.ir-habrow{display:grid;grid-template-columns:22px 1fr;gap:8px;align-items:start;font-size:13.5px}.ir-habrow>i{font-style:normal;font-weight:700;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:12.5px}.ir-habl{font-weight:600;color:#0E3860}'
    + '.ir-stat{display:flex;flex-wrap:wrap;gap:16px;font-size:13px;margin-top:6px}.ir-stat b{display:block;font-size:18px;color:#0E3860;font-variant-numeric:tabular-nums}'
    + '.ir-k{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#2E8F8B}.ir-h2{font-size:18px;font-weight:700;color:#0E3860;line-height:1.3;margin:3px 0 10px}'
    + '.ir-score{display:flex;gap:16px;align-items:center}.ir-ring{width:100px;height:100px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none}'
    + '.ir-ring>div{width:78px;height:78px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center}'
    + '.ir-ring b{font-size:30px;color:#0E3860;line-height:1}.ir-ring span{font-size:11px;color:#5B6878}'
    + '.ir-fit{font-size:20px;font-weight:700}.ir-op{font-size:14.5px;line-height:1.55;margin-top:4px;white-space:pre-wrap}'
    + '.ir-bars{display:grid;grid-template-columns:minmax(120px,170px) 1fr auto;gap:6px 10px;align-items:center;margin-top:14px;font-size:13px}'
    + '.ir-bar{height:8px;border-radius:99px;background:#E4E9F0;overflow:hidden}.ir-bar i{display:block;height:100%;border-radius:99px}'
    + '.ir-why{font-size:12px;color:#5B6878;margin:-3px 0 4px}'
    + '.ir-todo{background:#FDF3E3;border-radius:11px;padding:10px 13px;margin-top:14px;font-size:13.5px}.ir-todo b{color:#A8660E}.ir-todo ul{margin:4px 0 0;padding-left:18px}'
    + '.ir-warn{background:#FDF3E3;border-radius:9px;padding:8px 11px;font-size:13px;color:#5E3D07;margin-bottom:10px}'
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
    /* 2026-11-21 (Samantha: "I dont like the having to confirm each and every single thing for the ai judgement"): the
       conversation review has no Confirm / Correct / Dismiss. It is something to read; a point becomes work only when
       someone makes a follow-up task from it. */
    var plain = (row.review || {}).style === 'talk';
    var h = '<div class="ir-item' + (mk.mark === 'dismiss' ? ' dis' : '') + '" id="ir_' + rid + '_' + iid + '">';
    (it.said || []).forEach(function (s) {
      h += '<div class="ir-said">' + (s.source === 'application' ? '<span class="ts" style="cursor:default">application</span>'
        : s.source === 'notes' ? '<span class="ts" style="cursor:default">interviewer notes</span>'
        : '<button class="ts" title="Listen from here" onclick="IR.play(\'' + esc(s.rec) + '\',' + (+s.at || 0) + ',this)">' + (s.part > 1 || (row.review.parts || []).length > 1 ? 'Part ' + s.part + ' · ' : '') + clock(s.at) + '</button>')
        + (s.source === 'application' ? ' Their application says: ' : s.source === 'notes' ? ' The notes say: ' : ' They said: ') + '<q>' + esc(s.quote) + '</q></div>';
    });
    if (it.clarify) h += '<div class="ir-clar"><b>AI suggests we clarify:</b> ' + esc(it.clarify) + '</div>';
    if (it.text) h += '<div class="ir-clar"><b>AI ' + (it.section === 'strengths' ? 'notes' : 'suggests') + ':</b> ' + esc(it.text) + '</div>';
    if (!plain) h += '<div class="ir-acts">' + ['confirm', 'correct', 'dismiss'].map(function (m) {
      return '<button class="ir-act' + (mk.mark === m ? ' on' + (m === 'dismiss' ? ' x' : m === 'correct' ? ' e' : '') : '') + '" onclick="IR.mark(\'' + rid + '\',\'' + iid + '\',\'' + m + '\')">' + { confirm: 'Confirm', correct: 'Correct', dismiss: 'Dismiss' }[m] + '</button>';
    }).join('') + (mk.mark ? '<span class="field-note">' + esc(MARK[mk.mark]) + (mk.by ? ' by ' + esc(mk.by) : '') + (mk.at ? ', ' + esc(when(mk.at)) : '') + '</span>' : '') + '</div>';
    if (mk.mark && !plain) h += '<textarea class="ir-ta" rows="2" placeholder="' + (mk.mark === 'correct' ? 'What is actually right' : 'Your follow-up note (for example, what the reference said)') + '" onchange="IR.note(\'' + rid + '\',\'' + iid + '\',this.value)">' + esc(mk.note || '') + '</textarea>';
    var t = task(mk.task_id);
    if (t) h += '<div class="ir-task"><span><b>Follow-up task:</b> ' + esc(t.title) + ' · ' + esc(t.owner_name || t.owner || 'Unassigned') + '</span>'
      + (t.status === 'done' ? '<span style="color:#1F7A4D;font-weight:700">Resolved' + (t.close_note ? ': ' + esc(t.close_note) : '') + '</span>'
        : '<button class="ir-act" onclick="IR.resolve(\'' + esc(t.id) + '\',\'' + rid + '\')">Mark resolved</button>') + '</div>';
    else if (mk.task_id) h += '<div class="ir-task field-note">A follow-up task was made (it is not on this computer\'s list yet; refresh).</div>';
    else if (plain && it.section !== 'strengths' && it.section !== 'training') h += '<div id="irt_' + rid + '_' + iid + '" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><button class="ir-act" style="border:0;padding:2px 0;color:#2E8F8B;background:none" onclick="IR.taskForm(\'' + rid + '\',\'' + iid + '\')">+ Make a follow-up task</button></div>';
    else if (!plain && it.section !== 'strengths' && mk.mark !== 'dismiss') h += '<div class="ir-task" id="irt_' + rid + '_' + iid + '"><button class="ir-act" onclick="IR.taskForm(\'' + rid + '\',\'' + iid + '\')">+ Make a follow-up task</button></div>';
    return h + '</div>';
  }

  function reviewHtml(row) {
    var R = row.review || {}, st = R.stats, talk = R.style === 'talk';
    var h = '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between">'
      + '<span><span class="ir-tag">AI-generated · ' + (talk && R.kind !== 'check' ? 'your judgment decides' : 'second set of ears') + '</span> <span class="field-note">' + (R.kind === 'check' ? 'Check before they left' : talk ? 'Review of the interview' : 'Analyze Interview') + ', ' + esc(when(row.created_at)) + (row.created_by ? ' by ' + esc(row.created_by) : '') + '</span></span></div>';
    if (R.parts_still_transcribing) h += '<div class="field-note" style="color:#A8660E">' + R.parts_still_transcribing + ' part(s) were still being written out and are not in this review.</div>';
    if (talk && R.kind !== 'check' && !row.__detail) h += '<div style="margin-top:10px">' + scoreHtml(row, row.first_name) + '</div>';
    if (R.summary) h += '<div class="ir-sec" style="border-top:0;margin-top:6px;padding-top:0"><h4>Summary</h4><div style="font-size:14px">' + esc(R.summary) + '</div></div>';
    if (st) h += '<div class="ir-sec"><h4>Communication, counted from the recording</h4><div class="ir-stat">'
      + (st.applicant_share != null ? '<div><b>' + st.applicant_share + '%</b>of the talking was the applicant</div>' : '')
      + '<div><b>' + (st.overlap_count || 0) + '</b>times they started while the interviewer was still talking</div>'
      + (st.longest && st.longest.secs ? '<div><b>' + clock(st.longest.secs) + '</b>longest single answer</div>' : '') + '</div>'
      + '<div class="field-note">Recordings can mark people talking at once wrongly when someone pauses; listen before relying on it. Only how long, never why.</div></div>';
    (talk ? SEC_TALK : SEC).forEach(function (s) {
      var list = (R.items || []).filter(function (x) { return x.section === s[0]; }); if (!list.length) return;
      h += '<div class="ir-sec"><h4>' + esc(s[1]) + '</h4>' + list.map(function (it) { return itemHtml(row, it); }).join('') + '</div>';
    });
    if (R.dropped_unverified) h += '<div class="field-note" style="margin-top:8px">' + R.dropped_unverified + ' AI item(s) left out because their quote could not be found in the transcript.</div>';
    if (talk) h += '<div class="ir-sec field-note">Not in this review, by design: any score or rating, any decision to hire or not, and anything about personality, honesty, mental health or how long someone will stay, or drawn from how someone speaks, their accent, nerves or appearance. Having no experience is a training need, not a mark against anyone. The interviewer\'s notes are kept separately and never changed by the AI.</div>';
    else h += '<div class="ir-sec field-note">Not in this review, by design: any hiring recommendation, score or verdict, and anything about personality, honesty, mental health or suitability drawn from how someone speaks, their accent or tone. The interviewer\'s notes are kept separately and never changed by the AI.</div>';
    return h;
  }
  function counts(row) {
    var items = (row.review && row.review.items || []).filter(function (x) { return x.section !== 'strengths'; }), m = row.marks || {};
    var open = items.filter(function (x) { var mk = m[x.id] || {}; var t = task(mk.task_id); return mk.mark !== 'dismiss' && (!mk.mark || (t && t.status !== 'done')); }).length;
    return { open: open, dismissed: items.filter(function (x) { return (m[x.id] || {}).mark === 'dismiss'; }).length };
  }

  /* 1542 (2026-11-20, Samantha: the recording on the applicant AND the caregiver profile): the Watch the video line of a
     Google Meet interview. Only a Google Drive link is ever shown as a link. */
  function meetHtml(x) {
    var ok = x.video_url && !x.video_deleted_at && /^https:\/\/(drive|docs)\.google\.com\//.test(String(x.video_url));
    return ' <span class="field-note">from Google Meet</span> ' + (ok
      ? '<a class="ir-act" style="text-decoration:none" href="' + esc(x.video_url) + '" target="_blank" rel="noopener">🎥 Watch the video</a>'
        + (x.video_delete_after ? ' <span class="field-note">until ' + esc(new Date(x.video_delete_after).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) + '</span>' : '')
      : '<span class="field-note">' + (x.video_deleted_at ? 'video deleted after 30 days, transcript kept' : 'no video') + '</span>');
  }

  async function load(applicantId) {
    var host = HOSTS[applicantId]; if (!host) return;
    /* 1542: every column, so a Google Meet row's video link is read once those columns exist (and nothing breaks before) */
    var recs = await sb.from('recordings').select('*').eq('kind', 'interview').eq('subject_id', applicantId).order('created_at');
    var rv = await sb.from('interview_reviews').select('*').eq('applicant_id', applicantId).order('created_at', { ascending: false });
    if (rv.error && !/interview_reviews/.test(rv.error.message || '')) { host.innerHTML = '<div class="field-note" style="color:var(--red)">Could not load the AI review: ' + esc(rv.error.message) + '</div>'; return; }
    var ap = await sb.from('job_applicants').select('id,first_name,position,post_interview,records_hold_at,records_hold_by,records_hold_reason').eq('id', applicantId).maybeSingle();
    var rows = rv.data || [], R = recs.data || [], A = ap.data || {};
    rows.forEach(function (r) { ROWS[r.id] = r; });
    var ready = R.filter(function (x) { return x.consent_given && x.status === 'done'; }).length, busy = R.filter(function (x) { return x.consent_given && (x.status === 'recorded' || x.status === 'transcribing'); }).length;
    var full = rows.filter(function (r) { return r.kind === 'full'; }), checks = rows.filter(function (r) { return r.kind === 'check'; });
    /* 2026-11-21: a regular Caregiver interviewed on the conversation screen. With no recording at all, the review can
       read the interviewer's typed notes (the server checks the same thing and says so in the review). */
    var PI = (A.post_interview && typeof A.post_interview === 'object') ? A.post_interview : {}, TK = PI.talk && typeof PI.talk === 'object' ? PI.talk : null;
    var isTalk = !!TK && String(A.position || 'caregiver') === 'caregiver';
    var typed = isTalk ? Object.keys(TK.notes || {}).map(function (k) { return String(TK.notes[k] || '').trim(); }).concat([String(PI.notes || '').trim()]).filter(Boolean).join('\n') : '';
    var fromNotes = isTalk && !ready && !busy && typed.length >= 40;
    var goLabel = isTalk ? (full.length ? 'Review again' : 'Review this interview') : (full.length ? 'Analyze again' : 'Analyze Interview');
    var h = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
      + (ready || fromNotes ? '<button class="primary" onclick="IR.run(\'' + esc(applicantId) + '\',\'full\',this)">' + (fromNotes ? 'Review from the interviewer notes' : goLabel) + '</button>' : '')
      + '<span class="field-note">' + (fromNotes ? 'Only when you tap it. There is no recording, so it reads only the notes typed in the interview, and says so.' : ready ? 'Only when you tap it. Reads ' + ready + ' recorded part' + (ready === 1 ? '' : 's') + ' with consent.' : busy ? 'The recording is still being written out. Analyze appears when the transcript is ready.' : 'Analyze appears once a recorded interview (with consent) has its transcript.') + '</span></div>';
    if (full.length && (full[0].review || {}).style === 'talk') {
      var mks = full[0].marks || {}, openT = Object.keys(mks).filter(function (k) { var tk = task(mks[k].task_id); return tk && tk.status !== 'done'; }).length;
      h += (openT ? '<div class="field-note" style="margin-top:6px">' + openT + ' follow-up task' + (openT === 1 ? '' : 's') + ' open</div>' : '') + '<div style="margin-top:8px">' + reviewHtml(Object.assign({ first_name: A.first_name }, full[0])) + '</div>';
    } else if (full.length) { var c = counts(full[0]); h += '<div class="field-note" style="margin-top:6px">' + c.open + ' to follow up · ' + c.dismissed + ' dismissed</div><div style="margin-top:8px">' + reviewHtml(full[0]) + '</div>'; }
    var older = full.slice(1).concat(checks);
    if (older.length) h += '<details style="margin-top:12px"><summary style="cursor:pointer;font-weight:700;color:var(--navy)">Earlier reviews and checks (' + older.length + ')</summary>' + older.map(function (r) { return '<div style="margin-top:10px;border-top:1px dashed var(--border);padding-top:8px">' + reviewHtml(r) + '</div>'; }).join('') + '</details>';
    if (R.some(function (x) { return x.turns && x.turns.length; })) h += '<details style="margin-top:12px"><summary style="cursor:pointer;font-weight:700;color:var(--navy)">Recording and transcript</summary>'
      + R.filter(function (x) { return x.turns && x.turns.length; }).map(function (x, i) {
        /* 1542: a Google Meet video interview has no audio in the Hub: the times are plain, and the video opens in Google Drive */
        var meet = x.source === 'meet';
        return '<div style="margin-top:8px"><b style="font-size:13px">Part ' + (i + 1) + '</b> <span class="field-note">' + esc(when(x.created_at)) + (x.seconds ? ' · ' + clock(x.seconds) : '') + '</span>' + (meet ? meetHtml(x) : '') + '<div style="max-height:300px;overflow:auto">'
          + x.turns.map(function (t) { return '<div style="font-size:13.5px;padding:3px 0">' + (meet ? '<span class="field-note" style="font-weight:700">' + clock(t.start) + '</span>' : '<button class="ir-act" style="padding:0 6px" onclick="IR.play(\'' + esc(x.id) + '\',' + (+t.start || 0) + ',this)">' + clock(t.start) + '</button>') + ' <span class="field-note">' + esc(t.name || t.speaker || '') + '</span> ' + esc(t.text) + '</div>'; }).join('') + '</div></div>';
      }).join('') + '</details>';
    /* 2026-10-14 (Samantha: "2 years", 649): when it all goes, and the legal hold that stops it */
    var first = R.length ? R[0].created_at : (rows.length ? rows[rows.length - 1].created_at : null);
    if (A.records_hold_at) h += '<div style="margin-top:12px;background:#FEF3C7;border:1px solid #FCD34D;border-radius:9px;padding:8px 11px;font-size:13px;color:#92400E"><b>Legal hold</b> since '
      + esc(when(A.records_hold_at)) + (A.records_hold_by ? ' by ' + esc(A.records_hold_by) : '') + (A.records_hold_reason ? ': ' + esc(A.records_hold_reason) : '')
      + '. Nothing of theirs is deleted while it is on. <button class="ir-act" onclick="IR.hold(\'' + esc(applicantId) + '\',false)">Lift the hold</button></div>';
    else if (first) h += '<div class="field-note" style="margin-top:12px">Kept 2 years: the transcript, observations and AI reviews are deleted from about '
      + esc(new Date(Date.parse(first) + 730 * 864e5).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })) + ' (audio after 1 year). '
      + '<button class="ir-act" onclick="IR.hold(\'' + esc(applicantId) + '\',true)">Legal hold</button></div>';
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
      if (btn) { btn.disabled = true; btn.dataset.was = btn.textContent; btn.textContent = 'Reading the interview…'; }
      try { var d = await call({ applicant_id: applicantId, kind: kind || 'full' }); await load(applicantId); return d; }
      catch (e) { alert('The AI review did not run: ' + (e && e.message || e) + '\n\nNothing was saved.'); if (btn) { btn.disabled = false; btn.textContent = btn.dataset.was || 'Analyze Interview'; } return null; }
    },
    call: call, reviewHtml: function (row) { css(); ROWS[row.id] = row; return reviewHtml(row); },
    scoreHtml: function (row, first) { css(); ROWS[row.id] = row; return scoreHtml(row, first); },
    /* 2026-11-21: the review on the interview page's "How it went" step. One button when there is none yet; then the
       score card, with the full detail folded underneath. Runs only on a tap. */
    card: async function (el, ap) {
      css(); if (!el || !ap) return;
      var id = ap.id, first = ap.first_name || '';
      var recs = await sb.from('recordings').select('*').eq('kind', 'interview').eq('subject_id', id).order('created_at');
      var rv = await sb.from('interview_reviews').select('*').eq('applicant_id', id).order('created_at', { ascending: false });
      if (!document.body.contains(el)) return;
      var R = recs.data || [], rows = (rv.data || []).filter(function (r) { return r.kind === 'full' && (r.review || {}).style === 'talk'; });
      rows.forEach(function (r) { ROWS[r.id] = r; });
      var ready = R.filter(function (x) { return x.consent_given && x.status === 'done'; }).length, busy = R.filter(function (x) { return x.consent_given && (x.status === 'recorded' || x.status === 'transcribing'); }).length;
      var PI = (ap.post_interview && typeof ap.post_interview === 'object') ? ap.post_interview : {}, TK = PI.talk || {};
      var typed = Object.keys(TK.notes || {}).map(function (k) { return String(TK.notes[k] || '').trim(); }).concat([String(PI.notes || '').trim()]).filter(Boolean).join('\n');
      var fromNotes = !ready && !busy && typed.length >= 40;
      var go = function (label) { return '<button class="primary" id="irCardGo">' + label + '</button>'; };
      var h;
      if (rows.length) h = scoreHtml(rows[0], first)
        + '<details style="margin-top:12px"><summary style="cursor:pointer;font-weight:600;color:#2E8F8B;font-size:13.5px">See the full review</summary><div style="margin-top:8px">' + reviewHtml(Object.assign({ first_name: first }, rows[0], { __detail: true })) + '</div></details>'
        + (ready || fromNotes ? '<div style="margin-top:10px">' + go('Review again') + '</div>' : '');
      else h = '<div class="ir-k">How the interview went</div><div class="ir-h2">Is ' + esc(first || 'this applicant') + ' a good fit for Caring Companions?</div>'
        + (ready ? go('Get the review') + '<div class="field-note" style="margin-top:8px">Reads the recording and gives a score out of 5 with the reasons. Only when you tap it. You decide.</div>'
          : fromNotes ? go('Get the review from your notes') + '<div class="field-note" style="margin-top:8px">There is no recording, so it reads only the notes typed in the interview, and says so.</div>'
          : busy ? '<div class="field-note">The recording is still being written out. The review button appears when it is ready. You can save and come back.</div>'
          : '<div class="field-note">There is no recording with consent, and no notes typed yet. Type a few lines under + More, save, and the review can read those.</div>');
      el.innerHTML = h;
      var b = el.querySelector('#irCardGo');
      if (b) b.onclick = async function () { b.disabled = true; b.textContent = 'Reading the interview\u2026';
        try { await call({ applicant_id: id, kind: 'full' }); await IR.card(el, ap); if (HOSTS[id]) load(id); }
        catch (e) { alert('The review did not run: ' + (e && e.message || e) + '\n\nNothing was saved.'); b.disabled = false; b.textContent = 'Try again'; } };
    },
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
      var note = (await ccPrompt('Mark this follow-up resolved?\n\n"' + t.title + '"\n\nA short note on what you found:', ''));
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
    counts: counts,
    hold: async function (applicantId, on) {
      var patch;
      if (on) {
        var why = (await ccPrompt('Put a legal hold on this person\'s interview records?\n\nWhile it is on, nothing of theirs (transcripts, observations, AI reviews) is deleted. Use it when a complaint, charge or lawsuit is possible or filed. Also hold anyone else who applied for the same job.\n\nWhy (kept with the hold):', ''));
        if (why === null) return;
        patch = { records_hold_at: new Date().toISOString(), records_hold_by: who() || null, records_hold_reason: String(why).trim() || null };
      } else {
        if (!(await ccConfirm('Lift the legal hold? The 2-year clean-up will apply to their interview records again.'))) return;
        patch = { records_hold_at: null, records_hold_by: null, records_hold_reason: null };
      }
      var up = await sb.from('job_applicants').update(patch).eq('id', applicantId);
      if (up.error) { alert('Could not change the hold: ' + up.error.message); return; }
      await load(applicantId);
    }
  };
})();
