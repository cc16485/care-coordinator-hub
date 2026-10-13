/* Interviewer observations (2026-10-13, Samantha: "yes to all" on the Interview Notes and AI Review preview,
   https://claude.ai/artifact/Ki7QEvLaDWqTQ5UAxuHGXp, then "build"). One file for both interview screens (the Hub's
   Interview & outcome card and the phone's interview), so the two always ask the same things.
   Office only: it is saved on job_applicants.post_interview.observations, which only an office role can read (647).
   Quick picks with notes, several per category; the family reflection (Yes / Unsure / No with a required why, never a
   score and never an automatic no); overall observations. Nothing is required except the why, and only when an
   outcome is chosen. The interviewer's own words are never changed by the AI review.
     post_interview.observations = { cats: { <key>: { picks: [...], notes: [{ at, text }] } },
                                     family: { answer: 'yes'|'unsure'|'no', why }, overall, at, by } */
(function () {
  var CATS = [
    ['punctual', 'Punctuality and preparedness', ['Arrived on time', 'Arrived early', 'Late, called ahead', 'Late, no call', 'Prepared for the interview', 'Professional texts and calls beforehand']],
    ['presentation', 'Professional presentation', ['Dressed for hands-on client care', 'Clean and groomed for client care', 'Noticeable odor that could affect client care (smoke, strong fragrance)']],
    ['communication', 'Communication', ['Listened carefully', 'Answered directly', 'Interrupted at times', 'Talked over me repeatedly', 'Went off-topic repeatedly', 'Asked good questions']],
    ['boundaries', 'Professional boundaries', ['Appropriate boundaries', 'Overshared personal information', 'Shared confidential client information']],
    ['interpersonal', 'Interpersonal skills', ['Showed empathy (example)', 'Patient (example)', 'Respectful about clients', 'Warm']],
    ['reliability', 'Reliability and judgment', ['Clear transportation plan', 'Clear plan for emergencies', 'Accepts feedback', 'Follows care plans', 'Attendance concern mentioned']],
    ['care', 'Care situations', ['Talks about difficult clients with respect', 'Follows care-plan instructions', 'Handles family disagreements calmly', 'Knows what to do after a fall', 'Dementia approach (example)', 'Safe transfers (example)', 'Clear emergency steps (who to call)', 'Unsure what to do in an emergency']]
  ];
  var FAMILY_Q = 'Would I feel comfortable assigning this person to care for someone in my own family?';
  var FAM = [['yes', 'Yes'], ['unsure', 'Unsure'], ['no', 'No']];
  var GUARD = 'Write what you saw or heard, with an example. Not appearance preferences, not anything about age, health, disability, religion, pregnancy, accent or where someone is from, and not personality labels.';
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var tm = function (iso) { try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };

  var CSS = '.ob-card{border:1px solid #DCE4EE;border-radius:12px;padding:11px 12px;margin:0 0 10px;background:#fff}'
    + '.ob-k{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#2E8F8B}'
    + '.ob-q{font-weight:600;color:#0E3860;margin:3px 0;font-size:15px}'
    + '.ob-s{font-size:12.5px;color:#5B6878}'
    + '.ob-guard{background:#E3F3F2;border-radius:10px;padding:9px 11px;font-size:12.5px;color:#1B2733;margin-top:8px}'
    + '.ob-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}'
    + '.ob-chip{appearance:none;border:1.5px solid #DCE4EE;background:#fff;color:#1B2733;border-radius:999px;padding:7px 11px;font:inherit;font-size:13px;cursor:pointer;min-height:36px;text-align:left}'
    + '.ob-chip.on{background:#2E8F8B;border-color:#2E8F8B;color:#fff}'
    + '.ob-ta{width:100%;box-sizing:border-box;font:inherit;font-size:14px;border:1.5px solid #DCE4EE;border-radius:9px;padding:8px 10px;margin-top:6px;background:#fff;color:#1B2733}'
    + '.ob-note{border-top:1px dashed #DCE4EE;margin-top:8px;padding-top:6px}'
    + '.ob-add{appearance:none;border:0;background:none;color:#2E8F8B;font:inherit;font-weight:600;font-size:13px;padding:6px 0;cursor:pointer}'
    + '.ob-req{color:#B42318;font-size:12px;margin-top:4px}'
    + 'details.ob-cat>summary{cursor:pointer;list-style:none}details.ob-cat>summary::-webkit-details-marker{display:none}'
    + 'details.ob-cat>summary .ob-n{float:right;font-size:12px;color:#5B6878;font-weight:600;margin-right:8px}'
    + 'details.ob-cat>summary:after{content:"\\25B8";float:right;color:#5B6878}details.ob-cat[open]>summary:after{content:"\\25BE"}'
    + '.ob-sum-row{display:grid;grid-template-columns:150px minmax(0,1fr);gap:4px 10px;font-size:13.5px;padding:6px 0;border-top:1px solid #EEF1F5}'
    + '.ob-sum-row:first-child{border-top:0}.ob-sum-row b{color:#0E3860;font-weight:600}'
    + '.ob-pill{display:inline-block;font-size:12px;font-weight:600;border-radius:999px;padding:1px 8px;margin:2px 4px 2px 0;background:#E3F3F2;color:#1F6F6B}'
    + '@media (max-width:520px){.ob-sum-row{grid-template-columns:minmax(0,1fr)}}';
  function css() { if (document.getElementById('obCss')) return; var s = document.createElement('style'); s.id = 'obCss'; s.textContent = CSS; document.head.appendChild(s); }

  function norm(O) {
    O = O && typeof O === 'object' ? O : {};
    O.cats = O.cats && typeof O.cats === 'object' ? O.cats : {};
    O.family = O.family && typeof O.family === 'object' ? O.family : {};
    return O;
  }
  function count(c) { return c ? (c.picks || []).length + (c.notes || []).filter(function (n) { return String(n.text || '').trim(); }).length : 0; }

  /* The editing screen. opts.open: open every category (computer); on the phone they start folded, with a count. */
  function html(O, opts) {
    css(); O = norm(O); opts = opts || {};
    var h = '<div class="ob-card"><div class="ob-k">Interviewer observations</div>'
      + '<div class="ob-s" style="margin-top:2px">Office only. Tap what you saw; add a note when it helps. Any order, during the interview or right after.</div>'
      + '<div class="ob-guard">' + esc(GUARD) + '</div></div>';
    CATS.forEach(function (c) {
      var cur = O.cats[c[0]] || {}, picks = cur.picks || [], notes = cur.notes || [], n = count(cur);
      h += '<details class="ob-card ob-cat"' + (opts.open || n || notes.length ? ' open' : '') + '><summary><span class="ob-k">' + esc(c[1]) + '</span>'
        + (n ? '<span class="ob-n">' + n + '</span>' : '') + '</summary><div class="ob-chips">'
        + c[2].map(function (p) { return '<button type="button" class="ob-chip' + (picks.indexOf(p) > -1 ? ' on' : '') + '" data-obc="' + c[0] + '" data-obp="' + esc(p) + '">' + esc(p) + '</button>'; }).join('')
        + '</div>'
        + notes.map(function (x, i) { return '<div class="ob-note"><div class="ob-s">Observation' + (x.at ? ' · ' + esc(tm(x.at)) : '') + '</div>'
          + '<textarea class="ob-ta" rows="2" data-obn="' + c[0] + '" data-obi="' + i + '" placeholder="What you saw or heard, with an example">' + esc(x.text || '') + '</textarea></div>'; }).join('')
        + '<button type="button" class="ob-add" data-oba="' + c[0] + '">+ Add an observation</button></details>';
    });
    var f = O.family || {};
    h += '<div class="ob-card"><div class="ob-k">Reflection</div><div class="ob-q">' + esc(FAMILY_Q) + '</div><div class="ob-chips">'
      + FAM.map(function (x) { return '<button type="button" class="ob-chip' + (f.answer === x[0] ? ' on' : '') + '" data-obf="' + x[0] + '">' + x[1] + '</button>'; }).join('')
      + '</div><textarea class="ob-ta" rows="3" data-obw="1" placeholder="Why? What you saw or heard that makes you say that">' + esc(f.why || '') + '</textarea>'
      + '<div class="ob-req">Required: why (before an outcome). A reflection for you, not a score, and never an automatic no.</div></div>'
      + '<div class="ob-card"><div class="ob-k">Overall interviewer observations</div>'
      + '<textarea class="ob-ta" rows="4" data-obo="1" placeholder="Anything else you noticed, with examples">' + esc(O.overall || '') + '</textarea></div>';
    return h;
  }

  /* Wires one container. get() returns the observations object to change (it is changed in place); changed(redraw)
     is called after every change (redraw=true when the screen needs drawing again). */
  function bind(box, get, changed) {
    if (!box || box.__obBound) return; box.__obBound = true;
    box.addEventListener('click', function (ev) {
      var t = ev.target.closest && ev.target.closest('[data-obc],[data-oba],[data-obf]'); if (!t || !box.contains(t)) return;
      var O = norm(get());
      if (t.hasAttribute('data-obc')) {
        var k = t.getAttribute('data-obc'), p = t.getAttribute('data-obp'), c = O.cats[k] = O.cats[k] || {}; c.picks = c.picks || [];
        var i = c.picks.indexOf(p); if (i > -1) c.picks.splice(i, 1); else c.picks.push(p);
        t.classList.toggle('on', i < 0); changed(false);
      } else if (t.hasAttribute('data-oba')) {
        var k2 = t.getAttribute('data-oba'), c2 = O.cats[k2] = O.cats[k2] || {}; c2.notes = c2.notes || [];
        c2.notes.push({ at: new Date().toISOString(), text: '' }); changed(true);
        setTimeout(function () { var all = box.querySelectorAll('[data-obn="' + k2 + '"]'); if (all.length) all[all.length - 1].focus(); }, 0);
      } else {
        var a = t.getAttribute('data-obf'); O.family.answer = O.family.answer === a ? null : a;
        [].forEach.call(box.querySelectorAll('[data-obf]'), function (b) { b.classList.toggle('on', b.getAttribute('data-obf') === O.family.answer); });
        changed(false);
      }
    });
    box.addEventListener('input', function (ev) {
      var t = ev.target; if (!t || !t.getAttribute) return;
      var O = norm(get());
      if (t.hasAttribute('data-obn')) { var c = O.cats[t.getAttribute('data-obn')] || {}; var n = (c.notes || [])[+t.getAttribute('data-obi')]; if (n) n.text = t.value; }
      else if (t.hasAttribute('data-obw')) O.family.why = t.value;
      else if (t.hasAttribute('data-obo')) O.overall = t.value;
      else return;
      changed(false);
    });
  }

  /* Before Save: drops empty notes and trims; stamps who and when. */
  function clean(O, by) {
    O = norm(JSON.parse(JSON.stringify(O || {})));
    Object.keys(O.cats).forEach(function (k) {
      var c = O.cats[k]; c.picks = (c.picks || []).filter(Boolean);
      c.notes = (c.notes || []).map(function (n) { return { at: n.at, text: String(n.text || '').trim() }; }).filter(function (n) { return n.text; });
      if (!c.picks.length && !c.notes.length) delete O.cats[k];
    });
    if (O.family) O.family.why = String(O.family.why || '').trim();
    O.overall = String(O.overall || '').trim();
    O.at = new Date().toISOString(); if (by) O.by = by;
    return O;
  }
  /* What must be there before an outcome (Hire / Candidate pool / Not hiring): the family answer and its why. */
  function missing(O) {
    O = norm(O);
    if (!O.family.answer) return 'Answer the reflection first: "' + FAMILY_Q + '" (Yes, Unsure or No, with why).';
    if (!String(O.family.why || '').trim()) return 'Say why for the reflection ("' + FAMILY_Q + '"). It is the one thing required.';
    return '';
  }
  function has(O) { O = norm(O); return !!(Object.keys(O.cats).some(function (k) { return count(O.cats[k]); }) || O.family.answer || String(O.overall || '').trim()); }

  /* Read-only, for the profile's Interview tab. */
  function summaryHtml(O) {
    css(); O = norm(O); if (!has(O)) return '';
    var h = '';
    CATS.forEach(function (c) {
      var cur = O.cats[c[0]]; if (!count(cur)) return;
      h += '<div class="ob-sum-row"><b>' + esc(c[1]) + '</b><span>' + (cur.picks || []).map(function (p) { return '<span class="ob-pill">' + esc(p) + '</span>'; }).join('')
        + (cur.notes || []).filter(function (n) { return String(n.text || '').trim(); }).map(function (n) { return '<div style="margin-top:3px;white-space:pre-wrap">' + esc(n.text) + '</div>'; }).join('') + '</span></div>';
    });
    var f = O.family || {}, lab = { yes: 'Yes', unsure: 'Unsure', no: 'No' };
    if (f.answer) h += '<div class="ob-sum-row"><b>Family question</b><span><b>' + esc(lab[f.answer] || f.answer) + '.</b> ' + esc(f.why || '(no why written)') + '<div class="ob-s">' + esc(FAMILY_Q) + ' A reflection, not a score.</div></span></div>';
    if (String(O.overall || '').trim()) h += '<div class="ob-sum-row"><b>Overall</b><span style="white-space:pre-wrap">' + esc(O.overall) + '</span></div>';
    if (O.at) h += '<div class="ob-s" style="margin-top:6px">Saved' + (O.by ? ' by ' + esc(O.by) : '') + ', ' + esc(new Date(O.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + '</div>';
    return h;
  }

  window.OBS = { CATS: CATS, FAMILY_Q: FAMILY_Q, html: html, bind: bind, clean: clean, missing: missing, has: has, summaryHtml: summaryHtml };
})();
