/* =============================================================================
   partner-rules.js · the Referral Partner Desk's rules (Step 2, Samantha approved 2026-10-08)
   Pure functions, no page and no database: the Hub's Referrers desk, Today, My Work and the tests all run this one file.
   Built on what the Hub already keeps: referral_orgs (each partner, now with its people, owner and relationship
   details), referral_activities (every visit, call, email), and leads (what each partner sent and what became of it).

   HER RULES
   · one owner per partner. Partners that existed when the desk started are hers until she hands them out; a partner
     added after that waits in "Needs an owner" (and shows on the default owner's week so it's never nobody's)
   · tier timing, adjustable in Settings: A every 14 days, B every 30, C every 42, a new partner 7 days after the first visit
   · relationship potential counts: a new or high-potential partner gets A timing for its first 90 days (or until its
     first referral), so it's never buried in C; within a tier, high potential comes first
   · urgent referrals are NOT here: they live on the Leads board (red flag, the office alert, speed-to-lead) and never
     wait for the weekly list
   ============================================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PartnerRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const DEFAULTS = { cadence: { A: 14, B: 30, C: 42, new: 7 }, a_days: 90, a_count: 3, b_days: 365, priority_days: 90,
    default_owner: 'samantha@mo-care.com', since: '2026-10-08', towns: [] };
  const FACE = ['dropby', 'appointment', 'event'], TOUCH = ['dropby', 'appointment', 'event', 'call', 'email'];
  const POT = { high: 0, medium: 1, '': 2, low: 3 }, TIER_RANK = { P: 0, A: 1, B: 2, C: 3 };
  const lc = s => String(s == null ? '' : s).trim().toLowerCase();
  const norm = s => lc(s).replace(/[^a-z0-9]/g, '');
  const ymd = d => { const s = typeof d === 'string' ? d : new Date(d).toISOString(); return s.slice(0, 10); };
  const addDays = (d, n) => { const x = new Date(ymd(d) + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const daysBetween = (a, b) => Math.round((Date.parse(ymd(b) + 'T12:00:00Z') - Date.parse(ymd(a) + 'T12:00:00Z')) / 864e5);
  /* the week runs Monday to Sunday; its key is the Monday */
  function weekOf(today) { const d = new Date(ymd(today) + 'T12:00:00Z'), dow = (d.getUTCDay() + 6) % 7; return { start: addDays(today, -dow), end: addDays(today, 6 - dow) }; }
  function settings(st) {
    const s = Object.assign({}, DEFAULTS, (st && st.partner_desk) || {});
    s.cadence = Object.assign({}, DEFAULTS.cadence, ((st && st.partner_desk) || {}).cadence || {});
    for (const k of ['A', 'B', 'C', 'new']) { const n = Number(s.cadence[k]); s.cadence[k] = n >= 1 && n <= 365 ? Math.round(n) : DEFAULTS.cadence[k]; }
    for (const k of ['a_days', 'a_count', 'b_days', 'priority_days']) { const n = Number(s[k]); s[k] = n >= 1 && n <= 3650 ? Math.round(n) : DEFAULTS[k]; }
    s.towns = Array.isArray(s.towns) ? s.towns.map(t => String(t).trim()).filter(Boolean) : [];
    return s;
  }
  /* who owns it: the assigned owner, else (for a partner that existed when the desk started) the default owner */
  function ownerOf(o, st) {
    const S = settings(st), e = lc(o && o.owner_email);
    if (e) return { email: e, how: 'assigned' };
    const made = o && o.created_at ? ymd(o.created_at) : '0000-00-00';
    if (made <= S.since) return { email: lc(S.default_owner), how: 'existing' };
    return { email: '', how: 'needs_owner' };
  }
  /* the leads a partner sent: by its id; older leads with only words are matched by name (the Hub's own rule) */
  function leadsOf(o, leads) {
    const n = norm(o && o.name);
    return (leads || []).filter(l => l && !(l.spam && l.spam.at) && (l.referral_org_id ? l.referral_org_id === o.id : (!!n && !!norm(l.referral_source_name) && (norm(l.referral_source_name).includes(n) || n.includes(norm(l.referral_source_name))))));
  }
  /* "became a client": the first shift when the journey stamped it, else the day they said yes */
  const becameAt = l => l.first_shift_at || l.said_yes_at || (l.status === 'Converted' ? (l.converted_at || null) : null);
  function touchesOf(o, acts) { return (acts || []).filter(a => a && a.org_id === o.id && TOUCH.indexOf(a.kind) > -1).sort((a, b) => String(b.at).localeCompare(String(a.at))); }

  /** one partner: its tier and why, its timing, when it's next due, and anything that puts it on this week's list */
  function look(o, ctx) {
    ctx = ctx || {}; const S = settings(ctx.settings), today = ymd(ctx.today || new Date().toISOString());
    const sent = leadsOf(o, ctx.leads), touches = touchesOf(o, ctx.activities), face = touches.filter(a => FACE.indexOf(a.kind) > -1);
    const in12 = sent.filter(l => l.created_at && ymd(l.created_at) >= addDays(today, -S.b_days));
    const becameRecent = sent.filter(l => becameAt(l) && ymd(becameAt(l)) >= addDays(today, -S.a_days));
    const pot = lc(o.potential), lastRef = sent.map(l => l.created_at).filter(Boolean).sort().pop() || null;
    const firstSeen = face.length ? ymd(face[face.length - 1].at) : null, made = o.created_at ? ymd(o.created_at) : firstSeen;
    let tier, why;
    if (becameRecent.length) { tier = 'A'; why = becameRecent.length + ' client' + (becameRecent.length === 1 ? '' : 's') + ' from them in the last ' + S.a_days + ' days'; }
    else if (in12.length >= S.a_count && pot === 'high') { tier = 'A'; why = in12.length + ' referrals in 12 months, high potential'; }
    else if (in12.length) { tier = 'B'; why = in12.length + ' referral' + (in12.length === 1 ? '' : 's') + ' in the last 12 months'; }
    else if (pot === 'high') { tier = 'B'; why = 'high potential, no referral yet'; }
    else { tier = 'C'; why = sent.length ? 'nothing in the last 12 months' : 'no referrals yet'; }
    /* new or high potential, and nothing sent yet: A timing for its first 90 days so it isn't buried */
    /* the 90 days run from when the partner was added, or (for an older partner) from when a person marked it high potential */
    const fresh = d => !!d && daysBetween(d, today) <= S.priority_days;
    const priority = !sent.length && tier !== 'A' && (fresh(made) || (pot === 'high' && fresh(o.potential_set_at)));
    let cadence = priority ? S.cadence.A : S.cadence[tier], cadWhy = priority ? (pot === 'high' ? 'high potential' : 'new partner') + ': every ' + S.cadence.A + ' days until the first referral' : tier + ': every ' + cadence + ' days';
    const last = touches.length ? ymd(touches[0].at) : null;
    let due;
    if (face.length === 1 && daysBetween(face[0].at, today) <= 30 && !sent.length) { due = addDays(face[0].at, S.cadence.new); cadWhy = 'new partner: follow up ' + S.cadence.new + ' days after the first visit'; }
    else due = last ? addDays(last, cadence) : today;
    const wk = weekOf(today);
    const sentThisWeek = sent.filter(l => l.created_at && ymd(l.created_at) >= wk.start && ymd(l.created_at) <= today);
    const planned = (ctx.planned || []).filter(a => a && a.org_id === o.id && !a.done_at && a.due).sort((a, b) => String(a.due).localeCompare(String(b.due)))[0] || null;
    const reasons = [];
    if (sentThisWeek.length) reasons.push('sent ' + sentThisWeek.length + ' referral' + (sentThisWeek.length === 1 ? '' : 's') + ' this week: say thank you');
    if (!last) reasons.push('never visited or called');
    else if (due < today) reasons.push((priority ? '' : tier + ' partner, ') + 'last touch ' + daysBetween(last, today) + ' days ago');
    else if (due <= wk.end) reasons.push('due ' + due);
    const onWeek = !!sentThisWeek.length || due <= wk.end;
    return { id: o.id, name: o.name, tier: priority ? 'P' : tier, tier_label: priority ? 'Priority' : tier, why, potential: pot, cadence, cadence_why: cadWhy,
      last_touch: last, due, overdue_days: last && due < today ? daysBetween(due, today) : (!last ? null : 0), on_week: onWeek, planned,
      sent: sent.length, sent_12m: in12.length, became: sent.filter(becameAt).length, last_referral: lastRef ? ymd(lastRef) : null,
      sent_this_week: sentThisWeek.length, reasons, owner: ownerOf(o, ctx.settings) };
  }
  /** the week's list for one owner (or everyone when owner is '*'): due by Sunday or sent this week, best first */
  function week(orgs, ctx, owner) {
    const S = settings(ctx && ctx.settings), mine = e => owner === '*' || e === lc(owner) || (!e && lc(owner) === lc(S.default_owner));
    return (orgs || []).filter(o => o && !o.archived).map(o => look(o, ctx)).filter(x => x.on_week && mine(x.owner.email))
      .sort((a, b) => (b.sent_this_week ? 1 : 0) - (a.sent_this_week ? 1 : 0) || TIER_RANK[a.tier] - TIER_RANK[b.tier] || (POT[a.potential] ?? 2) - (POT[b.potential] ?? 2)
        || String(a.due).localeCompare(String(b.due)) || String(a.name).localeCompare(String(b.name)));
  }
  function needsOwner(orgs, ctx) { return (orgs || []).filter(o => o && !o.archived && ownerOf(o, ctx && ctx.settings).how === 'needs_owner'); }
  /** referral leads not linked to a partner, grouped by the name typed (or the organization a website referral named) */
  function unlinked(leads) {
    const g = {};
    (leads || []).filter(l => l && !(l.spam && l.spam.at) && !l.referral_org_id && (l.source === 'Referral' || l.referral_org_suggest) && String((l.referral_org_suggest && l.referral_org_suggest.name) || l.referral_source_name || '').trim())
      .forEach(l => { const name = String((l.referral_org_suggest && l.referral_org_suggest.name) || l.referral_source_name).trim(), k = norm(name); (g[k] = g[k] || { key: k, name, type: (l.referral_org_suggest && l.referral_org_suggest.type) || '', leads: [] }).leads.push(l.id); });
    return Object.values(g).sort((a, b) => b.leads.length - a.leads.length || a.name.localeCompare(b.name));
  }
  /** a website referrer who is one of the partner's people: one exact phone or email match, never a guess */
  function contactFor(o, referrer) {
    if (!o || !referrer) return null;
    const dig = s => String(s || '').replace(/\D/g, '').slice(-10), e = lc(referrer.email), p = dig(referrer.phone);
    const hits = (o.contacts || []).filter(c => c && !c.archived && ((e && lc(c.email) === e) || (p.length === 10 && dig(c.phone) === p)));
    return hits.length === 1 ? hits[0] : null;
  }
  /** the weekly My Work card for one owner: a fixed id per owner per week, so it can never double */
  function weeklyCardId(owner, today) { return 'ops_pw_' + norm(String(owner).split('@')[0]).slice(0, 20) + '_' + weekOf(today).start.replace(/-/g, ''); }
  return { DEFAULTS, settings, ownerOf, leadsOf, look, week, needsOwner, unlinked, contactFor, weekOf, weeklyCardId, addDays, daysBetween };
});
