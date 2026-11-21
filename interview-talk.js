/* The caregiver interview as a conversation (2026-11-21, Samantha's "Caregiver Interview Redesign", plan approved
   "Approve with your picks"). One file for both interview screens (the Hub's Interview & outcome card and the phone's
   interview), so the two always show the same thing.
     · REGULAR CAREGIVER ONLY. PRN CNA, PRN Caregiver, CNA and every other position keep the question list they have.
     · Only while ops_settings.interview_talk_live is on (owners turn it on in Settings). Off, both screens are exactly
       as before. An owner can try it alone first ("Try it, only me"), kept for this browser tab only.
     · Six sections, one at a time: short lines to say, an information button for the interviewer, Back and Next.
       No scores, no ratings, no checklists while talking. Notes are optional.
     · Exact availability is the one thing that must be typed: day by day, real start and end times, more than one
       window a day when needed. "Anytime" cannot be entered. If they cannot confirm today it closes as Needs follow-up;
       nothing is ever filled in for them.
     · The words come from the interview_sections table (Staffing step 1569), never from this file.
   Saved on job_applicants.post_interview.talk (office only, like the rest of the interview). Nothing here changes an
   application answer, a care level, a status, or sends anything.
     post_interview.talk = { at, mode:'person'|'video', consent:'yes'|'no',
       work:{ working, employer, hours, plan:'keep'|'leave', sched:'fixed'|'rotating', published, start },
       avail:{ days:{ mon:{ off, w:[{ f:'07:00', t:'15:00' }] }, ... }, steady:'yes'|'depends', flex, confirmed, status:'followup', why },
       hours:{ want, min, type:'full'|'part'|'either' },
       care:{ settings:[], levels:[], where, learn }, dementia:'yes'|'no', dementia_learn:'yes'|'no',
       fit:{ cc_before:'yes'|'no', limits, refs }, notes:{ <section key>: text }, saved_at, saved_by } */
(function (W) {
  var KEY = 'interview_talk_live', TRY = 'cc_talk_try';
  var DAYS = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']];
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var D = function () { try { return (typeof DATA !== 'undefined' && DATA) || W.DATA || {}; } catch (e) { return W.DATA || {}; } };
  var owner = function () { try { return typeof W.ccIsOwner === 'function' && !!W.ccIsOwner(); } catch (e) { return false; } };
  var live = function () { return (D().ops_settings || {})[KEY] === true; };
  var trying = function () { try { return owner() && sessionStorage.getItem(TRY) === '1'; } catch (e) { return false; } };
  var on = function () { return live() || trying(); };
  /* her scope rule: the regular Caregiver position only */
  var applies = function (position) { var p = String(position == null ? '' : position).trim().toLowerCase(); return p === '' || p === 'caregiver'; };

  var cache = null;
  async function load(force) {
    if (cache && !force) return cache;
    try {
      var db = (typeof sb !== 'undefined' && sb) || W.sb;   /* the Hub's own connection (a page-level name, not on window) */
      var q = await db.from('interview_sections').select('key,sort,title,minutes,script,info,active,position').eq('position', 'caregiver').eq('active', true).order('sort');
      if (q.error) throw q.error;
      var rows = (q.data || []).filter(function (s) { return s && s.key && Array.isArray(s.script); });
      if (rows.length) cache = rows;   /* an empty answer is not remembered, so installing the sections needs no reload */
      return rows;
    } catch (e) { return []; }   /* table not installed yet, or no access: both screens fall back to the question list */
  }

  /* ---------- the record ---------- */
  function norm(T) {
    T = T && typeof T === 'object' ? T : {};
    T.at = Number.isInteger(T.at) && T.at >= 0 ? T.at : 0;
    T.mode = T.mode === 'video' ? 'video' : 'person';
    ['work', 'avail', 'hours', 'care', 'fit', 'notes'].forEach(function (k) { T[k] = T[k] && typeof T[k] === 'object' ? T[k] : {}; });
    T.avail.days = T.avail.days && typeof T.avail.days === 'object' ? T.avail.days : {};
    DAYS.forEach(function (d) { var x = T.avail.days[d[0]]; x = T.avail.days[d[0]] = x && typeof x === 'object' ? x : {}; x.w = Array.isArray(x.w) && x.w.length ? x.w : [{ f: '', t: '' }]; });
    T.care.settings = Array.isArray(T.care.settings) ? T.care.settings : [];
    T.care.levels = Array.isArray(T.care.levels) ? T.care.levels : [];
    return T;
  }
  var okTime = function (v) { return /^([01]\d|2[0-3]):(00|30)$/.test(String(v || '')); };
  var okWin = function (w) { return w && okTime(w.f) && okTime(w.t) && w.f !== w.t; };
  var dayDone = function (x) { return !!x && (x.off === true || (x.w || []).some(okWin)); };
  function label(v) { if (!okTime(v)) return ''; var h = +v.slice(0, 2), m = v.slice(3), ap = h < 12 ? 'AM' : 'PM', h12 = h % 12 || 12; return h12 + (m === '00' ? '' : ':' + m) + ' ' + ap; }
  function dayText(x) {
    if (!x) return ''; if (x.off === true) return 'not available';
    return (x.w || []).filter(okWin).map(function (w) { return label(w.f) + ' to ' + label(w.t) + (w.t < w.f ? ' the next morning' : ''); }).join(' and ');
  }
  /* what the interviewer reads back to confirm */
  function readback(T) {
    T = norm(T);
    return DAYS.map(function (d) { var x = T.avail.days[d[0]]; return dayDone(x) ? d[1] + ' ' + dayText(x) : null; }).filter(Boolean).join('. ');
  }
  /* What is still needed, and what the office follows up. Never a guess: only what was or was not entered. */
  function missing(T) {
    T = norm(T); var m = [], f = [], wk = T.work, av = T.avail, hr = T.hours, has = function (v) { return String(v == null ? '' : v).trim() !== ''; };
    if (!T.consent) m.push('Recording: mark whether they said yes or no');
    if (!wk.working) m.push('Whether they are working right now');
    if (wk.working === 'yes') {
      if (!has(wk.employer)) m.push('Where they work now');
      if (!has(wk.hours)) m.push('About how many hours a week at their other job');
      if (!wk.plan) m.push('Keeping that job or leaving it');
      if (wk.plan === 'keep' && !wk.sched) m.push('Other job: a set schedule or one that changes');
      if (wk.plan === 'keep' && wk.sched === 'rotating' && !has(wk.published)) m.push('Other job changes week to week: when the schedule comes out');
    }
    if (!has(wk.start)) m.push('Earliest date they could start');
    if (av.status === 'followup') f.push('Availability needs follow-up' + (has(av.why) ? ': ' + String(av.why).trim() : ''));
    else {
      DAYS.forEach(function (d) { if (!dayDone(av.days[d[0]])) m.push('Exact availability missing for ' + d[1]); });
      if (DAYS.every(function (d) { return dayDone(av.days[d[0]]); }) && av.confirmed !== true) m.push('Read the schedule back and confirm it');
    }
    if (!av.steady) m.push('Whether those hours are the same every week');
    if (av.steady === 'depends' && wk.working !== 'yes') f.push('Availability changes week to week: ask what it depends on');
    if (!has(hr.want)) m.push('Hours a week they are hoping for');
    if (!has(hr.min)) m.push('Minimum weekly hours they need');
    if (!hr.type) m.push('Full-time or part-time');
    if (!T.care.levels.length) m.push('Which levels of care they have done (their own words)');
    if (T.care.levels.some(function (l) { return l === '2' || l === '3'; }) && !has(T.care.where)) m.push('Where they gained their Level 2 or 3 experience');
    if (!T.dementia) m.push('Dementia or Alzheimer\'s experience: yes or no');
    if (!T.fit.cc_before) m.push('Whether they worked for Caring Companions before');
    if (T.fit.cc_before === 'yes') f.push('Worked for Caring Companions before: review their old employment record');
    if (T.care.levels.some(function (l) { return l === '2' || l === '3'; })) f.push('Level ' + T.care.levels.filter(function (l) { return l !== '1' && l !== 'none'; }).join(' and ') + ' experience is what they told us. It is verified through references before any level changes.');
    if (has(T.fit.refs)) f.push('Ask their references about: ' + String(T.fit.refs).trim());
    return { missing: m, follow: f };
  }
  /* Before Save: trims, drops empty windows, stamps who and when. Never invents a time. */
  function clean(T, by) {
    T = norm(JSON.parse(JSON.stringify(T || {})));
    DAYS.forEach(function (d) { var x = T.avail.days[d[0]]; x.w = (x.w || []).filter(okWin).map(function (w) { return { f: w.f, t: w.t }; }); if (x.off === true) x.w = []; else delete x.off; });
    var trim = function (o) { Object.keys(o).forEach(function (k) { if (typeof o[k] === 'string') { o[k] = o[k].trim(); if (!o[k]) delete o[k]; } else if (o[k] == null) delete o[k]; }); };
    [T.work, T.hours, T.care, T.fit, T.notes, T.avail].forEach(trim);
    var done = DAYS.every(function (d) { return dayDone(T.avail.days[d[0]]); });
    if (T.avail.status !== 'followup') { delete T.avail.status; delete T.avail.why; }
    if (!done) T.avail.confirmed = false;
    T.avail.complete = done && T.avail.confirmed === true && T.avail.status !== 'followup';
    T.saved_at = new Date().toISOString(); if (by) T.saved_by = by;
    return T;
  }

  /* ---------- the screen ---------- */
  var CSS = '.tk{font-size:15px;color:#1B2733}'
    + '.tk-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px}'
    + '.tk-dots{display:flex;gap:6px;flex:1;min-width:160px}'
    + '.tk-dot{appearance:none;border:0;height:8px;flex:1;border-radius:999px;background:#DCE4EE;cursor:pointer;padding:0;min-width:18px}'
    + '.tk-dot.done{background:#9CCFCC}.tk-dot.now{background:#2E8F8B}'
    + '.tk-mode{display:inline-flex;border:1.5px solid #DCE4EE;border-radius:999px;overflow:hidden}'
    + '.tk-mode button{appearance:none;border:0;background:#fff;font:inherit;font-size:13px;padding:6px 12px;cursor:pointer;color:#5B6878}'
    + '.tk-mode button.on{background:#0E3860;color:#fff}'
    + '.tk-card{border:1px solid #DCE4EE;border-radius:14px;background:#fff;padding:14px 16px;margin:0 0 10px}'
    + '.tk-k{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#2E8F8B}'
    + '.tk-h{display:flex;align-items:flex-start;gap:10px}'
    + '.tk-title{font-size:20px;font-weight:700;color:#0E3860;line-height:1.25;flex:1;margin:2px 0 0}'
    + '.tk-min{font-size:12.5px;color:#5B6878;margin-top:2px}'
    + '.tk-i{appearance:none;border:1.5px solid #2E8F8B;background:#fff;color:#2E8F8B;border-radius:50%;width:32px;height:32px;font:inherit;font-weight:700;font-style:italic;font-family:Georgia,serif;font-size:16px;cursor:pointer;flex:none}'
    + '.tk-i.on{background:#2E8F8B;color:#fff}'
    + '.tk-info{background:#E3F3F2;border-radius:10px;padding:10px 12px;margin:10px 0 0;font-size:13.5px;line-height:1.5}'
    + '.tk-info b{color:#0E3860}.tk-info ul{margin:2px 0 6px;padding-left:18px}.tk-info ul:last-child{margin-bottom:0}'
    + '.tk-say{font-size:16.5px;font-weight:400;line-height:1.5;margin:12px 0 0;color:#1B2733}'
    + '.tk-ask{font-size:17.5px;line-height:1.45;margin:14px 0 0;color:#0E3860;font-weight:600}'
    + '.tk-note{font-size:13px;color:#5B6878;margin:6px 0 0}'
    + '.tk-head{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9C6410;margin:16px 0 0}'
    + '.tk-if{border-left:3px solid #DCE4EE;padding:0 0 0 12px;margin:12px 0 0}'
    + '.tk-if>.tk-when{font-size:12px;font-weight:700;color:#5B6878;text-transform:uppercase;letter-spacing:.05em}'
    + '.tk-if .tk-ask{font-size:16px;margin-top:6px}.tk-if .tk-say{font-size:15.5px;margin-top:6px}'
    + '.tk-level{background:#F7F5F0;border-radius:10px;padding:10px 12px;margin:10px 0 0}'
    + '.tk-level b{display:block;color:#0E3860;font-size:14px;margin-bottom:2px}.tk-level span{font-size:15.5px;font-weight:400;line-height:1.5}'
    + '.tk-cap{border:1.5px dashed #BFD3E6;border-radius:12px;padding:10px 12px;margin:14px 0 0;background:#FBFCFE}'
    + '.tk-cap>.tk-k{color:#0E3860}'
    + '.tk-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0 0}'
    + '.tk-lab{font-size:13.5px;color:#1B2733;flex:1 1 190px}'
    + '.tk-chip{appearance:none;border:1.5px solid #DCE4EE;background:#fff;color:#1B2733;border-radius:999px;padding:7px 12px;font:inherit;font-size:13.5px;cursor:pointer;min-height:36px}'
    + '.tk-chip.on{background:#0E3860;border-color:#0E3860;color:#fff}'
    + '.tk-in{font:inherit;font-size:14.5px;border:1.5px solid #DCE4EE;border-radius:9px;padding:8px 10px;background:#fff;color:#1B2733;min-width:0;flex:1 1 180px;box-sizing:border-box}'
    + 'textarea.tk-in{width:100%;flex:none}'
    + '.tk-num{flex:0 0 90px}'
    + '.tk-day{border-top:1px solid #EEF1F5;padding:9px 0}.tk-day:first-of-type{border-top:0}'
    + '.tk-dname{font-weight:700;color:#0E3860;font-size:14.5px;flex:0 0 96px}'
    + '.tk-day.ok .tk-dname:after{content:" \\2713";color:#2E8F8B}'
    + '.tk .tk-sel{font:inherit;font-size:14.5px;font-weight:400;border:1.5px solid #DCE4EE;border-radius:9px;padding:7px 4px;background:#fff;color:#1B2733;width:auto;flex:1 1 0;min-width:0;max-width:150px;margin:0;display:inline-block}'
    + '.tk-win{display:flex;gap:6px;align-items:center;flex-wrap:nowrap}'
    + '.tk-x{appearance:none;border:0;background:none;color:#5B6878;font:inherit;font-size:18px;line-height:1;padding:6px 8px;cursor:pointer;flex:none}'
    + '.tk-link{appearance:none;border:0;background:none;color:#2E8F8B;font:inherit;font-weight:600;font-size:13px;padding:6px 2px;cursor:pointer}'
    + '.tk-over{font-size:12px;color:#9C6410}'
    + '.tk-read{background:#F7F5F0;border-radius:10px;padding:10px 12px;margin:10px 0 0;font-size:14.5px;line-height:1.5}'
    + '.tk-warn{background:#FBF1D9;border-radius:10px;padding:9px 12px;margin:10px 0 0;font-size:13.5px;color:#5E3D07}'
    + '.tk-nav{display:flex;gap:10px;margin:4px 0 12px}'
    + '.tk-b{appearance:none;border:1.5px solid #DCE4EE;background:#fff;color:#0E3860;border-radius:11px;padding:12px 16px;font:inherit;font-weight:600;font-size:15px;cursor:pointer}'
    + '.tk-b.p{background:#0E3860;border-color:#0E3860;color:#fff;flex:1}'
    + '.tk-list{margin:8px 0 0;padding-left:20px;font-size:14.5px;line-height:1.55}'
    + '.tk-try{background:#FBF1D9;border-radius:10px;padding:7px 12px;margin:0 0 10px;font-size:13px;color:#5E3D07}'
    + '@media (max-width:520px){.tk-title{font-size:18px}.tk-dname{flex-basis:100%}}';
  function css() { if (document.getElementById('tkCss')) return; var s = document.createElement('style'); s.id = 'tkCss'; s.textContent = CSS; document.head.appendChild(s); }
  var infoOpen = {};   /* which information panels are open; only on this screen, never saved */

  function chip(group, val, text, cur, multi) {
    var is = multi ? (cur || []).indexOf(val) > -1 : cur === val;
    return '<button type="button" class="tk-chip' + (is ? ' on' : '') + '" data-tkc="' + group + '" data-tkv="' + esc(val) + '"' + (multi ? ' data-tkm="1"' : '') + '>' + esc(text) + '</button>';
  }
  var inp = function (path, val, ph, cls, type) { return '<input class="tk-in' + (cls ? ' ' + cls : '') + '" type="' + (type || 'text') + '" data-tkf="' + path + '" value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '">'; };
  var row = function (lab, body) { return '<div class="tk-row"><span class="tk-lab">' + esc(lab) + '</span>' + body + '</div>'; };
  function timeSel(day, i, which, val) {
    var h = '<select class="tk-sel" data-tkt="' + day + '" data-tki="' + i + '" data-tkw="' + which + '" aria-label="' + (which === 'f' ? 'Earliest start' : 'Latest end') + '"><option value="">' + (which === 'f' ? 'Earliest start' : 'Latest end') + '</option>';
    for (var m = 0; m < 48; m++) { var v = ('0' + Math.floor(m / 2)).slice(-2) + ':' + (m % 2 ? '30' : '00'); h += '<option value="' + v + '"' + (v === val ? ' selected' : '') + '>' + label(v) + '</option>'; }
    return h + '</select>';
  }

  var FORMS = {
    consent: function (T) {
      return '<div class="tk-cap"><div class="tk-k">Recording</div>' + row('Did they say yes to recording?', chip('consent', 'yes', 'Yes', T.consent) + chip('consent', 'no', 'No', T.consent))
        + (T.consent === 'no' ? '<div class="tk-note">That is fine. Carry on without recording; your notes are what we keep.</div>' : '') + '</div>';
    },
    employment: function (T) {
      var w = T.work, h = '<div class="tk-cap"><div class="tk-k">Their work right now</div>' + row('Working right now?', chip('work.working', 'yes', 'Yes', w.working) + chip('work.working', 'no', 'No', w.working));
      if (w.working === 'yes') {
        h += row('Where', inp('work.employer', w.employer, 'Employer')) + row('About how many hours a week there', inp('work.hours', w.hours, 'Hours', 'tk-num'))
          + row('That job', chip('work.plan', 'keep', 'Keeping it', w.plan) + chip('work.plan', 'leave', 'Leaving it', w.plan));
        if (w.plan === 'keep') {
          h += row('Their schedule there', chip('work.sched', 'fixed', 'Set schedule', w.sched) + chip('work.sched', 'rotating', 'Changes week to week', w.sched));
          if (w.sched === 'rotating') h += row('When do they get that schedule?', inp('work.published', w.published, 'For example: Thursdays for the next week'));
        }
      }
      return h + row('Earliest date they could start with us', inp('work.start', w.start, '', '', 'date')) + '</div>';
    },
    availability: function (T) {
      var av = T.avail, h = '<div class="tk-cap"><div class="tk-k">Exact availability, day by day</div>'
        + '<div class="tk-note">Real start and end times for every day. "Anytime" is not an answer yet.</div>';
      if (av.status === 'followup') {
        return h + '<div class="tk-warn"><b>Needs follow-up.</b> They could not confirm their schedule today. Nothing was filled in for them.</div>'
          + row('What are we waiting on?', inp('avail.why', av.why, 'For example: their other job posts the schedule Friday'))
          + '<button type="button" class="tk-link" data-tka="unfollow">Enter their availability now</button></div>';
      }
      DAYS.forEach(function (d, di) {
        var x = av.days[d[0]], done = dayDone(x);
        h += '<div class="tk-day' + (done ? ' ok' : '') + '"><div class="tk-row" style="margin-top:0"><span class="tk-dname">' + d[1] + '</span>';
        if (x.off === true) h += '<span class="tk-lab">Not available</span><button type="button" class="tk-link" data-tka="on" data-tkd="' + d[0] + '">Add times</button>';
        else {
          h += '<span style="display:flex;flex-direction:column;gap:6px;flex:1 1 240px">' + x.w.map(function (w, i) {
            return '<span class="tk-win">' + timeSel(d[0], i, 'f', w.f) + '<span>to</span>' + timeSel(d[0], i, 't', w.t)
              + (x.w.length > 1 ? '<button type="button" class="tk-x" data-tka="del" data-tkd="' + d[0] + '" data-tki="' + i + '" aria-label="Remove this time" title="Remove this time">&times;</button>' : '') + '</span>'
              + (okWin(w) && w.t < w.f ? '<span class="tk-over">ends the next morning</span>' : '');
          }).join('') + '</span>'
            + '<span style="display:flex;gap:4px;flex-wrap:wrap">'
            + '<button type="button" class="tk-link" data-tka="add" data-tkd="' + d[0] + '">+ Another time</button>'
            + '<button type="button" class="tk-link" data-tka="off" data-tkd="' + d[0] + '">Not available</button>'
            + (di > 0 && dayDone(av.days[DAYS[di - 1][0]]) ? '<button type="button" class="tk-link" data-tka="same" data-tkd="' + d[0] + '">Same as ' + DAYS[di - 1][1] + '</button>' : '')
            + '</span>';
        }
        h += '</div></div>';
      });
      var all = DAYS.every(function (d) { return dayDone(av.days[d[0]]); });
      if (all) {
        h += '<div class="tk-read"><div class="tk-k">Read it back</div>"So I have you down for: ' + esc(readback(T)) + '. Is that right?"</div>'
          + row('Did they confirm it?', chip('avail.confirmed', 'true', 'Yes, confirmed', av.confirmed === true ? 'true' : ''));
      }
      h += row('Are those hours the same every week?', chip('avail.steady', 'yes', 'Yes, every week', av.steady) + chip('avail.steady', 'depends', 'It depends', av.steady))
        + row('Extra flexibility, apart from the above', inp('avail.flex', av.flex, 'For example: can pick up Saturdays with a week of notice'))
        + '<button type="button" class="tk-link" data-tka="follow">They cannot confirm their schedule today</button></div>';
      return h;
    },
    hours: function (T) {
      var hr = T.hours;
      return '<div class="tk-cap"><div class="tk-k">The hours they want</div>' + row('Hours a week they are hoping for', inp('hours.want', hr.want, 'Hours', 'tk-num'))
        + row('The minimum they need', inp('hours.min', hr.min, 'Hours', 'tk-num'))
        + row('Looking for', chip('hours.type', 'full', 'Full-time', hr.type) + chip('hours.type', 'part', 'Part-time', hr.type) + chip('hours.type', 'either', 'Either', hr.type)) + '</div>';
    },
    care: function (T) {
      var c = T.care;
      return '<div class="tk-cap"><div class="tk-k">What they told us (not verified yet)</div>'
        + row('Where they have given care', chip('care.settings', 'homes', 'Homes', c.settings, 1) + chip('care.settings', 'facilities', 'Facilities', c.settings, 1) + chip('care.settings', 'family', 'Family', c.settings, 1))
        + row('Levels they say they have done', chip('care.levels', '1', 'Level 1', c.levels, 1) + chip('care.levels', '2', 'Level 2', c.levels, 1) + chip('care.levels', '3', 'Level 3', c.levels, 1) + chip('care.levels', 'none', 'None yet', c.levels, 1))
        + row('Where they gained that experience', inp('care.where', c.where, 'Employer or setting'))
        + row('What they would like to learn', inp('care.learn', c.learn, ''))
        + '<div class="tk-note">Everyone starts at Level 1. A level only changes after it is verified.</div></div>';
    },
    dementia: function (T) {
      return '<div class="tk-cap"><div class="tk-k">Dementia or Alzheimer\'s</div>' + row('Have they cared for someone with it?', chip('dementia', 'yes', 'Yes', T.dementia) + chip('dementia', 'no', 'No', T.dementia))
        + (T.dementia === 'no' ? row('Interested in learning?', chip('dementia_learn', 'yes', 'Yes', T.dementia_learn) + chip('dementia_learn', 'no', 'Not now', T.dementia_learn)) : '') + '</div>';
    },
    fit: function (T) {
      var f = T.fit;
      return '<div class="tk-cap"><div class="tk-k">For matching and references</div>'
        + row('Worked for Caring Companions before?', chip('fit.cc_before', 'yes', 'Yes', f.cc_before) + chip('fit.cc_before', 'no', 'No', f.cc_before))
        + row('Not a fit for them, or wants training first', inp('fit.limits', f.limits, 'Matching information, never a mark against them'))
        + row('Ask their references about', inp('fit.refs', f.refs, 'A job, a date or a reason for leaving to confirm')) + '</div>';
    }
  };

  function items(list, T) {
    return (list || []).map(function (x) {
      if (!x || !x.t) return '';
      var words = T.mode === 'video' && x.video ? x.video : x.text;
      if (x.t === 'say') return '<div class="tk-say">"' + esc(words) + '"</div>';
      if (x.t === 'ask') return '<div class="tk-ask">"' + esc(words) + '"</div>';
      if (x.t === 'note') return '<div class="tk-note">' + esc(words) + '</div>';
      if (x.t === 'head') return '<div class="tk-head">' + esc(words) + '</div>';
      if (x.t === 'level') return '<div class="tk-level"><b>' + esc(x.name) + '</b><span>"' + esc(words) + '"</span></div>';
      if (x.t === 'if') return '<div class="tk-if"><div class="tk-when">' + esc(x.when) + '</div>' + items(x.items, T) + '</div>';
      if (x.t === 'capture' && FORMS[x.form]) return FORMS[x.form](T);
      return '';
    }).join('');
  }
  function infoHtml(info) {
    info = info || {}; var ul = function (a) { return '<ul>' + (a || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };
    return '<div class="tk-info">' + (info.purpose ? '<b>Why we ask.</b> ' + esc(info.purpose) + '<br>' : '')
      + ((info.listen || []).length ? '<b>Listen for</b>' + ul(info.listen) : '') + ((info.follow_up || []).length ? '<b>Follow up when</b>' + ul(info.follow_up) : '')
      + ((info.important || []).length ? '<b>Important</b>' + ul(info.important) : '') + '</div>';
  }
  function html(sections, T, opts) {
    css(); T = norm(T); opts = opts || {}; sections = sections || [];
    var n = sections.length, at = Math.min(T.at, n), h = '<div class="tk">';
    if (!live() && trying()) h += '<div class="tk-try">You are trying the new interview. Only you see it. What you save here goes on this applicant\'s record, so use a pretend applicant.</div>';
    h += '<div class="tk-top"><div class="tk-dots" role="tablist" aria-label="Sections">' + sections.map(function (s, i) {
      return '<button type="button" class="tk-dot' + (i === at ? ' now' : i < at ? ' done' : '') + '" data-tkgo="' + i + '" title="' + esc((i + 1) + '. ' + s.title) + '" aria-label="' + esc('Section ' + (i + 1) + ': ' + s.title) + '"></button>';
    }).join('') + '</div><div class="tk-mode"><button type="button" class="' + (T.mode === 'person' ? 'on' : '') + '" data-tkmode="person">In person</button><button type="button" class="' + (T.mode === 'video' ? 'on' : '') + '" data-tkmode="video">Video</button></div></div>';
    if (at < n) {
      var s = sections[at], open = !!infoOpen[s.key];
      h += '<div class="tk-card"><div class="tk-h"><div style="flex:1"><div class="tk-k">Section ' + (at + 1) + ' of ' + n + '</div><div class="tk-title">' + esc(s.title) + '</div>'
        + (s.minutes ? '<div class="tk-min">About ' + esc(s.minutes) + ' minutes</div>' : '') + '</div>'
        + '<button type="button" class="tk-i' + (open ? ' on' : '') + '" data-tkinfo="' + esc(s.key) + '" aria-expanded="' + open + '" aria-label="Why we ask, and what to listen for">i</button></div>'
        + (open ? infoHtml(s.info) : '') + items(s.script, T)
        + (T.notes[s.key] !== undefined ? '<textarea class="tk-in" rows="2" style="margin-top:14px" data-tkf="notes.' + esc(s.key) + '" placeholder="A note, only if it helps (the recording catches the rest)">' + esc(T.notes[s.key] || '') + '</textarea>'
          : '<div style="margin-top:10px"><button type="button" class="tk-link" data-tka="note" data-tkd="' + esc(s.key) + '">+ Add a note</button></div>')
        + '</div><div class="tk-nav">' + (at > 0 ? '<button type="button" class="tk-b" data-tkgo="' + (at - 1) + '">Back</button>' : '')
        + '<button type="button" class="tk-b p" data-tkgo="' + (at + 1) + '">' + (at === n - 1 ? 'Finish the conversation' : 'Next: ' + esc(sections[at + 1].title)) + '</button></div>';
    } else {
      var mm = missing(T);
      h += '<div class="tk-card"><div class="tk-k">Before they leave</div><div class="tk-title">' + (mm.missing.length ? 'Still needed' : 'Everything we need is here') + '</div>'
        + (mm.missing.length ? '<ul class="tk-list">' + mm.missing.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><div class="tk-note">Ask now if you can. If they cannot answer today, it stays on the follow-up list. Never fill it in for them.</div>' : '')
        + (mm.follow.length ? '<div class="tk-head">For the office to follow up</div><ul class="tk-list">' + mm.follow.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '')
        + '</div><div class="tk-nav"><button type="button" class="tk-b" data-tkgo="' + (n - 1) + '">Back to the conversation</button></div>';
    }
    return h + '</div>';
  }

  function setPath(T, path, v) { var p = path.split('.'), o = T; for (var i = 0; i < p.length - 1; i++) { o[p[i]] = o[p[i]] && typeof o[p[i]] === 'object' ? o[p[i]] : {}; o = o[p[i]]; } o[p[p.length - 1]] = v; }
  function getPath(T, path) { var p = path.split('.'), o = T; for (var i = 0; i < p.length; i++) { if (o == null) return undefined; o = o[p[i]]; } return o; }
  /* Wires one container. get() returns the talk record to change (changed in place); changed(redraw) after every change. */
  function bind(box, get, changed) {
    if (!box || box.__tkBound) return; box.__tkBound = true;
    box.addEventListener('click', function (ev) {
      var t = ev.target.closest && ev.target.closest('[data-tkgo],[data-tkmode],[data-tkinfo],[data-tkc],[data-tka]'); if (!t || !box.contains(t)) return;
      var T = norm(get());
      if (t.hasAttribute('data-tkgo')) { T.at = Math.max(0, +t.getAttribute('data-tkgo')); changed(true, true); return; }
      if (t.hasAttribute('data-tkmode')) { T.mode = t.getAttribute('data-tkmode') === 'video' ? 'video' : 'person'; changed(true); return; }
      if (t.hasAttribute('data-tkinfo')) { var k = t.getAttribute('data-tkinfo'); infoOpen[k] = !infoOpen[k]; changed(true); return; }
      if (t.hasAttribute('data-tkc')) {
        var path = t.getAttribute('data-tkc'), v = t.getAttribute('data-tkv');
        if (t.hasAttribute('data-tkm')) {
          var cur = getPath(T, path); cur = Array.isArray(cur) ? cur : []; var i = cur.indexOf(v);
          if (i > -1) cur.splice(i, 1); else { if (v === 'none') cur = []; else cur = cur.filter(function (x) { return x !== 'none'; }); cur.push(v); }
          setPath(T, path, cur);
        } else if (path === 'avail.confirmed') T.avail.confirmed = T.avail.confirmed === true ? false : true;
        else setPath(T, path, getPath(T, path) === v ? null : v);
        changed(true); return;
      }
      var a = t.getAttribute('data-tka'), d = t.getAttribute('data-tkd'), x = d && T.avail.days[d];
      if (a === 'note') T.notes[d] = T.notes[d] || '';
      else if (a === 'follow') { T.avail.status = 'followup'; T.avail.confirmed = false; }
      else if (a === 'unfollow') { delete T.avail.status; }
      else if (x && a === 'add') { x.w.push({ f: '', t: '' }); T.avail.confirmed = false; }
      else if (x && a === 'del') { x.w.splice(+t.getAttribute('data-tki'), 1); if (!x.w.length) x.w = [{ f: '', t: '' }]; T.avail.confirmed = false; }
      else if (x && a === 'off') { x.off = true; T.avail.confirmed = false; }
      else if (x && a === 'on') { delete x.off; T.avail.confirmed = false; }
      else if (x && a === 'same') { var prev = T.avail.days[DAYS[DAYS.map(function (q) { return q[0]; }).indexOf(d) - 1][0]]; T.avail.days[d] = JSON.parse(JSON.stringify(prev)); T.avail.confirmed = false; }
      changed(true);
      if (a === 'note') setTimeout(function () { var el = box.querySelector('[data-tkf="notes.' + d + '"]'); if (el) el.focus(); }, 0);
    });
    box.addEventListener('change', function (ev) {
      var t = ev.target; if (!t || !t.hasAttribute || !t.hasAttribute('data-tkt')) return;
      var T = norm(get()), x = T.avail.days[t.getAttribute('data-tkt')], w = x && x.w[+t.getAttribute('data-tki')]; if (!w) return;
      w[t.getAttribute('data-tkw')] = t.value; T.avail.confirmed = false; changed(true);
    });
    box.addEventListener('input', function (ev) {
      var t = ev.target; if (!t || !t.hasAttribute || !t.hasAttribute('data-tkf')) return;
      setPath(norm(get()), t.getAttribute('data-tkf'), t.value); changed(false);   /* typing never redraws, or the box loses its place */
    });
  }

  /* On their profile's Interview tab: what was captured, in plain lines. */
  function summaryHtml(T) {
    if (!T || typeof T !== 'object') return '';
    css(); T = norm(JSON.parse(JSON.stringify(T))); var out = [], has = function (v) { return String(v == null ? '' : v).trim() !== ''; }, wk = T.work, hr = T.hours;
    var line = function (k, v) { if (has(v)) out.push('<div class="tk-row" style="align-items:flex-start"><span class="tk-dname" style="flex-basis:150px">' + esc(k) + '</span><span class="tk-lab">' + esc(v) + '</span></div>'); };
    line('Recording', T.consent === 'yes' ? 'They said yes' : T.consent === 'no' ? 'They said no; not recorded' : '');
    line('Working now', wk.working === 'yes' ? [wk.employer, has(wk.hours) ? wk.hours + ' hours a week' : '', wk.plan === 'keep' ? 'keeping it' : wk.plan === 'leave' ? 'leaving it' : '', wk.sched === 'rotating' ? 'schedule changes week to week' + (has(wk.published) ? ' (' + wk.published + ')' : '') : wk.sched === 'fixed' ? 'set schedule' : ''].filter(has).join(', ') : wk.working === 'no' ? 'Not working right now' : '');
    line('Can start', wk.start);
    line('Availability', T.avail.status === 'followup' ? 'Needs follow-up' + (has(T.avail.why) ? ': ' + T.avail.why : '') : readback(T) + (T.avail.confirmed === true ? ' (read back and confirmed)' : has(readback(T)) ? ' (not confirmed yet)' : ''));
    line('Every week?', T.avail.steady === 'yes' ? 'Yes' : T.avail.steady === 'depends' ? 'It depends' : '');
    line('Extra flexibility', T.avail.flex);
    line('Hours', [has(hr.want) ? 'hoping for ' + hr.want : '', has(hr.min) ? 'needs at least ' + hr.min : '', hr.type === 'full' ? 'full-time' : hr.type === 'part' ? 'part-time' : hr.type === 'either' ? 'full or part-time' : ''].filter(has).join(', '));
    line('Care they say they have done', [T.care.levels.map(function (l) { return l === 'none' ? 'none yet' : 'Level ' + l; }).join(', '), T.care.settings.join(', '), T.care.where].filter(has).join(' · ') + (T.care.levels.length ? ' (not verified)' : ''));
    line('Wants to learn', T.care.learn);
    line('Dementia', T.dementia === 'yes' ? 'Has cared for someone with it' : T.dementia === 'no' ? 'No experience' + (T.dementia_learn === 'yes' ? ', interested in learning' : '') : '');
    line('Worked here before', T.fit.cc_before === 'yes' ? 'Yes' : T.fit.cc_before === 'no' ? 'No' : '');
    line('Not a fit / training', T.fit.limits); line('Ask references', T.fit.refs);
    Object.keys(T.notes).forEach(function (k) { line('Note', T.notes[k]); });
    return out.length ? '<div class="tk">' + out.join('') + '</div>' : '';
  }

  /* ---------- Settings (owners) ---------- */
  function settingsFill() {
    var now = document.getElementById('talkSetNow'), b = document.getElementById('talkToggleBtn'), t = document.getElementById('talkTryBtn');
    if (now) now.textContent = live() ? 'On: regular Caregiver applicants get the six-section interview. PRN and every other position are unchanged.' : 'Off: every interview is exactly as before.' + (trying() ? ' You are trying it (only you, this tab).' : '');
    if (b) b.textContent = live() ? 'Turn off the new caregiver interview' : 'Turn on the new caregiver interview';
    if (t) { t.textContent = trying() ? 'Stop trying it' : 'Try it (only me)'; t.style.display = live() ? 'none' : ''; }
  }
  function tryIt(want) {
    if (!owner()) { alert('Only Samantha or Zachary can try this.'); return; }
    try { if (want) sessionStorage.setItem(TRY, '1'); else sessionStorage.removeItem(TRY); } catch (e) { /* private window: nothing kept */ }
    settingsFill();
  }
  async function settingsToggle(btnEl) {
    if (!owner()) { alert('Only Samantha or Zachary can change this.'); return; }
    var want = !live();
    var ok = typeof W.ccConfirm === 'function' ? await W.ccConfirm(want
      ? 'Turn on the new caregiver interview?\n\n· regular Caregiver applicants only; PRN CNA, PRN Caregiver and every other position keep today\'s interview\n· six conversation sections with exact day-by-day availability\n· nothing is sent to anyone, and no application answer, level or status changes'
      : 'Turn off the new caregiver interview? Every interview goes back to the question list. What was already saved stays on each record.') : true;
    if (!ok) return;
    if (btnEl) btnEl.disabled = true;
    var out = typeof W.tkMerge === 'function' ? await W.tkMerge(function (m) { m[KEY] = want; if (want && !m[KEY + '_since']) m[KEY + '_since'] = new Date().toISOString(); return ['new caregiver interview ' + (want ? 'ON' : 'OFF')]; }, 'new caregiver interview') : { error: { message: 'saving is not available here' } };
    if (btnEl) btnEl.disabled = false;
    var sv = document.getElementById('talkSaved'); if (sv) sv.textContent = out && out.error ? 'Could not save: ' + out.error.message : (want ? 'On.' : 'Off.');
    settingsFill();
  }

  W.TALK = { KEY: KEY, DAYS: DAYS, on: on, live: live, trying: trying, tryIt: tryIt, applies: applies, load: load, norm: norm, html: html, bind: bind, clean: clean,
    missing: missing, readback: readback, summaryHtml: summaryHtml, settingsFill: settingsFill, settingsToggle: settingsToggle, _reset: function () { cache = null; infoOpen = {}; } };
})(window);
