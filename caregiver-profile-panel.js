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
  var COLS = 'id,candidate_id,axiscare_id,applicant_id,first_name,last_name,preferred_name,about,experience,why_this_work,years_experience,photo_path,video_path,consent,consent_at,published,status,drafted_at,drafted_by,link_sent_at,link_sent_by,submitted_at,published_at,published_by,updated_at,created_at';
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
  function cardUrl(row) { return 'https://cc.mo-care.com/caregiver.html?id=' + encodeURIComponent(row.id); }
  function prompts(row) {
    var out = [];
    FIELDS.forEach(function (f) { String((row && row[f[0]]) || '').replace(/\[([^\]]*)\]/g, function (_, q) { out.push([f[1], q.replace(/^\s*ask:\s*/i, '')]); return _; }); });
    return out;
  }

  function status(row) {
    if (!row) return ['Not started', '#F3F4F6', '#4B5563'];
    if (row.status === 'withdrawn') return ['Withdrawn', '#FEE2E2', '#991B1B'];
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
  async function loadForCandidates(ids) {
    var c = client(); if (!c) return;
    ids = Array.from(new Set((ids || []).map(String).filter(Boolean)));
    if (!ids.length) return;
    try {
      var r = await c.from('caregiver_profiles').select(COLS).in('candidate_id', ids).neq('status', 'withdrawn');
      if (r.error) throw r.error;
      ids.forEach(function (id) { if (!(r.data || []).some(function (x) { return String(x.candidate_id) === id; })) delete BY_CAND[id]; });
      (r.data || []).forEach(function (x) { BY_CAND[String(x.candidate_id)] = x; });
    } catch (e) { console.warn('caregiver profiles load failed:', e); }
  }

  /* The function: office actions carry the staff member's own sign-in. */
  async function call(body) {
    var c = client(); if (!c) throw new Error('Sign in first.');
    var s = await c.auth.getSession(); var session = s && s.data && s.data.session;
    if (!session) throw new Error('Sign in again, then try once more.');
    var r = await fetch(SB_URL + '/functions/v1/caregiver-profile', { method: 'POST',
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
      + (row.photo_path ? '<a href="' + esc(publicUrl(row.photo_path)) + '" target="_blank" rel="noopener"><img src="' + esc(publicUrl(row.photo_path)) + '" alt="" style="width:96px;height:96px;object-fit:cover;border-radius:12px;border:1px solid var(--border,#E2E8F0)"></a>'
        : '<div style="width:96px;height:96px;border-radius:12px;border:1.5px dashed #CBD5E1;display:flex;align-items:center;justify-content:center;font-size:.7rem;color:#64748B;padding:.3rem">No photo yet (required)</div>')
      + (row.video_path ? '<a href="' + esc(publicUrl(row.video_path)) + '" target="_blank" rel="noopener" style="display:block;font-size:.72rem;margin-top:.25rem">▶ Their video</a>' : '<div style="font-size:.68rem;color:#94A3B8;margin-top:.25rem">No video (optional)</div>')
      + '<label class="ibtn" style="display:block;margin-top:.35rem;cursor:pointer;font-size:.68rem">Replace photo<input type="file" accept="image/*" style="display:none" onchange="CGP2.upload(\'' + k + '\',\'photo\',this)"></label>'
      + '<label class="ibtn" style="display:block;margin-top:.25rem;cursor:pointer;font-size:.68rem">' + (row.video_path ? 'Replace video' : 'Add a video') + '<input type="file" accept="video/*" style="display:none" onchange="CGP2.upload(\'' + k + '\',\'video\',this)"></label>'
      + '</div><div style="flex:1;min-width:240px">';
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
      + (row.published ? '' : btn('send', row.link_sent_at ? '📲 Send photo link again' : '📲 Send photo link', '', 'Texts and emails their personal link to add a photo and video'))
      + (row.published ? btn('unpublish', 'Unpublish', 'color:#B00020;border-color:#FCA5A5') : btn('publish', '✓ Publish', 'background:#15803D;color:#fff;border-color:#15803D', 'Needs a photo, their permission, and no [ask] prompts left'))
      + '</div><div id="' + k + '-msg" style="font-size:.8rem;margin-top:.45rem;white-space:pre-wrap"></div>'
      + '<div style="font-size:.7rem;color:#64748B;margin-top:.45rem;line-height:1.5">'
      + [row.drafted_at ? 'Drafted ' + day(row.drafted_at) + (row.drafted_by ? ' by ' + esc(who(row.drafted_by)) : '') : '',
         row.link_sent_at ? 'Link sent ' + day(row.link_sent_at) + (row.link_sent_by ? ' by ' + esc(who(row.link_sent_by)) : '') : '',
         row.submitted_at ? 'They saved it ' + day(row.submitted_at) : '',
         row.consent ? 'Permission given ' + day(row.consent_at) : 'No permission yet (they tick it on their page)',
         row.published ? 'Published ' + day(row.published_at) + (row.published_by ? ' by ' + esc(who(row.published_by)) : '') + '. Edits you save go live right away.' : ''].filter(Boolean).join(' · ')
      + '</div></div></div>';
    m.host.innerHTML = h;
    if (m.msg) say(m, m.msg[0], m.msg[1]);
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
          var miss = FIELDS.filter(function (f) { return !patch[f[0]] || /\[/.test(patch[f[0]]); });
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
    chipHtml: chipHtml, status: status, rowFor: rowFor, loadForCandidates: loadForCandidates, prompts: prompts, noDash: noDash };
})(typeof window !== 'undefined' ? window : globalThis);
