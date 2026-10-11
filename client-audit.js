/* =====================================================================================================================
   CLIENT AUDIT (SLICE 8, Samantha "GO" / "YES TO ALL", 2026-10-11): the browser half of continuous client audit readiness.
   Every proof file goes to the private client bucket through the server (client-audit upload_url), every open is a
   five-minute link the server logs, and the read-only client audit PDF is built on the server for owners and the Audit
   export list (with an optional as-of date). The page decides nothing and holds no file.
   ===================================================================================================================== */
(function(){
  'use strict';
  async function call(body){
    const r = await sb.functions.invoke('client-audit', { body });
    if(r.error){ let why = ''; try{ if(r.error.context && r.error.context.json) why = (await r.error.context.json()).error || ''; }catch(_){} throw new Error(why || r.error.message || 'the client audit server did not answer'); }
    if(!r.data || r.data.error) throw new Error((r.data && r.data.error) || 'the client audit server did not answer');
    return r.data;
  }
  /** a file picker as a promise (null when cancelled or nothing chosen) */
  function pickFile(accept){
    return new Promise(resolve => {
      const i = document.createElement('input'); i.type = 'file'; if(accept) i.accept = accept; i.style.display = 'none';
      i.onchange = () => { const f = (i.files || [])[0] || null; i.remove(); resolve(f); };
      document.body.appendChild(i); i.click();
      setTimeout(() => { window.addEventListener('focus', () => setTimeout(() => { if(document.body.contains(i) && !(i.files || []).length){ i.remove(); resolve(null); } }, 600), { once:true }); }, 0);
    });
  }
  /** upload one proof file (careplan | late | grievance) and return { path, name } */
  async function upload(kind, ref, file){
    if(!file) throw new Error('No file chosen.');
    const u = await call({ action:'upload_url', kind, ref:String(ref), name:file.name });
    const { error } = await sb.storage.from('client-journey-files').uploadToSignedUrl(u.path, u.token, file, { contentType: file.type || 'application/octet-stream' });
    if(error) throw new Error('The file did not upload: ' + error.message);
    return { path:u.path, name:file.name };
  }
  async function open(path, ax, lead){
    try{ const d = await call({ action:'file_url', path, ax: ax || '', lead_id: lead || '' }); window.open(d.url, '_blank', 'noopener'); }
    catch(e){ alert('Could not open the file: ' + (e.message || e)); }
  }
  async function openLeadDoc(lead, path, ax){
    try{ const d = await call({ action:'lead_doc_url', lead_id:String(lead), path, ax: ax || '' }); window.open(d.url, '_blank', 'noopener'); }
    catch(e){ alert('Could not open the file: ' + (e.message || e)); }
  }
  /** the read-only client audit PDF (owners and the Audit export list; logged) */
  async function exportClient(ax, lead){
    const reason = prompt('Reason for this export (it is logged with your name):', 'audit export'); if(reason === null) return;
    const asOf = prompt('As of a past date? Type YYYY-MM-DD to see what the records said at the end of that day, or leave blank for today.', '');
    if(asOf === null) return;
    if(asOf && !/^\d{4}-\d{2}-\d{2}$/.test(asOf.trim())){ alert('Use the form YYYY-MM-DD, or leave it blank.'); return; }
    try{
      const d = await call({ action:'export', axiscare_client_id: ax || '', lead_id: lead || '', reason, as_of: asOf.trim() });
      const w = document.createElement('div'); w.style.cssText = 'position:fixed;inset:0;z-index:10006;background:rgba(15,54,95,.35);display:flex;align-items:flex-start;justify-content:center;padding:1rem;overflow:auto';
      const esc_ = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      w.innerHTML = '<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.2);margin:1rem 0">'
        + '<div style="font-weight:800;color:#0D365F">Client audit file ready · ' + esc_(d.name) + (d.as_of ? ' · as of ' + esc_(d.as_of) : '') + '</div>'
        + '<div style="font-size:.78rem;color:#6E6559;margin:.25rem 0 .6rem">Links open for five minutes; every open is logged.</div>'
        + '<div><a href="' + esc_(d.url) + '" target="_blank" rel="noopener">Open the PDF</a></div>'
        + (d.proofs && d.proofs.length ? '<div style="margin-top:.5rem;font-size:.84rem">Proofs: ' + d.proofs.map(p => p.url ? '<a href="' + esc_(p.url) + '" target="_blank" rel="noopener">' + esc_(p.label) + '</a>' : '<span style="color:#8A7F70">' + esc_(p.label) + ' (no link)</span>').join(' · ') + '</div>' : '')
        + '<div style="text-align:right;margin-top:.8rem"><button class="ibtn" id="caClose">Close</button></div></div>';
      document.body.appendChild(w); w.querySelector('#caClose').onclick = () => w.remove();
    }catch(e){ alert('The export did not run: ' + (e.message || e)); }
  }
  window.ClientAudit = { call, pickFile, upload, open, openLeadDoc, exportClient };
})();
