/* =============================================================================
   CAREGIVER PREVIEW TAB (Samantha, 2026-10-24): on every client profile, the friendly profile caregivers see when they're
   offered a shift (Cara's shift page and the Booking App's visit offers). Coordinators keep it current during new-client
   setup and whenever preferences or needs change.
   - Introduction (About, What they enjoy): written here. Care summary: read from the care plan, never typed; the office only
     chooses whether to share it and which items to leave out.
   - Every save is a draft; caregivers see only the approved version. Approvers: owner or care coordinator role. A care change
     that shows caregivers more needs a second person (the server enforces it: caregiver-preview function).
   - The care plan changed after approval: the care summary is held back from caregivers and the tab says review.
   - Preview as Caregiver works with no open shift (shift.html on a sample shift), approved and draft side by side.
   Switch: ops_settings.caregiver_preview_live. Off (practice): owners see the tab, marked practice; shift pages and the
   Booking App still read Family & Contacts. On: everyone sees the tab, and caregivers see only what is approved here.
   ============================================================================= */
(function () {
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let ctx = { ax: '', lead: '', name: '' }, V = null, busy = false, showPreview = false, msg = '';
  let ai = null, aiMsg = '';   /* the AI draft waiting in the boxes, not saved (Life Story step 2, 2026-10-24) */
  const aiOn = () => !!((typeof DATA !== 'undefined' && DATA.ops_settings) || {}).cgp_ai_draft_live || owner();
  const live = () => !!((typeof DATA !== 'undefined' && DATA.ops_settings) || {}).caregiver_preview_live;
  const owner = () => (typeof CC_ROLES !== 'undefined' && Array.isArray(CC_ROLES) && CC_ROLES.includes('owner_admin'));
  const visible = () => live() || owner();
  const first = () => String(ctx.name || 'this client').split(' ')[0];
  const when = (iso) => { try { const d = new Date(iso); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };
  const day = (iso) => { try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch (e) { return ''; } };

  async function callFn(body) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session || !session.access_token) throw new Error('Sign in to the hub first.');
    const r = await fetch(CONFIG.supabase_url + '/functions/v1/caregiver-preview', { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ axiscare_client_id: ctx.ax || undefined, lead_id: ctx.lead || undefined, client_name: ctx.name || undefined }, body)) });
    const out = await r.json().catch(() => null);
    if (!r.ok || !out || out.error) throw new Error((out && out.error) || ('The server answered ' + r.status));
    return out;
  }
  const host = () => document.getElementById('cgpHost');

  /* called when a profile opens: remember the client, show or hide the tab */
  function mount(p) {
    ctx = { ax: String((p && p.ax) || ''), lead: String((p && p.lead && p.lead.id) || (p && p.lead_id) || ''), name: String((p && p.name) || '') };
    V = null; showPreview = false; msg = ''; ai = null; aiMsg = '';
    const b = document.querySelector('#cpTabs .cp-tab[data-cp="cgprev"]'); if (b) b.style.display = visible() ? '' : 'none';
    const h = host(); if (h) h.innerHTML = '';
  }
  async function load() {
    const h = host(); if (!h) return;
    if (!ctx.ax && !ctx.lead) { h.innerHTML = '<div class="card" style="padding:14px 16px;">This profile has no client to attach a Caregiver Preview to yet.</div>'; return; }
    if (!V) h.innerHTML = '<div class="card" style="padding:14px 16px;color:var(--text-muted);">Loading the Caregiver Preview…</div>';
    try { V = await callFn({ action: 'get' }); render(); }
    catch (e) { h.innerHTML = '<div class="card" style="padding:14px 16px;color:var(--red);">The Caregiver Preview could not load: ' + E(e.message) + '</div>'; }
  }

  const TONE = { approved: ['#E6F4EA', '#1E6B3A'], draft: ['#FFF4E0', '#8A5A00'], review: ['#FBE9E6', '#A23B2A'], none: ['#EEF2F6', '#4B5563'] };
  function statusBar() {
    const st = V.state, t = TONE[st.tone] || TONE.none, can = V.can;
    const last = st.last_approved ? 'Last approved ' + day(st.last_approved.at) + ' by ' + E(st.last_approved.by) + '.' : (V.intro.carried ? 'In use now: carried over from Family & Contacts.' : 'Nothing approved yet. Shift offers show just the shift until something is approved.');
    const approveBtn = (can.approve_intro || can.approve_care) ? '<button type="button" class="btn" style="padding:6px 14px;" onclick="CGP.approve()"' + (busy ? ' disabled' : '') + '>Approve</button>' : '';
    return '<div style="display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;padding:12px 14px;border-radius:12px;background:' + t[0] + ';">'
      + '<span style="font-size:12.5px;font-weight:800;border-radius:999px;padding:3px 11px;background:' + t[1] + ';color:#fff;">' + E(st.label) + '</span>'
      + '<span style="font-size:13px;flex:1;min-width:200px;">' + last + (st.intro_pending || st.care_pending ? ' Caregivers keep seeing the approved version until the changes are approved.' : '') + '</span>'
      + '<button type="button" class="secondary" style="padding:6px 12px;" onclick="CGP.preview()">' + (showPreview ? 'Hide preview' : 'Preview as Caregiver') + '</button>' + approveBtn + '</div>'
      + (can.why && (st.intro_pending || st.care_pending) ? '<div class="field-note" style="margin-top:6px;">' + E(can.why) + (can.why.indexOf('someone else') >= 0 && V.approvers.length ? ' Approvers: ' + E(V.approvers.join(', ')) + '.' : '') + '</div>' : '')
      + (msg ? '<div style="margin-top:6px;font-size:13px;font-weight:600;color:var(--navy);">' + E(msg) + '</div>' : '');
  }
  function previewBox() {
    if (!showPreview) return '';
    const base = 'shift.html?preview=1' + (ctx.ax ? '&client=' + encodeURIComponent(ctx.ax) : '') + (ctx.lead ? '&lead=' + encodeURIComponent(ctx.lead) : '');
    const both = V.state.intro_pending || V.state.care_pending;
    const frame = (v, label) => '<div style="display:grid;gap:6px;justify-items:center;min-width:0;"><div style="font-size:12.5px;font-weight:800;color:var(--navy);">' + label + '</div>'
      + '<iframe title="' + label + '" src="' + base + '&v=' + v + '" style="width:100%;max-width:380px;height:720px;border:1px solid var(--border);border-radius:22px;background:#fff;"></iframe></div>';
    return '<div style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;">'
      + frame('approved', both ? 'What caregivers see now (approved)' : 'What caregivers see') + (both ? frame('draft', 'After approval (draft)') : '') + '</div>'
      + '<div class="field-note" style="margin-top:6px;">A sample shift (next Saturday, 8am to 12pm). On a real offer, the day, time and town are the real shift\'s.</div>';
  }
  function aiBox() {
    if (!aiOn()) return '';
    const btn = '<button type="button" class="secondary" style="padding:5px 12px;font-size:12.5px;" onclick="CGP.draft()"' + (busy ? ' disabled' : '') + '>Draft it from the Life Story</button>'
      + (((typeof DATA !== 'undefined' && DATA.ops_settings) || {}).cgp_ai_draft_live ? '' : ' <span class="field-note" style="color:#92400E;">Practice: only owners see this.</span>');
    if (!ai) return '<div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' + btn + (aiMsg ? '<span class="field-note">' + E(aiMsg) + '</span>' : '') + '</div>';
    const src = (ai.sources || []).map((s) => E(s.label) + ' (' + E(s.via === 'profile' ? 'profile' : s.via) + (s.by ? ', ' + E(String(s.by).split(' ')[0]) : '') + ')').join(' · ');
    return '<div style="margin-top:8px;padding:10px 12px;border-radius:10px;background:#FFF4E0;font-size:13px;display:grid;gap:4px;">'
      + '<b style="color:#8A5A00;">AI draft, not saved yet.</b> <span>Read it, change anything, then Save draft. It still needs approval before caregivers see it.</span>'
      + (src ? '<span class="field-note">Drawn only from the Life Story: ' + src + '</span>' : '')
      + ((ai.left_out || []).length ? '<span class="field-note">Left out on purpose: ' + E(ai.left_out.join(', ')) + '</span>' : '')
      + ((ai.dropped || []).length ? '<span class="field-note">Not used, because they aren\'t in the Life Story: ' + E(ai.dropped.join(', ')) + '</span>' : '')
      + '<span><a href="javascript:void(0)" onclick="CGP.dropDraft()" style="font-size:12.5px;">Discard the AI draft</a></span></div>';
  }
  function introCard() {
    const d0 = V.intro.draft, d = ai ? { about: ai.about, enjoys: ai.enjoys } : d0, a = V.intro.approved, aboutChanged = (d.about || '') !== (a.about || ''), enjChanged = (d.enjoys || []).join('|') !== (a.enjoys || []).join('|');
    const tag = (on) => on ? ' <span style="font-size:11px;font-weight:800;color:#8A5A00;">· draft, not approved yet</span>' : '';
    return '<div class="card" style="padding:14px 16px;margin-top:12px;">'
      + '<div style="font-weight:800;color:var(--navy);">Introduction</div>'
      + '<div class="field-note">A few friendly words so a caregiver gets to know ' + E(first()) + '. First name only. No address, diagnoses or family matters.</div>'
      + aiBox()
      + '<label style="display:block;margin-top:10px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);">About ' + E(first()) + tag(aboutChanged) + '</label>'
      + '<textarea id="cgpAbout" maxlength="400" rows="3" style="width:100%;margin-top:4px;font:inherit;font-size:14px;" placeholder="For example: ' + E(first()) + ' taught school for 30 years and loves a good laugh.">' + E(d.about || '') + '</textarea>'
      + '<label style="display:block;margin-top:10px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);">What ' + E(first()) + ' enjoys' + tag(enjChanged) + '</label>'
      + '<input id="cgpEnjoys" type="text" style="width:100%;margin-top:4px;" value="' + E((d.enjoys || []).join(', ')) + '" placeholder="Gardening, Old movies, Card games">'
      + '<div class="field-note">Up to 6, separated by commas.</div>'
      + '<div style="margin-top:10px;"><button type="button" class="btn" style="padding:6px 14px;" onclick="CGP.saveIntro()"' + (busy ? ' disabled' : '') + '>Save draft</button></div></div>';
  }
  function careCard() {
    const c = V.care;
    const head = '<div class="card" style="padding:14px 16px;margin-top:12px;"><div style="font-weight:800;color:var(--navy);">Care summary</div>'
      + '<div class="field-note">Comes from the care plan, so it is always the care plan\'s words. To change a need or a skill, update the care plan. Here you only choose whether caregivers see it on shift offers, and leave out anything they shouldn\'t see before they\'re assigned. Matching always uses the full, current care plan.</div>';
    if (!c.readable) return head + '<div class="field-note" style="margin-top:10px;">' + (V.in_axiscare || !ctx.ax ? (ctx.ax ? 'The care plan can\'t be read right now. Try again in a minute.' : 'Available once ' + E(first()) + ' is in AxisCare.') : 'The care plan can\'t be read right now. Try again in a minute.') + '</div></div>';
    const review = c.review ? '<div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#FBE9E6;color:#A23B2A;font-size:13px;font-weight:600;">The care plan changed since this summary was approved. Caregivers see no care details until someone looks and approves it again.</div>' : '';
    const toggle = '<label style="display:flex;gap:10px;align-items:flex-start;margin-top:10px;font-size:14px;"><input type="checkbox" style="width:auto;margin-top:3px;"' + (c.draft_on ? ' checked' : '') + (busy ? ' disabled' : '') + ' onchange="CGP.share(this.checked)"><span><b>Share a care summary on shift offers</b>' + (c.draft_on !== c.approved_on ? ' <span style="font-size:11px;font-weight:800;color:#8A5A00;">· draft, not approved yet</span>' : '') + '</span></label>';
    const G = { help: 'Helps with', needs: 'Skills needed', level: 'Care level', home: 'In the home' };
    const rows = c.draft_on ? Object.keys(G).map((g) => { const its = c.items.filter((x) => x.group === g); if (!its.length) return '';
      return '<div style="display:flex;flex-wrap:wrap;gap:4px 14px;padding:6px 0;border-top:1px solid var(--border);"><span style="min-width:110px;font-size:12.5px;color:var(--text-muted);">' + G[g] + '</span><span style="display:flex;flex-wrap:wrap;gap:4px 14px;flex:1;">'
        + its.map((x) => '<label style="display:inline-flex;gap:6px;align-items:center;font-size:13.5px;"><input type="checkbox" data-cgpk="' + E(x.key) + '" style="width:auto;"' + (x.draft ? ' checked' : '') + (busy ? ' disabled' : '') + ' onchange="CGP.items()">' + E(x.label) + (c.approved_on && x.draft && !x.approved ? ' <span style="font-size:11px;font-weight:800;color:#8A5A00;">new</span>' : '') + '</label>').join('') + '</span></div>'; }).join('') : '';
    const none = c.draft_on && !c.items.length ? '<div class="field-note" style="margin-top:8px;">The care plan has nothing to show yet.</div>' : '';
    const two = '<div class="field-note" style="margin-top:8px;">Showing caregivers more care detail needs a second person to approve.</div>';
    return head + review + toggle + (rows ? '<div style="margin-top:8px;">' + rows + '</div>' : '') + none + (c.draft_on ? two : '') + '</div>';
  }
  /* THE FAMILY'S OWN PROFILE (2026-10-25, her rule): the family writes it in the Booking App and it shows on Booking App offers.
     It is separate from this Caregiver Preview (shifts): nothing here changes it, and it never changes this. "Use the family's
     words" copies it into this draft, which is approved as usual. */
  function famProfileCard() {
    const f = V.family; if (!f) return '';
    const rows = [['About', f.about]].concat((f.life || []).map((x) => [x.label, x.text])).concat([['Enjoys', (f.enjoys || []).join(', ')]]).filter((r) => r[1]);
    const hist = (f.history || []).slice(0, 5).map((h) => '<div style="font-size:12px;padding:3px 0;border-top:1px dashed var(--border);"><b>' + E(h.by) + '</b> ' + E(when(h.at)) + ': '
      + (h.changes || []).map((c) => E(c.field) + (c.before ? ' (was “' + E(c.before) + '”)' : '')).join('; ') + '</div>').join('');
    return '<div class="card" style="padding:14px 16px;margin-top:12px;border-color:#BFE3DD;background:#F4FAF9;"><div style="font-weight:800;color:var(--navy);font-size:15px;">The family\'s Booking App profile</div>'
      + '<div class="field-note" style="margin:2px 0 8px;">Written by ' + E(f.updated_by || 'the family') + ', ' + E(when(f.updated_at)) + '. Caregivers see this on visits the family requests in the Booking App. It is separate from your Caregiver Preview, which shows on shifts; neither changes the other.</div>'
      + rows.map((r) => '<div style="font-size:13.5px;margin-top:4px;"><span class="field-note">' + E(r[0]) + ':</span> ' + E(r[1]) + '</div>').join('')
      + '<div style="margin-top:10px;"><button type="button" class="secondary" style="padding:5px 12px;" onclick="CGP.useFamily()"' + (busy ? ' disabled' : '') + '>Use the family\'s words</button>'
      + ' <span class="field-note">Copies them into your draft below. Approve it to use it on shifts.</span></div>'
      + (hist ? '<details style="margin-top:8px;"><summary class="field-note" style="cursor:pointer;">Recent changes by the family</summary>' + hist + '</details>' : '') + '</div>';
  }
  /* FROM THE FAMILY (2026-10-25): suggestions sent from the Booking App's "What caregivers see". Nothing changes by itself:
     use it by editing the draft below and approving as usual, then mark it Used; or Not using it. */
  function familyCard() {
    const list = V.suggestions || [];
    if (!list.length) return '';
    return '<div class="card" style="padding:14px 16px;margin-top:12px;border-color:#F3D9B5;background:#FFFBF4;"><div style="font-weight:800;color:var(--navy);font-size:15px;">From the family (' + list.length + ')</div>'
      + '<div class="field-note" style="margin:2px 0 8px;">Sent from the Booking App. Caregivers don\'t see these. To use one, change the draft below and approve it as usual.</div>'
      + list.map((x) => '<div style="padding:8px 0;border-top:1px dashed var(--border);"><div style="font-size:14px;white-space:pre-wrap;">' + E(x.text) + '</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px;"><span class="field-note" style="flex:1;">' + E(x.contact_name || 'A family member') + ', ' + E(when(x.created_at)) + '</span>'
        + '<button type="button" class="secondary" style="padding:5px 12px;" onclick="CGP.suggestion(' + Number(x.id) + ',true)"' + (busy ? ' disabled' : '') + '>Used it</button>'
        + '<button type="button" class="secondary" style="padding:5px 12px;" onclick="CGP.suggestion(' + Number(x.id) + ',false)"' + (busy ? ' disabled' : '') + '>Not using it</button></div></div>').join('') + '</div>';
  }
  function historyCard() {
    if (!V.history.length) return '';
    return '<div class="card" style="padding:12px 16px;margin-top:12px;"><div style="font-weight:800;color:var(--navy);font-size:13.5px;">Recent changes</div>'
      + V.history.map((h) => '<div style="font-size:12.5px;padding:4px 0;border-top:1px dashed var(--border);"><b>' + E(h.by) + '</b> ' + E(h.what) + ' <span class="field-note">' + E(when(h.at)) + '</span></div>').join('') + '</div>';
  }
  function render() {
    const h = host(); if (!h || !V) return;
    h.innerHTML = (V.live ? '' : '<div class="card" style="padding:10px 14px;margin-bottom:10px;background:#FFFBF4;border-color:#F3D9B5;font-size:13px;"><b>Practice.</b> Caregivers don\'t see this tab\'s version yet. Shift offers still use the About on Family &amp; Contacts until the Caregiver Preview switch is on.</div>')
      + '<div class="card" style="padding:14px 16px;"><div style="font-weight:800;color:var(--navy);font-size:15px;">What caregivers see about ' + E(first()) + '</div>'
      + '<div class="field-note" style="margin:2px 0 10px;">Shown when a caregiver is offered a shift with ' + E(first()) + ' (Cara\'s shift page and the Booking App). Incomplete is fine: offers still go out with just the shift.</div>'
      + statusBar() + previewBox() + '</div>' + famProfileCard() + familyCard() + introCard() + careCard() + historyCard();
  }

  async function act(body, done) {
    if (busy) return; busy = true; msg = ''; render();
    try { V = await callFn(body); msg = done || ''; }
    catch (e) { msg = 'Not saved: ' + e.message; }
    busy = false; render();
  }
  function saveIntro() {
    const about = (document.getElementById('cgpAbout') || {}).value || '';
    const enjoys = String((document.getElementById('cgpEnjoys') || {}).value || '').split(',').map((x) => x.trim()).filter(Boolean);
    const fromAi = !!ai; ai = null; aiMsg = '';
    return act({ action: 'save', about, enjoys, ai_draft: fromAi }, 'Draft saved. Approve it when it\'s ready.');
  }
  const share = (on) => act({ action: 'save', share_care: !!on }, on ? 'Draft saved: care summary on.' : 'Draft saved: care summary off.');
  function items() {
    const hidden = [...document.querySelectorAll('#cgpHost input[data-cgpk]')].filter((x) => !x.checked).map((x) => x.dataset.cgpk);
    return act({ action: 'save', hidden }, 'Draft saved.');
  }
  async function approve() {
    const ok = typeof ccConfirm === 'function' ? await ccConfirm('Approve the Caregiver Preview for ' + first() + '?\n\n' + (V.live ? 'Caregivers will see it on shift offers from now on.' : 'It is used on shift offers once the Caregiver Preview switch is on.')) : true;
    if (!ok) return;
    if (busy) return; busy = true; msg = ''; render();
    try { V = await callFn({ action: 'approve' }); msg = 'Approved: ' + (V.approved || []).join(' and ') + '.' + (V.note ? ' ' + V.note : ''); }
    catch (e) { msg = e.message; }
    busy = false; render();
  }
  function preview() { showPreview = !showPreview; render(); }
  /* the AI draft: from the Life Story only, into the boxes, nothing saved */
  async function draft() {
    if (busy) return; busy = true; aiMsg = 'Drafting from the Life Story…'; render();
    try { const r = await callFn({ action: 'draft' }); if (r.ok && r.draft) { ai = r.draft; aiMsg = ''; } else { ai = null; aiMsg = r.why || 'No draft.'; } }
    catch (e) { ai = null; aiMsg = e.message; }
    busy = false; render();
  }
  function dropDraft() { ai = null; aiMsg = ''; render(); }
  const useFamily = () => act({ action: 'use_family_words' }, 'Copied the family\'s words into your draft. Approve it to use it on shifts.');
  const suggestion = (id, used) => act({ action: 'suggestion_close', id, used: !!used }, used ? 'Marked as used.' : 'Marked as not used.');

  window.CGP = { mount, load, visible, saveIntro, share, items, approve, preview, draft, dropDraft, suggestion, useFamily };
})();
