/* =====================================================================================================================
   CAREGIVER PACKET (Step 1, Samantha "yes start step 1", 2026-10-12). A card on the client profile's Care tab: short
   notes about the client plus how-to topics from the library (each with the videos she approved). When it is ready, the
   office makes each caregiver's OWN link; Step 2 (2026-10-12) texts it from here: Send / Remind / Send update open the exact
   text first and a person presses Send (Cara never texts on her own; switch ops_settings.care_packet_send_live). The card shows who has
   tapped "I watched it and understand" for the current version. An edited packet is a new version and asks everyone
   again. Nothing here texts anyone. Health details live only behind the link, never in a text.
   CPK.mount(boxId). Needs: callAction (the Hub's door to a function), CP (the open client profile), DATA.caregivers.
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = t => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(t) : String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  const S = { box: null, packet: null, topics: [], recipients: [], draft: null, msg: '', err: '', busy: false, link: null, loadErr: '', send: null, up: null,
    retired: [], canLib: false, sugg: null };
  /* 2026-10-12 fix: the open client is a page-level const CP (index.html), NOT window.CP, so window.CP was always
     undefined and the card drew nothing for every client. Read the page-level one (same fix as window.CN). */
  const cp = () => { try { return (typeof CP !== 'undefined' && CP) || window.CP || null; } catch (e) { return window.CP || null; } };
  const who = () => { const c = cp(); return { ax: (c && c.ax) || '', lead_id: (c && c.lead && c.lead.id) || '' }; };
  const firstName = () => {
    const c = cp(), l = c && c.lead;
    if (l && l.client_first_name && !l.client_name_not_provided) return String(l.client_first_name).trim();
    const r = c && c.r; return r && r.client_name ? String(r.client_name).trim().split(/\s+/)[0] : '';
  };
  const day = iso => { try { return new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' }); } catch (e) { return ''; } };
  async function call(body){
    const { status, data } = await callAction('care-packet', body);
    if (!data) throw new Error('The packet service answered ' + status);
    if (status >= 400) { const e = new Error(data.error || ('The packet service answered ' + status)); e.outcome = data.outcome; throw e; }
    return data;
  }
  function fresh(){
    const p = S.packet;
    S.draft = p ? { client_first: p.client_first, about: p.about, items: (p.items || []).map(x => ({ topic: x.topic, notes: x.notes })), ready: !!p.ready }
                : { client_first: firstName(), about: '', items: [], ready: false };
  }
  async function load(){
    S.loadErr = ''; S.link = null; S.send = null;
    try { const d = await call(Object.assign({ action: 'get' }, who())); S.packet = d.packet; S.topics = d.topics || []; S.recipients = d.recipients || [];
      S.retired = d.retired_in_packet || []; S.canLib = !!d.can_edit_library; fresh(); }
    catch (e) { S.loadErr = e.message; }
  }
  /* Step 3 (2026-10-12): who is coming up with this client in the next 14 days (AxisCare, read live), and where each
     stands. Loaded after the card draws, so a slow AxisCare never holds up the packet itself. */
  async function loadUpcoming(){
    if (!S.packet || !S.packet.ready) { S.up = null; return; }
    S.up = { loading: true };
    try { S.up = await call({ action: 'upcoming', packet_id: S.packet.id }); } catch (e) { S.up = { outcome: 'unreadable', error: e.message, upcoming: [] }; }
    render();
  }
  const UP_WORDS = { confirmed: ['✓ confirmed', '#166534'], older: ['confirmed an older version', '#92400E'], texted: ['texted, not confirmed', '#92400E'], link_only: ['link made, not texted', '#92400E'], none: ['no packet sent', '#B91C1C'] };
  function upcomingHtml(){
    const u = S.up; if (!u) return '';
    const head = '<div style="margin-top:10px;"><b style="font-size:13px;color:var(--navy);">Coming up in the next 14 days</b>';
    if (u.loading) return head + '<div class="field-note">Checking the AxisCare schedule…</div></div>';
    if (u.outcome === 'not_in_axiscare') return head + '<div class="field-note">Once they are an AxisCare client, the caregivers on their schedule show here.</div></div>';
    if (u.outcome !== 'ok') return head + '<div class="field-note" style="color:#B91C1C;">' + esc(u.error || 'AxisCare could not be read.') + '</div></div>';
    if (!(u.upcoming || []).length) return head + '<div class="field-note">Nobody is on their schedule in the next 14 days.</div></div>';
    const when = iso => { try { return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };
    return head + u.upcoming.map(x => { const w = UP_WORDS[x.standing] || [x.standing, '#6B7280'];
      return '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;padding:5px 0;border-top:1px solid var(--border);font-size:13px;"><b>' + esc(x.caregiver_name) + '</b>'
        + '<span class="field-note">next visit ' + esc(when(x.next_start)) + '</span><span style="color:' + w[1] + ';font-weight:700;">' + esc(w[0]) + '</span>'
        + (x.standing === 'confirmed' ? '' : '<button class="linklike" data-cpk-send="' + esc(x.caregiver_axiscare_id) + '"' + (S.busy || dirty() ? ' disabled' : '') + '>' + (x.standing === 'older' ? 'Send update' : x.standing === 'texted' ? 'Remind' : 'Text it') + '</button>')
        + '</div>'; }).join('') + '</div>';
  }
  const dirty = () => { const p = S.packet; if (!p) return !!(S.draft.about || S.draft.items.length);
    return JSON.stringify([S.draft.client_first, S.draft.about, S.draft.items, S.draft.ready]) !== JSON.stringify([p.client_first, p.about, (p.items || []).map(x => ({ topic: x.topic, notes: x.notes })), !!p.ready]); };

  function render(){
    const box = S.box; if (!box) return;
    if (!who().ax && !who().lead_id) { box.innerHTML = ''; return; }
    let h = '<div class="card" style="padding:14px 18px;margin-bottom:12px;">'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><b style="font-size:15px;color:var(--navy);">🎬 Caregiver packet</b><span style="flex:1;"></span>'
      + (S.packet ? '<span class="field-note">' + (S.packet.ready ? 'Ready' : 'Draft') + ' · version ' + esc(S.packet.version) + '</span>' : '')
      + '<button class="linklike" id="cpk_lib_open">Open the Care Library</button></div>';   /* the library lives in its own tab now (2026-10-12) */
    if (S.loadErr) { box.innerHTML = h + '<div class="field-note" style="color:#B91C1C;">Could not load the packet: ' + esc(S.loadErr) + '</div></div>'; return; }
    const d = S.draft;
    h += '<div class="field-note" style="margin-bottom:8px;">Videos and short notes for the caregivers who work with this client. Each caregiver gets their own link and taps "I watched it and understand". Health details stay behind the link, never in a text.</div>'
      + '<label style="font-size:12.5px;font-weight:700;">Client\'s first name (as caregivers will see it)</label><input id="cpk_first" maxlength="40" value="' + esc(d.client_first) + '" style="max-width:240px;">'
      + '<label style="font-size:12.5px;font-weight:700;display:block;margin-top:8px;">About this client</label>'
      + '<textarea id="cpk_about" rows="4" maxlength="2000" placeholder="What a caregiver should know walking in: who to call, what matters most to them, safety notes.">' + esc(d.about) + '</textarea>'
      + '<div style="display:flex;gap:8px;align-items:center;margin-top:10px;"><span style="font-size:12.5px;font-weight:700;">How-to topics</span><span style="flex:1;"></span>'
      + (S.topics.length ? '<button class="secondary" id="cpk_suggest"' + (S.busy || (S.sugg && S.sugg.loading) ? ' disabled' : '') + '>✨ Suggest topics</button>' : '') + '</div>'
      + suggHtml();
    if (!S.topics.length) h += '<div class="field-note">The how-to library is empty. Samantha adds the approved topics and videos.</div>';
    const whyOf = k => { const x = S.sugg && (S.sugg.suggestions || []).find(y => y.topic === k); return x ? x.why : ''; };
    /* grouped like the Care Library tab (2026-10-12), so a long library stays easy to scan */
    const GRP = { bedbound: 'Bed-bound and hospice care', moving: 'Moving and falls', personal: 'Personal care', eating: 'Eating and diets', conditions: 'Health conditions', signs: 'Warning signs and when to call', other: 'Other' }, ORD = Object.keys(GRP);
    let lastG = null;
    S.topics.concat(S.retired.map(t => Object.assign({}, t, { _retired: true })))
      .sort((a, b) => (ORD.indexOf(a.category || 'other') - ORD.indexOf(b.category || 'other')) || String(a.title).localeCompare(String(b.title))).forEach(t => {
      const it = d.items.find(x => x.topic === t.key), n = (t.videos || []).length, why = whyOf(t.key);
      if (t._retired && !it) return;
      const g = GRP[t.category] ? t.category : 'other';
      if (g !== lastG) { lastG = g; h += '<div style="font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin:10px 0 2px;">' + esc(GRP[g]) + '</div>'; }
      h += '<div style="border-top:1px solid var(--border);padding:7px 0;">'
        + '<label style="display:flex;gap:8px;align-items:center;font-size:13.5px;cursor:pointer;flex-wrap:wrap;"><input type="checkbox" style="width:auto;margin:0;flex:none;" data-cpk-topic="' + esc(t.key) + '"' + (it ? ' checked' : '') + '> <b>' + esc(t.title) + '</b>'
        + '<span class="field-note">' + n + ' video' + (n === 1 ? '' : 's') + '</span>'
        + (t._retired ? '<span class="field-note" style="color:#92400E;">retired from the library (kept here; untick to remove)</span>' : '')
        + (why ? '<span class="field-note" style="color:#1E4FB8;">✨ suggested: ' + esc(why) + '</span>' : '') + '</label>'
        + (it ? '<textarea data-cpk-notes="' + esc(t.key) + '" rows="4" maxlength="2000" style="margin-top:6px;">' + esc(it.notes) + '</textarea>'
              + '<div class="field-note">Starts with the library\'s notes. Change them for this client.</div>' : '')
        + '</div>';
    });
    h += '<label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13.5px;cursor:pointer;"><input type="checkbox" style="width:auto;margin:0;flex:none;" id="cpk_ready"' + (d.ready ? ' checked' : '') + '> Ready for caregivers</label>'
      + (S.packet && S.packet.ready && S.recipients.length ? '<div class="field-note">Changing the words or topics makes a new version, and everyone confirms again.</div>' : '')
      + '<div style="display:flex;gap:8px;align-items:center;margin-top:8px;"><button class="primary" id="cpk_save"' + (S.busy ? ' disabled' : '') + '>Save packet</button>'
      + (S.packet ? '<button class="secondary" id="cpk_preview"' + (S.busy || dirty() ? ' disabled title="Save first, then preview"' : '') + '>👀 Preview what caregivers see</button>' : '')
      + (dirty() ? '<span class="field-note" style="color:#92400E;">changed, not saved</span>' : '')
      + (S.msg && !/^Sent|already went/.test(S.msg) ? '<span class="field-note" style="color:#166534;">' + esc(S.msg) + '</span>' : '') + '</div>'
      + (S.err ? '<div class="field-note" style="color:#B91C1C;margin-top:6px;">' + esc(S.err) + '</div>' : '');
    if (S.packet && S.packet.ready) {
      /* 2026-10-12 fix: DATA is a page-level let in index.html (never window.DATA), so this list was always empty. Every active
         caregiver on the roster with an AxisCare number can be picked, scheduled with this client or not (Samantha: "we are
         talking to someone about working with Dan ... we told them we would send the refresher videos"). */
      const roster = (() => { try { return (typeof DATA !== 'undefined' && DATA && DATA.caregivers) || (window.DATA && window.DATA.caregivers) || []; } catch (e) { return []; } })();
      const noAx = roster.filter(c => c && !c.axiscare_id && !c.inactive).length;
      const cgs = roster.filter(c => c && c.axiscare_id && !c.inactive)
        .sort((a, b) => (String(a.first || '') + ' ' + (a.last || '')).localeCompare(String(b.first || '') + ' ' + (b.last || '')));
      /* per client (Samantha 2026-10-12): send automatically to anyone scheduled with them, or by hand (the default) */
      const P = S.packet, autoOn = P.auto_send === true, cf = P.client_first || 'this client';
      const prevAck = S.recipients.filter(r => P.version > 1 && r.ack_version === P.version - 1);
      h += '<div style="border-top:1px solid var(--border);margin-top:12px;padding-top:10px;"><b style="font-size:13.5px;color:var(--navy);">Who gets it</b>'
        + '<label style="display:flex;gap:8px;align-items:center;font-size:13.5px;margin-top:6px;cursor:pointer;"><input type="radio" name="cpk_auto" value="off" style="width:auto;margin:0;flex:none;"' + (autoOn ? '' : ' checked') + (S.busy ? ' disabled' : '') + '> I send it myself</label>'
        + '<label style="display:flex;gap:8px;align-items:center;font-size:13.5px;margin-top:4px;cursor:pointer;"><input type="radio" name="cpk_auto" value="on" style="width:auto;margin:0;flex:none;"' + (autoOn ? ' checked' : '') + (S.busy ? ' disabled' : '') + '> Send it automatically to anyone scheduled with ' + esc(cf) + '</label>'
        + '<div class="field-note">' + (autoOn ? 'Each caregiver with a visit in the next 3 days who has not had this version gets the text, 8am to 8pm. The check runs 3 times a day. No automatic reminders; Remind stays yours.' : 'Nobody is texted unless you press Text it.')
        + (P.auto_send_by ? ' Set by ' + esc(String(P.auto_send_by).split('@')[0]) + ' ' + esc(day(P.auto_send_at)) + '.' : '') + '</div>'
        + (prevAck.length ? '<div style="margin-top:10px;padding:9px 12px;border-radius:10px;background:#FFF6E3;border:1px solid #FFC671;font-size:13px;">'
            + 'The last save made version ' + esc(P.version) + ', so ' + esc(prevAck.map(r => r.caregiver_name).join(', ')) + (prevAck.length === 1 ? ' is' : ' are') + ' asked to confirm again. '
            + 'If it was only a small fix, keep their confirmation. It is recorded as kept by you.'
            + '<div style="margin-top:6px;"><button class="secondary" id="cpk_carry"' + (S.busy || dirty() ? ' disabled' : '') + '>Small fix: keep their confirmation' + (prevAck.length === 1 ? '' : 's') + '</button></div></div>' : '')
        + '</div>';
      h += '<div style="border-top:1px solid var(--border);margin-top:12px;padding-top:10px;"><b style="font-size:13.5px;color:var(--navy);">Caregivers</b>'
        + '<div style="display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap;"><select id="cpk_cg" style="max-width:280px;"><option value="">Pick a caregiver…</option>'
        + cgs.map(c => '<option value="' + esc(c.axiscare_id) + '">' + esc(((c.first || '') + ' ' + (c.last || '')).trim()) + '</option>').join('') + '</select>'
        + '<button class="primary" id="cpk_text"' + (S.busy || dirty() ? ' disabled' : '') + '>Text the packet</button>'
        + '<button class="secondary" id="cpk_link"' + (S.busy || dirty() ? ' disabled' : '') + '>Get their link</button></div>'
        + '<div class="field-note">Anyone on your team can get it, scheduled with ' + esc(S.packet.client_first || 'this client') + ' or not.' + (noAx ? ' ' + noAx + ' caregiver' + (noAx === 1 ? ' has' : 's have') + ' no AxisCare number yet, so ' + (noAx === 1 ? 'is' : 'are') + ' not listed.' : '') + '</div>'
        + sendPanel()
        + (dirty() ? '<div class="field-note">Save the packet first.</div>' : '')
        + (S.link ? '<div style="margin-top:8px;padding:9px 11px;border:1px solid var(--border);border-radius:10px;background:var(--bg);">'
            + '<div style="font-size:13px;"><b>' + esc(S.link.caregiver_first) + '\'s link</b> (just for them, works 90 days)</div>'
            + '<input id="cpk_linkbox" readonly value="' + esc(S.link.link) + '" style="margin-top:4px;font-size:12px;">'
            + '<button class="secondary" id="cpk_copy" style="margin-top:6px;">Copy text with link</button>'
            + '<div class="field-note">Copies: "Hi ' + esc(S.link.caregiver_first) + ', it\'s Caring Companions. Before you work with ' + esc(S.link.client_first) + ', please watch this short care packet and tap I understand: (link)". Text it from the office line.</div></div>' : '')
        + (S.recipients.length ? S.recipients.map(r => {
            const now = r.ack_version === S.packet.version;
            return '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;padding:6px 0;border-top:1px solid var(--border);font-size:13px;"><b>' + esc(r.caregiver_name) + '</b>'
              + (now ? '<span style="color:#166534;font-weight:700;">✓ understood ' + esc(day(r.ack_at)) + '</span>'
                  + (r.ack_carried_from ? '<span class="field-note">kept from version ' + esc(r.ack_carried_from) + ' after a small fix, by ' + esc(String(r.ack_carried_by || '').split('@')[0]) + '</span>' : '')
                 : r.ack_version ? '<span style="color:#92400E;font-weight:700;">confirmed an older version, not this one</span>'
                 : '<span style="color:#92400E;font-weight:700;">not confirmed yet</span>')
              + (r.last_sent_at ? '<span class="field-note">texted ' + (r.last_sent_by === 'care-packet-watch' ? 'automatically ' : '') + esc(day(r.last_sent_at)) + (r.last_send_kind === 'reminder' ? ' (reminder)' : r.last_send_kind === 'updated' ? ' (updated packet)' : '') + (r.send_count > 1 ? ' · ' + esc(r.send_count) + ' texts' : '') + '</span>'
                 : '<span class="field-note">link made ' + esc(day(r.link_made_at)) + ', not texted from here</span>')
              + (now ? '' : '<button class="linklike" data-cpk-send="' + esc(r.caregiver_axiscare_id) + '"' + (S.busy || dirty() ? ' disabled' : '') + '>' + (r.ack_version ? 'Send update' : r.last_sent_at ? 'Remind' : 'Text it') + '</button>')
              + '</div>'; }).join('')
          : '<div class="field-note" style="margin-top:6px;">No caregivers yet.</div>')
        + upcomingHtml()
        + (S.msg && /^Sent|already went/.test(S.msg) ? '<div class="field-note" style="color:#166534;margin-top:6px;">' + esc(S.msg) + '</div>' : '')
        + (S.sendErr ? '<div class="field-note" style="color:#B91C1C;margin-top:6px;">' + esc(S.sendErr) + '</div>' : '')
        + '</div>';
    }
    box.innerHTML = h + '</div>';
    wire();
  }
  /* The exact text, to whom, and anything to know first. Nothing is sent until Send is pressed. */
  function sendPanel(){
    const d = S.send; if (!d) return '';
    if (d.loading) return '<div class="field-note" style="margin-top:8px;">Getting the text…</div>';
    const box = 'margin-top:8px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--bg);';
    if (!d.kind) return '<div style="' + box + '"><div style="font-size:13px;">' + esc(d.caregiver_first) + ' already confirmed this version. Nothing to send.</div><button class="secondary" id="cpk_cancel" style="margin-top:6px;">Close</button></div>';
    const blocked = !d.live || d.opted_out || !d.phone_last4;
    return '<div style="' + box + '"><div style="font-size:13px;"><b>' + (d.kind === 'reminder' ? 'Reminder' : d.kind === 'updated' ? 'Updated packet' : 'Text') + ' to ' + esc(d.caregiver_first) + '</b>'
      + (d.phone_last4 ? ' <span class="field-note">(phone ending ' + esc(d.phone_last4) + ', from the office number)</span>' : '') + '</div>'
      + '<div style="margin-top:6px;padding:8px 10px;background:#fff;border:1px solid var(--border);border-radius:8px;font-size:13.5px;white-space:pre-wrap;">' + esc(d.text) + '</div>'
      + '<div class="field-note">"(their link)" becomes ' + esc(d.caregiver_first) + '\'s own link when it sends.'
      + (d.last_sent_at ? ' Last texted ' + esc(day(d.last_sent_at)) + '.' : '') + '</div>'
      + (!d.live ? '<div class="field-note" style="color:#92400E;font-weight:700;">Sending from the Hub is off (Owners Hub Admin page, Caregiver packet texts). Use Get their link and text it yourself.</div>' : '')
      + (d.opted_out ? '<div class="field-note" style="color:#B91C1C;font-weight:700;">' + esc(d.caregiver_first) + ' has asked not to get texts. Call them instead.</div>' : '')
      + (!d.phone_last4 ? '<div class="field-note" style="color:#B91C1C;font-weight:700;">No usable phone number on the roster for ' + esc(d.caregiver_first) + '.</div>' : '')
      + (d.late && !blocked ? '<div class="field-note" style="color:#92400E;">It is before 8am or after 8pm. Send now only if it can\'t wait.</div>' : '')
      + '<div style="display:flex;gap:8px;margin-top:8px;"><button class="primary" id="cpk_send"' + (blocked || S.busy ? ' disabled' : '') + '>Send</button><button class="secondary" id="cpk_cancel">Cancel</button></div></div>';
  }
  async function openSend(axId){
    if (!axId) { S.sendErr = 'Pick a caregiver first.'; render(); return; }
    S.sendErr = ''; S.msg = ''; S.link = null; S.send = { loading: true, ax: axId }; render();
    try { const d = await call({ action: 'send_draft', packet_id: S.packet.id, caregiver_axiscare_id: axId });
      S.send = Object.assign(d, { ax: axId, send_id: 'pk-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 12)) }); }
    catch (e) { S.send = null; S.sendErr = e.message; }
    render();
  }
  async function doSend(){
    const d = S.send; if (!d || S.busy) return;
    if (d.late && !(await ccConfirm('It is before 8am or after 8pm in Springfield. Send ' + d.caregiver_first + ' this text now?'))) return;
    S.busy = true; S.sendErr = ''; render();
    try { const r = await call({ action: 'send', packet_id: S.packet.id, caregiver_axiscare_id: d.ax, send_id: d.send_id });
      S.recipients = r.recipients || S.recipients; S.send = null; loadUpcoming();
      S.msg = r.outcome === 'already_sent' ? 'That text already went.' : 'Sent to ' + d.caregiver_first + '.' + (r.warning ? ' ' + r.warning : ''); }
    catch (e) { S.sendErr = e.message; S.send = null; }
    S.busy = false; render();
  }
  /* ── Suggest topics (2026-10-12): the AI reads their care plan, intake and these notes and suggests topics from the
     library, each with why. It only ticks boxes in this draft; nothing is saved until Save packet. ── */
  function suggHtml(){
    const g = S.sugg; if (!g) return '';
    const box = 'margin:6px 0;padding:8px 11px;border-radius:9px;font-size:12.5px;';
    if (g.loading) return '<div class="field-note" style="' + box + 'background:var(--bg);">Reading their care plan and intake…</div>';
    if (g.outcome === 'nothing_to_read') return '<div style="' + box + 'background:#FFF6E3;">There is nothing to read yet: no care plan, intake answers or About notes. Write a few lines in About this client, then try again, or tick the topics yourself.</div>';
    if (g.outcome !== 'ok') return '<div style="' + box + 'background:#FDECEA;color:#B91C1C;">' + esc(g.error || 'No suggestions just now.') + '</div>';
    const added = g.added || 0;
    return '<div style="' + box + 'background:#EEF4FF;">' + (g.suggestions.length
        ? (added ? '✨ Ticked ' + added + ' suggested topic' + (added === 1 ? '' : 's') : '✨ The suggested topics were already ticked') + ', from ' + esc((g.used || []).join(', ')) + '. Check them, untick any that don\'t fit, then Save packet.'
        : 'Nothing in ' + esc((g.used || []).join(', ')) + ' matched a topic in the library. Tick the topics yourself.')
      + '</div>';
  }
  async function suggest(){
    if (S.busy || (S.sugg && S.sugg.loading)) return;
    S.sugg = { loading: true }; render();
    try {
      const g = await call(Object.assign({ action: 'suggest', about: S.draft.about }, who()));
      let added = 0;
      (g.suggestions || []).forEach(x => { if (!S.draft.items.find(it => it.topic === x.topic)) { const t = S.topics.find(y => y.key === x.topic); if (t) { S.draft.items.push({ topic: t.key, notes: t.notes || '' }); added++; } } });
      S.sugg = Object.assign(g, { added });
    } catch (e) { S.sugg = { outcome: 'error', error: e.message }; }
    render();
  }

  function wire(){
    const $ = id => document.getElementById(id);
    const keep = () => { const d = S.draft; d.client_first = ($('cpk_first') || {}).value || ''; d.about = ($('cpk_about') || {}).value || '';
      document.querySelectorAll('[data-cpk-notes]').forEach(el => { const it = d.items.find(x => x.topic === el.getAttribute('data-cpk-notes')); if (it) it.notes = el.value; });
      d.ready = !!($('cpk_ready') || {}).checked; };
    ['cpk_first', 'cpk_about'].forEach(id => { const el = $(id); if (el) el.oninput = () => { keep(); S.msg = ''; markDirty(); }; });
    document.querySelectorAll('[data-cpk-notes]').forEach(el => { el.oninput = () => { keep(); S.msg = ''; markDirty(); }; });
    const rd = $('cpk_ready'); if (rd) rd.onchange = () => { keep(); S.msg = ''; render(); };
    document.querySelectorAll('[data-cpk-topic]').forEach(el => { el.onchange = () => { keep(); const k = el.getAttribute('data-cpk-topic'), t = S.topics.find(x => x.key === k);
      if (el.checked) { if (!S.draft.items.find(x => x.topic === k)) S.draft.items.push({ topic: k, notes: (t && t.notes) || '' }); }
      else S.draft.items = S.draft.items.filter(x => x.topic !== k);
      S.msg = ''; render(); }; });
    const sv = $('cpk_save'); if (sv) sv.onclick = () => { keep(); save(); };
    document.querySelectorAll('input[name="cpk_auto"]').forEach(el => { el.onchange = () => { if (el.checked) setAuto(el.value === 'on'); }; });
    const ca = $('cpk_carry'); if (ca) ca.onclick = carry;
    const pv = $('cpk_preview'); if (pv) pv.onclick = preview;
    const sg = $('cpk_suggest'); if (sg) sg.onclick = () => { keep(); suggest(); };
    const lo = $('cpk_lib_open'); if (lo) lo.onclick = () => { keep(); if (typeof switchTab === 'function') switchTab('carelibrary'); };
    const lk = $('cpk_link'); if (lk) lk.onclick = () => { S.send = null; makeLink(($('cpk_cg') || {}).value || ''); };
    const tx = $('cpk_text'); if (tx) tx.onclick = () => openSend(($('cpk_cg') || {}).value || '');
    document.querySelectorAll('[data-cpk-send]').forEach(el => { el.onclick = () => openSend(el.getAttribute('data-cpk-send')); });
    const sd = $('cpk_send'); if (sd) sd.onclick = doSend;
    const cc = $('cpk_cancel'); if (cc) cc.onclick = () => { S.send = null; render(); };
    const cp = $('cpk_copy'); if (cp) cp.onclick = async () => {
      const t = 'Hi ' + S.link.caregiver_first + ', it\'s Caring Companions. Before you work with ' + S.link.client_first + ', please watch this short care packet and tap I understand: ' + S.link.link;
      try { await navigator.clipboard.writeText(t); cp.textContent = 'Copied ✓'; } catch (e) { const b = $('cpk_linkbox'); if (b) { b.value = t; b.select(); } cp.textContent = 'Press Cmd+C to copy'; } };
  }
  function markDirty(){ /* only the hint and the link button change while typing; the boxes keep focus */
    const sv = document.getElementById('cpk_save'); if (!sv) return;
    const hint = sv.parentNode.querySelector('.field-note[style*="92400E"]');
    if (dirty() && !hint) sv.insertAdjacentHTML('afterend', '<span class="field-note" style="color:#92400E;">changed, not saved</span>');
    ['cpk_link', 'cpk_text', 'cpk_send', 'cpk_preview'].forEach(id => { const el = document.getElementById(id); if (el) el.disabled = S.busy || dirty(); });
    document.querySelectorAll('[data-cpk-send]').forEach(el => { el.disabled = S.busy || dirty(); });
  }
  async function save(){
    if (S.busy) return; S.busy = true; S.err = ''; S.msg = ''; render();
    try {
      const d = await call(Object.assign({ action: 'save', client_first: S.draft.client_first, about: S.draft.about, items: S.draft.items, ready: S.draft.ready, base_version: S.packet ? S.packet.version : null }, who()));
      S.packet = d.packet; S.recipients = d.recipients || []; fresh(); S.sugg = null; loadUpcoming();
      S.msg = d.changed && S.recipients.length ? 'Saved as version ' + d.packet.version + '. Caregivers will be asked to confirm again.' : 'Saved.';
    } catch (e) { S.err = e.message; }
    S.busy = false; render();
  }
  /* Preview (Samantha "i want to see the caregiver packet link before i send it", 2026-10-12): the caregiver's own page
     (packet.html) in a phone-sized window, showing the SAVED packet. Makes no link, records nothing, texts nobody;
     its "I watched it" button does nothing. The page gets the packet by postMessage from here (same site only), so it
     works inside GoHighLevel too. */
  async function preview(){
    if (S.busy || !S.packet || dirty()) return; S.err = '';
    let d; try { d = await call({ action: 'preview', packet_id: S.packet.id }); } catch (e) { S.err = 'Could not open the preview: ' + e.message; render(); return; }
    const old = document.getElementById('cpk_pv'); if (old) old.remove();
    const ov = document.createElement('div'); ov.id = 'cpk_pv';
    ov.setAttribute('style', 'position:fixed;inset:0;background:rgba(14,56,96,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px;');
    ov.innerHTML = '<div style="background:#fff;border-radius:14px;width:min(420px,100%);height:min(860px,94vh);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.3);">'
      + '<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border);"><b style="font-size:14px;color:var(--navy);">What caregivers see on their phone</b><span style="flex:1;"></span>'
      + '<button class="secondary" id="cpk_pv_close">Close</button></div>'
      + '<iframe id="cpk_pv_f" src="packet.html?preview=1" title="Caregiver packet preview" style="border:0;flex:1;width:100%;"></iframe></div>';
    document.body.appendChild(ov);
    const close = () => { ov.remove(); document.removeEventListener('keydown', esc1); window.removeEventListener('message', msg1); };
    const esc1 = e => { if (e.key === 'Escape') close(); };
    const msg1 = e => { if (e.origin === location.origin && e.data && e.data.cpkPreviewClose) close(); };   // Escape pressed inside the preview
    document.addEventListener('keydown', esc1); window.addEventListener('message', msg1);
    ov.onclick = e => { if (e.target === ov) close(); };
    document.getElementById('cpk_pv_close').onclick = close;
    const f = document.getElementById('cpk_pv_f');
    f.onload = () => { try { f.contentWindow.postMessage({ cpkPreview: d }, location.origin); } catch (e) { /* the page says it is waiting */ } };
  }
  async function setAuto(on){
    if (S.busy || !S.packet) return;
    if (on && !(await ccConfirm('Text this packet automatically to every caregiver scheduled with ' + (S.packet.client_first || 'this client') + ' who has not had it yet?'))) { render(); return; }
    S.busy = true; S.sendErr = ''; render();
    try { const d = await call({ action: 'auto_set', packet_id: S.packet.id, on }); S.packet = Object.assign({}, S.packet, d.packet); S.msg = on ? 'Set to send automatically.' : 'Set to send by hand.'; }
    catch (e) { S.sendErr = e.message; }
    S.busy = false; render();
  }
  async function carry(){
    if (S.busy || !S.packet) return; S.busy = true; S.sendErr = ''; render();
    try { const d = await call({ action: 'carry_acks', packet_id: S.packet.id, from_version: S.packet.version - 1 }); S.recipients = d.recipients || S.recipients;
      S.msg = d.carried ? 'Kept ' + d.carried + ' confirmation' + (d.carried === 1 ? '' : 's') + '.' : 'Nobody to keep.'; loadUpcoming(); }
    catch (e) { S.sendErr = e.message; }
    S.busy = false; render();
  }
  async function makeLink(axId){
    if (!axId) { S.sendErr = 'Pick a caregiver first.'; render(); return; }
    if (S.busy) return; S.busy = true; S.sendErr = ''; S.link = null; render();
    try { const d = await call({ action: 'link', packet_id: S.packet.id, caregiver_axiscare_id: axId }); S.link = d; S.recipients = d.recipients || S.recipients; }
    catch (e) { S.sendErr = e.message; }
    S.busy = false; render();
  }
  window.CPK = { mount: async function(id){ S.box = document.getElementById(id); if (!S.box) return; S.packet = null; S.msg = ''; S.err = ''; S.sendErr = ''; S.sugg = null; S.box.innerHTML = '<div class="field-note">Loading the caregiver packet…</div>'; S.up = null; await load(); render(); loadUpcoming(); } };
})();
