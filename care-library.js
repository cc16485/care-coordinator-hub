/* ============================================================================================================================
   CARE LIBRARY (Client Care → Care Library). Samantha 2026-10-12: "I would love to see this in it's own tab and make it a large
   library ... common senior issues, such as fall rise, transfers, different diets". Her rulings the same day:
     - its own sub-tab in Client Care, beside Clients and Team Builder;
     - she approves every video herself, here in the tab ("Waiting for your OK" → Approve or Remove); only approved videos in
       approved topics can go into a client's caregiver packet (the server enforces it, care-packet 'review');
     - the whole office can browse it; only an owner adds, changes or approves; caregivers still see only their client's packet;
     - after a fall caregivers NEVER lift (the "After a fall" topic carries that rule).
   CLIB.mount(boxId). Needs: callAction (the Hub's door to a function). Reads and writes only through care-packet.
   ============================================================================================================================ */
(function(){
  const esc = t => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(t) : String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  const GROUPS = [['bedbound', 'Bed-bound and hospice care'], ['moving', 'Moving and falls'], ['personal', 'Personal care'], ['eating', 'Eating and diets'], ['conditions', 'Health conditions'],
    ['signs', 'Warning signs and when to call'], ['other', 'Other']];
  const groupName = k => (GROUPS.find(g => g[0] === k) || GROUPS[GROUPS.length - 1])[1];
  const S = { box: null, list: [], canEdit: false, loading: false, err: '', msg: '', filter: 'all', q: '', open: {}, playing: {}, edit: null, busy: false };
  const vOk = v => !v.status || v.status === 'approved';
  const tWaiting = t => t.active !== false && !!t.pending;
  const waitingCount = () => S.list.reduce((n, t) => n + (t.active === false ? 0 : (t.pending ? 1 : 0) + (t.videos || []).filter(v => !vOk(v)).length), 0);

  async function call(body){
    const { status, data } = await callAction('care-packet', body);
    if (!data) throw new Error('The library service answered ' + status);
    if (status >= 400) throw new Error(data.error || ('The library service answered ' + status));
    return data;
  }
  async function load(){
    S.loading = true; S.err = ''; render();
    try { const d = await call({ action: 'library' }); S.list = d.library || []; S.canEdit = !!d.can_edit; }
    catch (e) { S.err = e.message; }
    S.loading = false; render();
  }

  function ytId(url){
    try { const u = new URL(url), h = u.hostname.replace(/^www\.|^m\./, '');
      const y = h === 'youtu.be' ? u.pathname.slice(1) : (h === 'youtube.com' ? (u.pathname === '/watch' ? u.searchParams.get('v') : ((u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/) || [])[1])) : '');
      return /^[A-Za-z0-9_-]{11}$/.test(y || '') ? y : null; } catch (e) { return null; }
  }
  function embedOf(url){
    const y = ytId(url); if (y) return 'https://www.youtube-nocookie.com/embed/' + y + '?rel=0';
    try { const u = new URL(url), h = u.hostname.replace(/^www\./, ''); const v = h === 'vimeo.com' ? (u.pathname.match(/^\/(\d{6,12})\/?$/) || [])[1] : '';
      return v ? 'https://player.vimeo.com/video/' + v + '?dnt=1' : null; } catch (e) { return null; }
  }
  const player = v => { const e = embedOf(v.url);
    return e ? '<div style="position:relative;width:100%;max-width:480px;padding-top:min(56.25%,270px);margin:6px 0;border-radius:8px;overflow:hidden;background:#000;"><iframe src="' + esc(e) + '" title="' + esc(v.title) + '" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>'
      : '<div class="field-note">Not a YouTube or Vimeo link, so caregivers get an "Open it" button. <a href="' + esc(/^https:\/\//.test(v.url) ? v.url : '#') + '" target="_blank" rel="noopener noreferrer">Open it</a></div>'; };
  const thumb = v => { const y = ytId(v.url);
    return '<div style="flex:none;width:96px;height:54px;border-radius:6px;overflow:hidden;background:#0E3860;display:flex;align-items:center;justify-content:center;">'
      + (y ? '<img src="https://i.ytimg.com/vi/' + y + '/mqdefault.jpg" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;">' : '<span style="color:#fff;font-size:11px;">video</span>') + '</div>'; };
  const chip = (txt, kind) => '<span style="font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap;'
    + (kind === 'wait' ? 'background:#FFF6E3;color:#92400E;border:1px solid #FFC671;' : kind === 'off' ? 'background:#F3F4F6;color:#6B7280;border:1px solid #E5E7EB;' : 'background:#ECFDF3;color:#166534;border:1px solid #BBF7D0;') + '">' + esc(txt) + '</span>';

  function shown(){
    const q = S.q.trim().toLowerCase();
    return S.list.filter(t => {
      if (S.filter === 'waiting') { if (!(t.active !== false && (t.pending || (t.videos || []).some(v => !vOk(v))))) return false; }
      else if (S.filter === 'retired') { if (t.active !== false) return false; }
      else { if (t.active === false) return false; if (S.filter !== 'all' && (t.category || 'other') !== S.filter) return false; }
      if (!q) return true;
      return [t.title, t.notes, t.flag, (t.videos || []).map(v => v.title + ' ' + (v.publisher || '')).join(' ')].join(' ').toLowerCase().includes(q);
    });
  }

  function topicHtml(t){
    const vids = t.videos || [], ok = vids.filter(vOk).length, open = !!S.open[t.key], wait = tWaiting(t), vWait = vids.length - ok;
    let h = '<div class="card" style="padding:12px 16px;margin-bottom:8px;" data-clib-topic="' + esc(t.key) + '">'
      + '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;cursor:pointer;" data-clib-toggle="' + esc(t.key) + '">'
      + '<b style="font-size:14.5px;color:var(--navy);">' + esc(t.title) + '</b>'
      + '<span class="field-note">' + ok + ' video' + (ok === 1 ? '' : 's') + (vWait ? ' · ' + vWait + ' waiting' : '') + '</span>'
      + (t.active === false ? chip('Removed', 'off') : wait ? chip('Waiting for your OK', 'wait') : chip('Approved', 'ok'))
      + (t.flag ? '<span title="' + esc(t.flag) + '" style="font-size:11.5px;font-weight:700;color:#B45309;">⚠ has a rule</span>' : '')
      + '<span style="flex:1;"></span><span class="field-note">' + (open ? 'Hide ▲' : 'Show ▼') + '</span></div>';
    if (!open) return h + '</div>';
    if (t.flag) h += '<div style="margin-top:10px;padding:8px 12px;border-radius:8px;background:#FFF6E3;border:1px solid #FFC671;font-size:13px;"><b>Rule:</b> ' + esc(t.flag) + '</div>';
    h += '<div style="margin-top:10px;font-size:13.5px;white-space:pre-wrap;">' + esc(t.notes || '') + '</div>';
    if (t.review_note && (wait || vWait)) h += '<div style="margin-top:8px;padding:8px 12px;border-radius:8px;background:#EEF4FF;border:1px solid #C7D7FE;font-size:12.5px;"><b>Note for you before you approve:</b> ' + esc(t.review_note) + '</div>';
    vids.forEach((v, i) => {
      const pk = t.key + '|' + i, play = !!S.playing[pk];
      h += '<div style="border-top:1px solid var(--border);margin-top:10px;padding-top:10px;">'
        + '<div style="display:flex;gap:12px;align-items:flex-start;">' + thumb(v)
        + '<div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:13.5px;">' + esc(v.title) + '</div>'
        + '<div class="field-note">' + esc([v.publisher, v.minutes ? v.minutes + ' min' : ''].filter(Boolean).join(' · ')) + '</div>'
        + (v.why && !vOk(v) ? '<div class="field-note" style="color:#1E4FB8;">Why it was picked: ' + esc(v.why) + '</div>' : '')
        + '<div style="display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap;">'
        + (vOk(v) ? chip('Approved', 'ok') : chip('Waiting for your OK', 'wait'))
        + '<button class="secondary" data-clib-play="' + esc(pk) + '">' + (play ? 'Close video' : '▶ Watch') + '</button>'
        + (S.canEdit && t.active !== false && !vOk(v) ? '<button class="primary" data-clib-ok="' + esc(pk) + '"' + (S.busy ? ' disabled' : '') + '>Approve</button>' : '')
        + (S.canEdit && t.active !== false ? '<button class="linklike" style="color:#B91C1C;" data-clib-rm="' + esc(pk) + '"' + (S.busy ? ' disabled' : '') + '>Remove</button>' : '')
        + '</div></div></div>' + (play ? player(v) : '') + '</div>';
    });
    if (!vids.length) h += '<div class="field-note" style="margin-top:8px;">No videos on this topic.</div>';
    if (S.canEdit) {
      h += '<div style="display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:10px;">';
      if (t.active === false) h += '<button class="secondary" data-clib-topic-ok="' + esc(t.key) + '">Bring it back</button>';
      else {
        if (wait) h += '<button class="primary" data-clib-topic-ok="' + esc(t.key) + '"' + (S.busy ? ' disabled' : '') + '>Approve this topic for packets</button>'
          + (ok ? '' : '<span class="field-note" style="color:#92400E;">No approved videos yet: caregivers would get the notes only.</span>');
        h += '<button class="secondary" data-clib-edit="' + esc(t.key) + '">Edit</button>'
          + '<button class="linklike" style="color:#B91C1C;" data-clib-topic-rm="' + esc(t.key) + '">Remove topic</button>';
      }
      h += '</div>';
    }
    return h + '</div>';
  }

  function editHtml(){
    const e = S.edit;
    return '<div class="card" style="padding:14px 18px;margin-bottom:12px;border:2px solid var(--navy);">'
      + '<b style="font-size:15px;color:var(--navy);">' + (e.is_new ? 'New topic' : 'Edit topic') + '</b>'
      + '<label style="font-size:12.5px;font-weight:700;display:block;margin-top:8px;">Title (what caregivers see)</label><input id="clib_e_title" maxlength="80" value="' + esc(e.title) + '" style="max-width:420px;">'
      + '<label style="font-size:12.5px;font-weight:700;display:block;margin-top:8px;">Group</label><select id="clib_e_cat" style="max-width:280px;">'
      + GROUPS.map(g => '<option value="' + g[0] + '"' + (g[0] === e.category ? ' selected' : '') + '>' + esc(g[1]) + '</option>').join('') + '</select>'
      + '<label style="font-size:12.5px;font-weight:700;display:block;margin-top:8px;">Rule caregivers must follow (optional, shown in a yellow box)</label><textarea id="clib_e_flag" rows="2" maxlength="400">' + esc(e.flag) + '</textarea>'
      + '<label style="font-size:12.5px;font-weight:700;display:block;margin-top:8px;">Notes caregivers read above the videos</label><textarea id="clib_e_notes" rows="4" maxlength="2000">' + esc(e.notes) + '</textarea>'
      + '<div style="font-size:12.5px;font-weight:700;margin-top:10px;">Videos and documents</div>'
      + e.videos.map((v, i) => '<div style="border-top:1px solid var(--border);padding:8px 0;">'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;"><input data-clib-ev="title" data-i="' + i + '" placeholder="Title" value="' + esc(v.title) + '" style="max-width:260px;">'
        + '<input data-clib-ev="url" data-i="' + i + '" placeholder="https://www.youtube.com/watch?v=..." value="' + esc(v.url) + '" style="max-width:340px;"></div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;"><input data-clib-ev="publisher" data-i="' + i + '" placeholder="Who made it" value="' + esc(v.publisher || '') + '" style="max-width:260px;">'
        + '<input data-clib-ev="minutes" data-i="' + i + '" placeholder="Minutes" value="' + esc(v.minutes || '') + '" style="max-width:100px;">'
        + (vOk(v) ? chip('Approved', 'ok') : chip('Waiting for your OK', 'wait'))
        + '<button class="linklike" style="color:#B91C1C;" data-clib-evrm="' + i + '">Remove</button></div></div>').join('')
      + '<button class="secondary" id="clib_e_add" style="margin-top:6px;">+ Add a video or document</button>'
      + '<div class="field-note">A video you add yourself counts as approved by you.</div>'
      + '<div style="display:flex;gap:8px;align-items:center;margin-top:12px;"><button class="primary" id="clib_e_save"' + (S.busy ? ' disabled' : '') + '>Save topic</button><button class="secondary" id="clib_e_cancel">Cancel</button>'
      + (S.err ? '<span class="field-note" style="color:#B91C1C;">' + esc(S.err) + '</span>' : '') + '</div></div>';
  }

  function render(){
    const box = S.box; if (!box) return;
    const live = S.list.filter(t => t.active !== false), nv = live.reduce((n, t) => n + (t.videos || []).filter(vOk).length, 0), w = waitingCount();
    let h = '<div style="margin-bottom:12px;"><h2 style="margin:2px 0 0;font-size:24px;font-weight:800;letter-spacing:-0.02em;color:var(--navy);">Care Library</h2>'
      + '<div class="field-note" style="font-size:13.5px;margin-top:3px;max-width:80ch;">How-to videos and notes for caregivers. To send some to a client\'s caregivers, open the client\'s Care tab and use the Caregiver packet. '
      + 'Only approved videos in approved topics can go in a packet.</div></div>';
    if (S.loading && !S.list.length) { box.innerHTML = h + '<div class="field-note">Loading the library…</div>'; return; }
    if (S.err && !S.list.length) { box.innerHTML = h + '<div class="field-note" style="color:#B91C1C;">Could not load the library: ' + esc(S.err) + '</div>'; return; }
    h += '<div class="field-note" style="margin-bottom:8px;">' + live.length + ' topics · ' + nv + ' approved videos' + (w ? ' · <b style="color:#92400E;">' + w + ' waiting for ' + (S.canEdit ? 'your' : 'Samantha\'s') + ' OK</b>' : '') + '</div>';
    const filters = [['all', 'All']].concat(w ? [['waiting', 'Waiting for ' + (S.canEdit ? 'your' : 'an') + ' OK']] : []).concat(GROUPS.filter(g => g[0] !== 'other' || live.some(t => (t.category || 'other') === 'other')))
      .concat(S.list.some(t => t.active === false) ? [['retired', 'Removed']] : []);
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:12px;">'
      + filters.map(f => '<button class="filter-pill' + (S.filter === f[0] ? ' active' : '') + '" data-clib-f="' + f[0] + '">' + esc(f[1]) + '</button>').join('')
      + '<span style="flex:1;"></span><input id="clib_q" placeholder="Search topics and videos…" value="' + esc(S.q) + '" style="max-width:240px;">'
      + (S.canEdit ? '<button class="primary" id="clib_new">+ New topic</button>' : '') + '</div>';
    if (S.msg) h += '<div class="field-note" style="color:#166534;margin-bottom:8px;">' + esc(S.msg) + '</div>';
    if (S.err && S.list.length && !S.edit) h += '<div class="field-note" style="color:#B91C1C;margin-bottom:8px;">' + esc(S.err) + '</div>';
    if (S.edit) h += editHtml();
    const rows = shown();
    if (!rows.length) h += '<div class="field-note">' + (S.filter === 'waiting' ? 'Nothing waiting. Everything has been looked at.' : 'No topics here.') + '</div>';
    GROUPS.forEach(g => {
      const inG = rows.filter(t => (t.category || 'other') === g[0]);
      if (!inG.length) return;
      h += '<div style="font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin:14px 0 6px;">' + esc(g[1]) + ' · ' + inG.length + '</div>' + inG.map(topicHtml).join('');
    });
    box.innerHTML = h; wire();
  }

  async function review(key, url, decision){
    if (S.busy) return; S.busy = true; S.err = ''; S.msg = ''; render();
    try { const d = await call({ action: 'review', key, url: url || undefined, decision }); S.list = d.library || S.list;
      S.msg = decision === 'approve' ? (url ? 'Approved.' : 'Topic approved. It can go in packets now.') : (url ? 'Video removed.' : 'Topic removed from the library.'); }
    catch (e) { S.err = e.message; }
    S.busy = false; render();
  }
  function keepEdit(){
    const e = S.edit, $ = id => document.getElementById(id); if (!e) return;
    e.title = ($('clib_e_title') || {}).value || ''; e.category = ($('clib_e_cat') || {}).value || 'other';
    e.flag = ($('clib_e_flag') || {}).value || ''; e.notes = ($('clib_e_notes') || {}).value || '';
    document.querySelectorAll('[data-clib-ev]').forEach(el => { const v = e.videos[+el.getAttribute('data-i')]; if (v) v[el.getAttribute('data-clib-ev')] = el.value; });
  }
  async function saveEdit(){
    keepEdit(); const e = S.edit; if (S.busy) return;
    if (!e.title.trim()) { S.err = 'The topic needs a title.'; render(); return; }
    const key = e.key || e.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'topic';
    const videos = e.videos.filter(v => String(v.url || '').trim()).map(v => ({ title: v.title, url: String(v.url).trim(), publisher: v.publisher, minutes: v.minutes,
      status: v.status === 'pending' ? 'pending' : 'approved', why: v.why || '' }));
    S.busy = true; S.err = ''; render();
    try { const d = await call({ action: 'topic_save', key, title: e.title, category: e.category, flag: e.flag, notes: e.notes, videos, is_new: !!e.is_new, active: true });
      S.list = d.library || S.list; S.edit = null; S.open[key] = true; S.msg = 'Saved.'; }
    catch (x) { S.err = x.message; }
    S.busy = false; render();
  }
  function wire(){
    const $ = id => document.getElementById(id), find = pk => { const [k, i] = pk.split('|'); const t = S.list.find(x => x.key === k); return [t, t && (t.videos || [])[+i]]; };
    document.querySelectorAll('[data-clib-f]').forEach(b => b.onclick = () => { S.filter = b.getAttribute('data-clib-f'); S.msg = ''; render(); });
    const q = $('clib_q'); if (q) q.oninput = () => { S.q = q.value; const pos = q.selectionStart; render(); const q2 = $('clib_q'); if (q2) { q2.focus(); try { q2.setSelectionRange(pos, pos); } catch (e) {} } };
    document.querySelectorAll('[data-clib-toggle]').forEach(el => el.onclick = () => { const k = el.getAttribute('data-clib-toggle'); S.open[k] = !S.open[k]; render(); });
    document.querySelectorAll('[data-clib-play]').forEach(b => b.onclick = () => { const k = b.getAttribute('data-clib-play'); S.playing[k] = !S.playing[k]; render(); });
    document.querySelectorAll('[data-clib-ok]').forEach(b => b.onclick = () => { const [t, v] = find(b.getAttribute('data-clib-ok')); if (t && v) review(t.key, v.url, 'approve'); });
    document.querySelectorAll('[data-clib-rm]').forEach(b => b.onclick = () => { const [t, v] = find(b.getAttribute('data-clib-rm'));
      if (t && v && confirm('Remove "' + v.title + '" from "' + t.title + '"?')) review(t.key, v.url, 'remove'); });
    document.querySelectorAll('[data-clib-topic-ok]').forEach(b => b.onclick = () => review(b.getAttribute('data-clib-topic-ok'), null, 'approve'));
    document.querySelectorAll('[data-clib-topic-rm]').forEach(b => b.onclick = () => { const t = S.list.find(x => x.key === b.getAttribute('data-clib-topic-rm'));
      if (t && confirm('Remove the topic "' + t.title + '"? Packets that already have it keep it.')) review(t.key, null, 'remove'); });
    document.querySelectorAll('[data-clib-edit]').forEach(b => b.onclick = () => { const t = S.list.find(x => x.key === b.getAttribute('data-clib-edit')); if (!t) return;
      S.edit = { key: t.key, is_new: false, title: t.title, category: t.category || 'other', flag: t.flag || '', notes: t.notes || '', videos: (t.videos || []).map(v => Object.assign({}, v)) }; S.err = ''; render(); window.scrollTo(0, 0); });
    const nw = $('clib_new'); if (nw) nw.onclick = () => { S.edit = { key: '', is_new: true, title: '', category: S.filter && GROUPS.some(g => g[0] === S.filter) ? S.filter : 'other', flag: '', notes: '', videos: [{ title: '', url: '', publisher: '', minutes: '' }] }; S.err = ''; render(); };
    const ad = $('clib_e_add'); if (ad) ad.onclick = () => { keepEdit(); S.edit.videos.push({ title: '', url: '', publisher: '', minutes: '' }); render(); };
    document.querySelectorAll('[data-clib-evrm]').forEach(b => b.onclick = () => { keepEdit(); S.edit.videos.splice(+b.getAttribute('data-clib-evrm'), 1); render(); });
    const sv = $('clib_e_save'); if (sv) sv.onclick = saveEdit;
    const cn = $('clib_e_cancel'); if (cn) cn.onclick = () => { S.edit = null; S.err = ''; render(); };
  }
  window.CLIB = { mount: function(id){ S.box = document.getElementById(id); if (!S.box) return; S.msg = ''; load(); } };
})();
