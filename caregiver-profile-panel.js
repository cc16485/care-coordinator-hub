/* =============================================================================
   CAREGIVER PROFILE PANEL (part 2, slice 2a, 2026-10-01)
   =============================================================================
   Samantha: ONE profile per caregiver, used for "introduce your caregiver" and "caregiver change" (2b). The office
   drafts it with AI before the welcome call, reads it to them on the call, types what they add or change, sends their
   personal photo link (photo required, video encouraged), then publishes it. "Can their profile link be linked in the
   employees profile so we can always access it and edit it when needed": the same panel opens from the welcome call
   card, the Ready for Orientation queue, the Background tab AND the employee's own page.

   A plain file (no build), loaded by index.html before the lazy caregivers engine, so the employee page can use it
   without loading the engine. It uses the page's signed-in Supabase client (`sb`).
     CGP2.mount(hostEl, ctx)   draws the panel inside hostEl
     CGP2.open(ctx)            draws it in a pop-over
     CGP2.chipHtml(row)        the status chip; CGP2.rowFor(candidateId) the cached row
     CGP2.loadForCandidates(ids)  fills the cache for chips on lists
   ctx = { mode: 'onboarding' | 'employee', candidate_id, axiscare_id, legacy_candidate_id, first, last, phone, email,
           intake_id, chipEl (id of a span to keep in step), onChange() }
   Server rules (publish checks, the link message, the AI draft) live in the caregiver-profile edge function.
   Saves are direct table updates (office staff are signed in); a published profile's edits go live at once.
   ============================================================================= */
(function (root) {
  'use strict';
  var SB_URL = 'https://zngsgedlsxinbygwmxwn.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZ3NnZWRsc3hpbmJ5Z3dteHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NDIzNDQsImV4cCI6MjA5ODExODM0NH0.L_31_UKdccyRH9n7p1GaBlZTqcJipB008H-GIvxwLxM';
  var BUCKET = 'caregiver-profiles';
  var COLS = 'id,candidate_id,axiscare_id,applicant_id,first_name,last_name,preferred_name,about,experience,why_this_work,years_experience,photo_path,video_path,consent,consent_at,published,status,drafted_at,drafted_by,link_sent_at,link_sent_by,submitted_at,published_at,published_by,updated_at,created_at,photo_url,needs_review,legacy_intro_id';
  var IMG = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', webp: 'image/webp' };
  var VID = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm' };
  var FIELDS = [
    ['about', 'About me', 'What they are like as a person. Families read this first.'],
    ['experience', 'Experience caring for others', 'Who they have cared for, and for how long.'],
    ['why_this_work', 'Why they enjoy caregiving', 'In their words, as close as you can.'],
  ];
  var BY_CAND = {};          // candidate_id -> row (for chips on lists)
  var M = {};                // mounted panels by key
  var seq = 0;

  function client() {
    try { if (typeof sb !== 'undefined' && sb) return sb; } catch (e) { /* not declared on this page */ }
    return root.__cgpSb || null;
  }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  /* Samantha: never an em dash in anything a family reads. */
  function noDash(s) { return String(s == null ? '' : s).replace(/\s*[\u2014\u2015]\s*/g, ', ').replace(/ ,/g, ',').replace(/,\s*([.!?])/g, '$1'); }
  function day(iso) { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' }) : ''; }
  function who(s) { return s ? String(s).split('@')[0] : ''; }
  function publicUrl(p) { return p ? SB_URL + '/storage/v1/object/public/' + BUCKET + '/' + p : ''; }
  /* 2b: an older intro moved over keeps its photo address (photo_url) until a proper photo is uploaded */
  function photoOf(row) { return row ? (row.photo_path ? publicUrl(row.photo_path) : (/^https:\/\//i.test(String(row.photo_url || '')) ? String(row.photo_url) : '')) : ''; }
  /* "Sarah T.": what families see on the card */
  function cardName(row) {
    var f = String((row && (row.preferred_name || row.first_name)) || '').trim();
    var l = String((row && row.last_name) || '').trim().replace(/^[^A-Za-z]+/, '').charAt(0).toUpperCase();
    return f && l ? f + ' ' + l + '.' : f;
  }
  function cardUrl(row) { return 'https://cc.mo-care.com/caregiver.html?id=' + encodeURIComponent(row.id); }
  function prompts(row) {
    var out = [];
    FIELDS.forEach(function (f) { String((row && row[f[0]]) || '').replace(/\[([^\]]*)\]/g, function (_, q) { out.push([f[1], q.replace(/^\s*ask:\s*/i, '')]); return _; }); });
    return out;
  }

  function status(row) {
    if (!row) return ['Not started', '#F3F4F6', '#4B5563'];
    if (row.status === 'withdrawn') return ['Withdrawn', '#FEE2E2', '#991B1B'];
    if (row.published && row.needs_review) return ['Published, older: check it', '#FEF3C7', '#92400E'];
    if (row.published) return ['Published', '#DCFCE7', '#15803D'];
    if (row.photo_path) return ['Photo in, ready to publish', '#E0F7F6', '#0F766E'];
    if (row.link_sent_at) return ['Link sent', '#E0F2FE', '#075985'];
    if (row.drafted_at) return ['Draft ready', '#FEF3C7', '#92400E'];
    return ['Not started', '#F3F4F6', '#4B5563'];
  }
  function chipHtml(row) {
    var s = status(row);
    return '<span class="badge" title="Caregiver profile" style="background:' + s[1] + ';color:' + s[2] + ';font-size:.66rem;font-weight:700;border-radius:999px;padding:.12rem .55rem;white-space:nowrap">🪪 ' + esc(s[0]) + '</span>';
  }
  function rowFor(candidateId) { return BY_CAND[String(candidateId)] || null; }
  /* 2c: whether the chips on lists can be trusted. A failed load is said on the list, never shown as "Not started". */
  var CACHE = { ok: false, err: '' };
  async function loadForCandidates(ids) {
    var c = client(); if (!c) { CACHE.err = 'not signed in'; return; }
    ids = Array.from(new Set((ids || []).map(String).filter(Boolean)));
    if (!ids.length) { CACHE.ok = true; return; }
    try {
      var r = await c.from('caregiver_profiles').select(COLS).in('candidate_id', ids).neq('status', 'withdrawn');
      if (r.error) throw r.error;
      ids.forEach(function (id) { if (!(r.data || []).some(function (x) { return String(x.candidate_id) === id; })) delete BY_CAND[id]; });
      (r.data || []).forEach(function (x) { BY_CAND[String(x.candidate_id)] = x; });
      CACHE.ok = true; CACHE.err = '';
    } catch (e) { CACHE.err = (e && e.message) || 'error'; console.warn('caregiver profiles load failed:', e); }
  }
  function cacheState() { return { ok: CACHE.ok, err: CACHE.err }; }
  function isLive(row) { return !!(row && row.published && row.status !== 'withdrawn'); }

  /* The function: office actions carry the staff member's own sign-in. */
  async function call(body, fn) {
    var c = client(); if (!c) throw new Error('Sign in first.');
    var s = await c.auth.getSession(); var session = s && s.data && s.data.session;
    if (!session) throw new Error('Sign in again, then try once more.');
    var r = await fetch(SB_URL + '/functions/v1/' + (fn || 'caregiver-profile'), { method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify(body) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok || j.error) { var e = new Error(j.error || ('error ' + r.status)); e.problems = j.problems; throw e; }
    return j;
  }

  async function find(m) {
    var c = client(), x = m.ctx; m.suggest = []; m.err = '';
    if (!c) { m.err = 'Sign in first.'; return null; }
    var q = function () { return c.from('caregiver_profiles').select(COLS).neq('status', 'withdrawn').order('updated_at', { ascending: false }).limit(1); };
    try {
      var r;
      if (x.mode !== 'employee') {
        if (!x.candidate_id) return null;
        r = await q().eq('candidate_id', String(x.candidate_id)); if (r.error) throw r.error;
        return (r.data || [])[0] || null;
      }
      if (x.axiscare_id) { r = await q().eq('axiscare_id', String(x.axiscare_id)); if (r.error) throw r.error; if ((r.data || [])[0]) return r.data[0]; }
      if (x.legacy_candidate_id) { r = await q().eq('candidate_id', String(x.legacy_candidate_id)); if (r.error) throw r.error; if ((r.data || [])[0]) { m.viaCandidate = true; return r.data[0]; } }
      /* a name match is only ever a suggestion the office confirms */
      if (x.first && x.last) {
        r = await c.from('caregiver_profiles').select(COLS).neq('status', 'withdrawn').is('axiscare_id', null)
          .ilike('first_name', String(x.first).trim()).ilike('last_name', String(x.last).trim()).limit(3);
        if (!r.error) m.suggest = r.data || [];
      }
      return null;
    } catch (e) { m.err = (e && e.message) || 'error'; return null; }
  }

  async function mount(host, ctx) {
    if (!host) return;
    var k = 'cgp' + (++seq);
    var m = M[k] = { k: k, host: host, ctx: ctx || {}, row: null, suggest: [], msg: '' };
    host.setAttribute('data-cgp', k);
    host.innerHTML = '<div style="font-size:.8rem;color:var(--gray,#6B7280)">Loading the caregiver profile…</div>';
    m.row = await find(m);
    if (m.row && m.row.candidate_id) BY_CAND[String(m.row.candidate_id)] = m.row;
    draw(m);
    return k;
  }
  async function reload(k) {
    var m = M[k]; if (!m) return;
    m.row = await find(m);
    if (m.row && m.row.candidate_id) BY_CAND[String(m.row.candidate_id)] = m.row;
    else if (m.ctx.candidate_id) delete BY_CAND[String(m.ctx.candidate_id)];
    draw(m);
    try { if (typeof m.ctx.onChange === 'function') m.ctx.onChange(m.row); } catch (e) { /* the list redraw is a nicety */ }
  }
  function say(m, text, bad) { m.msg = text ? [text, !!bad] : ''; var el = document.getElementById(m.k + '-msg'); if (el) { el.textContent = text || ''; el.style.color = bad ? '#B00020' : '#15803D'; } }

  function draw(m) {
    if (!document.body.contains(m.host)) { delete M[m.k]; return; }
    var row = m.row, x = m.ctx, k = m.k;
    var name = [x.first, x.last].filter(Boolean).join(' ') || 'this caregiver';
    var chipEl = x.chipEl && document.getElementById(x.chipEl); if (chipEl) chipEl.innerHTML = chipHtml(row);
    var btn = function (act, label, style, title) { return '<button class="ibtn" style="' + (style || '') + '" title="' + esc(title || '') + '" onclick="CGP2.act(\'' + k + '\',\'' + act + '\',this)">' + label + '</button>'; };
    var h = '<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.5rem">'
      + '<span style="font-weight:800;color:var(--navy,#0E3860);font-size:.95rem">Caregiver profile</span>' + chipHtml(row)
      + (row ? '<a class="ibtn" style="text-decoration:none" href="' + esc(cardUrl(row)) + '" target="_blank" rel="noopener">See the card ↗</a>'
        + btn('copy', 'Copy card link', '', row.published ? 'The link families get' : 'The card only shows once it is published') : '')
      + '</div>';
    if (m.err) h += '<div style="font-size:.8rem;color:#B00020;margin-bottom:.4rem">Could not load the profile: ' + esc(m.err) + ' ' + btn('reload', 'Try again') + '</div>';
    if (!row) {
      if (m.suggest && m.suggest.length) h += m.suggest.map(function (s) {
        return '<div style="background:#FFF8EC;border:1px solid #F0D8A8;border-radius:9px;padding:.5rem .7rem;margin-bottom:.45rem;font-size:.8rem">'
          + 'Is this ' + esc(name) + '\'s profile? <b>' + esc([s.first_name, s.last_name].join(' ')) + '</b>, started ' + esc(day(s.created_at)) + ', ' + esc(status(s)[0]).toLowerCase() + '. '
          + '<button class="ibtn" onclick="CGP2.link(\'' + k + '\',\'' + esc(s.id) + '\',this)">Yes, link it</button></div>';
      }).join('');
      h += '<div style="font-size:.8rem;color:var(--gray,#6B7280);margin-bottom:.5rem">'
        + (x.mode === 'employee' ? 'No profile yet. Families see this card before a visit, so it is worth starting one.' : 'No profile yet. Draft it with AI before the welcome call, then read it to them on the call.')
        + '</div>' + btn('draft', x.mode === 'employee' ? '✨ Start a profile (AI draft)' : '✨ Draft with AI', 'background:var(--teal,#54BDB8);color:#fff;border-color:var(--teal,#54BDB8)')
        + '<div id="' + k + '-msg" style="font-size:.8rem;margin-top:.45rem"></div>';
      m.host.innerHTML = h; if (m.msg) say(m, m.msg[0], m.msg[1]); return;
    }
    if (m.viaCandidate && x.axiscare_id && !row.axiscare_id) h += '<div style="font-size:.74rem;color:var(--gray,#6B7280);margin-bottom:.4rem">Found from their onboarding record. Saving links it to this AxisCare caregiver too.</div>';
    h += '<div style="display:flex;gap:.8rem;flex-wrap:wrap;align-items:flex-start">'
      + '<div style="flex:none;width:96px;text-align:center">'
      + (photoOf(row) ? '<a href="' + esc(photoOf(row)) + '" target="_blank" rel="noopener"><img src="' + esc(photoOf(row)) + '" alt="" style="width:96px;height:96px;object-fit:cover;border-radius:12px;border:1px solid var(--border,#E2E8F0)"></a>'
        + (row.photo_path ? '' : '<div style="font-size:.66rem;color:#92400E;margin-top:.2rem">Older photo. Upload a proper one.</div>')
        : '<div style="width:96px;height:96px;border-radius:12px;border:1.5px dashed #CBD5E1;display:flex;align-items:center;justify-content:center;font-size:.7rem;color:#64748B;padding:.3rem">No photo yet (required)</div>')
      + (row.video_path ? '<a href="' + esc(publicUrl(row.video_path)) + '" target="_blank" rel="noopener" style="display:block;font-size:.72rem;margin-top:.25rem">▶ Their video</a>' : '<div style="font-size:.68rem;color:#94A3B8;margin-top:.25rem">No video (optional)</div>')
      + '<label class="ibtn" style="display:block;margin-top:.35rem;cursor:pointer;font-size:.68rem">Replace photo<input type="file" accept="image/*" style="display:none" onchange="CGP2.upload(\'' + k + '\',\'photo\',this)"></label>'
      + '<label class="ibtn" style="display:block;margin-top:.25rem;cursor:pointer;font-size:.68rem">' + (row.video_path ? 'Replace video' : 'Add a video') + '<input type="file" accept="video/*" style="display:none" onchange="CGP2.upload(\'' + k + '\',\'video\',this)"></label>'
      + '</div><div style="flex:1;min-width:240px">';
    if (row.needs_review) h += '<div style="background:#FFF8EC;border:1.5px solid #F0A63A;border-radius:9px;padding:.5rem .7rem;margin-bottom:.5rem;font-size:.8rem">'
      + '<b style="color:#92400E">Older profile: check the words, add a proper photo and get their OK.</b> '
      + 'It came from the older intro list, which families were already being shown, so it stays live and is linked in family texts. '
      + (row.photo_path && row.consent ? btn('reviewed', '✓ Checked: words, photo and their OK', 'margin-top:.3rem') : '<span style="color:#64748B">Still needed: ' + [row.photo_path ? '' : 'a proper photo (Replace photo, or Send photo link)', row.consent ? '' : 'their OK (they tick it on their page)'].filter(Boolean).join(' and ') + '.</span>')
      + '</div>';
    var ps = prompts(row);
    if (ps.length) h += '<div style="background:#FFF8EC;border:1.5px solid #F0A63A;border-radius:9px;padding:.5rem .7rem;margin-bottom:.5rem;font-size:.8rem">'
      + '<b style="color:#92400E">Ask on the call</b> (type their answer in their words, and take the [brackets] out):<ul style="margin:.25rem 0 0;padding-left:1.1rem">'
      + ps.map(function (p) { return '<li><span style="color:#92400E">' + esc(p[0]) + ':</span> ' + esc(p[1]) + '</li>'; }).join('') + '</ul></div>';
    h += '<label style="display:block;font-size:.74rem;font-weight:700;color:var(--navy,#0E3860);margin:.1rem 0 .15rem">What they like to be called <span style="font-weight:400;color:#64748B">(if not ' + esc(row.first_name || 'their first name') + ')</span></label>'
      + '<input id="' + k + '-preferred_name" type="text" value="' + esc(row.preferred_name || '') + '" style="width:100%;box-sizing:border-box;font:inherit;font-size:.82rem;padding:.35rem .5rem;border:1px solid var(--border,#E2E8F0);border-radius:7px">';
    FIELDS.forEach(function (f) {
      var v = row[f[0]] || '', flag = /\[/.test(v);
      h += '<label style="display:block;font-size:.74rem;font-weight:700;color:var(--navy,#0E3860);margin:.5rem 0 .15rem">' + esc(f[1]) + ' <span style="font-weight:400;color:#64748B">' + esc(f[2]) + '</span></label>'
        + '<textarea id="' + k + '-' + f[0] + '" style="width:100%;box-sizing:border-box;min-height:62px;font:inherit;font-size:.82rem;padding:.4rem .5rem;border:' + (flag ? '2px solid #F0A63A;background:#FFFBF2' : '1px solid var(--border,#E2E8F0)') + ';border-radius:7px">' + esc(v) + '</textarea>';
    });
    h += '<div style="font-size:.7rem;color:#64748B;margin-top:.2rem">Written about them, using their first name. The card shows their first name and last initial.</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.55rem">'
      + btn('save', '💾 Save', 'background:var(--navy,#0E3860);color:#fff;border-color:var(--navy,#0E3860)')
      + btn('draft', '✨ Redo draft', '', 'Ask the AI for a fresh draft from their application and interview')
      + (row.published && !row.needs_review ? '' : btn('send', row.link_sent_at ? '📲 Send photo link again' : '📲 Send photo link', '', 'Texts and emails their personal link to add a photo and video'))
      + (row.published ? btn('intro', '💌 Introduce to a family', 'background:var(--teal,#54BDB8);color:#fff;border-color:var(--teal,#54BDB8)', 'Text and email a family this card, after you see a preview') : '')
      + (row.published ? btn('unpublish', 'Unpublish', 'color:#B00020;border-color:#FCA5A5') : btn('publish', '✓ Publish', 'background:#15803D;color:#fff;border-color:#15803D', 'Needs a photo, their permission, and no [ask] prompts left'))
      + '</div><div id="' + k + '-msg" style="font-size:.8rem;margin-top:.45rem;white-space:pre-wrap"></div>'
      + '<div style="font-size:.7rem;color:#64748B;margin-top:.45rem;line-height:1.5">'
      + [row.drafted_at ? 'Drafted ' + day(row.drafted_at) + (row.drafted_by ? ' by ' + esc(who(row.drafted_by)) : '') : '',
         row.link_sent_at ? 'Link sent ' + day(row.link_sent_at) + (row.link_sent_by ? ' by ' + esc(who(row.link_sent_by)) : '') : '',
         row.submitted_at ? 'They saved it ' + day(row.submitted_at) : '',
         row.consent ? 'Permission given ' + day(row.consent_at) : 'No permission yet (they tick it on their page)',
         row.published ? 'Published ' + day(row.published_at) + (row.published_by ? ' by ' + esc(who(row.published_by)) : '') + '. Edits you save go live right away.' : ''].filter(Boolean).join(' · ')
      + '</div></div></div>'
      + '<div id="' + k + '-intro"></div>';
    m.host.innerHTML = h;
    if (m.msg) say(m, m.msg[0], m.msg[1]);
    drawIntro(m);
  }

  /* ── Introduce to a family (2b) ────────────────────────────────────────────────────────────────────────────────
     A person presses this, picks the client, sees exactly who would hear and the words, then confirms. The
     caregiver-intro function does the deciding (each contact's caregiver-intro setting, STOP, texting consent, the
     universal opt-out) and the sending; nothing here sends on its own. Only a published card can be sent, and
     only to a circle linked to its AxisCare client (an unlinked circle is never sent to, same as the Circles tab).
     Family contacts are kept on the Circles tab (synced from AxisCare), so they are not added here. */
  var PREF = { every: 'every change', new_only: 'only somebody new', never: 'does not want these' };
  var REASONS = [['first_time', 'First time with this client'], ['start_of_care', 'Start of care'], ['change', 'A change of caregiver']];
  function drawIntro(m) {
    var el = document.getElementById(m.k + '-intro'), I = m.intro, k = m.k;
    if (!el) return;
    if (!I || !I.open || !m.row || !m.row.published) { el.innerHTML = ''; return; }
    var h = '<div style="margin-top:.8rem;border:1.5px solid var(--teal,#54BDB8);border-radius:11px;padding:.7rem .8rem;background:#F4FBFB">'
      + '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem"><b style="color:var(--navy,#0E3860)">Introduce ' + esc(cardName(m.row)) + ' to a family</b><span style="flex:1"></span>'
      + '<button class="ibtn" onclick="CGP2.act(\'' + k + '\',\'intro\',this)">Close</button></div>';
    if (I.err) h += '<div style="font-size:.8rem;color:#B00020;margin-bottom:.4rem">' + esc(I.err) + '</div>';
    if (!I.circles) { el.innerHTML = h + '<div style="font-size:.8rem;color:#64748B">Loading clients…</div></div>'; return; }
    h += '<div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:flex-end">'
      + '<label style="flex:1;min-width:190px;font-size:.74rem;font-weight:700;color:var(--navy,#0E3860)">Client<br><select id="' + k + '-icl" onchange="CGP2.introPick(\'' + k + '\',this.value)" style="width:100%;font:inherit;font-size:.82rem;padding:.3rem">'
      + '<option value="">Choose a client…</option>'
      + I.circles.map(function (c) { return '<option value="' + esc(c.id) + '"' + (String(c.id) === String(I.circleId) ? ' selected' : '') + '>' + esc(c.client_name) + '</option>'; }).join('')
      + '</select></label>'
      + '<label style="flex:1;min-width:170px;font-size:.74rem;font-weight:700;color:var(--navy,#0E3860)">Why<br><select id="' + k + '-irs" onchange="CGP2.introReason(\'' + k + '\',this.value)" style="width:100%;font:inherit;font-size:.82rem;padding:.3rem">'
      + REASONS.map(function (r) { return '<option value="' + r[0] + '"' + (r[0] === I.reason ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('')
      + '</select></label></div>';
    if (!I.circles.length) h += '<div style="font-size:.8rem;color:#92400E;margin-top:.5rem">No client circle is linked to AxisCare yet. Link one on the Circles tab first.</div>';
    if (I.circleId) {
      if (!I.people) h += '<div style="font-size:.8rem;color:#64748B;margin-top:.5rem">Loading the family…</div>';
      else if (!I.people.length) h += '<div style="font-size:.8rem;color:#92400E;margin-top:.5rem">Nobody is in this client\'s circle yet. Add the family on the Circles tab first.</div>';
      else h += '<div style="font-size:.78rem;margin-top:.5rem">' + I.people.map(function (c) {
        var chip = function (t, bg, fg) { return '<span style="background:' + bg + ';color:' + fg + ';border-radius:999px;padding:.05rem .45rem;font-size:.68rem;font-weight:700">' + esc(t) + '</span>'; };
        return '<div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;padding:.15rem 0"><b>' + esc(c.name) + '</b>'
          + (c.relationship ? '<span style="color:#64748B">' + esc(c.relationship) + '</span>' : '')
          + chip(PREF[c.caregiver_intro_pref] || PREF.new_only, '#EEF2F7', '#334155')
          + (c.stopped_at ? chip('replied STOP', '#FEE2E2', '#991B1B') : '')
          + (c.axiscare_removed_at ? chip('no longer on AxisCare contacts', '#F3F4F6', '#4B5563') : '')
          + ((c.phone && c.sms_consent) || c.email ? '' : chip('no way to reach them', '#FEF3C7', '#92400E'))
          + '</div>';
      }).join('') + '</div>';
      h += '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.55rem">' + btn('ipreview', '👀 Preview who hears and the words')
        + (I.preview && I.preview.would_reach && I.preview.would_reach.length ? btn('isend', '💌 Send it', 'background:var(--navy,#0E3860);color:#fff;border-color:var(--navy,#0E3860)') : '') + '</div>';
    }
    if (I.preview) {
      var p = I.preview;
      h += '<div style="margin-top:.5rem;font-size:.8rem">' + (p.would_reach && p.would_reach.length
        ? '<b>Would go to ' + p.would_reach.map(esc).join(', ') + '</b> (' + p.by_text + ' by text, ' + p.by_email + ' by email)'
          + (p.not_wanted ? '. ' + p.not_wanted + ' did not want this one' : '') + (p.held_back ? '. ' + p.held_back + ' with no way to reach them' : '') + '.'
          + '<div style="margin-top:.35rem;background:#fff;border:1px solid var(--border,#E2E8F0);border-radius:8px;padding:.45rem .6rem;white-space:pre-wrap">' + esc(p.example) + '</div>'
          + '<div style="color:#64748B;margin-top:.25rem">Emails say the same, with a "Meet ' + esc(p.caregiver) + '" button. Anyone who has opted out is skipped when it sends.</div>'
        : '<b>Nobody would hear about this one.</b> ' + (p.not_wanted ? 'Their settings say they do not want it.' : 'Nobody in this circle can be reached.')) + '</div>';
    }
    if (I.result) h += '<div style="margin-top:.5rem;font-size:.8rem;white-space:pre-wrap;color:' + (I.result[1] ? '#B00020' : '#15803D') + '">' + esc(I.result[0]) + '</div>';
    el.innerHTML = h + '</div>';
  }
  async function introOpen(m) {
    var c = client();
    m.intro = { open: true, circles: null, circleId: '', people: null, reason: 'first_time', preview: null, result: null, err: '' };
    drawIntro(m);
    try {
      var r = await c.from('care_circles').select('id,client_name,axiscare_client_id').eq('active', true).order('client_name');
      if (r.error) throw r.error;
      m.intro.circles = (r.data || []).filter(function (x) { return x.axiscare_client_id; });
    } catch (e) { m.intro.circles = []; m.intro.err = 'Could not load clients: ' + ((e && e.message) || e); }
    drawIntro(m);
  }
  async function introPick(k, circleId) {
    var m = M[k]; if (!m || !m.intro) return; var c = client();
    m.intro.circleId = circleId; m.intro.people = null; m.intro.preview = null; m.intro.result = null; m.intro.err = '';
    drawIntro(m);
    if (!circleId) return;
    try {
      var r = await c.from('circle_contacts').select('id,name,relationship,phone,email,sms_consent,caregiver_intro_pref,intro_on_start,stopped_at,axiscare_removed_at').eq('circle_id', circleId);
      if (r.error) throw r.error;
      if (m.intro.circleId === circleId) m.intro.people = r.data || [];
    } catch (e) { m.intro.people = []; m.intro.err = 'Could not load the family: ' + ((e && e.message) || e); }
    drawIntro(m);
  }
  function introReason(k, v) { var m = M[k]; if (!m || !m.intro) return; m.intro.reason = v; m.intro.preview = null; m.intro.result = null; drawIntro(m); }
  function introBody(m, dry) {
    var I = m.intro, cl = (I.circles || []).find(function (x) { return String(x.id) === String(I.circleId); });
    return { profile_id: m.row.id, client_name: cl ? cl.client_name : '', circle_id: I.circleId, reason: I.reason, dry: !!dry };
  }

  function ctxBody(x) {
    return { candidate_id: x.mode === 'employee' ? (x.legacy_candidate_id || '') : (x.candidate_id || ''), axiscare_id: x.axiscare_id || '',
      first: x.first || '', last: x.last || '', phone: x.phone || '', email: x.email || '', intake_id: x.intake_id || '' };
  }
  function sent(d) {
    var s = [d.texted ? 'text' : '', d.emailed ? 'email' : ''].filter(Boolean);
    return (s.length ? 'Sent by ' + s.join(' and ') + '. It shows in their GoHighLevel conversation.' : 'No message went.')
      + (d.not_sent && d.not_sent.length ? '\n\nNot sent: ' + d.not_sent.join('; ') : '');
  }

  async function act(k, what, el) {
    var m = M[k]; if (!m) return;
    var row = m.row, x = m.ctx, c = client();
    var name = [x.first, x.last].filter(Boolean).join(' ') || 'this caregiver';
    if (el) el.disabled = true;
    try {
      if (what === 'reload') { await reload(k); return; }
      if (what === 'copy') {
        try { await navigator.clipboard.writeText(cardUrl(row)); say(m, 'Card link copied.' + (row.published ? '' : ' It only opens for families once the profile is published.')); }
        catch (e) { prompt('Copy the card link:', cardUrl(row)); }
        return;
      }
      if (what === 'draft') {
        var redo = !!(row && row.drafted_at);
        if (redo && !confirm('Redo the draft for ' + name + '?\n\nThe AI writes fresh words from their application and interview, and REPLACES what is in the three boxes now' + (row.submitted_at ? ', including what they typed on their own page' : '') + '. Their photo stays.')) return;
        if (row && row.published) { alert('Their profile is published. Unpublish it first if you want a fresh draft.'); return; }
        say(m, 'Writing a draft from their application and interview…');
        var d = await call(Object.assign({ action: 'draft', redo: redo }, ctxBody(x)));
        m.msg = [(d.note ? d.note : 'Draft ready. Read it through, and ask anything in [brackets] on the call.'), !!d.note];
        await reload(k); return;
      }
      if (what === 'save') {
        var patch = { preferred_name: (document.getElementById(k + '-preferred_name').value || '').trim() || null, updated_at: new Date().toISOString() };
        FIELDS.forEach(function (f) { patch[f[0]] = noDash(document.getElementById(k + '-' + f[0]).value).trim() || null; });
        if (row.published) {
          /* an older profile still being checked (needs_review) may have empty sections; never a [bracket] prompt */
          var miss = FIELDS.filter(function (f) { return (!patch[f[0]] && !row.needs_review) || /\[/.test(patch[f[0]] || ''); });
          if (miss.length) { say(m, 'This profile is live, so families would see it. Fill in "' + miss.map(function (f) { return f[1]; }).join('", "') + '" and take any [brackets] out, then Save.', true); return; }
        }
        if (x.mode === 'employee' && x.axiscare_id && !row.axiscare_id) patch.axiscare_id = String(x.axiscare_id);
        var r = await c.from('caregiver_profiles').update(patch).eq('id', row.id);
        if (r.error) { say(m, 'Did not save: ' + r.error.message + '. Copy your changes somewhere safe and try again.', true); return; }
        m.msg = [row.published ? 'Saved. It is live on their card now.' : 'Saved.', false];
        await reload(k); return;
      }
      if (what === 'send') {
        var p = await call({ action: 'send_link', profile_id: row.id, dry: true, phone: x.phone || '', email: x.email || '' });
        var to = [p.to && p.to.phone ? 'TEXT to ' + p.to.phone + ' (only if they said yes to texts, 8am to 6pm Central)' : '', p.to && p.to.email ? 'EMAIL to ' + p.to.email : ''].filter(Boolean);
        if (!to.length) { alert(name + ' has no phone number or email on file. Add one first. Nothing was sent.'); return; }
        if (!confirm('Send ' + name + ' their personal photo link?\n\nThis sends a ' + to.join(' and an ') + '.\n\nTEXT:\n' + p.text + '\n\nEMAIL: ' + p.subject)) return;
        var s = await call({ action: 'send_link', profile_id: row.id, phone: x.phone || '', email: x.email || '' });
        m.msg = [sent(s), !(s.texted || s.emailed)];
        alert((s.texted || s.emailed ? 'Photo link sent.\n\n' : 'The photo link did NOT go.\n\n') + sent(s));
        await reload(k); return;
      }
      if (what === 'intro') {
        if (m.intro && m.intro.open) { m.intro = null; drawIntro(m); return; }
        await introOpen(m); return;
      }
      if (what === 'ipreview') {
        m.intro.preview = null; m.intro.result = null; m.intro.err = ''; drawIntro(m);
        try { m.intro.preview = await call(introBody(m, true), 'caregiver-intro'); }
        catch (e) { m.intro.err = 'Could not preview: ' + ((e && e.message) || e) + '. Nothing was sent.'; }
        drawIntro(m); return;
      }
      if (what === 'isend') {
        var pv = m.intro && m.intro.preview;
        if (!pv || !pv.would_reach || !pv.would_reach.length) return;
        if (!confirm('Send ' + cardName(row) + '\'s card to ' + pv.would_reach.join(', ') + '?\n\nTEXT:\n' + pv.example + '\n\nEmails say the same, with a button to the card.')) return;
        try {
          var sr = await call(introBody(m, false), 'caregiver-intro');
          var lines = [];
          lines.push(sr.reached ? 'Sent to ' + (sr.who || []).join(', ') + '. It shows in their GoHighLevel conversation.' : 'Nothing was sent.');
          if (sr.failed && sr.failed.length) lines.push('NOT sent to ' + sr.failed.join(', ') + '. GoHighLevel refused it; it is on Needs Attention. Call them instead.');
          if (sr.opted_out) lines.push(sr.opted_out + ' had opted out, so they were skipped.');
          m.intro.result = [lines.join('\n'), !sr.reached || !!(sr.failed && sr.failed.length)];
          m.intro.preview = null;
        } catch (e) { m.intro.result = ['Did not send: ' + ((e && e.message) || e) + '. Nothing went.', true]; }
        drawIntro(m); return;
      }
      if (what === 'reviewed') {
        if (!row.photo_path || !row.consent) return;
        if (!confirm('You have read ' + cardName(row) + '\'s words, the photo is a proper one, and they gave their OK?')) return;
        var rv = await c.from('caregiver_profiles').update({ needs_review: false, updated_at: new Date().toISOString() }).eq('id', row.id);
        if (rv.error) { say(m, 'Did not save: ' + rv.error.message, true); return; }
        m.msg = ['Marked as checked.', false];
        await reload(k); return;
      }
      if (what === 'publish') {
        if (!confirm('Publish ' + name + '\'s profile?\n\nFamilies we place them with will see their photo, first name and last initial, and these words.')) return;
        try { await call({ action: 'publish', profile_id: row.id }); m.msg = ['Published. Families we place them with can see it now.', false]; }
        catch (e) { m.msg = [(e.problems && e.problems.length ? 'Not published yet:\n• ' + e.problems.join('\n• ') : (e.message || 'Not published.')), true]; }
        await reload(k); return;
      }
      if (what === 'unpublish') {
        if (!confirm('Unpublish ' + name + '\'s profile?\n\nFamilies will no longer see the card until you publish it again.')) return;
        await call({ action: 'unpublish', profile_id: row.id });
        m.msg = ['Unpublished. The card is hidden from families.', false];
        await reload(k); return;
      }
    } catch (e) {
      say(m, 'That did not go through: ' + ((e && e.message) || e) + '. Nothing was changed.', true);
    } finally { if (el) el.disabled = false; }
  }

  /* "Is this Sarah's profile? Link it": the office confirms a name match before it is tied to this caregiver. */
  async function link(k, id, el) {
    var m = M[k]; if (!m) return; var c = client();
    if (!confirm('Link this profile to ' + [m.ctx.first, m.ctx.last].join(' ') + ' (AxisCare ' + m.ctx.axiscare_id + ')?')) return;
    if (el) el.disabled = true;
    var r = await c.from('caregiver_profiles').update({ axiscare_id: String(m.ctx.axiscare_id), updated_at: new Date().toISOString() }).eq('id', id);
    if (r.error) { say(m, 'Could not link it: ' + r.error.message, true); if (el) el.disabled = false; return; }
    m.msg = ['Linked.', false];
    await reload(k);
  }

  /* The office adds or replaces the photo or video (e.g. one they texted in). A published profile shows it at once. */
  async function upload(k, kind, input) {
    var m = M[k]; if (!m || !m.row) return; var c = client(), row = m.row;
    var f = input && input.files && input.files[0]; if (!f) return;
    var ext = String(f.name.split('.').pop() || '').toLowerCase(), types = kind === 'photo' ? IMG : VID;
    if (!types[ext]) { say(m, kind === 'photo' ? 'Choose a JPG, PNG, HEIC or WEBP photo.' : 'Choose an MP4, MOV or WEBM video.', true); input.value = ''; return; }
    if (f.size > 100 * 1024 * 1024) { say(m, 'That file is over 100 MB. Try a shorter video.', true); input.value = ''; return; }
    if (row.published && !confirm('Their profile is live. The new ' + kind + ' shows on their card right away. Go ahead?')) { input.value = ''; return; }
    say(m, 'Uploading the ' + kind + '…');
    var path = row.id + '/' + kind + '-' + Date.now() + '.' + ext, old = row[kind + '_path'];
    var u = await c.storage.from(BUCKET).upload(path, f, { contentType: f.type || types[ext] });
    if (u.error) { say(m, 'The ' + kind + ' did not upload: ' + u.error.message, true); input.value = ''; return; }
    var patch = { updated_at: new Date().toISOString() }; patch[kind + '_path'] = path;
    var r = await c.from('caregiver_profiles').update(patch).eq('id', row.id);
    if (r.error) { say(m, 'Uploaded, but the profile did not update: ' + r.error.message, true); return; }
    if (old && String(old).indexOf(row.id + '/') === 0) { try { await c.storage.from(BUCKET).remove([old]); } catch (e) { /* the old file stays; harmless */ } }
    m.msg = [kind === 'photo' ? 'Photo saved.' : 'Video saved.', false];
    await reload(k);
  }

  /* =============================================================================
     2c · PROFILE BEFORE THE FIRST SHIFT (2026-10-01)
     Samantha: "must have profile before can start work. The video is encouraged, the photo is required."
     NEW HIRES ONLY (the rule and the "new hire" line live in eligibility-rules.js: CCElig.profileGate). This part only
     looks the profiles up, ONE query for everybody, with the SAME order find() uses for an employee: their AxisCare id
     first, then the candidate id the Hub carried over when they were promoted. A name match is only a suggestion the
     office confirms in the panel ("Yes, link it"), so it never counts as having a profile here.
     The answer is handed to the rule as profile_published on a COPY of the caregiver record. It is never saved on the
     record, so the server sweep and the obligations runner (which never fill it) see "unknown", and unknown never blocks.
       CGP2.gateLoad(roster, force)   load (cached 3 minutes); roster = the Hub's app_data caregivers. Each finished
                                      load fires window 'cgp-gate-changed' so the lists redraw.
       CGP2.gateFor(g)                the rule's answer for one Hub caregiver record
       CGP2.gateForAx(axid, name)     the same, found by AxisCare id (then a unique exact name) in the last roster
       CGP2.gateHtml(g, pg)           "Profile needed before first shift" + the button to open their profile ('' if not)
       CGP2.gateOverride(list, what)  a deliberate go-ahead with a typed reason, saved with who and when
     ============================================================================= */
  var G = { at: 0, err: '', rows: null, wc: null, roster: [], busy: null };
  var GCTX = {}, gseq = 0;
  function rulesReady() {
    if (root.CCElig && root.CCElig.profileGate) return Promise.resolve(true);
    return new Promise(function (res) {
      var t = document.getElementById('cceligrules');
      if (!t) {
        /* same id as the engine's loader, so it is never loaded twice; ordered, so the engine still runs after it */
        t = document.createElement('script'); t.id = 'cceligrules'; t.src = 'eligibility-rules.js?v=' + Date.now(); t.async = false;
        document.head.appendChild(t);
      }
      var n = 0, iv = setInterval(function () {
        if (root.CCElig && root.CCElig.profileGate) { clearInterval(iv); res(true); }
        else if (++n > 100) { clearInterval(iv); res(false); }
      }, 100);
    });
  }
  function pick(rows, axId, candId) {
    var a = axId ? rows.find(function (r) { return String(r.axiscare_id || '') === String(axId); }) : null;
    if (a) return a;
    return (candId != null && candId !== '') ? (rows.find(function (r) { return String(r.candidate_id || '') === String(candId); }) || null) : null;
  }
  async function gateLoad(roster, force) {
    if (Array.isArray(roster)) G.roster = roster;
    if (!force && G.at && !G.err && Date.now() - G.at < 3 * 60000) return G;
    if (G.busy) return G.busy;
    G.busy = (async function () {
      try {
        var c = client(); if (!c) throw new Error('not signed in');
        if (!(await rulesReady())) throw new Error('the eligibility rules did not load');
        var r = await c.from('caregiver_profiles').select('id,candidate_id,axiscare_id,published,status,updated_at').neq('status', 'withdrawn').order('updated_at', { ascending: false });
        if (r.error) throw r.error;
        var w = await c.from('welcome_calls').select('candidate_id,status');
        if (w.error) throw w.error;
        var wc = {}; (w.data || []).forEach(function (x) { if (x.candidate_id != null && x.status !== 'cancelled') wc[String(x.candidate_id)] = true; });
        G.rows = r.data || []; G.wc = wc; G.err = '';
      } catch (e) { G.err = (e && e.message) || 'error'; console.warn('caregiver profile check failed:', e); }
      G.at = Date.now(); G.busy = null;
      /* every list showing the gate redraws on this (the Training tab, coverage, Team Builder, the first-shift checklist) */
      try { root.dispatchEvent(new CustomEvent('cgp-gate-changed')); } catch (e) { /* a redraw is a nicety */ }
      return G;
    })();
    return G.busy;
  }
  function gateFor(g) {
    var E = root.CCElig;
    if (!g || !E || !E.profileGate) return { new_hire: false, checked: false, published: false, blocked: false, why: '', err: G.err || (g ? 'the eligibility rules have not loaded' : '') };
    var row = G.rows ? pick(G.rows, g.axiscare_id, g.candidate_id) : null;
    var rec = Object.assign({}, g, {
      profile_published: G.rows ? isLive(row) : undefined,
      has_welcome_call: G.wc ? !!(g.candidate_id != null && G.wc[String(g.candidate_id)]) : undefined });
    var pg = E.profileGate(rec);
    pg.row = row; pg.err = G.err; pg.loaded = !!G.rows;
    return pg;
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z]/g, ''); }
  function rosterFind(axid, name) {
    var r = G.roster || [];
    var g = axid ? r.find(function (x) { return x && String(x.axiscare_id || '') === String(axid); }) : null;
    if (g || !name) return g || null;
    var n = norm(name), hits = r.filter(function (x) { return x && norm((x.first || '') + (x.last || '')) === n; });
    return hits.length === 1 ? hits[0] : null;            // a shared name is never guessed
  }
  function gateForAx(axid, name) { var g = rosterFind(axid, name); return g ? Object.assign(gateFor(g), { g: g }) : null; }
  function gateCtx(g) {
    var ax = g.axiscare_id ? String(g.axiscare_id) : '', cand = g.candidate_id != null ? String(g.candidate_id) : '';
    var base = { first: g.first || '', last: g.last || '', phone: g.phone || g.mobile || '', email: g.email || '',
      onChange: function () { gateLoad(null, true); } };
    /* AxisCare id known: the employee view (it can also link a name match). Not yet in AxisCare: their onboarding profile. */
    return ax ? Object.assign(base, { mode: 'employee', axiscare_id: ax, legacy_candidate_id: cand })
              : Object.assign(base, { mode: 'onboarding', candidate_id: cand });
  }
  function gateOpen(k) { var ctx = GCTX[k]; if (!ctx) { alert('Refresh the page and try again.'); return; } open(ctx); }
  function gateHtml(g, pg) {
    pg = pg || gateFor(g);
    if (!g) return '';
    var k = 'g' + (++gseq); GCTX[k] = gateCtx(g);
    var b = '<button class="ibtn" style="font-size:.7rem;padding:.15rem .5rem" onclick="event.stopPropagation();CGP2.gateOpen(\'' + k + '\')">🪪 Open their profile</button>';
    if (pg.blocked) return '<span style="display:inline-flex;align-items:center;gap:.35rem;flex-wrap:wrap"><span class="badge" title="' + esc(pg.why) + '" style="background:#FEE2E2;color:#991B1B;font-size:.68rem;font-weight:700;border-radius:999px;padding:.12rem .55rem;white-space:nowrap">🪪 Profile needed before first shift</span>' + b + '</span>';
    if (pg.new_hire && !pg.checked && pg.err) return '<span style="display:inline-flex;align-items:center;gap:.35rem;flex-wrap:wrap"><span class="badge" style="background:#FEF3C7;color:#92400E;font-size:.68rem;font-weight:700;border-radius:999px;padding:.12rem .55rem">Could not check their caregiver profile: ' + esc(pg.err) + '</span>' + b + '</span>';
    return '';
  }
  /* NOT A SILENT BYPASS: going ahead for a new hire with no published profile (emergency coverage, say) takes a typed
     reason, and the reason, who and when are saved to the office event log. Cancel stops the action. */
  async function gateOverride(list, what) {
    list = (list || []).filter(Boolean); if (!list.length) return true;
    var names = list.map(function (x) { return x.name; }).join(', ');
    var why = prompt(names + (list.length === 1 ? ' is a new hire whose caregiver profile is not published yet.' : ' are new hires whose caregiver profiles are not published yet.')
      + ' New hires need a published profile, with their photo, before their first shift.\n\n'
      + 'To ' + what + ' anyway (for example, emergency coverage), type the reason. It is saved with your name and the time.\n\n'
      + 'Press Cancel to stop and publish the profile first.');
    if (why === null) return false;
    why = String(why).trim();
    if (!why) { alert('A reason is needed to go ahead. Nothing was done.'); return false; }
    var c = client(), email = '';
    try { var s = await c.auth.getSession(); email = (s && s.data && s.data.session && s.data.session.user && s.data.session.user.email) || ''; } catch (e) { /* recorded without the email */ }
    var at = new Date().toISOString();
    var r = null;
    try {
      r = await c.from('op_events').insert({ actor_email: email, actor_name: email.split('@')[0], verb: 'profile_gate_override',
        item_id: list.map(function (x) { return x.axiscare_id || x.id || x.name; }).join(','), area: 'caregiver_profile',
        summary: (email.split('@')[0] || 'Someone') + ' went ahead (' + what + ') for ' + names + ' without a published profile. Reason: ' + why,
        data: { action: what, reason: why, at: at, by: email, caregivers: list.map(function (x) { return { name: x.name, axiscare_id: x.axiscare_id || null, hub_id: x.id || null }; }) } });
    } catch (e) { r = { error: e }; }
    if (r && r.error) return confirm('Your reason could not be saved (' + ((r.error && r.error.message) || r.error) + ').\n\nGo ahead anyway? If you do, tell Samantha the reason.');
    return true;
  }

  /* The pop-over, for lists (welcome calls, the Ready for Orientation queue, the Background tab). */
  function open(ctx) {
    var old = document.getElementById('cgp2-pop'); if (old) old.remove();
    var w = document.createElement('div'); w.id = 'cgp2-pop';
    w.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:4vh 12px';
    w.innerHTML = '<div style="background:#fff;border-radius:14px;max-width:760px;width:100%;padding:1rem 1.1rem;box-shadow:0 12px 40px rgba(0,0,0,.25);position:relative">'
      + '<button class="ibtn" style="position:absolute;top:.6rem;right:.6rem" onclick="CGP2.close()">✕ Close</button>'
      + '<div style="font-size:.78rem;color:#64748B;margin-bottom:.35rem;padding-right:5rem">' + esc([ctx.first, ctx.last].filter(Boolean).join(' ')) + '</div>'
      + '<div id="cgp2-pop-host"></div></div>';
    w.addEventListener('click', function (e) { if (e.target === w) close(); });
    document.body.appendChild(w);
    document.addEventListener('keydown', escClose);
    return mount(document.getElementById('cgp2-pop-host'), ctx);
  }
  function escClose(e) { if (e.key === 'Escape') close(); }
  function close() {
    var w = document.getElementById('cgp2-pop'); if (w) w.remove();
    document.removeEventListener('keydown', escClose);
  }

  root.CGP2 = { mount: mount, open: open, close: close, act: act, link: link, upload: upload, reload: reload,
    chipHtml: chipHtml, status: status, rowFor: rowFor, loadForCandidates: loadForCandidates, prompts: prompts, noDash: noDash,
    introPick: introPick, introReason: introReason, cardName: cardName, photoOf: photoOf,
    cacheState: cacheState, isLive: isLive,
    gateReady: function () { return !!G.rows; }, gateLoad: gateLoad, gateFor: gateFor, gateForAx: gateForAx, gateHtml: gateHtml, gateOpen: gateOpen, gateOverride: gateOverride };
})(typeof window !== 'undefined' ? window : globalThis);
