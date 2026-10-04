/* =============================================================================
   CAREGIVER CONNECT RULES · THE ONE COPY (2026-10-03)
   =============================================================================
   Which Hub record belongs to each AxisCare caregiver, and the caregiver record
   built when a Background & References candidate becomes a caregiver.

   Loaded by BOTH the Hub page (a plain script before caregivers-engine.js, which
   sets globalThis.CCConnect) AND the server's hourly connect job (the same file
   from cc.mo-care.com, run only when Samantha approved its fingerprint; see
   _shared/approved-rules.ts in the Staffing repo). So the "Move to caregiver"
   button and the automatic move build the very same record, and the Connect
   card and the job judge a match the very same way.

   Samantha's rules (approved 2026-10-01 "yes build it that way", redone on the
   server 2026-10-03 "yes to all"). Automatic only when CERTAIN:
     A. LINK       one Hub caregiver record (no AxisCare id yet) has their phone
                   or email, and no Background & References candidate does
     B. MOVE OVER  no Hub record has it, exactly ONE open candidate does: the
                   candidate becomes their Hub caregiver record
     C. CREATE     nobody has their phone or email and no record has a similar
                   name: a fresh Hub record
     D. REVIEW     anything else (a similar name only, several possible records,
                   a phone shared with someone else, a record a person said is
                   not theirs): one Needs Attention item, a person decides
   A name alone NEVER links or moves anyone. Inactive AxisCare caregivers are
   never touched.

   Pure functions only: nothing here touches the page, the database or a clock
   beyond what the caller passes in.
   ============================================================================= */
(function(root){
'use strict';

/* ── the caregiver record from a candidate (the "Move to caregiver" button) ── */
function refType(v){
  const t=String(v||'').trim().toLowerCase();
  return t==='professional'?'professional':t==='personal'?'personal':'';
}
/* prehire.refs shape (SPEC): [{slot, name, type, company, status, date, pdf}] plus (2026-10-01, her ask: open what they
   said from the caregiver profile even without a PDF) relationship, how_long, phone, email and answers (the r{n}_manual). */
function prehireRefs(c){
  return [1,2,3,4].filter(n=>String(c[`r${n}n`]||'').trim()).map(n=>{
    const m=c[`r${n}_manual`]||{};
    return { slot:n, name:String(c[`r${n}n`]).trim(), type:refType(m.type||c[`r${n}_type`]),
      company:c[`r${n}_company`]||m.employer_confirmed||'', status:c[`r${n}s`]||'Pending',
      date:m.date||'', pdf:c[`r${n}_pdf`]||'',
      relationship:m.relationship||c[`r${n}_rel`]||'', how_long:m.how_long||c[`r${n}_howlong`]||'',
      phone:c[`r${n}_phone`]||'', email:c[`r${n}_email`]||'',
      /* Office send (Desktop 377): their OK to a text, and how the form went out. */
      sms_ok:c[`r${n}_sms_ok`]?Object.assign({},c[`r${n}_sms_ok`]):null, sent:c[`r${n}_sent`]?Object.assign({},c[`r${n}_sent`]):null,
      answers:(c[`r${n}_manual`]&&typeof c[`r${n}_manual`]==='object')?JSON.parse(JSON.stringify(c[`r${n}_manual`])):null };
  });
}
/* The caregiver roster record built from a Background & References candidate. x: { id, promoted_at, hiring_snapshot }
   (the caller's: the page gives a temporary number the database replaces; the server lets the database number it). */
function recordFromCandidate(c, hireDate, orientDate, x){
  x = x || {};
  return {
    id: x.id, first: c.first, last: c.last,
    // Carry the contact details and the SOURCE ID forward. Without these the
    // promotion destroys the identity trail: the candidate record is deleted
    // when they move, taking the only copy of their phone and email with it,
    // and nothing links the new caregiver back to who they came from.
    phone: c.phone||'', email: c.email||'',
    candidate_id: c.id,
    /* The deterministic hiring-pipeline links travel too, so the pipeline shows them as on the roster
       instead of "workspace is gone" with an Import button (a duplicate risk). 2026-10-02. */
    offer_id: c.offer_id!=null && c.offer_id!=='' ? String(c.offer_id) : '',
    intake_id: c.intake_id!=null ? c.intake_id : '',
    promoted_at: x.promoted_at,
    // Why we were allowed to hire them, frozen at the only moment it can be.
    hiring_snapshot: x.hiring_snapshot===undefined ? null : x.hiring_snapshot,
    hire_date: hireDate, oos: c.oos||'no',
    orient_date: orientDate, alz_date: '',
    ojt_date: '', ojt_signed: 'no', ojt_proof: '', ojt_online: '',
    annual_date: '', annual_proof: '', annual_online: '',
    oig_date: c.oig_date||'', oig_status: c.oig||'', oig_proof: c.oig_proof||'',
    edl_date: c.edl_date||'', edl_status: c.edl||'', edl_proof: c.edl_proof||'',
    fcsr_date: c.fcsr_date||'', fcsr_status: c.fcsr||'', fcsr_proof: c.fcsr_proof||'',
    fp: c.fp||'N/A', fp_date: c.fp_date||'', fp_proof: c.fp_proof||'',
    supv_date: '', supv_proof: '',
    perf_date: '', perf_proof: '',
    // Frozen pre-hire background-check record for the state audit binder, kept
    // separate from the ongoing/annual checks above so the two never blur.
    prehire: {
      hired_at: hireDate,
      oig:  { status: c.oig||'',  date: c.oig_date||'',  proof: c.oig_proof||''  },
      edl:  { status: c.edl||'',  date: c.edl_date||'',  proof: c.edl_proof||''  },
      fcsr: { status: c.fcsr||'', date: c.fcsr_date||'', proof: c.fcsr_proof||'' },
      fp:   { status: c.fp||'',   date: c.fp_date||'',   proof: c.fp_proof||'',  applicable: c.oos==='yes' },
      /* R3: the references travel with them too. */
      refs: prehireRefs(c)
    }
  };
}

/* ── matching ── */
function phone(s){ const d=String(s||'').replace(/\D/g,''); return d.length>=10 ? d.slice(-10) : ''; }
function email(s){ const e=String(s||'').trim().toLowerCase(); return e.indexOf('@')>0 ? e : ''; }
function norm(s){ return String(s||'').toLowerCase().replace(/[^a-z]/g,''); }   /* same rule as the directory's cgdNorm */
function name(x){ return ((x&&x.first||'')+' '+(x&&x.last||'')).trim(); }
function edit(a,b){
  if(a===b) return 0;
  if(Math.abs(a.length-b.length)>2) return 3;
  let prev=[]; for(let j=0;j<=b.length;j++) prev[j]=j;
  for(let i=1;i<=a.length;i++){
    const cur=[i];
    for(let j=1;j<=b.length;j++) cur[j]=Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1));
    prev=cur;
  }
  return prev[b.length];
}
/* Similar name: same last name and first names sharing their first 3 letters,
   OR whole names within 2 letters of each other. AxisCare's "goes by" name is
   tried as a first name too. */
function similar(ax, rec){
  const l1=norm(ax.last), l2=norm(rec.last), f2=norm(rec.first);
  if(!(f2+l2)) return false;
  return [ax.first, ax.goes_by].filter(Boolean).some(function(f){
    const f1=norm(f);
    if(!(f1+l1)) return false;
    if(l1 && l1===l2 && f1.length>=3 && f2.length>=3 && f1.slice(0,3)===f2.slice(0,3)) return true;
    return edit(f1+l1, f2+l2) <= 2;
  });
}
/* 'phone' | 'email' | '' : how a record matches an AxisCare caregiver. */
function contact(ax, rec){
  const p=phone(ax.mobile||ax.phone), e=email(ax.email);
  if(p && (phone(rec.phone)===p || phone(rec.mobile)===p)) return 'phone';
  if(e && email(rec.email)===e) return 'email';
  return '';
}
function candOpen(c){ return !c.not_hired && !c.closed_out; }
function candState(c){ return c.not_hired ? 'marked not hired' : (c.closed_out ? 'closed out' : 'open'); }
function axHire(ax){ const d=String(ax&&ax.hire_date||'').slice(0,10); return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : ''; }
const hasAx = r => r && r.axiscare_id!=null && String(r.axiscare_id)!=='';

/* PURE: works out what to do, changes nothing. census = the live AxisCare caregiver list; cgs = Hub caregiver records;
   cands = Background & References candidates. opts.blocked = [{axiscare_id, kind:'caregiver'|'candidate'|'new', id}]:
   what a person undid with "Not this person": that record is never matched to them automatically again ('new': no new
   Hub record is started for them automatically again). */
function plan(census, cgs, cands, opts){
  census = Array.isArray(census) ? census : [];
  cgs = Array.isArray(cgs) ? cgs.filter(r=>r && typeof r==='object') : [];
  cands = Array.isArray(cands) ? cands.filter(r=>r && typeof r==='object') : [];
  const blocked = new Set(((opts&&opts.blocked)||[]).map(b=>String(b.axiscare_id)+'|'+b.kind+'|'+String(b.id)));
  const isBlocked = (ax, kind, rec) => blocked.has(String(ax)+'|'+kind+'|'+String(rec.id));
  const out = { link:[], move:[], create:[], review:[], connected:[] };
  const byAx = {};
  cgs.forEach(function(r){ if(hasAx(r)) byAx[String(r.axiscare_id)] = r; });
  /* Records the directory already connects by a unique exact name (cgdLegacyFor's
     rule) belong to that caregiver, so nobody else may take them. */
  const nameOwner = new Map();
  const nameRowFor = function(c){
    const n=norm((c.first||'')+(c.last||'')); if(!n) return null;
    const hits=cgs.filter(function(r){ return norm((r.first||'')+(r.last||''))===n; });
    return hits.length===1 ? hits[0] : null;
  };
  census.forEach(function(c){
    if(!c || c.id==null || byAx[String(c.id)]) return;
    const r=nameRowFor(c); if(r && !hasAx(r) && !nameOwner.has(r)) nameOwner.set(r, String(c.id));
  });
  const active = census.filter(function(c){ return c && c.active===true && c.id!=null; })
    .slice().sort(function(a,b){ return String(a.id).localeCompare(String(b.id)); });
  const todo = [];
  active.forEach(function(c){
    const ax=String(c.id);
    if(byAx[ax]){ out.connected.push(ax); return; }
    const nr=nameRowFor(c);
    if(nr && !hasAx(nr)){                     /* already connected by name: leave alone */
      out.connected.push(ax);
      const how=contact(c, nr);               /* ...but record the id when phone or email agree */
      if(how && !isBlocked(ax, 'caregiver', nr)) out.link.push({ ax:c, row:nr, how:how, byName:true });
      return;
    }
    todo.push(c);
  });
  /* Who touches which record by phone/email. A record reached from two
     AxisCare caregivers (a shared household phone) is never certain. */
  const reach = new Map();
  const info = todo.map(function(c){
    const ax=String(c.id);
    const legacyHits=[], linkedHits=[], candOpenHits=[], candClosed=[], notTheirs=[];
    cgs.forEach(function(r){
      const how=contact(c, r); if(!how) return;
      if(isBlocked(ax, 'caregiver', r)){ notTheirs.push({ rec:r, how:how, where:'hub' }); return; }
      const owner = hasAx(r) ? String(r.axiscare_id) : (nameOwner.get(r)||'');
      if(owner && owner!==ax) linkedHits.push({ rec:r, how:how });
      else legacyHits.push({ rec:r, how:how });
    });
    cands.forEach(function(k){
      const how=contact(c, k); if(!how) return;
      if(isBlocked(ax, 'candidate', k)){ notTheirs.push({ rec:k, how:how, where:'bgr' }); return; }
      (candOpen(k) ? candOpenHits : candClosed).push({ rec:k, how:how });
    });
    legacyHits.concat(candOpenHits, candClosed).forEach(function(h){ reach.set(h.rec, (reach.get(h.rec)||0)+1); });
    const simLegacy=cgs.filter(function(r){ return similar(c, r); });
    const simCands=cands.filter(function(k){ return similar(c, k); });
    return { c:c, legacyHits:legacyHits, linkedHits:linkedHits, candOpen:candOpenHits, candClosed:candClosed, notTheirs:notTheirs, simLegacy:simLegacy, simCands:simCands };
  });
  info.forEach(function(x){
    const hits=x.legacyHits.concat(x.candOpen, x.candClosed);
    const shared = x.linkedHits.length>0 || hits.some(function(h){ return (reach.get(h.rec)||0)>1; });
    const noNew = blocked.has(String(x.c.id)+'|new|');
    const undone = x.notTheirs.length>0;
    if(!shared && !undone && x.legacyHits.length===1 && !x.candOpen.length && !x.candClosed.length){
      out.link.push({ ax:x.c, row:x.legacyHits[0].rec, how:x.legacyHits[0].how }); return;
    }
    if(!shared && !undone && !x.legacyHits.length && x.candOpen.length===1 && !x.candClosed.length){
      out.move.push({ ax:x.c, cand:x.candOpen[0].rec, how:x.candOpen[0].how }); return;
    }
    if(!undone && !hits.length && !x.linkedHits.length && !x.simLegacy.length && !x.simCands.length){
      if(noNew) out.review.push({ ax:x.c, why:'a person said not to start a new Hub record for them', options:[] });
      else if(name(x.c)) out.create.push({ ax:x.c });
      return;
    }
    const why = undone && !hits.length && !x.linkedHits.length ? 'a person said the matching record is not theirs'
      : shared ? "this phone or email is also on another person's record"
      : hits.length>1 ? 'more than one record could be theirs'
      : x.candClosed.length ? 'the matching Background & References candidate is ' + candState(x.candClosed[0].rec)
      : undone ? 'a person said one matching record is not theirs'
      : 'the name is similar, but no phone or email matches';
    out.review.push({ ax:x.c, why:why, options:optionsFrom(x) });
  });
  return out;
}
/* The possible records for one caregiver, for the Needs Attention item and the Connect card. */
function optionsFrom(x){
  const opts=[];
  const add=function(rec, where, why){
    const k=where+':'+rec.id;
    const o=opts.find(function(z){ return z.key===k; });
    if(o){ if(o.why.indexOf(why)<0) o.why.push(why); return; }
    opts.push({ key:k, where:where, id:rec.id, name:name(rec) || '(no name)', why:[why],
      linked_to: where==='hub' && hasAx(rec) ? String(rec.axiscare_id) : '',
      state: where==='bgr' ? candState(rec) : '' });
  };
  const how=function(h){ return 'same '+h.how; };
  x.legacyHits.forEach(function(h){ add(h.rec,'hub',how(h)); });
  x.linkedHits.forEach(function(h){ add(h.rec,'hub',how(h)); });
  x.candOpen.forEach(function(h){ add(h.rec,'bgr',how(h)); });
  x.candClosed.forEach(function(h){ add(h.rec,'bgr',how(h)); });
  (x.notTheirs||[]).forEach(function(h){ add(h.rec,h.where,'a person said not theirs'); });
  x.simLegacy.forEach(function(r){ add(r,'hub','similar name'); });
  x.simCands.forEach(function(k){ add(k,'bgr','similar name'); });
  return opts;
}
function optionText(o){
  return o.name + ' (' + (o.where==='hub' ? 'Hub record' : 'Background & References')
    + (o.linked_to ? ', already connected to AxisCare ' + o.linked_to : '')
    + (o.where==='bgr' && o.state && o.state!=='open' ? ', ' + o.state : '')
    + '; ' + o.why.join(', ') + ')';
}
/* The Connect card for one AxisCare caregiver: every record that could be theirs (phone, email or a similar name),
   whatever the automatic rules would do. opts.census: the whole AxisCare list, so a phone two caregivers share is
   seen as shared here too. */
function options(ax, cgs, cands, opts){
  const me = Object.assign({}, ax, { active:true });
  const others = ((opts && opts.census) || []).filter(c => c && String(c.id) !== String(ax.id));
  const p = plan(others.concat([me]), cgs, cands, opts);
  const mine = x => String(x.ax.id) === String(ax.id);
  const r = p.review.find(mine);
  let o = r ? r.options : [];
  if(!r){
    const a = p.link.find(mine), m = p.move.find(mine);
    if(a) o = [{ key:'hub:'+a.row.id, where:'hub', id:a.row.id, name:name(a.row), why:['same '+a.how], linked_to:'', state:'' }];
    else if(m) o = [{ key:'bgr:'+m.cand.id, where:'bgr', id:m.cand.id, name:name(m.cand), why:['same '+m.how], linked_to:'', state:'open' }];
  }
  return { why: r ? r.why : '', certain: !r && !!(p.link.find(mine)||p.move.find(mine)), options: o.map(function(z){ return Object.assign({}, z, { text:optionText(z) }); }) };
}
/* A brand-new Hub record for someone the Hub never had: the same empty compliance fields the Move to caregiver button
   starts from, and no prehire (no pre-hire record exists for them). x: { id, connected, via } */
function newRecord(ax, x){
  x = x || {};
  return {
    id: x.id, first: ax.first||'', last: ax.last||'',
    phone: ax.mobile||'', email: ax.email||'',
    axiscare_id: String(ax.id),
    hire_date: axHire(ax),
    created_via: x.via||'auto from AxisCare',
    connected: x.connected||null,
    oos: 'no',
    orient_date: '', alz_date: '',
    ojt_date: '', ojt_signed: 'no', ojt_proof: '', ojt_online: '',
    annual_date: '', annual_proof: '', annual_online: '',
    oig_date: '', oig_status: '', oig_proof: '',
    edl_date: '', edl_status: '', edl_proof: '',
    fcsr_date: '', fcsr_status: '', fcsr_proof: '',
    fp: 'N/A', fp_date: '', fp_proof: '',
    supv_date: '', supv_proof: '',
    perf_date: '', perf_proof: ''
  };
}
/* Rule B: the candidate's record exactly as the Move to caregiver button builds it, hired on AxisCare's hire date (else
   the button's own rule: their orientation date, else today). The orientation date is only what Background &
   References recorded, never invented. x: { id, promoted_at, hiring_snapshot, today, connected } */
function movedRecord(cand, ax, x){
  x = x || {};
  const hire = axHire(ax) || cand.orient_session_date || x.today;
  const row = recordFromCandidate(cand, hire, cand.orient_session_date || '', x);
  row.axiscare_id = String(ax.id);
  row.connected = x.connected||null;
  return row;
}

root.CCConnect = { VERSION:'2026-10-03', refType, prehireRefs, recordFromCandidate, newRecord, movedRecord,
                   plan, options, optionText, similar, contact, phone, email, norm, name, axHire, candState };
})(typeof globalThis!=='undefined' ? globalThis : this);
