/* STEP 1 PROGRESS on the Onboarding table (Samantha 2026-11-11: "i dont want a check in the step one box on the onboarding tab
   table until step one is completely done. I want it to show 1/15 (example) like the orientation so we can see that step one
   is in program - not look like it is completed when it really is not").
   Reads step1-sign progress_board (office sign-in; counts only, never an answer) once per open and again after five minutes.
   The box: 3/12 while they sign; Countersign (the office) once they signed every form and the company signature is owed; a
   check only when both are done. A person with no Hub Step 1 on file (an older hire) keeps the box as it was.
   Exposes window.S1P = { load(people), cell(p, cell), get(offerId) } */
(function(){
  'use strict';
  const FRESH_MS = 5 * 60 * 1000, ST = { rows:null, asked:'', at:0, loading:false, err:'' };
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  const offerIdOf = (p) => String((p && p.c && p.c.offer_id) || (p && p.j && p.j.offer_id) || (p && p.o && p.o.id) || '');
  const redraw = () => { try{ if(typeof renderCkd === 'function') renderCkd(); }catch(e){} };
  async function load(people, force){
    const ids = [...new Set((people || []).map(offerIdOf).filter((x) => /^[0-9a-f-]{8,64}$/i.test(x)))].sort();
    const key = ids.join(',');
    if(ST.loading || (!force && ST.rows && ST.asked === key && Date.now() - ST.at < FRESH_MS)) return;
    if(!ids.length){ ST.rows = {}; ST.asked = key; ST.at = Date.now(); return; }
    if(typeof sb === 'undefined' || !sb || !sb.functions) return;
    ST.loading = true; ST.err = '';
    try{
      const r = await sb.functions.invoke('step1-sign', { body:{ action:'progress_board', offer_ids:ids } });
      const out = r && r.data;
      if(r.error || !out || out.ok !== true) throw new Error((out && out.error) || (r.error && r.error.message) || 'no answer');
      const rows = {}; (out.people || []).forEach((x) => { if(x && x.offer_id) rows[String(x.offer_id)] = x; });
      ST.rows = rows; ST.asked = key; ST.at = Date.now();
    }catch(e){ ST.err = e.message || String(e); ST.asked = key; ST.at = Date.now(); }   /* no retry loop: five minutes */
    ST.loading = false;
    redraw();
  }
  const get = (oid) => (ST.rows && ST.rows[String(oid || '')]) || null;
  function cell(p, cur){
    if(!cur || typeof obtCell !== 'function') return cur;
    const oid = offerIdOf(p), r = get(oid);
    if(!r) return cur;   /* not read yet, or no Hub Step 1 on file: as it was */
    const count = r.signed + '/' + r.total, bg = r.bg ? ' The background check forms are signed.' : '';
    if(/^Stuck/.test(String(cur.t || ''))) return Object.assign({}, cur, { tip:(cur.tip ? cur.tip + ' ' : '') + count + ' forms signed.' });
    if(!r.done) return obtCell('wait', count, { who:'applicant', b:cur.b || null, call:cur.call || null, late:!!cur.late, tip:'Step 1: ' + r.signed + ' of ' + r.total + ' forms signed.' + bg });
    if(r.company_left > 0){
      const b = cur.b && cur.b.label === 'Countersign' ? cur.b : { label:'Countersign', on:"window.open('step1.html?review=" + esc(oid) + "','_blank','noopener')" };
      return obtCell('todo', '', { who:'office', b, tip:'They signed every Step 1 form. The company still needs to sign their Employment Agreement (an owner or a coordinator).' });
    }
    return cur.s === 'ok' ? cur : obtCell('ok', '', { tip:'Step 1 done' });
  }
  window.S1P = { load, cell, get, _st:ST };
})();
