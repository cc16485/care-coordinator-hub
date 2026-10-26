/* =============================================================================
   partner-links-rules.js · Partner links, step 2 of the tracking build (Samantha approved the v2 workflow and step 2,
   2026-10-26). Pure functions, no page and no database: partner-links.js (the screens) and the tests run this one file.
   Built only on what the Hub already keeps: referral_orgs (each partner; the code and its status are stored on the
   partner) and leads (the referral source, its history and what the server noted when a link came in).

   HER RULES
   · tracking only. Nothing here is about money: no eligibility, no rewards, no amounts.
   · each partner in the program has one code (JANE-K7), its link (mo-care.com/r/?p=JANE-K7) and a QR code
   · a link only credits a partner for a family that is new to us (the server decides, Staffing PR #640). Everything
     else goes on the owners' Sources to check, where a person decides
   · an ESTABLISHED referral source (a partner or a typed name already recorded) is changed only by an owner, with a
     reason, and every change is kept in the lead's source_history. Filling a blank source is anyone's job, as today.
   · Care Coordinators get no new step or screen: they keep picking the partner in Referred By
   · nothing here contacts a partner or a family
   ============================================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PartnerLinksRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const LINK_BASE = 'https://mo-care.com/r/?p=';
  const STATUS = { invited:'Invited', active:'Active', paused:'Paused' };
  const SAFE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O, 1/I/L: read aloud and typed without mistakes
  const s = v => String(v == null ? '' : v).trim();
  const norm = v => s(v).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');   // "Cox Health" = "CoxHealth" (the desk's rule)
  const d10 = v => { const d = String(v == null ? '' : v).replace(/\D/g, ''); return d.length >= 10 ? d.slice(-10) : ''; };

  /** the same rule the server uses: letters, digits, dashes, 3 to 20, upper case */
  function normalCode(raw) { const c = s(raw).toUpperCase(); return /^[A-Z0-9-]{3,20}$/.test(c) ? c : ''; }
  const codeOf = o => normalCode(o && o.partner_code);
  function statusOf(o) { if (!codeOf(o)) return null; const v = s(o.program_status).toLowerCase(); return STATUS[v] ? v : 'active'; }
  const inProgram = o => !!o && !o.archived && !!codeOf(o);

  /** a new code: the first word of the name (up to 6 letters) and two characters nobody can misread, never one in use */
  function newCode(name, orgs, rand) {
    const r = typeof rand === 'function' ? rand : Math.random;
    const word = (s(name).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').trim().split(/\s+/).find(w => /^(?!THE$|AND$)[A-Z]/.test(w)) || 'CC').slice(0, 6);
    const used = new Set((orgs || []).map(codeOf).filter(Boolean));
    for (let i = 0; i < 200; i++) {
      const c = word + '-' + SAFE[Math.floor(r() * SAFE.length)] + SAFE[Math.floor(r() * SAFE.length)];
      if (!used.has(c)) return c;
    }
    return null;
  }
  const linkFor = code => normalCode(code) ? LINK_BASE + normalCode(code) : '';
  /** the ready-to-send text from the approved v2 drafts (her voice; no promise about care or price) */
  function shareText(code) {
    return 'If you or someone you love needs help at home, Caring Companions is a local, family-owned team I trust. '
      + 'They\'ll come out for a free visit and talk it through, no pressure: ' + linkFor(code);
  }

  /* ── the referral source on a lead ── */
  const srcOf = l => ({ source: s(l && l.source), referral_org_id: s(l && l.referral_org_id), referral_source_name: s(l && l.referral_source_name) });
  /** a referral source is established once a partner or a typed name is recorded */
  const established = l => !!(l && (s(l.referral_org_id) || s(l.referral_source_name)));
  const sameSource = (a, b) => a.referral_org_id === b.referral_org_id && norm(a.referral_source_name) === norm(b.referral_source_name)
    && (a.source === 'Referral') === (b.source === 'Referral');

  /**
   * What a save may do to the referral source. prev = the saved lead (null for a new one), next = what the form would save.
   * Returns { kind, allowed, needs_reason, history }:
   *   none     nothing about the source changed
   *   added    a blank source filled in (anyone; a person picked it, so referral_via says how)
   *   linked   a typed name linked to the partner of the same name (anyone; the source itself doesn't change)
   *   changed  an established source changed: owners only, with a reason
   */
  function sourceChange(prev, next, o) {
    o = o || {};
    const a = srcOf(prev || {}), b = srcOf(next || {}), at = o.at || new Date().toISOString(), by = s(o.by);
    if (!prev || !established(prev)) {
      if (!established(next)) return { kind:'none', allowed:true };
      return { kind:'added', allowed:true, history:{ at, by, how:'added', from:a, to:b } };
    }
    if (sameSource(a, b)) return { kind:'none', allowed:true };
    const orgName = id => { const x = (o.orgs || []).find(z => z && String(z.id) === String(id)); return x ? x.name : ''; };
    if (!a.referral_org_id && b.referral_org_id && norm(a.referral_source_name) && norm(orgName(b.referral_org_id)) === norm(a.referral_source_name)
        && (b.source === 'Referral' || a.source !== 'Referral'))
      return { kind:'linked', allowed:true, history:{ at, by, how:'linked', from:a, to:b } };
    if (!o.owner) return { kind:'changed', allowed:false };
    const why = s(o.why);
    if (!why) return { kind:'changed', allowed:false, needs_reason:true };
    return { kind:'changed', allowed:true, history:{ at, by, how:'owner_change', from:a, to:b, why } };
  }
  /** put the saved source back on the lead (a refused change) */
  function restore(next, prev) { const a = srcOf(prev || {}); next.source = a.source || next.source; next.referral_org_id = a.referral_org_id; next.referral_source_name = a.referral_source_name;
    if (!a.referral_org_id) delete next.referral_org_id; if (prev && 'referral_subtype' in prev) next.referral_subtype = prev.referral_subtype; return next; }
  function pushHistory(lead, h) { if (!h) return lead; lead.source_history = Array.isArray(lead.source_history) ? lead.source_history : []; lead.source_history.push(h); return lead; }

  /** the partner a call named, when exactly one saved partner (or a person there) has that name, or the caller's number */
  function partnerFromCall(orgs, typed, phone) {
    const live = (orgs || []).filter(o => o && !o.archived), n = norm(typed), p = d10(phone);
    const byName = n ? live.filter(o => norm(o.name) === n || (o.contacts || []).some(c => c && !c.archived && norm(c.name) === n)) : [];
    if (byName.length === 1) return { org:byName[0], why:'name' };
    if (byName.length > 1) return null;
    const byPhone = p ? live.filter(o => d10(o.phone) === p || (o.contacts || []).some(c => c && !c.archived && d10(c.phone) === p)) : [];
    return byPhone.length === 1 ? { org:byPhone[0], why:'phone' } : null;
  }

  /* ── Sources to check (owners) ── */
  const isClosedDup = l => !!(l && l.archived && l.duplicate_of);
  /**
   * Every inquiry where a link came in but no partner was attached, not yet decided. Each item:
   *   { id, lead_id, target_id, kind, why, code, org_id, org_name, at, different_family }
   * kind: known_family (the family may already be known, or AxisCare couldn't be read), paused, unknown, ambiguous.
   * target_id is where a decision lands: the inquiry, or the family's record it was folded into.
   */
  function checks(leads, orgs) {
    const all = leads || [], byId = new Map(all.map(l => [String(l && l.id), l]));
    const out = [];
    for (const l of all) {
      const seen = l && l.partner_link_seen;
      if (!seen || seen.resolved || !seen.code) continue;
      if (l.spam || l.test) continue;
      let target = l, hops = 0;
      while (isClosedDup(target) && byId.get(String(target.duplicate_of)) && hops++ < 5) target = byId.get(String(target.duplicate_of));
      const org = seen.org_id ? (orgs || []).find(o => o && String(o.id) === String(seen.org_id)) : null;
      const pr = l.possibly_returning || null, decided = pr && pr.decision;
      let kind = seen.status === 'linked' ? 'known_family' : seen.status;
      if (['known_family', 'paused', 'unknown', 'ambiguous'].indexOf(kind) < 0) kind = 'unknown';
      const why = kind === 'known_family'
        ? (decided === 'different_family' ? 'A coordinator said this is a different family, so this partner may have sent a new one.'
          : pr ? 'This may be a family we already know' + (decided === 'same_family' ? ' (a coordinator said it is the same family)' : '') + '.'
          : 'AxisCare couldn\'t be checked when it came in, so we couldn\'t tell if the family is new.')
        : kind === 'paused' ? 'The code belongs to a paused partner.'
        : kind === 'ambiguous' ? 'More than one partner has this code.'
        : 'The code doesn\'t match a saved partner.';
      out.push({ id:'plc_' + l.id, lead_id:String(l.id), target_id:String(target.id), folded:target !== l, kind, why, code:seen.code,
        org_id:org ? String(org.id) : (seen.org_id || ''), org_name:org ? org.name : (seen.org_name || ''), at:seen.at || l.created_at || '',
        different_family:decided === 'different_family', target_has_source:established(target) });
    }
    return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }
  /**
   * Resolve one item. decision: 'keep' (leave the source as it is) or 'credit' (the partner gets the referral; always
   * needs a reason, and the old source is kept in the history). Returns { error } or { changes:[lead,...] } with the records
   * to save. Owners only (the screen checks; this refuses too).
   */
  function resolve(item, decision, leads, orgs, o) {
    o = o || {};
    if (!o.owner) return { error:'Only an owner can decide these.' };
    const all = leads || [], src = all.find(l => String(l.id) === item.lead_id), target = all.find(l => String(l.id) === item.target_id);
    if (!src || !target) return { error:'That inquiry isn\'t in the Hub any more.' };
    const at = o.at || new Date().toISOString(), by = s(o.by), why = s(o.why);
    const done = { decision, by, at, ...(why ? { why } : {}), ...(item.target_id !== item.lead_id ? { applied_to:item.target_id } : {}) };
    if (decision === 'keep') { src.partner_link_seen = Object.assign({}, src.partner_link_seen, { resolved:done }); return { changes:[src] }; }
    if (decision !== 'credit') return { error:'Unknown decision.' };
    const org = (orgs || []).find(x => x && String(x.id) === String(o.org_id || item.org_id));
    if (!org) return { error:'Pick the partner to credit.' };
    /* her rule (2026-10-26): crediting is always an owner decision with a reason, and never replaces a source silently */
    if (established(target) && !why) return { error:'This family already has a referral source. Write why it should change.' };
    if (!why) return { error:'Write why you are crediting this partner (what you checked).' };
    const before = srcOf(target);
    target.source = 'Referral'; target.referral_org_id = String(org.id); target.referral_source_name = org.name; target.referral_via = 'link';
    if (!target.partner_code) target.partner_code = item.code;
    pushHistory(target, { at, by, how:'sources_check', from:before, to:srcOf(target), why });
    src.partner_link_seen = Object.assign({}, src.partner_link_seen, { resolved:Object.assign(done, { org_id:String(org.id) }) });
    return { changes:src === target ? [src] : [src, target] };
  }

  /* ── the Program numbers (owners) ── */
  const consulted = l => !!(l.assessment_at || (l.status && ['New', 'Contacted', 'Lost'].indexOf(l.status) < 0));
  const VIA = { link:'link', call:'call', manual:'typed in', partner_form:'partner form' };
  /**
   * One row per program partner: referrals (inquiries credited to them; folded duplicates and spam left out),
   * home visits (consultations), clients started (the first clock-in AxisCare showed), conversion (started of referred)
   * and how the referrals came in. Billed revenue is NOT computed here: the Hub doesn't hold AxisCare billing per client,
   * so the screen says "not available yet" rather than guess.
   */
  function numbers(orgs, leads) {
    const live = (leads || []).filter(l => l && !l.spam && !l.test && !isClosedDup(l));
    return (orgs || []).filter(inProgram).map(o => {
      const mine = live.filter(l => String(l.referral_org_id || '') === String(o.id));
      const ways = {};
      mine.forEach(l => { const k = VIA[l.referral_via] || 'other'; ways[k] = (ways[k] || 0) + 1; });
      const started = mine.filter(l => l.first_shift_at).length;
      return { id:String(o.id), name:o.name, type:o.type || '', code:codeOf(o), status:statusOf(o), referrals:mine.length,
        consultations:mine.filter(consulted).length, started, conversion:mine.length ? Math.round(started / mine.length * 100) : null,
        ways, last_referral:mine.map(l => l.created_at).filter(Boolean).sort().pop() || null, lead_ids:mine.map(l => String(l.id)) };
    }).sort((a, b) => b.referrals - a.referrals || b.started - a.started || String(a.name).localeCompare(String(b.name)));
  }
  function totals(rows) {
    const t = rows.reduce((a, r) => ({ partners:a.partners + 1, active:a.active + (r.status !== 'paused' ? 1 : 0), referrals:a.referrals + r.referrals,
      consultations:a.consultations + r.consultations, started:a.started + r.started }), { partners:0, active:0, referrals:0, consultations:0, started:0 });
    t.conversion = t.referrals ? Math.round(t.started / t.referrals * 100) : null; return t;
  }

  return { LINK_BASE, STATUS, normalCode, codeOf, statusOf, inProgram, newCode, linkFor, shareText, established, sourceChange, restore, pushHistory,
    partnerFromCall, checks, resolve, numbers, totals, VIA };
});
