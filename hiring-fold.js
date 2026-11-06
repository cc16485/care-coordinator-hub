/* 2026-11-05 (Samantha, on a hire's Hiring tab: "making the detailed section expandable so it can close and not take up so
   much space unless we want to look at it"): the Hiring tab, tidy.
   - Every section folds to one line with a short summary (The offer, References, The whole journey, Signed documents,
     Driver Compliance, Hepatitis B). Their journey (Now, Next, Missing or follow-up) always stays open.
   - Each person's browser remembers which sections they opened.
   - Duplicates go: the "Getting them started, Open Hiring" banner while Hiring is already open, and the signed Step 1
     forms listed twice (they stay under Signed documents; forms not yet signed still show under Their journey).
   Behind ops_settings.hiring_fold_live (owners switch it on the Admin page or in Settings), or an owner's own preview.
   Only the look changes: nothing is sent, saved or signed. */
(function(root){
  const KEY = 'cc_hiring_fold_preview', OPEN = 'cc_hiring_fold_open';
  const get = n => { try{ return root[n] !== undefined ? root[n] : (0, eval)('typeof ' + n + ' !== "undefined" ? ' + n + ' : undefined'); }catch(e){ return undefined; } };
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  function live(settings){ return !!(settings && settings.hiring_fold_live === true); }
  function preview(){ try{ return root.localStorage.getItem(KEY) === '1'; }catch(e){ return false; } }
  function setPreview(on){ try{ if(on) root.localStorage.setItem(KEY, '1'); else root.localStorage.removeItem(KEY); }catch(e){} }
  const isOwner = () => { try{ return typeof ccIsOwner === 'function' && !!ccIsOwner(); }catch(e){ return false; } };
  const settings = () => { const d = get('DATA'); return (d && d.ops_settings) || {}; };
  function showing(){ return live(settings()) || (isOwner() && preview()); }
  function mark(){ try{ root.document.body.classList.toggle('hf-on', showing()); }catch(e){} }
  const redraw = () => { mark(); try{ if(get('AP_PROF') && typeof apRenderProfile === 'function') apRenderProfile(); }catch(e){} };

  /* which sections this browser has opened */
  function opened(){ try{ return JSON.parse(root.localStorage.getItem(OPEN) || '{}') || {}; }catch(e){ return {}; } }
  function remember(key, on){ try{ const o = opened(); if(on) o[key] = 1; else delete o[key]; root.localStorage.setItem(OPEN, JSON.stringify(o)); }catch(e){} }

  /* one folded section: the title and its summary on one line, the rest inside */
  function card(key, title, body, note, sum){
    return '<details class="card hf-card" data-hf="' + esc(key) + '"' + (opened()[key] ? ' open' : '') + ' ontoggle="HFOLD.toggled(this)">'
      + '<summary class="hf-sum"><b>' + title + '</b><span class="hf-line">' + (sum || '') + '</span></summary>'
      + (note ? '<div class="field-note" style="margin-top:3px;">' + note + '</div>' : '')
      + '<div style="margin-top:10px;">' + body + '</div></details>';
  }
  function toggled(el){ if(el && el.dataset) remember(el.dataset.hf, el.open); }

  /* the summary line of each section, read from what the section shows once it has loaded */
  const txt = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim();
  const SUM = {
    refs: el => { const m = txt(el).match(/References · (\d+) of (\d+) back/); return m ? m[1] + ' of ' + m[2] + ' back' : /No references asked yet/.test(txt(el)) ? 'none asked yet' : ''; },
    journey: el => { const d = el.querySelector('[data-hf-sum]'); return d ? d.getAttribute('data-hf-sum') : ''; },
    docs: el => { const d = el.querySelector('[data-hf-sum]'); return d ? d.getAttribute('data-hf-sum') : ''; },
    driver: el => { const p = el.querySelector('.tag-chip'); if(!p) return '';
      const todo = (txt(el).match(/Not verified|Not checked yet/g) || []).length;
      return pillHtml(txt(p), p.getAttribute('style')) + (todo ? ' ' + todo + (todo === 1 ? ' check' : ' checks') + ' to do' : ''); },
    hepb: el => { const p = [].find.call(el.querySelectorAll('span'), s => /border-radius:999px/.test(s.getAttribute('style') || ''));
      return p ? pillHtml(txt(p), p.getAttribute('style')) : ''; },
  };
  function pillHtml(words, style){
    const c = String(style || '').match(/color:\s*([^;]+);\s*background:\s*([^;]+)/) || String(style || '').match(/background:\s*([^;]+);\s*color:\s*([^;]+)/);
    const col = c ? (/^background/.test(c[0]) ? [c[2], c[1]] : [c[1], c[2]]) : ['#6E6559', '#F4F2ED'];
    return '<span class="hf-pill" style="color:' + esc(col[0]) + ';background:' + esc(col[1]) + '">' + esc(words) + '</span>';
  }
  function summarize(pane){
    if(!pane) return;
    pane.querySelectorAll('details.hf-card').forEach(d => {
      const f = SUM[d.dataset.hf]; if(!f) return;
      const line = d.querySelector('.hf-line'); if(!line) return;
      let s = ''; try{ s = f(d); }catch(e){}
      if(s && line.innerHTML !== s) line.innerHTML = s;
    });
  }
  /* the sections load on their own time, so the summaries follow what they draw */
  let OBS = null;
  function watch(pane){
    if(OBS){ OBS.disconnect(); OBS = null; }
    if(!pane || typeof MutationObserver === 'undefined') return;
    let t = null;
    OBS = new MutationObserver(() => { if(t) return; t = setTimeout(() => { t = null; summarize(pane); }, 120); });
    OBS.observe(pane, { childList:true, subtree:true });
    summarize(pane);
  }

  /* Settings and the Admin page */
  function settingsFill(){
    mark();
    const now = root.document.getElementById('hfSetNow'), b = root.document.getElementById('hfToggleBtn'), pv = root.document.getElementById('hfPreviewBtn'); if(!now) return;
    const on = live(settings()), owner = isOwner();
    now.innerHTML = (on ? '<b style="color:#1E8449;">On.</b> Everyone sees the tidy Hiring tab.'
      : '<b style="color:#B7791F;">Off.</b> Everyone sees the current Hiring tab' + (preview() ? ' except you (preview, this browser).' : '.')) + (owner ? '' : ' Only Samantha or Zachary can change this.');
    if(b){ b.textContent = on ? 'Turn off the tidy Hiring tab' : 'Turn on the tidy Hiring tab for everyone'; b.style.display = owner ? '' : 'none'; }
    if(pv){ pv.textContent = preview() ? 'Stop my preview' : 'Preview it (only me)'; pv.style.display = owner && !on ? '' : 'none'; }
  }
  async function toggle(btn){
    if(!isOwner()){ alert('Only Samantha or Zachary can change the Hiring tab.'); return; }
    const on = !live(settings());
    const ok = await ccConfirm(on ? 'Turn on the tidy Hiring tab for everyone?\n\nEach section folds to one line with a short summary and opens with a click. Their journey (Now, Next, Missing) stays open. The "Open Hiring" banner and the second list of signed Step 1 forms go. Only the look changes. Nothing is sent or saved.'
      : 'Turn off the tidy Hiring tab? Everyone goes back to the current Hiring tab.');
    if(!ok) return;
    if(btn) btn.disabled = true;
    const out = await tkMerge(m => { m.hiring_fold_live = on; if(on && !m.hiring_fold_live_since) m.hiring_fold_live_since = new Date().toISOString(); return ['Hiring tab, tidy ' + (on ? 'ON' : 'OFF')]; }, 'Hiring tab, tidy');
    if(btn) btn.disabled = false;
    const sv = root.document.getElementById('hfSaved'); if(sv) sv.textContent = out.error ? ('Could not save: ' + out.error.message) : (on ? 'On.' : 'Off.');
    settingsFill(); redraw();
  }
  function setPreviewAndDraw(on){ setPreview(on); settingsFill(); redraw(); }

  /* its look, once */
  (function css(){
    try{
      if(!root.document || root.document.getElementById('hfCss')) return;
      const st = root.document.createElement('style'); st.id = 'hfCss';
      st.textContent = 'details.hf-card{padding:12px 18px;margin-bottom:14px;}'
        + 'details.hf-card>summary{cursor:pointer;list-style:none;display:flex;gap:6px 12px;align-items:center;flex-wrap:wrap;}'
        + 'details.hf-card>summary::-webkit-details-marker{display:none;}'
        + 'details.hf-card>summary::before{content:"\\25B8";color:var(--navy);font-size:18px;line-height:1;width:16px;}'
        + 'details.hf-card[open]>summary::before{content:"\\25BE";}'
        + 'details.hf-card>summary b{font-size:15px;color:var(--navy);}'
        + '.hf-line{font-size:13px;color:var(--text-muted);}'
        + '.hf-pill{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:2px 9px;}'
        + 'body.hf-on #apPane-hiring .hp-s1-signed{display:none;}'
        + 'body.hf-on #apPane-hiring .hp-s1-note{display:block !important;}';
      root.document.head.appendChild(st);
    }catch(e){}
  })();

  root.HFOLD = { live, showing, preview:setPreviewAndDraw, previewOn:preview, card, toggled, watch, summarize, mark, settingsFill, toggle,
    /* for the tests */ _:{ SUM, pillHtml, opened, remember } };
})(typeof window !== 'undefined' ? window : globalThis);
