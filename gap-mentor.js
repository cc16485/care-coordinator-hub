/* =============================================================================
   PRN STEP 8a · GAP MENTORS in the Hub (Samantha 2026-10-29: "Yes, build step 8 (Gap Mentors) with its switches off"; plan
   section 4b; server prn-week mentor_* and prn-page mentor_answer / mentor_note; rules in _shared/prn-mentor.ts)
   =============================================================================
   GM.mountClient(hostId, ax, name)  the client's Care tab, Care plan reviews: "Ask a Gap Mentor" (a refresher with a caregiver,
                                     a care update visit, a concern-only supervisory visit), each ask with the mentors' answers,
                                     "Put in AxisCare for ..." to record who it went to, and the mentors' notes.
   GM.cgMount(el, ax)                the caregiver's record: refreshers in the home with a Gap Mentor, kept apart from online
                                     courses so nobody mistakes a video for hands-on practice.
   Switch ops_settings.prn_mentor_live (and the PRN Team page open). Off, owners see it marked practice and an ask is refused.
   PRN STEP 8b (2026-10-29, "Yes, build step 8b with its switches off"): the Hub SUGGESTS a visit from her triggers, from records
   it already has. It never asks a Gap Mentor or contacts anyone by itself: a coordinator reads the reason and taps Ask.
     care update  a client's shift notes flag a change (a fall, confusion, eating, skin, pain, safety at home: one red or two
                  yellow in 30 days, not closed as "not a concern"), or a Care Match concern in 30 days.
     refresher    a fall or safety flag on a caregiver's own shift note for that client; or a high-risk skill (Hoyer lift,
                  transfers) we only know because they told us (shown on the caregiver's record).
     Not from the Hub's records (no record to read): new equipment, 12 months without a lift task, a caregiver asking. Those stay
     with "Ask a Gap Mentor" by hand. "Not needed now" sets a suggestion aside for 30 days (care_plan_reviews kind mentor_set_aside).
   GM.suggestFor(ax) / GM.suggestAll() / GM.skillSuggest(skills); the This week card GM.weekHtml(). Switch
   ops_settings.prn_mentor_suggest_live (off: owners see them marked practice).
   ============================================================================= */
(function () {
  'use strict';
  var FN = 'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/prn-week';
  var e = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  /* the Hub's DATA is a top-level let, not a window property */
  var Dt = function () { try { return DATA || {}; } catch (x) { return {}; } };
  var isOwner = function () { try { return typeof ccCan === 'function' && ccCan('manage_settings'); } catch (x) { return false; } };
  var live = function () { var st = Dt().ops_settings || {}; return st.prn_mentor_live === true && st.prn_page_live === true; };
  var fmt = function (d) { return d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''; };
  var t12 = function (hm) { var m = /^(\d\d):(\d\d)$/.exec(String(hm || '')); if (!m) return ''; var h = +m[1]; return (h % 12 || 12) + (m[2] === '00' ? '' : ':' + m[2]) + (h >= 12 ? 'pm' : 'am'); };
  var span = function (t) { return t12(String(t || '').slice(0, 5)) + ' to ' + t12(String(t || '').slice(6, 11)); };
  var SKILLS = { hoyer: 'Hoyer lift transfers', transfers: 'Transfers and gait belt', bathing: 'Safe bathing and showering', dementia: 'Dementia care', falls: 'Fall prevention at home' };
  var KINDS = { refresher: 'Refresher with a caregiver in the home', care_update: 'Care update visit', supervisory: 'Concern-only supervisory visit' };
  var FIELDS = { mobility: 'Mobility and transfers', eating: 'Eating and drinking', skin: 'Skin', memory: 'Memory and mood', safety: 'Safety at home', equipment: 'Equipment that might help',
    caregiver_hard: 'What the caregiver is finding hard', practiced: 'Practiced', comfort: 'Caregiver comfortable now', repeat: 'To repeat next time', observed: 'What they saw', concern: 'About the concern', follow_up: 'For the office to follow up' };
  var CUR = { host: null, ax: '', name: '', list: null, open: false, pre: null };
  /* ── step 8b: suggestions ── */
  var SUGGEST_DAYS = 30, SET_ASIDE_DAYS = 30;
  var DECLINE = ['a fall or injury', 'confusion or a change in behavior', 'eating or drinking', 'skin or a wound', 'pain or illness', 'safety at home'];
  var SAFETY = ['a fall or injury', 'safety at home'];
  var HIGH_RISK = { hoyer_lift: ['hoyer', 'Hoyer lift'], transfers_gait_belt: ['transfers', 'Transfers and gait belt'] };
  var suggestLive = function () { var st = Dt().ops_settings || {}; return st.prn_mentor_suggest_live === true && live(); };
  var ago = function (iso, days) { return String(iso || '') >= new Date(Date.now() - days * 864e5).toISOString(); };
  /* set-asides live in care_plan_reviews as kind 'mentor_set_aside' (an existing, registered slot; never a review) */
  var setAside = function (key) { return (Dt().care_plan_reviews || []).some(function (d) { return d && d.kind === 'mentor_set_aside' && d.suggestion === key && ago(d.at, SET_ASIDE_DAYS); }); };
  var short = function (iso) { return iso ? new Date(String(iso)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''; };
  /** The suggestions for one client: a care update and any refreshers, each with its reasons. */
  function suggestFor(ax, today) {
    ax = String(ax || ''); if (!ax) return [];
    var flags = (Dt().ops_items || []).filter(function (i) { return i && i.kind === 'care_note' && String(i.client_ax || '') === ax && (i.level === 'red' || i.level === 'yellow')
      && ago(i.created_at, SUGGEST_DAYS) && !(i.cn_actions || []).some(function (a) { return a && a.what === 'ok'; }); });
    var dec = flags.filter(function (i) { return DECLINE.indexOf(String(i.flag_kind || '')) >= 0; });
    var cms = (Dt().client_checkins || []).filter(function (c) { return c && String(c.axiscare_client_id || '') === ax && c.skip !== true && c.rating === 'concern' && ago(c.at, SUGGEST_DAYS); });
    var out = [], why = [];
    if (dec.some(function (i) { return i.level === 'red'; }) || dec.length >= 2) why = why.concat(dec.map(function (i) { return 'Shift note ' + short(i.created_at) + ': ' + i.flag_kind + (i.level === 'red' ? ' (red flag)' : ''); }));
    why = why.concat(cms.map(function (c) { return 'Care Match ' + short(c.at) + ': a concern' + (c.notes ? ' ("' + String(c.notes).slice(0, 80) + '")' : ''); }));
    var name = (dec[0] && dec[0].about) || (cms[0] && cms[0].client) || '';
    if (why.length && !setAside('cu:' + ax)) out.push({ key: 'cu:' + ax, kind: 'care_update', client_ax: ax, client_name: name, why: why });
    var byCg = {};
    flags.filter(function (i) { return SAFETY.indexOf(String(i.flag_kind || '')) >= 0 && i.caregiver_ax; }).forEach(function (i) { (byCg[i.caregiver_ax] = byCg[i.caregiver_ax] || []).push(i); });
    Object.keys(byCg).forEach(function (cg) { var f = byCg[cg]; if (setAside('rf:' + ax + ':' + cg)) return;
      out.push({ key: 'rf:' + ax + ':' + cg, kind: 'refresher', client_ax: ax, client_name: f[0].about || name, caregiver_ax: cg, caregiver_name: f[0].caregiver || '', skill: f.some(function (i) { return i.flag_kind === 'a fall or injury'; }) ? 'falls' : 'transfers',
        why: f.map(function (i) { return 'Shift note ' + short(i.created_at) + ' by ' + (i.caregiver || 'the caregiver') + ': ' + i.flag_kind; }) }); });
    return out;
  }
  /** Every client with a suggestion, for This week. */
  function suggestAll() {
    var axs = {}; (Dt().ops_items || []).forEach(function (i) { if (i && i.kind === 'care_note' && i.client_ax) axs[i.client_ax] = 1; });
    (Dt().client_checkins || []).forEach(function (c) { if (c && c.axiscare_client_id) axs[c.axiscare_client_id] = 1; });
    return Object.keys(axs).reduce(function (a, ax) { return a.concat(suggestFor(ax)); }, []);
  }
  /** A caregiver's high-risk skills known only because they told us. skills: cgdSkillsMerged(...).skills */
  function skillSuggest(skills) {
    return Object.keys(HIGH_RISK).filter(function (k) { var r = (skills || {})[k] || {}; return r.have === 'yes' && String(r.evidence || 'attested') === 'attested'; })
      .map(function (k) { return { skill: HIGH_RISK[k][0], label: HIGH_RISK[k][1] }; });
  }
  function suggestHtml(list) {
    if (!list.length) return '';
    return '<div style="margin-top:8px;padding:10px 12px;border-radius:10px;background:#FFF7E8;border:1px solid #F0D9A8;">'
      + '<div style="font-weight:700;color:#8A4E0C;font-size:13.5px;">Suggested by the Hub' + (suggestLive() ? '' : ' (practice)') + '</div>'
      + list.map(function (g, i) { return '<div style="margin-top:6px;font-size:13px;"><b>' + e(g.kind === 'care_update' ? 'A care update visit' : 'A refresher with ' + (g.caregiver_name || 'their caregiver')) + '</b>'
        + g.why.map(function (w) { return '<div class="field-note">' + e(w) + '</div>'; }).join('')
        + '<div style="margin-top:4px;"><button class="fb" onclick="GM.fromSuggest(' + i + ')">Ask a Gap Mentor</button> <button class="fb" onclick="GM.setAside(\'' + e(g.key) + '\',this)" title="Sets it aside for 30 days">Not needed now</button></div></div>'; }).join('')
      + '<div class="field-note" style="margin-top:6px;">The Hub only suggests. Nobody is asked or contacted until you tap Ask.</div></div>';
  }

  async function call(body) {
    var s = (await sb.auth.getSession()).data.session;
    if (!s) throw new Error('Sign in first.');
    var r = await fetch(FN, { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok || j.error) throw new Error(j.error || ('prn-week ' + r.status));
    return j;
  }
  var notes = function (pred) { return (Dt().care_plan_reviews || []).filter(function (r) { return r && (r.kind === 'mentor_report' || r.kind === 'mentor_refresher') && pred(r); })
    .sort(function (a, b) { return String(b.at || '').localeCompare(String(a.at || '')); }); };
  function noteHtml(r) {
    var rep = r.report || {};
    return '<div style="padding:8px 0;border-top:1px solid var(--border);font-size:13px;"><b>' + e(r.title) + '</b>'
      + (r.kind === 'mentor_refresher' ? '<span class="field-note"> · with ' + e(r.caregiver_name) + '</span>' : '')
      + Object.keys(rep).map(function (k) { return '<div><span class="field-note">' + e(FIELDS[k] || k) + ':</span> ' + e(rep[k]) + '</div>'; }).join('')
      + (r.reminder ? '<div style="margin-top:4px;color:#8A4E0C;font-weight:600;">' + e(r.reminder) + '</div>' : '')
      + (r.kind === 'mentor_report' ? '<div class="field-note" style="margin-top:4px;">The Care Coordinator decides any care plan change and talks with the family. To change the plan, log a review.</div>' : '')
      + '</div>';
  }

  function formHtml() {
    var cgs = (Dt().caregivers || []).filter(function (c) { return c && c.axiscare_id && c.active !== false; })
      .map(function (c) { return [String(c.axiscare_id), ((c.first || '') + ' ' + (c.last || '')).trim()]; }).sort(function (a, b) { return a[1].localeCompare(b[1]); });
    var sel = function (id, opts, ph) { return '<select id="' + id + '" style="font-size:13px;width:auto;max-width:100%;">' + (ph ? '<option value="">' + e(ph) + '</option>' : '') + opts.map(function (o) { return '<option value="' + e(o[0]) + '">' + e(o[1]) + '</option>'; }).join('') + '</select>'; };
    var row = function (label, html, id) { return '<label style="display:block;margin-top:8px;font-size:13px;"' + (id ? ' id="' + id + '"' : '') + '><b>' + label + '</b><div style="margin-top:3px;">' + html + '</div></label>'; };
    return '<div id="gmForm" style="margin:8px 0 10px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--bg);">'
      + row('What kind of visit?', sel('gmKind', Object.keys(KINDS).map(function (k) { return [k, KINDS[k]]; })))
      + row('When', '<input type="date" id="gmDate" style="width:auto;"> <input type="time" id="gmFrom" step="900" style="width:auto;"> to <input type="time" id="gmTo" step="900" style="width:auto;">')
      + row('Skill', sel('gmSkill', Object.keys(SKILLS).map(function (k) { return [k, SKILLS[k]]; }), 'Any (not needed for a care update or supervisory visit)'))
      + row('The caregiver it is with (refresher)', sel('gmCg', cgs, 'Pick the caregiver'), 'gmCgRow')
      + '<label style="display:flex;gap:8px;align-items:flex-start;margin-top:8px;font-size:13px;"><input type="checkbox" id="gmFam" style="width:auto;margin-top:2px;"><span><b>The family said OK</b> <span class="field-note">Needed for a refresher or a care update: it is an extra person in their home.</span></span></label>'
      + '<label style="display:flex;gap:8px;align-items:center;margin-top:6px;font-size:13px;"><input type="checkbox" id="gmGuide" style="width:auto;"> GUIDE client <input type="checkbox" id="gmVa" style="width:auto;margin-left:12px;"> VA client</label>'
      + row('Note for the Gap Mentor (nothing private: no door codes or diagnoses)', '<textarea id="gmNote" rows="2" style="width:100%;font-size:13px;" maxlength="500"></textarea>')
      + '<div class="field-note" style="margin-top:6px;">It shows on the page of each Gap Mentor it could go to (has the skill, not on a break, not on this client\'s Do Not Return list, free in AxisCare then). Clients they know first. Nothing is texted. Company-paid: put it in AxisCare as a non-billable visit once you pick someone.</div>'
      + '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;"><button class="addlead" onclick="GM.ask(this)">Ask the Gap Mentors</button><button class="ghost" onclick="GM.toggle()">Cancel</button></div>'
      + '<div class="field-note" id="gmSt" style="margin-top:6px;"></div></div>';
  }
  function visitHtml(v) {
    var st = { open: 'Waiting for a Gap Mentor', assigned: 'In AxisCare for ' + (v.assigned_name || 'a Gap Mentor'), done: 'Done · note in', cancelled: 'Cancelled' }[v.status] || v.status;
    var yes = (v.answers || []).filter(function (a) { return a.answer === 'yes'; }), no = (v.answers || []).filter(function (a) { return a.answer === 'no'; });
    return '<div style="padding:8px 0;border-top:1px solid var(--border);font-size:13px;">'
      + '<b>' + e(KINDS[v.kind] || v.kind) + '</b> · ' + e(fmt(v.visit_date)) + ', ' + e(span(v.visit_time)) + (v.skill ? ' · ' + e(SKILLS[v.skill] || v.skill) : '') + (v.caregiver_name ? ' · with ' + e(v.caregiver_name) : '')
      + ' <span class="field-note">· ' + e(st) + ' · asked by ' + e(v.asked_by) + '</span>'
      + (v.status === 'open' ? '<div style="margin-top:4px;">' + (yes.length ? yes.map(function (a) { return '<button class="fb" onclick="GM.assign(' + Number(v.id) + ',\'' + e(a.applicant_id) + '\',\'' + e(a.name) + '\',this)">' + e(a.name) + ' can do it: put in AxisCare</button>'; }).join(' ')
          : '<span class="field-note">No Gap Mentor has said yes yet.</span>') + (no.length ? ' <span class="field-note">' + no.length + ' said not this time.</span>' : '')
          + ' <button class="fb" onclick="GM.cancel(' + Number(v.id) + ',this)">Cancel the ask</button></div>' : '')
      + '</div>';
  }
  function draw() {
    var host = CUR.host && document.getElementById(CUR.host); if (!host) return;
    if (!live() && !isOwner()) { host.innerHTML = ''; return; }
    var L = CUR.list, ns = notes(function (r) { return String(r.axiscare_client_id || '') === CUR.ax; });
    host.innerHTML = '<div class="card" style="padding:14px 18px;margin-bottom:12px;">'
      + '<div style="display:flex;align-items:center;gap:8px;"><b style="font-size:15px;color:var(--navy);">🤝 Gap Mentors</b>'
      + (live() ? '' : '<span class="field-note">Practice: only owners see this until Gap Mentors are switched on (Settings, PRN Teams).</span>')
      + '<span style="flex:1;"></span><button class="secondary" onclick="GM.toggle()">Ask a Gap Mentor</button></div>'
      + '<div class="field-note" style="margin-top:2px;">Our PRN CNA Team, for a refresher with a caregiver, a care update when ' + e(String(CUR.name || '').split(' ')[0] || 'a client') + ' is changing, or a concern-only supervisory visit. They observe and practice; the Care Coordinator decides any care plan change.</div>'
      + (!CUR.open && (suggestLive() || isOwner()) ? suggestHtml(CUR.sugg = suggestFor(CUR.ax)) : '')
      + (CUR.open ? formHtml() : '')
      + (L === null ? '<div class="field-note" style="margin-top:6px;">Loading…</div>' : L.error ? '<div class="field-note" style="margin-top:6px;color:var(--red);">' + e(L.error) + '</div>'
        : (L.visits || []).map(visitHtml).join('') || '<div class="field-note" style="margin-top:6px;">No Gap Mentor visits yet.</div>')
      + (ns.length ? '<div style="margin-top:10px;font-weight:700;color:var(--navy);font-size:13.5px;">Their notes</div>' + ns.map(noteHtml).join('') : '')
      + '</div>';
  }
  function prefill() {
    var p = CUR.pre; if (!p) return; CUR.pre = null;
    var set = function (id, v) { var el = document.getElementById(id); if (el && v != null) { if (el.type === 'checkbox') el.checked = !!v; else el.value = v; } };
    set('gmKind', p.kind); set('gmSkill', p.kind === 'refresher' ? p.skill : ''); set('gmCg', p.caregiver_ax || '');
    set('gmNote', p.why ? 'Why: ' + p.why.join('; ').slice(0, 400) : '');
  }
  async function load() { CUR.list = null; draw(); try { CUR.list = await call({ action: 'mentor_list', client_ax: CUR.ax }); } catch (x) { CUR.list = { error: x.message }; } draw(); }

  window.GM = {
    mountClient: function (hostId, ax, name) { CUR = { host: hostId, ax: String(ax || ''), name: name || '', list: null, open: false }; if (!CUR.ax) { var h = document.getElementById(hostId); if (h) h.innerHTML = ''; return; } if (!live() && !isOwner()) { draw(); return; } load(); },
    toggle: function () { CUR.open = !CUR.open; draw(); prefill(); },
    fromSuggest: function (i) { var g = (CUR.sugg || [])[i]; if (!g) return; CUR.pre = g; CUR.open = true; draw(); prefill(); },
    setAside: async function (key, btn) {
      if (btn) btn.disabled = true;
      var rec = { id: 'gmsa_' + key.replace(/[^a-z0-9]/gi, '_'), kind: 'mentor_set_aside', suggestion: key, at: new Date().toISOString(), by: (function () { try { return ME.name; } catch (x) { return ''; } })() };
      var d = Dt(); d.care_plan_reviews = (d.care_plan_reviews || []).filter(function (x) { return !(x && x.id === rec.id); }).concat([rec]);
      try { if (typeof persist === 'function') await persist('care_plan_reviews', rec); } catch (x) { /* kept on this screen */ }
      draw(); if (window.PW && PW._draw) PW._draw();
    },
    suggestFor: suggestFor, suggestAll: suggestAll, skillSuggest: skillSuggest,
    /* This week (PRN Teams): every client with a suggestion, each a tap to their Care tab */
    weekHtml: function () {
      if (!suggestLive() && !isOwner()) return '';
      var all = suggestAll(); if (!all.length) return '';
      return '<div class="card pw-card"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;"><h3 style="margin:0;color:var(--navy);font-size:17px;">Gap Mentor suggestions</h3>'
        + '<span class="field-note">' + (suggestLive() ? 'From shift notes and Care Match. Open the client to ask a Gap Mentor.' : 'Practice: only owners see this until Gap Mentor suggestions are switched on (Settings, PRN Teams).') + '</span></div>'
        + all.slice(0, 8).map(function (g) { return '<div class="pw-line" style="display:block;"><b>' + e(g.client_name || 'A client') + '</b>: ' + e(g.kind === 'care_update' ? 'a care update visit' : 'a refresher with ' + (g.caregiver_name || 'their caregiver'))
          + '<div class="field-note">' + e(g.why.join(' · ')) + '</div>'
          + '<button class="fb" onclick="try{openClientProfile(\'' + e(g.client_ax) + '\')}catch(x){}">Open their Care tab</button></div>'; }).join('')
        + (all.length > 8 ? '<div class="field-note" style="margin-top:6px;">' + (all.length - 8) + ' more.</div>' : '') + '</div>';
    },
    ask: async function (btn) {
      var v = function (id) { var el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : String(el.value || '').trim()) : ''; };
      var cg = document.getElementById('gmCg'), cgName = cg && cg.selectedIndex > 0 ? cg.options[cg.selectedIndex].text : '';
      var body = { action: 'mentor_ask', kind: v('gmKind'), client_ax: CUR.ax, client_name: CUR.name, visit_date: v('gmDate'), visit_time: v('gmFrom') + '-' + v('gmTo'),
        skill: v('gmSkill'), caregiver_ax: v('gmKind') === 'refresher' ? v('gmCg') : '', caregiver_name: v('gmKind') === 'refresher' ? cgName : '', family_ok: v('gmFam'), guide: v('gmGuide'), va: v('gmVa'), note: v('gmNote') };
      var say = function (t) { var el = document.getElementById('gmSt'); if (el) { el.textContent = t; el.style.color = 'var(--red)'; } };
      if (/—/.test(body.note)) return say('Please use a comma or a period instead of an em dash.');
      if (btn) btn.disabled = true;
      try { await call(body); CUR.open = false; await load(); }
      catch (x) { say(x.message); if (btn) btn.disabled = false; }
    },
    assign: async function (id, aid, name, btn) {
      var ok = typeof ccConfirm === 'function' ? await ccConfirm('Put this visit in AxisCare for ' + name + ' (a non-billable visit type), then confirm here. Nothing is sent from the Hub.') : true;
      if (!ok) return; if (btn) btn.disabled = true;
      try { await call({ action: 'mentor_assign', id: id, applicant_id: aid }); await load(); } catch (x) { alert(x.message); if (btn) btn.disabled = false; }
    },
    cancel: async function (id, btn) {
      if (btn) btn.disabled = true;
      try { await call({ action: 'mentor_cancel', id: id }); await load(); } catch (x) { alert(x.message); if (btn) btn.disabled = false; }
    },
    cgMount: function (el, ax) {
      if (!el) return;
      var rs = notes(function (r) { return r.kind === 'mentor_refresher' && String(r.caregiver_ax || '') === String(ax); });
      var sk = []; try { var c = (CGD.census && CGD.census.caregivers || []).find(function (x) { return String(x.id) === String(ax); }); if (c && typeof cgdSkillsMerged === 'function') sk = skillSuggest(cgdSkillsMerged(ax, cgdLegacyFor(ax, (c.first + ' ' + c.last).trim())).skills); } catch (x) { sk = []; }
      var skHtml = sk.length && (suggestLive() || isOwner()) ? '<div class="card" style="padding:12px 16px;margin-bottom:10px;background:#FFF7E8;border:1px solid #F0D9A8;"><b style="color:#8A4E0C;">Suggested: a refresher with a Gap Mentor' + (suggestLive() ? '' : ' (practice)') + '</b>'
        + '<div class="field-note">' + e(sk.map(function (x) { return x.label; }).join(' and ')) + ': we only know because they told us. A Gap Mentor can see it at a client\'s home (Ask a Gap Mentor on that client\'s Care tab).</div></div>' : '';
      el.innerHTML = skHtml + (rs.length ? '<div class="card" style="padding:14px 16px;margin-bottom:10px;"><div style="font-weight:800;color:var(--navy);font-size:14px;margin-bottom:4px;">Refreshers in the home</div>'
        + '<div class="field-note">Hands-on practice with a Gap Mentor at a client\'s home. Kept apart from online courses.</div>' + rs.map(noteHtml).join('') + '</div>' : '');
    },
    _state: function () { return CUR; }
  };
})();
