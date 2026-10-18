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
    ({ home: renderHome, oversight: renderOversight, coaching: renderCoaching, terminations: renderTerminations, handbook: renderHandbook, role: renderRole })[view](box);
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
      + '<div class="card hr-card"><div class="hr-card-h">Coaching oversight</div><div class="field-note">How Krystal and Angiel are keeping up with coaching shows here once coaching tasks are switched on. <a href="#" onclick="HR.go(\'oversight\');return false;">What you will see</a></div></div>';
    loadTerminations().then((t) => { const el = document.getElementById('hrTermN'); if (el) el.textContent = t === null ? '?' : String(t.filter((x) => x.status !== 'complete').length); });
  }

  /* ---------- coaching (arrives in build step 5) ---------- */
  function renderOversight(box) {
    box.innerHTML = '<div class="hr-h">Coaching oversight</div>'
      + '<div class="card hr-card"><div class="field-note">Coaching tasks are not switched on yet, so there is nothing to oversee today. When they are, this page shows for each coordinator: open, overdue and completed coaching, anything postponed more than once, help requests, and whether the caregiver improved after coaching. It separates "asked for help" from "keeps postponing".</div></div>';
  }
  function renderCoaching(box) {
    const o = owner();
    box.innerHTML = '<div class="hr-h">Coaching</div>'
      + '<div class="card hr-card"><div class="hr-card-h">' + (o ? 'Coaching conversations' : 'Your coaching conversations') + '</div>'
      + '<div class="field-note">No coaching tasks yet. When the HR agent is switched on, a caregiver who needs a coaching conversation shows up here with the facts, suggested talking points and a due date. You record the conversation here, and you can ask Zach for help with any of them.</div>'
      + '<div class="field-note hr-foot">Coaching is a short, kind, clear talk. It is written down, and it is not discipline.</div></div>';
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

  window.HR = { render, go, hbSearch: (v) => { hbQ = v; drawRules(); }, hbSerious: (v) => { hbSerious = !!v; drawRules(); }, _deadlines: deadlines, _addBusinessDays: addBusinessDays, _views: () => allowed().map((v) => v.id) };
})();
