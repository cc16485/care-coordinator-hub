/* =============================================================================
   START FORM IMPORT RULES · THE ONE COPY (2026-10-04, safe saves step 6)
   =============================================================================
   The Background & References candidate a start form becomes, and what happens to a start form that arrives on its
   own. Loaded by BOTH the Hub page (a plain script before caregivers-engine.js, which sets globalThis.CCIntake: the
   Import button builds the candidate here) AND the server's start form check (the same file from cc.mo-care.com, run
   only when Samantha approved its fingerprint). So a start form imported by the server is exactly what Import makes.

   Samantha's rules (Oct 2 answers; plan approved Oct 4 "yes to all"; "go with 1"):
     - a start form from someone we sent a start link to (their email or phone matches a job offer), who is new to the
       Hub, becomes a new candidate
     - from someone already in Background & References, already on the caregiver roster, or marked not hired: a Needs
       Attention card only; nothing about them is updated and nobody is added back
     - from someone we did NOT send a start link to (no job offer has their email or phone): a card for a person to
       look at (the start form is a public page)
     - no email and no phone: a card
   Matching is by email or phone only (phone: the last 10 digits), never by name. Nothing here sends anything; reference
   requests stay behind their own button. Pure functions only.
   ============================================================================= */
(function(root){
'use strict';

function refType(v){
  const t=String(v||'').trim().toLowerCase();
  return t==='professional'?'professional':t==='personal'?'personal':'';
}
function phone(s){ const d=String(s==null?'':s).replace(/\D/g,''); return d.length>=10 ? d.slice(-10) : ''; }
function email(s){ const e=String(s==null?'':s).trim().toLowerCase(); return e.indexOf('@')>0 ? e : ''; }

/* The candidate a start form becomes (the Import button's record). row: the hire_intake row (never the SSN).
   x: { id, who, at } (the page gives a temporary number the database replaces; the server lets the database number it). */
function candidateFromIntake(row, x){
  x = x || {};
  const who = x.who || '';
  const rec = {
    id: x.id,
    first: row.first_name || '', last: row.last_name || '',
    phone: row.phone || '', email: row.email || '',
    oos: row.lived_outside_mo ? 'yes' : 'no',
    fp: row.lived_outside_mo ? 'Required' : 'N/A',
    oig: 'Pending', edl: 'Pending', fcsr: 'Pending',
    r1s: 'Pending', r2s: 'Pending', r3s: 'Pending', r4s: 'Pending',
    intake_id: row.id,
    imported_by: who, imported_at: x.at,
    notes: x.note || ('Imported from their start link by ' + (who || 'staff') + '.'),
    invite_sent: false, invite_sent_date: '',
    addedAt: x.at,
  };
  (Array.isArray(row.refs) ? row.refs : []).slice(0, 4).forEach((ref, i) => {
    const n = i + 1;
    rec['r'+n+'n'] = ref.name || '';
    rec['r'+n+'_phone'] = ref.phone || '';
    rec['r'+n+'_email'] = ref.email || '';
    rec['r'+n+'_rel'] = ref.relationship || '';
    rec['r'+n+'_type'] = refType(ref.type);
    rec['r'+n+'_company'] = ref.company || '';
    rec['r'+n+'_howlong'] = ref.how_long || '';
  });
  if (row.no_employer_history != null) rec.no_employer_history = !!row.no_employer_history;
  return rec;
}

/* What happens to one start form that arrived on its own. ctx: { cands, cgs, offers:[{id, email, phone}] }.
   Answers { action: 'done'|'import'|'card', reason, match: {kind, id, name}|null }
     done   already imported (a candidate or roster record carries this form's id): nothing to do
     import a new candidate
     card   reason: roster | not_hired | in_bgr | no_offer | no_contact */
function decide(row, ctx){
  const cands = (ctx && Array.isArray(ctx.cands) ? ctx.cands : []).filter(r => r && typeof r === 'object');
  const cgs = (ctx && Array.isArray(ctx.cgs) ? ctx.cgs : []).filter(r => r && typeof r === 'object');
  const offers = (ctx && Array.isArray(ctx.offers) ? ctx.offers : []).filter(r => r && typeof r === 'object');
  const id = String(row && row.id != null ? row.id : '');
  const nm = r => ((r.first || r.first_name || '') + ' ' + (r.last || r.last_name || '')).trim();
  if (id && (cands.some(c => String(c.intake_id == null ? '' : c.intake_id) === id) || cgs.some(g => String(g.intake_id == null ? '' : g.intake_id) === id)))
    return { action:'done', reason:'already imported', match:null };
  const p = phone(row && row.phone), e = email(row && row.email);
  if (!p && !e) return { action:'card', reason:'no_contact', match:null };
  const same = r => (p && (phone(r.phone) === p || phone(r.mobile) === p)) || (e && email(r.email) === e);
  const g = cgs.find(same);
  if (g) return { action:'card', reason:'roster', match:{ kind:'caregiver', id:g.id, name:nm(g) } };
  const notHired = cands.find(c => c.not_hired && same(c));
  if (notHired) return { action:'card', reason:'not_hired', match:{ kind:'candidate', id:notHired.id, name:nm(notHired) } };
  const c = cands.find(same);
  if (c) return { action:'card', reason:'in_bgr', match:{ kind:'candidate', id:c.id, name:nm(c) } };
  if (!offers.some(same)) return { action:'card', reason:'no_offer', match:null };
  return { action:'import', reason:'new', match:null };
}

/* The Needs Attention card's words for one decision (no em dash; the office's words). */
function cardText(row, d){
  const who = ((row.first_name || '') + ' ' + (row.last_name || '')).trim() || 'someone';
  const m = d.match && d.match.name ? d.match.name : '';
  const T = {
    roster:    ['Start form from ' + who + ', who is already on the caregiver roster', 'A new start form came in from ' + who + ', who is already on the caregiver roster' + (m ? ' (' + m + ')' : '') + '. Nothing was imported or changed.', 'Look at the start form and decide whether anything on their caregiver record needs updating by hand.'],
    not_hired: ['Start form from ' + who + ', who was marked not hired', 'A new start form came in from ' + who + ', who was marked not hired in Background & References' + (m ? ' (' + m + ')' : '') + '. They were not added back.', 'Decide whether to reopen them in Background & References; if not, close this.'],
    in_bgr:    ['Start form from ' + who + ', who is already in Background & References', 'A new start form came in from ' + who + ', who is already in Background & References' + (m ? ' (' + m + ')' : '') + '. Nothing was imported or changed.', 'Open them in Background & References and update anything from the new form by hand.'],
    no_offer:  ['Start form from ' + who + ': no job offer on file', 'A start form came in from ' + who + ', but no job offer has their email or phone, so it was not imported automatically (the start form page is public).', 'If we did offer them a job, press Import on their row in Background & References; if not, close this.'],
    no_contact:['Start form from ' + who + ' has no email or phone', 'A start form came in from ' + who + ' with no email and no phone, so nobody could be matched and it was not imported.', 'Look at it and press Import on their row in Background & References if it is right.'],
  }[d.reason] || ['Start form from ' + who + ' could not be imported', 'A start form came in from ' + who + ' and could not be imported automatically.', 'Press Import on their row in Background & References.'];
  return { title:T[0], detail:T[1], next:T[2] };
}

root.CCIntake = { VERSION:'2026-10-04', candidateFromIntake, decide, cardText, refType, phone, email };
})(typeof globalThis!=='undefined' ? globalThis : this);
