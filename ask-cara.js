/* =============================================================================
   ask-cara.js · window.ASKC · Ask Cara for the Office (Part 1, her "Ask Cara chat" 2026-11-07)
   =============================================================================
   A button in the top bar on every page opens a side panel over the page you are on. Ask anything about a client, a
   caregiver, the schedule or how we do things; Cara answers from the Hub's records and the owner's rulebook, with the
   sources as chips under each answer (a client or caregiver chip opens their profile). It only reads (the ask-cara
   server function): it never texts, changes AxisCare, or makes or closes a card. Owners only while practicing; the whole
   office once ops_settings.ask_cara_live is on (hers to switch). The conversation lives only in this page.
   ============================================================================= */
(function () {
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const myEmail = () => String((typeof ME !== 'undefined' && ME && ME.email) || '').toLowerCase();
  const isOwner = () => (typeof ccIsOwner === 'function' ? ccIsOwner(myEmail()) : false);
  const live = () => !!(typeof DATA !== 'undefined' && DATA && DATA.ops_settings && DATA.ops_settings.ask_cara_live === true);
  const allowed = () => !!myEmail() && (isOwner() || live());
  const S = { open: false, busy: false, turns: [], err: '' };
  const STARTERS = ['What changed with a client this week?', 'Who is with a client tomorrow?', 'Which caregivers know the Hoyer lift?', 'What do I do if a caregiver finds a client on the floor?'];

  function css() {
    if (document.getElementById('askcCss')) return;
    const s = document.createElement('style'); s.id = 'askcCss';
    s.textContent = '#askcRoot{position:fixed;top:0;right:0;bottom:0;width:min(440px,100vw);z-index:4200;background:#fff;border-left:1px solid #E2E8F0;display:flex;flex-direction:column;box-shadow:-8px 0 24px rgba(0,0,0,.08);color:#1B2A2E;font-size:14.5px}'
      + '#askcRoot *{box-sizing:border-box}.askc-top{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #E2E8F0}.askc-top b{font-size:16px}.askc-sub{color:#5C6B70;font-size:12px}'
      + '.askc-x{margin-left:auto;border:none;background:none;font-size:20px;cursor:pointer;color:#5C6B70}.askc-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}'
      + '.askc-q{align-self:flex-end;background:#E3F1F1;color:#174E54;border-radius:12px;padding:8px 11px;max-width:85%;white-space:pre-wrap}'
      + '.askc-a{background:#F6F8F7;border-radius:12px;padding:9px 12px;white-space:pre-wrap;line-height:1.5}.askc-src{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}'
      + '.askc-chip{font-size:12px;border:1px solid #CFCAC0;border-radius:999px;padding:2px 9px;background:#fff;color:#1B2A2E;cursor:default}.askc-chip.go{cursor:pointer;border-color:#1F6F78;color:#1F6F78}'
      + '.askc-bad{background:#FBE1DE;color:#8A2A20;border-radius:10px;padding:8px 11px}.askc-start{display:flex;flex-wrap:wrap;gap:6px}.askc-start button{font:inherit;font-size:12.5px;border:1px solid #CFCAC0;border-radius:999px;padding:4px 10px;background:#fff;cursor:pointer}'
      + '.askc-foot{border-top:1px solid #E2E8F0;padding:10px 12px;display:flex;gap:8px}.askc-in{flex:1;min-height:40px;max-height:120px;font:inherit;border:1.5px solid #CFCAC0;border-radius:10px;padding:8px 10px;resize:none}'
      + '.askc-send{min-width:44px;border:none;border-radius:10px;background:#1F6F78;color:#fff;font-weight:700;cursor:pointer}.askc-send:disabled{background:#AEBBBD}';
    document.head.appendChild(s);
  }
  function chip(s) {
    const [kind, id] = String(s.id).split(':');
    const go = kind === 'client' && typeof openClientProfile === 'function' ? 'ASKC.go(\'client\',\'' + E(id) + '\')'
      : kind === 'caregiver' && typeof openCaregiverProfile === 'function' ? 'ASKC.go(\'caregiver\',\'' + E(id) + '\')' : '';
    return '<span class="askc-chip' + (go ? ' go' : '') + '"' + (go ? ' onclick="' + go + '"' : '') + ' title="' + E(s.id) + '">' + E(s.label) + '</span>';
  }
  function render() {
    css();
    let root = document.getElementById('askcRoot');
    if (!S.open) { if (root) root.remove(); return; }
    if (!root) {
      root = document.createElement('div'); root.id = 'askcRoot'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Ask AI');
      root.innerHTML = '<div class="askc-top"><div><b>✨ Ask AI</b><div class="askc-sub">Our AI helper (Cara) reads our records and our rules. It never changes anything.' + (live() ? '' : ' Practice: owners only.') + '</div></div><button class="askc-x" aria-label="Close" onclick="ASKC.close()">×</button></div>'
        + '<div class="askc-body" id="askcBody"></div>'
        + '<div class="askc-foot"><textarea class="askc-in" id="askcIn" rows="1" placeholder="Ask about a client, a caregiver, the schedule or a rule"></textarea><button class="askc-send" id="askcSend" aria-label="Send" onclick="ASKC.send()">↑</button></div>';
      document.body.appendChild(root);
      const ta = root.querySelector('#askcIn');
      ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    }
    const body = root.querySelector('#askcBody');
    body.innerHTML = (S.turns.length ? '' : '<div class="askc-a">Hi! Ask me anything you would otherwise dig through calls, texts and AxisCare for. I show where each answer came from, and I say so when I don\'t see something.</div><div class="askc-start">'
        + STARTERS.map((q) => '<button onclick="ASKC.fill(this.textContent)">' + E(q) + '</button>').join('') + '</div>')
      + S.turns.map((t) => '<div class="askc-q">' + E(t.q) + '</div>' + (t.a == null ? '<div class="askc-a">Looking that up...</div>'
        : t.err ? '<div class="askc-bad">' + E(t.err) + '</div>'
        : '<div class="askc-a">' + E(t.a) + (t.sources && t.sources.length ? '<div class="askc-src">' + t.sources.map(chip).join('') + '</div>' : '') + '</div>')).join('');
    body.scrollTop = body.scrollHeight;
    root.querySelector('#askcSend').disabled = S.busy;
  }
  async function send() {
    const ta = document.getElementById('askcIn'); const q = String((ta && ta.value) || '').trim();
    if (!q || S.busy) return;
    if (!allowed()) { S.turns.push({ q, a: '', err: 'Ask AI is in practice with the owners for now.' }); return render(); }
    ta.value = ''; S.busy = true;
    const history = S.turns.filter((t) => t.a && !t.err).slice(-3).flatMap((t) => [{ role: 'user', text: t.q }, { role: 'assistant', text: t.a }]);
    const turn = { q, a: null }; S.turns.push(turn); render();
    try {
      const sess = await sb.auth.getSession(), tok = sess && sess.data && sess.data.session && sess.data.session.access_token;
      if (!tok) throw new Error('Sign in again, then ask.');
      const r = await fetch(CONFIG.supabase_url + '/functions/v1/ask-cara', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, apikey: CONFIG.supabase_anon_key, 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, history }) });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d || d.error) throw new Error((d && d.error) || 'Cara answered ' + r.status);
      turn.a = d.text || "I don't see that in our records."; turn.sources = d.sources || [];
    } catch (e) { turn.a = ''; turn.err = String((e && e.message) || e); }
    S.busy = false; render();
  }
  function open() { if (!allowed()) return; tipDone(); S.open = true; render(); setTimeout(() => { const t = document.getElementById('askcIn'); if (t) t.focus(); }, 50); }
  function close() { S.open = false; render(); }
  function fill(q) { const t = document.getElementById('askcIn'); if (t) { t.value = q; t.focus(); } }
  function go(kind, id) { try { if (kind === 'client') openClientProfile(id); else openCaregiverProfile(id); } catch (e) {} }
  /* the top-bar button shows only for those who may use it (owners while practicing) */
  function showButton() { const b = document.getElementById('askCaraBtn'); if (b) b.style.display = allowed() ? '' : 'none'; tip(); }

  /* NEW-FEATURE TIP (2026-11-15, her "New tip in the Hub"): so the office knows Ask AI is there for them. A small bubble
     under the button, per person, on their first 5 page loads, until they close it or open Ask AI. Nothing is sent and
     nothing is saved anywhere but this browser; if the browser keeps nothing, the tip just shows and can be closed. */
  const TIP_LOADS = 5;
  const tipKey = () => 'askai_tip_v1:' + myEmail();
  const tipGet = () => { try { return JSON.parse(localStorage.getItem(tipKey()) || '{}') || {}; } catch (e) { return {}; } };
  const tipSet = (v) => { try { localStorage.setItem(tipKey(), JSON.stringify(v)); } catch (e) {} };
  let tipCounted = false, tipClosed = false;
  function tipDone() { tipClosed = true; const t = tipGet(); t.done = true; tipSet(t); const el = document.getElementById('askaiTip'); if (el) el.remove(); }
  function tip() {
    const b = document.getElementById('askCaraBtn'); let el = document.getElementById('askaiTip');
    const show = !tipClosed && b && b.style.display !== 'none' && b.offsetParent && !S.open && myEmail();
    if (!show) { if (el) el.remove(); return; }
    const t = tipGet(); if (t.done) { if (el) el.remove(); return; }
    if (!tipCounted) { tipCounted = true; t.n = (t.n || 0) + 1; tipSet(t); }
    if ((t.n || 0) > TIP_LOADS) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'askaiTip'; el.setAttribute('role', 'note');
      el.style.cssText = 'position:fixed;z-index:4100;width:300px;background:#fff;color:#1B2A2E;border:1px solid #E2E8F0;border-radius:12px;'
        + 'box-shadow:0 12px 32px rgba(14,56,96,.22);padding:12px 14px;font-size:13.5px;line-height:1.45';
      el.innerHTML = '<div style="position:absolute;top:-7px;left:var(--ax,40px);width:12px;height:12px;background:#fff;border-left:1px solid #E2E8F0;border-top:1px solid #E2E8F0;transform:rotate(45deg)"></div>'
        + '<button aria-label="Close" onclick="ASKC.tipDone()" style="position:absolute;top:4px;right:6px;border:none;background:none;font-size:18px;cursor:pointer;color:#5C6B70">×</button>'
        + '<b style="color:#0D365F">New: ✨ Ask AI</b>'
        + '<div style="margin:4px 0 8px">Ask it anything you would normally dig through calls, texts and AxisCare for: who is with a client tomorrow, '
        + 'what changed this week, which caregivers know the Hoyer lift. It shows where each answer came from and only reads; it never texts anyone or changes AxisCare.</div>'
        + '<button onclick="ASKC.open()" style="font:inherit;font-weight:700;border:none;border-radius:8px;background:#1F6F78;color:#fff;padding:6px 12px;cursor:pointer">Try it</button>';
      document.body.appendChild(el);
    }
    const r = b.getBoundingClientRect(), w = 300, left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8));
    el.style.left = left + 'px'; el.style.top = (r.bottom + 10) + 'px';
    el.style.setProperty('--ax', Math.max(14, Math.min(w - 26, r.left + r.width / 2 - left - 6)) + 'px');
  }
  addEventListener('resize', tip);
  setInterval(showButton, 3000); document.addEventListener('DOMContentLoaded', showButton);
  window.ASKC = { open, close, send, fill, go, showButton, tipDone, _s: S, allowed };
})();
