/* ============================================================================================================================
   ASK CARA CHATS (Team → Ask Cara chats, beside Inbox). Samantha 2026-11-05: "can we see transcripts from conversations that
   happen in ask cara chat bot on our website", then "build an Ask Cara Chats page in the Hub so the office can read website
   chat transcripts" (her pick: a sub-tab beside Inbox). Same day: Cara offers a call back after the first real question,
   and what they leave becomes a Website lead whose note says "Ask Cara chat <id>" (website cara-widget.js).
     - Reads kb_answer_log (cara-chat's log, written by knowledge-api) straight from the database. Read only: Desktop 1314 lets
       signed-in Care Coordinator Hub staff read it; nobody can change it from here.
     - One card per chat (session_id). Chats saved before 2026-11-05 have no id, so each of those questions shows on its own.
     - A chat whose visitor left their number links to that lead (matched by the chat id in the lead's notes).
     - Nothing here texts, calls or emails anyone.
   CCHATS.mount(boxId). Needs: sb (the Hub's Supabase client), DATA.leads, openLeadProfile.
   ============================================================================================================================ */
(function(){
  const esc = t => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(t) : String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  const PAGE = 500;
  const OUTCOME = {
    answered: ['Answered from our approved answers', 'var(--green)'],
    conflict: ['Answered, but our answers disagree', 'var(--amber)'],
    ambiguous: ['Answered from the closest answers', 'var(--amber)'],
    withheld: ['Held back: the answer is not confirmed yet', 'var(--red)'],
    none: ['Nothing on file, told them to call', 'var(--red)'],
  };
  const S = { box: null, rows: [], limit: PAGE, more: false, loading: false, err: '', filter: 'all', q: '', open: {} };
  const when = iso => { try { return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };
  const unanswered = r => r.outcome === 'withheld' || r.outcome === 'none';

  async function load(){
    S.loading = true; S.err = ''; render();
    try {
      const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
      if (!client) throw new Error('not signed in');
      const { data, error } = await client.from('kb_answer_log')
        .select('id, asked_at, question, reply, outcome, session_id')
        .eq('channel', 'cara').order('asked_at', { ascending: false }).limit(S.limit + 1);
      if (error) throw error;
      S.more = (data || []).length > S.limit;
      S.rows = (data || []).slice(0, S.limit);
    } catch (e) {
      const m = String((e && (e.message || e.code)) || e);
      S.err = /permission denied|42501/i.test(m)
        ? 'The office can\'t read the website chats yet. This waits for Desktop step 1314 (it lets Hub staff read them).'
        : 'The chats could not be loaded: ' + m;
    }
    S.loading = false; render();
  }

  /* chat id → its lead, from the note lead-intake saved ("Ask Cara chat c1a2b3c4") */
  function leadsByChat(){
    const out = {};
    ((typeof DATA !== 'undefined' && DATA && DATA.leads) || []).forEach(l => {
      const m = String(l.interest_notes || '').match(/Ask Cara chat (c[a-z0-9]{8})\b/);
      if (m && !out[m[1]]) out[m[1]] = l;
    });
    return out;
  }

  function chats(){
    const by = {}, list = [];
    S.rows.forEach(r => {
      const k = r.session_id ? 's:' + r.session_id : 'r:' + r.id;
      if (!by[k]) { by[k] = { key: k, sid: r.session_id || '', msgs: [] }; list.push(by[k]); }
      by[k].msgs.push(r);
    });
    const leads = leadsByChat();
    list.forEach(c => {
      c.msgs.sort((a, b) => String(a.asked_at).localeCompare(String(b.asked_at)));
      c.first = c.msgs[0].asked_at; c.last = c.msgs[c.msgs.length - 1].asked_at;
      c.missed = c.msgs.filter(unanswered).length;
      c.lead = c.sid ? leads[c.sid] || null : null;
    });
    return list.sort((a, b) => String(b.last).localeCompare(String(a.last)));
  }

  function shown(list){
    const q = S.q.trim().toLowerCase();
    return list.filter(c => (S.filter === 'all' || (S.filter === 'lead' && c.lead) || (S.filter === 'missed' && c.missed))
      && (!q || c.msgs.some(m => (String(m.question || '') + ' ' + String(m.reply || '')).toLowerCase().includes(q))
             || (c.lead && (String(c.lead.first_name || '') + ' ' + String(c.lead.last_name || '')).toLowerCase().includes(q))));
  }

  function card(c){
    const open = !!S.open[c.key];
    const n = c.msgs.length;
    const leadName = c.lead ? ([c.lead.first_name, c.lead.last_name].filter(Boolean).join(' ') || 'their lead') : '';
    const head = '<div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;cursor:pointer" onclick="CCHATS.toggle(\'' + esc(c.key) + '\')">'
      + '<div style="flex:1;min-width:220px">'
      + '<div style="font-weight:700;color:var(--navy);font-size:14px">' + esc(String(c.msgs[0].question || '').slice(0, 140)) + '</div>'
      + '<div class="field-note">' + esc(when(c.first)) + ' · ' + (c.sid ? n + (n === 1 ? ' question' : ' questions') : 'single question, saved before chats were grouped')
      + (c.missed ? ' · <span style="color:var(--red);font-weight:700">Cara could not answer ' + c.missed + '</span>' : '') + '</div></div>'
      + (c.lead ? '<button class="primary" style="padding:6px 12px;font-size:12.5px" onclick="event.stopPropagation();openLeadProfile(\'' + esc(c.lead.id) + '\')">Left their number: ' + esc(leadName) + '</button>' : '')
      + '<span class="field-note" style="align-self:center">' + (open ? 'Hide' : 'Read') + '</span></div>';
    if (!open) return '<div style="padding:11px 0;border-bottom:1px solid var(--border)">' + head + '</div>';
    const body = c.msgs.map(m => {
      const o = OUTCOME[m.outcome] || [m.outcome || '', 'var(--text-muted)'];
      return '<div style="display:flex;justify-content:flex-end;margin-top:10px"><div style="max-width:78%;background:var(--navy);color:#fff;border-radius:10px;padding:8px 11px;font-size:13.5px;white-space:pre-wrap">' + esc(m.question) + '</div></div>'
        + '<div class="field-note" style="text-align:right;margin-top:2px">Visitor · ' + esc(when(m.asked_at)) + '</div>'
        + '<div style="display:flex;margin-top:6px"><div style="max-width:78%;background:#f2f0e9;color:#2c3d4d;border-radius:10px;padding:8px 11px;font-size:13.5px;white-space:pre-wrap">' + esc(m.reply || '') + '</div></div>'
        + '<div class="field-note" style="margin-top:2px">Cara · <span style="color:' + o[1] + '">' + esc(o[0]) + '</span></div>';
    }).join('');
    return '<div style="padding:11px 0;border-bottom:1px solid var(--border)">' + head + '<div style="padding:4px 4px 8px">' + body + '</div></div>';
  }

  function render(){
    if (!S.box) return;
    const all = chats(), list = shown(all);
    const nLead = all.filter(c => c.lead).length, nMissed = all.filter(c => c.missed).length;
    const pill = (k, label) => '<button class="' + (S.filter === k ? 'primary' : 'secondary') + '" style="padding:5px 12px;font-size:12.5px" onclick="CCHATS.filter(\'' + k + '\')">' + label + '</button>';
    S.box.innerHTML = '<div style="margin-bottom:14px">'
      + '<h2 style="margin:2px 0 0;font-size:24px;font-weight:800;letter-spacing:-0.02em;color:var(--navy)">Ask Cara chats</h2>'
      + '<div class="field-note" style="font-size:13.5px;margin-top:3px">What visitors asked Cara on mo-care.com, and what she answered. Read only. When a visitor leaves their number it comes in as a Website lead, and the chat links to it.</div></div>'
      + '<div class="card" style="padding:18px">'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px">'
      + pill('all', 'All chats (' + all.length + ')') + pill('lead', 'Left their number (' + nLead + ')') + pill('missed', 'Cara could not answer (' + nMissed + ')')
      + '<input type="search" placeholder="Search what was asked" value="' + esc(S.q) + '" oninput="CCHATS.search(this.value)" style="flex:1;min-width:160px;font-size:13px;padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit">'
      + '<button class="linklike" onclick="CCHATS.reload()">Refresh</button></div>'
      + (S.loading ? '<div class="field-note">Loading chats...</div>'
        : S.err ? '<div style="background:#fdf0f0;color:#a33;border-radius:10px;padding:12px 14px;font-size:13.5px">' + esc(S.err) + '</div>'
        : !all.length ? '<div class="field-note">No website chats yet.</div>'
        : !list.length ? '<div class="field-note">No chats match.</div>'
        : list.map(card).join('') + (S.more ? '<div style="margin-top:12px"><button class="secondary" onclick="CCHATS.older()">Show older chats</button></div>' : ''))
      + '</div>';
  }

  window.CCHATS = {
    mount(id){ const b = document.getElementById(id); if (!b) return; const first = S.box !== b; S.box = b; if (first || (!S.rows.length && !S.loading)) load(); else render(); },
    toggle(k){ S.open[k] = !S.open[k]; render(); },
    filter(k){ S.filter = k; render(); },
    search(v){ S.q = v; render(); const i = S.box && S.box.querySelector('input[type=search]'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } },
    reload(){ load(); },
    older(){ S.limit += PAGE; load(); },
    _chats: chats,
  };
})();
