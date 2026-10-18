/* =============================================================================
   hr.js · the HR section (HR Agent build step 3, Samantha 2026-10-18)
   One Hub page with its own menu on the left, so Zach (the remote HR lead) sees his whole job at a glance.
   Samantha and Zach (approve_discipline) see every item. Care Coordinators see Coaching, Attendance and Zach's role.
   Attendance and Write-Ups are the existing Caregivers panels, moved in here (the panels themselves are unchanged).
   Coaching tasks arrive with build step 5; until then the Coaching pages say so plainly.
   Loaded on demand by index.html when the 'hr' tab opens. Reads only; every change still happens in the panels
   that already make it (Write-Ups, Attendance) or on the Owners Hub (terminations).
   ============================================================================= */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const owner = () => { try { return typeof ccCan === 'function' && ccCan('approve_discipline'); } catch (e) { return false; } };
  const W = () => (typeof WriteupRules !== 'undefined' ? WriteupRules : null);
  const VIEWS = [
    { id: 'home', label: "Zach's dashboard", note: 'What needs you today', owner: true },
    { id: 'practice', label: 'Agent practice', note: 'Check what it would flag', owner: true },
    { id: 'formal', label: 'Formal cases', note: 'Write-ups and approvals', owner: true },
    { id: 'oversight', label: 'Coaching oversight', note: 'Is coaching happening', owner: true },
    { id: 'coaching', label: 'Coaching', note: 'Conversations to have', owner: false },
    { id: 'attendance', label: 'Attendance', note: 'Call-ins, late arrivals, no-shows', owner: false },
    { id: 'terminations', label: 'Terminations', note: 'From decision to paperwork', owner: true },
    { id: 'handbook', label: 'Handbook', note: 'The rules the agent cites', owner: false },
    { id: 'role', label: "Zach's role", note: 'For everyone at Caring Companions', owner: false }
  ];
  const PANEL_OF = { formal: 'tab-cgwriteups', attendance: 'tab-cgattendance' };
  const SCX_OF = { formal: 'cgwriteups', attendance: 'cgattendance' };
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  let view = null;

  function allowed() { const o = owner(); return VIEWS.filter((v) => o || !v.owner); }
  function pick(want) {
    const ok = allowed().map((v) => v.id);
    if (want && ok.includes(want)) return want;
    const last = store.get('cch_hr_view');
    if (last && ok.includes(last)) return last;
    return ok[0];
  }

  /* ---------- business days (Corrective Action SOP timing) ---------- */
  function addBusinessDays(iso, n) {
    const d = new Date(iso); if (isNaN(d)) return null;
    let left = n; while (left > 0) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) left--; }
    return d;
  }
  const addDays = (iso, n) => { const d = new Date(iso); if (isNaN(d)) return null; d.setDate(d.getDate() + n); return d; };
  const fmtDay = (d) => (d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '');

  /* One line per open step a write-up is waiting on (SOP 2026-07-16: facts in 2 business days, a decision in 3, the
     meeting within 5 business days of the decision, and a 30-day follow-up). */
  function deadlines(list) {
    const out = [];
    (list || []).forEach((a) => {
      const who = a.caregiver || 'A caregiver', created = a.created_at;
      if ((a.status === 'draft' || a.status === 'pending_approval') && created) {
        out.push({ who, what: (a.level || 'Write-up') + ': decide it', due: addBusinessDays(created, 3), id: a.id });
      } else if (a.status === 'approved') {
        out.push({ who, what: (a.level || 'Write-up') + ': meet with the caregiver', due: addBusinessDays(a.approved_at || created, 5), id: a.id });
      } else if (a.status === 'issued' && a.issued_at && !a.followup_at) {
        out.push({ who, what: (a.level || 'Write-up') + ': 30-day follow-up', due: addDays(a.issued_at, 30), id: a.id });
      }
    });
    return out.filter((x) => x.due).sort((x, y) => x.due - y.due);
  }

  /* ---------- shell ---------- */
  function render(want) {
    const root = document.getElementById('hrRoot'); if (!root) return;
    view = pick(want || view);
    store.set('cch_hr_view', view);
    if (!root.dataset.built) {
      root.dataset.built = '1';
      if (!document.getElementById('hrCss')) {
        const st = document.createElement('style'); st.id = 'hrCss';
        st.textContent = '.hr-wrap{display:grid;grid-template-columns:230px minmax(0,1fr);gap:18px;padding:18px 22px 40px;align-items:start}'
          + '.hr-menu{position:sticky;top:12px;display:flex;flex-direction:column;gap:4px;background:#fff;border:1px solid var(--border);border-radius:12px;padding:10px}'
          + '.hr-menu-head{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--gray,#6B7280);font-weight:700;padding:4px 10px 8px}'
          + '.hr-item{display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;background:none;border:0;border-radius:8px;padding:8px 10px;cursor:pointer;color:var(--navy);font:inherit}'
          + '.hr-item:hover{background:var(--bg)}.hr-item:focus-visible{outline:2px solid var(--teal);outline-offset:1px}'
          + '.hr-item.on{background:var(--navy);color:#fff}.hr-item.on .hr-item-note{color:#d9e4f0}'
          + '.hr-item-label{font-weight:700;font-size:13.5px}.hr-item-note{font-size:11.5px;color:var(--gray,#6B7280)}'
          + '.hr-main{min-width:0}.hr-main>.tabpanel{padding:0}'
          + '.hr-h{font-size:18px;font-weight:800;color:var(--navy);margin:2px 0 12px}'
          + '.hr-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}'
          + '.hr-tile{background:#fff;border:1px solid var(--border);border-radius:10px;padding:10px 12px}.hr-tile-label{font-size:12px;color:var(--gray,#6B7280)}'
          + '.hr-tile-n{font-size:24px;font-weight:800;color:var(--navy);font-variant-numeric:tabular-nums}.hr-tile-n.warn{color:#B42318}'
          + '.hr-card{padding:14px 16px;margin-bottom:12px}.hr-card-h{font-weight:800;color:var(--navy);font-size:14px;margin-bottom:6px}'
          + '.hr-sub{font-weight:700;color:var(--navy);font-size:13px;margin:12px 0 4px}'
          + '.hr-row{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:7px 0;border-top:1px solid var(--border);font-size:13px}'
          + '.hr-row-top{align-items:flex-start}.hr-row>span{min-width:0}.hr-btn{padding:5px 12px;font-size:12.5px}'
          + '.hr-late{color:#B42318;font-weight:700;font-size:12.5px}.hr-foot{margin-top:8px}'
          + '.hr-quote{font-family:Georgia,serif;font-size:13.5px;color:#3a3222;max-width:60ch}'
          + '.hr-rule{padding:8px 0;border-top:1px solid var(--border);font-size:13px;display:grid;gap:3px}'
          + '.hr-kind{font-size:11.5px;font-weight:700;border-radius:999px;padding:2px 10px;white-space:nowrap}.hr-kind-recognition{background:#E3F3F2;color:#1F6E69}.hr-kind-coaching{background:#EEF2F7;color:#334155}.hr-kind-recurring{background:#FEF3C7;color:#92400E}.hr-kind-serious{background:#FDECEA;color:#B42318}'
          + '.hr-form{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin:8px 0;display:grid;gap:4px}.hr-form textarea,.hr-form select,.hr-form input{font:inherit;padding:6px 8px;border:1px solid var(--border);border-radius:8px;box-sizing:border-box}.hr-form textarea{width:100%}'
          + '.hr-actions{margin-top:8px}.hr-err{color:#B42318;font-size:12.5px;min-height:1em}.hr-tips{margin:0 0 6px 18px;padding:0;font-size:13px;line-height:1.6}.hr-more summary{cursor:pointer}'
          + '.hr-scroll{overflow-x:auto}.hr-table{border-collapse:collapse;font-size:13px;width:100%}.hr-table th,.hr-table td{text-align:left;padding:6px 8px;border-top:1px solid var(--border);white-space:nowrap;font-variant-numeric:tabular-nums}.hr-table th{font-size:12px;color:var(--gray,#6B7280);font-weight:600}'
          + '.hr-serious{font-size:11px;font-weight:700;color:#B42318;background:#FDECEA;border-radius:999px;padding:1px 8px}'
          + '.hr-hb-bar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:4px 0}.hr-hb-bar input[type=search]{flex:1;min-width:200px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font:inherit}'
          + '.hr-role p,.hr-role li{font-size:14px;line-height:1.6;max-width:68ch}.hr-sel{user-select:all;font-weight:700}'
          + '@media (max-width:760px){.hr-wrap{grid-template-columns:1fr;padding:12px}.hr-menu{position:static;flex-direction:row;flex-wrap:wrap}.hr-item-note{display:none}.hr-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}';
        document.head.appendChild(st);
      }
      root.innerHTML = '<div class="hr-wrap"><nav class="hr-menu" id="hrMenu" aria-label="HR"></nav><div class="hr-main" id="hrMain"></div></div>';
    }
    const o = owner();
    document.getElementById('hrMenu').innerHTML = '<div class="hr-menu-head">' + (o ? "Zach's HR desk" : 'HR') + '</div>'
      + allowed().map((v) => '<button type="button" class="hr-item' + (v.id === view ? ' on' : '') + '" onclick="HR.go(\'' + v.id + '\')">'
        + '<span class="hr-item-label">' + esc(v.label) + '</span><span class="hr-item-note">' + esc(v.note) + '</span></button>').join('');
    const main = document.getElementById('hrMain');
    /* the two moved panels: put them in the main pane and show only the one asked for */
    Object.keys(PANEL_OF).forEach((k) => { const p = document.getElementById(PANEL_OF[k]); if (p) { if (p.parentNode !== main) main.appendChild(p); p.classList.toggle('active', k === view); } });
    let box = document.getElementById('hrView');
    if (!box) { box = document.createElement('div'); box.id = 'hrView'; main.prepend(box); }
    box.hidden = !!PANEL_OF[view];
    if (PANEL_OF[view]) { if (typeof scxEnsure === 'function') scxEnsure(SCX_OF[view]); return; }
    box.innerHTML = '';
    ({ home: renderHome, practice: renderPractice, oversight: renderOversight, coaching: renderCoaching, terminations: renderTerminations, handbook: renderHandbook, role: renderRole })[view](box);
  }
  function go(v) { view = v; render(v); try { window.scrollTo(0, 0); } catch (e) {} }

  /* ---------- Zach's dashboard ---------- */
  function renderHome(box) {
    /* DATA is the Hub's own top-level variable, not a window property */
    const list = (typeof DATA !== 'undefined' && DATA && DATA.discipline_actions) || [];
    const wr = W(), can = (a) => (typeof discCanApprove === 'function' ? discCanApprove(a) : { ok: false });
    const decide = list.filter((a) => a.status === 'pending_approval' && can(a).ok);
    const drafts = list.filter((a) => a.status === 'draft');
    const consult = list.filter((a) => a.status === 'pending_approval' && can(a).consult);
    const dl = deadlines(list), now = Date.now(), week = now + 7 * 864e5;
    const dueSoon = dl.filter((x) => x.due.getTime() <= week);
    const tile = (label, n, warn) => '<div class="hr-tile"><div class="hr-tile-label">' + esc(label) + '</div><div class="hr-tile-n' + (warn && n ? ' warn' : '') + '">' + n + '</div></div>';
    const row = (a, right) => '<div class="hr-row"><span><b>' + esc(a.caregiver || 'A caregiver') + '</b> · ' + esc(a.level || '') + (a.reason ? ' · ' + esc(a.reason) : '') + '</span>' + right + '</div>';
    box.innerHTML = '<div class="hr-h">Good to see you. Here is what needs you.</div>'
      + '<div class="hr-tiles">' + tile('Your decision', decide.length + drafts.length, true) + tile("Waiting on Samantha's consult", consult.length) + tile('Due this week', dueSoon.length, true) + tile('Terminations open', '<span id="hrTermN">…</span>') + '</div>'
      + '<div class="card hr-card"><div class="hr-card-h">Needs your decision</div>'
      + (decide.length || drafts.length
        ? decide.map((a) => row(a, '<button class="primary hr-btn" onclick="HR.go(\'formal\')">Review</button>')).join('')
          + drafts.map((a) => row(a, '<span class="field-note">draft' + (a.created_by ? ' by ' + esc(a.created_by) : '') + '</span> <button class="secondary hr-btn" onclick="HR.go(\'formal\')">Open</button>')).join('')
        : '<div class="field-note">Nothing is waiting on you.</div>')
      + (consult.length ? '<div class="hr-sub">Waiting on Samantha\'s consult</div>' + consult.map((a) => row(a, '<span class="field-note">involves ' + esc((wr ? wr.protectedWords(a) : []).join(', ')) + '</span>')).join('') : '')
      + '</div>'
      + '<div class="card hr-card"><div class="hr-card-h">Deadlines and follow-ups</div>'
      + (dl.length ? dl.slice(0, 12).map((x) => '<div class="hr-row"><span><b>' + esc(x.who) + '</b> · ' + esc(x.what) + '</span><span class="' + (x.due.getTime() < now ? 'hr-late' : 'field-note') + '">' + (x.due.getTime() < now ? 'was due ' : 'due ') + esc(fmtDay(x.due)) + '</span></div>').join('')
        : '<div class="field-note">No open deadlines.</div>')
      + '<div class="field-note hr-foot">From the Corrective Action SOP: facts in 2 business days, a decision in 3, the meeting within 5 business days of the decision, and a 30-day follow-up.</div></div>'
      + '<div class="card hr-card"><div class="hr-card-h">HR agent practice</div><div class="field-note" id="hrPracN">Loading…</div></div>'
      + '<div class="card hr-card"><div class="hr-card-h">Coaching oversight</div><div class="field-note" id="hrCoachN">Loading…</div></div>';
    loadCoaching(true).then((cs) => { const el = document.getElementById('hrCoachN'); if (!el) return;
      if (cs === null) { el.textContent = 'Coaching could not be read. Reload the page to try again.'; return; }
      const open = cs.filter((c) => c.status === 'open'), late = open.filter(overdue), help = cs.filter(helpWaiting), hand = open.filter((c) => c.handoff_at);
      el.innerHTML = (cs.length ? open.length + ' open · <span class="' + (late.length ? 'hr-late' : '') + '">' + late.length + ' overdue</span> · ' + help.length + ' asking for your help' + (hand.length ? ' · ' + hand.length + ' asking to hand off' : '')
        : 'No coaching assigned yet. Assign one from Agent practice.') + ' <a href="#" onclick="HR.go(\'oversight\');return false;">Open oversight</a>'; });
    loadCases().then((cs) => { const el = document.getElementById('hrPracN'); if (!el) return;
      if (cs === null) { el.textContent = 'The practice cases could not be read. Reload the page to try again.'; return; }
      const todo = cs.filter((c) => c.practice && !c.review);
      el.innerHTML = todo.length ? todo.length + ' case' + (todo.length === 1 ? '' : 's') + ' the agent would have flagged, waiting for you to mark right or wrong. <a href="#" onclick="HR.go(\'practice\');return false;">Review them</a>'
        : (cs.length ? 'All practice cases are marked. Thank you.' : 'No practice cases yet. The agent runs every morning at 7.'); });
    loadTerminations().then((t) => { const el = document.getElementById('hrTermN'); if (el) el.textContent = t === null ? '?' : String(t.filter((x) => x.status !== 'complete').length); });
  }

  /* ---------- agent practice (build step 4): what the agent would flag, for Samantha and Zach to mark ---------- */
  let cases = null, pracFilter = 'todo';
  const KIND = { recognition: ['Recognition', 'Pass it on to the caregiver'], coaching: ['Coaching', 'Krystal or Angiel talks with them'], recurring: ['Recurring', 'Zach reviews'], serious: ['Serious', 'Zach right away'] };
  async function loadCases(force) {
    if (cases && !force) return cases;
    try { const { data, error } = await sb.from('hr_cases').select('*').order('created_at', { ascending: false }).limit(300); if (error) return null; cases = data || []; return cases; }
    catch (e) { return null; }
  }
  function renderPractice(box) {
    box.innerHTML = '<div class="hr-h">Agent practice</div>'
      + '<div class="card hr-card"><div class="field-note">Every morning the HR agent reads attendance, missed shift notes and kind words, and writes down what it would flag. Nothing is sent to anyone while it practices. Mark each one: <b>Right call</b> or <b>Wrong call</b> (say why). When you and Zach agree with what it catches, it can be switched on.</div>'
      + '<div class="hr-hb-bar" style="margin-top:8px;"><label class="field-note"><input type="radio" name="hrPf" ' + (pracFilter === 'todo' ? 'checked' : '') + ' onchange="HR.pf(\'todo\')"> Not marked yet</label>'
      + '<label class="field-note"><input type="radio" name="hrPf" ' + (pracFilter === 'all' ? 'checked' : '') + ' onchange="HR.pf(\'all\')"> All</label></div></div>'
      + '<div id="hrPracList"><div class="field-note">Loading…</div></div>';
    Promise.all([loadCases(true), loadCoaching(true)]).then(drawPractice);
  }
  function drawPractice() {
    const el = document.getElementById('hrPracList'); if (!el) return;
    if (cases === null) { el.innerHTML = '<div class="card hr-card field-note">The practice cases could not be read. Reload the page to try again.</div>'; return; }
    const list = cases.filter((c) => pracFilter === 'all' || !c.review);
    const counts = {}; cases.forEach((c) => { counts[c.review || 'todo'] = (counts[c.review || 'todo'] || 0) + 1; });
    el.innerHTML = '<div class="field-note" style="margin:0 0 8px;">' + cases.length + ' on file · ' + (counts.todo || 0) + ' to mark · ' + (counts.agree || 0) + ' right · ' + (counts.disagree || 0) + ' wrong</div>'
      + (list.length ? list.map((c) => {
        const k = KIND[c.kind] || [c.kind, ''];
        return '<div class="card hr-card"><div class="hr-row" style="border-top:0;padding-top:0;"><span><b>' + esc(c.caregiver) + '</b> · ' + esc(c.title) + '</span>'
          + '<span class="hr-kind hr-kind-' + esc(c.kind) + '">' + esc(k[0]) + '</span></div>'
          + '<div class="field-note">' + esc(k[1]) + ' · found ' + esc(String(c.created_at || '').slice(0, 10)) + (c.practice ? ' · practice' : '') + '</div>'
          + '<div style="margin:6px 0;">' + (c.facts || []).slice(0, 20).map((f) => '<div class="field-note">' + esc(f.date) + ' · ' + esc(f.what) + '</div>').join('') + '</div>'
          + (c.handbook ? '<div class="hr-quote" style="margin-bottom:6px;">' + esc(c.handbook) + '</div>' : '')
          + assignHtml(c)
          + (c.review ? '<div class="field-note"><b>' + (c.review === 'agree' ? 'Right call' : 'Wrong call') + '</b>' + (c.review_note ? ': ' + esc(c.review_note) : '') + ' · ' + esc(c.reviewed_by || '') + ' <a href="#" onclick="HR.mark(\'' + esc(c.id) + '\',null);return false;">change</a></div>'
            : '<div><button class="primary hr-btn" onclick="HR.mark(\'' + esc(c.id) + '\',\'agree\')">Right call</button> <button class="secondary hr-btn" onclick="HR.mark(\'' + esc(c.id) + '\',\'disagree\')">Wrong call</button></div>')
          + '</div>'; }).join('')
        : '<div class="card hr-card field-note">' + (cases.length ? 'Everything is marked.' : 'No practice cases yet. The agent runs every morning at 7.') + '</div>');
  }
  async function mark(id, review) {
    const c = (cases || []).find((x) => x.id === id); if (!c) return;
    let note = null;
    if (review === 'disagree') { note = await ccPrompt('Why is this the wrong call? This teaches the agent what to leave alone (your words only; it never changes the rules by itself).', ''); if (note === null) return; }
    else if (review === 'agree') { note = ''; }
    const who = String((typeof ME !== 'undefined' && ME && (ME.name || ME.email)) || '');
    const patch = review ? { review, review_note: (note || '').trim() || null, reviewed_by: who, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      : { review: null, review_note: null, reviewed_by: null, reviewed_at: null, updated_at: new Date().toISOString() };
    const { error } = await sb.from('hr_cases').update(patch).eq('id', id);
    if (error) { alert('That did not save: ' + error.message + '. Nothing changed; try again.'); return; }
    Object.assign(c, patch); drawPractice();
  }

  /* ---------- the coaching tracker (build step 5) ---------- */
  /* Every change goes through the database's one door (hr_coaching_act), which checks who is asking, keeps the audit
     log and the person's My Work card current. This page never writes the tables itself. */
  let coach = null; const FORM = {};
  const todayStr = () => new Date().toLocaleString('sv-SE', { timeZone: 'America/Chicago' }).slice(0, 10);
  const ymd = (d) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10) : '');
  const overdue = (c) => c.status === 'open' && String(c.due_on) < todayStr();
  const helpWaiting = (c) => c.status === 'open' && c.help_at && (!c.help_reply_at || c.help_reply_at < c.help_at);
  const nameOf = (e) => { try { return typeof opsOwnerName === 'function' ? opsOwnerName(e) : e; } catch (x) { return e; } };
  const fmtYmd = (s) => { const d = new Date(String(s) + 'T12:00:00'); return isNaN(d) ? String(s || '') : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); };
  async function loadCoaching(force) {
    if (coach && !force) return coach;
    try { const { data, error } = await sb.from('hr_coaching').select('*').order('created_at', { ascending: false }).limit(500); if (error) return null; coach = data || []; return coach; }
    catch (e) { return null; }
  }
  async function act(id, action, p) {
    const { data, error } = await sb.rpc('hr_coaching_act', { p_id: id || null, p_action: action, p: p || {} });
    if (error) { alert(String(error.message || 'That did not save.') + ' Nothing changed.'); return null; }
    return data;
  }
  function coordinators() {
    const out = [];
    try { Object.keys(CC_ROLE_BY_EMAIL || {}).forEach((e) => { if ((CC_ROLE_BY_EMAIL[e] || []).indexOf('care_coordinator') > -1) out.push(e); }); } catch (x) {}
    return out.length ? out.sort() : ['krystal@mo-care.com'];
  }
  /* suggested talking points, kind and clear, in the coordinator's own voice (she edits them before assigning) */
  function talkingPoints(c) {
    const first = String(c.caregiver || '').split(/\s+/)[0] || 'there';
    const f0 = (c.facts || [])[0] || {};
    return ({
      w06: first + ', I wanted to check in about clocking in and out. A few shifts this month show no clock-in or no clock-out. Is something getting in the way, like the app or your phone? Every shift needs both, so you are paid right and the visit counts.',
      w01: first + ', thank you for letting us know you could not make your shift on ' + (f0.date || 'that day') + '. When you can, we need at least 4 hours notice, and for a 7 to 9 AM shift, a call by 5 PM the day before. That gives us time to find someone for your client. Is there anything that would make that easier?',
      w02: first + ', I have noticed a few call-ins lately. Is everything okay? Our clients count on you, so I want to see if there is something we can help with, like a change to your schedule.',
      w03: first + ', your clients love you, and I want to talk about start times. A few shifts started late. Is something making it hard to get there on time? Our clients count on the scheduled start time.',
      w05: first + ', thank you for the care you give. A few shifts did not have a shift note. The note is how the family and the office know how the visit went, and every shift needs one before you clock out. Is the app giving you any trouble?',
      kind: first + ', I wanted to pass along what someone said about you: ' + String(f0.what || '').slice(0, 200) + ' Thank you for the care you give.',
    })[c.rule] || (first + ', I wanted to check in with you about ' + String(c.title || '').toLowerCase() + '.');
  }
  function assignHtml(c) {
    if (!owner() || (c.kind !== 'coaching' && c.kind !== 'recognition')) return '';
    const done = (coach || []).find((x) => x.case_id === c.id);
    if (done) return '<div class="field-note" style="margin-bottom:6px;">Assigned to <b>' + esc(nameOf(done.assigned_to)) + '</b>, due ' + esc(fmtYmd(done.due_on)) + ' · ' + esc(done.status === 'open' ? 'open' : done.status.replace('_', ' ')) + '</div>';
    if (FORM['a' + c.id]) {
      const due = ymd(addBusinessDays(new Date().toISOString(), c.kind === 'recognition' ? 3 : 5));
      return '<div class="hr-form" id="hrAf' + esc(c.id) + '"><div class="hr-sub" style="margin-top:0;">Assign ' + (c.kind === 'recognition' ? 'passing this on' : 'this coaching talk') + '</div>'
        + '<label class="field-note">To <select id="hrAto' + esc(c.id) + '">' + coordinators().map((e) => '<option value="' + esc(e) + '">' + esc(nameOf(e)) + '</option>').join('') + '</select></label> '
        + '<label class="field-note">Due <input type="date" id="hrAdue' + esc(c.id) + '" value="' + esc(due) + '"></label> '
        + '<label class="field-note"><input type="checkbox" id="hrAsoon' + esc(c.id) + '"> Soon (shows as today)</label>'
        + '<div class="field-note" style="margin-top:6px;">Suggested talking points (edit them)</div><textarea id="hrAtp' + esc(c.id) + '" rows="4">' + esc(talkingPoints(c)) + '</textarea>'
        + '<div style="margin-top:6px;"><button class="primary hr-btn" onclick="HR.assign(\'' + esc(c.id) + '\')">Assign</button> <button class="secondary hr-btn" onclick="HR.form(\'a' + esc(c.id) + '\',0)">Cancel</button></div></div>';
    }
    return '<div style="margin-bottom:6px;"><button class="secondary hr-btn" onclick="HR.form(\'a' + esc(c.id) + '\',1)">Assign to a coordinator</button></div>';
  }
  async function assign(caseId) {
    const g = (x) => document.getElementById(x + caseId);
    const r = await act(null, 'assign', { case_id: caseId, assigned_to: g('hrAto').value, due_on: g('hrAdue').value, priority: g('hrAsoon').checked ? 'soon' : 'normal', talking_points: g('hrAtp').value });
    if (!r) return;
    FORM['a' + caseId] = 0; await Promise.all([loadCases(true), loadCoaching(true)]); drawPractice();
  }

  const TIPS = ['Find a private moment and start with something that is going well.', 'Say the facts plainly: the dates and what happened. No labels like "always" or "lazy".',
    'Ask an open question, then listen: "Is something making this hard?"', 'Agree on one clear thing that is expected from now on.', 'End kindly: thank them and say you are there to help.'];
  function coachCard(c) {
    const o = owner(), mine = String(c.assigned_to).toLowerCase() === String((typeof ME !== 'undefined' && ME && ME.email) || '').toLowerCase();
    const can = c.status === 'open' && (o || mine), rec = c.kind === 'recognition', id = esc(c.id);
    const chip = c.status !== 'open' ? '<span class="hr-kind hr-kind-coaching">' + esc({ done: 'Done', flag_wrong: 'Flag was wrong', not_needed: 'Not needed', withdrawn: 'Withdrawn' }[c.status] || c.status) + '</span>'
      : overdue(c) ? '<span class="hr-kind hr-kind-serious">Overdue</span>' : String(c.due_on) === todayStr() ? '<span class="hr-kind hr-kind-recurring">Due today</span>' : '<span class="hr-kind hr-kind-coaching">Due ' + esc(fmtYmd(c.due_on)) + '</span>';
    let h = '<div class="card hr-card"><div class="hr-row" style="border-top:0;padding-top:0;"><span><b>' + esc(c.caregiver) + '</b> · ' + esc(c.topic) + '</span>' + chip + '</div>'
      + '<div class="field-note">' + (rec ? 'A compliment to pass on' : 'Coaching, not discipline') + ' · assigned to ' + esc(nameOf(c.assigned_to)) + ' by ' + esc(nameOf(c.assigned_by)) + (c.postpone_count ? ' · postponed ' + c.postpone_count + (c.postpone_count === 1 ? ' time' : ' times') : '') + '</div>'
      + '<div style="margin:6px 0;">' + (c.facts || []).slice(0, 12).map((f) => '<div class="field-note">' + esc(f.date) + ' · ' + esc(f.what) + '</div>').join('') + '</div>'
      + (c.talking_points ? '<div class="hr-sub">Suggested talking points</div><div class="hr-quote">' + esc(c.talking_points) + '</div>' : '')
      + (c.help_note ? '<div class="field-note" style="margin-top:6px;"><b>Asked Zach:</b> ' + esc(c.help_note) + (c.help_reply ? '<br><b>' + esc(nameOf(c.help_reply_by)) + ':</b> ' + esc(c.help_reply) : ' <i>(waiting for a reply)</i>') + '</div>' : '')
      + (c.handoff_note ? '<div class="field-note"><b>Asked to hand off:</b> ' + esc(c.handoff_note) + '</div>' : '');
    if (c.status === 'done') {
      h += '<div class="hr-sub">' + (rec ? 'Passed on' : 'The conversation') + ' · ' + esc(fmtYmd(c.held_on)) + ' · ' + esc(String(c.method || '').replace('_', ' ')) + '</div>'
        + '<div class="field-note"><b>' + (rec ? 'What you told them' : 'Discussed') + ':</b> ' + esc(c.discussed) + '</div><div class="field-note"><b>Their response:</b> ' + esc(c.response) + '</div>'
        + (rec ? '' : '<div class="field-note"><b>Expected from now on:</b> ' + esc(c.expectation) + '</div>') + (c.followup ? '<div class="field-note"><b>Follow-up:</b> ' + esc(c.followup) + '</div>' : '');
      if (!rec && c.improved === null && c.check_on && String(c.check_on) <= todayStr())
        h += '<div class="hr-form"><b>30 days on: did it help?</b> <button class="primary hr-btn" onclick="HR.improved(\'' + id + '\',true)">Yes, it improved</button> <button class="secondary hr-btn" onclick="HR.improved(\'' + id + '\',false)">No, it is still happening</button></div>';
      else if (c.improved !== null && c.improved !== undefined) h += '<div class="field-note"><b>30-day check:</b> ' + (c.improved ? 'it improved' : 'still happening, so it goes to Zach') + (c.improved_note ? ' · ' + esc(c.improved_note) : '') + '</div>';
      else if (!rec && c.check_on) h += '<div class="field-note">30-day check on ' + esc(fmtYmd(c.check_on)) + '.</div>';
    } else if (c.status !== 'open') {
      h += '<div class="field-note"><b>Closed by ' + esc(nameOf(c.closed_by)) + ':</b> ' + esc(c.close_note || '') + '</div>';
    }
    if (can) {
      const f = FORM[c.id];
      if (f === 'record') {
        h += '<div class="hr-form"><div class="hr-sub" style="margin-top:0;">' + (rec ? 'Record that you passed it on' : 'Record the conversation (all required)') + '</div>'
          + '<label class="field-note">Date <input type="date" id="hrRd' + id + '" value="' + esc(todayStr()) + '"></label> '
          + '<label class="field-note">How <select id="hrRm' + id + '"><option value="in_person">In person</option><option value="phone">Phone</option><option value="video">Video</option></select></label>'
          + '<div class="field-note" style="margin-top:6px;">' + (rec ? 'What you told them' : 'What you discussed') + '</div><textarea id="hrRw' + id + '" rows="2"></textarea>'
          + '<div class="field-note">' + (rec ? 'How they took it' : 'Their response') + '</div><textarea id="hrRr' + id + '" rows="2"></textarea>'
          + (rec ? '' : '<div class="field-note">What is expected from now on</div><textarea id="hrRe' + id + '" rows="2"></textarea><div class="field-note">Follow-up needed (optional)</div><textarea id="hrRf' + id + '" rows="1"></textarea>')
          + '<div class="hr-err" id="hrRerr' + id + '"></div><button class="primary hr-btn" onclick="HR.done(\'' + id + '\')">' + (rec ? 'Mark passed on' : 'Mark coaching done') + '</button> <button class="secondary hr-btn" onclick="HR.form(\'' + id + '\',0)">Cancel</button></div>';
      } else if (f === 'help') {
        h += '<div class="hr-form"><div class="hr-sub" style="margin-top:0;">How to have this conversation</div><ol class="hr-tips">' + TIPS.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ol>'
          + '<div class="field-note">Still unsure? Ask Zach. He can send talking points, practice it with you, or join the call. You stay the owner.</div>'
          + '<textarea id="hrHn' + id + '" rows="2" placeholder="What would you like help with?"></textarea><button class="primary hr-btn" onclick="HR.help(\'' + id + '\')">Ask Zach</button> <button class="secondary hr-btn" onclick="HR.form(\'' + id + '\',0)">Close</button></div>';
      } else if (f === 'postpone') {
        h += '<div class="hr-form"><label class="field-note">New date <input type="date" id="hrPd' + id + '" value="' + esc(ymd(addBusinessDays(String(c.due_on) + 'T12:00:00', 2))) + '"></label>'
          + '<div class="field-note">Why does it have to wait?</div><textarea id="hrPr' + id + '" rows="1"></textarea><button class="primary hr-btn" onclick="HR.postpone(\'' + id + '\')">Postpone</button> <button class="secondary hr-btn" onclick="HR.form(\'' + id + '\',0)">Cancel</button>'
          + '<div class="field-note">Zach sees how often a talk is postponed.</div></div>';
      } else {
        h += '<div class="hr-actions"><button class="primary hr-btn" onclick="HR.form(\'' + id + '\',\'record\')">' + (rec ? 'Record that I told them' : 'Record the conversation') + '</button>'
          + (rec ? '' : ' <button class="secondary hr-btn" onclick="HR.form(\'' + id + '\',\'help\')">Help me with this conversation</button>')
          + ' <button class="secondary hr-btn" onclick="HR.form(\'' + id + '\',\'postpone\')">Postpone</button></div>'
          + '<div class="hr-actions field-note"><a href="#" onclick="HR.close(\'' + id + '\',\'flag_wrong\');return false;">This flag is wrong</a> · '
          + (rec ? '' : '<a href="#" onclick="HR.close(\'' + id + '\',\'not_needed\');return false;">Coaching isn\'t right here</a> · ')
          + '<a href="#" onclick="HR.close(\'' + id + '\',\'handoff\');return false;">Hand it to someone else</a>'
          + (o ? ' · <a href="#" onclick="HR.close(\'' + id + '\',\'withdraw\');return false;">Withdraw</a>' : '') + '</div>';
      }
    }
    return h + '</div>';
  }
  function renderCoaching(box) {
    box.innerHTML = '<div class="hr-h">Coaching</div><div id="hrCoachList"><div class="field-note">Loading…</div></div>';
    loadCoaching(true).then(drawCoaching);
  }
  function drawCoaching() {
    const el = document.getElementById('hrCoachList'); if (!el) return;
    if (coach === null) { el.innerHTML = '<div class="card hr-card field-note">Coaching could not be read. Reload the page to try again.</div>'; return; }
    const me = String((typeof ME !== 'undefined' && ME && ME.email) || '').toLowerCase(), o = owner();
    const open = coach.filter((c) => c.status === 'open').sort((a, b) => String(a.due_on).localeCompare(String(b.due_on)));
    const mineOpen = open.filter((c) => String(c.assigned_to).toLowerCase() === me), others = open.filter((c) => String(c.assigned_to).toLowerCase() !== me);
    const checks = coach.filter((c) => c.status === 'done' && c.kind === 'coaching' && c.improved === null && c.check_on && String(c.check_on) <= todayStr());
    const recent = coach.filter((c) => c.status !== 'open').slice(0, 10);
    el.innerHTML = '<div class="card hr-card field-note">Coaching is a short, kind, clear talk. It is written down, and it is not discipline. Opening a task doesn\'t finish it: record the conversation when it has happened.</div>'
      + '<div class="hr-sub">' + (mineOpen.length ? 'Yours to do (' + mineOpen.length + ')' : 'Yours to do') + '</div>' + (mineOpen.length ? mineOpen.map(coachCard).join('') : '<div class="field-note">Nothing assigned to you right now.</div>')
      + (others.length ? '<div class="hr-sub">' + (o ? 'Assigned to others (' : 'Your teammates\' (') + others.length + ')</div>' + others.map(coachCard).join('') : '')
      + (checks.length ? '<div class="hr-sub">30 days on: did it help? (' + checks.length + ')</div>' + checks.map(coachCard).join('') : '')
      + (recent.length ? '<details class="hr-more"><summary class="hr-sub">Recently finished (' + recent.length + ')</summary>' + recent.map(coachCard).join('') + '</details>' : '');
  }
  const after = async () => { await loadCoaching(true); if (view === 'coaching') drawCoaching(); else if (view === 'oversight') drawOversight(); else render(view); };
  async function done(id) {
    const g = (x) => document.getElementById(x + id), err = g('hrRerr'), c = (coach || []).find((x) => x.id === id) || {}, rec = c.kind === 'recognition';
    const p = { held_on: g('hrRd').value, method: g('hrRm').value, discussed: g('hrRw').value.trim(), response: g('hrRr').value.trim(),
      expectation: rec ? 'None (a compliment)' : g('hrRe').value.trim(), followup: rec ? '' : g('hrRf').value.trim() };
    if (!p.held_on || !p.discussed || !p.response || !p.expectation) { err.textContent = 'Fill in every box above first.'; return; }
    if (await act(id, 'done', p)) { FORM[id] = 0; after(); }
  }
  async function help(id) {
    const t = document.getElementById('hrHn' + id).value.trim(); if (!t) { alert('Write what you would like help with first.'); return; }
    if (await act(id, 'help', { note: t })) { FORM[id] = 0; after(); }
  }
  async function postpone(id) {
    const d = document.getElementById('hrPd' + id).value, r = document.getElementById('hrPr' + id).value.trim();
    if (!r) { alert('Say why it has to wait first.'); return; }
    if (await act(id, 'postpone', { due_on: d, reason: r })) { FORM[id] = 0; after(); }
  }
  async function closeAs(id, action) {
    const q = { flag_wrong: 'Why is this flag wrong? Zach sees your answer.', not_needed: 'Why isn\'t coaching right here? Zach sees your answer.',
      handoff: 'Why should someone else have this talk? Zach decides who.', withdraw: 'Why withdraw it? (optional)' }[action];
    const r = await ccPrompt(q, ''); if (r === null) return;
    if (action !== 'withdraw' && !r.trim()) { alert('Write the reason first.'); return; }
    if (await act(id, action, { reason: r.trim() })) after();
  }
  async function improved(id, yes) {
    const n = await ccPrompt(yes ? 'Good to hear. Anything to note? (optional)' : 'What is still happening? (optional) The agent will bring it to Zach if it repeats.', ''); if (n === null) return;
    if (await act(id, 'improved', { improved: yes ? 'true' : 'false', note: n.trim() })) after();
  }

  /* ---------- Zach's oversight: is coaching happening, by coordinator ---------- */
  function renderOversight(box) {
    box.innerHTML = '<div class="hr-h">Coaching oversight</div><div id="hrOvBox"><div class="field-note">Loading…</div></div>';
    loadCoaching(true).then(drawOversight);
  }
  function drawOversight() {
    const el = document.getElementById('hrOvBox'); if (!el) return;
    if (coach === null) { el.innerHTML = '<div class="card hr-card field-note">Coaching could not be read. Reload the page to try again.</div>'; return; }
    const people = {}; coach.forEach((c) => { const k = String(c.assigned_to).toLowerCase(); (people[k] ||= []).push(c); });
    const cell = (n, warn) => '<td class="' + (warn && n ? 'hr-late' : '') + '">' + n + '</td>';
    const rows = Object.keys(people).sort().map((k) => { const L = people[k], co = L.filter((c) => c.kind === 'coaching');
      const doneL = L.filter((c) => c.status === 'done'), onTime = doneL.filter((c) => String(c.closed_at || '').slice(0, 10) <= String(c.due_on));
      const checked = co.filter((c) => c.improved !== null && c.improved !== undefined);
      return '<tr><td><b>' + esc(nameOf(k)) + '</b></td>' + cell(L.filter((c) => c.status === 'open').length) + cell(L.filter(overdue).length, true)
        + '<td>' + onTime.length + ' of ' + doneL.length + '</td>' + cell(L.filter((c) => c.postpone_count >= 2).length, true) + cell(L.filter((c) => c.help_at).length)
        + '<td>' + (checked.length ? checked.filter((c) => c.improved).length + ' of ' + checked.length : '-') + '</td></tr>'; }).join('');
    const helpL = coach.filter(helpWaiting), hand = coach.filter((c) => c.status === 'open' && c.handoff_at), late = coach.filter(overdue);
    const closed = coach.filter((c) => (c.status === 'flag_wrong' || c.status === 'not_needed') && String(c.closed_at || '') >= new Date(Date.now() - 30 * 864e5).toISOString());
    const brief = (c) => '<b>' + esc(c.caregiver) + '</b> · ' + esc(c.topic) + ' · ' + esc(nameOf(c.assigned_to));
    el.innerHTML = '<div class="card hr-card"><div class="hr-card-h">By coordinator</div>'
      + (rows ? '<div class="hr-scroll"><table class="hr-table"><thead><tr><th>Coordinator</th><th>Open</th><th>Overdue</th><th>Done on time</th><th>Postponed 2+</th><th>Asked for help</th><th>Improved after</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="field-note">No coaching assigned yet. Assign one from Agent practice.</div>')
      + '<div class="field-note hr-foot">Asking for help is a good sign: support them. Postponing again and again is a conversation to have with them. This is about supporting the office team, not disciplining them.</div></div>'
      + '<div class="card hr-card"><div class="hr-card-h">Asking for your help (' + helpL.length + ')</div>' + (helpL.length ? helpL.map((c) => '<div class="hr-row hr-row-top"><span>' + brief(c) + '<br><span class="field-note">"' + esc(c.help_note) + '"</span></span>'
          + '<span style="flex:1;min-width:220px;"><textarea id="hrHr' + esc(c.id) + '" rows="2" placeholder="Talking points, an offer to practice, or to join"></textarea><button class="primary hr-btn" onclick="HR.reply(\'' + esc(c.id) + '\')">Send reply</button></span></div>').join('') : '<div class="field-note">Nobody is waiting on you.</div>') + '</div>'
      + '<div class="card hr-card"><div class="hr-card-h">Asking to hand off (' + hand.length + ')</div>' + (hand.length ? hand.map((c) => '<div class="hr-row"><span>' + brief(c) + '<br><span class="field-note">"' + esc(c.handoff_note) + '"</span></span><span><select id="hrRa' + esc(c.id) + '">'
          + coordinators().concat(['zach@mo-care.com']).map((e) => '<option value="' + esc(e) + '"' + (e === c.assigned_to ? ' selected' : '') + '>' + esc(nameOf(e)) + '</option>').join('') + '</select> <button class="secondary hr-btn" onclick="HR.reassign(\'' + esc(c.id) + '\')">Reassign</button></span></div>').join('') : '<div class="field-note">None.</div>') + '</div>'
      + '<div class="card hr-card"><div class="hr-card-h">Overdue (' + late.length + ')</div>' + (late.length ? late.map((c) => '<div class="hr-row"><span>' + brief(c) + '</span><span class="hr-late">was due ' + esc(fmtYmd(c.due_on)) + '</span></div>').join('') : '<div class="field-note">Nothing overdue.</div>') + '</div>'
      + (closed.length ? '<div class="card hr-card"><div class="hr-card-h">Closed without a talk, last 30 days (' + closed.length + ')</div>' + closed.map((c) => '<div class="hr-row"><span>' + brief(c) + '<br><span class="field-note">' + (c.status === 'flag_wrong' ? 'Flag was wrong' : 'Coaching not right here') + ': "' + esc(c.close_note || '') + '"</span></span></div>').join('') + '</div>' : '');
  }
  async function reply(id) {
    const t = document.getElementById('hrHr' + id).value.trim(); if (!t) { alert('Write your reply first.'); return; }
    if (await act(id, 'help_reply', { note: t })) after();
  }
  async function reassign(id) {
    if (await act(id, 'reassign', { assigned_to: document.getElementById('hrRa' + id).value })) after();
  }

  /* ---------- terminations (owners only; the checklist itself lives on the Owners Hub) ---------- */
  let termCache = null;
  async function loadTerminations() {
    if (termCache) return termCache;
    if (!owner()) return [];
    try { const { data, error } = await sb.from('app_data').select('data').eq('key', 'offboardings').maybeSingle(); if (error) return null; termCache = ((data && data.data) || []).filter((o) => o && o.kind === 'Termination'); return termCache; }
    catch (e) { return null; }
  }
  function renderTerminations(box) {
    box.innerHTML = '<div class="hr-h">Terminations</div><div class="card hr-card" id="hrTermBox"><div class="field-note">Loading…</div></div>';
    loadTerminations().then((t) => {
      const el = document.getElementById('hrTermBox'); if (!el) return;
      if (t === null) { el.innerHTML = '<div class="field-note">The termination list could not be read. Reload the page to try again.</div>'; return; }
      const open = t.filter((x) => x.status !== 'complete'), done = t.filter((x) => x.status === 'complete');
      const line = (x) => { const steps = x.steps || [], n = steps.filter((s) => s.done_at).length;
        return '<div class="hr-row"><span><b>' + esc(x.name || 'Someone') + '</b>' + (x.last_day ? ' · last day ' + esc(x.last_day) : '') + '</span><span class="field-note">' + n + ' of ' + steps.length + ' steps done</span></div>'; };
      el.innerHTML = '<div class="hr-card-h">In progress</div>' + (open.length ? open.map(line).join('') : '<div class="field-note">None in progress.</div>')
        + (done.length ? '<div class="hr-sub">Finished</div>' + done.slice(0, 10).map(line).join('') : '')
        + '<div class="field-note hr-foot">You decide a termination before the employee is told. Talk with Samantha first when it involves protected leave, an accommodation, an injury or workers\' comp, a discrimination or harassment complaint, or a retaliation concern. The checklist is on the Owners Hub: <a href="https://hub.mo-care.com/owners.html" target="_blank" rel="noopener">open Offboarding</a>.</div>';
    });
  }

  /* ---------- handbook (approved 2026-10-18; stored in app_data 'hr_handbook') ---------- */
  let hb = null, hbQ = '', hbSerious = false;
  async function loadHandbook() {
    if (hb) return hb;
    try { const { data, error } = await sb.from('app_data').select('data').eq('key', 'hr_handbook').maybeSingle(); if (error || !data) return null; hb = data.data || []; return hb; }
    catch (e) { return null; }
  }
  function renderHandbook(box) {
    box.innerHTML = '<div class="hr-h">Handbook</div><div id="hrHbBox"><div class="field-note">Loading…</div></div>';
    loadHandbook().then((items) => {
      const el = document.getElementById('hrHbBox'); if (!el) return;
      if (!items) { el.innerHTML = '<div class="card hr-card field-note">The handbook rules could not be read. Reload the page to try again.</div>'; return; }
      const watched = items.filter((x) => x.t === 'watched'), rules = items.filter((x) => x.t === 'rule');
      el.innerHTML = '<div class="card hr-card"><div class="hr-card-h">What the agent watches</div>'
        + '<div class="field-note" style="margin-bottom:6px;">Approved by Samantha on 2026-10-18. A threshold opens a review, never discipline on its own. The first time is coaching; the same issue again after coaching goes to Zach; serious ones go straight to Zach.</div>'
        + watched.map((w) => '<div class="hr-row hr-row-top"><span><b>' + esc(w.what) + '</b><br><span class="field-note">' + esc(w.threshold) + '</span></span><span class="hr-quote">' + esc(w.words) + '</span></div>').join('') + '</div>'
        + '<div class="card hr-card"><div class="hr-card-h">Every rule Zach can cite (' + rules.length + ')</div>'
        + '<div class="hr-hb-bar"><input id="hrHbQ" type="search" placeholder="Search: no call, phone, gifts, 2K" value="' + esc(hbQ) + '" oninput="HR.hbSearch(this.value)"><label class="field-note"><input type="checkbox" id="hrHbS" ' + (hbSerious ? 'checked' : '') + ' onchange="HR.hbSerious(this.checked)"> Serious only</label></div>'
        + '<div id="hrHbList"></div></div>';
      drawRules();
    });
  }
  function drawRules() {
    const el = document.getElementById('hrHbList'); if (!el || !hb) return;
    const q = hbQ.trim().toLowerCase();
    const hits = hb.filter((x) => x.t === 'rule' && (!hbSerious || x.x) && (!q || (x.s + ' ' + x.r + ' ' + x.q).toLowerCase().includes(q)));
    el.innerHTML = '<div class="field-note" style="margin:4px 0 6px;">' + hits.length + ' rule' + (hits.length === 1 ? '' : 's') + '</div>'
      + hits.slice(0, 200).map((x) => '<div class="hr-rule"><div><b>' + esc(x.s) + '</b> · ' + esc(x.r) + (x.x ? ' <span class="hr-serious">Serious</span>' : '') + '</div><div class="hr-quote">' + esc(x.q) + '</div></div>').join('')
      + (hits.length > 200 ? '<div class="field-note">Showing the first 200. Search to narrow it down.</div>' : '');
  }

  /* ---------- Zach's role (everyone) ---------- */
  function renderRole(box) {
    box.innerHTML = '<div class="card hr-card hr-role">'
      + '<div class="hr-h" style="margin-top:0;">Meet Zach, our HR lead</div>'
      + '<p>Zach is one of the owners of Caring Companions. Until now he has helped Samantha behind the scenes. Now he is stepping forward to lead HR for our whole team.</p>'
      + '<p>Zach spent 15 years as director of The Arc of the Ozarks here in Springfield. He brings years of leading people, supporting staff, and caring for the people we serve. He works remotely, and he is a message away.</p>'
      + '<div class="hr-sub">What Zach handles</div><ul><li>Write-ups and corrective action</li><li>Terminations</li><li>Looking into concerns about how a team member is treated or how someone acts at work</li><li>HR questions: policies, the handbook, pay disputes, time off</li></ul>'
      + '<div class="hr-sub">What stays the same</div><ul><li>Krystal still runs the day: scheduling, coaching in the moment, and payroll.</li><li>Samantha still leads Caring Companions.</li></ul>'
      + '<div class="hr-sub">How Zach can help beyond HR</div><p>Bring him the hard ones: a tough conversation with a team member, a family situation you are unsure about, or how to handle something new. He has seen a lot in 15 years and is glad to share it.</p>'
      + '<div class="hr-sub">How to reach Zach</div><p>Message him in the Hub, or email <span class="hr-sel">zach@mo-care.com</span>.</p></div>';
  }

  window.HR = { render, go, mark, assign, done, help, postpone, improved, reply, reassign, close: closeAs, form: (k, v) => { FORM[k] = v; if (view === 'practice') drawPractice(); else drawCoaching(); }, pf: (v) => { pracFilter = v; drawPractice(); }, hbSearch: (v) => { hbQ = v; drawRules(); }, hbSerious: (v) => { hbSerious = !!v; drawRules(); }, _deadlines: deadlines, _addBusinessDays: addBusinessDays, _views: () => allowed().map((v) => v.id) };
})();
