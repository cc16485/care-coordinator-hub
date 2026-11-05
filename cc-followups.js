/* =============================================================================
   cc-followups.js · My Work > Follow-ups (Samantha 2026-11-05: "Approve the Caring Companions Follow-ups plan as shown, with
   all six of your picks. Build it in practice mode, switched off."; plan https://claude.ai/artifact/9JhXj6Dd7pyQ4xASNmGN2s).
   window.CFU.

   Every call, text and voicemail nobody has answered yet, one row per phone number, in the table she approved for CDS:
   a glance row (Care or safety today, Call or text back today, Later this week, Yours, and who is waiting), one row of
   menus (When, Who, Need, Owner, Line), then Who | What came in | Need | Owner | When | Waiting | Call or text | Move it |
   Done. "Who is this?" is answered in the row. Phones get short cards with a More button.

   The server (Staffing repo, cc-followups, Desktop 1307) reads GoHighLevel every 5 minutes and keeps the rows. A row closes
   itself when someone texts that number from the office or a call with them connects. This page only shows the rows and
   sends what a person picks (need, owner, care or safety, later, done, who is this). Nothing here texts or calls anyone:
   Call is the Hub's office-line call (office-call.js), Text opens their GoHighLevel conversation.

   Switch: ops_settings.cc_followups_live (the Owners Hub Admin page). Off = practice: owners see this tab as
   "Follow-ups (practice)"; nobody else sees it, and the old missed call cards keep working. On = everyone sees the tab,
   each row is also a My Work card (kind reply_needed), and the Hub stops making missed call cards.
   No em dashes in anything a person reads.
   ============================================================================= */
(function (W) {
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = () => { try { return DATA || {}; } catch (e) { return {}; } };
  const on = () => (D().ops_settings || {}).cc_followups_live === true;
  const isOwner = () => { try { return !!W.ccIsOwner(); } catch (e) { return false; } };
  const visible = () => on() || isOwner();
  const me = () => { try { return String(W.ccActor().email || '').toLowerCase(); } catch (e) { return ''; } };
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } return null; };
  const GHL = 'https://app.hirecara.com/v2/location/' + (typeof GHL_LOC !== 'undefined' ? GHL_LOC : 'Recp0AhyMh8lrtKJ9kaj');
  const ten = p => String(p || '').replace(/\D/g, '').slice(-10);
  const pretty = p => { const d = ten(p); return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : ''; };

  let Q = null, ERR = '', LOADING = false, PEOPLE = null, LATER = '', MORE = '', HOST = null, BUSY = '';
  let F = { when: null, who: null, need: null, owner: null, line: null };
  try { const s = JSON.parse(ls('cfuF') || 'null'); if (s && typeof s === 'object') F = Object.assign(F, s); } catch (e) { /* none saved */ }
  const save = () => ls('cfuF', JSON.stringify(F));

  async function call(payload) {
    const sess = await sb.auth.getSession(), tok = sess && sess.data && sess.data.session && sess.data.session.access_token;
    if (!tok) throw new Error('Please sign in again.');
    let r;
    try {
      r = await fetch(CONFIG.supabase_url + '/functions/v1/cc-followups', { method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, apikey: CONFIG.supabase_anon_key }, body: JSON.stringify(payload) });
    } catch (e) { throw new Error('Follow-ups could not be reached. Check the connection and try again.'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || ('Follow-ups answered ' + r.status + '.'));
    return j;
  }
  async function load() {
    if (LOADING) return; LOADING = true;
    try { Q = await call({ action: 'queue' }); ERR = ''; } catch (e) { ERR = e.message; }
    LOADING = false; draw();
  }

  /* ---------- time ---------- */
  function when(iso) {
    if (!iso) return '';
    const d = new Date(iso), now = new Date();
    const t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    if (d.toDateString() === now.toDateString()) return t;
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday ' + t;
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' + t;
  }
  const dayWord = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
  function waited(iso, now) {
    if (!iso) return { t: '', mins: 0, old: false };
    const d = new Date(iso), mins = Math.max(0, Math.round((now - d) / 60000));
    if (d.toDateString() !== new Date(now).toDateString()) {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { t: d.toDateString() === y.toDateString() ? 'Since yesterday' : 'Since ' + d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), mins, old: true };
    }
    return { t: mins < 60 ? mins + ' m' : Math.floor(mins / 60) + ' h ' + (mins % 60) + ' m', mins, old: false };
  }
  function nextDays(todayIso) {
    const out = [], d = new Date(todayIso + 'T12:00:00');
    while (out.length < 5) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) out.push(d.toISOString().slice(0, 10)); }
    return out;
  }

  /* ---------- the rows ---------- */
  const WHEN = { urgent: 'Care or safety today', today: 'Call or text back today', later: 'Later this week' };
  const WHO = { family: 'Families, clients and leads', caregiver: 'Caregivers', applicant: 'Applicants', unknown: 'Not known yet' };
  const RANK = { urgent: 0, today: 1, later: 2 };
  const whoGroup = c => c.kind !== 'followup' ? 'unknown' : c.person_kind === 'caregiver' ? 'caregiver' : c.person_kind === 'applicant' ? 'applicant' : ['client', 'family', 'lead'].includes(c.person_kind) ? 'family' : 'unknown';
  const ownerName = e => { if (!e) return ''; const p = ((Q && Q.people) || []).find(x => x.email === String(e).toLowerCase()); return p ? p.name : (typeof W.opsOwnerName === 'function' ? W.opsOwnerName(e) : String(e).split('@')[0]); };
  function model() {
    const now = Date.now(), today = (Q && Q.today) || new Date().toISOString().slice(0, 10);
    const sec = c => c.urgent ? 'urgent' : (c.later && c.later > today ? 'later' : 'today');
    const rows = ((Q && Q.cards) || []).map(c => ({ c, sec: sec(c), w: waited(c.since, now), who: whoGroup(c) }));
    rows.sort((a, b) => RANK[a.sec] - RANK[b.sec] || (a.sec === 'later' ? String(a.c.later).localeCompare(String(b.c.later)) : 0) || String(a.c.since || '').localeCompare(String(b.c.since || '')));
    const mine = me();
    const pass = (r, skip) => (skip === 'when' || !F.when || r.sec === F.when) && (skip === 'who' || !F.who || r.who === F.who)
      && (skip === 'need' || !F.need || (r.c.need || 'not_sure') === F.need) && (skip === 'line' || !F.line || (r.c.line || 'MO') === F.line)
      && (skip === 'owner' || !F.owner || (F.owner === 'mine' ? r.c.owner === mine : F.owner === 'nobody' ? !r.c.owner : r.c.owner === F.owner));
    return { rows, pass, shown: rows.filter(r => pass(r)), today, mine };
  }

  const pill = r => r.sec === 'urgent' ? '<span class="cfu-pill cfu-red">Care or safety today</span>'
    : r.sec === 'later' ? '<span class="cfu-pill cfu-blue">Back ' + E(dayWord(r.c.later)) + '</span>' : '<span class="cfu-pill cfu-gold">Today</span>';
  const edge = r => r.sec === 'urgent' ? ' cfu-now' : r.sec === 'today' ? ' cfu-today' : '';
  function waitHtml(r) {
    if (r.sec === 'later' || !r.w.t) return '<span class="cfu-none">–</span>';
    return r.w.old || r.sec === 'urgent' ? '<b class="cfu-redt">' + E(r.w.t) + '</b>' : r.w.mins >= 120 ? '<b class="cfu-goldt">' + E(r.w.t) + '</b>' : E(r.w.t);
  }
  function nameHtml(c) {
    const t = c.kind === 'who_is_this' ? 'Who is this?' : c.kind === 'hidden_number' ? 'Number not shown' : c.name;
    return '<span class="cfu-name">' + E(t) + '</span>';
  }
  function whoCell(c) {
    const sub = c.kind === 'who_is_this' ? 'Number we do not know' : c.kind === 'hidden_number' ? '' : (c.detail || c.role || '');
    return nameHtml(c) + (sub ? '<div class="cfu-sub">' + E(sub) + (c.line === 'OK' ? ' · Oklahoma line' : '') + '</div>' : c.line === 'OK' ? '<div class="cfu-sub">Oklahoma line</div>' : '')
      + (c.phone10 ? '<div class="cfu-sub">' + E(pretty(c.phone10)) + '</div>' : '')
      + (c.kind === 'who_is_this' && c.detail ? '<div class="cfu-sub">' + E(c.detail) + '</div>' : '');
  }
  function cameIn(c) {
    const ev = (c.events || []).slice(-6).map(e => '<li><span>' + E(when(e.at)) + '</span>' + E(e.text) + '</li>').join('');
    return '<ul class="cfu-ev">' + ev + '</ul>' + (c.urgent && c.urgentWhy ? '<div class="cfu-why">' + E(c.urgentWhy) + '</div>' : '');
  }
  function needSel(c) {
    return '<select class="cfu-sel" id="cfuNeed_' + E(c.id) + '" aria-label="Need" onchange="CFU.set(\'' + E(c.id) + '\',\'set_need\',{need:this.value})">'
      + ((Q && Q.needs) || []).map(n => '<option value="' + E(n.key) + '"' + ((c.need || 'not_sure') === n.key ? ' selected' : '') + '>' + E(n.label) + '</option>').join('') + '</select>'
      + (c.needByHub ? '<div class="cfu-sub">The hub picked it</div>' : '');
  }
  function ownerSel(c) {
    const ppl = (Q && Q.people) || [];
    return '<select class="cfu-sel" id="cfuOwner_' + E(c.id) + '" aria-label="Owner" onchange="CFU.set(\'' + E(c.id) + '\',\'set_owner\',{owner:this.value})">'
      + '<option value=""' + (!c.owner ? ' selected' : '') + '>Nobody yet</option>'
      + ppl.map(p => '<option value="' + E(p.email) + '"' + (c.owner === p.email ? ' selected' : '') + '>' + E(p.name) + '</option>').join('')
      + (c.owner && !ppl.some(p => p.email === c.owner) ? '<option value="' + E(c.owner) + '" selected>' + E(ownerName(c.owner)) + '</option>' : '') + '</select>'
      + (c.ownerVia ? '<div class="cfu-sub">' + E(c.ownerVia.charAt(0).toUpperCase() + c.ownerVia.slice(1)) + '</div>' : '');
  }
  function callText(c) {
    if (c.kind === 'hidden_number') return '<a class="cfu-b cfu-q" target="_blank" rel="noopener" href="' + E(GHL + '/conversations/conversations/' + encodeURIComponent(c.conversationId || '')) + '">Open in GoHighLevel</a>'
      + '<div class="cfu-sub">No number to call back. Look in GoHighLevel, then press Done.</div>';
    const text = c.conversationId ? GHL + '/conversations/conversations/' + encodeURIComponent(c.conversationId) : c.contactId ? GHL + '/contacts/detail/' + encodeURIComponent(c.contactId) : GHL + '/conversations/conversations';
    const callA = typeof W.ocAttrs === 'function' ? W.ocAttrs(c.phone10) : ' href="#"';
    return '<div class="cfu-acts"><a class="cfu-b' + (c.urgent ? ' cfu-late' : '') + '"' + callA + '>Call</a><a class="cfu-b cfu-q" target="_blank" rel="noopener" href="' + E(text) + '">Text</a></div>';
  }
  function moveHtml(r) {
    const c = r.c, id = E(c.id);
    return '<div class="cfu-acts"><button type="button" class="cfu-b cfu-q" aria-pressed="' + (c.urgent ? 'true' : 'false') + '" onclick="CFU.set(\'' + id + '\',\'urgent\',{on:' + (!c.urgent) + '})">' + (c.urgent ? 'Not care or safety' : 'Care or safety') + '</button>'
      + '<button type="button" class="cfu-b cfu-q" onclick="CFU.later(\'' + (LATER === c.id ? '' : id) + '\')">' + (r.sec === 'later' ? 'Change the day' : 'Later this week') + '</button></div>'
      + (LATER === c.id ? '<div class="cfu-days" role="group" aria-label="Move to a later day">' + nextDays(Q.today).map(x => '<button type="button" onclick="CFU.set(\'' + id + '\',\'later\',{date:\'' + x + '\'})">' + E(dayWord(x)) + '</button>').join('')
        + (c.later ? '<button type="button" onclick="CFU.set(\'' + id + '\',\'later\',{date:null})">Back to today</button>' : '') + '<button type="button" onclick="CFU.later(\'\')">Cancel</button></div>' : '');
  }
  const doneBtn = c => '<button type="button" class="cfu-b cfu-q" onclick="CFU.set(\'' + E(c.id) + '\',\'done\',{})">Done</button>';
  function whoPicker(c) {
    const id = E(c.id);
    const opts = (PEOPLE || []).map(p => '<option value="' + E(p.name + ' (' + p.role + ')') + '"></option>').join('');
    return '<div class="cfu-who"><b>Pick once and the hub remembers this number.</b>'
      + '<div class="cfu-acts"><input type="text" id="cfuWho_' + id + '" list="cfuPeople_' + id + '" placeholder="' + (PEOPLE ? 'Start typing a name' : 'Loading names…') + '" aria-label="Who is this?" onfocus="CFU.people()">'
      + '<datalist id="cfuPeople_' + id + '">' + opts + '</datalist>'
      + '<button type="button" class="cfu-b" onclick="CFU.pick(\'' + id + '\',\'' + E(c.phone10) + '\')">Save</button>'
      + '<button type="button" class="cfu-b cfu-q" onclick="CFU.newLead(\'' + E(c.phone10) + '\')">Make this a lead</button>'
      + '<button type="button" class="cfu-b cfu-q" onclick="CFU.notForUs(\'' + id + '\',\'' + E(c.phone10) + '\')">Not for us</button></div>'
      + '<label class="cfu-sub"><input type="checkbox" id="cfuFam_' + id + '"> It is their family, not them</label>'
      + '<div class="cfu-err" id="cfuErr_' + id + '"></div></div>';
  }
  function rowHTML(r) {
    const c = r.c;
    return '<tr class="cfu-r' + edge(r) + '"><td class="cfu-n">' + whoCell(c) + '</td><td>' + cameIn(c) + '</td>'
      + '<td class="cfu-sep">' + needSel(c) + '</td><td>' + ownerSel(c) + '</td>'
      + '<td class="cfu-sep">' + pill(r) + '</td><td>' + waitHtml(r) + '</td>'
      + (c.kind === 'who_is_this' ? '<td class="cfu-sep" colspan="3">' + whoPicker(c) + '</td>'
        : '<td class="cfu-sep">' + callText(c) + '</td><td>' + moveHtml(r) + '</td><td>' + doneBtn(c) + '</td>') + '</tr>';
  }
  function cardHTML(r) {
    const c = r.c, id = E(c.id), last = (c.events || []).filter(e => e.kind !== 'tried').slice(-1)[0];
    const meta = [c.role || (c.kind === 'who_is_this' ? 'Number we do not know' : ''), c.needLabel, ownerName(c.owner)].filter(Boolean).join(' · ');
    return '<div class="cfu-card' + edge(r) + '"><div class="cfu-top"><div>' + nameHtml(c) + '<div class="cfu-sub">' + E(meta) + '</div></div>'
      + (r.sec === 'urgent' ? '<span class="cfu-pill cfu-red">Care or safety</span>' : r.sec === 'later' ? '<span class="cfu-pill cfu-blue">Back ' + E(dayWord(c.later)) + '</span>' : '<span class="cfu-pill cfu-gold">' + E(r.w.t || 'Today') + '</span>') + '</div>'
      + (last ? '<div class="cfu-sub cfu-dark">' + E(when(last.at)) + ' · ' + E(last.text) + '</div>' : '')
      + (c.kind === 'who_is_this' ? whoPicker(c) : '<div class="cfu-acts">' + callText(c).replace(/^<div class="cfu-acts">|<\/div>$/g, '')
        + '<button type="button" class="cfu-b cfu-q" aria-expanded="' + (MORE === c.id) + '" onclick="CFU.more(\'' + id + '\')">More</button>' + doneBtn(c) + '</div>')
      + (MORE === c.id ? '<div class="cfu-more"><label>Need ' + needSel(c) + '</label><label>Owner ' + ownerSel(c) + '</label>' + moveHtml(r) + '</div>' : '') + '</div>';
  }
  function menu(label, key, labels, rows, pass, extra) {
    const v = F[key] || '';
    const count = k => rows.filter(r => pass(r, key) && (key === 'when' ? r.sec === k : key === 'who' ? r.who === k : key === 'need' ? (r.c.need || 'not_sure') === k
      : key === 'line' ? (r.c.line || 'MO') === k : k === 'mine' ? r.c.owner === me() : k === 'nobody' ? !r.c.owner : r.c.owner === k)).length;
    return '<label class="cfu-m' + (v ? ' on' : '') + '"><span>' + label + '</span><select onchange="CFU.pickF(\'' + key + '\',this.value)">'
      + '<option value="">' + (extra || 'All') + '</option>' + Object.keys(labels).map(k => '<option value="' + E(k) + '"' + (v === k ? ' selected' : '') + '>' + E(labels[k]) + ' (' + count(k) + ')</option>').join('') + '</select></label>';
  }

  /* ---------- the page ---------- */
  function draw() {
    const wrap = HOST; if (!wrap || !wrap.isConnected) return;
    if (!Q && !ERR) { wrap.innerHTML = '<div class="cfu"><div class="field-note">Loading Follow-ups…</div></div>'; return; }
    const st = (Q && Q.state) || {};
    const lastRun = st.last_run ? Date.parse(st.last_run) : 0;
    const banners = (!on() ? '<div class="cfu-banner cfu-practice"><b>Practice, switched off.</b> Only owners see this tab. Nobody\'s My Work has these as cards yet, and missed call cards work as before. '
        + 'When the rows look right, turn on Caring Companions Follow-ups on the Owners Hub Admin page.</div>' : '')
      + (ERR ? '<div class="cfu-banner cfu-bad"><b>Follow-ups could not load.</b> ' + E(ERR) + '</div>' : '')
      + (Q && st.last_error && (!st.last_error_at || Date.parse(st.last_error_at) >= lastRun - 60000) ? '<div class="cfu-banner cfu-bad"><b>Reading GoHighLevel failed ' + E(when(st.last_error_at)) + '.</b> ' + E(st.last_error) + ' Calls and texts since then may be missing here, so check GoHighLevel too.</div>'
        : Q && (!lastRun || Date.now() - lastRun > 20 * 60000) ? '<div class="cfu-banner cfu-bad"><b>' + (lastRun ? 'The Hub has not read GoHighLevel since ' + E(when(st.last_run)) + '.' : 'The Hub has not read GoHighLevel yet.') + '</b> Check GoHighLevel for calls and texts until this clears.</div>' : '');
    if (!Q) { wrap.innerHTML = '<div class="cfu">' + banners + '<button type="button" class="cfu-b" onclick="CFU.reload()">Try again</button></div>'; return; }
    const M = model(), rows = M.rows;
    const cnt = k => rows.filter(r => r.sec === k).length;
    const oldN = rows.filter(r => r.sec === 'today' && r.w.old).length;
    const nextLater = rows.filter(r => r.sec === 'later').map(r => r.c.later).sort()[0];
    const mineN = rows.filter(r => r.c.owner === M.mine).length;
    const tile = (k, sub, n, cls) => '<button type="button" class="cfu-tile ' + cls + (F.when === k || (k === 'mine' && F.owner === 'mine') ? ' on' : '') + '" onclick="CFU.tile(\'' + k + '\')"><b>' + n + '</b><span>' + E(k === 'mine' ? 'Yours' : WHEN[k]) + '</span><small>' + sub + '</small></button>';
    const open = rows.filter(r => r.sec !== 'later');
    const B = [['Families, clients and leads', open.filter(r => r.who === 'family').length, ''], ['Caregivers', open.filter(r => r.who === 'caregiver').length, ''],
      ['Applicants', open.filter(r => r.who === 'applicant').length, 'g'], ['Not known yet', open.filter(r => r.who === 'unknown').length, 'g'], ['Since yesterday or more', open.filter(r => r.w.old).length, 'r']];
    const top = Math.max(1, ...B.map(b => b[1]));
    const anyF = F.when || F.who || F.need || F.owner || F.line;
    const people = (Q.people || []).reduce((o, p) => { o[p.email] = p.name; return o; }, { mine: 'Mine', nobody: 'Nobody yet' });
    const needs = (Q.needs || []).reduce((o, n) => { o[n.key] = n.label; return o; }, {});
    const hasOK = rows.some(r => r.c.line === 'OK');
    const empty = rows.length ? 'Nothing here for these filters.' : 'Nothing waiting. Every call and text has been answered.';
    const voicemails = rows.filter(r => (r.c.events || []).some(e => e.kind === 'voicemail')).length;
    const closed = Q.closedToday || [];
    wrap.innerHTML = '<div class="cfu">' + banners
      + '<div class="cfu-head"><span class="cfu-sum">' + (rows.length ? rows.length + (rows.length === 1 ? ' call or text needs someone.' : ' calls and texts need someone.') : 'Nothing waiting. Every call and text has been answered.')
      + (rows.some(r => r.c.kind === 'who_is_this') ? ' ' + rows.filter(r => r.c.kind === 'who_is_this').length + ' from a number we do not know.' : '') + '</span>'
      + '<span class="cfu-sub">' + (lastRun ? 'Checked GoHighLevel ' + E(when(st.last_run)) : '') + ' <button type="button" class="cfu-link" onclick="CFU.reload()">Refresh</button></span></div>'
      + '<div class="cfu-glance">'
      + tile('urgent', F.when === 'urgent' ? 'Showing only these. Tap to show all.' : 'Tap to show only these', cnt('urgent'), 'cfu-t-red')
      + tile('today', oldN ? oldN + ' waiting since yesterday or before' : 'Tap to show only these', cnt('today'), 'cfu-t-gold')
      + tile('later', nextLater ? 'Next one ' + E(dayWord(nextLater)) : 'Nothing moved to later', cnt('later'), 'cfu-t-blue')
      + tile('mine', 'Owned by you. Tap to show only these.', mineN, 'cfu-t-teal')
      + '<div class="cfu-chart" role="img" aria-label="Who is waiting: ' + B.map(b => b[0] + ' ' + b[1]).join(', ') + '"><span class="cfu-ct">Who is waiting (open for today)</span>'
      + B.map(([l, n, k]) => '<div class="cfu-bar"><span>' + l + '</span><span class="cfu-tr"><span class="cfu-f' + (k ? ' cfu-' + k : '') + '" style="width:' + Math.round(n / top * 100) + '%"></span></span><b>' + n + '</b></div>').join('') + '</div></div>'
      + (rows.length ? '<div class="cfu-barrow">' + menu('When', 'when', WHEN, rows, M.pass) + menu('Who', 'who', WHO, rows, M.pass) + menu('Need', 'need', needs, rows, M.pass)
        + menu('Owner', 'owner', people, rows, M.pass, 'Everyone') + (hasOK ? menu('Line', 'line', { MO: 'Missouri', OK: 'Oklahoma' }, rows, M.pass, 'Both') : '')
        + (anyF ? '<button type="button" class="cfu-link" onclick="CFU.clear()">Clear filters</button>' : '')
        + '<span class="cfu-sums">' + (voicemails ? '<span><b>' + voicemails + '</b> ' + (voicemails === 1 ? 'voicemail' : 'voicemails') + '</span>' : '') + (hasOK ? '<span><b>' + rows.filter(r => r.c.line === 'OK').length + '</b> on the Oklahoma line</span>' : '') + '</span></div>' : '')
      + '<div class="cfu-wrap"><table class="cfu-t"><thead><tr><th class="cfu-n">Who</th><th>What came in</th><th class="cfu-sep">Need</th><th>Owner</th><th class="cfu-sep">When</th><th>Waiting</th>'
      + '<th class="cfu-sep">Call or text</th><th>Move it</th><th>Done</th></tr></thead><tbody>'
      + (M.shown.length ? M.shown.map(rowHTML).join('') : '<tr><td colspan="9" class="cfu-empty">' + empty + '</td></tr>') + '</tbody></table></div>'
      + '<div class="cfu-cards">' + (M.shown.length ? M.shown.map(cardHTML).join('') : '<div class="cfu-empty">' + empty + '</div>') + '</div>'
      + '<div class="cfu-key"><b class="cfu-redt">Red edge</b> care or safety · <b class="cfu-goldt">Gold edge</b> today · a row closes itself when someone calls or texts back from the office line, or answers when they call again · Call rings your phone first, from the office line</div>'
      + (closed.length ? '<details class="cfu-closed"><summary>' + closed.length + ' closed today</summary><div>' + closed.map(t => E(t.title) + ': ' + E(ownerName(t.done_by) || t.done_by || 'Someone') + ', ' + E(String(t.why || '').toLowerCase()) + ', ' + E(when(t.at))).join(' · ') + '</div></details>' : '')
      + '</div>';
  }
  function render(wrap) { HOST = wrap; css(); draw(); load(); }
  function count() {
    if (!Q || !Q.cards) return 0;
    return Q.cards.filter(c => c.urgent || !(c.later && c.later > (Q.today || ''))).length;
  }

  /* ---------- actions ---------- */
  async function set(id, action, extra) {
    if (BUSY) return; BUSY = id;
    try { await call(Object.assign({ action, id }, extra || {})); LATER = ''; await reloadQ(); }
    catch (e) { BUSY = ''; (typeof W.ccToast === 'function' ? W.ccToast : alert)('Could not save that: ' + e.message.replace(/\.$/, '') + '. Nothing changed.'); draw(); return; }
    BUSY = '';
  }
  async function reloadQ() { try { Q = await call({ action: 'queue' }); ERR = ''; } catch (e) { ERR = e.message; } draw(); }
  async function people() {
    if (PEOPLE) return;
    try { PEOPLE = (await call({ action: 'people' })).people || []; } catch (e) { PEOPLE = []; }
    document.querySelectorAll('.cfu datalist').forEach(dl => { dl.innerHTML = PEOPLE.map(p => '<option value="' + E(p.name + ' (' + p.role + ')') + '"></option>').join(''); });
    document.querySelectorAll('.cfu-who input[type=text]').forEach(i => { i.placeholder = 'Start typing a name'; });
  }
  async function pick(id, phone10) {
    const v = (document.getElementById('cfuWho_' + id) || {}).value || '';
    const p = (PEOPLE || []).find(x => (x.name + ' (' + x.role + ')') === v);
    const err = document.getElementById('cfuErr_' + id);
    if (!p) { if (err) err.textContent = 'Pick a name from the list.'; return; }
    try { await call({ action: 'pick', phone10, ref: p.ref, family: !!(document.getElementById('cfuFam_' + id) || {}).checked }); await reloadQ(); }
    catch (e) { if (err) err.textContent = e.message; }
  }
  async function notForUs(id, phone10) {
    const ok = typeof W.ccConfirm === 'function' ? await W.ccConfirm('Not for us?\n\nThe row closes, and the Hub remembers this number so its calls and texts never show here again.') : confirm('Not for us? The Hub will remember this number.');
    if (!ok) return;
    try { await call({ action: 'pick', phone10, ref: 'ignore' }); await reloadQ(); }
    catch (e) { const err = document.getElementById('cfuErr_' + id); if (err) err.textContent = e.message; }
  }
  function newLead(phone10) {
    if (typeof W.openCallCockpit === 'function') W.openCallCockpit();
    (typeof W.ccToast === 'function' ? W.ccToast : alert)('Their number is ' + pretty(phone10) + '. Once the lead is saved with it, this row names them within 5 minutes.');
  }

  /* ---------- look ---------- */
  function css() {
    if (document.getElementById('cfuCss')) return;
    const s = document.createElement('style'); s.id = 'cfuCss';
    s.textContent = `
.cfu{display:flex;flex-direction:column;gap:12px}
.cfu-banner{border-radius:12px;padding:10px 14px;font-size:14px;line-height:1.5}
.cfu-practice{background:#FDF3E2;color:#8A5A00}.cfu-bad{background:#FBE7E3;color:#9B2C1A}
.cfu-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}.cfu-sum{font-size:14.5px;color:#3d4b5a}
.cfu-glance{display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) minmax(0,1.6fr);gap:10px}
.cfu-tile{background:#fff;border-radius:14px;box-shadow:0 1px 3px rgba(14,56,96,.08);padding:10px 12px;display:flex;flex-direction:column;gap:2px;border:2px solid transparent;text-align:left;font:inherit;cursor:pointer}
.cfu-tile b{font-size:26px;font-weight:800;line-height:1.1}.cfu-tile span{font-weight:700;color:#0E3860;font-size:13.5px}.cfu-tile small{font-size:11.5px;color:#55677a}
.cfu-tile.on{border-color:#0E3860}.cfu-t-red b{color:#b42318}.cfu-t-gold b{color:#9a6a00}.cfu-t-blue b{color:#2b5c8a}.cfu-t-teal b{color:#2E8F8A}
.cfu-chart{background:#fff;border-radius:14px;box-shadow:0 1px 3px rgba(14,56,96,.08);padding:10px 14px;display:flex;flex-direction:column;gap:4px;min-width:0}
.cfu-ct{font-size:12.5px;font-weight:700;color:#55677a}.cfu-bar{display:grid;grid-template-columns:170px 1fr 24px;gap:8px;align-items:center;font-size:12.5px}.cfu-bar b{text-align:right}
.cfu-tr{height:10px;background:#edf1f3;border-radius:5px;overflow:hidden}.cfu-f{display:block;height:100%;border-radius:5px;background:#2E8F8A}.cfu-f.cfu-g{background:#c99a2e}.cfu-f.cfu-r{background:#b42318}
.cfu-barrow{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center}
.cfu-m{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;color:#55677a;background:#fff;border:1px solid #d6dfe3;border-radius:999px;padding:3px 4px 3px 11px}
.cfu-m select{font:inherit;font-size:13px;font-weight:600;color:#0E3860;border:none;background:transparent;padding:2px 4px;max-width:220px;cursor:pointer}
.cfu-m.on{background:#0E3860;border-color:#0E3860;color:#cfe0f0}.cfu-m.on select{color:#fff}.cfu-m.on select option{color:#16283a}
.cfu-sums{margin-left:auto;display:flex;gap:4px 14px;flex-wrap:wrap;font-size:13px;color:#55677a}
.cfu-link{font:inherit;font-size:12.5px;color:#0E3860;background:none;border:none;padding:0;text-decoration:underline;cursor:pointer}
.cfu-wrap{background:#fff;border-radius:14px;box-shadow:0 1px 3px rgba(14,56,96,.08);overflow-x:auto}
table.cfu-t{border-collapse:separate;border-spacing:0;width:100%;min-width:1120px;font-size:13px}
.cfu-t th,.cfu-t td{padding:8px 9px;border-bottom:1px solid #edf1f3;text-align:left;vertical-align:top;background:#fff}
.cfu-t thead th{font-size:11.5px;font-weight:700;color:#55677a;background:#f6f9fa}
.cfu-t .cfu-n{position:sticky;left:0;z-index:1;min-width:190px;max-width:230px;box-shadow:1px 0 0 #edf1f3}.cfu-t thead .cfu-n{z-index:2}
.cfu-t .cfu-sep{border-left:2px solid #e3eaed}
.cfu-r.cfu-now .cfu-n{box-shadow:inset 3px 0 0 #b42318,1px 0 0 #edf1f3}.cfu-r.cfu-today .cfu-n{box-shadow:inset 3px 0 0 #c99a2e,1px 0 0 #edf1f3}
.cfu-name{font-size:14px;font-weight:700;color:#0E3860}.cfu-sub{font-size:11.5px;color:#55677a;margin-top:2px}.cfu-dark{color:#16283a}
.cfu-ev{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:2px;max-width:320px}.cfu-ev li span{color:#55677a;margin-right:6px;white-space:nowrap}
.cfu-why{font-size:12px;color:#b42318;font-weight:700;margin-top:3px}
.cfu-sel{font:inherit;font-size:12.5px;font-weight:600;color:#16283a;background:#fff;border:1px solid #d6dfe3;border-radius:7px;padding:2px 4px;max-width:170px}
.cfu-pill{display:inline-block;font-size:11.5px;font-weight:800;border-radius:999px;padding:1px 8px;white-space:nowrap;align-self:flex-start}
.cfu-red{background:#fdecea;color:#b42318}.cfu-gold{background:#f6e7b8;color:#6b4e00}.cfu-blue{background:#e4edf6;color:#2b5c8a}
.cfu-redt{color:#b42318}.cfu-goldt{color:#9a6a00}.cfu-none{color:#b0b8bf;font-weight:700}
.cfu-acts{display:flex;gap:5px;flex-wrap:wrap;align-items:center}
.cfu-b{font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;background:#0E3860;color:#fff;border:1px solid #0E3860;border-radius:8px;padding:3px 10px;white-space:nowrap;text-decoration:none;display:inline-block}
.cfu-b.cfu-q{background:#fff;color:#0E3860;border-color:#c9d6db}.cfu-b.cfu-late{background:#b42318;border-color:#b42318}
.cfu-days{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.cfu-days button{font:inherit;font-size:12px;font-weight:700;cursor:pointer;background:#fff;color:#0E3860;border:1px solid #c9d6db;border-radius:7px;padding:2px 8px}
.cfu-who{display:flex;flex-direction:column;gap:6px;background:#f6f5f0;border-radius:10px;padding:8px 10px;min-width:300px}.cfu-who b{color:#0E3860;font-size:13px}
.cfu-who input[type=text]{font:inherit;font-size:13px;border:1px solid #d6dfe3;border-radius:7px;padding:3px 7px;min-width:180px}
.cfu .cfu-m select,.cfu select.cfu-sel{width:auto;margin:0}.cfu select.cfu-sel{min-width:130px}
.cfu .cfu-who label{display:flex;gap:6px;align-items:center;margin:0}.cfu .cfu-who label input{width:auto;margin:0}.cfu .cfu-who input[type=text]{width:auto;flex:1;margin:0}
.cfu-err{font-size:12px;color:#b42318}.cfu-empty{padding:16px;color:#55677a}.cfu-key{font-size:12px;color:#55677a}
.cfu-closed{font-size:13px;color:#55677a}.cfu-closed summary{cursor:pointer;font-weight:600}
.cfu-cards{display:none}
@media (max-width:1000px){.cfu-glance{grid-template-columns:repeat(2,minmax(0,1fr))}.cfu-chart{grid-column:1/-1}}
@media (max-width:760px){.cfu-wrap{display:none}.cfu-cards{display:flex;flex-direction:column;gap:8px}
 .cfu-card{background:#fff;border-radius:14px;box-shadow:0 1px 3px rgba(14,56,96,.08);padding:10px 12px;display:flex;flex-direction:column;gap:6px}
 .cfu-card.cfu-now{box-shadow:inset 3px 0 0 #b42318,0 1px 3px rgba(14,56,96,.08)}.cfu-card.cfu-today{box-shadow:inset 3px 0 0 #c99a2e,0 1px 3px rgba(14,56,96,.08)}
 .cfu-top{display:flex;justify-content:space-between;gap:8px}.cfu-more{display:flex;flex-direction:column;gap:6px;font-size:12.5px;font-weight:700;color:#55677a}
 .cfu-more label{display:flex;gap:6px;align-items:center}.cfu-who{min-width:0}.cfu-bar{grid-template-columns:120px 1fr 22px}}`;
    document.head.appendChild(s);
  }

  W.CFU = {
    on, visible, render, count, set, people, pick, notForUs, newLead, _model: model, _q: () => Q,
    label: () => on() ? 'Follow-ups' : 'Follow-ups (practice)',
    reload() { Q = null; ERR = ''; draw(); load(); },
    tile(k) { if (k === 'mine') F.owner = F.owner === 'mine' ? null : 'mine'; else F.when = F.when === k ? null : k; save(); draw(); },
    pickF(k, v) { F[k] = v || null; save(); draw(); },
    clear() { F = { when: null, who: null, need: null, owner: null, line: null }; save(); draw(); },
    later(id) { LATER = id || ''; draw(); },
    more(id) { MORE = MORE === id ? '' : id; draw(); },
  };
})(window);
