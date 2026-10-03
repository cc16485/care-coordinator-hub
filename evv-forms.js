/* =============================================================================
   EVV CORRECTION FORMS: the completed, signed form (422, 2026-10-03)
   =============================================================================
   Samantha: "the EVV form does not save the completed form, it has a text only completion. We need the real form that
   was completed and signed by caregiver and client to be saved and able to be viewed by office staff... also would be
   nice if it is saved in the client and caregivers profiles as well".

   The signed form already lives in the shared database (table evv_submissions, both signatures as PNG images). This
   file is the shared part every screen uses:
     EVVF.formUrl(id)                     the staff-only page that shows the form exactly as it was filled in
     EVVF.suggest(name, people)           the closest people to a typed name. ONLY a suggestion: nothing is linked
                                          until the office presses Confirm in the picker.
     EVVF.pickerModel(sub, cgs, clients)  what the two pickers show (suggestion preselected, the office can change it)
     EVVF.linkSave(client, sub, choice, meta)   the one write: who the form is for (+ accepted / dismissed)
     EVVF.logMatch(entry, subs)           which form a corrections-log entry came from (its submission_id, else one
                                          exact match on caregiver + client + visit date + corrected times, else none)
     EVVF.statusOf(sub, log)              Waiting / Accepted and logged / Dismissed / Processed
     EVVF.loadFor(client, 'caregiver'|'client', id)   the forms linked to a caregiver or a client (for the profiles)
     EVVF.sectionHtml(state)              the "EVV correction forms" list on a profile
   Plain file, no build; works in the browser (window.EVVF) and in node tests (globalThis.EVVF).
   ============================================================================= */
(function (root) {
  'use strict';

  /* The form's own wording (sc.mo-care.com/evv-correction-form, Staffing repo evv-correction-form.html). The stored
     value is what the caregiver's box carried; the label is what they read. Kept identical: a test compares them. */
  var TASKS = [
    'Dietary — Meal preparation, cleanup, and/or eating assistance',
    'Dressing/Grooming — Dressing, undressing, hair, nails, oral hygiene, shaving',
    'Bathing — Bathing and/or shampooing hair',
    'Toileting/Continence — Bathroom assistance and/or changing bed linens',
    'Mobility/Transfer — Transfer and ambulation assistance',
    'Self-Administration of Medications — Assistance with medications or topical ointments',
    'Medically Related Household Tasks — Homemaker/household services',
  ];
  var REASONS = [
    ['Phone was dead / no battery', 'Phone was dead or had no battery at clock-in or clock-out'],
    ['App crashed or technical error', 'AxisCare app crashed or had a technical error (screenshot is helpful)'],
    ['No cell service at client location', 'No cell service at the client\'s location'],
    ['Forgot to clock in or out', 'I forgot to clock in or out (this should be rare — not a recurring reason)'],
    ['AxisCare app update caused disruption', 'A AxisCare app update caused a disruption'],
    ['Client home phone unavailable', 'Client\'s home phone was not available for landline EVV'],
    ['Other', 'Other (explain below)'],
  ];

  var LIST_COLS = 'id,attendant,consumer,visitdate,submitdate,orig_in,orig_out,new_in,new_out,reason,processed,processed_by,processed_at,submitted_at';
  var LINK_COLS = 'outcome,caregiver_axiscare_id,client_axiscare_id,caregiver_linked_name,client_linked_name,linked_by,linked_at,axiscare_visit_id,axiscare_checked_at,axiscare_seen,axiscare_done_at,tasks';
  var NONE = '__none';
  /* 427: a form sent from a pre-filled link (the "Text <caregiver> the EVV form" button, or the clock-out reminder)
     arrives already linked to the caregiver, the client and the AxisCare visit, taken from the visit itself (never
     from what the caregiver typed). linked_by carries this marker. */
  var VISIT_MARK = 'axiscare-visit';
  var VISIT_WORDS = 'From the visit (AxisCare)';
  function fromVisit(sub) { return !!(sub && sub.linked_by === VISIT_MARK && (sub.caregiver_axiscare_id || sub.client_axiscare_id)); }

  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function tokens(s) { return String(s || '').toLowerCase().replace(/[^a-z]+/g, ' ').trim().split(' ').filter(Boolean); }
  function flat(s) { return tokens(s).join(''); }

  /* 0 to 100. Only used to ORDER and SUGGEST; never to link on its own. */
  function nameScore(a, b) {
    var A = tokens(a), B = tokens(b);
    if (!A.length || !B.length) return 0;
    if (A.join('') === B.join('')) return 100;
    if (A.slice().sort().join(' ') === B.slice().sort().join(' ')) return 95;
    var af = A[0], al = A[A.length - 1], bf = B[0], bl = B[B.length - 1];
    if (A.length > 1 && B.length > 1) {
      if (al === bl) {
        if (af === bf) return 90;                                                 /* a middle name differs */
        if (af.charAt(0) === bf.charAt(0) && (af.indexOf(bf) === 0 || bf.indexOf(af) === 0)) return 80;   /* Kim / Kimberly */
        if (af.charAt(0) === bf.charAt(0)) return 60;
        return 45;
      }
      if (af === bf && (al.indexOf(bl) === 0 || bl.indexOf(al) === 0)) return 75;  /* Sarah T / Sarah Thomas */
      if (af === bf) return 30;
      return 0;
    }
    var one = A.length === 1 ? A[0] : B[0], other = A.length === 1 ? B : A;
    return (one === other[0] || one === other[other.length - 1]) ? 40 : 0;
  }

  /* people = [{ id, name, active }]. best is set only when one person is clearly closest (score 75+, no tie). */
  function suggest(formName, people) {
    var ranked = (people || []).map(function (p) { return { p: p, score: nameScore(formName, p.name) }; })
      .filter(function (x) { return x.score >= 30; })
      .sort(function (x, y) { return (y.score - x.score) || ((y.p.active ? 1 : 0) - (x.p.active ? 1 : 0)) || String(x.p.name).localeCompare(String(y.p.name)); });
    var top = ranked[0], next = ranked[1];
    var clear = !!(top && top.score >= 75 && (!next || next.score < top.score));
    return { best: clear ? top.p : null, score: top ? top.score : 0, ambiguous: !!(top && top.score >= 75 && !clear), ranked: ranked.slice(0, 6) };
  }

  function side(formName, people, linkedId, linkedName, visit) {
    var s = suggest(formName, people);
    var list = (people || []).slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    var known = linkedId && list.some(function (p) { return String(p.id) === String(linkedId); });
    if (linkedId && !known) list.unshift({ id: String(linkedId), name: (linkedName || 'Linked person') + ' (#' + linkedId + ')', active: false });
    return {
      formName: formName || '', people: list, ranked: s.ranked, suggestion: s.best, ambiguous: s.ambiguous,
      selected: linkedId ? String(linkedId) : (s.best ? String(s.best.id) : ''),
      already: !!linkedId, fromVisit: !!(visit && linkedId),
    };
  }
  /* What the two pickers start with. Nothing here writes anything. */
  function pickerModel(sub, caregivers, clients) {
    sub = sub || {};
    var v = fromVisit(sub);
    return { fromVisit: v,
             cg: side(sub.attendant, caregivers, sub.caregiver_axiscare_id, sub.caregiver_linked_name, v),
             cl: side(sub.consumer, clients, sub.client_axiscare_id, sub.client_linked_name, v) };
  }
  function selectHtml(id, m, loadErr) {
    var opt = function (p, sel) { return '<option value="' + esc(p.id) + '"' + (String(p.id) === sel ? ' selected' : '') + '>' + esc(p.name) + (p.active === false ? ' (not active)' : '') + '</option>'; };
    var h = '<select id="' + esc(id) + '" style="width:100%;padding:8px 10px;border:1.5px solid #E8E2D8;border-radius:9px;font:inherit;font-size:14px;">'
      + '<option value=""' + (m.selected ? '' : ' selected') + '>Choose…</option>';
    if (m.ranked.length) h += '<optgroup label="Closest to the name on the form">' + m.ranked.map(function (x) { return opt(x.p, m.selected); }).join('') + '</optgroup>';
    var rest = m.people.filter(function (p) { return !m.ranked.some(function (x) { return String(x.p.id) === String(p.id); }); });
    if (rest.length) h += '<optgroup label="' + (m.ranked.length ? 'Everyone else' : 'Everyone') + '">' + rest.map(function (p) { return opt(p, m.selected); }).join('') + '</optgroup>';
    h += '<option value="' + NONE + '">Not on this list (leave unlinked for now)</option></select>';
    var note = loadErr ? '<div style="color:#B3261E;font-size:12.5px;margin-top:4px;">The list could not load: ' + esc(loadErr) + '. You can leave it unlinked and link it later from Past forms.</div>'
      : m.fromVisit ? '<div style="font-size:12.5px;color:#15803D;margin-top:4px;">' + esc(VISIT_WORDS) + ': the form was filled in for this visit, so nothing was guessed.</div>'
      : m.already ? '<div style="font-size:12.5px;color:#6E6559;margin-top:4px;">Already linked. Change it if it is wrong.</div>'
      : m.suggestion ? '<div style="font-size:12.5px;color:#92400E;margin-top:4px;">Suggested from the name on the form ("' + esc(m.formName) + '"). Check it is the right person before you confirm.</div>'
      : m.ambiguous ? '<div style="font-size:12.5px;color:#92400E;margin-top:4px;">More than one person is close to "' + esc(m.formName) + '". Pick the right one.</div>'
      : '<div style="font-size:12.5px;color:#92400E;margin-top:4px;">Nobody matches "' + esc(m.formName) + '" closely. Pick the right person, or leave it unlinked.</div>';
    return h + note;
  }

  /* The ONE write. choice = { cg: id|'__none'|'', cgName, cl: id|'__none'|'', clName }; meta = { by, accept, dismiss }.
     Returns { ok, error, fellBack }. fellBack: the database does not have the new columns yet (Desktop 422 not run),
     so only accepted/dismissed was saved, and the caller must say so. */
  function isMissingCol(e) { var m = String((e && (e.message || e.details || e.hint)) || '') + ' ' + String((e && e.code) || ''); return /PGRST204|42703|column .* does not exist|Could not find the '.*' column/i.test(m); }
  async function linkSave(client, sub, choice, meta) {
    meta = meta || {}; choice = choice || {};
    if (!client) return { ok: false, error: 'Not signed in. Sign in to the Hub, then try again.' };
    if (!sub || !sub.id) return { ok: false, error: 'This form could not be found. Refresh and try again.' };
    var now = new Date().toISOString();
    var cg = choice.cg && choice.cg !== NONE ? String(choice.cg) : null, cl = choice.cl && choice.cl !== NONE ? String(choice.cl) : null;
    var base = {};
    if (meta.accept || meta.dismiss) { base.processed = true; base.processed_by = meta.by || 'office'; base.processed_at = now; }
    /* 427: a form linked from its visit, confirmed as it is, keeps that link (and its "From the visit" mark) */
    var keepVisit = fromVisit(sub) && String(cg || '') === String(sub.caregiver_axiscare_id || '') && String(cl || '') === String(sub.client_axiscare_id || '');
    var patch = keepVisit ? Object.assign({}, base) : Object.assign({}, base, {
      caregiver_axiscare_id: cg, caregiver_linked_name: cg ? (choice.cgName || null) : null,
      client_axiscare_id: cl, client_linked_name: cl ? (choice.clName || null) : null,
      linked_by: (cg || cl) ? (meta.by || 'office') : null, linked_at: (cg || cl) ? now : null,
    });
    if (keepVisit && !meta.accept && !meta.dismiss) return { ok: true, unchanged: true };
    if (meta.accept) patch.outcome = 'accepted';
    if (meta.dismiss) { patch = Object.assign({}, base, { outcome: 'dismissed' }); }
    try {
      var r = await client.from('evv_submissions').update(patch).eq('id', sub.id).select('id');
      if (r && r.error && isMissingCol(r.error) && (meta.accept || meta.dismiss)) {
        var r2 = await client.from('evv_submissions').update(base).eq('id', sub.id).select('id');
        if (r2 && r2.error) return { ok: false, error: r2.error.message || String(r2.error) };
        if (!r2 || !r2.data || !r2.data.length) return { ok: false, error: 'Nothing was saved: the form was not found, or your account cannot change it.' };
        return { ok: true, fellBack: true };
      }
      if (r && r.error) return { ok: false, error: isMissingCol(r.error) ? 'The database does not have the linking columns yet (run Desktop 422 first).' : (r.error.message || String(r.error)) };
      if (!r || !r.data || !r.data.length) return { ok: false, error: 'Nothing was saved: the form was not found, or your account cannot change it.' };
      return { ok: true, patch: patch };
    } catch (e) { return { ok: false, error: (e && e.message) || String(e) }; }
  }

  /* ── the corrections log ↔ the forms ── */
  function hm(t) { var m = String(t || '').match(/^(\d{1,2}):(\d{2})/); return m ? (('0' + m[1]).slice(-2) + ':' + m[2]) : ''; }
  function sameVisit(e, s) {
    return flat(e.attendant) === flat(s.attendant) && flat(e.consumer) === flat(s.consumer)
      && String(e.visitdate || '') === String(s.visitdate || '') && hm(e.newIn) === hm(s.new_in) && hm(e.newOut) === hm(s.new_out)
      && !!flat(e.attendant) && !!e.visitdate;
  }
  /* entry -> its form, or null. Older entries (before submission_id) match only when exactly one form fits. */
  function logMatch(entry, subs) {
    if (!entry) return null;
    subs = subs || [];
    if (entry.submission_id) return subs.find(function (s) { return String(s.id) === String(entry.submission_id); }) || { id: String(entry.submission_id), _notLoaded: true };
    var hits = subs.filter(function (s) { return sameVisit(entry, s); });
    return hits.length === 1 ? hits[0] : null;
  }
  /* form -> its log entry, or null (used to tell an older accepted form from an older dismissed one) */
  function logFor(sub, log) {
    log = log || [];
    var byId = log.find(function (e) { return e && e.submission_id && String(e.submission_id) === String(sub.id); });
    if (byId) return byId;
    var hits = log.filter(function (e) { return e && !e.submission_id && sameVisit(e, sub); });
    return hits.length === 1 ? hits[0] : null;
  }
  function statusOf(sub, log) {
    if (!sub) return { key: 'unknown', label: '' };
    if (!sub.processed) return { key: 'waiting', label: 'Waiting for the office' };
    if (sub.outcome === 'accepted') return { key: 'accepted', label: 'Accepted and logged' };
    if (sub.outcome === 'dismissed') return { key: 'dismissed', label: 'Dismissed' };
    if (log && logFor(sub, log)) return { key: 'accepted', label: 'Accepted and logged' };
    return { key: 'processed', label: log ? 'Processed (not in the corrections log, so most likely dismissed)' : 'Processed' };
  }
  var CHIP = { waiting: ['#FEF3C7', '#92400E'], accepted: ['#DCFCE7', '#15803D'], dismissed: ['#F3F4F6', '#4B5563'], processed: ['#E0F2FE', '#075985'], unknown: ['#F3F4F6', '#4B5563'] };
  function chipHtml(st) { var c = CHIP[st.key] || CHIP.unknown; return '<span style="font-size:11.5px;font-weight:700;border-radius:999px;padding:2px 9px;background:' + c[0] + ';color:' + c[1] + ';white-space:nowrap;">' + esc(st.label) + '</span>'; }

  /* the green "From the visit (AxisCare)" chip, for a form sent from a pre-filled link */
  function visitChipHtml(sub) {
    if (!fromVisit(sub)) return '';
    return '<span title="Sent from the pre-filled link for this visit: the caregiver, client and AxisCare visit came from the visit" style="font-size:11.5px;font-weight:700;border-radius:999px;padding:2px 9px;background:#DCFCE7;color:#15803D;white-space:nowrap;">' + esc(VISIT_WORDS) + '</span>';
  }
  /* "linked: ..." under a past form */
  function linkedWords(sub) {
    if (!sub || !(sub.caregiver_axiscare_id || sub.client_axiscare_id)) return '';
    return (fromVisit(sub) ? VISIT_WORDS.toLowerCase().replace('axiscare', 'AxisCare') + ': ' : 'linked: ')
      + (sub.caregiver_linked_name || (sub.caregiver_axiscare_id ? 'caregiver #' + sub.caregiver_axiscare_id : 'no caregiver')) + ' · '
      + (sub.client_linked_name || (sub.client_axiscare_id ? 'client #' + sub.client_axiscare_id : 'no client'));
  }
  function formUrl(id) { return 'evv-form.html?id=' + encodeURIComponent(String(id || '')); }
  function viewBtnHtml(id, cls) {
    return '<a class="' + (cls || 'cara-btn ghost') + '" style="font-size:12px;text-decoration:none;white-space:nowrap;" href="' + esc(formUrl(id)) + '" target="_blank" rel="noopener" title="The completed form with both signatures">📄 View form</a>';
  }
  function time12(t) {
    var m = String(t || '').match(/^(\d{1,2}):(\d{2})/); if (!m) return String(t || '');
    var h = +m[1], ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + m[2] + ' ' + ap;
  }
  function span(a, b) { var x = [a, b].filter(Boolean).map(time12); return x.length ? x.join(' to ') : ''; }
  function dateWord(d) { if (!d) return ''; var x = new Date(String(d).slice(0, 10) + 'T12:00:00'); return isNaN(x) ? String(d) : x.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); }
  function whenWord(iso) { if (!iso) return ''; try { return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return String(iso); } }

  /* the forms linked to one caregiver or one client */
  async function loadFor(client, kind, id) {
    if (!client) return { error: 'not signed in' };
    if (!id) return { rows: [] };
    var col = kind === 'client' ? 'client_axiscare_id' : 'caregiver_axiscare_id';
    try {
      var r = await client.from('evv_submissions').select(LIST_COLS + ',' + LINK_COLS).eq(col, String(id)).order('visitdate', { ascending: false });
      if (r.error) return { error: isMissingCol(r.error) ? 'the database is not ready for this yet (Desktop 422)' : (r.error.message || String(r.error)) };
      return { rows: r.data || [] };
    } catch (e) { return { error: (e && e.message) || String(e) }; }
  }
  /* state = { rows, error, kind: 'caregiver'|'client' } */
  function sectionHtml(state) {
    state = state || {};
    var head = '<div style="font-weight:800;color:var(--navy,#0E3860);font-size:14px;margin-bottom:6px;">EVV correction forms'
      + ' <span style="font-weight:400;font-size:12.5px;color:#6E6559;">(the signed forms, linked by the office when they log them)</span></div>';
    var body;
    if (state.loading) body = '<div class="field-note">Loading the forms…</div>';
    else if (state.error) body = '<div style="color:#B3261E;font-size:13px;">Could not load the EVV correction forms: ' + esc(state.error) + '. Refresh to try again.</div>';
    else if (!(state.rows || []).length) body = '<div class="field-note">No EVV correction forms are linked to this ' + (state.kind === 'client' ? 'client' : 'caregiver') + ' yet. Forms are linked when the office logs them (EVV Corrections, or Link in Past forms).</div>';
    else body = state.rows.map(function (s) {
      var other = state.kind === 'client' ? (s.caregiver_linked_name || s.attendant) : (s.client_linked_name || s.consumer);
      return '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;padding:7px 0;border-top:1px solid #F3EFE7;font-size:13.5px;">'
        + '<b>' + esc(dateWord(s.visitdate)) + '</b>'
        + '<span class="field-note">' + (state.kind === 'client' ? 'caregiver ' : 'with ') + esc(other || '?') + '</span>'
        + '<span>corrected to <b>' + esc(span(s.new_in, s.new_out) || '?') + '</b></span>'
        + (s.reason ? '<span class="field-note">' + esc(String(s.reason).slice(0, 70)) + '</span>' : '')
        + chipHtml(statusOf(s)) + ' ' + axChipHtml(axStatus(s)) + (fromVisit(s) ? ' ' + visitChipHtml(s) : '')
        + '<span style="flex:1;"></span>' + viewBtnHtml(s.id) + '</div>';
    }).join('');
    return '<div class="card" style="padding:14px 16px;margin-top:10px;margin-bottom:12px;">' + head + body + '</div>';
  }

  /* filter for Past forms: q matches caregiver or client (typed or linked name); from/to on the visit date */
  function filterPast(rows, f) {
    f = f || {};
    var q = flat(f.q);
    return (rows || []).filter(function (s) {
      if (q && [s.attendant, s.consumer, s.caregiver_linked_name, s.client_linked_name].every(function (n) { return flat(n).indexOf(q) < 0; })) return false;
      if (f.from && String(s.visitdate || '') < f.from) return false;
      if (f.to && String(s.visitdate || '') > f.to) return false;
      return true;
    });
  }

  /* signatures come from a public form: only a real PNG/JPEG data image is ever drawn */
  function safeSig(v) { return /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=\s]+$/.test(String(v || '')) ? String(v) : ''; }

  /* ── AxisCare: a person corrects the visit there; the Hub helps and checks (read only) ──
     AxisCare's API cannot change a visit's actual clock-in / clock-out, so nothing here writes to AxisCare. The check
     is the evv-axiscare-check function (signed-in office staff only, GET only against AxisCare). */
  var AX_SITE = '16485';
  var AX_FN = 'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/evv-axiscare-check';
  var AX_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZ3NnZWRsc3hpbmJ5Z3dteHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NDIzNDQsImV4cCI6MjA5ODExODM0NH0.L_31_UKdccyRH9n7p1GaBlZTqcJipB008H-GIvxwLxM';
  var AX_COLS = 'axiscare_visit_id,axiscare_checked_at,axiscare_seen,axiscare_done_at';
  /* No AxisCare address opens one visit directly (none is known to work), so this opens the client's AxisCare page;
     the helper shows the visit number, date and times to find it there. */
  function axClientUrl(clientId) { return /^\d+$/.test(String(clientId || '')) ? 'https://' + AX_SITE + '.axiscare.com/?clients-profile.php&id=' + String(clientId) : ''; }
  async function axCall(client, body, fetchImpl) {
    var f = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    if (!client || !f) return { outcome: 'error', error: 'Not signed in. Sign in to the Hub, then try again.' };
    try {
      var s = await client.auth.getSession(); var session = s && s.data && s.data.session;
      if (!session) return { outcome: 'error', error: 'Your sign-in has expired. Sign in again, then check once more.' };
      var r = await f(AX_FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: AX_ANON, Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify(body) });
      var j = await r.json().catch(function () { return {}; });
      if (r.status === 404) return { outcome: 'error', error: 'The AxisCare check is not switched on yet (Desktop 422 installs it).' };
      if (!r.ok || j.error && !j.outcome) return { outcome: 'error', error: j.error || ('the check answered ' + r.status) };
      return j;
    } catch (e) { return { outcome: 'error', error: 'The AxisCare check could not be reached (' + ((e && e.message) || 'network') + ').' }; }
  }
  /* sub -> the AxisCare line for lists: only for accepted forms */
  function axStatus(sub) {
    if (!sub || !(sub.outcome === 'accepted' || (sub.processed && sub.outcome == null && sub._accepted))) return null;
    if (sub.axiscare_done_at) return { key: 'done', label: '✅ Done in AxisCare' };
    if (sub.axiscare_seen) return { key: 'mismatch', label: '⚠ AxisCare still shows ' + seenWords(sub.axiscare_seen) };
    return { key: 'waiting', label: 'Waiting for AxisCare' };
  }
  function seenWords(seen) { return String(seen || '').split('-').map(function (x) { return /^\d{1,2}:\d{2}$/.test(x) ? time12(x) : x; }).join(' to '); }
  var AXCHIP = { done: ['#DCFCE7', '#15803D'], mismatch: ['#FEE2E2', '#B91C1C'], waiting: ['#FEF3C7', '#92400E'] };
  function axChipHtml(st) { if (!st) return ''; var c = AXCHIP[st.key]; return '<span style="font-size:11.5px;font-weight:700;border-radius:999px;padding:2px 9px;background:' + c[0] + ';color:' + c[1] + ';white-space:nowrap;">' + esc(st.label) + '</span>'; }
  /* a check's answer -> the words the office reads */
  function axResultWords(r) {
    if (!r) return '';
    if (r.outcome === 'match') return '✅ Done in AxisCare: the visit shows ' + seenWords(r.seen) + ', the same as the form.' + (r.stamp_error ? ' ' + r.stamp_error : '');
    if (r.outcome === 'mismatch') return '⚠ AxisCare still shows ' + seenWords(r.seen) + '. The form says ' + span(r.want && r.want.in, r.want && r.want.out) + '.' + (r.stamp_error ? ' ' + r.stamp_error : '');
    if (r.outcome === 'several') return 'AxisCare has ' + (r.visits || []).length + ' visits for this client and caregiver that day. Pick the one this form is about.';
    if (r.outcome === 'none') return 'Not found: ' + (r.error || 'AxisCare has no matching visit that day.');
    if (r.outcome === 'not_linked') return r.error || 'Link the form to its client first.';
    return 'Could not check AxisCare: ' + (r.error || 'unknown error') + '.';
  }
  function copyRow(label, value) {
    return '<div style="display:flex;gap:8px;align-items:center;padding:3px 0;font-size:13px;"><span style="min-width:84px;color:#6E6559;font-weight:600;">' + esc(label) + '</span>'
      + '<span style="flex:1;min-width:0;word-break:break-word;">' + esc(value || '(blank)') + '</span>'
      + (value ? '<button type="button" class="evvf-copy" data-copy="' + esc(value) + '" onclick="EVVF.copy(this)" style="font:inherit;font-size:11.5px;font-weight:700;border:1.5px solid #E8E2D8;background:#fff;border-radius:7px;padding:2px 9px;cursor:pointer;">Copy</button>' : '')
      + '</div>';
  }
  function usDate(d) { var m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[2] + '/' + m[3] + '/' + m[1] : String(d || ''); }
  /* the helper: open AxisCare, copy the corrected times, check AxisCare. state = { busy, result }, pickFn / checkFn: global names */
  function axHelperHtml(sub, state, checkFn, pickFn) {
    state = state || {};
    var r = state.result, link = axClientUrl(sub.client_axiscare_id);
    var tasks = String(sub.tasks || '').split(/;\s*/).filter(Boolean).map(function (t) { return t.split(/\s+\u2014\s+/)[0]; }).join(', ');
    var visit = (r && r.visit) || (sub.axiscare_visit_id ? { id: sub.axiscare_visit_id } : null);
    var h = '<div class="evvf-ax" style="border:1.5px solid #CBD9EC;background:#F7FAFD;border-radius:11px;padding:10px 12px;margin-top:8px;">'
      + '<div style="font-weight:800;color:#0E3860;font-size:13.5px;margin-bottom:4px;">Correct it in AxisCare</div>'
      + '<div style="font-size:12.5px;color:#6E6559;margin-bottom:6px;">The Hub cannot change clock-in or clock-out in AxisCare (AxisCare does not allow it). Change the visit there by hand, then press Check AxisCare.</div>';
    if (!sub.client_axiscare_id) h += '<div style="font-size:13px;color:#92400E;">Link this form to its client first (Link, in Past forms), so the right AxisCare visit can be found.</div>';
    else {
      h += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:6px;">'
        + (link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener" style="font-size:12.5px;font-weight:700;color:#0F766E;">Open the client in AxisCare ↗</a>' : '')
        + '<button type="button" onclick="' + checkFn + '(\'' + esc(sub.id) + '\')"' + (state.busy ? ' disabled' : '') + ' style="font:inherit;font-size:12.5px;font-weight:700;border:none;background:#0E3860;color:#fff;border-radius:8px;padding:5px 12px;cursor:pointer;">' + (state.busy ? 'Checking AxisCare…' : 'Check AxisCare') + '</button>'
        + '</div>';
      if (visit) h += '<div style="font-size:12.5px;margin-bottom:4px;">Visit: <b>' + esc(dateWord(sub.visitdate)) + '</b>' + (visit.scheduled ? ', scheduled ' + esc(visit.scheduled) : '') + (visit.caregiver ? ', ' + esc(visit.caregiver) : '') + ' <span style="color:#6E6559;">(AxisCare visit ' + esc(visit.id) + (fromVisit(sub) && String(visit.id) === String(sub.axiscare_visit_id) ? ', from the pre-filled link' : '') + ')</span></div>';
      if (r) h += '<div style="font-size:13px;font-weight:600;margin:4px 0;color:' + (r.outcome === 'match' ? '#15803D' : r.outcome === 'mismatch' || r.outcome === 'error' ? '#B91C1C' : '#92400E') + ';">' + esc(axResultWords(r)) + '</div>';
      else if (sub.axiscare_done_at) h += '<div style="font-size:13px;font-weight:600;color:#15803D;margin:4px 0;">✅ Done in AxisCare (checked ' + esc(whenWord(sub.axiscare_checked_at || sub.axiscare_done_at)) + ')</div>';
      else if (sub.axiscare_seen) h += '<div style="font-size:13px;font-weight:600;color:#B91C1C;margin:4px 0;">⚠ AxisCare still shows ' + esc(seenWords(sub.axiscare_seen)) + ' (checked ' + esc(whenWord(sub.axiscare_checked_at)) + ')</div>';
      if (r && r.outcome === 'several') h += (r.visits || []).map(function (v) {
        return '<div style="display:flex;gap:8px;align-items:center;font-size:12.5px;padding:3px 0;"><span>' + esc(v.scheduled || '?') + (v.caregiver ? ' · ' + esc(v.caregiver) : '') + ' · clock-in ' + esc(v.clock_in ? time12(v.clock_in) : 'none') + ', clock-out ' + esc(v.clock_out ? time12(v.clock_out) : 'none') + '</span>'
          + '<button type="button" onclick="' + pickFn + '(\'' + esc(sub.id) + '\',\'' + esc(v.id) + '\')" style="font:inherit;font-size:11.5px;font-weight:700;border:1.5px solid #E8E2D8;background:#fff;border-radius:7px;padding:2px 9px;cursor:pointer;">This one</button></div>';
      }).join('');
    }
    h += '<div style="margin-top:6px;border-top:1px solid #E3EAF3;padding-top:5px;">'
      + copyRow('Date', usDate(sub.visitdate)) + copyRow('Clock-in', time12(sub.new_in)) + copyRow('Clock-out', time12(sub.new_out))
      + copyRow('Reason', sub.reason || '') + (tasks ? copyRow('Tasks', tasks) : '') + '</div>'
      + '<div class="evvf-copy-msg" style="font-size:12px;color:#B91C1C;"></div></div>';
    return h;
  }
  function copy(btn) {
    var v = btn && btn.getAttribute('data-copy');
    var box = btn && btn.closest ? btn.closest('.evvf-ax') : null, msg = box ? box.querySelector('.evvf-copy-msg') : null;
    var ok = function () { var t = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = t; }, 1400); if (msg) msg.textContent = ''; };
    var no = function () { if (msg) msg.textContent = 'Copy did not work in this browser. Select the words and copy them by hand.'; };
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(ok, no); else no(); } catch (e) { no(); }
  }

  root.EVVF = {
    AX_COLS: AX_COLS, axClientUrl: axClientUrl, axCall: axCall, axStatus: axStatus, axChipHtml: axChipHtml, axResultWords: axResultWords, axHelperHtml: axHelperHtml, copy: copy, seenWords: seenWords,
    VISIT_MARK: VISIT_MARK, VISIT_WORDS: VISIT_WORDS, fromVisit: fromVisit, visitChipHtml: visitChipHtml, linkedWords: linkedWords,
    TASKS: TASKS, REASONS: REASONS, NONE: NONE, LIST_COLS: LIST_COLS, LINK_COLS: LINK_COLS,
    esc: esc, nameScore: nameScore, suggest: suggest, pickerModel: pickerModel, selectHtml: selectHtml, linkSave: linkSave,
    isMissingCol: isMissingCol, logMatch: logMatch, logFor: logFor, statusOf: statusOf, chipHtml: chipHtml, formUrl: formUrl, viewBtnHtml: viewBtnHtml,
    time12: time12, span: span, dateWord: dateWord, whenWord: whenWord, loadFor: loadFor, sectionHtml: sectionHtml, filterPast: filterPast, safeSig: safeSig,
  };
})(typeof window !== 'undefined' ? window : globalThis);
